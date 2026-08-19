"""Tenant context + usage tracking middleware (Phase 6A)."""
import time
import uuid
import logging
from datetime import datetime, timezone

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger(__name__)


class TenantContextMiddleware(BaseHTTPMiddleware):
    """Populates request.state.tenant_id / tenant_slug for downstream use.

    Resolution order (reused by the white-label TenantResolver in P6E):
    1) request.state set by later TenantResolver (header/subdomain)
    2) JWT tenant_id claim (if Authorization present)
    This minimal P6A version only handles (2) so usage logs are tenant-scoped
    even before the white-label middleware lands.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Preserve any tenant already set by an outer middleware (white-label).
        if not hasattr(request.state, "tenant_id"):
            request.state.tenant_id = None
        if not hasattr(request.state, "tenant_slug"):
            request.state.tenant_slug = None

        # Fallback: decode JWT tenant_id without verification for logging only.
        if not request.state.tenant_id:
            auth = request.headers.get("authorization") or request.headers.get("Authorization")
            if auth and auth.lower().startswith("bearer "):
                token = auth[7:].strip()
                try:
                    import jwt as _jwt
                    from config import JWT_SECRET, JWT_ALGORITHM
                    payload = _jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM], options={"verify_exp": False})
                    request.state.tenant_id = payload.get("tenant_id")
                except Exception:
                    pass

        response = await call_next(request)
        return response


class UsageMiddleware(BaseHTTPMiddleware):
    """Logs every /api/* request to usage_logs (fire-and-forget)."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if not request.url.path.startswith("/api/"):
            return await call_next(request)

        start = time.perf_counter()
        request_size = int(request.headers.get("content-length") or 0)

        response = await call_next(request)

        duration_ms = int((time.perf_counter() - start) * 1000)
        # Response size: try content-length header, else 0
        response_size = 0
        try:
            if hasattr(response, "headers") and "content-length" in response.headers:
                response_size = int(response.headers["content-length"])
        except Exception:
            pass

        # Extract tenant/user for the log (best-effort, never fails the request)
        tenant_id = getattr(request.state, "tenant_id", None)
        user_id = getattr(request.state, "user_id", None)
        # If TenantContextMiddleware decoded JWT, user_id may be in payload too
        if not user_id:
            auth = request.headers.get("authorization") or request.headers.get("Authorization")
            if auth and auth.lower().startswith("bearer "):
                try:
                    import jwt as _jwt
                    from config import JWT_SECRET, JWT_ALGORITHM
                    payload = _jwt.decode(auth[7:].strip(), JWT_SECRET, algorithms=[JWT_ALGORITHM], options={"verify_exp": False})
                    user_id = payload.get("user_id")
                    if not tenant_id:
                        tenant_id = payload.get("tenant_id")
                except Exception:
                    pass

        # Fire-and-forget insert (never raises)
        try:
            from database import AsyncSessionLocal
            import models_sqlalchemy as sql_models
            async with AsyncSessionLocal() as session:
                session.add(sql_models.UsageLog(
                    id=str(uuid.uuid4()),
                    tenant_id=tenant_id,
                    user_id=user_id,
                    method=request.method,
                    path=request.url.path,
                    status_code=response.status_code,
                    request_size=request_size,
                    response_size=response_size,
                    duration_ms=duration_ms,
                    created_at=datetime.now(timezone.utc),
                ))
                await session.commit()
        except Exception as e:
            logger.debug("usage log insert failed: %s", e)

        return response


def check_quota(tenant_id: str, key: str = "max_requests_per_day", limit: int = None) -> bool:
    """Quota hook (config-driven). Returns True if under quota, raises 429 if over.

    P6A wires the helper but does not enforce it on requests (call it from a
    dependency where needed). Limit comes from tenants.feature_flags[key] or the
    passed limit.
    """
    if limit is None:
        # Caller can pass explicit limit; otherwise treat as unlimited in v1.
        return True
    # Real enforcement would count usage_logs for the tenant in the last 24h.
    # Stub: always under quota.
    return True
