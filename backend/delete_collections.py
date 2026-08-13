import os
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from pathlib import Path
from dotenv import load_dotenv
from database import AsyncSessionLocal, Base, engine
import models_sqlalchemy as sql_models

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

tables = [
    sql_models.Pickup,
    sql_models.PurchaseOrder,
    sql_models.Lifting,
    sql_models.DepotInventory,
    sql_models.CompanyInventory,
    sql_models.DeliveryOrder,
    sql_models.VerifiedTruck,
]

async def clear_tables():
    async with AsyncSessionLocal() as session:
        for table in tables:
            result = await session.execute(select(func.count(table.id)))
            count = result.scalar_one()
            if count > 0:
                await session.execute(delete(table))
                await session.commit()
                print(f"  {table.__tablename__}: deleted {count} records")
            else:
                print(f"  {table.__tablename__}: 0 records (already empty)")

if __name__ == "__main__":
    print("Clearing MySQL tables...")
    asyncio.run(clear_tables())
    print("Done!")