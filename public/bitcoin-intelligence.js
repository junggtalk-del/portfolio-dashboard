(function () {
  "use strict";

  // ============================================================
  // Bitcoin Intelligence Engine — Phase 1 (core engine, NO UI).
  //
  // A modular intelligence layer that EXTENDS Bitcoin Monitor. It runs ONLY when
  // Load Latest Data executes, and writes a single new snapshot object:
  //   snapshot.bitcoinIntelligence
  // Every page then just READS that object — no recompute on navigation.
  //
  // It reuses the app's existing data + indicator FORMULAS (matching
  // lib/technical-indicators.ts EMA/SMA and the snapshot's RSI) — it does not
  // replace or duplicate any provider/snapshot/indicator. Historical BTC daily
  // candles (2014→today, Yahoo via /api/ohlc) are cached locally and updated
  // incrementally (only the newest candles) — never re-downloaded in full.
  //
  // Sub-engines (each independent, so Phase 2-5 On-chain/Macro/ML/Cycle plug in
  // without touching the Pattern Engine):
  //   Indicators · PatternDetector · MultiTimeframeEngine · SimilarityEngine
  //   ContextEngine · PatternStatistics · ConfidenceEngine · PatternScore
  // ============================================================

  const HISTORY_KEY = "btc_intelligence_history_v1";
  const OHLC_SYMBOL = "BTC-USD";
  const OHLC_START = "2014-01-01";
  const HOLDING_PERIODS = [7, 30, 60, 90, 180, 365];
  // BTC halving dates (last two future ones are estimates).
  const HALVINGS = ["2012-11-28", "2016-07-09", "2020-05-11", "2024-04-20", "2028-04-20"];

  // ---------------------------------------------------------------- small utils
  function num(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }
  function round(v, d) { const n = Number(v); if (!Number.isFinite(n)) return null; const p = Math.pow(10, d == null ? 2 : d); return Math.round(n * p) / p; }
  function mean(a) { const f = a.filter(Number.isFinite); return f.length ? f.reduce((s, v) => s + v, 0) / f.length : null; }
  function median(a) { const f = a.filter(Number.isFinite).slice().sort((x, y) => x - y); if (!f.length) return null; const m = Math.floor(f.length / 2); return f.length % 2 ? f[m] : (f[m - 1] + f[m]) / 2; }
  function stdev(a) { const f = a.filter(Number.isFinite); if (f.length < 2) return 0; const m = mean(f); return Math.sqrt(f.reduce((s, v) => s + (v - m) * (v - m), 0) / f.length); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function dayMs() { return 86400000; }
  function parseDate(s) { const t = Date.parse(String(s).slice(0, 10) + "T00:00:00Z"); return Number.isFinite(t) ? t : null; }
  function addDays(iso, d) { const t = parseDate(iso); return t == null ? iso : new Date(t + d * dayMs()).toISOString().slice(0, 10); }
  function daysBetween(a, b) { const ta = parseDate(a), tb = parseDate(b); return (ta == null || tb == null) ? null : Math.round((tb - ta) / dayMs()); }

  // Shared forward-return helpers (used by SimilarityEngine + DecisionEngine — one
  // implementation, no duplication). No look-ahead: null when i+h runs past data end.
  const HORIZONS_ALL = [7, 30, 60, 90, 180, 365];
  function forwardReturnPct(closes, i, h) { return (i + h < closes.length && closes[i] > 0) ? round((closes[i + h] - closes[i]) / closes[i] * 100, 2) : null; }
  function maxDrawdownPct(closes, i, h) { if (!(closes[i] > 0)) return null; const end = Math.min(i + h, closes.length - 1); let peak = closes[i], mdd = 0; for (let t = i; t <= end; t++) { if (closes[t] > peak) peak = closes[t]; const dd = (closes[t] - peak) / peak * 100; if (dd < mdd) mdd = dd; } return round(mdd, 2); }
  function returnsBundle(closes, i) { const o = {}; HORIZONS_ALL.forEach((h) => { o[h] = forwardReturnPct(closes, i, h); }); return o; }
  // fuzzy-membership helpers for weighted cycle classification (0..1)
  function mUp(x, a, b) { if (a === b) return x >= a ? 1 : 0; const t = (x - a) / (b - a); return t < 0 ? 0 : t > 1 ? 1 : t; }
  function mBell(x, c, w) { const z = (x - c) / (w || 1); return Math.exp(-z * z); }

  function storage() {
    try { if (typeof window !== "undefined" && window.localStorage) return window.localStorage; } catch (e) {}
    if (!storage._mem) { const m = {}; storage._mem = { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; } }; }
    return storage._mem;
  }

  // ============================================================ Indicators
  // Formulas MATCH the app's canonical implementations (lib/technical-indicators.ts
  // calculateEMA/calculateSMA; snapshot RSI). Series variants only — no new math.
  const Indicators = {
    emaSeries(prices, period) {
      const out = new Array(prices.length).fill(null);
      if (!Array.isArray(prices) || prices.length < period || period <= 0) return out;
      const k = 2 / (period + 1);
      let seed = 0; for (let i = 0; i < period; i++) seed += prices[i];
      out[period - 1] = seed / period;
      for (let i = period; i < prices.length; i++) {
        const prev = out[i - 1];
        if (!Number.isFinite(prev) || !Number.isFinite(prices[i])) continue;
        out[i] = (prices[i] - prev) * k + prev;
      }
      return out;
    },
    smaSeries(prices, period) {
      const out = new Array(prices.length).fill(null);
      if (!Array.isArray(prices) || prices.length < period || period <= 0) return out;
      let sum = 0;
      for (let i = 0; i < prices.length; i++) {
        sum += prices[i];
        if (i >= period) sum -= prices[i - period];
        if (i >= period - 1) out[i] = sum / period;
      }
      return out;
    },
    // Per-index RSI over the last `period` deltas (matches the app's calculateRSI).
    rsiSeries(prices, period) {
      period = period || 14;
      const out = new Array(prices.length).fill(null);
      for (let i = period; i < prices.length; i++) {
        let gains = 0, losses = 0, ok = true;
        for (let j = i - period + 1; j <= i; j++) {
          const ch = prices[j] - prices[j - 1];
          if (!Number.isFinite(ch)) { ok = false; break; }
          if (ch >= 0) gains += ch; else losses += Math.abs(ch);
        }
        if (!ok) continue;
        const avgLoss = losses / period;
        out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + (gains / period) / avgLoss);
      }
      return out;
    },
    volumeRatioSeries(volumes, win) {
      win = win || 5;
      const out = new Array(volumes.length).fill(null);
      for (let i = win; i < volumes.length; i++) {
        let s = 0, c = 0;
        for (let j = i - win; j < i; j++) { const v = volumes[j]; if (Number.isFinite(v) && v > 0) { s += v; c++; } }
        const avg = c ? s / c : null;
        if (avg && avg > 0 && Number.isFinite(volumes[i])) out[i] = volumes[i] / avg;
      }
      return out;
    }
  };

  // ============================================================ Pattern keys
  const PATTERNS = {
    BULLISH_RSI_DIVERGENCE: { bullish: true, label: "Bullish RSI Divergence" },
    BEARISH_RSI_DIVERGENCE: { bearish: true, label: "Bearish RSI Divergence" },
    EMA12_BULL_CROSS: { bullish: true, label: "EMA12 Bull Cross" },
    EMA12_BEAR_CROSS: { bearish: true, label: "EMA12 Bear Cross" },
    PRICE_ABOVE_SMA200: { bullish: true, label: "Price above SMA200" },
    PRICE_BELOW_SMA200: { bearish: true, label: "Price below SMA200" },
    GOLDEN_CROSS: { bullish: true, label: "Golden Cross" },
    DEATH_CROSS: { bearish: true, label: "Death Cross" },
    RSI_BELOW_30: { bullish: true, label: "RSI below 30" },
    RSI_ABOVE_70: { bearish: true, label: "RSI above 70" },
    // combinations (treated as one pattern each)
    COMBO_BULL_MOMENTUM: { bullish: true, combo: true, label: "Bull Momentum (EMA↑ · >SMA200 · RSI healthy)" },
    COMBO_BULL_REVERSAL: { bullish: true, combo: true, label: "Bull Reversal (<SMA200 · RSI low · Bullish Div)" },
    COMBO_BEAR_MOMENTUM: { bearish: true, combo: true, label: "Bear Momentum (EMA↓ · <SMA200 · RSI weak)" },
    COMBO_BEAR_REVERSAL: { bearish: true, combo: true, label: "Bear Reversal (>SMA200 · RSI high · Bearish Div)" },
    COMBO_GOLDEN_TREND: { bullish: true, combo: true, label: "Golden-Cross Trend (recent Golden Cross · >SMA200)" }
  };

  // ============================================================ Database builder
  // Every historical day becomes one record with indicator states + patterns.
  function buildDatabase(bars) {
    const dates = bars.map((b) => b.date);
    const closes = bars.map((b) => num(b.close));
    const highs = bars.map((b) => num(b.high));
    const lows = bars.map((b) => num(b.low));
    const volumes = bars.map((b) => num(b.volume));
    const ema12 = Indicators.emaSeries(closes, 12);
    const ema26 = Indicators.emaSeries(closes, 26);
    const sma50 = Indicators.smaSeries(closes, 50);
    const sma200 = Indicators.smaSeries(closes, 200);
    const rsi = Indicators.rsiSeries(closes, 14);
    const volRatio = Indicators.volumeRatioSeries(volumes, 5);
    const n = closes.length;

    // STRICT two-sided pivot detection (5-bar pivot). A genuine RSI divergence is a
    // reversal EVENT, so the pivot is confirmed 2 bars after it forms — this avoids the
    // "every trend bar is a swing" over-firing and makes a flat bar neither a low nor a high.
    const SWING_W = 2;
    const isSwingLow = (i) => {
      if (i < SWING_W || i + SWING_W >= n) return false;
      const c = closes[i]; if (!Number.isFinite(c)) return false;
      for (let j = i - SWING_W; j <= i + SWING_W; j++) { if (j === i) continue; if (!(closes[j] > c)) return false; }
      return true;
    };
    const isSwingHigh = (i) => {
      if (i < SWING_W || i + SWING_W >= n) return false;
      const c = closes[i]; if (!Number.isFinite(c)) return false;
      for (let j = i - SWING_W; j <= i + SWING_W; j++) { if (j === i) continue; if (!(closes[j] < c)) return false; }
      return true;
    };
    function bullishDiv(i) {
      if (!isSwingLow(i) || !Number.isFinite(rsi[i])) return 0;
      for (let j = i - 6; j >= i - 25 && j >= 0; j--) {
        if (!isSwingLow(j) || !Number.isFinite(rsi[j])) continue;
        if (closes[j] > closes[i] && rsi[j] < rsi[i]) return clamp((rsi[i] - rsi[j]) * 3, 20, 100);
      }
      return 0;
    }
    function bearishDiv(i) {
      if (!isSwingHigh(i) || !Number.isFinite(rsi[i])) return 0;
      for (let j = i - 6; j >= i - 25 && j >= 0; j--) {
        if (!isSwingHigh(j) || !Number.isFinite(rsi[j])) continue;
        if (closes[j] < closes[i] && rsi[j] > rsi[i]) return clamp((rsi[j] - rsi[i]) * 3, 20, 100);
      }
      return 0;
    }
    const recent = (arr, i, win) => { for (let k = 0; k <= win; k++) { if (arr[i - k]) return true; } return false; };

    const db = [];
    const bullDivFlags = new Array(n).fill(false), bearDivFlags = new Array(n).fill(false);
    const emaBullFlags = new Array(n).fill(false), goldenFlags = new Array(n).fill(false);

    for (let i = 0; i < n; i++) {
      const c = closes[i];
      const emaState = (Number.isFinite(ema12[i]) && Number.isFinite(ema26[i])) ? (ema12[i] > ema26[i] ? "bull" : ema12[i] < ema26[i] ? "bear" : "neutral") : "na";
      const smaState = (Number.isFinite(sma200[i]) && Number.isFinite(c)) ? (c > sma200[i] ? "above" : c < sma200[i] ? "below" : "at") : "na";
      const patterns = [];
      const add = (key, strength, meta) => patterns.push({ pattern: key, bullish: !!PATTERNS[key].bullish, bearish: !!PATTERNS[key].bearish, strength: round(strength, 1), metadata: meta || null });

      // single patterns
      if (smaState === "above") add("PRICE_ABOVE_SMA200", clamp((c / sma200[i] - 1) * 200, 10, 100), { pct: round((c / sma200[i] - 1) * 100, 2) });
      if (smaState === "below") add("PRICE_BELOW_SMA200", clamp((1 - c / sma200[i]) * 200, 10, 100), { pct: round((c / sma200[i] - 1) * 100, 2) });
      if (i > 0 && Number.isFinite(ema12[i]) && Number.isFinite(ema26[i]) && Number.isFinite(ema12[i - 1]) && Number.isFinite(ema26[i - 1])) {
        if (ema12[i - 1] <= ema26[i - 1] && ema12[i] > ema26[i]) { add("EMA12_BULL_CROSS", clamp(Math.abs(ema12[i] - ema26[i]) / c * 400, 20, 100)); emaBullFlags[i] = true; }
        if (ema12[i - 1] >= ema26[i - 1] && ema12[i] < ema26[i]) add("EMA12_BEAR_CROSS", clamp(Math.abs(ema12[i] - ema26[i]) / c * 400, 20, 100));
      }
      if (i > 0 && Number.isFinite(sma50[i]) && Number.isFinite(sma200[i]) && Number.isFinite(sma50[i - 1]) && Number.isFinite(sma200[i - 1])) {
        if (sma50[i - 1] <= sma200[i - 1] && sma50[i] > sma200[i]) { add("GOLDEN_CROSS", 90); goldenFlags[i] = true; }
        if (sma50[i - 1] >= sma200[i - 1] && sma50[i] < sma200[i]) add("DEATH_CROSS", 90);
      }
      if (Number.isFinite(rsi[i])) {
        if (rsi[i] < 30) add("RSI_BELOW_30", clamp((30 - rsi[i]) * 4, 20, 100), { rsi: round(rsi[i], 1) });
        if (rsi[i] > 70) add("RSI_ABOVE_70", clamp((rsi[i] - 70) * 4, 20, 100), { rsi: round(rsi[i], 1) });
      }
      const bd = bullishDiv(i), rd = bearishDiv(i);
      if (bd > 0) { add("BULLISH_RSI_DIVERGENCE", bd); bullDivFlags[i] = true; }
      if (rd > 0) { add("BEARISH_RSI_DIVERGENCE", rd); bearDivFlags[i] = true; }

      // combinations (one pattern each) — use recent windows for events
      const r = Number.isFinite(rsi[i]) ? rsi[i] : null;
      const recentBullDiv = recent(bullDivFlags, i, 5), recentBearDiv = recent(bearDivFlags, i, 5);
      const recentGolden = recent(goldenFlags, i, 10);
      if (emaState === "bull" && smaState === "above" && r != null && r >= 45 && r <= 65) add("COMBO_BULL_MOMENTUM", 70);
      if (smaState === "below" && r != null && r < 40 && recentBullDiv) add("COMBO_BULL_REVERSAL", 80);
      if (emaState === "bear" && smaState === "below" && r != null && r >= 35 && r <= 55) add("COMBO_BEAR_MOMENTUM", 70);
      if (smaState === "above" && r != null && r > 65 && recentBearDiv) add("COMBO_BEAR_REVERSAL", 80);
      if (recentGolden && smaState === "above") add("COMBO_GOLDEN_TREND", 75);

      // similarity feature vector (computed once, stored on the record)
      const rsiSlope = (Number.isFinite(rsi[i]) && Number.isFinite(rsi[i - 5])) ? rsi[i] - rsi[i - 5] : null;
      const momentum = (i >= 14 && closes[i - 14] > 0) ? (c - closes[i - 14]) / closes[i - 14] : null;
      const trendSlope = (Number.isFinite(sma50[i]) && Number.isFinite(sma50[i - 10]) && sma50[i - 10] > 0) ? (sma50[i] - sma50[i - 10]) / sma50[i - 10] : null;
      let volatility = null;
      if (i >= 14) { const rets = []; for (let j = i - 13; j <= i; j++) if (closes[j - 1] > 0) rets.push((closes[j] - closes[j - 1]) / closes[j - 1]); volatility = stdev(rets); }
      const features = {
        emaRel: (Number.isFinite(ema12[i]) && Number.isFinite(ema26[i]) && c > 0) ? (ema12[i] - ema26[i]) / c : null,
        smaRel: (Number.isFinite(sma200[i]) && sma200[i] > 0) ? (c - sma200[i]) / sma200[i] : null,
        rsi: Number.isFinite(rsi[i]) ? rsi[i] / 100 : null,
        rsiSlope: rsiSlope != null ? rsiSlope / 100 : null,
        emaDist: (Number.isFinite(ema12[i]) && Number.isFinite(ema26[i]) && ema26[i] > 0) ? (ema12[i] - ema26[i]) / ema26[i] : null,
        momentum: momentum,
        volumeRatio: Number.isFinite(volRatio[i]) ? clamp(volRatio[i], 0, 5) : null,
        trendSlope: trendSlope,
        volatility: volatility
      };

      db.push({
        i, date: dates[i], close: round(c, 2),
        ema12: round(ema12[i], 2), ema26: round(ema26[i], 2), sma50: round(sma50[i], 2), sma200: round(sma200[i], 2),
        rsi: round(rsi[i], 2), volumeRatio: round(volRatio[i], 3),
        emaState, smaState, patterns, features
      });
    }
    return { db, closes, dates, highs, lows, volumes };
  }

  // ============================================================ MultiTimeframeEngine
  const MultiTimeframeEngine = {
    // resample daily bars into weekly (bucket by ISO Monday)
    resampleWeekly(bars) {
      const buckets = new Map();
      for (const b of bars) {
        const t = parseDate(b.date); if (t == null) continue;
        const d = new Date(t); const dow = (d.getUTCDay() + 6) % 7; // Mon=0
        const monday = new Date(t - dow * dayMs()).toISOString().slice(0, 10);
        let w = buckets.get(monday);
        if (!w) { w = { date: monday, open: num(b.open), high: num(b.high), low: num(b.low), close: num(b.close), volume: num(b.volume) || 0 }; buckets.set(monday, w); }
        else { w.high = Math.max(w.high, num(b.high)); w.low = Math.min(w.low, num(b.low)); w.close = num(b.close); w.volume += num(b.volume) || 0; }
      }
      return Array.from(buckets.values()).sort((a, b) => a.date < b.date ? -1 : 1);
    },
    stateOf(bars) {
      if (!bars || bars.length < 30) return { available: false };
      const closes = bars.map((b) => num(b.close));
      const ema12 = Indicators.emaSeries(closes, 12), ema26 = Indicators.emaSeries(closes, 26);
      const sma200 = Indicators.smaSeries(closes, 200), rsi = Indicators.rsiSeries(closes, 14);
      const i = closes.length - 1, c = closes[i];
      const emaState = (Number.isFinite(ema12[i]) && Number.isFinite(ema26[i])) ? (ema12[i] > ema26[i] ? "bull" : ema12[i] < ema26[i] ? "bear" : "neutral") : "na";
      const smaState = Number.isFinite(sma200[i]) ? (c > sma200[i] ? "above" : c < sma200[i] ? "below" : "at") : "na";
      const bias = (emaState === "bull" && smaState === "above") ? "bullish" : (emaState === "bear" && smaState === "below") ? "bearish" : "neutral";
      return { available: true, close: round(c, 2), emaState, smaState, rsi: round(rsi[i], 2), bias, bars: bars.length };
    },
    build(bars) {
      const daily = this.stateOf(bars);
      const weekly = this.stateOf(this.resampleWeekly(bars));
      let agreement = "n/a", bias = "neutral";
      if (daily.available && weekly.available) {
        if (daily.bias === weekly.bias && daily.bias !== "neutral") { agreement = "aligned"; bias = daily.bias === "bullish" ? "strong-bullish" : "strong-bearish"; }
        else if (daily.bias === "neutral" || weekly.bias === "neutral") { agreement = "partial"; bias = daily.bias !== "neutral" ? daily.bias : weekly.bias; }
        else { agreement = "conflict"; bias = "mixed"; }
      }
      // Architecture note: 4H timeframe plugs in here later with the same stateOf() shape.
      return { weekly, daily, combined: { bias, agreement } };
    }
  };

  // ============================================================ ContextEngine
  const ContextEngine = {
    halving(dateIso) {
      let last = null, next = null;
      for (const h of HALVINGS) { if (h <= dateIso) last = h; else if (!next) next = h; }
      const daysSince = last ? daysBetween(last, dateIso) : null;
      const daysTo = next ? daysBetween(dateIso, next) : null;
      let phase = "unknown";
      if (daysTo != null && daysTo <= 180) phase = "pre-halving";
      else if (daysSince != null && daysSince <= 365) phase = "post-halving-accumulation";
      else if (daysSince != null && daysSince <= 550) phase = "post-halving-markup";
      else if (daysSince != null) phase = "late-cycle";
      const cyclePosition = (daysSince != null && daysTo != null && (daysSince + daysTo) > 0) ? round(daysSince / (daysSince + daysTo), 3) : null;
      return { phase, lastHalving: last, nextHalving: next, daysSince, daysTo, cyclePosition };
    },
    classify(rec, db, i) {
      const sma200Rising = (i >= 30 && db[i - 30] && Number.isFinite(rec.sma200) && Number.isFinite(db[i - 30].sma200)) ? rec.sma200 > db[i - 30].sma200 : null;
      let marketType = "neutral";
      if (rec.smaState === "above" && sma200Rising === true) marketType = "bull";
      else if (rec.smaState === "below" && sma200Rising === false) marketType = "bear";
      else if (rec.smaState === "above") marketType = "recovery";
      else if (rec.smaState === "below") marketType = "decline";
      // risk proxy (historical): risk-on when above SMA200 + RSI>50; else risk-off
      const riskProxy = (rec.smaState === "above" && Number.isFinite(rec.rsi) && rec.rsi >= 50) ? "risk-on" : "risk-off";
      return { marketType, smaState: rec.smaState, riskProxy, halving: this.halving(rec.date) };
    }
  };

  // ============================================================ SimilarityEngine
  const SimilarityEngine = {
    FEATURES: ["emaRel", "smaRel", "rsi", "rsiSlope", "emaDist", "momentum", "volumeRatio", "trendSlope", "volatility"],
    WEIGHTS: { emaRel: 1.2, smaRel: 1.4, rsi: 1.1, rsiSlope: 0.8, emaDist: 1.0, momentum: 1.1, volumeRatio: 0.6, trendSlope: 1.0, volatility: 0.8 },
    compare(built, topN) {
      topN = topN || 20;
      const db = built.db, closes = built.closes;
      const F = this.FEATURES;
      const complete = db.filter((r) => F.every((k) => Number.isFinite(r.features[k])));
      if (complete.length < 60) return [];
      const stats = {};
      F.forEach((k) => { const vals = complete.map((r) => r.features[k]); stats[k] = { m: mean(vals), s: stdev(vals) || 1 }; });
      const z = (r) => F.map((k) => (r.features[k] - stats[k].m) / stats[k].s);
      const cur = db[db.length - 1];
      if (!F.every((k) => Number.isFinite(cur.features[k]))) return [];
      const zc = z(cur);
      const cutoffI = db.length - 30; // exclude the last ~30 days (avoid trivial self-match)
      const scored = [];
      for (const r of complete) {
        if (r.i >= cutoffI) continue;
        const zr = z(r);
        let dist = 0; F.forEach((k, idx) => { const d = zc[idx] - zr[idx]; dist += this.WEIGHTS[k] * d * d; });
        scored.push({ i: r.i, date: r.date, close: r.close, dist: Math.sqrt(dist) });
      }
      if (!scored.length) return [];
      const md = median(scored.map((s) => s.dist)) || 1;
      scored.forEach((s) => { s.similarity = Math.round(100 * Math.exp(-s.dist / md)); });
      scored.sort((a, b) => a.dist - b.dist);
      return scored.slice(0, topN).map((s) => {
        const rec = db[s.i];
        const ctx = ContextEngine.classify(rec, db, s.i);
        return {
          i: s.i, date: s.date, similarity: s.similarity, close: s.close,
          returns: returnsBundle(closes, s.i),
          forward30: forwardReturnPct(closes, s.i, 30), forward90: forwardReturnPct(closes, s.i, 90), // back-compat
          maxDrawdown90: maxDrawdownPct(closes, s.i, 90),
          patternScore: patternScore(rec).total,
          marketPhase: ctx.marketType,
          context: { marketType: ctx.marketType, halvingPhase: ctx.halving.phase }
        };
      });
    }
  };

  // ============================================================ PatternStatistics
  const PatternStatistics = {
    compute(built) {
      const db = built.db, closes = built.closes;
      const n = closes.length;
      // occurrences: event patterns fire on their day; state patterns fire on ENTRY (transition).
      // Persistent (multi-day) conditions are counted once on ENTRY; only true one-day
      // EVENTS (EMA/Golden/Death crosses, confirmed divergences) are counted per fire.
      const stateKeys = { PRICE_ABOVE_SMA200: 1, PRICE_BELOW_SMA200: 1, RSI_BELOW_30: 1, RSI_ABOVE_70: 1, COMBO_BULL_MOMENTUM: 1, COMBO_BEAR_MOMENTUM: 1, COMBO_GOLDEN_TREND: 1, COMBO_BULL_REVERSAL: 1, COMBO_BEAR_REVERSAL: 1 };
      const occ = {}; // key -> [indices]
      const activePrev = {};
      for (let i = 0; i < n; i++) {
        const activeNow = {};
        for (const p of db[i].patterns) activeNow[p.pattern] = true;
        for (const key of Object.keys(activeNow)) {
          if (stateKeys[key]) { if (!activePrev[key]) (occ[key] = occ[key] || []).push(i); }
          else (occ[key] = occ[key] || []).push(i); // events: every fire
        }
        for (const key of Object.keys(activeNow)) activePrev[key] = true;
        for (const key of Object.keys(activePrev)) if (!activeNow[key]) activePrev[key] = false;
      }
      const out = {};
      for (const key of Object.keys(occ)) {
        const idxs = occ[key];
        const byHorizon = {};
        for (const h of HOLDING_PERIODS) {
          const rets = [], dds = [];
          for (const i of idxs) {
            if (i + h >= n) continue;
            const entry = closes[i]; if (!(entry > 0)) continue;
            rets.push((closes[i + h] - entry) / entry * 100);
            // max drawdown within [i, i+h]
            let peak = entry, mdd = 0;
            for (let t = i; t <= i + h; t++) { if (closes[t] > peak) peak = closes[t]; const dd = (closes[t] - peak) / peak * 100; if (dd < mdd) mdd = dd; }
            dds.push(mdd);
          }
          if (!rets.length) { byHorizon[h] = { samples: 0 }; continue; }
          const pos = rets.filter((r) => r > 0).length;
          byHorizon[h] = {
            samples: rets.length,
            positivePct: round(pos / rets.length * 100, 1),
            negativePct: round((rets.length - pos) / rets.length * 100, 1),
            avgReturn: round(mean(rets), 2), medianReturn: round(median(rets), 2),
            bestReturn: round(Math.max.apply(null, rets), 2), worstReturn: round(Math.min.apply(null, rets), 2),
            avgDrawdown: round(mean(dds), 2), maxDrawdown: round(Math.min.apply(null, dds), 2)
          };
        }
        out[key] = { label: PATTERNS[key] ? PATTERNS[key].label : key, combo: !!(PATTERNS[key] && PATTERNS[key].combo), bullish: !!(PATTERNS[key] && PATTERNS[key].bullish), bearish: !!(PATTERNS[key] && PATTERNS[key].bearish), occurrences: idxs.length, byHorizon };
      }
      // Baseline: forward stats over EVERY day (the "hold on a random day" reference). Lets each
      // pattern be judged by its EDGE over baseline, not its raw (BTC-drift-inflated) win rate.
      const baseHz = {};
      for (const h of HOLDING_PERIODS) {
        const rets = [];
        for (let i = 0; i + h < n; i++) { const entry = closes[i]; if (entry > 0) rets.push((closes[i + h] - entry) / entry * 100); }
        if (rets.length) { const pos = rets.filter((r) => r > 0).length; baseHz[h] = { samples: rets.length, positivePct: round(pos / rets.length * 100, 1), avgReturn: round(mean(rets), 2), medianReturn: round(median(rets), 2) }; }
        else baseHz[h] = { samples: 0 };
      }
      out._baseline = { baseline: true, label: "Baseline (ถือปกติ)", byHorizon: baseHz };
      return out;
    }
  };

  // ============================================================ PatternScore (bullish bias 0-100)
  function patternScore(rec) {
    const comp = {};
    // EMA (25): ema12 vs ema26
    if (rec.emaState === "bull") comp.ema = round(clamp(12.5 + Math.abs((rec.ema12 - rec.ema26) / rec.close) * 400, 12.5, 25), 1);
    else if (rec.emaState === "bear") comp.ema = round(clamp(12.5 - Math.abs((rec.ema12 - rec.ema26) / rec.close) * 400, 0, 12.5), 1);
    else comp.ema = 12.5;
    // SMA (20): position vs SMA200
    if (rec.smaState === "above") comp.sma = round(clamp(10 + (rec.close / rec.sma200 - 1) * 120, 10, 20), 1);
    else if (rec.smaState === "below") comp.sma = round(clamp(10 - (1 - rec.close / rec.sma200) * 120, 0, 10), 1);
    else comp.sma = 10;
    // RSI (15): healthy 45-60 best; overbought / oversold reduced
    const r = Number.isFinite(rec.rsi) ? rec.rsi : 50;
    comp.rsi = round(clamp(15 - Math.abs(r - 52) / 52 * 15 - (r > 72 ? (r - 72) * 0.3 : 0), 0, 15), 1);
    // Divergence (20)
    const bull = rec.patterns.find((p) => p.pattern === "BULLISH_RSI_DIVERGENCE");
    const bear = rec.patterns.find((p) => p.pattern === "BEARISH_RSI_DIVERGENCE");
    comp.divergence = bull ? round(clamp(10 + bull.strength / 10, 10, 20), 1) : bear ? round(clamp(10 - bear.strength / 10, 0, 10), 1) : 10;
    // Trend (10): SMA50 slope proxy via emaState + smaState
    comp.trend = rec.smaState === "above" && rec.emaState === "bull" ? 10 : rec.smaState === "below" && rec.emaState === "bear" ? 0 : 5;
    // Volume (10): confirmation
    const vr = Number.isFinite(rec.volumeRatio) ? rec.volumeRatio : 1;
    comp.volume = round(clamp(vr >= 1.5 ? 10 : vr >= 1 ? 6 + (vr - 1) * 8 : vr * 6, 0, 10), 1);
    const total = round(comp.ema + comp.sma + comp.rsi + comp.divergence + comp.trend + comp.volume, 0);
    return { total, components: comp };
  }

  // ============================================================ ConfidenceEngine
  const ConfidenceEngine = {
    compute(inp) {
      // inp: { dominantOccurrences, avgSimilarity, mtfAgreement, indicatorConsistency, dataCompleteness }
      const occ = clamp(Math.log10((inp.dominantOccurrences || 0) + 1) / Math.log10(50) * 100, 0, 100); // ~50 occ = full
      const sim = clamp(inp.avgSimilarity || 0, 0, 100);
      const agree = inp.mtfAgreement === "aligned" ? 100 : inp.mtfAgreement === "partial" ? 55 : inp.mtfAgreement === "conflict" ? 20 : 50;
      const cons = clamp((inp.indicatorConsistency || 0) * 100, 0, 100);
      const data = clamp(inp.dataCompleteness || 0, 0, 100);
      const score = round(occ * 0.25 + sim * 0.25 + agree * 0.2 + cons * 0.2 + data * 0.1, 0);
      const level = score >= 80 ? "Very High" : score >= 60 ? "High" : score >= 40 ? "Medium" : "Low";
      return { level, score, components: { occurrences: round(occ, 0), similarity: round(sim, 0), agreement: round(agree, 0), consistency: round(cons, 0), dataCompleteness: round(data, 0) } };
    }
  };

  // ============================================================ DecisionEngine (Phase 2)
  // Transforms the historical DB + existing sub-engine outputs into an actionable
  // "what usually happened when today's setup occurred" dataset. Consumes the existing
  // engine only (PatternDetector states, ContextEngine, patternScore, Indicators,
  // MultiTimeframeEngine) — it does not recompute indicators. All look-ahead-free.
  const DecisionEngine = {
    CYCLE_ERAS: [
      { key: "2015_bottom", label: "2015 Bottom → Accumulation", from: "2014-09-01", to: "2015-10-31" },
      { key: "2016_bull", label: "2016 Bull Build-up", from: "2015-11-01", to: "2017-06-30" },
      { key: "2017_bull", label: "2017 Parabolic Bull", from: "2017-07-01", to: "2017-12-31" },
      { key: "2018_bear", label: "2018 Bear", from: "2018-01-01", to: "2019-01-31" },
      { key: "2019_recovery", label: "2019 Recovery", from: "2019-02-01", to: "2020-02-29" },
      { key: "2020_bull", label: "2020 Bull Cycle", from: "2020-03-01", to: "2021-04-30" },
      { key: "2021_top", label: "2021 Double Top", from: "2021-05-01", to: "2021-12-31" },
      { key: "2022_bear", label: "2022 Bear", from: "2022-01-01", to: "2022-12-31" },
      { key: "2023_recovery", label: "2023 Recovery", from: "2023-01-01", to: "2023-12-31" },
      { key: "2024_cycle", label: "2024 Post-Halving Cycle", from: "2024-01-01", to: "2026-12-31" }
    ],
    eraOf(date) { for (const e of this.CYCLE_ERAS) if (date >= e.from && date <= e.to) return e; return null; },
    rsiBand(rsi) { if (!Number.isFinite(rsi)) return "na"; if (rsi < 30) return "os"; if (rsi < 45) return "low"; if (rsi < 55) return "mid"; if (rsi < 70) return "high"; return "ob"; },
    signature(rec) { return rec.emaState + "|" + rec.smaState + "|" + this.rsiBand(rec.rsi); },
    signatureLabel(rec) {
      const ema = rec.emaState === "bull" ? "EMA12 > EMA26" : rec.emaState === "bear" ? "EMA12 < EMA26" : "EMA flat";
      const sma = rec.smaState === "above" ? "Above SMA200" : rec.smaState === "below" ? "Below SMA200" : "At SMA200";
      const band = { os: "RSI < 30", low: "RSI 30-45", mid: "RSI 45-55", high: "RSI 55-70", ob: "RSI > 70", na: "RSI n/a" }[this.rsiBand(rec.rsi)];
      return [ema, sma, band].join(" · ");
    },
    aggregate(rets, dds) {
      if (!rets.length) return { samples: 0 };
      const pos = rets.filter((r) => r > 0).length;
      return { samples: rets.length, positivePct: round(pos / rets.length * 100, 1), negativePct: round((rets.length - pos) / rets.length * 100, 1), avgReturn: round(mean(rets), 2), medianReturn: round(median(rets), 2), bestReturn: round(Math.max.apply(null, rets), 2), worstReturn: round(Math.min.apply(null, rets), 2), stdev: round(stdev(rets), 2), avgDrawdown: dds.length ? round(mean(dds), 2) : null, maxDrawdown: dds.length ? round(Math.min.apply(null, dds), 2) : null };
    },
    weekMonday(dateIso) { const t = parseDate(dateIso); if (t == null) return null; const d = new Date(t); const dow = (d.getUTCDay() + 6) % 7; return new Date(t - dow * dayMs()).toISOString().slice(0, 10); },
    weeklyBiasMap(bars) {
      const weekly = MultiTimeframeEngine.resampleWeekly(bars);
      const closes = weekly.map((w) => num(w.close));
      const e12 = Indicators.emaSeries(closes, 12), e26 = Indicators.emaSeries(closes, 26), s200 = Indicators.smaSeries(closes, 200);
      const map = {};
      for (let i = 0; i < weekly.length; i++) {
        const c = closes[i];
        const emaB = (Number.isFinite(e12[i]) && Number.isFinite(e26[i])) ? (e12[i] > e26[i] ? 1 : -1) : 0;
        const smaB = Number.isFinite(s200[i]) ? (c > s200[i] ? 1 : -1) : 0;
        map[weekly[i].date] = (emaB + smaB) > 0 ? "wbull" : (emaB + smaB) < 0 ? "wbear" : "wneutral";
      }
      return map;
    },
    evolution(built) {
      const db = built.db, F = ["smaRel", "rsi", "momentum", "emaRel"];
      const complete = db.filter((r) => F.every((k) => Number.isFinite(r.features[k])));
      if (complete.length < 300) return { available: false, top: [] };
      const stats = {}; F.forEach((k) => { const vals = complete.map((r) => r.features[k]); stats[k] = { m: mean(vals), s: stdev(vals) || 1 }; });
      const z = (r) => F.map((k) => (r.features[k] - stats[k].m) / stats[k].s);
      const L = 20, n = db.length;
      const curTraj = [];
      for (let l = 0; l < L; l++) { const r = db[n - 1 - l]; if (!r || !F.every((k) => Number.isFinite(r.features[k]))) return { available: false, top: [] }; curTraj.push(z(r)); }
      const scored = [];
      for (let i = L + 210; i < n - 30; i++) {
        let dist = 0, ok = true;
        for (let l = 0; l < L; l++) { const r = db[i - l]; if (!F.every((k) => Number.isFinite(r.features[k]))) { ok = false; break; } const zr = z(r); for (let f = 0; f < F.length; f++) { const d = curTraj[l][f] - zr[f]; dist += d * d; } }
        if (ok) scored.push({ date: db[i].date, dist: Math.sqrt(dist) });
      }
      if (!scored.length) return { available: false, top: [] };
      scored.sort((a, b) => a.dist - b.dist);
      const eraW = {};
      for (const m of scored.slice(0, 40)) { const era = this.eraOf(m.date); if (!era) continue; const e = eraW[era.key] || (eraW[era.key] = { key: era.key, label: era.label, w: 0, best: null }); e.w += 1 / (m.dist + 0.5); if (!e.best || m.dist < e.best.dist) e.best = m; }
      const eras = Object.values(eraW).sort((a, b) => b.w - a.w);
      const totalW = eras.reduce((s, e) => s + e.w, 0) || 1;
      return { available: true, note: "โครงสร้างที่กำลังคล้ายวัฏจักรในอดีต — ไม่ใช่การพยากรณ์", top: eras.slice(0, 3).map((e) => ({ cycle: e.key, label: e.label, confidence: round(e.w / totalW * 100, 0), matchDate: e.best ? e.best.date : null })) };
    },
    weeklyStats(bars) {
      if (!bars) return { available: false };
      const weekly = MultiTimeframeEngine.resampleWeekly(bars);
      if (weekly.length < 60) return { available: false };
      const closes = weekly.map((w) => num(w.close)), vols = weekly.map((w) => num(w.volume));
      const e12 = Indicators.emaSeries(closes, 12), e26 = Indicators.emaSeries(closes, 26), s50 = Indicators.smaSeries(closes, 50), s200 = Indicators.smaSeries(closes, 200), rsi = Indicators.rsiSeries(closes, 14), vr = Indicators.volumeRatioSeries(vols, 5);
      const i = closes.length - 1, c = closes[i];
      const emaState = (Number.isFinite(e12[i]) && Number.isFinite(e26[i])) ? (e12[i] > e26[i] ? "bull" : e12[i] < e26[i] ? "bear" : "neutral") : "na";
      const smaState = Number.isFinite(s200[i]) ? (c > s200[i] ? "above" : c < s200[i] ? "below" : "at") : "na";
      const wrec = { close: round(c, 2), ema12: round(e12[i], 2), ema26: round(e26[i], 2), sma50: round(s50[i], 2), sma200: round(s200[i], 2), rsi: round(rsi[i], 2), volumeRatio: round(vr[i], 3), emaState, smaState, patterns: [] };
      const score = patternScore(wrec).total;
      const sig = this.signature(wrec), rets = [];
      for (let j = 0; j < weekly.length - 13; j++) {
        // build rr identically to wrec so signature() matches symmetrically (3-way SMA + rounded RSI)
        const rr = { emaState: (Number.isFinite(e12[j]) && Number.isFinite(e26[j])) ? (e12[j] > e26[j] ? "bull" : e12[j] < e26[j] ? "bear" : "neutral") : "na", smaState: Number.isFinite(s200[j]) ? (closes[j] > s200[j] ? "above" : closes[j] < s200[j] ? "below" : "at") : "na", rsi: round(rsi[j], 2) };
        if (this.signature(rr) === sig && closes[j] > 0) rets.push((closes[j + 13] - closes[j]) / closes[j] * 100);
      }
      const pos = rets.filter((r) => r > 0).length;
      return { available: true, patternScore: score, emaState, smaState, rsi: round(rsi[i], 2), bias: (emaState === "bull" && smaState === "above") ? "bullish" : (emaState === "bear" && smaState === "below") ? "bearish" : "neutral", positive13w: rets.length ? round(pos / rets.length * 100, 1) : null, samples13w: rets.length };
    },
    decide(inp) {
      const b90 = inp.byHorizon[90] || {}, hasP = b90.samples > 0;
      const p90 = hasP ? b90.positivePct : null, avg90 = hasP ? b90.avgReturn : null;
      const score = inp.curScore, conf = inp.confidence ? inp.confidence.level : "Low";
      const mtfBias = inp.mtf && inp.mtf.combined ? inp.mtf.combined.bias : "neutral";
      const marketType = inp.marketContext ? inp.marketContext.marketType : "neutral";
      const rationale = []; let label = "Neutral", tone = "neutral";
      if (conf === "Low") { label = "Wait"; tone = "warn"; rationale.push("ความเชื่อมั่นต่ำ — หลักฐานยังไม่พอสรุป"); }
      else if (hasP && p90 >= 65 && score >= 55 && (mtfBias.indexOf("bull") >= 0 || marketType === "bull" || marketType === "recovery")) { label = "Accumulation"; tone = "bull"; rationale.push("ผล 90 วันเป็นบวก " + p90 + "% ในอดีต · Pattern Score " + score + " · โครงสร้างหนุน"); }
      else if (hasP && p90 <= 40 && score <= 40 && (mtfBias.indexOf("bear") >= 0 || marketType === "bear" || marketType === "decline")) { const ob = inp.marketContext && inp.marketContext.smaState === "above"; label = ob ? "Distribution" : "Reduce Risk"; tone = "bear"; rationale.push("ผล 90 วันบวกเพียง " + p90 + "% · Pattern Score " + score + " · โครงสร้างอ่อน"); }
      else { label = "Neutral"; tone = "neutral"; rationale.push("หลักฐานผสม — ผล 90 วันบวก " + (p90 == null ? "-" : p90) + "% · Pattern Score " + score); }
      if (avg90 != null) rationale.push("ผลตอบแทนเฉลี่ย 90 วันในอดีต " + (avg90 > 0 ? "+" : "") + avg90 + "%");
      rationale.push("Multi-timeframe agreement: " + mtfBias);
      return { label, tone, rationale, basis: ["Historical Probability", "Pattern Score", "Confidence", "Market Context", "Multi-Timeframe"] };
    },
    summary(inp) {
      const b90 = inp.byHorizon[90] || {}, b30 = inp.byHorizon[30] || {}, lines = [];
      lines.push("โครงสร้างเทคนิควันนี้เคยเกิด " + inp.occCount + " ครั้ง ตั้งแต่ปี " + String(inp.firstDate).slice(0, 4));
      if (b90.samples) {
        lines.push("ผลตอบแทน 90 วันเป็นบวก " + b90.positivePct + "% ของกรณีในอดีต");
        lines.push("ผลตอบแทนเฉลี่ย " + (b90.avgReturn > 0 ? "+" : "") + b90.avgReturn + "% · มัธยฐาน " + (b90.medianReturn > 0 ? "+" : "") + b90.medianReturn + "%");
        if (b90.avgDrawdown != null) lines.push("ย่อตัวเฉลี่ยระหว่างทาง " + b90.avgDrawdown + "% (แย่สุด " + b90.maxDrawdown + "%)");
      } else if (b30.samples) lines.push("ผลตอบแทน 30 วันเป็นบวก " + b30.positivePct + "% ของกรณีในอดีต");
      lines.push("หลักฐานในอดีตโน้มเอียงไปทาง: " + inp.decision.label);
      lines.push("แต่การย่อตัวชั่วคราวยังเกิดได้เสมอ — นี่คือหลักฐานเชิงสถิติ ไม่ใช่การพยากรณ์");
      return lines.slice(0, 8);
    },
    build(built, current, ctx) {
      const db = built.db, closes = built.closes, dates = built.dates, n = db.length, bars = ctx.bars;
      const curSig = this.signature(current), sigLabel = this.signatureLabel(current);
      const biasByWeek = bars ? this.weeklyBiasMap(bars) : {};

      // occurrence dataset — historical days sharing today's setup signature (current day EXCLUDED)
      const occurrences = [];
      for (let j = 0; j < n - 1; j++) {
        const rec = db[j];
        if (this.signature(rec) !== curSig) continue;
        const c = ContextEngine.classify(rec, db, j);
        occurrences.push({ date: rec.date, idx: j, returns: returnsBundle(closes, j), maxDD90: maxDrawdownPct(closes, j, 90), ctx: { risk: c.riskProxy, market: c.marketType, sma: rec.smaState, halving: c.halving.phase, weekly: biasByWeek[this.weekMonday(addDays(rec.date, -7))] || "wneutral" } });
      }
      const byHorizon = {};
      HORIZONS_ALL.forEach((h) => { const rets = [], dds = []; occurrences.forEach((o) => { if (o.returns[h] != null) { rets.push(o.returns[h]); const dd = maxDrawdownPct(closes, o.idx, h); if (dd != null) dds.push(dd); } }); byHorizon[h] = this.aggregate(rets, dds); });

      // per-day pattern score (one pass) — for ranking + heatmap
      const allScored = db.map((r) => patternScore(r));
      const scores = allScored.map((s) => s.total);
      const curScore = ctx.patternScore ? ctx.patternScore.total : scores[n - 1];
      let better = 0; for (const sc of scores) if (sc > curScore) better++;
      const ranking = { metric: "patternScore", value: curScore, rank: better + 1, total: n, percentile: round((1 - better / n) * 100, 1), topPct: round((better + 1) / n * 100, 2) };

      const compKeys = ["ema", "sma", "rsi", "divergence", "trend", "volume"];
      const compLabel = { ema: "EMA", sma: "SMA", rsi: "RSI", divergence: "Divergence", trend: "Trend", volume: "Volume" };
      const compMax = { ema: 25, sma: 20, rsi: 15, divergence: 20, trend: 10, volume: 10 };
      const curComp = ctx.patternScore ? ctx.patternScore.components : allScored[n - 1].components;
      const heatmap = compKeys.map((k) => {
        const vals = allScored.map((s) => s.components[k]).filter(Number.isFinite);
        const cur = curComp[k]; let below = 0; for (const v of vals) if (v < cur) below++;
        const pctile = round(below / vals.length * 100, 0);
        return { row: compLabel[k], key: k, current: round(cur, 1), currentPct: round(cur / compMax[k] * 100, 0), historicalAvg: round(mean(vals), 1), rankPct: pctile, tone: pctile >= 66 ? "green" : pctile >= 40 ? "yellow" : "red" };
      });

      const evolution = this.evolution(built);
      const weeklyStats = this.weeklyStats(bars);
      const decision = this.decide({ byHorizon, curScore, confidence: ctx.confidence, marketContext: ctx.marketContext, mtf: ctx.multiTimeframe });
      const summary = this.summary({ occCount: occurrences.length, byHorizon, firstDate: dates[0], decision });
      const dataQuality = { samples: n, occurrences: occurrences.length, firstDate: dates[0], lastDate: dates[n - 1], coverage: round(Math.min(100, n / 3650 * 100), 0), missingData: 0, source: "Yahoo BTC-USD daily" };

      return {
        primaryPattern: { signature: curSig, label: sigLabel, key: (ctx.combos && ctx.combos[0]) || (current.patterns[0] && current.patterns[0].pattern) || null },
        setup: { signature: curSig, label: sigLabel, occurrenceCount: occurrences.length, byHorizon, occurrences },
        ranking, heatmap, evolution, weeklyStats, decision, summary, dataQuality
      };
    }
  };

  // ============================================================ CycleIntelligenceEngine (Phase 3)
  // "Where is Bitcoin within its historical market cycle?" — an evidence-based
  // classifier (NOT Elliott/Wyckoff/prediction). Consumes the existing DB + patternScore
  // + ContextEngine + MultiTimeframe + (optional) MarketRegime. Classification is CAUSAL
  // (trailing-only smoothing) so every day — including today — is look-ahead-free.
  const CYCLE_PHASES = ["Capitulation", "Accumulation", "Early Expansion", "Expansion", "Late Expansion", "Distribution"];
  const CYCLE_COLORS = { "Capitulation": "#ef4444", "Accumulation": "#eab308", "Early Expansion": "#84cc16", "Expansion": "#22c55e", "Late Expansion": "#06b6d4", "Distribution": "#f97316" };
  const CycleIntelligenceEngine = {
    PHASES: CYCLE_PHASES, COLORS: CYCLE_COLORS,
    // per-day evidence features. ALL strictly lookback-only: drawdown uses a running max,
    // and the weekly bias reads the PREVIOUS completed week (never the in-progress/same-week
    // bucket, whose weekly close is a future intra-week bar) — so no day peeks forward and the
    // classification is causal for every historical day, including today.
    features(built, biasByWeek) {
      const db = built.db, fArr = new Array(db.length);
      let runMax = -Infinity;
      for (let i = 0; i < db.length; i++) {
        const r = db[i];
        if (Number.isFinite(r.close) && r.close > runMax) runMax = r.close;
        const dd = runMax > 0 ? (r.close - runMax) / runMax : 0;
        const wkb = biasByWeek[DecisionEngine.weekMonday(addDays(r.date, -7))]; // prior completed week (causal)
        fArr[i] = {
          sma: Number.isFinite(r.features.smaRel) ? r.features.smaRel : 0,
          rsi: Number.isFinite(r.rsi) ? r.rsi : 50,
          mom: Number.isFinite(r.features.momentum) ? r.features.momentum : 0,
          vol: Number.isFinite(r.features.volatility) ? r.features.volatility : 0.03,
          volR: Number.isFinite(r.volumeRatio) ? r.volumeRatio : 1,
          dd: dd,
          ema: r.emaState === "bull" ? 1 : r.emaState === "bear" ? -1 : 0,
          wk: wkb === "wbull" ? 1 : wkb === "wbear" ? -1 : 0,
          rslope: Number.isFinite(r.features.rsiSlope) ? r.features.rsiSlope : 0,
          bearDiv: r.patterns.some((p) => p.pattern === "BEARISH_RSI_DIVERGENCE") ? 1 : 0,
          bullDiv: r.patterns.some((p) => p.pattern === "BULLISH_RSI_DIVERGENCE") ? 1 : 0,
          ps: patternScore(r).total
        };
      }
      return fArr;
    },
    phaseScores(f) {
      const S = {};
      S["Capitulation"] = 1.4 * mUp(f.sma, -0.15, -0.5) + 1.2 * mUp(f.rsi, 45, 28) + 1.0 * mUp(-f.mom, 0.10, 0.35) + 0.6 * mUp(f.vol, 0.03, 0.06) + 1.0 * mUp(-f.dd, 0.35, 0.7) + 0.5 * (f.ema < 0 ? 1 : 0) + 0.4 * (f.wk < 0 ? 1 : 0);
      S["Accumulation"] = 1.2 * mBell(f.sma, -0.12, 0.18) + 1.0 * mBell(f.rsi, 45, 9) + 0.8 * mBell(f.mom, 0.0, 0.09) + 0.8 * mUp(-f.dd, 0.15, 0.5) + 0.6 * mUp(f.vol, 0.05, 0.02) + 0.4 * (f.ema >= 0 ? 0.6 : 0.2) + 0.4 * f.bullDiv;
      S["Early Expansion"] = 1.2 * mBell(f.sma, 0.06, 0.18) + 1.0 * (f.ema > 0 ? 1 : 0.2) + 1.0 * mBell(f.rsi, 56, 10) + 1.0 * mUp(f.mom, 0.02, 0.2) + 0.8 * (f.wk > 0 ? 1 : 0.2) + 0.6 * mBell(f.dd, -0.22, 0.18) + 0.5 * mUp(f.ps, 50, 72);
      S["Expansion"] = 1.2 * mBell(f.sma, 0.38, 0.3) + 1.0 * (f.ema > 0 ? 1 : 0.1) + 1.0 * mBell(f.rsi, 63, 9) + 1.0 * mUp(f.mom, 0.1, 0.35) + 0.8 * (f.wk > 0 ? 1 : 0.2) + 0.6 * mBell(f.dd, -0.07, 0.09) + 0.6 * mUp(f.ps, 60, 85);
      S["Late Expansion"] = 1.2 * mUp(f.sma, 0.5, 1.2) + 1.1 * mUp(f.rsi, 66, 82) + 0.8 * mBell(f.dd, -0.03, 0.05) + 0.8 * mUp(f.mom, 0.12, 0.4) + 0.6 * mUp(f.vol, 0.03, 0.06) + 0.4 * (f.wk > 0 ? 1 : 0.3);
      S["Distribution"] = 1.0 * mUp(f.sma, 0.08, 0.5) + 1.2 * mUp(-f.mom, 0.0, 0.18) + 1.0 * mUp(-f.rslope, 0.0, 0.15) + 1.0 * f.bearDiv + 0.8 * (f.wk < 0 ? 1 : 0.2) + 0.6 * mBell(f.dd, -0.12, 0.1);
      return S;
    },
    // trailing (causal) smoothing of phase scores -> per-day label + normalized confidence
    classifyAll(fArr, win) {
      win = win || 14;
      const raw = fArr.map((f) => this.phaseScores(f));
      const labels = new Array(raw.length), confs = new Array(raw.length);
      for (let i = 0; i < raw.length; i++) {
        const acc = {}; CYCLE_PHASES.forEach((p) => (acc[p] = 0));
        const lo = Math.max(0, i - win + 1);
        for (let j = lo; j <= i; j++) CYCLE_PHASES.forEach((p) => (acc[p] += raw[j][p]));
        let sum = 0; CYCLE_PHASES.forEach((p) => (sum += acc[p]));
        let best = CYCLE_PHASES[0]; CYCLE_PHASES.forEach((p) => { if (acc[p] > acc[best]) best = p; });
        labels[i] = best; confs[i] = sum > 0 ? acc[best] / sum : 0;
        raw[i]._smooth = acc; raw[i]._sum = sum;
      }
      return { raw, labels, confs };
    },
    buildSegments(labels, db, closes, minLen) {
      minLen = minLen || 10;
      const segs = []; let cur = null;
      for (let i = 0; i < labels.length; i++) { if (!cur || labels[i] !== cur.phase) { if (cur) segs.push(cur); cur = { phase: labels[i], startI: i, endI: i }; } else cur.endI = i; }
      if (cur) segs.push(cur);
      const merged = [];
      for (const s of segs) { const len = s.endI - s.startI + 1; if (merged.length && len < minLen) merged[merged.length - 1].endI = s.endI; else merged.push({ phase: s.phase, startI: s.startI, endI: s.endI }); }
      return merged.map((s) => {
        const c0 = closes[s.startI], c1 = closes[s.endI]; let peak = c0, mdd = 0;
        for (let t = s.startI; t <= s.endI; t++) { if (closes[t] > peak) peak = closes[t]; const d = peak > 0 ? (closes[t] - peak) / peak * 100 : 0; if (d < mdd) mdd = d; }
        return { phase: s.phase, from: db[s.startI].date, to: db[s.endI].date, startI: s.startI, endI: s.endI, days: s.endI - s.startI + 1, ret: c0 > 0 ? round((c1 - c0) / c0 * 100, 1) : null, maxDD: round(mdd, 1) };
      });
    },
    // causal 20-day feature-trajectory scan (reused for cycle similarity + historical paths)
    trajScan(built, L, excludeLast) {
      const db = built.db, F = ["smaRel", "rsi", "momentum", "emaRel"], n = db.length;
      const complete = db.filter((r) => F.every((k) => Number.isFinite(r.features[k])));
      if (complete.length < 300) return null;
      const stats = {}; F.forEach((k) => { const v = complete.map((r) => r.features[k]); stats[k] = { m: mean(v), s: stdev(v) || 1 }; });
      const z = (r) => F.map((k) => (r.features[k] - stats[k].m) / stats[k].s);
      const cur = []; for (let l = 0; l < L; l++) { const r = db[n - 1 - l]; if (!r || !F.every((k) => Number.isFinite(r.features[k]))) return null; cur.push(z(r)); }
      const scored = [];
      for (let i = L + 210; i < n - excludeLast; i++) {
        let dist = 0, ok = true;
        for (let l = 0; l < L; l++) { const r = db[i - l]; if (!F.every((k) => Number.isFinite(r.features[k]))) { ok = false; break; } const zr = z(r); for (let ff = 0; ff < F.length; ff++) { const d = cur[l][ff] - zr[ff]; dist += d * d; } }
        if (ok) scored.push({ i: i, date: db[i].date, dist: Math.sqrt(dist) });
      }
      scored.sort((a, b) => a.dist - b.dist);
      return scored;
    },
    halvingBucket(dateIso) {
      const h = ContextEngine.halving(dateIso);
      if (h.daysTo != null && h.daysTo <= 180) return "Before Halving";
      if (h.daysSince == null) return "Unknown";
      if (h.daysSince <= 180) return "0-6 months after";
      if (h.daysSince <= 365) return "6-12 months after";
      if (h.daysSince <= 545) return "12-18 months after";
      return "Late Cycle";
    },
    decide(state, score, confPct) {
      const map = { "Capitulation": { label: "Accumulation", tone: "bull" }, "Accumulation": { label: "Accumulation", tone: "bull" }, "Early Expansion": { label: "Accumulation", tone: "bull" }, "Expansion": { label: "Neutral", tone: "neutral" }, "Late Expansion": { label: "Reduce Risk", tone: "warn" }, "Distribution": { label: "Distribution", tone: "bear" } };
      let d = map[state] || { label: "Neutral", tone: "neutral" };
      if (confPct < 45) d = { label: "Wait", tone: "warn" };
      return { label: d.label, tone: d.tone };
    },
    // Public entry (backward-compatible shape). buildAll() additionally returns the
    // internal artifacts (segments/labels/trajScan) so PlaybookEngine can reuse them
    // with NO recomputation of indicators, segments, or trajectory scans.
    build(built, ctx) { return this.buildAll(built, ctx).cycle; },
    buildAll(built, ctx) {
      const db = built.db, closes = built.closes, n = db.length;
      const biasByWeek = ctx.biasByWeek || {};
      const fArr = this.features(built, biasByWeek);
      const cls = this.classifyAll(fArr, 21);            // trailing 21-day smoothing (causal)
      const segments = this.buildSegments(cls.labels, db, closes, 21); // merge <21-day runs for a clean cycle timeline

      // current state — normalized top-3 from the (smoothed) latest day
      const smoothCur = cls.raw[n - 1]._smooth, sumCur = cls.raw[n - 1]._sum || 1;
      const ranked = CYCLE_PHASES.map((p) => ({ state: p, confidence: round(smoothCur[p] / sumCur * 100, 0) })).sort((a, b) => b.confidence - a.confidence);
      const current = { state: ranked[0].state, confidence: ranked[0].confidence, alternatives: ranked.slice(0, 3) };

      // distribution
      const counts = {}; CYCLE_PHASES.forEach((p) => (counts[p] = 0));
      cls.labels.forEach((l) => (counts[l]++));
      const distribution = CYCLE_PHASES.map((p) => ({ phase: p, pct: round(counts[p] / n * 100, 1), current: p === current.state }));

      // trajectory scan -> cycle similarity (by segment) + historical paths (by era, forward)
      const scored = this.trajScan(built, 20, 30) || [];
      const scale = median(scored.slice(0, 200).map((x) => x.dist)) || 1;
      const segOf = new Array(n).fill(-1); segments.forEach((s, si) => { for (let t = s.startI; t <= s.endI; t++) segOf[t] = si; });
      const mergedLabels = segOf.map((si) => si >= 0 ? segments[si].phase : cls.labels[0]); // per-day labels consistent with the merged timeline
      const segBest = {};
      for (const m of scored) { const si = segOf[m.i]; if (si < 0 || si === segments.length - 1) continue; if (!segBest[si] || m.dist < segBest[si]) segBest[si] = m.dist; }
      let simList = Object.keys(segBest).map((si) => { const s = segments[+si]; const era = DecisionEngine.eraOf(s.from); return { phase: s.phase, similarity: Math.round(100 * Math.exp(-segBest[si] / scale)), duration: s.days, avgReturn: s.ret, maxDrawdown: s.maxDD, label: (era ? era.label : s.from) + " · " + s.phase }; });
      simList.sort((a, b) => (b.phase === current.state ? 1 : 0) - (a.phase === current.state ? 1 : 0) || b.similarity - a.similarity);
      const similarity = simList.slice(0, 3);

      const eraW = {};
      for (const m of scored.slice(0, 60)) { const era = DecisionEngine.eraOf(m.date); if (!era) continue; const e = eraW[era.key] || (eraW[era.key] = { key: era.key, label: era.label, w: 0, f90: [], f180: [] }); e.w += 1 / (m.dist + 0.5); const r90 = forwardReturnPct(closes, m.i, 90), r180 = forwardReturnPct(closes, m.i, 180); if (r90 != null) e.f90.push(r90); if (r180 != null) e.f180.push(r180); }
      const eras = Object.values(eraW).sort((a, b) => b.w - a.w);
      const totalW = eras.reduce((s, e) => s + e.w, 0) || 1;
      const paths = eras.slice(0, 3).map((e) => ({ scenario: e.label, probability: round(e.w / totalW * 100, 0), avgForward90: e.f90.length ? round(mean(e.f90), 1) : null, avgForward180: e.f180.length ? round(mean(e.f180), 1) : null }));

      // cycle score (0-100)
      const f = fArr[n - 1];
      const trend = clamp(mUp(f.sma, -0.3, 0.6) * 0.5 + (f.ema > 0 ? 0.3 : f.ema < 0 ? 0 : 0.15) + (f.wk > 0 ? 0.2 : f.wk < 0 ? 0 : 0.1), 0, 1) * 25;
      const momentum = clamp(mUp(f.mom, -0.1, 0.35) * 0.6 + mUp(f.rsi, 35, 72) * 0.4, 0, 1) * 20;
      const simComp = (similarity.length ? similarity[0].similarity / 100 : 0.5) * 20;
      const psComp = clamp(f.ps / 100, 0, 1) * 15;
      const macro = clamp(ctx.marketRegimeScore != null ? ctx.marketRegimeScore / 100 : mUp(f.sma, -0.3, 0.6), 0, 1) * 10;
      const volume = clamp(mUp(f.volR, 0.6, 1.6), 0, 1) * 10;
      const score = { total: Math.round(trend + momentum + simComp + psComp + macro + volume), components: { trend: round(trend, 1), momentum: round(momentum, 1), similarity: round(simComp, 1), patternScore: round(psComp, 1), macro: round(macro, 1), volume: round(volume, 1) } };

      const halving = { bucket: this.halvingBucket(db[n - 1].date), info: ContextEngine.halving(db[n - 1].date) };
      const top = similarity[0] || null;
      const marketStructure = top ? { resembles: top.label, similarity: top.similarity, confidence: current.confidence, duration: top.duration, avgReturn: top.avgReturn, maxDrawdown: top.maxDrawdown } : null;
      const decision = this.decide(current.state, score.total, current.confidence);

      const summary = [];
      summary.push("โครงสร้างตลาดปัจจุบันใกล้เคียง " + current.state + (top ? " ของ " + top.label.split(" · ")[0] + " มากที่สุด" : "") );
      if (top && top.duration) summary.push("หลักฐานในอดีตชี้ว่าเฟสนี้กินเวลาเฉลี่ย ~" + top.duration + " วัน");
      if (top && top.avgReturn != null) summary.push("ผลตอบแทนเฉลี่ยของเฟสนี้ในอดีต " + (top.avgReturn > 0 ? "+" : "") + top.avgReturn + "% (ย่อลึกสุด " + top.maxDrawdown + "%)");
      summary.push("Cycle Score " + score.total + "/100 · ความเชื่อมั่น " + current.confidence + "%");
      summary.push("ช่วง halving: " + halving.bucket);
      summary.push("หลักฐานในอดีตโน้มเอียงไปทาง: " + decision.label);
      summary.push("นี่คือการจำแนกเชิงสถิติจากอดีต ไม่ใช่การพยากรณ์");

      const output = { current, score, distribution, timeline: segments.map((s) => ({ phase: s.phase, from: s.from, to: s.to, days: s.days, ret: s.ret })), similarity, paths, marketStructure, halving: { bucket: halving.bucket, daysSince: halving.info.daysSince, daysTo: halving.info.daysTo, lastHalving: halving.info.lastHalving, nextHalving: halving.info.nextHalving }, decision, summary, updatedAt: ctx.updatedAt || null };
      // return the public output PLUS internal artifacts (segments/labels/trajScan) for PlaybookEngine reuse
      return { cycle: output, segments, labels: mergedLabels, rawLabels: cls.labels, fArr, scored, scale, segOf, segBest };
    }
  };

  // ============================================================ PlaybookEngine (Phase 4)
  // "What did investors historically DO in this cycle phase — and why?" An evidence-based
  // institutional handbook generated ENTIRELY from the existing Cycle + Pattern + Statistics
  // + Context + Regime + Confidence outputs. It RE-USES the cycle engine's already-computed
  // segments/labels/trajectory (no indicator/segment/trajScan recompute) and NEVER says
  // buy/sell or predicts — only historical-evidence framing. Runs only during Load.
  const PLAYBOOK_PROFILES = {
    "Capitulation": {
      order: 0, next: "Accumulation", following: "Early Expansion",
      typical: ["ราคาปรับตัวลงรุนแรงและผันผวนสูงในอดีต", "ความกลัวสูงสุด แรงขายหนาแน่น", "มักซื้อขายต่ำกว่า SMA200 อย่างมีนัยสำคัญ", "ในอดีต downside เริ่มจำกัดหลังช่วงนี้", "การฟื้นตัวมักเป็นแบบค่อยเป็นค่อยไป"],
      suggested: ["Increase Patience", "Continue Accumulating", "Avoid Leverage"],
      endSignals: ["ราคายืนกลับเหนือ SMA200 ได้", "เกิด Bullish Momentum Divergence", "แรงขาย/Volume เริ่มเบาลง", "Weekly Trend เริ่มกลับเป็นบวก"],
      do: ["ทยอยสะสมแบบเฉลี่ยต้นทุน (DCA)", "คงสภาพคล่องบางส่วนไว้", "เฝ้าดู Weekly Trend"],
      dont: ["ใช้เลเวอเรจสวนแนวโน้ม", "ขายตื่นตระหนกที่จุดต่ำ", "ฟันธงจุดต่ำสุดแบบตายตัว"]
    },
    "Accumulation": {
      order: 1, next: "Early Expansion", following: "Expansion",
      typical: ["ราคาแกว่งในกรอบหลังการปรับฐาน", "ความผันผวนเริ่มลดลงจากช่วงก่อนหน้า", "มักสร้างฐานบริเวณ SMA200", "Volume เบาบางในช่วงสะสม", "ในอดีตเป็นช่วงสร้างฐานก่อนแนวโน้มขึ้น"],
      suggested: ["Continue Accumulating", "Hold Core Position", "Avoid Chasing"],
      endSignals: ["ราคายืนเหนือ SMA200 ต่อเนื่อง", "EMA12 ตัดขึ้นเหนือ EMA26", "Weekly Trend เปลี่ยนเป็นบวก", "Volume เริ่มเพิ่มขึ้น"],
      do: ["สะสมเป็นขั้นบันได", "ถือพอร์ตหลักไว้", "รอสัญญาณยืนยันแนวโน้ม"],
      dont: ["ไล่ราคาช่วง breakout ที่ยังไม่ยืนยัน", "คาดหวังผลตอบแทนเร็ว", "ใช้เลเวอเรจสูง"]
    },
    "Early Expansion": {
      order: 2, next: "Expansion", following: "Late Expansion",
      typical: ["แนวโน้มขาขึ้นเริ่มก่อตัว", "ราคายืนเหนือ SMA200 ได้", "EMA เรียงตัวเชิงบวก", "การย่อตัวมักตื้นและสั้น", "Momentum เริ่มแข็งแรงขึ้น"],
      suggested: ["Hold Core Position", "Wait for Pullbacks", "Continue Accumulating"],
      endSignals: ["RSI เข้าเขตร้อนแรงต่อเนื่อง", "การย่อเริ่มลึกและถี่ขึ้น", "Momentum เริ่มแผ่ว", "Weekly Trend อ่อนแรงลง"],
      do: ["ถือพอร์ตหลักตามแนวโน้ม", "เพิ่มสัดส่วนช่วงย่อ", "ติดตาม Weekly Trend"],
      dont: ["ไล่ราคาแท่งพุ่งแรง", "ใช้เลเวอเรจเกินตัว", "ละเลยการบริหารความเสี่ยง"]
    },
    "Expansion": {
      order: 3, next: "Late Expansion", following: "Distribution",
      typical: ["แนวโน้มขาขึ้นชัดเจนและต่อเนื่อง", "ราคายืนเหนือเส้นค่าเฉลี่ยหลัก", "การย่อตัวมักเป็นการพักฐานปกติ", "Momentum แข็งแรง", "Volume สนับสนุนแนวโน้ม"],
      suggested: ["Hold Core Position", "Wait for Pullbacks", "Avoid Chasing"],
      endSignals: ["Weekly EMA เริ่ม breakdown", "เกิด Momentum Divergence", "สภาพคล่องเริ่มถดถอย", "ราคาหลุด SMA200"],
      do: ["ถือพอร์ตหลัก", "เพิ่มสัดส่วนช่วงย่อปกติ", "เฝ้าดู Weekly Trend"],
      dont: ["ไล่ราคาแนวตั้ง", "ใช้เลเวอเรจมากเกินไป", "มองข้ามการเปลี่ยนแปลงเชิงมหภาค"]
    },
    "Late Expansion": {
      order: 4, next: "Distribution", following: "Capitulation",
      typical: ["ราคาเร่งตัวขึ้นเหนือค่าเฉลี่ยมาก", "RSI มักเข้าเขตร้อนแรง (>70)", "ความผันผวนเพิ่มขึ้น", "การย่อเริ่มลึกและถี่ขึ้น", "ในอดีตความเสี่ยงขาลงเริ่มสูงขึ้น"],
      suggested: ["Reduce Risk Gradually", "Increase Cash Gradually", "Avoid Chasing"],
      endSignals: ["Momentum Divergence ชัดเจน", "Weekly Trend เริ่มอ่อน", "ราคาหลุดเส้นค่าเฉลี่ยระยะสั้น", "Volume ขายเริ่มเพิ่ม"],
      do: ["ทยอยลดความเสี่ยง", "เพิ่มเงินสดเป็นขั้น", "ตั้งวินัยทำกำไรบางส่วน"],
      dont: ["ไล่ราคาช่วงร้อนแรง", "เพิ่มเลเวอเรจ", "ละเลยสัญญาณ divergence"]
    },
    "Distribution": {
      order: 5, next: "Capitulation", following: "Accumulation",
      typical: ["โมเมนตัมเริ่มอ่อนแรงแม้ราคายังสูง", "เกิด Bearish Divergence บ่อยขึ้น", "แรงซื้อเริ่มถูกดูดซับ", "ความผันผวนสูงขึ้น", "ในอดีตมักตามด้วยการปรับฐานใหญ่"],
      suggested: ["Increase Cash Gradually", "Reduce Risk Gradually", "Avoid Leverage"],
      endSignals: ["ราคาหลุด SMA200", "Weekly Trend เปลี่ยนเป็นลบ", "แรงขายเร่งตัว", "Pattern Confidence ลดลง"],
      do: ["เพิ่มเงินสดเป็นขั้น", "ลดความเสี่ยงเชิงรุก", "รักษาวินัยความเสี่ยง"],
      dont: ["ไล่ราคาช่วงปลายรอบ", "ใช้เลเวอเรจ", "เพิกเฉยต่อสัญญาณอ่อนแรง"]
    }
  };
  const PlaybookEngine = {
    PROFILES: PLAYBOOK_PROFILES,
    ACTION_TH: {
      "Continue Accumulating": "สะสมต่อเนื่อง", "Hold Core Position": "ถือพอร์ตหลัก", "Wait for Pullbacks": "รอจังหวะย่อ",
      "Reduce Risk Gradually": "ลดความเสี่ยงทีละน้อย", "Increase Cash Gradually": "เพิ่มเงินสดทีละน้อย", "Avoid Chasing": "หลีกเลี่ยงการไล่ราคา",
      "Avoid Leverage": "หลีกเลี่ยงการใช้เลเวอเรจ", "Increase Patience": "เพิ่มความอดทน / รอความชัดเจน"
    },
    percentile(sorted, p) { if (!sorted.length) return null; const idx = clamp(Math.round((sorted.length - 1) * p), 0, sorted.length - 1); return sorted[idx]; },
    outcomeOf(ret) { if (!Number.isFinite(ret)) return "—"; if (ret >= 30) return "ปรับตัวขึ้นแรง"; if (ret >= 5) return "ปรับตัวขึ้น"; if (ret > -5) return "ทรงตัว"; if (ret > -25) return "ปรับตัวลง"; return "ปรับฐานลึก"; },
    // day-level forward transition distribution over `horizon` days for the given phase (historical only)
    transitions(labels, state, horizon) {
      const n = labels.length, cnt = {}; let tot = 0;
      for (let i = 0; i + horizon < n; i++) { if (labels[i] !== state) continue; const to = labels[i + horizon]; cnt[to] = (cnt[to] || 0) + 1; tot++; }
      if (!tot) return { total: 0, list: [] };
      const list = Object.keys(cnt).map((k) => ({ to: k, remain: k === state, probability: round(cnt[k] / tot * 100, 0), samples: cnt[k] })).sort((a, b) => b.probability - a.probability);
      return { total: tot, list };
    },
    // Suggested behaviour derived from Cycle + Historical Statistics + Confidence + Pattern Score + Regime.
    suggestedBehaviour(state, profile, inp) {
      const out = []; const push = (a) => { if (a && out.indexOf(a) < 0) out.push(a); };
      profile.suggested.forEach(push);
      const expansionGroup = ["Early Expansion", "Expansion", "Late Expansion"].indexOf(state) >= 0;
      if (inp.confLevel === "Low") { push("Increase Patience"); push("Wait for Pullbacks"); }
      if (inp.regime != null && inp.regime < 45) push("Increase Cash Gradually");
      if (inp.patternScore != null && inp.patternScore < 45 && expansionGroup) push("Avoid Chasing");
      if (inp.winRate != null && inp.winRate >= 60 && (state === "Accumulation" || state === "Early Expansion" || state === "Capitulation")) push("Continue Accumulating");
      if (state === "Late Expansion" || state === "Distribution") push("Reduce Risk Gradually");
      return out.slice(0, 5);
    },
    build(built, cyc, ctx) {
      const cycle = cyc.cycle, segments = cyc.segments || [], labels = cyc.labels || [];
      const state = cycle.current.state;
      const profile = PLAYBOOK_PROFILES[state] || PLAYBOOK_PROFILES["Accumulation"];
      const cur = ctx.current || {}, mtf = ctx.multiTimeframe || {}, conf = ctx.confidence || {};
      const fCur = (cyc.fArr && cyc.fArr[cyc.fArr.length - 1]) || {};

      // ---- same-phase segments: completed history vs the current in-progress one ----
      const lastSeg = segments.length ? segments[segments.length - 1] : null;
      const completed = segments.filter((s) => s.phase === state && s !== lastSeg);
      const durs = completed.map((s) => s.days);
      const rets = completed.map((s) => s.ret).filter(Number.isFinite);
      const dds = completed.map((s) => s.maxDD).filter(Number.isFinite);
      const durSorted = durs.slice().sort((a, b) => a - b);
      const wins = rets.filter((r) => r > 0).length;
      const statistics = {
        occurrences: completed.length,
        avgDuration: durs.length ? Math.round(mean(durs)) : null,
        medianDuration: durs.length ? Math.round(median(durs)) : null,
        avgReturn: rets.length ? round(mean(rets), 1) : null,
        medianReturn: rets.length ? round(median(rets), 1) : null,
        typicalDrawdown: dds.length ? round(median(dds), 1) : null,
        worstDrawdown: dds.length ? round(Math.min.apply(null, dds), 1) : null,
        winRate: rets.length ? round(wins / rets.length * 100, 0) : null
      };

      // ---- historical characteristics checklist (current market state) ----
      const wkBias = (mtf.weekly && mtf.weekly.bias) || "neutral";
      const rsi = Number.isFinite(cur.rsi) ? cur.rsi : null;
      const histPositive = (statistics.winRate != null && statistics.winRate >= 50) || (statistics.avgReturn != null && statistics.avgReturn > 0);
      const characteristics = [
        { label: "Above SMA200", ok: cur.smaState === "above" },
        { label: "EMA12 above EMA26", ok: cur.emaState === "bull" },
        { label: "Weekly Trend Bullish", ok: wkBias === "bullish" },
        { label: "RSI Healthy (45–70)", ok: rsi != null && rsi >= 45 && rsi <= 70 },
        { label: "Strong Momentum", ok: Number.isFinite(fCur.mom) && fCur.mom > 0.05 },
        { label: "Volume Increasing", ok: Number.isFinite(cur.volumeRatio) && cur.volumeRatio >= 1 },
        { label: "Positive Historical Probability", ok: !!histPositive }
      ];

      // ---- risk checklist (Green / Yellow / Red) ----
      const riskChecklist = [];
      riskChecklist.push({ label: "Weekly Trend", value: wkBias, status: wkBias === "bullish" ? "Green" : wkBias === "bearish" ? "Red" : "Yellow" });
      if (ctx.marketRegimeScore != null) riskChecklist.push({ label: "Liquidity", value: "Regime " + Math.round(ctx.marketRegimeScore), status: ctx.marketRegimeScore >= 55 ? "Green" : ctx.marketRegimeScore >= 45 ? "Yellow" : "Red" });
      else { const vr = Number.isFinite(cur.volumeRatio) ? cur.volumeRatio : 1; riskChecklist.push({ label: "Liquidity", value: vr.toFixed(2) + "x", status: vr >= 1.1 ? "Green" : vr >= 0.85 ? "Yellow" : "Red" }); }
      riskChecklist.push({ label: "Momentum", value: Number.isFinite(fCur.mom) ? (fCur.mom > 0 ? "+" : "") + round(fCur.mom * 100, 1) + "%" : "—", status: fCur.mom > 0.08 ? "Green" : fCur.mom > -0.02 ? "Yellow" : "Red" });
      riskChecklist.push({ label: "RSI", value: rsi != null ? Math.round(rsi) : "—", status: rsi == null ? "Yellow" : (rsi >= 45 && rsi <= 68) ? "Green" : (rsi >= 35 && rsi <= 75) ? "Yellow" : "Red" });
      const cycleRiskMap = { "Capitulation": "Yellow", "Accumulation": "Green", "Early Expansion": "Green", "Expansion": "Yellow", "Late Expansion": "Red", "Distribution": "Red" };
      const cycleRiskLbl = { "Green": "Low", "Yellow": "Moderate", "Red": "Elevated" };
      const crs = cycleRiskMap[state] || "Yellow";
      riskChecklist.push({ label: "Cycle Risk", value: cycleRiskLbl[crs], status: crs });
      if (ctx.marketRegimeScore != null) riskChecklist.push({ label: "Macro Regime", value: ctx.marketRegimeScore >= 55 ? "Supportive" : ctx.marketRegimeScore >= 45 ? "Neutral" : "Weak", status: ctx.marketRegimeScore >= 55 ? "Green" : ctx.marketRegimeScore >= 45 ? "Yellow" : "Red" });
      else { const mt = ctx.marketContext ? ctx.marketContext.marketType : "neutral"; riskChecklist.push({ label: "Macro Regime", value: mt, status: (mt === "bull" || mt === "recovery") ? "Green" : (mt === "bear" || mt === "decline") ? "Red" : "Yellow" }); }
      const clvl = conf.level || "Low";
      riskChecklist.push({ label: "Pattern Confidence", value: clvl, status: (clvl === "Very High" || clvl === "High") ? "Green" : clvl === "Medium" ? "Yellow" : "Red" });

      // ---- transition probability (day-level forward over 30 days, historical only) ----
      const HORIZON = 30;
      const tr = this.transitions(labels, state, HORIZON);
      let transition = tr.list.slice(0, 4).map((t) => ({ label: t.remain ? ("Remain " + state) : ("Move to " + t.to), to: t.to, remain: t.remain, probability: t.probability }));
      if (!transition.length) transition = [{ label: "Remain " + state, to: state, remain: true, probability: 60 }, { label: "Move to " + profile.next, to: profile.next, remain: false, probability: 40 }];

      // ---- typical remaining duration (median/avg total − elapsed; historical range) ----
      // elapsed = length of the trailing run of the CURRENT (smoothed) phase in the RAW per-day
      // labels. current.state === rawLabels[last], so this is ≥1 even when a fresh <21-day flip was
      // merged into the previous timeline segment (avoids a misleading "0 days elapsed" at a boundary).
      let elapsed = 0;
      const rawL = cyc.rawLabels;
      if (rawL && rawL.length) { for (let i = rawL.length - 1; i >= 0 && rawL[i] === state; i--) elapsed++; }
      if (elapsed === 0 && lastSeg && lastSeg.phase === state) elapsed = lastSeg.days;
      const p25 = durSorted.length ? this.percentile(durSorted, 0.25) : null;
      const p75 = durSorted.length ? this.percentile(durSorted, 0.75) : null;
      const remainingDuration = {
        elapsed,
        avg: statistics.avgDuration != null ? Math.max(0, statistics.avgDuration - elapsed) : null,
        median: statistics.medianDuration != null ? Math.max(0, statistics.medianDuration - elapsed) : null,
        rangeLow: p25 != null ? Math.max(0, Math.round(p25) - elapsed) : null,
        rangeHigh: p75 != null ? Math.max(0, Math.round(p75) - elapsed) : null,
        typicalTotal: statistics.medianDuration
      };

      // ---- current match (reuse Phase-2 patternScore ranking + cycle confidence + top similarity) ----
      const rk = ctx.ranking || {};
      const topSim = (cycle.similarity && cycle.similarity[0]) ? cycle.similarity[0].similarity : (cycle.marketStructure ? cycle.marketStructure.similarity : 50);
      const cycConf = cycle.current.confidence;
      const rkPct = Number.isFinite(rk.percentile) ? rk.percentile : 50;
      const matchScore = clamp(round(0.45 * cycConf + 0.35 * topSim + 0.20 * rkPct, 0), 0, 100);
      const currentMatch = { score: matchScore, topPct: rk.topPct != null ? rk.topPct : null, percentile: rk.percentile != null ? rk.percentile : null, rank: rk.rank != null ? rk.rank : null, total: rk.total != null ? rk.total : null };

      // ---- top-5 historical examples (same-phase completed segments, ranked by cycle similarity) ----
      const segIndex = new Map(); segments.forEach((s, si) => segIndex.set(s, si));
      const examples = completed.map((s) => {
        const si = segIndex.get(s), dist = cyc.segBest ? cyc.segBest[si] : null;
        const similarity = (dist != null) ? Math.round(100 * Math.exp(-dist / (cyc.scale || 1))) : null;
        const era = DecisionEngine.eraOf(s.from);
        return { date: s.from, cycle: era ? era.label : "—", similarity, ret: s.ret, maxDD: s.maxDD, days: s.days, outcome: this.outcomeOf(s.ret) };
      }).sort((a, b) => (b.similarity == null ? -1 : b.similarity) - (a.similarity == null ? -1 : a.similarity)).slice(0, 5);

      // ---- playbook timeline (current → typical next → typical following, data-driven then canonical) ----
      const dataNext = (tr.list.find((t) => !t.remain) || {}).to || profile.next;
      const nextProfile = PLAYBOOK_PROFILES[dataNext];
      const timeline = { current: state, next: dataNext, following: nextProfile ? nextProfile.next : profile.following };

      // ---- suggested behaviour + confidence ----
      const suggested = this.suggestedBehaviour(state, profile, { confLevel: conf.level, regime: ctx.marketRegimeScore, winRate: statistics.winRate, patternScore: ctx.patternScore ? ctx.patternScore.total : null });
      const suggestedBehaviour = suggested.map((a) => ({ action: a, th: this.ACTION_TH[a] || a }));
      const agreement = (mtf.combined && mtf.combined.agreement) || "n/a";
      const agreeScore = agreement === "aligned" ? 100 : agreement === "partial" ? 55 : agreement === "conflict" ? 20 : 50;
      const sampleScore = clamp(statistics.occurrences / 8 * 100, 0, 100);
      const pbConfPct = round(0.35 * cycConf + 0.30 * topSim + 0.20 * sampleScore + 0.15 * agreeScore, 0);
      const pbLevel = pbConfPct >= 80 ? "Very High" : pbConfPct >= 62 ? "High" : pbConfPct >= 42 ? "Medium" : "Low";
      const lvl3 = (v) => v >= 70 ? "High" : v >= 45 ? "Medium" : "Low";
      const playbookConfidence = {
        level: pbLevel, score: pbConfPct, reasons: [
          { label: "Pattern Similarity", level: lvl3(topSim), value: topSim + "%" },
          { label: "Cycle Match", level: lvl3(cycConf), value: cycConf + "%" },
          { label: "Historical Samples", level: statistics.occurrences >= 6 ? "High" : statistics.occurrences >= 3 ? "Medium" : "Low", value: statistics.occurrences + " ครั้ง" },
          { label: "Weekly Agreement", level: agreement === "aligned" ? "High" : agreement === "partial" ? "Medium" : "Low", value: agreement }
        ]
      };
      const evidenceStrength = (statistics.occurrences >= 6 && topSim >= 80) ? "Very Strong" : (statistics.occurrences >= 4 && topSim >= 65) ? "Strong" : (statistics.occurrences >= 2) ? "Moderate" : "Limited";

      // ---- handbook summary (≤6 lines, historical framing only) ----
      const summary = [];
      summary.push("ตลาดปัจจุบันจัดอยู่ในเฟส " + state + " (ความเชื่อมั่น " + cycConf + "%)");
      if (statistics.occurrences) summary.push("ในอดีตเฟสนี้เกิดขึ้น " + statistics.occurrences + " ครั้ง กินเวลาเฉลี่ย ~" + statistics.avgDuration + " วัน");
      if (statistics.avgReturn != null) summary.push("ผลตอบแทนเฉลี่ยของเฟสนี้ " + (statistics.avgReturn > 0 ? "+" : "") + statistics.avgReturn + "% · โอกาสเป็นบวก " + (statistics.winRate == null ? "-" : statistics.winRate + "%"));
      if (remainingDuration.median != null) summary.push("จากสถิติ เฟสนี้มักเหลืออีกประมาณ ~" + remainingDuration.median + " วัน (ผ่านมาแล้ว " + elapsed + " วัน)");
      summary.push("แนวทางที่นักลงทุนในอดีตมักใช้: " + suggested.slice(0, 3).join(" · "));
      summary.push("นี่คือ playbook เชิงสถิติจากพฤติกรรมราคาในอดีต ไม่ใช่คำแนะนำการลงทุนหรือการพยากรณ์");

      return {
        state, confidence: pbConfPct, evidenceStrength, historicalMatch: topSim,
        stance: cycle.decision.label, tone: cycle.decision.tone,
        characteristics, statistics, typicalBehaviour: profile.typical.slice(0, 6),
        suggestedBehaviour, riskChecklist, whatEndsPhase: profile.endSignals,
        transition, transitionHorizon: HORIZON, remainingDuration, currentMatch, timeline,
        doDont: { do: profile.do, dont: profile.dont }, examples, playbookConfidence,
        summary: summary.slice(0, 6), updatedAt: ctx.updatedAt || null
      };
    }
  };

  // ============================================================ AnalogForecastEngine
  // Bitcoin-only predictive ANALOG engine. It matches the current ~1.5-month (45-bar) price
  // SHAPE plus the four monitored signal families the user cares about — (1) bullish/bearish
  // RSI divergence, (2) price crossing SMA50/SMA200 at day AND week timeframes, (3) EMA12×EMA26
  // cross, (4) RSI — against EVERY comparable historical 45-bar window, weights each by
  // similarity, and PROJECTS the 30/60/90-day forward path from the closest analogs.
  // It reuses the per-day DB (ema/sma/rsi/patterns already computed) — no indicator recompute.
  // Look-ahead-free: the current window uses only past+present bars; every analog's forward
  // outcome is fully historical (window end e ≤ n-1-90), never overlapping today.
  function percentile(a, p) { const f = a.filter(Number.isFinite).slice().sort((x, y) => x - y); if (!f.length) return null; const idx = clamp(Math.round((f.length - 1) * p), 0, f.length - 1); return f[idx]; }
  // similarity-weighted quantile over (value, weight) pairs — keeps EVERY forecast statistic in
  // the same weighted family as the weighted mean (median/p25/p75/positive% all honor similarity)
  function weightedQuantile(vals, weights, q) {
    const pairs = [];
    for (let i = 0; i < vals.length; i++) if (Number.isFinite(vals[i]) && weights[i] > 0) pairs.push([vals[i], weights[i]]);
    if (!pairs.length) return null;
    pairs.sort((a, b) => a[0] - b[0]);
    const totW = pairs.reduce((s, p) => s + p[1], 0);
    let cum = 0;
    for (const p of pairs) { cum += p[1]; if (cum >= q * totW) return p[0]; }
    return pairs[pairs.length - 1][0];
  }
  const ANALOG_WINDOW = 45, ANALOG_FWD = [30, 60, 90], ANALOG_PROJ = 90, DIV_RECENT = 20; // DIV_RECENT: shared "divergence is fresh" window (Condition Monitor + forecast agree)
  const AnalogForecastEngine = {
    WINDOW: ANALOG_WINDOW, HORIZONS: ANALOG_FWD,
    // recent day-level cross / divergence signals inside a trailing window ending at e
    daySignals(built, e, L) {
      const db = built.db, s = e - L + 1;
      let emaDir = 0, emaAgo = null;
      for (let i = e; i > s; i--) { const a = db[i], b = db[i - 1]; if (a.emaState !== b.emaState && a.emaState !== "na" && b.emaState !== "na") { emaDir = a.emaState === "bull" ? 1 : -1; emaAgo = e - i; break; } }
      // note: db stores 0 (not null) for not-yet-defined SMAs, so guard with >0 — a real BTC SMA is always positive
      const crossVs = (key) => { let dir = 0, ago = null; for (let i = e; i > s; i--) { const a = db[i], b = db[i - 1]; if (!(a[key] > 0) || !(b[key] > 0) || !Number.isFinite(a.close) || !Number.isFinite(b.close)) continue; const now = a.close >= a[key], prev = b.close >= b[key]; if (now !== prev) { dir = now ? 1 : -1; ago = e - i; break; } } return { dir, ago }; };
      const c50 = crossVs("sma50"), c200 = crossVs("sma200");
      let divBull = 0, divBear = 0, divBullAgo = null, divBearAgo = null;
      for (let i = e; i >= s; i--) { const p = db[i].patterns; if (!divBull && p.some((x) => x.pattern === "BULLISH_RSI_DIVERGENCE")) { divBull = 1; divBullAgo = e - i; } if (!divBear && p.some((x) => x.pattern === "BEARISH_RSI_DIVERGENCE")) { divBear = 1; divBearAgo = e - i; } }
      const rsi = db[e].rsi, rsiPrev = db[e - 14] ? db[e - 14].rsi : null;
      return {
        ema: { dir: emaDir, ago: emaAgo, state: db[e].emaState },
        sma50: { dir: c50.dir, ago: c50.ago, pos: db[e].sma50 > 0 ? (db[e].close >= db[e].sma50 ? 1 : -1) : 0 },
        sma200: { dir: c200.dir, ago: c200.ago, pos: db[e].smaState === "above" ? 1 : db[e].smaState === "below" ? -1 : 0 },
        divBull, divBear, divBullAgo, divBearAgo,
        rsi: Number.isFinite(rsi) ? rsi : null, rsiSlope: (Number.isFinite(rsi) && Number.isFinite(rsiPrev)) ? round(rsi - rsiPrev, 1) : null
      };
    },
    // current weekly SMA50/SMA200 position + recent weekly cross (display context)
    weekSignals(bars) {
      if (!bars || bars.length < 400) return null;
      const wk = MultiTimeframeEngine.resampleWeekly(bars);
      if (wk.length < 210) return null;
      const wc = wk.map((w) => num(w.close));
      const s50 = Indicators.smaSeries(wc, 50), s200 = Indicators.smaSeries(wc, 200), i = wc.length - 1;
      const crossVs = (arr) => { let dir = 0, ago = null; for (let k = i; k > 0 && k > i - 8; k--) { if (!Number.isFinite(arr[k]) || !Number.isFinite(arr[k - 1])) continue; const now = wc[k] >= arr[k], prev = wc[k - 1] >= arr[k - 1]; if (now !== prev) { dir = now ? 1 : -1; ago = i - k; break; } } return { dir, ago, pos: Number.isFinite(arr[i]) ? (wc[i] >= arr[i] ? 1 : -1) : 0 }; };
      return { sma50: crossVs(s50), sma200: crossVs(s200) };
    },
    // current-day monitored conditions as met/not-met + how many days the state has held (streak).
    // No weighting/scoring — just "ใช่/ไม่ใช่" + days-in-condition, per the user's request.
    currentConditions(built) {
      const db = built.db, n = db.length, e = n - 1, cur = db[e];
      const streak = (pred) => { let d = 0; for (let i = e; i >= 0; i--) { if (pred(db[i])) d++; else break; } return d; };
      const lastAgo = (patKey) => { for (let i = e; i >= 0; i--) { if (db[i].patterns.some((p) => p.pattern === patKey)) return e - i; } return null; };
      const zone = (v) => !Number.isFinite(v) ? "na" : v < 30 ? "buy" : v > 70 ? "caution" : "neutral";
      const zoneLabel = { buy: "ซื้อสะสม (<30)", caution: "ระวัง/ทยอยขาย (>70)", neutral: "ปกติ (30–70)", na: "-" };
      const emaBull = cur.emaState === "bull", above50 = cur.sma50 > 0 && cur.close >= cur.sma50, above200 = cur.smaState === "above";
      const bullAgo = lastAgo("BULLISH_RSI_DIVERGENCE"), bearAgo = lastAgo("BEARISH_RSI_DIVERGENCE"), RECENT = DIV_RECENT, curZone = zone(cur.rsi);
      return [
        { key: "ema", label: "EMA12 อยู่เหนือ EMA26", met: emaBull, days: streak((r) => r.emaState === cur.emaState) },
        { key: "sma50", label: "ราคาอยู่เหนือ SMA50 (Day)", met: above50, days: streak((r) => r.sma50 > 0 && (r.close >= r.sma50) === above50) },
        { key: "sma200", label: "ราคาอยู่เหนือ SMA200 (Day)", met: above200, days: streak((r) => r.smaState === cur.smaState) },
        { key: "divBull", label: "Bullish Divergence", met: bullAgo != null && bullAgo <= RECENT, days: bullAgo },
        { key: "divBear", label: "Bearish Divergence", met: bearAgo != null && bearAgo <= RECENT, days: bearAgo },
        { key: "rsi", label: "RSI", met: null, value: Number.isFinite(cur.rsi) ? round(cur.rsi, 1) : null, zone: zoneLabel[curZone], days: streak((r) => zone(r.rsi) === curZone) }
      ];
    },
    weeklyConditions(bars) {
      if (!bars || bars.length < 400) return null;
      const wk = MultiTimeframeEngine.resampleWeekly(bars);
      if (wk.length < 210) return null;
      const wc = wk.map((w) => num(w.close)), s50 = Indicators.smaSeries(wc, 50), s200 = Indicators.smaSeries(wc, 200), i = wc.length - 1;
      const streakW = (arr) => { if (!(arr[i] > 0)) return { above: null, weeks: 0 }; const above = wc[i] >= arr[i]; let d = 0; for (let k = i; k >= 0; k--) { if (!(arr[k] > 0)) break; if ((wc[k] >= arr[k]) === above) d++; else break; } return { above, weeks: d }; };
      return { sma50: streakW(s50), sma200: streakW(s200) };
    },
    // Condition-driven forecast: ONE forward line per MONITORED condition that is currently PRESENT.
    // For each present condition, aggregate the 0–90d forward paths of every historical occurrence
    // of that same condition. Conditions not found today produce no line ("ไม่พบก็ไม่ต้องลากเส้น").
    // RSI zones: < 30 = ซื้อสะสม, > 70 = ระวัง/ทยอยขาย. Look-ahead-free (occurrences need j+90 ≤ n-1).
    conditionForecast(built, bars) {
      const db = built.db, closes = built.closes, n = db.length, L = ANALOG_WINDOW, PH = ANALOG_PROJ, e = n - 1;
      if (n < 300 + L) return null;
      const LOW = 30, HIGH = 70;
      const patIdx = (k) => { const o = []; for (let i = 0; i < n; i++) if (db[i].patterns.some((p) => p.pattern === k)) o.push(i); return o; };
      const priceCross = (key) => { const up = [], down = []; for (let i = 1; i < n; i++) { const a = db[i], b = db[i - 1]; if (!(a[key] > 0) || !(b[key] > 0)) continue; const now = a.close >= a[key], prev = b.close >= b[key]; if (now && !prev) up.push(i); else if (!now && prev) down.push(i); } return { up, down }; };
      const rsiCross = (level, below) => { const o = []; for (let i = 1; i < n; i++) { const a = db[i].rsi, b = db[i - 1].rsi; if (!Number.isFinite(a) || !Number.isFinite(b)) continue; if (below && b >= level && a < level) o.push(i); if (!below && b <= level && a > level) o.push(i); } return o; };
      // divergence uses the SAME freshness window as the Condition Monitor (DIV_RECENT) so the two panels agree;
      // cross lines use the wider analog window L (they represent a recent cross EVENT, not a persistent state)
      const recentDiv = (idxs) => idxs.some((x) => e - x <= DIV_RECENT);
      const lastDir = (up, down) => { let bi = -1, dir = 0; for (const x of up) if (e - x < L && x > bi) { bi = x; dir = 1; } for (const x of down) if (e - x < L && x > bi) { bi = x; dir = -1; } return dir; };
      const forwardAgg = (idxs) => {
        const valid = idxs.filter((j) => j + PH <= n - 1 && closes[j] > 0);
        if (valid.length < 3) return null;
        const path = []; for (let k = 0; k <= PH; k++) { const v = valid.map((j) => closes[j + k] / closes[j] * 100); path.push({ k, median: round(median(v), 2), p25: round(percentile(v, 0.25), 2), p75: round(percentile(v, 0.75), 2) }); }
        const oc = (H) => { const rs = valid.map((j) => (closes[j + H] - closes[j]) / closes[j] * 100), pos = rs.filter((r) => r > 0).length; return { n: rs.length, median: round(median(rs), 1), mean: round(mean(rs), 1), positivePct: round(pos / rs.length * 100, 0), p25: round(percentile(rs, 0.25), 1), p75: round(percentile(rs, 0.75), 1) }; };
        return { n: valid.length, path, outcome: { 30: oc(30), 60: oc(60), 90: oc(90) } };
      };
      const lines = [];
      const add = (key, label, color, tone, idxs) => { const a = forwardAgg(idxs); if (a) lines.push({ key, label, color, tone, occurrences: a.n, path: a.path, outcome: a.outcome }); };
      // 1 · divergence (present if it fired within the trailing window)
      const bd = patIdx("BULLISH_RSI_DIVERGENCE"), rd = patIdx("BEARISH_RSI_DIVERGENCE");
      if (recentDiv(bd)) add("divBull", "Bullish Divergence", "#22c55e", "bull", bd);
      if (recentDiv(rd)) add("divBear", "Bearish Divergence", "#ef4444", "bear", rd);
      // 2 · EMA12 × EMA26 cross (direction of the most recent cross in the window)
      const eu = patIdx("EMA12_BULL_CROSS"), ed = patIdx("EMA12_BEAR_CROSS"), ldE = lastDir(eu, ed);
      if (ldE > 0) add("emaBull", "EMA12 ตัดขึ้น EMA26", "#06b6d4", "bull", eu);
      else if (ldE < 0) add("emaBear", "EMA12 ตัดลง EMA26", "#f97316", "bear", ed);
      // 3 · price × SMA50 / SMA200 (Day)
      const c50 = priceCross("sma50"), c200 = priceCross("sma200"), ld50 = lastDir(c50.up, c50.down), ld200 = lastDir(c200.up, c200.down);
      if (ld50 > 0) add("sma50up", "ราคาตัดขึ้น SMA50 (D)", "#84cc16", "bull", c50.up);
      else if (ld50 < 0) add("sma50dn", "ราคาตัดลง SMA50 (D)", "#eab308", "bear", c50.down);
      if (ld200 > 0) add("sma200up", "ราคาตัดขึ้น SMA200 (D)", "#14b8a6", "bull", c200.up);
      else if (ld200 < 0) add("sma200dn", "ราคาตัดลง SMA200 (D)", "#fb7185", "bear", c200.down);
      // 4 · price × weekly SMA50 / SMA200 (map week → daily index near week end)
      if (bars && bars.length >= 400) {
        const wk = MultiTimeframeEngine.resampleWeekly(bars);
        if (wk.length >= 210) {
          const wc = wk.map((w) => num(w.close)), s50 = Indicators.smaSeries(wc, 50), s200 = Indicators.smaSeries(wc, 200), wi = wk.length - 1;
          const wCross = (arr) => { const up = [], down = []; for (let k = 1; k < wk.length; k++) { if (!(arr[k] > 0) || !(arr[k - 1] > 0)) continue; const now = wc[k] >= arr[k], prev = wc[k - 1] >= arr[k - 1]; if (now && !prev) up.push(k); else if (!now && prev) down.push(k); } return { up, down }; };
          const toDaily = (weekI) => { const end = addDays(wk[weekI].date, 6); let idx = -1; for (let x = 0; x < n; x++) { if (db[x].date <= end) idx = x; else break; } return idx; };
          const wLast = (up, down) => { let bi = -1, dir = 0; for (const x of up) if (wi - x < 8 && x > bi) { bi = x; dir = 1; } for (const x of down) if (wi - x < 8 && x > bi) { bi = x; dir = -1; } return dir; };
          const w50 = wCross(s50), w200 = wCross(s200), lw50 = wLast(w50.up, w50.down), lw200 = wLast(w200.up, w200.down);
          if (lw50 > 0) add("wsma50up", "W: ราคาตัดขึ้น SMA50", "#3b82f6", "bull", w50.up.map(toDaily).filter((x) => x >= 0));
          else if (lw50 < 0) add("wsma50dn", "W: ราคาตัดลง SMA50", "#f59e0b", "bear", w50.down.map(toDaily).filter((x) => x >= 0));
          if (lw200 > 0) add("wsma200up", "W: ราคาตัดขึ้น SMA200", "#2563eb", "bull", w200.up.map(toDaily).filter((x) => x >= 0));
          else if (lw200 < 0) add("wsma200dn", "W: ราคาตัดลง SMA200", "#dc2626", "bear", w200.down.map(toDaily).filter((x) => x >= 0));
        }
      }
      // 5 · RSI zones (< 30 = ซื้อสะสม · > 70 = ระวัง/ทยอยขาย) — only if currently in a zone
      const rsi = db[e].rsi;
      if (Number.isFinite(rsi)) {
        if (rsi < LOW) add("rsiLow", "RSI < " + LOW + " (ซื้อสะสม)", "#22c55e", "bull", rsiCross(LOW, true));
        else if (rsi > HIGH) add("rsiHigh", "RSI > " + HIGH + " (ระวัง/ทยอยขาย)", "#ef4444", "bear", rsiCross(HIGH, false));
      }
      const curPath = []; for (let k = -L + 1; k <= 0; k++) curPath.push(round(closes[e + k] / closes[e] * 100, 2));
      const meds = lines.map((l) => l.outcome[90].median).filter(Number.isFinite);
      const avg90 = meds.length ? mean(meds) : null;
      const bias = avg90 == null ? "neutral" : avg90 > 3 ? "bullish" : avg90 < -3 ? "bearish" : "neutral";
      const summary = [];
      if (lines.length) {
        summary.push("พบ " + lines.length + " เงื่อนไขในปัจจุบัน — ฉายผลจากอดีตของแต่ละเงื่อนไข (เงื่อนไขที่ไม่พบจะไม่มีเส้น)");
        const best = lines.slice().sort((a, b) => b.occurrences - a.occurrences)[0];
        summary.push("เช่น หลัง \"" + best.label + "\" ในอดีต 90 วันมัก " + (best.outcome[90].median > 0 ? "+" : "") + best.outcome[90].median + "% (median · " + best.occurrences + " ครั้ง · เป็นบวก " + best.outcome[90].positivePct + "%)");
        summary.push("แนวโน้มรวมจากเงื่อนไขที่พบ: " + (bias === "bullish" ? "เอนไปทางขึ้น" : bias === "bearish" ? "เอนไปทางลง" : "ก้ำกึ่ง"));
      } else summary.push("ไม่พบเงื่อนไขที่ติดตามในปัจจุบัน — ไม่มีเส้นคาดการณ์");
      summary.push("เป็นการฉายผลเชิงสถิติจากอดีตของแต่ละเงื่อนไข ไม่รับประกันผล");
      return { windowDays: L, projHorizon: PH, current: { path: curPath }, lines, bias, summary };
    },
    windowFeatures(built, e, L) {
      const db = built.db, closes = built.closes, s = e - L + 1;
      if (s < 200) return null;
      for (let i = s; i <= e; i++) { if (!(closes[i] > 0) || !(db[i].sma200 > 0)) return null; } // sma200>0: db stores fake-0 for not-yet-defined SMAs
      const base = closes[s], path = new Array(L);
      for (let k = 0; k < L; k++) path[k] = closes[s + k] / base - 1;
      const rets = []; for (let i = s + 1; i <= e; i++) if (closes[i - 1] > 0) rets.push(closes[i] / closes[i - 1] - 1);
      let peak = base, trough = base, dd = 0, du = 0;
      for (let i = s; i <= e; i++) { const c = closes[i]; if (c > peak) peak = c; if (c < trough) trough = c; const drop = (c - peak) / peak; if (drop < dd) dd = drop; const rise = (c - trough) / trough; if (rise > du) du = rise; }
      let bull = 0; for (let i = s; i <= e; i++) if (db[i].emaState === "bull") bull++;
      const sig = this.daySignals(built, e, L);
      return {
        s, e, date: db[e].date, path, ret: path[L - 1], vol: stdev(rets), dd, du,
        emaFrac: bull / L, emaCrossDir: sig.ema.dir, sma50Pos: sig.sma50.pos, sma50CrossDir: sig.sma50.dir,
        sma200Pos: sig.sma200.pos, sma200CrossDir: sig.sma200.dir, divBull: sig.divBull, divBear: sig.divBear,
        rsiEnd: sig.rsi == null ? 50 : sig.rsi, rsiSlope: sig.rsiSlope == null ? 0 : sig.rsiSlope, signals: sig
      };
    },
    build(built, ctx) {
      const db = built.db, closes = built.closes, n = db.length, L = ANALOG_WINDOW;
      if (n < 300 + L) return null;
      const curE = n - 1, cur = this.windowFeatures(built, curE, L);
      if (!cur) return null;
      const maxE = n - 1 - ANALOG_PROJ; // has full 90d forward AND ends before the current window (curStart=n-L)
      const cands = [];
      for (let e = 200 + L - 1; e <= maxE; e++) { const f = this.windowFeatures(built, e, L); if (f) cands.push(f); }
      if (cands.length < 50) return null;
      const monKeys = ["emaFrac", "emaCrossDir", "sma50Pos", "sma50CrossDir", "sma200Pos", "sma200CrossDir", "divBull", "divBear", "rsiEnd", "rsiSlope"];
      const monW = { emaFrac: 0.7, emaCrossDir: 1.1, sma50Pos: 0.6, sma50CrossDir: 1.0, sma200Pos: 0.8, sma200CrossDir: 1.1, divBull: 1.3, divBear: 1.3, rsiEnd: 0.9, rsiSlope: 0.8 };
      const stats = {}; monKeys.forEach((k) => { const v = cands.map((c) => c[k]); stats[k] = { m: mean(v), s: stdev(v) || 1 }; });
      const z = (c, k) => (c[k] - stats[k].m) / stats[k].s;
      const shapeRMSE = (a, b) => { let sm = 0; for (let k = 0; k < L; k++) { const d = a[k] - b[k]; sm += d * d; } return Math.sqrt(sm / L); };
      cands.forEach((c) => { c._shape = shapeRMSE(cur.path, c.path); let sm = 0; monKeys.forEach((k) => { const d = z(cur, k) - z(c, k); sm += monW[k] * d * d; }); c._mon = Math.sqrt(sm); });
      const medShape = median(cands.map((c) => c._shape)) || 1, medMon = median(cands.map((c) => c._mon)) || 1;
      cands.forEach((c) => { c._dist = 0.55 * (c._shape / medShape) + 0.45 * (c._mon / medMon); c._sim = Math.round(100 * Math.exp(-c._dist)); });
      cands.sort((a, b) => a._dist - b._dist);
      const TOPN = Math.min(30, cands.length), top = cands.slice(0, TOPN);
      const strongPool = cands.filter((c) => c._sim >= 55).length;
      // ALL statistics are similarity-weighted (mean, median, quantiles, positive%) so the
      // headline number, bold projection line, band and positive% are one consistent family.
      const fwd = (H) => { const rs = top.map((c) => (closes[c.e + H] - closes[c.e]) / closes[c.e] * 100), ws = top.map((c) => c._sim / 100); const wsum = ws.reduce((a, b) => a + b, 0) || 1; const wmean = rs.reduce((a, r, ix) => a + r * ws[ix], 0) / wsum; const wpos = rs.reduce((a, r, ix) => a + (r > 0 ? ws[ix] : 0), 0) / wsum; return { n: rs.length, weightedMean: round(wmean, 1), median: round(weightedQuantile(rs, ws, 0.5), 1), positivePct: round(wpos * 100, 0), best: round(Math.max.apply(null, rs), 1), worst: round(Math.min.apply(null, rs), 1), p25: round(weightedQuantile(rs, ws, 0.25), 1), p75: round(weightedQuantile(rs, ws, 0.75), 1) }; };
      const outcome = {}; ANALOG_FWD.forEach((H) => (outcome[H] = fwd(H)));
      const points = []; for (let k = 0; k <= ANALOG_PROJ; k++) { const vals = top.map((c) => closes[c.e + k] / closes[c.e] * 100), ws = top.map((c) => c._sim / 100); const wsum = ws.reduce((a, b) => a + b, 0) || 1; const wmean = vals.reduce((a, b, ix) => a + b * ws[ix], 0) / wsum; points.push({ k, mean: round(wmean, 2), median: round(weightedQuantile(vals, ws, 0.5), 2), p25: round(weightedQuantile(vals, ws, 0.25), 2), p75: round(weightedQuantile(vals, ws, 0.75), 2) }); }
      const sampPath = (e) => { const out = []; for (let k = 0; k <= ANALOG_PROJ; k += 3) out.push(round(closes[e + k] / closes[e] * 100, 2)); return out; };
      const matches = top.slice(0, 12).map((c) => ({ endDate: c.date, from: db[c.s].date, to: db[c.e].date, similarity: c._sim, shapeSim: round(100 * Math.exp(-c._shape / medShape), 0), fwd: { 30: round((closes[c.e + 30] - closes[c.e]) / closes[c.e] * 100, 1), 60: round((closes[c.e + 60] - closes[c.e]) / closes[c.e] * 100, 1), 90: round((closes[c.e + 90] - closes[c.e]) / closes[c.e] * 100, 1) }, signals: { emaDir: c.signals.ema.dir, sma50Dir: c.signals.sma50.dir, sma200Dir: c.signals.sma200.dir, divBull: c.divBull, divBear: c.divBear, rsi: round(c.rsiEnd, 0) } }));
      const topPaths = top.slice(0, 3).map((c) => ({ endDate: c.date, similarity: c._sim, path: sampPath(c.e) }));
      const curPath = []; for (let k = -L + 1; k <= 0; k++) curPath.push(round(closes[curE + k] / closes[curE] * 100, 2));
      const week = this.weekSignals(ctx.bars);
      const o90 = outcome[90], o30 = outcome[30];
      const bias = o90.weightedMean > 3 ? "bullish" : o90.weightedMean < -3 ? "bearish" : "neutral";
      const conf = round(clamp(top[0]._sim * 0.5 + strongPool / cands.length * 100 * 0.3 + (o90.positivePct >= 60 || o90.positivePct <= 40 ? 20 : 8), 0, 100), 0);
      const summary = [];
      summary.push("รูปแบบราคา 45 วันล่าสุดใกล้เคียงที่สุดกับ " + matches[0].endDate + " (similarity " + top[0]._sim + "%)");
      summary.push("จาก " + top.length + " รูปแบบที่คล้ายที่สุด: 30 วันข้างหน้าเฉลี่ย " + (o30.weightedMean > 0 ? "+" : "") + o30.weightedMean + "% · 90 วันเฉลี่ย " + (o90.weightedMean > 0 ? "+" : "") + o90.weightedMean + "%");
      summary.push("90 วันข้างหน้า: เป็นบวก " + o90.positivePct + "% ของกรณี · ช่วงที่พบบ่อย " + o90.p25 + "% ถึง " + o90.p75 + "%");
      summary.push("แนวโน้มเชิงสถิติจากรูปแบบอดีต: " + (bias === "bullish" ? "เอนไปทางขึ้น" : bias === "bearish" ? "เอนไปทางลง" : "ก้ำกึ่ง"));
      summary.push("เป็นการคาดการณ์จากรูปแบบที่คล้ายในอดีต (analog) อ้างอิงสถิติ ไม่รับประกันผลในอนาคต");
      return {
        windowDays: L, forwardHorizons: ANALOG_FWD, projHorizon: ANALOG_PROJ,
        generatedFrom: { from: db[cur.s].date, to: db[curE].date },
        current: { path: curPath, signals: cur.signals, week, conditions: this.currentConditions(built), weekCond: this.weeklyConditions(ctx.bars) },
        conditionForecast: this.conditionForecast(built, ctx.bars),
        matches, topPaths, outcome, projection: { horizon: ANALOG_PROJ, points }, bias, confidence: conf,
        sampleSize: top.length, poolSize: cands.length, strongPool, summary
      };
    }
  };

  // ============================================================ History store (incremental)
  function readColumnar() {
    try { const raw = storage().getItem(HISTORY_KEY); if (!raw) return null; const o = JSON.parse(raw); if (o && Array.isArray(o.d) && o.d.length) return o; } catch (e) {}
    return null;
  }
  function columnarToBars(o) {
    const out = []; for (let i = 0; i < o.d.length; i++) out.push({ date: o.d[i], open: o.o[i], high: o.h[i], low: o.l[i], close: o.c[i], volume: o.v[i] }); return out;
  }
  function writeColumnar(bars) {
    const o = { d: [], o: [], h: [], l: [], c: [], v: [], updatedAt: new Date().toISOString() };
    for (const b of bars) { o.d.push(b.date); o.o.push(b.open); o.h.push(b.high); o.l.push(b.low); o.c.push(b.close); o.v.push(b.volume); }
    try { storage().setItem(HISTORY_KEY, JSON.stringify(o)); } catch (e) { /* quota — engine still runs from in-memory bars */ }
  }
  function mergeBars(oldBars, newBars) {
    const map = new Map();
    for (const b of oldBars) map.set(b.date, b);
    for (const b of newBars) if (b && b.date && Number.isFinite(Number(b.close))) map.set(b.date, { date: b.date, open: num(b.open), high: num(b.high), low: num(b.low), close: num(b.close), volume: num(b.volume) });
    return Array.from(map.values()).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  }
  async function fetchOhlc(fetchFn, startDate) {
    const url = `/api/ohlc?symbol=${encodeURIComponent(OHLC_SYMBOL)}&start=${startDate}`;
    const res = await fetchFn(url, { cache: "no-store" });
    if (!res.ok) throw new Error("ohlc " + res.status);
    const j = await res.json();
    const bars = (j && Array.isArray(j.bars) ? j.bars : []).map((b) => ({ date: String(b.date).slice(0, 10), open: num(b.open), high: num(b.high), low: num(b.low), close: num(b.close), volume: num(b.volume) })).filter((b) => b.date && Number.isFinite(b.close));
    return bars;
  }
  async function ensureHistory(fetchFn) {
    const cached = readColumnar();
    let bars = cached ? columnarToBars(cached) : [];
    let mode = "cache";
    try {
      if (!bars.length) { bars = await fetchOhlc(fetchFn, OHLC_START); mode = "full-download"; }
      else {
        const lastDate = bars[bars.length - 1].date;
        const startInc = addDays(lastDate, -7); // small overlap to correct the last candle
        const recent = await fetchOhlc(fetchFn, startInc);
        if (recent.length) { bars = mergeBars(bars, recent); mode = "incremental"; }
      }
      if (bars.length) writeColumnar(bars);
    } catch (e) {
      if (!bars.length) throw e; // no cache and fetch failed
      mode = "cache-only(" + (e && e.message ? e.message : "err") + ")";
    }
    return { bars, mode };
  }

  // ============================================================ Orchestrator
  const BitcoinIntelligenceEngine = {
    Indicators, PatternDetector: { PATTERNS }, MultiTimeframeEngine, SimilarityEngine, ContextEngine, PatternStatistics, ConfidenceEngine, DecisionEngine, CycleIntelligenceEngine, PlaybookEngine, AnalogForecastEngine,
    buildDatabase,
    async run(snapshot, opts) {
      opts = opts || {};
      const fetchFn = opts.fetch || (typeof fetch !== "undefined" ? fetch : (typeof window !== "undefined" ? window.fetch : null));
      if (!fetchFn) throw new Error("no fetch available");
      const updatedAt = new Date().toISOString();

      const hist = await ensureHistory(fetchFn.bind(typeof window !== "undefined" ? window : null));
      const bars = hist.bars;
      if (!bars || bars.length < 250) {
        return { available: false, reason: "insufficient history", meta: { bars: bars ? bars.length : 0, mode: hist.mode }, updatedAt };
      }

      const built = buildDatabase(bars);
      const db = built.db;
      const current = db[db.length - 1];

      // current pattern set + bias
      const activePatterns = current.patterns.map((p) => ({ pattern: p.pattern, label: PATTERNS[p.pattern] ? PATTERNS[p.pattern].label : p.pattern, bullish: p.bullish, bearish: p.bearish, strength: p.strength }));
      const combos = activePatterns.filter((p) => PATTERNS[p.pattern] && PATTERNS[p.pattern].combo).map((p) => p.pattern);
      const bullN = activePatterns.filter((p) => p.bullish).length, bearN = activePatterns.filter((p) => p.bearish).length;
      const bias = bullN > bearN ? "bullish" : bearN > bullN ? "bearish" : "neutral";
      const currentPattern = { date: current.date, close: current.close, emaState: current.emaState, smaState: current.smaState, rsi: current.rsi, volumeRatio: current.volumeRatio, bias, patterns: activePatterns, combos };

      const multiTimeframe = MultiTimeframeEngine.build(bars);
      const similarCases = SimilarityEngine.compare(built, 20);
      const patternStatistics = PatternStatistics.compute(built);
      const marketContext = ContextEngine.classify(current, db, db.length - 1);
      const score = patternScore(current);

      // confidence inputs
      const dominant = activePatterns.slice().sort((a, b) => (b.strength || 0) - (a.strength || 0))[0];
      const dominantOcc = dominant && patternStatistics[dominant.pattern] ? patternStatistics[dominant.pattern].occurrences : 0;
      const avgSim = similarCases.length ? mean(similarCases.slice(0, 10).map((s) => s.similarity)) : 0;
      // indicator consistency: fraction of {ema,sma,rsi,divergence} agreeing with overall bias
      const dirs = [];
      dirs.push(current.emaState === "bull" ? 1 : current.emaState === "bear" ? -1 : 0);
      dirs.push(current.smaState === "above" ? 1 : current.smaState === "below" ? -1 : 0);
      dirs.push(Number.isFinite(current.rsi) ? (current.rsi >= 50 ? 1 : -1) : 0);
      dirs.push(current.patterns.some((p) => p.pattern === "BULLISH_RSI_DIVERGENCE") ? 1 : current.patterns.some((p) => p.pattern === "BEARISH_RSI_DIVERGENCE") ? -1 : 0);
      const biasSign = bias === "bullish" ? 1 : bias === "bearish" ? -1 : 0;
      const consistency = biasSign === 0 ? 0.5 : dirs.filter((d) => d === biasSign).length / dirs.length;
      const dataCompleteness = clamp(bars.length / 3650 * 100, 0, 100); // 10y = full
      const confidence = ConfidenceEngine.compute({ dominantOccurrences: dominantOcc, avgSimilarity: avgSim, mtfAgreement: multiTimeframe.combined.agreement, indicatorConsistency: consistency, dataCompleteness });

      // Phase 2 — Historical Decision Engine (consumes the above; no recompute of indicators)
      const decision = DecisionEngine.build(built, current, { bars, multiTimeframe, patternScore: score, confidence, marketContext, similarCases, combos });

      // Phase 3 — Cycle Intelligence Engine (consumes the DB + patternScore + context; causal, no look-ahead)
      let marketRegimeScore = null;
      try { if (typeof window !== "undefined" && window.MarketRegime && window.MarketRegime.compute) { const mr = window.MarketRegime.compute(snapshot); marketRegimeScore = mr && Number.isFinite(mr.score) ? mr.score : null; } } catch (e) {}
      const cyc = CycleIntelligenceEngine.buildAll(built, { biasByWeek: DecisionEngine.weeklyBiasMap(bars), marketRegimeScore, confidence, multiTimeframe, updatedAt });
      const cycle = cyc.cycle;

      // Phase 4 — Bitcoin Playbook Engine (reuses the cycle segments/labels + Phase-2 ranking; no recompute)
      const playbook = PlaybookEngine.build(built, cyc, { current, patternScore: score, marketContext, multiTimeframe, confidence, marketRegimeScore, ranking: decision.ranking, updatedAt });

      // Analog Forecast Engine — trailing-45-bar shape + monitored-signal match → 30/60/90d projection (reuses DB; no recompute)
      let analogForecast = null;
      try { analogForecast = AnalogForecastEngine.build(built, { bars }); } catch (e) { analogForecast = null; }

      return {
        available: true,
        currentPattern,
        patternStatistics,
        similarCases,
        patternScore: score,
        confidence,
        marketContext,
        multiTimeframe,
        decision,
        cycle,
        playbook,
        analogForecast,
        // top-level mirrors for Mission Control (read-only; MC is not modified here)
        cycleState: cycle.current.state,
        cycleScore: cycle.score.total,
        cycleConfidence: cycle.current.confidence,
        playbookState: playbook.state,
        playbookScore: playbook.currentMatch.score,
        playbookConfidence: playbook.confidence,
        forecastBias: analogForecast ? analogForecast.bias : null,
        forecast90Median: analogForecast ? analogForecast.outcome[90].median : null,
        meta: { bars: bars.length, firstDate: bars[0].date, lastDate: bars[bars.length - 1].date, source: "Yahoo (BTC-USD daily)", mode: hist.mode, engineVersion: 5 },
        updatedAt
      };
    }
  };

  if (typeof window !== "undefined") window.BitcoinIntelligence = BitcoinIntelligenceEngine;
  if (typeof module !== "undefined" && module.exports) module.exports = BitcoinIntelligenceEngine;
})();
