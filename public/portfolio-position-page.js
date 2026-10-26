(function () {
  "use strict";

  // ============================================================
  // Portfolio Position — page (facts only).
  // Renders window.PortfolioPosition.compute(snapshot) — the truthful picture
  // of the portfolio anchored on the Quarterly Editor — and hosts the ticker
  // CRUD modal (the only editing UI now that the Holdings page is retired).
  // No recommendations, no rebalance advice. Recomputes on render only.
  // ============================================================

  var ROOT_ID = "ppRoot";
  var core = window.PortfolioCore;

  // Manual per-bucket placements (Portfolio-Position overlay, localStorage). Lets the
  // SAME ticker sit in several buckets as separate line items — not possible in the
  // shared holdings store (DB keys on canonical_symbol). Signal uses the base ticker.
  var MANUAL_KEY = "pp_bucket_items_v1";
  function readBucketItems() { try { return JSON.parse(window.localStorage.getItem(MANUAL_KEY) || "{}") || {}; } catch (e) { return {}; } }
  // ผลตอบแทนไตรมาสที่แสดง: รวมเงินเติม · เงินเติม · ไม่รวมเงินเติม — อ่านจาก record.whole ของ AssetAllocation
  // (ตัวเดียวกับตารางบันทึกผลตอบแทนท้ายหน้า ไม่คำนวณเองคนละสูตร · ฐาน = ทุกรายการ เหมือนความมั่งคั่งรวม)
  // allocation ใช้ชุดเดียวกับส่วน Asset Allocation บนหน้านี้ — รวมค่าที่เพิ่งพิมพ์แต่ยังบันทึกไม่สำเร็จ
  // ไม่งั้นหัวหน้ากับตารางจะคนละตัวเลขตอนบันทึกล้มเหลว
  // คืน null = ไม่มี engine/ข้อมูล · {available:false, reason} = มี engine แต่ไตรมาสนี้เทียบไม่ได้
  function realGrowth(R) {
    var AA = window.AssetAllocation;
    if (!AA || typeof AA.compute !== "function") return null;
    var snap = effectiveSnapshot();
    var src = psCache || (snap && snap.portfolioStatus) || null;
    if (!src) return null;
    var alloc = null;
    try {
      var AP = window.AssetAllocationPage;
      if (AP && typeof AP.currentAllocation === "function") alloc = AP.currentAllocation();
    } catch (e) { alloc = null; }
    var out = null;
    try { out = AA.compute(src, alloc); } catch (e) { return null; }
    var W = out && out.available && out.record ? out.record.whole : null;
    if (!W || !W.rows) return null;
    var row = null;
    for (var i = 0; i < W.rows.length; i++) { if (W.rows[i].key === R.quarterKey) { row = W.rows[i]; break; } }
    if (!row) {
      return { available: false, reason: W.baseKey === R.quarterKey
        ? "ไตรมาสแรกที่มีข้อมูล ยังไม่มีไตรมาสก่อนหน้าให้เทียบ" : "ไตรมาสนี้ยังไม่มีมูลค่าในข้อมูลรายไตรมาส" };
    }
    var tg = W.target || {};
    return {
      available: true,
      naive: row.naive, change: row.change, prevKey: row.prevKey, span: row.span,
      flow: row.flow, source: row.flowSource, overridden: !!row.settingOverridden,
      quarterly: W.quarterly ? W.quarterly.amount : null,
      real: row.real, target: row.target, status: row.status,
      annualPct: typeof tg.annualPct === "number" ? tg.annualPct : null
    };
  }
  function signedPctOf(x) { return (x >= 0 ? "+" : "−") + Math.abs(x * 100).toFixed(1) + "%"; }
  function moneyOf(x) { return x < 0 ? "−" + thb(-x) : thb(x); }
  // 3 บรรทัดคู่กันเสมอ — ไม่ต้องกดสลับ · ทุกบรรทัดบอกที่มาของตัวเลข
  function growthBlock(G) {
    var stTh = G.status === "ahead" ? "เกินเป้า" : (G.status === "behind" ? "ต่ำกว่าเป้า" : (G.status === "on" ? "ตามเป้า" : ""));
    var naiveV = G.naive === null ? '<span class="pp-grow-v">—</span>'
      : '<span class="pp-grow-v ' + (G.naive >= 0 ? "pp-up" : "pp-down") + '">' + signedPctOf(G.naive) + "</span>";
    var naiveN = "มูลค่าเพิ่ม " + (G.change >= 0 ? "+" : "") + moneyOf(G.change) + (G.span > 1 ? " · เทียบ " + G.prevKey + " (" + G.span + " ไตรมาส)" : "");
    var flowV, flowN, warn = false;
    if (G.source === "setting") { flowV = moneyOf(G.flow); flowN = "ตามที่ตั้งไว้ไตรมาสละ" + (G.span > 1 ? " × " + G.span + " ไตรมาส" : ""); }
    else if (G.source === "recorded") { flowV = moneyOf(G.flow); flowN = "ตามที่กรอกในรายการ" + (G.overridden ? " (ใช้แทนยอดไตรมาสละ " + thb(G.quarterly) + ")" : ""); }
    else if (G.source === "partial") { flowV = moneyOf(G.flow); flowN = "กรอกไว้บางรายการ — ตัวเลขอาจคลาดเคลื่อน"; warn = true; }
    else if (G.source === "imputed") { flowV = moneyOf(G.flow); flowN = "ไม่ได้กรอก — ระบบประมาณจากรายการที่เพิ่งเข้าพอร์ต"; warn = true; }
    else { flowV = "—"; flowN = "ยังไม่ได้ตั้ง “เติมเงินเข้าพอร์ตไตรมาสละ” — ตั้งได้ที่แผนเกษียณด้านล่าง"; warn = true; }
    var realV, realN;
    if (G.real === null) {
      realV = '<span class="pp-grow-v">—</span>';
      realN = esc("คำนวณไม่ได้ — ถอนมากกว่ามูลค่าที่มี");
    } else {
      realV = '<span class="pp-grow-v ' + (G.real >= 0 ? "pp-up" : "pp-down") + '">' + signedPctOf(G.real) + "</span>";
      // คำสถานะอยู่ใน <b> ที่ไม่ตัดบรรทัด — ภาษาไทยตัดคำ "ตาม|เป้า" ได้ถ้าการ์ดแคบ
      realN = (G.source === "none" ? esc("เท่ากับรวมเงินเติม เพราะยังไม่มียอดเงินเติมให้หัก") + " · " : "") +
        (G.target === null ? "" : '<span class="pp-nw">' + esc("เป้า ~" + (G.target * 100).toFixed(1) + "%" + (G.span > 1 ? " (" + G.span + " ไตรมาส)" : "/ไตรมาส")) + "</span>" +
          (stTh ? ' · <b class="pp-grow-st is-' + G.status + '">' + stTh + "</b>" : ""));
    }
    return '<div class="pp-grow">' +
      '<span class="pp-grow-k">รวมเงินเติม</span>' + naiveV + '<span class="pp-grow-n">' + esc(naiveN) + "</span>" +
      '<span class="pp-grow-k">เงินเติมไตรมาสนี้</span><span class="pp-grow-v">' + esc(flowV) + "</span>" +
        '<span class="pp-grow-n' + (warn ? " pp-warn" : "") + '">' + esc(flowN) + "</span>" +
      '<span class="pp-grow-k">ไม่รวมเงินเติม</span>' + realV + '<span class="pp-grow-n">' + realN + "</span>" +
      "</div>";
  }
  var psCache = null, psTried = false;   // pre-Load /api/portfolio fallback
  var holdingsTried = false;


  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  function thb(v) { var n = Number(v); if (!Number.isFinite(n)) return "—"; return "฿" + Math.round(n).toLocaleString("en-US"); }
  function pct(v, d) { var n = Number(v); return Number.isFinite(n) ? n.toFixed(d == null ? 1 : d) + "%" : "—"; }
  function readSnapshot() { try { return (window.PortfolioDataSnapshot && window.PortfolioDataSnapshot.read && window.PortfolioDataSnapshot.read()) || null; } catch (e) { return null; } }
  function timeAgo(iso) {
    if (!iso) return null; var t = Date.parse(iso); if (!Number.isFinite(t)) return null;
    var m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return "เมื่อครู่"; if (m < 60) return m + " นาทีที่แล้ว";
    var h = Math.round(m / 60); if (h < 24) return h + " ชม.ที่แล้ว"; return Math.round(h / 24) + " วันที่แล้ว";
  }

  function getHoldingsArray() {
    var snap = readSnapshot();
    var ph = snap && snap.portfolioHoldings;
    if (ph && Array.isArray(ph.data) && ph.data.length) return core.dedupeHoldings(ph.data);
    return core.readLocalHoldings();
  }

  // pseudo-snapshot so the page works before Load Latest Data.
  // IMPORTANT: /api/portfolio (what the Quarterly Editor saves) is the SOURCE OF
  // TRUTH for bucket money — snapshot.portfolioStatus is only a copy captured at
  // the last Load Latest Data. A fresh fetch must therefore OVERRIDE the snapshot
  // copy, otherwise edits in the Quarterly Editor never show up on this page.
  function effectiveSnapshot() {
    var snap = readSnapshot();
    if (psCache) {
      var pseudo = Object.assign({}, snap || {});
      pseudo.portfolioStatus = psCache;
      if (!pseudo.portfolioHoldings || !Array.isArray(pseudo.portfolioHoldings.data)) {
        pseudo.portfolioHoldings = { data: getHoldingsArray() };
      }
      return pseudo;
    }
    return snap;
  }

  var psFetchedAt = 0;
  function ensurePortfolioFetched(force) {
    if (psTried && !force) return;
    psTried = true;
    try {
      window.fetch("/api/portfolio", { cache: "no-store" })
        .then(function (r) { return r && r.ok ? r.json() : null; })
        .then(function (j) {
          if (j && (j.data || j.quarters)) { psCache = j; psFetchedAt = Date.now(); render(); }
        })
        .catch(function () {});
    } catch (e) {}
  }
  // came back to this tab after editing the Quarterly Editor elsewhere → refetch
  function refreshQuarterlyOnFocus() {
    if (document.hidden) return;
    if (Date.now() - psFetchedAt > 30000) ensurePortfolioFetched(true);
  }
  function ensureHoldingsFetched() {
    if (holdingsTried) return; holdingsTried = true;
    try { core.loadHoldings().then(function () { render(); }).catch(function () {}); } catch (e) {}
  }

  // ============================================================ render
  function render() {
    var root = document.getElementById(ROOT_ID);
    if (!root) return;
    var snap = effectiveSnapshot();
    var R = (window.PortfolioPosition && window.PortfolioPosition.compute(snap, { bucketItems: readBucketItems() })) || { available: false, reason: "no-engine" };

    if (!R.available) {
      if (R.reason === "no-quarterly" || R.reason === "no-snapshot") { ensurePortfolioFetched(); ensureHoldingsFetched(); }
      root.innerHTML = emptyState(R);
      return;
    }

    // หน้านี้แสดงเฉพาะสองส่วนบนตามที่ใช้งานจริง: สรุปมูลค่า/สัดส่วนเงินสด และแถบสัดส่วนพอร์ต
    // ส่วนที่เหลือ (bucket board / trays / modal จัดการรายการ) ถูกปิดการแสดงผลไว้
    // เนื้อหาถัดจากนี้บนหน้าเดียวกันคือ Asset Allocation ซึ่งเรนเดอร์เองที่ #aaRoot
    var html = "";
    html += summaryStrip(R);
    html += allocationBar(R);
    root.innerHTML = html;
  }

  function emptyState(R) {
    var msg = R.reason === "no-quarterly" || R.reason === "no-snapshot"
      ? 'ยังไม่มีข้อมูลพอร์ตรายไตรมาส — เริ่มจากกรอกสินทรัพย์ของคุณใน <a href="/">Quarterly Editor</a> ก่อน แล้วหน้านี้จะสรุปสัดส่วนให้อัตโนมัติ'
      : 'โหลดข้อมูลไม่สำเร็จ (' + esc(R.reason || "") + ") — ลองกด Load Latest Data";
    return '<section class="pp-hero"><div class="pp-hero-inner">' +
      '<div class="pp-hero-emoji">📊</div>' +
      '<h1 class="pp-title">Portfolio Position</h1>' +
      '<p class="pp-sub">ภาพจริงของพอร์ต: สัดส่วน มูลค่า ไส้ใน และสภาวะของแต่ละสินทรัพย์</p>' +
      '<p class="pp-empty-msg">' + msg + "</p></div></section>";
  }

  // -------------------------------------------------- 1 · summary strip
  function summaryStrip(R) {
    var T = R.totals;
    var qoq = T.qoq ? ((T.qoq.thb >= 0 ? "+" : "") + thb(T.qoq.thb).replace("฿", "฿") + (T.qoq.pct != null ? " (" + (T.qoq.pct >= 0 ? "+" : "") + T.qoq.pct + "%)" : "")) : null;
    var ago = timeAgo(R.generatedAt);
    var RG = realGrowth(R);
    var qoqLine = qoq ? '<div class="pp-stat-s ' + (T.qoq.thb >= 0 ? "pp-up" : "pp-down") + '">QoQ ' + esc(qoq) + "</div>" : '<div class="pp-stat-s">ยังไม่มีไตรมาสก่อนหน้า</div>';
    // มี record ทั้งพอร์ต → 3 บรรทัดคู่กัน · ไม่มี engine/เทียบไม่ได้ → QoQ เดิม (+ เหตุผลถ้ามี)
    var growthLine = RG && RG.available ? growthBlock(RG)
      : qoqLine + (RG && RG.reason ? '<div class="pp-stat-s pp-dim">ไม่รวมเงินเติม: ' + esc(RG.reason) + "</div>" : "");
    return '<section class="pp-hero"><div class="pp-hero-inner">' +
      '<div class="pp-hero-head"><div><h1 class="pp-title">📊 Portfolio Position</h1>' +
      '<p class="pp-sub">ไตรมาส <b>' + esc(R.quarterKey) + '</b> · ' + T.assetCount + " รายการใน Quarterly Editor" + (ago ? " · อัปเดต " + esc(ago) : "") + '</p></div></div>' +
      '<div class="pp-stats">' +
        '<div class="pp-stat"><div class="pp-stat-n">' + thb(T.total) + '</div><div class="pp-stat-l">ความมั่งคั่งรวม</div>' + growthLine + '</div>' +
        '<div class="pp-stat"><div class="pp-stat-n">' + pct(T.investedPct) + '</div><div class="pp-stat-l">ลงทุนจริง</div><div class="pp-stat-s">' + thb(T.investedSum) + '</div></div>' +
        '<div class="pp-stat"><div class="pp-stat-n">' + pct(T.cashPct) + '</div><div class="pp-stat-l">เงินสด/ยังไม่ลงทุน</div><div class="pp-stat-s">' + thb(T.cashSum) + '</div></div>' +
      '</div>' +
      '<div class="pp-invbar" title="ลงทุนจริง ' + pct(T.investedPct) + ' · เงินสด ' + pct(T.cashPct) + '"><i style="width:' + Math.max(0, Math.min(100, T.investedPct)) + '%"></i></div>' +
      '<div class="pp-invbar-cap"><span>ลงทุนจริง ' + pct(T.investedPct) + '</span><span>เงินสด ' + pct(T.cashPct) + '</span></div>' +
    '</div></section>';
  }

  // -------------------------------------------------- 2 · allocation bar
  function allocationBar(R) {
    var segs = "", legend = "";
    R.buckets.forEach(function (b) {
      if (!(b.pct > 0)) return;
      segs += '<i style="width:' + b.pct + '%;background:' + b.color + '" title="' + esc(b.label) + " " + pct(b.pct) + '"></i>';
      legend += '<span class="pp-leg"><i style="background:' + b.color + '"></i>' + esc(b.label) + " <b>" + pct(b.pct) + "</b></span>";
    });
    return '<section class="pp-block"><div class="pp-block-head"><h2>สัดส่วนพอร์ตตอนนี้</h2><span class="pp-block-sub">ตามมูลค่าจริงจาก Quarterly Editor</span></div>' +
      '<div class="pp-alloc">' + segs + '</div><div class="pp-legend">' + legend + "</div></section>";
  }

  // ============================================================ boot
  function init() {
    render();
    ensurePortfolioFetched();          // always pull fresh Quarterly data (source of truth)
    // Load Latest Data just refreshed snapshot.portfolioStatus from the server —
    // drop our earlier fetch so the (equally fresh) snapshot copy takes over.
    window.addEventListener("portfolio-data-snapshot", function () { psCache = null; psFetchedAt = Date.now(); render(); });
    window.addEventListener("portfolio-holdings-updated", render);
    // ส่วน Asset Allocation (หน้าเดียวกัน) บันทึกแผนเกษียณ/เป้า แล้ว — รับข้อมูลชุดที่เพิ่ง PUT
    // ไม่งั้นหัวหน้านี้ยังใช้ allocation เก่า (เช่น "เติมเงินปีละ" ที่เพิ่งพิมพ์) จนกว่าจะรีโหลด
    // แก้แผนเกษียณ/เงินเติมไตรมาสละในส่วน AA (ยังไม่ต้องรอบันทึก) → หัวหน้านี้ตามทันที
    window.addEventListener("portfolio-allocation-changed", render);
    window.addEventListener("portfolio-allocation-saved", function (ev) {
      var d = ev && ev.detail && ev.detail.data;
      if (d && d.quarters) { psCache = { data: d }; psFetchedAt = Date.now(); }
      render();
    });
    window.addEventListener("focus", refreshQuarterlyOnFocus);
    document.addEventListener("visibilitychange", refreshQuarterlyOnFocus);
    // ไม่มีตัวดัก Escape แล้ว — modal ที่มันเคยปิดถูกถอดออกไปพร้อมกัน
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();

  window.PortfolioPositionPage = { render: render };
})();
