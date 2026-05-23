const priceHistoryHandler = require("../price-history");

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

async function testYahooFetch() {
  try {
    const rows = await priceHistoryHandler.__internals.fetchDailyHistory("NVDA");
    return {
      ok: true,
      rows: rows.length,
      latestDate: rows.length ? rows[rows.length - 1].date : null
    };
  } catch (error) {
    return {
      ok: false,
      error: String(error.message || error)
    };
  }
}

module.exports = async function handler(req, res) {
  try {
    const hasSupabaseUrl = Boolean(process.env.SUPABASE_URL);
    const hasSupabaseServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const hasSupabaseSchema = Boolean(process.env.SUPABASE_SCHEMA);
    const runtime = {
      node: process.version,
      platform: process.platform,
      env: process.env.VERCEL ? "vercel" : "local-node"
    };

    const providerTest = await testYahooFetch();

    let serverCacheExists = false;
    let cacheTimestamp = null;
    let cacheKeys = [];
    let cacheReadError = null;
    try {
      const cache = await priceHistoryHandler.__internals.readMarketDataCacheFromSupabase();
      cacheKeys = Object.keys(cache || {});
      serverCacheExists = cacheKeys.length > 0;
      cacheTimestamp = cache?.NVDA?.fetchedAt || null;
    } catch (error) {
      cacheReadError = String(error.message || error);
    }

    send(res, 200, {
      runtime,
      marketDataProvider: "Yahoo Finance (+ KAsset for Thai mutual funds via /api/market-data)",
      env: {
        hasSupabaseUrl,
        hasSupabaseServiceRoleKey,
        hasSupabaseSchema
      },
      providerTest,
      serverCache: {
        exists: serverCacheExists,
        keys: cacheKeys.slice(0, 20),
        cacheTimestamp,
        cacheReadError
      }
    });
  } catch (error) {
    send(res, 500, {
      runtime: {
        node: process.version,
        platform: process.platform,
        env: process.env.VERCEL ? "vercel" : "local-node"
      },
      error: String(error.message || error)
    });
  }
};
