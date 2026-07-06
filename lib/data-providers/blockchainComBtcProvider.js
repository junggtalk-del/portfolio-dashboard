"use strict";

// Blockchain.com Charts API (free, no key). Network / miner support metrics.
// https://api.blockchain.info/charts/<chart>?timespan=...&format=json
// Response shape: { unit, values: [{ x: unixSeconds, y: number }] }.
// Used as SUPPORT only — not claimed as exact Puell/SOPR. We DO derive a
// "Miner Revenue Multiple Proxy" = latest miners-revenue / 365-day average.

const BASE = "https://api.blockchain.info/charts/";
// chart -> { key, span }. miners-revenue needs ~1y+ history for the 365d average.
const CHARTS = {
  minersRevenueUsd: { chart: "miners-revenue", span: "2years" },
  hashRate: { chart: "hash-rate", span: "1year" },
  difficulty: { chart: "difficulty", span: "1year" },
  transactionFeesUsd: { chart: "transaction-fees-usd", span: "1year" }
};

async function fetchChart(chart, span) {
  const url = `${BASE}${chart}?timespan=${span}&format=json&cors=true`;
  const res = await fetch(url, { headers: { "accept": "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json();
  const vals = (j && Array.isArray(j.values)) ? j.values : [];
  return vals.map((v) => ({ date: new Date(Number(v.x) * 1000).toISOString().slice(0, 10), value: Number(v.y) })).filter((p) => Number.isFinite(p.value));
}

async function fetchBlockchainComBtc(opts) {
  opts = opts || {};
  const fetchedAt = new Date().toISOString();
  const latest = {}, dates = {}, errors = [];
  let minerSeries = [];

  await Promise.all(Object.keys(CHARTS).map(async (key) => {
    const c = CHARTS[key];
    try {
      const series = await fetchChart(c.chart, c.span);
      if (series.length) {
        const last = series[series.length - 1];
        latest[key] = last.value; dates[key] = last.date;
        if (key === "minersRevenueUsd") minerSeries = series;
      }
    } catch (e) { errors.push(`${key}: ${e.message}`); }
  }));

  // Miner Revenue Multiple Proxy = latest daily miner revenue / 365-day average (Puell-like).
  let minerRevenueMultipleProxy = null, minerRevenueDate = null;
  if (minerSeries.length >= 30) {
    const last = minerSeries[minerSeries.length - 1];
    const window = minerSeries.slice(-365).map((p) => p.value).filter((v) => v > 0);
    if (window.length >= 30) {
      const avg = window.reduce((s, v) => s + v, 0) / window.length;
      if (avg > 0) { minerRevenueMultipleProxy = Math.round((last.value / avg) * 1000) / 1000; minerRevenueDate = last.date; }
    }
  }

  return {
    source: "Blockchain.com",
    latest: Object.assign({}, latest, { minerRevenueMultipleProxy, minerRevenueDate }),
    dates,
    fetchedAt,
    errors
  };
}

module.exports = { fetchBlockchainComBtc, CHARTS };
