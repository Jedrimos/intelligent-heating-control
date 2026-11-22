"""English UI dictionary (frontend/i18n/en.py) sanity checks.

A single invalid regex once took the whole panel down (JS `u` flag rejects escapes
Python accepts), so every pattern is compiled with the real JS engine when node is
available, and the generated ihc-panel.js must be up to date with en.py.
"""
import importlib.util
import json
import shutil
import subprocess
from pathlib import Path

import pytest

FRONTEND = Path(__file__).resolve().parent.parent / "custom_components" / "intelligent_heating_control" / "frontend"


def _load():
    spec = importlib.util.spec_from_file_location("ihc_en", FRONTEND / "i18n" / "en.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_dictionary_shape():
    mod = _load()
    assert len(mod.EXACT) > 500
    assert all(isinstance(k, str) and isinstance(v, str) for k, v in mod.EXACT.items())
    for pattern, repl in mod.PATTERNS:
        assert pattern.startswith("^") and pattern.endswith("$"), pattern


@pytest.mark.skipif(shutil.which("node") is None, reason="node not installed")
def test_patterns_compile_in_javascript():
    mod = _load()
    script = (
        "const pats = " + json.dumps([p for p, _ in mod.PATTERNS]) + ";"
        "const bad = []; for (const p of pats) { try { new RegExp(p, 'u'); } catch (e) { bad.push(p + ' -> ' + e.message); } }"
        "if (bad.length) { console.error(bad.join('\\n')); process.exit(1); }"
    )
    res = subprocess.run(["node", "-e", script], capture_output=True, text=True)
    assert res.returncode == 0, res.stderr


def test_generated_panel_contains_current_dictionary():
    panel = (FRONTEND / "ihc-panel.js").read_text(encoding="utf-8")
    mod = _load()
    some_key = sorted(mod.EXACT)[len(mod.EXACT) // 2]
    assert json.dumps(" ".join(some_key.split()), ensure_ascii=False) in panel, \
        "ihc-panel.js is stale - run python3 frontend/build.py"
