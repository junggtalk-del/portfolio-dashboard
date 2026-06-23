(function () {
  "use strict";

  const root = document.getElementById("asset360");
  const isDev = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  let range = "1M";
  let CURRENT = null;
  const ohlcCache = {};

  // ---------------------------------------------------------------- helpers
  function fin(v) {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
  }
  function num(v, d = 2) {
    const n = fin(v);
    return n == null ? "—" : n.toLocaleString("en-US", { maximumFractionDigits: d });
  }
  function signedPct(v) {
    const n = fin(v);
    if (n == null) return "—";
    return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
  }
  function upDown(v) {
    const n = fin(v);
    return n == null ? "" : n >= 0 ? "mc-up" : "mc-down";
  }
  function getSnapshot() {
    try {
      return (window.PortfolioDataSnapshot && window.PortfolioDataSnapshot.read && window.PortfolioDataSnapshot.read()) || null;
    } catch (_e) {
      return null;
    }
  }
  function rawSymbol() {
    const parts = location.pathname.split("/").filter(Boolean);
    return decodeURIComponent(parts[1] || "").trim();
  }
  const ALIAS = {
    SET: "^SET.BK", "SET.BK": "^SET.BK", SET50: "^SET50.BK", "SET50.BK": "^SET50.BK", SET100: "^SET100.BK", "SET100.BK": "^SET100.BK",
    SPX: "^GSPC", GSPC: "^GSPC", IXIC: "^IXIC", NDX: "^NDX",
    BTC: "BTCUSD", "BTC-USD": "BTCUSD", KGTECHRMF: "K-GTECHRMF", KUSXNDQRMF: "K-USXNDQRMF"
  };
  function canonicalize(raw) {
    const up = String(raw || "").toUpperCase().replace(/[^A-Z0-9.^-]/g, "");
    const compact = up.replace(/[^A-Z0-9]/g, "");
    return ALIAS[up] || ALIAS[compact] || up;
  }
  function resolveKey(raw, snapshot) {
    const c = canonicalize(raw);
    const cands = [c, String(raw || "").toUpperCase()];
    if (!c.endsWith(".BK")) cands.push(c + ".BK");
    if (c === "BTCUSD") cands.push("BTC-USD");
    if (c.endsWith(".BK")) cands.push(c.slice(0, -3));
    const pools = [snapshot && snapshot.historicalData, snapshot && snapshot.technicalSignals, snapshot && snapshot.prices, snapshot && snapshot.scoring && snapshot.scoring.bySymbol];
    for (const cand of cands) {
      for (const pool of pools) if (pool && pool[cand]) return cand;
    }
    return c;
  }
  function currencyFor(key, assetType) {
    const t = String(assetType || "").toUpperCase();
    if (key === "BTCUSD" || key === "BTC-USD" || /USD$/.test(key)) return "$";
    if (key.endsWith(".BK") || key.startsWith("^SET") || key.includes("RMF") || key.includes("SSF") || t.includes("THAI")) return "฿";
    if (t.includes("US") || t.includes("STOCK") || t.includes("ETF") || t.includes("INDEX")) return "$";
    return "$";
  }

  // ---------------------------------------------------------------- series math
  function emaSeries(vals, period) {
    const out = new Array(vals.length).fill(null);
    const nums = vals.map(Number);
    let start = -1, seed = 0;
    for (let i = 0; i + period <= nums.length; i += 1) {
      const win = nums.slice(i, i + period);
      if (win.every(Number.isFinite)) { start = i; seed = win.reduce((a, b) => a + b, 0) / period; break; }
    }
    if (start < 0) return out;
    let ema = seed;
    out[start + period - 1] = ema;
    const k = 2 / (period + 1);
    for (let i = start + period; i < nums.length; i += 1) {
      if (!Number.isFinite(nums[i])) { out[i] = null; continue; }
      ema = (nums[i] - ema) * k + ema;
      out[i] = ema;
    }
    return out;
  }
  function smaSeries(vals, period) {
    const out = new Array(vals.length).fill(null);
    for (let i = period - 1; i < vals.length; i += 1) {
      let sum = 0, ok = true;
      for (let j = i - period + 1; j <= i; j += 1) {
        const v = Number(vals[j]);
        if (!Number.isFinite(v)) { ok = false; break; }
        sum += v;
      }
      if (ok) out[i] = sum / period;
    }
    return out;
  }
  function supportResistance(closes, current, extra) {
    const n = closes.length;
    const levels = [];
    const add = (price, type, source) => { const p = fin(price); if (p != null && p > 0) levels.push({ price: p, type, source }); };
    [20, 50, 100].forEach((w) => {
      const slice = closes.slice(Math.max(0, n - w)).map(Number).filter(Number.isFinite);
      if (slice.length) { add(Math.min(...slice), "recentLow", `${w}D low`); add(Math.max(...slice), "recentHigh", `${w}D high`); }
    });
    const k = 5;
    for (let i = k; i < n - k; i += 1) {
      const v = Number(closes[i]);
      if (!Number.isFinite(v)) continue;
      let isHigh = true, isLow = true;
      for (let j = i - k; j <= i + k; j += 1) {
        const x = Number(closes[j]);
        if (!Number.isFinite(x)) continue;
        if (x > v) isHigh = false;
        if (x < v) isLow = false;
      }
      if (isHigh) add(v, "swingHigh", "swing high");
      if (isLow) add(v, "swingLow", "swing low");
    }
    (extra || []).forEach((e) => add(e.price, e.type, e.source));
    const dedup = [];
    levels.sort((a, b) => a.price - b.price).forEach((l) => {
      if (!dedup.some((d) => Math.abs(d.price - l.price) / l.price < 0.005)) dedup.push(l);
    });
    const supports = dedup.filter((l) => l.price < current).map((l) => ({ ...l, distancePercent: ((l.price - current) / current) * 100 })).sort((a, b) => b.price - a.price);
    const resistances = dedup.filter((l) => l.price > current).map((l) => ({ ...l, distancePercent: ((l.price - current) / current) * 100 })).sort((a, b) => a.price - b.price);
    return { supports, resistances };
  }

  // ---------------------------------------------------------------- chart
  function rangeCount(r, len) {
    const map = { "1M": 22, "3M": 66, "6M": 132, "1Y": 252, "3Y": 756, MAX: len };
    return Math.min(len, map[r] || 252);
  }
  function fmtAxis(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return "";
    if (Math.abs(n) >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
    return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }

  // Candlestick + volume chart with price/date axes. Falls back to a line chart
  // when only closing prices are available (e.g. Thai mutual-fund NAV).
  // Build the candle series, reconciling stale OHLC bars with the latest snapshot
  // closes so the most recent day always matches the real latest price + direction.
  function effectiveBars(c) {
    const closes = (c.closes || []).map(Number);
    const dates = c.dates || [];
    const vols = c.volumes || [];
    let bars = Array.isArray(c.bars) ? c.bars.map((b) => ({ date: b.date, open: Number(b.open), high: Number(b.high), low: Number(b.low), close: Number(b.close), volume: Number(b.volume) })) : [];
    if (closes.length < 1) return bars;
    let startIdx, prevClose;
    if (bars.length) {
      const di = dates.lastIndexOf(bars[bars.length - 1].date);
      if (di < 0) return bars; // dates don't align with snapshot — trust OHLC as-is
      startIdx = di + 1;
      prevClose = bars[bars.length - 1].close;
    } else {
      bars.push({ date: dates[0], open: closes[0], high: closes[0], low: closes[0], close: closes[0], volume: Number(vols[0]) || null });
      startIdx = 1;
      prevClose = closes[0];
    }
    for (let i = startIdx; i < closes.length; i += 1) {
      const cl = closes[i];
      if (!Number.isFinite(cl)) continue;
      const op = Number.isFinite(prevClose) ? prevClose : cl;
      bars.push({ date: dates[i], open: op, high: Math.max(op, cl), low: Math.min(op, cl), close: cl, volume: Number(vols[i]) || null });
      prevClose = cl;
    }
    return bars;
  }

  function drawChart() {
    const c = CURRENT;
    if (!c || ((!c.closes || c.closes.length < 2) && (!c.bars || c.bars.length < 2))) {
      return `<div class="mc-empty"><strong>ไม่มีข้อมูลกราฟ</strong>กด Load Latest Data เพื่อโหลดราคาย้อนหลัง</div>`;
    }
    const allBars = effectiveBars(c);
    const hasOHLC = allBars.length > 1;
    const fullCloses = hasOHLC ? allBars.map((b) => Number(b.close)) : c.closes.map(Number);
    const fullDates = hasOHLC ? allBars.map((b) => b.date) : c.dates;
    const e12f = emaSeries(fullCloses, 12), e26f = emaSeries(fullCloses, 26), s200f = smaSeries(fullCloses, 200);
    const count = rangeCount(range, fullCloses.length);
    const s = Math.max(0, fullCloses.length - count);
    const closes = fullCloses.slice(s);
    const dates = fullDates.slice(s);
    const e12 = e12f.slice(s), e26 = e26f.slice(s), s200 = s200f.slice(s);
    const bars = hasOHLC ? allBars.slice(s) : null;
    const n = closes.length;
    if (n < 2) return `<div class="mc-empty"><strong>ข้อมูลย้อนหลังไม่พอ</strong></div>`;

    const W = 1000, H = 380, leftPad = 8, rightPad = 52, topPad = 8;
    const showVol = hasOHLC && bars.some((b) => Number.isFinite(Number(b.volume)) && Number(b.volume) > 0);
    const priceBottom = showVol ? 286 : 344;
    const volTop = priceBottom + 14, volBottom = 360;
    const innerW = W - leftPad - rightPad;

    const pv = [];
    if (hasOHLC) bars.forEach((b) => { const h = Number(b.high), l = Number(b.low); if (Number.isFinite(h)) pv.push(h); if (Number.isFinite(l)) pv.push(l); });
    else closes.forEach((v) => { if (Number.isFinite(v)) pv.push(v); });
    [e12, e26, s200].forEach((arr) => arr.forEach((v) => { if (Number.isFinite(Number(v))) pv.push(Number(v)); }));
    if (!pv.length) return `<div class="mc-empty"><strong>ไม่มีข้อมูลกราฟ</strong></div>`;
    let pMin = Math.min(...pv), pMax = Math.max(...pv);
    const padP = (pMax - pMin) * 0.06 || 1;
    pMin -= padP; pMax += padP;
    const pSpan = (pMax - pMin) || 1;
    const xAt = (i) => leftPad + (n > 1 ? (i / (n - 1)) * innerW : innerW / 2);
    const pY = (v) => topPad + (1 - (v - pMin) / pSpan) * (priceBottom - topPad);
    const cw = Math.max(1, (innerW / n) * 0.6);

    // gridlines
    let svg = "";
    const yLabels = [];
    const LBL = 5;
    for (let g = 0; g <= LBL; g += 1) {
      const val = pMin + (pSpan * g) / LBL;
      const y = pY(val);
      svg += `<line x1="${leftPad}" y1="${y.toFixed(1)}" x2="${W - rightPad}" y2="${y.toFixed(1)}" stroke="rgba(148,163,184,0.10)" stroke-width="1"/>`;
      yLabels.push(`<div class="a360-ylabel" style="top:${((y / H) * 100).toFixed(2)}%">${c.cur}${fmtAxis(val)}</div>`);
    }

    // volume
    if (showVol) {
      const vmax = Math.max(...bars.map((b) => Number(b.volume) || 0)) || 1;
      bars.forEach((b, i) => {
        const v = Number(b.volume);
        if (!Number.isFinite(v) || v <= 0) return;
        const up = Number(b.close) >= Number(b.open);
        const h = (v / vmax) * (volBottom - volTop);
        svg += `<rect x="${(xAt(i) - cw / 2).toFixed(1)}" y="${(volBottom - h).toFixed(1)}" width="${cw.toFixed(1)}" height="${h.toFixed(1)}" fill="${up ? "#10b981" : "#f43f5e"}" opacity="0.4"/>`;
      });
    }

    // candles or line
    if (hasOHLC) {
      bars.forEach((b, i) => {
        const o = Number(b.open), h = Number(b.high), l = Number(b.low), cl = Number(b.close);
        if (![o, h, l, cl].every(Number.isFinite)) return;
        const up = cl >= o;
        const col = up ? "#10b981" : "#f43f5e";
        const x = xAt(i);
        svg += `<line x1="${x.toFixed(1)}" y1="${pY(h).toFixed(1)}" x2="${x.toFixed(1)}" y2="${pY(l).toFixed(1)}" stroke="${col}" stroke-width="1"/>`;
        const yT = pY(Math.max(o, cl)), yB = pY(Math.min(o, cl));
        svg += `<rect x="${(x - cw / 2).toFixed(1)}" y="${yT.toFixed(1)}" width="${cw.toFixed(1)}" height="${Math.max(1, yB - yT).toFixed(1)}" fill="${col}"/>`;
      });
    } else {
      const pts = closes.map((v, i) => (Number.isFinite(v) ? `${xAt(i).toFixed(1)},${pY(v).toFixed(1)}` : null)).filter(Boolean).join(" ");
      svg += `<polyline points="${pts}" fill="none" stroke="#22d3ee" stroke-width="2"/>`;
    }

    // overlays EMA/SMA
    const lineOf = (arr, color, dash) => {
      const pts = arr.map((v, i) => (Number.isFinite(Number(v)) ? `${xAt(i).toFixed(1)},${pY(Number(v)).toFixed(1)}` : null)).filter(Boolean).join(" ");
      return pts ? `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" ${dash ? `stroke-dasharray="${dash}"` : ""}/>` : "";
    };
    svg += lineOf(s200, "#64748b", "6 4") + lineOf(e26, "#a855f7") + lineOf(e12, "#f59e0b");

    // x-axis date labels
    const xLabels = [];
    const ticks = Math.min(6, n);
    for (let t = 0; t < ticks; t += 1) {
      const i = Math.round((t * (n - 1)) / (ticks - 1 || 1));
      xLabels.push(`<div class="a360-xlabel" style="left:${((xAt(i) / W) * 100).toFixed(2)}%">${esc(String(dates[i] || "").slice(2))}</div>`);
    }

    return `<div class="a360-chart-inner"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${svg}</svg>${yLabels.join("")}${xLabels.join("")}</div>`;
  }

  function redrawChart() {
    const el = document.getElementById("a360Chart");
    if (el) el.innerHTML = drawChart();
  }

  function ensureOhlc() {
    if (!CURRENT || CURRENT.bars) return;
    const key = CURRENT.key;
    if (ohlcCache[key]) { CURRENT.bars = ohlcCache[key]; redrawChart(); return; }
    const sym = CURRENT.providerSymbol || key;
    fetch(`/api/ohlc?symbol=${encodeURIComponent(sym)}&days=1500`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const bars = d && Array.isArray(d.bars) ? d.bars.filter((b) => Number.isFinite(Number(b.close))) : [];
        if (bars.length) { ohlcCache[key] = bars; if (CURRENT && CURRENT.key === key) { CURRENT.bars = bars; redrawChart(); } }
      })
      .catch(() => {});
  }

  // ---------------------------------------------------------------- render
  function render() {
    const snapshot = getSnapshot();
    const raw = rawSymbol();
    if (!raw) { root.innerHTML = emptyPage("ไม่พบสัญลักษณ์ในลิงก์"); return; }
    if (!snapshot) { root.innerHTML = noSnapshotPage(raw); wireButtons(); return; }

    const key = resolveKey(raw, snapshot);
    const asset = (snapshot.assets || []).find((a) => (a.canonicalSymbol || a.ticker) === key) || {};
    const hist = (snapshot.historicalData && snapshot.historicalData[key]) || {};
    const tech = (snapshot.technicalSignals && snapshot.technicalSignals[key]) || {};
    const rsi = (snapshot.rsiSignals && snapshot.rsiSignals[key]) || {};
    const holding = ((snapshot.portfolioHoldings && snapshot.portfolioHoldings.data) || []).find((h) => canonicalize(h.canonicalSymbol) === key) || null;
    const exposure = (snapshot.exposureMap && snapshot.exposureMap.assetExposures && snapshot.exposureMap.assetExposures[key]) || {};
    const risk = (snapshot.marketRisk && snapshot.marketRisk.risk) || {};

    const closes = Array.isArray(hist.closes) ? hist.closes.map(Number) : [];
    const dates = Array.isArray(hist.dates) ? hist.dates : [];
    const price = fin(tech.latestClose) ?? fin(hist.latestClose) ?? fin(closes[closes.length - 1]);
    const prevClose = fin(closes[closes.length - 2]);
    const dailyChange = price != null && prevClose != null && prevClose !== 0 ? ((price - prevClose) / prevClose) * 100 : null;
    const cur = currencyFor(key, asset.asset_type || asset.assetType);
    const displaySym = asset.displaySymbol || (key.endsWith(".BK") ? key.slice(0, -3) : key);
    const name = asset.name || displaySym;
    const assetType = asset.asset_type || asset.assetType || "";

    if (price == null && !closes.length) { root.innerHTML = noSnapshotPage(raw, displaySym); wireButtons(); return; }

    // --- scoring (shared engine, fallback to precomputed) ---
    const input = {
      canonicalSymbol: key, displaySymbol: displaySym, assetName: name, assetType,
      latestPrice: price, latestDate: tech.latestDate || hist.latestDate,
      ema12: fin(tech.ema12), ema26: fin(tech.ema26), sma200: fin(tech.sma200),
      rsi14: fin(rsi.rsi14) ?? fin(tech.rsi14),
      emaTrendStatus: tech.emaStatus, sma200Status: tech.sma200Status,
      volumeRatio: fin(tech.volumeRatio),
      daysSinceEmaBullishCross: fin(tech.daysSinceEmaBullishCross),
      daysSinceEmaBearishCross: fin(tech.daysSinceEmaBearishCross),
      daysSinceSma200Reclaim: fin(tech.daysSinceSma200Reclaim),
      daysSinceSma200Break: fin(tech.daysSinceSma200Break),
      isNewBullishSignal: fin(tech.daysSinceEmaBullishCross) != null && fin(tech.daysSinceEmaBullishCross) <= 3,
      marketRiskLevel: risk.level && (risk.level.label || risk.level.thai),
      isHolding: holding ? !!holding.isHolding : false,
      portfolioWeight: holding ? fin(holding.targetWeight) : null,
      marketValue: holding ? fin(holding.marketValue) : null
    };
    let timing = null, quadrant = null, action = null, signal = null;
    if (window.Scoring) {
      try {
        const scored = window.Scoring.scoreAsset(input);
        timing = scored.timing; quadrant = scored.quadrant;
        // PRIMARY: signal-state classification drives the action; the score is secondary.
        signal = window.Scoring.classifySignal(input);
        action = window.Scoring.actionFromSignal(signal, input);
      } catch (_e) { /* ignore */ }
    }
    const sq = window.SignalQuality ? (function () { try { return window.SignalQuality.calculate(input); } catch (_e) { return null; } })() : null;

    // --- chart S/R + state ---
    const dynamicLevels = [];
    if (fin(tech.sma200)) dynamicLevels.push({ price: fin(tech.sma200), type: "sma200", source: "SMA200" });
    if (fin(tech.ema26)) dynamicLevels.push({ price: fin(tech.ema26), type: "ema26", source: "EMA26" });
    const sr = price != null && closes.length >= 20 ? supportResistance(closes, price, dynamicLevels) : { supports: [], resistances: [] };
    CURRENT = { dates, closes, volumes: Array.isArray(hist.volumes) ? hist.volumes : [], cur, sr, key, displaySymbol: displaySym, assetName: name, assetType, currency: cur === "$" ? "USD" : "THB", providerSymbol: asset.providerSymbol || asset.provider_symbol || key, bars: ohlcCache[key] || null };

    const fresh = (window.PortfolioDataSnapshot && window.PortfolioDataSnapshot.freshness && window.PortfolioDataSnapshot.freshness(snapshot)) || { thai: "—", key: "" };

    root.innerHTML = [
      heroSection(displaySym, name, assetType, key, cur, price, dailyChange, timing, action, holding, sq, signal),
      snapshotSection(cur, price, dailyChange, tech.latestDate || hist.latestDate, timing, action, holding, fresh, sq, signal),
      mainGrid(timing, quadrant, action, sq, signal),
      indicatorSection(tech, rsi, price, cur),
      portfolioSection(holding, exposure, key),
      exposureSection(exposure, snapshot, key),
      signalHistorySection(snapshot, key, timing, action),
      dataQualitySection(hist, tech, closes, fresh)
    ].join("");

    wireButtons();
    ensureOhlc();
    if (isDev) console.debug("[asset360]", key, { price, timing: timing && timing.score, action: action && action.action });
  }

  // ---------------------------------------------------------------- sections
  function metric(label, value, sub, subClass) {
    return `<div class="mc-card mc-metric mc-glow">
      <div class="mc-label"><span>${esc(label)}</span></div>
      <div class="mc-value" style="font-size:24px;">${value}</div>
      ${sub ? `<div class="mc-delta ${subClass || ""}">${sub}</div>` : ""}
    </div>`;
  }

  function watchlistControl(key) {
    if (!window.Watchlist) return "";
    const existing = window.Watchlist.getBySymbol(key);
    if (existing) {
      const cat = (window.Watchlist.CATEGORIES[existing.watchCategory] || {}).thai || "";
      return `<span class="ts-chip" style="--ts:#22d3ee">👁️ Watchlist · ${esc(cat)}</span>` +
        `<button class="mc-btn" id="a360WlEdit" type="button" style="padding:5px 11px;font-size:12px;">แก้ไข</button>` +
        `<button class="mc-btn" id="a360WlRemove" type="button" style="padding:5px 11px;font-size:12px;">ลบออก</button>`;
    }
    return `<button class="mc-btn mc-btn-primary" id="a360WlAdd" type="button" style="padding:7px 14px;">+ Add to Watchlist</button>`;
  }

  function heroSection(sym, name, type, key, cur, price, change, timing, action, holding, sq, signal) {
    const tags = (type ? String(type).split(/[\s,/·]+/).filter(Boolean) : []).slice(0, 5);
    const tsChip = timing && window.Scoring ? window.Scoring.renderTimingChip(timing) : "";
    const sigChip = signal && window.Scoring ? window.Scoring.renderSignalChip(signal) : "";
    return `<section class="mc-page-hero mc-fade">
      <div style="display:flex;flex-wrap:wrap;gap:20px;justify-content:space-between;align-items:flex-start;">
        <div style="position:relative;z-index:1;">
          <p class="mc-eyebrow">Asset 360</p>
          <h1 style="margin-bottom:2px;">${esc(sym)}</h1>
          <p class="mc-hero-sub" style="margin:0 0 6px;">${esc(name)}</p>
          <div class="a360-tags">${tags.map((t) => `<span class="a360-tag">${esc(t)}</span>`).join("")}</div>
          ${sigChip ? `<div class="signal-state-row" style="margin-top:10px;">${sigChip}</div>` : ""}
          <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">${watchlistControl(key)}</div>
        </div>
        <div class="a360-hero-cards" style="position:relative;z-index:1;min-width:min(560px,100%);">
          ${metric("Latest Price / NAV", `${cur}${num(price)}`, change == null ? "" : signedPct(change), upDown(change))}
          ${metric("Action", action ? esc(action.thaiAction) : "—", action ? esc(action.action) : "")}
          ${metric("Signal Score (ตัวประกอบ)", timing ? `${timing.score}` : "—", timing ? esc(timing.thaiLabel) : "ยังไม่มีข้อมูล")}
          ${holding ? metric("Portfolio Weight", `${num(holding.targetWeight, 1)}%`, `${cur}${num(holding.marketValue, 0)}`) : metric("Status", "Watchlist", "ยังไม่กระทบพอร์ต")}
        </div>
      </div>
      ${tsChip ? `<div style="position:relative;z-index:1;margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">${tsChip}</div>` : ""}
    </section>`;
  }

  function snapshotSection(cur, price, change, date, timing, action, holding, fresh, sq, signal) {
    const cells = [
      ["ราคา / NAV ล่าสุด", `${cur}${num(price)}`],
      ["เปลี่ยนวันนี้", `<span class="${upDown(change)}">${signedPct(change)}</span>`],
      ["วันที่ล่าสุด", esc(String(date || "—").slice(0, 10))],
      ["สัญญาณ (Signal)", signal ? esc(signal.thaiLabel) : "—"],
      ["Action", action ? esc(action.thaiAction) : "—"],
      ["Signal Score (ตัวประกอบ)", timing ? `${timing.score} · ${esc(timing.thaiLabel)}` : "—"],
      ["ความสดข้อมูล", esc(fresh.thai)]
    ];
    if (holding) {
      cells.push(["มูลค่าถือครอง", `${cur}${num(holding.marketValue, 0)}`]);
      cells.push(["น้ำหนักพอร์ต", `${num(holding.targetWeight, 1)}%`]);
    }
    return panel("Asset Snapshot", "สรุปภาพรวมสินทรัพย์",
      `<div class="a360-ind-grid">${cells.map(([l, v]) => `<div class="a360-ind"><h4>${esc(l)}</h4><div class="a360-big">${v}</div></div>`).join("")}</div>`);
  }

  function mainGrid(timing, quadrant, action, sq, signal) {
    const chart = `<section class="mc-card mc-panel mc-fade">
      <div class="mc-panel-head">
        <div><h2>Price Chart</h2><span class="mc-sub">แท่งเทียน + วอลุ่ม + EMA12 / EMA26 / SMA200</span></div>
        <div class="a360-range" id="a360Range">
          ${["1M", "3M", "6M", "1Y", "3Y", "MAX"].map((r) => `<button class="${r === range ? "is-active" : ""}" data-range="${r}">${r}</button>`).join("")}
        </div>
      </div>
      <div class="a360-chart-wrap" id="a360Chart">${drawChart()}</div>
      <div class="a360-legend">
        <span><i style="background:#10b981"></i>แท่งขึ้น</span>
        <span><i style="background:#f43f5e"></i>แท่งลง</span>
        <span><i style="background:#f59e0b"></i>EMA12</span>
        <span><i style="background:#a855f7"></i>EMA26</span>
        <span><i style="background:#64748b"></i>SMA200</span>
      </div>
    </section>`;

    const reasons = (timing && timing.reasons) || [];
    const conflicts = (timing && timing.conflicts) || [];
    const warnings = (timing && timing.warnings) || [];
    const sqCardHtml = sq && window.SignalQuality ? window.SignalQuality.renderCard(sq, { thai: true }) : "";
    const sigChip = signal && window.Scoring ? window.Scoring.renderSignalChip(signal) : "";
    const timingPanel = `<section class="mc-card mc-panel mc-fade">
      <div class="mc-panel-head"><h2>Signal &amp; Action</h2></div>
      <div class="signal-state-row" style="margin-bottom:10px;">${sigChip || '<span class="ts-chip ts-na">—</span>'}</div>
      <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;">
        <div><div style="font-size:13px;font-weight:700;">${action ? esc(action.thaiAction) : "—"}</div><div style="font-size:11.5px;color:var(--mc-muted);">${action ? esc(action.action) : ""}</div></div>
        ${timing && window.Scoring ? window.Scoring.renderTimingChip(timing) : '<span class="ts-chip ts-na">—</span>'}
      </div>
      <div style="font-size:11.5px;color:var(--mc-muted);margin-top:8px;line-height:1.6;">
        <strong style="color:var(--mc-text);">สัญญาณ (Signal State)</strong> = ตัวหลัก · <strong style="color:var(--mc-text);">Signal Score</strong> เป็นตัวประกอบ · น้ำหนัก EMA12/26 50% · SMA200 35% · Volume(5วัน) 15% · วอลุ่มใช้ยืนยัน ไม่ใช่เหตุผลซื้อหลัก
        <div style="margin-top:2px;">ซื้อไม้แรกเมื่อ EMA12 &gt; EMA26 · ซื้อเพิ่มเมื่อราคา &gt; SMA200 + วอลุ่ม confirm · ขายไม้แรกเมื่อ EMA12 &lt; EMA26 · ขายหมดเมื่อราคา &lt; SMA200</div>
      </div>
      <div style="font-size:12px;color:var(--mc-muted);margin-top:10px;">Quadrant: <strong style="color:var(--mc-text);">${quadrant ? esc(quadrant.thaiLabel) : "—"}</strong></div>
      ${reasons.length ? `<ul class="a360-reasons">${reasons.slice(0, 3).map((r) => `<li>${esc(r)}</li>`).join("")}</ul>` : ""}
      ${conflicts.map((c) => `<div class="a360-conflict">⚠ ${esc(c.thaiMessage || c.message)}</div>`).join("")}
      ${warnings.length ? `<details class="decision-details" style="margin-top:8px;"><summary style="cursor:pointer;font-size:12px;color:var(--mc-cyan);">ดูรายละเอียดเพิ่มเติม</summary><ul class="a360-reasons">${warnings.map((w) => `<li>${esc(w.thaiMessage || w.message || w)}</li>`).join("")}</ul></details>` : ""}
      ${sqCardHtml ? `<div style="margin-top:14px;">${sqCardHtml}</div>` : ""}
    </section>`;

    return `<div class="a360-main-grid">${chart}${timingPanel}</div>`;
  }

  function indicatorSection(tech, rsi, price, cur) {
    const ema12 = fin(tech.ema12), ema26 = fin(tech.ema26), sma200 = fin(tech.sma200);
    const rsiVal = fin(rsi.rsi14) ?? fin(tech.rsi14);
    const distSma = sma200 != null && price != null && sma200 !== 0 ? ((price - sma200) / sma200) * 100 : null;
    const emaState = tech.emaStatus === "EMA_BULLISH" ? "ขาขึ้น (Bullish)" : tech.emaStatus === "EMA_BEARISH" ? "ขาลง (Bearish)" : "—";
    const rsiZone = rsiVal == null ? "—" : rsiVal >= 70 ? "Overbought" : rsiVal <= 30 ? "Oversold" : rsiVal >= 60 ? "แข็งแรง" : rsiVal <= 40 ? "อ่อนแรง" : "กลาง";
    const rsiSig = rsi.signal || tech.rsiSignal || "—";
    return panel("Technical Indicators", "ตัวชี้วัดทางเทคนิค", `<div class="a360-ind-grid">
      <div class="a360-ind"><h4>EMA แนวโน้ม</h4><div class="a360-big">${esc(emaState)}</div>
        <div class="a360-row"><span>EMA12</span><strong>${num(ema12)}</strong></div>
        <div class="a360-row"><span>EMA26</span><strong>${num(ema26)}</strong></div></div>
      <div class="a360-ind"><h4>สถานะ SMA200</h4><div class="a360-big">${tech.sma200Status === "ABOVE_SMA200" ? "เหนือ SMA200" : tech.sma200Status === "BELOW_SMA200" ? "ต่ำกว่า SMA200" : "—"}</div>
        <div class="a360-row"><span>SMA200</span><strong>${num(sma200)}</strong></div>
        <div class="a360-row"><span>ระยะห่าง</span><strong class="${upDown(distSma)}">${signedPct(distSma)}</strong></div></div>
      <div class="a360-ind"><h4>RSI</h4><div class="a360-big">${rsiVal == null ? "—" : rsiVal.toFixed(1)}</div>
        <div class="a360-sub">${esc(rsiZone)}</div>
        <div class="a360-row"><span>Signal</span><strong>${esc(rsiSig)}</strong></div></div>
      <div class="a360-ind"><h4>วอลุ่ม</h4><div class="a360-big">${fin(tech.volumeRatio) != null ? num(tech.volumeRatio) + "x" : "—"}</div>
        <div class="a360-sub">${fin(tech.volumeRatio) != null ? (tech.volumeRatio >= 1 ? "ยืนยัน" : "ยังไม่ยืนยัน") : "ไม่มีข้อมูลวอลุ่ม"}</div></div>
    </div>`);
  }

  function srSection(sr, cur) {
    if (!sr.supports.length && !sr.resistances.length) {
      return panel("Support / Resistance", "แนวรับ / แนวต้าน", `<div class="mc-empty"><strong>ข้อมูลย้อนหลังไม่พอสำหรับคำนวณแนวรับแนวต้าน</strong></div>`);
    }
    const sup = sr.supports[0];
    const res = sr.resistances[0];
    const list = (arr) => arr.slice(0, 4).map((l) => `<div class="a360-row"><span>${cur}${num(l.price)} <small>· ${esc(l.source)}</small></span><strong class="${upDown(l.distancePercent)}">${signedPct(l.distancePercent)}</strong></div>`).join("");
    return panel("Support / Resistance", "แนวรับ / แนวต้าน (ประเมินจากราคาในอดีต)", `<div class="a360-sr-grid">
      <div class="a360-sr is-support"><h4>แนวรับใกล้สุด</h4>
        <div class="a360-level">${sup ? cur + num(sup.price) : "—"}</div>
        <div class="a360-dist ${sup ? upDown(sup.distancePercent) : ""}">${sup ? signedPct(sup.distancePercent) : ""}</div>
        <div class="a360-sr-list">${list(sr.supports)}</div></div>
      <div class="a360-sr is-resistance"><h4>แนวต้านใกล้สุด</h4>
        <div class="a360-level">${res ? cur + num(res.price) : "—"}</div>
        <div class="a360-dist ${res ? upDown(res.distancePercent) : ""}">${res ? signedPct(res.distancePercent) : ""}</div>
        <div class="a360-sr-list">${list(sr.resistances)}</div></div>
    </div>
    <p class="a360-disclaimer">* แนวรับแนวต้านเป็นการประเมินจากข้อมูลราคาในอดีต ไม่ใช่การรับประกันราคา</p>`);
  }

  function portfolioSection(holding, exposure, key) {
    if (!holding) {
      return panel("Portfolio Impact", "ผลต่อพอร์ต", `<div class="mc-empty"><strong>Watchlist Only · อยู่ใน Watchlist เท่านั้น</strong>ยังไม่กระทบพอร์ตจริง</div>`);
    }
    const tags = (exposure.tags || []).slice(0, 6);
    return panel("Portfolio Impact", "ผลต่อพอร์ต", `<div class="a360-ind-grid">
      <div class="a360-ind"><h4>มูลค่าถือครอง</h4><div class="a360-big">${num(holding.marketValue, 0)}</div></div>
      <div class="a360-ind"><h4>น้ำหนักพอร์ต</h4><div class="a360-big">${num(holding.targetWeight, 1)}%</div></div>
      <div class="a360-ind"><h4>จำนวน</h4><div class="a360-big">${num(holding.quantity, 4)}</div></div>
      <div class="a360-ind"><h4>ต้นทุนเฉลี่ย</h4><div class="a360-big">${num(holding.averageCost)}</div></div>
    </div>
    ${tags.length ? `<p style="margin-top:12px;font-size:13px;color:var(--mc-text-2);">สินทรัพย์นี้มีส่วนเพิ่ม exposure ในกลุ่ม: <strong style="color:var(--mc-text);">${tags.map(esc).join(", ")}</strong></p>` : ""}`);
  }

  function exposureSection(exposure, snapshot, key) {
    const tags = exposure.tags || [];
    // overlap: other holdings sharing a tag
    const overlaps = [];
    const assetExposures = (snapshot.exposureMap && snapshot.exposureMap.assetExposures) || {};
    if (tags.length) {
      Object.keys(assetExposures).forEach((sym) => {
        if (sym === key) return;
        const otherTags = assetExposures[sym].tags || [];
        if (otherTags.some((t) => tags.includes(t))) overlaps.push(sym.endsWith(".BK") ? sym.slice(0, -3) : sym);
      });
    }
    return panel("Underlying Exposure", "ไส้ใน / ความซ้ำซ้อน", `
      ${tags.length ? `<div class="a360-tags">${tags.map((t) => `<span class="a360-tag">${esc(t)}</span>`).join("")}</div>` : `<div class="mc-empty"><strong>ยังไม่มีข้อมูล exposure</strong></div>`}
      ${overlaps.length ? `<p style="margin-top:12px;font-size:13px;color:var(--mc-text-2);">ซ้ำซ้อนกับ: <strong style="color:var(--mc-text);">${overlaps.slice(0, 8).map(esc).join(", ")}</strong></p>` : ""}`);
  }

  function signalHistorySection(snapshot, key, timing, action) {
    const rows = [];
    // Use the SAME live-computed score/action shown in the main card (single source of truth).
    const tech = (snapshot.technicalSignals && snapshot.technicalSignals[key]) || {};
    const score = timing && timing.score != null ? timing.score : "";
    if (timing) {
      rows.push({ date: String((snapshot && snapshot.loadedAt) || "").slice(0, 10), signal: "Signal Score", detail: timing.thaiLabel || "", action: action ? action.thaiAction : "", score: score });
    }
    if (tech.emaStatus === "EMA_BULLISH") rows.push({ date: String(tech.latestDate || "").slice(0, 10), signal: "EMA Bullish", detail: "EMA12 เหนือ EMA26", action: "", score: "" });
    if (tech.sma200Status === "ABOVE_SMA200") rows.push({ date: String(tech.latestDate || "").slice(0, 10), signal: "Above SMA200", detail: "ราคายืนเหนือ SMA200", action: "", score: "" });
    if (!rows.length) {
      return panel("Signal History", "ประวัติสัญญาณ", `<div class="mc-empty"><strong>ยังไม่มีประวัติสัญญาณของสินทรัพย์นี้</strong>ระบบยังไม่ได้เก็บ event log ย้อนหลัง</div>`);
    }
    return panel("Signal History", "ประวัติสัญญาณ (ปัจจุบัน)", `<table class="a360-table">
      <thead><tr><th>วันที่</th><th>สัญญาณ</th><th>รายละเอียด</th><th>Action</th><th class="num">Timing</th></tr></thead>
      <tbody>${rows.map((r) => `<tr><td>${esc(r.date || "—")}</td><td>${esc(r.signal)}</td><td>${esc(r.detail)}</td><td>${esc(r.action || "—")}</td><td class="num">${esc(String(r.score || "—"))}</td></tr>`).join("")}</tbody>
    </table>`);
  }

  function dataQualitySection(hist, tech, closes, fresh) {
    const indicators = [];
    if (fin(tech.ema12) != null) indicators.push("EMA12");
    if (fin(tech.ema26) != null) indicators.push("EMA26");
    if (fin(tech.sma200) != null) indicators.push("SMA200");
    if (fin(tech.rsi14) != null) indicators.push("RSI14");
    const missing = [];
    if (fin(tech.volumeRatio) == null) missing.push("Volume");
    if (closes.length < 200) missing.push("ข้อมูล < 200 จุด (SMA200 อาจไม่ครบ)");
    const staleWarn = fresh.key && fresh.key !== "fresh" && fresh.key !== "recent" ? `<div class="a360-conflict" style="color:var(--mc-amber);">⚠ ข้อมูลเริ่มเก่า ควรกด Load Latest Data</div>` : "";
    return panel("Data Quality", "คุณภาพ / แหล่งข้อมูล", `<div class="a360-ind-grid">
      <div class="a360-ind"><h4>แหล่งข้อมูล</h4><div class="a360-big" style="font-size:14px;">${esc(hist.source || hist.sourceType || "Data Snapshot")}</div></div>
      <div class="a360-ind"><h4>จุดข้อมูลย้อนหลัง</h4><div class="a360-big">${closes.length}</div></div>
      <div class="a360-ind"><h4>Indicators</h4><div class="a360-big" style="font-size:13px;">${indicators.length ? indicators.join(", ") : "—"}</div></div>
      <div class="a360-ind"><h4>ข้อมูลที่ขาด</h4><div class="a360-big" style="font-size:13px;">${missing.length ? missing.join(" · ") : "ครบถ้วน"}</div></div>
    </div>${staleWarn}`);
  }

  function panel(title, sub, body) {
    return `<section class="mc-card mc-panel mc-fade">
      <div class="mc-panel-head"><div><h2>${esc(title)}</h2>${sub ? `<span class="mc-sub">${esc(sub)}</span>` : ""}</div></div>
      ${body}
    </section>`;
  }

  function emptyPage(msg) {
    return `<section class="mc-card mc-panel"><div class="mc-empty"><strong>${esc(msg)}</strong></div></section>`;
  }
  function noSnapshotPage(raw, sym) {
    return `<section class="mc-page-hero mc-fade"><p class="mc-eyebrow">Asset 360</p><h1>${esc(sym || raw)}</h1><p class="mc-hero-sub">ยังไม่มีข้อมูลของสินทรัพย์นี้</p></section>
      <section class="mc-card mc-panel"><div class="mc-empty"><strong>ยังไม่มีข้อมูลของสินทรัพย์นี้ / Data not loaded</strong>กด "Load Latest Data" ด้านบนเพื่อโหลดข้อมูล แล้วเปิดหน้านี้อีกครั้ง
      <div style="margin-top:14px;"><button class="mc-btn mc-btn-primary" id="a360Load" type="button">Load Latest Data</button></div></div></section>`;
  }

  function wireButtons() {
    const rangeEl = document.getElementById("a360Range");
    if (rangeEl) rangeEl.addEventListener("click", (e) => {
      const b = e.target.closest("[data-range]");
      if (!b) return;
      range = b.dataset.range;
      rangeEl.querySelectorAll("[data-range]").forEach((x) => x.classList.toggle("is-active", x === b));
      redrawChart();
    });
    const wlAdd = document.getElementById("a360WlAdd");
    if (wlAdd) wlAdd.addEventListener("click", () => window.Watchlist && window.Watchlist.openModal({
      canonicalSymbol: CURRENT.key, displaySymbol: CURRENT.displaySymbol, assetName: CURRENT.assetName,
      assetType: CURRENT.assetType, providerSymbol: CURRENT.providerSymbol, currency: CURRENT.currency
    }));
    const wlEdit = document.getElementById("a360WlEdit");
    if (wlEdit) wlEdit.addEventListener("click", () => { const it = window.Watchlist && window.Watchlist.getBySymbol(CURRENT.key); if (it) window.Watchlist.openModal(it); });
    const wlRemove = document.getElementById("a360WlRemove");
    if (wlRemove) wlRemove.addEventListener("click", () => { const it = window.Watchlist && window.Watchlist.getBySymbol(CURRENT.key); if (it && window.confirm("ลบออกจาก Watchlist?")) window.Watchlist.remove(it.id); });

    const loadBtn = document.getElementById("a360Load");
    if (loadBtn) loadBtn.addEventListener("click", () => {
      const api = window.PortfolioDataSnapshot;
      if (api && api.loadLatestData) {
        loadBtn.disabled = true;
        loadBtn.textContent = "Loading...";
        api.loadLatestData().then(render).catch(() => { loadBtn.disabled = false; loadBtn.textContent = "Load Latest Data"; });
      }
    });
  }

  window.addEventListener("portfolio-data-snapshot", render);
  window.addEventListener("watchlist-updated", render);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render);
  else render();
})();
