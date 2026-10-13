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
    ensure_indexes()
    # Check collections and seed initial data if empty in background
    asyncio.create_task(seed_database_if_empty(force=False))
    yield
    # ── Shutdown ────────────────────────────────────────────────────────
    close_client()


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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ─────────────────────────────────────────────────────────────
app.include_router(analysis_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
