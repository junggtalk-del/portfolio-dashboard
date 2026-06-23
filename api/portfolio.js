const SCHEMA = process.env.SUPABASE_SCHEMA || "portfolio_dashboard";
const STATE_ID = "main";
const { isPasswordValid } = require("../lib/auth");
const { isValidPortfolioData } = require("../lib/portfolio-validation");
const { parseJsonBody } = require("../lib/request-body");

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

async function readState() {
  const url = `${getSupabaseUrl()}/rest/v1/app_state?id=eq.${STATE_ID}&select=data`;
  const response = await fetch(url, { headers: supabaseHeaders() });
  if (!response.ok) throw new Error(await response.text());
  const rows = await response.json();
  return rows[0]?.data || null;
}

async function writeState(data) {
  const url = `${getSupabaseUrl()}/rest/v1/app_state`;
  const response = await fetch(url, {
    method: "POST",
    headers: supabaseHeaders({
      prefer: "resolution=merge-duplicates,return=minimal"
    }),
    body: JSON.stringify([{ id: STATE_ID, data, updated_at: new Date().toISOString() }])
  });
  if (!response.ok) throw new Error(await response.text());
}

function getSupabaseUrl() {
  return String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
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
      send(res, 200, { data: await readState() });
      return;
    }

    if (req.method === "PUT") {
      const body = parseJsonBody(req);
      if (!isValidPortfolioData(body?.data)) {
        send(res, 400, { error: "Refusing to save: portfolio data is empty or malformed." });
        return;
      }
      await writeState(body?.data);
      send(res, 200, { ok: true });
      return;
    }

    send(res, 405, { error: "Method not allowed." });
  } catch (error) {
    send(res, 500, { error: error.message });
  }
};
