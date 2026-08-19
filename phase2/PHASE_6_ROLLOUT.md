# Phase 6 — SaaS Operations & PaaS Readiness: Deploy Guide

Builds on Phases 0–5.

## What changed

- **Usage tracking**: `usage_logs` + `TenantContextMiddleware` (JWT tenant_id) + `UsageMiddleware` (every `/api/*` request) + `GET /usage/summary` (totals, by_endpoint/status/day/user) + `GET /usage/logs` (paginated) + `check_quota()` hook + Usage Dashboard page (period, KPIs, daily bars, recent logs). Retention 30 days (configurable via `tenants.feature_flags`).
- **Billing**: `subscriptions` (tenant unique, plan/status/provider) + `billing_events` + `billing_providers` registry (Stripe/PayPal stubs, no SDK calls) + `POST /billing/webhook/{provider}` (logs + updates subscription) + `GET/POST /billing/subscriptions` (platform, syncs `tenants.subscription_plan`) + Billing page.
- **Extensions**: `extensions/registry.py` (hook decorator, `trigger()`, `list_extensions()`), `GET /extensions`, `extensions/sample_hello` (post_create:companies + validate:invoice), `docs/EXTENSIONS.md`.
- **API versioning**: `/api/v2` POC (`GET /api/v2/health` + `/api/v2/tenants` + `/api/v2/products` with v2 envelope), `DeprecationMiddleware` (adds `Deprecation`, `Sunset` (+180d default, `SUNSET_DATE` env) and `Link` on every `/api/v1/*`), `docs/API_VERSIONING.md`.
- **White-label**: `TenantResolverMiddleware` (header `X-Tenant-Slug` → subdomain of `WHITE_LABEL_BASE_DOMAIN` → JWT fallback), `X-Resolved-Tenant` echo, `docs/WHITE_LABEL.md`.

## Deploy sequence

1. Backup the DB.
2. Apply migrations (hand-applied, not idempotent):
   ```bash
   21_usage_logs.sql       # usage_logs
   22_subscriptions.sql    # subscriptions + billing_events
   ```
   (Migrations 15–20 from Phases 4–5 should already be applied.)
3. Env:
   ```
   WHITE_LABEL_BASE_DOMAIN=logitrack.example.com   # for subdomain resolution (optional)
   SUNSET_DATE=2027-02-10                          # override default v1 Sunset (optional)
   CORS_ORIGINS=https://*.logitrack.example.com,https://dashboard.infoeight.com
   ```
   Billing webhooks need no keys in stub mode; real Stripe/PayPal would need `STRIPE_WEBHOOK_SECRET` etc.
4. Deploy backend + restart.
5. Smoke test:
   - `GET /api/v1/usage/summary` (after a few API calls) → totals >0; `GET /api/v1/usage/logs` → recent rows.
   - `GET /api/v1/extensions` → lists `sample_hello`.
   - `POST /billing/webhook/stripe` with `{"type":"customer.subscription.updated","data":{"object":{"id":"sub_test","status":"past_due"}}}` → inserts `billing_events` row.
   - `GET /api/v1/api/v1/test` (any v1 endpoint) → response has `Deprecation: true`, `Sunset`, `Link: </api/v2/...>`.
   - `GET /api/v2/health` → `{"status":"ok","version":"v2"}`; `GET /api/v2/tenants` → `{"data":[...],"meta":{"version":"v2"}}`.
   - `curl -H "X-Tenant-Slug: acme" /api/v1/tenant/config` → resolves acme tenant; `curl -H "Host: acme.logitrack.example.com" ...` with `WHITE_LABEL_BASE_DOMAIN` set → same.
6. Deploy frontend (Usage Dashboard, Billing pages; `REACT_APP_BACKEND_URL` still `/api/v1` until v2 migration).

## Behavior notes

- Usage logging is fire-and-forget (never fails the request); sizes from `content-length` headers.
- Billing stubs return fake checkout/portal URLs (`https://checkout.stripe.test/...`); webhooks are stub-verified (accept anything).
- Extensions are in-process; `clear_registry()` is for tests.
- v2 is proof-of-concept only — real resources will migrate incrementally.

## Rollback

Restore from backup (migrations 21–22 additive but not idempotent).

## Tests

```bash
cd backend
python -m pytest backend/tests/test_phase6_platform.py -v  # 9 tests
python -m pytest backend/tests -v                            # 118 tests, DB-free
```

Frontend: `npm run build` green.
