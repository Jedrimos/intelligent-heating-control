"""
Pytest bootstrap for testing pure-logic modules without Home Assistant installed.

The integration's __init__.py imports `homeassistant.*`, which is not a
dependency of this test suite (deliberately - these tests target the small
set of modules that have no Home Assistant dependency at all: heating_curve.py,
schedule_manager.py, heating_controller.py, const.py). Importing the package
normally (`import custom_components.intelligent_heating_control`) would run
that __init__.py and fail with ModuleNotFoundError.

To import the pure submodules directly - including their internal relative
imports such as `from .const import ...` - we register lightweight namespace
package stubs in sys.modules before any test collects, pointing at the real
directories on disk but never executing the real __init__.py files.
"""
from __future__ import annotations

import sys
import types
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
COMPONENT_DIR = REPO_ROOT / "custom_components" / "intelligent_heating_control"


def _stub_namespace_package(name: str, path: Path) -> types.ModuleType:
    if name in sys.modules:
        return sys.modules[name]
    module = types.ModuleType(name)
    module.__path__ = [str(path)]
    sys.modules[name] = module
    return module


_stub_namespace_package("custom_components", REPO_ROOT / "custom_components")
_stub_namespace_package("custom_components.intelligent_heating_control", COMPONENT_DIR)
