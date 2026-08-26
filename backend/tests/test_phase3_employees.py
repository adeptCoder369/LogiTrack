"""Phase 3: employees, login linkage, leads scope, firm-grant enforcement tests.

DB-free via fake collections + patched helpers.
"""
import pytest
from fastapi import HTTPException

import auth_utils
import routes.employees as emp_routes
import routes.leads as leads_routes
import routes.db_compat as db_compat_module
from auth_utils import get_user_product_ids, get_user_depot_ids
from tests.conftest import FakeCollection, FakeDb, FakeSession, make_user


def fake_check_permission(user):
    async def _inner(u, k):
        return None
    return _inner


# ============ EMPLOYEE CRUD GUARDS ============

async def test_employee_type_validation(monkeypatch):
    fake_db = FakeDb(employees=FakeCollection(), departments=FakeCollection(), designations=FakeCollection())
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    monkeypatch.setattr(emp_routes, "db", fake_db)
    from routes.employees import EmployeePayload
    with pytest.raises(HTTPException) as exc:
        await emp_routes.create_employee(EmployeePayload(name="X", employee_type="Contractor"), make_user(role="Management"))
    assert exc.value.status_code == 400


async def test_department_delete_blocked_when_employees_use_it(monkeypatch):
    fake_db = FakeDb(
        departments=FakeCollection([{"id": "D1", "name": "Ops"}]),
        employees=FakeCollection([{"id": "E1", "department_id": "D1"}]),
    )
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    monkeypatch.setattr(emp_routes, "db", fake_db)
    with pytest.raises(HTTPException) as exc:
        await emp_routes.delete_department("D1", make_user(role="Management"))
    assert exc.value.status_code == 400


async def test_employee_management_requires_management(monkeypatch):
    fake_db = FakeDb(employees=FakeCollection())
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    monkeypatch.setattr(emp_routes, "db", fake_db)
    with pytest.raises(HTTPException) as exc:
        await emp_routes.create_employee(emp_routes.EmployeePayload(name="X"), make_user(role="Loader"))
    assert exc.value.status_code == 403


# ============ ENABLE LOGIN ============

async def test_enable_login_creates_user_and_links(monkeypatch):
    fake_db = FakeDb(
        employees=FakeCollection([{"id": "E1", "tenant_id": "T1", "employee_type": "Internal", "name": "Ravi", "mobile": "91", "email": "r@x.com", "company_id": "C1", "login_enabled": False, "user_id": None}]),
        users=FakeCollection(),
    )
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    monkeypatch.setattr(emp_routes, "db", fake_db)

    result = await emp_routes.enable_employee_login(
        "E1",
        emp_routes.EnableLoginPayload(mobile="9999999999", country_code="91", role="Weightment"),
        make_user(role="Management"),
    )
    assert result["success"] is True

    # A user row was inserted with password_set=False and employee_id.
    inserted = [u for u in fake_db.users.rows if u["id"] == result["user_id"]]
    assert inserted and inserted[0]["password_set"] is False
    assert inserted[0]["employee_id"] == "E1"
    assert inserted[0]["mobile"] == "919999999999"

    # The employee is now linked.
    emp = fake_db.employees.rows[0]
    assert emp["login_enabled"] is True
    assert emp["user_id"] == result["user_id"]


async def test_enable_login_rejects_external_employee(monkeypatch):
    fake_db = FakeDb(
        employees=FakeCollection([{"id": "E1", "employee_type": "External", "name": "Vendor", "login_enabled": False, "user_id": None}]),
        users=FakeCollection(),
    )
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    monkeypatch.setattr(emp_routes, "db", fake_db)
    with pytest.raises(HTTPException) as exc:
        await emp_routes.enable_employee_login("E1", emp_routes.EnableLoginPayload(mobile="9999999999"), make_user(role="Management"))
    assert exc.value.status_code == 400


async def test_enable_login_rejects_already_linked(monkeypatch):
    fake_db = FakeDb(
        employees=FakeCollection([{"id": "E1", "employee_type": "Internal", "name": "Ravi", "login_enabled": True, "user_id": "U9"}]),
        users=FakeCollection(),
    )
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    monkeypatch.setattr(emp_routes, "db", fake_db)
    with pytest.raises(HTTPException) as exc:
        await emp_routes.enable_employee_login("E1", emp_routes.EnableLoginPayload(mobile="9999999999"), make_user(role="Management"))
    assert exc.value.status_code == 400


# ============ LEADS SCOPE ============

async def test_leads_scope_filter_applied_for_employee(monkeypatch):
    leads = FakeCollection()
    fake_db = FakeDb(
        employees=FakeCollection([{"id": "E1", "leads_scope": "Sales", "user_id": "U1"}]),
        leads=leads,
    )
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    monkeypatch.setattr(leads_routes, "db", fake_db)
    monkeypatch.setattr(leads_routes, "check_permission", fake_check_permission(make_user()))

    user = make_user(id="U1", employee_id="E1", role="Loader")
    await leads_routes.get_leads(None, None, user)

    filters = [c[1] for c in leads.calls if c[0] == "find"]
    assert filters and filters[-1]["$or"]
    or_branches = filters[-1]["$or"]
    assert {"lead_type": "Sales"} in or_branches
    assert {"assigned_employee_id": "E1"} in or_branches
    assert {"assigned_employee_id": "U1"} in or_branches


async def test_leads_scope_unfiltered_for_management(monkeypatch):
    leads = FakeCollection()
    fake_db = FakeDb(employees=FakeCollection(), leads=leads)
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    monkeypatch.setattr(leads_routes, "db", fake_db)
    monkeypatch.setattr(leads_routes, "check_permission", fake_check_permission(make_user(role="Management")))

    await leads_routes.get_leads(None, None, make_user(role="Management"))
    filters = [c[1] for c in leads.calls if c[0] == "find"]
    assert filters and "$or" not in filters[-1]


# ============ FIRM-GRANT ENFORCEMENT ============

async def test_product_ids_intersect_firm_grants(monkeypatch):
    async def fake_pairs(user):
        return [{"firm_id": "F1", "product_id": "P2", "depot_id": "D2"}]
    monkeypatch.setattr(auth_utils, "get_user_firm_granted_pairs", fake_pairs)
    monkeypatch.setattr(auth_utils, "AsyncSessionLocal", lambda: FakeSession([]))  # no role-derived

    user = make_user(assigned_products=["P1", "P2"])
    assert sorted(await get_user_product_ids(user)) == ["P2"]


async def test_depot_ids_intersect_firm_grants(monkeypatch):
    async def fake_pairs(user):
        return [{"firm_id": "F1", "product_id": "P1", "depot_id": "D2"}]
    monkeypatch.setattr(auth_utils, "get_user_firm_granted_pairs", fake_pairs)
    monkeypatch.setattr(auth_utils, "AsyncSessionLocal", lambda: FakeSession([]))

    user = make_user(assigned_depots=["D1", "D2"])
    assert sorted(await get_user_depot_ids(user)) == ["D2"]


async def test_product_ids_unrestricted_without_grants(monkeypatch):
    async def fake_pairs(user):
        return []
    monkeypatch.setattr(auth_utils, "get_user_firm_granted_pairs", fake_pairs)
    monkeypatch.setattr(auth_utils, "AsyncSessionLocal", lambda: FakeSession([]))

    user = make_user(assigned_products=["P1", "P2"])
    assert sorted(await get_user_product_ids(user)) == ["P1", "P2"]


async def test_product_ids_unrestricted_for_management(monkeypatch):
    async def fake_pairs(user):
        return None  # Management is unrestricted (real resolver returns None)
    monkeypatch.setattr(auth_utils, "get_user_firm_granted_pairs", fake_pairs)
    monkeypatch.setattr(auth_utils, "AsyncSessionLocal", lambda: FakeSession([]))

    assert await get_user_product_ids(make_user(role="Management")) is None
