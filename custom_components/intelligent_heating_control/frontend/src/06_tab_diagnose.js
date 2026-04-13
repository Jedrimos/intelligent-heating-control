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
      a.startup_grace_active    ? {icon:"⏳", label:`Startup-Gnadenfrist · Sensoren werden geladen`, cls:"warn"} : null,
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

    // ETA preheat section (only when enabled)
    const etaSection = (() => {
      if (!a.eta_preheat_enabled) return "";
      const presEntities = a.presence_entities || [];
      const isActive = g.eta_preheat_minutes != null && g.eta_preheat_minutes <= 90;

      // Read ETA from presence entity attributes directly
      const etaRows = presEntities.map(eid => {
        const st = this._hass?.states[eid];
        const name = st?.attributes?.friendly_name || eid;
        const arrStr = st?.attributes?.estimated_arrival_time;
        if (!arrStr) return { name, eid, mins: null, time: null };
        const arrival = new Date(arrStr);
        const mins = Math.round((arrival - new Date()) / 60000);
        if (mins < 0 || mins > 120) return { name, eid, mins: null, time: null };
        const time = arrival.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
        return { name, eid, mins, time };
      });

      const preheatingRooms = roomList.filter(r => r.source === "preheat");

      const rowsHtml = etaRows.map(r => `
        <tr>
          <td style="padding:5px 8px;border-bottom:1px solid var(--divider-color);font-weight:500">${r.name}</td>
          <td style="padding:5px 8px;border-bottom:1px solid var(--divider-color)">
            ${r.time ? r.time + " Uhr" : `<span style="color:var(--secondary-text-color)">keine ETA</span>`}
          </td>
          <td style="padding:5px 8px;border-bottom:1px solid var(--divider-color)">
            ${r.mins != null
              ? `<span style="font-weight:700;color:${r.mins <= 30 ? "#e53935" : r.mins <= 60 ? "#fb8c00" : "#43a047"}">~${r.mins} min</span>`
              : `<span style="color:var(--secondary-text-color);font-size:11px">außerhalb Fenster (0–120 min)</span>`}
          </td>
        </tr>`).join("");

      return `
      <details class="ihc-card" ${isActive ? "open" : ""}>
        <summary>
          <span class="ihc-card-title">🕒 ETA-Vorheizen
            ${isActive
              ? activeBadge(`Ankunft ~${Math.round(g.eta_preheat_minutes)} min`, "info")
              : ""}
          </span>
        </summary>
        <div class="ihc-card-body">
          <p style="font-size:12px;color:var(--secondary-text-color);margin:0 0 10px">
            Liest <code>estimated_arrival_time</code> aus den konfigurierten Anwesenheits-Entitäten.
            Benötigt <em>Google Maps Travel Time</em> oder <em>Waze Travel Time</em> in HA.
            IHC startet das Vorheizen wenn eine Ankunft ≤ 90 min bevorsteht.
          </p>
          ${etaRows.length ? `
          <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:14px">
            <thead>
              <tr style="color:var(--secondary-text-color);font-size:11px;text-transform:uppercase">
                <th style="text-align:left;padding:5px 8px;border-bottom:2px solid var(--divider-color)">Person</th>
                <th style="text-align:left;padding:5px 8px;border-bottom:2px solid var(--divider-color)">Ankunft</th>
                <th style="text-align:left;padding:5px 8px;border-bottom:2px solid var(--divider-color)">In Minuten</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>` : `
          <div style="color:var(--secondary-text-color);font-size:13px;margin-bottom:12px">
            Keine Person-Entitäten konfiguriert (→ Einstellungen → Anwesenheitserkennung).
          </div>`}
          ${preheatingRooms.length ? `
          <div style="font-size:12px;font-weight:600;margin-bottom:6px">🔥 Zimmer werden vorgeheizt:</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${preheatingRooms.map(r =>
              `<span style="background:color-mix(in srgb,#ef5350 15%,transparent);padding:3px 10px;border-radius:12px;font-size:12px">
                ⏱ ${r.name} → ${r.target_temp != null ? r.target_temp + " °C" : "—"}
              </span>`).join("")}
          </div>` : `
          <div style="font-size:12px;color:var(--secondary-text-color)">
            ℹ️ Kein Zimmer wird aktuell vorgeheizt.
            ${!isActive ? " Vorheizen startet sobald eine Ankunft ≤ 90 min erkannt wird." : ""}
          </div>`}
        </div>
      </details>`;
    })();

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
          ${r.co2_ventilation_eta_minutes != null && r.co2_ventilation_eta_minutes <= 30
            ? `<div><span style="font-size:10px;padding:1px 4px;border-radius:6px;background:${r.co2_ventilation_eta_minutes <= 5 ? 'color-mix(in srgb,#ef5350 20%,transparent)' : 'color-mix(in srgb,#fb8c00 20%,transparent)'};color:var(--primary-text-color)" title="Geschätzte Zeit bis CO₂-Grenzwert">💨 ${r.co2_ventilation_eta_minutes <= 0 ? 'Jetzt!' : r.co2_ventilation_eta_minutes.toFixed(0) + ' min'}</span></div>`
            : ""}
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

      ${etaSection}

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

    // ── v1.8 Energiepreis-Forecast Chart (Tibber/Nordpool) ────────────────────
    if (g.price_forecast && g.price_forecast.length > 0) {
      const prices = g.price_forecast;
      const currentHour = new Date().getHours();
      const maxP = Math.max(...prices);
      const minP = Math.min(...prices);
      const avgP = prices.reduce((a, b) => a + b, 0) / prices.length;
      const rangeP = maxP - minP || 0.01;
      const W = 560, H = 120, padL = 40, padR = 8, padT = 10, padB = 24;
      const barW = (W - padL - padR) / prices.length;
      const bars = prices.map((p, i) => {
        const barH = Math.max(2, ((p - minP) / rangeP) * (H - padT - padB));
        const y = padT + (H - padT - padB) - barH;
        const isCurrent = i === currentHour;
        const color = p > avgP * 1.3 ? "#ef5350" : p < avgP * 0.7 ? "#66bb6a" : "#fb8c00";
        const highlight = isCurrent ? `stroke="white" stroke-width="2"` : "";
        return `<rect x="${(padL + i * barW + 1).toFixed(1)}" y="${y.toFixed(1)}" width="${(barW - 2).toFixed(1)}" height="${barH.toFixed(1)}"
          fill="${color}" ${highlight} rx="2" opacity="${isCurrent ? 1 : 0.7}"
          title="${i}:00 – ${p.toFixed(3)} €/kWh"/>`;
      }).join("");
      const avgY = padT + (H - padT - padB) - ((avgP - minP) / rangeP) * (H - padT - padB);
      const xLabels = [0, 6, 12, 18, 23].map(i =>
        `<text x="${(padL + i * barW + barW / 2).toFixed(1)}" y="${H - padB + 14}" text-anchor="middle" font-size="9" fill="var(--secondary-text-color)">${i}:00</text>`
      ).join("");
      const priceCard = document.createElement("details");
      priceCard.className = "ihc-card";
      priceCard.open = true;
      priceCard.innerHTML = `
        <summary><span class="ihc-card-title">💶 Energiepreis-Verlauf (heute)</span></summary>
        <div class="ihc-card-body">
          <div style="font-size:12px;color:var(--secondary-text-color);margin-bottom:8px">
            Aktuell: <strong>${prices[currentHour] != null ? prices[currentHour].toFixed(3) + ' €/kWh' : '—'}</strong>
            · Ø: ${avgP.toFixed(3)} €/kWh
            · <span style="color:#ef5350">■</span> teuer &gt;130%
            · <span style="color:#fb8c00">■</span> normal
            · <span style="color:#66bb6a">■</span> günstig &lt;70%
          </div>
          <div style="overflow-x:auto">
            <svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;height:${H}px">
              ${bars}
              <line x1="${padL}" y1="${avgY.toFixed(1)}" x2="${W - padR}" y2="${avgY.toFixed(1)}"
                stroke="var(--secondary-text-color)" stroke-width="1" stroke-dasharray="4,3" opacity="0.6"/>
              <text x="${padL - 4}" y="${(avgY + 4).toFixed(1)}" font-size="8" text-anchor="end" fill="var(--secondary-text-color)">Ø</text>
              ${xLabels}
            </svg>
          </div>
        </div>`;
      content.appendChild(priceCard);
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

  // ── Analyse Tab (Heatmap + Lernkurve, kein Auto-Refresh) ──────────────────

  _renderAnalyse(content) {
    const rooms    = this._getRoomData();
    const roomList = Object.values(rooms);

    if (roomList.length === 0) {
      content.innerHTML = `<div class="info-box" style="margin-top:16px">Keine Zimmer konfiguriert.</div>`;
      return;
    }

    // Ensure selected room is valid; fall back to first room
    if (!this._analyseRoom || !rooms[this._analyseRoom]) {
      this._analyseRoom = roomList[0].entity_id;
    }
    const room = rooms[this._analyseRoom];

    // ── Room selector pills ──────────────────────────────────────────────────
    const selector = document.createElement("div");
    selector.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;padding:12px 0 4px";
    selector.innerHTML = roomList.map(r => {
      const active = r.entity_id === this._analyseRoom;
      return `<button class="sysmode-pill${active ? " active-auto" : ""}" data-room="${r.entity_id}">${r.name}</button>`;
    }).join("");
    content.appendChild(selector);
    selector.querySelectorAll("[data-room]").forEach(btn =>
      btn.addEventListener("click", () => {
        this._analyseRoom = btn.dataset.room;
        this._renderAnalyse(content);
      })
    );

    // ── Heatmap card ─────────────────────────────────────────────────────────
    const hmCard = document.createElement("div");
    hmCard.className = "card";
    hmCard.style.marginTop = "12px";
    if (room.demand_heatmap && room.demand_heatmap.length === 7) {
      hmCard.innerHTML = `
        <div class="card-title">🔥 Anforderungs-Heatmap – ${room.name}</div>
        <div class="card-subtitle">
          Gleitender Durchschnitt (EMA) der Heizanforderung nach Wochentag und Uhrzeit.
          Wird über mehrere Wochen gelernt. Blau = niedrige, Rot = hohe Anforderung.
        </div>
        <div id="hm-analyse-grid"></div>`;
      content.appendChild(hmCard);
      hmCard.querySelector("#hm-analyse-grid").innerHTML =
        this._renderDemandHeatmapGrid(room.demand_heatmap);
    } else {
      hmCard.innerHTML = `
        <div class="card-title">🔥 Anforderungs-Heatmap – ${room.name}</div>
        <div style="color:var(--secondary-text-color);font-size:13px;padding:4px 0 8px">
          IHC sammelt Heatmap-Daten automatisch über mehrere Wochen. Noch keine Daten vorhanden.
        </div>`;
      content.appendChild(hmCard);
    }

    // ── Optimum Start – Lernkurve ────────────────────────────────────────────
    const warmupCurve  = room.warmup_curve  || [];
    const avgWarmupMin = room.avg_warmup_minutes;
    const learnedMin   = room.learned_preheat_minutes;
    const coolingRate  = room.avg_cooling_rate;

    const learnCard = document.createElement("div");
    learnCard.className = "card";
    learnCard.style.marginTop = "0";   // card already has margin-bottom

    const warmupRows = warmupCurve.map(pt => `
      <tr>
        <td style="padding:5px 12px;text-align:right">${pt.outdoor_temp > 0 ? "+" : ""}${pt.outdoor_temp} °C</td>
        <td style="padding:5px 12px;text-align:right;font-weight:600;color:var(--primary-color)">${pt.avg_minutes.toFixed(0)} min</td>
        <td style="padding:5px 12px;text-align:right;color:var(--secondary-text-color)">${pt.samples}×</td>
      </tr>`).join("");

    learnCard.innerHTML = `
      <div class="card-title">🧠 Optimum Start – Lernkurve</div>
      <div class="card-subtitle">
        IHC misst wie lange ${room.name} zum Aufheizen braucht und passt die Vorheizzeit automatisch an.
        Je mehr Daten gesammelt werden, desto präziser die Vorhersage.
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:20px;margin-bottom:${warmupCurve.length > 0 ? "16px" : "0"}">
        ${avgWarmupMin != null ? `
          <div style="min-width:140px">
            <div style="font-size:11px;color:var(--secondary-text-color);margin-bottom:2px">Ø Aufheizzeit</div>
            <div style="font-size:22px;font-weight:700;color:var(--primary-color)">${avgWarmupMin.toFixed(0)} min</div>
            <div style="font-size:11px;color:var(--secondary-text-color)">ohne AT-Korrektur</div>
          </div>` : `
          <div style="color:var(--secondary-text-color);font-size:13px">
            Noch keine Aufheizzeit-Daten gesammelt.
          </div>`}
        ${learnedMin != null ? `
          <div style="min-width:140px">
            <div style="font-size:11px;color:var(--secondary-text-color);margin-bottom:2px">AT-korrigierte Vorheizzeit</div>
            <div style="font-size:22px;font-weight:700;color:var(--primary-color)">${learnedMin.toFixed(0)} min</div>
            <div style="font-size:11px;color:var(--secondary-text-color)">aktuell berechnet</div>
          </div>` : ""}
        ${coolingRate != null ? `
          <div style="min-width:140px">
            <div style="font-size:11px;color:var(--secondary-text-color);margin-bottom:2px">Abkühlrate</div>
            <div style="font-size:22px;font-weight:700;color:#42a5f5">${coolingRate.toFixed(3)}</div>
            <div style="font-size:11px;color:var(--secondary-text-color)">°C/h je °C Δ innen/außen</div>
          </div>` : ""}
      </div>
      ${warmupCurve.length > 0 ? `
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="border-bottom:2px solid var(--divider-color)">
              <th style="text-align:right;padding:5px 12px;font-weight:600;color:var(--secondary-text-color)">Außentemperatur</th>
              <th style="text-align:right;padding:5px 12px;font-weight:600;color:var(--secondary-text-color)">Ø Aufheizzeit</th>
              <th style="text-align:right;padding:5px 12px;font-weight:600;color:var(--secondary-text-color)">Messungen</th>
            </tr>
          </thead>
          <tbody>${warmupRows}</tbody>
        </table>` : ""}`;
    content.appendChild(learnCard);

    // ── Optimum Stop status ──────────────────────────────────────────────────
    if (room.optimum_stop_active) {
      const stopCard = document.createElement("div");
      stopCard.className = "card";
      stopCard.style.marginTop = "0";
      stopCard.innerHTML = `
        <div class="card-title">⏹ Optimum Stop aktiv</div>
        <div style="display:flex;flex-wrap:wrap;gap:20px">
          ${room.optimum_stop_minutes != null ? `
            <div>
              <div style="font-size:11px;color:var(--secondary-text-color)">Frühzeitige Abschaltung</div>
              <div style="font-size:20px;font-weight:700;color:#ffa726">${room.optimum_stop_minutes.toFixed(0)} min</div>
              <div style="font-size:11px;color:var(--secondary-text-color)">vor Zeitplan-Ende</div>
            </div>` : ""}
          ${room.optimum_stop_predicted != null ? `
            <div>
              <div style="font-size:11px;color:var(--secondary-text-color)">Vorhergesagte Temp. bei Plan-Ende</div>
              <div style="font-size:20px;font-weight:700;color:#ffa726">${room.optimum_stop_predicted.toFixed(1)} °C</div>
            </div>` : ""}
        </div>`;
      content.appendChild(stopCard);
    }
  }

  // ── Einstellungen Tab ──────────────────────────────────────────────────────
