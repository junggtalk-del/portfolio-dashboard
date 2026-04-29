const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 4173);
const PUBLIC_DIR = path.join(__dirname, "public");
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

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(payload));
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

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);

  if (requestUrl.pathname === "/api/quotes") {
    handleQuotes(req, res);
    return;
  }

  const safePath = decodeURIComponent(requestUrl.pathname)
    .replace(/^\/+/, "")
    .replace(/\.\.(\/|\\)/g, "");
  const filePath = path.join(PUBLIC_DIR, safePath || "index.html");
  const resolvedPath = path.resolve(filePath);

  if (!resolvedPath.startsWith(path.resolve(PUBLIC_DIR))) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  fs.stat(resolvedPath, (error, stats) => {
    if (!error && stats.isDirectory()) {
      sendFile(res, path.join(resolvedPath, "index.html"));
      return;
    }

    sendFile(res, resolvedPath);
  });
});

server.listen(PORT, () => {
  console.log(`Investment dashboard running at http://localhost:${PORT}`);
});
