(function () {
  "use strict";

  // ============================================================
  // Wave 3 Setup — Institutional Early Wave 3 Detection Engine.
  //
  // Identifies HIGH-PROBABILITY EARLY MAJOR WAVE 3 SETUPS with objective,
  // reproducible rules. It NEVER claims "this IS Wave 3" — it reports
  // "Wave 3 Readiness" (0-100), "Wave Quality" (A+..C) and a Status
  // (READY / WATCH / WAIT / INVALID). No Buy/Sell language.
  //
  // Runs ONLY during Load Latest Data (guarded hook in the snapshot loaders),
  // writes exactly one new object: snapshot.wave3. Pages only READ it.
  //
  // REUSE (no duplicate calc): EMA/SMA/RSI/Volume come from
  // window.BitcoinIntelligence.Indicators when present. ATR/ADX/ZigZag/weekly
  // are NEW (not in the repo) and are computed here. Per-asset series come from
  // snapshot.historicalData[sym] (closes + volumes; no highs/lows on normal
  // assets → ATR/ADX use close-to-close true-range, a documented approximation).
  // ============================================================

  // ---- reused indicators (fallback to local copies for headless/CJS tests) ----
  function localEma(p, n) { const o = new Array(p.length).fill(null); if (p.length < n || n <= 0) return o; const k = 2 / (n + 1); let s = 0; for (let i = 0; i < n; i++) s += p[i]; o[n - 1] = s / n; for (let i = n; i < p.length; i++) { const pr = o[i - 1]; if (!Number.isFinite(pr) || !Number.isFinite(p[i])) continue; o[i] = (p[i] - pr) * k + pr; } return o; }
  function localSma(p, n) { const o = new Array(p.length).fill(null); if (p.length < n || n <= 0) return o; let s = 0; for (let i = 0; i < p.length; i++) { s += p[i]; if (i >= n) s -= p[i - n]; if (i >= n - 1) o[i] = s / n; } return o; }
  function localRsi(p, n) { n = n || 14; const o = new Array(p.length).fill(null); for (let i = n; i < p.length; i++) { let g = 0, l = 0, ok = true; for (let j = i - n + 1; j <= i; j++) { const ch = p[j] - p[j - 1]; if (!Number.isFinite(ch)) { ok = false; break; } if (ch >= 0) g += ch; else l += Math.abs(ch); } if (!ok) continue; const al = l / n; o[i] = al === 0 ? 100 : 100 - 100 / (1 + (g / n) / al); } return o; }
  function localVolRatio(v, w) { w = w || 5; const o = new Array(v.length).fill(null); for (let i = w; i < v.length; i++) { let s = 0, c = 0; for (let j = i - w; j < i; j++) { const x = v[j]; if (Number.isFinite(x) && x > 0) { s += x; c++; } } const a = c ? s / c : null; if (a && a > 0 && Number.isFinite(v[i])) o[i] = v[i] / a; } return o; }
  function IND() {
    if (typeof window !== "undefined" && window.BitcoinIntelligence && window.BitcoinIntelligence.Indicators) {
      const bi = window.BitcoinIntelligence.Indicators;
      return { ema: bi.emaSeries.bind(bi), sma: bi.smaSeries.bind(bi), rsi: bi.rsiSeries.bind(bi), vr: bi.volumeRatioSeries.bind(bi) };
    }
    return { ema: localEma, sma: localSma, rsi: localRsi, vr: localVolRatio };
  }

  // ---- small utils ----
  function num(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }
  function round(v, d) { const n = Number(v); if (!Number.isFinite(n)) return null; const p = Math.pow(10, d == null ? 2 : d); return Math.round(n * p) / p; }
  function mean(a) { const f = a.filter(Number.isFinite); return f.length ? f.reduce((s, v) => s + v, 0) / f.length : null; }
  function median(a) { const f = a.filter(Number.isFinite).slice().sort((x, y) => x - y); if (!f.length) return null; const m = Math.floor(f.length / 2); return f.length % 2 ? f[m] : (f[m - 1] + f[m]) / 2; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function parseDate(s) { const t = Date.parse(String(s).slice(0, 10) + "T00:00:00Z"); return Number.isFinite(t) ? t : null; }

  // ---- NEW indicators (not in repo): close-to-close ATR + DMI/ADX approximation ----
  // No highs/lows on normal assets → true range ≈ |close[i]-close[i-1]| (documented, reproducible).
  function atrSeries(closes, period) {
    period = period || 14; const n = closes.length, tr = new Array(n).fill(null), out = new Array(n).fill(null);
    for (let i = 1; i < n; i++) tr[i] = Math.abs(closes[i] - closes[i - 1]);
    let sum = 0, cnt = 0;
    for (let i = 1; i < n; i++) {
      if (i <= period) { if (Number.isFinite(tr[i])) { sum += tr[i]; cnt++; } if (i === period && cnt) out[i] = sum / cnt; }
      else if (Number.isFinite(out[i - 1]) && Number.isFinite(tr[i])) out[i] = (out[i - 1] * (period - 1) + tr[i]) / period;
    }
    return out;
  }
  function adxSeries(closes, period) {
    period = period || 14; const n = closes.length;
    const pdm = new Array(n).fill(0), ndm = new Array(n).fill(0), tr = new Array(n).fill(0);
    for (let i = 1; i < n; i++) { const ch = closes[i] - closes[i - 1]; pdm[i] = ch > 0 ? ch : 0; ndm[i] = ch < 0 ? -ch : 0; tr[i] = Math.abs(ch); }
    const out = new Array(n).fill(null);
    let sTr = 0, sP = 0, sN = 0; const dx = new Array(n).fill(null);
    for (let i = 1; i < n; i++) {
      if (i <= period) { sTr += tr[i]; sP += pdm[i]; sN += ndm[i]; }
      else { sTr = sTr - sTr / period + tr[i]; sP = sP - sP / period + pdm[i]; sN = sN - sN / period + ndm[i]; }
      if (i >= period && sTr > 0) {
        const pDI = 100 * sP / sTr, nDI = 100 * sN / sTr, denom = pDI + nDI;
        dx[i] = denom > 0 ? 100 * Math.abs(pDI - nDI) / denom : 0;
      }
    }
    let adx = null, c = 0, sum = 0;
    for (let i = period; i < n; i++) {
      if (dx[i] == null) continue;
      if (c < period) { sum += dx[i]; c++; if (c === period) { adx = sum / period; out[i] = adx; } }
      else { adx = (adx * (period - 1) + dx[i]) / period; out[i] = adx; }
    }
    return out;
  }

  // ---- NEW: ATR-adaptive ZigZag (min swing distance = k·ATR, min swing duration = minBars) ----
  function zigzag(closes, atr, kAtr, minBars) {
    const n = closes.length; if (n < 5) return [];
    const piv = []; let trend = 0, extIdx = 0, extVal = closes[0];
    const th = (i) => { const a = Number.isFinite(atr[i]) ? atr[i] : (Number.isFinite(atr[extIdx]) ? atr[extIdx] : extVal * 0.03); return kAtr * (a || extVal * 0.03); };
    const pushPivot = (idx, val, type) => {
      if (piv.length && piv[piv.length - 1].type === type) { // same type in a row → keep the more extreme
        if ((type === "H" && val >= piv[piv.length - 1].val) || (type === "L" && val <= piv[piv.length - 1].val)) piv[piv.length - 1] = { idx, val, type };
        return;
      }
      if (piv.length && idx - piv[piv.length - 1].idx < minBars) return; // too short a swing
      piv.push({ idx, val, type });
    };
    for (let i = 1; i < n; i++) {
      const cval = closes[i]; if (!Number.isFinite(cval)) continue;
      if (trend === 0) { if (cval > closes[0]) trend = 1; else if (cval < closes[0]) trend = -1; extVal = cval; extIdx = i; continue; }
      if (trend > 0) {
        if (cval >= extVal) { extVal = cval; extIdx = i; }
        else if (extVal - cval >= th(extIdx)) { pushPivot(extIdx, extVal, "H"); trend = -1; extVal = cval; extIdx = i; }
      } else {
        if (cval <= extVal) { extVal = cval; extIdx = i; }
        else if (cval - extVal >= th(extIdx)) { pushPivot(extIdx, extVal, "L"); trend = 1; extVal = cval; extIdx = i; }
      }
    }
    piv.push({ idx: extIdx, val: extVal, type: trend >= 0 ? "H" : "L", tentative: true });
    return piv;
  }

  // ---- weekly resample from daily closes (ISO-Monday buckets) → weekly closes ----
  function weeklyCloses(dates, closes) {
    const buckets = new Map();
    for (let i = 0; i < dates.length; i++) {
      const t = parseDate(dates[i]); if (t == null || !Number.isFinite(closes[i])) continue;
      const d = new Date(t), dow = (d.getUTCDay() + 6) % 7, mon = new Date(t - dow * 86400000).toISOString().slice(0, 10);
      buckets.set(mon, closes[i]); // last close of the week wins (sorted input)
    }
    return Array.from(buckets.entries()).sort((a, b) => a[0] < b[0] ? -1 : 1).map((e) => e[1]);
  }

  // ---- forward-return backtest of the trigger condition (Historical Validation) ----
  function historicalValidation(closes, triggerFlags, horizon) {
    horizon = horizon || 60; const n = closes.length, rets = [], dds = [];
    for (let i = 0; i < n - horizon; i++) {
      if (!triggerFlags[i]) continue; const entry = closes[i]; if (!(entry > 0)) continue;
      rets.push((closes[i + horizon] - entry) / entry * 100);
      let peak = entry, mdd = 0; for (let t = i; t <= i + horizon; t++) { if (closes[t] > peak) peak = closes[t]; const dd = (closes[t] - peak) / peak * 100; if (dd < mdd) mdd = dd; } dds.push(mdd);
    }
    if (rets.length < 3) return { occurrences: rets.length, insufficient: true, horizon };
    const pos = rets.filter((r) => r > 0).length;
    return { occurrences: rets.length, horizon, positivePct: round(pos / rets.length * 100, 0), avgReturn: round(mean(rets), 1), medianReturn: round(median(rets), 1), avgDrawdown: round(mean(dds), 1), worst: round(Math.min.apply(null, rets), 1), best: round(Math.max.apply(null, rets), 1) };
  }

  // ---- fib retracement quality ----
  const FIB_IDEAL = [0.382, 0.5, 0.618, 0.786];
  function fibQuality(retrace) {
    if (!(retrace > 0) || retrace >= 1) return null; // reject ≥100%
    let nearest = FIB_IDEAL[0], best = Infinity;
    FIB_IDEAL.forEach((f) => { const d = Math.abs(retrace - f); if (d < best) { best = d; nearest = f; } });
    const diff = best; // absolute distance to nearest ideal
    let q, stars;
    if (diff <= 0.025) { q = "Perfect"; stars = 5; }
    else if (diff <= 0.05) { q = "Excellent"; stars = 4; }
    else if (diff <= 0.09) { q = "Good"; stars = 3; }
    else { q = "Weak"; stars = 2; }
    return { retrace: round(retrace * 100, 1), ideal: round(nearest * 100, 1), diff: round(diff * 100, 1), quality: q, stars };
  }

  // ============================================================ per-asset analysis
  // series = { symbol, name, closes[], volumes[], dates[], isHolding }
  function analyzeAsset(series) {
    const closes = (series.closes || []).map(num).filter((v) => v != null);
    const volumes = (series.volumes || []).map((v) => num(v) || 0);
    const dates = series.dates || [];
    const n = closes.length;
    const base = { symbol: series.symbol, name: series.name || series.symbol, isHolding: !!series.isHolding, universe: series.universe, price: n ? round(closes[n - 1], closes[n - 1] < 10 ? 4 : 2) : null, date: dates[n - 1] || null };
    if (n < 60) return Object.assign(base, { status: "INVALID", readiness: 0, quality: "C", confidence: 0, reason: "ประวัติราคาไม่พอ (ต้องการ ≥ 60 แท่ง)", evidence: [], missing: [], components: [] });

    const I = IND();
    const ema12 = I.ema(closes, 12), ema26 = I.ema(closes, 26), ema50 = I.ema(closes, 50), ema200 = I.ema(closes, 200);
    const sma50 = I.sma(closes, 50), sma200 = I.sma(closes, 200), rsi = I.rsi(closes, 14), volR = I.vr(volumes, 5);
    const atr = atrSeries(closes, 14);
    // ADX on EMA5-smoothed closes: raw close-to-close daily noise cancels directional
    // movement and biases ADX low (genuine trends read ~12). Smoothing restores the
    // standard ADX range so the trend-strength floor is meaningful on close-only data.
    const emaAdxIn = I.ema(closes, 5).map((v, i) => Number.isFinite(v) ? v : closes[i]);
    const adx = adxSeries(emaAdxIn, 14);
    const e = n - 1, price = closes[e];
    const g = (arr) => Number.isFinite(arr[e]) ? arr[e] : null;
    const cEma12 = g(ema12), cEma26 = g(ema26), cEma50 = g(ema50), cEma200 = g(ema200), cSma50 = g(sma50), cSma200 = g(sma200), cRsi = g(rsi), cVolR = g(volR), cAtr = g(atr), cAdx = g(adx);

    // ---- swing / wave structure via ATR ZigZag ----
    const piv = zigzag(closes, atr, 3, 3);
    let w1 = null, w2 = null, fib = null, brokeW1High = false, targets = [];
    // find last confirmed Low (W2 end) → the High before it (W1 high) → the Low before that (W1 start)
    let cIdx = -1;
    for (let i = piv.length - 1; i >= 0; i--) { if (piv[i].type === "L") { cIdx = i; break; } }
    if (cIdx >= 2) {
      const cP = piv[cIdx];            // W2 low
      let bIdx = -1; for (let i = cIdx - 1; i >= 0; i--) { if (piv[i].type === "H") { bIdx = i; break; } }
      let aIdx = -1; if (bIdx > 0) for (let i = bIdx - 1; i >= 0; i--) { if (piv[i].type === "L") { aIdx = i; break; } }
      if (aIdx >= 0 && bIdx > aIdx) {
        const a = piv[aIdx], b = piv[bIdx], c = cP;
        if (b.val > a.val && c.val < b.val && c.val > a.val) { // valid W1 up + W2 partial retrace (<100%)
          const retr = (b.val - c.val) / (b.val - a.val);
          fib = fibQuality(retr);
          w1 = { startIdx: a.idx, startDate: dates[a.idx], startVal: round(a.val, 2), endIdx: b.idx, endDate: dates[b.idx], endVal: round(b.val, 2) };
          w2 = { endIdx: c.idx, endDate: dates[c.idx], endVal: round(c.val, 2) };
          brokeW1High = price > b.val;
          const range = b.val - a.val;
          [1.272, 1.618, 2.618].forEach((x) => targets.push({ ext: x, price: round(c.val + x * range, price < 10 ? 4 : 2), label: (x * 100).toFixed(1) + "%" }));
        }
      }
    }

    // ---- Higher-High / Higher-Low from pivots ----
    const highs = piv.filter((p) => p.type === "H"), lows = piv.filter((p) => p.type === "L");
    const hh = highs.length >= 2 && highs[highs.length - 1].val > highs[highs.length - 2].val;
    const hl = lows.length >= 2 && lows[lows.length - 1].val > lows[lows.length - 2].val;
    const hhhl = hh && hl;

    // ---- weekly SMA200 (or shorter proxy when history is short) ----
    const wkC = weeklyCloses(dates, closes); const wn = wkC.length;
    let weeklyState = null; // {above, basis, proxy}
    if (wn >= 30) {
      const wp = Math.min(200, Math.max(20, wn - 5));
      const wsma = I.sma(wkC, wp); const wv = wsma[wn - 1];
      if (Number.isFinite(wv)) weeklyState = { above: wkC[wn - 1] > wv, basis: wp, proxy: wp < 200, value: round(wv, 2) };
    }

    // ---- Trend Qualification (gate) ----
    // Established uptrend structure = higher-low OR higher-high. A fresh higher-high is
    // the AWAITED breakout trigger for an early Wave 3, so it is NOT required to qualify
    // (it lives in the evidence checklist instead) — requiring it would exclude every
    // pre-breakout setup, which is exactly what this tool looks for.
    const priceAbove200 = cEma200 != null && price > cEma200;
    const ema50Above200 = cEma50 != null && cEma200 != null && cEma50 > cEma200;
    const structureOk = hl || hh;
    const ADX_FLOOR = 20; // calibrated for the EMA5-smoothed close-only ADX proxy (see adx calc)
    const adxPass = cAdx != null && cAdx > ADX_FLOOR;
    const trendPassed = priceAbove200 && ema50Above200 && structureOk && adxPass;
    const trendQual = { passed: trendPassed, priceAboveEma200: priceAbove200, ema50AboveEma200: ema50Above200, structureOk, hhhl, hh, hl, adx: round(cAdx, 1), adxFloor: ADX_FLOOR, adxPass };

    // ---- ATR expansion (current vs ~10 bars ago) ----
    const atrPast = Number.isFinite(atr[e - 10]) ? atr[e - 10] : (Number.isFinite(atr[e - 5]) ? atr[e - 5] : null);
    const atrExpand = cAtr != null && atrPast != null && cAtr > atrPast * 1.05;

    // ---- Early Wave 3 evidence checklist (10) ----
    // kind "setup"  = structural conditions that make a mature setup (must be present to be WATCH-ready)
    // kind "trigger" = confirmation conditions that fire TOGETHER at/after the breakout
    //                  (an early, pre-breakout setup legitimately still misses these)
    const emaBull = cEma12 != null && cEma26 != null && cEma12 > cEma26;
    const evidence = [
      { key: "w2done", kind: "setup", label: "Wave 2 สร้างจุดต่ำแล้ว", waiting: "Wave 2", ok: !!(w1 && w2) },
      { key: "emaCross", kind: "setup", label: "EMA12 อยู่เหนือ EMA26", waiting: "EMA Cross", ok: emaBull },
      { key: "aboveSma50", kind: "setup", label: "ราคาเหนือ SMA50", waiting: "ยืนเหนือ SMA50", ok: cSma50 != null && price > cSma50 },
      { key: "aboveSma200", kind: "setup", label: "ราคาเหนือ SMA200", waiting: "ยืนเหนือ SMA200", ok: cSma200 != null && price > cSma200 },
      { key: "weekly", kind: "setup", label: "Weekly เหนือ SMA200", waiting: "Weekly ยืนเหนือ SMA200", ok: !!(weeklyState && weeklyState.above), na: !weeklyState },
      { key: "rsi", kind: "setup", label: "RSI > 55", waiting: "RSI > 55", ok: cRsi != null && cRsi > 55 },
      { key: "breakW1", kind: "trigger", label: "ทะลุ High ของ Wave 1", waiting: "Breakout", ok: brokeW1High },
      { key: "hh", kind: "trigger", label: "Higher High", waiting: "Breakout", ok: hh },
      { key: "volume", kind: "trigger", label: "Volume > 1.5× เฉลี่ย 5 วัน", waiting: "Volume Expansion", ok: cVolR != null && cVolR > 1.5 },
      { key: "atr", kind: "trigger", label: "ATR ขยายตัว", waiting: "ATR Expansion", ok: atrExpand }
    ];
    const active = evidence.filter((x) => !x.na);
    const missingItems = active.filter((x) => !x.ok);
    const missing = missingItems.map((x) => x.label);
    const missingCount = missing.length;
    const setupMissing = active.filter((x) => x.kind === "setup" && !x.ok);
    const triggerMissing = active.filter((x) => x.kind === "trigger" && !x.ok);

    // ---- Wave 3 Readiness (0-100), renormalised over available components ----
    const trendScore = (priceAbove200 ? 0.30 : 0) + (ema50Above200 ? 0.30 : 0) + (hhhl ? 0.20 : (structureOk ? 0.10 : 0)) + (adxPass ? clamp((cAdx - ADX_FLOOR) / 25, 0, 1) * 0.20 : 0);
    const emaStack = [cEma12 > cEma26, price > cEma12, cEma26 > cEma50, cEma50 > cEma200].filter(Boolean).length / 4;
    const fibScore = fib ? (fib.stars >= 5 ? 1 : fib.stars === 4 ? 0.8 : fib.stars === 3 ? 0.6 : 0.3) : 0;
    const rsiScore = cRsi == null ? 0 : cRsi >= 55 ? clamp(1 - Math.max(0, cRsi - 72) / 20, 0.6, 1) : clamp((cRsi - 40) / 15, 0, 0.6);
    const volScore = cVolR == null ? 0 : cVolR >= 1.5 ? 1 : cVolR >= 1 ? 0.4 + (cVolR - 1) * 1.2 : cVolR * 0.4;
    const atrScore = atrExpand ? 1 : (cAtr != null && atrPast != null ? clamp(cAtr / atrPast - 0.6, 0, 1) : 0);
    const comps = [
      { key: "trend", label: "Trend Structure", max: 25, val: round(trendScore * 25, 0) },
      { key: "ema", label: "EMA Alignment", max: 20, val: round(emaStack * 20, 0) },
      { key: "fib", label: "Fibonacci Quality", max: 20, val: round(fibScore * 20, 0) },
      { key: "rsi", label: "Momentum (RSI)", max: 10, val: round(rsiScore * 10, 0) },
      { key: "vol", label: "Volume Expansion", max: 10, val: round(volScore * 10, 0) },
      { key: "weekly", label: "Weekly Confirmation", max: 10, val: weeklyState ? (weeklyState.above ? 10 : 3) : null, na: !weeklyState },
      { key: "atr", label: "ATR Expansion", max: 5, val: round(atrScore * 5, 0) }
    ];
    let gained = 0, avail = 0; comps.forEach((c) => { if (c.na || c.val == null) return; gained += c.val; avail += c.max; });
    const readiness = avail > 0 ? Math.round(gained / avail * 100) : 0;

    // ---- Wave Quality grade ----
    const quality = readiness >= 85 ? "A+" : readiness >= 75 ? "A" : readiness >= 65 ? "B+" : readiness >= 50 ? "B" : "C";

    // ---- Status ----
    // INVALID  — trend qualification failed (no further analysis)
    // READY    — trend qualified, setup complete AND breakout confirmed with volume → wave firing now
    // WATCH    — trend qualified, setup essentially complete (≤1 setup gap), waiting only on the trigger
    // WAIT     — trend qualified but the setup is still forming (≥2 setup conditions missing)
    let status;
    if (!trendPassed) status = "INVALID";
    else if (setupMissing.length === 0 && brokeW1High && (cVolR != null && cVolR > 1.2)) status = "READY";
    else if (setupMissing.length <= 1) status = "WATCH";
    else status = "WAIT";

    // ---- waitingFor: the single most important thing this asset is waiting on ----
    let waitingFor = "";
    if (status === "WATCH" || status === "WAIT") {
      const firstSetup = setupMissing[0];
      const firstTrigger = triggerMissing.find((x) => x.key === "breakW1") || triggerMissing[0];
      waitingFor = firstSetup ? firstSetup.waiting : (firstTrigger ? firstTrigger.waiting : "");
    }

    // ---- Historical validation (backtest the trigger over this asset's own history) ----
    // Always computed — the detail page shows it regardless of current status.
    let historical = null;
    {
      const flags = new Array(n).fill(false);
      for (let i = 50; i < n; i++) {
        const eb = Number.isFinite(ema12[i]) && Number.isFinite(ema26[i]) && ema12[i] > ema26[i];
        const a200 = Number.isFinite(sma200[i]) && closes[i] > sma200[i];
        const rr = Number.isFinite(rsi[i]) && rsi[i] > 55;
        const vv = Number.isFinite(volR[i]) && volR[i] > 1.2;
        const justCross = eb && (!Number.isFinite(ema12[i - 1]) || !Number.isFinite(ema26[i - 1]) || ema12[i - 1] <= ema26[i - 1] + (ema26[i - 1] * 0.002));
        flags[i] = a200 && rr && vv && (justCross || eb);
      }
      historical = historicalValidation(closes, flags, 60);
    }

    // ---- Confidence (data sufficiency + agreement) ----
    const dataConf = clamp(n / 500, 0.3, 1);
    const weeklyConf = weeklyState ? (weeklyState.proxy ? 0.7 : 1) : 0.4;
    const occConf = historical && !historical.insufficient ? clamp(historical.occurrences / 20, 0.3, 1) : 0.4;
    const fibConf = fib ? (fib.stars / 5) : 0.3;
    const confidence = Math.round(clamp(dataConf * 30 + weeklyConf * 20 + occConf * 25 + fibConf * 25, 0, 100));

    // ---- Invalidation ----
    const invalidation = ["EMA12 ตัดลงต่ำกว่า EMA26", "ราคาหลุด SMA200", weeklyState ? "Weekly trend หลุด SMA200" : "Weekly trend อ่อนแรง", "Volume แห้ง (< 1× เฉลี่ย)"];
    if (w2) invalidation.push("ราคาหลุดจุดต่ำ Wave 2 (" + round(w2.endVal, 2) + ")");

    return Object.assign(base, {
      status, readiness, quality, confidence, waitingFor,
      trendQual, waves: w1 ? { w1, w2, currentVal: round(price, 2) } : null, fib,
      evidence, missing, missingCount, setupMissingCount: setupMissing.length, triggerMissingCount: triggerMissing.length,
      brokeW1High, components: comps, targets, historical, invalidation,
      readings: { ema12: round(cEma12, 2), ema26: round(cEma26, 2), ema50: round(cEma50, 2), ema200: round(cEma200, 2), sma50: round(cSma50, 2), sma200: round(cSma200, 2), rsi: round(cRsi, 1), volRatio: round(cVolR, 2), adx: round(cAdx, 1), atr: round(cAtr, 2), weekly: weeklyState },
      bars: n
    });
  }

  // ============================================================ orchestrator
  // Universe #4 — Crypto Top-20 by market cap (ex-stablecoins). Fetched as <SYM>-USD
  // via /api/ohlc (Yahoo). Auto-skips any symbol Yahoo can't serve (0 bars → dropped).
  const CRYPTO_TOP20 = [
    ["BTC", "Bitcoin"], ["ETH", "Ethereum"], ["BNB", "BNB"], ["SOL", "Solana"], ["XRP", "XRP"],
    ["DOGE", "Dogecoin"], ["ADA", "Cardano"], ["TRX", "TRON"], ["LINK", "Chainlink"], ["AVAX", "Avalanche"],
    ["SUI", "Sui"], ["HBAR", "Hedera"], ["TON", "Toncoin"], ["DOT", "Polkadot"], ["BCH", "Bitcoin Cash"],
    ["LTC", "Litecoin"], ["UNI", "Uniswap"], ["APT", "Aptos"], ["NEAR", "NEAR"], ["PEPE", "Pepe"]
  ].map(function (e) { return { sym: e[0], fetchSym: e[0] + "-USD", name: e[1] }; });

  // Universe #3 — Thailand SET100 + mai (fetched as <SYM>.BK). Bad/delisted tickers self-skip.
  const THAI_SET100 = ("ADVANC AOT AWC BANPU BBL BDMS BEM BGRIM BH BJC BTS CBG CENTEL CK CKP COM7 CPALL CPF " +
    "CPN CRC DELTA EA EGCO GLOBAL GPSC GULF GUNKUL HANA HMPRO INTUCH IVL KBANK KCE KKP KTB KTC LH " +
    "MINT MTC OR OSP PTT PTTEP PTTGC RATCH SAWAD SCB SCC SCGP TCAP TIDLOR TISCO TLI TOP TRUE TU " +
    "VGI WHA BLA BAM STGT STA SPRC SIRI SPALI QH AP ORI STEC TASCO TTB BCP BCPG DOHOME " +
    "JMART JMT SINGER TIPH THG BAFS BEC PLANB MAJOR ERW MBK BLAND WHAUP TVO GFPT M " +
    "AAV BA NRF TFG ITC CPW SISB BRR").split(/\s+/);
  const THAI_MAI = ("SICT ZAA IIG YGG SABUY BE8 SECURE TPS ARIN CV GTB SATP KUN CH BBIK NCAP " +
    "TKC PROEN ADD MOSHI ONEE ILM PHG NER TM DHOUSE").split(/\s+/);
  const THAI_UNIVERSE = Array.from(new Set(THAI_SET100.concat(THAI_MAI))).map(function (s) { return { sym: s + ".BK", fetchSym: s + ".BK", name: s }; });

  // ---- localStorage OHLC cache for the fetched universes (once/day; bounded depth) ----
  const OHLC_CACHE_KEY = "wave3_ohlc_v1";
  function storage() { try { return typeof localStorage !== "undefined" ? localStorage : (typeof window !== "undefined" ? window.localStorage : null); } catch (_e) { return null; } }
  function readOhlcCache() { const s = storage(); if (!s) return {}; try { return JSON.parse(s.getItem(OHLC_CACHE_KEY) || "{}") || {}; } catch (_e) { return {}; } }
  function writeOhlcCache(o) { const s = storage(); if (!s) return; try { s.setItem(OHLC_CACHE_KEY, JSON.stringify(o)); } catch (_e) { /* quota — engine still runs from memory */ } }

  async function fetchOhlc(fetchFn, sym, days) {
    const res = await fetchFn("/api/ohlc?symbol=" + encodeURIComponent(sym) + "&days=" + (days || 480), { cache: "no-store" });
    if (!res || !res.ok) throw new Error("ohlc " + sym + " " + (res && res.status));
    const j = await res.json();
    const bars = (j && j.bars) || [];
    const d = [], c = [], v = [];
    for (const b of bars) { const cl = num(b.close); if (cl == null) continue; d.push(String(b.date).slice(0, 10)); c.push(cl); v.push(num(b.volume) || 0); }
    return { d, c, v };
  }
  async function seriesCached(fetchFn, sym, cache, today) {
    const hit = cache[sym];
    if (hit && hit.u === today && Array.isArray(hit.c) && hit.c.length >= 60) return { dates: hit.d, closes: hit.c, volumes: hit.v };
    const s = await fetchOhlc(fetchFn, sym, 480);
    if (!s.c.length) { if (hit) return { dates: hit.d, closes: hit.c, volumes: hit.v }; return null; } // keep stale on empty
    const cap = 520; if (s.c.length > cap) { s.d = s.d.slice(-cap); s.c = s.c.slice(-cap); s.v = s.v.slice(-cap); }
    cache[sym] = { u: today, d: s.d, c: s.c, v: s.v };
    return { dates: s.d, closes: s.c, volumes: s.v };
  }

  // bounded-concurrency map (per-item failures resolve to null, never reject)
  async function mapPool(items, limit, worker) {
    const out = new Array(items.length); let idx = 0;
    async function next() { while (idx < items.length) { const i = idx++; try { out[i] = await worker(items[i], i); } catch (_e) { out[i] = null; } } }
    const runners = []; for (let k = 0; k < Math.min(limit, items.length); k++) runners.push(next());
    await Promise.all(runners); return out;
  }

  const REQUIRED = new Set(["SPY", "QQQM", "XLK", "^GSPC", "^VIX", "^VVIX", "^VIXEQ", "BTCUSD", "BTC-USD", "^IXIC", "DX-Y.NYB", "^TNX", "GLD"]);
  const byReadiness = function (a, b) { return (b.readiness - a.readiness) || (b.confidence - a.confidence) || String(a.symbol).localeCompare(String(b.symbol)); };
  function counts(items) { const c = { READY: 0, WATCH: 0, WAIT: 0, INVALID: 0 }; items.forEach(function (x) { c[x.status] = (c[x.status] || 0) + 1; }); return { total: items.length, ready: c.READY, watch: c.WATCH, wait: c.WAIT, invalid: c.INVALID }; }

  async function run(snapshot, opts) {
    opts = opts || {};
    const fetchFn = opts.fetch || (typeof fetch !== "undefined" ? fetch : (typeof window !== "undefined" ? window.fetch.bind(window) : null));
    const generatedAt = opts.now || (snapshot && snapshot.generatedAt) || null; // avoid Date in engine; caller stamps
    const today = generatedAt ? String(generatedAt).slice(0, 10) : "_nocache_";
    const hist = (snapshot && snapshot.historicalData) || {};
    const seen = {};
    const analyzeSnap = function (key, name, uni, isHolding) {
      const h = hist[key]; if (!h || !Array.isArray(h.closes) || h.closes.length < 60) return null;
      return analyzeAsset({ symbol: key, name: name || key, universe: uni, isHolding: !!isHolding, dates: h.dates || [], closes: h.closes, volumes: h.volumes || [] });
    };

    // 1 · Portfolio holdings (highest priority)
    const holdings = (snapshot && snapshot.portfolioHoldings && Array.isArray(snapshot.portfolioHoldings.data)) ? snapshot.portfolioHoldings.data : [];
    const portfolio = [];
    holdings.forEach(function (h) {
      if (!h || (h.isHolding === false)) return;
      const key = h.canonicalSymbol || h.symbol || h.displaySymbol; if (!key || seen[key]) return; seen[key] = 1;
      const a = analyzeSnap(key, h.assetName || h.name || h.displaySymbol || key, "portfolio", true);
      if (a) portfolio.push(a);
    });

    // 2 · AI Boom — everything else loaded into the snapshot that isn't macro/required
    const aiBoom = [];
    Object.keys(hist).forEach(function (key) {
      if (seen[key] || REQUIRED.has(key)) return; seen[key] = 1;
      const a = analyzeSnap(key, key, "aiBoom", false); if (a) aiBoom.push(a);
    });

    // 3 + 4 · Thailand + Crypto — fetched via /api/ohlc (cached once/day, concurrency-capped). Best-effort.
    let thailand = [], crypto = [];
    if (fetchFn) {
      const cache = readOhlcCache();
      const fetchUni = async function (list, uni) {
        return (await mapPool(list, 10, async function (it) {
          const s = await seriesCached(fetchFn, it.fetchSym, cache, today); if (!s) return null;
          return analyzeAsset({ symbol: it.sym, name: it.name, universe: uni, isHolding: false, dates: s.dates, closes: s.closes, volumes: s.volumes });
        })).filter(Boolean);
      };
      try { crypto = await fetchUni(CRYPTO_TOP20, "crypto"); } catch (_e) { crypto = []; }
      try { thailand = await fetchUni(THAI_UNIVERSE, "thailand"); } catch (_e) { thailand = []; }
      writeOhlcCache(cache);
    }

    const mk = function (items) { items.sort(byReadiness); return Object.assign({ items: items }, counts(items)); };
    const universes = { portfolio: mk(portfolio), aiBoom: mk(aiBoom), thailand: mk(thailand), crypto: mk(crypto) };
    const all = portfolio.concat(aiBoom, thailand, crypto);

    // Upcoming Setups — "almost entering Wave 3": READY/WATCH first, then the strongest
    // WAIT setups that are only one setup-gap away, each tagged with what it's waiting on.
    const upcoming = all
      .filter(function (a) { return a.status === "READY" || a.status === "WATCH" || (a.status === "WAIT" && a.setupMissingCount <= 2 && a.readiness >= 60); })
      .sort(byReadiness).slice(0, 24)
      .map(function (a) { return { symbol: a.symbol, name: a.name, universe: a.universe, readiness: a.readiness, quality: a.quality, status: a.status, waitingFor: a.waitingFor || "", missing: (a.missing || []).slice(0, 2) }; });

    return {
      available: true, engineVersion: 1, generatedAt: generatedAt,
      universes: universes, upcoming: upcoming,
      meta: {
        counts: { portfolio: portfolio.length, aiBoom: aiBoom.length, thailand: thailand.length, crypto: crypto.length },
        cryptoRequested: CRYPTO_TOP20.length, thaiRequested: THAI_UNIVERSE.length,
        totalReady: all.filter(function (a) { return a.status === "READY"; }).length,
        totalWatch: all.filter(function (a) { return a.status === "WATCH"; }).length
      }
    };
  }

  const Wave3Engine = {
    analyzeAsset: analyzeAsset, atrSeries: atrSeries, adxSeries: adxSeries, zigzag: zigzag,
    weeklyCloses: weeklyCloses, fibQuality: fibQuality, historicalValidation: historicalValidation,
    run: run, CRYPTO_TOP20: CRYPTO_TOP20, THAI_UNIVERSE: THAI_UNIVERSE
  };

  if (typeof window !== "undefined") window.Wave3Engine = Wave3Engine;
  if (typeof module !== "undefined" && module.exports) module.exports = Wave3Engine;
})();
