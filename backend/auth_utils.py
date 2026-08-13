from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timezone
from typing import List, Optional, Set
import json
import logging
import os
import jwt
import bcrypt
from sqlalchemy import func

from database import engine, AsyncSessionLocal, get_db
from models_sqlalchemy import User, OTP, Product, Depot, Permission
from config import JWT_SECRET, JWT_ALGORITHM, PERMISSION_DEFAULTS, normalize_role_name, normalize_permission_map
from tenant import set_tenant_scope, ensure_tenant_active, tenant_filter

security = HTTPBearer()

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def normalize_mobile(mobile: str, country_code: str = "91") -> str:
    mobile_numeric = ''.join(filter(str.isdigit, str(mobile)))
    country_code = str(country_code or "91").strip()

    if mobile_numeric.startswith("0") and len(mobile_numeric) == 11:
        mobile_numeric = mobile_numeric[1:]

    if len(mobile_numeric) == 10:
        return f"{country_code}{mobile_numeric}"

    if mobile_numeric.startswith(country_code) and len(mobile_numeric) > len(country_code):
        return mobile_numeric

    return mobile_numeric

def create_token(user_data: dict) -> str:
    payload = {
        "user_id": user_data["id"],
        "mobile": user_data["mobile"],
        "role": user_data["role"],
        "name": user_data["name"],
        "tenant_id": user_data.get("tenant_id"),
        "exp": datetime.now(timezone.utc).timestamp() + 86400 * 7
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def load_user_by_id(user_id: str) -> dict:
    async with AsyncSessionLocal() as session:
        from sqlalchemy import select
        result = await session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return {
            "id": user.id,
            "tenant_id": user.tenant_id,
            "name": user.name,
            "mobile": user.mobile,
            "country_code": user.country_code,
            "role": user.role,
            "email": user.email,
            "depot_id": user.depot_id,
            "company_id": user.company_id,
            "transporter_id": user.transporter_id,
            "transporter_name": user.transporter_name,
            "assigned_products": user.assigned_products,
            "assigned_depots": user.assigned_depots,
            "excluded_products": user.excluded_products,
            "excluded_depots": user.excluded_depots,
            "otp_verified": user.otp_verified,
            "password_set": user.password_set,
            "is_master_admin": user.is_master_admin,
        }


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = decode_token(credentials.credentials)
    user = await load_user_by_id(payload["user_id"])
    set_tenant_scope(user)
    await ensure_tenant_active(user)
    return user


DOWNLOAD_TOKEN_TTL_SECONDS = 1800
DOWNLOAD_TOKEN_SCOPE = "download"
optional_security = HTTPBearer(auto_error=False)

# Enforced by default. A packaged Capacitor build ships its JS inside the
# installed app, so devices still on an older build send no `?t=` and would lose
# images and downloads the moment this turns on. Set DOWNLOAD_AUTH_ENFORCED=false
# for the length of the mobile rollout: requests are still served, but each one
# is logged as "download auth bypassed", so the log going quiet tells you every
# client has updated and it is safe to remove the flag.
DOWNLOAD_AUTH_ENFORCED = os.environ.get(
    'DOWNLOAD_AUTH_ENFORCED', 'true'
).strip().lower() not in {'0', 'false', 'no'}


def create_download_token(user_id: str) -> str:
    return jwt.encode(
        {
            "user_id": user_id,
            "scope": DOWNLOAD_TOKEN_SCOPE,
            "exp": datetime.now(timezone.utc).timestamp() + DOWNLOAD_TOKEN_TTL_SECONDS,
        },
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )


async def get_download_user(
    t: Optional[str] = None,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_security),
):
    """Authenticate an endpoint the browser loads directly.

    `<img src>` and `window.open` cannot set an Authorization header, so these
    endpoints also accept a short-lived, download-scoped token as `?t=`.

    A normal access token is honoured only from the header, never from the query
    string -- so a full-privilege 7-day token can never land in an nginx access
    log, browser history, or a Referer header. Only the 30-minute download-scoped
    token may travel in a URL, and it is rejected everywhere else.
    """
    try:
        if credentials and credentials.credentials:
            token, scope_required = credentials.credentials, False
        elif t:
            token, scope_required = t, True
        else:
            raise HTTPException(status_code=401, detail="Not authenticated")

        payload = decode_token(token)
        if scope_required and payload.get("scope") != DOWNLOAD_TOKEN_SCOPE:
            raise HTTPException(status_code=401, detail="Invalid download token")
        return await load_user_by_id(payload["user_id"])
    except HTTPException as exc:
        if DOWNLOAD_AUTH_ENFORCED:
            raise
        logging.warning("download auth bypassed (%s) - client has not been updated", exc.detail)
        return None

async def fetch_permissions():
    async with AsyncSessionLocal() as session:
        from sqlalchemy import select
        result = await session.execute(select(Permission).where(Permission.id == "role_permissions"))
        perm_doc = result.scalar_one_or_none()
        if not perm_doc:
            return PERMISSION_DEFAULTS
        # Merge over the defaults so a permission key added in code still
        # resolves against a stored row written before it existed. This mirrors
        # GET /api/permissions, so the UI and this check see the same map.
        return {**PERMISSION_DEFAULTS, **normalize_permission_map(perm_doc.permissions)}

async def check_permission(user: dict, permission_key: str):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    if user.get("role") == "Management":
        return True

    from config import PERMISSION_DEFAULTS
    perm_doc = await fetch_permissions()
    permissions = perm_doc if perm_doc else PERMISSION_DEFAULTS

    # Normalize so a legacy stored role ("Depot Manager") matches the
    # normalized keys fetch_permissions() returns, the way the frontend does.
    user_role = normalize_role_name(user.get("role"))
    permission_map = permissions.get(permission_key, {})

    # Only the caller's own role decides. Testing permission_map["Admin"] here
    # asked "is this permission enabled for Admin", not "is this user an Admin"
    # -- and every key grants Admin, so every role passed every check.
    if permission_map.get(user_role):
        return True

    raise HTTPException(status_code=403, detail="Permission denied")

def build_transporter_filter(user: dict, transporter_field: str = "transporter_id") -> dict:
    if user.get("role") != "Transporter":
        return {}

    transporter_id = user.get("transporter_id")
    if not transporter_id:
        return {transporter_field: {"$in": []}}

    return {transporter_field: transporter_id}

async def ensure_transporter_access(user: dict, transporter_id: str | None) -> None:
    if user.get("role") != "Transporter":
        return

    if not transporter_id:
        raise HTTPException(status_code=403, detail="Transporter access is not configured")

    if user.get("transporter_id") != transporter_id:
        raise HTTPException(status_code=403, detail="You do not have access to this transporter")

def require_permission(permission_key: str):
    async def permission_checker(current_user: dict = Depends(get_current_user)):
        await check_permission(current_user, permission_key)
        return current_user
    return permission_checker

def role_in_assigned_roles(column, role: str):
    """Array-containment test for a JSON list column holding role names.

    SQLAlchemy's generic JSON type has no containment operator, so
    `column.contains([role])` falls through to a LIKE against the serialized
    JSON and only matches single-element arrays -- anything assigned to two or
    more roles silently stops matching. JSON_CONTAINS is real containment and
    mirrors the in-Python `role in (x.get("assigned_roles") or [])` checks used
    by the product-access and depot-access routes.
    """
    return func.json_contains(column, json.dumps(role)) == 1


async def get_user_product_ids(user: dict) -> Optional[List[str]]:
    if user.get("is_master_admin"):
        return None

    assigned_products = set(user.get("assigned_products") or [])
    excluded_products = set(user.get("excluded_products") or [])
    role = user.get("role")

    role_products: Set[str] = set()
    if role:
        async with AsyncSessionLocal() as session:
            from sqlalchemy import select
            stmt = select(Product.id).where(role_in_assigned_roles(Product.assigned_roles, role))
            tfilter = tenant_filter(Product)
            if tfilter is not None:
                stmt = stmt.where(tfilter)
            result = await session.execute(stmt)
            role_products = {row[0] for row in result.all()}

    effective_products = assigned_products.union(role_products.difference(excluded_products))
    return list(effective_products)

async def get_user_depot_ids(user: dict) -> Optional[List[str]]:
    if user.get("is_master_admin"):
        return None

    assigned_depots = set(user.get("assigned_depots") or [])
    excluded_depots = set(user.get("excluded_depots") or [])
    role = user.get("role")

    role_depots: Set[str] = set()
    if role:
        async with AsyncSessionLocal() as session:
            from sqlalchemy import select
            stmt = select(Depot.id).where(role_in_assigned_roles(Depot.assigned_roles, role))
            tfilter = tenant_filter(Depot)
            if tfilter is not None:
                stmt = stmt.where(tfilter)
            result = await session.execute(stmt)
            role_depots = {row[0] for row in result.all()}

    effective_depots = assigned_depots.union(role_depots.difference(excluded_depots))
    return list(effective_depots)

async def build_depot_filter(user: dict, depot_field: str = "depot_id") -> dict:
    depot_ids = await get_user_depot_ids(user)

    if depot_ids is None:
        return {}

    if not depot_ids:
        return {depot_field: {"$in": []}}

    return {depot_field: {"$in": depot_ids}}

async def check_depot_access(user: dict, depot_id: str) -> bool:
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
    product_ids = await get_user_product_ids(user)

    if product_ids is None:
        return {}

    if not product_ids:
        return {product_field: {"$in": []}}

    return {product_field: {"$in": product_ids}}

async def check_product_access(user: dict, product_id: str) -> bool:
    product_ids = await get_user_product_ids(user)

    if product_ids is None:
        return True

    if product_id not in product_ids:
        raise HTTPException(
            status_code=403,
            detail=f"You don't have access to this product"
        )
    return True