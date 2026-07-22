(function () {
  "use strict";

  // ============================================================
  // Smart DCA engine — deterministic, no LLM, free data only.
  //
  // Concept (community-standard "Smart DCA"): keep a fixed DCA schedule but
  // scale each buy by a MULTIPLIER derived from Bitcoin's long-cycle valuation
  // zone. Primary valuation series = MVRV ratio (Coin Metrics community API,
  // free, full history, CORS-open — see bitcoin monitor architecture). Fallback
  // valuation = Mayer Multiple (price / 200D SMA) computed from our own
  // /api/ohlc BTC history when Coin Metrics is unreachable.
  //
  // Pure functions only: no DOM, no fetch. Browser global window.SmartDCA +
  // module.exports for the Node smoke test (same convention as wave3-engine).
  // ============================================================

  var VERSION = "1.0.0";

  // ---------------------------------------------------------- zone tables
  // MVRV bands follow the widely-published research bands (undervalued < 1,
  // slow down > 2.5, euphoria ≥ 3.5). Multipliers are the transparent rule set
  // shown on the page — the whole table renders in the UI, nothing hidden.
  var MVRV_ZONES = [
    { key: "fire",     min: -Infinity, max: 0.8,      mult: 4,    label: "Extreme Undervalue", thai: "ถูกสุดขีด — โอกาสระดับทศวรรษ",        color: "#10b981" },
    { key: "deep",     min: 0.8,       max: 1.0,      mult: 3,    label: "Undervalue",         thai: "ต่ำกว่ามูลค่าจริง — สะสมหนัก",          color: "#34d399" },
    { key: "accum",    min: 1.0,       max: 1.5,      mult: 2,    label: "Accumulate",         thai: "โซนสะสม — DCA เพิ่ม",                  color: "#a3e635" },
    { key: "early",    min: 1.5,       max: 2.0,      mult: 1.5,  label: "Early Bull",         thai: "ขาขึ้นต้นรอบ — DCA เพิ่มเล็กน้อย",       color: "#d9f99d" },
    { key: "base",     min: 2.0,       max: 2.5,      mult: 1,    label: "Fair Zone",          thai: "โซนปกติ — DCA ตามแผนเดิม",             color: "#facc15" },
    { key: "rich",     min: 2.5,       max: 3.0,      mult: 0.5,  label: "Getting Expensive",  thai: "เริ่มแพง — ชะลอ DCA",                  color: "#f59e0b" },
    { key: "hot",      min: 3.0,       max: 3.5,      mult: 0.25, label: "Overheated",         thai: "ร้อนแรง — DCA เบาที่สุด",               color: "#f97316" },
    { key: "euphoria", min: 3.5,       max: Infinity, mult: 0,    label: "Euphoria",           thai: "ยูโฟเรีย — พัก DCA สะสมเงินสดรอรอบ",     color: "#ef4444" }
  ];

  // Mayer Multiple bands (price / SMA200) — same 8-step ladder, fallback mode.
  var MAYER_ZONES = [
    { key: "fire",     min: -Infinity, max: 0.6,      mult: 4,    label: "Extreme Undervalue", thai: "ถูกสุดขีด — ต่ำกว่า MA200 มาก",         color: "#10b981" },
    { key: "deep",     min: 0.6,       max: 0.8,      mult: 3,    label: "Undervalue",         thai: "ต่ำกว่าแนวโน้มระยะยาว — สะสมหนัก",      color: "#34d399" },
    { key: "accum",    min: 0.8,       max: 1.0,      mult: 2,    label: "Accumulate",         thai: "ใต้ MA200 — โซนสะสม",                  color: "#a3e635" },
    { key: "early",    min: 1.0,       max: 1.3,      mult: 1.5,  label: "Early Bull",         thai: "เหนือ MA200 ช่วงต้น — DCA เพิ่มเล็กน้อย", color: "#d9f99d" },
    { key: "base",     min: 1.3,       max: 1.7,      mult: 1,    label: "Fair Zone",          thai: "โซนปกติ — DCA ตามแผนเดิม",             color: "#facc15" },
    { key: "rich",     min: 1.7,       max: 2.1,      mult: 0.5,  label: "Getting Expensive",  thai: "เริ่มแพง — ชะลอ DCA",                  color: "#f59e0b" },
    { key: "hot",      min: 2.1,       max: 2.4,      mult: 0.25, label: "Overheated",         thai: "ร้อนแรง — DCA เบาที่สุด",               color: "#f97316" },
    { key: "euphoria", min: 2.4,       max: Infinity, mult: 0,    label: "Euphoria",           thai: "ยูโฟเรีย — พัก DCA สะสมเงินสดรอรอบ",     color: "#ef4444" }
  ];

  function zonesOf(type) { return type === "mayer" ? MAYER_ZONES : MVRV_ZONES; }

  // zone lookup: min inclusive, max exclusive (matches the ladder rendering)
  function zoneFor(value, type) {
    var v = num(value); if (v == null) return null;
    var zs = zonesOf(type);
    for (var i = 0; i < zs.length; i++) if (v >= zs[i].min && v < zs[i].max) return zs[i];
    return null;
  }
  function multiplierFor(value, type) { var z = zoneFor(value, type); return z ? z.mult : 1; }

  // ---------------------------------------------------------- utils
  // null/undefined/"" must stay null — Number(null) is 0, which would silently
  // map a MISSING valuation into the deepest buy zone (×4). Never let that happen.
  function num(v) { if (v == null || v === "") return null; var n = Number(v); return isFinite(n) ? n : null; }
  function round(v, d) { if (v == null || !isFinite(v)) return null; var p = Math.pow(10, d == null ? 0 : d); return Math.round(v * p) / p; }

  // ISO-8601 week key (UTC) — weekly DCA buys on the first bar of each new ISO week
  function isoWeekKey(dateStr) {
    var d = new Date(dateStr + "T00:00:00Z"); if (isNaN(d)) return null;
    var day = (d.getUTCDay() + 6) % 7;              // Mon=0 … Sun=6
    d.setUTCDate(d.getUTCDate() - day + 3);          // nearest Thursday
    var isoYear = d.getUTCFullYear();
    var firstThu = new Date(Date.UTC(isoYear, 0, 4));
    var fday = (firstThu.getUTCDay() + 6) % 7;
    firstThu.setUTCDate(firstThu.getUTCDate() - fday + 3);
    var wk = 1 + Math.round((d - firstThu) / 604800000);
    return isoYear + "-W" + (wk < 10 ? "0" : "") + wk;
  }
  function monthKey(dateStr) { return typeof dateStr === "string" ? dateStr.slice(0, 7) : null; }
  function periodKey(dateStr, freq) { return freq === "monthly" ? monthKey(dateStr) : isoWeekKey(dateStr); }

  // ---------------------------------------------------------- series builders
  // Coin Metrics community response → aligned series (values arrive as strings).
  // Expected: { data: [{ time, PriceUSD, CapMVRVCur }, ...] } sorted ascending.
  function buildFromCoinMetrics(json) {
    var rows = json && Array.isArray(json.data) ? json.data : [];
    var dates = [], prices = [], vals = [];
    rows.forEach(function (r) {
      if (!r || !r.time) return;
      var date = String(r.time).slice(0, 10);
      var p = num(r.PriceUSD), m = num(r.CapMVRVCur);
      if (p == null || p <= 0) return;               // price is mandatory per bar
      dates.push(date); prices.push(p); vals.push(m); // mvrv may be null (carried forward at buy time)
    });
    if (dates.length < 400) return { ok: false, reason: "insufficient-data", count: dates.length };
    return { ok: true, type: "mvrv", dates: dates, prices: prices, vals: vals, latestDate: dates[dates.length - 1] };
  }

  // /api/ohlc bars → Mayer Multiple series (price / SMA200). First 199 bars null.
  function buildFromOhlc(bars) {
    var rows = Array.isArray(bars) ? bars : [];
    var dates = [], prices = [];
    rows.forEach(function (b) {
      var c = num(b && (b.close != null ? b.close : b.c));
      var date = b && (b.date || b.time || b.t);
      if (c == null || c <= 0 || !date) return;
      dates.push(String(date).slice(0, 10)); prices.push(c);
    });
    if (dates.length < 400) return { ok: false, reason: "insufficient-data", count: dates.length };
    var vals = new Array(prices.length).fill(null);
    var sum = 0;
    for (var i = 0; i < prices.length; i++) {
      sum += prices[i];
      if (i >= 200) sum -= prices[i - 200];
      if (i >= 199) { var maVal = sum / 200; vals[i] = maVal > 0 ? prices[i] / maVal : null; }
    }
    return { ok: true, type: "mayer", dates: dates, prices: prices, vals: vals, latestDate: dates[dates.length - 1] };
  }

  // ---------------------------------------------------------- current verdict
  function current(series, opts) {
    if (!series || !series.ok) return { ok: false, reason: "no-series" };
    var base = num(opts && opts.base) || 1000;
    var n = series.dates.length;
    var price = series.prices[n - 1], date = series.dates[n - 1];
    var val = null, valDate = null;
    for (var i = n - 1; i >= 0 && i >= n - 30; i--) {           // last known valuation ≤30 bars back
      if (series.vals[i] != null) { val = series.vals[i]; valDate = series.dates[i]; break; }
    }
    var zone = zoneFor(val, series.type);
    var mult = zone ? zone.mult : 1;
    var staleDays = null;
    try { staleDays = Math.max(0, Math.round((Date.now() - Date.parse(date + "T00:00:00Z")) / 86400000)); } catch (e) {}
    return {
      ok: true, type: series.type, date: date, price: price,
      value: val == null ? null : round(val, 2), valueDate: valDate,
      zone: zone, mult: mult, suggest: round(base * mult, 0),
      neutralFallback: !zone, staleDays: staleDays
    };
  }

  // ---------------------------------------------------------- backtest
  // Plain DCA: invest `base` at the first bar of every period from startDate.
  // Smart DCA: same schedule, amount = base × multiplier(valuation at that bar).
  // Missing valuation at a buy bar → carry the last known value forward; if none
  // has existed yet → neutral ×1 (counted in neutralBuys for transparency).
  function backtest(series, opts) {
    if (!series || !series.ok) return { ok: false, reason: "no-series" };
    var base = num(opts && opts.base) || 1000;
    var freq = (opts && opts.freq) === "monthly" ? "monthly" : "weekly";
    var startDate = (opts && opts.startDate) || series.dates[0];
    if (base <= 0) return { ok: false, reason: "bad-base" };

    var n = series.dates.length;
    var lastKey = null, lastVal = null;
    var plain = { invested: 0, btc: 0, buys: 0 };
    var smart = { invested: 0, btc: 0, buys: 0, skipped: 0, neutralBuys: 0 };
    var timeline = [];
    var zoneDays = {};
    var maxMult = null, minMult = null;
    var firstBuyDate = null, lastPrice = null, lastDate = null;

    for (var i = 0; i < n; i++) {
      var date = series.dates[i];
      if (date < startDate) { if (series.vals[i] != null) lastVal = series.vals[i]; continue; }
      var price = series.prices[i];
      if (price == null || price <= 0) continue;
      if (series.vals[i] != null) lastVal = series.vals[i];
      lastPrice = price; lastDate = date;

      var zNow = zoneFor(lastVal, series.type);
      zoneDays[zNow ? zNow.key : "unknown"] = (zoneDays[zNow ? zNow.key : "unknown"] || 0) + 1;

      var key = periodKey(date, freq);
      if (key == null || key === lastKey) continue;
      lastKey = key;

      // ---- buy bar ----
      if (!firstBuyDate) firstBuyDate = date;
      plain.invested += base; plain.btc += base / price; plain.buys += 1;

      var mult = zNow ? zNow.mult : 1;
      if (!zNow) smart.neutralBuys += 1;
      if (maxMult == null || mult > maxMult) maxMult = mult;
      if (minMult == null || mult < minMult) minMult = mult;
      var amount = base * mult;
      if (amount > 0) { smart.invested += amount; smart.btc += amount / price; smart.buys += 1; }
      else smart.skipped += 1;
      timeline.push({ date: date, price: price, val: lastVal == null ? null : round(lastVal, 2), zone: zNow ? zNow.key : null, mult: mult, amount: round(amount, 0) });
    }

    if (!plain.buys || lastPrice == null) return { ok: false, reason: "no-buys" };

    function summarize(side) {
      var value = side.btc * lastPrice;
      var avgCost = side.btc > 0 ? side.invested / side.btc : null;
      var roiPct = side.invested > 0 ? (value - side.invested) / side.invested * 100 : null;
      return {
        invested: round(side.invested, 0), btc: round(side.btc, 6), buys: side.buys,
        skipped: side.skipped || 0, neutralBuys: side.neutralBuys || 0,
        value: round(value, 0), avgCost: round(avgCost, 0), roiPct: round(roiPct, 1),
        btcPer100k: side.invested > 0 ? round(side.btc / (side.invested / 100000), 6) : null
      };
    }
    var P = summarize(plain), S = summarize(smart);
    return {
      ok: true, type: series.type, freq: freq, base: base,
      startDate: firstBuyDate, endDate: lastDate, lastPrice: round(lastPrice, 0),
      periods: plain.buys,
      plain: P, smart: S,
      diff: {
        roiPp: P.roiPct != null && S.roiPct != null ? round(S.roiPct - P.roiPct, 1) : null,
        avgCostPct: P.avgCost && S.avgCost != null ? round((S.avgCost - P.avgCost) / P.avgCost * 100, 1) : null,
        btcPer100kPct: P.btcPer100k && S.btcPer100k != null ? round((S.btcPer100k - P.btcPer100k) / P.btcPer100k * 100, 1) : null
      },
      maxMult: maxMult, minMult: minMult,
      zoneDays: zoneDays, timeline: timeline
    };
  }

  // ---------------------------------------------------------- export
  var SmartDCA = {
    VERSION: VERSION,
    MVRV_ZONES: MVRV_ZONES,
    MAYER_ZONES: MAYER_ZONES,
    zonesOf: zonesOf,
    zoneFor: zoneFor,
    multiplierFor: multiplierFor,
    isoWeekKey: isoWeekKey,
    periodKey: periodKey,
    buildFromCoinMetrics: buildFromCoinMetrics,
    buildFromOhlc: buildFromOhlc,
    current: current,
    backtest: backtest
  };

  if (typeof window !== "undefined") window.SmartDCA = SmartDCA;
  if (typeof module !== "undefined" && module.exports) module.exports = SmartDCA;
})();
