"use strict";

// DefiLlama stablecoins API (free, no key). Total stablecoin market cap, used to
// build an "SSR Proxy" (BTC market cap / total stablecoin market cap). This is NOT
// the exact Glassnode SSR — it is clearly labelled a proxy in the UI.
// https://stablecoins.llama.fi/stablecoincharts/all
//   -> [{ date: "<unixSeconds>", totalCirculatingUSD: { peggedUSD, peggedEUR, ... } }]

const URL = "https://stablecoins.llama.fi/stablecoincharts/all";

async function fetchDefillamaStablecoin(opts) {
  opts = opts || {};
  const fetchedAt = new Date().toISOString();
  try {
    const res = await fetch(URL, { headers: { "accept": "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arr = await res.json();
    if (!Array.isArray(arr) || !arr.length) throw new Error("empty response");
    const last = arr[arr.length - 1];
    const tc = last && last.totalCirculatingUSD ? last.totalCirculatingUSD : {};
    // USD-pegged stablecoins dominate the market; use that as "total stablecoin mcap".
    const totalStablecoinMcap = Number(tc.peggedUSD);
    const date = last && last.date ? new Date(Number(last.date) * 1000).toISOString().slice(0, 10) : null;
    if (!Number.isFinite(totalStablecoinMcap) || totalStablecoinMcap <= 0) throw new Error("no peggedUSD total");
    return { source: "DefiLlama", totalStablecoinMcap, date, fetchedAt, errors: [] };
  } catch (e) {
    return { source: "DefiLlama", totalStablecoinMcap: null, date: null, fetchedAt, errors: [String(e && e.message ? e.message : e)] };
  }
}

module.exports = { fetchDefillamaStablecoin };
