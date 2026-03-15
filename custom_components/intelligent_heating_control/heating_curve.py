"""Heating curve (Heizkurve) - maps outdoor temperature to base target temperature."""
from __future__ import annotations

import logging
from typing import List

_LOGGER = logging.getLogger(__name__)


class HeatingCurve:
    """
    Maps outdoor temperature to a base heating target temperature using
    linear interpolation between configured curve points.

    Example curve:
      -20°C outdoor → 24°C target
        0°C outdoor → 22°C target
       20°C outdoor → 18°C target
       25°C outdoor → 16°C target (no heating needed)
    """

    def __init__(self, points: List[dict]) -> None:
        """
        Initialize the heating curve.

        Args:
            points: List of dicts with 'outdoor_temp' and 'target_temp' keys.
                    Must have at least 2 points.
        """
        self._points = sorted(points, key=lambda p: p["outdoor_temp"])
        if len(self._points) < 2:
            raise ValueError("Heating curve requires at least 2 points")

    def get_target_temp(self, outdoor_temp: float) -> float:
        """
        Calculate the target temperature for a given outdoor temperature.

        Uses linear interpolation between curve points.
        Returns the min/max curve values for out-of-range inputs.
        """
        pts = self._points

        # Below minimum outdoor temp → use leftmost (highest) target
        if outdoor_temp <= pts[0]["outdoor_temp"]:
            return float(pts[0]["target_temp"])

        # Above maximum outdoor temp → use rightmost (lowest) target
        if outdoor_temp >= pts[-1]["outdoor_temp"]:
            return float(pts[-1]["target_temp"])

        # Find the two surrounding points and interpolate
        for i in range(len(pts) - 1):
            x0 = pts[i]["outdoor_temp"]
            x1 = pts[i + 1]["outdoor_temp"]
            if x0 <= outdoor_temp <= x1:
                y0 = pts[i]["target_temp"]
                y1 = pts[i + 1]["target_temp"]
                if x1 == x0:  # duplicate points – return the first value
                    return float(y0)
                ratio = (outdoor_temp - x0) / (x1 - x0)
                return round(y0 + ratio * (y1 - y0), 1)

        # Fallback (should never reach here)
        return float(pts[-1]["target_temp"])

    def update_points(self, points: List[dict]) -> None:
        """Update curve points."""
        self._points = sorted(points, key=lambda p: p["outdoor_temp"])

    @property
    def points(self) -> List[dict]:
        """Return current curve points."""
        return self._points

    def as_dict(self) -> dict:
        """Serialize to dict."""
        return {"points": self._points}
