"""
Database Seeding Service.

Ensures that the MongoDB database has both `max_temperature` and `precipitation`
collections, ensures unique indexes, and automatically populates the database with
historical climate records if the collections are newly created or empty.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import date
from typing import List, Tuple

from app.database import (
    ensure_collections_and_indexes,
    get_database,
    get_max_temperature_collection,
    get_precipitation_collection,
)
from app.models.schemas import HazardType
from app.routers.analysis import _compute_hazard
from app.services import cache
from app.services.weather import fetch_daily_weather
from app.utils.grid import snap_to_grid

logger = logging.getLogger("seed")
logging.basicConfig(level=logging.INFO)

# Primary seed locations (covering diverse Indian climate zones)
SEED_LOCATIONS: List[Tuple[str, float, float]] = [
    ("Hyderabad", 17.3850, 78.4867),
    ("New Delhi", 28.6139, 77.2090),
    ("Mumbai", 19.0760, 72.8777),
    ("Bengaluru", 12.9716, 77.5946),
]


async def seed_location_hazard(
    city_name: str,
    lat: float,
    lon: float,
    hazard_type: HazardType,
) -> bool:
    """Fetch and seed historical hazard dataset for a specific location."""
    grid_lat, grid_lon = snap_to_grid(lat, lon)
    hazard_val = hazard_type.value

    # Check if already present
    existing = cache.get_cached_hazard_doc(hazard_val, grid_lon, grid_lat)
    if existing is not None and len(existing.get("dates", [])) > 0:
        logger.info(f"[{city_name}] {hazard_val} is already cached.")
        return True

    earliest_date = date(1940, 1, 1)
    today = date.today()
    var_name = "temperature_2m_max" if hazard_type == HazardType.HEATWAVE else "precipitation_sum"

    logger.info(f"[{city_name}] Fetching {hazard_val} data from Open-Meteo (1940 to present)...")
    try:
        weather = await fetch_daily_weather(
            lat=grid_lat,
            lon=grid_lon,
            start_date=earliest_date,
            end_date=today,
            variables=[var_name],
        )
    except Exception as exc:
        logger.warning(f"[{city_name}] Could not fetch from Open-Meteo: {exc}")
        return False

    parsed_dates = weather["dates"]
    values = weather["variables"][var_name]
    calcs = _compute_hazard(hazard_type, parsed_dates, values)
    date_strings = [d.isoformat() for d in parsed_dates]
    last_date_str = date_strings[-1] if date_strings else today.isoformat()

    cache.save_hazard_doc(
        hazard_type=hazard_val,
        lon=grid_lon,
        lat=grid_lat,
        updated_date=last_date_str,
        dates=date_strings,
        values=values,
        calculations=calcs,
    )
    logger.info(f"[{city_name}] Successfully seeded {hazard_val} ({len(date_strings)} days cached).")
    return True


async def seed_database_if_empty(force: bool = False) -> None:
    """
    Ensure collections exist and populate seed data if empty or forced.
    """
    ensure_collections_and_indexes()

    temp_col = get_max_temperature_collection()
    precip_col = get_precipitation_collection()

    temp_count = temp_col.count_documents({})
    precip_count = precip_col.count_documents({})

    logger.info(f"Current DB state: max_temperature={temp_count} docs, precipitation={precip_count} docs")

    if not force and temp_count > 0 and precip_count > 0:
        logger.info("Database collections already contain data. Skipping seeding.")
        return

    logger.info("Database collections are empty or force=True. Seeding primary Indian cities...")

    for city_name, lat, lon in SEED_LOCATIONS:
        # Seed Heatwave
        if force or temp_count == 0:
            await seed_location_hazard(city_name, lat, lon, HazardType.HEATWAVE)
        # Seed Drought
        if force or precip_count == 0:
            await seed_location_hazard(city_name, lat, lon, HazardType.DROUGHT)

    logger.info("Seeding routine completed.")


def main():
    """CLI runner: python -m app.seed"""
    asyncio.run(seed_database_if_empty(force=False))


if __name__ == "__main__":
    main()
