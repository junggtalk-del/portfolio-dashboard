// AI Portfolio Manager · Current Portfolio values follow the daily close (2026-11-24)
//   node scripts/holding-revalue-test.js
//
// What must stay true (public/holding-revalue.js · portfolio-core.updateHolding/withHoldingsLock · portfolio-manager-page.js
// · api/portfolio-holdings.js):
//   · a USD-priced foreign stock held in the PM table moves with close × USD/THB:
//       value × close(now)/close(anchor day) × fx(now)/fx(anchor day) — closes from the SAME series, exact days (split-safe);
//       no anchor-day close → stored THB price, refusing moves > 35%; never backwards; idempotent; rounded to satang.
//   · only FINAL closes count (after 21:30 UTC of the bar's day) — a load during the US session never anchors a live price.
//   · a value typed in the last 5 days is anchored at the last final close BEFORE the typing, only from a snapshot loaded
//     after the typing (else "stale-price"), and moved to the newest close in the same pass — no double count, no lost move.
//     Older un-anchored rows start from the newest close without moving.
//   · not touched: Thai stocks (.BK), other exchanges (a "." suffix), crypto, Thai funds, watchlist rows, zero values.
//   · writes only the changed rows (fresh GET → PUT {data: changed}) inside the holdings lock; nothing due → no network;
//     the PUT answer is checked — a database that drops the anchor columns is reported, not re-saved on every load.
//   · the PM page saves one row (fresh GET → PUT that row, local copy only after the server took it) and shows when /
//     why a value follows the price; empty numbers stay empty (client and server).
// No network: fetch is stubbed; no real portfolio documents.
"use strict";
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var ROOT = path.join(__dirname, "..");
var PUB = path.join(ROOT, "public");
function read(f) { return fs.readFileSync(path.join(PUB, f), "utf8"); }
var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; console.log("  PASS  " + name); }
  else { fail++; console.log("  FAIL  " + name + (extra != null ? " — " + (typeof extra === "string" ? extra : JSON.stringify(extra)) : "")); }
}
var SRC_HR = read("holding-revalue.js");
function loadHR(extra) {
  var ctx = { console: console, JSON: JSON, Math: Math, Date: Date, Object: Object, Array: Array, Promise: Promise, String: String, Number: Number, isFinite: isFinite, RegExp: RegExp };
  Object.keys(extra || {}).forEach(function (k) { ctx[k] = extra[k]; });
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(SRC_HR, ctx, { filename: "holding-revalue.js" });
  return ctx;
}
var HR = loadHR().HoldingRevalue;
function r2(v) { return Math.round(v * 100) / 100; }

// ------------------------------------------------------------------ fixtures
// NVDA closes: 11-13 98 · 11-14 100 · 11-17 104 · 11-20 108 · 11-21 110 · 11-24 115 (live until 21:30Z)
// (fixture days only — the module never looks at weekdays, so weekends/holidays are not modelled here)
var SNAP = {
  loadedAt: "2026-11-24T02:00:00.000Z",
  technicalSignals: { NVDA: { latestClose: 115, latestDate: "2026-11-24" }, QQQM: { latestClose: 250, latestDate: "2026-11-21" }, GOOGL: { latestClose: 300, latestDate: "2026-11-21" } },
  historicalData: {
    NVDA: { dates: ["2026-11-13", "2026-11-14", "2026-11-17", "2026-11-20", "2026-11-21", "2026-11-24"], closes: [98, 100, 104, 108, 110, 115] },
    QQQM: { dates: ["2026-11-14", "2026-11-21"], closes: [240, 250] },
    GOOGL: { dates: ["2026-11-21"], closes: [300] }
  }
};
var FX = { "2026-11-14": 34.0, "2026-11-17": 34.1, "2026-11-18": 34.05, "2026-11-20": 34.2, "2026-11-21": 34.34, "2026-11-24": 34.5 };
function fxOf(d) { return FX[d] || null; }
var NOW_MS = Date.parse("2026-11-24T02:00:00.000Z");      // 11-24 09:00 Thai time: the 11-24 bar is not final yet
var CTX = { nowMs: NOW_MS, nowIso: "2026-11-24T02:00:00.000Z", loadedAtMs: Date.parse(SNAP.loadedAt) };
var priceOf = HR.priceSource(SNAP, NOW_MS);
// typed long ago (legacy) unless a test says otherwise
function H(sym, mv, extra) { var h = { canonicalSymbol: sym, isHolding: true, marketValue: mv, portfolioBucket: "foreign-stock", currency: "THB", latestPrice: null, latestPriceDate: null, updatedAt: "2026-10-01T03:00:00.000Z" }; Object.keys(extra || {}).forEach(function (k) { h[k] = extra[k]; }); return h; }

console.log("== who is revalued ==");
t("held USD-priced foreign stock → eligible", HR.eligible(H("NVDA", 1000)));
["PTT.BK", "9988.HK", "BTCUSD", "K-GTECHRMF"].forEach(function (s) { t(s + " → not eligible", !HR.eligible(H(s, 1000, s === "9988.HK" ? {} : { portfolioBucket: "" }))); });
t("watchlist row / zero value / thai-stock bucket → not eligible", !HR.eligible(H("NVDA", 1000, { isHolding: false })) && !HR.eligible(H("NVDA", 0)) && !HR.eligible(H("NVDA", 1000, { portfolioBucket: "thai-stock" })));
t("bucket rule mirrors the PM table (empty bucket → foreign-stock unless .BK / BTC / RMF-SSF)", HR.bucketOf({ canonicalSymbol: "META" }) === "foreign-stock" && HR.bucketOf({ canonicalSymbol: "GULF.BK" }) === "thai-stock" && HR.bucketOf({ canonicalSymbol: "BTCUSD" }) === "bitcoin" && HR.bucketOf({ canonicalSymbol: "SCBRMF" }) === "thai-fund");

console.log("== only final closes ==");
t("11-24 09:00 Thai: the 11-24 bar (live) is skipped → newest final close = 11-21 110", priceOf(H("NVDA", 1)).date === "2026-11-21" && priceOf(H("NVDA", 1)).close === 110);
var after = HR.priceSource(SNAP, Date.parse("2026-11-24T22:00:00.000Z"))(H("NVDA", 1));
t("after 21:30 UTC the 11-24 bar is final → 115", after.date === "2026-11-24" && after.close === 115);
var during = HR.plan([H("NVDA", 100000, { latestPrice: 3400, latestPriceDate: "2026-11-21" })], HR.priceSource(SNAP, Date.parse("2026-11-24T18:00:00.000Z")), fxOf, CTX);
t("a load during the US session moves nothing (anchor stays at the 11-21 close)", during.changes.length === 0, during);
t("no series and a live latestDate → no price (never a live price)", HR.priceSource({ technicalSignals: { AMD: { latestClose: 200, latestDate: "2026-11-24" } } }, NOW_MS)(H("AMD", 1)) === null);

console.log("== older value (before this feature): start from the newest close, no move ==");
var p1 = HR.plan([H("NVDA", 100000)], priceOf, fxOf, CTX);
var c1 = p1.changes[0];
t("anchor change; value unchanged; latestPrice = 110 × 34.34; date 11-21; updatedAt untouched", p1.changes.length === 1 && c1.kind === "anchor" && c1.row.marketValue === 100000 && c1.row.latestPrice === 3777.4 && c1.row.latestPriceDate === "2026-11-21" && c1.row.updatedAt === "2026-10-01T03:00:00.000Z", c1);

console.log("== a value typed lately: anchored at the close before the typing, then moved to the newest close ==");
// typed 11-20 09:00 Thai (02:00Z): the last final close then = 11-17 (104) — the 11-20 bar closes 11-20 21:30Z
var typed = H("NVDA", 100000, { updatedAt: "2026-11-20T02:00:00.000Z" });
var p2 = HR.plan([typed], priceOf, fxOf, CTX);
var want2 = r2(100000 * (110 / 104) * (34.34 / 34.1));
t("one pass: anchor 11-17 (104 · 34.1) → newest 11-21 (110 · 34.34) = " + want2, p2.changes.length === 1 && p2.changes[0].kind === "revalue" && p2.changes[0].anchorDate === "2026-11-17" && p2.changes[0].row.marketValue === want2 && p2.changes[0].row.latestPriceDate === "2026-11-21", p2.changes[0]);
// a snapshot loaded 11-19 (series to 11-18, no lastUpdated → loadedAt counts) — the close before the typing (11-19) is not in it
var OLDSNAP = { loadedAt: "2026-11-19T12:00:00.000Z", technicalSignals: {}, historicalData: { NVDA: { dates: ["2026-11-13", "2026-11-14", "2026-11-17", "2026-11-18"], closes: [98, 100, 104, 106] } } };
var old = HR.plan([typed], HR.priceSource(OLDSNAP, NOW_MS), fxOf, { nowMs: NOW_MS, nowIso: CTX.nowIso, loadedAtMs: Date.parse(OLDSNAP.loadedAt) });
t("a snapshot loaded BEFORE the typing cannot know that close → stale-price, no change (no double count)", old.changes.length === 0 && old.skipped.NVDA === "stale-price", old);
var sameDay = HR.plan([H("NVDA", 100000, { updatedAt: "2026-11-22T02:00:00.000Z" })], priceOf, fxOf, CTX);
t("typed after the newest close (11-22) → anchored there without a move", sameDay.changes[0].kind === "anchor" && sameDay.changes[0].row.marketValue === 100000 && sameDay.changes[0].row.latestPriceDate === "2026-11-21");
t("first good run days later still counts the moves since the typing (no lost move)", (function () { var c = HR.plan([typed], HR.priceSource(SNAP, Date.parse("2026-11-24T22:00:00.000Z")), fxOf, { nowMs: Date.parse("2026-11-24T22:00:00.000Z"), loadedAtMs: Date.parse("2026-11-24T22:00:00.000Z") }).changes[0]; return c && c.row.marketValue === r2(100000 * (115 / 104) * (34.5 / 34.1)); })());
// "retry failed" keeps NVDA's series from the 11-19 load under a brand-new loadedAt (the server's cache answer
// when Yahoo fails looks the same): that series ends 11-18, the close before the typing was 11-19
var RETRY = { loadedAt: "2026-11-24T02:00:00.000Z", technicalSignals: {}, historicalData: { NVDA: { lastUpdated: "2026-11-19T12:00:00.000Z", dates: ["2026-11-13", "2026-11-14", "2026-11-17", "2026-11-18"], closes: [98, 100, 104, 106] } } };
var stale = HR.plan([typed], HR.priceSource(RETRY, NOW_MS), fxOf, CTX);
t("a series fetched before the typing (its own lastUpdated) is not trusted under a new loadedAt → stale-price, not an 11-18 anchor", stale.changes.length === 0 && stale.skipped.NVDA === "stale-price", stale);
var FRESH = { technicalSignals: {}, historicalData: { NVDA: { lastUpdated: "2026-11-24T01:59:00.000Z", dates: SNAP.historicalData.NVDA.dates, closes: SNAP.historicalData.NVDA.closes } } };
var okFresh = HR.plan([typed], HR.priceSource(FRESH, NOW_MS), fxOf, { nowMs: NOW_MS, nowIso: CTX.nowIso });
t("a series fetched after the typing is enough (no loadedAt needed)", okFresh.changes.length === 1 && okFresh.changes[0].row.marketValue === want2, okFresh);

console.log("== revalue: value × close ratio × fx ratio, exact days, same series ==");
var anchored = H("NVDA", 100000, { latestPrice: 3400, latestPriceDate: "2026-11-14" });
var c3 = HR.plan([anchored], priceOf, fxOf, CTX).changes[0];
t("NVDA 100→110 and 34.00→34.34: 100,000 → 111,100", c3 && c3.kind === "revalue" && c3.row.marketValue === 111100, c3);
t("re-anchored at the newest close, updatedAt stamped", c3.row.latestPrice === 3777.4 && c3.row.latestPriceDate === "2026-11-21" && c3.row.updatedAt === CTX.nowIso);
var again = HR.plan([c3.row], priceOf, fxOf, CTX);
t("idempotent: the same snapshot again → no change", again.changes.length === 0 && Object.keys(again.skipped).length === 0, again);
t("an older or equal close never moves a value back", HR.plan([H("NVDA", 5, { latestPrice: 1, latestPriceDate: "2026-11-22" })], priceOf, fxOf, CTX).changes.length === 0);
var gap = HR.plan([H("NVDA", 100000, { latestPrice: 3672, latestPriceDate: "2026-11-18" })], priceOf, fxOf, CTX);
t("anchor day missing in the series → not the neighbouring bar: stored-price fallback (3777.4/3672)", gap.changes[0] && gap.changes[0].row.marketValue === r2(100000 * 3777.4 / 3672), gap.changes[0]);

console.log("== split-safe ==");
var split = HR.plan([H("NVDA", 100000, { latestPrice: 34000, latestPriceDate: "2026-11-14" })], priceOf, fxOf, CTX).changes[0];
t("value follows the adjusted series (+11.1%), not the stored pre-split price (−89%)", split && split.row.marketValue === 111100, split);
var noDay = HR.plan([H("NVDA", 100000, { latestPrice: 34000, latestPriceDate: "2026-10-01" })], priceOf, fxOf, CTX);
t("no anchor-day close → stored-price fallback refuses a −89% move (big-move, no change)", noDay.changes.length === 0 && /^big-move:-89$/.test(noDay.skipped.NVDA), noDay.skipped);

console.log("== missing data ==");
t("no price for the ticker → skipped no-price", HR.plan([H("AMD", 1000)], priceOf, fxOf, CTX).skipped.AMD === "no-price");
t("no USD/THB for the close day → skipped no-fx", HR.plan([H("NVDA", 1000)], priceOf, function () { return null; }, CTX).skipped.NVDA === "no-fx");
t("GOOG held, only GOOGL priced → uses the GOOGL close", HR.plan([H("GOOG", 1000)], priceOf, fxOf, CTX).changes[0].row.latestPrice === Math.round(300 * 34.34 * 1e6) / 1e6);
t("not-eligible rows produce no change and no skip note", (function () { var o = HR.plan([H("PTT.BK", 1000, { portfolioBucket: "" }), H("NVDA", 0)], priceOf, fxOf, CTX); return o.changes.length === 0 && Object.keys(o.skipped).length === 0; })());

// ------------------------------------------------------------------ run()
function mkCore(serverRef, writes) {
  return {
    normalizeHolding: function (h) { return JSON.parse(JSON.stringify(h)); },
    dedupeHoldings: function (l) { return (l || []).map(function (h) { return JSON.parse(JSON.stringify(h)); }); },
    readLocalHoldings: function () { return serverRef.list; },
    writeLocalHoldings: function (l) { writes.push(l); }
  };
}
function fakeDate(nowIso) {
  var D = function (a) { return arguments.length ? new Date(a) : new Date(nowIso); };
  D.now = function () { return Date.parse(nowIso); }; D.parse = Date.parse; D.UTC = Date.UTC; D.prototype = Date.prototype;
  return D;
}
async function runTests() {
  console.log("== run(): fresh GET → PUT only the changed rows ==");
  var srv = { list: [H("NVDA", 100000, { latestPrice: 3400, latestPriceDate: "2026-11-14" }), H("QQQM", 50000, { latestPrice: 8585, latestPriceDate: "2026-11-21" }), H("PTT.BK", 7000, { portfolioBucket: "thai-stock" })] };
  var calls = [], puts = [], writes = [], events = [], store = {}, putAnswer = null;
  function fetchStub(url, opts) {
    calls.push((opts && opts.method || "GET") + " " + url);
    if (/frankfurter/.test(url)) { var d = url.split("/v1/")[1].split("?")[0]; return Promise.resolve({ ok: true, json: function () { return Promise.resolve({ date: d, rates: { THB: FX[d] } }); } }); }
    if (opts && opts.method === "PUT") { var b = JSON.parse(opts.body); puts.push(b); return Promise.resolve({ ok: true, json: function () { return Promise.resolve(putAnswer ? putAnswer(b) : { ok: true, data: b.data }); } }); }
    return Promise.resolve({ ok: true, json: function () { return Promise.resolve({ data: srv.list }); } });
  }
  var ctx = loadHR({ Date: fakeDate("2026-11-24T02:00:00.000Z"), fetch: fetchStub, PortfolioCore: mkCore(srv, writes), PortfolioDataSnapshot: { read: function () { return SNAP; } },
    localStorage: { getItem: function (k) { return store[k] || null; }, setItem: function (k, v) { store[k] = String(v); }, removeItem: function (k) { delete store[k]; } },
    CustomEvent: function (n, o) { this.type = n; this.detail = o && o.detail; }, dispatchEvent: function (e) { events.push(e); } });
  var res = await ctx.HoldingRevalue.run();
  t("GET holdings, USD/THB for 11-21 and 11-14, then ONE PUT", calls.filter(function (c) { return /^GET \/api\/portfolio-holdings/.test(c); }).length === 1 && calls.some(function (c) { return /frankfurter\.dev\/v1\/2026-11-21\?base=USD&symbols=THB/.test(c); }) && calls.some(function (c) { return /2026-11-14/.test(c); }) && puts.length === 1, calls);
  t("PUT carries only NVDA (QQQM already at 11-21, PTT.BK not eligible) · 111,100", puts[0] && puts[0].data.length === 1 && puts[0].data[0].canonicalSymbol === "NVDA" && puts[0].data[0].marketValue === 111100, puts[0]);
  t("local copy = the full fresh list with NVDA updated (3 rows)", writes.length === 1 && writes[0].length === 3 && writes[0][0].marketValue === 111100 && writes[0][1].marketValue === 50000);
  t("\"holdings-revalued\" event + the PM re-sync flag", events.some(function (e) { return e.type === "holdings-revalued" && e.detail.changes[0].kind === "revalue"; }) && !!store.holding_revalue_sync_v1);
  t("takeSyncFlag() reads and clears the flag", ctx.HoldingRevalue.takeSyncFlag() === true && !store.holding_revalue_sync_v1 && ctx.HoldingRevalue.takeSyncFlag() === false);
  t("USD/THB cached per day", JSON.parse(store.holding_revalue_fx_v1)["2026-11-21"] === 34.34);

  console.log("== run(): nothing due → no network ==");
  srv.list = writes[0]; calls.length = 0;
  var r2run = await ctx.HoldingRevalue.run();
  t("every eligible row already at the newest final close → no request at all", r2run.ran === false && r2run.reason === "nothing-due" && calls.length === 0, { r: r2run, calls: calls });

  console.log("== run(): the database drops the anchor columns ==");
  srv.list = [H("META", 300000)]; puts.length = 0; writes.length = 0;
  putAnswer = function (b) { return { ok: true, data: b.data.map(function (x) { var y = JSON.parse(JSON.stringify(x)); y.latestPrice = null; y.latestPriceDate = null; return y; }) }; };
  SNAP.technicalSignals.META = { latestClose: 600, latestDate: "2026-11-21" }; SNAP.historicalData.META = { dates: ["2026-11-21"], closes: [600] };
  var r4 = await ctx.HoldingRevalue.run();
  var last4 = JSON.parse(store.holding_revalue_last_v1);
  t("anchorLost reported for META (the PM note warns)", r4.anchorLost && r4.anchorLost.join() === "META" && last4.anchorLost.join() === "META", last4);
  calls.length = 0;
  var r5 = await ctx.HoldingRevalue.run();
  t("…and not re-saved on every page load for a day", r5.ran === false && calls.length === 0, calls);
  putAnswer = null;

  console.log("== run(): USD/THB kept only once that day is fixed ==");
  // 11-24 22:00Z: the 11-24 close is final; ECB answers 11-21's rate for 11-24 (not published / holiday)
  var store5 = {}, put5 = [];
  var srv5 = [H("NVDA", 100000, { latestPrice: 3777.4, latestPriceDate: "2026-11-21" })];
  var ctx5 = loadHR({ Date: fakeDate("2026-11-24T22:00:00.000Z"), PortfolioDataSnapshot: { read: function () { return SNAP; } },
    PortfolioCore: mkCore({ list: srv5 }, []),
    fetch: function (url, opts) {
      if (/frankfurter/.test(url)) { var d = url.split("/v1/")[1].split("?")[0]; return Promise.resolve({ ok: true, json: function () { return Promise.resolve(d === "2026-11-24" ? { date: "2026-11-21", rates: { THB: 34.34 } } : { date: d, rates: { THB: FX[d] } }); } }); }
      if (opts && opts.method === "PUT") { put5.push(JSON.parse(opts.body)); return Promise.resolve({ ok: true, json: function () { return Promise.resolve({ ok: true, data: JSON.parse(opts.body).data }); } }); }
      return Promise.resolve({ ok: true, json: function () { return Promise.resolve({ data: srv5 }); } });
    },
    localStorage: { getItem: function (k) { return store5[k] || null; }, setItem: function (k, v) { store5[k] = String(v); }, removeItem: function (k) { delete store5[k]; } },
    CustomEvent: function () {}, dispatchEvent: function () {} });
  await ctx5.HoldingRevalue.run();
  var fx5 = JSON.parse(store5.holding_revalue_fx_v1 || "{}");
  t("today's rate answered as an older fixing is used once but not cached (a later fixing can still arrive)", put5.length === 1 && put5[0].data[0].marketValue === r2(100000 * 115 / 110) && !("2026-11-24" in fx5) && fx5["2026-11-21"] === 34.34, { put: put5[0] && put5[0].data[0].marketValue, fx: fx5 });

  console.log("== run(): server refuses → no write ==");
  var puts3 = 0;
  var ctx3 = loadHR({ Date: fakeDate("2026-11-24T02:00:00.000Z"), fetch: function (url, opts) { if (/frankfurter/.test(url)) return Promise.resolve({ ok: true, json: function () { return Promise.resolve({ rates: { THB: 34 } }); } }); if (opts && opts.method === "PUT") puts3++; return Promise.resolve({ ok: false, status: 401, json: function () { return Promise.resolve({}); } }); },
    PortfolioCore: { normalizeHolding: function (h) { return h; }, dedupeHoldings: function (l) { return l || []; }, readLocalHoldings: function () { return [H("NVDA", 1000)]; }, writeLocalHoldings: function () { throw new Error("must not write"); } },
    PortfolioDataSnapshot: { read: function () { return SNAP; } }, localStorage: { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} } });
  var r3 = await ctx3.HoldingRevalue.run();
  t("GET 401 → ran false, no PUT, nothing written", r3.ran === false && puts3 === 0, r3);

  console.log("== run(): nothing to move on the server, but this device's copy is stale → repaired ==");
  var fresh7 = [H("NVDA", 111100, { latestPrice: 3777.4, latestPriceDate: "2026-11-21" })];
  var stale7 = [H("NVDA", 100000, { latestPrice: 3400, latestPriceDate: "2026-11-14" })];
  var w7 = [], p7 = 0;
  var ctx7 = loadHR({ Date: fakeDate("2026-11-24T02:00:00.000Z"), PortfolioDataSnapshot: { read: function () { return SNAP; } },
    PortfolioCore: { normalizeHolding: function (h) { return JSON.parse(JSON.stringify(h)); }, dedupeHoldings: function (l) { return JSON.parse(JSON.stringify(l || [])); }, readLocalHoldings: function () { return stale7; }, writeLocalHoldings: function (l) { w7.push(l); } },
    fetch: function (url, opts) {
      if (/frankfurter/.test(url)) { var d = url.split("/v1/")[1].split("?")[0]; return Promise.resolve({ ok: true, json: function () { return Promise.resolve({ date: d, rates: { THB: FX[d] } }); } }); }
      if (opts && opts.method === "PUT") { p7++; return Promise.resolve({ ok: true, json: function () { return Promise.resolve({}); } }); }
      return Promise.resolve({ ok: true, json: function () { return Promise.resolve({ data: fresh7 }); } });
    }, localStorage: { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} } });
  var r7 = await ctx7.HoldingRevalue.run();
  t("another device already moved NVDA → no PUT here, the local copy takes the server's 111,100", r7.ran === true && p7 === 0 && w7.length === 1 && w7[0][0].marketValue === 111100, { r: r7, puts: p7, writes: w7.length });

  console.log("== run() and a typed value share one lock · a run asked mid-run runs again ==");
  // real portfolio-core + holding-revalue in one page; the run's PUT is held back while the user types NVDA
  var server6 = { NVDA: H("NVDA", 100000, { latestPrice: 3400, latestPriceDate: "2026-11-14" }), META: H("META", 50000, { latestPrice: 20604, latestPriceDate: "2026-11-21" }) };
  var ops6 = [], gate6 = null, first6 = true;
  var store6 = { portfolioHoldingsDraft: JSON.stringify([server6.NVDA, server6.META]) };
  var lctx = { console: console, JSON: JSON, Math: Math, Date: fakeDate("2026-11-24T02:00:00.000Z"), Object: Object, Array: Array, Promise: Promise, Map: Map, Set: Set, Number: Number, String: String, Boolean: Boolean, isFinite: isFinite, RegExp: RegExp, Error: Error,
    setTimeout: setTimeout, clearTimeout: clearTimeout,
    localStorage: { getItem: function (k) { return store6[k] || null; }, setItem: function (k, v) { store6[k] = String(v); }, removeItem: function (k) { delete store6[k]; } },
    CustomEvent: function (n, o) { this.type = n; this.detail = o && o.detail; }, dispatchEvent: function () { return true; },
    PortfolioDataSnapshot: { read: function () { return SNAP; } },
    fetch: function (url, opts) {
      var m = (opts && opts.method) || "GET";
      if (/frankfurter/.test(url)) { var d = url.split("/v1/")[1].split("?")[0]; return Promise.resolve({ ok: true, json: function () { return Promise.resolve({ date: d, rates: { THB: FX[d] } }); } }); }
      if (m === "GET") { ops6.push("GET"); var list = Object.keys(server6).map(function (k) { return JSON.parse(JSON.stringify(server6[k])); }); return Promise.resolve({ ok: true, json: function () { return Promise.resolve({ data: list }); } }); }
      var body = JSON.parse(opts.body), tag = body.data.map(function (r) { return r.canonicalSymbol + ":" + r.marketValue; }).join(",");
      ops6.push("PUT " + tag);
      var apply = function () { body.data.forEach(function (r) { server6[r.canonicalSymbol] = JSON.parse(JSON.stringify(r)); }); ops6.push("stored " + tag); return { ok: true, json: function () { return Promise.resolve({ ok: true, data: body.data }); } }; };
      if (first6) { first6 = false; return new Promise(function (res) { gate6 = function () { res(apply()); }; }); }
      return Promise.resolve(apply());
    } };
  lctx.window = lctx; vm.createContext(lctx);
  vm.runInContext(read("portfolio-core.js"), lctx, { filename: "portfolio-core.js" });
  vm.runInContext(SRC_HR, lctx, { filename: "holding-revalue.js" });
  function settle() { var p = Promise.resolve(); for (var i = 0; i < 30; i++) p = p.then(function () { return new Promise(function (r) { setImmediate(r); }); }); return p; }
  var run6 = lctx.HoldingRevalue.run();
  await settle();
  t("the run holds the lock: its revalue PUT (NVDA 111,100) is in flight", !!gate6 && ops6.join(" | ") === "GET | PUT NVDA:111100", ops6);
  // typed 01:59Z, a minute before this snapshot's load → the re-run can anchor it (at 11-21, no move)
  var typed6 = lctx.PortfolioCore.updateHolding(function (l) { return l.findIndex(function (h) { return h.canonicalSymbol === "NVDA"; }); },
    function (row) { return Object.assign({}, row, { marketValue: 120000, latestPrice: null, latestPriceDate: null, updatedAt: "2026-11-24T01:59:00.000Z" }); });
  var again6 = lctx.HoldingRevalue.run();   // the PM page asks for a run right after a save
  await settle();
  t("a value typed meanwhile waits: no server read until the run's PUT is stored", ops6.length === 2, ops6);
  t("run() asked mid-run hands back the run in flight", again6 === run6);
  gate6();
  await run6; await typed6;
  t("the typed value wins: server NVDA 120,000 un-anchored · GET → PUT(run) → GET → PUT(typed)", server6.NVDA.marketValue === 120000 && server6.NVDA.latestPriceDate == null && ops6.join(" | ") === "GET | PUT NVDA:111100 | stored NVDA:111100 | GET | PUT NVDA:120000 | stored NVDA:120000", ops6);
  await new Promise(function (r) { setTimeout(r, 450); });
  t("…and the run asked mid-run runs once more right after: the typed 120,000 is anchored at 11-21 without moving", ops6.length === 9 && ops6[6] === "GET" && ops6[7] === "PUT NVDA:120000" && server6.NVDA.marketValue === 120000 && server6.NVDA.latestPriceDate === "2026-11-21", ops6);

  console.log("== portfolio-core: one row up · one read-modify-write at a time · empty stays empty ==");
  var SRC_CORE = read("portfolio-core.js");
  var serverRows = [{ canonicalSymbol: "NVDA", isHolding: true, marketValue: 1 }, { canonicalSymbol: "META", isHolding: true, marketValue: 2 }, { canonicalSymbol: "QQQM", isHolding: true, marketValue: 3 }];
  var cPut = [], cStore = {}, putOk = true, order = [];
  var cctx = { console: console, JSON: JSON, Math: Math, Date: Date, Object: Object, Array: Array, Promise: Promise, Map: Map, Set: Set, Number: Number, String: String, Boolean: Boolean,
    localStorage: { getItem: function (k) { return cStore[k] || null; }, setItem: function (k, v) { cStore[k] = String(v); } },
    CustomEvent: function (n, o) { this.type = n; this.detail = o && o.detail; }, dispatchEvent: function () {},
    fetch: function (url, opts) {
      order.push((opts && opts.method) || "GET");
      if (opts && opts.method === "PUT") { cPut.push(JSON.parse(opts.body)); return Promise.resolve({ ok: putOk, status: putOk ? 200 : 500, json: function () { return Promise.resolve({}); } }); }
      return Promise.resolve({ ok: true, json: function () { return Promise.resolve({ data: serverRows }); } });
    } };
  cctx.window = cctx; vm.createContext(cctx); vm.runInContext(SRC_CORE, cctx, { filename: "portfolio-core.js" });
  var C = cctx.PortfolioCore;
  var list = await C.updateHolding(function (l) { return l.findIndex(function (h) { return h.canonicalSymbol === "META"; }); },
    function (row) { return Object.assign({}, row, { marketValue: 222, latestPrice: null, latestPriceDate: null }); });
  t("PUT body = ONLY the edited row (META 222) — other rows are not re-sent", cPut.length === 1 && cPut[0].data.length === 1 && cPut[0].data[0].canonicalSymbol === "META" && cPut[0].data[0].marketValue === 222, cPut);
  t("local copy = server list with META changed (3 rows)", list.length === 3 && JSON.parse(cStore.portfolioHoldingsDraft).filter(function (h) { return h.canonicalSymbol === "META"; })[0].marketValue === 222);
  putOk = false; cStore = {};
  var threw = false;
  try { await C.updateHolding(function () { return 0; }, function (r) { return Object.assign({}, r, { marketValue: 999 }); }); } catch (e) { threw = true; }
  t("PUT refused → throws and the local copy is NOT changed (a failed save never shows as saved)", threw && !cStore.portfolioHoldingsDraft);
  putOk = true; order.length = 0;
  var slow = C.withHoldingsLock(function () { order.push("A-start"); return new Promise(function (res) { setTimeout(function () { order.push("A-end"); res(); }, 30); }); });
  var fast = C.withHoldingsLock(function () { order.push("B"); return Promise.resolve(); });
  await Promise.all([slow, fast]);
  t("withHoldingsLock runs read-modify-writes one at a time (B waits for A)", order.join() === "A-start,A-end,B", order);
  var failing = C.withHoldingsLock(function () { return Promise.reject(new Error("x")); }).catch(function () { return "caught"; });
  var afterFail = C.withHoldingsLock(function () { return Promise.resolve("ran"); });
  t("a failed task does not jam the lock", (await failing) === "caught" && (await afterFail) === "ran");
  var nh = C.normalizeHolding({ canonicalSymbol: "NVDA", isHolding: true, marketValue: 5, quantity: null, averageCost: 120, latestPrice: "" });
  t("empty numbers stay empty: quantity null (not 0) · costValue null (not 0 × 120) · latestPrice \"\" → null", nh.quantity === null && nh.costValue === null && nh.latestPrice === null && nh.averageCost === 120, nh);
  var API = fs.readFileSync(path.join(ROOT, "api", "portfolio-holdings.js"), "utf8");
  t("server keeps empty numbers empty too (toNullableNumber) · a held row without a value is still 0", /if \(value === null \|\| value === undefined \|\| \(typeof value === "string" && value\.trim\(\) === ""\)\) return null;/.test(API) && /market_value: isHolding \? \(marketValue \?\? 0\) : 0/.test(API));

  console.log("== PM page + shell wiring ==");
  var PM = read("portfolio-manager-page.js"), PMH = read("portfolio-manager.html"), NAV = read("app-navigation.js");
  t("PM saves one row via PortfolioCore.updateHolding (no full-list saveHoldings)", /core\.updateHolding\(find, mutate\)/.test(PM) && !/core\.saveHoldings\(holdings\)/.test(PM));
  t("a typed value clears the anchor and asks for a run right after the save", /latestPrice: null,\s*latestPriceDate: null,/.test(PM) && /scheduleRowSync\(\);\s*if \(window\.HoldingRevalue && window\.HoldingRevalue\.run\) window\.HoldingRevalue\.run\(\);/.test(PM));
  t("a failed save tells the user (no silent loss)", /บันทึกมูลค่า " \+ key \+ " ไม่สำเร็จ/.test(PM));
  t("value note: ปรับตามราคาปิด <date> / why not / anchor columns missing — no money in it", /function mvAutoNote\(ticker\)/.test(PM) && /ปรับตามราคาปิด ' \+ esc\(label\)/.test(PM) && /ฐานข้อมูลยังไม่มีช่องเก็บราคาอ้างอิง/.test(PM) && /mvAutoNote\(r\.ticker\) \+ '<\/td>'/.test(PM));
  t("a revalue re-syncs the quarter's foreign-stock row — here (event) or on the next PM boot (flag from another page)", /addEventListener\("holdings-revalued"[\s\S]{0,400}scheduleRowSync\(\)/.test(PM) && /takeSyncFlag\(\)\) scheduleRowSync\(\)/.test(PM));
  t("PM page loads holding-revalue.js right after portfolio-core.js", /portfolio-core\.js\?v=[^"]+"><\/script>\s*<script src="\/holding-revalue\.js\?v=/.test(PMH));
  t("every page gets it through the shell (Load Latest Data anywhere moves the values once)", /ensureScript\("\/portfolio-core\.js\?v=[^"]+"\);\s*ensureScript\("\/holding-revalue\.js\?v=[^"]+"\);/.test(NAV));
  t("module is ES5 (no let/const/arrow/template)", !/\b(let|const)\s|=>|`/.test(SRC_HR));
  t("module PUTs changed rows only, inside the holdings lock", /JSON\.stringify\(\{ data: rows \}\)/.test(SRC_HR) && /var rows = out\.changes\.map/.test(SRC_HR) && /return lock\(function \(\)/.test(SRC_HR));
}

runTests().then(function () {
  console.log("\n" + (pass + fail) + " checks · " + pass + " passed · " + fail + " failed");
  if (fail) process.exit(1);
}, function (e) { console.log("  FAIL  threw — " + (e && e.stack)); process.exit(1); });
