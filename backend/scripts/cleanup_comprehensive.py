import asyncio, sys, uuid
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from dotenv import load_dotenv
load_dotenv(ROOT / ".env")
from database import AsyncSessionLocal
import models_sqlalchemy as m
from sqlalchemy import delete

def did(slug, *parts):
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{slug}:{':'.join(parts)}"))

PLATFORM = "11111111-1111-1111-1111-111111111111"

async def clean():
    async with AsyncSessionLocal() as s:
        for slug in ["demo","acme"]:
            # generate all dids for this slug
            dids = []
            dids += [did(slug,"company",n) for n in ["source","parent","child1","child2"]]
            dids += [did(slug,"depot",n) for n in ["north","west","jaipur"]]
            dids += [did(slug,"product",n) for n in ["cement","steel","aggregate"]]
            dids += [did(slug,"region",n) for n in ["north","west"]]
            dids += [did(slug,"loc",n) for n in ["delhi","jaipur","mumbai"]]
            dids += [did(slug,"transporter",n) for n in ["1","2"]]
            dids += [did(slug,"truck",str(i)) for i in range(1,6)]
            dids += [did(slug,"user",str(i)) for i in range(1,9)]
            dids += [did(slug,"rz","1")]
            dids += [did(slug,"rs",str(i)) for i in [1,2]]
            # delete from each table where id in dids (regardless of tenant, to clean stale)
            for did_val in dids:
                for model in [m.Company, m.Depot, m.Product, m.Region, m.Location, m.Transporter, m.Truck, m.User, m.RailwayZone, m.RailwaySiding]:
                    try:
                        await s.execute(delete(model).where(model.id==did_val))
                    except Exception:
                        await s.rollback()
            print(f"cleaned {slug} dids")
        await s.commit()
        print("done")

asyncio.run(clean())
