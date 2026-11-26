// Bitcoin Long-term Signal engine (2026-11-26 · plan docs/superpowers/plans/2026-11-26-btc-lt-onchain.md · Task 2)
//   node scripts/btc-lt-signal-test.js
//
// What must stay true (public/btc-lt-signal.js → window.BtcLtSignal + module.exports):
//   · WEIGHTS / STATES / ANCHORS / HALVINGS / lags exactly as the plan
//   · subScore = straight lines between anchor points, ends clamp, 1 decimal, missing → null (never 0)
//   · inputsAt = newest row ≤ date − lag, older than maxAgeDays from date − lag → null · livePrice replaces price
//   · score = family mean of members that have values · total = Σw·s ÷ Σw of scored families · < 2 families → null
//   · scoreSeries / trend use the same rules · NO LOOK-AHEAD: future rows never change an earlier day
//   · backtest = hand-calculated returns / drawdowns / episodes · cycleMarkers on real multi-cycle prices
//   · answers: 5 questions, "ข้อมูลไม่พอ" grey when data is missing · ES5 · pure · no buy/sell advice
// No network. Real-data fixtures below are SMALL extracts of Coin Metrics community (PriceUSD, CapMVRVCur,
// CapMrktCurUSD) and Blockchain.com (miners-revenue, transaction-fees-usd) fetched once on 2026-11-26.
"use strict";
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var PUB = path.join(__dirname, "..", "public");
var FILE = path.join(PUB, "btc-lt-signal.js");
var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; console.log("  PASS  " + name); }
  else { fail++; console.log("  FAIL  " + name + (extra !== undefined ? "  → " + (typeof extra === "string" ? extra : JSON.stringify(extra)) : "")); }
}
function finish() {
  console.log("\n" + (pass + fail) + " checks · " + pass + " passed · " + fail + " failed");
  process.exit(fail ? 1 : 0);
}
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function near(a, b, eps) { return typeof a === "number" && typeof b === "number" && Math.abs(a - b) <= (eps == null ? 1e-9 : eps); }
function clone(x) { return JSON.parse(JSON.stringify(x)); }
// day i after 2024-01-01 (UTC) → "YYYY-MM-DD"
function iso(i, base) { return new Date(Date.parse((base || "2024-01-01") + "T00:00:00Z") + i * 86400000).toISOString().slice(0, 10); }
function ser(from, to, f, base) { var out = []; for (var i = from; i <= to; i++) out.push([iso(i, base), f(i)]); return out; }

var SRC = (function () { try { return fs.readFileSync(FILE, "utf8"); } catch (e) { return ""; } })();
var S = null;
try { S = require(FILE); } catch (e) { S = null; }
if (!S || typeof S.score !== "function") {
  t("public/btc-lt-signal.js loads (module.exports with score())", false, SRC ? "loaded but no API" : "file missing");
  finish();
}

// ------------------------------------------------------------------ [0] load in a browser-like sandbox
console.log("== [0] loads as window.BtcLtSignal in a sandbox without fetch/DOM/storage ==");
var W = (function () {
  var ctx = {};
  ctx.window = ctx;
  vm.createContext(ctx);
  try { vm.runInContext(SRC, ctx, { filename: "btc-lt-signal.js" }); } catch (e) { return { err: String(e && e.message) }; }
  return ctx;
})();
t("window.BtcLtSignal defined (no module, no fetch, no document, no localStorage in the sandbox)", W && W.BtcLtSignal && typeof W.BtcLtSignal.scoreSeries === "function", W && W.err);
t("module.exports and window export carry the same API", W && W.BtcLtSignal && ["subScore", "inputsAt", "score", "trend", "scoreSeries", "backtest", "cycleMarkers", "answers"].every(function (k) { return typeof S[k] === "function" && typeof W.BtcLtSignal[k] === "function"; }));

// ------------------------------------------------------------------ [1] constants verbatim
console.log("== [1] constants exactly as the plan ==");
t("WEIGHTS = valuation 40 · lth 35 · miner 25", same(S.WEIGHTS, { valuation: 40, lth: 35, miner: 25 }), S.WEIGHTS);
t("STATES (5, thresholds 80/65/45/30/0, en + th)", same(S.STATES, [
  { key: "strong", min: 80, en: "Strong Accumulation", th: "น่าสะสมมาก" },
  { key: "accum", min: 65, en: "Accumulation", th: "น่าสะสม" },
  { key: "neutral", min: 45, en: "Neutral", th: "กลาง ๆ" },
  { key: "risk", min: 30, en: "Distribution Risk", th: "เสี่ยงช่วงแจกของ" },
  { key: "hot", min: 0, en: "Overheated / High Risk", th: "ร้อนแรง / เสี่ยงสูง" }
]), S.STATES);
var PLAN_ANCHORS = {
  mvrvZ: [[-0.5, 100], [0, 95], [1, 75], [2, 55], [3.5, 30], [5, 12], [7, 0]],
  lthCostRatio: [[0.8, 100], [1, 90], [1.5, 70], [2.5, 45], [3.5, 20], [5, 0]],
  aipRatio: [[0.7, 100], [0.9, 85], [1.1, 60], [1.5, 35], [2, 15], [2.6, 0]],
  lthSopr7: [[0.8, 100], [1, 85], [1.5, 65], [3, 45], [6, 20], [10, 0]],
  lthNetPct: [[-3, 10], [-1.5, 30], [0, 50], [1.5, 75], [3, 95]],
  puell: [[0.4, 100], [0.6, 85], [1, 60], [1.5, 40], [2.5, 20], [4, 0]]
};
t("ANCHORS = the plan's starting anchors (kept after the multi-cycle check — evidence in [11])", same(S.ANCHORS, PLAN_ANCHORS), S.ANCHORS);
t("HALVINGS", same(S.HALVINGS, ["2012-11-28", "2016-07-09", "2020-05-11", "2024-04-20"]), S.HALVINGS);
t("default lags + maxAgeDays 21", same(S.DEFAULT_LAGS, { lthRealizedPrice: 7, activeInvestorPrice: 7, lthSopr: 7, lthSupply: 7, mvrvZ: 1, puell: 1, price: 0 }) && S.MAX_AGE_DAYS === 21, [S.DEFAULT_LAGS, S.MAX_AGE_DAYS]);

// ------------------------------------------------------------------ [2] subScore
console.log("== [2] subScore: anchors, between, clamp, rounding, missing ==");
var atPoints = true, bad = [];
Object.keys(PLAN_ANCHORS).forEach(function (k) {
  PLAN_ANCHORS[k].forEach(function (p) { if (S.subScore(k, p[0]) !== p[1]) { atPoints = false; bad.push([k, p[0], S.subScore(k, p[0])]); } });
});
t("every anchor point maps to its own score (all 6 indicators)", atPoints, bad);
t("between points is a straight line (8 hand values)",
  S.subScore("mvrvZ", 0.5) === 85 && S.subScore("mvrvZ", 2.75) === 42.5 && S.subScore("lthCostRatio", 1.25) === 80 && S.subScore("aipRatio", 1.3) === 47.5 &&
  S.subScore("lthSopr7", 2.25) === 55 && S.subScore("lthNetPct", 0.75) === 62.5 && S.subScore("puell", 0.8) === 72.5 && S.subScore("puell", 2) === 30,
  [S.subScore("mvrvZ", 0.5), S.subScore("mvrvZ", 2.75), S.subScore("lthCostRatio", 1.25), S.subScore("aipRatio", 1.3), S.subScore("lthSopr7", 2.25), S.subScore("lthNetPct", 0.75), S.subScore("puell", 0.8), S.subScore("puell", 2)]);
t("outside the anchors = the end value", S.subScore("mvrvZ", -3) === 100 && S.subScore("mvrvZ", 12) === 0 && S.subScore("lthNetPct", -10) === 10 && S.subScore("lthNetPct", 10) === 95 && S.subScore("puell", 0.1) === 100 && S.subScore("aipRatio", 9) === 0);
t("rounded to 1 decimal (mvrvZ 0.123 → 92.5 · puell 1.234 → 50.6)", S.subScore("mvrvZ", 0.123) === 92.5 && S.subScore("puell", 1.234) === 50.6, [S.subScore("mvrvZ", 0.123), S.subScore("puell", 1.234)]);
t("missing is null — never Number(null)=0 → 95 (null/undefined/''/NaN/Infinity/'abc'/true)",
  [null, undefined, "", NaN, Infinity, -Infinity, "abc", true, false, {}, []].every(function (v) { return S.subScore("mvrvZ", v) === null; }));
t("unknown key → null", S.subScore("nope", 1) === null && S.subScore(null, 1) === null);

// ------------------------------------------------------------------ [3] inputsAt
console.log("== [3] inputsAt: lags, maxAge, livePrice, derived inputs ==");
// day-encoded series (value tells which day was used): days 0..99 from 2024-01-01
var MAP = {
  price: ser(0, 99, function (i) { return 100 + i; }),
  mvrvZ: ser(0, 99, function (i) { return i / 100; }),
  lthRealizedPrice: ser(0, 99, function (i) { return 50 + i; }),
  activeInvestorPrice: ser(0, 99, function (i) { return 80 + i; }),
  lthSopr: ser(0, 99, function (i) { return 1 + i / 100; }),
  lthSupply: ser(0, 99, function (i) { return 1000000 + i * 1000; }),
  puell: ser(0, 99, function (i) { return 0.5 + i / 1000; })
};
var MAP_COPY = clone(MAP);
var I60 = S.inputsAt(MAP, iso(60));
t("date echoed", I60.date === iso(60));
t("price lag 0 → day 60 (160)", I60.price === 160 && I60.asOf.price === iso(60), [I60.price, I60.asOf]);
t("mvrvZ lag 1 → day 59 (0.59), not day 60", I60.mvrvZ === 0.59 && I60.asOf.mvrvZ === iso(59), [I60.mvrvZ, I60.asOf.mvrvZ]);
var PUELL59 = 0.5 + 59 / 1000;   // the fixture's own day-59 value (float: 0.5589999…)
t("puell lag 1 → day 59 (0.559)", I60.puell === PUELL59 && I60.asOf.puell === iso(59), [I60.puell, I60.asOf.puell]);
// ruling 2026-11-26: Puell is SCORED as a 7-row trailing mean (same treatment as LTH-SOPR 7); inputs.puell stays the raw day
t("puell7 = mean of the 7 newest Puell rows ≤ day 59 (days 53..59 → 0.556) · asOf = newest row · raw puell untouched",
  near(I60.puell7, 0.5 + 56 / 1000, 1e-12) && I60.asOf.puell7 === iso(59) && I60.puell === PUELL59, [I60.puell7, I60.asOf.puell7, I60.puell]);
var SPIKE = { mvrvZ: ser(0, 60, function () { return 1; }), puell: ser(0, 60, function (i) { return i === 50 ? 8 : 1; }) };
t("one block-luck spike (8 on day 50, else 1) → raw puell 8 but puell7 (8 + 6×1)/7 = 2", S.inputsAt(SPIKE, iso(51)).puell === 8 && near(S.inputsAt(SPIKE, iso(51)).puell7, 2, 1e-12), [S.inputsAt(SPIKE, iso(51)).puell, S.inputsAt(SPIKE, iso(51)).puell7]);
t("puell7 with only 3 rows → mean of those 3 (1,2,3 → 2)", S.inputsAt({ puell: [[iso(10), 1], [iso(11), 2], [iso(12), 3]] }, iso(13)).puell7 === 2);
t("puell7 leaves out rows older than maxAge from the cutoff (days 0..5 = 10, day 25 = 1 → mean of days 25, 5, 4 = 7)",
  S.inputsAt({ puell: ser(0, 5, function () { return 10; }).concat([[iso(25), 1]]) }, iso(26)).puell7 === 7, S.inputsAt({ puell: ser(0, 5, function () { return 10; }).concat([[iso(25), 1]]) }, iso(26)).puell7);
t("lthCostRatio = price ÷ LTH RP of day 53 (lag 7) = 160/103", near(I60.lthCostRatio, 160 / 103) && I60.asOf.lthRealizedPrice === iso(53) && I60.asOf.lthCostRatio === iso(53), [I60.lthCostRatio, I60.asOf]);
t("aipRatio = price ÷ Active Investor Price of day 53 = 160/133", near(I60.aipRatio, 160 / 133) && I60.asOf.activeInvestorPrice === iso(53) && I60.asOf.aipRatio === iso(53));
t("lthSopr7 = mean of the 7 newest rows ≤ day 53 (days 47..53 → 1.50)", near(I60.lthSopr7, 1.5, 1e-12) && I60.asOf.lthSopr7 === iso(53), I60.lthSopr7);
t("lthNetPct = (S(53) − S(23)) ÷ S(23) × 100 = 30000/1023000×100", near(I60.lthNetPct, 30000 / 1023000 * 100, 1e-12) && I60.asOf.lthNetPct === iso(53) && I60.asOf.lthSupplyBase === iso(23), [I60.lthNetPct, I60.asOf]);
t("raw cost basis values travel with the inputs (for the answers' evidence)", I60.raw && I60.raw.lthRealizedPrice === 103 && I60.raw.activeInvestorPrice === 133 && I60.raw.lthSupply === 1053000 && I60.raw.lthSupplyBase === 1023000, I60.raw);
t("inputsAt does not mutate the series", same(MAP, MAP_COPY));

var I60L = S.inputsAt(MAP, iso(60), { livePrice: 200 });
t("livePrice replaces the price in price and both ratios (asOf = the date)", I60L.price === 200 && near(I60L.lthCostRatio, 200 / 103) && near(I60L.aipRatio, 200 / 133) && I60L.asOf.price === iso(60));
t("invalid livePrice (0 / null / '' / −5 / 'abc') is ignored", [0, null, "", -5, "abc"].every(function (v) { return S.inputsAt(MAP, iso(60), { livePrice: v }).price === 160; }));
var I60o = S.inputsAt(MAP, iso(60), { lags: { mvrvZ: 0 } });
t("partial lags override: mvrvZ lag 0 → day 60 · others keep defaults", I60o.mvrvZ === 0.6 && I60o.asOf.lthRealizedPrice === iso(53) && I60o.puell === PUELL59, [I60o.mvrvZ, I60o.asOf]);
var NOLTH = S.inputsAt({ price: MAP.price, mvrvZ: MAP.mvrvZ, puell: MAP.puell }, iso(60));
t("missing series → null inputs (not 0), asOf null", NOLTH.lthCostRatio === null && NOLTH.aipRatio === null && NOLTH.lthSopr7 === null && NOLTH.lthNetPct === null && NOLTH.asOf.lthSopr7 === null && NOLTH.mvrvZ === 0.59);
t("empty / null seriesMap and invalid dates never throw — all null",
  (function () { var a = S.inputsAt({}, iso(60)), b = S.inputsAt(null, iso(60)), c = S.inputsAt(MAP, "2024-13-45"), d = S.inputsAt(MAP, null);
    return [a, b, c, d].every(function (x) { return x && x.price === null && x.mvrvZ === null && x.puell === null && x.puell7 === null && x.asOf.puell7 === null && x.lthCostRatio === null; }); })());

// maxAge: puell rows only on days 0..30 (value = 1 + day)
var STALE = { puell: ser(0, 30, function (i) { return 1 + i; }), mvrvZ: ser(0, 99, function (i) { return i / 100; }) };
t("maxAge: newest row exactly 21 days before date − lag → still a value", S.inputsAt(STALE, iso(52)).puell === 31 && S.inputsAt(STALE, iso(52)).asOf.puell === iso(30));
t("maxAge: 22 days → null (Data Unavailable)", S.inputsAt(STALE, iso(53)).puell === null && S.inputsAt(STALE, iso(53)).asOf.puell === null);
t("puell7 follows the same freshness: day 52 → only the 21-day-old row (31) · day 53 → null, asOf null",
  S.inputsAt(STALE, iso(52)).puell7 === 31 && S.inputsAt(STALE, iso(52)).asOf.puell7 === iso(30) && S.inputsAt(STALE, iso(53)).puell7 === null && S.inputsAt(STALE, iso(53)).asOf.puell7 === null);
t("opts.maxAgeDays 30 → the 22-day-old row counts again", S.inputsAt(STALE, iso(53), { maxAgeDays: 30 }).puell === 31);

// lthSopr7 edge cases
t("lthSopr7 with only 3 rows → mean of those 3 (2,4,6 → 4)", S.inputsAt({ lthSopr: [[iso(10), 2], [iso(11), 4], [iso(12), 6]] }, iso(20)).lthSopr7 === 4);
t("lthSopr7 drops rows older than maxAge from the cutoff (days 0..5 = 10, day 25 = 1 → mean of days 25, 5, 4 = 7)",
  S.inputsAt({ lthSopr: ser(0, 5, function () { return 10; }).concat([[iso(25), 1]]) }, iso(32)).lthSopr7 === 7, S.inputsAt({ lthSopr: ser(0, 5, function () { return 10; }).concat([[iso(25), 1]]) }, iso(32)).lthSopr7);
// lthNetPct edge cases
t("lthNetPct: no supply row 30 days back → null", S.inputsAt({ lthSupply: MAP.lthSupply.slice(20) }, iso(40)).lthNetPct === null);
t("lthNetPct: base row older than maxAge → null", S.inputsAt({ lthSupply: [MAP.lthSupply[0]].concat(MAP.lthSupply.slice(40)) }, iso(60)).lthNetPct === null);
t("lthNetPct: base available from day 20 → value at day 57", near(S.inputsAt({ lthSupply: MAP.lthSupply.slice(20) }, iso(57)).lthNetPct, 30000 / 1020000 * 100, 1e-12));
// final review 2026-11-26: the 30 days run from the row actually used, not from the cutoff — a stale series must not
// shrink the window, and a hole before the base must not stretch it (same rule as the page card's lthNetChange)
// final review 2026-11-26: the panel row must say the score uses the 7-day mean (the card below shows the daily value)
var RP7 = S.score(S.inputsAt(MAP, iso(60))).families.miner.members[0];
var RPRAW = S.score({ date: iso(60), mvrvZ: 1, puell: 0.9 }).families.miner.members[0];
t("Puell member label = \"Puell Multiple (เฉลี่ย 7 วัน)\" when scored on the 7-day mean · plain \"Puell Multiple\" for a raw daily value",
  RP7.label === "Puell Multiple (เฉลี่ย 7 วัน)" && RPRAW.label === "Puell Multiple", [RP7.label, RPRAW.label]);
var STALE = S.inputsAt({ lthSupply: MAP.lthSupply.slice(0, 41) }, iso(60));   // newest row day 40 = 13 days behind the cutoff (53)
t("lthNetPct on a stale series (newest row day 40) → still 30 days: (S(40) − S(10)) ÷ S(10)", near(STALE.lthNetPct, 30000 / 1010000 * 100, 1e-12) && STALE.asOf.lthSupply === iso(40) && STALE.asOf.lthSupplyBase === iso(10), [STALE.lthNetPct, STALE.asOf.lthSupply, STALE.asOf.lthSupplyBase]);
t("lthNetPct: hole before the base (no row within 7 days before day 53 − 30) → null, not a 48-day change",
  S.inputsAt({ lthSupply: MAP.lthSupply.slice(0, 6).concat(MAP.lthSupply.slice(25, 54)) }, iso(60)).lthNetPct === null);
t("lthNetPct: a base row up to 7 days before (day 16 for 53 − 30 = 23) is still used",
  near(S.inputsAt({ lthSupply: MAP.lthSupply.slice(0, 17).concat(MAP.lthSupply.slice(25, 54)) }, iso(60)).lthNetPct, 37000 / 1016000 * 100, 1e-12));

// junk rows / null values / order / duplicates
t("a null value on the newest day falls back to the previous real row (never 0)", S.inputsAt({ mvrvZ: [[iso(57), 0.57], [iso(58), 0.58], [iso(59), null]] }, iso(60)).mvrvZ === 0.58);
t("'' value is skipped too", S.inputsAt({ mvrvZ: [[iso(58), 0.58], [iso(59), ""]] }, iso(60)).mvrvZ === 0.58);
t("junk rows are dropped (null row, bad date, missing value, NaN, Infinity, boolean, object row)",
  S.inputsAt({ mvrvZ: [null, "x", [iso(1)], ["bad-date", 5], [iso(2), "abc"], [iso(3), NaN], [iso(4), Infinity], [iso(5), true], { 0: iso(6), 1: 5 }, [iso(7), 0.07]] }, iso(8)).mvrvZ === 0.07);
t("numeric strings are accepted as numbers", S.inputsAt({ mvrvZ: [[iso(9), "0.09"]] }, iso(10)).mvrvZ === 0.09);
t("unsorted input gives the same inputs as sorted", same(S.inputsAt({ price: MAP.price.slice().reverse(), mvrvZ: MAP.mvrvZ.slice().reverse() }, iso(60)), S.inputsAt({ price: MAP.price, mvrvZ: MAP.mvrvZ }, iso(60))));
t("duplicate day → the last row of that day wins", S.inputsAt({ price: [[iso(60), 1], [iso(60), 2]] }, iso(60)).price === 2);
t("price ≤ 0 is not a price (falls back to the previous day)", S.inputsAt({ price: [[iso(59), 150], [iso(60), 0]] }, iso(60)).price === 150 && S.inputsAt({ price: [[iso(59), 150], [iso(60), 0]] }, iso(60)).asOf.price === iso(59));
t("negative MVRV-Z is a real value", S.inputsAt({ mvrvZ: [[iso(59), -0.3]] }, iso(60)).mvrvZ === -0.3);

// ------------------------------------------------------------------ [4] score
console.log("== [4] score: families, weights, states, coverage ==");
// puell 0.2 is the raw day (would score 100) — the miner family must score puell7 = 1 (→ 60)
var FULLIN = { date: "2026-01-01", price: 100, mvrvZ: 1, lthCostRatio: 1.5, aipRatio: 1.1, lthSopr7: 1.5, lthNetPct: 1.5, puell: 0.2, puell7: 1 };
var R = S.score(FULLIN);
t("valuation = mean(75, 70, 60) = 68.3 · lth = mean(65, 75) = 70 · miner = 60",
  R.families.valuation.score === 68.3 && R.families.lth.score === 70 && R.families.miner.score === 60,
  [R.families.valuation.score, R.families.lth.score, R.families.miner.score]);
t("total = (40×68.33 + 35×70 + 25×60) ÷ 100 = 66.8 → 67 → Accumulation", R.total === 67 && R.state && R.state.key === "accum" && R.state.en === "Accumulation" && R.state.th === "น่าสะสม", [R.total, R.state]);
t("family weights 40/35/25 + members in plan order", R.families.valuation.weight === 40 && R.families.lth.weight === 35 && R.families.miner.weight === 25 &&
  same(R.families.valuation.members.map(function (m) { return m.key; }), ["mvrvZ", "lthCostRatio", "aipRatio"]) &&
  same(R.families.lth.members.map(function (m) { return m.key; }), ["lthSopr7", "lthNetPct"]) && same(R.families.miner.members.map(function (m) { return m.key; }), ["puell"]));
t("each member: key · label · value · score · zone · reason (Thai)", ["valuation", "lth", "miner"].every(function (f) {
  return R.families[f].members.every(function (m) { return typeof m.label === "string" && m.label && typeof m.value === "number" && typeof m.score === "number" && typeof m.zone === "string" && m.zone && typeof m.reason === "string" && /[ก-๙]/.test(m.reason); });
}));
t("full coverage: 3 families · nothing missing · not unavailable", R.coverage.families === 3 && same(R.coverage.missing, []) && R.unavailable === false);
t("reasons: Thai lines", Array.isArray(R.reasons) && R.reasons.length >= 1 && R.reasons.every(function (x) { return typeof x === "string" && /[ก-๙]/.test(x); }), R.reasons);

var R2 = S.score({ mvrvZ: 1, lthCostRatio: 1.5, aipRatio: 1.1, puell7: 1 });
t("LTH family missing → total from 2 families = (40×68.33 + 25×60) ÷ 65 = 65.1 → 65", R2.total === 65 && R2.state.key === "accum" && R2.unavailable === false && R2.families.lth.score === null, [R2.total, R2.families.lth.score]);
t("coverage says what is missing", R2.coverage.families === 2 && same(R2.coverage.missing, ["lthSopr7", "lthNetPct"]) && same(R2.coverage.missingFamilies, ["lth"]), R2.coverage);
t("reasons mention the missing data", R2.reasons.some(function (x) { return x.indexOf("ไม่มีข้อมูล") >= 0; }), R2.reasons);
t("missing members are null (value · score), reason 'ไม่มีข้อมูล'", R2.families.lth.members.every(function (m) { return m.value === null && m.score === null && m.reason.indexOf("ไม่มีข้อมูล") >= 0; }));
var R3 = S.score({ mvrvZ: 1, lthCostRatio: 1.5 });
t("only 1 family → total null · state null · unavailable (never 0)", R3.total === null && R3.state === null && R3.unavailable === true && R3.coverage.families === 1, [R3.total, R3.state, R3.unavailable]);
t("unavailable reason says 'ข้อมูลไม่พอ'", R3.reasons.some(function (x) { return x.indexOf("ข้อมูลไม่พอ") >= 0; }), R3.reasons);
t("no inputs at all → unavailable, no throw", (function () { var a = S.score(null), b = S.score({}); return a.total === null && a.unavailable === true && b.total === null && b.coverage.families === 0; })());
t("family = mean of the members it has (valuation with only MVRV-Z = its score)", S.score({ mvrvZ: 0.5, puell7: 1 }).families.valuation.score === 85);
t("null inputs do not score as 0 (mvrvZ null + puell7 → only 1 family)", S.score({ mvrvZ: null, puell7: 1, lthCostRatio: "" }).total === null);
// miner family = Puell 7-row mean under the member key "puell" (panel contract unchanged)
var MINER = S.score({ mvrvZ: 1, puell: 0.2, puell7: 1 }).families.miner.members[0];
t("miner member keeps key 'puell' but scores puell7 (value 1 → 60, not the raw 0.2 → 100) · reason says 'เฉลี่ย 7 วัน'",
  MINER.key === "puell" && MINER.value === 1 && MINER.score === 60 && MINER.reason.indexOf("เฉลี่ย 7 วัน") >= 0, MINER);
t("puell7 present but null → miner family missing even if a raw puell exists (never falls back to the noisy day)",
  (function () { var x = S.score({ mvrvZ: 1, puell: 1, puell7: null }); return x.families.miner.score === null && x.total === null && x.coverage.missing.indexOf("puell") >= 0; })());
var LEG = S.score({ mvrvZ: 1, puell: 1 }).families.miner;
t("legacy inputs without a puell7 field → scored from puell (reason does not claim a 7-day mean)", LEG.score === 60 && LEG.members[0].value === 1 && LEG.members[0].reason.indexOf("เฉลี่ย 7 วัน") < 0, LEG.members[0]);

// state boundaries through stateOf and through score()
t("stateOf boundaries 100/80/79/65/64/45/44/30/29/0", [[100, "strong"], [80, "strong"], [79, "accum"], [65, "accum"], [64, "neutral"], [45, "neutral"], [44, "risk"], [30, "risk"], [29, "hot"], [0, "hot"]].every(function (p) { var s = S.stateOf(p[0]); return s && s.key === p[1]; }));
t("stateOf(null) → null", S.stateOf(null) === null);
var B80 = S.score({ mvrvZ: 0.75, puell7: 0.68 }), B79 = S.score({ mvrvZ: 0.8, puell7: 0.696 });
t("total exactly 80 → Strong Accumulation · 79 → Accumulation", B80.total === 80 && B80.state.key === "strong" && B79.total === 79 && B79.state.key === "accum", [B80.total, B79.total]);

// core mode
var RC = S.score(FULLIN, "core");
t("core mode: valuation = MVRV-Z only (75) + miner (60), no LTH family → (40×75 + 25×60) ÷ 65 = 69", RC.total === 69 && RC.families.valuation.score === 75 && RC.families.lth === undefined && RC.state.key === "accum", [RC.total, RC.families.valuation && RC.families.valuation.score]);

// ------------------------------------------------------------------ [5] trend
console.log("== [5] trend: same rules N days earlier ==");
var TR = S.trend(MAP, iso(60), 30);
var NOW60 = S.score(S.inputsAt(MAP, iso(60))).total, THEN30 = S.score(S.inputsAt(MAP, iso(30))).total;
t("now = score at the date · then = score at date − 30 · delta = now − then", TR.now === NOW60 && TR.then === THEN30 && TR.delta === NOW60 - THEN30, [TR, NOW60, THEN30]);
// a series whose score really moves: MVRV-Z 0 until day 39, 3 from day 40 · Puell 1 throughout
var TRMAP = { mvrvZ: ser(0, 99, function (i) { return i < 40 ? 0 : 3; }), puell: ser(0, 99, function () { return 1; }) };
var TRM = S.trend(TRMAP, iso(60), 30);
t("hand-calculated: now (40×38.3 + 25×60) ÷ 65 = 47 · then (40×95 + 25×60) ÷ 65 = 82 · delta −35", TRM.now === 47 && TRM.then === 82 && TRM.delta === -35 && TRM.thenDate === iso(30), TRM);
var TRL = S.trend(MAP, iso(60), 30, { livePrice: 1000 });
t("livePrice applies to 'now' only — the past is never re-priced", TRL.now === S.score(S.inputsAt(MAP, iso(60), { livePrice: 1000 })).total && TRL.then === THEN30 && TRL.now !== TR.now, [TRL, TR]);
var TRN = S.trend({ mvrvZ: MAP.mvrvZ, puell: MAP.puell.slice(40) }, iso(60), 30);
t("no score back then → then null, delta null (never 0)", TRN.now !== null && TRN.then === null && TRN.delta === null, TRN);

// ------------------------------------------------------------------ [6] scoreSeries
console.log("== [6] scoreSeries: [date, total, stateKey] per day, same rules ==");
var SS = S.scoreSeries(MAP, { from: iso(40), to: iso(70) });
t("31 rows for 31 scorable days", SS.length === 31 && SS[0][0] === iso(40) && SS[30][0] === iso(70), [SS.length, SS[0], SS[SS.length - 1]]);
t("each row = score(inputsAt(day)) total + its state key", SS.every(function (r) { var x = S.score(S.inputsAt(MAP, r[0])); return r[1] === x.total && r[2] === x.state.key; }));
t("days without a score are skipped (one family only → no rows)", S.scoreSeries({ puell: MAP.puell }, { from: iso(10), to: iso(20) }).length === 0);
var CORE_A = S.scoreSeries(MAP, { mode: "core", from: iso(5), to: iso(90) });
var CORE_B = S.scoreSeries({ mvrvZ: MAP.mvrvZ, puell: MAP.puell }, { mode: "core", from: iso(5), to: iso(90) });
t("core ignores the LTH / Active Investor series entirely", CORE_A.length === 86 && same(CORE_A, CORE_B));
t("core totals = score(inputs, 'core')", CORE_A.every(function (r) { return r[1] === S.score(S.inputsAt(MAP, r[0]), "core").total; }));
t("history uses the smoothed Puell: the day-50 spike gives (40×75 + 25×30) ÷ 65 = 58, not 46 from the raw 8",
  same(S.scoreSeries(SPIKE, { mode: "core", from: iso(51), to: iso(51) }), [[iso(51), 58, "neutral"]]) && same(S.scoreSeries(SPIKE, { from: iso(51), to: iso(51) }), [[iso(51), 58, "neutral"]]),
  [S.scoreSeries(SPIKE, { mode: "core", from: iso(51), to: iso(51) }), S.scoreSeries(SPIKE, { from: iso(51), to: iso(51) })]);
t("full ≠ core when LTH data exists", !same(S.scoreSeries(MAP, { from: iso(60), to: iso(60) }), S.scoreSeries(MAP, { mode: "core", from: iso(60), to: iso(60) })));
t("livePrice in opts is ignored for history rows", same(S.scoreSeries(MAP, { from: iso(40), to: iso(70), opts: { livePrice: 1000 } }), SS));
var DEF = S.scoreSeries(MAP);
t("default range: first scorable day (day 1: MVRV-Z + Puell after their 1-day lag) → newest data day (99)", DEF.length && DEF[0][0] === iso(1) && DEF[DEF.length - 1][0] === iso(99), [DEF[0], DEF[DEF.length - 1]]);
var LATE = { mvrvZ: MAP.mvrvZ, puell: MAP.puell, lthSopr: MAP.lthSopr.slice(50), lthSupply: MAP.lthSupply.slice(50), lthRealizedPrice: MAP.lthRealizedPrice.slice(50), activeInvestorPrice: MAP.activeInvestorPrice.slice(50), price: MAP.price };
t("default range (full) starts when every given series has started (day 50 = the ~4-year LTH window)", S.scoreSeries(LATE)[0][0] === iso(50), S.scoreSeries(LATE)[0]);
t("default range (core) starts with MVRV-Z + Puell", S.scoreSeries(LATE, { mode: "core" })[0][0] === iso(1));
t("scoreSeries does not mutate the series", same(MAP, MAP_COPY));

// ------------------------------------------------------------------ [7] no look-ahead
console.log("== [7] point-in-time: appending future rows changes nothing earlier ==");
function cut(map, last) { var o = {}; Object.keys(map).forEach(function (k) { o[k] = map[k].filter(function (r) { return r[0] <= last; }); }); return o; }
var PAST = cut(MAP, iso(79));
var FUT = cut(MAP, iso(79));
// poisoned future: extreme values that would flip every score if they leaked into an earlier day
FUT.price = FUT.price.concat(ser(80, 99, function () { return 1e6; }));
FUT.mvrvZ = FUT.mvrvZ.concat(ser(80, 99, function () { return 20; }));
FUT.puell = FUT.puell.concat(ser(80, 99, function () { return 9; }));
FUT.lthSopr = FUT.lthSopr.concat(ser(80, 99, function () { return 50; }));
FUT.lthSupply = FUT.lthSupply.concat(ser(80, 99, function () { return 1; }));
FUT.lthRealizedPrice = FUT.lthRealizedPrice.concat(ser(80, 99, function () { return 1e-3; }));
FUT.activeInvestorPrice = FUT.activeInvestorPrice.concat(ser(80, 99, function () { return 1e-3; }));
var leak = [];
for (var d = 0; d <= 79; d++) { if (!same(S.inputsAt(PAST, iso(d)), S.inputsAt(FUT, iso(d)))) leak.push(iso(d)); }
t("inputsAt identical on all 80 earlier days", leak.length === 0, leak.slice(0, 5));
t("scoreSeries (full) identical up to the cut", same(S.scoreSeries(PAST, { from: iso(0), to: iso(79) }), S.scoreSeries(FUT, { from: iso(0), to: iso(79) })));
t("scoreSeries (core) identical up to the cut", same(S.scoreSeries(PAST, { mode: "core", from: iso(0), to: iso(79) }), S.scoreSeries(FUT, { mode: "core", from: iso(0), to: iso(79) })));
t("trend identical up to the cut", same(S.trend(PAST, iso(79), 30), S.trend(FUT, iso(79), 30)));
t("the poisoned future really is different (sanity: day 99 differs)", !same(S.inputsAt(PAST, iso(99)), S.inputsAt(FUT, iso(99))));
// the lag itself: rows newer than date − lag must not be read
function setVal(series, day, v) { return series.map(function (r) { return r[0] === iso(day) ? [r[0], v] : r; }); }
var LAG6 = clone(MAP); for (var k6 = 54; k6 <= 60; k6++) { LAG6.lthSopr = setVal(LAG6.lthSopr, k6, 99); LAG6.lthRealizedPrice = setVal(LAG6.lthRealizedPrice, k6, 1); LAG6.lthSupply = setVal(LAG6.lthSupply, k6, 5); LAG6.mvrvZ = k6 === 60 ? setVal(LAG6.mvrvZ, 60, 50) : LAG6.mvrvZ; LAG6.puell = k6 === 60 ? setVal(LAG6.puell, 60, 50) : LAG6.puell; }
t("changing BGeometrics rows of days 54..60 (inside the 7-day lag) and MVRV-Z/Puell of day 60 does not change day 60", same(S.inputsAt(LAG6, iso(60)), S.inputsAt(MAP, iso(60))));
var LAG7 = clone(MAP); LAG7.lthSopr = setVal(LAG7.lthSopr, 53, 99);
t("…but changing day 53 (= date − 7) does", !same(S.inputsAt(LAG7, iso(60)).lthSopr7, S.inputsAt(MAP, iso(60)).lthSopr7));

// ------------------------------------------------------------------ [8] backtest
console.log("== [8] backtest: hand-calculated returns, drawdowns, episodes ==");
var BP = [100, 120, 90, 110, 130, 80, 140, 150, 70, 160].map(function (p, i) { return [iso(i, "2020-01-01"), p]; });
var BR = [[0, 85, "strong"], [1, 82, "strong"], [2, 70, "accum"], [3, 50, "neutral"], [4, 35, "risk"], [5, 20, "hot"], [6, 25, "hot"], [7, 81, "strong"]].map(function (r) { return [iso(r[0], "2020-01-01"), r[1], r[2]]; });
var BR_COPY = clone(BR), BP_COPY = clone(BP);
var BT = S.backtest(BR, BP, { horizons: [3, 5] });
var st = BT.byState;
t("byState has all 5 states", same(Object.keys(st).sort(), ["accum", "hot", "neutral", "risk", "strong"]), Object.keys(st));
t("strong: 3 days · 1 episode (gaps 1 and 6 days ≤ 7)", st.strong.days === 3 && st.strong.episodes === 1, st.strong);
t("strong h3: n 2 (day 7 incomplete) · median (0.10 + 0.0833)/2 = 0.0917 · posPct 100 · medianMaxDD (−0.10, −0.25) = −0.175",
  same(st.strong.h3, { n: 2, median: 0.0917, posPct: 100, medianMaxDD: -0.175 }), st.strong.h3);
t("strong h5: median (−0.20 + 0.1667)/2 = −0.0167 · posPct 50 · medianMaxDD (−0.20, −0.3333) = −0.2667",
  same(st.strong.h5, { n: 2, median: -0.0167, posPct: 50, medianMaxDD: -0.2667 }), st.strong.h5);
t("accum (day 2): h3 −0.1111 / DD −0.1111 · h5 +0.6667 / DD −0.1111",
  same(st.accum.h3, { n: 1, median: -0.1111, posPct: 0, medianMaxDD: -0.1111 }) && same(st.accum.h5, { n: 1, median: 0.6667, posPct: 100, medianMaxDD: -0.1111 }), [st.accum.h3, st.accum.h5]);
t("neutral (day 3): h3 +0.2727 / −0.2727 · h5 −0.3636 / −0.3636",
  same(st.neutral.h3, { n: 1, median: 0.2727, posPct: 100, medianMaxDD: -0.2727 }) && same(st.neutral.h5, { n: 1, median: -0.3636, posPct: 0, medianMaxDD: -0.3636 }), [st.neutral.h3, st.neutral.h5]);
t("risk (day 4): h3 +0.1538 / −0.3846 · h5 +0.2308 / −0.4615",
  same(st.risk.h3, { n: 1, median: 0.1538, posPct: 100, medianMaxDD: -0.3846 }) && same(st.risk.h5, { n: 1, median: 0.2308, posPct: 100, medianMaxDD: -0.4615 }), [st.risk.h3, st.risk.h5]);
t("hot (days 5, 6): h3 median 0.0089 · posPct 50 · DD −0.3125 · h5 none complete → n 0 and nulls (never 0)",
  st.hot.days === 2 && same(st.hot.h3, { n: 2, median: 0.0089, posPct: 50, medianMaxDD: -0.3125 }) && same(st.hot.h5, { n: 0, median: null, posPct: null, medianMaxDD: null }), [st.hot.h3, st.hot.h5]);
t("from / to = the rows' first and last day", BT.from === iso(0, "2020-01-01") && BT.to === iso(7, "2020-01-01"), [BT.from, BT.to]);
t("note (Thai) says windows overlap and thresholds are in-sample", typeof BT.note === "string" && BT.note.indexOf("ซ้อน") >= 0 && BT.note.indexOf("in-sample") >= 0, BT.note);
t("PEAK_NOTE (exported, Thai) — each cycle's peak was lower, fixed anchors can under-call a new top (2025-10 read Neutral) — is part of the note",
  typeof S.PEAK_NOTE === "string" && /[ก-๙]/.test(S.PEAK_NOTE) && S.PEAK_NOTE.indexOf("2025-10") >= 0 && S.PEAK_NOTE.indexOf("Neutral") >= 0 && BT.note.indexOf(S.PEAK_NOTE) >= 0, S.PEAK_NOTE);
t("backtest does not mutate rows or prices", same(BR, BR_COPY) && same(BP, BP_COPY));
t("unsorted rows give the same result", same(S.backtest(BR.slice().reverse(), BP, { horizons: [3, 5] }), BT));
t("default horizons = 180 and 365", (function () { var x = S.backtest(BR, BP); return x.byState.strong.h180 && x.byState.strong.h365 && x.byState.strong.h180.n === 0 && x.byState.strong.h365.median === null; })());
// exit = first price on/after d+h (gap in prices) · drawdown window (d, d+h] · drawdown never positive
var GAPP = [[iso(0, "2020-03-01"), 100], [iso(1, "2020-03-01"), 90], [iso(2, "2020-03-01"), 95], [iso(5, "2020-03-01"), 130], [iso(6, "2020-03-01"), 120]];
var GBT = S.backtest([[iso(0, "2020-03-01"), 90, "strong"]], GAPP, { horizons: [3] });
t("no price on d+3 → the first price after it (day 5): +30% · drawdown inside (d, d+3] = −10%", same(GBT.byState.strong.h3, { n: 1, median: 0.3, posPct: 100, medianMaxDD: -0.1 }), GBT.byState.strong.h3);
var UPP = [[iso(0, "2020-04-01"), 100], [iso(1, "2020-04-01"), 110], [iso(2, "2020-04-01"), 120], [iso(3, "2020-04-01"), 130]];
t("never below the entry → max drawdown 0 (not positive)", S.backtest([[iso(0, "2020-04-01"), 90, "strong"]], UPP, { horizons: [2] }).byState.strong.h2.medianMaxDD === 0);
// episodes: a gap ≤ 7 days joins, > 7 days splits
function rowsOf(list) { return list.map(function (r) { return [r[0], 50, r[1]]; }); }
var EP = rowsOf([["2020-02-01", "strong"], ["2020-02-02", "strong"], ["2020-02-03", "strong"], ["2020-02-04", "accum"], ["2020-02-05", "accum"], ["2020-02-06", "accum"],
  ["2020-02-07", "neutral"], ["2020-02-08", "neutral"], ["2020-02-09", "neutral"], ["2020-02-10", "accum"], ["2020-02-11", "accum"], ["2020-02-12", "accum"], ["2020-02-13", "accum"],
  ["2020-02-14", "strong"], ["2020-02-15", "strong"], ["2020-03-01", "hot"], ["2020-03-08", "hot"], ["2020-03-01", "risk"], ["2020-03-09", "risk"]]);
var EB = S.backtest(EP, null, { horizons: [3] }).byState;
t("strong 5 days in 2 episodes (11-day gap splits)", EB.strong.days === 5 && EB.strong.episodes === 2, EB.strong);
t("accum 7 days in 1 episode (4-day gap joins)", EB.accum.days === 7 && EB.accum.episodes === 1, EB.accum);
t("gap of exactly 7 days joins (hot: 1) · 8 days splits (risk: 2)", EB.hot.episodes === 1 && EB.risk.episodes === 2, [EB.hot, EB.risk]);
t("no prices → returns n 0 / null, days still counted", EB.neutral.days === 3 && EB.neutral.h3.n === 0 && EB.neutral.h3.median === null);
t("rows with an unknown state key are ignored", S.backtest([[iso(0, "2020-01-01"), 50, "nope"], [iso(1, "2020-01-01"), null, null]], BP, { horizons: [3] }).byState.strong.days === 0);

// ------------------------------------------------------------------ [9] cycleMarkers
console.log("== [9] cycleMarkers on real multi-cycle closes ==");
// Coin Metrics PriceUSD, 2012-06 → 2026-11-25: per calendar month only the highest and the lowest close
// (true dates kept) — every cycle extreme survives this reduction exactly. 348 rows.
var REAL_PX = [
  ["2012-06-03",5.21],["2012-06-20",6.69],["2012-07-03",6.45],["2012-07-31",9.32],["2012-08-16",13.45],["2012-08-19",7.83],
  ["2012-09-01",10.01],["2012-09-19",12.5],["2012-10-03",12.96],["2012-10-26",10.13],["2012-11-02",10.53],["2012-11-30",12.59],
  ["2012-12-02",12.5],["2012-12-13",13.76],["2013-01-02",13.28],["2013-01-31",20.51],["2013-02-02",19.64],["2013-02-28",33.38],
  ["2013-03-02",34.14],["2013-03-31",93.9],["2013-04-09",230.68],["2013-04-16",68.28],["2013-05-03",96.32],["2013-05-26",130.16],
  ["2013-06-01",128.79],["2013-06-29",88.8],["2013-07-06",66.34],["2013-07-31",98.02],["2013-08-09",92.47],["2013-08-31",128.38],
  ["2013-09-01",130.54],["2013-09-06",117.86],["2013-10-02",104.11],["2013-10-23",204.6],["2013-11-01",203.04],["2013-11-29",1128.73],
  ["2013-12-04",1134.93],["2013-12-18",526.12],["2014-01-06",914.46],["2014-01-27",742.7],["2014-02-02",814.49],["2014-02-25",533.71],
  ["2014-03-03",676.51],["2014-03-31",455.36],["2014-04-10",366.91],["2014-04-16",531.48],["2014-05-06",430.13],["2014-05-31",627.89],
  ["2014-06-03",672.39],["2014-06-25",562.24],["2014-07-02",651.3],["2014-07-30",562.91],["2014-08-01",596.51],["2014-08-18",468.96],
  ["2014-09-04",489.56],["2014-09-29",373.06],["2014-10-05",322.83],["2014-10-14",400.88],["2014-11-02",324.25],["2014-11-12",422.59],
  ["2014-12-02",382.95],["2014-12-30",310.44],["2015-01-02",315.94],["2015-01-14",175.64],["2015-02-05",217.01],["2015-02-14",257.63],
  ["2015-03-11",296.69],["2015-03-29",242.97],["2015-04-05",261.11],["2015-04-14",219.76],["2015-05-08",244.38],["2015-05-31",229.45],
  ["2015-06-01",223.28],["2015-06-30",263.85],["2015-07-02",254.75],["2015-07-12",311.48],["2015-08-04",285.29],["2015-08-24",211.96],
  ["2015-09-08",244.17],["2015-09-21",226.77],["2015-10-02",237.94],["2015-10-30",328.49],["2015-11-04",405.48],["2015-11-11",308.92],
  ["2015-12-02",359.22],["2015-12-15",464.62],["2016-01-07",459.21],["2016-01-31",366.34],["2016-02-03",368.1],["2016-02-20",440.2],
  ["2016-03-01",432.81],["2016-03-05",397.31],["2016-04-01",417.2],["2016-04-26",469.61],["2016-05-19",437.72],["2016-05-30",533.49],
  ["2016-06-01",537.61],["2016-06-16",767.42],["2016-07-02",702.74],["2016-07-31",624.8],["2016-08-01",606.51],["2016-08-02",526.98],
  ["2016-09-01",572.22],["2016-09-08",630.55],["2016-10-04",610.01],["2016-10-29",715.45],["2016-11-03",689.94],["2016-11-19",751.21],
  ["2016-12-05",752.67],["2016-12-28",979.96],["2017-01-04",1134.5],["2017-01-11",788.31],["2017-02-09",982.75],["2017-02-27",1194.15],
  ["2017-03-03",1289.36],["2017-03-24",935.06],["2017-04-01",1089.52],["2017-04-30",1381.96],["2017-05-01",1436.94],["2017-05-24",2415.01],
  ["2017-06-01",2399.89],["2017-06-11",2974.21],["2017-07-16",1910.75],["2017-07-31",2862.61],["2017-08-02",2690.15],["2017-08-31",4740.36],
  ["2017-09-01",4918.17],["2017-09-14",3247.47],["2017-10-04",4216.68],["2017-10-31",6428.51],["2017-11-12",5829.1],["2017-11-30",9996.71],
  ["2017-12-01",10808.96],["2017-12-16",19640.51],["2018-01-06",17103.59],["2018-01-30",9959.55],["2018-02-05",6849.54],["2018-02-20",11245.93],
  ["2018-03-05",11540.66],["2018-03-30",6832.15],["2018-04-06",6610.49],["2018-04-24",9652.21],["2018-05-05",9795.93],["2018-05-28",7110.82],
  ["2018-06-03",7702.16],["2018-06-28",5858.64],["2018-07-12",6159.47],["2018-07-24",8397.62],["2018-08-01",7596.7],["2018-08-10",6135.75],
  ["2018-09-04",7358.81],["2018-09-08",6187.79],["2018-10-08",6604.69],["2018-10-11",6159.25],["2018-11-07",6500.87],["2018-11-26",3700.29],
  ["2018-12-01",4148.07],["2018-12-15",3185.07],["2019-01-06",4045.99],["2019-01-29",3395.82],["2019-02-07",3358.87],["2019-02-23",4110.15],
  ["2019-03-04",3698.16],["2019-03-31",4094.32],["2019-04-01",4138.42],["2019-04-23",5544.86],["2019-05-01",5315.18],["2019-05-27",8816.79],
  ["2019-06-09",7634.07],["2019-06-26",12863.46],["2019-07-09",12579.11],["2019-07-27",9446.67],["2019-08-07",11967.27],["2019-08-29",9482.31],
  ["2019-09-03",10618.78],["2019-09-29",8064.51],["2019-10-24",7454.37],["2019-10-27",9558.16],["2019-11-04",9418.36],["2019-11-24",6943.38],
  ["2019-12-06",7534.21],["2019-12-17",6608.96],["2020-01-02",6946.83],["2020-01-30",9508.92],["2020-02-14",10361.62],["2020-02-29",8582.09],
  ["2020-03-06",9147.09],["2020-03-12",4959.31],["2020-04-15",6625.48],["2020-04-29",8761.84],["2020-05-07",9993.75],["2020-05-11",8591.65],
  ["2020-06-01",10199.14],["2020-06-27",9002.17],["2020-07-03",9066.69],["2020-07-31",11338.2],["2020-08-02",11094.02],["2020-08-17",12315.76],
  ["2020-09-01",11970.36],["2020-09-08",10108.64],["2020-10-03",10555.71],["2020-10-31",13807.23],["2020-11-02",13595.56],["2020-11-30",19664.41],
  ["2020-12-11",18061.76],["2020-12-31",29022.67],["2021-01-01",29380.69],["2021-01-08",40775.4],["2021-02-01",33570.27],["2021-02-21",57500.72],
  ["2021-03-02",48304.71],["2021-03-13",61288.79],["2021-04-13",63445.64],["2021-04-25",48946.94],["2021-05-08",58736.13],["2021-05-29",34681.82],
  ["2021-06-14",40455.6],["2021-06-25",31683.5],["2021-07-20",29766.66],["2021-07-31",41793.31],["2021-08-03",38288.83],["2021-08-23",49590.88],
  ["2021-09-06",52640.59],["2021-09-21",40526.49],["2021-10-02",47792.44],["2021-10-20",66061.8],["2021-11-08",67541.76],["2021-11-26",53800.62],
  ["2021-12-01",57180.61],["2021-12-17",46334.48],["2022-01-01",47560.01],["2022-01-22",34996.39],["2022-02-02",36942.33],["2022-02-15",44511.91],
  ["2022-03-13",37808.32],["2022-03-29",47463.71],["2022-04-04",46663],["2022-04-30",37714.09],["2022-05-04",39641.85],["2022-05-27",28612.04],
  ["2022-06-06",31333.68],["2022-06-18",19013.87],["2022-07-02",19231.83],["2022-07-29",23950.74],["2022-08-13",24426.22],["2022-08-28",19673.54],
  ["2022-09-12",22365.21],["2022-09-21",18506.76],["2022-10-02",19015.29],["2022-10-29",20803.9],["2022-11-05",21283.47],["2022-11-09",15758.29],
  ["2022-12-14",17809.72],["2022-12-19",16424.13],["2023-01-01",16606.75],["2023-01-29",23775],["2023-02-10",21620.57],["2023-02-20",24797.84],
  ["2023-03-10",20240.41],["2023-03-31",28514.68],["2023-04-14",30458.97],["2023-04-21",27292.02],["2023-05-05",29552.97],["2023-05-24",26341.43],
  ["2023-06-14",25097.59],["2023-06-27",30667.08],["2023-07-13",31434.74],["2023-07-24",29178.36],["2023-08-08",29779.51],["2023-08-31",25954.87],
  ["2023-09-11",25135.04],["2023-09-19",27215.05],["2023-10-12",26741.34],["2023-10-31",34636.43],["2023-11-03",34708.22],["2023-11-29",37846.85],
  ["2023-12-01",38703.55],["2023-12-08",44205.05],["2024-01-08",46981.32],["2024-01-22",39577.1],["2024-02-04",42576.29],["2024-02-28",62460.74],
  ["2024-03-13",73081.58],["2024-03-19",61969.31],["2024-04-08",71712.8],["2024-04-30",60636.33],["2024-05-01",58141.78],["2024-05-20",71202.2],
  ["2024-06-05",71087.44],["2024-06-24",60258.96],["2024-07-07",56112.57],["2024-07-28",68170.67],["2024-08-01",65178.06],["2024-08-05",54343.63],
  ["2024-09-06",53838.95],["2024-09-28",65770.53],["2024-10-10",60221.12],["2024-10-29",72678.79],["2024-11-04",67779.1],["2024-11-22",98938.35],
  ["2024-12-17",106115.91],["2024-12-30",92523.16],["2025-01-09",92346.17],["2025-01-21",105987.89],["2025-02-03",101582.41],["2025-02-26",83987.9],
  ["2025-03-02",94328.01],["2025-03-10",79005.96],["2025-04-08",76351.43],["2025-04-28",95066.02],["2025-05-04",94377.79],["2025-05-22",111477.01],
  ["2025-06-09",110198.16],["2025-06-22",100899.23],["2025-07-01",105566.36],["2025-07-22",120068.01],["2025-08-13",123442.68],["2025-08-31",108316.45],
  ["2025-09-01",108992.32],["2025-09-18",117014.43],["2025-10-06",124824.45],["2025-10-17",106625.67],["2025-11-02",110389.17],["2025-11-22",84775],
  ["2025-12-03",93609.09],["2025-12-18",85434.19],["2026-01-14",97043.99],["2026-01-31",78702.39],["2026-02-02",78716.6],["2026-02-05",63494.69],
  ["2026-03-01",65733.52],["2026-03-16",74723.96],["2026-04-03",66891.74],["2026-04-26",78538.77],["2026-05-10",82256.78],["2026-05-29",73322.9],
  ["2026-06-01",71328.73],["2026-06-30",58525.08],["2026-07-01",60065.6],["2026-07-21",66403.1],["2026-08-01",62751.88],["2026-08-27",80297.4],
  ["2026-09-15",75650.43],["2026-09-21",86505.3],["2026-10-04",86520.8],["2026-10-30",77109.59],["2026-11-04",80487.59],["2026-11-20",58851.02]
];
var REAL_COPY = clone(REAL_PX);
var MK = S.cycleMarkers(REAL_PX);
var EXPECT_MK = [
  { date: "2013-12-04", type: "top", price: 1134.93, provisional: false },
  { date: "2015-01-14", type: "bottom", price: 175.64, provisional: false },
  { date: "2017-12-16", type: "top", price: 19640.51, provisional: false },
  { date: "2018-12-15", type: "bottom", price: 3185.07, provisional: false },
  { date: "2021-11-08", type: "top", price: 67541.76, provisional: false },
  { date: "2022-11-09", type: "bottom", price: 15758.29, provisional: false },
  { date: "2025-10-06", type: "top", price: 124824.45, provisional: true },
  { date: "2026-06-30", type: "bottom", price: 58525.08, provisional: true }
];
t("4 halving cycles → 4 tops + 4 bottoms at the known extremes · current cycle provisional", same(MK, EXPECT_MK), MK);
t("cycle 3 top is 2021-11-08, NOT the higher pre-halving close of 2024-03-13 (73,081.58 > 67,541.76)",
  MK.some(function (m) { return m.date === "2021-11-08" && m.type === "top"; }) && !MK.some(function (m) { return m.date === "2024-03-13"; }));
t("nothing marked before the first halving (2012 rows)", MK.every(function (m) { return m.date >= "2012-11-28"; }));
t("cycleMarkers does not mutate the prices", same(REAL_PX, REAL_COPY));
var MK18 = S.cycleMarkers(REAL_PX.filter(function (r) { return r[0] >= "2018-01-01"; }));
t("history starting mid-cycle (2018) → that cycle is skipped, later cycles unchanged", same(MK18, EXPECT_MK.slice(4)), MK18);
var MKEND = S.cycleMarkers(REAL_PX.filter(function (r) { return r[0] <= "2018-06-30"; }));
t("history ending mid-cycle → that cycle is provisional (top 2017-12-16 · bottom so far 2018-06-28)", same(MKEND, EXPECT_MK.slice(0, 2).concat([
  { date: "2017-12-16", type: "top", price: 19640.51, provisional: true }, { date: "2018-06-28", type: "bottom", price: 5858.64, provisional: true }])), MKEND);
var RISE = ser(0, 274, function (i) { return 60000 + 100 * i; }, "2024-04-01");
var MKR = S.cycleMarkers(RISE);
t("current cycle still rising → provisional top on the last close, no bottom", MKR.length === 1 && MKR[0].type === "top" && MKR[0].date === RISE[RISE.length - 1][0] && MKR[0].provisional === true, MKR);
var TOPPX = RISE[RISE.length - 1][1];
var DIP10 = RISE.concat(ser(275, 284, function (i) { return TOPPX * (1 - 0.01 * (i - 274)); }, "2024-04-01"));
var DIP25 = DIP10.concat(ser(285, 300, function (i) { return TOPPX * (0.9 - 0.01 * (i - 284)); }, "2024-04-01"));
t("a dip under 20% from the top is not a 'bottom'", S.cycleMarkers(DIP10).length === 1);
t("a 25% drop → provisional bottom at its low", (function () { var m = S.cycleMarkers(DIP25); return m.length === 2 && m[1].type === "bottom" && near(m[1].price, TOPPX * 0.74, 1e-6) && m[1].provisional === true; })(), S.cycleMarkers(DIP25));
t("empty / null / junk / pre-2012 only → []", same(S.cycleMarkers([]), []) && same(S.cycleMarkers(null), []) && same(S.cycleMarkers([[null, 1], ["x", "y"]]), []) && same(S.cycleMarkers([["2011-06-08", 29], ["2011-11-18", 2]]), []));

// ------------------------------------------------------------------ [10] answers
console.log("== [10] answers: 5 questions, every path ==");
var IDS = ["lthCost", "lthFlow", "lthProfit", "value", "cycle"];
var TONES = ["green", "gray", "amber", "red"];
var CHEAP = { date: "2026-11-26", price: 60000, mvrvZ: 0.22, lthCostRatio: 0.9, aipRatio: 0.8, lthSopr7: 0.95, lthNetPct: 2, puell: 0.77,
  asOf: { price: "2026-11-26", mvrvZ: "2026-11-25", lthCostRatio: "2026-11-19", aipRatio: "2026-11-19", lthSopr7: "2026-11-19", lthNetPct: "2026-11-19", puell: "2026-11-25" },
  raw: { lthRealizedPrice: 66666.67, activeInvestorPrice: 75000, lthSopr: 0.97, lthSupply: 14000000, lthSupplyBase: 13725490 } };
var CTX = { inputs: CHEAP, result: S.score(CHEAP), valuationZone: { key: "accum", thai: "โซนสะสม" }, intelCycle: "Accumulation", priceSeries: REAL_PX, today: "2026-11-26" };
var A = S.answers(CTX);
function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
t("5 answers in plan order, each { id, q, a, tone, evidence }", Array.isArray(A) && same(A.map(function (x) { return x.id; }), IDS) &&
  A.every(function (x) { return typeof x.q === "string" && /[ก-๙]/.test(x.q) && typeof x.a === "string" && x.a && TONES.indexOf(x.tone) >= 0 && typeof x.evidence === "string"; }), A);
t("below LTH cost: 'ใต้ต้นทุน' −10.0% · green · evidence has both prices", byId(A, "lthCost").a.indexOf("ใต้ต้นทุน") >= 0 && byId(A, "lthCost").a.indexOf("10.0%") >= 0 && byId(A, "lthCost").tone === "green" && byId(A, "lthCost").evidence.indexOf("$60,000") >= 0 && byId(A, "lthCost").evidence.indexOf("$66,667") >= 0, byId(A, "lthCost"));
t("LTH supply +2% in 30 days → 'สะสม' · green", byId(A, "lthFlow").a.indexOf("สะสม") >= 0 && byId(A, "lthFlow").tone === "green", byId(A, "lthFlow"));
t("LTH-SOPR 0.95 → 'ขายขาดทุน' · green", byId(A, "lthProfit").a.indexOf("ขาดทุน") >= 0 && byId(A, "lthProfit").tone === "green", byId(A, "lthProfit"));
t("valuation family 92.7 → 'ถูกมาก' · green", byId(A, "value").a.indexOf("ถูก") >= 0 && byId(A, "value").tone === "green" && byId(A, "value").evidence.indexOf("MVRV") >= 0, byId(A, "value"));
t("cycle: Valuation Zone + Intelligence · 950 days after the 2024-04-20 halving · 51.9% below the top close", byId(A, "cycle").a.indexOf("โซนสะสม") >= 0 && byId(A, "cycle").a.indexOf("Accumulation") >= 0 && byId(A, "cycle").tone === "green" &&
  byId(A, "cycle").evidence.indexOf("950") >= 0 && byId(A, "cycle").evidence.indexOf("51.9%") >= 0 && byId(A, "cycle").evidence.indexOf("2025-10-06") >= 0, byId(A, "cycle"));

var HOT = { date: "2026-11-26", price: 200000, mvrvZ: 6, lthCostRatio: 4, aipRatio: 2.5, lthSopr7: 8, lthNetPct: -2, puell: 3 };
var AH = S.answers({ inputs: HOT, valuationZone: { key: "overheated", thai: "โซนร้อนเกินไป" }, intelCycle: "Distribution", priceSeries: REAL_PX, today: "2026-11-26" });
t("hot: above LTH cost +300.0% red · selling clearly red · big profits red · very expensive red · overheated zone red",
  byId(AH, "lthCost").a.indexOf("เหนือต้นทุน") >= 0 && byId(AH, "lthCost").a.indexOf("300.0%") >= 0 && byId(AH, "lthCost").tone === "red" &&
  byId(AH, "lthFlow").a.indexOf("ขายออก") >= 0 && byId(AH, "lthFlow").tone === "red" && byId(AH, "lthProfit").tone === "red" &&
  byId(AH, "value").a.indexOf("แพง") >= 0 && byId(AH, "value").tone === "red" && byId(AH, "cycle").tone === "red", AH);
t("no result in ctx → computed from the inputs", byId(AH, "value").evidence.indexOf("/100") >= 0);
t("price above the previous top close → no 'below the top' percentage", byId(AH, "cycle").evidence.indexOf("ยอด") >= 0 && byId(AH, "cycle").evidence.indexOf("ต่ำกว่ายอด") < 0, byId(AH, "cycle").evidence);
var MID = { date: "2026-11-26", price: 60000, lthCostRatio: 3, lthNetPct: -1, lthSopr7: 2 };
var AM = S.answers({ inputs: MID, today: "2026-11-26" });
t("amber / grey middle paths (cost ratio 3 → amber · −1% → 'ขายออกเล็กน้อย' amber · SOPR 2 → grey)",
  byId(AM, "lthCost").tone === "amber" && byId(AM, "lthFlow").a.indexOf("ขายออกเล็กน้อย") >= 0 && byId(AM, "lthFlow").tone === "amber" && byId(AM, "lthProfit").tone === "gray" && byId(AM, "lthProfit").a.indexOf("ข้อมูลไม่พอ") < 0, AM);
t("cost ratio 2.2 → grey · LTH supply +0.1% → 'ทรงตัว' grey",
  byId(S.answers({ inputs: { lthCostRatio: 2.2, price: 1 } }), "lthCost").tone === "gray" && byId(S.answers({ inputs: { lthNetPct: 0.1 } }), "lthFlow").a.indexOf("ทรงตัว") >= 0 && byId(S.answers({ inputs: { lthNetPct: 0.1 } }), "lthFlow").tone === "gray");
var AE = S.answers({ inputs: { date: "2026-11-26" }, today: "2026-11-26" });
t("missing data → 'ข้อมูลไม่พอ' grey for all five", AE.length === 5 && AE.every(function (x) { return x.a === "ข้อมูลไม่พอ" && x.tone === "gray"; }), AE);
t("cycle without zone/intel still shows the halving count as evidence", byId(AE, "cycle").evidence.indexOf("950") >= 0, byId(AE, "cycle").evidence);
t("answers() / answers(null) / answers({}) never throw → 5 grey answers", [S.answers(), S.answers(null), S.answers({})].every(function (x) { return x.length === 5 && x.every(function (y) { return y.a === "ข้อมูลไม่พอ" && y.tone === "gray"; }); }));
t("ctx.result wins over the inputs for 'ถูก/แพง' (valuation 20 → red)", byId(S.answers({ inputs: CHEAP, result: { families: { valuation: { score: 20, members: [] } } } }), "value").tone === "red");
t("intel cycle alone sets the cycle tone (Distribution red · Late Expansion amber · Expansion grey · Early Expansion green)",
  byId(S.answers({ intelCycle: "Distribution" }), "cycle").tone === "red" && byId(S.answers({ intelCycle: "Late Expansion" }), "cycle").tone === "amber" &&
  byId(S.answers({ intelCycle: "Expansion" }), "cycle").tone === "gray" && byId(S.answers({ intelCycle: "Early Expansion" }), "cycle").tone === "green" && byId(S.answers({ intelCycle: "Distribution" }), "cycle").a.indexOf("Distribution") >= 0);

// 2026-11-26 (user: "เห็นรูปแล้วรู้เลยว่าถูกหรือแพง") — every answer carries a 0–100 position for the gauge
console.log("== [10b] answers: score for the gauge ==");
t("every answer has a score key (number or null)", A.every(function (x) { return "score" in x && (x.score === null || typeof x.score === "number"); }), A.map(function (x) { return x.score; }));
t("Q1–Q3 score = the indicator's own sub-score · Q4 = the valuation family score",
  byId(A, "lthCost").score === S.subScore("lthCostRatio", 0.9) && byId(A, "lthFlow").score === S.subScore("lthNetPct", 2) &&
  byId(A, "lthProfit").score === S.subScore("lthSopr7", 0.95) && byId(A, "value").score === CTX.result.families.valuation.score,
  A.map(function (x) { return x.id + ":" + x.score; }));
var ZS = { deep: 90, accum: 75, recovery: 55, expansion: 37, overheated: 15 };
var CS = { "Capitulation": 90, "Accumulation": 75, "Early Expansion": 68, "Expansion": 55, "Late Expansion": 37, "Distribution": 15 };
t("Q5 score from the Valuation Zone (deep 90 · accum 75 · recovery 55 · expansion 37 · overheated 15)",
  Object.keys(ZS).every(function (k) { return byId(S.answers({ valuationZone: { key: k, thai: k } }), "cycle").score === ZS[k]; }));
t("Q5 without a zone → from the Intelligence cycle (Capitulation 90 … Distribution 15)",
  Object.keys(CS).every(function (k) { return byId(S.answers({ intelCycle: k }), "cycle").score === CS[k]; }));
// review 2026-11-26 (M1): a green "ถูก" beside "Intelligence: Distribution" contradicts itself — both known → their mean
var Q5MIX = byId(S.answers({ valuationZone: { key: "accum", thai: "โซนสะสม" }, intelCycle: "Distribution" }), "cycle");
t("Q5 zone and cycle disagree (accum 75 · Distribution 15) → the needle sits between them (45, grey) and the evidence says they disagree",
  Q5MIX.score === 45 && Q5MIX.tone === "gray" && /ไม่ตรงกัน/.test(Q5MIX.evidence), Q5MIX);
t("Q5 zone and cycle agree (accum · Accumulation) → 75 green, no disagreement note", byId(A, "cycle").score === 75 && byId(A, "cycle").tone === "green" && !/ไม่ตรงกัน/.test(byId(A, "cycle").evidence));
// review 2026-11-26 (M2): Q4's short answer uses the gauge word's cut-offs — "แพง" above "แพงมาก" no more
function q4(s) { return byId(S.answers({ result: { families: { valuation: { score: s, members: [] } } } }), "value"); }
t("Q4 short answer cut-offs = the verdict's (≥80 ถูกมาก · ≥65 ค่อนข้างถูก · ≥45 กลาง ๆ · ≥30 ค่อนข้างแพง · ≥15 แพง · else แพงมาก)",
  q4(85).a === "ถูกมาก" && q4(70).a === "ค่อนข้างถูก" && q4(50).a === "กลาง ๆ" && q4(35).a === "ค่อนข้างแพง" && q4(22.4).a === "แพง" && q4(10).a === "แพงมาก", [85, 70, 50, 35, 22.4, 10].map(function (s) { return q4(s).a; }));
t("Q4 tone comes from the rounded score (64.96 → 65 → green — the band the needle sits in)", q4(64.96).score === 65 && q4(64.96).tone === "green", q4(64.96));
var ALLA = [A, AH, AM, AE].concat(Object.keys(ZS).map(function (k) { return S.answers({ valuationZone: { key: k, thai: k } }); }))
  .concat(Object.keys(CS).map(function (k) { return S.answers({ intelCycle: k }); }))
  .concat([[0.5, 0.8, 1, 1.5, 2.5, 4].map(function (r) { return byId(S.answers({ inputs: { lthCostRatio: r, price: 1 } }), "lthCost"); })]);
var mism = [];
ALLA.forEach(function (list) { list.forEach(function (x) { if (x.score != null && S.toneOf(x.score) !== x.tone) mism.push(x.id + " " + x.score + " " + x.tone); }); });
t("the gauge colour can never disagree with the card: toneOf(score) === tone for every scored answer", mism.length === 0, mism);
t("no data → score null (no needle, never a made-up position)", AE.every(function (x) { return x.score === null; }) && byId(S.answers({ valuationZone: { key: "nope" } }), "cycle").score === null, AE.map(function (x) { return x.score; }));

// ------------------------------------------------------------------ [11] real data: the core signal at known cycle extremes
console.log("== [11] real multi-cycle check of the core signal (MVRV-Z point-in-time + Puell 7-row mean, as known the day before) ==");
// date · kind · MVRV-Z pit (Coin Metrics, std of market cap over all rows up to that day) ·
// Puell 7-row mean (Blockchain.com issuance ÷ its 365-day mean; mean of the 7 newest days ≤ d − 1)
var EXTREMES = [
  ["2013-12-04", "top", 7.333, 9.623], ["2015-01-14", "bottom", -0.396, 0.462], ["2017-12-16", "top", 8.434, 5.751], ["2018-12-15", "bottom", -0.488, 0.349],
  ["2021-04-13", "top", 5.003, 2.655], ["2021-11-08", "top", 3.194, 1.546], ["2022-11-09", "bottom", -0.175, 0.595]
];
var CORE_AT = EXTREMES.map(function (e) { var r = S.score({ mvrvZ: e[2], puell7: e[3] }, "core"); return [e[0], e[1], r.total, r.state && r.state.key]; });
CORE_AT.forEach(function (c) { console.log("        " + c[0] + " " + c[1] + " → core " + c[2] + " " + c[3]); });
t("cycle bottoms 2015-01, 2018-12, 2022-11 → Strong Accumulation (≥ 80)", CORE_AT.filter(function (c) { return c[1] === "bottom"; }).every(function (c) { return c[2] >= 80 && c[3] === "strong"; }), CORE_AT);
t("tops 2013-12, 2017-12, 2021-04 → Overheated (< 30)", ["2013-12-04", "2017-12-16", "2021-04-13"].every(function (d) { var c = CORE_AT.filter(function (x) { return x[0] === d; })[0]; return c[2] < 30 && c[3] === "hot"; }), CORE_AT);
t("2021-11 top → low (≤ 40, Distribution Risk)", (function () { var c = CORE_AT.filter(function (x) { return x[0] === "2021-11-08"; })[0]; return c[2] <= 40 && c[3] === "risk"; })(), CORE_AT);
var C25 = S.score({ mvrvZ: 2.489, puell7: 1.201 }, "core");
console.log("        info: 2025-10-06 top (MVRV-Z 2.489 · Puell7 1.201) → core " + C25.total + " " + (C25.state && C25.state.key) + " — diminishing cycle peaks (PEAK_NOTE)");

// ------------------------------------------------------------------ [12] ES5 · pure · no advice
console.log("== [12] ES5 · pure · no buy/sell advice ==");
function stripComments(s) { return s.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, ""); }
var ES5_RULES = [
  ["arrow", /=>/], ["const", /\bconst\s/], ["let", /\blet\s/], ["template literal", /`/], ["class", /\bclass\s/], ["optional chaining", /\?\./], ["spread", /\.\.\./],
  ["Array includes/fill/find", /\.(includes|fill|find)\(/],
  ["ES2015+ library", /Object\.(assign|entries|values)|\.repeat\(|\.startsWith\(|\.endsWith\(|\.padStart\(|\.padEnd\(|\.findIndex\(|Number\.is(Finite|NaN|Integer)|Array\.from|Math\.(sign|trunc|log10)\(/]
];
var CODE = stripComments(SRC);
var es5bad = []; ES5_RULES.forEach(function (r) { var m = r[1].exec(CODE); if (m) es5bad.push(r[0] + ": " + m[0]); });
t("strict ES5 (no let/const/arrow/template/class/spread/ES2015 library calls)", es5bad.length === 0, es5bad);
t("pure: no fetch / XHR / DOM / storage / BigCache / wall clock", !/\bfetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB|document\.|BigCache|Date\.now|new Date\(\)/.test(CODE));
t("exports window.BtcLtSignal and module.exports", /window\.BtcLtSignal\s*=/.test(SRC) && /module\.exports\s*=/.test(SRC));
var ADVICE = /ควรซื้อ|ควรขาย|น่าซื้อ|น่าขาย|น่าเข้า|แนะนำซื้อ|แนะนำขาย|แนะนำให้|จุดเข้า|จุดขาย|ตัดขาดทุน|เข้าซื้อ|ซื้อเพิ่ม|ขายทิ้ง|\b(Buy|Sell|buy|sell)\b/;
t("source (incl. comments) has no buy/sell advice wording", !ADVICE.test(SRC), (SRC.match(ADVICE) || [])[0]);
var OUTS = [].concat(A, AH, AM, AE).map(function (x) { return x.q + " " + x.a + " " + x.evidence; }).concat(R.reasons, R2.reasons, R3.reasons, [BT.note]);
["valuation", "lth", "miner"].forEach(function (f) { R.families[f].members.forEach(function (m) { OUTS.push(m.zone + " " + m.reason); }); });
t("every output string is advice-free", OUTS.every(function (s) { return !ADVICE.test(s); }), OUTS.filter(function (s) { return ADVICE.test(s); })[0]);
t("whole run left every input untouched", same(MAP, MAP_COPY) && same(REAL_PX, REAL_COPY) && same(BR, BR_COPY));

finish();
