# Phase 2 Plan — LogiTrack Pro: SaaS/PaaS Upgrade

## 1. Current Architecture Snapshot (Phase 1)

**Backend** (FastAPI + SQLAlchemy async + MySQL):
- `backend/server.py` (1787 lines): auth/OTP (MSG91), master-admin seeding, exports (Excel/PDF), bulk imports, analytics, uploads — includes 18 routers from `backend/routes/` (companies, transporters, trucks, products, depots, delivery_orders, liftings, pickups, purchase_orders, permissions, product_access, depot_access, verified_trucks, company_inventory, reports, railway_*).
- `routes/db_compat.py`: Mongo-style API (`db.<collection>.find()`) over SQLAlchemy/MySQL — used by nearly all routes; `aggregate()` is a stub returning `[]`.
- Auth: JWT (7d, HS256) + OTP; admin-provisioned accounts only; `is_master_admin` flag; Management role bypasses permission checks (`auth_utils.py:166`).
- Access model: role matrix `PERMISSION_DEFAULTS` (`config.py`) + `permissions` table; per-user product/depot access = `assigned_*` ∪ role-derived (`assigned_roles` on Product/Depot) − `excluded_*` (`auth_utils.py:225-310`).
- **Gaps found**: PO "source" is stored in `depot_id`/`depot_name` + `source_type` (`purchase_orders.py:29-36`); **no source↔product mapping anywhere**; no `tenant_id` on any table; no feature flags/branding; `company_id` unused on frontend.

**Frontend** (React 18 + CRA, react-query, axios, shadcn/ui, tailwind, Capacitor, offline queue):
- Routes guarded via `ROUTE_TO_PERMISSION` (`lib/permissions.jsx:9-41`), `ProtectedRoute` (`App.js:42-63`), sidebar filtered per role (`Sidebar.jsx:89-97`).
- Source dropdowns fed by **full** depots/companies lists — not filtered by product access: `SchedulePickup.jsx:716-747`, `PurchaseOrders.jsx:983-1114`, `Pickup/FilterPanel.jsx:288-299`.
- Only `FinalDispatchVerification.jsx:753-754` applies client-side product/depot access.
- Theming: shadcn HSL vars in `index.css:30-58`; branding hard-coded ("IBRMCO", InfoEIGHT logo, `Sidebar.jsx:108,144,153`).

**Locked-in decisions** (team approval): full multi-tenant now; global product master + company overrides; mandatory depot ownership; Region>Location>Depot hierarchy; stock-transfer engine; company-specific pricing/billing.

---

## Phase 0 — Multi-Tenant Core & Platform Shell 

**Backend**
1. **`tenants` table** (new model + migration `04_tenant.sql`): `id, name, slug, status (active|suspended), subscription_plan, branding JSON, feature_flags JSON, created_at`.
2. **`tenant_id` on every table** in `models_sqlalchemy.py` (+ index) — via migration script with backfill: all existing rows → default platform tenant (seed row).
3. **Tenant middleware** (`backend/tenant.py`): JWT gains `tenant_id` claim; `get_current_user` returns tenant context; helper `scope(model)` or per-query filter; **all `db_compat` queries auto-scoped to `current_user.tenant_id`** (add a tenant-filter injection into `_build_conditions` / new `tenant_filter()` util so no route is forgotten).
4. **Master admin (platform-level)** creates tenants/users; new `tenant_admin` capability inside Management.
5. **API versioning**: keep current routes at `/api/v1/...` (prefix pass) — additive, no renames; `server.py` router prefix change + frontend base URL update in `lib/api.js:4`.
6. **Feature flags**: `feature_enabled(tenant, key)` helper + `GET /api/v1/tenant/config` returning branding + flags.
7. **Upload isolation**: prefix file storage by tenant (`uploads/{tenant_id}/...`).

**Frontend**
- `lib/auth.jsx`: store/refresh `tenant` object; expose `useTenant()`.
- `lib/api.js`: `/api/v1` base; request interceptor sends tenant context implicitly via JWT.
- **Theming hook**: map tenant `branding` (logo, colors, name) → shadcn CSS vars (already exist in `index.css:30-58`) + sidebar branding (`Sidebar.jsx:108,144`) via a `ThemeProvider`; default = current InfoEIGHT look.
- Login: tenant slug select for platform admin; existing users unaffected.

**Tests**: tenant scoping tests (user A cannot see user B's rows across every collection proxy), flag gating, versioned routes still pass existing tests.

---

## Phase 1 — Data Ownership & Source↔Product Access 

*Addresses the primary functional bug in the phase-2 PDF: source visibility by product permission.*

1. **Depot ownership**: `depots.company_id` (mandatory, FK); creation/update enforces it; list/detail endpoints filter by ownership + `get_user_depot_ids`.
2. **Source↔Product mapping** (new table `source_products`): `id, source_id, source_type (Company|Depot), product_id, active, created_by/at`. Management UI (new `SourceAccess` page or extend `ProductAccess.jsx`).
3. **Source resolver** (`auth_utils.py`): `get_user_source_ids(user)` → sources whose mapped products **intersect** the user's accessible product set (the "2 products, 1 permission" case: source stays visible if ANY mapped product is accessible). Master admin/Management → all.
4. **Apply filtering server-side** to every source dropdown/list:
   - `pickups.py` list + `SchedulePickup` options (depots+companies merged),
   - `purchase_orders.py` list (PO filtered by applicable source+product),
   - `liftings.py` loading-point lists, `verified_trucks` source field.
   - New endpoint `GET /sources?type=depot|company` returning filtered sources (drives frontend dropdowns).
5. **Editable PO Source**: explicit `source_id/source_name/source_type` columns on `purchase_orders` (migration backfills from `depot_id`/`depot_name`); source editable in create+edit; changing source revalidates product mapping (PO must match a mapped pair); **cascade update** of dependent pickups/liftings source fields.
6. **Frontend**: `SchedulePickup.jsx:716-747`, `PurchaseOrders.jsx:983-1114`, `Pickup/FilterPanel.jsx:288-299` switch from full lists to `/sources` (server-filtered); product dropdown in PO (`PurchaseOrders.jsx:1099-1114`) restricted to user's accessible products.
7. **Product master + overrides** (`product_overrides` table): per-company `code, min_stock, pricing_model, name/desc`; resolution helper `effective_product(product_id, company_id)`; UI tab on Products page.
8. **Company-specific pricing config**: `company_pricing` table (product, tier, rate, validity) — foundation consumed in Phase 4 billing.

---

## Phase 2 — Entity Model (Lead/Client/Company/Source/Firm) & Location Hierarchy 

*Addresses terminology + hierarchy requirements in the phase-2 PDF and blueprint hierarchy decision.*

1. **Location hierarchy**: `regions`, `locations` tables; `depots.location_id`; management UIs; roll-up queries for reports/analytics (`reports.py`, `company_reports`) — Region→Location→Depot→Inventory.
2. **Entity roles**: companies table gains `entity_roles` (JSON: `Lead|Client|Company|Source` — multi-role allowed, e.g. vendor that is also a client). UI: role tags on `Companies.jsx`; terminology labels (Lead/Client/Company/Source) per role.
3. **Client hierarchy**: `parent_client_id`, `client_offices` (head office + branches: `office_type, is_head_office`), `client_factories` (`product_id` per factory, max 1 factory per product); **billing parent**: PO issued by child, billed under parent (`billing_company_id` on PO).
4. **Leads**: `leads` table (type `Sales|Purchase`, linked source company, status, assigned employee, conversion → creates client + transfers access grants).
5. **Firms**: `firms` table (parent/child, head office/branches/factory mirror of client structure); **firm access grants**: `firm_access (firm_id, product_id, depot_id)` — employee access to a firm scoped to specific product×depot pairs (the PDF's "5 products, 3 depots → 1 product & 2 depots" case).
6. **Module-level client rollout**: per-client module enablement set (`client_modules`) — drives feature-flag checks (Phase 0 flags) so clients get phased module access without all users seeing everything.

---

## Phase 3 — Employee Management & Granular Access 

1. **New tables**: `employees` (internal/external, `employee_type, company_id, department_id, designation_id, login_enabled`), `departments`, `designations`.
2. **Login linkage**: `users.employee_id`; `login_enabled=false` ⇒ store employee data with **no login** (mirrors infoEIGHT behavior).
3. **Access rules** for internal employees: converted-clients only (product-wise, depot-wise), Leads scope (`Sales|Purchase|All`).
4. **UI**: new `Employees`, `Departments`, `Designations` pages (tabs internal/external); user creation in `UserManagement.jsx` gains employee picker.
5. Permission keys added to `PERMISSION_DEFAULTS` (e.g. `Employees (View/Create/...)`).

---

## Phase 4 — Invoicing, Payments & Financial Operations 

1. **Invoices**: `invoices` + `invoice_items`; generation from PO/lifting/dispatch data (source = firm, billing = parent client); statuses (Draft→Issued→Partially Paid→Paid/Overdue); GST fields; PDF (reportlab already used in `server.py:1038+`) + export-friendly CSV/Excel (`export-friendly guidelines` requirement).
2. **Payments**: `payments` (receipt no, mode, bank ref, reconciliation against invoices), `invoice_payments` ledger; outstanding/reconciliation view.
3. **Credit/Debit notes**: `credit_notes`, `debit_notes` linked to invoices; adjustment flow.
4. **Company-specific pricing application**: invoice line rates resolved from Phase 1 `company_pricing`.
5. Permissions + sidebar entries + pages (Invoices, Payments, Credit/Debit Notes) with `Can`-gated actions.

---

## Phase 5 — Stock Transfer Engine 

*Blueprint decision: inter-depot / inter-company transfers.*

1. **`stock_transfers`** (header: `from_depot/company, to_depot/company, product_id, qty, status, requested_by, approved_by, dispatched_at, received_at, notes`) + **`stock_transfer_audit`** (append-only ledger: event, actor, timestamp, payload).
2. **State machine**: `Request → Approval → Dispatch → Receive → Inventory Update` (+ `Rejected/Cancelled`); multi-level approval matrix table (`approval_matrices`: entity/product/amount thresholds → approver roles) with custom workflow.
3. **Atomic inventory effects**: on Receive — decrement source inventory, increment destination, using the pattern in `liftings.py:113 update_depot_inventory`; **inventory lock** during in-flight transfer (`locked_qty` fields on `depot_inventory`/`company_inventory`).
4. **UI**: Stock Transfer page (create/request), approvals inbox, dispatch/receive screens, audit timeline.
5. Reports: transfer ledger export.

---

## Phase 6 — SaaS Operations & PaaS Readiness 

1. **Usage tracking**: `usage_logs` (tenant_id, endpoint, user, date, payload size) via middleware; per-tenant usage dashboards; quota checks hooks.
2. **Billing integration hooks**: `billing_providers` (Stripe/PayPal placeholder interfaces), webhook stubs, `subscriptions` table linked to `tenants.subscription_plan` (Phase 0).
3. **Plugin/extension architecture**: extension registry + hook points (pre/post create/update on core entities, custom validation, custom report handlers); documented `EXTENSIONS.md`; enables the future marketplace model.
4. **API versioning complete**: `/api/v2` proof-of-concept route + deprecation policy doc.
5. **White-label packaging**: branding tokens everywhere; tenant subdomain/header routing readiness (`tenant` header or subdomain parsing middleware); docs for deploying a branded instance.

---

## Cross-Cutting Conventions (every phase)

- **Migrations**: sequential SQL in `backend/migrations/04+`; backfill scripts; run with existing `init_db` + explicit migration runner (no alembic dependency added unless requested).
- **Tests**: pytest per phase (`tests/`), following existing style (e.g. `tests/test_role_normalization.py`); tenant-isolation tests are mandatory in Phase 0.
- **Frontend**: react-query keys, `lib/api.js` API groups extended per module; shadcn components; `Can` + `hasPermission` gating for every new page/action; permission keys added to `PERMISSION_DEFAULTS` + `ROUTE_TO_PERMISSION`/`ACTION_PERMISSIONS` in lockstep.
- **Backwards compatibility**: no breaking renames; `db_compat` surface unchanged; versioned prefix additive.
- **Ruff/black** (backend venv has both) + existing lint conventions; CRA build must stay green.
