"""Server-filtered source list endpoint.

Drives every source dropdown in the UI (Schedule Pickup, Purchase Orders,
pickup filter panel). Returns depot + company sources filtered by the
source_products restriction (see auth_utils.get_excluded_source_ids) and,
for depots, by the user's depot access.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional

from .db_compat import db
from auth_utils import get_current_user, get_user_depot_ids, get_excluded_source_ids

router = APIRouter(tags=["Sources"])


@router.get("/sources")
async def list_sources(
    type: Optional[str] = Query(None, pattern="^(Depot|Company)$"),
    current_user: dict = Depends(get_current_user),
):
    """Sources the user may use for dispatch, filtered server-side.

    Unmapped sources stay visible; a mapped source is visible only when at
    least one of its mapped products is in the user's product access.
    Depots additionally honor the user's depot access.
    """
    excluded = set(await get_excluded_source_ids(current_user) or [])

    sources: List[dict] = []

    if type in (None, "Depot"):
        depot_ids = await get_user_depot_ids(current_user)
        if depot_ids is None:
            depots = await db.depots.find({}, {"_id": 0}).to_list(1000)
        elif not depot_ids:
            depots = []
        else:
            depots = await db.depots.find({"id": {"$in": depot_ids}}, {"_id": 0}).to_list(1000)
        for d in depots:
            if d.get("id") in excluded:
                continue
            sources.append({"id": d["id"], "name": d.get("name") or "", "type": "Depot"})

    if type in (None, "Company"):
        companies = await db.companies.find({}, {"_id": 0}).to_list(1000)
        for c in companies:
            if c.get("id") in excluded:
                continue
            sources.append({"id": c["id"], "name": c.get("name") or "", "type": "Company"})

    return sources
