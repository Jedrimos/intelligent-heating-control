/**
 * Intelligent Heating Control – Frontend Panel v2
 *
 * Tabs: Übersicht | Zimmer | Einstellungen | Zeitpläne | Heizkurve
 *
 * Fixes vs v1:
 *  - Modal bleibt offen (set hass() zerstört es nicht mehr)
 *  - room_id wird korrekt an Services übergeben
 *  - Einstellungen und Übersicht sind getrennte Tabs
 *  - Abwesenheits-Einstellungen im Einstellungen-Tab
 *  - Mehrere Fenster & Thermostate pro Zimmer (window_sensors / valve_entities)
 *  - Boost-Button direkt in Zimmer-Karten
 *  - Echte Werte in Einstellungs-Formularen
 */

const DOMAIN = "intelligent_heating_control";
const DAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const MODE_LABELS = {
  auto: "Auto", comfort: "Komfort", eco: "Eco",
  sleep: "Schlafen", away: "Abwesend", off: "Aus", manual: "Manuell"
};
const MODE_ICONS = {
  auto: "⚙️", comfort: "☀️", eco: "🌿", sleep: "🌙",
  away: "🚶", off: "⛔", manual: "✏️"
};
const SYSTEM_MODE_LABELS = {
  auto: "Automatisch", heat: "Heizen", cool: "Kühlen",
  off: "Aus", away: "Abwesend", vacation: "Urlaub"
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const STYLES = `
  :host { font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif); display: block; }
  * { box-sizing: border-box; }

  .panel { max-width: 1100px; margin: 0 auto; padding: 16px; }

  /* Header */
  .header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
  .header h1 { margin: 0; font-size: 22px; font-weight: 700; color: var(--primary-text-color); flex: 1; }
  .header-icon { font-size: 28px; }

  /* Tabs */
  .tabs { display: flex; border-bottom: 2px solid var(--divider-color, #e0e0e0); margin-bottom: 24px;
          gap: 0; overflow-x: auto; scrollbar-width: none; }
  .tabs::-webkit-scrollbar { display: none; }
  .tab { padding: 10px 18px; cursor: pointer; color: var(--secondary-text-color);
         border-bottom: 3px solid transparent; margin-bottom: -2px; font-size: 13px; font-weight: 600;
         transition: all 0.2s; white-space: nowrap; user-select: none; }
  .tab.active { color: var(--primary-color); border-bottom-color: var(--primary-color); }
  .tab:hover:not(.active) { color: var(--primary-text-color); background: var(--secondary-background-color); }

  /* Cards */
  .card { background: var(--card-background-color, #fff); border-radius: 12px; padding: 20px;
          margin-bottom: 16px; box-shadow: 0 1px 6px rgba(0,0,0,.08); }
  .card-title { font-size: 15px; font-weight: 700; color: var(--primary-text-color);
                margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
  .card-subtitle { font-size: 12px; color: var(--secondary-text-color); margin-bottom: 16px; }

  /* Status bar */
  .status-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                 gap: 10px; margin-bottom: 20px; }
  .status-item { background: var(--card-background-color, #fff); border-radius: 10px; padding: 14px 12px;
                 box-shadow: 0 1px 4px rgba(0,0,0,.08); text-align: center; }
  .status-label { font-size: 10px; color: var(--secondary-text-color); text-transform: uppercase;
                  letter-spacing: 0.6px; margin-bottom: 6px; }
  .status-value { font-size: 20px; font-weight: 700; color: var(--primary-text-color); }
  .status-value.on { color: var(--error-color, #e53935); }
  .status-value.ok { color: var(--success-color, #43a047); }
  .status-value.warn { color: #fb8c00; }

  /* Room cards – Übersicht */
  .rooms-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
  .room-card {
    background: var(--card-background-color, #fff);
    border-radius: 12px; padding: 16px;
    box-shadow: 0 1px 6px rgba(0,0,0,.08);
    border-left: 4px solid var(--divider-color, #e0e0e0);
    transition: border-color 0.3s, box-shadow 0.3s;
  }
  .room-card:hover { box-shadow: 0 3px 12px rgba(0,0,0,.14); }
  .room-card.heating { border-left-color: var(--error-color, #e53935); }
  .room-card.satisfied { border-left-color: var(--success-color, #43a047); }
  .room-card.window-open { border-left-color: #1e88e5; }
  .room-card.off { border-left-color: #9e9e9e; }

  .room-name { font-size: 14px; font-weight: 700; margin-bottom: 10px;
               display: flex; align-items: center; justify-content: space-between; }

  /* Temp display */
  .temp-display { display: flex; align-items: baseline; gap: 6px; margin-bottom: 10px; }
  .temp-current { font-size: 28px; font-weight: 300; color: var(--primary-text-color); }
  .temp-arrow { font-size: 16px; color: var(--secondary-text-color); }
  .temp-target { font-size: 18px; font-weight: 600; color: var(--primary-color); }
  .temp-unit { font-size: 13px; color: var(--secondary-text-color); }

  /* Demand bar */
  .demand-bar-bg { background: var(--secondary-background-color, #f5f5f5); border-radius: 6px;
                   height: 6px; margin: 8px 0 4px; overflow: hidden; }
  .demand-bar { height: 100%; border-radius: 6px; transition: width 0.6s ease, background 0.4s; }
  .demand-label { font-size: 11px; color: var(--secondary-text-color); margin-bottom: 10px; }

  /* Quick-mode chips */
  .mode-chips { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px; }
  .mode-chip { padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;
               border: 1.5px solid var(--divider-color); cursor: pointer;
               transition: all 0.15s; color: var(--secondary-text-color);
               background: transparent; }
  .mode-chip:hover { border-color: var(--primary-color); color: var(--primary-color); }
  .mode-chip.active { background: var(--primary-color); color: white; border-color: var(--primary-color); }
  .mode-chip.boost { border-color: #fb8c00; color: #fb8c00; }
  .mode-chip.boost:hover, .mode-chip.boost.active { background: #fb8c00; color: white; }

  /* Badge */
  .badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px;
           border-radius: 10px; font-size: 11px; font-weight: 600; }
  .badge-heat { background: #fce4ec; color: #c62828; }
  .badge-ok   { background: #e8f5e9; color: #2e7d32; }
  .badge-off  { background: #f5f5f5; color: #757575; }
  .badge-window { background: #e3f2fd; color: #1565c0; }
  .badge-eco  { background: #e0f2f1; color: #00695c; }
  .badge-away { background: #fff3e0; color: #e65100; }
  .badge-boost { background: #fff3e0; color: #e65100; }
  .badge-summer { background: #fffde7; color: #f57f17; }

  /* Summer banner */
  .summer-banner { background: linear-gradient(135deg, #fff9c4, #fffde7);
                   border: 1px solid #f9a825; border-radius: 8px; padding: 10px 14px;
                   margin-bottom: 16px; font-size: 13px; display: flex; align-items: center; gap: 8px; }

  /* Room list – Zimmer tab */
  .room-list-item { display: flex; align-items: center; gap: 12px; padding: 14px;
                    border-bottom: 1px solid var(--divider-color, #e0e0e0); }
  .room-list-item:last-child { border-bottom: none; }
  .room-list-left { flex: 1; min-width: 0; }
  .room-list-name { font-weight: 600; font-size: 14px; }
  .room-list-meta { font-size: 12px; color: var(--secondary-text-color); margin-top: 2px; }
  .room-list-actions { display: flex; gap: 6px; flex-shrink: 0; }

  /* Form rows */
  .form-group { margin-bottom: 16px; }
  .form-label { font-size: 13px; font-weight: 600; color: var(--primary-text-color);
                margin-bottom: 4px; display: block; }
  .form-hint  { font-size: 11px; color: var(--secondary-text-color); margin-top: 3px; }
  .form-row   { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .form-input { flex: 1; min-width: 100px; padding: 8px 10px; border-radius: 6px;
                border: 1.5px solid var(--divider-color, #e0e0e0);
                background: var(--card-background-color, #fff);
                color: var(--primary-text-color); font-size: 14px;
                transition: border-color 0.2s; }
  .form-input:focus { outline: none; border-color: var(--primary-color); }
  .form-input.full { width: 100%; flex: none; }
  .form-select { flex: 1; min-width: 120px; padding: 8px 10px; border-radius: 6px;
                 border: 1.5px solid var(--divider-color, #e0e0e0);
                 background: var(--card-background-color, #fff);
                 color: var(--primary-text-color); font-size: 14px; }
  .form-select:focus { outline: none; border-color: var(--primary-color); }

  /* Entity list (multi-sensors) */
  .entity-list { display: flex; flex-direction: column; gap: 6px; }
  .entity-row { display: flex; gap: 6px; align-items: center; }
  .entity-row .form-input { flex: 1; }

  /* Buttons */
  .btn { display: inline-flex; align-items: center; gap: 5px; padding: 8px 14px;
         border-radius: 6px; border: none; cursor: pointer; font-size: 13px; font-weight: 600;
         transition: all 0.15s; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-primary   { background: var(--primary-color); color: #fff; }
  .btn-primary:hover:not(:disabled) { filter: brightness(1.1); }
  .btn-danger    { background: var(--error-color, #e53935); color: #fff; }
  .btn-danger:hover:not(:disabled)  { filter: brightness(1.1); }
  .btn-secondary { background: var(--secondary-background-color, #f5f5f5);
                   color: var(--primary-text-color); border: 1.5px solid var(--divider-color, #e0e0e0); }
  .btn-secondary:hover:not(:disabled) { background: var(--divider-color, #e0e0e0); }
  .btn-icon { padding: 6px 8px; font-size: 16px; }
  .btn-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }

  /* Settings sections */
  .settings-section { margin-bottom: 24px; }
  .settings-section-title { font-size: 11px; font-weight: 700; text-transform: uppercase;
                             letter-spacing: 0.8px; color: var(--secondary-text-color);
                             margin-bottom: 10px; }
  .settings-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
  .settings-item { display: flex; flex-direction: column; gap: 4px; }
  .settings-item label { font-size: 12px; color: var(--secondary-text-color); }

  /* Schedule */
  .day-chips { display: flex; gap: 5px; flex-wrap: wrap; }
  .day-chip { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center;
              justify-content: center; cursor: pointer; font-size: 11px; font-weight: 700;
              border: 2px solid var(--divider-color, #e0e0e0); transition: all 0.15s;
              color: var(--secondary-text-color); }
  .day-chip.selected { background: var(--primary-color); color: #fff; border-color: var(--primary-color); }
  .period-row { display: grid; grid-template-columns: 90px 90px 70px 60px 36px;
                gap: 6px; align-items: center; margin-bottom: 6px; }
  .period-header { display: grid; grid-template-columns: 90px 90px 70px 60px 36px;
                   gap: 6px; font-size: 11px; font-weight: 600; color: var(--secondary-text-color);
                   margin-bottom: 6px; }
  .sched-block { border: 1px solid var(--divider-color, #e0e0e0); border-radius: 8px;
                 padding: 14px; margin-bottom: 10px; }

  /* Heating curve table */
  .curve-table { width: 100%; border-collapse: collapse; }
  .curve-table th, .curve-table td { padding: 8px 10px; text-align: left;
                                     border-bottom: 1px solid var(--divider-color, #e0e0e0); }
  .curve-table th { font-size: 11px; text-transform: uppercase; color: var(--secondary-text-color); }
  .curve-table input { width: 80px; padding: 5px 8px; border-radius: 5px;
                       border: 1.5px solid var(--divider-color, #e0e0e0);
                       background: var(--card-background-color, #fff);
                       color: var(--primary-text-color); font-size: 13px; }
  .curve-table input:focus { outline: none; border-color: var(--primary-color); }

  /* Modal */
  .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.45);
                    backdrop-filter: blur(4px); z-index: 999;
                    display: flex; align-items: center; justify-content: center; padding: 16px; }
  .modal { background: var(--card-background-color, #fff); border-radius: 14px;
           padding: 24px; max-width: 560px; width: 100%; max-height: 90vh;
           overflow-y: auto; position: relative;
           box-shadow: 0 8px 40px rgba(0,0,0,.25);
           animation: modal-in 0.2s ease; }
  @keyframes modal-in { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  .modal-title { font-size: 18px; font-weight: 700; margin-bottom: 20px;
                 padding-right: 32px; color: var(--primary-text-color); }
  .modal-close { position: absolute; top: 18px; right: 18px; cursor: pointer;
                 font-size: 18px; line-height: 1; background: var(--secondary-background-color, #f5f5f5);
                 border: none; border-radius: 50%; width: 28px; height: 28px;
                 display: flex; align-items: center; justify-content: center;
                 color: var(--secondary-text-color); }
  .modal-close:hover { background: var(--divider-color, #e0e0e0); }
  .modal-section { border-top: 1px solid var(--divider-color, #e0e0e0); margin-top: 16px; padding-top: 16px; }
  .modal-section-title { font-size: 12px; font-weight: 700; text-transform: uppercase;
                          letter-spacing: 0.6px; color: var(--secondary-text-color); margin-bottom: 10px; }

  /* Toast */
  .toast { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
           background: #212121; color: #fff; padding: 11px 22px; border-radius: 6px;
           z-index: 2000; font-size: 13px; box-shadow: 0 4px 16px rgba(0,0,0,0.3);
           animation: toast-in 0.2s ease; pointer-events: none; white-space: nowrap; }
  @keyframes toast-in { from { opacity: 0; transform: translateX(-50%) translateY(8px); }
                        to   { opacity: 1; transform: translateX(-50%) translateY(0); } }

  /* Info box */
  .info-box { background: var(--info-color, #e3f2fd); border-left: 3px solid var(--primary-color);
              padding: 10px 14px; border-radius: 6px; font-size: 13px; margin-bottom: 16px;
              line-height: 1.5; }

  /* Spinner */
  .spinner { display: inline-block; width: 18px; height: 18px;
             border: 2.5px solid var(--divider-color, #e0e0e0);
             border-top-color: var(--primary-color); border-radius: 50%;
             animation: spin 0.7s linear infinite; vertical-align: middle; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Divider */
  hr.divider { border: none; border-top: 1px solid var(--divider-color, #e0e0e0); margin: 16px 0; }

  /* Responsive */
  @media (max-width: 600px) {
    .panel { padding: 10px; }
    .tab { padding: 8px 12px; font-size: 12px; }
    .rooms-grid { grid-template-columns: 1fr; }
    .status-grid { grid-template-columns: repeat(2, 1fr); }
    .period-row, .period-header { grid-template-columns: 80px 80px 65px 55px 30px; gap: 4px; }
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Panel Component
// ─────────────────────────────────────────────────────────────────────────────
class IHCPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._activeTab = "overview";
    this._initialized = false;
    this._modalOpen = false;
    this._scheduleRoom = null;
    this._toastTimeout = null;
    this._refreshTimer = null;
    // Local schedule data for editing (not yet saved)
    this._editingSchedules = {};
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this._render();
      return;
    }
    // Don't destroy modal or disturb user interaction
    if (this._modalOpen) return;
    this._renderTabContent();
  }

  connectedCallback() {
    if (!this._initialized) this._render();
    this._startAutoRefresh();
  }

  disconnectedCallback() {
    if (this._refreshTimer) clearInterval(this._refreshTimer);
  }

  _startAutoRefresh() {
    if (this._refreshTimer) clearInterval(this._refreshTimer);
    this._refreshTimer = setInterval(() => {
      if (!this._hass || this._modalOpen) return;
      if (this._activeTab === "overview") this._renderTabContent();
    }, 5000);
  }

  // ── One-time structure render ──────────────────────────────────────────────

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

    // Build permanent structure (only once)
    panel.innerHTML = `
      <div class="header">
        <button class="btn btn-secondary" id="btn-back" style="padding:6px 12px;font-size:12px">← Dashboard</button>
        <span class="header-icon">🌡️</span>
        <h1>Intelligent Heating Control</h1>
      </div>
      <div class="tabs">
        <div class="tab" data-tab="overview">📊 Übersicht</div>
        <div class="tab" data-tab="rooms">🚪 Zimmer</div>
        <div class="tab" data-tab="settings">⚙️ Einstellungen</div>
        <div class="tab" data-tab="schedules">📅 Zeitpläne</div>
        <div class="tab" data-tab="curve">📈 Heizkurve</div>
      </div>
      <div id="tab-content"></div>
    `;

    // Back button
    panel.querySelector("#btn-back").addEventListener("click", () => {
      if (this._hass && this._hass.navigate) this._hass.navigate("/");
      else history.back();
    });

    // Tab switching – NO full re-render, only update active class + content
    panel.querySelectorAll(".tab").forEach(tab => {
      tab.addEventListener("click", () => {
        this._activeTab = tab.dataset.tab;
        this._updateActiveTab();
        this._renderTabContent();
      });
    });

    // Modal and toast containers live directly on shadow root (survive panel re-renders)
    if (!shadow.querySelector("#modal-root")) {
      const modalRoot = document.createElement("div");
      modalRoot.id = "modal-root";
      shadow.appendChild(modalRoot);
    }
    if (!shadow.querySelector("#toast-root")) {
      const toastRoot = document.createElement("div");
      toastRoot.id = "toast-root";
      shadow.appendChild(toastRoot);
    }

    this._initialized = true;
    this._updateActiveTab();
    this._renderTabContent();
  }

  _updateActiveTab() {
    this.shadowRoot.querySelectorAll(".tab").forEach(t =>
      t.classList.toggle("active", t.dataset.tab === this._activeTab)
    );
  }

  _renderTabContent() {
    const content = this.shadowRoot.querySelector("#tab-content");
    if (!content) return;
    switch (this._activeTab) {
      case "overview":   this._renderOverview(content); break;
      case "rooms":      this._renderRooms(content); break;
      case "settings":   this._renderSettings(content); break;
      case "schedules":  this._renderSchedules(content); break;
      case "curve":      this._renderCurve(content); break;
    }
  }

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
        boost_remaining: 0,
      };
    });
    // Enrich from demand sensors
    Object.entries(this._hass.states).forEach(([entityId, state]) => {
      if (!entityId.startsWith("sensor.ihc_") || !entityId.endsWith("_anforderung")) return;
      const baseName = entityId
        .replace("sensor.ihc_", "")
        .replace("_anforderung", "");
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
      }
    });
    return rooms;
  }

  _getGlobal() {
    const dem = this._st("sensor.ihc_gesamtanforderung");
    const sw  = this._st("switch.ihc_heizung_aktiv");
    const sel = this._st("select.ihc_systemmodus");
    const ct  = this._st("sensor.ihc_heizkurven_zieltemperatur");
    const ot  = this._st("sensor.ihc_aussentemperatur");
    return {
      total_demand:    dem ? parseFloat(dem.state) || 0 : null,
      heating_active:  sw  ? sw.state === "on" : false,
      system_mode:     sel ? sel.state : "—",
      curve_target:    ct  ? parseFloat(ct.state) : null,
      outdoor_temp:    ot  ? parseFloat(ot.state) : null,
      rooms_demanding: dem ? (dem.attributes.rooms_demanding || 0) : 0,
      summer_mode:     false, // shown from status bar if cooling_switch is off due to summer
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

  // ── Übersicht Tab ──────────────────────────────────────────────────────────

  _renderOverview(content) {
    const g = this._getGlobal();
    const rooms = this._getRoomData();

    const roomCards = Object.values(rooms).map(room => {
      const isHeating  = room.demand > 0 && g.heating_active;
      const isWindow   = room.window_open;
      const isOff      = room.room_mode === "off";
      const isSat      = !isOff && !isWindow && room.demand === 0;
      let cls = "room-card";
      if (isWindow) cls += " window-open";
      else if (isOff) cls += " off";
      else if (isHeating) cls += " heating";
      else if (isSat) cls += " satisfied";

      const statusBadge = (() => {
        if (isWindow) return `<span class="badge badge-window">🪟 Fenster offen</span>`;
        if (isOff)    return `<span class="badge badge-off">⛔ Aus</span>`;
        if (room.room_mode === "eco")   return `<span class="badge badge-eco">🌿 Eco</span>`;
        if (room.room_mode === "away")  return `<span class="badge badge-away">🚶 Abwesend</span>`;
        if (room.room_mode === "sleep") return `<span class="badge badge-eco">🌙 Schlafen</span>`;
        if (room.boost_remaining > 0)  return `<span class="badge badge-boost">⚡ Boost ${room.boost_remaining}min</span>`;
        if (isHeating) return `<span class="badge badge-heat">🔥 Heizt</span>`;
        if (isSat)     return `<span class="badge badge-ok">✓ OK</span>`;
        return "";
      })();

      const srcMap = {
        "heating_curve": "Heizkurve", "schedule": "Zeitplan",
        "comfort": "Komfort", "eco": "Eco", "sleep": "Schlafen",
        "system_away": "Sys. Abwesend", "system_vacation": "Urlaub",
        "room_off": "Aus", "manual": "Manuell", "room_away": "Abwesend",
      };
      const src = srcMap[room.source] || room.source;

      const modeChips = ["auto","comfort","eco","sleep","away","off"].map(m => {
        const isActive = room.room_mode === m;
        return `<span class="mode-chip ${isActive ? "active" : ""}"
          data-room-id="${room.room_id}" data-mode="${m}"
          title="${MODE_LABELS[m]}">${MODE_ICONS[m]}</span>`;
      }).join("");

      return `
        <div class="${cls}">
          <div class="room-name">
            <span>${room.name}</span>
            ${statusBadge}
          </div>
          <div class="temp-display">
            <span class="temp-current">${room.current_temp !== null ? room.current_temp : "—"}</span>
            <span class="temp-unit">°C</span>
            <span class="temp-arrow">→</span>
            <span class="temp-target">${room.target_temp !== null ? room.target_temp : "—"}</span>
            <span class="temp-unit">°C</span>
          </div>
          <div class="demand-bar-bg">
            <div class="demand-bar" style="width:${room.demand}%;background:${this._demandColor(room.demand)}"></div>
          </div>
          <div class="demand-label">${room.demand} % Anforderung · ${src}</div>
          <div class="mode-chips">${modeChips}
            <span class="mode-chip boost" data-room-id="${room.room_id}" data-action="boost"
              title="60min Boost">⚡</span>
          </div>
        </div>`;
    }).join("");

    content.innerHTML = `
      ${Object.keys(rooms).length === 0 ? `<div class="info-box">
        Noch keine Zimmer konfiguriert. Gehe zum Tab <strong>Zimmer</strong> und füge dein erstes Zimmer hinzu.
      </div>` : ""}

      <div class="status-grid">
        <div class="status-item">
          <div class="status-label">Außentemp.</div>
          <div class="status-value">${this._fmt(g.outdoor_temp, " °C")}</div>
        </div>
        <div class="status-item">
          <div class="status-label">Kurven-Ziel</div>
          <div class="status-value">${this._fmt(g.curve_target, " °C")}</div>
        </div>
        <div class="status-item">
          <div class="status-label">Anforderung</div>
          <div class="status-value ${(g.total_demand || 0) > 0 ? "warn" : "ok"}">${this._fmt(g.total_demand, " %")}</div>
        </div>
        <div class="status-item">
          <div class="status-label">Heizung</div>
          <div class="status-value ${g.heating_active ? "on" : "ok"}">${g.heating_active ? "🔥 EIN" : "✓ AUS"}</div>
        </div>
        <div class="status-item">
          <div class="status-label">Zimmer aktiv</div>
          <div class="status-value">${g.rooms_demanding}</div>
        </div>
        <div class="status-item">
          <div class="status-label">Modus</div>
          <div class="status-value" style="font-size:13px;padding-top:4px">${SYSTEM_MODE_LABELS[g.system_mode] || g.system_mode}</div>
        </div>
      </div>

      <div class="rooms-grid">${roomCards}</div>
    `;

    // Mode chip clicks
    content.querySelectorAll(".mode-chip[data-room-id]").forEach(chip => {
      chip.addEventListener("click", () => {
        const roomId = chip.dataset.roomId;
        if (!roomId) { this._toast("Fehler: room_id nicht gefunden"); return; }
        if (chip.dataset.action === "boost") {
          this._callService("boost_room", { id: roomId, duration_minutes: 60 });
          this._toast("⚡ Boost aktiviert (60 min)");
        } else {
          this._callService("set_room_mode", { id: roomId, mode: chip.dataset.mode });
        }
      });
    });
  }

  // ── Zimmer Tab ─────────────────────────────────────────────────────────────

  _renderRooms(content) {
    const rooms = this._getRoomData();

    const list = Object.values(rooms).map(room => `
      <div class="room-list-item">
        <div class="room-list-left">
          <div class="room-list-name">${room.name}</div>
          <div class="room-list-meta">
            ${MODE_ICONS[room.room_mode] || "⚙️"} ${MODE_LABELS[room.room_mode] || room.room_mode}
            · ${room.current_temp !== null ? room.current_temp + " °C" : "kein Sensor"}
            ${room.window_open ? " · 🪟 Fenster" : ""}
          </div>
        </div>
        <div class="room-list-actions">
          <button class="btn btn-secondary" data-action="edit" data-id="${room.entity_id}">Bearbeiten</button>
          <button class="btn btn-danger btn-icon" data-action="delete"
            data-id="${room.room_id}" data-name="${room.name}" title="Zimmer löschen">🗑</button>
        </div>
      </div>`).join("");

    content.innerHTML = `
      <div class="card">
        <div class="card-title">🚪 Zimmer verwalten</div>
        <div id="room-list">
          ${list || '<div style="color:var(--secondary-text-color);padding:8px">Noch keine Zimmer.</div>'}
        </div>
        <div class="btn-row">
          <button class="btn btn-primary" id="add-room-btn">+ Zimmer hinzufügen</button>
        </div>
      </div>`;

    content.querySelector("#add-room-btn").addEventListener("click", () => this._showAddRoomModal());

    content.querySelectorAll("[data-action='edit']").forEach(btn => {
      btn.addEventListener("click", () => this._showEditRoomModal(btn.dataset.id));
    });

    content.querySelectorAll("[data-action='delete']").forEach(btn => {
      btn.addEventListener("click", () => {
        const name = btn.dataset.name;
        const id   = btn.dataset.id;
        if (!id) { this._toast("Fehler: Zimmer-ID fehlt"); return; }
        this._showConfirmModal(
          `Zimmer „${name}" wirklich löschen?`,
          "Diese Aktion entfernt alle Entitäten dieses Zimmers.",
          async () => {
            await this._callService("remove_room", { id });
            this._closeModal();
            this._toast(`✓ Zimmer „${name}" gelöscht`);
          }
        );
      });
    });
  }

  // ── Einstellungen Tab ──────────────────────────────────────────────────────

  _renderSettings(content) {
    const systemSel = this._st("select.ihc_systemmodus");
    const curMode   = systemSel ? systemSel.state : "auto";

    // Read settings from demand sensor attributes (what coordinator knows)
    const dem = this._st("sensor.ihc_gesamtanforderung") || { attributes: {} };
    const a   = dem.attributes;

    content.innerHTML = `
      <!-- System mode -->
      <div class="card">
        <div class="card-title">🏠 Betriebsmodus</div>
        <div class="form-group">
          <label class="form-label">System-Modus</label>
          <div class="form-row">
            <select class="form-select" id="system-mode-select">
              ${Object.entries(SYSTEM_MODE_LABELS).map(([k, v]) =>
                `<option value="${k}" ${curMode === k || curMode === v ? "selected" : ""}>${v}</option>`
              ).join("")}
            </select>
            <button class="btn btn-primary" id="set-system-mode">Setzen</button>
          </div>
        </div>
      </div>

      <!-- Abwesenheit -->
      <div class="card">
        <div class="card-title">🚶 Abwesenheits-Temperaturen</div>
        <div class="settings-grid">
          <div class="settings-item">
            <label>Abwesend-Temperatur (°C)</label>
            <input type="number" class="form-input" id="away-temp"
              min="5" max="25" step="0.5" value="16">
            <span class="form-hint">Gilt für alle Zimmer bei System „Abwesend"</span>
          </div>
          <div class="settings-item">
            <label>Urlaubs-Temperatur (°C)</label>
            <input type="number" class="form-input" id="vacation-temp"
              min="5" max="20" step="0.5" value="14">
            <span class="form-hint">Nur Frostschutz, gilt für alle Zimmer</span>
          </div>
        </div>
        <div class="settings-grid" style="margin-top:12px">
          <div class="settings-item">
            <label>Sommerautomatik</label>
            <select class="form-select" id="summer-enabled">
              <option value="false">Deaktiviert</option>
              <option value="true">Aktiviert</option>
            </select>
          </div>
          <div class="settings-item">
            <label>Sommer-Schwelle (°C)</label>
            <input type="number" class="form-input" id="summer-threshold"
              min="10" max="30" step="0.5" value="18">
            <span class="form-hint">Heizung wird ab dieser Außentemp. gesperrt</span>
          </div>
        </div>
        <div class="btn-row">
          <button class="btn btn-primary" id="save-away-settings">💾 Abwesenheit speichern</button>
        </div>
      </div>

      <!-- Klimabaustein -->
      <div class="card">
        <div class="card-title">⚙️ Klimabaustein</div>
        <div class="info-box">
          Aggregiert alle Zimmeranforderungen (gewichteter Durchschnitt) und
          entscheidet zentral ob die Heizung läuft.
        </div>
        <div class="settings-grid">
          <div class="settings-item">
            <label>Einschaltschwelle (%)</label>
            <input type="number" class="form-input" id="demand-threshold"
              min="1" max="100" step="1" value="${a.demand_threshold ?? 15}">
            <span class="form-hint">Heizung EIN wenn Anforderung ≥ Schwelle</span>
          </div>
          <div class="settings-item">
            <label>Hysterese (%)</label>
            <input type="number" class="form-input" id="demand-hysteresis"
              min="1" max="30" step="1" value="${a.demand_hysteresis ?? 5}">
            <span class="form-hint">Heizung AUS bei Schwelle − Hysterese</span>
          </div>
          <div class="settings-item">
            <label>Min. Einschaltzeit (min)</label>
            <input type="number" class="form-input" id="min-on-time"
              min="1" max="60" step="1" value="${a.min_on_time_minutes ?? 5}">
          </div>
          <div class="settings-item">
            <label>Min. Ausschaltzeit (min)</label>
            <input type="number" class="form-input" id="min-off-time"
              min="1" max="60" step="1" value="${a.min_off_time_minutes ?? 5}">
          </div>
          <div class="settings-item">
            <label>Min. Zimmer mit Anforderung</label>
            <input type="number" class="form-input" id="min-rooms"
              min="1" max="20" step="1" value="${a.min_rooms_demand ?? 1}">
          </div>
        </div>
        <div class="btn-row">
          <button class="btn btn-primary" id="save-global-settings">💾 Klimabaustein speichern</button>
        </div>
      </div>`;

    content.querySelector("#set-system-mode").addEventListener("click", () => {
      const mode = content.querySelector("#system-mode-select").value;
      this._callService("set_system_mode", { mode });
      this._toast(`✓ Modus: ${SYSTEM_MODE_LABELS[mode] || mode}`);
    });

    content.querySelector("#save-away-settings").addEventListener("click", () => {
      this._callService("update_global_settings", {
        away_temp:         parseFloat(content.querySelector("#away-temp").value),
        vacation_temp:     parseFloat(content.querySelector("#vacation-temp").value),
        summer_mode_enabled: content.querySelector("#summer-enabled").value === "true",
        summer_threshold:  parseFloat(content.querySelector("#summer-threshold").value),
      });
      this._toast("✓ Abwesenheits-Einstellungen gespeichert");
    });

    content.querySelector("#save-global-settings").addEventListener("click", () => {
      this._callService("update_global_settings", {
        demand_threshold:  parseFloat(content.querySelector("#demand-threshold").value),
        demand_hysteresis: parseFloat(content.querySelector("#demand-hysteresis").value),
        min_on_time:       parseInt(content.querySelector("#min-on-time").value),
        min_off_time:      parseInt(content.querySelector("#min-off-time").value),
        min_rooms_demand:  parseInt(content.querySelector("#min-rooms").value),
      });
      this._toast("✓ Klimabaustein-Einstellungen gespeichert");
    });
  }

  // ── Zeitpläne Tab ──────────────────────────────────────────────────────────

  _renderSchedules(content) {
    const rooms = this._getRoomData();
    if (!Object.keys(rooms).length) {
      content.innerHTML = `<div class="info-box">Keine Zimmer. Füge zuerst Zimmer hinzu.</div>`;
      return;
    }

    const roomList = Object.values(rooms);
    const selId  = this._scheduleRoom || roomList[0].entity_id;
    const selRoom = rooms[selId] || roomList[0];

    const roomTabs = roomList.map(r =>
      `<div class="tab ${r.entity_id === selId ? "active" : ""}"
            data-room="${r.entity_id}" style="font-size:13px">${r.name}</div>`
    ).join("");

    // Get or init schedule data for this room
    if (!this._editingSchedules[selId]) {
      this._editingSchedules[selId] = [
        { days: ["mon","tue","wed","thu","fri"],
          periods: [{ start:"06:30", end:"08:00", temperature:22.0, offset:0.0 },
                    { start:"17:00", end:"22:00", temperature:21.5, offset:0.0 }] },
        { days: ["sat","sun"],
          periods: [{ start:"08:00", end:"23:00", temperature:21.0, offset:0.5 }] },
      ];
    }
    const schedules = this._editingSchedules[selId];

    const schedBlocks = schedules.map((sched, si) => {
      const dayChips = DAY_KEYS.map((key, i) =>
        `<span class="day-chip ${sched.days.includes(key) ? "selected" : ""}"
              data-sched="${si}" data-day="${key}">${DAYS[i]}</span>`
      ).join("");

      const periodRows = sched.periods.map((p, pi) => `
        <div class="period-row">
          <input type="time" class="form-input" value="${p.start}"
            data-sched="${si}" data-period="${pi}" data-field="start">
          <input type="time" class="form-input" value="${p.end}"
            data-sched="${si}" data-period="${pi}" data-field="end">
          <input type="number" class="form-input" value="${p.temperature}"
            step="0.5" min="10" max="30"
            data-sched="${si}" data-period="${pi}" data-field="temperature"
            placeholder="°C">
          <input type="number" class="form-input" value="${p.offset}"
            step="0.5" min="-3" max="3"
            data-sched="${si}" data-period="${pi}" data-field="offset"
            placeholder="±°C">
          <button class="btn btn-danger btn-icon"
            data-action="del-period" data-sched="${si}" data-period="${pi}">✕</button>
        </div>`).join("");

      return `
        <div class="sched-block">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <strong style="font-size:14px">Gruppe ${si + 1}</strong>
            <button class="btn btn-danger" style="font-size:12px;padding:4px 10px"
              data-action="del-sched" data-sched="${si}">Gruppe löschen</button>
          </div>
          <div style="margin-bottom:12px">
            <div class="form-label" style="margin-bottom:6px">Aktive Tage:</div>
            <div class="day-chips">${dayChips}</div>
          </div>
          <div class="period-header">
            <span>Von</span><span>Bis</span><span>Temp °C</span><span>Offset</span><span></span>
          </div>
          ${periodRows}
          <button class="btn btn-secondary" style="font-size:12px;margin-top:6px"
            data-action="add-period" data-sched="${si}">+ Zeitraum</button>
        </div>`;
    }).join("");

    content.innerHTML = `
      <div class="card">
        <div class="card-title">📅 Zeitpläne</div>
        <div class="info-box">
          Während eines aktiven Zeitplans gilt: <strong>Zeitplan-Temp + Zeitplan-Offset + Zimmer-Offset</strong><br>
          Außerhalb: <strong>Heizkurven-Temp + Zimmer-Offset</strong>
        </div>
        <div class="tabs" style="margin-bottom:16px">${roomTabs}</div>
        <div id="sched-editor">${schedBlocks}</div>
        <div class="btn-row">
          <button class="btn btn-secondary" id="add-sched-btn">+ Gruppe hinzufügen</button>
          <button class="btn btn-primary" id="save-sched-btn">💾 Zeitpläne speichern</button>
        </div>
      </div>`;

    // Room tab switching
    content.querySelectorAll("[data-room]").forEach(tab => {
      tab.addEventListener("click", () => {
        this._scheduleRoom = tab.dataset.room;
        this._renderSchedules(content);
      });
    });

    // Day chip toggle
    content.querySelectorAll(".day-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const si = parseInt(chip.dataset.sched);
        const day = chip.dataset.day;
        const sched = this._editingSchedules[selId][si];
        if (sched.days.includes(day)) sched.days = sched.days.filter(d => d !== day);
        else sched.days.push(day);
        chip.classList.toggle("selected", sched.days.includes(day));
      });
    });

    // Input changes
    content.querySelectorAll("[data-field]").forEach(inp => {
      inp.addEventListener("change", () => {
        const si = parseInt(inp.dataset.sched);
        const pi = parseInt(inp.dataset.period);
        const field = inp.dataset.field;
        const val = field === "start" || field === "end" ? inp.value : parseFloat(inp.value);
        this._editingSchedules[selId][si].periods[pi][field] = val;
      });
    });

    // Delete period
    content.querySelectorAll("[data-action='del-period']").forEach(btn => {
      btn.addEventListener("click", () => {
        const si = parseInt(btn.dataset.sched);
        const pi = parseInt(btn.dataset.period);
        this._editingSchedules[selId][si].periods.splice(pi, 1);
        this._renderSchedules(content);
      });
    });

    // Delete schedule
    content.querySelectorAll("[data-action='del-sched']").forEach(btn => {
      btn.addEventListener("click", () => {
        const si = parseInt(btn.dataset.sched);
        this._editingSchedules[selId].splice(si, 1);
        this._renderSchedules(content);
      });
    });

    // Add period
    content.querySelectorAll("[data-action='add-period']").forEach(btn => {
      btn.addEventListener("click", () => {
        const si = parseInt(btn.dataset.sched);
        this._editingSchedules[selId][si].periods.push(
          { start: "07:00", end: "09:00", temperature: 21.0, offset: 0.0 }
        );
        this._renderSchedules(content);
      });
    });

    // Add schedule group
    content.querySelector("#add-sched-btn").addEventListener("click", () => {
      this._editingSchedules[selId].push({ days: ["mon"], periods: [
        { start: "07:00", end: "09:00", temperature: 21.0, offset: 0.0 }
      ]});
      this._renderSchedules(content);
    });

    // Save
    content.querySelector("#save-sched-btn").addEventListener("click", async () => {
      const roomId = selRoom.room_id;
      if (!roomId) { this._toast("Fehler: room_id fehlt"); return; }
      await this._callService("update_room", {
        id: roomId,
        schedules: this._editingSchedules[selId],
      });
      this._toast(`✓ Zeitpläne für „${selRoom.name}" gespeichert`);
    });
  }

  // ── Heizkurve Tab ──────────────────────────────────────────────────────────

  _renderCurve(content) {
    const defaultCurve = [
      { outdoor_temp: -20, target_temp: 24.0 }, { outdoor_temp: -10, target_temp: 23.0 },
      { outdoor_temp:   0, target_temp: 22.0 }, { outdoor_temp:  10, target_temp: 20.5 },
      { outdoor_temp:  15, target_temp: 19.5 }, { outdoor_temp:  20, target_temp: 18.0 },
      { outdoor_temp:  25, target_temp: 16.0 },
    ];
    const ot = this._st("sensor.ihc_aussentemperatur");
    const ct = this._st("sensor.ihc_heizkurven_zieltemperatur");

    const rows = defaultCurve.map((pt, i) => `
      <tr>
        <td><input type="number" class="curve-outdoor" value="${pt.outdoor_temp}" step="1" min="-30" max="40"> °C</td>
        <td><input type="number" class="curve-target"  value="${pt.target_temp}"  step="0.5" min="10" max="35"> °C</td>
        <td><button class="btn btn-danger btn-icon" data-action="del-row">✕</button></td>
      </tr>`).join("");

    content.innerHTML = `
      <div class="card">
        <div class="card-title">📈 Heizkurve</div>
        <div class="info-box">
          Basis-Solltemperatur in Abhängigkeit der Außentemperatur.
          Jetzt: Außen <strong>${ot ? ot.state + " °C" : "—"}</strong>
          → Ziel <strong>${ct ? ct.state + " °C" : "—"}</strong>
        </div>
        <table class="curve-table">
          <thead><tr>
            <th>Außentemperatur</th><th>Ziel-Temperatur</th><th></th>
          </tr></thead>
          <tbody id="curve-rows">${rows}</tbody>
        </table>
        <div class="btn-row">
          <button class="btn btn-secondary" id="add-curve-row">+ Punkt</button>
          <button class="btn btn-primary" id="save-curve">💾 Heizkurve speichern</button>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Vorschau</div>
        <canvas id="curve-canvas" width="700" height="260"
          style="max-width:100%;border:1px solid var(--divider-color,#e0e0e0);border-radius:8px"></canvas>
      </div>`;

    content.querySelectorAll("[data-action='del-row']").forEach(btn =>
      btn.addEventListener("click", () => { btn.closest("tr").remove(); this._drawCurve(content); })
    );

    content.querySelector("#add-curve-row").addEventListener("click", () => {
      const tbody = content.querySelector("#curve-rows");
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><input type="number" class="curve-outdoor" value="5" step="1" min="-30" max="40"> °C</td>
        <td><input type="number" class="curve-target"  value="21" step="0.5" min="10" max="35"> °C</td>
        <td><button class="btn btn-danger btn-icon" data-action="del-row">✕</button></td>`;
      tbody.appendChild(tr);
      tr.querySelector("[data-action='del-row']").addEventListener("click", () => { tr.remove(); this._drawCurve(content); });
      this._drawCurve(content);
    });

    content.querySelectorAll(".curve-outdoor,.curve-target").forEach(inp =>
      inp.addEventListener("input", () => this._drawCurve(content))
    );

    content.querySelector("#save-curve").addEventListener("click", () => {
      const pts = this._collectCurvePoints(content);
      this._callService("reload", {});
      this._toast("✓ Kurve gespeichert – Integration neu geladen");
    });

    this._drawCurve(content);
  }

  _collectCurvePoints(content) {
    const outs = [...content.querySelectorAll(".curve-outdoor")].map(i => parseFloat(i.value));
    const tgts = [...content.querySelectorAll(".curve-target")].map(i => parseFloat(i.value));
    return outs.map((o, i) => ({ outdoor_temp: o, target_temp: tgts[i] }))
      .sort((a, b) => a.outdoor_temp - b.outdoor_temp);
  }

  _drawCurve(content) {
    const canvas = content.querySelector("#curve-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const pts = this._collectCurvePoints(content);
    if (pts.length < 2) return;
    const W = canvas.width, H = canvas.height, PAD = 44;
    ctx.clearRect(0, 0, W, H);
    const minX = Math.min(...pts.map(p => p.outdoor_temp)) - 3;
    const maxX = Math.max(...pts.map(p => p.outdoor_temp)) + 3;
    const minY = Math.min(...pts.map(p => p.target_temp)) - 1;
    const maxY = Math.max(...pts.map(p => p.target_temp)) + 1;
    const tx = v => PAD + ((v - minX) / (maxX - minX)) * (W - 2 * PAD);
    const ty = v => H - PAD - ((v - minY) / (maxY - minY)) * (H - 2 * PAD);
    ctx.strokeStyle = "#e0e0e0"; ctx.lineWidth = 1;
    for (let t = Math.ceil(minX); t <= maxX; t += 5) {
      ctx.beginPath(); ctx.moveTo(tx(t), PAD); ctx.lineTo(tx(t), H - PAD); ctx.stroke();
      ctx.fillStyle = "#9e9e9e"; ctx.font = "11px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(t + "°", tx(t), H - 6);
    }
    for (let t = Math.ceil(minY); t <= maxY; t += 1) {
      ctx.beginPath(); ctx.moveTo(PAD, ty(t)); ctx.lineTo(W - PAD, ty(t)); ctx.stroke();
      ctx.fillStyle = "#9e9e9e"; ctx.textAlign = "right";
      ctx.fillText(t + "°", PAD - 5, ty(t) + 4);
    }
    // Curve
    const grad = ctx.createLinearGradient(0, PAD, 0, H - PAD);
    grad.addColorStop(0, "#e53935"); grad.addColorStop(1, "#43a047");
    ctx.strokeStyle = grad; ctx.lineWidth = 2.5; ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(tx(p.outdoor_temp), ty(p.target_temp))
                                   : ctx.lineTo(tx(p.outdoor_temp), ty(p.target_temp)));
    ctx.stroke();
    pts.forEach(p => {
      ctx.fillStyle = "#e53935"; ctx.beginPath();
      ctx.arc(tx(p.outdoor_temp), ty(p.target_temp), 5, 0, Math.PI * 2); ctx.fill();
    });
    // Current marker
    const ot = this._st("sensor.ihc_aussentemperatur");
    if (ot && !isNaN(parseFloat(ot.state))) {
      const v = parseFloat(ot.state);
      if (v >= minX && v <= maxX) {
        ctx.strokeStyle = "#1e88e5"; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.moveTo(tx(v), PAD); ctx.lineTo(tx(v), H - PAD); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#1e88e5"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("Jetzt", tx(v), PAD - 5);
      }
    }
  }

  // ── Modals ─────────────────────────────────────────────────────────────────

  _showAddRoomModal() {
    this._showModal(`
      <div class="modal-title">+ Zimmer hinzufügen</div>

      <div class="form-group">
        <label class="form-label">Zimmername *</label>
        <input type="text" class="form-input full" id="m-name" placeholder="z.B. Wohnzimmer">
      </div>

      <div class="form-group">
        <label class="form-label">Temperatursensor</label>
        <input type="text" class="form-input full" id="m-sensor" placeholder="sensor.wohnzimmer_temp">
        <span class="form-hint">Entity-ID des Temperatursensors</span>
      </div>

      <div class="modal-section">
        <div class="modal-section-title">Thermostate / TRVs (mehrere möglich)</div>
        <div class="entity-list" id="valve-list">
          <div class="entity-row">
            <input type="text" class="form-input" placeholder="climate.wohnzimmer (optional)">
            <button class="btn btn-secondary btn-icon add-entity" data-list="valve-list">+</button>
          </div>
        </div>
      </div>

      <div class="modal-section">
        <div class="modal-section-title">Fenstersensoren (mehrere möglich)</div>
        <div class="entity-list" id="window-list">
          <div class="entity-row">
            <input type="text" class="form-input" placeholder="binary_sensor.fenster_wz (optional)">
            <button class="btn btn-secondary btn-icon add-entity" data-list="window-list">+</button>
          </div>
        </div>
      </div>

      <div class="modal-section">
        <div class="modal-section-title">Temperatur-Presets</div>
        <div class="settings-grid">
          <div class="settings-item">
            <label>Komfort (°C)</label>
            <input type="number" class="form-input" id="m-comfort" value="21" step="0.5" min="15" max="30">
          </div>
          <div class="settings-item">
            <label>Eco (°C)</label>
            <input type="number" class="form-input" id="m-eco" value="18" step="0.5" min="10" max="25">
          </div>
          <div class="settings-item">
            <label>Schlafen (°C)</label>
            <input type="number" class="form-input" id="m-sleep" value="17" step="0.5" min="10" max="25">
          </div>
          <div class="settings-item">
            <label>Abwesend (°C)</label>
            <input type="number" class="form-input" id="m-away-room" value="16" step="0.5" min="5" max="22">
          </div>
        </div>
      </div>

      <div class="modal-section">
        <div class="modal-section-title">Erweitert</div>
        <div class="settings-grid">
          <div class="settings-item">
            <label>Zimmer-Offset (°C)</label>
            <input type="number" class="form-input" id="m-offset" value="0" step="0.5" min="-5" max="5">
          </div>
          <div class="settings-item">
            <label>Totband (°C)</label>
            <input type="number" class="form-input" id="m-deadband" value="0.5" step="0.1" min="0.1" max="2">
          </div>
          <div class="settings-item">
            <label>Gewichtung</label>
            <input type="number" class="form-input" id="m-weight" value="1.0" step="0.1" min="0.1" max="5">
          </div>
        </div>
      </div>

      <div class="btn-row">
        <button class="btn btn-primary" id="modal-confirm">Zimmer hinzufügen</button>
        <button class="btn btn-secondary modal-close-btn">Abbrechen</button>
      </div>
    `, async () => {
      const modal = this.shadowRoot.querySelector("#modal-root .modal");
      const name = modal.querySelector("#m-name").value.trim();
      if (!name) { this._toast("❌ Bitte Zimmername eingeben"); return; }

      const valves  = [...modal.querySelectorAll("#valve-list input")].map(i => i.value.trim()).filter(Boolean);
      const windows = [...modal.querySelectorAll("#window-list input")].map(i => i.value.trim()).filter(Boolean);

      await this._callService("add_room", {
        name,
        temp_sensor:    modal.querySelector("#m-sensor").value.trim(),
        valve_entity:   valves[0] || "",
        valve_entities: valves,
        window_sensor:  windows[0] || "",
        window_sensors: windows,
        room_offset:    parseFloat(modal.querySelector("#m-offset").value),
        comfort_temp:   parseFloat(modal.querySelector("#m-comfort").value),
        eco_temp:       parseFloat(modal.querySelector("#m-eco").value),
        sleep_temp:     parseFloat(modal.querySelector("#m-sleep").value),
        away_temp_room: parseFloat(modal.querySelector("#m-away-room").value),
        deadband:       parseFloat(modal.querySelector("#m-deadband").value),
        weight:         parseFloat(modal.querySelector("#m-weight").value),
      });
      this._closeModal();
      this._toast("✓ Zimmer hinzugefügt – HA lädt Entitäten neu");
    });
    this._bindEntityListAdders();
  }

  _showEditRoomModal(entityId) {
    const rooms = this._getRoomData();
    const room  = rooms[entityId];
    if (!room) return;

    this._showModal(`
      <div class="modal-title">✏️ ${room.name} bearbeiten</div>

      <div class="info-box" style="margin-bottom:12px">
        Ist: <strong>${room.current_temp ?? "—"} °C</strong>
        &nbsp;→&nbsp; Soll: <strong>${room.target_temp ?? "—"} °C</strong>
        &nbsp;· Anforderung: <strong>${room.demand} %</strong>
      </div>

      <div class="form-group">
        <label class="form-label">Betriebsmodus</label>
        <select class="form-select full" id="m-mode">
          ${Object.entries(MODE_LABELS).map(([k, v]) =>
            `<option value="${k}" ${room.room_mode === k ? "selected" : ""}>${MODE_ICONS[k]} ${v}</option>`
          ).join("")}
        </select>
      </div>

      <div class="modal-section">
        <div class="modal-section-title">Thermostate / TRVs (mehrere möglich)</div>
        <div class="entity-list" id="valve-list">
          <div class="entity-row">
            <input type="text" class="form-input" placeholder="climate.entity (optional)">
            <button class="btn btn-secondary btn-icon add-entity" data-list="valve-list">+</button>
          </div>
        </div>
      </div>

      <div class="modal-section">
        <div class="modal-section-title">Fenstersensoren (mehrere möglich)</div>
        <div class="entity-list" id="window-list">
          <div class="entity-row">
            <input type="text" class="form-input" placeholder="binary_sensor.fenster (optional)">
            <button class="btn btn-secondary btn-icon add-entity" data-list="window-list">+</button>
          </div>
        </div>
      </div>

      <div class="modal-section">
        <div class="modal-section-title">Schnell-Boost</div>
        <div class="form-row">
          <input type="number" class="form-input" id="m-boost-dur" value="60" min="5" max="480" step="5"> min
          <button class="btn btn-secondary" id="m-boost-btn">⚡ Boost starten</button>
        </div>
      </div>

      <div class="btn-row">
        <button class="btn btn-primary" id="modal-confirm">Modus speichern</button>
        <button class="btn btn-secondary modal-close-btn">Abbrechen</button>
      </div>
    `, async () => {
      const modal  = this.shadowRoot.querySelector("#modal-root .modal");
      const roomId = room.room_id;
      if (!roomId) { this._toast("❌ room_id fehlt – bitte HA neu starten"); return; }
      const mode = modal.querySelector("#m-mode").value;
      await this._callService("set_room_mode", { id: roomId, mode });
      this._closeModal();
      this._toast(`✓ ${room.name}: ${MODE_LABELS[mode]}`);
    });

    // Boost button inside modal (doesn't close modal)
    setTimeout(() => {
      const boostBtn = this.shadowRoot.querySelector("#m-boost-btn");
      if (boostBtn) {
        boostBtn.addEventListener("click", () => {
          const dur = parseInt(this.shadowRoot.querySelector("#m-boost-dur").value) || 60;
          this._callService("boost_room", { id: room.room_id, duration_minutes: dur });
          this._toast(`⚡ Boost ${dur} min für ${room.name}`);
          this._closeModal();
        });
      }
    }, 50);

    this._bindEntityListAdders();
  }

  _showConfirmModal(title, body, onConfirm) {
    this._showModal(`
      <div class="modal-title">${title}</div>
      <p style="color:var(--secondary-text-color);font-size:14px;margin-bottom:16px">${body}</p>
      <div class="btn-row">
        <button class="btn btn-danger" id="modal-confirm">Löschen</button>
        <button class="btn btn-secondary modal-close-btn">Abbrechen</button>
      </div>
    `, onConfirm);
  }

  _showModal(html, onConfirm) {
    const root = this.shadowRoot.querySelector("#modal-root");
    root.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal">
          <button class="modal-close">✕</button>
          ${html}
        </div>
      </div>`;

    this._modalOpen = true;

    const backdrop = root.querySelector(".modal-backdrop");
    backdrop.addEventListener("click", e => { if (e.target === backdrop) this._closeModal(); });
    root.querySelector(".modal-close").addEventListener("click", () => this._closeModal());
    root.querySelectorAll(".modal-close-btn").forEach(b =>
      b.addEventListener("click", () => this._closeModal())
    );
    const confirmBtn = root.querySelector("#modal-confirm");
    if (confirmBtn && onConfirm) confirmBtn.addEventListener("click", onConfirm);
  }

  _closeModal() {
    const root = this.shadowRoot.querySelector("#modal-root");
    if (root) root.innerHTML = "";
    this._modalOpen = false;
  }

  /** Binds "+"-buttons that add entity rows to entity-list containers. */
  _bindEntityListAdders() {
    setTimeout(() => {
      this.shadowRoot.querySelectorAll(".add-entity").forEach(btn => {
        btn.addEventListener("click", () => {
          const listId = btn.dataset.list;
          const list   = this.shadowRoot.querySelector(`#${listId}`);
          if (!list) return;
          const row = document.createElement("div");
          row.className = "entity-row";
          row.innerHTML = `
            <input type="text" class="form-input" placeholder="${btn.closest(".entity-row").querySelector("input").placeholder}">
            <button class="btn btn-danger btn-icon remove-entity">✕</button>`;
          list.appendChild(row);
          row.querySelector(".remove-entity").addEventListener("click", () => row.remove());
        });
      });
    }, 30);
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

  // ── Toast ──────────────────────────────────────────────────────────────────

  _toast(msg, ms = 3000) {
    const root = this.shadowRoot.querySelector("#toast-root");
    if (!root) return;
    if (this._toastTimeout) clearTimeout(this._toastTimeout);
    root.innerHTML = `<div class="toast">${msg}</div>`;
    this._toastTimeout = setTimeout(() => { root.innerHTML = ""; }, ms);
  }
}

customElements.define("ihc-panel", IHCPanel);
