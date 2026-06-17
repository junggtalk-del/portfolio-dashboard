"use strict";

const { getHistoricalBars, normalizeBacktestSymbol, displaySymbolForProvider } = require("../lib/backtest/marketDataProvider");
const { runBacktestForPeriods } = require("../lib/backtest/engine");
const { STRATEGIES } = require("../lib/backtest/strategies");
const { rankResults } = require("../lib/backtest/ranking");

const DEFAULT_SYMBOLS = ["SPY", "QQQ", "AAPL", "MSFT", "NVDA", "GOOGL", "META", "AMZN", "TSLA", "AVGO", "AMD"];
const DEFAULT_PERIODS = [
  { key: "in_sample", label: "In-sample", startDate: "2015-01-01", endDate: "2020-12-31" },
  { key: "out_of_sample", label: "Out-of-sample", startDate: "2021-01-01", endDate: "2023-12-31" },
  { key: "recent", label: "Recent test", startDate: "2024-01-01", endDate: "" }
];

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(payload));
}

function getBody(req) {
  if (req.body && typeof req.body === "object") return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("Request body is too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (_error) {
        reject(new Error("Invalid JSON body."));
      }
    });
    req.on("error", reject);
  });
}

function sanitizeSymbols(symbols) {
  const seen = new Set();
  const result = [];
  for (const raw of Array.isArray(symbols) && symbols.length ? symbols : DEFAULT_SYMBOLS) {
    const providerSymbol = normalizeBacktestSymbol(raw);
    if (!providerSymbol || seen.has(providerSymbol)) continue;
    seen.add(providerSymbol);
    result.push(displaySymbolForProvider(providerSymbol));
  }
  return result;
}

function sanitizeStrategies(strategies) {
  const valid = new Set(STRATEGIES.map((strategy) => strategy.id));
  const requested = Array.isArray(strategies) && strategies.length ? strategies : STRATEGIES.map((strategy) => strategy.id);
  return requested.filter((strategyId) => valid.has(strategyId));
}

function sanitizePeriods(periods, latestDate) {
  const source = Array.isArray(periods) && periods.length ? periods : DEFAULT_PERIODS;
  return source.map((period) => ({
    key: String(period.key || "").trim() || "period",
    label: String(period.label || period.key || "Period"),
    startDate: String(period.startDate || ""),
    endDate: String(period.endDate || latestDate || "")
  }));
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    send(res, 405, { error: "Method not allowed." });
    return;
  }

  try {
    const body = await getBody(req);
    const symbols = sanitizeSymbols(body.symbols);
    const strategyIds = sanitizeStrategies(body.strategies);
    const initialCapital = Number(body.initialCapital || 10000);
    const slippagePct = Number(body.slippagePct ?? 0.1);
    const commission = Number(body.commission ?? 0);
    const startDate = String(body.startDate || "2015-01-01");
    const endDate = String(body.endDate || new Date().toISOString().slice(0, 10));
    const results = [];
    const errors = [];

    for (const symbol of symbols) {
      try {
        const marketData = await getHistoricalBars(symbol, startDate, endDate, { includeError: true });
        const periods = sanitizePeriods(body.periods, marketData.bars?.[marketData.bars.length - 1]?.date || endDate);
        for (const strategyId of strategyIds) {
          const result = runBacktestForPeriods({
            symbol: marketData.symbol || symbol,
            strategyId,
            bars: marketData.bars || [],
            initialCapital,
            slippagePct,
            commission,
            periods
          });
          results.push({
            ...result,
            marketData: {
              symbol: marketData.symbol || symbol,
              providerSymbol: marketData.providerSymbol || normalizeBacktestSymbol(symbol),
              name: marketData.name || symbol,
              currency: marketData.currency || "USD",
              source: marketData.source || "Yahoo Finance",
              sourceType: marketData.sourceType || "LIVE_MARKET_DATA",
              fetchedAt: marketData.fetchedAt || null,
              bars: marketData.bars?.length || 0
            }
          });
        }
      } catch (error) {
        errors.push({ symbol, error: String(error.message || error) });
      }
    }

    const ranking = rankResults(results);
    send(res, 200, {
      generatedAt: new Date().toISOString(),
      assumptions: {
        initialCapital,
        slippagePct,
        commission,
        positionSize: "10% of current equity per trade",
        execution: "Signals at close, orders execute on next bar open",
        market: "US stocks and ETFs only"
      },
      strategies: STRATEGIES,
      symbols,
      results,
      ranking,
      errors
    });
  } catch (error) {
    send(res, 500, { error: String(error.message || error) });
  }
};

module.exports.DEFAULT_SYMBOLS = DEFAULT_SYMBOLS;
