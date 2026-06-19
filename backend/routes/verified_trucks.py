"""Verified Truck routes"""
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional

from database import db
from models import VerifiedTruck, VerifiedTruckCreate
from auth_utils import get_current_user, check_permission, build_product_filter

router = APIRouter(tags=["VerifiedTrucks"])


@router.post("/verified-trucks", response_model=VerifiedTruck)
async def create_verified_truck(data: VerifiedTruckCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Verified Trucks Details (Create)")
    vt_data = data.model_dump()
    vt = VerifiedTruck(**vt_data)
    await db.verified_trucks.insert_one(vt.model_dump())
    return vt


@router.get("/verified-trucks", response_model=List[VerifiedTruck])
async def get_verified_trucks(
    current_user: dict = Depends(get_current_user),
    date: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    truck_no: Optional[str] = None,
    transporter: Optional[str] = None,
    company: Optional[str] = None,
    po_number: Optional[str] = None,
    driver_mobile: Optional[str] = None,
    verified_by: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=1000)
):
    await check_permission(current_user, "Verified Trucks Details (View)")
    query = {}

    product_filter = await build_product_filter(current_user, "product_id")
    if product_filter:
        query.update(product_filter)

    if date:
        query["date"] = date

    if start_date or end_date:
        query["date"] = {}
        if start_date:
            query["date"]["$gte"] = start_date
        if end_date:
            query["date"]["$lte"] = end_date

    if truck_no:
        query["truck_no"] = {"$regex": truck_no, "$options": "i"}
    if transporter:
        query["transporter"] = {"$regex": transporter, "$options": "i"}
    if company:
        query["company"] = {"$regex": company, "$options": "i"}
    if po_number:
        query["po_number"] = {"$regex": po_number, "$options": "i"}
    if driver_mobile:
        query["driver_mobile"] = {"$regex": driver_mobile, "$options": "i"}
    if verified_by:
        query["verified_by"] = {"$regex": verified_by, "$options": "i"}

    skip = (page - 1) * page_size
    return await db.verified_trucks.find(query, {"_id": 0}).sort("date", 1).skip(skip).limit(page_size).to_list(page_size)


@router.get("/verified-trucks/{vt_id}", response_model=VerifiedTruck)
async def get_verified_truck(vt_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Verified Trucks Details (View)")
    vt = await db.verified_trucks.find_one({"id": vt_id}, {"_id": 0})
    if not vt:
        raise HTTPException(status_code=404, detail="Verified truck not found")
    return vt


@router.put("/verified-trucks/{vt_id}", response_model=VerifiedTruck)
async def update_verified_truck(vt_id: str, payload: dict, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Verified Trucks Details (Update)")
    if not payload:
        raise HTTPException(status_code=400, detail="No update data provided")

    await db.verified_trucks.update_one({"id": vt_id}, {"$set": payload})
    vt = await db.verified_trucks.find_one({"id": vt_id}, {"_id": 0})
    if not vt:
        raise HTTPException(status_code=404, detail="Verified truck not found")
    return vt


@router.delete("/verified-trucks/{vt_id}")
async def delete_verified_truck(vt_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Verified Trucks Details (Delete)")
    await db.verified_trucks.delete_one({"id": vt_id})
    return {"message": "Verified truck deleted"}
