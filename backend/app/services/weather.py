"""
Open-Meteo Historical Weather API client.

Fetches daily weather variables using HTTPX and validates the response
structure, date sequence, and units before returning parsed data.
"""

from __future__ import annotations

import asyncio
import re
from datetime import date, datetime, timedelta
from typing import Any

import httpx

from app.config import settings


class WeatherDataError(Exception):
    """Raised when the Open-Meteo response is invalid or incomplete."""


async def fetch_daily_weather(
    lat: float,
    lon: float,
    start_date: date,
    end_date: date,
    variables: list[str],
    timezone: str = "Asia/Kolkata",
) -> dict[str, Any]:
    """Fetch daily weather data from the Open-Meteo Archive API.

    Parameters
    ----------
    lat, lon : float
        Coordinates (typically the grid-cell center).
    start_date, end_date : date
        Inclusive date range.
    variables : list[str]
        Daily variable names (e.g. ``["temperature_2m_max", "precipitation_sum"]``).
    timezone : str
        IANA timezone for date alignment.

    Returns
    -------
    dict
        Parsed JSON with validated ``daily`` block.

    Raises
    ------
    WeatherDataError
        On HTTP errors, missing fields, non-contiguous dates, or unit mismatches.
    """
    if start_date > end_date:
        raise WeatherDataError(
            f"Invalid date range: start_date ({start_date}) is after end_date ({end_date})."
        )

    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "daily": ",".join(variables),
        "temperature_unit": "celsius",
        "precipitation_unit": "mm",
        "timezone": timezone,
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.get(settings.openmeteo_base_url, params=params)
        if response.status_code == 429:
            # Backoff 2.5 seconds and try once more
            await asyncio.sleep(2.5)
            response = await client.get(settings.openmeteo_base_url, params=params)

        # Handle Open-Meteo archive end_date out of range (due to ERA5 latency)
        if response.status_code == 400 and "out of allowed range" in response.text:
            match = re.search(r"to\s+(\d{4}-\d{2}-\d{2})", response.text)
            if match:
                max_allowed_str = match.group(1)
                try:
                    max_allowed = date.fromisoformat(max_allowed_str)
                    if max_allowed < end_date and max_allowed >= start_date:
                        params["end_date"] = max_allowed.isoformat()
                        response = await client.get(settings.openmeteo_base_url, params=params)
                except Exception:
                    pass

    if response.status_code != 200:
        raise WeatherDataError(
            f"Open-Meteo returned HTTP {response.status_code}: {response.text[:500]}"
        )

    try:
        data = response.json()
    except Exception as exc:
        raise WeatherDataError(f"Failed to parse Open-Meteo JSON: {exc}") from exc

    # ── Validate structure ──────────────────────────────────────────────
    if "daily" not in data:
        raise WeatherDataError("Open-Meteo response missing 'daily' block.")

    daily = data["daily"]
    if "time" not in daily:
        raise WeatherDataError("Open-Meteo response missing 'daily.time' array.")

    for var in variables:
        if var not in daily:
            raise WeatherDataError(f"Requested variable '{var}' missing from response.")

    # ── Validate date sequence ──────────────────────────────────────────
    time_strings: list[str] = daily["time"]
    if not time_strings:
        raise WeatherDataError("Open-Meteo returned an empty time array.")

    parsed_dates: list[date] = []
    for ts in time_strings:
        try:
            parsed_dates.append(datetime.strptime(ts, "%Y-%m-%d").date())
        except ValueError as exc:
            raise WeatherDataError(f"Unparseable date '{ts}' in response.") from exc

    # Check for duplicates
    if len(parsed_dates) != len(set(parsed_dates)):
        raise WeatherDataError("Duplicate dates detected in Open-Meteo response.")

    # Check contiguity
    for i in range(1, len(parsed_dates)):
        expected = parsed_dates[i - 1] + timedelta(days=1)
        if parsed_dates[i] != expected:
            raise WeatherDataError(
                f"Date gap detected: expected {expected}, got {parsed_dates[i]}."
            )

    # ── Validate units ──────────────────────────────────────────────────
    daily_units = data.get("daily_units", {})
    expected_units = {
        "temperature_2m_max": "°C",
        "precipitation_sum": "mm",
    }
    for var in variables:
        expected = expected_units.get(var)
        actual = daily_units.get(var)
        if expected and actual and actual != expected:
            raise WeatherDataError(
                f"Unit mismatch for '{var}': expected '{expected}', got '{actual}'."
            )

    # ── Return validated payload ────────────────────────────────────────
    return {
        "dates": parsed_dates,
        "variables": {var: daily[var] for var in variables},
        "metadata": {
            "latitude": data.get("latitude"),
            "longitude": data.get("longitude"),
            "elevation": data.get("elevation"),
            "timezone": data.get("timezone"),
            "utc_offset_seconds": data.get("utc_offset_seconds"),
        },
    }
