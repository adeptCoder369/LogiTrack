"""Tenant resolver (Phase 6E — white-label).

Resolution order:
1) X-Tenant-Slug header (for API/mobile — most explicit)
2) Subdomain of Host (e.g. acme.logitrack.example.com → slug "acme")
   against WHITE_LABEL_BASE_DOMAIN (e.g. "logitrack.example.com")
3) JWT tenant_id claim (fallback, existing behavior)

Sets request.state.tenant_slug / tenant_id for downstream use.
UsageMiddleware and the tenant-scoped queries will pick these up; existing
JWT-only flow is unchanged (backwards compatible).
"""
import os
import logging

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger(__name__)

WHITE_LABEL_BASE_DOMAIN = os.environ.get("WHITE_LABEL_BASE_DOMAIN", "")


class TenantResolverMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Preserve if already set by an outer middleware (none today)
        if not hasattr(request.state, "tenant_slug"):
            request.state.tenant_slug = None
        if not hasattr(request.state, "tenant_id"):
            request.state.tenant_id = getattr(request.state, "tenant_id", None)

        # 1) Header
        header_slug = request.headers.get("x-tenant-slug") or request.headers.get("X-Tenant-Slug")
        if header_slug:
            request.state.tenant_slug = header_slug.strip().lower()
            # Best-effort: resolve slug → tenant_id for logging (fire-and-forget, no DB hit here to keep middleware fast;
            # the downstream tenant middleware will resolve it properly via JWT/DB if needed)
            logger.debug("tenant resolver: header slug=%s", request.state.tenant_slug)

        # 2) Subdomain (only if no header and base domain is configured)
        if not request.state.tenant_slug and WHITE_LABEL_BASE_DOMAIN:
            host = request.headers.get("host", "").split(":")[0].lower()
            base = WHITE_LABEL_BASE_DOMAIN.lower().lstrip(".")
            if host and host != base and host.endswith("." + base):
                subdomain = host[: -len("." + base)].split(".")[0]
                if subdomain and subdomain != "www":
                    request.state.tenant_slug = subdomain
                    logger.debug("tenant resolver: subdomain slug=%s host=%s", subdomain, host)

        # 3) JWT fallback is handled by TenantContextMiddleware downstream,
        # which decodes the Authorization header and fills tenant_id.

        response = await call_next(request)
        # Echo the resolved slug for debugging (optional, harmless)
        if getattr(request.state, "tenant_slug", None):
            response.headers["X-Resolved-Tenant"] = request.state.tenant_slug
        return response
