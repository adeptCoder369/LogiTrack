"""Extension registry info (Phase 6C)."""
from fastapi import APIRouter, Depends
from auth_utils import get_current_user
from extensions.registry import list_extensions

router = APIRouter(tags=["Extensions"])


@router.get("/extensions")
async def get_extensions(current_user: dict = Depends(get_current_user)):
    # Any authenticated user can list; master can see all
    return {"extensions": list_extensions()}
