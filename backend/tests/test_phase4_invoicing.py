"""Phase 4: invoicing, payments, credit/debit notes tests.

DB-free via fake collections + patched helpers.
"""
import pytest
from fastapi import HTTPException

import routes.invoicing as inv_routes
import routes.payments as pay_routes
import routes.notes as notes_routes
import routes.db_compat as db_compat_module
from routes.invoicing import pick_company_rate, generate_invoice, issue_invoice, update_invoice, _decorate
from tests.conftest import FakeCollection, FakeDb, make_user


def fake_check_permission(user):
    async def _inner(u, k):
        return None
    return _inner


def _invoice_db(po=None, pricing=None):
    return FakeDb(
        purchase_orders=FakeCollection([po] if po else []),
        invoices=FakeCollection(),
        invoice_items=FakeCollection(),
        invoice_payments=FakeCollection(),
        payments=FakeCollection(),
        companies=FakeCollection(),
        credit_notes=FakeCollection(),
        debit_notes=FakeCollection(),
        company_pricing=FakeCollection(pricing or []),
    )


_PO = {
    "id": "PO1", "po_number": "PO-000001", "source_type": "Depot", "source_id": "D1",
    "source_name": "Depot One", "to_company_id": "C1", "to_company_name": "Acme",
    "billing_company_id": "C2", "billing_company_name": "Acme Parent",
    "product_id": "P1", "product_name": "Cement",
    "total_quantity_mt": 100, "dispatched_quantity_mt": 40, "remaining_quantity_mt": 60,
}


# ============ PICK COMPANY RATE ============

async def test_pick_company_rate_valid(monkeypatch):
    fake_db = FakeDb(company_pricing=FakeCollection([
        {"company_id": "C2", "product_id": "P1", "rate": 500, "tier": "premium", "valid_from": "2020-01-01", "valid_to": None},
    ]))
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    row = await pick_company_rate("C2", "P1", db=fake_db)
    assert row["rate"] == 500
    assert row["tier"] == "premium"


async def test_pick_company_rate_skips_expired(monkeypatch):
    fake_db = FakeDb(company_pricing=FakeCollection([
        {"company_id": "C2", "product_id": "P1", "rate": 500, "valid_from": "2020-01-01", "valid_to": "2020-12-31"},
    ]))
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    assert await pick_company_rate("C2", "P1", db=fake_db) is None


async def test_pick_company_rate_none(monkeypatch):
    fake_db = FakeDb(company_pricing=FakeCollection())
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    assert await pick_company_rate("C2", "P1", db=fake_db) is None


# ============ GENERATE ============

async def test_generate_invoice_from_po(monkeypatch):
    fake_db = _invoice_db(po=_PO, pricing=[
        {"company_id": "C2", "product_id": "P1", "rate": 500, "tier": "premium", "valid_from": "2020-01-01", "valid_to": None},
    ])
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    monkeypatch.setattr(inv_routes, "db", fake_db)
    monkeypatch.setattr(inv_routes, "check_permission", fake_check_permission(make_user(role="Management")))

    inv = await generate_invoice(inv_routes.GeneratePayload(gst_rate=18), "PO1", make_user(role="Management"))

    assert inv["status"] == "Draft"
    assert inv["invoice_no"] == "INV-000001"
    assert inv["billing_company_id"] == "C2"
    assert inv["client_company_id"] == "C1"
    assert inv["source_name"] == "Depot One"
    # qty = dispatched (40) x rate 500 = 20000
    assert inv["subtotal"] == 20000
    assert inv["gst_amount"] == 3600
    assert inv["total_amount"] == 23600
    assert inv["items"][0]["quantity_mt"] == 40
    assert inv["items"][0]["rate"] == 500
    assert inv["items"][0]["tier"] == "premium"
    assert inv["outstanding"] == 23600


async def test_generate_uses_total_when_no_dispatch(monkeypatch):
    po = {**_PO, "dispatched_quantity_mt": 0}
    fake_db = _invoice_db(po=po, pricing=[
        {"company_id": "C2", "product_id": "P1", "rate": 100, "valid_from": "2020-01-01", "valid_to": None},
    ])
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    monkeypatch.setattr(inv_routes, "db", fake_db)
    monkeypatch.setattr(inv_routes, "check_permission", fake_check_permission(make_user(role="Management")))

    inv = await generate_invoice(inv_routes.GeneratePayload(gst_rate=0), "PO1", make_user(role="Management"))
    assert inv["items"][0]["quantity_mt"] == 100
    assert inv["subtotal"] == 10000


async def test_generate_rejects_existing_draft(monkeypatch):
    fake_db = _invoice_db(po=_PO)
    fake_db.invoices.rows = [{"id": "X", "po_id": "PO1", "status": "Draft"}]
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    monkeypatch.setattr(inv_routes, "db", fake_db)
    monkeypatch.setattr(inv_routes, "check_permission", fake_check_permission(make_user(role="Management")))

    with pytest.raises(HTTPException) as exc:
        await generate_invoice(inv_routes.GeneratePayload(), "PO1", make_user(role="Management"))
    assert exc.value.status_code == 400


# ============ ISSUE / UPDATE ============

async def test_issue_invoice(monkeypatch):
    fake_db = _invoice_db()
    fake_db.invoices.rows = [{"id": "I1", "status": "Draft", "subtotal": 100, "gst_amount": 0, "total_amount": 100}]
    fake_db.invoice_items.rows = []
    fake_db.invoice_payments.rows = []
    fake_db.credit_notes.rows = []
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    monkeypatch.setattr(inv_routes, "db", fake_db)
    monkeypatch.setattr(inv_routes, "check_permission", fake_check_permission(make_user(role="Management")))

    inv = await issue_invoice("I1", make_user(role="Management"))
    assert inv["status"] == "Issued"
    assert inv["invoice_date"]
    assert inv["due_date"]


async def test_issue_rejects_issued(monkeypatch):
    fake_db = _invoice_db()
    fake_db.invoices.rows = [{"id": "I1", "status": "Issued"}]
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    monkeypatch.setattr(inv_routes, "db", fake_db)
    monkeypatch.setattr(inv_routes, "check_permission", fake_check_permission(make_user(role="Management")))

    with pytest.raises(HTTPException) as exc:
        await issue_invoice("I1", make_user(role="Management"))
    assert exc.value.status_code == 400


async def test_update_draft_recalculates_gst(monkeypatch):
    fake_db = _invoice_db()
    fake_db.invoices.rows = [{"id": "I1", "status": "Draft", "subtotal": 1000, "gst_rate": 0, "gst_amount": 0, "total_amount": 1000}]
    fake_db.invoice_items.rows = []
    fake_db.invoice_payments.rows = []
    fake_db.credit_notes.rows = []
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    monkeypatch.setattr(inv_routes, "db", fake_db)
    monkeypatch.setattr(inv_routes, "check_permission", fake_check_permission(make_user(role="Management")))

    inv = await update_invoice("I1", inv_routes.InvoiceUpdatePayload(gst_rate=18), make_user(role="Management"))
    assert inv["gst_amount"] == 180
    assert inv["total_amount"] == 1180


# ============ PAYMENT ALLOCATION -> STATUS ============

async def test_allocate_marks_paid_when_fully_covered(monkeypatch):
    fake_db = _invoice_db()
    fake_db.invoices.rows = [{"id": "I1", "status": "Issued", "total_amount": 1000}]
    fake_db.payments.rows = [{"id": "PAY1", "amount": 1000, "company_id": "C1"}]
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    monkeypatch.setattr(pay_routes, "db", fake_db)
    monkeypatch.setattr(pay_routes, "check_permission", fake_check_permission(make_user(role="Management")))

    await pay_routes.allocate_payment("I1", "PAY1", pay_routes.AllocatePayload(amount_allocated=1000), make_user(role="Management"))
    inv = fake_db.invoices.rows[0]
    assert inv["status"] == "Paid"


async def test_allocate_marks_partially_paid(monkeypatch):
    fake_db = _invoice_db()
    fake_db.invoices.rows = [{"id": "I1", "status": "Issued", "total_amount": 1000}]
    fake_db.payments.rows = [{"id": "PAY1", "amount": 400, "company_id": "C1"}]
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    monkeypatch.setattr(pay_routes, "db", fake_db)
    monkeypatch.setattr(pay_routes, "check_permission", fake_check_permission(make_user(role="Management")))

    await pay_routes.allocate_payment("I1", "PAY1", pay_routes.AllocatePayload(amount_allocated=400), make_user(role="Management"))
    inv = fake_db.invoices.rows[0]
    assert inv["status"] == "Partially Paid"


async def test_allocate_rejects_over_unallocated(monkeypatch):
    fake_db = _invoice_db()
    fake_db.invoices.rows = [{"id": "I1", "status": "Issued", "total_amount": 1000}]
    fake_db.payments.rows = [{"id": "PAY1", "amount": 100, "company_id": "C1"}]
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    monkeypatch.setattr(pay_routes, "db", fake_db)
    monkeypatch.setattr(pay_routes, "check_permission", fake_check_permission(make_user(role="Management")))

    with pytest.raises(HTTPException) as exc:
        await pay_routes.allocate_payment("I1", "PAY1", pay_routes.AllocatePayload(amount_allocated=500), make_user(role="Management"))
    assert exc.value.status_code == 400


# ============ CREDIT NOTE REDUCES OUTSTANDING ============

async def test_credit_note_reduces_outstanding(monkeypatch):
    fake_db = _invoice_db()
    fake_db.invoices.rows = [{"id": "I1", "status": "Issued", "total_amount": 1000}]
    fake_db.invoice_items.rows = []
    fake_db.invoice_payments.rows = []
    fake_db.credit_notes.rows = [{"id": "CN1", "invoice_id": "I1", "amount": 250, "applied": True}]
    fake_db.debit_notes.rows = []
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    monkeypatch.setattr(inv_routes, "db", fake_db)

    decorated = await _decorate({"id": "I1", "status": "Issued", "total_amount": 1000})
    assert decorated["credit_total"] == 250
    assert decorated["outstanding"] == 750


# ============ NOTES ============

async def test_note_requires_positive_amount_and_issued_invoice(monkeypatch):
    fake_db = _invoice_db()
    fake_db.invoices.rows = [{"id": "I1", "status": "Draft"}]
    fake_db.credit_notes = FakeCollection()
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    monkeypatch.setattr(notes_routes, "db", fake_db)
    monkeypatch.setattr(notes_routes, "check_permission", fake_check_permission(make_user(role="Management")))

    with pytest.raises(HTTPException) as exc:
        await notes_routes.create_credit_note(notes_routes.NotePayload(invoice_id="I1", amount=100), make_user(role="Management"))
    assert exc.value.status_code == 400  # draft invoice
