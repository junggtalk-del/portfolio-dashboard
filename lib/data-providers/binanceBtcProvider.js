"use strict";

// Binance BTC price/technical provider (public API — no key required).
// Source priority #1 for: price, OHLCV, volume, EMA12/26, SMA200, RSI14, Volume Ratio 5D.

function ema(values, period) {
  if (!Array.isArray(values) || values.length < period) return null;
  let e = values.slice(0, period).reduce((s, v) => s + v, 0) / period;
  const k = 2 / (period + 1);
  for (let i = period; i < values.length; i += 1) {
    if (!Number.isFinite(values[i])) return null;
    e = (values[i] - e) * k + e;
  }
  return e;
}
function sma(values, period) {
  if (!Array.isArray(values) || values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((s, v) => s + v, 0) / period;
}
function rsi(values, period) {
  period = period || 14;
  if (!Array.isArray(values) || values.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = values.length - period; i < values.length; i += 1) {
    const c = values[i] - values[i - 1];
    if (!Number.isFinite(c)) return null;
    if (c >= 0) gains += c; else losses += Math.abs(c);
  }
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + (gains / period) / avgLoss);
}

// Fetch BTCUSDT daily klines and compute the technical set.
async function fetchBinanceBtc(opts) {
  opts = opts || {};
  const interval = opts.interval || "1d";
  const limit = Math.min(Math.max(opts.limit || 1000, 365), 1000);
  const url = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${encodeURIComponent(interval)}&limit=${limit}`;
  let raw;
  try {
    const res = await fetch(url, { headers: { "accept": "application/json" } });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      // Binance may geo-block (451) — try the .us host as a courtesy fallback.
      if (res.status === 451 || res.status === 403) return await fetchBinanceUsFallback(interval, limit);
      throw new Error(`Binance ${res.status} ${txt.slice(0, 120)}`);
    }
    raw = await res.json();
  } catch (err) {
    throw new Error(`Binance fetch failed: ${err && err.message ? err.message : err}`);
  }
  if (!Array.isArray(raw) || !raw.length) throw new Error("Binance returned no klines");
  return shapeKlines(raw, interval);
}

async function fetchBinanceUsFallback(interval, limit) {
  const url = `https://api.binance.us/api/v3/klines?symbol=BTCUSDT&interval=${encodeURIComponent(interval)}&limit=${limit}`;
  const res = await fetch(url, { headers: { "accept": "application/json" } });
  if (!res.ok) throw new Error(`Binance.us ${res.status}`);
  const raw = await res.json();
  if (!Array.isArray(raw) || !raw.length) throw new Error("Binance.us returned no klines");
  return shapeKlines(raw, interval);
}

function shapeKlines(raw, interval) {
  // Binance kline: [openTime, open, high, low, close, volume, closeTime, ...]
  const ohlcv = raw.map((k) => ({
    date: new Date(k[0]).toISOString().slice(0, 10),
    open: Number(k[1]), high: Number(k[2]), low: Number(k[3]), close: Number(k[4]), volume: Number(k[5])
  })).filter((o) => Number.isFinite(o.close));
  const dates = ohlcv.map((o) => o.date);
  const closes = ohlcv.map((o) => o.close);
  const volumes = ohlcv.map((o) => o.volume);
  const latest = ohlcv[ohlcv.length - 1] || {};
  // The last daily candle is the in-progress current UTC day (partial volume),
  // which would skew the ratio — exclude it so Volume Ratio 5D compares the last
  // COMPLETE day vs the average of the 5 sessions before it.
  const todayUtc = new Date().toISOString().slice(0, 10);
  const lastPartial = interval === "1d" && ohlcv.length > 0 && latest.date === todayUtc;
  // The in-progress current UTC candle has partial OHLCV. Exclude it from EVERY
  // derived technical (EMA/SMA/RSI/Volume) so they all describe the last COMPLETE
  // day on the same basis — otherwise volume would use yesterday while RSI/EMA
  // used an unfinished candle. latestPrice still reflects the live (partial) close.
  const closeSeries = lastPartial ? closes.slice(0, -1) : closes;
  const volSeries = lastPartial ? volumes.slice(0, -1) : volumes;
  const completeBar = ohlcv[ohlcv.length - (lastPartial ? 2 : 1)] || latest;
  let averageVolume5D = null, volumeRatio5D = null;
  if (volSeries.length >= 6) {
    const prior = volSeries.slice(-6, -1).filter((v) => Number.isFinite(v) && v > 0);
    if (prior.length) {
      averageVolume5D = prior.reduce((s, v) => s + v, 0) / prior.length;
      const latestVol = volSeries[volSeries.length - 1];
      if (averageVolume5D > 0 && Number.isFinite(latestVol)) volumeRatio5D = Math.round((latestVol / averageVolume5D) * 100) / 100;
    }
  }
  return {
    source: "Binance",
    symbol: "BTCUSDT",
    interval,
    latestPrice: latest.close != null ? latest.close : null,
    latestDate: latest.date || null,
    completeDate: completeBar.date || null,           // last COMPLETE day (technical basis)
    latestCompleteVolume: volSeries.length ? volSeries[volSeries.length - 1] : null,
    ohlcv,
    dates, closes, volumes,
    ema12: ema(closeSeries, 12),
    ema26: ema(closeSeries, 26),
    sma200: sma(closeSeries, 200),
    rsi14: rsi(closeSeries, 14),
    averageVolume5D,
    volumeRatio5D,
    fetchedAt: new Date().toISOString()
  };
}

// ---- Binance USDⓈ-M Futures: free derivatives / market-stress data ----
// All endpoints are public (no key). Each is best-effort and isolated so one
// failure never breaks the others (or the spot data). NOTE: fapi.binance.com may
// geo-block some regions (e.g. US) with 451 — those simply surface as errors and
// the dependent cards fall back to "missing".
async function getJson(url) {
  const res = await fetch(url, { headers: { "accept": "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchBinanceFutures(opts) {
  opts = opts || {};
  const FAPI = "https://fapi.binance.com";
  const sym = "BTCUSDT";
  const fetchedAt = new Date().toISOString();
  const errors = [];
  const out = {
    source: "Binance Futures", fundingRate: null, fundingDate: null,
    openInterest: null, openInterestBtc: null, openInterestDate: null, openInterestChange7d: null,
    takerBuySellRatio: null, takerDate: null, longShortRatio: null, lsrDate: null,
    openInterestHistory: [], fetchedAt, errors
  };
  const day = (ms) => new Date(ms).toISOString().slice(0, 10);

  const tasks = [
    // current funding rate (fraction per 8h -> percent per 8h)
    getJson(`${FAPI}/fapi/v1/premiumIndex?symbol=${sym}`).then((j) => {
      const f = Number(j && j.lastFundingRate);
      // lastFundingRate is the most-recently-SETTLED rate; stamp it "now" (when observed),
      // not nextFundingTime which is a FUTURE boundary (would show tomorrow's date).
      if (Number.isFinite(f)) { out.fundingRate = Math.round(f * 100 * 1e6) / 1e6; out.fundingDate = day(Date.now()); }
    }).catch((e) => errors.push(`funding: ${e.message}`)),
    // open interest history (daily, USD value) + 7d change
    getJson(`${FAPI}/futures/data/openInterestHist?symbol=${sym}&period=1d&limit=30`).then((rows) => {
      if (Array.isArray(rows) && rows.length) {
        const series = rows.map((r) => ({ date: day(Number(r.timestamp)), usd: Number(r.sumOpenInterestValue), btc: Number(r.sumOpenInterest) })).filter((x) => Number.isFinite(x.usd));
        if (series.length) {
          const last = series[series.length - 1];
          out.openInterest = last.usd; out.openInterestBtc = last.btc; out.openInterestDate = last.date;
          out.openInterestHistory = series.slice(-30);
          const prior = series[series.length - 8];
          if (prior && prior.usd > 0) out.openInterestChange7d = Math.round(((last.usd - prior.usd) / prior.usd) * 1000) / 10; // %
        }
      }
    }).catch((e) => errors.push(`openInterest: ${e.message}`)),
    // taker buy/sell volume ratio (daily)
    getJson(`${FAPI}/futures/data/takerlongshortRatio?symbol=${sym}&period=1d&limit=7`).then((rows) => {
      if (Array.isArray(rows) && rows.length) { const last = rows[rows.length - 1]; const r = Number(last.buySellRatio); if (Number.isFinite(r)) { out.takerBuySellRatio = r; out.takerDate = day(Number(last.timestamp)); } }
    }).catch((e) => errors.push(`taker: ${e.message}`)),
    // global long/short account ratio (daily)
    getJson(`${FAPI}/futures/data/globalLongShortAccountRatio?symbol=${sym}&period=1d&limit=7`).then((rows) => {
      if (Array.isArray(rows) && rows.length) { const last = rows[rows.length - 1]; const r = Number(last.longShortRatio); if (Number.isFinite(r)) { out.longShortRatio = r; out.lsrDate = day(Number(last.timestamp)); } }
    }).catch((e) => errors.push(`longShort: ${e.message}`))
  ];
  await Promise.all(tasks);
  return out;
}

module.exports = { fetchBinanceBtc, fetchBinanceFutures, ema, sma, rsi };
