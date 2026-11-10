"use strict";
// ============================================================
// ผู้ใช้ BigCache: Wave 3 engine · Bitcoin Intelligence engine + หน้า · (กล่อง Action ใน home-action-test.js)
//   node scripts/big-cache-consumers-test.js
//
// ย้าย cache ราคาก้อนใหญ่จาก localStorage ไป BigCache (IndexedDB · memory ใน VM) — "ย้ายที่เก็บเท่านั้น"
// ล็อก: record ละสัญลักษณ์ (wave3_ohlc_v1:<SYM>) · วันเดียวกันรอบสองไม่ยิง /api/ohlc เลยและผลเท่าเดิมทุกตัวอักษร
//   · ตัด 520 แท่ง · ข้ามวัน = ดึงใหม่ · ดึงได้ว่าง = ใช้ของเก่า · ไม่เขียน localStorage
//   · BTC: ครั้งแรก full-download (start=2014-01-01) · ครั้งต่อไป incremental (start = แท่งสุดท้าย − 7) จาก BigCache
//   · หน้า BI วาดได้ทันทีโดยไม่มีราคาย้อนหลัง แล้ววาดใหม่เองเมื่ออ่าน BigCache เสร็จ (เฉพาะตอนแท็บ Intelligence เปิดอยู่)
// ============================================================
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var PUB = path.join(__dirname, "..", "public");
var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; return; }
  fail++;
  console.error("  ✗ " + name + (extra !== undefined ? "  → " + JSON.stringify(extra) : ""));
}
function read(name) { return fs.readFileSync(path.join(PUB, name), "utf8"); }
function ymdAdd(ymd, d) { return new Date(Date.parse(ymd + "T00:00:00Z") + d * 86400000).toISOString().slice(0, 10); }
function tick(ms) { return new Promise(function (r) { setTimeout(r, ms || 0); }); }

function spyStorage() {
  var m = {}, writes = [];
  return { writes: writes, getItem: function (k) { return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null; },
    setItem: function (k, v) { writes.push(k); m[k] = String(v); }, removeItem: function (k) { delete m[k]; }, key: function () { return null; }, length: 0 };
}
function resp(status, body) {
  var text = JSON.stringify(body);
  return { ok: status >= 200 && status < 300, status: status, json: function () { return Promise.resolve(JSON.parse(text)); }, text: function () { return Promise.resolve(text); } };
}
function sandbox(extra) {
  var win = { console: console, setTimeout: setTimeout, clearTimeout: clearTimeout, Promise: Promise, localStorage: spyStorage() };
  Object.keys(extra || {}).forEach(function (k) { win[k] = extra[k]; });
  win.window = win; win.self = win;
  return { win: win, ctx: vm.createContext(win) };
}

// ---------- fixture: แท่งราคา (เดิน deterministic ต่อสัญลักษณ์) ----------
function seed(sym) { var h = 7; for (var i = 0; i < sym.length; i++) h = (h * 31 + sym.charCodeAt(i)) % 100003; return h; }
function barsFor(sym, endYmd, n) {
  var s = seed(sym), px = 20 + (s % 200), out = [];
  for (var i = n - 1; i >= 0; i--) {
    var d = ymdAdd(endYmd, -i);
    s = (s * 1103515245 + 12345) % 2147483648;
    px = Math.max(0.5, px * (1 + ((s % 2001) - 960) / 40000));
    out.push({ date: d, open: px, high: px * 1.01, low: px * 0.99, close: Math.round(px * 1000) / 1000, volume: 1000 + (s % 5000) });
  }
  return out;
}

(async function () {
  // ============================================================ Wave 3
  console.log("== Wave 3 engine · cache ต่อสัญลักษณ์ใน BigCache ==");
  var calls = [], emptyFor = {}, day = "2026-11-09";
  function w3fetch(url) {
    var u = String(url);
    calls.push(u);
    var sym = decodeURIComponent((/[?&]symbol=([^&]+)/.exec(u) || [])[1] || "");
    if (emptyFor[sym] || /^PEPE-USD$/.test(sym)) return Promise.resolve(resp(200, { bars: [] }));
    return Promise.resolve(resp(200, { bars: barsFor(sym, day, 600) }));
  }
  var w = sandbox();
  vm.runInContext(read("big-cache.js"), w.ctx, { filename: "big-cache.js" });
  vm.runInContext(read("wave3-engine.js"), w.ctx, { filename: "wave3-engine.js" });
  var W3 = w.win.Wave3Engine, BC = w.win.BigCache;
  t("wave3-engine + big-cache boot in one window", !!W3 && !!BC && typeof W3.run === "function");
  var SNAP = { historicalData: {}, portfolioHoldings: { data: [] } };
  var nUni = W3.CRYPTO_TOP20.length + W3.THAI_UNIVERSE.length;
  var r1 = await W3.run(SNAP, { fetch: w3fetch, now: "2026-11-10T03:00:00.000Z" });
  var c1 = calls.length;
  t("first run fetches every fetched-universe symbol once via /api/ohlc", c1 === nUni && calls.every(function (u) { return /^\/api\/ohlc\?symbol=[^&]+&days=480$/.test(u); }), [c1, nUni]);
  var keys = await BC.keys("wave3_ohlc_v1:");
  t("one BigCache record per symbol with bars (PEPE-USD empty → no record)", keys.length === nUni - 1 && keys.indexOf("wave3_ohlc_v1:PEPE-USD") < 0 &&
    keys.indexOf("wave3_ohlc_v1:BTC-USD") >= 0 && keys.indexOf("wave3_ohlc_v1:PTT.BK") >= 0, [keys.length, nUni]);
  var btcRec = await BC.get("wave3_ohlc_v1:BTC-USD");
  t("record shape { u: today, d, c, v } capped at 520 bars", !!btcRec && btcRec.u === "2026-11-10" && btcRec.c.length === 520 && btcRec.d.length === 520 && btcRec.v.length === 520 &&
    btcRec.d[519] === day, btcRec && [btcRec.u, btcRec.c.length, btcRec.d[519]]);
  t("nothing written to localStorage", w.win.localStorage.writes.length === 0, w.win.localStorage.writes);
  t("result has the crypto + thailand universes (PEPE dropped)", r1.meta.counts.crypto === W3.CRYPTO_TOP20.length - 1 && r1.meta.counts.thailand === W3.THAI_UNIVERSE.length, r1.meta.counts);

  var r2 = await W3.run(SNAP, { fetch: w3fetch, now: "2026-11-10T09:00:00.000Z" });
  // PEPE-USD ตอบแท่งว่าง → ไม่เคยถูกเก็บ (กติกาเดิม) จึงถูกถามซ้ำทุกรอบ — ตัวอื่นต้องไม่ยิงเลย
  t("second run on the same day: served from cache — the only /api/ohlc call is the never-cached empty symbol", calls.length === c1 + 1 &&
    /symbol=PEPE-USD&/.test(calls[c1]), calls.slice(c1));
  var j1 = JSON.stringify(r1).replace(/"generatedAt":"[^"]*"/, ""), j2 = JSON.stringify(r2).replace(/"generatedAt":"[^"]*"/, "");
  t("…and the result is byte-identical to the fetched run (generatedAt aside)", j1 === j2);

  // fresh BigCache (cold) gives the same answer as a warm one → cache location does not change results
  var w2 = sandbox();
  vm.runInContext(read("big-cache.js"), w2.ctx, { filename: "big-cache.js" });
  vm.runInContext(read("wave3-engine.js"), w2.ctx, { filename: "wave3-engine.js" });
  var r1b = await w2.win.Wave3Engine.run(SNAP, { fetch: w3fetch, now: "2026-11-10T03:00:00.000Z" });
  t("a cold cache on another page computes the same result", JSON.stringify(r1b) === JSON.stringify(r1));

  // next day: refetch; BTC answers empty → stale record is used (keep stale on empty)
  calls.length = 0; day = "2026-11-10"; emptyFor["BTC-USD"] = 1;
  var r3 = await W3.run(SNAP, { fetch: w3fetch, now: "2026-11-11T03:00:00.000Z" });
  t("next day: every symbol is fetched again", calls.length === nUni, calls.length);
  var btc3 = r3.universes.crypto.items.filter(function (a) { return a.symbol === "BTC"; })[0];
  t("empty answer for BTC-USD → yesterday's cached series is used (date 2026-11-09)", !!btc3 && btc3.date === "2026-11-09", btc3 && btc3.date);
  var btcRec3 = await BC.get("wave3_ohlc_v1:BTC-USD");
  t("…and the stale record is kept as is (u stays 2026-11-10)", !!btcRec3 && btcRec3.u === "2026-11-10");
  var eth3 = await BC.get("wave3_ohlc_v1:ETH-USD");
  t("other symbols re-stamped for the new day", !!eth3 && eth3.u === "2026-11-11" && eth3.d[519] === "2026-11-10");
  delete emptyFor["BTC-USD"];

  // no BigCache (Node require) → per-run memory, same as the old no-localStorage path
  var W3node = require("../public/wave3-engine.js");
  calls.length = 0;
  await W3node.run(SNAP, { fetch: w3fetch, now: "2026-11-11T03:00:00.000Z" });
  var cn = calls.length;
  await W3node.run(SNAP, { fetch: w3fetch, now: "2026-11-11T03:00:00.000Z" });
  t("without BigCache (Node): no cross-run cache, never throws (old behaviour)", cn === nUni && calls.length === 2 * nUni, [cn, calls.length]);

  // ============================================================ Bitcoin Intelligence
  console.log("== Bitcoin Intelligence engine · ประวัติ BTC ใน BigCache ==");
  var bCalls = [], END = "2026-11-09";
  var ALL = barsFor("BTC-USD", END, 1500);
  function btcFetch(url) {
    var u = String(url);
    bCalls.push(u);
    var start = (/[?&]start=([0-9-]+)/.exec(u) || [])[1] || "1900-01-01";
    return Promise.resolve(resp(200, { bars: ALL.filter(function (b) { return b.date >= start; }) }));
  }
  var b = sandbox({ fetch: btcFetch });
  vm.runInContext(read("big-cache.js"), b.ctx, { filename: "big-cache.js" });
  vm.runInContext(read("bitcoin-intelligence.js"), b.ctx, { filename: "bitcoin-intelligence.js" });
  var BIE = b.win.BitcoinIntelligence, BCb = b.win.BigCache;
  var T0 = Date.now();
  var bi1 = await BIE.run({}, { fetch: btcFetch });
  t("first run: full download from 2014-01-01, one request", bCalls.length === 1 && /symbol=BTC-USD&start=2014-01-01$/.test(bCalls[0]) && bi1.meta.mode === "full-download" && bi1.available === true,
    [bCalls, bi1.meta && bi1.meta.mode]);
  var hrec = await BCb.get("btc_intelligence_history_v1");
  t("history stored in BigCache as the columnar record { d, o, h, l, c, v, updatedAt }", !!hrec && hrec.d.length === 1500 && hrec.c.length === 1500 && hrec.d[1499] === END &&
    typeof hrec.updatedAt === "string", hrec && [hrec.d.length, hrec.d[1499]]);
  t("nothing written to localStorage", b.win.localStorage.writes.length === 0, b.win.localStorage.writes);
  var bi2 = await BIE.run({}, { fetch: btcFetch });
  t("second run: incremental from the cached last bar − 7 days", bCalls.length === 2 && new RegExp("start=" + ymdAdd(END, -7) + "$").test(bCalls[1]) && bi2.meta.mode === "incremental",
    [bCalls[1], bi2.meta && bi2.meta.mode]);
  function strip(o) { return JSON.stringify(o).replace(/"(updatedAt|generatedAt)":"[^"]*"/g, ""); }
  t("cached + incremental run gives the same intelligence as the full download", strip(bi1).replace(/"mode":"[^"]*"/, "") === strip(bi2).replace(/"mode":"[^"]*"/, ""));
  console.log("   (BI runs took " + (Date.now() - T0) + " ms)");

  // ============================================================ หน้า Bitcoin Intelligence
  console.log("== หน้า Bitcoin Intelligence · อ่านราคาย้อนหลังจาก BigCache แบบ async ==");
  var tabBody = { innerHTML: "" };
  var docStub = {
    getElementById: function (id) {
      if (id === "btcTabBody") return tabBody;
      if (id === "bi-verdict") return tabBody.innerHTML.indexOf('id="bi-verdict"') >= 0 ? {} : null;
      return null;
    },
    createElement: function () { return { style: {}, appendChild: function () {} }; },
    body: { appendChild: function () {} }
  };
  var handlers = {};
  b.win.addEventListener = function (type, fn) { (handlers[type] = handlers[type] || []).push(fn); };
  function fire(type) { (handlers[type] || []).forEach(function (fn) { fn({ type: type, detail: null }); }); }
  b.win.document = docStub;
  var SN = { bitcoinIntelligence: bi1 };
  b.win.PortfolioDataSnapshot = { read: function () { return SN; } };
  vm.runInContext(read("bitcoin-intelligence-page.js"), b.ctx, { filename: "bitcoin-intelligence-page.js" });
  var UI = b.win.BitcoinIntelligenceUI;
  var PRICE_PT = /"t":"ราคาจริง[^"]*","s":"(\$[0-9,]+)/;
  var first = UI.html(SN);
  tabBody.innerHTML = first;
  t("first render (history read still pending) works without the price history", typeof first === "string" && first.indexOf('id="bi-verdict"') >= 0 && !PRICE_PT.test(first));
  await tick(20);
  t("when the BigCache read resolves the open Intelligence tab re-renders with real prices", PRICE_PT.test(tabBody.innerHTML));
  var px1 = (PRICE_PT.exec(UI.html(SN)) || [])[1];
  t("later renders use the loaded history synchronously", !!px1);
  // Load ใหม่เขียนประวัติชุดใหม่ → portfolio-data-snapshot → อ่านใหม่ · ตอนนั้นแท็บอื่นเปิดอยู่ = ไม่วาดทับ
  tabBody.innerHTML = "<div>monitor tab</div>";
  var h2 = JSON.parse(JSON.stringify(hrec));
  h2.c = h2.c.map(function (v) { return v * 2; });
  await BCb.set("btc_intelligence_history_v1", h2);
  fire("portfolio-data-snapshot");
  await tick(20);
  t("a resolved read never overwrites another tab's body", tabBody.innerHTML === "<div>monitor tab</div>", tabBody.innerHTML.slice(0, 80));
  var px2 = (PRICE_PT.exec(UI.html(SN)) || [])[1];
  t("after portfolio-data-snapshot the page re-reads the history (new prices)", !!px2 && px2 !== px1, [px1, px2]);
  t("page source: no localStorage read of the history", !/localStorage[^\n]*btc_intelligence_history_v1/.test(read("bitcoin-intelligence-page.js")) &&
    /BigCache/.test(read("bitcoin-intelligence-page.js")));

  console.log("");
  console.log(pass + fail + " checks · " + pass + " passed · " + fail + " failed");
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.error("  ✗ crashed: " + (e && e.stack || e)); console.log(pass + fail + " checks · " + pass + " passed · " + (fail + 1) + " failed"); process.exit(1); });
