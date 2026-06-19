"""Company and Company Users routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List

from database import db
from auth_utils import get_current_user, check_permission
from models import (
    Company, CompanyCreate,
    CompanyUser, CompanyUserCreate,
    PurchaseOrder
)

router = APIRouter(tags=["Companies"])

# ============ COMPANY ROUTES ============

@router.post("/companies", response_model=Company)
async def create_company(data: CompanyCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Companies (Create)")
    company = Company(**data.model_dump(), added_by=current_user["name"])
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
    await db.companies.update_one({"id": company_id}, {"$set": data.model_dump()})
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
