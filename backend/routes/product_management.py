"""Product master overrides + company pricing management (Phase 1).

Overrides let a company present its own code/name/description/min_stock/
pricing_model for a global product. Company pricing is the rate list Phase 4
invoicing consumes. Both are Management-gated.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone
import uuid

from .db_compat import db
from auth_utils import get_current_user
from product_utils import effective_product

router = APIRouter(tags=["Product Management"])


def _require_management(user: dict) -> None:
    if user.get("role") != "Management" and not user.get("is_master_admin"):
        raise HTTPException(status_code=403, detail="Only Management can manage product settings")


class OverridePayload(BaseModel):
    company_id: str
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    min_stock: Optional[float] = None
    pricing_model: Optional[str] = None
    active: Optional[bool] = None


class PricingPayload(BaseModel):
    company_id: str
    product_id: str
    tier: Optional[str] = None
    rate: float
    currency: Optional[str] = "INR"
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None


async def _resolve_company(company_id: str) -> dict:
    company = await db.companies.find_one({"id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


# ============ PRODUCT OVERRIDES ============

@router.get("/product-overrides")
async def list_product_overrides(
    company_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    _require_management(current_user)
    query = {}
    if company_id:
        query["company_id"] = company_id
    overrides = await db.product_overrides.find(query, {"_id": 0}).to_list(1000)
    return overrides


@router.put("/product-overrides/{product_id}")
async def upsert_product_override(
    product_id: str,
    data: OverridePayload,
    current_user: dict = Depends(get_current_user),
):
    _require_management(current_user)
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    company = await _resolve_company(data.company_id)

    existing = await db.product_overrides.find_one({
        "company_id": data.company_id, "product_id": product_id,
    })
    now = datetime.now(timezone.utc).isoformat()

    fields = {k: v for k, v in data.model_dump(exclude_none=True).items() if k not in ("company_id", "product_id")}
    fields["active"] = data.active if data.active is not None else True

    if existing:
        await db.product_overrides.update_one(
            {"id": existing["id"]},
            {"$set": fields},
        )
        override_id = existing["id"]
    else:
        override_id = str(uuid.uuid4())
        await db.product_overrides.insert_one({
            "id": override_id,
            "tenant_id": company.get("tenant_id"),
            "company_id": data.company_id,
            "product_id": product_id,
            "created_at": now,
            **fields,
        })

    return await db.product_overrides.find_one({"id": override_id}, {"_id": 0})


@router.delete("/product-overrides/{product_id}")
async def deactivate_product_override(
    product_id: str,
    company_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    _require_management(current_user)
    await db.product_overrides.update_one(
        {"company_id": company_id, "product_id": product_id},
        {"$set": {"active": False}},
    )
    return {"success": True, "message": "Override deactivated"}


@router.get("/products/{product_id}/effective")
async def get_effective_product(
    product_id: str,
    company_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """The company-resolved product (master + override merge)."""
    _require_management(current_user)
    resolved = await effective_product(product_id, company_id)
    if not resolved:
        raise HTTPException(status_code=404, detail="Product not found")
    return resolved


# ============ COMPANY PRICING ============

@router.get("/company-pricing")
async def list_company_pricing(
    company_id: Optional[str] = Query(None),
    product_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    _require_management(current_user)
    query = {}
    if company_id:
        query["company_id"] = company_id
    if product_id:
        query["product_id"] = product_id
    return await db.company_pricing.find(query, {"_id": 0}).to_list(1000)


@router.post("/company-pricing")
async def create_company_pricing(data: PricingPayload, current_user: dict = Depends(get_current_user)):
    _require_management(current_user)
    company = await _resolve_company(data.company_id)
    product = await db.products.find_one({"id": data.product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    now = datetime.now(timezone.utc).isoformat()
    pricing_id = str(uuid.uuid4())
    await db.company_pricing.insert_one({
        "id": pricing_id,
        "tenant_id": company.get("tenant_id"),
        "company_id": data.company_id,
        "product_id": data.product_id,
        "tier": data.tier,
        "rate": data.rate,
        "currency": data.currency or "INR",
        "valid_from": data.valid_from,
        "valid_to": data.valid_to,
        "created_at": now,
    })
    return await db.company_pricing.find_one({"id": pricing_id}, {"_id": 0})


@router.put("/company-pricing/{pricing_id}")
async def update_company_pricing(
    pricing_id: str,
    data: PricingPayload,
    current_user: dict = Depends(get_current_user),
):
    _require_management(current_user)
    existing = await db.company_pricing.find_one({"id": pricing_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Pricing row not found")

    fields = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    fields.pop("company_id", None)
    fields.pop("product_id", None)
    if data.company_id != existing.get("company_id"):
        raise HTTPException(status_code=400, detail="Cannot move a pricing row to another company")

    await db.company_pricing.update_one({"id": pricing_id}, {"$set": fields})
    return await db.company_pricing.find_one({"id": pricing_id}, {"_id": 0})


@router.delete("/company-pricing/{pricing_id}")
async def delete_company_pricing(pricing_id: str, current_user: dict = Depends(get_current_user)):
    _require_management(current_user)
    await db.company_pricing.delete_one({"id": pricing_id})
    return {"success": True, "message": "Pricing row deleted"}
