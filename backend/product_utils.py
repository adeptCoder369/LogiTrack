"""Product master resolution helpers (Phase 1).

effective_product merges a company's product_overrides row over the global
product master, so a company can present its own code/name/description/
min_stock/pricing_model for a shared product. Consumed by Phase 4 billing.
"""
from typing import Optional

OVERRIDE_FIELDS = ("code", "name", "description", "min_stock", "pricing_model")


async def effective_product(product_id: str, company_id: Optional[str], db=None):
    """Resolve the effective product for a company.

    Returns the base product dict merged with the company's override (when
    present), plus an `override: bool` flag. None when the product doesn't
    exist. `db` is the db_compat proxy (injected for testability).
    """
    from routes.db_compat import db as _db
    proxy = db or _db

    base = await proxy.products.find_one({"id": product_id}, {"_id": 0})
    if not base:
        return None

    result = dict(base)
    result["override"] = False

    if company_id:
        override = await proxy.product_overrides.find_one({
            "company_id": company_id,
            "product_id": product_id,
            "active": {"$ne": False},
        })
        if override:
            for field in OVERRIDE_FIELDS:
                if override.get(field) is not None:
                    result[field] = override[field]
            result["override"] = True

    return result
