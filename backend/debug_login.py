import asyncio, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from dotenv import load_dotenv
load_dotenv(ROOT / '.env')
from database import AsyncSessionLocal
from server import _find_user_by_mobile, _tenant_id_by_slug, normalize_mobile
from sqlalchemy import select
import models_sqlalchemy as m
async def test():
    tenant_slug="qaaed7f7"
    mobile="9876543299"
    country_code="91"
    tenant_id=await _tenant_id_by_slug(tenant_slug)
    print("tenant_id", tenant_id)
    user=await _find_user_by_mobile(mobile, country_code, tenant_id)
    print("user", user.id if user else None, user.mobile if user else None, user.password_set if user else None)
    # try to simulate login part
    try:
        full_mobile=normalize_mobile(mobile, country_code)
        print("full_mobile", full_mobile)
        from server import generate_otp
        otp=generate_otp()
        print("otp", otp)
        # try to create OTP record
        import uuid, datetime
        from datetime import timezone, timedelta
        otp_doc=m.OTP(id=str(uuid.uuid4()), mobile=full_mobile, country_code=country_code, otp_code=otp, purpose="first_time_setup", verified=False, attempts=0, created_at=datetime.datetime.now(timezone.utc), expires_at=datetime.datetime.now(timezone.utc)+timedelta(seconds=120))
        async with AsyncSessionLocal() as s:
            s.add(otp_doc)
            await s.commit()
        print("otp saved")
    except Exception as e:
        import traceback; traceback.print_exc()
asyncio.run(test())
