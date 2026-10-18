(function () {
  "use strict";
  // ============================================================
  // THAI DR MONITOR — ชั้นแสดงผล
  // อ่านผลจาก thai-dr-engine.js มาวาด ไม่คิดตรรกะใหม่ที่นี่
  //
  // V1 = การค้นพบและคุณภาพข้อมูลเท่านั้น
  //   ไม่มีสัญญาณซื้อขาย ไม่มีตัวชี้วัดเทคนิค ไม่มีคะแนน ไม่จัดอันดับความน่าสนใจ
  // ============================================================

  var ROOT_ID = "drRoot";
  var INV_KEY = "thai_dr_inventory_v1";
  var OVR_KEY = "thai_dr_overrides_v1";
  var NEW_WINDOW_DAYS = 30;

  var state = {
    loading: false,
    error: null,
    rows: null,
    meta: null,
    sync: null,
    overrides: {},
    view: null,
    storageNote: null,
    filters: { geo: "", type: "", sector: "", ai: false, multi: false, isNew: false, review: false, q: "" },
    group: "none",
    sort: "name",
    sortDir: 1,            // 1 = น้อย→มาก · -1 = มาก→น้อย
    expanded: {},
    editing: null,
    quotes: {},            // canonicalKey → { price, currency, asOf, ticker, state, error }
    fx: null,              // { USD: บาท/ดอลลาร์, HKD: ..., JPY: ... }
    fxState: "idle",
    fxAsOf: null,
    // สถิติราคา (ราคาล่าสุด · ลงจาก ATH · ลงจาก ATH 1 ปี) ต่อสินทรัพย์
    // ดึงเมื่อกดปุ่มเท่านั้น เพราะต้องยิง /api/ohlc ทีละตัว 260 ครั้ง
    stats: {},             // canonicalKey → { state, data, ticker, note }
    statsRun: null,        // { total, done, failed, running, stopped }
    // สินทรัพย์ที่ผู้ใช้ติ๊กว่า "ไม่สนใจ" → ถูกดันไปท้ายตารางเสมอ
    ignored: {},           // canonicalKey → true
    showIgnored: true,     // false = ซ่อนไปเลย ไม่ใช่แค่ดันลงล่าง
    // สินทรัพย์ที่ติ๊ก "Top pick" → ยกขึ้นเป็นตารางแยกด้านบน
    picked: {},            // canonicalKey → true
    // สินทรัพย์ที่ "ถืออยู่ในพอร์ตจริง" — คนละความหมายกับ Top pick
    //   Top pick = กำลังสนใจ ยังไม่ได้ซื้อก็ได้
    //   Port     = ถืออยู่จริง ต้องตามดูทุกวัน
    // ติ๊กพร้อมกันทั้งสองอันได้ จึงแยก key ไม่ยุบรวม
    port: {},              // canonicalKey → true
    // แท็บที่เปิดอยู่: "port" | "pick" | "all"
    tab: "all"
  };

  var IGNORE_KEY = "thai_dr_ignored_v1";
  var PICK_KEY = "thai_dr_toppick_v1";
  var PORT_KEY = "thai_dr_port_v1";
  var TAB_KEY = "thai_dr_tab_v1";

  var STATS_KEY = "thai_dr_price_stats_v1";
  var STATS_TTL_MS = 12 * 60 * 60 * 1000;  // ราคาปิดรายวัน — วันละ 2 ครั้งพอ
  var STATS_CONCURRENCY = 4;               // ยิงพร้อมกันกี่คำขอ
  var OHLC_START = "2015-01-01";           // ย้อนหลังพอหา ATH ที่มีความหมาย

  var FX_KEY = "thai_dr_fx_v1";
  var FX_TTL_MS = 6 * 60 * 60 * 1000;   // ค่าเงินรายวัน — 6 ชม. พอ

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }
  function E() { return window.ThaiDrMonitor; }
  function num(v) { return v == null || !isFinite(v) ? "—" : Number(v).toLocaleString("en-US"); }
  function todayYmd() {
    var d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }
  function thDate(d) {
    if (!d) return "—";
    try {
      return new Date(String(d).slice(0, 10) + "T00:00:00Z").toLocaleDateString("th-TH", {
        day: "numeric", month: "short", year: "2-digit", timeZone: "UTC"
      });
    } catch (e) { return String(d); }
  }
  function thDateTime(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("th-TH", {
        day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit"
      });
    } catch (e) { return String(iso); }
  }

  // ---------------- storage ----------------
  // อยู่ในเบราว์เซอร์เครื่องนี้เท่านั้น — ล้าง cache แล้ว firstSeenAt หาย
  // จึงมีปุ่มส่งออก/นำเข้าไว้สำรอง
  function readJson(key) {
    try {
      var raw = window.localStorage && window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function writeJson(key, val) {
    try {
      window.localStorage.setItem(key, JSON.stringify(val));
      state.storageNote = null;
      return true;
    } catch (e) {
      // ห้ามเดาว่า "พื้นที่ไม่พอ" ทุกกรณี — ใช้ข้อความที่เบราว์เซอร์บอกมาจริง
      var why = /quota|exceed/i.test(String(e && e.name) + String(e && e.message))
        ? "พื้นที่เก็บของเบราว์เซอร์ไม่พอ"
        : "เบราว์เซอร์ปฏิเสธการเก็บข้อมูล (" + ((e && e.name) || "ไม่ทราบสาเหตุ") + ")";
      state.storageNote = "จำประวัติการพบเห็นไม่ได้ (" + why + ") — ตัวเลข “เห็นครั้งแรก” จะไม่ต่อเนื่อง";
      return false;
    }
  }

  // ---------------- โหลดข้อมูล ----------------
  function load(force) {
    // กำลังโหลดอยู่ → คืน promise ของรอบที่ค้างอยู่ ไม่ใช่ promise ที่ resolve ทันที
    // ไม่งั้นคนที่ await load() จะเดินต่อทั้งที่ข้อมูลยังมาไม่ถึง
    if (state.loading && state.inflight) return state.inflight;
    state.loading = true;
    state.error = null;
    render();
    state.inflight = fetch("/api/thai-dr" + (force ? "?force=1" : ""), { cache: "no-store" })
      .then(function (r) {
        if (!r.ok && r.status !== 503) throw new Error("ทะเบียน DR: HTTP " + r.status);
        return r.json();
      })
      .then(function (j) {
        state.meta = {
          total: j.total, tradingDate: j.tradingDate, asOf: j.asOf,
          fetchedAt: j.fetchedAt, source: j.source, sourceUrl: j.sourceUrl,
          degraded: !!j.degraded, complete: !!j.complete, reason: j.reason || null
        };
        if (!j.rows || !j.rows.length) {
          // ดึงไม่ได้เลย → เก็บ inventory เดิมไว้ ห้ามแทนที่ด้วยลิสต์ว่าง
          state.error = j.reason || "ดึงทะเบียน DR ไม่สำเร็จ";
          state.loading = false; state.inflight = null;
          rebuildFromCacheOnly();
          render();
          return;
        }
        state.rows = j.rows;
        applySync(j.complete === true);
        state.loading = false; state.inflight = null;
        render();
      })
      .catch(function (e) {
        state.error = String((e && e.message) || e);
        state.loading = false; state.inflight = null;
        rebuildFromCacheOnly();
        render();
      });
    return state.inflight;
  }

  // แหล่งล่ม → ยังแสดงของเดิมที่เคยเก็บไว้ พร้อมบอกว่าเป็นของเก่า
  function rebuildFromCacheOnly() {
    var snap = readJson(INV_KEY);
    if (snap && snap.rows && snap.rows.length) {
      state.rows = snap.rows;
      state.sync = snap.sync || null;
      state.overrides = readJson(OVR_KEY) || {};
      buildView();
    }
  }

  function applySync(complete) {
    var prev = readJson(INV_KEY);
    var prevSync = prev && prev.sync ? prev.sync : null;
    var res = E().syncInventory(prevSync, state.rows, new Date().toISOString(), { complete: complete });
    state.sync = res.state;
    state.syncResult = res;
    state.overrides = readJson(OVR_KEY) || {};
    // เก็บ rows ไว้ด้วย เพื่อให้เปิดหน้าตอนแหล่งล่มยังเห็นของเดิม
    writeJson(INV_KEY, { v: 1, at: Date.now(), rows: state.rows, sync: state.sync });
    buildView();
  }

  function buildView() {
    var inv = E().buildInventory(state.rows);
    state.view = E().decorate(inv, state.sync || { drs: {} }, state.overrides, {
      today: todayYmd(), newWindowDays: NEW_WINDOW_DAYS
    });
  }

  // ---------------- อัตราแลกเปลี่ยน ----------------
  // frankfurter.dev เป็นของ ECB · ฟรี · มี CORS ยิงตรงจากเบราว์เซอร์ได้
  // จึงไม่กิน serverless slot (เหมือนที่ smart-dca-page.js ใช้อยู่)
  // ค่าที่ได้คือ "สกุลนั้นต่อ 1 USD" ต้องกลับด้านเป็น "บาทต่อ 1 สกุลนั้น" เอง
  function loadFx() {
    if (state.fx) return Promise.resolve(state.fx);
    var cached = readJson(FX_KEY);
    if (cached && cached.at && Date.now() - cached.at < FX_TTL_MS && cached.rates) {
      state.fx = cached.rates;
      state.fxAsOf = cached.date || null;
      state.fxState = "ok";
      return Promise.resolve(state.fx);
    }
    state.fxState = "loading";
    return fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=THB,HKD,JPY,EUR,SGD,CNY,TWD,DKK",
      { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (j) {
        var per = j && j.rates;
        var thbPerUsd = per && Number(per.THB);
        if (!isFinite(thbPerUsd) || !(thbPerUsd > 0)) throw new Error("ไม่มีอัตรา THB");
        // บาทต่อ 1 หน่วยของสกุล X = (บาทต่อ USD) ÷ (X ต่อ USD)
        var rates = { USD: thbPerUsd };
        ["HKD", "JPY", "EUR", "SGD", "CNY", "TWD", "DKK"].forEach(function (c) {
          var v = Number(per[c]);
          if (isFinite(v) && v > 0) rates[c] = thbPerUsd / v;
        });
        state.fx = rates;
        state.fxAsOf = j.date || null;
        state.fxState = "ok";
        writeJson(FX_KEY, { at: Date.now(), rates: rates, date: j.date || null });
        return rates;
      })
      .catch(function (e) {
        // ไม่มีอัตราแลกเปลี่ยน = คิดราคาตามทฤษฎีไม่ได้ ต้องบอกตรง ๆ
        state.fxState = "error";
        state.fxError = String((e && e.message) || e);
        return null;
      });
  }

  // ---------------- ราคาหุ้นแม่ (ดึงเมื่อกางแถว) ----------------
  function loadQuote(asset) {
    var key = asset.canonicalKey;
    if (state.quotes[key] && state.quotes[key].state !== "error") return Promise.resolve();
    var row = null;
    for (var i = 0; i < (state.rows || []).length; i++) {
      if (state.rows[i].underlying === asset.underlyingSymbol &&
          state.rows[i].underlyingExchange === asset.underlyingMarket) { row = state.rows[i]; break; }
    }
    var tk = row ? E().providerTickerOf(row) : null;
    if (!tk) {
      // ตลาดที่ยังไม่มีทางแปลง ticker ได้ — บอกว่าไม่รองรับ ไม่ใช่ปล่อยค้าง
      state.quotes[key] = { state: "unsupported", ticker: null,
        note: "ยังดึงราคาหุ้นแม่จากตลาดนี้ไม่ได้" };
      render();
      return Promise.resolve();
    }
    state.quotes[key] = { state: "loading", ticker: tk.ticker, currency: tk.ccy };
    render();
    return Promise.all([
      loadFx(),
      fetch("/api/ohlc?symbol=" + encodeURIComponent(tk.ticker) + "&days=7", { cache: "no-store" })
        .then(function (r) {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.json();
        })
    ]).then(function (res) {
      var j = res[1];
      var bars = (j && j.bars) || [];
      var last = null;
      for (var b = bars.length - 1; b >= 0; b--) {
        var c = Number(bars[b] && bars[b].close);
        if (isFinite(c) && c > 0) { last = { price: c, asOf: bars[b].date }; break; }
      }
      if (!last) {
        state.quotes[key] = { state: "error", ticker: tk.ticker, currency: tk.ccy,
          note: "ไม่พบราคาย้อนหลังของ " + tk.ticker };
      } else {
        state.quotes[key] = { state: "ok", ticker: tk.ticker, currency: tk.ccy,
          price: last.price, asOf: last.asOf };
      }
      render();
    }).catch(function (e) {
      state.quotes[key] = { state: "error", ticker: tk.ticker, currency: tk.ccy,
        note: "ดึงราคาไม่สำเร็จ (" + String((e && e.message) || e) + ")" };
      render();
    });
  }

  // ---------------- สถิติราคา: ราคาล่าสุด · ลงจาก ATH · ลงจาก ATH 1 ปี ----------------
  // ดึงต่อเมื่อกดปุ่ม เพราะ 260 สินทรัพย์ = 260 คำขอ ใช้เวลาหลายนาที
  // ผลเก็บลง localStorage อายุ 12 ชม. เปิดหน้าใหม่ไม่ต้องดึงซ้ำ
  function readStatsCache() {
    var raw = readJson(STATS_KEY);
    if (!raw || !raw.at || !raw.items) return null;
    if (Date.now() - raw.at > STATS_TTL_MS) return null;
    return raw;
  }
  function hydrateStats() {
    var c = readStatsCache();
    if (!c) return;
    var k;
    for (k in c.items) {
      if (!Object.prototype.hasOwnProperty.call(c.items, k)) continue;
      state.stats[k] = { state: "ok", data: c.items[k].d, ticker: c.items[k].t };
    }
    state.statsAt = c.at;
  }
  function persistStats() {
    var items = {}, k;
    for (k in state.stats) {
      if (!Object.prototype.hasOwnProperty.call(state.stats, k)) continue;
      var s = state.stats[k];
      if (s && s.state === "ok" && s.data) items[k] = { d: s.data, t: s.ticker };
    }
    writeJson(STATS_KEY, { at: Date.now(), items: items });
    state.statsAt = Date.now();
  }

  // ดึงสถิติของสินทรัพย์เดียว
  function loadStatsFor(a) {
    var key = a.canonicalKey;
    var row = null;
    for (var i = 0; i < (state.rows || []).length; i++) {
      if (state.rows[i].underlying === a.underlyingSymbol &&
          state.rows[i].underlyingExchange === a.underlyingMarket) { row = state.rows[i]; break; }
    }
    var tk = row ? E().providerTickerOf(row) : null;
    if (!tk) {
      state.stats[key] = { state: "unsupported", ticker: null,
        note: "ตลาดนี้ยังดึงราคาย้อนหลังไม่ได้" };
      return Promise.resolve(false);
    }
    state.stats[key] = { state: "loading", ticker: tk.ticker };
    return fetch("/api/ohlc?symbol=" + encodeURIComponent(tk.ticker) + "&start=" + OHLC_START,
      { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (j) {
        var st = E().priceStats((j && j.bars) || [], { currency: tk.ccy });
        if (!st) {
          state.stats[key] = { state: "error", ticker: tk.ticker, note: "ไม่พบราคาย้อนหลัง" };
          return false;
        }
        state.stats[key] = { state: "ok", ticker: tk.ticker, data: st };
        return true;
      })
      .catch(function (e) {
        state.stats[key] = { state: "error", ticker: tk.ticker,
          note: "ดึงไม่สำเร็จ (" + String((e && e.message) || e) + ")" };
        return false;
      });
  }

  // ดึงทั้งชุดที่แสดงอยู่ — ทีละ STATS_CONCURRENCY ตัว กดหยุดได้
  function loadAllStats() {
    if (state.statsRun && state.statsRun.running) { stopStats(); return; }
    var list = visibleAssets().filter(function (a) {
      var s = state.stats[a.canonicalKey];
      return !s || s.state === "error";   // ที่ได้แล้ว/ไม่รองรับ ไม่ต้องยิงซ้ำ
    });
    if (!list.length) { render(); return; }
    state.statsRun = { total: list.length, done: 0, failed: 0, running: true, stopped: false };
    render();

    var idx = 0;
    function next() {
      if (state.statsRun.stopped || idx >= list.length) return Promise.resolve();
      var a = list[idx++];
      return loadStatsFor(a).then(function (ok) {
        state.statsRun.done++;
        if (!ok) state.statsRun.failed++;
        // วาดใหม่เป็นช่วง ๆ ไม่ใช่ทุกคำขอ เพื่อไม่ให้หน้าหนืด
        if (state.statsRun.done % 5 === 0 || state.statsRun.done === list.length) {
          persistStats();
          render();
        }
        return next();
      });
    }
    var runners = [];
    for (var c = 0; c < STATS_CONCURRENCY; c++) runners.push(next());
    Promise.all(runners).then(function () {
      state.statsRun.running = false;
      persistStats();
      render();
    });
  }
  function stopStats() {
    if (state.statsRun) { state.statsRun.stopped = true; state.statsRun.running = false; }
    persistStats();
    render();
  }

  // ---------------- ตัวกรอง ----------------
  function visibleAssets() {
    if (!state.view) return [];
    var f = state.filters;
    var q = String(f.q || "").toLowerCase().replace(/^\s+|\s+$/g, "");
    var out = [];
    for (var i = 0; i < state.view.assets.length; i++) {
      var a = state.view.assets[i];
      if (f.geo && a.geography !== f.geo) continue;
      if (f.type && a.instrumentType !== f.type) continue;
      if (f.multi && !a.hasMultipleDrs) continue;
      if (f.isNew && !a.hasNewListing) continue;
      if (f.review && a.reviewStatus !== "needs-review") continue;
      if (f.sector && a.sectorTh !== f.sector) continue;
      if (f.ai && !a.isAi) continue;
      if (!state.showIgnored && state.ignored[a.canonicalKey]) continue;
      if (q) {
        var hay = String(a.canonicalName || "") + " " + String(a.underlyingSymbol || "");
        for (var j = 0; j < a.drListings.length; j++) {
          hay += " " + a.drListings[j].drSymbol + " " + (a.drListings[j].issuerName || "") +
            " " + (a.drListings[j].issuer || "");
        }
        if (hay.toLowerCase().indexOf(q) < 0) continue;
      }
      out.push(a);
    }
    out.sort(makeComparator(state.sort, state.sortDir));
    return out;
  }

  // ตัวเรียงลำดับต่อคอลัมน์
  // ค่าว่าง (null/—) ต้องไปท้ายตารางเสมอ ไม่ว่าจะเรียงทางไหน
  // ไม่งั้นเรียงจากน้อยไปมากแล้วจะเจอ "—" เต็มหน้าแรก
  var SORT_FIELDS = {
    name: function (a) { return String(a.canonicalName || "").toUpperCase(); },
    symbol: function (a) { return String(a.underlyingSymbol || "").toUpperCase(); },
    geo: function (a) { return String(a.geography || "").toUpperCase(); },
    type: function (a) { return String(a.instrumentTypeTh || "").toUpperCase(); },
    // เรียงตามกลุ่มธุรกิจ — AI ขึ้นก่อนในกลุ่มเดียวกัน เพราะเป็นสิ่งที่ตามหา
    sector: function (a) {
      return (a.isAi ? "0" : "1") + String(a.sectorTh || "").toUpperCase();
    },
    drs: function (a) { return a.drCount; },
    newest: function (a) { return a.newestListingDate || null; },
    status: function (a) {
      // เรียงตาม "ความต้องตรวจ": หาย > รอตรวจ > ปกติ
      return (a.hasMissing ? 2 : 0) + (a.reviewStatus === "needs-review" ? 1 : 0);
    },
    // สามคอลัมน์ราคา — ยังไม่ได้ดึงถือเป็นค่าว่าง (ไปท้ายตารางเสมอ)
    last: function (a) { return statOf(a, "last"); },
    // เรียง "ลงจาก ATH": ตัวที่ประวัติสั้นต้องไม่ไปปนกับตัวที่ลงจากยอดจริง
    // ค่า -73% ของหุ้นที่มีข้อมูล 9 เดือน เทียบกับ -65% ของหุ้นที่มีข้อมูล 10 ปี ไม่ได้
    // จึงแยกเป็น 3 กลุ่ม: เชื่อได้ → ประวัติสั้น → ไม่มีข้อมูล
    // คืน {band, v} ไม่ใช่ null เพราะ "รู้เลขแต่เทียบข้ามตัวไม่ได้"
    // ไม่ใช่เรื่องเดียวกับ "ดึงราคาไม่ได้" — แถวที่โชว์ -73.4% อยู่
    // ไม่ควรจมใต้แถวที่เราไม่รู้อะไรเลย และในกลุ่มเดียวกันยังเรียงตามความลึกอยู่
    fromAth: function (a) {
      var s = state.stats[a.canonicalKey];
      if (!s || s.state !== "ok" || !s.data) return null;
      var v = s.data.fromAthPct;
      if (v == null || !isFinite(v)) return null;
      return { band: s.data.athReliable ? 0 : 1, v: v };
    },
    fromAth1y: function (a) { return statOf(a, "fromAth1yPct"); }
  };
  function statOf(a, field) {
    var s = state.stats[a.canonicalKey];
    if (!s || s.state !== "ok" || !s.data) return null;
    var v = s.data[field];
    return v == null || !isFinite(v) ? null : v;
  }
  function makeComparator(field, dir) {
    var get = SORT_FIELDS[field] || SORT_FIELDS.name;
    var d = dir === -1 ? -1 : 1;
    return function (x, y) {
      // "ไม่สนใจ" ชนะทุกการเรียง — ไม่ว่าจะเรียงคอลัมน์ไหนหรือทิศไหน
      // ก็ต้องอยู่ท้ายสุดเสมอ ไม่งั้นพอเรียงตาม ATH มันจะแทรกกลับขึ้นมา
      var ix = state.ignored[x.canonicalKey] ? 1 : 0;
      var iy = state.ignored[y.canonicalKey] ? 1 : 0;
      if (ix !== iy) return ix - iy;

      var a = get(x), b = get(y);
      var aEmpty = a == null || a === "";
      var bEmpty = b == null || b === "";
      if (aEmpty && bEmpty) return tieBreak(x, y);
      if (aEmpty) return 1;      // ว่างไปท้ายเสมอ
      if (bEmpty) return -1;
      // ค่าที่มาเป็นแบนด์ {band, v}: แบนด์เรียงก่อนและไม่กลับทิศตาม dir
      // เพราะ "เทียบข้ามตัวไม่ได้" ไม่ใช่ค่าที่มาก/น้อย — กดปุ่มสลับทิศ
      // ต้องไม่ดันกลุ่มประวัติสั้นขึ้นหัวตาราง
      if (a && typeof a === "object" && b && typeof b === "object") {
        if (a.band !== b.band) return a.band - b.band;
        if (a.v !== b.v) return (a.v - b.v) * d;
        return tieBreak(x, y);
      }
      if (typeof a === "number" && typeof b === "number") {
        if (a !== b) return (a - b) * d;
        return tieBreak(x, y);
      }
      if (a < b) return -1 * d;
      if (a > b) return 1 * d;
      return tieBreak(x, y);
    };
  }
  // เท่ากันให้เรียงตามชื่อ เพื่อให้ลำดับคงที่ทุกครั้ง (ไม่กระโดดไปมา)
  function tieBreak(x, y) {
    var a = String(x.canonicalName || "").toUpperCase();
    var b = String(y.canonicalName || "").toUpperCase();
    return a < b ? -1 : a > b ? 1 : 0;
  }

  // ---------------- ชิ้นส่วน UI ----------------
  function summaryBlock() {
    var s = state.view.summary;
    // การ์ดธรรมดา: label + ตัวเลข + คำอธิบาย + ไอคอนในกล่องสี
    function card(label, value, hint, iconPath, tileCls, cardCls, extra) {
      return '<div class="dr-stat' + (cardCls ? " " + cardCls : "") + '">' +
        '<div class="dr-stat__top">' +
        '<span class="dr-stat__label">' + esc(label) + "</span>" +
        '<span class="dr-tile' + (tileCls ? " " + tileCls : "") + '">' + ico(iconPath) + "</span>" +
        "</div>" +
        '<span class="dr-stat__value">' + esc(value) + (extra || "") + "</span>" +
        (hint ? '<span class="dr-stat__hint">' + esc(hint) + "</span>" : "");
    }

    // การ์ด hero — ตัวเลขเดียวที่หน้านี้นำด้วย พร้อมแถบสัดส่วนตลาดใหญ่สุด
    var geos = E().groupCounts(state.view.assets, "geography");
    var topGeo = geos.length ? geos[0] : null;
    var pctTop = topGeo && s.totalAssets ? (topGeo.count / s.totalAssets * 100) : 0;
    var hero = '<div class="dr-stat dr-stat--hero">' +
      '<div class="dr-stat__top">' +
      '<span class="dr-stat__label">DR ที่จดทะเบียนทั้งหมด</span>' +
      '<span class="dr-tile">' + ico(ICON.layers) + "</span>" +
      "</div>" +
      '<span class="dr-stat__value">' + num(s.totalDrListings) + "</span>" +
      (topGeo
        ? '<div class="dr-split"><span style="width:' + pctTop.toFixed(1) + '%"></span></div>'
        : "") +
      '<span class="dr-stat__hint">อ้างอิง ' + num(s.totalAssets) + " สินทรัพย์" +
      (topGeo ? " · " + esc(topGeo.key) + " " + topGeo.count + " (" + Math.round(pctTop) + "%)" : "") +
      "</span></div>";

    return '<div class="dr-stats">' + hero +
      card("สินทรัพย์อ้างอิง", num(s.totalAssets), "ยุบรวมแล้ว", ICON.rows, "dr-tile--info") + "</div>" +
      card("มี DR > 1", num(s.multiDrAssets), "มีผู้ออกหลายราย", ICON.users, "dr-tile--violet") + "</div>" +
      card("จดทะเบียนใหม่", num(s.newListings), "ตามวันจดทะเบียนของ SET", ICON.spark,
        "dr-tile--highlight", s.newListings ? "dr-stat--new" : "",
        ' <span class="dr-stat__delta">ใน ' + s.newWindowDays + " วัน</span>") + "</div>" +
      card("หายจากรอบล่าสุด", num(s.missing),
        s.missing ? "ไม่พบในการสแกนที่ครบ — ไม่ได้แปลว่าเพิกถอน" : "สแกนครบ ไม่พบการถอน",
        ICON.minus, "dr-tile--muted") + "</div>" +
      // การ์ด "รอตรวจ" มีปุ่มพาไปกรองทันที — ระดับ "ต้องทำ" ตาม highlight ladder
      '<div class="dr-stat' + (s.needsReview ? " dr-stat--alert" : "") + '">' +
      '<div class="dr-stat__top">' +
      '<span class="dr-stat__label">รอตรวจ</span>' +
      '<span class="dr-tile dr-tile--warning">' + ico(ICON.alert) + "</span>" +
      "</div>" +
      '<span class="dr-stat__value">' + num(s.needsReview) + "</span>" +
      '<span class="dr-stat__hint">จัดประเภทไม่ได้จากข้อมูลทางการ</span>' +
      (s.needsReview
        ? '<button type="button" class="dr-stat__cta" data-dr-goreview="1">ตรวจเลย ' +
          ico(ICON.chevron) + "</button>"
        : "") +
      "</div>" +
      "</div>";
  }

  // คำเตือนเรื่องข้อมูล — วันที่/แหล่งย้ายไปอยู่บนแถบ hero แล้ว
  // ที่นี่เหลือเฉพาะสิ่งที่ "ผิดปกติ" จึงไม่มีอะไรให้อ่านเมื่อทุกอย่างปกติ
  function freshnessBlock() {
    var m = state.meta || {};
    var out = "";
    if (state.error) {
      out += '<div class="dr-warn">' + ico(ICON.alert) + "<div><b>ดึงข้อมูลไม่สำเร็จ</b> — " + esc(state.error) +
        (state.rows && state.rows.length
          ? "<br>กำลังแสดงรายการที่เก็บไว้ล่าสุด และ<b>ไม่ได้</b>อัปเดตสถานะใด ๆ"
          : "") + "</div></div>";
    } else if (m.degraded) {
      out += '<div class="dr-warn">' + ico(ICON.alert) +
        "<div><b>ข้อมูลไม่สด</b> — " + esc(m.reason || "") + "</div></div>";
    }
    if (m.complete === false && !state.error) {
      out += '<div class="dr-warn">' + ico(ICON.alert) +
        "<div>รอบนี้ไม่ใช่การสแกนที่ครบทั้งทะเบียน — จะไม่ตัดสินว่า DR ตัวใดหายไป</div></div>";
    }
    if (state.syncResult && state.syncResult.isBaseline && state.syncResult.applied) {
      out += '<div class="dr-note-block">' + ico(ICON.info) +
        "<div><b>นี่คือการบันทึกครั้งแรก</b> — รายการทั้งหมดถือเป็น <b>ฐานตั้งต้น</b> " +
        "ไม่ใช่ของที่เพิ่งออกใหม่ · ตัวเลข “จดทะเบียนใหม่” นับจากวันจดทะเบียนจริงของ SET " +
        "ไม่ใช่วันที่ระบบเห็นครั้งแรก</div></div>";
    }
    if (state.storageNote) {
      out += '<div class="dr-warn">' + ico(ICON.alert) + "<div>" + esc(state.storageNote) + "</div></div>";
    }
    return out;
  }

  function filterBlock() {
    var f = state.filters;
    var geos = E().groupCounts(state.view.assets, "geography");
    var types = E().groupCounts(state.view.assets, "instrumentType");
    var g = '<select class="dr-select" data-dr-f="geo"><option value="">ทุกตลาด</option>';
    for (var i = 0; i < geos.length; i++) {
      g += '<option value="' + esc(geos[i].key) + '"' + (f.geo === geos[i].key ? " selected" : "") +
        ">" + esc(geos[i].key) + " (" + geos[i].count + ")</option>";
    }
    g += "</select>";
    var t = '<select class="dr-select" data-dr-f="type"><option value="">ทุกประเภท</option>';
    for (var j = 0; j < types.length; j++) {
      t += '<option value="' + esc(types[j].key) + '"' + (f.type === types[j].key ? " selected" : "") +
        ">" + esc(E().TYPE_TH[types[j].key] || types[j].key) + " (" + types[j].count + ")</option>";
    }
    t += "</select>";
    // กลุ่มอุตสาหกรรม
    var secs = E().groupCounts(state.view.assets, "sectorTh");
    var sc = '<select class="dr-select" data-dr-f="sector"><option value="">ทุกกลุ่มธุรกิจ</option>';
    for (var si = 0; si < secs.length; si++) {
      sc += '<option value="' + esc(secs[si].key) + '"' + (f.sector === secs[si].key ? " selected" : "") +
        ">" + esc(secs[si].key) + " (" + secs[si].count + ")</option>";
    }
    sc += "</select>";

    var gr = '<select class="dr-select" data-dr-f="group">' +
      '<option value="none"' + (state.group === "none" ? " selected" : "") + ">ไม่จัดกลุ่ม</option>" +
      '<option value="sectorTh"' + (state.group === "sectorTh" ? " selected" : "") + ">จัดกลุ่มตามธุรกิจ</option>" +
      '<option value="geography"' + (state.group === "geography" ? " selected" : "") + ">จัดกลุ่มตามตลาด</option>" +
      '<option value="instrumentType"' + (state.group === "instrumentType" ? " selected" : "") + ">จัดกลุ่มตามประเภท</option>" +
      "</select>";
    // chip แทน checkbox — กดเปิด/ปิด พร้อมจำนวน (ตาม design system)
    var s = state.view.summary;
    var aiCount = 0;
    for (var ai2 = 0; ai2 < state.view.assets.length; ai2++) {
      if (state.view.assets[ai2].isAi) aiCount++;
    }
    function chip(key, label, count, cls) {
      return '<button type="button" class="dr-chip' + (cls ? " " + cls : "") +
        '" data-dr-f="' + key + '" aria-pressed="' + (f[key] ? "true" : "false") + '">' +
        esc(label) + ' <span class="dr-chip__count">' + count + "</span></button>";
    }
    // เรียงลำดับย้ายไปที่หัวคอลัมน์แล้ว (กดที่หัวตารางได้ทุกคอลัมน์)
    return '<div class="dr-filterbar">' +
      '<label class="dr-search">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICON.search + "</svg>" +
      '<input class="dr-input" type="search" data-dr-f="q" ' +
      'placeholder="ค้นหา ชื่อ · สัญลักษณ์ · DR · ผู้ออก" value="' + esc(f.q) + '" /></label>' +
      g + t + sc + gr +
      '<span class="dr-filterbar__sep"></span>' +
      chip("ai", "กลุ่ม AI", aiCount, "dr-chip--ai") +
      chip("multi", "มี DR > 1", s.multiDrAssets) +
      chip("isNew", "จดทะเบียนใหม่", s.newListings, "dr-chip--new") +
      chip("review", "รอตรวจ", s.needsReview, "dr-chip--warn") +
      "</div>";
  }

  // แถบบอกว่ากรองเหลือเท่าไร + ปุ่มล้างตัวกรอง
  function resultsBlock(list) {
    var f = state.filters;
    var active = [];
    if (f.geo) active.push(f.geo);
    if (f.type) active.push(E().TYPE_TH[f.type] || f.type);
    if (f.multi) active.push("มี DR > 1");
    if (f.isNew) active.push("จดทะเบียนใหม่");
    if (f.review) active.push("รอตรวจ");
    if (f.q) active.push("“" + f.q + "”");
    // ปุ่มโหลดราคา + ความคืบหน้า
    var run = state.statsRun;
    // นับแยก 3 อย่าง: โหลดได้แล้ว · ยังต้องโหลด · ดึงไม่ได้เพราะไม่รองรับตลาด
    // unsupported ต้องนับด้วย ไม่งั้นพอกรองเจอแต่ตลาดที่ไม่รองรับ (เช่น เวียดนาม
    // ซึ่งแปลง ticker ไม่ได้เลย 17/17) ทั้ง need และ have จะเป็น 0 แล้วแถบสรุป
    // จะว่างเปล่า — ผู้ใช้เห็นแค่ "—" สามช่องโดยไม่มีอะไรบอกว่าทำไม
    var need = 0, have = 0, unsup = 0;
    for (var i = 0; i < list.length; i++) {
      var s = state.stats[list[i].canonicalKey];
      if (s && s.state === "ok") have++;
      else if (s && s.state === "unsupported") unsup++;
      else if (!s || s.state === "error") need++;
    }
    var priceBtn;
    if (run && run.running) {
      priceBtn = '<button type="button" class="dr-btn dr-btn--secondary dr-btn--sm" data-dr-loadstats="1">' +
        "หยุด (" + run.done + "/" + run.total + ")</button>";
    } else if (need > 0) {
      priceBtn = '<button type="button" class="dr-btn dr-btn--secondary dr-btn--sm" data-dr-loadstats="1">' +
        ico(ICON.download) + "โหลดราคา " + need + " ตัว</button>";
    } else if (have > 0) {
      priceBtn = '<span class="dr-dim">ราคาครบแล้ว ' + have + " ตัว" +
        (unsup > 0 ? " · อีก " + unsup + " ตัวดึงราคาไม่ได้ (ตลาดต้นทางยังไม่รองรับ)" : "") +
        (state.statsAt ? " · " + esc(thDateTime(new Date(state.statsAt).toISOString())) : "") + "</span>";
    } else if (unsup > 0) {
      // ไม่มีปุ่มให้กด เพราะกดแล้วก็ดึงไม่ได้ — แต่ต้องบอกเหตุผล ไม่ใช่เงียบ
      priceBtn = '<span class="dr-dim">' + unsup +
        " ตัวนี้ดึงราคาไม่ได้ · ตลาดต้นทางยังไม่รองรับการดึงราคาย้อนหลัง</span>";
    } else {
      priceBtn = "";
    }

    // จำนวนที่ติ๊กไม่สนใจ + ปุ่มซ่อน/แสดง
    var ignCount = 0, kk;
    for (kk in state.ignored) {
      if (Object.prototype.hasOwnProperty.call(state.ignored, kk) && state.ignored[kk]) ignCount++;
    }
    var ignBtn = ignCount
      ? '<button type="button" class="dr-btn dr-btn--ghost dr-btn--sm" data-dr-toggleignored="1">' +
        (state.showIgnored ? "ซ่อนที่ไม่สนใจ (" + ignCount + ")" : "แสดงที่ไม่สนใจ (" + ignCount + ")") +
        "</button>"
      : "";

    return '<div class="dr-results"><span>แสดง <b class="dr-num">' + list.length +
      '</b> จาก <b class="dr-num">' + state.view.assets.length + "</b> สินทรัพย์" +
      (active.length ? " · กรอง: " + esc(active.join(", ")) : "") +
      (ignCount && state.showIgnored ? ' · <span class="dr-dim">ไม่สนใจ ' + ignCount + " (อยู่ท้ายตาราง)</span>" : "") +
      "</span>" +
      '<span class="dr-results__right">' + ignBtn + priceBtn +
      (active.length
        ? '<button type="button" class="dr-btn dr-btn--ghost dr-btn--sm" data-dr-clearfilters="1">ล้างตัวกรอง</button>'
        : "") +
      "</span></div>";
  }

  // ชื่อผู้ออกเต็ม ๆ ยาวมาก ("บริษัทหลักทรัพย์ ... จำกัด (มหาชน)")
  // ตัดคำนำหน้า/ต่อท้ายออกให้อ่านเร็ว ของเต็มยังอยู่ใน title=
  function issuerShort(name) {
    var s = trimStr(name);
    if (!s) return "—";
    s = s.replace(/^บริษัทหลักทรัพย์\s+/, "").replace(/^ธนาคาร\s*/, "");
    s = s.replace(/\s*จำกัด\s*\(มหาชน\)\s*$/, "").replace(/\s*จำกัด\s*$/, "");
    s = s.replace(/\s*\(ประเทศไทย\)\s*/, " ");
    return trimStr(s) || trimStr(name);
  }

  function money(v, dp) {
    if (v == null || !isFinite(v)) return "—";
    return Number(v).toLocaleString("en-US", {
      minimumFractionDigits: dp == null ? 2 : dp, maximumFractionDigits: dp == null ? 2 : dp
    });
  }

  // แถบตัวเลขสำคัญ 5 ช่อง — หัวของแผงที่กางออก
  // ช่อง "ต่างจากทฤษฎี" ใช้ค่าของ DR ที่สภาพคล่องดีที่สุด (หน่วยคงเหลือมากสุด)
  // เพราะเป็นตัวที่ราคาน่าเชื่อถือที่สุดในกลุ่ม — ตัวอื่นดูได้ในตารางข้างล่าง
  function kpiStrip(a, priced) {
    var q = state.quotes[a.canonicalKey];
    function box(label, value, cls) {
      return '<div class="dr-kpi' + (cls ? " " + cls : "") + '">' +
        '<div class="dr-kpi__label">' + esc(label) + "</div>" +
        '<div class="dr-kpi__value">' + value + "</div></div>";
    }
    var unit = function (u) { return '<small>' + esc(u) + "</small>"; };

    // หุ้นแม่
    var underlyingBox;
    if (q && q.state === "ok") {
      underlyingBox = box("ราคาหุ้นแม่ · " + thDate(q.asOf),
        money(q.price, 2) + unit(q.currency || ""));
    } else if (q && q.state === "loading") {
      underlyingBox = box("ราคาหุ้นแม่", '<span class="dr-dim">กำลังดึง…</span>', "dr-kpi--muted");
    } else if (q && q.state === "unsupported") {
      underlyingBox = box("ราคาหุ้นแม่", '<span class="dr-dim">ตลาดนี้ยังไม่รองรับ</span>', "dr-kpi--muted");
    } else if (q && q.state === "error") {
      underlyingBox = box("ราคาหุ้นแม่", '<span class="dr-dim">ดึงไม่สำเร็จ</span>', "dr-kpi--muted");
    } else {
      underlyingBox = box("ราคาหุ้นแม่", '<span class="dr-dim">—</span>', "dr-kpi--muted");
    }

    // อัตราแลกเปลี่ยน
    var ccy = (q && q.currency) || E().currencyOf(a.underlyingMarket);
    var rate = ccy && state.fx ? state.fx[ccy] : null;
    var fxBox = rate != null
      ? box("อัตราแลกเปลี่ยน", money(rate, 4) + unit("บาท/" + ccy))
      : box("อัตราแลกเปลี่ยน", '<span class="dr-dim">—</span>', "dr-kpi--muted");

    // DR ตัวแทน = หน่วยคงเหลือมากสุดที่คิดราคาได้
    var rep = null;
    for (var i = 0; i < priced.length; i++) {
      var p = priced[i];
      if (p.theoreticalThb == null) continue;
      if (!rep || (p.outstandingShare || 0) > (rep.outstandingShare || 0)) rep = p;
    }
    if (!rep) {
      for (var k = 0; k < priced.length; k++) {
        if (priced[k].marketThb != null) { rep = priced[k]; break; }
      }
    }

    var theoBox = rep && rep.theoreticalThb != null
      ? box("ราคาตามทฤษฎี", money(rep.theoreticalThb, 3) + unit("บาท"))
      : box("ราคาตามทฤษฎี", '<span class="dr-dim">—</span>', "dr-kpi--muted");
    var mktBox = rep && rep.marketThb != null
      ? box("ราคาตลาด" + (rep ? " · " + rep.drSymbol : ""),
          money(rep.marketThb, 2) + unit("บาท"))
      : box("ราคาตลาด", '<span class="dr-dim">—</span>', "dr-kpi--muted");

    var premBox;
    if (rep && rep.premiumPct != null) {
      var neg = rep.premiumPct < 0;
      // มาตรวัด: ±5% เต็มสเกล จุดกึ่งกลาง = ตรงทฤษฎีพอดี
      var pos = Math.max(0, Math.min(100, 50 + (rep.premiumPct / 5) * 50));
      premBox = '<div class="dr-kpi dr-kpi--focus' + (neg ? " is-neg" : "") + '">' +
        '<div class="dr-kpi__label">ต่างจากทฤษฎี</div>' +
        '<div class="dr-kpi__value">' + (rep.premiumPct > 0 ? "+" : "") +
        rep.premiumPct.toFixed(2) + "%</div>" +
        '<div class="dr-gauge" style="color:var(--' + (neg ? "negative" : "positive") + ')">' +
        '<i style="left:' + pos.toFixed(1) + '%"></i></div></div>';
    } else {
      premBox = box("ต่างจากทฤษฎี", '<span class="dr-dim">—</span>', "dr-kpi--muted");
    }

    var warn = "";
    if (q && (q.state === "unsupported" || q.state === "error") && q.note) {
      warn = '<p class="dr-note">' + ico(ICON.alert) + "<span>" + esc(q.note) +
        " — ตารางด้านล่างยังแสดงราคาตลาดของ DR ได้ตามปกติ</span></p>";
    }
    return '<div class="dr-kpis">' + underlyingBox + fxBox + theoBox + mktBox + premBox +
      "</div>" + warn;
  }

  // แถบราคาหุ้นแม่ — หัวของบล็อกเทียบราคา (เก็บไว้ใช้ตรวจย้อนหลัง)
  function quoteBar(a) {
    var q = state.quotes[a.canonicalKey];
    if (!q) return '<div class="dr-quote dr-quote-idle">กำลังเตรียมราคา…</div>';
    if (q.state === "loading") {
      return '<div class="dr-quote dr-quote-idle">กำลังดึงราคา ' + esc(q.ticker || "") + "…</div>";
    }
    if (q.state === "unsupported") {
      return '<div class="dr-quote dr-quote-warn">' + esc(q.note) +
        " — ตารางด้านล่างจึงแสดงเฉพาะราคาตลาดของ DR</div>";
    }
    if (q.state === "error") {
      return '<div class="dr-quote dr-quote-warn">' + esc(q.note) + "</div>";
    }
    var fxNote = state.fxState === "error"
      ? ' <span class="dr-quote-warn-inline">· ไม่มีอัตราแลกเปลี่ยน จึงเทียบราคาไม่ได้</span>'
      : state.fx && q.currency && state.fx[q.currency]
        ? " · 1 " + esc(q.currency) + " = " + money(state.fx[q.currency], 4) + " บาท" +
          (state.fxAsOf ? " (" + esc(state.fxAsOf) + ")" : "")
        : "";
    // data-pv-skip: ตัวเลขตรงนี้เป็นราคาตลาดสาธารณะ ไม่ใช่เงินในพอร์ตของผู้ใช้
    // ถ้าปล่อยให้ Privacy Lock ปิดบัง อัตราแลกเปลี่ยนจะกลายเป็น XXX แล้วตรวจสอบที่มาไม่ได้
    return '<div class="dr-quote" data-pv-skip="1">' +
      "<b>ราคาหุ้นแม่</b> " + esc(q.ticker) + " · <b>" + money(q.price, 2) + " " + esc(q.currency) + "</b>" +
      (q.asOf ? " · ณ " + esc(thDate(q.asOf)) : "") + fxNote +
      "</div>";
  }

  function detailRow(a) {
    var q = state.quotes[a.canonicalKey];
    var quote = q && q.state === "ok" ? { price: q.price, currency: q.currency } : null;
    var priced = E().priceListings(a, quote, state.fx || {});

    var rows = "";
    for (var i = 0; i < priced.length; i++) {
      var d = priced[i];
      var st = d.sourceStatus === "missing-from-complete-scan"
        ? '<span class="dr-miss">ไม่พบในรอบล่าสุด</span>'
        : d.sourceStatus === "unconfirmed" ? '<span class="dr-dim">ยังไม่ยืนยัน</span>'
        : '<span class="dr-badge dr-badge--accent">ปกติ</span>';
      // ส่วนต่างจากทฤษฎี: เน้นสีเมื่อเกิน 2% เพราะนั่นคือจุดที่ DR ตัวหนึ่งแพงกว่าพี่น้อง
      var premCls = d.premiumPct == null ? ""
        : d.premiumPct >= 2 ? " dr-prem-high"
        : d.premiumPct <= -2 ? " dr-prem-low" : "";
      var premTxt = d.premiumPct == null ? "—"
        : (d.premiumPct > 0 ? "+" : "") + d.premiumPct.toFixed(2) + "%";
      rows += "<tr>" +
        '<td><span class="dr-drtag">' + esc(d.drSymbol) + "</span>" +
        (d.isNewListing ? ' <span class="dr-badge dr-badge--new">ใหม่</span>' : "") + "</td>" +
        "<td>" + esc(issuerShort(d.issuerName || d.issuer)) + "</td>" +
        '<td class="dr-num-cell">' + esc(d.conversionRatio || "—") + "</td>" +
        '<td class="dr-num-cell">' + (d.theoreticalThb == null
          ? '<span class="dr-dim" title="' + esc(d.priceNote || "") + '">—</span>'
          : money(d.theoreticalThb, 3)) + "</td>" +
        '<td class="dr-num-cell">' + (d.marketThb == null ? '<span class="dr-dim">—</span>' : money(d.marketThb, 2)) +
        (d.marketThbBasis === "offer" ? '<span class="dr-cell-sub">เสนอขาย</span>' : "") + "</td>" +
        '<td class="dr-num-cell' + premCls + '">' + esc(premTxt) + "</td>" +
        '<td class="dr-num">' + esc(thDate(d.sourceListingDate)) + "</td>" +
        '<td class="dr-num">' + esc(thDate(d.firstSeenAt)) + "</td>" +
        '<td class="dr-num-cell">' + num(d.outstandingShare) + "</td>" +
        "<td>" + st + "</td>" +
        "</tr>";
    }
    var srcLink = a.underlyingUrl
      ? '<a href="' + esc(a.underlyingUrl) + '" target="_blank" rel="noopener">ดูสินทรัพย์อ้างอิงที่ตลาดต้นทาง ↗</a>'
      : "";
    var over = a.hasOverride
      ? '<div class="dr-ovr-note">แก้ไขเอง · ข้อมูลจากแหล่ง: ' +
        esc(a.sourceValues.canonicalName || "—") + " · " + esc(a.sourceValues.geography) + " · " +
        esc(a.sourceValues.instrumentTypeTh) + "</div>"
      : "";
    return '<tr class="dr-detail"><td colspan="14"><div class="dr-detail__panel">' +
      kpiStrip(a, priced) +
      '<p class="dr-detail__title">DR ที่อ้างอิง ' + esc(a.underlyingSymbol || "—") +
      ' <span class="dr-count">' + a.drCount + "</span></p>" +
      '<div class="dr-tablewrap"><table class="dr-table"><thead><tr>' +
      "<th>DR</th><th>ผู้ออก</th>" +
      '<th class="dr-num-cell">อัตราแปลงสภาพ</th>' +
      '<th class="dr-num-cell">ราคาตามทฤษฎี</th><th class="dr-num-cell">ราคาตลาด</th>' +
      '<th class="dr-num-cell">ต่างจากทฤษฎี</th>' +
      "<th>วันจดทะเบียน</th><th>ระบบเห็นครั้งแรก</th>" +
      '<th class="dr-num-cell">หน่วยคงเหลือ</th><th>สถานะ</th>' +
      "</tr></thead><tbody>" + rows + "</tbody></table></div>" +
      '<p class="dr-note">' + ico(ICON.info) +
      "<span>ราคาตามทฤษฎี = ราคาหุ้นแม่ × อัตราแลกเปลี่ยน ÷ อัตราแปลงสภาพ · " +
      "ส่วนต่างเกิดจากสภาพคล่อง ค่าธรรมเนียมผู้ออก และเวลาปิดตลาดที่ต่างกัน · " +
      "<b>ไม่ใช่สัญญาณซื้อขาย</b></span></p>" +
      over +
      '<div class="dr-detail__foot">' + srcLink +
      '<button type="button" class="dr-btn dr-btn--secondary dr-btn--sm" data-dr-edit="' +
      esc(a.canonicalKey) + '">' + ico(ICON.edit) + "แก้ไขการจัดกลุ่ม</button>" +
      "</div>" + editForm(a) + "</div></td></tr>";
  }

  function editForm(a) {
    if (state.editing !== a.canonicalKey) return "";
    var o = state.overrides[a.canonicalKey] || {};
    var types = [E().TYPE.STOCK, E().TYPE.ETF_INDEX, E().TYPE.ETF_SECTOR, E().TYPE.ETF_BOND,
      E().TYPE.ETF_COMMODITY, E().TYPE.FUND_OTHER, E().TYPE.UNKNOWN];
    var sel = '<select data-dr-ov="instrumentType"><option value="">— ใช้ค่าจากแหล่ง —</option>';
    for (var i = 0; i < types.length; i++) {
      sel += '<option value="' + esc(types[i]) + '"' +
        (o.instrumentType === types[i] ? " selected" : "") + ">" + esc(E().TYPE_TH[types[i]]) + "</option>";
    }
    sel += "</select>";
    return '<div class="dr-edit" data-dr-form="' + esc(a.canonicalKey) + '">' +
      "<label>ชื่อที่ใช้แสดง <input type=\"text\" data-dr-ov=\"canonicalName\" value=\"" +
      esc(o.canonicalName || "") + '" placeholder="' + esc(a.sourceValues.canonicalName || "") + '" /></label>' +
      "<label>ตลาด/ภูมิภาค <input type=\"text\" data-dr-ov=\"geography\" value=\"" +
      esc(o.geography || "") + '" placeholder="' + esc(a.sourceValues.geography) + '" /></label>' +
      "<label>ประเภท " + sel + "</label>" +
      "<label>บันทึก <input type=\"text\" data-dr-ov=\"note\" value=\"" + esc(o.note || "") + '" /></label>' +
      '<div class="dr-edit-btns">' +
      '<button type="button" class="dr-btn dr-btn--primary dr-btn--sm" data-dr-save="' + esc(a.canonicalKey) + '">บันทึก</button>' +
      '<button type="button" class="dr-btn dr-btn--ghost dr-btn--sm" data-dr-clear="' + esc(a.canonicalKey) + '">ล้างค่าที่แก้</button>' +
      '<button type="button" class="dr-btn dr-btn--ghost dr-btn--sm" data-dr-cancel="1">ปิด</button>' +
      "</div>" +
      '<div class="dr-edit-note">ค่าที่แก้จะไม่ถูกเขียนทับเมื่อโหลดข้อมูลใหม่ และข้อมูลต้นทางยังเก็บไว้ครบ</div>' +
      "</div>";
  }

  // ชื่อยาวแบบ "บริษัท APPLE INC. (AAPL)" อ่านยากในตาราง
  // ตัดคำนำหน้าและวงเล็บท้ายออก เหลือชื่อจริง — ของเต็มยังอยู่ใน title=
  function shortName(name, sym) {
    var s = trimStr(name);
    if (!s) return sym || "—";
    s = s.replace(/^(บริษัท|โครงการจัดการลงทุนต่างประเทศ)\s+/, "");
    s = s.replace(/\s*\([^)]*\)\s*$/, "");
    return trimStr(s) || sym || "—";
  }
  function trimStr(v) { return String(v == null ? "" : v).replace(/^\s+|\s+$/g, ""); }

  // สีของ avatar ใช้เป็น "จังหวะ" ให้กวาดตาแยกแถว ไม่มีความหมายสถานะ
  // เลือกจากตัวอักษรของ symbol เพื่อให้สินทรัพย์เดิมได้สีเดิมทุกครั้ง
  function avatarClass(sym) {
    var s = String(sym || "");
    var sum = 0;
    for (var i = 0; i < s.length; i++) sum += s.charCodeAt(i);
    var n = sum % 4;
    return n === 0 ? "" : " dr-av--" + (n + 1);
  }
  function initials(sym) {
    var s = String(sym || "?").replace(/[^A-Za-z0-9]/g, "");
    return (s.slice(0, 2) || "?").toUpperCase();
  }

  // สามเซลล์ราคา — ค่าลงจาก ATH ติดลบเสมอ สีจึงบอก "ลึกแค่ไหน" ไม่ใช่ "บวกหรือลบ"
  //   ลึกกว่า 30% = แดง · 10-30% = อำพัน · ตื้นกว่า 10% = ปกติ
  function dipClass(v) {
    if (v == null) return "";
    if (v <= -30) return " dr-dip-deep";
    if (v <= -10) return " dr-dip-mid";
    return "";
  }
  function dipText(v) {
    return v == null ? '<span class="dr-dim">—</span>' : v.toFixed(1) + "%";
  }
  function statCells(a) {
    var s = state.stats[a.canonicalKey];
    if (!s) {
      return '<td class="dr-num-cell"><span class="dr-dim">—</span></td>' +
        '<td class="dr-num-cell"><span class="dr-dim">—</span></td>' +
        '<td class="dr-num-cell"><span class="dr-dim">—</span></td>';
    }
    if (s.state === "loading") {
      var dots = '<td class="dr-num-cell"><span class="dr-dim">…</span></td>';
      return dots + dots + dots;
    }
    if (s.state !== "ok" || !s.data) {
      var why = esc(s.note || "ไม่มีข้อมูล");
      var cell = '<td class="dr-num-cell"><span class="dr-dim" title="' + why + '">—</span></td>';
      return cell + cell + cell;
    }
    var d = s.data;
    // ประวัติราคาสั้นแค่ไหน — ใช้บอกว่า "ATH" นี้เชื่อได้แค่ไหน
    var span = historySpan(d.historyDays);
    // ตัวเลข ATH/วันที่อยู่ใน title เพื่อให้ตรวจที่มาได้โดยไม่ต้องเปิดแถว
    var athTip = d.ath == null ? "" :
      (d.athReliable ? "ATH " : "สูงสุดเท่าที่มีข้อมูล ") +
      money(d.ath, 2) + " " + (d.currency || "") + " เมื่อ " + thDate(d.athDate) +
      (d.athReliable ? ""
        : " · มีข้อมูลเพียง " + span + " (ตั้งแต่ " + thDate(d.firstDate) +
          ") จึงไม่ใช่จุดสูงสุดตลอดกาล");
    // ข้อมูลไม่ครบปี: สลับคำนามเหมือนคอลัมน์ ATH ไม่ใช่แค่ต่อท้ายคำเตือน
    // เพราะ "ATH 1 ปี" คือคำที่อ้างเกินจริงเอง คนอ่าน 3 คำแรกก็ต้องได้ความจริง
    var y1Tip = d.ath1y == null ? "" :
      (d.coversFullYear ? "ATH 1 ปี " : "สูงสุดเท่าที่มีข้อมูล ") +
      money(d.ath1y, 2) + " " + (d.currency || "") + " เมื่อ " + thDate(d.ath1yDate) +
      (d.coversFullYear ? ""
        : " · มีข้อมูลเพียง " + span + " (ตั้งแต่ " + thDate(d.firstDate) +
          ") จึงยังไม่ครบ 1 ปี");
    // ประวัติสั้น: ไม่ลงสีแดง/อำพัน เพราะสีสื่อว่า "ย่อลึก" ซึ่งเทียบกับตัวอื่นไม่ได้
    var athCls = d.athReliable ? dipClass(d.fromAthPct) : " dr-dip-weak";
    // ข้อมูลสั้นกว่า 1 ปี → ยอด 1 ปี กับยอดตลอดกาลเป็นตัวเดียวกัน
    // (ของจริง 2513.HK: -73.4% ทั้งสองช่อง) ถ้าช่องซ้ายจางแต่ช่องนี้แดงสด
    // = เลขเดียวกันในแถวเดียวกัน สื่อความต่างกัน
    var y1Cls = d.coversFullYear ? dipClass(d.fromAth1yPct) : " dr-dip-weak";
    return '<td class="dr-num-cell" title="' + esc("ราคาปิด " + thDate(d.lastDate)) + '">' +
      money(d.last, 2) + '<span class="dr-cell-sub">' + esc(d.currency || "") + "</span></td>" +
      '<td class="dr-num-cell' + athCls + '" title="' + esc(athTip) + '">' +
      dipText(d.fromAthPct) +
      (d.fromAthPct != null && !d.athReliable
        ? '<span class="dr-cell-sub">ข้อมูล ' + esc(span) + "</span>" : "") +
      "</td>" +
      '<td class="dr-num-cell' + y1Cls + '" title="' + esc(y1Tip) + '">' +
      dipText(d.fromAth1yPct) +
      (d.fromAth1yPct != null && !d.coversFullYear
        ? '<span class="dr-cell-sub">ข้อมูล ' + esc(span) + "</span>" : "") +
      "</td>";
  }

  // "148 วัน" → "5 เดือน" · "1200 วัน" → "3.3 ปี" — อ่านง่ายกว่าจำนวนวันดิบ
  // เกิน 1 ปีใช้หน่วยปี ไม่งั้นจะได้ "13 เดือน" ซึ่งอ่านแล้วสะดุด
  function historySpan(days) {
    if (days == null || !isFinite(days)) return "ไม่ทราบช่วง";
    if (days < 60) return days + " วัน";
    if (days < 365) return Math.round(days / 30) + " เดือน";
    return (days / 365).toFixed(1) + " ปี";
  }

  function assetRows(list) {
    var html = "";
    for (var i = 0; i < list.length; i++) {
      var a = list[i];
      var open = !!state.expanded[a.canonicalKey];
      var tags = "";
      for (var j = 0; j < a.drListings.length && j < 5; j++) {
        tags += '<span class="dr-drtag">' + esc(a.drListings[j].drSymbol) + "</span>";
      }
      if (a.drCount > 5) tags += '<span class="dr-dash">+' + (a.drCount - 5) + "</span>";

      var ign = !!state.ignored[a.canonicalKey];
      var pick = !!state.picked[a.canonicalKey];
      var inPort = !!state.port[a.canonicalKey];
      // แถวที่ไม่สนใจ: จางลงและไม่เอาพื้นสีทอง "ใหม่" มาดึงสายตาอีก
      // ถือในพอร์ตมาก่อน Top pick เพราะ "ถืออยู่จริง" สำคัญกว่า "กำลังสนใจ"
      var rowCls = "dr-row" + (open ? " is-open" : "") +
        (a.hasNewListing && !open && !ign ? " dr-row--new" : "") +
        (ign ? " dr-row--ignored" : "") +
        (inPort && !open ? " dr-row--port" : "") +
        (pick && !inPort && !open ? " dr-row--pick" : "");
      html += '<tr class="' + rowCls + '" data-dr-row="' + esc(a.canonicalKey) + '">' +
        '<td><span class="dr-chev">' + ico(ICON.chevron) + "</span></td>" +
        '<td><div class="dr-asset">' +
        '<span class="dr-av' + avatarClass(a.underlyingSymbol) + '">' +
        esc(initials(a.underlyingSymbol)) + "</span>" +
        '<div style="min-width:0">' +
        '<span class="dr-cell-main" title="' + esc(a.canonicalName || "") + '">' +
        esc(shortName(a.canonicalName, a.underlyingSymbol)) + "</span>" +
        (a.hasNewListing ? ' <span class="dr-badge dr-badge--new">ใหม่</span>' : "") +
        (a.hasOverride ? ' <span class="dr-ovr">แก้เอง</span>' : "") +
        '<span class="dr-cell-sub dr-code">' + esc(a.underlyingSymbol || "—") + "</span>" +
        "</div></div></td>" +
        "<td>" + esc(a.geography) +
        '<span class="dr-cell-sub">' + esc(a.underlyingMarket || "—") + "</span></td>" +
        // กลุ่มธุรกิจ + ป้าย AI · บรรทัดรองคือประเภทเครื่องมือ (หุ้น/ETF)
        "<td>" + esc(a.sectorTh || "—") +
        (a.isAi ? ' <span class="dr-ai">AI</span>' : "") +
        '<span class="dr-cell-sub">' + esc(a.instrumentTypeTh) + "</span></td>" +
        '<td class="dr-num-cell"><span class="dr-count' +
        (a.drCount > 1 ? " dr-count--many" : "") + '">' + a.drCount + "</span></td>" +
        "<td>" + tags + "</td>" +
        statCells(a) +
        '<td class="dr-num">' + esc(thDate(a.newestListingDate)) + "</td>" +
        "<td>" +
        (a.reviewStatus === "needs-review" ? '<span class="dr-review">รอตรวจ</span>' : "") +
        (a.hasMissing ? ' <span class="dr-miss">มีตัวหาย</span>' : "") +
        (a.reviewStatus !== "needs-review" && !a.hasMissing
          ? '<span class="dr-badge dr-badge--accent">ปกติ</span>' : "") +
        "</td>" +
        // ติ๊ก "ถืออยู่ในพอร์ต" — แยกจาก Top pick เพราะคนละความหมาย
        '<td class="dr-port-col"><label class="dr-port' + (inPort ? " is-on" : "") +
        '" title="ติ๊กว่าถือตัวนี้อยู่ในพอร์ต">' +
        '<input type="checkbox" data-dr-port="' + esc(a.canonicalKey) + '"' +
        (inPort ? " checked" : "") + " />" +
        '<span class="dr-portmark" aria-hidden="true">' + (inPort ? "●" : "○") + "</span></label></td>" +
        // ดาว Top pick — ติ๊กแล้วยกขึ้นตารางด้านบน
        '<td class="dr-pick-col"><label class="dr-pick' + (pick ? " is-on" : "") +
        '" title="ยกขึ้นตาราง Top pick">' +
        '<input type="checkbox" data-dr-pick="' + esc(a.canonicalKey) + '"' +
        (pick ? " checked" : "") + " />" +
        '<span class="dr-star" aria-hidden="true">' + (pick ? "★" : "☆") + "</span></label></td>" +
        // checkbox ติ๊ก "ไม่สนใจ" — หยุด event ไม่ให้ไปกางแถว
        '<td class="dr-ign-col"><label class="dr-ign" title="ติ๊กเพื่อดันไปท้ายตาราง">' +
        '<input type="checkbox" data-dr-ignore="' + esc(a.canonicalKey) + '"' +
        (ign ? " checked" : "") + " /></label></td>" +
        "</tr>";
      if (open) html += detailRow(a);
    }
    return html;
  }

  // หัวคอลัมน์ที่กดเรียงได้ — กดซ้ำคอลัมน์เดิมคือสลับทิศ
  // tip: ข้อความอธิบายเฉพาะคอลัมน์ — ไม่ใส่ก็ใช้ข้อความกลาง
  function th(label, field, cls, tip) {
    var active = state.sort === field;
    var arrow = active ? (state.sortDir === 1 ? " ▲" : " ▼") : "";
    return '<th class="dr-sortable' + (cls ? " " + cls : "") + (active ? " is-sorted" : "") +
      '" data-dr-sort="' + esc(field) + '" title="' + esc(tip || "กดเพื่อเรียงลำดับ") + '">' +
      esc(label) + '<span class="dr-arrow">' + arrow + "</span></th>";
  }

  // รายการที่ติ๊กไว้ ไม่ว่าจะเป็น Port หรือ Top pick
  // ตั้งใจให้ "ไม่ขึ้นกับตัวกรอง": กรองยังไงรายการที่ติ๊กไว้ก็ยังอยู่ครบ
  // เพราะจุดประสงค์คือ "โฟกัสรายการที่เลือกไว้" ไม่ใช่ผลการค้นหา
  function markedAssets(map) {
    var out = [];
    for (var i = 0; i < state.view.assets.length; i++) {
      if (map[state.view.assets[i].canonicalKey]) out.push(state.view.assets[i]);
    }
    out.sort(makeComparator(state.sort, state.sortDir));
    return out;
  }

  // แท็บ 3 หน้า — Port / Top pick / DR ทั้งหมด
  // ตัวเลขบนแท็บมาจากของที่ติ๊กไว้จริง ไม่ใช่ผลการกรอง จึงไม่กระพริบตามการค้นหา
  var TABS = [
    { id: "port", label: "Port", hint: "ถืออยู่จริง" },
    { id: "pick", label: "Top pick", hint: "กำลังสนใจ" },
    { id: "all", label: "DR ทั้งหมด", hint: "" }
  ];
  function tabsBlock() {
    var n = {
      port: markedAssets(state.port).length,
      pick: markedAssets(state.picked).length,
      all: state.view.assets.length
    };
    var out = '<div class="dr-tabs" role="tablist">';
    for (var i = 0; i < TABS.length; i++) {
      var t = TABS[i], on = state.tab === t.id;
      out += '<button type="button" class="dr-tab' + (on ? " is-on" : "") +
        '" data-dr-tab="' + t.id + '" role="tab" aria-selected="' + (on ? "true" : "false") + '"' +
        (t.hint ? ' title="' + esc(t.hint) + '"' : "") + ">" +
        esc(t.label) + '<span class="dr-tab-n">' + n[t.id] + "</span></button>";
    }
    return out + "</div>";
  }

  // เนื้อหาของแท็บที่เปิดอยู่
  function tabBody(list) {
    if (state.tab === "port") return markedBody(state.port, "Port", "ถือ");
    if (state.tab === "pick") return markedBody(state.picked, "Top pick", "ติ๊กดาว");
    return resultsBlock(list) + tableBlock(list);
  }

  // ตารางของแท็บ Port / Top pick — ว่างแล้วต้องบอกวิธีเพิ่ม ไม่ใช่หน้าเปล่า
  function markedBody(map, label, verb) {
    var rows = markedAssets(map);
    if (!rows.length) {
      return '<section class="dr-card dr-empty-tab">' +
        "<h3>ยังไม่ได้เลือกรายการเข้า " + esc(label) + "</h3>" +
        "<p>ไปที่แท็บ <b>DR ทั้งหมด</b> แล้วติ๊กช่อง <b>" + esc(label) +
        "</b> ท้ายแถวของตัวที่" + esc(verb) + " รายการจะมารวมกันที่นี่</p>" +
        "</section>";
    }
    return '<div class="dr-results"><span>' + esc(label) + " <b class=\"dr-num\">" +
      rows.length + "</b> รายการ · ไม่ขึ้นกับตัวกรอง</span>" +
      (map === state.picked
        ? '<button type="button" class="dr-btn dr-btn--ghost dr-btn--sm" data-dr-clearpicks="1">ล้างทั้งหมด</button>'
        : '<button type="button" class="dr-btn dr-btn--ghost dr-btn--sm" data-dr-clearport="1">ล้างทั้งหมด</button>') +
      "</div>" + tableBlock(rows, true);
  }

  // ตารางว่าง — ต้องบอกให้ตรงว่า "ตัวกรองไหน" เป็นตัวตัดทิ้ง
  //
  // เคสจริงที่ทำให้ต้องมีฟังก์ชันนี้: ผู้ใช้เปิด chip "รอตรวจ" ค้างไว้ แล้วค้น ASML
  //   ASML มีอยู่จริงในระบบ (reviewStatus = ok) แต่ถูก chip ตัดทิ้ง
  //   หน้าจอเดิมบอกแค่ "ไม่มีรายการที่ตรงกับตัวกรอง" ผู้ใช้จึงเข้าใจว่า "ไม่มี ASML ในระบบ"
  //
  // วิธีหา: ปิดตัวกรองทีละตัว (leave-one-out) ตัวไหนปิดแล้วมีผลลัพธ์ = ตัวนั้นคือต้นเหตุ
  //   ไม่นับช่องค้นหา เพราะผู้ใช้ตั้งใจพิมพ์เอง การบอกให้ลบคำค้นไม่ช่วยอะไร
  var FILTER_LABEL = {
    review: "รอตรวจ", ai: "กลุ่ม AI", multi: "มี DR > 1", isNew: "จดทะเบียนใหม่",
    geo: "ตลาด", type: "ประเภท", sector: "กลุ่มธุรกิจ"
  };
  function culpritFilter() {
    var f = state.filters;
    var keys = ["review", "ai", "multi", "isNew", "geo", "type", "sector"];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (!f[k]) continue;                       // ไม่ได้เปิดอยู่ ข้าม
      var saved = f[k];
      f[k] = (typeof saved === "boolean") ? false : "";
      var n = visibleAssets().length;
      f[k] = saved;                              // คืนค่าเสมอ ห้ามทิ้งสถานะเพี้ยน
      if (n > 0) {
        return { key: k, label: FILTER_LABEL[k] || k,
          value: typeof saved === "boolean" ? null : saved, found: n };
      }
    }
    return null;
  }

  function emptyState() {
    var c = culpritFilter();
    if (!c) {
      return '<div class="dr-empty"><strong>ไม่มีรายการที่ตรงกับตัวกรอง</strong>' +
        "ลองล้างตัวกรองหรือเปลี่ยนคำค้น</div>";
    }
    var what = state.filters.q
      ? "คำค้น “" + esc(state.filters.q) + "”"
      : "รายการที่เหลือ";
    return '<div class="dr-empty"><strong>ไม่มีรายการที่ตรงกับตัวกรอง</strong>' +
      what + " มี <b>" + c.found + "</b> รายการอยู่ แต่ถูกตัดออกด้วยตัวกรอง <b>" +
      esc(c.label) + (c.value ? " = " + esc(c.value) : "") + "</b>" +
      '<div class="dr-empty-act">' +
      '<button type="button" class="dr-btn dr-btn--secondary dr-btn--sm" data-dr-offfilter="' +
      esc(c.key) + '">ปิดตัวกรอง ' + esc(c.label) + "</button>" +
      "</div></div>";
  }

  // isPick = true → ตารางนี้คือตาราง Top pick (ไม่จัดกลุ่ม ไม่แสดงข้อความว่าง)
  function tableBlock(list, isPick) {
    if (!list.length) {
      return emptyState();
    }
    var head = '<div class="dr-card dr-tablewrap"><table class="dr-table"><thead><tr>' +
      '<th style="width:40px"></th>' +
      th("สินทรัพย์อ้างอิง", "name") +
      th("ตลาด", "geo") + th("กลุ่มธุรกิจ", "sector") +
      th("DR", "drs", "dr-num-cell") + "<th>สัญลักษณ์ DR</th>" +
      th("ราคาล่าสุด", "last", "dr-num-cell") +
      th("ลงจาก ATH", "fromAth", "dr-num-cell",
        "กดเพื่อเรียงลำดับ · หุ้นที่มีข้อมูลไม่ถึง 2 ปี จะอยู่ท้ายกลุ่ม " +
        "เพราะ ATH ของมันคือสูงสุดเท่าที่มีข้อมูล เทียบกับตัวอื่นไม่ได้") +
      th("ลงจาก ATH 1 ปี", "fromAth1y", "dr-num-cell") +
      th("จดทะเบียนล่าสุด", "newest") + th("สถานะ", "status") +
      '<th class="dr-port-col" title="ติ๊กว่าถือตัวนี้อยู่จริง แล้วดูรวมกันในแท็บ Port">Port</th>' +
      '<th class="dr-pick-col" title="ติ๊กเพื่อยกขึ้นตาราง Top pick ด้านบน">Top pick</th>' +
      '<th class="dr-ign-col" title="ติ๊กเพื่อดันไปท้ายตาราง">ไม่สนใจ</th>' +
      "</tr></thead><tbody>";

    // ตาราง Top pick ไม่จัดกลุ่ม — เป็นลิสต์สั้น ๆ ที่เลือกมาเองอยู่แล้ว
    if (isPick || state.group === "none") {
      return head + assetRows(list) + "</tbody></table></div>";
    }
    // จัดกลุ่ม
    var field = state.group;
    var map = {}, order = [];
    // ที่ติ๊ก "ไม่สนใจ" แยกเป็นกลุ่มของตัวเองท้ายสุด
    // ไม่งั้นมันจะไปอยู่ท้ายของแต่ละกลุ่ม ซึ่งยังเตะตาอยู่
    var ignoredList = [];
    for (var i = 0; i < list.length; i++) {
      if (state.ignored[list[i].canonicalKey]) { ignoredList.push(list[i]); continue; }
      var k = list[i][field] || "ไม่ทราบ";
      if (!map[k]) { map[k] = []; order.push(k); }
      map[k].push(list[i]);
    }
    order.sort(function (a, b) { return map[b].length - map[a].length; });
    var body = "";
    for (var g = 0; g < order.length; g++) {
      var label = field === "instrumentType" ? (E().TYPE_TH[order[g]] || order[g]) : order[g];
      body += '<tr class="dr-group"><td colspan="14"><b>' + esc(label) + "</b> · " +
        map[order[g]].length + " สินทรัพย์</td></tr>" + assetRows(map[order[g]]);
    }
    if (ignoredList.length) {
      body += '<tr class="dr-group dr-group--ignored"><td colspan="14">' +
        "<b>ไม่สนใจ</b> · " + ignoredList.length + " สินทรัพย์</td></tr>" +
        assetRows(ignoredList);
    }
    return head + body + "</tbody></table></div>";
  }

  // ---------------- render ----------------
  function render() {
    var root = document.getElementById(ROOT_ID);
    if (!root) return;

    if (state.loading && !state.view) {
      root.innerHTML = headerBlock() +
        '<div class="dr-body"><div class="dr-empty"><strong>กำลังดึงทะเบียน DR จาก SET…</strong></div></div>';
      wire(root);
      return;
    }
    if (!state.view) {
      root.innerHTML = headerBlock() +
        '<div class="dr-body">' + freshnessBlock() +
        '<div class="dr-empty"><strong>ยังไม่มีข้อมูล</strong>' +
        (state.error ? esc(state.error) : "") + "</div></div>";
      wire(root);
      return;
    }

    var list = visibleAssets();
    root.innerHTML =
      headerBlock() +
      '<div class="dr-body">' +
      freshnessBlock() +
      summaryBlock() +
      tabsBlock() +
      // ตัวกรองมีผลกับแท็บ "DR ทั้งหมด" เท่านั้น แท็บ Port/Top pick
      // ตั้งใจให้ไม่ขึ้นกับตัวกรอง จึงซ่อนแถบกรองไปเลยกันเข้าใจผิด
      (state.tab === "all" ? filterBlock() : "") +
      tabBody(list) +
      footBlock() +
      "</div>";
    wire(root);
  }

  // ---------------- ไอคอนเส้น (ตาม design system: เส้น 1.75px ไม่ใช้อีโมจิ) ----------------
  function ico(path, cls) {
    return '<svg class="dr-ico' + (cls ? " " + cls : "") + '" viewBox="0 0 24 24" aria-hidden="true">' +
      path + "</svg>";
  }
  var ICON = {
    chart: '<path d="M4 19V5M4 19h16"/><path d="m8 15 4-4 3 3 5-6"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/>',
    download: '<path d="M12 4v12M6 11l6 6 6-6M4 20h16"/>',
    upload: '<path d="M12 20V8M6 13l6-6 6 6M4 4h16"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    rows: '<rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
    minus: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17.5v.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    star: '<path d="m12 3 2.7 5.6 6.3.9-4.5 4.4 1 6.1-5.5-2.9-5.5 2.9 1-6.1L3 9.5l6.3-.9z"/>'
  };

  function headerBlock() {
    var m = state.meta || {};
    var synced = !state.error && !m.degraded && m.complete;
    var metaBits = "";
    if (m.tradingDate) metaBits += '<span class="dr-num">ข้อมูล ' + esc(thDate(m.tradingDate)) + "</span>";
    if (state.sync && state.sync.lastSuccessfulSyncAt) {
      metaBits += '<span class="dr-num">· ซิงก์ล่าสุด ' + esc(thDateTime(state.sync.lastSuccessfulSyncAt)) + "</span>";
    }
    if (m.source) metaBits += '<span class="dr-badge dr-badge--info dr-badge--plain">' + esc(m.source) + "</span>";
    metaBits += "<span>· เพื่อการสำรวจ ไม่ใช่คำแนะนำการลงทุน</span>";

    return '<section class="dr-hero"><div>' +
      '<div class="dr-hero__title">' +
      '<span class="dr-tile">' + ico(ICON.chart) + "</span>" +
      '<h1 class="dr-title">Thai DR Monitor</h1>' +
      (state.view
        ? '<span class="dr-badge ' + (synced ? "dr-badge--positive dr-live" : "dr-badge--warning") + '">' +
          (synced ? "ซิงก์แล้ว" : "ข้อมูลไม่สด") + "</span>"
        : "") +
      "</div>" +
      '<p class="dr-desc">ทะเบียน DR ที่จดทะเบียนในไทย <b>ยุบรวมตามสินทรัพย์อ้างอิง</b> — ' +
      "DR หลายตัวจากหลายผู้ออกที่อ้างอิงสินทรัพย์เดียวกันนับเป็นรายการเดียว</p>" +
      '<div class="dr-hero__meta">' + metaBits + "</div>" +
      "</div>" +
      '<div class="dr-hero__actions">' +
      '<button type="button" class="dr-btn dr-btn--primary" data-dr-reload="1">' +
      ico(ICON.refresh) + (state.loading ? "กำลังโหลด…" : "โหลดใหม่") + "</button>" +
      '<button type="button" class="dr-btn dr-btn--secondary" data-dr-export="1">' +
      ico(ICON.download) + "ส่งออก</button>" +
      '<button type="button" class="dr-btn dr-btn--secondary" data-dr-import="1">' +
      ico(ICON.upload) + "นำเข้า</button>" +
      "</div></section>";
  }

  function footBlock() {
    var m = state.meta || {};
    return '<div class="dr-foot"><h3>วิธีอ่านหน้านี้</h3>' +
      "<p><b>วิธีอ่าน:</b> “DR ที่จดทะเบียน” คือจำนวนสัญลักษณ์ DR · " +
      "“สินทรัพย์อ้างอิง” คือจำนวนบริษัท/กองทุนที่ถูกอ้างถึง สองตัวนี้ไม่เท่ากันเพราะ" +
      "สินทรัพย์หนึ่งตัวมี DR ได้หลายตัวจากคนละผู้ออก</p>" +
      "<p><b>การจัดประเภท:</b> ใช้ชั้นข้อมูลทางการของ SET (หุ้นสามัญต่างประเทศ / " +
      "หน่วยลงทุนต่างประเทศ) แล้วแยกชนิดกองทุนจากชื่อทางการ · " +
      "ตัวที่แยกไม่ได้จะขึ้นว่า <b>รอตรวจ</b> ไม่เดาให้ · " +
      "SET ไม่มีประเภท “ดัชนีโดยตรง” ทุกตัวที่อ้างดัชนีคือ ETF</p>" +
      "<p><b>ตลาด</b> คือตลาดที่สินทรัพย์อ้างอิงจดทะเบียน ไม่ใช่ประเทศที่บริษัทตั้งอยู่ " +
      "(ข้อมูลประเทศที่ตั้งไม่มีในแหล่ง จึงไม่ระบุ)</p>" +
      "<p><b>“หายจากรอบล่าสุด”</b> หมายถึงไม่พบในการสแกนที่ครบเท่านั้น " +
      "ไม่ได้แปลว่าเพิกถอน — แหล่งข้อมูลนี้ไม่ได้ยืนยันการเพิกถอน</p>" +
      "<p><b>ประวัติการพบเห็นเก็บในเบราว์เซอร์เครื่องนี้</b> ล้างข้อมูลเว็บไซต์แล้วจะหาย " +
      "ใช้ปุ่มส่งออกสำรองไว้</p>" +
      (m.sourceUrl ? '<p>แหล่งข้อมูล: <a href="' + esc(m.sourceUrl) +
        '" target="_blank" rel="noopener">SET — ข้อมูล DR ↗</a></p>' : "") +
      "</div>";
  }

  // ---------------- events ----------------
  function wire(root) {
    var i;
    var rl = root.querySelectorAll("[data-dr-reload]");
    for (i = 0; i < rl.length; i++) rl[i].addEventListener("click", function () { load(true); });

    var ex = root.querySelectorAll("[data-dr-export]");
    for (i = 0; i < ex.length; i++) ex[i].addEventListener("click", exportAll);
    var im = root.querySelectorAll("[data-dr-import]");
    for (i = 0; i < im.length; i++) im[i].addEventListener("click", importAll);

    var fs = root.querySelectorAll("[data-dr-f]");
    for (i = 0; i < fs.length; i++) {
      (function (el) {
        var key = el.getAttribute("data-dr-f");
        // chip เป็น <button> → ใช้ click สลับค่า · select ใช้ change · ช่องค้นหาใช้ input
        var isChip = el.tagName === "BUTTON";
        var ev = isChip ? "click" : (el.tagName === "SELECT" ? "change" : "input");
        el.addEventListener(ev, function () {
          if (isChip) state.filters[key] = !state.filters[key];
          else if (key === "group") state.group = el.value;
          else if (key === "sort") state.sort = el.value;
          else state.filters[key] = el.value;
          var keep = key === "q" && !isChip ? el.selectionStart : null;
          render();
          if (key === "q" && !isChip) {
            var again = document.querySelector('[data-dr-f="q"]');
            if (again) { again.focus(); try { again.setSelectionRange(keep, keep); } catch (e2) {} }
          }
        });
      })(fs[i]);
    }

    // ปุ่ม "ตรวจเลย" บนการ์ดรอตรวจ — กรองให้ทันที
    var gr = root.querySelectorAll("[data-dr-goreview]");
    for (i = 0; i < gr.length; i++) {
      gr[i].addEventListener("click", function () {
        state.filters.review = true;
        state.filters.geo = "";
        state.filters.type = "";
        state.filters.q = "";
        render();
      });
    }
    // ติ๊ก Top pick — ยกขึ้นตารางด้านบน
    var pk = root.querySelectorAll("[data-dr-pick]");
    for (i = 0; i < pk.length; i++) {
      (function (el) {
        var k = el.getAttribute("data-dr-pick");
        el.addEventListener("click", function (ev) { ev.stopPropagation(); });
        el.addEventListener("change", function (ev) {
          ev.stopPropagation();
          if (el.checked) state.picked[k] = true;
          else delete state.picked[k];
          writeJson(PICK_KEY, state.picked);
          render();
        });
      })(pk[i]);
    }
    var cp = root.querySelectorAll("[data-dr-clearpicks]");
    for (i = 0; i < cp.length; i++) {
      cp[i].addEventListener("click", function () {
        state.picked = {};
        writeJson(PICK_KEY, state.picked);
        render();
      });
    }

    // ติ๊ก "ถืออยู่ในพอร์ต" — กลไกเดียวกับ Top pick แต่คนละ key
    var pt = root.querySelectorAll("[data-dr-port]");
    for (i = 0; i < pt.length; i++) {
      (function (el) {
        var k = el.getAttribute("data-dr-port");
        el.addEventListener("click", function (ev) { ev.stopPropagation(); });
        el.addEventListener("change", function (ev) {
          ev.stopPropagation();
          if (el.checked) state.port[k] = true;
          else delete state.port[k];
          writeJson(PORT_KEY, state.port);
          render();
        });
      })(pt[i]);
    }
    var cpo = root.querySelectorAll("[data-dr-clearport]");
    for (i = 0; i < cpo.length; i++) {
      cpo[i].addEventListener("click", function () {
        state.port = {};
        writeJson(PORT_KEY, state.port);
        render();
      });
    }

    // สลับแท็บ — จำไว้ข้ามการโหลดหน้า เพราะคนที่ถือพอร์ตอยู่มักเปิดมาดูแท็บเดิมทุกวัน
    var tb = root.querySelectorAll("[data-dr-tab]");
    for (i = 0; i < tb.length; i++) {
      (function (el) {
        el.addEventListener("click", function () {
          var id = el.getAttribute("data-dr-tab");
          if (id === state.tab) return;
          state.tab = id;
          try { localStorage.setItem(TAB_KEY, id); } catch (e) {}
          render();
        });
      })(tb[i]);
    }

    // ติ๊ก "ไม่สนใจ" — ต้องหยุด event ไม่ให้ลามไปกางแถว
    var ig = root.querySelectorAll("[data-dr-ignore]");
    for (i = 0; i < ig.length; i++) {
      (function (el) {
        var k = el.getAttribute("data-dr-ignore");
        el.addEventListener("click", function (ev) { ev.stopPropagation(); });
        el.addEventListener("change", function (ev) {
          ev.stopPropagation();
          if (el.checked) state.ignored[k] = true;
          else delete state.ignored[k];
          writeJson(IGNORE_KEY, state.ignored);
          render();
        });
      })(ig[i]);
    }
    var tog = root.querySelectorAll("[data-dr-toggleignored]");
    for (i = 0; i < tog.length; i++) {
      tog[i].addEventListener("click", function () {
        state.showIgnored = !state.showIgnored;
        render();
      });
    }

    var ls = root.querySelectorAll("[data-dr-loadstats]");
    for (i = 0; i < ls.length; i++) {
      ls[i].addEventListener("click", function () { loadAllStats(); });
    }

    // ปุ่มปิดตัวกรองที่เป็นต้นเหตุให้ตารางว่าง
    var off = root.querySelectorAll("[data-dr-offfilter]");
    for (i = 0; i < off.length; i++) {
      (function (el) {
        el.addEventListener("click", function () {
          var k = el.getAttribute("data-dr-offfilter");
          state.filters[k] = (typeof state.filters[k] === "boolean") ? false : "";
          render();
        });
      })(off[i]);
    }

    var cf = root.querySelectorAll("[data-dr-clearfilters]");
    for (i = 0; i < cf.length; i++) {
      cf[i].addEventListener("click", function () {
        state.filters = { geo: "", type: "", multi: false, isNew: false, review: false, q: "" };
        render();
      });
    }

    var sorts = root.querySelectorAll("[data-dr-sort]");
    for (i = 0; i < sorts.length; i++) {
      (function (el) {
        el.addEventListener("click", function () {
          var f = el.getAttribute("data-dr-sort");
          if (state.sort === f) state.sortDir = state.sortDir === 1 ? -1 : 1;
          else {
            state.sort = f;
            // คอลัมน์ตัวเลข/วันที่ เริ่มจากมากไปน้อยเพราะนั่นคือสิ่งที่คนอยากเห็นก่อน
            state.sortDir = (f === "drs" || f === "newest" || f === "status") ? -1 : 1;
          }
          render();
        });
      })(sorts[i]);
    }

    var rows = root.querySelectorAll("[data-dr-row]");
    for (i = 0; i < rows.length; i++) {
      (function (el) {
        el.addEventListener("click", function (ev) {
          // คลิกในช่อง "Top pick" หรือ "ไม่สนใจ" ไม่ใช่การกางแถว
          var t = ev && ev.target;
          if (t && t.closest && (t.closest(".dr-ign-col") || t.closest(".dr-pick-col"))) return;
          var k = el.getAttribute("data-dr-row");
          state.expanded[k] = !state.expanded[k];
          if (!state.expanded[k] && state.editing === k) state.editing = null;
          render();
          // กางแล้วค่อยดึงราคาหุ้นแม่ — ไม่ยิง 260 คำขอตอนเปิดหน้า
          if (state.expanded[k]) {
            var asset = null;
            for (var z = 0; z < state.view.assets.length; z++) {
              if (state.view.assets[z].canonicalKey === k) { asset = state.view.assets[z]; break; }
            }
            if (asset) loadQuote(asset);
          }
        });
      })(rows[i]);
    }

    var eds = root.querySelectorAll("[data-dr-edit]");
    for (i = 0; i < eds.length; i++) {
      (function (el) {
        el.addEventListener("click", function (ev) {
          ev.stopPropagation();
          state.editing = el.getAttribute("data-dr-edit");
          render();
        });
      })(eds[i]);
    }
    var cancels = root.querySelectorAll("[data-dr-cancel]");
    for (i = 0; i < cancels.length; i++) {
      cancels[i].addEventListener("click", function (ev) {
        ev.stopPropagation(); state.editing = null; render();
      });
    }
    var saves = root.querySelectorAll("[data-dr-save]");
    for (i = 0; i < saves.length; i++) {
      (function (el) {
        el.addEventListener("click", function (ev) {
          ev.stopPropagation();
          saveOverride(el.getAttribute("data-dr-save"));
        });
      })(saves[i]);
    }
    var clears = root.querySelectorAll("[data-dr-clear]");
    for (i = 0; i < clears.length; i++) {
      (function (el) {
        el.addEventListener("click", function (ev) {
          ev.stopPropagation();
          var k = el.getAttribute("data-dr-clear");
          delete state.overrides[k];
          writeJson(OVR_KEY, state.overrides);
          state.editing = null;
          buildView();
          render();
        });
      })(clears[i]);
    }
    // กันไม่ให้คลิกในฟอร์มไปพับแถว
    var forms = root.querySelectorAll("[data-dr-form]");
    for (i = 0; i < forms.length; i++) {
      forms[i].addEventListener("click", function (ev) { ev.stopPropagation(); });
    }
  }

  function saveOverride(key) {
    var form = document.querySelector('[data-dr-form="' + key + '"]');
    if (!form) return;
    var vals = {};
    var inputs = form.querySelectorAll("[data-dr-ov]");
    for (var i = 0; i < inputs.length; i++) {
      var name = inputs[i].getAttribute("data-dr-ov");
      var v = String(inputs[i].value || "").replace(/^\s+|\s+$/g, "");
      if (v) vals[name] = v;
    }
    if (!vals.canonicalName && !vals.geography && !vals.instrumentType && !vals.note) {
      delete state.overrides[key];
    } else {
      vals.updatedAt = new Date().toISOString();
      vals.reviewStatus = "ok";
      state.overrides[key] = vals;
    }
    writeJson(OVR_KEY, state.overrides);
    state.editing = null;
    buildView();
    render();
  }

  // รูปร่างไฟล์สำรอง — แยกออกมาเพราะต้องถูกตรวจว่าครบทุก key ที่ผู้ใช้ติ๊กเอง
  // ถ้าลืมเพิ่ม key ใหม่ตรงนี้ ของที่ผู้ใช้ติ๊กไว้จะหายตอนย้ายเครื่องโดยไม่มีใครรู้
  function exportPayload() {
    return {
      v: 1,
      exportedAt: new Date().toISOString(),
      sync: state.sync || null,
      overrides: state.overrides || {},
      ignored: state.ignored || {},
      picked: state.picked || {},
      port: state.port || {}
    };
  }

  function exportAll() {
    try {
      var payload = exportPayload();
      var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "thai-dr-monitor-" + todayYmd() + ".json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    } catch (e) { /* ดาวน์โหลดไม่ได้ก็ไม่ทำให้หน้าพัง */ }
  }

  function importAll() {
    var inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "application/json,.json";
    inp.addEventListener("change", function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var j = JSON.parse(String(rd.result));
          // Top pick รวมกับของเดิม ไม่ทับทิ้ง
          if (j && j.picked && typeof j.picked === "object") {
            var pk2;
            for (pk2 in j.picked) {
              if (Object.prototype.hasOwnProperty.call(j.picked, pk2) && j.picked[pk2]) {
                state.picked[pk2] = true;
              }
            }
            writeJson(PICK_KEY, state.picked);
          }
          // รายการในพอร์ต รวมกับของเดิม ไม่ทับทิ้ง
          if (j && j.port && typeof j.port === "object") {
            var po2;
            for (po2 in j.port) {
              if (Object.prototype.hasOwnProperty.call(j.port, po2) && j.port[po2]) {
                state.port[po2] = true;
              }
            }
            writeJson(PORT_KEY, state.port);
          }
          // รายการ "ไม่สนใจ" รวมกับของเดิม ไม่ทับทิ้ง
          if (j && j.ignored && typeof j.ignored === "object") {
            var ik;
            for (ik in j.ignored) {
              if (Object.prototype.hasOwnProperty.call(j.ignored, ik) && j.ignored[ik]) {
                state.ignored[ik] = true;
              }
            }
            writeJson(IGNORE_KEY, state.ignored);
          }
          if (j && j.overrides && typeof j.overrides === "object") {
            var k;
            for (k in j.overrides) {
              if (Object.prototype.hasOwnProperty.call(j.overrides, k)) {
                state.overrides[k] = j.overrides[k];
              }
            }
            writeJson(OVR_KEY, state.overrides);
          }
          // รวมประวัติการพบเห็น: เก็บ firstSeenAt ที่เก่ากว่าไว้เสมอ
          if (j && j.sync && j.sync.drs && state.sync) {
            var s;
            for (s in j.sync.drs) {
              if (!Object.prototype.hasOwnProperty.call(j.sync.drs, s)) continue;
              var incoming = j.sync.drs[s];
              var cur = state.sync.drs[s];
              if (!cur) state.sync.drs[s] = incoming;
              else if (incoming.firstSeenAt && (!cur.firstSeenAt || incoming.firstSeenAt < cur.firstSeenAt)) {
                cur.firstSeenAt = incoming.firstSeenAt;
              }
            }
            writeJson(INV_KEY, { v: 1, at: Date.now(), rows: state.rows, sync: state.sync });
          }
          buildView();
          render();
        } catch (e) { /* ไฟล์เสียก็ไม่ทำอะไร */ }
      };
      rd.readAsText(f);
    });
    inp.click();
  }

  // อ่านรายการ "ไม่สนใจ" ที่เคยติ๊กไว้ — แยกเป็นฟังก์ชันเพื่อให้เทสต์เรียกได้
  function hydrateIgnored() {
    var ig = readJson(IGNORE_KEY);
    if (ig && typeof ig === "object") state.ignored = ig;
  }
  function hydratePicked() {
    var pk = readJson(PICK_KEY);
    if (pk && typeof pk === "object") state.picked = pk;
  }
  function hydratePort() {
    var po = readJson(PORT_KEY);
    if (po && typeof po === "object") state.port = po;
    // แท็บที่เปิดค้างไว้ครั้งก่อน — ค่าที่ไม่รู้จักให้ตกกลับเป็น "all"
    var tb = null;
    try { tb = localStorage.getItem(TAB_KEY); } catch (e) { tb = null; }
    state.tab = (tb === "port" || tb === "pick" || tb === "all") ? tb : "all";
  }

  function boot() {
    hydrateStats();   // ราคาที่เคยโหลดไว้ (อายุไม่เกิน 12 ชม.) ใช้ต่อได้เลย
    hydrateIgnored();
    hydratePort();
    hydratePicked();
    render();
    load(false);
  }

  window.ThaiDrPage = {
    render: render, load: load, _state: state,
    _buildView: buildView, _applySync: applySync,
    _loadQuote: loadQuote, _loadFx: loadFx, _visible: visibleAssets,
    _loadStats: loadAllStats, _loadStatsFor: loadStatsFor, _hydrateStats: hydrateStats,
    _hydrateIgnored: hydrateIgnored, _hydratePicked: hydratePicked,
    _hydratePort: hydratePort, _exportPayload: exportPayload
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
