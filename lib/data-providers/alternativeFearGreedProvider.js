"use strict";

// Alternative.me Crypto Fear & Greed Index (free, no key). Sentiment indicator.
// https://api.alternative.me/fng/?limit=N&format=json
//   -> { data: [{ value: "13", value_classification: "Extreme Fear", timestamp: "<unixSeconds>" }] }
// data[0] is the most recent.

const URL = "https://api.alternative.me/fng/?limit=30&format=json";

async function fetchFearGreed(opts) {
  opts = opts || {};
  const fetchedAt = new Date().toISOString();
  try {
    const res = await fetch(URL, { headers: { "accept": "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = await res.json();
    const data = (j && Array.isArray(j.data)) ? j.data : [];
    if (!data.length) throw new Error("empty response");
    const top = data[0];
    const value = Number(top.value);
    const date = top.timestamp ? new Date(Number(top.timestamp) * 1000).toISOString().slice(0, 10) : null;
    const history = data.map((d) => ({ date: d.timestamp ? new Date(Number(d.timestamp) * 1000).toISOString().slice(0, 10) : null, value: Number(d.value) })).filter((p) => Number.isFinite(p.value));
    if (!Number.isFinite(value)) throw new Error("non-numeric value");
    return { source: "Alternative.me", value, label: top.value_classification || null, date, history, fetchedAt, errors: [] };
  } catch (e) {
    return { source: "Alternative.me", value: null, label: null, date: null, history: [], fetchedAt, errors: [String(e && e.message ? e.message : e)] };
  }
}

module.exports = { fetchFearGreed };
