/*
 * signal-quality.js — centralized Signal QUALITY Score engine.
 *
 * NOTE: This is NOT a fundamental quality score and NOT Magic Formula. It does
 * not use ROE/ROIC/PE/debt/margin. It measures the quality & reliability of the
 * CURRENT TECHNICAL signal only — "สัญญาณนี้น่าเชื่อถือแค่ไหน?".
 *
 * Weighting (total 100), per the user's priority:
 *   EMA12/EMA26 quality .......... 45
 *   SMA200 confirmation .......... 25
 *   Volume confirmation .......... 20
 *   Signal consistency / risk .... 10
 *
 * One shared source of truth consumed by Action Center, Technical Signals, Thai
 * Stock Scanner, Asset 360, Compare, Watchlist, Portfolio Status, Data Snapshot.
 * Do NOT duplicate this logic in pages — call window.SignalQuality.* (browser)
 * or require() (node test). Pure, side-effect free, missing-data tolerant.
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

  const MAX = { ema: 50, sma200: 35, volume: 15 };

  // The merged Signal Score lives in scoring.js. This module is the presentation
  // layer (chip + breakdown card) over the SAME number — Timing and Signal Quality
  // are now one score.
  function getScoring() {
    if (typeof window !== "undefined" && window.Scoring) return window.Scoring;
    if (typeof require === "function") { try { return require("./scoring"); } catch (e) { return null; } }
    return null;
  }

  function qualityBand(score) {
    if (score >= 85) return { grade: "A", label: "Excellent Signal Quality", thaiLabel: "สัญญาณคุณภาพสูงมาก", color: "#10b981" };
    if (score >= 70) return { grade: "B", label: "Strong Signal Quality", thaiLabel: "สัญญาณคุณภาพดี", color: "#14b8a6" };
    if (score >= 55) return { grade: "C", label: "Moderate Signal Quality", thaiLabel: "สัญญาณพอใช้ / ต้องดูประกอบ", color: "#f59e0b" };
    if (score >= 40) return { grade: "D", label: "Weak Signal Quality", thaiLabel: "สัญญาณยังอ่อน", color: "#fb923c" };
    return { grade: "E", label: "Poor / Unconfirmed Signal", thaiLabel: "สัญญาณยังไม่น่าเชื่อถือ", color: "#f43f5e" };
  }
  function scoreColor(score) { return qualityBand(fin(score) || 0).color; }

  // Normalize the raw input into safe numbers + derived booleans.
  function derive(input) {
    input = input || {};
    const price = fin(input.latestPrice);
    const ema12 = fin(input.ema12);
    const ema26 = fin(input.ema26);
    const sma200 = fin(input.sma200);
    const rsi = fin(input.rsi14);

    let vol = fin(input.volumeRatio);
    if (vol == null) {
      const v = fin(input.volume);
      const a5 = fin(input.averageVolume5D);
      const a20 = fin(input.averageVolume20D);
      if (v != null && a5 != null && a5 > 0) vol = v / a5;
      else if (v != null && a20 != null && a20 > 0) vol = v / a20;
    }

    const emaBull = ema12 != null && ema26 != null ? ema12 > ema26 : input.emaTrendStatus === "EMA_BULLISH";
    const emaBear = ema12 != null && ema26 != null ? ema12 < ema26 : input.emaTrendStatus === "EMA_BEARISH";
    const aboveSma = price != null && sma200 != null ? price > sma200 : input.sma200Status === "ABOVE_SMA200";
    const belowSma = price != null && sma200 != null ? price < sma200 : input.sma200Status === "BELOW_SMA200";

    const daysBull = fin(input.daysSinceEmaBullishCross);
    const daysBear = fin(input.daysSinceEmaBearishCross);
    const newBull = !!input.isNewBullishSignal || (daysBull != null && daysBull >= 1 && daysBull <= 3);
    const newBear = !!input.isNewBearishSignal || (daysBear != null && daysBear >= 1 && daysBear <= 3);
    const ongoingBear = !!input.isOngoingBearishTrend || lc(input.trendClassification).indexOf("bearish") >= 0;

    // EMA gap %
    let gap = fin(input.emaGapPercent);
    if (gap == null && ema12 != null && ema26 != null && ema26 !== 0) gap = ((ema12 - ema26) / ema26) * 100;

    // Distance to SMA200 %
    let dist = fin(input.distanceToSma200Percent);
    if (dist == null && price != null && sma200 != null && sma200 !== 0) dist = ((price - sma200) / sma200) * 100;

    // SMA200 reclaim / breakdown (prefer explicit flags, else derive from previous bar)
    const prevClose = fin(input.previousClose);
    const prevSma = fin(input.previousSma200);
    let reclaim = !!input.recentSma200Reclaim;
    let breakdown = !!input.recentSma200Break;
    if (!reclaim && aboveSma && prevClose != null && prevSma != null && prevClose <= prevSma) reclaim = true;
    if (!breakdown && belowSma && prevClose != null && prevSma != null && prevClose >= prevSma) breakdown = true;

    const lvl = lc(input.marketRiskLevel);
    const riskVeryHigh = lvl.indexOf("very high") >= 0 || lvl === "veryhigh" || lvl.indexOf("วิกฤต") >= 0;
    const riskHigh = !riskVeryHigh && (lvl.indexOf("high") >= 0 || lvl.indexOf("hedge") >= 0 || lvl.indexOf("สูง") >= 0);

    return {
      price, ema12, ema26, sma200, rsi, vol,
      emaBull, emaBear, aboveSma, belowSma,
      daysBull, daysBear, newBull, newBear, ongoingBear,
      gap, dist, reclaim, breakdown, lvl, riskHigh, riskVeryHigh
    };
  }

  // ----------------------------------------------------------------- main
  // Delegates to the single merged engine (scoring.js) and reshapes the result
  // for the breakdown card (EMA 55 / SMA200 30 / Volume 15).
  function calculateSignalQualityScore(input) {
    input = input || {};
    const S = getScoring();
    let nowIso = null; try { nowIso = new Date().toISOString(); } catch (e) { nowIso = null; }
    if (!S || typeof S.calculateTimingScore !== "function") {
      return {
        score: null, grade: "E", label: "Unavailable", thaiLabel: "ไม่พร้อมใช้งาน", color: "#94a3b8",
        componentScores: { emaScore: null, sma200Score: null, volumeScore: null, dataQualityPenalty: 0 },
        max: { emaScore: MAX.ema, sma200Score: MAX.sma200, volumeScore: MAX.volume },
        reasons: [], thaiReasons: [], warnings: [], thaiWarnings: [], explanation: "", thaiExplanation: "",
        missingData: [], calculatedAt: nowIso
      };
    }
    const t = S.calculateTimingScore(input);
    const rec = typeof S.recommendAction === "function" ? S.recommendAction(input, t) : null;
    const cs = t.components || {};
    const mx = t.max || { ema: MAX.ema, sma200: MAX.sma200, volume: MAX.volume };
    const miss = (t.dataQuality && t.dataQuality.missing) || [];
    const thaiReasons = (t.thaiReasons || t.reasons || []).slice(0, 6);
    const reasonsEn = (t.reasons || []).slice(0, 6);
    const warnings = (t.warnings || []).map((w) => w.message || "").filter(Boolean);
    const thaiWarnings = (t.warnings || []).map((w) => w.thaiMessage || w.message || "").filter(Boolean);
    // Gate-aware explanation (from the engine's action logic).
    const explanation = rec ? rec.explanation : `Signal Score ${t.score} — ${t.label}.`;
    const thaiExplanation = rec ? rec.thaiExplanation : `คะแนนสัญญาณ ${t.score} — ${t.thaiLabel}`;
    return {
      score: t.score, signalScore: t.score, grade: t.grade, label: t.label, thaiLabel: t.thaiLabel, color: t.color,
      componentScores: {
        emaScore: miss.indexOf("ema") >= 0 ? null : (cs.ema != null ? cs.ema : null),
        sma200Score: miss.indexOf("sma200") >= 0 ? null : (cs.sma200 != null ? cs.sma200 : null),
        volumeScore: miss.indexOf("volume") >= 0 ? null : (cs.volume != null ? cs.volume : null),
        dataQualityPenalty: 0
      },
      max: { emaScore: mx.ema, sma200Score: mx.sma200, volumeScore: mx.volume },
      gates: t.gates || {},
      finalAction: rec ? rec.action : null,
      thaiFinalAction: rec ? rec.thaiAction : null,
      actionKey: rec ? rec.key : null,
      actionSection: rec ? rec.section : null,
      componentDetail: t.componentDetail || {},
      explanation: explanation,
      thaiExplanation: thaiExplanation,
      reasons: reasonsEn,
      thaiReasons: thaiReasons,
      warnings: warnings,
      thaiWarnings: thaiWarnings,
      calculationExplanation: t.calculationExplanation,
      thaiCalculationExplanation: t.thaiCalculationExplanation,
      missingData: miss,
      calculatedAt: nowIso
    };
  }

  // ----------------------------------------------------------------- PART 19: technical quadrant
  // X = Timing Score, Y = Signal Quality Score. NOT a fundamental quadrant.
  function calculateSignalQuadrant(opts) {
    opts = opts || {};
    const t = fin(opts.timingScore);
    const q = fin(opts.signalQualityScore);
    if (t == null || q == null) {
      return { quadrant: "INSUFFICIENT", label: "Insufficient Data", thaiLabel: "ข้อมูลไม่พอ", timingScore: t, signalQualityScore: q };
    }
    const hiT = t >= 65;
    const hiQ = q >= 70;
    if (hiT && hiQ) return { quadrant: "BEST_TECHNICAL_SETUP", label: "Best Technical Setup", thaiLabel: "จังหวะดี + สัญญาณคุณภาพสูง", timingScore: t, signalQualityScore: q };
    if (hiT && !hiQ) return { quadrant: "FAST_UNCONFIRMED", label: "Fast but Unconfirmed", thaiLabel: "จังหวะมา แต่สัญญาณยังไม่แน่น", timingScore: t, signalQualityScore: q };
    if (!hiT && hiQ) return { quadrant: "GOOD_SIGNAL_WAIT", label: "Good Signal, Wait for Timing", thaiLabel: "สัญญาณดี แต่จังหวะยังไม่มา", timingScore: t, signalQualityScore: q };
    return { quadrant: "AVOID_LOW", label: "Avoid / Low Priority", thaiLabel: "ยังไม่น่าสนใจ", timingScore: t, signalQualityScore: q };
  }

  // ----------------------------------------------------------------- PART 12: UI
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]; }); }

  // Compact chip: "คุณภาพสัญญาณ 82"
  function renderChip(result, opts) {
    if (!result) return "";
    opts = opts || {};
    const s = fin(result.score);
    if (s == null) return '<span class="sq-chip sq-na">—</span>';
    const color = result.color || scoreColor(s);
    const lab = opts.showLabel === false ? "" : `<span class="sq-chip-lab">${esc(opts.thai === false ? "Signal" : "สัญญาณ")}</span>`;
    return `<span class="sq-chip" style="--sq:${color}">${lab}<span class="sq-chip-num">${s}</span></span>`;
  }

  function bar(label, value, max) {
    const v = value == null ? null : value;
    const pct = v == null ? 0 : clamp(Math.round((v / max) * 100), 0, 100);
    const txt = v == null ? "—" : `${v} / ${max}`;
    return `<div class="sq-bar-row">
      <div class="sq-bar-head"><span>${esc(label)}</span><strong>${txt}</strong></div>
      <div class="sq-bar-track"><div class="sq-bar-fill" style="width:${pct}%"></div></div>
    </div>`;
  }

  // Gate status -> tone class
  function gateTone(status) {
    if (status === "PASS" || status === "STRONG" || status === "CONFIRMED") return "sq-gate-pass";
    if (status === "NEAR") return "sq-gate-near";
    if (status === "FAIL") return "sq-gate-fail";
    return "sq-gate-na";
  }
  function renderGates(gates) {
    if (!gates || !gates.ema) return "";
    const row = (name, g) => `<div class="sq-gate ${gateTone(g.status)}">
      <span class="sq-gate-name">${esc(name)}</span>
      <span class="sq-gate-status">${esc(g.thaiLabel || g.label || g.status)}</span>
      <span class="sq-gate-detail">${esc(g.thaiDetail || "")}</span>
    </div>`;
    return `<div class="sq-gates">${row("EMA12/26", gates.ema)}${row("SMA200", gates.sma200)}${row("Volume", gates.volume)}</div>`;
  }
  // Rule summary (Part 16)
  function renderRuleSummary() {
    return `<details class="sq-details sq-rules"><summary>กติกาสัญญาณ (Rules)</summary>
      <div class="sq-rules-grid">
        <div><strong>ซื้อไม้แรก</strong><span>EMA12 &gt; EMA26</span></div>
        <div><strong>ซื้อเพิ่ม</strong><span>EMA12 &gt; EMA26 + ราคา &gt; SMA200 + วอลุ่ม confirm</span></div>
        <div><strong>ขายไม้แรก / ลดน้ำหนัก</strong><span>EMA12 &lt; EMA26</span></div>
        <div><strong>ขายหมด / ออก</strong><span>ราคา &lt; SMA200</span></div>
      </div></details>`;
  }

  // Full SignalQualityScoreCard
  function renderCard(result, opts) {
    if (!result) return "";
    opts = opts || {};
    const s = fin(result.score);
    const color = result.color || scoreColor(s || 0);
    const cs = result.componentScores || {};
    const mx = result.max || { emaScore: MAX.ema, sma200Score: MAX.sma200, volumeScore: MAX.volume };
    const reasons = (opts.thai === false ? result.reasons : result.thaiReasons) || result.reasons || [];
    const warns = (opts.thai === false ? result.warnings : result.thaiWarnings) || result.warnings || [];
    const explain = (opts.thai === false ? result.explanation : result.thaiExplanation) || "";

    const reasonsHtml = reasons.slice(0, 3).map((r) => `<li>${esc(r)}</li>`).join("");
    const warnsHtml = warns.length ? `<ul class="sq-warns">${warns.slice(0, 3).map((w) => `<li>⚠️ ${esc(w)}</li>`).join("")}</ul>` : "";

    const det = result.componentDetail || {};
    const calcRows = [
      ["EMA12/26", cs.emaScore, mx.emaScore, det.ema],
      ["SMA200", cs.sma200Score, mx.sma200Score, det.sma200],
      ["Volume", cs.volumeScore, mx.volumeScore, det.volume]
    ].map(([l, v, m, dt]) => `<div class="sq-calc-row"><span>${esc(l)}</span><strong>${v == null ? "—" : v} / ${m}</strong></div>${dt ? `<div class="sq-calc-detail">${esc(dt)}</div>` : ""}`).join("");
    const penalties = [];
    if (cs.dataQualityPenalty) penalties.push(`Data quality cap ${cs.dataQualityPenalty}`);

    const action = result.thaiFinalAction || result.finalAction;
    const actionBanner = action ? `<div class="sq-action-banner"><span class="sq-action-label">Action</span><strong>${esc(action)}</strong></div>` : "";

    return `<div class="sq-card" style="--sq:${color};--p:${s == null ? 0 : s}">
      <div class="sq-card-top">
        <div class="sq-ring"><span class="sq-ring-num">${s == null ? "—" : s}</span><span class="sq-ring-max">/100</span></div>
        <div class="sq-card-headings">
          <div class="sq-card-title">${esc(opts.thai === false ? "Signal Score" : "คะแนนสัญญาณ")}</div>
          <div class="sq-card-label">${esc(result.thaiLabel || result.label || "")}</div>
          <div class="sq-card-sub">${esc(result.label || "")}</div>
        </div>
      </div>
      ${actionBanner}
      ${renderGates(result.gates)}
      <div class="sq-bars">
        ${bar("EMA12/26", cs.emaScore, mx.emaScore)}
        ${bar("SMA200", cs.sma200Score, mx.sma200Score)}
        ${bar("Volume", cs.volumeScore, mx.volumeScore)}
      </div>
      ${explain ? `<p class="sq-explain">${esc(explain)}</p>` : ""}
      ${reasonsHtml ? `<ul class="sq-reasons">${reasonsHtml}</ul>` : ""}
      ${warnsHtml}
      <details class="sq-details">
        <summary>ดูวิธีคิดคะแนน (View calculation)</summary>
        <div class="sq-calc">
          ${calcRows}
          ${penalties.length ? `<div class="sq-calc-row sq-calc-pen"><span>Penalties</span><strong>${esc(penalties.join(" · "))}</strong></div>` : ""}
          <div class="sq-calc-row" style="border:0;font-weight:800;"><span>รวม</span><strong>${s == null ? "—" : s} / 100</strong></div>
          <div class="sq-calc-note">น้ำหนัก: EMA12/26 50 · SMA200 35 · Volume(5วัน) 15</div>
        </div>
      </details>
      ${renderRuleSummary()}
    </div>`;
  }

  // Convenience: build the SignalQualityScoreInput from a snapshot technicalSignals entry.
  function fromTechnical(canonical, tech, extra) {
    tech = tech || {};
    extra = extra || {};
    return {
      canonicalSymbol: canonical,
      latestPrice: tech.latestClose,
      latestDate: tech.latestDate,
      ema12: tech.ema12,
      ema26: tech.ema26,
      sma200: tech.sma200,
      rsi14: tech.rsi14,
      emaTrendStatus: tech.emaStatus,
      sma200Status: tech.sma200Status,
      volumeRatio: tech.volumeRatio,
      isNewBullishSignal: tech.emaStatus === "EMA_BULLISH" && extra.isNewBullishSignal,
      daysSinceEmaBullishCross: extra.daysSinceEmaBullishCross,
      marketRiskLevel: extra.marketRiskLevel,
      dataQualityStatus: tech.sourceType || extra.dataQualityStatus,
      historicalDataPoints: extra.historicalDataPoints
    };
  }

  const SignalQuality = {
    version: "1.0",
    calculateSignalQualityScore,
    calculate: calculateSignalQualityScore,
    calculateSignalQuadrant,
    qualityBand,
    scoreColor,
    renderChip,
    renderCard,
    fromTechnical,
    MAX
  };

  if (typeof module !== "undefined" && module.exports) module.exports = SignalQuality;
  if (global) global.SignalQuality = SignalQuality;
})(typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : this);
