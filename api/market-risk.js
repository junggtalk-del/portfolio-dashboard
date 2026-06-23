"use strict";

const { getHistoricalBars } = require("../lib/backtest/marketDataProvider");

const SYMBOLS = {
  spx: "^GSPC",
  xlk: "XLK",
  vix: "^VIX",
  vvix: "^VVIX",
  vixeq: "^VIXEQ"
};

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(payload));
}

function round(value, digits = 2) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return null;
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}

function pctReturn(rows, periods) {
  if (!Array.isArray(rows) || rows.length <= periods) return null;
  const current = Number(rows[rows.length - 1]?.close);
  const previous = Number(rows[rows.length - 1 - periods]?.close);
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return (current / previous - 1) * 100;
}

function latestClose(rows) {
  const row = Array.isArray(rows) ? rows[rows.length - 1] : null;
  const close = Number(row?.close);
  return Number.isFinite(close) ? { close, date: row.date } : { close: null, date: null };
}

function addFlag(flags, id, label, thai, severity, detail) {
  flags.push({ id, label, thai, severity, detail });
}

function vixRegime(vix) {
  if (!Number.isFinite(vix)) return { label: "Unknown", thai: "ไม่มีข้อมูล", severity: "unknown" };
  if (vix > 30) return { label: "Market stress", thai: "ตลาดตึงเครียด", severity: "danger" };
  if (vix > 20) return { label: "Risk-off rising", thai: "ความเสี่ยงเริ่มสูงขึ้น", severity: "warning" };
  if (vix >= 15) return { label: "Normal volatility", thai: "ความผันผวนปกติ", severity: "normal" };
  return { label: "Low volatility / complacent", thai: "ความผันผวนต่ำ / ตลาดนิ่ง", severity: "calm" };
}

function scoreRisk(metrics, flags) {
  let score = 0;
  const spread = metrics.techLeadershipSpread;
  if (Number.isFinite(spread)) {
    if (spread > 20) score += 35;
    else if (spread > 15) score += 25;
    else if (spread > 10) score += 15;
  }
  if (Number.isFinite(metrics.vix) && Number.isFinite(metrics.vvix) && metrics.vix < 15 && metrics.vvix > 90) score += 20;
  if (Number.isFinite(metrics.vvix) && metrics.vvix > 100) score += 25;
  if (Number.isFinite(metrics.vvixFiveDayChangePct) && metrics.vvixFiveDayChangePct > 10) score += 15;
  if (Number.isFinite(metrics.vixeq) && Number.isFinite(metrics.vix) && metrics.vixeq > metrics.vix) score += 15;
  if (Number.isFinite(metrics.vixeqSpreadTrend) && metrics.vixeqSpreadTrend > 0) score += 15;
  if (Number.isFinite(metrics.vix)) {
    if (metrics.vix > 30) score += 35;
    else if (metrics.vix > 20) score += 20;
  }

  const capped = Math.min(100, Math.max(0, score));
  let level = { label: "Normal", thai: "ปกติ", tone: "normal" };
  if (capped >= 75) level = { label: "Hedge / Reduce Risk", thai: "ควร hedge หรือลดความเสี่ยง", tone: "danger" };
  else if (capped >= 50) level = { label: "Caution", thai: "ระวัง", tone: "caution" };
  else if (capped >= 25) level = { label: "Watch", thai: "เฝ้าระวัง", tone: "watch" };
  return { score: capped, level, activeFlags: flags.length };
}

async function fetchSeries(key, symbol, startDate, endDate) {
  try {
    const data = await getHistoricalBars(symbol, startDate, endDate, { includeError: true });
    return { key, symbol, ok: true, ...data };
  } catch (error) {
    return {
      key,
      symbol,
      ok: false,
      error: key === "vixeq" ? "VIXEQ data source not available" : String(error.message || error),
      bars: []
    };
  }
}

function calculateRisk(series) {
  const spxRows = series.spx?.bars || [];
  const xlkRows = series.xlk?.bars || [];
  const vixRows = series.vix?.bars || [];
  const vvixRows = series.vvix?.bars || [];
  const vixeqRows = series.vixeq?.bars || [];
  const spx = latestClose(spxRows);
  const xlk = latestClose(xlkRows);
  const vix = latestClose(vixRows);
  const vvix = latestClose(vvixRows);
  const vixeq = latestClose(vixeqRows);
  const spxOneMonthReturn = pctReturn(spxRows, 21);
  const xlkOneMonthReturn = pctReturn(xlkRows, 21);
  const techLeadershipSpread =
    Number.isFinite(spxOneMonthReturn) && Number.isFinite(xlkOneMonthReturn)
      ? xlkOneMonthReturn - spxOneMonthReturn
      : null;
  const vvixFiveDayChangePct = pctReturn(vvixRows, 5);
  const vixeqSpread =
    Number.isFinite(vixeq.close) && Number.isFinite(vix.close) ? vixeq.close - vix.close : null;
  const previousVix = vixRows.length > 5 ? Number(vixRows[vixRows.length - 6]?.close) : null;
  const previousVixeq = vixeqRows.length > 5 ? Number(vixeqRows[vixeqRows.length - 6]?.close) : null;
  const previousSpread =
    Number.isFinite(previousVixeq) && Number.isFinite(previousVix) ? previousVixeq - previousVix : null;
  const vixeqSpreadTrend =
    Number.isFinite(vixeqSpread) && Number.isFinite(previousSpread) ? vixeqSpread - previousSpread : null;

  const metrics = {
    spxClose: round(spx.close),
    spxDate: spx.date,
    xlkClose: round(xlk.close),
    xlkDate: xlk.date,
    spxOneMonthReturn: round(spxOneMonthReturn),
    xlkOneMonthReturn: round(xlkOneMonthReturn),
    techLeadershipSpread: round(techLeadershipSpread),
    vix: round(vix.close),
    vixDate: vix.date,
    vvix: round(vvix.close),
    vvixDate: vvix.date,
    vvixFiveDayChangePct: round(vvixFiveDayChangePct),
    vixeq: round(vixeq.close),
    vixeqDate: vixeq.date,
    vixeqSpread: round(vixeqSpread),
    vixeqSpreadTrend: round(vixeqSpreadTrend)
  };

  const flags = [];
  const spread = metrics.techLeadershipSpread;
  if (Number.isFinite(spread)) {
    if (spread > 20) addFlag(flags, "extreme-tech", "Extreme tech concentration", "ตลาดพึ่งหุ้นเทครุนแรงมาก", "danger", `XLK - SPX = ${round(spread)}%`);
    else if (spread > 15) addFlag(flags, "high-tech", "High concentration risk", "ตลาดพึ่งหุ้นเทคสูง", "warning", `XLK - SPX = ${round(spread)}%`);
    else if (spread > 10) addFlag(flags, "tech-led", "Tech-led rally", "หุ้นเทคแบกตลาด", "watch", `XLK - SPX = ${round(spread)}%`);
  }

  const regime = vixRegime(metrics.vix);
  if (metrics.vix > 30) addFlag(flags, "market-stress", regime.label, regime.thai, "danger", `VIX = ${metrics.vix}`);
  else if (metrics.vix > 20) addFlag(flags, "risk-off", regime.label, regime.thai, "warning", `VIX = ${metrics.vix}`);

  if (metrics.vvix > 100) addFlag(flags, "vvix-high", "High volatility hedge demand", "ความต้องการ hedge สูง", "danger", `VVIX = ${metrics.vvix}`);
  else if (metrics.vvix > 90) addFlag(flags, "vvix-rising", "Volatility hedge demand rising", "เริ่มมีการซื้อประกันความเสี่ยง", "warning", `VVIX = ${metrics.vvix}`);
  if (metrics.vvixFiveDayChangePct > 10) addFlag(flags, "vvix-fast", "VVIX rising fast", "VVIX เร่งขึ้นเร็ว", "warning", `5D = ${metrics.vvixFiveDayChangePct}%`);
  if (Number.isFinite(metrics.vix) && Number.isFinite(metrics.vvix) && metrics.vix < 18 && metrics.vvix > 90) addFlag(flags, "hidden-hedge", "Calm VIX, rising hedge demand", "VIX ยังนิ่ง แต่เริ่มมีการ hedge", "warning", `VIX ${metrics.vix}, VVIX ${metrics.vvix}`);
  if (Number.isFinite(metrics.vixeq) && Number.isFinite(metrics.vix) && metrics.vixeq > metrics.vix) addFlag(flags, "single-stock-vol", "Single-stock volatility above index volatility", "ความผันผวนรายตัวสูงกว่าตลาดรวม", "watch", `VIXEQ - VIX = ${metrics.vixeqSpread}`);
  if (Number.isFinite(metrics.vixeqSpreadTrend) && metrics.vixeqSpreadTrend > 0) addFlag(flags, "vixeq-widening", "VIXEQ spread widening", "spread VIXEQ-VIX กว้างขึ้น", "watch", `5D trend = ${metrics.vixeqSpreadTrend}`);
  if (!series.vixeq?.ok) addFlag(flags, "vixeq-missing", "VIXEQ data source not available", "ยังไม่มีแหล่งข้อมูล VIXEQ", "muted", series.vixeq?.error || "");

  return {
    metrics,
    vixRegime: regime,
    flags,
    risk: scoreRisk(metrics, flags)
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    send(res, 405, { error: "Method not allowed." });
    return;
  }
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 120 * 86_400_000).toISOString().slice(0, 10);
  const entries = await Promise.all(
    Object.entries(SYMBOLS).map(([key, symbol]) => fetchSeries(key, symbol, startDate, endDate))
  );
  const series = Object.fromEntries(entries.map((entry) => [entry.key, entry]));
  const analysis = calculateRisk(series);
  send(res, 200, {
    generatedAt: new Date().toISOString(),
    symbols: SYMBOLS,
    series: Object.fromEntries(
      Object.entries(series).map(([key, item]) => [
        key,
        {
          symbol: item.symbol,
          providerSymbol: item.providerSymbol || item.symbol,
          ok: item.ok,
          source: item.source || null,
          sourceType: item.sourceType || null,
          bars: item.bars?.length || 0,
          error: item.error || null
        }
      ])
    ),
    ...analysis
  });
};

module.exports.__internals = {
  calculateRisk,
  pctReturn,
  vixRegime,
  scoreRisk
};
