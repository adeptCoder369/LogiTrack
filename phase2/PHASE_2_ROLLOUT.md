# Phase 2 — Entity Model & Location Hierarchy: Deploy Guide

Builds on Phase 0 (multi-tenant) + Phase 1 (data ownership/source access).

## What changed

- **Location hierarchy**: `regions` → `locations` → `depots.location_id`. CRUD + `GET /locations/tree` (region→location→depot with inventory roll-up + unassigned depots) + `GET /locations/{id}/overview` (per-product roll-up). New "Regions & Locations" page; depot form has a location picker.
- **Entity roles**: `companies.entity_roles` (Lead | Client | Company | Source, multi-role). `companies.parent_client_id` (client hierarchy). `client_offices` (single head office enforced) + `client_factories` (max 1 factory per product per company). Companies UI: role tags/multi-select, parent picker, Offices & Factories modal.
- **PO billing parent**: `purchase_orders.billing_company_id/name` — defaults to the client company; visible in the PO form.
- **Leads**: `leads` (Sales|Purchase, status New→Contacted→Qualified→Converted→Lost, assigned employee). Conversion creates the client company (`entity_roles=["Client"]`, parent carried over), links the assigned employee's user record to the new company (grant transfer), stamps `converted_company_id`. New Leads page.
- **Firms**: `firms` (parent/child + linked company), `firm_offices`, `firm_factories`, `firm_access` (firm × user × product × depot pair grants — the "5 products, 3 depots → 1 product & 2 depots" case). Data + management UI now; **enforcement lands with Phase 3 employees** (`get_user_firm_granted_pairs` resolver is ready).
- **client_modules**: per-client module enablement (`client_module_enabled(company_id, key)` → client_modules → tenant flags → defaults). Data + UI + helper now; route gating in later phases.
- **Bugfix**: PO creation crashed with `TypeError: got multiple values for keyword argument 'source_type'` (the pydantic dump collided with the resolved source kwargs) — the created PO now excludes the overridden fields.

## Deploy sequence

1. Backup the DB.
2. Apply migrations **in order** (hand-applied, not idempotent):
   ```bash
   09_location_hierarchy.sql    # regions, locations, depots.location_id
   10_client_structure.sql      # entity_roles, parent_client_id, offices, factories, PO billing
   11_leads.sql
   12_firms.sql
   13_client_modules.sql
   ```
3. Deploy backend + restart. No seed work.
4. Smoke test:
   - `GET /regions` + `POST /regions` → `POST /locations` (region picker) → set a depot's `location_id` → `GET /locations/tree` shows the roll-up.
   - Create/edit a company with `entity_roles=["Client"]` + parent; add offices (second head office → 400) and factories (same product twice → 400).
   - Create a PO — it must succeed (regression: previously crashed) and carry `billing_company_id` = client.
   - Create a lead, assign an employee, `POST /leads/{id}/convert` → client created, employee's `company_id` updated.
   - Firms: create firm → grant a user a product×depot pair → `GET /firms/{id}/access` lists it; duplicate grant → 400.
   - `GET/PUT /companies/{id}/modules` round-trip.
5. Deploy frontend (new pages: Regions & Locations, Leads, Firms; Companies/PO enhancements).

## Behavior notes

- New permission keys: Regions, Locations, Leads, Firms (View/Create/Update/Delete), Leads (Convert).
- Legacy companies keep working — `entity_roles` is additive; `is_client`/`company_type` are still synced.
- Existing POs get `billing_company_id` on next update; no backfill needed (display defaults to client).

## Rollback

Restore from backup (migrations 09–13 are additive but not idempotent).

## Tests

```bash
cd backend
python -m pytest tests     # 73 tests, DB-free
```

Frontend: `npm run build` green (verified).
