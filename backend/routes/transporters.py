"""Transporter routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from uuid import uuid4
from datetime import datetime, timezone

# from db_compat import db
from .db_compat import db

from auth_utils import get_current_user, check_permission, ensure_transporter_access, build_transporter_filter, normalize_mobile
from models import Transporter, TransporterCreate

router = APIRouter(tags=["Transporters"])


def normalize_transporter_mobile(mobile_number: str, country_code: str = "91") -> tuple[str, str, str]:
    """Normalize transporter user mobile to (full_mobile, numeric_mobile, country_code)"""
    raw_mobile = str(mobile_number or "").strip()
    full_mobile = normalize_mobile(raw_mobile, country_code)
    numeric_mobile = ''.join(filter(str.isdigit, raw_mobile))
    country_code = str(country_code or "91").strip()

    if numeric_mobile.startswith("0") and len(numeric_mobile) == 11:
        numeric_mobile = numeric_mobile[1:]

    if numeric_mobile.startswith(country_code) and len(numeric_mobile) > len(country_code):
        numeric_mobile = numeric_mobile[len(country_code):]

    return full_mobile, numeric_mobile, country_code or "91"

@router.post("/transporters", response_model=Transporter)
async def create_transporter(data: TransporterCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Transporters (Create)")
    transporter = Transporter(**data.model_dump())
    await db.transporters.insert_one(transporter.model_dump())
    return transporter

@router.get("/transporters", response_model=List[Transporter])
async def get_transporters(current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Transporters (View)")
    query = build_transporter_filter(current_user, "id")
    transporters = await db.transporters.find(query, {"_id": 0}).to_list(1000)
    # Ensure company_ids array exists for all transporters
    for t in transporters:
        if "company_ids" not in t:
            t["company_ids"] = []
        # Fetch users from users collection where role is Transporter
        system_users = await db.users.find(
            {
                "role": "Transporter",
                "$or": [
                    {"transporter_id": t.get("id")},
                    {"transporter_name": t.get("name")}
                ]
            },
            {"_id": 0, "password": 0}
        ).to_list(1000)
        # Replace users array with users from users collection
        t["users"] = system_users
    return transporters

@router.get("/transporters/{transporter_id}", response_model=Transporter)
async def get_transporter(transporter_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Transporters (View)")
    await ensure_transporter_access(current_user, transporter_id)
    transporter = await db.transporters.find_one({"id": transporter_id}, {"_id": 0})
    if not transporter:
        raise HTTPException(status_code=404, detail="Transporter not found")
    return transporter

@router.put("/transporters/{transporter_id}", response_model=Transporter)
async def update_transporter(transporter_id: str, data: TransporterCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Transporters (Update)")
    await ensure_transporter_access(current_user, transporter_id)
    await db.transporters.update_one({"id": transporter_id}, {"$set": data.model_dump()})
    return await db.transporters.find_one({"id": transporter_id}, {"_id": 0})

@router.delete("/transporters/{transporter_id}")
async def delete_transporter(transporter_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Transporters (Delete)")
    await ensure_transporter_access(current_user, transporter_id)
    await db.transporters.delete_one({"id": transporter_id})
    return {"message": "Transporter deleted"}

# ============ TRANSPORTER USERS MANAGEMENT ============

@router.get("/transporters/{transporter_id}/users")
async def get_transporter_users(transporter_id: str, current_user: dict = Depends(get_current_user)):
    """Get all users for a transporter"""
    await check_permission(current_user, "Transporter Users (View)")
    await ensure_transporter_access(current_user, transporter_id)
    transporter = await db.transporters.find_one({"id": transporter_id}, {"_id": 0})
    if not transporter:
        raise HTTPException(status_code=404, detail="Transporter not found")
    return transporter.get("users", [])

@router.get("/transporters/{transporter_id}/system-users")
async def get_transporter_system_users(transporter_id: str, current_user: dict = Depends(get_current_user)):
    """Get all system users mapped to a transporter"""
    await check_permission(current_user, "Transporters (View)")
    await ensure_transporter_access(current_user, transporter_id)
    # Get system users with this transporter_id
    system_users = await db.users.find(
        {"transporter_id": transporter_id, "role": "Transporter"},
        {"_id": 0, "password": 0}
    ).to_list(1000)
    return system_users

@router.post("/transporters/{transporter_id}/users")
async def add_transporter_user(transporter_id: str, user_data: dict, current_user: dict = Depends(get_current_user)):
    """Add a new user to a transporter"""
    await check_permission(current_user, "Transporter Users (Create)")
    await ensure_transporter_access(current_user, transporter_id)
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
    
    mobile_number = user.get("mobile_number", "")
    country_code = user_data.get("country_code", "91")
    full_mobile, numeric_mobile, country_code = normalize_transporter_mobile(mobile_number, country_code)
    if len(numeric_mobile) != 10:
        raise HTTPException(status_code=400, detail="Transporter user mobile number must be a valid 10-digit number")

    user["mobile_number"] = numeric_mobile
    user["country_code"] = country_code

    # Check if mobile already exists
    existing_user = await db.users.find_one({"mobile": full_mobile})
    if existing_user:
        raise HTTPException(status_code=400, detail="Mobile number already registered")

    await db.transporters.update_one(
        {"id": transporter_id},
        {"$push": {"users": user}}
    )

    user_doc = {
        "id": user["id"],
        "name": user["name"],
        "mobile": full_mobile,
        "country_code": country_code,
        "password": "",
        "password_set": False,
        "role": "Transporter",
        "email": user.get("email"),
        "depot_id": None,
        "company_id": None,
        "assigned_products": [],
        "assigned_depots": [],
        "excluded_products": [],
        "excluded_depots": [],
        "otp_verified": False,
        "created_by": current_user.get("id"),
        "created_at": user["created_at"],
        "transporter_id": transporter_id,
        "transporter_name": transporter.get("name", ""),
    }
    # The profile fields (mobile_number, address, PAN, Aadhaar, ...) were listed
    # here too, but users has no such columns so db_compat dropped them. They are
    # already persisted on the transporter's embedded users array above, which is
    # what GET /transporters/{id}/users serves.

    await db.users.update_one(
        {"id": user["id"]},
        {"$set": user_doc},
        upsert=True
    )
    
    return user

@router.put("/transporters/{transporter_id}/users/{user_id}")
async def update_transporter_user(transporter_id: str, user_id: str, user_data: dict, current_user: dict = Depends(get_current_user)):
    """Update a user in a transporter"""
    await check_permission(current_user, "Transporter Users (Update)")
    await ensure_transporter_access(current_user, transporter_id)
    transporter = await db.transporters.find_one({"id": transporter_id})
    if not transporter:
        raise HTTPException(status_code=404, detail="Transporter not found")
    
    users = transporter.get("users", [])
    user_index = next((i for i, u in enumerate(users) if u.get("id") == user_id), -1)
    
    if user_index == -1:
        raise HTTPException(status_code=404, detail="User not found")
    
    existing_user = await db.users.find_one({"id": user_id})
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Fall back to the transporter's embedded user record, not the users table.
    # The users row is the login account and carries no mobile_number column, so
    # reading the fallback from there always yielded "" and every update that
    # omitted mobile_number failed the 10-digit check below with a 400.
    existing_profile = users[user_index]
    mobile_number = user_data.get("mobile_number") or existing_profile.get("mobile_number", "")
    country_code = user_data.get("country_code") or existing_profile.get("country_code") or existing_user.get("country_code") or "91"
    full_mobile, numeric_mobile, country_code = normalize_transporter_mobile(mobile_number, country_code)
    if len(numeric_mobile) != 10:
        raise HTTPException(status_code=400, detail="Transporter user mobile number must be a valid 10-digit number")

    # Check if mobile already exists for another user
    existing_mobile_user = await db.users.find_one({"mobile": full_mobile, "id": {"$ne": user_id}})
    if existing_mobile_user:
        raise HTTPException(status_code=400, detail="Mobile number already registered")

    updated_user = {**users[user_index], **user_data, "id": user_id, "mobile_number": numeric_mobile, "country_code": country_code}
    users[user_index] = updated_user
    
    await db.transporters.update_one(
        {"id": transporter_id},
        {"$set": {"users": users}}
    )

    # Only columns that exist on the users table. The profile fields (address,
    # PAN, Aadhaar, ...) live in the transporter's embedded users array, which
    # was updated above and is what GET /transporters/{id}/users returns.
    # Listing them here achieved nothing -- db_compat filters unknown keys
    # against __table__.columns and dropped them silently.
    update_fields = {
        "role": "Transporter",
        "transporter_id": transporter_id,
        "transporter_name": transporter.get("name", ""),
        "country_code": country_code,
        "mobile": full_mobile,
        # Key presence, not truthiness: an omitted email keeps the stored one,
        # while an explicit "" still clears it. `user_data.get("email")` alone
        # wiped the address on every partial update.
        "email": user_data["email"] if "email" in user_data
                 else (existing_profile.get("email") or existing_user.get("email")),
    }
    await db.users.update_one(
        {"id": user_id},
        {"$set": update_fields},
        upsert=True
    )
    
    return updated_user

@router.delete("/transporters/{transporter_id}/users/{user_id}")
async def delete_transporter_user(transporter_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a user from a transporter"""
    await check_permission(current_user, "Transporter Users (Delete)")
    await ensure_transporter_access(current_user, transporter_id)
    result = await db.transporters.update_one(
        {"id": transporter_id},
        {"$pull": {"users": {"id": user_id}}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted"}
