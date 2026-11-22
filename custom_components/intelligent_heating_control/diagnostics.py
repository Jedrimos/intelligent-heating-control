"""Diagnostics download for Intelligent Heating Control (v2.6).

Settings → Devices & Services → IHC → ⋮ → "Download diagnostics" now produces a
JSON file with the configuration and the live per-room decision state. Attach
it to a GitHub issue instead of screenshots - it shows exactly which rule
(see CLAUDE.md Kapitel 15) decided each room's target temperature.
"""
from __future__ import annotations

from typing import Any

from homeassistant.components.diagnostics import async_redact_data
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DOMAIN

# Location / personal data that should never end up in a public issue
TO_REDACT = {
    "latitude", "longitude", "api_key", "token", "password",
    "presence_entity", "presence_entities", "room_presence_entities",
    "eta_preheat_entities", "vacation_calendar", "holiday_calendar",
}

# Large history arrays that add nothing to a bug report
_ROOM_DATA_SKIP = {"temp_history", "target_history", "demand_heatmap", "ha_schedule_blocks", "warmup_curve"}


async def async_get_config_entry_diagnostics(hass: HomeAssistant, entry: ConfigEntry) -> dict[str, Any]:
    coordinator = hass.data.get(DOMAIN, {}).get(entry.entry_id)
    data: dict[str, Any] = {
        "entry": {
            "version": entry.version,
            "data": async_redact_data(dict(entry.data), TO_REDACT),
            "options": async_redact_data(dict(entry.options), TO_REDACT),
        },
    }
    if coordinator is None:
        return data

    result = coordinator.data or {}
    rooms = {
        room_id: {k: v for k, v in (rdata or {}).items() if k not in _ROOM_DATA_SKIP}
        for room_id, rdata in (result.get("rooms") or {}).items()
    }
    data["runtime"] = {
        "system_mode": coordinator.get_system_mode(),
        "last_update_success": coordinator.last_update_success,
        "summary": {k: v for k, v in result.items() if k != "rooms" and not isinstance(v, (list, dict))},
        "rooms": async_redact_data(rooms, TO_REDACT),
    }
    return data
