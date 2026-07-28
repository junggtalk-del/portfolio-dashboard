"use strict";

// Smoke tests for the Adaptive Position engine (public/adaptive-position-engine.js).
// Run: node scripts/adaptive-position-smoke-test.js

const AP = require("../public/adaptive-position-engine");

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed += 1; console.log(`  PASS  ${name}`); }
  else { failed += 1; console.log(`  FAIL  ${name}${detail !== undefined ? "  (" + JSON.stringify(detail) + ")" : ""}`); }
}

// ---------------------------------------------------------------- fixtures
const LKEYS = ["model", "cloud", "gpu", "networking", "memory", "foundry", "equipment", "power", "utility", "enterprise"];
function mkR(momentum, overrides = {}) {
  return {
    available: true,
    layers: LKEYS.map((k) => ({ key: k, name: k.toUpperCase(), momentum: overrides[k] != null ? overrides[k] : momentum, companies: [] })),
    phase: { current: { key: "inference", name: "Inference Expansion" }, next: { key: "power", name: "Power Expansion" }, confidence: overrides.conf != null ? overrides.conf : 70, evidenceMet: overrides.ev != null ? overrides.ev : 66 },
    timeline: [
      { key: "model", status: "past" }, { key: "gpu", status: "past" },
      { key: "inference", status: overrides.phaseIdx == null || overrides.phaseIdx === 2 ? "current" : "past" },
      { key: "power", status: overrides.phaseIdx === 3 ? "current" : "future" },
      { key: "enterprise", status: overrides.phaseIdx === 4 ? "current" : "future" },
      { key: "agent", status: overrides.phaseIdx === 5 ? "current" : "future" }
    ],
    rotation: { ranked: LKEYS.slice(0, 3).map((k) => ({ key: k, momentum: overrides[k] != null ? overrides[k] : momentum })) },
    concentration: { level: { key: overrides.conc || "medium" } }
  };
}
function mkRegime(score) { return { available: true, score, regime: score >= 60 ? { key: "risk-on", label: "Risk-On" } : score >= 40 ? { key: "neutral", label: "Neutral" } : { key: "risk-off", label: "Risk-Off" } }; }
// yield closes: flat series at a level (length 30)
const flatY = (v) => Array.from({ length: 30 }, () => v);
// fresh SMA200 breakout series: 240 flat 100, 10 bars at 90 (below sma), then cross up
function breakout() { const c = []; for (let i = 0; i < 240; i++) c.push(100); for (let i = 0; i < 10; i++) c.push(90); c.push(103, 104); return c; }
// long uptrend, no cross
function uptrend() { return Array.from({ length: 320 }, (_, i) => 50 + i * 0.3); }
function snapWith(qqqCloses, tnx, portfolioStatus) {
  return {
    historicalData: {
      "^TNX": { closes: tnx || flatY(4.0) },
      QQQM: { closes: qqqCloses || uptrend() },
      BTCUSD: { closes: uptrend() }
    },
    portfolioStatus: portfolioStatus || null
  };
}
function quarterlyPS(investedPct) {
  // one quarter: single non-cash asset, investedPercent = investedPct
  return { data: { currentQuarter: "2026-Q3", quarters: { "2026-Q3": { key: "2026-Q3", assets: [
    { type: "foreign-stock", name: "x", manualValue: 1000000, snapshotValue: null, investedPercent: investedPct }
  ], savedAt: null } } } };
}
const PPmock = { deriveQuarterly: (ps) => {
  const a = ps.data.quarters["2026-Q3"].assets[0];
  const inv = a.manualValue * a.investedPercent / 100;
  return { total: a.manualValue, investedSum: inv, cashSum: a.manualValue - inv };
} };

// ---------------------------------------------------------------- 1 · states + alloc table
(function () {
  console.log("\n[1] states + allocation table");
  check("85 → Very Strong", AP.stateOf(85).key === "very-strong");
  check("84 → Strong", AP.stateOf(84).key === "strong");
  check("70 → Strong", AP.stateOf(70).key === "strong");
  check("69 → Neutral", AP.stateOf(69).key === "neutral");
  check("55 → Neutral", AP.stateOf(55).key === "neutral");
  check("54 → Weak", AP.stateOf(54).key === "weak");
  check("39 → Broken", AP.stateOf(39).key === "broken");
  check("alloc very-strong 70/30/0", JSON.stringify(AP.ALLOC["very-strong"]) === JSON.stringify({ core: 70, tactical: 30, cash: 0 }));
  check("alloc weak 35/0/65", JSON.stringify(AP.ALLOC["weak"]) === JSON.stringify({ core: 35, tactical: 0, cash: 65 }));
  check("alloc broken 20/0/80", JSON.stringify(AP.ALLOC["broken"]) === JSON.stringify({ core: 20, tactical: 0, cash: 80 }));
})();

// ---------------------------------------------------------------- 2 · rate headwind
(function () {
  console.log("\n[2] rateHeadwind");
  const calm = AP.rateHeadwind(flatY(4.0), flatY(4.8));
  check("calm yields → high score, not severe", calm.score >= 90 && !calm.severe, calm);
  const hot = AP.rateHeadwind(flatY(4.7), flatY(5.3));
  check("both High Alert flat → pts 4, not severe", hot.pts === 4 && !hot.severe, hot);
  // rising fast: last 21 bars ramp +0.3 (30bps)
  const ramp = flatY(4.7).map((v, i) => v + (i >= 9 ? (i - 9) * 0.015 : 0));
  const sev = AP.rateHeadwind(ramp, ramp.map((v) => v + 0.6));
  check("alert + rapid rising both → severe (pts ≥6)", sev.severe === true, sev);
  const none = AP.rateHeadwind(null, null);
  check("no data → score null, not severe", none.score === null && none.severe === false);
})();

// ---------------------------------------------------------------- 3 · freshBull
(function () {
  console.log("\n[3] freshBull (recomputed + persistence)");
  const b = AP.freshBull(breakout());
  check("genuine breakout → smaBreakout fresh", b && b.smaBreakout != null && b.any === true, b);
  const u = AP.freshBull(uptrend());
  check("long uptrend → no fresh cross", u && u.any === false && u.aboveSma === true, u);
  check("short series → null", AP.freshBull([1, 2, 3]) === null);
})();

// ---------------------------------------------------------------- 4 · compute end-to-end
(function () {
  console.log("\n[4] compute: mega trend + gate + dip + recommendation");
  // strong everything: layers 90, regime 75, calm rates, fresh breakout on QQQM
  const out = AP.compute(snapWith(breakout(), flatY(4.0), quarterlyPS(60)), {
    R: mkR(90), regime: mkRegime(75), PP: PPmock
  });
  check("available", out.available === true, out.reason);
  check("mega score high (≥85) → Very Strong", out.megaTrend.score >= 85 && out.megaTrend.state.key === "very-strong", out.megaTrend.score);
  check("10 components, all scored", out.megaTrend.components.length === 10 && out.megaTrend.components.every((c) => c.score != null), out.megaTrend.coverage);
  check("gate open", out.gate.open === true);
  check("dip verdict = Add Position (all 5 met)", out.dip.verdict.key === "add", out.dip.conditions.map((c) => [c.key, c.met]));
  check("allocation 70/30/0", out.allocation.core === 70 && out.allocation.tactical === 30 && out.allocation.cash === 0);
  // current 60% vs suggested 100% → Increase, step capped at 15pp
  check("recommendation Increase, step capped 15pp", out.recommendation.key === "increase" && out.recommendation.stepPp === 15, out.recommendation);
  check("confidence computed with label", out.confidence.score != null && out.confidence.label != null, out.confidence);
  check("explain blocks present", out.explain.trendValid.length > 0 && out.explain.accumulation.length > 0);
})();

// ---------------------------------------------------------------- 5 · weak trend gates everything
(function () {
  console.log("\n[5] weak mega trend → gate closed, Wait, low alloc");
  const out = AP.compute(snapWith(breakout(), flatY(4.0), quarterlyPS(80)), {
    R: mkR(35), regime: mkRegime(30), PP: PPmock
  });
  check("mega low → Weak/Broken", ["weak", "broken"].includes(out.megaTrend.state.key), out.megaTrend);
  check("gate closed", out.gate.open === false);
  check("dip = Wait even with fresh technical signal", out.dip.verdict.key === "wait", out.dip.verdict);
  check("technical alone cannot override (mega condition failed)", out.dip.conditions.find((c) => c.key === "mega").met === false);
  check("tactical = 0 in weak/broken", out.allocation.tactical === 0, out.allocation);
  // current 80% invested vs suggested ~20-35 → Reduce, capped
  check("recommendation Reduce, step ≤15pp", out.recommendation.key === "reduce" && out.recommendation.stepPp <= 15, out.recommendation);
  check("never forced liquidation (core ≥20)", out.allocation.core >= 20);
})();

// ---------------------------------------------------------------- 6 · partial data + degenerate
(function () {
  console.log("\n[6] renormalisation + degenerate inputs");
  // no regime, no rates data → components renormalise, still available
  const s = snapWith(uptrend(), null, null);
  delete s.historicalData["^TNX"];
  const out = AP.compute(s, { R: mkR(70), regime: null, PP: null });
  check("no regime/rates → still available, coverage <100", out.available === true && out.megaTrend.coverage < 100, out.megaTrend && out.megaTrend.coverage);
  check("macro & rates components null", out.megaTrend.components.find((c) => c.key === "macro").score === null && out.megaTrend.components.find((c) => c.key === "rates").score === null);
  check("regime condition unknown → dip = Wait", out.dip.verdict.key === "wait");
  check("no quarterly → recommendation unknown", out.recommendation.key === "unknown");
  check("no R → unavailable", AP.compute({}, { R: null, regime: null }).available === false);
  check("compute(null) no throw", AP.compute(null, { R: null }).available === false);
  // maintain path: current 62 vs neutral suggested 70 (diff 8>5 → increase)... use strong: 90 suggested; current 88 → maintain
  const out2 = AP.compute(snapWith(uptrend(), flatY(4.0), quarterlyPS(88)), { R: mkR(78), regime: mkRegime(70), PP: PPmock });
  check("within ±5pp → Maintain", out2.recommendation.key === "maintain", { sug: out2.allocation.suggestedInvested, cur: out2.currentInvestedPct, reco: out2.recommendation });
})();

console.log(`\n${passed + failed} checks · ${passed} passed · ${failed} failed`);
process.exit(failed ? 1 : 0);
