# Frontend Panel

Das IHC-Panel ist ein eigenes Dashboard das in der HA-Seitenleiste unter dem Menüpunkt **IHC** (🌡️) erscheint.

Es ist als Vanilla JavaScript Web Component implementiert (`ihc-panel.js`) und benötigt keine externe Abhängigkeiten.

---

## Tab: Übersicht

Der Übersicht-Tab ist der Hauptanzeigebereich und aktualisiert sich **automatisch alle 5 Sekunden**.

### Status-Leiste

Oben auf der Seite werden die globalen Systemwerte angezeigt:

| Kachel | Beschreibung |
|--------|-------------|
| Außentemp. | Aktuelle Außentemperatur |
| Kurven-Ziel | Aktueller Heizkurven-Basiswert |
| Anforderung | Gewichtete Gesamtanforderung in % |
| Heizung | `🔥 EIN` oder `✓ AUS` |
| Zimmer aktiv | Anzahl Zimmer mit Anforderung > 0 |
| Modus | Aktueller Systemmodus |
| Laufzeit heute | Gesamte Heizlaufzeit heute in Minuten |
| Energie heute | Geschätzter Verbrauch in kWh |

### Sonderzustand-Banner

Wenn besondere Zustände aktiv sind, erscheinen farbige Banner:

- ☀️ **Sommerautomatik aktiv** – Heizung gesperrt (gelb)
- 🌙 **Nachtabsenkung aktiv** – Temperaturen reduziert (blau)
- 🚶 **Anwesenheits-Abwesend** – niemand zuhause (orange)
- 🌞 **Solarüberschuss** – Zieltemperatur angehoben (gelb)
- 💶 **Hoher Strompreis** – Eco-Modus aktiv (rot)

### Raumkarten

Jedes Zimmer hat eine eigene Karte mit:

- **Name** + Statusbadge (Heizt / OK / Fenster offen / Boost / Eco / Abwesend / Aus)
- **Temperaturen**: Ist → Soll (große Anzeige)
- **Anforderungsbalken**: farbkodiert (grün–gelb–orange–rot)
- **Quelle**: woher die Zieltemperatur stammt (Zeitplan / Heizkurve / Preset / etc.)
- **Nachtabsenkung**: „🌙 -2°" wenn aktiv
- **Modus-Chips**: Schnellauswahl Auto / Komfort / Eco / Schlafen / Abwesend / Aus
- **Boost-Button**: ⚡ aktiviert 60-Minuten-Komfortmodus
- **Laufzeit** und **Ø Aufheizzeit** (unten links/rechts)
- **Sparkline**: Mini-Temperaturverlauf der letzten Stunden

**Rahmenfarbe der Karte:**
- 🔴 Rot – Zimmer heizt gerade
- 🟢 Grün – Zimmer ist zufrieden (Zieltemp. erreicht)
- 🔵 Blau – Fenster offen
- Grau – Zimmer ausgeschaltet

---

## Tab: Zimmer

Verwaltung aller konfigurierten Zimmer.

### Zimmer hinzufügen

Klick auf **+ Zimmer hinzufügen** öffnet ein Modal mit:

- **Zimmername** (Pflichtfeld)
- **Temperatursensor** – mit Autocomplete (tippt man `sensor.` erscheinen Vorschläge)
- **Thermostate/TRVs** – mehrere möglich, `+` für weitere Zeilen, mit Autocomplete
- **Fenstersensoren** – mehrere möglich, `+` für weitere Zeilen, mit Autocomplete
- **Temperatur-Presets**: Komfort, Eco, Schlafen, Abwesend
- **Erweitert**: Zimmer-Offset, Totband, Gewichtung

### Zimmer bearbeiten

Klick auf **Bearbeiten** öffnet das Edit-Modal mit allen aktuellen Werten vorausgefüllt:
- Alle Thermostate und Fenstersensoren werden angezeigt
- Alle Presets und erweiterten Einstellungen sind editierbar
- **Schnell-Boost**: Boost-Dauer eingeben und direkt aktivieren
- **💾 Speichern** übernimmt alle Änderungen

### Zimmer löschen

**🗑** → Bestätigungs-Dialog → Zimmer und alle Entitäten werden entfernt.

---

## Tab: Einstellungen

Alle globalen Parameter auf einen Blick.

### Betriebsmodus

System-Modus manuell setzen (Dropdown + „Setzen"-Button).

### Temperaturen & Sommerautomatik

- Abwesend-Temperatur (System-Abwesend)
- Urlaubs-Temperatur
- Frostschutz-Temperatur
- Sommerautomatik: Ein/Aus + Schwellenwert

### Nachtabsenkung & Vorheizen

- Nachtabsenkung: Ein/Aus + Absenkung in °C
- Vorheiz-Vorlaufzeit in Minuten

### Klimabaustein

- Einschaltschwelle (%)
- Hysterese (%)
- Mindest-Einschaltzeit (min)
- Mindest-Ausschaltzeit (min)
- Mindestanzahl Zimmer

### Anwesenheitserkennung

Checkboxen für alle verfügbaren `person.*`, `device_tracker.*` und `input_boolean.*` Entities.

### Energie & Solar

- Kesselleistung (kW)
- Vorlauftemperatur-Entity
- Solar-Sensor + Schwellenwert + Boost
- Strompreis-Sensor + Schwellenwert + Eco-Absenkung

### Energie-Statistik heute

Zeigt Heizlaufzeit, Verbrauch, aktuelle Solar-Leistung und Strompreis (wenn konfiguriert).

### Backup & Restore

Export der kompletten Konfiguration als JSON in einer HA-Persistent-Notification.

---

## Tab: Zeitpläne

Wöchentliche Zeitpläne pro Zimmer bearbeiten.

### Zimmer auswählen

Tabs oben wählen das Zimmer. Jedes Zimmer hat eigene Zeitpläne.

### Tagesgruppen

- Mehrere Tagesgruppen möglich (z.B. „Mo–Fr" und „Sa–So")
- Tage per Klick auf die Wochentags-Chips auswählen/abwählen
- **+ Gruppe hinzufügen** für weitere Tagesgruppen

### Zeiträume

Pro Gruppe: beliebig viele Zeiträume:

| Spalte | Beschreibung |
|--------|-------------|
| Von | Startzeit (HH:MM) |
| Bis | Endzeit (HH:MM) |
| Temp °C | Zieltemperatur in diesem Zeitraum |
| Offset | Zusätzlicher Offset (±3°C) |
| ✕ | Zeitraum löschen |

> Übernacht-Zeiträume (z.B. 22:00–06:00) sind möglich.

### Speichern

**💾 Zeitpläne speichern** speichert die Zeitpläne des aktuell ausgewählten Zimmers.

> **Hinweis:** Zeitpläne werden zimmerweise gespeichert. Das Wechseln zu einem anderen Zimmer-Tab **verliert ungespeicherte Änderungen**.

---

## Tab: Heizkurve

Grafischer Editor für die Außentemperatur-Heizkurve.

### Tabelle

Jede Zeile: Außentemperatur → Zieltemperatur. Mindestens 2 Punkte erforderlich.

- **+ Punkt** fügt eine neue Zeile hinzu
- **✕** löscht eine Zeile
- Beim Eingeben wird die Vorschau live aktualisiert

### Canvas-Vorschau

- Farbverlauf-Linie (rot = hoch, grün = niedrig)
- Datenpunkte als rote Kreise
- **Blauer gestrichelter Marker**: aktuelle Außentemperatur

### Speichern

**💾 Heizkurve speichern** – speichert direkt in die Integration. Kein Neustart nötig.

---

## Technische Details

### Warum kein Auto-Refresh in anderen Tabs?

HA sendet State-Updates sehr häufig (mehrmals pro Sekunde). Würde das Panel bei jedem Update neu rendern, würden DOM-Elemente während Klicks ersetzt und Buttons wären unbenutzbar.

**Lösung:**
- Nur der Übersicht-Tab refreshed automatisch (alle 5 s, pausiert während User interagiert)
- Alle anderen Tabs rendern nur beim Tab-Wechsel
- Modals leben in einem separaten `#modal-root` Container und überleben Tab-Wechsel

### Entity-Autocomplete

Alle Text-Inputs für Entity-IDs nutzen `<datalist>` mit allen passenden HA-Entitäten:
- Temperatursensor: alle `sensor.*`
- Thermostate/TRVs: alle `climate.*`
- Fenstersensoren: alle `binary_sensor.*`

Beim Tippen filtert der Browser automatisch die Vorschläge.

### Fehlerbehandlung

Alle Service-Calls sind in try/catch gewrappt. Fehler erscheinen als Toast-Benachrichtigung am unteren Bildschirmrand.
