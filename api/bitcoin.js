"use strict";

// Bitcoin Monitor data orchestrator (single serverless function — keeps the
// project under the Hobby 12-function limit; this IS the "merged" endpoint).
// FREE-DATA FIRST — no paid API required:
//   1. Binance spot      -> price / OHLCV / EMA/SMA/RSI / Volume Ratio 5D  (public)
//   2. Binance futures   -> funding / open interest / taker / long-short    (public)
//   3. Coin Metrics      -> MVRV ratio / MVRV-Z / NUPL / realized-price proxy (no key)
//   4. Blockchain.com    -> hashrate / difficulty / miner-revenue multiple proxy (no key)
//   5. DefiLlama         -> total stablecoin mcap -> SSR proxy              (no key)
//   6. Alternative.me    -> Fear & Greed sentiment                          (no key)
// Optional paid enhancers (only if env keys are set; never required):
//   Glassnode (GLASSNODE_API_KEY) / CryptoQuant (CRYPTOQUANT_API_KEY).
// API keys are read from server env only and never returned to the client.
const { fetchBinanceBtc, fetchBinanceFutures } = require("../lib/data-providers/binanceBtcProvider");
const { fetchCoinMetricsBtc } = require("../lib/data-providers/coinMetricsBtcProvider");
const { fetchBlockchainComBtc } = require("../lib/data-providers/blockchainComBtcProvider");
const { fetchDefillamaStablecoin } = require("../lib/data-providers/defillamaStablecoinProvider");
const { fetchFearGreed } = require("../lib/data-providers/alternativeFearGreedProvider");
const { fetchGlassnodeBtc } = require("../lib/data-providers/glassnodeBtcProvider");
const { fetchCryptoQuantBtc } = require("../lib/data-providers/cryptoquantBtcProvider");
const { mergeFreeBitcoinData } = require("../lib/data-providers/freeBitcoinDataMerger");

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "s-maxage=120, stale-while-revalidate=600");
  res.end(JSON.stringify(payload));
}

module.exports = async function handler(req, res) {
  const fetchedAt = new Date().toISOString();
  const nowMs = Date.now();
  let interval = "24h";
  try { interval = new URL(req.url, "http://local").searchParams.get("interval") === "1h" ? "1h" : "24h"; } catch (e) {}

  const hasGlass = !!process.env.GLASSNODE_API_KEY;
  const hasCq = !!process.env.CRYPTOQUANT_API_KEY;

  const errOf = (e) => String(e && e.message ? e.message : e);

  // All sources concurrently; each best-effort (never throws out of the handler).
  const [binance, futures, coinMetrics, blockchain, defillama, fearGreed, glass, cq] = await Promise.all([
    fetchBinanceBtc({ limit: 1000 }).catch((e) => ({ _error: errOf(e) })),
    fetchBinanceFutures({}).catch((e) => ({ source: "Binance Futures", errors: [errOf(e)] })),
    fetchCoinMetricsBtc({}).catch((e) => ({ source: "Coin Metrics Community", latest: {}, history: [], errors: [errOf(e)] })),
    fetchBlockchainComBtc({}).catch((e) => ({ source: "Blockchain.com", latest: {}, dates: {}, errors: [errOf(e)] })),
    fetchDefillamaStablecoin({}).catch((e) => ({ source: "DefiLlama", totalStablecoinMcap: null, errors: [errOf(e)] })),
    fetchFearGreed({}).catch((e) => ({ source: "Alternative.me", value: null, errors: [errOf(e)] })),
    fetchGlassnodeBtc(process.env.GLASSNODE_API_KEY, { interval }).catch((e) => ({ source: "Glassnode", configured: hasGlass, metrics: {}, history: {}, dates: {}, errors: [errOf(e)] })),
    fetchCryptoQuantBtc(process.env.CRYPTOQUANT_API_KEY, { interval }).catch((e) => ({ source: "CryptoQuant", configured: hasCq, metrics: {}, history: {}, dates: {}, errors: [errOf(e)] }))
  ]);

  const bin = binance && !binance._error ? binance : null;
  const binanceError = binance && binance._error ? binance._error : null;

  const { metrics, coverage } = mergeFreeBitcoinData({
    binance, futures, coinMetrics, blockchain, defillama, fearGreed, glass, cq, hasGlass, hasCq, nowMs
  });

  // back-compat flat views (older cached clients / other consumers)
  const latest = { date: bin ? bin.latestDate : null };
  const sources = {};
  Object.keys(metrics).forEach((k) => { latest[k] = metrics[k].value; sources[k] = metrics[k].source; });

  const history = bin
    ? {
        dates: bin.dates, closes: bin.closes, volumes: bin.volumes,
        opens: bin.ohlcv ? bin.ohlcv.map((o) => o.open) : [],
        highs: bin.ohlcv ? bin.ohlcv.map((o) => o.high) : [],
        lows: bin.ohlcv ? bin.ohlcv.map((o) => o.low) : []
      }
    : { dates: [], closes: [], volumes: [], opens: [], highs: [], lows: [] };

  const errors = [];
  if (binanceError) errors.push("Binance: " + binanceError);
  (futures.errors || []).forEach((e) => errors.push("Binance Futures: " + e));
  (coinMetrics.errors || []).forEach((e) => errors.push("Coin Metrics: " + e));
  (blockchain.errors || []).forEach((e) => errors.push("Blockchain.com: " + e));
  (defillama.errors || []).forEach((e) => errors.push("DefiLlama: " + e));
  (fearGreed.errors || []).forEach((e) => errors.push("Alternative.me: " + e));
  (glass.errors || []).forEach((e) => errors.push("Glassnode: " + e));
  (cq.errors || []).forEach((e) => errors.push("CryptoQuant: " + e));

  const cmL = (coinMetrics && coinMetrics.latest) || {};

  send(res, 200, {
    metrics,
    coverage,
    latest,
    sources,
    history,
    providers: {
      binance: { ok: !!bin, error: binanceError, latestDate: bin ? bin.latestDate : null, freshness: "near_real_time" },
      binanceFutures: { ok: futures.fundingRate != null || futures.openInterest != null, errors: futures.errors || [] },
      coinMetrics: { ok: !!cmL.date, configured: true, latestDate: cmL.date || null, freshness: "daily", errors: coinMetrics.errors || [] },
      blockchain: { ok: !!(blockchain.latest && (blockchain.latest.hashRate != null || blockchain.latest.minerRevenueMultipleProxy != null)), errors: blockchain.errors || [] },
      defillama: { ok: defillama.totalStablecoinMcap != null, errors: defillama.errors || [] },
      fearGreed: { ok: fearGreed.value != null, value: fearGreed.value, label: fearGreed.label, errors: fearGreed.errors || [] },
      glassnode: { configured: !!glass.configured, metricCount: Object.keys(glass.metrics || {}).length, errors: glass.errors || [] },
      cryptoquant: { configured: !!cq.configured, metricCount: Object.keys(cq.metrics || {}).length, errors: cq.errors || [] }
    },
    onchainHistory: { coinMetrics: coinMetrics.history || [], glassnode: glass.history || {}, cryptoquant: cq.history || {} },
    errors,
    fetchedAt
  });
};
