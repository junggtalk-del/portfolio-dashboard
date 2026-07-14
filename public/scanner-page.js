(function () {
  "use strict";

  // ============================================================
  // Market Scanner — unified scanner (merges Technical Signals,
  // สัญญาณเด่นวันนี้, Thai Stock Scanner into one page).
  //
  // Scans 3 universes ON BUTTON PRESS (user-confirmed: manual trigger):
  //   🇹🇭 SET100+mai · 🌎 foreign stocks with Thai DRs (underlyings)
  //   · 🪙 Crypto Top-10 (+ user custom global symbols)
  // via the EXISTING /api/thai-stock-scanner endpoint (batched, paginated).
  // Signal logic is server-side and unchanged: EMA12×26 bullish cross ≤3d
  // + volume confirmation + SMA200 status + near-cross detection.
  // BUY signals are surfaced first ("🔔 สัญญาณซื้อ"), sorted by hotness.
  // Last scan results persist in localStorage so revisits render instantly.
  // ============================================================

  var ROOT_ID = "scannerRoot";
  var RESULTS_KEY = "scanner_results_v1";
  var CUSTOM_KEY = "scanner_custom_symbols";

  var UNIVERSES = [
    { key: "SET100_MAI", icon: "🇹🇭", label: "หุ้นไทย SET100 + mai", short: "หุ้นไทย", limit: 6 },
    { key: "DR", icon: "🌎", label: "หุ้นนอกที่มี DR ไทย", short: "หุ้นนอก DR", limit: 5 },
    { key: "CRYPTO10", icon: "🪙", label: "Crypto Top 10 (market cap)", short: "Crypto", limit: 5 }
  ];

  var state = {
    scanning: false,
    cancel: false,
    progress: null, // { uniKey, done, total }
    data: readResults() // { [uniKey]: { results, near, insufficient, failed, total, scannedAt } }
  };

  // ---------------------------------------------------------- storage
  function readResults() { try { return JSON.parse(localStorage.getItem(RESULTS_KEY) || "{}") || {}; } catch (e) { return {}; } }
  function writeResults() { try { localStorage.setItem(RESULTS_KEY, JSON.stringify(state.data)); } catch (e) { /* quota — in-memory still fine */ } }
  function readCustom() { try { return String(localStorage.getItem(CUSTOM_KEY) || ""); } catch (e) { return ""; } }
  function writeCustom(v) { try { localStorage.setItem(CUSTOM_KEY, String(v || "")); } catch (e) {} }

  // ---------------------------------------------------------- utils
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  function num(v) { var n = Number(v); return isFinite(n) ? n : null; }
  function fmtClose(v) { var n = num(v); if (n == null) return "—"; return n >= 1000 ? n.toLocaleString("en-US", { maximumFractionDigits: 0 }) : n >= 10 ? n.toFixed(2) : n.toFixed(4).replace(/0+$/, "").replace(/\.$/, ""); }
  function timeAgo(iso) {
    if (!iso) return "—"; var t = Date.parse(iso); if (!isFinite(t)) return "—";
    var m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return "เมื่อครู่"; if (m < 60) return m + " นาทีที่แล้ว";
    var h = Math.round(m / 60); if (h < 24) return h + " ชม.ที่แล้ว"; return Math.round(h / 24) + " วันที่แล้ว";
  }

  // hotness: volume-confirmed → freshest cross → above SMA200 (same recipe as สัญญาณเด่นวันนี้)
  function hotScore(item) {
    var vol = Math.min(num(item.volumeRatio) || 0, 4);
    var days = num(item.daysSinceCrossover); var fresh = days == null ? 0 : Math.max(0, 4 - days);
    var above = item.sma200Status === "ABOVE_SMA200" ? 1 : 0;
    return vol * 10 + fresh * 5 + above * 8;
  }

  function uniMeta(key) { for (var i = 0; i < UNIVERSES.length; i++) if (UNIVERSES[i].key === key) return UNIVERSES[i]; return { key: key, icon: "•", label: key, short: key }; }

  // ---------------------------------------------------------- scanning
  async function fetchBatch(uniKey, offset, limit, symbols, force) {
    var qs = "universe=" + encodeURIComponent(uniKey) + "&offset=" + offset + "&limit=" + limit + (force ? "&refresh=1" : "");
    if (symbols) qs += "&symbols=" + encodeURIComponent(symbols);
    var res = await fetch("/api/thai-stock-scanner?" + qs, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  }

  async function scanUniverse(uniKey, opts) {
    opts = opts || {};
    var meta = uniMeta(uniKey);
    var isCustom = uniKey === "CUSTOM_GLOBAL";
    var symbols = isCustom ? (opts.symbols || "") : null;
    var acc = { results: [], near: [], insufficient: [], failed: [], total: 0, scannedAt: new Date().toISOString() };
    var offset = 0, guard = 0;
    while (guard++ < 60) {
      if (state.cancel) break;
      var batch;
      try { batch = await fetchBatch(uniKey, offset, meta.limit || 6, symbols, !!opts.force); }
      catch (e) { acc.failed.push({ displaySymbol: "(batch " + offset + ")", errorMessage: String(e && e.message || e) }); break; }
      acc.total = batch.total || acc.total;
      ["results", "near", "insufficient", "failed"].forEach(function (k) { if (Array.isArray(batch[k])) acc[k] = acc[k].concat(batch[k]); });
      state.progress = { uniKey: uniKey, done: Math.min((batch.nextOffset != null ? batch.nextOffset : offset + (batch.scanned || 0)), acc.total || 0), total: acc.total || 0 };
      renderControls();
      if (batch.done || batch.nextOffset == null || batch.nextOffset <= offset) break;
      offset = batch.nextOffset;
    }
    // stamp the source universe on every row (for the combined buy view)
    ["results", "near"].forEach(function (k) { acc[k].forEach(function (r) { r._uni = uniKey; }); });
    return acc;
  }

  async function runScan(keys, force) {
    if (state.scanning) return;
    state.scanning = true; state.cancel = false;
    try {
      for (var i = 0; i < keys.length; i++) {
        if (state.cancel) break;
        var key = keys[i];
        state.progress = { uniKey: key, done: 0, total: 0 };
        renderControls();
        if (key === "CUSTOM_GLOBAL") {
          var syms = String((document.getElementById("scCustom") || {}).value || readCustom()).trim();
          writeCustom(syms);
          if (!syms) { delete state.data.CUSTOM_GLOBAL; continue; }
          state.data.CUSTOM_GLOBAL = await scanUniverse("CUSTOM_GLOBAL", { symbols: syms.replace(/[\s,]+/g, ","), force: force });
        } else {
          state.data[key] = await scanUniverse(key, { force: force });
        }
        writeResults();
        render(); // progressive: show each universe as it lands
      }
    } finally {
      state.scanning = false; state.progress = null;
      writeResults();
      render();
    }
  }

  // ---------------------------------------------------------- views
  function render() {
    var root = document.getElementById(ROOT_ID);
    if (!root) return;
    var html = "";
    html += controlsSection();
    html += buySection();
    html += nearSection();
    UNIVERSES.concat(state.data.CUSTOM_GLOBAL ? [{ key: "CUSTOM_GLOBAL", icon: "✏️", label: "Custom symbols", short: "Custom" }] : []).forEach(function (u) {
      html += universeSection(u);
    });
    html += '<div class="sc-method">🔎 สัญญาณจากกฎเดิมของระบบ: <b>EMA12 ตัดขึ้น EMA26 ภายใน 3 วัน</b> + วอลุ่มเทียบเฉลี่ย 5 วัน + สถานะ SMA200 · ประมวลผลฝั่งเซิร์ฟเวอร์ (Yahoo, cache รายวัน) · หุ้นนอกสแกนจาก "ตัวแม่" ของ DR ไทย (ราคา DR จริงบน SET อาจต่างเล็กน้อย) · ข้อมูลเพื่อประกอบการตัดสินใจ ไม่ใช่คำแนะนำซื้อขาย</div>';
    root.innerHTML = html;
    wire(root);
  }

  function controlsSection() {
    var p = state.progress;
    var pctBar = "";
    if (state.scanning && p) {
      var meta = uniMeta(p.uniKey);
      var pct = p.total > 0 ? Math.round(p.done / p.total * 100) : 5;
      pctBar = '<div class="sc-progress"><div class="sc-progress-label">กำลังสแกน ' + meta.icon + " " + esc(meta.short) + " … " + (p.total ? p.done + "/" + p.total : "") + '</div>' +
        '<div class="sc-progress-bar"><i style="width:' + pct + '%"></i></div>' +
        '<button class="sc-btn sc-btn-ghost" id="scCancel">หยุด</button></div>';
    }
    var stamps = UNIVERSES.map(function (u) {
      var d = state.data[u.key];
      return '<span class="sc-stamp">' + u.icon + " " + (d ? esc(timeAgo(d.scannedAt)) : "ยังไม่สแกน") + "</span>";
    }).join("");
    return '<section class="sc-hero">' +
      '<div class="sc-hero-top"><div><h1 class="sc-title">🔎 Market Scanner</h1>' +
      '<p class="sc-sub">สแกนหาสัญญาณซื้อ (EMA ตัดขึ้น + วอลุ่มยืนยัน) — หุ้นไทย · หุ้นนอกที่มี DR ไทย · Crypto</p></div>' +
      '<div class="sc-actions">' +
        '<button class="sc-btn sc-btn-primary" id="scScanAll"' + (state.scanning ? " disabled" : "") + '>▶ สแกนทั้งหมด</button>' +
        UNIVERSES.map(function (u) { return '<button class="sc-btn" data-scan="' + u.key + '"' + (state.scanning ? " disabled" : "") + '>' + u.icon + " " + esc(u.short) + "</button>"; }).join("") +
      '</div></div>' +
      '<div class="sc-customrow"><label>เพิ่ม symbol เอง (คั่นด้วยช่องว่าง เช่น <code>COIN PLTR 9988.HK DOT-USD GULF.BK</code>):</label>' +
      '<div class="sc-customline"><input id="scCustom" type="text" value="' + esc(readCustom()) + '" placeholder="COIN PLTR DOT-USD …" />' +
      '<button class="sc-btn" id="scScanCustom"' + (state.scanning ? " disabled" : "") + '>สแกน custom</button></div></div>' +
      '<div class="sc-stamps">' + stamps + "</div>" +
      pctBar +
    '</section>';
  }

  function allRows(listKey) {
    var out = [];
    Object.keys(state.data).forEach(function (k) { var d = state.data[k]; if (d && Array.isArray(d[listKey])) out = out.concat(d[listKey]); });
    return out;
  }

  function buySection() {
    var rows = allRows("results").slice().sort(function (a, b) { return hotScore(b) - hotScore(a); });
    var body;
    if (!Object.keys(state.data).length) body = '<div class="sc-empty">กด <b>▶ สแกนทั้งหมด</b> เพื่อเริ่มค้นหาสัญญาณซื้อ</div>';
    else if (!rows.length) body = '<div class="sc-empty">ยังไม่พบสัญญาณซื้อ (EMA ตัดขึ้น ≤ 3 วัน) จากการสแกนล่าสุด — ดูรายการ "ใกล้ตัดขึ้น" ด้านล่างประกอบ</div>';
    else body = '<div class="sc-grid">' + rows.map(function (r) { return signalCard(r, true); }).join("") + "</div>";
    return '<section class="sc-block"><div class="sc-block-head"><h2>🔔 สัญญาณซื้อที่พบ</h2>' +
      '<span class="sc-block-sub">EMA12 ตัดขึ้น EMA26 ใน 3 วันล่าสุด · เรียงตามความแรง (วอลุ่ม → ความสด → เหนือ SMA200)</span>' +
      (rows.length ? '<span class="sc-count-pill">' + rows.length + '</span>' : "") + "</div>" + body + "</section>";
  }

  function nearSection() {
    var rows = allRows("near").slice().sort(function (a, b) { return (num(a.emaGapPct) || 99) - (num(b.emaGapPct) || 99); });
    if (!rows.length) return "";
    return '<section class="sc-block"><div class="sc-block-head"><h2>⏳ ใกล้ตัดขึ้น</h2>' +
      '<span class="sc-block-sub">EMA12 ยังต่ำกว่า EMA26 แต่ห่าง ≤ 0.5% — จับตารอวันตัดจริง</span>' +
      '<span class="sc-count-pill">' + rows.length + '</span></div>' +
      '<div class="sc-grid">' + rows.map(function (r) { return signalCard(r, false); }).join("") + "</div></section>";
  }

  function signalCard(r, isBuy) {
    var u = uniMeta(r._uni);
    var days = num(r.daysSinceCrossover);
    var volLabel = r.volumeConfirmationThai || (r.volumeRatio != null ? ("วอลุ่ม " + r.volumeRatio + "×") : "");
    var volCls = /VERY_STRONG|STRONG/.test(r.volumeConfirmation || "") ? "sc-vol-strong" : (r.volumeConfirmation === "VOLUME_CONFIRMED" ? "sc-vol-ok" : "sc-vol-weak");
    var smaCls = r.sma200Status === "ABOVE_SMA200" ? "sc-sma-above" : r.sma200Status === "BELOW_SMA200" ? "sc-sma-below" : "";
    var smaTxt = r.sma200Status === "ABOVE_SMA200" ? "เหนือ SMA200" : r.sma200Status === "BELOW_SMA200" ? "ใต้ SMA200" : "SMA200 —";
    return '<div class="sc-card' + (isBuy ? " sc-card-buy" : "") + '">' +
      '<div class="sc-card-top"><b class="sc-sym">' + esc(r.displaySymbol) + '</b>' +
      '<span class="sc-uni">' + u.icon + " " + esc(u.short) + (r.drNote ? " · DR: " + esc(r.drNote) : "") + '</span>' +
      '<span class="sc-close">' + fmtClose(r.close) + '</span></div>' +
      '<div class="sc-card-name">' + esc(r.name || "") + '</div>' +
      '<div class="sc-card-tags">' +
        '<span class="sc-tag ' + (isBuy ? "sc-tag-buy" : "sc-tag-near") + '">' + (isBuy ? "✚ " + esc(r.signalThai || "EMA ตัดขึ้น") + (days != null ? " · " + (days <= 1 ? "วันนี้/เมื่อวาน" : days + " วันก่อน") : "") : "⏳ " + esc(r.signalThai || "ใกล้ตัดขึ้น") + (r.emaGapPct != null ? " · ห่าง " + r.emaGapPct + "%" : "")) + '</span>' +
        (volLabel ? '<span class="sc-tag ' + volCls + '">' + esc(volLabel) + "</span>" : "") +
        '<span class="sc-tag ' + smaCls + '">' + smaTxt + "</span>" +
      "</div>" +
      (r.action ? '<div class="sc-card-action">' + esc(r.action) + "</div>" : "") +
    "</div>";
  }

  function universeSection(u) {
    var d = state.data[u.key];
    if (!d) return "";
    var okCount = (d.results || []).length, nearCount = (d.near || []).length;
    var probs = (d.insufficient || []).length + (d.failed || []).length;
    var rows = (d.results || []).concat(d.near || []);
    var table = rows.length
      ? '<table class="sc-tbl"><thead><tr><th>Symbol</th><th>ราคา</th><th>สัญญาณ</th><th>ตัดเมื่อ</th><th>วอลุ่ม</th><th>SMA200</th></tr></thead><tbody>' +
        rows.map(function (r) {
          return "<tr><td><b>" + esc(r.displaySymbol) + "</b>" + (r.drNote ? ' <span class="sc-dr">' + esc(r.drNote) + "</span>" : "") + "</td>" +
            "<td>" + fmtClose(r.close) + "</td>" +
            '<td class="' + (r.signal === "EMA_BULLISH_CROSS" ? "sc-td-buy" : "sc-td-near") + '">' + esc(r.signalThai || r.signal) + "</td>" +
            "<td>" + (r.crossoverDate ? esc(String(r.crossoverDate).slice(0, 10)) : (r.emaGapPct != null ? "ห่าง " + r.emaGapPct + "%" : "—")) + "</td>" +
            "<td>" + (r.volumeRatio != null ? r.volumeRatio + "×" : "—") + "</td>" +
            "<td>" + (r.sma200Status === "ABOVE_SMA200" ? "✓ เหนือ" : r.sma200Status === "BELOW_SMA200" ? "✗ ใต้" : "—") + "</td></tr>";
        }).join("") + "</tbody></table>"
      : '<div class="sc-empty">ไม่พบสัญญาณในกลุ่มนี้</div>';
    var probsHtml = probs
      ? '<details class="sc-probs"><summary>ข้อมูลไม่พอ/ล้มเหลว ' + probs + " รายการ</summary>" +
        (d.insufficient || []).map(function (x) { return '<div class="sc-prob">' + esc(x.displaySymbol) + " — " + esc(x.reason || "ข้อมูลไม่พอ") + "</div>"; }).join("") +
        (d.failed || []).map(function (x) { return '<div class="sc-prob">' + esc(x.displaySymbol) + " — " + esc(String(x.errorMessage || "ดึงข้อมูลไม่ได้").slice(0, 80)) + "</div>"; }).join("") +
        "</details>"
      : "";
    return '<details class="sc-uni-sec"' + (okCount ? " open" : "") + '><summary>' + u.icon + " <b>" + esc(u.label) + "</b>" +
      '<span class="sc-uni-counts">สแกน ' + (d.total || rows.length) + " · ซื้อ " + okCount + " · ใกล้ตัด " + nearCount + " · " + esc(timeAgo(d.scannedAt)) + "</span></summary>" +
      table + probsHtml + "</details>";
  }

  // ---------------------------------------------------------- wiring
  function renderControls() {
    // cheap partial re-render for progress updates during a scan
    var root = document.getElementById(ROOT_ID);
    if (!root) return;
    var hero = root.querySelector(".sc-hero");
    if (!hero) { render(); return; }
    var tmp = document.createElement("div");
    tmp.innerHTML = controlsSection();
    hero.replaceWith(tmp.firstChild);
    wireControls(root);
  }

  function wireControls(root) {
    var all = root.querySelector("#scScanAll");
    if (all) all.addEventListener("click", function () { runScan(UNIVERSES.map(function (u) { return u.key; }).concat(readCustom().trim() ? ["CUSTOM_GLOBAL"] : []), true); });
    root.querySelectorAll("[data-scan]").forEach(function (b) {
      b.addEventListener("click", function () { runScan([b.getAttribute("data-scan")], true); });
    });
    var custom = root.querySelector("#scScanCustom");
    if (custom) custom.addEventListener("click", function () { runScan(["CUSTOM_GLOBAL"], true); });
    var cancel = root.querySelector("#scCancel");
    if (cancel) cancel.addEventListener("click", function () { state.cancel = true; });
    var input = root.querySelector("#scCustom");
    if (input) input.addEventListener("change", function () { writeCustom(input.value); });
  }

  function wire(root) { wireControls(root); }

  // ---------------------------------------------------------- boot
  function init() { render(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();

  window.ScannerPage = { render: render, hotScore: hotScore };
  if (typeof module !== "undefined" && module.exports) module.exports = { hotScore: hotScore };
})();
