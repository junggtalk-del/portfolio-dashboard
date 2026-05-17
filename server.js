const http = require("http");
const fs = require("fs");
const path = require("path");
const { loadLocalEnv } = require("./local-env");

loadLocalEnv();

const PORT = Number(process.env.PORT || 4173);
const PUBLIC_DIR = path.join(__dirname, "public");
const LOCAL_DATA_DIR = path.join(__dirname, ".local-data");
const LOCAL_PORTFOLIO_FILE = path.join(LOCAL_DATA_DIR, "portfolio.json");
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
  if (!symbol) {
    sendJson(res, 400, { error: "Please provide symbol." });
    return;
  }

  try {
    const rows = await fetchDailyHistory(symbol);
    sendJson(res, 200, {
      symbol,
      dates: rows.map((row) => row.date),
      closes: rows.map((row) => row.close)
    });
  } catch (error) {
    sendJson(res, 502, { error: "Unable to fetch daily price history." });
  }
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

  if (requestUrl.pathname === "/api/portfolio") {
    handlePortfolio(req, res);
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
