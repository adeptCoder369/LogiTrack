"""Billing + subscription routes (Phase 6B)."""
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid
import json

from .db_compat import db
from auth_utils import get_current_user

router = APIRouter(tags=["Billing"])


class SubscriptionPayload(BaseModel):
    tenant_id: str
    plan: str
    provider: Optional[str] = None
    provider_subscription_id: Optional[str] = None
    status: str = "active"


def _require_platform(user: dict):
    if not user.get("is_master_admin"):
        raise HTTPException(status_code=403, detail="Platform admin only")


@router.get("/billing/subscriptions")
async def list_subscriptions(current_user: dict = Depends(get_current_user)):
    _require_platform(current_user)
    return await db.subscriptions.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)


@router.get("/billing/subscriptions/{tenant_id}")
async def get_subscription(tenant_id: str, current_user: dict = Depends(get_current_user)):
    # Tenant admin sees own, platform sees all
    if not current_user.get("is_master_admin") and current_user.get("tenant_id") != tenant_id:
        raise HTTPException(status_code=403, detail="Not authorized for this tenant")
    sub = await db.subscriptions.find_one({"tenant_id": tenant_id}, {"_id": 0})
    if not sub:
        # Fallback to tenants.subscription_plan
        tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        return {"tenant_id": tenant_id, "plan": tenant.get("subscription_plan"), "status": tenant.get("status"), "provider": None}
    return sub


@router.post("/billing/subscriptions")
async def create_or_update_subscription(payload: SubscriptionPayload, current_user: dict = Depends(get_current_user)):
    _require_platform(current_user)
    tenant = await db.tenants.find_one({"id": payload.tenant_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    existing = await db.subscriptions.find_one({"tenant_id": payload.tenant_id})
    now = datetime.now(timezone.utc).isoformat()

    if existing:
        await db.subscriptions.update_one(
            {"id": existing["id"]},
            {"$set": {
                "plan": payload.plan,
                "status": payload.status,
                "provider": payload.provider,
                "provider_subscription_id": payload.provider_subscription_id,
            }},
        )
        # Keep tenants.subscription_plan in sync (denormalized cache)
        await db.tenants.update_one({"id": payload.tenant_id}, {"$set": {"subscription_plan": payload.plan}})
        return await db.subscriptions.find_one({"tenant_id": payload.tenant_id}, {"_id": 0})

    sub = {
        "id": str(uuid.uuid4()),
        "tenant_id": payload.tenant_id,
        "plan": payload.plan,
        "status": payload.status,
        "provider": payload.provider,
        "provider_subscription_id": payload.provider_subscription_id,
        "current_period_start": None,
        "current_period_end": None,
        "created_at": now,
    }
    await db.subscriptions.insert_one(sub)
    await db.tenants.update_one({"id": payload.tenant_id}, {"$set": {"subscription_plan": payload.plan}})
    return sub


@router.post("/billing/checkout/{tenant_id}")
async def create_checkout(tenant_id: str, plan: str, provider: str = "stripe", current_user: dict = Depends(get_current_user)):
    _require_platform(current_user)
    from billing.providers import get_provider
    prov = get_provider(provider)
    return prov.create_checkout_session(tenant_id, plan)


@router.post("/billing/portal/{tenant_id}")
async def create_portal(tenant_id: str, provider: str = "stripe", current_user: dict = Depends(get_current_user)):
    _require_platform(current_user)
    from billing.providers import get_provider
    prov = get_provider(provider)
    return prov.create_portal_session(tenant_id)


@router.post("/billing/webhook/{provider}")
async def billing_webhook(provider: str, request: Request):
    """Webhook stub: logs the event, updates subscription status when possible."""
    try:
        payload = await request.json()
    except Exception:
        payload = {}
    signature = request.headers.get("stripe-signature") or request.headers.get("paypal-transmission-sig")

    from billing.providers import get_provider, billing_providers
    if provider not in billing_providers:
        raise HTTPException(status_code=404, detail="Unknown provider")
    prov = get_provider(provider)
    normalized = prov.handle_webhook(payload, signature)

    # Persist the raw event
    await db.billing_events.insert_one({
        "id": str(uuid.uuid4()),
        "tenant_id": payload.get("tenant_id") or normalized.get("tenant_id"),
        "provider": provider,
        "event_type": normalized.get("event_type") or "unknown",
        "payload": json.dumps(payload),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    # Best-effort subscription status sync
    provider_sub_id = normalized.get("provider_subscription_id")
    status = normalized.get("status")
    if provider_sub_id and status:
        sub = await db.subscriptions.find_one({"provider_subscription_id": provider_sub_id})
        if sub:
            await db.subscriptions.update_one({"id": sub["id"]}, {"$set": {"status": status}})

    return {"received": True, "provider": provider, "event_type": normalized.get("event_type")}
