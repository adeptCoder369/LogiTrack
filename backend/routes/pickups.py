"""Pickup routes"""

from fastapi import APIRouter, HTTPException, Depends, Query, Body
from typing import List, Optional
from datetime import datetime, timezone
import uuid
from pydantic import BaseModel

from .db_compat import db
from auth_utils import get_current_user, check_permission, get_user_depot_ids, build_transporter_filter, ensure_transporter_access, build_source_exclusion_filter_async
from models import Pickup, PickupCreate, Lifting

# reuse inventory logic from liftings
from routes.liftings import update_depot_inventory, update_company_inventory

router = APIRouter(tags=["Pickups"])


# ================================
# PYDANTIC MODELS
# ================================
class TareSlipUpload(BaseModel):
    tare_slip_file_id: str


# ================================
# CREATE PICKUP (SCHEDULE)
# ================================
@router.post("/pickups", response_model=Pickup)
async def create_pickup(
    data: PickupCreate,
    current_user: dict = Depends(get_current_user)
):
    await check_permission(current_user, "Schedule Pickup")

    pickup_data = data.model_dump()
    pickup_data["company_name"] = (
        data.company_name.strip()
        if data.company_name else None
    )

    pickup_data["estimated_weight_mt"] = (
        float(data.estimated_weight_mt or 0)
    )
    # Optional driver phone validation
    if data.driver_phone:
        clean_phone = ''.join(filter(str.isdigit, data.driver_phone))

        if len(clean_phone) != 10:
            raise HTTPException(
                status_code=400,
                detail="Driver phone must be exactly 10 digits"
            )

        pickup_data["driver_phone"] = clean_phone

    company_id = current_user.get("company_id")
    pickup_data["company_id"] = company_id

    if current_user.get("role") == "Transporter":
        transporter_id = current_user.get("transporter_id")
        if not transporter_id:
            raise HTTPException(status_code=403, detail="Transporter access is not configured")

        pickup_data["transporter_id"] = transporter_id
        pickup_data["transporter_name"] = current_user.get("transporter_name") or data.transporter_name
    else:
        pickup_data["transporter_id"] = data.transporter_id
        pickup_data["transporter_name"] = data.transporter_name

    # ====================================
    # 🚛 TRUCK AUTO-CREATION (IMPORTANT)
    # ====================================
    truck_id = None

    if data.truck_number:
        vehicle_number = data.truck_number.strip().upper()

        existing_truck = await db.trucks.find_one({
            "vehicle_number": vehicle_number
        })

        if not existing_truck:
            from models import Truck

            new_truck = Truck(
                vehicle_number=vehicle_number,
                transporter_id=data.transporter_id,
                transporter_name=data.transporter_name,
                driver_mobile=data.driver_phone,   # 🔥 IMPORTANT
                drivers=[{
                    "name": "",
                    "mobile": data.driver_phone or "",
                    "is_primary": True
                }] if data.driver_phone else []
            )

            await db.trucks.insert_one(new_truck.model_dump())
            truck_id = new_truck.id

        else:
            truck_id = existing_truck["id"]

            # 🔥 OPTIONAL: Update driver if new
            if data.driver_phone:
                drivers = existing_truck.get("drivers", [])

                exists = any(d.get("mobile") == data.driver_phone for d in drivers)

                if not exists:
                    drivers.append({
                        "name": "",
                        "mobile": data.driver_phone,
                        "is_primary": False
                    })

                    await db.trucks.update_one(
                        {"id": existing_truck["id"]},
                        {"$set": {"drivers": drivers}}
                    )

    # attach truck reference
    pickup_data["truck_id"] = truck_id
    pickup_data["truck_number"] = data.truck_number.upper()

    existing = await db.pickups.find_one({
        "date": data.date,
        "truck_number": data.truck_number.strip().upper(),
        "company_id": current_user.get("company_id"),
        "status": {"$ne": "rescheduled"}  # ignore old rescheduled entries
    })

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Truck {data.truck_number.upper()} is already scheduled for {data.date}"
        )

    # ====================================
    # CREATE PICKUP
    # ====================================
    pickup = Pickup(**pickup_data)

    await db.pickups.insert_one(pickup.model_dump())

    return pickup


# ================================
# GET PICKUPS (BY DATE)
# ================================
@router.get("/pickups", response_model=List[Pickup])
async def get_pickups(
    date: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: Optional[str] = None,
    source_id: Optional[str] = None,
    source_type: Optional[str] = None,
    truck_number: Optional[str] = None,
    transporter_name: Optional[str] = None,
    driver_mobile: Optional[str] = None,
    company_name: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=10, le=500),
    current_user: dict = Depends(get_current_user)
):
    await check_permission(current_user, "Pickups (View)")

    query = {
        "company_id": current_user.get("company_id")
    }

    if current_user.get("role") == "Transporter":
        transporter_filter = build_transporter_filter(current_user, "transporter_id")
        if transporter_filter:
            query.update(transporter_filter)

    # restrict to user's assigned depots (source_type = "Depot")
    depot_ids = await get_user_depot_ids(current_user)
    if depot_ids is not None:
        query["$or"] = [
            {"source_type": "Depot", "source_id": {"$in": depot_ids}},
            {"source_type": {"$ne": "Depot"}}
        ]

    # source_products restriction: hide pickups whose source is mapped but
    # carries no product the user can access.
    source_filter = await build_source_exclusion_filter_async(current_user, "source_id")
    query.update(source_filter)

    # single date mode
    if date:
        query["date"] = date

    # range mode
    if start_date or end_date:
        query["date"] = {}

        if start_date:
            query["date"]["$gte"] = start_date

        if end_date:
            query["date"]["$lte"] = end_date

    if status:
        statuses = [s.strip() for s in status.split(",")]
        if len(statuses) == 1:
            query["status"] = statuses[0]
        else:
            query["status"] = {"$in": statuses}

    if source_id:
        query["source_id"] = source_id

    if source_type:
        query["source_type"] = source_type

    if truck_number:
        query["truck_number"] = {"$regex": truck_number, "$options": "i"}

    if transporter_name:
        query["transporter_name"] = {"$regex": transporter_name, "$options": "i"}

    if driver_mobile:
        query["driver_phone"] = {"$regex": driver_mobile}

    if company_name:
        query["company_name"] = {"$regex": company_name, "$options": "i"}

    skip = (page - 1) * page_size

    return await db.pickups.find(query, {"_id": 0}) \
        .sort("date", 1) \
        .skip(skip) \
        .limit(page_size) \
        .to_list(page_size)

# ================================
# UPDATE TRANSPORTER (BEFORE VERIFY)
# ================================
@router.put("/pickups/{pickup_id}/transporter")
async def update_pickup_transporter(
    pickup_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_user)
):
    await check_permission(current_user, "Verify Pickup")

    transporter_id = payload.get("transporter_id")
    transporter_name = payload.get("transporter_name")

    if not transporter_name:
        raise HTTPException(
            status_code=400,
            detail="Transporter name is required"
        )

    pickup = await db.pickups.find_one({"id": pickup_id})

    if not pickup:
        raise HTTPException(404, "Pickup not found")

    # only loaded / weightment_done pickups editable
    if pickup.get("status") not in ("loaded", "weightment_done", "final_verified"):
        raise HTTPException(
            status_code=400,
            detail="Only loaded, weightment_done, or final_verified pickups can be updated"
        )

    await db.pickups.update_one(
        {"id": pickup_id},
        {"$set": {
            "transporter_id": transporter_id,
            "transporter_name": transporter_name
        }}
    )

    return {
        "message": "Transporter updated successfully"
    }

# ================================
# UPDATE COMPANY (BEFORE VERIFY)
# ================================
@router.put("/pickups/{pickup_id}/company")
async def update_pickup_company(
    pickup_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_user)
):
    await check_permission(current_user, "Verify Pickup")

    company_name = payload.get("company_name")

    if not company_name:
        raise HTTPException(
            status_code=400,
            detail="Company name is required"
        )

    pickup = await db.pickups.find_one({"id": pickup_id})

    if not pickup:
        raise HTTPException(404, "Pickup not found")

    # only loaded / weightment_done pickups editable
    if pickup.get("status") not in ("loaded", "weightment_done", "final_verified"):
        raise HTTPException(
            status_code=400,
            detail="Only loaded, weightment_done, or final_verified pickups can be updated"
        )

    await db.pickups.update_one(
        {"id": pickup_id},
        {"$set": {
            "company_name": company_name
        }}
    )

    return {
        "message": "Company updated successfully"
    }

# ================================
# UPDATE STATUS (LOADER)
# ================================
@router.put("/pickups/{pickup_id}/status")
async def update_pickup_status(
    pickup_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_user)
):
    await check_permission(current_user, "Pickup (Execution)")

    status = payload.get("status")

    allowed = ["loading_started", "loaded"]
    if status not in allowed:
        raise HTTPException(400, "Invalid status")

    pickup = await db.pickups.find_one({"id": pickup_id})
    if not pickup:
        raise HTTPException(404, "Pickup not found")

    now = datetime.now(timezone.utc).isoformat()

    update_data = {"status": status}

    if status == "loading_started":
        update_data["loading_start_time"] = now

    if status == "loaded":
        update_data["loading_end_time"] = now

    await db.pickups.update_one(
        {"id": pickup_id},
        {"$set": update_data}
    )

    return {"message": "Status updated successfully"}


# ================================
# TARE SLIP UPLOAD
# ================================
@router.put("/pickups/{pickup_id}/tare-slip")
async def upload_tare_slip(
    pickup_id: str,
    payload: TareSlipUpload,
    current_user: dict = Depends(get_current_user)
):
    await check_permission(current_user, "Pickup (Execution)")

    file_id = payload.tare_slip_file_id
    if not file_id:
        raise HTTPException(400, "Tare slip file is required")

    pickup = await db.pickups.find_one({"id": pickup_id})
    if not pickup:
        raise HTTPException(404, "Pickup not found")

    if pickup.get("status") in ["verified", "rescheduled", "rejected"]:
        raise HTTPException(400, "Cannot upload tare slip for this pickup")

    now = datetime.now(timezone.utc).isoformat()
    old_file = pickup.get("tare_slip_file_id")

    update = {
        "$set": {
            "tare_slip_file_id": file_id
        }
    }

    if old_file and old_file != file_id:
        update["$push"] = {
            "tare_slip_upload_history": {
                "file_id": old_file,
                "uploaded_by": current_user.get("id"),
                "uploaded_by_name": current_user.get("name"),
                "uploaded_at": now
            }
        }
    
    await db.pickups.update_one(
        {"id": pickup_id},
        update
    )

    return {"message": "Tare slip uploaded successfully"}


# ================================
# WEIGHTMENT SLIP UPLOAD
# ================================
class WeightmentSlipUpload(BaseModel):
    weightment_slip_file_id: str


@router.put("/pickups/{pickup_id}/weightment-slip")
async def upload_weightment_slip(
    pickup_id: str,
    payload: WeightmentSlipUpload,
    current_user: dict = Depends(get_current_user)
):
    await check_permission(current_user, "Verify Pickup")

    file_id = payload.weightment_slip_file_id
    if not file_id:
        raise HTTPException(400, "Weightment slip file is required")

    pickup = await db.pickups.find_one({"id": pickup_id})
    if not pickup:
        raise HTTPException(404, "Pickup not found")

    if pickup.get("status") in ["verified", "rescheduled", "rejected", "final_verified"]:
        raise HTTPException(400, "Cannot upload weightment slip for this pickup")

    now = datetime.now(timezone.utc).isoformat()
    old_file = pickup.get("weightment_slip_file_id")

    update = {
        "$set": {
            "weightment_slip_file_id": file_id
        }
    }

    if old_file and old_file != file_id:
        update["$push"] = {
            "weightment_slip_upload_history": {
                "file_id": old_file,
                "uploaded_by": current_user.get("id"),
                "uploaded_by_name": current_user.get("name"),
                "uploaded_at": now
            }
        }
    
    await db.pickups.update_one(
        {"id": pickup_id},
         update
    )

    return {"message": "Weightment slip uploaded successfully"}


# ================================
# RESCHEDULE PICKUP
# ================================
@router.put("/pickups/{pickup_id}/reschedule")
async def reschedule_pickup(
    pickup_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_user)
):
    await check_permission(current_user, "Pickup (Execution)")

    new_date = payload.get("new_date")
    reason = payload.get("reason")

    if not new_date:
        raise HTTPException(400, "New date is required")

    if not reason or len(reason.strip()) < 10:
        raise HTTPException(400, "Reason must be at least 10 characters")

    pickup = await db.pickups.find_one({"id": pickup_id})
    if not pickup:
        raise HTTPException(404, "Pickup not found")

    # ─────────────────────────────────────────────────────────
    # SELF-HEAL: backfill reschedule_group_id for legacy chains
    # This runs once per chain — the first time any legacy
    # pickup in that chain gets rescheduled again.
    # ─────────────────────────────────────────────────────────
    if not pickup.get("reschedule_group_id") and (pickup.get("reschedule_count", 0) > 0 or pickup.get("original_schedule_date")):
        root_date = pickup.get("original_schedule_date") or pickup.get("date")

        chain_query = {
            "company_id": pickup.get("company_id"),
            "truck_number": pickup.get("truck_number"),
            "$or": [
                {"date": root_date},
                {"original_schedule_date": root_date}
            ]
        }

        chain_entries = await db.pickups.find(chain_query, {"_id": 0, "reschedule_count": 1}).to_list(None)

        if chain_entries:
            group_id = str(uuid.uuid4())
            max_count = max((e.get("reschedule_count") or 0) for e in chain_entries)

            await db.pickups.update_many(
                chain_query,
                {"$set": {
                    "reschedule_group_id": group_id,
                    "reschedule_count": max_count
                }}
            )

            # Re-read pickup so we use the freshly backfilled values
            pickup = await db.pickups.find_one({"id": pickup_id})

    # preserve original schedule date for the old record
    original_schedule_date = pickup.get("original_schedule_date") or pickup.get("date")

    # generate or reuse reschedule group ID
    reschedule_group_id = pickup.get("reschedule_group_id") or str(uuid.uuid4())
    new_reschedule_count = (pickup.get("reschedule_count") or 0) + 1

    # update the full chain so every member shows the current count
    chain_query = {
        "company_id": pickup.get("company_id"),
        "truck_number": pickup.get("truck_number"),
        "$or": [
            {"reschedule_group_id": reschedule_group_id},
            {"date": original_schedule_date},
            {"original_schedule_date": original_schedule_date}
        ]
    }

    await db.pickups.update_many(
        chain_query,
        {"$set": {
            "reschedule_group_id": reschedule_group_id,
            "reschedule_count": new_reschedule_count
        }}
    )

    # mark old
    await db.pickups.update_one(
        {"id": pickup_id},
        {"$set": {
            "status": "rescheduled",
            "rescheduled_to": new_date,
            "reschedule_reason": reason.strip(),
            "original_schedule_date": original_schedule_date,
            "reschedule_count": new_reschedule_count,
            "reschedule_group_id": reschedule_group_id
        }}
    )

    # create new entry
    new_pickup = pickup.copy()

    # preserve original schedule date, count, and group
    new_pickup["original_schedule_date"] = original_schedule_date
    new_pickup["reschedule_count"] = new_reschedule_count
    new_pickup["reschedule_group_id"] = reschedule_group_id

    # 🔥 REMOVE Mongo internal ID
    new_pickup.pop("_id", None)

    # ✅ NEW APP ID
    new_pickup["id"] = str(uuid.uuid4())

    # ✅ RESET FIELDS
    new_pickup["date"] = new_date
    new_pickup["status"] = "scheduled"
    new_pickup["created_at"] = datetime.now(timezone.utc).isoformat()

    # 🔥 CLEAR EXECUTION DATA (VERY IMPORTANT)
    new_pickup["loading_start_time"] = None
    new_pickup["loading_end_time"] = None
    new_pickup["verified_at"] = None
    new_pickup["verified_by"] = None
    new_pickup["verified_by_name"] = None
    new_pickup["weight_mt"] = None
    new_pickup["weight_slips"] = []

    # OPTIONAL: reset PO linkage
    new_pickup["purchase_order_id"] = None
    new_pickup["purchase_order_no"] = None

    await db.pickups.insert_one(new_pickup)

    return {"message": "Pickup rescheduled successfully"}


# ================================
# VERIFY PICKUP (DEPOT SUPERVISOR)
# ================================
@router.put("/pickups/{pickup_id}/verify")
async def verify_pickup(
    pickup_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_user)
):

    
    await check_permission(current_user, "Verify Pickup")

    purchase_order_id = payload.get("purchase_order_id")
    purchase_order_no = payload.get("purchase_order_no")

    if not purchase_order_id:
        raise HTTPException(400, "Purchase Order is required")

    pickup = await db.pickups.find_one({"id": pickup_id})

    
    if not pickup:
        raise HTTPException(404, "Pickup not found")

    if pickup.get("status") == "verified":
        raise HTTPException(400, "Pickup already verified")

    if pickup.get("status") != "loaded":
        raise HTTPException(400, "Only loaded pickups can be verified")

    # ❌ future date validation
    today = datetime.now().date().isoformat()
    if pickup.get("date") > today:
        raise HTTPException(400, "Cannot verify future pickup")

    weight = payload.get("weight_mt")
    slips = payload.get("weight_slips", [])

    if not weight:
        raise HTTPException(400, "Weight is required")

    # ================================
    # EARLY PO FETCH FOR VALIDATION
    # ================================
    po = await db.purchase_orders.find_one({"id": purchase_order_id})
    
    if not po:
        raise HTTPException(404, "Purchase Order not found")
    
    # ================================
    now = datetime.now(timezone.utc).isoformat()

    await db.pickups.update_one(
        {"id": pickup_id},
        {"$set": {
            "status": "verified",
            "weight_mt": weight,
            "weight_slips": slips,

            "purchase_order_id": purchase_order_id,
            "purchase_order_no": purchase_order_no,
            "purchase_order_company_name": payload.get("purchase_order_company_name"),

            "product_id": payload.get("product_id"),
            "product_name": payload.get("product_name"),

            "source_id": payload.get("source_id"),
            "source_name": payload.get("source_name"),

            "verified_by": current_user["id"],
            "verified_by_name": current_user["name"],
            "verified_at": now
        }}
    )

    # ================================
    # UPDATE PURCHASE ORDER
    # ================================
    # po already fetched for validation above, reuse it here
#    if po:
#        dispatched = float(po.get("dispatched_quantity_mt") or 0)
#        total = float(po.get("total_quantity_mt") or 0)
#
#        new_dispatched = dispatched + float(weight)
#        new_remaining = total - new_dispatched
#
#        # ====================================
#        # STATUS LOGIC
#        # ====================================
#        if po.get("status") == "Completed":
#
#            # preserve manual completion
#            new_status = "Completed"
#
#        elif new_dispatched <= 0:
#
#            # nothing dispatched yet
#            new_status = "Open"
#
#        else:
#
#            # dispatch started
#            new_status = "In Progress"
#
#        await db.purchase_orders.update_one(
#            {"id": purchase_order_id},
#            {
#                "$set": {
#                    "dispatched_quantity_mt": round(new_dispatched, 2),
#                    "remaining_quantity_mt": round(new_remaining, 2),
#                    "status": new_status
#                }
#            }
#        )

    # ================================
    # VERIFIED TRUCK ENTRY CREATION MOVED TO FINAL VERIFY
    # ================================
    return {"message": "Pickup verified successfully"}

# ================================
# REJECT PICKUP
# ================================
@router.put("/pickups/{pickup_id}/reject")
async def reject_pickup(
    pickup_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_user)
):
    await check_permission(current_user, "Pickup (Execution)")

    reason = payload.get("reason")

    if not reason or len(reason.strip()) < 10:
        raise HTTPException(
            status_code=400,
            detail="Reason must be at least 10 characters"
        )

    pickup = await db.pickups.find_one({"id": pickup_id})

    if not pickup:
        raise HTTPException(404, "Pickup not found")

    if pickup.get("status") in ["verified"]:
        raise HTTPException(
            status_code=400,
            detail="Loaded or verified pickups cannot be rejected"
        )

    await db.pickups.update_one(
        {"id": pickup_id},
        {"$set": {
            "status": "rejected",
            "rejection_reason": reason.strip(),
            "rejected_at": datetime.now(timezone.utc).isoformat(),
            "rejected_by": current_user["id"],
            "rejected_by_name": current_user["name"]
        }}
    )

    return {"message": "Pickup rejected successfully"}

# ================================
# GET SINGLE PICKUP
# ================================
@router.get("/pickups/{pickup_id}", response_model=Pickup)
async def get_pickup(pickup_id: str, current_user: dict = Depends(get_current_user)):
    pickup = await db.pickups.find_one({"id": pickup_id}, {"_id": 0})

    if not pickup:
        raise HTTPException(404, "Pickup not found")

    return pickup


# ================================
# WEIGHTMENT (LOADED WEIGHT + SLIP)
# ================================
class WeightmentPayload(BaseModel):
    loaded_weight_mt: Optional[float] = None
    weightment_slip_file_id: Optional[str] = None
    tare_slip_file_id: Optional[str] = None
    status: Optional[str] = None


@router.put("/pickups/{pickup_id}/weightment")
async def save_weightment(
    pickup_id: str,
    payload: WeightmentPayload,
    current_user: dict = Depends(get_current_user)
):
    await check_permission(current_user, "Verify Pickup")

    pickup = await db.pickups.find_one({"id": pickup_id})
    if not pickup:
        raise HTTPException(404, "Pickup not found")

    if pickup.get("status") not in ("loaded", "weightment_done"):
        raise HTTPException(400, "Only loaded pickups can record weightment")

    update = {}

    if payload.loaded_weight_mt is not None:
        update["loaded_weight_mt"] = payload.loaded_weight_mt

    if payload.weightment_slip_file_id is not None:
        update["weightment_slip_file_id"] = payload.weightment_slip_file_id

    if payload.tare_slip_file_id is not None:
        update["tare_slip_file_id"] = payload.tare_slip_file_id

    if payload.status:
        update["status"] = payload.status

    if not update:
        raise HTTPException(400, "No fields to update")

    await db.pickups.update_one(
        {"id": pickup_id},
        {"$set": update}
    )

    return {"message": "Weightment saved successfully"}


# ================================
# FINAL VERIFY PICKUP
# ================================
@router.put("/pickups/{pickup_id}/final-verify")
async def final_verify_pickup(
    pickup_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_user)
):
    await check_permission(current_user, "Final Dispatch Verification")

    pickup = await db.pickups.find_one({"id": pickup_id})
    if not pickup:
        raise HTTPException(404, "Pickup not found")

    if pickup.get("status") == "final_verified":
        raise HTTPException(400, "Pickup already final verified")

    if pickup.get("status") != "weightment_done":
        raise HTTPException(400, "Only weightment done pickups can be final verified")

    now = datetime.now(timezone.utc).isoformat()

    # update pickup with PO details
    po_update = {
        "status": "final_verified",
        "final_verified_at": now,
        "final_verified_by": current_user["id"],
        "final_verified_by_name": current_user["name"]
    }

    if payload.get("purchase_order_id"):
        po_update["purchase_order_id"] = payload["purchase_order_id"]
    if payload.get("purchase_order_no"):
        po_update["purchase_order_no"] = payload["purchase_order_no"]
    if payload.get("purchase_order_company_name"):
        po_update["purchase_order_company_name"] = payload["purchase_order_company_name"]
    if payload.get("product_id"):
        po_update["product_id"] = payload["product_id"]
    if payload.get("product_name"):
        po_update["product_name"] = payload["product_name"]
    if payload.get("source_id"):
        po_update["source_id"] = payload["source_id"]
    if payload.get("source_name"):
        po_update["source_name"] = payload["source_name"]
    if payload.get("tare_slip_file_id"):
        po_update["tare_slip_file_id"] = payload["tare_slip_file_id"]
    if payload.get("weightment_slip_file_id"):
        po_update["weightment_slip_file_id"] = payload["weightment_slip_file_id"]

    await db.pickups.update_one(
        {"id": pickup_id},
        {"$set": po_update}
    )

    # ================================
    # INVENTORY DEDUCTION
    # ================================
    loaded_weight = payload.get("loaded_weight_mt") or pickup.get("loaded_weight_mt")
#    source_id = payload.get("source_id") or pickup.get("source_id")
    source_id = pickup.get("source_id")
    product_id = payload.get("product_id") or pickup.get("product_id")
#    source_name = payload.get("source_name") or pickup.get("source_name") or ""
    source_name = pickup.get("source_name")
    product_name = payload.get("product_name") or pickup.get("product_name") or ""
    
    po_id = payload.get("purchase_order_id") or pickup.get("purchase_order_id")
    po = None
    if po_id:
        po = await db.purchase_orders.find_one({"id": po_id})

    if source_id and product_id and loaded_weight:
        source_type = po.get("source_type", "Depot") if po else "Depot"
        
        if source_type == "Company":
            await update_company_inventory(
                company_id=source_id,
                company_name=source_name,
                product_id=product_id,
                product_name=product_name,
                product_code="",
                quantity_change=float(loaded_weight),
                is_incoming=False
            )
        else:
            if not source_name:
                depot = await db.depots.find_one({"id": source_id})
                source_name = depot.get("name", "") if depot else ""

            await update_depot_inventory(
                depot_id=source_id,
                depot_name=source_name,
                product_id=product_id,
                product_name=product_name,
                product_code="",
                quantity_change=float(loaded_weight),
                is_incoming=False,
                company_id=current_user.get("company_id")
            )

    # ================================
    # UPDATE VERIFIED TRUCK ENTRY
    # ================================
    verified_truck_update = {
        "company": payload.get("purchase_order_company_name") or pickup.get("purchase_order_company_name") or pickup.get("company_name") or "",
        "product": payload.get("product_name") or pickup.get("product_name") or "",
        "product_id": payload.get("product_id") or pickup.get("product_id") or "",
        "po_number": payload.get("po_number") or payload.get("purchase_order_no") or pickup.get("purchase_order_no") or "",
        "po_date": payload.get("po_date") or "",
#        "source": payload.get("source_name") or pickup.get("source_name") or "",
#        "source_id": payload.get("source_id") or pickup.get("source_id") or "",
        "source": pickup.get("source_name") or "",
        "source_id": pickup.get("source_id") or "",
        "weight": loaded_weight,
        "transporter": payload.get("transporter_name") or pickup.get("transporter_name") or "",
        "verified_by": current_user["name"],
        "final_verified_at": now,
        "tare_slip_file_id": payload.get("tare_slip_file_id") or pickup.get("tare_slip_file_id"),
        "weightment_slip_file_id": payload.get("weightment_slip_file_id") or pickup.get("weightment_slip_file_id"),
        "tare_slip_upload_history": pickup.get("tare_slip_upload_history", []),
        "weightment_slip_upload_history": pickup.get("weightment_slip_upload_history", []),
    }

    existing_vt = await db.verified_trucks.find_one({"pickup_id": pickup_id})
    if existing_vt:
        await db.verified_trucks.update_one(
            {"pickup_id": pickup_id},
            {"$set": verified_truck_update}
        )
    else:
        truck_no = pickup.get("truck_number") or pickup.get("vehicle_number") or ""
        vt_entry = {
            "id": str(uuid.uuid4()),
            "date": pickup.get("date"),
            "truck_no": truck_no,
            "transporter": verified_truck_update["transporter"],
            "driver_mobile": pickup.get("driver_mobile") or "",
            "company": verified_truck_update["company"],
            "product": verified_truck_update["product"],
            "product_id": verified_truck_update["product_id"],
            "po_number": verified_truck_update["po_number"],
            "po_date": verified_truck_update["po_date"],
            "source": verified_truck_update["source"],
            "source_id": verified_truck_update["source_id"],
            "weight": loaded_weight,
            "verified_by": current_user["name"],
            "final_verified_at": now,
            "tare_slip_file_id": payload.get("tare_slip_file_id") or pickup.get("tare_slip_file_id"),
            "weightment_slip_file_id": payload.get("weightment_slip_file_id") or pickup.get("weightment_slip_file_id"),
            "tare_slip_upload_history": pickup.get("tare_slip_upload_history", []),
            "weightment_slip_upload_history": pickup.get("weightment_slip_upload_history", []),
            "invoice_details": None,
            "invoice_added": False,
            "shipping_details": None,
            "shipping_added": False,
            "pickup_id": pickup_id,
            "created_at": now
        }
        await db.verified_trucks.insert_one(vt_entry)

    # ================================
    # UPDATE PURCHASE ORDER DISPATCHED QTY
    # ================================
    if po_id and loaded_weight and po:
        dispatched = float(po.get("dispatched_quantity_mt") or 0)
        total = float(po.get("total_quantity_mt") or 0)
        new_dispatched = dispatched + float(loaded_weight)
        new_remaining = total - new_dispatched

        new_status = po.get("status")
        if po.get("status") != "Completed":
            if new_dispatched <= 0:
                new_status = "Open"
            else:
                new_status = "In Progress"

        await db.purchase_orders.update_one(
            {"id": po_id},
            {
                "$set": {
                    "dispatched_quantity_mt": round(new_dispatched, 2),
                    "remaining_quantity_mt": round(new_remaining, 2),
                    "status": new_status
                }
            }
        )
    
    # ================================
    # CREATE SECONDARY LIFTING RECORD
    # ================================
    if po and loaded_weight:
        # Check if a lifting already exists for this pickup
        existing_lifting = await db.liftings.find_one({
            "pickup_id": pickup_id
        })
        if existing_lifting:
            # Lifting already exists, skip creation
            pass
        else:
            source_type = po.get("source_type", "Depot")
#            actual_source_id = payload.get("source_id") or pickup.get("source_id")
#            actual_source_name = payload.get("source_name") or pickup.get("source_name") or ""
            actual_source_id = pickup.get("source_id")
            actual_source_name = pickup.get("source_name")
            product_id = payload.get("product_id") or pickup.get("product_id")
            product_name = payload.get("product_name") or pickup.get("product_name") or ""
            
            # Get PO details for unloading point
            po_company_id = po.get("to_company_id")
            po_company_name = po.get("to_company_name") or pickup.get("purchase_order_company_name") or ""
            
            if source_type != "Company" and not actual_source_name:
                depot = await db.depots.find_one({"id": actual_source_id})
                actual_source_name = depot.get("name", "") if depot else ""
            
            if po_company_id and not po_company_name:
                company = await db.companies.find_one({"id": po_company_id})
                po_company_name = company.get("name", "") if company else ""
            
            # Try to get driver name from truck's drivers list
            driver_name = ""
            if pickup.get("truck_id"):
                truck = await db.trucks.find_one({"id": pickup["truck_id"]})
                if truck and truck.get("drivers"):
                    primary_driver = next((d for d in truck["drivers"] if d.get("is_primary")), None)
                    driver_name = primary_driver.get("name", "") if primary_driver else ""
            
            # Generate lifting number
            count = await db.liftings.count_documents({})
            lifting_no = f"LFT-{str(count + 1).zfill(6)}"
            
            lifting = Lifting(
                lifting_type="Secondary",
                transport_mode="Road",
                company_id=pickup.get("company_id") or current_user.get("company_id"),
                product_id=product_id,
                product_name=product_name,
                product_code=po.get("product_code") or "",
                quantity_mt=float(loaded_weight),
                loading_point_type=source_type,
                loading_point_id=actual_source_id,
                loading_point_name=actual_source_name,
                date_of_loading=pickup.get("date"),
                time_of_loading=pickup.get("loading_start_time") or "",
                vehicle_id=pickup.get("truck_id"),
                vehicle_number=pickup.get("truck_number") or "",
                transporter_name=pickup.get("transporter_name") or payload.get("transporter_name"),
                driver_name=driver_name,
                driver_mobile=pickup.get("driver_mobile") or "",
                helper_name="",
                helper_mobile="",
                tare_weight_mt=None,
                gross_weight_mt=None,
                net_weight_mt=float(loaded_weight),
                weight_slip=pickup.get("weightment_slip_file_id") or payload.get("weightment_slip_file_id") or "",
                unloading_point_type="Company",
                unloading_point_id=po_company_id,
                unloading_point_name=po_company_name,
                purchase_order_id=po.get("id"),
                purchase_order_no=po.get("po_number") or "",
                lifting_no=lifting_no,
                loaded_by=current_user["id"],
                loaded_by_name=current_user["name"],
                unloading_status="Verified",
                verified_by=current_user["id"],
                verified_by_name=current_user["name"],
                verified_at=now,
                pickup_id=pickup_id,
            )
            await db.liftings.insert_one(lifting.model_dump())
            await db.pickups.update_one(
                {"id": pickup_id},
                {
                    "$set": {
                        "lifting_id": lifting.id,
                        "lifting_no": lifting.lifting_no
                    }
                }
            )
            
            # Update destination company's inventory (goods received)
            if po_company_id:
                company = await db.companies.find_one({"id": po_company_id})
                if company:
                    await update_company_inventory(
                        company_id=po_company_id,
                        company_name=company.get("name", ""),
                        product_id=product_id,
                        product_name=product_name,
                        product_code=po.get("product_code") or "",
                        quantity_change=float(loaded_weight),
                        is_incoming=True
                    )
    
    return {"message": "Pickup final verified successfully"}