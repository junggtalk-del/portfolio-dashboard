const SCHEMA = process.env.SUPABASE_SCHEMA || "portfolio_dashboard";
const THAI_NAV_CACHE_STATE_ID = "thai_nav_cache_v1";
const MARKET_DATA_CACHE_STATE_ID = "market_data_cache_v1";
const THAI_FUND_SYMBOL_ALIASES = {
  "K-GTECHRMF": "K-GTECHRMF",
  KGTECHRMF: "K-GTECHRMF",
  "K-USXNDQRMF": "K-USXNDQRMF",
  KUSXNDQRMF: "K-USXNDQRMF"
};
const THAI_FUND_PROVIDER_CONFIG = {
  "K-GTECHRMF": {
    name: "K Global Technology RMF",
    url: "https://www.kasikornasset.com/kasset/en/mutual-fund/fund-template/Pages/K-GTECHRMF.aspx"
  },
  "K-USXNDQRMF": {
    name: "K US Equity NDQ 100 Index RMF",
    url: "https://www.kasikornasset.com/kasset/en/mutual-fund/fund-template/Pages/K-USXNDQRMF.aspx"
  }
};
const THAI_FUND_FALLBACK_NAV = {
  "K-GTECHRMF": { nav: 22.8378, navDate: "2026-05-20" },
  "K-USXNDQRMF": { nav: 14.3474, navDate: "2026-05-21" }
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

function normalizeThaiFundSymbol(raw) {
  const upper = String(raw || "").trim().toUpperCase();
  const compact = upper.replace(/[^A-Z0-9]/g, "");
  return THAI_FUND_SYMBOL_ALIASES[upper] || THAI_FUND_SYMBOL_ALIASES[compact] || "";
}

function formatIsoDate(date) {
  return `${date.getUTCFullYear().toString().padStart(4, "0")}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function latestBusinessDayIso(baseDate = new Date()) {
  const day = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate()));
  while (day.getUTCDay() === 0 || day.getUTCDay() === 6) {
    day.setUTCDate(day.getUTCDate() - 1);
  }
  return formatIsoDate(day);
}

function previousBusinessDayIso(baseDate = new Date()) {
  const day = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate()));
  day.setUTCDate(day.getUTCDate() - 1);
  while (day.getUTCDay() === 0 || day.getUTCDay() === 6) {
    day.setUTCDate(day.getUTCDate() - 1);
  }
  return formatIsoDate(day);
}

function parseKAssetDate(rawDate) {
  const text = String(rawDate || "").trim();
  if (!text) return null;
  const parsed = new Date(`${text} UTC`);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);

  const months = {
    jan: 1, january: 1,
    feb: 2, february: 2,
    mar: 3, march: 3,
    apr: 4, april: 4,
    may: 5,
    jun: 6, june: 6,
    jul: 7, july: 7,
    aug: 8, august: 8,
    sep: 9, sept: 9, september: 9,
    oct: 10, october: 10,
    nov: 11, november: 11,
    dec: 12, december: 12
  };
  const match = text.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = months[match[2].toLowerCase()];
  const year = Number(match[3]);
  if (!day || !month || !year) return null;
  return `${year.toString().padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseKAssetNavFromHtml(html, symbol, url) {
  const navDateMatch = html.match(/Data as of\s+([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i);
  const navValueMatch = html.match(/NAV\s*[\r\n\s]*per unit\s*[\r\n\s]*([0-9][0-9,]*\.[0-9]+)/i);
  if (!navDateMatch || !navValueMatch) throw new Error(`Unable to parse NAV page for ${symbol}`);
  const navDate = parseKAssetDate(navDateMatch[1]);
  const nav = Number(String(navValueMatch[1]).replace(/,/g, ""));
  if (!Number.isFinite(nav) || !navDate) throw new Error(`Invalid NAV payload for ${symbol}`);
  return { symbol, nav, navDate, source: `KAsset ${url}` };
}

function shouldSkipThaiNavRefetch(cached) {
  if (!cached?.fetchedAt || !cached?.navDate) return false;
  const now = new Date();
  const fetchedAt = new Date(cached.fetchedAt);
  if (Number.isNaN(fetchedAt.getTime())) return false;
  if (formatIsoDate(fetchedAt) !== formatIsoDate(now)) return false;
  const latestBiz = latestBusinessDayIso(now);
  const prevBiz = previousBusinessDayIso(now);
  return cached.navDate === formatIsoDate(now) || cached.navDate === latestBiz || cached.navDate === prevBiz;
}

async function readThaiNavCacheFromSupabase() {
  if (!hasSupabaseCoreConfig()) return {};
  const url = `${getSupabaseUrl()}/rest/v1/app_state?id=eq.${THAI_NAV_CACHE_STATE_ID}&select=data`;
  const response = await fetch(url, { headers: supabaseHeaders() });
  if (!response.ok) return {};
  const rows = await response.json();
  const data = rows[0]?.data;
  return data && typeof data === "object" ? data : {};
}

async function writeThaiNavCacheToSupabase(cache) {
  if (!hasSupabaseCoreConfig()) return;
  const url = `${getSupabaseUrl()}/rest/v1/app_state`;
  await fetch(url, {
    method: "POST",
    headers: supabaseHeaders({ prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify([{ id: THAI_NAV_CACHE_STATE_ID, data: cache, updated_at: new Date().toISOString() }])
  });
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

async function fetchThaiFundNavLive(symbol) {
  const config = THAI_FUND_PROVIDER_CONFIG[symbol];
  if (!config) throw new Error(`Unsupported Thai fund symbol: ${symbol}`);
  const response = await fetch(config.url, {
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "portfolio-dashboard/1.0"
    }
  });
  if (!response.ok) throw new Error(`KAsset request failed (${response.status})`);
  const html = await response.text();
  const parsed = parseKAssetNavFromHtml(html, symbol, config.url);
  return {
    ...parsed,
    fundName: config.name,
    provider: "KAsset",
    status: "LIVE_NAV",
    fetchedAt: new Date().toISOString()
  };
}

function shapeThaiNavAsHistory(snapshot) {
  return {
    symbol: snapshot.symbol,
    fundName: snapshot.fundName || THAI_FUND_PROVIDER_CONFIG[snapshot.symbol]?.name || snapshot.symbol,
    assetType: "Thai Mutual Fund",
    source: snapshot.source || "KAsset",
    provider: snapshot.provider || "KAsset",
    navStatus: snapshot.status || "LIVE_NAV",
    sourceType: snapshot.status === "CACHED_NAV" ? "SERVER_CACHED_DATA" : snapshot.status === "FALLBACK_NAV" ? "FALLBACK_DATA" : "LIVE_MARKET_DATA",
    lastUpdated: snapshot.fetchedAt || null,
    dates: snapshot.navDate ? [snapshot.navDate] : [],
    closes: Number.isFinite(snapshot.nav) ? [Number(snapshot.nav)] : []
  };
}

async function fetchThaiFundNavSnapshot(rawSymbol, options = {}) {
  const forceRefresh = Boolean(options.forceRefresh);
  const symbol = normalizeThaiFundSymbol(rawSymbol);
  if (!symbol) return null;

  const cache = await readThaiNavCacheFromSupabase();
  const cached = cache[symbol];
  if (!forceRefresh && cached && shouldSkipThaiNavRefetch(cached)) {
    return shapeThaiNavAsHistory(cached);
  }

  try {
    const live = await fetchThaiFundNavLive(symbol);
    const nextCache = { ...cache, [symbol]: live };
    await writeThaiNavCacheToSupabase(nextCache);
    return shapeThaiNavAsHistory(live);
  } catch (_error) {
    if (cached && Number.isFinite(cached.nav) && cached.navDate) {
      return shapeThaiNavAsHistory({
        ...cached,
        status: "CACHED_NAV",
        source: `${cached.source || "KAsset"} (cached)`
      });
    }
    const fallback = THAI_FUND_FALLBACK_NAV[symbol];
    if (fallback) {
      return shapeThaiNavAsHistory({
        symbol,
        fundName: THAI_FUND_PROVIDER_CONFIG[symbol]?.name || symbol,
        nav: fallback.nav,
        navDate: fallback.navDate,
        provider: "KAsset",
        source: "KAsset (fallback)",
        status: "FALLBACK_NAV",
        fetchedAt: new Date().toISOString()
      });
    }
    throw new Error(`Unable to load Thai NAV for ${symbol}`);
  }
}

async function fetchDailyHistory(symbol) {
  const endpoint = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
  endpoint.searchParams.set("interval", "1d");
  endpoint.searchParams.set("range", "2y");
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

  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return rows;
}

function shapeMarketRows(symbol, rows, sourceType, sourceText, fetchedAt) {
  return {
    symbol,
    assetType: "Market",
    source: sourceText,
    provider: "Yahoo",
    navStatus: "LIVE_MARKET",
    sourceType,
    lastUpdated: fetchedAt || null,
    dates: rows.map((row) => row.date),
    closes: rows.map((row) => row.close)
  };
}

async function fetchMarketHistoryWithServerCache(symbol) {
  const cache = await readMarketDataCacheFromSupabase();
  try {
    const liveRows = await fetchDailyHistory(symbol);
    const now = new Date().toISOString();
    const payload = {
      symbol,
      rows: liveRows,
      fetchedAt: now
    };
    const nextCache = { ...cache, [symbol]: payload };
    await writeMarketDataCacheToSupabase(nextCache);
    return shapeMarketRows(symbol, liveRows, "LIVE_MARKET_DATA", "Yahoo Finance", now);
  } catch (error) {
    const cached = cache[symbol];
    if (cached?.rows && Array.isArray(cached.rows) && cached.rows.length) {
      return shapeMarketRows(symbol, cached.rows, "SERVER_CACHED_DATA", "Server cached data", cached.fetchedAt || null);
    }
    throw error;
  }
}

module.exports = async function handler(req, res) {
  const symbol = String(req.query?.symbol || "").trim().toUpperCase();
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
  } catch (_error) {
    send(res, 502, { error: "Unable to fetch daily price history." });
  }
};

module.exports.__internals = {
  hasSupabaseCoreConfig,
  fetchDailyHistory,
  readMarketDataCacheFromSupabase,
  fetchMarketHistoryWithServerCache
};
