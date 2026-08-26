# QA Checklist — Manual Only (Boss Handover)
> Seed: `python backend/scripts/seed_demo.py --fresh` → `demo` `48128eb0` `acme` `5c26ca7b` `PLATFORM` `11111111...`
> Users: `919000000001 Management … 919000000008 Dispatch Verifier` `Demo@123` `country_code 91` + `master 919999999999 Master@123`
> Base: `http://localhost:8000/api/v1` + `http://localhost:3000`  Hard refresh `Ctrl+Shift+R` after seed.

How to use: Login via `/login` `mobile + password + tenant slug`. For API, `POST /auth/login {mobile, password, tenant}` → `Bearer`. Check `tenant_id` in JWT at `jwt.io`.

### 0. Baseline (2 min) — must be 200 before any test
- [ ] `seed --fresh` prints `tables ensured` + `demo 4 companies 3 depots 3 products ... 3 DO 3 PO` + `acme` same
- [ ] `GET /tenant/config` (no auth) `200` branding primary/accent
- [ ] Login `demo/Management 919000000001 Demo@123 tenant=demo` → `200` `tenant_id 48128eb0`
- [ ] `GET /companies` `200 4` for demo Mgmt, `200 4` for acme Mgmt, `200 10` for master, `demo` count != `acme` proves isolation

### P0 Tenancy / White-label / Uploads
- [ ] `GET /tenants` as master `200` (demo,acme,platform) — non-master `403`
- [ ] `POST /tenants` as master create `qa-test` slug → `GET /tenants` shows it → delete/clean
- [ ] `GET /tenant/config` shows `feature_flags` `invoices/stock_transfers/leads/firms true`
- [ ] Create Company as demo Mgmt → `uploads/{tenant_id}/{file_id}` path (no `platform` leak)
- [ ] Suspend tenant via DB `status=suspended` → login `403 Tenant suspended` → reactivate

### P1 Source & Product
- [ ] `GET /products` Mgmt `3` Admin `3` Weightment `1` Depot Staff `2` (firm grant)
- [ ] `GET /depots` Mgmt `3` Weightment `3` (role+assigned) — verify `assigned_roles` includes Mgmt/Admin
- [ ] `GET /sources?type=Depot` Weightment sees `d1` (CEM) not `d2` (AGG) — `"2 products 1 permission"`; Mgmt sees all 3
- [ ] `GET /source-access` Mgmt  `4` mappings; `PUT /source-access/source/Depot/{d1}` remove `CEM` → Weightment loses `d1` → revert
- [ ] `GET /product-overrides?company_id={c_child1}` `1` + `GET /company-pricing?company_id={c_child1}` `2` → `GET /products/{p1}/effective?company_id={c_child1}` code `ACME-CEM`

### P2 Locations / Clients
- [ ] `GET /regions` `2` (North/West) `GET /locations` `3` `GET /locations/tree` nested
- [ ] `GET /locations/{l1}/overview` rollup depots/products
- [ ] Create Region → create Location under it → delete Region blocked if locations exist → delete Location → delete Region `200`
- [ ] `GET /companies/{c_child1}/offices` `2` `factories` `1`; `POST /companies/{c_child1}/offices` duplicate head-office `400`
- [ ] `PUT /companies/{c_child1}/modules` toggle `invoices false` → `GET` reflects → re-enable

### P2 Leads / Firms
- [ ] `GET /leads` `5` (Sales 3, Purchase 2) `status New,Contacted,Qualified,Converted,Lost`; `GET /leads?lead_type=Sales` filtered
- [ ] `POST /leads` as Mgmt → `PUT /leads/{id}` → `POST /leads/{id}/convert` creates new Client company → `GET /companies` +1
- [ ] `GET /firms` `2` `f1 Firm One` `f2 Firm Two child of f1`; `GET /firms/{f1}/offices` `2` `factories` `1`
- [ ] `GET /firms/{f1}/access` Weightment `2` grants `p1×d1,d2` (`5×3→1×2`); `POST .../access` grant `p2×d1` to Depot Staff → `GET` shows → `DELETE` revert

### P3 Employees
- [ ] `GET /departments` `3` `GET /designations` `4`
- [ ] `GET /employees` `6` (4 Internal 2 External) `leads_scope`
- [ ] `POST /employees` create `EMP-QA-001` `leads_scope Sales` → `GET /leads` as that employee sees only Sales (via scope) — verify via weightment linked employee `900000000004` has `firm_access`
- [ ] `POST /employees/{emp}/enable-login {name,mobile,role,company_id}` creates User `password_set false` → `POST /auth/login` with new mobile works → `POST .../unlink` reverts

### P4 Invoicing
- [ ] `GET /purchase-orders` demo Mgmt `3` (Open,In Progress,Completed)
- [ ] `POST /invoices/generate?po_id={po1}` `rate 500` → `GET /invoices` `4` (+1) status `Draft` totals correct
- [ ] `PUT /invoices/{id}` update → `POST /invoices/{id}/issue` `Issued` → `GET /invoices?status=Issued` filtered
- [ ] `POST /payments {receipt_no,... amount 5000}` → `POST /invoices/{id}/allocate?payment_id={pid} {amount_allocated:5000}` → `GET /invoices/{id}/reconciliation` `total 23600 paid 5000 outstanding 18600`
- [ ] `POST /credit-notes {invoice_id, amount 1000}` → reconciliation `outstanding -1000`; `DELETE /credit-notes/{id}` revert; same for debit
- [ ] `GET /invoices/{id}/export?format=pdf|excel` `200` `t=` download token via `POST /auth/download-token`

### P5 Stock Transfers
- [ ] `GET /approval-matrices` `2`; `GET /stock-transfers` `4` (`Requested,Approved,Dispatched,Received` + audit `4+3+2+1`)
- [ ] `POST /stock-transfers {product_id p1, quantity 15, from_type Depot from_id d1, to_type Depot to_id d2}` as Weightment → `Requested` `locked_qty 15` in `d1-p1`
- [ ] `POST /stock-transfers/{id}/approve` as Mgmt → `Approved`; as Weightment `403` (resolver `Management/Admin`)
- [ ] `POST .../dispatch` → `Dispatched` `d1 available 80→65`; `POST .../receive` → `Received` `d2 available 45→60` `locked_qty 0`
- [ ] `GET /stock-transfers/{id}/audit` `≥4` events; `GET /stock-transfers/export` `200`

### P6 Usage / Billing / Versioning
- [ ] `GET /usage/summary?days=30` `200` logs appear after any API call; `GET /usage/logs?days=7` `200`
- [ ] `GET /billing/subscriptions` master `200`; `POST /billing/subscriptions {tenant_id demo, plan pro}` → `GET /billing/subscriptions/demo` `pro`
- [ ] `POST /billing/checkout/acme?plan=pro&provider=stripe` stub `200`; `POST /billing/webhook/stripe {event}` `200`
- [ ] `GET /api/v2` (POC) `200` + `Deprecation` header on `/api/v1` if enabled

### P0-6 Cross-Cutting
- [ ] `pytest backend/tests` `118 passed` + `npm run build` `Compiled successfully`
- [ ] `GET /companies` legacy `entity_roles None` + `GET /pickups?status=verified` `weight_slips None` → `200` not `500` (models coercion)
- [ ] CORS: `curl -H Origin:http://localhost:3000` on `200` returns `Access-Control-Allow-Origin: *`; `500` would not (fixed)

### UI Smoke (each role, 5 min)
- [ ] Login `demo/Mgmt` → Dashboard `GET /analytics/dashboard 200` → Inventory Wallet 7 calls `200` `3 depot-inv 1 comp-inv` → expand ledger → Companies `4` → Depots `3` → Products `3`
- [ ] Login `demo/Weightment 919000000004` → Products `1`, Sources filtered, Delivery Orders `403` if no perm, Inventory filtered
- [ ] Login `acme/Mgmt 919000000001 tenant=acme` → no `demo` names leak
- [ ] Login `master` → Tenants page shows branding pickers

### Sign-off
- [ ] All boxes `✓` + `seed.log` saved + `QA_REPORT.md` attached + Loom 5m

