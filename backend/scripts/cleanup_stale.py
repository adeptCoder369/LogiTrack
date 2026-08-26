import asyncio, sys, uuid
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from dotenv import load_dotenv
load_dotenv(ROOT / ".env")
from database import AsyncSessionLocal
import models_sqlalchemy as m
from sqlalchemy import delete, select

def did(slug, *parts):
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{slug}:{':'.join(parts)}"))

DEMO_SLUGS = ["demo","acme"]
PLATFORM_ID = "11111111-1111-1111-1111-111111111111"

# collect all deterministic ids for demo/acme across key tables
# For now, just clean companies, users, depots, products that were incorrectly under platform
async def clean():
    async with AsyncSessionLocal() as s:
        for slug in DEMO_SLUGS:
            dids = []
            for table, name in [
                ("company","source"),("company","parent"),("company","child1"),("company","child2"),
                ("user","1"),("user","2"),("user","3"),("user","4"),("user","5"),("user","6"),("user","7"),("user","8"),
                ("depot","north"),("depot","west"),("depot","jaipur"),
                ("product","cement"),("product","steel"),("product","aggregate"),
            ]:
                dids.append(did(slug, table, name))
            # delete from companies where id in dids and tenant_id=platform
            for did_val in dids:
                await s.execute(delete(m.Company).where(m.Company.id==did_val))
                await s.execute(delete(m.User).where(m.User.id==did_val))
                await s.execute(delete(m.Depot).where(m.Depot.id==did_val))
                await s.execute(delete(m.Product).where(m.Product.id==did_val))
            print(f"cleaned stale {slug} ids under platform (if any)")
        # also clean any company with name like Demo Logistics% under platform that shouldn't be there (keep only original TATA etc?)
        # Let's just report
        from sqlalchemy import func
        cnt = (await s.execute(select(func.count(m.Company.id)).where(m.Company.tenant_id==PLATFORM_ID))).scalar_one()
        print(f"platform companies count after clean: {cnt}")
        await s.commit()

asyncio.run(clean())
