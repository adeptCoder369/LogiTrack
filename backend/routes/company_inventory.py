"""Company Inventory routes - for tracking inventory at company level"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone

from database import db
from auth_utils import get_current_user, check_permission, build_product_filter
from models import CompanyInventory

router = APIRouter(tags=["Company Inventory"])

async def update_company_inventory(company_id: str, company_name: str, product_id: str, product_name: str,
                                  product_code: str, quantity_change: float, is_incoming: bool):
    """Update or create company inventory record"""
    existing = await db.company_inventory.find_one({
        "company_id": company_id,
        "product_id": product_id
    })
    
    if existing:
        if is_incoming:
            new_received = existing.get("total_received", 0) + quantity_change
            new_available = existing.get("available_quantity", 0) + quantity_change
            await db.company_inventory.update_one(
                {"id": existing["id"]},
                {"$set": {
                    "total_received": new_received,
                    "available_quantity": new_available,
                    "last_updated": datetime.now(timezone.utc).isoformat()
                }}
            )
        else:
            new_dispatched = existing.get("total_dispatched", 0) + quantity_change
            new_available = existing.get("available_quantity", 0) - quantity_change
            await db.company_inventory.update_one(
                {"id": existing["id"]},
                {"$set": {
                    "total_dispatched": new_dispatched,
                    "available_quantity": max(0, new_available),
                    "last_updated": datetime.now(timezone.utc).isoformat()
                }}
            )
    else:
        inventory = CompanyInventory(
            company_id=company_id,
            company_name=company_name,
            product_id=product_id,
            product_name=product_name,
            product_code=product_code or "",
            total_received=quantity_change if is_incoming else 0,
            total_dispatched=0 if is_incoming else quantity_change,
            available_quantity=quantity_change if is_incoming else 0
        )
        await db.company_inventory.insert_one(inventory.model_dump())


@router.get("/company-inventory", response_model=List[CompanyInventory])
async def get_all_company_inventory(current_user: dict = Depends(get_current_user)):
    """Get all company inventory records"""
    await check_permission(current_user, "Inventory Wallet (View)")
    query = await build_product_filter(current_user, "product_id")
    return await db.company_inventory.find(query, {"_id": 0}).to_list(1000)


@router.get("/company-inventory/{company_id}", response_model=List[CompanyInventory])
async def get_company_inventory(company_id: str, current_user: dict = Depends(get_current_user)):
    """Get inventory for a specific company"""
    await check_permission(current_user, "Inventory Wallet (View)")
    company = await db.companies.find_one({"id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return await db.company_inventory.find(
        {"company_id": company_id},
        {"_id": 0}
    ).to_list(1000)


@router.post("/company-inventory", response_model=CompanyInventory)
async def create_or_update_company_inventory(
    company_id: str,
    product_id: str,
    quantity: float,
    is_incoming: bool = True,
    current_user: dict = Depends(get_current_user)
):
    """Create or update company inventory (internal use)"""
    await check_permission(current_user, "Inventory Wallet (View)")
    
    company = await db.companies.find_one({"id": company_id})
    product = await db.products.find_one({"id": product_id})
    
    if not company or not product:
        raise HTTPException(status_code=404, detail="Company or Product not found")
    
    await update_company_inventory(
        company_id=company_id,
        company_name=company.get("name", ""),
        product_id=product_id,
        product_name=product.get("product_name", ""),
        product_code=product.get("product_code", ""),
        quantity_change=quantity,
        is_incoming=is_incoming
    )
    
    return await db.company_inventory.find_one(
        {"company_id": company_id, "product_id": product_id},
        {"_id": 0}
    )


@router.get("/company-inventory/ledger/{company_id}/{product_id}")
async def get_company_inventory_ledger(
    company_id: str,
    product_id: str,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get transaction ledger for company inventory"""
    await check_permission(current_user, "Inventory Wallet (View)")
    
    query = {
        "company_id": company_id,
        "product_id": product_id
    }
    
    if date_from or date_to:
        date_query = {}
        if date_from:
            date_query["$gte"] = date_from
        if date_to:
            date_query["$lte"] = date_to
        if date_query:
            query["date"] = date_query
    
    # Get transactions from liftings
    liftings = await db.liftings.find(
        {"loading_point_id": company_id, "product_id": product_id, "lifting_type": "Secondary"},
        {"_id": 0}
    ).to_list(1000)
    
    transactions = []
    running_balance = 0
    
    # Get initial inventory to calculate starting balance
    inventory = await db.company_inventory.find_one({"company_id": company_id, "product_id": product_id})
    running_balance = inventory.get("available_quantity", 0) if inventory else 0
    
    for l in liftings:
        date_val = l.get("date_of_loading") or l.get("created_at")
        quantity = l.get("quantity_mt", 0)
        txn_type = "OUT"
        running_balance -= quantity
        
        transactions.append({
            "date": date_val,
            "type": txn_type,
            "reference_no": l.get("lifting_no"),
            "vehicle": l.get("vehicle_number"),
            "quantity": quantity,
            "balance": running_balance,
            "to": l.get("unloading_point_name")
        })
    
    transactions.sort(key=lambda x: x.get("date") or "", reverse=True)
    
    return {
        "transactions": transactions,
        "total_out": sum(t["quantity"] for t in transactions),
        "current_balance": running_balance
    }