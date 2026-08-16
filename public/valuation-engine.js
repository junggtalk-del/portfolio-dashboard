(function () {
  "use strict";
  // ============================================================
  // Valuation Engine — canonical P/E valuation record.
  // Single source of truth for: current trailing P/E, TTM EPS,
  // ADR/currency basis, historical FY-end trailing P/E series,
  // median, percentile, and valuation classification.
  //
  // Consumers: §14 (บริบทมูลค่า) on /thesis ONLY.
  // Does NOT feed Investment Thesis score / PMEngine / anything else
  // (their valuation inputs are curated scores, unchanged).
  //
  // Data sources (reused, no new providers):
  //   price  — snapshot.historicalData[T].closes/dates (live, Yahoo daily)
  //            fallback: KB quarter-end price (explicitly marked STALE)
  //   eps    — ThesisData.companies[T].history.quarters[].epsAdj (curated GAAP)
  //   basis  — history.epsBasis text + history.instrument metadata (ADR/currency)
  //
  // Determinism: pure function of (ticker, snapshot, data, nowMs).
  // No fabrication: missing inputs → null + warnings, never estimates.
  // ============================================================

  var SCHEMA_VERSION = 1;
  var METHODOLOGY_VERSION = "val-2"; // bump when formulas change → consumers must not mix records

  var CONFIG = {
    stalePriceDays: 7,     // live close older than this → STALE_PRICE
    staleEpsDays: 135,     // latest quarter ended > ~4.5 months ago → STALE_FUNDAMENTAL (a report is overdue)
    minHistoryForPercentile: 5,
    percentileLabels: [
      { max: 10, label: "Very Low" },
      { max: 30, label: "Low" },
      { max: 70, label: "Normal" },
      { max: 90, label: "High" },
      { max: 100, label: "Very High" }
    ],
    classification: {
      attractiveMaxPct: 25,     // percentile <= 25            → ATTRACTIVE
      fairMaxPct: 65,           // percentile <= 65            → FAIR
      premiumMaxPct: 90,        // percentile <= 90            → PREMIUM
      expensiveMinPremiumPct: 40 // percentile > 90 AND premium vs median >= 40% → EXPENSIVE (else PREMIUM)
    }
  };

  function num(v) {
    // รับเฉพาะ number/string เท่านั้น — Number(null)=0, Number([])=0, Number(" ")=0 จะปนเปื้อนผลรวมแบบเงียบ
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v === "string") {
      if (v.trim() === "") return null;
      var x = Number(v);
      return isFinite(x) ? x : null;
    }
    return null;
  }
  var YM_RE = /^\d{4}-\d{2}$/;
  function ymMonths(ym) { return Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7)); } // เรียกเฉพาะ ym ที่ผ่าน YM_RE แล้ว
  function round2(v) { return v == null ? null : Math.round(v * 100) / 100; }
  function median(arr) {
    var a = arr.slice().sort(function (x, y) { return x - y; });
    var n = a.length;
    return n ? (n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2) : null;
  }
  // "YYYY-MM" period end ≈ 28th (conservative: never overstates staleness by a full month)
  function ymToMs(ym) {
    var d = String(ym || "");
    var dt = d.length >= 10 ? new Date(d + "T00:00:00") : new Date(d + "-28T00:00:00");
    var t = dt.getTime();
    return isFinite(t) ? t : null;
  }
  function daysBetween(fromMs, toMs) { return Math.round((toMs - fromMs) / 86400000); }
  function currencyOf(H) {
    if (H && H.instrument && H.instrument.currency) return String(H.instrument.currency);
    if (H && H.currency === "฿") return "THB";
    return "USD"; // KB default: US-listed USD figures
  }
  function percentileLabel(pct) {
    for (var i = 0; i < CONFIG.percentileLabels.length; i++) {
      if (pct <= CONFIG.percentileLabels[i].max) return CONFIG.percentileLabels[i].label;
    }
    return "Very High";
  }

  function compute(ticker, snapshot, opts) {
    opts = opts || {};
    var nowMs = opts.nowMs != null ? opts.nowMs : Date.now();
    var data = opts.data || (typeof window !== "undefined" ? window.ThesisData : null);
    var out = {
      schemaVersion: SCHEMA_VERSION,
      methodologyVersion: METHODOLOGY_VERSION,
      ticker: ticker,
      generatedAt: new Date(nowMs).toISOString(),
      available: false,
      classification: "INSUFFICIENT_DATA",
      warnings: []
    };
    var cfg = data && data.companies ? data.companies[ticker] : null;
    var H = cfg && cfg.history ? cfg.history : null;
    if (!H) { out.reason = "no-history"; return out; }
    var inst = H.instrument || {};
    var epsCurrency = currencyOf(H);

    // ---------- price: live snapshot first, KB quarter-end as explicit fallback ----------
    var hd = snapshot && snapshot.historicalData ? snapshot.historicalData[ticker] : null;
    var price = null, priceAsOf = null, priceSource = null;
    if (hd && Array.isArray(hd.closes) && hd.closes.length) {
      for (var i = hd.closes.length - 1; i >= 0; i--) {
        var v = num(hd.closes[i]);
        if (v != null && v > 0) { price = v; priceAsOf = (hd.dates && hd.dates[i]) || null; priceSource = "live-snapshot"; break; }
      }
    }
    // เรียงตาม endYm เสมอ — "4 ไตรมาสล่าสุด" ต้องไม่ขึ้นกับลำดับใน KB
    // endYm ต้องเป็น YYYY-MM เป๊ะ (เลขเดือนไม่เต็มหลักทำ sort ตัวอักษรพัง เช่น "2025-3" > "2025-12") · แถวรูปแบบผิด → ตัดออก
    var quarters = (Array.isArray(H.quarters) ? H.quarters : [])
      .filter(function (q) { return q && typeof q.endYm === "string" && YM_RE.test(q.endYm); })
      .slice()
      .sort(function (a, b) { return a.endYm < b.endYm ? -1 : a.endYm > b.endYm ? 1 : 0; });
    if (price == null && quarters.length) {
      var lq = quarters[quarters.length - 1];
      var p0 = num(lq ? lq.priceQEnd : null);
      if (p0 != null && p0 > 0) { price = p0; priceAsOf = lq.endYm; priceSource = "kb-quarter-end"; }
    }
    // live price comes from the SAME listed symbol the KB prices reference → same currency by construction.
    // opts.assumePriceCurrency exists for adversarial tests / future multi-listing feeds — never set in app code.
    var priceCurrency = opts.assumePriceCurrency || epsCurrency;
    var priceStaleDays = null, priceStale = false;
    if (price != null && priceAsOf) {
      var pMs = ymToMs(priceAsOf);
      if (pMs != null) {
        priceStaleDays = daysBetween(pMs, nowMs);
        priceStale = priceStaleDays > CONFIG.stalePriceDays;
        if (priceStaleDays < -1) { priceStale = true; out.warnings.push("FUTURE_PRICE_DATE"); } // clock skew / provider เพี้ยน — อย่าเชื่อว่า fresh
      }
      else { priceStale = true; }
    } else if (price != null && !priceAsOf) {
      priceStale = true; // ราคาไม่รู้อายุ = เชื่อว่า fresh ไม่ได้
      out.warnings.push("PRICE_DATE_UNKNOWN");
    }
    if (price == null) out.warnings.push("MISSING_PRICE");
    else if (priceStale) out.warnings.push("STALE_PRICE");

    // ---------- TTM EPS: exactly the 4 latest completed quarters, all present ----------
    var seenQ = {}, dupQ = false;
    quarters.forEach(function (q) { if (q && q.endYm) { if (seenQ[q.endYm]) dupQ = true; seenQ[q.endYm] = 1; } });
    if (dupQ) out.warnings.push("DUPLICATE_QUARTER");
    var epsTTM = null, epsQuarterCount = 0, epsAsOf = null, epsQuarters = [];
    var last4 = quarters.slice(-4);
    if (last4.length === 4 && !dupQ) {
      // ต้องเป็น 4 ไตรมาส "ติดกัน" จริง — ช่องว่างระหว่างไตรมาส (เดือน) ต้องอยู่ใน 2-4
      // (ปกติ 3 · เผื่อปีบัญชี 53 สัปดาห์เลื่อนเดือน) — มีรูตรงกลาง = ไม่ใช่ TTM ห้ามติดป้าย TTM
      var contiguous = true;
      for (var ci = 1; ci < 4; ci++) {
        var gap = ymMonths(last4[ci].endYm) - ymMonths(last4[ci - 1].endYm);
        if (gap < 2 || gap > 4) { contiguous = false; break; }
      }
      if (!contiguous) {
        out.warnings.push("NON_CONTIGUOUS_QUARTERS");
      } else {
        var evals = last4.map(function (q) { return num(q ? q.epsAdj : null); });
        if (evals.every(function (x) { return x != null; })) {
          epsTTM = evals.reduce(function (a, b) { return a + b; }, 0);
          epsQuarterCount = 4;
          epsAsOf = last4[3].endYm;
          epsQuarters = last4.map(function (q) { return q.q; });
        }
      }
    }
    if (epsTTM == null) out.warnings.push("MISSING_EPS");
    var epsStaleDays = null, epsStale = false;
    if (epsAsOf) {
      var eMs = ymToMs(epsAsOf);
      if (eMs != null) { epsStaleDays = daysBetween(eMs, nowMs); epsStale = epsStaleDays > CONFIG.staleEpsDays; }
      else { epsStale = true; } // วันที่งวดอ่านไม่ออก = เชื่อว่า fresh ไม่ได้ (สมมาตรกับฝั่งราคา)
      if (epsStale) out.warnings.push("STALE_FUNDAMENTAL");
    }

    // ---------- ADR / share-basis safety ----------
    // KB curates BOTH price and EPS on the listed-security basis (ADR for TSM/ASML per epsBasis note),
    // so no conversion is applied here — the check verifies the bases agree and the ratio is on record.
    var basisText = String(H.epsBasis || "");
    var looksAdr = /adr/i.test(basisText) || inst.shareBasis === "ADR";
    var adr = {
      isAdr: looksAdr,
      ratio: inst.adrRatio != null ? num(inst.adrRatio) : null,
      verified: !!(inst.shareBasis === "ADR" && inst.adrRatio != null),
      conversionApplied: false,
      note: looksAdr
        ? (inst.adrRatio != null
          ? "price และ EPS อยู่ฐาน ADR เดียวกัน (1 ADR = " + inst.adrRatio + " หุ้นสามัญ) — ไม่ต้องแปลง"
          : "epsBasis ระบุ ADR แต่ไม่มี adrRatio ใน instrument metadata")
        : "หุ้นสามัญปกติ ไม่มีชั้น ADR"
    };
    if (adr.isAdr && !adr.verified) out.warnings.push("ADR_RATIO_UNVERIFIED");

    // ---------- currency guard: never divide across currencies ----------
    var currencyMatch = priceCurrency === epsCurrency;
    if (!currencyMatch) out.warnings.push("CURRENCY_MISMATCH");

    // ---------- current P/E ----------
    var pe = null;
    if (price != null && epsTTM != null && currencyMatch) {
      if (epsTTM <= 0) out.warnings.push("NON_POSITIVE_TTM_EPS");
      else pe = price / epsTTM;
    }

    // ---------- historical series: FY-end trailing P/E (one consistent methodology) ----------
    var years = Array.isArray(H.years) ? H.years : [];
    var points = [], excluded = [], seenFy = {};
    years.forEach(function (y) {
      if (!y || !y.fy) return;
      if (seenFy[y.fy]) { excluded.push({ period: y.fy, reason: "duplicate" }); return; }
      seenFy[y.fy] = 1;
      var p = num(y.priceFYEnd), e = num(y.epsAdj);
      if (p == null || e == null) { excluded.push({ period: y.fy, reason: "missing-data" }); return; }
      if (e <= 0) { excluded.push({ period: y.fy, reason: "non-positive-eps" }); return; }
      if (p <= 0) { excluded.push({ period: y.fy, reason: "non-positive-price" }); return; }
      points.push({ period: y.fy, price: p, eps: e, pe: round2(p / e), peRaw: p / e, methodology: "FYEND_TRAILING" });
    });
    // สถิติทั้งหมดคิดจากค่าดิบ (ไม่ใช่ค่า round เพื่อแสดงผล) — กัน boundary flip ที่เส้นแบ่ง classification
    var pes = points.map(function (pt) { return pt.peRaw; });
    var histMedian = pes.length ? median(pes) : null;
    var histMin = pes.length ? Math.min.apply(null, pes) : null;
    var histMax = pes.length ? Math.max.apply(null, pes) : null;

    // ---------- percentile: % of valid observations <= current (ties inclusive, deterministic) ----------
    var insufficient = points.length < CONFIG.minHistoryForPercentile;
    var pct = null, pctLabel = null;
    if (pe != null && pes.length && !insufficient) {
      pct = Math.round(100 * pes.filter(function (x) { return x <= pe; }).length / pes.length);
      pctLabel = percentileLabel(pct);
    }

    // ---------- premium vs median ----------
    var premiumPct = (pe != null && histMedian != null && histMedian > 0)
      ? Math.round((pe - histMedian) / histMedian * 1000) / 10 : null;

    // ---------- classification (context, NOT a trade signal) ----------
    var C = CONFIG.classification, cls;
    if (pe == null || insufficient || pct == null) cls = "INSUFFICIENT_DATA";
    else if (pct <= C.attractiveMaxPct) cls = "ATTRACTIVE";
    else if (pct <= C.fairMaxPct) cls = "FAIR";
    else if (pct <= C.premiumMaxPct) cls = "PREMIUM";
    else cls = (premiumPct != null && premiumPct >= C.expensiveMinPremiumPct) ? "EXPENSIVE" : "PREMIUM";

    // ---------- forward P/E from forwardView consensus (real data only, basis disclosed) ----------
    var fwd = null;
    var FV = cfg.forwardView;
    if (price != null && currencyMatch && FV && Array.isArray(FV.consensus) && FV.consensus.length) {
      var c0 = FV.consensus[0];
      var fe = num(c0 ? c0.eps : null);
      if (fe != null && fe > 0) {
        fwd = { fy: c0.fy, pe: round2(price / fe), epsBasis: c0.basis || "unknown", confidence: c0.confidence || null, asOf: FV.asOf || null };
      }
    }

    out.available = true;
    out.price = { value: round2(price), currency: priceCurrency, basis: adr.isAdr ? "ADR" : "common", asOf: priceAsOf, source: priceSource, stale: priceStale, staleDays: priceStaleDays };
    out.eps = { ttm: round2(epsTTM), currency: epsCurrency, basis: adr.isAdr ? "ADR" : "common", basisNote: basisText || null, quarterCount: epsQuarterCount, quarters: epsQuarters, asOf: epsAsOf, source: "kb-curated", stale: epsStale, staleDays: epsStaleDays };
    out.adr = adr;
    out.pe = { current: round2(pe), methodology: "TTM_TRAILING" };
    out.history = {
      methodology: "FYEND_TRAILING", label: "Year-end trailing P/E",
      points: points.map(function (pt) { return { period: pt.period, price: pt.price, eps: pt.eps, pe: pt.pe, methodology: pt.methodology }; }), // ค่าดิบใช้ภายในเท่านั้น
      median: round2(histMedian), sampleCount: points.length, min: round2(histMin), max: round2(histMax), excluded: excluded
    };
    out.percentile = { value: pct, label: pctLabel, insufficient: insufficient, basis: "% of valid FY-end observations <= current P/E (ties inclusive)" };
    out.premiumVsMedianPct = premiumPct;
    out.classification = cls;
    out.forwardPe = fwd; // null = "—" (data unavailable), never estimated
    out.asOf = { price: priceAsOf, eps: epsAsOf, valuation: new Date(nowMs).toISOString().slice(0, 10) };
    out.quality = {
      price: price == null ? "missing" : priceStale ? "stale" : "fresh",
      eps: epsTTM == null ? "missing" : epsStale ? "stale" : "fresh",
      adr: adr.isAdr ? (adr.verified ? "verified" : "unverified") : "n/a",
      currencyMatch: currencyMatch,
      historyCount: points.length
    };
    return out;
  }

  var ValuationEngine = {
    compute: compute,
    CONFIG: CONFIG,
    SCHEMA_VERSION: SCHEMA_VERSION,
    METHODOLOGY_VERSION: METHODOLOGY_VERSION,
    _median: median
  };
  if (typeof window !== "undefined") window.ValuationEngine = ValuationEngine;
  if (typeof module !== "undefined" && module.exports) module.exports = ValuationEngine;
})();
