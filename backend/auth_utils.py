"""Authentication utilities"""
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timezone
from typing import List, Optional
import jwt
import bcrypt

from database import db
from config import JWT_SECRET, JWT_ALGORITHM, PERMISSION_DEFAULTS

security = HTTPBearer()

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_data: dict) -> str:
    payload = {
        "user_id": user_data["id"],
        "mobile": user_data["mobile"],
        "role": user_data["role"],
        "name": user_data["name"],
        "exp": datetime.now(timezone.utc).timestamp() + 86400 * 7
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def fetch_permissions():
    """Get current permissions from database"""
    perm_doc = await db.permissions.find_one({"id": "role_permissions"}, {"_id": 0})
    if not perm_doc:
        return PERMISSION_DEFAULTS
    return perm_doc.get("permissions", PERMISSION_DEFAULTS)

async def check_permission(user: dict, permission_key: str):
    """Check if user has a specific permission"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Management always has all permissions
    if user.get("role") == "Management":
        return True
    
    permissions = await fetch_permissions()
    has_permission = permissions.get(permission_key, {}).get(user.get("role"), False)
    
    if not has_permission:
        raise HTTPException(
            status_code=403, 
            detail=f"You don't have permission for: {permission_key}"
        )
    return True

def require_permission(permission_key: str):
    """Dependency factory for permission checking"""
    async def permission_checker(current_user: dict = Depends(get_current_user)):
        await check_permission(current_user, permission_key)
        return current_user
    return permission_checker


# ============ PRODUCT-BASED ACCESS CONTROL ============

async def get_user_product_ids(user: dict) -> Optional[List[str]]:
    """
    Get list of product IDs user has access to.
    Returns None if user has access to ALL products (Master Admin ONLY)
    Returns list of product IDs if user has specific product access
    Returns empty list if user has no product access
    """
    # ONLY Master Admin has access to all products
    if user.get("is_master_admin"):
        return None

    assigned_products = set(user.get("assigned_products", []) or [])
    excluded_products = set(user.get("excluded_products", []) or [])
    role = user.get("role")

    # Include products assigned to the user's role, unless explicitly excluded.
    role_products = set()
    if role:
        role_products = set([p["id"] for p in await db.products.find({"assigned_roles": role}, {"id": 1}).to_list(1000)])

    effective_products = assigned_products.union(role_products.difference(excluded_products))
    return list(effective_products)


async def get_user_depot_ids(user: dict) -> Optional[List[str]]:
    """
    Get list of depot IDs user has access to.
    Returns None if user has access to ALL depots (Master Admin ONLY)
    Returns list of depot IDs if user has specific depot access
    Returns empty list if user has no depot access
    """
    # ONLY Master Admin has access to all depots
    if user.get("is_master_admin"):
        return None

    assigned_depots = set(user.get("assigned_depots", []) or [])
    excluded_depots = set(user.get("excluded_depots", []) or [])
    role = user.get("role")

    # Include depots assigned to the user's role, unless explicitly excluded.
    role_depots = set()
    if role:
        role_depots = set([d["id"] for d in await db.depots.find({"assigned_roles": role}, {"id": 1}).to_list(1000)])

    effective_depots = assigned_depots.union(role_depots.difference(excluded_depots))
    return list(effective_depots)


async def build_depot_filter(user: dict, depot_field: str = "depot_id") -> dict:
    """
    Build MongoDB query filter based on user's depot access.
    Returns empty dict if user has access to all depots.
    """
    depot_ids = await get_user_depot_ids(user)

    if depot_ids is None:
        return {}

    if not depot_ids:
        return {depot_field: {"$in": []}}

    return {depot_field: {"$in": depot_ids}}


async def check_depot_access(user: dict, depot_id: str) -> bool:
    """
    Check if user has access to a specific depot.
    Raises HTTPException if access denied.
    """
    depot_ids = await get_user_depot_ids(user)
    if depot_ids is None:
        return True

    if depot_id not in depot_ids:
        raise HTTPException(
            status_code=403,
            detail=f"You don't have access to this depot"
        )
    return True
async def build_product_filter(user: dict, product_field: str = "product_id") -> dict:
    """
    Build MongoDB query filter based on user's product access.
    Returns empty dict if user has access to all products.
    """
    product_ids = await get_user_product_ids(user)
    
    if product_ids is None:
        # User has access to all products
        return {}
    
    if not product_ids:
        # User has no product access - return filter that matches nothing
        return {product_field: {"$in": []}}
    
    # Filter by assigned products
    return {product_field: {"$in": product_ids}}

async def check_product_access(user: dict, product_id: str) -> bool:
    """
    Check if user has access to a specific product.
    Raises HTTPException if access denied.
    """
    product_ids = await get_user_product_ids(user)
    
    # None means access to all
    if product_ids is None:
        return True
    
    if product_id not in product_ids:
        raise HTTPException(
            status_code=403,
            detail=f"You don't have access to this product"
        )
    return True
