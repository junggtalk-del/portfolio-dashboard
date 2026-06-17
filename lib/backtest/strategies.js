"use strict";

const STRATEGIES = [
  {
    id: "ema_trend_rsi_filter",
    name: "EMA Trend + RSI Filter",
    thaiName: "EMA Trend + RSI Filter",
    description: "close > SMA200, EMA20 > EMA50, RSI 45-65 พร้อม ATR stop"
  },
  {
    id: "rsi_pullback_recovery",
    name: "RSI Pullback Recovery",
    thaiName: "RSI Pullback Recovery",
    description: "รอ RSI เข้า 31-35 แล้วซื้อเมื่อกลับขึ้นเหนือ 35 และราคาเหนือ SMA200"
  }
];

function isFiniteValue(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
}

function getStrategyById(strategyId) {
  return STRATEGIES.find((strategy) => strategy.id === strategyId) || STRATEGIES[0];
}

function evaluateEmaTrendRsiFilter(index, bars, indicators, position) {
  const close = Number(bars[index]?.close);
  const sma200 = indicators.sma200[index];
  const ema20 = indicators.ema20[index];
  const ema50 = indicators.ema50[index];
  const rsi = indicators.rsi14[index];

  const hasAll = [close, sma200, ema20, ema50, rsi].every(isFiniteValue);
  const buy = hasAll && close > sma200 && ema20 > ema50 && rsi >= 45 && rsi <= 65;
  const sell =
    Boolean(position) &&
    isFiniteValue(close) &&
    ((isFiniteValue(ema20) && close < ema20) || (isFiniteValue(rsi) && rsi > 75));

  return {
    buy,
    sell,
    reason: sell ? "Exit rule" : buy ? "Trend confirmation" : ""
  };
}

function evaluateRsiPullbackRecovery(index, bars, indicators, position, state) {
  const close = Number(bars[index]?.close);
  const previousRsi = indicators.rsi14[index - 1];
  const rsi = indicators.rsi14[index];
  const sma200 = indicators.sma200[index];
  const ema20 = indicators.ema20[index];

  if (isFiniteValue(rsi) && rsi >= 31 && rsi <= 35) {
    state.rsiPullbackArmed = true;
  }

  const crossedBackAbove35 = isFiniteValue(previousRsi) && isFiniteValue(rsi) && previousRsi <= 35 && rsi > 35;
  const buy =
    Boolean(state.rsiPullbackArmed) &&
    crossedBackAbove35 &&
    isFiniteValue(close) &&
    isFiniteValue(sma200) &&
    close > sma200;

  if (buy) state.rsiPullbackArmed = false;

  const sell =
    Boolean(position) &&
    isFiniteValue(close) &&
    ((isFiniteValue(rsi) && rsi >= 67 && rsi <= 70) || (isFiniteValue(ema20) && close < ema20));

  return {
    buy,
    sell,
    reason: sell ? "RSI/EMA exit" : buy ? "RSI recovery" : ""
  };
}

function evaluateStrategy(strategyId, index, bars, indicators, position, state) {
  if (strategyId === "rsi_pullback_recovery") {
    return evaluateRsiPullbackRecovery(index, bars, indicators, position, state);
  }
  return evaluateEmaTrendRsiFilter(index, bars, indicators, position);
}

module.exports = {
  STRATEGIES,
  getStrategyById,
  evaluateStrategy
};
