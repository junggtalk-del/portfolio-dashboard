"use strict";

const fs = require("fs");
const path = require("path");

const LOCAL_DATA_DIR = process.env.VERCEL
  ? path.join("/tmp", "portfolio-dashboard")
  : path.join(__dirname, "..", "..", ".local-data");
const CACHE_FILE = path.join(LOCAL_DATA_DIR, "backtest-market-data-cache.json");

const SYMBOL_ALIASES = {
  BTC: "BTC-USD",
  BTCUSD: "BTC-USD",
  "BTC-USD": "BTC-USD",
  SPY: "SPY",
  QQQ: "QQQ",
  QQQM: "QQQM",
  AAPL: "AAPL",
  MSFT: "MSFT",
  NVDA: "NVDA",
  GOOGL: "GOOGL",
  GOOG: "GOOG",
  META: "META",
  AMZN: "AMZN",
  TSLA: "TSLA",
  AVGO: "AVGO",
  AMD: "AMD"
};

const DISPLAY_SYMBOLS = {
  "BTC-USD": "BTCUSD"
};

function normalizeBacktestSymbol(rawSymbol) {
  const normalized = String(rawSymbol || "").trim().toUpperCase().replace(/[^A-Z0-9.^-]/g, "");
  return SYMBOL_ALIASES[normalized] || normalized;
}

function displaySymbolForProvider(providerSymbol) {
  return DISPLAY_SYMBOLS[providerSymbol] || providerSymbol;
}

function readCache() {
  try {
    if (!fs.existsSync(CACHE_FILE)) return {};
    const raw = fs.readFileSync(CACHE_FILE, "utf8");
    if (!raw.trim()) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function writeCache(cache) {
  fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");
}

function unixFromDate(date, fallback) {
  if (!date) return fallback;
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return Math.floor(parsed.getTime() / 1000);
}

function toIsoDate(unixSeconds) {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

function normalizeBars(rows) {
  const map = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const date = String(row?.date || "");
    const open = Number(row?.open);
    const high = Number(row?.high);
    const low = Number(row?.low);
    const close = Number(row?.close);
    const volume = Number(row?.volume || 0);
    if (!date || ![open, high, low, close].every(Number.isFinite)) continue;
    map.set(date, { date, open, high, low, close, volume: Number.isFinite(volume) ? volume : 0 });
  }
  return [...map.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function mergeBars(existingRows, incomingRows) {
  return normalizeBars([...(existingRows || []), ...(incomingRows || [])]);
}

async function fetchYahooBars(symbol, startDate, endDate) {
  const providerSymbol = normalizeBacktestSymbol(symbol);
  const period1 = unixFromDate(startDate, 946684800);
  const period2 = unixFromDate(endDate, Math.floor(Date.now() / 1000) + 86_400);
  const endpoint = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(providerSymbol)}`);
  endpoint.searchParams.set("period1", String(period1));
  endpoint.searchParams.set("period2", String(period2));
  endpoint.searchParams.set("interval", "1d");
  endpoint.searchParams.set("events", "history");
  endpoint.searchParams.set("includeAdjustedClose", "true");

  const response = await fetch(endpoint, {
    headers: {
      accept: "application/json",
      "user-agent": "portfolio-dashboard-backtest/1.0"
    }
  });
  if (!response.ok) throw new Error(`Yahoo request failed for ${providerSymbol} (${response.status})`);

  const payload = await response.json();
  const result = payload.chart?.result?.[0];
  const timestamps = Array.isArray(result?.timestamp) ? result.timestamp : [];
  const quote = result?.indicators?.quote?.[0] || {};
  const meta = result?.meta || {};
  const rows = [];

  for (let index = 0; index < timestamps.length; index += 1) {
    const open = quote.open?.[index];
    const high = quote.high?.[index];
    const low = quote.low?.[index];
    const close = quote.close?.[index];
    if (![open, high, low, close, timestamps[index]].every(Number.isFinite)) continue;
    rows.push({
      date: toIsoDate(timestamps[index]),
      open: Number(open),
      high: Number(high),
      low: Number(low),
      close: Number(close),
      volume: Number.isFinite(quote.volume?.[index]) ? Number(quote.volume[index]) : 0
    });
  }

  return {
    symbol: displaySymbolForProvider(providerSymbol),
    providerSymbol,
    name: meta.longName || meta.shortName || displaySymbolForProvider(providerSymbol),
    currency: meta.currency || (providerSymbol === "BTC-USD" ? "USD" : "USD"),
    exchangeName: meta.exchangeName || meta.fullExchangeName || "",
    source: "Yahoo Finance",
    fetchedAt: new Date().toISOString(),
    bars: normalizeBars(rows)
  };
}

async function getHistoricalBars(symbol, startDate, endDate, options = {}) {
  const providerSymbol = normalizeBacktestSymbol(symbol);
  const cacheKey = providerSymbol;
  const cache = readCache();
  const cachedRows = cache[cacheKey]?.bars || [];

  try {
    const live = await fetchYahooBars(providerSymbol, startDate, endDate);
    const merged = mergeBars(cachedRows, live.bars);
    cache[cacheKey] = { ...live, bars: merged };
    writeCache(cache);
    return {
      ...live,
      sourceType: "LIVE_MARKET_DATA",
      bars: normalizeBars(merged).filter((bar) => (!startDate || bar.date >= startDate) && (!endDate || bar.date <= endDate))
    };
  } catch (error) {
    if (cachedRows.length) {
      return {
        ...(cache[cacheKey] || {}),
        symbol: displaySymbolForProvider(providerSymbol),
        providerSymbol,
        source: "Local server cache",
        sourceType: "SERVER_CACHED_DATA",
        error: options.includeError ? String(error.message || error) : undefined,
        bars: normalizeBars(cachedRows).filter((bar) => (!startDate || bar.date >= startDate) && (!endDate || bar.date <= endDate))
      };
    }
    throw error;
  }
}

module.exports = {
  getHistoricalBars,
  normalizeBacktestSymbol,
  displaySymbolForProvider,
  __internals: {
    fetchYahooBars,
    normalizeBars,
    mergeBars,
    readCache
  }
};
