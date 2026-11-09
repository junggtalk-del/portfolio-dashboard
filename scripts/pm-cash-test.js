"use strict";
// ============================================================
// หน้า AI Portfolio Manager — ช่องเงินสดรอซื้อหุ้นต่างประเทศ (foreignSleeve.cash) — เทสต์หน้าจริงใน VM sandbox
//   node scripts/pm-cash-test.js
//
// harness แบบ allocation-card-test: fetch ปลอม (GET/PUT /api/portfolio + สวิตช์ failGet / failPut / serverEmpty
//   / slowFirstGet) · localStorage ปลอม · window/document event ทำงานจริง · DOM ปลอมของ #pmRoot
//   (click / setValue / key) · PortfolioDataSnapshot stub (read/write — write เก็บลง localStorage + ยิง
//   "portfolio-data-snapshot" แบบตัวจริง) · PortfolioPrivacy stub
// โหลดสคริปต์ตามลำดับที่ portfolio-manager.html โหลดจริง (อ่านจาก HTML) ยกเว้น SKIP ด้านล่าง
// ล็อก: ไม่มี foreignSleeve = สูตรเดิม (Editor) · บันทึก = GET สด → PUT สำเนาทุกคีย์ + foreignSleeve
//   (แถว foreign-stock ใน body = ของ server ไม่ใช่แถวสังเคราะห์) · หลังบันทึก ฐาน % = Σ หุ้น + cash
//   · ร่าง/ลองใหม่ · Privacy · GET สดตอนเปิดหน้าแทน snapshot ที่ค้าง
// ============================================================
var fs = require("fs");
var path = require("path");
var vm = require("vm");
// นาฬิกาคงที่ให้ foreign-sleeve.js (spec Addendum ข้อ 5 · quarter-ended): fixture ปักไตรมาสปัจจุบัน 2026-Q4
//   → หลังโหลดโมดูลใน VM แทน window.ForeignSleeve ด้วยตัวที่ล็อกนาฬิกา (ค่าเริ่ม 9 พ.ย. 2026 · boot({ now }) เปลี่ยนได้)
var CLOCK = require("./sleeve-clock");

var PUB = path.join(__dirname, "..", "public");
var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; console.log("  ✓ " + name); return; }
  fail++;
  console.error("  ✗ " + name + (extra !== undefined ? "  → " + JSON.stringify(extra) : ""));
}
function finish() {
  console.log("");
  console.log(pass + fail + " checks · " + pass + " passed · " + fail + " failed");
  process.exit(fail ? 1 : 0);
}
function read(name) { return fs.readFileSync(path.join(PUB, name), "utf8"); }
function es5ok(file) {
  var src;
  try { src = read(file); } catch (e) { return false; }
  src = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  return !/=>|\bconst\s|\blet\s|`/.test(src);
}
var LEAK = /(NaN|undefined|Infinity|\[object )/;
var ADVISORY_TH = /ควรซื้อ|ควรขาย|น่าซื้อ|น่าขาย|น่าเข้า|แนะนำซื้อ|จุดเข้า|ตัดขาดทุน/;
var ADVISORY_EN = /\b(Buy|Sell)\b/;
function flush(ms) { return new Promise(function (r) { setTimeout(r, ms == null ? 60 : ms); }); }
function clone(x) { return JSON.parse(JSON.stringify(x)); }

// ข้อความตามแผน (คำต่อคำ)
var EDITOR_HINT = "ยังไม่ได้กรอกเงินสด — ตอนนี้ใช้ยอดหุ้นต่างประเทศจาก Quarterly Editor";
var PM_SOURCE = "หุ้นที่ถือ + เงินสดที่กรอกในหน้านี้";
var INVALID_TH = "เงินสดต้องเป็นตัวเลข ≥ 0";
var EMPTY_SERVER_TH = "ข้อมูลพอร์ตบน server ว่าง — ยกเลิกการบันทึกเพื่อกันข้อมูลหาย";
var LOCKED_PH = "ล็อกอยู่ — ใส่ค่าใหม่ได้";
var LABEL_TH = "เงินสดรอซื้อหุ้นต่างประเทศ";
var NOHOLD_TH = "กรอกเงินสดแล้ว แต่รายการหุ้นยังไม่โหลด — ตอนนี้ใช้ยอดหุ้นต่างประเทศจาก Quarterly Editor";
// editor-follows-pm Task 1 fix round 1: ForeignSleeve.sleeveOf reason "past-quarter" (Editor เปิดไตรมาสเก่า) มีข้อความของตัวเอง
var PAST_TH = "Quarterly Editor กำลังเปิดไตรมาสเก่า — ใช้ยอดจาก Editor จนกว่าจะกลับไปไตรมาสล่าสุด";
// editor-follows-pm Task 2 fix round 1 (Addendum ข้อ 5): reason "quarter-ended" — ไตรมาสใน Editor จบแล้วตามปฏิทิน
var ENDED_TH = "ไตรมาสใน Quarterly Editor จบแล้ว — สร้างไตรมาสใหม่ใน Editor เพื่อให้หุ้นต่างประเทศตาม AI Portfolio Manager";
var SUPERSEDED_TH = "มีค่าที่ใหม่กว่าจากเครื่องอื่น — ใช้ค่านั้นแทนร่างที่ค้าง";
var DRAFT_KEY = "pm_foreign_cash_draft_v1";
var SNAP_KEY = "portfolio_dashboard_data_snapshot";

// ---------- fixture ----------
function A(type, name, value, inv) {
  return { type: type, name: name, manualValue: value, snapshotValue: value, investedPercent: inv };
}
// เอกสารบน server: Editor มีหุ้นต่างประเทศ 5,000,000 (ไตรมาสปัจจุบัน 2026-Q4) · ไม่มี foreignSleeve
var FIX = {
  currentQuarter: "2026-Q4",
  quarters: {
    "2026-Q3": { key: "2026-Q3", assets: [A("foreign-stock", "US", 4600000, 80), A("bitcoin", "Bitcoin", 2800000, 100)] },
    "2026-Q4": { key: "2026-Q4", assets: [A("foreign-stock", "US", 5000000, 70), A("bitcoin", "Bitcoin", 3000000, 100), A("cash", "เงินสด", 1000000, 0)] }
  },
  allocation: { version: 1, note: "alloc-untouched", retirement: { annualContribution: 1000000, targetReturnPct: 10 } },
  allocationPlan: { cashBand: { min: 1000000, max: 3000000 }, updatedAt: "2026-11-01T00:00:00.000Z" },
  someOtherKey: { keep: [1, 2, 3] }
};
// holdings ใน snapshot: หุ้นต่างประเทศ QQQM + NVDA + META = 2,726,000 · PTT.BK / BTCUSD อยู่ sleeve อื่น · AMZN ไม่ได้ถือ
function H(sym, mv, hold) { return { canonicalSymbol: sym, assetName: sym, isHolding: hold !== false, marketValue: mv }; }
var HOLDINGS = [H("QQQM", 2000000), H("NVDA", 435000), H("META", 291000), H("PTT.BK", 100000), H("BTCUSD", 3000000), H("AMZN", 0, false)];
var INVESTED = 2726000;
// snapshot จาก Load Latest Data เมื่อวาน: สำเนาเอกสารพอร์ตชุดเก่า (ไม่มี foreignSleeve) + ฟิลด์อื่นที่ต้องคงไว้
function SNAP(doc) {
  return {
    dataVersion: "2026-06-portfolio-dashboard-v1", snapshotId: "snap-test",
    loadedAt: "2026-11-08T01:00:00.000Z", status: "ready",
    marketRisk: { marker: "keep-me" }, historicalData: {}, technicalIndicators: {},
    portfolioHoldings: { data: clone(HOLDINGS), mode: "server" },
    portfolioStatus: { data: clone(doc || FIX), mode: "supabase" }
  };
}

// ---------- สคริปต์ชุดเดียวกับ portfolio-manager.html (อ่านลำดับจาก HTML) ----------
var HTML = read("portfolio-manager.html");
var css = read("portfolio-manager.css");
// ไม่โหลดใน sandbox:
//   data-snapshot.js → แทนด้วย stub PortfolioDataSnapshot (read/write) — ตัวจริงห่อ fetch และต้องมี snapshot ทั้งชุด
//   privacy.js       → แทนด้วย stub PortfolioPrivacy (isLocked) — ตัวจริงวาดปุ่ม/overlay + MutationObserver
var SKIP = ["data-snapshot.js", "privacy.js"];
var ALL_SCRIPTS = (function () {
  var out = [], re = /<script src="\/([A-Za-z0-9._-]+\.js)\?v=[^"]*"/g, m;
  while ((m = re.exec(HTML)) !== null) out.push(m[1]);
  return out;
})();
var SCRIPTS = ALL_SCRIPTS.filter(function (f) { return SKIP.indexOf(f) < 0; });

// ---------- sandbox ----------
function mkEl(id) {
  return {
    id: id, innerHTML: "", textContent: "", value: "", style: {}, attrs: {}, hidden: false, children: [],
    appendChild: function (c) { this.children.push(c); return c; }, removeChild: function () {}, insertBefore: function (c) { return c; },
    prepend: function () {}, append: function () {}, remove: function () {},
    setAttribute: function (k, v) { this.attrs[k] = v; },
    getAttribute: function (k) { return this.attrs[k] || null; }, removeAttribute: function (k) { delete this.attrs[k]; },
    hasAttribute: function (k) { return k in this.attrs; },
    addEventListener: function () {}, removeEventListener: function () {},
    querySelector: function () { return null; }, querySelectorAll: function () { return []; },
    closest: function () { return null; }, contains: function () { return false; }, focus: function () {}, blur: function () {},
    scrollIntoView: function () {}, getBoundingClientRect: function () { return { top: 0, left: 0, width: 0, height: 0 }; },
    classList: { add: function () {}, remove: function () {}, toggle: function () {}, contains: function () { return false; } },
    dataset: {}
  };
}
function CustomEvent(type, init) { this.type = type; this.detail = init && init.detail; }

// DOM ปลอมของ #pmRoot — แบบ fakeNodes ของ allocation-card-test
//   root.querySelectorAll("[attr]") คืน element ปลอมหนึ่งตัวต่อค่า attribute ที่พบใน innerHTML
//   addEventListener จดใน handlers["attr|value|event"] · เขียน innerHTML ใหม่ = DOM เดิมหาย → ล้าง handler/node
//   .value เริ่มจาก value="…" · disabled จากแท็ก (คลิกปุ่ม disabled = ไม่เกิดอะไร)
function openTag(h, attr, val) {
  var i = h.indexOf(attr + '="' + val + '"');
  if (i < 0) return "";
  var s = h.lastIndexOf("<", i), e = h.indexOf(">", i);
  return h.slice(s, e < 0 ? h.length : e + 1);
}
function mkDom() {
  var reg = { handlers: {}, nodes: {} };
  var renders = 0;   // จำนวนครั้งที่ #pmRoot ถูกเขียน innerHTML ใหม่ (= วาดใหม่)
  function fakeNode(tag, attr, val) {
    var el = {
      tagName: String(tag || "div").toUpperCase(), attributes: {}, value: "", disabled: false, innerHTML: "", hidden: false, style: {},
      getAttribute: function (k) { return this.attributes[k] === undefined ? null : this.attributes[k]; },
      setAttribute: function (k, v) { this.attributes[k] = String(v); },
      addEventListener: function (ev, fn) { reg.handlers[attr + "|" + val + "|" + ev] = fn; },
      removeEventListener: function () {}, focus: function () {}, blur: function () {}, scrollIntoView: function () {}
    };
    el.attributes[attr] = val;
    return el;
  }
  function fakeNodes(h, sel) {
    var m = /^\[([a-z-]+)\]$/.exec(sel);
    if (!m) return [];
    var attr = m[1];
    var re = new RegExp("\\s" + attr + '="([^"]*)"', "g"), mm, out = [], seen = {};
    while ((mm = re.exec(h)) !== null) {
      if (seen[mm[1]]) continue;
      seen[mm[1]] = 1;
      var tag = openTag(h, attr, mm[1]);
      var el = fakeNode((/^<([a-zA-Z]+)/.exec(tag) || [])[1], attr, mm[1]);
      el.disabled = /\sdisabled(?=[\s>=\/])/.test(tag);
      var vAttr = /\svalue="([^"]*)"/.exec(tag);
      if (vAttr) el.value = vAttr[1];
      reg.nodes[attr + "|" + mm[1]] = el;
      out.push(el);
    }
    return out;
  }
  function mkRoot(id) {
    var el = mkEl(id), h = "";
    Object.defineProperty(el, "innerHTML", {
      get: function () { return h; },
      set: function (v) { h = String(v); reg.handlers = {}; reg.nodes = {}; renders++; }
    });
    el.querySelectorAll = function (sel) { return fakeNodes(h, sel); };
    el.querySelector = function (sel) { var l = fakeNodes(h, sel); return l.length ? l[0] : null; };
    // node ของการวาดรอบปัจจุบันเท่านั้นที่อยู่ใน root (รอบก่อนถูกทิ้งไปกับ innerHTML)
    el.contains = function (n) { for (var k in reg.nodes) if (reg.nodes[k] === n) return true; return false; };
    return el;
  }
  function fire(attr, val, ev, payload) {
    var fn = reg.handlers[attr + "|" + val + "|" + ev], el = reg.nodes[attr + "|" + val];
    if (!fn || (el && el.disabled)) return false;
    var e = payload || {};
    e.preventDefault = function () {}; e.stopPropagation = function () {}; e.target = el; e.currentTarget = el;
    fn(e);
    return true;
  }
  function click(attr, val) { return fire(attr, val, "click"); }
  // พิมพ์ในช่อง: ตั้ง .value บน node ที่หน้าเก็บไว้ แล้วยิง "input"
  function setValue(attr, val, v) {
    var el = reg.nodes[attr + "|" + val];
    if (!el) return false;
    el.value = String(v);
    fire(attr, val, "input");
    return true;
  }
  // ช่อง type=number ที่เบราว์เซอร์อ่านไม่ออก: value "" + validity.badInput แล้วยิง "input"
  function badInput(attr, val) {
    var el = reg.nodes[attr + "|" + val];
    if (!el) return false;
    el.value = "";
    el.validity = { badInput: true };
    fire(attr, val, "input");
    return true;
  }
  function key(attr, val, k) { return fire(attr, val, "keydown", { key: k }); }
  // final fix wave [2a]: ช่องมูลค่าหุ้นรายตัว (data-pm-mv) บันทึกด้วย "change"
  function change(attr, val) { return fire(attr, val, "change"); }
  function node(attr, val) { return reg.nodes[attr + "|" + val] || null; }
  return { mkRoot: mkRoot, click: click, setValue: setValue, badInput: badInput, key: key, change: change, node: node,
    renderCount: function () { return renders; } };
}

function boot(opts) {
  var o = opts || {};
  var els = {}, puts = [], dispatched = [], listeners = {}, docListeners = {}, fetches = [], loadErrors = [], heldPuts = [], holdingsPuts = [];
  var store = o.store || {};
  var dom = mkDom();
  var gets = 0;
  var server = clone(o.fixture || FIX);
  function flagv(name) { try { return o.flags ? o.flags()[name] : undefined; } catch (e) { return undefined; } }
  function flag(name) { return !!flagv(name); }
  var slowOnce = o.slowFirstGet || 0;
  var doc = {
    readyState: "complete", createElement: mkEl,
    addEventListener: function (type, fn) { (docListeners[type] = docListeners[type] || []).push(fn); },
    removeEventListener: function () {},
    getElementById: function (id) { if (!els[id]) els[id] = id === "pmRoot" ? dom.mkRoot(id) : mkEl(id); return els[id]; },
    querySelector: function () { return null; }, querySelectorAll: function () { return []; },
    createTreeWalker: function () { return { nextNode: function () { return null; } }; },
    body: mkEl("body"), documentElement: mkEl("html"), head: mkEl("head"), hidden: false, title: "",
    activeElement: null
  };
  function respond(ok, status, body) {
    return Promise.resolve({ ok: ok, status: status, json: function () { return Promise.resolve(body); }, text: function () { return Promise.resolve(JSON.stringify(body)); } });
  }
  var win = {
    document: doc, location: { search: "", pathname: "/portfolio-manager", href: "http://localhost/portfolio-manager", origin: "http://localhost", reload: function () {} },
    history: { pushState: function () {}, replaceState: function () {} },
    navigator: { userAgent: "node" },
    localStorage: {
      getItem: function (k) { return k in store ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; }
    },
    // api-auth.js อ่านรหัสจาก sessionStorage — มีรหัส = ไม่ขึ้นหน้า login
    sessionStorage: { getItem: function (k) { return k === "portfolioPassword" ? "pw" : null; }, setItem: function () {}, removeItem: function () {} },
    addEventListener: function (type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    removeEventListener: function (type, fn) {
      var l = listeners[type] || [], i = l.indexOf(fn);
      if (i >= 0) l.splice(i, 1);
    },
    dispatchEvent: function (e) {
      dispatched.push(e);
      (listeners[e && e.type] || []).slice().forEach(function (fn) { fn(e); });
      return true;
    },
    CustomEvent: CustomEvent,
    fetch: function (url, init) {
      var u = String(url);
      fetches.push({ url: u, method: (init && init.method) || "GET", cache: init && init.cache });
      // final fix wave [2a]: PortfolioCore.saveHoldings → PUT /api/portfolio-holdings (GET ยังเป็น 404 ตามเดิม)
      if (u === "/api/portfolio-holdings" && init && init.method === "PUT") {
        holdingsPuts.push(JSON.parse(init.body));
        if (flag("failHoldingsPut")) return respond(false, 500, { error: "boom" });
        return respond(true, 200, { ok: true });
      }
      if (/^\/api\/portfolio(\?|$)/.test(u)) {
        if (init && init.method === "PUT") {
          var body = JSON.parse(init.body);
          puts.push(body);
          var finishPut = function () {
            if (flag("failPut")) return respond(false, 500, { error: "boom" });
            Object.keys(server).forEach(function (k) { delete server[k]; });
            Object.keys(body.data || {}).forEach(function (k) { server[k] = clone(body.data[k]); });
            return respond(true, 200, { ok: true });
          };
          // holdPut: PUT ค้างจนเทสต์ปล่อย (inst.releasePuts) — ตรวจสถานะระหว่างที่ PUT ยังไม่ตอบ
          if (flag("holdPut")) return new Promise(function (r) { heldPuts.push(function () { r(finishPut()); }); });
          return finishPut();
        }
        gets++;
        var tg = flagv("throwGet");
        if (tg === "reject") return Promise.reject(new TypeError("Failed to fetch"));
        if (tg) throw new TypeError("Failed to fetch");
        if (flag("failGet")) return respond(false, 503, { error: "unavailable" });
        if (flag("serverEmpty")) return respond(true, 200, { data: { quarters: {} } });
        // คำตอบถูกสำเนาตอนเรียก (เหมือน response ที่ออกจาก server ไปแล้ว) · slowFirstGet = GET แรกมาช้า
        var payload = { data: clone(server), mode: "supabase" };
        if (slowOnce) {
          var ms = slowOnce; slowOnce = 0;
          return new Promise(function (r) { setTimeout(function () { r(respond(true, 200, payload)); }, ms); });
        }
        return respond(true, 200, payload);
      }
      return respond(false, 404, {});
    },
    console: console, Math: Math, JSON: JSON, Date: Date, Number: Number, String: String,
    Object: Object, Array: Array, Boolean: Boolean, isFinite: isFinite, isNaN: isNaN,
    parseInt: parseInt, parseFloat: parseFloat, Promise: Promise, RegExp: RegExp, Error: Error, TypeError: TypeError,
    Map: Map, Set: Set, WeakMap: WeakMap, Symbol: Symbol,
    encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent,
    setTimeout: setTimeout, clearTimeout: clearTimeout, setInterval: function () { return 0; }, clearInterval: function () {},
    requestAnimationFrame: function (fn) { return setTimeout(fn, 0); },
    Intl: Intl, URL: URL, Headers: Headers, Request: Request, Response: Response,
    alert: function () {}, confirm: function () { return false; },
    matchMedia: function () { return { matches: false, addEventListener: function () {}, addListener: function () {} }; },
    innerWidth: 1280
  };
  win.window = win; win.self = win; win.globalThis = win;
  // stub ของ data-snapshot.js: read คืนตัวที่ถืออยู่ · write เก็บลง localStorage แล้วยิง "portfolio-data-snapshot" แบบตัวจริง
  var snapState = o.snapshot === undefined ? SNAP() : o.snapshot;
  var snapWrites = 0;
  win.PortfolioDataSnapshot = {
    STORAGE_KEY: SNAP_KEY,
    read: function () { return snapState; },
    write: function (s) {
      snapWrites++;
      snapState = s;
      store[SNAP_KEY] = JSON.stringify(s);
      win.dispatchEvent(new CustomEvent("portfolio-data-snapshot", { detail: s }));
      return s;
    }
  };
  if (o.privacy) win.PortfolioPrivacy = o.privacy;
  var ctx = vm.createContext(win);
  SCRIPTS.forEach(function (f) {
    try { vm.runInContext(read(f), ctx, { filename: f }); }
    catch (e) { loadErrors.push(f + ": " + e.message); }
    // หน้าอ่าน window.ForeignSleeve ตอนเรียก → แทนก่อน engine/page โหลด ได้ผลเดิมทุกวันที่รัน
    if (f === "foreign-sleeve.js" && win.ForeignSleeve) win.ForeignSleeve = CLOCK.withClock(win.ForeignSleeve, o.now || CLOCK.Q4_2026);
  });
  var getsAtMark = 0, putsAtMark = 0, fetchesAtMark = 0;
  var inst = {
    win: win, els: els, puts: puts, store: store, dispatched: dispatched, fetches: fetches, loadErrors: loadErrors,
    serverFixture: server, holdingsPuts: holdingsPuts, change: dom.change,
    snap: function () { return snapState; },
    snapWrites: function () { return snapWrites; },
    renders: dom.renderCount,
    html: function () { return els.pmRoot ? els.pmRoot.innerHTML : ""; },
    fireDoc: function (type) { (docListeners[type] || []).slice().forEach(function (fn) { fn(new CustomEvent(type, {})); }); },
    click: dom.click, setValue: dom.setValue, badInput: dom.badInput, key: dom.key, node: dom.node,
    // โฟกัสช่องของการวาดรอบปัจจุบัน (document.activeElement) · blur = ไม่มีโฟกัส + ยิง focusout บน document
    focusNode: function (attr, val) { doc.activeElement = dom.node(attr, val); return !!doc.activeElement; },
    blurAll: function () { doc.activeElement = null; (docListeners.focusout || []).slice().forEach(function (fn) { fn(new CustomEvent("focusout", {})); }); },
    // final fix wave [4] — focusout ที่มี relatedTarget = node ของการวาดรอบปัจจุบัน
    //   moveFocus: แบบ Chrome ตอน mousedown บนปุ่ม — ระหว่าง focusout ไม่มีตัวไหนโฟกัส แล้ว node ได้โฟกัส (ยังไม่ click)
    //   focusOutTo: ยิง focusout (relatedTarget = node) อย่างเดียว · activeElement คงว่าง — ตรวจตัวกัน relatedTarget แยกจากตัวกันปุ่ม
    moveFocus: function (attr, val) {
      var to = dom.node(attr, val);
      if (!to) return false;
      doc.activeElement = null;
      (docListeners.focusout || []).slice().forEach(function (fn) { var e = new CustomEvent("focusout", {}); e.relatedTarget = to; fn(e); });
      doc.activeElement = to;
      return true;
    },
    focusOutTo: function (attr, val) {
      var to = dom.node(attr, val);
      if (!to) return false;
      doc.activeElement = null;
      (docListeners.focusout || []).slice().forEach(function (fn) { var e = new CustomEvent("focusout", {}); e.relatedTarget = to; fn(e); });
      return true;
    },
    // จุดอ้างอิงก่อนกดบันทึก → นับ GET / PUT ที่เกิดหลังจากนั้น
    mark: function () { getsAtMark = gets; putsAtMark = puts.length; fetchesAtMark = fetches.length; },
    getsSince: function () { return gets - getsAtMark; },
    putsSince: function () { return puts.length - putsAtMark; },
    // ลำดับ method ของคำขอ /api/portfolio ตั้งแต่ mark (เช่น "GET,PUT")
    portfolioCallsSince: function () { return fetches.slice(fetchesAtMark).filter(function (f) { return f.url === "/api/portfolio"; }).map(function (f) { return f.method; }).join(","); },
    releasePuts: function () { var l = heldPuts.splice(0); l.forEach(function (fn) { fn(); }); return l.length; }
  };
  Object.defineProperty(inst, "gets", { get: function () { return gets; } });
  return inst;
}

// ---------- อ่านชิ้นจาก html ----------
function overview(h) { var i = h.indexOf('class="pm-hero-grid"'); return i < 0 ? "" : h.slice(i, h.indexOf("Portfolio Thesis Score", i)); }
function cashCard(h) { var i = h.indexOf('data-pm-cash-card="1"'); return i < 0 ? "" : h.slice(h.lastIndexOf("<", i), h.indexOf("Portfolio Thesis Score", i)); }
function cashRow(h) { var m = /<tr class="pm-row-cash">[\s\S]*?<\/tr>/.exec(h); return m ? m[0] : ""; }
function cashInputTag(h) { var m = /<input[^>]*data-pm-cash="1"[^>]*>/.exec(h); return m ? m[0] : ""; }
function inputValue(h) { var m = /\svalue="([^"]*)"/.exec(cashInputTag(h)); return m ? m[1] : null; }
function inputPlaceholder(h) { var m = /\splaceholder="([^"]*)"/.exec(cashInputTag(h)); return m ? m[1] : null; }
function hasFromPM(body) { return JSON.stringify(body).indexOf("fromPM") >= 0; }
function foreignRows(doc, key) { return ((doc.quarters[key] || {}).assets || []).filter(function (a) { return a.type === "foreign-stock"; }); }

(async function main() {
  t("portfolio-manager.html: page pm-30 (editor-follows-pm Task 2 fix round 1 · quarter-ended hint) · css pm-13 · foreign-sleeve.js before the PM engine/page",
    /portfolio-manager-page\.js\?v=20261109-pm-30"/.test(HTML) && /portfolio-manager\.css\?v=20261109-pm-13"/.test(HTML) &&
    HTML.indexOf("foreign-sleeve.js") > 0 && HTML.indexOf("foreign-sleeve.js") < HTML.indexOf("portfolio-manager-engine.js"));
  t("index.html loads app.js?v=20261109-app-13", /\/app\.js\?v=20261109-app-13"/.test(read("index.html")));

  // ---------- MAIN: เอกสารไม่มี foreignSleeve → สูตรเดิม (Editor) ----------
  var serverEmpty = false, failPut = false, failGet = false, throwGet = false, holdPut = false;
  var MAIN = boot({ flags: function () { return { serverEmpty: serverEmpty, failPut: failPut, failGet: failGet, throwGet: throwGet, holdPut: holdPut }; } });
  await flush(80);
  t("all scripts except the stubbed ones load in the sandbox (" + SCRIPTS.length + " files)", MAIN.loadErrors.length === 0, MAIN.loadErrors);
  var bootCalls = MAIN.fetches.map(function (f) { return f.method + " " + f.url + " " + f.cache; });
  t("on load the page requested exactly one GET /api/portfolio with cache no-store (fresh doc) and no PUT",
    bootCalls.filter(function (c) { return c === "GET /api/portfolio no-store"; }).length === 1 &&
    !MAIN.fetches.some(function (f) { return f.method !== "GET"; }) && MAIN.puts.length === 0, bootCalls);
  var h0 = MAIN.html();
  t("rendered the PM page (Current Portfolio + overview)", h0.indexOf("💼 Current Portfolio") >= 0 && overview(h0).length > 0, h0.slice(0, 200));
  t("no foreignSleeve → Portfolio Value = Editor gross ฿5,000,000 · cash = gross − Σ stocks = ฿2,274,000 · 54.5% · 45.5%",
    /฿5,000,000/.test(overview(h0)) && /เงินสดใน sleeve ฿2,274,000/.test(overview(h0)) && /54\.5% · 45\.5%/.test(overview(h0)), overview(h0).slice(0, 900));
  t("editor mode shows the exact hint + the labelled cash input (data-pm-cash) with no value",
    cashCard(h0).indexOf(EDITOR_HINT) >= 0 && cashCard(h0).indexOf(LABEL_TH) >= 0 && cashInputTag(h0) !== "" && inputValue(h0) === "" && cashCard(h0).indexOf(PM_SOURCE) < 0,
    cashCard(h0).slice(0, 900));
  t("editor mode cash row = Portfolio Value − หุ้นที่ลงทุน · ฿2,274,000", /Portfolio Value − หุ้นที่ลงทุน/.test(cashRow(h0)) && /฿2,274,000/.test(cashRow(h0)), cashRow(h0));

  // ---------- ค่าไม่ผ่าน → ข้อความ ไม่ GET ไม่ PUT ----------
  MAIN.mark(); MAIN.setValue("data-pm-cash", "1", "-5"); MAIN.click("data-pm-cash-save", "1"); await flush(30);
  t("negative → " + INVALID_TH + " · no GET · no PUT", MAIN.html().indexOf(INVALID_TH) >= 0 && MAIN.getsSince() === 0 && MAIN.putsSince() === 0);
  MAIN.mark(); MAIN.setValue("data-pm-cash", "1", "abc"); MAIN.click("data-pm-cash-save", "1"); await flush(30);
  t("non-numeric → " + INVALID_TH + " · no GET · no PUT", MAIN.html().indexOf(INVALID_TH) >= 0 && MAIN.getsSince() === 0 && MAIN.putsSince() === 0);
  MAIN.mark(); MAIN.badInput("data-pm-cash", "1"); MAIN.click("data-pm-cash-save", "1"); await flush(30);
  t("browser badInput (value '' + validity.badInput) → invalid, not 'blank = keep' · no GET · no PUT", MAIN.html().indexOf(INVALID_TH) >= 0 && MAIN.getsSince() === 0 && MAIN.putsSince() === 0);
  MAIN.mark(); MAIN.setValue("data-pm-cash", "1", ""); MAIN.click("data-pm-cash-save", "1"); await flush(30);
  t("blank while unlocked → invalid · no GET · no PUT", MAIN.html().indexOf(INVALID_TH) >= 0 && MAIN.getsSince() === 0 && MAIN.putsSince() === 0);

  // ---------- บันทึก 600000: GET 1 → PUT 1 ----------
  // server เปลี่ยน quarters ระหว่างเปิดหน้า (อีกแท็บบันทึก Editor) → PUT ต้องมีของใหม่
  MAIN.serverFixture.quarters["2026-Q4"].assets[0].manualValue = 5500000;
  MAIN.serverFixture.quarters["2026-Q4"].assets[0].snapshotValue = 5500000;
  var serverBefore = clone(MAIN.serverFixture);
  MAIN.mark(); MAIN.setValue("data-pm-cash", "1", "600000"); MAIN.click("data-pm-cash-save", "1"); await flush(80);
  var P1 = MAIN.puts[MAIN.puts.length - 1];
  t("save: exactly one GET then one PUT, in that order", MAIN.getsSince() === 1 && MAIN.putsSince() === 1 && MAIN.portfolioCallsSince() === "GET,PUT", MAIN.portfolioCallsSince());
  // final fix wave [2a]: โหมด pm (เงินสดใหม่ + หุ้นที่ถือ + 2026-Q4 = ไตรมาสล่าสุดที่ยังไม่จบ) → PUT เดียวกันเขียนแถวหุ้นต่างประเทศ
  //   ของ 2026-Q4 เป็นค่า PM (2,726,000 + 600,000) · ส่วนอื่นของเอกสาร (ไตรมาสอื่น / แถวอื่น / คีย์อื่น) คงของ server ทุก byte
  t("PUT body keeps the server's other quarters / other rows of 2026-Q4 / allocation / allocationPlan / other keys byte-identical",
    !!P1 && JSON.stringify(P1.data.quarters["2026-Q3"]) === JSON.stringify(serverBefore.quarters["2026-Q3"]) &&
    JSON.stringify(P1.data.quarters["2026-Q4"].assets.slice(1)) === JSON.stringify(serverBefore.quarters["2026-Q4"].assets.slice(1)) &&
    Object.keys(P1.data.quarters).sort().join() === "2026-Q3,2026-Q4" && P1.data.quarters["2026-Q4"].key === "2026-Q4" &&
    JSON.stringify(P1.data.allocation) === JSON.stringify(serverBefore.allocation) && JSON.stringify(P1.data.allocationPlan) === JSON.stringify(serverBefore.allocationPlan) &&
    JSON.stringify(P1.data.someOtherKey) === JSON.stringify(serverBefore.someOtherKey) && P1.data.currentQuarter === "2026-Q4" &&
    Object.keys(P1.data).sort().join() === Object.keys(serverBefore).concat(["foreignSleeve"]).sort().join(), P1 && Object.keys(P1.data));
  t("PUT foreignSleeve = { cash: 600000 (number), updatedAt: ISO }",
    !!P1 && P1.data.foreignSleeve && P1.data.foreignSleeve.cash === 600000 && typeof P1.data.foreignSleeve.cash === "number" && /^\d{4}-\d{2}-\d{2}T/.test(P1.data.foreignSleeve.updatedAt) && Object.keys(P1.data.foreignSleeve).sort().join() === "cash,updatedAt",
    P1 && P1.data.foreignSleeve);
  var p1Row = P1 && foreignRows(P1.data, "2026-Q4")[0];
  t("PUT foreign-stock row of 2026-Q4 = PM values (name US kept · ฿3,326,000 · 81.96%) replacing the Editor's 5,500,000 · no fromPM anywhere · gets an id (the server row had none)",
    !!p1Row && foreignRows(P1.data, "2026-Q4").length === 1 && p1Row.name === "US" && p1Row.manualValue === 3326000 && p1Row.snapshotValue === 3326000 &&
    Math.abs(p1Row.investedPercent - INVESTED / 3326000 * 100) < 1e-9 && typeof p1Row.id === "string" && p1Row.id.length > 0 && !hasFromPM(P1), p1Row);
  var h1 = MAIN.html();
  t("after save: เงินสดพร้อมวาง ฿600,000 · Portfolio Value = Σ stocks + cash = ฿3,326,000 · 82.0% · 18.0%",
    /เงินสดพร้อมวาง ฿600,000/.test(overview(h1)) && /฿3,326,000/.test(overview(h1)) && /82\.0% · 18\.0%/.test(overview(h1)) && overview(h1).indexOf("฿5,500,000") < 0, overview(h1).slice(0, 900));
  t("after save: source text '" + PM_SOURCE + "' · editor hint gone · input shows 600000",
    overview(h1).indexOf(PM_SOURCE) >= 0 && h1.indexOf(EDITOR_HINT) < 0 && inputValue(h1) === "600000", [inputValue(h1)]);
  t("after save: cash row ฿600,000 · 18.0% · new explanation (not Portfolio Value − หุ้นที่ลงทุน)",
    /฿600,000/.test(cashRow(h1)) && /18\.0%/.test(cashRow(h1)) && !/Portfolio Value − หุ้นที่ลงทุน/.test(cashRow(h1)) && /เงินสดรอซื้อหุ้นต่างประเทศ/.test(cashRow(h1)), cashRow(h1));
  t("after save: status says saved · no retry button · no draft in localStorage",
    /บันทึกเงินสดแล้ว/.test(cashCard(h1)) && h1.indexOf("data-pm-cash-retry") < 0 && MAIN.store[DRAFT_KEY] === undefined);
  t("dispatched portfolio-allocation-saved with { data: next } (foreignSleeve.cash 600000, the PUT body's quarters incl. the PM row 3,326,000)",
    MAIN.dispatched.some(function (e) { return e.type === "portfolio-allocation-saved" && e.detail && e.detail.data && e.detail.data.foreignSleeve.cash === 600000 && e.detail.data.quarters["2026-Q4"].assets[0].manualValue === 3326000 && JSON.stringify(e.detail.data) === JSON.stringify(P1.data) && !hasFromPM(e.detail.data); }));
  var snapLS = JSON.parse(MAIN.store[SNAP_KEY] || "null");
  t("snapshot patched via PortfolioDataSnapshot.write: portfolioStatus.data.foreignSleeve.cash 600000 · wrapper mode kept · every other snapshot field kept",
    !!snapLS && snapLS.portfolioStatus.data.foreignSleeve.cash === 600000 && snapLS.portfolioStatus.mode === "supabase" && !hasFromPM(snapLS.portfolioStatus) &&
    snapLS.marketRisk && snapLS.marketRisk.marker === "keep-me" && snapLS.loadedAt === "2026-11-08T01:00:00.000Z" && snapLS.snapshotId === "snap-test" &&
    snapLS.portfolioHoldings.data.length === HOLDINGS.length && snapLS.portfolioStatus.data.quarters["2026-Q4"].assets[0].manualValue === 3326000,
    snapLS && Object.keys(snapLS));
  // holdings เปลี่ยน (snapshot เขียนใหม่ด้วย loadedAt เดิม) → หน้ายังอยู่โหมด pm ไม่ถอยไปใช้ของเก่า
  var s2 = clone(MAIN.snap()); s2.portfolioHoldings.data.push(H("TSM", 274000));
  MAIN.win.PortfolioDataSnapshot.write(s2); MAIN.win.dispatchEvent(new CustomEvent("portfolio-holdings-updated", {})); await flush(20);
  t("holdings change (+TSM 274,000) re-renders: base = 3,000,000 + 600,000 = ฿3,600,000 · still pm", /฿3,600,000/.test(overview(MAIN.html())) && overview(MAIN.html()).indexOf(PM_SOURCE) >= 0, overview(MAIN.html()).slice(0, 600));

  // ---------- cash 0 = กรอกแล้ว (โหมด pm) · Enter บันทึก ----------
  MAIN.mark(); MAIN.setValue("data-pm-cash", "1", "0"); MAIN.key("data-pm-cash", "1", "Enter"); await flush(80);
  var P0 = MAIN.puts[MAIN.puts.length - 1];
  t("cash 0 via Enter → GET then PUT · foreignSleeve.cash === 0", MAIN.portfolioCallsSince() === "GET,PUT" && P0.data.foreignSleeve.cash === 0 && !hasFromPM(P0), MAIN.portfolioCallsSince());
  var hz = MAIN.html();
  t("cash 0 stays pm: เงินสดพร้อมวาง ฿0 · base ฿3,000,000 · source text · input 0", /เงินสดพร้อมวาง ฿0\b/.test(overview(hz)) && /฿3,000,000/.test(overview(hz)) && overview(hz).indexOf(PM_SOURCE) >= 0 && inputValue(hz) === "0" && hz.indexOf(EDITOR_HINT) < 0, overview(hz).slice(0, 600));

  // ---------- server ว่าง → ไม่ PUT ----------
  serverEmpty = true;
  MAIN.mark(); MAIN.setValue("data-pm-cash", "1", "700000"); MAIN.click("data-pm-cash-save", "1"); await flush(80);
  serverEmpty = false;
  t("empty server doc → GET only, refuses to PUT · says " + EMPTY_SERVER_TH, MAIN.portfolioCallsSince() === "GET" && MAIN.html().indexOf(EMPTY_SERVER_TH) >= 0 && /บันทึกไม่สำเร็จ/.test(MAIN.html()), MAIN.portfolioCallsSince());

  // ---------- PUT ล้ม → ร่าง + ลองใหม่ ----------
  failPut = true;
  MAIN.mark(); MAIN.setValue("data-pm-cash", "1", "800000"); MAIN.click("data-pm-cash-save", "1"); await flush(80);
  failPut = false;
  var dr = JSON.parse(MAIN.store[DRAFT_KEY] || "null");
  var hf = MAIN.html();
  t("PUT failure → draft { cash: 800000, savedAt } · บันทึกไม่สำเร็จ · retry button data-pm-cash-retry",
    !!dr && dr.cash === 800000 && /^\d{4}-\d{2}-\d{2}T/.test(dr.savedAt) && /บันทึกไม่สำเร็จ/.test(hf) && /data-pm-cash-retry="1"/.test(hf), dr);
  t("while the draft is pending the page shows it: input 800000 · cash row ฿800,000 · notice ใช้ค่าที่ยังไม่ได้บันทึก",
    inputValue(hf) === "800000" && /฿800,000/.test(cashRow(hf)) && /ใช้ค่าที่ยังไม่ได้บันทึก/.test(hf), [inputValue(hf), cashRow(hf)]);
  // ปุ่มลองใหม่ (ผู้ใช้กด) ไม่ผ่านเงื่อนไข "server ใหม่กว่าร่าง" ของร่างตอนเปิดหน้า — server ใหม่กว่าก็ยัง PUT ตามเดิม
  MAIN.serverFixture.foreignSleeve = { cash: 111, updatedAt: new Date(Date.now() + 3600000).toISOString() };
  MAIN.mark(); MAIN.click("data-pm-cash-retry", "1"); await flush(80);
  t("retry (user click, even with a newer server foreignSleeve) → GET then PUT the draft (800000) · draft cleared · retry gone",
    MAIN.portfolioCallsSince() === "GET,PUT" && MAIN.puts[MAIN.puts.length - 1].data.foreignSleeve.cash === 800000 && MAIN.store[DRAFT_KEY] === undefined && MAIN.html().indexOf("data-pm-cash-retry") < 0, MAIN.portfolioCallsSince());

  // ---------- GET ล้ม / โยน → ร่าง ไม่ PUT ----------
  failGet = true;
  MAIN.mark(); MAIN.setValue("data-pm-cash", "1", "810000"); MAIN.click("data-pm-cash-save", "1"); await flush(80);
  failGet = false;
  t("GET ok:false → draft 810000 · บันทึกไม่สำเร็จ (HTTP 503) · retry · GET only, no PUT",
    JSON.parse(MAIN.store[DRAFT_KEY] || "null").cash === 810000 && /บันทึกไม่สำเร็จ[^<]*HTTP 503/.test(MAIN.html()) && /data-pm-cash-retry/.test(MAIN.html()) && MAIN.portfolioCallsSince() === "GET", MAIN.portfolioCallsSince());
  throwGet = "reject";
  MAIN.mark(); MAIN.setValue("data-pm-cash", "1", "820000"); MAIN.click("data-pm-cash-save", "1"); await flush(80);
  throwGet = true;
  MAIN.setValue("data-pm-cash", "1", "830000"); MAIN.click("data-pm-cash-save", "1"); await flush(80);
  throwGet = false;
  t("GET rejects / throws synchronously → draft (830000) · บันทึกไม่สำเร็จ · no PUT",
    JSON.parse(MAIN.store[DRAFT_KEY] || "null").cash === 830000 && /บันทึกไม่สำเร็จ/.test(MAIN.html()) && MAIN.putsSince() === 0);
  // PUT ค้าง (ยังไม่ตอบ) → ร่างต้องยังอยู่ · ปุ่มบันทึกปิด (ไม่ยิงซ้ำ) · ปล่อยแล้วสำเร็จ → ร่างหาย
  holdPut = true;
  MAIN.mark(); MAIN.click("data-pm-cash-retry", "1"); await flush(60);
  var inflightDraft = JSON.parse(MAIN.store[DRAFT_KEY] || "null");
  var inflightSaveBlocked = MAIN.click("data-pm-cash-save", "1") === false;
  t("while the PUT is in flight: GET then exactly 1 PUT sent · draft (830000) still in localStorage · status saving · save button disabled",
    MAIN.portfolioCallsSince() === "GET,PUT" && !!inflightDraft && inflightDraft.cash === 830000 && /กำลังบันทึกเงินสด/.test(MAIN.html()) && inflightSaveBlocked, [MAIN.portfolioCallsSince(), inflightDraft, inflightSaveBlocked]);
  holdPut = false; MAIN.releasePuts(); await flush(60);
  t("retry after GET failures → PUT 830000 · draft cleared only after the PUT succeeded", MAIN.putsSince() === 1 && MAIN.puts[MAIN.puts.length - 1].data.foreignSleeve.cash === 830000 && MAIN.store[DRAFT_KEY] === undefined);

  // ---------- เปิดหน้าใหม่ขณะมีร่าง → แสดงร่าง + ส่งเองครั้งเดียว ----------
  var D = boot();   // ไม่มีร่าง — ต้องไม่ PUT เอง
  var DS = {};      // localStorage ของ instance ใหม่มีร่างตั้งแต่ก่อนโหลดสคริปต์
  DS[DRAFT_KEY] = JSON.stringify({ cash: 450000, savedAt: "2026-11-09T01:00:00.000Z" });
  var D2 = boot({ store: DS });
  var hBoot = D2.html();
  t("boot with a draft: shows the draft before any response (input 450000 · cash row ฿450,000 · ใช้ค่าที่ยังไม่ได้บันทึก)",
    inputValue(hBoot) === "450000" && /฿450,000/.test(cashRow(hBoot)) && /ใช้ค่าที่ยังไม่ได้บันทึก/.test(hBoot), [inputValue(hBoot), cashRow(hBoot)]);
  await flush(120);
  t("boot with a draft: persists it exactly once (PUT cash 450000) · draft cleared · stays pm with ฿450,000",
    D2.puts.length === 1 && D2.puts[0].data.foreignSleeve.cash === 450000 && !hasFromPM(D2.puts[0]) && D2.store[DRAFT_KEY] === undefined &&
    /เงินสดพร้อมวาง ฿450,000/.test(overview(D2.html())), [D2.puts.length]);
  t("instance without a draft never PUTs on its own", D.puts.length === 0);

  // ---------- race: GET ตอนเปิดหน้ามาช้ากว่าการบันทึกร่าง → ห้ามทับเอกสารที่เพิ่งบันทึก ----------
  var RS = {}; RS[DRAFT_KEY] = JSON.stringify({ cash: 750000, savedAt: "2026-11-09T01:00:00.000Z" });
  var R = boot({ store: RS, slowFirstGet: 120 });
  await flush(250);
  t("slow load-time GET (stale doc without foreignSleeve) resolving after the draft PUT does not overwrite it: still pm · ฿750,000",
    R.puts.length === 1 && /เงินสดพร้อมวาง ฿750,000/.test(overview(R.html())) && overview(R.html()).indexOf(PM_SOURCE) >= 0 && inputValue(R.html()) === "750000",
    overview(R.html()).slice(0, 500));

  // ---------- GET สดตอนเปิดหน้าแทน snapshot ที่ค้าง ----------
  var SV = clone(FIX); SV.foreignSleeve = { cash: 400000, updatedAt: "2026-11-09T02:00:00.000Z" };
  var F = boot({ fixture: SV, snapshot: SNAP(FIX) });
  await flush(80);
  t("server has foreignSleeve 400,000 but the snapshot copy is stale → page uses the fresh GET: pm · ฿400,000 · base ฿3,126,000",
    /เงินสดพร้อมวาง ฿400,000/.test(overview(F.html())) && /฿3,126,000/.test(overview(F.html())) && overview(F.html()).indexOf(PM_SOURCE) >= 0 && inputValue(F.html()) === "400000", overview(F.html()).slice(0, 600));
  // holdings เปลี่ยน → snapshot ถูกเขียนใหม่ (loadedAt เดิม · portfolioStatus ยังเป็นสำเนาเก่า) → ห้ามถอยไปใช้สำเนาเก่า
  var sF = clone(F.snap()); sF.portfolioHoldings.data.push(H("TSM", 274000));
  F.win.PortfolioDataSnapshot.write(sF); await flush(20);
  t("holdings write with the old loadedAt keeps the fresh GET copy (not the stale snapshot doc): pm · ฿400,000 · base ฿3,400,000",
    /เงินสดพร้อมวาง ฿400,000/.test(overview(F.html())) && /฿3,400,000/.test(overview(F.html())) && overview(F.html()).indexOf(PM_SOURCE) >= 0, overview(F.html()).slice(0, 600));
  // Load Latest Data (loadedAt ใหม่กว่า GET ของหน้า) → ใช้สำเนาใน snapshot ที่สดกว่า
  var LD = clone(FIX); LD.foreignSleeve = { cash: 123000, updatedAt: "2026-11-09T03:00:00.000Z" };
  var snapL = SNAP(LD); snapL.loadedAt = new Date(Date.now() + 60000).toISOString();
  F.win.PortfolioDataSnapshot.write(snapL); await flush(20);
  t("Load Latest Data (newer loadedAt) → page drops its GET copy and uses the snapshot's doc: ฿123,000",
    /เงินสดพร้อมวาง ฿123,000/.test(overview(F.html())) && inputValue(F.html()) === "123000", overview(F.html()).slice(0, 400));
  // cash ถูกกรอกแล้ว แต่ holdings ว่าง → โหมด editor (ห้ามโชว์หุ้นต่างประเทศ = cash ล้วน)
  var EH = SNAP(SV); EH.portfolioHoldings = { data: [] };
  var N = boot({ fixture: SV, snapshot: EH }); await flush(80);
  t("cash entered but holdings empty → editor numbers (Editor gross ฿5,000,000) · says '" + NOHOLD_TH + "' (not the not-entered hint, not pm source) · input still shows 400000",
    /฿5,000,000/.test(overview(N.html())) && overview(N.html()).indexOf(PM_SOURCE) < 0 && cashCard(N.html()).indexOf(NOHOLD_TH) >= 0 && cashCard(N.html()).indexOf(EDITOR_HINT) < 0 && inputValue(N.html()) === "400000", cashCard(N.html()).slice(0, 900));
  // cash กรอกแล้ว + มี holdings แต่ Quarterly Editor เปิดไตรมาสเก่า (currentQuarter 2026-Q3 ขณะที่มี 2026-Q4) → editor / past-quarter
  //   ตัวเลข = Editor ของ 2026-Q3 (US 4,600,000) · ข้อความของตัวเอง ไม่ใช่ "ยังไม่ได้กรอกเงินสด" (กรอกแล้ว) และไม่ใช่ข้อความ holdings
  var SVPQ = clone(SV); SVPQ.currentQuarter = "2026-Q3";
  var PQ = boot({ fixture: SVPQ, snapshot: SNAP(SVPQ) }); await flush(80);
  t("cash entered + holdings but the Editor has an older quarter open (past-quarter) → editor numbers (2026-Q3 ฿4,600,000) · says '" + PAST_TH + "' (not the not-entered hint, not the holdings hint, not pm source) · input still shows 400000",
    /฿4,600,000/.test(overview(PQ.html())) && overview(PQ.html()).indexOf(PM_SOURCE) < 0 && cashCard(PQ.html()).indexOf(PAST_TH) >= 0 &&
    cashCard(PQ.html()).indexOf(EDITOR_HINT) < 0 && cashCard(PQ.html()).indexOf(NOHOLD_TH) < 0 && inputValue(PQ.html()) === "400000", cashCard(PQ.html()).slice(0, 900));
  // Addendum ข้อ 5: ไตรมาสล่าสุดของเอกสาร = 2026-Q3 (ยังไม่สร้าง 2026-Q4) แต่วันนี้ 9 พ.ย. 2026 → ไตรมาสจบแล้วตามปฏิทิน
  //   → editor / quarter-ended · ตัวเลข = Editor ของ 2026-Q3 (US 4,600,000) · บอกให้สร้างไตรมาสใหม่ใน Editor (ไม่ใช่ข้อความเหตุผลอื่น)
  var SVQE = clone(SV); delete SVQE.quarters["2026-Q4"]; SVQE.currentQuarter = "2026-Q3";
  var QE = boot({ fixture: SVQE, snapshot: SNAP(SVQE), now: CLOCK.Q4_2026 }); await flush(80);
  t("cash entered + holdings but the Editor's latest quarter (2026-Q3) has ended by the calendar (Nov 2026) → editor numbers (฿4,600,000) · says '" + ENDED_TH + "' (no other reason text, not pm source) · input still shows 400000",
    /฿4,600,000/.test(overview(QE.html())) && overview(QE.html()).indexOf(PM_SOURCE) < 0 && cashCard(QE.html()).indexOf(ENDED_TH) >= 0 &&
    cashCard(QE.html()).indexOf(PAST_TH) < 0 && cashCard(QE.html()).indexOf(EDITOR_HINT) < 0 && cashCard(QE.html()).indexOf(NOHOLD_TH) < 0 && inputValue(QE.html()) === "400000",
    cashCard(QE.html()).slice(0, 900));
  // ตัวเทียบ: เอกสารเดียวกันในวันที่ไตรมาสยังไม่จบ (15 ก.ย. 2026) → pm (ไม่ใช่ quarter-ended) — ข้อความขึ้นตามวันจริง ไม่ได้ติดกับเอกสาร
  var QS = boot({ fixture: SVQE, snapshot: SNAP(SVQE), now: CLOCK.Q3_2026 }); await flush(80);
  t("same document while 2026-Q3 is still running (15 Sep 2026) → pm source, no quarter-ended text",
    overview(QS.html()).indexOf(PM_SOURCE) >= 0 && cashCard(QS.html()).indexOf(ENDED_TH) < 0, cashCard(QS.html()).slice(0, 600));

  // ---------- fix round 1 [5]: ร่างตอนเปิดหน้าเก่ากว่าเงินสดบน server (เครื่องอื่นบันทึกทีหลัง) ----------
  var NEWER = clone(FIX); NEWER.foreignSleeve = { cash: 520000, updatedAt: "2026-11-09T05:00:00.000Z" };
  var BS1 = {}; BS1[DRAFT_KEY] = JSON.stringify({ cash: 450000, savedAt: "2026-11-09T01:00:00.000Z" });
  var SN = boot({ fixture: NEWER, store: BS1 }); await flush(120);
  var snCalls = SN.fetches.filter(function (f) { return f.url === "/api/portfolio"; }).map(function (f) { return f.method; }).join();
  t("boot draft (01:00) older than the server's foreignSleeve (05:00) → GETs only, no PUT · draft cleared · server value adopted (pm ฿520,000 · input 520000) · notice '" + SUPERSEDED_TH + "'",
    snCalls === "GET,GET" && SN.puts.length === 0 && SN.store[DRAFT_KEY] === undefined && /เงินสดพร้อมวาง ฿520,000/.test(overview(SN.html())) && inputValue(SN.html()) === "520000" &&
    cashCard(SN.html()).indexOf(SUPERSEDED_TH) >= 0 && SN.html().indexOf("ใช้ค่าที่ยังไม่ได้บันทึก") < 0 && SN.html().indexOf("data-pm-cash-retry") < 0, [snCalls, SN.puts.length, inputValue(SN.html())]);
  var OLDER = clone(FIX); OLDER.foreignSleeve = { cash: 300000, updatedAt: "2026-11-08T00:00:00.000Z" };
  var BS2 = {}; BS2[DRAFT_KEY] = JSON.stringify({ cash: 450000, savedAt: "2026-11-09T01:00:00.000Z" });
  var SO = boot({ fixture: OLDER, store: BS2 }); await flush(120);
  var soCalls = SO.fetches.filter(function (f) { return f.url === "/api/portfolio"; }).map(function (f) { return f.method; }).join();
  t("boot draft (11-09) newer than the server's foreignSleeve (11-08) → GET … then PUT the draft (450000) as before · draft cleared · no superseded notice",
    soCalls === "GET,GET,PUT" && SO.puts.length === 1 && SO.puts[0].data.foreignSleeve.cash === 450000 && SO.store[DRAFT_KEY] === undefined &&
    SO.html().indexOf(SUPERSEDED_TH) < 0 && /เงินสดพร้อมวาง ฿450,000/.test(overview(SO.html())), [soCalls, SO.puts.length]);

  // ---------- fix round 1 [2]: Load ที่อ่านเอกสารก่อน PUT เงินสด เขียน snapshot ทีหลังด้วย foreignSleeve เก่า ----------
  var RP = boot(); await flush(80);
  RP.setValue("data-pm-cash", "1", "600000"); RP.click("data-pm-cash-save", "1"); await flush(80);
  var savedFs = RP.puts[0] && RP.puts[0].data.foreignSleeve;
  var staleDoc = clone(FIX); staleDoc.foreignSleeve = { cash: 100000, updatedAt: "2026-11-01T00:00:00.000Z" };
  var lateLoad = SNAP(staleDoc); lateLoad.loadedAt = new Date(Date.now() - 60000).toISOString(); lateLoad.marketRisk = { marker: "from-load" };
  var w0 = RP.snapWrites();
  RP.win.PortfolioDataSnapshot.write(lateLoad); await flush(20);
  var lsRP = JSON.parse(RP.store[SNAP_KEY] || "null");
  t("late Load snapshot (loadedAt before the save, foreignSleeve 100,000 from 11-01) → re-patched once: localStorage has the saved cash 600000 with the same updatedAt · the Load's other fields kept · exactly 2 writes (no loop)",
    !!savedFs && RP.snapWrites() === w0 + 2 && lsRP.portfolioStatus.data.foreignSleeve.cash === 600000 && lsRP.portfolioStatus.data.foreignSleeve.updatedAt === savedFs.updatedAt &&
    lsRP.marketRisk.marker === "from-load" && lsRP.loadedAt === lateLoad.loadedAt && lsRP.portfolioStatus.mode === "supabase" && !hasFromPM(lsRP) &&
    /เงินสดพร้อมวาง ฿600,000/.test(overview(RP.html())), [RP.snapWrites() - w0, lsRP && lsRP.portfolioStatus.data.foreignSleeve]);
  var w1 = RP.snapWrites(), s3 = clone(RP.snap()); s3.portfolioHoldings.data.push(H("TSM", 274000));
  RP.win.PortfolioDataSnapshot.write(s3); await flush(20);
  t("a later holdings write (snapshot already has the saved cash) is not re-patched: exactly 1 write", RP.snapWrites() === w1 + 1, RP.snapWrites() - w1);

  // ---------- fix round 1 [1]: กลับมาที่แท็บ (focus + visibilitychange) ----------
  var tabFailGet = true;
  var TB = boot({ flags: function () { return { failGet: tabFailGet }; } }); await flush(80);   // GET ตอนเปิดหน้าล้ม → ยังไม่มีสำเนาสด
  tabFailGet = false;
  TB.mark(); var r0 = TB.renders();
  TB.win.dispatchEvent(new CustomEvent("focus", {})); TB.fireDoc("visibilitychange");
  var inflightCalls = TB.portfolioCallsSince();
  await flush(60);
  t("tab return fires focus + visibilitychange back-to-back → exactly one GET (the second is skipped while the first is in flight)",
    inflightCalls === "GET" && TB.portfolioCallsSince() === "GET", [inflightCalls, TB.portfolioCallsSince()]);
  t("fetched doc equals the one on screen (server = snapshot copy) → no re-render", TB.renders() === r0, [r0, TB.renders()]);
  // เอกสารบน server เปลี่ยน (เครื่องอื่นบันทึกเงินสด) ขณะผู้ใช้พิมพ์มูลค่าหุ้นค้างอยู่ → ไม่วาดใหม่จนกว่าจะออกจากช่อง
  TB.serverFixture.foreignSleeve = { cash: 300000, updatedAt: "2026-11-09T06:00:00.000Z" };
  var realNow = Date.now;
  Date.now = function () { return realNow() + 31000; };   // ข้ามเกณฑ์ 30 วิ ของการดึงใหม่ตอนกลับมาที่แท็บ
  try {
    var focused = TB.focusNode("data-pm-mv", "QQQM");
    var r1 = TB.renders(); TB.mark();
    TB.win.dispatchEvent(new CustomEvent("focus", {})); await flush(60);
    var deferred = TB.portfolioCallsSince() === "GET" && TB.renders() === r1 && TB.html().indexOf("฿300,000") < 0;
    TB.blurAll(); await flush(20);
    t("doc changed while a pm-mv input has focus → one GET, no render while focused · after focusout exactly one render shows the new cash ฿300,000",
      focused && deferred && TB.renders() === r1 + 1 && /เงินสดพร้อมวาง ฿300,000/.test(overview(TB.html())), [focused, deferred, TB.renders() - r1]);
  } finally { Date.now = realNow; }

  // ---------- final fix wave [4]: การวาดที่เลื่อนไว้ต้องไม่กลืนคลิกปุ่มบันทึก ----------
  //   Chrome: mousedown บนปุ่ม → focusout ของช่อง (relatedTarget = ปุ่ม) → ปุ่มได้โฟกัส → mouseup → click
  //   วาดใหม่ระหว่าง mousedown กับ click (setTimeout 0 ของ focusout) = innerHTML ถูกแทน → click ไม่เกิดบนปุ่มเดิม
  //   harness ไม่จำลองคลิกหาย → พิสูจน์ด้วย "ไม่มีการวาด + node ปุ่มยังเป็นตัวเดิม" ก่อน click
  //   boot ทั้งสามก่อนเลื่อนนาฬิกา (psFetchedAt ของ GET ตอนเปิดหน้าต้องเป็นเวลาจริง)
  var SB = boot(), RT = boot(), BT = boot(); await flush(80);
  Date.now = function () { return realNow() + 31000; };   // ข้ามเกณฑ์ 30 วิ ของการดึงใหม่ตอนกลับมาที่แท็บ
  try {
    SB.serverFixture.foreignSleeve = { cash: 300000, updatedAt: "2026-11-09T06:00:00.000Z" };
    var sbFocused = SB.focusNode("data-pm-cash", "1");
    SB.setValue("data-pm-cash", "1", "700000");
    var sb0 = SB.renders(); SB.mark();
    SB.win.dispatchEvent(new CustomEvent("focus", {})); await flush(60);
    var sbDeferred = SB.portfolioCallsSince() === "GET" && SB.renders() === sb0;
    var sbBtn = SB.node("data-pm-cash-save", "1");
    var sbMoved = SB.moveFocus("data-pm-cash-save", "1"); await flush(20);
    t("pending render (doc changed while typing in the cash input) + focusout with relatedTarget = the save button → no render before the click · same button node",
      sbFocused && sbDeferred && sbMoved && SB.renders() === sb0 && !!sbBtn && SB.node("data-pm-cash-save", "1") === sbBtn,
      [sbFocused, sbDeferred, sbMoved, SB.renders() - sb0]);
    SB.mark();
    var sbClicked = SB.click("data-pm-cash-save", "1"); await flush(80);
    t("… then the click on that button saves the typed value: GET,PUT · foreignSleeve.cash 700000 (not the other device's 300000) · overview ฿700,000",
      sbClicked && SB.portfolioCallsSince() === "GET,PUT" && SB.puts.length === 1 && SB.puts[0].data.foreignSleeve.cash === 700000 &&
      /เงินสดพร้อมวาง ฿700,000/.test(overview(SB.html())), [sbClicked, SB.portfolioCallsSince(), SB.puts.length]);

    // ตัวกัน relatedTarget แยกจากตัวกันปุ่ม: focusout ไปตัวควบคุมใน #pmRoot แต่ ณ setTimeout ยังไม่มีตัวไหนโฟกัส → คง pending
    //   แล้ว focusout ที่ออกนอกหน้า (relatedTarget ว่าง) → วาดหนึ่งครั้ง
    RT.serverFixture.foreignSleeve = { cash: 250000, updatedAt: "2026-11-09T07:00:00.000Z" };
    var rtFocused = RT.focusNode("data-pm-mv", "QQQM");
    var rt0 = RT.renders();
    RT.win.dispatchEvent(new CustomEvent("focus", {})); await flush(60);
    var rtOut = RT.focusOutTo("data-pm-cash-save", "1"); await flush(20);
    var rtKept = RT.renders() === rt0;
    RT.blurAll(); await flush(20);
    t("focusout whose relatedTarget is inside #pmRoot keeps the render pending (even with nothing focused yet) · focus leaving the page → exactly one render with ฿250,000",
      rtFocused && rtOut && rtKept && RT.renders() === rt0 + 1 && /เงินสดพร้อมวาง ฿250,000/.test(overview(RT.html())), [rtFocused, rtOut, rtKept, RT.renders() - rt0]);

    // ปุ่มใน #pmRoot ที่ถูกโฟกัส = กำลังใช้งาน: GET เบื้องหลังได้เอกสารใหม่ → ไม่วาดทันที (pending) · กดปุ่มนั้นได้ตามปกติ
    BT.serverFixture.foreignSleeve = { cash: 350000, updatedAt: "2026-11-09T08:00:00.000Z" };
    var btFocused = BT.focusNode("data-pm-cash-save", "1");
    var bt0 = BT.renders(); BT.mark();
    BT.win.dispatchEvent(new CustomEvent("focus", {})); await flush(60);
    t("a focused BUTTON inside #pmRoot counts as busy: changed doc from a background GET → no render while the button has focus",
      btFocused && BT.portfolioCallsSince() === "GET" && BT.renders() === bt0, [btFocused, BT.portfolioCallsSince(), BT.renders() - bt0]);
  } finally { Date.now = realNow; }

  // ---------- Privacy Lock ----------
  var PV = { locked: true, isLocked: function () { return this.locked; } };
  var L = boot({ fixture: SV, privacy: PV }); await flush(80);
  var hl = L.html();
  t("locked: cash input renders empty with placeholder '" + LOCKED_PH + "' (no 400000 anywhere in the input)",
    inputValue(hl) === "" && inputPlaceholder(hl) === LOCKED_PH && cashInputTag(hl).indexOf("400000") < 0, cashInputTag(hl));
  t("locked: money stays as ฿ text nodes (privacy.js masks them) · no ฿ inside title/aria-label anywhere on the page",
    /เงินสดพร้อมวาง ฿400,000/.test(overview(hl)) && !/(title|aria-label)="[^"]*฿/.test(hl), (/(title|aria-label)="[^"]*฿[^"]*"/.exec(hl) || [""])[0]);
  L.mark(); L.click("data-pm-cash-save", "1"); await flush(60);
  t("locked + blank on save = keep the stored cash: no GET · no PUT · says the old value is kept",
    L.getsSince() === 0 && L.putsSince() === 0 && /ใช้ค่าเดิม/.test(L.html()) && L.html().indexOf(INVALID_TH) < 0);
  L.mark(); L.setValue("data-pm-cash", "1", "900000"); L.key("data-pm-cash", "1", "Enter"); await flush(80);
  t("locked + a typed value saves normally (PUT 900000) and the input goes back to blank", L.putsSince() === 1 && L.puts[L.puts.length - 1].data.foreignSleeve.cash === 900000 && inputValue(L.html()) === "");
  PV.locked = false; L.fireDoc("portfolio-privacy-changed");
  var unl = inputValue(L.html());
  PV.locked = true; L.fireDoc("portfolio-privacy-changed");
  t("portfolio-privacy-changed re-renders: unlock → input 900000 · lock → blank + placeholder", unl === "900000" && inputValue(L.html()) === "" && inputPlaceholder(L.html()) === LOCKED_PH, [unl, inputValue(L.html())]);
  // ล็อกระหว่างพิมพ์ → ช่องถูกล้าง (ไม่ค้างค่าที่พิมพ์ไว้บนจอ)
  PV.locked = false; L.fireDoc("portfolio-privacy-changed");
  L.setValue("data-pm-cash", "1", "12345"); PV.locked = true; L.fireDoc("portfolio-privacy-changed");
  t("typed text is dropped when the page locks", inputValue(L.html()) === "");

  // ---------- ทั้งหน้า: ไม่มีขยะหลุดจอ / ไม่มีคำแนะนำ / ไม่มี ฿ ใน title ----------
  var pages = [["editor", h0], ["pm", h1], ["cash0", hz], ["draft", hf], ["locked", hl], ["boot-draft", hBoot]];
  t("no NaN/undefined/Infinity on any rendered state", pages.every(function (p) { return !LEAK.test(p[1]); }), pages.filter(function (p) { return LEAK.test(p[1]); }).map(function (p) { return p[0] + ":" + (LEAK.exec(p[1]) || [""])[0] + " …" + p[1].slice(Math.max(0, p[1].search(LEAK) - 80), p[1].search(LEAK) + 40); }));
  t("no ฿ inside title/aria-label on any rendered state", pages.every(function (p) { return !/(title|aria-label)="[^"]*฿/.test(p[1]); }), pages.map(function (p) { return (/(title|aria-label)="[^"]*฿[^"]*"/.exec(p[1]) || [""])[0]; }).filter(Boolean));
  t("cash card / cash row carry no advisory words (TH list + Buy/Sell)",
    pages.every(function (p) { var s = cashCard(p[1]) + cashRow(p[1]); return !ADVISORY_TH.test(s) && !ADVISORY_EN.test(s); }));
  t("the 4 overview stat cards remain (class=\"pm-stat\" × 4)", (h1.match(/class="pm-stat"/g) || []).length === 4);

  // ---------- final fix wave [2a]: หน้า PM เขียนแถวหุ้นต่างประเทศลงไตรมาสล่าสุดที่ยังไม่จบ ----------
  //   ไม่งั้นวันที่ 1 ของไตรมาสใหม่ ผู้อ่านถอยไปใช้แถวที่เก็บไว้ (ค่าเก่า) → ผลตอบแทนไตรมาสที่เพิ่งจบเปลี่ยนข้ามคืน
  console.log("== final fix wave [2a]: แถวหุ้นต่างประเทศของไตรมาสล่าสุด = ค่า PM ==");
  var ROW_FAIL_TH = "ยังเขียนหุ้นต่างประเทศลงไตรมาสใน Quarterly Editor ไม่สำเร็จ — จะลองอีกครั้งเมื่อบันทึกเงินสดหรือมูลค่าหุ้นครั้งถัดไป";
  function HS() { var s = {}; s["portfolioHoldingsDraft"] = JSON.stringify(HOLDINGS); return s; }   // รายการหุ้นในเครื่อง (PortfolioCore)
  function rowOf(body) { return foreignRows(body.data || body, "2026-Q4")[0]; }
  // (1) แถวมี id + เงินเติม/ถอน 2 แถว → แถวเดียว คง name/id แถวแรก · netFlow รวม · แถวอื่น/ไตรมาสอื่นคงเดิมทุก byte
  var FXN = clone(FIX);
  FXN.quarters["2026-Q4"].assets = [
    { id: "f4", type: "foreign-stock", name: "US", manualValue: 5000000, snapshotValue: 5000000, investedPercent: 70, netFlow: 100000, createdAt: "2026-10-01T00:00:00.000Z" },
    { id: "b4", type: "bitcoin", name: "Bitcoin", manualValue: 3000000, snapshotValue: 3000000, investedPercent: 100, netFlow: 0 },
    { id: "c4", type: "cash", name: "เงินสด", manualValue: 1000000, snapshotValue: 1000000, investedPercent: 0, netFlow: 0 },
    { id: "f4b", type: "foreign-stock", name: "EU", manualValue: 300000, snapshotValue: 300000, investedPercent: 100, netFlow: 50000 }
  ];
  var RW = boot({ fixture: FXN, snapshot: SNAP(FXN) }); await flush(80);
  var rwServer = clone(RW.serverFixture);
  RW.mark(); RW.setValue("data-pm-cash", "1", "600000"); RW.click("data-pm-cash-save", "1"); await flush(80);
  var rwPut = RW.puts[0], rwRow = rwPut && rowOf(rwPut);
  t("cash save (pm) → GET,PUT · 2026-Q4 foreign row = Σ holdings + cash (฿3,326,000 · 81.96%) with the first row's name/id/createdAt (US · f4) · netFlow 100,000 + 50,000 = 150,000 · EU merged away · stays in the first row's position",
    RW.portfolioCallsSince() === "GET,PUT" && !!rwRow && foreignRows(rwPut.data, "2026-Q4").length === 1 && rwRow.id === "f4" && rwRow.name === "US" &&
    rwRow.createdAt === "2026-10-01T00:00:00.000Z" && rwRow.manualValue === 3326000 && rwRow.snapshotValue === 3326000 &&
    Math.abs(rwRow.investedPercent - INVESTED / 3326000 * 100) < 1e-9 && rwRow.netFlow === 150000 && rwPut.data.quarters["2026-Q4"].assets[0] === rwRow,
    [RW.portfolioCallsSince(), rwRow]);
  t("…other rows of 2026-Q4 (Bitcoin · เงินสด) and 2026-Q3 byte-identical · order kept · no fromPM · foreignSleeve 600000",
    !!rwPut && JSON.stringify(rwPut.data.quarters["2026-Q4"].assets.slice(1)) === JSON.stringify(rwServer.quarters["2026-Q4"].assets.slice(1, 3)) &&
    JSON.stringify(rwPut.data.quarters["2026-Q3"]) === JSON.stringify(rwServer.quarters["2026-Q3"]) && rwPut.data.quarters["2026-Q4"].assets.length === 3 &&
    !hasFromPM(rwPut) && rwPut.data.foreignSleeve.cash === 600000 && JSON.stringify(rwPut.data.allocation) === JSON.stringify(rwServer.allocation));
  // (2) ไตรมาสล่าสุดจบแล้วตามปฏิทิน → เงินสดบันทึกได้ แต่ไตรมาสไม่ถูกแตะ (ค่าที่เก็บ = ประวัติ)
  var QW = boot({ fixture: SVQE, snapshot: SNAP(SVQE), now: CLOCK.Q4_2026 }); await flush(80);
  var qwServer = clone(QW.serverFixture);
  QW.mark(); QW.setValue("data-pm-cash", "1", "500000"); QW.click("data-pm-cash-save", "1"); await flush(80);
  var qwPut = QW.puts[0];
  t("quarter-ended doc (latest 2026-Q3 in Nov) → cash still saves (GET,PUT · 500000) · quarters byte-identical to the server's (4,600,000 kept)",
    QW.portfolioCallsSince() === "GET,PUT" && !!qwPut && qwPut.data.foreignSleeve.cash === 500000 &&
    JSON.stringify(qwPut.data.quarters) === JSON.stringify(qwServer.quarters) && foreignRows(qwPut.data, "2026-Q3")[0].manualValue === 4600000,
    qwPut && JSON.stringify(qwPut.data.quarters["2026-Q3"].assets[0]));
  // (3) Editor เปิดไตรมาสเก่า (past-quarter) → ไตรมาสไม่ถูกแตะเช่นกัน
  var PW = boot({ fixture: SVPQ, snapshot: SNAP(SVPQ) }); await flush(80);
  var pwServer = clone(PW.serverFixture);
  PW.setValue("data-pm-cash", "1", "500000"); PW.click("data-pm-cash-save", "1"); await flush(80);
  t("past-quarter doc → cash saves · quarters byte-identical", PW.puts.length === 1 && JSON.stringify(PW.puts[0].data.quarters) === JSON.stringify(pwServer.quarters) && PW.puts[0].data.foreignSleeve.cash === 500000);

  // (4) แก้มูลค่าหุ้นรายตัวในหน้า PM (โหมด pm) → หลังบันทึกรายการหุ้นสำเร็จ หน่วง ~1.5 วิ → GET สด → PUT แถวใหม่ (ครั้งเดียว)
  var HW = boot({ fixture: SV, snapshot: SNAP(SV), store: HS() }); await flush(80);
  var hwServer = clone(HW.serverFixture);
  HW.mark();
  HW.setValue("data-pm-mv", "NVDA", "735000"); var hwChanged = HW.change("data-pm-mv", "NVDA");
  await flush(300);
  var hwEarly = HW.portfolioCallsSince(), hwRenders = HW.renders(), hwDispatch0 = HW.dispatched.length;
  await flush(1700);
  var hwPut = HW.puts[0], hwRow = hwPut && rowOf(hwPut);
  t("holdings save (NVDA 435,000 → 735,000) → PUT /api/portfolio-holdings · nothing to /api/portfolio before the debounce",
    hwChanged && HW.holdingsPuts.length === 1 && hwEarly === "", [hwChanged, HW.holdingsPuts.length, hwEarly]);
  t("…after the debounce exactly one GET then one PUT · foreign row = QQQM 2,000,000 + NVDA 735,000 + META 291,000 + cash 400,000 = ฿3,426,000 · name US · no fromPM",
    HW.portfolioCallsSince() === "GET,PUT" && HW.puts.length === 1 && !!hwRow && hwRow.name === "US" && hwRow.manualValue === 3426000 && hwRow.snapshotValue === 3426000 &&
    Math.abs(hwRow.investedPercent - 3026000 / 3426000 * 100) < 1e-9 && !hasFromPM(hwPut), [HW.portfolioCallsSince(), hwRow]);
  t("…rest of the doc byte-identical (other rows · 2026-Q3 · foreignSleeve · allocation · other keys)",
    !!hwPut && JSON.stringify(hwPut.data.quarters["2026-Q4"].assets.slice(1)) === JSON.stringify(hwServer.quarters["2026-Q4"].assets.slice(1)) &&
    JSON.stringify(hwPut.data.quarters["2026-Q3"]) === JSON.stringify(hwServer.quarters["2026-Q3"]) && JSON.stringify(hwPut.data.foreignSleeve) === JSON.stringify(hwServer.foreignSleeve) &&
    JSON.stringify(hwPut.data.allocation) === JSON.stringify(hwServer.allocation) && JSON.stringify(hwPut.data.someOtherKey) === JSON.stringify(hwServer.someOtherKey));
  var hwSnap = JSON.parse(HW.store[SNAP_KEY] || "null");
  t("…dispatched portfolio-allocation-saved { data: PUT body } · snapshot copy patched (row 3,426,000) · no re-render (user may be typing the next value)",
    HW.dispatched.slice(hwDispatch0).some(function (e) { return e.type === "portfolio-allocation-saved" && e.detail && JSON.stringify(e.detail.data) === JSON.stringify(hwPut.data); }) &&
    !!hwSnap && hwSnap.portfolioStatus.data.quarters["2026-Q4"].assets[0].manualValue === 3426000 && hwSnap.marketRisk.marker === "keep-me" && HW.renders() === hwRenders,
    [HW.renders() - hwRenders]);
  // แก้ติด ๆ กันสองตัวภายในช่วงหน่วง → GET/PUT รอบเดียวด้วยค่าล่าสุด
  HW.mark();
  HW.setValue("data-pm-mv", "META", "391000"); HW.change("data-pm-mv", "META"); await flush(400);
  HW.setValue("data-pm-mv", "QQQM", "2100000"); HW.change("data-pm-mv", "QQQM"); await flush(1900);
  var hwPut2 = HW.puts[HW.puts.length - 1];
  t("two holdings saves within the debounce → one GET,PUT with both changes (2,100,000 + 735,000 + 391,000 + 400,000 = ฿3,626,000)",
    HW.portfolioCallsSince() === "GET,PUT" && rowOf(hwPut2).manualValue === 3626000, [HW.portfolioCallsSince(), rowOf(hwPut2).manualValue]);
  // (5) ไม่ใช่โหมด pm (ยังไม่กรอกเงินสด) → GET แล้วไม่ PUT
  var NW = boot({ fixture: FIX, snapshot: SNAP(FIX), store: HS() }); await flush(80);
  NW.mark(); NW.setValue("data-pm-mv", "NVDA", "735000"); NW.change("data-pm-mv", "NVDA"); await flush(1900);
  t("non-pm (no cash entered) → holdings save → GET only after the debounce, no PUT · no failure note",
    NW.holdingsPuts.length === 1 && NW.portfolioCallsSince() === "GET" && NW.puts.length === 0 && NW.html().indexOf(ROW_FAIL_TH) < 0, NW.portfolioCallsSince());
  // quarter-ended (pm ไม่ได้) → ไม่ PUT เช่นกัน
  var EW = boot({ fixture: SVQE, snapshot: SNAP(SVQE), store: HS(), now: CLOCK.Q4_2026 }); await flush(80);
  EW.mark(); EW.setValue("data-pm-mv", "NVDA", "735000"); EW.change("data-pm-mv", "NVDA"); await flush(1900);
  t("quarter-ended → holdings save → GET only, no PUT (stored 2026-Q3 untouched)", EW.portfolioCallsSince() === "GET" && EW.puts.length === 0, EW.portfolioCallsSince());
  // บันทึกรายการหุ้นไม่สำเร็จ → ไม่เขียนแถว
  var failHP = true;
  var FW = boot({ fixture: SV, snapshot: SNAP(SV), store: HS(), flags: function () { return { failHoldingsPut: failHP }; } }); await flush(80);
  FW.mark(); FW.setValue("data-pm-mv", "NVDA", "735000"); FW.change("data-pm-mv", "NVDA"); await flush(1900);
  t("holdings PUT fails → no row write at all (no GET, no PUT)", FW.holdingsPuts.length === 1 && FW.portfolioCallsSince() === "" && FW.puts.length === 0, FW.portfolioCallsSince());
  // (6) server ว่างตอนเขียนแถว → ไม่ PUT + ข้อความสั้น · บันทึกเงินสดสำเร็จครั้งถัดไป → ข้อความหาย
  var zEmpty = false;
  var ZW = boot({ fixture: SV, snapshot: SNAP(SV), store: HS(), flags: function () { return { serverEmpty: zEmpty }; } }); await flush(80);
  zEmpty = true;
  ZW.mark(); ZW.setValue("data-pm-mv", "NVDA", "735000"); ZW.change("data-pm-mv", "NVDA"); await flush(1900);
  zEmpty = false;
  t("empty server doc during the row write → GET only, refuses to PUT · small note '" + ROW_FAIL_TH + "' (no ฿, no draft, no retry button)",
    ZW.portfolioCallsSince() === "GET" && ZW.puts.length === 0 && ZW.html().indexOf(ROW_FAIL_TH) >= 0 && ZW.store[DRAFT_KEY] === undefined && ZW.html().indexOf("data-pm-cash-retry") < 0,
    [ZW.portfolioCallsSince(), cashCard(ZW.html()).slice(0, 600)]);
  ZW.mark(); ZW.setValue("data-pm-cash", "1", "400000"); ZW.click("data-pm-cash-save", "1"); await flush(80);
  t("…next cash save (GET,PUT) writes the row (3,426,000 incl. the new NVDA) and clears the note",
    ZW.portfolioCallsSince() === "GET,PUT" && rowOf(ZW.puts[0]).manualValue === 3426000 && ZW.html().indexOf(ROW_FAIL_TH) < 0, [ZW.portfolioCallsSince()]);
  // (7) รอบเขียนแถวค้าง (PUT ยังไม่ตอบ) → บันทึกเงินสดรอรอบนั้นก่อน GET ของตัวเอง (กัน PUT สองตัวสลับกันทับเงินสด)
  var yHold = false;
  var YW = boot({ fixture: SV, snapshot: SNAP(SV), store: HS(), flags: function () { return { holdPut: yHold }; } }); await flush(80);
  yHold = true;
  YW.mark(); YW.setValue("data-pm-mv", "NVDA", "735000"); YW.change("data-pm-mv", "NVDA"); await flush(1800);
  var yInflight = YW.portfolioCallsSince();
  YW.setValue("data-pm-cash", "1", "900000"); YW.click("data-pm-cash-save", "1"); await flush(80);
  var yWaiting = YW.portfolioCallsSince();
  yHold = false; YW.releasePuts(); await flush(120);
  var yLast = YW.puts[YW.puts.length - 1];
  t("row write in flight (PUT held) → a cash save waits: no new GET until that PUT answers · then GET,PUT · server ends with cash 900,000 and row 3,026,000 + 900,000 = ฿3,926,000",
    yInflight === "GET,PUT" && yWaiting === "GET,PUT" && YW.portfolioCallsSince() === "GET,PUT,GET,PUT" && YW.serverFixture.foreignSleeve.cash === 900000 &&
    rowOf({ data: YW.serverFixture }).manualValue === 3926000 && rowOf(yLast).manualValue === 3926000, [yInflight, yWaiting, YW.portfolioCallsSince()]);

  // ---------- โค้ด ----------
  var SRC = read("portfolio-manager-page.js");
  var addedComments = SRC.split("\n").filter(function (l) { return /cash|Cash|ร่าง|foreignSleeve/.test(l); }).join("\n");
  t("portfolio-manager-page.js is ES5 (no => / const / let / template literals)", es5ok("portfolio-manager-page.js"));
  t("no advisory words in the page source lines about cash/draft (comments included)", !ADVISORY_TH.test(addedComments) && !ADVISORY_EN.test(addedComments));
  t("pm-view harness anchor + names still above it", SRC.indexOf("  // ธงแดง/มูลค่าเปลี่ยนจาก Action Center") > 0 &&
    ["function sectionCurrent", "function pieSvg", "function writeJson", "CVIEW_STORE"].every(function (k) { var i = SRC.indexOf(k); return i >= 0 && i < SRC.indexOf("  // ธงแดง/มูลค่าเปลี่ยนจาก Action Center"); }));
  t("CSS styles the cash box (.pm-cash-inp / .pm-cashbox)", /\.pm-cash-inp\s*\{/.test(css) && /\.pm-cashbox\s*\{/.test(css));
  t("every PUT this suite saw carried no fromPM", [MAIN, D, D2, R, F, N, L, SB, RW, QW, PW, HW, NW, EW, FW, ZW, YW].every(function (I) { return I.puts.every(function (p) { return !hasFromPM(p); }); }));
  t("the row-sync note carries no money and no advisory words", ROW_FAIL_TH.indexOf("฿") < 0 && !/\d/.test(ROW_FAIL_TH) && !ADVISORY_TH.test(ROW_FAIL_TH) && !ADVISORY_EN.test(ROW_FAIL_TH));

  finish();
})().catch(function (e) {
  fail++;
  console.error("  ✗ เทสต์ล้มกลางทาง: " + (e && e.stack || e));
  finish();
});
