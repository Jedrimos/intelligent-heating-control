/**
 * 01_styles.css.js
 * IHC Frontend – Complete CSS Design System (v4)
 * Contains: STYLES template literal with all component styles
 */

const STYLES = `
  :host { font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif); display: block; }
  * { box-sizing: border-box; }

  /* ── HA Top Bar ───────────────────────────────────────────────────────────── */
  .ha-topbar {
    position: sticky; top: 0; z-index: 200;
    display: flex; align-items: center; gap: 4px;
    height: 56px; padding: 0 4px 0 0;
    background: var(--app-header-background-color, var(--primary-color));
    color: var(--app-header-text-color, #fff);
    box-shadow: 0 2px 6px rgba(0,0,0,.25);
  }
  .ha-topbar .menu-btn {
    display: flex; align-items: center; justify-content: center;
    width: 48px; height: 48px; flex-shrink: 0;
    background: none; border: none; cursor: pointer;
    color: inherit; border-radius: 50%;
    transition: background 0.15s;
  }
  .ha-topbar .menu-btn:hover { background: rgba(255,255,255,.12); }
  .ha-topbar .menu-btn svg { width: 24px; height: 24px; fill: currentColor; }
  .ha-topbar .topbar-title {
    flex: 1; font-size: 20px; font-weight: 400; letter-spacing: 0.005em;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .ha-topbar .topbar-version {
    font-size: 10px; opacity: .7; font-weight: 600;
    border: 1px solid rgba(255,255,255,.4); padding: 2px 7px;
    border-radius: 10px; flex-shrink: 0; margin-right: 8px;
  }

  /* ── Layout ─────────────────────────────────────────────────────────────── */
  .panel { max-width: 1100px; margin: 0 auto; padding: 16px 16px 32px; }

  /* ── Tabs ─────────────────────────────────────────────────────────────────── */
  .tabs {
    display: flex; gap: 2px; margin-bottom: 20px; padding: 3px;
    background: var(--secondary-background-color, #f5f5f5);
    border-radius: 10px; overflow-x: auto; scrollbar-width: none;
  }
  .tabs::-webkit-scrollbar { display: none; }
  .tab {
    padding: 7px 14px; cursor: pointer; border-radius: 7px;
    color: var(--secondary-text-color); font-size: 12px; font-weight: 600;
    transition: all 0.15s; white-space: nowrap; user-select: none;
    background: transparent; border: none; flex-shrink: 0;
  }
  .tab.active {
    background: var(--card-background-color, #fff);
    color: var(--primary-color);
    box-shadow: 0 1px 4px rgba(0,0,0,.10);
  }
  .tab:hover:not(.active) { color: var(--primary-text-color); background: rgba(0,0,0,0.04); }

  /* ── Cards ─────────────────────────────────────────────────────────────────── */
  .card {
    background: var(--card-background-color, #fff); border-radius: 12px; padding: 18px 20px;
    margin-bottom: 14px; border: 1px solid var(--divider-color, #e5e5e5);
    box-shadow: 0 1px 3px rgba(0,0,0,.06);
  }
  .card-title {
    font-size: 14px; font-weight: 700; color: var(--primary-text-color);
    margin-bottom: 14px; display: flex; align-items: center; gap: 8px;
  }
  .card-subtitle { font-size: 12px; color: var(--secondary-text-color); margin-bottom: 14px; }

  /* ── Dashboard Hero ─────────────────────────────────────────────────────────── */
  .overview-hero {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 12px;
  }
  @media (max-width: 700px) { .overview-hero { grid-template-columns: 1fr 1fr; } }
  @media (max-width: 480px) { .overview-hero { grid-template-columns: 1fr; } }
  .hero-card {
    background: var(--card-background-color, #fff); border-radius: 12px; padding: 14px 16px;
    border: 1px solid var(--divider-color, #e5e5e5);
    box-shadow: 0 1px 3px rgba(0,0,0,.06);
    display: flex; flex-direction: column; gap: 3px;
    transition: background 0.4s;
  }
  .hero-card.state-heating { background: linear-gradient(135deg, rgba(239,83,80,.06) 0%, var(--card-background-color,#fff) 60%); border-color: rgba(239,83,80,.25); }
  .hero-card.state-ok { background: linear-gradient(135deg, rgba(102,187,106,.05) 0%, var(--card-background-color,#fff) 60%); }
  .hero-label {
    font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;
    color: var(--secondary-text-color); margin-bottom: 1px;
  }
  .hero-value { font-size: 24px; font-weight: 700; color: var(--primary-text-color); line-height: 1.15; }
  .hero-value.heating { color: #ef5350; }
  .hero-value.ok { color: #66bb6a; }
  .hero-value.warn { color: #ffa726; }
  .hero-sub { font-size: 11px; color: var(--secondary-text-color); }

  /* System mode quick-select pills */
  .system-mode-row {
    display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; align-items: center;
  }
  .system-mode-label {
    font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px;
    color: var(--secondary-text-color); margin-right: 2px; flex-shrink: 0;
  }
  .sysmode-pill {
    padding: 5px 11px; border-radius: 16px; font-size: 11px; font-weight: 600;
    border: 1.5px solid var(--divider-color, #e5e5e5); cursor: pointer;
    transition: all 0.15s; color: var(--secondary-text-color); background: transparent;
    display: inline-flex; align-items: center; gap: 3px; white-space: nowrap;
  }
  .sysmode-pill:hover { border-color: var(--primary-color); color: var(--primary-color); }
  .sysmode-pill.active-auto     { background: var(--primary-color); color: #fff; border-color: var(--primary-color); }
  .sysmode-pill.active-heat     { background: #ef5350; color: #fff; border-color: #ef5350; }
  .sysmode-pill.active-cool     { background: #42a5f5; color: #fff; border-color: #42a5f5; }
  .sysmode-pill.active-away     { background: #ffa726; color: #fff; border-color: #ffa726; }
  .sysmode-pill.active-vacation { background: #66bb6a; color: #fff; border-color: #66bb6a; }
  .sysmode-pill.active-off      { background: #9e9e9e; color: #fff; border-color: #9e9e9e; }
  .sysmode-pill.active-guest    { background: #ab47bc; color: #fff; border-color: #ab47bc; }

  /* ── Status strip ────────────────────────────────────────────────────────────── */
  .status-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px; margin-bottom: 16px;
  }
  .status-item {
    background: var(--card-background-color, #fff); border-radius: 10px; padding: 10px 12px;
    border: 1px solid var(--divider-color, #e5e5e5);
    box-shadow: 0 1px 2px rgba(0,0,0,.05); text-align: center;
  }
  .status-label {
    font-size: 10px; color: var(--secondary-text-color); text-transform: uppercase;
    letter-spacing: 0.6px; margin-bottom: 4px;
  }
  .status-value { font-size: 16px; font-weight: 700; color: var(--primary-text-color); }
  .status-value.on  { color: #ef5350; }
  .status-value.ok  { color: #66bb6a; }
  .status-value.warn { color: #ffa726; }

  /* ── Room cards ──────────────────────────────────────────────────────────────── */
  @keyframes ihc-heat-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.7; transform: scale(1.06); }
  }
  @keyframes ihc-glow {
    0%, 100% { box-shadow: 0 1px 4px rgba(0,0,0,.06); }
    50%       { box-shadow: 0 2px 12px rgba(239,83,80,.18); }
  }
  .rooms-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(275px, 1fr)); gap: 12px; }
  .room-card {
    background: var(--card-background-color, #fff); border-radius: 12px;
    border: 1px solid var(--divider-color, #e5e5e5);
    border-left: 4px solid var(--divider-color, #e0e0e0);
    box-shadow: 0 1px 4px rgba(0,0,0,.06);
    transition: box-shadow 0.2s, border-left-color 0.25s;
    overflow: hidden;
  }
  .room-card:hover { box-shadow: 0 4px 14px rgba(0,0,0,.11); }
  .room-card.heating     { border-left-color: #ef5350; animation: ihc-glow 3s ease-in-out infinite; }
  .room-card.satisfied   { border-left-color: #66bb6a; }
  .room-card.window-open { border-left-color: #42a5f5; }
  .room-card.off         { border-left-color: #bdbdbd; }
  .room-card.eco         { border-left-color: #26a69a; }
  .room-card.away        { border-left-color: #ffa726; }
  .room-card.sleep       { border-left-color: #5c6bc0; }

  /* Subtle state-aware inner tint */
  .room-card-inner { padding: 14px 16px 12px; }
  .room-card.heating   .room-card-inner { background: linear-gradient(160deg, rgba(239,83,80,.04) 0%, transparent 55%); }
  .room-card.satisfied .room-card-inner { background: linear-gradient(160deg, rgba(102,187,106,.04) 0%, transparent 55%); }
  .room-card.window-open .room-card-inner { background: linear-gradient(160deg, rgba(66,165,245,.04) 0%, transparent 55%); }

  /* Room header row */
  .room-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 8px; margin-bottom: 10px;
  }
  .room-name { font-size: 14px; font-weight: 700; color: var(--primary-text-color); line-height: 1.2; }
  .room-status-chips { display: flex; gap: 4px; flex-wrap: wrap; flex-shrink: 0; }

  /* Temperature hero */
  .room-temp-row {
    display: flex; align-items: flex-end; gap: 10px; margin-bottom: 8px;
  }
  .room-temp-current {
    display: flex; flex-direction: column;
  }
  .room-temp-big {
    font-size: 38px; font-weight: 300; color: var(--primary-text-color); line-height: 1;
    letter-spacing: -1px; transition: color 0.4s;
  }
  .room-card.heating .room-temp-big   { color: #ef5350; }
  .room-card.satisfied .room-temp-big { color: #43a047; }
  .room-temp-unit-big { font-size: 18px; font-weight: 400; color: var(--secondary-text-color); }
  .room-temp-lbl {
    font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px;
    color: var(--secondary-text-color); margin-top: 2px;
  }
  .room-temp-target {
    display: flex; flex-direction: column; align-items: flex-start;
    margin-bottom: 4px; min-width: 0;
  }
  .room-temp-target-val {
    font-size: 20px; font-weight: 700; color: var(--primary-color); line-height: 1.1;
  }
  .room-temp-target-lbl {
    font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px;
    color: var(--secondary-text-color);
  }
  .room-temp-diff {
    font-size: 11px; margin-left: 4px; line-height: 1.1;
  }

  /* Demand bar – taller, gradient fill */
  .demand-wrap { margin-bottom: 6px; }
  .demand-bar-bg {
    background: var(--secondary-background-color, #f0f0f0); border-radius: 5px;
    height: 7px; overflow: hidden; position: relative;
  }
  .demand-bar {
    height: 100%; border-radius: 5px;
    transition: width 0.7s cubic-bezier(.4,0,.2,1), background 0.4s;
  }
  .demand-meta {
    font-size: 10px; color: var(--secondary-text-color); margin-top: 4px;
    display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  }

  /* Alert strips within room card */
  .room-alerts { display: flex; flex-direction: column; gap: 3px; margin-bottom: 8px; }
  .room-alert {
    display: flex; align-items: center; gap: 5px; padding: 3px 8px;
    border-radius: 5px; font-size: 10px; font-weight: 600; line-height: 1.3;
  }
  .room-alert.alert-warn { background: #fff3e0; color: #e65100; }
  .room-alert.alert-info { background: #e3f2fd; color: #1565c0; }
  .room-alert.alert-danger { background: #fce4ec; color: #c62828; }
  .room-alert.alert-eco { background: #e8f5e9; color: #2e7d32; }
  .room-alert.alert-override { background: #fff8e1; color: #f57f17; }

  /* TRV chips */
  .trv-chips { display: flex; gap: 4px; flex-wrap: wrap; margin: 4px 0 6px; }
  .trv-chip {
    font-size: 10px; padding: 2px 7px; border-radius: 8px;
    display: inline-flex; align-items: center; gap: 3px;
  }

  /* Mode + boost action row */
  .room-action-row { display: flex; gap: 6px; align-items: center; padding-top: 8px;
                     border-top: 1px solid var(--divider-color, #e5e5e5); }
  .mode-select {
    flex: 1; padding: 5px 8px; border-radius: 8px; font-size: 11px; font-weight: 600;
    border: 1.5px solid var(--divider-color, #e0e0e0);
    background: var(--secondary-background-color, #f5f5f5);
    color: var(--primary-text-color); cursor: pointer; appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23888'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 8px center;
    padding-right: 22px; min-height: 32px;
  }
  .mode-select.active-auto     { border-color: var(--primary-color);  background: color-mix(in srgb, var(--primary-color) 12%, transparent); }
  .mode-select.active-comfort  { border-color: #fb8c00; background: color-mix(in srgb, #fb8c00 15%, transparent); }
  .mode-select.active-eco      { border-color: #43a047; background: color-mix(in srgb, #43a047 15%, transparent); }
  .mode-select.active-sleep    { border-color: #5c6bc0; background: color-mix(in srgb, #5c6bc0 15%, transparent); }
  .mode-select.active-away     { border-color: #e65100; background: color-mix(in srgb, #e65100 15%, transparent); }
  .mode-select.active-off      { border-color: #9e9e9e; background: color-mix(in srgb, #9e9e9e 15%, transparent); }
  .mode-select.active-manual   { border-color: #8d6e63; background: color-mix(in srgb, #8d6e63 15%, transparent); }
  .btn-boost {
    padding: 5px 10px; border-radius: 8px; border: 1.5px solid #ff7043;
    background: transparent; color: #ff7043; font-size: 11px; font-weight: 700;
    cursor: pointer; white-space: nowrap; transition: all 0.15s; flex-shrink: 0; min-height: 32px;
  }
  .btn-boost:hover { background: #ff7043; color: white; }

  /* Room footer info */
  .room-footer {
    display: flex; align-items: center; justify-content: space-between;
    margin-top: 6px; min-height: 18px;
  }
  .room-footer-meta { font-size: 10px; color: var(--secondary-text-color); }

  /* ── Badge / chips ────────────────────────────────────────────────────────── */
  .badge {
    display: inline-flex; align-items: center; gap: 3px; padding: 2px 7px;
    border-radius: 9px; font-size: 10px; font-weight: 700; line-height: 1.4;
  }
  .badge-heat   { background: #fce4ec; color: #c62828; animation: ihc-heat-pulse 2s ease-in-out infinite; }
  .badge-ok     { background: #e8f5e9; color: #2e7d32; }
  .badge-off    { background: #f0f0f0; color: #757575; }
  .badge-window { background: #e3f2fd; color: #1565c0; }
  .badge-eco    { background: #e0f2f1; color: #00695c; }
  .badge-away   { background: #fff3e0; color: #e65100; }
  .badge-boost  { background: #fbe9e7; color: #bf360c; animation: ihc-heat-pulse 1.5s ease-in-out infinite; }
  .badge-summer { background: #fffde7; color: #f57f17; }
  .badge-sleep  { background: #ede7f6; color: #4527a0; }

  /* ── System banners ─────────────────────────────────────────────────────── */
  .system-banner {
    display: flex; align-items: center; gap: 8px; padding: 9px 14px;
    border-radius: 8px; margin-bottom: 10px; font-size: 12px; font-weight: 600;
    border-left: 3px solid currentColor;
  }
  .system-banner.summer   { background: #fffde7; color: #f57f17; }
  .system-banner.night    { background: #e8eaf6; color: #3949ab; }
  .system-banner.away     { background: #fff8e1; color: #f57f17; }
  .system-banner.solar    { background: #fffde7; color: #f9a825; }
  .system-banner.cold     { background: #e8eaf6; color: #283593; }
  .system-banner.price    { background: #fce4ec; color: #c62828; }
  .system-banner.vacation { background: #e8f5e9; color: #2e7d32; }
  .system-banner.preheat  { background: #e3f2fd; color: #1565c0; }
  .system-banner.guest    { background: #fce4ec; color: #880e4f; }
  .system-banner.eta      { background: #e8f5e9; color: #2e7d32; }

  /* ── Room list (Zimmer-Tab) ─────────────────────────────────────────────── */
  .room-list-item {
    display: flex; align-items: center; gap: 12px; padding: 12px 16px;
    border-bottom: 1px solid var(--divider-color, #e5e5e5); cursor: default;
    transition: background 0.1s;
  }
  .room-list-item:hover { background: var(--secondary-background-color, #f9f9f9); }
  .room-list-item:last-child { border-bottom: none; }
  .room-list-indicator {
    width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
    background: var(--divider-color, #e0e0e0);
  }
  .room-list-indicator.heating { background: #ef5350; }
  .room-list-indicator.ok { background: #66bb6a; }
  .room-list-indicator.window { background: #42a5f5; }
  .room-list-indicator.off { background: #bdbdbd; }
  .room-list-left { flex: 1; min-width: 0; }
  .room-list-name { font-weight: 600; font-size: 14px; color: var(--primary-text-color); }
  .room-list-meta { font-size: 11px; color: var(--secondary-text-color); margin-top: 2px; }
  .room-list-actions { display: flex; gap: 5px; flex-shrink: 0; }

  /* ── Forms ──────────────────────────────────────────────────────────────── */
  .form-group { margin-bottom: 14px; }
  .form-label {
    font-size: 12px; font-weight: 600; color: var(--primary-text-color);
    margin-bottom: 5px; display: block;
  }
  .form-hint  { font-size: 11px; color: var(--secondary-text-color); margin-top: 4px; line-height: 1.45; }
  .form-row   { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .form-input {
    flex: 1; min-width: 90px; padding: 7px 10px; border-radius: 6px;
    border: 1.5px solid var(--divider-color, #e0e0e0);
    background: var(--card-background-color, #fff);
    color: var(--primary-text-color); font-size: 13px;
    transition: border-color 0.15s; line-height: 1.4;
  }
  .form-input:focus { outline: none; border-color: var(--primary-color);
                      box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color) 15%, transparent); }
  .form-input.full { width: 100%; flex: none; }
  .form-select {
    flex: 1; min-width: 120px; padding: 7px 10px; border-radius: 6px;
    border: 1.5px solid var(--divider-color, #e0e0e0);
    background: var(--card-background-color, #fff);
    color: var(--primary-text-color); font-size: 13px; cursor: pointer;
  }
  .form-select:focus { outline: none; border-color: var(--primary-color);
                       box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color) 15%, transparent); }

  /* Entity list */
  .entity-list { display: flex; flex-direction: column; gap: 5px; }
  .entity-row { display: flex; gap: 5px; align-items: center; }
  .entity-row .form-input { flex: 1; }

  /* ── Buttons ────────────────────────────────────────────────────────────── */
  .btn {
    display: inline-flex; align-items: center; gap: 5px; padding: 7px 14px;
    border-radius: 7px; border: none; cursor: pointer; font-size: 12px; font-weight: 600;
    transition: all 0.15s; line-height: 1.4; white-space: nowrap;
  }
  .btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .btn-primary   { background: var(--primary-color); color: #fff; }
  .btn-primary:hover:not(:disabled) { filter: brightness(1.08); }
  .btn-danger    { background: #ef5350; color: #fff; }
  .btn-danger:hover:not(:disabled)  { background: #e53935; }
  .btn-secondary {
    background: var(--secondary-background-color, #f5f5f5);
    color: var(--primary-text-color); border: 1.5px solid var(--divider-color, #e0e0e0);
  }
  .btn-secondary:hover:not(:disabled) { background: var(--divider-color, #e0e0e0); }
  .btn-icon { padding: 6px 8px; font-size: 15px; }
  .btn-row { display: flex; gap: 7px; flex-wrap: wrap; margin-top: 14px; }

  /* ── Settings sections ──────────────────────────────────────────────────── */
  .settings-section { margin-bottom: 20px; }
  .settings-section-title {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.9px; color: var(--secondary-text-color); margin-bottom: 10px;
  }
  .settings-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
  .settings-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .settings-item { display: flex; flex-direction: column; gap: 4px; }
  .settings-item label { font-size: 11px; font-weight: 600; color: var(--secondary-text-color); }

  /* Collapsible cards */
  details.ihc-card {
    background: var(--card-background-color,#fff); border-radius: 12px;
    margin-bottom: 12px; border: 1px solid var(--divider-color, #e5e5e5);
    box-shadow: 0 1px 3px rgba(0,0,0,.05); overflow: hidden;
  }
  details.ihc-card > summary {
    list-style: none; cursor: pointer; padding: 14px 18px;
    display: flex; align-items: center; justify-content: space-between;
    user-select: none; gap: 8px;
  }
  details.ihc-card > summary::-webkit-details-marker { display: none; }
  details.ihc-card > summary::after {
    content: "›"; font-size: 18px; color: var(--secondary-text-color);
    transition: transform 0.2s; flex-shrink: 0; line-height: 1;
  }
  details.ihc-card[open] > summary::after { transform: rotate(90deg); }
  details.ihc-card > summary:hover { background: var(--secondary-background-color, #f9f9f9); }
  .ihc-card-body { padding: 0 18px 18px; }
  .ihc-card-title {
    font-size: 14px; font-weight: 700; color: var(--primary-text-color);
    display: flex; align-items: center; gap: 7px; flex: 1;
  }
  .ihc-card-badge {
    font-size: 10px; padding: 2px 7px; border-radius: 8px; font-weight: 700;
    background: #66bb6a; color: white; margin-left: 4px;
  }
  .ihc-card-badge.warn { background: #ffa726; }
  .ihc-card-badge.info { background: var(--primary-color); }

  /* ── Schedule editor ────────────────────────────────────────────────────── */
  .day-chips { display: flex; gap: 4px; flex-wrap: wrap; }
  .day-chip {
    width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center;
    justify-content: center; cursor: pointer; font-size: 10px; font-weight: 700;
    border: 2px solid var(--divider-color, #e0e0e0); transition: all 0.15s;
    color: var(--secondary-text-color);
  }
  .day-chip.selected { background: var(--primary-color); color: #fff; border-color: var(--primary-color); }
  .period-row { display: grid; grid-template-columns: 90px 90px 70px 60px 34px;
                gap: 5px; align-items: center; margin-bottom: 5px; }
  .period-header { display: grid; grid-template-columns: 90px 90px 70px 60px 34px;
                   gap: 5px; font-size: 10px; font-weight: 700; color: var(--secondary-text-color);
                   margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.4px; }
  .sched-block {
    border: 1px solid var(--divider-color, #e0e0e0); border-radius: 8px;
    padding: 12px; margin-bottom: 8px; background: var(--secondary-background-color, #fafafa);
  }

  /* ── Heating curve ──────────────────────────────────────────────────────── */
  .curve-table { width: 100%; border-collapse: collapse; }
  .curve-table th, .curve-table td {
    padding: 8px 10px; text-align: left;
    border-bottom: 1px solid var(--divider-color, #e0e0e0);
  }
  .curve-table th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--secondary-text-color); }
  .curve-table input {
    width: 80px; padding: 5px 8px; border-radius: 5px;
    border: 1.5px solid var(--divider-color, #e0e0e0);
    background: var(--card-background-color, #fff);
    color: var(--primary-text-color); font-size: 13px;
  }
  .curve-table input:focus { outline: none; border-color: var(--primary-color); }

  /* ── Modal ──────────────────────────────────────────────────────────────── */
  .modal-backdrop {
    position: fixed; inset: 0; background: rgba(0,0,0,0.40);
    backdrop-filter: blur(5px); z-index: 999;
    display: flex; align-items: center; justify-content: center; padding: 16px;
  }
  .modal {
    background: var(--card-background-color, #fff); border-radius: 14px;
    padding: 22px 24px; max-width: 600px; width: 100%; max-height: 90vh;
    overflow-y: auto; position: relative;
    box-shadow: 0 10px 50px rgba(0,0,0,.22);
    animation: modal-in 0.18s ease;
    border: 1px solid var(--divider-color, #e5e5e5);
  }
  @keyframes modal-in { from { transform: scale(0.96) translateY(8px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
  .modal-title {
    font-size: 17px; font-weight: 700; margin-bottom: 18px;
    padding-right: 32px; color: var(--primary-text-color);
  }
  .modal-close {
    position: absolute; top: 16px; right: 16px; cursor: pointer;
    font-size: 16px; line-height: 1; background: var(--secondary-background-color, #f5f5f5);
    border: none; border-radius: 50%; width: 28px; height: 28px;
    display: flex; align-items: center; justify-content: center;
    color: var(--secondary-text-color); transition: background 0.15s;
  }
  .modal-close:hover { background: var(--divider-color, #e0e0e0); }
  .modal-section { border-top: 1px solid var(--divider-color, #e0e0e0); margin-top: 14px; padding-top: 14px; }
  .modal-section-title {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.8px; color: var(--secondary-text-color); margin-bottom: 10px;
  }
  .modal .settings-grid { grid-template-columns: 1fr; }
  .modal-collapsible { border-top: 1px solid var(--divider-color, #e0e0e0); margin-top: 14px; }
  .modal-collapsible > summary {
    padding: 12px 0; cursor: pointer; list-style: none;
    font-size: 11px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.7px; color: var(--secondary-text-color);
    display: flex; align-items: center; gap: 6px; user-select: none;
  }
  .modal-collapsible > summary::before { content: "▸"; font-size: 10px; transition: transform 0.15s; }
  .modal-collapsible[open] > summary::before { content: "▾"; }
  .modal-collapsible > summary:hover { color: var(--primary-color); }
  .modal-collapsible .modal-collapsible-body { padding-bottom: 4px; }

  /* ── Toast ──────────────────────────────────────────────────────────────── */
  .toast {
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    background: #1e1e1e; color: #fff; padding: 10px 20px; border-radius: 8px;
    z-index: 2000; font-size: 13px; font-weight: 500;
    box-shadow: 0 4px 20px rgba(0,0,0,.3);
    animation: toast-in 0.18s ease; pointer-events: none; white-space: nowrap;
  }
  @keyframes toast-in { from { opacity: 0; transform: translateX(-50%) translateY(6px); }
                        to   { opacity: 1; transform: translateX(-50%) translateY(0); } }

  /* ── Info / hint boxes ──────────────────────────────────────────────────── */
  .info-box {
    background: color-mix(in srgb, var(--primary-color) 8%, transparent);
    border-left: 3px solid var(--primary-color);
    padding: 9px 13px; border-radius: 6px; font-size: 12px; margin-bottom: 14px;
    line-height: 1.5; color: var(--primary-text-color);
  }

  /* ── Spinner ────────────────────────────────────────────────────────────── */
  .spinner {
    display: inline-block; width: 16px; height: 16px;
    border: 2px solid var(--divider-color, #e0e0e0);
    border-top-color: var(--primary-color); border-radius: 50%;
    animation: spin 0.7s linear infinite; vertical-align: middle;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  hr.divider { border: none; border-top: 1px solid var(--divider-color, #e0e0e0); margin: 14px 0; }

  /* Quick mode chips (legacy, kept for compat) */
  .mode-chips { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px; }
  .mode-chip {
    padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;
    border: 1.5px solid var(--divider-color); cursor: pointer; transition: all 0.15s;
    color: var(--secondary-text-color); background: transparent;
    display: inline-flex; align-items: center; gap: 3px;
  }
  .mode-chip:hover { border-color: var(--primary-color); color: var(--primary-color); }
  .mode-chip.active { background: var(--primary-color); color: white; border-color: var(--primary-color); }
  .mode-chip.boost { border-color: #ff7043; color: #ff7043; }
  .mode-chip.boost:hover, .mode-chip.boost.active { background: #ff7043; color: white; }

  /* ── Entity picker ──────────────────────────────────────────────────────── */
  .ep-wrap { position: relative; }
  .ep-dropdown {
    position: fixed; z-index: 99999;
    background: var(--card-background-color, #fff);
    border: 1.5px solid var(--primary-color);
    border-radius: 9px; box-shadow: 0 6px 24px rgba(0,0,0,.18);
    max-height: 280px; overflow-y: auto; min-width: 420px;
  }
  .ep-item {
    display: flex; align-items: center; gap: 8px; padding: 7px 10px; cursor: pointer;
    border-bottom: 1px solid var(--divider-color, #e0e0e0); transition: background 0.08s;
  }
  .ep-item:last-child { border-bottom: none; }
  .ep-item:hover, .ep-item.ep-focused { background: var(--secondary-background-color, #f5f5f5); }
  .ep-badge {
    font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 9px;
    white-space: nowrap; text-transform: lowercase; flex-shrink: 0;
  }
  .ep-d-sensor        { background: #e3f2fd; color: #1565c0; }
  .ep-d-climate       { background: #e0f2f1; color: #00695c; }
  .ep-d-switch        { background: #fff3e0; color: #e65100; }
  .ep-d-binary_sensor { background: #f3e5f5; color: #6a1b9a; }
  .ep-d-weather       { background: #e8f5e9; color: #2e7d32; }
  .ep-d-number        { background: #fce4ec; color: #880e4f; }
  .ep-d-input_boolean { background: #fff8e1; color: #f57f17; }
  .ep-d-person        { background: #e8eaf6; color: #283593; }
  .ep-d-device_tracker{ background: #e8eaf6; color: #283593; }
  .ep-d-other         { background: #f5f5f5; color: #616161; }
  .ep-info { flex: 1; min-width: 0; }
  .ep-name { font-size: 13px; font-weight: 600; color: var(--primary-text-color);
             overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ep-id   { font-size: 11px; color: var(--secondary-text-color);
             overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ep-state { font-size: 11px; font-weight: 600; color: var(--secondary-text-color);
              flex-shrink: 0; white-space: nowrap; margin-left: auto; }
  .ep-empty { padding: 12px; text-align: center; color: var(--secondary-text-color);
              font-size: 12px; font-style: italic; }

  /* ── Responsive ─────────────────────────────────────────────────────────── */
  @media (max-width: 600px) {
    .panel { padding: 10px 10px 28px; }
    .tabs { gap: 1px; }
    .tab { padding: 7px 10px; font-size: 11px; }
    .rooms-grid { grid-template-columns: 1fr; }
    .status-grid { grid-template-columns: repeat(2, 1fr); }
    .settings-grid, .settings-grid-2 { grid-template-columns: 1fr; }
    .period-row, .period-header { grid-template-columns: 80px 80px 65px 55px 30px; gap: 4px; }
    .btn { min-height: 42px; }
    .form-input, .form-select { min-height: 42px; font-size: 16px; }
    .card { padding: 12px 14px; }
    .overview-hero { grid-template-columns: 1fr 1fr; }
    .room-temp-big { font-size: 32px; }
  }
  @media (max-width: 400px) {
    .tab { padding: 6px 8px; font-size: 10px; }
    .overview-hero { grid-template-columns: 1fr; }
  }
`;
