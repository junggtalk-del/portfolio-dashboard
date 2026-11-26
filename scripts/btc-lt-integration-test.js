// Bitcoin Monitor · Long-term on-chain integration (2026-11-26 · plan docs/superpowers/plans/2026-11-26-btc-lt-onchain.md Task 4)
//   node scripts/btc-lt-integration-test.js
// What must stay true in public/bitcoin-monitor-page.js:
//   · new Deep Dive cards: LTH-SOPR (BGeometrics) and Puell Multiple (computed from Blockchain.com, BtcLtHistory)
//   · LTH Supply says the 30-day net position change
//   · the existing Buy Zone Score and price chart are NOT changed by the new data (they read ind.lthSopr /
//     ind.lthRealizedPrice from Glassnode/CSV — the new values live under separate keys)
//   · the page loads BtcLtHistory once and re-renders on its event
// All values below are SYNTHETIC test data (no network).
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var PUB = path.join(__dirname, "..", "public");
function read(f) { return fs.readFileSync(path.join(PUB, f), "utf8"); }
var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; console.log("  PASS  " + name); }
  else { fail++; console.log("  FAIL  " + name + (extra != null ? " — " + (typeof extra === "string" ? extra : JSON.stringify(extra)) : "")); }
}
var DAY = 86400000;
function ymd(ms) { return new Date(ms).toISOString().slice(0, 10); }
var TODAY = ymd(Date.now()), D1 = ymd(Date.now() - DAY);
function hist(n, fn) { var out = []; for (var i = n; i >= 1; i--) out.push([ymd(Date.now() - i * DAY), fn(i)]); return out; }

var SRC_BM = read("bitcoin-monitor-page.js");
// one Monitor render with synthetic BGeometrics + BtcLtHistory state · returns { html, listeners, loads }
function runMonitor(o) {
  o = o || {};
  var root = { innerHTML: "", querySelector: function () { return null; }, querySelectorAll: function () { return []; } };
  var store = {};
  var api = { mvrvRatio: 1.5, puellMultiple: 1.0, fearGreed: 50, fundingRate: 0.005 };
  var metrics = {};
  Object.keys(api).forEach(function (k) { metrics[k] = { value: api[k], source: "Synthetic", freshness: "D1", date: D1 }; });
  store.btc_monitor_api_v1 = JSON.stringify({ metrics: metrics, fetchedAt: new Date().toISOString(), providers: {} });
  var bgeo = {};
  Object.keys(o.bgeo || {}).forEach(function (k) { bgeo[k] = { value: o.bgeo[k], date: D1 }; });
  var tech = { latestClose: 70000, ema12: 69000, ema26: 70500, sma200: 72000, rsi14: 50, volumeRatio: 1, latestDate: o.latestDate || TODAY };
  var closes = [], dates = [];
  for (var i = 0; i < 260; i++) { closes.push(tech.latestClose * (0.8 + 0.2 * i / 259)); dates.push(ymd(Date.now() - (259 - i) * DAY)); }
  var snap = { loadedAt: new Date().toISOString(), technicalSignals: { BTCUSD: tech }, historicalData: { BTCUSD: { closes: closes, dates: dates } } };
  if (o.cycleState) snap.bitcoinIntelligence = { cycle: { current: { state: o.cycleState, confidence: 60 } } };
  Object.keys(o.store || {}).forEach(function (k) { store[k] = o.store[k]; });
  var listeners = [], loads = [], handlers = {};
  // element stubs so the page's wiring runs (Deep Dive section + the Long-term panel host)
  var els = { btcRoot: root,
    btcDeepDive: { addEventListener: function () {}, querySelectorAll: function () { return []; } },
    btcLtPanel: { id: "btcLtPanel", innerHTML: "", addEventListener: function () {}, querySelectorAll: function () { return []; } } };
  var ctx = {
    console: console,
    document: { readyState: "complete", getElementById: function (id) { return els[id] || null; }, addEventListener: function () {}, documentElement: { classList: { add: function () {}, remove: function () {} } } },
    localStorage: { getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; }, setItem: function (k, v) { store[k] = String(v); } },
    fetch: function () { return new Promise(function () {}); },
    addEventListener: function (type, fn) { listeners.push(type); (handlers[type] = handlers[type] || []).push(fn); },
    PortfolioDataSnapshot: { read: function () { return snap; } },
    BtcOnchainLive: { get: function () { return { metrics: bgeo, series: o.series || {} }; }, load: function () { loads.push("onchain"); } }
  };
  if (o.history !== false) ctx.BtcLtHistory = { get: function () { return o.history || { series: {}, sources: {} }; }, load: function () { loads.push("history"); return Promise.resolve(); } };
  if (o.panel) ctx.BtcLtPanel = o.panel;
  if (o.signal) ctx.BtcLtSignal = o.signal;
  ctx.window = ctx;
  vm.createContext(ctx);
  (o.preload || []).forEach(function (f) { vm.runInContext(read(f), ctx, { filename: f }); });
  var t0 = Date.now();
  vm.runInContext(SRC_BM, ctx, { filename: "bitcoin-monitor-page.js" });
  ctx.__renderMs = Date.now() - t0;
  return { html: root.innerHTML, listeners: listeners, loads: loads, store: store, els: els, root: root, ms: ctx.__renderMs, snap: snap,
    fire: function (type) { (handlers[type] || []).forEach(function (fn) { fn({ type: type }); }); return root.innerHTML; } };
}
function ddCards(html) { return html.split('<div class="mc-card btc-dd-card').slice(1); }
function cardOf(html, title) { return ddCards(html).filter(function (c) { return c.indexOf('btc-dd-title">' + title + "<") >= 0; })[0] || ""; }
function valueOf(card) { return (/class="btc-dd-value">([^<]*)</.exec(card) || [])[1]; }
function tagOf(card) { return (/class="btc-dd-tag"[^>]*>([^<]*)</.exec(card) || [])[1]; }
function buyZone(html) { var i = html.indexOf("btc-acc-"); return i < 0 ? "" : html.slice(html.lastIndexOf("<section", i), html.indexOf("</section>", i)); }
var BASE = { mvrvZScore: 1.2, nupl: 0.3, realizedPrice: 50000, sopr: 1.02, ssr: 15, lthSupply: 14.2e6 };

console.log("== LTH-SOPR card (BGeometrics lth-sopr) ==");
var a = runMonitor({ bgeo: Object.assign({}, BASE, { lthSopr: 0.92 }) });
var lc = cardOf(a.html, "LTH-SOPR");
t("card present · value 0.92 · tag ขายขาดทุน · source BGeometrics", !!lc && valueOf(lc) === "0.92" && tagOf(lc) === "ขายขาดทุน" && /BGeometrics/.test(lc), lc.slice(0, 400));
var lc2 = cardOf(runMonitor({ bgeo: Object.assign({}, BASE, { lthSopr: 4.2 }) }).html, "LTH-SOPR");
t("4.2 → ทำกำไรหนา", tagOf(lc2) === "ทำกำไรหนา", tagOf(lc2));
var lc3 = cardOf(runMonitor({ bgeo: BASE }).html, "LTH-SOPR");
t("no LTH-SOPR value → the card says there is no data (never a fake 0)", !!lc3 && valueOf(lc3) === "—" && /btc-ind-empty/.test(lc3.slice(0, 120)), lc3.slice(0, 300));

console.log("== the existing Buy Zone and price chart do not move ==");
var withHigh = runMonitor({ bgeo: Object.assign({}, BASE, { lthSopr: 9.5, lthRealizedPrice: 30000 }) }).html;
var without = runMonitor({ bgeo: BASE }).html;
t("Buy Zone section identical with and without the new LTH-SOPR 9.5 (> 8 would have cut holder points)", buyZone(withHigh) !== "" && buyZone(withHigh) === buyZone(without));
t("no LTH Realized reference line appears on the price chart from the new data", (withHigh.match(/#10b981/g) || []).length === (without.match(/#10b981/g) || []).length);

console.log("== Puell Multiple card (computed from Blockchain.com · BtcLtHistory) ==");
var puell = hist(800, function (i) { return 0.8 + 0.3 * Math.sin(i / 60); });
puell[puell.length - 1] = [D1, 0.89];
var p = runMonitor({ bgeo: BASE, history: { series: { puell: puell }, sources: { blockchain: { at: new Date().toISOString(), ok: true, asOf: D1 } } } });
var pc = cardOf(p.html, "Puell Multiple");
t("card present · value 0.89 · tag ปกติ · source names Blockchain.com", !!pc && valueOf(pc) === "0.89" && tagOf(pc) === "ปกติ" && /Blockchain\.com/.test(pc), pc.slice(0, 400));
t("trend chart drawn from the multi-cycle series", /btc-dd-chart/.test(pc));
t("the Puell card's limits say the Long-term Signal scores the 7-day mean (the card shows the daily value)", /Long-term Signal ใช้ค่าเฉลี่ย 7 วัน/.test(pc));
var p0 = cardOf(runMonitor({ bgeo: BASE }).html, "Puell Multiple");
t("no history yet → no value, no chart, no fake number", !!p0 && valueOf(p0) === "—" && !/btc-dd-chart/.test(p0));
t("…and its missing-data line points at its own source (Blockchain.com), not BGeometrics", /ยังไม่มีข้อมูลอัตโนมัติ — ดูกราฟที่ Blockchain\.com/.test(p0) && !/ดูกราฟที่ BGeometrics/.test(p0), (p0.match(/ยังไม่มีข้อมูลอัตโนมัติ[^<]*/) || [""])[0]);
var pNoMod = runMonitor({ bgeo: BASE, history: false });
t("page still renders when btc-lt-history.js is not loaded", /btcDeepDive/.test(pNoMod.html) && !!cardOf(pNoMod.html, "Puell Multiple"));

console.log("== LTH Supply: 30-day net position change ==");
var sup = hist(400, function (i) { return 14.0e6 + (400 - i) * 5000; });   // +5,000 BTC a day → +150k in 30 days
var s = runMonitor({ bgeo: BASE, series: { lthSupply: sup }, preload: ["btc-lt-signal.js"] });
var sc = cardOf(s.html, "LTH Supply");
t("today line says the 30-day change in BTC and %, and reads it as accumulation", /30 วัน/.test(sc) && /\+150,000 BTC/.test(sc) && /สะสม/.test(sc), sc.slice(sc.indexOf("วันนี้"), sc.indexOf("วันนี้") + 220));
var down = hist(400, function (i) { return 15.0e6 - (400 - i) * 5000; });
var sd = cardOf(runMonitor({ bgeo: BASE, series: { lthSupply: down } }).html, "LTH Supply");
t("falling supply → the change in BTC and %", /−150,000 BTC/.test(sd) && /\(−1\.\d\d%\)/.test(sd), sd.slice(sd.indexOf("วันนี้"), sd.indexOf("วันนี้") + 220));
// one number, one reading: the card names the 30-day change with the Long-term Signal's own zone words
var SIGNAL = (function () { var c = { console: console }; c.window = c; vm.createContext(c); vm.runInContext(read("btc-lt-signal.js"), c); return c.BtcLtSignal; })();
t("btc-lt-signal.js exports zoneText (the panel's zone words)", typeof SIGNAL.zoneText === "function" && SIGNAL.zoneText("lthNetPct", -0.42) === "ขายออกเล็กน้อย");
[[0.0006, "ทรงตัว"], [-0.0042, "ขายออกเล็กน้อย"], [-0.02, "ขายออกชัดเจน"], [0.008, "สะสมเล็กน้อย"], [0.03, "สะสมชัดเจน"]].forEach(function (cs) {
  var rows = hist(400, function (i) { return i > 30 ? 14.0e6 : 14.0e6 * (1 + cs[0]); });   // a step 30 days ago
  var card = cardOf(runMonitor({ bgeo: BASE, series: { lthSupply: rows }, preload: ["btc-lt-signal.js"] }).html, "LTH Supply");
  var line = card.slice(card.indexOf("วันนี้"), card.indexOf("วันนี้") + 240);
  t("LTH Supply 30-day " + (cs[0] * 100).toFixed(2) + "% → \"" + cs[1] + "\" (= the panel's LTH Net Position wording)", line.indexOf("— " + cs[1]) >= 0 && SIGNAL.zoneText("lthNetPct", cs[0] * 100) === cs[1], line);
});
// stale BGeometrics (newest row 17 days old — the pull was blocked for 10 days): card and panel still give the same 30-day %
var staleSup = []; for (var sd2 = 400; sd2 >= 17; sd2--) staleSup.push([ymd(Date.now() - sd2 * DAY), 15.0e6 + (400 - sd2) * 1000]);
var stl = runMonitor({ bgeo: BASE, series: { lthSupply: staleSup }, history: { series: {}, sources: {} }, preload: ["btc-lt-signal.js", "btc-lt-panel.js"] });
var stCard = cardOf(stl.html, "LTH Supply"), stCardPct = (/30 วัน [+−][\d,]+ BTC \(([+−][\d.]+)%\)/.exec(stCard) || [])[1];
var stRow = (stl.html.match(/<li class="btc-lt-mem" data-lt-member="lthNetPct">[\s\S]*?<\/li>/) || [""])[0], stPanelPct = (/class="btc-lt-mem-val">([+−][\d.]+)%</.exec(stRow) || [])[1];
t("stale series: the LTH Supply card's 30-day % = the panel's LTH Net Position (30 วัน) %", !!stCardPct && stCardPct === stPanelPct, { card: stCardPct, panel: stPanelPct });
var noEng = cardOf(runMonitor({ bgeo: BASE, series: { lthSupply: down } }).html, "LTH Supply");
t("engine not loaded → the card still shows the numbers, with no reading of its own", /−150,000 BTC/.test(noEng) && !/ขายออก|สะสม|แจกจ่าย|ทรงตัว/.test(noEng.slice(noEng.indexOf("วันนี้"), noEng.indexOf("วันนี้") + 140)), noEng.slice(noEng.indexOf("วันนี้"), noEng.indexOf("วันนี้") + 220));

console.log("== status line + loading ==");
var FULL = {};
["mvrvZScore", "realizedPrice", "nupl", "rup", "sopr", "ssr", "lthSupply", "lthSopr"].forEach(function (k) { FULL[k] = hist(400, function (i) { return 1 + i / 1000; }); });
var st = runMonitor({ bgeo: Object.assign({}, BASE, { lthSopr: 1.2 }), series: FULL });
t("every BGeometrics card has history and Puell's (Blockchain.com) is not in yet → no BGeometrics quota message", !/btc-dd-status/.test(st.html));
t("init loads BtcLtHistory once and re-renders on \"btc-lt-history\"", st.loads.indexOf("history") >= 0 && st.loads.filter(function (x) { return x === "history"; }).length === 1 && st.listeners.indexOf("btc-lt-history") >= 0, { loads: st.loads, listeners: st.listeners });
t("Deep Dive subtitle lists the new cards", /LTH-SOPR/.test(st.html.slice(st.html.indexOf("btcDeepDive"), st.html.indexOf("btcDeepDive") + 900)) && /Puell/.test(st.html.slice(st.html.indexOf("btcDeepDive"), st.html.indexOf("btcDeepDive") + 900)));

console.log("== Long-term Signal panel (btc-lt-panel.js) at the top of the Deep Dive ==");
// stub per the plan contract (model → html → wire) · records what the page hands it
function panelStub(log, opts) {
  opts = opts || {};
  return {
    model: function (args) { log.models.push(args); if (opts.throwModel) throw new Error("boom"); return { n: log.models.length }; },
    html: function (m, ui) { log.htmls.push({ m: m, ui: ui }); return '<div class="btc-lt-stub" data-m="' + m.n + '" data-ui="' + ui.range + "|" + ui.view + "|" + ui.showPrice + '">LT</div>'; },
    wire: function (el, onChange) { log.wires.push({ el: el, onChange: onChange }); },
    normUi: function (u) {
      u = u || {};
      return { range: [365, 730, 1461, "all"].indexOf(u.range) >= 0 ? u.range : 1461, view: typeof u.view === "string" ? u.view : "score", showPrice: u.showPrice !== false };
    }
  };
}
function newLog() { return { models: [], htmls: [], wires: [] }; }
var lg = newLog();
var hState = { at: "2026-11-25T01:00:00Z", series: { puell: puell }, sources: { blockchain: { at: "2026-11-25T01:00:00Z", ok: true, asOf: D1 } } };
var r1 = runMonitor({ bgeo: BASE, series: { lthSupply: sup }, history: hState, panel: panelStub(lg), cycleState: "Expansion" });
var iSec = r1.html.indexOf('id="btcDeepDive"'), iPanel = r1.html.indexOf('id="btcLtPanel"'), iCard = r1.html.indexOf('<div class="mc-card btc-dd-card');
t("panel host #btcLtPanel sits inside the Deep Dive, above the 9 indicator cards", iSec > 0 && iPanel > iSec && iCard > iPanel && /btc-lt-stub/.test(r1.html), { iSec: iSec, iPanel: iPanel, iCard: iCard });
var a0 = lg.models[0] || {};
t("model gets the page's own data: onchain + history states, live price, Buy Zone's Valuation Zone, Intelligence cycle, today (UTC)",
  lg.models.length === 1 && a0.onchain && a0.onchain.series && a0.onchain.series.lthSupply === sup && a0.history && a0.history.series.puell === puell &&
  a0.livePrice && a0.livePrice.value === 70000 && a0.livePrice.at === TODAY && a0.livePrice.source === "Data Snapshot" && a0.valuationZone && a0.valuationZone.key === "recovery" && a0.valuationZone.thai === "โซนฟื้นตัว" &&
  a0.intelCycle === "Expansion" && a0.today === TODAY,
  { n: lg.models.length, livePrice: a0.livePrice, valuationZone: a0.valuationZone, intelCycle: a0.intelCycle, today: a0.today });
t("API down → the price is yesterday's snapshot close: the panel is told that day and that source (never stamped today)", (function () {
  var l = newLog(); runMonitor({ bgeo: BASE, history: hState, panel: panelStub(l), latestDate: D1 });
  var lp = l.models[0] && l.models[0].livePrice; return !!lp && lp.value === 70000 && lp.at === D1 && lp.source === "Data Snapshot";
})());
t("the price's date alone changing (same value) rebuilds the model — it is one of its inputs", (function () {
  var l = newLog(); var r = runMonitor({ bgeo: BASE, history: hState, panel: panelStub(l), latestDate: D1 }); var n = l.models.length;
  r.fire("btc-lt-history"); var same = l.models.length === n;
  r.snap.technicalSignals.BTCUSD.latestDate = TODAY; r.fire("btc-lt-history");
  var last = l.models[l.models.length - 1];
  return same && l.models.length === n + 1 && last.livePrice.at === TODAY;
})());
t("no Intelligence cycle in the snapshot → intelCycle null (never a made-up phase)", (function () { var l = newLog(); runMonitor({ bgeo: BASE, history: hState, panel: panelStub(l) }); return l.models[0] && l.models[0].intelCycle === null; })());
t("default view when nothing is remembered = the panel's own default (normUi)", lg.htmls[0] && lg.htmls[0].ui.range === 1461 && lg.htmls[0].ui.view === "score" && lg.htmls[0].ui.showPrice === true, lg.htmls[0] && lg.htmls[0].ui);
t("the page wires the panel host once per render", lg.wires.length === 1 && lg.wires[0].el === r1.els.btcLtPanel && typeof lg.wires[0].onChange === "function");

var htmlsBefore = lg.htmls.length;
r1.fire("btc-lt-history");
t("re-render with the SAME data → the model (≈15 years of scored days) is reused, not rebuilt", lg.models.length === 1 && lg.htmls.length === htmlsBefore + 1, { models: lg.models.length, htmls: lg.htmls.length - htmlsBefore });
hState.series = { puell: puell.slice(0, -1) };   // a new history load replaces the arrays
r1.fire("btc-lt-history");
t("new history arrays → the model is rebuilt", lg.models.length === 2, lg.models.length);

var wiresBefore = lg.wires.length, modelsBefore = lg.models.length;
var lastWire = lg.wires[lg.wires.length - 1];
if (lastWire) lastWire.onChange({ range: 730, view: "mvrvZ", showPrice: false });
t("a view/range change re-draws only the panel (host innerHTML) with the new choice — no model rebuild",
  /data-ui="730\|mvrvZ\|false"/.test(r1.els.btcLtPanel.innerHTML) && lg.models.length === modelsBefore, r1.els.btcLtPanel.innerHTML);
t("the choice is remembered (localStorage btc_lt_ui_v1)", (function () { try { var u = JSON.parse(r1.store.btc_lt_ui_v1); return u.range === 730 && u.view === "mvrvZ" && u.showPrice === false; } catch (e) { return false; } })(), r1.store.btc_lt_ui_v1);
t("re-drawing the panel does not stack another listener (wire is not called again for the same host)", lg.wires.length === wiresBefore, lg.wires.length - wiresBefore);
var lg2 = newLog();
runMonitor({ bgeo: BASE, history: hState, panel: panelStub(lg2), store: { btc_lt_ui_v1: JSON.stringify({ range: "all", view: "puell", showPrice: true }) } });
t("a remembered choice is used on the next visit", lg2.htmls[0] && lg2.htmls[0].ui.range === "all" && lg2.htmls[0].ui.view === "puell", lg2.htmls[0] && lg2.htmls[0].ui);
var lg3 = newLog();
runMonitor({ bgeo: BASE, history: hState, panel: panelStub(lg3), store: { btc_lt_ui_v1: "{not json" } });
t("a broken remembered value falls back to the default view", lg3.htmls[0] && lg3.htmls[0].ui.range === 1461 && lg3.htmls[0].ui.view === "score");

var noPanel = runMonitor({ bgeo: BASE, history: hState });
t("btc-lt-panel.js not loaded → Deep Dive renders exactly as before (no host, 9 cards)", !/btcLtPanel/.test(noPanel.html) && ddCards(noPanel.html).length === 9);
var lg4 = newLog(), boom = runMonitor({ bgeo: BASE, history: hState, panel: panelStub(lg4, { throwModel: true }) });
t("a panel error never takes the Monitor tab down: 9 cards still render + a plain Thai note in the host",
  ddCards(boom.html).length === 9 && /id="btcLtPanel"[^>]*>[\s\S]*?แสดง Long-term Signal ไม่สำเร็จ/.test(boom.html), boom.html.slice(boom.html.indexOf("btcLtPanel") - 60, boom.html.indexOf("btcLtPanel") + 260));
var cardsOnly = runMonitor({ bgeo: BASE, history: hState, panel: panelStub(newLog()) });
t("the 9 Deep Dive cards are unchanged by the panel (same card HTML with and without it)", ddCards(cardsOnly.html).join("") === ddCards(noPanel.html).join(""));
// the cards' own 6M/1Y/2Y/4Y bar belongs right above the cards — with the panel in between it would sit ~3,000 px away
var H = cardsOnly.html, iHost = H.indexOf('id="btcLtPanel"'), iSub = H.indexOf('class="btc-dd-subhead"'), iBar = H.indexOf('id="btcDdRange"'), iFirst = H.indexOf('<div class="mc-card btc-dd-card');
t("with the panel: a \"ตัวชี้วัดรายตัว\" sub-head + the cards' range bar sit after the panel, right above the 9 cards",
  iHost > 0 && iSub > iHost && iBar > iSub && iFirst > iBar && /<h3[^>]*>ตัวชี้วัดรายตัว<\/h3>/.test(H.slice(iSub, iBar)), { iHost: iHost, iSub: iSub, iBar: iBar, iFirst: iFirst });
t("with the panel: the cards' description (BGeometrics · LTH-SOPR · Puell · กดที่กราฟเพื่อขยาย) moves into that sub-head; the section head describes both parts",
  /BGeometrics[\s\S]*LTH-SOPR[\s\S]*Puell[\s\S]*กดที่กราฟเพื่อขยาย/.test(H.slice(iSub, iBar)) && /Long-term Signal/.test(H.slice(H.indexOf('id="btcDeepDive"'), iHost)) && H.slice(H.indexOf('id="btcDeepDive"'), iHost).indexOf('id="btcDdRange"') < 0);
var NP = noPanel.html;
t("without the panel: the head keeps its range bar and description exactly where they were",
  NP.indexOf('class="btc-dd-subhead"') < 0 && NP.indexOf('id="btcDdRange"') > NP.indexOf('id="btcDeepDive"') && NP.indexOf('id="btcDdRange"') < NP.indexOf('<div class="mc-card btc-dd-card') && /<h2>🧬 On-chain Deep Dive<\/h2><span class="mc-sub">ค่า exact จาก BGeometrics/.test(NP));

console.log("== end to end: the real btc-lt-signal.js + btc-lt-panel.js inside the page (SYNTHETIC multi-cycle data) ==");
var REAL = ["btc-lt-signal.js", "btc-lt-panel.js"];
// ~15 years of synthetic daily rows (4-year waves) + ~4 years of synthetic LTH rows — labelled test data, not market data
function longHist(days, fn) { var out = []; for (var i = days; i >= 1; i--) out.push([ymd(Date.now() - i * DAY), fn(i)]); return out; }
var Y15 = 5500, Y4 = 1460;
var SYN = {
  history: { at: new Date().toISOString(), loading: false, error: null,
    series: {
      price: longHist(Y15, function (i) { return 20000 * Math.exp(-i / 2500) * (1.6 + Math.sin(i / 230)); }),
      mvrvZ: longHist(Y15, function (i) { return 2 + 2.5 * Math.sin(i / 230); }),
      realizedPrice: longHist(Y15, function (i) { return 12000 * Math.exp(-i / 2500); }),
      mvrv: longHist(Y15, function (i) { return 1.6 + Math.sin(i / 230) * 0.9; }),
      puell: longHist(Y15 - 400, function (i) { return 1.2 + 0.8 * Math.sin(i / 230); })
    },
    sources: { coinMetrics: { at: new Date().toISOString(), ok: true, asOf: D1 }, blockchain: { at: new Date().toISOString(), ok: true, asOf: D1 } } },
  series: {
    lthRealizedPrice: longHist(Y4, function (i) { return 30000 + 5 * (Y4 - i); }),
    activeInvestorPrice: longHist(Y4, function (i) { return 40000 + 8 * (Y4 - i); }),
    lthSopr: longHist(Y4, function (i) { return 1.5 + 0.8 * Math.sin(i / 40); }),
    lthSupply: longHist(Y4, function (i) { return 14e6 + 900 * (Y4 - i); }),
    realizedPrice: longHist(Y4, function (i) { return 35000 + 6 * (Y4 - i); })
  }
};
var e2e = runMonitor({ bgeo: Object.assign({}, BASE, { lthSopr: 1.4 }), series: SYN.series, history: SYN.history, preload: REAL, cycleState: "Expansion" });
// the panel host ends where the cards' own sub-head begins
function hostOf(html) { return html.slice(html.indexOf('id="btcLtPanel"'), html.indexOf('class="btc-dd-subhead"')); }
var host = hostOf(e2e.html);
t("real modules: the panel renders all 5 parts (signal · 5 questions · cost basis · history · sources)",
  ["signal", "questions", "cost", "history", "sources"].every(function (s) { return host.indexOf('data-lt-section="' + s + '"') >= 0; }) && !/แสดง Long-term Signal ไม่สำเร็จ/.test(host),
  host.slice(0, 300));
t("no NaN / undefined / [object Object] leaks into the panel", !/NaN|undefined|\[object Object\]/.test(host), (host.match(/.{60}(NaN|undefined|\[object Object\]).{60}/) || [""])[0]);
t("first render incl. the ~15-year backtest stays quick (< 2.5 s in Node)", e2e.ms < 2500, e2e.ms + " ms");
console.log("        (first render with the real modules: " + e2e.ms + " ms)");
var t1 = Date.now(); e2e.fire("btc-lt-history"); var reMs = Date.now() - t1;
t("a re-render with the same data reuses the model (< 25% of the first render)", reMs < Math.max(60, e2e.ms * 0.25), reMs + " ms vs " + e2e.ms + " ms");
var fresh = runMonitor({ bgeo: BASE, history: { series: {}, sources: {}, loading: true }, preload: REAL });
var fhost = hostOf(fresh.html);
t("first visit, nothing loaded yet → the panel renders with ไม่มีข้อมูล / กำลังโหลด, never a number from nowhere",
  fresh.html.indexOf('id="btcLtPanel"') > 0 && !/แสดง Long-term Signal ไม่สำเร็จ/.test(fhost) && /ไม่มีข้อมูล|กำลังโหลด|ข้อมูลไม่พอ/.test(fhost) && !/NaN|undefined/.test(fhost), fhost.slice(0, 400));
var noHist = runMonitor({ bgeo: BASE, history: false, preload: REAL });
t("btc-lt-history.js missing → the panel still renders (Data Unavailable), the cards stay 9", noHist.html.indexOf('id="btcLtPanel"') > 0 && ddCards(noHist.html).length === 9 && !/แสดง Long-term Signal ไม่สำเร็จ/.test(noHist.html));
t("panel controls never collide with the Deep Dive's own (no data-dd-range / data-dd-open / btc-dd-plot inside the host)", !/data-dd-range|data-dd-open|btc-dd-plot/.test(host));
t("no advisory words in the panel copy", !/ควรซื้อ|ควรขาย|น่าซื้อ|น่าขาย|แนะนำซื้อ|แนะนำขาย|จุดเข้า|ตัดขาดทุน|\bBuy\b|\bSell\b/.test(host.replace(/<[^>]+>/g, " ")));
t("no ฿ in any title / aria-label of the panel", !/(title|aria-label)="[^"]*฿/.test(host));

console.log("\n" + (pass + fail) + " checks · " + pass + " passed · " + fail + " failed");
process.exit(fail ? 1 : 0);
