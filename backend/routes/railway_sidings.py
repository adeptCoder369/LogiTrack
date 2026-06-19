"""Railway Siding routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List

from database import db
from auth_utils import get_current_user, check_permission
from models import RailwaySiding, RailwaySidingCreate

router = APIRouter(tags=["Railway Sidings"])

@router.post("/railway-sidings", response_model=RailwaySiding)
async def create_railway_siding(data: RailwaySidingCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Railway Sidings (Create)")
    siding = RailwaySiding(**data.model_dump())
    await db.railway_sidings.insert_one(siding.model_dump())
    return siding

@router.get("/railway-sidings", response_model=List[RailwaySiding])
async def get_railway_sidings(current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Railway Sidings (View)")
    return await db.railway_sidings.find({}, {"_id": 0}).to_list(1000)

@router.get("/railway-sidings/{siding_id}", response_model=RailwaySiding)
async def get_railway_siding(siding_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Railway Sidings (View)")
    siding = await db.railway_sidings.find_one({"id": siding_id}, {"_id": 0})
    if not siding:
        raise HTTPException(status_code=404, detail="Railway Siding not found")
    return siding

@router.put("/railway-sidings/{siding_id}", response_model=RailwaySiding)
async def update_railway_siding(siding_id: str, data: RailwaySidingCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Railway Sidings (Update)")
    await db.railway_sidings.update_one({"id": siding_id}, {"$set": data.model_dump()})
    return await db.railway_sidings.find_one({"id": siding_id}, {"_id": 0})

@router.delete("/railway-sidings/{siding_id}")
async def delete_railway_siding(siding_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Railway Sidings (Delete)")
    await db.railway_sidings.delete_one({"id": siding_id})
    return {"message": "Railway Siding deleted"}
