# Phase 1 — Data Ownership & Source↔Product Access: Deploy Guide

Builds on the Phase 0 multi-tenant core (see `PHASE_0_ROLLOUT.md`).

## What changed

- **Depot ownership**: `depots.company_id` — every new/updated depot must belong to a company; depots list/detail filter by company ownership **or** depot access. Legacy depots keep `NULL` and stay visible via depot-access until assigned through the Depots page.
- **Source↔Product mapping** (`source_products`): declares which products a source (Depot/Company) can supply.
  - A source with **no mappings stays visible** to everyone (mapping is an opt-in restriction).
  - A mapped source is visible only when **at least one** mapped product is in the user's accessible product set ("2 products, 1 permission").
  - Master admin / Management are unrestricted.
- **Server-side filtering**: `GET /api/v1/sources?type=depot|company` drives every dropdown; pickups/liftings/verified-trucks/PO lists are filtered with the same rule.
- **Editable PO source**: `purchase_orders.source_id/source_name` (backfilled from `depot_id`/`depot_name`, legacy columns kept); creating/updating a PO validates the source↔product pair ("PO must match a mapped pair" when the source has mappings); source changes cascade to dependent pickups.
- **Product master overrides + company pricing**: `product_overrides` (per-company code/name/description/min_stock/pricing_model via `effective_product()`) and `company_pricing` (tier/rate/validity) — foundation for Phase 4 billing.
- **Bugfix**: `db_compat.update_many` was missing (pickup reschedule chains + PO source cascade now rely on it).

## Deploy sequence

1. Backup the DB.
2. Apply migrations **in order** (hand-applied, not idempotent — re-running errors 1050/1060):
   ```bash
   mysql ... < backend/migrations/05_depot_ownership.sql
   mysql ... < backend/migrations/06_source_products.sql
   mysql ... < backend/migrations/07_po_source.sql
   mysql ... < backend/migrations/08_product_overrides.sql
   ```
   (or the pymysql multi-statement one-liner from Phase 0 — run each file separately so a failure is isolated).
3. Deploy backend, restart. No seed work needed (new tables are empty by design).
4. Smoke test:
   - `GET /api/v1/sources` with a Management token returns depots+companies.
   - Create a depot without `company_id` → 400.
   - `GET /api/v1/source-access` (Management) lists sources with empty mappings.
   - Create a PO as before → works (no mappings yet = unrestricted).
   - Assign products to a source via `PUT /source-access/source/Depot/<id>`; a Loader user without those products no longer sees that source in pickups dropdowns, and a PO with that source + unmapped product → 400.
5. Deploy frontend (sources dropdowns + Source Access tab + Overrides & Pricing tab are live).

## Behavior notes

- Existing POs were backfilled automatically (`source_id = depot_id`); old API clients still work because `depot_id`/`depot_name` are mirrored on write.
- `products` list on the PO form is now the user's accessible products (`product-access/my-products`).
- The permission matrix gains `Source Access (View/Create/Update)` keys.

## Rollback

Same as Phase 0: restore from backup. Code revert alone fails (new columns in queries).

## Tests

```bash
cd backend
python -m pytest tests     # 56 tests, DB-free
```

Frontend: `npm run build` green (verified).
