import asyncio, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import os
from dotenv import load_dotenv
load_dotenv(ROOT / ".env")
from database import AsyncSessionLocal
import models_sqlalchemy as m
from sqlalchemy import select, func

async def chk():
    async with AsyncSessionLocal() as s:
        for name, model in [('tenants', m.Tenant), ('companies', m.Company), ('users', m.User)]:
            try:
                cnt = (await s.execute(select(func.count(model.id)))).scalar_one()
                print(name, cnt)
                q = select(model.id, model.tenant_id if hasattr(model,'tenant_id') else model.id)
                if hasattr(model,'slug'):
                    q = select(model.id, model.slug, model.name)
                elif hasattr(model,'name'):
                    q = select(model.id, model.tenant_id, model.name)
                rows = (await s.execute(q.limit(5))).all()
                for r in rows:
                    print(' ',r)
            except Exception as e:
                print(name, 'err', e)
                import traceback; traceback.print_exc()

asyncio.run(chk())
