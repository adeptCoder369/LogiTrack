# White-Label — LogiTrack Pro

Phase 6E packages LogiTrack for branded per-tenant deployments.

## How it works

### Tenant resolution (runtime)

`TenantResolverMiddleware` (outermost) sets `request.state.tenant_slug` before any tenant-scoped query runs. Order:

1. **`X-Tenant-Slug` header** — for API/mobile clients. Most explicit; `fetch(..., {headers: {"X-Tenant-Slug": "acme"}})`.
2. **Subdomain** — `acme.logitrack.example.com` → slug `acme` when `WHITE_LABEL_BASE_DOMAIN=logitrack.example.com`. `www` is ignored.
3. **JWT `tenant_id` claim** — existing fallback (`TenantContextMiddleware` decodes the bearer token). Backwards compatible; no header/subdomain needed for normal logins.

`request.state.tenant_slug` is echoed as `X-Resolved-Tenant` on the response for debugging.

### Branding tokens

All branding flows from `tenants.branding` JSON (already tenant-scoped):

```json
{
  "name": "Acme Logistics",
  "logo": "https://cdn.example.com/acme/logo.png",
  "primary": "222 47% 11%",
  "accent": "24 95% 53%"
}
```

- Frontend `ThemeProvider` maps `primary`/`accent` → shadcn CSS vars (`--primary`, `--accent`, `--ring`, `--chart-1/2`) at runtime.
- `document.title` becomes `"{name} | LogiTrack Pro"`.
- `Sidebar` shows `branding.logo` + `branding.name` (falls back to InfoEIGHT/IBRMCO).

No code change needed to rebrand — just update the tenant row:

```sql
UPDATE tenants SET branding = JSON_OBJECT('name','Acme','logo','https://...','primary','210 90% 40%') WHERE slug='acme';
```

### Deploying a branded instance

1. **DNS**: `CNAME acme.logitrack.example.com → <your ALB / Vercel / CloudFront>`.
2. **TLS**: wildcard `*.logitrack.example.com` (Let's Encrypt / ACM) or per-tenant cert.
3. **Env**:
   ```
   WHITE_LABEL_BASE_DOMAIN=logitrack.example.com
   CORS_ORIGINS=https://*.logitrack.example.com,https://dashboard.infoeight.com
   REACT_APP_BACKEND_URL=https://acme.logitrack.example.com/api/v1
   ```
4. **Tenant row**: `slug` must match the subdomain label (`acme`).
5. **Frontend**: no rebuild per tenant needed if `REACT_APP_BACKEND_URL` is injected at deploy; otherwise rebuild with the tenant's backend URL.

### Header vs subdomain

| Method | Use case | DNS | CORS |
|--------|----------|-----|------|
| `X-Tenant-Slug` | API, mobile, `fetch` | None | None |
| Subdomain | Browser white-label | CNAME + wildcard TLS | Add `https://*.base` to `CORS_ORIGINS` |
| JWT fallback | Normal login | None | None |

All three coexist; header wins, then subdomain, then JWT. Existing installs with no header/subdomain keep working (JWT path).

### Audit

- `GET /api/v1/tenant/config` already returns `branding` + `feature_flags` + `subscription_plan` — the single source for the UI.
- No hard-coded strings remain in `Sidebar.jsx` (all via `tenant.branding`).
