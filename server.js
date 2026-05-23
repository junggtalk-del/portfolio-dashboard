const http = require("http");
const fs = require("fs");
const path = require("path");
const { loadLocalEnv } = require("./local-env");

loadLocalEnv();

const PORT = Number(process.env.PORT || 4173);
const PUBLIC_DIR = path.join(__dirname, "public");
const LOCAL_DATA_DIR = path.join(__dirname, ".local-data");
const LOCAL_PORTFOLIO_FILE = path.join(LOCAL_DATA_DIR, "portfolio.json");
const LOCAL_AI_UNIVERSE_FILE = path.join(LOCAL_DATA_DIR, "ai-universe.json");
const LOCAL_THAI_NAV_CACHE_FILE = path.join(LOCAL_DATA_DIR, "thai-fund-nav-cache.json");
const LOCAL_MARKET_DATA_CACHE_FILE = path.join(LOCAL_DATA_DIR, "market-data-cache.json");
const ENABLE_LOCAL_FALLBACK = String(process.env.ENABLE_LOCAL_FALLBACK || "").toLowerCase() === "true";
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};
const PORTFOLIO_SCHEMA = process.env.SUPABASE_SCHEMA || "portfolio_dashboard";
const PORTFOLIO_STATE_ID = "main";
const AI_UNIVERSE_STATE_ID = "ai_boom_universe_main";
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

function normalizeThaiFundSymbol(raw) {
  const upper = String(raw || "").trim().toUpperCase();
  const compact = upper.replace(/[^A-Z0-9]/g, "");
  return THAI_FUND_SYMBOL_ALIASES[upper] || THAI_FUND_SYMBOL_ALIASES[compact] || "";
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
  if (!navDateMatch || !navValueMatch) {
    throw new Error(`Unable to parse NAV page for ${symbol}`);
  }

  const navDate = parseKAssetDate(navDateMatch[1]);
  const nav = Number(String(navValueMatch[1]).replace(/,/g, ""));
  if (!Number.isFinite(nav)) throw new Error(`Invalid NAV value for ${symbol}`);
  if (!navDate) throw new Error(`Invalid NAV date for ${symbol}`);

  return {
    symbol,
    nav,
    navDate,
    source: `KAsset ${url}`
  };
}

function readThaiFundNavCache() {
  try {
    if (!fs.existsSync(LOCAL_THAI_NAV_CACHE_FILE)) return {};
    const raw = fs.readFileSync(LOCAL_THAI_NAV_CACHE_FILE, "utf8");
    if (!raw.trim()) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function writeThaiFundNavCache(cache) {
  fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
  fs.writeFileSync(LOCAL_THAI_NAV_CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");
}

function readLocalMarketDataCache() {
  try {
    if (!fs.existsSync(LOCAL_MARKET_DATA_CACHE_FILE)) return {};
    const raw = fs.readFileSync(LOCAL_MARKET_DATA_CACHE_FILE, "utf8");
    if (!raw.trim()) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function writeLocalMarketDataCache(cache) {
  fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
  fs.writeFileSync(LOCAL_MARKET_DATA_CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");
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

function shouldSkipThaiNavRefetch(cached) {
  if (!cached?.fetchedAt || !cached?.navDate) return false;
  const now = new Date();
  const fetchedAt = new Date(cached.fetchedAt);
  if (Number.isNaN(fetchedAt.getTime())) return false;

  const fetchedDay = formatIsoDate(fetchedAt);
  const today = formatIsoDate(now);
  if (fetchedDay !== today) return false;

  const latestBiz = latestBusinessDayIso(now);
  const prevBiz = previousBusinessDayIso(now);
  return cached.navDate === today || cached.navDate === latestBiz || cached.navDate === prevBiz;
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
  if (!response.ok) {
    throw new Error(`KAsset request failed (${response.status}) for ${symbol}`);
  }
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

function shapeThaiNavAsHistory(navSnapshot) {
  return {
    symbol: navSnapshot.symbol,
    fundName: navSnapshot.fundName || THAI_FUND_PROVIDER_CONFIG[navSnapshot.symbol]?.name || navSnapshot.symbol,
    assetType: "Thai Mutual Fund",
    source: navSnapshot.source || "KAsset",
    provider: navSnapshot.provider || "KAsset",
    navStatus: navSnapshot.status || "LIVE_NAV",
    sourceType: navSnapshot.status === "CACHED_NAV" ? "SERVER_CACHED_DATA" : navSnapshot.status === "FALLBACK_NAV" ? "FALLBACK_DATA" : "LIVE_MARKET_DATA",
    lastUpdated: navSnapshot.fetchedAt || null,
    dates: navSnapshot.navDate ? [navSnapshot.navDate] : [],
    closes: Number.isFinite(navSnapshot.nav) ? [Number(navSnapshot.nav)] : []
  };
}

async function fetchThaiFundNavSnapshot(rawSymbol, options = {}) {
  const forceRefresh = Boolean(options.forceRefresh);
  const symbol = normalizeThaiFundSymbol(rawSymbol);
  if (!symbol) return null;

  const cache = readThaiFundNavCache();
  const cached = cache[symbol];
  if (!forceRefresh && cached && shouldSkipThaiNavRefetch(cached)) {
    return shapeThaiNavAsHistory(cached);
  }

  try {
    const live = await fetchThaiFundNavLive(symbol);
    cache[symbol] = live;
    writeThaiFundNavCache(cache);
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

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error("Request body is too large."));
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("Invalid JSON body."));
      }
    });
    req.on("error", reject);
  });
}

function portfolioHeaders(extra = {}) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return {
    apikey: serviceKey,
    authorization: `Bearer ${serviceKey}`,
    "content-type": "application/json",
    "accept-profile": PORTFOLIO_SCHEMA,
    "content-profile": PORTFOLIO_SCHEMA,
    ...extra
  };
}

function getSupabaseUrl() {
  return String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
}

function isPortfolioPasswordValid(req) {
  const expected = process.env.APP_PASSWORD;
  const provided = req.headers["x-portfolio-password"];
  return Boolean(expected && provided && provided === expected);
}

function hasSupabaseConfig() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.APP_PASSWORD);
}

function hasSupabaseCoreConfig() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function readLocalPortfolioData() {
  try {
    if (!fs.existsSync(LOCAL_PORTFOLIO_FILE)) return null;
    const raw = fs.readFileSync(LOCAL_PORTFOLIO_FILE, "utf8");
    if (!raw.trim()) return null;
    const parsed = JSON.parse(raw);
    return parsed?.data ?? null;
  } catch (error) {
    return null;
  }
}

function writeLocalPortfolioData(data) {
  fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
  fs.writeFileSync(
    LOCAL_PORTFOLIO_FILE,
    JSON.stringify({ data, updatedAt: new Date().toISOString() }, null, 2),
    "utf8"
  );
}

function sanitizeAiUniverseState(data) {
  const safe = data && typeof data === "object" ? data : {};
  return {
    userAssets: Array.isArray(safe.userAssets) ? safe.userAssets : [],
    removedIds: Array.isArray(safe.removedIds) ? safe.removedIds : []
  };
}

function readLocalAiUniverseState() {
  try {
    if (!fs.existsSync(LOCAL_AI_UNIVERSE_FILE)) return sanitizeAiUniverseState(null);
    const raw = fs.readFileSync(LOCAL_AI_UNIVERSE_FILE, "utf8");
    if (!raw.trim()) return sanitizeAiUniverseState(null);
    const parsed = JSON.parse(raw);
    return sanitizeAiUniverseState(parsed?.data);
  } catch (_error) {
    return sanitizeAiUniverseState(null);
  }
}

function writeLocalAiUniverseState(data) {
  fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
  fs.writeFileSync(
    LOCAL_AI_UNIVERSE_FILE,
    JSON.stringify({ data: sanitizeAiUniverseState(data), updatedAt: new Date().toISOString() }, null, 2),
    "utf8"
  );
}

async function handleAiUniverse(req, res) {
  const useSupabase = hasSupabaseCoreConfig();

  try {
    if (!useSupabase) {
      if (req.method === "GET") {
        sendJson(res, 200, { data: readLocalAiUniverseState(), mode: "local-fallback" });
        return;
      }

      if (req.method === "PUT") {
        const body = await getRequestBody(req);
        writeLocalAiUniverseState(body?.data ?? null);
        sendJson(res, 200, { ok: true, mode: "local-fallback" });
        return;
      }

      sendJson(res, 405, { error: "Method not allowed." });
      return;
    }

    if (req.method === "GET") {
      const endpoint = `${getSupabaseUrl()}/rest/v1/app_state?id=eq.${AI_UNIVERSE_STATE_ID}&select=data`;
      const response = await fetch(endpoint, { headers: portfolioHeaders() });
      if (!response.ok) throw new Error(await response.text());
      const rows = await response.json();
      sendJson(res, 200, { data: sanitizeAiUniverseState(rows[0]?.data), mode: "supabase" });
      return;
    }

    if (req.method === "PUT") {
      const body = await getRequestBody(req);
      const endpoint = `${getSupabaseUrl()}/rest/v1/app_state`;
      const payload = sanitizeAiUniverseState(body?.data);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: portfolioHeaders({ prefer: "resolution=merge-duplicates,return=minimal" }),
        body: JSON.stringify([{ id: AI_UNIVERSE_STATE_ID, data: payload, updated_at: new Date().toISOString() }])
      });
      if (!response.ok) throw new Error(await response.text());
      sendJson(res, 200, { ok: true, mode: "supabase" });
      return;
    }

    sendJson(res, 405, { error: "Method not allowed." });
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
}

async function handlePortfolio(req, res) {
  const useSupabase = hasSupabaseConfig();

  try {
    if (!useSupabase && ENABLE_LOCAL_FALLBACK) {
      if (req.method === "GET") {
        sendJson(res, 200, { data: readLocalPortfolioData(), mode: "local-fallback" });
        return;
      }

      if (req.method === "PUT") {
        const body = await getRequestBody(req);
        writeLocalPortfolioData(body?.data ?? null);
        sendJson(res, 200, { ok: true, mode: "local-fallback" });
        return;
      }

      sendJson(res, 405, { error: "Method not allowed." });
      return;
    }

    if (!useSupabase) {
      sendJson(res, 500, {
        error:
          "Supabase mode is required on local. Please set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and APP_PASSWORD in .env."
      });
      return;
    }

    if (!isPortfolioPasswordValid(req)) {
      sendJson(res, 401, { error: "Password is incorrect." });
      return;
    }

    if (req.method === "GET") {
      const endpoint = `${getSupabaseUrl()}/rest/v1/app_state?id=eq.${PORTFOLIO_STATE_ID}&select=data`;
      const response = await fetch(endpoint, { headers: portfolioHeaders() });
      if (!response.ok) throw new Error(await response.text());
      const rows = await response.json();
      sendJson(res, 200, { data: rows[0]?.data || null });
      return;
    }

    if (req.method === "PUT") {
      const body = await getRequestBody(req);
      const endpoint = `${getSupabaseUrl()}/rest/v1/app_state`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: portfolioHeaders({ prefer: "resolution=merge-duplicates,return=minimal" }),
        body: JSON.stringify([{ id: PORTFOLIO_STATE_ID, data: body?.data, updated_at: new Date().toISOString() }])
      });
      if (!response.ok) throw new Error(await response.text());
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 405, { error: "Method not allowed." });
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendJson(res, error.code === "ENOENT" ? 404 : 500, {
        error: error.code === "ENOENT" ? "Not found" : "Unable to read file"
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "content-type": MIME_TYPES[ext] || "application/octet-stream",
      "cache-control": "no-cache"
    });
    res.end(content);
  });
}

function emptyQuote(symbol) {
  return {
    symbol,
    shortName: symbol,
    exchange: "",
    currency: "USD",
    marketPrice: null,
    previousClose: null,
    change: null,
    changePercent: null,
    marketState: "UNKNOWN",
    fetchedAt: new Date().toISOString()
  };
}

async function fetchQuote(symbol) {
  const endpoint = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
  endpoint.searchParams.set("interval", "1m");
  endpoint.searchParams.set("range", "1d");

  const response = await fetch(endpoint, {
    headers: {
      accept: "application/json",
      "user-agent": "portfolio-dashboard/1.0"
    }
  });

  if (!response.ok) return emptyQuote(symbol);

  const payload = await response.json();
  const result = payload.chart?.result?.[0];
  const meta = result?.meta;
  if (!meta) return emptyQuote(symbol);

  const closes = result.indicators?.quote?.[0]?.close || [];
  const latestClose = [...closes].reverse().find((value) => Number.isFinite(value));
  const marketPrice = Number.isFinite(meta.regularMarketPrice)
    ? meta.regularMarketPrice
    : latestClose ?? null;
  const previousClose = Number.isFinite(meta.previousClose)
    ? meta.previousClose
    : Number.isFinite(meta.chartPreviousClose)
      ? meta.chartPreviousClose
      : null;
  const change =
    Number.isFinite(marketPrice) && Number.isFinite(previousClose)
      ? marketPrice - previousClose
      : null;
  const changePercent =
    Number.isFinite(change) && previousClose > 0 ? (change / previousClose) * 100 : null;

  return {
    symbol: meta.symbol || symbol,
    shortName: meta.shortName || meta.longName || meta.symbol || symbol,
    exchange: meta.fullExchangeName || meta.exchangeName || "",
    currency: meta.currency || "USD",
    marketPrice,
    previousClose,
    change,
    changePercent,
    marketState: meta.marketState || "",
    fetchedAt: new Date().toISOString()
  };
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
  const cache = readLocalMarketDataCache();
  try {
    const liveRows = await fetchDailyHistory(symbol);
    const now = new Date().toISOString();
    cache[symbol] = { symbol, rows: liveRows, fetchedAt: now };
    writeLocalMarketDataCache(cache);
    return shapeMarketRows(symbol, liveRows, "LIVE_MARKET_DATA", "Yahoo Finance", now);
  } catch (error) {
    const cached = cache[symbol];
    if (cached?.rows && Array.isArray(cached.rows) && cached.rows.length) {
      return shapeMarketRows(symbol, cached.rows, "SERVER_CACHED_DATA", "Server cached data", cached.fetchedAt || null);
    }
    throw error;
  }
}

async function handleQuotes(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const symbols = (url.searchParams.get("symbols") || "")
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 50);

  if (!symbols.length) {
    sendJson(res, 400, { error: "Please provide at least one symbol." });
    return;
  }

  try {
    const quotes = await Promise.all(symbols.map(fetchQuote));
    sendJson(res, 200, { quotes });
  } catch (error) {
    sendJson(res, 502, {
      error: "Unable to fetch market prices. Please check your internet connection."
    });
  }
}

async function handlePriceHistory(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const symbol = (url.searchParams.get("symbol") || "").trim().toUpperCase();
  const forceRefresh = String(url.searchParams.get("refresh") || "") === "1";
  if (!symbol) {
    sendJson(res, 400, { error: "Please provide symbol." });
    return;
  }

  try {
    const thaiNav = await fetchThaiFundNavSnapshot(symbol, { forceRefresh });
    if (thaiNav) {
      sendJson(res, 200, thaiNav);
      return;
    }
    const marketData = await fetchMarketHistoryWithServerCache(symbol);
    sendJson(res, 200, marketData);
  } catch (error) {
    sendJson(res, 502, { error: "Unable to fetch daily price history." });
  }
}

async function handleDebugMarketData(_req, res) {
  const runtime = {
    node: process.version,
    platform: process.platform,
    env: process.env.VERCEL ? "vercel" : "local-node"
  };
  const env = {
    hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
    hasSupabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasSupabaseSchema: Boolean(process.env.SUPABASE_SCHEMA)
  };

  let providerTest = { ok: false, error: "not-run" };
  try {
    const rows = await fetchDailyHistory("NVDA");
    providerTest = {
      ok: true,
      rows: rows.length,
      latestDate: rows.length ? rows[rows.length - 1].date : null
    };
  } catch (error) {
    providerTest = {
      ok: false,
      error: String(error.message || error)
    };
  }

  const cache = readLocalMarketDataCache();
  const cacheKeys = Object.keys(cache || {});
  const cacheTimestamp = cache?.NVDA?.fetchedAt || null;
  sendJson(res, 200, {
    runtime,
    marketDataProvider: "Yahoo Finance (+ KAsset for Thai mutual funds via /api/market-data)",
    env,
    providerTest,
    serverCache: {
      exists: cacheKeys.length > 0,
      keys: cacheKeys.slice(0, 20),
      cacheTimestamp
    }
  });
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);

  if (requestUrl.pathname === "/api/quotes") {
    handleQuotes(req, res);
    return;
  }

  if (requestUrl.pathname === "/api/price-history") {
    handlePriceHistory(req, res);
    return;
  }

  if (requestUrl.pathname === "/api/market-data") {
    handlePriceHistory(req, res);
    return;
  }

  if (requestUrl.pathname === "/api/debug/market-data") {
    handleDebugMarketData(req, res);
    return;
  }

  if (requestUrl.pathname === "/api/portfolio") {
    handlePortfolio(req, res);
    return;
  }

  if (requestUrl.pathname === "/api/ai-universe") {
    handleAiUniverse(req, res);
    return;
  }

  const safePath = decodeURIComponent(requestUrl.pathname)
    .replace(/^\/+/, "")
    .replace(/\.\.(\/|\\)/g, "");
  const requestedPath = safePath || "index.html";
  const hasExtension = Boolean(path.extname(requestedPath));
  const filePath = path.join(PUBLIC_DIR, requestedPath);
  const cleanUrlFallbackPath = hasExtension ? "" : path.join(PUBLIC_DIR, `${requestedPath}.html`);
  const resolvedPath = path.resolve(filePath);
  const resolvedCleanUrlFallbackPath = cleanUrlFallbackPath ? path.resolve(cleanUrlFallbackPath) : "";

  if (!resolvedPath.startsWith(path.resolve(PUBLIC_DIR))) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  if (resolvedCleanUrlFallbackPath && !resolvedCleanUrlFallbackPath.startsWith(path.resolve(PUBLIC_DIR))) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  fs.stat(resolvedPath, (error, stats) => {
    if (!error && stats.isDirectory()) {
      sendFile(res, path.join(resolvedPath, "index.html"));
      return;
    }

    if (error && resolvedCleanUrlFallbackPath) {
      fs.stat(resolvedCleanUrlFallbackPath, (fallbackError, fallbackStats) => {
        if (!fallbackError && fallbackStats.isFile()) {
          sendFile(res, resolvedCleanUrlFallbackPath);
          return;
        }
        sendFile(res, resolvedPath);
      });
      return;
    }

    sendFile(res, resolvedPath);
  });
});

server.listen(PORT, () => {
  console.log(`Investment dashboard running at http://localhost:${PORT}`);
});
