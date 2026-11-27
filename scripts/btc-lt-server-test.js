// Bitcoin Monitor · long-term data through OUR server (2026-11-27)
//   node scripts/btc-lt-server-test.js
// Why: some networks reset every connection to crypto sites (Coin Metrics · Blockchain.com · CoinGecko · Binance),
// so the browser cannot pull them — but it can always reach our own domain. api/bitcoin.js (the one Bitcoin function;
// the project is at Vercel Hobby's 12-function limit) gets two extra modes:
//   ?lt=history        → Coin Metrics + Blockchain.com pulled server-side, derived with the SAME functions as the browser
//                        (public/btc-lt-history.js) · CDN-cached 6 h, stale up to 7 days · one source down = short cache ·
//                        both down = 502 no-store
//   ?lt=bgeo&m=<key>   → one BGeometrics metric (public/btc-onchain-live.js METRICS · parse · PLAUSIBLE) · CDN-cached 1 day ·
//                        only on Vercel (the local dev server would spend the user's own IP quota) · 429 = 503 no-store
// All upstream responses below are SYNTHETIC test data; no network.
"use strict";
var path = require("path");
var ROOT = path.join(__dirname, "..");
var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; console.log("  PASS  " + name); }
  else { fail++; console.log("  FAIL  " + name + (extra != null ? " — " + (typeof extra === "string" ? extra : JSON.stringify(extra)).slice(0, 400) : "")); }
}
var DAY = 86400000;
function ymd(ms) { return new Date(ms).toISOString().slice(0, 10); }
var H = require(path.join(ROOT, "public/btc-lt-history.js"));
var L = require(path.join(ROOT, "public/btc-onchain-live.js"));

// ---- SYNTHETIC upstream bodies
var N = 800, START = Date.now() - N * DAY;
var CM = { data: [] }, REV = { values: [] }, FEE = { values: [] };
for (var i = 0; i < N; i++) {
  var ms = START + i * DAY, px = 20000 + 30 * i + 4000 * Math.sin(i / 50), mvrv = 1.4 + 0.6 * Math.sin(i / 70);
  CM.data.push({ asset: "btc", time: ymd(ms) + "T00:00:00.000000000Z", CapMVRVCur: String(mvrv), CapMrktCurUSD: String(px * 19e6), PriceUSD: String(px) });
  REV.values.push({ x: Math.floor(ms / 1000), y: 3e7 + 5e6 * Math.sin(i / 40) });
  FEE.values.push({ x: Math.floor(ms / 1000), y: 2e5 + 1e5 * Math.sin(i / 9) });
}
var REV_URL = H.BC_URL(H.CHARTS.revenue), FEE_URL = H.BC_URL(H.CHARTS.fees);
function bgeoRows(field, vals) { return vals.map(function (v, k) { var r = { d: ymd(Date.now() - (vals.length - k + 6) * DAY), unixTs: k }; r[field] = v; return r; }); }

// ---- a fetch stub: url → { status, body } · records every call
var routes = {}, calls = [];
global.fetch = function (url) {
  url = String(url); calls.push(url);
  var r = Object.prototype.hasOwnProperty.call(routes, url) ? routes[url] : null;
  if (!r) { var u = url.split("?")[0]; r = Object.prototype.hasOwnProperty.call(routes, u) ? routes[u] : { status: 404, body: { error: "not routed" } }; }
  if (r.throws) return Promise.reject(new TypeError(r.throws));
  return Promise.resolve({ ok: r.status === 200, status: r.status, json: function () { return Promise.resolve(JSON.parse(JSON.stringify(r.body))); }, text: function () { return Promise.resolve(JSON.stringify(r.body)); } });
};
function reset(map) { routes = map || {}; calls = []; }
var handler = require(path.join(ROOT, "api/bitcoin.js"));
function call(url) {
  return new Promise(function (resolve) {
    var res = { statusCode: 200, headers: {}, setHeader: function (k, v) { this.headers[String(k).toLowerCase()] = v; },
      end: function (b) { var body = null; try { body = JSON.parse(b); } catch (e) { body = b; } resolve({ status: this.statusCode, headers: this.headers, body: body }); } };
    Promise.resolve(handler({ url: url, method: "GET", headers: {} }, res)).catch(function (e) { resolve({ status: "threw", body: String(e && e.stack || e) }); });
  });
}
function sig6(v) { return Number(v.toPrecision(6)); }
function sameSeries(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  for (var k = 0; k < a.length; k++) if (a[k][0] !== b[k][0] || Math.abs(a[k][1] - sig6(b[k][1])) > Math.abs(b[k][1]) * 1e-9 + 1e-12) return false;
  return true;
}

(async function main() {
  console.log("== ?lt=history: Coin Metrics + Blockchain.com through our server ==");
  var ok = {}; ok[H.CM_URL] = { status: 200, body: CM }; ok[REV_URL] = { status: 200, body: REV }; ok[FEE_URL] = { status: 200, body: FEE };
  reset(ok);
  var r = await call("/api/bitcoin?lt=history");
  var cmLocal = H.deriveCm(H.parseCoinMetrics(CM)), puLocal = H.puell(H.parseBlockchain(REV), H.parseBlockchain(FEE));
  t("200 · CDN-cached 6 h, served stale up to 7 days while it refreshes", r.status === 200 && /s-maxage=21600/.test(r.headers["cache-control"] || "") && /stale-while-revalidate=604800/.test(r.headers["cache-control"] || ""), r.headers);
  t("exactly the browser's 3 requests (Coin Metrics + 2 Blockchain.com charts) — none to BGeometrics, none of the big merged sources", calls.length === 3 && calls.indexOf(H.CM_URL) >= 0 && calls.indexOf(REV_URL) >= 0 && calls.indexOf(FEE_URL) >= 0, calls);
  var b = r.body || {};
  t("Coin Metrics: ok · price · mvrv · realizedPrice · mvrvZ = the browser's own derivation (6 significant digits)",
    b.coinMetrics && b.coinMetrics.ok === true && ["price", "mvrv", "realizedPrice", "mvrvZ"].every(function (k) { return sameSeries(b.coinMetrics.series[k], cmLocal[k]); }),
    b.coinMetrics && { ok: b.coinMetrics.ok, keys: Object.keys(b.coinMetrics.series || {}), n: (b.coinMetrics.series && b.coinMetrics.series.mvrvZ || []).length, want: cmLocal.mvrvZ.length });
  t("Blockchain.com: ok · puell = the browser's own derivation", b.blockchain && b.blockchain.ok === true && sameSeries(b.blockchain.series.puell, puLocal), b.blockchain && (b.blockchain.series && b.blockchain.series.puell || []).length);
  t("asOf = each source's newest day · at = the pull time", b.coinMetrics && b.coinMetrics.asOf === cmLocal.price[cmLocal.price.length - 1][0] && b.blockchain.asOf === puLocal[puLocal.length - 1][0] && typeof b.at === "string");

  var cmDown = Object.assign({}, ok); cmDown[H.CM_URL] = { status: 503, body: {} };
  reset(cmDown);
  r = await call("/api/bitcoin?lt=history");
  t("Coin Metrics down → its part says so, Blockchain.com still served · short cache (15 min) so it heals soon",
    r.status === 200 && r.body.coinMetrics.ok === false && /503/.test(r.body.coinMetrics.error) && !r.body.coinMetrics.series && r.body.blockchain.ok === true && /s-maxage=900\b/.test(r.headers["cache-control"] || ""), { status: r.status, cm: r.body.coinMetrics, cc: r.headers["cache-control"] });
  reset({});
  r = await call("/api/bitcoin?lt=history");
  t("both down → 502, never cached (the CDN keeps serving the last good copy)", r.status === 502 && /no-store/.test(r.headers["cache-control"] || ""), { status: r.status, cc: r.headers["cache-control"] });
  var paged = Object.assign({}, ok), half = Math.floor(N / 2), NEXT = "https://community-api.coinmetrics.io/v4/timeseries/asset-metrics?page2=SIMULATED";
  paged[H.CM_URL] = { status: 200, body: { data: CM.data.slice(0, half), next_page_url: NEXT } };
  paged[NEXT] = { status: 200, body: { data: CM.data.slice(half) } };
  reset(paged);
  r = await call("/api/bitcoin?lt=history");
  t("a second Coin Metrics page is followed (Coin Metrics host only)", r.status === 200 && r.body.coinMetrics.ok === true && sameSeries(r.body.coinMetrics.series.price, cmLocal.price) && calls.indexOf(NEXT) >= 0);
  var foreign = Object.assign({}, ok);
  foreign[H.CM_URL] = { status: 200, body: { data: CM.data.slice(0, half), next_page_url: "https://evil.example/steal" } };
  reset(foreign);
  r = await call("/api/bitcoin?lt=history");
  t("a next page on another host is not followed → Coin Metrics part fails, nothing fetched from that host", r.body.coinMetrics.ok === false && calls.every(function (u) { return u.indexOf("evil.example") < 0; }), calls);

  console.log("== ?lt=bgeo&m=<key>: one BGeometrics metric through our server ==");
  var EP = "https://bitcoin-data.com/v1/lth-sopr";
  delete process.env.VERCEL;
  var bg = {}; bg[EP] = { status: 200, body: bgeoRows("lthSopr", [1.5, 0, 1.7, 250, 1.9]) };
  reset(bg);
  r = await call("/api/bitcoin?lt=bgeo&m=lthSopr");
  t("not on Vercel (local dev server) → 503 no-store and NO request to BGeometrics (the user's own IP quota stays untouched)",
    r.status === 503 && /no-store/.test(r.headers["cache-control"] || "") && calls.length === 0, { status: r.status, calls: calls });
  process.env.VERCEL = "1";
  reset(bg);
  r = await call("/api/bitcoin?lt=bgeo&m=lthSopr");
  t("on Vercel: one request ?startday=<today − 1461 d>&size=2000 · 200 · cached 1 day, stale up to 7 days",
    calls.length === 1 && calls[0] === EP + "?startday=" + ymd(Date.now() - 1461 * DAY) + "&size=2000" && r.status === 200 &&
    /s-maxage=86400/.test(r.headers["cache-control"] || "") && /stale-while-revalidate=604800/.test(r.headers["cache-control"] || ""), { calls: calls, status: r.status, cc: r.headers["cache-control"] });
  t("rows parsed with the browser's pick + PLAUSIBLE (0 and 250 dropped) · latest = newest kept row",
    r.body.ok === true && r.body.key === "lthSopr" && r.body.series.length === 3 && r.body.value === 1.9 && r.body.series.every(function (x) { return x[1] >= 0.1 && x[1] <= 100; }), r.body);
  var two = {};
  two["https://bitcoin-data.com/v1/supply-profit-lth"] = { status: 200, body: bgeoRows("supplyProfitLthBtc", [12e6, 12.1e6, 12.2e6]) };
  two["https://bitcoin-data.com/v1/supply-loss-lth"] = { status: 200, body: bgeoRows("supplyLossLthBtc", [2.5e6, 2.4e6, 2.3e6]) };
  reset(two);
  r = await call("/api/bitcoin?lt=bgeo&m=lthSupply");
  t("a two-part metric (LTH Supply = profit + loss) → both parts, summed by day", calls.length === 2 && r.body.ok === true && r.body.value === 14.5e6 && r.body.series.length === 3, { calls: calls, body: r.body });
  reset(bg);
  r = await call("/api/bitcoin?lt=bgeo&m=../../etc");
  t("an unknown metric → 400, nothing fetched", r.status === 400 && calls.length === 0);
  var lim = {}; lim[EP] = { status: 429, body: {} };
  reset(lim);
  r = await call("/api/bitcoin?lt=bgeo&m=lthSopr");
  t("BGeometrics says 429 → 503 no-store (never cached)", r.status === 503 && /no-store/.test(r.headers["cache-control"] || "") && /429/.test(JSON.stringify(r.body)), r);
  var bad = {}; bad[EP] = { status: 200, body: bgeoRows("lthSopr", [0, 500]) };
  reset(bad);
  r = await call("/api/bitcoin?lt=bgeo&m=lthSopr");
  t("no plausible row → 502 no-store (never a wrong number, never cached)", r.status === 502 && /no-store/.test(r.headers["cache-control"] || ""), r);
  delete process.env.VERCEL;

  console.log("\n" + (pass + fail) + " checks · " + pass + " passed · " + fail + " failed");
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.log("  FAIL  test threw — " + (e && e.stack || e)); process.exit(1); });
