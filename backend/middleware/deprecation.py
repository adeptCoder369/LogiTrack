"""Deprecation middleware (Phase 6D).

Adds Sunset/Deprecation headers to every /api/v1 response so clients can
migrate before v1 is removed. Sunset is 6 months from deployment (configurable
via SUNSET_DATE env).
"""
import os
from datetime import datetime, timezone, timedelta

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

SUNSET_DATE = os.environ.get("SUNSET_DATE") or (datetime.now(timezone.utc) + timedelta(days=180)).strftime("%Y-%m-%d")


class DeprecationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)
        if request.url.path.startswith("/api/v1/"):
            response.headers["Deprecation"] = "true"
            response.headers["Sunset"] = SUNSET_DATE
            response.headers["Link"] = f'</api/v2{request.url.path[7:]}>; rel="successor-version"'
        return response
