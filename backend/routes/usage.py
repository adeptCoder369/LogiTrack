"""Usage tracking endpoints (Phase 6A)."""
from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional
from datetime import datetime, timezone, timedelta
from collections import Counter, defaultdict

from .db_compat import db
from auth_utils import get_current_user

router = APIRouter(tags=["Usage"])


def _require_usage_view(user: dict):
    # Master admin sees all; others need explicit permission
    from auth_utils import check_permission
    # check_permission is async; caller should await it, but this helper is sync.
    # We do the check inline in handlers instead.
    pass


@router.get("/usage/summary")
async def get_usage_summary(
    days: int = Query(30, ge=1, le=90),
    current_user: dict = Depends(get_current_user),
):
    from auth_utils import check_permission
    await check_permission(current_user, "Usage (View)")

    is_master = current_user.get("is_master_admin")
    tenant_id = current_user.get("tenant_id")
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    # Fetch logs in window (db_compat to_list caps at n; fetch 10k max)
    if is_master:
        logs = await db.usage_logs.find({"created_at": {"$gte": since}}, {"_id": 0}).to_list(10000)
    else:
        logs = await db.usage_logs.find({"tenant_id": tenant_id, "created_at": {"$gte": since}}, {"_id": 0}).to_list(10000)

    total = len(logs)
    by_endpoint = dict(Counter(l.get("path") for l in logs))
    by_status = dict(Counter(str(l.get("status_code")) for l in logs))
    by_day = defaultdict(int)
    for l in logs:
        day = (l.get("created_at") or "")[:10]
        by_day[day] += 1

    # Top users
    by_user = dict(Counter(l.get("user_id") for l in logs if l.get("user_id")))

    return {
        "days": days,
        "total_requests": total,
        "by_endpoint": by_endpoint,
        "by_status": by_status,
        "by_day": dict(sorted(by_day.items())),
        "by_user": by_user,
        "tenant_id": None if is_master else tenant_id,
    }


@router.get("/usage/logs")
async def get_usage_logs(
    days: int = Query(7, ge=1, le=90),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=10, le=500),
    current_user: dict = Depends(get_current_user),
):
    from auth_utils import check_permission
    await check_permission(current_user, "Usage (View)")

    is_master = current_user.get("is_master_admin")
    tenant_id = current_user.get("tenant_id")
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    query = {"created_at": {"$gte": since}}
    if not is_master:
        query["tenant_id"] = tenant_id

    skip = (page - 1) * page_size
    logs = await db.usage_logs.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(page_size).to_list(page_size)
    total = await db.usage_logs.count_documents(query)

    return {
        "logs": logs,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.get("/usage/quota-check")
async def quota_check(
    key: str = Query("max_requests_per_day"),
    current_user: dict = Depends(get_current_user),
):
    from auth_utils import check_permission
    await check_permission(current_user, "Usage (View)")
    from middleware.usage import check_quota
    tenant_id = current_user.get("tenant_id")
    # Demo limit from feature_flags or 10000
    from tenant import DEFAULT_FEATURE_FLAGS
    # Try to read tenant flags (best-effort)
    limit = None
    try:
        from tenant import _tenant_flags_var
        flags = _tenant_flags_var.get() or {}
        limit = flags.get(key)
    except Exception:
        pass
    if limit is None:
        limit = DEFAULT_FEATURE_FLAGS.get(key)

    under = check_quota(tenant_id, key, limit)
    return {"quota_key": key, "limit": limit, "under_quota": under}
