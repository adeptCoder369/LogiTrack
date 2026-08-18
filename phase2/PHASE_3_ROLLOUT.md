# Phase 3 — Employee Management & Granular Access: Deploy Guide

Builds on Phase 0 (multi-tenant) + Phase 1 (source access) + Phase 2 (entity model).

## What changed

- **Departments / Designations / Employees** (`departments`, `designations`, `employees` + `users.employee_id`):
  - Employees are Internal (may get a login) or External (data only, no login — infoEIGHT behavior).
  - Employee record carries code, company, department, designation, `leads_scope` (Sales|Purchase|All), `login_enabled`, `user_id`.
  - **Enable Login** action creates the linked user (`password_set=False` → first-time OTP); mobile uniqueness enforced within the tenant; `users.employee_id` ↔ `employees.user_id` stay in sync (also via `admin_create_user` employee picker in User Management).
- **Leads scope**: employees see their scope's leads (Sales/Purchase) + leads assigned to them; Management/master admin see all. Lead assignment now references employees; conversion links the employee's login user to the new client.
- **Firm-grant enforcement (the Phase 2 deferral)**: an employee with `firm_access` grants only ever sees granted products/depots app-wide (strict intersection inside `get_user_product_ids`/`get_user_depot_ids`). `/sources`, pickups, POs, liftings and verified-trucks lists all inherit it. Master admin/Management and employees without grants are unrestricted.
- New permission keys: Employees / Departments / Designations (View/Create/Update/Delete).
- Deferred (documented): converted-client company-level scoping.

## Deploy sequence

1. Backup the DB.
2. Apply migration (hand-applied, not idempotent):
   ```bash
   14_employees.sql   # departments, designations, employees, users.employee_id
   ```
3. Deploy backend + restart.
4. Smoke test:
   - Create a department + designation → create an Internal employee → **Enable Login** with a fresh mobile → the user can first-time-setup OTP login; the Employees page shows "Login Active".
   - Create an External employee → no Enable Login button.
   - Link an employee via User Management (picker) → employee shows linked, user shows "Employee" badge.
   - Set an employee's `leads_scope=Sales` → that employee's `GET /leads` returns only Sales + their own leads (Management sees all).
   - Firm grant: grant user U product P2 + depot D2 on a firm → U's `/sources`, pickups, POs only surface P2/D2; `/product-access/my-products` reflects the intersection; remove grants → unrestricted again.
5. Deploy frontend (Employees, Departments & Designations pages + User Management picker).

## Rollback

Restore from backup (migration 14 additive but not idempotent). Code revert alone fails on `users.employee_id`.

## Tests

```bash
cd backend
python -m pytest tests     # 85 tests, DB-free
```

Frontend: `npm run build` green (verified).
