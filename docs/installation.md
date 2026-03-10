# Installation

## Voraussetzungen

- Home Assistant **2023.6** oder neuer
- [HACS](https://hacs.xyz/) (für die empfohlene Installation)
- Mindestens ein Außentemperatursensor als HA-Entity (`sensor.*`)
- Optional: Ein Switch/Input-Boolean zum Steuern des Heizkessels

---

## Via HACS (empfohlen)

1. HACS öffnen (Seitenleiste)
2. **Integrationen** → **⋮ (Menü)** → **Benutzerdefinierte Repositories**
3. URL eingeben: `https://github.com/Jedrimos/intelligent-heatingcontroll`
4. Kategorie: **Integration** → **Hinzufügen**
5. Suche nach **Intelligent Heating Control** → **Herunterladen**
6. Home Assistant **neu starten**
7. **Einstellungen → Integrationen → + Integration** → „Intelligent Heating Control" suchen

---

## Manuelle Installation

```bash
# 1. Repository klonen oder ZIP herunterladen
git clone https://github.com/Jedrimos/intelligent-heatingcontroll.git

# 2. Ordner kopieren
cp -r intelligent-heatingcontroll/custom_components/intelligent_heating_control \
      /pfad/zu/ha/config/custom_components/

# 3. Home Assistant neu starten
```

Danach: **Einstellungen → Integrationen → + Integration** → „Intelligent Heating Control"

---

## Update

### Via HACS
HACS zeigt verfügbare Updates automatisch an. Klicke auf **Aktualisieren**, dann HA neu starten.

### Manuell
Neuen `custom_components/intelligent_heating_control`-Ordner einfach überschreiben, dann HA neu starten.

---

## Deinstallation

1. **Einstellungen → Integrationen → IHC → ⋮ → Löschen**
2. HA neu starten
3. Optional: `custom_components/intelligent_heating_control` Ordner entfernen

> ⚠️ Das Löschen der Integration entfernt alle erstellten Entitäten. Die Konfiguration (Zimmer, Zeitpläne) wird aus dem HA-Config-Entry gelöscht.

---

## Fehlerbehebung bei der Installation

### Integration wird nicht gefunden
→ Prüfe ob der Ordner korrekt unter `config/custom_components/intelligent_heating_control/` liegt.
→ Prüfe ob `manifest.json` in diesem Ordner vorhanden ist.
→ Starte HA komplett neu (nicht nur ein Reload).

### Panel erscheint nicht in der Seitenleiste
→ Browsercache leeren (Strg+F5 / Cmd+Shift+R).
→ Prüfe HA-Logs auf Fehler mit dem Keyword `ihc_static`.

### Fehler beim Setup-Wizard
→ Stelle sicher dass der Außentemperatursensor verfügbar ist (nicht `unavailable`).
→ Überprüfe die HA-Logs unter **Einstellungen → System → Protokolle**.
