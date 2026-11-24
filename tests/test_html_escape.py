"""Every data value that goes into the panel's HTML must be escaped (HACS review 2026-11-24).

Runs tests/tools/check_html_escape.js (a real JS parser, acorn) over frontend/src. Skipped
when node or acorn is not available; CI installs both."""
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "custom_components" / "intelligent_heating_control" / "frontend" / "src"
TOOL = ROOT / "tests" / "tools" / "check_html_escape.js"


def _acorn_available() -> bool:
    if shutil.which("node") is None:
        return False
    res = subprocess.run(["node", "-e", "require('acorn'); require('acorn-walk')"], cwd=ROOT,
                         capture_output=True, text=True)
    return res.returncode == 0


@pytest.mark.skipif(not _acorn_available(), reason="node/acorn not installed")
def test_all_html_interpolations_are_escaped():
    res = subprocess.run(["node", str(TOOL), str(SRC)], cwd=ROOT, capture_output=True, text=True)
    assert res.returncode == 0, res.stdout + res.stderr
    cards = [str(SRC.parent / "ihc-room-card.js"), str(SRC.parent / "ihc-dashboard-card.js")]
    res = subprocess.run(["node", str(TOOL), *cards], cwd=ROOT, capture_output=True, text=True)
    assert res.returncode == 0, res.stdout + res.stderr
