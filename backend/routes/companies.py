"""Company and Company Users routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone
import uuid
from .db_compat import db

# from database import db
from auth_utils import get_current_user, check_permission
from models import (
    Company, CompanyCreate,
    CompanyUser, CompanyUserCreate,
    PurchaseOrder
)

router = APIRouter(tags=["Companies"])

ENTITY_ROLES = ("Lead", "Client", "Company", "Source")


async def _validate_entity_roles(roles) -> List[str]:
    roles = roles or []
    invalid = [r for r in roles if r not in ENTITY_ROLES]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Invalid entity roles: {invalid}. Allowed: {list(ENTITY_ROLES)}")
    # A client role always keeps the legacy is_client flag in sync.
    return list(dict.fromkeys(roles))


async def _validate_parent_client(company_id: Optional[str], self_id: Optional[str] = None) -> None:
    if not company_id:
        return
    parent = await db.companies.find_one({"id": company_id})
    if not parent:
        raise HTTPException(status_code=400, detail="Unknown parent client")
    if self_id and company_id == self_id:
        raise HTTPException(status_code=400, detail="A company cannot be its own parent")
    roles = parent.get("entity_roles") or []
    if "Client" not in roles and not parent.get("is_client"):
        raise HTTPException(status_code=400, detail="Parent must be a Client company")


# ============ COMPANY ROUTES ============

@router.post("/companies", response_model=Company)
async def create_company(data: CompanyCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Companies (Create)")
    payload = data.model_dump()
    payload["entity_roles"] = await _validate_entity_roles(payload.get("entity_roles"))
    await _validate_parent_client(payload.get("parent_client_id"))
    if "Client" in payload["entity_roles"]:
        payload["is_client"] = True
    company = Company(**payload, added_by=current_user["name"])
    await db.companies.insert_one(company.model_dump())
    return company

@router.get("/companies", response_model=List[Company])
async def get_companies(current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Companies (View)")
    return await db.companies.find({}, {"_id": 0}).to_list(1000)

@router.get("/companies/{company_id}", response_model=Company)
async def get_company(company_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Companies (View)")
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company

@router.put("/companies/{company_id}", response_model=Company)
async def update_company(company_id: str, data: CompanyCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Companies (Update)")
    existing = await db.companies.find_one({"id": company_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Company not found")

    payload = data.model_dump()
    payload["entity_roles"] = await _validate_entity_roles(payload.get("entity_roles"))
    await _validate_parent_client(payload.get("parent_client_id"), self_id=company_id)
    if "Client" in payload["entity_roles"]:
        payload["is_client"] = True
    await db.companies.update_one({"id": company_id}, {"$set": payload})
    return await db.companies.find_one({"id": company_id}, {"_id": 0})

@router.delete("/companies/{company_id}")
async def delete_company(company_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Companies (Delete)")
    await db.companies.delete_one({"id": company_id})
    # Also delete all users associated with this company
    await db.company_users.delete_many({"company_id": company_id})
    return {"message": "Company deleted"}

@router.get("/companies/{company_id}/purchase-orders", response_model=List[PurchaseOrder])
async def get_company_purchase_orders(
    company_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all purchase orders for a specific company"""
    await check_permission(current_user, "Purchase Orders (View)")
    # Verify company exists
    company = await db.companies.find_one({"id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    purchase_orders = await db.purchase_orders.find(
        {"to_company_id": company_id},
        {"_id": 0}
    ).to_list(1000)
    return purchase_orders

# ============ OFFICES & FACTORIES ============

class OfficePayload(BaseModel):
    name: str
    office_type: str = "Branch"
    is_head_office: bool = False
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pin_code: Optional[str] = None
    contact_person: Optional[str] = None
    contact_mobile: Optional[str] = None


class FactoryPayload(BaseModel):
    factory_name: str
    product_id: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None


async def _company_or_404(company_id: str) -> dict:
    company = await db.companies.find_one({"id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.get("/companies/{company_id}/offices")
async def get_company_offices(company_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Company Users (View)")
    await _company_or_404(company_id)
    return await db.client_offices.find({"company_id": company_id}, {"_id": 0}).to_list(1000)


@router.post("/companies/{company_id}/offices")
async def add_company_office(company_id: str, data: OfficePayload, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Company Users (Create)")
    await _company_or_404(company_id)
    if data.is_head_office:
        # Only one head office per company.
        head = await db.client_offices.find_one({"company_id": company_id, "is_head_office": True})
        if head:
            raise HTTPException(status_code=400, detail="Company already has a head office")
    office = {
        "id": str(uuid.uuid4()),
        "company_id": company_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        **data.model_dump(),
    }
    await db.client_offices.insert_one(office)
    return office


@router.put("/companies/{company_id}/offices/{office_id}")
async def update_company_office(company_id: str, office_id: str, data: OfficePayload, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Company Users (Update)")
    existing = await db.client_offices.find_one({"id": office_id, "company_id": company_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Office not found")
    if data.is_head_office and not existing.get("is_head_office"):
        head = await db.client_offices.find_one({"company_id": company_id, "is_head_office": True})
        if head:
            raise HTTPException(status_code=400, detail="Company already has a head office")
    await db.client_offices.update_one({"id": office_id}, {"$set": data.model_dump()})
    return await db.client_offices.find_one({"id": office_id}, {"_id": 0})


@router.delete("/companies/{company_id}/offices/{office_id}")
async def delete_company_office(company_id: str, office_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Company Users (Delete)")
    result = await db.client_offices.delete_one({"id": office_id, "company_id": company_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Office not found")
    return {"message": "Office deleted"}


@router.get("/companies/{company_id}/factories")
async def get_company_factories(company_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Company Users (View)")
    await _company_or_404(company_id)
    return await db.client_factories.find({"company_id": company_id}, {"_id": 0}).to_list(1000)


@router.post("/companies/{company_id}/factories")
async def add_company_factory(company_id: str, data: FactoryPayload, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Company Users (Create)")
    await _company_or_404(company_id)
    product = await db.products.find_one({"id": data.product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    # Max one factory per product per company (unique key; pre-check for a clean error).
    dup = await db.client_factories.find_one({"company_id": company_id, "product_id": data.product_id})
    if dup:
        raise HTTPException(status_code=400, detail="This company already has a factory for this product")
    factory = {
        "id": str(uuid.uuid4()),
        "company_id": company_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        **data.model_dump(),
    }
    await db.client_factories.insert_one(factory)
    return factory


@router.put("/companies/{company_id}/factories/{factory_id}")
async def update_company_factory(company_id: str, factory_id: str, data: FactoryPayload, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Company Users (Update)")
    existing = await db.client_factories.find_one({"id": factory_id, "company_id": company_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Factory not found")
    if data.product_id != existing.get("product_id"):
        dup = await db.client_factories.find_one({"company_id": company_id, "product_id": data.product_id})
        if dup and dup["id"] != factory_id:
            raise HTTPException(status_code=400, detail="This company already has a factory for this product")
    await db.client_factories.update_one({"id": factory_id}, {"$set": data.model_dump()})
    return await db.client_factories.find_one({"id": factory_id}, {"_id": 0})


@router.delete("/companies/{company_id}/factories/{factory_id}")
async def delete_company_factory(company_id: str, factory_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Company Users (Delete)")
    result = await db.client_factories.delete_one({"id": factory_id, "company_id": company_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Factory not found")
    return {"message": "Factory deleted"}

# ============ COMPANY USERS ROUTES ============

@router.get("/companies/{company_id}/users")
async def get_company_users(company_id: str, current_user: dict = Depends(get_current_user)):
    """Get all users for a specific company"""
    await check_permission(current_user, "Company Users (View)")
    users = await db.company_users.find({"company_id": company_id}, {"_id": 0}).to_list(100)
    return users

@router.post("/companies/{company_id}/users", response_model=CompanyUser)
async def add_company_user(company_id: str, data: CompanyUserCreate, current_user: dict = Depends(get_current_user)):
    """Add a user to a company"""
    await check_permission(current_user, "Company Users (Create)")
    company = await db.companies.find_one({"id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    user = CompanyUser(**data.model_dump(), company_id=company_id)
    await db.company_users.insert_one(user.model_dump())
    return user

@router.put("/companies/{company_id}/users/{user_id}", response_model=CompanyUser)
async def update_company_user(company_id: str, user_id: str, data: CompanyUserCreate, current_user: dict = Depends(get_current_user)):
    """Update a company user"""
    await check_permission(current_user, "Company Users (Update)")
    await db.company_users.update_one(
        {"id": user_id, "company_id": company_id}, 
        {"$set": data.model_dump()}
    )
    user = await db.company_users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.delete("/companies/{company_id}/users/{user_id}")
async def delete_company_user(company_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a company user"""
    await check_permission(current_user, "Company Users (Delete)")
    result = await db.company_users.delete_one({"id": user_id, "company_id": company_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}
