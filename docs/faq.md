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

Der Config-Flow zeigt alle `sensor.*` Entities an. Wenn dein Außensensor nicht erscheint:
- Prüfe ob die Entity den State `unavailable` hat
- Stelle sicher dass es sich um eine `sensor.*` Entity mit numerischem Wert handelt
- Gib die Entity-ID direkt ein wenn der Dropdown nicht funktioniert

---

## Konfiguration

### Wie finde ich die room_id eines Zimmers?

In den Attributen der `climate.ihc_<zimmer>` Entity unter `room_id`. Im HA Developer-Tools:
```
Entwicklerwerkzeuge → Zustände → climate.ihc_wohnzimmer → Attribute → room_id
```

### Die Heizkurve zeigt immer die Standard-Kurve, nicht meine konfigurierte

Seit v1.0.1 behoben. Stelle sicher dass du die neueste Version installiert hast und HA nach dem Update neu gestartet wurde.

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
4. **Kein Temperatursensor**: Ohne `temp_sensor` kann keine Anforderung berechnet werden
5. **Sensor unavailable**: Sensor-Entity ist `unavailable` → IHC fällt auf 0% zurück

### Das TRV/Thermostat wird nicht gesteuert (Solltemperatur ändert sich nicht)

1. Prüfe ob die `valve_entities` korrekt konfiguriert sind (Entity-ID muss exact stimmen)
2. Stelle sicher dass das Thermostat im HVAC-Modus `heat` ist (nicht `off`)
3. Manche TRVs ignorieren Solltemperatur wenn sie im lokalen Modus sind
4. Prüfe HA-Logs auf Fehler beim `climate.set_temperature` Service-Call

### Nach dem Hinzufügen eines Zimmers erscheinen keine neuen Entitäten

1. Warte 10-30 Sekunden – HA lädt die Integration nach dem Hinzufügen neu
2. Lade die HA-Seite im Browser neu
3. Prüfe HA-Logs auf Fehler

### Zimmer-Entitäten heißen alle `climate.ihc_unknown`

Der Zimmer-Name wird als Entity-ID verwendet. Sonderzeichen und Leerzeichen werden ersetzt. Wenn der Name beim Erstellen leer war oder nur Sonderzeichen enthielt, kann das passieren. Zimmer löschen und neu erstellen mit korrektem Namen.

---

## Heizverhalten

### Die Heizung taktet sehr schnell (geht kurz an und wieder aus)

1. **Min-Einschaltzeit erhöhen**: Einstellungen → Klimabaustein → Mindest-Einschaltzeit (empfohlen: 10 min)
2. **Min-Ausschaltzeit erhöhen**: Mindest-Ausschaltzeit (empfohlen: 10 min)
3. **Hysterese erhöhen**: Höherer Wert verhindert schnelles Umschalten
4. **Totband erhöhen**: Größerer Deadband pro Zimmer = weniger Anforderungsschwankungen

### Die Temperatur im Zimmer ist dauerhaft zu kalt / zu warm

1. **Zimmer-Offset anpassen**: IHC Panel → Zimmer → Bearbeiten → Zimmer-Offset
   - Zu kalt → Offset erhöhen (z.B. +1,5°C)
   - Zu warm → Offset senken (z.B. -0,5°C)
2. **Heizkurve überprüfen**: Ist die Kurve für dein Heizsystem geeignet?
3. **Temperatursensor-Position**: Sitzt der Sensor an einer ungünstigen Stelle (z.B. neben einem Heizkörper)?

### Die Heizung geht nicht an, obwohl Zimmer zu kalt sind

1. **Sommerautomatik**: Wenn `summer_mode_enabled: true` und Außentemperatur > Schwellenwert → Heizung gesperrt
2. **System-Modus**: Prüfe ob System-Modus auf `off` oder `vacation` steht
3. **Einschaltschwelle zu hoch**: Wenn Gesamtanforderung nie 15% erreicht, prüfe die Zimmer-Anforderungen
4. **Alle Zimmer Modus=OFF**: Kein Zimmer hat Anforderung → Klimabaustein schaltet nicht ein
5. **Mindestanzahl Zimmer**: Wenn `min_rooms_demand: 3` aber nur 2 Zimmer Anforderung haben → kein Heizen

### Ein Zimmer wird nicht vorgeheizt obwohl ein Zeitplan beginnt

1. Prüfe ob `preheat_minutes > 0` in den Einstellungen
2. Stelle sicher dass das Zimmer nicht im Modus `off`, `away` oder einem anderen Override-Modus ist
3. System-Modus muss `auto` oder `heat` sein

---

## Frontend Panel

### Ich kann im Panel nichts speichern / Buttons reagieren nicht

1. Browser-Console öffnen (F12 → Console) – gibt es JavaScript-Fehler?
2. Cache leeren und Seite neu laden
3. Prüfe ob du Admin-Rechte in HA hast (Panel-Services benötigen Admin)

### Das Modal schließt sich automatisch wenn ich tippe

Seit v1.0.1 behoben. Das Modal bleibt jetzt offen während HA State-Updates kommen.

### Zeitpläne gehen verloren wenn ich zwischen Zimmern wechsle

Zeitpläne müssen **pro Zimmer gespeichert** werden bevor du zum nächsten Zimmer wechselst. Der Tab-Wechsel zu einem anderen Zimmer setzt ungespeicherte Änderungen zurück.

### Die Entity-Vorschläge in den Eingabefeldern erscheinen nicht

1. Browser muss `<datalist>` unterstützen (alle modernen Browser, kein IE)
2. Mindestens 1 Zeichen eingeben damit der Browser die Vorschläge anzeigt
3. Domain-Präfix eingeben: `sensor.` zeigt alle Sensoren, `climate.` alle Climate-Entities

---

## Fortgeschrittene Fragen

### Kann ich IHC für Kühlsysteme verwenden?

Ja, mit Einschränkungen:
1. `cooling_switch` im Setup konfigurieren
2. System-Modus auf `cool` stellen
3. ⚠️ Der Kühlmodus ist implementiert aber noch nicht vollständig getestet

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

### Unterstützt IHC OpenTherm (direkte Kesselkommunikation)?

Nicht direkt. IHC steuert einen `switch.*` oder `input_boolean.*` für den Kessel. Wenn du einen OpenTherm-Adapter (z.B. via `opentherm_gw`) hast, kannst du dessen `switch.*` verwenden. Direkte OpenTherm-Modulation ist auf der Roadmap.

---

## Fehlercodes und Log-Meldungen

| Log-Meldung | Bedeutung | Lösung |
|-------------|-----------|--------|
| `Outdoor temp sensor not available` | Außensensor meldet unavailable | Sensor prüfen |
| `Room X: no temperature sensor` | Zimmer hat keinen Sensor | temp_sensor konfigurieren |
| `HeatingCurve requires at least 2 points` | Heizkurve hat weniger als 2 Punkte | Kurve korrigieren |
| `room_id not found` | Service mit unbekannter ID aufgerufen | room_id aus Entity-Attribut holen |
| `IHC service error` | Service-Call fehlgeschlagen | HA-Logs auf Details prüfen |
