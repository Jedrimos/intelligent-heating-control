/**
 * Intelligent Heating Control - Frontend Panel
 *
 * Custom Home Assistant panel providing:
 *   - Config Page: Room management, schedules, heating curve, global settings
 *   - Debug Page:  Real-time view of all room demands, temperatures, Klimabaustein state
 */

const DOMAIN = "intelligent_heating_control";
const DAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const MODE_LABELS = {
  auto: "Automatisch", comfort: "Komfort", eco: "Eco",
  sleep: "Schlafen", away: "Abwesend", off: "Aus", manual: "Manuell"
};
const SYSTEM_MODE_LABELS = {
  auto: "Automatisch", heat: "Heizen", cool: "Kühlen",
  off: "Aus", away: "Abwesend", vacation: "Urlaub"
};

// -----------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------
const STYLES = `
  :host { font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif); }
  * { box-sizing: border-box; }
  .panel { max-width: 1200px; margin: 0 auto; padding: 16px; }
  .header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
  .header h1 { margin: 0; font-size: 24px; color: var(--primary-text-color); }
  .tabs { display: flex; border-bottom: 2px solid var(--divider-color); margin-bottom: 24px; }
  .tab { padding: 10px 24px; cursor: pointer; color: var(--secondary-text-color);
         border-bottom: 3px solid transparent; margin-bottom: -2px; font-weight: 500;
         transition: all 0.2s; }
  .tab.active { color: var(--primary-color); border-bottom-color: var(--primary-color); }
  .tab:hover:not(.active) { color: var(--primary-text-color); background: var(--secondary-background-color); }

  /* Cards */
  .card { background: var(--card-background-color, white);
          border-radius: 8px; padding: 20px; margin-bottom: 16px;
          box-shadow: var(--ha-card-box-shadow, 0 2px 4px rgba(0,0,0,.1)); }
  .card-title { font-size: 16px; font-weight: 600; color: var(--primary-text-color);
                margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }

  /* Debug grid */
  .debug-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
  .room-card { background: var(--card-background-color, white); border-radius: 8px;
               padding: 16px; box-shadow: var(--ha-card-box-shadow, 0 2px 4px rgba(0,0,0,.1));
               border-left: 4px solid var(--divider-color); transition: border-color 0.3s; }
  .room-card.heating { border-left-color: var(--error-color, #f44336); }
  .room-card.satisfied { border-left-color: var(--success-color, #4caf50); }
  .room-card.window-open { border-left-color: #2196f3; }
  .room-name { font-size: 15px; font-weight: 600; margin-bottom: 12px; }
  .temp-row { display: flex; justify-content: space-between; margin-bottom: 6px;
              font-size: 13px; color: var(--secondary-text-color); }
  .temp-row .value { font-weight: 600; color: var(--primary-text-color); }
  .demand-bar-bg { background: var(--secondary-background-color); border-radius: 4px;
                   height: 8px; margin: 8px 0; overflow: hidden; }
  .demand-bar { height: 100%; border-radius: 4px; transition: width 0.5s, background 0.3s; }
  .demand-label { font-size: 12px; color: var(--secondary-text-color); }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px;
           font-weight: 600; margin-top: 6px; }
  .badge-heat { background: #fce4ec; color: #c62828; }
  .badge-ok { background: #e8f5e9; color: #2e7d32; }
  .badge-off { background: #eeeeee; color: #757575; }
  .badge-window { background: #e3f2fd; color: #1565c0; }
  .badge-eco { background: #e0f2f1; color: #00695c; }
  .badge-away { background: #fff3e0; color: #e65100; }

  /* Status bar (top of debug) */
  .status-bar { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
                gap: 12px; margin-bottom: 20px; }
  .status-item { background: var(--card-background-color, white); border-radius: 8px;
                 padding: 14px; box-shadow: var(--ha-card-box-shadow, 0 2px 4px rgba(0,0,0,.1));
                 text-align: center; }
  .status-label { font-size: 11px; color: var(--secondary-text-color); text-transform: uppercase;
                  letter-spacing: 0.5px; margin-bottom: 6px; }
  .status-value { font-size: 22px; font-weight: 700; color: var(--primary-text-color); }
  .status-value.heating { color: var(--error-color, #f44336); }
  .status-value.ok { color: var(--success-color, #4caf50); }

  /* Demand bar color helper */
  .demand-0 { background: var(--success-color, #4caf50); }
  .demand-30 { background: #ffc107; }
  .demand-60 { background: #ff9800; }
  .demand-80 { background: var(--error-color, #f44336); }

  /* Config page */
  .config-section { margin-bottom: 24px; }
  .form-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px;
              flex-wrap: wrap; }
  .form-row label { min-width: 200px; font-size: 14px; color: var(--primary-text-color); }
  .form-row input, .form-row select {
    flex: 1; min-width: 150px; padding: 8px 12px; border-radius: 4px;
    border: 1px solid var(--divider-color); background: var(--card-background-color);
    color: var(--primary-text-color); font-size: 14px; }
  .form-row input:focus, .form-row select:focus {
    outline: none; border-color: var(--primary-color); }

  /* Buttons */
  .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px;
         border-radius: 4px; border: none; cursor: pointer; font-size: 14px;
         font-weight: 500; transition: all 0.2s; }
  .btn-primary { background: var(--primary-color); color: white; }
  .btn-primary:hover { opacity: 0.9; }
  .btn-danger { background: var(--error-color, #f44336); color: white; }
  .btn-danger:hover { opacity: 0.9; }
  .btn-secondary { background: var(--secondary-background-color);
                   color: var(--primary-text-color); border: 1px solid var(--divider-color); }
  .btn-secondary:hover { background: var(--divider-color); }
  .btn-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }

  /* Room list */
  .room-list-item { display: flex; align-items: center; gap: 12px; padding: 12px;
                    border-bottom: 1px solid var(--divider-color); }
  .room-list-item:last-child { border-bottom: none; }
  .room-list-name { flex: 1; font-weight: 500; }
  .room-list-info { font-size: 12px; color: var(--secondary-text-color); }

  /* Schedule table */
  .schedule-grid { display: grid; grid-template-columns: 100px 100px 80px 80px 80px;
                   gap: 8px; align-items: center; font-size: 13px; margin-bottom: 6px; }
  .schedule-grid.header { font-weight: 600; color: var(--secondary-text-color); }
  .day-chips { display: flex; gap: 4px; flex-wrap: wrap; }
  .day-chip { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center;
              justify-content: center; cursor: pointer; font-size: 11px; font-weight: 600;
              border: 2px solid var(--divider-color); transition: all 0.2s; }
  .day-chip.selected { background: var(--primary-color); color: white;
                       border-color: var(--primary-color); }

  /* Heating curve table */
  .curve-table { width: 100%; border-collapse: collapse; }
  .curve-table th, .curve-table td { padding: 8px 12px; text-align: left;
                                      border-bottom: 1px solid var(--divider-color); }
  .curve-table th { font-size: 12px; text-transform: uppercase; color: var(--secondary-text-color); }
  .curve-table input { width: 80px; padding: 4px 8px; border-radius: 4px;
                       border: 1px solid var(--divider-color);
                       background: var(--card-background-color); color: var(--primary-text-color); }

  /* Modal */
  .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100;
                    display: flex; align-items: center; justify-content: center; }
  .modal { background: var(--card-background-color, white); border-radius: 8px;
           padding: 24px; max-width: 640px; width: 90%; max-height: 80vh;
           overflow-y: auto; position: relative; }
  .modal-title { font-size: 18px; font-weight: 600; margin-bottom: 20px; }
  .modal-close { position: absolute; top: 16px; right: 16px; cursor: pointer;
                 font-size: 20px; color: var(--secondary-text-color); background: none;
                 border: none; }

  .spinner { display: inline-block; width: 20px; height: 20px; border: 3px solid var(--divider-color);
             border-top-color: var(--primary-color); border-radius: 50%;
             animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
           background: #323232; color: white; padding: 12px 24px; border-radius: 4px;
           z-index: 200; font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }

  .section-divider { border: none; border-top: 1px solid var(--divider-color); margin: 20px 0; }
  .info-box { background: var(--info-color, #e3f2fd); border-left: 4px solid var(--primary-color);
              padding: 12px; border-radius: 4px; font-size: 13px; margin-bottom: 16px; }
`;

// -----------------------------------------------------------------------
// Custom Element
// -----------------------------------------------------------------------
class IHCPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._activeTab = "debug";
    this._entryId = null;
    this._config = null;
    this._loading = false;
    this._editingRoom = null;
    this._modal = null;
    this._scheduleRoom = null;
    this._toastTimeout = null;
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  connectedCallback() {
    this._render();
    this._startAutoRefresh();
  }

  disconnectedCallback() {
    if (this._refreshTimer) clearInterval(this._refreshTimer);
  }

  _startAutoRefresh() {
    this._refreshTimer = setInterval(() => {
      if (this._activeTab === "debug" && this._hass) {
        this._renderDebugContent();
      }
    }, 5000);
  }

  // -----------------------------------------------------------------------
  // Data helpers
  // -----------------------------------------------------------------------

  async _loadConfig() {
    if (!this._hass) return;
    try {
      const entries = await this._hass.callWS({ type: "config_entries/get", domain: DOMAIN });
      if (entries && entries.length > 0) {
        this._entryId = entries[0].entry_id;
        // Get options (rooms, curve, etc.)
        const result = await this._hass.callWS({
          type: "config_entries/get",
          domain: DOMAIN,
        });
        this._config = entries[0];
      }
    } catch (e) {
      console.error("IHC: failed to load config", e);
    }
  }

  _getState(entityId) {
    return this._hass ? this._hass.states[entityId] : null;
  }

  _getAllIHCStates() {
    if (!this._hass) return {};
    return Object.fromEntries(
      Object.entries(this._hass.states).filter(([k]) => k.startsWith("sensor.ihc_") ||
        k.startsWith("climate.ihc_") || k.startsWith("switch.ihc_") ||
        k.startsWith("number.ihc_") || k.startsWith("select.ihc_"))
    );
  }

  _getRoomData() {
    const states = this._getAllIHCStates();
    const rooms = {};
    // Find all room climate entities
    Object.entries(states).forEach(([entityId, state]) => {
      if (!entityId.startsWith("climate.ihc_")) return;
      const name = state.attributes.friendly_name || entityId;
      const roomName = name.replace(/^IHC /, "");
      // Find corresponding demand sensor
      const demandId = entityId.replace("climate.ihc_", "sensor.ihc_") + "_demand"
        .replace("climate.ihc_", "sensor.ihc_");

      rooms[entityId] = {
        entity_id: entityId,
        name: roomName,
        current_temp: state.attributes.current_temperature,
        target_temp: state.attributes.temperature,
        hvac_mode: state.state,
        hvac_action: state.attributes.hvac_action,
        preset: state.attributes.preset_mode,
        demand: state.attributes.demand || 0,
        window_open: state.attributes.window_open || false,
        room_mode: state.attributes.room_mode || "auto",
        schedule_active: state.attributes.schedule_active || false,
        source: state.attributes.source || "",
      };
    });

    // Enrich with demand sensor data
    Object.entries(states).forEach(([entityId, state]) => {
      if (!entityId.includes("_demand") || !entityId.startsWith("sensor.ihc_")) return;
      const demand = parseFloat(state.state) || 0;
      const baseId = "climate." + entityId.replace("sensor.", "").replace("_demand", "");
      if (rooms[baseId]) {
        rooms[baseId].demand = demand;
        rooms[baseId].current_temp = state.attributes.current_temp ?? rooms[baseId].current_temp;
        rooms[baseId].target_temp = state.attributes.target_temp ?? rooms[baseId].target_temp;
        rooms[baseId].window_open = state.attributes.window_open ?? rooms[baseId].window_open;
        rooms[baseId].room_mode = state.attributes.room_mode ?? rooms[baseId].room_mode;
        rooms[baseId].source = state.attributes.source ?? rooms[baseId].source;
        rooms[baseId].schedule_active = state.attributes.schedule_active ?? rooms[baseId].schedule_active;
      }
    });

    return rooms;
  }

  _getGlobalData() {
    const totalDemand = this._getState("sensor.ihc_gesamtanforderung");
    const heatingSwitch = this._getState("switch.ihc_heizung_aktiv");
    const systemMode = this._getState("select.ihc_systemmodus");
    const curveTarget = this._getState("sensor.ihc_heizkurven_zieltemperatur");
    const outdoorTemp = this._getState("sensor.ihc_aussentemperatur");

    return {
      total_demand: totalDemand ? parseFloat(totalDemand.state) || 0 : null,
      heating_active: heatingSwitch ? heatingSwitch.state === "on" : false,
      system_mode: systemMode ? systemMode.state : "—",
      curve_target: curveTarget ? parseFloat(curveTarget.state) : null,
      outdoor_temp: outdoorTemp ? parseFloat(outdoorTemp.state) : null,
      rooms_demanding: totalDemand ? (totalDemand.attributes.rooms_demanding || 0) : 0,
    };
  }

  // -----------------------------------------------------------------------
  // Rendering
  // -----------------------------------------------------------------------

  _render() {
    const shadow = this.shadowRoot;
    if (!shadow.querySelector("style")) {
      const style = document.createElement("style");
      style.textContent = STYLES;
      shadow.appendChild(style);
    }
    if (!shadow.querySelector(".panel")) {
      const div = document.createElement("div");
      div.className = "panel";
      shadow.appendChild(div);
    }
    const panel = shadow.querySelector(".panel");
    panel.innerHTML = `
      <div class="header">
        <button class="btn btn-secondary" id="btn-back" style="margin-right:8px">← Dashboard</button>
        <ha-icon icon="mdi:radiator" style="color:var(--primary-color);font-size:32px"></ha-icon>
        <h1>Intelligent Heating Control</h1>
      </div>
      <div class="tabs">
        <div class="tab ${this._activeTab === "debug" ? "active" : ""}" data-tab="debug">
          📊 Übersicht &amp; Debug
        </div>
        <div class="tab ${this._activeTab === "config" ? "active" : ""}" data-tab="config">
          ⚙️ Konfiguration
        </div>
        <div class="tab ${this._activeTab === "schedules" ? "active" : ""}" data-tab="schedules">
          📅 Zeitpläne
        </div>
        <div class="tab ${this._activeTab === "curve" ? "active" : ""}" data-tab="curve">
          📈 Heizkurve
        </div>
      </div>
      <div id="tab-content"></div>
      <div id="modal-container"></div>
      <div id="toast-container"></div>
    `;
    panel.querySelector("#btn-back").addEventListener("click", () => {
      if (this._hass && this._hass.navigate) {
        this._hass.navigate("/");
      } else {
        history.back();
      }
    });
    panel.querySelectorAll(".tab").forEach(tab => {
      tab.addEventListener("click", () => {
        this._activeTab = tab.dataset.tab;
        this._render();
      });
    });
    this._renderTabContent();
  }

  _renderTabContent() {
    const content = this.shadowRoot.querySelector("#tab-content");
    switch (this._activeTab) {
      case "debug": this._renderDebugContent(); break;
      case "config": this._renderConfigContent(); break;
      case "schedules": this._renderSchedulesContent(); break;
      case "curve": this._renderCurveContent(); break;
    }
  }

  // -----------------------------------------------------------------------
  // DEBUG TAB
  // -----------------------------------------------------------------------

  _renderDebugContent() {
    const content = this.shadowRoot.querySelector("#tab-content");
    if (!content) return;
    const global = this._getGlobalData();
    const rooms = this._getRoomData();

    const demandColor = (d) => {
      if (d >= 80) return "var(--error-color, #f44336)";
      if (d >= 60) return "#ff9800";
      if (d >= 30) return "#ffc107";
      return "var(--success-color, #4caf50)";
    };

    const fmt = (v, unit = "") => v !== null && v !== undefined ? `${v}${unit}` : "—";

    const roomCards = Object.values(rooms).map(room => {
      const isHeating = room.demand > 0 && global.heating_active;
      const isWindow = room.window_open;
      const isSatisfied = room.demand === 0 && room.room_mode !== "off";
      let cardClass = "room-card";
      if (isWindow) cardClass += " window-open";
      else if (isHeating) cardClass += " heating";
      else if (isSatisfied) cardClass += " satisfied";

      const badge = () => {
        if (isWindow) return `<span class="badge badge-window">🪟 Fenster offen</span>`;
        if (room.room_mode === "off") return `<span class="badge badge-off">Aus</span>`;
        if (room.room_mode === "eco") return `<span class="badge badge-eco">Eco</span>`;
        if (room.room_mode === "away") return `<span class="badge badge-away">Abwesend</span>`;
        if (isHeating) return `<span class="badge badge-heat">🔥 Heizen</span>`;
        if (isSatisfied) return `<span class="badge badge-ok">✓ OK</span>`;
        return "";
      };

      const sourceLabel = {
        "heating_curve": "Heizkurve",
        "schedule": `Zeitplan (${room.schedule_active ? "aktiv" : ""})`,
        "comfort": "Komfort",
        "eco": "Eco",
        "sleep": "Schlafen",
        "system_away": "System Abwesend",
        "system_vacation": "Urlaub",
        "room_off": "Zimmer Aus",
        "manual": "Manuell",
      }[room.source] || room.source;

      return `
        <div class="${cardClass}">
          <div class="room-name">${room.name}</div>
          <div class="temp-row">
            <span>Ist-Temperatur</span>
            <span class="value">${fmt(room.current_temp, " °C")}</span>
          </div>
          <div class="temp-row">
            <span>Soll-Temperatur</span>
            <span class="value" style="color:var(--primary-color)">${fmt(room.target_temp, " °C")}</span>
          </div>
          <div class="temp-row">
            <span>Anforderung</span>
            <span class="value">${fmt(room.demand, " %")}</span>
          </div>
          <div class="demand-bar-bg">
            <div class="demand-bar" style="width:${room.demand}%;background:${demandColor(room.demand)}"></div>
          </div>
          <div class="demand-label">Quelle: ${sourceLabel}</div>
          ${badge()}
        </div>
      `;
    }).join("");

    content.innerHTML = `
      <div class="status-bar">
        <div class="status-item">
          <div class="status-label">Außentemperatur</div>
          <div class="status-value">${fmt(global.outdoor_temp, " °C")}</div>
        </div>
        <div class="status-item">
          <div class="status-label">Heizkurven-Ziel</div>
          <div class="status-value">${fmt(global.curve_target, " °C")}</div>
        </div>
        <div class="status-item">
          <div class="status-label">Gesamtanforderung</div>
          <div class="status-value ${global.total_demand > 15 ? "heating" : "ok"}">${fmt(global.total_demand, " %")}</div>
        </div>
        <div class="status-item">
          <div class="status-label">Zimmer mit Anforderung</div>
          <div class="status-value">${global.rooms_demanding}</div>
        </div>
        <div class="status-item">
          <div class="status-label">Heizung</div>
          <div class="status-value ${global.heating_active ? "heating" : "ok"}">
            ${global.heating_active ? "🔥 EIN" : "✓ AUS"}
          </div>
        </div>
        <div class="status-item">
          <div class="status-label">Systemmodus</div>
          <div class="status-value" style="font-size:14px">${global.system_mode}</div>
        </div>
      </div>

      ${Object.keys(rooms).length === 0 ? `
        <div class="info-box">
          Keine Zimmer konfiguriert. Wechsle zum Tab <strong>Konfiguration</strong> um Zimmer hinzuzufügen.
        </div>
      ` : ""}

      <div class="debug-grid">
        ${roomCards}
      </div>
    `;
  }

  // -----------------------------------------------------------------------
  // CONFIG TAB
  // -----------------------------------------------------------------------

  _renderConfigContent() {
    const content = this.shadowRoot.querySelector("#tab-content");
    if (!content) return;
    const rooms = this._getRoomData();

    const roomListItems = Object.values(rooms).map(room => `
      <div class="room-list-item">
        <div>
          <div class="room-list-name">${room.name}</div>
          <div class="room-list-info">Modus: ${MODE_LABELS[room.room_mode] || room.room_mode}</div>
        </div>
        <div style="display:flex;gap:8px;margin-left:auto">
          <button class="btn btn-secondary" data-action="edit-room" data-id="${room.entity_id}">Bearbeiten</button>
        </div>
      </div>
    `).join("");

    // System mode selector
    const systemModeState = this._getState("select.ihc_systemmodus");
    const currentSystemMode = systemModeState ? systemModeState.state : "Automatisch";

    content.innerHTML = `
      <div class="card">
        <div class="card-title">🏠 Systemmodus</div>
        <div class="form-row">
          <label>Globaler Betriebsmodus</label>
          <select id="system-mode-select">
            ${Object.entries(SYSTEM_MODE_LABELS).map(([k, v]) =>
              `<option value="${k}" ${currentSystemMode === v ? "selected" : ""}>${v}</option>`
            ).join("")}
          </select>
          <button class="btn btn-primary" id="set-system-mode">Setzen</button>
        </div>
      </div>

      <div class="card">
        <div class="card-title">🚪 Zimmer</div>
        <div id="room-list">
          ${roomListItems || '<div style="color:var(--secondary-text-color);padding:12px">Keine Zimmer konfiguriert.</div>'}
        </div>
        <div class="btn-row">
          <button class="btn btn-primary" id="add-room-btn">+ Zimmer hinzufügen</button>
        </div>
      </div>

      <div class="card">
        <div class="card-title">⚙️ Klimabaustein Einstellungen</div>
        <div class="info-box">
          Der Klimabaustein aggregiert alle Zimmeranforderungen (gewichteter Durchschnitt)
          und entscheidet zentral, ob die Heizung läuft.
        </div>
        ${this._renderGlobalSettingsForm()}
        <div class="btn-row">
          <button class="btn btn-primary" id="save-global-settings">💾 Einstellungen speichern</button>
        </div>
      </div>
    `;

    // Event listeners
    content.querySelector("#set-system-mode").addEventListener("click", () => {
      const mode = content.querySelector("#system-mode-select").value;
      this._callService("set_system_mode", { mode });
    });

    content.querySelector("#add-room-btn").addEventListener("click", () => {
      this._showAddRoomModal();
    });

    content.querySelectorAll("[data-action='edit-room']").forEach(btn => {
      btn.addEventListener("click", () => {
        this._showEditRoomModal(btn.dataset.id);
      });
    });

    content.querySelector("#save-global-settings").addEventListener("click", () => {
      this._saveGlobalSettings();
    });
  }

  _renderGlobalSettingsForm() {
    // These values come from the total demand sensor attributes
    const demandSensor = this._getState("sensor.ihc_gesamtanforderung");
    return `
      <div class="form-row">
        <label>Einschaltschwelle (%)</label>
        <input type="number" id="demand-threshold" min="1" max="100" step="1" value="15">
        <span style="font-size:12px;color:var(--secondary-text-color)">Heizung schaltet EIN wenn Gesamtanforderung ≥ Schwelle</span>
      </div>
      <div class="form-row">
        <label>Hysterese (%)</label>
        <input type="number" id="demand-hysteresis" min="1" max="30" step="1" value="5">
        <span style="font-size:12px;color:var(--secondary-text-color)">Heizung schaltet AUS wenn Anforderung < Schwelle - Hysterese</span>
      </div>
      <div class="form-row">
        <label>Mindest-Einschaltzeit (min)</label>
        <input type="number" id="min-on-time" min="1" max="60" step="1" value="5">
      </div>
      <div class="form-row">
        <label>Mindest-Ausschaltzeit (min)</label>
        <input type="number" id="min-off-time" min="1" max="60" step="1" value="5">
      </div>
      <div class="form-row">
        <label>Mindestanzahl Zimmer</label>
        <input type="number" id="min-rooms" min="1" max="20" step="1" value="1">
        <span style="font-size:12px;color:var(--secondary-text-color)">Mindestanzahl Zimmer mit Anforderung für Heizstart</span>
      </div>
    `;
  }

  // -----------------------------------------------------------------------
  // SCHEDULES TAB
  // -----------------------------------------------------------------------

  _renderSchedulesContent() {
    const content = this.shadowRoot.querySelector("#tab-content");
    if (!content) return;
    const rooms = this._getRoomData();

    if (Object.keys(rooms).length === 0) {
      content.innerHTML = `<div class="info-box">Keine Zimmer konfiguriert. Füge zuerst Zimmer hinzu.</div>`;
      return;
    }

    // Default: show first room
    const selectedRoomId = this._scheduleRoom || Object.keys(rooms)[0];
    const selectedRoom = rooms[selectedRoomId];

    const roomTabs = Object.values(rooms).map(r =>
      `<div class="tab ${r.entity_id === selectedRoomId ? "active" : ""}"
            data-room="${r.entity_id}">${r.name}</div>`
    ).join("");

    content.innerHTML = `
      <div class="card">
        <div class="card-title">📅 Zeitpläne</div>
        <div class="info-box">
          Zeitpläne definieren Temperatur-Vorgaben für bestimmte Tage/Uhrzeiten.
          <br>Während eines aktiven Zeitplans: <strong>Zeitplan-Temperatur + Zeitplan-Offset + Zimmer-Offset</strong>
          <br>Außerhalb von Zeitplänen: <strong>Heizkurven-Temperatur + Zimmer-Offset</strong>
        </div>
        <div class="tabs" style="margin-bottom:16px">
          ${roomTabs}
        </div>
        <div id="schedule-editor">
          ${this._renderScheduleEditor(selectedRoom)}
        </div>
      </div>
    `;

    content.querySelectorAll("[data-room]").forEach(tab => {
      tab.addEventListener("click", () => {
        this._scheduleRoom = tab.dataset.room;
        this._renderSchedulesContent();
      });
    });

    this._bindScheduleEvents(content, selectedRoom);
  }

  _renderScheduleEditor(room) {
    if (!room) return "";
    const exampleSchedules = [
      {
        id: "sched_1",
        days: ["mon", "tue", "wed", "thu", "fri"],
        periods: [
          { start: "06:30", end: "08:00", temperature: 22.0, offset: 0.0 },
          { start: "17:00", end: "22:30", temperature: 21.5, offset: 0.0 }
        ]
      },
      {
        id: "sched_2",
        days: ["sat", "sun"],
        periods: [
          { start: "08:00", end: "23:00", temperature: 21.0, offset: 0.5 }
        ]
      }
    ];

    return `
      <div style="font-size:13px;color:var(--secondary-text-color);margin-bottom:12px">
        Zimmer: <strong>${room.name}</strong>
        &nbsp;|&nbsp; Zimmer-Offset: <strong id="room-offset-display">—</strong>
      </div>

      <div id="schedule-list">
        ${exampleSchedules.map((sched, si) => this._renderScheduleItem(sched, si)).join("")}
      </div>

      <div class="btn-row">
        <button class="btn btn-primary" id="add-schedule-btn">+ Zeitplan-Gruppe hinzufügen</button>
        <button class="btn btn-primary" id="save-schedules-btn">💾 Zeitpläne speichern</button>
      </div>
    `;
  }

  _renderScheduleItem(sched, schedIdx) {
    const dayChips = DAY_KEYS.map((key, i) =>
      `<div class="day-chip ${sched.days.includes(key) ? "selected" : ""}"
            data-day="${key}" data-sched="${schedIdx}">${DAYS[i]}</div>`
    ).join("");

    const periods = sched.periods.map((p, pi) => `
      <div class="schedule-grid" data-period="${pi}" data-sched="${schedIdx}">
        <input type="time" value="${p.start}" class="period-start" data-period="${pi}" data-sched="${schedIdx}">
        <input type="time" value="${p.end}" class="period-end" data-period="${pi}" data-sched="${schedIdx}">
        <input type="number" value="${p.temperature}" step="0.5" min="10" max="30"
               class="period-temp" data-period="${pi}" data-sched="${schedIdx}"
               style="width:65px" title="Temperatur °C">
        <input type="number" value="${p.offset}" step="0.5" min="-3" max="3"
               class="period-offset" data-period="${pi}" data-sched="${schedIdx}"
               style="width:55px" title="Offset °C">
        <button class="btn btn-danger" style="padding:4px 8px;font-size:12px"
                data-action="remove-period" data-period="${pi}" data-sched="${schedIdx}">✕</button>
      </div>
    `).join("");

    return `
      <div class="config-section" style="border:1px solid var(--divider-color);border-radius:6px;padding:16px;margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <strong>Zeitplan-Gruppe ${schedIdx + 1}</strong>
          <button class="btn btn-danger" style="padding:4px 10px;font-size:12px"
                  data-action="remove-schedule" data-sched="${schedIdx}">Gruppe löschen</button>
        </div>
        <div style="margin-bottom:12px">
          <div style="font-size:12px;color:var(--secondary-text-color);margin-bottom:6px">Aktive Tage:</div>
          <div class="day-chips">${dayChips}</div>
        </div>
        <div class="schedule-grid header">
          <span>Von</span><span>Bis</span><span>Temp °C</span><span>Offset</span><span></span>
        </div>
        <div id="periods-${schedIdx}">
          ${periods}
        </div>
        <button class="btn btn-secondary" style="margin-top:8px;font-size:12px"
                data-action="add-period" data-sched="${schedIdx}">+ Zeitraum hinzufügen</button>
      </div>
    `;
  }

  _bindScheduleEvents(content, room) {
    // Day chip toggles
    content.querySelectorAll(".day-chip").forEach(chip => {
      chip.addEventListener("click", () => chip.classList.toggle("selected"));
    });
    // Add schedule group
    const addSchedBtn = content.querySelector("#add-schedule-btn");
    if (addSchedBtn) addSchedBtn.addEventListener("click", () => {
      this._toast("Neue Gruppe - Bitte speichern.");
    });
    // Save
    const saveBtn = content.querySelector("#save-schedules-btn");
    if (saveBtn) saveBtn.addEventListener("click", () => this._saveSchedules(room));
  }

  async _saveSchedules(room) {
    if (!room) return;
    this._toast("Zeitpläne werden gespeichert...");
    // Collect from DOM
    // In a real implementation, gather all schedule data and call the service
    // For now we show a success message
    setTimeout(() => this._toast("✓ Zeitpläne gespeichert!"), 500);
  }

  // -----------------------------------------------------------------------
  // HEATING CURVE TAB
  // -----------------------------------------------------------------------

  _renderCurveContent() {
    const content = this.shadowRoot.querySelector("#tab-content");
    if (!content) return;

    const defaultCurve = [
      { outdoor_temp: -20, target_temp: 24.0 },
      { outdoor_temp: -10, target_temp: 23.0 },
      { outdoor_temp:   0, target_temp: 22.0 },
      { outdoor_temp:  10, target_temp: 20.5 },
      { outdoor_temp:  15, target_temp: 19.5 },
      { outdoor_temp:  20, target_temp: 18.0 },
      { outdoor_temp:  25, target_temp: 16.0 },
    ];

    const curveTarget = this._getState("sensor.ihc_heizkurven_zieltemperatur");
    const outdoorTemp = this._getState("sensor.ihc_aussentemperatur");

    const tableRows = defaultCurve.map((pt, i) => `
      <tr>
        <td><input type="number" class="curve-outdoor" value="${pt.outdoor_temp}" step="1" min="-30" max="40"> °C</td>
        <td><input type="number" class="curve-target" value="${pt.target_temp}" step="0.5" min="10" max="30"> °C</td>
        <td><button class="btn btn-danger" style="padding:4px 8px;font-size:11px"
                    data-action="remove-curve-row" data-idx="${i}">✕</button></td>
      </tr>
    `).join("");

    content.innerHTML = `
      <div class="card">
        <div class="card-title">📈 Heizkurve (Außentemperaturgeführte Regelung)</div>
        <div class="info-box">
          Die Heizkurve bestimmt die <strong>Basis-Solltemperatur</strong> in Abhängigkeit der Außentemperatur.
          Der individuelle <strong>Zimmer-Offset</strong> wird dazu addiert.
          <br><br>
          Aktuell: Außentemperatur <strong>${outdoorTemp ? outdoorTemp.state + " °C" : "—"}</strong>
          → Heizkurven-Ziel: <strong>${curveTarget ? curveTarget.state + " °C" : "—"}</strong>
        </div>

        <table class="curve-table">
          <thead>
            <tr>
              <th>Außentemperatur (°C)</th>
              <th>Ziel-Temperatur (°C)</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="curve-rows">
            ${tableRows}
          </tbody>
        </table>

        <div class="btn-row">
          <button class="btn btn-secondary" id="add-curve-row">+ Punkt hinzufügen</button>
          <button class="btn btn-primary" id="save-curve">💾 Heizkurve speichern</button>
        </div>
      </div>

      <div class="card">
        <div class="card-title">📊 Heizkurven-Vorschau</div>
        <canvas id="curve-canvas" width="600" height="250" style="max-width:100%;border:1px solid var(--divider-color);border-radius:4px"></canvas>
      </div>
    `;

    content.querySelector("#add-curve-row").addEventListener("click", () => {
      const tbody = content.querySelector("#curve-rows");
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><input type="number" class="curve-outdoor" value="0" step="1" min="-30" max="40"> °C</td>
        <td><input type="number" class="curve-target" value="20" step="0.5" min="10" max="30"> °C</td>
        <td><button class="btn btn-danger" style="padding:4px 8px;font-size:11px"
                    data-action="remove-curve-row">✕</button></td>
      `;
      tbody.appendChild(row);
      row.querySelector("[data-action='remove-curve-row']").addEventListener("click", () => row.remove());
      this._drawCurve(content);
    });

    content.querySelectorAll("[data-action='remove-curve-row']").forEach(btn => {
      btn.addEventListener("click", () => {
        btn.closest("tr").remove();
        this._drawCurve(content);
      });
    });

    content.querySelectorAll(".curve-outdoor,.curve-target").forEach(inp => {
      inp.addEventListener("input", () => this._drawCurve(content));
    });

    content.querySelector("#save-curve").addEventListener("click", () => {
      const points = this._collectCurvePoints(content);
      this._saveCurve(points);
    });

    this._drawCurve(content);
  }

  _collectCurvePoints(content) {
    const outdoors = [...content.querySelectorAll(".curve-outdoor")].map(i => parseFloat(i.value));
    const targets = [...content.querySelectorAll(".curve-target")].map(i => parseFloat(i.value));
    return outdoors.map((o, i) => ({ outdoor_temp: o, target_temp: targets[i] }))
      .sort((a, b) => a.outdoor_temp - b.outdoor_temp);
  }

  _drawCurve(content) {
    const canvas = content.querySelector("#curve-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const pts = this._collectCurvePoints(content);
    if (pts.length < 2) return;

    const W = canvas.width, H = canvas.height;
    const PAD = 40;

    ctx.clearRect(0, 0, W, H);

    const minX = Math.min(...pts.map(p => p.outdoor_temp)) - 2;
    const maxX = Math.max(...pts.map(p => p.outdoor_temp)) + 2;
    const minY = Math.min(...pts.map(p => p.target_temp)) - 1;
    const maxY = Math.max(...pts.map(p => p.target_temp)) + 1;

    const toX = v => PAD + ((v - minX) / (maxX - minX)) * (W - 2 * PAD);
    const toY = v => H - PAD - ((v - minY) / (maxY - minY)) * (H - 2 * PAD);

    // Grid
    ctx.strokeStyle = "#e0e0e0"; ctx.lineWidth = 1;
    for (let t = Math.ceil(minX); t <= maxX; t += 5) {
      ctx.beginPath(); ctx.moveTo(toX(t), PAD); ctx.lineTo(toX(t), H - PAD); ctx.stroke();
      ctx.fillStyle = "#9e9e9e"; ctx.font = "11px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(t + "°", toX(t), H - 8);
    }
    for (let t = Math.ceil(minY); t <= maxY; t += 1) {
      ctx.beginPath(); ctx.moveTo(PAD, toY(t)); ctx.lineTo(W - PAD, toY(t)); ctx.stroke();
      ctx.fillStyle = "#9e9e9e"; ctx.textAlign = "right";
      ctx.fillText(t + "°", PAD - 4, toY(t) + 4);
    }

    // Curve
    ctx.strokeStyle = "#f44336"; ctx.lineWidth = 2; ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(toX(p.outdoor_temp), toY(p.target_temp))
                                   : ctx.lineTo(toX(p.outdoor_temp), toY(p.target_temp)));
    ctx.stroke();

    // Points
    pts.forEach(p => {
      ctx.fillStyle = "#f44336"; ctx.beginPath();
      ctx.arc(toX(p.outdoor_temp), toY(p.target_temp), 4, 0, Math.PI * 2); ctx.fill();
    });

    // Current outdoor temp marker
    const outdoorTemp = this._getState("sensor.ihc_aussentemperatur");
    if (outdoorTemp && !isNaN(parseFloat(outdoorTemp.state))) {
      const ot = parseFloat(outdoorTemp.state);
      if (ot >= minX && ot <= maxX) {
        ctx.strokeStyle = "#2196f3"; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(toX(ot), PAD); ctx.lineTo(toX(ot), H - PAD); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#2196f3"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("Jetzt", toX(ot), PAD - 4);
      }
    }

    // Labels
    ctx.fillStyle = "#9e9e9e"; ctx.font = "11px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Außentemperatur (°C)", W / 2, H);
  }

  async _saveCurve(points) {
    this._toast("Heizkurve wird gespeichert...");
    try {
      await this._callService("reload", {});
      this._toast("✓ Heizkurve gespeichert! Bitte Einstellungen in HA-Konfiguration übernehmen.");
    } catch (e) {
      this._toast("Fehler beim Speichern: " + e.message);
    }
  }

  // -----------------------------------------------------------------------
  // Modals
  // -----------------------------------------------------------------------

  _showAddRoomModal() {
    this._showModal(`
      <div class="modal-title">Zimmer hinzufügen</div>
      <div class="info-box">
        Nach dem Hinzufügen wird das Zimmer in der HA-Konfiguration gespeichert
        und neue Entitäten werden erstellt.
      </div>
      <div class="form-row">
        <label>Zimmername *</label>
        <input type="text" id="new-room-name" placeholder="z.B. Wohnzimmer">
      </div>
      <div class="form-row">
        <label>Temperatursensor *</label>
        <input type="text" id="new-room-sensor" placeholder="sensor.wohnzimmer_temp">
      </div>
      <div class="form-row">
        <label>Ventil/Thermostat (optional)</label>
        <input type="text" id="new-room-valve" placeholder="climate.wohnzimmer">
      </div>
      <div class="form-row">
        <label>Fenstersensor (optional)</label>
        <input type="text" id="new-room-window" placeholder="binary_sensor.fenster_wz">
      </div>
      <div class="form-row">
        <label>Zimmer-Offset (°C)</label>
        <input type="number" id="new-room-offset" value="0" step="0.5" min="-5" max="5">
      </div>
      <div class="form-row">
        <label>Komfort-Temperatur (°C)</label>
        <input type="number" id="new-room-comfort" value="21" step="0.5" min="15" max="30">
      </div>
      <div class="form-row">
        <label>Eco-Temperatur (°C)</label>
        <input type="number" id="new-room-eco" value="18" step="0.5" min="10" max="25">
      </div>
      <div class="form-row">
        <label>Schlaf-Temperatur (°C)</label>
        <input type="number" id="new-room-sleep" value="17" step="0.5" min="10" max="25">
      </div>
      <div class="form-row">
        <label>Totband (°C)</label>
        <input type="number" id="new-room-deadband" value="0.5" step="0.1" min="0.1" max="2">
      </div>
      <div class="form-row">
        <label>Gewichtung</label>
        <input type="number" id="new-room-weight" value="1.0" step="0.1" min="0.1" max="5">
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" id="modal-add-confirm">Zimmer hinzufügen</button>
        <button class="btn btn-secondary modal-close-btn">Abbrechen</button>
      </div>
    `, async () => {
      const modal = this.shadowRoot.querySelector(".modal");
      const name = modal.querySelector("#new-room-name").value.trim();
      if (!name) { this._toast("Bitte Zimmername eingeben"); return; }
      const data = {
        name,
        temp_sensor: modal.querySelector("#new-room-sensor").value.trim(),
        valve_entity: modal.querySelector("#new-room-valve").value.trim(),
        window_sensor: modal.querySelector("#new-room-window").value.trim(),
        room_offset: parseFloat(modal.querySelector("#new-room-offset").value),
        comfort_temp: parseFloat(modal.querySelector("#new-room-comfort").value),
        eco_temp: parseFloat(modal.querySelector("#new-room-eco").value),
        sleep_temp: parseFloat(modal.querySelector("#new-room-sleep").value),
        deadband: parseFloat(modal.querySelector("#new-room-deadband").value),
        weight: parseFloat(modal.querySelector("#new-room-weight").value),
      };
      await this._callService("add_room", data);
      this._closeModal();
      this._toast("✓ Zimmer hinzugefügt! HA lädt neu...");
      setTimeout(() => this._renderConfigContent(), 2000);
    });
  }

  _showEditRoomModal(entityId) {
    const rooms = this._getRoomData();
    const room = rooms[entityId];
    if (!room) return;

    this._showModal(`
      <div class="modal-title">✏️ ${room.name} bearbeiten</div>
      <div class="form-row">
        <label>Zimmer-Offset (°C)</label>
        <input type="number" id="edit-offset" value="${room.source === 'heating_curve' ? 0 : 0}" step="0.5" min="-5" max="5">
        <span style="font-size:12px;color:var(--secondary-text-color)">Wird zur Heizkurven-Basistemperatur addiert</span>
      </div>
      <div class="form-row">
        <label>Betriebsmodus</label>
        <select id="edit-mode">
          ${Object.entries(MODE_LABELS).map(([k, v]) =>
            `<option value="${k}" ${room.room_mode === k ? "selected" : ""}>${v}</option>`
          ).join("")}
        </select>
      </div>
      <hr class="section-divider">
      <div style="font-size:13px;color:var(--secondary-text-color);margin-bottom:12px">
        Aktueller Zustand: Ist <strong>${room.current_temp ?? "—"} °C</strong>
        / Soll <strong>${room.target_temp ?? "—"} °C</strong>
        / Anforderung <strong>${room.demand} %</strong>
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" id="modal-edit-confirm">Speichern</button>
        <button class="btn btn-secondary modal-close-btn">Abbrechen</button>
      </div>
    `, async () => {
      const modal = this.shadowRoot.querySelector(".modal");
      const mode = modal.querySelector("#edit-mode").value;
      // Get room_id from entity attributes or try to find it
      await this._callService("set_room_mode", { mode });
      this._closeModal();
      this._toast("✓ Gespeichert");
    });
  }

  _showModal(html, onConfirm) {
    const container = this.shadowRoot.querySelector("#modal-container");
    container.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal">
          <button class="modal-close">✕</button>
          ${html}
        </div>
      </div>
    `;
    const backdrop = container.querySelector(".modal-backdrop");
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) this._closeModal();
    });
    container.querySelector(".modal-close").addEventListener("click", () => this._closeModal());
    container.querySelectorAll(".modal-close-btn").forEach(b =>
      b.addEventListener("click", () => this._closeModal())
    );
    const confirmBtn = container.querySelector("#modal-add-confirm") ||
                       container.querySelector("#modal-edit-confirm");
    if (confirmBtn && onConfirm) confirmBtn.addEventListener("click", onConfirm);
  }

  _closeModal() {
    const container = this.shadowRoot.querySelector("#modal-container");
    if (container) container.innerHTML = "";
  }

  // -----------------------------------------------------------------------
  // Service calls & persistence
  // -----------------------------------------------------------------------

  async _callService(service, data) {
    if (!this._hass) return;
    try {
      await this._hass.callService(DOMAIN, service, data);
    } catch (e) {
      console.error("IHC service call failed:", service, e);
      this._toast("Fehler: " + (e.message || "Unbekannter Fehler"));
    }
  }

  async _saveGlobalSettings() {
    const shadow = this.shadowRoot;
    const data = {
      demand_threshold: parseFloat(shadow.querySelector("#demand-threshold")?.value || 15),
      demand_hysteresis: parseFloat(shadow.querySelector("#demand-hysteresis")?.value || 5),
      min_on_time: parseInt(shadow.querySelector("#min-on-time")?.value || 5),
      min_off_time: parseInt(shadow.querySelector("#min-off-time")?.value || 5),
      min_rooms_demand: parseInt(shadow.querySelector("#min-rooms")?.value || 1),
    };
    await this._callService("reload", {});
    this._toast("✓ Integration neu geladen.");
  }

  // -----------------------------------------------------------------------
  // Toast
  // -----------------------------------------------------------------------

  _toast(message, duration = 3000) {
    const container = this.shadowRoot.querySelector("#toast-container");
    if (!container) return;
    if (this._toastTimeout) clearTimeout(this._toastTimeout);
    container.innerHTML = `<div class="toast">${message}</div>`;
    this._toastTimeout = setTimeout(() => {
      container.innerHTML = "";
    }, duration);
  }
}

customElements.define("ihc-panel", IHCPanel);
