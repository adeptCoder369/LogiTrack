from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import jwt
import bcrypt
import os

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Import shared dependencies - these will be set from server.py
db = None
JWT_SECRET = None
JWT_ALGORITHM = None
OTP_EXPIRY_SECONDS = None

def init_auth(database, secret, algorithm, otp_expiry):
    global db, JWT_SECRET, JWT_ALGORITHM, OTP_EXPIRY_SECONDS
    db = database
    JWT_SECRET = secret
    JWT_ALGORITHM = algorithm
    OTP_EXPIRY_SECONDS = otp_expiry

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user: dict) -> str:
    payload = {
        "user_id": user["id"],
        "role": user.get("role", "user"),
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

# Request Models
class LoginWithPasswordRequest(BaseModel):
    mobile: str
    country_code: str = "91"
    password: str

class LoginWithOTPRequest(BaseModel):
    mobile: str
    country_code: str = "91"

class FirstTimeSetupRequest(BaseModel):
    mobile: str
    country_code: str = "91"
    otp_code: str
    new_password: str

class ForgotPasswordRequest(BaseModel):
    mobile: str
    country_code: str = "91"

class ResetPasswordRequest(BaseModel):
    mobile: str
    country_code: str = "91"
    otp_code: str
    new_password: str

class VerifyLoginOTPRequest(BaseModel):
    mobile: str
    country_code: str = "91"
    otp_code: str
    purpose: str = "login"

# Note: The actual route implementations remain in server.py for now
# This file serves as a template for future refactoring
