const {
  canonicalSymbolFromTicker,
  refreshHistoricalThaiFundNav
} = require("../../lib/data-providers/thaiMutualFundHistoricalNavProvider");

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    send(res, 405, { error: "Method not allowed. Use POST." });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const symbols = Array.isArray(body.symbols) ? body.symbols : [];
    const minPoints = Number(body.minPoints || 220);
    const canonicalSymbols = symbols.map((symbol) => canonicalSymbolFromTicker(symbol)).filter(Boolean);

    if (!canonicalSymbols.length) {
      send(res, 400, {
        error: "Please provide symbols like K-GTECHRMF or K-USXNDQRMF",
        supportedSymbols: ["K-GTECHRMF", "K-USXNDQRMF"]
      });
      return;
    }

    const results = await refreshHistoricalThaiFundNav(canonicalSymbols, { minPoints, forceRefresh: true });
    send(res, 200, {
      ok: true,
      refreshedAt: new Date().toISOString(),
      results
    });
  } catch (error) {
    send(res, 500, {
      ok: false,
      error: String(error.message || error)
    });
  }
};
