from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/users", tags=["Users"])

# Shared dependencies
db = None
get_current_user = None

def init_users(database, auth_func):
    global db, get_current_user
    db = database
    get_current_user = auth_func

class UpdateUserRequest(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    email: Optional[str] = None
    depot_id: Optional[str] = None

class AdminCreateUserRequest(BaseModel):
    name: str
    mobile: str
    country_code: str = "91"
    role: str
    email: Optional[str] = None
    depot_id: Optional[str] = None

# Note: Actual implementations remain in server.py
