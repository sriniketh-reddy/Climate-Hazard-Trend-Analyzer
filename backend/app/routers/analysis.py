"""
Analysis API router.

Implements ``POST /api/analysis`` — the single endpoint that the React
frontend calls to request a hazard analysis.

Collection Strategy:
- heatwave  → `max_temperature` collection in MongoDB
- drought   → `precipitation` collection in MongoDB

Document Format:
- Keyed by `f"{lon},{lat}"`
- Contains `updated_date`, `values`, `dates`, and `calculations`.

Caching & Incremental Update Logic:
1. Snap lat/lon to ERA5 0.25° grid.
2. Check if document exists in suitable collection.
3. If document NOT found:
   - Fetch complete historical record from 1940-01-01 to `today`.
   - Run calculations and store in MongoDB.
   - Return sliced response for user requested `start_date` to `end_date`.
4. If document IS found:
   - Check `doc["updated_date"]` vs `request.end_date`:
     a. If `updated_date >= request.end_date`:
        - Do not call Open-Meteo or recalculate raw series.
        - Return cached response sliced to user requested date range.
     b. If `updated_date < request.end_date`:
        - Fetch incremental records from `(updated_date + 1 day)` to `today`.
        - Combine old and new values.
        - Recompute full calculations.
        - Update document in MongoDB (`updated_date = today`, append values, update calcs).
        - Return response sliced to user requested date range.
"""

from __future__ import annotations

from dataclasses import asdict
from datetime import date, datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, HTTPException

from app.config import settings
from app.models.schemas import AnalysisRequest, HazardType
from app.services import cache
from app.services.drought import DroughtAnalyzer
from app.services.heatwave import HeatwaveAnalyzer
from app.services.trend import TrendResult, calculate_trend
from app.services.weather import WeatherDataError, fetch_daily_weather
from app.utils.data_quality import assess_quality
from app.utils.grid import snap_to_grid
from app.utils.validation import validate_coordinates, validate_date_range

router = APIRouter(prefix="/api", tags=["analysis"])


def _compute_hazard(
    hazard_type: HazardType,
    dates: list[date],
    values: list[float | None],
) -> dict[str, Any]:
    """Run full hazard analysis on contiguous daily time series."""
    if hazard_type == HazardType.HEATWAVE:
        var_name = "temperature_2m_max"
        analyzer = HeatwaveAnalyzer()
        hw_result = analyzer.analyze(dates=dates, tmax_values=values)
        monthly_metrics = [asdict(m) for m in hw_result.monthly_metrics]
        annual_metrics = [asdict(m) for m in hw_result.annual_metrics]

        trend_years = [m.year for m in hw_result.annual_metrics]
        trend_values = [float(m.total_heatwave_days) for m in hw_result.annual_metrics]
        trend = calculate_trend(trend_years, trend_values, "Heatwave days", unit="days")

        hazard_definition = {
            "method": "percentile_exceedance",
            "variable": var_name,
            "percentile": hw_result.percentile,
            "threshold_value": hw_result.threshold_celsius,
            "threshold_unit": "°C",
            "min_consecutive_days": hw_result.min_consecutive_days,
            "dry_month_percentile_threshold": None,
            "baseline_period": hw_result.baseline_period,
            "description": (
                f"A heatwave is counted when the daytime temperature reaches {hw_result.threshold_celsius}°C "
                f"or higher for at least {hw_result.min_consecutive_days} days in a row."
            ),
        }
    elif hazard_type == HazardType.DROUGHT:
        var_name = "precipitation_sum"
        analyzer_d = DroughtAnalyzer()
        dr_result = analyzer_d.analyze(dates=dates, precip_values=values)
        monthly_metrics = [asdict(m) for m in dr_result.monthly_metrics]
        annual_metrics = [asdict(m) for m in dr_result.annual_metrics]

        trend_years = [m.year for m in dr_result.annual_metrics]
        trend_values = [float(m.dry_month_count) for m in dr_result.annual_metrics]
        trend = calculate_trend(trend_years, trend_values, "Dry months", unit="months")

        hazard_definition = {
            "method": dr_result.method,
            "variable": dr_result.variable,
            "percentile": None,
            "threshold_value": None,
            "threshold_unit": None,
            "min_consecutive_days": None,
            "dry_month_percentile_threshold": dr_result.dry_threshold_percentile,
            "baseline_period": dr_result.baseline_period,
            "description": (
                f"A month is counted as a dry month when its total rainfall drops into the driest "
                f"{int(dr_result.dry_threshold_percentile)}% of recorded months. "
                f"{dr_result.limitations}"
            ),
        }
    else:
        raise ValueError(f"Unknown hazard type: {hazard_type}")

    dq = assess_quality(var_name, dates, values)
    data_quality = {
        "total_expected_days": dq.total_expected,
        "total_received_days": dq.total_received,
        "missing_days": dq.missing_count,
        "coverage_pct": dq.coverage_pct,
        "flagged_values": dq.flagged_count,
        "flag_reasons": dq.flag_reasons,
    }

    return {
        "monthly_metrics": monthly_metrics,
        "annual_metrics": annual_metrics,
        "trend": asdict(trend),
        "hazard_definition": hazard_definition,
        "data_quality": data_quality,
    }


def _slice_for_request(
    calculations: dict[str, Any],
    request: AnalysisRequest,
    grid_lat: float,
    grid_lon: float,
    cached: bool,
    updated_date: str,
) -> dict[str, Any]:
    """Filter monthly and annual metrics to the user requested date range and recalculate trend."""
    all_monthly = calculations.get("monthly_metrics", [])
    all_annual = calculations.get("annual_metrics", [])

    start_yr = request.start_date.year
    start_m = request.start_date.month
    end_yr = request.end_date.year
    end_m = request.end_date.month

    filtered_monthly = [
        m for m in all_monthly
        if (start_yr, start_m) <= (m.get("year", 0), m.get("month", 0)) <= (end_yr, end_m)
    ]
    total_months = len(filtered_monthly)
    can_show_yearly = total_months >= 48

    filtered_annual = [m for m in all_annual if start_yr <= m.get("year", 0) <= end_yr]
    if not filtered_annual and all_annual:
        filtered_annual = all_annual

    if can_show_yearly:
        trend_years = [m["year"] for m in filtered_annual]
        if request.hazard_type == HazardType.HEATWAVE:
            trend_values = [float(m.get("total_heatwave_days", 0)) for m in filtered_annual]
            trend = calculate_trend(trend_years, trend_values, "Heatwave days", unit="days", min_years=4)
        elif request.hazard_type == HazardType.DROUGHT:
            trend_values = [float(m.get("dry_month_count", 0)) for m in filtered_annual]
            trend = calculate_trend(trend_years, trend_values, "Dry months", unit="months", min_years=4)
        else:
            raise ValueError(f"Unknown hazard type: {request.hazard_type}")
    else:
        trend = TrendResult(
            method="insufficient_data",
            metric_analyzed="monthly_distribution",
            interpretation="Timespan is under 48 months (4 years). Showing monthly breakdown instead of multi-year trend.",
        )

    now = datetime.now(timezone.utc)
    return {
        "location": {
            "requested": {"lat": request.latitude, "lon": request.longitude},
            "grid_cell": {"lat": grid_lat, "lon": grid_lon},
        },
        "hazard_type": request.hazard_type.value,
        "start_date": request.start_date.isoformat(),
        "end_date": request.end_date.isoformat(),
        "start_month": f"{start_yr}-{start_m:02d}",
        "end_month": f"{end_yr}-{end_m:02d}",
        "total_months": total_months,
        "can_show_yearly": can_show_yearly,
        "source": "open-meteo",
        "weather_model": "best_match",
        "hazard_definition": calculations.get("hazard_definition", {}),
        "monthly_metrics": filtered_monthly,
        "annual_metrics": filtered_annual,
        "trend": asdict(trend),
        "data_quality": calculations.get("data_quality", {}),
        "analysis_version": settings.analysis_version,
        "cached": cached,
        "updated_date": updated_date,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }


@router.post("/analysis", response_model=None)
async def run_analysis(request: AnalysisRequest):
    """Execute or retrieve a cached hazard analysis using max_temperature or precipitation."""

    # ── 1. Validate ─────────────────────────────────────────────────────
    validate_coordinates(request.latitude, request.longitude)
    validate_date_range(request.start_date, request.end_date)

    # ── 2. Snap to grid ────────────────────────────────────────────────
    grid_lat, grid_lon = snap_to_grid(request.latitude, request.longitude)

    # ── 3. Check MongoDB Cache ─────────────────────────────────────────
    hazard_val = request.hazard_type.value
    doc = cache.get_cached_hazard_doc(hazard_val, grid_lon, grid_lat)

    today = date.today()
    earliest_date = date(1940, 1, 1)
    var_name = "temperature_2m_max" if request.hazard_type == HazardType.HEATWAVE else "precipitation_sum"
    effective_end_date = min(request.end_date, today)

    if doc is not None:
        doc_updated_date_str = doc.get("updated_date", earliest_date.isoformat())
        try:
            doc_updated_date = date.fromisoformat(doc_updated_date_str)
        except Exception:
            doc_updated_date = earliest_date

        calcs = doc.get("calculations")
        if not calcs:
            calcs = {
                "annual_metrics": doc.get("annual_metrics", []),
                "monthly_metrics": doc.get("monthly_metrics", []),
                "trend": doc.get("trend", {}),
                "hazard_definition": doc.get("hazard_definition", {}),
                "data_quality": doc.get("data_quality", {}),
            }

        # Case A: Document covers the requested end date or is already up to date with today
        # (Historical weather records cannot exist in the future beyond today)
        if doc_updated_date >= min(request.end_date, today) or doc_updated_date >= today:
            return _slice_for_request(
                calculations=calcs,
                request=request,
                grid_lat=grid_lat,
                grid_lon=grid_lon,
                cached=True,
                updated_date=doc_updated_date_str,
            )

        # Case B: Incremental update needed (doc_updated_date < min(request.end_date, today))
        fetch_start = doc_updated_date + timedelta(days=1)
        fetch_end = today

        # If fetch_start is beyond fetch_end, we already have all possible historical data
        if fetch_start > fetch_end:
            return _slice_for_request(
                calculations=calcs,
                request=request,
                grid_lat=grid_lat,
                grid_lon=grid_lon,
                cached=True,
                updated_date=doc_updated_date_str,
            )

        try:
            weather = await fetch_daily_weather(
                lat=grid_lat,
                lon=grid_lon,
                start_date=fetch_start,
                end_date=fetch_end,
                variables=[var_name],
            )
        except WeatherDataError as exc:
            # If we already have cached data in DB, fall back gracefully to cache instead of crashing
            if doc.get("dates"):
                return _slice_for_request(
                    calculations=calcs,
                    request=request,
                    grid_lat=grid_lat,
                    grid_lon=grid_lon,
                    cached=True,
                    updated_date=doc_updated_date_str,
                )
            if "429" in str(exc):
                raise HTTPException(
                    status_code=429,
                    detail="Open-Meteo API rate limit reached. Please wait ~30 seconds before retrying.",
                ) from exc
            raise HTTPException(status_code=502, detail=str(exc)) from exc

        existing_dates: list[str] = doc.get("dates", [])
        existing_values: list[float | None] = doc.get("values", [])
        new_dates: list[str] = [d.isoformat() for d in weather["dates"]]
        new_values: list[float | None] = weather["variables"][var_name]

        combined_dates = existing_dates + new_dates
        combined_values = existing_values + new_values
        parsed_dates = [date.fromisoformat(d) for d in combined_dates]

        calcs = _compute_hazard(request.hazard_type, parsed_dates, combined_values)
        last_date_str = new_dates[-1] if new_dates else today.isoformat()
        cache.update_hazard_doc(
            hazard_type=hazard_val,
            lon=grid_lon,
            lat=grid_lat,
            updated_date=last_date_str,
            combined_dates=combined_dates,
            combined_values=combined_values,
            calculations=calcs,
        )

        return _slice_for_request(
            calculations=calcs,
            request=request,
            grid_lat=grid_lat,
            grid_lon=grid_lon,
            cached=False,
            updated_date=last_date_str,
        )

    # ── 4. Case C: Document NOT in DB (Fetch from 1940-01-01 to today) ──
    try:
        weather = await fetch_daily_weather(
            lat=grid_lat,
            lon=grid_lon,
            start_date=earliest_date,
            end_date=today,
            variables=[var_name],
        )
    except WeatherDataError as exc:
        if "429" in str(exc):
            raise HTTPException(
                status_code=429,
                detail="Open-Meteo API rate limit reached. Please wait ~30 seconds before retrying.",
            ) from exc
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    parsed_dates = weather["dates"]
    values = weather["variables"][var_name]
    calcs = _compute_hazard(request.hazard_type, parsed_dates, values)
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

    return _slice_for_request(
        calculations=calcs,
        request=request,
        grid_lat=grid_lat,
        grid_lon=grid_lon,
        cached=False,
        updated_date=last_date_str,
    )
