"""
Wipe ALL business data and leave only PLATFORM tenant + master admin.
Usage:
  python scripts/reset_to_master.py --yes          # delete everything, recreate master
  python scripts/reset_to_master.py --dry-run      # show what would be deleted
  python scripts/reset_to_master.py --yes --keep-uploads  # keep files on disk

After this, DB is empty except platform/master. Run `python scripts/seed_demo.py --fresh` to re-seed demo+acme before boss handover.
"""
import argparse
import asyncio
import sys
import uuid
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
try:
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env")
except Exception:
    pass

import os
import bcrypt
from sqlalchemy import delete, select, text, func

from database import AsyncSessionLocal, engine, Base
import models_sqlalchemy as m
from tenant import PLATFORM_TENANT_ID

# delete order: children first (same as seed_demo but extended)
WIPE_MODELS = [
    # child-most
    m.UsageLog, m.BillingEvent, m.Subscription,
    m.StockTransferAudit, m.StockTransfer, m.ApprovalMatrix,
    m.InvoiceItem, m.Invoice, m.InvoicePayment, m.Payment, m.CreditNote, m.DebitNote,
    m.Pickup, m.Lifting, m.VerifiedTruck, m.DeliveryOrder, m.PurchaseOrder,
    m.FirmAccess, m.FirmFactory, m.FirmOffice, m.Firm,
    m.Employee, m.Designation, m.Department,
    m.Lead,
    m.ClientFactory, m.ClientOffice, m.ClientModule,
    m.CompanyPricing, m.ProductOverride, m.SourceProduct,
    m.DepotInventory, m.CompanyInventory,
    m.Truck, m.Transporter, m.RailwaySiding, m.RailwayZone,
    m.Depot, m.Location, m.Region,
    m.Product,
    m.CompanyUser, m.Company,
    # auth / tenants last
    m.OTP, m.Permission,
    m.User,
    m.Tenant,
]

def hp(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

async def ensure_platform_tenant():
    async with AsyncSessionLocal() as s:
        t = (await s.execute(select(m.Tenant).where(m.Tenant.id == PLATFORM_TENANT_ID))).scalar_one_or_none()
        if t:
            t.slug = "platform"
            t.name = "Platform"
            t.status = "active"
            t.subscription_plan = "enterprise"
            t.branding = {"name": "Platform", "primary": "222 47% 11%", "accent": "24 95% 53%"}
            t.feature_flags = {"invoices": True, "stock_transfers": True, "leads": True, "firms": True, "reports": True}
            await s.commit()
            print(f"  platform tenant exists {PLATFORM_TENANT_ID[:8]} -> updated")
            return t
        # create
        plat = m.Tenant(
            id=PLATFORM_TENANT_ID, name="Platform", slug="platform", status="active",
            subscription_plan="enterprise",
            branding={"name": "Platform", "primary": "222 47% 11%", "accent": "24 95% 53%"},
            feature_flags={"invoices": True, "stock_transfers": True, "leads": True, "firms": True, "reports": True},
            created_at=datetime.now(timezone.utc),
        )
        s.add(plat)
        await s.commit()
        print(f"  platform tenant created {PLATFORM_TENANT_ID[:8]}")
        return plat

async def ensure_master_admin():
    mobile = os.environ.get("MASTER_ADMIN_MOBILE", "9999999999").strip()
    # stored as 91+mobile in DB per normalize_mobile
    full_mobile = f"91{mobile}" if not mobile.startswith("91") else mobile
    # also accept digits only
    pwd = os.environ.get("MASTER_ADMIN_PASSWORD", "Master@123")
    name = os.environ.get("MASTER_ADMIN_NAME", "Master Admin")
    email = os.environ.get("MASTER_ADMIN_EMAIL", "admin@logitrackpro.com")
    hashed = hp(pwd)
    async with AsyncSessionLocal() as s:
        # master is identified by is_master_admin true or tenant_id platform + mobile
        existing = (await s.execute(select(m.User).where(m.User.is_master_admin == True))).scalar_one_or_none()
        if not existing:
            # fallback by mobile + platform
            existing = (await s.execute(select(m.User).where(m.User.mobile == full_mobile, m.User.tenant_id == PLATFORM_TENANT_ID))).scalar_one_or_none()
        if existing:
            existing.mobile = full_mobile
            existing.country_code = "91"
            existing.password = hashed
            existing.password_set = True
            existing.otp_verified = True
            existing.role = "Management"
            existing.name = name
            existing.email = email
            existing.tenant_id = PLATFORM_TENANT_ID
            existing.is_master_admin = True
            existing.company_id = None
            existing.depot_id = None
            existing.assigned_products = []
            existing.assigned_depots = []
            await s.commit()
            print(f"  master admin updated {existing.id[:8]} {full_mobile} / {pwd}")
            return existing
        u = m.User(
            id=str(uuid.uuid4()),
            tenant_id=PLATFORM_TENANT_ID,
            name=name,
            mobile=full_mobile,
            country_code="91",
            password=hashed,
            role="Management",
            email=email,
            password_set=True,
            otp_verified=True,
            is_master_admin=True,
            assigned_products=[],
            assigned_depots=[],
            created_at=datetime.now(timezone.utc),
        )
        s.add(u)
        await s.commit()
        print(f"  master admin created {u.id[:8]} {full_mobile} / {pwd}")
        return u

async def wipe_all(dry_run=False, keep_uploads=False):
    # ensure tables exist
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print(" tables ensured (create_all)")
    except Exception as e:
        print(f" warning create_all: {e}")

    # count before
    counts = {}
    async with AsyncSessionLocal() as s:
        for model in WIPE_MODELS:
            try:
                cnt = (await s.execute(select(func.count()).select_from(model))).scalar_one()
                counts[model.__tablename__] = cnt
            except Exception as e:
                counts[model.__tablename__] = -1
    print("\n current row counts:")
    for tbl, cnt in counts.items():
        if cnt > 0:
            print(f"  {tbl:22} {cnt}")
    total = sum(v for v in counts.values() if v>0)
    print(f"  TOTAL {total} rows")

    if dry_run:
        print("\n [dry-run] nothing deleted. Re-run with --yes to wipe.")
        return

    print("\n wiping all business data...")
    # delete in order, but keep platform tenant + master admin by re-creating after
    for model in WIPE_MODELS:
        try:
            async with AsyncSessionLocal() as s:
                await s.execute(delete(model))
                await s.commit()
            # print(f"  wiped {model.__tablename__}")
        except Exception as e:
            # table may not exist yet
            if "1146" in str(e) or "doesn't exist" in str(e):
                continue
            print(f"  warn wipe {model.__tablename__}: {e}")

    print("  all tables truncated")

    # recreate platform + master
    await ensure_platform_tenant()
    await ensure_master_admin()

    # clean uploads unless keep
    if not keep_uploads:
        upload_root = ROOT / "uploads"
        if upload_root.exists():
            # keep platform dir but clear files inside tenant dirs? we clear all files under uploads/*/*
            removed = 0
            for p in upload_root.rglob("*"):
                if p.is_file():
                    try:
                        p.unlink()
                        removed += 1
                    except Exception:
                        pass
            print(f"  uploads cleared: {removed} files removed (dirs kept)")

    # final counts
    async with AsyncSessionLocal() as s:
        tenants = (await s.execute(select(m.Tenant))).scalars().all()
        users = (await s.execute(select(m.User))).scalars().all()
        print(f"\n after wipe: tenants {len(tenants)} {[t.slug for t in tenants]}")
        print(f" after wipe: users {len(users)}")
        for u in users:
            print(f"  - {u.name} {u.mobile} {u.role} is_master={u.is_master_admin} tenant={u.tenant_id[:8]}")

    print("\n done. DB now has ONLY platform + master admin.")
    print(" To re-seed demo before boss handover: python scripts/seed_demo.py --fresh")
    print(" Master login: POST /api/v1/auth/login {mobile:\"919999999999\", password:\"Master@123\"} (or env MASTER_ADMIN_*)")

def main():
    ap = argparse.ArgumentParser(description="Wipe all data, keep only master admin")
    ap.add_argument("--yes", action="store_true", help="confirm destructive wipe")
    ap.add_argument("--dry-run", action="store_true", help="show counts, do not delete")
    ap.add_argument("--keep-uploads", action="store_true", help="do not delete uploads/* files")
    args = ap.parse_args()
    if not args.yes and not args.dry_run:
        print(" DANGER: this will DELETE all companies/depots/products/orders/... leaving only platform + master admin.")
        print(" Re-run with --dry-run to preview, or --yes to confirm.")
        print(" Example: python scripts/reset_to_master.py --dry-run")
        print("          python scripts/reset_to_master.py --yes")
        sys.exit(1)
    asyncio.run(wipe_all(dry_run=args.dry_run, keep_uploads=args.keep_uploads))

if __name__ == "__main__":
    main()
