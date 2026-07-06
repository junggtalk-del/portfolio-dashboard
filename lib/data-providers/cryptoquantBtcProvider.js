"use strict";

// CryptoQuant provider (server-side only — API key from CRYPTOQUANT_API_KEY).
// Source priority #3 for: MVRV fallback, Estimated Leverage Ratio, Open Interest,
// Funding Rate, Exchange Netflow, STH-SOPR fallback.
// CryptoQuant uses a Bearer token and per-endpoint windows; exact endpoints depend
// on plan, so each is fetched independently and failures are collected (never thrown).

const BASE = "https://api.cryptoquant.com/v1/btc/";
// metric key -> { path, params }. window=day, latest point used.
const ENDPOINTS = {
  mvrv: { path: "market-indicator/mvrv", params: { window: "day" } },
  estimatedLeverageRatio: { path: "market-indicator/estimated-leverage-ratio", params: { window: "day", exchange: "all_exchange" } },
  openInterest: { path: "market-data/open-interest", params: { window: "day", exchange: "all_exchange" } },
  fundingRate: { path: "market-data/funding-rates", params: { window: "day", exchange: "all_exchange" } },
  exchangeNetflow: { path: "exchange-flows/netflow", params: { window: "day", exchange: "all_exchange" } },
  sthSopr: { path: "network-indicator/sopr-ratio", params: { window: "day" } }
};

function pickValue(row) {
  if (!row || typeof row !== "object") return null;
  // CryptoQuant rows vary by metric; try the common value field names.
  const keys = ["value", "mvrv", "estimated_leverage_ratio", "open_interest", "funding_rates", "netflow_total", "sopr"];
  for (const k of keys) { const n = Number(row[k]); if (Number.isFinite(n)) return n; }
  // fall back to the first finite numeric field that isn't a timestamp
  for (const k of Object.keys(row)) { if (/date|time|t$/i.test(k)) continue; const n = Number(row[k]); if (Number.isFinite(n)) return n; }
  return null;
}

async function fetchCryptoQuantBtc(apiKey, opts) {
  opts = opts || {};
  const fetchedAt = new Date().toISOString();
  if (!apiKey) {
    return { source: "CryptoQuant", configured: false, metrics: {}, history: {}, fetchedAt, errors: ["CryptoQuant API key not configured"] };
  }
  const metrics = {}, history = {}, dates = {}, errors = [];
  const keys = Object.keys(ENDPOINTS);
  await Promise.all(keys.map(async (key) => {
    const ep = ENDPOINTS[key];
    const qs = new URLSearchParams(Object.assign({ limit: "200" }, ep.params)).toString();
    const url = `${BASE}${ep.path}?${qs}`;
    try {
      const res = await fetch(url, { headers: { "accept": "application/json", "Authorization": `Bearer ${apiKey}` } });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        errors.push(`${key}: HTTP ${res.status}${txt ? " " + txt.slice(0, 80) : ""}`);
        return;
      }
      const json = await res.json();
      const rows = (json && json.result && Array.isArray(json.result.data)) ? json.result.data : (Array.isArray(json) ? json : []);
      if (rows.length) {
        const series = rows
          .map((r) => ({ date: String(r.date || r.datetime || r.t || "").slice(0, 10), value: pickValue(r) }))
          .filter((p) => Number.isFinite(p.value));
        // CryptoQuant returns rows newest-first; sort ascending so [length-1] is the
        // most-recent point (Glassnode is already ascending — normalise both the same way).
        series.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
        if (series.length) {
          history[key] = series.slice(-400);
          const last = series[series.length - 1];
          metrics[key] = last.value;
          dates[key] = last.date;
        }
      }
    } catch (err) {
      errors.push(`${key}: ${err && err.message ? err.message : err}`);
    }
  }));
  return { source: "CryptoQuant", configured: true, metrics, history, dates, fetchedAt, errors };
}

module.exports = { fetchCryptoQuantBtc, ENDPOINTS };
