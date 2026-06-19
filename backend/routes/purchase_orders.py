"""Purchase Order routes"""

from fastapi import APIRouter, HTTPException, Depends, Body
from typing import List, Optional

from database import db
from auth_utils import get_current_user, check_permission, build_product_filter, build_depot_filter, check_product_access, check_depot_access
from models import PurchaseOrder, PurchaseOrderCreate

router = APIRouter(tags=["Purchase Orders"])


# ✅ CREATE PURCHASE ORDER
@router.post("/purchase-orders", response_model=PurchaseOrder)
async def create_purchase_order(
    data: PurchaseOrderCreate,
    current_user: dict = Depends(get_current_user)
):
    # Permission check
    await check_permission(current_user, "Purchase Orders (Create)")

    # Product access check
    if data.product_id:
        await check_product_access(current_user, data.product_id)

    # Generate PO number
    count = await db.purchase_orders.count_documents({})
    po_number = f"PO-{str(count + 1).zfill(6)}"

    # Create PO
    order = PurchaseOrder(
        **data.model_dump(exclude_none=True),
        po_number=po_number,
        remaining_quantity_mt=data.total_quantity_mt,
        added_by=current_user["id"],
        added_by_name=current_user["name"]
    )

    await db.purchase_orders.insert_one(order.model_dump())
    return order


# ✅ GET ALL PURCHASE ORDERS
@router.get("/purchase-orders", response_model=List[PurchaseOrder])
async def get_purchase_orders(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    await check_permission(current_user, "Purchase Orders (View)")

    # Apply product and depot filters
    query = await build_product_filter(current_user, "product_id")
    depot_filter = await build_depot_filter(current_user, "depot_id")
    query.update(depot_filter)
    
    if status:
        query["status"] = status

    return await db.purchase_orders.find(query, {"_id": 0}).to_list(1000)


# ✅ GET SINGLE PURCHASE ORDER
@router.get("/purchase-orders/{order_id}", response_model=PurchaseOrder)
async def get_purchase_order(
    order_id: str,
    current_user: dict = Depends(get_current_user)
):
    await check_permission(current_user, "Purchase Orders (View)")

    order = await db.purchase_orders.find_one({"id": order_id}, {"_id": 0})

    if not order:
        raise HTTPException(status_code=404, detail="Purchase Order not found")

    # Product access check
    if order.get("product_id"):
        await check_product_access(current_user, order["product_id"])

    return order


# ✅ UPDATE PURCHASE ORDER
@router.put("/purchase-orders/{order_id}", response_model=PurchaseOrder)
async def update_purchase_order(
    order_id: str,
    data: PurchaseOrderCreate,
    current_user: dict = Depends(get_current_user)
):
    await check_permission(current_user, "Purchase Orders (Update)")

    existing = await db.purchase_orders.find_one({"id": order_id})

    if not existing:
        raise HTTPException(status_code=404, detail="Purchase Order not found")

    # Check product access (old + new)
    if existing.get("product_id"):
        await check_product_access(current_user, existing["product_id"])

    if data.product_id:
        await check_product_access(current_user, data.product_id)

    # 🔴 Optional: Prevent update if liftings already exist
    lifting_exists = await db.liftings.find_one({"purchase_order_id": order_id})
    if lifting_exists:
        raise HTTPException(
            status_code=400,
            detail="Cannot update Purchase Order: Liftings already exist"
        )

    await db.purchase_orders.update_one(
        {"id": order_id},
        {"$set": data.model_dump(exclude_none=True)}
    )

    return await db.purchase_orders.find_one({"id": order_id}, {"_id": 0})

# ✅ COMPLETE PURCHASE ORDER
@router.put("/purchase-orders/{order_id}/complete")
async def complete_purchase_order(
    order_id: str,
    payload: dict = Body(default={}),
    current_user: dict = Depends(get_current_user)
):
    await check_permission(current_user, "Purchase Orders (Update)")

    order = await db.purchase_orders.find_one({"id": order_id})

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Purchase Order not found"
        )

    # product access
    if order.get("product_id"):
        await check_product_access(
            current_user,
            order["product_id"]
        )

#    remaining = float(order.get("remaining_quantity_mt") or 0)
#
#    if remaining > 0:
#        raise HTTPException(
#            status_code=400,
#            detail="PO still has remaining quantity"
#        )

    completion_reason = payload.get("completion_reason")
    remaining = float(order.get("remaining_quantity_mt") or 0)

    from datetime import datetime, timezone
    update_fields = {
        "status": "Completed",
        "actual_completion_date": datetime.now(timezone.utc).isoformat()
    }

    if remaining > 0:
        if not completion_reason or not str(completion_reason).strip():
            raise HTTPException(
                status_code=400,
                detail="Reason is required when closing a PO early"
            )
        update_fields["completion_reason"] = str(completion_reason).strip()

    await db.purchase_orders.update_one(
        {"id": order_id},
        {"$set": update_fields}
    )

    return {
        "message": "Purchase Order marked as completed"
    }

@router.get("/purchase-orders/{order_id}/statement")
async def get_purchase_order_statement(
    order_id: str,
    current_user: dict = Depends(get_current_user)
):
    await check_permission(
        current_user,
        "Purchase Orders (View)"
    )

    # ================================
    # GET PO
    # ================================
    order = await db.purchase_orders.find_one(
        {"id": order_id},
        {"_id": 0}
    )

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Purchase Order not found"
        )

    # product access
    if order.get("product_id"):
        await check_product_access(
            current_user,
            order["product_id"]
        )

    # ================================
    # GET LIFTINGS
    # ================================
    liftings = await db.liftings.find(
        {
            "purchase_order_id": order_id,
            "unloading_status": {"$ne": "Rejected"}
        },
        {"_id": 0}
    ).sort("date_of_loading", -1).to_list(1000)

    # ================================
    # GET VERIFIED PICKUPS
    # ================================
    pickups = await db.pickups.find(
        {
            "purchase_order_id": order_id,
            "status": {"$in": ["verified", "weightment_done", "final_verified"]}
        },
        {"_id": 0}
    ).sort("verified_at", -1).to_list(1000)

    transactions = []

    # ================================
    # PICKUP ROWS
    # ================================
    for p in pickups:

        transactions.append({
            "date": p.get("verified_at") or p.get("date"),

            "type": "Pickup",

            "reference_no":
                p.get("purchase_order_no"),

            "vehicle":
                p.get("truck_number"),

            "quantity":
                p.get("loaded_weight_mt") or p.get("weight_mt") or 0,

            "status":
                p.get("status"),

            "company":
                p.get("purchase_order_company_name"),

            "verified_by":
                p.get("verified_by_name")
        })

    # ================================
    # LIFTING ROWS
    # ================================
    for l in liftings:

        transactions.append({
            "date":
                l.get("date_of_loading") or l.get("created_at"),

            "type":
                "Lifting",

            "reference_no":
                l.get("lifting_no"),

            "vehicle":
                l.get("vehicle_number"),

            "quantity":
                l.get("net_weight_mt")
                or l.get("quantity_mt", 0),

            "status":
                l.get("unloading_status"),

            "company":
                l.get("unloading_point_name"),

            "verified_by":
                l.get("verified_by_name")
        })

    # ================================
    # SORT
    # ================================
    transactions.sort(
        key=lambda x: x.get("date") or "",
        reverse=True
    )

    # ================================
    # RETURN
    # ================================
    return {
        "purchase_order": order,
        "transactions": transactions,

        "total_dispatched":
            order.get("dispatched_quantity_mt", 0),

        "remaining":
            order.get("remaining_quantity_mt", 0)
    }

# ✅ DELETE PURCHASE ORDER
@router.delete("/purchase-orders/{order_id}")
async def delete_purchase_order(
    order_id: str,
    current_user: dict = Depends(get_current_user)
):
    await check_permission(current_user, "Purchase Orders (Delete)")

    existing = await db.purchase_orders.find_one({"id": order_id})

    if not existing:
        raise HTTPException(status_code=404, detail="Purchase Order not found")

    # Product access check
    if existing.get("product_id"):
        await check_product_access(current_user, existing["product_id"])

    # 🔴 CRITICAL CHECK: block if liftings exist
    lifting_exists = await db.liftings.find_one({"purchase_order_id": order_id})

    if lifting_exists:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete Purchase Order: Liftings already exist for this order"
        )

    # ✅ Safe delete
    await db.purchase_orders.delete_one({"id": order_id})

    return {"message": "Purchase Order deleted"}
