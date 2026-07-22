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
  var expanded = {};          // bucket accordion state (per session)

  // Manual per-bucket placements (Portfolio-Position overlay, localStorage). Lets the
  // SAME ticker sit in several buckets as separate line items — not possible in the
  // shared holdings store (DB keys on canonical_symbol). Signal uses the base ticker.
  var MANUAL_KEY = "pp_bucket_items_v1";
  var manualBucket = null;    // bucket key while the modal edits a manual overlay item
  var editingItemId = null;   // overlay item id being edited (null = adding)
  function readBucketItems() { try { return JSON.parse(window.localStorage.getItem(MANUAL_KEY) || "{}") || {}; } catch (e) { return {}; } }
  function writeBucketItems(o) { try { window.localStorage.setItem(MANUAL_KEY, JSON.stringify(o || {})); } catch (e) {} }
  function newItemId() { return "m" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4); }
  var editingSymbol = "";
  var assetOptions = [];
  var psCache = null, psTried = false;   // pre-Load /api/portfolio fallback
  var holdingsTried = false;

  var BUCKET_OPTIONS = [
    ["", "ไม่ระบุ"],
    ["bitcoin", "Bitcoin"], ["foreign-stock", "หุ้นต่างประเทศ"], ["thai-stock", "หุ้นไทย"],
    ["provident-fund", "เงินสำรองเลี้ยงชีพ"], ["rmf-jang", "RMF-จัง"], ["rmf-tum", "RMF-ตุ๋ม"],
    ["cash", "เงินสด"], ["custom", "อื่นๆ"]
  ];
  // 4-asset composition menu for the per-bucket "+ เพิ่ม" flow (mirrors engine ASSET_MODEL)
  var ASSET_MENU = [
    ["bitcoin", "Bitcoin (BTC)"], ["qqqm", "QQQM · Nasdaq 100"],
    ["set50", "SET50 · หุ้นไทย"], ["cash", "เงินสด (Cash)"]
  ];

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

    var hasScoring = !!(readSnapshot() && readSnapshot().scoring && readSnapshot().scoring.bySymbol);
    var html = "";
    html += summaryStrip(R);
    if (!hasScoring) html += '<div class="pp-banner">📡 ยังไม่มีข้อมูลสัญญาณใน Snapshot — กด <b>Load Latest Data</b> มุมขวาบน เพื่อดูสภาวะของสินทรัพย์แต่ละตัว</div>';
    html += allocationBar(R);
    html += bucketBoard(R);
    html += traysSection(R);
    html += methodologyNote(R);
    html += modalHtml();
    root.innerHTML = html;
    wire(root, R);
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
    return '<section class="pp-hero"><div class="pp-hero-inner">' +
      '<div class="pp-hero-head"><div><h1 class="pp-title">📊 Portfolio Position</h1>' +
      '<p class="pp-sub">ไตรมาส <b>' + esc(R.quarterKey) + '</b> · ' + T.assetCount + " รายการใน Quarterly Editor" + (ago ? " · อัปเดต " + esc(ago) : "") + '</p></div></div>' +
      '<div class="pp-stats">' +
        '<div class="pp-stat"><div class="pp-stat-n">' + thb(T.total) + '</div><div class="pp-stat-l">ความมั่งคั่งรวม</div>' + (qoq ? '<div class="pp-stat-s ' + (T.qoq.thb >= 0 ? "pp-up" : "pp-down") + '">QoQ ' + esc(qoq) + "</div>" : '<div class="pp-stat-s">ยังไม่มีไตรมาสก่อนหน้า</div>') + '</div>' +
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

  // -------------------------------------------------- 3 · bucket board
  function bucketBoard(R) {
    var cards = R.buckets.map(function (b) { return bucketCard(b); }).join("");
    return '<section class="pp-block"><div class="pp-block-head"><h2>ก้อนสินทรัพย์</h2><span class="pp-block-sub">คลิกการ์ดเพื่อดูไส้ในและสภาวะรายตัว</span></div>' +
      '<div class="pp-board">' + cards + "</div></section>";
  }

  function signalBar(sig) {
    if (!sig || sig.health == null) {
      return '<div class="pp-sig pp-sig-none"><span class="pp-sig-label">' + esc(sig ? sig.thai : "ไม่มีข้อมูลสัญญาณ") + "</span></div>";
    }
    var tone = sig.health >= 60 ? "pp-sig-bull" : sig.health >= 40 ? "pp-sig-mid" : "pp-sig-bear";
    var cnt = sig.counts && (sig.counts.bull + sig.counts.neutral + sig.counts.bear) > 1
      ? ' · <span class="pp-sig-counts">Bullish ' + sig.counts.bull + " · กลาง " + sig.counts.neutral + " · อ่อน " + sig.counts.bear + "</span>" : "";
    return '<div class="pp-sig ' + tone + '">' +
      '<span class="pp-sig-track"><i style="width:' + sig.health + '%"></i></span>' +
      '<span class="pp-sig-val">' + sig.health + "/100</span>" +
      '<span class="pp-sig-label">' + esc(sig.thai) + cnt + "</span></div>";
  }

  function bucketCard(b) {
    var isOpen = !!expanded[b.type];
    var qoq = b.qoq ? '<span class="pp-chip ' + (b.qoq.thb >= 0 ? "pp-up" : "pp-down") + '">QoQ ' + (b.qoq.thb >= 0 ? "+" : "") + thb(b.qoq.thb).replace("฿", "") + (b.qoq.pct != null ? " (" + (b.qoq.pct >= 0 ? "+" : "") + b.qoq.pct + "%)" : "") + "</span>" : "";
    var noQ = b.noQuarterRow ? '<span class="pp-chip pp-warn" title="มีไส้ใน (Holdings) แต่ยังไม่มีก้อนนี้ใน Quarterly Editor">ยังไม่อยู่ใน Quarterly</span>' : "";
    var inv = b.type === "cash" ? "" : '<span class="pp-chip">ลงทุนจริง ' + pct(b.investedPct, 0) + "</span>";
    return '<div class="pp-card' + (isOpen ? " is-open" : "") + '" data-bucket="' + esc(b.type) + '">' +
      '<button class="pp-card-head" data-toggle="' + esc(b.type) + '">' +
        '<span class="pp-dot" style="background:' + b.color + '"></span>' +
        '<span class="pp-card-title">' + esc(b.label) + '</span>' +
        '<span class="pp-card-val">' + thb(b.gross) + '</span>' +
        '<span class="pp-card-pct">' + pct(b.pct) + '</span>' +
        '<span class="pp-caret">' + (isOpen ? "▲" : "▼") + '</span>' +
      '</button>' +
      '<div class="pp-card-meta">' + inv + qoq + noQ + "</div>" +
      signalBar(b.signal) +
      (isOpen ? drilldown(b) : "") +
    "</div>";
  }

  // -------------------------------------------------- 4 · drill-down
  function drilldown(b) {
    var out = '<div class="pp-drill">';
    if (b.quarterAssets && b.quarterAssets.length > 1) {
      out += '<div class="pp-drill-lbl">รายการใน Quarterly Editor</div>';
      out += b.quarterAssets.map(function (a) {
        return '<div class="pp-qrow"><span>' + esc(a.name) + '</span><span>' + thb(a.gross) + ' · ' + pct(a.pct) + (a.investedPct ? " · ลงทุน " + pct(a.investedPct, 0) : "") + "</span></div>";
      }).join("");
    }
    out += '<div class="pp-drill-lbl">ไส้ใน (Holdings) ' + (b.tickers.length ? b.tickers.length + " ตัว" : "") + "</div>";
    if (!b.tickers.length) {
      out += '<div class="pp-muted">ยังไม่ระบุไส้ในของก้อนนี้ — เพิ่มสินทรัพย์ (Bitcoin / QQQM / SET50 / Cash) เป็น % เพื่อคำนวณภาพรวมของก้อน</div>';
    } else {
      out += b.tickers.map(tickerRow).join("");
    }
    out += '<button class="pp-add-btn" data-add-bucket="' + esc(b.type) + '">+ เพิ่มสินทรัพย์ในก้อนนี้ (BTC / QQQM / SET50 / Cash · %)</button>';
    out += "</div>";
    return out;
  }

  function tickerRow(t) {
    var sc = t.scoring;
    var state = sc
      ? '<span class="pp-t-state" style="color:' + esc(sc.color || "") + '">' + esc(sc.thaiSignalLabel) + (sc.signalScore != null ? " · " + sc.signalScore + "/100" : "") + '</span>' +
        (sc.thaiFinalAction ? '<span class="pp-t-act">' + esc(sc.thaiFinalAction) + "</span>" : "")
      : '<span class="pp-t-state pp-muted">รอข้อมูล — กด Load Latest Data</span>';
    var warn = sc && sc.warnings && sc.warnings.length ? '<span class="pp-t-warn" title="' + esc(sc.warnings.join(" · ")) + '">⚠ ' + esc(sc.warnings[0]) + "</span>" : "";
    var w3 = t.wave3 ? '<span class="pp-t-w3 pp-w3-' + esc(String(t.wave3.status || "").toLowerCase()) + '" title="Wave 3 Readiness">🌊 ' + esc(t.wave3.status) + " " + (t.wave3.readiness != null ? t.wave3.readiness : "") + "</span>" : "";
    var notes = t.notes ? '<div class="pp-t-notes">📝 ' + esc(t.notes) + "</div>" : "";
    var actions = t.manual
      ? '<button class="pp-mini" data-edit-item="' + esc(t.itemId) + '" data-item-bucket="' + esc(t.bucket) + '">แก้ไข</button><button class="pp-mini pp-mini-danger" data-delete-item="' + esc(t.itemId) + '" data-item-bucket="' + esc(t.bucket) + '">ลบ</button>'
      : '<button class="pp-mini" data-edit="' + esc(t.symbol) + '">แก้ไข</button><button class="pp-mini pp-mini-danger" data-delete="' + esc(t.symbol) + '">ลบ</button>';
    var manualTag = t.manual ? '<span class="pp-t-manual" title="เพิ่มเข้าก้อนนี้เอง (แยกต่อก้อน)">เพิ่มเอง</span>' : "";
    // composition items show % held (+ normalised share of the bucket when it differs); regular holdings show THB
    var valCell = t.percent != null
      ? pct(t.percent) + " ที่ถือ" + (t.weightInBucket != null && Math.abs(t.weightInBucket - t.percent) > 0.1 ? '<span class="pp-t-w">' + pct(t.weightInBucket) + " ของก้อน</span>" : "")
      : thb(t.marketValue) + (t.weightInBucket != null ? '<span class="pp-t-w">' + pct(t.weightInBucket) + " ของก้อน</span>" : "");
    return '<div class="pp-trow' + (t.manual ? " pp-trow-manual" : "") + '" data-symbol="' + esc(t.symbol) + '">' +
      '<div class="pp-t-id"><b>' + esc(t.displaySymbol) + '</b>' + manualTag + '<span class="pp-t-name">' + esc(t.name) + "</span></div>" +
      '<div class="pp-t-val">' + valCell + "</div>" +
      '<div class="pp-t-sig">' + state + warn + w3 + "</div>" +
      '<div class="pp-t-actions">' + actions + "</div>" +
      notes +
    "</div>";
  }

  // -------------------------------------------------- 5 · trays
  function traysSection(R) {
    var out = "";
    if (R.unassigned.length) {
      var opts = BUCKET_OPTIONS.map(function (o) { return '<option value="' + o[0] + '">' + esc(o[1]) + "</option>"; }).join("");
      out += '<section class="pp-block pp-tray"><div class="pp-block-head"><h2>⚠️ ยังไม่ระบุ bucket (' + R.unassigned.length + ')</h2><span class="pp-block-sub">เลือกก้อนให้ ticker เหล่านี้ เพื่อรวมเข้าการวิเคราะห์ (จำเป็นสำหรับ RMF: ระบบแยก RMF-จัง / RMF-ตุ๋ม เองไม่ได้)</span></div>' +
        R.unassigned.map(function (t) {
          return '<div class="pp-trow"><div class="pp-t-id"><b>' + esc(t.displaySymbol) + '</b><span class="pp-t-name">' + esc(t.name) + '</span></div>' +
            '<div class="pp-t-val">' + thb(t.marketValue) + '</div>' +
            '<div class="pp-t-sig"><select class="pp-select" data-assign="' + esc(t.symbol) + '">' + opts + "</select></div>" +
            '<div class="pp-t-actions"><button class="pp-mini" data-edit="' + esc(t.symbol) + '">แก้ไข</button></div></div>';
        }).join("") + "</section>";
    }
    if (R.watchlistOnly.length) {
      var open = !!expanded.__watchlist;
      out += '<section class="pp-block pp-tray"><button class="pp-tray-toggle" data-toggle-watchlist>👁️ Watchlist — ไม่ได้ถือ (' + R.watchlistOnly.length + ") " + (open ? "▲" : "▼") + "</button>" +
        (open ? R.watchlistOnly.map(tickerRow).join("") : "") + "</section>";
    }
    return out;
  }

  function methodologyNote(R) {
    var proxy = R.meta.proxyBuckets.length
      ? " · ก้อนที่ยังไม่ระบุไส้ใน (" + R.meta.proxyBuckets.map(function (t) { return esc((window.PortfolioPosition.Q_TYPES[t] || {}).label || t); }).join(", ") + ") แสดงสภาวะอิงดัชนีตลาดแทน"
      : "";
    return '<div class="pp-method">📌 หน้านี้แสดง<b>ข้อเท็จจริง</b>ของพอร์ต ไม่ใช่คำแนะนำซื้อขาย/โยกเงิน · มูลค่าและสัดส่วนมาจาก <a href="/">Quarterly Editor</a> (เงินจริงของคุณ) · ' +
      'สภาวะรายตัวมาจาก indicator เดิมของระบบ (EMA12/26 · SMA200 · RSI · Volume · Wave 3)' + proxy + " · สัญญาณคำนวณตอน Load Latest Data เท่านั้น</div>";
  }

  // ============================================================ modal (CRUD)
  function modalHtml() {
    var bucketOpts = BUCKET_OPTIONS.map(function (o) { return '<option value="' + o[0] + '">' + esc(o[1]) + "</option>"; }).join("");
    var assetOpts = ASSET_MENU.map(function (o) { return '<option value="' + o[0] + '">' + esc(o[1]) + "</option>"; }).join("");
    return '<div class="pp-modal-back" id="ppModal" aria-hidden="true">' +
      '<div class="pp-modal" role="dialog" aria-modal="true">' +
        '<div class="pp-modal-head"><div><div class="pp-modal-kicker" id="ppModalKicker">เพิ่มรายการ</div><h3 id="ppModalTitle">เพิ่ม ticker เข้าไส้ในพอร์ต</h3></div>' +
        '<button class="pp-mini" id="ppModalClose" type="button">✕</button></div>' +
        '<form id="ppForm">' +
          '<input type="hidden" id="ppMode" value="add" />' +
          '<input type="hidden" id="ppSymbol" /><input type="hidden" id="ppName" /><input type="hidden" id="ppAssetType" />' +
          // ---- 4-asset composition fields (per-bucket add) ----
          '<div id="ppManualFields" style="display:none">' +
            '<div class="pp-f-row">' +
              '<div><label class="pp-f-label" for="ppAsset">สินทรัพย์</label><select class="pp-input" id="ppAsset">' + assetOpts + "</select></div>" +
              '<div><label class="pp-f-label" for="ppPercent">สัดส่วนที่ถือ (%) <span class="pp-f-hint">ใส่อิสระ ระบบ normalize ให้</span></label><input class="pp-input" id="ppPercent" type="number" min="0" max="100" step="any" placeholder="เช่น 40" /></div>' +
            '</div>' +
          '</div>' +
          // ---- free-ticker fields (edit existing holdings) ----
          '<div id="ppRegularFields">' +
            '<label class="pp-f-label" for="ppSearch">Symbol <span class="pp-f-hint" id="ppAssetHelp">เลือกจาก AI Boom Universe หรือพิมพ์เองได้ (เช่น NVDA, GULF.BK, BTCUSD)</span></label>' +
            '<input class="pp-input" id="ppSearch" list="ppAssetOptions" autocomplete="off" placeholder="พิมพ์ symbol..." />' +
            '<datalist id="ppAssetOptions"></datalist>' +
            '<div class="pp-f-row">' +
              '<div><label class="pp-f-label" for="ppMarketValue">มูลค่าปัจจุบัน (THB)</label><input class="pp-input" id="ppMarketValue" type="number" min="0" step="any" placeholder="เช่น 250000" /></div>' +
              '<div><label class="pp-f-label" for="ppStatus">สถานะ</label><select class="pp-input" id="ppStatus"><option value="holding">ถืออยู่ (Holding)</option><option value="watchlist">แค่ติดตาม (Watchlist)</option></select></div>' +
            '</div>' +
          '</div>' +
          '<div class="pp-f-row">' +
            '<div><label class="pp-f-label" for="ppBucket">ก้อน (ตามประเภทใน Quarterly Editor)</label><select class="pp-input" id="ppBucket">' + bucketOpts + "</select></div>" +
            '<div><label class="pp-f-label" for="ppNotes">Notes</label><input class="pp-input" id="ppNotes" placeholder="บันทึกสั้น ๆ เช่น DCA รายเดือน" /></div>' +
          '</div>' +
          '<div class="pp-modal-feedback" id="ppFeedback"></div>' +
          '<div class="pp-modal-actions"><button type="button" class="pp-btn" id="ppCancel">ยกเลิก</button><button type="submit" class="pp-btn pp-btn-primary" id="ppSave">บันทึก</button></div>' +
        '</form>' +
      "</div></div>";
  }

  function input(id) { return document.getElementById(id); }
  function setFeedback(msg, tone) {
    var el = input("ppFeedback"); if (!el) return;
    el.textContent = msg || ""; el.className = "pp-modal-feedback" + (tone ? " " + tone : "");
  }

  // ---- AI Boom datalist options (seed + user additions) ----
  function buildAssetOptions() {
    var seed = (window.AIBoomUniverseSeed && window.AIBoomUniverseSeed.ai_boom_universe) || [];
    var toOption = function (a) {
      var canonical = core.canonicalSymbolFromTicker(a && a.ticker);
      if (!canonical) return null;
      return {
        canonicalSymbol: canonical,
        displaySymbol: core.displaySymbolForCanonical(canonical),
        assetName: (a && a.name) || canonical,
        assetType: core.detectAssetType(canonical, (a && a.asset_type) || "")
      };
    };
    var raw = seed.map(toOption).filter(Boolean);
    try {
      window.fetch("/api/ai-universe", { cache: "no-store" })
        .then(function (r) { return r && r.ok ? r.json() : null; })
        .then(function (j) {
          var extra = (j && j.data && Array.isArray(j.data.userAssets) ? j.data.userAssets : []).map(toOption).filter(Boolean);
          finishOptions(raw.concat(extra));
        })
        .catch(function () { finishOptions(raw); });
    } catch (e) { finishOptions(raw); }
  }
  function finishOptions(list) {
    var seen = {};
    assetOptions = list.filter(function (o) { if (seen[o.canonicalSymbol]) return false; seen[o.canonicalSymbol] = 1; return true; })
      .sort(function (a, b) { return a.displaySymbol.localeCompare(b.displaySymbol); });
    renderDatalist();
  }
  function renderDatalist() {
    var dl = input("ppAssetOptions"); if (!dl) return;
    dl.innerHTML = assetOptions.map(function (o) { return '<option value="' + esc(o.displaySymbol) + '">' + esc(o.displaySymbol + " - " + o.assetName) + "</option>"; }).join("");
  }
  function findOption(rawText) {
    var text = String(rawText || "").split(" - ")[0].trim().toUpperCase();
    var canonical = core.canonicalSymbolFromTicker(text);
    for (var i = 0; i < assetOptions.length; i++) {
      var o = assetOptions[i];
      if (o.canonicalSymbol === canonical || o.displaySymbol.toUpperCase() === text) return o;
    }
    return null;
  }
  function applySelection() {
    var o = findOption(input("ppSearch").value);
    if (!o) return;
    input("ppSymbol").value = o.canonicalSymbol;
    input("ppName").value = o.assetName;
    input("ppAssetType").value = o.assetType;
    if (!input("ppBucket").value) {
      var auto = window.PortfolioPosition.bucketForHolding({ assetType: o.assetType, portfolioBucket: "" });
      if (auto) input("ppBucket").value = auto;
    }
  }

  // ---- open/close + save/delete/assign ----
  function setFieldMode(manual) {
    var mf = input("ppManualFields"), rf = input("ppRegularFields");
    if (mf) mf.style.display = manual ? "" : "none";
    if (rf) rf.style.display = manual ? "none" : "";
  }

  function openModal(mode, holding, presetBucket) {
    var back = input("ppModal"); if (!back) return;
    manualBucket = null; editingItemId = null; setFieldMode(false);
    var bsel0 = input("ppBucket"); if (bsel0) bsel0.disabled = false;
    editingSymbol = mode === "edit" && holding ? holding.canonicalSymbol : "";
    input("ppMode").value = mode;
    input("ppModalKicker").textContent = mode === "edit" ? "แก้ไขรายการ" : "เพิ่มรายการ";
    input("ppModalTitle").textContent = mode === "edit" ? "แก้ไข " + (holding ? holding.displaySymbol || holding.canonicalSymbol : "") : "เพิ่ม ticker เข้าไส้ในพอร์ต";
    setFeedback("");
    input("ppForm").reset();
    input("ppSearch").disabled = mode === "edit";
    if (mode === "edit" && holding) {
      input("ppSearch").value = (holding.displaySymbol || holding.canonicalSymbol) + " - " + (holding.assetName || "");
      input("ppSymbol").value = holding.canonicalSymbol;
      input("ppName").value = holding.assetName || holding.canonicalSymbol;
      input("ppAssetType").value = holding.assetType || "";
      input("ppMarketValue").value = Number.isFinite(holding.marketValue) && holding.marketValue > 0 ? holding.marketValue : "";
      input("ppStatus").value = holding.isHolding ? "holding" : "watchlist";
      input("ppNotes").value = holding.notes || "";
      var b = window.PortfolioPosition.bucketForHolding(holding);
      input("ppBucket").value = (window.PortfolioPosition.BUCKET_KEYS.indexOf(holding.portfolioBucket) >= 0) ? holding.portfolioBucket : (b || "");
    } else {
      input("ppBucket").value = presetBucket || "";
      window.setTimeout(function () { input("ppSearch").focus(); }, 50);
    }
    back.classList.add("is-open");
    back.setAttribute("aria-hidden", "false");
  }
  function closeModal() {
    var back = input("ppModal"); if (!back) return;
    back.classList.remove("is-open");
    back.setAttribute("aria-hidden", "true");
    editingSymbol = ""; manualBucket = null; editingItemId = null;
    var bsel = input("ppBucket"); if (bsel) bsel.disabled = false;
  }

  // ---- 4-asset composition per bucket: open / save / edit / delete ----
  function assetLabel(key) { for (var i = 0; i < ASSET_MENU.length; i++) if (ASSET_MENU[i][0] === key) return ASSET_MENU[i][1]; return key; }
  function openManualModal(bucket, item) {
    var back = input("ppModal"); if (!back) return;
    manualBucket = bucket; editingItemId = item ? item.id : null;
    input("ppMode").value = "add";
    setFeedback("");
    input("ppForm").reset();
    setFieldMode(true);
    var lbl = (window.PortfolioPosition.Q_TYPES[bucket] || {}).label || bucket;
    input("ppModalKicker").textContent = (item ? "แก้ไขในก้อน · " : "เพิ่มเข้าก้อน · ") + lbl;
    input("ppModalTitle").textContent = item ? "แก้ไขสัดส่วนในก้อน " + lbl : "เพิ่มสินทรัพย์เข้าก้อน " + lbl + " (เลือกจาก 4 ก้อน · ใส่ % ที่ถือ)";
    input("ppBucket").value = bucket;
    input("ppBucket").disabled = true;
    if (item) {
      input("ppAsset").value = item.asset || "bitcoin";
      input("ppPercent").value = Number.isFinite(item.percent) ? item.percent : "";
      input("ppNotes").value = item.notes || "";
    } else {
      input("ppAsset").value = "bitcoin";
      window.setTimeout(function () { input("ppPercent").focus(); }, 50);
    }
    back.classList.add("is-open"); back.setAttribute("aria-hidden", "false");
  }
  function saveManualItem() {
    var asset = input("ppAsset").value;
    if (ASSET_MENU.every(function (o) { return o[0] !== asset; })) { setFeedback("กรุณาเลือกสินทรัพย์", "is-error"); return; }
    var p = Number(input("ppPercent").value);
    if (!Number.isFinite(p) || p < 0) { setFeedback("กรุณาใส่สัดส่วน % ที่ถือ (0 ขึ้นไป)", "is-error"); return; }
    var items = readBucketItems();
    var list = items[manualBucket] || (items[manualBucket] = []);
    // one line per asset per bucket — same asset can still sit in OTHER buckets
    if (list.some(function (x) { return x.asset === asset && x.id !== editingItemId; })) {
      setFeedback(assetLabel(asset) + " มีอยู่ในก้อนนี้แล้ว — แก้ไขรายการเดิม", "is-error"); return;
    }
    var payload = { asset: asset, percent: p, notes: input("ppNotes").value || "" };
    if (editingItemId) {
      var idx = list.findIndex(function (x) { return x.id === editingItemId; });
      if (idx >= 0) list[idx] = Object.assign({ id: editingItemId }, list[idx], payload); else { payload.id = newItemId(); list.push(payload); }
    } else { payload.id = newItemId(); list.push(payload); }
    writeBucketItems(items); closeModal(); render();
  }
  function deleteBucketItem(bucket, id) {
    if (!window.confirm("ลบรายการนี้ออกจากก้อน?")) return;
    var items = readBucketItems();
    if (items[bucket]) { items[bucket] = items[bucket].filter(function (x) { return x.id !== id; }); if (!items[bucket].length) delete items[bucket]; }
    writeBucketItems(items); render();
  }
  function editBucketItem(bucket, id) {
    var item = (readBucketItems()[bucket] || []).find(function (x) { return x.id === id; });
    if (item) openManualModal(bucket, item);
  }

  async function saveFromForm() {
    if (manualBucket) { saveManualItem(); return; }   // per-bucket overlay item (may duplicate a ticker across buckets)
    var mode = input("ppMode").value === "edit" ? "edit" : "add";
    var holdings = getHoldingsArray();
    var symbol = mode === "edit" ? editingSymbol : (input("ppSymbol").value ? core.canonicalSymbolFromTicker(input("ppSymbol").value) : core.canonicalSymbolFromTicker(String(input("ppSearch").value || "").split(" - ")[0]));
    if (!symbol) { setFeedback("กรุณาเลือกหรือพิมพ์ symbol", "is-error"); return; }
    var mv = Number(input("ppMarketValue").value);
    var isHolding = input("ppStatus").value !== "watchlist";
    if (isHolding && (!Number.isFinite(mv) || mv <= 0)) { setFeedback("กรุณาใส่มูลค่าปัจจุบัน (THB)", "is-error"); return; }
    if (mode === "add" && holdings.some(function (h) { return h.canonicalSymbol === symbol; })) {
      setFeedback(symbol + " มีอยู่แล้ว — ใช้ปุ่มแก้ไขแทน", "is-error"); return;
    }
    var existing = holdings.find(function (h) { return h.canonicalSymbol === symbol; }) || {};
    // merge onto the existing record → hidden fields (targetWeight/quantity/averageCost/costValue/accountType) pass through untouched
    var next = core.normalizeHolding(Object.assign({}, existing, {
      canonicalSymbol: symbol,
      displaySymbol: existing.displaySymbol || core.displaySymbolForCanonical(symbol),
      assetName: input("ppName").value || existing.assetName || symbol,
      assetType: input("ppAssetType").value || existing.assetType || core.detectAssetType(symbol),
      isHolding: isHolding,
      watchlistOnly: !isHolding,
      marketValue: isHolding ? mv : 0,
      portfolioBucket: input("ppBucket").value || "",
      notes: input("ppNotes").value || "",
      updatedAt: new Date().toISOString()
    }));
    var nextList = holdings.filter(function (h) { return h.canonicalSymbol !== symbol; }).concat([next]);
    input("ppSave").disabled = true;
    try {
      await core.saveHoldings(nextList);   // PUT + snapshot update + "portfolio-holdings-updated" event → re-render
      closeModal();
    } catch (e) {
      setFeedback("บันทึกขึ้น server ไม่สำเร็จ (เก็บไว้ในเครื่องแล้ว): " + (e && e.message || ""), "is-warning");
      render(); // local write already happened inside saveHoldings
    } finally {
      var btn = input("ppSave"); if (btn) btn.disabled = false;
    }
  }

  async function deleteSymbol(symbol) {
    if (!window.confirm("ลบ " + symbol + " ออกจากไส้ในพอร์ต?")) return;
    try {
      var r = await window.fetch("/api/portfolio-holdings?symbol=" + encodeURIComponent(symbol), { method: "DELETE" });
      if (!r.ok) throw new Error("delete failed (" + r.status + ")");
    } catch (e) { /* fall through — local removal below keeps UI truthful */ }
    var nextList = getHoldingsArray().filter(function (h) { return h.canonicalSymbol !== symbol; });
    try { await core.saveHoldings(nextList); } catch (e2) { core.writeLocalHoldings(nextList); render(); }
  }

  async function assignBucket(symbol, bucket) {
    var holdings = getHoldingsArray();
    var target = holdings.find(function (h) { return h.canonicalSymbol === symbol; });
    if (!target) return;
    target.portfolioBucket = bucket;
    target.updatedAt = new Date().toISOString();
    try { await core.saveHoldings(holdings); } catch (e) { core.writeLocalHoldings(holdings); render(); }
  }

  // ============================================================ wiring
  function wire(root, R) {
    root.querySelectorAll("[data-toggle]").forEach(function (el) {
      el.addEventListener("click", function () { var k = el.getAttribute("data-toggle"); expanded[k] = !expanded[k]; render(); });
    });
    var wt = root.querySelector("[data-toggle-watchlist]");
    if (wt) wt.addEventListener("click", function () { expanded.__watchlist = !expanded.__watchlist; render(); });
    root.querySelectorAll("[data-add-bucket]").forEach(function (el) {
      el.addEventListener("click", function (e) { e.stopPropagation(); openManualModal(el.getAttribute("data-add-bucket")); });
    });
    root.querySelectorAll("[data-edit-item]").forEach(function (el) {
      el.addEventListener("click", function (e) { e.stopPropagation(); editBucketItem(el.getAttribute("data-item-bucket"), el.getAttribute("data-edit-item")); });
    });
    root.querySelectorAll("[data-delete-item]").forEach(function (el) {
      el.addEventListener("click", function (e) { e.stopPropagation(); deleteBucketItem(el.getAttribute("data-item-bucket"), el.getAttribute("data-delete-item")); });
    });
    root.querySelectorAll("[data-edit]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.stopPropagation();
        var sym = el.getAttribute("data-edit");
        var h = getHoldingsArray().find(function (x) { return x.canonicalSymbol === sym; });
        if (h) openModal("edit", h);
      });
    });
    root.querySelectorAll("[data-delete]").forEach(function (el) {
      el.addEventListener("click", function (e) { e.stopPropagation(); deleteSymbol(el.getAttribute("data-delete")); });
    });
    root.querySelectorAll("[data-assign]").forEach(function (el) {
      el.addEventListener("change", function () { if (el.value) assignBucket(el.getAttribute("data-assign"), el.value); });
    });
    // modal
    var back = input("ppModal");
    if (back) {
      back.addEventListener("click", function (e) { if (e.target === back) closeModal(); });
      input("ppModalClose").addEventListener("click", closeModal);
      input("ppCancel").addEventListener("click", closeModal);
      input("ppForm").addEventListener("submit", function (e) { e.preventDefault(); saveFromForm(); });
      input("ppSearch").addEventListener("change", applySelection);
      input("ppSearch").addEventListener("blur", applySelection);
      renderDatalist();
    }
  }

  // ============================================================ boot
  function init() {
    buildAssetOptions();
    render();
    ensurePortfolioFetched();          // always pull fresh Quarterly data (source of truth)
    // Load Latest Data just refreshed snapshot.portfolioStatus from the server —
    // drop our earlier fetch so the (equally fresh) snapshot copy takes over.
    window.addEventListener("portfolio-data-snapshot", function () { psCache = null; psFetchedAt = Date.now(); render(); });
    window.addEventListener("portfolio-holdings-updated", render);
    window.addEventListener("focus", refreshQuarterlyOnFocus);
    document.addEventListener("visibilitychange", refreshQuarterlyOnFocus);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();

  window.PortfolioPositionPage = { render: render };
})();
