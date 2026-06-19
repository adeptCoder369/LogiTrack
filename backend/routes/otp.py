from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import random
import httpx
import os

router = APIRouter(prefix="/otp", tags=["OTP"])

# Shared dependencies
db = None
OTP_EXPIRY_SECONDS = 120
MAX_OTP_ATTEMPTS = 5
MSG91_AUTHKEY = None

def init_otp(database, otp_expiry, msg91_key):
    global db, OTP_EXPIRY_SECONDS, MSG91_AUTHKEY
    db = database
    OTP_EXPIRY_SECONDS = otp_expiry
    MSG91_AUTHKEY = msg91_key

def generate_otp(length=6):
    return ''.join([str(random.randint(0, 9)) for _ in range(length)])

async def send_otp_via_msg91(mobile: str, country_code: str, otp_code: str):
    """Send OTP via MSG91 API"""
    if not MSG91_AUTHKEY:
        return True  # Skip if no key configured
    
    try:
        url = "https://control.msg91.com/api/v5/otp"
        payload = {
            "template_id": "your_template_id",
            "mobile": f"{country_code}{mobile}",
            "authkey": MSG91_AUTHKEY,
            "otp": otp_code,
            "otp_expiry": OTP_EXPIRY_SECONDS // 60 or 1
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=10)
        return response.status_code == 200
    except Exception as e:
        print(f"MSG91 Error: {e}")
        return True  # Don't block on SMS failure

# Request Models
class SendOTPRequest(BaseModel):
    mobile: str
    country_code: str = "91"
    purpose: str = "registration"

class VerifyOTPRequest(BaseModel):
    mobile: str
    country_code: str = "91"
    otp_code: str
    purpose: str = "registration"

# Note: Actual implementations remain in server.py
