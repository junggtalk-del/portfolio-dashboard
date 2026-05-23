(function () {
  function hasNumber(value) {
    return Number.isFinite(value);
  }

  // Exponential moving average using SMA seed on the first `period` closes.
  function calculateEMA(prices, period) {
    const result = new Array(prices.length).fill(null);
    if (!Array.isArray(prices) || prices.length < period || period <= 0) return result;

    const multiplier = 2 / (period + 1);
    const seed = prices.slice(0, period);
    const seedAverage = seed.reduce((sum, price) => sum + price, 0) / period;
    result[period - 1] = seedAverage;

    for (let index = period; index < prices.length; index += 1) {
      const previous = result[index - 1];
      if (!hasNumber(previous)) continue;
      result[index] = (prices[index] - previous) * multiplier + previous;
    }
    return result;
  }

  // Simple moving average with rolling sum for O(n) performance.
  function calculateSMA(prices, period) {
    const result = new Array(prices.length).fill(null);
    if (!Array.isArray(prices) || prices.length < period || period <= 0) return result;

    let rollingSum = 0;
    for (let index = 0; index < prices.length; index += 1) {
      rollingSum += prices[index];
      if (index >= period) rollingSum -= prices[index - period];
      if (index >= period - 1) result[index] = rollingSum / period;
    }
    return result;
  }

  function detectEmaCrossover(input) {
    const { prices, dates, ema12, ema26 } = input;
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

    let signal = "HOLD";
    let signalDate = null;
    if (previousEma12 <= previousEma26 && latestEma12 > latestEma26) {
      signal = "BUY";
      signalDate = dates[last] || null;
    } else if (previousEma12 >= previousEma26 && latestEma12 < latestEma26) {
      signal = "SELL";
      signalDate = dates[last] || null;
    }

    const trend = latestEma12 > latestEma26 ? "BULLISH" : latestEma12 < latestEma26 ? "BEARISH" : "NEUTRAL";
    return { signal, trend, signalDate };
  }

  function detectCloseSmaCrossover(input) {
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

    let signal = "HOLD";
    let signalDate = null;
    if (previousClose <= previousSma && latestClose > latestSma) {
      signal = "BULLISH_BREAKOUT";
      signalDate = dates[last] || null;
    } else if (previousClose >= previousSma && latestClose < latestSma) {
      signal = "BEARISH_BREAKDOWN";
      signalDate = dates[last] || null;
    }

    const status = latestClose > latestSma ? "ABOVE_SMA200" : latestClose < latestSma ? "BELOW_SMA200" : "AT_SMA200";
    return { signal, status, signalDate };
  }

  function findLastEmaCrossover(prices, dates, ema12, ema26) {
    if (prices.length < 26) return null;
    for (let index = prices.length - 1; index >= 1; index -= 1) {
      const prevEma12 = ema12[index - 1];
      const prevEma26 = ema26[index - 1];
      const currEma12 = ema12[index];
      const currEma26 = ema26[index];
      if (!hasNumber(prevEma12) || !hasNumber(prevEma26) || !hasNumber(currEma12) || !hasNumber(currEma26)) continue;
      if (prevEma12 <= prevEma26 && currEma12 > currEma26) {
        return { signal: "BUY", signalDate: dates[index] || null, barsAgo: prices.length - 1 - index };
      }
      if (prevEma12 >= prevEma26 && currEma12 < currEma26) {
        return { signal: "SELL", signalDate: dates[index] || null, barsAgo: prices.length - 1 - index };
      }
    }
    return null;
  }

  function findLastCloseSmaCrossover(prices, dates, sma200) {
    if (prices.length < 200) return null;
    for (let index = prices.length - 1; index >= 1; index -= 1) {
      const prevClose = prices[index - 1];
      const currClose = prices[index];
      const prevSma = sma200[index - 1];
      const currSma = sma200[index];
      if (!hasNumber(prevClose) || !hasNumber(currClose) || !hasNumber(prevSma) || !hasNumber(currSma)) continue;
      if (prevClose <= prevSma && currClose > currSma) {
        return { signal: "BULLISH_BREAKOUT", signalDate: dates[index] || null, barsAgo: prices.length - 1 - index };
      }
      if (prevClose >= prevSma && currClose < currSma) {
        return { signal: "BEARISH_BREAKDOWN", signalDate: dates[index] || null, barsAgo: prices.length - 1 - index };
      }
    }
    return null;
  }

  function buildEmaStateSeries(ema12, ema26) {
    const states = [];
    for (let index = 0; index < Math.min(ema12.length, ema26.length); index += 1) {
      const fast = ema12[index];
      const slow = ema26[index];
      if (!hasNumber(fast) || !hasNumber(slow)) {
        states.push(null);
        continue;
      }
      if (fast > slow) states.push("BULLISH");
      else if (fast < slow) states.push("BEARISH");
      else states.push("NEUTRAL");
    }
    return states;
  }

  function buildCloseSmaStateSeries(prices, sma200) {
    const states = [];
    for (let index = 0; index < Math.min(prices.length, sma200.length); index += 1) {
      const close = prices[index];
      const average = sma200[index];
      if (!hasNumber(close) || !hasNumber(average)) {
        states.push(null);
        continue;
      }
      if (close > average) states.push("ABOVE_SMA200");
      else if (close < average) states.push("BELOW_SMA200");
      else states.push("AT_SMA200");
    }
    return states;
  }

  function countTrailingStateDays(states, targetState) {
    if (!states.length || !targetState) return 0;
    let count = 0;
    for (let index = states.length - 1; index >= 0; index -= 1) {
      if (states[index] !== targetState) break;
      count += 1;
    }
    return count;
  }

  function normalizeSeries(closes, dates) {
    const cleanCloses = [];
    const cleanDates = [];
    for (let index = 0; index < closes.length; index += 1) {
      const close = closes[index];
      if (!Number.isFinite(close)) continue;
      cleanCloses.push(Number(close));
      cleanDates.push(dates[index] || null);
    }
    return { closes: cleanCloses, dates: cleanDates };
  }

  function calculateTechnicalSignalsForAsset(input) {
    const symbol = input.symbol;
    const normalized = normalizeSeries(input.closes || [], input.dates || []);
    const closes = normalized.closes;
    const dates = normalized.dates;

    const latestClose = closes.length ? closes[closes.length - 1] : null;
    const latestDate = dates.length ? dates[dates.length - 1] : null;

    const ema12Series = calculateEMA(closes, 12);
    const ema26Series = calculateEMA(closes, 26);
    const sma200Series = calculateSMA(closes, 200);

    const ema = detectEmaCrossover({
      prices: closes,
      dates,
      ema12: ema12Series,
      ema26: ema26Series
    });
    const sma200 = detectCloseSmaCrossover({
      prices: closes,
      dates,
      sma200: sma200Series
    });
    const lastEmaCrossover = findLastEmaCrossover(closes, dates, ema12Series, ema26Series);
    const lastSmaCrossover = findLastCloseSmaCrossover(closes, dates, sma200Series);
    const emaStates = buildEmaStateSeries(ema12Series, ema26Series);
    const smaStates = buildCloseSmaStateSeries(closes, sma200Series);
    const emaTrendDays = countTrailingStateDays(emaStates, ema.trend);
    const smaStatusDays = countTrailingStateDays(smaStates, sma200.status);

    return {
      symbol,
      latestClose,
      latestDate,
      ema: {
        ema12: ema12Series.length ? ema12Series[ema12Series.length - 1] : null,
        ema26: ema26Series.length ? ema26Series[ema26Series.length - 1] : null,
        signal: ema.signal,
        trend: ema.trend,
        signalDate: ema.signalDate,
        recentCrossover: lastEmaCrossover,
        consecutiveTrendDays: emaTrendDays
      },
      sma200: {
        sma200: sma200Series.length ? sma200Series[sma200Series.length - 1] : null,
        signal: sma200.signal,
        status: sma200.status,
        signalDate: sma200.signalDate,
        recentCrossover: lastSmaCrossover,
        consecutiveStatusDays: smaStatusDays
      }
    };
  }

  window.AITechnicalIndicators = {
    calculateEMA,
    calculateSMA,
    detectEmaCrossover,
    detectCloseSmaCrossover,
    calculateTechnicalSignalsForAsset
  };
})();
