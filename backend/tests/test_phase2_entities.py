"""Phase 2: location hierarchy + client structure + leads + firms + modules tests.

DB-free: fake collections + patched helpers.
"""
import pytest
from fastapi import HTTPException

import routes.companies as companies_routes
import routes.leads as leads_routes
import routes.firms as firms_routes
import routes.purchase_orders as po_routes
import routes.db_compat as db_compat_module
import routes.locations as locations_routes
import auth_utils
from auth_utils import get_user_firm_granted_pairs
from tenant import client_module_enabled
from tests.conftest import FakeCollection, FakeDb, make_user

companies_mod = companies_routes


def fake_check_permission(user):
    async def _inner(u, k):
        return None
    return _inner


# ============ LOCATION HIERARCHY ============

async def test_create_location_unknown_region_rejected(monkeypatch):
    fake_db = FakeDb(regions=FakeCollection(), locations=FakeCollection())
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    monkeypatch.setattr(locations_routes, "db", fake_db)
    monkeypatch.setattr(locations_routes, "check_permission", fake_check_permission(make_user()))
    from routes.locations import LocationPayload
    with pytest.raises(HTTPException) as exc:
        await locations_routes.create_location(
            LocationPayload(name="Delhi NCR", region_id="NOPE"),
            make_user(),
        )
    assert exc.value.status_code == 400


async def test_delete_region_blocked_with_locations(monkeypatch):
    regions = FakeCollection([{"id": "R1", "name": "North", "code": None}])
    locations = FakeCollection([{"id": "L1", "region_id": "R1", "name": "Delhi"}])
    fake_db = FakeDb(regions=regions, locations=locations)
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    monkeypatch.setattr(locations_routes, "db", fake_db)
    monkeypatch.setattr(locations_routes, "check_permission", fake_check_permission(make_user()))
    with pytest.raises(HTTPException) as exc:
        await locations_routes.delete_region("R1", make_user())
    assert exc.value.status_code == 400


async def test_delete_location_blocked_with_depots(monkeypatch):
    locations = FakeCollection([{"id": "L1", "name": "Delhi"}])
    depots = FakeCollection([{"id": "D1", "name": "D", "location_id": "L1"}])
    fake_db = FakeDb(locations=locations, depots=depots)
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    monkeypatch.setattr(locations_routes, "db", fake_db)
    monkeypatch.setattr(locations_routes, "check_permission", fake_check_permission(make_user()))
    with pytest.raises(HTTPException) as exc:
        await locations_routes.delete_location("L1", make_user())
    assert exc.value.status_code == 400


async def test_location_tree_rolls_up(monkeypatch):
    fake_db = FakeDb(
        regions=FakeCollection([{"id": "R1", "name": "North", "code": "N"}]),
        locations=FakeCollection([{"id": "L1", "region_id": "R1", "name": "Delhi", "city": "Delhi", "state": "DL"}]),
        depots=FakeCollection([
            {"id": "D1", "name": "D1", "location_id": "L1"},
            {"id": "D2", "name": "D2", "location_id": None},  # unassigned
        ]),
        depot_inventory=FakeCollection([
            {"depot_id": "D1", "available_quantity": 10.5},
            {"depot_id": "D1", "available_quantity": 5},
            {"depot_id": "D2", "available_quantity": 7},
        ]),
    )
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    monkeypatch.setattr(locations_routes, "db", fake_db)
    monkeypatch.setattr(locations_routes, "check_permission", fake_check_permission(make_user()))

    tree = await locations_routes.get_location_tree(make_user())
    region = tree["regions"][0]
    assert region["depot_count"] == 1
    assert region["available_quantity"] == 15.5  # 10.5 + 5 rolled up
    assert region["locations"][0]["depots"][0]["available_quantity"] == 15.5
    assert len(tree["unassigned_depots"]) == 1
    assert tree["unassigned_depots"][0]["available_quantity"] == 7


# ============ ENTITY ROLES / CLIENT STRUCTURE ============

async def test_entity_roles_invalid_rejected(monkeypatch):
    fake_db = FakeDb(companies=FakeCollection(), client_offices=FakeCollection(), client_factories=FakeCollection())
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    monkeypatch.setattr(companies_mod, "db", fake_db)
    with pytest.raises(HTTPException) as exc:
        await companies_mod._validate_entity_roles(["Client", "Vendor"])
    assert exc.value.status_code == 400


async def test_entity_roles_dedupes(monkeypatch):
    assert await companies_mod._validate_entity_roles(["Client", "Client", "Source"]) == ["Client", "Source"]


async def test_parent_client_validation(monkeypatch):
    fake_db = FakeDb(companies=FakeCollection([
        {"id": "C1", "name": "Acme", "is_client": True, "entity_roles": ["Client"]},
        {"id": "C2", "name": "Vendor", "is_client": False, "entity_roles": ["Company"]},
    ]))
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    monkeypatch.setattr(companies_mod, "db", fake_db)

    await companies_mod._validate_parent_client("C1")  # ok
    with pytest.raises(HTTPException):
        await companies_mod._validate_parent_client("C2")  # not a client
    with pytest.raises(HTTPException):
        await companies_mod._validate_parent_client("NOPE")
    with pytest.raises(HTTPException):
        await companies_mod._validate_parent_client("C1", self_id="C1")  # self-parent


async def test_single_head_office_enforced(monkeypatch):
    fake_db = FakeDb(
        companies=FakeCollection([{"id": "C1", "name": "Acme"}]),
        client_offices=FakeCollection([{"id": "O1", "company_id": "C1", "is_head_office": True, "name": "HQ"}]),
        client_factories=FakeCollection(),
        products=FakeCollection([{"id": "P1", "product_name": "Cement"}]),
    )
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    monkeypatch.setattr(companies_mod, "db", fake_db)
    monkeypatch.setattr(companies_mod, "check_permission", fake_check_permission(make_user(role="Management")))

    from routes.companies import OfficePayload
    with pytest.raises(HTTPException) as exc:
        await companies_mod.add_company_office("C1", OfficePayload(name="New HQ", is_head_office=True), make_user(role="Management"))
    assert exc.value.status_code == 400


async def test_factory_per_product_uniqueness(monkeypatch):
    fake_db = FakeDb(
        companies=FakeCollection([{"id": "C1", "name": "Acme"}]),
        client_offices=FakeCollection(),
        client_factories=FakeCollection([{"id": "F1", "company_id": "C1", "product_id": "P1", "factory_name": "F"}]),
        products=FakeCollection([{"id": "P1", "product_name": "Cement"}]),
    )
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    monkeypatch.setattr(companies_mod, "db", fake_db)
    monkeypatch.setattr(companies_mod, "check_permission", fake_check_permission(make_user(role="Management")))

    from routes.companies import FactoryPayload
    with pytest.raises(HTTPException) as exc:
        await companies_mod.add_company_factory("C1", FactoryPayload(factory_name="F2", product_id="P1"), make_user(role="Management"))
    assert exc.value.status_code == 400


async def test_po_create_billing_defaults_to_client(monkeypatch):
    fake_db = FakeDb(
        depots=FakeCollection([{"id": "D1", "name": "Depot One"}]),
        companies=FakeCollection([{"id": "C1", "name": "Acme Client"}]),
        source_products=FakeCollection(),
        purchase_orders=FakeCollection(),
        pickups=FakeCollection(),
        products=FakeCollection([{"id": "P1", "product_name": "Cement"}]),
    )
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    monkeypatch.setattr(po_routes, "db", fake_db)
    monkeypatch.setattr(auth_utils, "get_user_product_ids", _async_ids(["P1"]))
    monkeypatch.setattr(po_routes, "check_permission", fake_check_permission(make_user(role="Management")))
    monkeypatch.setattr(po_routes, "check_product_access", fake_check_permission(make_user()))

    from models import PurchaseOrderCreate
    order = await po_routes.create_purchase_order(
        PurchaseOrderCreate(depot_id="D1", source_type="Depot", to_company_id="C1", product_id="P1", total_quantity_mt=100),
        make_user(role="Management"),
    )
    assert order.billing_company_id == "C1"
    assert order.billing_company_name == "Acme Client"


def _async_ids(ids):
    async def _fake(user):
        return ids
    return _fake


# ============ LEADS ============

def _lead_db():
    return FakeDb(
        leads=FakeCollection([{
            "id": "L1", "lead_type": "Sales", "company_name": "Acme Traders",
            "status": "Qualified", "parent_client_id": "C0",
            "assigned_employee_id": "E1", "converted_company_id": None,
        }]),
        companies=FakeCollection([{"id": "C0", "name": "Parent", "is_client": True}]),
        employees=FakeCollection([{"id": "E1", "name": "Ravi", "user_id": "U1"}]),
        users=FakeCollection([{"id": "U1", "name": "Ravi", "company_id": None}]),
    )


async def test_lead_convert_creates_client_and_links_employee(monkeypatch):
    fake_db = _lead_db()
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    monkeypatch.setattr(leads_routes, "db", fake_db)
    monkeypatch.setattr(leads_routes, "check_permission", fake_check_permission(make_user(role="Management")))

    result = await leads_routes.convert_lead("L1", make_user(role="Management"))
    assert result["converted_company_id"]

    created = [c for c in fake_db.companies.rows if c["id"] == result["converted_company_id"]]
    assert created and created[0]["entity_roles"] == ["Client"]
    assert created[0]["parent_client_id"] == "C0"

    # The employee's linked user (U1) was moved to the new company.
    user_updates = [c for c in fake_db.users.calls if c[0] == "update_one"]
    assert user_updates and user_updates[0][2]["$set"]["company_id"] == result["converted_company_id"]

    lead = [l for l in fake_db.leads.rows if l["id"] == "L1"][0]
    assert lead["status"] == "Converted"
    assert lead["converted_company_id"] == result["converted_company_id"]


async def test_lead_convert_already_converted_rejected(monkeypatch):
    fake_db = FakeDb(
        leads=FakeCollection([{"id": "L1", "company_name": "X", "converted_company_id": "C9", "status": "Converted"}]),
        companies=FakeCollection(),
        users=FakeCollection(),
    )
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    monkeypatch.setattr(leads_routes, "db", fake_db)
    monkeypatch.setattr(leads_routes, "check_permission", fake_check_permission(make_user(role="Management")))
    with pytest.raises(HTTPException) as exc:
        await leads_routes.convert_lead("L1", make_user(role="Management"))
    assert exc.value.status_code == 400


async def test_lead_invalid_status_rejected(monkeypatch):
    from routes.leads import LeadPayload
    with pytest.raises(HTTPException) as exc:
        leads_routes._validate(LeadPayload(company_name="X", status="Won"))
    assert exc.value.status_code == 400


# ============ FIRMS ============

async def test_firm_granted_pairs_resolver(monkeypatch):
    fake_db = FakeDb(firm_access=FakeCollection([
        {"firm_id": "F1", "user_id": "U1", "product_id": "P1", "depot_id": "D1"},
        {"firm_id": "F1", "user_id": "U1", "product_id": "P2", "depot_id": "D2"},
        {"firm_id": "F1", "user_id": "U2", "product_id": "P3", "depot_id": "D3"},  # another user
        {"firm_id": "F2", "user_id": "U1", "product_id": "P4", "depot_id": "D4"},  # another firm
    ]))
    monkeypatch.setattr(db_compat_module, "db", fake_db)

    user = make_user(id="U1")
    pairs = await get_user_firm_granted_pairs(user, firm_id="F1", db=fake_db)
    assert len(pairs) == 2
    assert {"product_id": "P1", "depot_id": "D1"} in [{"product_id": p["product_id"], "depot_id": p["depot_id"]} for p in pairs]


async def test_firm_granted_pairs_unrestricted_for_management(monkeypatch):
    user = make_user(role="Management", id="U1")
    assert await get_user_firm_granted_pairs(user) is None


async def test_firm_grant_duplicate_rejected(monkeypatch):
    fake_db = FakeDb(
        firms=FakeCollection([{"id": "F1", "name": "Firm"}]),
        users=FakeCollection([{"id": "U1", "name": "Ravi"}]),
        products=FakeCollection([{"id": "P1", "product_name": "Cement"}]),
        depots=FakeCollection([{"id": "D1", "name": "Depot"}]),
        firm_access=FakeCollection([{"id": "G1", "firm_id": "F1", "user_id": "U1", "product_id": "P1", "depot_id": "D1"}]),
    )
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    monkeypatch.setattr(firms_routes, "db", fake_db)
    monkeypatch.setattr(firms_routes, "check_permission", fake_check_permission(make_user(role="Management")))

    from routes.firms import FirmAccessPayload
    with pytest.raises(HTTPException) as exc:
        await firms_routes.grant_firm_access(
            "F1",
            FirmAccessPayload(firm_id="F1", user_id="U1", product_id="P1", depot_id="D1"),
            make_user(role="Management"),
        )
    assert exc.value.status_code == 400


# ============ CLIENT MODULES ============

async def test_client_module_resolution_order(monkeypatch):
    fake_db = FakeDb(client_modules=FakeCollection([
        {"company_id": "C1", "module": "invoices", "enabled": True},
        {"company_id": "C1", "module": "firms", "enabled": False},
    ]))
    monkeypatch.setattr(db_compat_module, "db", fake_db)

    # Row present -> row wins.
    assert await client_module_enabled("C1", "invoices") is True
    assert await client_module_enabled("C1", "firms") is False

    # No row -> global default (whitelist: False).
    assert await client_module_enabled("C1", "stock_transfers") is False
    assert await client_module_enabled(None, "stock_transfers") is False
