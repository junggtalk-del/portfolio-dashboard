(function () {
  "use strict";

  // ============================================================
  // AI Portfolio Manager — PAGE (Portfolio Decision Layer)
  // "Where should my next dollar go?" — ไม่ใช่หน้าเทรด ไม่ใช่หน้า execution
  //
  // หน้านี้เป็นแค่ adapter + renderer:
  //  - น้ำหนัก/เงินสด: Quarterly Editor bucket "หุ้นต่างประเทศ" (gross รวมเงินสด
  //    ใน sleeve — ฐานเดียวกับ Action Center / Accumulation Center)
  //  - ตำแหน่ง: snapshot.portfolioHoldings (ต้นทุนเฉลี่ยจาก averageCost ถ้ามี)
  //  - ทุกการตัดสินใจ: window.PMEngine (ThesisEngine เป็นแกน — deterministic)
  //  - Tier ต่อหุ้น + Entry ที่ deploy แล้ว: localStorage (ผู้ใช้กำหนดเอง)
  // ไม่มีคำ Buy/Sell — Increase Position / Maintain / Wait / Review Thesis
  // ============================================================

  var ROOT_ID = "pmRoot";
  var TIER_STORE = "pmTierConfig_v1";     // { map:{TICKER:"A"}, tiers:{A:{max,target,min},...} }
  var PROGRESS_STORE = "pmEntryProgress_v1"; // { TICKER: {"1":true,...} }
  var STANCE_STORE = "pmMegaStance_v1";   // "bullish"|"bearish" — มุมมอง AI Megatrend ผู้ใช้ตั้งเอง
  var ALLOC_STORE = "pmAllocPolicy_v1";   // { indexTicker, indexPct, splitMethod }
  var state = { out: null, cashPct: null, gross: null, invested: null };

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  function fin(v) { if (v == null || v === "") return null; var n = Number(v); return Number.isFinite(n) ? n : null; }
  function pct(v, d) { return v == null ? "—" : v.toFixed(d == null ? 1 : d) + "%"; }
  function baht(v) { return v == null ? "—" : "฿" + Math.round(v).toLocaleString("en-US"); }
  function readSnapshot() { try { return (window.PortfolioDataSnapshot && window.PortfolioDataSnapshot.read && window.PortfolioDataSnapshot.read()) || null; } catch (e) { return null; } }
  function canonical(t) { return window.PortfolioCore && window.PortfolioCore.canonicalSymbolFromTicker ? window.PortfolioCore.canonicalSymbolFromTicker(t) : String(t || "").toUpperCase(); }
  function readJson(key, fallback) { try { var v = JSON.parse(localStorage.getItem(key) || "null"); return v == null ? fallback : v; } catch (e) { return fallback; } }
  function writeJson(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* full */ } }

  // ---------------- stores (ผู้ใช้กำหนด — deterministic) ----------------
  function tierConfig() {
    var c = readJson(TIER_STORE, {});
    return { map: c.map || {}, tiers: c.tiers || {} };
  }
  function mergedTierDefs() {
    var PM = window.PMEngine, over = tierConfig().tiers, out = {};
    Object.keys(PM.TIER_DEFS).forEach(function (k) {
      var base = PM.TIER_DEFS[k], o = over[k] || {};
      out[k] = { key: k, label: base.label,
        max: fin(o.max) != null ? o.max : base.max,
        target: fin(o.target) != null ? o.target : base.target,
        min: fin(o.min) != null ? o.min : base.min };
    });
    return out;
  }
  function tierKeyFor(ticker) {
    var c = tierConfig();
    return c.map[ticker] || window.PMEngine.DEFAULT_TIER_MAP[ticker] || "C";
  }
  function setTier(ticker, key) {
    var c = tierConfig(); c.map[ticker] = key; writeJson(TIER_STORE, c); render();
  }
  function setTierParam(tierKey, field, value) {
    var c = tierConfig(); c.tiers[tierKey] = c.tiers[tierKey] || {};
    var n = fin(value); if (n == null || n < 0 || n > 100) return;
    c.tiers[tierKey][field] = n; writeJson(TIER_STORE, c); render();
  }
  function megaStance() { var v = readJson(STANCE_STORE, "bullish"); return v === "bearish" ? "bearish" : "bullish"; }
  function setStance(v) { writeJson(STANCE_STORE, v === "bearish" ? "bearish" : "bullish"); render(); }
  function allocPolicy() {
    var c = readJson(ALLOC_STORE, {});
    var pct = fin(c.indexPct); if (pct == null || pct < 0 || pct > 100) pct = 50;
    var cap = fin(c.maxSinglePct); if (cap == null || cap <= 0 || cap > 100) cap = 10;
    return { indexTicker: (c.indexTicker || "QQQM").toUpperCase(), indexPct: pct,
      splitMethod: c.splitMethod === "equal" ? "equal" : "conviction", maxSinglePct: cap };
  }
  function indexTicker() { return allocPolicy().indexTicker; }
  function setAllocField(field, value) {
    var c = readJson(ALLOC_STORE, {});
    if (field === "indexPct") { var n = fin(value); if (n == null || n < 0 || n > 100) return; c.indexPct = n; }
    else if (field === "maxSinglePct") { var m = fin(value); if (m == null || m <= 0 || m > 100) return; c.maxSinglePct = m; }
    else if (field === "indexTicker") { c.indexTicker = String(value || "QQQM").toUpperCase().trim() || "QQQM"; }
    else if (field === "splitMethod") { c.splitMethod = value === "equal" ? "equal" : "conviction"; }
    writeJson(ALLOC_STORE, c); render();
  }
  function entryProgress() { return readJson(PROGRESS_STORE, {}); }
  function toggleEntry(ticker, n, done) {
    var p = entryProgress(); p[ticker] = p[ticker] || {};
    if (done) p[ticker][n] = true; else delete p[ticker][n];
    writeJson(PROGRESS_STORE, p); render();
  }

  // ---------------- positions (sleeve หุ้นต่างประเทศ = "AI portfolio") ----------------
  function buildInputs(snapshot) {
    var PM = window.PMEngine, core = window.PortfolioCore;
    var rows = (snapshot && snapshot.portfolioHoldings && snapshot.portfolioHoldings.data) || [];
    var holdings = core && core.dedupeHoldings ? core.dedupeHoldings(rows) : rows;
    var buckets = PM.quarterlyBuckets(snapshot);
    var gross = buckets["foreign-stock"] || 0;
    var progress = entryProgress();
    var idxKey = canonical(indexTicker());

    // ---- pass 1: เก็บ "หุ้นธงแดง" (isHolding) ในกลุ่มหุ้นต่างประเทศ + รวมมูลค่า ----
    // ฐาน % = ผลรวมมูลค่าหุ้นธงแดงเอง (สัดส่วน 100% ของหุ้นต่างประเทศตามที่ผู้ใช้สั่ง)
    // ไม่พึ่ง Quarterly Editor gross อีกต่อไป → META ที่ปักธงแดงถูกนำมาคำนวณเสมอ
    var flagged = [], flagSum = 0, flagIdx = new Map(), heldSet = new Set();
    holdings.forEach(function (h) {
      if (!h || !h.isHolding) return;
      var raw = canonical(h.canonicalSymbol);
      var key = raw === "GOOGL" ? "GOOG" : raw; // thesis KB ใช้ GOOG (เหมือน thesis-reconcile)
      var bucket = h.portfolioBucket || (raw.endsWith(".BK") ? "thai-stock" : (raw.indexOf("BTC") >= 0 ? "bitcoin" : "foreign-stock"));
      if (bucket !== "foreign-stock") return; // GULF.BK/BTC อยู่ sleeve อื่น — คนละฐาน %
      var mv = fin(h.marketValue) || 0;
      flagSum += mv;
      if (flagIdx.has(key)) { // ถือทั้ง GOOG+GOOGL (สอง class) → รวมมูลค่าเข้าตัวแรก ไม่ทิ้ง
        var f = flagged[flagIdx.get(key)]; f.mv += mv; if (f.avgCost == null) f.avgCost = fin(h.averageCost);
      } else {
        flagIdx.set(key, flagged.length); heldSet.add(key);
        flagged.push({ key: key, name: h.assetName || key, mv: mv, avgCost: fin(h.averageCost) });
      }
    });
    var positions = flagged.map(function (f) {
      return {
        ticker: f.key, name: f.name, held: true,
        weightPct: flagSum > 0 ? (f.mv / flagSum) * 100 : null, // ฐาน = ผลรวมหุ้นธงแดง
        marketValue: f.mv, avgCost: f.avgCost,
        tierKey: tierKeyFor(f.key), entryDone: progress[f.key] || {}
      };
    });

    // ---- index anchor (QQQM): ถ้ายังไม่ปักธงแดง เติมเป็นตำแหน่ง target (current 0%) ----
    if (!heldSet.has(idxKey)) {
      positions.push({ ticker: idxKey, name: idxKey + " (Index core)", held: false, weightPct: 0,
        tierKey: tierKeyFor(idxKey), entryDone: progress[idxKey] || {} });
    }

    // ---- ตัวที่มี thesis แต่ยังไม่ถือ — โชว์ในโซนเป็น "ตัวเลือกที่ยังไม่ถือ" (ไม่เข้า allocation) ----
    var TE = window.ThesisEngine, TD = window.ThesisData;
    var candidates = [];
    if (TE && TD && TE.companiesFrom) {
      TE.companiesFrom(TD).forEach(function (c) {
        var key = canonical(c.ticker);
        if (heldSet.has(key) || key === idxKey || key.endsWith(".BK")) return;
        if (key === "GOOGL" && heldSet.has("GOOG")) return;
        candidates.push({ ticker: c.ticker, name: c.name || c.ticker, held: false, weightPct: 0,
          tierKey: tierKeyFor(key), entryDone: progress[key] || {} });
      });
    }
    var cashPct = gross > 0 ? Math.max(0, ((gross - flagSum) / gross) * 100) : null;
    return { positions: positions, candidates: candidates, cashPct: cashPct,
      flagSum: flagSum > 0 ? flagSum : null, flagCount: flagged.length, gross: gross > 0 ? gross : null };
  }

  // ---------------- UI helpers ----------------
  function toneClass(tone) { return tone === "bull" ? "pm-bull" : tone === "bear" ? "pm-bear" : tone === "watch" ? "pm-watch" : "pm-neutral"; }
  function zoneChip(zone) { return '<span class="pm-zone pm-zone-' + zone.key.toLowerCase() + '">' + zone.icon + " " + esc(zone.label) + "</span>"; }
  function actionChip(a) { return '<span class="pm-action ' + toneClass(a.tone) + '">' + esc(a.label) + "</span>"; }
  function whyList(why) {
    return why.map(function (a) {
      return '<div class="pm-why ' + (a.ok ? "pm-ok" : "pm-no") + '">' + (a.ok ? "✓" : "✗") + " " + esc(a.txt) + "</div>";
    }).join("");
  }
  function assetLink(t) { return '<a class="pm-sym" href="/asset/' + encodeURIComponent(t) + '">' + esc(t) + "</a>"; }

  // ---------------- S1: Portfolio Overview ----------------
  function sectionOverview(out, inp) {
    var ov = out.overview, p = out.policy;
    return '<section class="pm-sec"><div class="pm-hero">' +
      '<div class="pm-hero-main">' +
      '<div class="pm-hero-q">"ถ้ามีเงินสดวันนี้ ควรวางเงินก้อนถัดไปที่ตำแหน่งไหน"</div>' +
      '<div class="pm-stance"><small>🧠 AI Megatrend — คุณตัดสินใจเอง (ระบบไม่คำนวณให้):</small>' +
      '<button type="button" class="pm-stance-btn' + (out.megaStance === "bullish" ? " is-on pm-bull" : "") + '" data-pm-stance="bullish">🐂 Bullish</button>' +
      '<button type="button" class="pm-stance-btn' + (out.megaStance === "bearish" ? " is-on pm-bear" : "") + '" data-pm-stance="bearish">🐻 Bearish</button>' +
      "<span>" + (out.megaStance === "bearish" ? "Bearish = งดสะสมใหม่ทุกตัว (Rule 1) จนกว่าจะสลับกลับ" : "Bullish = เปิดสะสมตามเงื่อนไข Zone/Entry ปกติ") + "</span></div>" +
      '<div class="pm-hero-rec ' + toneClass(ov.recommendation.tone) + '"><small>Overall Recommendation</small><b>' + esc(ov.recommendation.label) + "</b><span>" + esc(ov.recommendationWhy) + "</span></div>" +
      "</div>" +
      '<div class="pm-hero-grid">' +
      stat("Portfolio Value (หุ้นต่างประเทศ)", inp.gross != null ? baht(inp.gross) : (inp.flagSum != null ? baht(inp.flagSum) : "ยังไม่ตั้งค่า"), inp.gross != null ? "จาก Portfolio Position → หุ้นต่างประเทศ (Quarterly Editor)" : "ตั้งค่าที่ Portfolio Position → หุ้นต่างประเทศ (ตอนนี้ใช้ผลรวมหุ้นธงแดงชั่วคราว)") +
      stat("Allocation Policy", esc(p.indexTicker) + " " + p.indexPct + "% + " + p.satelliteCount + " หุ้น", "Index core " + p.indexPct + "% · หุ้นรายตัวแบ่ง " + p.satellitePool + "% (" + (p.splitMethod === "equal" ? "เท่ากัน" : "ถ่วง conviction") + " · เพดานตัวละ " + p.maxSinglePct + "%)") +
      stat("AI Portfolio Score", ov.score == null ? "—" : ov.score + "/100", "ค่าเฉลี่ย Investment Thesis ถ่วงน้ำหนักตามสัดส่วนถือจริง") +
      stat("Portfolio Health", esc(ov.health.label), esc(ov.health.why)) +
      stat("Portfolio Alignment", ov.alignment.score != null ? esc(ov.alignment.label) + " (" + ov.alignment.score + ")" : esc(ov.alignment.label), esc(ov.alignment.why)) +
      "</div></div></section>";
  }
  function stat(t, v, sub) {
    return '<div class="pm-stat"><small>' + t + "</small><b>" + v + "</b><span>" + sub + "</span></div>";
  }

  // ---------------- S2: Current Portfolio (ธงแดง + index core) ----------------
  function sectionCurrent(out) {
    var rows = out.allocationRows;
    if (!rows.length) return '<section class="pm-sec"><h2>💼 Current Portfolio</h2><div class="mc-empty">ยังไม่มีหุ้นธงแดงในกลุ่มหุ้นต่างประเทศ — ปักธงแดง + ใส่มูลค่าได้ที่ Action Center</div></section>';
    var tierSel = function (r) {
      if (r.isIndex) return '<span class="pm-idxtag">Index</span>';
      return '<select class="pm-tier-sel" data-pm-tier="' + esc(r.ticker) + '">' +
        ["A", "B", "C"].map(function (k) { return '<option value="' + k + '"' + (r.tier.key === k ? " selected" : "") + ">" + k + "</option>"; }).join("") + "</select>";
    };
    var tr = rows.map(function (r) {
      var wcell = r.weightPct == null ? '<span class="pm-dim" title="ใส่มูลค่า (฿) ที่ธงแดงเพื่อคิดสัดส่วน">—</span>' : pct(r.weightPct);
      return "<tr" + (r.isIndex ? ' class="pm-row-index"' : "") + ">" +
        "<td>" + assetLink(r.ticker) + (r.isIndex ? ' <span class="pm-idxtag">core</span>' : "") + '<small class="pm-dim"> ' + esc(r.name) + (r.held ? "" : " · ยังไม่ถือ") + "</small></td>" +
        "<td>" + tierSel(r) + "</td>" +
        '<td class="pm-num">' + wcell + "</td>" +
        '<td class="pm-num">' + (r.covered && r.target != null ? "<b>" + r.target + "%</b>" : "—") + "</td>" +
        "<td>" + (r.covered ? zoneChip(r.zone) : '<span class="pm-dim">ไม่มี thesis</span>') + "</td>" +
        "<td>" + (r.covered ? actionChip(r.action) : '<a class="pm-dim" href="/thesis">/thesis-update ' + esc(r.ticker) + "</a>") + "</td></tr>";
    }).join("");
    return '<section class="pm-sec"><h2>💼 Current Portfolio <small>(หุ้นธงแดง + index core — ฐาน 100% ของหุ้นต่างประเทศ)</small></h2>' +
      '<div class="pm-tablewrap"><table class="pm-table"><thead><tr><th>Ticker</th><th>Tier</th><th>น้ำหนักปัจจุบัน</th><th>เป้า</th><th>Accumulation Zone</th><th>Position Status</th></tr></thead><tbody>' +
      tr + "</tbody></table></div></section>";
  }

  // ---------------- S3: Target Allocation (Core-Satellite policy) ----------------
  function sectionTargets(out) {
    var rows = out.allocationRows;
    if (!rows.length) return "";
    var p = out.policy, maxT = Math.max(p.indexPct, 20);
    var tr = rows.map(function (r) {
      var tgt = r.target == null ? 0 : r.target;
      var diff = r.weightPct == null ? null : tgt - r.weightPct;
      var diffTxt = diff == null ? "—" : (diff >= 0 ? "+" : "") + diff.toFixed(1) + "pp";
      var curW = r.weightPct == null ? 0 : r.weightPct;
      var bar =
        '<div class="pm-tbar"><i class="pm-tbar-cur" style="width:' + Math.min(100, curW / maxT * 100) + '%"></i>' +
        '<i class="pm-tbar-target" style="left:' + Math.min(100, tgt / maxT * 100) + '%"></i></div>';
      var note = p.notes[r.ticker.toUpperCase()] || "";
      // เป้าจริงมาจาก policy (index % / แบ่งโควตา / ชนเพดาน) — conviction เป็นแค่ตัวถ่วง
      // น้ำหนักตอนแบ่ง จึงโชว์แค่บรรทัดสรุปเดียว (รายละเอียดคะแนนไปดูที่ Accumulation Opportunities)
      var capped = !r.isIndex && r.covered && fin(r.target) != null && Math.abs(r.target - p.maxSinglePct) < 0.05;
      var whyBlock = r.isIndex
        ? '<div class="pm-why pm-ok">· ' + esc(note) + "</div>"
        : !r.covered
          ? '<div class="pm-why pm-no">· ยังไม่มี Investment Thesis — <code>/thesis-update ' + esc(r.ticker) + "</code> เพื่อให้ conviction แม่นขึ้น</div>"
          : '<div class="pm-why pm-ok">· ' + esc(note) + "</div>" +
            (capped ? '<div class="pm-why pm-dim">· ชนเพดานรายตัว ' + p.maxSinglePct + "% แล้ว — conviction ที่สูงกว่านี้ไม่ดันเป้าเพิ่ม (ดูที่มาของคะแนนที่ Accumulation Opportunities)</div>" : "");
      return '<div class="pm-target-row' + (r.isIndex ? " pm-target-index" : "") + '">' +
        '<div class="pm-target-head">' + assetLink(r.ticker) + (r.isIndex ? ' <span class="pm-idxtag">Index ' + p.indexPct + '%</span>' : (!r.covered ? ' <span class="pm-dim">ไม่มี thesis</span>' : "")) +
        '<span class="pm-num">' + (r.weightPct == null ? "—" : pct(r.weightPct)) + ' → <b>' + tgt + '%</b> <span class="' + (diff != null && diff > 0 ? "pm-pos" : "pm-dim") + '">(' + diffTxt + ")</span></span>" +
        "</div>" + bar +
        '<details class="pm-details"><summary>ทำไมเป้าเป็น ' + tgt + '%</summary><div class="pm-whywrap">' + whyBlock + "</div></details></div>";
    }).join("");
    var minSats = p.satellitePool > 0 && p.maxSinglePct > 0 ? Math.ceil(p.satellitePool / p.maxSinglePct) : 0;
    var unalloc = fin(p.unallocated) && p.unallocated > 0
      ? '<div class="pm-target-row pm-target-unalloc"><div class="pm-target-head">🪙 โควตาหุ้นรายตัวที่ยังว่าง' +
        '<span class="pm-num"><b>' + p.unallocated + '%</b></span></div>' +
        '<small class="pm-dim">' + (p.satelliteCount === 0
          ? "ยังไม่ได้ปักธงแดงหุ้นรายตัว — ปักธงหุ้นที่อยากถือเพื่อให้ระบบแบ่งเป้าให้"
          : "หุ้นรายตัวชนเพดานตัวละ " + p.maxSinglePct + "% แล้ว — โควตา " + p.satellitePool + "% เต็มได้ต้องมีหุ้นรายตัว ≥ " + minSats + " ตัว (ตอนนี้ " + p.satelliteCount + " ตัว)") + "</small></div>"
      : "";
    return '<section class="pm-sec"><h2>🎯 Target Allocation <small>(Core-Satellite — รวม 100% ของหุ้นต่างประเทศ)</small></h2>' +
      "<p><b>" + esc(p.indexTicker) + " = " + p.indexPct + "%</b> (index core) · หุ้นธงแดงที่เหลือแบ่ง <b>" + p.satellitePool + "%</b> " +
      (p.splitMethod === "equal" ? "เท่ากันทุกตัว" : "ถ่วงน้ำหนักตาม conviction") + " <b>เพดานตัวละ " + p.maxSinglePct + "%</b> ของหุ้นต่างประเทศทั้งหมด — เป้าทุกตัวรวมกัน = 100%</p>" +
      tr + unalloc + allocEditor(p) + "</section>";
  }
  function allocEditor(p) {
    return '<details class="pm-details pm-alloccfg"><summary>⚙️ ตั้งค่า policy — index ticker / % / เพดานหุ้นรายตัว / วิธีแบ่ง</summary>' +
      '<div class="pm-allocrow"><label>Index ticker <input class="pm-alloc-inp" type="text" value="' + esc(p.indexTicker) + '" data-pm-alloc="indexTicker"></label>' +
      '<label>Index % <input class="pm-alloc-inp" type="number" min="0" max="100" step="5" value="' + p.indexPct + '" data-pm-alloc="indexPct"></label>' +
      '<label>เพดานหุ้นรายตัว % <input class="pm-alloc-inp" type="number" min="1" max="100" step="1" value="' + p.maxSinglePct + '" data-pm-alloc="maxSinglePct"></label>' +
      '<label>แบ่งก้อนหุ้นรายตัว <select class="pm-alloc-inp" data-pm-alloc="splitMethod">' +
      '<option value="conviction"' + (p.splitMethod === "conviction" ? " selected" : "") + ">ถ่วง conviction</option>" +
      '<option value="equal"' + (p.splitMethod === "equal" ? " selected" : "") + ">เท่ากัน</option></select></label></div>" +
      "<small>เพดานหุ้นรายตัว = แต่ละตัวไม่เกิน " + p.maxSinglePct + "% ของหุ้นต่างประเทศทั้งหมด (index ไม่นับ) · ค่าเก็บในเครื่อง</small></details>";
  }

  // ---------------- S4: Accumulation Opportunities (Zone นำ Score รอง) ----------------
  var SCORE_SHORT = { thesis: "Thesis", growthPrice: "Growth", timing: "Timing", valuation: "Val" };
  function scoreFormula(parts, score) {
    var terms = (parts || []).filter(function (p) { return p.value != null; })
      .map(function (p) { return (SCORE_SHORT[p.key] || p.key) + " " + p.value + "·" + p.weight + "%"; });
    return terms.join(" + ") + " = <b>" + (score == null ? "—" : score) + "</b>";
  }
  function scoreBars(parts, score) {
    var avail = (parts || []).filter(function (p) { return p.value != null; });
    var wsum = avail.reduce(function (s, p) { return s + p.weight; }, 0) || 1;
    var rows = (parts || []).map(function (p) {
      if (p.value == null) return '<div class="pm-sp-row pm-dim"><span class="pm-sp-lbl">' + esc(p.label) + ' <em>' + p.weight + '%</em></span><span class="pm-sp-none">— ไม่มีข้อมูล (เกลี่ยน้ำหนักให้ตัวอื่น)</span></div>';
      var contrib = Math.round(p.value * p.weight / wsum * 10) / 10;
      var col = p.value >= 70 ? "#34d399" : p.value >= 40 ? "#f59e0b" : "#f43f5e";
      return '<div class="pm-sp-row"><span class="pm-sp-lbl">' + esc(p.label) + ' <em>' + p.weight + '%</em></span>' +
        '<div class="pm-sp-bar"><i style="width:' + Math.min(100, p.value) + '%;background:' + col + '"></i></div>' +
        '<b class="pm-sp-v">' + p.value + '</b><i class="pm-sp-c" title="ส่วนที่สมทบเข้าคะแนนรวม">+' + contrib + "</i></div>";
    }).join("");
    return '<div class="pm-sp-head">Accumulation Score = ผลรวมถ่วงน้ำหนัก (renormalize เมื่อบางปัจจัยไม่มีข้อมูล) = <b>' + (score == null ? "—" : score) + "/100</b></div>" + rows;
  }
  function sectionZones(out) {
    var all = out.rows.filter(function (r) { return r.covered; })
      .sort(function (a, b) { return a.zone.rank - b.zone.rank || (b.accScore || 0) - (a.accScore || 0); });
    if (!all.length) return "";
    var cards = all.map(function (r) {
      var ladderMini = r.ladder.map(function (e) {
        var cls = e.completed ? "pm-lad-done" : e.triggered ? "pm-lad-hot" : "pm-lad-wait";
        return '<span class="pm-lad ' + cls + '" title="' + esc(e.title + " — " + (e.completed ? "Deploy แล้ว" : e.triggered ? "Trigger แล้ว รอ deploy" : e.why)) + '">E' + e.n + "</span>";
      }).join("");
      return '<article class="pm-card pm-card-' + r.zone.key.toLowerCase() + '">' +
        '<div class="pm-card-head">' + assetLink(r.ticker) +
        (r.held ? "" : '<span class="pm-newpos">ยังไม่ได้ถือ — ตัวเลือกตำแหน่งใหม่</span>') +
        '<span class="pm-score"><b>' + (r.accScore == null ? "—" : r.accScore) + "</b>/100</span></div>" +
        '<div class="pm-card-zone">' + zoneChip(r.zone) + "<small>" + esc(r.zone.thai) + "</small></div>" +
        '<div class="pm-card-zonewhy">' + r.zoneWhy.map(function (w) { return esc(w); }).join(" · ") + "</div>" +
        '<div class="pm-scoreline">📊 ' + scoreFormula(r.acc.parts, r.accScore) + "</div>" +
        '<div class="pm-lads">' + ladderMini + "</div>" +
        '<details class="pm-details"><summary>ที่มาของคะแนน + เหตุผล</summary>' +
        '<div class="pm-scorebars">' + scoreBars(r.acc.parts, r.accScore) + "</div>" +
        '<div class="pm-whywrap">' + whyList(r.why) + "</div></details>" +
        (r.stale ? '<div class="pm-stale">⚠ thesis เก่า — /thesis-update ' + esc(r.ticker) + "</div>" : "") +
        "</article>";
    }).join("");
    var counts = {};
    all.forEach(function (r) { counts[r.zone.key] = (counts[r.zone.key] || 0) + 1; });
    var strip = ["A", "B", "C", "D", "E"].map(function (k) {
      var z = window.PMEngine.ZONES[k];
      return '<span class="pm-pill">' + z.icon + " " + k + " <b>" + (counts[k] || 0) + "</b></span>";
    }).join("");
    return '<section class="pm-sec"><h2>🧲 Accumulation Opportunities</h2>' +
      "<p>ตำแหน่งไหน \"ควรค่าแก่เงินก้อนถัดไป\" — Zone คือตัวตัดสินหลัก คะแนนเป็นรอง · น้ำหนัก: Thesis 40 · Business Growth vs ราคา (ถ่วงน้ำหนัก 2-5 ปี · ปีล่าสุดมากกว่า) 25 · Timing 20 · Valuation 15 (ถอด Macro/ดอกเบี้ยออกจากคะแนนแล้ว · มุมมอง AI Megatrend คุณตั้งเองเป็นเกต · EMA/SMA200/RSI เป็นแค่เครื่องมือจับจังหวะ)</p>" +
      '<div class="pm-strip">' + strip + "</div>" +
      '<div class="pm-grid">' + cards + "</div></section>";
  }

  // ---------------- S5: Cash Deployment Plan ----------------
  function sectionDeployment(out, inp) {
    var d = out.deployment;
    var items = d.items.map(function (i) {
      return '<div class="pm-dep-row"><div class="pm-dep-head">' + assetLink(i.ticker) +
        '<b>' + i.pctOfCash.toFixed(1) + "% ของเงินสด</b></div>" +
        '<div class="pm-depbar"><i style="width:' + Math.min(100, i.pctOfCash) + '%"></i></div>' +
        '<small>' + esc(i.why) + (i.halved ? " · ถูกลดครึ่งจาก Macro Risk-Off (Rule 3)" : "") + "</small></div>";
    }).join("");
    return '<section class="pm-sec"><h2>💵 Cash Deployment Plan <small>(เงินสดที่พร้อมวาง = 100%)</small></h2>' +
      (inp.cashPct != null ? "<p>เงินสดจริงใน sleeve ตอนนี้ " + pct(inp.cashPct, 1) + " ของ sleeve — แผนด้านล่างคิดเป็นสัดส่วนของเงินสดก้อนนี้</p>"
        : "<p>ยังไม่มีข้อมูลเงินสดจาก Quarterly Editor — แผนแสดงเป็นสัดส่วนสมมติของเงินก้อนที่จะวาง</p>") +
      (items || '<div class="mc-empty">วันนี้ยังไม่มี entry ที่ trigger ในตำแหน่งที่ถือ — เงินสดคงเป็น reserve 100%</div>') +
      '<div class="pm-dep-row pm-dep-reserve"><div class="pm-dep-head">🛡️ Cash Reserve<b>' + d.cashReserveFinal.toFixed(1) + "%</b></div>" +
      '<div class="pm-depbar pm-depbar-res"><i style="width:' + Math.min(100, d.cashReserveFinal) + '%"></i></div>' +
      "<small>" + d.reserveWhy.map(esc).join(" · ") + (d.scaled ? " · แผนถูกสเกลลงให้พอดีเพดาน deploy " + d.deployable + "%" : "") + "</small></div>" +
      "</section>";
  }

  // ---------------- S6: Position Manager (+ Entry Ladder + tier editor) ----------------
  function sectionManager(out) {
    var rows = out.allocationRows.filter(function (r) { return r.covered; });
    var cards = rows.map(function (r) {
      var lad = r.ladder.map(function (e) {
        var cls = e.completed ? "pm-entry-done" : e.blocked ? "pm-entry-block" : e.triggered ? "pm-entry-hot" : "pm-entry-wait";
        var status = e.completed ? "Deploy แล้ว" : e.blocked ? "ปิด" : e.triggered ? "Trigger แล้ว — รอ deploy" : "Waiting";
        return '<div class="pm-entry ' + cls + '">' +
          '<label><input type="checkbox" data-pm-entry="' + esc(r.ticker) + '" data-n="' + e.n + '"' + (e.completed ? " checked" : "") + (e.blocked && !e.completed ? " disabled" : "") + "> " +
          "<b>" + esc(e.title) + "</b> · " + e.pct + "% ของเป้า</label>" +
          '<span class="pm-entry-status">' + status + "</span>" +
          "<small>" + esc(e.rule) + '</small><small class="pm-entry-why">→ ' + esc(e.why) + "</small></div>";
      }).join("");
      var overTxt = r.over > 0 ? mnum("เกินเป้า", r.over + "pp") : mnum("Suggested Today", r.pendingPp > 0 ? "+" + r.pendingPp + "pp" : "—");
      return '<article class="pm-mgr">' +
        '<div class="pm-mgr-head">' + assetLink(r.ticker) + (r.isIndex ? ' <span class="pm-idxtag">Index core</span>' : "") + zoneChip(r.zone) + actionChip(r.action) + "</div>" +
        '<div class="pm-mgr-nums">' +
        mnum("Current", pct(r.weightPct)) + mnum("Target", r.target + "%") + mnum(r.isIndex ? "ประเภท" : "Tier", r.isIndex ? "Index" : r.tier.key) +
        mnum("ห่างเป้า", r.gap + "pp") + overTxt + mnum("Capacity เหลือ", r.capacity + "pp") +
        "</div>" +
        '<div class="pm-entries">' + lad + "</div></article>";
    }).join("");
    return '<section class="pm-sec"><h2>🧰 Position Manager <small>(Entry Ladder 50/20/15/15 ของเป้า — ระบบจำว่า deploy ไปแล้วขั้นไหน)</small></h2>' +
      "<p>ติ๊ก ✓ เมื่อวางเงินจริงของ entry นั้นแล้ว — ระบบจะหักออกจาก Suggested Today และจำไว้ข้ามวัน (เก็บในเครื่อง)</p>" +
      (cards || '<div class="mc-empty">ยังไม่มีตำแหน่งที่มี Investment Thesis</div>') +
      tierEditor(out) + "</section>";
  }
  function mnum(t, v) { return '<div class="pm-mnum"><small>' + t + "</small><b>" + v + "</b></div>"; }
  function tierEditor(out) {
    var defs = out.tierDefs;
    var rows = ["A", "B", "C"].map(function (k) {
      var d = defs[k];
      var inp = function (f) { return '<input class="pm-tier-inp" type="number" min="0" max="100" step="0.5" value="' + d[f] + '" data-pm-tierdef="' + k + '" data-f="' + f + '">'; };
      return "<tr><td>" + esc(d.label) + "</td><td>" + inp("min") + "</td><td>" + inp("target") + "</td><td>" + inp("max") + "</td></tr>";
    }).join("");
    return '<details class="pm-details pm-tiercfg"><summary>⚙️ Master Position Size — ปรับกรอบ Tier ได้ (Min / Target / Max % ของ sleeve)</summary>' +
      '<table class="pm-table"><thead><tr><th>Tier</th><th>Min</th><th>Target</th><th>Max</th></tr></thead><tbody>' + rows + "</tbody></table>" +
      "<small>เปลี่ยน Tier รายตัวได้ที่ตาราง Current Portfolio — ค่าเก็บในเครื่อง (localStorage)</small></details>";
  }

  // ---------------- S7: Risk Management ----------------
  function sectionRisk(out) {
    var rows = out.risk.map(function (r) {
      return '<div class="pm-rule ' + (r.active ? "pm-rule-on" : "pm-rule-off") + '">' +
        '<span class="pm-rule-badge">' + (r.active ? "ACTIVE" : "PASS") + "</span>" +
        "<b>Rule " + r.n + " — " + esc(r.rule) + "</b><small>" + esc(r.detail) + "</small></div>";
    }).join("");
    return '<section class="pm-sec"><h2>🛡️ Risk Management <small>(hard rules — บังคับทั้งพอร์ต)</small></h2>' + rows + "</section>";
  }

  // ---------------- S8: Explainability / methodology ----------------
  function sectionMethod() {
    return '<footer class="pm-foot">🧠 <b>วิธีคิดทั้งหมดเปิดเผย:</b> Zone/คะแนน/เป้า/แผนเงิน มาจาก Investment Thesis Engine + Market Regime + Rate Monitor + เทคนิคจาก snapshot · มุมมอง AI Megatrend <b>คุณตัดสินใจเอง</b> (สวิตช์ Bullish/Bearish ด้านบน — เป็นเกต Rule 1 + ตัวคูณเป้า ไม่ใช่คะแนนคำนวณ) — สูตร Accumulation Score ชุดเดียวกับ Accumulation Center (engine กลางตัวเดียวกัน) · deterministic ไม่มี AI-generated opinion · กดดู "ทำไม" ได้ทุกการ์ด · ไม่ใช่คำแนะนำการลงทุน</footer>';
  }

  // ---------------- render ----------------
  function render() {
    var root = document.getElementById(ROOT_ID);
    if (!root) return;
    var PM = window.PMEngine, TE = window.ThesisEngine, TD = window.ThesisData;
    if (!PM || !TE || !TD) { root.innerHTML = '<div class="mc-empty"><strong>Engine ไม่พร้อม</strong> — refresh หน้านี้</div>'; return; }
    var snapshot = readSnapshot();
    if (!snapshot) {
      root.innerHTML = headerHtml() + '<div class="mc-empty"><strong>ยังไม่มี Data Snapshot</strong><br>กด Load Latest Data ก่อน — น้ำหนักพอร์ต/เทคนิค/Mega Trend ต้องใช้ข้อมูลจริง</div>';
      return;
    }
    var inp = buildInputs(snapshot);
    var ap = allocPolicy();
    var out = PM.compute(snapshot, {
      positions: inp.positions.concat(inp.candidates),
      cashPct: inp.cashPct,
      tierDefs: mergedTierDefs(),
      megaStance: megaStance(),
      indexTicker: ap.indexTicker, indexPct: ap.indexPct, splitMethod: ap.splitMethod, maxSinglePct: ap.maxSinglePct
    });
    if (!out.available) { root.innerHTML = '<div class="mc-empty">' + esc(out.reason || "ประเมินไม่ได้") + "</div>"; return; }
    state.out = out;
    root.innerHTML = headerHtml() +
      sectionOverview(out, inp) +
      sectionCurrent(out) +
      sectionTargets(out) +
      sectionZones(out) +
      sectionDeployment(out, inp) +
      sectionManager(out) +
      sectionRisk(out) +
      sectionMethod();
    bind(root);
  }
  function headerHtml() {
    return '<header class="pm-header"><h1>💼 AI Portfolio Manager</h1>' +
      "<p>Portfolio Decision Layer — ไม่ตอบว่า \"วันนี้เกิดอะไรขึ้น\" แต่ตอบว่า <b>\"เงินก้อนถัดไปควรไปที่ไหน\"</b> · ใช้เฉพาะ Increase Position / Maintain / Wait / Review Thesis</p></header>";
  }
  function bind(root) {
    root.querySelectorAll("[data-pm-tier]").forEach(function (el) {
      el.addEventListener("change", function () { setTier(el.getAttribute("data-pm-tier"), el.value); });
    });
    root.querySelectorAll("[data-pm-entry]").forEach(function (el) {
      el.addEventListener("change", function () { toggleEntry(el.getAttribute("data-pm-entry"), el.getAttribute("data-n"), el.checked); });
    });
    root.querySelectorAll("[data-pm-tierdef]").forEach(function (el) {
      el.addEventListener("change", function () { setTierParam(el.getAttribute("data-pm-tierdef"), el.getAttribute("data-f"), el.value); });
    });
    root.querySelectorAll("[data-pm-stance]").forEach(function (el) {
      el.addEventListener("click", function () { setStance(el.getAttribute("data-pm-stance")); });
    });
    root.querySelectorAll("[data-pm-alloc]").forEach(function (el) {
      var ev = el.tagName === "SELECT" ? "change" : "change";
      el.addEventListener(ev, function () { setAllocField(el.getAttribute("data-pm-alloc"), el.value); });
    });
  }

  // ธงแดง/มูลค่าเปลี่ยนจาก Action Center → snapshot ยิง event นี้ (ไม่ใช่ data-snapshot)
  window.addEventListener("portfolio-data-snapshot", render);
  window.addEventListener("portfolio-holdings-updated", render);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render); else render();
  window.PortfolioManagerPage = { render: render };
})();
