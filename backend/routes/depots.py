"""Depot and Depot Inventory routes"""
from fastapi import APIRouter, Depends
from typing import List, Optional
from datetime import datetime, timezone

from database import db
from auth_utils import get_current_user, check_permission, get_user_depot_ids, build_product_filter, check_product_access, check_depot_access, build_depot_filter
from models import Depot, DepotCreate, DepotInventory

router = APIRouter(tags=["Depots"])

# ============ DEPOT ROUTES ============

@router.post("/depots", response_model=Depot)
async def create_depot(data: DepotCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Depots (Create)")
    depot = Depot(**data.model_dump())
    await db.depots.insert_one(depot.model_dump())
    return depot

@router.get("/depots", response_model=List[Depot])
async def get_depots(current_user: dict = Depends(get_current_user)):
    """Get all depots - filtered by user's depot access"""
    await check_permission(current_user, "Depots (View)")
    depot_ids = await get_user_depot_ids(current_user)

    if depot_ids is None:
        return await db.depots.find({}, {"_id": 0}).to_list(1000)

    if not depot_ids:
        return []

    return await db.depots.find({"id": {"$in": depot_ids}}, {"_id": 0}).to_list(1000)

@router.get("/depots/{depot_id}", response_model=Depot)
async def get_depot(depot_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific depot - checks user's depot access"""
    from fastapi import HTTPException
    await check_permission(current_user, "Depots (View)")
    depot_ids = await get_user_depot_ids(current_user)

    if depot_ids is not None and depot_id not in depot_ids:
        raise HTTPException(status_code=403, detail="You don't have access to this depot")

    depot = await db.depots.find_one({"id": depot_id}, {"_id": 0})
    if not depot:
        raise HTTPException(status_code=404, detail="Depot not found")
    return depot

@router.put("/depots/{depot_id}", response_model=Depot)
async def update_depot(depot_id: str, data: DepotCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Depots (Update)")
    await db.depots.update_one({"id": depot_id}, {"$set": data.model_dump()})
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
        "loading_status": "Loaded"
    }
    
    # Get all verified liftings that affect this depot/product
    # Incoming (Primary liftings TO this depot)
    incoming_liftings = await db.liftings.find(incoming_query, {"_id": 0}).sort("date_of_unloading", -1).to_list(1000)
    
    # Outgoing (Secondary liftings FROM this depot)
    outgoing_liftings = await db.liftings.find(outgoing_query, {"_id": 0}).sort("date_of_loading", -1).to_list(1000)

    verified_pickups_query = {
        "status": {"$in": ["verified", "weightment_done", "final_verified"]},
        "depot_id": depot_id,
        "product_id": product_id
    }

    verified_pickups = await db.pickups.find(
        verified_pickups_query,
        {"_id": 0}
    ).sort("verified_at", -1).to_list(1000)
    
    # Create ledger entries
    all_transactions = []
    running_balance = 0
    
    for lifting in incoming_liftings:
        # Use verified_at (full timestamp) instead of date_of_unloading (date-only) to avoid timezone issues
        txn_date = lifting.get("verified_at") or lifting.get("date_of_unloading")
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
        txn_date = lifting.get("date_of_loading")
        all_transactions.append({
            "type": "OUT",
            "date": txn_date,
            "lifting_no": lifting.get("lifting_no"),
            "quantity": lifting.get("quantity_mt", 0),
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
    all_transactions.sort(key=lambda x: x.get("date") or "")
    
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
        "current_balance": round(running_balance, 2),
        "filtered_in": filtered_in if (date_from or date_to) else None,
        "filtered_out": filtered_out if (date_from or date_to) else None
    }


# Helper function for updating depot inventory
async def update_depot_inventory(depot_id: str, depot_name: str, product_id: str, product_name: str, 
                                  product_code: str, quantity_change: float, is_incoming: bool):
    existing = await db.depot_inventory.find_one({
        "depot_id": depot_id,
        "product_id": product_id
    })
    
    if existing:
        if is_incoming:
            new_received = existing.get("total_received", 0) + quantity_change
            new_available = existing.get("available_quantity", 0) + quantity_change
            await db.depot_inventory.update_one(
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
            await db.depot_inventory.update_one(
                {"id": existing["id"]},
                {"$set": {
                    "total_dispatched": new_dispatched,
                    "available_quantity": max(0, new_available),
                    "last_updated": datetime.now(timezone.utc).isoformat()
                }}
            )
    else:
        inventory = DepotInventory(
            depot_id=depot_id,
            depot_name=depot_name,
            product_id=product_id,
            product_name=product_name,
            product_code=product_code or "",
            total_received=quantity_change if is_incoming else 0,
            total_dispatched=0 if is_incoming else quantity_change,
            available_quantity=quantity_change if is_incoming else 0
        )
        await db.depot_inventory.insert_one(inventory.model_dump())
