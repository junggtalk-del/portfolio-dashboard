"use strict";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function scoreBacktest(metrics) {
  const netProfitScore = clamp(((metrics.totalReturnPct || 0) + 50) / 150, 0, 1) * 100;
  const profitFactorValue = Number.isFinite(metrics.profitFactor) ? metrics.profitFactor : metrics.profitFactor === null ? 3 : 0;
  const profitFactorScore = clamp(profitFactorValue / 3, 0, 1) * 100;
  const drawdownScore = clamp(1 - Math.abs(metrics.maxDrawdown || 0) / 50, 0, 1) * 100;
  const expectancyScore = clamp(((metrics.expectancy || 0) + 100) / 300, 0, 1) * 100;
  const winRateScore = clamp((metrics.winRate || 0) / 100, 0, 1) * 100;
  const tradeCountScore = clamp((metrics.tradeCount || 0) / 40, 0, 1) * 100;

  return Math.round(
    netProfitScore * 0.25 +
      profitFactorScore * 0.20 +
      drawdownScore * 0.20 +
      expectancyScore * 0.15 +
      winRateScore * 0.10 +
      tradeCountScore * 0.10
  );
}

function verdictForMetrics(metrics) {
  const profitFactor = Number.isFinite(metrics.profitFactor) ? metrics.profitFactor : metrics.profitFactor === null ? 999 : 0;
  if (profitFactor > 1.6 && Math.abs(metrics.maxDrawdown || 0) < 20 && metrics.tradeCount >= 30 && metrics.expectancy > 0) {
    return "น่าสนใจมาก";
  }
  if (profitFactor > 1.3 && Math.abs(metrics.maxDrawdown || 0) < 25 && metrics.tradeCount >= 20 && metrics.expectancy > 0) {
    return "พอใช้ / ควรทดสอบต่อ";
  }
  return "ยังไม่น่าสนใจ";
}

function rankResults(results) {
  return [...(results || [])]
    .map((result) => ({
      ...result,
      strategyScore: scoreBacktest(result.metrics || {}),
      verdict: verdictForMetrics(result.metrics || {})
    }))
    .sort((a, b) => b.strategyScore - a.strategyScore);
}

module.exports = {
  scoreBacktest,
  verdictForMetrics,
  rankResults
};
