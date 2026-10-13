"""
MongoDB connection management and collection accessors.

Provides access to the two hazard collections:
1. ``max_temperature`` (stores historical daily T_max records and calculations for heatwaves)
2. ``precipitation`` (stores historical daily precipitation records and calculations for drought)
"""

from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.database import Database

from app.config import settings

_client: MongoClient | None = None
_db: Database | None = None


def get_client() -> MongoClient:
    """Return the module-level MongoClient, creating it on first call."""
    global _client
    if _client is None:
        _client = MongoClient(settings.mongo_uri, serverSelectionTimeoutMS=5000)
    return _client


def get_database() -> Database:
    """Return the application database handle."""
    global _db
    if _db is None:
        _db = get_client()[settings.mongo_db_name]
    return _db


def get_max_temperature_collection() -> Collection:
    """Return the ``max_temperature`` collection."""
    return get_database()["max_temperature"]


def get_precipitation_collection() -> Collection:
    """Return the ``precipitation`` collection."""
    return get_database()["precipitation"]


def get_collection_for_hazard(hazard_type: str) -> Collection:
    """Return the collection corresponding to the hazard type."""
    if hazard_type == "heatwave":
        return get_max_temperature_collection()
    elif hazard_type == "drought":
        return get_precipitation_collection()
    raise ValueError(f"Unknown hazard type: {hazard_type}")


def ensure_collections_and_indexes() -> None:
    """Ensure both hazard collections exist in MongoDB and have unique indexes."""
    import logging
    log = logging.getLogger("database")
    try:
        db = get_database()
        existing_collections = db.list_collection_names()

        # Drop legacy collection if present
        if "hazard_analysis" in existing_collections:
            db.drop_collection("hazard_analysis")

        # Explicitly create collections if they don't exist
        for col_name in ("max_temperature", "precipitation"):
            if col_name not in existing_collections:
                db.create_collection(col_name)

        # Ensure unique compound / location_key index
        for col in (get_max_temperature_collection(), get_precipitation_collection()):
            col.create_index([("location_key", 1)], unique=True, name="location_key_unique")
    except Exception as exc:
        log.warning(f"Could not connect to MongoDB or ensure collections/indexes: {exc}. Startup continuing.")


def ensure_indexes() -> None:
    """Alias for backwards compatibility."""
    ensure_collections_and_indexes()


def close_client() -> None:
    """Gracefully close the MongoClient."""
    global _client, _db
    if _client is not None:
        _client.close()
        _client = None
        _db = None
