/**
 * 09_main.js
 * IHC Frontend – Web Component Class
 * Contains:
 *   PART A: class IHCPanel declaration, constructor, lifecycle methods,
 *           set hass(), _startAutoRefresh(), _render(), _updateActiveTab(), _renderTabContent()
 *   PART B (after all method files): class closing brace + customElements.define()
 *
 * Build note: build.py splits this file at the marker comment and inserts
 * method files (02-08) between Part A and Part B.
 */

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
    this._userInteracting = false;   // true while pointer/touch is held down
    // Local schedule data for editing (not yet saved)
    this._editingSchedules = {};
    this._selectedRoom = null;        // entity_id of room shown in detail view
    this._selectedRoomTab = "schedule"; // "schedule" | "calendar"
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this._render();
      return;
    }
    // NEVER re-render tabs on HA state pushes.
    // HA can fire state updates many times per second which would replace DOM
    // elements mid-click and prevent any button from working.
    // The _startAutoRefresh timer handles overview updates every 5 seconds.
    // All other tabs are only rendered when the user switches to them.

    // Safety net: if the content area is empty (e.g. after HA reconnect / panel
    // remount), schedule a re-render for the next animation frame so the user
    // doesn't see a permanent black screen.
    if (!this._pendingRender) {
      const content = this.shadowRoot?.querySelector("#tab-content");
      if (content && content.childElementCount === 0) {
        this._pendingRender = true;
        requestAnimationFrame(() => {
          this._pendingRender = false;
          if (this._hass) {
            try { this._renderTabContent(); } catch(e) { console.error("IHC recovery render error:", e); }
          }
        });
      }
    }
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
    // Track pointer interactions so we never rebuild DOM during a click.
    // On mobile, browsers delay the click event up to 300ms after pointerup
    // (double-tap prevention). We clear the flag after a 400ms grace period
    // so the 5s timer never re-renders the DOM in that window.
    const sr = this.shadowRoot;
    if (!this._interactionTracked) {
      this._interactionTracked = true;
      sr.addEventListener("pointerdown", () => {
        this._userInteracting = true;
        if (this._interactionTimer) clearTimeout(this._interactionTimer);
      }, true);
      const _clearInteraction = () => {
        if (this._interactionTimer) clearTimeout(this._interactionTimer);
        this._interactionTimer = setTimeout(() => { this._userInteracting = false; }, 400);
      };
      sr.addEventListener("pointerup",     _clearInteraction, true);
      sr.addEventListener("pointercancel", _clearInteraction, true);
    }
    this._refreshTimer = setInterval(() => {
      if (!this._hass || this._modalOpen || this._userInteracting) return;
      const content = this.shadowRoot?.querySelector("#tab-content");
      // Always re-render if the content area is empty (recovery from blank screen)
      const isEmpty = content && content.childElementCount === 0;
      if (isEmpty || this._activeTab === "overview" || this._activeTab === "diagnose") {
        try { this._renderTabContent(); } catch(e) { console.error("IHC refresh error:", e); }
      }
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

    // ── HA Standard Top Bar (sticky, opens sidebar on click) ──────────────
    if (!shadow.querySelector(".ha-topbar")) {
      const topbar = document.createElement("div");
      topbar.className = "ha-topbar";
      topbar.innerHTML = `
        <button class="menu-btn" id="ihc-menu-btn" title="Menü öffnen" aria-label="Menü öffnen">
          <svg viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
        </button>
        <span class="topbar-title">Intelligent Heating Control</span>
        <span class="topbar-version">v1.4</span>
      `;
      shadow.appendChild(topbar);
      // Fire the HA sidebar-toggle event (composed: true crosses shadow DOM)
      topbar.querySelector("#ihc-menu-btn").addEventListener("click", () => {
        this.dispatchEvent(new CustomEvent("hass-open-menu", { bubbles: true, composed: true }));
      });
    }

    if (!shadow.querySelector(".panel")) {
      const div = document.createElement("div");
      div.className = "panel";
      shadow.appendChild(div);
    }

    const panel = shadow.querySelector(".panel");

    // Build permanent structure (only once)
    panel.innerHTML = `
      <div class="tabs">
        <div class="tab" data-tab="overview">🏠 Dashboard</div>
        <div class="tab" data-tab="rooms">🚪 Zimmer</div>
        <div class="tab" data-tab="diagnose">📊 Übersicht</div>
        <div class="tab" data-tab="settings">⚙️ Einstellungen</div>
        <div class="tab" data-tab="curve">📈 Heizkurve</div>
      </div>
      <div id="tab-content"></div>
    `;

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
    // Clean up any entity picker dropdowns from the previous render before replacing content
    this._cleanupEntityPickers(content);
    try {
      switch (this._activeTab) {
        case "overview":   this._renderOverview(content); break;
        case "rooms":      this._renderRooms(content); break;
        case "diagnose":   this._renderDiagnose(content); break;
        case "settings":   this._renderSettings(content); break;
        case "curve":      this._renderCurve(content); break;
      }
    } catch(e) {
      console.error("IHC render error:", e);
      // Show recoverable error state instead of blank/black screen
      content.innerHTML = `<div class="info-box" style="color:var(--error-color,#ef5350)">
        ⚠️ Darstellungsfehler (${this._activeTab}): ${e.message || "Unbekannt"}<br>
        <small style="opacity:.7">Bitte Tab wechseln oder die Seite neu laden. Details in der Browser-Konsole.</small>
      </div>`;
    }
  }

  // ── Data Helpers ───────────────────────────────────────────────────────────


// === METHODS_INSERTED_HERE ===
  // (methods from 02_utils.js through 08_modals.js are inserted here by build.py)

}

customElements.define("ihc-panel", IHCPanel);
