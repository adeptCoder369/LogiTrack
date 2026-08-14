"""Phase 1: depot ownership + product override resolution tests."""
import pytest
from fastapi import HTTPException

import routes.depots as depots_routes
from routes.depots import _resolve_depot_company
import routes.db_compat as db_compat_module
from product_utils import effective_product
from tests.conftest import FakeCollection, FakeDb, FakeSession, make_user


# ---------- depot company resolution ----------

def _no_company_data():
    from tests.conftest import SimpleNamespace
    return SimpleNamespace(company_id=None)


def test_depot_company_master_admin_passes_through():
    user = make_user(is_master_admin=True)
    assert _resolve_depot_company(user, _no_company_data(), {"company_id": "C1"}) == "C1"


def test_depot_company_requires_company_for_non_master():
    user = make_user()
    with pytest.raises(HTTPException) as exc:
        _resolve_depot_company(user, _no_company_data(), None)
    assert exc.value.status_code == 400


def test_depot_company_falls_back_to_caller_company():
    user = make_user(company_id="C9")
    assert _resolve_depot_company(user, _no_company_data(), None) == "C9"


def test_depot_company_uses_payload_company():
    from tests.conftest import SimpleNamespace
    user = make_user(company_id="C9")
    data = SimpleNamespace(company_id="C5")
    assert _resolve_depot_company(user, data, None) == "C5"


# ---------- depot list ownership + access filter ----------

async def test_get_depots_combines_ownership_and_assigned(monkeypatch):
    """List query is $or(company ownership, assigned depot ids)."""
    depots = FakeCollection([
        {"id": "D1", "name": "A", "company_id": "C1"},
        {"id": "D2", "name": "B", "company_id": None},
        {"id": "D3", "name": "C", "company_id": "C2"},
    ])
    fake_db = FakeDb(depots=depots, companies=FakeCollection())
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    monkeypatch.setattr(depots_routes, "db", fake_db)

    user = make_user(company_id="C1", assigned_depots=["D2"], role="Management")

    async def fake_depot_ids(u):
        return ["D2"]

    async def fake_check_permission(u, k):
        return None

    monkeypatch.setattr(depots_routes, "get_user_depot_ids", fake_depot_ids)
    monkeypatch.setattr(depots_routes, "check_permission", fake_check_permission)

    result = await depots_routes.get_depots(user)
    assert {r["id"] for r in result} == {"D1", "D2"}  # owned + assigned, not C2's

    filters = [c[1] for c in depots.calls if c[0] == "find"]
    assert filters and filters[-1].get("$or") == [
        {"company_id": "C1"},
        {"id": {"$in": ["D2"]}},
    ]


async def test_get_depots_master_admin_sees_all(monkeypatch):
    depots = FakeCollection([{"id": "D1", "name": "A", "company_id": "C1"}])
    fake_db = FakeDb(depots=depots)
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    monkeypatch.setattr(depots_routes, "db", fake_db)

    async def fake_check_permission(u, k):
        return None

    monkeypatch.setattr(depots_routes, "check_permission", fake_check_permission)

    result = await depots_routes.get_depots(make_user(is_master_admin=True))
    assert len(result) == 1
    assert depots.calls[-1][1] == {}  # unfiltered


# ---------- effective product resolution ----------

async def test_effective_product_no_override(monkeypatch):
    fake_db = FakeDb(
        products=FakeCollection([{"id": "P1", "product_name": "Cement", "product_code": "CEM-1", "min_stock": 0}]),
        product_overrides=FakeCollection(),
    )
    resolved = await effective_product("P1", "C1", db=fake_db)
    assert resolved["override"] is False
    assert resolved["product_code"] == "CEM-1"


async def test_effective_product_merges_override(monkeypatch):
    fake_db = FakeDb(
        products=FakeCollection([{"id": "P1", "product_name": "Cement", "product_code": "CEM-1", "min_stock": 0}]),
        product_overrides=FakeCollection([{
            "company_id": "C1", "product_id": "P1", "code": "ACME-CEM",
            "name": "Acme Cement", "min_stock": 25, "pricing_model": "per_tonne",
            "active": True, "description": None,
        }]),
    )
    resolved = await effective_product("P1", "C1", db=fake_db)
    assert resolved["override"] is True
    assert resolved["code"] == "ACME-CEM"
    assert resolved["name"] == "Acme Cement"
    assert resolved["min_stock"] == 25
    assert resolved["pricing_model"] == "per_tonne"
    assert resolved["product_name"] == "Cement"  # master fields intact


async def test_effective_product_missing_product(monkeypatch):
    fake_db = FakeDb(products=FakeCollection(), product_overrides=FakeCollection())
    assert await effective_product("NOPE", "C1", db=fake_db) is None


async def test_effective_product_ignores_inactive_override(monkeypatch):
    fake_db = FakeDb(
        products=FakeCollection([{"id": "P1", "product_name": "Cement", "product_code": "CEM-1"}]),
        product_overrides=FakeCollection([{
            "company_id": "C1", "product_id": "P1", "code": "ACME-CEM",
            "active": False,
        }]),
    )
    resolved = await effective_product("P1", "C1", db=fake_db)
    assert resolved["override"] is False
    assert resolved["product_code"] == "CEM-1"
