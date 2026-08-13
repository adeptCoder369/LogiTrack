"""Lifting routes"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from sqlalchemy import func
from sqlalchemy.dialects.mysql import insert as mysql_insert

from .db_compat import db
from database import AsyncSessionLocal
import models_sqlalchemy as sql_models
from auth_utils import get_current_user, check_permission, build_product_filter, check_product_access
from models import Lifting, LiftingCreate, VerifyUnloadRequest

router = APIRouter(tags=["Liftings"])

async def validate_vehicle_assignment_for_date(vehicle_id: Optional[str], vehicle_number: Optional[str], date_of_loading: Optional[str],
                                              lifting_type: Optional[str], exclude_lifting_id: Optional[str] = None,
                                              company_id: Optional[str] = None):
    if not date_of_loading:
        return

    if not vehicle_id and not vehicle_number:
        return

    if lifting_type not in {"Primary", "Secondary"}:
        return

    normalized_vehicle_number = vehicle_number.strip().upper() if vehicle_number else ""

    query = {
        "date_of_loading": date_of_loading,
    }

    if company_id:
        query["company_id"] = company_id

    if exclude_lifting_id:
        query["id"] = {"$ne": exclude_lifting_id}

    if vehicle_id:
        query["vehicle_id"] = vehicle_id
    elif normalized_vehicle_number:
        query["vehicle_number"] = normalized_vehicle_number

    existing = await db.liftings.find_one(query)
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Vehicle {normalized_vehicle_number or vehicle_id} is already assigned for {date_of_loading}"
        )

async def _apply_inventory_movement(model, key_values: dict, seed_values: dict,
                                    quantity_change: float, is_incoming: bool):
    """Apply one stock movement as a single atomic statement.

    The previous read-modify-write (SELECT the row, add in Python, SET the
    result) loses concurrent movements: two liftings that read the same balance
    each write their own total and one movement disappears. It also raced on the
    very first movement for a depot/product pair -- both callers saw no row and
    both inserted, and the UNIQUE key turned the loser into a 500.

    Doing the arithmetic in SQL inside INSERT ... ON DUPLICATE KEY UPDATE makes
    create-or-increment one statement, so concurrent movements serialise on the
    row lock instead of overwriting each other. COALESCE guards against NULL
    balances; GREATEST(0, ...) preserves the previous clamp that stopped
    available_quantity going negative on dispatch.
    """
    delta_received = quantity_change if is_incoming else 0
    delta_dispatched = 0 if is_incoming else quantity_change
    delta_available = quantity_change if is_incoming else -quantity_change
    now = datetime.now(timezone.utc)

    stmt = mysql_insert(model).values(
        id=str(uuid.uuid4()),
        **key_values,
        **seed_values,
        total_received=delta_received,
        total_dispatched=delta_dispatched,
        available_quantity=max(0, delta_available),
        last_updated=now,
    ).on_duplicate_key_update(
        total_received=func.coalesce(model.total_received, 0) + delta_received,
        total_dispatched=func.coalesce(model.total_dispatched, 0) + delta_dispatched,
        available_quantity=func.greatest(
            0, func.coalesce(model.available_quantity, 0) + delta_available
        ),
        last_updated=now,
    )

    async with AsyncSessionLocal() as session:
        await session.execute(stmt)
        await session.commit()


async def update_company_inventory(company_id: str, company_name: str, product_id: str, product_name: str,
                                   product_code: str, quantity_change: float, is_incoming: bool):
    await _apply_inventory_movement(
        sql_models.CompanyInventory,
        key_values={"company_id": company_id, "product_id": product_id},
        seed_values={
            "company_name": company_name,
            "product_name": product_name,
            "product_code": product_code or "",
        },
        quantity_change=quantity_change,
        is_incoming=is_incoming,
    )


# Helper function for updating depot inventory
async def update_depot_inventory(depot_id: str, depot_name: str, product_id: str, product_name: str,
                                 product_code: str, quantity_change: float, is_incoming: bool, company_id: str):
    await _apply_inventory_movement(
        sql_models.DepotInventory,
        key_values={"depot_id": depot_id, "product_id": product_id},
        seed_values={
            "depot_name": depot_name,
            "product_name": product_name,
            "product_code": product_code or "",
            "company_id": company_id,
        },
        quantity_change=quantity_change,
        is_incoming=is_incoming,
    )


@router.post("/liftings", response_model=Lifting)
async def create_lifting(data: LiftingCreate, current_user: dict = Depends(get_current_user)):
    # Check permission based on lifting type
    if data.lifting_type == "Primary":
        await check_permission(current_user, "Primary Liftings (Create)")
    elif data.lifting_type == "Secondary":
        await check_permission(current_user, "Secondary Liftings (Create)")
    
    # Check product access
    if data.product_id:
        await check_product_access(current_user, data.product_id)
    
    count = await db.liftings.count_documents({})
    lifting_no = f"LFT-{str(count + 1).zfill(6)}"
    
    lifting_data = data.model_dump(exclude={"company_id"})

    company_id = current_user.get("company_id")

    order = None
    if not company_id and data.delivery_order_id:
        order = await db.delivery_orders.find_one({"id": data.delivery_order_id})
        if order:
            company_id = order.get("from_company_id")

    if not company_id and data.lifting_type == "Primary":
        raise HTTPException(
            status_code= 400,
            detail="Company could not be determined"
        )

    if data.lifting_type == "Primary":
        if not order:
            order = await db.delivery_orders.find_one({"id": data.delivery_order_id})
        if not order:
            raise HTTPException(404, "Delivery Order not found")
        remaining = order.get("remaining_quantity_mt", 0)

        if data.quantity_mt > remaining:
            raise HTTPException(
                status_code=400,
                detail=f"Quantity exceeds remaining DO quantity ({remaining} MT)"
            )
        
        if order.get("to_company_id"):
            company = await db.companies.find_one({"id": order["to_company_id"]})
            if company:
                await update_company_inventory(
                    company_id=order["to_company_id"],
                    company_name=order.get("to_company_name") or company.get("name", ""),
                    product_id=data.product_id or "",
                    product_name=data.product_name or "",
                    product_code=data.product_code or "",
                    quantity_change=data.net_weight_mt or data.quantity_mt,
                    is_incoming=True
                )

    if data.lifting_type == "Secondary" and data.loading_point_type == "Depot":
        inventory = await db.depot_inventory.find_one({
                "depot_id": data.loading_point_id,
                "product_id": data.product_id
            })

        available = inventory.get("available_quantity", 0) if inventory else 0

        if data.quantity_mt > available:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock in depot ({available} MT available)"
            )

        po = await db.purchase_orders.find_one({"id": data.purchase_order_id})

        if not po:
            raise HTTPException(404, "Purchase Order not found")

        if po["remaining_quantity_mt"] < data.quantity_mt:
            raise HTTPException(400, "PO quantity exceeded")

        # Validate PO product & depot
        if po["product_id"] != data.product_id:
            raise HTTPException(400, "PO product mismatch")

        if po["depot_id"] != data.loading_point_id:
            raise HTTPException(400, "PO depot mismatch")

        # Update PO
        new_dispatched = float(po.get("dispatched_quantity_mt") or 0) + float(data.quantity_mt or 0)
        
        new_remaining = float(po.get("remaining_quantity_mt") or 0) - float(data.quantity_mt or 0)

        # ====================================
        # STATUS LOGIC
        # ====================================
        if po.get("status") == "Completed":

            new_status = "Completed"

        elif new_dispatched <= 0:

            new_status = "Open"

        else:

            new_status = "In Progress"

        if not data.pickup_id:
            await db.purchase_orders.update_one(
                {"id": po["id"]},
                {
                    "$inc": {
                        "dispatched_quantity_mt": data.quantity_mt,
                        "remaining_quantity_mt": -data.quantity_mt
                    },
                    "$set": {
                        "status": new_status
                    }
                }
            )
    
    if data.lifting_type == "Secondary" and data.loading_point_type == "Company":
        company_inv = await db.company_inventory.find_one({
            "company_id": data.loading_point_id,
            "product_id": data.product_id
        })

        available = company_inv.get("available_quantity", 0) if company_inv else 0

        if data.quantity_mt > available:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock in company ({available} MT available)"
            )

        po = await db.purchase_orders.find_one({"id": data.purchase_order_id})

        if not po:
            raise HTTPException(404, "Purchase Order not found")

        if po["remaining_quantity_mt"] < data.quantity_mt:
            raise HTTPException(400, "PO quantity exceeded")

        if po["product_id"] != data.product_id:
            raise HTTPException(400, "PO product mismatch")

        if po["depot_id"] != data.loading_point_id:
            raise HTTPException(400, "PO company mismatch")

        new_dispatched = float(po.get("dispatched_quantity_mt") or 0) + float(data.quantity_mt or 0)
        new_remaining = float(po.get("remaining_quantity_mt") or 0) - float(data.quantity_mt or 0)

        if po.get("status") == "Completed":
            new_status = "Completed"
        elif new_dispatched <= 0:
            new_status = "Open"
        else:
            new_status = "In Progress"

        if not data.pickup_id:
            await db.purchase_orders.update_one(
                {"id": po["id"]},
                {
                    "$inc": {
                        "dispatched_quantity_mt": data.quantity_mt,
                        "remaining_quantity_mt": -data.quantity_mt
                    },
                    "$set": {
                        "status": new_status
                    }
                }
            )
        
        company = await db.companies.find_one({"id": data.loading_point_id})
        if company:
            await update_company_inventory(
                company_id=data.loading_point_id,
                company_name=data.loading_point_name or company.get("name", ""),
                product_id=data.product_id or "",
                product_name=data.product_name or "",
                product_code=data.product_code or "",
                quantity_change=data.net_weight_mt or data.quantity_mt,
                is_incoming=False
            )
    
    if company_id:
        lifting_data["company_id"] = company_id

    await validate_vehicle_assignment_for_date(
        vehicle_id=data.vehicle_id,
        vehicle_number=data.vehicle_number,
        date_of_loading=data.date_of_loading,
        lifting_type=data.lifting_type,
        company_id=company_id
    )

    lifting = Lifting(
        **lifting_data,
        lifting_no=lifting_no,
        loaded_by=current_user["id"],
        loaded_by_name=current_user["name"]
    )
    
    await db.liftings.insert_one(lifting.model_dump())
    
    # Auto-add driver to truck's drivers list if new
    if data.vehicle_id and data.driver_name:
        truck = await db.trucks.find_one({"id": data.vehicle_id})
        if truck:
            drivers = truck.get('drivers', [])
            driver_exists = any(
                d['name'] == data.driver_name and d.get('mobile', '') == (data.driver_mobile or '')
                for d in drivers
            )
            if not driver_exists:
                drivers.append({
                    'name': data.driver_name,
                    'mobile': data.driver_mobile or '',
                    'is_primary': False
                })
                await db.trucks.update_one(
                    {"id": data.vehicle_id},
                    {"$set": {'drivers': drivers}}
                )
    
    if data.lifting_type == "Primary" and data.delivery_order_id:
        order = await db.delivery_orders.find_one({"id": data.delivery_order_id})
        if order:
            new_lifted = order.get("lifted_quantity_mt", 0) + data.quantity_mt
            new_remaining = order.get("total_quantity_mt", 0) - new_lifted
            new_status = "Completed" if new_lifted >= order.get("total_quantity_mt", 0) else "In Progress"

            await db.delivery_orders.update_one(
                {"id": data.delivery_order_id},
                {"$set": {
                    "lifted_quantity_mt": new_lifted,
                    "remaining_quantity_mt": max(0, new_remaining),
                    "status": new_status
                }}
            )

    if data.lifting_type == "Secondary" and data.loading_point_type == "Depot" and data.loading_point_id:
        depot = await db.depots.find_one({"id": data.loading_point_id})
        if depot:
            await update_depot_inventory(
                depot_id=data.loading_point_id,
                depot_name=data.loading_point_name or depot.get("name", ""),
                product_id=data.product_id or "",
                product_name=data.product_name or "",
                product_code=data.product_code or "",
                quantity_change=data.net_weight_mt or data.quantity_mt,
                is_incoming=False,
                company_id=company_id
            )
    
    if data.lifting_type == "Secondary" and data.loading_point_type == "Company" and data.loading_point_id:
        company = await db.companies.find_one({"id": data.loading_point_id})
        if company:
            await update_company_inventory(
                company_id=data.loading_point_id,
                company_name=data.loading_point_name or company.get("name", ""),
                product_id=data.product_id or "",
                product_name=data.product_name or "",
                product_code=data.product_code or "",
                quantity_change=data.net_weight_mt or data.quantity_mt,
                is_incoming=False
            )
    
    return lifting

@router.get("/liftings", response_model=List[Lifting])
async def get_liftings(
    lifting_type: Optional[str] = None,
    delivery_order_id: Optional[str] = None,
    unloading_status: Optional[str] = None,
    unloading_point_id: Optional[str] = None,
    # New filters
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    product_id: Optional[str] = None,
    vehicle_id: Optional[str] = None,
    transporter_name: Optional[str] = None,
    loading_point_id: Optional[str] = None,
    # Pagination
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(100, ge=10, le=500, description="Items per page"),
    current_user: dict = Depends(get_current_user)
):
    # Start with product-based filter
    query = await build_product_filter(current_user, "product_id")
    
    if lifting_type:
        query["lifting_type"] = lifting_type
    if delivery_order_id:
        query["delivery_order_id"] = delivery_order_id
    if unloading_status:
        query["unloading_status"] = unloading_status
    if unloading_point_id:
        query["unloading_point_id"] = unloading_point_id
    if product_id:
        query["product_id"] = product_id
    if vehicle_id:
        query["vehicle_id"] = vehicle_id
    if transporter_name:
        query["transporter_name"] = {"$regex": transporter_name, "$options": "i"}
    if loading_point_id:
        query["loading_point_id"] = loading_point_id
    
    # Date range filter
    if date_from or date_to:
        date_query = {}
        if date_from:
            date_query["$gte"] = date_from
        if date_to:
            date_query["$lte"] = date_to
        if date_query:
            query["date_of_loading"] = date_query
    
    # Calculate pagination
    skip = (page - 1) * page_size
    
    # Return paginated results sorted by creation time (newest first)
    return await db.liftings.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(page_size).to_list(page_size)

@router.get("/liftings/{lifting_id}", response_model=Lifting)
async def get_lifting(lifting_id: str, current_user: dict = Depends(get_current_user)):
    lifting = await db.liftings.find_one({"id": lifting_id}, {"_id": 0})
    if not lifting:
        raise HTTPException(status_code=404, detail="Lifting not found")
    return lifting

@router.put("/liftings/{lifting_id}/verify")
async def verify_lifting_unload(
    lifting_id: str,
    data: VerifyUnloadRequest,
    current_user: dict = Depends(get_current_user)
):
    # Check permission for verification
    await check_permission(current_user, "Verification (Unloading)")
    
    lifting = await db.liftings.find_one({"id": lifting_id})
    if not lifting:
        raise HTTPException(status_code=404, detail="Lifting not found")

    if lifting.get("unloading_status") != "Pending":
        raise HTTPException(
            status_code=400,
            detail="Only pending liftings can be verified"
        )
    # Auto-create truck if not exists
    if not lifting.get("vehicle_id") and lifting.get("vehicle_number"):
        vehicle_number = lifting["vehicle_number"].strip().upper()

        existing_truck = await db.trucks.find_one({
            "vehicle_number": vehicle_number
        })

        if not existing_truck:
            from models import Truck

            new_truck = Truck(
                vehicle_number=lifting["vehicle_number"],
                transporter_name=lifting.get("transporter_name"),
                driver_name=lifting.get("driver_name"),
                driver_mobile=lifting.get("driver_mobile"),
                helper_name=lifting.get("helper_name"),
                helper_mobile=lifting.get("helper_mobile"),
                tare_weight_mt=lifting.get("tare_weight_mt"),
            )

            await db.trucks.insert_one(new_truck.model_dump())
            vehicle_id = new_truck.id
        else:
            vehicle_id = existing_truck["id"]

        # Update lifting with vehicle_id
        await db.liftings.update_one(
            {"id": lifting_id},
            {"$set": {
                "vehicle_id": vehicle_id,
                "vehicle_number": vehicle_number
            }}
        )

    await db.liftings.update_one(
        {"id": lifting_id},
        {"$set": {
            "unloading_status": "Verified",
            "date_of_unloading": data.date_of_unloading,
            "time_of_unloading": data.time_of_unloading,
            "verified_by": current_user["id"],
            "verified_by_name": current_user["name"],
            "verified_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update DO status if this is a Primary lifting
    if lifting.get("lifting_type") == "Primary" and lifting.get("delivery_order_id"):
        do = await db.delivery_orders.find_one({"id": lifting["delivery_order_id"]})
        if do:
            # Get all liftings for this DO
            do_liftings = await db.liftings.find(
                {"delivery_order_id": lifting["delivery_order_id"]},
                {"unloading_status": 1}
            ).to_list(1000)
            
            # Check if all liftings are verified
            all_verified = all(l.get("unloading_status") == "Verified" for l in do_liftings)
            
            if all_verified and do.get("remaining_quantity_mt", 0) <= 0:
                await db.delivery_orders.update_one(
                    {"id": lifting["delivery_order_id"]},
                    {"$set": {"status": "Completed"}}
                )
    
    # Update depot inventory if unloading to depot
    if lifting.get("unloading_point_type") == "Depot" and lifting.get("unloading_point_id"):
        depot = await db.depots.find_one({"id": lifting["unloading_point_id"]})
        if depot:
            await update_depot_inventory(
                depot_id=lifting["unloading_point_id"],
                depot_name=lifting.get("unloading_point_name") or depot.get("name", ""),
                product_id=lifting.get("product_id") or "",
                product_name=lifting.get("product_name") or "",
                product_code=lifting.get("product_code") or "",
                quantity_change=(
                    lifting.get("net_weight_mt")
                    or lifting.get("quantity_mt", 0)
                ),
                is_incoming=True,
                company_id=lifting.get("company_id")
            )

#        await db.depot_inventory.update_one(
#            {
#                "depot_id": lifting.loading_point_id,
#                "product_id": lifting.product_id
#            },
#            {
#                "$inc": {
#                    "total_dispatched": lifting.net_weight_mt,
#                    "available_quantity": -lifting.net_weight_mt
#                }
#            }
#        )
    
    # Mark company as "Client" if lifting is to a company
    if lifting.get("unloading_point_type") == "Company" and lifting.get("unloading_point_id"):
        await db.companies.update_one(
            {"id": lifting["unloading_point_id"]},
            {"$set": {"is_client": True}}
        )
    
    return {"message": "Lifting verified successfully"}
    
    
@router.put("/liftings/{lifting_id}/reject")
async def reject_lifting_unload(
    lifting_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_user)
):
        # Same permission as verify
        await check_permission(current_user, "Verification (Unloading)")

        reason = payload.get("reason")
        if not reason or not reason.strip():
            raise HTTPException(
                status_code=400,
                detail="Rejection reason is required"
            )

        lifting = await db.liftings.find_one({"id": lifting_id})
        if not lifting:
            raise HTTPException(status_code=404, detail="Lifting not found")

        if lifting.get("pickup_id"):
            raise HTTPException(
                status_code=400,
                detail="Liftings created from Final Verified pickups cannot be rejected."
            )

        if lifting.get("unloading_status") != "Pending":
            raise HTTPException(
                status_code=400,
                detail="Only pending liftings can be rejected"
            )

        if lifting.get("lifting_type") == "Primary" and lifting.get("delivery_order_id"):
            order = await db.delivery_orders.find_one({"id": lifting["delivery_order_id"]})

            if order:
                rejected_qty = (
                    lifting.get("net_weight_mt")
                    or lifting.get("quantity_mt", 0)
                )

                new_lifted = max(0, order.get("lifted_quantity_mt", 0) - rejected_qty)
                new_remaining = order.get("total_quantity_mt", 0) - new_lifted

                # Recalculate status
                if new_lifted == 0:
                    new_status = "Pending"
                elif new_remaining <= 0:
                    new_status = "Completed"
                else:
                    new_status = "In Progress"

                await db.delivery_orders.update_one(
                    {"id": lifting["delivery_order_id"]},
                    {"$set": {
                        "lifted_quantity_mt": new_lifted,
                        "remaining_quantity_mt": max(0, new_remaining),
                        "status": new_status
                    }}
                )

        # 🔥 Restore PO for Secondary lifting
        if (
            lifting.get("lifting_type") == "Secondary"
            and lifting.get("purchase_order_id")
            and not lifting.get("pickup_id")
        ):
            po = await db.purchase_orders.find_one({"id": lifting["purchase_order_id"]})

            if po:
                rejected_qty = lifting.get("quantity_mt", 0)

                new_dispatched = max(
                    0,
                    float(po.get("dispatched_quantity_mt") or 0)
                    - float(rejected_qty or 0)
                )

                new_remaining = (
                    float(po.get("remaining_quantity_mt") or 0)
                    + float(rejected_qty or 0)
                )

                # ====================================
                # STATUS
                # ====================================
                if po.get("status") == "Completed":

                    new_status = "Completed"

                elif new_dispatched <= 0:

                    new_status = "Open"

                else:

                    new_status = "In Progress"

                await db.purchase_orders.update_one(
                    {"id": po["id"]},
                    {
                        "$set": {
                            "dispatched_quantity_mt": new_dispatched,

                            "remaining_quantity_mt": new_remaining,

                            "status":
                                new_status
                        }
                    }
                )

        # Reverse depot inventory for Secondary liftings (stock returned to depot)
        if lifting.get("lifting_type") == "Secondary" and lifting.get("loading_point_type") == "Depot" and lifting.get("loading_point_id") and lifting.get("product_id"):
            rejected_qty = lifting.get("net_weight_mt") or lifting.get("quantity_mt", 0)
            await db.depot_inventory.update_one(
                {"depot_id": lifting["loading_point_id"], "product_id": lifting["product_id"]},
                {"$inc": {
                    "total_dispatched": -rejected_qty,
                    "available_quantity": rejected_qty
                }}
            )

        # Reverse depot inventory for Primary liftings to Depot (rejected before verification)
        # Note: Primary liftings to Depot haven't been verified yet, so depot inventory
        # was never updated. This block is removed as it was incorrectly adding to dispatched.
        if lifting.get("lifting_type") == "Primary" and lifting.get("unloading_point_type") == "Depot" and lifting.get("unloading_point_id"):
            pass

        # Reverse company inventory for Secondary liftings from Company
        if lifting.get("lifting_type") == "Secondary" and lifting.get("loading_point_type") == "Company" and lifting.get("loading_point_id") and lifting.get("product_id"):
            rejected_qty = lifting.get("net_weight_mt") or lifting.get("quantity_mt", 0)
            await db.company_inventory.update_one(
                {"company_id": lifting["loading_point_id"], "product_id": lifting["product_id"]},
                {"$inc": {
                    "total_dispatched": -rejected_qty,
                    "available_quantity": rejected_qty
                }}
            )

        await db.liftings.update_one(
            {"id": lifting_id},
            {"$set": {
                "unloading_status": "Rejected",
                "rejected_by": current_user["id"],
                "rejected_by_name": current_user["name"],
                "rejected_at": datetime.now(timezone.utc).isoformat(),
                "rejection_reason": reason
            }}
        )

        return {"message": "Lifting rejected successfully"}

@router.put("/liftings/{lifting_id}", response_model=Lifting)
async def update_lifting(
    lifting_id: str,
    data: LiftingCreate,
    current_user: dict = Depends(get_current_user)
):
    await check_permission(current_user, "Liftings (Update)")

    # only Admin / Weightment / Depot Supervisor
    allowed_roles = ["Admin", "Management", "Weightment", "Depot Supervisor"]

    if current_user.get("role") not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to edit liftings"
        )

    lifting = await db.liftings.find_one({"id": lifting_id})

    if not lifting:
        raise HTTPException(
            status_code=404,
            detail="Lifting not found"
        )
    if lifting.get("pickup_id"):
        raise HTTPException(
            status_code=400,
            detail="Liftings created from Final Verified pickups cannot be edited."
        )

    # 🔒 Don't allow editing verified/rejected
    # 🔒 Rejected can never be edited
    if lifting.get("unloading_status") == "Rejected":
        raise HTTPException(
            status_code=400,
            detail="Rejected liftings cannot be edited"
        )

    # ✅ Verified liftings:
    # only weight slip/files can be updated
    if lifting.get("unloading_status") == "Verified":

        existing_weight_slip = lifting.get("weight_slip")

        update_data = data.model_dump()

        allowed_update = (
            update_data.get("weight_slip") != existing_weight_slip
        )

        if not allowed_update:
            raise HTTPException(
                status_code=400,
                detail="Only files can be updated for verified liftings"
            )

        await db.liftings.update_one(
            {"id": lifting_id},
            {
                "$set": {
                    "weight_slip": update_data.get("weight_slip")
                }
            }
        )

        updated = await db.liftings.find_one(
            {"id": lifting_id},
            {"_id": 0}
        )

        return updated

    update_data = data.model_dump()

    await validate_vehicle_assignment_for_date(
        vehicle_id=data.vehicle_id,
        vehicle_number=data.vehicle_number,
        date_of_loading=data.date_of_loading,
        lifting_type=data.lifting_type,
        exclude_lifting_id=lifting_id,
        company_id=lifting.get("company_id")
    )

    # preserve immutable fields
    update_data["lifting_no"] = lifting.get("lifting_no")
    update_data["created_at"] = lifting.get("created_at")
    update_data["loaded_by"] = lifting.get("loaded_by")
    update_data["loaded_by_name"] = lifting.get("loaded_by_name")
    update_data["company_id"] = lifting.get("company_id")

    await db.liftings.update_one(
        {"id": lifting_id},
        {"$set": update_data}
    )

    updated = await db.liftings.find_one(
        {"id": lifting_id},
        {"_id": 0}
    )

    return updated


@router.delete("/liftings/{lifting_id}")
async def delete_lifting(
    lifting_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Must have delete permission
    await check_permission(current_user, "Liftings (Delete)")

    # Only Management are allowed to delete liftings
    if current_user.get("role") != "Management":
        raise HTTPException(
            status_code=403,
            detail="Only Management users can delete liftings"
        )

    query = {"id": lifting_id}
    if not current_user.get("is_master_admin"):
        query["company_id"] = current_user["company_id"]

    lifting = await db.liftings.find_one(query)
    if lifting.get("pickup_id"):
        raise HTTPException(
            status_code=400,
            detail="Liftings created from Final Verified pickups cannot be deleted."
        )
    if not lifting:
        raise HTTPException(status_code=404, detail="Lifting not found")

    # 🔒 Critical rule: only Rejected liftings can be deleted
    if lifting.get("unloading_status") != "Rejected":
        raise HTTPException(
            status_code=400,
            detail="Only rejected liftings can be deleted"
        )

    await db.liftings.delete_one({"id": lifting_id})

    return {"message": "Rejected lifting deleted successfully"}


