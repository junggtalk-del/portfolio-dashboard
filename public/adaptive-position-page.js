(function () {
  "use strict";

  // ============================================================
  // Adaptive Position — page (decision view, READ-ONLY).
  // Renders window.AdaptivePosition.compute(snapshot) — ตอบ 4 คำถาม:
  // Mega Trend แข็งแค่ไหน · จังหวะย่อสะสมได้ไหม · ควรถือ Core/Tactical/Cash
  // เท่าไหร่ · ต้องขยับจากตอนนี้กี่ pp — ภาษา Increase / Maintain / Reduce
  // เท่านั้น ไม่ใช่เครื่องมือซื้อขาย · deterministic ทั้งหมด
  // /api/portfolio ถูก fetch สดตอนเปิดหน้า (source of truth ของ invested%)
  // แล้วส่งเป็น opts.portfolioStatus ให้ engine — pattern เดียวกับหน้า
  // Portfolio Position (ensurePortfolioFetched)
  // ============================================================

  var ROOT_ID = "apRoot";
  var COLORS = { core: "#38bdf8", tactical: "#a78bfa", cash: "#64748b" };
  var TONE = { bull: "#34d399", watch: "#f59e0b", bear: "#f43f5e" };

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  function readSnapshot() { try { return (window.PortfolioDataSnapshot && window.PortfolioDataSnapshot.read && window.PortfolioDataSnapshot.read()) || null; } catch (e) { return null; } }
  function toneColor(t) { return TONE[t] || "#94a3b8"; }
  function scoreColor(v) { return v == null ? "#64748b" : v >= 70 ? TONE.bull : v >= 40 ? TONE.watch : TONE.bear; }
  function bar(pct, color) {
    var w = Math.max(0, Math.min(100, Number(pct) || 0));
    return '<span class="ap-bar"><i style="width:' + w + "%;background:" + color + '"></i></span>';
  }
  function list(items) {
    var arr = items && items.length ? items : ["—"];
    return '<ul class="ap-list">' + arr.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>";
  }
  function sec(n, title, sub, body) {
    return '<section class="ap-sec"><div class="ap-sec-head"><span class="ap-sec-n">' + n + "</span><div><h2>" + esc(title) + "</h2>" + (sub ? "<p>" + esc(sub) + "</p>" : "") + "</div></div>" + body + "</section>";
  }
  function states() { return (window.AdaptivePosition && window.AdaptivePosition.STATES) || []; }
  function stateRange(S, i) {
    if (i === 0) return S[i].min + "+";
    var hi = S[i - 1].min - 1;
    return isFinite(S[i].min) ? S[i].min + "–" + hi : "<" + S[i - 1].min;
  }

  // ---- fresh Quarterly money — /api/portfolio is the SOURCE OF TRUTH for
  // current invested%; snapshot.portfolioStatus is only a copy from the last
  // Load Latest Data. Fresh fetch overrides via opts.portfolioStatus. ----
  var psCache = null, psTried = false, psFetchedAt = 0;
  function ensurePortfolioFetched(force) {
    if (psTried && !force) return;
    psTried = true;
    try {
      window.fetch("/api/portfolio", { cache: "no-store" })
        .then(function (r) { return r && r.ok ? r.json() : null; })
        .then(function (j) { if (j && (j.data || j.quarters)) { psCache = j; psFetchedAt = Date.now(); render(); } })
        .catch(function () {});
    } catch (e) {}
  }
  function refreshQuarterlyOnFocus() {
    if (document.hidden) return;
    if (Date.now() - psFetchedAt > 30000) ensurePortfolioFetched(true);
  }

  // ============================================================ render
  function render() {
    var root = document.getElementById(ROOT_ID);
    if (!root) return;
    if (!window.AdaptivePosition || typeof window.AdaptivePosition.compute !== "function") {
      root.innerHTML = '<div class="mc-empty"><strong>Adaptive Position Engine ไม่พร้อม</strong><br>โหลดสคริปต์หน้าไม่ครบ — ลอง refresh หน้านี้</div>';
      return;
    }
    var opts = {};
    if (psCache) opts.portfolioStatus = psCache;
    var R;
    try { R = window.AdaptivePosition.compute(readSnapshot() || {}, opts); }
    catch (e) { root.innerHTML = '<div class="mc-empty"><strong>คำนวณไม่สำเร็จ</strong><br>' + esc(String(e && e.message || e)) + "</div>"; return; }
    if (!R || !R.available) { root.innerHTML = headerSection() + emptyState(R); return; }
    root.innerHTML = headerSection() + heroSection(R) + megaSection(R) + dipSection(R) + planSection(R) + confidenceSection(R) + explainSection(R);
  }

  function headerSection() {
    return '<header class="ap-head"><h1>🎛️ Adaptive Position</h1>' +
      '<p class="ap-headsub">ควรถือ exposure เท่าไหร่ — แยก Core (ถือยาวตาม AI Mega Trend) กับ Tactical (ปรับตามสภาพตลาด) · ไม่ใช่เครื่องมือซื้อขาย</p></header>';
  }

  function emptyState(R) {
    var msg = R && R.thai ? R.thai : R && R.error ? R.error : ("เหตุผล: " + esc(R && R.reason ? R.reason : "unknown"));
    return '<div class="mc-empty"><strong>ยังคำนวณ Adaptive Position ไม่ได้</strong><br>' + esc(msg) +
      '<br><span class="ap-muted">กด <b>Load Latest Data</b> มุมขวาบน แล้วหน้านี้จะคำนวณให้อัตโนมัติ</span></div>';
  }

  // ---- §1 · Verdict hero — 4 answers at a glance ----
  function heroSection(R) {
    var M = R.megaTrend, st = M.state, stC = toneColor(st.tone);
    var dip = R.dip.verdict, dipC = toneColor(dip.tone);
    var reco = R.recommendation || {};
    var conf = R.confidence || {};
    var confBadge = conf.score != null && conf.label
      ? '<span class="ap-conf-badge">ความมั่นใจ ' + conf.score + "/100 · " + esc(conf.label.thai) + "</span>"
      : '<span class="ap-conf-badge ap-muted">ความมั่นใจ — รอข้อมูล</span>';
    return '<section class="ap-hero"><div class="ap-hero-grid">' +
      '<div class="ap-hcell"><div class="ap-hlbl">AI Mega Trend</div>' +
        '<div class="ap-hbig"><b style="color:' + stC + '">' + M.score + "</b><span>/100</span></div>" +
        '<span class="ap-chip" style="color:' + stC + ";border-color:" + stC + '">' + esc(st.label) + " · " + esc(st.thai) + "</span>" +
        '<div class="ap-gate ' + (R.gate.open ? "ap-gate-open" : "ap-gate-closed") + '">เกต buy-the-dip: ' + esc(R.gate.label) + "</div></div>" +
      '<div class="ap-hcell"><div class="ap-hlbl">จังหวะย่อวันนี้</div>' +
        '<div class="ap-hbig"><b style="color:' + dipC + '">' + esc(dip.label) + "</b></div>" +
        '<div class="ap-hsub">' + esc(dip.thai) + " · ดูเงื่อนไขครบใน Checklist ด้านล่าง</div></div>" +
      '<div class="ap-hcell"><div class="ap-hlbl">สัดส่วนแนะนำ · สถานะ ' + esc(st.label) + "</div>" + allocBar(R.allocation) + "</div>" +
      '<div class="ap-hcell"><div class="ap-hlbl">สิ่งที่ควรทำตอนนี้</div>' +
        '<span class="ap-chip ap-reco-' + esc(reco.key || "unknown") + '">' + esc(reco.label || "—") + "</span>" +
        '<div class="ap-hsub">' + esc(reco.detail || "") + "</div>" + confBadge + "</div>" +
      "</div></section>";
  }

  function allocBar(A) {
    var segs = [
      ["Core", A.core, COLORS.core, "#082f49"],
      ["Tactical", A.tactical, COLORS.tactical, "#2e1065"],
      ["Cash", A.cash, COLORS.cash, "#f8fafc"]
    ];
    var strip = '<div class="ap-alloc-bar">' + segs.map(function (s) {
      if (!(s[1] > 0)) return "";
      return '<span style="width:' + s[1] + "%;background:" + s[2] + ";color:" + s[3] + '" title="' + esc(s[0]) + " " + s[1] + '%">' + (s[1] >= 12 ? s[1] + "%" : "") + "</span>";
    }).join("") + "</div>";
    var legend = '<div class="ap-alloc-legend">' + segs.map(function (s) {
      return '<span><i style="background:' + s[2] + '"></i>' + esc(s[0]) + " <b>" + s[1] + "%</b></span>";
    }).join("") + "</div>";
    return strip + legend + '<div class="ap-hsub">ลงทุนรวม (Core + Tactical) เป้า <b>' + A.suggestedInvested + "%</b></div>";
  }

  // ---- §2 · Mega Trend breakdown ----
  function megaSection(R) {
    var M = R.megaTrend;
    var head = '<div class="ap-comp-row ap-comp-head"><span>องค์ประกอบ</span><span>คะแนน /100</span><span>เทรนด์ ~1M</span><span class="ap-comp-w">น้ำหนัก</span></div>';
    var rows = M.components.map(function (c) {
      var scoreCell = c.score == null
        ? '<div class="ap-comp-score ap-muted">' + bar(0, "#64748b") + "<b>—</b></div>"
        : '<div class="ap-comp-score">' + bar(c.score, scoreColor(c.score)) + "<b>" + c.score + "</b></div>";
      return '<div class="ap-comp-row">' +
        '<div class="ap-comp-name"><b>' + esc(c.label) + "</b><small>" + esc(c.thai) + "</small></div>" +
        scoreCell + trendCell(c.trend) +
        '<span class="ap-comp-w">' + c.weight + "%</span>" +
        '<div class="ap-comp-src">ที่มา: ' + esc(c.source) + "</div></div>";
    }).join("");
    return sec(2, "Mega Trend Breakdown",
      "คะแนน " + M.score + "/100 มาจากไหน — ทุกองค์ประกอบมีที่มาตรวจสอบได้ · ครอบคลุมข้อมูล " + M.coverage + "%",
      '<div class="ap-comp-list">' + head + rows + "</div>" + stateLegend(M.state.key) + list(M.why));
  }

  function trendCell(t) {
    if (!t || t.pct == null) return '<span class="ap-trend ap-trend-na">—</span>';
    var icon = t.dir === "up" ? "▲" : t.dir === "down" ? "▼" : "▬";
    var sign = t.pct > 0 ? "+" : "";
    return '<span class="ap-trend ap-trend-' + esc(t.dir) + '" title="ค่าเฉลี่ยการเปลี่ยนแปลงราคา ~1 เดือนของ ' + t.n + ' บริษัทในกลุ่ม">' + icon + " " + sign + t.pct + "%</span>";
  }

  function stateLegend(currentKey) {
    var S = states();
    if (!S.length) return "";
    return '<div class="ap-states">' + S.map(function (st, i) {
      var cur = st.key === currentKey;
      return '<div class="ap-state' + (cur ? " ap-state-cur" : "") + '" style="--ap-st:' + toneColor(st.tone) + '">' +
        (cur ? "<em>ตอนนี้</em>" : "") +
        "<b>" + esc(st.label) + "</b><span>" + esc(stateRange(S, i)) + "</span><small>" + esc(st.thai) + "</small></div>";
    }).join("") + "</div>";
  }

  // ---- §3 · Dip-buy checklist ----
  function dipSection(R) {
    var D = R.dip, v = D.verdict;
    var met = D.conditions.filter(function (c) { return c.met === true; }).length;
    var banner = '<div class="ap-dipbanner ap-tone-' + esc(v.tone) + '"><b>' + esc(v.label) + "</b><span>" + esc(v.thai) + " · ผ่าน " + met + "/" + D.conditions.length + " เงื่อนไข</span></div>";
    var rows = D.conditions.map(function (c) {
      var k = c.met === true ? "met" : c.met === false ? "fail" : "unknown";
      var ic = c.met === true ? "✅" : c.met === false ? "❌" : "❓";
      return '<div class="ap-chk ap-chk-' + k + '"><span class="ap-chk-ic">' + ic + "</span><div><b>" + esc(c.label) + "</b><small>" + esc(c.detail) + "</small></div></div>";
    }).join("");
    var note = '<div class="ap-note">สัญญาณเทคนิคอย่างเดียว override เกต Mega Trend ไม่ได้ — ต้องผ่านครบทั้ง ' + D.conditions.length + " ข้อจึงนับเป็นจังหวะสะสมภายใต้กรอบ Tactical</div>";
    return sec(3, "Dip-Buy Checklist", "เงื่อนไขการสะสมจังหวะย่อ — ต้องผ่านครบทุกข้อ ไม่มีข้อยกเว้น",
      banner + '<div class="ap-chk-list">' + rows + "</div>" + note);
  }

  // ---- §4 · Core / Tactical plan ----
  function planSection(R) {
    var A = R.allocation, S = states();
    var maxStep = (window.AdaptivePosition && window.AdaptivePosition.MAX_STEP_PP) || 15;
    var rows = S.map(function (st, i) {
      var a = A.table[st.key];
      if (!a) return "";
      var cur = st.key === A.state;
      return "<tr" + (cur ? ' class="ap-row-cur"' : "") + "><td>" + esc(st.label) + " <small>" + esc(st.thai) + "</small>" + (cur ? ' <span class="ap-cur-tag">ตอนนี้</span>' : "") + "</td>" +
        "<td>" + esc(stateRange(S, i)) + "</td><td>" + a.core + "%</td><td>" + a.tactical + "%</td><td>" + a.cash + "%</td><td><b>" + (a.core + a.tactical) + "%</b></td></tr>";
    }).join("");
    var table = '<div class="ap-table-wrap"><table class="ap-table"><thead><tr><th>สถานะ Mega Trend</th><th>ช่วงคะแนน</th><th>Core</th><th>Tactical</th><th>Cash</th><th>ลงทุนรวม</th></tr></thead><tbody>' + rows + "</tbody></table></div>";

    var cur = R.currentInvestedPct, target = A.suggestedInvested, marker;
    if (cur != null) {
      marker = '<div class="ap-invwrap"><div class="ap-invtrack"><i style="width:' + Math.max(0, Math.min(100, cur)) + '%"></i>' +
        '<span class="ap-invmark" style="left:' + Math.max(0, Math.min(100, target)) + '%" title="เป้า ' + target + '%"></span></div>' +
        '<div class="ap-invcap"><span>ลงทุนจริงตอนนี้ <b>' + cur + "%</b> (Quarterly Editor)</span><span>ขีดม่วง = เป้า Core+Tactical <b>" + target + "%</b></span></div></div>";
    } else {
      marker = '<div class="ap-muted-box">ยังไม่รู้สัดส่วนลงทุนจริง — หน้านี้กำลังดึงข้อมูล Quarterly Editor (/api/portfolio) ให้อัตโนมัติ ถ้ายังไม่ขึ้น กรอกสินทรัพย์ใน <a href="/">Quarterly Editor</a> ก่อน</div>';
    }

    var reco = R.recommendation || {}, recoCard;
    if (reco.key === "unknown") {
      recoCard = '<div class="ap-reco-card ap-reco-card-unknown"><b>' + esc(reco.label || "") + "</b><p>" + esc(reco.detail || "") + "</p>" +
        "<small>หน้านี้ดึง /api/portfolio ให้อัตโนมัติตอนเปิดหน้า — ถ้ายังไม่ขึ้น กด Load Latest Data หรือเช็คว่ากรอก Quarterly Editor แล้ว</small></div>";
    } else {
      recoCard = '<div class="ap-reco-card ap-reco-card-' + esc(reco.key || "") + '"><b>' + esc(reco.label || "—") + (reco.thai ? " · " + esc(reco.thai) : "") + "</b>" +
        "<p>" + esc(reco.detail || "") + "</p><small>ปรับทีละไม่เกิน " + maxStep + "pp — ไม่มี forced liquidation · Core ถือยาว ขยับเฉพาะส่วน Tactical</small></div>";
    }
    return sec(4, "Core / Tactical Plan", "ตารางสัดส่วนตามสถานะ Mega Trend — Core ถือยาว · Tactical ปรับได้ · Cash รอจังหวะ (แถวไฮไลต์ = สถานะปัจจุบัน)",
      table + marker + recoCard);
  }

  // ---- §5 · Confidence ----
  function confidenceSection(R) {
    var C = R.confidence;
    if (!C || C.score == null) {
      return sec(5, "Confidence", "ความมั่นใจของคำแนะนำ",
        '<div class="ap-muted-box">ยังไม่มีข้อมูลพอสำหรับคะแนนความมั่นใจ — กด Load Latest Data</div>');
    }
    var col = scoreColor(C.score);
    var gauge = '<div class="ap-conf-gauge"><div class="ap-invtrack ap-conf-track"><i style="width:' + C.score + "%;background:" + col + '"></i></div>' +
      '<b style="color:' + col + '">' + C.score + "/100</b>" +
      (C.label ? '<span class="ap-chip">' + esc(C.label.label) + " · " + esc(C.label.thai) + "</span>" : "") + "</div>";
    var rows = C.parts.map(function (p) {
      var cell = p.value == null ? '<b class="ap-muted">—</b>' : bar(p.value, scoreColor(p.value)) + "<b>" + p.value + "</b>";
      return '<div class="ap-part-row"><span class="ap-part-name">' + esc(p.label) + '</span><div class="ap-part-val">' + cell + '</div><span class="ap-comp-w">' + p.weight + "%</span></div>";
    }).join("");
    var E = R.explain || {};
    var cols = '<div class="ap-two-col">' +
      '<div><h3 class="ap-h3">สิ่งที่หนุน</h3>' + list(E.confidenceUp) + "</div>" +
      '<div><h3 class="ap-h3">สิ่งที่ฉุด</h3>' + list(E.confidenceDown) + "</div></div>";
    return sec(5, "Confidence", "ความมั่นใจของคำแนะนำ — ถ่วงน้ำหนักจาก 5 ปัจจัย (เฉพาะที่มีข้อมูล)",
      gauge + '<div class="ap-part-list">' + rows + "</div>" + cols);
  }

  // ---- §6 · Explain + methodology ----
  function explainSection(R) {
    var E = R.explain || {};
    var body = '<div class="ap-two-col">' +
      '<div><h3 class="ap-h3">โครงสร้างเทรนด์</h3>' + list(E.trendValid) + "</div>" +
      '<div><h3 class="ap-h3">เงื่อนไขการสะสม</h3>' + list(E.accumulation) + "</div></div>" +
      '<div class="ap-method">🧭 องค์ประกอบเชิงโครงสร้างใช้หลักฐานราคาตลาดของบริษัทในห่วงโซ่ (AI Rotation Engine) เป็น proxy · Macro = Market Regime · Rates = กลับด้าน Interest Rate Headwind · deterministic ทั้งหมด ไม่มีการทำนายราคา ไม่ใช่คำแนะนำซื้อขาย</div>';
    return sec(6, "Explainability & Methodology", "ทุกตัวเลขในหน้านี้อธิบายที่มาได้ — ตรวจสอบซ้ำได้", body);
  }

  // ============================================================ boot
  function init() {
    render();
    ensurePortfolioFetched();          // fresh Quarterly money (source of truth) → re-render via opts.portfolioStatus
    // Load Latest Data just refreshed snapshot.portfolioStatus — drop our earlier
    // fetch so the (equally fresh) snapshot copy takes over.
    window.addEventListener("portfolio-data-snapshot", function () { psCache = null; psFetchedAt = Date.now(); render(); });
    window.addEventListener("portfolio-holdings-updated", render);
    window.addEventListener("focus", refreshQuarterlyOnFocus);
    document.addEventListener("visibilitychange", refreshQuarterlyOnFocus);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();

  window.AdaptivePositionPage = { render: render };
})();
