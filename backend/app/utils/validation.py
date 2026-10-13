"""
Input validation helpers.

Centralises coordinate, date-range, and hazard-type validation so that
error messages are consistent and the router stays thin.
"""

from __future__ import annotations

from datetime import date

from fastapi import HTTPException

from app.models.schemas import HazardType

# India bounding box (generous approximation)
LAT_MIN, LAT_MAX = 6.0, 38.0
LON_MIN, LON_MAX = 68.0, 98.0

MAX_RANGE_YEARS = 60

# Default baseline for percentile calculations (WMO 1991-2020 reference)
DEFAULT_BASELINE_START = date(1991, 1, 1)
DEFAULT_BASELINE_END = date(2020, 12, 31)


def validate_coordinates(lat: float, lon: float) -> None:
    """Raise 422 if coordinates fall outside the India bounding box."""
    if not (LAT_MIN <= lat <= LAT_MAX):
        raise HTTPException(
            status_code=422,
            detail=f"Latitude {lat} is outside the supported range [{LAT_MIN}, {LAT_MAX}].",
        )
    if not (LON_MIN <= lon <= LON_MAX):
        raise HTTPException(
            status_code=422,
            detail=f"Longitude {lon} is outside the supported range [{LON_MIN}, {LON_MAX}].",
        )


def validate_date_range(start: date, end: date) -> None:
    """Raise 422 if the date range is invalid."""
    if end <= start:
        raise HTTPException(status_code=422, detail="end_date must be after start_date.")
    if start < date(1940, 1, 1):
        raise HTTPException(status_code=422, detail="start_date must be on or after 1940-01-01.")


def resolve_baseline(
    baseline_start: date | None,
    baseline_end: date | None,
) -> tuple[date, date]:
    """Return explicit or default baseline boundaries.

    The default baseline is the WMO standard 1991-2020 reference period.
    """
    bs = baseline_start or DEFAULT_BASELINE_START
    be = baseline_end or DEFAULT_BASELINE_END
    if be <= bs:
        raise HTTPException(status_code=422, detail="baseline_end must be after baseline_start.")
    return bs, be
