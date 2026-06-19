"""Truck routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List

from database import db
from auth_utils import get_current_user, check_permission
from models import Truck, TruckCreate, DriverInfo

router = APIRouter(tags=["Trucks"])

@router.post("/trucks", response_model=Truck)
async def create_truck(data: TruckCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Trucks (Create)")
    truck_data = data.model_dump()
    # Initialize drivers array with primary driver if provided
    if truck_data.get('driver_name'):
        truck_data['drivers'] = [{
            'name': truck_data['driver_name'],
            'mobile': truck_data.get('driver_mobile', ''),
            'is_primary': True
        }]
    else:
        truck_data['drivers'] = []
    truck = Truck(**truck_data)
    await db.trucks.insert_one(truck.model_dump())
    return truck

@router.get("/trucks", response_model=List[Truck])
async def get_trucks(current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Trucks (View)")
    return await db.trucks.find({}, {"_id": 0}).to_list(1000)

@router.get("/trucks/{truck_id}", response_model=Truck)
async def get_truck(truck_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Trucks (View)")
    truck = await db.trucks.find_one({"id": truck_id}, {"_id": 0})
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")
    return truck

@router.put("/trucks/{truck_id}", response_model=Truck)
async def update_truck(truck_id: str, data: TruckCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Trucks (Update)")
    update_data = data.model_dump()
    # Get existing truck to preserve drivers list
    existing = await db.trucks.find_one({"id": truck_id})
    if existing:
        existing_drivers = existing.get('drivers', [])
        # If driver_name is updated, check if it's a new driver
        if update_data.get('driver_name'):
            driver_exists = any(
                d['name'] == update_data['driver_name'] and d.get('mobile', '') == update_data.get('driver_mobile', '')
                for d in existing_drivers
            )
            if not driver_exists:
                # Add as new driver
                existing_drivers.append({
                    'name': update_data['driver_name'],
                    'mobile': update_data.get('driver_mobile', ''),
                    'is_primary': False
                })
        update_data['drivers'] = existing_drivers
    await db.trucks.update_one({"id": truck_id}, {"$set": update_data})
    return await db.trucks.find_one({"id": truck_id}, {"_id": 0})

@router.post("/trucks/{truck_id}/drivers")
async def add_driver_to_truck(truck_id: str, driver: DriverInfo, current_user: dict = Depends(get_current_user)):
    """Add a new driver to truck's drivers list"""
    await check_permission(current_user, "Trucks (Update)")
    truck = await db.trucks.find_one({"id": truck_id})
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")
    
    drivers = truck.get('drivers', [])
    # Check if driver already exists
    driver_exists = any(
        d['name'] == driver.name and d.get('mobile', '') == driver.mobile
        for d in drivers
    )
    if driver_exists:
        return {"message": "Driver already exists", "drivers": drivers}
    
    # Add new driver
    new_driver = {'name': driver.name, 'mobile': driver.mobile or '', 'is_primary': driver.is_primary}
    drivers.append(new_driver)
    
    # If this is primary, update the truck's primary driver fields too
    update_data = {'drivers': drivers}
    if driver.is_primary:
        update_data['driver_name'] = driver.name
        update_data['driver_mobile'] = driver.mobile
    
    await db.trucks.update_one({"id": truck_id}, {"$set": update_data})
    return {"message": "Driver added", "drivers": drivers}

@router.delete("/trucks/{truck_id}/drivers/{driver_mobile}")
async def remove_driver_from_truck(truck_id: str, driver_mobile: str, current_user: dict = Depends(get_current_user)):
    """Remove a driver from truck's drivers list"""
    await check_permission(current_user, "Trucks (Update)")
    truck = await db.trucks.find_one({"id": truck_id})
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")
    
    drivers = truck.get('drivers', [])
    drivers = [d for d in drivers if d.get('mobile', '') != driver_mobile]
    
    await db.trucks.update_one({"id": truck_id}, {"$set": {'drivers': drivers}})
    return {"message": "Driver removed", "drivers": drivers}

@router.delete("/trucks/{truck_id}")
async def delete_truck(truck_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Trucks (Delete)")
    await db.trucks.delete_one({"id": truck_id})
    return {"message": "Truck deleted"}
