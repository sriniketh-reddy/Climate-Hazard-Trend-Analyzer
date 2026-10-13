"""
Data-quality checks for weather observations.

Rules
-----
- Missing / ``None`` values are **counted and flagged**, never silently
  replaced with zero.  Zero is a valid observation (e.g. 0 mm rain).
- Physically impossible values are flagged but **not automatically removed**
  — the caller decides how to handle them.

Physical-limit thresholds
~~~~~~~~~~~~~~~~~~~~~~~~~
- ``temperature_2m_max``: flag if > 55 °C or < −20 °C
  (India's recorded extremes are ~51 °C high, ~−45 °C Siachen)
- ``precipitation_sum``: flag if < 0 mm or > 600 mm/day
  (India's 24 h record is ~838 mm in Cherrapunji; 600 mm is conservative)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date


# Physical-limit thresholds per variable
_THRESHOLDS: dict[str, tuple[float, float]] = {
    "temperature_2m_max": (-20.0, 55.0),
    "precipitation_sum": (0.0, 600.0),
}


@dataclass
class DataQualityReport:
    """Summarises data-quality findings for a single variable."""

    variable: str
    total_expected: int
    total_received: int
    missing_count: int
    flagged_count: int = 0
    flag_reasons: list[str] = field(default_factory=list)

    @property
    def coverage_pct(self) -> float:
        if self.total_expected == 0:
            return 0.0
        return round(self.total_received / self.total_expected * 100, 2)


def assess_quality(
    variable: str,
    dates: list[date | str],
    values: list[float | None],
    expected_days: int | None = None,
) -> DataQualityReport:
    """Run QC checks on a single daily variable.

    Parameters
    ----------
    variable : str
        The Open-Meteo variable name (e.g. ``"temperature_2m_max"``).
    dates : list
        The date sequence corresponding to *values*.
    values : list
        Daily observations; ``None`` means missing.
    expected_days : int | None
        If given, the expected length of the series.  Otherwise inferred
        from ``len(dates)``.

    Returns
    -------
    DataQualityReport
    """
    total_expected = expected_days if expected_days is not None else len(dates)
    missing = sum(1 for v in values if v is None)
    total_received = len(values) - missing

    report = DataQualityReport(
        variable=variable,
        total_expected=total_expected,
        total_received=total_received,
        missing_count=missing,
    )

    lo, hi = _THRESHOLDS.get(variable, (float("-inf"), float("inf")))

    for dt, val in zip(dates, values):
        if val is None:
            continue
        if val < lo or val > hi:
            report.flagged_count += 1
            report.flag_reasons.append(
                f"{variable} = {val} on {dt} is outside physical limits [{lo}, {hi}]"
            )

    return report
