"""MongoDB-to-MySQL compatibility layer
Provides drop-in replacements for MongoDB collection methods using SQLAlchemy async."""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, delete, and_, or_, asc, desc
from typing import Dict, List
import models_sqlalchemy as sql_models
from database import AsyncSessionLocal
from tenant import tenant_filter, get_current_tenant_id, PLATFORM_TENANT_ID


class _QueryCursor:
    def __init__(self, model, conditions, projection, sort_key=None, sort_dir=None, skip_n=None, limit_n=None):
        self._model = model
        self._conditions = conditions
        self._projection = projection
        self._sort_key = sort_key
        self._sort_dir = sort_dir
        self._skip_n = skip_n
        self._limit_n = limit_n

    def sort(self, key, direction):
        self._sort_key = key
        self._sort_dir = direction
        return self

    def skip(self, n):
        self._skip_n = n
        return self

    def limit(self, n):
        self._limit_n = n
        return self

    async def to_list(self, n=None):
        if n is not None:
            self._limit_n = n
        async with AsyncSessionLocal() as session:
            stmt = select(self._model).where(*self._conditions)
            if self._sort_key:
                col = getattr(self._model, self._sort_key, None)
                if col is not None:
                    if self._sort_dir == -1:
                        stmt = stmt.order_by(desc(col))
                    else:
                        stmt = stmt.order_by(asc(col))
            if self._skip_n is not None:
                stmt = stmt.offset(self._skip_n)
            if self._limit_n is not None:
                stmt = stmt.limit(self._limit_n)
            result = await session.execute(stmt)
            objs = result.scalars().all()
            return [_CollectionProxy._to_dict_static(obj, self._projection) for obj in objs]


class _UpdateResult:
    def __init__(self, matched_count=0, modified_count=0):
        self.matched_count = matched_count
        self.modified_count = modified_count


class _DeleteResult:
    def __init__(self, deleted_count=0):
        self.deleted_count = deleted_count


def _build_regex_condition(col, pattern: str):
    """Emulate MongoDB $regex using MySQL LIKE.

    The schema collation is utf8mb4_unicode_ci (case-insensitive), so the
    Mongo '$options: "i"' flag needs no special handling. Leading '^' and
    trailing '$' anchors are honored via startswith/endswith, and user-supplied
    '%' / '_' / '\\' wildcards are escaped so they are matched literally.
    """
    escaped = pattern.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')
    anchored_start = escaped.startswith('^')
    if anchored_start:
        escaped = escaped[1:]
    anchored_end = escaped.endswith('$')
    if anchored_end:
        escaped = escaped[:-1]
    if anchored_start and anchored_end:
        return col == escaped
    if anchored_start:
        return col.like(escaped + '%', escape='\\')
    if anchored_end:
        return col.like('%' + escaped, escape='\\')
    return col.contains(escaped, escape='\\')


class DbCompat:
    """Compat layer that mimics MongoDB collection API using SQLAlchemy."""

    _model_map = {
        'users': sql_models.User,
        'otps': sql_models.OTP,
        'companies': sql_models.Company,
        'company_users': sql_models.CompanyUser,
        'transporters': sql_models.Transporter,
        'trucks': sql_models.Truck,
        'products': sql_models.Product,
        'depots': sql_models.Depot,
        'depot_inventory': sql_models.DepotInventory,
        'company_inventory': sql_models.CompanyInventory,
        'delivery_orders': sql_models.DeliveryOrder,
        'liftings': sql_models.Lifting,
        'pickups': sql_models.Pickup,
        'purchase_orders': sql_models.PurchaseOrder,
        'verified_trucks': sql_models.VerifiedTruck,
        'permissions': sql_models.Permission,
        'railway_zones': sql_models.RailwayZone,
        'railway_sidings': sql_models.RailwaySiding,
        'reports': sql_models.Report,
        'source_products': sql_models.SourceProduct,
        'product_overrides': sql_models.ProductOverride,
        'company_pricing': sql_models.CompanyPricing,
        'regions': sql_models.Region,
        'locations': sql_models.Location,
        'client_offices': sql_models.ClientOffice,
        'client_factories': sql_models.ClientFactory,
        'leads': sql_models.Lead,
        'firms': sql_models.Firm,
        'firm_offices': sql_models.FirmOffice,
        'firm_factories': sql_models.FirmFactory,
        'firm_access': sql_models.FirmAccess,
        'client_modules': sql_models.ClientModule,
        'departments': sql_models.Department,
        'designations': sql_models.Designation,
        'employees': sql_models.Employee,
        'invoices': sql_models.Invoice,
        'invoice_items': sql_models.InvoiceItem,
        'payments': sql_models.Payment,
        'invoice_payments': sql_models.InvoicePayment,
    }

    def __getattr__(self, name):
        if name in self._model_map:
            return _CollectionProxy(self._model_map[name], name)
        raise AttributeError(f"No such collection: {name}")

    async def _execute(self, session: AsyncSession, query):
        result = await session.execute(query)
        return result


class _CollectionProxy:
    def __init__(self, model, name):
        self._model = model
        self._name = name

    async def find_one(self, filter_dict: Dict = None, projection: Dict = None):
        if filter_dict is None:
            filter_dict = {}
        conditions = self._build_conditions(filter_dict)
        async with AsyncSessionLocal() as session:
            # Mongo's find_one returns the first match for a non-unique filter;
            # scalar_one_or_none() would raise MultipleResultsFound instead.
            stmt = select(self._model).where(*conditions).limit(1)
            result = await session.execute(stmt)
            obj = result.scalars().first()
            if obj is None:
                return None
            return self._to_dict(obj, projection)

    def find(self, filter_dict: Dict = None, projection: Dict = None):
        if filter_dict is None:
            filter_dict = {}
        conditions = self._build_conditions(filter_dict)
        return _QueryCursor(self._model, conditions, projection)

    async def insert_one(self, doc: Dict):
        doc_copy = dict(doc)
        doc_copy.pop('_id', None)
        valid_cols = {c.name for c in self._model.__table__.columns}
        # Auto-stamp tenant_id so no caller can forget it. Master admin
        # (unset context) inserts belong to the platform tenant.
        if 'tenant_id' in valid_cols and not doc_copy.get('tenant_id'):
            doc_copy['tenant_id'] = get_current_tenant_id() or PLATFORM_TENANT_ID
        doc_copy = {k: v for k, v in doc_copy.items() if k in valid_cols}
        obj = self._model(**doc_copy)
        async with AsyncSessionLocal() as session:
            session.add(obj)
            await session.commit()
            await session.refresh(obj)
        return {"acknowledged": True, "inserted_id": doc_copy.get('id')}

    async def update_one(self, filter_dict: Dict, update_dict: Dict, upsert: bool = False):
        conditions = self._build_conditions(filter_dict)
        valid_cols = {c.name for c in self._model.__table__.columns}
        set_values = {}
        for k, v in update_dict.get('$set', {}).items():
            if k in valid_cols:
                set_values[k] = v
        if '$inc' in update_dict:
            for k, v in update_dict['$inc'].items():
                if k in valid_cols:
                    set_values[k] = getattr(self._model, k) + v
        if '$push' in update_dict or '$pull' in update_dict or '$addToSet' in update_dict:
            current = await self.find_one(filter_dict)
            if current is not None:
                if '$push' in update_dict:
                    for k, v in update_dict['$push'].items():
                        if k not in valid_cols:
                            continue
                        lst = list(current.get(k) or [])
                        lst.append(v)
                        set_values[k] = lst
                if '$addToSet' in update_dict:
                    for k, v in update_dict['$addToSet'].items():
                        if k not in valid_cols:
                            continue
                        lst = list(current.get(k) or [])
                        if v not in lst:
                            lst.append(v)
                        set_values[k] = lst
                if '$pull' in update_dict:
                    for k, v in update_dict['$pull'].items():
                        if k not in valid_cols:
                            continue
                        lst = list(current.get(k) or [])
                        if isinstance(v, dict):
                            lst = [item for item in lst if not (isinstance(item, dict) and all(item.get(mk) == mv for mk, mv in v.items()))]
                        else:
                            lst = [item for item in lst if item != v]
                        set_values[k] = lst
        if not set_values:
            return _UpdateResult(matched_count=0, modified_count=0)
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                update(self._model).where(*conditions).values(**set_values)
            )
            await session.commit()
        if upsert and result.rowcount == 0:
            # MySQL reports *changed* rows, so rowcount 0 means either "nothing
            # matched" or "matched, but the values were already identical". Only
            # the first should insert -- assuming it unconditionally makes an
            # unchanged upsert collide with the existing primary key.
            if await self.find_one(filter_dict) is None:
                doc = {}
                for k, v in (filter_dict or {}).items():
                    if isinstance(v, dict):
                        continue
                    doc[k] = v
                doc.update(set_values)
                await self.insert_one(doc)
            return _UpdateResult(matched_count=1, modified_count=1)
        return _UpdateResult(matched_count=result.rowcount, modified_count=result.rowcount)

    async def update_many(self, filter_dict: Dict, update_dict: Dict):
        conditions = self._build_conditions(filter_dict)
        valid_cols = {c.name for c in self._model.__table__.columns}
        set_values = {}
        for k, v in update_dict.get('$set', {}).items():
            if k in valid_cols:
                set_values[k] = v
        if not set_values:
            return _UpdateResult(matched_count=0, modified_count=0)
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                update(self._model).where(*conditions).values(**set_values)
            )
            await session.commit()
        return _UpdateResult(matched_count=result.rowcount, modified_count=result.rowcount)

    async def delete_one(self, filter_dict: Dict):
        conditions = self._build_conditions(filter_dict)
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                delete(self._model).where(*conditions)
            )
            await session.commit()
            return _DeleteResult(deleted_count=result.rowcount)

    async def delete_many(self, filter_dict: Dict):
        conditions = self._build_conditions(filter_dict)
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                delete(self._model).where(*conditions)
            )
            await session.commit()
            return _DeleteResult(deleted_count=result.rowcount)

    async def count_documents(self, filter_dict: Dict = None):
        if filter_dict is None:
            filter_dict = {}
        conditions = self._build_conditions(filter_dict)
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(func.count(self._model.id)).where(*conditions)
            )
            return result.scalar_one()

    async def aggregate(self, pipeline: List[Dict] = None):
        if pipeline is None:
            pipeline = []
        return []

    def _build_conditions(self, filter_dict: Dict):
        conditions = []
        # Tenant isolation: every query is scoped to the current request's
        # tenant (master admin context is None -> no filter). Injected at the
        # top level so it ANDs correctly with $or branches in caller filters.
        tfilter = tenant_filter(self._model)
        if tfilter is not None:
            conditions.append(tfilter)
        for key, value in filter_dict.items():
            if key == '$and':
                for sub in value:
                    conditions.append(self._build_condition(sub))
            elif key == '$or':
                or_conditions = [self._build_condition(sub) for sub in value]
                conditions.append(or_(*or_conditions))
            elif key == '$ne':
                pass
            elif '.' in key:
                parts = key.split('.')
                conditions.append(self._build_nested_condition(parts, value))
            else:
                conditions.append(self._build_condition({key: value}))
        return conditions

    def _build_condition(self, cond: Dict):
        conditions = []
        for key, value in cond.items():
            col = getattr(self._model, key, None)
            if col is None:
                continue
            if isinstance(value, dict):
                regex_pattern = None
                for op, val in value.items():
                    if op == '$regex':
                        regex_pattern = str(val)
                        continue
                    if op == '$options':
                        # MySQL utf8mb4_unicode_ci collation is already
                        # case-insensitive, so '$options: "i"' is a no-op.
                        continue
                    if op == '$eq' or op == '$in':
                        conditions.append(col == val if not isinstance(val, list) else col.in_(val))
                    elif op == '$ne':
                        conditions.append(col != val)
                    elif op == '$gt':
                        conditions.append(col > val)
                    elif op == '$gte':
                        conditions.append(col >= val)
                    elif op == '$lt':
                        conditions.append(col < val)
                    elif op == '$lte':
                        conditions.append(col <= val)
                    elif op == '$exists':
                        pass
                if regex_pattern is not None:
                    conditions.append(_build_regex_condition(col, regex_pattern))
            else:
                conditions.append(col == value)
        return and_(*conditions) if len(conditions) > 1 else conditions[0] if conditions else None

    def _build_nested_condition(self, parts: List[str], value):
        return getattr(self._model, parts[0]) == value

    def _to_dict(self, obj, projection: Dict = None):
        return self._to_dict_static(obj, projection)

    @staticmethod
    def _to_dict_static(obj, projection: Dict = None):
        from datetime import datetime
        d = {}
        for col in obj.__table__.columns:
            val = getattr(obj, col.name)
            if isinstance(val, datetime):
                val = val.isoformat()
            d[col.name] = val
        if projection:
            for key in list(d.keys()):
                if key in projection and not projection[key]:
                    del d[key]
        return d


db = DbCompat()
