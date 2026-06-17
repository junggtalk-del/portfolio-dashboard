const {
  canonicalSymbolFromTicker,
  getHistoricalThaiFundNav
} = require("../../lib/data-providers/thaiMutualFundHistoricalNavProvider");

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "s-maxage=300, stale-while-revalidate=600");
  res.end(JSON.stringify(payload));
}

module.exports = async function handler(req, res) {
  const symbol = String(req.query?.symbol || "").trim();
  const canonicalSymbol = canonicalSymbolFromTicker(symbol);
  const minPoints = Number(req.query?.minPoints || 220);
  const from = req.query?.from ? String(req.query.from) : undefined;
  const to = req.query?.to ? String(req.query.to) : undefined;
  const forceRefresh = String(req.query?.refresh || "") === "1";

  if (!symbol || !canonicalSymbol) {
    send(res, 400, {
      error: "Please provide a supported Thai RMF symbol.",
      supportedSymbols: ["K-GTECHRMF", "K-USXNDQRMF"]
    });
    return;
  }

  try {
    const payload = await getHistoricalThaiFundNav(canonicalSymbol, { from, to, minPoints, forceRefresh });
    send(res, 200, payload);
  } catch (error) {
    send(res, 502, {
      symbol,
      canonicalSymbol,
      error: String(error.message || error),
      code: error.code || ""
    });
  }
};
