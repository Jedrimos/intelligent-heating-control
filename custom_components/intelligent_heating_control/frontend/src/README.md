# IHC Frontend Source

Die Quelldateien für das IHC Dashboard Panel.

## Struktur

| Datei | Inhalt |
|-------|--------|
| `00_constants.js` | Konstanten: DOMAIN, Modi-Labels, Wetterzustände |
| `01_styles.css.js` | Gesamtes CSS Design System (STYLES template literal) |
| `09_main.js` | Web Component Klasse: constructor, lifecycle, `_renderTabContent` + Registrierung |
| `02_utils.js` | Hilfsfunktionen: `_getRoomData`, `_getGlobal`, `_callService`, `_toast`, Entity-Picker etc. |
| `03_tab_dashboard.js` | Dashboard-Tab: `_renderOverview()` |
| `04_tab_rooms.js` | Zimmer-Tab: `_renderRooms()`, `_renderRoomDetail()`, Zeitplan + Kalender |
| `05_tab_settings.js` | Einstellungen-Tab: `_renderSettings()` |
| `06_tab_diagnose.js` | Diagnose-Tab: `_renderDiagnose()` |
| `07_tab_curve.js` | Heizkurven-Tab: `_renderCurve()`, `_drawCurve()` |
| `08_modals.js` | Modals: `_showAddRoomModal()`, `_showEditRoomModal()`, `_showModal()`, Schedule-Helpers |

## Build

Nach Änderungen an einer `src/`-Datei:

```bash
cd custom_components/intelligent_heating_control
python3 frontend/build.py
```

Das regeneriert `frontend/ihc-panel.js` (die von Home Assistant geladene Datei).

## Wichtig: Build-Reihenfolge

`build.py` verwendet eine **feste Datei-Reihenfolge** (nicht einfach alphabetisch),
weil `09_main.js` die Klassen-Deklaration enthält und die Methodendateien
`02`–`08` als Fragmente *innerhalb* des Klassen-Körpers eingefügt werden müssen:

1. `00_constants.js` – globale Konstanten
2. `01_styles.css.js` – STYLES-Konstante
3. `09_main.js` (Teil A) – `class IHCPanel {` öffnet
4. `02_utils.js` – Hilfsmethoden
5. `03_tab_dashboard.js` – Dashboard-Methode
6. `04_tab_rooms.js` – Zimmer-Methoden
7. `06_tab_diagnose.js` – Diagnose-Methode
8. `05_tab_settings.js` – Einstellungen-Methode
9. `07_tab_curve.js` – Heizkurve-Methoden
10. `08_modals.js` – Modal-Methoden
11. `09_main.js` (Teil B) – `}` schließt Klasse + `customElements.define(...)`

Der Marker `// === METHODS_INSERTED_HERE ===` in `09_main.js` gibt die Einfügeposition an.
