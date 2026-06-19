from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from typing import Optional
from datetime import datetime, timezone
import uuid
import io

router = APIRouter(prefix="/import", tags=["Imports"])

# Shared dependencies
db = None

def init_imports(database):
    global db
    db = database

# Note: Actual implementations remain in server.py
# Templates and bulk import logic for:
# - trucks
# - products
# - companies
# - transporters
