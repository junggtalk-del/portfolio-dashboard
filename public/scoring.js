/*
 * scoring.js — centralized SIGNAL SCORE engine for AI Investment Mission Control.
 *
 * ONE simple, explainable score (0-100) + gate-driven action that follows the
 * user's actual trading logic:
 *   - EMA12/26 is the FIRST gate (buy first tranche / sell first tranche).
 *   - SMA200 is the MAJOR trend gate (buy more / sell all).
 *   - Volume only CONFIRMS strength — it never overrides a bad EMA/SMA trend.
 *
 * Weight: EMA12/26 = 50, SMA200 = 35, Volume = 15  (total 100).
 *
 * Shared by Action Center, Asset 360, Thai Stock Scanner, Technical Signals,
 * Compare, Watchlist, Portfolio Status, Data Snapshot. Do NOT duplicate this
 * logic in pages — call window.Scoring.* (browser) or require() (node test).
 */
(function (global) {
  "use strict";

  // ----------------------------------------------------------------- helpers
  function fin(v) {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function round(n, d) { const f = Math.pow(10, d || 0); return Math.round(n * f) / f; }
  function lc(v) { return String(v == null ? "" : v).toLowerCase(); }

  // ----------------------------------------------------------------- PART 7: labels
  function bandFor(score) {
    if (score >= 85) return { grade: "A", label: "Strong Buy / Add Setup", thaiLabel: "สัญญาณแข็งแรงมาก / ซื้อเพิ่มได้", color: "#10b981" };
    if (score >= 70) return { grade: "B", label: "Buy First Tranche / Consider Add", thaiLabel: "ซื้อไม้แรก / พิจารณาเพิ่ม", color: "#14b8a6" };
    if (score >= 55) return { grade: "C", label: "Watch / Wait for Confirmation", thaiLabel: "เฝ้าดู / รอ confirm", color: "#f59e0b" };
    if (score >= 35) return { grade: "D", label: "Reduce / Weak Signal", thaiLabel: "ลดน้ำหนัก / สัญญาณอ่อน", color: "#fb923c" };
    return { grade: "E", label: "Avoid / Exit", thaiLabel: "รอก่อน / ออกจากสถานะ", color: "#f43f5e" };
  }
  function scoreColor(score) { return bandFor(fin(score) || 0).color; }

  // ----------------------------------------------------------------- derive
  function derive(input) {
    input = input || {};
    const price = fin(input.latestPrice);
    const ema12 = fin(input.ema12);
    const ema26 = fin(input.ema26);
    const sma200 = fin(input.sma200);
    const rsi = fin(input.rsi14);
    const vol = fin(input.volumeRatio);
    const emaPresent = ema12 != null && ema26 != null;
    const smaPresent = price != null && sma200 != null;
    const emaBull = emaPresent ? ema12 > ema26 : input.emaTrendStatus === "EMA_BULLISH";
    const emaBear = emaPresent ? ema12 < ema26 : input.emaTrendStatus === "EMA_BEARISH";
    const aboveSma = smaPresent ? price > sma200 : input.sma200Status === "ABOVE_SMA200";
    const belowSma = smaPresent ? price < sma200 : input.sma200Status === "BELOW_SMA200";
    let gap = fin(input.emaGapPercent);
    if (gap == null && emaPresent && ema26 !== 0) gap = ((ema12 - ema26) / ema26) * 100;
    let dist = fin(input.distanceToSma200Percent);
    if (dist == null && smaPresent && sma200 !== 0) dist = ((price - sma200) / sma200) * 100;
    const emaNear = emaPresent && !emaBull && ema26 !== 0 && Math.abs(ema12 - ema26) / ema26 <= 0.005;
    const daysBull = fin(input.daysSinceEmaBullishCross);
    const daysBear = fin(input.daysSinceEmaBearishCross);
    const daysSmaReclaim = fin(input.daysSinceSma200Reclaim);
    const daysSmaBreak = fin(input.daysSinceSma200Break);
    const newBull = emaBull && (!!input.isNewBullishSignal || (daysBull != null && daysBull >= 1 && daysBull <= 3));
    const newBear = emaBear && (!!input.isNewBearishSignal || (daysBear != null && daysBear >= 1 && daysBear <= 3));
    const recentReclaim = aboveSma && daysSmaReclaim != null && daysSmaReclaim <= 3;
    const recentBreak = belowSma && daysSmaBreak != null && daysSmaBreak <= 3;
    const lvl = lc(input.marketRiskLevel);
    const riskVeryHigh = lvl.indexOf("very high") >= 0 || lvl === "veryhigh" || lvl.indexOf("วิกฤต") >= 0;
    const riskHigh = riskVeryHigh || lvl.indexOf("high") >= 0 || lvl.indexOf("hedge") >= 0 || lvl.indexOf("สูง") >= 0;
    return {
      price, ema12, ema26, sma200, rsi, vol, emaPresent, smaPresent,
      emaBull, emaBear, aboveSma, belowSma, gap, dist, emaNear,
      daysBull, daysBear, daysSmaReclaim, daysSmaBreak, newBull, newBear,
      recentReclaim, recentBreak, lvl, riskHigh, riskVeryHigh
    };
  }

  // ----------------------------------------------------------------- PART 8: gates
  function evaluateGates(d) {
    const volStr = d.vol != null ? `${d.vol.toFixed(2)}x` : "—";
    const distStr = d.dist != null ? `${d.dist >= 0 ? "+" : ""}${d.dist.toFixed(1)}%` : "—";

    let ema;
    if (!d.emaPresent) ema = { status: "MISSING", label: "—", thaiLabel: "ไม่มีข้อมูล", thaiDetail: "ไม่มีข้อมูล EMA" };
    else if (d.emaBull) ema = { status: "PASS", label: "Pass", thaiLabel: "ผ่าน", thaiDetail: "EMA12 อยู่เหนือ EMA26" };
    else if (d.emaNear) ema = { status: "NEAR", label: "Near", thaiLabel: "ใกล้", thaiDetail: "EMA12 ใกล้ตัดขึ้น EMA26" };
    else ema = { status: "FAIL", label: "Fail", thaiLabel: "ไม่ผ่าน", thaiDetail: "EMA12 ต่ำกว่า EMA26" };

    let sma200;
    if (!d.smaPresent) sma200 = { status: "MISSING", label: "—", thaiLabel: "ไม่มีข้อมูล", thaiDetail: "ไม่มีข้อมูล SMA200" };
    else if (d.aboveSma) sma200 = { status: "PASS", label: "Pass", thaiLabel: "ผ่าน", thaiDetail: `ราคาอยู่เหนือ SMA200 (${distStr})` };
    else if (d.dist != null && d.dist >= -3) sma200 = { status: "NEAR", label: "Near", thaiLabel: "ใกล้", thaiDetail: `ราคาต่ำกว่า SMA200 ไม่เกิน 3% (${distStr})` };
    else sma200 = { status: "FAIL", label: "Fail", thaiLabel: "ไม่ผ่าน", thaiDetail: `ราคาต่ำกว่า SMA200 (${distStr})` };

    let volume;
    if (d.vol == null) volume = { status: "MISSING", label: "Missing", thaiLabel: "ไม่มีข้อมูล", thaiDetail: "ไม่มีข้อมูลวอลุ่ม" };
    else if (d.vol >= 1.5) volume = { status: "STRONG", label: "Strong", thaiLabel: "แรง", thaiDetail: `วอลุ่ม ${volStr} (≥1.5x เฉลี่ย 5 วัน)` };
    else if (d.vol >= 1.0) volume = { status: "CONFIRMED", label: "Confirmed", thaiLabel: "ยืนยัน", thaiDetail: `วอลุ่ม ${volStr} (≥1x ยืนยัน)` };
    else if (d.vol >= 0.85) volume = { status: "NEAR", label: "Near", thaiLabel: "ใกล้ยืนยัน", thaiDetail: `วอลุ่ม ${volStr} (ใกล้ยืนยัน)` };
    else volume = { status: "FAIL", label: "Fail", thaiLabel: "ไม่ผ่าน", thaiDetail: `วอลุ่ม ${volStr} (ต่ำกว่าเฉลี่ย)` };

    return { ema, sma200, volume };
  }

  // ----------------------------------------------------------------- conflicts (kept for compatibility)
  function detectSignalConflicts(input) {
    input = input || {};
    const d = derive(input);
    const c = [];
    const bullishSignal = d.emaBull || d.newBull || !!input.isOngoingBullishTrend || !!input.isBullishWatchlist;
    if (d.rsi != null && d.rsi <= 35 && (d.emaBear || d.belowSma)) c.push({ code: "RSI_BUY_BEARISH_TREND", severity: "medium", message: "RSI looks cheap, but the main trend is still bearish.", thaiMessage: "RSI ดูเหมือนถูก แต่แนวโน้มหลักยังเป็นขาลง" });
    if (d.emaBull && d.belowSma) c.push({ code: "EMA_BULL_BELOW_SMA200", severity: "medium", message: "Short-term momentum improves, but long-term trend is not confirmed.", thaiMessage: "โมเมนตัมระยะสั้นดีขึ้น แต่ยังต่ำกว่า SMA200" });
    if (d.newBull && d.vol != null && d.vol < 1.0) c.push({ code: "BULL_NO_VOLUME", severity: "low", message: "EMA crossed up but volume has not confirmed.", thaiMessage: "EMA ตัดขึ้นแล้ว แต่วอลุ่มยังไม่ยืนยัน" });
    if (bullishSignal && d.riskHigh) c.push({ code: "BULL_MARKET_RISK", severity: "high", message: "Asset signal is positive, but market risk is elevated.", thaiMessage: "สัญญาณรายตัวดี แต่ความเสี่ยงตลาดสูง" });
    return c;
  }

  // ----------------------------------------------------------------- signal score
  function calculateTimingScore(input) {
    input = input || {};
    const d = derive(input);
    const gates = evaluateGates(d);
    const components = {};
    const detail = {};
    const reasons = [];
    const thaiReasons = [];
    const warnings = [];
    function r(en, th) { reasons.push(en); thaiReasons.push(th); }
    function w(code, sev, en, th) { warnings.push({ code: code, severity: sev, message: en, thaiMessage: th }); }
    const gapStr = d.gap != null ? `${d.gap >= 0 ? "+" : ""}${d.gap.toFixed(2)}%` : "—";
    const distStr = d.dist != null ? `${d.dist >= 0 ? "+" : ""}${d.dist.toFixed(1)}%` : "—";
    const volStr = d.vol != null ? `${d.vol.toFixed(2)}x` : "—";

    // ---- PART 3: EMA12/26 (50) ----
    let ema = 0;
    if (!d.emaPresent) {
      detail.ema = "ไม่มีข้อมูล EMA12/EMA26 → 0/50";
    } else if (d.emaBull) {
      ema = 35;
      let bonus = 0;
      if (d.daysBull === 1) bonus = 15; else if (d.daysBull === 2) bonus = 10; else if (d.daysBull === 3) bonus = 5;
      ema += bonus;
      r("EMA12 is above EMA26", "EMA12 อยู่เหนือ EMA26");
      detail.ema = bonus > 0
        ? `EMA12 เหนือ EMA26 (+35) และเพิ่งตัดขึ้น ${d.daysBull} วัน (+${bonus}) → ${ema}/50`
        : `EMA12 เหนือ EMA26 (gap ${gapStr}) +35${d.daysBull != null ? ` · ตัดขึ้นมา ${d.daysBull} วัน (เกิน 3 วัน ไม่มีโบนัส)` : ""} → ${ema}/50`;
    } else {
      if (d.emaNear) { ema = 10; r("EMA12 is near crossing above EMA26", "EMA12 ใกล้ตัดขึ้น EMA26"); detail.ema = `EMA12 ใกล้ตัดขึ้น EMA26 (gap ${gapStr}) → 10/50`; }
      else { ema = 0; detail.ema = `EMA12 ต่ำกว่า EMA26 (gap ${gapStr}) → 0/50`; }
      if (d.newBear) { ema = Math.min(ema, 5); w("EMA_BELOW", "medium", "EMA12 is below EMA26. Momentum is weak.", "EMA12 ต่ำกว่า EMA26 โมเมนตัมยังอ่อน"); detail.ema = `EMA12 เพิ่งตัดลง EMA26 → จำกัดไม่เกิน 5 → ${ema}/50`; }
    }
    components.ema = clamp(Math.round(ema), 0, 50);

    // ---- PART 4: SMA200 (35) ----
    let sma = 0;
    if (!d.smaPresent) {
      detail.sma200 = "ไม่มีข้อมูลราคา/SMA200 → 0/35";
    } else if (d.aboveSma) {
      sma = 25;
      if (d.recentReclaim) { sma += 10; r("Price recently reclaimed SMA200", "ราคากลับขึ้นเหนือ SMA200"); detail.sma200 = `ราคาเหนือ SMA200 (+25) และเพิ่งกลับขึ้นเหนือ (${d.daysSmaReclaim} วัน) (+10) → ${sma}/35`; }
      else { r("Price is above SMA200", "ราคาอยู่เหนือ SMA200"); detail.sma200 = `ราคาเหนือ SMA200 (${distStr}) +25 → ${sma}/35`; }
      if (d.dist != null && d.dist > 25) w("EXTENDED", "low", "Price is far above SMA200 and may be extended.", "ราคาอยู่สูงกว่า SMA200 มาก อาจเริ่มไกลฐาน");
    } else {
      if (d.dist != null && d.dist >= -3) { sma = 5; r("Price is near reclaiming SMA200", "ราคาใกล้กลับขึ้นเหนือ SMA200"); detail.sma200 = `ราคาต่ำกว่า SMA200 เล็กน้อย (${distStr}) ใกล้กลับขึ้น → 5/35`; }
      else { sma = 0; w("BELOW_SMA200", "medium", "Price is below SMA200. Major trend is not confirmed.", "ราคาต่ำกว่า SMA200 แนวโน้มใหญ่ยังไม่ยืนยัน"); detail.sma200 = `ราคาต่ำกว่า SMA200 (${distStr}) → 0/35`; }
      if (d.recentBreak) { sma = 0; w("SMA200_BREAK", "high", "Price broke below SMA200. Exit risk.", "ราคาหลุด SMA200 มีความเสี่ยงควรออกจากสถานะ"); detail.sma200 = `ราคาเพิ่งหลุด SMA200 (${distStr}) เสี่ยงควรออกจากสถานะ → 0/35`; }
    }
    components.sma200 = clamp(Math.round(sma), 0, 35);

    // ---- PART 5: Volume (15) — confirmation only ----
    let vol = 0;
    let volumeLabel, thaiVolumeLabel;
    if (d.vol == null) { vol = 0; volumeLabel = "Volume Missing"; thaiVolumeLabel = "ไม่มีข้อมูลวอลุ่ม"; detail.volume = "ไม่มีข้อมูลวอลุ่ม → 0/15"; }
    else if (d.vol >= 2.0) { vol = 15; volumeLabel = "Very Strong Volume"; thaiVolumeLabel = "วอลุ่มแรงมาก"; r("Volume is very strong", "วอลุ่มแรงมาก"); detail.volume = `วอลุ่ม ${volStr} ของค่าเฉลี่ย 5 วัน (≥2x) → 15/15`; }
    else if (d.vol >= 1.5) { vol = 12; volumeLabel = "Strong Volume Confirmed"; thaiVolumeLabel = "วอลุ่ม confirm แรง"; r("Volume strongly confirms", "วอลุ่ม confirm แรง"); detail.volume = `วอลุ่ม ${volStr} (≥1.5x) → 12/15`; }
    else if (d.vol >= 1.0) { vol = 9; volumeLabel = "Volume Confirmed"; thaiVolumeLabel = "วอลุ่ม confirm"; r("Volume confirms", "วอลุ่ม confirm"); detail.volume = `วอลุ่ม ${volStr} (≥1x) → 9/15`; }
    else if (d.vol >= 0.85) { vol = 5; volumeLabel = "Near Volume Confirm"; thaiVolumeLabel = "วอลุ่มใกล้ confirm"; detail.volume = `วอลุ่ม ${volStr} (ใกล้ confirm) → 5/15`; }
    else { vol = 2; volumeLabel = "Volume Not Confirmed"; thaiVolumeLabel = "วอลุ่มยังไม่ confirm"; w("WEAK_VOLUME", "low", "Volume has not confirmed.", "วอลุ่มยังไม่ confirm"); detail.volume = `วอลุ่ม ${volStr} (ต่ำกว่าเฉลี่ย) → 2/15`; }
    components.volume = clamp(Math.round(vol), 0, 15);

    // ---- total (sum of rounded components so the breakdown always adds up) ----
    let score = clamp(components.ema + components.sma200 + components.volume, 0, 100);

    // data quality
    const dq = { status: input.dataQualityStatus || "ok", missing: [], confidence: "high" };
    if (!d.emaPresent) { dq.missing.push("ema"); dq.confidence = "low"; }
    if (!d.smaPresent) { dq.missing.push("sma200"); if (dq.confidence !== "low") dq.confidence = "medium"; }
    if (d.vol == null) { dq.missing.push("volume"); if (dq.confidence === "high") dq.confidence = "medium"; }
    if (String(input.dataQualityStatus || "").toUpperCase().indexOf("INSUFFICIENT") >= 0) dq.confidence = "low";

    const band = bandFor(score);
    const calcEn = `EMA12/26 ${components.ema}/50 + SMA200 ${components.sma200}/35 + Volume ${components.volume}/15 = ${score}/100`;
    const calcTh = `EMA12/26 ${components.ema}/50 + SMA200 ${components.sma200}/35 + Volume ${components.volume}/15 = ${score}/100`;

    return {
      score: score,
      signalScore: score,
      grade: band.grade,
      label: band.label,
      thaiLabel: band.thaiLabel,
      signalLabel: band.label,
      thaiSignalLabel: band.thaiLabel,
      color: band.color,
      components: components,
      componentDetail: detail,
      max: { ema: 50, sma200: 35, volume: 15 },
      gates: gates,
      volumeLabel: volumeLabel,
      thaiVolumeLabel: thaiVolumeLabel,
      reasons: reasons.slice(0, 5),
      thaiReasons: thaiReasons.slice(0, 5),
      warnings: warnings,
      conflicts: detectSignalConflicts(input),
      calculationExplanation: calcEn,
      thaiCalculationExplanation: calcTh,
      dataQuality: dq
    };
  }

  // ----------------------------------------------------------------- quadrant (kept)
  function calculateQuadrant(opts) {
    opts = opts || {};
    const t = fin(opts.timingScore);
    let q = fin(opts.qualityScore);
    if (q == null) q = fin(opts.fallbackQualityScore);
    if (q == null || t == null) return { quadrant: "TIMING_ONLY", label: "Signal Only", thaiLabel: "ดูสัญญาณอย่างเดียว", timingScore: t, qualityScore: q };
    const hiT = t >= 65, hiQ = q >= 65;
    if (hiQ && hiT) return { quadrant: "QUALITY_LEADER", label: "Quality Leader / Best Setup", thaiLabel: "หุ้นคุณภาพดี + จังหวะดี", timingScore: t, qualityScore: q };
    if (hiQ && !hiT) return { quadrant: "GOOD_WAIT", label: "Good Asset, Wait", thaiLabel: "สินทรัพย์ดี แต่จังหวะยังไม่มา", timingScore: t, qualityScore: q };
    if (!hiQ && hiT) return { quadrant: "TRADING_ONLY", label: "Trading Setup Only", thaiLabel: "จังหวะเทรดดี แต่คุณภาพต้องระวัง", timingScore: t, qualityScore: q };
    return { quadrant: "AVOID", label: "Avoid / Low Priority", thaiLabel: "ยังไม่น่าสนใจ", timingScore: t, qualityScore: q };
  }
  function estimateFallbackQuality(input) {
    input = input || {};
    const t = lc(input.assetType);
    if (t.indexOf("index") >= 0 || t.indexOf("etf") >= 0) return 70;
    if (t.indexOf("fund") >= 0 || t.indexOf("rmf") >= 0 || t.indexOf("ssf") >= 0) return 65;
    return null;
  }

  // ----------------------------------------------------------------- PART 9-10: gate-driven action
  const ACTION_META = {
    SELL_ALL:              { section: "urgent", actionCategory: "URGENT", priority: 9 },
    SELL_FIRST:            { section: "urgent", actionCategory: "URGENT", priority: 8 },
    BUY_MORE:              { section: "buy",    actionCategory: "BUY",    priority: 7 },
    HOLD_ADD:              { section: "buy",    actionCategory: "BUY",    priority: 7 },
    BUY_FIRST_WAIT_VOLUME: { section: "watch",  actionCategory: "WATCH",  priority: 5 },
    BUY_FIRST_SMALL:       { section: "watch",  actionCategory: "WATCH",  priority: 4 },
    WATCH_CLOSELY:         { section: "watch",  actionCategory: "WATCH",  priority: 4 },
    WATCH_WAIT:            { section: "watch",  actionCategory: "WATCH",  priority: 3 },
    AVOID_WAIT:            { section: "none",   actionCategory: "INFO",   priority: 1 },
    DATA_WAITING:          { section: "none",   actionCategory: "INFO",   priority: 0 }
  };

  function recommendAction(input, timingScoreResult) {
    input = input || {};
    const ts = timingScoreResult || calculateTimingScore(input);
    const d = derive(input);
    const g = ts.gates || evaluateGates(d);
    const isHolding = !!input.isHolding;
    const sufficient = d.emaPresent && d.smaPresent;

    let key, action, thaiAction, reason, thaiReason;

    if (!sufficient) {
      key = "DATA_WAITING"; action = "Data Waiting"; thaiAction = "รอข้อมูล";
      reason = "Not enough data to evaluate signal."; thaiReason = "ข้อมูลไม่พอสำหรับประเมินสัญญาณ";
    } else if (d.belowSma) { // RULE 1: price < SMA200 (strongest risk rule) — RULE 3 for watchlist + EMA up
      if (isHolding) { key = "SELL_ALL"; action = "Sell All / Exit"; thaiAction = "ขายหมด / ออกจากสถานะ"; reason = "Price is below SMA200; the major trend is not confirmed."; thaiReason = "ราคาต่ำกว่า SMA200 แนวโน้มใหญ่ยังไม่ยืนยัน"; }
      else if (d.emaBull) { key = "BUY_FIRST_SMALL"; action = "Buy First Tranche Small / Watch"; thaiAction = "ซื้อไม้แรกเล็ก ๆ / เฝ้าดู"; reason = "EMA turned positive but price is still below SMA200."; thaiReason = "EMA เริ่มเป็นบวก แต่ราคายังต่ำกว่า SMA200 จึงยังไม่ควรซื้อเพิ่ม"; }
      else { key = "AVOID_WAIT"; action = "Avoid / Wait"; thaiAction = "รอก่อน"; reason = "Price is below SMA200; the major trend is not confirmed."; thaiReason = "ราคาต่ำกว่า SMA200 แนวโน้มใหญ่ยังไม่ยืนยัน"; }
    } else { // price >= SMA200
      if (d.emaBull) {
        if (d.vol != null && d.vol >= 1.0) { // RULE 4
          if (isHolding) { key = "HOLD_ADD"; action = "Hold / Add"; thaiAction = "ถือต่อ / เพิ่มได้"; }
          else { key = "BUY_MORE"; action = "Buy More / Add"; thaiAction = "ซื้อเพิ่ม / เพิ่มน้ำหนัก"; }
          reason = "EMA positive, price above SMA200, and volume confirms the signal."; thaiReason = "EMA เป็นบวก ราคาอยู่เหนือ SMA200 และวอลุ่มยืนยันสัญญาณ";
        } else { // RULE 5
          key = "BUY_FIRST_WAIT_VOLUME"; action = "Buy First Tranche / Wait for Volume"; thaiAction = "ซื้อไม้แรก / รอวอลุ่มยืนยันก่อนเพิ่ม";
          reason = "EMA and SMA200 pass, but volume has not confirmed yet."; thaiReason = "EMA และ SMA200 ผ่านแล้ว แต่วอลุ่มยังไม่ confirm";
        }
      } else if (g.ema.status === "NEAR") { // RULE 6
        key = "WATCH_CLOSELY"; action = "Watch Closely"; thaiAction = "เฝ้าดูใกล้ชิด";
        reason = "Price is above SMA200 but EMA has not confirmed yet."; thaiReason = "ราคาอยู่เหนือ SMA200 แต่ EMA ยังไม่ยืนยัน";
      } else { // RULE 2: EMA12 < EMA26 and price >= SMA200
        if (isHolding) { key = "SELL_FIRST"; action = "Sell First Tranche / Reduce"; thaiAction = "ขายไม้แรก / ลดน้ำหนัก"; }
        else { key = "WATCH_WAIT"; action = "Watch / Wait"; thaiAction = "เฝ้าดู / รอก่อน"; }
        reason = "EMA12 is below EMA26; short-term momentum is weak."; thaiReason = "EMA12 ต่ำกว่า EMA26 โมเมนตัมระยะสั้นอ่อน";
      }
    }

    // Gate-aware explanation (volume must not override a bad EMA/SMA trend)
    let explanation = reason;
    let thaiExplanation = thaiReason;
    const volStrong = g.volume.status === "STRONG" || g.volume.status === "CONFIRMED";
    if (volStrong && (g.ema.status !== "PASS" || g.sma200.status !== "PASS")) {
      explanation = "Volume is strong, but the EMA/SMA200 trend gates are not passed. Volume alone is not enough to buy.";
      thaiExplanation = "วอลุ่มแรง แต่ EMA และ SMA200 ยังไม่ผ่าน จึงยังไม่ควรซื้อ เพราะวอลุ่มอย่างเดียวไม่ใช่เหตุผลซื้อ";
    }

    const meta = ACTION_META[key] || ACTION_META.WATCH_WAIT;
    return {
      key: key,
      action: action,
      thaiAction: thaiAction,
      finalAction: action,
      thaiFinalAction: thaiAction,
      section: meta.section,
      actionCategory: meta.actionCategory,
      priority: meta.priority,
      watchlistOpportunity: key === "BUY_MORE" || key === "BUY_FIRST_SMALL" || key === "BUY_FIRST_WAIT_VOLUME",
      reason: reason,
      thaiReason: thaiReason,
      explanation: explanation,
      thaiExplanation: thaiExplanation,
      confidence: (ts.dataQuality && ts.dataQuality.confidence) || "medium",
      warnings: ts.warnings || []
    };
  }

  // ----------------------------------------------------------------- signal-state classification
  // Mirrors the AI Boom Universe taxonomy (the user's preferred model): the SIGNAL
  // STATE (fresh cross / near cross / ongoing trend) leads; Score is just supporting.
  // Thresholds match AI Boom exactly: fresh <= 3 bars, near EMA gap 1%, near SMA 1.5%.
  const FRESH_SIGNAL_DAYS = 3, NEAR_EMA_GAP_PCT = 1.0, NEAR_SMA_DIST_PCT = 1.5;
  const SIGNAL_GROUPS = {
    new_bullish:           { label: "New Bullish Signal", thaiLabel: "สัญญาณตัดขึ้นใหม่", tone: "bull", direction: "bull", fresh: true },
    new_bearish:           { label: "New Bearish Signal", thaiLabel: "สัญญาณตัดลงใหม่", tone: "bear", direction: "bear", fresh: true },
    bullish_watch:         { label: "Bullish Watchlist", thaiLabel: "ใกล้ตัดขึ้น / เฝ้าซื้อ", tone: "watch-bull", direction: "bull", fresh: false },
    bearish_watch:         { label: "Bearish Watchlist", thaiLabel: "ใกล้ตัดลง / เฝ้าระวัง", tone: "watch-bear", direction: "bear", fresh: false },
    ongoing_bullish:       { label: "Ongoing Bullish Trend", thaiLabel: "ขาขึ้นต่อเนื่อง", tone: "bull", direction: "bull", fresh: false },
    ongoing_bearish:       { label: "Ongoing Bearish Trend", thaiLabel: "ขาลงต่อเนื่อง", tone: "bear", direction: "bear", fresh: false },
    neutral:               { label: "Neutral / Sideway", thaiLabel: "เป็นกลาง / ไซด์เวย์", tone: "neutral", direction: "neutral", fresh: false },
    nav_waiting_technical: { label: "Waiting for Technical Data", thaiLabel: "รอข้อมูลเทคนิค", tone: "waiting", direction: "na", fresh: false },
    insufficient:          { label: "Insufficient Data", thaiLabel: "ข้อมูลไม่พอ", tone: "waiting", direction: "na", fresh: false }
  };

  function classifySignal(input) {
    input = input || {};
    const d = derive(input);
    // Parity with AI Boom's original classifySignal: a usable "latest price"
    // requires BOTH a finite price AND a non-empty date. Without the date guard
    // a data-missing asset would be mis-bucketed into nav_waiting_technical.
    const hasLatestPrice = d.price != null && !!input.latestDate;
    const emaInsufficient = !d.emaPresent;
    const smaInsufficient = !d.smaPresent;
    const insufficient = emaInsufficient && smaInsufficient;
    const inFresh = (n) => n != null && n >= 0 && n <= FRESH_SIGNAL_DAYS;
    // A cross only counts as a LIVE fresh signal if price/EMA is still on the
    // matching side NOW. Without this guard a whipsaw reclaim (price reclaimed
    // SMA200 a few days ago then fell back below) would be read as new_bullish/buy
    // even though the trend has reversed. Mirrors derive()'s recentReclaim/recentBreak.
    const freshBull = (d.emaBull && (!!input.isNewBullishSignal || inFresh(d.daysBull))) || (d.aboveSma && inFresh(d.daysSmaReclaim));
    const freshBear = (d.emaBear && (!!input.isNewBearishSignal || inFresh(d.daysBear))) || (d.belowSma && inFresh(d.daysSmaBreak));
    const absGap = d.gap != null ? Math.abs(d.gap) : null;
    const absDist = d.dist != null ? Math.abs(d.dist) : null;
    const nearEmaBull = d.emaBear && absGap != null && absGap <= NEAR_EMA_GAP_PCT;
    const nearEmaBear = d.emaBull && absGap != null && absGap <= NEAR_EMA_GAP_PCT;
    const nearSmaBull = d.belowSma && absDist != null && absDist <= NEAR_SMA_DIST_PCT;
    const nearSmaBear = d.aboveSma && absDist != null && absDist <= NEAR_SMA_DIST_PCT;
    const earlyBullish = (d.emaBull && !d.aboveSma) || (d.aboveSma && !d.emaBull);
    const earlyBearish = (d.emaBear && !d.belowSma) || (d.belowSma && !d.emaBear);
    const bullishCount = (d.emaBull ? 1 : 0) + (d.aboveSma ? 1 : 0);
    const bearishCount = (d.emaBear ? 1 : 0) + (d.belowSma ? 1 : 0);
    const ongoingBullish = bullishCount > 0 && bearishCount === 0 && !freshBull;
    const ongoingBearish = bearishCount > 0 && bullishCount === 0 && !freshBear;

    let groupKey;
    if (!emaInsufficient && smaInsufficient && hasLatestPrice) groupKey = "nav_waiting_technical";
    else if (freshBull) groupKey = "new_bullish";
    else if (freshBear) groupKey = "new_bearish";
    else if (insufficient) groupKey = hasLatestPrice ? "nav_waiting_technical" : "insufficient";
    else if (!ongoingBullish && !ongoingBearish && (nearEmaBull || nearSmaBull || earlyBullish)) groupKey = "bullish_watch";
    else if (!ongoingBullish && !ongoingBearish && (nearEmaBear || nearSmaBear || earlyBearish)) groupKey = "bearish_watch";
    else if (ongoingBullish) groupKey = "ongoing_bullish";
    else if (ongoingBearish) groupKey = "ongoing_bearish";
    else groupKey = "neutral";

    const meta = SIGNAL_GROUPS[groupKey];
    return {
      groupKey: groupKey, label: meta.label, thaiLabel: meta.thaiLabel, tone: meta.tone,
      direction: meta.direction, fresh: meta.fresh,
      emaBull: d.emaBull, emaBear: d.emaBear, aboveSma: d.aboveSma, belowSma: d.belowSma,
      daysSinceEmaBullishCross: d.daysBull, daysSinceEmaBearishCross: d.daysBear
    };
  }

  // Action driven by the SIGNAL STATE (not the score), holding-aware.
  function actionFromSignal(cls, input) {
    input = input || {};
    cls = cls || classifySignal(input);
    const isHolding = !!input.isHolding;
    const below = cls.belowSma, above = cls.aboveSma;
    let key, action, thaiAction, section, thaiReason;
    switch (cls.groupKey) {
      case "new_bullish":
        if (below) { key = "BUY_FIRST_SMALL"; action = "Buy First Tranche Small / Watch"; thaiAction = "ซื้อไม้แรกเล็ก ๆ / เฝ้าดู"; section = "watch"; thaiReason = "EMA ตัดขึ้นใหม่ แต่ราคายังต่ำกว่า SMA200"; }
        else if (isHolding) { key = "HOLD_ADD"; action = "Hold / Add"; thaiAction = "ถือต่อ / เพิ่มได้"; section = "buy"; thaiReason = "EMA เพิ่งตัดขึ้น และราคาอยู่เหนือ SMA200"; }
        else { key = "BUY_MORE"; action = "Buy More / Add"; thaiAction = "ซื้อเพิ่ม / ซื้อไม้แรก"; section = "buy"; thaiReason = "EMA เพิ่งตัดขึ้น และราคาอยู่เหนือ SMA200"; }
        break;
      case "ongoing_bullish":
        if (isHolding) { key = "HOLD_ADD"; action = "Hold"; thaiAction = "ถือต่อ"; section = "buy"; }
        else { key = "BUY_FIRST_WAIT_VOLUME"; action = "Follow / Wait for pullback"; thaiAction = "ตามเทรนด์ / รอย่อ"; section = "watch"; }
        thaiReason = "ขาขึ้นต่อเนื่อง ยังไม่มีสัญญาณตัดใหม่";
        break;
      case "bullish_watch":
        key = "WATCH_CLOSELY"; action = "Watch Closely"; thaiAction = "เฝ้าดูใกล้ชิด"; section = "watch"; thaiReason = "ใกล้เกิดสัญญาณบวก ยังไม่ยืนยัน";
        break;
      case "new_bearish":
        if (below) { if (isHolding) { key = "SELL_ALL"; action = "Sell All / Exit"; thaiAction = "ขายหมด / ออกจากสถานะ"; section = "urgent"; } else { key = "AVOID_WAIT"; action = "Avoid / Wait"; thaiAction = "รอก่อน"; section = "none"; } thaiReason = "EMA ตัดลงใหม่ และราคาต่ำกว่า SMA200"; }
        else { if (isHolding) { key = "SELL_FIRST"; action = "Sell First Tranche / Reduce"; thaiAction = "ขายไม้แรก / ลดน้ำหนัก"; section = "urgent"; } else { key = "WATCH_WAIT"; action = "Watch / Wait"; thaiAction = "เฝ้าดู / รอก่อน"; section = "watch"; } thaiReason = "EMA ตัดลงใหม่ โมเมนตัมอ่อน"; }
        break;
      case "ongoing_bearish":
        if (below) { if (isHolding) { key = "SELL_ALL"; action = "Sell All / Exit"; thaiAction = "ขายหมด / ออกจากสถานะ"; section = "urgent"; } else { key = "AVOID_WAIT"; action = "Avoid / Wait"; thaiAction = "รอก่อน"; section = "none"; } }
        else { if (isHolding) { key = "SELL_FIRST"; action = "Sell First Tranche / Reduce"; thaiAction = "ขายไม้แรก / ลดน้ำหนัก"; section = "urgent"; } else { key = "WATCH_WAIT"; action = "Watch / Wait"; thaiAction = "เฝ้าดู / รอก่อน"; section = "watch"; } }
        thaiReason = "ขาลงต่อเนื่อง";
        break;
      case "bearish_watch":
        if (isHolding) { key = "WATCH_CLOSELY"; action = "Watch Risk Closely"; thaiAction = "เฝ้าระวังใกล้ชิด"; section = "watch"; } else { key = "WATCH_WAIT"; action = "Watch / Wait"; thaiAction = "เฝ้าดู / รอก่อน"; section = "watch"; }
        thaiReason = "ใกล้เกิดสัญญาณลบ ยังไม่ยืนยัน";
        break;
      case "nav_waiting_technical":
      case "insufficient":
        key = "DATA_WAITING"; action = "Data Waiting"; thaiAction = "รอข้อมูล"; section = "none"; thaiReason = "ข้อมูลไม่พอสำหรับประเมินสัญญาณ";
        break;
      default:
        // Section must match the action code (WATCH_WAIT -> "watch") so the
        // Action Center's section grouping and action filter stay consistent.
        key = "WATCH_WAIT"; action = "Neutral / Wait"; thaiAction = "เป็นกลาง / รอ"; section = "watch"; thaiReason = "สัญญาณยังผสม ยังไม่ชัดเจน";
    }
    const meta = ACTION_META[key] || { actionCategory: "INFO", priority: 0 };
    return {
      key: key, action: action, thaiAction: thaiAction, finalAction: action, thaiFinalAction: thaiAction,
      section: section, actionCategory: meta.actionCategory, priority: meta.priority,
      reason: thaiReason, thaiReason: thaiReason, explanation: thaiReason, thaiExplanation: thaiReason,
      signalGroup: cls.groupKey, signalLabel: cls.thaiLabel, watchlistOpportunity: section === "buy" && !isHolding
    };
  }

  // ----------------------------------------------------------------- convenience
  function scoreAsset(input, opts) {
    opts = opts || {};
    const timing = calculateTimingScore(input);
    const quadrant = calculateQuadrant({
      timingScore: timing.score,
      qualityScore: opts.qualityScore != null ? opts.qualityScore : (input && input.qualityScore),
      fallbackQualityScore: opts.fallbackQualityScore != null ? opts.fallbackQualityScore : estimateFallbackQuality(input)
    });
    const recommendation = recommendAction(input, timing);
    return { timing: timing, gates: timing.gates, quadrant: quadrant, recommendation: recommendation };
  }

  function fromScannerItem(item, ctx) {
    item = item || {};
    ctx = ctx || {};
    return {
      canonicalSymbol: item.providerSymbol || item.displaySymbol,
      displaySymbol: item.displaySymbol,
      assetName: item.name,
      assetType: item.assetType,
      latestPrice: item.close,
      latestDate: item.latestDate,
      ema12: item.ema12,
      ema26: item.ema26,
      sma200: item.sma200,
      sma200Status: item.sma200Status,
      isNewBullishSignal: item.signal === "EMA_BULLISH_CROSS",
      isBullishWatchlist: item.signal === "NEAR_EMA_BULLISH_CROSS",
      daysSinceEmaBullishCross: item.daysSinceCrossover,
      volumeRatio: item.latestVolumeRatio != null ? item.latestVolumeRatio : item.volumeRatio,
      volumeConfirmationStatus: item.volumeConfirmation,
      marketRiskLevel: ctx.marketRiskLevel,
      marketRiskScore: ctx.marketRiskScore,
      dataQualityStatus: item.sourceType
    };
  }

  // ----------------------------------------------------------------- UI helper
  function renderTimingChip(timing, opts) {
    if (!timing) return "";
    opts = opts || {};
    const s = fin(timing.score);
    const color = timing.color || scoreColor(s);
    if (s == null) return '<span class="ts-chip ts-na">—</span>';
    const label = opts.showLabel === false ? "" : `<span class="ts-lab">${timing.thaiLabel || ""}</span>`;
    return `<span class="ts-chip" style="--ts:${color}"><span class="ts-num">${s}</span>${label}</span>`;
  }

  const SIGNAL_TONE_CLASS = {
    bull: "sig-bull",
    bear: "sig-bear",
    "watch-bull": "sig-watch-bull",
    "watch-bear": "sig-watch-bear",
    neutral: "sig-neutral",
    waiting: "sig-waiting"
  };
  function signalToneClass(tone) { return SIGNAL_TONE_CLASS[tone] || "sig-neutral"; }

  function escapeChip(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // Shared PRIMARY headline chip: the AI-Boom-style signal state. Every page
  // renders this so the whole app speaks one signal language.
  // opts: { size: "sm", lang: "en"|"th" (default th) }
  function renderSignalChip(signal, opts) {
    if (!signal || !signal.thaiLabel) return "";
    opts = opts || {};
    const tone = signalToneClass(signal.tone);
    const size = opts.size === "sm" ? " sig-chip-sm" : "";
    const label = opts.lang === "en" ? (signal.label || signal.thaiLabel) : signal.thaiLabel;
    return '<span class="signal-state-chip ' + tone + size + '"><span class="sig-dot"></span><strong>' + escapeChip(label) + "</strong></span>";
  }

  // One-call summary used by every page: signal state (PRIMARY) + holding-aware
  // action + the numeric score (SECONDARY). Keeps all pages consistent.
  function summarizeAsset(input) {
    input = input || {};
    const signal = classifySignal(input);
    const action = actionFromSignal(signal, input);
    const timing = calculateTimingScore(input);
    return { signal: signal, action: action, timing: timing, score: timing.score };
  }

  const Scoring = {
    version: "2.0",
    calculateTimingScore: calculateTimingScore,
    calculateSignalScore: calculateTimingScore,
    classifySignal: classifySignal,
    actionFromSignal: actionFromSignal,
    summarizeAsset: summarizeAsset,
    renderSignalChip: renderSignalChip,
    signalToneClass: signalToneClass,
    SIGNAL_GROUPS: SIGNAL_GROUPS,
    evaluateGates: evaluateGates,
    detectSignalConflicts: detectSignalConflicts,
    calculateQuadrant: calculateQuadrant,
    estimateFallbackQuality: estimateFallbackQuality,
    recommendAction: recommendAction,
    scoreAsset: scoreAsset,
    fromScannerItem: fromScannerItem,
    bandFor: bandFor,
    scoreColor: scoreColor,
    renderTimingChip: renderTimingChip,
    ACTION_META: ACTION_META
  };

  if (typeof module !== "undefined" && module.exports) module.exports = Scoring;
  if (global) global.Scoring = Scoring;
})(typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : this);
