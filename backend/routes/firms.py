"""Firms + firm access grant routes (Phase 2).

Firms mirror the client structure (parent/child, head office/branches/
factories). firm_access grants a user access to a firm scoped to specific
product x depot pairs; enforcement lands with Phase 3 employees.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone
import uuid

from .db_compat import db
from auth_utils import get_current_user, check_permission

router = APIRouter(tags=["Firms"])


def _require_management(user: dict) -> None:
    if user.get("role") != "Management" and not user.get("is_master_admin"):
        raise HTTPException(status_code=403, detail="Only Management can manage firms")


class FirmPayload(BaseModel):
    name: str
    parent_firm_id: Optional[str] = None
    company_id: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    contact_person: Optional[str] = None
    contact_mobile: Optional[str] = None


class FirmOfficePayload(BaseModel):
    name: str
    office_type: str = "Branch"
    is_head_office: bool = False
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    contact_person: Optional[str] = None
    contact_mobile: Optional[str] = None


class FirmFactoryPayload(BaseModel):
    factory_name: str
    product_id: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None


class FirmAccessPayload(BaseModel):
    firm_id: str
    user_id: str
    product_id: str
    depot_id: str


async def _firm_or_404(firm_id: str) -> dict:
    firm = await db.firms.find_one({"id": firm_id}, {"_id": 0})
    if not firm:
        raise HTTPException(status_code=404, detail="Firm not found")
    return firm


# ============ FIRMS ============

@router.get("/firms")
async def get_firms(current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Firms (View)")
    return await db.firms.find({}, {"_id": 0}).sort("name", 1).to_list(1000)


@router.get("/firms/{firm_id}")
async def get_firm(firm_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Firms (View)")
    return await _firm_or_404(firm_id)


@router.post("/firms")
async def create_firm(data: FirmPayload, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Firms (Create)")
    _require_management(current_user)
    if data.parent_firm_id and not await db.firms.find_one({"id": data.parent_firm_id}):
        raise HTTPException(status_code=400, detail="Unknown parent firm")
    firm = {"id": str(uuid.uuid4()), **data.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
    await db.firms.insert_one(firm)
    return firm


@router.put("/firms/{firm_id}")
async def update_firm(firm_id: str, data: FirmPayload, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Firms (Update)")
    _require_management(current_user)
    await _firm_or_404(firm_id)
    if data.parent_firm_id:
        if data.parent_firm_id == firm_id:
            raise HTTPException(status_code=400, detail="A firm cannot be its own parent")
        if not await db.firms.find_one({"id": data.parent_firm_id}):
            raise HTTPException(status_code=400, detail="Unknown parent firm")
    await db.firms.update_one({"id": firm_id}, {"$set": data.model_dump()})
    return await _firm_or_404(firm_id)


@router.delete("/firms/{firm_id}")
async def delete_firm(firm_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Firms (Delete)")
    _require_management(current_user)
    await _firm_or_404(firm_id)
    children = await db.firms.count_documents({"parent_firm_id": firm_id})
    if children:
        raise HTTPException(status_code=400, detail="Firm has child firms; move or delete them first")
    await db.firm_offices.delete_many({"firm_id": firm_id})
    await db.firm_factories.delete_many({"firm_id": firm_id})
    await db.firm_access.delete_many({"firm_id": firm_id})
    await db.firms.delete_one({"id": firm_id})
    return {"message": "Firm deleted"}


# ============ OFFICES & FACTORIES ============

@router.get("/firms/{firm_id}/offices")
async def get_firm_offices(firm_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Firms (View)")
    await _firm_or_404(firm_id)
    return await db.firm_offices.find({"firm_id": firm_id}, {"_id": 0}).to_list(1000)


@router.post("/firms/{firm_id}/offices")
async def add_firm_office(firm_id: str, data: FirmOfficePayload, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Firms (Create)")
    _require_management(current_user)
    await _firm_or_404(firm_id)
    if data.is_head_office:
        head = await db.firm_offices.find_one({"firm_id": firm_id, "is_head_office": True})
        if head:
            raise HTTPException(status_code=400, detail="Firm already has a head office")
    office = {"id": str(uuid.uuid4()), "firm_id": firm_id, "created_at": datetime.now(timezone.utc).isoformat(), **data.model_dump()}
    await db.firm_offices.insert_one(office)
    return office


@router.delete("/firms/{firm_id}/offices/{office_id}")
async def delete_firm_office(firm_id: str, office_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Firms (Delete)")
    _require_management(current_user)
    result = await db.firm_offices.delete_one({"id": office_id, "firm_id": firm_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Office not found")
    return {"message": "Office deleted"}


@router.get("/firms/{firm_id}/factories")
async def get_firm_factories(firm_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Firms (View)")
    await _firm_or_404(firm_id)
    return await db.firm_factories.find({"firm_id": firm_id}, {"_id": 0}).to_list(1000)


@router.post("/firms/{firm_id}/factories")
async def add_firm_factory(firm_id: str, data: FirmFactoryPayload, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Firms (Create)")
    _require_management(current_user)
    await _firm_or_404(firm_id)
    product = await db.products.find_one({"id": data.product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    dup = await db.firm_factories.find_one({"firm_id": firm_id, "product_id": data.product_id})
    if dup:
        raise HTTPException(status_code=400, detail="This firm already has a factory for this product")
    factory = {"id": str(uuid.uuid4()), "firm_id": firm_id, "created_at": datetime.now(timezone.utc).isoformat(), **data.model_dump()}
    await db.firm_factories.insert_one(factory)
    return factory


@router.delete("/firms/{firm_id}/factories/{factory_id}")
async def delete_firm_factory(firm_id: str, factory_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Firms (Delete)")
    _require_management(current_user)
    result = await db.firm_factories.delete_one({"id": factory_id, "firm_id": firm_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Factory not found")
    return {"message": "Factory deleted"}


# ============ FIRM ACCESS GRANTS ============

@router.get("/firms/{firm_id}/access")
async def get_firm_access(firm_id: str, current_user: dict = Depends(get_current_user)):
    """All product x depot pairs granted for a firm, grouped by user."""
    await check_permission(current_user, "Firms (View)")
    await _firm_or_404(firm_id)
    grants = await db.firm_access.find({"firm_id": firm_id}, {"_id": 0}).to_list(10000)

    users = await db.users.find({}, {"_id": 0, "id": 1, "name": 1, "role": 1}).to_list(1000)
    products = await db.products.find({}, {"_id": 0, "id": 1, "product_name": 1}).to_list(1000)
    depots = await db.depots.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)

    by_user = {}
    for g in grants:
        by_user.setdefault(g.get("user_id"), []).append(g)

    result = []
    for user in users:
        user_grants = by_user.get(user["id"], [])
        result.append({
            "user_id": user["id"],
            "user_name": user.get("name") or "",
            "role": user.get("role"),
            "grants": user_grants,
            "grant_count": len(user_grants),
        })

    return {
        "firm_id": firm_id,
        "users": result,
        "products": products,
        "depots": depots,
    }


@router.post("/firms/{firm_id}/access")
async def grant_firm_access(firm_id: str, data: FirmAccessPayload, current_user: dict = Depends(get_current_user)):
    """Grant one product x depot pair to a user for this firm."""
    await check_permission(current_user, "Firms (Update)")
    _require_management(current_user)
    await _firm_or_404(firm_id)

    user = await db.users.find_one({"id": data.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    product = await db.products.find_one({"id": data.product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    depot = await db.depots.find_one({"id": data.depot_id})
    if not depot:
        raise HTTPException(status_code=404, detail="Depot not found")

    existing = await db.firm_access.find_one({
        "firm_id": firm_id, "user_id": data.user_id,
        "product_id": data.product_id, "depot_id": data.depot_id,
    })
    if existing:
        raise HTTPException(status_code=400, detail="Grant already exists for this user/product/depot")

    grant = {
        "id": str(uuid.uuid4()),
        "firm_id": firm_id,
        "user_id": data.user_id,
        "product_id": data.product_id,
        "depot_id": data.depot_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.firm_access.insert_one(grant)
    return grant


@router.delete("/firms/{firm_id}/access/{grant_id}")
async def revoke_firm_access(firm_id: str, grant_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Firms (Update)")
    _require_management(current_user)
    result = await db.firm_access.delete_one({"id": grant_id, "firm_id": firm_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Grant not found")
    return {"message": "Grant revoked"}
