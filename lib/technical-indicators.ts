import type {
  AssetTechnicalSignalInput,
  AssetTechnicalSignalResult,
  CloseSmaCrossoverInput,
  CloseSmaCrossoverResult,
  EmaCrossoverInput,
  EmaCrossoverResult
} from "../types/technical";

function hasNumber(value: number | null | undefined): value is number {
  return Number.isFinite(value);
}

export function calculateEMA(prices: number[], period: number): Array<number | null> {
  const result: Array<number | null> = new Array(prices.length).fill(null);
  if (!Array.isArray(prices) || prices.length < period || period <= 0) return result;

  const multiplier = 2 / (period + 1);
  const seed = prices.slice(0, period);
  const seedAverage = seed.reduce((sum, price) => sum + price, 0) / period;
  result[period - 1] = seedAverage;

  for (let index = period; index < prices.length; index += 1) {
    const price = prices[index];
    const previous = result[index - 1];
    if (!hasNumber(previous)) continue;
    result[index] = (price - previous) * multiplier + previous;
  }

  return result;
}

export function calculateSMA(prices: number[], period: number): Array<number | null> {
  const result: Array<number | null> = new Array(prices.length).fill(null);
  if (!Array.isArray(prices) || prices.length < period || period <= 0) return result;

  let rollingSum = 0;
  for (let index = 0; index < prices.length; index += 1) {
    rollingSum += prices[index];
    if (index >= period) rollingSum -= prices[index - period];
    if (index >= period - 1) result[index] = rollingSum / period;
  }
  return result;
}

export function detectEmaCrossover(input: EmaCrossoverInput): EmaCrossoverResult {
  const { dates, ema12, ema26, prices } = input;
  if (prices.length < 26 || ema12.length < 2 || ema26.length < 2) {
    return { signal: "INSUFFICIENT_DATA", trend: "UNKNOWN", signalDate: null };
  }

  const last = prices.length - 1;
  const prev = last - 1;
  const previousEma12 = ema12[prev];
  const previousEma26 = ema26[prev];
  const latestEma12 = ema12[last];
  const latestEma26 = ema26[last];

  if (!hasNumber(previousEma12) || !hasNumber(previousEma26) || !hasNumber(latestEma12) || !hasNumber(latestEma26)) {
    return { signal: "INSUFFICIENT_DATA", trend: "UNKNOWN", signalDate: null };
  }

  let signal: EmaCrossoverResult["signal"] = "HOLD";
  let signalDate: string | null = null;
  if (previousEma12 <= previousEma26 && latestEma12 > latestEma26) {
    signal = "BUY";
    signalDate = dates[last] || null;
  } else if (previousEma12 >= previousEma26 && latestEma12 < latestEma26) {
    signal = "SELL";
    signalDate = dates[last] || null;
  }

  const trend =
    latestEma12 > latestEma26 ? "BULLISH" : latestEma12 < latestEma26 ? "BEARISH" : "NEUTRAL";
  return { signal, trend, signalDate };
}

export function detectCloseSmaCrossover(input: CloseSmaCrossoverInput): CloseSmaCrossoverResult {
  const { prices, dates, sma200 } = input;
  if (prices.length < 200 || sma200.length < 2) {
    return { signal: "INSUFFICIENT_DATA", status: "UNKNOWN", signalDate: null };
  }

  const last = prices.length - 1;
  const prev = last - 1;
  const previousClose = prices[prev];
  const latestClose = prices[last];
  const previousSma = sma200[prev];
  const latestSma = sma200[last];

  if (!hasNumber(previousClose) || !hasNumber(latestClose) || !hasNumber(previousSma) || !hasNumber(latestSma)) {
    return { signal: "INSUFFICIENT_DATA", status: "UNKNOWN", signalDate: null };
  }

  let signal: CloseSmaCrossoverResult["signal"] = "HOLD";
  let signalDate: string | null = null;
  if (previousClose <= previousSma && latestClose > latestSma) {
    signal = "BULLISH_BREAKOUT";
    signalDate = dates[last] || null;
  } else if (previousClose >= previousSma && latestClose < latestSma) {
    signal = "BEARISH_BREAKDOWN";
    signalDate = dates[last] || null;
  }

  const status =
    latestClose > latestSma ? "ABOVE_SMA200" : latestClose < latestSma ? "BELOW_SMA200" : "AT_SMA200";
  return { signal, status, signalDate };
}

function findLastEmaCrossover(
  prices: number[],
  dates: string[],
  ema12: Array<number | null>,
  ema26: Array<number | null>
) {
  if (prices.length < 26) return null;
  for (let index = prices.length - 1; index >= 1; index -= 1) {
    const prevEma12 = ema12[index - 1];
    const prevEma26 = ema26[index - 1];
    const currEma12 = ema12[index];
    const currEma26 = ema26[index];
    if (!hasNumber(prevEma12) || !hasNumber(prevEma26) || !hasNumber(currEma12) || !hasNumber(currEma26)) continue;
    if (prevEma12 <= prevEma26 && currEma12 > currEma26) {
      return { signal: "BUY" as const, signalDate: dates[index] || null, barsAgo: prices.length - 1 - index };
    }
    if (prevEma12 >= prevEma26 && currEma12 < currEma26) {
      return { signal: "SELL" as const, signalDate: dates[index] || null, barsAgo: prices.length - 1 - index };
    }
  }
  return null;
}

function findLastCloseSmaCrossover(prices: number[], dates: string[], sma200: Array<number | null>) {
  if (prices.length < 200) return null;
  for (let index = prices.length - 1; index >= 1; index -= 1) {
    const prevClose = prices[index - 1];
    const currClose = prices[index];
    const prevSma = sma200[index - 1];
    const currSma = sma200[index];
    if (!hasNumber(prevClose) || !hasNumber(currClose) || !hasNumber(prevSma) || !hasNumber(currSma)) continue;
    if (prevClose <= prevSma && currClose > currSma) {
      return {
        signal: "BULLISH_BREAKOUT" as const,
        signalDate: dates[index] || null,
        barsAgo: prices.length - 1 - index
      };
    }
    if (prevClose >= prevSma && currClose < currSma) {
      return {
        signal: "BEARISH_BREAKDOWN" as const,
        signalDate: dates[index] || null,
        barsAgo: prices.length - 1 - index
      };
    }
  }
  return null;
}

export function calculateTechnicalSignalsForAsset(
  input: AssetTechnicalSignalInput
): AssetTechnicalSignalResult {
  const symbol = input.symbol;
  const closes: number[] = [];
  const dates: string[] = [];
  const rawCloses = Array.isArray(input.closes) ? input.closes : [];
  const rawDates = Array.isArray(input.dates) ? input.dates : [];
  for (let index = 0; index < rawCloses.length; index += 1) {
    const close = rawCloses[index];
    if (!Number.isFinite(close)) continue;
    closes.push(close);
    dates.push(rawDates[index] || "");
  }

  const latestClose = closes.length ? closes[closes.length - 1] : null;
  const latestDate = dates.length ? dates[dates.length - 1] : null;

  const ema12Series = calculateEMA(closes, 12);
  const ema26Series = calculateEMA(closes, 26);
  const sma200Series = calculateSMA(closes, 200);
  const emaResult = detectEmaCrossover({ prices: closes, dates, ema12: ema12Series, ema26: ema26Series });
  const smaResult = detectCloseSmaCrossover({ prices: closes, dates, sma200: sma200Series });
  const recentEmaCrossover = findLastEmaCrossover(closes, dates, ema12Series, ema26Series);
  const recentSmaCrossover = findLastCloseSmaCrossover(closes, dates, sma200Series);

  return {
    symbol,
    latestClose,
    latestDate,
    ema: {
      ema12: ema12Series.length ? ema12Series[ema12Series.length - 1] : null,
      ema26: ema26Series.length ? ema26Series[ema26Series.length - 1] : null,
      signal: emaResult.signal,
      trend: emaResult.trend,
      signalDate: emaResult.signalDate,
      recentCrossover: recentEmaCrossover
    },
    sma200: {
      sma200: sma200Series.length ? sma200Series[sma200Series.length - 1] : null,
      signal: smaResult.signal,
      status: smaResult.status,
      signalDate: smaResult.signalDate,
      recentCrossover: recentSmaCrossover
    }
  };
}
