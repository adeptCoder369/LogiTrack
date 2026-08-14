"""Depot and Depot Inventory routes"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional

from .db_compat import db
from auth_utils import get_current_user, check_permission, get_user_depot_ids, build_product_filter, check_product_access, check_depot_access, build_depot_filter
from models import Depot, DepotCreate

router = APIRouter(tags=["Depots"])


def _resolve_depot_company(current_user: dict, data: DepotCreate, existing: Optional[dict] = None) -> Optional[str]:
    """Every depot belongs to a company. Master admin may leave it unset
    (legacy depots stay NULL until assigned); everyone else must supply one,
    falling back to their own company."""
    if current_user.get("is_master_admin"):
        return data.company_id or (existing or {}).get("company_id")

    company_id = data.company_id or current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="A depot must belong to a company (company_id is required)")
    return company_id


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


# ============ DEPOT ROUTES ============

@router.post("/depots", response_model=Depot)
async def create_depot(data: DepotCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Depots (Create)")
    company_id = _resolve_depot_company(current_user, data)
    if company_id and not await db.companies.find_one({"id": company_id}):
        raise HTTPException(status_code=400, detail="Unknown company")
    depot_data = data.model_dump()
    if company_id:
        depot_data["company_id"] = company_id
    depot = Depot(**depot_data)
    await db.depots.insert_one(depot.model_dump())
    return depot

@router.get("/depots", response_model=List[Depot])
async def get_depots(current_user: dict = Depends(get_current_user)):
    """Get all depots - filtered by company ownership + user's depot access"""
    await check_permission(current_user, "Depots (View)")
    depot_ids = await get_user_depot_ids(current_user)

    if depot_ids is None:
        # Master admin: platform-level visibility
        return await db.depots.find({}, {"_id": 0}).to_list(1000)

    or_branches = []
    if current_user.get("company_id"):
        or_branches.append({"company_id": current_user["company_id"]})
    if depot_ids:
        or_branches.append({"id": {"$in": depot_ids}})

    if not or_branches:
        return []

    return await db.depots.find({"$or": or_branches}, {"_id": 0}).to_list(1000)

@router.get("/depots/{depot_id}", response_model=Depot)
async def get_depot(depot_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific depot - checks company ownership + user's depot access"""
    await check_permission(current_user, "Depots (View)")

    depot = await db.depots.find_one({"id": depot_id}, {"_id": 0})
    if not depot:
        raise HTTPException(status_code=404, detail="Depot not found")

    depot_ids = await get_user_depot_ids(current_user)
    owned = bool(depot.get("company_id")) and depot.get("company_id") == current_user.get("company_id")
    if depot_ids is not None and depot_id not in depot_ids and not owned:
        raise HTTPException(status_code=403, detail="You don't have access to this depot")

    return depot

@router.put("/depots/{depot_id}", response_model=Depot)
async def update_depot(depot_id: str, data: DepotCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Depots (Update)")

    existing = await db.depots.find_one({"id": depot_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Depot not found")

    depot_ids = await get_user_depot_ids(current_user)
    owned = bool(existing.get("company_id")) and existing.get("company_id") == current_user.get("company_id")
    if depot_ids is not None and depot_id not in depot_ids and not owned:
        raise HTTPException(status_code=403, detail="You don't have access to this depot")

    company_id = _resolve_depot_company(current_user, data, existing)
    if company_id and company_id != existing.get("company_id") and not await db.companies.find_one({"id": company_id}):
        raise HTTPException(status_code=400, detail="Unknown company")

    update_data = data.model_dump()
    if company_id:
        update_data["company_id"] = company_id
    await db.depots.update_one({"id": depot_id}, {"$set": update_data})
    return await db.depots.find_one({"id": depot_id}, {"_id": 0})

@router.delete("/depots/{depot_id}")
async def delete_depot(depot_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Depots (Delete)")
    await db.depots.delete_one({"id": depot_id})
    return {"message": "Depot deleted"}

# ============ DEPOT INVENTORY (WALLET) ROUTES ============

@router.get("/depot-inventory/{depot_id}")
async def get_depot_inventory(depot_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Inventory Wallet (View)")
    # Check depot access
    await check_depot_access(current_user, depot_id)
    # Build query with product filter
    query = {"depot_id": depot_id}
    product_filter = await build_product_filter(current_user, "product_id")
    query.update(product_filter)
    
    inventory = await db.depot_inventory.find(query, {"_id": 0}).to_list(100)
    return inventory

@router.get("/depot-inventory")
async def get_all_depot_inventory(current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Inventory Wallet (View)")
    # Build query with product and depot filters
    query = await build_product_filter(current_user, "product_id")
    depot_filter = await build_depot_filter(current_user, "depot_id")
    query.update(depot_filter)
    
    inventory = await db.depot_inventory.find(query, {"_id": 0}).to_list(1000)
    return inventory

@router.get("/depot-inventory/ledger/{depot_id}/{product_id}")
async def get_inventory_ledger(
    depot_id: str, 
    product_id: str,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get transaction ledger for a specific depot/product combination with optional date filter"""
    
    await check_permission(current_user, "Inventory Wallet (View)")
    
    # Check depot and product access
    await check_depot_access(current_user, depot_id)
    await check_product_access(current_user, product_id)
    
    # Build date query for incoming
    incoming_query = {
        "unloading_point_id": depot_id,
        "product_id": product_id,
        "unloading_status": "Verified"
    }
    
    # Build date query for outgoing
    outgoing_query = {
        "loading_point_id": depot_id,
        "product_id": product_id,
        "lifting_type": "Secondary",
        "loading_status": "Loaded",
        "unloading_status": {"$ne": "Rejected"}
    }
    
    # Get all verified liftings that affect this depot/product
    # Incoming (Primary liftings TO this depot)
    incoming_liftings = await db.liftings.find(incoming_query, {"_id": 0}).sort("date_of_unloading", -1).to_list(1000)
    
    # Outgoing (Secondary liftings FROM this depot)
    outgoing_liftings = await db.liftings.find(outgoing_query, {"_id": 0}).sort("date_of_loading", -1).to_list(1000)

    verified_pickups_query = {
        # Exclude final_verified pickups (they have corresponding liftings, avoid double-count)
        "status": {"$in": ["verified", "weightment_done"]},
        "source_id": depot_id,
        "source_type": "Depot",
        "product_id": product_id
    }

    verified_pickups = await db.pickups.find(
        verified_pickups_query,
        {"_id": 0}
    ).sort("verified_at", -1).to_list(1000)
    
    # Create ledger entries
    all_transactions = []
    
    for lifting in incoming_liftings:
        # Use verified_at (full timestamp) when available, otherwise combine date + time
        txn_date = lifting.get("verified_at") or resolve_txn_date(
            lifting.get("date_of_unloading"),
            lifting.get("time_of_unloading"),
            lifting.get("created_at")
        )
        all_transactions.append({
            "type": "IN",
            "date": txn_date,
            "lifting_no": lifting.get("lifting_no"),
            "quantity": lifting.get("net_weight_mt") or lifting.get("quantity_mt", 0),
            "from": lifting.get("loading_point_name"),
            "vehicle": lifting.get("vehicle_number") or lifting.get("loading_siding_name"),
            "verified_by": lifting.get("verified_by_name"),
            "lifting_type": lifting.get("lifting_type"),
            "transport_mode": lifting.get("transport_mode", "Road")
        })
    
    for lifting in outgoing_liftings:
        txn_date = resolve_txn_date(
            lifting.get("date_of_loading"),
            lifting.get("time_of_loading"),
            lifting.get("created_at")
        )
        all_transactions.append({
            "type": "OUT",
            "date": txn_date,
            "lifting_no": lifting.get("lifting_no"),
            "quantity": (
                lifting.get("net_weight_mt")
                or lifting.get("quantity_mt", 0)
            ),
            "to": lifting.get("unloading_point_name"),
            "vehicle": lifting.get("vehicle_number") or lifting.get("loading_siding_name"),
            "loaded_by": lifting.get("loaded_by_name"),
            "lifting_type": lifting.get("lifting_type"),
            "transport_mode": lifting.get("transport_mode", "Road")
        })

    for pickup in verified_pickups:
        txn_date = pickup.get("verified_at") or pickup.get("date")

        all_transactions.append({
            "type": "OUT",
            "date": txn_date,
            "lifting_no": pickup.get("purchase_order_no") or "PICKUP",
            "quantity": pickup.get("loaded_weight_mt") or pickup.get("weight_mt", 0),

            "to": pickup.get("purchase_order_company_name")
                  or pickup.get("company_name"),

            "vehicle": pickup.get("truck_number"),

            "loaded_by": pickup.get("verified_by_name"),

            "lifting_type": "Pickup",
            "transport_mode": "Road"
        })
    
    # Sort by date (oldest first for balance calculation)
    # Use far-future fallback so None/empty dates sort to end (not beginning)
    all_transactions.sort(key=lambda x: x.get("date") or "9999-99-99T99:99:99")

    # Anchor the running balance to the actual stock on hand so each row
    # shows the real remaining balance after that transaction (never a
    # synthetic running total that can drift negative).
    inventory = await db.depot_inventory.find_one({
        "depot_id": depot_id,
        "product_id": product_id
    }, {"_id": 0})
    actual_available = inventory.get("available_quantity", 0) if inventory else 0

    net_change = sum(
        t["quantity"] if t["type"] == "IN" else -t["quantity"]
        for t in all_transactions
    )
    running_balance = round(actual_available - net_change, 2)

    # Calculate running balance
    for txn in all_transactions:
        if txn["type"] == "IN":
            running_balance += txn["quantity"]
        else:
            running_balance -= txn["quantity"]
        txn["balance"] = round(running_balance, 2)
    
    # Apply date filter AFTER balance calculation (to show correct balances)
    if date_from or date_to:
        filtered_transactions = []
        for txn in all_transactions:
            txn_date = (txn.get("date") or "")[:10]  # Get YYYY-MM-DD part
            if date_from and txn_date < date_from:
                continue
            if date_to and txn_date > date_to:
                continue
            filtered_transactions.append(txn)
        all_transactions = filtered_transactions
    
    # Reverse for display (newest first)
    all_transactions.reverse()
    
    # Calculate filtered totals
    filtered_in = sum(t["quantity"] for t in all_transactions if t["type"] == "IN")
    filtered_out = sum(t["quantity"] for t in all_transactions if t["type"] == "OUT")
    
    return {
        "transactions": all_transactions,
        "total_in": filtered_in,
        "total_out": filtered_out,
        "current_balance": round(actual_available, 2),
        "filtered_in": filtered_in if (date_from or date_to) else None,
        "filtered_out": filtered_out if (date_from or date_to) else None
    }


# Depot inventory movements live in routes/liftings.py (update_depot_inventory).
# An unused copy of that logic sat here and drifted out of sync with it.
