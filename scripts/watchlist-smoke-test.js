"use strict";

// Smoke tests for the Watchlist alert evaluation engine (public/watchlist.js).
// Run: node scripts/watchlist-smoke-test.js

const WL = require("../public/watchlist");

// Minimal localStorage mock so store + sync functions can be exercised in node.
global.localStorage = (function () {
  let store = {};
  return {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; }
  };
})();

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed += 1; console.log(`  PASS  ${name}`); }
  else { failed += 1; console.log(`  FAIL  ${name}${detail ? "  (" + detail + ")" : ""}`); }
}

// 1. Buy watch — strong context -> triggered
(function () {
  const item = { watchCategory: "buy" };
  const ev = WL.evaluate(item, { price: 100, timingScore: 82, isNewBullishSignal: true, volumeRatio: 1.6, rsi14: 50, support: 97 });
  console.log(`\n[1] buy strong -> status=${ev.status} triggered=${ev.triggeredRules.length}`);
  check("status triggered", ev.status === "triggered", ev.status);
  check(">=3 rules triggered", ev.triggeredRules.length >= 3, String(ev.triggeredRules.length));
})();

// 2. Buy watch — near context -> near
(function () {
  const item = { watchCategory: "buy" };
  const ev = WL.evaluate(item, { price: 100, timingScore: 62, volumeRatio: 0.9, rsi14: 50, support: 90, ema12: 99, ema26: 100 });
  console.log(`\n[2] buy near -> status=${ev.status} near=${ev.nearTriggerRules.length}`);
  check("status near", ev.status === "near", ev.status);
  check(">=1 near rule", ev.nearTriggerRules.length >= 1);
})();

// 3. Risk watch — bearish -> triggered high severity
(function () {
  const item = { watchCategory: "risk" };
  const ev = WL.evaluate(item, { price: 100, isNewBearishSignal: true, timingScore: 40, sma200Status: "BELOW_SMA200", distanceToSma200Pct: -1, marketRiskLevel: "High" });
  console.log(`\n[3] risk -> status=${ev.status} severity=${ev.severity}`);
  check("status triggered", ev.status === "triggered");
  check("severity high", ev.severity === "high", ev.severity);
})();

// 4. Missing price -> missing
(function () {
  const ev = WL.evaluate({ watchCategory: "buy" }, { price: null });
  console.log(`\n[4] missing price -> status=${ev.status}`);
  check("status missing", ev.status === "missing", ev.status);
})();

// 5. nearSupport rule triggered within 3%
(function () {
  const item = { watchCategory: "custom", alertRules: [{ type: "nearSupport", value: 3 }] };
  const ev = WL.evaluate(item, { price: 100, support: 98 });
  console.log(`\n[5] nearSupport -> status=${ev.status} triggered=${ev.triggeredRules.length}`);
  check("nearSupport triggered", ev.triggered === true);
})();

// 6. default rules + category coverage
(function () {
  console.log(`\n[6] categories=${Object.keys(WL.CATEGORIES).length} buy-defaults=${WL.defaultRulesFor("buy").length}`);
  check("7 categories", Object.keys(WL.CATEGORIES).length === 7);
  check("buy has default rules", WL.defaultRulesFor("buy").length >= 4);
})();

// 7. syncFromUniverse — fresh add + category mapping + source tagging
(function () {
  global.localStorage.clear();
  const res = WL.syncFromUniverse([
    { canonicalSymbol: "NVDA", displaySymbol: "NVDA", assetName: "NVIDIA", assetType: "stock" },
    { canonicalSymbol: "^GSPC", displaySymbol: "SPX", assetName: "S&P 500", assetType: "INDEX" }
  ]);
  const all = WL.read();
  const nvda = WL.getBySymbol("NVDA");
  const spx = WL.getBySymbol("^GSPC");
  console.log(`\n[7] sync fresh -> added=${res.added} total=${all.length} nvda.cat=${nvda && nvda.watchCategory} spx.cat=${spx && spx.watchCategory}`);
  check("added 2", res.added === 2, String(res.added));
  check("nvda source ai_boom", nvda && nvda.source === "ai_boom");
  check("nvda category buy", nvda && nvda.watchCategory === "buy", nvda && nvda.watchCategory);
  check("index -> longterm", spx && spx.watchCategory === "longterm", spx && spx.watchCategory);
})();

// 8. syncFromUniverse — idempotent; preserves user-tuned category/rules, no dupes
(function () {
  const nvda = WL.getBySymbol("NVDA");
  WL.update(nvda.id, { watchCategory: "risk", alertRules: [{ type: "rsiSell", value: 80 }] });
  const res = WL.syncFromUniverse([{ canonicalSymbol: "NVDA", displaySymbol: "NVDA", assetName: "NVIDIA Corp", assetType: "stock" }]);
  const after = WL.getBySymbol("NVDA");
  const count = WL.read().filter((i) => WL.canonicalize(i.canonicalSymbol) === "NVDA").length;
  console.log(`\n[8] re-sync -> updated=${res.added === 0} cat=${after.watchCategory} rules=${after.alertRules.length} name=${after.assetName} dupes=${count}`);
  check("no new add", res.added === 0);
  check("category preserved", after.watchCategory === "risk", after.watchCategory);
  check("rules preserved", after.alertRules.length === 1 && after.alertRules[0].type === "rsiSell");
  check("metadata updated", after.assetName === "NVIDIA Corp", after.assetName);
  check("no duplicate", count === 1, String(count));
})();

// 9. archiveMissing — archives ai_boom items gone from universe; manual untouched
(function () {
  WL.add({ canonicalSymbol: "AAPL", displaySymbol: "AAPL", assetName: "Apple" }); // manual (default source)
  const res = WL.syncFromUniverse([{ canonicalSymbol: "NVDA", displaySymbol: "NVDA" }], { archiveMissing: true });
  const spx = WL.getBySymbol("^GSPC");
  const aapl = WL.getBySymbol("AAPL");
  const nvda = WL.getBySymbol("NVDA");
  console.log(`\n[9] archiveMissing -> archived=${res.archived} spx.active=${spx.isActive} aapl.active=${aapl.isActive} nvda.active=${nvda.isActive}`);
  check("ai_boom missing archived", spx.isActive === false);
  check("manual item untouched", aapl.isActive !== false && aapl.source === "manual");
  check("in-universe stays active", nvda.isActive !== false);
})();

console.log(`\n================  ${passed} passed, ${failed} failed  ================`);
process.exit(failed ? 1 : 0);
