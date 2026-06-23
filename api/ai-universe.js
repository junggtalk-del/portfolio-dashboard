const SCHEMA = process.env.SUPABASE_SCHEMA || "portfolio_dashboard";
const STATE_ID = "ai_boom_universe_main";
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

function getSupabaseUrl() {
  return String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
}

function sanitizeState(data) {
  const safe = data && typeof data === "object" ? data : {};
  const seen = new Set();
  const userAssets = (Array.isArray(safe.userAssets) ? safe.userAssets : []).filter((asset) => {
    const symbol = canonicalSymbolFromTicker(asset?.ticker);
    if (!symbol || seen.has(symbol)) return false;
    seen.add(symbol);
    asset.ticker = symbol;
    return true;
  });
  const removedIds = Array.isArray(safe.removedIds) ? safe.removedIds : [];
  return { userAssets, removedIds };
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

async function readState() {
  const url = `${getSupabaseUrl()}/rest/v1/app_state?id=eq.${STATE_ID}&select=data`;
  const response = await fetch(url, { headers: supabaseHeaders() });
  if (!response.ok) throw new Error(await response.text());
  const rows = await response.json();
  return sanitizeState(rows[0]?.data);
}

async function writeState(data) {
  const url = `${getSupabaseUrl()}/rest/v1/app_state`;
  const payload = sanitizeState(data);
  const response = await fetch(url, {
    method: "POST",
    headers: supabaseHeaders({
      prefer: "resolution=merge-duplicates,return=minimal"
    }),
    body: JSON.stringify([{ id: STATE_ID, data: payload, updated_at: new Date().toISOString() }])
  });
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
      send(res, 200, { data: await readState(), mode: "supabase" });
      return;
    }

    if (req.method === "PUT") {
      const body = parseJsonBody(req);
      await writeState(body?.data);
      send(res, 200, { ok: true, mode: "supabase" });
      return;
    }

    send(res, 405, { error: "Method not allowed." });
  } catch (error) {
    send(res, 500, { error: error.message });
  }
};
