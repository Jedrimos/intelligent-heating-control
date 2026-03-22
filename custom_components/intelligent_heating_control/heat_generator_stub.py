"""
Wärmeerzeuger-Modus (Heat Generator Mode) - Roadmap v3.0

Placeholder für den zukünftigen Wärmeerzeuger-Modus mit:
- Heizkreis-Verwaltung (Pumpen, Mischventile)
- Pufferspeicher-Management
- Wärmepumpe-Optimierung (COP)
- Warmwasser-Priorisierung (TWW)
- KNX-Integration
"""

import logging
_LOGGER = logging.getLogger(__name__)

CONTROLLER_MODE_HG = "hg"  # Heat Generator mode identifier


class HeatGeneratorMixin:
    """
    Mixin-Klasse für den Wärmeerzeuger-Modus.

    Noch nicht implementiert (Roadmap v3.0).
    Methoden geben Defaults zurück damit der Code nicht bricht.
    """

    def _is_heat_generator_mode(self) -> bool:
        """Returns True if system runs in Wärmeerzeuger mode."""
        from .const import CONF_CONTROLLER_MODE
        return self.get_config().get(CONF_CONTROLLER_MODE) == CONTROLLER_MODE_HG

    def _hg_get_circuit_demand(self, circuit_id: str) -> float:
        """Get heating demand for a circuit (0-100%). NOT YET IMPLEMENTED."""
        return 0.0

    def _hg_control_circuit_pump(self, circuit_id: str, on: bool) -> None:
        """Control circuit pump. NOT YET IMPLEMENTED."""
        pass

    def _hg_set_mixer_position(self, circuit_id: str, position: int) -> None:
        """Set mixer valve position (0-100%). NOT YET IMPLEMENTED."""
        pass

    def _hg_update_buffer_state(self) -> dict:
        """Read buffer tank temperatures. NOT YET IMPLEMENTED."""
        return {"top": None, "mid": None, "bot": None}

    def _hg_update_tww_state(self) -> dict:
        """Read domestic hot water state. NOT YET IMPLEMENTED."""
        return {"temp": None, "active": False}

    def _hg_get_heatpump_cop(self) -> float | None:
        """Read heat pump COP. NOT YET IMPLEMENTED."""
        return None
