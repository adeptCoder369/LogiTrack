"""Pickup routes"""

from fastapi import APIRouter, HTTPException, Depends, Query, Body
from typing import List, Optional
from datetime import datetime, timezone
import uuid
from pydantic import BaseModel

from database import db
from auth_utils import get_current_user, check_permission
from models import Pickup, PickupCreate

# reuse inventory logic from liftings
from routes.liftings import update_depot_inventory

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
    depot_id: Optional[str] = None,
    truck_number: Optional[str] = None,
    transporter_name: Optional[str] = None,
    driver_mobile: Optional[str] = None,
    company_name: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=10, le=500),
    current_user: dict = Depends(get_current_user)
):
    await check_permission(current_user, "Pickup (Execution)")

    query = {
        "company_id": current_user.get("company_id")
    }

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

    if depot_id:
        query["depot_id"] = depot_id

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

    await db.pickups.update_one(
        {"id": pickup_id},
        {"$set": {"tare_slip_file_id": file_id}}
    )

    return {"message": "Tare slip uploaded successfully"}


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

            "depot_id": payload.get("depot_id"),
            "depot_name": payload.get("depot_name"),

            "verified_by": current_user["id"],
            "verified_by_name": current_user["name"],
            "verified_at": now
        }}
    )

    # ================================
    # INVENTORY DEDUCTION
    # ================================
    if payload.get("depot_id") and payload.get("product_id"):

        depot_id = payload.get("depot_id")
        depot_name = payload.get("depot_name")

        product_id = payload.get("product_id")
        product_name = payload.get("product_name")

        # fallback if depot name missing
        if not depot_name:
            depot = await db.depots.find_one({"id": depot_id})
            depot_name = depot.get("name", "") if depot else ""

        await update_depot_inventory(
            depot_id=depot_id,
            depot_name=depot_name,
            product_id=product_id,
            product_name=product_name,
            product_code="",
            quantity_change=weight,
            is_incoming=False,
            company_id=current_user.get("company_id")
        )


    # ================================
    # UPDATE PURCHASE ORDER
    # ================================
    # po already fetched for validation above, reuse it here
    if po:
        dispatched = float(po.get("dispatched_quantity_mt") or 0)
        total = float(po.get("total_quantity_mt") or 0)

        new_dispatched = dispatched + float(weight)
        new_remaining = total - new_dispatched

        # ====================================
        # STATUS LOGIC
        # ====================================
        if po.get("status") == "Completed":

            # preserve manual completion
            new_status = "Completed"

        elif new_dispatched <= 0:

            # nothing dispatched yet
            new_status = "Open"

        else:

            # dispatch started
            new_status = "In Progress"

        await db.purchase_orders.update_one(
            {"id": purchase_order_id},
            {
                "$set": {
                    "dispatched_quantity_mt": round(new_dispatched, 2),
                    "remaining_quantity_mt": round(new_remaining, 2),
                    "status": new_status
                }
            }
        )

    # ================================
    # CREATE VERIFIED TRUCK ENTRY
    # ================================
    truck_no = pickup.get("truck_number") or pickup.get("vehicle_number") or ""
    
    if not truck_no:
        raise HTTPException(400, "Truck number is missing from pickup record")
    
    verified_truck = {
        "id": str(uuid.uuid4()),
        "date": pickup.get("date"),
        "truck_no": truck_no,
        "transporter": pickup.get("transporter_name") or "",
        "driver_mobile": pickup.get("driver_mobile") or "",
        "company": payload.get("purchase_order_company_name") or "",
        "product": payload.get("product_name") or "",
        "product_id": payload.get("product_id") or "",
        "po_number": po.get("client_po_number") or purchase_order_no or "",
        "po_date": po.get("client_po_date") or po.get("po_date") if po else "",
        "depot": payload.get("depot_name") or "",
        "depot_id": payload.get("depot_id") or "",
        "weight": weight,
        "verified_by": current_user["name"],
        "tare_slip_file_id": pickup.get("tare_slip_file_id") if pickup else None,
        "weightment_slip_file_id": slips[0] if slips else None,
        "invoice_details": None,
        "invoice_added": False,
        "shipping_details": None,
        "shipping_added": False,
        "pickup_id": pickup_id,
        "created_at": now
    }
    print("-----verified_truck ==========:",verified_truck )  # Debug log
    
    await db.verified_trucks.insert_one(verified_truck)

    # Verify it was saved correctly
    saved = await db.verified_trucks.find_one({"id": verified_truck["id"]}, {"_id": 0})
    print("-----  saved ==========:",saved )  # Debug log
    if not saved or not saved.get("truck_no"):
        print("ERROR: verified_truck saved without truck_no!", saved)

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
            "rejected_reason": reason.strip(),
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
async def get_pickup(pickup_id: str):
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

    if payload.status:
        update["status"] = payload.status

    if not update:
        raise HTTPException(400, "No fields to update")

    await db.pickups.update_one(
        {"id": pickup_id},
        {"$set": update}
    )

    # ================================
    # CREATE VERIFIED TRUCK ENTRY (only on weightment_done)
    # ================================
    if update.get("status") == "weightment_done":
        now = datetime.now(timezone.utc).isoformat()
        weight = payload.loaded_weight_mt or pickup.get("loaded_weight_mt")

        # Update pickup with verification timestamp
        await db.pickups.update_one(
            {"id": pickup_id},
            {"$set": {
                "verified_at": now,
                "verified_by": current_user["id"],
                "verified_by_name": current_user["name"],
                "weight_mt": weight
            }}
        )

        truck_no = pickup.get("truck_number") or pickup.get("vehicle_number") or ""

        existing = await db.verified_trucks.find_one({"pickup_id": pickup_id})
        if not existing:
            verified_truck = {
                "id": str(uuid.uuid4()),
                "date": pickup.get("date"),
                "truck_no": truck_no,
                "transporter": pickup.get("transporter_name") or "",
                "driver_mobile": pickup.get("driver_mobile") or "",
                "company": pickup.get("purchase_order_company_name") or pickup.get("company_name") or "",
                "product": pickup.get("product_name") or "",
                "product_id": pickup.get("product_id") or "",
                "po_number": pickup.get("purchase_order_no") or "",
                "po_date": "",
                "depot": pickup.get("depot_name") or "",
                "depot_id": pickup.get("depot_id") or "",
                "weight": weight,
                "verified_by": current_user["name"],
                "tare_slip_file_id": pickup.get("tare_slip_file_id"),
                "weightment_slip_file_id": payload.weightment_slip_file_id,
                "invoice_details": None,
                "invoice_added": False,
                "shipping_details": None,
                "shipping_added": False,
                "pickup_id": pickup_id,
                "created_at": now
            }
            await db.verified_trucks.insert_one(verified_truck)
        else:
            await db.verified_trucks.update_one(
                {"pickup_id": pickup_id},
                {"$set": {
                    "weight": weight,
                    "weightment_slip_file_id": payload.weightment_slip_file_id,
                    "tare_slip_file_id": pickup.get("tare_slip_file_id"),
                    "transporter": pickup.get("transporter_name") or "",
                    "company": pickup.get("purchase_order_company_name") or pickup.get("company_name") or "",
                    "product": pickup.get("product_name") or "",
                    "depot": pickup.get("depot_name") or "",
                }}
            )

        # ================================
        # DEDUCT FROM DEPOT INVENTORY
        # ================================
        depot_id = pickup.get("depot_id")
        product_id = pickup.get("product_id")
        if depot_id and product_id and weight:
            depot_name = pickup.get("depot_name") or ""
            product_name = pickup.get("product_name") or ""
            if not depot_name:
                depot = await db.depots.find_one({"id": depot_id})
                depot_name = depot.get("name", "") if depot else ""
            await update_depot_inventory(
                depot_id=depot_id,
                depot_name=depot_name,
                product_id=product_id,
                product_name=product_name,
                product_code="",
                quantity_change=float(weight),
                is_incoming=False,
                company_id=current_user.get("company_id")
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
    if payload.get("depot_id"):
        po_update["depot_id"] = payload["depot_id"]
    if payload.get("depot_name"):
        po_update["depot_name"] = payload["depot_name"]

    await db.pickups.update_one(
        {"id": pickup_id},
        {"$set": po_update}
    )

    # ================================
    # UPDATE VERIFIED TRUCK ENTRY
    # ================================
    loaded_weight = payload.get("loaded_weight_mt") or pickup.get("loaded_weight_mt")
    verified_truck_update = {
        "company": payload.get("purchase_order_company_name") or pickup.get("purchase_order_company_name") or pickup.get("company_name") or "",
        "product": payload.get("product_name") or pickup.get("product_name") or "",
        "product_id": payload.get("product_id") or pickup.get("product_id") or "",
        "po_number": payload.get("po_number") or payload.get("purchase_order_no") or pickup.get("purchase_order_no") or "",
        "po_date": payload.get("po_date") or "",
        "depot": payload.get("depot_name") or pickup.get("depot_name") or "",
        "depot_id": payload.get("depot_id") or pickup.get("depot_id") or "",
        "weight": loaded_weight,
        "transporter": payload.get("transporter_name") or pickup.get("transporter_name") or "",
        "verified_by": current_user["name"]
    }

    existing_vt = await db.verified_trucks.find_one({"pickup_id": pickup_id})
    if existing_vt:
        await db.verified_trucks.update_one(
            {"pickup_id": pickup_id},
            {"$set": verified_truck_update}
        )
    else:
        # create if missing (e.g. legacy data)
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
            "depot": verified_truck_update["depot"],
            "depot_id": verified_truck_update["depot_id"],
            "weight": loaded_weight,
            "verified_by": current_user["name"],
            "tare_slip_file_id": pickup.get("tare_slip_file_id"),
            "weightment_slip_file_id": pickup.get("weightment_slip_file_id"),
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
    po_id = payload.get("purchase_order_id")
    if po_id and loaded_weight:
        po = await db.purchase_orders.find_one({"id": po_id})
        if po:
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
    # DEDUCT FROM DEPOT INVENTORY
    # ================================
    depot_id = payload.get("depot_id") or pickup.get("depot_id")
    product_id = payload.get("product_id") or pickup.get("product_id")
    if depot_id and product_id and loaded_weight:
        depot_name = payload.get("depot_name") or pickup.get("depot_name") or ""
        product_name = payload.get("product_name") or pickup.get("product_name") or ""
        if not depot_name:
            depot = await db.depots.find_one({"id": depot_id})
            depot_name = depot.get("name", "") if depot else ""
        await update_depot_inventory(
            depot_id=depot_id,
            depot_name=depot_name,
            product_id=product_id,
            product_name=product_name,
            product_code="",
            quantity_change=float(loaded_weight),
            is_incoming=False,
            company_id=current_user.get("company_id")
        )

    return {"message": "Pickup final verified successfully"}