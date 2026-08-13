# Phase 0 — Multi-Tenant Core: Deploy & Rollout Guide

Backend: FastAPI + SQLAlchemy async + MySQL · Frontend: React 18 (CRA/craco).

## What changed

- `tenants` table + `tenant_id` on all 17 data tables (global `otps`/`permissions` unchanged).
- Tenant-scoped unique indexes: `uk_mobile`, `uk_vehicle_number`, `uk_product_code`, `uk_depot_product`, `uk_company_product` now include `tenant_id`.
- `db_compat` auto-scopes every query and auto-stamps every insert via a per-request tenant ContextVar (`backend/tenant.py`).
- Master admin (`is_master_admin=True`) runs unfiltered (platform level).
- Suspended tenants get 403 on every authenticated request (incl. exports/uploads).
- API surface moved to `/api/v1` — **clean cut, no legacy `/api` alias**.
- New endpoints: `GET /tenant/config` (any authed user), `GET/POST /tenants`, `PUT /tenants/{id}` (master admin only).
- Uploads now stored under `uploads/{tenant_id}/`; legacy files still served from the root (fallback).
- Login/OTP flows accept an optional `tenant` slug; required only when a mobile exists in multiple workspaces.

## Deploy sequence

1. **Backup the database** before anything else.

2. **Apply the migration** (hand-applied, not idempotent):
   ```bash
   mysql -u <user> -p <db> < backend/migrations/04_tenancy.sql
   ```
   This creates `tenants`, backfills all rows to the platform tenant
   (`11111111-1111-1111-1111-111111111111`), swaps the 5 global unique keys for
   tenant-scoped ones, and adds `idx_tenant` everywhere.
   Re-running it errors 1060/1091 — that is expected.

3. **Deploy the backend**. On startup it:
   - runs `init_db()` (creates any missing tables — e.g. `tenants` if the
     migration was skipped),
   - seeds the platform tenant row (`seed_platform_tenant`),
   - assigns the master admin to the platform tenant (`seed_master_admin`).

   `PLATFORM_TENANT_ID` env var overrides the default UUID; if you change it,
   change it everywhere (backend env, and the migration's backfill value).

4. **Smoke test before touching the frontend**:
   - Old tokens still authenticate (`GET /api/v1/auth/me` with an old Bearer token).
   - `GET /api/v1/tenant/config` returns branding + flags.
   - `GET /api/v1/pickups` still returns the tenant's data.
   - Master admin can `GET /api/v1/tenants`; a non-master Management user gets 403.

5. **Deploy the frontend** with `REACT_APP_BACKEND_URL` pointing at
   `https://dashboard.infoeight.com/api/v1` (code auto-upgrades a bare `/api`
   base, so old builds/`.env` files still work at the web tier).

6. **Roll out the mobile (Capacitor) builds**. Because the old `/api` paths are
   gone, **any installed build older than this release stops working** until
   updated — coordinate the store release with the API cutover, or keep a
   short-lived `/api` alias in the reverse proxy if a phased rollout is needed.

## What to watch after deploy

- **First login per tenant**: mobile numbers are unique per tenant now. A
  number that exists in 2+ tenants requires the tenant slug at login.
- **Old uploads**: served via the legacy-root fallback; no file moves needed.
- **Role-derived access** (products/depots assigned by role): now scoped to
  the user's tenant automatically.
- **Permissions matrix** (`permissions` table): still a single global row;
  per-tenant permission rows are a later phase.

## Rollback

The migration is not idempotent, so rollback = restore from backup. A code
revert alone fails: old code writes rows without `tenant_id` (NOT NULL) and
queries the old global unique keys.

## Tests

```bash
cd backend
python -m pytest tests        # 29 tests, DB-free
```

Frontend: `npm run build` must stay green (verified).
