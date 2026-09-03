"""Tenant context for the multi-tenant core.

The active tenant is derived from the authenticated user on every request
(get_current_user -> set_tenant_scope) and held in a ContextVar. db_compat
auto-injects tenant_id into every query and stamps it on every insert, so
routes written against db.<collection> cannot leak across tenants.

Master admin (is_master_admin=True) runs with tenant scope None, which means
"no filter" -- platform-level visibility.
"""
import os
from contextvars import ContextVar
from typing import Optional

from fastapi import HTTPException

from database import AsyncSessionLocal

PLATFORM_TENANT_ID = os.environ.get(
    'PLATFORM_TENANT_ID', '11111111-1111-1111-1111-111111111111'
)

DEFAULT_FEATURE_FLAGS: dict = {}

_tenant_var: ContextVar = ContextVar('current_tenant_id', default=None)
_tenant_flags_var: ContextVar = ContextVar('current_tenant_flags', default=None)

MODEL_HAS_TENANT = None  # set lazily in tenant_filter to avoid import cycle


def get_current_tenant_id() -> Optional[str]:
    return _tenant_var.get()


def set_tenant_scope(user: dict) -> None:
    """Bind the request to the user's tenant (None for master admin)."""
    _tenant_var.set(None if user.get("is_master_admin") else user.get("tenant_id"))


async def _load_tenant_row(tenant_id: str):
    from sqlalchemy import select
    from models_sqlalchemy import Tenant
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Tenant).where(Tenant.id == tenant_id))
        return result.scalar_one_or_none()


async def ensure_tenant_active(user: dict) -> None:
    """Reject requests when the user's tenant is suspended.

    Also loads the tenant row (branding/flags) into the request context so
    feature_enabled() and get_tenant_config() work without another query.
    Master admin is exempt (platform tenant is always active).
    """
    if user.get("is_master_admin"):
        return
    tenant_id = user.get("tenant_id")
    if not tenant_id:
        return
    tenant = await _load_tenant_row(tenant_id)
    if tenant is None:
        raise HTTPException(status_code=401, detail="Tenant not found")
    if tenant.status and tenant.status != "active":
        raise HTTPException(status_code=403, detail="Tenant is suspended")
    _tenant_flags_var.set(tenant.feature_flags or {})


def tenant_filter(model) -> Optional[object]:
    """SQLAlchemy predicate for the current tenant, or None when unfiltered.

    Models without a tenant_id column (otps, permissions) are never filtered.
    """
    ctx = _tenant_var.get()
    if ctx is None:
        return None
    col = getattr(model, 'tenant_id', None)
    if col is None:
        return None
    return col == ctx


def tenant_id_for_current_user(user: dict) -> Optional[str]:
    """tenant_id to stamp on a new row owned by this user's tenant."""
    if user.get("is_master_admin"):
        return PLATFORM_TENANT_ID
    return user.get("tenant_id")


async def get_tenant_config(user: dict) -> dict:
    from sqlalchemy import select as _select
    import models_sqlalchemy as _models
    tenant_id = user.get("tenant_id") or PLATFORM_TENANT_ID
    tenant = await _load_tenant_row(tenant_id)
    if tenant is None:
        raise HTTPException(status_code=404, detail="Tenant config not found")
    subscription_status = None
    try:
        async with AsyncSessionLocal() as session:
            sub = (await session.execute(
                _select(_models.Subscription).where(_models.Subscription.tenant_id == tenant_id)
            )).scalar_one_or_none()
            subscription_status = sub.status if sub else None
    except Exception:
        subscription_status = None
    return {
        "tenant": {
            "id": tenant.id,
            "name": tenant.name,
            "slug": tenant.slug,
            "status": tenant.status,
            "subscription_plan": tenant.subscription_plan,
        },
        "branding": tenant.branding or {},
        "feature_flags": tenant.feature_flags or {},
        "subscription_plan": tenant.subscription_plan,
        "subscription_status": subscription_status,
    }


async def client_module_enabled(company_id: Optional[str], key: str) -> bool:
    """Per-client module flag with tenant-flag fallback (Phase 2).

    Resolution order: client_modules row -> tenant feature_flags -> global
    defaults (whitelist semantics: unknown = disabled). Company-less contexts
    fall straight through to the tenant/global check.
    """
    if company_id:
        from routes.db_compat import db as _db
        row = await _db.client_modules.find_one({
            "company_id": company_id, "module": key,
        })
        if row is not None:
            return bool(row.get("enabled", True))

    if _tenant_flags_var.get() is not None:
        flags = _tenant_flags_var.get() or {}
        if key in flags:
            return bool(flags[key])

    return bool(DEFAULT_FEATURE_FLAGS.get(key, False))


def feature_enabled(key: str) -> bool:
    """Feature flag for the current tenant, falling back to global defaults.

    Whitelist semantics: a key is enabled only when present in the tenant's
    feature_flags or in DEFAULT_FEATURE_FLAGS. Requires the tenant's flags to
    have been loaded for this request (done in get_current_user via
    ensure_tenant_active). Master admin / platform context uses the global
    defaults.
    """
    ctx = _tenant_var.get()
    if ctx is None:
        return bool(DEFAULT_FEATURE_FLAGS.get(key, False))
    flags = _tenant_flags_var.get() or {}
    return bool(flags.get(key, DEFAULT_FEATURE_FLAGS.get(key, False)))
