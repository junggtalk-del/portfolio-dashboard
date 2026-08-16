(function () {
  "use strict";

  // ============================================================
  // Investment Thesis — page (READ-ONLY decision view).
  // Renders window.ThesisEngine.compute(ticker, snapshot, opts) —
  // ตอบว่า บริษัทนี้ยังเดินตาม thesis ระยะยาวอยู่ไหม และจังหวะย่อ
  // ตอนนี้ควรสะสมหรือรอ · โครงสร้าง (พื้นฐาน / execution / moat)
  // = ความรู้ curated ณ asOf · Mega Trend / Macro / Technical / ราคา
  // = live จากระบบ · deterministic ทั้งหมด ไม่ใช่เครื่องมือส่งคำสั่ง
  // ============================================================

  var ROOT_ID = "thRoot";
  var STORE_KEY = "thesis_selected_v1";
  var DEFAULT_TICKER = "GOOG";
  var historyYears = null; // §6 ช่วงปีที่เลือก (null = default 5) — คงไว้ข้ามการสลับหุ้น
  var historyMode = "year"; // §6 มุมมอง: "year" (รายปี) หรือ "quarter" (รายไตรมาส)
  var historyQuarters = 12; // §6 โหมดไตรมาส: จำนวนไตรมาสที่ดู (4/8/12 = 1/2/3 ปี)
  // โหมดเทียบหุ้น — เลือกจากชิปได้สูงสุด cmpMax ตัว (จำการเลือกข้าม reload)
  var CMP_LS = "thCompareSel_v1";
  var compareMode = false;
  function cmpMax() { return (window.ThesisCompare && window.ThesisCompare.MAXSEL) || 7; }
  function cmpColor(i) {
    var C = (window.ThesisCompare && window.ThesisCompare.COLORS) || ["#38bdf8"];
    return C[i % C.length];
  }
  var compareSel = (function () {
    try { var v = JSON.parse(localStorage.getItem(CMP_LS) || "[]"); return Array.isArray(v) ? v.slice(0, 7) : []; } catch (e) { return []; }
  })();
  function saveCompareSel() { try { localStorage.setItem(CMP_LS, JSON.stringify(compareSel)); } catch (e) { } }
  var TONE = { bull: "#34d399", watch: "#f59e0b", bear: "#f43f5e", blue: "#38bdf8" };
  var FALLBACK_COMPANIES = ["GOOG", "NVDA", "MSFT", "META", "AMZN", "TSM", "AVGO", "AMD"]
    .map(function (t) { return { ticker: t, name: t }; });

  // ---------------------------------------------- helpers
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  function readSnapshot() { try { return (window.PortfolioDataSnapshot && window.PortfolioDataSnapshot.read && window.PortfolioDataSnapshot.read()) || null; } catch (e) { return null; } }
  function toneColor(t) { return TONE[t] || "#94a3b8"; }
  function scoreColor(v) { return v == null ? "#64748b" : v >= 70 ? TONE.bull : v >= 40 ? TONE.watch : TONE.bear; }
  function fmt(v) { return v == null || v === "" ? "—" : String(v); }
  function bar(pct, color) {
    var w = Math.max(0, Math.min(100, Number(pct) || 0));
    return '<span class="th-bar"><i style="width:' + w + "%;background:" + color + '"></i></span>';
  }
  function list(items) {
    var arr = items && items.length ? items : ["—"];
    return '<ul class="th-list">' + arr.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>";
  }
  function sec(n, title, sub, body) {
    return '<section class="th-sec"><div class="th-sec-head"><span class="th-sec-n">' + n + "</span><div><h2>" + esc(title) + "</h2>" + (sub ? "<p>" + esc(sub) + "</p>" : "") + "</div></div>" + body + "</section>";
  }
  function trendArrow(t) {
    var k = t === "up" ? "up" : t === "down" ? "down" : "flat";
    var icon = k === "up" ? "▲" : k === "down" ? "▼" : "▬";
    return '<span class="th-trend th-trend-' + k + '">' + icon + "</span>";
  }
  function toneChip(tone, text) {
    return '<span class="th-chip th-tone-' + esc(tone || "neutral") + '">' + esc(text) + "</span>";
  }
  // heuristic tone for free-form status strings (competitive factors ฯลฯ)
  function statusTone(s) {
    var x = String(s == null ? "" : s).toLowerCase();
    if (/strength|strong|lead|widen|gain|dominan|good|improv/.test(x)) return "bull";
    if (/weak|risk|erod|los|behind|poor|threat|deterior/.test(x)) return "bear";
    if (/stable|neutral|hold|on-track|steady/.test(x)) return "blue";
    return "neutral";
  }
  // earnings-date formatting for the staleness badge
  var TH_MON = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  function earnDateText(ne) {
    if (!ne) return "";
    var d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ne), m = /^(\d{4})-(\d{2})$/.exec(ne);
    if (d) return Number(d[3]) + " " + TH_MON[Number(d[2]) - 1] + " " + d[1];
    if (m) return "~" + TH_MON[Number(m[2]) - 1] + " " + m[1];
    return String(ne);
  }
  function daysText(days) {
    if (days == null) return "";
    if (days < 0) return "~" + Math.abs(days) + " วันก่อน";
    if (days === 0) return "วันนี้";
    return "อีก ~" + days + " วัน";
  }

  // ---------------------------------------------- company selection
  // chips derive from ThesisData — ticker ที่เพิ่มผ่าน /thesis-update โผล่เองไม่ต้องแก้หน้า
  function companies() {
    var TE = window.ThesisEngine;
    if (TE && TE.companiesFrom) return TE.companiesFrom(window.ThesisData);
    var C = TE && TE.COMPANIES;
    return C && C.length ? C : FALLBACK_COMPANIES;
  }
  function isCovered(t) { return companies().some(function (c) { return c.ticker === t; }); }
  function selectedTicker() {
    var t = null;
    try { t = window.localStorage.getItem(STORE_KEY); } catch (e) {}
    if (t && /^[A-Z0-9.^=-]{1,12}$/.test(t)) return t; // อนุญาต lite ticker ด้วย
    return DEFAULT_TICKER;
  }
  function setTicker(t) {
    t = String(t || "").trim().toUpperCase();
    if (!t || t === selectedTicker()) return;
    try { window.localStorage.setItem(STORE_KEY, t); } catch (e) {}
    render();
  }

  // ============================================================ render
  function render() {
    var root = document.getElementById(ROOT_ID);
    if (!root) return;
    if (!window.ThesisEngine || typeof window.ThesisEngine.compute !== "function") {
      root.innerHTML = headerSection(null) + '<div class="mc-empty"><strong>Thesis Engine ไม่พร้อม</strong><br>โหลดสคริปต์หน้าไม่ครบ — ลอง refresh หน้านี้</div>';
      return;
    }
    // โหมดเทียบหุ้น — แทนที่มุมมองรายตัวทั้งหมด (ออกจากโหมดแล้วกลับมาที่ตัวที่เลือกไว้เดิม)
    if (compareMode) {
      var cmpBody = window.ThesisCompare && window.ThesisCompare.render
        ? window.ThesisCompare.render(compareSel, readSnapshot() || {}, {})
        : '<div class="mc-empty"><strong>โหลด thesis-compare.js ไม่สำเร็จ</strong></div>';
      root.innerHTML = headerSection(null) + cmpBody;
      return;
    }
    var sel = selectedTicker();
    var R;
    try {
      R = isCovered(sel)
        ? window.ThesisEngine.compute(sel, readSnapshot() || {}, {})
        : window.ThesisEngine.computeLite(sel, readSnapshot() || {}, {});
    }
    catch (e) {
      root.innerHTML = headerSection(null) + '<div class="mc-empty"><strong>คำนวณไม่สำเร็จ</strong><br>' + esc(String((e && e.message) || e)) + "</div>";
      return;
    }
    if (!R || !R.available) { root.innerHTML = headerSection(null) + emptyState(R); return; }
    if (R.lite) { root.innerHTML = headerSection(R) + stickyBar(R) + liteSection(R); return; }
    root.innerHTML =
      headerSection(R) +
      stickyBar(R) +
      heroSection(R) +
      thesisSection(R) +
      fallingSection(R) +
      decisionSection(R) +
      fundamentalsSection(R) +
      historySection(R) +
      revenueSection(R) +
      executionSection(R) +
      competitiveSection(R) +
      capitalSection(R) +
      changedSection(R) +
      explainSection(R) +
      methodSection(R) +
      valuationContextSection(R) +
      forwardSection(R);
  }

  function emptyState(R) {
    var msg = R && R.thai ? R.thai : "เหตุผล: " + ((R && R.reason) || "unknown");
    return '<div class="mc-empty"><strong>ยังแสดง Investment Thesis ไม่ได้</strong><br>' + esc(msg) +
      '<br><span class="th-muted">กด <b>Load Latest Data</b> มุมขวาบน แล้วหน้านี้จะคำนวณให้อัตโนมัติ</span></div>';
  }

  // ---- §0 · header + company chips + lite input + stale badge ----
  function headerSection(R) {
    var sel = selectedTicker();
    var covered = isCovered(sel);
    var chips = companies().map(function (c) {
      var on = compareMode ? compareSel.indexOf(c.ticker) >= 0 : c.ticker === sel;
      var ord = compareMode ? compareSel.indexOf(c.ticker) : -1;
      var mark = ord >= 0 ? '<i class="th-chipdot" style="background:' + cmpColor(ord) + '"></i>' : "";
      return '<button type="button" class="th-chipbtn' + (on ? " th-chipbtn-on" : "") + '" data-th-ticker="' + esc(c.ticker) + '" title="' + esc(c.name) + '">' + mark + esc(c.ticker) + "</button>";
    }).join("");
    if (!covered && !compareMode) chips += '<button type="button" class="th-chipbtn th-chipbtn-on th-chipbtn-lite" data-th-ticker="' + esc(sel) + '">' + esc(sel) + " (Lite)</button>";
    chips += '<button type="button" class="th-chipbtn th-cmpbtn' + (compareMode ? " th-chipbtn-on" : "") + '" data-th-cmp-toggle="1">⇄ ' +
      (compareMode ? "ออกจากโหมดเทียบ" : "เทียบหุ้น") + "</button>";
    if (!compareMode) {
      chips += '<span class="th-litebox"><input id="thLiteInput" type="text" placeholder="ดูตัวอื่น (Lite) เช่น PLTR" maxlength="12" />' +
        '<button type="button" id="thLiteGo" class="th-chipbtn">ดู</button></span>';
    } else {
      chips += '<span class="th-cmp-hint">เลือก 2-' + cmpMax() + " ตัว (เลือกแล้ว " + compareSel.length + ")" +
        (compareSel.length ? ' <button type="button" class="th-cmp-clear" data-th-cmp-clear="1">ล้าง</button>' : "") + "</span>";
    }
    var note = "";
    if (R && R.dataNote) {
      note = '<div class="th-datanote">📎 ' + esc(R.dataNote) + (R.asOf ? " · ความรู้เชิงโครงสร้าง curated ณ <b>" + esc(R.asOf) + "</b>" : "") + "</div>";
    }
    // staleness badge — earnings-aware: heads-up ก่อนงบ + เตือนโหลดหลังงบออก/เมื่อข้อมูลเก่า
    // precedence: overdue > stale (อายุเกินเกณฑ์) > due-soon > current
    if (R && !R.lite) {
      var E = R.earnings || {};
      var dtxt = earnDateText(E.nextEarnings);
      var est = E.estimated ? ' <span class="th-earn-est">(วันคาดการณ์)</span>' : "";
      var upd = " — โหลดใหม่: สั่ง <code>/thesis-update " + esc(R.ticker) + "</code>";
      var nextInfo = E.hasDate ? " · งบใหม่ " + esc(dtxt) + " (" + daysText(E.daysToEarnings) + ")" + est : "";
      if (E.state === "overdue") {
        note += '<div class="th-stale th-stale-warn">⚠ งบ ' + esc(R.ticker) + " น่าจะออกแล้ว (" + esc(dtxt) + " · " + daysText(E.daysToEarnings) + ") · ข้อมูล curated ยังเป็นก่อนงบ" + upd + est + "</div>";
      } else if (E.state === "stale") {
        note += '<div class="th-stale th-stale-warn">⚠ ข้อมูล curated ของ ' + esc(R.ticker) + " อายุ <b>" + R.staleMonths + " เดือน</b> — เลยรอบงบแล้ว" + nextInfo + upd + "</div>";
      } else if (E.state === "due-soon") {
        note += '<div class="th-stale th-stale-soon">🔔 งบ ' + esc(R.ticker) + " ใกล้ออก " + daysText(E.daysToEarnings) + " (" + esc(dtxt) + ") — เตรียมสั่ง <code>/thesis-update " + esc(R.ticker) + "</code> หลังงบออก" + est + "</div>";
      } else { // current
        note += '<div class="th-stale th-stale-ok">🟢 ข้อมูลทันรอบงบ' + (E.hasDate && E.daysToEarnings > 0 ? " · งบหน้า " + esc(dtxt) + " (" + daysText(E.daysToEarnings) + ")" + est : (R.staleMonths != null ? " · อายุ " + R.staleMonths + " เดือน" : "")) + "</div>";
      }
    }
    return '<header class="th-head"><h1>🧾 Investment Thesis</h1>' +
      '<p class="th-headsub">บริษัทนี้ยังเดินตาม thesis ระยะยาวอยู่ไหม — ควรสะสมจังหวะย่อหรือไม่ · ไม่ใช่คำแนะนำซื้อขาย</p>' +
      '<div class="th-chips">' + chips + "</div>" + note + "</header>";
  }

  // ---- Lite view (uncovered ticker): live data only, no verdict ----
  function liteSection(R) {
    var t = R.inputs && R.inputs.technical;
    var mg = R.inputs && R.inputs.megaTrend;
    var rg = R.inputs && R.inputs.regime;
    var rt = R.inputs && R.inputs.rates;
    var F = R.falling || {};
    var card = function (title, big, sub) {
      return '<div class="th-lite-card"><span>' + esc(title) + "</span><b>" + big + "</b>" + (sub ? '<i>' + sub + "</i>" : "") + "</div>";
    };
    var techBig = t && t.signalScore != null ? t.signalScore + "/100" : "—";
    var techSub = t ? esc(t.thaiSignalLabel || "") + (t.aboveSma != null ? " · " + (t.aboveSma ? "เหนือ" : "ใต้") + " SMA200" : "") + (t.emaBull != null ? " · EMA " + (t.emaBull ? "ตัดขึ้น" : "ตัดลง") : "") : "รอข้อมูล — กด Load Latest Data";
    var ddBig = F.drawdownPct != null ? F.drawdownPct.toFixed(1) + "%" : "—";
    var ddSub = F.primary ? "สาเหตุหลัก: " + esc(F.primary.label) + (F.secondary ? " · รอง: " + esc(F.secondary.label) : "") : (F.hasData ? "ไม่มีการย่อที่มีนัย (จาก high 90 วัน)" : "ไม่มีข้อมูลราคา");
    var causes = (F.causes || []).map(function (c) {
      return '<li><b>' + esc(c.label) + "</b> (" + c.magnitude + ") — " + esc(c.detail) + "</li>";
    }).join("");
    return '<div class="th-lite-banner">🔎 ' + esc(R.note) + "</div>" +
      '<div class="th-lite-grid">' +
        card("Technical (live)", techBig, techSub) +
        card("ราคาย่อจาก high 90 วัน", ddBig, ddSub) +
        card("Mega Trend", mg ? mg.score + "/100" : "—", mg ? esc(mg.stateLabel) + " · เกต" + (mg.gateOpen ? "เปิด" : "ปิด") : "โหลดข้อมูลก่อน") +
        card("Macro Regime", rg ? rg.score + "/100" : "—", rg ? esc(rg.label) : "โหลดข้อมูลก่อน") +
        card("ลมต้านดอกเบี้ย", rt ? rt.score + "/100" : "—", rt ? (rt.severe ? "Severe — แรง" : "ไม่ถึงขั้น Severe") : "ไม่มีข้อมูล yield") +
      "</div>" +
      (causes ? '<div class="th-lite-causes"><h3>เจาะสาเหตุการย่อ (จากราคาจริง)</h3><ul>' + causes + "</ul></div>" : "") +
      '<div class="th-lite-cta">ต้องการมุมมองเต็ม (thesis score · dip classification · YES/NO)? → สั่ง <code>/thesis-update ' + esc(R.ticker) + '</code> ใน Claude Code เพื่อสร้างข้อมูล curated ของตัวนี้ (ใช้เวลาไม่กี่นาที)</div>';
  }

  // ---- sticky bar: บอกว่ากำลังดูหุ้นอะไรอยู่ (ค้างบนสุดเวลาเลื่อนลง) ----
  function stickyBar(R) {
    if (!R) return "";
    var th = R.thesis || {};
    var scoreTxt = th.score != null ? (th.status && th.status.label ? esc(th.status.label) + " " : "") + th.score + "/100" : "";
    var ans = R.finalVerdict ? (R.finalVerdict.answer === "YES" ? "YES" : R.finalVerdict.answer === "NO" ? "NO" : "WAIT") : null;
    return '<div class="th-sticky">' +
      '<span class="th-sticky-sym">' + esc(R.ticker || "") + "</span>" +
      (R.name ? '<span class="th-sticky-name">' + esc(R.name) + "</span>" : "") +
      (scoreTxt ? '<span class="th-sticky-score">' + scoreTxt + "</span>" : "") +
      (ans ? '<span class="th-sticky-ans th-sticky-ans-' + ans.toLowerCase() + '">' + ans + "</span>"
        : (R.lite ? '<span class="th-sticky-ans th-muted">Lite</span>' : "")) +
      "</div>";
  }

  // ---- §1 · FINAL VERDICT hero ----
  function heroSection(R) {
    var FV = R.finalVerdict || {};
    var ans = FV.answer === "YES" ? "YES" : FV.answer === "NO" ? "NO" : "WAIT";
    var ansKey = ans.toLowerCase();
    var conf = FV.confidence || R.confidence || {};
    var confBadge = conf.score != null && conf.label
      ? '<span class="th-conf-badge">ความมั่นใจ ' + conf.score + "/100 · " + esc(conf.label.thai) + "</span>"
      : '<span class="th-conf-badge th-muted">ความมั่นใจ — รอข้อมูล</span>';
    var F = FV.factors || {};
    var factorCells = [
      ["Thesis", F.thesis], ["Mega Trend", F.megaTrend], ["Macro", F.macro],
      ["Technical", F.technical], ["Valuation", F.valuation]
    ].map(function (p) {
      return '<div class="th-fcell"><span>' + esc(p[0]) + "</span><b>" + esc(fmt(p[1])) + "</b></div>";
    }).join("");
    var V = R.valuationView || {};
    var vTone = V.level === "cheap" ? "bull" : V.level === "fair" ? "blue" : V.level === "premium" ? "watch" : V.level === "expensive" ? "bear" : "neutral";
    var valLine = '<div class="th-valline">มุมมองมูลค่า: ' + toneChip(vTone, fmt(V.level)) + ' <span class="th-valnote">' + esc(V.note || "") + "</span></div>";
    var risks = FV.risks && FV.risks.length
      ? '<div class="th-risks"><h3 class="th-h3">ความเสี่ยงหลักที่ต้องจับตา</h3>' + list(FV.risks) + "</div>"
      : "";
    var pm = FV.pmSummary ? '<p class="th-pm">' + esc(FV.pmSummary) + "</p>" : "";
    return '<section class="th-hero th-hero-' + ansKey + '">' +
      '<div class="th-hero-co">' + esc(R.name || "") + " · " + esc(R.ticker || "") + "</div>" +
      '<div class="th-hero-grid">' +
        '<div class="th-hero-ans"><div class="th-q">Should I Buy This Dip?</div>' +
          '<div class="th-answer th-answer-' + ansKey + '">' + ans + "</div>" + confBadge + "</div>" +
        '<div class="th-hero-fac"><div class="th-hlbl">ปัจจัยประกอบคำตอบ</div>' +
          '<div class="th-factors">' + factorCells + "</div>" + valLine + "</div>" +
      "</div>" + pm + risks + "</section>";
  }

  // ---- §2 · Thesis score ----
  function thesisSection(R) {
    var T = R.thesis || {};
    var st = T.status || {};
    var stC = toneColor(st.tone);
    var tr = T.trend || {};
    var trTone = tr.key === "improving" ? "bull" : tr.key === "deteriorating" ? "bear" : "blue";
    var trIcon = tr.key === "improving" ? "▲" : tr.key === "deteriorating" ? "▼" : "▬";
    var pillars = (T.pillars || []).map(function (p) { return '<span class="th-chip th-pillar">' + esc(p) + "</span>"; }).join("");
    var body = '<div class="th-score-row">' +
      '<div class="th-score-big"><b style="color:' + scoreColor(T.score) + '">' + fmt(T.score) + "</b><span>/100</span></div>" +
      '<span class="th-chip" style="color:' + stC + ";border-color:" + stC + '">' + esc(st.label || "—") + (st.thai ? " · " + esc(st.thai) : "") + "</span>" +
      toneChip(trTone, trIcon + " " + (tr.thai || tr.key || "—")) + "</div>" +
      (T.statement ? '<p class="th-statement">' + esc(T.statement) + "</p>" : "") +
      (pillars ? '<div class="th-pillars"><span class="th-hlbl">เสาหลักของ thesis</span>' + pillars + "</div>" : "");
    return sec(2, "Thesis Score", "thesis ระยะยาวยังยืนอยู่แค่ไหน — คะแนนรวมจากพื้นฐาน · execution · moat · การจัดสรรทุน", body);
  }

  // ---- §3 · Why falling + dip class ----
  function fallingSection(R) {
    var F = R.falling || {};
    var D = R.dipClass || {};
    var body;
    if (!F.hasData) {
      body = '<div class="th-muted-box">ยังไม่มีข้อมูลราคา — กด Load Latest Data</div>';
    } else {
      var dd = '<div class="th-dd">ราคาย่อจากจุดสูงสุด <b>' + esc(fmt(F.drawdownPct)) + "%</b></div>";
      var cards = "";
      if (F.primary) {
        cards += '<div class="th-cause th-cause-primary"><em>สาเหตุหลัก</em><b>' + esc(F.primary.label || "—") + "</b><small>" + esc(F.primary.detail || "") + "</small></div>";
      } else {
        cards += '<div class="th-cause th-cause-none"><em>สาเหตุหลัก</em><small>ยังแยกสาเหตุหลักไม่ได้จากข้อมูลที่มี</small></div>';
      }
      if (F.secondary) {
        cards += '<div class="th-cause"><em>สาเหตุรอง</em><b>' + esc(F.secondary.label || "—") + "</b><small>" + esc(F.secondary.detail || "") + "</small></div>";
      }
      var causeRows = (F.causes || []).map(function (c) {
        return '<div class="th-mag-row"><span class="th-mag-name">' + esc(c.label) + "</span>" +
          '<div class="th-mag-val">' + bar(c.magnitude, scoreColor(c.magnitude)) + "<b>" + esc(fmt(c.magnitude)) + "</b></div>" +
          '<small class="th-mag-detail">' + esc(c.detail || "") + "</small></div>";
      }).join("");
      body = dd + '<div class="th-cause-grid">' + cards + "</div>" +
        (causeRows ? '<div class="th-mag-list"><span class="th-hlbl">น้ำหนักของแต่ละสาเหตุ</span>' + causeRows + "</div>" : "");
    }
    var banner;
    if (D && D.key) {
      banner = '<div class="th-dipbanner th-tone-' + esc(D.tone || "neutral") + '"><b>' + esc(D.label || "—") + "</b><span>" + esc(D.thai || "") + (D.why ? " · " + esc(D.why) : "") + "</span></div>";
    } else {
      banner = '<div class="th-dipbanner th-dipbanner-none"><b>ยังจำแนกประเภทการย่อไม่ได้</b><span>' + esc((D && D.thai) || "ต้องมีข้อมูลราคาก่อน — กด Load Latest Data") + "</span></div>";
    }
    return sec(3, "Why Is It Falling? + Dip Class", "ราคาย่อเพราะอะไร — และเป็นการย่อประเภทไหน (จำแนกก่อนตัดสินใจเสมอ)", body + banner);
  }

  // ---- §4 · Decision ----
  function decisionSection(R) {
    var D = R.decision || {};
    var big = '<div class="th-dec th-tone-' + esc(D.tone || "neutral") + '"><b>' + esc(D.label || "—") + "</b>" + (D.thai ? "<span>" + esc(D.thai) + "</span>" : "") + "</div>";
    var note = '<div class="th-note">ห้ามตัดสินจาก technical เดี่ยว ๆ — decision นี้ผ่านเกต thesis · Mega Trend · macro · การจำแนกประเภทการย่อ มาแล้วทั้งหมด</div>';
    return sec(4, "Decision", "ข้อสรุปเชิงปฏิบัติ — สะสม / รอ / ลดเชิงยุทธวิธี / ทบทวน thesis", big + list(D.why) + note);
  }

  // ---- §5 · Fundamentals ----
  function fundamentalsSection(R) {
    var Fu = R.fundamentals || {};
    var head = '<div class="th-fund-row th-fund-head"><span>ปัจจัย</span><span>ค่าปัจจุบัน</span><span>เทรนด์</span><span>คะแนน /100</span></div>';
    var rows = (Fu.items || []).map(function (it) {
      return '<div class="th-fund-row th-imp-' + esc(it.impact || "neutral") + '" title="' + esc(it.why || "") + '">' +
        '<span class="th-fund-name">' + esc(it.label) + "</span>" +
        '<span class="th-fund-cur">' + esc(fmt(it.current)) + "</span>" +
        trendArrow(it.trend) +
        '<div class="th-fund-score">' + bar(it.score, scoreColor(it.score)) + "<b>" + esc(fmt(it.score)) + "</b></div></div>";
    }).join("");
    var hint = '<div class="th-hint">ชี้ที่แถวเพื่อดูเหตุผลของแต่ละปัจจัย · สีพื้น = ผลต่อ thesis (เขียวหนุน / แดงฉุด)</div>';
    return sec(5, "Fundamentals", "คะแนนรวม " + fmt(Fu.score) + "/100 — ปัจจัยพื้นฐานเชิงโครงสร้าง (curated ณ asOf)",
      '<div class="th-fund-list">' + head + (rows || '<div class="th-muted-box">ยังไม่มีข้อมูลปัจจัยพื้นฐาน</div>') + "</div>" + hint);
  }

  // ---- §6 · Business Growth vs Stock Price (5Y) ----
  // synchronized indexed panels — สเกลแกน y เดียวกันทั้งสองฝั่ง เพื่อให้เห็นทันที
  // ว่าราคาวิ่งนำธุรกิจ หรือธุรกิจกำลังไล่ตามราคา
  function bpPanel(title, labels, lines, yMin, yMax) {
    var W = 340, H = 196, padL = 20, padR = 38, padT = 24, padB = 22;
    var slots = labels.length;
    var xw = slots > 1 ? (W - padL - padR) / (slots - 1) : 0;
    function X(i) { return padL + i * xw; }
    function Yp(v) { return padT + (yMax - v) / Math.max(1, yMax - yMin) * (H - padT - padB); }
    var out = '<svg class="th-bp-svg" viewBox="0 0 ' + W + " " + H + '" role="img">';
    [yMin, 100, yMax].forEach(function (g) {
      if (g < yMin - 0.1 || g > yMax + 0.1) return;
      var y = Yp(g);
      out += '<line x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '" stroke="' + (g === 100 ? "rgba(148,163,184,.5)" : "rgba(148,163,184,.18)") + '" stroke-width="1"' + (g === 100 ? ' stroke-dasharray="4 3"' : "") + "/>";
      out += '<text x="' + (W - padR + 4) + '" y="' + (y + 3) + '" class="th-bp-tick">' + Math.round(g) + "</text>";
    });
    labels.forEach(function (lb, i) {
      out += '<text x="' + X(i) + '" y="' + (H - 6) + '" text-anchor="middle" class="th-bp-x">' + esc(lb) + "</text>";
    });
    lines.forEach(function (L) {
      var pts = [];
      (L.values || []).forEach(function (v, i) { if (v != null) pts.push([X(i), Yp(v), i]); }); // เก็บ index เดิม — จุด null ไม่ทำให้เส้นประเคลื่อน
      if (!pts.length) return;
      var opP = L.opacity != null ? Number(L.opacity) : null;
      if (L.pointsOnly) {
        // จุดแยกไม่มีเส้นเชื่อม (consensus คนละฐานกับข้อมูลจริง) — วงกลมกลวง + tooltip
        pts.forEach(function (p) {
          out += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3.4" fill="none" stroke="' + L.color + '" stroke-width="1.6"' + (opP != null ? ' opacity="' + opP + '"' : "") + ">" +
            (L.tip ? "<title>" + esc(L.tip) + "</title>" : "") + "</circle>";
        });
        var lastPo = pts[pts.length - 1], lastVo = null;
        for (var io = L.values.length - 1; io >= 0; io--) { if (L.values[io] != null) { lastVo = L.values[io]; break; } }
        if (lastVo != null) out += '<text x="' + (lastPo[0] + 4).toFixed(1) + '" y="' + (lastPo[1] - 5).toFixed(1) + '" class="th-bp-mult" fill="' + L.color + '"' + (opP != null ? ' opacity="' + Math.min(1, opP + 0.15) + '"' : "") + ">×" + (Math.round(lastVo / 10) / 10) + "</text>";
        return;
      }
      if (pts.length < 2) return;
      var solidPts = L.dashFrom != null ? pts.filter(function (p) { return p[2] <= L.dashFrom; }) : pts;
      var dashPts = L.dashFrom != null ? pts.filter(function (p) { return p[2] >= L.dashFrom; }) : [];
      var toStr = function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); };
      var op = L.opacity != null ? Number(L.opacity) : null; // เส้นคาดการณ์ (consensus) ทึบต่ำกว่าเส้นจริง
      if (solidPts.length >= 2) out += '<polyline points="' + solidPts.map(toStr).join(" ") + '" fill="none" stroke="' + L.color + '" stroke-width="2.2"' + (op != null ? ' opacity="' + op + '"' : "") + "/>";
      if (dashPts.length >= 2) out += '<polyline points="' + dashPts.map(toStr).join(" ") + '" fill="none" stroke="' + L.color + '" stroke-width="2.2" stroke-dasharray="5 4" opacity="' + (op != null ? op : 0.85) + '"/>';
      var lastP = pts[pts.length - 1], lastV = null;
      for (var i = L.values.length - 1; i >= 0; i--) { if (L.values[i] != null) { lastV = L.values[i]; break; } }
      out += L.hollow
        ? '<circle cx="' + lastP[0].toFixed(1) + '" cy="' + lastP[1].toFixed(1) + '" r="3.2" fill="none" stroke="' + L.color + '" stroke-width="1.6"' + (op != null ? ' opacity="' + op + '"' : "") + "/>"
        : '<circle cx="' + lastP[0].toFixed(1) + '" cy="' + lastP[1].toFixed(1) + '" r="3" fill="' + L.color + '"/>';
      if (lastV != null) out += '<text x="' + (lastP[0] + 4).toFixed(1) + '" y="' + (lastP[1] - 5).toFixed(1) + '" class="th-bp-mult" fill="' + L.color + '"' + (op != null ? ' opacity="' + Math.min(1, op + 0.15) + '"' : "") + ">×" + (Math.round(lastV / 10) / 10) + "</text>";
    });
    out += "</svg>";
    var legend = lines.map(function (L) { return '<span class="th-bp-leg"><i style="background:' + L.color + '"></i>' + esc(L.name) + "</span>"; }).join("");
    return '<div class="th-bp-panel"><div class="th-bp-ptitle">' + esc(title) + "</div>" + out + '<div class="th-bp-legend">' + legend + "</div></div>";
  }
  function fmtPct(v) { return v == null ? "—" : (v >= 0 ? "+" : "") + v + "%"; }
  function yearSelector(W) {
    if (!W || W.maxYears < W.minYears) return "";
    var btns = "";
    for (var y = W.minYears; y <= W.maxYears; y++) {
      btns += '<button type="button" class="th-yrbtn' + (y === W.years ? " th-yrbtn-on" : "") + '" data-th-hyears="' + y + '">' + y + " ปี</button>";
    }
    return '<div class="th-yrsel"><span class="th-yrsel-lbl">ช่วงปีที่ดู</span>' + btns +
      (W.years >= W.available ? '<span class="th-yrsel-note">(ครบทุกปีที่มีใน KB)</span>' : "") + "</div>";
  }
  function modeToggle() {
    return '<div class="th-yrsel"><span class="th-yrsel-lbl">มุมมอง</span>' +
      '<button type="button" class="th-yrbtn' + (historyMode !== "quarter" ? " th-yrbtn-on" : "") + '" data-th-hmode="year">รายปี</button>' +
      '<button type="button" class="th-yrbtn' + (historyMode === "quarter" ? " th-yrbtn-on" : "") + '" data-th-hmode="quarter">รายไตรมาส</button></div>';
  }
  function quarterRangeSelector(Q) {
    var opts = [4, 8, 12].filter(function (n) { return !Q || n <= Math.max(4, Q.totalAvailable || 12); });
    var btns = opts.map(function (n) {
      return '<button type="button" class="th-yrbtn' + (n === historyQuarters ? " th-yrbtn-on" : "") + '" data-th-hquarters="' + n + '">' + (n / 4) + " ปี</button>";
    }).join("");
    return '<div class="th-yrsel"><span class="th-yrsel-lbl">ช่วงที่ดู</span>' + btns + '<span class="th-yrsel-note">(' + historyQuarters + " ไตรมาสล่าสุด)</span></div>";
  }
  // กราฟคู่รายไตรมาส (indexed ไตรมาสแรก = 100 · สเกลแกนตั้งเท่ากันทั้งสองฝั่ง)
  function quarterCharts(Q) {
    var IQ = Q.indexed || {};
    var thin = function (l, i) { return (IQ.labels || []).length > 8 && i % 2 === 1 ? "" : String(l).replace(/^Q(\d)'(\d\d)$/, "Q$1'$2"); };
    var labels = (IQ.labels || []).map(thin);
    var all = [].concat(IQ.revenue || [], IQ.eps || [], IQ.price || []).filter(function (v) { return v != null; });
    if (!all.length || !IQ.price) return "";
    var yMax = Math.max.apply(null, all) * 1.06;
    var yMin = Math.min(90, Math.floor(Math.min.apply(null, all)));
    var lines = [];
    if (IQ.revenue) lines.push({ name: "Revenue", color: "#38bdf8", values: IQ.revenue });
    if (IQ.eps) lines.push({ name: "EPS" + (IQ.epsStartQ ? " (เริ่ม " + IQ.epsStartQ + " = 100)" : ""), color: "#34d399", values: IQ.eps });
    if (!lines.length) return "";
    return '<div class="th-bp-charts">' +
      bpPanel("ธุรกิจ (Indexed ไตรมาสแรก = 100)", labels, lines, yMin, yMax) +
      bpPanel("ราคาหุ้น (Indexed ไตรมาสแรก = 100)", labels, [{ name: "Price (ราคาสิ้นไตรมาส)", color: "#f59e0b", values: IQ.price }], yMin, yMax) +
      "</div>";
  }
  // ตารางรายไตรมาส (YoY เทียบไตรมาสเดียวกันปีก่อน)
  // วันสิ้นงวด: ใช้ endDate จริงถ้ามี (DD/MM/YY) · ไม่มีก็บอกระดับเดือนพร้อม ~ (ห้ามเดาวันที่)
  function qEndDateHtml(y) {
    if (y.endDate && /^\d{4}-\d{2}-\d{2}$/.test(y.endDate)) {
      var p = y.endDate.split("-");
      return '<span class="th-qdate">' + p[2] + "/" + p[1] + "/" + p[0].slice(2) + "</span>";
    }
    if (y.endYm && /^\d{4}-\d{2}$/.test(y.endYm)) {
      var m = y.endYm.split("-");
      return '<span class="th-qdate th-qdate-approx" title="KB เก็บระดับเดือน ยังไม่มีวันสิ้นงวดที่ยืนยัน">~' + m[1] + "/" + m[0].slice(2) + "</span>";
    }
    return '<span class="th-qdate th-qdate-approx">—</span>';
  }
  function quarterTableHtml(Q) {
    var CUR = Q.currency || "$";
    var anyNote = false;
    var rows = Q.quarters.map(function (y) {
      var yoyR = y.revYoyPct != null ? ' <small class="th-bp-yoy">(' + fmtPct(y.revYoyPct) + ")</small>" : "";
      var yoyE = y.epsYoyPct != null ? ' <small class="th-bp-yoy">(' + fmtPct(y.epsYoyPct) + ")</small>" : (y.epsTurn ? ' <small class="th-bp-yoy">(พลิกกำไร)</small>' : "");
      var yoyP = y.priceYoyPct != null ? ' <small class="th-bp-yoy">(' + fmtPct(y.priceYoyPct) + ")</small>" : "";
      var pPre = y.priceLive ? CUR : "~" + CUR; // ราคาจริงจาก snapshot = ไม่มี ~ · curated = ~
      // ธงเตือนไตรมาสที่ EPS มีรายการพิเศษ (เทียบ QoQ ตรง ๆ จะเข้าใจผิด)
      var flag = "";
      if (y.epsNote) { anyNote = true; flag = ' <span class="th-qflag" title="' + esc(y.epsNote) + '">⚠</span>'; }
      return "<tr><td>" + esc(y.q) + "</td><td>" + qEndDateHtml(y) + "</td><td>~" + CUR + esc(fmt(y.revenueB)) + "B" + yoyR + "</td><td>~" + CUR + esc(fmt(y.epsAdj)) + flag + yoyE + "</td><td>~" + esc(fmt(y.opMarginPct)) + "%</td><td>~" + CUR + esc(fmt(y.fcfB)) + "B</td><td>" + pPre + esc(fmt(y.priceQEnd)) + yoyP + "</td></tr>";
    }).join("");
    var priceNote = Q.liveShown > 0
      ? Q.liveShown + " ไตรมาสล่าสุดใช้ราคาจริงจาก snapshot (Load Latest Data)" + (Q.liveShown < Q.count ? " · ที่เหลือเป็นราคา ~ประมาณ (curated)" : "")
      : "ราคาสิ้นไตรมาสเป็น ~ประมาณ (curated) — กด Load Latest Data เพื่อใช้ราคาจริง ~2 ปีล่าสุด";
    var noteLines = Q.quarters.filter(function (y) { return y.epsNote; })
      .map(function (y) { return "<li><b>" + esc(y.q) + ":</b> " + esc(y.epsNote) + "</li>"; }).join("");
    return '<div class="th-table-wrap"><table class="th-table th-bp-table"><thead><tr><th>ไตรมาส</th><th>งวดจบ</th><th>Revenue (YoY)</th><th>EPS (YoY)</th><th>Op. Margin</th><th>FCF</th><th>ราคาสิ้นไตรมาส (YoY)</th></tr></thead><tbody>' + rows + "</tbody></table></div>" +
      (anyNote ? '<div class="th-vx-link th-vx-conflict"><b>⚠ ไตรมาสที่ EPS มีรายการพิเศษ</b> — เทียบ EPS ข้ามไตรมาสตรง ๆ จะเข้าใจผิด<ul class="th-qnotes">' + noteLines + "</ul></div>" : "") +
      '<div class="th-hint">YoY = เทียบไตรมาสเดียวกันปีก่อน (ตัดฤดูกาล) · ' + Q.count + " ไตรมาสล่าสุด · " + priceNote + " · <b>งวดจบ</b> = วันสิ้นงวดจริง (DD/MM/YY) · ที่ขึ้น ~MM/YY คือ KB เก็บระดับเดือน · verdict/คะแนนยังอิงการวิเคราะห์รายปี · ตัวเลขการเงินเป็น ~curated (ผลรวม 4 ไตรมาส = ทั้งปี)</div>";
  }
  function historySection(R) {
    var TE = window.ThesisEngine;
    if (!TE || typeof TE.computeHistory !== "function") return "";
    var Hy = TE.computeHistory(R.ticker, readSnapshot() || {}, { thesisScore: R.thesis ? R.thesis.score : null, years: historyYears });
    var W = Hy && Hy.window ? Hy.window : null;
    var yrs = W ? W.years : 5;
    var title = historyMode === "quarter"
      ? "Business Growth vs Stock Price (รายไตรมาส " + (historyQuarters / 4) + " ปี)"
      : "Business Growth vs Stock Price (" + yrs + " ปี)";
    var sub = "ราคาหุ้น " + yrs + " ปีที่ผ่านมาถูกหนุนด้วยพื้นฐานธุรกิจจริงไหม — เทียบธุรกิจกับราคา ไม่ใช่การแสดงงบการเงิน";
    if (!Hy || !Hy.available) {
      return sec(6, "Business Growth vs Stock Price", sub,
        '<div class="th-muted-box">' + esc((Hy && Hy.thai) || "ยังไม่มีข้อมูลการเงินย้อนหลัง") + "</div>");
    }
    var M = Hy.metrics || {}, V = Hy.verdict || {}, A = Hy.alignment || {}, Q = Hy.quality || {}, AT = Hy.attribution || {};
    var IX = Hy.indexed || {};

    // ---- verdict banner + gap ----
    var banner = '<div class="th-dipbanner th-tone-' + esc(V.tone || "neutral") + '"><b>' + esc(V.label || "—") + "</b><span>" + esc(V.thai || "") + "</span></div>";
    var gapChip = M.gapPp != null
      ? toneChip(M.gapPp >= 12 ? "bear" : M.gapPp >= 4 ? "watch" : M.gapPp <= -4 ? "bull" : "blue",
        "Gap " + (M.gapPp >= 0 ? "+" : "") + M.gapPp + "pp/ปี — ราคา " + fmt(M.priceCagrPct) + "%/ปี vs พื้นฐาน " + fmt(M.fundCagrPct) + "%/ปี")
      : "";

    // ---- synchronized charts (shared indexed y-scale) ----
    var isQuarterView = historyMode === "quarter";
    var xLabels = (IX.labels || []).map(function (l) { return String(l).replace(/^FY(20)?/, "'"); });
    var priceVals = (IX.price || []).slice();
    var priceDashFrom = null;
    if (IX.priceNow != null) { priceDashFrom = priceVals.length - 1; priceVals.push(IX.priceNow); xLabels = xLabels.concat(["ตอนนี้"]); }
    var padVals = function (vals) { return IX.priceNow != null && vals ? vals.concat([null]) : vals; };

    // ---- เส้นคาดการณ์ (consensus จาก forwardView — อ่านอย่างเดียว) ----
    // โครงสร้างแยกจาก actual ตั้งแต่ต้นทาง: ค่า consensus ไม่เข้า IX / CAGR (คำนวณฝั่ง engine) / ตาราง FY
    var FVc = (function () { try { var c = window.ThesisData && window.ThesisData.companies ? window.ThesisData.companies[R.ticker] : null; return c && c.forwardView ? c.forwardView : null; } catch (e) { return null; } })();
    var consRev = null, consEps = null, consLabels = [], consHint = "", consLowConf = false;
    var epsBasisOk = false, epsBasisLabel = "";
    if (!isQuarterView && FVc && Array.isArray(FVc.consensus) && FVc.consensus.length && (Hy.years || []).length) {
      var consRows = FVc.consensus.filter(function (c) { return c && c.fy; });
      var baseRev = Number(Hy.years[0].revenueB), baseEps = Number(Hy.years[0].epsAdj);
      var lastFyIdx = (IX.labels || []).length - 1;
      var slotsBefore = xLabels.length; // รวมช่อง "ตอนนี้" ถ้ามี
      // ---- basis check (Part 2): consensus EPS ต่อเส้นเชื่อมได้เฉพาะเมื่อฐานตรงกับ KB ----
      // ไม่ระบุ basis = "unknown" → ห้ามเชื่อมเส้น (วาดเป็นจุดแยก) · revenue ไม่มีปัญหาฐาน ต่อได้ปกติ
      var kbEpsBasis = (function () { try { var c2 = window.ThesisData.companies[R.ticker]; return c2 && c2.history && c2.history.epsBasis ? String(c2.history.epsBasis) : ""; } catch (e2) { return ""; } })();
      var basisMatches = function (b) {
        if (!b || b === "unknown" || !kbEpsBasis) return false;
        var kbNon = /non[- ]?gaap/i.test(kbEpsBasis);
        var kbGaap = /gaap/i.test(kbEpsBasis) && !kbNon;
        return (b === "non-GAAP" && kbNon) || (b === "GAAP" && kbGaap);
      };
      epsBasisOk = consRows.length > 0 && consRows.every(function (c) { return basisMatches(c.basis || "unknown"); });
      var basisSet = {};
      consRows.forEach(function (c) { basisSet[c.basis || "unknown"] = 1; });
      epsBasisLabel = Object.keys(basisSet).map(function (b) { return b === "unknown" ? "ฐานไม่ยืนยัน" : b; }).join("/");
      var mkCons = function (base, key, actualArr, joint) {
        if (!isFinite(base) || base <= 0) return null;
        if (joint && (!actualArr || actualArr[lastFyIdx] == null)) return null;
        var vals = [], i, got = 0;
        for (i = 0; i < slotsBefore; i++) vals.push(null);
        if (joint) vals[lastFyIdx] = actualArr[lastFyIdx]; // จุดต่อจากปีจริงล่าสุด (ค่า actual เดิม ไม่ใช่ consensus)
        consRows.forEach(function (c) { var v = Number(c[key]); var ok = isFinite(v) && v > 0; vals.push(ok ? v / base * 100 : null); if (ok) got++; });
        return got ? vals : null;
      };
      consRev = mkCons(baseRev, "revenue", IX.revenue, true);
      consEps = mkCons(baseEps, "eps", IX.eps, epsBasisOk);
      if (consRev || consEps) {
        consLabels = consRows.map(function (c) { return String(c.fy).replace(/^FY(20)?/, "'") + " (คาด)"; });
        consLowConf = consRows.some(function (c) { return c.confidence === "low"; });
        consHint = '<div class="th-hint">เส้นประ/จุดปลายวงกลมกลวง "(คาด)" = consensus จาก forwardView (ณ ' + esc(FVc.asOf || "—") + ") — แสดงบนกราฟเท่านั้น ไม่ถูกนำไปคิด CAGR/ตาราง" +
          (consEps ? (epsBasisOk
            ? " · EPS คาดฐานตรงกับตาราง KB ต่อเส้นจากปีจริงได้"
            : " · EPS คาดเป็นคนละฐานกับตาราง KB (" + esc(epsBasisLabel) + ") จึงวาดเป็นจุดแยก ไม่เชื่อมเส้นจากข้อมูลจริง") : "") +
          (consLowConf ? " · มีปีที่ความมั่นใจต่ำ (อ้างอิงจาก guidance บริษัทเอง)" : "") + "</div>";
      }
    }
    var xAll = xLabels.concat(consLabels);
    var padTo = function (vals) { if (!vals) return vals; var v = vals.slice(); while (v.length < xAll.length) v.push(null); return v; };
    var consOp = consLowConf ? 0.45 : 0.6;
    var consDashFrom = (IX.labels || []).length - 1;

    var all = [].concat(IX.revenue || [], IX.eps || [], priceVals, consRev || [], consEps || []).filter(function (v) { return v != null; });
    var yMax = all.length ? Math.max.apply(null, all) * 1.06 : 120;
    var yMin = all.length ? Math.min(90, Math.floor(Math.min.apply(null, all))) : 0;
    var linesA = [];
    if (IX.revenue) linesA.push({ name: "Revenue", color: "#38bdf8", values: padTo(padVals(IX.revenue)) });
    if (IX.eps) linesA.push({ name: "EPS", color: "#34d399", values: padTo(padVals(IX.eps)) });
    if (consRev) linesA.push({ name: "Revenue (คาด)", color: "#38bdf8", values: consRev, dashFrom: consDashFrom, opacity: consOp, hollow: true });
    if (consEps) {
      if (epsBasisOk) {
        linesA.push({ name: "EPS (คาด)", color: "#34d399", values: consEps, dashFrom: consDashFrom, opacity: consOp, hollow: true });
      } else {
        linesA.push({
          name: "EPS (คาด · คนละฐาน " + epsBasisLabel + ")", color: "#34d399", values: consEps, opacity: consOp, pointsOnly: true,
          tip: "EPS consensus ฐาน " + epsBasisLabel + " ต่างจากตาราง KB (" + (kbEpsBasis || "ไม่ระบุ") + ") — แสดงเป็นจุดแยก ไม่เชื่อมกับเส้นข้อมูลจริง เพื่อไม่ให้เห็นเป็นการกระโดดของธุรกิจ"
        });
      }
    }
    var charts = linesA.length && priceVals.length
      ? '<div class="th-bp-charts">' +
        bpPanel("ธุรกิจ (Indexed ปีแรก = 100)", xAll, linesA, yMin, yMax) +
        bpPanel("ราคาหุ้น (Indexed ปีแรก = 100)", xAll, [{ name: "Price" + (IX.priceNow != null ? " (เส้นประ = ถึงราคาล่าสุด)" : ""), color: "#f59e0b", values: padTo(priceVals), dashFrom: priceDashFrom }], yMin, yMax) +
        "</div>"
      : "";
    var mult = function (v) { return v == null ? "—" : "×" + Math.round(v / 10) / 10; };
    var lastIdx = function (arr) { return arr && arr.length ? arr[arr.length - 1] : null; };
    var strip = charts
      ? '<div class="th-bp-strip">ตลอดช่วง: รายได้ ' + mult(lastIdx(IX.revenue)) +
        (IX.eps ? " · EPS " + mult(lastIdx(IX.eps)) : "") +
        " · ราคา " + mult(IX.priceNow != null ? IX.priceNow : lastIdx(IX.price)) +
        " — สเกลแกนตั้งเท่ากันทั้งสองกราฟ: เส้นไหนชันกว่า ฝั่งนั้นวิ่งนำ</div>"
      : "";
    var epsNote = IX.eps ? "" : '<div class="th-hint">เส้น indexed ของ EPS แสดงไม่ได้ (มีปีขาดทุนหรือข้อมูลไม่ครบ) — ดูค่าจริงในตารางแทน</div>';

    // ---- CAGR chips ----
    var chips = '<div class="th-qchips">' +
      toneChip("blue", "Revenue CAGR ~" + fmt(M.revCagrPct) + "%") +
      (M.epsCagrPct != null ? toneChip("blue", "EPS CAGR ~" + fmt(M.epsCagrPct) + "%") : toneChip(M.epsTurnaround ? "bull" : "neutral", M.epsTurnaround ? "EPS พลิกจากขาดทุนเป็นกำไร" : "EPS CAGR —")) +
      (M.fcfCagrPct != null ? toneChip("neutral", "FCF CAGR ~" + fmt(M.fcfCagrPct) + "%") : "") +
      toneChip("neutral", "Price CAGR ~" + fmt(M.priceCagrPct) + "%" + (M.priceBasis === "live" ? " (ถึงราคาล่าสุด " + fmt(M.currentPrice) + ")" : " (ถึงสิ้นปีบัญชีล่าสุด)")) +
      "</div>";

    // ---- 5Y table ----
    var CUR = Hy.currency || "$"; // "฿" สำหรับหุ้นไทย (history.currency)
    var rows = (Hy.years || []).map(function (y) {
      var yoyR = y.revYoyPct != null ? ' <small class="th-bp-yoy">(' + fmtPct(y.revYoyPct) + ")</small>" : "";
      var yoyE = y.epsYoyPct != null ? ' <small class="th-bp-yoy">(' + fmtPct(y.epsYoyPct) + ")</small>" : (y.epsTurn ? ' <small class="th-bp-yoy">(พลิกกำไร)</small>' : "");
      var yoyP = y.priceYoyPct != null ? ' <small class="th-bp-yoy">(' + fmtPct(y.priceYoyPct) + ")</small>" : "";
      return "<tr><td>" + esc(y.fy) + "</td><td>~" + CUR + esc(fmt(y.revenueB)) + "B" + yoyR + "</td><td>~" + CUR + esc(fmt(y.epsAdj)) + yoyE + "</td><td>~" + esc(fmt(y.opMarginPct)) + "%</td><td>~" + CUR + esc(fmt(y.fcfB)) + "B</td><td>~" + CUR + esc(fmt(y.priceFYEnd)) + yoyP + "</td></tr>";
    }).join("");
    var foot = "<tr class=\"th-bp-cagr\"><td>CAGR</td><td>~" + esc(fmt(M.revCagrPct)) + "%</td><td>" + (M.epsCagrPct != null ? "~" + esc(fmt(M.epsCagrPct)) + "%" : (M.epsTurnaround ? "พลิกกำไร" : "—")) + "</td><td>" + (M.marginDeltaPp != null ? (M.marginDeltaPp >= 0 ? "+" : "") + esc(fmt(M.marginDeltaPp)) + "pp" : "—") + "</td><td>" + (M.fcfCagrPct != null ? "~" + esc(fmt(M.fcfCagrPct)) + "%" : "—") + "</td><td>~" + esc(fmt(M.priceCagr5FYPct)) + "%/ปี</td></tr>";
    var annualTable = rows
      ? '<div class="th-table-wrap"><table class="th-table th-bp-table"><thead><tr><th>ปีบัญชี</th><th>Revenue (YoY)</th><th>EPS (YoY)</th><th>Op. Margin</th><th>FCF</th><th>ราคาสิ้นปีบัญชี (YoY)</th></tr></thead><tbody>' + rows + foot + "</tbody></table></div>"
      : "";
    // toggle รายปี ⇄ รายไตรมาส — quarter mode สลับ "กราฟ + ตาราง" (verdict/คะแนนยังอิงรายปี)
    var isQuarter = historyMode === "quarter";
    var qBlock = "";
    if (isQuarter) {
      var QD = TE.computeQuarters ? TE.computeQuarters(R.ticker, readSnapshot() || {}, { count: historyQuarters }) : null;
      if (!QD || !QD.available) {
        qBlock = '<div class="th-muted-box">' + esc((QD && QD.thai) || "ยังไม่มีข้อมูลรายไตรมาส") + "</div>";
      } else {
        var qEpsNote = QD.indexed && QD.indexed.eps
          ? (QD.indexed.epsStartQ ? '<div class="th-hint">เส้น EPS เริ่มที่ ' + esc(QD.indexed.epsStartQ) + ' (= 100) — ไตรมาสก่อนหน้านั้นขาดทุน/ฐานติดลบ index ไม่ได้ ดูค่าจริงในตาราง</div>' : "")
          : '<div class="th-hint">เส้น indexed ของ EPS รายไตรมาสแสดงไม่ได้ (มีไตรมาสขาดทุน/ข้อมูลไม่ครบ) — ดูค่าจริงในตาราง</div>';
        qBlock = quarterRangeSelector(QD) + quarterCharts(QD) + qEpsNote + quarterTableHtml(QD);
      }
    }

    // ---- score cards: Fundamental Alignment + Growth Quality ----
    var partRows = function (parts) {
      return (parts || []).map(function (p) {
        var cell = p.value == null ? '<b class="th-muted">—</b>' : bar(p.value, scoreColor(p.value)) + "<b>" + p.value + "</b>";
        return '<div class="th-part-row"><span class="th-part-name">' + esc(p.label) + '</span><div class="th-part-val">' + cell + '</div><span class="th-part-w">' + esc(fmt(p.weight)) + "%</span></div>";
      }).join("");
    };
    var qTone = Q.label ? Q.label.tone : "neutral";
    var cards = '<div class="th-bp-cards">' +
      '<div class="th-bp-card"><div class="th-hlbl">Fundamental Alignment Score</div>' +
        '<div class="th-score-row"><div class="th-score-big"><b style="color:' + scoreColor(A.score) + '">' + fmt(A.score) + "</b><span>/100</span></div>" +
        (A.label ? toneChip(A.score >= 65 ? "bull" : A.score >= 50 ? "watch" : "bear", A.label.label) : "") + "</div>" +
        (A.label ? '<p class="th-bp-cardnote">' + esc(A.label.thai) + "</p>" : "") +
        '<div class="th-part-list">' + partRows(A.parts) + "</div></div>" +
      '<div class="th-bp-card"><div class="th-hlbl">Growth Quality Score</div>' +
        '<div class="th-score-row"><div class="th-score-big"><b style="color:' + scoreColor(Q.score) + '">' + fmt(Q.score) + "</b><span>/100</span></div>" +
        (Q.label ? toneChip(qTone, Q.label.label) : "") + "</div>" +
        (Q.label ? '<p class="th-bp-cardnote">' + esc(Q.label.thai) + "</p>" : "") +
        '<div class="th-part-list">' + partRows(Q.parts) + "</div></div>" +
      "</div>";

    // ---- price attribution ----
    var attr;
    if (AT.mode === "pp" && AT.drivers && AT.drivers.length) {
      var maxAbs = Math.max.apply(null, AT.drivers.map(function (d) { return Math.abs(d.pp || 0); }).concat([1]));
      var drows = AT.drivers.map(function (d) {
        var w = Math.round(Math.abs(d.pp || 0) / maxAbs * 100);
        var color = (d.pp || 0) < 0 ? "#f43f5e" : d.key === "business" ? "#34d399" : d.key === "margin" ? "#38bdf8" : "#f59e0b";
        var star = AT.mainDriver && AT.mainDriver.key === d.key ? ' <span class="th-bp-star">★ ตัวขับหลัก</span>' : "";
        return '<div class="th-bp-attr-row"><span class="th-bp-attr-name">' + esc(d.label) + star + "</span>" +
          '<div class="th-bp-attr-val">' + bar(w, color) + "<b>" + (d.pp >= 0 ? "+" : "") + esc(fmt(d.pp)) + "pp/ปี</b></div></div>";
      }).join("");
      attr = '<div class="th-bp-attr"><span class="th-hlbl">Price Attribution — ผลตอบแทนราคา ' + (AT.totalPp >= 0 ? "+" : "") + fmt(AT.totalPp) + "pp/ปี มาจากไหน</span>" + drows +
        '<p class="th-bp-cardnote">' + esc(AT.note || "") + "</p></div>";
    } else {
      attr = '<div class="th-bp-attr"><span class="th-hlbl">Price Attribution</span><p class="th-bp-cardnote">' + esc(AT.note || "—") + "</p></div>";
    }

    // ---- verdict why + disclosure ----
    var why = '<div class="th-bp-why"><h3 class="th-h3">ทำไมถึงสรุปแบบนี้</h3>' + list(V.why) + "</div>";
    var disc = Hy.disclosure ? '<div class="th-method">📎 ' + esc(Hy.disclosure) + (Hy.notes ? " · " + esc(Hy.notes) : "") + "</div>" : "";

    var annualBlock = yearSelector(W) + charts + strip + consHint + epsNote + chips + annualTable;
    return sec(6, title, sub,
      modeToggle() + banner + '<div class="th-qchips">' + gapChip + "</div>" + (isQuarter ? qBlock : annualBlock) + cards + attr + why + disc);
  }

  // ---- §7 · Revenue quality ----
  function revenueSection(R) {
    var Q = R.revenueQuality || {};
    var chips = '<div class="th-qchips">' +
      toneChip("blue", "Acceleration: " + fmt(Q.acceleration)) +
      toneChip("neutral", "Consistency: " + fmt(Q.consistency)) +
      toneChip("neutral", "รายได้ประจำ ~" + fmt(Q.recurringPct) + "%") + "</div>";
    var note = Q.note ? '<p class="th-statement">' + esc(Q.note) + "</p>" : "";
    var segRows = (Q.segments || []).map(function (s) {
      return "<tr><td>" + esc(s.name) + "</td><td>" + esc(fmt(s.sharePct)) + "%</td><td>" + esc(s.growthNote || "—") + "</td><td>" + trendArrow(s.trend) + "</td></tr>";
    }).join("");
    var table = segRows
      ? '<div class="th-table-wrap"><table class="th-table"><thead><tr><th>เซกเมนต์</th><th>สัดส่วนรายได้</th><th>การเติบโต</th><th>เทรนด์</th></tr></thead><tbody>' + segRows + "</tbody></table></div>"
      : '<div class="th-muted-box">ยังไม่มีข้อมูลเซกเมนต์รายได้</div>';
    return sec(7, "Revenue Quality", "คะแนน " + fmt(Q.score) + "/100 — คุณภาพรายได้: เร่งตัวไหม · สม่ำเสมอไหม · เป็นรายได้ประจำแค่ไหน",
      chips + note + table);
  }

  // ---- §8 · AI execution ----
  function executionSection(R) {
    var E = R.aiExecution || {};
    var rows = (E.items || []).map(function (it) {
      var k = it.status === "executing" ? "executing" : it.status === "at-risk" ? "at-risk" : "on-track";
      return '<div class="th-exe"><span class="th-chip th-st-' + k + '">' + esc(it.status || "—") + "</span><div><b>" + esc(it.item) + "</b><small>" + esc(it.evidence || "") + "</small></div></div>";
    }).join("");
    return sec(8, "AI Execution", "คะแนน " + fmt(E.score) + "/100 — บริษัทลงมือทำตามยุทธศาสตร์ AI ได้จริงแค่ไหน (หลักฐานประกอบทุกข้อ)",
      rows ? '<div class="th-exe-list">' + rows + "</div>" : '<div class="th-muted-box">ยังไม่มีข้อมูล execution</div>');
  }

  // ---- §9 · Competitive position ----
  function competitiveSection(R) {
    var C = R.competitive || {};
    var ovTone = C.overall === "strengthening" ? "bull" : C.overall === "weakening" ? "bear" : "blue";
    var top = '<div class="th-score-row">' + toneChip(ovTone, "Overall: " + fmt(C.overall)) +
      '<span class="th-moat">🏰 Moat: ' + esc(C.moat || "—") + "</span></div>";
    var rows = (C.factors || []).map(function (f) {
      return '<div class="th-comp-row"><span class="th-comp-name">' + esc(f.label) + "</span>" +
        toneChip(statusTone(f.status), fmt(f.status)) +
        '<small class="th-comp-note">' + esc(f.note || "") + "</small></div>";
    }).join("");
    return sec(9, "Competitive Position", "คะแนน " + fmt(C.score) + "/100 — คูเมืองแข็งขึ้นหรือถูกกัดเซาะ",
      top + (rows ? '<div class="th-comp-list">' + rows + "</div>" : '<div class="th-muted-box">ยังไม่มีข้อมูลปัจจัยแข่งขัน</div>'));
  }

  // ---- §10 · Capital allocation ----
  function capitalSection(R) {
    var C = R.capitalAllocation || {};
    var rows = (C.items || []).map(function (it) {
      var tone = it.assessment === "good" ? "bull" : it.assessment === "poor" ? "bear" : "neutral";
      return '<div class="th-cap-row"><span class="th-cap-name">' + esc(it.label) + "</span>" +
        '<span class="th-cap-cur">' + esc(fmt(it.current)) + "</span>" +
        toneChip(tone, fmt(it.assessment)) +
        '<small class="th-cap-why">' + esc(it.why || "") + "</small></div>";
    }).join("");
    var verdict = C.verdict ? '<div class="th-verdict"><b>สรุป:</b> ' + esc(C.verdict) + "</div>" : "";
    return sec(10, "Capital Allocation", "คะแนน " + fmt(C.score) + "/100 — ผู้บริหารใช้เงินทุนอย่างมีวินัยแค่ไหน",
      (rows ? '<div class="th-cap-list">' + rows + "</div>" : '<div class="th-muted-box">ยังไม่มีข้อมูลการจัดสรรทุน</div>') + verdict);
  }

  // ---- §11 · What changed ----
  function changedSection(R) {
    var W = R.whatChanged || [];
    var rows = W.map(function (w) {
      var k = w.direction === "up" ? "up" : w.direction === "down" ? "down" : "flat";
      return '<div class="th-chg-row th-chg-' + k + '"><span class="th-chg-name">' + esc(w.metric) + "</span>" +
        '<span class="th-chg-val">' + esc(fmt(w.prev)) + ' <i class="th-chg-arr">→</i> <b>' + esc(fmt(w.now)) + "</b></span>" +
        trendArrow(w.direction) + "</div>";
    }).join("");
    return sec(11, "What Changed", "อะไรเปลี่ยนไปจากรอบก่อน — เฉพาะที่กระทบ thesis",
      rows ? '<div class="th-chg-list">' + rows + "</div>" : '<div class="th-muted-box">ยังไม่มีการเปลี่ยนแปลงที่บันทึกไว้</div>');
  }

  // ---- §12 · Explainability ----
  function explainSection(R) {
    var E = R.explain || {};
    var cols = '<div class="th-two-col">' +
      '<div><h3 class="th-h3">ปัจจัยที่สนับสนุนการสะสม</h3>' + list(E.allow) + "</div>" +
      '<div><h3 class="th-h3">ปัจจัยที่ให้ชะลอ / ระวัง</h3>' + list(E.discourage) + "</div></div>" +
      '<div class="th-two-col">' +
      '<div><h3 class="th-h3">สิ่งที่หนุนความมั่นใจ</h3>' + list(E.up) + "</div>" +
      '<div><h3 class="th-h3">สิ่งที่ฉุดความมั่นใจ</h3>' + list(E.down) + "</div></div>";
    var C = R.confidence || {};
    var parts = (C.parts || []).map(function (p) {
      var cell = p.value == null ? '<b class="th-muted">—</b>' : bar(p.value, scoreColor(p.value)) + "<b>" + p.value + "</b>";
      return '<div class="th-part-row"><span class="th-part-name">' + esc(p.label) + '</span><div class="th-part-val">' + cell + '</div><span class="th-part-w">' + esc(fmt(p.weight)) + "%</span></div>";
    }).join("");
    var conf = parts
      ? '<div class="th-part-list"><span class="th-hlbl">องค์ประกอบความมั่นใจ ' + (C.score != null ? C.score + "/100" : "") + (C.label ? " · " + esc(C.label.thai) : "") + "</span>" + parts + "</div>"
      : "";
    return sec(12, "Explainability", "เหตุผลทุกข้อของคำตอบ — ตรวจสอบซ้ำได้", cols + conf);
  }

  // ---- §13 · Method note ----
  function methodSection(R) {
    var body = (R.dataNote ? '<p class="th-statement">📎 ' + esc(R.dataNote) + "</p>" : "") +
      '<div class="th-method">🧭 โครงสร้าง (พื้นฐาน/execution/moat) = ความรู้ curated ณ ' + esc(R.asOf || "asOf") +
      " · Mega Trend/Macro/Technical/ราคา = live จากระบบ · deterministic ไม่มี LLM · ไม่ใช่คำแนะนำการลงทุน</div>";
    return sec(13, "Method", "ที่มาของข้อมูลและข้อจำกัด — อ่านก่อนใช้ทุกครั้ง", body);
  }

  // ---- §14 · บริบทมูลค่า (คำนวณสด) ----
  // หลักฐานประกอบของ curated valuation score — ไม่ใช่ตัวแทน ไม่ override
  // แสดงเฉพาะที่คำนวณได้จากข้อมูลจริง (ราคา snapshot + งบ curated ใน KB)
  function vxLivePrice(T, snap) {
    var hd = snap && snap.historicalData ? snap.historicalData[T] : null;
    var closes = hd && Array.isArray(hd.closes) ? hd.closes : null;
    if (!closes || !closes.length) return null;
    for (var i = closes.length - 1; i >= 0; i--) { var v = Number(closes[i]); if (isFinite(v) && v > 0) return v; }
    return null;
  }
  function vxMedian(arr) {
    var a = arr.slice().sort(function (x, y) { return x - y; });
    var n = a.length;
    return n ? (n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2) : null;
  }
  // กราฟแท่ง P/E รายปี (ทุกปีที่มีข้อมูล) + เส้นประ "ตอนนี้" + เส้นมัธยฐาน — เห็นภาพว่าปัจจุบันอยู่ตรงไหน
  function vxPeChart(pts, peNow, md) {
    if (!pts.length || peNow == null) return "";
    var W = 640, H = 210, padL = 40, padR = 92, padT = 16, padB = 28;
    var vals = pts.map(function (p) { return p.pe; });
    var yMax = Math.max(Math.max.apply(null, vals), peNow) * 1.08;
    if (!isFinite(yMax) || yMax <= 0) return "";
    var innerW = W - padL - padR, innerH = H - padT - padB;
    var Y = function (v) { return padT + (1 - v / yMax) * innerH; };
    var slot = innerW / pts.length, bw = Math.min(slot * 0.58, 64);
    var out = '<svg class="th-vx-pechart" viewBox="0 0 ' + W + " " + H + '" role="img">';
    for (var g = 1; g <= 4; g++) {
      var gv = yMax * g / 4, gy = Y(gv);
      out += '<line x1="' + padL + '" y1="' + gy.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + gy.toFixed(1) + '" stroke="rgba(148,163,184,.15)" stroke-width="1"/>' +
        '<text x="' + (padL - 5) + '" y="' + (gy + 3).toFixed(1) + '" text-anchor="end" class="th-bp-tick">' + Math.round(gv) + "</text>";
    }
    out += '<line x1="' + padL + '" y1="' + Y(0).toFixed(1) + '" x2="' + (W - padR) + '" y2="' + Y(0).toFixed(1) + '" stroke="rgba(148,163,184,.4)" stroke-width="1"/>';
    pts.forEach(function (p, i) {
      var x = padL + i * slot + (slot - bw) / 2, y = Y(p.pe);
      var v1 = Math.round(p.pe * 10) / 10;
      out += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(1, Y(0) - y).toFixed(1) + '" rx="3" fill="#38bdf8" opacity=".78"><title>' + esc(p.fy + " · P/E ณ สิ้นปีบัญชี ~" + v1) + "</title></rect>" +
        '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (y - 4).toFixed(1) + '" text-anchor="middle" class="th-bp-mult" fill="#38bdf8">' + v1 + "</text>" +
        '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle" class="th-bp-x">' + esc(String(p.fy).replace(/^FY/, "")) + "</text>";
    });
    if (md != null && isFinite(md)) {
      out += '<line x1="' + padL + '" y1="' + Y(md).toFixed(1) + '" x2="' + (W - padR) + '" y2="' + Y(md).toFixed(1) + '" stroke="rgba(148,163,184,.75)" stroke-width="1.4" stroke-dasharray="2 3"/>' +
        '<text x="' + (W - padR + 5) + '" y="' + (Y(md) + 3).toFixed(1) + '" class="th-vx-linelbl" fill="#94a3b8">มัธยฐาน ~' + (Math.round(md * 10) / 10) + "</text>";
    }
    var yNow = Y(peNow);
    // กันป้าย "ตอนนี้" ชนป้ายมัธยฐาน — ขยับหนีถ้าใกล้กันเกิน 11px
    if (md != null && isFinite(md) && Math.abs(yNow - Y(md)) < 11) yNow = Y(md) + (yNow >= Y(md) ? 11 : -11);
    out += '<line x1="' + padL + '" y1="' + Y(peNow).toFixed(1) + '" x2="' + (W - padR) + '" y2="' + Y(peNow).toFixed(1) + '" stroke="#f59e0b" stroke-width="2" stroke-dasharray="6 4"/>' +
      '<text x="' + (W - padR + 5) + '" y="' + (yNow + 3).toFixed(1) + '" class="th-vx-linelbl" fill="#f59e0b">ตอนนี้ ~' + (Math.round(peNow * 10) / 10) + "</text>";
    out += "</svg>";
    return out;
  }
  function valuationContextSection(R) {
    var T = R.ticker;
    var VE = window.ValuationEngine;
    if (!VE || typeof VE.compute !== "function") return "";
    var V;
    try { V = VE.compute(T, readSnapshot() || {}, {}); } catch (eVx) { return ""; }
    if (!V || !V.available) return ""; // ไม่มีงบใน KB (เช่น ETF) → ซ่อนทั้ง section
    var r1 = function (v) { return v == null ? "—" : Math.round(v * 10) / 10; };
    var D = window.ThesisData && window.ThesisData.companies ? window.ThesisData.companies[T] : null;

    // ---- classification chip — บริบทเทียบอดีตตัวเอง ไม่ใช่คำสั่งซื้อขาย ----
    var CLS = {
      ATTRACTIVE: { icon: "🟢", th: "ต่ำกว่าโซนอดีตตัวเอง" },
      FAIR: { icon: "🔵", th: "ใกล้ค่ากลางอดีต" },
      PREMIUM: { icon: "🟡", th: "สูงกว่าค่ากลางอดีต" },
      EXPENSIVE: { icon: "🔴", th: "สูงกว่าอดีตมาก" },
      INSUFFICIENT_DATA: { icon: "⚪", th: "ข้อมูลไม่พอ" }
    };
    var cls = CLS[V.classification] || CLS.INSUFFICIENT_DATA;
    var clsChip = '<span class="th-vx-cls th-vx-cls-' + esc(V.classification) + '">' + cls.icon + " " + esc(V.classification.replace(/_/g, " ")) + " · " + esc(cls.th) + "</span>";

    // ---- STALE / MISSING — ประกาศชัด ห้ามใช้ข้อมูลเก่าแบบเงียบ ----
    var banners = "";
    if (V.warnings.indexOf("STALE_PRICE") >= 0) {
      banners += '<div class="th-stale th-stale-warn">⚠ <b>STALE PRICE</b> — ราคาที่ใช้คือ' +
        (V.price.source === "kb-quarter-end" ? "ราคาสิ้นไตรมาส " + esc(V.price.asOf || "—") + " จาก KB" : "ราคา ณ " + esc(V.price.asOf || "—")) +
        (V.price.staleDays != null ? " (เก่า " + V.price.staleDays + " วัน)" : " (ไม่ทราบอายุ)") + " — กด <b>Load Latest Data</b> เพื่อใช้ราคาจริง ตัวเลขด้านล่างจะคลาดเคลื่อนจนกว่าจะโหลด</div>";
    }
    if (V.warnings.indexOf("STALE_FUNDAMENTAL") >= 0) {
      banners += '<div class="th-stale th-stale-warn">⚠ <b>STALE FUNDAMENTAL</b> — ไตรมาสล่าสุดใน KB จบ ' + esc(V.eps.asOf || "—") +
        " (" + V.eps.staleDays + " วันก่อน) น่าจะมีงบใหม่ออกแล้ว — รัน <code>/thesis-update " + esc(T) + "</code></div>";
    }

    var pe = V.pe.current, mdn = V.history.median, n = V.history.sampleCount;
    var pct = V.percentile.value;
    var prem = V.premiumVsMedianPct;

    // ---- fail-safe: ไม่มีตัวเลขที่เชื่อถือได้ → N/A พร้อมเหตุผล ไม่มโนตัวเลข ----
    if (pe == null) {
      return sec(14, "บริบทมูลค่า (Valuation)", "P/E ปัจจุบันเทียบอดีตตัวเอง — จาก Valuation Engine (ราคาจริง + งบ curated)",
        banners + '<div class="th-muted-box"><b>N/A — ข้อมูลไม่พอคำนวณ P/E ที่เชื่อถือได้</b><br>เหตุ: ' +
        esc(V.warnings.length ? V.warnings.join(" · ") : "insufficient data") +
        '<br><span class="th-muted">ระบบไม่ประมาณค่าแทน — Data unavailable</span></div>');
    }

    // ---- บรรทัดสรุปภาษาคน + status ----
    var summary = '<div class="th-vx-summary">P/E ~' + r1(pe) +
      (mdn != null && n >= 2 ? " · " + (prem != null && prem >= 0 ? "สูงกว่า" : "ต่ำกว่า") + "มัธยฐาน " + n + " ปี ~" + (prem != null ? Math.abs(prem) : "—") + "%" : " · ยังเทียบมัธยฐานไม่ได้") +
      " " + clsChip + "</div>";

    // ---- ป้าย percentile ปลอดภัย (ห้าม 0/100) + ขอบนอกช่วง ----
    var below = V.history.min != null && pe < V.history.min;
    var above = V.history.max != null && pe > V.history.max;
    var pctLabel = null;
    if (pct != null) {
      pctLabel = below ? "ต่ำกว่าช่วงอ้างอิงทั้งหมด" : above ? "สูงกว่าช่วงอ้างอิงทั้งหมด"
        : pct >= 100 ? "เท่าค่าสูงสุดของช่วงอ้างอิง" : pct <= 0 ? "เท่าค่าต่ำสุดของช่วงอ้างอิง" : "percentile " + pct;
    }

    // ---- การ์ดหลัก: P/E · Median · vs Median · Percentile · Forward P/E ----
    var pxNote = (V.price.source === "live-snapshot" ? "ราคา live " : "~ราคา KB ") + (Math.round(V.price.value * 100) / 100) +
      " ÷ TTM EPS ~" + V.eps.ttm + " (" + (V.eps.quarters[0] || "") + "→" + (V.eps.quarters[3] || "") + ")";
    var fwd = V.forwardPe;
    var cards = '<div class="th-vx-cards">' +
      '<div class="th-vx-card"><small>P/E (trailing TTM)</small><b>~' + r1(pe) + "</b><span>" + esc(pxNote) + "</span></div>" +
      '<div class="th-vx-card"><small>' + n + "Y Median (Year-end trailing)</small><b>~" + r1(mdn) + "</b><span>median จาก " + n + " จุดรายปีที่ valid</span></div>" +
      '<div class="th-vx-card"><small>Current vs Median</small><b>' + (prem == null ? "—" : (prem >= 0 ? "+" : "") + prem + "%") + "</b><span>" + (prem == null ? "Data unavailable" : prem >= 0 ? "แพงกว่าค่ากลางอดีตตัวเอง" : "ถูกกว่าค่ากลางอดีตตัวเอง") + "</span></div>" +
      '<div class="th-vx-card"><small>Historical Percentile</small><b>' + (pctLabel == null ? "—" : esc(V.percentile.label || "")) + "</b><span>" + (pctLabel == null ? "ข้อมูลไม่พอ (ต้องการ ≥" + (VE.CONFIG ? VE.CONFIG.minHistoryForPercentile : 5) + " ปี)" : esc(pctLabel)) + "</span></div>" +
      '<div class="th-vx-card"><small>Forward P/E</small><b>' + (fwd ? "~" + r1(fwd.pe) : "—") + "</b><span>" + (fwd ? esc(fwd.fy + " consensus (ฐาน " + fwd.epsBasis + " · " + (fwd.confidence || "—") + ")") : "Data unavailable — ไม่มี consensus ใน forwardView") + "</span></div>" +
      "</div>";

    // ---- กราฟแท่ง P/E รายปี + เส้นปัจจุบัน (Year-end trailing series — ระบุ methodology ชัด) ----
    var head = pct != null
      ? (below ? "P/E ปัจจุบัน ~" + r1(pe) + " <b>ต่ำกว่าช่วงอ้างอิงทั้งหมด</b> (ต่ำสุดในช่วง ~" + r1(V.history.min) + ")"
        : above ? "P/E ปัจจุบัน ~" + r1(pe) + " <b>สูงกว่าช่วงอ้างอิงทั้งหมด</b> (สูงสุดในช่วง ~" + r1(V.history.max) + ")"
          : pct >= 100 || pct <= 0 ? "P/E ปัจจุบัน ~" + r1(pe) + " <b>" + (pct >= 100 ? "เท่าค่าสูงสุด" : "เท่าค่าต่ำสุด") + "ของช่วงอ้างอิง</b>"
            : "P/E ปัจจุบัน ~" + r1(pe) + " อยู่ <b>percentile " + pct + "</b> (" + esc(V.percentile.label || "") + ") ของช่วงที่ผ่านมา")
      : "P/E ปัจจุบัน ~" + r1(pe) + " · เทียบรายปีตามกราฟ (percentile ไม่คำนวณ — มี " + n + " ปี ต้องการ ≥" + (VE.CONFIG ? VE.CONFIG.minHistoryForPercentile : 5) + ")";
    var chartPts = V.history.points.map(function (p) { return { fy: p.period, pe: p.pe }; });
    var band = n >= 2
      ? '<div class="th-vx-band"><div class="th-vx-bandhead">' + head + "</div>" +
      vxPeChart(chartPts, pe, mdn) +
      '<div class="th-hint">แท่งฟ้า = Year-end trailing P/E แต่ละปีบัญชีจาก KB (เฉพาะปีที่ valid · ' + n + " ปี) · เส้นประส้ม = P/E ปัจจุบัน (TTM ระหว่างปี — methodology ต่างกันเล็กน้อย เปิดเผยตรงนี้) · เส้นจุดเทา = มัธยฐาน · hover ดูค่า" +
      (V.history.excluded.length ? " · ตัดออก: " + V.history.excluded.map(function (x) { return esc(x.period + " (" + x.reason + ")"); }).join(", ") : "") + "</div>" +
      '<div class="th-vx-refnote">ช่วงอ้างอิงคือ ' + n + " ปีที่ผ่านมาเท่านั้น ไม่ใช่การเทียบกับตลาดหรือกลุ่มอุตสาหกรรม · valuation เป็นบริบท ไม่ใช่สัญญาณซื้อขาย</div></div>"
      : '<div class="th-muted-box">คำนวณ P/E ย้อนหลังไม่ได้ — ปีที่ valid ใน KB น้อยกว่า 2 ปี</div>';

    // ---- Valuation Data Quality ----
    var qmark = function (state) { return state === "fresh" || state === "verified" || state === true ? "✓" : state === "n/a" ? "—" : "⚠"; };
    var Q = V.quality;
    var qual = '<div class="th-vx-qual"><b>Valuation Data Quality</b> · Price ' + qmark(Q.price) + " " + esc(Q.price) + " (" + esc(V.price.asOf || "—") + ")" +
      " · TTM EPS " + qmark(Q.eps) + " " + esc(Q.eps) + " (" + V.eps.quarterCount + " ไตรมาส ถึง " + esc(V.eps.asOf || "—") + ")" +
      " · ADR " + qmark(Q.adr) + " " + esc(Q.adr) + (V.adr.isAdr && V.adr.ratio != null ? " (1:" + V.adr.ratio + ")" : "") +
      " · Currency " + qmark(Q.currencyMatch) + " " + esc(V.price.currency) +
      " · History " + Q.historyCount + " obs · Methodology " + esc(V.pe.methodology) + " vs " + esc(V.history.methodology) +
      " · FCF Yield / PEG / 10Y Median: — (Data unavailable)" +
      " · As Of " + esc(V.asOf.valuation) + " · engine " + esc(V.methodologyVersion) + "</div>";

    // ---- แถวเชื่อมกับ curated valuation — เทียบ "ทิศทาง" จาก valuationView.level (ตัวที่เข้าสูตรคะแนนจริง)
    // กับ classification ของ Valuation Engine · แสดงคู่ ไม่เลือกข้าง (audit: เทียบจาก fundamentals score จับ conflict ได้แค่ 1/4)
    var link = "";
    (function () {
      var lvl = D && D.valuationView ? D.valuationView.level : null; // cheap/fair/premium/expensive
      if (!lvl) return;
      var LVL_TH = { cheap: "ถูก", fair: "สมเหตุสมผล", premium: "แพงพรีเมียม", expensive: "แพง" };
      var curDir = lvl === "cheap" || lvl === "fair" ? "cheap" : "exp";
      var veDir = V.classification === "ATTRACTIVE" || V.classification === "FAIR" ? "cheap"
        : (V.classification === "PREMIUM" || V.classification === "EXPENSIVE") ? "exp" : null;
      var conflict = veDir != null && curDir !== veDir;
      link = '<div class="th-vx-link' + (conflict ? " th-vx-conflict" : "") + '">' +
        (conflict ? "⚠ " : "✓ ") +
        "มุมมอง curated (ไปข้างหน้า): <b>" + esc(LVL_TH[lvl] || lvl) + "</b>" +
        " · P/E เทียบอดีตตัวเอง: <b>" + (veDir != null ? esc(V.classification.replace(/_/g, " ")) + (pctLabel ? " · " + pctLabel : "") : "ข้อมูลไม่พอ") + "</b>" +
        (conflict
          ? " — <b>สองมุมมองขัดกัน</b>: curated มองอนาคต (กำไรข้างหน้า/คุณภาพ) ส่วน P/E เทียบเฉพาะอดีตตัวเอง " + n + " ปี — ขัดกันได้โดยไม่มีใครผิด ใช้ประกอบกัน"
          : (veDir != null ? " — ทิศทางสอดคล้องกัน" : "")) +
        "</div>";
    })();

    return sec(14, "บริบทมูลค่า (Valuation)", "P/E ปัจจุบันเทียบอดีตตัวเอง — จาก Valuation Engine (ราคาจริง + งบ curated) · เป็นบริบท ไม่ใช่คำสั่ง",
      banners + summary + cards + band + qual + link);
  }

  // กราฟแท่ง guidance เทียบผลจริง — แท่ง = ผลจริงห่างจากจุดกึ่งกลาง guidance (%) · สีตาม result
  // เส้น 0 = ตรง guidance พอดี · แถบเทาจาง = โซน inline ±1% · noGuidance = วงกลมกลวงที่เส้น 0
  // แปลงข้อความ guidance/actual → ตัวเลขหน่วยล้าน (สำหรับป้ายย่อบนกราฟ) · แปลงไม่ได้ = null ไม่เดา
  // ระวัง: "±2%", "(+24% YoY)" ต้องตัดทิ้งก่อน ไม่งั้นเลขพวกนี้จะถูกนับเป็นค่าในช่วง
  function fwParseVal(s) {
    if (s == null) return null;
    var t = String(s)
      .replace(/\([^)]*\)/g, " ")          // ตัดวงเล็บ เช่น (+24% YoY)
      .replace(/[±+]\s*\d+(\.\d+)?\s*%/g, " ") // ตัด ±2%
      .replace(/\d+(\.\d+)?\s*%/g, " ")     // ตัด %-อื่น ๆ
      .replace(/[~$,]/g, " ");
    var re = /(\d+(?:\.\d+)?)\s*([BM])?/gi, m, vals = [], unit = null;
    while ((m = re.exec(t)) !== null) {
      vals.push(Number(m[1]));
      if (m[2]) unit = m[2].toUpperCase();
    }
    if (!vals.length || !unit) return null; // ไม่มีหน่วย = เดาสเกลไม่ได้
    var v = vals.length >= 2 ? (vals[0] + vals[1]) / 2 : vals[0]; // ช่วง → จุดกึ่งกลาง
    return unit === "B" ? v * 1000 : v; // เก็บเป็นหน่วยล้าน
  }
  function fwFmtVal(vM) {
    if (vM == null) return null;
    if (vM >= 1000) {
      var b = vM / 1000;
      var s = b >= 100 ? b.toFixed(0) : b >= 10 ? b.toFixed(1) : b.toFixed(2);
      return s.replace(/\.0+$/, "").replace(/(\.\d)0$/, "$1") + "B";
    }
    return Math.round(vM) + "M";
  }
  function fwGuidanceChart(rows) {
    var mags = rows.map(function (g) { return g.magnitudePct != null && isFinite(Number(g.magnitudePct)) ? Number(g.magnitudePct) : null; });
    var nums = mags.filter(function (v) { return v != null; });
    if (!nums.length) return null;
    var W = 640, H = 252, padL = 42, padR = 14, padT = 18, padB = 67;
    var maxV = Math.max(Math.max.apply(null, nums), 2) * 1.15;
    var minV = Math.min(Math.min.apply(null, nums), 0); if (minV < 0) minV *= 1.15;
    var innerW = W - padL - padR, innerH = H - padT - padB;
    var Y = function (v) { return padT + (maxV - v) / (maxV - minV) * innerH; };
    var slot = innerW / rows.length, bw = Math.min(slot * 0.6, 40);
    var COLR = { beat: "#22c55e", inline: "#94a3b8", miss: "#ef4444" };
    var out = '<svg class="th-fw-gchart" viewBox="0 0 ' + W + " " + H + '" role="img">';
    // โซน inline ±1%
    var inlLow = Math.max(-1, minV);
    out += '<rect x="' + padL + '" y="' + Y(1).toFixed(1) + '" width="' + innerW + '" height="' + Math.max(0, Y(inlLow) - Y(1)).toFixed(1) + '" fill="rgba(148,163,184,.12)"/>';
    // gridlines
    var step = maxV > 12 ? 5 : maxV > 4 ? 2 : 1;
    for (var gv = step; gv < maxV; gv += step) {
      out += '<line x1="' + padL + '" y1="' + Y(gv).toFixed(1) + '" x2="' + (W - padR) + '" y2="' + Y(gv).toFixed(1) + '" stroke="rgba(148,163,184,.13)" stroke-width="1"/>' +
        '<text x="' + (padL - 5) + '" y="' + (Y(gv) + 3).toFixed(1) + '" text-anchor="end" class="th-bp-tick">+' + gv + "%</text>";
    }
    for (var gn = -step; gn > minV; gn -= step) {
      out += '<line x1="' + padL + '" y1="' + Y(gn).toFixed(1) + '" x2="' + (W - padR) + '" y2="' + Y(gn).toFixed(1) + '" stroke="rgba(148,163,184,.13)" stroke-width="1"/>' +
        '<text x="' + (padL - 5) + '" y="' + (Y(gn) + 3).toFixed(1) + '" text-anchor="end" class="th-bp-tick">' + gn + "%</text>";
    }
    rows.forEach(function (g, i) {
      var qShort = String(g.quarter || "").replace(" FY", "'");
      var x = padL + i * slot + (slot - bw) / 2;
      var v = mags[i];
      var tip = (g.quarter || "—") + " · guided " + (g.guided || "—") + " → " + (g.actual || "—") + (v != null ? " (" + (v >= 0 ? "+" : "") + v + "% จากจุดกึ่งกลาง)" : " (ไม่มีข้อมูล magnitude)");
      if (v == null) {
        out += '<circle cx="' + (x + bw / 2).toFixed(1) + '" cy="' + Y(0).toFixed(1) + '" r="3.2" fill="none" stroke="#64748b" stroke-width="1.4"><title>' + esc(tip) + "</title></circle>";
      } else {
        var y0 = Y(0), y1 = Y(v);
        out += '<rect x="' + x.toFixed(1) + '" y="' + Math.min(y0, y1).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(1, Math.abs(y0 - y1)).toFixed(1) + '" rx="2.5" fill="' + (COLR[g.result] || "#64748b") + '" opacity=".82"><title>' + esc(tip) + "</title></rect>" +
          '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (v >= 0 ? y1 - 3 : y1 + 10).toFixed(1) + '" text-anchor="middle" class="th-fw-gbarlbl" fill="' + (COLR[g.result] || "#64748b") + '">' + (v >= 0 ? "+" : "") + (Math.round(v * 10) / 10) + "</text>";
      }
      // ป้ายตัวเลขใต้แกน: คาด (จุดกึ่งกลาง guidance) → จริง — ดูจบในกราฟเดียว
      var cx = (x + bw / 2).toFixed(1);
      out += '<text x="' + cx + '" y="' + (H - 44) + '" text-anchor="middle" class="th-bp-x">' + esc(qShort) + "</text>";
      var gv = fwFmtVal(fwParseVal(g.guided)), av = fwFmtVal(fwParseVal(g.actual));
      if (gv) out += '<text x="' + cx + '" y="' + (H - 27) + '" text-anchor="middle" class="th-fw-gnum">คาด ' + esc(gv) + "</text>";
      if (av) out += '<text x="' + cx + '" y="' + (H - 13) + '" text-anchor="middle" class="th-fw-gnum th-fw-gnum-act" fill="' + (COLR[g.result] || "#94a3b8") + '">จริง ' + esc(av) + "</text>";
    });
    out += '<line x1="' + padL + '" y1="' + Y(0).toFixed(1) + '" x2="' + (W - padR) + '" y2="' + Y(0).toFixed(1) + '" stroke="rgba(148,163,184,.55)" stroke-width="1.2"/>';
    out += "</svg>";
    return out;
  }

  // ---- §15 · ความคาดหวังข้างหน้า (forwardView — อ่านอย่างเดียว ห้ามเขียนกลับ) ----
  // ไม่แสดงข้อมูล QoQ (มีใน §11 What Changed แล้ว) — โฟกัส revision trend + วินัย guidance
  // เส้นคาดการณ์ consensus อยู่บนกราฟ §6 (ต่อเส้นประจากปีจริงล่าสุด)
  function forwardSection(R) {
    var D = window.ThesisData && window.ThesisData.companies ? window.ThesisData.companies[R.ticker] : null;
    var FV = D && D.forwardView ? D.forwardView : null;
    if (!FV) return ""; // ticker ที่ยังไม่มี forwardView → ซ่อนทั้ง section

    // ---- C4 · ป้ายอายุข้อมูลของบล็อก forward (แยกจาก asOf บริษัท) ----
    var now = new Date();
    var nowYm = now.getFullYear() + "-" + ("0" + (now.getMonth() + 1)).slice(-2);
    var ageM = null;
    if (/^\d{4}-\d{2}$/.test(FV.asOf || "")) {
      ageM = (now.getFullYear() - Number(FV.asOf.slice(0, 4))) * 12 + (now.getMonth() + 1 - Number(FV.asOf.slice(5, 7)));
    }
    var neRaw = D.nextEarnings ? String(D.nextEarnings) : null;
    var neYm = neRaw ? neRaw.slice(0, 7) : null;
    var nePassed = neRaw ? (neRaw.length >= 10 ? new Date(neRaw + "T23:59:59") < now : neYm < nowYm) : false;
    var badge;
    if (nePassed && FV.asOf && FV.asOf <= neYm) {
      badge = '<div class="th-stale th-stale-warn">⚠ มีงบออกหลังวันที่ประทับข้อมูลนี้ (forwardView ณ ' + esc(FV.asOf) + " · งบ " + esc(neRaw) + ") — รัน <code>/thesis-update " + esc(R.ticker) + "</code> เพื่ออัปเดต consensus/guidance</div>";
    } else if (ageM != null && ageM > 3) {
      badge = '<div class="th-stale th-stale-warn">⚠ consensus อาจล้าสมัย — forwardView อายุ ' + ageM + " เดือน (ณ " + esc(FV.asOf) + ")</div>";
    } else {
      badge = '<div class="th-stale th-stale-ok">🟢 forwardView ณ ' + esc(FV.asOf || "—") + (ageM != null ? " · อายุ " + ageM + " เดือน" : "") + "</div>";
    }

    // ---- Fix 4 · วันประกาศงบถัดไป — ตัวกำหนดอายุของทุกตัวเลขใน section นี้ (อ่าน nextEarnings อย่างเดียว) ----
    var THM = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    var earn = "";
    if (neRaw) {
      var eTxt = "", eWarnSoon = false;
      if (nePassed) {
        earn = '<div class="th-stale th-stale-warn">📅 งบออกแล้ว — รอ /thesis-update</div>';
      } else {
        if (neRaw.length >= 10) {
          var eDt = new Date(neRaw + "T00:00:00");
          if (isFinite(eDt.getTime())) {
            var dLeft = Math.ceil((eDt.getTime() - now.getTime()) / 86400000);
            eTxt = "งบถัดไป ~" + eDt.getDate() + " " + THM[eDt.getMonth()] + " " + eDt.getFullYear() + " · อีก " + dLeft + " วัน";
            eWarnSoon = dLeft < 14;
          } else {
            eTxt = "งบถัดไป ~" + neRaw; // วันที่ใน KB ผิดรูปแบบ — แสดงดิบแทน NaN
          }
        } else {
          var eY = Number(neYm.slice(0, 4)), eM = Number(neYm.slice(5, 7));
          eTxt = "งบถัดไป ~" + (THM[eM - 1] || neYm) + " " + eY + " (ประมาณเดือน)";
          if (neYm === nowYm) { eTxt += " · ภายในเดือนนี้"; eWarnSoon = true; }
        }
        earn = '<div class="th-stale ' + (eWarnSoon ? "th-stale-soon" : "th-stale-ok") + '">📅 ' + esc(eTxt) + (eWarnSoon ? " — ตัวเลขในส่วนนี้จะเปลี่ยนหลังงบออก" : "") + "</div>";
      }
    }
    var badges = '<div class="th-fw-badges">' + badge + earn + "</div>";

    // ---- C1 · EPS revision trend — เฉพาะ fy ล่าสุดใน estimateHistory ----
    var eh = (FV.estimateHistory || []).filter(function (r) { return r && r.fy; });
    var c1;
    if (!eh.length) {
      c1 = '<div class="th-muted-box">ยังไม่มี estimateHistory</div>';
    } else {
      var latestFy = eh[eh.length - 1].fy;
      var rowsFy = eh.filter(function (r) { return r.fy === latestFy && r.eps != null && isFinite(Number(r.eps)); });
      if (rowsFy.length < 2) {
        c1 = '<div class="th-muted-box">ยังไม่มีประวัติพอ — ต้องรัน <code>/thesis-update ' + esc(R.ticker) + "</code> อีกอย่างน้อย 1 ครั้ง (ตอนนี้มี " + rowsFy.length + " จุดของ " + esc(latestFy) + " · เส้น revision ต้องมี ≥2 จุด — บันทึกสะสมอัตโนมัติทุกครั้งที่รัน)</div>";
      } else {
        var eps = rowsFy.map(function (r) { return Number(r.eps); });
        var lo2 = Math.min.apply(null, eps), hi2 = Math.max.apply(null, eps);
        var W2 = 220, H2 = 46, pad2 = 6;
        var xw2 = (W2 - pad2 * 2) / (eps.length - 1);
        var Y2 = function (v) { return hi2 > lo2 ? pad2 + (hi2 - v) / (hi2 - lo2) * (H2 - pad2 * 2) : H2 / 2; };
        var ptsStr = eps.map(function (v, i) { return (pad2 + i * xw2).toFixed(1) + "," + Y2(v).toFixed(1); }).join(" ");
        var chg = eps[0] !== 0 ? (eps[eps.length - 1] - eps[0]) / Math.abs(eps[0]) * 100 : null; // จุดแรก 0 → เทียบ % ไม่ได้
        var up = chg == null || chg >= 0, cCol = up ? "#34d399" : "#f43f5e";
        var chgTxt = chg != null ? (up ? "▲ +" : "▼ ") + (Math.round(chg * 10) / 10) + "%" : "—";
        var svg = '<svg class="th-fw-spark" viewBox="0 0 ' + W2 + " " + H2 + '" role="img"><polyline points="' + ptsStr + '" fill="none" stroke="' + cCol + '" stroke-width="2"/><circle cx="' + (pad2 + (eps.length - 1) * xw2).toFixed(1) + '" cy="' + Y2(eps[eps.length - 1]).toFixed(1) + '" r="3" fill="' + cCol + '"/></svg>';
        c1 = '<div class="th-fw-c1">' + svg +
          '<div class="th-fw-c1txt"><b style="color:' + cCol + '">' + chgTxt + "</b> จากจุดแรกถึงล่าสุด (EPS consensus " + esc(latestFy) + " ~" + eps[eps.length - 1] + ")" +
          '<div class="th-hint">อิง ' + rowsFy.length + " จุด · " + esc(rowsFy[0].asOf) + " ถึง " + esc(rowsFy[rowsFy.length - 1].asOf) + "</div></div></div>";
      }
    }

    // ---- C0 · ตัวเลข consensus ปีข้างหน้า (ข้อมูลที่ "มีจริง" — เดิมโผล่แค่บนกราฟ §6/footnote) ----
    var CONF_TH = { high: "หลายสำนักตรงกัน", medium: "อ้างอิงแหล่งเดียว", low: "ยังไม่ลงรอย/อิง guidance" };
    var consRows3 = (FV.consensus || []).filter(function (c) { return c && c.fy; });
    var c0 = "";
    if (consRows3.length) {
      var anyNum = consRows3.some(function (c) { return c.revenue != null || c.eps != null; });
      c0 = '<h3 class="th-h3">ตัวเลขที่ตลาดคาด (consensus)</h3><div class="th-vx-cards">' +
        consRows3.map(function (c) {
          var rev = c.revenue != null ? "$" + c.revenue + "B" : "—";
          var eps = c.eps != null ? "$" + c.eps : "—";
          var both = c.revenue == null && c.eps == null;
          return '<div class="th-vx-card"><small>' + esc(c.fy) + " (คาด)</small>" +
            "<b>" + esc(eps) + "</b>" +
            "<span>" + (both ? "ยังไม่มีตัวเลขที่ยืนยันได้ — Data unavailable" : "EPS · Revenue " + esc(rev)) +
            "<br>ความมั่นใจ " + esc(c.confidence || "—") + (CONF_TH[c.confidence] ? " (" + CONF_TH[c.confidence] + ")" : "") +
            " · ฐาน " + esc(c.basis || "unknown") + "</span></div>";
        }).join("") + "</div>" +
        (anyNum ? "" : '<div class="th-hint">ทุกปีข้างหน้ายังไม่มีตัวเลขที่ยืนยันได้ — ระบบไม่เติมค่าประมาณแทน</div>');
    }

    // ---- C2 · ประวัติ guidance (แถบบล็อก เก่า→ใหม่ + การ์ดสรุป 3 ใบ) ----
    var gt = (FV.guidanceTrack || []).slice();
    var noneGuided = gt.length > 0 && gt.every(function (g) { return g.result === "noGuidance"; });
    var c2;
    if (!gt.length) {
      c2 = '<div class="th-muted-box">ยังไม่มี guidanceTrack</div>';
    } else if (noneGuided) {
      // ต่างจาก "ข้อมูลขาด" — บริษัทนี้ไม่ให้ guidance เป็นนโยบาย จึงไม่มีสถิติ beat/miss ให้วัดโดยธรรมชาติ
      c2 = '<h3 class="th-h3">ประวัติ guidance</h3><div class="th-muted-box"><b>บริษัทนี้ไม่ให้ guidance รายไตรมาส</b> — ตรวจย้อนหลัง ' + gt.length +
        " ไตรมาสแล้วไม่มีรอบไหนให้ตัวเลขคาดการณ์ จึงไม่มีสถิติ beat/miss ให้วัด (ไม่ใช่ข้อมูลขาด)" +
        '<br><span class="th-muted">ดูรายละเอียดสิ่งที่บริษัทให้แทนได้ที่ "ที่มาและข้อจำกัดของข้อมูล" ด้านล่าง</span></div>';
    } else {
      var ordered = gt.slice().reverse(); // เก็บใหม่→เก่า → แสดงเก่า(ซ้าย)→ใหม่(ขวา)
      var SYM2 = { beat: "▲", inline: "▬", miss: "▼", noGuidance: "·" };
      var blocks = ordered.map(function (g) {
        var r = SYM2[g.result] ? g.result : "noGuidance";
        var tip = (g.quarter || "—") + " · " + (g.metric || "—") + " · guided " + (g.guided || "—") + " → " + (g.actual || "—") +
          (g.magnitudePct != null ? " (" + (g.magnitudePct >= 0 ? "+" : "") + g.magnitudePct + "% จากจุดกึ่งกลาง)" : "");
        return '<span class="th-fw-blk th-fw-' + r + '" title="' + esc(tip) + '"><i>' + SYM2[r] + "</i><small>" + esc(String(g.quarter || "").replace(" FY", "'")) + "</small></span>";
      }).join("");
      var legend = '<div class="th-fw-legend"><span><i class="th-fw-lg th-fw-beat">▲</i> beat</span>' +
        '<span><i class="th-fw-lg th-fw-inline">▬</i> inline (±1% ของจุดกึ่งกลาง)</span>' +
        '<span><i class="th-fw-lg th-fw-miss">▼</i> miss</span>' +
        '<span><i class="th-fw-lg th-fw-noGuidance">·</i> ไม่มี guidance</span></div>';
      var ng = gt.filter(function (g) { return g.result !== "noGuidance"; });
      // magnitudePct เป็น null ได้ตาม schema — กรองก่อน coerce (Number(null)=0 จะปนเปื้อนสถิติ)
      var mags = ng.filter(function (g) { return g.magnitudePct != null; })
        .map(function (g) { return Number(g.magnitudePct); })
        .filter(function (v) { return isFinite(v); });
      var statsHtml;
      if (ng.length < 4) {
        statsHtml = '<div class="th-muted-box">ข้อมูลน้อยเกินสรุป (มี ' + ng.length + " ไตรมาสที่มี guidance — การ์ดสรุปต้องการ ≥4)</div>";
      } else if (!mags.length) {
        statsHtml = '<div class="th-muted-box">ไม่มีข้อมูล magnitude ที่ใช้สรุปได้ (ทุกแถวไม่มี magnitudePct)</div>';
      } else {
        var beats = ng.filter(function (g) { return g.result === "beat"; }).length;
        var br = Math.round(100 * beats / ng.length);
        var md = vxMedian(mags);
        var mean = mags.reduce(function (a, b) { return a + b; }, 0) / mags.length;
        var sd = Math.sqrt(mags.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / mags.length);
        var mMin = Math.min.apply(null, mags), mMax = Math.max.apply(null, mags);
        var sgn = function (v) { return (v >= 0 ? "+" : "") + (Math.round(v * 10) / 10) + "%"; };
        // บรรทัดตีความ — 4 แบบตายตัวเท่านั้น + เงื่อนไขต่อท้ายเรื่องความผันผวน (Fix 3)
        var interp;
        if (br >= 80 && md <= 2) interp = "guidance ตั้งค่อนข้างระมัดระวัง — beat สม่ำเสมอแต่ขนาดเล็ก";
        else if (br >= 80 && md > 5) interp = "ผลจริงเกิน guidance อย่างมีนัยต่อเนื่อง";
        else if (br < 50) interp = "ผลจริงต่ำกว่า guidance บ่อย — guidance มีความน่าเชื่อถือจำกัด";
        else interp = "ผลจริงใกล้เคียง guidance เป็นส่วนใหญ่";
        if (sd > 4) interp += " · ขนาด beat คาดเดายาก";
        statsHtml = '<div class="th-vx-cards">' +
          '<div class="th-vx-card"><small>อัตราส่วน beat</small><b>' + br + "%</b><span>" + beats + " จาก " + ng.length + " ไตรมาสที่มี guidance</span></div>" +
          '<div class="th-vx-card"><small>ค่ากลางของ magnitude</small><b>' + (md >= 0 ? "+" : "") + (Math.round(md * 10) / 10) + "%</b><span>median ส่วนต่างผลจริงจากจุดกึ่งกลาง guidance</span></div>" +
          '<div class="th-vx-card"><small>ช่วงของ magnitude</small><b class="th-vx-card-range">' + sgn(mMin) + " ถึง " + sgn(mMax) + "</b><span>ส่วนเบี่ยงเบนมาตรฐาน ~" + (Math.round(sd * 10) / 10) + "pp — ยิ่งสูง ขนาด beat ยิ่งคาดเดายาก</span></div></div>" +
          '<div class="th-fw-interp">' + esc(interp) + "</div>";
      }
      // กราฟเทียบ guidance กับผลจริง — fallback เป็นแถบบล็อกเมื่อไม่มี magnitude เลย
      var gchart = fwGuidanceChart(ordered);
      var trackHtml = gchart
        ? gchart + '<div class="th-hint">แท่ง = ผลจริงห่างจากจุดกึ่งกลาง guidance (%) · ใต้แกน: <b>คาด</b> = จุดกึ่งกลางช่วง guidance · <b>จริง</b> = ผลที่รายงาน · เส้น 0 = ทำได้ตรง guidance พอดี · แถบเทาจาง = โซน inline ±1%</div>'
        : '<div class="th-fw-track">' + blocks + "</div>";
      // ตารางตัวเลขจริง — ที่บริษัทคาด vs ที่ทำได้ (ใหม่→เก่า) เพื่อตรวจสอบย้อนกลับได้
      var RES_TH = { beat: "เกินคาด", inline: "ตรงคาด", miss: "ต่ำกว่าคาด", noGuidance: "ไม่ให้ guidance" };
      var gRows = gt.map(function (g) {
        var r = RES_TH[g.result] ? g.result : "noGuidance";
        var mg = g.magnitudePct != null && isFinite(Number(g.magnitudePct))
          ? '<b class="th-fw-d-' + r + '">' + (g.magnitudePct >= 0 ? "+" : "") + (Math.round(g.magnitudePct * 10) / 10) + "%</b>"
          : '<span class="th-muted">—</span>';
        return "<tr><td>" + esc(g.quarter || "—") + '</td><td class="th-fw-metric">' + esc(g.metric || "—") + "</td><td>" + esc(g.guided || "—") +
          "</td><td><b>" + esc(g.actual || "—") + "</b></td><td>" + mg +
          '</td><td><span class="th-fw-res th-fw-' + r + '">' + esc(RES_TH[r]) + "</span></td></tr>";
      }).join("");
      // ตารางเต็ม (ช่วง guidance ตามที่ประกาศจริง) — พับเก็บ เพราะตัวเลขหลักอยู่บนกราฟแล้ว
      var gTable = '<details class="th-fw-src"><summary>ตารางตัวเลขเต็ม — ช่วง guidance ที่ประกาศ + metric (' + gt.length + " ไตรมาส)</summary>" +
        '<div class="th-table-wrap"><table class="th-table th-bp-table th-fw-table"><thead><tr><th>ไตรมาส</th><th>metric</th><th>ที่บริษัทคาด (guidance)</th><th>ที่ทำได้จริง</th><th>ต่างจากจุดกึ่งกลาง</th><th>ผล</th></tr></thead><tbody>' +
        gRows + "</tbody></table></div>" +
        '<div class="th-hint">เรียงใหม่→เก่า · ต่างจากจุดกึ่งกลาง = ผลจริงเทียบจุดกึ่งกลางของช่วง guidance · ตัวเลขเป็น ~curated จาก earnings press release ของบริษัท</div></details>';
      c2 = '<h3 class="th-h3">ประวัติ guidance เทียบผลจริง — เก่า (ซ้าย) → ใหม่ (ขวา)</h3>' +
        trackHtml + legend + gTable + statsHtml;
    }

    // ---- Fix 5 · ที่มาและข้อจำกัดของข้อมูล — รายการพับเก็บได้ (ปิดเป็นค่าเริ่มต้น) ----
    var confTh = { high: "หลายสำนักตรงกัน", medium: "อ้างอิงแหล่งเดียว", low: "ประมาณจาก guidance บริษัทเอง" };
    var srcItems = [];
    var consRows2 = FV.consensus || [];
    if (consRows2.length) {
      srcItems.push("<li><b>ที่มาของ consensus:</b> forwardView ณ " + esc(FV.asOf || "—") + " · " +
        consRows2.map(function (c) { return esc(c.fy) + " — confidence " + esc(c.confidence || "—") + (confTh[c.confidence] ? " (" + confTh[c.confidence] + ")" : ""); }).join(" · ") + "</li>");
    }
    srcItems.push("<li><b>ฐานการคำนวณ:</b> ตาราง KB ใช้ " + esc((D.history && D.history.epsBasis) || "ฐานตามที่ระบุใน KB") +
      (consRows2.length ? " · consensus: " + consRows2.map(function (c) { return esc(c.fy) + " = " + esc(c.basis || "unknown — ยังไม่ยืนยันฐาน"); }).join(" · ") : "") + "</li>");
    var lims = [];
    consRows2.forEach(function (c) {
      if (c.confidence && c.confidence !== "high") lims.push(esc(c.fy) + " " + (confTh[c.confidence] || esc(c.confidence)));
      if (c.revenue == null) lims.push(esc(c.fy) + " ไม่มี revenue ที่ยืนยันได้");
      if (c.eps == null) lims.push(esc(c.fy) + " ไม่มี EPS ที่ยืนยันได้");
    });
    if (lims.length) srcItems.push("<li><b>ข้อจำกัดที่ทราบ:</b> " + lims.join(" · ") + "</li>");
    if ((FV.guidanceTrack || []).length) {
      srcItems.push("<li><b>ที่มาของ guidanceTrack:</b> " + FV.guidanceTrack.length + " ไตรมาส จาก earnings press release / IR page ของบริษัท (curated ผ่าน /thesis-update)</li>");
    }
    if (FV.note) srcItems.push("<li><b>ข้อสังเกตจากรอบอัปเดตล่าสุด:</b> " + esc(FV.note) + "</li>");
    var noteHtml = srcItems.length
      ? '<details class="th-fw-src"><summary>ที่มาและข้อจำกัดของข้อมูล</summary><ul>' + srcItems.join("") + "</ul></details>"
      : "";

    return sec(15, "ความคาดหวังข้างหน้า (Forward View)", "ตัวเลขที่ตลาดคาด + แนวโน้มการปรับประมาณการ + วินัย guidance — เส้นคาดการณ์ (คาด) ต่ออยู่บนกราฟ §6",
      badges + c0 + '<h3 class="th-h3">EPS revision trend</h3>' + c1 + c2 + noteHtml);
  }

  // ============================================================ boot
  function goLite() {
    var inp = document.getElementById("thLiteInput");
    if (inp && inp.value.trim()) setTicker(inp.value);
  }
  function onRootClick(e) {
    if (e.target && e.target.id === "thLiteGo") { goLite(); return; }
    var mb = e.target && e.target.closest ? e.target.closest("[data-th-hmode]") : null;
    if (mb) { historyMode = mb.getAttribute("data-th-hmode") === "quarter" ? "quarter" : "year"; render(); return; }
    var qb = e.target && e.target.closest ? e.target.closest("[data-th-hquarters]") : null;
    if (qb) { historyQuarters = Math.round(Number(qb.getAttribute("data-th-hquarters"))) || 12; render(); return; }
    var yb = e.target && e.target.closest ? e.target.closest("[data-th-hyears]") : null;
    if (yb) { historyYears = Math.round(Number(yb.getAttribute("data-th-hyears"))) || null; render(); return; }
    var cc = e.target && e.target.closest ? e.target.closest("[data-th-cmp-clear]") : null;
    if (cc) { compareSel = []; saveCompareSel(); render(); return; }
    var cb = e.target && e.target.closest ? e.target.closest("[data-th-cmp-toggle]") : null;
    if (cb) { compareMode = !compareMode; render(); return; }
    var el = e.target && e.target.closest ? e.target.closest("[data-th-ticker]") : null;
    if (el) {
      var tk = el.getAttribute("data-th-ticker");
      if (compareMode) {
        // ชิปเป็น multi-select: กดซ้ำ = เอาออก · เกิน 4 = ตัดตัวเก่าสุดออก
        var ix = compareSel.indexOf(tk);
        if (ix >= 0) compareSel.splice(ix, 1);
        else { compareSel.push(tk); while (compareSel.length > cmpMax()) compareSel.shift(); }
        saveCompareSel();
        render();
        return;
      }
      setTicker(tk);
    }
  }
  function onRootKey(e) {
    if (e.key === "Enter" && e.target && e.target.id === "thLiteInput") { e.preventDefault(); goLite(); }
  }
  function init() {
    var root = document.getElementById(ROOT_ID);
    if (root) { root.addEventListener("click", onRootClick); root.addEventListener("keydown", onRootKey); }
    render();
    window.addEventListener("portfolio-data-snapshot", render);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();

  window.ThesisPage = { render: render };
})();
