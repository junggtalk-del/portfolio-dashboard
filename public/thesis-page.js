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
      methodSection(R);
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
      var on = c.ticker === sel;
      return '<button type="button" class="th-chipbtn' + (on ? " th-chipbtn-on" : "") + '" data-th-ticker="' + esc(c.ticker) + '" title="' + esc(c.name) + '">' + esc(c.ticker) + "</button>";
    }).join("");
    if (!covered) chips += '<button type="button" class="th-chipbtn th-chipbtn-on th-chipbtn-lite" data-th-ticker="' + esc(sel) + '">' + esc(sel) + " (Lite)</button>";
    chips += '<span class="th-litebox"><input id="thLiteInput" type="text" placeholder="ดูตัวอื่น (Lite) เช่น PLTR" maxlength="12" />' +
      '<button type="button" id="thLiteGo" class="th-chipbtn">ดู</button></span>';
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
      if (pts.length < 2) return;
      var solidPts = L.dashFrom != null ? pts.filter(function (p) { return p[2] <= L.dashFrom; }) : pts;
      var dashPts = L.dashFrom != null ? pts.filter(function (p) { return p[2] >= L.dashFrom; }) : [];
      var toStr = function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); };
      if (solidPts.length >= 2) out += '<polyline points="' + solidPts.map(toStr).join(" ") + '" fill="none" stroke="' + L.color + '" stroke-width="2.2"/>';
      if (dashPts.length >= 2) out += '<polyline points="' + dashPts.map(toStr).join(" ") + '" fill="none" stroke="' + L.color + '" stroke-width="2.2" stroke-dasharray="5 4" opacity=".85"/>';
      var lastP = pts[pts.length - 1], lastV = null;
      for (var i = L.values.length - 1; i >= 0; i--) { if (L.values[i] != null) { lastV = L.values[i]; break; } }
      out += '<circle cx="' + lastP[0].toFixed(1) + '" cy="' + lastP[1].toFixed(1) + '" r="3" fill="' + L.color + '"/>';
      if (lastV != null) out += '<text x="' + (lastP[0] + 4).toFixed(1) + '" y="' + (lastP[1] - 5).toFixed(1) + '" class="th-bp-mult" fill="' + L.color + '">×' + (Math.round(lastV / 10) / 10) + "</text>";
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
  function quarterTableHtml(Q) {
    var CUR = Q.currency || "$";
    var rows = Q.quarters.map(function (y) {
      var yoyR = y.revYoyPct != null ? ' <small class="th-bp-yoy">(' + fmtPct(y.revYoyPct) + ")</small>" : "";
      var yoyE = y.epsYoyPct != null ? ' <small class="th-bp-yoy">(' + fmtPct(y.epsYoyPct) + ")</small>" : (y.epsTurn ? ' <small class="th-bp-yoy">(พลิกกำไร)</small>' : "");
      var yoyP = y.priceYoyPct != null ? ' <small class="th-bp-yoy">(' + fmtPct(y.priceYoyPct) + ")</small>" : "";
      var pPre = y.priceLive ? CUR : "~" + CUR; // ราคาจริงจาก snapshot = ไม่มี ~ · curated = ~
      return "<tr><td>" + esc(y.q) + "</td><td>~" + CUR + esc(fmt(y.revenueB)) + "B" + yoyR + "</td><td>~" + CUR + esc(fmt(y.epsAdj)) + yoyE + "</td><td>~" + esc(fmt(y.opMarginPct)) + "%</td><td>~" + CUR + esc(fmt(y.fcfB)) + "B</td><td>" + pPre + esc(fmt(y.priceQEnd)) + yoyP + "</td></tr>";
    }).join("");
    var priceNote = Q.liveShown > 0
      ? Q.liveShown + " ไตรมาสล่าสุดใช้ราคาจริงจาก snapshot (Load Latest Data)" + (Q.liveShown < Q.count ? " · ที่เหลือเป็นราคา ~ประมาณ (curated)" : "")
      : "ราคาสิ้นไตรมาสเป็น ~ประมาณ (curated) — กด Load Latest Data เพื่อใช้ราคาจริง ~2 ปีล่าสุด";
    return '<div class="th-table-wrap"><table class="th-table th-bp-table"><thead><tr><th>ไตรมาส</th><th>Revenue (YoY)</th><th>EPS (YoY)</th><th>Op. Margin</th><th>FCF</th><th>ราคาสิ้นไตรมาส (YoY)</th></tr></thead><tbody>' + rows + "</tbody></table></div>" +
      '<div class="th-hint">YoY = เทียบไตรมาสเดียวกันปีก่อน (ตัดฤดูกาล) · ' + Q.count + " ไตรมาสล่าสุด · " + priceNote + " · verdict/คะแนนยังอิงการวิเคราะห์รายปี · ตัวเลขการเงินเป็น ~curated (ผลรวม 4 ไตรมาส = ทั้งปี)</div>";
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
    var xLabels = (IX.labels || []).map(function (l) { return String(l).replace(/^FY(20)?/, "'"); });
    var priceVals = (IX.price || []).slice();
    var priceDashFrom = null;
    if (IX.priceNow != null) { priceDashFrom = priceVals.length - 1; priceVals.push(IX.priceNow); xLabels = xLabels.concat(["ตอนนี้"]); }
    var padVals = function (vals) { return IX.priceNow != null && vals ? vals.concat([null]) : vals; };
    var all = [].concat(IX.revenue || [], IX.eps || [], priceVals).filter(function (v) { return v != null; });
    var yMax = all.length ? Math.max.apply(null, all) * 1.06 : 120;
    var yMin = all.length ? Math.min(90, Math.floor(Math.min.apply(null, all))) : 0;
    var linesA = [];
    if (IX.revenue) linesA.push({ name: "Revenue", color: "#38bdf8", values: padVals(IX.revenue) });
    if (IX.eps) linesA.push({ name: "EPS", color: "#34d399", values: padVals(IX.eps) });
    var charts = linesA.length && priceVals.length
      ? '<div class="th-bp-charts">' +
        bpPanel("ธุรกิจ (Indexed ปีแรก = 100)", xLabels, linesA, yMin, yMax) +
        bpPanel("ราคาหุ้น (Indexed ปีแรก = 100)", xLabels, [{ name: "Price" + (IX.priceNow != null ? " (เส้นประ = ถึงราคาล่าสุด)" : ""), color: "#f59e0b", values: priceVals, dashFrom: priceDashFrom }], yMin, yMax) +
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

    var annualBlock = yearSelector(W) + charts + strip + epsNote + chips + annualTable;
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
    var el = e.target && e.target.closest ? e.target.closest("[data-th-ticker]") : null;
    if (el) setTicker(el.getAttribute("data-th-ticker"));
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
