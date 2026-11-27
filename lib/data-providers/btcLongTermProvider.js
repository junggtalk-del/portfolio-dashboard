"use strict";

// Long-term on-chain data pulled by OUR SERVER (2026-11-27) — for the Bitcoin Monitor's Long-term Signal.
// Some networks reset every connection to crypto sites (Coin Metrics · Blockchain.com · CoinGecko · Binance), so a
// browser there cannot pull them; it can always reach our own domain. api/bitcoin.js serves these two through
// ?lt=history and ?lt=bgeo&m=<key>, and the CDN caches the answers (free tier, no key, no new function).
//
// The parsing and derivation are the browser's own (public/btc-lt-history.js · public/btc-onchain-live.js), so a
// number is the same whichever way it arrived.

const H = require("../../public/btc-lt-history.js");
const L = require("../../public/btc-onchain-live.js");

const TIMEOUT_MS = 25000;
const CM_HOST = "https://community-api.coinmetrics.io/";
const CM_MAX_PAGES = 10;
const BGEO_BASE = "https://bitcoin-data.com/v1/";
const BGEO_DAYS = 1461;     // the free tier serves ~4 years (same window as the browser)

function errText(e) { return String(e && e.message ? e.message : e); }
function ymd(ms) { return new Date(ms).toISOString().slice(0, 10); }
// 6 significant digits — the series stay exact enough for every score and the payload shrinks by half
function sig6(rows) { return rows.map((r) => [r[0], Number(r[1].toPrecision(6))]); }
function newest(rows) { return rows.length ? rows[rows.length - 1][0] : null; }

async function getJson(url) {
  const ctl = typeof AbortController === "function" ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), TIMEOUT_MS) : null;
  try {
    const res = await fetch(url, { headers: { accept: "application/json" }, signal: ctl ? ctl.signal : undefined });
    if (!res || !res.ok) { const e = new Error("HTTP " + (res ? res.status : "?")); e.status = res ? res.status : 0; throw e; }
    return await res.json();
  } finally { if (timer) clearTimeout(timer); }
}

async function coinMetrics() {
  try {
    let rows = [], url = H.CM_URL;
    for (let page = 1; ; page++) {
      const json = await getJson(url);
      if (!json || !Array.isArray(json.data)) throw new Error("unexpected response");
      rows = rows.concat(json.data);
      const next = json.next_page_url;
      if (next == null || next === "") break;
      // more rows on another page — follow it on Coin Metrics only, a few pages at most
      if (typeof next !== "string" || next.indexOf(CM_HOST) !== 0 || page >= CM_MAX_PAGES) throw new Error("incomplete (more pages)");
      url = next;
    }
    const d = H.deriveCm(H.parseCoinMetrics({ data: rows }));
    if (!d.price.length || !d.mvrv.length || !d.realizedPrice.length || !d.mvrvZ.length) return { ok: false, error: "no usable rows" };
    return { ok: true, asOf: newest(d.price), series: { price: sig6(d.price), mvrv: sig6(d.mvrv), realizedPrice: sig6(d.realizedPrice), mvrvZ: sig6(d.mvrvZ) } };
  } catch (e) { return { ok: false, error: errText(e) }; }
}

async function blockchain() {
  try {
    const js = await Promise.all([getJson(H.BC_URL(H.CHARTS.revenue)), getJson(H.BC_URL(H.CHARTS.fees))]);
    const p = H.puell(H.parseBlockchain(js[0]), H.parseBlockchain(js[1]));
    return p.length ? { ok: true, asOf: newest(p), series: { puell: sig6(p) } } : { ok: false, error: "no usable rows" };
  } catch (e) { return { ok: false, error: errText(e) }; }
}

// { at, coinMetrics: { ok, error?, asOf?, series? }, blockchain: { … } } — each source independent
async function fetchLongTermHistory() {
  const [cm, bc] = await Promise.all([coinMetrics(), blockchain()]);
  return { at: new Date().toISOString(), coinMetrics: cm, blockchain: bc };
}

// one BGeometrics metric: { ok: true, key, value, date, series } · { ok: false, status, error }
async function fetchBgeoMetric(key) {
  const cfg = Object.prototype.hasOwnProperty.call(L.METRICS, key) ? L.METRICS[key] : null;
  if (!cfg) return { ok: false, status: 400, error: "unknown metric" };
  const start = ymd(Date.now() - BGEO_DAYS * 86400000);
  const lists = [];
  for (const part of cfg.parts) {
    try {
      const json = await getJson(BGEO_BASE + part.ep + "?startday=" + start + "&size=2000");
      const rows = L.parseSeries(json, part.pick);
      if (!rows.length) return { ok: false, status: 502, error: "no rows from " + part.ep };
      lists.push(rows);
    } catch (e) {
      return { ok: false, status: e && e.status === 429 ? 503 : 502, error: (e && e.status === 429 ? "rate-limited (HTTP 429)" : errText(e)) };
    }
  }
  const series = L.keepPlausible(L.sumByDate(lists), key);
  if (!series.length) return { ok: false, status: 502, error: "no plausible rows" };
  const last = series[series.length - 1];
  return { ok: true, key, value: last[1], date: last[0], series };
}

module.exports = { fetchLongTermHistory, fetchBgeoMetric };
