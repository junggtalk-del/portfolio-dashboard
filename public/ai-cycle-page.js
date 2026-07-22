(function () {
  "use strict";

  // ============================================================
  // AI Cycle Intelligence — institutional strategy dashboard (READ-ONLY view).
  // Renders window.AIRotationEngine.compute(snapshot) + window.AICycleEnhance
  // derivations. Pure aggregation → safe to render on snapshot/holdings events.
  // No fetch, no price charts, no technical indicators. Every card expands "why".
  // ============================================================

  var ROOT_ID = "aiCycleRoot";
  var PALETTE = ["#38bdf8", "#34d399", "#a78bfa", "#f59e0b", "#f472b6", "#22d3ee", "#facc15", "#818cf8", "#fb923c", "#4ade80", "#64748b"];
  function palette(i) { return PALETTE[i % PALETTE.length]; }

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  function readSnapshot() { try { return (window.PortfolioDataSnapshot && window.PortfolioDataSnapshot.read && window.PortfolioDataSnapshot.read()) || null; } catch (e) { return null; } }
  function thb(v) { var n = Number(v); if (!isFinite(n) || n === 0) return "—"; return "฿" + (n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : n.toLocaleString("en-US", { maximumFractionDigits: 0 })); }

  var DIR = {
    in: { icon: "▲", label: "หมุนเข้า", cls: "aic-dir-in" }, hot: { icon: "●", label: "กลุ่มนำ", cls: "aic-dir-hot" },
    out: { icon: "▼", label: "หมุนออก", cls: "aic-dir-out" }, stable: { icon: "▬", label: "ทรงตัว", cls: "aic-dir-stable" }
  };
  var STATUS = { over: { label: "Overweight", cls: "aic-over" }, under: { label: "Underweight", cls: "aic-under" }, balanced: { label: "Balanced", cls: "aic-balanced" } };

  function ring(pct, size, label) {
    pct = Math.max(0, Math.min(100, pct == null ? 0 : pct)); size = size || 96;
    var col = pct >= 75 ? "#34d399" : pct >= 55 ? "#38bdf8" : pct >= 40 ? "#f59e0b" : "#94a3b8";
    return '<div class="aic-ring" style="width:' + size + 'px;height:' + size + 'px;background:conic-gradient(' + col + ' ' + (pct * 3.6) + 'deg,var(--mc-border) 0)">' +
      '<div class="aic-ring-hole"><b style="color:' + col + '">' + pct + '<span>%</span></b>' + (label ? '<small>' + esc(label) + "</small>" : "") + "</div></div>";
  }
  function bar(pct, tone) {
    pct = Math.max(0, Math.min(100, pct || 0));
    var col = tone === "rot" ? "linear-gradient(90deg,#38bdf8,#34d399)" : "linear-gradient(90deg,#a78bfa,#38bdf8)";
    return '<span class="aic-bar"><i style="width:' + pct + '%;background:' + col + '"></i></span>';
  }
  function why(list) {
    if (!list || !list.length) return "";
    return '<details class="aic-why"><summary>ทำไม?</summary><ul>' + list.map(function (w) { return "<li>" + esc(w) + "</li>"; }).join("") + "</ul></details>";
  }
  function sec(n, title, sub, body, extra) {
    return '<section class="aic-sec"><div class="aic-sec-head"><span class="aic-sec-n">' + n + '</span><div><h2>' + esc(title) + "</h2>" + (sub ? "<p>" + esc(sub) + "</p>" : "") + "</div>" + (extra || "") + "</div>" + body + "</section>";
  }
  function shortLayer(name) {
    var n = String(name);
    if (/Model/.test(n)) return "Models"; if (/Cloud/.test(n)) return "Cloud"; if (/GPU/.test(n)) return "GPU";
    if (/Networking/.test(n)) return "Net"; if (/Memory/.test(n)) return "Memory"; if (/Foundry/.test(n)) return "Foundry";
    if (/Equipment/.test(n)) return "Equip"; if (/Power/.test(n)) return "Power"; if (/Utility/.test(n)) return "Utility"; if (/Enterprise/.test(n)) return "Ent";
    return n.split(" ")[0];
  }

  // ---- Rotation Radar SVG ----
  function radar(axes) {
    var n = axes.length, cx = 180, cy = 162, r = 116;
    function pt(i, val, rad) { var a = -Math.PI / 2 + i * 2 * Math.PI / n; var rr = (rad != null ? rad : r) * Math.max(0, Math.min(100, val)) / 100; return [Math.round((cx + rr * Math.cos(a)) * 10) / 10, Math.round((cy + rr * Math.sin(a)) * 10) / 10]; }
    var rings = [25, 50, 75, 100].map(function (lvl) { return '<polygon points="' + axes.map(function (_, i) { return pt(i, lvl).join(","); }).join(" ") + '" class="aic-radar-ring"/>'; }).join("");
    var spokes = axes.map(function (_, i) { var p = pt(i, 100); return '<line x1="' + cx + '" y1="' + cy + '" x2="' + p[0] + '" y2="' + p[1] + '" class="aic-radar-spoke"/>'; }).join("");
    var rotPoly = axes.map(function (ax, i) { return pt(i, ax.rotation).join(","); }).join(" ");
    var expPoly = axes.map(function (ax, i) { return pt(i, ax.exposure).join(","); }).join(" ");
    var dots = axes.map(function (ax, i) { var p = pt(i, ax.rotation); var col = ax.direction === "in" ? "#34d399" : ax.direction === "out" ? "#f59e0b" : "#38bdf8"; return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="2.6" fill="' + col + '"/>'; }).join("");
    var labels = axes.map(function (ax, i) { var a = -Math.PI / 2 + i * 2 * Math.PI / n; var lx = cx + (r + 16) * Math.cos(a), ly = cy + (r + 16) * Math.sin(a); var anc = Math.abs(lx - cx) < 12 ? "middle" : lx < cx ? "end" : "start"; return '<text x="' + Math.round(lx) + '" y="' + Math.round(ly + 3) + '" text-anchor="' + anc + '" class="aic-radar-label">' + esc(shortLayer(ax.name)) + "</text>"; }).join("");
    return '<div class="aic-radar-wrap"><svg viewBox="0 0 360 336" class="aic-radar-svg">' + rings + spokes +
      '<polygon points="' + expPoly + '" class="aic-radar-exp"/><polygon points="' + rotPoly + '" class="aic-radar-rot"/>' + dots + labels + "</svg>" +
      '<div class="aic-radar-legend"><span><i class="aic-lg-rot"></i> แรงเงินหมุน (Rotation)</span><span><i class="aic-lg-exp"></i> สัดส่วนพอร์ตคุณ</span></div></div>';
  }

  // ---- AI Flow Map SVG (capital rotating left → right) ----
  function flowSVG(nodes) {
    var n = nodes.length, boxW = 106, boxH = 52, gap = 46, pad = 12, H = 90;
    var W = pad * 2 + n * boxW + (n - 1) * gap;
    var s = "";
    for (var i = 0; i < n - 1; i++) {
      var x1 = pad + (i + 1) * boxW + i * gap, x2 = x1 + gap, y = pad + boxH / 2;
      var th = Math.max(3, Math.min(20, nodes[i + 1].rotationScore / 4));
      var col = nodes[i + 1].direction === "in" ? "#34d399" : nodes[i + 1].direction === "hot" ? "#38bdf8" : "#94a3b8";
      s += '<path d="M' + x1 + " " + y + " L" + (x2 - 9) + " " + y + '" stroke="' + col + '" stroke-width="' + th + '" opacity="0.45" fill="none"/>';
      s += '<path d="M' + (x2 - 11) + " " + (y - 7) + " L" + x2 + " " + y + " L" + (x2 - 11) + " " + (y + 7) + ' Z" fill="' + col + '"/>';
    }
    nodes.forEach(function (nd, i) {
      var x = pad + i * (boxW + gap), y = pad;
      var col = nd.direction === "in" ? "#34d399" : nd.direction === "hot" ? "#38bdf8" : nd.direction === "out" ? "#f59e0b" : "#94a3b8";
      s += '<rect x="' + x + '" y="' + y + '" width="' + boxW + '" height="' + boxH + '" rx="11" class="aic-flow-box" stroke="' + col + '"/>' +
        '<text x="' + (x + boxW / 2) + '" y="' + (y + 21) + '" text-anchor="middle" class="aic-flow-name">' + esc(shortLayer(nd.name)) + "</text>" +
        '<text x="' + (x + boxW / 2) + '" y="' + (y + 40) + '" text-anchor="middle" class="aic-flow-conv" fill="' + col + '">' + nd.conviction + "</text>";
    });
    return '<div class="aic-flow-scroll"><svg viewBox="0 0 ' + W + " " + H + '" class="aic-flow-svg" preserveAspectRatio="xMinYMid meet">' + s + "</svg></div>";
  }

  // ============================================================ render
  function render() {
    var root = document.getElementById(ROOT_ID);
    if (!root) return;
    if (!window.AIRotationEngine || typeof window.AIRotationEngine.compute !== "function") { root.innerHTML = '<div class="mc-empty"><strong>AI Rotation Engine ไม่พร้อม</strong></div>'; return; }
    var snap = readSnapshot(), R, now = new Date().toISOString();
    try { R = window.AIRotationEngine.compute(snap || {}, { now: now }); }
    catch (e) { root.innerHTML = '<div class="mc-empty"><strong>คำนวณไม่สำเร็จ</strong><br>' + esc(String(e && e.message || e)) + "</div>"; return; }
    var X = window.AICycleEnhance, enh = null;
    if (X) {
      var heldSet = {};
      try { ((snap && snap.portfolioHoldings && snap.portfolioHoldings.data) || []).forEach(function (h) { if (h && h.isHolding !== false) { var t = String(h.canonicalSymbol || h.displaySymbol || h.symbol || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); if (t === "GOOG") t = "GOOGL"; if (t) heldSet[t] = true; } }); } catch (e) {}
      enh = { nc: X.newCapital(R), cv: X.conviction(R), fm: X.flowMap(R), dur: X.phaseDuration(R, now), pi: X.portfolioImpact(R), cd: X.concentrationDetail(R), roster: X.valueChainRoster(R, heldSet) };
      enh.st = X.strategy(R, enh.nc, enh.dur);
    }

    var html = heroSection(R, enh && enh.dur);
    if (enh) html += flowMapSection(R, enh.fm);
    html += capitalRotationSection(R);
    if (enh) html += convictionSection(R, enh.cv);
    html += rotationRadarSection(R) + valueChainSection(R, enh && enh.roster) + portfolioScoreSection(R);
    if (enh) html += newCapitalSection(R, enh.nc);
    html += exposureSection(R);
    html += enh ? concentrationSection(R, enh.cd) : "";
    if (enh) html += portfolioImpactSection(R, enh.pi);
    html += portfolioRotationSection(R) + opportunitySection(R) + timelineSection(R) + nextPhaseSection(R);
    if (enh) html += strategySection(enh.st);
    html += explainabilitySection(R, enh) + methodologyNote();
    root.innerHTML = html;
  }

  // ---- 1 · AI Supercycle Status (+ phase duration) ----
  function heroSection(R, dur) {
    var p = R.phase, durHtml = "";
    if (dur) {
      durHtml = '<div class="aic-phase-dur">' +
        (dur.elapsedDays != null ? "เข้าเฟสมา <b>" + dur.elapsedDays + " วัน</b> · " : "") +
        (dur.avgDays != null ? "ค่าเฉลี่ยในอดีต <b>" + dur.avgDays + " วัน</b> · " : "") +
        (dur.remainingDays != null ? "เหลือตามค่าเฉลี่ย <b>" + dur.remainingDays + " วัน</b>" : "") +
        ' <span class="aic-hist-tag">Historical Average Only</span>' +
        (dur.overrun ? '<div class="aic-dur-note">' + esc(dur.note) + "</div>" : "") + "</div>";
    }
    return '<section class="aic-hero"><div class="aic-hero-left">' +
      '<div class="aic-eyebrow">AI Supercycle · Strategic Command Center</div>' +
      '<div class="aic-phase-now">เฟสปัจจุบัน</div><h1 class="aic-phase-title">' + esc(p.current.name) + "</h1>" +
      '<p class="aic-phase-thesis">' + esc(p.current.thesis) + "</p>" +
      '<div class="aic-phase-next">เฟสถัดไปที่คาดการณ์ → <b>' + esc(p.next.name) + "</b></div>" + durHtml +
      why((dur ? dur.why : []).concat(p.why)) + "</div>" +
      '<div class="aic-hero-right">' + ring(p.confidence, 128, "Confidence") + '<div class="aic-evidence">หลักฐานเข้าเงื่อนไข ' + p.evidenceMet + "%</div></div></section>";
  }

  // ---- 2 · AI Flow Map ----
  function flowMapSection(R, fm) {
    return sec(2, "AI Flow Map", "แผนที่การไหลของเงินทุนระหว่างกลุ่ม — จากกลุ่มที่เงินหมุนออก (ซ้าย) สู่กลุ่มที่หมุนเข้า (ขวา) · ความหนาลูกศร = Rotation Score · ตัวเลข = Conviction",
      flowSVG(fm.nodes) + why(fm.why));
  }

  // ---- 3 · Capital Rotation ----
  function capitalRotationSection(R) {
    var rows = R.rotation.ranked.map(function (l, i) {
      var d = DIR[l.direction] || DIR.stable;
      return '<div class="aic-rot-row aic-rot-jump" data-jump="' + esc(l.key) + '" role="button" tabindex="0" title="ดูหุ้นในกลุ่ม ' + esc(l.name) + '"><span class="aic-rot-rank">' + (i + 1) + '</span><span class="aic-rot-name">' + esc(l.name) + "</span>" +
        '<span class="aic-rot-bar">' + bar(l.rotationScore, "rot") + '</span><span class="aic-rot-score">' + l.rotationScore + "</span>" +
        '<span class="aic-dir ' + d.cls + '">' + d.icon + " " + esc(l.trendLabel) + '</span><span class="aic-rot-go">›</span></div>';
    }).join("");
    return sec(3, "Capital Rotation", "จัดอันดับกลุ่มในห่วงโซ่ AI ตามแรงเงินที่หมุนเข้า — คลิกกลุ่มเพื่อกระโดดไปดูหุ้นในกลุ่มนั้นที่ AI Value Chain ทันที",
      '<div class="aic-rot-list">' + rows + "</div>" + why(R.rotation.why));
  }

  // ---- 4 · AI Conviction Score ----
  function convictionSection(R, cv) {
    var rows = cv.map(function (c) {
      return '<div class="aic-conv-row"><span class="aic-conv-name">' + esc(c.name) + "</span>" +
        '<span class="aic-conv-bar">' + bar(c.score, "rot") + '</span><span class="aic-conv-score">' + c.score + "</span>" +
        '<span class="aic-conv-lbl aic-conv-' + c.label.k + '">' + c.label.t + "</span>" +
        (c.drivers.length ? '<details class="aic-conv-why"><summary>drivers</summary><ul>' + c.drivers.map(function (d) { return "<li>" + esc(d) + "</li>"; }).join("") + "</ul></details>" : "") +
        "</div>";
    }).join("");
    return sec(4, "AI Conviction Score", "ความเชื่อมั่นเชิงกลยุทธ์ต่อแต่ละกลุ่ม (ไม่ใช่ price momentum) — ยิ่งสูงยิ่งมีหลักฐานเชิงโครงสร้างหนุน",
      '<div class="aic-conv-list">' + rows + "</div>" +
      why(["Conviction = 45% Rotation + 30% Cycle Score + 15% แรงดึงเฟสถัดไป + 10% ทิศทางการหมุน แล้วยืดสเกลให้เห็นความต่างชัด", "Extreme ≥90 · High ≥75 · Neutral ≥55 · Weak <55 — กด drivers ดูเหตุผลเชิงปัจจัยพื้นฐาน (ไม่ใช่เทคนิค)"]));
  }

  // ---- 5 · Rotation Radar ----
  function rotationRadarSection(R) {
    return sec(5, "Rotation Radar", "โมเมนตัมเงินทุนระหว่างกลุ่ม — เทียบ “แรงเงินหมุน” กับ “สัดส่วนพอร์ตคุณ” · ช่องที่แรงเงินกว้างแต่พอร์ตแคบ = โอกาสที่ยังไม่ได้ลงน้ำหนัก",
      radar(R.rotationRadar.axes) + why(R.rotationRadar.why));
  }

  // ---- 6 · AI Value Chain (5 related stocks ranked by impact + Current/Ideal/Diff) ----
  function valueChainSection(R, roster) {
    var layers = R.layers.slice().sort(function (a, b) { return a.order - b.order; });
    var rows = layers.map(function (l, i) {
      var d = DIR[l.direction] || DIR.stable;
      var list = (roster && roster[l.key]) || l.topCompanies.map(function (c) { return { ticker: c.ticker, name: c.name, score: c.finalPct, owned: c.owned, inUniverse: c.inUniverse }; });
      var top = '<div class="aic-vc-stocks"><div class="aic-vc-stocks-h">หุ้นที่เกี่ยวข้อง — เรียงตามความเกี่ยวข้องกับ AI Value Chain</div>' +
        list.slice(0, 5).map(function (co, ri) {
          return '<div class="aic-vc-stock' + (co.owned ? " aic-vc-stock-owned" : "") + '">' +
            '<span class="aic-vc-rank">' + (ri + 1) + "</span>" +
            '<span class="aic-vc-tk"><b>' + esc(co.ticker) + "</b>" + (co.owned ? ' <span class="aic-owned-tag">ถืออยู่</span>' : "") + (co.inUniverse ? ' <span class="aic-uni-tag">AI Boom</span>' : "") + "</span>" +
            '<span class="aic-vc-conm">' + esc(co.name) + "</span>" +
            '<span class="aic-vc-scbar">' + bar(co.score, "cyc") + "</span>" +
            '<span class="aic-vc-sc">' + co.score + "</span></div>";
        }).join("") + "</div>";
      var e = l.exposure, diffCls = e.diffPp > 0 ? "aic-diff-pos" : e.diffPp < 0 ? "aic-diff-neg" : "";
      var expLine = '<div class="aic-vc-exp"><span class="aic-vc-exp-lbl">Exposure</span><b>' + e.currentPct + '%</b><span class="aic-vc-exp-sep">/ เป้า</span><b>' + e.idealPct + '%</b>' +
        '<span class="aic-diff ' + diffCls + '">' + (e.diffPp > 0 ? "+" : "") + e.diffPp + "pp</span>" +
        '<span class="aic-badge ' + (STATUS[e.status] ? STATUS[e.status].cls : "") + '">' + (STATUS[e.status] ? STATUS[e.status].label : "") + "</span></div>";
      return '<div class="aic-vc-node" id="aic-vc-node-' + esc(l.key) + '">' + (i < layers.length - 1 ? '<span class="aic-vc-line"></span>' : "") +
        '<div class="aic-vc-card"><div class="aic-vc-top"><span class="aic-vc-order">' + l.order + '</span><b class="aic-vc-name">' + esc(l.name) + "</b>" +
        '<span class="aic-dir ' + d.cls + '">' + d.icon + " " + esc(l.trendLabel) + "</span></div>" +
        '<p class="aic-vc-thesis">' + esc(l.thesis) + "</p>" +
        '<div class="aic-vc-metrics"><div class="aic-metric"><span>Cycle Score</span>' + bar(l.cycleScore, "cyc") + "<b>" + l.cycleScore + "</b></div>" +
        '<div class="aic-metric"><span>Rotation</span>' + bar(l.rotationScore, "rot") + "<b>" + l.rotationScore + "</b></div></div>" +
        expLine + top + why(l.why) + "</div></div>";
    }).join("");
    return sec(6, "AI Value Chain", "ห่วงโซ่คุณค่า AI จากต้นน้ำถึงปลายน้ำ — แต่ละชั้นมี Cycle Score, Rotation, Exposure และหุ้นที่เกี่ยวข้อง 5 ตัว เรียงตาม “คะแนนความเกี่ยวข้องกับ AI Value Chain” (0-100 · ยิ่งเป็น pure-play ยิ่งสูง · ไม่เกี่ยวกับ valuation/hype)",
      '<div class="aic-vc">' + rows + "</div>");
  }

  // ---- 7 · AI Portfolio Score ----
  function portfolioScoreSection(R) {
    var p = R.portfolioScore;
    if (p.score == null) return sec(7, "AI Portfolio Score", "คะแนนรวมว่าพอร์ตวางตัวสอดคล้องกับวัฏจักร AI แค่ไหน",
      '<div class="aic-empty-inline">ยังไม่มี Holdings — เพิ่มในหน้า <a href="/portfolio">Portfolio Position</a> เพื่อคำนวณคะแนน</div>' + why(p.why));
    var comps = p.components.map(function (c) {
      return '<div class="aic-psc-comp"><div class="aic-psc-comp-head"><span>' + esc(c.label) + " <small>· " + c.weight + "%</small></span><b>" + c.value + "</b></div>" + bar(c.value, "cyc") + '<div class="aic-psc-desc">' + esc(c.desc) + "</div></div>";
    }).join("");
    return sec(7, "AI Portfolio Score", "พอร์ตวางตัวสอดคล้องกับวัฏจักร AI แค่ไหน — รวม Cycle + Rotation + Diversification",
      '<div class="aic-psc"><div class="aic-psc-ring">' + ring(p.score, 118, "เกรด " + p.grade) + "</div>" + '<div class="aic-psc-comps">' + comps + "</div></div>" + why(p.why),
      '<span class="aic-align-chip">' + p.score + " / 100 · " + p.grade + "</span>");
  }

  // ---- 8 · New Capital Allocation ----
  function newCapitalSection(R, nc) {
    var strip = nc.items.map(function (i, idx) { return '<span style="width:' + i.pct + "%;background:" + (i.key === "cash" ? "var(--mc-muted)" : palette(idx)) + '" title="' + esc(i.name) + " " + i.pct + '%"></span>'; }).join("");
    var rows = nc.items.map(function (i, idx) { return '<div class="aic-nc-row"><span class="aic-nc-dot" style="background:' + (i.key === "cash" ? "var(--mc-muted)" : palette(idx)) + '"></span><span class="aic-nc-name">' + esc(i.name) + '</span><span class="aic-nc-pct">' + i.pct + "%</span></div>"; }).join("");
    return sec(8, "New Capital Allocation", "ถ้ามีเงินใหม่วันนี้ ควรกระจายลงกลุ่มไหน — คำนวณจาก AI Cycle + Capital Rotation + Confidence (คนละเรื่องกับการขยับพอร์ตเดิม) · ไม่ใช่คำสั่งซื้อ",
      '<div class="aic-nc-strip">' + strip + '</div><div class="aic-nc-list">' + rows + "</div>" + why(nc.why));
  }

  // ---- 9 · Portfolio Exposure ----
  function exposureSection(R) {
    var e = R.exposure;
    if (!e.hasHoldings) return sec(9, "Portfolio Exposure", "เทียบสัดส่วนพอร์ตจริงกับสัดส่วนที่เหมาะกับวัฏจักร",
      '<div class="aic-empty-inline">ยังไม่มี Holdings — เพิ่มในหน้า <a href="/portfolio">Portfolio Position</a> เพื่อเทียบสัดส่วนจริง</div>');
    var rows = e.byLayer.map(function (x) {
      var s = STATUS[x.status];
      return '<div class="aic-exp-row"><span class="aic-exp-name">' + esc(x.name) + "</span>" +
        '<span class="aic-exp-track"><span class="aic-exp-sug" style="left:' + Math.min(x.suggestedPct, 100) + '%" title="เป้า ' + x.suggestedPct + '%"></span><i style="width:' + Math.min(x.currentPct, 100) + '%"></i></span>' +
        '<span class="aic-exp-nums">' + x.currentPct + "% <small>/ เป้า " + x.suggestedPct + "%</small></span><span class=\"aic-badge " + s.cls + '">' + s.label + "</span></div>";
    }).join("");
    return sec(9, "Portfolio Exposure", "สัดส่วนพอร์ต AI จริง (แท่ง) เทียบเป้าตามวัฏจักร (ขีด) · Alignment " + e.alignmentScore + "/100",
      '<div class="aic-exp-summary">มูลค่า AI ' + thb(e.totalAiValue) + (e.nonAiValue ? " · นอกธีม AI " + thb(e.nonAiValue) : "") + "</div>" +
      '<div class="aic-exp-list">' + rows + "</div>" +
      why(["Alignment " + e.alignmentScore + " = 100 − ผลรวมส่วนต่างสัดส่วนจริงกับเป้า ÷ 2", "ขีดคือสัดส่วนเป้าตามวัฏจักร · แท่งคือสัดส่วนจริงของคุณ"]),
      '<span class="aic-align-chip">Alignment ' + e.alignmentScore + "</span>");
  }

  // ---- 10 · AI Concentration Risk (over / under / missing / HHI / diversification) ----
  function concentrationSection(R, cd) {
    if (!cd.available) return sec(10, "AI Concentration Risk", "ความเสี่ยงกระจุกตัวของพอร์ต",
      '<div class="aic-empty-inline">ยังไม่มี Holdings</div>' + why(cd.why));
    var lvlCls = cd.level.key === "high" ? "aic-lvl-high" : cd.level.key === "medium" ? "aic-lvl-med" : "aic-lvl-low";
    function chips(arr, cls, fmt) { return arr.length ? arr.map(function (e) { return '<span class="aic-cl-chip ' + cls + '">' + esc(e.name) + (fmt ? fmt(e) : "") + "</span>"; }).join("") : '<span class="aic-cl-none">— ไม่มี —</span>'; }
    var metrics = '<div class="aic-cl-metrics">' +
      '<div class="aic-cl-metric"><span>Diversification</span><b>' + (cd.diversification == null ? "—" : cd.diversification + "/100") + "</b></div>" +
      '<div class="aic-cl-metric"><span>HHI</span><b>' + (cd.hhi == null ? "—" : cd.hhi) + "</b></div>" +
      '<div class="aic-cl-metric"><span>กระจายจริง</span><b>~' + cd.effectiveLayers + " กลุ่ม</b></div>" +
      '<div class="aic-cl-metric"><span>Risk Level</span><b class="' + lvlCls + '">' + cd.level.label + "</b></div></div>";
    var body = metrics +
      '<div class="aic-cl-group"><div class="aic-cl-lbl">Overweight (ถือหนักเกิน)</div><div class="aic-cl-chips">' + chips(cd.overweight, "aic-over", function (e) { return " +" + e.excessPp + "pp"; }) + "</div></div>" +
      '<div class="aic-cl-group"><div class="aic-cl-lbl">Underweight (ถือน้อยกว่าเป้า)</div><div class="aic-cl-chips">' + chips(cd.underweight, "aic-under", function (e) { return " " + e.driftPp + "pp"; }) + "</div></div>" +
      '<div class="aic-cl-group"><div class="aic-cl-lbl">Missing (ยังไม่มีในพอร์ต)</div><div class="aic-cl-chips">' + chips(cd.missing, "aic-miss") + "</div></div>";
    return sec(10, "AI Concentration Risk", "ความเสี่ยงกระจุกตัว — กลุ่มที่ถือหนักเกิน/น้อยเกิน/ยังไม่มี + Diversification, HHI และระดับความเสี่ยง",
      body + why(cd.why),
      '<span class="aic-align-chip ' + lvlCls + '">Risk ' + cd.score + " · " + cd.level.label + "</span>");
  }

  // ---- 11 · Portfolio Impact ----
  function portfolioImpactSection(R, pi) {
    if (!pi.available) return sec(11, "Portfolio Impact", "ผลกระทบถ้าไม่ปรับพอร์ต เทียบกับทิศทางเงินทุน",
      '<div class="aic-empty-inline">' + esc(pi.note) + "</div>");
    var cards = [pi.currentRisk, pi.futureOpportunity, pi.suggestedAdjustment].map(function (x, i) {
      return '<div class="aic-impact-card aic-impact-' + i + '"><b>' + esc(x.title) + "</b><p>" + esc(x.text) + "</p></div>";
    }).join("");
    return sec(11, "Portfolio Impact", "ถ้าไม่ปรับพอร์ต จะเกิดอะไรขึ้น เทียบกับทิศทางที่เงินทุนกำลังหมุน",
      '<div class="aic-impact-narr">' + esc(pi.narrative) + "</div>" + '<div class="aic-impact-grid">' + cards + "</div>" + why(pi.why));
  }

  // ---- 12 · Portfolio Rotation (actual flows + business drivers) ----
  function portfolioRotationSection(R) {
    var paths = R.rotationPaths || [], drivers = (window.AICycleEnhance && window.AICycleEnhance.BUSINESS_DRIVERS) || {}, body;
    if (!R.exposure.hasHoldings) body = '<div class="aic-empty-inline">เพิ่ม Holdings ในหน้า <a href="/portfolio">Portfolio Position</a> เพื่อดูการหมุนพอร์ต</div>';
    else if (!paths.length) body = '<div class="aic-conc-clear">✅ พอร์ตสอดคล้องกับวัฏจักรแล้ว — ไม่มีการหมุนที่ชัดเจน คงน้ำหนักปัจจุบันได้</div>';
    else body = paths.map(function (p) {
      var fd = DIR[p.fromDir] || DIR.stable, td = DIR[p.toDir] || DIR.stable;
      var drv = (drivers[p.toKey] || []).slice(0, 4);
      return '<div class="aic-flowrow"><div class="aic-flowrow-main">' +
        '<span class="aic-flowrow-from">' + esc(p.from) + ' <i class="aic-dir ' + fd.cls + '">' + fd.icon + "</i></span>" +
        '<span class="aic-flowrow-arrow">↓</span>' +
        '<span class="aic-flowrow-to">' + esc(p.to) + ' <i class="aic-dir ' + td.cls + '">' + td.icon + "</i></span>" +
        '<span class="aic-flowrow-pp">' + p.pp + "%</span></div>" +
        (drv.length ? '<div class="aic-flowrow-why"><span class="aic-flowrow-whyq">ทำไม ' + esc(p.to) + "?</span><ul>" + drv.map(function (d) { return "<li>" + esc(d) + "</li>"; }).join("") + "</ul></div>" : "") +
        why(p.why) + "</div>";
    }).join("");
    return sec(12, "Portfolio Rotation", "การหมุนพอร์ตจริง (แทน Increase/Reduce) — ทยอยย้ายน้ำหนักจากกลุ่มที่เกิน/หมุนออก ไปกลุ่มที่หมุนเข้า พร้อมเหตุผลเชิงปัจจัยพื้นฐาน (เช่น GPU ↓ Networking)",
      '<div class="aic-flows">' + body + "</div>");
  }

  // ---- 13 · Opportunity Ranking (Already Owned / New) ----
  function opportunitySection(R) {
    if (!R.opportunities.length) return "";
    var owned = R.opportunities.filter(function (o) { return o.owned; });
    var fresh = R.opportunities.filter(function (o) { return !o.owned; });
    function table(list) {
      if (!list.length) return '<div class="aic-empty-inline">— ไม่มี —</div>';
      var rows = list.map(function (o, i) {
        return "<tr" + (o.owned ? ' class="aic-opp-owned"' : "") + "><td>" + (i + 1) + "</td>" +
          "<td><b>" + esc(o.ticker) + "</b>" + (o.inUniverse ? ' <span class="aic-uni-tag">AI Boom</span>' : "") + "</td>" +
          "<td>" + esc(o.name) + "</td><td>" + esc(o.layer) + "</td>" +
          '<td class="aic-td-score">' + bar(o.finalPct, "cyc") + " " + o.finalPct + "</td>" +
          '<td class="aic-td-note">' + esc(o.note) + "</td></tr>";
      }).join("");
      return '<div class="aic-table-wrap"><table class="aic-table"><thead><tr><th>#</th><th>Ticker</th><th>บริษัท</th><th>Layer</th><th>Opportunity</th><th>หมายเหตุ</th></tr></thead><tbody>' + rows + "</tbody></table></div>";
    }
    return sec(13, "Opportunity Ranking", "บริษัทเด่นในกลุ่มที่เงินหมุนเข้าแรงสุด — ใช้คะแนน AI Boom Universe (quality + momentum − hype − valuation) · ถืออยู่แล้วขึ้นก่อนเสมอ",
      '<div class="aic-opp-group"><h3 class="aic-opp-h">✅ Already Owned <span>(' + owned.length + ")</span></h3>" + table(owned) + "</div>" +
      '<div class="aic-opp-group"><h3 class="aic-opp-h">🔍 Potential New Opportunity <span>(' + fresh.length + ")</span></h3>" + table(fresh) + "</div>" +
      why(["บริษัทที่ถืออยู่แสดงก่อน (แม้กลุ่มจะเริ่มหมุนออก จะได้ทบทวน) แล้วตามด้วยโอกาสใหม่", "Opportunity = quality + momentum − hype − valuation (สูตรเดียวกับ AI Boom Universe) แปลงเป็น 0-100"]));
  }

  // ---- 14 · AI Phase Timeline ----
  function timelineSection(R) {
    var rows = R.timeline.map(function (t) {
      var cls = t.status === "current" ? "aic-tl-current" : t.status === "past" ? "aic-tl-past" : t.status === "next" ? "aic-tl-next" : "aic-tl-future";
      var tag = t.status === "current" ? "ตอนนี้" : t.status === "past" ? "ผ่านมาแล้ว" : t.status === "next" ? "ถัดไป" : "อนาคต";
      return '<div class="aic-tl-node ' + cls + '"><span class="aic-tl-dot"></span><div class="aic-tl-body"><div class="aic-tl-name">' + esc(t.name) + ' <span class="aic-tl-tag">' + tag + "</span></div>" +
        '<div class="aic-tl-thesis">' + esc(t.thesis) + "</div></div></div>";
    }).join("");
    return sec(14, "AI Phase Timeline", "วิวัฒนาการของโครงสร้างพื้นฐาน AI และตำแหน่งเฟสปัจจุบัน",
      '<div class="aic-tl">' + rows + "</div>" + why(["เฟสปัจจุบันมาจากหลักฐานสะสมแบบต่อเนื่อง (Section 15) — เลื่อนไปเฟสถัดไปได้เมื่อหลักฐานครบ"]));
  }

  // ---- 15 · Next Phase Confirmation ----
  function nextPhaseSection(R) {
    var n = R.nextPhaseChecklist;
    var rows = n.items.map(function (x) {
      return '<div class="aic-chk ' + (x.status === "met" ? "aic-chk-met" : "aic-chk-pending") + '"><span class="aic-chk-mark">' + (x.status === "met" ? "✓" : "○") + "</span><div><b>" + esc(x.label) + "</b><small>" + esc(x.detail) + "</small></div></div>";
    }).join("");
    return sec(15, "Next Phase Confirmation", "หลักฐานที่ต้องเห็นครบก่อนวัฏจักรจะเลื่อนสู่ “" + n.nextPhase + "” — ยืนยันแล้ว " + n.met + "/" + n.total,
      '<div class="aic-chk-list">' + rows + '</div><div class="aic-chk-note">เมื่อครบทุกข้อ ให้เริ่มทยอยเพิ่มน้ำหนักกลุ่มที่เฟส ' + esc(n.nextPhase) + " เน้นล่วงหน้า</div>" +
      why(["แต่ละข้อคือเกณฑ์โมเมนตัมของกลุ่มที่เฟสถัดไปเน้น — deterministic ตรวจสอบซ้ำได้"]));
  }

  // ---- 16 · Today's AI Strategy ----
  function strategySection(st) {
    return sec(16, "Today's AI Strategy", "สรุปกลยุทธ์ AI วันนี้ — อ้างอิงหลักฐานปัจจุบันและสถิติในอดีต ไม่ใช่การพยากรณ์",
      '<ol class="aic-strategy">' + st.bullets.map(function (b) { return "<li>" + esc(b) + "</li>"; }).join("") + "</ol>" + why(st.why));
  }

  // ---- 17 · Explainability ----
  function explainabilitySection(R, enh) {
    var groups = [
      { q: "ทำไมถึงเป็นเฟสนี้?", items: (enh ? enh.dur.why : []).concat(R.phase.why) },
      { q: "ทำไมเงินหมุนแบบนี้?", items: R.rotation.why.concat(R.layers.slice().sort(function (a, b) { return b.rotationScore - a.rotationScore; }).slice(0, 3).map(function (l) { return l.name + ": " + (l.why[1] || ""); })) },
      { q: "ทำไม New Capital & Conviction แบบนี้?", items: (enh ? enh.nc.why : []).concat(["Conviction = 45% Rotation + 30% Cycle + 15% เฟสถัดไป + 10% ทิศทาง — เชิงกลยุทธ์ ไม่ใช่ price momentum"]) },
      { q: "ทำไมคำแนะนำพอร์ตแบบนี้?", items: (R.rotationPaths || []).map(function (p) { return (p.why && p.why[0]) || (p.from + " → " + p.to); }).concat(R.portfolioScore.why, R.concentration.why) }
    ];
    var body = groups.map(function (g) { return '<div class="aic-xai"><h3>' + esc(g.q) + "</h3><ul>" + g.items.filter(Boolean).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul></div>"; }).join("");
    return sec(17, "Explainability", "ทุกคะแนนอธิบายที่มาได้ — deterministic ไม่มี AI/LLM ตัดสินใจแทน · ทุกการ์ดในหน้านี้กด “ทำไม?” ดูเหตุผลได้",
      '<div class="aic-xai-grid">' + body + "</div>");
  }

  function methodologyNote() {
    return '<div class="aic-method">🧭 <b>AI Cycle Intelligence</b> เป็นชั้นข่าวกรองเชิงกลยุทธ์ระดับสถาบัน ไม่ใช่หน้าเทรด — โฟกัส 3 คำถาม: เงินทุน AI ไหลไปไหน · พอร์ตควรปรับยังไง · เงินใหม่ควรลงตรงไหน · ' +
      'ห่วงโซ่คุณค่า + เฟสวัฏจักร + business drivers เป็นข้อมูล research, เสริมด้วยคะแนน AI Boom Universe และ Portfolio Holdings จริง · คำนวณ deterministic ตรวจสอบซ้ำได้ · ' +
      'ใช้ภาษา Increase / Maintain / Reduce ไม่ใช่ซื้อ/ขาย · ไม่มี indicator เทคนิคหรือกราฟราคา · Phase Duration เป็นค่าเฉลี่ยในอดีต ไม่ใช่การพยากรณ์</div>';
  }

  // ---- jump from a Capital Rotation row to that layer's Value Chain card ----
  function jumpTo(key) {
    var target = document.getElementById("aic-vc-node-" + key);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    target.classList.remove("aic-flash"); void target.offsetWidth; target.classList.add("aic-flash");
  }
  function wireJumps(root) {
    root.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-jump]"); if (b) { e.preventDefault(); jumpTo(b.getAttribute("data-jump")); } });
    root.addEventListener("keydown", function (e) { if (e.key !== "Enter" && e.key !== " ") return; var b = e.target.closest && e.target.closest("[data-jump]"); if (b) { e.preventDefault(); jumpTo(b.getAttribute("data-jump")); } });
  }

  // ============================================================ boot
  function init() {
    render();
    var root = document.getElementById(ROOT_ID);
    if (root) wireJumps(root); // root persists; only its innerHTML changes on re-render
    window.addEventListener("portfolio-data-snapshot", render);
    window.addEventListener("portfolio-holdings-updated", render);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  window.AICyclePage = { render: render };
})();
