"""Delivery Order routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional

from database import db
from auth_utils import get_current_user, check_permission, build_product_filter, build_depot_filter, check_product_access
from models import DeliveryOrder, DeliveryOrderCreate

router = APIRouter(tags=["Delivery Orders"])

@router.post("/delivery-orders", response_model=DeliveryOrder)
async def create_delivery_order(data: DeliveryOrderCreate, current_user: dict = Depends(get_current_user)):
    # Check permission for creating delivery orders
    await check_permission(current_user, "Delivery Orders (Create)")
    
    # Check product access if product is specified
    if data.product_id:
        await check_product_access(current_user, data.product_id)
    
    count = await db.delivery_orders.count_documents({})
    do_number = f"DO-{str(count + 1).zfill(6)}"
    
    order = DeliveryOrder(
        **data.model_dump(),
        do_order_no=do_number,
        remaining_quantity_mt=data.total_quantity_mt,
        added_by=current_user["id"],
        added_by_name=current_user["name"]
    )
    await db.delivery_orders.insert_one(order.model_dump())
    return order

@router.get("/delivery-orders", response_model=List[DeliveryOrder])
async def get_delivery_orders(status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    # Check permission for viewing delivery orders
    await check_permission(current_user, "Delivery Orders (View)")
    
    # Apply product and depot filters
    query = await build_product_filter(current_user, "product_id")
    depot_filter = await build_depot_filter(current_user, "to_depot_id")
    query.update(depot_filter)
    
    if status:
        query["status"] = status
    
    return await db.delivery_orders.find(query, {"_id": 0}).to_list(1000)

@router.get("/delivery-orders/{order_id}", response_model=DeliveryOrder)
async def get_delivery_order(order_id: str, current_user: dict = Depends(get_current_user)):
    # Check permission for viewing delivery orders
    await check_permission(current_user, "Delivery Orders (View)")
    
    order = await db.delivery_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Delivery Order not found")
    
    # Check product access
    if order.get("product_id"):
        await check_product_access(current_user, order["product_id"])
    
    return order

@router.put("/delivery-orders/{order_id}", response_model=DeliveryOrder)
async def update_delivery_order(order_id: str, data: DeliveryOrderCreate, current_user: dict = Depends(get_current_user)):
    # Check permission for updating delivery orders (same as create)
    await check_permission(current_user, "Delivery Orders (Update)")
    
    # Check product access for the order being updated
    existing = await db.delivery_orders.find_one({"id": order_id})
    if existing and existing.get("product_id"):
        await check_product_access(current_user, existing["product_id"])
    
    # Check product access for new product if changed
    if data.product_id:
        await check_product_access(current_user, data.product_id)
    
    await db.delivery_orders.update_one({"id": order_id}, {"$set": data.model_dump()})
    return await db.delivery_orders.find_one({"id": order_id}, {"_id": 0})

@router.delete("/delivery-orders/{order_id}")
async def delete_delivery_order(order_id: str, current_user: dict = Depends(get_current_user)):
    # Check permission
    await check_permission(current_user, "Delivery Orders (Delete)")
    
    # Check if order exists
    existing = await db.delivery_orders.find_one({"id": order_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Delivery Order not found")

    # Check product access
    if existing.get("product_id"):
        await check_product_access(current_user, existing["product_id"])

    # 🔴 CRITICAL CHECK: block if liftings exist
    lifting_exists = await db.liftings.find_one({"delivery_order_id": order_id})
    
    if lifting_exists:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete Delivery Order: Liftings already exist for this order"
        )

    # ✅ Safe to delete
    await db.delivery_orders.delete_one({"id": order_id})
    
    return {"message": "Delivery Order deleted"}
