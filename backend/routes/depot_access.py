"""Depot Access Management routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from pydantic import BaseModel

from database import db
from auth_utils import get_current_user, get_user_depot_ids

router = APIRouter(tags=["Depot Access"])


class UpdateDepotAccessRequest(BaseModel):
    user_id: str
    assigned_depots: List[str]


class BulkDepotAccessRequest(BaseModel):
    depot_id: str
    user_ids: List[str]


@router.get("/depot-access")
async def get_all_depot_access(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "Management":
        raise HTTPException(status_code=403, detail="Only Management can view depot access")

    admin_depot_ids = await get_user_depot_ids(current_user)

    if admin_depot_ids is None:
        depots = await db.depots.find({}, {"_id": 0}).to_list(1000)
    else:
        if not admin_depot_ids:
            depots = []
        else:
            depots = await db.depots.find({"id": {"$in": admin_depot_ids}}, {"_id": 0}).to_list(1000)

    depot_access_map = {
        depot["id"]: {
            "depot_id": depot["id"],
            "depot_name": depot.get("name", "Unknown"),
            "users": []
        }
        for depot in depots
    }

    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)

    for user in users:
        user_depot_ids = set(user.get("assigned_depots", []) or [])
        excluded_depots = set(user.get("excluded_depots", []) or [])
        role = user.get("role")
        if role:
            user_depot_ids.update([
                d["id"] for d in depots if role in (d.get("assigned_roles") or [])
            ])
        effective_depot_ids = user_depot_ids.difference(excluded_depots)

        for depot_id in effective_depot_ids:
            if depot_id in depot_access_map:
                depot_access_map[depot_id]["users"].append({
                    "user_id": user["id"],
                    "name": user.get("name"),
                    "role": user.get("role"),
                    "mobile": user.get("mobile")
                })

    return {
        "users": users,
        "depots": depots,
        "depot_access": list(depot_access_map.values())
    }


@router.get("/depot-access/user/{user_id}")
async def get_user_depot_access(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "Management" and current_user.get("id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    assigned_depot_ids = await get_user_depot_ids(user)
    if assigned_depot_ids is None:
        assigned_depot_ids = [d["id"] for d in await db.depots.find({}, {"id": 1}).to_list(1000)]

    admin_depot_ids = await get_user_depot_ids(current_user)
    if admin_depot_ids is not None:
        visible_assigned_ids = [did for did in assigned_depot_ids if did in admin_depot_ids]
    else:
        visible_assigned_ids = assigned_depot_ids

    assigned_depots = []
    if visible_assigned_ids:
        assigned_depots = await db.depots.find({"id": {"$in": visible_assigned_ids}}, {"_id": 0}).to_list(100)

    if admin_depot_ids is None:
        all_depots = await db.depots.find({}, {"_id": 0}).to_list(1000)
    else:
        if admin_depot_ids:
            all_depots = await db.depots.find({"id": {"$in": admin_depot_ids}}, {"_id": 0}).to_list(1000)
        else:
            all_depots = []

    return {
        "user": user,
        "assigned_depots": assigned_depots,
        "assigned_depot_ids": visible_assigned_ids,
        "all_depots": all_depots
    }


@router.put("/depot-access/user/{user_id}")
async def update_user_depot_access(user_id: str, data: UpdateDepotAccessRequest, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "Management":
        raise HTTPException(status_code=403, detail="Only Management can modify depot access")

    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.get("is_master_admin"):
        raise HTTPException(status_code=403, detail="Cannot modify Master Admin's depot access")

    admin_depot_ids = await get_user_depot_ids(current_user)
    if admin_depot_ids is not None:
        invalid = [did for did in data.assigned_depots if did not in admin_depot_ids] if data.assigned_depots else []
        if invalid:
            raise HTTPException(status_code=403, detail=f"You don't have access to manage these depots: {invalid}")

    # Validate depot IDs exist. Filter out non-existing ones instead of failing.
    assigned_list = data.assigned_depots or []
    valid_ids = []
    invalid_ids = []
    if assigned_list:
        valid = await db.depots.find({"id": {"$in": assigned_list}}, {"id": 1}).to_list(100)
        valid_ids = [d["id"] for d in valid]
        invalid_ids = [did for did in assigned_list if did not in valid_ids]

    filtered_assigned = [did for did in assigned_list if did in valid_ids]

    # Determine previous assignments to compute differences
    previous_assigned = user.get("assigned_depots", []) or []
    to_add = [did for did in filtered_assigned if did not in previous_assigned]
    to_remove = [did for did in previous_assigned if did not in filtered_assigned]

    # Update user document
    await db.users.update_one({"id": user_id}, {"$set": {"assigned_depots": filtered_assigned}})

    resp = {"success": True, "message": "Depot access updated for user", "assigned_depots": filtered_assigned}
    if invalid_ids:
        resp["warning"] = f"Some depot IDs were invalid and ignored: {invalid_ids}"
    return resp


@router.post("/depot-access/depot/{depot_id}/grant")
async def grant_depot_access_to_users(depot_id: str, data: BulkDepotAccessRequest, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "Management":
        raise HTTPException(status_code=403, detail="Only Management can modify depot access")

    admin_depot_ids = await get_user_depot_ids(current_user)
    if admin_depot_ids is not None and depot_id not in admin_depot_ids:
        raise HTTPException(status_code=403, detail="You don't have access to manage this depot")

    depot = await db.depots.find_one({"id": depot_id})
    if not depot:
        raise HTTPException(status_code=404, detail="Depot not found")

    updated = 0
    for user_id in data.user_ids:
        user = await db.users.find_one({"id": user_id, "is_master_admin": {"$ne": True}})
        if not user:
            continue

        update_ops = {"$pull": {"excluded_depots": depot_id}}
        if not (user.get("role") and user["role"] in (depot.get("assigned_roles") or [])):
            update_ops["$addToSet"] = {"assigned_depots": depot_id}

        result = await db.users.update_one({"id": user_id, "is_master_admin": {"$ne": True}}, update_ops)
        if result.modified_count > 0:
            updated += 1

    return {"success": True, "message": f"Depot access granted to {updated} users", "depot_id": depot_id, "depot_name": depot.get("name")}


@router.post("/depot-access/depot/{depot_id}/revoke")
async def revoke_depot_access_from_users(depot_id: str, data: BulkDepotAccessRequest, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "Management":
        raise HTTPException(status_code=403, detail="Only Management can modify depot access")

    admin_depot_ids = await get_user_depot_ids(current_user)
    if admin_depot_ids is not None and depot_id not in admin_depot_ids:
        raise HTTPException(status_code=403, detail="You don't have access to manage this depot")

    updated = 0
    for user_id in data.user_ids:
        user = await db.users.find_one({"id": user_id, "is_master_admin": {"$ne": True}})
        if not user:
            continue

        update_ops = {"$pull": {"assigned_depots": depot_id}}
        if user.get("role") and user["role"] in (depot.get("assigned_roles") or []):
            update_ops["$addToSet"] = {"excluded_depots": depot_id}

        result = await db.users.update_one({"id": user_id, "is_master_admin": {"$ne": True}}, update_ops)
        if result.modified_count > 0:
            updated += 1

    return {"success": True, "message": f"Depot access revoked from {updated} users", "depot_id": depot_id}


@router.get("/depot-access/my-depots")
async def get_my_depot_access(current_user: dict = Depends(get_current_user)):
    assigned_depot_ids = await get_user_depot_ids(current_user)
    is_master_admin = current_user.get("is_master_admin", False)

    if is_master_admin:
        all_depots = await db.depots.find({}, {"_id": 0}).to_list(1000)
        return {"has_all_access": True, "assigned_depots": all_depots, "assigned_depot_ids": [d["id"] for d in all_depots]}

    if not assigned_depot_ids:
        return {"has_all_access": False, "assigned_depots": [], "assigned_depot_ids": []}

    assigned_depots = await db.depots.find({"id": {"$in": assigned_depot_ids}}, {"_id": 0}).to_list(100)

    return {"has_all_access": False, "assigned_depots": assigned_depots, "assigned_depot_ids": assigned_depot_ids}
