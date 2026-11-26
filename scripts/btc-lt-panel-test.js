// Bitcoin Monitor · Long-term On-chain panel (2026-11-26 · plan docs/superpowers/plans/2026-11-26-btc-lt-onchain.md Task 3)
//   node scripts/btc-lt-panel-test.js
//
// What must stay true (public/btc-lt-panel.js → window.BtcLtPanel = { model, html, wire, downsample }):
//   · model() only ROUTES data — every score number comes from window.BtcLtSignal (Task 2):
//       LTH Realized / Active Investor / LTH-SOPR / LTH Supply ← BtcOnchainLive.get().series (BGeometrics)
//       price / MVRV-Z (point-in-time) / Puell                ← BtcLtHistory.get().series (Coin Metrics · Blockchain.com)
//   · the live score uses the plan's point-in-time rules (lags 7 · 1 · 0, maxAgeDays 21) + the live price; the 30-day
//     trend, the history rows and the backtests never see the live price (30 days ago is not priced at today's price)
//   · "สัญญาณเต็ม" starts where the BGeometrics series start + 7 days (before that it would be the core signal again)
//   · cost rows = the newest real value of each cost basis + source + date · % = price ÷ cost − 1
//   · missing data renders "ไม่มีข้อมูล" — never 0, never a made-up value · an engine failure never breaks the page
//   · html(): 5 sections · "ไม่ใช่การทำนายราคา" in the score block · values carry source + date · hand-drawn SVG with
//     ≤ 600 points per line · Cost Basis on a log price axis · buttons → wire() → onChange(ui), one listener per element
//   · no network, no storage, ES5, every string escaped, no ฿ in title/aria-label, no buy/sell advice
// ALL DATA BELOW IS SIMULATED (ข้อมูลจำลอง) — not real prices, no request leaves this test.
// The score engine: public/btc-lt-signal.js when it exists and exports the plan's contract, else a stub that follows
// the contract (the header line printed first says which one ran).
"use strict";
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var PUB = path.join(__dirname, "..", "public");
function read(f) { return fs.readFileSync(path.join(PUB, f), "utf8"); }
var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; console.log("  PASS  " + name); }
  else { fail++; console.log("  FAIL  " + name + (extra != null ? " — " + (typeof extra === "string" ? extra : JSON.stringify(extra)) : "")); }
}
function finish() {
  console.log("\n" + (pass + fail) + " checks · " + pass + " passed · " + fail + " failed");
  if (fail) process.exit(1);
}

// test-only knobs: BTC_LT_PANEL_STUB=1 runs against the contract stub even when the engine file exists ·
// BTC_LT_PANEL_SRC=<path> tests another copy of the panel (mutation checks) — production code is never touched
var SRC = ""; try { SRC = process.env.BTC_LT_PANEL_SRC ? fs.readFileSync(process.env.BTC_LT_PANEL_SRC, "utf8") : read("btc-lt-panel.js"); } catch (e) { SRC = ""; }
var SIG = null; try { SIG = process.env.BTC_LT_PANEL_STUB === "1" ? null : read("btc-lt-signal.js"); } catch (e) { SIG = null; }

// ------------------------------------------------------------------ simulated data helpers
var DAY = 86400000;
var TODAY = "2026-11-26";
function iso(ms) { return new Date(ms).toISOString().slice(0, 10); }
function msOf(d) { return Date.parse(d + "T00:00:00Z"); }
function addDays(d, n) { return iso(msOf(d) + n * DAY); }
function daily(from, to, f) { var out = []; for (var x = msOf(from), i = 0; x <= msOf(to); x += DAY, i++) out.push([iso(x), f(i)]); return out; }
function setLast(rows, v) { rows[rows.length - 1] = [rows[rows.length - 1][0], v]; return rows; }
function stKey(v) { return v >= 80 ? "strong" : v >= 65 ? "accum" : v >= 45 ? "neutral" : v >= 30 ? "risk" : "hot"; }
function sortKeys(x) {
  if (Array.isArray(x)) return x.map(sortKeys);
  if (x && typeof x === "object") { var o = {}; Object.keys(x).sort().forEach(function (k) { o[k] = sortKeys(x[k]); }); return o; }
  return x;
}
function deq(a, b) { return JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b)); }
function sameRows(a, b) { return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every(function (r, i) { return r[0] === b[i][0] && r[1] === b[i][1]; }); }
var PLAN_LAGS = { lthRealizedPrice: 7, activeInvestorPrice: 7, lthSopr: 7, lthSupply: 7, mvrvZ: 1, puell: 1, price: 0 };

// SIMULATED BtcLtHistory.get() — multi-cycle shape (Coin Metrics price/MVRV + Blockchain.com Puell), 2012 → 2026-11-25
function SIM_HIST(over) {
  var price = setLast(daily("2012-01-01", "2026-11-25", function (i) { return 5 * Math.exp(i * 0.0018) * (1 + 0.5 * Math.sin(i / 200)); }), 90000);
  var mvrv = daily("2012-01-01", "2026-11-25", function (i) { return 1 + 0.75 * (1 + Math.sin(i / 200)); });
  var realized = setLast(price.map(function (r, i) { return [r[0], r[1] / mvrv[i][1]]; }), 40000);
  var st = {
    at: "2026-11-26T02:00:00.000Z",
    series: {
      price: price, mvrv: mvrv, realizedPrice: realized,
      mvrvZ: daily("2012-01-01", "2026-11-25", function (i) { return 1 + 3 * Math.sin(i / 200); }),
      puell: daily("2012-03-01", "2026-11-24", function (i) { return 1 + 0.6 * Math.sin(i / 180); })
    },
    sources: { coinMetrics: { at: "2026-11-26T02:00:00.000Z", ok: true, error: null }, blockchain: { at: "2026-11-26T02:00:05.000Z", ok: true, error: null } },
    error: null, loading: false
  };
  Object.keys(over || {}).forEach(function (k) { st[k] = over[k]; });
  return st;
}
// SIMULATED BtcOnchainLive.get() — BGeometrics shape (~4 years, data ~7 days behind)
function SIM_ONCHAIN(over) {
  var st = {
    metrics: {
      lthRealizedPrice: { value: 50000, date: "2026-11-19" }, activeInvestorPrice: { value: 80000, date: "2026-11-19" },
      lthSopr: { value: 1.2, date: "2026-11-19" }, lthSupply: { value: 15.4e6, date: "2026-11-19" }, realizedPrice: { value: 41000, date: "2026-11-19" }
    },
    series: {
      mvrvZScore: daily("2022-11-26", "2026-11-19", function (i) { return 0.5 + i / 1000; }),
      realizedPrice: setLast(daily("2022-11-26", "2026-11-19", function (i) { return 25000 + 10 * i; }), 41000),
      nupl: daily("2022-11-26", "2026-11-19", function () { return 0.4; }),
      lthRealizedPrice: setLast(daily("2022-11-26", "2026-11-19", function (i) { return 20000 + 20 * i; }), 50000),
      activeInvestorPrice: setLast(daily("2022-11-26", "2026-11-19", function (i) { return 30000 + 30 * i; }), 80000),
      lthSopr: daily("2022-12-10", "2026-11-19", function (i) { return 1 + 0.5 * Math.sin(i / 30); }),
      lthSupply: daily("2022-11-26", "2026-11-19", function (i) { return 14e6 + 1000 * i; })
    },
    fetchedAt: "2026-11-26T01:00:00.000Z", error: null, retryAt: null, loading: false
  };
  Object.keys(over || {}).forEach(function (k) { st[k] = over[k]; });
  return st;
}

// ------------------------------------------------------------------ the engine: real file or a contract stub
var CONTRACT_FNS = ["inputsAt", "score", "trend", "scoreSeries", "backtest", "cycleMarkers", "answers"];
function contractOk(S) { return !!S && CONTRACT_FNS.every(function (f) { return typeof S[f] === "function"; }) && Array.isArray(S.STATES) && !!S.WEIGHTS; }
function makeStub() {
  var STATES = [{ key: "strong", min: 80, en: "Strong Accumulation", th: "น่าสะสมมาก" }, { key: "accum", min: 65, en: "Accumulation", th: "น่าสะสม" },
    { key: "neutral", min: 45, en: "Neutral", th: "กลาง ๆ" }, { key: "risk", min: 30, en: "Distribution Risk", th: "เสี่ยงช่วงแจกของ" },
    { key: "hot", min: 0, en: "Overheated / High Risk", th: "ร้อนแรง / เสี่ยงสูง" }];
  function stateOf(v) { for (var i = 0; i < STATES.length; i++) if (v >= STATES[i].min) return STATES[i]; return STATES[4]; }
  function at(rows, cutoff) { var hit = null; (rows || []).forEach(function (r) { if (r[0] <= cutoff) hit = r; }); return hit; }
  return {
    WEIGHTS: { valuation: 40, lth: 35, miner: 25 }, STATES: STATES, HALVINGS: ["2012-11-28", "2016-07-09", "2020-05-11", "2024-04-20"],
    ANCHORS: { mvrvZ: [[-0.5, 100], [0, 95], [1, 75], [2, 55], [3.5, 30], [5, 12], [7, 0]], puell: [[0.4, 100], [0.6, 85], [1, 60], [1.5, 40], [2.5, 20], [4, 0]] },
    subScore: function () { return 70; },
    inputsAt: function (sm, date, opts) {
      var lags = (opts && opts.lags) || {}, asOf = {};
      function v(k) { var r = at(sm[k], addDays(date, -(lags[k] || 0))); if (r) { asOf[k] = r[0]; return r[1]; } return null; }
      var live = opts && opts.livePrice ? opts.livePrice : null;
      var price = live != null ? live : v("price"); if (live != null) asOf.price = date;
      var lrp = v("lthRealizedPrice"), aip = v("activeInvestorPrice"), sopr = v("lthSopr"), sup = v("lthSupply");
      return { date: date, price: price, mvrvZ: v("mvrvZ"), lthCostRatio: price != null && lrp ? price / lrp : null, aipRatio: price != null && aip ? price / aip : null,
        lthSopr7: sopr, lthNetPct: sup != null ? 0.4 : null, puell: v("puell"), asOf: asOf,
        raw: { lthRealizedPrice: lrp, activeInvestorPrice: aip, lthSopr: sopr, lthSupply: sup, lthSupplyBase: null } };
    },
    score: function (inp) {
      function mem(key, label) { var val = inp[key]; return { key: key, label: label, value: val, score: val == null ? null : 70, zone: val == null ? null : "กลาง", reason: val == null ? null : "เหตุผลจำลอง" }; }
      function fam(w, ms) { var s = ms.filter(function (x) { return x.score != null; }); return { score: s.length ? 70 : null, weight: w, members: ms }; }
      var families = { valuation: fam(40, [mem("mvrvZ", "MVRV-Z"), mem("lthCostRatio", "ราคา ÷ LTH RP"), mem("aipRatio", "ราคา ÷ AIP")]),
        lth: fam(35, [mem("lthSopr7", "LTH-SOPR 7 วัน"), mem("lthNetPct", "Net Position 30 วัน")]), miner: fam(25, [mem("puell", "Puell")]) };
      var have = Object.keys(families).filter(function (k) { return families[k].score != null; });
      var missing = []; Object.keys(families).forEach(function (k) { families[k].members.forEach(function (x) { if (x.value == null) missing.push(x.key); }); });
      var ok = have.length >= 2;
      return { total: ok ? 70 : null, state: ok ? stateOf(70) : null, families: families, coverage: { families: have.length, missing: missing }, reasons: ok ? ["เหตุผลจำลอง"] : [], unavailable: !ok };
    },
    trend: function () { return { now: 70, then: 64, delta: 6 }; },
    scoreSeries: function (sm, o) { var out = []; (sm.price || []).forEach(function (r) { if (r[0] >= o.from && r[0] <= o.to) out.push([r[0], 70, "accum"]); }); return out; },
    backtest: function (rows) { return { byState: { accum: { days: rows.length, episodes: 1, h180: { n: 10, median: 0.25, posPct: 80, medianMaxDD: -0.12 }, h365: { n: 0, median: null, posPct: null, medianMaxDD: null } } }, from: rows[0][0], to: rows[rows.length - 1][0], note: "หมายเหตุจำลอง" }; },
    cycleMarkers: function () { return [{ date: "2013-12-04", type: "top", price: 1151, provisional: false }]; },
    answers: function () { return [1, 2, 3, 4, 5].map(function (i) { return { id: "q" + i, q: "คำถามจำลอง " + i, a: "คำตอบจำลอง", tone: "gray", evidence: "หลักฐานจำลอง" }; }); }
  };
}
// call-through spies: what the panel asked the engine and what the engine answered
function spyWrap(S, calls) {
  var W = {};
  Object.keys(S).forEach(function (k) {
    if (typeof S[k] !== "function") { W[k] = S[k]; return; }
    calls[k] = [];
    W[k] = function () { var args = [].slice.call(arguments); var ret = S[k].apply(S, args); calls[k].push({ args: args, ret: ret }); return ret; };
  });
  return W;
}

var ENGINE = null;
function page(o) {
  o = o || {};
  var net = [], storage = [];
  var ctx = {
    console: console, JSON: JSON, Math: Math, Date: Date, Object: Object, Array: Array, String: String, Number: Number, Boolean: Boolean,
    RegExp: RegExp, Error: Error, TypeError: TypeError, isFinite: isFinite, isNaN: isNaN, parseFloat: parseFloat, parseInt: parseInt,
    fetch: function (u) { net.push(String(u)); return Promise.reject(new Error("no network in tests")); },
    XMLHttpRequest: function () { net.push("xhr"); throw new Error("no network in tests"); },
    localStorage: { getItem: function (k) { storage.push("get " + k); return null; }, setItem: function (k) { storage.push("set " + k); }, removeItem: function (k) { storage.push("rm " + k); } }
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  var calls = {};
  if (!o.noEngine) {
    var S = null;
    if (o.engine) S = o.engine;
    else {
      if (SIG) { try { vm.runInContext(SIG, ctx, { filename: "btc-lt-signal.js" }); } catch (e) { console.log("  (btc-lt-signal.js did not load: " + e.message + ")"); } }
      S = contractOk(ctx.BtcLtSignal) ? ctx.BtcLtSignal : makeStub();
      var kind = S === ctx.BtcLtSignal ? "REAL public/btc-lt-signal.js"
        : "STUB (" + (process.env.BTC_LT_PANEL_STUB === "1" ? "forced by BTC_LT_PANEL_STUB=1" : SIG ? "btc-lt-signal.js does not export the contract yet" : "btc-lt-signal.js missing") + ")";
      if (ENGINE !== kind) { ENGINE = kind; console.log("[engine] " + kind); }
    }
    ctx.BtcLtSignal = spyWrap(S, calls);
  }
  vm.runInContext(SRC, ctx, { filename: "btc-lt-panel.js" });
  return { ctx: ctx, panel: ctx.BtcLtPanel, calls: calls, net: net, storage: storage };
}

// ------------------------------------------------------------------ html helpers (no DOM in node)
function sec(H, name) {
  var i = H.indexOf('data-lt-section="' + name + '"');
  if (i < 0) return "";
  var j = H.indexOf('data-lt-section="', i + 10);
  return H.slice(i, j < 0 ? H.length : j);
}
function between(s, a, b) { var i = s.indexOf(a); if (i < 0) return ""; var j = s.indexOf(b, i + a.length); return s.slice(i, j < 0 ? s.length : j); }
function count(s, needle) { return s.split(needle).length - 1; }
function firstTag(s) { return s.slice(0, s.indexOf(">") + 1); }
function toneOf(cls) { var m = String(cls).match(/\bgc-(calm|normal|warning|danger|neutral)\b/g) || []; return m.length === 1 ? m[0] : null; }
function paths(s) { var out = {}, re = /<path[^>]*data-lt-line="([^"]+)"[^>]*\sd="([^"]*)"/g, m; while ((m = re.exec(s))) out[m[1]] = m[2]; return out; }
function pathPts(s, key) { var d = paths(s)[key] || "", out = [], re = /[ML](-?[\d.]+) (-?[\d.]+)/g, m; while ((m = re.exec(d))) out.push([Number(m[1]), Number(m[2])]); return out; }
function pressed(s, attr) { var re = new RegExp("<button[^>]*" + attr + '="([^"]*)"[^>]*aria-pressed="true"', "g"), m, out = []; while ((m = re.exec(s))) out.push(m[1]); return out.join(); }
function plotAttr(s, chart, attr) { var m = s.match(new RegExp('data-lt-chart="' + chart + '"[^>]*' + attr + '="([^"]*)"')); return m ? m[1] : null; }
function ylabels(s, chart) { var i = s.indexOf('data-lt-chart="' + chart + '"'); var yl = s.lastIndexOf('class="btc-lt-yl"', i); if (i < 0 || yl < 0) return []; var part = s.slice(yl, i), out = [], re = /<i[^>]*>([^<]*)<\/i>/g, m; while ((m = re.exec(part))) out.push(m[1]); return out; }
var ADVICE = /ควรซื้อ|ควรขาย|แนะนำให้ซื้อ|แนะนำให้ขาย|ซื้อเลย|ขายเลย|รีบซื้อ|รีบขาย|ขายทิ้ง|\bbuy\b|\bsell\b/i;
var BAHT_ATTR = /(?:title|aria-label)="[^"]*฿/;

// a literal Model (the plan's Model contract + series/inputs/states/anchors this panel adds) — SIMULATED values
function LIT() {
  var price = setLast(daily("2018-01-01", "2026-11-25", function (i) { return 10000 + 25 * i + 6000 * Math.sin(i / 90); }), 91234);
  var mvrvZ = daily("2018-01-01", "2026-11-25", function (i) { return 1 + 3 * Math.sin(i / 200); });
  var core = mvrvZ.map(function (r) { var v = Math.max(0, Math.min(100, Math.round(55 - 15 * (r[1] - 1)))); return [r[0], v, stKey(v)]; });
  var full = core.filter(function (r) { return r[0] >= "2022-12-17"; }).map(function (r) { var v = Math.min(100, r[1] + 5); return [r[0], v, stKey(v)]; });
  function bt(from, to) {
    return { byState: {
      strong: { days: 420, episodes: 6, h180: { n: 380, median: 0.853, posPct: 92, medianMaxDD: -0.18 }, h365: { n: 300, median: 1.5, posPct: 96, medianMaxDD: -0.22 } },
      accum: { days: 610, episodes: 9, h180: { n: 600, median: 0.31, posPct: 74, medianMaxDD: -0.21 }, h365: { n: 0, median: null, posPct: null, medianMaxDD: null } },
      neutral: { days: 1200, episodes: 14, h180: { n: 1100, median: 0.12, posPct: 61, medianMaxDD: -0.25 }, h365: { n: 1000, median: 0.2, posPct: 63, medianMaxDD: -0.3 } },
      risk: { days: 300, episodes: 5, h180: { n: 300, median: -0.05, posPct: 41, medianMaxDD: -0.33 }, h365: { n: 280, median: -0.21, posPct: 30, medianMaxDD: -0.45 } },
      hot: { days: 0, episodes: 0, h180: { n: 0, median: null, posPct: null, medianMaxDD: null }, h365: { n: 0, median: null, posPct: null, medianMaxDD: null } }
    }, from: from, to: to, note: "หน้าต่างผลตอบแทนซ้อนกัน · เกณฑ์ตั้งจากข้อมูลช่วงเดียวกัน (in-sample) — ข้อมูลจำลอง" };
  }
  return {
    today: TODAY,
    inputs: { date: TODAY, price: 100000, mvrvZ: 1.42, lthCostRatio: 2, aipRatio: 0.88, lthSopr7: 1.8, lthNetPct: -0.8, puell: 0.95,
      asOf: { price: TODAY, mvrvZ: "2026-11-25", lthRealizedPrice: "2026-11-19", activeInvestorPrice: "2026-11-19", lthSopr: "2026-11-19", lthSupply: "2026-11-19", puell: "2026-11-24" } },
    signal: {
      total: 72, state: { key: "accum", min: 65, en: "Accumulation", th: "น่าสะสม" }, unavailable: false,
      families: {
        valuation: { score: 68, weight: 40, members: [
          { key: "mvrvZ", label: "MVRV-Z", value: 1.42, score: 66.6, zone: "ต่ำกว่าเฉลี่ย", reason: "MVRV-Z 1.42 อยู่ครึ่งล่างของวัฏจักร" },
          { key: "lthCostRatio", label: "ราคา ÷ LTH Realized Price", value: 2, score: 57.5, zone: "กลาง", reason: "ราคาเป็น 2 เท่าของต้นทุนคนถือยาว" },
          { key: "aipRatio", label: "ราคา ÷ Active Investor Price", value: 0.88, score: 86.5, zone: "ต่ำกว่าต้นทุน", reason: "ราคาต่ำกว่าต้นทุนของเหรียญที่ยังเคลื่อนไหว" }] },
        lth: { score: 74, weight: 35, members: [
          { key: "lthSopr7", label: "LTH-SOPR 7 วัน", value: 1.8, score: 62, zone: "กำไรปานกลาง", reason: "คนถือยาวขายมีกำไรปานกลาง" },
          { key: "lthNetPct", label: "Net Position 30 วัน", value: -0.8, score: 39.3, zone: "ลดลงเล็กน้อย", reason: "เหรียญในมือคนถือยาวลดลง 0.8% ใน 30 วัน" }] },
        miner: { score: 75, weight: 25, members: [
          { key: "puell", label: "Puell Multiple", value: 0.95, score: 62, zone: "ปกติ", reason: "รายได้นักขุดใกล้ค่าเฉลี่ยปี" }] }
      },
      coverage: { families: 3, missing: [] },
      reasons: ["ราคาต่ำกว่าต้นทุน Active Investor", "คนถือยาวลดเหรียญในมือเล็กน้อย"]
    },
    trend: { days: 30, now: 72, then: 67, delta: 5 },
    answers: [
      { id: "lthCost", q: "ราคาอยู่เหนือหรือใต้ต้นทุนของคนถือยาว?", a: "เหนือ 100%", tone: "green", evidence: "ราคา $100,000 · LTH Realized $50,000" },
      { id: "lthFlow", q: "คนถือยาวกำลังสะสมหรือลดเหรียญ?", a: "ลดลงเล็กน้อย", tone: "gray", evidence: "Net Position −0.8% ใน 30 วัน" },
      { id: "lthProfit", q: "คนถือยาวขายกำไรหรือขาดทุน?", a: "ขายมีกำไรปานกลาง", tone: "amber", evidence: ["LTH-SOPR 1.80", "เฉลี่ย 7 วัน"] },
      { id: "valuation", q: "ตอนนี้ถูกหรือแพง?", a: "ค่อนไปทางแพง", tone: "red", evidence: "MVRV-Z 1.42" },
      { id: "cycle", q: "อยู่ช่วงไหนของวัฏจักร?", a: "ครึ่งหลังของรอบ", tone: "green", evidence: "945 วันหลัง halving · ห่างยอด −27%" }
    ],
    cost: { price: 100000, priceAsOf: TODAY, priceSource: "ราคาล่าสุดบนหน้านี้", rows: [
      { key: "lthRealizedPrice", label: "LTH Realized Price", sub: "ต้นทุนเฉลี่ยของคนถือยาว", value: 50000, pct: 100, asOf: "2026-11-19", source: "BGeometrics" },
      { key: "activeInvestorPrice", label: "Active Investor Price", sub: "ต้นทุนของเหรียญที่ยังเคลื่อนไหว", value: 113636.36, pct: -12, asOf: "2026-11-19", source: "BGeometrics" },
      { key: "realizedPrice", label: "Realized Price", sub: "ต้นทุนเฉลี่ยของทั้งตลาด", value: null, pct: null, asOf: null, source: null }] },
    hist: {
      core: { rows: core, backtest: bt("2018-01-01", "2026-11-25") },
      full: { rows: full, backtest: bt("2022-12-17", "2026-11-25") },
      markers: [{ date: "2018-12-15", type: "bottom", price: 3200, provisional: false }, { date: "2021-11-08", type: "top", price: 67500, provisional: false },
        { date: "2025-12-20", type: "top", price: 124000, provisional: true }]
    },
    series: {
      price: price,
      realizedPrice: daily("2018-01-01", "2026-11-25", function (i) { return 6000 + 12 * i; }),
      activeInvestorPrice: daily("2022-11-26", "2026-11-19", function (i) { return 25000 + 30 * i; }),
      lthRealizedPrice: daily("2022-11-26", "2026-11-19", function (i) { return 18000 + 20 * i; }),
      mvrvZ: mvrvZ,
      puell: daily("2018-01-01", "2026-11-24", function (i) { return 1 + 0.6 * Math.sin(i / 180); }),
      lthSopr: daily("2022-12-10", "2026-11-19", function (i) { return 1.5 + 0.8 * Math.sin(i / 30); }),
      lthSupply: daily("2022-11-26", "2026-11-19", function (i) { return 14e6 + 900 * i; })
    },
    anchors: { mvrvZ: [[-0.5, 100], [0, 95], [1, 75], [2, 55], [3.5, 30], [5, 12], [7, 0]] },
    sources: [
      { key: "bgeometrics", name: "BGeometrics (bitcoin-data.com)", at: "2026-11-26T01:00:00.000Z", latest: "2026-11-19", ok: true, status: "ok", note: "LTH Realized Price · LTH-SOPR · Active Investor Price · LTH Supply" },
      { key: "coinMetrics", name: "Coin Metrics (community)", at: "2026-11-26T02:00:00.000Z", latest: "2026-11-25", ok: false, status: "stale", note: "ใช้ข้อมูลเดิม: HTTP 500" },
      { key: "blockchain", name: "Blockchain.com", at: null, latest: null, ok: false, status: "none", note: "" }],
    loading: { history: false, onchain: false },
    errors: []
  };
}

// ------------------------------------------------------------------ fake DOM for wire()
function el(attrs, parent) {
  return { nodeType: 1, attrs: attrs || {}, parentNode: parent || null,
    getAttribute: function (n) { return Object.prototype.hasOwnProperty.call(this.attrs, n) ? this.attrs[n] : null; },
    hasAttribute: function (n) { return Object.prototype.hasOwnProperty.call(this.attrs, n); } };
}
function hostEl(attrs) {
  var r = el(attrs || {});
  r.listeners = {};
  r.addEventListener = function (type, fn) { (r.listeners[type] = r.listeners[type] || []).push(fn); };
  return r;
}
function fire(root, type, ev) { (root.listeners[type] || []).forEach(function (fn) { fn.call(root, ev); }); }

// ================================================================== tests
if (!SRC) { t("public/btc-lt-panel.js exists", false, "file missing"); finish(); }
var P = page();
if (!P.panel || typeof P.panel.model !== "function" || typeof P.panel.html !== "function" || typeof P.panel.wire !== "function") {
  t("public/btc-lt-panel.js defines window.BtcLtPanel = { model, html, wire }", false, P.panel ? Object.keys(P.panel) : "no BtcLtPanel");
  finish();
}
var BP = P.panel;

console.log("== model(): data routing into BtcLtSignal ==");
var OC = SIM_ONCHAIN(), HI = SIM_HIST();
var VZ = { key: "accum", thai: "โซนสะสม" };
var M = BP.model({ onchain: OC, history: HI, livePrice: 100000, valuationZone: VZ, intelCycle: "Accumulation", today: TODAY });
var liveCall = (P.calls.inputsAt || []).filter(function (c) { return c.args[1] === TODAY && c.args[2] && c.args[2].livePrice === 100000; })[0];
t("inputsAt(seriesMap, today, opts with livePrice 100,000) runs the live score", !!liveCall);
var smap = liveCall ? liveCall.args[0] : {};
t("seriesMap = price · mvrvZ · puell (history) + lthRealizedPrice · activeInvestorPrice · lthSopr · lthSupply — nothing else",
  Object.keys(smap).sort().join() === "activeInvestorPrice,lthRealizedPrice,lthSopr,lthSupply,mvrvZ,price,puell", Object.keys(smap));
t("price / mvrvZ / puell are the Coin Metrics · Blockchain.com rows (multi-cycle)", sameRows(smap.price, HI.series.price) && sameRows(smap.mvrvZ, HI.series.mvrvZ) && sameRows(smap.puell, HI.series.puell));
t("the LTH series and Active Investor are the BGeometrics rows", ["lthRealizedPrice", "activeInvestorPrice", "lthSopr", "lthSupply"].every(function (k) { return sameRows(smap[k], OC.series[k]); }));
t("the plan's point-in-time rules: lags 7 (BGeometrics) · 1 (MVRV-Z, Puell) · 0 (price) · maxAgeDays 21",
  liveCall && deq(liveCall.args[2].lags, PLAN_LAGS) && liveCall.args[2].maxAgeDays === 21, liveCall && liveCall.args[2]);
var scoreCall = liveCall && (P.calls.score || []).filter(function (c) { return c.args[0] === liveCall.ret; })[0];
t("score() gets exactly the Inputs inputsAt returned · model.signal is its Result · model.inputs keeps the Inputs",
  !!scoreCall && M.signal === scoreCall.ret && M.inputs === liveCall.ret);
var trCall = (P.calls.trend || []).filter(function (c) { return c.args[2] === 30; })[0];
t("trend(seriesMap, today, 30, …) for the 30-day change", !!trCall && trCall.args[1] === TODAY && Object.keys(trCall.args[0]).length === 7);
t("the trend never sees the live price (30 days ago is not priced at today's price) · same lags",
  !!trCall && !("livePrice" in trCall.args[3]) && deq(trCall.args[3].lags, PLAN_LAGS) && trCall.args[3].maxAgeDays === 21, trCall && trCall.args[3]);
var expDelta = trCall && typeof M.signal.total === "number" && typeof trCall.ret.then === "number" ? M.signal.total - trCall.ret.then : null;
t("model.trend: now = the score on screen · then = the engine's · delta = now − then",
  !!M.trend && M.trend.now === M.signal.total && M.trend.then === (trCall ? trCall.ret.then : undefined) && M.trend.delta === expDelta && M.trend.days === 30, M.trend);
var ansCall = (P.calls.answers || [])[0];
t("answers(ctx) gets inputs + result + Valuation Zone + Intelligence cycle + price rows + today",
  !!ansCall && ansCall.args[0].inputs === M.inputs && ansCall.args[0].result === M.signal && ansCall.args[0].valuationZone === VZ &&
  ansCall.args[0].intelCycle === "Accumulation" && sameRows(ansCall.args[0].priceSeries, HI.series.price) && ansCall.args[0].today === TODAY);
t("model.answers = the engine's 5 answers", !!ansCall && M.answers === ansCall.ret && M.answers.length === 5);
var coreCall = (P.calls.scoreSeries || []).filter(function (c) { return c.args[1] && c.args[1].mode === "core"; })[0];
var fullCall = (P.calls.scoreSeries || []).filter(function (c) { return c.args[1] && c.args[1].mode === "full"; })[0];
t("core signal rows: from the day both MVRV-Z and Puell exist + 1-day lag (2012-03-02) to today",
  !!coreCall && coreCall.args[1].from === "2012-03-02" && coreCall.args[1].to === TODAY, coreCall && coreCall.args[1].from);
t("full signal rows start where every BGeometrics series exists + 7-day lag (lthSopr 2022-12-10 → 2022-12-17)",
  !!fullCall && fullCall.args[1].from === "2022-12-17" && fullCall.args[1].to === TODAY, fullCall && fullCall.args[1].from);
t("history rows never use the live price · same lags", !!coreCall && !!fullCall && !("livePrice" in coreCall.args[1].opts) && !("livePrice" in fullCall.args[1].opts) && deq(coreCall.args[1].opts.lags, PLAN_LAGS));
t("model.hist.core.rows / full.rows = the engine's rows", !!coreCall && !!fullCall && M.hist.core.rows === coreCall.ret && M.hist.full.rows === fullCall.ret);
var btCore = coreCall && (P.calls.backtest || []).filter(function (c) { return c.args[0] === coreCall.ret; })[0];
var btFull = fullCall && (P.calls.backtest || []).filter(function (c) { return c.args[0] === fullCall.ret; })[0];
t("backtest(rows, price rows, { horizons: [180, 365] }) for the core and the full signal",
  !!btCore && !!btFull && sameRows(btCore.args[1], HI.series.price) && deq(btCore.args[2], { horizons: [180, 365] }) && deq(btFull.args[2], { horizons: [180, 365] }));
t("model.hist.*.backtest = the engine's results", !!btCore && !!btFull && M.hist.core.backtest === btCore.ret && M.hist.full.backtest === btFull.ret);
var cmCall = (P.calls.cycleMarkers || [])[0];
t("cycleMarkers(price rows) → model.hist.markers", !!cmCall && sameRows(cmCall.args[0], HI.series.price) && M.hist.markers === cmCall.ret);
var nSeries = (P.calls.scoreSeries || []).length;
BP.model({ onchain: OC, history: HI, livePrice: 101000, valuationZone: VZ, intelCycle: "Accumulation", today: TODAY });
t("same rows again (a new live price) → the history is not recomputed, the live score is", P.calls.scoreSeries.length === nSeries && P.calls.inputsAt.filter(function (c) { return c.args[2] && c.args[2].livePrice === 101000; }).length === 1);
BP.model({ onchain: OC, history: SIM_HIST(), livePrice: 101000, today: TODAY });
t("new history rows → recomputed", P.calls.scoreSeries.length === nSeries + 2, P.calls.scoreSeries.length - nSeries);

function fullCalls() { return (P.calls.scoreSeries || []).filter(function (c) { return c.args[1] && c.args[1].mode === "full"; }); }
var nFull = fullCalls().length;
var ocNoLth = SIM_ONCHAIN(); delete ocNoLth.series.lthSopr; delete ocNoLth.series.lthSupply;
var MNL = BP.model({ onchain: ocNoLth, history: SIM_HIST(), livePrice: 100000, today: TODAY });
t("no LTH-family series (LTH-SOPR · LTH Supply) → no 'full' rows asked for (it would be the core signal under another name)",
  fullCalls().length === nFull && MNL.hist.full.rows.length === 0 && MNL.hist.full.backtest === null && MNL.hist.core.rows.length > 0);
t("…and the full table says ไม่มีข้อมูล", /ไม่มีข้อมูล/.test(between(sec(BP.html(MNL, {}), "history"), 'data-lt-bt="full"', "</div>")));
var ocStale = SIM_ONCHAIN();
["lthRealizedPrice", "activeInvestorPrice", "lthSopr", "lthSupply"].forEach(function (k) { ocStale.series[k] = ocStale.series[k].filter(function (r) { return r[0] <= "2026-10-01"; }); });
BP.model({ onchain: ocStale, history: SIM_HIST(), livePrice: 100000, today: TODAY });
var staleCall = fullCalls()[fullCalls().length - 1];
t("BGeometrics rows stop on 2026-10-01 → the full signal ends when they go stale (+7 lag +21 max age = 2026-10-29), not today",
  !!staleCall && staleCall.args[1].to === "2026-10-29", staleCall && staleCall.args[1].to);

console.log("== model(): cost basis rows (price ÷ cost − 1) ==");
function rowOf(m, k) { return (m.cost.rows || []).filter(function (r) { return r.key === k; })[0] || {}; }
t("price = the live price 100,000 dated today", M.cost.price === 100000 && M.cost.priceAsOf === TODAY && !!M.cost.priceSource, M.cost);
t("order: LTH Realized · Active Investor · Realized", M.cost.rows.map(function (r) { return r.key; }).join() === "lthRealizedPrice,activeInvestorPrice,realizedPrice");
var rl = rowOf(M, "lthRealizedPrice"), ra = rowOf(M, "activeInvestorPrice"), rr = rowOf(M, "realizedPrice");
t("LTH Realized Price 50,000 (BGeometrics · 2026-11-19) → price +100% above", rl.value === 50000 && rl.pct === 100 && rl.asOf === "2026-11-19" && /BGeometrics/.test(rl.source), rl);
t("Active Investor Price 80,000 → +25%", ra.value === 80000 && ra.pct === 25 && /BGeometrics/.test(ra.source), ra);
t("Realized Price from Coin Metrics (multi-cycle · 40,000 on 2026-11-25), not BGeometrics' 41,000 → +150%",
  rr.value === 40000 && rr.pct === 150 && rr.asOf === "2026-11-25" && /Coin Metrics/.test(rr.source), rr);
var SHORT_H = function () { var h = SIM_HIST(); ["price", "mvrv", "realizedPrice", "mvrvZ", "puell"].forEach(function (k) { h.series[k] = h.series[k].slice(-400); }); return h; };
var M2 = BP.model({ onchain: OC, history: SHORT_H(), livePrice: null, today: TODAY });
t("no live price → the newest Coin Metrics close (90,000 · 2026-11-25): LTH +80% · AIP +12.5% · Realized +125%",
  M2.cost.price === 90000 && M2.cost.priceAsOf === "2026-11-25" && rowOf(M2, "lthRealizedPrice").pct === 80 && rowOf(M2, "activeInvestorPrice").pct === 12.5 && rowOf(M2, "realizedPrice").pct === 125, M2.cost);
t("livePrice 0 · '' · null · NaN · '100000' · −5 is not a price (Number(null) = 0 trap)", [0, "", null, NaN, "100000", -5].every(function (lp) {
  return BP.model({ onchain: OC, history: SHORT_H(), livePrice: lp, today: TODAY }).cost.price === 90000;
}));
var hNoCm = SHORT_H(); delete hNoCm.series.realizedPrice;
var rb = rowOf(BP.model({ onchain: OC, history: hNoCm, livePrice: 100000, today: TODAY }), "realizedPrice");
t("Coin Metrics realized missing → BGeometrics' 41,000 and the source says so", rb.value === 41000 && /BGeometrics/.test(rb.source) && rb.pct === 143.9, rb);
var ocBad = SIM_ONCHAIN(); ocBad.series.lthRealizedPrice = ocBad.series.lthRealizedPrice.concat([["2026-11-20", null], ["2026-11-21", "abc"], ["bad-date", 5], ["2026-11-22", 0]]);
var rg = rowOf(BP.model({ onchain: ocBad, history: SHORT_H(), livePrice: 100000, today: TODAY }), "lthRealizedPrice");
t("garbage rows (null · text · bad date · 0) are skipped — the newest REAL value is 50,000 on 2026-11-19", rg.value === 50000 && rg.asOf === "2026-11-19", rg);
var ocFresh = SIM_ONCHAIN(); ocFresh.series.lthRealizedPrice = ocFresh.series.lthRealizedPrice.concat([["2026-11-24", 55000]]);
var MF = BP.model({ onchain: ocFresh, history: SHORT_H(), livePrice: 100000, today: TODAY });
var rfr = rowOf(MF, "lthRealizedPrice");
t("cost rows = the values the score uses (inputs.raw · asOf): a row newer than the 7-day lag (55,000 on 2026-11-24) is not used yet",
  rfr.value === 50000 && rfr.asOf === "2026-11-19" && rfr.pct === 100 && !!MF.inputs && MF.inputs.raw.lthRealizedPrice === 50000, rfr);
var ocNone = SIM_ONCHAIN(); ocNone.series = {};
var rn = rowOf(BP.model({ onchain: ocNone, history: SHORT_H(), livePrice: 100000, today: TODAY }), "lthRealizedPrice");
t("no LTH Realized series → value null · pct null · no source (rendered as ไม่มีข้อมูล, never 0)", rn.value === null && rn.pct === null && !rn.source && !rn.asOf, rn);

console.log("== model(): source rows ==");
var SRCS = M.sources || [];
t("3 sources in order: BGeometrics · Coin Metrics · Blockchain.com", SRCS.length === 3 && /BGeometrics/.test(SRCS[0].name) && /Coin Metrics/.test(SRCS[1].name) && /Blockchain\.com/.test(SRCS[2].name), SRCS.map(function (s) { return s.name; }));
t("at = when each source was fetched", SRCS.length === 3 && SRCS[0].at === OC.fetchedAt && SRCS[1].at === HI.sources.coinMetrics.at && SRCS[2].at === HI.sources.blockchain.at);
t("latest = the newest data row (2026-11-19 · 2026-11-25 · 2026-11-24)", SRCS.length === 3 && SRCS[0].latest === "2026-11-19" && SRCS[1].latest === "2026-11-25" && SRCS[2].latest === "2026-11-24", SRCS.map(function (s) { return s.latest; }));
t("all fine → ok", SRCS.every(function (s) { return s.ok === true; }));
var ocQ = SIM_ONCHAIN({ error: "rate-limited" }); delete ocQ.series.lthSopr; delete ocQ.series.activeInvestorPrice;
var hiF = SHORT_H(); hiF.sources = { coinMetrics: { at: "2026-11-25T02:00:00.000Z", ok: false, error: "HTTP 500" }, blockchain: { at: null, ok: false, error: null } }; delete hiF.series.puell;
var MS = BP.model({ onchain: ocQ, history: hiF, livePrice: 100000, today: TODAY });
t("BGeometrics quota out (cached rows still here) → not ok · note says the quota is out · names the missing series",
  MS.sources[0].ok === false && /โควตา/.test(MS.sources[0].note) && /ขาด:[^·]*LTH-SOPR/.test(MS.sources[0].note) && /ขาด:[^·]*Active Investor/.test(MS.sources[0].note) &&
  !/ขาด:/.test(SRCS[0].note), MS.sources[0]);
t("Coin Metrics failed but its older rows are kept → not ok · says the old data is used + the error", MS.sources[1].ok === false && /ข้อมูลเดิม/.test(MS.sources[1].note) && /HTTP 500/.test(MS.sources[1].note), MS.sources[1]);
t("Blockchain.com never answered and no Puell → not ok · no time · no latest", MS.sources[2].ok === false && MS.sources[2].at === null && !MS.sources[2].latest, MS.sources[2]);

console.log("== model(): missing data and a missing / failing engine ==");
var nBefore = (P.calls.scoreSeries || []).length, mBefore = (P.calls.cycleMarkers || []).length;
var MZ = BP.model({ onchain: { series: {} }, history: { series: {} }, today: TODAY });
t("no data at all → no history rows asked for · no markers · no backtests",
  P.calls.scoreSeries.length === nBefore && P.calls.cycleMarkers.length === mBefore && MZ.hist.core.rows.length === 0 && MZ.hist.full.rows.length === 0 && MZ.hist.markers.length === 0 && MZ.hist.core.backtest === null);
var HZ = BP.html(MZ, {});
t("…the score is ไม่มีข้อมูล (never a 0 score) · cost rows ไม่มีข้อมูล", !!MZ.signal && MZ.signal.total == null && /data-lt-total=""/.test(HZ) && !/data-lt-total="0"/.test(HZ) && count(sec(HZ, "cost"), "ไม่มีข้อมูล") >= 4);
var N = page({ noEngine: true });
var MN = N.panel.model({ onchain: OC, history: HI, livePrice: 100000, today: TODAY });
t("no BtcLtSignal → no score · no answers · no history rows — cost and sources still filled",
  MN.signal === null && MN.answers.length === 0 && MN.hist.core.rows.length === 0 && MN.cost.rows.length === 3 && rowOf(MN, "lthRealizedPrice").pct === 100 && MN.sources.length === 3);
var HN = N.panel.html(MN, {});
t("…and the page says so (ไม่มีข้อมูล + เอนจินคะแนนยังไม่พร้อม), not a 0", /data-lt-total=""/.test(HN) && /เอนจินคะแนนยังไม่พร้อม/.test(sec(HN, "signal")));
var boom = makeStub(); boom.score = function () { throw new Error("boom"); };
var E = page({ engine: boom });
var ME = null, threw = null;
try { ME = E.panel.model({ onchain: OC, history: SHORT_H(), livePrice: 100000, today: TODAY }); } catch (e) { threw = e; }
t("an engine exception never escapes model()", threw === null && !!ME, threw && threw.message);
t("…it is recorded and shown on the page, not swallowed", !!ME && ME.errors.length > 0 && /boom/.test(ME.errors.join(" ")) && /ไม่สำเร็จ/.test(E.panel.html(ME, {})) && ME.signal === null);

console.log("== html(): the 5 sections ==");
var H = BP.html(LIT(), { range: 1461, view: "score", showPrice: true });
var secs = (H.match(/data-lt-section="([a-z]+)"/g) || []).map(function (s) { return s.replace(/^.*="|"$/g, ""); });
t("5 sections in order: signal · questions · cost · history · sources", secs.join() === "signal,questions,cost,history,sources", secs);
t("root carries the ui (range · view · price) for wire() under its own attribute names (not the buttons')", /data-lt-root[^>]*data-lt-ui-range="1461"[^>]*data-lt-ui-view="score"[^>]*data-lt-ui-price="1"/.test(H) && !/data-lt-root[^>]*\sdata-lt-(range|view|price)[=\s>]/.test(firstTag(H.slice(H.indexOf("data-lt-root") - 30))));
var SG = sec(H, "signal");
t("score 72 + chip Accumulation · น่าสะสม · card tone gc-calm", /data-lt-total="72"[^>]*>72</.test(SG) && /data-lt-state="accum"[^>]*>[^<]*Accumulation[^<]*น่าสะสม/.test(SG) && toneOf(firstTag(SG)) === "gc-calm", firstTag(SG));
var hero = between(SG, 'class="btc-lt-hero', 'class="btc-lt-fams"');
t("'ไม่ใช่การทำนายราคา' sits in the score block itself", hero.indexOf("data-lt-total") >= 0 && hero.indexOf("ไม่ใช่การทำนายราคา") >= 0);
var asofLine = between(hero, 'class="btc-lt-asof"', "</p>");
t("the score says which data it was computed from and when: Coin Metrics 2026-11-25 · BGeometrics 2026-11-19 (the oldest of its 4) · Blockchain.com 2026-11-24",
  /Coin Metrics <time datetime="2026-11-25"/.test(asofLine) && /BGeometrics <time datetime="2026-11-19"/.test(asofLine) && /Blockchain\.com <time datetime="2026-11-24"/.test(asofLine), asofLine);
function withTrend(d, then) { var m = LIT(); m.trend = { days: 30, now: 72, then: then, delta: d }; return sec(BP.html(m, {}), "signal"); }
var up5 = withTrend(5, 67), dn3 = withTrend(-3, 75), eq0 = withTrend(0, 72), naT = withTrend(null, null);
t("Δ +5 → ▲ 5 จาก 30 วันก่อน (เดิม 67)", /data-lt-delta="5"/.test(up5) && /▲ 5/.test(up5) && /67/.test(between(up5, "data-lt-delta", "</div>")));
t("Δ −3 → ▼ 3", /data-lt-delta="-3"/.test(dn3) && /▼ 3/.test(dn3));
t("Δ 0 → no arrow (เท่ากับ 30 วันก่อน)", /data-lt-delta="0"/.test(eq0) && /เท่ากับ/.test(eq0) && !/[▲▼]/.test(between(eq0, "data-lt-delta", "</div>")));
t("Δ unknown → ไม่มีข้อมูล, not 0", /data-lt-delta=""/.test(naT) && /ไม่มีข้อมูล/.test(between(naT, "data-lt-delta", "</div>")));
t("3 groups with weights 40 · 35 · 25 and their scores", count(SG, 'data-lt-family="') === 3 && /data-lt-family="valuation"[\s\S]*?น้ำหนัก 40%[\s\S]*?68/.test(SG) && /data-lt-family="lth"[\s\S]*?น้ำหนัก 35%/.test(SG) && /data-lt-family="miner"[\s\S]*?น้ำหนัก 25%/.test(SG));
t("6 indicator rows", count(SG, 'data-lt-member="') === 6);
var memL = between(SG, 'data-lt-member="lthCostRatio"', "</li>");
t("indicator row: value 2.00× · zone · score · what it measures · source + date", /2\.00×/.test(memL) && /กลาง/.test(memL) && /57\.5/.test(memL) && memL.indexOf("ราคาเป็นกี่เท่าของต้นทุนเฉลี่ยของคนถือเกิน 155 วัน") >= 0 && /BGeometrics/.test(memL) && /<time datetime="2026-11-19"/.test(memL), memL);
t("MVRV-Z dated by Coin Metrics (2026-11-25) · Puell by Blockchain.com (2026-11-24)",
  /Coin Metrics[\s\S]*<time datetime="2026-11-25"/.test(between(SG, 'data-lt-member="mvrvZ"', "</li>")) && /Blockchain\.com[\s\S]*<time datetime="2026-11-24"/.test(between(SG, 'data-lt-member="puell"', "</li>")));
t("Net Position −0.8 → −0.80% (a real minus sign)", /−0\.80%/.test(between(SG, 'data-lt-member="lthNetPct"', "</li>")));
t("engine reasons listed · coverage 3/3", SG.indexOf("ราคาต่ำกว่าต้นทุน Active Investor") >= 0 && /data-lt-coverage="3"/.test(SG));
var lim = between(SG, 'class="btc-lt-limits"', "</ul>");
t("the signal card states its limits: in-sample thresholds + overlapping windows · lower cycle peaks can under-call a new top · LTH / Active Investor thresholds not yet checked",
  count(lim, "<li") === 3 && /in-sample/.test(lim) && /ซ้อน/.test(lim) && /ยอด/.test(lim) && /Active Investor/.test(lim), lim);
var mg = LIT(); mg.signal.families.lth = { score: null, weight: 35, members: [{ key: "lthSopr7", label: "LTH-SOPR 7 วัน", value: null, score: null, zone: null, reason: null }, { key: "lthNetPct", label: "Net Position 30 วัน", value: null, score: null, zone: null, reason: null }] };
mg.signal.coverage = { families: 2, missing: ["lthSopr7", "lthNetPct"] };
var SGm = sec(BP.html(mg, {}), "signal"), famLth = between(SGm, 'data-lt-family="lth"', 'data-lt-family="miner"');
t("a group without data → ไม่มีข้อมูล (score and its indicators), bar empty — never a 0", count(famLth, "ไม่มีข้อมูล") >= 3 && /width:0%/.test(famLth) && !/>0</.test(famLth), famLth);
t("…coverage 2/3 and the missing indicators named (คิดจากกลุ่มที่มี)", /data-lt-coverage="2"/.test(SGm) && /LTH-SOPR/.test(between(SGm, "btc-lt-covnote", "</p>")) && /กลุ่มที่มี/.test(SGm));
var mu = LIT();
mu.signal = { total: null, state: null, unavailable: true, families: { valuation: mu.signal.families.valuation }, coverage: { families: 1, missing: ["lthSopr7", "lthNetPct", "puell"] }, reasons: [] };
mu.trend = { days: 30, now: null, then: null, delta: null };
var SGu = sec(BP.html(mu, {}), "signal");
t("fewer than 2 groups → ไม่มีข้อมูล instead of a score · neutral tone · says why + names what is missing",
  /data-lt-total=""/.test(SGu) && /ไม่มีข้อมูล/.test(between(SGu, 'class="btc-lt-hero', 'class="btc-lt-fams"')) && toneOf(firstTag(SGu)) === "gc-neutral" && /2 จาก 3 กลุ่ม/.test(SGu) && /Puell/.test(SGu) && !/data-lt-state=/.test(SGu), firstTag(SGu));
var ms2 = LIT(); ms2.signal.state = "hot"; ms2.signal.total = 22;
var SGs = sec(BP.html(ms2, {}), "signal");
t("state given as a key string ('hot') → chip Overheated / High Risk · tone gc-danger", /data-lt-state="hot"[^>]*>[^<]*Overheated/.test(SGs) && toneOf(firstTag(SGs)) === "gc-danger");
var tonesExp = { strong: "gc-calm", accum: "gc-calm", neutral: "gc-normal", risk: "gc-warning", hot: "gc-danger" };
t("state → card tone: strong/accum calm · neutral normal · risk warning · hot danger", Object.keys(tonesExp).every(function (k) {
  var m = LIT(); m.signal.state = k; return toneOf(firstTag(sec(BP.html(m, {}), "signal"))) === tonesExp[k];
}));

var QS = sec(H, "questions");
t("5 question cards", count(QS, 'data-lt-q="') === 5);
var qTones = (QS.match(/<article[^>]*>/g) || []).map(toneOf);
t("answer tone → card tone: green calm · gray neutral · amber warning · red danger", qTones.join() === "gc-calm,gc-neutral,gc-warning,gc-danger,gc-calm", qTones);
t("question · answer · evidence (array joined)", QS.indexOf("ราคาอยู่เหนือหรือใต้ต้นทุนของคนถือยาว?") >= 0 && QS.indexOf("เหนือ 100%") >= 0 && QS.indexOf("LTH-SOPR 1.80 · เฉลี่ย 7 วัน") >= 0);
var mq = LIT(); mq.answers = [];
t("no answers → ไม่มีข้อมูล (no empty cards)", /ไม่มีข้อมูล/.test(sec(BP.html(mq, {}), "questions")) && count(sec(BP.html(mq, {}), "questions"), "data-lt-q=") === 0);

var CS = sec(H, "cost");
t("price row + 3 cost rows", count(CS, 'data-lt-cost="') === 4);
var cPrice = between(CS, 'data-lt-cost="price"', "</li>"), cL = between(CS, 'data-lt-cost="lthRealizedPrice"', "</li>"), cA = between(CS, 'data-lt-cost="activeInvestorPrice"', "</li>"), cR = between(CS, 'data-lt-cost="realizedPrice"', "</li>");
t("price $100,000 with its source + date", /\$100,000/.test(cPrice) && /ราคาล่าสุดบนหน้านี้/.test(cPrice) && /<time datetime="2026-11-26"/.test(cPrice));
t("above the cost basis → เหนือ +100% · value $50,000 · BGeometrics · 2026-11-19", /\$50,000/.test(cL) && /data-lt-pct="100"/.test(cL) && /เหนือ \+100%/.test(cL) && /BGeometrics/.test(cL) && /<time datetime="2026-11-19"/.test(cL));
t("below → ใต้ −12%", /data-lt-pct="-12"/.test(cA) && /ใต้ −12%/.test(cA));
t("no value → ไม่มีข้อมูล (no $0, no %)", /ไม่มีข้อมูล/.test(cR) && !/\$0/.test(cR) && !/data-lt-pct/.test(cR));
t("Cost Basis chart draws price + Realized + Active Investor + LTH Realized", ["price", "realizedPrice", "activeInvestorPrice", "lthRealizedPrice"].every(function (k) { return paths(CS)[k]; }), Object.keys(paths(CS)));
var ml = LIT();
ml.series.price = daily("2025-01-01", "2026-11-25", function () { return 1e6; });
ml.series.realizedPrice = daily("2025-01-01", "2026-11-25", function () { return 1e3; });
ml.series.activeInvestorPrice = daily("2025-01-01", "2026-11-25", function () { return 1e4; });
ml.series.lthRealizedPrice = daily("2025-01-01", "2026-11-25", function () { return 1e5; });
var CL = sec(BP.html(ml, { range: "all" }), "cost");
function y0(k) { var p = pathPts(CL, k); return p.length ? p[0][1] : NaN; }
var g1 = y0("realizedPrice") - y0("activeInvestorPrice"), g2 = y0("activeInvestorPrice") - y0("lthRealizedPrice"), g3 = y0("lthRealizedPrice") - y0("price");
t("Cost Basis uses a log price axis: $1k · $10k · $100k · $1M lines are evenly spaced", g1 > 1 && Math.abs(g1 - g2) < 0.05 && Math.abs(g2 - g3) < 0.05, [g1, g2, g3]);
t("Cost Basis follows the range: 2Y → 2024-11-25 … 2026-11-25", plotAttr(sec(BP.html(LIT(), { range: 730 }), "cost"), "cost", "data-lt-from") === "2024-11-25" && plotAttr(sec(BP.html(LIT(), { range: 730 }), "cost"), "cost", "data-lt-to") === "2026-11-25");

var HS = sec(H, "history");
t("6 views (ราคา · คะแนน · MVRV-Z · Puell · LTH-SOPR · LTH Supply), the current one pressed", count(HS, 'data-lt-view="') === 6 && pressed(HS, "data-lt-view") === "score");
t("4 ranges 1Y · 2Y · 4Y · ทั้งหมด, the current one pressed", count(HS, 'data-lt-range="') === 4 && pressed(HS, "data-lt-range") === "1461" && /ทั้งหมด/.test(HS));
t("price toggle shows showPrice", /<button[^>]*data-lt-price[^>]*aria-pressed="true"/.test(HS));
t("score view: core + full signal lines + the 5 state bands + price on its own right axis",
  !!paths(HS).core && !!paths(HS).full && count(HS, "data-lt-band=") === 5 && !!paths(HS).price && /class="btc-lt-yr"/.test(HS));
t("score axis labels at the state edges 30 · 45 · 65 · 80", ylabels(HS, "hist").slice().sort().join() === "30,45,65,80", ylabels(HS, "hist"));
t("showPrice false → no price line, toggle says แสดงราคา BTC", (function () { var s = sec(BP.html(LIT(), { view: "score", showPrice: false }), "history"); return !paths(s).price && /<button[^>]*data-lt-price[^>]*aria-pressed="false"[^>]*>แสดงราคา BTC/.test(s); })());
var hP = sec(BP.html(LIT(), { view: "price", range: 365 }), "history");
t("price view → the price line itself, no price toggle", !!paths(hP).price && !/<button[^>]*data-lt-price/.test(hP));
t("1Y window = the last 365 days of the line (2025-11-25 → 2026-11-25)", plotAttr(hP, "hist", "data-lt-from") === "2025-11-25" && plotAttr(hP, "hist", "data-lt-to") === "2026-11-25");
var hAll = sec(BP.html(LIT(), { view: "price", range: "all" }), "history");
t("ทั้งหมด = from the first row (2018-01-01)", plotAttr(hAll, "hist", "data-lt-from") === "2018-01-01");
var markTags = hAll.match(/<span class="btc-lt-mk[^"]*" data-lt-mark="[a-z]+"/g) || [];
t("tops and bottoms inside the window are marked; only the current cycle's top is flagged provisional",
  markTags.length === 3 && markTags.filter(function (s) { return /\bis-prov\b/.test(s); }).length === 1 && /\bis-prov\b[^"]*" data-lt-mark="top"/.test(markTags.join(" ")), markTags);
t("…outside the window they are not drawn (1Y → only the 2025-12-20 top)", count(hP, 'data-lt-mark="') === 1);
t("…and every cycle point is listed with its date and price", /<time datetime="2018-12-15"/.test(hP) && /\$3,200/.test(hP) && /\$67,500/.test(hP) && /<time datetime="2025-12-20"/.test(hP));
var hZ = sec(BP.html(LIT(), { view: "mvrvZ", range: "all" }), "history");
t("MVRV-Z view: bands from the engine's anchors — edges where the sub-score crosses 80 · 65 · 45 · 30 (0.75 · 1.50 · 2.60 · 3.50)",
  count(hZ, "data-lt-band=") === 5 && ylabels(hZ, "hist").slice().sort().join() === "0.75,1.50,2.60,3.50", ylabels(hZ, "hist"));
var mNoA = LIT(); mNoA.anchors = null;
t("no anchors from the engine → no bands (plain axis)", count(sec(BP.html(mNoA, { view: "mvrvZ", range: "all" }), "history"), "data-lt-band=") === 0);
var mNoP = LIT(); mNoP.series.puell = null;
t("a view without data → ไม่มีข้อมูล instead of a chart", (function () { var s = sec(BP.html(mNoP, { view: "puell" }), "history"); return /ไม่มีข้อมูล/.test(s) && !/data-lt-chart="hist"/.test(s); })());
["lthSopr", "lthSupply", "puell"].forEach(function (v) {
  var s = sec(BP.html(LIT(), { view: v, range: 730 }), "history");
  t("view " + v + " draws its own line", !!paths(s).main && plotAttr(s, "hist", "data-lt-to") !== null, Object.keys(paths(s)));
});

console.log("== html(): accuracy tables ==");
var ACC = between(HS, 'data-lt-bt="core"', 'data-lt-bt="full"');
t("core table: one row per state (5)", count(ACC, 'data-lt-bt-state="') === 5);
var strongRow = between(ACC, 'data-lt-bt-state="strong"', "</tr>");
t("median return 0.853 → +85.3% · 92% positive · median max drawdown −0.18 → −18.0% · n = 380 · 420 days · 6 episodes",
  /\+85\.3%/.test(strongRow) && /92%/.test(strongRow) && /−18\.0%/.test(strongRow) && /380/.test(strongRow) && />420</.test(strongRow) && />6</.test(strongRow), strongRow);
t("a state that never happened → ไม่เกิดในช่วงนี้ (no 0%)", /ไม่เกิดในช่วงนี้/.test(between(ACC, 'data-lt-bt-state="hot"', "</tr>")) && !/0%/.test(between(ACC, 'data-lt-bt-state="hot"', "</tr>")));
t("a horizon not complete yet (n = 0) → ยังไม่ครบช่วง", /ยังไม่ครบช่วง/.test(between(ACC, 'data-lt-bt-state="accum"', "</tr>")));
t("full table present with its own period (2022-12-17 → 2026-11-25)", /data-lt-bt="full"[\s\S]*<time datetime="2022-12-17"/.test(HS));
t("the engine's note (overlapping windows · in-sample) is shown", HS.indexOf("หน้าต่างผลตอบแทนซ้อนกัน") >= 0);
var mnb = LIT(); mnb.hist.full.backtest = null;
t("no backtest → ไม่มีข้อมูล", /ไม่มีข้อมูล/.test(between(sec(BP.html(mnb, {}), "history"), 'data-lt-bt="full"', "</div>")));
t("every table scrolls inside its own wrapper (gc-table-wrap), never the page", (function () { var tb = H.match(/<table/g) || []; var wr = H.match(/class="gc-table-wrap"[^>]*>\s*<table/g) || []; return tb.length === 2 && wr.length === 2; })());

var SS = sec(H, "sources");
t("3 sources: name · status · last updated · data through", count(SS, 'data-lt-src="') === 3 && /BGeometrics[\s\S]*ปกติ[\s\S]*อัปเดตล่าสุด[\s\S]*<time datetime="2026-11-26T01:00:00.000Z"[\s\S]*ข้อมูลถึง[\s\S]*<time datetime="2026-11-19"/.test(between(SS, 'data-lt-src="bgeometrics"', "</li>")));
t("stale → ใช้ข้อมูลเดิม · never fetched → ไม่มีข้อมูล (no fake time)", /ใช้ข้อมูลเดิม/.test(between(SS, 'data-lt-src="coinMetrics"', "</li>")) && !/<time/.test(between(SS, 'data-lt-src="blockchain"', "</li>")) && /ไม่มีข้อมูล/.test(between(SS, 'data-lt-src="blockchain"', "</li>")));

console.log("== html(): safety ==");
var bad = LIT();
bad.answers[0].a = "<img src=x onerror=alert(1)>"; bad.answers[1].id = 'x" onmouseover="alert(1)'; bad.signal.reasons = ["<script>alert(1)</script>"];
bad.sources[0].note = '"><svg onload=alert(1)>'; bad.signal.families.valuation.members[0].reason = "<b>x</b>"; bad.sources[1].name = "<i>CM</i>";
var HB = BP.html(bad, {});
t("every engine / source string is escaped", HB.indexOf("<img") < 0 && HB.indexOf("<script") < 0 && HB.indexOf("<svg onload") < 0 && HB.indexOf('onmouseover="alert') < 0 && HB.indexOf("<b>x</b>") < 0 && HB.indexOf("<i>CM</i>") < 0 && HB.indexOf("&lt;img") >= 0);
var views = ["price", "score", "mvrvZ", "puell", "lthSopr", "lthSupply"], ranges = [365, 730, 1461, "all"];
var allHtml = [];
views.forEach(function (v) { ranges.forEach(function (r) { allHtml.push(BP.html(LIT(), { view: v, range: r, showPrice: true })); allHtml.push(BP.html(M, { view: v, range: r, showPrice: true })); }); });
allHtml.push(HZ, HN, BP.html(null, null));
t("every view × range renders all 5 sections (literal model + the engine's model)", allHtml.every(function (h) { return (h.match(/data-lt-section="/g) || []).length === 5; }));
var maxPts = 0;
allHtml.forEach(function (h) { var ps = paths(h); Object.keys(ps).forEach(function (k) { var n = (ps[k].match(/[ML]/g) || []).length; if (n > maxPts) maxPts = n; }); });
t("≤ 600 points per drawn line everywhere (15-year daily series in)", maxPts > 0 && maxPts <= 600, maxPts);
t("no ฿ in any title / aria-label", allHtml.concat([HB]).every(function (h) { return !BAHT_ATTR.test(h); }));
t("no buy / sell advice in the panel copy or the engine's answers", allHtml.every(function (h) { return !ADVICE.test(h.replace(/<[^>]+>/g, " ")); }), (allHtml.filter(function (h) { return ADVICE.test(h.replace(/<[^>]+>/g, " ")); })[0] || "").replace(/<[^>]+>/g, " ").match(ADVICE));
t("every <time> carries a machine date", allHtml.every(function (h) { return (h.match(/<time[^>]*>/g) || []).every(function (tg) { return /datetime="\d{4}-\d\d-\d\d/.test(tg); }); }));
var H0 = BP.html(null, null);
t("html(null) → the 5 sections with ไม่มีข้อมูล, nothing thrown", (H0.match(/data-lt-section="/g) || []).length === 5 && /ไม่มีข้อมูล/.test(sec(H0, "signal")) && /data-lt-total=""/.test(H0));

console.log("== downsample ==");
var rows1k = daily("2020-01-01", addDays("2020-01-01", 999), function (i) { return i; });
rows1k[500] = [rows1k[500][0], 99999]; rows1k[700] = [rows1k[700][0], -5];
var ds = BP.downsample(rows1k, 100);
t("≤ max points · first and last kept · a one-day spike and dip kept · date order kept",
  ds.length <= 100 && ds.length >= 50 && ds[0] === rows1k[0] && ds[ds.length - 1] === rows1k[999] && ds.indexOf(rows1k[500]) >= 0 && ds.indexOf(rows1k[700]) >= 0 &&
  ds.every(function (r, i) { return i === 0 || r[0] > ds[i - 1][0]; }), ds.length);
t("short input comes back as is", BP.downsample(rows1k.slice(0, 50), 100).length === 50);

console.log("== wire(): buttons → onChange(ui) ==");
var R = hostEl();
var panelEl = el({ "data-lt-root": "", "data-lt-ui-range": "1461", "data-lt-ui-view": "score", "data-lt-ui-price": "1" }, R);
var got = [];
BP.wire(R, function (ui) { got.push(ui); });
BP.wire(R, function (ui) { got.push(ui); });
t("wire twice on one element → one click listener", (R.listeners.click || []).length === 1, (R.listeners.click || []).length);
var b730 = el({ "data-lt-range": "730" }, el({ role: "group" }, panelEl));
fire(R, "click", { target: el({}, b730) });
t("2Y (click lands on the button's inner span) → onChange({ range: 730, view: 'score', showPrice: true })", got.length === 1 && deq(got[0], { range: 730, view: "score", showPrice: true }), got);
var got2 = [];
BP.wire(R, function (ui) { got2.push(ui); });
fire(R, "click", { target: el({ "data-lt-range": "all" }, panelEl) });
t("re-wire replaces the callback (old one not called again) · ทั้งหมด → range 'all'", got.length === 1 && got2.length === 1 && got2[0].range === "all");
fire(R, "click", { target: el({ "data-lt-view": "puell" }, panelEl) });
t("view button → view 'puell'", got2.length === 2 && got2[1].view === "puell" && got2[1].range === 1461);
fire(R, "click", { target: el({ "data-lt-price": "" }, panelEl) });
t("price toggle → showPrice false", got2.length === 3 && got2[2].showPrice === false);
fire(R, "click", { target: el({ "data-lt-range": "1461" }, panelEl) });
fire(R, "click", { target: el({}, panelEl) });
fire(R, "click", { target: el({ "data-lt-view": "bogus" }, panelEl) });
t("current range / outside a button / unknown view → no call", got2.length === 3, got2.length);
var R2 = hostEl({ "data-lt-root": "", "data-lt-ui-range": "all", "data-lt-ui-view": "price", "data-lt-ui-price": "0" });
var got3 = [];
BP.wire(R2, function (ui) { got3.push(ui); });
fire(R2, "click", { target: el({ "data-lt-price": "" }, R2) });
t("wired on the panel root itself works too (price off → on)", got3.length === 1 && deq(got3[0], { range: "all", view: "price", showPrice: true }), got3);
BP.wire(null, function () {});
t("wire(null) does nothing (no throw)", true);

console.log("== wire(): hover read-out ==");
var mh = LIT();
BP.html(mh, { view: "price", range: 365 });
var cross = { hidden: true, style: {} }, tip = { hidden: true, style: {}, textContent: "", className: "btc-lt-tip" };
var plotEl = el({ "data-lt-chart": "hist" }, panelEl);
plotEl.getBoundingClientRect = function () { return { left: 100, width: 1000, top: 0, height: 200 }; };
plotEl.querySelector = function (s) { return s === ".btc-lt-cross" ? cross : s === ".btc-lt-tip" ? tip : null; };
plotEl.contains = function (n) { while (n) { if (n === plotEl) return true; n = n.parentNode; } return false; };
fire(R, "mousemove", { target: plotEl, clientX: 1100 });
t("hover at the right edge → the newest day's BTC price ($91,234)", tip.hidden === false && cross.hidden === false && tip.textContent.indexOf("$91,234") >= 0, tip.textContent);
fire(R, "mouseout", { target: plotEl, relatedTarget: panelEl });
t("leaving the chart hides the read-out", tip.hidden === true && cross.hidden === true);

console.log("== module ==");
t("ES5 only (no let / const / arrow / template / class / spread)", !/\b(let|const)\s|=>|`|\bclass\s+[A-Za-z]|\.\.\.[A-Za-z_$[{(]/.test(SRC));
t("no network and no storage used (fetch · XHR · localStorage untouched)", P.net.length === 0 && P.storage.length === 0 && N.net.length === 0 && N.storage.length === 0, { net: P.net, storage: P.storage });
var CSS = ""; try { CSS = read("btc-lt-panel.css"); } catch (e) { CSS = ""; }
t("the panel's stylesheet ships with it (public/btc-lt-panel.css)", CSS.length > 0 && CSS.indexOf(".btc-lt") >= 0);

// controller ruling (Task 4): the row already shows value · zone · score, so the line under it says what the
// number measures instead of repeating them (the engine's reason sentence restated all three)
var whyRows = (BP.html(M, {}).match(/<li class="btc-lt-mem" data-lt-member="[a-zA-Z0-9]+">[\s\S]*?<\/li>/g) || []);
var whyOf = function (row) { return ((/<p class="btc-lt-mem-why">([^<]*)<\/p>/.exec(row) || [])[1] || ""); };
t("each indicator row explains what its number measures — no restated value / zone / score",
  whyRows.length >= 4 && whyRows.every(function (row) { var w = whyOf(row); return w.length > 10 && w.indexOf("คะแนน") < 0; }),
  whyRows.map(function (row) { return whyOf(row); }));
// final review 2026-11-26: "Last Updated" must be true — a price handed over with its own date (an older snapshot
// close) is dated with that day everywhere, not with today
var YDAY = new Date(Date.parse(TODAY + "T00:00:00Z") - 86400000).toISOString().slice(0, 10);
var MD = BP.model({ onchain: OC, history: HI, livePrice: { value: 99000, at: YDAY + "T21:00:00Z", source: "Data Snapshot" }, valuationZone: VZ, intelCycle: "Accumulation", today: TODAY });
t("a price with its own date: the cost-basis price row and the score's data line carry that day, not today",
  MD.cost && MD.cost.price === 99000 && MD.cost.priceAsOf === YDAY && MD.cost.priceSource === "Data Snapshot" && MD.inputs && MD.inputs.asOf && MD.inputs.asOf.price === YDAY,
  { priceAsOf: MD.cost && MD.cost.priceAsOf, inputsPrice: MD.inputs && MD.inputs.asOf && MD.inputs.asOf.price });
var HPU = BP.html(M, { view: "puell", range: 1461, showPrice: true });
t("the Puell history view says the score uses the 7-day mean (the line is the daily value)", /เฉลี่ย 7 วัน/.test(between(HPU, 'data-lt-section="history"', "</section>")));
// final review 2026-11-26: dates are point-in-time, values are each source's current vintage — say so, do not over-claim
t("the history section says the values are each source's current version (a restated source moves old points too)",
  /ฉบับปัจจุบัน/.test(between(BP.html(M, {}), 'data-lt-section="history"', "</section>")));
// ---------------------------------------------------------------- 2026-11-26 visuals (user: "เห็นรูปแล้วรู้เลยว่าถูกหรือแพง")
console.log("== 5 questions as gauges ==");
var LG = LIT();
LG.answers = [
  { id: "lthCost", q: "Q1", a: "เหนือต้นทุน LTH +25.2%", tone: "green", evidence: "หลักฐาน 1", score: 80 },
  { id: "lthFlow", q: "Q2", a: "ขายออกเล็กน้อย", tone: "amber", evidence: "หลักฐาน 2", score: 37.2 },
  { id: "lthProfit", q: "Q3", a: "ขายขาดทุน", tone: "green", evidence: "หลักฐาน 3", score: 96.3 },
  { id: "value", q: "Q4", a: "ถูกมาก", tone: "green", evidence: "หลักฐาน 4", score: 85.1 },
  { id: "cycle", q: "Q5", a: "โซนสะสม", tone: "green", evidence: "หลักฐาน 5", score: 75 }];
var HG = BP.html(LG, {}), QS = between(HG, 'data-lt-section="questions"', "</section>");
function qCard(h, id) { return (h.match(new RegExp('<article data-lt-q="' + id + '"[\\s\\S]*?</article>')) || [""])[0]; }
function needleOf(card) { var m = /data-lt-needle="([\d.]+)"/.exec(card); return m ? m[1] : null; }
function verdictOf(card) { var m = /class="btc-lt-q-v[^"]*">([^<]*)</.exec(card); return m ? m[1] : null; }
t("every card draws a gauge (4 colour bands, hidden from screen readers) and keeps its score", ["lthCost", "lthFlow", "lthProfit", "value", "cycle"].every(function (id) {
  var c = qCard(HG, id); return /<svg class="btc-lt-gauge"[^>]*aria-hidden="true"/.test(c) && (c.match(/class="btc-lt-gz is-/g) || []).length === 4 && /data-lt-score="/.test(c);
}), qCard(HG, "lthCost").slice(0, 400));
t("needle position = 1 − score/100 (0 = far left · cheap)", needleOf(qCard(HG, "lthCost")) === "0.200" && needleOf(qCard(HG, "lthFlow")) === "0.628" && needleOf(qCard(HG, "lthProfit")) === "0.037" && needleOf(qCard(HG, "value")) === "0.149" && needleOf(qCard(HG, "cycle")) === "0.250",
  ["lthCost", "lthFlow", "lthProfit", "value", "cycle"].map(function (id) { return needleOf(qCard(HG, id)); }));
t("big verdict word from the score: 80 ถูกมาก · 37.2 ระวัง · 96.3 ถูกมาก · 85.1 ถูกมาก · 75 ถูก",
  ["ถูกมาก", "ระวัง", "ถูกมาก", "ถูกมาก", "ถูก"].join() === ["lthCost", "lthFlow", "lthProfit", "value", "cycle"].map(function (id) { return verdictOf(qCard(HG, id)); }).join(),
  ["lthCost", "lthFlow", "lthProfit", "value", "cycle"].map(function (id) { return verdictOf(qCard(HG, id)); }));
var VW = [[90, "ถูกมาก"], [80, "ถูกมาก"], [79.9, "ถูก"], [65, "ถูก"], [64.9, "กลาง ๆ"], [45, "กลาง ๆ"], [44.9, "ระวัง"], [30, "ระวัง"], [29.9, "แพง"], [15, "แพง"], [14.9, "แพงมาก"], [0, "แพงมาก"]];
t("verdict bands at their edges (≥80 ถูกมาก · ≥65 ถูก · ≥45 กลาง ๆ · ≥30 ระวัง · ≥15 แพง · else แพงมาก)", VW.every(function (c) {
  var L = LIT(); L.answers = [{ id: "value", q: "Q", a: "x", tone: "gray", evidence: "", score: c[0] }]; return verdictOf(qCard(BP.html(L, {}), "value")) === c[1];
}));
t("the short answer stays under the verdict; the evidence folds into รายละเอียด (named per question for screen readers)", /class="btc-lt-q-a">เหนือต้นทุน LTH \+25\.2%</.test(qCard(HG, "lthCost")) &&
  /<details class="btc-lt-q-more" data-lt-open="q:lthCost"><summary aria-label="รายละเอียด: ราคาเทียบต้นทุนสายยาว">รายละเอียด<\/summary><p class="btc-lt-q-ev">หลักฐาน 1<\/p><\/details>/.test(qCard(HG, "lthCost")), qCard(HG, "lthCost"));
var SUM = (QS.match(/<div class="btc-lt-qsum"[\s\S]*?<\/div>/) || [""])[0];
t("summary on top: 5 dots in question order (g · a · g · g · g) + \"4 ข้อ ชี้ว่าถูก · 1 ข้อ ให้ระวัง (name)\"",
  (SUM.match(/<i class="is-(\w)"/g) || []).map(function (x) { return x.slice(-2, -1); }).join("") === "gaggg" &&
  /<b class="is-g">4 ข้อ<\/b> ชี้ว่าถูก/.test(SUM) && /<b class="is-a">1 ข้อ<\/b> ให้ระวัง \(สายยาวสะสม\/ขายออก\)/.test(SUM) && QS.indexOf("btc-lt-qsum") < QS.indexOf("<article"), SUM);
var LN = LIT(); LN.answers = [{ id: "lthCost", q: "Q1", a: "ข้อมูลไม่พอ", tone: "gray", evidence: "ยังไม่มี", score: null }, { id: "value", q: "Q4", a: "ถูก", tone: "green", evidence: "", score: 70 }];
var HN2 = BP.html(LN, {});
t("no data (score null) → no needle, verdict \"ไม่มีข้อมูล\", counted apart in the summary", needleOf(qCard(HN2, "lthCost")) === null && verdictOf(qCard(HN2, "lthCost")) === "ไม่มีข้อมูล" &&
  /<b class="is-n">1 ข้อ<\/b> ไม่มีข้อมูล/.test(HN2) && /<b class="is-g">1 ข้อ<\/b> ชี้ว่าถูก/.test(HN2), qCard(HN2, "lthCost").slice(0, 600));
var LO = LIT();   // an answer without a score field at all (older model) → no needle, the word follows the tone
var HO2 = BP.html(LO, {});
t("an answer with no score field → no needle; the word follows its tone (green ถูก · gray กลาง ๆ · amber ระวัง · red แพง)",
  needleOf(qCard(HO2, "lthCost")) === null && verdictOf(qCard(HO2, "lthCost")) === "ถูก" && verdictOf(qCard(HO2, "lthFlow")) === "กลาง ๆ" && verdictOf(qCard(HO2, "lthProfit")) === "ระวัง" && verdictOf(qCard(HO2, "valuation")) === "แพง");
t("the engine's model: every card's needle matches its answer's score", M.answers.every(function (a) { var c = qCard(BP.html(M, {}), a.id); return a.score == null ? needleOf(c) === null : needleOf(c) === (1 - a.score / 100).toFixed(3); }), M.answers.map(function (a) { return a.id + ":" + a.score; }));

console.log("== history: the accuracy picture ==");
var LA = LIT();
LA.hist.core.rows = LA.hist.core.rows.slice(0, -1).concat([["2026-11-25", 84, "strong"]]);   // now = strong (h365: 96% up, median +150%, maxDD −22%)
var HA = BP.html(LA, {}), HS = between(HA, 'data-lt-section="history"', "</section>");
var NOW = (HS.match(/<div class="btc-lt-accnow"[\s\S]*?<\/div><\/div>/) || [""])[0];
t("the picture leads with what the section answers (neutral — a hot reading is not 'accuracy') + since when", /<h4 class="btc-lt-acc-h">ในอดีต ช่วงที่สัญญาณเป็นแบบนี้ 1 ปีต่อมาราคาเป็นยังไง\?<\/h4>/.test(HS) && /ถือต่อ 1 ปี/.test(HS) && /<time datetime="2018-01-01">/.test(between(HS, "btc-lt-accpic", "btc-lt-accnow")));
t("now = the core signal's latest state (strong) · 100 cells: 96 up + 4 down · \"96 ใน 100 ครั้ง\"",
  /data-lt-acc-now="strong"/.test(HS) && (NOW.match(/data-lt-cell="up"/g) || []).length === 96 && (NOW.match(/data-lt-cell="down"/g) || []).length === 4 && /96 ใน 100 ครั้ง/.test(NOW), NOW.slice(0, 300));
t("…with the median and the typical drop on the way (+150% · −22%)", /ครึ่งหนึ่งขึ้นเกิน \+150%/.test(NOW) && /−22%/.test(NOW), NOW.replace(/<i [^>]*><\/i>/g, "").slice(0, 600));
var BARS = HS.match(/<div class="btc-lt-accbar[^"]*" data-lt-acc-bar="\w+"[\s\S]*?<\/span><\/div>/g) || [];
function barOf(k) { return BARS.filter(function (b) { return b.indexOf('data-lt-acc-bar="' + k + '"') >= 0; })[0] || ""; }
t("one bar per state in order · width = % of times up after 1 year (96 · 63 · 30)", BARS.length === 5 && /width:96%/.test(barOf("strong")) && /width:63%/.test(barOf("neutral")) && /width:30%/.test(barOf("risk")), BARS.map(function (b) { return b.slice(0, 140); }));
t("the current state's bar is marked \"◀ ตอนนี้\" (only that one)", /is-now/.test(barOf("strong")) && /◀ ตอนนี้/.test(barOf("strong")) && (HS.match(/◀ ตอนนี้/g) || []).length === 1);
t("a state with no full year yet / that never happened says so (no 0% bar)", /ยังไม่ครบ 1 ปี/.test(barOf("accum")) && !/width:/.test(barOf("accum")) && /ไม่เกิดในช่วงนี้/.test(barOf("hot")) && !/width:/.test(barOf("hot")));
t("the one-line takeaway is built from the numbers (green 96 vs orange/red 30) + the in-sample caveat", /สีเขียว[^<]*96 ใน 100 ครั้ง/.test(HS) && /ส้ม\/แดง[^<]*30 ใน 100 ครั้ง/.test(HS) && /อดีตไม่ได้รับประกันอนาคต/.test(HS));
var FULL = (HS.match(/<details class="btc-lt-accfull" data-lt-acc-full[^>]*>[\s\S]*<\/details>/) || [""])[0];
t("both old tables + their footnote still exist, folded under ดูตารางเต็ม (closed by default)",
  /<summary>ดูตารางเต็ม/.test(FULL) && /data-lt-bt="core"/.test(FULL) && /data-lt-bt="full"/.test(FULL) && /มัธยฐานของจุดต่ำสุดระหว่างทาง/.test(FULL) && !/<details class="btc-lt-accfull"[^>]* open/.test(HS));
var LA2 = LIT(); LA2.hist.core.rows = LA2.hist.core.rows.slice(0, -1).concat([["2026-11-25", 70, "accum"]]);   // accum has no 365-day result
var NOW2 = (between(BP.html(LA2, {}), 'data-lt-section="history"', "</section>").match(/<div class="btc-lt-accnow"[\s\S]*?<\/div><\/div>/) || [""])[0];
t("now = a state with no full year in the past → says so, no 100 cells from nothing", /data-lt-acc-now="accum"/.test(NOW2) && !/data-lt-cell/.test(NOW2) && /ยังไม่มีผลครบ 1 ปี/.test(NOW2), NOW2.slice(0, 400));
var LA3 = LIT(); LA3.hist.core = { rows: [], backtest: null };
t("no core history at all → ไม่มีข้อมูล, no cells, no bars", /data-lt-acc-pic/.test(BP.html(LA3, {})) && !/data-lt-cell|data-lt-acc-bar/.test(BP.html(LA3, {})) && /ไม่มีข้อมูล/.test(between(BP.html(LA3, {}), "data-lt-acc-pic", "</details>")));
t("the picture renders for the engine's own model too (no NaN / undefined)", /data-lt-acc-pic/.test(BP.html(M, {})) && !/NaN|undefined/.test(between(BP.html(M, {}), 'data-lt-section="history"', "</section>")));

console.log("== review fixes (2026-11-26) ==");
// I1 — the picture's ตอนนี้ is the CORE signal: say so, and say it when the headline (6-indicator) state differs
var NOWR = NOW;   // LA: core = strong · headline (LIT signal) = accum
t("I1: the ตอนนี้ line names its signal (สัญญาณแกน MVRV-Z + Puell)", /ตอนนี้ สัญญาณแกน \(MVRV-Z \+ Puell\) อยู่ที่ <span class="btc-lt-state btc-lt-st-strong">/.test(NOWR), NOWR.replace(/<i [^>]*><\/i>/g, "").slice(0, 600));
t("I1: headline state (น่าสะสม) ≠ core state → one line says so, and why", /คะแนนรวม 6 ตัวด้านบนอยู่ที่ <span class="btc-lt-state btc-lt-st-accum">น่าสะสม<\/span>/.test(NOWR) && /ย้อนได้ราว \d+ ปี/.test(NOWR), NOWR.replace(/<i [^>]*><\/i>/g, "").slice(0, 900));
t("I1: same state as the headline → no reconcile line", !/คะแนนรวม 6 ตัวด้านบนอยู่ที่/.test(BP.html(LA2, {})));
// I2 — the base is visible; a thin sample draws no cells / no bar; 0 or 100 only when exact
function laWith(fn) { var L = LIT(); L.hist.core.rows = L.hist.core.rows.slice(0, -1).concat([["2026-11-25", 84, "strong"]]); fn(L.hist.core.backtest.byState); return between(BP.html(L, {}), 'data-lt-section="history"', "</section>"); }
function nowOf(h) { return (h.match(/<div class="btc-lt-accnow"[\s\S]*?<\/div><\/div>/) || [""])[0]; }
function barIn(h, k) { return (h.match(new RegExp('data-lt-acc-bar="' + k + '"[\\s\\S]*?</span></div>')) || [""])[0]; }
t("I2: the base under the big number — episodes + days (strong: 6 ช่วง · 300 วัน)", /จาก 6 ช่วงที่เคยเกิด \(300 วัน/.test(NOW), NOW.replace(/<i [^>]*><\/i>/g, "").slice(0, 900));
t("I2: each bar shows its base (strong · 6 ช่วง)", /6 ช่วง/.test(barOf("strong")), barOf("strong"));
var THIN1 = laWith(function (b) { b.strong.episodes = 1; });
t("I2: one episode → no 100 cells, says ตัวอย่างน้อย", !/data-lt-cell/.test(nowOf(THIN1)) && /ตัวอย่างน้อย/.test(nowOf(THIN1)), nowOf(THIN1).slice(0, 500));
var THIN2 = laWith(function (b) { b.strong.h365 = { n: 1, median: 0.5, posPct: 100, medianMaxDD: 0 }; });
t("I2: one day (n = 1) → no cells and no \"100 ใน 100\"", !/data-lt-cell/.test(THIN2) && !/100 ใน 100/.test(THIN2) && /ตัวอย่างน้อย/.test(nowOf(THIN2)));
var NEAR = laWith(function (b) { b.strong.h365 = { n: 900, median: 0.5, posPct: 99.6, medianMaxDD: -0.1 }; });
t("I2: 99.6% up → \"99 ใน 100\" + 1 red cell (100 only when it is exactly 100)", /99 ใน 100 ครั้ง/.test(nowOf(NEAR)) && (nowOf(NEAR).match(/data-lt-cell="down"/g) || []).length === 1, (nowOf(NEAR).match(/data-lt-cell="down"/g) || []).length);
var EXACT = laWith(function (b) { b.strong.h365 = { n: 900, median: 0.5, posPct: 100, medianMaxDD: -0.1 }; });
t("I2: exactly 100% → \"100 ใน 100\"", /100 ใน 100 ครั้ง/.test(nowOf(EXACT)));
var THINBAR = laWith(function (b) { b.neutral.episodes = 2; });
t("I2: a bar on a thin sample says ตัวอย่างน้อย instead of drawing a bar", /ตัวอย่างน้อย/.test(barIn(THINBAR, "neutral")) && !/width:/.test(barIn(THINBAR, "neutral")), barIn(THINBAR, "neutral"));
t("I2: the visible note says neighbouring days overlap (not 100 separate events)", /ไม่ใช่ 100 เหตุการณ์แยกกัน/.test(HS));
// M7 — the big number takes the state's colour
var LRISK = LIT(); LRISK.hist.core.rows = LRISK.hist.core.rows.slice(0, -1).concat([["2026-11-25", 35, "risk"]]);
t("M7: the big number takes the state's colour (risk → amber · strong → green)", /class="btc-lt-accbig is-a"/.test(BP.html(LRISK, {})) && /class="btc-lt-accbig is-g"/.test(HS));
// M8 — numbers and wording
var FMT = laWith(function (b) { b.strong.h365 = { n: 900, median: 0.0996, posPct: 90, medianMaxDD: -0.001 }; });
t("M8: +9.96% reads +10% (decimals picked after rounding) · a ~0% drop is not printed", /ครึ่งหนึ่งขึ้นเกิน \+10%/.test(nowOf(FMT)) && !/ต่ำกว่าราคาเริ่ม/.test(nowOf(FMT)), nowOf(FMT).replace(/<i [^>]*><\/i>/g, ""));
var ZERO = laWith(function (b) { b.strong.h365 = { n: 900, median: 0, posPct: 50, medianMaxDD: -0.2 }; });
t("M8: a 0% median reads แทบไม่เปลี่ยน (not 'แย่กว่า 0.0%')", /แทบไม่เปลี่ยน/.test(nowOf(ZERO)) && !/แย่กว่า 0/.test(ZERO));
t("M8: the drop is 'below the starting price' — it does not claim the dip came first · no '~−'", /ต่ำกว่าราคาเริ่ม ราว −22%/.test(NOW) && !/ร่วงลงก่อน/.test(HS) && !/~−/.test(HS), NOW.replace(/<i [^>]*><\/i>/g, ""));
// M10 — red answers are ชี้ว่าแพง, amber ให้ระวัง
var LRD = LIT(); LRD.answers = [{ id: "value", q: "Q4", a: "แพงมาก", tone: "red", evidence: "", score: 10 }, { id: "lthFlow", q: "Q2", a: "x", tone: "amber", evidence: "", score: 35 }];
var SUMR = (BP.html(LRD, {}).match(/<div class="btc-lt-qsum"[\s\S]*?<\/div>/) || [""])[0];
t("M10: red answers are counted as ชี้ว่าแพง, amber as ให้ระวัง", /<b class="is-r">1 ข้อ<\/b> ชี้ว่าแพง \(ถูก\/แพงเทียบต้นทุน\)/.test(SUMR) && /<b class="is-a">1 ข้อ<\/b> ให้ระวัง \(สายยาวสะสม\/ขายออก\)/.test(SUMR), SUMR);
// M3 / M9 / M10 — CSS
t("M3: a text-only ตอนนี้ box spans the whole row", /\.btc-lt-accnow-t:only-child \{ grid-column: 1 \/ -1; \}/.test(CSS));
t("M9: words never use the faint mark colour (ink-3) · down cells are hollow rings (not colour alone)",
  !/(\.btc-lt-q-v\.is-n|\.btc-lt-qsum b\.is-n|\.btc-lt-accbar \.btc-lt-none|\.btc-lt-accnow-t small)[^{]*\{[^}]*color: var\(--gc-ink-3/.test(CSS) &&
  /\.btc-lt-cells i\.is-down \{[^}]*background: transparent;[^}]*box-shadow: inset/.test(CSS));
t("M10: on a phone the question titles take the same height (gauges line up)", /@media \(max-width: 640px\) \{[^}]*\.btc-lt-q-q \{ min-height: 4\.35em; \}/.test(CSS));
// M6 — an opened รายละเอียด / ดูตารางเต็ม survives a re-render (the page re-renders on data events)
var RO = hostEl(), capT = null, addO = RO.addEventListener;
RO.addEventListener = function (type, fn, cap) { if (type === "toggle") capT = cap; return addO.call(RO, type, fn); };
BP.wire(RO, function () {});
t("M6: wire listens for toggle in the capture phase (toggle does not bubble)", (RO.listeners.toggle || []).length === 1 && capT === true, capT);
function tog(key, open) { var d = el({ "data-lt-open": key }); d.open = open; fire(RO, "toggle", { target: d }); }
tog("acc-full", true);
t("M6: an opened ดูตารางเต็ม stays open on the next render", /<details class="btc-lt-accfull" data-lt-acc-full data-lt-open="acc-full" open>/.test(BP.html(LA, {})));
tog("acc-full", false);
t("M6: …and closed again after the user closes it", !/data-lt-open="acc-full" open/.test(BP.html(LA, {})) && /data-lt-open="acc-full">/.test(BP.html(LA, {})));
tog("q:lthFlow", true);
t("M6: a question's รายละเอียด keeps its open state too", /<details class="btc-lt-q-more" data-lt-open="q:lthFlow" open>/.test(BP.html(LG, {})));
tog("q:lthFlow", false);

var oddM = LIT(); oddM.signal.families.valuation.members.push({ key: "mysteryKey", label: "X", value: 1, score: 50, zone: "กลาง", reason: "<b>x</b> เหตุผลของตัวที่ไม่รู้จัก" });
var HO = BP.html(oddM, {});
t("a member the panel does not know keeps the engine's reason (escaped)", HO.indexOf("&lt;b&gt;x&lt;/b&gt; เหตุผลของตัวที่ไม่รู้จัก") >= 0 && HO.indexOf("<b>x</b>") < 0);

finish();
