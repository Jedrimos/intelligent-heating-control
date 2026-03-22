/**
 * 07_tab_curve.js
 * IHC Frontend – Heating Curve Tab
 * Contains: _renderCurve, _collectCurvePoints, _drawCurve
 */
  _renderCurve(content) {
    const defaultCurve = [
      { outdoor_temp: -20, target_temp: 24.0 }, { outdoor_temp: -10, target_temp: 23.0 },
      { outdoor_temp:   0, target_temp: 22.0 }, { outdoor_temp:  10, target_temp: 20.5 },
      { outdoor_temp:  15, target_temp: 19.5 }, { outdoor_temp:  20, target_temp: 18.0 },
      { outdoor_temp:  25, target_temp: 16.0 },
    ];
    const ot = this._st("sensor.ihc_aussentemperatur");
    const ct = this._st("sensor.ihc_heizkurven_zieltemperatur");

    // Load actual curve from sensor attributes (set by backend)
    const savedPoints = ct?.attributes?.curve_points;
    const curve = (savedPoints && savedPoints.length >= 2) ? savedPoints : defaultCurve;

    const rows = curve.map((pt, i) => `
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
      if (pts.length < 2) { this._toast("❌ Mindestens 2 Punkte erforderlich"); return; }
      this._callService("update_global_settings", { heating_curve: { points: pts } });
      this._toast("✓ Heizkurve gespeichert");
    });

    this._drawCurve(content);
  }

  _collectCurvePoints(content) {
    const outs = [...content.querySelectorAll(".curve-outdoor")].map(i => parseFloat(i.value));
    const tgts = [...content.querySelectorAll(".curve-target")].map(i => parseFloat(i.value));
    return outs
      .map((o, i) => ({ outdoor_temp: o, target_temp: tgts[i] }))
      .filter(p => !isNaN(p.outdoor_temp) && !isNaN(p.target_temp))
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

