const SCHEMA = process.env.SUPABASE_SCHEMA || "portfolio_dashboard";
const STATE_ID = "main";
const { isPasswordValid } = require("../lib/auth");
const { isValidPortfolioData } = require("../lib/portfolio-validation");
const { isValidJournalDoc, JOURNAL_STATE_ID } = require("../lib/journal-validation");
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

async function readState(id) {
  const url = `${getSupabaseUrl()}/rest/v1/app_state?id=eq.${id}&select=data`;
  const response = await fetch(url, { headers: supabaseHeaders() });
  if (!response.ok) throw new Error(await response.text());
  const rows = await response.json();
  return rows[0]?.data || null;
}

async function writeState(id, data) {
  const url = `${getSupabaseUrl()}/rest/v1/app_state`;
  const response = await fetch(url, {
    method: "POST",
    headers: supabaseHeaders({
      prefer: "resolution=merge-duplicates,return=minimal"
    }),
    body: JSON.stringify([{ id, data, updated_at: new Date().toISOString() }])
  });
  if (!response.ok) throw new Error(await response.text());
}

function getSupabaseUrl() {
  return String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
}

// Which app_state row a request addresses (spec §6). `?doc=journal` is the
// Decision Journal: a separate row with its own validator, so journal writes
// never touch the portfolio blob and vice versa. No `doc` keeps the original
// portfolio behaviour unchanged. Any other value → null (rejected, no I/O).
// server.js mirrors this switch for local dev; keep both in sync.
function resolveDocTarget(req) {
  const doc = new URL(req.url || "/", "http://localhost").searchParams.get("doc");
  if (!doc) {
    return {
      id: STATE_ID,
      isValid: isValidPortfolioData,
      rejectMessage: "Refusing to save: portfolio data is empty or malformed."
    };
  }
  if (doc === "journal") {
    return {
      id: JOURNAL_STATE_ID,
      isValid: isValidJournalDoc,
      rejectMessage: "Refusing to save: journal data is malformed."
    };
  }
  return null;
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
    const target = resolveDocTarget(req);
    if (!target) {
      send(res, 400, { error: "Unknown doc." });
      return;
    }

    if (req.method === "GET") {
      send(res, 200, { data: await readState(target.id) });
      return;
    }

    if (req.method === "PUT") {
      const body = parseJsonBody(req);
      if (!target.isValid(body?.data)) {
        send(res, 400, { error: target.rejectMessage });
        return;
      }
      await writeState(target.id, body?.data);
      send(res, 200, { ok: true });
      return;
    }

    send(res, 405, { error: "Method not allowed." });
  } catch (error) {
    send(res, 500, { error: error.message });
  }
};
