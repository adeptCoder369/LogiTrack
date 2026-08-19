"""Sample hello extension (Phase 6C).

Logs on post_create:companies to prove the hook plumbing. Enable by
importing this module at startup (see server.py).
"""
import logging
from extensions.registry import hook

logger = logging.getLogger(__name__)


@hook("post_create:companies")
async def on_company_created(ctx):
    logger.info("[sample_hello] company created: %s by %s", ctx.get("company", {}).get("name"), ctx.get("user", {}).get("name"))


@hook("validate:invoice")
async def validate_invoice(ctx):
    # Example validator: block invoices with zero total (demo, not enforced)
    invoice = ctx.get("invoice") or {}
    if (invoice.get("total_amount") or 0) <= 0:
        logger.info("[sample_hello] validate:invoice — zero total, would block if enforced")
