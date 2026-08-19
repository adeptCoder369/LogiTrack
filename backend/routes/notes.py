"""Credit / debit note routes (Phase 4).

Adjustments linked to an invoice. Credit notes reduce the invoice's
outstanding (like a negative allocation); debit notes are recorded
adjustments (informational for v1).
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from pydantic import BaseModel
from datetime import datetime, timezone
import uuid

from .db_compat import db
from auth_utils import get_current_user, check_permission

router = APIRouter(tags=["Notes"])


class NotePayload(BaseModel):
    invoice_id: str
    amount: float
    reason: Optional[str] = None


async def _invoice_or_404(invoice_id: str) -> dict:
    inv = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return inv


async def _validate_note(payload: NotePayload) -> dict:
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    inv = await _invoice_or_404(payload.invoice_id)
    if inv.get("status") == "Draft":
        raise HTTPException(status_code=400, detail="Cannot note a draft invoice")
    return inv


# ============ CREDIT NOTES ============

@router.get("/credit-notes")
async def get_credit_notes(
    invoice_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    await check_permission(current_user, "Credit Notes (View)")
    query = {}
    if invoice_id:
        query["invoice_id"] = invoice_id
    return await db.credit_notes.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)


@router.post("/credit-notes")
async def create_credit_note(payload: NotePayload, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Credit Notes (Create)")
    inv = await _validate_note(payload)

    count = await db.credit_notes.count_documents({})
    note = {
        "id": str(uuid.uuid4()),
        "note_no": f"CN-{str(count + 1).zfill(6)}",
        "invoice_id": payload.invoice_id,
        "company_id": inv.get("billing_company_id") or inv.get("client_company_id"),
        "company_name": inv.get("billing_company_name") or inv.get("client_company_name"),
        "amount": round(payload.amount, 2),
        "reason": payload.reason,
        "applied": True,
        "created_by": current_user.get("id"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.credit_notes.insert_one(note)
    return note


@router.delete("/credit-notes/{note_id}")
async def delete_credit_note(note_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Credit Notes (Delete)")
    result = await db.credit_notes.delete_one({"id": note_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Credit note not found")
    return {"message": "Credit note deleted"}


# ============ DEBIT NOTES ============

@router.get("/debit-notes")
async def get_debit_notes(
    invoice_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    await check_permission(current_user, "Debit Notes (View)")
    query = {}
    if invoice_id:
        query["invoice_id"] = invoice_id
    return await db.debit_notes.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)


@router.post("/debit-notes")
async def create_debit_note(payload: NotePayload, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Debit Notes (Create)")
    inv = await _validate_note(payload)

    count = await db.debit_notes.count_documents({})
    note = {
        "id": str(uuid.uuid4()),
        "note_no": f"DN-{str(count + 1).zfill(6)}",
        "invoice_id": payload.invoice_id,
        "company_id": inv.get("billing_company_id") or inv.get("client_company_id"),
        "company_name": inv.get("billing_company_name") or inv.get("client_company_name"),
        "amount": round(payload.amount, 2),
        "reason": payload.reason,
        "applied": True,
        "created_by": current_user.get("id"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.debit_notes.insert_one(note)
    return note


@router.delete("/debit-notes/{note_id}")
async def delete_debit_note(note_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Debit Notes (Delete)")
    result = await db.debit_notes.delete_one({"id": note_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Debit note not found")
    return {"message": "Debit note deleted"}
