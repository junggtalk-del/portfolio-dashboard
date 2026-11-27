// Bitcoin Monitor · Long-term on-chain HISTORY (Coin Metrics + Blockchain.com) — data layer (2026-11-26)
//   node scripts/btc-lt-history-test.js
//
// What must stay true (public/btc-lt-history.js → window.BtcLtHistory + module.exports, ES5):
//   · two free CORS-open sources, NEVER BGeometrics (its 15/day quota belongs to the user's browser):
//       Coin Metrics community CM_URL — CapMVRVCur · CapMrktCurUSD · PriceUSD · 1d · page_size 10000 · sort=time
//       Blockchain.com BC_URL(chart) = charts/<chart>?timespan=all&sampled=false&format=json&cors=true
//         (miners-revenue · transaction-fees-usd)
//   · parseCoinMetrics → { price, mvrv, marketCap }: values arrive as strings; "" / null / junk / ≤ 0 are skipped —
//     never a fake 0 (Number(null) === 0)
//   · deriveCm → realizedPrice = price ÷ mvrv · mvrvZ POINT-IN-TIME = (mcap − mcap/mvrv) ÷ population σ of every mcap row
//     up to and including that day — a later row never counts (backtests cannot peek) · from the 365th row · σ 0 → none
//   · parseBlockchain: { x: unix SECONDS, y } → UTC day, the day's latest point wins
//   · puell = issuance ÷ mean issuance of the DATES in [t − 364, t] (dates, not rows) · issuance = revenue − fees on days
//     both are > 0 · a value needs ≥ 300 issuance days in the window
//   · load(): once per UTC day per source (BigCache "btc_lt_hist_v1" = IndexedDB, never localStorage) · a failed source keeps
//     its old series and says why · the two sources fail independently · EVENT "btc-lt-history"
// No network. Every response below is SIMULATED (sim* / *_TRICKY: made-up numbers shaped like the real APIs) — not market data.
"use strict";
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var SRC = fs.readFileSync(path.join(__dirname, "..", "public", "btc-lt-history.js"), "utf8");
var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; console.log("  PASS  " + name); }
  else { fail++; console.log("  FAIL  " + name + (extra != null ? " — " + (typeof extra === "string" ? extra : JSON.stringify(extra)).slice(0, 600) : "")); }
}
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function clone(x) { return JSON.parse(JSON.stringify(x)); }
function near(a, b, tol) { return typeof a === "number" && typeof b === "number" && Math.abs(a - b) <= (tol || 1e-9) * Math.max(1, Math.abs(b)); }
function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
var DAY = 86400000;
function ymd(ms) { return new Date(ms).toISOString().slice(0, 10); }
function addDays(d, n) { return ymd(Date.parse(d + "T00:00:00Z") + n * DAY); }
function unix(d) { return Date.parse(d + "T00:00:00Z") / 1000; }
function mapOf(rows) { var m = {}; rows.forEach(function (r) { m[r[0]] = r[1]; }); return m; }
function tick() { return new Promise(function (r) { setImmediate(r); }); }
var TODAY = ymd(Date.now());
var YESTERDAY_ISO = new Date(Date.now() - DAY).toISOString();

// the same ES5 gate the other new-file tests use (scripts/decision-journal-test.js R2.7)
function stripComments(s) { return s.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, ""); }
var ES5_RULES = [
  ["arrow", /=>/], ["const", /\bconst\s/], ["let", /\blet\s/], ["template literal", /`/], ["class", /\bclass\s/], ["optional chaining", /\?\./],
  ["async/await", /\basync\s|\bawait\s/], ["Array includes/fill/find", /\.(includes|fill|find)\(/],
  ["ES2015+ library", /Object\.(assign|entries|values)|\.repeat\(|\.startsWith\(|\.endsWith\(|\.padStart\(|\.padEnd\(|\.findIndex\(|Number\.is(Finite|NaN|Integer)|Array\.from/]
];
function es5Problems(code) { var out = []; ES5_RULES.forEach(function (r) { var m = r[1].exec(code); if (m) out.push(r[0] + ": " + m[0]); }); return out; }

var CM_URL = "https://community-api.coinmetrics.io/v4/timeseries/asset-metrics?assets=btc&metrics=CapMVRVCur,CapMrktCurUSD,PriceUSD&frequency=1d&page_size=10000&sort=time";
var REV_URL = "https://api.blockchain.info/charts/miners-revenue?timespan=all&sampled=false&format=json&cors=true";
var FEE_URL = "https://api.blockchain.info/charts/transaction-fees-usd?timespan=all&sampled=false&format=json&cors=true";

// ------------------------------------------------------------------ SIMULATED fixtures (made up — NOT real market data)
function simCmRow(d, mvrv, mcap, price) { return { asset: "btc", time: d + "T00:00:00.000000000Z", CapMVRVCur: mvrv, CapMrktCurUSD: mcap, PriceUSD: price }; }
// n days of a smooth made-up cycle, values as STRINGS like Coin Metrics sends them
function simCm(n, start) {
  var data = [];
  for (var i = 0; i < n; i++) {
    var price = 20000 + 15000 * Math.sin(i / 45) + 30 * i, mvrv = 1.6 + 0.7 * Math.sin(i / 70);
    data.push(simCmRow(addDays(start, i), String(mvrv), String(price * 19e6), String(price)));
  }
  return { data: data };
}
function simBc(n, start, fn) {
  var values = [];
  for (var i = 0; i < n; i++) values.push({ x: unix(addDays(start, i)), y: fn(i) });
  return { status: "ok", name: "SIMULATED", unit: "USD", period: "day", description: "SIMULATED fixture", values: values };
}
// deterministic made-up random walk (Park–Miller generator: exact in doubles, ES5)
function lcg(seed) { var s = seed % 2147483647; if (s <= 0) s += 2147483646; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
function simWalk(n, start, seed) {
  var rnd = lcg(seed), data = [], mc = 5e9;
  for (var i = 0; i < n; i++) {
    mc = mc * (1 + (rnd() - 0.48) * 0.08);
    data.push(simCmRow(addDays(start, i), String(0.8 + 2.2 * rnd()), String(mc), String(mc / 19e6)));
  }
  return { data: data };
}
var SIM_START = "2023-01-01", SIM_N = 420;
var SIM_CM = simCm(SIM_N, SIM_START);
var SIM_REV = simBc(SIM_N, SIM_START, function (i) { return 3e7 + 6e6 * Math.sin(i / 33) + 1e4 * i; });
var SIM_FEE = simBc(SIM_N, SIM_START, function (i) { return 6e5 + 2e5 * Math.cos(i / 21); });
// an older made-up pull (what yesterday's cache holds) — different numbers, so "kept" vs "replaced" is visible
var OLD_CM = simCm(400, "2022-06-01");
var OLD_REV = simBc(400, "2022-06-01", function (i) { return 2e7 + 3e6 * Math.cos(i / 40); });
var OLD_FEE = simBc(400, "2022-06-01", function (i) { return 4e5 + 1e5 * Math.sin(i / 17); });

// ------------------------------------------------------------------ module in a vm (window = the context)
function ok(body) { return { status: 200, body: body }; }
function routes(over) {
  var r = {};
  r[CM_URL] = ok(SIM_CM); r[REV_URL] = ok(SIM_REV); r[FEE_URL] = ok(SIM_FEE);
  Object.keys(over || {}).forEach(function (k) { r[k] = over[k]; });
  return r;
}
function env(opts) {
  opts = opts || {};
  var calls = [], events = [], timers = [], lsWrites = [];
  var rs = opts.routes || routes();
  var ctx = {
    console: console,
    localStorage: { getItem: function () { return null; }, setItem: function (k) { lsWrites.push(k); }, removeItem: function () {} },
    CustomEvent: function (n) { this.type = n; },
    setTimeout: function (fn, ms) { timers.push({ fn: fn, ms: ms, cleared: false }); return timers.length; },
    clearTimeout: function (id) { if (timers[id - 1]) timers[id - 1].cleared = true; },
    fetch: function (url) {
      url = String(url); calls.push(url);
      var r = has(rs, url) ? rs[url] : { status: 404, body: null };
      if (r.hang) return new Promise(function () {});
      if (r.throws) return Promise.reject(new TypeError(r.throws));
      return Promise.resolve({ ok: r.status === 200, status: r.status, json: function () { return Promise.resolve(clone(r.body)); } });
    }
  };
  ctx.dispatchEvent = function (e) { events.push({ type: e.type, loading: ctx.BtcLtHistory.get().loading }); return true; };
  if (opts.big) ctx.BigCache = {
    get: function (k) { return Promise.resolve(has(opts.big, k) ? clone(opts.big[k]) : null); },
    set: function (k, v) { opts.big[k] = clone(v); return Promise.resolve(true); }
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx, { filename: "btc-lt-history.js" });
  return { H: ctx.BtcLtHistory, calls: calls, events: events, timers: timers, lsWrites: lsWrites };
}
var P = env().H;   // pure functions

function seriesOk(rows) {
  if (!Array.isArray(rows) || !rows.length) return false;
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (!Array.isArray(r) || r.length !== 2 || !/^\d{4}-\d{2}-\d{2}$/.test(r[0]) || typeof r[1] !== "number" || !isFinite(r[1])) return false;
    if (i > 0 && !(rows[i - 1][0] < r[0])) return false;
  }
  return true;
}
function ageRecord(big, iso) { var rec = big.btc_lt_hist_v1; rec.sources.coinMetrics.at = iso; rec.sources.blockchain.at = iso; rec.sources.coinMetrics.tried = iso; rec.sources.blockchain.tried = iso; }

// ------------------------------------------------------------------ constants + hygiene
function constantTests() {
  console.log("== constants · source hygiene ==");
  t("CM_URL = Coin Metrics community · CapMVRVCur,CapMrktCurUSD,PriceUSD · 1d · page_size 10000 · sort=time", P.CM_URL === CM_URL, P.CM_URL);
  t("BC_URL(chart) = Blockchain.com charts/<chart>?timespan=all&sampled=false&format=json&cors=true", P.BC_URL("miners-revenue") === REV_URL && P.BC_URL("transaction-fees-usd") === FEE_URL, P.BC_URL("miners-revenue"));
  t("EVENT \"btc-lt-history\" · CACHE_KEY \"btc_lt_hist_v1\"", P.EVENT === "btc-lt-history" && P.CACHE_KEY === "btc_lt_hist_v1");
  var code = stripComments(SRC);
  t("never BGeometrics: no bitcoin-data.com / bgeometrics anywhere in the code", !/bitcoin-data\.com|bgeometrics/i.test(code));
  t("ES5 only (no arrow / const / let / template / class / ?. / async / ES2015 methods)", es5Problems(code).length === 0, es5Problems(code));
  t("no localStorage in the code (series live in IndexedDB via BigCache)", !/localStorage/.test(code));
  t("module.exports + window.BtcLtHistory", /module\.exports = BtcLtHistory/.test(code) && /window\.BtcLtHistory = BtcLtHistory/.test(code));
  var req = require(path.join(__dirname, "..", "public", "btc-lt-history.js"));
  t("require() in Node gives the pure functions without a window", typeof req.deriveCm === "function" && typeof req.puell === "function" && req.puell([], []).length === 0);
}

// ------------------------------------------------------------------ Coin Metrics
function coinMetricsTests() {
  console.log("== parseCoinMetrics: strings in, numbers out, junk never becomes 0 ==");
  var CM_TRICKY = { data: [
    simCmRow("2020-01-03", "1.5", "300", "30"),
    simCmRow("2020-01-01", "2", "200", "20"),                    // out of order → sorted
    simCmRow("2020-01-02", "", null, "abc"),                     // "" / null / junk → skipped (Number("") and Number(null) are 0)
    simCmRow("2020-01-04", "0", "-5", "   "),                    // ≤ 0 and blanks → skipped
    simCmRow("2020-01-05", 1.25, "500", "50"),                   // a real number is fine too
    { asset: "btc", time: "2020-01-05T00:00:00.000000000Z", CapMVRVCur: "1.3" },   // same day again → its MVRV wins; mcap/price stay
    simCmRow("2020-01-06", false, true, "Infinity"),             // booleans / Infinity → skipped
    { asset: "btc", CapMVRVCur: "2", CapMrktCurUSD: "1", PriceUSD: "1" },           // no time
    simCmRow("garbage", "2", "1", "1"),                          // not a date
    null
  ] };
  var cm = P.parseCoinMetrics(CM_TRICKY);
  t("mvrv: ascending, one row per day, last row of a day wins", same(cm.mvrv, [["2020-01-01", 2], ["2020-01-03", 1.5], ["2020-01-05", 1.3]]), cm.mvrv);
  t("marketCap + price: \"\" / null / \"abc\" / \"   \" / ≤ 0 / booleans / Infinity skipped", same(cm.marketCap, [["2020-01-01", 200], ["2020-01-03", 300], ["2020-01-05", 500]]) && same(cm.price, [["2020-01-01", 20], ["2020-01-03", 30], ["2020-01-05", 50]]), cm);
  t("no data → three empty series (no throw)", [null, {}, { data: "x" }, { data: [] }].every(function (j) { var r = P.parseCoinMetrics(j); return same(r, { price: [], mvrv: [], marketCap: [] }); }));

  console.log("== deriveCm: realized price ==");
  var d = P.deriveCm(cm);
  t("realizedPrice = price ÷ MVRV on days that have both (20/2 · 30/1.5 · 50/1.3)", same(d.realizedPrice.map(function (r) { return r[0]; }), ["2020-01-01", "2020-01-03", "2020-01-05"]) && d.realizedPrice[0][1] === 10 && d.realizedPrice[1][1] === 20 && near(d.realizedPrice[2][1], 50 / 1.3), d.realizedPrice);
  t("price + mvrv passed through · fewer than 365 rows → no mvrvZ yet", same(d.price, cm.price) && same(d.mvrv, cm.mvrv) && same(d.mvrvZ, []));

  console.log("== deriveCm: point-in-time MVRV Z-Score — hand-computed ==");
  // mcap alternates 100, 300, 100, … with MVRV 2 → σ has a closed form
  var alt = { data: [] };
  for (var i = 0; i < 400; i++) { var mc = i % 2 === 0 ? 100 : 300; alt.data.push(simCmRow(addDays("2019-01-01", i), "2", String(mc), String(mc / 10))); }
  var za = P.deriveCm(P.parseCoinMetrics(alt)).mvrvZ, zm = mapOf(za);
  t("first Z on the 365th market-cap row (2019-12-31) — none before", za.length === 36 && za[0][0] === "2019-12-31", za.slice(0, 2));
  // n = 365: 183 × 100 + 182 × 300 → σ² = (183·182/365²)·200² ; Z = (100 − 100/2) ÷ σ
  t("row 365: 183 × 100 + 182 × 300 → σ = √(183·182/365²·40000) → Z = 50 ÷ σ = 0.49999812…", near(zm["2019-12-31"], 50 / Math.sqrt(183 * 182 / (365 * 365) * 40000)), zm["2019-12-31"]);
  t("row 366: 183 × 100 + 183 × 300 → σ = 100 exactly → Z = (300 − 150) ÷ 100 = 1.5", near(zm["2020-01-01"], 1.5), zm["2020-01-01"]);
  // made-up random walk: every Z against a naive two-pass σ over the market caps up to that day
  var WALK = simWalk(430, "2014-03-01", 7);
  WALK.data[390].CapMrktCurUSD = "";      // no market cap → no Z that day, and the day does not enter σ
  WALK.data[395].CapMVRVCur = null;       // no MVRV → no Z that day (its market cap still enters σ)
  function n0(x) { if (typeof x === "number") return isFinite(x) ? x : null; if (typeof x !== "string" || !x.trim()) return null; var v = Number(x); return isFinite(v) ? v : null; }
  var mcs = [], naive = {};
  WALK.data.forEach(function (r) {
    var m = n0(r.CapMrktCurUSD), v = n0(r.CapMVRVCur);
    if (m === null || !(m > 0)) return;
    mcs.push(m);
    if (mcs.length < 365 || v === null || !(v > 0)) return;
    var mean = mcs.reduce(function (s, x) { return s + x; }, 0) / mcs.length;
    var sd = Math.sqrt(mcs.reduce(function (s, x) { return s + (x - mean) * (x - mean); }, 0) / mcs.length);
    naive[r.time.slice(0, 10)] = (m - m / v) / sd;
  });
  var zw = P.deriveCm(P.parseCoinMetrics(WALK)).mvrvZ;
  t("random walk: 64 Z values (rows 365–430 minus the no-mcap and no-MVRV days) — same days as a naive two-pass σ", zw.length === 64 && Object.keys(naive).length === 64 && same(zw.map(function (r) { return r[0]; }), Object.keys(naive).sort()), zw.length);
  t("…and the same values (running σ = two-pass σ, within 1e-9)", zw.every(function (r) { return near(r[1], naive[r[0]]); }), zw.filter(function (r) { return !near(r[1], naive[r[0]]); }).slice(0, 2));
  // look-ahead: append a made-up future (a 1000× bubble) — no earlier value may move by a single bit
  var early = P.deriveCm(P.parseCoinMetrics({ data: WALK.data.slice(0, 400) }));
  var fut = WALK.data.slice();
  for (i = 430; i < 470; i++) fut.push(simCmRow(addDays("2014-03-01", i), "9", String(5e12), String(5e12 / 19e6)));
  var later = P.deriveCm(P.parseCoinMetrics({ data: fut })), lz = mapOf(later.mvrvZ), lr = mapOf(later.realizedPrice);
  // early = rows 0–399 → Z on rows 364–399 (36) minus the no-mcap (390) and no-MVRV (395) days = 34
  t("no look-ahead: Z of every early day is bit-identical after a huge future is appended", early.mvrvZ.length === 34 && early.mvrvZ.every(function (r) { return lz[r[0]] === r[1]; }) && later.mvrvZ.length > early.mvrvZ.length, early.mvrvZ.length);
  t("…realized price too", early.realizedPrice.every(function (r) { return lr[r[0]] === r[1]; }));
  var flat = { data: [] };
  for (i = 0; i < 370; i++) flat.data.push(simCmRow(addDays("2018-01-01", i), "2", "500", "5"));
  var df = P.deriveCm(P.parseCoinMetrics(flat));
  t("σ = 0 (a flat market cap) → no Z at all (no Infinity / NaN)", df.mvrvZ.length === 0 && df.realizedPrice.length === 370);
  t("deriveCm(nothing) → empty series, no throw", same(P.deriveCm(null), { price: [], mvrv: [], realizedPrice: [], mvrvZ: [] }) && same(P.deriveCm({ price: [["2020-01-01", null]], mvrv: "x" }), { price: [], mvrv: [], realizedPrice: [], mvrvZ: [] }));
}

// ------------------------------------------------------------------ Blockchain.com + Puell
function blockchainTests() {
  console.log("== parseBlockchain: { x: unix seconds, y } → UTC day ==");
  var T0 = unix("2020-01-01");
  var BC_TRICKY = { values: [
    { x: T0 + 86400, y: 11 },                  // 2020-01-02
    { x: T0 + 1800, y: 10.2 },                 // 2020-01-01 00:30 — listed first …
    { x: T0 + 3600, y: 10.5 },                 // 2020-01-01 01:00 — the day's LATEST point wins …
    { x: T0, y: 10 },                          // … not the first listed (00:30) and not the last listed (00:00)
    { x: T0 + 2 * 86400, y: null },            // null is not 0
    { x: T0 + 3 * 86400, y: "" },              // "" is not 0
    { x: T0 + 4 * 86400, y: "12.5" },          // a numeric string is fine
    { x: "abc", y: 5 },                        // no time
    { x: (T0 + 5 * 86400) * 1000, y: 7 },      // milliseconds, not seconds → another millennium → dropped
    { x: T0 + 6 * 86400, y: 0 },               // a real 0 stays here (Puell drops it)
    { x: T0 + 7 * 86400 },                     // no y
    { x: T0 + 8 * 86400, y: true },            // not a number
    null
  ] };
  var b = P.parseBlockchain(BC_TRICKY);
  t("UTC days ascending · latest point of a day wins · null / \"\" / true / ms-stamps dropped · \"12.5\" read", same(b, [["2020-01-01", 10.5], ["2020-01-02", 11], ["2020-01-05", 12.5], ["2020-01-07", 0]]), b);
  t("no values → [] (no throw)", [null, {}, { values: {} }, { values: [] }].every(function (j) { return same(P.parseBlockchain(j), []); }));

  console.log("== puell: issuance ÷ mean issuance of [t − 364, t] — hand-computed ==");
  var S = "2020-01-01", REV = [], FEE = [], i;
  for (i = 0; i < 400; i++) { REV.push([addDays(S, i), i < 350 ? 110 : 210]); FEE.push([addDays(S, i), 10]); }   // issuance 100, then 200 from day 350
  var p = P.puell(REV, FEE), pm = mapOf(p);
  t("first value on day 299 (the window holds 300 issuance days) = 100 ÷ 100 = 1 · 101 values", p.length === 101 && p[0][0] === addDays(S, 299) && p[0][1] === 1 && !has(pm, addDays(S, 298)), p.slice(0, 1));
  t("day 349: still 1", pm[addDays(S, 349)] === 1);
  t("day 350: 200 ÷ ((350·100 + 200) ÷ 351) = 1.99432", near(pm[addDays(S, 350)], 200 * 351 / 35200), pm[addDays(S, 350)]);
  t("day 364: window = days 0–364 (350·100 + 15·200) → 200 ÷ (38000 ÷ 365) = 1.92105", near(pm[addDays(S, 364)], 200 * 365 / 38000), pm[addDays(S, 364)]);
  t("day 365: day 0 leaves the window (days 1–365: 349·100 + 16·200) → 1.91601", near(pm[addDays(S, 365)], 200 * 365 / 38100), pm[addDays(S, 365)]);
  t("day 399: days 35–399 (315·100 + 50·200) → 200 ÷ (41500 ÷ 365) = 1.75904", near(pm[addDays(S, 399)], 200 * 365 / 41500), pm[addDays(S, 399)]);
  // the window counts DATES: 330 days, a 200-day hole, then 2 more days → only 165/166 dates fall inside [t − 364, t]
  var R2 = [], F2 = [];
  for (i = 0; i < 330; i++) { R2.push([addDays(S, i), 110]); F2.push([addDays(S, i), 10]); }
  [530, 531].forEach(function (k) { R2.push([addDays(S, k), 110]); F2.push([addDays(S, k), 10]); });
  var p2 = P.puell(R2, F2), p2m = mapOf(p2);
  t("a gap shrinks the window (dates, not the last 365 rows): no value after a 200-day hole", p2.length === 31 && !has(p2m, addDays(S, 530)) && !has(p2m, addDays(S, 531)) && p2m[addDays(S, 329)] === 1, p2.length);
  // issuance only on days where revenue and fees are both > 0 (and revenue > fees)
  var R3 = clone(REV), F3 = clone(FEE);
  F3[100][1] = 0;        // fees 0 → no issuance that day
  F3[120][1] = 120;      // fees ≥ revenue (110) → no issuance
  R3.splice(130, 1);     // no revenue row that day
  F3.splice(140, 1);     // no fees row that day
  var p3 = P.puell(R3, F3), p3m = mapOf(p3);
  t("4 days without a usable issuance (fees 0 · fees ≥ revenue · revenue missing · fees missing) → first value moves from day 299 to 303", p3[0][0] === addDays(S, 303) && p3[0][1] === 1 && !has(p3m, addDays(S, 302)), p3[0]);
  var early = P.puell(REV.slice(0, 380), FEE.slice(0, 380));
  var R4 = REV.slice(), F4 = FEE.slice();
  for (i = 400; i < 430; i++) { R4.push([addDays(S, i), 1e9]); F4.push([addDays(S, i), 10]); }
  var lm = mapOf(P.puell(R4, F4));
  t("no look-ahead: a huge made-up future leaves every earlier Puell bit-identical", early.length === 81 && early.every(function (r) { return lm[r[0]] === r[1]; }));
  t("bad rows (null values, junk) → [] with no throw", same(P.puell([["2020-01-01", null], "x", null], [["2020-01-01", 5]]), []) && same(P.puell(null, undefined), []));
}

// ------------------------------------------------------------------ load(): cache · failures · events
var cmNew = P.deriveCm(P.parseCoinMetrics(SIM_CM));
var puNew = P.puell(P.parseBlockchain(SIM_REV), P.parseBlockchain(SIM_FEE));
// 2026-11-27: our own server is asked first (networks that block crypto sites can still reach our domain)
var SERVER_URL = "/api/bitcoin?lt=history";
function direct(calls) { return calls.filter(function (u) { return u !== SERVER_URL; }); }
function serverBody(over) {
  var b = { at: new Date().toISOString(),
    coinMetrics: { ok: true, asOf: cmNew.price[cmNew.price.length - 1][0], series: { price: cmNew.price, mvrv: cmNew.mvrv, realizedPrice: cmNew.realizedPrice, mvrvZ: cmNew.mvrvZ } },
    blockchain: { ok: true, asOf: puNew[puNew.length - 1][0], series: { puell: puNew } } };
  Object.keys(over || {}).forEach(function (k) { b[k] = over[k]; });
  return b;
}
var BLANK = { at: null, series: {}, sources: { coinMetrics: { at: null, ok: null, error: null, asOf: null, via: null }, blockchain: { at: null, ok: null, error: null, asOf: null, via: null } }, error: null, loading: false };

function loadFirst() {
  console.log("== load(): the first pull ==");
  var big = {};
  var e = env({ big: big });
  t("before load(): empty state (no keys in series, sources not tried), nothing fetched", same(e.H.get(), BLANK) && e.calls.length === 0, e.H.get());
  return e.H.load().then(function (st) {
    var g = e.H.get();
    t("our server first (it has nothing here), then 3 direct requests: Coin Metrics once + Blockchain.com miners-revenue + transaction-fees-usd", e.calls[0] === SERVER_URL && direct(e.calls).slice().sort().join() === [CM_URL, FEE_URL, REV_URL].sort().join(), e.calls);
    t("only our server, Coin Metrics and Blockchain.com were asked (never bitcoin-data.com)", e.calls.every(function (u) { return u === SERVER_URL || u.indexOf("https://community-api.coinmetrics.io/") === 0 || u.indexOf("https://api.blockchain.info/") === 0; }));
    t("series = deriveCm(parseCoinMetrics(CM)) + puell(parseBlockchain(revenue), parseBlockchain(fees))", Object.keys(g.series).sort().join() === "mvrv,mvrvZ,price,puell,realizedPrice" &&
      same(g.series.price, cmNew.price) && same(g.series.mvrv, cmNew.mvrv) && same(g.series.realizedPrice, cmNew.realizedPrice) && same(g.series.mvrvZ, cmNew.mvrvZ) && same(g.series.puell, puNew), Object.keys(g.series));
    t("every series: [\"YYYY-MM-DD\", number] ascending, one row per day", ["price", "mvrv", "realizedPrice", "mvrvZ", "puell"].every(function (k) { return seriesOk(g.series[k]); }));
    var last = addDays(SIM_START, SIM_N - 1);
    t("sources ok · at = this pull (today, UTC) · asOf = newest data day · no error · not loading", g.sources.coinMetrics.ok === true && g.sources.blockchain.ok === true &&
      g.sources.coinMetrics.at.slice(0, 10) === TODAY && g.sources.blockchain.at.slice(0, 10) === TODAY && g.sources.coinMetrics.asOf === last && g.sources.blockchain.asOf === last &&
      g.sources.coinMetrics.error === null && g.error === null && g.loading === false && g.at === g.sources.blockchain.at, g.sources);
    t("load() resolves to the same state get() gives", same(st, g));
    var rec = big.btc_lt_hist_v1;
    t("saved to BigCache btc_lt_hist_v1 (IndexedDB) with v 1, the series and the sources — nothing in localStorage", !!rec && rec.v === 1 && same(rec.series.mvrvZ, cmNew.mvrvZ) && same(rec.series.puell, puNew) && rec.sources.coinMetrics.ok === true && e.lsWrites.length === 0, rec && Object.keys(rec));
    t("EVENT btc-lt-history twice: when the pull starts (loading true) and when it ends (loading false)", e.events.length === 2 && e.events[0].type === "btc-lt-history" && e.events[0].loading === true && e.events[1].loading === false, e.events);
    var g2 = e.H.get(); g2.series.price = null; g2.sources.coinMetrics.ok = "changed";
    t("get() hands out copies: changing them does not touch the module's state", e.H.get().series.price !== null && e.H.get().sources.coinMetrics.ok === true);
    return big;
  });
}

function loadSameDay(big) {
  console.log("== load(): once per UTC day ==");
  var e = env({ big: big });
  return e.H.load().then(function () {
    t("page reload the same UTC day → 0 requests, series back from IndexedDB", e.calls.length === 0 && same(e.H.get().series.mvrvZ, cmNew.mvrvZ) && same(e.H.get().series.puell, puNew) && e.H.get().sources.coinMetrics.ok === true, e.calls);
    t("…one EVENT (loading false)", e.events.length === 1 && e.events[0].loading === false, e.events);
    return e.H.load();
  }).then(function () {
    t("load() again in the same page view → still 0 requests", e.calls.length === 0, e.calls);
    return e.H.load({ force: true });
  }).then(function () {
    t("load({ force: true }) → both sources pulled again (3 direct requests after the server said no)", direct(e.calls).length === 3, e.calls);
    var y = clone(big);
    ageRecord(y, YESTERDAY_ISO);
    var e2 = env({ big: y });
    return e2.H.load().then(function () {
      t("the next UTC day → pulled again (3 direct requests), at moves to today", direct(e2.calls).length === 3 && e2.H.get().sources.coinMetrics.at.slice(0, 10) === TODAY, e2.calls);
    });
  });
}

function loadFailures() {
  console.log("== load(): a failed source keeps its old series, the other one still updates ==");
  var big = {};
  var r0 = {}; r0[CM_URL] = ok(OLD_CM); r0[REV_URL] = ok(OLD_REV); r0[FEE_URL] = ok(OLD_FEE);
  return env({ big: big, routes: r0 }).H.load().then(function () {
    ageRecord(big, YESTERDAY_ISO);                                     // that pull was yesterday
    var old = clone(big.btc_lt_hist_v1.series);
    var over = {}; over[CM_URL] = { status: 503 };
    var e = env({ big: big, routes: routes(over) });
    return e.H.load().then(function () {
      var g = e.H.get();
      t("Coin Metrics 503 → its 4 series stay as they were · ok false · error \"HTTP 503\" · at stays yesterday", same(g.series.price, old.price) && same(g.series.mvrv, old.mvrv) && same(g.series.realizedPrice, old.realizedPrice) && same(g.series.mvrvZ, old.mvrvZ) &&
        g.sources.coinMetrics.ok === false && g.sources.coinMetrics.error === "HTTP 503" && g.sources.coinMetrics.at === YESTERDAY_ISO, g.sources.coinMetrics);
      t("…Blockchain.com updates on its own (today's Puell, ok, at today)", same(g.series.puell, puNew) && !same(old.puell, puNew) && g.sources.blockchain.ok === true && g.sources.blockchain.at.slice(0, 10) === TODAY, g.sources.blockchain);
      t("…top-level error names the source: \"Coin Metrics: HTTP 503\"", g.error === "Coin Metrics: HTTP 503", g.error);
      t("…the failure is saved too (a reload still knows)", big.btc_lt_hist_v1.sources.coinMetrics.ok === false && big.btc_lt_hist_v1.sources.coinMetrics.error === "HTTP 503");
      var e2 = env({ big: big });
      return e2.H.load().then(function () {
        t("reload within 10 minutes → the failed source is not asked again, the fresh one neither (0 requests) · error still shown", e2.calls.length === 0 && e2.H.get().error === "Coin Metrics: HTTP 503" && same(e2.H.get().series.mvrvZ, old.mvrvZ), e2.calls);
        big.btc_lt_hist_v1.sources.coinMetrics.tried = new Date(Date.now() - 11 * 60000).toISOString();
        var e3 = env({ big: big });
        return e3.H.load().then(function () {
          var g3 = e3.H.get();
          t("11 minutes later → only Coin Metrics is asked again (after our server) · success clears the error", direct(e3.calls).join() === CM_URL && g3.sources.coinMetrics.ok === true && g3.error === null && same(g3.series.mvrvZ, cmNew.mvrvZ), e3.calls);
        });
      });
    });
  }).then(function () {
    var big2 = {};
    return env({ big: big2, routes: r0 }).H.load().then(function () {
      ageRecord(big2, YESTERDAY_ISO);
      var oldPuell = clone(big2.btc_lt_hist_v1.series.puell);
      var over = {}; over[FEE_URL] = { throws: "Failed to fetch" };
      var e = env({ big: big2, routes: routes(over) });
      return e.H.load().then(function () {
        var g = e.H.get();
        t("one of the two Blockchain.com charts throws → the source fails (no Puell from half the data), old Puell kept, error = the thrown message", g.sources.blockchain.ok === false && g.sources.blockchain.error === "Failed to fetch" && same(g.series.puell, oldPuell), g.sources.blockchain);
        t("…Coin Metrics still updates", g.sources.coinMetrics.ok === true && same(g.series.mvrvZ, cmNew.mvrvZ) && g.error === "Blockchain.com: Failed to fetch", g.error);
      });
    });
  }).then(function () {
    var over = {}; over[CM_URL] = { status: 500 }; over[REV_URL] = { throws: "Failed to fetch" };
    var e = env({ big: {}, routes: routes(over) });
    return e.H.load().then(function (st) {
      t("nothing cached and both sources fail → no series (not zeros), both ok false, one error line, no throw", same(st.series, {}) && st.sources.coinMetrics.ok === false && st.sources.blockchain.ok === false && st.error === "Coin Metrics: HTTP 500 · Blockchain.com: Failed to fetch" && st.at === null && st.loading === false, st);
    });
  }).then(function () {
    var bad = { data: SIM_CM.data.map(function (r) { return { asset: "btc", time: r.time, PriceUSD: r.PriceUSD, CapMrktCurUSD: r.CapMrktCurUSD }; }) };   // CapMVRVCur missing
    var over = {}; over[CM_URL] = ok(bad);
    var e = env({ big: {}, routes: routes(over) });
    return e.H.load().then(function (st) {
      t("Coin Metrics answers without CapMVRVCur → the source fails (\"no usable rows\") instead of half a series", st.sources.coinMetrics.ok === false && st.sources.coinMetrics.error === "no usable rows" && !has(st.series, "price") && !has(st.series, "mvrvZ") && st.sources.blockchain.ok === true, st.sources.coinMetrics);
    });
  });
}

function loadPagesAndTimeouts() {
  console.log("== load(): pages · no BigCache · concurrent calls · a hung request ==");
  var nextUrl = CM_URL + "&next_page_token=SIMULATED";
  var over = {};
  over[CM_URL] = ok({ data: SIM_CM.data.slice(0, 200), next_page_url: nextUrl });
  over[nextUrl] = ok({ data: SIM_CM.data.slice(200) });
  var e = env({ big: {}, routes: routes(over) });
  return e.H.load().then(function (st) {
    t("Coin Metrics next_page_url is followed (rows would otherwise stop at the OLDEST page) → same series as one page", e.calls.indexOf(nextUrl) > e.calls.indexOf(CM_URL) && same(st.series.mvrvZ, cmNew.mvrvZ) && st.sources.coinMetrics.ok === true, e.calls);
    var over2 = {};
    over2[CM_URL] = ok({ data: SIM_CM.data.slice(0, 200), next_page_url: "https://example.com/elsewhere?SIMULATED" });
    var e2 = env({ big: {}, routes: routes(over2) });
    return e2.H.load().then(function (st2) {
      t("a next page on another host is not followed → the source fails (\"incomplete\"), no partial series", e2.calls.every(function (u) { return u.indexOf("example.com") < 0; }) && st2.sources.coinMetrics.ok === false && /incomplete/.test(st2.sources.coinMetrics.error) && !has(st2.series, "mvrvZ"), st2.sources.coinMetrics);
    });
  }).then(function () {
    var e = env({});   // no window.BigCache
    return e.H.load().then(function (st) {
      t("no BigCache (private mode / old page) → still loads, nothing persisted, no throw", direct(e.calls).length === 3 && same(st.series.puell, puNew) && e.lsWrites.length === 0);
    });
  }).then(function () {
    var e = env({ big: {} });
    var a = e.H.load(), b = e.H.load({ force: true });
    return Promise.all([a, b]).then(function () {
      t("two load() calls at once share one pull (3 direct requests, the same promise)", a === b && direct(e.calls).length === 3, e.calls.length);
    });
  }).then(function () {
    var over = {}; over[CM_URL] = { hang: true };
    var e = env({ big: {}, routes: routes(over) });
    var p = e.H.load();
    return tick().then(tick).then(function () {
      var open = e.timers.filter(function (x) { return !x.cleared; });
      t("every request carries a timeout (ours too); the answered ones cleared theirs, the hung one's is still running", e.timers.length === 4 && open.length === 1 && open[0].ms >= 30000, e.timers.map(function (x) { return [x.ms, x.cleared]; }));
      if (open.length !== 1) return null;   // nothing to fire → do not wait on a request that never ends
      open.forEach(function (x) { x.fn(); });
      return p;
    }).then(function (st) {
      t("a hung Coin Metrics request times out → ok false, error \"timeout\", loading ends, Blockchain.com unaffected", !!st && st.sources.coinMetrics.ok === false && st.sources.coinMetrics.error === "timeout" && st.loading === false && st.sources.blockchain.ok === true, st && st.sources);
    });
  });
}

// a promise that never settles would let Node exit 0 with the summary unprinted — count that as a failure
function loadViaServer() {
  console.log("== load(): our own server first (2026-11-27 — some networks reset connections to crypto sites) ==");
  var sv = {}; sv[SERVER_URL] = ok(serverBody());
  var e = env({ big: {}, routes: sv });   // the direct sources are NOT routed — as on a network that blocks them
  return e.H.load().then(function (st) {
    t("server answers both → 1 request (ours) · nothing asked of Coin Metrics / Blockchain.com", e.calls.length === 1 && e.calls[0] === SERVER_URL, e.calls);
    t("…the series are the server's (same derivation as here) and both sources read ok, via the server",
      same(st.series.mvrvZ, cmNew.mvrvZ) && same(st.series.puell, puNew) && same(st.series.price, cmNew.price) && st.sources.coinMetrics.ok === true && st.sources.blockchain.ok === true &&
      st.sources.coinMetrics.via === "server" && st.sources.blockchain.via === "server" && st.error === null, st.sources);
    var part = {}; part[SERVER_URL] = ok(serverBody({ coinMetrics: { ok: false, error: "HTTP 503" } }));
    part[CM_URL] = ok(SIM_CM);
    var e2 = env({ big: {}, routes: part });
    return e2.H.load().then(function (s2) {
      t("server has Blockchain.com but not Coin Metrics → only Coin Metrics is pulled directly", same(direct(e2.calls), [CM_URL]) && s2.sources.coinMetrics.via === "direct" && s2.sources.blockchain.via === "server" && same(s2.series.mvrvZ, cmNew.mvrvZ) && s2.error === null, { calls: e2.calls, src: s2.sources });
    });
  }).then(function () {
    var junk = {}; junk[SERVER_URL] = ok(serverBody({ blockchain: { ok: true, asOf: "x", series: { puell: [["2024-01-02", 1], ["2024-01-01", 2], ["bad", "NaN"]] } } }));
    junk[REV_URL] = ok(SIM_REV); junk[FEE_URL] = ok(SIM_FEE);
    var e3 = env({ big: {}, routes: junk });
    return e3.H.load().then(function (s3) {
      t("a server series that is not clean (out of order · not a date · not a number) is not trusted → that source is pulled directly",
        direct(e3.calls).length === 2 && same(s3.series.puell, puNew) && s3.sources.blockchain.via === "direct" && s3.sources.coinMetrics.via === "server", { calls: e3.calls });
    });
  }).then(function () {
    var e4 = env({ big: {}, routes: routes() });   // server not routed (404) → the old way
    return e4.H.load().then(function (s4) {
      t("server down (404) → both pulled directly as before (1 + 3 requests)", e4.calls.length === 4 && e4.calls[0] === SERVER_URL && same(s4.series.puell, puNew) && s4.sources.coinMetrics.via === "direct", e4.calls);
    });
  }).then(function () {
    var y = {}, eOld = env({ big: y, routes: routes() });
    return eOld.H.load().then(function () {
      ageRecord(y, YESTERDAY_ISO);
      var e5 = env({ big: y, routes: {} });   // next day, nothing reachable at all
      return e5.H.load().then(function (s5) {
        t("server AND direct both unreachable → yesterday's series stay, the error names it", same(s5.series.mvrvZ, cmNew.mvrvZ) && s5.sources.coinMetrics.ok === false && /Coin Metrics/.test(s5.error || ""), s5.error);
      });
    });
  });
}

var finished = false;
process.on("exit", function (code) {
  if (!finished && code === 0) { console.log("  FAIL  the test chain never finished (a promise hung)"); process.exitCode = 1; }
});
constantTests();
coinMetricsTests();
blockchainTests();
loadFirst().then(loadSameDay).then(loadFailures).then(loadPagesAndTimeouts).then(loadViaServer).then(function () {
  finished = true;
  console.log("\n" + (pass + fail) + " checks · " + pass + " passed · " + fail + " failed");
  if (fail) process.exit(1);
}, function (e) { finished = true; console.log("  FAIL  load tests threw — " + (e && e.stack)); process.exit(1); });
