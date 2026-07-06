"use strict";

// Returns daily OHLCV bars for one symbol (for the Asset 360 candlestick chart).
// Reuses the backtest market-data provider (Yahoo OHLCV + timeout/cache).
const { getHistoricalBars } = require("../lib/backtest/marketDataProvider");

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "s-maxage=300, stale-while-revalidate=600");
  res.end(JSON.stringify(payload));
}

module.exports = async function handler(req, res) {
  const symbol = String(
    (req.query && req.query.symbol) || new URL(req.url, "http://local").searchParams.get("symbol") || ""
  ).trim();
  if (!symbol) {
    send(res, 400, { error: "Please provide symbol.", bars: [] });
    return;
  }
  const end = new Date().toISOString().slice(0, 10);
  // Optional explicit start date (YYYY-MM-DD) for long-history consumers (e.g. the
  // Bitcoin Intelligence historical database). Backwards-compatible: when absent, the
  // original days-window behaviour (cap 2600) is used unchanged.
  const qStart = String((req.query && req.query.start) || new URL(req.url, "http://local").searchParams.get("start") || "").trim();
  let start;
  if (/^\d{4}-\d{2}-\d{2}$/.test(qStart) && qStart >= "2010-01-01" && qStart <= end) {
    start = qStart;
  } else {
    const daysRaw = Number((req.query && req.query.days) || 1500);
    const days = Math.min(2600, Math.max(60, Number.isFinite(daysRaw) ? daysRaw : 1500));
    start = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  }

  try {
    const data = await getHistoricalBars(symbol, start, end, { includeError: true });
    send(res, 200, {
      symbol: data.symbol || symbol,
      providerSymbol: data.providerSymbol || symbol,
      source: data.source || null,
      sourceType: data.sourceType || null,
      bars: Array.isArray(data.bars) ? data.bars : []
    });
  } catch (error) {
    send(res, 502, { error: String(error.message || error), bars: [] });
  }
};
