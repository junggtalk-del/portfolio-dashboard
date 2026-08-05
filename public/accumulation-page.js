(function () {
  "use strict";

  // ============================================================
  // Accumulation Center — "จังหวะย่อตัวไหนควรค่าแก่การสะสมวันนี้?"
  // ต่างจาก Action Center (เกิดอะไรขึ้นวันนี้): หน้านี้จัดอันดับ PULLBACK
  // ที่มีพื้นฐานรองรับ — ห้ามแนะนำสะสมจากเทคนิคเดี่ยว ๆ เด็ดขาด
  //
  // Reuse ทั้งหมด ไม่สร้างใหม่:
  //  - Universe เดียวกับ Action Center (seed + userAssets + holdings —
  //    อ่านจาก store เดิม read-only: localStorage + snapshot)
  //  - ThesisEngine.compute ให้ 7/8 ปัจจัยในคอลเดียว (thesis, mega, macro,
  //    rates, dipClass, valuation, drawdown) · เทคนิค timing จาก snapshot
  //  - หุ้นที่ไม่มี thesis ไม่ถูกจัดอันดับ (หลักการ: ไม่มีพื้นฐาน = ไม่แนะนำสะสม)
  //
  // Accumulation Score (renormalized เมื่อบางส่วนไม่มีข้อมูล):
  //   Thesis 40 · Business Growth vs ราคา (ถ่วงน้ำหนัก 2-5 ปี · ปีล่าสุดมากกว่า) 25 · Timing 20 · Valuation 15
  // Recommendation แสดงได้ 4 แบบเท่านั้น: Aggressive Accumulation ·
  // Gradual Accumulation · Wait · Review Thesis (ไม่มี Buy/Sell)
  // ============================================================

  var ROOT_ID = "accRoot";
  var MAX_BUCKET_PCT = 10; // เพดานสะสมต่อ bucket — เดียวกับ Action Center
  // สูตรกลาง (Accumulation Score / dip timing / why checklist / quarterly buckets)
  // อยู่ใน portfolio-manager-engine.js — หน้านี้ delegate ไม่คำนวณซ้ำ

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  function fin(v) { var n = Number(v); return Number.isFinite(n) ? n : null; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function readSnapshot() { try { return (window.PortfolioDataSnapshot && window.PortfolioDataSnapshot.read && window.PortfolioDataSnapshot.read()) || null; } catch (e) { return null; } }
  function canonical(t) { return window.PortfolioCore && window.PortfolioCore.canonicalSymbolFromTicker ? window.PortfolioCore.canonicalSymbolFromTicker(t) : String(t || "").toUpperCase(); }

  // ---------------- universe (อ่าน store เดิมของ Action Center — read-only) ----------------
  function universePool(snapshot) {
    var seed = (window.AIBoomUniverseSeed && window.AIBoomUniverseSeed.ai_boom_universe) || [];
    var readArr = function (k) { try { var v = JSON.parse(localStorage.getItem(k) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
    var userAssets = readArr("aiBoomUniverseUserAssets");
    var removedIds = new Set(readArr("aiBoomUniverseRemovedAssetIds"));
    var excluded = new Set(readArr("aiBoomUniverseExcludedTickers").map(canonical));
    var holdings = (snapshot && snapshot.portfolioHoldings && snapshot.portfolioHoldings.data) || [];
    var heldKeys = new Set(holdings.filter(function (h) { return h.isHolding; }).map(function (h) { return canonical(h.canonicalSymbol); }));
    var map = new Map();
    seed.forEach(function (a) {
      var key = canonical(a.ticker);
      if (!key || removedIds.has(a.id)) return;
      map.set(key, { ticker: key, name: a.name || key });
    });
    userAssets.forEach(function (a) { var key = canonical(a.ticker); if (key) map.set(key, { ticker: key, name: a.name || key }); });
    holdings.forEach(function (h) { var key = canonical(h.canonicalSymbol); if (key && h.isHolding) map.set(key, { ticker: key, name: h.assetName || key }); });
    excluded.forEach(function (key) { if (!heldKeys.has(key)) map.delete(key); });
    return { list: Array.from(map.values()), heldKeys: heldKeys, holdings: holdings };
  }

  // ---------------- exposure (เพดานสะสม — ฐาน Quarterly bucket แบบ Action Center) ----------------
  function exposureOf(ticker, uni, buckets) {
    var key = canonical(ticker);
    var rec = uni.holdings.find(function (h) { return canonical(h.canonicalSymbol) === key && h.isHolding; });
    if (!rec) return { held: false, pct: null, basis: null };
    var bucket = rec.portfolioBucket || (key.endsWith(".BK") ? "thai-stock" : (key.indexOf("BTC") >= 0 ? "bitcoin" : "foreign-stock"));
    var denom = buckets[bucket] || 0;
    var labels = { "foreign-stock": "หุ้นต่างประเทศ", "thai-stock": "หุ้นไทย", bitcoin: "Bitcoin" };
    if (denom > 0) return { held: true, pct: (Number(rec.marketValue) || 0) / denom * 100, basis: labels[bucket] || bucket, quarterly: true };
    return { held: true, pct: null, basis: labels[bucket] || bucket, quarterly: false };
  }

  // ---------------- ประเมินรายตัว (เฉพาะที่มี thesis — ครบ 8 ปัจจัย) ----------------
  function evaluate(ticker, name, snapshot, uni, buckets) {
    var TE = window.ThesisEngine, PM = window.PMEngine;
    var o;
    try { o = TE.compute(ticker, snapshot, {}); } catch (e) { return null; }
    if (!o || !o.available) return null;
    var tr = PM.techOf(snapshot, ticker);
    // Business Growth vs ราคา = เฉลี่ย 3 ช่วงปีล่าสุด (2/3/4 ปี) — สูตรกลางใน PM engine
    var histories = (PM.GROWTH_WINDOWS || [2, 3, 4]).map(function (y) {
      try { return TE.computeHistory ? TE.computeHistory(ticker, snapshot, { years: y }) : null; } catch (e3) { return null; }
    });
    var growth = PM.growthSummary(histories);
    var sc = PM.accumulationScore(o, tr, growth); // Thesis 40 / Growth-vs-ราคา 2-5ปี 25 / Timing 20 / Valuation 15
    var timing = sc.timing, parts = sc.parts, score = sc.score;
    var valLevel = sc.valLevel;

    // dip classification (4 ระดับตามสเปก) — จาก thesis engine โดยตรง
    var dk = o.dipClass ? o.dipClass.key : null;
    var dip;
    if (o.thesis.score < 55 || dk === "broken" || dk === "fundamental") {
      dip = { key: "review", icon: "🔴", label: "Review Investment Thesis", thai: "พื้นฐานเริ่มแผ่ว — ยังไม่ควรสะสม" };
    } else if (o.decision.key === "strong-accumulate" || o.decision.key === "accumulate") {
      dip = dk === "healthy"
        ? { key: "healthy", icon: "🟢", label: "Healthy Pullback", thai: "ธุรกิจแข็ง Mega Trend ยืน — เหมาะสะสม" }
        : { key: "macro", icon: "🟡", label: "Macro Pullback", thai: "ธุรกิจแข็ง macro กดชั่วคราว — ทยอยสะสม" };
    } else {
      dip = { key: "wait", icon: "🟠", label: "Wait for Confirmation", thai: "ธุรกิจยังดี แต่เทคนิค/macro ยังไม่หนุน" };
    }

    // recommendation — 4 แบบเท่านั้น + เพดาน exposure
    var exp = exposureOf(ticker, uni, buckets);
    var rec, recWhy = o.decision.why && o.decision.why.length ? o.decision.why[0] : o.decision.thai;
    if (o.decision.key === "review-thesis") rec = { key: "review", label: "Review Thesis", tone: "bear" };
    else if (o.decision.key === "strong-accumulate") rec = { key: "aggressive", label: "Aggressive Accumulation", tone: "bull" };
    else if (o.decision.key === "accumulate") rec = { key: "gradual", label: "Gradual Accumulation", tone: "bull" };
    else rec = { key: "wait", label: "Wait", tone: "watch" };
    if ((rec.key === "aggressive" || rec.key === "gradual") && exp.held && exp.quarterly && exp.pct >= MAX_BUCKET_PCT) {
      rec = { key: "wait", label: "Wait", tone: "watch" };
      recWhy = "เข้าเกณฑ์สะสมแต่ถือครบเพดาน " + MAX_BUCKET_PCT + "% ของ" + exp.basis + " แล้ว (" + exp.pct.toFixed(1) + "%)";
    }

    // "ทำไมถึงเป็นจังหวะย่อที่ดี" — checklist ✓/✗ (สูตรกลาง)
    var why = PM.whyChecklist(o, timing, valLevel, growth);

    return {
      ticker: ticker, name: o.name || name, score: score, parts: parts,
      dip: dip, rec: rec, recWhy: recWhy, why: why.slice(0, 7),
      dd: timing.dd, exp: exp, stale: o.stale, thesisScore: o.thesis.score,
      valLevel: valLevel, decisionKey: o.decision.key
    };
  }

  // ---------------- render ----------------
  function partBars(parts) {
    return parts.map(function (p) {
      var v = p.value != null ? p.value : null;
      var col = v == null ? "#64748b" : v >= 70 ? "#34d399" : v >= 40 ? "#f59e0b" : "#f43f5e";
      return '<div class="acc-part"><span>' + esc(p.label) + ' <em>' + p.weight + '%</em></span>' +
        '<div class="acc-bar"><i style="width:' + (v == null ? 0 : v) + '%;background:' + col + '"></i></div><b>' + (v == null ? "—" : v) + "</b></div>";
    }).join("");
  }
  function whyList(why) {
    return why.map(function (a) {
      return '<div class="acc-why ' + (a.ok ? "acc-ok" : "acc-no") + '">' + (a.ok ? "✓" : "✗") + " " + esc(a.txt) + "</div>";
    }).join("");
  }
  function card(e, rank) {
    var detail = "/asset/" + encodeURIComponent(e.ticker);
    var recTone = e.rec.tone === "bull" ? "acc-rec-bull" : e.rec.tone === "bear" ? "acc-rec-bear" : "acc-rec-watch";
    var expTxt = e.exp.held
      ? (e.exp.pct != null ? "ถืออยู่ " + e.exp.pct.toFixed(1) + "% ของ" + esc(e.exp.basis) + " (เพดาน " + MAX_BUCKET_PCT + "%)" : "ถืออยู่ (" + esc(e.exp.basis || "") + " — ยังไม่ตั้ง Quarterly)")
      : "ยังไม่ได้ถือ";
    return '<article class="acc-card' + (rank <= 3 ? " acc-card-top" : "") + '">' +
      '<div class="acc-head"><span class="acc-rank">#' + rank + '</span>' +
      '<div class="acc-title"><a class="acc-sym" href="' + detail + '">' + esc(e.ticker) + "</a><small>" + esc(e.name) + "</small></div>" +
      '<div class="acc-score"><b>' + (e.score == null ? "—" : e.score) + '</b><span>/100</span></div></div>' +
      '<div class="acc-line">' + e.dip.icon + ' <b>' + esc(e.dip.label) + "</b> — " + esc(e.dip.thai) +
      (e.dd != null ? ' · ย่อ ' + e.dd.toFixed(1) + '%' : "") + "</div>" +
      '<div class="acc-rec ' + recTone + '">' + esc(e.rec.label) + '<small>' + esc(e.recWhy || "") + "</small></div>" +
      '<details class="acc-details"><summary>ทำไมถึงเข้า/ไม่เข้าเกณฑ์ + องค์ประกอบคะแนน</summary>' +
      '<div class="acc-whywrap">' + whyList(e.why) + "</div>" +
      '<div class="acc-parts">' + partBars(e.parts) + "</div>" +
      '<div class="acc-exp">💼 ' + expTxt + ' · <a href="/thesis" onclick="try{localStorage.setItem(\'thesis_selected_v1\',\'' + esc(e.ticker) + '\')}catch(e){}">เปิด Thesis →</a></div>' +
      "</details>" +
      (e.stale ? '<div class="acc-stale">⚠ ข้อมูล thesis เก่า — สั่ง /thesis-update ' + esc(e.ticker) + "</div>" : "") +
      "</article>";
  }

  function render() {
    var root = document.getElementById(ROOT_ID);
    if (!root) return;
    var snapshot = readSnapshot();
    var TE = window.ThesisEngine, TD = window.ThesisData;
    if (!TE || !TD || !window.PMEngine) { root.innerHTML = '<div class="mc-empty"><strong>Thesis/PM Engine ไม่พร้อม</strong> — refresh หน้านี้</div>'; return; }
    if (!snapshot) { root.innerHTML = header(null) + '<div class="mc-empty"><strong>ยังไม่มี Data Snapshot</strong><br>กด Load Latest Data ก่อน — คะแนน Mega Trend/Macro/Timing ต้องใช้ราคาจริง</div>'; return; }

    var uni = universePool(snapshot);
    var buckets = window.PMEngine.quarterlyBuckets(snapshot);
    var covered = TE.companiesFrom(TD).map(function (c) { return c.ticker; });
    var coveredSet = new Set(covered.map(canonical));
    var entries = covered
      .map(function (t) { var m = uni.list.find(function (u) { return canonical(u.ticker) === canonical(t); }); return evaluate(t, m ? m.name : t, snapshot, uni, buckets); })
      .filter(Boolean)
      .sort(function (a, b) { return (b.score || 0) - (a.score || 0) || String(a.ticker).localeCompare(String(b.ticker)); });

    var counts = { healthy: 0, macro: 0, wait: 0, review: 0 };
    entries.forEach(function (e) { counts[e.dip.key] = (counts[e.dip.key] || 0) + 1; });
    var uncovered = uni.list.filter(function (u) { return !coveredSet.has(canonical(u.ticker)); });

    var top = entries.slice(0, 10);
    var rest = entries.slice(10);
    root.innerHTML = header(counts) +
      '<section class="acc-sec"><h2>🏆 Top 10 Accumulation Opportunities</h2><p>จัดอันดับด้วย Accumulation Score — น้ำหนัก Thesis 40 · Business Growth vs ราคา (ถ่วงน้ำหนัก 2-5 ปี · ปีล่าสุดมากกว่า) 25 · Timing 20 · Valuation 15 (ถอด Macro/ดอกเบี้ย/Mega Trend คำนวณออก — มุมมอง AI Megatrend คุณตัดสินใจเองที่หน้า AI Portfolio Manager · เทคนิคเป็นเครื่องมือจับจังหวะ ไม่ใช่ตัวตัดสิน)</p>' +
      (top.length ? '<div class="acc-grid">' + top.map(function (e, i) { return card(e, i + 1); }).join("") + "</div>"
        : '<div class="mc-empty">ยังไม่มีตัวที่ประเมินได้ — กด Load Latest Data</div>') + "</section>" +
      (rest.length ? '<section class="acc-sec"><h2>อันดับที่เหลือ</h2><div class="acc-grid">' + rest.map(function (e, i) { return card(e, i + 11); }).join("") + "</div></section>" : "") +
      '<section class="acc-sec acc-uncovered"><h2>ยังไม่จัดอันดับ (' + uncovered.length + ' ตัว — ไม่มี Investment Thesis)</h2>' +
      '<p>หลักการของหน้านี้: <b>ไม่แนะนำสะสมจากเทคนิคเดี่ยว ๆ</b> — ตัวที่ยังไม่มี thesis จึงไม่ถูกจัดอันดับ · เพิ่มด้วย <code>/thesis-update TICKER</code> ใน Claude Code</p>' +
      '<div class="acc-chips">' + uncovered.map(function (u) { return '<a class="acc-chip" href="/asset/' + encodeURIComponent(u.ticker) + '">' + esc(u.ticker) + "</a>"; }).join("") + "</div></section>" +
      '<footer class="acc-foot">📎 Universe เดียวกับ Action Center (store เดียวกัน — sync เสมอ) · engine: Thesis / Market Regime / Rate Headwind (สูตรกลางใน PM engine) · deterministic ไม่มี LLM · ไม่ใช่คำแนะนำการลงทุน</footer>';
  }

  function header(counts) {
    var strip = counts ? '<div class="acc-strip">' +
      '<span class="acc-pill">🟢 Healthy <b>' + counts.healthy + "</b></span>" +
      '<span class="acc-pill">🟡 Macro <b>' + counts.macro + "</b></span>" +
      '<span class="acc-pill">🟠 Wait <b>' + counts.wait + "</b></span>" +
      '<span class="acc-pill">🔴 Review <b>' + counts.review + "</b></span></div>" : "";
    return '<header class="acc-header"><h1>🧺 Accumulation Center</h1>' +
      '<p>จังหวะย่อตัวไหนควรค่าแก่การสะสมวันนี้ — ทุกคำแนะนำรวม Thesis · Business Growth vs ราคา (ถ่วงน้ำหนัก 2-5 ปี) · พื้นฐาน · Timing · Valuation · สัดส่วนพอร์ต</p>' + strip + "</header>";
  }

  window.addEventListener("portfolio-data-snapshot", render);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render); else render();
  window.AccumulationPage = { render: render };
})();
