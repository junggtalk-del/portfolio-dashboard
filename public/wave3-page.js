(function () {
  "use strict";

  // ============================================================
  // Wave 3 Setup — page (READ-ONLY view of snapshot.wave3).
  // NEVER runs the engine. Only reads what Load Latest Data computed and
  // re-renders on the snapshot event. Clicking an asset opens a detail modal
  // built entirely from already-computed data (no recalculation on navigation).
  // ============================================================

  var ROOT_ID = "wave3Root";
  var UNIVERSES = [
    { key: "portfolio", icon: "💼", label: "Portfolio Holdings", note: "สินทรัพย์ที่ถืออยู่ (ลำดับความสำคัญสูงสุด)" },
    { key: "aiBoom", icon: "✨", label: "AI Boom Universe", note: "Watchlist ธีม AI" },
    { key: "thailand", icon: "🇹🇭", label: "Thailand SET100 + mai", note: "หุ้นไทยตลาดหลัก" },
    { key: "crypto", icon: "🪙", label: "Crypto Top 20", note: "เหรียญ Market Cap สูงสุด (ไม่รวม stablecoin)" }
  ];
  var STATUS = {
    READY: { label: "READY", cls: "w3-st-ready", dot: "🟢", desc: "ครบเงื่อนไข — คลื่นกำลังเริ่ม" },
    WATCH: { label: "WATCH", cls: "w3-st-watch", dot: "🟡", desc: "ตั้งท่าเกือบครบ — รอทริกเกอร์" },
    WAIT: { label: "WAIT", cls: "w3-st-wait", dot: "🟠", desc: "กำลังก่อตัว" },
    INVALID: { label: "INVALID", cls: "w3-st-invalid", dot: "⚪", desc: "ยังไม่ผ่าน Trend Qualification" }
  };
  var QUALITY_DESC = { "A+": "Institutional-quality", "A": "Very strong", "B+": "Good", "B": "Developing", "C": "Weak" };

  // per-universe "show WAIT+INVALID" toggle state (UI-only; not persisted)
  var expanded = {};

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  function readSnapshot() { try { return (window.PortfolioDataSnapshot && window.PortfolioDataSnapshot.read && window.PortfolioDataSnapshot.read()) || null; } catch (e) { return null; } }
  function fmtNum(v) { if (v == null || !isFinite(v)) return "—"; var n = Number(v); return n >= 1000 ? n.toLocaleString("en-US", { maximumFractionDigits: 0 }) : (n < 10 ? n.toFixed(4).replace(/0+$/, "").replace(/\.$/, "") : n.toFixed(2)); }
  function pct(v) { return (v == null || !isFinite(v)) ? "—" : (v > 0 ? "+" : "") + Number(v).toFixed(1) + "%"; }
  function uniLabel(key) { for (var i = 0; i < UNIVERSES.length; i++) if (UNIVERSES[i].key === key) return UNIVERSES[i]; return { icon: "•", label: key }; }
  function timeAgo(iso) {
    if (!iso) return "—"; var t = Date.parse(iso); if (!isFinite(t)) return "—";
    var mins = Math.round((Date.now() - t) / 60000);
    if (mins < 1) return "เมื่อครู่"; if (mins < 60) return mins + " นาทีที่แล้ว";
    var h = Math.round(mins / 60); if (h < 24) return h + " ชม.ที่แล้ว"; return Math.round(h / 24) + " วันที่แล้ว";
  }

  // -------------------------------------------------------- small view helpers
  function readinessRing(r, size) {
    r = Math.max(0, Math.min(100, r || 0)); size = size || 46;
    var band = r >= 75 ? "var(--w3-a)" : r >= 60 ? "var(--w3-b)" : r >= 45 ? "var(--w3-c)" : "var(--w3-d)";
    return '<span class="w3-ring" style="width:' + size + 'px;height:' + size + 'px;background:conic-gradient(' + band + ' ' + (r * 3.6) + 'deg,var(--w3-ring-bg) 0)">' +
      '<span class="w3-ring-hole" style="color:' + band + '">' + r + '</span></span>';
  }
  function qualityBadge(q) { return '<span class="w3-q w3-q-' + (q || "C").replace("+", "p") + '" title="' + esc(QUALITY_DESC[q] || "") + '">' + esc(q || "C") + '</span>'; }
  function statusPill(st) { var s = STATUS[st] || STATUS.INVALID; return '<span class="w3-pill ' + s.cls + '" title="' + esc(s.desc) + '">' + s.dot + " " + s.label + "</span>"; }
  function stars(n) { n = n || 0; var out = ""; for (var i = 0; i < 5; i++) out += i < n ? "★" : "☆"; return '<span class="w3-stars">' + out + "</span>"; }

  // ============================================================ render
  function render() {
    var root = document.getElementById(ROOT_ID);
    if (!root) return;
    var snap = readSnapshot();
    var w3 = snap && snap.wave3;

    if (!snap) { root.innerHTML = emptyState("ยังไม่มี Snapshot", "กด <b>Load Latest Data</b> ที่มุมขวาบนเพื่อสแกน Wave 3 Setups ทั้ง 4 กลุ่มสินทรัพย์"); return; }
    if (!w3 || !w3.available) { root.innerHTML = emptyState("ยังไม่ได้สแกน Wave 3", "Snapshot นี้ยังไม่มีผลการสแกน — กด <b>Load Latest Data</b> อีกครั้งเพื่อประมวลผล Wave 3 Setup engine"); return; }

    var counts = w3.meta && w3.meta.counts || {};
    var totalReady = (w3.meta && w3.meta.totalReady) || 0;
    var totalWatch = (w3.meta && w3.meta.totalWatch) || 0;
    var scanned = (counts.portfolio || 0) + (counts.aiBoom || 0) + (counts.thailand || 0) + (counts.crypto || 0);

    var html = "";
    html += heroStrip(w3, totalReady, totalWatch, scanned);
    html += upcomingSection(w3.upcoming || []);
    html += '<div class="w3-dash">';
    for (var i = 0; i < UNIVERSES.length; i++) html += universeSection(UNIVERSES[i], (w3.universes && w3.universes[UNIVERSES[i].key]) || null);
    html += "</div>";
    html += methodologyNote();
    root.innerHTML = html;
    wire(root, w3);
  }

  function emptyState(title, sub) {
    return '<section class="w3-hero"><div class="w3-hero-main"><div class="w3-hero-emoji">🌊</div>' +
      '<h1 class="w3-hero-title">Wave 3 Setup</h1><p class="w3-hero-sub">' + esc(title) + '</p>' +
      '<p class="w3-empty-sub">' + sub + '</p></div></section>';
  }

  function heroStrip(w3, ready, watch, scanned) {
    return '<section class="w3-hero">' +
      '<div class="w3-hero-main">' +
        '<div class="w3-hero-emoji">🌊</div>' +
        '<div><h1 class="w3-hero-title">Wave 3 Setup</h1>' +
        '<p class="w3-hero-sub">อะไรกำลัง<b>ใกล้เข้าสู่ Major Wave 3</b> — ตอบได้ใน 10 วินาที</p></div>' +
      '</div>' +
      '<div class="w3-hero-stats">' +
        statBlock(ready, "READY", "w3-st-ready", "ครบเงื่อนไข") +
        statBlock(watch, "WATCH", "w3-st-watch", "รอทริกเกอร์") +
        statBlock(scanned, "สแกนแล้ว", "w3-st-neutral", "สินทรัพย์") +
      '</div>' +
      '<div class="w3-hero-meta">อัปเดต ' + esc(timeAgo(w3.generatedAt)) + ' · รันเฉพาะตอน Load Latest Data</div>' +
    '</section>';
  }
  function statBlock(n, label, cls, sub) {
    return '<div class="w3-stat ' + cls + '"><div class="w3-stat-n">' + n + '</div><div class="w3-stat-l">' + esc(label) + '</div><div class="w3-stat-s">' + esc(sub) + '</div></div>';
  }

  // -------------------------------------------------------- Upcoming Setups
  function upcomingSection(upcoming) {
    if (!upcoming.length) return "";
    var cards = upcoming.map(function (u) {
      var uni = uniLabel(u.universe);
      var wait = u.status === "READY" ? "กำลังเริ่ม ▶" : ("⏳ Waiting " + esc(u.waitingFor || "—"));
      return '<button class="w3-up-card" data-sym="' + esc(u.symbol) + '" data-uni="' + esc(u.universe) + '">' +
        '<div class="w3-up-top">' + readinessRing(u.readiness, 40) + '<div class="w3-up-id"><b>' + esc(u.symbol) + '</b>' +
        '<span class="w3-up-uni">' + uni.icon + " " + esc(uni.label) + '</span></div>' + qualityBadge(u.quality) + '</div>' +
        '<div class="w3-up-bot">' + statusPill(u.status) + '<span class="w3-up-wait">' + wait + '</span></div>' +
        '</button>';
    }).join("");
    return '<section class="w3-block w3-up">' +
      '<div class="w3-block-head"><h2>🔭 Upcoming Setups</h2><span class="w3-block-sub">สิ่งที่ “เกือบ” เข้าเงื่อนไข — ขาดอีกเพียง 1–2 ข้อ</span></div>' +
      '<div class="w3-up-scroll">' + cards + '</div></section>';
  }

  // -------------------------------------------------------- universe section
  function universeSection(meta, sec) {
    var items = (sec && sec.items) || [];
    var isOpen = !!expanded[meta.key];
    var shown = items.filter(function (a) { return a.status === "READY" || a.status === "WATCH"; });
    var hidden = items.filter(function (a) { return a.status === "WAIT" || a.status === "INVALID"; });
    var listItems = isOpen ? items : shown;

    var head = '<div class="w3-sec-head"><div class="w3-sec-title">' + meta.icon + ' <b>' + esc(meta.label) + '</b>' +
      '<span class="w3-sec-note">' + esc(meta.note) + '</span></div>' +
      '<div class="w3-sec-counts">' + countChip(sec, "ready", "READY", "w3-st-ready") + countChip(sec, "watch", "WATCH", "w3-st-watch") +
      countChip(sec, "wait", "WAIT", "w3-st-wait") + countChip(sec, "invalid", "INVALID", "w3-st-invalid") + '</div></div>';

    var body;
    if (!sec || !items.length) {
      body = '<div class="w3-sec-empty">' + (sec ? "ไม่มีข้อมูลในกลุ่มนี้ (อาจดึงข้อมูลไม่สำเร็จ — ลอง Load อีกครั้ง)" : "รอ Load Latest Data") + "</div>";
    } else if (!listItems.length) {
      body = '<div class="w3-sec-empty">ยังไม่มี READY / WATCH ในกลุ่มนี้ — มี ' + hidden.length + ' รายการกำลังก่อตัว/ยังไม่ผ่าน</div>';
    } else {
      body = '<div class="w3-rows">' + listItems.map(assetRow).join("") + "</div>";
    }

    var toggle = hidden.length ? '<button class="w3-toggle" data-uni="' + esc(meta.key) + '">' +
      (isOpen ? "▲ ซ่อน WAIT + INVALID" : "▼ แสดง WAIT + INVALID (" + hidden.length + ")") + "</button>" : "";

    return '<section class="w3-sec">' + head + body + toggle + "</section>";
  }
  function countChip(sec, field, label, cls) {
    var n = sec ? (sec[field] || 0) : 0;
    return '<span class="w3-cc ' + cls + (n ? "" : " w3-cc-zero") + '">' + n + " " + label + "</span>";
  }

  function assetRow(a) {
    var uni = uniLabel(a.universe);
    var waitTxt = a.status === "READY" ? '<span class="w3-row-fire">▶ กำลังเริ่ม</span>'
      : (a.waitingFor ? '<span class="w3-row-wait">⏳ ' + esc(a.waitingFor) + "</span>" : "");
    var fibTxt = a.fib ? ("Fib " + a.fib.retrace + "% · " + esc(a.fib.quality)) : "ยังไม่พบ Wave";
    var histTxt = (a.historical && !a.historical.insufficient)
      ? ('<span class="w3-row-hist" title="ผลลัพธ์ย้อนหลังของเงื่อนไขคล้ายกัน">📊 ' + a.historical.positivePct + "% · " + pct(a.historical.avgReturn) + "</span>")
      : "";
    return '<button class="w3-row" data-sym="' + esc(a.symbol) + '" data-uni="' + esc(a.universe) + '">' +
      readinessRing(a.readiness, 44) +
      '<div class="w3-row-id"><div class="w3-row-sym"><b>' + esc(a.symbol) + '</b> ' + qualityBadge(a.quality) +
        (a.isHolding ? '<span class="w3-hold">ถืออยู่</span>' : "") + '</div>' +
        '<div class="w3-row-sub">' + uni.icon + " " + esc(a.name || a.symbol) + "</div></div>" +
      '<div class="w3-row-mid"><div class="w3-row-fib">' + esc(fibTxt) + '</div>' + histTxt + '</div>' +
      '<div class="w3-row-right">' + statusPill(a.status) + waitTxt + '</div>' +
      '<span class="w3-row-price">' + fmtNum(a.price) + "</span>" +
      "</button>";
  }

  function methodologyNote() {
    return '<div class="w3-method">🌊 เครื่องมือนี้<b>ไม่ได้ระบุว่า “นี่คือ Wave 3”</b> แต่ประเมิน <b>Wave 3 Readiness</b> จากกฎที่ตรวจสอบซ้ำได้ ' +
      '(Trend Qualification → ZigZag Swings → Fibonacci → Evidence Checklist). ตัวเลข Historical เป็นสถิติย้อนหลังของเงื่อนไขที่คล้ายกัน ไม่ใช่การพยากรณ์ราคา ' +
      'และไม่ใช่คำแนะนำซื้อ/ขาย · ประมวลผลเฉพาะตอนกด Load Latest Data</div>';
  }

  // ============================================================ detail modal
  function openDetail(w3, sym, uniKey) {
    var sec = w3.universes && w3.universes[uniKey];
    var a = sec && sec.items && sec.items.filter(function (x) { return x.symbol === sym; })[0];
    if (!a) { // fall back: search all universes
      var keys = Object.keys(w3.universes || {});
      for (var i = 0; i < keys.length && !a; i++) { var it = w3.universes[keys[i]].items || []; a = it.filter(function (x) { return x.symbol === sym; })[0]; }
    }
    if (!a) return;
    var back = document.createElement("div");
    back.className = "w3-modal-back";
    back.innerHTML = detailHtml(a);
    document.body.appendChild(back);
    document.body.style.overflow = "hidden";
    function close() { if (back.parentNode) back.parentNode.removeChild(back); document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); }
    function onKey(e) { if (e.key === "Escape") close(); }
    back.addEventListener("click", function (e) { if (e.target === back || (e.target.closest && e.target.closest(".w3-modal-close"))) close(); });
    document.addEventListener("keydown", onKey);
  }

  function detailHtml(a) {
    var uni = uniLabel(a.universe);
    var s = STATUS[a.status] || STATUS.INVALID;

    // header
    var head = '<div class="w3-md-head">' +
      '<div class="w3-md-id">' + readinessRing(a.readiness, 62) +
        '<div><div class="w3-md-sym"><b>' + esc(a.symbol) + '</b> ' + qualityBadge(a.quality) + (a.isHolding ? '<span class="w3-hold">ถืออยู่</span>' : "") + '</div>' +
        '<div class="w3-md-name">' + uni.icon + " " + esc(a.name || a.symbol) + " · " + esc(uni.label) + '</div>' +
        '<div class="w3-md-tags">' + statusPill(a.status) + '<span class="w3-md-conf">Confidence ' + a.confidence + '%</span>' +
        '<span class="w3-md-price">ราคา ' + fmtNum(a.price) + '</span></div></div></div>' +
      '<button class="w3-modal-close" aria-label="close">✕</button></div>';

    var statusLine = '<div class="w3-md-statusline ' + s.cls + '">' + s.dot + " <b>" + s.label + "</b> — " + esc(s.desc) +
      (a.waitingFor ? ' · ⏳ Waiting <b>' + esc(a.waitingFor) + "</b>" : "") + "</div>";

    return '<div class="w3-modal" role="dialog" aria-modal="true">' + head + statusLine +
      '<div class="w3-md-body">' +
        trendCard(a) + fibCard(a) + evidenceCard(a) + readinessCard(a) + historicalCard(a) + targetsCard(a) + invalidationCard(a) + readingsCard(a) +
      '</div>' +
      '<div class="w3-md-foot">ตัวเลขทั้งหมดคำนวณจากกฎที่ตรวจสอบซ้ำได้ · ไม่ใช่คำแนะนำซื้อ/ขาย · Historical = สถิติย้อนหลัง ไม่ใช่การพยากรณ์</div>' +
    '</div>';
  }

  function checkRow(ok, label, na) {
    var mark = na ? '<span class="w3-na">–</span>' : (ok ? '<span class="w3-ok">✓</span>' : '<span class="w3-no">✗</span>');
    return '<div class="w3-chk' + (na ? " w3-chk-na" : ok ? " w3-chk-ok" : " w3-chk-no") + '">' + mark + "<span>" + esc(label) + "</span></div>";
  }

  function trendCard(a) {
    var t = a.trendQual || {};
    var body = checkRow(t.priceAboveEma200, "ราคาเหนือ EMA200") +
      checkRow(t.ema50AboveEma200, "EMA50 เหนือ EMA200") +
      checkRow(t.structureOk, "โครงสร้างขาขึ้น (Higher Low / Higher High)") +
      checkRow(t.adxPass, "ADX " + (t.adx == null ? "—" : t.adx) + " > " + (t.adxFloor || 20) + " (Trend Strength)");
    var verdict = t.passed ? '<span class="w3-ok">ผ่าน Trend Qualification</span>' : '<span class="w3-no">ยังไม่ผ่าน — ไม่วิเคราะห์ต่อ</span>';
    return card("🧭 Trend Qualification (ด่านแรก)", body + '<div class="w3-card-verdict">' + verdict + "</div>");
  }

  function fibCard(a) {
    if (!a.waves || !a.fib) return card("📐 Fibonacci & Wave Structure", '<div class="w3-muted">ยังไม่พบโครงสร้าง Wave 1 → Wave 2 ที่ชัดเจน (ZigZag ยังไม่ยืนยัน swing)</div>');
    var w = a.waves, f = a.fib;
    var rows = '<table class="w3-tbl"><tbody>' +
      trow("Wave 1 เริ่ม", fmtNum(w.w1.startVal) + (w.w1.startDate ? ' <span class="w3-date">' + esc(w.w1.startDate) + "</span>" : "")) +
      trow("Wave 1 จบ (High)", fmtNum(w.w1.endVal) + (w.w1.endDate ? ' <span class="w3-date">' + esc(w.w1.endDate) + "</span>" : "")) +
      trow("Wave 2 ต่ำสุด", fmtNum(w.w2 ? w.w2.endVal : null) + (w.w2 && w.w2.endDate ? ' <span class="w3-date">' + esc(w.w2.endDate) + "</span>" : "")) +
      trow("ราคาปัจจุบัน", fmtNum(w.currentVal)) +
      "</tbody></table>";
    var fibBox = '<div class="w3-fibrow"><div><span class="w3-fib-big">' + f.retrace + '%</span><span class="w3-fib-cap">Retracement</span></div>' +
      '<div><b>' + f.ideal + '%</b><span class="w3-fib-cap">Ideal</span></div>' +
      '<div><b>±' + f.diff + '%</b><span class="w3-fib-cap">ห่างจาก Ideal</span></div>' +
      '<div>' + stars(f.stars) + '<span class="w3-fib-cap">' + esc(f.quality) + '</span></div></div>';
    return card("📐 Fibonacci & Wave Structure", fibBox + rows);
  }
  function trow(k, v) { return "<tr><th>" + esc(k) + "</th><td>" + v + "</td></tr>"; }

  function evidenceCard(a) {
    var ev = a.evidence || [];
    var setup = ev.filter(function (x) { return x.kind === "setup"; });
    var trig = ev.filter(function (x) { return x.kind === "trigger"; });
    var body = '<div class="w3-ev-grp"><div class="w3-ev-lbl">Setup (โครงสร้าง)</div>' + setup.map(function (x) { return checkRow(x.ok, x.label, x.na); }).join("") + "</div>" +
      '<div class="w3-ev-grp"><div class="w3-ev-lbl">Trigger (ยืนยันการระเบิด)</div>' + trig.map(function (x) { return checkRow(x.ok, x.label, x.na); }).join("") + "</div>";
    return card("✅ Evidence Checklist", body);
  }

  function readinessCard(a) {
    var comps = a.components || [];
    var rows = comps.map(function (c) {
      if (c.na || c.val == null) return '<div class="w3-comp w3-comp-na"><span class="w3-comp-l">' + esc(c.label) + '</span><span class="w3-comp-bar"><i style="width:0"></i></span><span class="w3-comp-v">N/A</span></div>';
      var w = Math.round((c.val / c.max) * 100);
      return '<div class="w3-comp"><span class="w3-comp-l">' + esc(c.label) + '</span><span class="w3-comp-bar"><i style="width:' + w + '%"></i></span><span class="w3-comp-v">' + c.val + "/" + c.max + "</span></div>";
    }).join("");
    return card("🧮 ทำไม Readiness = " + a.readiness + " (Explainability)", rows + '<div class="w3-card-note">Readiness ถ่วงน้ำหนักและ renormalize เฉพาะองค์ประกอบที่มีข้อมูล</div>');
  }

  function historicalCard(a) {
    var h = a.historical;
    if (!h || h.insufficient) return card("📊 Historical Validation", '<div class="w3-muted">ตัวอย่างในอดีตไม่พอ (' + ((h && h.occurrences) || 0) + " ครั้ง) — ต้องการอย่างน้อย 3 ครั้งเพื่อสรุปสถิติ</div>");
    var g = '<div class="w3-hist-grid">' +
      histCell(h.occurrences, "ครั้งในอดีต") + histCell(h.positivePct + "%", "บวก (Win rate)") +
      histCell(pct(h.avgReturn), "ผลตอบแทนเฉลี่ย") + histCell(pct(h.medianReturn), "Median") +
      histCell(pct(h.avgDrawdown), "Drawdown เฉลี่ย") + histCell(pct(h.worst), "แย่สุด") + histCell(pct(h.best), "ดีสุด") +
      "</div>";
    return card("📊 Historical Validation (" + h.horizon + " วันข้างหน้า)", g + '<div class="w3-card-note">สถิติของแท่งในอดีตที่เข้าเงื่อนไขทริกเกอร์คล้ายปัจจุบัน — ไม่ใช่การพยากรณ์</div>');
  }
  function histCell(v, l) { return '<div class="w3-hist-cell"><div class="w3-hist-v">' + v + '</div><div class="w3-hist-l">' + esc(l) + "</div></div>"; }

  function targetsCard(a) {
    if (!a.targets || !a.targets.length) return "";
    var rows = a.targets.map(function (t) { return '<div class="w3-tgt"><span class="w3-tgt-x">' + esc(t.label) + '</span><span class="w3-tgt-p">' + fmtNum(t.price) + "</span></div>"; }).join("");
    return card("🎯 Historical Projection Levels", '<div class="w3-tgts">' + rows + '</div><div class="w3-card-note">Fibonacci Extension (127.2 / 161.8 / 261.8%) จาก Wave 1 — ระดับอ้างอิงเชิงสถิติ <b>ไม่ใช่การพยากรณ์เป้าหมาย</b></div>');
  }

  function invalidationCard(a) {
    var inv = a.invalidation || [];
    if (!inv.length) return "";
    return card("⚠️ อะไรจะทำให้ Setup นี้เสีย (Invalidation)", '<ul class="w3-inv">' + inv.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>");
  }

  function readingsCard(a) {
    var r = a.readings || {};
    var wk = r.weekly ? (r.weekly.above ? "เหนือ SMA" + r.weekly.basis + (r.weekly.proxy ? " (proxy)" : "") : "ต่ำกว่า SMA" + r.weekly.basis) : "ข้อมูลไม่พอ";
    var cells = [
      ["EMA12", fmtNum(r.ema12)], ["EMA26", fmtNum(r.ema26)], ["EMA50", fmtNum(r.ema50)], ["EMA200", fmtNum(r.ema200)],
      ["SMA50", fmtNum(r.sma50)], ["SMA200", fmtNum(r.sma200)], ["RSI14", r.rsi == null ? "—" : r.rsi], ["ADX", r.adx == null ? "—" : r.adx],
      ["Vol×5", r.volRatio == null ? "—" : r.volRatio + "×"], ["ATR", fmtNum(r.atr)], ["Weekly", wk], ["แท่งข้อมูล", a.bars]
    ];
    return card("🔬 ค่าที่ใช้คำนวณ (Readings)", '<div class="w3-reads">' + cells.map(function (c) { return '<div class="w3-read"><span>' + esc(c[0]) + '</span><b>' + esc(c[1]) + "</b></div>"; }).join("") + "</div>");
  }

  function card(title, body) { return '<div class="w3-card"><div class="w3-card-h">' + title + '</div><div class="w3-card-b">' + body + "</div></div>"; }

  // ============================================================ wiring
  function wire(root, w3) {
    root.querySelectorAll(".w3-row, .w3-up-card").forEach(function (el) {
      el.addEventListener("click", function () { openDetail(w3, el.getAttribute("data-sym"), el.getAttribute("data-uni")); });
    });
    root.querySelectorAll(".w3-toggle").forEach(function (el) {
      el.addEventListener("click", function () { var k = el.getAttribute("data-uni"); expanded[k] = !expanded[k]; render(); });
    });
  }

  // ============================================================ boot
  function init() { render(); window.addEventListener("portfolio-data-snapshot", render); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();

  window.Wave3Page = { render: render };
})();
