const SCHEMA = process.env.SUPABASE_SCHEMA || "portfolio_dashboard";
const MARKET_DATA_CACHE_STATE_ID = "market_data_cache_v1";
const {
  canonicalSymbolFromTicker: canonicalThaiFundSymbol,
  getHistoricalThaiFundNav
} = require("../lib/data-providers/thaiMutualFundHistoricalNavProvider");
const THAI_STOCK_ALIASES = {
  "GULF.BK": "GULF.BK",
  GULFBK: "GULF.BK",
  GULF: "GULF.BK"
};
const THAI_INDEX_ALIASES = {
  SET: "^SET.BK",
  "SET.BK": "^SET.BK",
  "^SET.BK": "^SET.BK",
  SETINDEX: "^SET.BK",
  SET50: "^SET50.BK",
  "SET50.BK": "^SET50.BK",
  "^SET50.BK": "^SET50.BK",
  SET50INDEX: "^SET50.BK",
  SET100: "^SET100.BK",
  "SET100.BK": "^SET100.BK",
  "^SET100.BK": "^SET100.BK",
  SET100INDEX: "^SET100.BK"
};
const US_INDEX_ALIASES = {
  SPX: "^GSPC",
  "^GSPC": "^GSPC",
  GSPC: "^GSPC",
  IXIC: "^IXIC",
  "^IXIC": "^IXIC",
  NDX: "^NDX",
  "^NDX": "^NDX"
};

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "s-maxage=300, stale-while-revalidate=600");
  res.end(JSON.stringify(payload));
}

function getSupabaseUrl() {
  return String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
}

function hasSupabaseCoreConfig() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function supabaseHeaders(extra = {}) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return {
    apikey: serviceKey,
    authorization: `Bearer ${serviceKey}`,
    "content-type": "application/json",
    "accept-profile": SCHEMA,
    "content-profile": SCHEMA,
    ...extra
  };
}

function sanitizeMarketCache(data) {
  if (!data || typeof data !== "object") return {};
  return data;
}

async function readMarketDataCacheFromSupabase() {
  if (!hasSupabaseCoreConfig()) return {};
  const url = `${getSupabaseUrl()}/rest/v1/app_state?id=eq.${MARKET_DATA_CACHE_STATE_ID}&select=data`;
  const response = await fetch(url, { headers: supabaseHeaders() });
  if (!response.ok) return {};
  const rows = await response.json();
  return sanitizeMarketCache(rows[0]?.data);
}

async function writeMarketDataCacheToSupabase(cache) {
  if (!hasSupabaseCoreConfig()) return;
  const url = `${getSupabaseUrl()}/rest/v1/app_state`;
  await fetch(url, {
    method: "POST",
    headers: supabaseHeaders({ prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify([{ id: MARKET_DATA_CACHE_STATE_ID, data: sanitizeMarketCache(cache), updated_at: new Date().toISOString() }])
  });
}

function shapeThaiNavAsHistory(snapshot) {
  const sourceType =
    snapshot.source === "Cache"
      ? "SERVER_CACHED_DATA"
      : snapshot.source === "KAssetLatestOnly"
        ? "LIVE_MARKET_DATA"
      : snapshot.source === "Settrade"
        ? "LIVE_MARKET_DATA"
        : "LIVE_MARKET_DATA";
  const navStatus =
    snapshot.source === "Cache"
      ? "CACHED_NAV_HISTORY"
      : snapshot.source === "KAssetLatestOnly"
        ? "LIVE_NAV"
      : snapshot.source === "Settrade"
        ? "LIVE_NAV_SETTRADE"
        : "LIVE_NAV_KASSET";
  return {
    symbol: snapshot.canonicalSymbol,
    fundName: snapshot.fundName || snapshot.canonicalSymbol,
    assetType: "Thai Mutual Fund",
    source: snapshot.source === "KAssetLatestOnly" ? "KAsset latest NAV only" : `${snapshot.source} historical NAV`,
    provider: snapshot.source || "KAsset",
    navStatus,
    sourceType,
    lastUpdated: snapshot.fetchedAt || null,
    dates: snapshot.navHistory.map((row) => row.date),
    closes: snapshot.navHistory.map((row) => Number(row.nav))
  };
}

function canonicalMarketSymbol(rawSymbol) {
  const normalized = String(rawSymbol || "").trim().toUpperCase().replace(/[^A-Z0-9.^-]/g, "");
  const compact = normalized.replace(/[^A-Z0-9]/g, "");
  return (
    THAI_INDEX_ALIASES[normalized] ||
    THAI_INDEX_ALIASES[compact] ||
    US_INDEX_ALIASES[normalized] ||
    US_INDEX_ALIASES[compact] ||
    THAI_STOCK_ALIASES[normalized] ||
    THAI_STOCK_ALIASES[compact] ||
    normalized
  );
}

async function fetchThaiFundNavSnapshot(rawSymbol, options = {}) {
  const forceRefresh = Boolean(options.forceRefresh);
  const symbol = canonicalThaiFundSymbol(rawSymbol);
  if (!symbol) return null;
  const historyPayload = await getHistoricalThaiFundNav(symbol, { minPoints: 220, forceRefresh });
  return shapeThaiNavAsHistory(historyPayload);
}

function shapeMarketRows(symbol, rows, sourceType, sourceText, fetchedAt, extra = {}) {
  return {
    symbol,
    assetType: "Market",
    source: sourceText,
    provider: "Yahoo",
    navStatus: "LIVE_MARKET",
    sourceType,
    lastUpdated: fetchedAt || null,
    dates: rows.map((row) => row.date),
    closes: rows.map((row) => row.close),
    historicalSourceLimited: Boolean(extra.historicalSourceLimited),
    latestLiveRows: Number.isFinite(extra.latestLiveRows) ? Number(extra.latestLiveRows) : null,
    sourceRange: extra.sourceRange || null
  };
}

function sortAndNormalizeRows(rows) {
  if (!Array.isArray(rows)) return [];
  const map = new Map();
  for (const row of rows) {
    const date = String(row?.date || "");
    const close = Number(row?.close);
    if (!date || !Number.isFinite(close)) continue;
    map.set(date, { date, close });
  }
  return [...map.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function mergeHistoricalRows(existingRows, incomingRows) {
  const merged = new Map();
  for (const row of sortAndNormalizeRows(existingRows)) {
    merged.set(row.date, row);
  }
  for (const row of sortAndNormalizeRows(incomingRows)) {
    merged.set(row.date, row);
  }
  return [...merged.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

async function fetchDailyHistoryByRange(symbol, range) {
  const endpoint = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
  endpoint.searchParams.set("interval", "1d");
  endpoint.searchParams.set("range", range);
  endpoint.searchParams.set("includePrePost", "false");

  const response = await fetch(endpoint, {
    headers: {
      accept: "application/json",
      "user-agent": "portfolio-dashboard/1.0"
    }
  });
  if (!response.ok) throw new Error("price history request failed");

  const payload = await response.json();
  const result = payload.chart?.result?.[0];
  const timestamps = Array.isArray(result?.timestamp) ? result.timestamp : [];
  const closes = result?.indicators?.quote?.[0]?.close || [];
  const rows = [];

  for (let index = 0; index < Math.min(timestamps.length, closes.length); index += 1) {
    const close = closes[index];
    const unix = timestamps[index];
    if (!Number.isFinite(close) || !Number.isFinite(unix)) continue;
    rows.push({
      date: new Date(unix * 1000).toISOString().slice(0, 10),
      close: Number(close)
    });
  }

  return sortAndNormalizeRows(rows);
}

async function fetchDailyHistory(symbol) {
  const ranges = ["2y", "5y", "10y", "max"];
  let bestRows = [];
  let bestRange = ranges[0];
  let lastError = null;

  for (const range of ranges) {
    try {
      const rows = await fetchDailyHistoryByRange(symbol, range);
      if (rows.length > bestRows.length) {
        bestRows = rows;
        bestRange = range;
      }
      if (rows.length >= 220) break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!bestRows.length && lastError) throw lastError;
  return {
    rows: bestRows,
    range: bestRange,
    isSparse: bestRows.length <= 1
  };
}

async function fetchMarketHistoryWithServerCache(symbol) {
  const cache = await readMarketDataCacheFromSupabase();
  try {
    const liveResult = await fetchDailyHistory(symbol);
    const liveRows = liveResult.rows;
    const now = new Date().toISOString();
    const cachedRows = Array.isArray(cache?.[symbol]?.rows) ? cache[symbol].rows : [];
    const mergedRows = mergeHistoricalRows(cachedRows, liveRows);
    const hasMergedHistory = mergedRows.length > liveRows.length;
    const payload = {
      symbol,
      rows: mergedRows,
      latestLiveRows: liveRows.length,
      sourceRange: liveResult.range || "2y",
      historicalSourceLimited: Boolean(liveResult.isSparse && mergedRows.length < 26),
      fetchedAt: now
    };
    const nextCache = { ...cache, [symbol]: payload };
    await writeMarketDataCacheToSupabase(nextCache);
    return shapeMarketRows(
      symbol,
      mergedRows,
      hasMergedHistory ? "SERVER_CACHED_DATA" : "LIVE_MARKET_DATA",
      hasMergedHistory ? "Yahoo latest + server historical cache" : "Yahoo Finance",
      now,
      {
        historicalSourceLimited: Boolean(liveResult.isSparse && mergedRows.length < 26),
        latestLiveRows: liveRows.length,
        sourceRange: liveResult.range || "2y"
      }
    );
  } catch (error) {
    const cached = cache[symbol];
    if (cached?.rows && Array.isArray(cached.rows) && cached.rows.length) {
      return shapeMarketRows(
        symbol,
        cached.rows,
        "SERVER_CACHED_DATA",
        "Server cached data",
        cached.fetchedAt || null,
        {
          historicalSourceLimited: Boolean(cached.historicalSourceLimited),
          latestLiveRows: Number.isFinite(cached.latestLiveRows) ? cached.latestLiveRows : null,
          sourceRange: cached.sourceRange || null
        }
      );
    }
    throw error;
  }
}

module.exports = async function handler(req, res) {
  const symbol = canonicalMarketSymbol(req.query?.symbol || "");
  const forceRefresh = String(req.query?.refresh || "") === "1";
  if (!symbol) {
    send(res, 400, { error: "Please provide symbol." });
    return;
  }

  try {
    const thaiNav = await fetchThaiFundNavSnapshot(symbol, { forceRefresh });
    if (thaiNav) {
      send(res, 200, thaiNav);
      return;
    }
    const marketData = await fetchMarketHistoryWithServerCache(symbol);
    send(res, 200, marketData);
  } catch (error) {
    send(res, 502, {
      error: String(error.message || "Unable to fetch daily price history."),
      code: error.code || ""
    });
  }
};

module.exports.__internals = {
  hasSupabaseCoreConfig,
  fetchDailyHistory,
  fetchDailyHistoryByRange,
  mergeHistoricalRows,
  readMarketDataCacheFromSupabase,
  fetchMarketHistoryWithServerCache
};
