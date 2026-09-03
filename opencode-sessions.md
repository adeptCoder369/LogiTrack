opencode -s ses_005fad499ffeeRIt3pAIsbWBRi
uvicorn server:app --host 0.0.0.0 --port 8000 --reload      
=======================================================
system prompts
=======================================================
dont test , for now until ask 
just implement what i am asking for and report back as soon as you can 
=======================================================
=======================================================

------------ PHASE_0 ---------------------------------
1. Tenant isolation across all 17 data tables — cross-tenant data leak impossible; suspended workspaces auto-blocked
2. Workspace management page (master admin): create/edit/suspend workspaces, per-client branding (logo, name, colors) on login + sidebar
3. Feature-flag system live — per-client module gating ready for later phases
4. API versioned to /api/v1; old tokens still work, no forced re-login
5. File uploads per-tenant (old files unaffected)

Starting Phase 1 (source/product access). 


------------ PHASE_1 ---------------------------------
1. Depot ownership — every depot now belongs to a company; visibility = company ownership + access assignment
2. Source↔Product access mapping — a source (depot/company) shows only when the user can access at least one of its mapped products (the "2 products, 1 permission" fix); unmapped sources stay visible; admins manage via new Source Access tab
3. Server-side filtering everywhere — all source dropdowns & lists (pickup planning, POs, liftings, verified trucks) now filtered by that rule via new /sources API
4. Editable PO source — explicit source column; PO must match a mapped source↔product pair; source change cascades to linked pickups; old clients unaffected
5. Product master overrides + company pricing — per-company product code/name/min-stock/pricing + rate list (foundation for Invoicing module)

Starting Phase 2 (entity model & location hierarchy).

------------ PHASE_2 ---------------------------------
1. Location hierarchy — Region → Location → Depot structure with live inventory roll-up tree + per-location overview; depot form picks its location
2. Entity roles — companies now tagged Lead/Client/Company/Source (multi-role); client hierarchy with parent clients; offices (single head office) & factories (max 1 per product)
3. PO billing parent — POs issued by a child client automatically bill under its parent; shown on the PO form
4. Leads module — Sales/Purchase leads with status pipeline (New → Contacted → Qualified → Converted/Lost); one-click Convert creates the client company and links the assigned employee
5. Firms — parent/child firm structure mirroring clients, plus per-user product × depot access grants (the "5 products, 3 depots → 1 product & 2 depots" case; enforcement hooks in with employee management)
6. Client modules — per-client feature toggles (invoices, stock transfers, etc.) driving phased module rollout

Starting Phase 3 (employee management & granular access).


------------ PHASE_3 ---------------------------------
1. Employee management — Internal/External employee records with departments & designations; login_enabled toggle mirrors infoEIGHT (external staff = data only, no login)
2. Enable Login — one-click creates the user from an employee record (first-time OTP password flow); employee <-> user linkage synced both ways; user management links employees too
3. Leads scope — employees see their scope's leads (Sales/Purchase/All) plus their own; assignment now tracks employees; conversion links the employee's login to the new client
4. Firm access enforced — an employee with product × depot grants only ever sees those products/depots app-wide (the "5 products, 3 depots → 1 product & 2 depots" case now live on sources, pickups, POs, liftings)
5. Granular access everywhere — the strict intersection flows through the existing product/depot resolvers, so every list & dropdown inherits it automatically

Starting Phase 4 (invoicing, payments & financial operations).


------------ PHASE_4 ---------------------------------
1. Invoicing — generate invoices straight from a Purchase Order (client, billing parent, source auto-filled); one line per product with qty (dispatched or PO total); Draft → Issued → Partially Paid → Paid with auto Overdue
2. Company pricing applied — line rates pull from company pricing (per-client rate list), 0 when unset and editable on the draft; GST invoice-level, totals auto-calc
3. Payments & reconciliation — record receipts (bank/cheque/cash/UPI), allocate any amount to an invoice; status advances automatically (fully covered → Paid); outstanding view per invoice
4. Credit & Debit notes — invoice adjustments; credit notes directly reduce what the client owes
5. Export-ready — invoice PDF + Excel download for sharing/filing

Starting Phase 5 (stock transfer engine).



------------ PHASE_5 ---------------------------------
1. Stock transfers — inter-depot / inter-company moves (any Depot/Company → any Depot/Company); TRF- numbering + status flow Requested → Approved → Dispatched → Received (+ Rejected/Cancelled), requester cannot approve own
2. Approval matrix — product + amount thresholds → approver roles (most specific wins); wrong role → 403, no matrices → any approver
3. Inventory locks — source stock reserved at request (available−locked check), released on reject/cancel, and on receive atomically decremented at source + incremented at dest
4. Audit ledger — every transition appends an immutable audit row; detail view shows full timeline
5. Stock Transfers UI + ledger export — request modal, status badges/locked display, detail + audit timeline with role-gated actions, Approval Rules tab (product/threshold/roles), Excel ledger download

Starting Phase 6 (SaaS operations).



------------ PHASE_6 — SaaS operations + PaaS readiness ------------

Usage tracking — logs, middleware, summary + dashboard
Billing hooks — subscriptions, Stripe/PayPal stubs, webhooks
Extension registry — hook points, sample extension
API versioning — /api/v2 POC, deprecation headers
White-label — tenant resolver (header + subdomain)




quick update
------------ PHASE_6 — SaaS operations + PaaS readiness ------------
Usage tracking — logs, middleware, summary + dashboard
Billing hooks — subscriptions, Stripe/PayPal stubs, webhooks
Extension registry — hook points, sample extension
API versioning — /api/v2 POC, deprecation headers
White-label — tenant resolver (header + subdomain)


https://logitrack-frontend-lac.vercel.app



now i am testing and fixing any bug along — we can also start testing and giving feedback on flow
i have already seeded demo data so you can check every flow:
acme tenant — use slug acme at login
acme Management 919000000001 / Demo@123
acme Admin 919000000002 / Demo@123
acme Loader 919000000003 / Demo@123
acme Weightment 919000000004 / Demo@123
acme Depot Staff 919000000005 / Demo@123
acme Depot Supervisor 919000000006 / Demo@123
acme Transporter 919000000007 / Demo@123
acme Dispatch Verifier 919000000008 / Demo@123

how to login — mobile + country 91 + password Demo@123 + tenant slug acme (important, same mobile works for demo and acme but slug tells which workspace)
master/platform — 999999999999 / Master@123 (no tenant needed, to see tenants, billing, usage)
please use the acme tenant to test and give feedback on flow — thanks