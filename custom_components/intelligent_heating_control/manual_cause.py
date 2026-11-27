"""Why did a room switch to "manual"? (v2.7.1) – HA-free, unit-tested.

When a thermostat's setpoint differs from what IHC sent, IHC adopts it as a manual change.
Home Assistant's state context tells who caused that state write:

- IHC passes its own Context with every thermostat command → a state carrying one of
  those ids is IHC's own command reported back (late), never a manual change.
- ``user_id`` set → someone changed it in Home Assistant (dashboard, HA app, voice).
- ``parent_id`` set → an automation or script did it.
- neither → the change came from the device itself: buttons/wheel on the thermostat or
  the manufacturer's app/cloud (HA cannot tell those two apart). Several small steps
  within a few seconds (17 → 17.5 → 18) mean someone turned the wheel or pressed the
  buttons on the device.
"""
from __future__ import annotations

from typing import Iterable, Optional, Sequence, Tuple

STEP_WINDOW_S = 30.0      # setpoint changes this close together count as one adjustment
MAX_STEP_C = 1.0          # a single button press / wheel notch
LOG_MAXLEN = 30

CAUSES = ("ihc", "ha_user", "automation", "device", "device_or_app", "ihc_panel")


def count_steps(changes: Sequence[Tuple[float, float]], now: float) -> int:
    """Number of small setpoint steps in the last STEP_WINDOW_S (changes = [(t, value)])."""
    recent = [c for c in changes if now - c[0] <= STEP_WINDOW_S]
    steps = 0
    for (_, a), (_, b) in zip(recent, recent[1:]):
        if 0 < abs(b - a) <= MAX_STEP_C:
            steps += 1
    return steps


def classify(context_id: Optional[str], user_id: Optional[str], parent_id: Optional[str],
             ihc_context_ids: Iterable[str], steps: int = 0) -> str:
    if context_id and context_id in set(ihc_context_ids):
        return "ihc"
    if user_id:
        return "ha_user"
    if parent_id:
        return "automation"
    if steps >= 1:
        return "device"
    return "device_or_app"


def describe(cause: str, name: Optional[str] = None, en: bool = False) -> str:
    """Short human text for notifications/the panel."""
    de = {
        "ha_user": "in Home Assistant" + (f" ({name})" if name else ""),
        "automation": "durch " + (f"„{name}“" if name else "eine Automation/ein Skript"),
        "device": "am Thermostat gedreht",
        "device_or_app": "am Thermostat oder in der Hersteller-App",
        "ihc_panel": "im IHC-Panel",
        "ihc": "von IHC",
    }
    enm = {
        "ha_user": "in Home Assistant" + (f" ({name})" if name else ""),
        "automation": "by " + (f"“{name}”" if name else "an automation/script"),
        "device": "turned on the thermostat",
        "device_or_app": "on the thermostat or in the manufacturer's app",
        "ihc_panel": "in the IHC panel",
        "ihc": "by IHC",
    }
    return (enm if en else de).get(cause, cause)
