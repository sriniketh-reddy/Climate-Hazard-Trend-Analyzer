"""
FastAPI application factory and entry point.

Lifespan
--------
- **Startup**: initialises the MongoDB connection and ensures the compound
  unique index on ``hazard_analysis`` exists.
- **Shutdown**: gracefully closes the MongoDB client.

CORS is configured to allow the Vite dev server's origin.
"""

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import close_client, ensure_indexes
from app.routers.analysis import router as analysis_router
from app.seed import seed_database_if_empty


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — startup / shutdown hooks."""
    # ── Startup ─────────────────────────────────────────────────────────
    try:
        ensure_indexes()
        # Check collections and seed initial data if empty in background
        asyncio.create_task(seed_database_if_empty(force=False))
    except Exception as exc:
        import logging
        logging.getLogger("uvicorn.error").warning(
            f"MongoDB connection deferred on startup: {exc}. Server will start normally."
        )
    yield
    # ── Shutdown ────────────────────────────────────────────────────────
    try:
        close_client()
    except Exception:
        pass


app = FastAPI(
    title="Climate Hazard Trend Analyzer",
    description=(
        "Analyses historical climate hazards (heatwaves, meteorological drought) "
        "for locations in India using Open-Meteo ERA5 reanalysis data."
    ),
    version=settings.analysis_version,
    lifespan=lifespan,
)

# ── CORS ────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ─────────────────────────────────────────────────────────────
app.include_router(analysis_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
