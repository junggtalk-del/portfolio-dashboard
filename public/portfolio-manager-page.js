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
  var CVIEW_STORE = "pmCurrentView_v1";   // "all"|"stocks" — มุมมองตาราง Current Portfolio
  var state = { out: null, cashPct: null, gross: null, invested: null };

  // ถ้อยคำที่อ้าง "เป้า" — ตัดออกเฉพาะหน้านี้ (engine ยังพูดคำเดิมให้หน้าอื่น)
  // เรียงจากรูปเฉพาะ → รูปกว้าง · anchored ทั้งหมด ถ้า engine เปลี่ยนข้อความ กฎจะไม่ match เฉย ๆ
  var NO_TARGET_TXT = [
    [/ · เติมได้อีก [\d.]+pp ถึงเป้า [\d.]+%/g, ""],
    [/ทุกตำแหน่งอยู่ระดับเป้าหรือยังไม่มี entry ที่ trigger/g, "ยังไม่มี entry ที่ trigger"],
    [/วางฐาน ([\d.]+)% ของเป้าได้/g, "วางฐานได้"],
    [/ถึงเป้า [\d.]+%/g, ""],
    [/ห่างเป้ารวมเพียง/g, "ห่างรวมเพียง"], [/ห่างเป้ารวม/g, "ห่างรวม"], [/ห่างเป้า/g, "ห่าง"],
    [/สอดคล้องเป้าแบบไดนามิก/g, "สอดคล้องแผน"],
    [/ไม่ดันเป้าเพิ่ม/g, "ไม่ดันสัดส่วนเพิ่ม"],
    [/ระบบแบ่งเป้าให้/g, "ระบบแบ่งสัดส่วนให้"],
    [/เกินเป้า/g, "ถือเกิน"], [/ครบเป้าแล้ว/g, "ครบระดับแล้ว"],
    [/ลดเป้าลงระดับ/g, "ลดระดับลงเป็น"], [/ตั้งเป้าคงที่/g, "กำหนดคงที่"],
    [/ระดับเป้า/g, "ระดับที่วางไว้"], [/ของเป้า/g, ""], [/เป้าคงที่/g, "สัดส่วนคงที่"],
  ];
  function noTarget(v) {
    var t = String(v == null ? "" : v);
    if (t.indexOf("เป้า") < 0) return t;   // ทางด่วน: ข้อความส่วนใหญ่ไม่มีคำนี้
    for (var i = 0; i < NO_TARGET_TXT.length; i++) t = t.replace(NO_TARGET_TXT[i][0], NO_TARGET_TXT[i][1]);
    return t.replace(/\s{2,}/g, " ").replace(/\s+·\s*$/, "").trim();
  }
  function esc(s) { return String(noTarget(s)).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
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
  // มุมมองตาราง Current Portfolio: "all" = ทั้งพอร์ต (index core + หุ้น + เงินสด) · "stocks" = เฉพาะหุ้นรายตัว
  function currentView() { return readJson(CVIEW_STORE, "all") === "stocks" ? "stocks" : "all"; }
  function setCurrentView(v) { writeJson(CVIEW_STORE, v === "stocks" ? "stocks" : "all"); render(); }
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
      // กองทุนไทย (RMF/SSF/กองทุนรวม) ที่ยังไม่ตั้ง bucket ต้องไม่หลุดเข้า foreign-stock
      // — ไม่งั้น K-GTECHRMF โดนนับเป็นหุ้นธงแดงแล้วฐาน % เพี้ยนทั้งตาราง (audit 2026-08)
      var isThaiFund = /RMF|SSF/i.test(raw) || /THAI_MUTUAL_FUND|MUTUAL/i.test(String(h.assetType || ""));
      var bucket = h.portfolioBucket || (raw.endsWith(".BK") ? "thai-stock" : (raw.indexOf("BTC") >= 0 ? "bitcoin" : (isThaiFund ? "thai-fund" : "foreign-stock")));
      if (bucket !== "foreign-stock") return; // GULF.BK/BTC อยู่ sleeve อื่น — คนละฐาน %
      var mv = fin(h.marketValue) || 0;
      flagSum += mv;
      if (flagIdx.has(key)) { // ถือทั้ง GOOG+GOOGL (สอง class) → รวมมูลค่าเข้าตัวแรก ไม่ทิ้ง
        var f = flagged[flagIdx.get(key)]; f.mv += mv; f.dual = true; if (f.avgCost == null) f.avgCost = fin(h.averageCost);
      } else {
        flagIdx.set(key, flagged.length); heldSet.add(key);
        flagged.push({ key: key, name: h.assetName || key, mv: mv, avgCost: fin(h.averageCost) });
      }
    });
    // ฐาน % = Portfolio Value หุ้นต่างประเทศทั้งก้อน (Quarterly Editor รวมเงินสดใน sleeve)
    // — ฐาน = Portfolio Value ทั้งก้อน (เดิมใช้ผลรวมหุ้นธงแดง → QQQM 2M/5M โชว์ 56.6% แทน 40%)
    // ไม่มี gross (ยังไม่ตั้ง Quarterly) → fallback ฐานผลรวมธงแดงแบบเดิม
    var wBase = gross > 0 ? Math.max(gross, flagSum) : flagSum;
    var positions = flagged.map(function (f) {
      return {
        ticker: f.key, name: f.name, held: true, dual: !!f.dual,
        weightPct: wBase > 0 ? (f.mv / wBase) * 100 : null,
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
    var cashBaht = gross > 0 ? Math.max(0, gross - flagSum) : null; // เงินสดพร้อมวางใน sleeve (฿)
    var investedPct = cashPct != null ? Math.max(0, 100 - cashPct) : null;
    return { positions: positions, candidates: candidates, cashPct: cashPct,
      cashBaht: cashBaht, investedPct: investedPct,
      flagSum: flagSum > 0 ? flagSum : null, flagCount: flagged.length, gross: gross > 0 ? gross : null };
  }

  // ---------------- จัดการหุ้นในพอร์ต (ย้ายมาจาก Action Center — path เขียนเดิม: PortfolioCore.saveHoldings) ----------------
  function holdingsNow() {
    var core = window.PortfolioCore;
    if (core && core.readLocalHoldings) { try { return core.readLocalHoldings() || []; } catch (e) { } }
    var snap = readSnapshot();
    return ((snap && snap.portfolioHoldings && snap.portfolioHoldings.data) || []).slice();
  }
  // hold=true → ตั้ง/แก้มูลค่า · hold=false → เอาออกจากพอร์ต (เก็บเป็น watchlist เหมือนพฤติกรรมเดิมของ AC)
  function saveHoldingAmount(symbol, amount, hold) {
    var core = window.PortfolioCore;
    if (!core || !core.saveHoldings) { alert("PortfolioCore ไม่พร้อม — refresh หน้าก่อน"); return; }
    var key = canonical(symbol);
    var holdings = holdingsNow();
    var idx = -1;
    holdings.forEach(function (h, i) { if (idx < 0 && canonical(h.canonicalSymbol || h.ticker) === key) idx = i; });
    if (idx < 0 && key === "GOOG") holdings.forEach(function (h, i) { if (idx < 0 && canonical(h.canonicalSymbol || h.ticker) === "GOOGL") idx = i; });
    var base = idx >= 0 ? holdings[idx]
      : (core.normalizeHolding ? core.normalizeHolding({ symbol: key, assetName: key, assetType: "" }) : { canonicalSymbol: key, assetName: key });
    var next = Object.assign({}, base, {
      isHolding: !!hold,
      watchlistOnly: !hold,
      marketValue: hold ? Math.max(0, fin(amount) || 0) : 0,
      portfolioBucket: base.portfolioBucket || "foreign-stock",
      updatedAt: new Date().toISOString()
    });
    if (idx >= 0) holdings[idx] = next; else holdings.push(next);
    try { core.saveHoldings(holdings); } catch (e) { /* local เขียนแล้ว sync server ทีหลัง — core จัดการเอง */ }
    // core ยิง "portfolio-holdings-updated" → หน้า re-render อัตโนมัติ
  }
  function kbTickersNotHeld(heldRows) {
    var held = {};
    (heldRows || []).forEach(function (r) { if (r.held) held[r.ticker] = 1; });
    var D = window.ThesisData && window.ThesisData.companies ? window.ThesisData.companies : {};
    return Object.keys(D).filter(function (t) { return !held[t] && t.indexOf(".BK") < 0; });
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
    var ov = out.overview;
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
      stat("ลงทุนแล้ว · เงินสดพร้อมวาง",
        inp.investedPct != null ? pct(inp.investedPct, 1) + " · " + pct(inp.cashPct, 1) : "—",
        inp.cashBaht != null
          ? "ลงทุน " + baht(inp.flagSum || 0) + " · เงินสดใน sleeve " + baht(inp.cashBaht) + " (ฐาน = หุ้นตปท.ทั้งก้อน)"
          : "ตั้งมูลค่า sleeve ที่ Portfolio Position ก่อน จึงจะคำนวณส่วนเงินสดได้") +
      stat("Portfolio Thesis Score", ov.score == null ? "—" : ov.score + "/100", "ค่าเฉลี่ย Investment Thesis ถ่วงน้ำหนักตามสัดส่วนถือจริง (คนละตัวกับ Accumulation Score)") +
      stat("Portfolio Health", esc(ov.health.label), esc(ov.health.why)) +
      "</div></div></section>";
  }
  function stat(t, v, sub) {
    return '<div class="pm-stat"><small>' + t + "</small><b>" + v + "</b><span>" + sub + "</span></div>";
  }

  // ---------------- pie: องค์ประกอบพอร์ต (SVG donut — ES5, ไม่มี lib) ----------------
  var PIE_COLORS = ["#34d399", "#f472b6", "#fbbf24", "#a78bfa", "#22d3ee", "#fb923c", "#4ade80", "#f87171", "#c084fc", "#2dd4bf"];
  var PIE_INDEX_COLOR = "#60a5fa";
  var PIE_OTHER_COLOR = "#64748b";
  function polarXY(cx, cy, r, deg) {
    var rad = (deg * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  }
  function donutSlice(cx, cy, rOut, rIn, a0, a1) {
    var big = a1 - a0 > 180 ? 1 : 0;
    var p0 = polarXY(cx, cy, rOut, a0), p1 = polarXY(cx, cy, rOut, a1);
    var q1 = polarXY(cx, cy, rIn, a1), q0 = polarXY(cx, cy, rIn, a0);
    var f = function (n) { return n.toFixed(2); };
    return "M" + f(p0[0]) + " " + f(p0[1]) +
      " A" + rOut + " " + rOut + " 0 " + big + " 1 " + f(p1[0]) + " " + f(p1[1]) +
      " L" + f(q1[0]) + " " + f(q1[1]) +
      " A" + rIn + " " + rIn + " 0 " + big + " 0 " + f(q0[0]) + " " + f(q0[1]) + " Z";
  }
  // slices: [{ label, pct, color }] — pct = % ของทั้งพอร์ต (รวมกันควรได้ ~100)
  function pieSvg(slices, centerBig, centerSmall) {
    var sum = 0;
    slices.forEach(function (x) { sum += x.pct; });
    if (!(sum > 0)) return '';
    var CX = 100, CY = 100, RO = 88, RI = 54, a = -90, body = "";
    slices.forEach(function (x) {
      var span = (x.pct / sum) * 360;
      if (!(span > 0)) return;
      if (span >= 359.99) {
        // ชิ้นเดียวเต็มวง: arc path วาดไม่ได้ (จุดเริ่ม = จุดจบ) ต้องใช้ circle
        body += '<circle cx="' + CX + '" cy="' + CY + '" r="' + ((RO + RI) / 2) + '" fill="none" stroke="' + x.color + '" stroke-width="' + (RO - RI) + '"></circle>';
      } else {
        body += '<path d="' + donutSlice(CX, CY, RO, RI, a, a + span) + '" fill="' + x.color + '">' +
          '<title>' + esc(x.label) + ' ' + pct(x.pct) + '</title></path>';
      }
      if (x.pct / sum >= 0.055) {
        var m = polarXY(CX, CY, (RO + RI) / 2, a + span / 2);
        body += '<text class="pm-pie-lbl" x="' + m[0].toFixed(1) + '" y="' + m[1].toFixed(1) + '">' + esc(x.label) + '</text>';
      }
      a += span;
    });
    var mid = "";
    if (centerBig) {
      mid = '<text class="pm-pie-c1" x="100" y="97">' + esc(centerBig) + '</text>' +
        '<text class="pm-pie-c2" x="100" y="117">' + esc(centerSmall || '') + '</text>';
    }
    return '<svg class="pm-pie" viewBox="0 0 200 200" role="img" aria-label="สัดส่วนพอร์ต">' + body + mid + '</svg>';
  }
  function pieBlock(rows, posByTicker, pol, idxMv, cashMv, wholeBase, stocksSharePct, stocksOnly) {
    if (!(wholeBase > 0)) return '<div class="pm-dim pm-pie-none">ใส่มูลค่าหุ้น + Portfolio Value ก่อน จึงจะวาดสัดส่วนได้</div>';
    var stocks = [];
    rows.forEach(function (r) {
      if (r.isIndex || !r.held) return;
      var mv = fin(posByTicker[r.ticker] && posByTicker[r.ticker].marketValue);
      if (mv == null || mv <= 0) return;
      stocks.push({ ticker: r.ticker, mv: mv, pct: (mv / wholeBase) * 100 });
    });
    stocks.sort(function (x, y) { return y.mv - x.mv; });
    var slices = [], legend = [];
    stocks.forEach(function (x, k) {
      var c = PIE_COLORS[k % PIE_COLORS.length];
      slices.push({ label: x.ticker, pct: x.pct, color: c });
      legend.push({ label: x.ticker, pct: x.pct, color: c });
    });
    // มุมทั้งพอร์ต = แยกชิ้น index/เงินสด · มุมหุ้นรายตัว = รวบเป็นชิ้นจางเดียว (วงยังปิดครบ 100%)
    if (stocksOnly) {
      var restPct = (((idxMv || 0) + (cashMv || 0)) / wholeBase) * 100;
      if (restPct > 0) slices.push({ label: 'อื่น ๆ', pct: restPct, color: PIE_OTHER_COLOR });
    } else {
      if (idxMv > 0) {
        slices.unshift({ label: pol.indexTicker || 'index', pct: (idxMv / wholeBase) * 100, color: PIE_INDEX_COLOR });
        legend.unshift({ label: pol.indexTicker || 'index', pct: (idxMv / wholeBase) * 100, color: PIE_INDEX_COLOR });
      }
      if (cashMv > 0) {
        slices.push({ label: 'เงินสด', pct: (cashMv / wholeBase) * 100, color: PIE_OTHER_COLOR });
        legend.push({ label: 'เงินสด', pct: (cashMv / wholeBase) * 100, color: PIE_OTHER_COLOR });
      }
    }
    var svg = pieSvg(slices, stocksSharePct == null ? null : pct(stocksSharePct), 'หุ้นรายตัวรวม');
    if (!svg) return '';
    var lg = legend.map(function (x) {
      return '<span class="pm-pie-item"><i style="background:' + x.color + '"></i>' + esc(x.label) + '<b>' + pct(x.pct) + '</b></span>';
    }).join('');
    var cap = stocksOnly
      ? 'สัดส่วนหุ้นรายตัว — % ของทั้งพอร์ต · ส่วนจาง = ' + esc(pol.indexTicker || 'index') + ' + เงินสด'
      : 'องค์ประกอบพอร์ตทั้งก้อน — index core + หุ้นรายตัว + เงินสด';
    return '<div class="pm-pie-wrap">' + svg +
      '<div class="pm-pie-side"><div class="pm-pie-cap">' + cap + '</div>' +
      '<div class="pm-pie-legend">' + lg + '</div></div></div>';
  }
  // ---------------- S2: Current Portfolio (ธงแดง + index core + เงินสด) ----------------
  function sectionCurrent(out, inp) {
    var rows = out.allocationRows;
    if (!rows.length) return '<section class="pm-sec"><h2>💼 Current Portfolio</h2><div class="mc-empty">ยังไม่มีหุ้นธงแดงในกลุ่มหุ้นต่างประเทศ — ปักธงแดง + ใส่มูลค่าได้ที่ Action Center</div></section>';
    var tierSel = function (r) {
      if (r.isIndex) return '<span class="pm-idxtag">Index</span>';
      return '<select class="pm-tier-sel" data-pm-tier="' + esc(r.ticker) + '">' +
        ["A", "B", "C"].map(function (k) { return '<option value="' + k + '"' + (r.tier.key === k ? " selected" : "") + ">" + k + "</option>"; }).join("") + "</select>";
    };
    // map มูลค่า/dual จาก positions (engine ไม่ pass-through marketValue)
    var posByTicker = {};
    ((inp && inp.positions) || []).forEach(function (p) { posByTicker[p.ticker] = p; });
    var mvCell = function (r) {
      var p = posByTicker[r.ticker];
      if (!r.held || !p) return '<td class="pm-num"><button type="button" class="pm-addquick" data-pm-addquick="' + esc(r.ticker) + '" title="เพิ่ม ' + esc(r.ticker) + ' เข้าพอร์ต">➕ เพิ่ม</button></td>';
      if (p.dual) return '<td class="pm-num" title="ถือสองคลาส (GOOG+GOOGL) — มูลค่ารวม แก้แยกคลาสที่หน้า Portfolio">' + baht(p.marketValue) + ' <span class="pm-dim">🔒</span></td>';
      return '<td class="pm-num" data-pv-skip="1"><input class="pm-mv-inp" type="number" min="0" step="any" inputmode="decimal" value="' + (p.marketValue || 0) + '" data-pm-mv="' + esc(r.ticker) + '" title="แก้มูลค่า (฿) แล้ว Enter/คลิกออก เพื่อบันทึก">' +
        '<button type="button" class="pm-rm-btn" data-pm-remove="' + esc(r.ticker) + '" title="เอาออกจากพอร์ต (เก็บเป็น watchlist)">✕</button></td>';
    };
    // ---- 2 มุม: ทั้งพอร์ต vs เฉพาะหุ้นรายตัว ----
    // มุมที่ 2 = กรองรายชื่อออกมาเฉพาะหุ้นรายตัว — น้ำหนักทุกช่องยังอิงฐาน
    // ทั้งพอร์ต (Portfolio Value หุ้นต่างประเทศ) เหมือนมุมแรก ไม่ rebase ให้เทียบกันข้ามมุมได้
    var stocksOnly = currentView() === "stocks";
    var pol = out.policy || {};
    var stocksBase = 0, idxMv = null;
    rows.forEach(function (r) {
      var mv = fin(posByTicker[r.ticker] && posByTicker[r.ticker].marketValue);
      if (r.isIndex) { idxMv = mv; return; }
      if (r.held && mv != null && mv > 0) stocksBase += mv;
    });

    var visRows = (stocksOnly ? rows.filter(function (r) { return !r.isIndex; }) : rows).slice();
    // เรียงตามมูลค่า มาก→น้อย (ลำดับเดียวกับ pie) · ตัวที่ยังไม่ใส่มูลค่า/ยังไม่ถือ ไปท้ายสุด
    var mvSort = function (r) {
      var mv = fin(posByTicker[r.ticker] && posByTicker[r.ticker].marketValue);
      return r.held && mv != null && mv > 0 ? mv : -1;
    };
    visRows.sort(function (x, y) {
      var a = mvSort(x), b = mvSort(y);
      if (a !== b) return b - a;
      return x.ticker < y.ticker ? -1 : x.ticker > y.ticker ? 1 : 0;   // เสมอ = เรียงชื่อ ให้ลำดับนิ่ง
    });
    var tr = visRows.map(function (r) {
      var wcell = r.weightPct == null ? '<span class="pm-dim" title="ใส่มูลค่า (฿) เพื่อคิดสัดส่วน">—</span>' : pct(r.weightPct);
      return "<tr" + (r.isIndex ? ' class="pm-row-index"' : "") + ">" +
        "<td>" + assetLink(r.ticker) + (r.isIndex ? ' <span class="pm-idxtag">core</span>' : "") + '<small class="pm-dim"> ' + esc(r.name) + (r.held ? "" : " · ยังไม่ถือ") + "</small></td>" +
        "<td>" + tierSel(r) + "</td>" +
        mvCell(r) +
        '<td class="pm-num">' + wcell + "</td>" +
        "<td>" + (r.covered ? zoneChip(r.zone) : '<span class="pm-dim">ไม่มี thesis</span>') + "</td>" +
        "<td>" + (r.covered ? actionChip(r.action) : '<a class="pm-dim" href="/thesis">/thesis-update ' + esc(r.ticker) + "</a>") + "</td></tr>";
    }).join("");
    // แถวเงินสด = Portfolio Value (หุ้นต่างประเทศ) − ผลรวมมูลค่าหุ้นที่ลงทุน — ให้ครบ 100%
    if (!stocksOnly && inp && inp.cashBaht != null && inp.gross != null) {
      var cashW = inp.gross > 0 ? (inp.cashBaht / Math.max(inp.gross, inp.flagSum || 0)) * 100 : null;
      tr += '<tr class="pm-row-cash">' +
        '<td>💵 <b>เงินสดใน sleeve</b><small class="pm-dim"> Portfolio Value − หุ้นที่ลงทุน</small></td>' +
        "<td><span class='pm-idxtag'>Cash</span></td>" +
        '<td class="pm-num">' + baht(inp.cashBaht) + "</td>" +
        '<td class="pm-num"><b>' + (cashW == null ? "—" : pct(cashW)) + "</b></td>" +
        '<td><span class="pm-dim">รอ deploy ตาม Cash Deployment Plan ด้านล่าง</span></td>' +
        '<td><span class="pm-action pm-neutral">Reserve</span></td></tr>';
    }
    // ฟอร์มเพิ่มหุ้นเข้าพอร์ต (ย้ายมาจาก Action Center) — เขียนลง store เดียวกับทั้งแอป
    var dl = kbTickersNotHeld(rows).map(function (t) { return '<option value="' + esc(t) + '">'; }).join("");
    var addForm = '<div class="pm-addform" data-pv-skip="1">➕ <b>เพิ่มหุ้นเข้าพอร์ต:</b> ' +
      '<input id="pmAddTicker" list="pmKbList" placeholder="TICKER เช่น MSFT" maxlength="12" autocomplete="off"><datalist id="pmKbList">' + dl + "</datalist>" +
      '<input id="pmAddAmount" type="number" min="0" step="any" inputmode="decimal" placeholder="มูลค่า (฿)">' +
      '<button type="button" id="pmAddBtn" class="pm-add-btn">เพิ่ม</button>' +
      '<small class="pm-dim">bucket: หุ้นต่างประเทศ · บันทึกชุดข้อมูลเดียวกับหน้า Portfolio/ทั้งแอป · พิมพ์ ticker นอก list ได้</small></div>';
    var cashMv = inp && inp.cashBaht != null ? inp.cashBaht : null;
    var wholeBase = stocksBase + (idxMv || 0) + (cashMv || 0);
    var stocksSharePct = wholeBase > 0 ? (stocksBase / wholeBase) * 100 : null;
    var vnote = stocksOnly
      ? "กรองเฉพาะรายชื่อหุ้นรายตัว (ซ่อน " + esc(pol.indexTicker || "index") + " + เงินสด) — ตัวเลขทุกช่องยังอิงฐานทั้งพอร์ต"
      : "ฐาน 100% = Portfolio Value หุ้นต่างประเทศ (index core + หุ้นรายตัว + เงินสด)";
    var vsw = '<div class="pm-viewsw"><small>มุมมอง:</small>' +
      '<button type="button" class="pm-stance-btn' + (stocksOnly ? "" : " is-on pm-bull") + '" data-pm-cview="all">🥧 ทั้งพอร์ต</button>' +
      '<button type="button" class="pm-stance-btn' + (stocksOnly ? " is-on pm-bull" : "") + '" data-pm-cview="stocks">📊 เฉพาะหุ้นรายตัว</button>' +
      "<span>" + vnote + "</span></div>";
    return '<section class="pm-sec"><h2>💼 Current Portfolio <small>(' + (stocksOnly ? "เฉพาะหุ้นรายตัว — ตัด index core + เงินสดออก เพื่อดูสัดส่วนภายในกลุ่มหุ้น" : "หุ้นธงแดง + index core + เงินสด — เห็นทั้งพอร์ตรวม") + ' · แก้มูลค่า/เพิ่ม/เอาออก ได้ที่นี่)</small></h2>' + vsw + pieBlock(rows, posByTicker, pol, idxMv, cashMv, wholeBase, stocksSharePct, stocksOnly) +
      '<div class="pm-tablewrap"><table class="pm-table"><thead><tr><th>Ticker</th><th>Tier</th><th>มูลค่า (฿)</th><th>น้ำหนักปัจจุบัน</th><th>Accumulation Zone</th><th>Position Status</th></tr></thead><tbody>' +
      tr + "</tbody></table></div>" + addForm + allocEditor(pol) + "</section>";
  }

  // ตัวระบุ index core (ต้องรู้ว่าแถวไหนคือ index — ไม่ใช่เรื่องเป้า) · %/เพดาน/วิธีแบ่ง ถอดออกแล้ว
  function allocEditor(p) {
    return '<details class="pm-details pm-alloccfg" data-pv-skip="1"><summary>⚙️ ตั้งค่า index core</summary>' +
      '<div class="pm-allocrow"><label>Index ticker <input class="pm-alloc-inp" type="text" value="' + esc(p.indexTicker) + '" data-pm-alloc="indexTicker"></label></div>' +
      '<small>ตัวที่ถือเป็นแกน index ของพอร์ต — ใช้แยกแถว index ออกจากหุ้นรายตัว (ค่าเก็บในเครื่อง)</small></details>';
  }
  // ---------------- S4: Accumulation Opportunities (Zone นำ Score รอง) ----------------
  // "Dip" = dipTiming ของ PMEngine (ยิ่งย่อยิ่งได้แต้ม) — คนละสูตรกับ Timing Score เทคนิคหน้าอื่น
  var SCORE_SHORT = { thesis: "Thesis", growthPrice: "Growth", timing: "Dip", valuation: "Val(curated)" };
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
    // ฿ ต่อรายการ = สัดส่วนของเงินสดจริงใน sleeve (คำนวณได้เมื่อตั้ง Quarterly Editor แล้ว)
    var bahtOf = function (pctCash) { return inp.cashBaht != null ? baht(inp.cashBaht * pctCash / 100) : null; };
    var items = d.items.map(function (i) {
      var amt = bahtOf(i.pctOfCash);
      return '<div class="pm-dep-row"><div class="pm-dep-head">' + assetLink(i.ticker) +
        '<b>' + i.pctOfCash.toFixed(1) + "% ของเงินสด" + (amt ? " ≈ " + amt : "") + "</b></div>" +
        '<div class="pm-depbar"><i style="width:' + Math.min(100, i.pctOfCash) + '%"></i></div>' +
        '<small>' + esc(i.why) + (i.halved ? " · ถูกลดครึ่งจาก Macro Risk-Off (Rule 3)" : "") + "</small></div>";
    }).join("");
    // headline: เงินก้อนถัดไปควรไปที่ไหน เท่าไหร่ — ตอบใน 1 บรรทัด ไม่ต้องไล่อ่านแผน
    var top = d.items && d.items.length ? d.items[0] : null;
    var headline;
    if (top) {
      var topAmt = bahtOf(top.pctOfCash);
      headline = '<div class="pm-dep-next">🎯 เงินก้อนถัดไป → <b>' + esc(top.ticker) + "</b> " +
        (topAmt ? "<b>≈ " + topAmt + "</b> (" + top.pctOfCash.toFixed(1) + "% ของเงินสด " + baht(inp.cashBaht) + ")" : top.pctOfCash.toFixed(1) + "% ของเงินก้อนที่จะวาง") +
        (d.items.length > 1 ? " · ตัวถัดไป: " + d.items.slice(1, 3).map(function (i) { return esc(i.ticker); }).join(", ") : "") + "</div>";
    } else {
      headline = '<div class="pm-dep-next pm-dep-next-wait">🛡️ ตอนนี้ยังไม่มี entry ที่ trigger — <b>ถือเงินสดรอ 100%</b>' +
        (inp.cashBaht != null ? " (เงินสดใน sleeve " + baht(inp.cashBaht) + " · " + pct(inp.cashPct, 1) + ")" : "") +
        " · ตัวถัดไปดูจาก Zone ที่ดีสุดในตาราง Accumulation ด้านบน</div>";
    }
    return '<section class="pm-sec"><h2>💵 Cash Deployment Plan <small>(เงินสดที่พร้อมวาง = 100%)</small></h2>' +
      headline +
      (inp.cashPct != null ? "<p>เงินสดจริงใน sleeve ตอนนี้ " + pct(inp.cashPct, 1) + " (" + baht(inp.cashBaht) + ") ของ sleeve — แผนด้านล่างคิดเป็นสัดส่วนของเงินสดก้อนนี้</p>"
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
          "<b>" + esc(e.title) + "</b></label>" +
          '<span class="pm-entry-status">' + status + "</span>" +
          "<small>" + esc(e.rule) + '</small><small class="pm-entry-why">→ ' + esc(e.why) + "</small></div>";
      }).join("");
      return '<article class="pm-mgr">' +
        '<div class="pm-mgr-head">' + assetLink(r.ticker) + (r.isIndex ? ' <span class="pm-idxtag">Index core</span>' : "") + zoneChip(r.zone) + actionChip(r.action) + "</div>" +
        '<div class="pm-mgr-nums">' +
        mnum("น้ำหนักปัจจุบัน", pct(r.weightPct)) + mnum(r.isIndex ? "ประเภท" : "Tier", r.isIndex ? "Index" : r.tier.key) +
        "</div>" +
        '<div class="pm-entries">' + lad + "</div></article>";
    }).join("");
    return '<section class="pm-sec"><h2>🧰 Position Manager <small>(Entry Ladder — ระบบจำว่า deploy ไปแล้วขั้นไหน)</small></h2>' +
      "<p>ติ๊ก ✓ เมื่อวางเงินจริงของ entry นั้นแล้ว — ระบบจะจำไว้ข้ามวัน และหักออกจากแผน Cash Deployment ด้านบน (เก็บในเครื่อง)</p>" +
      (cards || '<div class="mc-empty">ยังไม่มีตำแหน่งที่มี Investment Thesis</div>') +
      tierEditor(out) + "</section>";
  }
  function mnum(t, v) { return '<div class="pm-mnum"><small>' + t + "</small><b>" + v + "</b></div>"; }
  function tierEditor(out) {
    var defs = out.tierDefs;
    var rows = ["A", "B", "C"].map(function (k) {
      var d = defs[k];
      var inp = function (f) { return '<input class="pm-tier-inp" type="number" min="0" max="100" step="0.5" value="' + d[f] + '" data-pm-tierdef="' + k + '" data-f="' + f + '">'; };
      return "<tr><td>" + esc(d.label) + "</td><td>" + inp("min") + "</td><td>" + inp("max") + "</td></tr>";
    }).join("");
    return '<details class="pm-details pm-tiercfg"><summary>⚙️ Master Position Size — ปรับกรอบ Tier ได้ (Min / Max % ของ sleeve)</summary>' +
      '<table class="pm-table"><thead><tr><th>Tier</th><th>Min</th><th>Max</th></tr></thead><tbody>' + rows + "</tbody></table>" +
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
    return '<footer class="pm-foot">🧠 <b>วิธีคิดทั้งหมดเปิดเผย:</b> Zone/คะแนน/แผนเงิน มาจาก Investment Thesis Engine + Market Regime + Rate Monitor + เทคนิคจาก snapshot · มุมมอง AI Megatrend <b>คุณตัดสินใจเอง</b> (สวิตช์ Bullish/Bearish ด้านบน — เป็นเกต Rule 1 ไม่ใช่คะแนนคำนวณ) — สูตร Accumulation Score ชุดเดียวกับ Accumulation Center (engine กลางตัวเดียวกัน) · deterministic ไม่มี AI-generated opinion · กดดู "ทำไม" ได้ทุกการ์ด · ไม่ใช่คำแนะนำการลงทุน</footer>';
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
      sectionCurrent(out, inp) +
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
    // จัดการพอร์ต: แก้มูลค่า / เอาออก / เพิ่มหุ้น (path เขียนเดียวกับทั้งแอป)
    root.querySelectorAll("[data-pm-mv]").forEach(function (el) {
      el.addEventListener("change", function () { saveHoldingAmount(el.getAttribute("data-pm-mv"), el.value, true); });
      el.addEventListener("keydown", function (ev) { if (ev.key === "Enter") { ev.preventDefault(); el.blur(); } });
    });
    root.querySelectorAll("[data-pm-remove]").forEach(function (el) {
      el.addEventListener("click", function () {
        var t = el.getAttribute("data-pm-remove");
        if (confirm("เอา " + t + " ออกจากพอร์ต? (record ยังอยู่เป็น watchlist — เพิ่มกลับได้ตลอด)")) saveHoldingAmount(t, 0, false);
      });
    });
    root.querySelectorAll("[data-pm-addquick]").forEach(function (el) {
      el.addEventListener("click", function () {
        var t = el.getAttribute("data-pm-addquick");
        var ti = document.getElementById("pmAddTicker"), am = document.getElementById("pmAddAmount");
        if (ti) ti.value = t;
        if (am) { am.focus(); am.scrollIntoView({ block: "center", behavior: "smooth" }); }
      });
    });
    var addBtn = document.getElementById("pmAddBtn");
    if (addBtn) addBtn.addEventListener("click", function () {
      var ti = document.getElementById("pmAddTicker"), am = document.getElementById("pmAddAmount");
      var t = ti ? String(ti.value || "").trim().toUpperCase() : "";
      var v = am ? fin(am.value) : null;
      if (!t) { alert("ใส่ ticker ก่อน"); return; }
      if (v == null || v < 0) { alert("ใส่มูลค่า (฿) เป็นตัวเลข"); return; }
      saveHoldingAmount(t, v, true);
    });
    root.querySelectorAll("[data-pm-entry]").forEach(function (el) {
      el.addEventListener("change", function () { toggleEntry(el.getAttribute("data-pm-entry"), el.getAttribute("data-n"), el.checked); });
    });
    root.querySelectorAll("[data-pm-tierdef]").forEach(function (el) {
      el.addEventListener("change", function () { setTierParam(el.getAttribute("data-pm-tierdef"), el.getAttribute("data-f"), el.value); });
    });
    root.querySelectorAll("[data-pm-cview]").forEach(function (el) {
      el.addEventListener("click", function () { setCurrentView(el.getAttribute("data-pm-cview")); });
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
