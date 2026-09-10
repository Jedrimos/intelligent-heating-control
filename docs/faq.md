# FAQ – Häufig gestellte Fragen

## Installation & Setup

### Die Integration erscheint nicht bei „Integration hinzufügen"

1. Prüfe ob der Ordner `custom_components/intelligent_heating_control` im HA-Konfigurationsverzeichnis liegt
2. Stelle sicher dass `manifest.json` im Ordner vorhanden ist
3. Starte HA **vollständig neu** (nicht nur ein Reload)
4. Cache des Browsers leeren

### Das IHC-Panel erscheint nicht in der Seitenleiste

1. **Browser-Cache leeren**: Strg+F5 (Windows/Linux) oder Cmd+Shift+R (Mac)
2. Prüfe ob die Datei `/ihc_static/ihc-panel.js` erreichbar ist (direkt im Browser aufrufen)
3. Prüfe HA-Logs auf Fehler mit Keyword `ihc` oder `panel`
4. Die Panel-Registrierung kann im Options-Flow deaktiviert sein (`show_panel: false`)

### Beim Setup erscheint kein Außentemperatursensor zur Auswahl

Der Außensensor ist im Setup-Wizard **optional**. Wenn dein Sensor im Dropdown nicht erscheint:
- Prüfe ob die Entity den State `unavailable` hat
- Stelle sicher dass es sich um eine `sensor.*` Entity mit numerischem Wert handelt
- Ohne Außensensor fällt jedes Zimmer auf seine konfigurierte `comfort_temp` zurück – die
  Integration funktioniert auch so, nur ohne witterungsgeführte Heizkurve

---

## Konfiguration

### Wie finde ich die room_id eines Zimmers?

In den Attributen der `climate.ihc_<zimmer>` Entity unter `room_id`. Im HA Developer-Tools:
```
Entwicklerwerkzeuge → Zustände → climate.ihc_wohnzimmer → Attribute → room_id
```

### Einstellungen die ich im Panel speichere erscheinen nach dem Refresh wieder zurückgesetzt

- Die Settings werden via `update_global_settings` Service gespeichert
- Nach dem Speichern löst HA einen Integration-Reload aus (dauert einige Sekunden)
- Während des Reloads können kurz alte Werte angezeigt werden
- Wenn die Werte dauerhaft zurückspringen: Prüfe HA-Logs auf Fehler beim Speichern

### Kann ich IHC gleichzeitig mit dem Config-Flow (Integrationen-Seite) und dem Panel konfigurieren?

Ja. Beide schreiben in dieselben `config_entry.options`. Der letzte Speichervorgang gewinnt. Es wird empfohlen, nicht gleichzeitig an beiden Stellen zu konfigurieren.

---

## Zimmer & Entitäten

### Warum ist die Anforderung für ein Zimmer immer 0%, obwohl es kalt ist?

Mögliche Ursachen:
1. **Fenster offen**: Wenn ein Fenstersensor `on` (offen) meldet → 0% Anforderung
2. **Zimmermodus = OFF**: Zimmer ist manuell ausgeschaltet
3. **System-Modus = OFF oder Vacation**: Heizung komplett deaktiviert
4. **Kein Temperatursensor**: Ohne `temp_sensor` (und ohne TRV-Temperatur als Fallback) kann keine Anforderung berechnet werden
5. **Sensor unavailable**: Sensor-Entity ist `unavailable` → IHC fällt auf 0% zurück
6. **Innerhalb des Totbands**: Isttemp liegt bereits nicht mehr als `deadband` unter der Zieltemperatur (siehe [Anforderungsberechnung](advanced.md#anforderungsberechnung-pro-zimmer))

### Das TRV wird nicht gesteuert (Solltemperatur ändert sich nicht)

1. Prüfe ob die `valve_entities` korrekt konfiguriert sind (Entity-ID muss exakt stimmen)
2. Stelle sicher dass das Thermostat im HVAC-Modus `heat` ist (nicht `off`)
3. Manche TRVs ignorieren die Solltemperatur wenn sie im lokalen Modus sind
4. `trv_min_send_interval` kann eine erneute Übertragung kurzzeitig verzögern
5. Prüfe HA-Logs auf Fehler beim `climate.set_temperature` Service-Call

### Nach dem Hinzufügen eines Zimmers erscheinen keine neuen Entitäten

1. Warte 10-30 Sekunden – HA lädt die Integration nach dem Hinzufügen neu
2. Lade die HA-Seite im Browser neu
3. Prüfe HA-Logs auf Fehler

### Zimmer-Entitäten heißen alle `climate.ihc_unknown`

Der Zimmer-Name wird als Entity-ID verwendet. Sonderzeichen und Leerzeichen werden ersetzt. Wenn der Name beim Erstellen leer war oder nur Sonderzeichen enthielt, kann das passieren. Zimmer löschen und neu erstellen mit korrektem Namen.

### Was bedeutet `binary_sensor.ihc_<zimmer>_ventil_fehler`?

Die Stuck-Valve-Erkennung: Ein TRV im Zimmer hat trotz Heizanforderung länger als
`stuck_valve_timeout` (Standard 1800 s) nicht reagiert – meist ein Zeichen für ein verkalktes
oder mechanisch blockiertes Ventil. Betroffene TRVs stehen im Attribut `stuck_valve_entities`.

---

## Heizverhalten

### Die Anforderung eines Zimmers schwankt sehr stark / wechselt schnell zwischen niedrig und hoch

1. **Totband erhöhen**: Größerer `deadband` pro Zimmer = weniger Anforderungsschwankungen bei kleinen Temperaturänderungen
2. **TRV-Sendeintervall prüfen**: `trv_min_send_interval` reduziert die Häufigkeit gesendeter Sollwertänderungen
3. **Peak Shaving aktivieren**: Verhindert, dass beim gleichzeitigen Anfordern mehrerer Zimmer alle TRVs zeitgleich aufreißen

> Es gibt keine zentrale Hysterese/Mindest-Ein-Ausschaltzeit mehr (kein Heizungsschalter-Modus) –
> jedes TRV regelt selbst, IHC liefert nur den Sollwert.

### Die Temperatur im Zimmer ist dauerhaft zu kalt / zu warm

1. **Zimmer-Offset anpassen**: IHC Panel → Zimmer → Bearbeiten → Zimmer-Offset
   - Zu kalt → Offset erhöhen (z.B. +1,5°C)
   - Zu warm → Offset senken (z.B. -0,5°C)
2. **Heizkurve überprüfen**: Ist die Kurve für dein Heizsystem geeignet?
3. **Temperatursensor-Position**: Sitzt der Sensor an einer ungünstigen Stelle (z.B. neben einem Heizkörper)?
4. **TRV-Temperatur-Blending**: Ist `trv_temp_weight > 0`, fließt die (oft wärmere) TRV-eigene
   Temperatur mit ein – `trv_temp_offset` (z. B. -2 °C) kann das kompensieren

### Die Heizung geht nicht an, obwohl Zimmer zu kalt sind

1. **Sommerautomatik**: Wenn `summer_mode_enabled: true` (oder `summer_mode_entity` aktiv) und Außentemperatur > Schwellenwert → Heizung gesperrt
2. **Heizperiode**: Wenn `heating_period_entity` konfiguriert ist und auf OFF steht → keine Heizung
3. **System-Modus**: Prüfe ob System-Modus auf `off` oder `vacation` steht
4. **Alle Zimmer Modus=OFF**: Jedes Zimmer regelt unabhängig – ein Zimmer im Modus `off` heizt nie (außer Frostschutz)

### Ein Zimmer wird nicht vorgeheizt obwohl ein Zeitplan beginnt

1. Prüfe ob `preheat_minutes > 0` (oder `optimum_start_enabled: true`) in den Einstellungen
2. Stelle sicher dass das Zimmer nicht im Modus `off`, `away` oder einem anderen Override-Modus ist
3. System-Modus muss `auto` oder `heat` sein

---

## Frontend Panel

### Ich kann im Panel nichts speichern / Buttons reagieren nicht

1. Browser-Console öffnen (F12 → Console) – gibt es JavaScript-Fehler?
2. Cache leeren und Seite neu laden
3. Prüfe ob du Admin-Rechte in HA hast (Panel-Services benötigen Admin)

### Zeitpläne gehen verloren wenn ich zwischen Zimmern wechsle

Zeitpläne müssen **pro Zimmer gespeichert** werden bevor du zum nächsten Zimmer wechselst. Der Tab-Wechsel zu einem anderen Zimmer setzt ungespeicherte Änderungen zurück.

### Die Entity-Vorschläge in den Eingabefeldern erscheinen nicht

1. Browser muss `<datalist>` unterstützen (alle modernen Browser, kein IE)
2. Mindestens 1 Zeichen eingeben damit der Browser die Vorschläge anzeigt
3. Domain-Präfix eingeben: `sensor.` zeigt alle Sensoren, `climate.` alle Climate-Entities

---

## Fortgeschrittene Fragen

### Kann ich IHC für Kühlsysteme verwenden?

Nein. IHC steuert ausschließlich TRVs direkt, und TRVs können physisch nicht aktiv kühlen. Die
aktive Kühlfunktion (`enable_cooling`/`cooling_switch`, Systemmodus `cool`) wurde in v2.1.0
vollständig entfernt. Für passive Sommer-Beschattung siehe die geplante Rollosteuerung in
[ROADMAP.md](../ROADMAP.md).

### Kann ich mehrere IHC-Instanzen (verschiedene Wohnungen) haben?

Nein, aktuell wird nur eine Instanz pro HA unterstützt. Multi-Instanz ist auf der Roadmap.

### Wie kann ich die Konfiguration sichern?

1. **Export**: IHC Panel → Einstellungen → Backup & Restore → Export
   - Lädt die komplette Konfiguration direkt als `.json`-Datei im Browser herunter
   - Enthält alle Zimmer, Zeitpläne, Heizkurven-Punkte und Globaleinstellungen
2. **Import**: Backup & Restore → Datei auswählen → IHC spielt alle Einstellungen automatisch ein
3. **HA-Backup**: Standard HA Backup (enthält automatisch `config_entries.json` mit IHC-Konfiguration)

### Wie kann ich Debugging-Informationen erhalten?

```yaml
# In configuration.yaml:
logger:
  default: warning
  logs:
    custom_components.intelligent_heating_control: debug
```

Dann HA neu starten → Logs unter Einstellungen → System → Protokolle.

### Unterstützt IHC eine zentrale Kesselsteuerung oder OpenTherm?

Nein – seit v2.0.0 (TRV-only) steuert IHC ausschließlich `climate.*`-TRV-Entitäten direkt und hat
keinen Kessel-/Heizungsschalter-Aktor mehr. Wenn dein Wärmeerzeuger eigenständig auf die
TRV-Anforderung reagiert (z. B. über OpenTherm-Gateway-Logik in einer eigenen Automation), lässt
sich das unabhängig von IHC einrichten; IHC selbst liefert dafür kein Signal mehr.

---

## Fehlercodes und Log-Meldungen

| Log-Meldung | Bedeutung | Lösung |
|-------------|-----------|--------|
| `Outdoor temp sensor not available` | Außensensor meldet unavailable | Sensor prüfen |
| `Room X: no temperature sensor` | Zimmer hat keinen Sensor | temp_sensor konfigurieren |
| `HeatingCurve requires at least 2 points` | Heizkurve hat weniger als 2 Punkte | Kurve korrigieren |
| `room_id not found` | Service mit unbekannter ID aufgerufen | room_id aus Entity-Attribut holen |
| `IHC service error` | Service-Call fehlgeschlagen | HA-Logs auf Details prüfen |
