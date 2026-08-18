"""Employee management routes (Phase 3).

Departments, designations and employees (internal/external). Enable-Login
action creates a linked user row (password_set=False → first-time OTP flow).
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone
import uuid

from .db_compat import db
from auth_utils import get_current_user, check_permission, hash_password

router = APIRouter(tags=["Employees"])


def _require_management(user: dict) -> None:
    if user.get("role") != "Management" and not user.get("is_master_admin"):
        raise HTTPException(status_code=403, detail="Only Management can manage employees")


# ---- payload schemas ----

class DepartmentPayload(BaseModel):
    name: str
    description: Optional[str] = None


class DesignationPayload(BaseModel):
    name: str
    department_id: Optional[str] = None


class EmployeePayload(BaseModel):
    employee_type: str = "Internal"
    employee_id: Optional[str] = None
    name: str
    mobile: Optional[str] = None
    email: Optional[str] = None
    company_id: Optional[str] = None
    department_id: Optional[str] = None
    designation_id: Optional[str] = None
    leads_scope: Optional[str] = "All"
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    joined_at: Optional[str] = None


class EnableLoginPayload(BaseModel):
    mobile: str
    country_code: str = "91"
    role: str = "Weightment"
    email: Optional[str] = None


# ---- helpers ----

async def _dept_exists(dept_id: str) -> None:
    if dept_id and not await db.departments.find_one({"id": dept_id}):
        raise HTTPException(status_code=400, detail="Unknown department")


async def _desig_exists(desig_id: str) -> None:
    if desig_id and not await db.designations.find_one({"id": desig_id}):
        raise HTTPException(status_code=400, detail="Unknown designation")


# ============ DEPARTMENTS ============

@router.post("/departments")
async def create_department(data: DepartmentPayload, current_user: dict = Depends(get_current_user)):
    _require_management(current_user)
    dept = {"id": str(uuid.uuid4()), "name": data.name, "description": data.description, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.departments.insert_one(dept)
    return dept


@router.get("/departments")
async def get_departments(current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Departments (View)")
    return await db.departments.find({}, {"_id": 0}).sort("name", 1).to_list(1000)


@router.put("/departments/{dept_id}")
async def update_department(dept_id: str, data: DepartmentPayload, current_user: dict = Depends(get_current_user)):
    _require_management(current_user)
    await db.departments.update_one({"id": dept_id}, {"$set": data.model_dump()})
    dept = await db.departments.find_one({"id": dept_id}, {"_id": 0})
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return dept


@router.delete("/departments/{dept_id}")
async def delete_department(dept_id: str, current_user: dict = Depends(get_current_user)):
    _require_management(current_user)
    used = await db.employees.count_documents({"department_id": dept_id})
    if used:
        raise HTTPException(status_code=400, detail="Department has employees; reassign them first")
    await db.departments.delete_one({"id": dept_id})
    return {"message": "Department deleted"}


# ============ DESIGNATIONS ============

@router.post("/designations")
async def create_designation(data: DesignationPayload, current_user: dict = Depends(get_current_user)):
    _require_management(current_user)
    await _dept_exists(data.department_id)
    desig = {"id": str(uuid.uuid4()), "name": data.name, "department_id": data.department_id, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.designations.insert_one(desig)
    return desig


@router.get("/designations")
async def get_designations(current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Designations (View)")
    return await db.designations.find({}, {"_id": 0}).sort("name", 1).to_list(1000)


@router.put("/designations/{desig_id}")
async def update_designation(desig_id: str, data: DesignationPayload, current_user: dict = Depends(get_current_user)):
    _require_management(current_user)
    await _dept_exists(data.department_id)
    await db.designations.update_one({"id": desig_id}, {"$set": data.model_dump()})
    desig = await db.designations.find_one({"id": desig_id}, {"_id": 0})
    if not desig:
        raise HTTPException(status_code=404, detail="Designation not found")
    return desig


@router.delete("/designations/{desig_id}")
async def delete_designation(desig_id: str, current_user: dict = Depends(get_current_user)):
    _require_management(current_user)
    used = await db.employees.count_documents({"designation_id": desig_id})
    if used:
        raise HTTPException(status_code=400, detail="Designation has employees; reassign them first")
    await db.designations.delete_one({"id": desig_id})
    return {"message": "Designation deleted"}


# ============ EMPLOYEES ============

@router.get("/employees")
async def get_employees(
    employee_type: Optional[str] = None,
    company_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    await check_permission(current_user, "Employees (View)")
    query = {}
    if employee_type:
        query["employee_type"] = employee_type
    if company_id:
        query["company_id"] = company_id
    return await db.employees.find(query, {"_id": 0}).sort("name", 1).to_list(1000)


@router.get("/employees/{employee_id}")
async def get_employee(employee_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Employees (View)")
    emp = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return emp


@router.post("/employees")
async def create_employee(data: EmployeePayload, current_user: dict = Depends(get_current_user)):
    _require_management(current_user)
    if data.employee_type not in ("Internal", "External"):
        raise HTTPException(status_code=400, detail="employee_type must be Internal or External")
    await _dept_exists(data.department_id)
    await _desig_exists(data.designation_id)
    emp = {
        "id": str(uuid.uuid4()),
        "employee_type": data.employee_type,
        "employee_id": data.employee_id,
        "name": data.name,
        "mobile": data.mobile,
        "email": data.email,
        "company_id": data.company_id,
        "department_id": data.department_id,
        "designation_id": data.designation_id,
        "leads_scope": data.leads_scope or "All",
        "login_enabled": False,
        "user_id": None,
        "address": data.address,
        "city": data.city,
        "state": data.state,
        "joined_at": data.joined_at,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.employees.insert_one(emp)
    return emp


@router.put("/employees/{employee_id}")
async def update_employee(employee_id: str, data: EmployeePayload, current_user: dict = Depends(get_current_user)):
    _require_management(current_user)
    await _dept_exists(data.department_id)
    await _desig_exists(data.designation_id)
    existing = await db.employees.find_one({"id": employee_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Employee not found")
    update = {k: v for k, v in data.model_dump().items()}
    if not update.get("leads_scope"):
        update["leads_scope"] = "All"
    await db.employees.update_one({"id": employee_id}, {"$set": update})
    return await db.employees.find_one({"id": employee_id}, {"_id": 0})


@router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str, current_user: dict = Depends(get_current_user)):
    _require_management(current_user)
    emp = await db.employees.find_one({"id": employee_id})
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    if emp.get("user_id"):
        raise HTTPException(status_code=400, detail="Employee has a linked user; unlink first")
    await db.employees.delete_one({"id": employee_id})
    return {"message": "Employee deleted"}


@router.post("/employees/{employee_id}/enable-login")
async def enable_employee_login(
    employee_id: str,
    data: EnableLoginPayload,
    current_user: dict = Depends(get_current_user),
):
    """Create a user login for an internal employee (password_set=False → first-time OTP).

    Mirrors infoEIGHT behaviour: login_enabled=true links an existing employee
    record to a new user row, and the employee's user_id is set.
    """
    _require_management(current_user)

    emp = await db.employees.find_one({"id": employee_id})
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    if emp.get("employee_type") != "Internal":
        raise HTTPException(status_code=400, detail="Only internal employees can have logins")
    if emp.get("login_enabled") and emp.get("user_id"):
        raise HTTPException(status_code=400, detail="Employee already has a linked login")
    if emp.get("mobile"):
        existing = await db.users.find_one({"mobile": f"{data.country_code}{data.mobile}"})
        if existing and existing.get("employee_id") != employee_id:
            raise HTTPException(status_code=400, detail="Mobile number already linked to another user")

    from auth_utils import normalize_mobile
    full_mobile = normalize_mobile(data.mobile, data.country_code)

    user_id = emp.get("user_id") or str(uuid.uuid4())
    user_row = {
        "id": user_id,
        "tenant_id": emp.get("tenant_id"),
        "employee_id": employee_id,
        "name": emp.get("name"),
        "mobile": full_mobile,
        "country_code": data.country_code,
        "password": "",  # not set yet — first-time OTP flow
        "password_set": False,
        "role": data.role,
        "email": data.email or emp.get("email"),
        "company_id": emp.get("company_id"),
        "depot_id": None,
        "transporter_id": None,
        "transporter_name": None,
        "assigned_products": [],
        "assigned_depots": [],
        "excluded_products": [],
        "excluded_depots": [],
        "otp_verified": False,
        "is_master_admin": False,
        "created_by": current_user.get("id"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    if emp.get("user_id"):
        # Update existing user row instead of inserting a new one.
        await db.users.update_one(
            {"id": emp["user_id"]},
            {"$set": {
                "mobile": full_mobile,
                "country_code": data.country_code,
                "role": data.role,
                "employee_id": employee_id,
                "password": "",
                "password_set": False,
            }},
        )
    else:
        await db.users.insert_one(user_row)

    await db.employees.update_one(
        {"id": employee_id},
        {"$set": {"login_enabled": True, "user_id": user_id}},
    )

    return {
        "success": True,
        "message": f"Login enabled. User can set their password via first-time OTP to +{full_mobile}.",
        "user_id": user_id,
    }


@router.post("/employees/{employee_id}/unlink")
async def unlink_employee_login(employee_id: str, current_user: dict = Depends(get_current_user)):
    """Remove the login linkage without deleting the user record."""
    _require_management(current_user)
    emp = await db.employees.find_one({"id": employee_id})
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    if not emp.get("user_id"):
        raise HTTPException(status_code=400, detail="Employee has no linked login")
    await db.employees.update_one({"id": employee_id}, {"$set": {"login_enabled": False, "user_id": None}})
    return {"success": True, "message": "Login unlinked"}
