"""
Pydantic v2 request / response schemas for the analysis API.

These models define the contract between the React frontend and the FastAPI
backend.  The ``AnalysisResponse`` shape is identical whether the result came
from the MongoDB cache or was freshly computed.
"""

from __future__ import annotations

import calendar
from datetime import date, datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class HazardType(str, Enum):
    """Supported climate hazard types."""
    HEATWAVE = "heatwave"
    DROUGHT = "drought"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_month_or_date(v: Any, is_end: bool = False) -> date:
    """Parse 'YYYY-MM' or 'YYYY-MM-DD' into a date object."""
    if isinstance(v, date):
        return v
    if isinstance(v, str):
        v = v.strip()
        if len(v) == 7 and v[4] == "-":
            y, m = int(v[:4]), int(v[5:7])
            if is_end:
                last_day = calendar.monthrange(y, m)[1]
                return date(y, m, last_day)
            return date(y, m, 1)
        return date.fromisoformat(v)
    raise ValueError(f"Invalid date format: {v}")


# ---------------------------------------------------------------------------
# Request
# ---------------------------------------------------------------------------

class AnalysisRequest(BaseModel):
    """Payload sent by the frontend to request a hazard analysis."""

    latitude: float = Field(..., ge=6.0, le=38.0, description="Latitude (India bounding box)")
    longitude: float = Field(..., ge=68.0, le=98.0, description="Longitude (India bounding box)")
    hazard_type: HazardType
    start_date: date = Field(..., description="Analysis start date or month")
    end_date: date = Field(..., description="Analysis end date or month")
    start_month: Optional[str] = Field(None, description="Optional YYYY-MM start")
    end_month: Optional[str] = Field(None, description="Optional YYYY-MM end")
    baseline_start: Optional[date] = Field(
        None,
        description="Reference baseline start. Defaults to 1991-01-01 if omitted.",
    )
    baseline_end: Optional[date] = Field(
        None,
        description="Reference baseline end. Defaults to 2020-12-31 if omitted.",
    )

    @model_validator(mode="before")
    @classmethod
    def normalize_dates(cls, data: Any) -> Any:
        if isinstance(data, dict):
            start = data.get("start_month") or data.get("start_date")
            end = data.get("end_month") or data.get("end_date")
            if start:
                data["start_date"] = _parse_month_or_date(start, is_end=False)
            if end:
                data["end_date"] = _parse_month_or_date(end, is_end=True)
        return data

    @field_validator("end_date")
    @classmethod
    def end_after_start(cls, v: date, info) -> date:
        start = info.data.get("start_date")
        if start and v <= start:
            raise ValueError("end_date must be after start_date")
        return v


# ---------------------------------------------------------------------------
# Response sub-models
# ---------------------------------------------------------------------------

class Coordinates(BaseModel):
    lat: float
    lon: float


class LocationInfo(BaseModel):
    requested: Coordinates
    grid_cell: Coordinates


class HazardDefinition(BaseModel):
    method: str
    variable: str
    percentile: Optional[float] = None
    threshold_value: Optional[float] = None
    threshold_unit: Optional[str] = None
    min_consecutive_days: Optional[int] = None
    dry_month_percentile_threshold: Optional[float] = None
    baseline_period: str
    description: str


class HeatwaveMonthMetric(BaseModel):
    year: int
    month: int
    month_label: str
    heatwave_days: int
    event_count: int
    peak_temperature: Optional[float] = None
    mean_temperature: Optional[float] = None
    threshold_celsius: float


class DroughtMonthMetric(BaseModel):
    year: int
    month: int
    month_label: str
    total_precip_mm: float
    is_dry: bool
    deficit_mm: float
    threshold_mm: float
    median_mm: float
    reliable: bool


class HeatwaveAnnualMetric(BaseModel):
    year: int
    event_count: int
    total_heatwave_days: int
    max_duration: int
    mean_duration: float


class DroughtAnnualMetric(BaseModel):
    year: int
    dry_month_count: int
    total_deficit_mm: float
    driest_month: Optional[str] = None
    driest_month_precip_mm: Optional[float] = None
    annual_precip_mm: float


class TrendInfo(BaseModel):
    method: str
    metric_analyzed: str
    slope_per_decade: Optional[float] = None
    direction: Optional[str] = None
    p_value: Optional[float] = None
    r_squared: Optional[float] = None
    confidence_interval_95: Optional[list[float]] = None
    significant_at_005: Optional[bool] = None
    interpretation: str


class DataQualityInfo(BaseModel):
    total_expected_days: int
    total_received_days: int
    missing_days: int
    coverage_pct: float
    flagged_values: int
    flag_reasons: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Top-level response
# ---------------------------------------------------------------------------

class AnalysisResponse(BaseModel):
    """Full analysis result — identical shape for cache hits and fresh runs."""

    location: LocationInfo
    hazard_type: str
    start_date: date
    end_date: date
    start_month: Optional[str] = None
    end_month: Optional[str] = None
    total_months: int = 0
    can_show_yearly: bool = False
    baseline_start: Optional[date] = None
    baseline_end: Optional[date] = None
    source: str = "open-meteo"
    weather_model: str = "best_match"
    hazard_definition: HazardDefinition
    monthly_metrics: list[HeatwaveMonthMetric] | list[DroughtMonthMetric] = Field(default_factory=list)
    annual_metrics: list[HeatwaveAnnualMetric] | list[DroughtAnnualMetric] = Field(default_factory=list)
    trend: TrendInfo
    data_quality: DataQualityInfo
    analysis_version: str = "1.0.0"
    cached: bool = False
    updated_date: Optional[str] = None
    created_at: datetime
    updated_at: datetime
