"""Static guard (HACS review 2026-11-24): no single-entity selector may get a default.

An entity selector rejects "" - vol.Optional(KEY, default="") in front of one makes the form
fail whenever the optional field is left empty. Use _opt_entity() (suggested_value) instead."""
import re
from pathlib import Path

FLOW = Path(__file__).resolve().parent.parent / "custom_components" / "intelligent_heating_control" / "config_flow.py"


def test_no_default_on_single_entity_selectors():
    s = FLOW.read_text(encoding="utf-8")
    bad = []
    for m in re.finditer(r"vol\.Optional\(", s):
        depth, j = 0, m.end() - 1
        while True:
            depth += {"(": 1, ")": -1}.get(s[j], 0)
            if depth == 0:
                break
            j += 1
        inner, after = s[m.end():j], s[j + 1:j + 120]
        sel = re.match(r'\s*:\s*selector\.selector\(\{\s*"entity"\s*:\s*\{([^}]*)\}', after)
        if sel and "multiple" not in sel.group(1) and "default" in inner:
            bad.append(f"line {s[:m.start()].count(chr(10)) + 1}: {inner.strip()[:60]}")
    assert not bad, "\n".join(bad)
