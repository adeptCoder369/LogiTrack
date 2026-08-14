"""Source <-> Product access management routes.

Declares which products a source (Depot or Company) can supply. A source
with no mappings is visible to everyone; a mapped source is visible to a
user only when at least one of its mapped products is in the user's
accessible product set.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone
import uuid

from .db_compat import db
from auth_utils import get_current_user

router = APIRouter(tags=["Source Access"])

SOURCE_TYPES = ("Depot", "Company")


def _require_management(user: dict) -> None:
    if user.get("role") != "Management" and not user.get("is_master_admin"):
        raise HTTPException(status_code=403, detail="Only Management can manage source access")


class UpdateSourceAccessRequest(BaseModel):
    product_ids: List[str] = []


async def _resolve_source(source_type: str, source_id: str) -> dict:
    if source_type not in SOURCE_TYPES:
        raise HTTPException(status_code=400, detail="source_type must be Depot or Company")
    if source_type == "Depot":
        source = await db.depots.find_one({"id": source_id}, {"_id": 0})
    else:
        source = await db.companies.find_one({"id": source_id}, {"_id": 0})
    if not source:
        raise HTTPException(status_code=404, detail=f"{source_type} source not found")
    return source


@router.get("/source-access")
async def get_all_source_access(current_user: dict = Depends(get_current_user)):
    """All sources with their mapped products, for the management UI."""
    _require_management(current_user)

    depots = await db.depots.find({}, {"_id": 0}).to_list(1000)
    companies = await db.companies.find({}, {"_id": 0}).to_list(1000)
    products = await db.products.find({}, {"_id": 0}).to_list(1000)
    mappings = await db.source_products.find({"active": {"$ne": False}}, {"_id": 0}).to_list(10000)

    by_source = {}
    for m in mappings:
        by_source.setdefault((m.get("source_type"), m.get("source_id")), []).append(m.get("product_id"))

    def _decorate(source, source_type):
        mapped = by_source.get((source_type, source.get("id")), [])
        return {
            "source_id": source.get("id"),
            "source_name": source.get("name") or source.get("company_name") or "",
            "source_type": source_type,
            "product_ids": mapped,
            "products": [p for p in products if p.get("id") in mapped],
        }

    return {
        "sources": [_decorate(d, "Depot") for d in depots] + [_decorate(c, "Company") for c in companies],
        "products": products,
    }


@router.get("/source-access/source/{source_type}/{source_id}")
async def get_source_access(source_type: str, source_id: str, current_user: dict = Depends(get_current_user)):
    """Mappings for a single source + full product list for the edit form."""
    _require_management(current_user)
    await _resolve_source(source_type, source_id)

    mappings = await db.source_products.find(
        {"source_type": source_type, "source_id": source_id, "active": {"$ne": False}},
        {"_id": 0, "product_id": 1},
    ).to_list(1000)
    product_ids = [m["product_id"] for m in mappings]

    products = await db.products.find({}, {"_id": 0}).to_list(1000)

    return {
        "source_type": source_type,
        "source_id": source_id,
        "assigned_product_ids": product_ids,
        "assigned_products": [p for p in products if p.get("id") in product_ids],
        "all_products": products,
    }


@router.put("/source-access/source/{source_type}/{source_id}")
async def update_source_access(
    source_type: str,
    source_id: str,
    data: UpdateSourceAccessRequest,
    current_user: dict = Depends(get_current_user),
):
    """Replace the product set mapped to a source (Management only)."""
    _require_management(current_user)
    await _resolve_source(source_type, source_id)

    # Validate product ids exist (tenant-scoped).
    product_ids = data.product_ids or []
    valid_products = await db.products.find({"id": {"$in": product_ids}}, {"id": 1}).to_list(1000)
    valid_ids = {p["id"] for p in valid_products}
    invalid_ids = [pid for pid in product_ids if pid not in valid_ids]

    existing = await db.source_products.find(
        {"source_type": source_type, "source_id": source_id},
        {"_id": 0, "product_id": 1},
    ).to_list(1000)
    existing_ids = {m["product_id"] for m in existing}

    now = datetime.now(timezone.utc).isoformat()
    for pid in product_ids:
        if pid not in valid_ids:
            continue
        if pid not in existing_ids:
            await db.source_products.insert_one({
                "id": str(uuid.uuid4()),
                "source_id": source_id,
                "source_type": source_type,
                "product_id": pid,
                "active": True,
                "created_by": current_user.get("id"),
                "created_at": now,
            })
        else:
            await db.source_products.update_one(
                {"source_type": source_type, "source_id": source_id, "product_id": pid},
                {"$set": {"active": True}},
            )
    # Remove (deactivate) mappings no longer in the set.
    to_remove = existing_ids - set(product_ids)
    if to_remove:
        await db.source_products.update_one(
            {"source_type": source_type, "source_id": source_id, "product_id": {"$in": list(to_remove)}},
            {"$set": {"active": False}},
        )

    resp = {"success": True, "message": "Source access updated", "product_ids": [p for p in product_ids if p in valid_ids]}
    if invalid_ids:
        resp["warning"] = f"Some product IDs were invalid and ignored: {invalid_ids}"
    return resp
