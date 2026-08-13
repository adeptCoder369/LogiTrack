"""Phase 0: tenant scoping unit tests.

Verifies the ContextVar scope, the db_compat auto-injection (find/find_one/
update/delete/count) and insert stamping, plus feature flag fallback.
No database is touched.
"""
import asyncio

import models_sqlalchemy as sql_models
from tenant import (
    PLATFORM_TENANT_ID,
    tenant_filter,
    set_tenant_scope,
    get_current_tenant_id,
    feature_enabled,
)
import routes.db_compat as db_compat
from routes.db_compat import _CollectionProxy, DbCompat


# ---------- tenant_filter ----------

def test_tenant_filter_none_when_context_unset():
    set_tenant_scope({"is_master_admin": True, "tenant_id": None})
    assert tenant_filter(sql_models.User) is None


def test_tenant_filter_equality_when_context_set():
    set_tenant_scope({"is_master_admin": False, "tenant_id": "T1"})
    predicate = tenant_filter(sql_models.User)
    assert predicate is not None
    assert str(predicate.compile()) == "users.tenant_id = :tenant_id_1"


def test_tenant_filter_skips_global_tables():
    set_tenant_scope({"is_master_admin": False, "tenant_id": "T1"})
    # otps / permissions have no tenant_id column -> never filtered
    assert tenant_filter(sql_models.OTP) is None
    assert tenant_filter(sql_models.Permission) is None


def test_tenant_filter_uses_master_admin_scope_none():
    set_tenant_scope({"is_master_admin": True, "tenant_id": "T1"})
    # Master admin: ctx is None even though the row has a tenant_id
    assert get_current_tenant_id() is None
    assert tenant_filter(sql_models.User) is None


# ---------- db_compat query injection ----------

def _conditions_for(model, filter_dict):
    proxy = _CollectionProxy(model, model.__tablename__)
    return proxy._build_conditions(filter_dict)


def test_build_conditions_injects_tenant_at_top_level():
    set_tenant_scope({"is_master_admin": False, "tenant_id": "T1"})
    conditions = _conditions_for(sql_models.Pickup, {"$or": [{"status": "a"}, {"status": "b"}]})
    assert len(conditions) == 2  # tenant condition + the caller's $or


def test_build_conditions_no_injection_for_master_admin():
    set_tenant_scope({"is_master_admin": True, "tenant_id": "T1"})
    conditions = _conditions_for(sql_models.Pickup, {"status": "a"})
    assert len(conditions) == 1


def test_build_conditions_ignores_tenant_for_otp():
    set_tenant_scope({"is_master_admin": False, "tenant_id": "T1"})
    conditions = _conditions_for(sql_models.OTP, {"mobile": "91x"})
    assert len(conditions) == 1


def test_all_query_methods_route_through_build_conditions(monkeypatch):
    """find/find_one/update_one/delete_one/count all inherit the injection
    because they all build conditions from the same helper."""
    set_tenant_scope({"is_master_admin": False, "tenant_id": "T1"})
    captured = []

    def spy(self, filter_dict):
        captured.append(filter_dict)
        return [sql_models.User.id == "x"]

    monkeypatch.setattr(_CollectionProxy, "_build_conditions", spy)
    monkeypatch.setattr(
        db_compat, "AsyncSessionLocal", lambda: __import__("tests.conftest", fromlist=["FakeSession"]).FakeSession()
    )
    proxy = _CollectionProxy(sql_models.User, "users")

    async def exercise():
        await proxy.find_one({"name": "x"})
        proxy.find({"name": "x"})
        await proxy.update_one({"name": "x"}, {"$set": {"name": "y"}})
        await proxy.delete_one({"name": "x"})
        await proxy.count_documents({"name": "x"})

    asyncio.run(exercise())

    # Every path built conditions (find_one, find, update_one, delete_one,
    # count_documents) -> 5 calls
    assert len(captured) == 5

# ---------- insert stamping ----------

async def test_insert_one_stamps_tenant(monkeypatch):
    set_tenant_scope({"is_master_admin": False, "tenant_id": "T1"})
    from tests.conftest import FakeSession

    holder = {}

    def factory():
        holder["session"] = FakeSession()
        return holder["session"]

    monkeypatch.setattr(db_compat, "AsyncSessionLocal", factory)
    proxy = _CollectionProxy(sql_models.User, "users")
    await proxy.insert_one({"id": "new-user", "name": "N", "mobile": "919111", "role": "Admin", "created_at": "2026-01-01T00:00:00"})
    added = holder["session"].added[0]
    assert added.tenant_id == "T1"


async def test_insert_one_stamps_platform_tenant_for_master(monkeypatch):
    set_tenant_scope({"is_master_admin": True, "tenant_id": None})
    holder = {}

    def factory():
        holder["session"] = __import__("tests.conftest", fromlist=["FakeSession"]).FakeSession()
        return holder["session"]

    monkeypatch.setattr(db_compat, "AsyncSessionLocal", factory)
    proxy = _CollectionProxy(sql_models.User, "users")
    await proxy.insert_one({"id": "m-user", "name": "M", "mobile": "919222", "role": "Management", "created_at": "2026-01-01T00:00:00"})
    assert holder["session"].added[0].tenant_id == PLATFORM_TENANT_ID


# ---------- model map ----------

def test_model_map_has_all_tenant_scoped_tables():
    db = DbCompat()
    tenant_models = [
        "users", "companies", "company_users", "transporters", "trucks",
        "products", "depots", "depot_inventory", "company_inventory",
        "delivery_orders", "liftings", "pickups", "purchase_orders",
        "verified_trucks", "railway_zones", "railway_sidings", "reports",
    ]
    for name in tenant_models:
        model = db._model_map[name]
        assert hasattr(model, "tenant_id"), f"{name} missing tenant_id"


# ---------- feature flags ----------

def test_feature_enabled_defaults_false_without_flags(monkeypatch):
    set_tenant_scope({"is_master_admin": True, "tenant_id": None})
    monkeypatch.setattr("tenant.DEFAULT_FEATURE_FLAGS", {})
    assert feature_enabled("invoices") is False


def test_feature_enabled_global_defaults(monkeypatch):
    set_tenant_scope({"is_master_admin": True, "tenant_id": None})
    monkeypatch.setattr("tenant.DEFAULT_FEATURE_FLAGS", {"invoices": True})
    assert feature_enabled("invoices") is True


def test_feature_enabled_reads_tenant_flags(monkeypatch):
    import tenant as tenant_mod
    set_tenant_scope({"is_master_admin": False, "tenant_id": "T1"})
    monkeypatch.setattr("tenant.DEFAULT_FEATURE_FLAGS", {})
    tenant_mod._tenant_flags_var.set({"invoices": True, "stock_transfers": False})
    assert feature_enabled("invoices") is True
    assert feature_enabled("stock_transfers") is False
    assert feature_enabled("unknown_key") is False
