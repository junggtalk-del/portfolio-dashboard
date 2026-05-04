(function () {
  const WARNING_TEXT = "Strong asset, but price may already reflect excessive optimism.";

  function clampScore(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.min(Math.max(number, 0), 10);
  }

  function average(values) {
    const clean = values.map(clampScore);
    if (!clean.length) return 0;
    return clean.reduce((total, value) => total + value, 0) / clean.length;
  }

  function calculateHypeRisk(asset) {
    const signals = asset.mock_signals || {};
    const signalScore = average([
      signals.price_vs_moving_averages,
      signals.valuation_vs_historical_average,
      signals.rsi,
      signals.sentiment,
      signals.outperformance_vs_benchmark
    ]);
    const baseRisk = clampScore(asset.hype_risk_score);
    return Math.round((baseRisk * 0.55 + signalScore * 0.45) * 10) / 10;
  }

  function calculateFinalScore(asset) {
    const quality = clampScore(asset.quality_score);
    const momentum = clampScore(asset.momentum_score);
    const hype = calculateHypeRisk(asset);
    const valuation = clampScore(asset.valuation_risk_score);
    return Math.round((quality + momentum - hype - valuation) * 10) / 10;
  }

  function determineInitialAction(asset) {
    const quality = clampScore(asset.quality_score);
    const hype = calculateHypeRisk(asset);
    const valuation = clampScore(asset.valuation_risk_score);
    const finalScore = calculateFinalScore(asset);

    if (hype >= 8 || (quality >= 8 && hype >= 7)) return "Wait for pullback";
    if (quality >= 8 && valuation <= 5 && hype <= 6) return "Accumulate";
    if (quality <= 6 && (hype >= 7 || valuation >= 8)) return "Reduce";
    if (finalScore >= 2 && quality >= 7 && hype <= 6) return "Accumulate";
    return "Hold";
  }

  function enrichAsset(asset) {
    const hypeRisk = calculateHypeRisk(asset);
    const finalScore = calculateFinalScore(asset);
    const action = determineInitialAction(asset);
    return {
      ...asset,
      hype_risk_score: hypeRisk,
      final_score: finalScore,
      initial_action: action,
      warning: hypeRisk >= 8 ? WARNING_TEXT : ""
    };
  }

  window.AIBoomScoring = {
    WARNING_TEXT,
    calculateHypeRisk,
    calculateFinalScore,
    determineInitialAction,
    enrichAsset
  };
})();
