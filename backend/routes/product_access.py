"""Product Access Management routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from pydantic import BaseModel

from database import db
from auth_utils import get_current_user, get_user_product_ids

router = APIRouter(tags=["Product Access"])


class UpdateProductAccessRequest(BaseModel):
    user_id: str
    assigned_products: List[str]  # List of product IDs


class BulkProductAccessRequest(BaseModel):
    product_id: str
    user_ids: List[str]  # List of user IDs to grant access


@router.get("/product-access")
async def get_all_product_access(current_user: dict = Depends(get_current_user)):
    """Get all users with their product assignments - filtered by admin's product access"""
    if current_user.get("role") != "Management":
        raise HTTPException(status_code=403, detail="Only Management can view product access")
    
    # Get admin's accessible product IDs
    admin_product_ids = await get_user_product_ids(current_user)
    
    # Get all products (filtered for restricted admin)
    if admin_product_ids is None:
        products = await db.products.find({}, {"_id": 0}).to_list(1000)
    else:
        if not admin_product_ids:
            products = []
        else:
            products = await db.products.find({"id": {"$in": admin_product_ids}}, {"_id": 0}).to_list(1000)

    # Create a summary for only accessible products
    product_access_map = {
        product["id"]: {
            "product_id": product["id"],
            "product_name": product.get("product_name", "Unknown"),
            "product_code": product.get("product_code", ""),
            "users": []
        }
        for product in products
    }

    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)

    for user in users:
        user_product_ids = set(user.get("assigned_products", []) or [])
        excluded_products = set(user.get("excluded_products", []) or [])
        role = user.get("role")
        if role:
            user_product_ids.update([
                p["id"] for p in products if role in (p.get("assigned_roles") or [])
            ])
        effective_product_ids = user_product_ids.difference(excluded_products)

        for product_id in effective_product_ids:
            if product_id in product_access_map:
                product_access_map[product_id]["users"].append({
                    "user_id": user["id"],
                    "name": user.get("name"),
                    "role": user.get("role"),
                    "mobile": user.get("mobile")
                })

    return {
        "users": users,
        "products": products,
        "product_access": list(product_access_map.values())
    }


@router.get("/product-access/user/{user_id}")
async def get_user_product_access(user_id: str, current_user: dict = Depends(get_current_user)):
    """Get product access for a specific user - filtered by admin's product access"""
    if current_user.get("role") != "Management" and current_user.get("id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    assigned_product_ids = await get_user_product_ids(user)
    if assigned_product_ids is None:
        assigned_product_ids = [p["id"] for p in await db.products.find({}, {"id": 1}).to_list(1000)]

    admin_product_ids = await get_user_product_ids(current_user)
    if admin_product_ids is not None:
        visible_assigned_ids = [pid for pid in assigned_product_ids if pid in admin_product_ids]
    else:
        visible_assigned_ids = assigned_product_ids

    assigned_products = []
    if visible_assigned_ids:
        assigned_products = await db.products.find(
            {"id": {"$in": visible_assigned_ids}}, 
            {"_id": 0}
        ).to_list(100)

    if admin_product_ids is None:
        all_products = await db.products.find({}, {"_id": 0}).to_list(1000)
    else:
        if admin_product_ids:
            all_products = await db.products.find({"id": {"$in": admin_product_ids}}, {"_id": 0}).to_list(1000)
        else:
            all_products = []

    return {
        "user": user,
        "assigned_products": assigned_products,
        "assigned_product_ids": visible_assigned_ids,
        "all_products": all_products
    }


@router.put("/product-access/user/{user_id}")
async def update_user_product_access(
    user_id: str,
    data: UpdateProductAccessRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update product access for a user - restricted to admin's accessible products"""
    if current_user.get("role") != "Management":
        raise HTTPException(status_code=403, detail="Only Management can modify product access")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Cannot modify master admin's product access
    if user.get("is_master_admin"):
        raise HTTPException(status_code=403, detail="Cannot modify Master Admin's product access")
    
    # Get admin's accessible product IDs
    admin_product_ids = await get_user_product_ids(current_user)
    
    # If admin has restricted access, ensure they can only assign products they have access to
    if admin_product_ids is not None:
        invalid_products = [pid for pid in data.assigned_products if pid not in admin_product_ids]
        if invalid_products:
            raise HTTPException(
                status_code=403, 
                detail=f"You don't have access to manage these products: {invalid_products}"
            )
    
    # Validate product IDs exist. If some IDs don't exist, filter them out
    assigned_list = data.assigned_products or []
    valid_ids = []
    invalid_ids = []
    if assigned_list:
        valid_products = await db.products.find(
            {"id": {"$in": assigned_list}},
            {"id": 1}
        ).to_list(100)
        valid_ids = [p["id"] for p in valid_products]
        invalid_ids = [pid for pid in assigned_list if pid not in valid_ids]

    # Only store the valid IDs to keep user data consistent
    filtered_assigned = [pid for pid in assigned_list if pid in valid_ids]

    # Determine previous assignments to compute differences
    previous_assigned = user.get("assigned_products", []) or []
    to_add = [pid for pid in filtered_assigned if pid not in previous_assigned]
    to_remove = [pid for pid in previous_assigned if pid not in filtered_assigned]

    # Update user document
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"assigned_products": filtered_assigned}}
    )

    resp = {
        "success": True,
        "message": f"Product access updated for user",
        "assigned_products": filtered_assigned
    }
    if invalid_ids:
        resp["warning"] = f"Some product IDs were invalid and ignored: {invalid_ids}"
    return resp


@router.post("/product-access/product/{product_id}/grant")
async def grant_product_access_to_users(
    product_id: str,
    data: BulkProductAccessRequest,
    current_user: dict = Depends(get_current_user)
):
    """Grant product access to multiple users - checks admin has access to the product"""
    if current_user.get("role") != "Management":
        raise HTTPException(status_code=403, detail="Only Management can modify product access")
    
    # Check if admin has access to this product
    admin_product_ids = await get_user_product_ids(current_user)
    if admin_product_ids is not None and product_id not in admin_product_ids:
        raise HTTPException(status_code=403, detail="You don't have access to manage this product")
    
    # Validate product exists
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Grant access for each user.
    # If the user was explicitly excluded from role-derived access, remove the exclusion.
    updated_count = 0
    for user_id in data.user_ids:
        user = await db.users.find_one({"id": user_id, "is_master_admin": {"$ne": True}})
        if not user:
            continue

        update_ops = {"$pull": {"excluded_products": product_id}}
        if not (user.get("role") and user["role"] in (product.get("assigned_roles") or [])):
            update_ops["$addToSet"] = {"assigned_products": product_id}

        result = await db.users.update_one({"id": user_id, "is_master_admin": {"$ne": True}}, update_ops)
        if result.modified_count > 0:
            updated_count += 1
    
    return {
        "success": True,
        "message": f"Product access granted to {updated_count} users",
        "product_id": product_id,
        "product_name": product.get("product_name")
    }


@router.post("/product-access/product/{product_id}/revoke")
async def revoke_product_access_from_users(
    product_id: str,
    data: BulkProductAccessRequest,
    current_user: dict = Depends(get_current_user)
):
    """Revoke product access from multiple users - checks admin has access to the product"""
    if current_user.get("role") != "Management":
        raise HTTPException(status_code=403, detail="Only Management can modify product access")
    
    # Check if admin has access to this product
    admin_product_ids = await get_user_product_ids(current_user)
    if admin_product_ids is not None and product_id not in admin_product_ids:
        raise HTTPException(status_code=403, detail="You don't have access to manage this product")
    
    # Revoke access for each user.
    # If the product is role-assigned and the user has the same role, record an exclusion.
    updated_count = 0
    for user_id in data.user_ids:
        user = await db.users.find_one({"id": user_id, "is_master_admin": {"$ne": True}})
        if not user:
            continue

        update_ops = {"$pull": {"assigned_products": product_id}}
        if user.get("role") and user["role"] in (product.get("assigned_roles") or []):
            update_ops["$addToSet"] = {"excluded_products": product_id}

        result = await db.users.update_one({"id": user_id, "is_master_admin": {"$ne": True}}, update_ops)
        if result.modified_count > 0:
            updated_count += 1
    
    return {
        "success": True,
        "message": f"Product access revoked from {updated_count} users",
        "product_id": product_id
    }


@router.get("/product-access/my-products")
async def get_my_product_access(current_user: dict = Depends(get_current_user)):
    """Get current user's product access"""
    assigned_product_ids = await get_user_product_ids(current_user)
    is_master_admin = current_user.get("is_master_admin", False)

    if is_master_admin:
        all_products = await db.products.find({}, {"_id": 0}).to_list(1000)
        return {
            "has_all_access": True,
            "assigned_products": all_products,
            "assigned_product_ids": [p["id"] for p in all_products]
        }

    if not assigned_product_ids:
        return {
            "has_all_access": False,
            "assigned_products": [],
            "assigned_product_ids": []
        }

    assigned_products = await db.products.find(
        {"id": {"$in": assigned_product_ids}},
        {"_id": 0}
    ).to_list(100)

    return {
        "has_all_access": False,
        "assigned_products": assigned_products,
        "assigned_product_ids": assigned_product_ids
    }
