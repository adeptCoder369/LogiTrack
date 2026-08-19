# Phase 4 — Invoicing, Payments & Financial Operations: Deploy Guide

Builds on Phase 1 (`company_pricing` rates, `effective_product`) + Phase 2 (PO billing parent).

## What changed

- **Invoices**: generated from a purchase order (`POST /invoices/generate?po_id=`). Header carries the client, the billing parent, the source; one item per PO product. Quantity = dispatched, else PO total. Line rate resolves from `company_pricing` (`pick_company_rate` — latest valid window; **0 when none, editable on the draft**). GST is invoice-level (`gst_amount = subtotal × gst_rate`). Status flow `Draft → Issued → Partially Paid → Paid` with **Overdue derived** from the due date. `INV-xxxxxx` numbering.
- **Payments**: `payments` (receipt_no, company, mode Bank Transfer|Cheque|Cash|UPI|Other, bank_ref, date) + `invoice_payments` allocation ledger. Allocating a payment advances the invoice automatically (fully → Paid, partial → Partially Paid); de-allocation reverses it. Reconciliation endpoint + list unallocated totals.
- **Credit/Debit notes**: linked to an invoice; a **credit note reduces the invoice's outstanding** (negative allocation); debit notes are recorded adjustments. `CN-`/`DN-` numbering.
- **Export**: invoice PDF (reportlab) + Excel (openpyxl) via `GET /invoices/{id}/export`.
- New permission keys: Invoices (View/Create/Generate/Update/Issue/Delete), Payments (View/Create/Update/Delete), Credit/Debit Notes (View/Create/Delete).
- Frontend: Invoices page (stats, generate-from-PO modal, detail with items/GST/payments/notes, issue, export), Payments page, Credit/Debit Notes page.

## Deploy sequence

1. Backup the DB.
2. Apply migrations **in order** (hand-applied, not idempotent):
   ```bash
   15_invoices.sql   # invoices + invoice_items
   16_payments.sql   # payments + invoice_payments
   17_notes.sql      # credit_notes + debit_notes
   ```
3. Deploy backend + restart.
4. Smoke test:
   - Create/issue a PO → `POST /invoices/generate?po_id=` → Draft with correct qty/rate/GST totals; duplicate draft → 400.
   - Edit the draft's GST → totals recalc; Issue → status Issued + dates; PDF/Excel export download.
   - Record a payment → allocate fully → status **Paid**; allocate partially → **Partially Paid**; outstanding = total − paid − credits.
   - Add a credit note → outstanding drops; Notes page lists it.
   - Old flows unaffected (POs, liftings, pickups).
5. Deploy frontend (Invoices/Payments/Notes pages).

## Behavior notes

- Invoice generation is v1 PO-scoped (single product per PO). Multi-line dispatch-based invoicing is a later iteration.
- Debit notes are informational adjustments for v1 (they don't change the invoice total).
- Deleting a payment removes its allocations and refreshes affected invoices.
- Only Draft invoices are editable/deletable; GST locks on issue.

## Rollback

Restore from backup (migrations 15–17 additive but not idempotent).

## Tests

```bash
cd backend
python -m pytest tests     # 99 tests, DB-free
```

Frontend: `npm run build` green (verified).
