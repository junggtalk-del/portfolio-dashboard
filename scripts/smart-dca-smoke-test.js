"use strict";

// Smoke tests for the Smart DCA engine (public/smart-dca-engine.js).
// Run: node scripts/smart-dca-smoke-test.js

const S = require("../public/smart-dca-engine");

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed += 1; console.log(`  PASS  ${name}`); }
  else { failed += 1; console.log(`  FAIL  ${name}${detail !== undefined ? "  (" + JSON.stringify(detail) + ")" : ""}`); }
}

// ---------------------------------------------------------------- fixtures
// daily date generator (UTC, includes weekends — crypto trades daily)
function dailyDates(startISO, n) {
  const out = []; const t0 = Date.parse(startISO + "T00:00:00Z");
  for (let i = 0; i < n; i++) out.push(new Date(t0 + i * 86400000).toISOString().slice(0, 10));
  return out;
}
function mkSeries(startISO, n, priceFn, valFn) {
  const dates = dailyDates(startISO, n);
  return { ok: true, type: "mvrv", dates, prices: dates.map((_, i) => priceFn(i)), vals: dates.map((_, i) => valFn(i)), latestDate: dates[n - 1] };
}

// ---------------------------------------------------------------- 1 · zone lookup
(function () {
  console.log("\n[1] zone tables & multiplier boundaries (MVRV)");
  const zf = (v) => S.zoneFor(v, "mvrv");
  check("0.5 → fire ×4", zf(0.5).key === "fire" && zf(0.5).mult === 4);
  check("0.8 boundary → deep ×3 (min inclusive)", zf(0.8).key === "deep");
  check("0.99 → deep", zf(0.99).key === "deep");
  check("1.0 → accum ×2", zf(1.0).key === "accum" && zf(1.0).mult === 2);
  check("1.5 → early ×1.5", zf(1.5).mult === 1.5);
  check("2.0 → base ×1", zf(2.0).mult === 1);
  check("2.5 → rich ×0.5", zf(2.5).mult === 0.5);
  check("3.0 → hot ×0.25", zf(3.0).mult === 0.25);
  check("3.5 → euphoria ×0", zf(3.5).mult === 0);
  check("99 → euphoria", zf(99).key === "euphoria");
  check("null → null zone, mult falls back 1", zf(null) === null && S.multiplierFor(null, "mvrv") === 1);
  check("mayer 0.95 → accum ×2", S.zoneFor(0.95, "mayer").key === "accum");
  check("mayer 2.4 → euphoria ×0", S.zoneFor(2.4, "mayer").mult === 0);
})();

// ---------------------------------------------------------------- 2 · period keys
(function () {
  console.log("\n[2] ISO week / month keys");
  check("2026-01-01 (Thu) → 2026-W01", S.isoWeekKey("2026-01-01") === "2026-W01", S.isoWeekKey("2026-01-01"));
  check("2026-01-04 (Sun) → 2026-W01", S.isoWeekKey("2026-01-04") === "2026-W01", S.isoWeekKey("2026-01-04"));
  check("2026-01-05 (Mon) → 2026-W02", S.isoWeekKey("2026-01-05") === "2026-W02", S.isoWeekKey("2026-01-05"));
  check("2024-12-30 (Mon) → 2025-W01 (ISO year rollover)", S.isoWeekKey("2024-12-30") === "2025-W01", S.isoWeekKey("2024-12-30"));
  check("2027-01-01 (Fri) → 2026-W53", S.isoWeekKey("2027-01-01") === "2026-W53", S.isoWeekKey("2027-01-01"));
  check("month key", S.periodKey("2026-07-21", "monthly") === "2026-07");
})();

// ---------------------------------------------------------------- 3 · builders
(function () {
  console.log("\n[3] series builders");
  const rows = [];
  const dates = dailyDates("2015-01-01", 500);
  dates.forEach((d, i) => rows.push({ time: d + "T00:00:00.000000000Z", PriceUSD: String(100 + i), CapMVRVCur: String(1.5 + i / 1000) }));
  const cm = S.buildFromCoinMetrics({ data: rows });
  check("CM build ok, 500 bars, type mvrv", cm.ok && cm.dates.length === 500 && cm.type === "mvrv");
  check("CM strings parsed to numbers", cm.prices[0] === 100 && Math.abs(cm.vals[0] - 1.5) < 1e-9);
  check("CM <400 rows → not ok", S.buildFromCoinMetrics({ data: rows.slice(0, 100) }).ok === false);
  check("CM garbage → not ok", S.buildFromCoinMetrics(null).ok === false);

  const bars = dailyDates("2020-01-01", 600).map((d, i) => ({ date: d, close: 100 }));
  const oh = S.buildFromOhlc(bars);
  check("OHLC build ok, mayer type", oh.ok && oh.type === "mayer");
  check("OHLC vals null before bar 200", oh.vals[198] === null && oh.vals[199] !== null);
  check("OHLC flat price → mayer 1.0", Math.abs(oh.vals[599] - 1) < 1e-9, oh.vals[599]);
})();

// ---------------------------------------------------------------- 4 · backtest accounting
(function () {
  console.log("\n[4] backtest: plain vs smart accounting");
  // constant price 100, constant MVRV 2.2 (base zone ×1) → smart === plain exactly
  const s1 = mkSeries("2024-01-01", 730, () => 100, () => 2.2);
  const b1 = S.backtest(s1, { base: 1000, freq: "weekly" });
  check("constant base-zone: smart === plain invested", b1.ok && b1.smart.invested === b1.plain.invested, b1.smart);
  check("weekly over 730d ≈ 105 buys (±2)", Math.abs(b1.periods - 105) <= 2, b1.periods);
  check("btc = invested/price", Math.abs(b1.plain.btc - b1.plain.invested / 100) < 1e-6);
  check("roi 0% at flat price", b1.plain.roiPct === 0 && b1.smart.roiPct === 0);

  // monthly freq: 24 months → 24 buys
  const b2 = S.backtest(s1, { base: 1000, freq: "monthly" });
  check("monthly over 730d = 24-25 buys", b2.periods >= 24 && b2.periods <= 25, b2.periods);

  // euphoria whole range → smart skips ALL buys
  const s2 = mkSeries("2024-01-01", 400, () => 100, () => 4.0);
  const b3 = S.backtest(s2, { base: 1000, freq: "weekly" });
  check("all-euphoria: smart invested 0, all skipped", b3.smart.invested === 0 && b3.smart.skipped === b3.plain.buys, b3.smart);
  check("all-euphoria: smart value 0, avgCost null", b3.smart.value === 0 && b3.smart.avgCost === null);

  // U-shape: expensive plateau (price 100, MVRV 2.2 ×1) → cheap plateau at the
  // bottom (price 50, MVRV 0.9 ×3) → recovery plateau (price 100, MVRV 2.2 ×1).
  // Smart concentrates 3× buys at the cheap middle → clearly lower avg cost.
  const s3 = mkSeries("2024-01-01", 420,
    (i) => (i < 140 || i >= 280) ? 100 : 50,
    (i) => (i < 140 || i >= 280) ? 2.2 : 0.9);
  const b4 = S.backtest(s3, { base: 1000, freq: "weekly" });
  check("V-shape: smart avgCost < plain avgCost", b4.smart.avgCost < b4.plain.avgCost, { s: b4.smart.avgCost, p: b4.plain.avgCost });
  check("V-shape: smart btcPer100k > plain", b4.smart.btcPer100k > b4.plain.btcPer100k);
  check("diff.avgCostPct negative", b4.diff.avgCostPct < 0, b4.diff);

  // startDate clamp: start beyond data start
  const b5 = S.backtest(s1, { base: 1000, freq: "weekly", startDate: "2024-06-01" });
  check("startDate honored (first buy ≥ start)", b5.startDate >= "2024-06-01", b5.startDate);
  check("fewer buys with later start", b5.periods < b1.periods);

  // missing MVRV at buy bars → carry-forward last known
  const s4 = mkSeries("2024-01-01", 400, () => 100, (i) => (i === 0 ? 0.5 : null));
  const b6 = S.backtest(s4, { base: 1000, freq: "weekly" });
  check("carry-forward: all buys at ×4 (fire from bar0)", b6.smart.invested === b6.plain.invested * 4, { s: b6.smart.invested, p: b6.plain.invested });

  // no valuation at all → neutral ×1 + neutralBuys counted
  const s5 = mkSeries("2024-01-01", 400, () => 100, () => null);
  const b7 = S.backtest(s5, { base: 1000, freq: "weekly" });
  check("no-valuation: neutral ×1, smart === plain", b7.smart.invested === b7.plain.invested && b7.smart.neutralBuys === b7.plain.buys, b7.smart);

  // degenerate inputs
  check("backtest(null) → not ok", S.backtest(null, {}).ok === false);
  check("bad base → not ok", S.backtest(s1, { base: -5 }).ok === false);
  check("timeline entries have zone+mult", b4.timeline.length === b4.periods && b4.timeline.every((t) => "mult" in t && "date" in t));
  const zoneDaySum = Object.values(b1.zoneDays).reduce((a, b) => a + b, 0);
  check("zoneDays covers every bar in range", zoneDaySum >= 725, zoneDaySum);
})();

// ---------------------------------------------------------------- 5 · current verdict
(function () {
  console.log("\n[5] current()");
  const s = mkSeries("2024-01-01", 500, (i) => 100 + i, (i) => (i >= 495 ? null : 1.2)); // last 5 vals missing
  const c = S.current(s, { base: 2000 });
  check("current ok, uses last known val (1.2 → accum ×2)", c.ok && c.zone.key === "accum" && c.mult === 2, c);
  check("suggest = base × mult", c.suggest === 4000, c.suggest);
  check("valueDate ≠ price date when val stale", c.valueDate !== c.date);
  const cEmpty = S.current({ ok: true, type: "mvrv", dates: dailyDates("2024-01-01", 3), prices: [1, 2, 3], vals: [null, null, null] }, {});
  check("no val in window → neutralFallback ×1", cEmpty.neutralFallback === true && cEmpty.mult === 1);
  check("current(null) → not ok", S.current(null, {}).ok === false);
})();

// ---------------------------------------------------------------- 7 · DCA journal accounting (average cost)
(function () {
  console.log("\n[7] journalSummary: average-cost buys/sells");
  const J = S.journalSummary;
  // two buys → weighted average cost
  const b2 = J([
    { date: "2026-01-05", side: "buy", thb: 10000, btc: 0.005 },   // 2,000,000 ฿/BTC
    { date: "2026-02-05", side: "buy", thb: 10000, btc: 0.004 }    // 2,500,000 ฿/BTC
  ]);
  check("2 buys: btcHeld 0.009", b2.btcHeld === 0.009, b2.btcHeld);
  check("2 buys: invested 20,000, avgCost 2,222,222", b2.invested === 20000 && b2.avgCost === 2222222, b2);
  // sell consumes at running average
  const s1 = J([
    { date: "2026-01-05", side: "buy", thb: 10000, btc: 0.005 },
    { date: "2026-02-05", side: "buy", thb: 10000, btc: 0.004 },
    { date: "2026-03-05", side: "sell", thb: 13500, btc: 0.0045 } // ขายครึ่งที่ 3,000,000 ฿/BTC
  ]);
  check("sell: btcHeld 0.0045 เหลือครึ่ง", s1.btcHeld === 0.0045, s1.btcHeld);
  check("sell: costRemaining = 10,000 (ครึ่งของ 20,000)", s1.costRemaining === 10000, s1.costRemaining);
  check("sell: realized = 13,500 − 10,000 = 3,500", s1.realizedPnl === 3500, s1.realizedPnl);
  check("sell: proceeds 13,500 · sells 1 · buys 2", s1.proceeds === 13500 && s1.sells === 1 && s1.buys === 2);
  // oversell clamps + flags
  const ov = J([
    { date: "2026-01-05", side: "buy", thb: 10000, btc: 0.005 },
    { date: "2026-02-05", side: "sell", thb: 30000, btc: 0.01 }   // ขายเกินที่ถือ
  ]);
  check("oversell: clamped to holdings (btcHeld 0)", ov.btcHeld === 0 && ov.oversell === true, ov);
  check("oversell: proceeds prorated (15,000 จาก 30,000)", ov.proceeds === 15000, ov.proceeds);
  // unsorted input sorted by date; garbage rows dropped
  const un = J([
    { date: "2026-02-05", side: "sell", thb: 5000, btc: 0.002 },
    { date: "2026-01-05", side: "buy", thb: 10000, btc: 0.005 },
    { date: "2026-03-01", side: "buy", thb: 0, btc: 0.001 },       // invalid
    null
  ]);
  check("unsorted: sell processed after buy (btcHeld 0.003)", un.btcHeld === 0.003, un.btcHeld);
  check("empty → zeros no throw", J([]).btcHeld === 0 && J(null).invested === 0);
  // sell plan mirror
  check("sellPlanFor rich ×0.5", S.sellPlanFor("rich", 10000).amount === 5000);
  check("sellPlanFor euphoria ×2", S.sellPlanFor("euphoria", 10000).amount === 20000);
  check("sellPlanFor accum → null (ยังไม่ถึงโซนขาย)", S.sellPlanFor("accum", 10000) === null);
})();

console.log(`\n${passed + failed} checks · ${passed} passed · ${failed} failed`);
process.exit(failed ? 1 : 0);
