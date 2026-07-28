(function () {
  "use strict";

  // ============================================================
  // Adaptive Position Engine — v1. A NEW decision layer on top of the
  // existing engines (nothing below is redesigned):
  //   - AIRotationEngine  -> layer momentum (structural market evidence), phase
  //   - MarketRegime      -> macro environment score / risk-off state
  //   - snapshot closes   -> interest-rate headwind (TNX/TYX), fresh signals
  //   - PortfolioPosition -> current invested% (Quarterly Editor money)
  //
  // Purpose: HOW MUCH exposure to hold — split into Core (long-term AI mega
  // trend ownership) and Tactical (adjustable). Not a trading engine: no
  // Buy/Sell, no prediction, no target price. Deterministic + explainable.
  // Browser global window.AdaptivePosition + module.exports for Node tests.
  // ============================================================

  var VERSION = "1.0.0";

  function num(v) { if (v == null || v === "") return null; var n = Number(v); return isFinite(n) ? n : null; }
  function round(v, d) { if (v == null || !isFinite(v)) return null; var p = Math.pow(10, d == null ? 0 : d); return Math.round(v * p) / p; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function avg(arr) { var f = (arr || []).filter(function (x) { return Number.isFinite(x); }); return f.length ? f.reduce(function (s, x) { return s + x; }, 0) / f.length : null; }

  // ---------------------------------------------------------- component map
  // Structural components are MARKET-EVIDENCE proxies: each maps to AI value
  // chain layers (AIRotationEngine layer momentum 0-100 — the aggregate score
  // of the real companies doing that work). Disclosed on every card.
  var COMPONENTS = [
    { key: "demand", label: "AI Demand", thai: "ดีมานด์ AI (โมเดล + GPU)", weight: 14, layers: ["model", "gpu"] },
    { key: "capex", label: "Hyperscaler CapEx", thai: "การลงทุน cloud รายใหญ่", weight: 11, layers: ["cloud"] },
    { key: "datacenter", label: "Data Center Build", thai: "การสร้างดาต้าเซนเตอร์", weight: 10, layers: ["cloud", "power", "networking"] },
    { key: "power", label: "Power Infrastructure", thai: "โครงสร้างพื้นฐานไฟฟ้า", weight: 9, layers: ["power", "utility"] },
    { key: "networking", label: "Networking", thai: "เครือข่ายเชื่อมคลัสเตอร์", weight: 8, layers: ["networking"] },
    { key: "semis", label: "Semiconductor Supply Chain", thai: "ห่วงโซ่ผลิตชิป", weight: 11, layers: ["foundry", "equipment", "memory"] },
    { key: "enterprise", label: "Enterprise AI Adoption", thai: "องค์กรใช้ AI จริง", weight: 8, layers: ["enterprise"] },
    { key: "macro", label: "Macro Environment", thai: "สภาพแวดล้อมมหภาค", weight: 11, layers: null },
    { key: "rates", label: "Interest Rate", thai: "ลมต้านดอกเบี้ย (กลับด้าน)", weight: 8, layers: null },
    { key: "rotation", label: "AI Capital Rotation", thai: "หลักฐานเงินหมุนในวัฏจักร AI", weight: 10, layers: null }
  ];

  var STATES = [
    { min: 85, key: "very-strong", label: "Very Strong", thai: "แข็งแกร่งมาก", tone: "bull" },
    { min: 70, key: "strong", label: "Strong", thai: "แข็งแกร่ง", tone: "bull" },
    { min: 55, key: "neutral", label: "Neutral", thai: "กลาง ๆ", tone: "watch" },
    { min: 40, key: "weak", label: "Weak", thai: "อ่อนแรง", tone: "bear" },
    { min: -Infinity, key: "broken", label: "Broken", thai: "โครงสร้างเสีย", tone: "bear" }
  ];
  function stateOf(score) {
    for (var i = 0; i < STATES.length; i++) if (score >= STATES[i].min) return STATES[i];
    return STATES[STATES.length - 1];
  }

  // Core / Tactical / Cash per state — from the spec; exposure moves gradually,
  // never forced liquidation.
  var ALLOC = {
    "very-strong": { core: 70, tactical: 30, cash: 0 },
    "strong": { core: 65, tactical: 25, cash: 10 },
    "neutral": { core: 50, tactical: 20, cash: 30 },
    "weak": { core: 35, tactical: 0, cash: 65 },
    "broken": { core: 20, tactical: 0, cash: 80 }
  };

  var MAX_STEP_PP = 15; // gradual adjustment: one recommendation never moves more than this

  // ---------------------------------------------------------- rate headwind (TNX/TYX from closes)
  function yieldNorm(v) { var n = num(v); if (n == null) return null; return n > 20 ? n / 10 : n; }
  function lastOf(arr) { for (var i = arr.length - 1; i >= 0; i--) { var v = num(arr[i]); if (v != null) return v; } return null; }
  function nAgo(arr, n) { var idx = arr.length - 1 - n; return idx >= 0 ? num(arr[idx]) : null; }

  // headwind points: level (0-2 per yield) + momentum (0-2 per yield), same
  // thresholds as the Macro Dashboard's Interest Rate Risk Monitor.
  function rateHeadwind(tnxCloses, tyxCloses) {
    var defs = [
      { closes: tnxCloses, name: "10Y", caution: 4.50, alert: 4.60 },
      { closes: tyxCloses, name: "30Y", caution: 5.00, alert: 5.20 }
    ];
    var pts = 0, maxPts = 0, why = [], anyData = false, maxD30 = null;
    defs.forEach(function (d) {
      if (!d.closes || d.closes.length < 2) return;
      var c = d.closes.map(yieldNorm);
      var y = lastOf(c); if (y == null) return;
      anyData = true; maxPts += 4;
      if (y >= d.alert) { pts += 2; why.push(d.name + " " + y.toFixed(2) + "% ≥ " + d.alert.toFixed(2) + "% (High Alert)"); }
      else if (y >= d.caution) { pts += 1; why.push(d.name + " " + y.toFixed(2) + "% เข้าเขต Caution"); }
      var m = nAgo(c, Math.min(21, c.length - 1));
      var d30 = m != null ? Math.round((y - yieldNorm(m)) * 100) : null;
      if (d30 != null) {
        if (maxD30 == null || Math.abs(d30) > Math.abs(maxD30)) maxD30 = d30;
        if (d30 > 20) { pts += 2; why.push(d.name + " ขึ้นเร็ว +" + d30 + " bps/30วัน"); }
        else if (d30 >= 10) { pts += 1; why.push(d.name + " กำลังขึ้น +" + d30 + " bps/30วัน"); }
      }
    });
    if (!anyData) return { score: null, severe: false, pts: null, maxD30: null, why: ["ไม่มีข้อมูล yield ใน snapshot"] };
    var score = clamp(Math.round(100 - (pts / (maxPts || 1)) * 100), 0, 100);
    if (!why.length) why.push("ระดับและโมเมนตัมดอกเบี้ยยังไม่เป็นลมต้าน");
    return { score: score, severe: pts >= 6, pts: pts, maxD30: maxD30, why: why };
  }

  // ---------------------------------------------------------- fresh technical signal
  // Same approach as the Action Center: recomputed from closes + anti-glitch
  // persistence (>=2 of the 10 bars before the cross on the origin side).
  function freshBull(closes, windowBars) {
    var W = windowBars == null ? 3 : windowBars;
    var c = (closes || []).map(Number);
    var n = c.length;
    if (n < 30) return null;
    function emaSeries(p) {
      var arr = new Array(n).fill(null);
      if (n < p) return arr;
      var e = 0; for (var i = 0; i < p; i++) e += c[i]; e /= p;
      arr[p - 1] = e; var k = 2 / (p + 1);
      for (var j = p; j < n; j++) { if (!Number.isFinite(c[j])) return arr; e = (c[j] - e) * k + e; arr[j] = e; }
      return arr;
    }
    var e12 = emaSeries(12), e26 = emaSeries(26);
    var s200 = (function () {
      var arr = new Array(n).fill(null);
      if (n < 200) return arr;
      var sum = 0; for (var i = 0; i < 200; i++) sum += c[i];
      arr[199] = sum / 200;
      for (var j = 200; j < n; j++) { sum += c[j] - c[j - 200]; arr[j] = sum / 200; }
      return arr;
    })();
    function crossUpAge(aArr, bArr) {
      for (var i = n - 1; i > 0; i--) {
        var a = aArr[i], b = bArr[i], pa = aArr[i - 1], pb = bArr[i - 1];
        if (a == null || b == null || pa == null || pb == null) continue;
        if (!(pa <= pb && a > b)) continue;
        var origin = 0;
        for (var j = i - 1; j >= Math.max(1, i - 10); j--) {
          if (aArr[j] == null || bArr[j] == null) continue;
          if (aArr[j] <= bArr[j]) origin++;
        }
        return origin >= 2 ? n - 1 - i : null;
      }
      return null;
    }
    var emaAge = crossUpAge(e12, e26);
    var smaAge = crossUpAge(c, s200);
    var emaOk = emaAge != null && emaAge <= W && e12[n - 1] > e26[n - 1];
    var smaOk = smaAge != null && smaAge <= W && s200[n - 1] != null && c[n - 1] > s200[n - 1];
    return {
      emaCross: emaOk ? emaAge : null, smaBreakout: smaOk ? smaAge : null,
      any: emaOk || smaOk,
      aboveSma: s200[n - 1] != null ? c[n - 1] > s200[n - 1] : null,
      emaBull: e12[n - 1] != null && e26[n - 1] != null ? e12[n - 1] > e26[n - 1] : null
    };
  }

  // component trend: avg ~1M price change of the layer companies (market proxy)
  function layerTrend(layerKeys, R, snapshot) {
    if (!layerKeys || !R || !R.layers) return null;
    var hist = (snapshot && snapshot.historicalData) || {};
    var changes = [];
    R.layers.forEach(function (L) {
      if (layerKeys.indexOf(L.key) < 0) return;
      (L.companies || []).forEach(function (co) {
        var keys = [co.ticker, String(co.ticker).toUpperCase()];
        for (var i = 0; i < keys.length; i++) {
          var h = hist[keys[i]];
          if (h && Array.isArray(h.closes) && h.closes.length >= 22) {
            var c = h.closes.map(Number);
            var v = c[c.length - 1], p = c[c.length - 22];
            if (v > 0 && p > 0) { changes.push((v - p) / p * 100); }
            break;
          }
        }
      });
    });
    var m = avg(changes);
    if (m == null) return null;
    return { pct: round(m, 1), dir: m >= 2 ? "up" : m <= -2 ? "down" : "flat", n: changes.length };
  }

  // ---------------------------------------------------------- compute
  function compute(snapshot, opts) {
    opts = opts || {};
    snapshot = snapshot || {};
    try {
      // ---- upstream engines (injected for tests; window globals in browser) ----
      var R = opts.R || (typeof window !== "undefined" && window.AIRotationEngine && window.AIRotationEngine.compute ? window.AIRotationEngine.compute(snapshot) : null);
      var regime = opts.regime || (typeof window !== "undefined" && window.MarketRegime && window.MarketRegime.compute ? window.MarketRegime.compute(snapshot) : null);
      if (!R || !R.available) return { available: false, reason: "no-rotation-engine", thai: "ต้องมี AI Rotation Engine (โหลดหน้าไม่ครบ)" };

      var layerByKey = {};
      (R.layers || []).forEach(function (l) { layerByKey[l.key] = l; });
      function layerScore(keys) { return avg(keys.map(function (k) { return layerByKey[k] ? num(layerByKey[k].momentum) : null; })); }

      var hist = snapshot.historicalData || {};
      var tnx = hist["^TNX"] && hist["^TNX"].closes;
      var tyx = opts.tyxCloses || (hist["^TYX"] && hist["^TYX"].closes) || null;
      if (!tyx && typeof window !== "undefined" && window.localStorage) {
        try { var mc = JSON.parse(window.localStorage.getItem("macro_ohlc_v1") || "{}"); if (mc["^TYX"] && Array.isArray(mc["^TYX"].c)) tyx = mc["^TYX"].c; } catch (e) {}
      }
      var rates = rateHeadwind(tnx, tyx);

      var regimeScore = regime && regime.available !== false ? num(regime.score) : null;
      var regimeKey = regime && regime.regime ? regime.regime.key : null;

      // rotation evidence: phase confidence + evidence met + top-3 rotation momentum
      var topRot = ((R.rotation && R.rotation.ranked) || []).slice(0, 3);
      var topRotMom = avg(topRot.map(function (l) { return num(l.momentum); }));
      var rotationScore = avg([num(R.phase && R.phase.confidence), num(R.phase && R.phase.evidenceMet), topRotMom]);

      // ---- 1-2. Mega Trend components + score (renormalised over available) ----
      var components = COMPONENTS.map(function (C) {
        var value = null, source = "", trend = null;
        if (C.layers) {
          value = layerScore(C.layers);
          source = "โมเมนตัมกลุ่ม " + C.layers.map(function (k) { return layerByKey[k] ? layerByKey[k].name : k; }).join(" + ") + " (AI Rotation Engine)";
          trend = layerTrend(C.layers, R, snapshot);
        } else if (C.key === "macro") {
          value = regimeScore;
          source = "Market Regime score (" + (regime && regime.regime ? regime.regime.label : "—") + ")";
        } else if (C.key === "rates") {
          value = rates.score;
          source = "กลับด้านของ Interest Rate Headwind (10Y/30Y ระดับ+โมเมนตัม)" +
            (rates.maxD30 != null ? " · โมเมนตัม 30วัน: " + (rates.maxD30 > 0 ? "+" : "") + rates.maxD30 + " bps" + (rates.maxD30 >= 10 ? " (ดอกเบี้ยขาขึ้น = ฉุดคะแนน)" : rates.maxD30 <= -10 ? " (ดอกเบี้ยขาลง = หนุนคะแนน)" : "") : "");
        } else if (C.key === "rotation") {
          value = rotationScore;
          source = "เฟส " + (R.phase && R.phase.current ? R.phase.current.name : "—") + " · confidence/evidence + โมเมนตัมกลุ่มเงินหมุนเข้า";
        }
        return {
          key: C.key, label: C.label, thai: C.thai, weight: C.weight,
          score: value == null ? null : Math.round(clamp(value, 0, 100)),
          trend: trend, source: source
        };
      });

      var wsum = 0, acc = 0;
      components.forEach(function (c2) { if (c2.score != null) { wsum += c2.weight; acc += c2.score * c2.weight; } });
      if (!wsum) return { available: false, reason: "no-data", thai: "ยังไม่มีข้อมูลพอ — กด Load Latest Data" };
      var megaScore = Math.round(acc / wsum);
      var st = stateOf(megaScore);
      var coverage = Math.round(wsum / COMPONENTS.reduce(function (s, c2) { return s + c2.weight; }, 0) * 100);

      var sorted = components.filter(function (c2) { return c2.score != null; }).slice().sort(function (a, b) { return b.score - a.score; });
      var strongest = sorted.slice(0, 3), weakest = sorted.slice(-3).reverse();
      var stateWhy = [
        "คะแนนถ่วงน้ำหนักจาก " + sorted.length + "/" + COMPONENTS.length + " องค์ประกอบ (ครอบคลุม " + coverage + "%)",
        "แข็งสุด: " + strongest.map(function (c2) { return c2.label + " " + c2.score; }).join(" · "),
        "อ่อนสุด: " + weakest.map(function (c2) { return c2.label + " " + c2.score; }).join(" · ")
      ];

      // ---- 3. gate ----
      var gateOpen = st.key === "very-strong" || st.key === "strong";
      var gate = {
        open: gateOpen,
        label: gateOpen ? "เปิด — อนุญาตสะสมจังหวะย่อ" : "ปิด — งดสะสมเชิงรุก",
        why: gateOpen
          ? ["Mega Trend อยู่สถานะ " + st.label + " (" + megaScore + "/100) — โครงสร้างเทรนด์ยังหนุนการสะสมตอนย่อ"]
          : ["Mega Trend อยู่สถานะ " + st.label + " (" + megaScore + "/100) — สัญญาณเทคนิคอย่างเดียวห้าม override เกตนี้"]
      };

      // ---- 4. core / tactical allocation ----
      var alloc = ALLOC[st.key];

      // ---- 5. dip-buy eligibility (all 5 must pass) ----
      var qqq = (hist["QQQM"] && hist["QQQM"].closes) || (hist["^IXIC"] && hist["^IXIC"].closes) || null;
      var btc = (hist["BTCUSD"] && hist["BTCUSD"].closes) || (hist["BTC-USD"] && hist["BTC-USD"].closes) || null;
      var fQqq = qqq ? freshBull(qqq) : null;
      var fBtc = btc ? freshBull(btc) : null;
      var freshAny = !!((fQqq && fQqq.any) || (fBtc && fBtc.any));
      var freshDetail = [];
      if (fQqq && fQqq.any) freshDetail.push("Nasdaq/QQQM: " + (fQqq.emaCross != null ? "EMA bull cross (" + fQqq.emaCross + " วันก่อน)" : "") + (fQqq.smaBreakout != null ? " SMA200 breakout (" + fQqq.smaBreakout + " วันก่อน)" : ""));
      if (fBtc && fBtc.any) freshDetail.push("Bitcoin: " + (fBtc.emaCross != null ? "EMA bull cross (" + fBtc.emaCross + " วันก่อน)" : "") + (fBtc.smaBreakout != null ? " SMA200 breakout (" + fBtc.smaBreakout + " วันก่อน)" : ""));

      var phaseIdx = 0;
      (R.timeline || []).forEach(function (p, i) { if (p.status === "current") phaseIdx = i; });
      var aiSupport = phaseIdx <= 3 && (topRotMom == null || topRotMom >= 50);

      var conditions = [
        { key: "mega", label: "Mega Trend แข็งแกร่ง (Strong ขึ้นไป)", met: gateOpen, detail: st.label + " " + megaScore + "/100" },
        { key: "regime", label: "Macro Regime ไม่ใช่ Risk-Off", met: regimeScore == null ? null : regimeScore >= 40, detail: regime && regime.regime ? regime.regime.label + " " + (regimeScore != null ? regimeScore + "/100" : "") : "ไม่มีข้อมูล regime" },
        { key: "rates", label: "Interest Rate Headwind ไม่ถึงขั้น Severe", met: rates.score == null ? null : !rates.severe, detail: rates.pts != null ? "headwind " + rates.pts + " คะแนน (Severe เมื่อ ≥6) · " + rates.why[0] : "ไม่มีข้อมูล yield" },
        { key: "aicycle", label: "AI Cycle ยังอยู่ช่วงสะสม", met: aiSupport, detail: "เฟสปัจจุบัน: " + (R.phase && R.phase.current ? R.phase.current.name : "—") + " (ลำดับ " + (phaseIdx + 1) + "/6)" + (topRotMom != null ? " · โมเมนตัมกลุ่มเงินหมุนเข้า " + Math.round(topRotMom) : "") },
        { key: "fresh", label: "มีสัญญาณเทคนิคใหม่ (EMA bull cross / SMA200 breakout ≤3 วัน)", met: freshAny, detail: freshDetail.length ? freshDetail.join(" · ") : "ยังไม่มีสัญญาณใหม่ใน Nasdaq/QQQM หรือ Bitcoin" }
      ];
      var failed = conditions.filter(function (c2) { return c2.met === false; });
      var unknown = conditions.filter(function (c2) { return c2.met == null; });
      var dipVerdict = failed.length === 0 && unknown.length === 0 && conditions.every(function (c2) { return c2.met; })
        ? { key: "add", label: "Add Position", thai: "สะสมจังหวะย่อได้", tone: "bull" }
        : { key: "wait", label: "Wait", thai: "รอ — เงื่อนไขยังไม่ครบ", tone: "watch" };

      // ---- 6. recommendation vs current exposure ----
      var currentInvestedPct = null, quarterly = null;
      var PP = opts.PP || (typeof window !== "undefined" ? window.PortfolioPosition : null);
      var ps = opts.portfolioStatus || snapshot.portfolioStatus;
      if (PP && PP.deriveQuarterly && ps) {
        try { quarterly = PP.deriveQuarterly(ps); } catch (e) {}
        if (quarterly && quarterly.total > 0) currentInvestedPct = round(quarterly.investedSum / quarterly.total * 100, 1);
      }
      var suggestedInvested = alloc.core + alloc.tactical;
      var reco;
      if (currentInvestedPct == null) {
        reco = { key: "unknown", label: "ยังไม่รู้สัดส่วนพอร์ตปัจจุบัน", detail: "โหลดข้อมูล Quarterly Editor เพื่อเทียบกับเป้า " + suggestedInvested + "%", deltaPp: null, stepPp: null };
      } else {
        var delta = round(suggestedInvested - currentInvestedPct, 1);
        var step = clamp(Math.abs(delta), 0, MAX_STEP_PP);
        // in weak/broken the tactical sleeve is 0 — an under-invested move there is a
        // CORE top-up toward the state target, not a tactical add
        var sleeve = alloc.tactical > 0 ? "Tactical" : "Core";
        if (delta > 5) reco = { key: "increase", label: "Increase " + sleeve, thai: "เพิ่มส่วน " + sleeve, detail: "+" + round(step, 0) + "pp (เป้า " + suggestedInvested + "% · ตอนนี้ " + currentInvestedPct + "%)", deltaPp: delta, stepPp: round(step, 0) };
        else if (delta < -5) reco = { key: "reduce", label: "Reduce " + sleeve, thai: "ลดส่วน " + sleeve, detail: "−" + round(step, 0) + "pp (เป้า " + suggestedInvested + "% · ตอนนี้ " + currentInvestedPct + "%)", deltaPp: delta, stepPp: round(step, 0) };
        else reco = { key: "maintain", label: "Maintain Current Exposure", thai: "คงสัดส่วนปัจจุบัน", detail: "ตอนนี้ " + currentInvestedPct + "% ใกล้เป้า " + suggestedInvested + "% (±5pp)", deltaPp: delta, stepPp: 0 };
      }

      // ---- 7. confidence ----
      var techScore = fQqq ? (fQqq.aboveSma && fQqq.emaBull ? 85 : (fQqq.aboveSma || fQqq.emaBull ? 55 : 30)) : null;
      var concLevel = R.concentration && R.concentration.level ? R.concentration.level.key : null;
      var riskScore = concLevel === "low" ? 85 : concLevel === "medium" ? 60 : concLevel === "high" ? 35 : null;
      var confParts = [
        { key: "mega", label: "Mega Trend", value: megaScore, weight: 35 },
        { key: "macro", label: "Macro Regime", value: regimeScore, weight: 20 },
        { key: "aicycle", label: "AI Cycle", value: rotationScore == null ? null : Math.round(rotationScore), weight: 15 },
        { key: "technical", label: "Technical (Nasdaq trend)", value: techScore, weight: 15 },
        { key: "risk", label: "Portfolio Risk (การกระจุกตัว)", value: riskScore, weight: 15 }
      ];
      var cw = 0, ca = 0;
      confParts.forEach(function (p) { if (p.value != null) { cw += p.weight; ca += p.value * p.weight; } });
      var confScore = cw ? Math.round(ca / cw) : null;
      var confLabel = confScore == null ? null
        : confScore >= 80 ? { key: "very-high", label: "Very High", thai: "สูงมาก" }
        : confScore >= 65 ? { key: "high", label: "High", thai: "สูง" }
        : confScore >= 45 ? { key: "medium", label: "Medium", thai: "ปานกลาง" }
        : { key: "low", label: "Low", thai: "ต่ำ" };
      var confUp = confParts.filter(function (p) { return p.value != null && p.value >= 65; }).map(function (p) { return p.label + " " + p.value; });
      var confDown = confParts.filter(function (p) { return p.value != null && p.value < 50; }).map(function (p) { return p.label + " " + p.value; });

      // ---- 8. explainability rollup ----
      var explain = {
        trendValid: gateOpen
          ? ["โครงสร้างเทรนด์ยังยืน: " + strongest.map(function (c2) { return c2.label; }).join(", ") + " แข็งแรง (≥" + strongest[strongest.length - 1].score + ")"]
          : ["โครงสร้างอ่อนลง: " + weakest.map(function (c2) { return c2.label + " " + c2.score; }).join(", ")],
        accumulation: dipVerdict.key === "add"
          ? ["ครบทั้ง 5 เงื่อนไข — สะสมจังหวะย่อได้ภายใต้กรอบ Tactical"]
          : (failed.length ? failed : unknown).map(function (c2) { return "ไม่ผ่าน/ไม่ทราบ: " + c2.label + " (" + c2.detail + ")"; }),
        confidenceUp: confUp,
        confidenceDown: confDown.length ? confDown : ["ไม่มีปัจจัยฉุดที่ต่ำกว่า 50"]
      };

      return {
        available: true, version: VERSION, generatedAt: opts.now || snapshot.loadedAt || null,
        megaTrend: { score: megaScore, state: st, coverage: coverage, components: components, why: stateWhy },
        gate: gate,
        allocation: { state: st.key, core: alloc.core, tactical: alloc.tactical, cash: alloc.cash, suggestedInvested: suggestedInvested, table: ALLOC },
        dip: { verdict: dipVerdict, conditions: conditions },
        recommendation: reco,
        currentInvestedPct: currentInvestedPct,
        confidence: { score: confScore, label: confLabel, parts: confParts },
        explain: explain,
        inputs: { regime: regime && regime.regime ? { key: regimeKey, label: regime.regime.label, score: regimeScore } : null, phase: R.phase, rates: rates }
      };
    } catch (e) {
      return { available: false, reason: "error", error: String(e && e.message || e) };
    }
  }

  var AdaptivePosition = {
    VERSION: VERSION,
    COMPONENTS: COMPONENTS,
    STATES: STATES,
    ALLOC: ALLOC,
    MAX_STEP_PP: MAX_STEP_PP,
    stateOf: stateOf,
    rateHeadwind: rateHeadwind,
    freshBull: freshBull,
    compute: compute
  };

  if (typeof window !== "undefined") window.AdaptivePosition = AdaptivePosition;
  if (typeof module !== "undefined" && module.exports) module.exports = AdaptivePosition;
})();
