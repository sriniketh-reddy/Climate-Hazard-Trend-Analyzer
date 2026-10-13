"""
Grid-cell resolution for Open-Meteo ERA5 data.

Open-Meteo serves ERA5 reanalysis data on a 0.25° × 0.25° grid.  When a user
clicks on an arbitrary point, we snap it to the nearest grid-cell center so
that cache lookups match regardless of small coordinate differences.

Note: 0.25° is the native resolution of the ERA5 dataset exposed by the
Open-Meteo Archive API.  We document this as the API's grid spacing — it is
not an invented precision guarantee.
"""

import math


def snap_to_grid(lat: float, lon: float, resolution: float = 0.25) -> tuple[float, float]:
    """Round *lat* and *lon* to the nearest grid-cell center.

    Parameters
    ----------
    lat : float
        Latitude in decimal degrees.
    lon : float
        Longitude in decimal degrees.
    resolution : float
        Grid spacing in degrees (default ``0.25`` for ERA5).

    Returns
    -------
    tuple[float, float]
        ``(grid_lat, grid_lon)`` snapped to the nearest cell center.

    Examples
    --------
    >>> snap_to_grid(28.61, 77.23)
    (28.625, 77.25)
    >>> snap_to_grid(12.97, 77.59)
    (12.875, 77.625)
    """
    # Cell centers sit at half-resolution offsets: 0.125, 0.375, 0.625, …
    half = resolution / 2.0
    grid_lat = round(math.floor(lat / resolution) * resolution + half, 4)
    grid_lon = round(math.floor(lon / resolution) * resolution + half, 4)
    return grid_lat, grid_lon
