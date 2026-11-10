"use strict";
// ============================================================
// BigCache (public/big-cache.js) — ที่เก็บ cache ก้อนใหญ่ที่ดึงใหม่ได้ บน IndexedDB
//   node scripts/big-cache-test.js
//
// ที่มา (2026-11-10): localStorage ของ origin มีโควตา 5,242,880 ตัวอักษร — cache ราคา 3 ก้อน
//   (wave3_ohlc_v1 1.66M · home_rules_ohlc_v1 ≤0.99M · btc_intelligence_history_v1 0.38M) ถูกเขียนก่อน snapshot
//   ระหว่าง Load Latest Data → setItem(snapshot) ชน QuotaExceededError แบบเงียบ → เปลี่ยนหน้าแล้วกลับเป็นชุด 03 Nov
// ล็อก: memory fallback get/set/del/keys(prefix) · ไม่ reject ไม่ throw · migration ลบ 3 คีย์เก่าเท่านั้น
//   · ทาง IndexedDB (fake) ทำงานจริง + ถอยเป็น memory เมื่อ open พัง/ค้าง · รายการ EVICTABLE ไม่มีข้อมูลผู้ใช้
//   · ES5 · ทุกหน้าที่โหลด app-navigation.js โหลด big-cache.js ก่อนผู้ใช้ทุกตัว · ไม่มีโค้ด sync อ่านคีย์เก่าเหลืออยู่
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
function exists(name) { return fs.existsSync(path.join(PUB, name)); }

var VERSION = "20261110-bc-2";
var LEGACY = ["wave3_ohlc_v1", "home_rules_ohlc_v1", "btc_intelligence_history_v1"];
// คีย์ที่ห้ามถูกลบเพื่อคืนที่ (ต่อให้พื้นที่เต็ม): ข้อมูลผู้ใช้ / สถานะ
// + cache ที่ดึงใหม่แพงเกินจะลบทิ้ง (thai_dr_price_stats_v1 = สถิติราคา 12 ชม. ~260 คำขอ — ไม่ใช่ข้อมูลผู้ใช้)
var USER_KEYS = [
  "portfolio_dashboard_data_snapshot", "portfolioHoldingsDraft", "decision_journal_draft_v1", "theme", "portfolio_dashboard_theme",
  "thai_dr_inventory_v1", "thai_dr_overrides_v1", "thai_dr_ignored_v1", "thai_dr_toppick_v1",
  "thai_dr_price_stats_v1", // costly-to-refetch cache, kept on purpose
  "aiBoomUniverseUserAssets", "aiBoomUniverseRemovedAssetIds", "aiBoomUniverseWatchTickers", "aiBoomUniverseExcludedTickers",
  "smart_dca_journal_v1", "smart_dca_settings_v1", "portfolio_dashboard_bitcoin_onchain_imports", "scanner_custom_symbols",
  "thesisChangeLog_v1", "btc_forecast_log_v1", "home_action_recent_v1", "home_action_launched_v1", "home_action_horizon_v1",
  "mcx_regime_prev", "macro_ohlc_v1", "mc_sidebar_rail_v1", "thesis_selected_v1", "watchlistMigratedToUniverse_v1"
];

// ---------- fake localStorage ----------
function mkStorage(init) {
  var m = {};
  Object.keys(init || {}).forEach(function (k) { m[k] = String(init[k]); });
  var api = {
    _m: m,
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null; },
    setItem: function (k, v) { m[k] = String(v); },
    removeItem: function (k) { delete m[k]; },
    key: function (i) { return Object.keys(m)[i] === undefined ? null : Object.keys(m)[i]; }
  };
  Object.defineProperty(api, "length", { get: function () { return Object.keys(m).length; } });
  return api;
}

// ---------- fake IndexedDB (พอให้ทาง IDB ของ big-cache.js ทำงานจริง) ----------
function makeFakeIDB(opts) {
  opts = opts || {};
  var dbs = {};
  var factory = { opens: 0, puts: 0, gets: 0, dbs: dbs };
  function later(fn) { setTimeout(fn, 0); }
  function clone(v) { return v === undefined ? undefined : structuredClone(v); }
  function makeDb(rec) {
    var db = {
      objectStoreNames: { contains: function (n) { return Object.prototype.hasOwnProperty.call(rec.stores, n); } },
      createObjectStore: function (n) { rec.stores[n] = new Map(); return {}; },
      close: function () {},
      transaction: function (storeName) {
        if (opts.txThrows) throw new Error("fake tx failure");
        var st = rec.stores[storeName];
        if (!st) throw new Error("NotFoundError");
        var tx = { oncomplete: null, onerror: null, onabort: null, error: null };
        var failed = false;
        function finishTx() {
          later(function () {
            if (failed) {
              if (tx.onerror) tx.onerror({ target: tx });
              // errorThenComplete: เหมือน IndexedDB จริงเมื่อ error ของ request ถูก preventDefault — transaction ยัง complete ต่อ
              if (opts.errorThenComplete) { if (tx.oncomplete) tx.oncomplete({ target: tx }); }
              else if (tx.onabort) tx.onabort({ target: tx });
            }
            else if (tx.oncomplete) tx.oncomplete({ target: tx });
          });
        }
        function request(work) {
          var r = { result: undefined, error: null, onsuccess: null, onerror: null };
          later(function () {
            try { r.result = work(); if (r.onsuccess) r.onsuccess({ target: r }); }
            catch (e) { failed = true; r.error = e; tx.error = e; if (r.onerror) r.onerror({ target: r }); }
            finishTx();
          });
          return r;
        }
        tx.objectStore = function () {
          return {
            get: function (k) { factory.gets++; return request(function () { return clone(st.get(k)); }); },
            put: function (v, k) {
              factory.puts++;
              if (opts.putThrows) throw new Error("DataCloneError");
              if (opts.opHang) return { result: undefined, error: null, onsuccess: null, onerror: null };   // ค้างตลอด
              return request(function () { if (opts.putFails) throw new Error("QuotaExceededError"); st.set(k, clone(v)); return k; });
            },
            delete: function (k) {
              if (opts.opHang) return { result: undefined, error: null, onsuccess: null, onerror: null };
              return request(function () { st.delete(k); return undefined; });
            },
            getAllKeys: function (range) {
              return request(function () {
                var ks = Array.from(st.keys()).sort();
                if (!range) return ks;
                return ks.filter(function (k) { return k >= range.lower && k <= range.upper; });
              });
            }
          };
        };
        return tx;
      }
    };
    factory.lastDb = db;
    return db;
  }
  factory.open = function (name, version) {
    factory.opens++;
    if (opts.openThrows) throw new Error("SecurityError");
    var r = { result: undefined, error: null, onsuccess: null, onerror: null, onupgradeneeded: null, onblocked: null };
    if (opts.openNever) return r;
    later(function () {
      if (opts.openError) { r.error = new Error("UnknownError"); if (r.onerror) r.onerror({ target: r }); return; }
      var rec = dbs[name], upgrade = false;
      if (!rec) { rec = dbs[name] = { version: version, stores: {} }; upgrade = true; }
      r.result = makeDb(rec);
      if (upgrade && r.onupgradeneeded) r.onupgradeneeded({ target: r });
      if (r.onsuccess) r.onsuccess({ target: r });
    });
    return r;
  };
  return factory;
}
var FakeKeyRange = { bound: function (lo, hi) { return { lower: lo, upper: hi }; } };

// โหลด big-cache.js ลง sandbox ใหม่ (window = ตัวมันเอง) · คืน { ctx, ls }
function boot(o) {
  o = o || {};
  var win = {
    console: console, setTimeout: setTimeout, clearTimeout: clearTimeout, Promise: Promise
  };
  if (o.lsThrows) Object.defineProperty(win, "localStorage", { get: function () { throw new Error("SecurityError: access denied"); } });
  else win.localStorage = o.ls || mkStorage();
  if (o.idb) { win.indexedDB = o.idb; win.IDBKeyRange = FakeKeyRange; }
  win.window = win; win.self = win;
  var ctx = vm.createContext(win);
  var err = null;
  try { vm.runInContext(read("big-cache.js"), ctx, { filename: "big-cache.js" }); } catch (e) { err = e; }
  return { ctx: ctx, win: win, ls: o.lsThrows ? null : win.localStorage, err: err };
}

(async function () {
  console.log("== ไฟล์ + ES5 ==");
  var hasFile = exists("big-cache.js");
  t("public/big-cache.js exists", hasFile);
  if (!hasFile) { finish(); return; }
  var SRC = read("big-cache.js");
  var code = SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  t("big-cache.js is strict ES5 (no => / const / let / class / async / await / template literals)",
    !/=>|\bconst\s|\blet\s|\bclass\s|\basync\s|\bawait\s|`/.test(code), (/=>|\bconst\s|\blet\s|\bclass\s|\basync\s|\bawait\s|`/.exec(code) || [])[0]);
  t("big-cache.js is an IIFE with \"use strict\" exposing window.BigCache + module.exports",
    /^\s*(\/\/[^\n]*\n|\s)*\(function/.test(SRC) && /"use strict"/.test(SRC) && /\.BigCache\s*=/.test(SRC) && /module\.exports\s*=/.test(SRC));

  console.log("== module.exports (Node, ไม่มี IndexedDB) ==");
  var BCnode = null;
  try { BCnode = require("../public/big-cache.js"); } catch (e) { BCnode = null; console.error("   require: " + e.message); }
  t("require() returns the API", !!BCnode && typeof BCnode.get === "function" && typeof BCnode.set === "function" &&
    typeof BCnode.del === "function" && typeof BCnode.keys === "function");

  console.log("== migration: ลบ 3 คีย์เก่า ไม่แตะอย่างอื่น ==");
  var init = {};
  LEGACY.forEach(function (k, i) { init[k] = "x".repeat(1000 * (i + 1)); });
  USER_KEYS.forEach(function (k) { init[k] = "user:" + k; });
  init.decision_journal_ohlc_v1 = "{\"NVDA\":{}}";
  init.scanner_results_v1 = "{}";
  var b1 = boot({ ls: mkStorage(init) });
  t("boots without throwing", !b1.err, b1.err && b1.err.message);
  var BC = b1.win.BigCache;
  t("window.BigCache exposed with get/set/del/keys", !!BC && ["get", "set", "del", "keys"].every(function (f) { return typeof BC[f] === "function"; }));
  t("the three legacy localStorage keys are gone after load", LEGACY.every(function (k) { return b1.ls.getItem(k) === null; }),
    LEGACY.filter(function (k) { return b1.ls.getItem(k) !== null; }));
  var untouched = Object.keys(init).filter(function (k) { return LEGACY.indexOf(k) < 0; });
  t("every other key is untouched (same value, same count)", untouched.every(function (k) { return b1.ls.getItem(k) === init[k]; }) &&
    b1.ls.length === untouched.length, untouched.filter(function (k) { return b1.ls.getItem(k) !== init[k]; }));
  t("BigCache.LEGACY_KEYS = the three keys", !!BC && JSON.stringify(BC.LEGACY_KEYS) === JSON.stringify(LEGACY), BC && BC.LEGACY_KEYS);
  t("migration reports what it removed (BigCache.migrated)", !!BC && Array.isArray(BC.migrated) && BC.migrated.slice().sort().join() === LEGACY.slice().sort().join(), BC && BC.migrated);
  var b1b = boot({ ls: mkStorage({ theme: "dark" }) });
  t("no legacy keys → nothing removed, nothing else touched", b1b.win.BigCache.migrated.length === 0 && b1b.ls.getItem("theme") === "dark" && b1b.ls.length === 1);
  var b1c = boot({ lsThrows: true });
  t("localStorage access throws (privacy mode) → load does not throw, API still works", !b1c.err && !!b1c.win.BigCache && typeof b1c.win.BigCache.get === "function",
    b1c.err && b1c.err.message);

  console.log("== memory fallback (ไม่มี IndexedDB) ==");
  var M = b1.win.BigCache;
  t("backend() = memory when indexedDB is missing", (await M.backend()) === "memory");
  t("get(missing) → null", (await M.get("wave3_ohlc_v1:SPY")) === null);
  var rec = { u: "2026-11-10", d: ["2026-11-07"], c: [1], v: [2] };
  t("set → true", (await M.set("wave3_ohlc_v1:SPY", rec)) === true);
  await M.set("wave3_ohlc_v1:QQQ", { u: "x" });
  await M.set("home_rules_ohlc_v1:NVDA", { at: "2026-11-10" });
  var got = await M.get("wave3_ohlc_v1:SPY");
  t("get after set returns the stored value", !!got && got.u === "2026-11-10" && got.c[0] === 1, got);
  t("keys(prefix) returns only that prefix, sorted", JSON.stringify(await M.keys("wave3_ohlc_v1:")) === JSON.stringify(["wave3_ohlc_v1:QQQ", "wave3_ohlc_v1:SPY"]),
    await M.keys("wave3_ohlc_v1:"));
  t("keys('') / keys() returns everything", (await M.keys("")).length === 3 && (await M.keys()).length === 3);
  t("del → true and the record is gone", (await M.del("wave3_ohlc_v1:QQQ")) === true && (await M.get("wave3_ohlc_v1:QQQ")) === null &&
    (await M.keys("wave3_ohlc_v1:")).join() === "wave3_ohlc_v1:SPY");
  t("keys named like Object.prototype members are plain records", (await M.set("__proto__", { a: 1 })) === true && (await M.get("__proto__")).a === 1 &&
    (await M.get("constructor")) === null && (await M.del("__proto__")) === true);
  var neverRejects = true;
  var odd = [undefined, null, 42, {}, ""];
  for (var i = 0; i < odd.length; i++) {
    try { await M.get(odd[i]); await M.set(odd[i], 1); await M.del(odd[i]); await M.keys(odd[i]); }
    catch (e) { neverRejects = false; }
  }
  t("odd keys never reject / throw", neverRejects);
  t("get(undefined) → null", (await M.get(undefined)) === null);

  console.log("== IndexedDB (fake) ==");
  var idb = makeFakeIDB();
  var b2 = boot({ idb: idb });
  var I = b2.win.BigCache;
  t("backend() = indexeddb when the factory opens", (await I.backend()) === "indexeddb");
  t("IDB set → true and the record is in the object store", (await I.set("wave3_ohlc_v1:SPY", rec)) === true &&
    !!idb.dbs.portfolio_dashboard_cache && idb.dbs.portfolio_dashboard_cache.stores.kv.has("wave3_ohlc_v1:SPY"), Object.keys(idb.dbs));
  var g2 = await I.get("wave3_ohlc_v1:SPY");
  t("IDB get returns the stored value", !!g2 && g2.u === rec.u && g2.c[0] === 1, g2);
  t("IDB get(missing) → null", (await I.get("nope")) === null);
  await I.set("home_rules_ohlc_v1:NVDA", { at: "a" });
  await I.set("home_rules_ohlc_v1:AMD", { at: "b" });
  t("IDB keys(prefix) uses a key range and sorts", JSON.stringify(await I.keys("home_rules_ohlc_v1:")) === JSON.stringify(["home_rules_ohlc_v1:AMD", "home_rules_ohlc_v1:NVDA"]),
    await I.keys("home_rules_ohlc_v1:"));
  t("IDB del → true and gone", (await I.del("home_rules_ohlc_v1:AMD")) === true && (await I.get("home_rules_ohlc_v1:AMD")) === null);
  t("the DB is opened once per page (connection reused)", idb.opens === 1, idb.opens);
  var b2b = boot({ idb: idb });   // หน้าใหม่ origin เดียวกัน → ข้อมูลยังอยู่
  t("a new page load sees records written by the previous page", ((await b2b.win.BigCache.get("wave3_ohlc_v1:SPY")) || {}).u === rec.u);

  var b3 = boot({ idb: makeFakeIDB({ openThrows: true }) });
  t("indexedDB.open throws → memory fallback, still works", (await b3.win.BigCache.backend()) === "memory" &&
    (await b3.win.BigCache.set("k", 1)) === true && (await b3.win.BigCache.get("k")) === 1);
  var b4 = boot({ idb: makeFakeIDB({ openError: true }) });
  t("open fires onerror → memory fallback", (await b4.win.BigCache.backend()) === "memory" && (await b4.win.BigCache.set("k", 2)) === true && (await b4.win.BigCache.get("k")) === 2);
  var b5 = boot({ idb: makeFakeIDB({ openNever: true }) });
  b5.win.BigCache.OPEN_TIMEOUT_MS = 40;
  var t0 = Date.now();
  var bk5 = await b5.win.BigCache.backend();
  t("open never answers → falls back to memory after OPEN_TIMEOUT_MS (no hang)", bk5 === "memory" && Date.now() - t0 < 2000, [bk5, Date.now() - t0]);
  var b6 = boot({ idb: makeFakeIDB({ putFails: true }) });
  var s6 = await b6.win.BigCache.set("k", { a: 1 });
  t("IDB put fails → set resolves false (no reject) and the value is kept in memory for this page", s6 === false &&
    ((await b6.win.BigCache.get("k")) || {}).a === 1, s6);
  var b7 = boot({ idb: makeFakeIDB({ putThrows: true }) });
  t("IDB put throws synchronously → set resolves false", (await b7.win.BigCache.set("k", 1)) === false);
  var b8 = boot({ idb: makeFakeIDB({ txThrows: true }) });
  var r8 = null, ok8 = true;
  try { r8 = [await b8.win.BigCache.get("k"), await b8.win.BigCache.set("k", 3), await b8.win.BigCache.keys("k"), await b8.win.BigCache.del("k")]; } catch (e) { ok8 = false; }
  t("transaction() throws → every op resolves (never rejects)", ok8 && r8[0] === null && r8[1] === false && Array.isArray(r8[2]), r8);

  console.log("== รายการคีย์ที่ลบคืนที่ได้ (EVICTABLE_KEYS) ==");
  var EV = (M.EVICTABLE_KEYS || []);
  t("EVICTABLE_KEYS includes the three legacy keys", LEGACY.every(function (k) { return EV.indexOf(k) >= 0; }), EV);
  t("EVICTABLE_KEYS has no user-data / state key", USER_KEYS.every(function (k) { return EV.indexOf(k) < 0; }),
    USER_KEYS.filter(function (k) { return EV.indexOf(k) >= 0; }));
  t("EVICTABLE_KEYS is small and explicit (≤ 12 literal keys, no wildcards)", EV.length > 3 && EV.length <= 12 &&
    EV.every(function (k) { return typeof k === "string" && /^[A-Za-z0-9_]+$/.test(k); }), EV);
  // ทุกคีย์ในรายการต้องมีผู้เขียนจริงในเว็บ (ไม่ใช่ชื่อเดา)
  var allSrc = fs.readdirSync(PUB).filter(function (f) { return /\.js$/.test(f) && f !== "big-cache.js"; })
    .map(function (f) { return read(f); }).join("\n");
  t("every evictable key is a real key used somewhere in public/*.js", EV.every(function (k) { return LEGACY.indexOf(k) >= 0 || allSrc.indexOf('"' + k + '"') >= 0; }),
    EV.filter(function (k) { return LEGACY.indexOf(k) < 0 && allSrc.indexOf('"' + k + '"') < 0; }));
  var evLs = mkStorage(init);
  EV.forEach(function (k) { evLs.setItem(k, "cache"); });
  var removed = M.evictLocalCaches(evLs);
  t("evictLocalCaches removes exactly the evictable keys present and reports them", EV.every(function (k) { return evLs.getItem(k) === null; }) &&
    removed.slice().sort().join() === EV.slice().sort().join() &&
    USER_KEYS.every(function (k) { return evLs.getItem(k) === init[k]; }), removed);
  var throwing = { getItem: function () { throw new Error("x"); }, removeItem: function () { throw new Error("x"); } };
  var thrown = false;
  try { M.evictLocalCaches(throwing); } catch (e) { thrown = true; }
  t("evictLocalCaches never throws", !thrown);

  console.log("== หน้าเว็บโหลด big-cache.js ==");
  var htmls = fs.readdirSync(PUB).filter(function (f) { return /\.html$/.test(f); });
  var CONSUMERS = ["data-snapshot.js", "wave3-engine.js", "home-action-page.js", "bitcoin-intelligence.js", "bitcoin-intelligence-page.js", "app-navigation.js"];
  var bad = [];
  htmls.forEach(function (h) {
    var s = read(h);
    var uses = CONSUMERS.filter(function (c) { return s.indexOf("/" + c + "?v=") >= 0; });
    if (!uses.length) return;
    var at = s.indexOf('<script src="/big-cache.js?v=' + VERSION + '"');
    if (at < 0) { bad.push(h + ": ไม่โหลด big-cache.js?v=" + VERSION); return; }
    uses.forEach(function (c) { if (s.indexOf("/" + c + "?v=") < at) bad.push(h + ": " + c + " มาก่อน big-cache.js"); });
    if (s.split("/big-cache.js?v=").length !== 2) bad.push(h + ": โหลด big-cache.js ซ้ำ");
  });
  t("every page that loads app-navigation / data-snapshot / a cache consumer loads /big-cache.js?v=" + VERSION + " once, before all of them", bad.length === 0, bad);
  t("app-navigation.js still injects wave3-engine/bitcoin-intelligence dynamically (BigCache is resolved lazily at run time)",
    /ensureScript\("\/wave3-engine\.js\?v=/.test(read("app-navigation.js")) && /ensureScript\("\/bitcoin-intelligence\.js\?v=/.test(read("app-navigation.js")));

  console.log("== ความทนทาน (รีวิว 2026-11-10) ==");
  // A: งานค้าง → แท็บอื่นอัปเกรด (onversionchange ล้าง dbPromise) → timeout — set/del ต้องไม่ reject
  var idbA = makeFakeIDB({ opHang: true }), bA = boot({ idb: idbA }), BA = bA.win.BigCache;
  BA.OP_TIMEOUT_MS = 40;
  var pA = BA.set("wave3_ohlc_v1:SPY", { c: [1] }), pD = BA.del("wave3_ohlc_v1:QQQ");
  await new Promise(function (r) { setTimeout(r, 10); });
  if (idbA.lastDb && typeof idbA.lastDb.onversionchange === "function") idbA.lastDb.onversionchange();
  var rA = await pA.then(function (v) { return { ok: true, v: v }; }, function (e) { return { ok: false, e: String(e && e.message || e) }; });
  var rD = await pD.then(function (v) { return { ok: true, v: v }; }, function (e) { return { ok: false, e: String(e && e.message || e) }; });
  t("timeout after versionchange: set() resolves (false — kept in memory), never rejects", rA.ok === true && rA.v === false, rA);
  t("…and the value is still readable from this page's memory", JSON.stringify(await BA.get("wave3_ohlc_v1:SPY")) === JSON.stringify({ c: [1] }));
  t("timeout after versionchange: del() resolves false, never rejects", rD.ok === true && rD.v === false, rD);
  // B: request ล้มแต่ transaction ยัง complete (แบบ IndexedDB จริงเมื่อ error ถูก preventDefault) — ค่าต้องไม่หาย
  var idbB = makeFakeIDB({ putFails: true, errorThenComplete: true }), BB = boot({ idb: idbB }).win.BigCache;
  var rB = await BB.set("home_rules_ohlc_v1:NVDA", { at: "2026-11-10", bars: [[1]] });
  t("put fails then the transaction completes: set() reports false", rB === false, rB);
  t("…and the value stays in memory (not wiped by oncomplete)", JSON.stringify(await BB.get("home_rules_ohlc_v1:NVDA")) === JSON.stringify({ at: "2026-11-10", bars: [[1]] }));
  // C: เบราว์เซอร์ปิด connection เอง (onclose) → งานถัดไปเปิดฐานข้อมูลใหม่
  var idbC = makeFakeIDB(), BC = boot({ idb: idbC }).win.BigCache;
  await BC.set("btc_intelligence_history_v1:BTC", { d: [1] });
  var opensBefore = idbC.opens;
  t("db.onclose is wired", !!idbC.lastDb && typeof idbC.lastDb.onclose === "function");
  if (idbC.lastDb && typeof idbC.lastDb.onclose === "function") idbC.lastDb.onclose();
  var okC = await BC.set("btc_intelligence_history_v1:BTC", { d: [2] });
  t("after onclose the next call reopens the database and still writes", idbC.opens === opensBefore + 1 && okC === true, [opensBefore, idbC.opens, okC]);
  // D: ไม่มีอักขระ U+FFFF ดิบในซอร์ส (ใช้ escape \\uffff) — กันไฟล์เพี้ยนตอนแปลง encoding
  var BCS = read("big-cache.js");
  t("big-cache.js has no raw U+FFFF character (uses the \\uffff escape)", BCS.indexOf(String.fromCharCode(0xffff)) < 0 && BCS.indexOf("\\uffff") >= 0);

  console.log("== ไม่มีโค้ด sync อ่านคีย์เก่าใน localStorage เหลือ ==");
  var leftovers = [];
  fs.readdirSync(PUB).filter(function (f) { return /\.js$/.test(f) && f !== "big-cache.js"; }).forEach(function (f) {
    var s = read(f);
    LEGACY.forEach(function (k) {
      var re = new RegExp("(getItem|setItem|removeItem)\\(\\s*[\"']" + k + "[\"']");
      if (re.test(s)) leftovers.push(f + " · " + k);
    });
  });
  t("no public/*.js calls getItem/setItem/removeItem with a legacy key literal", leftovers.length === 0, leftovers);
  var W3 = read("wave3-engine.js"), BIE = read("bitcoin-intelligence.js"), BIP = read("bitcoin-intelligence-page.js"), HAP = read("home-action-page.js");
  t("wave3-engine.js no longer touches localStorage", !/localStorage/.test(W3.replace(/\/\/[^\n]*/g, "")));
  t("bitcoin-intelligence.js no longer touches localStorage", !/localStorage/.test(BIE.replace(/\/\/[^\n]*/g, "")));
  t("bitcoin-intelligence-page.js does not read the history from localStorage", !/localStorage[^\n]*btc_intelligence_history_v1/.test(BIP) && /BigCache/.test(BIP));
  t("home-action-page.js does not read/write/remove the OHLC cache via localStorage", !/ls(Get|Set|Remove)\(CACHE_KEY/.test(HAP) && !/removeItem\(CACHE_KEY/.test(HAP) && /BigCache/.test(HAP));

  finish();
})().catch(function (e) { fail++; console.error("  ✗ crashed: " + (e && e.stack || e)); finish(); });

function finish() {
  console.log("");
  console.log(pass + fail + " checks · " + pass + " passed · " + fail + " failed");
  process.exit(fail ? 1 : 0);
}
