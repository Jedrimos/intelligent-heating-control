#!/usr/bin/env python3
"""
Build script: Concatenates frontend/src/*.js files into frontend/ihc-panel.js

The source files are split as follows:
  00_constants.js   – Top-level constants (DOMAIN, MODE_LABELS, etc.)
  01_styles.css.js  – STYLES template literal (complete CSS)
  09_main.js        – IHCPanel class shell: constructor, lifecycle, _renderTabContent.
                      Contains a marker "=== METHODS_INSERTED_HERE ===" where
                      method files 02–08 are injected by this build script.
  02_utils.js       – Data helpers, _callService, _toast, entity pickers, etc.
  03_tab_dashboard.js – _renderOverview() and Dashboard tab logic
  04_tab_rooms.js   – _renderRooms(), _renderRoomDetail(), schedule/calendar inline
  05_tab_settings.js  – _renderSettings() and all settings sections
  06_tab_diagnose.js  – _renderDiagnose()
  07_tab_curve.js   – _renderCurve(), _collectCurvePoints(), _drawCurve()
  08_modals.js      – _showAddRoomModal(), _showEditRoomModal(), modal helpers

Usage:
    cd custom_components/intelligent_heating_control
    python3 frontend/build.py

Run this after editing any file in frontend/src/ to regenerate ihc-panel.js.
The generated ihc-panel.js is the file loaded by Home Assistant.
"""
import os

SRC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "src")
OUTPUT  = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ihc-panel.js")

# Files that are injected between Part A and Part B of 09_main.js
# (raw method fragments that live inside the IHCPanel class body)
METHOD_FILES = [
    "02_utils.js",
    "03_tab_dashboard.js",
    "04_tab_rooms.js",
    "06_tab_diagnose.js",
    "05_tab_settings.js",
    "07_tab_curve.js",
    "08_modals.js",
]

MARKER = "// === METHODS_INSERTED_HERE ==="


def read_file(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def build():
    # 1. Global constants + styles (must come before class definition)
    preamble_files = ["00_constants.js", "01_styles.css.js"]
    parts = []

    for fname in preamble_files:
        fpath = os.path.join(SRC_DIR, fname)
        if not os.path.exists(fpath):
            print(f"ERROR: Missing {fname}")
            return
        parts.append(f"// === {fname} ===\n")
        parts.append(read_file(fpath))
        parts.append("\n")

    # 2. 09_main.js is split at the MARKER – method files are injected between the two halves
    main_path = os.path.join(SRC_DIR, "09_main.js")
    if not os.path.exists(main_path):
        print("ERROR: Missing 09_main.js")
        return

    main_content = read_file(main_path)
    if MARKER not in main_content:
        print(f"ERROR: Marker '{MARKER}' not found in 09_main.js")
        return

    part_a, part_b = main_content.split(MARKER, 1)
    # Strip the "// (methods from ...)" placeholder comment line from part_b
    part_b_lines = part_b.splitlines(keepends=True)
    # Skip the first line(s) that are just the placeholder comment
    skip = 0
    for line in part_b_lines:
        stripped = line.strip()
        if stripped.startswith("//") or stripped == "":
            skip += 1
        else:
            break
    part_b_clean = "".join(part_b_lines[skip:])

    parts.append("// === 09_main.js (Part A: class open + lifecycle) ===\n")
    parts.append(part_a)

    # 3. Inject method files inside the class body
    for fname in METHOD_FILES:
        fpath = os.path.join(SRC_DIR, fname)
        if not os.path.exists(fpath):
            print(f"WARNING: Missing method file {fname} – skipping")
            continue
        parts.append(f"\n// === {fname} ===\n")
        parts.append(read_file(fpath))
        parts.append("\n")

    # 4. Append Part B of 09_main.js (class closing brace + registration)
    parts.append("\n// === 09_main.js (Part B: class close + registration) ===\n")
    parts.append(part_b_clean)

    combined = "".join(parts)

    with open(OUTPUT, "w", encoding="utf-8") as fh:
        fh.write(combined)

    print(f"Built {OUTPUT}")
    print(f"  {len(combined)} chars, {combined.count(chr(10))} lines")
    print(f"  Source files: {len(preamble_files) + 1 + len(METHOD_FILES)}")


if __name__ == "__main__":
    build()
