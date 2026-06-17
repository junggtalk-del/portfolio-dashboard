const {
  canonicalSymbolFromTicker,
  getHistoricalThaiFundNav
} = require("../../lib/data-providers/thaiMutualFundHistoricalNavProvider");

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

module.exports = async function handler(req, res) {
  const symbol = String(req.query?.symbol || "").trim();
  const canonicalSymbol = canonicalSymbolFromTicker(symbol);

  if (!symbol || !canonicalSymbol) {
    send(res, 400, {
      error: "Please provide a supported Thai RMF symbol.",
      supportedSymbols: ["K-GTECHRMF", "K-USXNDQRMF"]
    });
    return;
  }

  try {
    const payload = await getHistoricalThaiFundNav(canonicalSymbol, {
      minPoints: Number(req.query?.minPoints || 220),
      forceRefresh: String(req.query?.refresh || "") === "1"
    });
    const points = payload.navHistory.length;
    const firstDate = points ? payload.navHistory[0].date : null;
    const lastDate = points ? payload.navHistory[points - 1].date : null;

    send(res, 200, {
      symbol,
      canonicalSymbol,
      latestNav: payload.latestNav ?? null,
      latestNavDate: payload.latestNavDate || null,
      historicalPoints: points,
      source: payload.source,
      canCalculateEMA12: points >= 12,
      canCalculateEMA26: points >= 26,
      canCalculateSMA200: points >= 200,
      firstDate,
      lastDate,
      error: null
    });
  } catch (error) {
    send(res, 200, {
      symbol,
      canonicalSymbol,
      latestNav: null,
      latestNavDate: null,
      historicalPoints: 0,
      source: null,
      canCalculateEMA12: false,
      canCalculateEMA26: false,
      canCalculateSMA200: false,
      firstDate: null,
      lastDate: null,
      error: String(error.message || error),
      code: error.code || ""
    });
  }
};
