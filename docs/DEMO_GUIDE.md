# Demo Guide — LogiTrack Pro

Seeded by `backend/scripts/seed_demo.py` — two isolated demo tenants with full end-to-end data.

## Quick Start

```bash
cd backend
python scripts/seed_demo.py --fresh          # wipes demo+acme and recreates
python scripts/seed_demo.py --tenant demo    # only demo
python scripts/seed_demo.py --password MyPass123
```

> Requires `backend/.env` with `MYSQL_URL` and `JWT_SECRET` (same as app). The script is tenant-scoped — it never touches the `platform` tenant or your real data. Re-running with `--fresh` is idempotent (deterministic UUIDs).

## Tenants

| Slug | Name | Branding | Plan |
|------|------|----------|------|
| `demo` | Demo Logistics | Blue/orange, logo Demo | pro |
| `acme` | Acme Traders | Orange/green, logo Acme | pro |
| `platform` | Platform | — | platform (master admin only) |

Both demo tenants share the same mobiles to demo slug disambiguation. Login needs `tenant` field when mobile exists in multiple workspaces.

## Credentials (all tenants, password `Demo@123`)

| Tenant | Role | Mobile | Password | Name | Notes |
|--------|------|--------|----------|------|-------|
| demo | Management | 919000000001 | Demo@123 | Aarav Sharma (demo) | Tenant admin, sees all |
| demo | Admin | 919000000002 | Demo@123 | Priya Patel (demo) | Co-admin |
| demo | Loader | 919000000003 | Demo@123 | Rahul Verma (demo) | Primary liftings, Schedule Pickup |
| demo | Weightment | 919000000004 | Demo@123 | Sunita Rao (demo) | **Firm grants: Cement only, 2 depots** → tests "1 product ×2 depots" |
| demo | Depot Staff | 919000000005 | Demo@123 | Amit Kumar (demo) | Secondary liftings |
| demo | Depot Supervisor | 919000000006 | Demo@123 | Neha Singh (demo) | Verify pickup |
| demo | Transporter | 919000000007 | Demo@123 | Vikram Yadav (demo) | Own trucks only |
| demo | Dispatch Verifier | 919000000008 | Demo@123 | Anjali Mehta (demo) | Final verify |
| acme | Management | 919000000001 | Demo@123 | Aarav Sharma (acme) | Same mobile, different tenant |
| acme | Admin | 919000000002 | Demo@123 | Priya Patel (acme) | |
| acme | ... | ... | Demo@123 | ... | Same 8 roles as demo |
| — | Master Admin | (MASTER_ADMIN_MOBILE) | (MASTER_ADMIN_PASSWORD) | Master Admin | Platform, sees all tenants, Tenants/Billing/Usage |

**Login examples:**
```bash
# demo tenant Weightment
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"mobile":"9000000004","country_code":"91","password":"Demo@123","tenant":"demo"}'

# acme same mobile, different tenant
curl -X POST http://localhost:8000/api/v1/auth/login \
  -d '{"mobile":"9000000004","country_code":"91","password":"Demo@123","tenant":"acme"}'

# ambiguous without tenant -> 401 "provide your tenant slug"
curl -X POST ... -d '{"mobile":"9000000004","password":"Demo@123"}'
```

## What to Demo (3 click flows)

### Flow A — Inbound Supply (DO → Liftings → Verification → Inventory)
1. Login as **Management (demo)** → Dashboard shows 3 DOs, 3 depots, inventory metrics
2. **Delivery Orders** → See `DO-DEMO-000001` (North Depot, Cement, 300 MT, In Progress 75/300), `DO-DEMO-000002` (Company), `DO-DEMO-000003` (Railway with sidings)
3. **Liftings** → 6 liftings: Primary Pending/Verified/Rejected + Secondary; filters by product/DO
4. **Verification (Unloading)** → Pending card → Verify with date/time → depot inventory `available_quantity` +25
5. **Inventory Wallet** → Depot North shows 95 MT (Cement), drill Ledger shows IN/OUT with balances

**Tenant isolation check:** Login as `acme` Management → same DO numbers but Acme data, no Demo rows.

### Flow B — Outbound PO Fulfillment (PO → Pickup → Dispatch → Invoice → Payment)
1. **Purchase Orders** → 3 POs: `PO-DEMO-000001` Open (200 MT, source Depot North → Client A, billing Parent Ltd), `PO-DEMO-000002` In Progress (40/150 dispatched), `PO-DEMO-000003` Completed
2. Source dropdown filtered by `source_products` (Depot North shows Cement & Steel, Depot West shows Aggregate) → try PO with Depot West + Cement → 400 "Product not mapped"
3. **Plan Dispatch List** → Pick source Depot North, date today, add row Truck `MH12AB0001` (auto-creates), Transporter, Client A, Est 25 MT → Plan
4. **Dispatch Info** → Today tab → Slide to Start → timer → Loaded → Upload Tare Slip
5. Login as **Weightment (demo)** (assigned Cement only, Depot North) → **Weightment Slip** → `loaded` row → enter Loaded Wt 24.8 + slips → Submit → `weightment_done`
6. **Final Dispatch Verification** → row → pick PO `PO-DEMO-000001` → guard: if `loadedWeight > available` shows red "Kindly add inventory" → Final Verify → deducts Depot North `available -24.8`, increments Client A `available +24.8`, PO dispatched 24.8, creates Secondary Lifting `LFT-... Verified` + verified_trucks
7. **Invoices** → Generate from PO (GST 18%, rate from `company_pricing` 5200) → Draft `INV-DEMO-000001` → Issue → `Issued` + due date → **Payments** → Record `Bank Transfer` → Invoices Detail → Allocate → `Partially Paid`→`Paid` → Export PDF
8. **Credit Notes** page + Invoices detail: add credit rebate → outstanding drops

### Flow C — Stock Transfer (Request → Approve → Dispatch → Receive)
1. Login as **Weightment (demo)** with stock at Depot North → **Stock Transfers** → Request: Cement 10 MT Depot North → Depot West (requires `available-locked ≥ qty`, else 400)
2. Login as **Management** → Approve (role passes `approval_matrices` threshold; requester cannot self-approve → 400)
3. Dispatch as Weightment, Receive as Management → atomically Depot North `available -10`, Depot West `available +10`, `locked_qty` cleared, audit timeline shows 4 rows
4. Try Rejected path: Request 5 MT → Reject (reason required) → `locked_qty` released
5. **Ledger Export** → Excel download

### Bonus Checks
*   **Products:** Catalog tab + Overrides & Pricing tab (Company A has Acme Cement Premium + pricing tiers)
*   **Regions & Locations:** Hierarchy tab shows North Zone → Delhi NCR → Depot North (95 MT) + unassigned depots
*   **Companies:** Role tags (Source/Client), parent hierarchy, Offices (single Head Office enforced) & Factories (1 per product)
*   **Leads:** 5 statuses, Convert → creates Client + links employee; `leads_scope` All/Sales/Purchase filters non-Management view
*   **Firms:** Firm One → Branch Jaipur + Factory Cement + firm_access grants (Weightment 1×2)
*   **Employees:** Internal/External tabs, Enable Login → first-time OTP flow
*   **Usage Dashboard:** After clicking around, shows request volume by endpoint/day
*   **Billing (master admin):** Pro plan on demo tenant, checkout stub, webhook test

## Verification

```bash
python -m pytest backend/tests -q   # 109+ tests still pass after seeding
npm run build --prefix frontend     # green
# Quick DB check (via python)
python -c "import asyncio, pymysql; ..."  # or use the verify snippet in seed_demo.py output
```

## Notes
*   Inventory seeded directly for demo speed, but stock transfer locks move via atomic `locked_qty` + `_apply_inventory_movement` helpers (tenant-stamped).
*   All demo rows use deterministic UUIDs (`uuid5("demo:table:name")`) so `--fresh` is clean.
*   The script never touches `platform` tenant data. Backups are still recommended before first run on prod.
