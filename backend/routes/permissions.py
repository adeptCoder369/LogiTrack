"""Permissions routes"""
from fastapi import APIRouter, HTTPException, Depends

from database import db
from auth_utils import get_current_user
from config import PERMISSION_DEFAULTS

router = APIRouter(tags=["Permissions"])

@router.get("/permissions")
async def get_permissions_api():
    """Get all role permissions"""
    permissions = await db.permissions.find_one({"id": "role_permissions"}, {"_id": 0})
    if not permissions or not permissions.get("permissions"):
        # Return default permissions if none set or if permissions object is empty
        return {"id": "role_permissions", "permissions": PERMISSION_DEFAULTS}
    
    # Merge with defaults to ensure all modules are present
    stored_permissions = permissions.get("permissions", {})
    merged_permissions = {**PERMISSION_DEFAULTS, **stored_permissions}
    return {"id": "role_permissions", "permissions": merged_permissions}

@router.put("/permissions")
async def update_permissions(data: dict, current_user: dict = Depends(get_current_user)):
    """Update role permissions (Management only)"""
    if current_user.get("role") != "Management":
        raise HTTPException(status_code=403, detail="Only Management can modify permissions")
    
    # Ensure Management always has all permissions (cannot be removed)
    permissions = data.get("permissions", {})
    for module in permissions:
        permissions[module]["Management"] = True
    
    await db.permissions.update_one(
        {"id": "role_permissions"},
        {"$set": {"id": "role_permissions", "permissions": permissions}},
        upsert=True
    )
    return {"success": True, "message": "Permissions updated"}

@router.put("/permissions/{module}/{role}")
async def toggle_permission(module: str, role: str, current_user: dict = Depends(get_current_user)):
    """Toggle a specific permission for a role"""
    if current_user.get("role") != "Management":
        raise HTTPException(status_code=403, detail="Only Management can modify permissions")
    
    if role == "Management":
        raise HTTPException(status_code=400, detail="Cannot modify Management permissions")
    
    # Get current permissions, starting with defaults
    perm_doc = await db.permissions.find_one({"id": "role_permissions"})
    if not perm_doc or not perm_doc.get("permissions"):
        # Initialize with defaults if document doesn't exist or permissions is empty
        permissions = PERMISSION_DEFAULTS.copy()
    else:
        # Merge with defaults to ensure all modules are present
        permissions = {**PERMISSION_DEFAULTS, **perm_doc.get("permissions", {})}
    
    # Ensure the module exists with proper defaults
    if module not in permissions:
        permissions[module] = {"Management": True, "Admin": True, "Loader": False, "Depot Manager": False, "Depot Staff": False}
    
    current_value = permissions[module].get(role, False)
    permissions[module][role] = not current_value
    
    await db.permissions.update_one(
        {"id": "role_permissions"},
        {"$set": {"permissions": permissions}},
        upsert=True
    )
    
    return {
        "success": True, 
        "module": module, 
        "role": role, 
        "new_value": not current_value
    }

@router.post("/permissions/reset")
async def reset_permissions(current_user: dict = Depends(get_current_user)):
    """Reset all permissions to defaults (Management only)"""
    if current_user.get("role") != "Management":
        raise HTTPException(status_code=403, detail="Only Management can reset permissions")
    
    await db.permissions.update_one(
        {"id": "role_permissions"},
        {"$set": {"permissions": PERMISSION_DEFAULTS}},
        upsert=True
    )
    
    return {"success": True, "message": "Permissions reset to defaults", "permissions": PERMISSION_DEFAULTS}
