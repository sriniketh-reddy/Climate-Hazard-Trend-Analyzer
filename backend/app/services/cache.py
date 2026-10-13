"""
Cache service — MongoDB document storage and incremental caching for:
1. ``max_temperature`` (heatwaves)
2. ``precipitation`` (drought)

Documents are keyed by location:
``location_key = f"{lon},{lat}"`` (used as MongoDB ``_id``).
"""

from __future__ import annotations

from typing import Any, Optional
from pymongo.collection import Collection

from app.database import get_collection_for_hazard


def format_location_key(lon: float, lat: float) -> str:
    """Standardize the coordinate string key 'lon,lat'."""
    return f"{round(lon, 4)},{round(lat, 4)}"


def get_cached_hazard_doc(hazard_type: str, lon: float, lat: float) -> Optional[dict]:
    """Retrieve the cached document for a given location in its hazard collection."""
    collection: Collection = get_collection_for_hazard(hazard_type)
    key_lon_lat = f"{round(lon, 4)},{round(lat, 4)}"
    key_lat_lon = f"{round(lat, 4)},{round(lon, 4)}"
    return collection.find_one({
        "$or": [
            {"_id": key_lon_lat},
            {"_id": key_lat_lon},
            {"location_key": key_lon_lat},
            {"location_key": key_lat_lon},
        ]
    })


def save_hazard_doc(
    hazard_type: str,
    lon: float,
    lat: float,
    updated_date: str,
    dates: list[str],
    values: list[float | None],
    calculations: dict[str, Any],
) -> dict:
    """Save or replace a full hazard document in MongoDB."""
    collection: Collection = get_collection_for_hazard(hazard_type)
    key_lon_lat = f"{round(lon, 4)},{round(lat, 4)}"
    key_lat_lon = f"{round(lat, 4)},{round(lon, 4)}"

    data_payload = {
        "updated_date": updated_date,
        "values": values,
        "dates": dates,
        **calculations,
    }

    doc = {
        "_id": key_lon_lat,
        "location_key": key_lon_lat,
        "latitude": lat,
        "longitude": lon,
        "updated_date": updated_date,
        "dates": dates,
        "values": values,
        "calculations": calculations,
        key_lon_lat: data_payload,
        key_lat_lon: data_payload,
    }

    collection.replace_one({"_id": key_lon_lat}, doc, upsert=True)
    return doc


def update_hazard_doc(
    hazard_type: str,
    lon: float,
    lat: float,
    updated_date: str,
    combined_dates: list[str],
    combined_values: list[float | None],
    calculations: dict[str, Any],
) -> dict:
    """Update existing document with newly fetched data and recalculated metrics."""
    return save_hazard_doc(
        hazard_type=hazard_type,
        lon=lon,
        lat=lat,
        updated_date=updated_date,
        dates=combined_dates,
        values=combined_values,
        calculations=calculations,
    )
