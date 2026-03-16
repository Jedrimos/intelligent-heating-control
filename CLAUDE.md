# CLAUDE.md – Entwicklungsregeln für Intelligent Heating Control

## Kritische Regeln – IMMER einhalten

### Python-Backend

1. **Konstanten-Konsistenz**: Jede Konstante die in `const.py` definiert wird, muss an ALLEN folgenden Stellen synchron gehalten werden:
   - `const.py` (Definition)
   - `coordinator.py` (Import + Verwendung)
   - `config_flow.py` (Import + Formulare + Speichern)
   - `climate.py` (Import + extra_state_attributes)
   - Vor dem Löschen einer Konstante: `grep -rn "CONST_NAME" .` ausführen!

2. **Vor dem Löschen einer CONF_/DEFAULT_-Konstante immer prüfen**:
   ```bash
   grep -rn "CONF_XYZ\|DEFAULT_XYZ" custom_components/ --include="*.py"
   ```
   Erst löschen wenn alle Referenzen entfernt sind.

3. **Import-Fehler vermeiden**: Nach jeder Änderung an `const.py` prüfen ob alle Importe in `coordinator.py`, `config_flow.py`, `climate.py` noch gültig sind.

4. **Neue Konstanten**: Wenn eine neue CONF_* Konstante hinzugefügt wird:
   - In `const.py` definieren
   - In `config_flow.py` importieren + in den Formularen anzeigen + im save-handler speichern
   - In `climate.py` importieren + in `extra_state_attributes` zurückgeben
   - In `coordinator.py` importieren + in der Logik verwenden

### JavaScript-Frontend (ihc-panel.js)

5. **Element-IDs konsistent**: HTML-IDs in Templates müssen mit `querySelector("#id")` im save-handler übereinstimmen. Wenn ein Element entfernt wird, den save-handler ebenfalls anpassen.

6. **Neue Felder im Add-Room-Modal** müssen auch im Edit-Room-Modal vorhanden sein (und umgekehrt). Beide haben eigene save-handler.

7. **Entfernte Tabs aus dem switch entfernen**: Wenn ein Tab aus dem Tab-Bar entfernt wird, auch den `case` in `_renderTabContent()` entfernen.

8. **querySelector mit `?.` für optionale Elemente**: Wenn ein Element nicht in jedem Kontext vorhanden ist, immer `querySelector("#id")?.value` verwenden.

## Workflow

### Vor jedem Commit

```bash
# Python-Syntax prüfen
python3 -m py_compile custom_components/intelligent_heating_control/const.py
python3 -m py_compile custom_components/intelligent_heating_control/coordinator.py
python3 -m py_compile custom_components/intelligent_heating_control/config_flow.py
python3 -m py_compile custom_components/intelligent_heating_control/climate.py

# Verwaiste Referenzen suchen
grep -rn "CONF_WINDOW_OPEN_TEMP\|DEFAULT_WINDOW_OPEN_TEMP" custom_components/ --include="*.py"
```

### Branch-Regeln

- Entwicklungs-Branch: `claude/hacs-heating-control-plugin-NXmK3`
- Niemals direkt auf `main` pushen
- Push-Befehl: `git push -u origin claude/hacs-heating-control-plugin-NXmK3`

## Architektur

### Datenfluss
```
config_flow.py (UI-Konfiguration)
    → options (HA config_entries)
    → coordinator.py (liest options, berechnet Logik)
    → climate.py (extra_state_attributes = was das Frontend sieht)
    → ihc-panel.js (liest state.attributes, zeigt UI)
    → callService() → coordinator.py (verarbeitet Service-Calls)
```

### Wichtige Service-Calls (Frontend → Backend)
- `add_room` / `update_room` / `remove_room` – Zimmerverwaltung
- `set_room_mode` – Zimmermodus setzen
- `update_global_settings` – Globale Einstellungen
- `boost_room` – Boost aktivieren/deaktivieren
- `set_system_mode` – Systemmodus

### Zeitpläne
- IHC-Zeitpläne: `update_room` mit `schedules: [{ days: [...], periods: [...] }]`
- HA-Zeitpläne: `update_room` mit `ha_schedules: [{ entity, mode, condition_entity, condition_state }]`
- Zeitpläne werden in `_editingSchedules[entityId]` gepuffert bis gespeichert
- Nach Import: `delete this._editingSchedules[entityId]` damit neu geladen wird

### Tab-Struktur (Frontend)
- `🏠 Dashboard` → `_renderOverview()` – Zimmer-Kacheln + System-Status
- `🚪 Zimmer` → `_renderRooms()` – Liste + Zimmer-Detail (Zeitplan, Kalender als Sub-Tabs)
- `📊 Übersicht` → `_renderDiagnose()` – Statistiken, Messwerte
- `⚙️ Einstellungen` → `_renderSettings()` – Globale Konfiguration
- `📈 Heizkurve` → `_renderCurve()` – Heizkurven-Editor

### Zimmer-Detail Sub-Tabs
- `📅 Zeitplan` → `_renderRoomScheduleInline(room, container)`
- `🗓️ Wochenansicht` → `_renderRoomCalendarInline(room, container)`
