// ============================================================
// ล็อกกติกา "จำผลสแกน" ของหน้า Catalyst Hunter
// เหตุที่ต้องมีเทสต์ชุดนี้: เวอร์ชันก่อนเขียน cache ลง localStorage
// ซึ่งรับได้ ~5 MB แต่ payload จริง 25.8 MB → setItem throw → catch กลืนเงียบ
// ผลคือ "ไม่เคยจำได้เลย" และผู้ใช้ต้องสแกนใหม่ทุกครั้งโดยไม่มีใครรู้
// เทสต์นี้จึงยืนยันว่า: จำได้จริง · เปิดใหม่ไม่ยิง API · จำไม่ได้ต้องบอก
// ============================================================
"use strict";
var vm = require("vm"), fs = require("fs"), path = require("path");
var PUB = path.join(__dirname, "..", "public");
var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + (extra != null ? "  → " + extra : "")); }
}

// ---------- ข้อมูลราคาสังเคราะห์ ----------
function series(n, base, drop) {
  var closes = [], dates = [], volumes = [], d = new Date(Date.UTC(2021, 0, 4));
  for (var i = 0; i < n; i++) {
    var frac = i / (n - 1);
    closes.push(+(base * (1 - drop * Math.min(1, frac * 1.2))).toFixed(2));
    volumes.push(1000000 + i * 10);
    dates.push(d.toISOString().slice(0, 10));
    d = new Date(d.getTime() + 86400000 * (d.getUTCDay() === 5 ? 3 : 1));
  }
  return { closes: closes, dates: dates, volumes: volumes };
}
var BARS = 800;
var bench = series(BARS, 1400, 0.05).closes;
function apiItem(tk, drop) {
  var s = series(BARS, 40, drop);
  return { ticker: tk, name: tk + " PCL", market: "SET", universe: "SET100",
    dates: s.dates, closes: s.closes, volumes: s.volumes, bars: BARS,
    source: "test", sourceType: "LIVE_MARKET_DATA", range: "5y" };
}
var fakeApi = { total: 3, offset: 0, scanned: 3, done: true, nextOffset: null,
  universe: "THAI_ALL",
  universeMeta: { source: "SET registry (test)", asOf: "2026-09-07T00:00:00.000Z",
    degraded: false, note: null, counts: { set: 2, mai: 1, total: 3 } },
  benchmark: { symbol: "^SET.BK", closes: bench, available: true },
  items: [apiItem("AAA", 0.55), apiItem("BBB", 0.2), apiItem("CCC", 0.7)], failed: [] };

// ---------- สภาพแวดล้อมจำลอง ----------
function mkEl(id) {
  return { id: id, innerHTML: "", value: "", style: {}, attrs: {},
    appendChild: function () {}, setAttribute: function (k, v) { this.attrs[k] = v; },
    getAttribute: function (k) { return this.attrs[k] || null; },
    addEventListener: function () {}, querySelector: function () { return null; },
    querySelectorAll: function () { return []; }, closest: function () { return null; },
    focus: function () {}, setSelectionRange: function () {},
    classList: { add: function () {}, remove: function () {}, contains: function () { return false; } } };
}
// IndexedDB จำลอง: ไม่มีเพดาน (เหมือนของจริงที่รับหลายสิบ MB)
function mkIdb(store, opts) {
  opts = opts || {};
  function req(fn) {
    var r = { onsuccess: null, onerror: null, result: null, error: null };
    setTimeout(function () {
      try { r.result = fn(); if (r.onsuccess) r.onsuccess(); }
      catch (e) { r.error = e; if (r.onerror) r.onerror(); }
    }, 0);
    return r;
  }
  return { open: function () {
    if (opts.openFails) {
      var bad = { onsuccess: null, onerror: null, error: new Error("blocked") };
      setTimeout(function () { if (bad.onerror) bad.onerror(); }, 0);
      return bad;
    }
    var db = { objectStoreNames: { contains: function () { return true; } },
      createObjectStore: function () {}, close: function () {},
      transaction: function () {
        var tx = { oncomplete: null, onerror: null, onabort: null, error: null };
        tx.objectStore = function () {
          return {
            put: function (v, k) {
              if (opts.writeFails) {
                tx.error = new Error("idb-write-failed");
                setTimeout(function () { if (tx.onabort) tx.onabort(); }, 0);
                return;
              }
              store[k] = JSON.parse(JSON.stringify(v));
              setTimeout(function () { if (tx.oncomplete) tx.oncomplete(); }, 0);
            },
            get: function (k) { return req(function () { return k in store ? store[k] : null; }); },
          };
        };
        return tx;
      } };
    return req(function () { return db; });
  } };
}
var LS_CAP = 5 * 1024 * 1024;   // เพดาน localStorage จริงโดยประมาณ
function boot(shared, opts) {
  opts = opts || {};
  var els = {};
  var doc = { readyState: "complete", createElement: mkEl, addEventListener: function () {},
    getElementById: function (id) { if (!els[id]) els[id] = mkEl(id); return els[id]; },
    querySelector: function () { return mkEl(); }, querySelectorAll: function () { return []; },
    body: mkEl("body"), documentElement: mkEl("html") };
  var fetches = 0;
  var win = { document: doc,
    location: { search: "", pathname: "/catalyst-hunter" },
    history: { pushState: function () {}, replaceState: function () {} },
    localStorage: {
      getItem: function (k) { return k in shared.ls ? shared.ls[k] : null; },
      setItem: function (k, v) {
        if (opts.lsFails) { var e0 = new Error("denied"); e0.name = "SecurityError"; throw e0; }
        var tot = Object.keys(shared.ls).reduce(function (a, x) { return a + shared.ls[x].length; }, 0);
        if (tot + String(v).length > LS_CAP) {
          var e = new Error("quota"); e.name = "QuotaExceededError"; throw e;
        }
        shared.ls[k] = String(v);
      },
      removeItem: function (k) { delete shared.ls[k]; },
    },
    addEventListener: function () {},
    fetch: function () {
      fetches++;
      return Promise.resolve({ ok: true, json: function () { return Promise.resolve(fakeApi); } });
    },
    console: console, Math: Math, JSON: JSON, Date: Date, Number: Number, String: String,
    Object: Object, Array: Array, Boolean: Boolean, isFinite: isFinite, isNaN: isNaN,
    parseInt: parseInt, parseFloat: parseFloat, Promise: Promise, RegExp: RegExp, Error: Error,
    encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent,
    setTimeout: setTimeout, clearTimeout: clearTimeout, Intl: Intl };
  if (!opts.noIdb) win.indexedDB = mkIdb(shared.idb, opts);
  win.window = win; win.self = win;
  var ctx = vm.createContext(win);
  ["catalyst-engine.js", "catalyst-data.js", "catalyst-page.js"].forEach(function (f) {
    vm.runInContext(fs.readFileSync(PUB + "/" + f, "utf8"), ctx, { filename: f });
  });
  return { win: win, els: els, fetches: function () { return fetches; } };
}
function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

(async function () {
  console.log("== เปิดหน้าครั้งแรก: ยังไม่มีอะไรจำไว้ ==");
  var shared = { idb: {}, ls: {} };
  var a = boot(shared);
  await wait(40);
  t("ยังไม่มีผลที่จำไว้ → ไม่ยิง API เอง", a.fetches() === 0, a.fetches());
  await wait(80);
  t("อ่าน cache จบแล้วจึงขึ้นสถานะให้กดสแกน",
    a.els.chRoot.innerHTML.indexOf("ยังไม่ได้สแกน") >= 0);
  t("บอกผู้ใช้ว่าสแกนครั้งเดียวพอ เพราะจะจำไว้",
    a.els.chRoot.innerHTML.indexOf("สแกนครั้งเดียวพอ") >= 0);

  console.log("\n== สแกนแล้วต้องจำได้จริง ==");
  await a.win.CatalystPage.scanAll(true);
  await wait(60);
  var st1 = a.win.CatalystPage._state;
  t("สแกนได้ครบ", st1.rows.length === 3, st1.rows.length);
  t("เก็บลง IndexedDB (ไม่ใช่ localStorage)", st1.cache.where === "idb", st1.cache.where);
  t("ไม่มีคำเตือนว่าจำไม่ได้", !st1.cache.note, st1.cache.note);
  t("มีของอยู่ใน IndexedDB จริง", Object.keys(shared.idb).length === 1,
    Object.keys(shared.idb).join(","));
  t("ไม่ทิ้งขยะไว้ใน localStorage", Object.keys(shared.ls).length === 0,
    Object.keys(shared.ls).join(","));
  t("เก็บเป็น input ไม่ใช่ผลวิเคราะห์ (ต้องไม่มี qualification ใน cache)",
    JSON.stringify(shared.idb).indexOf('"qualification"') < 0);
  var h1 = a.els.chRoot.innerHTML;
  t("หน้าแจ้งว่าจำไว้แล้ว", h1.indexOf("จำผลสแกนไว้แล้ว") >= 0);
  t("หน้าแสดงอายุของผลสแกน", h1.indexOf("ch-age") >= 0);

  console.log("\n== เปิดหน้าใหม่: ต้องไม่สแกนซ้ำ ==");
  var b = boot(shared);
  await wait(180);
  var st2 = b.win.CatalystPage._state;
  t("เปิดใหม่ไม่ยิง API เลย", b.fetches() === 0, b.fetches());
  t("ได้ข้อมูลครบเท่าเดิม", st2.rows.length === st1.rows.length,
    st2.rows.length + " vs " + st1.rows.length);
  t("รู้ตัวว่าโหลดจากผลที่จำไว้", st2.cache.loadedFromCache === true);
  t("หน้าบอกผู้ใช้ว่าเป็นผลที่จำไว้", b.els.chRoot.innerHTML.indexOf("ผลที่จำไว้") >= 0);
  t("ไม่ขึ้น “ยังไม่ได้สแกน” ทั้งที่มีผลอยู่",
    b.els.chRoot.innerHTML.indexOf("ยังไม่ได้สแกน") < 0);

  console.log("\n== ผลจาก cache ต้องตรงกับสแกนสด ==");
  var kOf = function (r) { return r.qualification ? r.qualification.state.key : "-"; };
  var m1 = {}, m2 = {}, diff = [];
  st1.rows.forEach(function (r) { m1[r.ticker] = kOf(r); });
  st2.rows.forEach(function (r) { m2[r.ticker] = kOf(r); });
  Object.keys(m1).forEach(function (x) { if (m1[x] !== m2[x]) diff.push(x); });
  t("สถานะ qualification ตรงกันทุกตัว", diff.length === 0, diff.join(","));
  var rsDiff = st1.rows.filter(function (r, i) {
    var o = st2.rows[i];
    var x = r.relativeStrength, y = o && o.relativeStrength;
    if (!x || !y) return !!x !== !!y;
    return JSON.stringify(x.threeMonth) !== JSON.stringify(y.threeMonth);
  });
  t("relative strength 3 เดือนตรงกันทุกตัว", rsDiff.length === 0, rsDiff.length);
  t("จำนวนแท่งดัชนีที่ต่างกันต้องมีคำอธิบาย ไม่ปล่อยเลขกระโดดเฉย ๆ",
    b.els.chRoot.innerHTML.indexOf("เท่าที่จำไว้") >= 0);

  console.log("\n== เบราว์เซอร์ไม่รองรับ IndexedDB ==");
  var s2 = { idb: {}, ls: {} };
  var c = boot(s2, { noIdb: true });
  await wait(40);
  await c.win.CatalystPage.scanAll(true);
  await wait(60);
  var st3 = c.win.CatalystPage._state;
  t("ไม่เก็บลง IndexedDB", st3.cache.where !== "idb", st3.cache.where);
  if (st3.cache.where === "none") {
    t("มีคำอธิบายเหตุผล ไม่ล้มเงียบ", !!st3.cache.note, st3.cache.note);
    t("คำเตือนขึ้นบนหน้าให้ผู้ใช้เห็น",
      c.els.chRoot.innerHTML.indexOf("จำผลสแกนไม่ได้") >= 0);
  } else {
    t("จักรวาลเล็กจึงเก็บลง localStorage ได้ (ทางถอย)", st3.cache.where === "local");
    t("ทางถอยไม่ตั้งคำเตือนผิด ๆ", !st3.cache.note, st3.cache.note);
  }
  t("จำไม่ได้ก็ยังใช้หน้าได้ปกติ", st3.rows.length === 3, st3.rows.length);

  console.log("\n== IndexedDB เขียนไม่ได้ → ต้องถอยไป localStorage ==");
  var s3 = { idb: {}, ls: {} };
  var d = boot(s3, { writeFails: true });
  await wait(40);
  await d.win.CatalystPage.scanAll(true);
  await wait(80);
  var st4 = d.win.CatalystPage._state;
  t("ถอยไปเก็บที่ localStorage สำเร็จ", st4.cache.where === "local", st4.cache.where);
  t("มีของใน localStorage จริง", Object.keys(s3.ls).length === 1, Object.keys(s3.ls).join(","));
  var d2 = boot(s3, { writeFails: true });
  await wait(180);
  t("เปิดใหม่อ่านจาก localStorage ได้ ไม่ยิง API",
    d2.fetches() === 0 && d2.win.CatalystPage._state.rows.length === 3,
    d2.fetches() + " fetch / " + d2.win.CatalystPage._state.rows.length + " rows");

  console.log("\n== เก็บไม่ได้ทั้งสองที่ → ต้องบอกสาเหตุที่รู้จริง ==");
  var s4 = { idb: {}, ls: {} };
  var e = boot(s4, { writeFails: true, lsFails: true });
  await wait(40);
  await e.win.CatalystPage.scanAll(true);
  await wait(80);
  var note = e.win.CatalystPage._state.cache.note || "";
  t("มีคำเตือน", note.indexOf("จำผลสแกนไม่ได้") === 0, note);
  t("ไม่โมเมว่า “พื้นที่ไม่พอ” ตอนที่สาเหตุจริงคือถูกปฏิเสธ",
    note.indexOf("พื้นที่เก็บของเบราว์เซอร์ไม่พอ") < 0, note);
  t("ยกสาเหตุจริงจากเบราว์เซอร์มาแสดง", note.indexOf("SecurityError") >= 0, note);

  console.log("\n== ผลที่จำไว้เก่าเกิน TTL ==");
  var s5 = { idb: JSON.parse(JSON.stringify(shared.idb)), ls: {} };
  var key5 = Object.keys(s5.idb)[0];
  s5.idb[key5].at = Date.now() - 25 * 60 * 60 * 1000;
  var f = boot(s5);
  await wait(180);
  t("เก่าเกิน 1 วัน → ไม่ใช้ และไม่แอบสแกนเอง",
    f.fetches() === 0 && f.win.CatalystPage._state.rows.length === 0,
    f.fetches() + " fetch / " + f.win.CatalystPage._state.rows.length + " rows");
  t("กลับไปขึ้นสถานะให้กดสแกน",
    f.els.chRoot.innerHTML.indexOf("ยังไม่ได้สแกน") >= 0);

  console.log("\n== ผลที่จำไว้ข้ามวัน (ยังไม่เกิน TTL) ==");
  var s6 = { idb: JSON.parse(JSON.stringify(shared.idb)), ls: {} };
  s6.idb[key5].at = Date.now() - 20 * 60 * 60 * 1000;
  var g = boot(s6);
  await wait(220);
  var h6 = g.els.chRoot.innerHTML;
  t("ยังใช้ผลที่จำไว้ ไม่สแกนใหม่",
    g.fetches() === 0 && g.win.CatalystPage._state.rows.length === 3,
    g.fetches() + " fetch / " + g.win.CatalystPage._state.rows.length + " rows");
  t("เตือนว่าเก่า (is-stale)", h6.indexOf("is-stale") >= 0);
  t("บอกวิธีแก้: กดสแกนใหม่", h6.indexOf("เพื่ออัปเดต") >= 0);

  console.log("\n== cache พังหรือรูปแบบผิด → ต้องไม่ทำให้หน้าล่ม ==");
  var bad = [{}, { at: Date.now() }, { at: Date.now(), items: [] },
    { at: Date.now(), items: "ไม่ใช่ array" }, { items: [1] }, null];
  var okAll = true, why = "";
  for (var i = 0; i < bad.length; i++) {
    var sB = { idb: {}, ls: {} };
    sB.idb.catalystScanCache_v3 = bad[i];
    try {
      var hb = boot(sB);
      await wait(160);
      var sT = hb.win.CatalystPage._state;
      if (sT.rows.length !== 0 || hb.fetches() !== 0) { okAll = false; why = "เคส " + i + " ใช้ cache พัง"; break; }
      if (hb.els.chRoot.innerHTML.indexOf("ยังไม่ได้สแกน") < 0) { okAll = false; why = "เคส " + i + " ไม่ขึ้นสถานะ"; break; }
    } catch (err) { okAll = false; why = "เคส " + i + ": " + err.message; break; }
  }
  t("cache รูปแบบผิด 6 แบบ → ทิ้ง ไม่ล่ม ไม่แอบสแกน", okAll, why);

  console.log("\n== ห้ามสแกนเองอัตโนมัติในทุกกรณี ==");
  var src = fs.readFileSync(PUB + "/catalyst-page.js", "utf8");
  var bootFn = src.slice(src.indexOf("function boot()"));
  bootFn = bootFn.slice(0, bootFn.indexOf("window.CatalystPage"));
  t("boot ไม่มี scanAll(true) (ห้ามยิง 37 คำขอโดยผู้ใช้ไม่ได้สั่ง)",
    bootFn.indexOf("scanAll(true)") < 0);
  t("boot เรียก scanAll(false) เฉพาะเมื่อมี cache",
    bootFn.indexOf("if (c) scanAll(false)") >= 0);

  console.log("\n" + (pass + fail) + " checks · " + pass + " passed · " + fail + " failed");
  process.exit(fail ? 1 : 0);
})().catch(function (e) {
  console.error("ERR " + e.message + "\n" + e.stack);
  process.exit(1);
});
