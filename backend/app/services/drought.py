"""
Meteorological drought analysis service.

Method — Monthly Precipitation Percentile
------------------------------------------
For each calendar month in the analysis period, the monthly total
precipitation is compared against the distribution of that same calendar
month over a historical baseline (default: 1991–2020).

A month is classified as **"dry"** when its total precipitation falls
below the **20th percentile** of the baseline distribution for that
calendar month.

This is a transparent, empirical method.  It does **not** account for
evapotranspiration, soil moisture, or temperature effects.  For
operational drought monitoring, validated SPI or SPEI indices are
recommended.

Missing-data rule
-----------------
If a calendar month has > 20 % of its days missing, the monthly total is
flagged as unreliable and excluded from percentile classification (it is
still reported for transparency).
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date
from typing import Optional

import numpy as np

# Month names for human-readable output
_MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]


@dataclass
class DroughtMonthMetric:
    """Classified drought statistics for one calendar month."""
    year: int
    month: int
    month_label: str
    total_precip_mm: float
    is_dry: bool
    deficit_mm: float
    threshold_mm: float
    median_mm: float
    reliable: bool


@dataclass
class DroughtYearMetric:
    """Aggregated drought statistics for one calendar year."""
    year: int
    dry_month_count: int
    total_deficit_mm: float
    driest_month: Optional[str]
    driest_month_precip_mm: Optional[float]
    annual_precip_mm: float


@dataclass
class DroughtResult:
    """Complete output of a drought analysis."""
    dry_threshold_percentile: float
    method: str
    baseline_period: str
    variable: str
    limitations: str
    annual_metrics: list[DroughtYearMetric]
    monthly_metrics: list[DroughtMonthMetric]


class DroughtAnalyzer:
    """Detects meteorological drought using monthly precipitation percentiles.

    Parameters
    ----------
    dry_percentile : float
        Months below this percentile of the baseline distribution are
        classified as dry (default 20).
    max_missing_pct : float
        Maximum fraction of missing days in a month before the monthly
        total is flagged as unreliable (default 0.20 = 20 %).
    """

    LIMITATIONS = (
        "This analysis looks directly at rainfall totals recorded each month. "
        "It provides a clear measure of rainfall shortages compared against long-term historical weather records, "
        "without directly modeling evapotranspiration, soil moisture, or temperature anomalies."
    )

    def __init__(self, dry_percentile: float = 20.0, max_missing_pct: float = 0.20):
        self.dry_percentile = dry_percentile
        self.max_missing_pct = max_missing_pct

    def analyze(
        self,
        dates: list[date],
        precip_values: list[Optional[float]],
        baseline_start: Optional[date] = None,
        baseline_end: Optional[date] = None,
        analysis_start: Optional[date] = None,
        analysis_end: Optional[date] = None,
    ) -> DroughtResult:
        if analysis_start is None:
            analysis_start = dates[0] if dates else date(1940, 1, 1)
        if analysis_end is None:
            analysis_end = dates[-1] if dates else date.today()
        if baseline_start is None:
            baseline_start = dates[0] if dates else analysis_start
        if baseline_end is None:
            baseline_end = dates[-1] if dates else analysis_end
        """Run the full drought analysis.

        Parameters
        ----------
        dates : list[date]
            Contiguous daily dates.
        precip_values : list[float | None]
            Daily precipitation sums (mm).  ``None`` = missing.
        baseline_start, baseline_end : date
            Reference period for building per-month percentile distributions.
        analysis_start, analysis_end : date
            Period over which to classify months and aggregate annual metrics.
        """
        # ── Step 1: aggregate to monthly totals ─────────────────────────
        monthly_data = self._aggregate_monthly(dates, precip_values)

        # ── Step 2: build baseline distributions per calendar month ─────
        baseline_dists = self._build_baseline_distributions(
            monthly_data, baseline_start, baseline_end
        )

        # ── Step 3: classify each analysis-period month ─────────────────
        monthly_metrics = self._classify_months(
            monthly_data, baseline_dists, analysis_start, analysis_end
        )

        # ── Step 4: aggregate to annual metrics ─────────────────────────
        annual_metrics = self._aggregate_annual(
            monthly_metrics, analysis_start.year, analysis_end.year
        )

        return DroughtResult(
            dry_threshold_percentile=self.dry_percentile,
            method="monthly_precipitation_percentile",
            baseline_period=f"{baseline_start.isoformat()} to {baseline_end.isoformat()}",
            variable="precipitation_sum",
            limitations=self.LIMITATIONS,
            annual_metrics=annual_metrics,
            monthly_metrics=monthly_metrics,
        )

    # ── Private helpers ─────────────────────────────────────────────────

    def _aggregate_monthly(
        self,
        dates: list[date],
        values: list[Optional[float]],
    ) -> dict[tuple[int, int], dict]:
        """Sum daily precip into ``{(year, month): {total, days, missing}}``."""
        monthly: dict[tuple[int, int], dict] = defaultdict(
            lambda: {"total": 0.0, "days": 0, "missing": 0}
        )
        for dt, val in zip(dates, values):
            key = (dt.year, dt.month)
            monthly[key]["days"] += 1
            if val is None:
                monthly[key]["missing"] += 1
            else:
                monthly[key]["total"] += val
        return dict(monthly)

    def _build_baseline_distributions(
        self,
        monthly_data: dict[tuple[int, int], dict],
        bl_start: date,
        bl_end: date,
    ) -> dict[int, list[float]]:
        """Build per-calendar-month arrays of monthly totals from the baseline."""
        dists: dict[int, list[float]] = defaultdict(list)
        for (year, month), info in monthly_data.items():
            month_start = date(year, month, 1)
            if bl_start <= month_start <= bl_end:
                # Only include months with acceptable coverage
                if info["days"] > 0 and (info["missing"] / info["days"]) <= self.max_missing_pct:
                    dists[month].append(info["total"])
        return dict(dists)

    def _classify_months(
        self,
        monthly_data: dict[tuple[int, int], dict],
        baseline_dists: dict[int, list[float]],
        analysis_start: date,
        analysis_end: date,
    ) -> list[DroughtMonthMetric]:
        """Classify each month in the analysis period as dry/normal/wet."""
        results: list[DroughtMonthMetric] = []

        for (year, month), info in sorted(monthly_data.items()):
            month_start = date(year, month, 1)
            if month_start < date(analysis_start.year, analysis_start.month, 1):
                continue
            if month_start > date(analysis_end.year, analysis_end.month, 1):
                continue

            reliable = (
                info["days"] > 0
                and (info["missing"] / info["days"]) <= self.max_missing_pct
            )

            baseline = baseline_dists.get(month, [])
            label = f"{_MONTH_NAMES[month][:3]} {year}"
            if not baseline or not reliable:
                results.append(DroughtMonthMetric(
                    year=year,
                    month=month,
                    month_label=label,
                    total_precip_mm=round(info["total"], 2),
                    is_dry=False,
                    deficit_mm=0.0,
                    threshold_mm=0.0,
                    median_mm=0.0,
                    reliable=reliable,
                ))
                continue

            threshold = float(np.percentile(baseline, self.dry_percentile))
            median = float(np.median(baseline))
            total_mm = round(info["total"], 2)
            threshold_mm = round(threshold, 2)
            median_mm = round(median, 2)
            is_dry = total_mm < threshold_mm
            deficit_mm = round(max(0.0, median_mm - total_mm), 2) if is_dry else 0.0

            results.append(DroughtMonthMetric(
                year=year,
                month=month,
                month_label=label,
                total_precip_mm=total_mm,
                is_dry=is_dry,
                deficit_mm=deficit_mm,
                threshold_mm=threshold_mm,
                median_mm=median_mm,
                reliable=reliable,
            ))

        return results

    def _aggregate_annual(
        self,
        classifications: list[DroughtMonthMetric],
        start_year: int,
        end_year: int,
    ) -> list[DroughtYearMetric]:
        """Aggregate monthly classifications into per-year metrics."""
        yearly: dict[int, list[DroughtMonthMetric]] = defaultdict(list)
        for c in classifications:
            yearly[c.year].append(c)

        metrics: list[DroughtYearMetric] = []
        for year in range(start_year, end_year + 1):
            months = yearly.get(year, [])
            if not months:
                metrics.append(DroughtYearMetric(
                    year=year,
                    dry_month_count=0,
                    total_deficit_mm=0.0,
                    driest_month=None,
                    driest_month_precip_mm=None,
                    annual_precip_mm=0.0,
                ))
                continue

            dry_count = sum(1 for m in months if m.is_dry)
            total_deficit = sum(m.deficit_mm for m in months)
            annual_precip = sum(m.total_precip_mm for m in months)

            driest = min(months, key=lambda m: m.total_precip_mm)

            metrics.append(DroughtYearMetric(
                year=year,
                dry_month_count=dry_count,
                total_deficit_mm=round(total_deficit, 2),
                driest_month=_MONTH_NAMES[driest.month],
                driest_month_precip_mm=round(driest.total_precip_mm, 2),
                annual_precip_mm=round(annual_precip, 2),
            ))

        return metrics
