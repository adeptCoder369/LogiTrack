# Phase 5 — Stock Transfer Engine: Deploy Guide

Builds on Phase 1 (`_apply_inventory_movement` atomic helpers, `company_pricing`) + all tenancy.

## What changed

- **Stock transfers**: `stock_transfers` (TRF-xxxxxx, product, qty, Depot/Company source → Depot/Company dest, status, actor/timestamp per step) + `stock_transfer_audit` (append-only ledger, one row per transition). State machine: `Requested → Approved → Dispatched → Received` (+ `Rejected/Cancelled`), `requester cannot approve own`, terminal states blocked.
- **Approval matrices**: `approval_matrices` (entity, optional product, optional amount_threshold, approver_roles). Single-level in v1: most specific match wins (product-specific, then highest threshold); if matrices exist, approver's role must be in the resolved list (no matrices = any approver).
- **Inventory locks**: `depot_inventory.locked_qty` + `company_inventory.locked_qty`. Request reserves (`available − locked ≥ qty`), Rejected/Cancelled release, Received releases + atomically decrements source + increments destination via the existing `_apply_inventory_movement` helpers (both sides, Depot/Company).
- **Backend**: `POST /stock-transfers` (creates + locks), `GET /stock-transfers`, `GET /stock-transfers/{id}` (with audit), `POST .../approve|dispatch|receive|reject|cancel`, `GET /stock-transfers/{id}/audit`, `GET /stock-transfers/export` (Excel ledger), `GET/POST/PUT/DELETE /approval-matrices`.
- **Frontend**: Stock Transfers page (request modal with product/qty + source/dest pickers, status badges, detail modal with audit timeline + role-gated actions), Approval Rules tab (product/threshold/roles CRUD), ledger export.
- **Permissions**: `Stock Transfers (View/Create/Approve/Update/Delete)`.

## Deploy sequence

1. Backup the DB.
2. Apply migrations **in order** (hand-applied, not idempotent):
   ```bash
   18_stock_transfers.sql   # stock_transfers + stock_transfer_audit
   19_approval_matrices.sql # approval_matrices
   20_inventory_locks.sql   # locked_qty on both inventory tables
   ```
3. Deploy backend + restart.
4. Smoke test:
   - As Weightment user with stock at Depot D1, request a transfer D1→D2 qty 10 → locked_qty on D1 rises by 10, detail shows audit "Requested".
   - Approve as different user (same user → 400; wrong role with matrix → 403), then Dispatch, then Receive → source available drops by 10, dest rises by 10, locks cleared, audit has 4 rows, Invalid transition (e.g. Requested→Received) → 400.
   - Request with qty > available−locked → 400 (rolled back, no transfer).
   - Create an approval matrix (product P1, threshold 100, roles Management) → Loader cannot approve a 150 MT P1 transfer (403), Management can.
   - Export `GET /stock-transfers/export` → Excel ledger.
5. Deploy frontend (Stock Transfers page).

## Behavior notes

- Depot **and** Company are both valid as source or destination (both inventory helpers reused, tenant-stamped).
- Matrices are optional; when none exist, approval is role-gated only by the permission key.
- Inventory lock is best-effort atomic via `locked_qty = locked_qty + delta` (via `db_compat` `$inc`); concurrent requests serialize on the row lock.
- Audit `payload` is a JSON string (db_compat Text column).

## Rollback

Restore from backup (migrations 18–20 additive but not idempotent).

## Tests

```bash
cd backend
python -m pytest backend/tests/test_phase5_stock_transfers.py -v  # 10 tests
python -m pytest backend/tests -v                                  # 109 tests, DB-free
```

Frontend: `npm run build` green.
