"""Railway Zone routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List

from database import db
from auth_utils import get_current_user, check_permission
from models import RailwayZone, RailwayZoneCreate

router = APIRouter(tags=["Railway Zones"])

@router.post("/railway-zones", response_model=RailwayZone)
async def create_railway_zone(data: RailwayZoneCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Railway Zones (Create)")
    zone = RailwayZone(**data.model_dump())
    await db.railway_zones.insert_one(zone.model_dump())
    return zone

@router.get("/railway-zones", response_model=List[RailwayZone])
async def get_railway_zones(current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Railway Zones (View)")
    return await db.railway_zones.find({}, {"_id": 0}).to_list(1000)

@router.get("/railway-zones/{zone_id}", response_model=RailwayZone)
async def get_railway_zone(zone_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Railway Zones (View)")
    zone = await db.railway_zones.find_one({"id": zone_id}, {"_id": 0})
    if not zone:
        raise HTTPException(status_code=404, detail="Railway Zone not found")
    return zone

@router.put("/railway-zones/{zone_id}", response_model=RailwayZone)
async def update_railway_zone(zone_id: str, data: RailwayZoneCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Railway Zones (Update)")
    await db.railway_zones.update_one({"id": zone_id}, {"$set": data.model_dump()})
    zone = await db.railway_zones.find_one({"id": zone_id}, {"_id": 0})
    if not zone:
        raise HTTPException(status_code=404, detail="Railway Zone not found")
    return zone

@router.delete("/railway-zones/{zone_id}")
async def delete_railway_zone(zone_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Railway Zones (Delete)")
    await db.railway_zones.delete_one({"id": zone_id})
    return {"message": "Railway Zone deleted"}
