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
        await session.commit()
        await session.refresh(tenant)
    return _to_dict(tenant)


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
