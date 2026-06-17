const priceHistoryHandler = require("../price-history");

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

async function testYahooFetch() {
  try {
    const nvda = await priceHistoryHandler.__internals.fetchDailyHistory("NVDA");
    const set50 = await priceHistoryHandler.__internals.fetchDailyHistory("^SET50.BK");
    return {
      ok: true,
      nvdaRows: nvda.rows.length,
      nvdaLatestDate: nvda.rows.length ? nvda.rows[nvda.rows.length - 1].date : null,
      set50Rows: set50.rows.length,
      set50LatestDate: set50.rows.length ? set50.rows[set50.rows.length - 1].date : null,
      set50SourceRange: set50.range,
      set50Sparse: set50.isSparse
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
    let set50CacheRows = 0;
    let set50HistoricalSourceLimited = false;
    let cacheReadError = null;
    try {
      const cache = await priceHistoryHandler.__internals.readMarketDataCacheFromSupabase();
      cacheKeys = Object.keys(cache || {});
      serverCacheExists = cacheKeys.length > 0;
      cacheTimestamp = cache?.["^SET50.BK"]?.fetchedAt || cache?.NVDA?.fetchedAt || null;
      set50CacheRows = Array.isArray(cache?.["^SET50.BK"]?.rows) ? cache["^SET50.BK"].rows.length : 0;
      set50HistoricalSourceLimited = Boolean(cache?.["^SET50.BK"]?.historicalSourceLimited);
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
        set50CacheRows,
        set50HistoricalSourceLimited,
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
