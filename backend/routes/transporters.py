"""Transporter routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from uuid import uuid4
from datetime import datetime, timezone

from database import db
from auth_utils import get_current_user, check_permission
from models import Transporter, TransporterCreate

router = APIRouter(tags=["Transporters"])

@router.post("/transporters", response_model=Transporter)
async def create_transporter(data: TransporterCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Transporters (Create)")
    transporter = Transporter(**data.model_dump())
    await db.transporters.insert_one(transporter.model_dump())
    return transporter

@router.get("/transporters", response_model=List[Transporter])
async def get_transporters(current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Transporters (View)")
    return await db.transporters.find({}, {"_id": 0}).to_list(1000)

@router.get("/transporters/{transporter_id}", response_model=Transporter)
async def get_transporter(transporter_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Transporters (View)")
    transporter = await db.transporters.find_one({"id": transporter_id}, {"_id": 0})
    if not transporter:
        raise HTTPException(status_code=404, detail="Transporter not found")
    return transporter

@router.put("/transporters/{transporter_id}", response_model=Transporter)
async def update_transporter(transporter_id: str, data: TransporterCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Transporters (Update)")
    await db.transporters.update_one({"id": transporter_id}, {"$set": data.model_dump()})
    return await db.transporters.find_one({"id": transporter_id}, {"_id": 0})

@router.delete("/transporters/{transporter_id}")
async def delete_transporter(transporter_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Transporters (Delete)")
    await db.transporters.delete_one({"id": transporter_id})
    return {"message": "Transporter deleted"}

# ============ TRANSPORTER USERS MANAGEMENT ============

@router.get("/transporters/{transporter_id}/users")
async def get_transporter_users(transporter_id: str, current_user: dict = Depends(get_current_user)):
    """Get all users for a transporter"""
    await check_permission(current_user, "Transporter Users (View)")
    transporter = await db.transporters.find_one({"id": transporter_id}, {"_id": 0})
    if not transporter:
        raise HTTPException(status_code=404, detail="Transporter not found")
    return transporter.get("users", [])

@router.post("/transporters/{transporter_id}/users")
async def add_transporter_user(transporter_id: str, user_data: dict, current_user: dict = Depends(get_current_user)):
    """Add a new user to a transporter"""
    await check_permission(current_user, "Transporter Users (Create)")
    transporter = await db.transporters.find_one({"id": transporter_id})
    if not transporter:
        raise HTTPException(status_code=404, detail="Transporter not found")
    
    # Create user with ID
    user = {
        "id": str(uuid4()),
        "name": user_data.get("name", ""),
        "title": user_data.get("title", ""),
        "date_of_birth": user_data.get("date_of_birth", ""),
        "marital_status": user_data.get("marital_status", ""),
        "date_of_anniversary": user_data.get("date_of_anniversary", ""),
        "mobile_number": user_data.get("mobile_number", ""),
        "email": user_data.get("email", ""),
        "whatsapp_number": user_data.get("whatsapp_number", ""),
        "emergency_contact": user_data.get("emergency_contact", ""),
        "address": user_data.get("address", ""),
        "city": user_data.get("city", ""),
        "district": user_data.get("district", ""),
        "state": user_data.get("state", ""),
        "pin_code": user_data.get("pin_code", ""),
        "country": user_data.get("country", "India"),
        "pan_number": user_data.get("pan_number", ""),
        "aadhaar_number": user_data.get("aadhaar_number", ""),
        "remarks": user_data.get("remarks", ""),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.transporters.update_one(
        {"id": transporter_id},
        {"$push": {"users": user}}
    )
    
    return user

@router.put("/transporters/{transporter_id}/users/{user_id}")
async def update_transporter_user(transporter_id: str, user_id: str, user_data: dict, current_user: dict = Depends(get_current_user)):
    """Update a user in a transporter"""
    await check_permission(current_user, "Transporter Users (Update)")
    transporter = await db.transporters.find_one({"id": transporter_id})
    if not transporter:
        raise HTTPException(status_code=404, detail="Transporter not found")
    
    users = transporter.get("users", [])
    user_index = next((i for i, u in enumerate(users) if u.get("id") == user_id), -1)
    
    if user_index == -1:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update user fields
    updated_user = {**users[user_index], **user_data, "id": user_id}
    users[user_index] = updated_user
    
    await db.transporters.update_one(
        {"id": transporter_id},
        {"$set": {"users": users}}
    )
    
    return updated_user

@router.delete("/transporters/{transporter_id}/users/{user_id}")
async def delete_transporter_user(transporter_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a user from a transporter"""
    await check_permission(current_user, "Transporter Users (Delete)")
    result = await db.transporters.update_one(
        {"id": transporter_id},
        {"$pull": {"users": {"id": user_id}}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted"}
