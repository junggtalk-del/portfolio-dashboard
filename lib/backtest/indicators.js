"use strict";

function numberOrNull(value) {
  return Number.isFinite(value) ? Number(value) : null;
}

function calculateSMA(values, period) {
  const result = Array(values.length).fill(null);
  if (!Array.isArray(values) || period <= 0) return result;
  let sum = 0;
  for (let index = 0; index < values.length; index += 1) {
    const value = Number(values[index]);
    if (!Number.isFinite(value)) {
      sum = 0;
      continue;
    }
    sum += value;
    if (index >= period) {
      const oldValue = Number(values[index - period]);
      if (Number.isFinite(oldValue)) sum -= oldValue;
    }
    if (index >= period - 1) result[index] = sum / period;
  }
  return result;
}

function calculateEMA(values, period) {
  const result = Array(values.length).fill(null);
  if (!Array.isArray(values) || period <= 0 || values.length < period) return result;
  const multiplier = 2 / (period + 1);
  let seedSum = 0;
  let seedCount = 0;
  let previousEma = null;

  for (let index = 0; index < values.length; index += 1) {
    const value = Number(values[index]);
    if (!Number.isFinite(value)) continue;

    if (seedCount < period) {
      seedSum += value;
      seedCount += 1;
      if (seedCount === period) {
        previousEma = seedSum / period;
        result[index] = previousEma;
      }
      continue;
    }

    previousEma = value * multiplier + previousEma * (1 - multiplier);
    result[index] = previousEma;
  }

  return result;
}

function calculateRSI(closes, period = 14) {
  const result = Array(closes.length).fill(null);
  if (!Array.isArray(closes) || closes.length < period + 1) return result;

  let gainSum = 0;
  let lossSum = 0;
  for (let index = 1; index <= period; index += 1) {
    const change = Number(closes[index]) - Number(closes[index - 1]);
    if (!Number.isFinite(change)) return result;
    if (change >= 0) gainSum += change;
    else lossSum += Math.abs(change);
  }

  let averageGain = gainSum / period;
  let averageLoss = lossSum / period;
  result[period] = averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss);

  for (let index = period + 1; index < closes.length; index += 1) {
    const change = Number(closes[index]) - Number(closes[index - 1]);
    if (!Number.isFinite(change)) continue;
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);
    averageGain = (averageGain * (period - 1) + gain) / period;
    averageLoss = (averageLoss * (period - 1) + loss) / period;
    result[index] = averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss);
  }

  return result;
}

function calculateATR(bars, period = 14) {
  const result = Array(bars.length).fill(null);
  if (!Array.isArray(bars) || bars.length < period + 1) return result;
  const trueRanges = Array(bars.length).fill(null);

  for (let index = 1; index < bars.length; index += 1) {
    const high = Number(bars[index]?.high);
    const low = Number(bars[index]?.low);
    const previousClose = Number(bars[index - 1]?.close);
    if (!Number.isFinite(high) || !Number.isFinite(low) || !Number.isFinite(previousClose)) continue;
    trueRanges[index] = Math.max(high - low, Math.abs(high - previousClose), Math.abs(low - previousClose));
  }

  let seedSum = 0;
  let seedCount = 0;
  let previousAtr = null;
  for (let index = 1; index < bars.length; index += 1) {
    const tr = trueRanges[index];
    if (!Number.isFinite(tr)) continue;
    if (seedCount < period) {
      seedSum += tr;
      seedCount += 1;
      if (seedCount === period) {
        previousAtr = seedSum / period;
        result[index] = previousAtr;
      }
      continue;
    }
    previousAtr = (previousAtr * (period - 1) + tr) / period;
    result[index] = previousAtr;
  }

  return result;
}

function calculateMACD(closes, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const fast = calculateEMA(closes, fastPeriod);
  const slow = calculateEMA(closes, slowPeriod);
  const macd = closes.map((_, index) => {
    if (!Number.isFinite(fast[index]) || !Number.isFinite(slow[index])) return null;
    return fast[index] - slow[index];
  });
  const signal = calculateEMA(macd.map((value) => numberOrNull(value)), signalPeriod);
  const histogram = macd.map((value, index) => {
    if (!Number.isFinite(value) || !Number.isFinite(signal[index])) return null;
    return value - signal[index];
  });
  return { macd, signal, histogram };
}

function calculateIndicatorBundle(bars) {
  const closes = bars.map((bar) => Number(bar.close));
  return {
    sma200: calculateSMA(closes, 200),
    ema20: calculateEMA(closes, 20),
    ema50: calculateEMA(closes, 50),
    rsi14: calculateRSI(closes, 14),
    atr14: calculateATR(bars, 14),
    macd: calculateMACD(closes)
  };
}

module.exports = {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateATR,
  calculateMACD,
  calculateIndicatorBundle
};
