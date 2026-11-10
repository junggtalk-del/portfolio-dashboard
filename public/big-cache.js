(function (root) {
  "use strict";
  // ============================================================
  // BigCache — ที่เก็บ cache ก้อนใหญ่ที่ "ดึงใหม่ได้" บน IndexedDB (window.BigCache · module.exports)
  //
  // ทำไม (2026-11-10): localStorage ของ origin มีโควตา 5,242,880 ตัวอักษร (คีย์ + ค่า) · cache ราคา 3 ก้อน
  //   wave3_ohlc_v1 (~1.66M) · home_rules_ohlc_v1 (≤ ~0.99M) · btc_intelligence_history_v1 (~0.38M)
  //   ถูกเขียนระหว่าง Load Latest Data ก่อน snapshot (~2.2M) → setItem(snapshot) ชน QuotaExceededError เงียบ ๆ
  //   → เปลี่ยนหน้าแล้ว snapshot กลับเป็นชุดเก่า · ย้าย 3 ก้อนนี้มาที่นี่ (IndexedDB โควตาเป็นสัดส่วนของดิสก์)
  //
  // API (ทุกตัวคืน Promise · ไม่ reject · ไม่ throw):
  //   get(key) → ค่า | null · set(key, value) → true (เก็บได้) | false (เก็บลง IndexedDB ไม่ได้ — ค่ายังอยู่ใน memory ของหน้านี้)
  //   del(key) → true | false · keys(prefix) → [คีย์ที่ขึ้นต้นด้วย prefix เรียงตามตัวอักษร] · backend() → "indexeddb" | "memory"
  //   ค่าต้องเป็นข้อมูลล้วน (object/array/string/number) — IndexedDB เก็บสำเนา (structured clone)
  //   ไม่มี IndexedDB / เปิดไม่ได้ / ค้างเกิน OPEN_TIMEOUT_MS (private mode, Node, VM ของเทสต์) → memory ของหน้านี้
  //   ผู้ใช้เก็บ record ละสัญลักษณ์ (เช่น "wave3_ohlc_v1:SPY") — งานขนานไม่แย่งกันอ่าน-แก้-เขียนก้อนเดียว
  //
  // ตอนโหลดหน้า (ครั้งเดียว ถูก): ลบ 3 คีย์เก่าออกจาก localStorage (ข้อมูลดึงใหม่ได้ — ไม่คัดลอกมา)
  // EVICTABLE_KEYS + evictLocalCaches(): รายการคีย์ localStorage ที่เป็น cache ล้วน ๆ ให้ data-snapshot.js
  //   ลบคืนที่เมื่อบันทึก snapshot ไม่ลง · ห้ามใส่ข้อมูลผู้ใช้ (holdings · ร่าง · PM · journal · theme · thai_dr inventory/overrides …)
  // ES5 เท่านั้น
  // ============================================================

  var DB_NAME = "portfolio_dashboard_cache";
  var DB_VERSION = 1;
  var STORE = "kv";
  var LEGACY_KEYS = ["wave3_ohlc_v1", "home_rules_ohlc_v1", "btc_intelligence_history_v1"];
  // cache ล้วนใน localStorage ที่ลบได้เมื่อพื้นที่เต็ม — หน้าเจ้าของดึงใหม่เองเมื่อเปิดครั้งถัดไป
  //   ไม่ใส่ macro_ohlc_v1 (MarketRegime/Adaptive Position อ่านเป็นข้อมูลเข้าทุกหน้า — ลบแล้วผลเปลี่ยน)
  //   ไม่ใส่ thai_dr_price_stats_v1 (cache สถิติราคา 12 ชม. ของ Thai DR Monitor — ดึงใหม่แพง ~260 คำขอ ใช้เวลาหลายนาที)
  //   · ไม่ใส่คีย์เล็กที่คืนที่ไม่ได้มีนัย
  var EVICTABLE_KEYS = LEGACY_KEYS.concat([
    "decision_journal_ohlc_v1",   // decision-journal-page: cache แท่งราคา /api/ohlc
    "macro_ohlc_5y_v1",           // market-risk-page: cache ราคาปิด 5 ปี
    "scanner_results_v1",         // Market Scanner: ผลสแกนล่าสุด (สแกนใหม่ได้)
    "catalystScanCache_v3",       // Catalyst Hunter: สำเนาสำรองของผลสแกน (ตัวหลักอยู่ใน IndexedDB ของหน้านั้น)
    "catalystScanCache_v2",       // Catalyst Hunter: ชุดเก่าที่เลิกใช้แล้ว
    "smart_dca_cm_v1",            // Smart DCA: cache ข้อมูล Coin Metrics
    "btc_monitor_api_v1"          // Bitcoin Monitor: payload /api/bitcoin ล่าสุด
  ]);

  var mem = {};                   // memory fallback · คีย์ภายใน "k:" + key (กันชนกับ Object.prototype)
  var dbPromise = null;

  function noop() {}
  function isKey(k) { return typeof k === "string" && k.length > 0; }
  function memGet(k) { return Object.prototype.hasOwnProperty.call(mem, "k:" + k) ? mem["k:" + k] : null; }
  function memSet(k, v) { mem["k:" + k] = v; }
  function memDel(k) { delete mem["k:" + k]; }
  function memKeys(prefix) {
    var out = [], k;
    for (k in mem) {
      if (Object.prototype.hasOwnProperty.call(mem, k) && k.slice(2).indexOf(prefix) === 0) out.push(k.slice(2));
    }
    return out;
  }
  function uniqSorted(list) {
    var seen = {}, out = [], i;
    for (i = 0; i < list.length; i++) if (!Object.prototype.hasOwnProperty.call(seen, list[i])) { seen[list[i]] = 1; out.push(list[i]); }
    return out.sort();
  }
  function localStore() { try { return root && root.localStorage ? root.localStorage : null; } catch (e) { return null; } }
  function factory() { try { return root && root.indexedDB && typeof root.indexedDB.open === "function" ? root.indexedDB : null; } catch (e) { return null; } }
  function later(fn, ms) { try { return setTimeout(fn, ms); } catch (e) { return null; } }
  function stop(h) { try { if (h !== null) clearTimeout(h); } catch (e) { /* ไม่เป็นไร */ } }

  // เปิดฐานข้อมูลครั้งเดียวต่อหน้า · null = ใช้ memory
  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve) {
      var f = factory(), settled = false, timer = null, req;
      function done(db) {
        if (settled) { if (db) { try { db.close(); } catch (e) { /* ไม่เป็นไร */ } } return; }
        settled = true;
        stop(timer);
        resolve(db || null);
      }
      if (!f) { done(null); return; }
      timer = later(function () { done(null); }, api.OPEN_TIMEOUT_MS);
      try { req = f.open(DB_NAME, DB_VERSION); } catch (e) { done(null); return; }
      if (!req) { done(null); return; }
      req.onupgradeneeded = function () {
        try { var up = req.result; if (!up.objectStoreNames.contains(STORE)) up.createObjectStore(STORE); } catch (e) { /* onsuccess ตรวจซ้ำ */ }
      };
      req.onsuccess = function () {
        var db = null;
        try { db = req.result; } catch (e) { db = null; }
        if (!db) { done(null); return; }
        try { if (!db.objectStoreNames.contains(STORE)) { db.close(); done(null); return; } } catch (e) { /* ใช้ต่อ */ }
        // แท็บอื่นอัปเกรดเวอร์ชัน → ปิดของเรา ครั้งหน้าเปิดใหม่
        try { db.onversionchange = function () { try { db.close(); } catch (e2) { /* ไม่เป็นไร */ } dbPromise = null; }; } catch (e) { /* ไม่เป็นไร */ }
        // เบราว์เซอร์ปิดการเชื่อมต่อเอง (เช่น ล้างข้อมูลเว็บ) → ครั้งหน้าเปิดใหม่ ไม่ค้างอยู่กับ connection ที่ตายแล้ว
        try { db.onclose = function () { dbPromise = null; }; } catch (e) { /* ไม่เป็นไร */ }
        done(db);
      };
      req.onerror = function (ev) {
        try { if (ev && typeof ev.preventDefault === "function") ev.preventDefault(); } catch (e) { /* ไม่เป็นไร */ }
        done(null);
      };
      req.onblocked = noop;   // รอจน timeout
    });
    return dbPromise;
  }

  // งานหนึ่งรายการบน object store · fallback(midway) = คำตอบเมื่อใช้ IndexedDB ไม่ได้
  //   midway === false → ไม่มี IndexedDB เลย (memory คือที่เก็บจริงของหน้านี้)
  //   midway === true  → มี IndexedDB แต่งานนี้ล้ม/ค้างกลางทาง
  //   (ตัดสินจากผลของ openDb ในงานนี้เอง — ไม่อ่าน dbPromise ซ้ำ ซึ่งอาจถูกล้างเป็น null ระหว่างทาง)
  function withStore(mode, work, fallback) {
    return openDb().then(function (db) {
      if (!db) return fallback(false);
      return new Promise(function (resolve) {
        var settled = false, timer = null;
        function finish(v) { if (settled) return; settled = true; stop(timer); resolve(v); }
        function fail() { if (settled) return; var v; try { v = fallback(true); } catch (e) { v = null; } finish(v); }
        timer = later(fail, api.OP_TIMEOUT_MS);
        try {
          var tx = db.transaction(STORE, mode);
          work(tx.objectStore(STORE), tx, finish, fail);
        } catch (e) { fail(); }
      });
    }, function () { return fallback(false); });
  }

  function get(key) {
    if (!isKey(key)) return Promise.resolve(null);
    return withStore("readonly", function (st, tx, finish, fail) {
      var r = st.get(key);
      r.onsuccess = function () { var v = r.result; finish(v === undefined || v === null ? memGet(key) : v); };
      r.onerror = fail;
    }, function () { return memGet(key); }).then(null, function () { return memGet(key); });
  }

  function set(key, value) {
    if (!isKey(key)) return Promise.resolve(false);
    return withStore("readwrite", function (st, tx, finish) {
      // failed: request/transaction ล้มแล้ว — oncomplete ที่อาจตามมาต้องไม่ลบสำเนาใน memory และไม่รายงานว่าสำเร็จ
      var failed = false;
      tx.oncomplete = function () { if (failed) return; memDel(key); finish(true); };
      tx.onerror = tx.onabort = function () { failed = true; memSet(key, value); finish(false); };
      try { st.put(value, key); } catch (e) { failed = true; memSet(key, value); finish(false); }
    }, function (midway) {
      // ไม่มี IndexedDB → memory คือที่เก็บจริงของหน้านี้ (true) · IndexedDB ล้ม/ค้างกลางทาง → เก็บใน memory แต่บอก false
      memSet(key, value);
      return !midway;
    }).then(function (v) { return v === true; }, function () { memSet(key, value); return false; });
  }

  function del(key) {
    if (!isKey(key)) return Promise.resolve(false);
    memDel(key);
    return withStore("readwrite", function (st, tx, finish) {
      var failed = false;
      tx.oncomplete = function () { if (failed) return; finish(true); };
      tx.onerror = tx.onabort = function () { failed = true; finish(false); };
      try { st["delete"](key); } catch (e) { failed = true; finish(false); }
    }, function (midway) {
      // ไม่มี IndexedDB → ลบใน memory แล้วคือจบ (true) · ล้มกลางทาง → false
      return !midway;
    }).then(function (v) { return v === true; }, function () { return false; });
  }

  function keys(prefix) {
    var p = typeof prefix === "string" ? prefix : "";
    return withStore("readonly", function (st, tx, finish, fail) {
      var range = null;
      if (p) {
        try { range = root.IDBKeyRange.bound(p, p + "\uffff", false, false); } catch (e) { range = null; }
      }
      var out = [];
      if (typeof st.getAllKeys === "function") {
        var r = range ? st.getAllKeys(range) : st.getAllKeys();
        r.onsuccess = function () {
          var list = r.result || [], i;
          for (i = 0; i < list.length; i++) if (typeof list[i] === "string" && list[i].indexOf(p) === 0) out.push(list[i]);
          finish(uniqSorted(out.concat(memKeys(p))));
        };
        r.onerror = fail;
        return;
      }
      var c = range ? st.openCursor(range) : st.openCursor();
      c.onsuccess = function () {
        var cur = c.result;
        if (!cur) { finish(uniqSorted(out.concat(memKeys(p)))); return; }
        if (typeof cur.key === "string" && cur.key.indexOf(p) === 0) out.push(cur.key);
        cur["continue"]();
      };
      c.onerror = fail;
    }, function () { return uniqSorted(memKeys(p)); }).then(null, function () { return uniqSorted(memKeys(p)); });
  }

  function backend() {
    return openDb().then(function (db) { return db ? "indexeddb" : "memory"; }, function () { return "memory"; });
  }

  // ลบ 3 คีย์เก่าออกจาก localStorage — ครั้งเดียวต่อการโหลดหน้า · ไม่แตะคีย์อื่น
  function migrateLegacy(storage) {
    var s = storage || localStore(), removed = [], i;
    if (!s) return removed;
    for (i = 0; i < LEGACY_KEYS.length; i++) {
      try {
        if (s.getItem(LEGACY_KEYS[i]) !== null) { s.removeItem(LEGACY_KEYS[i]); removed.push(LEGACY_KEYS[i]); }
      } catch (e) { /* storage ปิด — ข้าม */ }
    }
    return removed;
  }

  // ลบ cache ล้วนใน EVICTABLE_KEYS ที่มีอยู่ (คืนที่ให้ snapshot) · คืนรายการที่ลบ · ไม่ throw
  function evictLocalCaches(storage) {
    var s = storage || localStore(), removed = [], i;
    if (!s) return removed;
    for (i = 0; i < EVICTABLE_KEYS.length; i++) {
      try {
        if (s.getItem(EVICTABLE_KEYS[i]) !== null) { s.removeItem(EVICTABLE_KEYS[i]); removed.push(EVICTABLE_KEYS[i]); }
      } catch (e) { /* ข้าม */ }
    }
    return removed;
  }

  var api = {
    DB_NAME: DB_NAME,
    STORE: STORE,
    LEGACY_KEYS: LEGACY_KEYS.slice(),
    EVICTABLE_KEYS: EVICTABLE_KEYS.slice(),
    OPEN_TIMEOUT_MS: 4000,
    OP_TIMEOUT_MS: 10000,
    get: get,
    set: set,
    del: del,
    keys: keys,
    backend: backend,
    migrateLegacy: migrateLegacy,
    evictLocalCaches: evictLocalCaches,
    migrated: []
  };

  try { api.migrated = migrateLegacy(); } catch (e) { api.migrated = []; }

  if (root) { try { root.BigCache = api; } catch (e) { /* ไม่เป็นไร */ } }
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : this);
