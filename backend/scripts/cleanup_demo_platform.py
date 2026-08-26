import asyncio, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from dotenv import load_dotenv
load_dotenv(ROOT / ".env")
from database import AsyncSessionLocal
import models_sqlalchemy as m
from sqlalchemy import delete, or_

PLATFORM = "11111111-1111-1111-1111-111111111111"

async def clean():
    async with AsyncSessionLocal() as s:
        # companies
        for model, name_col in [
            (m.Company, m.Company.name),
            (m.Depot, m.Depot.name),
            (m.Product, m.Product.product_name),
            (m.Transporter, m.Transporter.name),
            (m.Truck, m.Truck.vehicle_number),
            (m.Region, m.Region.name),
            (m.Location, m.Location.name),
            (m.RailwayZone, m.RailwayZone.railway_zone),
            (m.RailwaySiding, m.RailwaySiding.siding_name),
            (m.Department, m.Department.name),
            (m.Designation, m.Designation.name),
            (m.Firm, m.Firm.name),
        ]:
            try:
                res = await s.execute(delete(model).where(model.tenant_id==PLATFORM).where(or_(name_col.like("%Demo%"), name_col.like("%demo%"), name_col.like("%ACME%"), name_col.like("%acme%"), name_col.like("%DEMO%"))))
                if res.rowcount:
                    print(f"cleaned {model.__tablename__}: {res.rowcount}")
            except Exception as e:
                print(f"{model.__tablename__} err {e}")
                await s.rollback()
        # users by name
        try:
            res = await s.execute(delete(m.User).where(m.User.tenant_id==PLATFORM).where(or_(m.User.name.like("%(demo)%"), m.User.name.like("%(acme)%"))))
            if res.rowcount: print(f"cleaned users: {res.rowcount}")
        except Exception as e:
            print(f"users err {e}")
            await s.rollback()
        # employees by name
        try:
            res = await s.execute(delete(m.Employee).where(m.Employee.tenant_id==PLATFORM).where(or_(m.Employee.name.like("%demo%"), m.Employee.name.like("%acme%"))))
            if res.rowcount: print(f"cleaned employees: {res.rowcount}")
        except Exception as e:
            print(f"employees err {e}")
            await s.rollback()
        await s.commit()
        print("done")

asyncio.run(clean())
