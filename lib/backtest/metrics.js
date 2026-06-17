"use strict";

function safeNumber(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function calculateMaxDrawdown(equityCurve) {
  let peak = -Infinity;
  let maxDrawdown = 0;
  const drawdownCurve = [];

  for (const point of equityCurve || []) {
    const equity = safeNumber(point.equity, 0);
    peak = Math.max(peak, equity);
    const drawdown = peak > 0 ? ((equity - peak) / peak) * 100 : 0;
    maxDrawdown = Math.min(maxDrawdown, drawdown);
    drawdownCurve.push({ date: point.date, drawdown });
  }

  return { maxDrawdown, drawdownCurve };
}

function calculateSharpe(equityCurve) {
  if (!Array.isArray(equityCurve) || equityCurve.length < 3) return null;
  const returns = [];
  for (let index = 1; index < equityCurve.length; index += 1) {
    const previous = safeNumber(equityCurve[index - 1]?.equity);
    const current = safeNumber(equityCurve[index]?.equity);
    if (previous > 0) returns.push((current - previous) / previous);
  }
  if (returns.length < 2) return null;
  const average = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + (value - average) ** 2, 0) / (returns.length - 1);
  const std = Math.sqrt(variance);
  if (!std) return null;
  return (average / std) * Math.sqrt(252);
}

function calculateLongestLosingStreak(trades) {
  let longest = 0;
  let current = 0;
  for (const trade of trades || []) {
    if (safeNumber(trade.pnl) < 0) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}

function daysBetween(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.max(0, (end.getTime() - start.getTime()) / 86_400_000);
}

function calculateMetrics({ trades, equityCurve, initialCapital }) {
  const curve = Array.isArray(equityCurve) ? equityCurve : [];
  const closedTrades = (Array.isArray(trades) ? trades : []).filter((trade) => trade.exitDate);
  const finalEquity = curve.length ? safeNumber(curve[curve.length - 1].equity, initialCapital) : initialCapital;
  const netProfit = finalEquity - initialCapital;
  const totalReturnPct = initialCapital > 0 ? (netProfit / initialCapital) * 100 : 0;
  const wins = closedTrades.filter((trade) => safeNumber(trade.pnl) > 0);
  const losses = closedTrades.filter((trade) => safeNumber(trade.pnl) < 0);
  const grossProfit = wins.reduce((sum, trade) => sum + safeNumber(trade.pnl), 0);
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + safeNumber(trade.pnl), 0));
  const winRate = closedTrades.length ? (wins.length / closedTrades.length) * 100 : 0;
  const averageWin = wins.length ? grossProfit / wins.length : 0;
  const averageLoss = losses.length ? grossLoss / losses.length : 0;
  const expectancy =
    closedTrades.length > 0
      ? closedTrades.reduce((sum, trade) => sum + safeNumber(trade.pnl), 0) / closedTrades.length
      : 0;
  const averageHoldingPeriod = closedTrades.length
    ? closedTrades.reduce((sum, trade) => sum + safeNumber(trade.holdingDays), 0) / closedTrades.length
    : 0;
  const firstDate = curve[0]?.date;
  const lastDate = curve[curve.length - 1]?.date;
  const elapsedDays = firstDate && lastDate ? daysBetween(firstDate, lastDate) : 0;
  const cagr = elapsedDays >= 365 && initialCapital > 0 && finalEquity > 0
    ? ((finalEquity / initialCapital) ** (365 / elapsedDays) - 1) * 100
    : null;
  const drawdown = calculateMaxDrawdown(curve);

  return {
    initialCapital: round(initialCapital, 2),
    finalEquity: round(finalEquity, 2),
    netProfit: round(netProfit, 2),
    totalReturnPct: round(totalReturnPct, 2),
    cagr: round(cagr, 2),
    winRate: round(winRate, 2),
    profitFactor: grossLoss > 0 ? round(grossProfit / grossLoss, 2) : wins.length ? null : 0,
    maxDrawdown: round(drawdown.maxDrawdown, 2),
    averageWin: round(averageWin, 2),
    averageLoss: round(averageLoss, 2),
    expectancy: round(expectancy, 2),
    tradeCount: closedTrades.length,
    longestLosingStreak: calculateLongestLosingStreak(closedTrades),
    averageHoldingPeriod: round(averageHoldingPeriod, 1),
    sharpe: round(calculateSharpe(curve), 2),
    drawdownCurve: drawdown.drawdownCurve.map((point) => ({ date: point.date, drawdown: round(point.drawdown, 2) }))
  };
}

module.exports = {
  calculateMetrics,
  calculateMaxDrawdown,
  round
};
