"""PID controller for boiler flow temperature regulation."""
from __future__ import annotations

from datetime import datetime
from typing import Optional


class FlowTempPID:
    """
    Discrete PID controller with anti-windup for boiler flow temperature.

    The controller computes a corrected flow-temp setpoint based on the
    difference between the desired setpoint (calculated from the heating
    curve) and the actual measured flow temperature from a sensor.

    Anti-windup: the integral term is clamped to ±20°C equivalent so that
    a long period without sensor feedback cannot accumulate runaway errors.
    """

    def __init__(
        self,
        kp: float = 2.0,
        ki: float = 0.1,
        kd: float = 0.5,
        output_min: float = 30.0,
        output_max: float = 80.0,
        integral_clamp: float = 20.0,
    ) -> None:
        self.kp = kp
        self.ki = ki
        self.kd = kd
        self.output_min = output_min
        self.output_max = output_max
        self._integral_clamp = integral_clamp

        self._integral: float = 0.0
        self._last_measurement: Optional[float] = None
        self._last_time: Optional[datetime] = None

    def reset(self) -> None:
        """Reset integrator state (call when setpoint changes significantly)."""
        self._integral = 0.0
        self._last_measurement = None
        self._last_time = None

    def compute(self, setpoint: float, measurement: float) -> float:
        """
        Compute PID output given setpoint and current measurement.

        Returns the corrected output temperature, clamped to [output_min, output_max].
        Dt is derived automatically from wall-clock time between successive calls.
        On the first call (no previous timestamp) the derivative term is zero.
        """
        now = datetime.now()
        dt_minutes = 0.0
        if self._last_time is not None:
            dt_seconds = (now - self._last_time).total_seconds()
            dt_minutes = max(0.0, dt_seconds / 60.0)
        self._last_time = now

        error = setpoint - measurement

        # Integral with anti-windup clamp
        if dt_minutes > 0:
            self._integral += error * dt_minutes
            self._integral = max(-self._integral_clamp, min(self._integral_clamp, self._integral))

        # Derivative on MEASUREMENT (not error) to avoid "derivative kick": a step
        # change in setpoint (heating-curve recompute, schedule transition) would
        # otherwise produce a large error jump unrelated to the sensor reading,
        # which this term would then amplify for one cycle.
        derivative = 0.0
        if dt_minutes > 0 and self._last_measurement is not None:
            derivative = -(measurement - self._last_measurement) / dt_minutes
        self._last_measurement = measurement

        output = setpoint + self.kp * error + self.ki * self._integral + self.kd * derivative
        return max(self.output_min, min(self.output_max, output))
