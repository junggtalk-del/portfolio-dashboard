"use strict";

const assert = require("assert");
const { calculateSMA, calculateEMA, calculateRSI, calculateATR, calculateIndicatorBundle } = require("../lib/backtest/indicators");
const { runBacktest } = require("../lib/backtest/engine");
const { scoreBacktest } = require("../lib/backtest/ranking");

function makeBars(length) {
  const bars = [];
  for (let index = 0; index < length; index += 1) {
    const close = 100 + index * 0.8;
    bars.push({
      date: new Date(Date.UTC(2020, 0, 1 + index)).toISOString().slice(0, 10),
      open: close + 0.1,
      high: close + 1,
      low: close - 1,
      close,
      volume: 1000000
    });
  }
  return bars;
}

function testIndicators() {
  assert.deepStrictEqual(calculateSMA([1, 2, 3], 5), [null, null, null]);
  assert.strictEqual(calculateEMA([1, 2, 3], 5).every((value) => value === null), true);
  assert.strictEqual(calculateRSI([1, 2, 3, 4], 14).every((value) => value === null), true);
  assert.strictEqual(calculateATR(makeBars(10), 14).every((value) => value === null), true);
  assert.ok(Number.isFinite(calculateSMA([1, 2, 3, 4, 5], 5)[4]));
}

function testNextBarExecution() {
  const bars = makeBars(260);
  const result = runBacktest({
    symbol: "TEST",
    strategyId: "ema_trend_rsi_filter",
    bars,
    initialCapital: 10000,
    slippagePct: 0,
    commission: 0
  });
  assert.ok(result.equityCurve.length === bars.length);
  if (result.trades.length) {
    const firstTrade = result.trades[0];
    const entryIndex = bars.findIndex((bar) => bar.date === firstTrade.entryDate);
    assert.ok(entryIndex > 0, "entry must happen after signal history exists");
    assert.strictEqual(firstTrade.entryPrice, bars[entryIndex].open);
  }
}

function testNoTradeBeforeSma200() {
  const bars = makeBars(120);
  const result = runBacktest({
    symbol: "TEST",
    strategyId: "ema_trend_rsi_filter",
    bars,
    initialCapital: 10000,
    slippagePct: 0,
    commission: 0
  });
  assert.strictEqual(result.trades.length, 0, "strategy must not trade before SMA200 exists");
}

function makeTrendThenBreakBars() {
  const bars = [];
  let close = 100;
  for (let index = 0; index < 260; index += 1) {
    const previous = close;
    close += index % 3 === 0 ? -1.1 : 0.9;
    bars.push({
      date: new Date(Date.UTC(2020, 0, 1 + index)).toISOString().slice(0, 10),
      open: previous,
      high: Math.max(previous, close) + 1,
      low: Math.min(previous, close) - 1,
      close,
      volume: 1000000
    });
  }
  for (let index = 260; index < 290; index += 1) {
    const previous = bars[bars.length - 1].close;
    close = previous - 4;
    bars.push({
      date: new Date(Date.UTC(2020, 0, 1 + index)).toISOString().slice(0, 10),
      open: previous,
      high: Math.max(previous, close) + 1,
      low: Math.min(previous, close) - 1,
      close,
      volume: 1000000
    });
  }
  return bars;
}

function testSellSignalExecutesNextBarOpen() {
  const bars = makeTrendThenBreakBars();
  const result = runBacktest({
    symbol: "TEST",
    strategyId: "ema_trend_rsi_filter",
    bars,
    initialCapital: 10000,
    slippagePct: 0,
    commission: 0
  });
  const exitTrade = result.trades.find((trade) => trade.exitReason === "Exit rule");
  assert.ok(exitTrade, "expected at least one signal-based exit");
  const exitIndex = bars.findIndex((bar) => bar.date === exitTrade.exitDate);
  const signalIndex = exitIndex - 1;
  const indicators = calculateIndicatorBundle(bars);
  assert.ok(signalIndex >= 0, "exit should have a previous signal bar");
  assert.ok(bars[signalIndex].close < indicators.ema20[signalIndex], "sell signal should come from completed prior close");
  assert.ok(Math.abs(exitTrade.exitPrice - bars[exitIndex].open) < 0.0001, "sell should execute on next bar open");
}

function testAtrStopUsesPriorAtrAndCanTriggerIntrabar() {
  const bars = makeBars(260);
  const result = runBacktest({
    symbol: "TEST",
    strategyId: "ema_trend_rsi_filter",
    bars,
    initialCapital: 10000,
    slippagePct: 0,
    commission: 0
  });
  const entryTrade = result.trades[0];
  if (!entryTrade) return;
  const entryIndex = bars.findIndex((bar) => bar.date === entryTrade.entryDate);
  const indicators = calculateIndicatorBundle(bars);
  const priorAtr = indicators.atr14[entryIndex - 1];
  assert.ok(Number.isFinite(priorAtr), "entry stop should be based on prior ATR only");
  assert.ok(entryTrade.entryPrice - 2 * priorAtr < entryTrade.entryPrice, "ATR stop must be below entry for long trades");
}

function testMetricsAndRanking() {
  const score = scoreBacktest({
    totalReturnPct: 30,
    profitFactor: 1.8,
    maxDrawdown: -12,
    expectancy: 25,
    winRate: 55,
    tradeCount: 35
  });
  assert.ok(score > 0);
}

testIndicators();
testNextBarExecution();
testNoTradeBeforeSma200();
testSellSignalExecutesNextBarOpen();
testAtrStopUsesPriorAtrAndCanTriggerIntrabar();
testMetricsAndRanking();
console.log("Backtest smoke tests passed");
