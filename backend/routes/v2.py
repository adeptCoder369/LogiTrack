"""API v2 proof-of-concept (Phase 6D).

Small surface that proves dual-version plumbing works without duplicating
the whole API. Real v2 would gradually move resources here.
"""
from fastapi import APIRouter, Depends
from auth_utils import get_current_user
from .db_compat import db

router = APIRouter(prefix="/api/v2", tags=["v2"])


@router.get("/health")
async def health():
    return {"status": "ok", "version": "v2"}


@router.get("/tenants")
async def list_tenants_v2(current_user: dict = Depends(get_current_user)):
    tenants = await db.tenants.find({}, {"_id": 0}).to_list(1000)
    return {"data": tenants, "meta": {"version": "v2"}}


@router.get("/products")
async def list_products_v2(current_user: dict = Depends(get_current_user)):
    products = await db.products.find({}, {"_id": 0}).to_list(1000)
    # v2 adds an explicit version marker per item
    for p in products:
        p["_v"] = 2
    return {"data": products, "meta": {"version": "v2"}}
