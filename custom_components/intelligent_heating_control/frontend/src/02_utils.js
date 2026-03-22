/**
 * 02_utils.js
 * IHC Frontend – Utility / Helper Methods
 * Contains: _st, _getRoomData, _getGlobal, _fmt, _demandColor, _sparkline,
 *           _callService, _kwh, _costStr, _toast,
 *           _entityOptions, _attachEntityPickers, _cleanupEntityPickers,
 *           _renderPresenceCheckboxes,
 *           _bindEntityListAdders, _makeHaSchedRow, _bindHaSchedAdder, _collectHaScheduleRows
 * These are all non-tab helper methods that belong to IHCPanel.
 */

// NOTE: These methods are defined on IHCPanel.prototype below the class body
// to keep this file self-contained as a logical fragment.
// When build.py concatenates the files, they are inserted INSIDE the class
// via the 09_main.js class body that uses Object.assign or prototype extension.
//
// ACTUALLY: build.py simply concatenates all files.  The class declaration in
// 09_main.js OPENS the class brace, and all method files (02-08) are placed
// BETWEEN the opening brace (in 09_main.js) and the closing brace + registration
// (also in 09_main.js).  This file is a raw JS fragment – NOT a standalone module.

  // ── Data Helpers ───────────────────────────────────────────────────────────

  _st(entityId) {
    return this._hass ? this._hass.states[entityId] : null;
  }

  _getRoomData() {
    if (!this._hass) return {};
    const rooms = {};
    Object.entries(this._hass.states).forEach(([entityId, state]) => {
      if (!entityId.startsWith("climate.ihc_")) return;
      const name = (state.attributes.friendly_name || entityId).replace(/^IHC\s*/i, "");
      rooms[entityId] = {
        entity_id: entityId,
        room_id: state.attributes.room_id || "",
        name,
        current_temp: state.attributes.current_temperature ?? null,
        target_temp: state.attributes.temperature ?? null,
        hvac_action: state.attributes.hvac_action || "",
        preset: state.attributes.preset_mode || "auto",
        demand: state.attributes.demand || 0,
        window_open: state.attributes.window_open || false,
        room_mode: state.attributes.room_mode || "auto",
        schedule_active: state.attributes.schedule_active || false,
        source: state.attributes.source || "",
        boost_remaining: state.attributes.boost_remaining || 0,
        night_setback: state.attributes.night_setback || 0,
        runtime_today_minutes: 0,
        temp_history: [],
        avg_warmup_minutes: null,
        // Room config (from climate entity extra_state_attributes)
        temp_sensor: state.attributes.temp_sensor || "",
        valve_entities: state.attributes.valve_entities || [],
        window_sensors: state.attributes.window_sensors || [],
        comfort_temp: state.attributes.comfort_temp ?? 21,
        eco_offset: state.attributes.eco_offset ?? 3,
        sleep_offset: state.attributes.sleep_offset ?? 4,
        away_offset: state.attributes.away_offset ?? 6,
        eco_max_temp: state.attributes.eco_max_temp ?? 21,
        sleep_max_temp: state.attributes.sleep_max_temp ?? 19,
        away_max_temp: state.attributes.away_max_temp ?? 18,
        ha_schedule_off_mode: state.attributes.ha_schedule_off_mode ?? "eco",
        comfort_temp_eff: state.attributes.comfort_temp_eff ?? null,
        eco_temp_eff: state.attributes.eco_temp_eff ?? null,
        sleep_temp_eff: state.attributes.sleep_temp_eff ?? null,
        away_temp_eff: state.attributes.away_temp_eff ?? null,
        room_offset: state.attributes.room_offset ?? 0,
        deadband: state.attributes.deadband ?? 0.5,
        weight: state.attributes.weight ?? 1.0,
        schedules: state.attributes.schedules || [],
        ha_schedules: state.attributes.ha_schedules || [],
        next_period: state.attributes.next_period || null,
        anomaly: state.attributes.anomaly || null,
        // Energy
        radiator_kw: state.attributes.radiator_kw ?? 1.0,
        hkv_sensor: state.attributes.hkv_sensor || "",
        hkv_factor: state.attributes.hkv_factor ?? 0.083,
        energy_today_kwh: state.attributes.energy_today_kwh ?? 0,
        // Presence (per-room)
        room_presence_entities: state.attributes.room_presence_entities || [],
        // Humidity & mold
        humidity_sensor: state.attributes.humidity_sensor || "",
        mold_protection_enabled: state.attributes.mold_protection_enabled !== false,
        // Boost config
        boost_temp: state.attributes.boost_temp ?? null,
        boost_default_duration: state.attributes.boost_default_duration ?? 60,
        // HA schedule blocks (from schedule.* entity config entries)
        ha_schedule_blocks: state.attributes.ha_schedule_blocks || {},
        // Per-room advanced settings
        absolute_min_temp: state.attributes.absolute_min_temp ?? 15,
        room_qm: state.attributes.room_qm ?? 0,
        room_preheat_minutes: state.attributes.room_preheat_minutes ?? -1,
        window_reaction_time: state.attributes.window_reaction_time ?? 30,
        window_close_delay: state.attributes.window_close_delay ?? 0,
        effective_weight: state.attributes.effective_weight ?? state.attributes.weight ?? 1.0,
        // TRV sensor data integration
        trv_temp_weight:  state.attributes.trv_temp_weight ?? 0,
        trv_temp_offset:  state.attributes.trv_temp_offset ?? -2,
        trv_valve_demand: state.attributes.trv_valve_demand === true,
        trv_raw_temp:     state.attributes.trv_raw_temp ?? null,
        trv_humidity:     state.attributes.trv_humidity ?? null,
        trv_avg_valve:    state.attributes.trv_avg_valve ?? null,
        trv_any_heating:  state.attributes.trv_any_heating === true,
        trv_min_battery:  state.attributes.trv_min_battery ?? null,
        trv_low_battery:  state.attributes.trv_low_battery === true,
      };
    });
    // Enrich from demand sensors
    Object.entries(this._hass.states).forEach(([entityId, state]) => {
      if (!entityId.startsWith("sensor.ihc_") || !entityId.endsWith("_anforderung")) return;
      const baseName = entityId.replace("sensor.ihc_", "").replace("_anforderung", "");
      const climateId = `climate.ihc_${baseName}`;
      if (rooms[climateId]) {
        rooms[climateId].demand = parseFloat(state.state) || 0;
        if (state.attributes.current_temp !== undefined)
          rooms[climateId].current_temp = state.attributes.current_temp;
        if (state.attributes.room_mode !== undefined)
          rooms[climateId].room_mode = state.attributes.room_mode;
        if (state.attributes.window_open !== undefined)
          rooms[climateId].window_open = state.attributes.window_open;
        if (state.attributes.source !== undefined)
          rooms[climateId].source = state.attributes.source;
        if (state.attributes.night_setback !== undefined)
          rooms[climateId].night_setback = state.attributes.night_setback;
        if (state.attributes.temp_history !== undefined)
          rooms[climateId].temp_history = state.attributes.temp_history;
        if (state.attributes.avg_warmup_minutes !== undefined)
          rooms[climateId].avg_warmup_minutes = state.attributes.avg_warmup_minutes;
        if (state.attributes.room_presence_active !== undefined)
          rooms[climateId].room_presence_active = state.attributes.room_presence_active;
        if (state.attributes.mold !== undefined)
          rooms[climateId].mold = state.attributes.mold;
        if (state.attributes.ventilation !== undefined)
          rooms[climateId].ventilation = state.attributes.ventilation;
        if (state.attributes.co2_ppm !== undefined)
          rooms[climateId].co2_ppm = state.attributes.co2_ppm;
      }
    });
    // Enrich runtime from runtime sensors
    Object.entries(this._hass.states).forEach(([entityId, state]) => {
      if (!entityId.startsWith("sensor.ihc_") || !entityId.endsWith("_laufzeit_heute")) return;
      const baseName = entityId.replace("sensor.ihc_", "").replace("_laufzeit_heute", "");
      const climateId = `climate.ihc_${baseName}`;
      if (rooms[climateId]) {
        rooms[climateId].runtime_today_minutes = parseFloat(state.state) || 0;
      }
    });
    return rooms;
  }

  _getGlobal() {
    const dem  = this._st("sensor.ihc_gesamtanforderung");
    const sw   = this._st("switch.ihc_heizung_aktiv");
    const sel  = this._st("select.ihc_systemmodus");
    const ct   = this._st("sensor.ihc_heizkurven_zieltemperatur");
    const ot   = this._st("sensor.ihc_aussentemperatur");
    const rt   = this._st("sensor.ihc_heizlaufzeit_heute");
    const egy  = this._st("sensor.ihc_energie_heute");
    const a    = dem ? (dem.attributes || {}) : {};
    const ea   = egy ? (egy.attributes || {}) : {};
    return {
      total_demand:              dem ? parseFloat(dem.state) || 0 : null,
      heating_active:            sw  ? sw.state === "on" : (a.heating_active || false),
      system_mode:               a.system_mode || (sel ? sel.state : "—"),
      curve_target:              ct  ? parseFloat(ct.state) : null,
      outdoor_temp:              ot  ? parseFloat(ot.state) : null,
      rooms_demanding:           a.rooms_demanding || 0,
      summer_mode:               a.summer_mode || false,
      night_setback_active:      a.night_setback_active || false,
      presence_away_active:      a.presence_away_active || false,
      heating_runtime_today:     rt  ? parseFloat(rt.state) || 0 : (a.heating_runtime_today || 0),
      heating_runtime_yesterday: a.heating_runtime_yesterday || 0,
      energy_today_kwh:          egy ? parseFloat(egy.state) || 0 : 0,
      energy_yesterday_kwh:      ea.energy_yesterday_kwh || 0,
      solar_boost:               ea.solar_boost || 0,
      solar_power:               ea.solar_power != null ? parseFloat(ea.solar_power) : null,
      energy_price:              ea.energy_price != null ? parseFloat(ea.energy_price) : null,
      energy_price_eco_active:   ea.energy_price_eco_active || false,
      flow_temp:                 ea.flow_temp != null ? parseFloat(ea.flow_temp) : null,
      vacation_auto_active:      a.vacation_auto_active || false,
      return_preheat_active:     a.return_preheat_active || false,
      efficiency_score:          a.efficiency_score != null ? parseFloat(a.efficiency_score) : null,
      controller_mode:           a.controller_mode || "switch",
      guest_mode_active:         a.guest_mode_active || false,
      guest_remaining_minutes:   a.guest_remaining_minutes != null ? a.guest_remaining_minutes : null,
      weather_forecast:          a.weather_forecast || null,
      cold_boost:                ea.cold_boost != null ? parseFloat(ea.cold_boost) : 0,
      eta_preheat_minutes:       ea.eta_preheat_minutes != null ? parseFloat(ea.eta_preheat_minutes) : null,
      adaptive_curve_delta:      ea.adaptive_curve_delta != null ? parseFloat(ea.adaptive_curve_delta) : 0,
      outdoor_humidity:          a.outdoor_humidity != null ? parseFloat(a.outdoor_humidity) : null,
      static_energy_price:       a.static_energy_price != null ? parseFloat(a.static_energy_price) : null,
      boiler_kw:                 a.boiler_kw != null ? parseFloat(a.boiler_kw) : null,
    };
  }

  _fmt(v, unit = "") {
    return v !== null && v !== undefined && !isNaN(v) ? `${v}${unit}` : "—";
  }

  _demandColor(d) {
    if (d >= 80) return "#e53935";
    if (d >= 60) return "#fb8c00";
    if (d >= 30) return "#fdd835";
    return "#43a047";
  }

  // Roadmap 1.1 – mini SVG sparkline for temperature history
  _sparkline(history, w = 80, h = 24) {
    if (!history || history.length < 2) return "";
    const vals = history.map(p => p.v);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    const pts = vals.map((v, i) => {
      const x = (i / (vals.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;overflow:visible">
      <polyline points="${pts}" fill="none" stroke="var(--primary-color)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
    </svg>`;
  }

  // ── Service Calls ──────────────────────────────────────────────────────────

  async _callService(service, data) {
    if (!this._hass) return;
    try {
      await this._hass.callService(DOMAIN, service, data);
    } catch (e) {
      console.error("IHC service error:", service, e);
      this._toast("❌ Fehler: " + (e.message || "Unbekannt"));
    }
  }

  // ── Energy correction factor ────────────────────────────────────────────────
  // Applies the user-set calibration factor (stored in localStorage) to kWh values.
  _kwh(raw) {
    const factor = parseFloat(localStorage.getItem("ihc_energy_factor") || "1") || 1;
    return Math.round(raw * factor * 10) / 10;
  }

  // Returns the "costs" display string: "X kWh" or "X kWh · Y €" if static price configured.
  // price = optional override (from room radiator_kw etc), falls back to global static_energy_price.
  _costStr(rawKwh, staticPrice) {
    const kwh = this._kwh(rawKwh);
    const parts = [`~${kwh} kWh`];
    const price = staticPrice ?? (parseFloat(localStorage.getItem("ihc_static_price") || "") || null);
    if (price && kwh > 0) parts.push(`≈ ${(kwh * price).toFixed(2)} €`);
    return parts.join(" · ");
  }

  // ── Toast ──────────────────────────────────────────────────────────────────

  _toast(msg, ms = 3000) {
    const root = this.shadowRoot.querySelector("#toast-root");
    if (!root) return;
    if (this._toastTimeout) clearTimeout(this._toastTimeout);
    root.innerHTML = `<div class="toast">${msg}</div>`;
    this._toastTimeout = setTimeout(() => { root.innerHTML = ""; }, ms);
  }

  // ── Helper: legacy datalist options (kept for fallback) ─────────────────────
  _entityOptions(domains) {
    if (!this._hass) return "";
    return Object.keys(this._hass.states)
      .filter(id => !domains.length || domains.some(d => id.startsWith(d + ".")))
      .sort()
      .map(id => {
        const state = this._hass.states[id];
        const name  = state?.attributes?.friendly_name;
        const label = name && name !== id ? `${name} – ${id}` : id;
        return `<option value="${id}" label="${label}">`;
      })
      .join("");
  }

  // ── HA-style entity picker (attaches to inputs with data-ep-domains) ─────────
  _attachEntityPickers(root) {
    if (!this._hass) return;
    root.querySelectorAll("input[data-ep-domains]").forEach(input => {
      // Wrap input in .ep-wrap if not already done
      if (input.parentElement.classList.contains("ep-wrap")) return;
      const domains = (input.dataset.epDomains || "").split(",").map(d => d.trim()).filter(Boolean);

      const wrap = document.createElement("div");
      wrap.className = "ep-wrap";
      input.parentNode.insertBefore(wrap, input);
      wrap.appendChild(input);

      // Append dropdown to shadow root so it isn't clipped by modal overflow
      const dropdown = document.createElement("div");
      dropdown.className = "ep-dropdown";
      dropdown.style.display = "none";
      this.shadowRoot.appendChild(dropdown);

      // Tag dropdown with a unique key so it can be cleaned up when the section is re-rendered
      const _cleanup = () => { dropdown.remove(); };
      input._epCleanup = _cleanup;

      let focusedIdx = -1;

      const domainBadge = (id) => {
        const d = id.split(".")[0];
        const cls = ["sensor","climate","switch","binary_sensor","weather","number","input_boolean","person","device_tracker"].includes(d)
          ? `ep-d-${d}` : "ep-d-other";
        return `<span class="ep-badge ${cls}">${d}</span>`;
      };

      const stateLabel = (state) => {
        const s = state.state;
        if (!s || s === "unavailable" || s === "unknown") return "";
        const u = state.attributes?.unit_of_measurement || "";
        return `<span class="ep-state">${s}${u ? " " + u : ""}</span>`;
      };

      const positionDropdown = () => {
        const rect = input.getBoundingClientRect();
        const dropW = Math.max(rect.width, 420);
        const maxLeft = window.innerWidth - dropW - 8;
        dropdown.style.top   = (rect.bottom + 2) + "px";
        dropdown.style.left  = Math.min(rect.left, maxLeft) + "px";
        dropdown.style.width = dropW + "px";
      };

      const renderDropdown = () => {
        const q = input.value.toLowerCase();
        const entries = Object.entries(this._hass.states)
          .filter(([id]) => !domains.length || domains.some(d => id.startsWith(d + ".")))
          .filter(([id, s]) => {
            if (!q) return true;
            return id.toLowerCase().includes(q) || (s.attributes?.friendly_name || "").toLowerCase().includes(q);
          })
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(0, 60);

        focusedIdx = -1;
        if (!entries.length) {
          dropdown.innerHTML = `<div class="ep-empty">Keine Entitäten gefunden</div>`;
        } else {
          dropdown.innerHTML = entries.map(([id, state]) => {
            const name = state.attributes?.friendly_name;
            return `<div class="ep-item" data-value="${id}">
              ${domainBadge(id)}
              <div class="ep-info">
                <div class="ep-name">${name || id}</div>
                <div class="ep-id">${id}</div>
              </div>
              ${stateLabel(state)}
            </div>`;
          }).join("");

          dropdown.querySelectorAll(".ep-item").forEach(item => {
            item.addEventListener("mousedown", e => {
              e.preventDefault();
              input.value = item.dataset.value;
              dropdown.style.display = "none";
              input.dispatchEvent(new Event("change", { bubbles: true }));
            });
          });
        }
        positionDropdown();
        dropdown.style.display = "";
      };

      const hideDropdown = () => { dropdown.style.display = "none"; focusedIdx = -1; };

      input.addEventListener("focus", renderDropdown);
      input.addEventListener("blur",  () => setTimeout(hideDropdown, 200));
      input.addEventListener("input", renderDropdown);

      input.addEventListener("keydown", e => {
        const items = dropdown.querySelectorAll(".ep-item");
        if (!items.length) return;
        if (e.key === "ArrowDown") {
          e.preventDefault();
          focusedIdx = Math.min(focusedIdx + 1, items.length - 1);
          items.forEach((it, i) => it.classList.toggle("ep-focused", i === focusedIdx));
          items[focusedIdx]?.scrollIntoView({ block: "nearest" });
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          focusedIdx = Math.max(focusedIdx - 1, 0);
          items.forEach((it, i) => it.classList.toggle("ep-focused", i === focusedIdx));
        } else if (e.key === "Enter" && focusedIdx >= 0) {
          e.preventDefault();
          input.value = items[focusedIdx].dataset.value;
          hideDropdown();
          input.dispatchEvent(new Event("change", { bubbles: true }));
        } else if (e.key === "Escape") {
          hideDropdown();
        }
      });
    });
  }

  _cleanupEntityPickers(container) {
    container?.querySelectorAll("input[data-ep-domains]").forEach(inp => inp._epCleanup?.());
  }

  // ── Helper: Presence checkboxes from HA states ──────────────────────────────
  _renderPresenceCheckboxes(currentEntities) {
    if (!this._hass) return "";

    const homeStates = new Set(["home", "on"]);
    const mkChip = id => {
      const state = this._hass.states[id];
      const label = state?.attributes?.friendly_name || id;
      const isHome = homeStates.has((state?.state || "").toLowerCase());
      const checked = currentEntities.includes(id) ? "checked" : "";
      const dot = isHome
        ? `<span style="width:7px;height:7px;border-radius:50%;background:#43a047;flex-shrink:0"></span>`
        : `<span style="width:7px;height:7px;border-radius:50%;background:#bdbdbd;flex-shrink:0"></span>`;
      return `<label style="display:flex;align-items:center;gap:7px;font-size:13px;cursor:pointer;
          padding:6px 10px;border:1px solid var(--divider-color);border-radius:8px;
          background:${checked ? "var(--primary-color,#03a9f4)1a" : "transparent"}">
        <input type="checkbox" class="presence-cb" value="${id}" ${checked} style="margin:0">
        ${dot}
        <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${label}</span>
        <span style="font-size:10px;color:var(--secondary-text-color);flex-shrink:0">${isHome ? "zuhause" : "weg"}</span>
      </label>`;
    };

    const persons  = Object.keys(this._hass.states).filter(id => id.startsWith("person.")).sort();
    const trackers = Object.keys(this._hass.states).filter(id => id.startsWith("device_tracker.")).sort();
    const booleans = Object.keys(this._hass.states).filter(id => id.startsWith("input_boolean.")).sort();

    if (!persons.length && !trackers.length && !booleans.length)
      return "<em style='color:var(--secondary-text-color);font-size:12px'>Keine person.* / device_tracker.* Entitäten gefunden</em>";

    const section = (title, ids) => ids.length === 0 ? "" : `
      <div style="font-size:11px;font-weight:600;color:var(--secondary-text-color);
          text-transform:uppercase;letter-spacing:.5px;margin:10px 0 5px">${title}</div>
      <div style="display:flex;flex-direction:column;gap:4px">${ids.map(mkChip).join("")}</div>`;

    // Device-trackers get a collapse toggle if more than 5
    let trackerBlock = "";
    if (trackers.length > 0) {
      const shown  = trackers.slice(0, 5);
      const hidden = trackers.slice(5);
      trackerBlock = `
        <div style="font-size:11px;font-weight:600;color:var(--secondary-text-color);
            text-transform:uppercase;letter-spacing:.5px;margin:10px 0 5px">Geräte (device_tracker)</div>
        <div style="display:flex;flex-direction:column;gap:4px">${shown.map(mkChip).join("")}</div>
        ${hidden.length ? `
          <div id="tracker-overflow" style="display:none;flex-direction:column;gap:4px">${hidden.map(mkChip).join("")}</div>
          <button type="button" id="tracker-toggle"
            style="margin-top:6px;font-size:12px;color:var(--primary-color);background:none;border:none;cursor:pointer;padding:2px 0;text-align:left">
            ▸ ${hidden.length} weitere Geräte anzeigen
          </button>` : ""}`;
    }

    return section("Personen", persons) + trackerBlock + section("Schalter (input_boolean)", booleans);
  }

  /** Binds "+"-buttons that add entity rows to entity-list containers. */
  _bindEntityListAdders() {
    setTimeout(() => {
      this.shadowRoot.querySelectorAll(".add-entity").forEach(btn => {
        btn.addEventListener("click", () => {
          const listId    = btn.dataset.list;
          const epDomains = btn.dataset.epDomains || "";
          const list      = this.shadowRoot.querySelector(`#${listId}`);
          if (!list) return;
          const placeholder = btn.closest(".entity-row").querySelector("input").placeholder;
          const row = document.createElement("div");
          row.className = "entity-row";
          row.innerHTML = `
            <input type="text" class="form-input" placeholder="${placeholder}"
              ${epDomains ? `data-ep-domains="${epDomains}"` : ""} autocomplete="off">
            <button class="btn btn-danger btn-icon remove-entity">✕</button>`;
          list.appendChild(row);
          row.querySelector(".remove-entity").addEventListener("click", () => row.remove());
          // Attach entity picker to the new input
          if (epDomains) this._attachEntityPickers(row);
        });
      });
      // Also bind remove-entity buttons already in DOM (pre-filled rows)
      this.shadowRoot.querySelectorAll(".remove-entity").forEach(btn => {
        if (!btn._bound) {
          btn._bound = true;
          btn.addEventListener("click", () => btn.closest(".entity-row").remove());
        }
      });
    }, 30);
  }

  // ── HA Schedule row helpers ─────────────────────────────────────────────

  /** Renders a single HA schedule row and returns its element. */
  _makeHaSchedRow(entry = {}) {
    const row = document.createElement("div");
    row.className = "ha-sched-row";
    row.style.cssText = "display:grid;grid-template-columns:1fr auto 1fr auto auto;gap:6px;align-items:center;margin-bottom:6px";
    row.innerHTML = `
      <input type="text" class="form-input hs-entity" placeholder="schedule.zimmer"
        data-ep-domains="schedule" autocomplete="off" value="${entry.entity || ''}">
      <select class="form-select hs-mode" style="min-width:90px">
        <option value="comfort" ${(entry.mode||'comfort')==='comfort'?'selected':''}>Komfort</option>
        <option value="eco"     ${entry.mode==='eco'    ?'selected':''}>Eco</option>
        <option value="sleep"   ${entry.mode==='sleep'  ?'selected':''}>Schlaf</option>
        <option value="away"    ${entry.mode==='away'   ?'selected':''}>Abwesend</option>
      </select>
      <input type="text" class="form-input hs-cond" placeholder="Bedingung (optional)"
        data-ep-domains="input_boolean,binary_sensor,person,device_tracker" autocomplete="off" value="${entry.condition_entity || ''}">
      <input type="text" class="form-input hs-cond-state" placeholder="Zustand"
        style="width:70px" value="${entry.condition_state || 'on'}">
      <button class="btn btn-danger btn-icon hs-remove" title="Entfernen">✕</button>`;
    row.querySelector(".hs-remove").addEventListener("click", () => row.remove());
    // Attach entity pickers after row is appended (caller must ensure DOM is ready)
    setTimeout(() => this._attachEntityPickers(row), 0);
    return row;
  }

  /** Attaches the "add" button for HA schedule rows. Call after modal renders. */
  _bindHaSchedAdder(existingEntries, listId, addBtnId) {
    setTimeout(() => {
      const list = this.shadowRoot.querySelector(`#${listId}`);
      if (!list) return;
      // Render pre-existing entries
      existingEntries.forEach(entry => list.appendChild(this._makeHaSchedRow(entry)));
      const btn = this.shadowRoot.querySelector(`#${addBtnId}`);
      if (btn) btn.addEventListener("click", () => list.appendChild(this._makeHaSchedRow()));
    }, 50);
  }

  /** Collects HA schedule rows from a modal container into an array. */
  _collectHaScheduleRows(modal) {
    return [...modal.querySelectorAll(".ha-sched-row")]
      .map(row => {
        const entity = row.querySelector(".hs-entity").value.trim();
        if (!entity) return null;
        const entry = { entity, mode: row.querySelector(".hs-mode").value };
        const cond = row.querySelector(".hs-cond").value.trim();
        if (cond) {
          entry.condition_entity = cond;
          entry.condition_state  = row.querySelector(".hs-cond-state").value.trim() || "on";
        }
        return entry;
      })
      .filter(Boolean);
  }
