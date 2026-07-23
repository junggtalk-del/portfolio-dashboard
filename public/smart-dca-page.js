(function () {
  "use strict";

  // ============================================================
  // Smart DCA — page UI (Thai). Renders window.SmartDCA (deterministic
  // engine, no LLM) into #sdcaRoot. Self-sufficient data loading:
  //   1) day-cached Coin Metrics MVRV history (localStorage, compact triplets)
  //   2) live Coin Metrics community API (free, CORS-open)
  //   3) fallback: /api/ohlc BTC history → Mayer Multiple mode
  // No frameworks. The app snapshot is NOT required — the BTC Buy Zone
  // chip is optional context read from localStorage.
  // ============================================================

  var ROOT_ID = "sdcaRoot";
  var CACHE_KEY = "smart_dca_cm_v1";
  var SETTINGS_KEY = "smart_dca_settings_v1";
  var BUYZONE_KEY = "portfolio_dashboard_btc_buyzone";
  var CM_URL = "https://community-api.coinmetrics.io/v4/timeseries/asset-metrics" +
    "?assets=btc&metrics=CapMVRVCur,PriceUSD&frequency=1d&page_size=10000&sort=time";
  var YEARS = ["2016", "2018", "2020", "2022", "2024"];

  var JOURNAL_KEY = "smart_dca_journal_v1";
  var FX_KEY = "smart_dca_fx_v1";
  var state = { series: null, source: null, loading: true, error: null, fx: null };
  var settings = loadSettings();

  // ---------------------------------------------------------- USD→THB (ECB via frankfurter.dev, free + CORS, day-cached)
  function loadFx() {
    try {
      var c = JSON.parse(window.localStorage.getItem(FX_KEY) || "null");
      if (c && c.u === today() && Number.isFinite(Number(c.thb))) { state.fx = Number(c.thb); return; }
    } catch (e) {}
    window.fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=THB", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        var v = j && j.rates && Number(j.rates.THB);
        if (Number.isFinite(v) && v > 0) {
          state.fx = v;
          try { window.localStorage.setItem(FX_KEY, JSON.stringify({ u: today(), thb: v })); } catch (e) {}
          render();
        }
      })
      .catch(function () {});
  }

  // ---------------------------------------------------------- DCA journal (device-local)
  function readJournal() { try { var j = JSON.parse(window.localStorage.getItem(JOURNAL_KEY) || "[]"); return Array.isArray(j) ? j : []; } catch (e) { return []; } }
  function writeJournal(list) { try { window.localStorage.setItem(JOURNAL_KEY, JSON.stringify(list || [])); } catch (e) {} }
  function journalId() { return "j" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4); }

  // ---------------------------------------------------------- helpers
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  function nf(v, d) {
    if (v == null) return "—";
    var n = Number(v);
    if (!Number.isFinite(n)) return "—";
    if (d == null) return Math.round(n).toLocaleString("en-US");
    return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function usd(v) { return v == null || !Number.isFinite(Number(v)) ? "—" : "$" + nf(v); }
  function thb(v) { return v == null || !Number.isFinite(Number(v)) ? "—" : "฿" + nf(v); }
  function today() { return new Date().toISOString().slice(0, 10); }
  function daysAgo(dateStr) {
    try {
      var t = Date.parse(String(dateStr) + "T00:00:00Z");
      if (!Number.isFinite(t)) return null;
      return Math.max(0, Math.round((Date.now() - t) / 86400000));
    } catch (e) { return null; }
  }
  function r2(v) { return Math.round(v * 10) / 10; }
  function input(id) { return document.getElementById(id); }
  function metricOf(series) { return series && series.type === "mayer" ? "Mayer" : "MVRV"; }

  // ---------------------------------------------------------- settings
  function loadSettings() {
    var s = { base: 1000, freq: "weekly", startYear: "2020" };
    try {
      var raw = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || "{}") || {};
      var base = Number(raw.base);
      if (Number.isFinite(base) && base >= 100) s.base = Math.round(base);
      if (raw.freq === "monthly") s.freq = "monthly";
      if (YEARS.indexOf(String(raw.startYear)) >= 0) s.startYear = String(raw.startYear);
    } catch (e) {}
    return s;
  }
  function saveSettings() { try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) {} }

  // ---------------------------------------------------------- day cache (compact triplets)
  function readCache() { try { return JSON.parse(window.localStorage.getItem(CACHE_KEY) || "null"); } catch (e) { return null; } }
  function writeCache(series) {
    try {
      var rows = series.dates.map(function (d, i) {
        var p = Math.round(series.prices[i] * 100) / 100;
        var v = series.vals[i];
        return [d, p, v == null ? null : Math.round(v * 10000) / 10000];
      });
      window.localStorage.setItem(CACHE_KEY, JSON.stringify({ u: today(), rows: rows }));
    } catch (e) {}
  }
  function cacheToJson(c) {
    return { data: c.rows.map(function (r) { return { time: r[0], PriceUSD: r[1], CapMVRVCur: r[2] }; }) };
  }

  // ---------------------------------------------------------- data loading
  function loadData(force) {
    if (!window.SmartDCA) { state.error = "smart-dca-engine ไม่ถูกโหลด"; state.loading = false; render(); return; }
    state.loading = true; state.error = null;
    render();

    if (!force) {
      var c = readCache();
      if (c && c.u === today() && Array.isArray(c.rows) && c.rows.length) {
        var s0 = window.SmartDCA.buildFromCoinMetrics(cacheToJson(c));
        if (s0.ok) { state.series = s0; state.source = "coinmetrics"; state.loading = false; render(); return; }
      }
    }

    window.fetch(CM_URL, { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (j) {
        var s = window.SmartDCA.buildFromCoinMetrics(j);
        if (!s.ok) throw new Error("coinmetrics-" + (s.reason || "bad-data"));
        state.series = s; state.source = "coinmetrics"; writeCache(s);
        state.loading = false; render();
      })
      .catch(function () {
        window.fetch("/api/ohlc?symbol=BTC-USD&start=2015-01-01", { cache: "no-store" })
          .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
          .then(function (j) {
            var s = window.SmartDCA.buildFromOhlc(j && j.bars);
            if (!s.ok) throw new Error("ohlc-" + (s.reason || "bad-data"));
            state.series = s; state.source = "ohlc"; state.loading = false; render();
          })
          .catch(function (e2) {
            state.error = String((e2 && e2.message) || e2);
            state.loading = false; render();
          });
      });
  }

  // ---------------------------------------------------------- Buy Zone context (optional)
  function buyZoneScore() {
    try {
      var raw = window.localStorage.getItem(BUYZONE_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      var sc = Number(o && o.score);
      return Number.isFinite(sc) ? Math.round(sc) : null;
    } catch (e) { return null; }
  }

  // ============================================================ render
  function render() {
    var root = document.getElementById(ROOT_ID);
    if (!root) return;

    if (!state.series) {
      root.innerHTML = state.loading ? loadingHtml() : errorHtml();
      var retry = document.getElementById("sdcaRetry");
      if (retry) retry.addEventListener("click", function () { loadData(true); });
      return;
    }

    var series = state.series;
    var cur = window.SmartDCA.current(series, { base: settings.base });
    var bt = window.SmartDCA.backtest(series, { base: settings.base, freq: settings.freq, startDate: settings.startYear + "-01-01" });

    var focusId = document.activeElement ? document.activeElement.id : null;
    var html = headerHtml();
    if (state.source === "ohlc") {
      html += '<div class="sdca-banner">⚠️ โหมดสำรอง: ใช้ Mayer Multiple (ราคา ÷ MA200) แทน MVRV เพราะเชื่อมต่อ Coin Metrics ไม่ได้</div>';
    }
    html += heroHtml(cur, series);
    html += ladderHtml(series, cur);
    html += journalHtml(cur);
    html += backtestHtml(bt);
    html += chartHtml(series, bt);
    html += methodHtml();
    root.innerHTML = html;
    wire();
    if (focusId) {
      var f = document.getElementById(focusId);
      if (f && f.focus) { try { f.focus(); } catch (e) {} }
    }
  }

  function loadingHtml() {
    return '<div class="mc-empty"><strong>กำลังโหลด Smart DCA…</strong>' +
      '<div class="sdca-dim" style="margin-top:6px">ดึงประวัติ MVRV จาก Coin Metrics (ครั้งแรกใช้เวลาสักครู่ จากนั้น cache รายวัน)</div></div>';
  }
  function errorHtml() {
    return '<div class="mc-empty"><strong>โหลดข้อมูล Smart DCA ไม่สำเร็จ</strong>' +
      '<div class="sdca-dim" style="margin-top:6px">' + esc(state.error || "ไม่ทราบสาเหตุ") + "</div>" +
      '<button id="sdcaRetry" class="sdca-btn" type="button" style="margin-top:12px">ลองใหม่</button></div>';
  }

  // -------------------------------------------------- §0 header
  function headerHtml() {
    return '<header class="sdca-head"><div>' +
      '<h1 class="sdca-title">🪙 Smart DCA</h1>' +
      '<p class="sdca-sub">DCA บิทคอยน์แบบฉลาด — ซื้อมากตอนถูก ซื้อน้อยตอนแพง ตามโซน MVRV · กติกาโปร่งใส ตรวจสอบได้</p>' +
      "</div>" +
      '<button id="sdcaReload" class="sdca-btn" type="button"' + (state.loading ? " disabled" : "") + ">" +
      (state.loading ? "กำลังโหลด…" : "โหลดข้อมูลใหม่") + "</button></header>";
  }

  // -------------------------------------------------- §1 verdict hero
  function heroHtml(cur, series) {
    if (!cur || !cur.ok) return "";
    var zone = cur.zone;
    var color = zone ? zone.color : "#94a3b8";
    var metric = series.type === "mayer" ? "Mayer Multiple" : "MVRV";

    var suggest;
    if (cur.mult === 0) {
      suggest = '<div class="sdca-suggest sdca-pause">พัก DCA งวดนี้ — สะสมเงินสดรอโซนที่ถูกกว่า</div>';
    } else {
      suggest = '<div class="sdca-suggest">งวดนี้แนะนำ DCA ≈ <b>' + thb(cur.suggest) + "</b></div>";
    }

    var chips = "";
    var bz = buyZoneScore();
    if (bz != null) chips += '<span class="sdca-chip">🎯 BTC Buy Zone Score: ' + bz + "/100</span>";
    var vd = cur.valueDate != null ? daysAgo(cur.valueDate) : cur.staleDays;
    if (vd != null) chips += '<span class="sdca-chip">ข้อมูล ' + esc(metricOf(series)) + " ล่าสุด D-" + vd + "</span>";
    chips += '<span class="sdca-chip">' + (state.source === "ohlc" ? "แหล่งข้อมูล: ราคาในระบบ (/api/ohlc)" : "แหล่งข้อมูล: Coin Metrics Community") + "</span>";
    if (cur.neutralFallback) chips += '<span class="sdca-chip sdca-chip-warn">ไม่มีข้อมูล valuation — ใช้ ×1 ชั่วคราว</span>';

    return '<section class="sdca-hero">' +
      '<div class="sdca-hero-grid">' +
        '<div class="sdca-mult" style="color:' + color + '">×' + cur.mult + "</div>" +
        '<div class="sdca-hero-main">' +
          '<div class="sdca-zone-name" style="color:' + color + '">' + esc(zone ? zone.thai : "ยังไม่มีข้อมูลโซน — ใช้ตัวคูณปกติ") + "</div>" +
          suggest +
          '<div class="sdca-hero-meta">BTC ' + usd(cur.price) +
            (cur.value != null ? " · " + esc(metric) + " " + nf(cur.value, 2) : "") +
            (cur.valueDate ? ' <span class="sdca-dim">(ข้อมูลวันที่ ' + esc(cur.valueDate) + ")</span>" : "") +
          "</div>" +
        "</div>" +
        '<div class="sdca-hero-controls">' +
          '<label class="sdca-ctrl">เงิน DCA ต่องวด (฿)<input id="sdcaBase" type="number" min="100" step="100" value="' + settings.base + '" /></label>' +
          '<label class="sdca-ctrl">ความถี่<select id="sdcaFreq">' +
            '<option value="weekly"' + (settings.freq === "weekly" ? " selected" : "") + ">รายสัปดาห์</option>" +
            '<option value="monthly"' + (settings.freq === "monthly" ? " selected" : "") + ">รายเดือน</option>" +
          "</select></label>" +
        "</div>" +
      "</div>" +
      '<div class="sdca-chips">' + chips + "</div>" +
    "</section>";
  }

  // -------------------------------------------------- §2 zone ladder
  function rangeTxt(z, metric) {
    if (z.min === -Infinity) return metric + " < " + z.max;
    if (z.max === Infinity) return "≥ " + z.min;
    return z.min + " – " + z.max;
  }

  function ladderHtml(series, cur) {
    var metric = metricOf(series);
    var zones = window.SmartDCA.zonesOf(series.type);
    var curKey = cur && cur.zone ? cur.zone.key : null;
    var rows = zones.map(function (z) {
      var isCur = z.key === curKey;
      var style = isCur ? ' style="box-shadow:inset 0 0 0 1.5px ' + z.color + ";background:" + z.color + '14"' : "";
      return '<div class="sdca-zrow' + (isCur ? " is-current" : "") + '"' + style + ">" +
        '<i class="sdca-zdot" style="background:' + z.color + '"></i>' +
        '<span class="sdca-zrange">' + esc(rangeTxt(z, metric)) + "</span>" +
        '<b class="sdca-zmult" style="color:' + z.color + '">×' + z.mult + "</b>" +
        '<span class="sdca-zthai">' + esc(z.thai) + "</span>" +
        (isCur ? '<span class="sdca-znow" style="color:' + z.color + '">◀ ตอนนี้</span>' : "") +
      "</div>";
    }).join("");
    return '<section class="sdca-block"><div class="sdca-block-head">' +
      "<h2>📏 ตารางโซน — กติกาทั้งหมดของ Smart DCA</h2>" +
      '<button id="sdcaInfo" class="sdca-info-btn" type="button" aria-label="อธิบายกติกา Smart DCA">ⓘ</button>' +
      (cur && cur.value != null ? '<span class="sdca-block-sub">ค่า ' + esc(metric) + " ปัจจุบัน " + nf(cur.value, 2) + "</span>" : "") +
      "</div>" +
      '<div class="sdca-ladder">' + rows + "</div></section>";
  }

  // -------------------------------------------------- §3 backtest
  function cmpRow(label, value) {
    return '<div class="sdca-cmp-row"><span>' + label + "</span><b>" + value + "</b></div>";
  }

  function cmpCard(title, side, winner, buysOverride, note) {
    var roiTxt = side.roiPct == null ? "—" : (side.roiPct >= 0 ? "+" : "") + nf(side.roiPct, 1) + "%";
    return '<div class="sdca-cmp-card' + (winner ? " is-winner" : "") + '">' +
      '<div class="sdca-cmp-title">' + (winner ? "🏆 " : "") + esc(title) + "</div>" +
      '<div class="sdca-cmp-roi ' + (side.roiPct != null && side.roiPct < 0 ? "sdca-down" : "sdca-up") + '">' + roiTxt + "</div>" +
      '<div class="sdca-cmp-roi-l">ROI</div>' +
      '<div class="sdca-cmp-rows">' +
        cmpRow("เงินลงทุนรวม", usd(side.invested)) +
        cmpRow("งวดที่ซื้อ", buysOverride || nf(side.buys)) +
        cmpRow("BTC สะสม", nf(side.btc, 6) + " BTC") +
        cmpRow("ต้นทุนเฉลี่ย/BTC", usd(side.avgCost)) +
        cmpRow("มูลค่าปัจจุบัน", usd(side.value)) +
      "</div>" + (note || "") +
    "</div>";
  }

  function diffHtml(bt) {
    var d = bt.diff || {};
    var parts = [];
    if (d.avgCostPct != null) {
      parts.push(d.avgCostPct <= 0
        ? "ต้นทุนเฉลี่ยถูกกว่า " + nf(Math.abs(d.avgCostPct), 1) + "%"
        : "ต้นทุนเฉลี่ยแพงกว่า " + nf(d.avgCostPct, 1) + "%");
    }
    if (d.btcPer100kPct != null) {
      parts.push((d.btcPer100kPct >= 0 ? "ได้ BTC มากกว่า " : "ได้ BTC น้อยกว่า ") + nf(Math.abs(d.btcPer100kPct), 1) + "% ต่อเงินลงทุนเท่ากัน");
    }
    if (d.roiPp != null) {
      parts.push(d.roiPp >= 0 ? "ROI ดีกว่า +" + nf(d.roiPp, 1) + "pp" : "ROI แย่กว่า " + nf(d.roiPp, 1) + "pp");
    }
    return parts.length ? '<div class="sdca-diff">Smart DCA ' + parts.join(" · ") + "</div>" : "";
  }

  function backtestHtml(bt) {
    var yearOpts = YEARS.map(function (y) {
      return '<option value="' + y + '"' + (settings.startYear === y ? " selected" : "") + ">" + y + "</option>";
    }).join("");
    var head = '<div class="sdca-block-head"><h2>🧪 Backtest — DCA ปกติ vs Smart DCA</h2>' +
      '<label class="sdca-inline">เริ่มทดสอบปี<select id="sdcaYear">' + yearOpts + "</select></label>";

    if (!bt || !bt.ok) {
      return '<section class="sdca-block">' + head + "</div>" +
        '<div class="sdca-chart-card sdca-dim">ข้อมูลไม่พอสำหรับช่วงที่เลือก (' + esc((bt && bt.reason) || "no-data") + ") — ลองเลือกปีเริ่มต้นอื่น</div></section>";
    }

    var freqLabel = bt.freq === "monthly" ? "รายเดือน" : "รายสัปดาห์";
    head += '<span class="sdca-block-sub">' + esc(bt.startDate) + " → " + esc(bt.endDate) +
      " · " + nf(bt.periods) + " งวด (" + freqLabel + ") · เงินงวดละ ฿" + nf(bt.base) + "</span></div>";

    var P = bt.plain, S = bt.smart;
    var smartWins = P.roiPct != null && S.roiPct != null && S.roiPct > P.roiPct;
    var plainWins = P.roiPct != null && S.roiPct != null && P.roiPct > S.roiPct;
    var buysTxt = nf(S.buys) + (S.skipped > 0 ? " · ข้าม " + nf(S.skipped) + " งวด" : "");
    var note = S.neutralBuys > 0
      ? '<div class="sdca-cmp-note">' + nf(S.neutralBuys) + " งวดแรกยังไม่มีข้อมูล valuation — ใช้ ×1</div>"
      : "";

    return '<section class="sdca-block">' + head +
      '<div class="sdca-compare">' +
        cmpCard("DCA ปกติ", P, plainWins, "", "") +
        cmpCard("Smart DCA", S, smartWins, buysTxt, note) +
      "</div>" +
      diffHtml(bt) +
      '<p class="sdca-note">หมายเหตุ: ตัวเลข backtest คำนวณเป็น USD (BTC/USD) — สัดส่วน ROI และ % ต่างๆ ไม่ขึ้นกับสกุลเงิน · เงินงวด ฿ ในช่องตั้งค่าถูกใช้เป็นจำนวนเดียวกันในหน่วย USD เพื่อการเปรียบเทียบ</p>' +
    "</section>";
  }

  // -------------------------------------------------- §4 chart (pure SVG, log scale)
  function gridLevels(minP, maxP) {
    var cands = [100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000, 1000000];
    var within = cands.filter(function (v) { return v >= minP && v <= maxP; });
    while (within.length > 4) within = within.filter(function (_, i) { return i % 2 === 0; });
    return within;
  }
  function compactUsd(v) {
    if (v >= 1000000) return "$" + (v / 1000000) + "M";
    if (v >= 1000) return "$" + (v / 1000) + "k";
    return "$" + v;
  }

  function chartHtml(series, bt) {
    if (!bt || !bt.ok) return "";
    // carried-forward zone color per bar over the backtest range (mirrors engine)
    var pts = [];
    var lastVal = null;
    for (var i = 0; i < series.dates.length; i++) {
      if (series.vals[i] != null) lastVal = series.vals[i];
      var d = series.dates[i];
      if (d < bt.startDate || d > bt.endDate) continue;
      var p = series.prices[i];
      if (p == null || p <= 0) continue;
      var z = window.SmartDCA.zoneFor(lastVal, series.type);
      pts.push({ d: d, p: p, c: z ? z.color : "#64748b" });
    }
    if (pts.length < 2) return "";

    var step = Math.ceil(pts.length / 600);
    var s = [];
    for (var j = 0; j < pts.length; j += step) s.push(pts[j]);
    if (s[s.length - 1] !== pts[pts.length - 1]) s.push(pts[pts.length - 1]);
    var n = s.length;

    var W = 900, H = 300, L = 52, R = 12, T = 14, B = 222;
    var stripY = 234, stripH = 14, axisY = 274;
    var minP = Infinity, maxP = -Infinity;
    s.forEach(function (pt) { if (pt.p < minP) minP = pt.p; if (pt.p > maxP) maxP = pt.p; });
    var lmin = Math.log(minP), lmax = Math.log(maxP);
    var pad = (lmax - lmin) * 0.05 || 0.1;
    lmin -= pad; lmax += pad;
    function X(idx) { return L + (n === 1 ? 0 : (idx / (n - 1)) * (W - L - R)); }
    function Y(price) { return T + (1 - (Math.log(price) - lmin) / (lmax - lmin)) * (B - T); }

    var svg = "";
    gridLevels(minP, maxP).forEach(function (g) {
      var gy = r2(Y(g));
      svg += '<line x1="' + L + '" y1="' + gy + '" x2="' + (W - R) + '" y2="' + gy + '" class="sdca-grid" />';
      svg += '<text x="' + (L - 6) + '" y="' + r2(gy + 3.5) + '" text-anchor="end" class="sdca-axis">' + compactUsd(g) + "</text>";
    });

    // price polyline, split into runs of the same zone color (connected)
    var run = 0;
    for (var k = 1; k <= n; k++) {
      if (k === n || s[k].c !== s[run].c) {
        var to = Math.min(k + 1, n);
        var coords = [];
        for (var m = run; m < to; m++) coords.push(r2(X(m)) + "," + r2(Y(s[m].p)));
        svg += '<polyline points="' + coords.join(" ") + '" fill="none" stroke="' + s[run].c + '" stroke-width="1.8" stroke-linejoin="round" />';
        run = k;
      }
    }

    // zone timeline strip (same x axis)
    var run2 = 0;
    for (var q = 1; q <= n; q++) {
      if (q === n || s[q].c !== s[run2].c) {
        var x0 = X(run2);
        var x1 = q === n ? X(n - 1) : X(q);
        svg += '<rect x="' + r2(x0) + '" y="' + stripY + '" width="' + r2(Math.max(1, x1 - x0)) + '" height="' + stripH + '" fill="' + s[run2].c + '" rx="1" />';
        run2 = q;
      }
    }

    // year labels
    var prevYear = null;
    for (var yi = 0; yi < n; yi++) {
      var yr = s[yi].d.slice(0, 4);
      if (yr !== prevYear) {
        prevYear = yr;
        svg += '<text x="' + r2(X(yi)) + '" y="' + axisY + '" class="sdca-axis">' + esc(yr) + "</text>";
      }
    }

    var legend = window.SmartDCA.zonesOf(series.type).map(function (z) {
      return '<span class="sdca-leg"><i style="background:' + z.color + '"></i>×' + z.mult + "</span>";
    }).join("");

    return '<section class="sdca-block"><div class="sdca-block-head">' +
      "<h2>📈 ราคา BTC ระบายสีตามโซน (log scale)</h2>" +
      '<span class="sdca-block-sub">' + esc(bt.startDate) + " → " + esc(bt.endDate) + "</span></div>" +
      '<div class="sdca-chart-card">' +
        '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="ราคา BTC ระบายสีตามโซน valuation">' + svg + "</svg>" +
        '<div class="sdca-legend">' + legend + "</div>" +
      "</div></section>";
  }

  // -------------------------------------------------- §2.5 DCA journal (real trades)
  function periodDoneChip(entries) {
    var now = today();
    var key = settings.freq === "monthly" ? now.slice(0, 7) : null;
    var done = entries.some(function (e) {
      if (e.side === "sell") return false;
      if (key) return String(e.date || "").slice(0, 7) === key;
      // weekly: same ISO week as today
      return window.SmartDCA.isoWeekKey(String(e.date || "").slice(0, 10)) === window.SmartDCA.isoWeekKey(now);
    });
    var label = settings.freq === "monthly" ? "เดือนนี้" : "สัปดาห์นี้";
    return done
      ? '<span class="sdca-chip sdca-chip-done">✓ ' + label + "บันทึกแล้ว</span>"
      : '<span class="sdca-chip sdca-chip-warn">' + label + "ยังไม่ได้บันทึก DCA</span>";
  }

  function journalHtml(cur) {
    var entries = readJournal();
    var sum = window.SmartDCA.journalSummary(entries);
    var priceThbNow = cur && cur.ok && Number.isFinite(cur.price) && state.fx ? cur.price * state.fx : null;
    var valueNow = priceThbNow != null && sum.btcHeld > 0 ? sum.btcHeld * priceThbNow : null;
    var unrl = valueNow != null && sum.costRemaining > 0 ? valueNow - sum.costRemaining : null;
    var unrlPct = unrl != null && sum.costRemaining > 0 ? unrl / sum.costRemaining * 100 : null;

    // sell plan (mirror ladder) — only in expensive zones
    var zoneKey = cur && cur.zone ? cur.zone.key : null;
    var plan = window.SmartDCA.sellPlanFor(zoneKey, settings.base);
    var planHtml;
    if (plan && sum.btcHeld > 0) {
      planHtml = '<div class="sdca-sellplan is-active">🔔 โซน <b>' + esc(cur.zone.thai) + "</b> — แผน DCA ขาย: ทยอยขาย ≈ <b>" + thb(plan.amount) + "</b>/งวด (×" + plan.mult + " ของเงินงวด)"
        + (sum.avgCost != null && priceThbNow != null ? " · ราคาตอนนี้ " + (priceThbNow >= sum.avgCost ? "สูงกว่า" : "ต่ำกว่า") + "ต้นทุนเฉลี่ย " + nf(Math.abs(priceThbNow / sum.avgCost - 1) * 100, 1) + "%" : "") + "</div>";
    } else if (plan) {
      planHtml = '<div class="sdca-sellplan">โซนแพงแล้ว แต่ยังไม่มี BTC ในสมุดบันทึก — บันทึกการซื้อก่อน</div>';
    } else {
      planHtml = '<div class="sdca-sellplan">ยังไม่ถึงโซนขาย (rich/hot/euphoria) — สะสมตามแผนซื้อด้านบน แผนขายจะโผล่เมื่อ ' + esc(metricOf(state.series)) + " เข้าโซนแพง</div>";
    }

    var cards = '<div class="sdca-j-cards">' +
      '<div class="sdca-j-card"><span>BTC คงเหลือ</span><b>' + nf(sum.btcHeld, 8) + "</b></div>" +
      '<div class="sdca-j-card"><span>ต้นทุนเฉลี่ย/BTC</span><b>' + (sum.avgCost != null ? thb(sum.avgCost) : "—") + "</b></div>" +
      '<div class="sdca-j-card"><span>ต้นทุนคงเหลือ</span><b>' + thb(sum.costRemaining) + "</b></div>" +
      '<div class="sdca-j-card"><span>มูลค่าตอนนี้</span><b>' + (valueNow != null ? thb(valueNow) : "—") + "</b>" +
        (unrlPct != null ? '<i class="' + (unrl >= 0 ? "sdca-up" : "sdca-down") + '">' + (unrl >= 0 ? "+" : "") + nf(unrlPct, 1) + "%</i>" : (sum.btcHeld > 0 ? "<i>รออัตรา USD/THB</i>" : "")) + "</div>" +
      (sum.sells > 0 ? '<div class="sdca-j-card"><span>กำไรที่ขายแล้ว</span><b class="' + (sum.realizedPnl >= 0 ? "sdca-up" : "sdca-down") + '">' + (sum.realizedPnl >= 0 ? "+" : "") + thb(sum.realizedPnl) + "</b></div>" : "") +
      "</div>";

    var prefillPrice = priceThbNow != null ? Math.round(priceThbNow) : "";
    var prefillBuy = cur && cur.ok && cur.mult > 0 ? cur.suggest : settings.base;
    var form = '<form id="sdcaJForm" class="sdca-j-form">' +
      '<label>วันที่<input type="date" id="sdcaJDate" value="' + today() + '" required /></label>' +
      '<label>ประเภท<select id="sdcaJSide"><option value="buy">ซื้อ (DCA)</option><option value="sell">ขาย (DCA ขาย)</option></select></label>' +
      '<label>จำนวนเงิน (฿)<input type="number" id="sdcaJThb" min="1" step="any" value="' + esc(prefillBuy) + '" required /></label>' +
      '<label>ราคา BTC (฿/BTC)<input type="number" id="sdcaJPrice" min="1" step="any" value="' + esc(prefillPrice) + '" placeholder="เช่น 2200000" required /></label>' +
      '<span class="sdca-j-btc" id="sdcaJBtcPreview"></span>' +
      '<button type="submit" class="sdca-btn sdca-btn-primary">บันทึก</button>' +
    "</form>";

    var rows = entries.slice().sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); })
      .map(function (e) {
        return '<div class="sdca-j-row' + (e.side === "sell" ? " is-sell" : "") + '">' +
          "<span>" + esc(String(e.date || "").slice(0, 10)) + "</span>" +
          '<b class="' + (e.side === "sell" ? "sdca-down" : "sdca-up") + '">' + (e.side === "sell" ? "ขาย" : "ซื้อ") + "</b>" +
          "<span>" + thb(e.thb) + "</span>" +
          '<span class="sdca-dim">@ ' + thb(e.priceThb) + "</span>" +
          "<span>" + (e.side === "sell" ? "−" : "+") + nf(e.btc, 8) + " BTC</span>" +
          '<span class="sdca-j-zone">' + (e.zone ? esc(e.zone) + (e.mvrv != null ? " " + nf(e.mvrv, 2) : "") : "—") + "</span>" +
          '<button type="button" class="sdca-mini-del" data-jdel="' + esc(e.id) + '">ลบ</button>' +
        "</div>";
      }).join("");

    return '<section class="sdca-block"><div class="sdca-block-head">' +
      "<h2>📒 บันทึก DCA จริงของฉัน</h2>" + periodDoneChip(entries) +
      (state.fx ? '<span class="sdca-block-sub">USD/THB ' + nf(state.fx, 2) + " (ECB)</span>" : "") +
      '<span class="sdca-j-tools"><button type="button" class="sdca-btn" id="sdcaJExport">Export CSV</button>' +
      '<label class="sdca-btn sdca-btn-file">Import CSV<input type="file" id="sdcaJImport" accept=".csv" hidden /></label></span>' +
      "</div>" +
      (sum.oversell ? '<div class="sdca-banner">⚠️ มีรายการขายมากกว่า BTC ที่บันทึกไว้ — ระบบตัดเท่าที่ถือจริง ตรวจสอบรายการย้อนหลัง</div>' : "") +
      cards + planHtml + form +
      (rows ? '<div class="sdca-j-list">' + rows + "</div>" : '<div class="sdca-dim" style="margin-top:10px">ยังไม่มีรายการ — บันทึกการ DCA ครั้งแรกของคุณด้านบน (เก็บในเครื่องนี้ · Export CSV เพื่อสำรอง)</div>') +
      '<div class="sdca-note">ข้อมูลเก็บใน browser เครื่องนี้เท่านั้น (localStorage) — กด Export CSV เก็บสำรองไว้เสมอ · ต้นทุนคิดแบบถัวเฉลี่ย (average cost) · แผนขายเป็นกติกากระจกของตารางโซน: rich ×0.5 · hot ×1 · euphoria ×2 ของเงินงวด ไม่ใช่คำสั่งซื้อขาย</div>' +
    "</section>";
  }

  function addJournalEntry() {
    var date = String(input("sdcaJDate").value || "").slice(0, 10);
    var side = input("sdcaJSide").value === "sell" ? "sell" : "buy";
    var thbAmt = Number(input("sdcaJThb").value);
    var price = Number(input("sdcaJPrice").value);
    if (!date || !Number.isFinite(thbAmt) || thbAmt <= 0 || !Number.isFinite(price) || price <= 0) return;
    var cur = state.series ? window.SmartDCA.current(state.series, { base: settings.base }) : null;
    var list = readJournal();
    list.push({
      id: journalId(), date: date, side: side, thb: Math.round(thbAmt), priceThb: Math.round(price),
      btc: Number((thbAmt / price).toFixed(8)),
      zone: cur && cur.zone ? cur.zone.key : null, mvrv: cur && cur.value != null ? cur.value : null
    });
    writeJournal(list); render();
  }

  function exportJournalCsv() {
    var head = "date,side,thb,priceThb,btc,zone,mvrv";
    var lines = readJournal().map(function (e) {
      return [e.date, e.side, e.thb, e.priceThb, e.btc, e.zone || "", e.mvrv != null ? e.mvrv : ""].join(",");
    });
    var blob = new Blob(["﻿" + head + "\n" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "smart-dca-journal-" + today() + ".csv";
    document.body.appendChild(a); a.click();
    window.setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function importJournalCsv(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var lines = String(reader.result || "").replace(/^﻿/, "").replace(/\r/g, "").split("\n").filter(Boolean);
        var added = 0, list = readJournal();
        lines.slice(1).forEach(function (ln) {
          var p = ln.split(",");
          var date = String(p[0] || "").slice(0, 10), side = p[1] === "sell" ? "sell" : "buy";
          var thbAmt = Number(p[2]), price = Number(p[3]), btc = Number(p[4]);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !(thbAmt > 0) || !(btc > 0)) return;
          list.push({ id: journalId(), date: date, side: side, thb: thbAmt, priceThb: price > 0 ? price : Math.round(thbAmt / btc), btc: btc, zone: p[5] || null, mvrv: Number.isFinite(Number(p[6])) ? Number(p[6]) : null });
          added += 1;
        });
        if (added > 0) { writeJournal(list); render(); }
        else window.alert("อ่าน CSV ไม่ได้ — ต้องมีคอลัมน์ date,side,thb,priceThb,btc");
      } catch (e) { window.alert("อ่านไฟล์ไม่สำเร็จ"); }
    };
    reader.readAsText(file);
  }

  // -------------------------------------------------- §5 methodology + disclaimer
  function methodHtml() {
    return '<section class="sdca-method">' +
      "<b>แหล่งข้อมูลและวิธีคิด:</b> Coin Metrics Community API (MVRV — ฟรี อัปเดตช้ากว่าราคา 1–2 วัน) · โหมดสำรอง: Mayer Multiple (ราคา ÷ MA200) คำนวณจากราคาในระบบ · กติกาทั้งหมดคือตารางโซนด้านบน ไม่มีการทำนาย ไม่มีสูตรลับ · ตัวเลข backtest คำนวณเป็น USD (BTC/USD)<br />" +
      "⚠️ เครื่องมือนี้ช่วยวางแผน DCA ตามกติกาที่โปร่งใสเท่านั้น ไม่ใช่คำแนะนำการลงทุน — ผลตอบแทนในอดีตไม่การันตีผลลัพธ์ในอนาคต" +
      "</section>";
  }

  // -------------------------------------------------- info modal
  var activeModalClose = null;
  function openInfo() {
    if (activeModalClose) { activeModalClose(); activeModalClose = null; }
    var isMayer = state.series && state.series.type === "mayer";
    var back = document.createElement("div");
    back.className = "sdca-modal-back";
    back.id = "sdcaModalBack";
    back.innerHTML = '<div class="sdca-modal" role="dialog" aria-modal="true">' +
      '<div class="sdca-modal-head"><h3>Smart DCA ทำงานอย่างไร</h3><button class="sdca-modal-close" type="button" aria-label="ปิด">✕</button></div>' +
      '<div class="sdca-modal-body">' +
        '<div class="sdca-modal-sec"><b>ความหมายของ MVRV</b><p>MVRV = Market Value ÷ Realized Value คือราคาตลาดของบิทคอยน์เทียบกับต้นทุนเฉลี่ยจริงของเหรียญทั้งตลาด (ราคาตอนที่แต่ละเหรียญถูกโอนครั้งล่าสุด) ค่าต่ำแปลว่าตลาดโดยรวมถือใกล้ทุนหรือขาดทุน — ในอดีตมักเป็นโซนสะสมที่ดี ส่วนค่าสูงมากแปลว่ากำไรลอยตัวหนาทั้งตลาด — มักใกล้ช่วงร้อนแรงของรอบ' +
          (isMayer ? " (ขณะนี้อยู่โหมดสำรอง: ใช้ Mayer Multiple = ราคา ÷ MA200 แนวคิดเดียวกัน คือวัดความถูก/แพงเทียบแนวโน้มระยะยาว)" : "") +
        "</p></div>" +
        '<div class="sdca-modal-sec"><b>กติกา Smart DCA</b><p>ตารางโซนในหน้านี้คือกติกาทั้งหมด ไม่มีสูตรลับ ไม่มีการทำนาย: ทุกงวด DCA เงินลงทุน = เงินงวดปกติ × ตัวคูณของโซนปัจจุบัน ถูกมากซื้อมาก แพงมากซื้อน้อยหรือพัก — เงินที่ไม่ได้ซื้อในโซนแพงคือเงินสดที่เก็บไว้รอโซนถูก</p></div>' +
        '<div class="sdca-modal-sec"><b>ข้อจำกัด</b><p>ข้อมูล on-chain อัปเดตช้ากว่าราคาประมาณ 1–2 วัน (D-1/D-2) · MVRV เป็นมุมมองรอบใหญ่ระดับเดือน–ปี ไม่ใช่เครื่องมือ timing รายวัน · ผลการทดสอบย้อนหลังไม่การันตีผลลัพธ์ในอนาคต</p></div>' +
      "</div></div>";
    document.body.appendChild(back);
    document.body.style.overflow = "hidden";
    function close() {
      if (back.parentNode) back.parentNode.removeChild(back);
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      if (activeModalClose === close) activeModalClose = null;
    }
    function onKey(ev) { if (ev.key === "Escape") close(); }
    activeModalClose = close;
    back.addEventListener("click", function (ev) {
      if (ev.target === back || (ev.target.closest && ev.target.closest(".sdca-modal-close"))) close();
    });
    document.addEventListener("keydown", onKey);
  }

  // -------------------------------------------------- events
  // While typing, update ONLY the suggestion text (surgical) — a full innerHTML
  // re-render on every keystroke destroys the input's caret (type=number cannot
  // restore selection). The full render (backtest recalc) happens on 'change'.
  function updateSuggestOnly() {
    if (!state.series || !window.SmartDCA) return;
    var cur = window.SmartDCA.current(state.series, { base: settings.base });
    if (!cur || !cur.ok || cur.mult === 0) return;
    var el = document.querySelector(".sdca-suggest b");
    if (el) el.textContent = thb(cur.suggest);
  }

  function wire() {
    var baseEl = document.getElementById("sdcaBase");
    if (baseEl) {
      baseEl.addEventListener("input", function () {
        var v = Number(baseEl.value);
        if (Number.isFinite(v) && v >= 100) { settings.base = Math.round(v); saveSettings(); updateSuggestOnly(); }
      });
      baseEl.addEventListener("change", function () { render(); });
    }
    var freqEl = document.getElementById("sdcaFreq");
    if (freqEl) freqEl.addEventListener("change", function () {
      settings.freq = freqEl.value === "monthly" ? "monthly" : "weekly";
      saveSettings(); render();
    });
    var yearEl = document.getElementById("sdcaYear");
    if (yearEl) yearEl.addEventListener("change", function () {
      settings.startYear = YEARS.indexOf(yearEl.value) >= 0 ? yearEl.value : "2020";
      saveSettings(); render();
    });
    var reload = document.getElementById("sdcaReload");
    if (reload) reload.addEventListener("click", function () {
      try { window.localStorage.removeItem(CACHE_KEY); } catch (e) {}
      loadData(true);
    });
    var info = document.getElementById("sdcaInfo");
    if (info) info.addEventListener("click", openInfo);

    // ---- DCA journal ----
    var jForm = input("sdcaJForm");
    if (jForm) {
      jForm.addEventListener("submit", function (e) { e.preventDefault(); addJournalEntry(); });
      var updPreview = function () {
        var t = Number(input("sdcaJThb").value), p = Number(input("sdcaJPrice").value);
        var el = input("sdcaJBtcPreview");
        if (el) el.textContent = (t > 0 && p > 0) ? "≈ " + (t / p).toFixed(8) + " BTC" : "";
      };
      input("sdcaJThb").addEventListener("input", updPreview);
      input("sdcaJPrice").addEventListener("input", updPreview);
      var sideSel = input("sdcaJSide");
      if (sideSel) sideSel.addEventListener("change", function () {
        // prefill: buy → suggested DCA amount, sell → zone sell-plan amount (if any)
        var cur = state.series ? window.SmartDCA.current(state.series, { base: settings.base }) : null;
        var plan = cur && cur.zone ? window.SmartDCA.sellPlanFor(cur.zone.key, settings.base) : null;
        input("sdcaJThb").value = sideSel.value === "sell" ? (plan ? plan.amount : settings.base) : (cur && cur.mult > 0 ? cur.suggest : settings.base);
        updPreview();
      });
      updPreview();
    }
    document.querySelectorAll("[data-jdel]").forEach(function (el) {
      el.addEventListener("click", function () {
        if (!window.confirm("ลบรายการนี้?")) return;
        writeJournal(readJournal().filter(function (e) { return e.id !== el.getAttribute("data-jdel"); }));
        render();
      });
    });
    var jExp = input("sdcaJExport");
    if (jExp) jExp.addEventListener("click", exportJournalCsv);
    var jImp = input("sdcaJImport");
    if (jImp) jImp.addEventListener("change", function (e) {
      var f = e.target.files && e.target.files[0];
      if (f) importJournalCsv(f);
    });
  }

  window.addEventListener("portfolio-data-snapshot", function () {
    // only the Buy Zone chip depends on the snapshot — never clobber an in-progress edit
    var ae = document.activeElement;
    if (ae && /^sdca(Base|Freq|Year)$/.test(ae.id || "")) return;
    render();
  });

  function boot() { loadData(false); loadFx(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.SmartDCAPage = { render: render };
})();
