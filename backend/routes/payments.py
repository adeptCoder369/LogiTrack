"""Payment routes + invoice reconciliation (Phase 4).

Payments are received against a company; allocation applies a payment (or
part of it) to an invoice, advancing its status automatically.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone
import uuid

from .db_compat import db
from auth_utils import get_current_user, check_permission

router = APIRouter(tags=["Payments"])

PAYMENT_MODES = ("Bank Transfer", "Cheque", "Cash", "UPI", "Other")


class PaymentPayload(BaseModel):
    company_id: str
    amount: float
    mode: str = "Bank Transfer"
    bank_ref: Optional[str] = None
    payment_date: Optional[str] = None
    notes: Optional[str] = None


class AllocatePayload(BaseModel):
    amount_allocated: float


async def _invoice_or_404(invoice_id: str) -> dict:
    inv = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return inv


async def _payment_or_404(payment_id: str) -> dict:
    pmt = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    if not pmt:
        raise HTTPException(status_code=404, detail="Payment not found")
    return pmt


async def _allocated_total(payment_id: str) -> float:
    rows = await db.invoice_payments.find({"payment_id": payment_id}, {"_id": 0, "amount_allocated": 1}).to_list(1000)
    return round(sum(r.get("amount_allocated") or 0 for r in rows), 2)


async def _invoice_paid_total(invoice_id: str) -> float:
    rows = await db.invoice_payments.find({"invoice_id": invoice_id}, {"_id": 0, "amount_allocated": 1}).to_list(1000)
    return round(sum(r.get("amount_allocated") or 0 for r in rows), 2)


async def _refresh_invoice_status(invoice_id: str) -> None:
    """Advance the invoice status after an allocation change."""
    inv = await _invoice_or_404(invoice_id)
    if inv.get("status") == "Draft":
        return
    paid = await _invoice_paid_total(invoice_id)
    total = inv.get("total_amount") or 0
    if total > 0 and paid >= total - 0.005:
        new_status = "Paid"
    elif paid > 0:
        new_status = "Partially Paid"
    else:
        new_status = "Issued"
    if new_status != inv.get("status"):
        await db.invoices.update_one({"id": invoice_id}, {"$set": {"status": new_status}})


# ============ PAYMENTS ============

@router.get("/payments")
async def get_payments(
    company_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    await check_permission(current_user, "Payments (View)")
    query = {}
    if company_id:
        query["company_id"] = company_id
    payments = await db.payments.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    out = []
    for pmt in payments:
        allocated = await _allocated_total(pmt["id"])
        out.append({**pmt, "allocated_total": allocated, "unallocated": round((pmt.get("amount") or 0) - allocated, 2)})
    return out


@router.get("/payments/{payment_id}")
async def get_payment(payment_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Payments (View)")
    pmt = await _payment_or_404(payment_id)
    allocations = await db.invoice_payments.find({"payment_id": payment_id}, {"_id": 0}).to_list(1000)
    pmt["allocations"] = allocations
    pmt["allocated_total"] = await _allocated_total(payment_id)
    pmt["unallocated"] = round((pmt.get("amount") or 0) - pmt["allocated_total"], 2)
    return pmt


@router.post("/payments")
async def create_payment(data: PaymentPayload, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Payments (Create)")
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    if data.mode not in PAYMENT_MODES:
        raise HTTPException(status_code=400, detail=f"mode must be one of {PAYMENT_MODES}")

    company = await db.companies.find_one({"id": data.company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    count = await db.payments.count_documents({})
    payment = {
        "id": str(uuid.uuid4()),
        "receipt_no": f"RCPT-{str(count + 1).zfill(6)}",
        "company_id": data.company_id,
        "company_name": company.get("name", ""),
        "amount": round(data.amount, 2),
        "mode": data.mode,
        "bank_ref": data.bank_ref,
        "payment_date": data.payment_date,
        "notes": data.notes,
        "created_by": current_user.get("id"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.payments.insert_one(payment)
    return payment


@router.put("/payments/{payment_id}")
async def update_payment(payment_id: str, data: PaymentPayload, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Payments (Update)")
    existing = await _payment_or_404(payment_id)
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    if data.mode not in PAYMENT_MODES:
        raise HTTPException(status_code=400, detail=f"mode must be one of {PAYMENT_MODES}")

    allocated = await _allocated_total(payment_id)
    if data.amount < allocated - 0.005:
        raise HTTPException(status_code=400, detail="Cannot reduce amount below what is already allocated")

    company = await db.companies.find_one({"id": data.company_id})
    update = data.model_dump()
    update["company_name"] = company.get("name", "") if company else existing.get("company_name")
    await db.payments.update_one({"id": payment_id}, {"$set": update})
    return await _payment_or_404(payment_id)


@router.delete("/payments/{payment_id}")
async def delete_payment(payment_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Payments (Delete)")
    allocations = await db.invoice_payments.find({"payment_id": payment_id}, {"_id": 0, "invoice_id": 1}).to_list(1000)
    await db.invoice_payments.delete_many({"payment_id": payment_id})
    await db.payments.delete_one({"id": payment_id})

    # Refresh the affected invoices' statuses (allocations removed).
    for alloc in allocations:
        await _refresh_invoice_status(alloc.get("invoice_id"))

    return {"message": "Payment deleted"}


# ============ ALLOCATION / RECONCILIATION ============

@router.get("/invoices/{invoice_id}/reconciliation")
async def get_invoice_reconciliation(invoice_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Invoices (View)")
    inv = await _invoice_or_404(invoice_id)
    total = inv.get("total_amount") or 0
    paid = await _invoice_paid_total(invoice_id)

    credits = await db.credit_notes.find({"invoice_id": invoice_id, "applied": {"$ne": False}}, {"_id": 0, "amount": 1}).to_list(1000)
    credit_total = round(sum(c.get("amount") or 0 for c in credits), 2)

    allocations = await db.invoice_payments.find({"invoice_id": invoice_id}, {"_id": 0}).to_list(1000)
    payments = []
    for alloc in allocations:
        pmt = await db.payments.find_one({"id": alloc.get("payment_id")}, {"_id": 0})
        payments.append({**alloc, "payment": pmt or {}})

    return {
        "invoice_id": invoice_id,
        "total_amount": total,
        "paid_total": paid,
        "credit_total": credit_total,
        "outstanding": round(total - paid - credit_total, 2),
        "payments": payments,
    }


@router.post("/invoices/{invoice_id}/allocate")
async def allocate_payment(invoice_id: str, payment_id: str, payload: AllocatePayload, current_user: dict = Depends(get_current_user)):
    """Allocate part of a payment to an invoice."""
    await check_permission(current_user, "Payments (Create)")
    inv = await _invoice_or_404(invoice_id)
    if inv.get("status") == "Draft":
        raise HTTPException(status_code=400, detail="Cannot allocate to a draft invoice")
    pmt = await _payment_or_404(payment_id)

    amount = round(payload.amount_allocated, 2)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Allocation must be positive")

    unallocated = round((pmt.get("amount") or 0) - await _allocated_total(payment_id), 2)
    if amount > unallocated + 0.005:
        raise HTTPException(status_code=400, detail=f"Payment has only {unallocated} unallocated")

    existing_alloc = await db.invoice_payments.find_one({"invoice_id": invoice_id, "payment_id": payment_id})
    if existing_alloc:
        raise HTTPException(status_code=400, detail="Payment already allocated to this invoice")

    await db.invoice_payments.insert_one({
        "id": str(uuid.uuid4()),
        "invoice_id": invoice_id,
        "payment_id": payment_id,
        "amount_allocated": amount,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    await _refresh_invoice_status(invoice_id)
    return await get_invoice_reconciliation(invoice_id, current_user)


@router.delete("/invoices/{invoice_id}/allocate/{allocation_id}")
async def deallocate_payment(invoice_id: str, allocation_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Payments (Delete)")
    await _invoice_or_404(invoice_id)
    result = await db.invoice_payments.delete_one({"id": allocation_id, "invoice_id": invoice_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Allocation not found")
    await _refresh_invoice_status(invoice_id)
    return {"message": "Allocation removed"}
