"""
MongoDB connection management and collection accessors.

Provides access to the two hazard collections:
1. ``max_temperature`` (stores historical daily T_max records and calculations for heatwaves)
2. ``precipitation`` (stores historical daily precipitation records and calculations for drought)
"""

import urllib.parse
from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.database import Database

from app.config import settings

_client: MongoClient | None = None
_db: Database | None = None


def sanitize_mongo_uri(uri: str) -> str:
    """
    Ensure username and password in MongoDB URI are properly escaped
    according to RFC 3986 using urllib.parse.quote_plus to avoid InvalidURI errors.
    """
    if not uri or "://" not in uri or "@" not in uri:
        return uri
    try:
        prefix, rest = uri.split("://", 1)
        creds, host_and_query = rest.rsplit("@", 1)
        if ":" in creds:
            user, pwd = creds.split(":", 1)
            # unquote first to prevent double-encoding, then quote_plus
            safe_user = urllib.parse.quote_plus(urllib.parse.unquote_plus(user))
            safe_pwd = urllib.parse.quote_plus(urllib.parse.unquote_plus(pwd))
            return f"{prefix}://{safe_user}:{safe_pwd}@{host_and_query}"
    except Exception:
        pass
    return uri


def get_client() -> MongoClient:
    """Return the module-level MongoClient, creating it on first call."""
    global _client
    if _client is None:
        clean_uri = sanitize_mongo_uri(settings.mongo_uri)
        _client = MongoClient(clean_uri, serverSelectionTimeoutMS=5000)
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
