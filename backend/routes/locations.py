"""Region -> Location -> Depot hierarchy routes (Phase 2).

Regions and locations organize depots; roll-up endpoints aggregate depot
inventory along the chain for reports/analytics.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone
import uuid

from .db_compat import db
from auth_utils import get_current_user, check_permission

router = APIRouter(tags=["Locations"])


class RegionPayload(BaseModel):
    name: str
    code: Optional[str] = None


class LocationPayload(BaseModel):
    name: str
    region_id: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None


async def _region_exists(region_id: Optional[str]) -> None:
    if not region_id:
        return
    if not await db.regions.find_one({"id": region_id}):
        raise HTTPException(status_code=400, detail="Unknown region")


# ============ REGIONS ============

@router.post("/regions")
async def create_region(data: RegionPayload, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Regions (Create)")
    region = {"id": str(uuid.uuid4()), **data.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
    await db.regions.insert_one(region)
    return region


@router.get("/regions")
async def get_regions(current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Regions (View)")
    return await db.regions.find({}, {"_id": 0}).sort("name", 1).to_list(1000)


@router.get("/regions/{region_id}")
async def get_region(region_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Regions (View)")
    region = await db.regions.find_one({"id": region_id}, {"_id": 0})
    if not region:
        raise HTTPException(status_code=404, detail="Region not found")
    return region


@router.put("/regions/{region_id}")
async def update_region(region_id: str, data: RegionPayload, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Regions (Update)")
    await db.regions.update_one({"id": region_id}, {"$set": data.model_dump()})
    region = await db.regions.find_one({"id": region_id}, {"_id": 0})
    if not region:
        raise HTTPException(status_code=404, detail="Region not found")
    return region


@router.delete("/regions/{region_id}")
async def delete_region(region_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Regions (Delete)")
    locations = await db.locations.count_documents({"region_id": region_id})
    if locations:
        raise HTTPException(status_code=400, detail="Region has locations; move or delete them first")
    await db.regions.delete_one({"id": region_id})
    return {"message": "Region deleted"}


# ============ LOCATIONS ============

@router.post("/locations")
async def create_location(data: LocationPayload, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Locations (Create)")
    await _region_exists(data.region_id)
    location = {"id": str(uuid.uuid4()), **data.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
    await db.locations.insert_one(location)
    return location


@router.get("/locations")
async def get_locations(current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Locations (View)")
    return await db.locations.find({}, {"_id": 0}).sort("name", 1).to_list(1000)


@router.get("/locations/{location_id}")
async def get_location(location_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Locations (View)")
    location = await db.locations.find_one({"id": location_id}, {"_id": 0})
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    return location


@router.put("/locations/{location_id}")
async def update_location(location_id: str, data: LocationPayload, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Locations (Update)")
    await _region_exists(data.region_id)
    await db.locations.update_one({"id": location_id}, {"$set": data.model_dump()})
    location = await db.locations.find_one({"id": location_id}, {"_id": 0})
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    return location


@router.delete("/locations/{location_id}")
async def delete_location(location_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Locations (Delete)")
    depots = await db.depots.count_documents({"location_id": location_id})
    if depots:
        raise HTTPException(status_code=400, detail="Location has depots; move or delete them first")
    await db.locations.delete_one({"id": location_id})
    return {"message": "Location deleted"}


# ============ HIERARCHY + ROLL-UP ============

@router.get("/locations/tree")
async def get_location_tree(current_user: dict = Depends(get_current_user)):
    """Region -> locations -> depots, with per-depot inventory totals."""
    await check_permission(current_user, "Locations (View)")
    regions = await db.regions.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    locations = await db.locations.find({}, {"_id": 0}).to_list(1000)
    depots = await db.depots.find({}, {"_id": 0}).to_list(1000)
    inventory_rows = await db.depot_inventory.find({}, {"_id": 0, "depot_id": 1, "available_quantity": 1}).to_list(10000)

    by_depot = {}
    for row in inventory_rows:
        by_depot.setdefault(row.get("depot_id"), 0)
        by_depot[row["depot_id"]] += row.get("available_quantity") or 0

    def _depot_node(depot):
        return {
            "id": depot["id"],
            "name": depot.get("name") or "",
            "company_id": depot.get("company_id"),
            "available_quantity": round(by_depot.get(depot["id"], 0), 2),
        }

    region_nodes = []
    for region in regions:
        loc_nodes = []
        for location in locations:
            if location.get("region_id") != region["id"]:
                continue
            loc_depots = [_depot_node(d) for d in depots if d.get("location_id") == location["id"]]
            loc_nodes.append({
                "id": location["id"],
                "name": location.get("name") or "",
                "city": location.get("city"),
                "state": location.get("state"),
                "depots": loc_depots,
                "depot_count": len(loc_depots),
                "available_quantity": round(sum(d["available_quantity"] for d in loc_depots), 2),
            })
        region_nodes.append({
            "id": region["id"],
            "name": region.get("name") or "",
            "code": region.get("code"),
            "locations": loc_nodes,
            "location_count": len(loc_nodes),
            "depot_count": sum(l["depot_count"] for l in loc_nodes),
            "available_quantity": round(sum(l["available_quantity"] for l in loc_nodes), 2),
        })

    # Unassigned depots (no location) surface too, so nothing vanishes.
    assigned_ids = {d["id"] for loc in region_nodes for l in loc["locations"] for d in l["depots"]}
    unassigned = [_depot_node(d) for d in depots if d["id"] not in assigned_ids]

    return {"regions": region_nodes, "unassigned_depots": unassigned}


@router.get("/locations/{location_id}/overview")
async def get_location_overview(location_id: str, current_user: dict = Depends(get_current_user)):
    """Roll-up for one location: depots + inventory totals (Region->Location->Depot->Inventory)."""
    await check_permission(current_user, "Locations (View)")
    location = await db.locations.find_one({"id": location_id}, {"_id": 0})
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    depots = await db.depots.find({"location_id": location_id}, {"_id": 0}).to_list(1000)
    inventory = await db.depot_inventory.find({"depot_id": {"$in": [d["id"] for d in depots]}}, {"_id": 0}).to_list(10000)

    by_product = {}
    total_available = 0.0
    for row in inventory:
        qty = row.get("available_quantity") or 0
        total_available += qty
        pid = row.get("product_id") or "unknown"
        info = by_product.setdefault(pid, {"product_id": pid, "product_name": row.get("product_name") or "", "available_quantity": 0})
        info["available_quantity"] += qty

    region = await db.regions.find_one({"id": location.get("region_id")}, {"_id": 0, "name": 1, "code": 1}) if location.get("region_id") else None

    return {
        "location": location,
        "region": region,
        "depot_count": len(depots),
        "depots": depots,
        "total_available": round(total_available, 2),
        "by_product": sorted(by_product.values(), key=lambda x: -x["available_quantity"]),
    }
