/**
 * 06_tab_diagnose.js
 * IHC Frontend – Diagnose / Übersicht Tab
 * Contains: _renderDiagnose
 */
  // ── Übersicht (Diagnose) Tab ────────────────────────────────────────────────

  _renderDiagnose(content) {
    const g   = this._getGlobal();
    const dem = this._st("sensor.ihc_gesamtanforderung") || { attributes: {} };
    const a   = dem.attributes;
    const systemSel = this._st("select.ihc_systemmodus");
    const curMode   = systemSel ? systemSel.state : "auto";
    const rooms = this._getRoomData();
    const roomList = Object.values(rooms);

    const activeBadge = (label, cls = "") => `<span class="ihc-card-badge ${cls}">${label}</span>`;
    const fmt = (v, unit = "—") => (v !== null && v !== undefined && !isNaN(v)) ? `${v}${unit}` : "—";

    // Active flags
    const flags = [
      g.heating_active          ? {icon:"🔥", label:"Heizung aktiv",    cls:"warn"} : null,
      g.night_setback_active    ? {icon:"🌙", label:"Nachtabsenkung",    cls:""} : null,
      g.summer_mode             ? {icon:"☀️", label:"Sommer-Modus",      cls:"warn"} : null,
      g.presence_away_active    ? {icon:"🚶", label:"Anwesenheit: Abwesend", cls:"warn"} : null,
      g.guest_mode_active       ? {icon:"🎉", label:`Gäste-Modus${g.guest_remaining_minutes != null ? " · " + g.guest_remaining_minutes + "min" : ""}`, cls:"info"} : null,
      g.vacation_auto_active    ? {icon:"✈️", label:"Urlaubs-Modus",      cls:"info"} : null,
      g.return_preheat_active   ? {icon:"🏠", label:"Rückkehr-Vorheizen", cls:"info"} : null,
      g.solar_boost > 0         ? {icon:"⚡", label:`Solar-Boost +${g.solar_boost}°`, cls:"info"} : null,
      g.energy_price_eco_active ? {icon:"💶", label:"Preis-Eco aktiv",   cls:"warn"} : null,
      g.cold_boost > 0          ? {icon:"❄️", label:`Kälte-Boost +${g.cold_boost}°`, cls:""} : null,
      (g.eta_preheat_minutes != null && g.eta_preheat_minutes <= 90) ? {icon:"🕒", label:`ETA ${Math.round(g.eta_preheat_minutes)} min`, cls:"info"} : null,
      (g.adaptive_curve_delta && Math.abs(g.adaptive_curve_delta) >= 0.1) ? {icon:"📈", label:`Kurve ${g.adaptive_curve_delta > 0 ? "+" : ""}${g.adaptive_curve_delta.toFixed(1)}°`, cls:""} : null,
    ].filter(Boolean);

    const flagsHtml = flags.length
      ? flags.map(f => `<span class="ihc-card-badge ${f.cls}" style="font-size:13px;padding:5px 12px">${f.icon} ${f.label}</span>`).join("")
      : `<span style="color:var(--secondary-text-color);font-size:13px">Keine aktiven Übersteuerungen</span>`;

    // Room status table
    const fmtT = v => (v != null && !isNaN(v)) ? parseFloat(v).toFixed(1) + " °C" : "—";
    // Check if any room has TRV or humidity data → show extra columns
    const hasTrvData = roomList.some(r => r.trv_raw_temp != null || (r.trv_avg_valve != null && r.trv_avg_valve > 0));
    const hasHumidity = roomList.some(r => r.trv_humidity != null || (r.mold && r.mold.humidity != null));
    const hasCo2 = roomList.some(r => r.co2_ppm > 0);
    const hasRuntime = roomList.some(r => r.runtime_today_minutes > 0);

    const roomRows = roomList.map(r => {
      const demColor = this._demandColor(r.demand);
      const modeLabel = MODE_ICONS[r.room_mode] + " " + (MODE_LABELS[r.room_mode] || r.room_mode);
      // Show effective target temp for current mode
      let effTemp = null;
      if (r.room_mode === "comfort") effTemp = r.comfort_temp_eff;
      else if (r.room_mode === "eco")     effTemp = r.eco_temp_eff;
      else if (r.room_mode === "sleep")   effTemp = r.sleep_temp_eff;
      else if (r.room_mode === "away")    effTemp = r.away_temp_eff;
      const effHtml = effTemp != null ? `<span style="font-size:10px;color:var(--secondary-text-color);margin-left:2px">(→${parseFloat(effTemp).toFixed(1)})</span>` : "";

      // Humidity from TRV or mold data
      const humidity = r.trv_humidity != null ? r.trv_humidity : (r.mold?.humidity ?? null);
      const moldRisk = r.mold && r.mold.risk;

      // Status cell: window, boost, anomaly, mold, CO2
      const statusParts = [];
      if (r.window_open)        statusParts.push("🪟 Fenster");
      if (r.boost_remaining > 0) statusParts.push(`⚡ Boost ${r.boost_remaining}min`);
      if (r.anomaly === "sensor_stuck") statusParts.push("⚠️ Sensor hängt");
      if (r.anomaly === "temp_drop")    statusParts.push("⚠️ Temp-Abfall");
      if (moldRisk)             statusParts.push(`💧 Schimmel!`);
      if (r.ventilation?.level === "urgent") statusParts.push("🪟❗ Lüften");

      return `<tr>
        <td style="font-weight:500;padding:6px 8px;border-bottom:1px solid var(--divider-color)">${r.name}</td>
        <td style="padding:6px 8px;border-bottom:1px solid var(--divider-color)">
          <div style="font-size:13px">${r.current_temp != null ? r.current_temp + " °C" : "—"}</div>
          ${r.trv_raw_temp != null && hasTrvData ? `<div style="font-size:10px;color:#e65100;margin-top:1px" title="TRV-Rohtemperatur">TRV: ${parseFloat(r.trv_raw_temp).toFixed(1)}°</div>` : ""}
        </td>
        <td style="padding:6px 8px;border-bottom:1px solid var(--divider-color)">${r.source === "system_off" ? "Aus" : (r.target_temp != null ? r.target_temp + " °C" : "—")}${effHtml}</td>
        <td style="padding:6px 8px;border-bottom:1px solid var(--divider-color)">
          <div style="display:flex;align-items:center;gap:6px">
            <div style="width:40px;height:7px;border-radius:4px;background:var(--divider-color)">
              <div style="width:${Math.min(r.demand,100)}%;height:100%;border-radius:4px;background:${demColor}"></div>
            </div>
            <span style="font-size:12px;color:${demColor};font-weight:600">${r.demand}%</span>
          </div>
          ${r.trv_avg_valve > 0 && hasTrvData ? `<div style="font-size:10px;color:#1565c0;margin-top:2px" title="Durchschn. Ventilöffnung">Ventil: ${Math.round(r.trv_avg_valve)}%</div>` : ""}
        </td>
        ${hasHumidity ? `<td style="padding:6px 8px;border-bottom:1px solid var(--divider-color);font-size:12px">
          ${humidity != null ? `<span style="${moldRisk ? "color:#c62828;font-weight:600" : "color:var(--secondary-text-color)"}" title="${moldRisk ? "⚠️ Schimmelrisiko!" : "Luftfeuchtigkeit"}">💧 ${Math.round(humidity)}%</span>` : "—"}
        </td>` : ""}
        ${hasCo2 ? `<td style="padding:6px 8px;border-bottom:1px solid var(--divider-color);font-size:12px">
          ${r.co2_ppm > 0 ? `<span style="color:${r.co2_ppm > (r.co2_threshold_bad || 1200) ? "#c62828" : r.co2_ppm > (r.co2_threshold_good || 800) ? "#fb8c00" : "#43a047"}" title="CO₂-Konzentration">🌬️ ${r.co2_ppm}</span>` : "—"}
        </td>` : ""}
        <td style="font-size:12px;padding:6px 8px;border-bottom:1px solid var(--divider-color)">${modeLabel}</td>
        <td style="font-size:12px;padding:6px 8px;border-bottom:1px solid var(--divider-color);color:var(--secondary-text-color)">${statusParts.length ? statusParts.join(" · ") : ""}</td>
        ${hasRuntime ? `<td style="font-size:11px;padding:6px 8px;border-bottom:1px solid var(--divider-color);color:var(--secondary-text-color)">${r.runtime_today_minutes > 0 ? `⏱ ${r.runtime_today_minutes} min` : ""}</td>` : ""}
      </tr>`;
    }).join("");

    content.innerHTML = `
      <!-- ── Systemmodus & Schnellsteuerung ────────────────── -->
      <details class="ihc-card" open>
        <summary>
          <span class="ihc-card-title">🏠 Betriebsmodus</span>
        </summary>
        <div class="ihc-card-body">
          <div class="form-group">
            <label class="form-label">System-Modus manuell setzen</label>
            <div class="form-row">
              <select class="form-select" id="diag-system-mode-select">
                ${Object.entries(SYSTEM_MODE_LABELS)
                  .filter(([k]) => k !== "cool" || a.enable_cooling)
                  .map(([k, v]) => `<option value="${k}" ${curMode === k || curMode === v ? "selected" : ""}>${v}</option>`)
                  .join("")}
              </select>
              <button class="btn btn-primary" id="diag-set-system-mode">Setzen</button>
            </div>
          </div>
        </div>
      </details>

      <!-- ── Aktive Zustände ─────────────────────────────────── -->
      <details class="ihc-card" open>
        <summary>
          <span class="ihc-card-title">🔔 Aktive Zustände &amp; Overrides</span>
        </summary>
        <div class="ihc-card-body">
          <div style="display:flex;flex-wrap:wrap;gap:8px;padding:4px 0">
            ${flagsHtml}
          </div>
          ${g.guest_mode_active ? `
          <div style="margin-top:10px">
            <button class="btn btn-secondary" id="diag-deactivate-guest">✕ Gäste-Modus beenden</button>
          </div>` : ""}
        </div>
      </details>

      <!-- ── Messwerte ───────────────────────────────────────── -->
      <details class="ihc-card" open>
        <summary>
          <span class="ihc-card-title">📡 Aktuelle Messwerte</span>
        </summary>
        <div class="ihc-card-body">
          <div class="settings-grid">
            <div class="settings-item">
              <label>Außentemperatur</label>
              <div style="font-size:22px;font-weight:700;color:var(--primary-color)">${fmt(g.outdoor_temp, " °C")}</div>
            </div>
            <div class="settings-item">
              <label>Gesamtanforderung</label>
              <div style="font-size:22px;font-weight:700;color:${this._demandColor(g.total_demand ?? 0)}">${fmt(g.total_demand, " %")}</div>
            </div>
            <div class="settings-item">
              <label>Zimmer mit Anforderung</label>
              <div style="font-size:22px;font-weight:700;color:var(--primary-color)">${g.rooms_demanding}</div>
            </div>
            ${g.curve_target != null ? `
            <div class="settings-item">
              <label>Heizkurve Zieltemperatur</label>
              <div style="font-size:22px;font-weight:700;color:var(--primary-color)">${g.curve_target.toFixed(1)} °C</div>
            </div>` : ""}
            ${g.solar_power != null ? `
            <div class="settings-item">
              <label>Solarleistung</label>
              <div style="font-size:22px;font-weight:700;color:#f9a825">${g.solar_power} W</div>
            </div>` : ""}
            ${g.energy_price != null ? `
            <div class="settings-item">
              <label>Aktueller Energiepreis</label>
              <div style="font-size:22px;font-weight:700;color:${g.energy_price_eco_active ? "#c62828" : "#43a047"}">${g.energy_price.toFixed(3)} €/kWh</div>
            </div>` : ""}
            ${g.flow_temp != null ? `
            <div class="settings-item">
              <label>Vorlauftemperatur</label>
              <div style="font-size:22px;font-weight:700;color:var(--primary-color)">${g.flow_temp.toFixed(1)} °C</div>
            </div>` : ""}
            ${g.outdoor_humidity != null ? `
            <div class="settings-item">
              <label>Außenluftfeuchtigkeit</label>
              <div style="font-size:22px;font-weight:700;color:var(--primary-color)">${g.outdoor_humidity.toFixed(0)} %</div>
            </div>` : ""}
          </div>
        </div>
      </details>

      <!-- ── Heute & Gestern ────────────────────────────────── -->
      <details class="ihc-card" open>
        <summary>
          <span class="ihc-card-title">📊 Energie &amp; Laufzeit</span>
        </summary>
        <div class="ihc-card-body">
          <div class="settings-grid">
            <div class="settings-item">
              <label>Heizlaufzeit heute</label>
              <div style="font-size:22px;font-weight:700;color:var(--primary-color)">${g.heating_runtime_today} min</div>
            </div>
            <div class="settings-item">
              <label>Energie heute</label>
              <div style="font-size:22px;font-weight:700;color:var(--primary-color)">${this._kwh(g.energy_today_kwh)} kWh</div>
            </div>
            ${g.heating_runtime_yesterday > 0 ? `
            <div class="settings-item">
              <label>Laufzeit gestern</label>
              <div style="font-size:18px;font-weight:600;color:var(--secondary-text-color)">${g.heating_runtime_yesterday} min</div>
            </div>` : ""}
            ${g.energy_yesterday_kwh > 0 ? `
            <div class="settings-item">
              <label>Energie gestern</label>
              <div style="font-size:18px;font-weight:600;color:var(--secondary-text-color)">${this._kwh(g.energy_yesterday_kwh)} kWh</div>
            </div>` : ""}
            ${g.efficiency_score != null ? `
            <div class="settings-item">
              <label>Effizienz-Score</label>
              <div style="font-size:22px;font-weight:700;color:${g.efficiency_score >= 80 ? "#43a047" : g.efficiency_score >= 60 ? "#fb8c00" : "#e53935"}">${g.efficiency_score.toFixed(0)} / 100</div>
            </div>` : ""}
          </div>
          <div class="btn-row" style="margin-top:12px">
            <button class="btn btn-secondary" id="diag-reset-stats">🗑 Statistik zurücksetzen</button>
          </div>
        </div>
      </details>

      <!-- ── Zimmer-Status Tabelle ───────────────────────────── -->
      ${roomList.length ? `
      <details class="ihc-card" open>
        <summary>
          <span class="ihc-card-title">🚪 Zimmer-Status</span>
        </summary>
        <div class="ihc-card-body" style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
              <tr style="color:var(--secondary-text-color);font-size:11px;text-transform:uppercase">
                <th style="text-align:left;padding:6px 8px;border-bottom:2px solid var(--divider-color)">Zimmer</th>
                <th style="text-align:left;padding:6px 8px;border-bottom:2px solid var(--divider-color)">Ist °C</th>
                <th style="text-align:left;padding:6px 8px;border-bottom:2px solid var(--divider-color)">Soll °C</th>
                <th style="text-align:left;padding:6px 8px;border-bottom:2px solid var(--divider-color)">Anforderung</th>
                ${hasHumidity ? `<th style="text-align:left;padding:6px 8px;border-bottom:2px solid var(--divider-color)">Feuchte</th>` : ""}
                ${hasCo2 ? `<th style="text-align:left;padding:6px 8px;border-bottom:2px solid var(--divider-color)">CO₂ ppm</th>` : ""}
                <th style="text-align:left;padding:6px 8px;border-bottom:2px solid var(--divider-color)">Modus</th>
                <th style="text-align:left;padding:6px 8px;border-bottom:2px solid var(--divider-color)">Status</th>
                ${hasRuntime ? `<th style="text-align:left;padding:6px 8px;border-bottom:2px solid var(--divider-color)">Laufzeit</th>` : ""}
              </tr>
            </thead>
            <tbody>
              ${roomRows}
            </tbody>
          </table>
        </div>
      </details>` : ""}
    `;

    // ── v1.6 Anforderungs-Heatmap (alle Zimmer) ────────────────────────────
    const roomsWithHeatmap = roomList.filter(r => r.demand_heatmap && r.demand_heatmap.length === 7);
    if (roomsWithHeatmap.length > 0) {
      const heatmapCard = document.createElement("details");
      heatmapCard.className = "ihc-card";
      heatmapCard.innerHTML = `
        <summary><span class="ihc-card-title">🔥 Anforderungs-Heatmap</span></summary>
        <div class="ihc-card-body">
          <p style="font-size:12px;color:var(--secondary-text-color);margin:0 0 12px">
            Zeitbasiertes Heizprofil pro Zimmer – gleitender Durchschnitt (EMA) über mehrere Wochen.
            Blau = niedrige, Rot = hohe Anforderung.
          </p>
          ${roomsWithHeatmap.map(r =>
            `<div style="margin-bottom:16px">
              ${this._renderDemandHeatmapGrid(r.demand_heatmap, r.name)}
            </div>`
          ).join("")}
        </div>`;
      content.appendChild(heatmapCard);
    }

    const setSystemModeBtn = content.querySelector("#diag-set-system-mode");
    if (setSystemModeBtn) {
      setSystemModeBtn.addEventListener("click", () => {
        const mode = content.querySelector("#diag-system-mode-select").value;
        this._callService("set_system_mode", { mode });
        this._toast(`✓ Modus: ${SYSTEM_MODE_LABELS[mode] || mode}`);
      });
    }

    const deactivateGuest = content.querySelector("#diag-deactivate-guest");
    if (deactivateGuest) {
      deactivateGuest.addEventListener("click", () => {
        this._callService("deactivate_guest_mode", {});
        this._toast("✓ Gäste-Modus beendet");
      });
    }

    const resetStatsBtn = content.querySelector("#diag-reset-stats");
    if (resetStatsBtn) {
      resetStatsBtn.addEventListener("click", () => {
        this._showConfirmModal(
          "Statistik zurücksetzen?",
          "Laufzeit und Energiedaten für heute werden auf 0 gesetzt.",
          async () => {
            await this._callService("reset_stats", {});
            this._toast("✓ Statistik zurückgesetzt");
            setTimeout(() => this._renderTabContent(), 800);
          }
        );
      });
    }
  }

  // ── Einstellungen Tab ──────────────────────────────────────────────────────
