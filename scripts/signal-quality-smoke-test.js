"use strict";

// Smoke tests for the Signal Score presentation API (public/signal-quality.js).
// It delegates to the gate-driven engine (scoring.js): EMA 50 / SMA200 35 / Volume 15.
// Run: node scripts/signal-quality-smoke-test.js

const SQ = require("../public/signal-quality");

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed += 1; console.log(`  PASS  ${name}`); }
  else { failed += 1; console.log(`  FAIL  ${name}${detail !== undefined ? "  (" + detail + ")" : ""}`); }
}

// 1. Fresh + fully met -> full score, gates pass, buy action
(function () {
  const r = SQ.calculate({ ema12: 105, ema26: 100, latestPrice: 110, sma200: 100, volumeRatio: 2.0, daysSinceEmaBullishCross: 1, daysSinceSma200Reclaim: 1 });
  console.log(`\n[1] fresh+met -> ${r.score} (ema=${r.componentScores.emaScore} sma=${r.componentScores.sma200Score} vol=${r.componentScores.volumeScore}) action=${r.thaiFinalAction}`);
  check("score 100", r.score === 100, r.score);
  check("EMA max 50", r.componentScores.emaScore === 50 && r.max.emaScore === 50);
  check("SMA max 35", r.componentScores.sma200Score === 35 && r.max.sma200Score === 35);
  check("Volume max 15", r.componentScores.volumeScore === 15 && r.max.volumeScore === 15);
  check("gates present + EMA PASS", r.gates && r.gates.ema && r.gates.ema.status === "PASS");
  check("finalAction present", !!r.finalAction);
})();

// 2. Below SMA200 -> SMA gate FAIL, not a buy-more action
(function () {
  const r = SQ.calculate({ ema12: 105, ema26: 100, latestPrice: 90, sma200: 100, volumeRatio: 1.8 });
  console.log(`\n[2] below sma200 -> ${r.score} smaGate=${r.gates.sma200.status} action=${r.actionKey}`);
  check("SMA gate FAIL", r.gates.sma200.status === "FAIL");
  check("not buy more / hold add", r.actionKey !== "BUY_MORE" && r.actionKey !== "HOLD_ADD", r.actionKey);
  check("component detail present", !!(r.componentDetail && r.componentDetail.sma200));
})();

// 3. Volume strong but EMA fail -> volume does not override
(function () {
  const r = SQ.calculate({ ema12: 98, ema26: 100, latestPrice: 110, sma200: 100, volumeRatio: 2.0 });
  console.log(`\n[3] EMA fail + strong vol -> volGate=${r.gates.volume.status} action=${r.actionKey}`);
  check("Volume gate STRONG", r.gates.volume.status === "STRONG");
  check("EMA gate FAIL", r.gates.ema.status === "FAIL");
  check("action not buy", r.actionKey !== "BUY_MORE" && r.actionKey !== "BUY_FIRST_WAIT_VOLUME");
})();

// 4. Empty -> no crash
(function () {
  let ok = true, r;
  try { r = SQ.calculate({}); } catch (e) { ok = false; }
  console.log(`\n[4] empty -> ${ok ? r.score : "THREW"}`);
  check("no crash", ok);
  check("number score", ok && typeof r.score === "number");
})();

// 5. Quadrant mapping still works
(function () {
  const q1 = SQ.calculateSignalQuadrant({ timingScore: 80, signalQualityScore: 80 });
  console.log(`\n[5] quadrant -> ${q1.quadrant}`);
  check("best technical setup", q1.quadrant === "BEST_TECHNICAL_SETUP");
})();

console.log(`\n================  ${passed} passed, ${failed} failed  ================`);
process.exit(failed ? 1 : 0);
