"use strict";

const { calculateIndicatorBundle } = require("./indicators");
const { evaluateStrategy, getStrategyById } = require("./strategies");
const { calculateMetrics, round } = require("./metrics");
const { scoreBacktest, verdictForMetrics } = require("./ranking");

function sanitizeBars(bars) {
  return (Array.isArray(bars) ? bars : [])
    .map((bar) => ({
      date: String(bar.date || ""),
      open: Number(bar.open),
      high: Number(bar.high),
      low: Number(bar.low),
      close: Number(bar.close),
      volume: Number.isFinite(Number(bar.volume)) ? Number(bar.volume) : 0
    }))
    .filter((bar) => bar.date && [bar.open, bar.high, bar.low, bar.close].every(Number.isFinite))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function filterBarsByDate(bars, startDate, endDate) {
  return sanitizeBars(bars).filter((bar) => {
    if (startDate && bar.date < startDate) return false;
    if (endDate && bar.date > endDate) return false;
    return true;
  });
}

function calculateHoldingDays(entryDate, exitDate) {
  const start = new Date(`${entryDate}T00:00:00Z`);
  const end = new Date(`${exitDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000));
}

function closePosition({ position, price, date, reason, cash, commission }) {
  const proceeds = position.shares * price - commission;
  const pnl = proceeds - position.cost;
  const trade = {
    symbol: position.symbol,
    strategyId: position.strategyId,
    entryDate: position.entryDate,
    entryPrice: round(position.entryPrice, 4),
    exitDate: date,
    exitPrice: round(price, 4),
    shares: round(position.shares, 6),
    pnl: round(pnl, 2),
    pnlPct: round(((price - position.entryPrice) / position.entryPrice) * 100, 2),
    exitReason: reason,
    holdingDays: calculateHoldingDays(position.entryDate, date)
  };
  return { cash: cash + proceeds, trade };
}

function runBacktest({ symbol, strategyId, bars, initialCapital = 10000, slippagePct = 0.1, commission = 0 }) {
  const cleanBars = sanitizeBars(bars);
  const strategy = getStrategyById(strategyId);
  const indicators = calculateIndicatorBundle(cleanBars);
  const slippage = Number(slippagePct) / 100;
  const fixedCommission = Number.isFinite(Number(commission)) ? Number(commission) : 0;
  let cash = Number(initialCapital);
  let position = null;
  let pendingOrder = null;
  const trades = [];
  const equityCurve = [];
  const state = {};

  for (let index = 0; index < cleanBars.length; index += 1) {
    const bar = cleanBars[index];

    if (pendingOrder) {
      if (pendingOrder.type === "buy" && !position) {
        const entryPrice = bar.open * (1 + slippage);
        const allocation = cash * 0.10;
        const shares = allocation > fixedCommission ? (allocation - fixedCommission) / entryPrice : 0;
        if (shares > 0) {
          const atr = indicators.atr14[index - 1];
          const cost = shares * entryPrice + fixedCommission;
          cash -= cost;
          position = {
            symbol,
            strategyId,
            shares,
            entryPrice,
            entryDate: bar.date,
            cost,
            stopPrice: Number.isFinite(atr) ? entryPrice - 2 * atr : null
          };
        }
      }

      if (pendingOrder.type === "sell" && position) {
        const exitPrice = bar.open * (1 - slippage);
        const closed = closePosition({
          position,
          price: exitPrice,
          date: bar.date,
          reason: pendingOrder.reason || "Signal exit",
          cash,
          commission: fixedCommission
        });
        cash = closed.cash;
        trades.push(closed.trade);
        position = null;
      }

      pendingOrder = null;
    }

    if (position && Number.isFinite(position.stopPrice) && bar.low <= position.stopPrice) {
      const exitPrice = position.stopPrice * (1 - slippage);
      const closed = closePosition({
        position,
        price: exitPrice,
        date: bar.date,
        reason: "ATR stop",
        cash,
        commission: fixedCommission
      });
      cash = closed.cash;
      trades.push(closed.trade);
      position = null;
    }

    const markToMarket = cash + (position ? position.shares * bar.close : 0);
    equityCurve.push({ date: bar.date, equity: round(markToMarket, 2) });

    if (index >= cleanBars.length - 1) continue;
    const signal = evaluateStrategy(strategy.id, index, cleanBars, indicators, position, state);
    if (!position && signal.buy) {
      pendingOrder = { type: "buy", reason: signal.reason || "Buy signal" };
    } else if (position && signal.sell) {
      pendingOrder = { type: "sell", reason: signal.reason || "Sell signal" };
    }
  }

  if (position && cleanBars.length) {
    const lastBar = cleanBars[cleanBars.length - 1];
    const closed = closePosition({
      position,
      price: lastBar.close * (1 - slippage),
      date: lastBar.date,
      reason: "End of test",
      cash,
      commission: fixedCommission
    });
    cash = closed.cash;
    trades.push(closed.trade);
    equityCurve[equityCurve.length - 1] = { date: lastBar.date, equity: round(cash, 2) };
  }

  const metrics = calculateMetrics({ trades, equityCurve, initialCapital: Number(initialCapital) });
  const strategyScore = scoreBacktest(metrics);

  return {
    symbol,
    strategyId: strategy.id,
    strategyName: strategy.name,
    barsUsed: cleanBars.length,
    firstDate: cleanBars[0]?.date || null,
    lastDate: cleanBars[cleanBars.length - 1]?.date || null,
    metrics,
    strategyScore,
    verdict: verdictForMetrics(metrics),
    trades,
    equityCurve,
    drawdownCurve: metrics.drawdownCurve
  };
}

function runBacktestForPeriods({ symbol, strategyId, bars, initialCapital, slippagePct, commission, periods }) {
  const cleanBars = sanitizeBars(bars);
  const full = runBacktest({ symbol, strategyId, bars: cleanBars, initialCapital, slippagePct, commission });
  const periodResults = {};
  for (const period of periods || []) {
    const periodBars = filterBarsByDate(cleanBars, period.startDate, period.endDate);
    periodResults[period.key] = runBacktest({
      symbol,
      strategyId,
      bars: periodBars,
      initialCapital,
      slippagePct,
      commission
    });
  }

  const inSample = periodResults.in_sample?.metrics;
  const outSample = periodResults.out_of_sample?.metrics;
  const overfitWarning = Boolean(
    inSample &&
      outSample &&
      (inSample.totalReturnPct || 0) > 20 &&
      ((outSample.totalReturnPct || 0) < 0 || (outSample.profitFactor || 0) < 1)
  );

  return {
    ...full,
    periodResults,
    overfitWarning
  };
}

module.exports = {
  runBacktest,
  runBacktestForPeriods,
  sanitizeBars,
  filterBarsByDate
};
