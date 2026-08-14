"""Phase 1: source <-> product access tests.

Covers get_excluded_source_ids (the "2 products, 1 permission" rule),
build_source_exclusion_filter_async, the PO source resolver and the
source<->product mapping revalidation. DB-free via fake collections.
"""
import pytest
from fastapi import HTTPException

import auth_utils
from auth_utils import get_excluded_source_ids, build_source_exclusion_filter_async
import routes.purchase_orders as po_routes
from routes.purchase_orders import _resolve_po_source, _validate_source_product_mapping
import routes.db_compat as db_compat_module
from tests.conftest import FakeCollection, FakeDb, make_user


def _user_with_products(product_ids, role="Admin"):
    return make_user(assigned_products=product_ids, role=role)


def fake_product_ids(ids):
    """Async stand-in for auth_utils.get_user_product_ids."""
    async def _fake(user):
        return ids
    return _fake


@pytest.fixture
def source_db(monkeypatch):
    """Patch routes.db_compat.db (used by the resolver + PO routes)."""
    mappings = FakeCollection()
    depots = FakeCollection([
        {"id": "D1", "name": "Depot One"},
        {"id": "D2", "name": "Depot Two"},
    ])
    companies = FakeCollection([
        {"id": "C1", "name": "Company One"},
    ])
    products = FakeCollection([{"id": "P1", "name": "Prod A"}, {"id": "P2", "name": "Prod B"}])
    fake_db = FakeDb(
        source_products=mappings, depots=depots, companies=companies, products=products,
    )
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    monkeypatch.setattr(po_routes, "db", fake_db)
    return fake_db


# ---------- resolver: privilege levels ----------

async def test_resolver_unrestricted_for_master_admin(monkeypatch, source_db):
    monkeypatch.setattr(auth_utils, "get_user_product_ids", fake_product_ids(None))
    assert await get_excluded_source_ids(make_user(is_master_admin=True)) is None


async def test_resolver_unrestricted_for_management(monkeypatch, source_db):
    monkeypatch.setattr(auth_utils, "get_user_product_ids", fake_product_ids(["P1"]))
    assert await get_excluded_source_ids(make_user(role="Management")) is None


async def test_resolver_no_mappings_means_no_exclusions(monkeypatch, source_db):
    monkeypatch.setattr(auth_utils, "get_user_product_ids", fake_product_ids(["P1"]))
    assert await get_excluded_source_ids(make_user()) == []


# ---------- resolver: the "2 products, 1 permission" rule ----------

async def test_resolver_source_visible_when_any_mapped_product_accessible(monkeypatch, source_db):
    """Source mapped to [P1, P2]; user can access only P1 -> source stays visible."""
    source_db.source_products.rows = [
        {"source_id": "D1", "source_type": "Depot", "product_id": "P1", "active": True},
        {"source_id": "D1", "source_type": "Depot", "product_id": "P2", "active": True},
    ]
    monkeypatch.setattr(auth_utils, "get_user_product_ids", fake_product_ids(["P1"]))
    assert await get_excluded_source_ids(make_user()) == []


async def test_resolver_source_hidden_when_no_mapped_product_accessible(monkeypatch, source_db):
    source_db.source_products.rows = [
        {"source_id": "D1", "source_type": "Depot", "product_id": "P2", "active": True},
    ]
    monkeypatch.setattr(auth_utils, "get_user_product_ids", fake_product_ids(["P1"]))
    assert await get_excluded_source_ids(make_user()) == ["D1"]


async def test_resolver_only_excludes_mapped_inaccessible_sources(monkeypatch, source_db):
    """Unmapped sources and fully-accessible mapped sources are not excluded."""
    source_db.source_products.rows = [
        {"source_id": "D1", "source_type": "Depot", "product_id": "P2", "active": True},  # blocked
        {"source_id": "C1", "source_type": "Company", "product_id": "P1", "active": True},  # ok
    ]
    monkeypatch.setattr(auth_utils, "get_user_product_ids", fake_product_ids(["P1"]))
    assert sorted(await get_excluded_source_ids(make_user())) == ["D1"]


async def test_resolver_ignores_inactive_mappings(monkeypatch, source_db):
    source_db.source_products.rows = [
        {"source_id": "D1", "source_type": "Depot", "product_id": "P2", "active": False},
    ]
    monkeypatch.setattr(auth_utils, "get_user_product_ids", fake_product_ids(["P1"]))
    assert await get_excluded_source_ids(make_user()) == []


# ---------- exclusion filter dict ----------

async def test_exclusion_filter_empty_when_nothing_excluded(monkeypatch, source_db):
    monkeypatch.setattr(auth_utils, "get_user_product_ids", fake_product_ids(["P1"]))
    assert await build_source_exclusion_filter_async(make_user()) == {}


async def test_exclusion_filter_nin_clause(monkeypatch, source_db):
    source_db.source_products.rows = [
        {"source_id": "D1", "source_type": "Depot", "product_id": "P2", "active": True},
    ]
    monkeypatch.setattr(auth_utils, "get_user_product_ids", fake_product_ids(["P1"]))
    assert await build_source_exclusion_filter_async(make_user(), "source_id") == {
        "source_id": {"$nin": ["D1"]}
    }


# ---------- PO source resolver ----------

async def test_po_source_resolves_depot(monkeypatch, source_db):
    from tests.conftest import SimpleNamespace
    monkeypatch.setattr(auth_utils, "get_user_product_ids", fake_product_ids(["P1"]))
    data = SimpleNamespace(source_type="Depot", source_id="D1", depot_id=None)
    assert await _resolve_po_source(make_user(), data) == ("Depot", "D1", "Depot One")


async def test_po_source_falls_back_to_legacy_depot_id(monkeypatch, source_db):
    monkeypatch.setattr(auth_utils, "get_user_product_ids", fake_product_ids(["P1"]))
    data = po_routes.PurchaseOrderCreate(depot_id="D1", product_id="P1", total_quantity_mt=10)
    assert await _resolve_po_source(make_user(), data) == ("Depot", "D1", "Depot One")


async def test_po_source_missing_raises_404(monkeypatch, source_db):
    monkeypatch.setattr(auth_utils, "get_user_product_ids", fake_product_ids(["P1"]))
    from tests.conftest import SimpleNamespace
    data = SimpleNamespace(source_type="Depot", source_id="MISSING", depot_id=None)
    with pytest.raises(HTTPException) as exc:
        await _resolve_po_source(make_user(), data)
    assert exc.value.status_code == 404


async def test_po_source_excluded_raises_403(monkeypatch, source_db):
    source_db.source_products.rows = [
        {"source_id": "D1", "source_type": "Depot", "product_id": "P2", "active": True},
    ]
    monkeypatch.setattr(auth_utils, "get_user_product_ids", fake_product_ids(["P1"]))
    from tests.conftest import SimpleNamespace
    data = SimpleNamespace(source_type="Depot", source_id="D1", depot_id=None)
    with pytest.raises(HTTPException) as exc:
        await _resolve_po_source(make_user(), data)
    assert exc.value.status_code == 403


async def test_po_source_company(monkeypatch, source_db):
    monkeypatch.setattr(auth_utils, "get_user_product_ids", fake_product_ids(["P1"]))
    from tests.conftest import SimpleNamespace
    data = SimpleNamespace(source_type="Company", source_id="C1", depot_id=None)
    assert await _resolve_po_source(make_user(), data) == ("Company", "C1", "Company One")


# ---------- source <-> product mapping revalidation ----------

async def test_mapping_validation_unmapped_source_allows_any_product(source_db):
    await _validate_source_product_mapping("Depot", "D1", "P99")  # no raise


async def test_mapping_validation_mapped_product_passes(source_db):
    source_db.source_products.rows = [
        {"source_id": "D1", "source_type": "Depot", "product_id": "P1", "active": True},
    ]
    await _validate_source_product_mapping("Depot", "D1", "P1")  # no raise


async def test_mapping_validation_mismatch_raises_400(source_db):
    source_db.source_products.rows = [
        {"source_id": "D1", "source_type": "Depot", "product_id": "P1", "active": True},
    ]
    with pytest.raises(HTTPException) as exc:
        await _validate_source_product_mapping("Depot", "D1", "P2")
    assert exc.value.status_code == 400
