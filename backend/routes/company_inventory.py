"""Company Inventory routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional

from .db_compat import db
# One implementation of the stock-movement arithmetic, shared with liftings and
# pickups. This module used to carry a byte-identical copy, so a fix to one
# never reached the other.
from .liftings import update_company_inventory
from auth_utils import get_current_user, check_permission
from models import CompanyInventory

router = APIRouter(tags=["Company Inventory"])


def resolve_txn_date(date_val, time_val, fallback=None):
    """Build a valid ISO timestamp for ledger sorting/display.
    time_of_loading sometimes stores a full ISO timestamp (contains 'T'),
    so prefer it directly; otherwise combine the date part + time.
    """
    if time_val and isinstance(time_val, str) and "T" in time_val:
        return time_val
    if date_val and time_val:
        return f"{str(date_val)[:10]}T{time_val}"
    return date_val or time_val or fallback

@router.get("/company-inventory", response_model=List[CompanyInventory])
async def get_company_inventory(current_user: dict = Depends(get_current_user)):
    """Get all company inventory records"""
    await check_permission(current_user, "Inventory Wallet (View)")
    query = {}
    return await db.company_inventory.find(query, {"_id": 0}).to_list(1000)

@router.get("/company-inventory/{company_id}", response_model=List[CompanyInventory])
async def get_company_inventory_by_company(company_id: str, current_user: dict = Depends(get_current_user)):
    """Get inventory records for a specific company"""
    await check_permission(current_user, "Inventory Wallet (View)")
    
    company = await db.companies.find_one({"id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    return await db.company_inventory.find({"company_id": company_id}, {"_id": 0}).to_list(1000)

@router.post("/company-inventory/transfer", response_model=CompanyInventory)
async def create_company_inventory(
    company_id: str,
    product_id: str,
    quantity: float,
    is_incoming: bool,
    current_user: dict = Depends(get_current_user)
):
    """Create or update company inventory directly (for transfers)"""
    await check_permission(current_user, "Inventory Wallet (View)")
    
    company = await db.companies.find_one({"id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    await update_company_inventory(
        company_id=company_id,
        company_name=company.get("name", ""),
        product_id=product_id,
        product_name=product.get("product_name", ""),
        product_code=product.get("product_code"),
        quantity_change=quantity,
        is_incoming=is_incoming
    )
    
    return await db.company_inventory.find_one({"company_id": company_id, "product_id": product_id}, {"_id": 0})

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
        "loading_point_id": company_id,
        "product_id": product_id,
        "loading_point_type": "Company",
        "lifting_type": "Secondary"
    }
    
    liftings = await db.liftings.find(query, {"_id": 0}).sort("date_of_loading", -1).to_list(1000)
    
    transactions = []
    for l in liftings:
        txn_date = resolve_txn_date(
            l.get("date_of_loading"),
            l.get("time_of_loading"),
            l.get("created_at")
        )
        transactions.append({
            "date": txn_date,
            "type": "OUT",
            "quantity": (
                l.get("net_weight_mt")
                or l.get("quantity_mt", 0)
            ),
            "lifting_no": l.get("lifting_no"),
            "vehicle_number": l.get("vehicle_number"),
            "transport_mode": l.get("transport_mode", "Road"),
            "from": l.get("loading_point_name"),
            "from_type": l.get("loading_point_type"),
            "to": l.get("unloading_point_name"),
            "to_type": l.get("unloading_point_type")
        })
    
    primary_liftings_query = {
        "unloading_point_id": company_id,
        "product_id": product_id,
        "unloading_point_type": "Company",
        "lifting_type": "Primary",
        "unloading_status": {"$ne": "Rejected"}
    }
    
    primary_liftings = await db.liftings.find(primary_liftings_query, {"_id": 0}).sort("date_of_loading", -1).to_list(1000)
    
    for l in primary_liftings:
        txn_date = resolve_txn_date(
            l.get("date_of_loading"),
            l.get("time_of_loading"),
            l.get("created_at")
        )
        transactions.append({
            "date": txn_date,
            "type": "IN",
            "quantity": (
                l.get("net_weight_mt")
                or l.get("quantity_mt", 0)
            ),
            "lifting_no": l.get("lifting_no"),
            "vehicle_number": l.get("vehicle_number"),
            "transport_mode": l.get("transport_mode", "Road"),
            "from": l.get("loading_point_name"),
            "from_type": l.get("loading_point_type"),
            "to": l.get("unloading_point_name"),
            "to_type": l.get("unloading_point_type")
        })
    
    # Include Secondary liftings where company is the UNLOADING point (depot -> company)
    secondary_unload_query = {
        "unloading_point_id": company_id,
        "product_id": product_id,
        "unloading_point_type": "Company",
        "lifting_type": "Secondary",
        "unloading_status": {"$ne": "Rejected"}
    }
    
    secondary_unload_liftings = await db.liftings.find(secondary_unload_query, {"_id": 0}).sort("date_of_loading", -1).to_list(1000)
    
    for l in secondary_unload_liftings:
        txn_date = resolve_txn_date(
            l.get("date_of_loading"),
            l.get("time_of_loading"),
            l.get("created_at")
        )
        transactions.append({
            "date": txn_date,
            "type": "IN",
            "quantity": (
                l.get("net_weight_mt")
                or l.get("quantity_mt", 0)
            ),
            "lifting_no": l.get("lifting_no"),
            "vehicle_number": l.get("vehicle_number"),
            "transport_mode": l.get("transport_mode", "Road"),
            "from": l.get("loading_point_name"),
            "from_type": l.get("loading_point_type"),
            "to": l.get("unloading_point_name"),
            "to_type": l.get("unloading_point_type")
        })
    
    # Include pickups dispatched from company (source_type = "Company")
    pickup_query = {
        "source_id": company_id,
        "source_type": "Company",
        "product_id": product_id,
        # Exclude final_verified pickups (they have corresponding liftings, avoid double-count)
        "status": {"$in": ["verified", "weightment_done"]}
    }
    
    pickups = await db.pickups.find(pickup_query, {"_id": 0}).sort("date", -1).to_list(1000)
    
    for p in pickups:
        # Check if this pickup came from a Company source PO
        po = await db.purchase_orders.find_one({"id": p.get("purchase_order_id")}, {"_id": 0})
        if po and po.get("source_type") == "Company":
            transactions.append({
                "date": p.get("date") or p.get("verified_at") or p.get("final_verified_at"),
                "type": "OUT",
                "quantity": p.get("weight_mt") or p.get("loaded_weight_mt", 0),
                "lifting_no": p.get("purchase_order_no") or p.get("purchase_order_id"),
                "vehicle": p.get("truck_number") or "",
                "transport_mode": "Pickup",
                "from": p.get("source_name") or company_id,
                "to": p.get("purchase_order_company_name") or p.get("company_name") or "-",
                "loaded_by": p.get("verified_by_name")
            })
    
    transactions.sort(key=lambda x: x.get("date") or "9999-99-99T99:99:99")

    current_inventory = await db.company_inventory.find_one({
        "company_id": company_id,
        "product_id": product_id
    }, {"_id": 0})

    # Anchor the running balance to the actual stock on hand so each row
    # shows the real remaining balance after that transaction (never a
    # synthetic running total that can drift negative).
    actual_available = current_inventory.get("available_quantity", 0) if current_inventory else 0

    net_change = sum(
        t["quantity"] if t["type"] == "IN" else -t["quantity"]
        for t in transactions
    )
    running_balance = round(actual_available - net_change, 2)

    for t in transactions:
        if t["type"] == "IN":
            running_balance += t["quantity"]
        else:
            running_balance -= t["quantity"]
        t["balance"] = round(running_balance, 2)

    # Apply date filter AFTER balance calculation (to show correct balances)
    if date_from or date_to:
        filtered_transactions = []
        for t in transactions:
            txn_date = (t.get("date") or "")[:10]
            if date_from and txn_date < date_from:
                continue
            if date_to and txn_date > date_to:
                continue
            filtered_transactions.append(t)
        transactions = filtered_transactions

    # Reverse for display (newest first)
    transactions.reverse()

    total_in = sum(t["quantity"] for t in transactions if t["type"] == "IN")
    total_out = sum(t["quantity"] for t in transactions if t["type"] == "OUT")

    return {
        "transactions": transactions,
        "total_in": total_in,
        "total_out": total_out,
        "current_balance": round(actual_available, 2)
    }