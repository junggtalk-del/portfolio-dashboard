"use strict";

// Smoke tests for the Portfolio Position engine (public/portfolio-position-engine.js).
// Facts-only invariants: proportions, invested/cash, QoQ, bucket mapping, signal
// aggregation — and NO advice strings (no "ย้าย"/targets/BUY/SELL at bucket level).
// Run: node scripts/portfolio-position-smoke-test.js

const PP = require("../public/portfolio-position-engine");

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed += 1; console.log(`  PASS  ${name}`); }
  else { failed += 1; console.log(`  FAIL  ${name}${detail !== undefined ? "  (" + JSON.stringify(detail) + ")" : ""}`); }
}

// ---------------------------------------------------------------- fixtures
function quarterly() {
  return {
    data: {
      currentQuarter: "2026-Q3",
      quarters: {
        "2026-Q2": { key: "2026-Q2", assets: [
          { type: "bitcoin", name: "", manualValue: 90000, snapshotValue: 100000, investedPercent: 100 },
          { type: "foreign-stock", name: "", manualValue: 380000, snapshotValue: 400000, investedPercent: 80 },
          { type: "cash", name: "", manualValue: 500000, snapshotValue: 500000, investedPercent: 0 }
        ], savedAt: "2026-04-01T00:00:00Z" },
        "2026-Q3": { key: "2026-Q3", assets: [
          { type: "bitcoin", name: "", manualValue: 150000, snapshotValue: null, investedPercent: 100 },
          { type: "foreign-stock", name: "หุ้น US", manualValue: 450000, snapshotValue: null, investedPercent: 80 },
          { type: "cash", name: "", manualValue: 400000, snapshotValue: null, investedPercent: 0 }
        ], savedAt: null }
      }
    }
  };
}
function holdings() {
  return { data: [
    { canonicalSymbol: "BTCUSD", displaySymbol: "BTCUSD", assetName: "Bitcoin", assetType: "crypto", isHolding: true, marketValue: 150000, portfolioBucket: "", notes: "" },
    { canonicalSymbol: "QQQM", displaySymbol: "QQQM", assetName: "Invesco NASDAQ 100", assetType: "stock", isHolding: true, marketValue: 300000, portfolioBucket: "", notes: "DCA รายเดือน" },
    { canonicalSymbol: "NVDA", displaySymbol: "NVDA", assetName: "NVIDIA", assetType: "stock", isHolding: true, marketValue: 150000, portfolioBucket: "", notes: "" },
    { canonicalSymbol: "K-USXNDQRMF", displaySymbol: "K-USXNDQRMF", assetName: "K RMF NDQ", assetType: "THAI_MUTUAL_FUND", isHolding: true, marketValue: 120000, portfolioBucket: "", notes: "" },
    { canonicalSymbol: "K-GTECHRMF", displaySymbol: "K-GTECHRMF", assetName: "K RMF GTech", assetType: "THAI_MUTUAL_FUND", isHolding: true, marketValue: 80000, portfolioBucket: "rmf-jang", notes: "" },
    { canonicalSymbol: "GULF.BK", displaySymbol: "GULF", assetName: "Gulf Energy", assetType: "THAI_STOCK", isHolding: true, marketValue: 60000, portfolioBucket: "", notes: "" },
    { canonicalSymbol: "AMD", displaySymbol: "AMD", assetName: "AMD", assetType: "stock", isHolding: false, watchlistOnly: true, marketValue: 0, portfolioBucket: "", notes: "" }
  ] };
}
function scoring() {
  return { bySymbol: {
    BTCUSD: { signalScore: 74, thaiSignalLabel: "Bullish ต่อเนื่อง", thaiFinalAction: "ถือต่อ / เพิ่มได้", actionKey: "HOLD_ADD", color: "#10b981", warnings: [] },
    QQQM: { signalScore: 80, thaiSignalLabel: "Bullish ต่อเนื่อง", thaiFinalAction: "ถือต่อ / เพิ่มได้", actionKey: "HOLD_ADD", color: "#10b981", warnings: [] },
    NVDA: { signalScore: 40, thaiSignalLabel: "Neutral", thaiFinalAction: "ถือ / รอสัญญาณ", actionKey: "WATCH_WAIT", color: "#f59e0b", warnings: [{ thaiMessage: "ต่ำกว่า SMA200" }] },
    SPY: { signalScore: 70, thaiSignalLabel: "Bullish", thaiFinalAction: "ถือต่อ", actionKey: "HOLD", color: "#10b981", warnings: [] },
    GLD: { signalScore: 50, thaiSignalLabel: "Neutral", thaiFinalAction: "ถือ", actionKey: "HOLD", color: "#f59e0b", warnings: [] }
  } };
}
function wave3() {
  return { available: true, universes: {
    portfolio: { items: [{ symbol: "QQQM", status: "READY", readiness: 88, quality: "A+" }] },
    aiBoom: { items: [{ symbol: "NVDA", status: "WAIT", readiness: 51, quality: "B" }] },
    thailand: { items: [{ symbol: "GULF.BK", status: "WATCH", readiness: 78, quality: "A" }] },
    crypto: { items: [] }
  } };
}
function snap() { return { loadedAt: "2026-07-14T09:00:00Z", portfolioStatus: quarterly(), portfolioHoldings: holdings(), scoring: scoring(), wave3: wave3() }; }

// ---------------------------------------------------------------- 1 · bucket mapping rules
(function () {
  console.log("\n[1] bucketForHolding mapping rules");
  const f = PP.bucketForHolding;
  check("crypto → bitcoin", f({ assetType: "crypto" }) === "bitcoin");
  check("THAI_STOCK → thai-stock", f({ assetType: "THAI_STOCK" }) === "thai-stock");
  check("THAI_INDEX → thai-stock", f({ assetType: "THAI_INDEX" }) === "thai-stock");
  check("stock → foreign-stock", f({ assetType: "stock" }) === "foreign-stock");
  check("INDEX → foreign-stock", f({ assetType: "INDEX" }) === "foreign-stock");
  check("THAI_MUTUAL_FUND w/o override → null", f({ assetType: "THAI_MUTUAL_FUND" }) === null);
  check("portfolioBucket override wins", f({ assetType: "THAI_MUTUAL_FUND", portfolioBucket: "rmf-jang" }) === "rmf-jang");
  check("legacy 'US Stock' → foreign-stock", f({ assetType: "unknown", portfolioBucket: "US Stock" }) === "foreign-stock");
  check("legacy 'Crypto' → bitcoin", f({ assetType: "unknown", portfolioBucket: "Crypto" }) === "bitcoin");
  check("legacy 'Thai RMF' → null (ambiguous)", f({ assetType: "THAI_MUTUAL_FUND", portfolioBucket: "Thai RMF" }) === null);
})();

// ---------------------------------------------------------------- 2 · quarterly derivation + QoQ
(function () {
  console.log("\n[2] deriveQuarterly: proportions, invested/cash, QoQ");
  const q = PP.deriveQuarterly(quarterly());
  check("current quarter = 2026-Q3", q.key === "2026-Q3", q.key);
  check("prev quarter = 2026-Q2", q.prevKey === "2026-Q2", q.prevKey);
  check("total = 1,000,000 (manualValue-first for current)", q.total === 1000000, q.total);
  const btc = q.byType.find((b) => b.type === "bitcoin");
  check("bitcoin pct = 15%", Math.abs(btc.pct - 15) < 0.01, btc.pct);
  // invested: btc 150000*100% + fs 450000*80% = 510000; cash = 400000 + fs 90000 = 490000
  check("investedSum = 510,000", q.investedSum === 510000, q.investedSum);
  check("cashSum = 490,000", q.cashSum === 490000, q.cashSum);
  // QoQ: prev uses snapshotValue-first → btc 100000 → +50000 (+50%)
  check("bitcoin QoQ +50,000", btc.qoq && btc.qoq.thb === 50000, btc.qoq);
  check("bitcoin QoQ +50%", btc.qoq && btc.qoq.pct === 50, btc.qoq);
  check("total QoQ = 0 thb (1M → 1M)", q.qoqTotal && q.qoqTotal.thb === 0, q.qoqTotal);
  // no previous quarter → qoq null, no throw
  const solo = PP.deriveQuarterly({ data: { currentQuarter: "2026-Q3", quarters: { "2026-Q3": quarterly().data.quarters["2026-Q3"] } } });
  check("single quarter → qoqTotal null", solo.qoqTotal === null);
  check("single quarter → bucket qoq null", solo.byType[0].qoq === null);
})();

// ---------------------------------------------------------------- 3 · full compute: buckets + tickers
(function () {
  console.log("\n[3] compute(): bucket board facts");
  const out = PP.compute(snap(), { now: "2026-07-14T10:00:00Z" });
  check("available", out.available === true, out.reason);
  check("totals.investedPct = 51%", out.totals.investedPct === 51, out.totals.investedPct);
  check("totals.cashPct = 49%", out.totals.cashPct === 49, out.totals.cashPct);
  const fs = out.buckets.find((b) => b.type === "foreign-stock");
  check("foreign-stock has QQQM+NVDA tickers", fs.tickers.length === 2, fs.tickers.map((t) => t.symbol));
  check("QQQM weightInBucket ≈ 66.7%", Math.abs(fs.tickers[0].weightInBucket - 66.7) < 0.11, fs.tickers[0].weightInBucket);
  // value-weighted health: (80*300000 + 40*150000) / 450000 = 66.67 → 67
  check("foreign-stock health = 67 (value-weighted)", fs.signal.health === 67, fs.signal.health);
  check("foreign-stock source = holdings", fs.signal.source === "holdings");
  check("counts bull=1 neutral=1 (score 40 = neutral band)", fs.signal.counts.bull === 1 && fs.signal.counts.neutral === 1, fs.signal.counts);
  const btc = out.buckets.find((b) => b.type === "bitcoin");
  check("bitcoin uses real BTCUSD holding (source holdings)", btc.signal.source === "holdings", btc.signal);
  check("QQQM row carries wave3 READY", fs.tickers[0].wave3 && fs.tickers[0].wave3.status === "READY", fs.tickers[0].wave3);
  check("NVDA row carries thaiFinalAction from scoring", fs.tickers[1].scoring.thaiFinalAction === "ถือ / รอสัญญาณ");
  check("GULF.BK carries wave3 WATCH from thailand universe", out.buckets.find((b) => b.type === "thai-stock").tickers[0].wave3.status === "WATCH");
})();

// ---------------------------------------------------------------- 4 · proxy + unassigned + watchlist
(function () {
  console.log("\n[4] proxy fallback + trays");
  const s = snap();
  const out = PP.compute(s);
  // rmf-jang bucket: has K-GTECHRMF holding but no score for it → proxy QQQM engages? NO —
  // the holding exists but unscored → scored list empty → proxy. Verify that behavior:
  const noQ = out.buckets.find((b) => b.type === "rmf-jang");
  check("rmf-jang exists as bucket (holding-only, no quarterly row)", !!noQ && noQ.noQuarterRow === true, noQ && noQ.noQuarterRow);
  check("rmf-jang unscored ticker → proxy QQQM", noQ.signal.source === "proxy" && noQ.signal.symbols[0].symbol === "QQQM", noQ.signal);
  check("K-USXNDQRMF (no bucket) lands in unassigned", out.unassigned.length === 1 && out.unassigned[0].symbol === "K-USXNDQRMF", out.unassigned.map((t) => t.symbol));
  check("AMD lands in watchlistOnly", out.watchlistOnly.length === 1 && out.watchlistOnly[0].symbol === "AMD");
  check("meta.mappedCount = held - unassigned = 5", out.meta.mappedCount === 5, out.meta);
  check("meta.proxyBuckets contains rmf-jang", out.meta.proxyBuckets.indexOf("rmf-jang") >= 0, out.meta.proxyBuckets);
  // cash bucket: no tickers, empty proxy → none
  const cash = out.buckets.find((b) => b.type === "cash");
  check("cash signal = none", cash.signal.source === "none" && cash.signal.health === null);
  // thai-stock WITH scored holding? GULF.BK has no scoring entry → but bucket has 1 unscored ticker → proxy list [] → none
  const th = out.buckets.find((b) => b.type === "thai-stock");
  check("thai-stock (unscored ticker, empty proxy) → none", th.signal.source === "none", th.signal);
  // BTCUSD proxy path: remove BTC holding → bucket falls back to BTCUSD proxy key
  const s2 = snap(); s2.portfolioHoldings.data = s2.portfolioHoldings.data.filter((h) => h.canonicalSymbol !== "BTCUSD");
  const out2 = PP.compute(s2);
  const btc2 = out2.buckets.find((b) => b.type === "bitcoin");
  check("no BTC holding → proxy BTCUSD (canonical key)", btc2.signal.source === "proxy" && btc2.signal.symbols[0].symbol === "BTCUSD", btc2.signal);
})();

// ---------------------------------------------------------------- 5 · facts-only invariant + robustness
(function () {
  console.log("\n[5] no-advice invariant + degenerate inputs");
  const out = PP.compute(snap());
  const bucketJson = JSON.stringify({ totals: out.totals, buckets: out.buckets.map((b) => ({ t: b.type, l: b.label, q: b.qoq, s: b.signal.thai })), meta: out.meta });
  check("no 'ย้าย' (move-money) strings", bucketJson.indexOf("ย้าย") < 0);
  check("no 'เป้า' (target) strings", bucketJson.indexOf("เป้า") < 0);
  check("no BUY/SELL bucket verdicts", !/"(BUY|SELL)[_A-Z]*"/.test(bucketJson.replace(/actionKey[^,}]*/g, "")));
  check("compute(null) → unavailable, no throw", PP.compute(null).available === false);
  check("compute({}) → unavailable (no quarterly)", PP.compute({}).available === false && PP.compute({}).reason === "no-quarterly");
  const empty = PP.compute({ portfolioStatus: { data: { currentQuarter: "x", quarters: {} } } });
  check("empty quarters → unavailable, no throw", empty.available === false);
  // holdings missing entirely → buckets still render from quarterly, signal via proxy
  const noH = PP.compute({ portfolioStatus: quarterly(), scoring: scoring() });
  check("no holdings → still available from quarterly", noH.available === true);
  const fs2 = noH.buckets.find((b) => b.type === "foreign-stock");
  check("no holdings → foreign-stock proxy QQQM+SPY health = 76", fs2.signal.source === "proxy" && fs2.signal.health === 76, fs2.signal);
})();

console.log(`\n${passed + failed} checks · ${passed} passed · ${failed} failed`);
process.exit(failed ? 1 : 0);
