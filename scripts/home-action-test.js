"use strict";
// ============================================================
// HOME — กล่อง Action "ต้องทำอะไรวันนี้" (home-action-page.js) — เทสต์ชั้นแสดงผลใน VM sandbox
//   node scripts/home-action-test.js
//
// harness แบบเดียวกับ home-rules-test เดิม: โหลด technical-indicators → decision-journal-engine →
//   home-action-engine → home-action-page ตามที่ home.html โหลดจริง (อ่านจาก HTML) · fetch ปลอม · ไม่ออกเน็ต
// ล็อก: การ์ดเฉพาะหุ้นที่กฎเพิ่งพูดใน 3 วัน · 3 บรรทัดกฎต่อการ์ด · ปุ่ม ทำแล้ว/ไม่ทำ ผูก id คงที่ของเหตุการณ์
//   · ราคาดึงไม่ได้ = แถวแดง ไม่สร้างเหตุการณ์ · แท่งที่ยังไม่ปิดไม่นับ · ไม่มี NaN/undefined · ไม่มีคำแนะนำซื้อขาย
// ============================================================
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var E = require("../public/decision-journal-engine.js");

var ROOT = path.join(__dirname, "..");
var PUB = path.join(ROOT, "public");
var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; return; }
  fail++;
  console.error("  ✗ " + name + (extra !== undefined ? "  → " + JSON.stringify(extra) : ""));
}
function finish() {
  console.log("");
  console.log(pass + fail + " checks · " + pass + " passed · " + fail + " failed");
  process.exit(fail ? 1 : 0);
}
function read(name) { return fs.readFileSync(path.join(PUB, name), "utf8"); }

// ---------- fixture: แท่งราคา ----------
function rep(v, n) { var a = []; for (var i = 0; i < n; i++) a.push(v); return a; }
function isWeekend(ymd) { var dow = new Date(ymd + "T00:00:00Z").getUTCDay(); return dow === 0 || dow === 6; }
function mkBars(endYmd, closes, daily) {
  var dates = [], d = endYmd;
  while (dates.length < closes.length) { if (daily || !isWeekend(d)) dates.unshift(d); d = E.ymdAdd(d, -1); }
  return closes.map(function (c, i) { return { date: dates[i], open: c, high: c, low: c, close: c, volume: 1000 }; });
}
// เวลาเทสต์ 2026-10-29T12:00 กรุงเทพ → US ปิดถึง 2026-10-28 · CRYPTO ปิดถึง 2026-10-28
var NOW = "2026-10-29T12:00";
var BARS = {
  // NVDA: ราบ 100 แล้ว 90, 90 → EMA12 ตัดลง EMA26 บนแท่งแรก (ขาย กฎ 1 · 10-27) · หลุด SMA200 ยืนยันบนแท่ง 10-28 (ขาย กฎ 2) · ย่อ −10% (กฎ 3 เงียบ)
  NVDA: mkBars("2026-10-28", rep(100, 260).concat([90, 90])),
  // GOOG: 200 แล้ว 150, 150 → ย่อ −25% บนแท่ง 10-27 (ซื้อ กฎ 3) · EMA ตัดลงบนแท่งเดียวกัน (ขาย กฎ 1)
  //   192 แท่ง (< 200 = ไม่มี SMA200): แผนเขียน 200 ×230 แต่ชุดนั้นหลุด SMA200 ยืนยันบนแท่ง 10-28 ด้วย (ขาย กฎ 2)
  //   ซึ่งขัดกับข้อ "4 open items (NVDA r1+r2 · GOOG r1+r3)" ของ Task 4 และ "unanswered 2 ตัวกฎ 1" ของ Task 5
  GOOG: mkBars("2026-10-28", rep(200, 190).concat([150, 150])),
  // BTC / ETH: ราบทั้งปี → ไม่มีเหตุการณ์
  "BTC-USD": mkBars("2026-10-28", rep(50000, 262), true),
  "ETH-USD": mkBars("2026-10-28", rep(2000, 262), true),
  // INTC: 40 แท่ง (ไม่มี SMA200) → ไม่มีเหตุการณ์
  INTC: mkBars("2026-10-28", rep(30, 40)),
  "K-GTECHRMF": []
};

// ---------- sandbox DOM ----------
// querySelectorAll("[attr]") คืน element ปลอมหนึ่งตัวต่อค่า attribute ที่พบใน innerHTML ของ root
// (แบบ fakeNodes ของ thai-dr-monitor-view-test) · addEventListener ถูกจดใน handlers["attr|value|event"]
// เขียน innerHTML ใหม่ = DOM เดิมหายไป → ล้าง handler ทั้งหมด (คลิกปุ่มที่ไม่อยู่แล้วต้องไม่ได้ผล)
var els = {};
var handlers = {};
var nodes = {};
function openTag(h, attr, val) {
  var i = h.indexOf(attr + '="' + val + '"');
  if (i < 0) return "";
  var s = h.lastIndexOf("<", i), e = h.indexOf(">", i);
  return h.slice(s, e < 0 ? h.length : e + 1);
}
function fakeNodes(root, sel) {
  var m = /^\[([a-z-]+)\]$/.exec(sel);
  if (!m) return [];
  var attr = m[1], h = root.innerHTML || "";
  var re = new RegExp(attr + '="([^"]*)"', "g"), mm, out = [], seen = {};
  while ((mm = re.exec(h)) !== null) {
    if (seen[mm[1]]) continue;
    seen[mm[1]] = 1;
    (function (val) {
      var tag = openTag(h, attr, val);
      var el = mkEl((/^<([a-zA-Z]+)/.exec(tag) || [])[1] || "div");
      el.attributes[attr] = val;
      el.disabled = /\sdisabled(?=[\s>=\/])/.test(tag);
      // ช่องกรอก: ค่าเริ่มต้นจาก attribute value="…" เหมือนเบราว์เซอร์ (ฟอร์ม prefill ของ Task 5)
      var vAttr = /\svalue="([^"]*)"/.exec(tag);
      if (vAttr) el.value = vAttr[1];
      el.addEventListener = function (ev, fn) { handlers[attr + "|" + val + "|" + ev] = fn; };
      nodes[attr + "|" + val] = el;
      out.push(el);
    })(mm[1]);
  }
  return out;
}
function mkEl(tag) {
  var el = {
    tagName: String(tag || "div").toUpperCase(), id: "", children: [], parentNode: null, disabled: false, value: "",
    attributes: {}, _on: {}, _html: "",
    setAttribute: function (k, v) { this.attributes[k] = v; },
    getAttribute: function (k) { return this.attributes[k] === undefined ? null : this.attributes[k]; },
    addEventListener: function (ev, fn) { (this._on[ev] = this._on[ev] || []).push(fn); },
    appendChild: function (c) { this.children.push(c); c.parentNode = this; return c; },
    insertBefore: function (c, ref) { var i = this.children.indexOf(ref); if (i < 0) this.children.push(c); else this.children.splice(i, 0, c); c.parentNode = this; return c; },
    querySelectorAll: function (sel) { return fakeNodes(this, sel); },
    querySelector: function (sel) { var l = fakeNodes(this, sel); return l.length ? l[0] : null; }
  };
  Object.defineProperty(el, "innerHTML", {
    get: function () { return this._html; },
    set: function (v) { this._html = String(v); handlers = {}; nodes = {}; }
  });
  Object.defineProperty(el, "firstChild", { get: function () { return this.children[0] || null; } });
  Object.defineProperty(el, "firstElementChild", { get: function () { return this.children[0] || null; } });
  return el;
}
function nodeOf(attr, val) { return nodes[attr + "|" + val] || null; }
// คลิกเหมือนผู้ใช้: ปุ่มที่ disabled หรือไม่มี handler = ไม่เกิดอะไร (คืน false)
function click(attr, val) {
  var fn = handlers[attr + "|" + val + "|click"], el = nodeOf(attr, val);
  if (!fn || (el && el.disabled)) return false;
  fn({ preventDefault: function () {}, stopPropagation: function () {}, target: el, currentTarget: el });
  return true;
}
var mcRoot = mkEl("main"); mcRoot.id = "mcRoot";
els.mcRoot = mcRoot;
var doc = {
  readyState: "complete",
  getElementById: function (id) {
    if (id === "mcRoot") return mcRoot;
    if (id === "haRoot") { for (var i = 0; i < mcRoot.children.length; i++) if (mcRoot.children[i].id === "haRoot") return mcRoot.children[i]; return null; }
    return els[id] || null;
  },
  createElement: function (tag) { return mkEl(tag); },
  addEventListener: function () {}
};

// ---------- fetch ปลอม: /api/ohlc + เอกสาร journal (GET / PUT) ----------
var store = {};
var fetchCalls = [];
var failSym = {};            // provider → "reject" | status
var journalDoc = E.emptyDoc();
var puts = [];               // body ของ PUT ทุกครั้ง (Task 5 ใช้)
var docFail = false;         // GET เอกสารล้ม (HTTP 500)
var putFail = false;         // PUT ล้ม (เครือข่าย)
// ---- ตะขอของรอบแก้ (review Task 5): ลำดับ GET/PUT · ค้าง PUT · เปลี่ยนเซิร์ฟเวอร์ "ระหว่าง" คำขอ ----
var docOps = [];             // "GET" / "PUT" ของเอกสาร journal ตามลำดับที่หน้าเรียก (fetchCalls เก็บแค่ URL ซึ่งเหมือนกัน)
var holdPut = false;         // true → PUT ถัดไปค้างจนกว่าจะเรียก releasePut()
var releasePut = null;
var onPutHook = null;        // เรียกครั้งเดียวตอน PUT มาถึง (เช่น แท็บอื่นเขียนร่างระหว่าง PUT)
var onGetHook = null;        // เรียกครั้งเดียวตอน GET เอกสารมาถึง ก่อนตอบ (เช่น เซิร์ฟเวอร์ได้ของใหม่ระหว่างทาง)
var docFailOnce = false;     // true → GET เอกสาร "ครั้งถัดไปครั้งเดียว" ล้ม (HTTP 503) แล้ว GET หลังจากนั้นตอบปกติ (รอบแก้หลังรีวิวสุดท้าย · M7)
// ค้างคำขอราคาของสัญลักษณ์นี้ไว้จนกว่าจะเรียก releaseHold() — ใช้วาดกล่อง "กลางทาง" ของการโหลด
//   เริ่มด้วย INTC: การโหลดตอน boot จึงยังไม่จบจนกว่าเทสต์จะปล่อย
var holdSym = "INTC";
var releaseHold = null;
function respond(status, body) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status: status, text: function () { return Promise.resolve(JSON.stringify(body)); } });
}
var SNAP = { portfolioHoldings: { data: [
  { canonicalSymbol: "NVDA", isHolding: true, marketValue: 100000, portfolioBucket: "foreign-stock" },
  { canonicalSymbol: "GOOGL", isHolding: true, marketValue: 80000, portfolioBucket: "foreign-stock" },
  { canonicalSymbol: "INTC", isHolding: true, marketValue: 50000 },               // ไม่มี bucket → foreign-stock
  { canonicalSymbol: "PTT.BK", isHolding: true, marketValue: 50000 },             // หุ้นไทย → ไม่เอา
  { canonicalSymbol: "K-GTECHRMF", isHolding: true, marketValue: 50000 },         // RMF → ไม่เอา
  { canonicalSymbol: "BTCUSD", isHolding: true, marketValue: 50000 },             // bitcoin sleeve → มีอยู่แล้วใน ALWAYS
  { canonicalSymbol: "AMD", isHolding: false, watchlistOnly: true }               // ไม่ใช่ธงแดง → ไม่เอา
] } };
var snapshotObj = SNAP;
var win = {
  document: doc,
  localStorage: {
    getItem: function (k) { return store[k] === undefined ? null : store[k]; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  },
  addEventListener: function () {},
  PortfolioDataSnapshot: { read: function () { return snapshotObj; } },
  fetch: function (url, opts) {
    var u = String(url);
    var method = (opts && opts.method) || "GET";
    fetchCalls.push(u.replace(/&_ts=\d+/, ""));
    if (/^\/api\/portfolio\?doc=journal$/.test(u)) {
      docOps.push(method);
      if (method === "PUT") {
        if (putFail) return Promise.reject(new TypeError("Failed to fetch"));
        puts.push(String(opts.body));
        if (onPutHook) { var ph = onPutHook; onPutHook = null; ph(); }
        if (holdPut) {
          return new Promise(function (resolve) {
            releasePut = function () { holdPut = false; releasePut = null; resolve(respond(200, { ok: true })); };
          });
        }
        return respond(200, { ok: true });
      }
      if (onGetHook) { var gh = onGetHook; onGetHook = null; gh(); }
      if (docFailOnce) { docFailOnce = false; return respond(503, { error: "fixture journal busy" }); }
      if (docFail) return respond(500, { error: "fixture journal down" });
      return respond(200, { data: JSON.parse(JSON.stringify(journalDoc)) });
    }
    var sym = decodeURIComponent((/[?&]symbol=([^&]+)/.exec(u) || [])[1] || "");
    if (failSym[sym] === "reject") return Promise.reject(new TypeError("Failed to fetch"));
    var status = failSym[sym] || 200;
    var body = status === 200 ? { bars: BARS[sym] || [], sourceType: "LIVE_MARKET_DATA" } : { error: "fixture HTTP " + status + (status === 404 ? " (404)" : "") };
    if (holdSym !== null && holdSym === sym) {
      return new Promise(function (resolve) {
        releaseHold = function () { holdSym = null; releaseHold = null; resolve(respond(status, body)); };
      });
    }
    return respond(status, body);
  },
  console: console, Math: Math, JSON: JSON, Date: Date, Number: Number, String: String, Object: Object, Array: Array,
  Boolean: Boolean, encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent, isFinite: isFinite,
  isNaN: isNaN, parseInt: parseInt, parseFloat: parseFloat, Promise: Promise, RegExp: RegExp, Error: Error, TypeError: TypeError,
  setTimeout: setTimeout, clearTimeout: clearTimeout, Intl: typeof Intl !== "undefined" ? Intl : undefined
};
win.window = win; win.self = win;
win.__DJ_NOW = NOW;
var ctx = vm.createContext(win);

// ---------- helpers ของเทสต์ ----------
function html() { var r = doc.getElementById("haRoot"); return r ? r.innerHTML : ""; }
function cards() { var out = [], re = /data-ha-sym="([^"]+)"/g, m, h = html(); while ((m = re.exec(h)) !== null) out.push(m[1]); return out; }
function cardOf(sym) {
  var h = html(), i = h.indexOf('data-ha-sym="' + sym + '"');
  if (i < 0) return "";
  var s = h.lastIndexOf("<article", i), e = h.indexOf("</article>", i);
  return s < 0 || e < 0 ? "" : h.slice(s, e + "</article>".length);
}
function countIn(str, re) { return (String(str).match(re) || []).length; }
function cssVer(h) { var m = /mission-control-v2\.css\?v=([^"]+)"/.exec(String(h)); return m ? m[1] : null; }
function textOf(s) { return String(s).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
function es5ok(file) {
  var src = read(file).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  return !/=>|\bconst\s|\blet\s|`/.test(src);
}
var LEAK = /(NaN|undefined|Infinity|\[object )/;
var ADVISORY_TH = /ควรซื้อ|ควรขาย|น่าซื้อ|น่าขาย|น่าเข้า|แนะนำซื้อ|จุดเข้า|ตัดขาดทุน/;
var ADVISORY_EN = /\b(Buy|Sell)\b/;
function settle() { return new Promise(function (r) { setTimeout(r, 60); }).then(function () { return new Promise(function (r) { setTimeout(r, 60); }); }); }
// ---- ฟอร์ม inline (Task 5) ----
// หน้าเก็บ element ของช่องกรอกตอน render ด้วย root.querySelectorAll("[name]") (มีฟอร์มเปิดได้ทีละฟอร์ม → name ไม่ซ้ำในกล่อง)
//   แล้วอ่าน .value จาก element ชุดนั้นตอนกดบันทึก · ใน harness, fakeNodes สร้าง element ปลอมต่อค่า name
//   (nodes["name|execPrice"]) ตัวเดียวกับที่หน้าเก็บไว้ → setValue ตั้ง .value บนตัวนั้นเหมือนผู้ใช้พิมพ์
function setValue(name, value) { var el = nodeOf("name", name); if (!el) return false; el.value = String(value); return true; }
function formOf(id) {
  var h = html(), i = h.indexOf('data-ha-form="' + id + '"');
  if (i < 0) return "";
  var s = h.lastIndexOf("<form", i), e = h.indexOf("</form>", i);
  return s < 0 || e < 0 ? "" : h.slice(s, e + "</form>".length);
}
// entry ของ id นี้ใน PUT ครั้งล่าสุด (ไม่มีใน PUT ล่าสุด = null)
function lastPutEntry(id) {
  if (!puts.length) return null;
  var d = JSON.parse(puts[puts.length - 1]).data, list = (d && d.entries) || [];
  for (var i = 0; i < list.length; i++) if (list[i] && list[i].id === id) return list[i];
  return null;
}
function getCount(substr) { return fetchCalls.filter(function (u) { return u.indexOf(substr) >= 0; }).length; }

// ---------- โหลดสคริปต์ชุดเดียวกับ home.html ----------
var HOME = read("home.html");
// big-cache.js (2026-11-10): cache ราคาของกล่องย้ายจาก localStorage ไป BigCache — โหลดก่อนผู้ใช้ทุกตัวเหมือน home.html
var WANT = ["big-cache.js", "technical-indicators.js", "decision-journal-engine.js", "home-action-engine.js", "home-action-page.js"];
var scripts = (function () {
  var out = [], re = /<script src="\/([A-Za-z0-9._-]+\.js)/g, m;
  while ((m = re.exec(HOME)) !== null) if (WANT.indexOf(m[1]) >= 0) out.push(m[1]);
  return out;
})();
var css = read("mission-control-v2.css");

t("home.html loads indicators → journal engine → action engine → action page before app-navigation · old home-rules-page is gone", scripts.join() === WANT.join() && HOME.indexOf("home-rules-page.js") < 0 &&
  HOME.indexOf("home-action-page.js") < HOME.indexOf("app-navigation.js?v="), scripts);
t("css versions identical in home/ai-cycle/wave3 and bumped", cssVer(HOME) === cssVer(read("ai-cycle.html")) && cssVer(HOME) === cssVer(read("wave3.html")) && cssVer(HOME) !== "20261030-mcx-10", cssVer(HOME));
var bootOk = scripts.length === WANT.length;
// เครื่องผู้ใช้ก่อนแก้ยังมี cache ก้อนเดิมใน localStorage (≈1M ตัวอักษร) → big-cache.js ต้องลบทิ้งตอนโหลดหน้า
store["home_rules_ohlc_v1"] = JSON.stringify({ NVDA: { at: "2026-10-29", start: "2024-10-29", cutoff: "2026-10-28", bars: [] } });
scripts.forEach(function (f) {
  try { vm.runInContext(read(f), ctx, { filename: f }); }
  catch (e) { bootOk = false; console.error("   boot " + f + ": " + e.message); }
});
var H = win.HomeAction;
t("boots · window.HomeAction exposed", bootOk && !!H && typeof H.refresh === "function" && typeof H.render === "function");
t("big-cache.js removed the legacy localStorage price cache on page load", store["home_rules_ohlc_v1"] === undefined && !!win.BigCache);

(async function () {
  if (!H) { finish(); return; }
  // ---- กลางทางของการโหลดครั้งแรก (INTC ค้างตั้งแต่ boot · ตัวอื่นได้ราคาแล้ว) ----
  // วาดซ้ำตอนนี้ = เหมือน MutationObserver ใส่กล่องกลับ หรือ refresh รอบสองวาดตอนเริ่ม
  // ห้ามบอกว่า "ไม่มีสัญญาณใหม่" เพราะยังไม่ได้เทียบเหตุการณ์กับบันทึกเลย (state.items ยังว่าง)
  await settle();
  var midRows = H._state.rows.map(function (r) { return r.sym + ":" + r.status; });
  H.render();
  t("mid-load render (INTC still fetching): loading state, no 'ไม่มีสัญญาณใหม่' for NVDA/GOOG, no cards yet",
    typeof releaseHold === "function" && H._state.loading === true && /กำลังดึงราคา/.test(html()) &&
    !/ไม่มีสัญญาณใหม่/.test(html()) && cards().length === 0, [midRows, textOf(html())]);
  if (releaseHold) releaseHold();
  await settle();
  t("after the held fetch is released the run completes: NVDA + GOOG cards, 4 open items", H._state.loading === false &&
    cards().join() === "NVDA,GOOG" && H._state.items.length === 4, [cards(), H._state.items.length]);
  t("card mounted first in #mcRoot with the new heading and the not-advice line", mcRoot.children[0].id === "haRoot" && /<h2 id="haTitle"[^>]*>ต้องทำอะไรวันนี้<\/h2>/.test(html()) && /ไม่ใช่คำแนะนำการลงทุน/.test(html()) && /3 วันหลังสุด/.test(html()));
  t("only symbols with a visible event get a card: NVDA · GOOG (not BTC/ETH/INTC)", cards().join() === "GOOG,NVDA" || cards().join() === "NVDA,GOOG", cards());
  // หมายเหตุ fixture: การร่วงจากราบทำให้ EMA12 ตัดลง EMA26 บนแท่งแรกด้วย → NVDA มี 2 รายการขาย (กฎ 1 วันที่ 10-27 · กฎ 2 วันที่ 10-28) เหมือนเคส DDOG จริงของผู้ใช้
  //   daysLeft = (D+3) − วันนี้: 10-27 → เหลือ 1 วัน · 10-28 → เหลือ 2 วัน
  t("NVDA card: 3 rule lines · rule 1 = ขาย (EMA12 ตัดลง, สัญญาณ 2026-10-27, เหลือ 1 วัน) · rule 2 = ขาย (หลุด SMA200 ยืนยัน, สัญญาณ 2026-10-28, เหลือ 2 วัน) · rule 3 = no new signal (ยังไม่ถึง 20%)", countIn(cardOf("NVDA"), /data-ha-rule="/g) === 3 && /data-ha-rule="1"[\s\S]*?ha-act is-sell">ขาย<[\s\S]*?EMA12 ตัดลง EMA26[\s\S]*?สัญญาณ 2026-10-27[\s\S]*?เหลือ 1 วัน/.test(cardOf("NVDA")) && /data-ha-rule="2"[\s\S]*?ha-act is-sell">ขาย<[\s\S]*?หลุด SMA200 ยืนยัน[\s\S]*?สัญญาณ 2026-10-28[\s\S]*?เหลือ 2 วัน/.test(cardOf("NVDA")) && /data-ha-rule="3"[\s\S]*?ไม่มีสัญญาณใหม่[\s\S]*?ยังไม่ถึง 20%/.test(cardOf("NVDA")), textOf(cardOf("NVDA")));
  t("GOOG card shows both the sell (กฎ 1) and the buy (กฎ 3) lines with buttons", /ha-act is-sell">ขาย</.test(cardOf("GOOG")) && /ha-act is-buy">ซื้อ</.test(cardOf("GOOG")) && /data-ha-done="ha_GOOG_3_buy_2026-10-27"/.test(cardOf("GOOG")) && /data-ha-skip="ha_GOOG_3_buy_2026-10-27"/.test(cardOf("GOOG")) && /data-ha-done="ha_GOOG_1_sell_2026-10-27"/.test(cardOf("GOOG")));
  t("quiet line lists symbols without new signals (BTC · ETH · INTC) · INTC has no card", /ไม่มีสัญญาณใหม่ใน 3 วัน[^<]*BTCUSD[^<]*ETHUSD[^<]*INTC/.test(html()) && !/data-ha-sym="INTC"/.test(html()));
  t("items state: 4 open items (NVDA r1+r2 · GOOG r1+r3), 0 expired", H._state.items.filter(function (x) { return x.vis.visible; }).length === 4 && H._state.toRecord.length === 0);
  t("journal doc loaded via GET only (no PUT yet) · launchedAt set to today", fetchCalls.filter(function (u) { return /doc=journal/.test(u); }).length === 1 && puts.length === 0 && H._state.launchedAt === "2026-10-29");
  failSym.NVDA = "reject";
  await H.refresh(true); await settle();
  t("price failure: NVDA has no card, an error row instead, nothing recorded", !/data-ha-sym="NVDA"/.test(html()) && /NVDA[^<]*ดึงราคาไม่สำเร็จ/.test(html()) && H._state.toRecord.length === 0);
  failSym = {};
  win.__DJ_NOW = "2026-10-29T04:00";   // US bar 10-28 not closed yet
  await H.refresh(true); await settle();
  t("before the US close the 10-28 bar is ignored: NVDA has no confirmed break item (rule-1 item of 10-27 remains)", !/data-ha-done="ha_NVDA_2_sell_2026-10-28"/.test(html()) && /data-ha-done="ha_NVDA_1_sell_2026-10-27"/.test(html()));
  win.__DJ_NOW = NOW;
  mcRoot.children = []; H.render();
  t("re-mounts after mcRoot rebuild", mcRoot.children[0] && mcRoot.children[0].id === "haRoot");
  t("no NaN/undefined · no advisory wording · ES5 page+engine · CSS .ha-card/.ha-rule/.ha-act.is-sell + 600px breakpoint", !LEAK.test(html()) && !ADVISORY_TH.test(html()) && !ADVISORY_EN.test(html()) && es5ok("home-action-page.js") && es5ok("home-action-engine.js") && /\.ha-card\s*\{/.test(css) && /\.ha-act\.is-sell/.test(css) && /@media \(max-width: 600px\)[\s\S]*\.ha-/.test(css),
    (LEAK.exec(html()) || ADVISORY_TH.exec(html()) || ADVISORY_EN.exec(html()) || [])[0]);

  // ---- ย้ายมาจาก home-rules-test (โค้ด universe / cache / in-flight ย้ายมาทั้งก้อน ต้องยังถูกล็อก) ----
  function syms() { return H._state.rows.map(function (r) { return r.sym; }).join(); }
  function rowState(sym) { return H._state.rows.filter(function (r) { return r.sym === sym; })[0] || {}; }
  function ohlcSince(n) { return fetchCalls.slice(n).filter(function (u) { return /^\/api\/ohlc\?/.test(u); }); }
  t("fetches provider symbols BTC-USD / ETH-USD with a 2-year start", fetchCalls.some(function (u) { return /symbol=BTC-USD&start=2024-10-29/.test(u); }) &&
    fetchCalls.some(function (u) { return /symbol=ETH-USD&start=2024-10-29/.test(u); }), fetchCalls.slice(0, 8));
  // รอบ 04:00 เก็บ cache ไว้กับแท่งที่ปิด 10-27 → ที่ 12:00 (ปิดถึง 10-28) ต้องไม่ใช้ของเดิม
  var nWarm = fetchCalls.length;
  await H.refresh(false); await settle();
  t("cache key includes the closed bar: the 04:00 cache is not reused at 12:00 (BTC refetched)", ohlcSince(nWarm).some(function (u) { return /symbol=BTC-USD&/.test(u); }), ohlcSince(nWarm));
  t("universe = BTC · ETH · foreign-stock red-flag holdings (GOOGL→GOOG) · no Thai stock / RMF / watchlist-only / duplicate BTC",
    syms() === "BTCUSD,ETHUSD,NVDA,GOOG,INTC" && H._state.rows.filter(function (r) { return r.sym === "BTCUSD"; }).length === 1 &&
    !fetchCalls.some(function (u) { return /symbol=(PTT\.BK|K-GTECHRMF|AMD|GOOGL)&/.test(u); }), syms());
  t("sources: BTC/ETH ติดตามเสมอ · stocks ในพอร์ต (state and card header)",
    H._buildUniverse().map(function (u) { return u.sym + ":" + u.source; }).join() === "BTCUSD:always,ETHUSD:always,NVDA:portfolio,GOOG:portfolio,INTC:portfolio" &&
    /<span class="ha-src">ในพอร์ต<\/span>/.test(cardOf("NVDA")));
  var n0 = fetchCalls.length;
  await H.refresh(false); await settle();
  t("second non-forced run on the same day + closed bar is served from cache: no /api/ohlc call at all", ohlcSince(n0).length === 0 &&
    cards().join() === "NVDA,GOOG", ohlcSince(n0));
  // ---- cache ราคาอยู่ใน BigCache (IndexedDB ในเบราว์เซอร์ · memory ใน VM) record ละสัญลักษณ์ ไม่ใช่ localStorage (2026-11-10) ----
  var HKEYS = ["home_rules_ohlc_v1:BTCUSD", "home_rules_ohlc_v1:ETHUSD", "home_rules_ohlc_v1:GOOG", "home_rules_ohlc_v1:INTC", "home_rules_ohlc_v1:NVDA"];
  var bk0 = await win.BigCache.keys("home_rules_ohlc_v1:");
  t("price cache = one BigCache record per symbol · nothing in localStorage", bk0.join() === HKEYS.join() && store["home_rules_ohlc_v1"] === undefined &&
    !Object.keys(store).some(function (k) { return /ohlc/.test(k); }), [bk0, Object.keys(store)]);
  var nvRec = await win.BigCache.get("home_rules_ohlc_v1:NVDA");
  t("record keeps the old entry shape { at, start, cutoff, sourceType, bars: packed rows }", !!nvRec && nvRec.at === "2026-10-29" && nvRec.start === "2024-10-29" &&
    nvRec.cutoff === "2026-10-28" && nvRec.sourceType === "LIVE_MARKET_DATA" && nvRec.bars.length === 262 && nvRec.bars[0].length === 6, nvRec && [nvRec.at, nvRec.start, nvRec.cutoff, nvRec.bars.length]);
  var n1 = fetchCalls.length;
  await H.refresh(true); await settle();
  t("forced refresh clears the cache and refetches (BTC-USD requested again)", ohlcSince(n1).some(function (u) { return /symbol=BTC-USD&/.test(u); }), ohlcSince(n1));
  // ดึงซ้อน: refresh สองครั้งพร้อมกัน → คำขอราคาต่อสัญลักษณ์ครั้งเดียว (barsInflight)
  var n2 = fetchCalls.length;
  var p1 = H.refresh(true), p2 = H.refresh(false);
  await p1; await p2; await settle();
  var dup = {};
  ohlcSince(n2).forEach(function (u) { var s = (/symbol=([^&]+)/.exec(u) || [])[1]; dup[s] = (dup[s] || 0) + 1; });
  t("overlapping refreshes share one in-flight request per symbol", Object.keys(dup).length === 5 && Object.keys(dup).every(function (k) { return dup[k] === 1; }), dup);
  t("…and the newest run still renders every row and both cards", H._state.rows.length === 5 && H._state.rows.every(function (r) { return r.status === "ok"; }) &&
    cards().join() === "NVDA,GOOG" && H._state.loading === false);
  // MAX_CACHE_SYMBOLS (24): เกินแล้วตัดตัวที่ at เก่าสุดทิ้ง — ตัวของวันนี้อยู่ครบ
  for (var oi = 0; oi < 30; oi++) await win.BigCache.set("home_rules_ohlc_v1:OLD" + (oi < 10 ? "0" : "") + oi, { at: "2026-09-" + (oi < 9 ? "0" : "") + (oi % 28 + 1), start: "2024-09-01", cutoff: "2026-09-01", bars: [] });
  var nP = fetchCalls.length;
  await H.refresh(false); await settle();
  var bkP = await win.BigCache.keys("home_rules_ohlc_v1:");
  t("pruning keeps at most 24 records, today's 5 symbols all kept, the oldest 'at' dropped first, no refetch", bkP.length === 24 &&
    HKEYS.every(function (k) { return bkP.indexOf(k) >= 0; }) && bkP.indexOf("home_rules_ohlc_v1:OLD00") < 0 && ohlcSince(nP).length === 0, [bkP.length, bkP.slice(0, 6)]);
  await H.refresh(true); await settle();
  var bkF = await win.BigCache.keys("home_rules_ohlc_v1:");
  t("forced refresh clears every record under the prefix, then only the universe is cached again", bkF.join() === HKEYS.join(), bkF);
  // 404 → แถวแดง "ไม่พบสัญลักษณ์นี้ที่แหล่งข้อมูล" · ไม่มีการ์ด · ตัวอื่นไม่กระทบ
  failSym.GOOG = 404;
  await H.refresh(true); await settle();
  t("404 → GOOG red row 'ไม่พบสัญลักษณ์นี้ที่แหล่งข้อมูล' (status no-bars), no GOOG card, NVDA unaffected",
    /<div class="ha-err">GOOG · ไม่พบสัญลักษณ์นี้ที่แหล่งข้อมูล<\/div>/.test(html()) && rowState("GOOG").status === "no-bars" &&
    !/data-ha-sym="GOOG"/.test(html()) && /data-ha-sym="NVDA"/.test(html()), textOf(html()));
  failSym = {};
  // ไม่มีพอร์ต / มีพอร์ตแต่ไม่มีหุ้นต่างประเทศธงแดง → BTC + ETH เท่านั้น พร้อมเหตุผล
  //   (สองข้อนี้คือเครื่องที่ไม่เคยเห็นหุ้นในพอร์ต — ล้าง "หุ้นที่เพิ่งออกจากพอร์ต" ของเครื่องนี้ก่อน · กรณีเพิ่งออกล็อกไว้ในรอบแก้ I2 ท้ายไฟล์)
  delete store["home_action_recent_v1"];
  snapshotObj = null;
  await H.refresh(false); await settle();
  t("no holdings → universe is BTC + ETH only, with a note why", syms() === "BTCUSD,ETHUSD" && /<p class="ha-note">ยังไม่มีรายการหุ้นในพอร์ต/.test(html()), [syms(), textOf(html())]);
  snapshotObj = { portfolioHoldings: { data: [
    { canonicalSymbol: "PTT.BK", isHolding: true, marketValue: 50000 },
    { canonicalSymbol: "K-GTECHRMF", isHolding: true, marketValue: 50000 },
    { canonicalSymbol: "AMD", isHolding: false, watchlistOnly: true }
  ] } };
  await H.refresh(false); await settle();
  t("holdings without a red-flag foreign stock → BTC + ETH only, note says to flag one", syms() === "BTCUSD,ETHUSD" && /ยังไม่มีหุ้นธงแดงในกลุ่มหุ้นต่างประเทศ/.test(html()), syms());
  snapshotObj = SNAP;
  // launchedAt (คำตัดสินของผู้คุม): โหลดเอกสารได้และไม่มี haLaunchedAt → เก็บวันนี้ลงเครื่องทันที ·
  //   โหลดเอกสารไม่ได้ → ใช้วันนี้ชั่วคราว ไม่เก็บ · เอกสารมี haLaunchedAt → ใช้และเก็บค่านั้น
  var LKEY = "home_action_launched_v1";
  t("doc loaded OK without haLaunchedAt → today was persisted to localStorage on the first load", store[LKEY] === "2026-10-29");
  delete store[LKEY]; docFail = true;
  await H.refresh(false); await settle();
  t("journal GET failed + no saved launch date → launchedAt = today in memory only (not persisted)", H._state.docState === "error" &&
    H._state.launchedAt === "2026-10-29" && store[LKEY] === undefined);
  docFail = false;
  await H.refresh(false); await settle();
  t("journal loads OK again without haLaunchedAt → today persisted immediately", H._state.docState === "ok" && store[LKEY] === "2026-10-29");
  delete store[LKEY]; journalDoc = { v: 1, updatedAt: null, entries: [], trades: [], haLaunchedAt: "2026-10-20" };
  await H.refresh(false); await settle();
  t("doc carries haLaunchedAt → used and copied to localStorage", H._state.launchedAt === "2026-10-20" && store[LKEY] === "2026-10-20" &&
    H._state.doc.haLaunchedAt === "2026-10-20");
  // คืนสภาพตั้งต้นให้เทสต์ถัดไป: พอร์ตเดิม · เอกสารว่าง · launchedAt วันนี้ · ราคาสด
  journalDoc = E.emptyDoc(); store[LKEY] = "2026-10-29"; win.__DJ_NOW = NOW;
  await H.refresh(true); await settle();
  t("baseline restored: NVDA + GOOG cards, 4 open items, launchedAt today, still no PUT", cards().join() === "NVDA,GOOG" && H._state.items.length === 4 &&
    H._state.launchedAt === "2026-10-29" && H._state.docState === "ok" && puts.length === 0, [cards(), H._state.items.length, puts.length]);

  // ================= Task 5: ติ๊ก ทำแล้ว/ไม่ทำ · บันทึกลง journal · ไม่ได้ตอบอัตโนมัติ · แก้ =================
  // ติ๊ก ทำแล้ว NVDA กฎ 2 (ขาย) → ฟอร์มกาง prefill 90 → ยืนยัน → PUT 1 ครั้ง entry ถูกต้อง positionValue จาก holdings
  t("clicking ทำแล้ว opens the inline form prefilled with the latest close", click("data-ha-done", "ha_NVDA_2_sell_2026-10-28") && /data-ha-form="ha_NVDA_2_sell_2026-10-28"[\s\S]*?name="execPrice"[^>]*value="90"/.test(html()) && !/name="amount"/.test(formOf("ha_NVDA_2_sell_2026-10-28")));
  setValue("execPrice", "91.5"); click("data-ha-confirm", "ha_NVDA_2_sell_2026-10-28"); await settle();
  var e1 = lastPutEntry("ha_NVDA_2_sell_2026-10-28");
  t("done entry PUT once: GET-before-PUT, response done, execPrice 91.5, positionValue 100000 THB, no view/verdict, validator-clean", puts.length === 1 && e1 && e1.ha.response === "done" && e1.ha.execPrice === 91.5 && e1.ha.positionValue === 100000 && e1.ha.positionCurrency === "THB" && e1.view === undefined && E.itemProblems(e1).length === 0 && getCount("doc=journal") >= 2, e1);
  t("line now shows ทำแล้ว ✓ ที่ 91.50 and an แก้ button, faded", /ทำแล้ว ✓[^<]*91\.50/.test(cardOf("NVDA")) && /data-ha-edit="ha_NVDA_2_sell_2026-10-28"/.test(cardOf("NVDA")) && /ha-rule is-answered/.test(cardOf("NVDA")));
  t("buy line form has the optional amount field", click("data-ha-done", "ha_GOOG_3_buy_2026-10-27") && /name="amount"/.test(formOf("ha_GOOG_3_buy_2026-10-27")));
  click("data-ha-cancel", "ha_GOOG_3_buy_2026-10-27");
  click("data-ha-skip", "ha_GOOG_3_buy_2026-10-27"); await settle();
  t("ไม่ทำ records immediately with response skipped", lastPutEntry("ha_GOOG_3_buy_2026-10-27").ha.response === "skipped" && /ไม่ทำ/.test(cardOf("GOOG")));
  journalDoc = JSON.parse(puts[puts.length - 1]).data;   // เซิร์ฟเวอร์เก็บแล้ว
  await H.refresh(true); await settle();
  t("reload: ticked items stay (faded) and are not re-created · no extra PUT", puts.length === 2 && /ทำแล้ว ✓/.test(cardOf("NVDA")) && H._state.doc.entries.filter(function (e) { return e.id === "ha_NVDA_2_sell_2026-10-28"; }).length === 1);
  // แก้: เปลี่ยน skipped → done
  click("data-ha-edit", "ha_GOOG_3_buy_2026-10-27"); setValue("amount", "20000"); click("data-ha-confirm", "ha_GOOG_3_buy_2026-10-27"); await settle();
  t("edit overwrites the same id (newer updatedAt) with response done and amount 20000", lastPutEntry("ha_GOOG_3_buy_2026-10-27").ha.response === "done" && lastPutEntry("ha_GOOG_3_buy_2026-10-27").ha.amount === 20000 && lastPutEntry("ha_GOOG_3_buy_2026-10-27").updatedAt > e1.updatedAt);
  // หมดเวลา: เลื่อนเวลาไป 2026-11-02 → รายการที่ยังไม่ติ๊ก (NVDA กฎ 1 และ GOOG กฎ 1 ทั้งคู่วันที่ 10-27) หมดเวลา → unanswered ตัวละครั้ง · รอบถัดไปไม่ซ้ำ
  journalDoc = JSON.parse(puts[puts.length - 1]).data; win.__DJ_NOW = "2026-11-02T12:00";
  await H.refresh(true); await settle();
  var un = H._state.doc.entries.filter(function (e) { return e.ha && e.ha.response === "unanswered"; });
  t("the two expired unticked rule-1 sells are recorded as unanswered exactly once each (one PUT), and their lines are gone", un.length === 2 && un.every(function (e) { return e.ha.rule === 1 && e.ha.respondedAt === null; }) && !/data-ha-done="ha_GOOG_1/.test(html()) && !/data-ha-done="ha_NVDA_1/.test(html()) && puts.length === 4);
  // คำตัดสินของผู้คุม (รอบแก้): "ไม่ได้ตอบ" ฝั่งขายเก็บมูลค่าที่ถืออยู่ตอนบันทึก (ผลของการไม่ทำเป็นบาท) — lookup เดียวกับตอนติ๊ก
  var unN1 = lastPutEntry("ha_NVDA_1_sell_2026-10-27"), unG1 = lastPutEntry("ha_GOOG_1_sell_2026-10-27");
  t("auto ไม่ได้ตอบ sells carry the holding value at record time: NVDA 100000 THB · GOOG (held as GOOGL) 80000 THB · amount null",
    unN1 && unN1.ha.response === "unanswered" && unN1.ha.positionValue === 100000 && unN1.ha.positionCurrency === "THB" && unN1.ha.amount === null &&
    unG1 && unG1.ha.positionValue === 80000 && unG1.ha.positionCurrency === "THB", [unN1 && unN1.ha, unG1 && unG1.ha]);
  var nPut = puts.length; journalDoc = JSON.parse(puts[puts.length - 1]).data;
  await H.refresh(true); await settle();
  t("second load after expiry does not record again", puts.length === nPut);
  // tombstone จาก /decision-journal → ไม่บันทึกซ้ำ
  journalDoc.entries = journalDoc.entries.map(function (e) { return e.id === un[0].id ? E.tombstone(e, "2026-11-02T13:00:00.000Z") : e; });
  await H.refresh(true); await settle();
  t("a tombstoned unanswered entry is not re-created", puts.length === nPut && H._state.doc.entries.filter(function (e) { return e.id === un[0].id && !e.deletedAt; }).length === 0);
  // GET เอกสารล้ม → ไม่บันทึกอัตโนมัติ ปุ่มปิด
  docFail = true; win.__DJ_NOW = "2026-11-05T12:00"; journalDoc = E.emptyDoc();
  await H.refresh(true); await settle();
  t("journal GET failure: docState error, every tick button disabled with a reason, no PUT, nothing auto-recorded", H._state.docState === "error" && puts.length === nPut && /ยังโหลดบันทึกจากเซิร์ฟเวอร์ไม่ได้/.test(html()) && !/data-ha-done="[^"]+"(?![^>]*disabled)/.test(html()));
  docFail = false;
  // PUT ล้ม → ร่างใน localStorage รูปเดียวกับ journal page
  win.__DJ_NOW = NOW; journalDoc = E.emptyDoc(); putFail = true;
  await H.refresh(true); await settle();
  click("data-ha-skip", "ha_NVDA_2_sell_2026-10-28"); await settle();
  var draft = JSON.parse(store["decision_journal_draft_v1"] || "null");
  t("PUT failure keeps the entry in the journal draft (same shape as /decision-journal) and says so", draft && draft.doc && draft.doc.entries.some(function (e) { return e.id === "ha_NVDA_2_sell_2026-10-28"; }) && typeof draft.savedAt === "string" && /ยังไม่ถึงเซิร์ฟเวอร์/.test(html()));
  putFail = false; var before = puts.length;
  await H.refresh(true); await settle();
  t("next load flushes the draft (one PUT) and clears it", puts.length === before + 1 && store["decision_journal_draft_v1"] === undefined);
  t("launchedAt written into the doc on first PUT", JSON.parse(puts[0]).data.haLaunchedAt === "2026-10-29");

  // ---- ฟอร์ม (เพิ่มจากคำตัดสินของผู้คุม): ตรวจค่าก่อนส่ง · สลับคำตอบตอนแก้ · ค่าที่พิมพ์ค้างรอดการวาดใหม่ · Enter = บันทึก ----
  var N1 = "ha_NVDA_1_sell_2026-10-27", N2 = "ha_NVDA_2_sell_2026-10-28", G3 = "ha_GOOG_3_buy_2026-10-27";
  var p0 = puts.length;
  click("data-ha-done", N1); setValue("execPrice", "0"); click("data-ha-confirm", N1); await settle();
  var zeroRefused = puts.length === p0 && /ราคาต้องมากกว่า 0/.test(formOf(N1));
  setValue("execPrice", ""); click("data-ha-confirm", N1); await settle();
  t("price 0 or empty is refused inline (ราคาต้องมากกว่า 0) · form stays open · no PUT", zeroRefused && puts.length === p0 && /ราคาต้องมากกว่า 0/.test(formOf(N1)));
  setValue("execPrice", "88"); H.render();
  t("a value typed into the open form survives a re-render (PUT/load finishing)", /name="execPrice"[^>]*value="88"/.test(formOf(N1)));
  click("data-ha-cancel", N1);
  t("cancel closes the form and brings the line's buttons back", formOf(N1) === "" && /data-ha-done="ha_NVDA_1_sell_2026-10-27"/.test(html()));
  click("data-ha-done", G3); setValue("amount", "-5"); click("data-ha-confirm", G3); await settle();
  t("negative amount is refused inline · no PUT", puts.length === p0 && /เงินที่ซื้อต้องมากกว่า 0 หรือเว้นว่าง/.test(formOf(G3)));
  // ไม่ทำ บนบรรทัดอื่นระหว่างที่ฟอร์ม GOOG กฎ 3 กางอยู่ → ฟอร์มนี้ยังอยู่พร้อมค่าที่พิมพ์ (ไม่ถูกปิดทิ้ง)
  setValue("amount", "1500"); click("data-ha-skip", "ha_GOOG_1_sell_2026-10-27"); await settle();
  t("skipping another line keeps the open form and what was typed in it", puts.length === p0 + 1 && lastPutEntry("ha_GOOG_1_sell_2026-10-27").ha.response === "skipped" &&
    /name="amount"[^>]*value="1500"/.test(formOf(G3)));
  p0 = puts.length;
  t("with a form open: no NaN/undefined · no advisory words · no ฿ inside any title attribute", !LEAK.test(html()) && !ADVISORY_TH.test(html()) && !ADVISORY_EN.test(html()) && !/title="[^"]*฿/.test(html()),
    (LEAK.exec(html()) || ADVISORY_TH.exec(html()) || ADVISORY_EN.exec(html()) || [])[0]);
  click("data-ha-cancel", G3);
  // แก้ NVDA กฎ 2 (ตอนนี้ "ไม่ทำ" จากร่างที่ส่งแล้ว) → เปิดเป็นทำแล้ว + ปุ่มสลับ · สลับไปไม่ทำ = ไม่มีช่องราคา · สลับกลับ = ราคาที่พิมพ์ยังอยู่
  var prevN2 = H._state.doc.entries.filter(function (e) { return e.id === N2; })[0] || {};
  click("data-ha-edit", N2);
  var openedDone = /name="execPrice"/.test(formOf(N2)) && /data-ha-toggle="ha_NVDA_2_sell_2026-10-28"/.test(formOf(N2));
  setValue("execPrice", "89"); click("data-ha-toggle", N2);
  var asSkip = !/name="execPrice"/.test(formOf(N2)) && /บันทึกใหม่เป็น <b>ไม่ทำ/.test(formOf(N2));
  click("data-ha-toggle", N2);
  t("edit opens as ทำแล้ว with a toggle · toggled to ไม่ทำ hides the price · toggled back restores the typed price",
    prevN2.ha && prevN2.ha.response === "skipped" && openedDone && asSkip && /name="execPrice"[^>]*value="89"/.test(formOf(N2)));
  // Enter ในช่องกรอก = submit ของฟอร์ม → หน้าต้อง preventDefault (ไม่โหลดหน้าใหม่) แล้วบันทึก
  //   พอร์ตวันนี้ NVDA = 120000 แต่ฐานเงินต้องคงค่าตอนติ๊กครั้งแรก (100000)
  snapshotObj = { portfolioHoldings: { data: SNAP.portfolioHoldings.data.map(function (h) {
    return h.canonicalSymbol === "NVDA" ? { canonicalSymbol: "NVDA", isHolding: true, marketValue: 120000, portfolioBucket: "foreign-stock" } : h;
  }) } };
  var prevented = false, sub = handlers["data-ha-form|" + N2 + "|submit"];
  if (sub) sub({ preventDefault: function () { prevented = true; } });
  await settle();
  snapshotObj = SNAP;
  var eN2 = lastPutEntry(N2);
  t("form submit (Enter) is intercepted and saves: done at 89 · same id · createdAt and sell positionValue kept from the first tick",
    prevented && puts.length === p0 + 1 && eN2 && eN2.ha.response === "done" && eN2.ha.execPrice === 89 &&
    eN2.createdAt === prevN2.createdAt && eN2.updatedAt > prevN2.updatedAt && eN2.ha.positionValue === 100000, eN2);
  // คำตอบที่ยังค้างในร่าง ต้องรวมเข้าเอกสารก่อนตัดสินว่าอะไร "ไม่ได้ตอบ" — ไม่งั้น unanswered (ตราประทับใหม่กว่า) ทับคำตอบจริง
  //   เซิร์ฟเวอร์ = สิ่งที่ PUT ล่าสุดส่งไป (NVDA กฎ 2 ทำแล้ว · GOOG กฎ 1 ไม่ทำ) → ที่ยังไม่ได้ตอบคือ NVDA กฎ 1 (อยู่ในร่าง) กับ GOOG กฎ 3
  journalDoc = JSON.parse(puts[puts.length - 1]).data; putFail = true;
  await H.refresh(true); await settle();
  click("data-ha-skip", N1); await settle();
  var dr = JSON.parse(store["decision_journal_draft_v1"] || "null");
  var draftHasN1 = !!(dr && dr.doc && dr.doc.entries.some(function (e) { return e.id === N1; }));
  putFail = false; win.__DJ_NOW = "2026-11-02T12:00"; var p1 = puts.length;
  await H.refresh(true); await settle();
  var lastDoc = JSON.parse(puts[puts.length - 1]).data, eN1 = lastPutEntry(N1);
  var unAll = lastDoc.entries.filter(function (e) { return e.ha && e.ha.response === "unanswered"; });
  t("an answer still in the draft survives its window closing: not overwritten by the auto ไม่ได้ตอบ · one PUT carries it + GOOG กฎ 3 as unanswered · draft cleared",
    draftHasN1 && puts.length === p1 + 1 && eN1 && eN1.ha.response === "skipped" &&
    unAll.length === 1 && unAll[0].id === G3 && store["decision_journal_draft_v1"] === undefined,
    [draftHasN1, puts.length - p1, eN1 && eN1.ha.response, unAll.map(function (e) { return e.id; })]);
  t("auto ไม่ได้ตอบ on a buy has no money base (positionValue null · amount null)", unAll[0] && unAll[0].ha.positionValue === null && unAll[0].ha.positionCurrency === null && unAll[0].ha.amount === null);
  win.__DJ_NOW = NOW;
  // นาฬิกาเครื่องนี้ช้ากว่าเครื่องที่บันทึกก่อน: entry เดิมมี updatedAt ในอนาคต → คำตอบที่แก้ต้องยังชนะตอน merge (ตราประทับขยับเลยของเดิม)
  journalDoc = JSON.parse(puts[puts.length - 1]).data;
  await H.refresh(true); await settle();
  var itG3 = H._state.items.filter(function (x) { return win.HomeActionEngine.entryIdOf(x.event) === G3; })[0];
  var FUT = "2099-01-01T00:00:00.000Z";
  var futE = itG3 ? win.HomeActionEngine.makeEntry(itG3.event, { response: "skipped", nowIso: FUT, respondedAt: FUT, execPrice: null, positionValue: null, positionCurrency: null, amount: null }) : null;
  journalDoc = { v: 1, updatedAt: FUT, entries: futE ? [JSON.parse(JSON.stringify(futE))] : [], trades: [] };
  await H.refresh(true); await settle();
  var p2 = puts.length;
  click("data-ha-edit", G3); click("data-ha-confirm", G3); await settle();
  var eG3 = lastPutEntry(G3);
  t("an edit still wins when the stored entry's updatedAt is ahead of this clock", !!futE && puts.length === p2 + 1 && eG3 && eG3.ha.response === "done" &&
    eG3.updatedAt > FUT && /ทำแล้ว ✓/.test(cardOf("GOOG")), eG3 && [eG3.updatedAt, eG3.ha.response]);

  // ================= รอบแก้หลังรีวิว Task 5: การโหลดซ้อน PUT · กติกาความปลอดภัยของการเขียน =================
  var DK = "decision_journal_draft_v1", G1 = "ha_GOOG_1_sell_2026-10-27";
  function lastBody() { return JSON.parse(puts[puts.length - 1]).data; }
  function entryIn(d, id) { var l = (d && d.entries) || []; for (var i = 0; i < l.length; i++) if (l[i] && l[i].id === id) return l[i]; return null; }
  // ตั้งเซิร์ฟเวอร์ปลอมกลับเป็นเอกสารว่าง โดยหน้าไม่ค้างอะไร: โหลดสำเนาที่ครอบทุกอย่างที่หน้าเคยส่งก่อน (ล้าง unseen) แล้วค่อยล้าง
  //   (เซิร์ฟเวอร์จริงไม่ทิ้งรายการ — การล้างนี้มีไว้ให้เทสต์มีบรรทัดว่างให้ติ๊ก)
  async function resetServer() {
    win.__DJ_NOW = NOW;
    journalDoc = lastBody(); await H.refresh(true); await settle();
    journalDoc = E.emptyDoc(); await H.refresh(true); await settle();
  }
  function openCount() { return H._state.items.filter(function (x) { return !x.entry; }).length; }

  // Finding 1: GET ของการโหลดถูกตอบด้วยสำเนาก่อน PUT ของหน้านี้ถึง แต่ apply หลัง PUT สำเร็จ (ราคา NVDA ค้างไว้)
  //   → คำตอบที่เพิ่งส่ง (ไม่ทำ) ต้องไม่กลายเป็น "ไม่ได้ตอบ" ทั้งในหน้าและบนเซิร์ฟเวอร์ และไม่มี PUT เพิ่ม
  await resetServer();
  var open1 = openCount();
  putFail = true; click("data-ha-skip", N1); await settle(); putFail = false;
  var staleCopy = JSON.parse(JSON.stringify(journalDoc));             // สำเนาที่ยังไม่เห็น NVDA กฎ 1
  win.__DJ_NOW = "2026-11-02T12:00";
  await H.refresh(false); await settle();                               // A: ส่งร่าง + ไม่ได้ตอบ 3 ตัว ใน PUT เดียว
  var afterA = lastBody(), nA = puts.length;
  journalDoc = staleCopy; holdSym = "NVDA";
  var pB = H.refresh(true); await settle();                             // B: GET ได้สำเนาเก่า · ราคา NVDA ค้าง → apply ทีหลัง
  var heldB = typeof releaseHold === "function";
  journalDoc = afterA; if (releaseHold) releaseHold();
  await pB; await settle();
  var n1B = entryIn(H._state.doc, N1);
  t("Finding 1: a load whose journal GET predates this page's own PUT keeps the saved answer — no ไม่ได้ตอบ over it, no extra PUT",
    open1 === 4 && heldB && entryIn(afterA, N1) && entryIn(afterA, N1).ha.response === "skipped" && puts.length === nA &&
    n1B && n1B.ha.response === "skipped" && entryIn(lastBody(), N1).ha.response === "skipped",
    [open1, heldB, puts.length - nA, n1B && n1B.ha.response]);
  // …และการโหลดเริ่มระหว่างที่ PUT ของหน้านี้ค้าง ต้องอ่านเอกสารหลัง PUT นั้นกลับมาแล้ว (GET ต่อคิว putChain)
  await resetServer();
  holdPut = true; var o3 = docOps.length;
  click("data-ha-skip", N1); await settle();                            // GET → PUT (ค้าง)
  var pR = H.refresh(true); await settle();
  var opsHeld = docOps.slice(o3).join();
  if (releasePut) releasePut();
  await pR; await settle(); holdPut = false;
  t("a load started while this page's PUT is in flight reads the journal only after that PUT returns",
    opsHeld === "GET,PUT" && docOps.slice(o3).join() === "GET,PUT,GET", [opsHeld, docOps.slice(o3)]);

  // Finding 2: กติกาความปลอดภัยของการเขียน
  // (ก) เซิร์ฟเวอร์ได้รายการใหม่ + tombstone หลังหน้าโหลดไปแล้ว → PUT ของติ๊กถัดไปต้องคงของเหล่านั้น (merge กับ GET สด)
  await resetServer();
  var T0 = "2026-10-29T03:00:00.000Z", T1 = "2026-10-29T04:00:00.000Z", T2 = "2026-10-29T05:00:00.000Z";
  journalDoc = { v: 1, updatedAt: T1, trades: [], entries: [
    { id: "dj_other", createdAt: T1, updatedAt: T1, deletedAt: null, date: "2026-10-20", symbol: "AAPL", label: "จากอีกเครื่อง" },
    E.tombstone({ id: "dj_gone", createdAt: T0, updatedAt: T0, deletedAt: null, date: "2026-10-19", symbol: "MSFT", label: "x" }, T1)
  ] };
  var q4 = puts.length;
  click("data-ha-skip", N1); await settle();
  var b4 = lastBody(), other = entryIn(b4, "dj_other"), gone = entryIn(b4, "dj_gone");
  t("server additions made after load (a new entry and a tombstone) are kept in the PUT body",
    puts.length === q4 + 1 && !!other && !other.deletedAt && !!gone && gone.deletedAt === T1 && !!entryIn(b4, N1) && entryIn(b4, N1).ha.response === "skipped");
  // (ข) เซิร์ฟเวอร์มีรุ่นใหม่กว่าของ id เดียวกัน (แก้จากเครื่องอื่น) → ต้องรอดใน PUT · บรรทัดในหน้าเปลี่ยนตาม
  var newerN1 = JSON.parse(JSON.stringify(entryIn(b4, N1)));
  newerN1.ha.response = "done"; newerN1.ha.execPrice = 77; newerN1.updatedAt = "2098-01-01T00:00:00.000Z";
  journalDoc = JSON.parse(JSON.stringify(b4));
  journalDoc.entries = journalDoc.entries.map(function (e) { return e.id === N1 ? newerN1 : e; });
  click("data-ha-skip", G1); await settle();
  var n1s = lastPutEntry(N1);
  t("a newer server version of an id this page also holds survives the PUT (newest updatedAt wins)",
    !!n1s && n1s.ha.response === "done" && n1s.ha.execPrice === 77 && n1s.updatedAt === "2098-01-01T00:00:00.000Z" &&
    !!lastPutEntry(G1) && lastPutEntry(G1).ha.response === "skipped" && /ทำแล้ว ✓[^<]*77\.00/.test(cardOf("NVDA")), n1s);
  //     ตราประทับเท่ากันพอดี (สองที่เขียนในมิลลิวินาทีเดียวกัน) → ของในหน้านี้ชนะ เหมือน /decision-journal (mergeDocs(server, local))
  onGetHook = function () {
    var mine = H._state.pending && entryIn(H._state.pending, N2);
    if (!mine) return;
    var twin = JSON.parse(JSON.stringify(mine));
    twin.ha.response = "done"; twin.ha.execPrice = 55;
    journalDoc = JSON.parse(JSON.stringify(journalDoc)); journalDoc.entries.push(twin);
  };
  click("data-ha-skip", N2); await settle(); onGetHook = null;
  t("on an exact updatedAt tie the page's own copy wins (same rule as /decision-journal)", !!lastPutEntry(N2) && lastPutEntry(N2).ha.response === "skipped");
  // (ค) ติ๊กที่สองระหว่างที่ PUT แรกยังค้าง → รอคิว putChain: ไม่มี GET ใหม่จนกว่า PUT แรกกลับ แล้วจึง GET, PUT (สลับกันเสมอ)
  //     (ติ๊กสองครั้งในจังหวะเดียวกันจริง ๆ ถูกรวมเป็น PUT เดียว — ก็ถูก แต่พิสูจน์การต่อคิวไม่ได้ จึงค้าง PUT แรกไว้)
  await resetServer();
  var o6 = docOps.length, open6 = openCount();
  holdPut = true;
  click("data-ha-skip", N1); await settle();                            // GET → PUT (ค้าง)
  var c6 = click("data-ha-skip", G3); await settle();                   // ต้องรอคิว
  var ops6Held = docOps.slice(o6).join();
  if (releasePut) releasePut();
  await settle(); holdPut = false;
  t("a second tick while the first PUT is in flight waits its turn: GET, PUT, then GET, PUT · the second PUT carries both",
    open6 === 4 && c6 && ops6Held === "GET,PUT" && docOps.slice(o6).join() === "GET,PUT,GET,PUT" && !!lastPutEntry(N1) && !!lastPutEntry(G3) &&
    lastPutEntry(G3).ha.response === "skipped", [open6, c6, ops6Held, docOps.slice(o6)]);
  // (ง) แท็บอื่น (/decision-journal) เขียนร่างระหว่างที่ PUT ของหน้านี้ค้าง → PUT สำเร็จต้องไม่ลบร่างนั้น · โหลดครั้งถัดไปส่งแล้วจึงล้าง
  onPutHook = function () {
    store[DK] = JSON.stringify({ doc: { v: 1, updatedAt: T2, trades: [], entries: [
      { id: "dj_tab2", createdAt: T2, updatedAt: T2, deletedAt: null, date: "2026-10-28", symbol: "AMD", label: "อีกแท็บ" }
    ] }, savedAt: T2 });
  };
  click("data-ha-skip", N2); await settle(); onPutHook = null;
  var d7 = JSON.parse(store[DK] || "null");
  t("a draft another tab writes while this page's PUT is in flight is not cleared by that PUT's success",
    !!lastPutEntry(N2) && lastPutEntry(N2).ha.response === "skipped" && !!d7 && entryIn(d7.doc, "dj_tab2") !== null);
  var q7 = puts.length;
  journalDoc = lastBody(); await H.refresh(true); await settle();
  t("…the next load sends that draft (one PUT) and then clears it", puts.length === q7 + 1 && entryIn(lastBody(), "dj_tab2") !== null && store[DK] === undefined);
  // (จ) PUT ที่จะเกินเพดาน MAX_DOC_BYTES ไม่ถูกส่ง → คำตอบไปอยู่ในร่าง (เฉพาะของที่ยังไม่ถึง) พร้อมเหตุผล
  var bigDoc = lastBody();
  bigDoc.entries.push({ id: "dj_big", createdAt: T2, updatedAt: T2, deletedAt: null, date: "2026-10-01", symbol: "AAPL", label: "",
    context: { note: new Array(E.MAX_DOC_BYTES + 2).join("x") } });
  journalDoc = bigDoc; var q8 = puts.length;
  click("data-ha-skip", G1); await settle();
  var d8 = JSON.parse(store[DK] || "null");
  t("a PUT that would exceed MAX_DOC_BYTES is not sent: the answer goes to the draft (unsent part only) and the reason is shown",
    puts.length === q8 && !!d8 && !!entryIn(d8.doc, G1) && entryIn(d8.doc, G1).ha.response === "skipped" && entryIn(d8.doc, "dj_big") === null &&
    /ขนาดบันทึกเกินที่เซิร์ฟเวอร์รับ/.test(html()) && /ยังไม่ถึงเซิร์ฟเวอร์/.test(html()), [puts.length - q8, !!d8]);
  // (ฉ) haLaunchedAt ที่เซิร์ฟเวอร์มีอยู่แล้ว (เครื่องอื่นเขียนไว้) ชนะค่าของเครื่องนี้
  var srv = lastBody(); delete srv.haLaunchedAt; journalDoc = srv;
  await H.refresh(true); await settle();                                // ส่งร่างของข้อก่อน (1 PUT) — เครื่องนี้เขียนวันของตัวเอง
  var launchLocal = lastBody().haLaunchedAt;
  journalDoc = lastBody(); journalDoc.haLaunchedAt = "2026-10-20";
  click("data-ha-edit", G1); click("data-ha-confirm", G1); await settle();
  t("haLaunchedAt already on the server wins over this device's value", launchLocal === "2026-10-29" && lastBody().haLaunchedAt === "2026-10-20" &&
    H._state.doc.haLaunchedAt === "2026-10-20", [launchLocal, lastBody().haLaunchedAt, H._state.doc.haLaunchedAt]);
  t("CSS: inline form styles + 600px rules for the form", /\.ha-form\s*\{/.test(css) && /\.ha-in\s*\{/.test(css) && /@media \(max-width: 600px\)[\s\S]*\.ha-in/.test(css) && es5ok("home-action-page.js"));

  // ================= Task 6: สรุปผลและประวัติใต้กล่อง =================
  // fixture: entry ของกล่อง 3 ตัวย้อนหลัง · a ขาย AMD ทำแล้ว 10-10 (ฐาน 100000 THB) · b ซื้อ GOOG ไม่ทำ 10-12 (ไม่มี amount) · c ขาย AMD ไม่ได้ตอบ 10-14
  //   AMD ไม่อยู่ใน universe → หน้าต้องดึงราคา AMD เพิ่มเองเพื่อวัดผล (ครั้งเดียว)
  //   AMD: 50 ถึง 10-12 (จันทร์ · 10-10 เป็นเสาร์) แล้ว 45 ตั้งแต่ 10-13 ถึง 10-28 (12 แท่ง)
  //   → a ที่ 7 วัน (10-17 เสาร์ → แท่ง 10-16) 45 vs 50 = −10% → ขาย = +10% · ฿10,000 · c 10-21 45 vs 45 = 0% · b GOOG 10-19 200 vs 200 = 0%
  var HA = win.HomeActionEngine;
  function kpi(name) {
    var h = html(), i = h.indexOf('data-ha-kpi="' + name + '"');
    if (i < 0) return "";
    var s = h.lastIndexOf("<div", i), e = h.indexOf("</div>", i);
    return s < 0 || e < 0 ? "" : h.slice(s, e + "</div>".length);
  }
  function rowsOrder() { var out = [], re = /data-ha-hrow="([^"]+)"/g, m, h = html(); while ((m = re.exec(h)) !== null) out.push(m[1]); return out; }
  function histRow(id) {
    var h = html(), i = h.indexOf('data-ha-hrow="' + id + '"');
    if (i < 0) return "";
    var s = h.lastIndexOf("<tr", i), e = h.indexOf("</tr>", i);
    return s < 0 || e < 0 ? "" : h.slice(s, e + "</tr>".length);
  }
  function haFixture(id, sym, rule, side, kind, date, close, o) {
    var stamp = "2026-10-20T05:00:00.000Z";
    var e = HA.makeEntry({ symbol: sym, rule: rule, side: side, date: date, close: close, kind: kind, detail: {} }, {
      response: o.response, nowIso: stamp, respondedAt: o.response === "unanswered" ? null : stamp,
      execPrice: o.execPrice === undefined ? null : o.execPrice, positionValue: o.positionValue === undefined ? null : o.positionValue,
      positionCurrency: o.positionCurrency || null, amount: o.amount === undefined ? null : o.amount
    });
    e.id = id; e.date = date; e.rules.close = close;
    return JSON.parse(JSON.stringify(e));
  }
  await resetServer();                       // หน้าไม่ค้างอะไร (unseen / pending ว่าง) ก่อนเปลี่ยนเอกสารบนเซิร์ฟเวอร์ทั้งก้อน
  BARS.AMD = mkBars("2026-10-28", rep(50, 48).concat(rep(45, 12)));
  var fxA = haFixture("a", "AMD", 2, "sell", "break", "2026-10-10", 50, { response: "done", execPrice: 50, positionValue: 100000, positionCurrency: "THB" });
  var fxB = haFixture("b", "GOOG", 3, "buy", "dip", "2026-10-12", 200, { response: "skipped" });
  var fxC = haFixture("c", "AMD", 1, "sell", "cross-down", "2026-10-14", 45, { response: "unanswered" });
  journalDoc = { v: 1, updatedAt: "2026-10-20T05:00:00.000Z", entries: [fxA, fxB, fxC], trades: [] };
  var q9 = puts.length;
  await H.refresh(true); await settle();
  var f9 = fetchCalls.length;
  t("summary collapsed by default with the 4 KPI tiles and a 7/30 toggle (7 active)", /<details class="ha-summary"(?! open)/.test(html()) && countIn(html(), /data-ha-kpi="/g) === 4 && /data-ha-horizon="7"[^>]*aria-pressed="true"/.test(html()));
  t("outcomes computed for history symbols outside the universe (AMD fetched once)", fetchCalls.filter(function (u) { return /symbol=AMD/.test(u); }).length === 1 && H._state.outcomesById.a && H._state.outcomesById.a.horizons["7"].status === "scored" && H._state.outcomesById.c.horizons["7"].status === "scored");
  t("followed tile: 1 ครั้ง · +10.0% · ฿10,000 (sell, price fell 10%)", /data-ha-kpi="followed"[\s\S]*?1 ครั้ง[\s\S]*?\+10\.0%[\s\S]*?฿10,000/.test(html()), textOf(kpi("followed")));
  t("missed tile counts skipped+unanswered = 2 and shows ถ้าทำ", /data-ha-kpi="missed"[\s\S]*?2 ครั้ง[\s\S]*?ถ้าทำ/.test(html()));
  t("history rows newest first with 7/30 columns · AMD row shows ไม่ได้ตอบ · GOOG buy with no base shows ไม่มีฐานเงิน", rowsOrder().join() === "c,b,a" && /data-ha-hrow="c"[\s\S]*?ไม่ได้ตอบ/.test(html()) && /data-ha-hrow="b"[\s\S]*?ไม่มีฐานเงิน/.test(html()));
  // ---- ล็อกเพิ่ม (ก่อนสลับช่วง): ข้อความในช่อง/แถวที่ 7 วัน · ดูสรุปไม่เขียนอะไรลงเซิร์ฟเวอร์ ----
  t("7-day tiles in detail: missed 2 ครั้ง · ถ้าทำจะได้ 0.0% · ไม่มีฐานเงิน · unanswered 1 ครั้ง นับเป็นไม่ทำ · by rule 1 0.0% / 2 +10.0% / 3 0.0%",
    /ถ้าทำจะได้ 0\.0%/.test(textOf(kpi("missed"))) && /ไม่มีฐานเงิน/.test(textOf(kpi("missed"))) &&
    /1 ครั้ง[\s\S]*นับเป็นไม่ทำ/.test(textOf(kpi("unanswered"))) &&
    /กฎ 1 0\.0%[\s\S]*กฎ 2 \+10\.0%[\s\S]*กฎ 3 0\.0%/.test(textOf(kpi("byrule"))), [textOf(kpi("missed")), textOf(kpi("unanswered")), textOf(kpi("byrule"))]);
  t("row a at 7 days: price −10.0% · impact +10.0% · ได้ ฿10,000 · signal close 50.00 · ทำแล้ว · 30-day column รอ (19/30)",
    /−10\.0%|-10\.0%/.test(histRow("a")) && /\+10\.0%[\s\S]*?ได้ ฿10,000/.test(histRow("a")) && /50\.00/.test(histRow("a")) && /ทำแล้ว/.test(histRow("a")) && /รอ \(19\/30\)/.test(histRow("a")), textOf(histRow("a")));
  t("viewing the summary writes nothing (no PUT)", puts.length === q9);
  click("data-ha-horizon", "30");
  t("toggle to 30 days re-renders tiles from the 30-day horizon and marks pending rows รอ (n/30)", /data-ha-horizon="30"[^>]*aria-pressed="true"/.test(html()) && /รอ \(\d+\/30\)/.test(html()));
  t("money is rendered with the ฿ prefix so privacy.js can mask it · no money in title attributes", /฿10,000/.test(html()) && !/title="[^"]*฿/.test(html()));
  t("edit from the history row opens the same inline form", click("data-ha-edit", "a") && /data-ha-form="a"/.test(html()));
  // ---- ล็อกเพิ่ม: ช่วง 30 วัน · ที่จำค่า · ฟอร์มในตาราง · บันทึกทับ id เดิม ----
  t("30-day tiles: followed has no result yet (no ฿ in the tile) · history ผลต่อพอร์ต of a = รอ with the 7-day result as a labelled hint",
    /1 ครั้ง/.test(textOf(kpi("followed"))) && !/฿/.test(kpi("followed")) && /รอ[\s\S]*7 วัน[\s\S]*ได้ ฿10,000/.test(textOf(histRow("a"))), [textOf(kpi("followed")), textOf(histRow("a"))]);
  t("horizon choice saved in home_action_horizon_v1 · switching horizons and opening the form fetched nothing", store["home_action_horizon_v1"] === "30" && fetchCalls.length === f9);
  t("the history form is its own row right under row a (colspan 9) · one form only · not inside a card",
    /data-ha-hrow="a"[\s\S]*?<\/tr><tr class="ha-hist-form"><td colspan="9">[\s\S]*?data-ha-form="a"/.test(html()) && countIn(html(), /data-ha-form="/g) === 1 && !/data-ha-form/.test(cardOf("NVDA") + cardOf("GOOG")));
  setValue("execPrice", "47"); click("data-ha-confirm", "a"); await settle();
  var eA = lastPutEntry("a");
  t("saving from the history form overwrites entry a (same id · createdAt · date · rules.close · sell base 100000 kept) · no new id created",
    puts.length === q9 + 1 && eA && eA.ha.response === "done" && eA.ha.execPrice === 47 && eA.createdAt === fxA.createdAt && eA.updatedAt > fxA.updatedAt &&
    eA.date === "2026-10-10" && eA.rules.close === 50 && eA.ha.positionValue === 100000 && eA.ha.positionCurrency === "THB" &&
    lastPutEntry("ha_AMD_2_sell_2026-10-10") === null && !/data-ha-form="a"/.test(html()) && /data-ha-hrow="a"[\s\S]*?ที่ 47\.00/.test(html()), eA);
  // ---- เปิด/ปิดสรุปจำได้ (toggle ของ <details> ผูกผ่าน [data-ha-summary]) ----
  var sumNode = nodeOf("data-ha-summary", "1"), sumToggle = handlers["data-ha-summary|1|toggle"];
  if (sumNode) sumNode.open = true;
  if (sumToggle) sumToggle({});
  H.render();
  t("opening the summary is remembered in home_action_summary_open_v1 and survives a re-render", !!sumToggle && store["home_action_summary_open_v1"] === "1" && /<details class="ha-summary" open/.test(html()));
  // ---- Privacy Lock: ช่องเงินที่บันทึกไว้ไม่โผล่ใน HTML ตอนล็อก · ยืนยันโดยไม่พิมพ์ = คงค่าเดิม ----
  journalDoc = lastBody();
  journalDoc.entries.push(haFixture("d", "GOOG", 3, "buy", "dip", "2026-10-05", 200, { response: "done", execPrice: 190, amount: 25000 }));
  await H.refresh(false); await settle();
  var q10 = puts.length;
  win.PortfolioPrivacy = { isLocked: function () { return true; } };
  var openedD = click("data-ha-edit", "d"), fD = formOf("d");
  H.render();                                // วาดใหม่ระหว่างล็อก: ช่องว่างต้องไม่ลบค่าที่บันทึกไว้
  t("Privacy Lock: a saved buy amount renders as an empty field with the lock placeholder (25000 not in the HTML)",
    openedD && /name="amount"[^>]*placeholder="ล็อกอยู่ — ใส่ใหม่ได้ถ้าต้องการ"[^>]*value=""/.test(fD) && !/25000|25,000/.test(fD) && !/25000|25,000/.test(formOf("d")), fD);
  click("data-ha-confirm", "d"); await settle();
  var eD = lastPutEntry("d");
  t("…confirming with the locked (empty) field keeps the saved amount (25000), not null", puts.length === q10 + 1 && eD && eD.ha.response === "done" && eD.ha.amount === 25000 && eD.ha.execPrice === 190, eD && eD.ha);
  delete win.PortfolioPrivacy;
  t("unlocked: the same form shows the saved amount again", click("data-ha-edit", "d") && /name="amount"[^>]*value="25000"/.test(formOf("d")));
  click("data-ha-cancel", "d");
  // ---- ราคาของสัญลักษณ์ในประวัติดึงไม่ได้ → ไม่มี outcome · แถวบอก "ไม่มีราคา" ----
  failSym.AMD = 500;
  await H.refresh(true); await settle();
  t("history symbol price failure: no outcome for AMD entries · rows a/c say ไม่มีราคา · GOOG rows still measured",
    !H._state.outcomesById.a && !H._state.outcomesById.c && /ไม่มีราคา/.test(histRow("a")) && /ไม่มีราคา/.test(histRow("c")) && !!H._state.outcomesById.b, [textOf(histRow("a"))]);
  failSym = {};
  t("summary + history: no NaN/undefined · no advisory words · no ฿ in any title · ES5 · CSS .ha-summary/.ha-kpi/.ha-hist + 2×2 tiles and scrolling table at 600px",
    !LEAK.test(html()) && !ADVISORY_TH.test(html()) && !ADVISORY_EN.test(html()) && !/title="[^"]*฿/.test(html()) && es5ok("home-action-page.js") &&
    /\.ha-summary\s*\{/.test(css) && /\.ha-kpi\s*\{/.test(css) && /\.ha-hist\s*\{/.test(css) && /\.ha-histwrap\s*\{[^}]*overflow-x:\s*auto/.test(css) &&
    /@media \(max-width: 600px\)[\s\S]*\.ha-kpis\s*\{[^}]*repeat\(2/.test(css),
    (LEAK.exec(html()) || ADVISORY_TH.exec(html()) || ADVISORY_EN.exec(html()) || [])[0]);

  // ================= รอบแก้หลังรีวิว Task 6 =================
  // Finding 1: แก้จากแถวประวัติต้องไม่ลบสิ่งที่หน้า /decision-journal เขียนไว้ (ผูกไม้ · ป้าย · โน้ต · ทบทวน · rules เดิม)
  //   และขายเก่าที่ไม่มีฐานเงิน (พ้นหน้าต่างแล้ว) ต้องคง null — มูลค่าที่ถือวันนี้ไม่ใช่ฐานของวันสัญญาณ
  // Finding 2: เงินสกุลอื่น (privacy.js ซ่อนได้แค่ ฿/บาท/THB) → ตอนล็อกแสดง "USD XXX" ไม่มีตัวเลข
  await resetServer();
  var fxE = haFixture("e", "GOOG", 3, "buy", "dip", "2026-10-06", 200, { response: "done", execPrice: 195, amount: 30000 });
  fxE.action.tradeIds = ["t1"];
  fxE.label = "ผูกไม้จาก journal";
  fxE.context.note = "โน้ตจากหน้า journal";
  fxE.context.feelings = ["มั่นใจ"];
  fxE.review = { reviewedAt: "2026-10-25T01:00:00.000Z", selfVerdict: "good", lesson: "รอแท่งยืนยันก่อน" };
  fxE.rules.version = "dj-rules-0";
  var fxF = haFixture("f", "NVDA", 2, "sell", "break", "2026-10-08", 100, { response: "unanswered" });   // NVDA ยังถืออยู่ 100000 วันนี้
  var fxG = haFixture("g", "AMD", 2, "sell", "break", "2026-10-10", 50, { response: "done", execPrice: 50, positionValue: 12345.6, positionCurrency: "USD" });
  journalDoc = { v: 1, updatedAt: "2026-10-20T05:00:00.000Z", entries: [fxE, fxF, fxG], trades: [] };
  await H.refresh(true); await settle();
  click("data-ha-horizon", "7");
  var q11 = puts.length;
  click("data-ha-edit", "e"); setValue("execPrice", "198"); click("data-ha-confirm", "e"); await settle();
  var eE = lastPutEntry("e");
  t("Fix 1: a history edit keeps what the journal page wrote — tradeIds [t1] · label · context.note/feelings · review · rules.version/close · createdAt — and changes only the answer",
    puts.length === q11 + 1 && eE && eE.id === "e" && eE.ha.response === "done" && eE.ha.execPrice === 198 && eE.ha.amount === 30000 &&
    JSON.stringify(eE.action.tradeIds) === '["t1"]' && eE.label === "ผูกไม้จาก journal" && eE.context.note === "โน้ตจากหน้า journal" &&
    JSON.stringify(eE.context.feelings) === '["มั่นใจ"]' && eE.review.lesson === "รอแท่งยืนยันก่อน" && eE.review.selfVerdict === "good" &&
    eE.review.reviewedAt === "2026-10-25T01:00:00.000Z" && eE.rules.version === "dj-rules-0" && eE.rules.close === 200 &&
    eE.createdAt === fxE.createdAt && eE.updatedAt > fxE.updatedAt && eE.ha.respondedAt === eE.updatedAt, eE);
  click("data-ha-edit", "f"); setValue("execPrice", "92"); click("data-ha-confirm", "f"); await settle();
  var eF = lastPutEntry("f");
  t("Fix 1: an old sell (outside the 3-day window) with no money base keeps positionValue null after a history edit — today's NVDA 100000 is not used",
    puts.length === q11 + 2 && eF && eF.ha.response === "done" && eF.ha.execPrice === 92 && eF.ha.positionValue === null && eF.ha.positionCurrency === null &&
    eF.rules.close === 100 && eF.createdAt === fxF.createdAt, eF && eF.ha);
  // Finding 2: g = ขาย AMD ฐาน 12345.6 USD · 7 วัน −10% → ขาย = +10% → USD 1,234.56
  win.PortfolioPrivacy = { isLocked: function () { return true; } };
  H.render();
  t("Fix 2: locked → non-THB money shows as USD XXX on the followed tile and the history row, and its digits appear nowhere in the box",
    /USD XXX/.test(kpi("followed")) && /USD XXX/.test(histRow("g")) && !/1,234\.56|1234\.56|12,345|12345/.test(html()) && !/USD \d/.test(html()),
    [textOf(kpi("followed")), textOf(histRow("g"))]);
  click("data-ha-horizon", "30");
  t("Fix 2: …also in the 30-day “7 วัน” hint under รอ", /7 วัน ได้ USD XXX/.test(textOf(histRow("g"))) && !/USD \d/.test(html()), textOf(histRow("g")));
  click("data-ha-horizon", "7");
  delete win.PortfolioPrivacy;
  H.render();
  t("Fix 2: unlocked → USD 1,234.56 (tile and row) · THB stays ฿ text for privacy.js",
    /ได้ USD 1,234\.56/.test(kpi("followed")) && /ได้ USD 1,234\.56/.test(histRow("g")) && !/XXX/.test(html()), [textOf(kpi("followed")), textOf(histRow("g"))]);

  // ================= รอบแก้หลังรีวิวสุดท้ายทั้งฟีเจอร์ (C2 · I1 · I2 · I3) =================
  function isUnanswered(e) { return !!e && !!e.ha && e.ha.response === "unanswered"; }
  // ---- I1 · M1b: เหตุการณ์ที่เก่ากว่า วันเริ่มใช้ − 3 กับเอกสารว่าง → ไม่บันทึก ไม่ PUT (หน้าต้องส่ง launchedAt ให้ reconcile) ----
  await resetServer();
  var LK0 = store[LKEY];
  store[LKEY] = "2026-11-05"; win.__DJ_NOW = "2026-11-05T12:00"; journalDoc = E.emptyDoc();
  var qM1 = puts.length;
  await H.refresh(true); await settle();
  t("I1·M1b: launch today (11-05) with an empty doc · events of 10-27/10-28 (older than launch − 3, expired) → nothing recorded, 0 PUTs",
    H._state.docState === "ok" && H._state.launchedAt === "2026-11-05" &&
    H._state.events.filter(function (e) { return e.date < "2026-11-02"; }).length >= 4 &&
    H._state.toRecord.length === 0 && H._state.items.length === 0 && puts.length === qM1,
    [H._state.events.length, H._state.toRecord.length, puts.length - qM1]);
  store[LKEY] = LK0; win.__DJ_NOW = NOW;

  // ---- I1 · M7: GET ของการโหลดล้ม (GET หลังจากนั้นตอบปกติ) และมีเหตุการณ์หมดเวลาที่ยังไม่บันทึก → ไม่บันทึกอัตโนมัติ ไม่ PUT ----
  await resetServer();
  win.__DJ_NOW = "2026-11-02T12:00"; docFailOnce = true;
  var qM7 = puts.length;
  await H.refresh(true); await settle();
  var m7Expired = win.HomeActionEngine.reconcile(H._state.events, [], { nowBangkok: "2026-11-02T12:00", launchedAt: "2026-10-26" }).expired.length;
  t("I1·M7: the load GET fails while 4 expired events are unrecorded (later GETs work) → docState error, nothing auto-recorded, no PUT",
    H._state.docState === "error" && m7Expired === 4 && H._state.toRecord.length === 0 && puts.length === qM7 && docFailOnce === false,
    [H._state.docState, m7Expired, H._state.toRecord.length, puts.length - qM7]);
  await H.refresh(true); await settle();
  var m7Un = lastBody().entries.filter(isUnanswered);
  t("…the next load (GET ok) records the 4 as ไม่ได้ตอบ in one PUT",
    H._state.docState === "ok" && puts.length === qM7 + 1 && m7Un.length === 4, [puts.length - qM7, m7Un.length]);
  // C2 (ระดับหน้า): ตราประทับของ "ไม่ได้ตอบ" อัตโนมัติ = เที่ยงคืนของวันสัญญาณ (เก่ากว่าคำตอบจริงทุกคำตอบ) · เวลาจริงเก็บใน ha.recordedAt
  t("C2: auto ไม่ได้ตอบ entries are stamped at the signal date's midnight (createdAt = updatedAt = date T00:00:00.000Z) · real time in ha.recordedAt · validator-clean",
    m7Un.length === 4 && m7Un.every(function (e) {
      return e.createdAt === e.date + "T00:00:00.000Z" && e.updatedAt === e.date + "T00:00:00.000Z" && e.ha.respondedAt === null &&
        typeof e.ha.recordedAt === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(e.ha.recordedAt) && e.ha.recordedAt > e.updatedAt &&
        E.itemProblems(e).length === 0;
    }), m7Un.map(function (e) { return [e.id, e.createdAt, e.updatedAt, e.ha.recordedAt]; }));
  win.__DJ_NOW = NOW;

  // ---- I2: หุ้นที่ออกจาก universe ก่อนติ๊ก — สแกนต่อถึงวันที่ WINDOW_DAYS + 1 หลังเห็นในพอร์ตครั้งล่าสุด (เฉพาะเครื่องนี้) ----
  //   ผู้ใช้ขาย NVDA ตามสัญญาณขาย แล้วปลดธงแดงใน PM · เปิด /home วันถัดไป → การ์ด NVDA ต้องยังอยู่ (ป้าย เพิ่งออกจากพอร์ต) ติ๊กได้
  //   และเมื่อหมดเวลา รายการที่ไม่ได้ติ๊กต้องถูกบันทึกเป็น "ไม่ได้ตอบ" ตามปกติ · ไม่มีฐานเงิน (ไม่ได้ถือแล้ว)
  var RK = "home_action_recent_v1";
  await resetServer();
  var rec0 = null;
  try { rec0 = JSON.parse(store[RK] || "null"); } catch (x) { rec0 = null; }
  t("I2: the device-local recent universe remembers today's portfolio stocks (not BTC/ETH)",
    !!rec0 && rec0.NVDA === "2026-10-29" && rec0.GOOG === "2026-10-29" && rec0.INTC === "2026-10-29" && !rec0.BTCUSD && !rec0.ETHUSD, rec0);
  var shownDay1 = /<span class="ha-src">ในพอร์ต<\/span>/.test(cardOf("NVDA")) && /data-ha-done="ha_NVDA_2_sell_2026-10-28"/.test(cardOf("NVDA"));
  // NVDA ยังอยู่ในรายการแต่ไม่ใช่ธงแดงแล้ว (มูลค่าเดิมค้างอยู่) — ฐานเงินต้องไม่ถูกหยิบมาใช้
  var SNAP_SOLD = { portfolioHoldings: { data: SNAP.portfolioHoldings.data.map(function (h) {
    return h.canonicalSymbol === "NVDA" ? { canonicalSymbol: "NVDA", isHolding: false, marketValue: 100000, portfolioBucket: "foreign-stock" } : h;
  }) } };
  snapshotObj = SNAP_SOLD; win.__DJ_NOW = "2026-10-30T12:00";
  await H.refresh(false); await settle();
  t("I2: next day without NVDA in the portfolio → still scanned as recent · card labelled เพิ่งออกจากพอร์ต (not ในพอร์ต) · lines tickable · GOOG still ในพอร์ต",
    shownDay1 && H._buildUniverse().map(function (u) { return u.sym + ":" + u.source; }).join() === "BTCUSD:always,ETHUSD:always,GOOG:portfolio,INTC:portfolio,NVDA:recent" &&
    /<span class="ha-src">เพิ่งออกจากพอร์ต<\/span>/.test(cardOf("NVDA")) && !/>ในพอร์ต</.test(cardOf("NVDA")) &&
    /data-ha-done="ha_NVDA_2_sell_2026-10-28"(?![^>]*disabled)/.test(cardOf("NVDA")) && /<span class="ha-src">ในพอร์ต<\/span>/.test(cardOf("GOOG")),
    [shownDay1, H._buildUniverse().map(function (u) { return u.sym + ":" + u.source; }).join(), textOf(cardOf("NVDA"))]);
  var qI2 = puts.length;
  var tickedI2 = click("data-ha-done", N2) && click("data-ha-confirm", N2);
  await settle();
  var eI2 = lastPutEntry(N2);
  t("I2: ticking ทำแล้ว on the recent stock saves it · not held any more → no money base (positionValue / positionCurrency null)",
    tickedI2 && puts.length === qI2 + 1 && !!eI2 && eI2.ha.response === "done" && eI2.ha.execPrice === 90 && eI2.ha.positionValue === null && eI2.ha.positionCurrency === null,
    eI2 && eI2.ha);
  //   วันสุดท้ายที่เห็นในพอร์ต = 10-29 → สแกนต่อถึง 10-29 + WINDOW_DAYS + 1 = 11-02 · 11-03 เลิก
  //   (ครอบวันแรกที่หมดเวลาของสัญญาณที่ขึ้นการ์ดได้เร็วสุดวัน D — ตลาดที่ปิดวันเดียวกัน)
  journalDoc = lastBody(); win.__DJ_NOW = "2026-11-02T12:00";
  var qI2b = puts.length;
  await H.refresh(true); await settle();
  var unI2 = lastPutEntry(N1);
  t("I2: WINDOW_DAYS + 1 days after it was last in the portfolio NVDA is still scanned: its expired unticked line is recorded as ไม่ได้ตอบ (no money base) · the quiet line says เพิ่งออกจากพอร์ต",
    /(^|,)NVDA(,|$)/.test(syms()) && puts.length === qI2b + 1 && !!unI2 && unI2.ha.response === "unanswered" && unI2.ha.positionValue === null &&
    /ไม่มีสัญญาณใหม่ใน 3 วัน:[^<]*NVDA \(เพิ่งออกจากพอร์ต\)/.test(html()), [syms(), puts.length - qI2b, unI2 && unI2.ha, textOf(html()).slice(0, 400)]);
  journalDoc = lastBody(); win.__DJ_NOW = "2026-11-03T12:00";
  await H.refresh(true); await settle();
  var recEnd = null;
  try { recEnd = JSON.parse(store[RK] || "null"); } catch (x) { recEnd = null; }
  t("I2: WINDOW_DAYS + 2 days after it was last in the portfolio NVDA is no longer scanned (no row, not in the universe) and drops out of the recent list",
    !/(^|,)NVDA(,|$)/.test(syms()) && H._buildUniverse().every(function (u) { return u.sym !== "NVDA"; }) && !!recEnd && !Object.prototype.hasOwnProperty.call(recEnd, "NVDA") &&
    !/data-ha-sym="NVDA"/.test(html()), [syms(), recEnd]);
  snapshotObj = SNAP; win.__DJ_NOW = NOW;
  // …ย้ายไป sleeve อื่นใน PM (ยังธงแดง มูลค่ายังอยู่ในรายการ) ก็ออกจาก universe เหมือนกัน → สแกนต่อแบบ recent และไม่มีฐานเงิน
  //   (positionOf ของหุ้นที่สแกนเพราะเพิ่งออกจากพอร์ต = ไม่ถือ เสมอ — ไม่หยิบมูลค่าที่ค้างในรายการมาเป็นฐาน)
  await resetServer();                       // พอร์ตเดิม (NVDA ธงแดง) → เครื่องนี้เห็น NVDA วันที่ 10-29
  snapshotObj = { portfolioHoldings: { data: SNAP.portfolioHoldings.data.map(function (h) {
    return h.canonicalSymbol === "NVDA" ? { canonicalSymbol: "NVDA", isHolding: true, marketValue: 100000, portfolioBucket: "thai-stock" } : h;
  }) } };
  win.__DJ_NOW = "2026-10-30T12:00";
  await H.refresh(false); await settle();
  var qI2c = puts.length;
  var skippedI2 = click("data-ha-skip", N2);
  await settle();
  var eI2c = lastPutEntry(N2);
  t("I2: a stock still flagged but moved to another sleeve is scanned as recent too, and its sell answer gets no money base (not the 100000 still listed)",
    /NVDA:recent/.test(H._buildUniverse().map(function (u) { return u.sym + ":" + u.source; }).join()) && skippedI2 && puts.length === qI2c + 1 &&
    !!eI2c && eI2c.ha.response === "skipped" && eI2c.ha.positionValue === null && eI2c.ha.positionCurrency === null, eI2c && eI2c.ha);
  snapshotObj = SNAP; win.__DJ_NOW = NOW;

  // ---- I3: เงินรวมในช่องสรุปมาจากเฉพาะแถวที่มีฐานเงิน → บอกจำนวนเมื่อน้อยกว่าแถวที่วัดผลแล้ว ----
  //   followed: ขาย AMD มีฐาน 100000 (+10% → ฿10,000) · ซื้อ GOOG ไม่ใส่เงิน (0%) → เฉลี่ย +5.0% · ฿10,000 จาก 1 ใน 2 แถว
  //   missed: ไม่ทำขาย AMD มีฐาน 50000 (0% → ฿0) → ทุกแถวมีฐาน ไม่ต้องบอกจำนวน
  await resetServer();
  journalDoc = { v: 1, updatedAt: "2026-10-20T05:00:00.000Z", trades: [], entries: [
    haFixture("i3a", "AMD", 2, "sell", "break", "2026-10-10", 50, { response: "done", execPrice: 50, positionValue: 100000, positionCurrency: "THB" }),
    haFixture("i3b", "GOOG", 3, "buy", "dip", "2026-10-12", 200, { response: "done", execPrice: 200 }),
    haFixture("i3c", "AMD", 2, "sell", "break", "2026-10-14", 45, { response: "skipped", positionValue: 50000, positionCurrency: "THB" })
  ] };
  await H.refresh(true); await settle();
  t("I3: the followed tile says its ฿ total covers only the rows with a money base: ได้ ฿10,000 (จาก 1 รายการที่มีฐานเงิน) next to +5.0% เฉลี่ย of 2",
    /2 ครั้ง/.test(textOf(kpi("followed"))) && /\+5\.0% เฉลี่ย/.test(textOf(kpi("followed"))) &&
    /ได้ ฿10,000 \(จาก 1 รายการที่มีฐานเงิน\)/.test(textOf(kpi("followed"))), textOf(kpi("followed")));
  t("I3: …and says nothing extra when every scored row has a base (missed: ฿0 from its 1 row)",
    /1 ครั้ง/.test(textOf(kpi("missed"))) && /฿0/.test(textOf(kpi("missed"))) && !/รายการที่มีฐานเงิน/.test(kpi("missed")) && !/title="[^"]*฿/.test(html()),
    textOf(kpi("missed")));
  t("final-fix HTML: no NaN/undefined · no advisory words · no ฿ in any title · ES5 page + engine",
    !LEAK.test(html()) && !ADVISORY_TH.test(html()) && !ADVISORY_EN.test(html()) && !/title="[^"]*฿/.test(html()) && es5ok("home-action-page.js") && es5ok("home-action-engine.js"),
    (LEAK.exec(html()) || ADVISORY_TH.exec(html()) || ADVISORY_EN.exec(html()) || [])[0]);

  // ---- C2: "ไม่ได้ตอบ" อัตโนมัติต้องไม่ทับคำตอบจริงที่บันทึกจากอีกเครื่อง ----
  // แต่ละเครื่อง = หน้าใหม่ใน VM ของตัวเอง (localStorage / เซิร์ฟเวอร์ปลอม / เวลา แยกกัน) โหลดสคริปต์ชุดเดียวกับ home.html
  //   ราคา NVDA ชุดเดิม → เหตุการณ์ขาย กฎ 1 วันที่ 2026-10-27 (D) · D+3 = 10-30 · เปิดวันที่ 10-31 (D+4) = หมดเวลาแล้ว
  var HAN = require("../public/home-action-engine.js");
  var EVX = { symbol: "NVDA", rule: 1, side: "sell", date: "2026-10-27", close: 90, kind: "cross-down", detail: {} };
  var IDX = HAN.entryIdOf(EVX);
  function makeWorld(o) {
    var wStore = o.store || {}, server = { doc: o.serverDoc }, wPuts = [], st = { getN: 0 };
    function wEl(tag) {
      var el = { tagName: String(tag || "div").toUpperCase(), id: "", children: [], parentNode: null, attributes: {}, _html: "",
        setAttribute: function (k, v) { this.attributes[k] = v; },
        getAttribute: function (k) { return this.attributes[k] === undefined ? null : this.attributes[k]; },
        addEventListener: function () {},
        appendChild: function (c) { this.children.push(c); c.parentNode = this; return c; },
        insertBefore: function (c) { this.children.unshift(c); c.parentNode = this; return c; },
        querySelectorAll: function () { return []; }, querySelector: function () { return null; } };
      Object.defineProperty(el, "innerHTML", { get: function () { return this._html; }, set: function (v) { this._html = String(v); } });
      Object.defineProperty(el, "firstChild", { get: function () { return this.children[0] || null; } });
      return el;
    }
    var root = wEl("main"); root.id = "mcRoot";
    var wDoc = { readyState: "complete", addEventListener: function () {}, createElement: wEl,
      getElementById: function (id) {
        if (id === "mcRoot") return root;
        for (var i = 0; i < root.children.length; i++) if (root.children[i].id === id) return root.children[i];
        return null;
      } };
    var w = {
      document: wDoc,
      localStorage: {
        getItem: function (k) { return wStore[k] === undefined ? null : wStore[k]; },
        setItem: function (k, v) { wStore[k] = String(v); },
        removeItem: function (k) { delete wStore[k]; }
      },
      addEventListener: function () {},
      PortfolioDataSnapshot: { read: function () { return { portfolioHoldings: { data: [{ canonicalSymbol: "NVDA", isHolding: true, marketValue: 100000, portfolioBucket: "foreign-stock" }] } }; } },
      fetch: function (url, opts) {
        var u = String(url), method = (opts && opts.method) || "GET";
        if (/^\/api\/portfolio\?doc=journal$/.test(u)) {
          if (method === "PUT") { var body = JSON.parse(String(opts.body)); wPuts.push(body); server.doc = body.data; return respond(200, { ok: true }); }
          st.getN++;
          if (o.onGet) o.onGet(st.getN, server);
          return respond(200, { data: server.doc == null ? null : JSON.parse(JSON.stringify(server.doc)) });
        }
        var sym = decodeURIComponent((/[?&]symbol=([^&]+)/.exec(u) || [])[1] || "");
        return respond(200, { bars: BARS[sym] || [], sourceType: "LIVE_MARKET_DATA" });
      },
      console: console, Math: Math, JSON: JSON, Date: Date, Number: Number, String: String, Object: Object, Array: Array,
      Boolean: Boolean, encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent, isFinite: isFinite,
      isNaN: isNaN, parseInt: parseInt, parseFloat: parseFloat, Promise: Promise, RegExp: RegExp, Error: Error, TypeError: TypeError,
      setTimeout: setTimeout, clearTimeout: clearTimeout, Intl: typeof Intl !== "undefined" ? Intl : undefined
    };
    w.window = w; w.self = w; w.__DJ_NOW = o.now;
    var wCtx = vm.createContext(w);
    WANT.forEach(function (f) { vm.runInContext(read(f), wCtx, { filename: f }); });
    return { win: w, store: wStore, server: server, puts: wPuts, st: st };
  }
  // ฉากที่ 1 (ส่งร่างทีหลัง): มือถือตอบ "ทำแล้ว" ดึกวัน D+3 แต่ PUT ล้ม (คำตอบค้างในร่าง) → PC เปิดวัน D+4 บันทึก "ไม่ได้ตอบ"
  //   → มือถือเปิด /home ทีหลัง ส่งร่าง → เซิร์ฟเวอร์ต้องเก็บ "ทำแล้ว" และร่างถูกล้างเพราะถึงแล้วจริง
  var srv1 = E.emptyDoc(); srv1.haLaunchedAt = "2026-10-20";
  var pcW = makeWorld({ now: "2026-10-31T08:00", serverDoc: srv1, store: { home_action_launched_v1: "2026-10-20" } });
  await settle(); await settle();
  var pcE = entryIn(pcW.server.doc, IDX);
  t("C2 scenario 1 setup: the PC (opened on D+4) auto-records ไม่ได้ตอบ stamped 2026-10-27T00:00:00.000Z in one PUT",
    pcW.puts.length === 1 && !!pcE && pcE.ha.response === "unanswered" && pcE.updatedAt === "2026-10-27T00:00:00.000Z" && typeof pcE.ha.recordedAt === "string",
    [pcW.puts.length, pcE && [pcE.updatedAt, pcE.ha.response, pcE.ha.recordedAt]]);
  var phoneDone = HAN.makeEntry(EVX, { response: "done", nowIso: "2026-10-30T15:00:00.000Z", respondedAt: "2026-10-30T15:00:00.000Z",
    execPrice: 89, positionValue: 100000, positionCurrency: "THB", amount: null, D: E });          // D+3 22:00 กรุงเทพ
  var phoneDraft = E.emptyDoc(); phoneDraft.entries = [phoneDone];
  var phoneW = makeWorld({ now: "2026-10-31T09:00", serverDoc: JSON.parse(JSON.stringify(pcW.server.doc)),
    store: { home_action_launched_v1: "2026-10-20", decision_journal_draft_v1: JSON.stringify({ doc: phoneDraft, savedAt: "2026-10-30T15:00:01.000Z" }) } });
  await settle(); await settle();
  var phE = entryIn(phoneW.server.doc, IDX);
  t("C2 scenario 1 (draft flush): the phone's late ทำแล้ว from its draft beats the PC's auto ไม่ได้ตอบ · one PUT · draft cleared",
    phoneW.puts.length === 1 && !!phE && phE.ha.response === "done" && phE.ha.execPrice === 89 && phE.updatedAt === "2026-10-30T15:00:00.000Z" &&
    phoneW.store.decision_journal_draft_v1 === undefined, [phoneW.puts.length, phE && phE.ha, phoneW.store.decision_journal_draft_v1 !== undefined]);
  // ฉากที่ 2 (แข่งกัน): GET ตอนโหลดของหน้านี้ยังไม่มีคำตอบ · อีกเครื่อง (แท็บที่เปิดค้างไว้) บันทึก "ทำแล้ว" ก่อน GET-ก่อน-PUT ของหน้านี้
  //   → PUT ของหน้านี้ต้องไม่ทับเป็น "ไม่ได้ตอบ"
  var otherDone = HAN.makeEntry(EVX, { response: "done", nowIso: "2026-10-31T01:59:00.000Z", respondedAt: "2026-10-31T01:59:00.000Z",
    execPrice: 89, positionValue: 100000, positionCurrency: "THB", amount: null, D: E });          // D+4 08:59 กรุงเทพ
  var srv2 = E.emptyDoc(); srv2.haLaunchedAt = "2026-10-20";
  var raceW = makeWorld({ now: "2026-10-31T09:00", serverDoc: srv2, store: { home_action_launched_v1: "2026-10-20" },
    onGet: function (n, server) {
      if (n !== 2) return;
      var d = JSON.parse(JSON.stringify(server.doc)); d.entries = [JSON.parse(JSON.stringify(otherDone))]; server.doc = d;
    } });
  await settle(); await settle();
  var raceE = entryIn(raceW.server.doc, IDX);
  t("C2 scenario 2 (race): another device saves ทำแล้ว between this page's load GET and its GET-before-PUT → the server keeps ทำแล้ว",
    raceW.st.getN >= 2 && raceW.puts.length === 1 && !!raceE && raceE.ha.response === "done" && raceE.updatedAt === "2026-10-31T01:59:00.000Z",
    [raceW.st.getN, raceW.puts.length, raceE && raceE.ha]);
  finish();
})().catch(function (e) { console.error("  ✗ harness threw: " + (e && e.stack || e)); fail++; finish(); });
