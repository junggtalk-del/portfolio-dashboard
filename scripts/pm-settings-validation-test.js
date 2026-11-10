"use strict";
// ============================================================
// AI Portfolio Manager — ค่าตั้งของหน้าบน server (?doc=pm) — เทสต์ชั้นเก็บข้อมูล
//   node scripts/pm-settings-validation-test.js
//
// สิ่งที่ล็อกไว้:
//   A. isValidPmSettingsDoc: ค่าที่หน้าเขียนได้จริงทุกแบบผ่าน (รวมค่าที่ได้จากการเรียก setter ตัวจริงของหน้า)
//      · คีย์แปลก / ชนิดผิด / ตัวเลขไม่จำกัด / เกินช่วง / ใหญ่เกิน cap / v ผิด ไม่ผ่าน · ไม่ throw
//   B. api/portfolio.js: ?doc=pm → แถว pm_settings_main · validator ใหม่ · ?doc=xyz ยัง 400 · ไม่มี doc = เดิม · 401 ก่อน I/O
//   C. หน้าไม่สร้างเอกสารที่ server ปฏิเสธ: normalizePmSetting (ฝั่งหน้า) → validator ผ่านเสมอ · ค่าที่หน้าเขียนเองไม่ถูกแก้
//   (server.js: scripts/server-portfolio-test.js section F)
// ============================================================
var fs = require("fs");
var path = require("path");

var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; return; }
  fail++;
  console.error("  ✗ " + name + (extra !== undefined ? "  → " + JSON.stringify(extra) : ""));
}
function finish() {
  var total = pass + fail;
  console.log(total + " checks · " + pass + " passed · " + fail + " failed");
  process.exit(fail ? 1 : 0);
}
function clone(x) { return JSON.parse(JSON.stringify(x)); }
function bytes(doc) { return Buffer.byteLength(JSON.stringify(doc), "utf8"); }

var V = null;
try { V = require("../lib/pm-settings-validation.js"); } catch (e) { V = null; }
t("lib/pm-settings-validation.js exists and exports isValidPmSettingsDoc", !!V && typeof V.isValidPmSettingsDoc === "function");
if (!V || typeof V.isValidPmSettingsDoc !== "function") finish();
var ok = V.isValidPmSettingsDoc;

// ---- Section A: validator ----------------------------------
console.log("== A. validator ==");
t("state id fixed", V.PM_STATE_ID === "pm_settings_main", V.PM_STATE_ID);
t("max bytes fixed (200,000 UTF-8 bytes)", V.PM_MAX_BYTES === 200000, V.PM_MAX_BYTES);
t("ticker key / indexTicker length cap = 64", V.PM_KEY_MAX_LEN === 64, V.PM_KEY_MAX_LEN);

var FULL = {
  v: 1,
  tierConfig: { map: { NVDA: "A", QQQM: "B", PLTR: "C", "BRK.B": "A" }, tiers: { A: { min: 5, max: 20 }, B: { target: 6, min: 2, max: 10 }, C: {} } },
  entryProgress: { NVDA: { "1": true, "2": true }, QQQM: { "4": true }, META: {} },
  megaStance: "bearish",
  allocPolicy: { indexTicker: "QQQM", indexPct: 50, maxSinglePct: 10, splitMethod: "conviction" },
  updatedAt: "2026-11-10T03:04:05.678Z"
};
t("minimal doc { v: 1 } is valid (every key optional)", ok({ v: 1 }));
t("full doc with all four settings + updatedAt is valid", ok(FULL));
t("each key alone is valid", ["tierConfig", "entryProgress", "megaStance", "allocPolicy", "updatedAt"].every(function (k) { var d = { v: 1 }; d[k] = FULL[k]; return ok(d); }));
t("tierConfig with empty map/tiers (page's tierConfig() of an empty store) is valid", ok({ v: 1, tierConfig: { map: {}, tiers: {} } }));
t("tierConfig with only map / only tiers is valid", ok({ v: 1, tierConfig: { map: { NVDA: "B" } } }) && ok({ v: 1, tierConfig: { tiers: { C: { max: 4 } } } }));
t("tier bounds 0 and 100 + decimals (step 0.5) are valid", ok({ v: 1, tierConfig: { map: {}, tiers: { A: { min: 0, target: 7.5, max: 100 } } } }));
t("entryProgress with an empty ticker object (left by un-ticking) is valid", ok({ v: 1, entryProgress: { NVDA: {} } }));
t("megaStance bullish / bearish valid", ok({ v: 1, megaStance: "bullish" }) && ok({ v: 1, megaStance: "bearish" }));
t("allocPolicy bounds: indexPct 0 and 100 · maxSinglePct 100 and 0.5 · splitMethod equal", ok({ v: 1, allocPolicy: { indexPct: 0, maxSinglePct: 100, splitMethod: "equal" } }) &&
  ok({ v: 1, allocPolicy: { indexPct: 100, maxSinglePct: 0.5 } }));
t("allocPolicy {} and indexTicker alone are valid", ok({ v: 1, allocPolicy: {} }) && ok({ v: 1, allocPolicy: { indexTicker: "VOO" } }));
t("indexTicker: ticker characters (BRK.B · ^NDX · QQQM-X) and exactly 64 chars are valid", ["BRK.B", "^NDX", "QQQM-X", "K-USXNDQRMF", new Array(65).join("X")].every(function (x) { return ok({ v: 1, allocPolicy: { indexTicker: x } }); }));
t("ticker keys of exactly 64 chars are valid", (function () { var k = new Array(65).join("Q"), m = {}, p = {}; m[k] = "A"; p[k] = { "1": true }; return ok({ v: 1, tierConfig: { map: m, tiers: {} }, entryProgress: p }); })());
t("validator does not mutate its input", (function () { var d = clone(FULL), s = JSON.stringify(d); ok(d); return JSON.stringify(d) === s; })());

// ---- ไม่ผ่าน ----
function bad(name, doc) { t("invalid: " + name, ok(doc) === false, doc); }
bad("null", null); bad("array", []); bad("string", "x"); bad("number", 1); bad("undefined", undefined);
bad("missing v", { megaStance: "bullish" });
bad("v 2", { v: 2 }); bad("v '1'", { v: "1" }); bad("v 0", { v: 0 });
bad("unknown top-level key", { v: 1, foo: 1 });
bad("pmCurrentView is not a server key (stays per device)", { v: 1, pmCurrentView: "stocks" });
bad("foreignSleeve is not a pm key", { v: 1, foreignSleeve: { cash: 1 } });
bad("tierConfig array", { v: 1, tierConfig: [] });
bad("tierConfig null", { v: 1, tierConfig: null });
bad("tierConfig extra key", { v: 1, tierConfig: { map: {}, tiers: {}, x: 1 } });
bad("tierConfig.map array", { v: 1, tierConfig: { map: [] } });
bad("tierConfig.map value D (page only offers A/B/C)", { v: 1, tierConfig: { map: { NVDA: "D" } } });
bad("tierConfig.map value lower-case a", { v: 1, tierConfig: { map: { NVDA: "a" } } });
bad("tierConfig.map value number", { v: 1, tierConfig: { map: { NVDA: 1 } } });
bad("tierConfig.map empty-string key", { v: 1, tierConfig: { map: { "": "A" } } });
bad("tierConfig.map 65-char key", (function () { var m = {}; m[new Array(66).join("Q")] = "A"; return { v: 1, tierConfig: { map: m } }; })());
bad("tierConfig.tiers key D", { v: 1, tierConfig: { tiers: { D: { max: 5 } } } });
bad("tierConfig.tiers.A not an object", { v: 1, tierConfig: { tiers: { A: 5 } } });
bad("tierConfig.tiers field foo", { v: 1, tierConfig: { tiers: { A: { foo: 5 } } } });
bad("tier value 101", { v: 1, tierConfig: { tiers: { A: { max: 101 } } } });
bad("tier value -1", { v: 1, tierConfig: { tiers: { A: { min: -1 } } } });
bad("tier value string '5'", { v: 1, tierConfig: { tiers: { A: { min: "5" } } } });
bad("tier value null", { v: 1, tierConfig: { tiers: { A: { min: null } } } });
bad("tier value NaN (in-process)", { v: 1, tierConfig: { tiers: { A: { min: NaN } } } });
bad("tier value Infinity (in-process)", { v: 1, tierConfig: { tiers: { A: { max: Infinity } } } });
bad("entryProgress array", { v: 1, entryProgress: [] });
bad("entryProgress ticker → true (not an object)", { v: 1, entryProgress: { NVDA: true } });
bad("entryProgress inner key not a number", { v: 1, entryProgress: { NVDA: { x: true } } });
bad("entryProgress inner key 4 digits", { v: 1, entryProgress: { NVDA: { "1234": true } } });
bad("entryProgress inner value false", { v: 1, entryProgress: { NVDA: { "1": false } } });
bad("entryProgress inner value 'true'", { v: 1, entryProgress: { NVDA: { "1": "true" } } });
bad("entryProgress 65-char ticker", (function () { var p = {}; p[new Array(66).join("Q")] = {}; return { v: 1, entryProgress: p }; })());
bad("megaStance neutral", { v: 1, megaStance: "neutral" });
bad("megaStance true", { v: 1, megaStance: true });
bad("megaStance null", { v: 1, megaStance: null });
bad("allocPolicy array", { v: 1, allocPolicy: [] });
bad("allocPolicy unknown key", { v: 1, allocPolicy: { satellitePool: 50 } });
bad("indexTicker empty", { v: 1, allocPolicy: { indexTicker: "" } });
bad("indexTicker 65 chars", { v: 1, allocPolicy: { indexTicker: new Array(66).join("X") } });
bad("indexTicker number", { v: 1, allocPolicy: { indexTicker: 5 } });
bad("indexTicker Thai text (not ticker characters)", { v: 1, allocPolicy: { indexTicker: "กองทุนดัชนี" } });
bad("indexTicker lower-case (page upper-cases)", { v: 1, allocPolicy: { indexTicker: "qqqm" } });
bad("indexTicker with a space", { v: 1, allocPolicy: { indexTicker: "QQQ M" } });
bad("indexTicker with an emoji / lone surrogate", { v: 1, allocPolicy: { indexTicker: "QQQM🚀" } });
bad("indexTicker lone surrogate", { v: 1, allocPolicy: { indexTicker: "QQQM\uD83D" } });
bad("indexPct -1", { v: 1, allocPolicy: { indexPct: -1 } });
bad("indexPct 101", { v: 1, allocPolicy: { indexPct: 101 } });
bad("indexPct string", { v: 1, allocPolicy: { indexPct: "50" } });
bad("indexPct Infinity (in-process)", { v: 1, allocPolicy: { indexPct: Infinity } });
bad("maxSinglePct 0 (page requires > 0)", { v: 1, allocPolicy: { maxSinglePct: 0 } });
bad("maxSinglePct 101", { v: 1, allocPolicy: { maxSinglePct: 101 } });
bad("splitMethod other", { v: 1, allocPolicy: { splitMethod: "random" } });
bad("updatedAt number", { v: 1, updatedAt: 123 });
bad("updatedAt not a date", { v: 1, updatedAt: "yesterday-ish" });
bad("updatedAt longer than 64 chars", { v: 1, updatedAt: "2026-11-10T03:04:05.678Z" + new Array(50).join(" ") });
bad("updatedAt null", { v: 1, updatedAt: null });
bad("__proto__ key from JSON.parse", JSON.parse('{"v":1,"entryProgress":{"__proto__":{"1":true}}}'));
t("validator never throws (cyclic doc → false)", (function () {
  var cyc = { v: 1, entryProgress: {} };
  cyc.entryProgress.NVDA = cyc;
  try { return ok(cyc) === false; } catch (e) { return false; }
})());
t("validator never throws on getter that throws", (function () {
  var d = { v: 1 };
  Object.defineProperty(d, "megaStance", { enumerable: true, get: function () { throw new Error("boom"); } });
  try { return ok(d) === false; } catch (e) { return false; }
})());

// ---- byte cap (±1 byte, ASCII + Thai) ----
function padded(n) {
  // entryProgress ที่มี ticker ยาว 60 ตัวอักษรหลายตัว + ตัวสุดท้ายเติมให้ได้ขนาดตามต้องการ
  var p = {}, i = 0;
  var doc = { v: 1, entryProgress: p };
  while (bytes(doc) + 80 < n) { p["T" + String(i).padStart(59, "0")] = {}; i++; }
  var rest = n - bytes(doc) - 6;   // ,"":{}  = 6 bytes ต่อคีย์ใหม่
  if (rest > 0) {
    if (rest > V.PM_KEY_MAX_LEN) throw new Error("padding step too large");
    p[new Array(rest + 1).join("Z")] = {};
  }
  return doc;
}
var exact = padded(V.PM_MAX_BYTES), over = padded(V.PM_MAX_BYTES + 1);
t("doc of exactly PM_MAX_BYTES bytes is valid", bytes(exact) === V.PM_MAX_BYTES && ok(exact), bytes(exact));
t("doc of PM_MAX_BYTES + 1 bytes is invalid", bytes(over) === V.PM_MAX_BYTES + 1 && !ok(over), bytes(over));
t("byte cap counts UTF-8 bytes (Thai keys are 3 bytes per char)", (function () {
  var p = {}, d = { v: 1, entryProgress: p }, i = 0;
  while (JSON.stringify(d).length < 190000) { p["ก" + String(i).padStart(20, "0") + new Array(30).join("ข")] = {}; i++; }
  return JSON.stringify(d).length < V.PM_MAX_BYTES && bytes(d) > V.PM_MAX_BYTES && !ok(d);
})());

// ---- ค่าจาก setter ตัวจริงของหน้า (ตัดหน้าที่ anchor แบบ pm-view-test) ----
var SRC = fs.readFileSync(path.join(__dirname, "..", "public", "portfolio-manager-page.js"), "utf8");
var CUT = "  // ธงแดง/มูลค่าเปลี่ยนจาก Action Center";
var store = {};
var pageFetches = [];
function loadPage() {
  global.localStorage = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  };
  // fetch ค้างตลอด (ไม่ตอบ) — section นี้สนใจแค่ค่าที่ setter เขียนลง localStorage
  global.window = { ThesisData: { companies: {} }, addEventListener: function () {},
    fetch: function (u, init) { pageFetches.push({ url: String(u), method: (init && init.method) || "GET" }); return new Promise(function () {}); } };
  global.document = { readyState: "complete", getElementById: function () { return null; }, addEventListener: function () {}, activeElement: null };
  var body = SRC.slice(0, SRC.indexOf(CUT)).replace(/^\(function \(\) \{/, "");
  body += "\n  return { setTier: setTier, setTierParam: setTierParam, setStance: setStance, setAllocField: setAllocField, toggleEntry: toggleEntry," +
    " normalize: typeof normalizePmSetting === 'function' ? normalizePmSetting : null };\n";
  return new Function(body)();
}
var page = null;
try { page = SRC.indexOf(CUT) > 0 ? loadPage() : null; } catch (e) { page = null; console.error("  page load failed: " + e.message); }
t("page source cut at the anchor loads (setters + normalizePmSetting reachable)", !!page && typeof page.normalize === "function");

function docFromStore() {
  var d = { v: 1, updatedAt: new Date().toISOString() };
  var map = { tierConfig: "pmTierConfig_v1", entryProgress: "pmEntryProgress_v1", megaStance: "pmMegaStance_v1", allocPolicy: "pmAllocPolicy_v1" };
  Object.keys(map).forEach(function (k) { if (store[map[k]] != null) d[k] = JSON.parse(store[map[k]]); });
  return d;
}
var pageDocs = [];
if (page) {
  page.setTier("NVDA", "A"); page.setTier("PLTR", "C"); page.setTier("QQQM", "B");
  page.setTierParam("A", "min", "7.5"); page.setTierParam("A", "max", "100"); page.setTierParam("C", "max", "0"); page.setTierParam("B", "target", "6");
  page.setTierParam("B", "max", "150");   // นอกช่วง → หน้าไม่เขียน
  page.setStance("bearish");
  page.toggleEntry("NVDA", "1", true); page.toggleEntry("NVDA", "2", true); page.toggleEntry("QQQM", "4", true); page.toggleEntry("META", "3", true); page.toggleEntry("META", "3", false);
  page.setAllocField("indexTicker", " qqqm "); page.setAllocField("indexPct", "60"); page.setAllocField("maxSinglePct", "12.5"); page.setAllocField("splitMethod", "equal");
  pageDocs.push(docFromStore());
  page.setStance("bullish"); page.setAllocField("splitMethod", "conviction"); page.setAllocField("indexPct", "0"); page.setAllocField("maxSinglePct", "100");
  pageDocs.push(docFromStore());
  page.setAllocField("indexTicker", "กองทุนดัชนี"); pageDocs.push(docFromStore());
  page.setAllocField("indexTicker", new Array(80).join("x")); pageDocs.push(docFromStore());
  page.setAllocField("indexTicker", ""); pageDocs.push(docFromStore());
  page.setAllocField("indexTicker", " brk.b🚀 "); pageDocs.push(docFromStore());
  page.setAllocField("indexTicker", new Array(64).join("x") + "🚀z"); pageDocs.push(docFromStore());
}
t("page setters produced documents to check", pageDocs.length === 7, pageDocs.length);
pageDocs.forEach(function (d, i) { t("page-written doc #" + (i + 1) + " passes the validator", ok(d), d); });
t("page-written values look as expected (A.min 7.5 · C.max 0 · B.max 150 refused · META {} · indexTicker QQQM)",
  !!pageDocs[0] && pageDocs[0].tierConfig.tiers.A.min === 7.5 && pageDocs[0].tierConfig.tiers.C.max === 0 && pageDocs[0].tierConfig.tiers.B.max === undefined &&
  JSON.stringify(pageDocs[0].entryProgress.META) === "{}" && pageDocs[0].entryProgress.NVDA["2"] === true && pageDocs[0].allocPolicy.indexTicker === "QQQM" &&
  pageDocs[0].megaStance === "bearish" && pageDocs[1].megaStance === "bullish", pageDocs[0]);
t("page clamps a typed indexTicker to 64 chars (input has no maxlength)", !!pageDocs[3] && pageDocs[3].allocPolicy.indexTicker.length === V.PM_KEY_MAX_LEN, pageDocs[3] && pageDocs[3].allocPolicy);
t("blank indexTicker falls back to QQQM (page rule)", !!pageDocs[4] && pageDocs[4].allocPolicy.indexTicker === "QQQM");
t("indexTicker keeps ticker characters only, before the 64 cut: Thai → QQQM · ' brk.b🚀 ' → BRK.B · 63 x + emoji + z → 63 X + Z (no split surrogate)",
  !!pageDocs[6] && pageDocs[2].allocPolicy.indexTicker === "QQQM" && pageDocs[5].allocPolicy.indexTicker === "BRK.B" &&
  pageDocs[6].allocPolicy.indexTicker === new Array(64).join("X") + "Z", [pageDocs[2] && pageDocs[2].allocPolicy, pageDocs[5] && pageDocs[5].allocPolicy, pageDocs[6] && pageDocs[6].allocPolicy]);

// ---- Section C: normalizePmSetting (หน้า) → validator ผ่านเสมอ · ค่าที่ถูกอยู่แล้วไม่ถูกแก้ ----
console.log("== C. page normalizer mirrors the validator ==");
var KEYS = ["tierConfig", "entryProgress", "megaStance", "allocPolicy"];
function normDoc(raw) {
  var d = { v: 1, updatedAt: "2026-11-10T00:00:00.000Z" };
  KEYS.forEach(function (k) { if (raw[k] === undefined) return; var v = page.normalize(k, raw[k]); if (v !== undefined) d[k] = v; });
  return d;
}
if (page && page.normalize) {
  pageDocs.concat([FULL]).forEach(function (d, i) {
    var n = normDoc(d);
    t("normalize keeps a valid doc unchanged #" + (i + 1), KEYS.every(function (k) {
      if (d[k] === undefined) return n[k] === undefined;
      var want = k === "tierConfig" ? { map: d[k].map || {}, tiers: d[k].tiers || {} } : d[k];
      return JSON.stringify(n[k]) === JSON.stringify(want);
    }), { got: n, want: d });
  });
  var JUNK = [
    { tierConfig: { map: { NVDA: "D", META: "A", "": "B" }, tiers: { A: { min: -5, max: "7", target: 8 }, D: { max: 3 }, B: 7 }, extra: 1 } },
    { tierConfig: [], entryProgress: "x", megaStance: "sideways", allocPolicy: 7 },
    { entryProgress: { NVDA: { "1": true, "2": false, x: true, "1234": true }, META: true, QQQM: null } },
    { allocPolicy: { indexTicker: "", indexPct: 150, maxSinglePct: 0, splitMethod: "zzz", satellitePool: 50 } },
    { allocPolicy: { indexTicker: new Array(200).join("Y"), indexPct: -1, maxSinglePct: 100.0001 } },
    { tierConfig: { map: null, tiers: null }, entryProgress: [], megaStance: null, allocPolicy: [] },
    { tierConfig: JSON.parse('{"map":{"__proto__":"A","NVDA":"B"},"tiers":{}}'), entryProgress: JSON.parse('{"__proto__":{"1":true},"AMD":{"2":true}}') },
    { megaStance: "bearish", allocPolicy: { indexTicker: "QQQM", indexPct: 50 } },
    { allocPolicy: { indexTicker: "ก🚀" } },
    { allocPolicy: { indexTicker: new Array(64).join("q") + "🚀" } },
    { allocPolicy: { indexTicker: " brk.b " } }
  ];
  JUNK.forEach(function (raw, i) {
    var n = normDoc(raw);
    t("normalized junk #" + (i + 1) + " passes the validator", ok(n), n);
  });
  // fuzz: ค่าสุ่มทุกชนิด → normalize → validator ผ่าน
  var seed = 7;
  function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
  function junkVal(depth) {
    var r = rnd();
    if (depth > 2 || r < 0.15) return [null, true, false, 0, -1, 7.5, 101, "A", "B", "Z", "bullish", "bearish", "equal", "1", "", NaN, Infinity][Math.floor(rnd() * 17)];
    if (r < 0.25) return [junkVal(depth + 1), junkVal(depth + 1)];
    var o = {}, n = Math.floor(rnd() * 5);
    var keys = ["map", "tiers", "A", "B", "C", "D", "min", "max", "target", "1", "2", "99", "x", "NVDA", "indexTicker", "indexPct", "maxSinglePct", "splitMethod", ""];
    for (var j = 0; j < n; j++) o[keys[Math.floor(rnd() * keys.length)]] = junkVal(depth + 1);
    return o;
  }
  var fuzzBad = [];
  for (var f = 0; f < 3000; f++) {
    var raw = {};
    KEYS.forEach(function (k) { if (rnd() < 0.7) raw[k] = junkVal(0); });
    var nd = normDoc(raw);
    if (!ok(nd)) { fuzzBad.push(nd); if (fuzzBad.length > 3) break; }
  }
  t("fuzz: 3000 random local values → normalize → always accepted by the validator", fuzzBad.length === 0, fuzzBad.slice(0, 2));
}

// ---- Section B: Vercel handler (api/portfolio.js) ------------
console.log("== B. api/portfolio.js ?doc=pm ==");
process.env.SUPABASE_URL = "https://sb.test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "k";
process.env.APP_PASSWORD = "pw";
var handler = require("../api/portfolio.js");
var calls = [];
global.fetch = function (url, init) {
  calls.push({ url: String(url), method: (init && init.method) || "GET", body: init && init.body });
  return Promise.resolve({ ok: true, json: function () { return Promise.resolve([{ data: { v: 1, megaStance: "bearish" } }]); }, text: function () { return Promise.resolve(""); } });
};
function run(method, url, body, password) {
  calls = [];
  var req = { method: method, url: url, headers: { "x-portfolio-password": password === undefined ? "pw" : password }, body: body };
  var res = { statusCode: 0, headers: {}, setHeader: function (k, v) { this.headers[k] = v; }, end: function (s) { this.body = JSON.parse(s); } };
  return Promise.resolve(handler(req, res)).then(function () { return { res: res, calls: calls.slice() }; });
}
var PM_MSG = "Refusing to save: PM settings are malformed.";
function sectionB() {
  return run("GET", "/api/portfolio?doc=pm").then(function (x) {
    t("GET ?doc=pm reads row pm_settings_main", x.res.statusCode === 200 && x.calls.length === 1 && x.calls[0].url.indexOf("id=eq.pm_settings_main&") > 0, x.calls);
    t("GET ?doc=pm returns the row data", x.res.body && x.res.body.data && x.res.body.data.megaStance === "bearish", x.res.body);
    return run("PUT", "/api/portfolio?doc=pm", { data: FULL });
  }).then(function (x) {
    var row = x.calls.length === 1 && x.calls[0].body ? JSON.parse(x.calls[0].body)[0] : null;
    t("PUT ?doc=pm valid → 200 · POST upsert row pm_settings_main with the same data", x.res.statusCode === 200 && !!row && x.calls[0].method === "POST" && row.id === "pm_settings_main" &&
      JSON.stringify(row.data) === JSON.stringify(FULL), { status: x.res.statusCode, row: row });
    return run("PUT", "/api/portfolio?doc=pm", { data: { v: 1, megaStance: "sideways" } });
  }).then(function (x) {
    t("PUT ?doc=pm malformed → 400 '" + PM_MSG + "' and nothing written", x.res.statusCode === 400 && x.res.body.error === PM_MSG && x.calls.length === 0, { status: x.res.statusCode, body: x.res.body, calls: x.calls.length });
    return run("PUT", "/api/portfolio?doc=pm", { data: { quarters: { "2026-Q4": { assets: [] } } } });
  }).then(function (x) {
    t("PUT ?doc=pm with a portfolio blob → 400, nothing written (separate validator)", x.res.statusCode === 400 && x.res.body.error === PM_MSG && x.calls.length === 0, x.res.body);
    return run("PUT", "/api/portfolio?doc=pm", { data: null });
  }).then(function (x) {
    t("PUT ?doc=pm null → 400, nothing written", x.res.statusCode === 400 && x.calls.length === 0, x.res.body);
    return run("PUT", "/api/portfolio", { data: FULL });
  }).then(function (x) {
    t("PUT without doc still uses the portfolio validator (pm doc → 400 portfolio message)", x.res.statusCode === 400 && /portfolio data/.test(x.res.body.error) && x.calls.length === 0, x.res.body);
    return run("GET", "/api/portfolio");
  }).then(function (x) {
    t("GET without doc still reads row main", x.calls.length === 1 && x.calls[0].url.indexOf("id=eq.main&") > 0, x.calls);
    return run("GET", "/api/portfolio?doc=journal");
  }).then(function (x) {
    t("GET ?doc=journal still reads decision_journal_main", x.calls.length === 1 && x.calls[0].url.indexOf("id=eq.decision_journal_main") > 0, x.calls);
    return run("PUT", "/api/portfolio?doc=journal", { data: FULL });
  }).then(function (x) {
    t("PUT ?doc=journal with a pm doc → 400 journal message (validators not mixed)", x.res.statusCode === 400 && /journal data/.test(x.res.body.error) && x.calls.length === 0, x.res.body);
    return run("GET", "/api/portfolio?doc=xyz");
  }).then(function (x) {
    t("GET ?doc=xyz → 400 Unknown doc., no fetch", x.res.statusCode === 400 && x.res.body.error === "Unknown doc." && x.calls.length === 0, x.res.body);
    return run("PUT", "/api/portfolio?doc=PM", { data: FULL });
  }).then(function (x) {
    t("?doc=PM (case differs) → 400 Unknown doc., nothing written", x.res.statusCode === 400 && x.res.body.error === "Unknown doc." && x.calls.length === 0, x.res.body);
    return run("GET", "/api/portfolio?doc=pm", undefined, "wrong");
  }).then(function (x) {
    t("?doc=pm wrong password → 401 before any fetch", x.res.statusCode === 401 && x.calls.length === 0, x.res.statusCode);
    return run("PUT", "/api/portfolio?doc=pm", { data: FULL }, "wrong");
  }).then(function (x) {
    t("PUT ?doc=pm wrong password → 401, nothing written", x.res.statusCode === 401 && x.calls.length === 0, x.res.statusCode);
    var src = fs.readFileSync(path.join(__dirname, "..", "api", "portfolio.js"), "utf8");
    t("api/portfolio.js requires lib/pm-settings-validation", /require\("\.\.\/lib\/pm-settings-validation"\)/.test(src));
  });
}

sectionB().then(function () {
  t("page setters write localStorage synchronously and send nothing yet (the server save is debounced)", pageFetches.length === 0, pageFetches);
  finish();
}).catch(function (e) {
  fail++;
  console.error("  ✗ section B threw → " + (e && e.stack || e));
  finish();
});
