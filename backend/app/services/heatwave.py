"""
Heatwave analysis service.

Definition (case-study default)
-------------------------------
A heatwave is a period of **≥ 3 consecutive days** with daily maximum
temperature exceeding the **95th percentile** of the baseline period.

Baseline default: 1991–2020 (WMO standard reference period).

Percentile method: ``numpy.percentile`` with linear interpolation, computed
over all baseline-period T_max observations that are not ``None``.  Only one
percentile methodology is used throughout the application.

Year-boundary rule
------------------
Events that cross a calendar-year boundary (e.g. 30 Dec – 3 Jan) are
assigned to the year in which the event **starts**.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Optional

import numpy as np


_MONTH_NAMES = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]


@dataclass
class HeatwaveEvent:
    """A single detected heatwave event."""
    start_date: date
    end_date: date
    duration: int
    assigned_year: int


@dataclass
class HeatwaveMonthMetric:
    """Aggregated heatwave statistics for one calendar month."""
    year: int
    month: int
    month_label: str
    heatwave_days: int
    event_count: int
    peak_temperature: Optional[float]
    mean_temperature: Optional[float]
    threshold_celsius: float


@dataclass
class HeatwaveYearMetric:
    """Aggregated heatwave statistics for one calendar year."""
    year: int
    event_count: int
    total_heatwave_days: int
    max_duration: int
    mean_duration: float


@dataclass
class HeatwaveResult:
    """Complete output of a heatwave analysis."""
    threshold_celsius: float
    percentile: float
    min_consecutive_days: int
    baseline_period: str
    annual_metrics: list[HeatwaveYearMetric]
    events: list[HeatwaveEvent]
    monthly_metrics: list[HeatwaveMonthMetric]


class HeatwaveAnalyzer:
    """Detects heatwave events and computes annual metrics.

    Parameters
    ----------
    percentile : float
        Percentile of baseline T_max distribution used as the threshold
        (default 95).
    min_consecutive_days : int
        Minimum number of consecutive exceedance days to qualify as a
        heatwave event (default 3).
    """

    def __init__(self, percentile: float = 95.0, min_consecutive_days: int = 3):
        self.percentile = percentile
        self.min_consecutive_days = min_consecutive_days

    def analyze(
        self,
        dates: list[date],
        tmax_values: list[Optional[float]],
        baseline_start: Optional[date] = None,
        baseline_end: Optional[date] = None,
        analysis_start: Optional[date] = None,
        analysis_end: Optional[date] = None,
    ) -> HeatwaveResult:
        if analysis_start is None:
            analysis_start = dates[0] if dates else date(1940, 1, 1)
        if analysis_end is None:
            analysis_end = dates[-1] if dates else date.today()
        if baseline_start is None:
            baseline_start = dates[0] if dates else analysis_start
        if baseline_end is None:
            baseline_end = dates[-1] if dates else analysis_end
        """Run the full heatwave analysis.

        Parameters
        ----------
        dates : list[date]
            Full daily date sequence (should be contiguous).
        tmax_values : list[float | None]
            Daily maximum temperatures (°C).  ``None`` = missing.
        baseline_start, baseline_end : date
            Reference period for percentile calculation.
        analysis_start, analysis_end : date
            Period over which to detect events and aggregate metrics.
        """
        threshold = self._compute_threshold(dates, tmax_values, baseline_start, baseline_end)
        events = self._detect_events(dates, tmax_values, threshold, analysis_start, analysis_end)
        monthly_metrics = self._aggregate_monthly(dates, tmax_values, events, threshold, analysis_start, analysis_end)
        annual_metrics = self._aggregate_annual(events, analysis_start.year, analysis_end.year)

        return HeatwaveResult(
            threshold_celsius=round(threshold, 2),
            percentile=self.percentile,
            min_consecutive_days=self.min_consecutive_days,
            baseline_period=f"{baseline_start.isoformat()} to {baseline_end.isoformat()}",
            annual_metrics=annual_metrics,
            events=events,
            monthly_metrics=monthly_metrics,
        )

    # ── Private helpers ─────────────────────────────────────────────────

    def _compute_threshold(
        self,
        dates: list[date],
        values: list[Optional[float]],
        bl_start: date,
        bl_end: date,
    ) -> float:
        """Compute the T_max percentile over the baseline period.

        Uses ``numpy.percentile`` with the default linear interpolation
        method.  Only non-None values within the baseline window are
        included.
        """
        baseline_vals: list[float] = []
        for dt, val in zip(dates, values):
            if bl_start <= dt <= bl_end and val is not None:
                baseline_vals.append(val)

        if len(baseline_vals) < 365:
            raise ValueError(
                f"Insufficient baseline data: {len(baseline_vals)} valid days "
                f"(need at least 365)."
            )

        return float(np.percentile(baseline_vals, self.percentile))

    def _detect_events(
        self,
        dates: list[date],
        values: list[Optional[float]],
        threshold: float,
        analysis_start: date,
        analysis_end: date,
    ) -> list[HeatwaveEvent]:
        """Identify runs of ≥ min_consecutive_days above the threshold.

        Scans the **full** date/value series (not just the analysis window)
        so that events starting before the analysis window but extending
        into it are captured.  Only events whose start date falls within
        ``[analysis_start, analysis_end]`` are included.

        Year-boundary handling: an event crossing 31 Dec → 1 Jan is kept as
        a single event and assigned to the year of its start date.
        """
        events: list[HeatwaveEvent] = []
        run_start: date | None = None
        run_length = 0

        for dt, val in zip(dates, values):
            exceeds = val is not None and val > threshold

            if exceeds:
                if run_start is None:
                    run_start = dt
                run_length += 1
            else:
                # End of a potential run
                if run_start is not None and run_length >= self.min_consecutive_days:
                    run_end = dates[dates.index(run_start) + run_length - 1]
                    if analysis_start <= run_start <= analysis_end:
                        events.append(HeatwaveEvent(
                            start_date=run_start,
                            end_date=run_end,
                            duration=run_length,
                            assigned_year=run_start.year,
                        ))
                run_start = None
                run_length = 0

        # Handle a run that extends to the end of the series
        if run_start is not None and run_length >= self.min_consecutive_days:
            run_end = dates[dates.index(run_start) + run_length - 1]
            if analysis_start <= run_start <= analysis_end:
                events.append(HeatwaveEvent(
                    start_date=run_start,
                    end_date=run_end,
                    duration=run_length,
                    assigned_year=run_start.year,
                ))

        return events

    def _aggregate_annual(
        self,
        events: list[HeatwaveEvent],
        start_year: int,
        end_year: int,
    ) -> list[HeatwaveYearMetric]:
        """Aggregate events into per-year metrics.

        Every year in ``[start_year, end_year]`` is represented, even if
        it has zero events.
        """
        yearly: dict[int, list[HeatwaveEvent]] = defaultdict(list)
        for ev in events:
            yearly[ev.assigned_year].append(ev)

        metrics: list[HeatwaveYearMetric] = []
        for year in range(start_year, end_year + 1):
            year_events = yearly[year]
            if year_events:
                durations = [e.duration for e in year_events]
                metrics.append(HeatwaveYearMetric(
                    year=year,
                    event_count=len(year_events),
                    total_heatwave_days=sum(durations),
                    max_duration=max(durations),
                    mean_duration=round(sum(durations) / len(durations), 2),
                ))
            else:
                metrics.append(HeatwaveYearMetric(
                    year=year,
                    event_count=0,
                    total_heatwave_days=0,
                    max_duration=0,
                    mean_duration=0.0,
                ))

        return metrics

    def _aggregate_monthly(
        self,
        dates: list[date],
        values: list[Optional[float]],
        events: list[HeatwaveEvent],
        threshold: float,
        analysis_start: date,
        analysis_end: date,
    ) -> list[HeatwaveMonthMetric]:
        """Aggregate daily temperatures and events into monthly metrics."""
        event_dates = set()
        for ev in events:
            curr = ev.start_date
            while curr <= ev.end_date:
                event_dates.add(curr)
                curr += timedelta(days=1)

        monthly_vals: dict[tuple[int, int], list[float]] = defaultdict(list)
        monthly_event_days: dict[tuple[int, int], int] = defaultdict(int)

        for dt, val in zip(dates, values):
            if not (analysis_start <= dt <= analysis_end):
                continue
            key = (dt.year, dt.month)
            if val is not None:
                monthly_vals[key].append(val)
            if dt in event_dates:
                monthly_event_days[key] += 1

        events_by_month: dict[tuple[int, int], int] = defaultdict(int)
        for ev in events:
            if analysis_start <= ev.start_date <= analysis_end:
                events_by_month[(ev.start_date.year, ev.start_date.month)] += 1

        metrics: list[HeatwaveMonthMetric] = []
        cur_year, cur_month = analysis_start.year, analysis_start.month
        end_year, end_month = analysis_end.year, analysis_end.month

        while (cur_year, cur_month) <= (end_year, end_month):
            key = (cur_year, cur_month)
            vals = monthly_vals.get(key, [])
            peak_temp = round(max(vals), 2) if vals else None
            mean_temp = round(sum(vals) / len(vals), 2) if vals else None
            hw_days = monthly_event_days.get(key, 0)
            ev_count = events_by_month.get(key, 0)
            label = f"{_MONTH_NAMES[cur_month][:3]} {cur_year}"

            metrics.append(HeatwaveMonthMetric(
                year=cur_year,
                month=cur_month,
                month_label=label,
                heatwave_days=hw_days,
                event_count=ev_count,
                peak_temperature=peak_temp,
                mean_temperature=mean_temp,
                threshold_celsius=round(threshold, 2),
            ))

            if cur_month == 12:
                cur_year += 1
                cur_month = 1
            else:
                cur_month += 1

        return metrics
