// Bitcoin Monitor · 🧬 On-chain Deep Dive — RUP card + trend charts (2026-11-23)
//   node scripts/btc-deepdive-test.js
//
// What must stay true:
//   · public/btc-onchain-live.js pulls ~4 years of DAILY HISTORY per metric from BGeometrics — one request per
//     endpoint (same budget as the old /last calls; free tier 10/hour · 15/day per IP) — 11 a day (2026-11-26):
//       mvrv-zscore · realized-price · nupl · nup (RUP, field nupProfit) · sopr · ssr · supply-profit-lth + supply-loss-lth
//       (LTH Supply — the live-verified pair; the single long-term-hodler-supply-btc endpoint was never called for real,
//       so the existing card stays on the pair) · lth-realized-price · lth-sopr · true-market-mean (= Active Investor
//       Price) — field names of the 3 new ones from the /last schemas of BGeometrics' OpenAPI spec.
//       - at most 10 REQUESTS per run (the hourly limit): the 11th waits for the next hour by itself — never a 429 of
//         our own making;
//       - latest value = the newest row; history goes to IndexedDB (BigCache "btc_bgeo_hist_v1:<key>"), never localStorage;
//       - every row passes PLAUSIBLE (the range the metric can really take): a wrong unit / wrong field is dropped, so it
//         never becomes the latest value or a chart point — no row left = no value (Data Unavailable), never a wrong number;
//       - a v1 day-cache (/last era) counts as "not fetched today"; today's v2 cache is not re-fetched — on the day this
//         ships only the 3 new metrics are requested (8 + 3 = 11 ≤ 15);
//       - the once-per-hour guard; a rate limit mid-loop leaves the unreached metrics pending for the next hour;
//       - a metric that answered 404 today is not retried today; null / "" / false never become a real 0.
//     sumByDate (several parts summed by day) stays for a future multi-part metric; no metric uses it today.
//   · the Deep Dive shows 7 cards; RUP sits after NUPL with zone tags < 0.25 กำไรบาง (calm) · < 0.5 กำไรปานกลาง (normal) ·
//     < 0.7 กำไรหนา (warning) · ≥ 0.7 กำไรล้น (danger) and does NOT move the Buy Zone.
//   · with history each card draws a trend chart (zone bands = the tag thresholds, white line, end dot, y labels at the
//     zone edges, 4 month labels) for the chosen range (6M · 1Y default · 2Y · 4Y, remembered per viewer) and a
//     "▲/▼ change in <range>" line; the chart opens the big view (data-dd-open, keyboard reachable). Without history:
//     the zone gauge + a note. คืออะไร/อ่านยังไง/ข้อจำกัด sit in "อ่านเพิ่ม"; "วันนี้" stays visible.
// No network: fetch is stubbed; no portfolio documents.
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
function toneOf(cls) { var m = String(cls).match(/\bgc-(calm|normal|warning|danger|neutral)\b/g) || []; return m.length === 1 ? m[0] : null; }
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
var DAY = 86400000;
function ymd(ms) { return new Date(ms).toISOString().slice(0, 10); }
var TODAY = ymd(Date.now()), D1 = ymd(Date.now() - DAY), D2 = ymd(Date.now() - 2 * DAY), D3 = ymd(Date.now() - 3 * DAY);

// ------------------------------------------------------------------ loader (btc-onchain-live.js)
var SRC_LIVE = read("btc-onchain-live.js");
function rows(field, vals, dates) { return vals.map(function (v, i) { var r = { d: (dates || [D3, D2, D1])[i], unixTs: i }; r[field] = v; r.delayed = false; return r; }); }
// SIMULATED BGeometrics responses — made-up numbers for this test only (never fetched, not market data). Row shape =
// the /last response schemas in BGeometrics' OpenAPI spec (d · unixTs · <field> · delayed), field names checked offline.
var BODY = {
  "mvrv-zscore": rows("mvrvZscore", [1.1, 1.15, 1.2]),
  "realized-price": rows("realizedPrice", [44800, 44900, 45000]),
  "nupl": rows("nupl", [0.38, 0.39, 0.4]),
  "nup": rows("nupProfit", [0.5, 0.51, 0.52]),
  "sopr": rows("sopr", [1, 1.005, 1.01]),
  "ssr": rows("ssrStablecoin", [9.2, 9.1, 9]),
  // LTH Supply = LTH coins in profit + in loss · no D2 loss row → D2 dropped from the sum
  "supply-profit-lth": rows("supplyProfitLthBtc", [12e6, 12.1e6, 12.2e6]),
  "supply-loss-lth": rows("supplyLossLthBtc", [2.5e6, 2.4e6], [D3, D1]),
  "lth-realized-price": rows("lthRealizedPrice", [37800, 37900, 38000]),
  "lth-sopr": rows("lthSopr", [1.8, 1.9, 2.1]),
  "true-market-mean": rows("trueMarketMean", [52000, 52100, 52200])
};
// 11 requests a day; one run sends at most 10 (the hourly limit) → the 11th goes an hour later
var ORDER = ["mvrv-zscore", "realized-price", "nupl", "nup", "sopr", "ssr", "supply-profit-lth", "supply-loss-lth", "lth-realized-price", "lth-sopr", "true-market-mean"];
var KEYS10 = ["mvrvZScore", "realizedPrice", "nupl", "rup", "sopr", "ssr", "lthSupply", "lthRealizedPrice", "lthSopr", "activeInvestorPrice"];
function makeLive(store, status, big, body, srv) {
  var calls = [], urls = [], server = [];
  var B = body || BODY;
  var ctx = {
    console: console, JSON: JSON, Promise: Promise, Date: Date, Object: Object, Array: Array,
    localStorage: { getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; }, setItem: function (k, v) { store[k] = String(v); } },
    CustomEvent: function (n) { this.type = n; },
    dispatchEvent: function () {},
    fetch: function (url) {
      // our own server (2026-11-27 fallback): recorded apart from BGeometrics · srv = { metricKey: body | { status } }
      if (String(url).indexOf("/api/bitcoin?") === 0) {
        var mk = decodeURIComponent((/[?&]m=([^&]*)/.exec(String(url)) || [])[1] || "");
        server.push(mk);
        var sb = srv && Object.prototype.hasOwnProperty.call(srv, mk) ? srv[mk] : { status: 404 };
        var sst = sb && sb.status ? sb.status : 200;
        return Promise.resolve({ status: sst, ok: sst === 200, json: function () { return Promise.resolve(JSON.parse(JSON.stringify(sb))); } });
      }
      urls.push(String(url));
      var ep = String(url).replace("https://bitcoin-data.com/v1/", "").split("?")[0];
      calls.push(ep);
      var st = (status && status[ep]) || (B[ep] ? 200 : 404);
      return Promise.resolve({ status: st, ok: st === 200, json: function () { return Promise.resolve(B[ep]); } });
    }
  };
  if (big) ctx.BigCache = { get: function (k) { return Promise.resolve(Object.prototype.hasOwnProperty.call(big, k) ? big[k] : null); }, set: function (k, v) { big[k] = JSON.parse(JSON.stringify(v)); return Promise.resolve(true); } };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(SRC_LIVE, ctx, { filename: "btc-onchain-live.js" });
  return { live: ctx.BtcOnchainLive, calls: calls, urls: urls, server: server };
}
function cacheOf(store) { return JSON.parse(store.btc_bgeo_v1 || "null"); }
var V1 = { mvrvZScore: { value: 1, date: D2 }, realizedPrice: { value: 44000, date: D2 }, nupl: { value: 0.39, date: D2 }, sopr: { value: 1, date: D2 }, ssr: { value: 9, date: D2 } };

async function loaderTests() {
  console.log("== loader: endpoints · order · parsing ==");
  var L = makeLive({}).live, M = L.METRICS;
  var keys = Object.keys(M);
  t("10 metrics in order: mvrvZScore · realizedPrice · nupl · rup · sopr · ssr · lthSupply · lthRealizedPrice · lthSopr · activeInvestorPrice", keys.join() === KEYS10.join(), keys);
  t("rup = BGeometrics `nup` (field nupProfit)", M.rup.parts.length === 1 && M.rup.parts[0].ep === "nup" && M.rup.parts[0].pick.test("nupProfit"));
  function onePart(cfg, ep, field) { return !!cfg && cfg.parts.length === 1 && cfg.parts[0].ep === ep && cfg.parts[0].pick.test(field); }
  t("lthSupply = supply-profit-lth + supply-loss-lth (the live-verified pair — the existing card keeps its source)", M.lthSupply.parts.map(function (p) { return p.ep; }).join() === "supply-profit-lth,supply-loss-lth" && M.lthSupply.parts[0].pick.test("supplyProfitLthBtc") && M.lthSupply.parts[1].pick.test("supplyLossLthBtc"), M.lthSupply);
  t("no request to the never-verified long-term-hodler-supply-btc", Object.keys(M).every(function (k) { return M[k].parts.every(function (p) { return p.ep !== "long-term-hodler-supply-btc"; }); }));
  t("lthRealizedPrice = lth-realized-price (field lthRealizedPrice)", onePart(M.lthRealizedPrice, "lth-realized-price", "lthRealizedPrice"));
  t("lthSopr = lth-sopr (field lthSopr)", onePart(M.lthSopr, "lth-sopr", "lthSopr"));
  t("activeInvestorPrice = true-market-mean (BGeometrics' name for the Active Investor Price · field trueMarketMean)", onePart(M.activeInvestorPrice, "true-market-mean", "trueMarketMean"));
  // a /last-shaped row as the spec documents it — the pick must land on the metric's own field, not on delayed / message
  t("each new pick reads its own field in a /last-shaped row (d · unixTs · delayed · message · <field>)", [["lthRealizedPrice", "lthRealizedPrice", 38000], ["lthSopr", "lthSopr", 2.1], ["activeInvestorPrice", "trueMarketMean", 52200]].every(function (c) {
    var row = { d: D1, unixTs: 1, delayed: true, message: "SIMULATED: Real-time data (last 7 days) requires an active subscription" };
    row[c[1]] = c[2];
    var p = L.parseLast(row, M[c[0]].parts[0].pick);
    return !!p && p.value === c[2] && p.field === c[1];
  }));
  t("PLAUSIBLE exported: the range each metric can really take", same(L.PLAUSIBLE, { mvrvZScore: [-5, 25], realizedPrice: [1e3, 1e6], nupl: [-1, 1], rup: [0, 1.5], sopr: [0.3, 3], ssr: [0, 500],
    lthSupply: [5e6, 2.1e7], lthRealizedPrice: [1e3, 1e6], lthSopr: [0.1, 100], activeInvestorPrice: [1e3, 1e6] }), L.PLAUSIBLE);
  t("keepPlausible: rows outside the metric's range are dropped; a key without a range keeps its rows", same(L.keepPlausible([[D3, 0.5], [D2, 38000], [D1, 2e6]], "lthRealizedPrice"), [[D2, 38000]]) && same(L.keepPlausible([[D1, 1.2]], "notAMetric"), [[D1, 1.2]]));
  var s = L.parseSeries([{ d: D1, nupProfit: 0.5 }, { d: D3, nupProfit: "0.4" }, { d: D2, nupProfit: null, delayed: false }, { d: D1, nupProfit: 0.52 }, { d: "x" }], /nup/i);
  t("parseSeries: ascending, one row per day (last wins), null dropped, numeric strings kept", JSON.stringify(s) === JSON.stringify([[D3, 0.4], [D1, 0.52]]), s);
  t("parseSeries: page object {content:[…]} works too", L.parseSeries({ content: [{ d: D1, sopr: 1.01 }] }, /sopr/i).length === 1);
  t("parseSeries: a single /last object → one row", JSON.stringify(L.parseSeries({ d: D1, nupProfit: 0.5 }, /nup/i)) === JSON.stringify([[D1, 0.5]]));
  t("parseLast: nupProfit null / \"\" → null (no fake 0 from delayed:false)", L.parseLast({ d: TODAY, nupProfit: null, delayed: false }, /nup/i) === null && L.parseLast({ d: TODAY, nupProfit: "", delayed: false }, /nup/i) === null);
  var sum = L.sumByDate([[[D3, 1], [D2, 2], [D1, 3]], [[D3, 10], [D1, 30]]]);
  t("sumByDate: only days every part has (no half-summed dip)", JSON.stringify(sum) === JSON.stringify([[D3, 11], [D1, 33]]), sum);

  console.log("== loader: a v1 (/last era) cache from today → one full history pull ==");
  var store = { btc_bgeo_v1: JSON.stringify({ u: TODAY, at: "x", metrics: V1, eps: {}, lastAttempt: Date.now() - 10 * 60000 }) };
  var m = makeLive(store, null, {});
  await m.live.load(false);
  t("fetched < 1 hour ago → the hourly guard holds (0 requests)", m.calls.length === 0, m.calls);
  var big = {};
  store.btc_bgeo_v1 = JSON.stringify({ u: TODAY, at: "x", metrics: V1, eps: {}, lastAttempt: Date.now() - 2 * 3600000 });
  m = makeLive(store, null, big);
  await m.live.load(false);
  var c = cacheOf(store), g = m.live.get();
  t("> 1 hour → the first 10 history requests in order — the free tier's hourly limit", m.calls.join() === ORDER.slice(0, 10).join(), m.calls);
  t("each request asks ~4 years: ?startday=<today − 1461 d>&size=2000", m.urls.every(function (u) { return /\?startday=\d{4}-\d\d-\d\d&size=2000$/.test(u); }) && m.urls[0].indexOf("startday=" + ymd(Date.now() - 1461 * DAY)) > 0, m.urls[0]);
  t("latest value = newest row (RUP 0.52 on " + D1 + ")", g.metrics.rup.value === 0.52 && g.metrics.rup.date === D1 && g.metrics.nupl.value === 0.4, g.metrics.rup);
  t("LTH Supply = profit + loss on shared days (D3, D1) → latest 14.6M on " + D1 + ", 2 chart rows", g.metrics.lthSupply.value === 14.6e6 && g.metrics.lthSupply.date === D1 && g.series.lthSupply.length === 2, g.series.lthSupply);
  t("the 11th request (true-market-mean) is not sent in the same hour → no 429 of our own making: no error, a retry in ~1 hour, Active Investor Price still owed",
    m.calls.indexOf("true-market-mean") < 0 && !g.metrics.activeInvestorPrice && g.error === null && c.err === null && g.retryAt > Date.now() + 50 * 60000 && c.tried.length === 9 && c.tried.indexOf("activeInvestorPrice") < 0,
    { error: g.error, retryAt: g.retryAt, tried: c.tried });
  store.btc_bgeo_v1 = JSON.stringify(Object.assign(cacheOf(store), { lastAttempt: Date.now() - 2 * 3600000 }));   // the hour passes
  m = makeLive(store, null, big);
  await m.live.load(false);
  c = cacheOf(store); g = m.live.get();
  t("an hour later → only true-market-mean (11 requests that day ≤ 15)", m.calls.join() === "true-market-mean", m.calls);
  var forced = makeLive({ btc_bgeo_v1: JSON.stringify({ v: 2, u: TODAY, at: "x", metrics: V1, lastAttempt: Date.now() - 2 * 3600000, tried: KEYS10 }) }, null, {});
  await forced.live.load(true);
  t("…load(true) → 10 requests, the rest next hour", forced.calls.join() === ORDER.slice(0, 10).join(), forced.calls);
  t("the 3 new metrics land: LTH Realized Price 38,000 · LTH-SOPR 2.1 · Active Investor Price 52,200 (" + D1 + ")",
    g.metrics.lthRealizedPrice.value === 38000 && g.metrics.lthSopr.value === 2.1 && g.metrics.activeInvestorPrice.value === 52200 &&
    ["lthRealizedPrice", "lthSopr", "activeInvestorPrice"].every(function (k) { return g.metrics[k].date === D1 && g.series[k].length === 3; }), g.metrics);
  t("series kept in memory for all 10 metrics", KEYS10.every(function (k) { return g.series[k] && g.series[k].length >= 2; }));
  t("history written to BigCache btc_bgeo_hist_v1:<key> — not to localStorage", Object.keys(big).length === 10 && big["btc_bgeo_hist_v1:rup"].rows.length === 3 && big["btc_bgeo_hist_v1:activeInvestorPrice"].rows.length === 3 && store.btc_bgeo_v1.length < 2000, Object.keys(big));
  t("v2 cache: all 10 tried today · nothing owed (no retry pending)", c.v === 2 && c.u === TODAY && c.tried.length === 10 && g.retryAt === null, c);
  m = makeLive(store, null, big);
  store.btc_bgeo_v1 = JSON.stringify(Object.assign(cacheOf(store), { lastAttempt: Date.now() - 2 * 3600000 }));
  await m.live.load(false);
  t("page reload the same day → 0 requests, series come back from IndexedDB", m.calls.length === 0 && m.live.get().series.rup && m.live.get().series.rup.length === 3, m.calls);

  console.log("== loader: the day this ships (today's cache came from the 7-metric version) ==");
  var OLD7 = ["mvrvZScore", "realizedPrice", "nupl", "rup", "sopr", "ssr", "lthSupply"];
  store = { btc_bgeo_v1: JSON.stringify({ v: 2, u: TODAY, at: "x", metrics: Object.assign({}, V1, { lthSupply: { value: 14.4e6, date: D2 } }), lastAttempt: Date.now() - 2 * 3600000, tried: OLD7 }) };
  m = makeLive(store, null, {});
  await m.live.load(false);
  c = cacheOf(store); g = m.live.get();
  t("only the 3 new metrics are requested: lth-realized-price · lth-sopr · true-market-mean (8 + 3 = 11 ≤ 15 today)", m.calls.join() === "lth-realized-price,lth-sopr,true-market-mean", m.calls);
  t("…LTH Supply is not re-requested today (this morning's value stays until tomorrow) · all 10 tried · no retry pending", g.metrics.lthSupply.value === 14.4e6 && c.tried.length === 10 && g.retryAt === null && g.metrics.lthSopr.value === 2.1, { tried: c.tried, retryAt: g.retryAt });

  console.log("== loader: values outside PLAUSIBLE are dropped (wrong unit / wrong field → no value, never a wrong number) ==");
  var ODD = Object.assign({}, BODY, {
    "lth-realized-price": rows("lthRealizedPrice", [37800, 37900, 0.42]),                       // newest row is a ratio, not a price
    "true-market-mean": rows("trueMarketMean", [5.2e9, 5.21e9, 5.22e9]),                        // every row far too big
    "supply-profit-lth": rows("supplyProfitLthBtc", [1.2e15, 1.21e15, 1.22e15]),               // satoshis, not BTC
    "supply-loss-lth": rows("supplyLossLthBtc", [2.5e14, 2.45e14, 2.4e14]),
    "lth-sopr": rows("lthSopr", [0, 1.9, 2.1]),                                                 // 0 is not a SOPR
    "mvrv-zscore": rows("mvrvZscore", [1.1, 1.15, 99])                                          // the old metrics pass the same gate
  });
  store = { btc_bgeo_v1: JSON.stringify({ v: 2, u: D1, at: "x", metrics: V1, lastAttempt: Date.now() - 20 * 3600000, tried: [] }) };
  big = {};
  m = makeLive(store, null, big, ODD);
  await m.live.load(false);
  store.btc_bgeo_v1 = JSON.stringify(Object.assign(cacheOf(store), { lastAttempt: Date.now() - 2 * 3600000 }));   // the hour passes → the 11th request
  m = makeLive(store, null, big, ODD);
  await m.live.load(false);
  t("(the 11th request, true-market-mean, went an hour later)", m.calls.join() === "true-market-mean", m.calls);
  g = m.live.get(); c = cacheOf(store);
  t("LTH Realized Price: the 0.42 row is dropped → latest = 37,900 on " + D2 + ", 2 chart rows", g.metrics.lthRealizedPrice.value === 37900 && g.metrics.lthRealizedPrice.date === D2 && g.series.lthRealizedPrice.length === 2, g.metrics.lthRealizedPrice);
  t("Active Investor Price all out of range → no value, no series, nothing saved (Data Unavailable)", !g.metrics.activeInvestorPrice && !g.series.activeInvestorPrice && !big["btc_bgeo_hist_v1:activeInvestorPrice"] && !c.metrics.activeInvestorPrice, g.metrics.activeInvestorPrice);
  t("LTH Supply in satoshis → no value, no series", !g.metrics.lthSupply && !g.series.lthSupply, g.metrics.lthSupply);
  t("LTH-SOPR 0 dropped → 2 rows · MVRV-Z 99 dropped → latest 1.15 on " + D2, same(g.series.lthSopr, [[D2, 1.9], [D1, 2.1]]) && g.metrics.mvrvZScore.value === 1.15 && g.metrics.mvrvZScore.date === D2, { sopr: g.series.lthSopr, z: g.metrics.mvrvZScore });
  t("…an answer with no plausible row still counts as tried (not re-requested today)", c.tried.length === 10, c.tried);
  store = { btc_bgeo_v1: JSON.stringify({ v: 2, u: TODAY, at: "x", metrics: Object.assign({}, V1, { lthSupply: { value: 1.46e15, date: D2 }, ssr: { value: -3, date: D2 } }), lastAttempt: Date.now() - 2 * 3600000, tried: KEYS10 }) };
  big = { "btc_bgeo_hist_v1:lthSopr": { at: "x", rows: [[D3, 0], [D2, 1.9], [D1, 250]] } };
  m = makeLive(store, null, big);
  await m.live.load(false);
  g = m.live.get();
  t("values cached before the gate pass it too: LTH Supply 1.46e15 and SSR −3 gone, the rest kept · 0 requests", m.calls.length === 0 && !g.metrics.lthSupply && !g.metrics.ssr && g.metrics.nupl.value === 0.39 && g.metrics.mvrvZScore.value === 1, g.metrics);
  t("…and so do series restored from IndexedDB (LTH-SOPR 0 and 250 dropped → 1 row)", same(g.series.lthSopr, [[D2, 1.9]]), g.series.lthSopr);

  console.log("== loader: a rate limit mid-loop ==");
  store = { btc_bgeo_v1: JSON.stringify({ v: 2, u: D1, at: "x", metrics: V1, lastAttempt: Date.now() - 20 * 3600000, tried: [] }) };
  m = makeLive(store, { "nup": 429 }, {});
  await m.live.load(false);
  c = cacheOf(store);
  t("429 at nup stops the loop there", m.calls.join() === "mvrv-zscore,realized-price,nupl,nup", m.calls);
  t("3 answered metrics tried; the other 7 (rup onwards) pending", c.tried.join() === "mvrvZScore,realizedPrice,nupl", c.tried);
  m = makeLive(store, null, {});
  await m.live.load(false);
  t("within the hour → 0 requests", m.calls.length === 0, m.calls);
  store.btc_bgeo_v1 = JSON.stringify(Object.assign(cacheOf(store), { lastAttempt: Date.now() - 2 * 3600000 }));
  m = makeLive(store, null, {});
  await m.live.load(false);
  t("an hour later → only the pending ones (8 requests ≤ 10)", m.calls.join() === "nup,sopr,ssr,supply-profit-lth,supply-loss-lth,lth-realized-price,lth-sopr,true-market-mean", m.calls);
  t("…and RUP arrives", m.live.get().metrics.rup && m.live.get().metrics.rup.value === 0.52);

  console.log("== loader: the direct path is cut → our own server gives what is still owed (2026-11-27) ==");
  function srvOf(key, rows) { var last = rows[rows.length - 1]; return { ok: true, key: key, value: last[1], date: last[0], series: rows }; }
  var SRV = {
    rup: srvOf("rup", [[D3, 0.5], [D2, 0.51], [D1, 0.53]]), sopr: srvOf("sopr", [[D2, 1.0], [D1, 1.02]]), ssr: srvOf("ssr", [[D2, 9.5], [D1, 9.4]]),
    lthSupply: srvOf("lthSupply", [[D2, 14.5e6], [D1, 14.6e6]]), lthRealizedPrice: srvOf("lthRealizedPrice", [[D2, 37900], [D1, 38100]]),
    lthSopr: srvOf("lthSopr", [[D2, 1.9], [D1, 2.2]]), activeInvestorPrice: srvOf("activeInvestorPrice", [[D2, 52100], [D1, 52300]])
  };
  store = { btc_bgeo_v1: JSON.stringify({ v: 2, u: D1, at: "x", metrics: V1, lastAttempt: Date.now() - 20 * 3600000, tried: [] }) };
  big = {};
  m = makeLive(store, { "nup": 429 }, big, null, SRV);
  await m.live.load(false);
  c = cacheOf(store); g = m.live.get();
  t("429 at nup → BGeometrics asked 4 times (stops there), then our server for the 7 still owed (rup onwards)",
    m.calls.join() === "mvrv-zscore,realized-price,nupl,nup" && m.server.join() === "rup,sopr,ssr,lthSupply,lthRealizedPrice,lthSopr,activeInvestorPrice", { calls: m.calls, server: m.server });
  t("…their values + series land (RUP 0.53 · LTH-SOPR 2.2 · Active Investor 52,300 on " + D1 + ") and go to IndexedDB",
    g.metrics.rup.value === 0.53 && g.metrics.lthSopr.value === 2.2 && g.metrics.activeInvestorPrice.value === 52300 && g.series.lthSopr.length === 2 && !!big["btc_bgeo_hist_v1:activeInvestorPrice"], g.metrics);
  t("…nothing owed any more → no quota message, no retry, all 10 tried, the source reads 'via our server'",
    g.error === null && c.err === null && g.retryAt === null && c.tried.length === 10 && g.via === "server", { error: g.error, retryAt: g.retryAt, tried: c.tried, via: g.via });
  var half = { rup: SRV.rup, sopr: SRV.sopr };
  store = { btc_bgeo_v1: JSON.stringify({ v: 2, u: D1, at: "x", metrics: V1, lastAttempt: Date.now() - 20 * 3600000, tried: [] }) };
  m = makeLive(store, { "nup": 429 }, {}, null, half);
  await m.live.load(false);
  c = cacheOf(store); g = m.live.get();
  t("server has only some → those land, the rest stay owed: the quota message stays and a retry is set",
    g.metrics.rup.value === 0.53 && g.error === "rate-limited" && g.retryAt > Date.now() && c.tried.indexOf("rup") >= 0 && c.tried.indexOf("ssr") < 0, { error: g.error, tried: c.tried });
  var odd = { rup: srvOf("rup", [[D2, 7], [D1, -1]]), sopr: srvOf("sopr", [["x", 1], [D1, "1.01"]]) };
  store = { btc_bgeo_v1: JSON.stringify({ v: 2, u: D1, at: "x", metrics: V1, lastAttempt: Date.now() - 20 * 3600000, tried: [] }) };
  m = makeLive(store, { "nup": 429 }, {}, null, odd);
  await m.live.load(false);
  g = m.live.get();
  t("server rows pass the same PLAUSIBLE gate (RUP 7 / −1 dropped → no value) · junk rows ignored (SOPR keeps yesterday's value, no series)",
    !g.metrics.rup && !g.series.rup && !g.series.sopr && g.metrics.sopr.value === V1.sopr.value && g.metrics.sopr.date === V1.sopr.date, { rup: g.metrics.rup, sopr: g.metrics.sopr });
  store = { btc_bgeo_v1: JSON.stringify({ v: 2, u: D1, at: "x", metrics: V1, lastAttempt: Date.now() - 20 * 3600000, tried: [] }) };
  m = makeLive(store, null, {}, null, SRV);
  await m.live.load(false);
  t("a normal day (BGeometrics answers) → our server is never asked", m.server.length === 0 && m.calls.length === 10, m.server);
  var capped = makeLive({ btc_bgeo_v1: JSON.stringify({ v: 2, u: TODAY, at: "x", metrics: V1, lastAttempt: Date.now() - 2 * 3600000, tried: KEYS10 }) }, null, {}, null, SRV);
  await capped.live.load(true);
  t("the 10-a-run cap is not a cut — the 11th waits for the next hour, our server is not asked", capped.server.length === 0 && capped.calls.length === 10, capped.server);

  console.log("== loader: quota used up → say so, and try again by itself ==");
  store = { btc_bgeo_v1: JSON.stringify({ u: D1, at: "x", metrics: V1, eps: {}, lastAttempt: Date.now() - 5 * 3600000 }) };
  var timers = [];
  m = makeLive(store, { "mvrv-zscore": 429 }, {});
  m.live.__ctx = null;
  // give this loader a setTimeout that records instead of waiting
  var ctx2 = { console: console, JSON: JSON, Promise: Promise, Date: Date, Object: Object, Array: Array,
    localStorage: { getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; }, setItem: function (k, v) { store[k] = String(v); } },
    CustomEvent: function (n) { this.type = n; }, dispatchEvent: function () {},
    setTimeout: function (fn, ms) { timers.push(ms); return timers.length; },
    fetch: function (url) { m.calls.push(String(url).split("/v1/")[1].split("?")[0]); return Promise.resolve({ status: 429, ok: false, json: function () { return Promise.resolve({}); } }); } };
  ctx2.window = ctx2; vm.createContext(ctx2); vm.runInContext(SRC_LIVE, ctx2, { filename: "btc-onchain-live.js" });
  var before = Date.now();
  await ctx2.BtcOnchainLive.load(false);
  g = ctx2.BtcOnchainLive.get(); c = cacheOf(store);
  t("429 on the first request → stops after ONE request (quota not burned further)", m.calls.join() === "mvrv-zscore", m.calls);
  t("error rate-limited kept in the cache (survives a reload) · yesterday's values stay", g.error === "rate-limited" && c.err === "rate-limited" && c.u === D1 && c.metrics.nupl.value === 0.39, c);
  t("retryAt = this attempt + 1 hour, and ONE timer for it (+ a 0–90 s spread so open tabs do not fire together)", g.retryAt >= before + 3600000 && g.retryAt <= Date.now() + 3600000 && timers.length === 1 && timers[0] >= 3600000 && timers[0] <= 3696000, { retryAt: g.retryAt, timers: timers });
  var ctx3 = { console: console, JSON: JSON, Promise: Promise, Date: Date, Object: Object, Array: Array,
    localStorage: ctx2.localStorage, CustomEvent: ctx2.CustomEvent, dispatchEvent: function () {},
    setTimeout: function (fn, ms) { timers.push(ms); return 9; }, fetch: function () { throw new Error("must not fetch inside the hour"); } };
  ctx3.window = ctx3; vm.createContext(ctx3); vm.runInContext(SRC_LIVE, ctx3, { filename: "btc-onchain-live.js" });
  await ctx3.BtcOnchainLive.load(false);
  g = ctx3.BtcOnchainLive.get();
  t("another tab tried < 3 min ago → no request, says rate-limited, looks again in 2 minutes (to pick up that tab's result)", g.error === "rate-limited" && Math.abs(g.retryAt - (c.lastAttempt + 3600000)) < 5 && timers.length === 2 && timers[1] === 120000, { g: g, timers: timers });
  store.btc_bgeo_v1 = JSON.stringify(Object.assign(cacheOf(store), { lastAttempt: Date.now() - 30 * 60000 }));
  var ctx4 = { console: console, JSON: JSON, Promise: Promise, Date: Date, Object: Object, Array: Array, Math: Math,
    localStorage: ctx2.localStorage, CustomEvent: ctx2.CustomEvent, dispatchEvent: function () {},
    setTimeout: function (fn, ms) { timers.push(ms); return 9; }, fetch: function () { throw new Error("must not fetch inside the hour"); } };
  ctx4.window = ctx4; vm.createContext(ctx4); vm.runInContext(SRC_LIVE, ctx4, { filename: "btc-onchain-live.js" });
  await ctx4.BtcOnchainLive.load(false);
  t("tried 30 min ago → no request, timer ≈ 30 min (+ spread)", timers.length === 3 && timers[2] >= 30 * 60000 && timers[2] <= 30 * 60000 + 100000, timers[2]);
  store = { btc_bgeo_v1: JSON.stringify({ v: 2, u: D1, at: "x", metrics: V1, lastAttempt: Date.now() - 20 * 3600000, tried: [], err: "rate-limited" }) };
  m = makeLive(store, null, {});
  await m.live.load(false);
  g = m.live.get(); c = cacheOf(store);
  t("a later successful run clears the error (the 11th request is simply owed for the next hour)", g.error === null && c.err === null && c.tried.length === 9 && g.retryAt > Date.now(), { g: { error: g.error, retryAt: g.retryAt }, c: c.err });
  store.btc_bgeo_v1 = JSON.stringify(Object.assign(cacheOf(store), { lastAttempt: Date.now() - 2 * 3600000 }));
  m = makeLive(store, null, {});
  await m.live.load(false);
  g = m.live.get(); c = cacheOf(store);
  t("…and once it is in, the retry time clears too", g.error === null && g.retryAt === null && c.err === null && c.tried.length === 10 && m.calls.join() === "true-market-mean", { g: { error: g.error, retryAt: g.retryAt }, calls: m.calls });

  console.log("== loader: in a browser the 429 has no CORS header → fetch throws → stop at once ==");
  store = { btc_bgeo_v1: JSON.stringify({ u: D1, at: "x", metrics: V1, eps: {}, lastAttempt: Date.now() - 5 * 3600000 }) };
  var thrown = [];
  var ctx5 = { console: console, JSON: JSON, Promise: Promise, Date: Date, Object: Object, Array: Array, Math: Math,
    localStorage: { getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; }, setItem: function (k, v) { store[k] = String(v); } },
    CustomEvent: function (n) { this.type = n; }, dispatchEvent: function () {},
    fetch: function (url) { if (String(url).indexOf("/api/") === 0) { thrown.push("server"); return Promise.reject(new TypeError("Failed to fetch")); } thrown.push(String(url).split("/v1/")[1].split("?")[0]); return Promise.reject(new TypeError("Failed to fetch")); } };
  ctx5.window = ctx5; vm.createContext(ctx5); vm.runInContext(SRC_LIVE, ctx5, { filename: "btc-onchain-live.js" });
  await ctx5.BtcOnchainLive.load(false);
  c = cacheOf(store);
  t("a thrown fetch (CORS-less 429 / offline) → ONE request to BGeometrics, not 10 (seen live 2026-11-23) · then our server is asked", thrown.filter(function (x) { return x !== "server"; }).join() === "mvrv-zscore" && thrown.indexOf("server") > 0, thrown);
  t("…error \"blocked\" kept for the page, retry in an hour, yesterday's values stay", ctx5.BtcOnchainLive.get().error === "blocked" && c.err === "blocked" && ctx5.BtcOnchainLive.get().retryAt > Date.now() + 3500000 && c.metrics.nupl.value === 0.39, c);

  console.log("== loader: a metric answers 404 ==");
  store = { btc_bgeo_v1: JSON.stringify({ v: 2, u: TODAY, at: "x", metrics: V1, lastAttempt: Date.now() - 2 * 3600000, tried: KEYS10.filter(function (k) { return k !== "rup"; }) }) };
  m = makeLive(store, { "nup": 404 }, {});
  await m.live.load(false);
  c = cacheOf(store);
  t("one request; rup marked tried; today's values untouched", m.calls.join() === "nup" && c.tried.indexOf("rup") >= 0 && c.metrics.nupl.value === 0.39, { calls: m.calls, c: c });
  store.btc_bgeo_v1 = JSON.stringify(Object.assign(cacheOf(store), { lastAttempt: Date.now() - 2 * 3600000 }));
  m = makeLive(store, { "nup": 404 }, {});
  await m.live.load(false);
  t("not retried the same day", m.calls.length === 0, m.calls);
}

// ------------------------------------------------------------------ page (bitcoin-monitor-page.js)
var SRC_BM = read("bitcoin-monitor-page.js");
function runMonitor(bgeoVals, series, pageStore, liveExtra) {
  var root = { innerHTML: "", querySelector: function () { return null; }, querySelectorAll: function () { return []; } };
  var store = pageStore || {};
  var api = { mvrvRatio: 1.5, puellMultiple: 1.0, fearGreed: 50, fundingRate: 0.005 };
  var metrics = {};
  Object.keys(api).forEach(function (k) { metrics[k] = { value: api[k], source: "Synthetic", freshness: "D1", date: D1 }; });
  store.btc_monitor_api_v1 = JSON.stringify({ metrics: metrics, fetchedAt: new Date().toISOString(), providers: {} });
  var bgeo = {};
  Object.keys(bgeoVals).forEach(function (k) { bgeo[k] = { value: bgeoVals[k], date: D1 }; });
  var tech = { latestClose: 70000, ema12: 69000, ema26: 70500, sma200: 72000, rsi14: 50, volumeRatio: 1, latestDate: TODAY };
  var closes = [], dates = [];
  for (var i = 0; i < 260; i++) { closes.push(tech.latestClose * (0.8 + 0.2 * i / 259)); dates.push(ymd(Date.now() - (259 - i) * DAY)); }
  var snap = { loadedAt: new Date().toISOString(), technicalSignals: { BTCUSD: tech }, historicalData: { BTCUSD: { closes: closes, dates: dates } } };
  var ctx = {
    console: console,
    document: { readyState: "complete", getElementById: function (id) { return id === "btcRoot" ? root : null; }, addEventListener: function () {}, documentElement: { classList: { add: function () {}, remove: function () {} } } },
    localStorage: { getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; }, setItem: function (k, v) { store[k] = String(v); } },
    fetch: function () { return new Promise(function () {}); },
    addEventListener: function () {},
    PortfolioDataSnapshot: { read: function () { return snap; } },
    BtcOnchainLive: { get: function () { return Object.assign({ metrics: bgeo, series: series || {} }, liveExtra || {}); }, load: function () {} }
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(SRC_BM, ctx, { filename: "bitcoin-monitor-page.js" });
  return root.innerHTML;
}
function ddCards(html) { return html.split('<div class="mc-card btc-dd-card').slice(1); }
function cardOf(html, title) { return ddCards(html).filter(function (c) { return c.indexOf('btc-dd-title">' + title + "<") >= 0; })[0] || ""; }
function buyZone(html) { var i = html.indexOf("btc-acc-"); return i < 0 ? "" : html.slice(html.lastIndexOf("<section", i), html.indexOf("</section>", i)); }
var BASE = { mvrvZScore: 3, nupl: 0.3, realizedPrice: 50000, sopr: 1.02, ssr: 15, lthSupply: 14e6 };
// 4 years of daily history (a wave), newest = yesterday
function hist(fn) { var out = []; for (var i = 1460; i >= 1; i--) out.push([ymd(Date.now() - i * DAY), fn(i)]); return out; }
var SERIES = {
  rup: hist(function (i) { return 0.48 + 0.1 * Math.sin(i / 120); }),      // 0.38–0.58: gray + amber only
  nupl: hist(function (i) { return 0.2 + 0.3 * Math.sin(i / 120); }),
  mvrvZScore: hist(function (i) { return 1.5 + 1.5 * Math.sin(i / 120); }),
  realizedPrice: hist(function (i) { return 50000 - i * 10; }),
  sopr: hist(function (i) { return 1 + 0.02 * Math.sin(i / 9); }),
  ssr: hist(function (i) { return 12 + 3 * Math.sin(i / 50); }),
  lthSupply: hist(function (i) { return 14e6 + i * 100; }),
  lthSopr: hist(function (i) { return 1.8 + 0.6 * Math.sin(i / 30); })
};
// Puell Multiple's history comes from Blockchain.com (BtcLtHistory, not stubbed here) — covered by btc-lt-integration-test.js
function bgeoCards(html) { return ddCards(html).filter(function (c) { return c.indexOf('btc-dd-title">Puell Multiple<') < 0; }); }

function pageTests() {
  console.log("== page: the RUP card (no history yet → gauge) ==");
  // zones calibrated on BGeometrics' 4-year series: < 0.35 · < 0.5 · < 0.6 · ≥ 0.6
  var CASES = [[0.25, "กำไรบาง", "gc-calm"], [0.349, "กำไรบาง", "gc-calm"], [0.35, "กำไรปานกลาง", "gc-normal"], [0.49, "กำไรปานกลาง", "gc-normal"],
    [0.5, "กำไรหนา", "gc-warning"], [0.599, "กำไรหนา", "gc-warning"], [0.6, "กำไรล้น", "gc-danger"], [0.75, "กำไรล้น", "gc-danger"]];
  CASES.forEach(function (cs) {
    var card = cardOf(runMonitor(Object.assign({}, BASE, { rup: cs[0] })), "RUP"), cls = card.slice(0, card.indexOf('">'));
    var tag = (/class="btc-dd-tag"[^>]*>([^<]*)</.exec(card) || [])[1];
    t("RUP " + cs[0] + " → " + cs[1] + " · " + cs[2], tag === cs[1] && toneOf(cls) === cs[2] && /\bgc-card\b/.test(cls), { tag: tag, cls: cls });
  });
  var html = runMonitor(Object.assign({}, BASE, { rup: 0.52 }));
  var titles = ddCards(html).map(function (c) { return (/btc-dd-title">([^<]*)</.exec(c) || [])[1]; });
  t("9 Deep Dive cards; RUP sits right after NUPL; LTH-SOPR + Puell Multiple close the list",
    titles.join("|") === ["MVRV Z-Score", "Realized Price", "NUPL", "RUP", "SOPR", "SSR", "LTH Supply", "LTH-SOPR", "Puell Multiple"].join("|"), titles);
  var card = cardOf(html, "RUP");
  t("no history → zone gauge + \"กราฟย้อนหลังจะขึ้น…\" note, no chart", /btc-dd-gauge/.test(card) && /btc-dd-nohist/.test(card) && !/btc-dd-chart/.test(card));
  t("วันนี้ visible; คืออะไร · อ่านยังไง · ข้อจำกัด inside อ่านเพิ่ม", (function () {
    var i = card.indexOf('<details class="btc-dd-more"'), out = card.slice(0, i), inn = card.slice(i);
    return i > 0 && out.indexOf("<span>วันนี้</span>") >= 0 && ["คืออะไร", "อ่านยังไง", "ข้อจำกัด"].every(function (w) { return inn.indexOf("<span>" + w + "</span>") >= 0 && out.indexOf("<span>" + w + "</span>") < 0; });
  })());
  t("RUP chart link → Glassnode RUP chart, labelled Glassnode", /href="https:\/\/studio\.glassnode\.com\/charts\/indicators\.UnrealizedProfit\?a=BTC"[^>]*>ดูกราฟย้อนหลังที่ Glassnode ↗</.test(card));
  t("the other cards keep the BGeometrics link label", ddCards(html).filter(function (c) { return /ดูกราฟย้อนหลังเต็มที่ BGeometrics ↗/.test(c); }).length === 6);
  var none = cardOf(runMonitor(BASE), "RUP"), noneCls = none.slice(0, none.indexOf('">'));
  t("no RUP value → \"—\", gc-neutral, btc-ind-empty, no tag", /btc-dd-value">—</.test(none) && toneOf(noneCls) === "gc-neutral" && /btc-ind-empty/.test(noneCls) && !/btc-dd-tag/.test(none), noneCls);
  t("RUP does not move the Buy Zone (0.05 vs 0.95 → identical Buy Zone card)", buyZone(runMonitor(Object.assign({}, BASE, { rup: 0.05 }))) === buyZone(runMonitor(Object.assign({}, BASE, { rup: 0.95 }))) && buyZone(html).length > 200);
  var copy = SRC_BM.slice(SRC_BM.indexOf('key: "rup"'), SRC_BM.indexOf('key: "sopr"'));
  // "Buy Zone Score" is the page's existing feature name, not advice
  t("RUP copy carries no advisory words", copy.length > 200 && !/ควรซื้อ|ควรขาย|น่าซื้อ|น่าขาย|น่าเข้า|แนะนำซื้อ|จุดเข้า|ตัดขาดทุน|\bBuy\b(?! Zone)|\bSell\b/.test(copy));

  console.log("== page: trend charts ==");
  html = runMonitor(Object.assign({}, BASE, { rup: 0.52 }), SERIES);
  card = cardOf(html, "RUP");
  var pts = ((/<path d="([^"]*)"/.exec(card) || [])[1] || "").split(/[ML]/).filter(Boolean).length;
  t("RUP card draws a chart: 1Y default → ~365 points", /class="btc-dd-chart"/.test(card) && pts >= 360 && pts <= 367 && !/btc-dd-gauge/.test(card), pts);
  t("the chart opens the big view: role=button · tabindex=0 · data-dd-open=rup · aria-label names RUP", /class="btc-dd-plot" role="button" tabindex="0" data-dd-open="rup" aria-label="ขยายกราฟ RUP ย้อนหลัง 1 ปี"/.test(card));
  function bands(c) { return (c.match(/<rect [^>]*style="fill:var\(--(mc-emerald|btc-dd-gray, #64748b|mc-amber|mc-red)\)"/g) || []).map(function (r) { return /--(\w+)/.exec(r)[1]; }); }
  // RUP wave 0.38–0.58 → gray + amber only (bands are clipped to the data ± 8%)
  t("zone bands = the tag thresholds clipped to the data (gray · amber)", bands(card).join() === "btc,mc", bands(card));
  // labels use the card's own number format (num → "0.5", like the value "0.52")
  t("y labels: the zone edge inside (0.5) + the data ends", /<i style="top:[\d.]+%">0\.5<\/i>/.test(card) && !/>0\.35<\/i>/.test(card));
  var wide = Object.assign({}, SERIES, { rup: hist(function (i) { return 0.425 + 0.125 * Math.sin(i / 120); }) });   // 0.30–0.55
  var c4 = cardOf(runMonitor(Object.assign({}, BASE, { rup: 0.52 }), wide, { btc_dd_range_v1: "1461" }), "RUP");
  t("4Y over 0.30–0.55: green · gray · amber bands and exactly the edges 0.35 · 0.5 as labels", bands(c4).join() === "mc,btc,mc" && ((/class="btc-dd-yl" aria-hidden="true">([\s\S]*?)<\/div>/.exec(c4) || [])[1] || "").replace(/<i style="top:[\d.]+%">/g, "|").replace(/<\/i>/g, "") === "|0.35|0.5", bands(c4));
  t("4 month labels under the plot", (card.split('class="btc-dd-xl"')[1] || "").split("</div>")[0].match(/<i /g).length === 4);
  t("end dot at the right edge; line keeps its width (non-scaling-stroke)", /class="btc-dd-dot" style="left:100%;top:[\d.]+%"/.test(card) && /<path [^>]*vector-effect="non-scaling-stroke"/.test(card));
  var first = SERIES.rup[SERIES.rup.length - 365] || SERIES.rup[0];
  t("change line: ▲/▼ |last − first| ใน 1 ปี", (function () { var m = /class="btc-dd-delta">([▲▼]) ([^<]*) ใน 1 ปี</.exec(card); return !!m; })());
  t("all 8 BGeometrics cards draw a chart when every series is in", bgeoCards(html).length === 8 && bgeoCards(html).every(function (c) { return /class="btc-dd-chart"/.test(c); }));
  t("Realized Price axis in $k, LTH axis in M", /\$\d+k<\/i>/.test(cardOf(html, "Realized Price")) && /\d+\.\d\dM<\/i>/.test(cardOf(html, "LTH Supply")));
  t("range buttons 6M · 1Y · 2Y · 4Y in the section head, 1Y pressed", /id="btcDdRange"/.test(html) && /data-dd-range="365" aria-pressed="true" class="is-on">1Y/.test(html) && ["182", "730", "1461"].every(function (d) { return html.indexOf('data-dd-range="' + d + '" aria-pressed="false"') >= 0; }));
  var html6 = runMonitor(Object.assign({}, BASE, { rup: 0.52 }), SERIES, { btc_dd_range_v1: "182" });
  var c6 = cardOf(html6, "RUP"), p6 = ((/<path d="([^"]*)"/.exec(c6) || [])[1] || "").split(/[ML]/).filter(Boolean).length;
  t("remembered range 6M → ~182 points + \"ใน 6 เดือน\" + 6M pressed", p6 >= 180 && p6 <= 184 && /ใน 6 เดือน</.test(c6) && /data-dd-range="182" aria-pressed="true"/.test(html6), p6);
  var htmlBad = runMonitor(Object.assign({}, BASE, { rup: 0.52 }), SERIES, { btc_dd_range_v1: "999" });
  t("an unknown remembered range falls back to 1Y", /data-dd-range="365" aria-pressed="true"/.test(htmlBad));
  t("a 1-row series is not a trend → gauge", /btc-dd-gauge/.test(cardOf(runMonitor(Object.assign({}, BASE, { rup: 0.52 }), { rup: [[D1, 0.52]] }), "RUP")));
  t("tones unchanged by the chart (RUP 0.52 → กำไรหนา · gc-warning)", toneOf(card.slice(0, card.indexOf('">'))) === "gc-warning");
  console.log("== page: status line when history is missing ==");
  var at = new Date(2026, 10, 23, 11, 22).getTime();
  var hRl = runMonitor(Object.assign({}, BASE, { rup: 0.52 }), {}, null, { error: "rate-limited", retryAt: at });
  t("quota used up → one status line: limits named + the retry time + no action needed", /<p class="btc-dd-status" role="status">ยังดึงกราฟย้อนหลังได้ไม่ครบ — BGeometrics ให้ใช้ฟรีชั่วโมงละ 10 ครั้ง วันละ 15 ครั้ง และตอนนี้ครบโควตาแล้ว · หน้านี้จะลองใหม่เองเวลา 11:22 น\. ไม่ต้องกดอะไร<\/p>/.test(hRl), (/btc-dd-status[^<]*<\/p>|btc-dd-status[^]*?<\/p>/.exec(hRl) || [""])[0].slice(0, 300));
  t("blocked (browser-side 429 without CORS) → says it is most likely the free quota", /BGeometrics ไม่ตอบ ส่วนใหญ่เป็นเพราะโควตาฟรี \(ชั่วโมงละ 10 ครั้ง วันละ 15 ครั้ง\) หมด หรือเน็ตหลุด · หน้านี้จะลองใหม่เองเวลา 11:22 น\./.test(runMonitor(BASE, {}, null, { error: "blocked", retryAt: at })));
  t("unreachable → its own wording", /ติดต่อ BGeometrics ไม่สำเร็จ · หน้านี้จะลองใหม่เองเวลา 11:22 น\./.test(runMonitor(BASE, {}, null, { error: "unreachable", retryAt: at })));
  t("loading → \"กำลังดึงข้อมูลย้อนหลัง…\"", /กำลังดึงข้อมูลย้อนหลังจาก BGeometrics…/.test(runMonitor(BASE, {}, null, { loading: true })));
  t("all 8 BGeometrics charts in → no status line (Puell's history is not BGeometrics')",!/btc-dd-status/.test(runMonitor(Object.assign({}, BASE, { rup: 0.52 }), SERIES, null, { error: "rate-limited", retryAt: at })));
  t("Deep Dive section carries id btcDeepDive + the hint to click the chart", /<section class="mc-card mc-panel mc-fade gc-card gc-neutral" id="btcDeepDive">/.test(html) && /กดที่กราฟเพื่อขยาย/.test(html));

  console.log("== page: HTML / CSS ==");
  var HTML = read("bitcoin-monitor.html"), CSS = read("bitcoin-monitor.css");
  t("bitcoin-monitor.html loads big-cache.js and btc-onchain-live.js before bitcoin-monitor-page.js", HTML.indexOf("/big-cache.js?v=") > 0 && HTML.indexOf("/big-cache.js?v=") < HTML.indexOf("/btc-onchain-live.js?v=") && HTML.indexOf("/btc-onchain-live.js?v=") < HTML.indexOf("/bitcoin-monitor-page.js?v="));
  t("big chart: fixed overlay, hidden attribute honoured, body scroll locked while open", /\.btc-dd-modal \{ position: fixed; inset: 0;/.test(CSS) && /\.btc-dd-modal\[hidden\] \{ display: none; \}/.test(CSS) && /html\.btc-dd-lock \{ overflow: hidden; \}/.test(CSS));
  t("the big chart (on <body>) gets the glass token map", /#btcRoot \.gc-card,\s*\.btc-dd-modal \.gc-card \{/.test(CSS));
  t("hover marks hide with [hidden] even though they are absolutely positioned", /\.btc-dd-cross\[hidden\], \.btc-dd-tip\[hidden\] \{ display: none; \}/.test(CSS));
  t("focus rings for the chart, range, tabs and close button", /\.btc-dd-plot:focus-visible/.test(CSS) && /\.btc-dd-close:focus-visible/.test(CSS));
  console.log("== big chart: BTC price overlay (verified in Chrome by the probe; here the wiring) ==");
  t("price comes from the Intelligence tab's IndexedDB history when it covers 4 years up to ~a week ago, else our /api/ohlc — never BGeometrics", /bc\.get\("btc_intelligence_history_v1"\)/.test(SRC_BM) && /o\.d\[0\] <= need && o\.d\[o\.d\.length - 1\] >= fresh/.test(SRC_BM) && /\/api\/ohlc\?symbol=BTC-USD&start=\$\{need\}/.test(SRC_BM) && !/bitcoin-data\.com[^"\n]*price/.test(SRC_BM));
  t("price loads lazily — only when the big chart opens with the price line on", /if \(ddShowPrice\) ddPriceLoad\(\);\s*el\.innerHTML = ddModalHtml\(\)/.test(SRC_BM) && SRC_BM.indexOf("ddPriceLoad()") > 0 && !/function init\(\) \{[^}]*ddPriceLoad/.test(SRC_BM));
  t("a missing candle is bridged by up to 3 days back (no broken line)", /for \(let k = 0; k < 4; k\+\+, t -= 86400000\)/.test(SRC_BM));
  t("Realized Price shares the $ axis with the price; other metrics get a right axis", /priceSameAxis: true/.test(SRC_BM) && /has-right/.test(SRC_BM) && /btc-dd-yr/.test(SRC_BM));
  t("price line drawn under the metric line, orange, non-scaling stroke", /class="btc-dd-price" d="\$\{pd\}" fill="none" stroke="#f7931a"[^>]*vector-effect="non-scaling-stroke"/.test(SRC_BM) && SRC_BM.indexOf('class="btc-dd-price"') < SRC_BM.indexOf('stroke="#fff" stroke-width="${big ? 2 : 1.6}"'));
  t("hover in the big chart shows the BTC close of that day", /" · BTC " \+ ddUsd\(pv\[i\]\)/.test(SRC_BM));
  t("price toggle: aria-pressed, remembered per viewer (btc_dd_price_on_v1), focus kept on it", /data-dd-price aria-pressed="\$\{ddShowPrice\}"/.test(SRC_BM) && /DD_PRICE_ON_KEY = "btc_dd_price_on_v1"/.test(SRC_BM) && /hasAttribute\("data-dd-price"\) \? "\[data-dd-price\]"/.test(SRC_BM));
  t("legend + right axis + dark plot well styled", /\.btc-dd-legend \{/.test(CSS) && /\.btc-dd-chart\.is-big\.has-right \{ grid-template-columns: 60px minmax\(0, 1fr\) 54px; \}/.test(CSS) && /\.btc-dd-modal \.btc-dd-plot \{ cursor: crosshair; background: rgba\(5, 8, 20, 0\.45\); \}/.test(CSS));
  t("page code: Escape closes, Tab stays inside the dialog, focus returns to the chart", /e\.key === "Escape"/.test(SRC_BM) && /e\.key === "Tab"/.test(SRC_BM) && /again\.focus\(\)/.test(SRC_BM) && /aria-modal="true"/.test(SRC_BM));
}

// a load() that never settles would let Node exit 0 with the summary unprinted — count that as a failure
var finished = false;
process.on("exit", function (code) {
  if (!finished && code === 0) { console.log("  FAIL  the test chain never finished (a promise hung)"); process.exitCode = 1; }
});
loaderTests().then(function () {
  pageTests();
  finished = true;
  console.log("\n" + (pass + fail) + " checks · " + pass + " passed · " + fail + " failed");
  if (fail) process.exit(1);
}, function (e) { finished = true; console.log("  FAIL  loader tests threw — " + (e && e.stack)); process.exit(1); });
