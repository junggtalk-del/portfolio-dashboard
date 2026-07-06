(function () {
  "use strict";

  // ============================================================
  // window.MarketRegime — the single Global Market Regime engine.
  // Layered model: Macro Environment -> Market Structure -> (Portfolio -> Action).
  // Weighted, RENORMALISING scoring so the score is valid from whatever data is
  // connected today and improves as more sources plug in (future-ready: VIX, MOVE,
  // credit spreads, oil, copper, yield curve all slot in as new COMPONENTS).
  // Reads the data snapshot ONLY (no network). Browser global + CommonJS export.
  // ============================================================

  // Canonical snapshot keys (first match wins; allows free Yahoo fallbacks).
  const SYM = {
    btc: ["BTCUSD", "BTC-USD"],
    nasdaq: ["^IXIC", "^NDX", "QQQM", "^GSPC"],
    dxy: ["DX-Y.NYB", "DXY", "DX=F"],
    yield10: ["^TNX"],
    gold: ["GLD", "IAU", "GC=F", "XAUUSD"]
  };

  function fin(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }
  function read() { try { return (window.PortfolioDataSnapshot && window.PortfolioDataSnapshot.read && window.PortfolioDataSnapshot.read()) || null; } catch (e) { return null; } }
  function closesOf(snap, keys) {
    const hd = (snap && snap.historicalData) || {};
    for (const k of keys) {
      const h = hd[k];
      if (h && Array.isArray(h.closes) && h.closes.length) {
        const closes = h.closes.map(Number).filter(Number.isFinite);
        if (closes.length >= 2) return { closes, dates: h.dates || [], key: k, source: h.source };
      }
    }
    return null;
  }
  function sma(arr, p) { if (!arr || arr.length < p) return null; const s = arr.slice(-p); return s.reduce((a, b) => a + b, 0) / p; }
  function pctOverDays(closes, days) { if (!closes || closes.length < days + 1) return null; const a = closes[closes.length - 1 - days], b = closes[closes.length - 1]; if (!(a > 0)) return null; return (b - a) / a * 100; }
  function arrow(pct) { if (pct == null) return "flat"; if (pct > 0.3) return "up"; if (pct < -0.3) return "down"; return "flat"; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function stdev(a) { if (!a.length) return 0; const m = a.reduce((s, v) => s + v, 0) / a.length; return Math.sqrt(a.reduce((s, v) => s + (v - m) * (v - m), 0) / a.length); }
  function dedupe(a) { const seen = {}, out = []; a.forEach((x) => { if (!seen[x]) { seen[x] = 1; out.push(x); } }); return out; }
  function statusOf(sub) { return sub >= 58 ? "improving" : sub >= 42 ? "neutral" : "weakening"; }

  // ---- per-component scorers (higher sub = more RISK-ON) ----
  function scoreBtc(snap) {
    const c = closesOf(snap, SYM.btc); if (!c) return { available: false };
    const price = c.closes[c.closes.length - 1];
    const ma200 = sma(c.closes, 200);
    const t1 = pctOverDays(c.closes, 21), t3 = pctOverDays(c.closes, 63);
    let sub = 50; const reasons = [];
    if (ma200 != null) { const above = price > ma200; sub = above ? 80 : 25; reasons.push(above ? "BTC ยืนเหนือ MA200 (เทรนด์ใหญ่เป็นบวก)" : "BTC ต่ำกว่า MA200 (เทรนด์ใหญ่เป็นลบ)"); }
    if (t3 != null) sub += clamp(t3 * 0.2, -12, 12);
    sub = clamp(sub, 0, 100);
    return { available: true, sub, raw: price, displayValue: "$" + Math.round(price).toLocaleString("en-US"), ma200, t1, t3, trend1m: arrow(t1), trend3m: arrow(t3), reasons, status: statusOf(sub) };
  }
  function scoreNasdaq(snap) {
    const c = closesOf(snap, SYM.nasdaq); if (!c) return { available: false };
    const closes = c.closes, price = closes[closes.length - 1];
    const hi = Math.max.apply(null, closes.slice(-63));
    const ma50 = sma(closes, 50);
    const t1 = pctOverDays(closes, 21), t3 = pctOverDays(closes, 63);
    let sub = 50; const reasons = [];
    const hh = price >= hi * 0.995;
    if (hh) { sub = 78; reasons.push("Nasdaq ทำ Higher High (โครงสร้างขาขึ้นยังอยู่)"); }
    else if (ma50 != null && price > ma50) { sub = 58; reasons.push("Nasdaq เหนือ MA50 (ขาขึ้นระยะกลาง)"); }
    else { sub = 34; reasons.push("Nasdaq อ่อนแรง ต่ำกว่าโครงสร้างขาขึ้น"); }
    if (t3 != null) sub += clamp(t3 * 0.3, -10, 10);
    sub = clamp(sub, 0, 100);
    return { available: true, sub, raw: price, displayValue: Math.round(price).toLocaleString("en-US"), hh, t1, t3, trend1m: arrow(t1), trend3m: arrow(t3), reasons, status: statusOf(sub), srcKey: c.key };
  }
  function scoreDxy(snap) {
    const c = closesOf(snap, SYM.dxy); if (!c) return { available: false };
    const closes = c.closes, val = closes[closes.length - 1];
    const t1 = pctOverDays(closes, 21), t3 = pctOverDays(closes, 63);
    const ma50 = sma(closes, 50);
    let sub = 50; const reasons = [];
    if (t3 != null) sub = 50 - t3 * 6;               // weaker dollar => risk-on
    if (ma50 != null) { if (val < ma50) { sub += 8; reasons.push("DXY ต่ำกว่า MA50 (ดอลลาร์อ่อน = หนุนสินทรัพย์เสี่ยง)"); } else { sub -= 8; reasons.push("DXY เหนือ MA50 (ดอลลาร์แข็ง = กดดันสินทรัพย์เสี่ยง)"); } }
    sub = clamp(sub, 0, 100);
    // For DXY the macro arrow is inverted for "risk" — a DOWN dollar is risk-positive.
    return { available: true, sub, raw: val, displayValue: val.toFixed(2), t1, t3, trend1m: arrow(t1), trend3m: arrow(t3), inverted: true, reasons, status: statusOf(sub) };
  }
  function scoreYield(snap) {
    const c = closesOf(snap, SYM.yield10); if (!c) return { available: false };
    const closes = c.closes, val = closes[closes.length - 1];
    const t1 = pctOverDays(closes, 21), t3 = pctOverDays(closes, 63);
    let sub = 50; const reasons = [];
    if (t3 != null) { sub = 50 - t3 * 4; reasons.push(t3 < 0 ? "ผลตอบแทนพันธบัตร 10Y ลดลง (หนุน valuation สินทรัพย์เสี่ยง)" : "ผลตอบแทนพันธบัตร 10Y สูงขึ้น (กดดัน valuation)"); }
    sub = clamp(sub, 0, 100);
    const pct = val > 20 ? val / 10 : val; // ^TNX is sometimes yield x10
    return { available: true, sub, raw: val, displayValue: pct.toFixed(2) + "%", t1, t3, trend1m: arrow(t1), trend3m: arrow(t3), inverted: true, reasons, status: statusOf(sub), proxy: true, note: "ใช้ 10Y nominal (^TNX) แทน real yield — ต่อ FRED (DFII10) เพื่อค่าจริง" };
  }
  function scoreGli(snap) { return { available: false, note: "Global Liquidity Index ต้องต่อ FRED/แหล่งพิเศษ (plug-in)" }; }
  function scoreFed(snap) { return { available: false, note: "Fed Net Liquidity = WALCL − TGA − RRP ต้องต่อ FRED API key (plug-in)" }; }
  // Macro-only (not weighted in the regime score, but shown as a card).
  function scoreGold(snap) {
    const c = closesOf(snap, SYM.gold); if (!c) return { available: false };
    const closes = c.closes, val = closes[closes.length - 1];
    const t1 = pctOverDays(closes, 21), t3 = pctOverDays(closes, 63);
    return { available: true, raw: val, displayValue: "$" + Math.round(val).toLocaleString("en-US"), t1, t3, trend1m: arrow(t1), trend3m: arrow(t3) };
  }

  const COMPONENTS = [
    { key: "gli", label: "Global Liquidity Index", short: "GLI", weight: 30, score: scoreGli },
    { key: "fedNetLiquidity", label: "Fed Net Liquidity", short: "Fed Liq", weight: 20, score: scoreFed },
    { key: "dxy", label: "Dollar Index (DXY)", short: "DXY", weight: 15, score: scoreDxy },
    { key: "real10y", label: "US 10Y Real Yield", short: "10Y Real", weight: 15, score: scoreYield },
    { key: "btcMa200", label: "Bitcoin vs MA200", short: "BTC", weight: 10, score: scoreBtc },
    { key: "nasdaqHH", label: "Nasdaq Higher High", short: "Nasdaq", weight: 10, score: scoreNasdaq }
  ];

  function regimeOf(score) {
    if (score >= 60) return { key: "risk-on", label: "Risk-On", thai: "เปิดรับความเสี่ยง" };
    if (score >= 40) return { key: "neutral", label: "Neutral", thai: "เป็นกลาง" };
    return { key: "risk-off", label: "Risk-Off", thai: "ลดความเสี่ยง" };
  }
  function bandOf(score) {
    if (score >= 80) return { band: "green", color: "#22c55e" };
    if (score >= 60) return { band: "lightgreen", color: "#84cc16" };
    if (score >= 40) return { band: "yellow", color: "#eab308" };
    if (score >= 20) return { band: "orange", color: "#f97316" };
    return { band: "red", color: "#ef4444" };
  }
  function suggestedAllocation(score) {
    const on = { cash: 10, usTech: 40, bitcoin: 20, gold: 10, defensive: 20 };
    const off = { cash: 35, usTech: 15, bitcoin: 5, gold: 20, defensive: 25 };
    const t = clamp(score / 100, 0, 1);
    const keys = ["cash", "usTech", "bitcoin", "gold", "defensive"];
    const labels = { cash: "Cash", usTech: "US Tech", bitcoin: "Bitcoin", gold: "Gold", defensive: "Defensive" };
    const raw = keys.map((k) => ({ key: k, label: labels[k], pct: off[k] + (on[k] - off[k]) * t }));
    let total = raw.reduce((s, x) => s + x.pct, 0);
    raw.forEach((x) => { x.pct = Math.round(x.pct / total * 100); });
    const diff = 100 - raw.reduce((s, x) => s + x.pct, 0);
    if (diff) raw.sort((a, b) => b.pct - a.pct)[0].pct += diff; // fix rounding to sum 100
    return raw;
  }
  function actionFor(score) {
    if (score >= 70) return { key: "increase", label: "Increase Risk", thai: "เพิ่มความเสี่ยง", tone: "bull" };
    if (score >= 55) return { key: "lean-add", label: "Hold / Lean Add", thai: "ถือ + ทยอยเพิ่ม", tone: "watch-bull" };
    if (score >= 45) return { key: "hold", label: "Hold", thai: "ถือ คงน้ำหนัก", tone: "neutral" };
    if (score >= 30) return { key: "reduce", label: "Reduce Risk", thai: "ลดความเสี่ยง", tone: "warn" };
    return { key: "wait", label: "Reduce / Wait", thai: "ลดความเสี่ยง / รอ", tone: "bear" };
  }

  function compute(snapshot) {
    const snap = snapshot || read();
    const components = []; let wSum = 0, wScore = 0; const reasons = [], warnings = [];
    COMPONENTS.forEach((def) => {
      const r = def.score(snap) || { available: false };
      const comp = Object.assign({ key: def.key, label: def.label, short: def.short, weight: def.weight }, r, { available: !!r.available, sub: r.available ? Math.round(r.sub) : null });
      if (r.available) {
        comp.contribution = Math.round(def.weight * (r.sub / 100) * 10) / 10;
        wSum += def.weight; wScore += def.weight * (r.sub / 100);
        (r.reasons || []).forEach((x) => { if (r.sub >= 55) reasons.push(x); else if (r.sub < 45) warnings.push(x); });
      } else {
        comp.contribution = null;
        comp.note = r.note || "ยังไม่เชื่อมข้อมูล (plug-in ได้)";
      }
      components.push(comp);
    });
    const score = wSum > 0 ? Math.round((wScore / wSum) * 100) : 0;
    const coverage = Math.round(wSum);
    const regime = regimeOf(score);
    const bandInfo = bandOf(score);
    const subs = components.filter((c) => c.available).map((c) => c.sub);
    const agree = subs.length ? clamp(1 - stdev(subs) / 45, 0, 1) : 0;
    const confScore = (coverage / 100) * 0.6 + agree * 0.4;
    const confidence = confScore >= 0.62 ? { key: "high", label: "High", thai: "สูง" } : confScore >= 0.4 ? { key: "medium", label: "Medium", thai: "ปานกลาง" } : { key: "low", label: "Low", thai: "ต่ำ" };
    return {
      score, regime, band: bandInfo.band, color: bandInfo.color, confidence, coverage,
      components, reasons: dedupe(reasons).slice(0, 6), warnings: dedupe(warnings).slice(0, 6),
      suggestedAllocation: suggestedAllocation(score), action: actionFor(score),
      gold: scoreGold(snap), updatedAt: (snap && snap.loadedAt) || null, snapshotMissing: !snap
    };
  }

  // Reconstructed regime timeline from historical closes (trend-based components,
  // indexed "k trading days ago" per series so they align near today).
  function history(snapshot, months) {
    const snap = snapshot || read();
    const btc = closesOf(snap, SYM.btc), nas = closesOf(snap, SYM.nasdaq), dxy = closesOf(snap, SYM.dxy), yl = closesOf(snap, SYM.yield10);
    const base = nas || btc || dxy; if (!base) return [];
    const days = Math.round((months || 24) * 21);
    const out = [];
    const at = (series, k) => (series && series.closes.length > k + 1) ? series.closes.slice(0, series.closes.length - k) : null;
    for (let k = Math.min(days, base.closes.length - 210); k >= 0; k -= 5) {
      const parts = [];
      const b = at(btc, k); if (b && b.length >= 200) { const ma = sma(b, 200); if (ma != null) parts.push({ w: 10, sub: b[b.length - 1] > ma ? 80 : 25 }); }
      const nz = at(nas, k); if (nz && nz.length >= 63) { const hi = Math.max.apply(null, nz.slice(-63)); const m50 = sma(nz, 50); parts.push({ w: 10, sub: nz[nz.length - 1] >= hi * 0.995 ? 78 : (m50 && nz[nz.length - 1] > m50 ? 58 : 34) }); }
      const dz = at(dxy, k); if (dz && dz.length >= 64) { const t3 = pctOverDays(dz, 63); if (t3 != null) parts.push({ w: 15, sub: clamp(50 - t3 * 6, 0, 100) }); }
      const yz = at(yl, k); if (yz && yz.length >= 64) { const t3 = pctOverDays(yz, 63); if (t3 != null) parts.push({ w: 15, sub: clamp(50 - t3 * 4, 0, 100) }); }
      if (!parts.length) continue;
      let ws = 0, wsc = 0; parts.forEach((p) => { ws += p.w; wsc += p.w * p.sub / 100; });
      const sc = Math.round(wsc / ws * 100);
      const idx = base.dates.length - 1 - k;
      out.push({ date: base.dates[idx] || null, score: sc, regime: regimeOf(sc).key });
    }
    return out;
  }

  const api = { compute, history, suggestedAllocation, regimeOf, actionFor, SYM, COMPONENTS };
  if (typeof window !== "undefined") window.MarketRegime = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
