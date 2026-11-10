"use strict";
// ============================================================
// Data Snapshot — บันทึกลง localStorage ต้องไม่ล้มแบบเงียบ
//   node scripts/data-snapshot-persist-test.js
//
// เหตุ (2026-11-10, ยืนยันใน Chrome 157): โควตา localStorage 5,242,880 ตัวอักษร/origin · cache ราคากินที่ก่อน
//   → setItem(snapshot) ชน QuotaExceededError → writeSnapshot กลืน error เก็บไว้แค่ใน memory
//   → กด Home อีกครั้งเห็น "DATA SNAPSHOT 03 Nov, 07:29 · ข้อมูลเก่า ควรโหลดใหม่"
// ล็อก (VM + localStorage ปลอมที่มีโควตาจริงแบบ Chrome: ทับคีย์เดิมนับเฉพาะส่วนต่าง):
//   ครั้งแรกเต็ม → ลบคีย์ cache ใน EVICTABLE แล้วลองใหม่ 1 ครั้ง → ที่เก็บได้ snapshotId ใหม่
//   เต็มถาวร → ไม่ throw · memory ยังเป็นชุดใหม่ · snapshot.persistError = "quota" · ยิง portfolio-data-snapshot
//   + portfolio-data-snapshot-persist-failed · หัวหน้า (app-navigation + mission-control) บอกคำเตือนภาษาไทย
//   ไม่ว่ากรณีไหน คีย์ข้อมูลผู้ใช้ไม่ถูกลบ
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
var STORAGE_KEY = "portfolio_dashboard_data_snapshot";
var DATA_VERSION = "2026-06-portfolio-dashboard-v1";
var WARN = "บันทึกข้อมูลลงเบราว์เซอร์ไม่สำเร็จ (พื้นที่เต็ม) — เปลี่ยนหน้าแล้วข้อมูลจะกลับเป็นชุดเก่า";
var SHORT = "บันทึกไม่สำเร็จ (พื้นที่เต็ม)";   // ป้ายสั้นบน pill ของหัวหน้า (ข้อความเต็ม WARN อยู่ใน title)
var LEGACY = ["wave3_ohlc_v1", "home_rules_ohlc_v1", "btc_intelligence_history_v1"];
var USER = {
  portfolioHoldingsDraft: "[{\"canonicalSymbol\":\"NVDA\"}]", decision_journal_draft_v1: "{\"doc\":{}}", theme: "dark",
  thai_dr_inventory_v1: "{\"inv\":1}", thai_dr_overrides_v1: "{\"o\":1}", smart_dca_journal_v1: "[]", smart_dca_settings_v1: "{}",
  aiBoomUniverseUserAssets: "[]", scanner_custom_symbols: "AAPL", macro_ohlc_v1: "{\"^TNX\":{}}", mcx_regime_prev: "{}",
  thesisChangeLog_v1: "[]", btc_forecast_log_v1: "[]", portfolio_dashboard_bitcoin_onchain_imports: "{}"
};

// ---------- localStorage ปลอม: โควตาเป็นจำนวนตัวอักษร (คีย์ + ค่า) แบบ Chrome ----------
function quotaError(k) {
  var e;
  try { e = new DOMException("Failed to execute 'setItem' on 'Storage': Setting the value of '" + k + "' exceeded the quota.", "QuotaExceededError"); }
  catch (x) { e = new Error("exceeded the quota"); e.name = "QuotaExceededError"; e.code = 22; }
  return e;
}
function mkStorage(quota, init) {
  var m = {};
  Object.keys(init || {}).forEach(function (k) { m[k] = String(init[k]); });
  function total() { var s = 0; Object.keys(m).forEach(function (k) { s += k.length + m[k].length; }); return s; }
  var api = {
    _m: m, _total: total, quota: quota, throwOnce: 0, sets: 0, alwaysThrowName: null,
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null; },
    setItem: function (k, v) {
      api.sets++;
      v = String(v);
      if (api.alwaysThrowName) { var se = new Error("The operation is insecure."); se.name = api.alwaysThrowName; throw se; }
      if (api.throwOnce > 0) { api.throwOnce--; throw quotaError(k); }
      var had = Object.prototype.hasOwnProperty.call(m, k);
      var next = total() - (had ? k.length + m[k].length : 0) + k.length + v.length;
      if (next > api.quota) throw quotaError(k);
      m[k] = v;
    },
    removeItem: function (k) { delete m[k]; },
    key: function (i) { var ks = Object.keys(m); return i < ks.length ? ks[i] : null; }
  };
  Object.defineProperty(api, "length", { get: function () { return Object.keys(m).length; } });
  return api;
}
function pad(n) { return "x".repeat(Math.max(0, n)); }
function snap(id, size) {
  return { snapshotId: id, dataVersion: DATA_VERSION, loadedAt: new Date().toISOString(), status: "ready", assets: [], prices: {},
    historicalData: { PAD: { closes: [], note: pad(size || 0) } }, technicalSignals: {}, rsiSignals: {}, errors: [] };
}
function storedId(ls) { try { return JSON.parse(ls.getItem(STORAGE_KEY)).snapshotId; } catch (e) { return null; } }
function storedHasFlag(ls) { var raw = ls.getItem(STORAGE_KEY) || ""; return raw.indexOf("persistError") >= 0; }
function userIntact(ls) { return Object.keys(USER).every(function (k) { return ls.getItem(k) === USER[k]; }); }

// ---------- sandbox ----------
function mkEvents() {
  var list = [], handlers = {};
  return {
    list: list,
    add: function (type, fn) { (handlers[type] = handlers[type] || []).push(fn); },
    dispatch: function (ev) { list.push(ev); (handlers[ev.type] || []).forEach(function (fn) { fn(ev); }); return true; }
  };
}
function CustomEventShim(type, init) { this.type = type; this.detail = init && init.detail; }
function fakeResponse(status, body) {
  var text = typeof body === "string" ? body : JSON.stringify(body);
  return { ok: status >= 200 && status < 300, status: status, text: function () { return Promise.resolve(text); }, json: function () { return Promise.resolve(JSON.parse(text)); } };
}
function marketPayload(sym) {
  var closes = [], dates = [], volumes = [];
  for (var i = 0; i < 260; i++) { closes.push(100 + Math.sin(i / 9) * 5 + i * 0.05); volumes.push(1000 + i); dates.push(new Date(Date.UTC(2025, 9, 1) + i * 86400000).toISOString().slice(0, 10)); }
  return { symbol: sym, dates: dates, closes: closes, volumes: volumes, latestClose: closes[259], latestDate: dates[259], source: "fixture", sourceType: "LIVE_MARKET_DATA" };
}
function fakeFetch(url) {
  var u = String(url);
  if (/^\/api\/ai-universe/.test(u)) return Promise.resolve(fakeResponse(200, { data: { userAssets: [] } }));
  if (/^\/api\/portfolio-holdings/.test(u)) return Promise.resolve(fakeResponse(200, { data: [] }));
  if (/^\/api\/market-risk/.test(u)) return Promise.resolve(fakeResponse(200, { risk: { score: 40 } }));
  if (/^\/api\/portfolio(\?|$)/.test(u)) return Promise.resolve(fakeResponse(200, { data: null }));
  var m = /^\/api\/market-data\?symbol=([^&]+)/.exec(u);
  if (m) return Promise.resolve(fakeResponse(200, marketPayload(decodeURIComponent(m[1]))));
  return Promise.resolve(fakeResponse(404, { error: "no fixture " + u }));
}
// โหลด big-cache.js + data-snapshot.js ตามลำดับของหน้าจริง · beforeBoot(ls) เตรียมของก่อนโหลด
function bootSnapshot(ls, withBigCache) {
  var ev = mkEvents();
  var win = {
    console: console, setTimeout: setTimeout, clearTimeout: clearTimeout, Promise: Promise, URL: URL,
    Response: typeof Response !== "undefined" ? Response : function () {}, CustomEvent: CustomEventShim,
    localStorage: ls, location: { origin: "http://localhost:4173" },
    addEventListener: ev.add, dispatchEvent: ev.dispatch, fetch: fakeFetch
  };
  win.window = win; win.self = win;
  var ctx = vm.createContext(win);
  if (withBigCache !== false) vm.runInContext(read("big-cache.js"), ctx, { filename: "big-cache.js" });
  vm.runInContext(read("data-snapshot.js"), ctx, { filename: "data-snapshot.js" });
  return { win: win, ev: ev, api: win.PortfolioDataSnapshot };
}
function evTypes(ev) { return ev.list.map(function (e) { return e.type; }).filter(function (x) { return x !== "portfolio-data-snapshot-progress"; }); }

(async function () {
  // ============================================================ 1 · เต็มครั้งแรก → ลบ cache → ลองใหม่สำเร็จ
  console.log("== 1 · เต็มครั้งแรก → ลบ cache ที่ดึงใหม่ได้ → ลองใหม่สำเร็จ ==");
  var QUOTA = 200000;
  var init1 = Object.assign({}, USER);
  init1[STORAGE_KEY] = JSON.stringify(snap("snapshot-OLD-0311", 40000));
  var ls1 = mkStorage(QUOTA, init1);
  var b1 = bootSnapshot(ls1);
  // แท็บเก่า (โค้ดก่อนแก้) ยังเปิดอยู่ → เขียน cache ก้อนใหญ่กลับเข้ามาหลังหน้านี้โหลด + cache อื่นที่ดึงใหม่ได้
  var EV = (b1.win.BigCache && b1.win.BigCache.EVICTABLE_KEYS) || [];
  ls1.setItem("wave3_ohlc_v1", pad(60000));
  ls1.setItem("home_rules_ohlc_v1", pad(30000));
  ls1.setItem("btc_intelligence_history_v1", pad(10000));
  ls1.setItem("decision_journal_ohlc_v1", pad(10000));
  ls1.setItem("scanner_results_v1", pad(5000));
  ls1.setItem("zz_fill_user_note", pad(QUOTA - ls1._total() - 5000 - 30));   // เหลือว่าง ~5k (คีย์นี้ไม่อยู่ในรายการ → ต้องไม่ถูกลบ)
  var fillVal = ls1.getItem("zz_fill_user_note");
  var s1 = snap("snapshot-NEW-1", 60000);
  var r1, threw1 = null;
  try { r1 = b1.api.write(s1); } catch (e) { threw1 = e; }
  t("write() does not throw", !threw1, threw1 && threw1.message);
  t("stored snapshot = the new snapshotId (evict + retry succeeded)", storedId(ls1) === "snapshot-NEW-1", storedId(ls1));
  t("memory snapshot = new, no persistError mark", b1.api.read() === s1 && !s1.persistError && r1 === s1);
  t("the evictable cache keys were removed", ["wave3_ohlc_v1", "home_rules_ohlc_v1", "btc_intelligence_history_v1", "decision_journal_ohlc_v1", "scanner_results_v1"]
    .every(function (k) { return ls1.getItem(k) === null; }), ls1._m && Object.keys(ls1._m));
  t("user-data keys + a non-listed key are untouched", userIntact(ls1) && ls1.getItem("zz_fill_user_note") === fillVal);
  t("events: portfolio-data-snapshot once, no persist-failed", evTypes(b1.ev).join() === "portfolio-data-snapshot", evTypes(b1.ev));
  t("persistNotice(new) → null · lastPersistError() → null", typeof b1.api.persistNotice === "function" && b1.api.persistNotice(s1) === null &&
    typeof b1.api.lastPersistError === "function" && b1.api.lastPersistError() === null);
  t("the stored JSON never carries a persistError field", !storedHasFlag(ls1));
  t("EVICTABLE list (from BigCache) has the legacy keys", LEGACY.every(function (k) { return EV.indexOf(k) >= 0; }), EV);

  // ============================================================ 2 · เต็มถาวร
  console.log("== 2 · เต็มถาวร (ข้อมูลผู้ใช้กินที่ ลบอะไรไม่ได้) ==");
  var init2 = Object.assign({}, USER);
  init2[STORAGE_KEY] = JSON.stringify(snap("snapshot-OLD-0311", 40000));
  var ls2 = mkStorage(QUOTA, init2);
  var b2 = bootSnapshot(ls2);
  ls2.setItem("scanner_results_v1", pad(3000));
  ls2.setItem("thai_dr_price_stats_v1", pad(QUOTA - ls2._total() - 2000 - 40));
  var before2 = JSON.stringify(Object.keys(ls2._m).filter(function (k) { return k !== "scanner_results_v1"; }).map(function (k) { return [k, ls2._m[k].length]; }));
  var s2 = snap("snapshot-NEW-2", 60000);
  var r2, threw2 = null;
  try { r2 = b2.api.write(s2); } catch (e) { threw2 = e; }
  t("write() does not throw", !threw2, threw2 && threw2.message);
  t("returns the new snapshot, marked persistError = \"quota\"", r2 === s2 && s2.persistError === "quota", s2.persistError);
  t("memory keeps the new copy (read() = new)", b2.api.read() === s2 && b2.api.read().snapshotId === "snapshot-NEW-2");
  t("stored copy is still the old one (nothing half-written)", storedId(ls2) === "snapshot-OLD-0311", storedId(ls2));
  var types2 = evTypes(b2.ev);
  t("events: portfolio-data-snapshot then portfolio-data-snapshot-persist-failed", types2.join() === "portfolio-data-snapshot,portfolio-data-snapshot-persist-failed", types2);
  var pf = b2.ev.list.filter(function (e) { return e.type === "portfolio-data-snapshot-persist-failed"; })[0];
  t("persist-failed detail: reason quota + snapshotId + the snapshot", !!pf && pf.detail && pf.detail.reason === "quota" && pf.detail.snapshotId === "snapshot-NEW-2" && pf.detail.snapshot === s2,
    pf && pf.detail && [pf.detail.reason, pf.detail.snapshotId]);
  var se = b2.ev.list.filter(function (e) { return e.type === "portfolio-data-snapshot"; })[0];
  t("portfolio-data-snapshot already carries the mark when listeners run", !!se && se.detail === s2 && se.detail.persistError === "quota");
  t("persistNotice → Thai warning text (exact)", (b2.api.persistNotice(s2) || {}).thai === WARN, b2.api.persistNotice(s2));
  t("lastPersistError() → quota", b2.api.lastPersistError() === "quota");
  t("only evictable caches were removed; every other key kept with the same size",
    ls2.getItem("scanner_results_v1") === null && before2 === JSON.stringify(Object.keys(ls2._m).map(function (k) { return [k, ls2._m[k].length]; })) && userIntact(ls2));
  t("freshness() is unchanged by the mark (still says fresh/recent by time)", typeof b2.api.freshness === "function" && b2.api.freshness(s2).key !== "unsaved");

  // a later write that fits clears the mark
  ls2.removeItem("thai_dr_price_stats_v1");
  var r2b = b2.api.write(s2);
  t("same object re-written after space frees up → stored = new, mark removed, notice null", storedId(ls2) === "snapshot-NEW-2" && !("persistError" in r2b) &&
    b2.api.persistNotice(r2b) === null && b2.api.lastPersistError() === null && !storedHasFlag(ls2));

  // ============================================================ 3 · setItem ล้มครั้งเดียว
  console.log("== 3 · setItem ล้มครั้งเดียว (ไม่มีอะไรให้ลบ) → ลองใหม่สำเร็จ ==");
  var ls3 = mkStorage(QUOTA, Object.assign({}, USER));
  var b3 = bootSnapshot(ls3);
  ls3.throwOnce = 1;
  var s3 = snap("snapshot-NEW-3", 1000);
  b3.api.write(s3);
  t("one transient QuotaExceededError → retried once → stored", storedId(ls3) === "snapshot-NEW-3" && !s3.persistError && evTypes(b3.ev).join() === "portfolio-data-snapshot",
    [storedId(ls3), s3.persistError, evTypes(b3.ev)]);
  t("…and user keys untouched", userIntact(ls3));

  // ============================================================ 4 · storage ปิด (SecurityError)
  console.log("== 4 · storage ใช้ไม่ได้ (ไม่ใช่เต็ม) ==");
  var ls4 = mkStorage(QUOTA, Object.assign({}, USER));
  var b4 = bootSnapshot(ls4);
  ls4.alwaysThrowName = "SecurityError";
  var s4 = snap("snapshot-NEW-4", 10);
  var threw4 = null;
  try { b4.api.write(s4); } catch (e) { threw4 = e; }
  t("non-quota failure: no throw, marked (not \"quota\"), warning without the 'พื้นที่เต็ม' claim", !threw4 && !!s4.persistError && s4.persistError !== "quota" &&
    /^บันทึกข้อมูลลงเบราว์เซอร์ไม่สำเร็จ/.test((b4.api.persistNotice(s4) || {}).thai || "") && !/พื้นที่เต็ม/.test((b4.api.persistNotice(s4) || {}).thai || ""),
    [s4.persistError, b4.api.persistNotice(s4)]);

  // ============================================================ 5 · loadLatestData ทั้งเส้น (near-full)
  console.log("== 5 · loadLatestData ทั้งเส้นตอนที่เก็บเกือบเต็ม ==");
  var init5 = Object.assign({}, USER);
  init5[STORAGE_KEY] = JSON.stringify(snap("snapshot-OLD-0311", 1000));
  var ls5 = mkStorage(600000, init5);
  var b5 = bootSnapshot(ls5);
  ls5.setItem("wave3_ohlc_v1", pad(250000));                    // แท็บเก่าเขียน cache ใหญ่กลับมา
  ls5.setItem("home_rules_ohlc_v1", pad(150000));
  ls5.setItem("zz_other", pad(600000 - ls5._total() - 20000)); // เหลือว่าง ~20k · snapshot ใหม่ใหญ่กว่านั้น
  var r5 = null, threw5 = null;
  try { r5 = await b5.api.loadLatestData(); } catch (e) { threw5 = e; }
  t("loadLatestData resolves", !threw5 && !!r5 && /^snapshot-\d+$/.test(r5.snapshotId), threw5 && threw5.message);
  t("stored snapshotId = the snapshot loadLatestData returned (survives navigation)", !!r5 && storedId(ls5) === r5.snapshotId && !r5.persistError,
    [storedId(ls5), r5 && r5.snapshotId, r5 && r5.persistError]);
  t("a fresh page (new VM, same storage) reads the new snapshot", (function () { var nb = bootSnapshot(ls5); var s = nb.api.read(); return !!s && !!r5 && s.snapshotId === r5.snapshotId; })());
  t("loadLatestData: legacy caches evicted, zz_other + user keys kept", ls5.getItem("wave3_ohlc_v1") === null && ls5.getItem("home_rules_ohlc_v1") === null &&
    ls5.getItem("zz_other") !== null && userIntact(ls5));

  // ============================================================ 6 · ไม่มี BigCache (หน้าโหลด big-cache.js ไม่ได้)
  console.log("== 6 · ไม่มี BigCache → ยังลองใหม่ + ทำเครื่องหมาย ไม่พัง ==");
  var ls6 = mkStorage(QUOTA, Object.assign({}, USER));
  var b6 = bootSnapshot(ls6, false);
  ls6.setItem("zz", pad(QUOTA - ls6._total() - 500));
  var s6 = snap("snapshot-NEW-6", 5000), threw6 = null;
  try { b6.api.write(s6); } catch (e) { threw6 = e; }
  t("no BigCache: no throw, marked quota, user keys kept", !threw6 && s6.persistError === "quota" && userIntact(ls6) && ls6.getItem("zz") !== null);

  // ============================================================ 7 · app-navigation fallback + หัวหน้า
  console.log("== 7 · app-navigation.js (fallback API + หัวหน้า) ==");
  var nav = bootNav();
  var api7 = nav.win.PortfolioDataSnapshot;
  t("fallback API created (no data-snapshot.js on the page)", !!api7 && typeof api7.write === "function" && typeof api7.persistNotice === "function");
  if (api7) {
    nav.ls.setItem("wave3_ohlc_v1", pad(60000));
    nav.ls.setItem("zz_user", pad(nav.ls.quota - nav.ls._total() - 3000));
    var s7 = snap("snapshot-NEW-7", 40000);    // ใหญ่กว่าชุดเก่า 30k → ส่วนต่าง 10k > ที่ว่าง 3k
    var threw7 = null;
    try { api7.write(s7); } catch (e) { threw7 = e; }
    t("fallback write: evict + retry → stored new, header says fresh", !threw7 && storedId(nav.ls) === "snapshot-NEW-7" && !s7.persistError &&
      nav.ls.getItem("wave3_ohlc_v1") === null && /ข้อมูลสด/.test(nav.el("appDataFreshness").textContent), [storedId(nav.ls), nav.el("appDataFreshness").textContent]);
    nav.ls.setItem("zz_user2", pad(nav.ls.quota - nav.ls._total() - 100));
    var s7b = snap("snapshot-NEW-7b", 70000);  // ไม่มี cache เหลือให้ลบแล้ว → เต็มถาวร
    try { api7.write(s7b); } catch (e) { threw7 = e; }
    var types7 = evTypes(nav.ev);
    t("fallback persistent failure: no throw, marked, memory new, stored old, persist-failed event", !threw7 && s7b.persistError === "quota" && api7.read() === s7b &&
      storedId(nav.ls) === "snapshot-NEW-7" && types7.indexOf("portfolio-data-snapshot-persist-failed") >= 0, [s7b.persistError, storedId(nav.ls), types7]);
    // pill = ป้ายสั้น (หัวหน้าจอแคบไม่ถูกดัน) · ข้อความเต็มอยู่ใน title
    t("app header pill shows the short Thai warning (full sentence in title) instead of 'ข้อมูลสด'", nav.el("appDataFreshness").textContent.indexOf(SHORT) >= 0 &&
      nav.el("appDataFreshness").getAttribute("title") === WARN && !/ข้อมูลสด/.test(nav.el("appDataFreshness").textContent),
      [nav.el("appDataFreshness").textContent, nav.el("appDataFreshness").getAttribute("title")]);
    t("app header pill: no forced width styles", !nav.el("appDataFreshness").style.minWidth && !nav.el("appDataFreshness").style.maxWidth);
    t("app header still shows the new load time (memory copy)", nav.el("appDataLoadedAt").textContent !== "ยังไม่มีข้อมูลล่าสุด");
    t("fallback: user keys never removed", ["portfolioHoldingsDraft", "theme", "thai_dr_inventory_v1"].every(function (k) { return nav.ls.getItem(k) === USER[k]; }) &&
      nav.ls.getItem("zz_user") !== null && nav.ls.getItem("zz_user2") !== null);
  }

  // ============================================================ 8 · หัวหน้า Home (mission-control-page updateSnapBar)
  console.log("== 8 · หัวหน้า Home (mission-control-page.js updateSnapBar) ==");
  var MC = read("mission-control-page.js");
  var fnSrc = grabFn(MC, "updateSnapBar");
  t("mission-control-page.js has updateSnapBar", !!fnSrc);
  if (fnSrc) {
    var homeLs = mkStorage(QUOTA, Object.assign({}, USER));
    var hb = bootSnapshot(homeLs);
    var els = { mcSnapTime: mkFakeEl(), mcSnapPill: mkFakeEl() };
    var current = null;
    var hctx = vm.createContext({ window: hb.win, document: { getElementById: function (id) { return els[id] || null; } }, Date: Date, console: console });
    vm.runInContext("var $ = function (id) { return document.getElementById(id); }; function snapshot() { return window.__cur; }\n" + fnSrc + "\nthis.updateSnapBar = updateSnapBar;", hctx);
    var fresh = snap("snapshot-H1", 10);
    fresh.loadedAt = new Date().toISOString();
    hb.win.__cur = fresh; hctx.updateSnapBar();
    t("home pill: normal snapshot → 'ข้อมูลสด'", /ข้อมูลสด/.test(els.mcSnapPill.textContent), els.mcSnapPill.textContent);
    fresh.persistError = "quota";
    hctx.updateSnapBar();
    t("home pill: marked snapshot → short Thai warning, full sentence in title", els.mcSnapPill.textContent.indexOf(SHORT) >= 0 &&
      els.mcSnapPill.getAttribute("title") === WARN && !/ข้อมูลสด/.test(els.mcSnapPill.textContent) && !els.mcSnapPill.style.minWidth,
      [els.mcSnapPill.textContent, els.mcSnapPill.getAttribute("title")]);
    t("home time still shows the new load time", els.mcSnapTime.textContent !== "—" && els.mcSnapTime.textContent.length > 0);
    delete fresh.persistError;
    hctx.updateSnapBar();
    t("home pill: mark cleared → back to 'ข้อมูลสด' and the title is removed", /ข้อมูลสด/.test(els.mcSnapPill.textContent) &&
      els.mcSnapPill.textContent.indexOf(SHORT) < 0 && els.mcSnapPill.getAttribute("title") === null);
    current = null;
  }
  t("mission-control-page.js listens for portfolio-data-snapshot-persist-failed", /portfolio-data-snapshot-persist-failed/.test(MC));
  t("no advisory wording added in the warning", !/ควรซื้อ|ควรขาย|น่าซื้อ|น่าขาย|น่าเข้า|แนะนำซื้อ|จุดเข้า|ตัดขาดทุน/.test(WARN));

  finish();
})().catch(function (e) { fail++; console.error("  ✗ crashed: " + (e && e.stack || e)); finish(); });

// ---------- app-navigation.js ใน VM (DOM ขั้นต่ำ) ----------
function mkFakeEl(tag) {
  var el = {
    tagName: String(tag || "div").toUpperCase(), children: [], textContent: "", innerHTML: "", hidden: false, disabled: false, id: "",
    dataset: {}, style: {}, attributes: {}, title: "", className: "",
    classList: { _s: {}, add: function (c) { this._s[c] = 1; }, remove: function (c) { delete this._s[c]; }, toggle: function (c) { if (this._s[c]) { delete this._s[c]; return false; } this._s[c] = 1; return true; }, contains: function (c) { return !!this._s[c]; } },
    appendChild: function (c) { this.children.push(c); return c; },
    setAttribute: function (k, v) { this.attributes[k] = String(v); if (k === "title") this.title = String(v); },
    removeAttribute: function (k) { delete this.attributes[k]; if (k === "title") this.title = ""; },
    getAttribute: function (k) { return this.attributes[k] === undefined ? null : this.attributes[k]; },
    addEventListener: function () {}, blur: function () {}
  };
  Object.defineProperty(el, "firstElementChild", { get: function () { return this.children[0] || null; } });
  return el;
}
function bootNav() {
  var ls = mkStorage(200000, Object.assign({}, USER));
  ls.setItem(STORAGE_KEY, JSON.stringify(snap("snapshot-OLD-0311", 30000)));
  var byId = {};
  ["appDataLoadedAt", "appDataFreshness", "appDataCounts", "appRetryFailedButton", "appLoadDataButton"].forEach(function (id) { byId[id] = mkFakeEl(); byId[id].id = id; });
  var ev = mkEvents();
  var doc = {
    readyState: "complete",
    getElementById: function (id) { return byId[id] || null; },
    querySelector: function (sel) { var m = /^#([A-Za-z0-9_-]+)$/.exec(sel); return m ? (byId[m[1]] || null) : null; },
    querySelectorAll: function () { return []; },
    createElement: function (tag) { return mkFakeEl(tag); },
    head: mkFakeEl("head"),
    body: mkFakeEl("body"),
    addEventListener: function () {}
  };
  var win = {
    console: console, setTimeout: function () { return 0; }, clearTimeout: function () {}, Promise: Promise, URL: URL, Intl: Intl,
    Response: typeof Response !== "undefined" ? Response : function () {}, CustomEvent: CustomEventShim,
    document: doc, localStorage: ls, location: { origin: "http://localhost:4173", pathname: "/catalyst-hunter" },
    addEventListener: ev.add, dispatchEvent: ev.dispatch, fetch: fakeFetch
  };
  win.window = win; win.self = win;
  var ctx = vm.createContext(win);
  vm.runInContext(read("big-cache.js"), ctx, { filename: "big-cache.js" });
  vm.runInContext(read("app-navigation.js"), ctx, { filename: "app-navigation.js" });
  return { win: win, ls: ls, ev: ev, el: function (id) { return byId[id]; } };
}
// ดึงฟังก์ชันระดับบนของ IIFE ตามการย่อหน้า (2 ช่อง) — ตัวจริงที่ส่ง ไม่ใช่สำเนา
function grabFn(src, name) {
  var re = new RegExp("\\n  function " + name + "\\(");
  var m = re.exec(src);
  if (!m) return null;
  var start = m.index + 1;
  var end = src.indexOf("\n  }\n", start);
  return end < 0 ? null : src.slice(start, end + 4);
}
function finish() {
  console.log("");
  console.log(pass + fail + " checks · " + pass + " passed · " + fail + " failed");
  process.exit(fail ? 1 : 0);
}
