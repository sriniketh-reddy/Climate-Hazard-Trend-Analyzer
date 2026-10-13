"""
Trend calculation service.

Uses OLS linear regression (``scipy.stats.linregress``) to estimate the
direction and rate of change in annual hazard metrics.

Rules
-----
- At least ``MIN_YEARS`` (default 10) valid data points are required.
  With fewer observations, trend estimation is statistically unreliable
  and the service returns an ``insufficient_data`` result instead.
- Statistical significance is reported at p < 0.05 and only when the
  test has actually been performed.
- Slope is reported per decade for readability.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import numpy as np
from scipy import stats

MIN_YEARS = 10


@dataclass
class TrendResult:
    """Output of a trend analysis."""
    method: str
    metric_analyzed: str
    slope_per_decade: Optional[float] = None
    direction: Optional[str] = None
    p_value: Optional[float] = None
    r_squared: Optional[float] = None
    confidence_interval_95: Optional[list[float]] = None
    significant_at_005: Optional[bool] = None
    interpretation: str = ""


def calculate_trend(
    years: list[int],
    values: list[float],
    metric_name: str,
    unit: str = "",
    min_years: int = MIN_YEARS,
) -> TrendResult:
    """Compute a linear trend over annual metric values.

    Parameters
    ----------
    years : list[int]
        Calendar years corresponding to *values*.
    values : list[float]
        Annual metric values (e.g. heatwave days, dry month count).
    metric_name : str
        Human-readable name for the metric (used in interpretation text).
    unit : str
        Unit label for the metric (e.g. "days", "months").
    min_years : int
        Minimum number of data points required to compute a trend.

    Returns
    -------
    TrendResult
    """
    # Filter out NaN / None pairs
    valid = [(y, v) for y, v in zip(years, values) if v is not None and not np.isnan(v)]

    if len(valid) < min_years:
        return TrendResult(
            method="insufficient_data",
            metric_analyzed=metric_name,
            interpretation=(
                f"Trend not computed: only {len(valid)} valid data points "
                f"(minimum {min_years} required)."
            ),
        )

    x = np.array([y for y, _ in valid], dtype=float)
    y = np.array([v for _, v in valid], dtype=float)

    # Check if all values are identical (constant series, zero variance)
    if np.all(y == y[0]):
        slope_per_decade = 0.0
        direction = "stable"
        p_value = 1.0
        r_squared = 0.0
        confidence_interval_95 = [0.0, 0.0]
        significant = False
        interpretation = (
            f"{metric_name} remained constant across all {len(valid)} years analyzed."
        )
        return TrendResult(
            method="ols_linear_regression",
            metric_analyzed=metric_name,
            slope_per_decade=slope_per_decade,
            direction=direction,
            p_value=p_value,
            r_squared=r_squared,
            confidence_interval_95=confidence_interval_95,
            significant_at_005=significant,
            interpretation=interpretation,
        )

    result = stats.linregress(x, y)

    slope = float(result.slope) if not np.isnan(result.slope) else 0.0
    r_squared = float(result.rvalue ** 2) if not np.isnan(result.rvalue) else 0.0
    p_value = float(result.pvalue) if not np.isnan(result.pvalue) else 1.0
    stderr = float(result.stderr) if not np.isnan(result.stderr) else 0.0

    slope_per_decade = round(slope * 10, 4)

    # 95 % confidence interval on slope (t-distribution)
    n = len(x)
    if stderr > 0 and n > 2:
        t_crit = float(stats.t.ppf(0.975, df=n - 2))
        ci_low = round((slope - t_crit * stderr) * 10, 4)
        ci_high = round((slope + t_crit * stderr) * 10, 4)
        confidence_interval_95 = [ci_low, ci_high]
    else:
        confidence_interval_95 = [slope_per_decade, slope_per_decade]

    significant = p_value < 0.05

    if abs(slope_per_decade) < 0.01:
        direction = "stable"
    elif slope_per_decade > 0:
        direction = "increasing"
    else:
        direction = "decreasing"

    # Build human-readable interpretation
    unit_str = f" {unit}" if unit else ""
    if significant:
        interpretation = (
            f"Over the years, {metric_name} is clearly {direction} by about {abs(slope_per_decade)}{unit_str} "
            f"every 10 years. This shows a steady, proven trend across the recorded decades."
        )
    else:
        interpretation = (
            f"Over the years, {metric_name} shows a slight {direction} shift of about {abs(slope_per_decade)}{unit_str} "
            f"every 10 years, but the ups and downs are normal year-to-year weather variations rather than a steady change."
        )

    return TrendResult(
        method="ols_linear_regression",
        metric_analyzed=metric_name,
        slope_per_decade=slope_per_decade,
        direction=direction,
        p_value=round(p_value, 6),
        r_squared=round(r_squared, 6),
        confidence_interval_95=confidence_interval_95,
        significant_at_005=significant,
        interpretation=interpretation,
    )

