const SCHEMA = process.env.SUPABASE_SCHEMA || "portfolio_dashboard";
const { isPasswordValid } = require("../lib/auth");
const { parseJsonBody } = require("../lib/request-body");

const THAI_MUTUAL_FUND_ALIASES = {
  "K-GTECHRMF": "K-GTECHRMF",
  KGTECHRMF: "K-GTECHRMF",
  "K-USXNDQRMF": "K-USXNDQRMF",
  KUSXNDQRMF: "K-USXNDQRMF"
};
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
  res.end(JSON.stringify(payload));
}

function getSupabaseUrl() {
  return String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
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

function normalizeTicker(rawTicker) {
  return String(rawTicker || "").trim().toUpperCase().replace(/[^A-Z0-9.^-]/g, "");
}

function canonicalSymbolFromTicker(rawTicker) {
  const normalized = normalizeTicker(rawTicker);
  const compact = normalized.replace(/[^A-Z0-9]/g, "");
  return (
    THAI_INDEX_ALIASES[normalized] ||
    THAI_INDEX_ALIASES[compact] ||
    US_INDEX_ALIASES[normalized] ||
    US_INDEX_ALIASES[compact] ||
    THAI_MUTUAL_FUND_ALIASES[normalized] ||
    THAI_MUTUAL_FUND_ALIASES[compact] ||
    THAI_STOCK_ALIASES[normalized] ||
    THAI_STOCK_ALIASES[compact] ||
    normalized
  );
}

function displaySymbolForCanonical(symbol) {
  if (symbol === "^SET.BK") return "SET";
  if (symbol === "^SET50.BK") return "SET50";
  if (symbol === "^SET100.BK") return "SET100";
  if (symbol === "^GSPC") return "SPX";
  if (symbol === "^IXIC") return "IXIC";
  if (symbol === "^NDX") return "NDX";
  if (symbol === "BTC-USD") return "BTCUSD";
  if (symbol.endsWith(".BK")) return symbol.slice(0, -3);
  return symbol;
}

function detectAssetType(symbol, fallback = "") {
  if (symbol.includes("RMF") || symbol.includes("SSF")) return "THAI_MUTUAL_FUND";
  if (symbol.startsWith("^SET")) return "THAI_INDEX";
  if (symbol.endsWith(".BK")) return "THAI_STOCK";
  if (symbol.startsWith("^")) return "INDEX";
  if (symbol === "BTCUSD" || symbol === "BTC-USD" || symbol === "ETHUSD") return "crypto";
  return fallback || "stock";
}

function toNullableNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function sanitizeHolding(input) {
  const canonicalSymbol = canonicalSymbolFromTicker(input?.canonical_symbol || input?.canonicalSymbol || input?.symbol || input?.ticker);
  const isHolding = Boolean(input?.is_holding ?? input?.isHolding);
  const marketValue = toNullableNumber(input?.market_value ?? input?.marketValue);
  const quantity = toNullableNumber(input?.quantity);
  const averageCost = toNullableNumber(input?.average_cost ?? input?.averageCost);
  const costValue = toNullableNumber(input?.cost_value ?? input?.costValue) ?? (
    Number.isFinite(quantity) && Number.isFinite(averageCost) ? quantity * averageCost : null
  );
  return {
    canonical_symbol: canonicalSymbol,
    display_symbol: input?.display_symbol || input?.displaySymbol || displaySymbolForCanonical(canonicalSymbol),
    asset_name: input?.asset_name || input?.assetName || input?.name || canonicalSymbol,
    asset_type: input?.asset_type || input?.assetType || detectAssetType(canonicalSymbol),
    provider_symbol: input?.provider_symbol || input?.providerSymbol || canonicalSymbol,
    is_holding: isHolding,
    watchlist_only: Boolean(input?.watchlist_only ?? input?.watchlistOnly ?? !isHolding),
    quantity,
    average_cost: averageCost,
    cost_value: costValue,
    market_value: isHolding ? marketValue : 0,
    currency: input?.currency || "THB",
    latest_price: toNullableNumber(input?.latest_price ?? input?.latestPrice),
    latest_price_date: input?.latest_price_date || input?.latestPriceDate || null,
    target_weight: toNullableNumber(input?.target_weight ?? input?.targetWeight),
    portfolio_bucket: input?.portfolio_bucket || input?.portfolioBucket || "",
    account_type: input?.account_type || input?.accountType || "",
    notes: input?.notes || ""
  };
}

function shapeRow(row) {
  return {
    id: row.id,
    canonicalSymbol: row.canonical_symbol,
    displaySymbol: row.display_symbol,
    assetName: row.asset_name,
    assetType: row.asset_type,
    providerSymbol: row.provider_symbol || row.canonical_symbol,
    isHolding: Boolean(row.is_holding),
    watchlistOnly: Boolean(row.watchlist_only),
    quantity: toNullableNumber(row.quantity),
    averageCost: toNullableNumber(row.average_cost),
    costValue: toNullableNumber(row.cost_value),
    marketValue: toNullableNumber(row.market_value),
    currency: row.currency || "THB",
    latestPrice: toNullableNumber(row.latest_price),
    latestPriceDate: row.latest_price_date || null,
    targetWeight: toNullableNumber(row.target_weight),
    portfolioBucket: row.portfolio_bucket || "",
    accountType: row.account_type || "",
    notes: row.notes || "",
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  };
}

function stripOptionalMetadataFields(row) {
  const {
    provider_symbol: _providerSymbol,
    latest_price: _latestPrice,
    latest_price_date: _latestPriceDate,
    ...safeRow
  } = row;
  return safeRow;
}

async function readHoldings() {
  const endpoint = `${getSupabaseUrl()}/rest/v1/portfolio_holdings?select=*&order=canonical_symbol.asc`;
  const response = await fetch(endpoint, { headers: supabaseHeaders() });
  if (!response.ok) throw new Error(await response.text());
  const rows = await response.json();
  return rows.map(shapeRow);
}

async function upsertHoldings(holdings) {
  const endpoint = `${getSupabaseUrl()}/rest/v1/portfolio_holdings?on_conflict=canonical_symbol`;
  const seen = new Set();
  const rows = (Array.isArray(holdings) ? holdings : [])
    .map(sanitizeHolding)
    .filter((holding) => {
      if (!holding.canonical_symbol || seen.has(holding.canonical_symbol)) return false;
      seen.add(holding.canonical_symbol);
      return true;
    })
    .map((holding) => ({ ...holding, updated_at: new Date().toISOString() }));
  let response = await fetch(endpoint, {
    method: "POST",
    headers: supabaseHeaders({ prefer: "resolution=merge-duplicates,return=representation" }),
    body: JSON.stringify(rows)
  });
  if (!response.ok) {
    const errorText = await response.text();
    if (/provider_symbol|latest_price|latest_price_date|schema cache|column/i.test(errorText)) {
      response = await fetch(endpoint, {
        method: "POST",
        headers: supabaseHeaders({ prefer: "resolution=merge-duplicates,return=representation" }),
        body: JSON.stringify(rows.map(stripOptionalMetadataFields))
      });
    } else {
      throw new Error(errorText);
    }
  }
  if (!response.ok) throw new Error(await response.text());
  return (await response.json()).map(shapeRow);
}

async function deleteHolding(symbol) {
  const canonicalSymbol = canonicalSymbolFromTicker(symbol);
  const endpoint = `${getSupabaseUrl()}/rest/v1/portfolio_holdings?canonical_symbol=eq.${encodeURIComponent(canonicalSymbol)}`;
  const response = await fetch(endpoint, { method: "DELETE", headers: supabaseHeaders({ prefer: "return=minimal" }) });
  if (!response.ok) throw new Error(await response.text());
}

module.exports = async function handler(req, res) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    send(res, 500, { error: "Server environment variables are not configured." });
    return;
  }

  if (!isPasswordValid(req)) {
    send(res, 401, { error: "Unauthorized: missing or incorrect password." });
    return;
  }

  try {
    if (req.method === "GET") {
      send(res, 200, { data: await readHoldings(), mode: "supabase" });
      return;
    }

    if (req.method === "PUT" || req.method === "POST") {
      const body = parseJsonBody(req);
      const rows = await upsertHoldings(body?.data || body?.holdings || []);
      send(res, 200, { ok: true, data: rows, mode: "supabase" });
      return;
    }

    if (req.method === "DELETE") {
      const symbol = req.query?.symbol || new URL(req.url, "http://local").searchParams.get("symbol");
      const canonicalSymbol = canonicalSymbolFromTicker(symbol);
      if (!canonicalSymbol) {
        send(res, 400, { error: "Missing or invalid symbol for delete." });
        return;
      }
      await deleteHolding(canonicalSymbol);
      send(res, 200, { ok: true, mode: "supabase" });
      return;
    }

    send(res, 405, { error: "Method not allowed." });
  } catch (error) {
    send(res, 500, { error: error.message });
  }
};
