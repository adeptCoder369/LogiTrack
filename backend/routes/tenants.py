"""Tenant management (platform / master admin) + tenant config endpoint."""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from database import AsyncSessionLocal
from sqlalchemy import select, update
import models_sqlalchemy as sql_models
from auth_utils import get_current_user
from tenant import get_tenant_config

router = APIRouter(tags=["Tenants"])


def _require_master_admin(user: dict) -> None:
    # Explicit flag check, never check_permission: the Management role
    # bypasses every permission, so a role-based gate would let any
    # Management user manage tenants.
    if not user.get("is_master_admin"):
        raise HTTPException(status_code=403, detail="Master admin access required")


class TenantCreate(BaseModel):
    name: str
    slug: str
    subscription_plan: Optional[str] = None
    branding: Optional[dict] = None
    feature_flags: Optional[dict] = None
    owner_name: Optional[str] = None
    owner_mobile: Optional[str] = None
    owner_email: Optional[str] = None


class TenantUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    status: Optional[str] = None
    subscription_plan: Optional[str] = None
    branding: Optional[dict] = None
    feature_flags: Optional[dict] = None


def _to_dict(tenant) -> dict:
    return {
        "id": tenant.id,
        "name": tenant.name,
        "slug": tenant.slug,
        "status": tenant.status,
        "subscription_plan": tenant.subscription_plan,
        "branding": tenant.branding or {},
        "feature_flags": tenant.feature_flags or {},
        "created_at": tenant.created_at.isoformat() if tenant.created_at else None,
    }


@router.get("/tenant/config")
async def tenant_config(current_user: dict = Depends(get_current_user)):
    """Branding + flags + plan for the authenticated user's tenant."""
    return await get_tenant_config(current_user)


@router.get("/tenants")
async def list_tenants(current_user: dict = Depends(get_current_user)):
    _require_master_admin(current_user)
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(sql_models.Tenant).order_by(sql_models.Tenant.created_at))
        tenants = result.scalars().all()
    return [_to_dict(t) for t in tenants]


@router.post("/tenants")
async def create_tenant(data: TenantCreate, current_user: dict = Depends(get_current_user)):
    _require_master_admin(current_user)
    # owner validation — A (OTP first-login): if one is given both are required
    owner_name = (data.owner_name or "").strip() if data.owner_name else None
    owner_mobile_raw = (data.owner_mobile or "").strip() if data.owner_mobile else None
    owner_email = (data.owner_email or "").strip() if data.owner_email else None
    if (owner_name or owner_mobile_raw) and not (owner_name and owner_mobile_raw):
        raise HTTPException(status_code=400, detail="Owner name and mobile are both required when provisioning owner login")
    owner_mobile = None
    if owner_mobile_raw:
        digits = "".join(filter(str.isdigit, owner_mobile_raw))
        if len(digits) == 10:
            owner_mobile = f"91{digits}"
        elif len(digits) == 12 and digits.startswith("91"):
            owner_mobile = digits
        else:
            raise HTTPException(status_code=400, detail="Owner mobile must be 10 digits")
    async with AsyncSessionLocal() as session:
        existing = (await session.execute(
            select(sql_models.Tenant).where(sql_models.Tenant.slug == data.slug)
        )).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=400, detail="Tenant slug already exists")
        tenant = sql_models.Tenant(
            id=str(uuid.uuid4()),
            name=data.name,
            slug=data.slug,
            status="active",
            subscription_plan=data.subscription_plan,
            branding=data.branding or {},
            feature_flags=data.feature_flags or {},
            created_at=datetime.now(timezone.utc),
        )
        session.add(tenant)
        await session.flush()  # get tenant.id for FK before commit
        owner_user = None
        if owner_mobile:
            # per-tenant duplicate check (new tenant has no users yet, but guard anyway)
            dup = (await session.execute(
                select(sql_models.User).where(
                    sql_models.User.tenant_id == tenant.id,
                    sql_models.User.mobile == owner_mobile,
                )
            )).scalar_one_or_none()
            if dup:
                raise HTTPException(status_code=400, detail="Owner mobile already exists in this tenant")
            owner_user = sql_models.User(
                id=str(uuid.uuid4()),
                tenant_id=tenant.id,
                name=owner_name,
                mobile=owner_mobile,
                country_code="91",
                password="",
                password_set=False,
                role="Management",
                email=owner_email,
                otp_verified=False,
                is_master_admin=False,
                assigned_products=[],
                assigned_depots=[],
                excluded_products=[],
                excluded_depots=[],
                created_by=current_user.get("id"),
                created_at=datetime.now(timezone.utc),
            )
            session.add(owner_user)
        await session.commit()
        await session.refresh(tenant)
    result = _to_dict(tenant)
    if owner_mobile:
        result["owner"] = {
            "id": owner_user.id,
            "name": owner_name,
            "mobile": owner_mobile,
            "email": owner_email,
            "role": "Management",
            "password_set": False,
        }
    return result


@router.put("/tenants/{tenant_id}")
async def update_tenant(tenant_id: str, data: TenantUpdate, current_user: dict = Depends(get_current_user)):
    _require_master_admin(current_user)
    update_data = {}
    for field in ("name", "slug", "status", "subscription_plan", "branding", "feature_flags"):
        value = getattr(data, field)
        if value is not None:
            update_data[field] = value
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    async with AsyncSessionLocal() as session:
        tenant = (await session.execute(
            select(sql_models.Tenant).where(sql_models.Tenant.id == tenant_id)
        )).scalar_one_or_none()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        if "slug" in update_data and update_data["slug"] != tenant.slug:
            duplicate = (await session.execute(
                select(sql_models.Tenant).where(sql_models.Tenant.slug == update_data["slug"])
            )).scalar_one_or_none()
            if duplicate and duplicate.id != tenant_id:
                raise HTTPException(status_code=400, detail="Tenant slug already exists")
        await session.execute(
            update(sql_models.Tenant).where(sql_models.Tenant.id == tenant_id).values(**update_data)
        )
        await session.commit()
        await session.refresh(tenant)
    return _to_dict(tenant)
