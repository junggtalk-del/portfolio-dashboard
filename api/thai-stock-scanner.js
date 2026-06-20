"use strict";

const { getThaiStockUniverse } = require("../lib/config/thaiStockUniverse.js");
const { fetchMarketHistoryWithServerCache } = require("./price-history").__internals;

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(payload));
}

function round(value, digits = 2) {
  if (!Number.isFinite(Number(value))) return null;
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}

function calculateEMA(values, period) {
  const nums = (Array.isArray(values) ? values : []).map(Number);
  const output = Array(nums.length).fill(null);
  if (nums.length < period || nums.slice(0, period).some((value) => !Number.isFinite(value))) return output;
  let ema = nums.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  output[period - 1] = ema;
  const multiplier = 2 / (period + 1);
  for (let index = period; index < nums.length; index += 1) {
    if (!Number.isFinite(nums[index])) return output;
    ema = (nums[index] - ema) * multiplier + ema;
    output[index] = ema;
  }
  return output;
}

function calculateSMA(values, period) {
  const nums = (Array.isArray(values) ? values : []).map(Number);
  const output = Array(nums.length).fill(null);
  let rolling = 0;
  for (let index = 0; index < nums.length; index += 1) {
    const value = nums[index];
    if (!Number.isFinite(value)) return output;
    rolling += value;
    if (index >= period) rolling -= nums[index - period];
    if (index >= period - 1) output[index] = rolling / period;
  }
  return output;
}

function average(values) {
  const nums = (Array.isArray(values) ? values : []).map(Number).filter(Number.isFinite);
  if (!nums.length) return null;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
}

function classifyVolume(crossoverVolume, averageVolume5D) {
  if (!Number.isFinite(crossoverVolume) || !Number.isFinite(averageVolume5D) || averageVolume5D <= 0) {
    return {
      volumeRatio: null,
      volumeConfirmation: "VOLUME_DATA_NOT_AVAILABLE",
      volumeConfirmationThai: "ไม่มีข้อมูลวอลุ่ม",
      volumeConfirmationMeaning: "Volume data not available"
    };
  }
  const ratio = crossoverVolume / averageVolume5D;
  if (ratio >= 2) {
    return {
      volumeRatio: round(ratio, 2),
      volumeConfirmation: "VERY_STRONG_VOLUME",
      volumeConfirmationThai: "วอลุ่มแรงมาก",
      volumeConfirmationMeaning: "มีแรงซื้อสูงผิดปกติในวันที่ EMA ตัดขึ้น"
    };
  }
  if (ratio >= 1.5) {
    return {
      volumeRatio: round(ratio, 2),
      volumeConfirmation: "STRONG_VOLUME_CONFIRMED",
      volumeConfirmationThai: "วอลุ่ม confirm แรง",
      volumeConfirmationMeaning: "วันที่ตัดขึ้นมี volume มากกว่าค่าเฉลี่ย 5 วันอย่างมีนัยสำคัญ"
    };
  }
  if (ratio >= 1) {
    return {
      volumeRatio: round(ratio, 2),
      volumeConfirmation: "VOLUME_CONFIRMED",
      volumeConfirmationThai: "วอลุ่ม confirm",
      volumeConfirmationMeaning: "วันที่ตัดขึ้นมี volume มากกว่าค่าเฉลี่ย 5 วัน"
    };
  }
  return {
    volumeRatio: round(ratio, 2),
    volumeConfirmation: "VOLUME_NOT_CONFIRMED",
    volumeConfirmationThai: "วอลุ่มยังไม่ confirm",
    volumeConfirmationMeaning: "EMA ตัดขึ้นแล้ว แต่ volume ยังต่ำกว่าค่าเฉลี่ย 5 วัน"
  };
}

function normalizeRowsFromPayload(payload) {
  const dates = Array.isArray(payload?.dates) ? payload.dates : [];
  const closes = Array.isArray(payload?.closes) ? payload.closes : [];
  const volumes = Array.isArray(payload?.volumes) ? payload.volumes : [];
  return dates
    .map((date, index) => ({
      date,
      close: Number(closes[index]),
      volume: Number(volumes[index])
    }))
    .filter((row) => row.date && Number.isFinite(row.close));
}

async function fetchYahooHistoryWithVolume(symbol) {
  const endpoint = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
  endpoint.searchParams.set("interval", "1d");
  endpoint.searchParams.set("range", "2y");
  endpoint.searchParams.set("includePrePost", "false");
  const response = await fetch(endpoint, {
    headers: {
      accept: "application/json",
      "user-agent": "portfolio-dashboard/1.0"
    }
  });
  if (!response.ok) throw new Error(`Yahoo history failed (${response.status})`);
  const payload = await response.json();
  const result = payload.chart?.result?.[0];
  const timestamps = Array.isArray(result?.timestamp) ? result.timestamp : [];
  const quote = result?.indicators?.quote?.[0] || {};
  const closes = Array.isArray(quote.close) ? quote.close : [];
  const volumes = Array.isArray(quote.volume) ? quote.volume : [];
  const rows = [];
  for (let index = 0; index < Math.min(timestamps.length, closes.length); index += 1) {
    const close = Number(closes[index]);
    const unix = Number(timestamps[index]);
    if (!Number.isFinite(close) || !Number.isFinite(unix)) continue;
    rows.push({
      date: new Date(unix * 1000).toISOString().slice(0, 10),
      close,
      volume: Number(volumes[index])
    });
  }
  return {
    source: "Yahoo Finance",
    sourceType: "LIVE_MARKET_DATA",
    rows: rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  };
}

async function fetchThaiStockHistory(stock) {
  try {
    return await fetchYahooHistoryWithVolume(stock.providerSymbol);
  } catch (liveError) {
    const cached = await fetchMarketHistoryWithServerCache(stock.providerSymbol);
    const rows = normalizeRowsFromPayload(cached);
    if (!rows.length) throw liveError;
    return {
      source: cached.source || "Server cached data",
      sourceType: cached.sourceType || "SERVER_CACHED_DATA",
      rows,
      volumeWarning: "Volume data not available from cache"
    };
  }
}

function latestVolumeRatio(rows, latestIndex) {
  const latestVolume = Number(rows[latestIndex]?.volume);
  const avg = average(rows.slice(Math.max(0, latestIndex - 4), latestIndex + 1).map((row) => row.volume));
  return {
    latestVolume: Number.isFinite(latestVolume) ? latestVolume : null,
    latestAverageVolume5D: Number.isFinite(avg) ? avg : null,
    latestVolumeRatio: Number.isFinite(latestVolume) && Number.isFinite(avg) && avg > 0 ? round(latestVolume / avg, 2) : null
  };
}

function scanStock(stock, payload) {
  const rows = Array.isArray(payload?.rows) ? payload.rows : normalizeRowsFromPayload(payload);
  const closes = rows.map((row) => Number(row.close));
  if (closes.length < 26) {
    return {
      type: "insufficient",
      item: {
        ...stock,
        reason: "ต้องมีข้อมูลอย่างน้อย 26 วันทำการเพื่อคำนวณ EMA12/EMA26",
        dataPoints: closes.length,
        source: payload?.source || null
      }
    };
  }

  const dates = rows.map((row) => row.date);
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const sma200 = calculateSMA(closes, 200);
  const latestIndex = closes.length - 1;
  const latestClose = closes[latestIndex];
  const previousClose = closes[latestIndex - 1];
  const latestEma12 = ema12[latestIndex];
  const latestEma26 = ema26[latestIndex];
  const latestSma200 = sma200[latestIndex];
  const latestVolume = latestVolumeRatio(rows, latestIndex);
  const base = {
    ...stock,
    close: round(latestClose),
    latestDate: dates[latestIndex] || null,
    dailyReturnPct: Number.isFinite(previousClose) && previousClose !== 0 ? round((latestClose / previousClose - 1) * 100, 2) : null,
    ema12: round(latestEma12),
    ema26: round(latestEma26),
    sma200: round(latestSma200),
    emaGapPct: Number.isFinite(latestEma12) && Number.isFinite(latestEma26) && latestEma26 !== 0 ? round(((latestEma12 - latestEma26) / latestEma26) * 100, 2) : null,
    distanceToSma200Pct: Number.isFinite(latestSma200) && latestSma200 !== 0 ? round(((latestClose - latestSma200) / latestSma200) * 100, 2) : null,
    sma200Status: Number.isFinite(latestSma200) ? (latestClose > latestSma200 ? "ABOVE_SMA200" : latestClose < latestSma200 ? "BELOW_SMA200" : "AT_SMA200") : "SMA200_NOT_AVAILABLE",
    volume: latestVolume.latestVolume,
    averageVolume5D: latestVolume.latestAverageVolume5D,
    latestVolumeRatio: latestVolume.latestVolumeRatio,
    source: payload?.source || "Yahoo Finance",
    sourceType: payload?.sourceType || "LIVE_MARKET_DATA",
    dataPoints: closes.length
  };

  for (let offset = 0; offset < 3; offset += 1) {
    const index = latestIndex - offset;
    if (index <= 0) break;
    const prev12 = ema12[index - 1];
    const prev26 = ema26[index - 1];
    const curr12 = ema12[index];
    const curr26 = ema26[index];
    if ([prev12, prev26, curr12, curr26].every(Number.isFinite) && prev12 <= prev26 && curr12 > curr26) {
      const crossoverVolume = Number(rows[index]?.volume);
      const averageVolume5D = average(rows.slice(Math.max(0, index - 4), index + 1).map((row) => row.volume));
      const volumeStatus = classifyVolume(crossoverVolume, averageVolume5D);
      return {
        type: "result",
        item: {
          ...base,
          signal: "EMA_BULLISH_CROSS",
          signalThai: "EMA12 ตัดขึ้น EMA26",
          crossoverDate: dates[index] || null,
          daysSinceCrossover: offset + 1,
          crossoverVolume: Number.isFinite(crossoverVolume) ? crossoverVolume : null,
          averageVolume5D: Number.isFinite(averageVolume5D) ? round(averageVolume5D, 0) : null,
          ...volumeStatus,
          action: volumeStatus.volumeRatio >= 1
            ? "เริ่มมีสัญญาณฟื้นตัวพร้อมวอลุ่ม / เฝ้าดูต่อ"
            : "เริ่มมีสัญญาณฟื้นตัว แต่ควรรอวอลุ่ม confirm"
        }
      };
    }
  }

  if (Number.isFinite(latestEma12) && Number.isFinite(latestEma26) && latestEma12 < latestEma26) {
    const gap = Math.abs(latestEma12 - latestEma26) / latestEma26;
    if (gap <= 0.005) {
      const latestVolumeStatus = classifyVolume(base.volume, base.averageVolume5D);
      return {
        type: "near",
        item: {
          ...base,
          signal: "NEAR_EMA_BULLISH_CROSS",
          signalThai: "ใกล้ตัดขึ้น",
          latestVolumeRatio: latestVolumeStatus.volumeRatio,
          volumeConfirmation: latestVolumeStatus.volumeConfirmation,
          volumeConfirmationThai: latestVolumeStatus.volumeRatio >= 1.5 ? "วอลุ่มเริ่มเข้า" : latestVolumeStatus.volumeConfirmationThai,
          volumeConfirmationMeaning: latestVolumeStatus.volumeRatio >= 1.5
            ? "EMA ยังไม่ตัดขึ้น แต่ volume เริ่มสูงกว่าค่าเฉลี่ย"
            : latestVolumeStatus.volumeConfirmationMeaning,
          action: "รอ EMA12 ตัดขึ้น EMA26 เพื่อ confirm"
        }
      };
    }
  }

  return { type: "none", item: base };
}

function parseCustomSymbols(value) {
  return String(value || "")
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    send(res, 405, { error: "Method not allowed." });
    return;
  }
  const universe = String(req.query?.universe || "SET100").toUpperCase();
  const offset = Math.max(0, Number.parseInt(req.query?.offset || "0", 10) || 0);
  const limit = Math.min(20, Math.max(1, Number.parseInt(req.query?.limit || "8", 10) || 8));
  const customSymbols = parseCustomSymbols(req.query?.symbols || req.query?.customSymbols || "");
  const stocks = getThaiStockUniverse(universe, { customSymbols });
  const batch = stocks.slice(offset, offset + limit);
  const scannedByMarket = batch.reduce((counts, stock) => {
    const market = stock.market || "SET";
    counts[market] = (counts[market] || 0) + 1;
    return counts;
  }, {});
  const totalByMarket = stocks.reduce((counts, stock) => {
    const market = stock.market || "SET";
    counts[market] = (counts[market] || 0) + 1;
    return counts;
  }, {});
  const results = [];
  const near = [];
  const insufficient = [];
  const failed = [];

  for (const stock of batch) {
    try {
      const payload = await fetchThaiStockHistory(stock);
      const scanned = scanStock(stock, payload);
      if (scanned.type === "result") results.push(scanned.item);
      else if (scanned.type === "near") near.push(scanned.item);
      else if (scanned.type === "insufficient") insufficient.push(scanned.item);
    } catch (error) {
      failed.push({
        ...stock,
        errorMessage: String(error.message || error)
      });
    }
  }

  send(res, 200, {
    universe,
    total: stocks.length,
    offset,
    limit,
    scanned: batch.length,
    scannedByMarket,
    totalByMarket,
    nextOffset: offset + batch.length < stocks.length ? offset + batch.length : null,
    done: offset + batch.length >= stocks.length,
    generatedAt: new Date().toISOString(),
    results,
    near,
    insufficient,
    failed
  });
};

module.exports.__internals = {
  calculateEMA,
  calculateSMA,
  classifyVolume,
  scanStock,
  fetchYahooHistoryWithVolume
};
