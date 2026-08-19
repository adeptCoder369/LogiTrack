# API Versioning — LogiTrack Pro

Phase 6D introduces dual-version support (`/api/v1` + `/api/v2` proof-of-concept) and a deprecation policy.

## Strategy

- **Prefix versioning**: `APIRouter(prefix="/api/v1")` for v1, `APIRouter(prefix="/api/v2")` for v2. Both are mounted on the same FastAPI app; shared auth/tenant middleware applies to both.
- **Additive, no renames** in v1 (per cross-cutting conventions). v2 may reshape envelopes (see POC diff below).
- **Sunset**: every `/api/v1/*` response carries `Deprecation: true`, `Sunset: <date>` (env `SUNSET_DATE`, default 6 months from deploy) and `Link: </api/v2/...>; rel="successor-version"`. Clients should migrate before `Sunset`.
- **Deprecation middleware**: `middleware/deprecation.py:DeprecationMiddleware` — adds headers, does not block.

## v1 → v2 POC diff

| Endpoint | v1 shape | v2 shape |
|----------|----------|----------|
| `GET /tenants` | `[...]` | `{"data": [...], "meta": {"version": "v2"}}` |
| `GET /products` | `[...]` | `{"data": [...], "meta": {"version": "v2"}}` + each product has `_v: 2` |
| `GET /health` | `{"message": "LogiTrack Pro API v2.1 ..."}` at `/` | `{"status": "ok", "version": "v2"}` at `/api/v2/health` |

Real v2 will incrementally move resources (e.g. `POST /api/v2/invoices` with new fields) while v1 stays frozen.

## Client migration checklist

1. Change `REACT_APP_BACKEND_URL` from `.../api/v1` to `.../api/v2` when ready (frontend `lib/api.js` is the single base).
2. Handle the v2 envelope (`data` + `meta`) where it differs.
3. Watch `Deprecation`/`Sunset` headers in v1 responses; plan to switch before `Sunset`.
4. Webhooks/clients that hard-code `/api/v1` paths need the same prefix bump.

## Sunset policy

- `SUNSET_DATE` env overrides the default (6 months). Announce the date in release notes; after it, v1 routes may return `410 Gone` with a `Link` to v2.
- No breaking renames in v1 until Sunset.
