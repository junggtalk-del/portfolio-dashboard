// Bitcoin เป็นจำนวน BTC (2026-11-25 · spec docs/superpowers/specs/2026-11-25-btc-quantity-design.md)
//   node scripts/btc-value-test.js
//
// What must stay true (public/btc-value.js):
//   · value = round2(btcQty × BTC-USD × USD/THB) — 0.5 BTC × $100,000 × 34 = ฿1,700,000.00
//   · only bitcoin rows that carry btcQty, only in the latest quarter that has not ended by the calendar
//   · never revalue with a price older than the one the row was valued with (another device may be fresher)
//   · pure: input never mutated · untouched rows/quarters/keys keep their reference · no change = the same object back
//   · held value = Σ row value × invested% (for the BTC row in the holdings list)
// No network, no real portfolio documents.
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
var SRC = "";
try { SRC = read("btc-value.js"); } catch (e) { SRC = ""; }
function loadBV(extra) {
  var ctx = { console: console, JSON: JSON, Math: Math, Date: Date, Object: Object, Array: Array, Promise: Promise, String: String, Number: Number, isFinite: isFinite, RegExp: RegExp, Error: Error };
  Object.keys(extra || {}).forEach(function (k) { ctx[k] = extra[k]; });
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx, { filename: "btc-value.js" });
  return ctx;
}
function clone(x) { return JSON.parse(JSON.stringify(x)); }

var BV = null;
try { BV = loadBV().BtcValue; } catch (e) { BV = null; }
if (!BV) {
  t("public/btc-value.js loads and defines window.BtcValue", false, SRC ? "loaded but no BtcValue" : "file missing");
  console.log("\n" + (pass + fail) + " checks · " + pass + " passed · " + fail + " failed");
  process.exit(1);
}

var NOV = Date.parse("2026-11-25T03:00:00.000Z");      // inside 2026-Q4 (any time zone)
var JAN = Date.parse("2027-01-05T03:00:00.000Z");      // 2026-Q4 has ended by the calendar
var AT = "2026-11-25T02:00:00.000Z";
var LIVE = { usd: 100000, fx: 34, at: AT };

console.log("== priceOf: the BTC price of a Load Latest Data snapshot ==");
var SNAP = { loadedAt: "2026-11-25T01:59:00.000Z",
  historicalData: { BTCUSD: { lastUpdated: AT, dates: ["2026-11-24", "2026-11-25"], closes: [99000, 100000] } },
  technicalSignals: { BTCUSD: { latestClose: 98000, latestDate: "2026-11-25" } } };
var p1 = BV.priceOf(SNAP);
t("newest close of historicalData.BTCUSD + its lastUpdated", p1 && p1.usd === 100000 && p1.at === AT, p1);
var p2 = BV.priceOf({ loadedAt: "2026-11-25T01:59:00.000Z", technicalSignals: { BTCUSD: { latestClose: 98000 } } });
t("no series → technicalSignals.BTCUSD.latestClose, time = loadedAt", p2 && p2.usd === 98000 && p2.at === "2026-11-25T01:59:00.000Z", p2);
var p3 = BV.priceOf({ loadedAt: "2026-11-25T01:59:00.000Z", historicalData: { "BTC-USD": { dates: ["2026-11-25"], closes: [97000] } } });
t("the BTC-USD key is accepted too (time = loadedAt without lastUpdated)", p3 && p3.usd === 97000 && p3.at === "2026-11-25T01:59:00.000Z", p3);
var p4 = BV.priceOf({ loadedAt: AT, historicalData: { BTCUSD: { lastUpdated: AT, dates: ["a", "b", "c"], closes: [100000, 0, ""] } } });
t("a 0 / empty newest close is skipped → the last real close", p4 && p4.usd === 100000, p4);
t("no BTC anywhere → null", BV.priceOf({ loadedAt: AT, historicalData: {}, technicalSignals: {} }) === null && BV.priceOf(null) === null);
t("a price without any time → null (freshness cannot be judged)", BV.priceOf({ historicalData: { BTCUSD: { dates: ["x"], closes: [100000] } } }) === null);
t("negative / NaN closes are not prices", BV.priceOf({ loadedAt: AT, historicalData: { BTCUSD: { dates: ["a", "b"], closes: [-5, NaN] } }, technicalSignals: { BTCUSD: { latestClose: -1 } } }) === null);

console.log("== liveKeyOf: the quarter that follows the price ==");
var DOC2 = { quarters: { "2026-Q3": { assets: [] }, "2026-Q4": { assets: [] } } };
t("2026-11-25 · quarters Q3, Q4 → 2026-Q4", BV.liveKeyOf(DOC2, NOV) === "2026-Q4");
t("2027-01-05 · latest is 2026-Q4 (ended) → null", BV.liveKeyOf(DOC2, JAN) === null);
t("a future quarter created early follows the price", BV.liveKeyOf({ quarters: { "2026-Q4": {}, "2027-Q1": {} } }, NOV) === "2027-Q1");
t("wrapper { data } accepted · no quarters → null", BV.liveKeyOf({ data: DOC2 }, NOV) === "2026-Q4" && BV.liveKeyOf({ data: null }, NOV) === null && BV.liveKeyOf({ quarters: {} }, NOV) === null);
t("currentQuarter (the Editor's selection) does not change the live quarter", BV.liveKeyOf({ currentQuarter: "2026-Q3", quarters: DOC2.quarters }, NOV) === "2026-Q4");

console.log("== valueOfRow: quantity × the freshest price ==");
var v1 = BV.valueOfRow({ btcQty: 0.5 }, LIVE);
t("0.5 BTC × $100,000 × 34 = 1,700,000", v1 && v1.value === 1700000 && v1.usd === 100000 && v1.fx === 34 && v1.at === AT, v1);
var STORED = { btcQty: 0.5, btcPriceUsd: 101000, usdThb: 34.2, btcValuedAt: "2026-11-25T10:00:00.000Z" };
var v2 = BV.valueOfRow(STORED, { usd: 90000, fx: 33, at: "2026-11-24T10:00:00.000Z" });
t("row valued with a newer price than the snapshot's → keeps its own price (0.5 × 101,000 × 34.2)", v2 && v2.value === 1727100 && v2.at === "2026-11-25T10:00:00.000Z", v2);
var v3 = BV.valueOfRow(STORED, { usd: 102000, fx: 34.5, at: "2026-11-25T10:00:00.000Z" });
t("same time → the live price wins (>=)", v3 && v3.usd === 102000, v3);
t("no live price → the row's own stored price", (function () { var v = BV.valueOfRow(STORED, null); return v && v.value === 1727100; })());
t("no quantity / bad quantity → null", BV.valueOfRow({}, LIVE) === null && BV.valueOfRow({ btcQty: "0.5" }, LIVE) === null && BV.valueOfRow({ btcQty: -1 }, LIVE) === null && BV.valueOfRow({ btcQty: NaN }, LIVE) === null && BV.valueOfRow({ btcQty: null }, LIVE) === null);
t("no price at all → null", BV.valueOfRow({ btcQty: 0.5 }, null) === null);
t("0 BTC is a real quantity → ฿0", (function () { var v = BV.valueOfRow({ btcQty: 0 }, LIVE); return v && v.value === 0; })());
t("rounded to satang", BV.valueOfRow({ btcQty: 0.123456789 }, { usd: 97123.45, fx: 34.567, at: AT }).value === Math.round(0.123456789 * 97123.45 * 34.567 * 100) / 100);
t("isQty: finite numbers ≥ 0 only", BV.isQty(0) && BV.isQty(1.5) && !BV.isQty(-0.1) && !BV.isQty("1") && !BV.isQty(Infinity) && !BV.isQty(null) && !BV.isQty(undefined));

console.log("== applyToDoc: only the live quarter's bitcoin rows with a quantity ==");
function DOC() {
  return {
    currentQuarter: "2026-Q4",
    allocation: { keep: [1, 2] },
    quarters: {
      "2026-Q3": { key: "2026-Q3", assets: [{ id: "b3", type: "bitcoin", name: "Bitcoin", btcQty: 0.4, manualValue: 1200000, snapshotValue: 1200000, investedPercent: 50 }] },
      "2026-Q4": { key: "2026-Q4", savedAt: "2026-11-01T00:00:00.000Z", assets: [
        { id: "b4", type: "bitcoin", name: "Bitcoin", btcQty: 0.5, manualValue: 1500000, snapshotValue: 1500000, investedPercent: 60, netFlow: 0 },
        { id: "f4", type: "foreign-stock", name: "US", manualValue: 5000000, snapshotValue: 5000000, investedPercent: 70 },
        { id: "x4", type: "bitcoin", name: "Cold wallet", manualValue: 300000, snapshotValue: 300000, investedPercent: 100 }] }
    }
  };
}
var d0 = DOC(), d0copy = clone(d0);
var r1 = BV.applyToDoc(d0, LIVE, { now: NOV });
var b4 = r1.ps.quarters["2026-Q4"].assets[0];
t("bitcoin row with a quantity → manualValue = snapshotValue = 1,700,000 · price fields stored", b4.manualValue === 1700000 && b4.snapshotValue === 1700000 && b4.btcPriceUsd === 100000 && b4.usdThb === 34 && b4.btcValuedAt === AT, b4);
t("quantity, %, id, name, netFlow kept", b4.btcQty === 0.5 && b4.investedPercent === 60 && b4.id === "b4" && b4.name === "Bitcoin" && b4.netFlow === 0);
t("one change reported: Bitcoin 0.5 · 1,500,000 → 1,700,000", r1.changes.length === 1 && r1.changes[0].name === "Bitcoin" && r1.changes[0].qty === 0.5 && r1.changes[0].from === 1500000 && r1.changes[0].to === 1700000 && r1.changes[0].at === AT, r1.changes);
t("input not mutated", JSON.stringify(d0) === JSON.stringify(d0copy));
t("other rows / the earlier quarter / other keys keep their reference", r1.ps !== d0 && r1.ps.quarters["2026-Q4"].assets[1] === d0.quarters["2026-Q4"].assets[1] && r1.ps.quarters["2026-Q4"].assets[2] === d0.quarters["2026-Q4"].assets[2] && r1.ps.quarters["2026-Q3"] === d0.quarters["2026-Q3"] && r1.ps.allocation === d0.allocation);
t("quarter fields kept (key, savedAt)", r1.ps.quarters["2026-Q4"].key === "2026-Q4" && r1.ps.quarters["2026-Q4"].savedAt === "2026-11-01T00:00:00.000Z");
var r2 = BV.applyToDoc(r1.ps, LIVE, { now: NOV });
t("again with the same price → no change, the same object back (idempotent)", r2.changes.length === 0 && r2.ps === r1.ps);
var w = { data: DOC(), mode: "supabase" };
var rw = BV.applyToDoc(w, LIVE, { now: NOV });
t("wrapper { data, mode } → new wrapper, mode kept, data revalued", rw.ps !== w && rw.ps.mode === "supabase" && rw.ps.data.quarters["2026-Q4"].assets[0].manualValue === 1700000 && w.data.quarters["2026-Q4"].assets[0].manualValue === 1500000);
var stale = DOC();
stale.quarters["2026-Q4"].assets[0] = { id: "b4", type: "bitcoin", name: "Bitcoin", btcQty: 0.5, manualValue: 1727100, snapshotValue: 1727100, investedPercent: 60, btcPriceUsd: 101000, usdThb: 34.2, btcValuedAt: "2026-11-25T10:00:00.000Z" };
var rs = BV.applyToDoc(stale, { usd: 90000, fx: 33, at: "2026-11-24T10:00:00.000Z" }, { now: NOV });
t("an older snapshot price never overwrites a row valued with a newer price (no change)", rs.changes.length === 0 && rs.ps === stale, rs.changes);
var rj = BV.applyToDoc(DOC(), LIVE, { now: JAN });
t("2027-01-05: 2026-Q4 has ended → nothing follows the price", rj.changes.length === 0);
var rn = BV.applyToDoc(DOC(), null, { now: NOV });
t("no price and no stored price → nothing changes", rn.changes.length === 0);
t("no quarters / null → { ps, changes: [] }", BV.applyToDoc({ quarters: {} }, LIVE, { now: NOV }).changes.length === 0 && BV.applyToDoc(null, LIVE, { now: NOV }).ps === null);
var zero = DOC(); zero.quarters["2026-Q4"].assets[0].btcQty = 0;
t("0 BTC → the row is worth ฿0", BV.applyToDoc(zero, LIVE, { now: NOV }).ps.quarters["2026-Q4"].assets[0].manualValue === 0);

console.log("== heldValueOf: what the BTC row of the holdings list should be worth ==");
function ONE(mv, inv) { return { quarters: { "2026-Q4": { assets: [{ type: "bitcoin", name: "Bitcoin", btcQty: 0.5, manualValue: mv, investedPercent: inv }] } } }; }
t("1,700,000 × 60% = 1,020,000", BV.heldValueOf(ONE(1700000, 60), { now: NOV }) === 1020000);
t("two bitcoin rows add up (1,700,000 × 60% + 300,000 × 100%)", BV.heldValueOf(r1.ps, { now: NOV }) === 1320000);
t("no bitcoin row → null · quarter ended → null", BV.heldValueOf({ quarters: { "2026-Q4": { assets: [{ type: "cash", manualValue: 5 }] } } }, { now: NOV }) === null && BV.heldValueOf(ONE(1700000, 60), { now: JAN }) === null);
t("bitcoin rows but none with a quantity yet (feature not in use) → null — the holdings row is left alone",
  BV.heldValueOf({ quarters: { "2026-Q4": { assets: [{ type: "bitcoin", name: "Bitcoin", manualValue: 900000, investedPercent: 100 }] } } }, { now: NOV }) === null);
t("invested% outside 0–100 is clamped like the Editor does", BV.heldValueOf(ONE(1000, 150), { now: NOV }) === 1000 && BV.heldValueOf(ONE(1000, -5), { now: NOV }) === 0);

console.log("== module ==");
t("ES5 only (no let/const/arrow/template)", !/\b(let|const)\s|=>|`/.test(SRC));

// ------------------------------------------------------------------ run(): the writer (Task 2)
// one "page" = real portfolio-core.js + btc-value.js in a vm · server = in-memory doc + holdings
function fakeDate(nowIso) {
  var D = function (a) { return arguments.length ? new Date(a) : new Date(nowIso); };
  D.now = function () { return Date.parse(nowIso); }; D.parse = Date.parse; D.UTC = Date.UTC; D.prototype = Date.prototype;
  return D;
}
var SRC_CORE = read("portfolio-core.js");
function settle() { var p = Promise.resolve(); for (var i = 0; i < 40; i++) p = p.then(function () { return new Promise(function (r) { setImmediate(r); }); }); return p; }
function oneBtcDoc(mv) { return { currentQuarter: "2026-Q4", allocation: { v: 1 }, quarters: { "2026-Q3": { key: "2026-Q3", assets: [{ id: "b3", type: "bitcoin", name: "Bitcoin", manualValue: 1000000, snapshotValue: 1000000, investedPercent: 50 }] }, "2026-Q4": { key: "2026-Q4", assets: [{ id: "b4", type: "bitcoin", name: "Bitcoin", btcQty: 0.5, manualValue: mv, snapshotValue: mv, investedPercent: 60 }, { id: "c4", type: "cash", name: "เงินสด", manualValue: 200000, snapshotValue: 200000, investedPercent: 0 }] } } }; }
function HOLD(sym, mv, extra) { var h = { canonicalSymbol: sym, assetName: sym, isHolding: true, marketValue: mv, portfolioBucket: "", currency: "THB" }; Object.keys(extra || {}).forEach(function (k) { h[k] = extra[k]; }); return h; }
function page(o) {
  o = o || {};
  var srv = { doc: clone(o.doc || oneBtcDoc(1500000)), holdings: clone(o.holdings || []), ops: [], fxCalls: 0, failPut: false, gateDocPut: null };
  var snap = o.snapshot !== undefined ? o.snapshot : { snapshotId: "s1", loadedAt: AT, historicalData: { BTCUSD: { lastUpdated: AT, dates: ["2026-11-25"], closes: [100000] } }, technicalSignals: {},
    portfolioStatus: { data: clone(o.snapDoc || o.doc || oneBtcDoc(1500000)), mode: "supabase" }, portfolioHoldings: { data: clone(o.holdings || []), mode: "server" } };
  var store = o.store || {};
  var writes = [], events = [];
  var ctx = { console: console, JSON: JSON, Math: Math, Date: fakeDate(o.now || "2026-11-25T03:00:00.000Z"), Object: Object, Array: Array, Promise: Promise, Map: Map, Set: Set, Number: Number, String: String, Boolean: Boolean, isFinite: isFinite, RegExp: RegExp, Error: Error,
    setTimeout: o.timers ? function (fn, ms) { o.timers.push(ms); return o.timers.length; } : setTimeout, clearTimeout: o.timers ? function () {} : clearTimeout,
    localStorage: { getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; }, setItem: function (k, v) { store[k] = String(v); }, removeItem: function (k) { delete store[k]; } },
    CustomEvent: function (n, x) { this.type = n; this.detail = x && x.detail; }, dispatchEvent: function (e) { events.push(e.type); return true; },
    PortfolioDataSnapshot: { read: function () { return snap; }, write: function (s) { snap = s; writes.push(s); return s; } },
    fetch: function (url, init) {
      var m = (init && init.method) || "GET";
      if (/frankfurter/.test(url)) { srv.fxCalls++; if (o.fxFail) return Promise.reject(new TypeError("Failed to fetch")); return Promise.resolve({ ok: true, json: function () { return Promise.resolve({ amount: 1, base: "USD", date: "2026-11-24", rates: { THB: o.fx || 34 } }); } }); }
      if (url === "/api/portfolio") {
        if (m === "GET") { srv.ops.push("GET doc"); var d = o.emptyDoc ? { quarters: {} } : clone(srv.doc); return Promise.resolve({ ok: true, json: function () { return Promise.resolve({ data: d, mode: "supabase" }); } }); }
        var body = JSON.parse(init.body);
        srv.ops.push("PUT doc");
        var apply = function () { if (srv.failPut) return { ok: false, status: 500, json: function () { return Promise.resolve({}); } }; srv.doc = body.data; srv.ops.push("stored doc"); return { ok: true, json: function () { return Promise.resolve({ ok: true }); } }; };
        if (srv.gateDocPut) { var g = srv.gateDocPut; srv.gateDocPut = null; return new Promise(function (res) { g.release = function () { res(apply()); }; }); }
        return Promise.resolve(apply());
      }
      if (url === "/api/portfolio-holdings") {
        if (m === "GET") { srv.ops.push("GET holdings"); return Promise.resolve({ ok: true, json: function () { return Promise.resolve({ data: clone(srv.holdings) }); } }); }
        var hb = JSON.parse(init.body);
        srv.ops.push("PUT holdings " + hb.data.map(function (r) { return r.canonicalSymbol + ":" + r.marketValue; }).join(","));
        hb.data.forEach(function (r) { var i = srv.holdings.findIndex(function (h) { return h.canonicalSymbol === r.canonicalSymbol; }); if (i >= 0) srv.holdings[i] = r; else srv.holdings.push(r); });
        return Promise.resolve({ ok: true, json: function () { return Promise.resolve({ ok: true, data: hb.data }); } });
      }
      return Promise.reject(new Error("unexpected " + url));
    } };
  ctx.window = ctx;
  vm.createContext(ctx);
  if (!o.noCore) vm.runInContext(SRC_CORE, ctx, { filename: "portfolio-core.js" });
  if (o.holdings) store.portfolioHoldingsDraft = JSON.stringify(o.holdings);
  vm.runInContext(SRC, ctx, { filename: "btc-value.js" });
  return { ctx: ctx, srv: srv, store: store, writes: writes, events: events, snap: function () { return snap; } };
}
function bitcoinRow(doc) { return doc.quarters["2026-Q4"].assets.filter(function (a) { return a.type === "bitcoin"; })[0]; }

async function runAsync() {
  console.log("== run(): GET the document → PUT once → the snapshot copy follows ==");
  var P = page();
  var r1 = await P.ctx.BtcValue.run();
  t("GET then one PUT; the stored bitcoin row = 1,700,000 at $100,000 × 34", P.srv.ops.join(" | ") === "GET doc | PUT doc | stored doc" && bitcoinRow(P.srv.doc).manualValue === 1700000 && bitcoinRow(P.srv.doc).usdThb === 34, P.srv.ops);
  t("other rows / the earlier quarter / other keys sent back unchanged", JSON.stringify(P.srv.doc.quarters["2026-Q3"]) === JSON.stringify(oneBtcDoc(0).quarters["2026-Q3"]) && P.srv.doc.quarters["2026-Q4"].assets[1].manualValue === 200000 && P.srv.doc.allocation.v === 1);
  var sw = P.writes[P.writes.length - 1];
  t("snapshot written: portfolioStatus.data = the PUT document · wrapper mode kept · other snapshot fields kept", P.writes.length === 1 && bitcoinRow(sw.portfolioStatus.data).manualValue === 1700000 && sw.portfolioStatus.mode === "supabase" && sw.snapshotId === "s1" && sw.loadedAt === AT);
  t("result: ran · one change · \"btc-value-updated\" fired", r1.ran === true && r1.changes.length === 1 && r1.changes[0].to === 1700000 && P.events.indexOf("btc-value-updated") >= 0, r1);
  var opsBefore = P.srv.ops.length, fxBefore = P.srv.fxCalls;
  var r2 = await P.ctx.BtcValue.run();
  t("run again after its own snapshot write → nothing-due, no request at all (no loop)", r2.ran === false && r2.reason === "nothing-due" && P.srv.ops.length === opsBefore && P.srv.fxCalls === fxBefore, { r: r2, ops: P.srv.ops.slice(opsBefore) });

  console.log("== run(): failures write nothing ==");
  var F = page(); F.srv.failPut = true;
  var rf = await F.ctx.BtcValue.run();
  t("PUT refused → ran false · snapshot not written · server unchanged", rf.ran === false && F.writes.length === 0 && bitcoinRow(F.srv.doc).manualValue === 1500000, rf);
  var E = page({ emptyDoc: true });
  var re = await E.ctx.BtcValue.run();
  t("server answers a document without quarters → no PUT", re.ran === false && E.srv.ops.indexOf("PUT doc") < 0, E.srv.ops);
  var N = page({ snapshot: { loadedAt: AT, historicalData: {}, technicalSignals: {}, portfolioStatus: { data: oneBtcDoc(1500000) } } });
  var rn = await N.ctx.BtcValue.run();
  t("no BTC price in the snapshot → no-price · no request", rn.reason === "no-price" && N.srv.ops.length === 0 && N.srv.fxCalls === 0, rn);
  var X = page({ fxFail: true });
  var rx = await X.ctx.BtcValue.run();
  t("USD/THB unreachable and never cached → no-fx · no document request", rx.reason === "no-fx" && X.srv.ops.length === 0, rx);

  console.log("== USD/THB: once a day, the last good rate when the network fails ==");
  var store = {};
  var A1 = page({ store: store });
  var f1 = await A1.ctx.BtcValue.fx(), f2 = await A1.ctx.BtcValue.fx();
  t("same day → one request · 34 cached under the UTC day", f1 === 34 && f2 === 34 && A1.srv.fxCalls === 1 && JSON.parse(store.btc_value_fx_v1).day === "2026-11-25" && A1.ctx.BtcValue.lastFx() === 34, store.btc_value_fx_v1);
  var A2 = page({ store: store, now: "2026-11-26T03:00:00.000Z", fxFail: true });
  var f3 = await A2.ctx.BtcValue.fx();
  t("next day, network down → yesterday's 34 (not null)", f3 === 34 && A2.srv.fxCalls === 1, f3);

  console.log("== the document lock: no lost update between two writers on one page ==");
  var L = page();
  // another writer on this page (e.g. the Editor saving allocation) holds the lock: its PUT is in flight
  var gate = {};
  L.srv.gateDocPut = gate;
  var other = L.ctx.PortfolioCore.withDocLock(function () {
    return L.ctx.fetch("/api/portfolio", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (j) {
      var next = clone(j.data); next.allocation = { v: 2 };
      return L.ctx.fetch("/api/portfolio", { method: "PUT", body: JSON.stringify({ data: next }) });
    });
  });
  await settle();
  var runL = L.ctx.BtcValue.run();
  await settle();
  t("while the other writer's PUT is in flight, run has not read the document", L.srv.ops.join(" | ") === "GET doc | PUT doc", L.srv.ops);
  gate.release();
  await other; await runL;
  t("then it reads the other writer's document and keeps its change (allocation v2 + bitcoin 1,700,000)", L.srv.doc.allocation.v === 2 && bitcoinRow(L.srv.doc).manualValue === 1700000 && L.srv.ops.join(" | ") === "GET doc | PUT doc | stored doc | GET doc | PUT doc | stored doc", L.srv.ops);
  var order = [];
  var C = L.ctx.PortfolioCore;
  var a = C.withDocLock(function () { order.push("A1"); return new Promise(function (r) { setTimeout(function () { order.push("A2"); r(); }, 20); }); });
  var b = C.withDocLock(function () { order.push("B"); return Promise.resolve(); });
  await Promise.all([a, b]);
  var bad = C.withDocLock(function () { return Promise.reject(new Error("x")); }).catch(function () { return "caught"; });
  var after = C.withDocLock(function () { return Promise.resolve("ran"); });
  t("withDocLock runs one task at a time and a failed task does not jam it", order.join() === "A1,A2,B" && (await bad) === "caught" && (await after) === "ran", order);

  console.log("== the BTC row of the holdings list follows the held part ==");
  var H1 = page({ holdings: [HOLD("BTCUSD", 900000), HOLD("NVDA", 500000, { portfolioBucket: "foreign-stock" })] });
  var rh = await H1.ctx.BtcValue.run();
  var btcRow = H1.srv.holdings.filter(function (h) { return h.canonicalSymbol === "BTCUSD"; })[0];
  t("one held BTC row → marketValue 1,700,000 × 60% = 1,020,000 · NVDA untouched", btcRow.marketValue === 1020000 && H1.srv.holdings[1].marketValue === 500000 && rh.holding === "updated" && H1.srv.ops.filter(function (x) { return /^PUT holdings/.test(x); }).join() === "PUT holdings BTCUSD:1020000", { rh: rh, ops: H1.srv.ops });
  var H2 = page({ holdings: [HOLD("BTCUSD", 900000), HOLD("BTC-COLD", 100000, { portfolioBucket: "bitcoin" })] });
  var rh2 = await H2.ctx.BtcValue.run();
  t("two held BTC rows → ambiguous, holdings not written", rh2.holding === "ambiguous" && H2.srv.ops.every(function (x) { return !/holdings/.test(x); }), { rh2: rh2, ops: H2.srv.ops });
  var H3 = page({ holdings: [HOLD("BTCUSD", 900000, { isHolding: false }), HOLD("PTT.BK", 1, { portfolioBucket: "thai-stock" })] });
  var rh3 = await H3.ctx.BtcValue.run();
  t("no held BTC row (watchlist only) → holdings not written", H3.srv.ops.every(function (x) { return !/holdings/.test(x); }) && rh3.holding === "none", rh3);
  // the document is already at today's price, only the holdings row is behind
  var doneDoc = BV.applyToDoc(oneBtcDoc(1500000), LIVE, { now: NOV }).ps;
  var H4 = page({ doc: doneDoc, snapDoc: doneDoc, holdings: [HOLD("BTCUSD", 900000)] });
  var rh4 = await H4.ctx.BtcValue.run();
  t("document already current, holdings row behind → no document PUT · holdings row fixed", H4.srv.ops.indexOf("PUT doc") < 0 && H4.srv.holdings[0].marketValue === 1020000, { rh4: rh4, ops: H4.srv.ops });
  var H5 = page({ doc: doneDoc, snapDoc: doneDoc, holdings: [HOLD("BTCUSD", 1020000)] });
  var rh5 = await H5.ctx.BtcValue.run();
  t("everything current → nothing-due, no request", rh5.reason === "nothing-due" && H5.srv.ops.length === 0, { rh5: rh5, ops: H5.srv.ops });

  console.log("== a stale local copy is repaired from the server ==");
  // this device's snapshot still has last week's document; the server already has 1,700,000 from another device
  var R = page({ doc: doneDoc, snapDoc: oneBtcDoc(1500000) });
  var rr = await R.ctx.BtcValue.run();
  t("no PUT (server current) · the snapshot copy now carries the server document", R.srv.ops.join(" | ") === "GET doc" && R.writes.length === 1 && bitcoinRow(R.writes[0].portfolioStatus.data).manualValue === 1700000, { rr: rr, ops: R.srv.ops, writes: R.writes.length });

  console.log("== no PortfolioCore → wait, do not write without the lock ==");
  var ncTimers = [];
  var NC = page({ noCore: true, timers: ncTimers });
  var rnc = await NC.ctx.BtcValue.run();
  t("no PortfolioCore → no-core, no request, a retry in 2 s is scheduled", rnc.reason === "no-core" && NC.srv.ops.length === 0 && ncTimers.join() === "2000", { rnc: rnc, timers: ncTimers });

  console.log("== wiring ==");
  t("runs by itself after Load Latest Data (\"portfolio-data-snapshot\") and on page load", /addEventListener\("portfolio-data-snapshot"/.test(SRC) && /soon\(2500\)/.test(SRC));
  t("portfolio-core exports withDocLock", /withDocLock,/.test(SRC_CORE));
  var NAV = read("app-navigation.js");
  t("every page gets btc-value.js through the shell, right after portfolio-core.js (core-6) and holding-revalue.js",
    /ensureScript\("\/portfolio-core\.js\?v=20261125-core-6"\);\s*ensureScript\("\/holding-revalue\.js\?v=[^"]+"\);\s*ensureScript\("\/btc-value\.js\?v=20261125-btc-1"\);/.test(NAV));
  // the other writers of the same document take the same lock (behaviour pinned in their own tests:
  // pm-cash-test (cash save + quarter-row sync) · allocation-card-test (cash band) · asset-allocation-view-test (allocation))
  ["portfolio-manager-page.js", "allocation-card-page.js", "asset-allocation-page.js"].forEach(function (f) {
    var s = read(f);
    t(f + " routes its /api/portfolio GET→PUT through PortfolioCore.withDocLock", /function docLock\(task\)/.test(s) && /withDocLock/.test(s) && /docLock\(function \(\) \{/.test(s));
  });
}

function finish() {
  console.log("\n" + (pass + fail) + " checks · " + pass + " passed · " + fail + " failed");
  if (fail) process.exit(1);
}
runAsync().then(finish, function (e) { fail++; console.log("  FAIL  threw — " + (e && e.stack)); finish(); });
