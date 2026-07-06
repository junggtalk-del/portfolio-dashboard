"use strict";

// Glassnode on-chain provider (server-side only — API key from GLASSNODE_API_KEY).
// Source priority #2 for: MVRV, MVRV Z-Score, Puell, NUPL, STH/LTH Realized Price, STH/LTH-SOPR.
// Metric availability depends on the account plan — each metric is fetched
// independently and failures are collected in `errors` (never thrown).

// metric key -> Glassnode endpoint path (under /v1/metrics/). Paths follow the
// documented Glassnode API; some require a higher plan tier and will 403/401,
// which is reported per-metric rather than failing the whole request.
const ENDPOINTS = {
  mvrv: "market/mvrv",
  mvrvZScore: "market/mvrv_z_score",
  puellMultiple: "indicators/puell_multiple",
  nupl: "indicators/net_unrealized_profit_loss",
  sthRealizedPrice: "indicators/realized_price_sth",
  lthRealizedPrice: "indicators/realized_price_lth",
  sthSopr: "indicators/sopr_less_155",
  lthSopr: "indicators/sopr_more_155"
};

async function fetchGlassnodeBtc(apiKey, opts) {
  opts = opts || {};
  const fetchedAt = new Date().toISOString();
  if (!apiKey) {
    return { source: "Glassnode", configured: false, metrics: {}, history: {}, fetchedAt, errors: ["Glassnode API key not configured"] };
  }
  const i = opts.interval === "1h" ? "1h" : "24h";
  const base = "https://api.glassnode.com/v1/metrics/";
  const metrics = {}, history = {}, dates = {}, errors = [];
  const keys = Object.keys(ENDPOINTS);
  // Pull a scalar out of a Glassnode point. Single-value endpoints return {t, v};
  // multi-value endpoints return {t, o:{<named subfields>}} with NO generic `value`
  // key, so accept an optional per-endpoint field name and otherwise take the first
  // finite numeric sub-field rather than the non-existent o.value.
  const valueOf = (d, field) => {
    if (d == null) return NaN;
    if (d.v != null) return Number(d.v);
    if (d.o && typeof d.o === "object") {
      if (field && d.o[field] != null) return Number(d.o[field]);
      for (const k of Object.keys(d.o)) { const n = Number(d.o[k]); if (Number.isFinite(n)) return n; }
    }
    return NaN;
  };
  await Promise.all(keys.map(async (key) => {
    const ep = ENDPOINTS[key];
    const path = typeof ep === "string" ? ep : ep.path;
    const field = typeof ep === "string" ? null : ep.valueField;
    const url = `${base}${path}?a=BTC&i=${i}&api_key=${encodeURIComponent(apiKey)}`;
    try {
      const res = await fetch(url, { headers: { "accept": "application/json" } });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        errors.push(`${key}: HTTP ${res.status}${txt ? " " + txt.slice(0, 80) : ""}`);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data) && data.length) {
        const series = data
          .map((d) => ({ date: new Date((d.t || 0) * 1000).toISOString().slice(0, 10), value: valueOf(d, field) }))
          .filter((p) => Number.isFinite(p.value));
        if (series.length) {
          history[key] = series.slice(-400);
          metrics[key] = series[series.length - 1].value;
          dates[key] = series[series.length - 1].date;
        } else {
          errors.push(`${key}: response had no finite values`);
        }
      }
    } catch (err) {
      errors.push(`${key}: ${err && err.message ? err.message : err}`);
    }
  }));
  return { source: "Glassnode", configured: true, interval: i, metrics, history, dates, fetchedAt, errors };
}

module.exports = { fetchGlassnodeBtc, ENDPOINTS };
