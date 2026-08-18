"""Leads routes (Phase 2).

Sales/Purchase leads tracked before they become clients. Conversion creates
the client company (entity_roles=["Client"], parent carried over), links the
assigned employee's user record to the new company (access-grant transfer),
and stamps converted_company_id.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone
import uuid

from .db_compat import db
from auth_utils import get_current_user, check_permission

router = APIRouter(tags=["Leads"])

LEAD_STATUSES = ("New", "Contacted", "Qualified", "Converted", "Lost")
LEAD_TYPES = ("Sales", "Purchase")


class LeadPayload(BaseModel):
    lead_type: str = "Sales"
    company_id: Optional[str] = None
    company_name: Optional[str] = None
    status: str = "New"
    parent_client_id: Optional[str] = None
    assigned_employee_id: Optional[str] = None
    assigned_employee_name: Optional[str] = None
    contact_person: Optional[str] = None
    contact_mobile: Optional[str] = None
    notes: Optional[str] = None
    assigned_products: Optional[List[str]] = None
    assigned_depots: Optional[List[str]] = None


def _validate(data: LeadPayload) -> None:
    if data.lead_type not in LEAD_TYPES:
        raise HTTPException(status_code=400, detail=f"lead_type must be one of {LEAD_TYPES}")
    if data.status not in LEAD_STATUSES:
        raise HTTPException(status_code=400, detail=f"status must be one of {LEAD_STATUSES}")
    if not data.company_name and not data.company_id:
        raise HTTPException(status_code=400, detail="company_name or company_id is required")


async def _lead_or_404(lead_id: str) -> dict:
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.get("/leads")
async def get_leads(
    status: Optional[str] = None,
    lead_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    await check_permission(current_user, "Leads (View)")
    query = {}
    if status:
        query["status"] = status
    if lead_type:
        query["lead_type"] = lead_type

    # Employees see their scope's leads (Sales|Purchase) plus anything
    # assigned to them; Management/master admin see everything.
    is_management = current_user.get("role") == "Management" or current_user.get("is_master_admin")
    if not is_management and current_user.get("employee_id"):
        emp = await db.employees.find_one({"id": current_user["employee_id"]})
        scope = (emp or {}).get("leads_scope") or "All"
        branches = [{"assigned_employee_id": current_user["employee_id"]}]
        if current_user.get("id"):
            branches.append({"assigned_employee_id": current_user["id"]})  # legacy user-id assignments
        if scope != "All":
            branches.append({"lead_type": scope})
        query["$or"] = branches

    return await db.leads.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)


@router.get("/leads/{lead_id}")
async def get_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Leads (View)")
    return await _lead_or_404(lead_id)


@router.post("/leads")
async def create_lead(data: LeadPayload, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Leads (Create)")
    _validate(data)

    company_name = data.company_name
    if not company_name and data.company_id:
        company = await db.companies.find_one({"id": data.company_id})
        company_name = company.get("name", "") if company else None

    lead = {
        "id": str(uuid.uuid4()),
        "lead_type": data.lead_type,
        "company_id": data.company_id,
        "company_name": company_name,
        "status": data.status,
        "parent_client_id": data.parent_client_id,
        "assigned_employee_id": data.assigned_employee_id,
        "assigned_employee_name": data.assigned_employee_name,
        "contact_person": data.contact_person,
        "contact_mobile": data.contact_mobile,
        "notes": data.notes,
        "assigned_products": data.assigned_products or [],
        "assigned_depots": data.assigned_depots or [],
        "converted_company_id": None,
        "converted_at": None,
        "created_by": current_user.get("id"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.leads.insert_one(lead)
    return lead


@router.put("/leads/{lead_id}")
async def update_lead(lead_id: str, data: LeadPayload, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Leads (Update)")
    await _lead_or_404(lead_id)
    _validate(data)

    update_fields = data.model_dump()
    if not update_fields.get("company_name") and update_fields.get("company_id"):
        company = await db.companies.find_one({"id": update_fields["company_id"]})
        update_fields["company_name"] = company.get("name", "") if company else None

    await db.leads.update_one({"id": lead_id}, {"$set": update_fields})
    return await _lead_or_404(lead_id)


@router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Leads (Delete)")
    await _lead_or_404(lead_id)
    await db.leads.delete_one({"id": lead_id})
    return {"message": "Lead deleted"}


@router.post("/leads/{lead_id}/convert")
async def convert_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    """Convert the lead into a client company and transfer access grants.

    Creates a company (entity_roles=["Client"], is_client=True, parent from
    the lead), links the assigned employee's user record to the new company,
    and stamps converted_company_id/converted_at.
    """
    await check_permission(current_user, "Leads (Convert)")
    lead = await _lead_or_404(lead_id)

    if lead.get("converted_company_id"):
        raise HTTPException(status_code=400, detail="Lead already converted")

    if lead.get("status") == "Lost":
        raise HTTPException(status_code=400, detail="Cannot convert a lost lead")

    company_name = lead.get("company_name")
    if not company_name and lead.get("company_id"):
        source = await db.companies.find_one({"id": lead["company_id"]})
        company_name = source.get("name", "") if source else None
    if not company_name:
        raise HTTPException(status_code=400, detail="Lead has no company name to convert")

    # Create the client company.
    company_id = str(uuid.uuid4())
    company = {
        "id": company_id,
        "name": company_name,
        "entity_roles": ["Client"],
        "is_client": True,
        "company_type": "Client",
        "parent_client_id": lead.get("parent_client_id"),
        "contact_person_name": lead.get("contact_person"),
        "contact_person_mobile": lead.get("contact_mobile"),
        "users": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.companies.insert_one(company)

    # Transfer access grants: link the assigned employee's user record to the
    # new client company (the user then manages/executes for this client).
    assigned_employee_id = lead.get("assigned_employee_id")
    if assigned_employee_id:
        emp = await db.employees.find_one({"id": assigned_employee_id})
        if emp and emp.get("user_id"):
            await db.users.update_one(
                {"id": emp["user_id"]},
                {"$set": {"company_id": company_id}},
            )
        else:
            # Legacy assignments stored a user id directly.
            await db.users.update_one(
                {"id": assigned_employee_id},
                {"$set": {"company_id": company_id}},
            )

    now = datetime.now(timezone.utc).isoformat()
    await db.leads.update_one(
        {"id": lead_id},
        {"$set": {"status": "Converted", "converted_company_id": company_id, "converted_at": now}},
    )

    return {
        "success": True,
        "message": "Lead converted to client",
        "company": company,
        "converted_company_id": company_id,
    }
