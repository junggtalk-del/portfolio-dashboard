"use strict";

// Coin Metrics Community provider (NO API KEY required) — source priority #1 for
// no-key daily on-chain cycle data. The community tier exposes CapMVRVCur (MVRV
// ratio) and CapMrktCurUSD (market cap) for BTC (CapRealUSD and CapMVRVZ are NOT
// community-available), so we fetch those two and DERIVE the rest:
//   realizedCap = marketCap / mvrvRatio          (Coin Metrics' own realized cap)
//   mvrvZScore  = (marketCap - realizedCap) / std(marketCap)   [Mahmudov/Puell def.]
//   nupl        = (marketCap - realizedCap) / marketCap = 1 - 1/mvrvRatio
// Data is daily (D-0/D-1). No key, no CORS concern (called server-side).

const BASE = "https://community-api.coinmetrics.io/v4";
// All community=true for BTC (CapRealUSD / CapMVRVZ are NOT — they are derived below).
const METRICS = ["CapMVRVCur", "CapMrktCurUSD", "SplyCur"];

function std(arr) {
  if (!arr.length) return null;
  const m = arr.reduce((s, v) => s + v, 0) / arr.length;
  const variance = arr.reduce((s, v) => s + (v - m) * (v - m), 0) / arr.length;
  return Math.sqrt(variance);
}

async function fetchCoinMetricsBtc(opts) {
  opts = opts || {};
  const fetchedAt = new Date().toISOString();
  const errors = [];
  const url = `${BASE}/timeseries/asset-metrics?assets=btc&metrics=${METRICS.join(",")}&frequency=1d&page_size=10000&sort=time`;
  let rows = [];
  try {
    const res = await fetch(url, { headers: { "accept": "application/json" } });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { source: "Coin Metrics Community", configured: true, freshness: "daily", latest: {}, history: [], fetchedAt, errors: [`HTTP ${res.status}${txt ? " " + txt.slice(0, 120) : ""}`] };
    }
    const json = await res.json();
    rows = Array.isArray(json && json.data) ? json.data : [];
    if (json && json.next_page_token) errors.push("more pages available; used first page (most-recent values still correct via sort=time)");
  } catch (err) {
    return { source: "Coin Metrics Community", configured: true, freshness: "daily", latest: {}, history: [], fetchedAt, errors: [`fetch failed: ${err && err.message ? err.message : err}`] };
  }

  // shape + clean (values are strings); keep only rows with a usable MVRV + market cap
  const clean = rows
    .map((d) => ({ date: String(d.time || "").slice(0, 10), mvrv: Number(d.CapMVRVCur), mc: Number(d.CapMrktCurUSD), supply: Number(d.SplyCur) }))
    .filter((x) => x.date && Number.isFinite(x.mvrv) && x.mvrv > 0 && Number.isFinite(x.mc) && x.mc > 0);
  if (!clean.length) {
    return { source: "Coin Metrics Community", configured: true, freshness: "daily", latest: {}, history: [], fetchedAt, errors: errors.concat(["no usable rows"]) };
  }

  // derive realized cap (CapRealUSD is not community) + the spread used by the MVRV Z-Score,
  // plus a realized-PRICE proxy (realizedCap / circulating supply) when supply is present.
  const enriched = clean.map((x) => ({
    date: x.date, mvrvRatio: x.mvrv, marketCap: x.mc, realizedCap: x.mc / x.mvrv, nupl: 1 - 1 / x.mvrv,
    supply: Number.isFinite(x.supply) && x.supply > 0 ? x.supply : null
  }));
  const stdMC = std(enriched.map((x) => x.marketCap));
  const last = enriched[enriched.length - 1];
  const mvrvZScore = stdMC && stdMC > 0 ? (last.marketCap - last.realizedCap) / stdMC : null;
  const realizedPriceProxy = last.supply ? last.realizedCap / last.supply : null;

  // lightweight history for chart reference (realized cap line) — last ~400 days
  const history = enriched.slice(-400).map((x) => ({
    date: x.date,
    mvrvRatio: Math.round(x.mvrvRatio * 1e6) / 1e6,
    nupl: Math.round(x.nupl * 1e6) / 1e6,
    realizedCap: x.realizedCap,
    marketCap: x.marketCap,
    realizedPriceProxy: x.supply ? Math.round((x.realizedCap / x.supply) * 100) / 100 : null
  }));

  return {
    source: "Coin Metrics Community",
    configured: true,
    freshness: "daily",
    latest: {
      date: last.date,
      mvrvRatio: last.mvrvRatio,
      mvrvZScore: mvrvZScore != null ? Math.round(mvrvZScore * 1000) / 1000 : null,
      nupl: Math.round(last.nupl * 1e6) / 1e6,
      realizedCap: last.realizedCap,
      marketCap: last.marketCap,
      supply: last.supply,
      realizedPriceProxy: realizedPriceProxy != null ? Math.round(realizedPriceProxy * 100) / 100 : null
    },
    history,
    fetchedAt,
    errors
  };
}

module.exports = { fetchCoinMetricsBtc, std, METRICS };
