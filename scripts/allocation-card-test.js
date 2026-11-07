"use strict";
// ============================================================
// Asset allocation card — หน้า (public/allocation-card-page.js) — เทสต์ชั้นแสดงผลใน VM sandbox
//   node scripts/allocation-card-test.js
//
// harness แบบ asset-allocation-view-test (boot · mkEl · fetch ปลอม · localStorage ปลอม) แต่
//   window.addEventListener / dispatchEvent ทำงานจริง (การ์ดฟัง event "portfolio-position-rendered"
//   จากหน้า position) · โหลดสคริปต์ตามลำดับที่ portfolio.html โหลดจริง (อ่านจาก HTML) เฉพาะ 5 ไฟล์
//   ที่การ์ดต้องใช้ · ไม่มี PortfolioDataSnapshot ใน sandbox = เส้นทางก่อน Load Latest Data จริง
//   (หน้า position ดึง GET /api/portfolio เอง)
// ล็อก: การ์ดวาดจาก R ชุดเดียวกับส่วนหัว · ตัวเลขปัดที่ชั้นแสดงผล · แท่ง 4 ก้อนลำดับคงที่ สูงตามเงินจริง
//   · แถบเงินสดเทียบกรอบของผู้ใช้ · ไม่มีคำแนะนำซื้อขาย · ไม่มีเงินใน title · #acRoot ไม่ถูก #ppRoot เขียนทับ
// ============================================================
var fs = require("fs");
var path = require("path");
var vm = require("vm");

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
function flush(ms) { return new Promise(function (r) { setTimeout(r, ms == null ? 40 : ms); }); }

// ---------- fixture: เดียวกับเทสต์เอนจิน (Task 1) + allocationPlan ระดับบนของเอกสาร ----------
// แถว Quarterly Editor: มูลค่าเดียวกันทั้ง manual/snapshot · inv = ลงทุนแล้วกี่ %
function A(type, name, value, inv) {
  return { type: type, name: name, manualValue: value, snapshotValue: value, investedPercent: inv };
}
// thai-stock 88% (ไม่ใช่ 90%) ให้ผลรวมรอซื้อ 3.14 ล้าน — เลี่ยงค่า x.x5 ที่ toFixed(1) ปัดไม่แน่นอน
var FIX = { currentQuarter: "2026-Q3", quarters: { "2026-Q3": { key: "2026-Q3", assets: [
  A("bitcoin", "Bitcoin", 10000000, 78),
  A("foreign-stock", "US", 4000000, 90),
  A("provident-fund", "PVD", 1000000, 100),
  A("rmf-jang", "RMF-จัง", 1500000, 100),
  A("rmf-tum", "RMF-ตุ๋ม", 1400000, 100),
  A("thai-stock", "หุ้นไทย", 4500000, 88),
  A("cash", "เงินสด", 2100000, 0),
  A("custom", "อื่นๆ", 500000, 100)
] } }, allocationPlan: { cashBand: { min: 1000000, max: 3000000 }, updatedAt: "2026-11-01T00:00:00.000Z" },
  // คีย์ของส่วน Asset Allocation — การ์ดต้องไม่แตะ (Task 3: PUT ต้องคงไว้ทุก byte) · AssetAllocation ไม่ถูกโหลดใน sandbox
  allocation: { note: "untouched" } };

// ---------- สคริปต์ชุดเดียวกับ portfolio.html (อ่านลำดับจาก HTML) ----------
var HTML = read("portfolio.html");
var css = read("portfolio-position.css");
var WANT = ["portfolio-core.js", "portfolio-position-engine.js", "portfolio-position-page.js", "allocation-card-engine.js", "allocation-card-page.js"];
var SCRIPTS = (function () {
  var out = [], re = /<script src="\/([A-Za-z0-9._-]+\.js)\?v=[^"]*"/g, m;
  while ((m = re.exec(HTML)) !== null) if (WANT.indexOf(m[1]) >= 0) out.push(m[1]);
  return out;
})();

// ---------- sandbox ----------
function mkEl(id) {
  return {
    id: id, innerHTML: "", value: "", style: {}, attrs: {}, hidden: false,
    appendChild: function () {}, setAttribute: function (k, v) { this.attrs[k] = v; },
    getAttribute: function (k) { return this.attrs[k] || null; },
    addEventListener: function () {}, removeEventListener: function () {},
    querySelector: function () { return null; }, querySelectorAll: function () { return []; },
    closest: function () { return null; }, focus: function () {},
    classList: { add: function () {}, remove: function () {}, contains: function () { return false; } }
  };
}
function CustomEvent(type, init) { this.type = type; this.detail = init && init.detail; }

// ---------- DOM ปลอมของ #acRoot (Task 3) — แบบ fakeNodes ของ home-action-test ----------
// root.querySelectorAll("[attr]") คืน element ปลอมหนึ่งตัวต่อค่า attribute ที่พบใน innerHTML ของ #acRoot
//   addEventListener ถูกจดใน handlers["attr|value|event"] · เขียน innerHTML ใหม่ = DOM เดิมหาย → ล้าง handler/node
//   ช่องกรอกได้ .value เริ่มต้นจาก value="…" · disabled จากแท็ก (คลิกปุ่ม disabled = ไม่เกิดอะไร)
//   registry แยกต่อ boot() — instance ใหม่ไม่ล้าง handler ของ MAIN
function openTag(h, attr, val) {
  var i = h.indexOf(attr + '="' + val + '"');
  if (i < 0) return "";
  var s = h.lastIndexOf("<", i), e = h.indexOf(">", i);
  return h.slice(s, e < 0 ? h.length : e + 1);
}
function mkDom() {
  var reg = { handlers: {}, nodes: {} };
  function fakeNode(tag, attr, val) {
    var el = {
      tagName: String(tag || "div").toUpperCase(), attributes: {}, value: "", disabled: false, innerHTML: "", hidden: false, style: {},
      getAttribute: function (k) { return this.attributes[k] === undefined ? null : this.attributes[k]; },
      setAttribute: function (k, v) { this.attributes[k] = String(v); },
      addEventListener: function (ev, fn) { reg.handlers[attr + "|" + val + "|" + ev] = fn; },
      removeEventListener: function () {}, focus: function () {}
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
      set: function (v) { h = String(v); reg.handlers = {}; reg.nodes = {}; }
    });
    el.querySelectorAll = function (sel) { return fakeNodes(h, sel); };
    el.querySelector = function (sel) { var l = fakeNodes(h, sel); return l.length ? l[0] : null; };
    return el;
  }
  // คลิกเหมือนผู้ใช้: ปุ่มที่ disabled หรือไม่มี handler = ไม่เกิดอะไร (คืน false)
  function click(attr, val) {
    var fn = reg.handlers[attr + "|" + val + "|click"], el = reg.nodes[attr + "|" + val];
    if (!fn || (el && el.disabled)) return false;
    fn({ preventDefault: function () {}, stopPropagation: function () {}, target: el, currentTarget: el });
    return true;
  }
  // พิมพ์ในช่อง input[name=…]: ตั้ง .value บน node ที่หน้าเก็บไว้ แล้วยิง handler "input" ของมัน
  function setValue(name, v) {
    var el = reg.nodes["name|" + name];
    if (!el) return false;
    el.value = String(v);
    var fn = reg.handlers["name|" + name + "|input"];
    if (fn) fn({ target: el, currentTarget: el });
    return true;
  }
  // ช่อง type=number ที่เบราว์เซอร์อ่านไม่ออก (เช่น "1e"): value "" + validity.badInput แล้วยิง "input"
  function badInput(name) {
    var el = reg.nodes["name|" + name];
    if (!el) return false;
    el.value = "";
    el.validity = { badInput: true };
    var fn = reg.handlers["name|" + name + "|input"];
    if (fn) fn({ target: el, currentTarget: el });
    return true;
  }
  // node ปลอมของการวาดรอบปัจจุบัน (null = ไม่มี / หน้ายังไม่ query) — เทสต์ตัวอย่างแบบไม่วาดทั้งใบ
  function node(attr, val) { return reg.nodes[attr + "|" + val] || null; }
  return { mkRoot: mkRoot, click: click, setValue: setValue, badInput: badInput, node: node };
}

function boot(opts) {
  var o = opts || {};
  var els = {}, puts = [], dispatched = [], listeners = {}, docListeners = {}, fetches = [];
  var store = o.store || {};
  var dom = mkDom();
  var gets = 0, getsAtSave = 0;
  // เอกสารบน server ของ instance นี้ (สำเนา) — GET คืนสำเนาของมันทุกครั้ง · PUT สำเร็จเขียนทับแบบคงอ้างอิงเดิม
  //   (เทสต์แก้ serverFixture.quarters ระหว่างเปิดหน้าได้ แม้บันทึกไปแล้วหลายรอบ)
  var server = JSON.parse(JSON.stringify(o.fixture || FIX));
  // สวิตช์ของ fetch ปลอม: o.flags() → { serverEmpty, failPut } (MAIN อ่านตัวแปรระดับไฟล์) · ไม่ส่ง = ปกติ
  function flagv(name) { try { return o.flags ? o.flags()[name] : undefined; } catch (e) { return undefined; } }
  function flag(name) { return !!flagv(name); }
  var doc = {
    readyState: "complete", createElement: mkEl,
    // event บน document ทำงานจริง: privacy.js ยิง "portfolio-privacy-changed" บน document
    addEventListener: function (type, fn) { (docListeners[type] = docListeners[type] || []).push(fn); },
    getElementById: function (id) { if (!els[id]) els[id] = id === "acRoot" ? dom.mkRoot(id) : mkEl(id); return els[id]; },
    querySelector: function () { return mkEl(); }, querySelectorAll: function () { return []; },
    body: mkEl("body"), documentElement: mkEl("html"), hidden: false
  };
  function respond(ok, status, body) {
    return Promise.resolve({ ok: ok, status: status, json: function () { return Promise.resolve(body); } });
  }
  var win = {
    document: doc, location: { search: "", pathname: "/portfolio", href: "http://localhost/portfolio" },
    history: { pushState: function () {}, replaceState: function () {} },
    localStorage: {
      getItem: function (k) { return k in store ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; }
    },
    // event จริง: การ์ดฟัง "portfolio-position-rendered" ที่หน้า position ยิง
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
      fetches.push(u);
      if (/^\/api\/portfolio(\?|$)/.test(u)) {
        if (init && init.method === "PUT") {
          var body = JSON.parse(init.body);
          puts.push(body);
          if (flag("failPut")) return respond(false, 500, { error: "boom" });
          Object.keys(server).forEach(function (k) { delete server[k]; });
          Object.keys(body.data || {}).forEach(function (k) { server[k] = JSON.parse(JSON.stringify(body.data[k])); });
          return respond(true, 200, { ok: true });
        }
        gets++;
        // throwGet: true = fetch โยนทันที (sync) · "reject" = promise ล้มแบบเน็ตหลุดจริง · failGet = ตอบ 503
        var tg = flagv("throwGet");
        if (tg === "reject") return Promise.reject(new TypeError("Failed to fetch"));
        if (tg) throw new TypeError("Failed to fetch");
        if (flag("failGet")) return respond(false, 503, { error: "unavailable" });
        if (flag("serverEmpty")) return respond(true, 200, { data: { quarters: {} } });
        return respond(true, 200, { data: JSON.parse(JSON.stringify(server)) });
      }
      // /api/portfolio-holdings ฯลฯ — ไม่มีในเทสต์นี้: ล้มเงียบ ๆ (loadHoldings ถอยไปใช้ local cache)
      return respond(false, 404, {});
    },
    console: console, Math: Math, JSON: JSON, Date: Date, Number: Number, String: String,
    Object: Object, Array: Array, Boolean: Boolean, isFinite: isFinite, isNaN: isNaN,
    parseInt: parseInt, parseFloat: parseFloat, Promise: Promise, RegExp: RegExp, Error: Error, TypeError: TypeError,
    encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent,
    setTimeout: setTimeout, clearTimeout: clearTimeout, Intl: Intl
  };
  win.window = win; win.self = win; win.globalThis = win;
  // มี snapshot จาก Load Latest Data ตั้งแต่เปิดหน้า (ปกติไม่มีใน sandbox = เส้นทางก่อน Load)
  if (o.snapshot) win.PortfolioDataSnapshot = { read: function () { return o.snapshot; } };
  // stub ของ privacy.js (window.PortfolioPrivacy.isLocked) — ไม่มี = ไม่ได้ล็อก
  if (o.privacy) win.PortfolioPrivacy = o.privacy;
  var ctx = vm.createContext(win);
  SCRIPTS.forEach(function (f) {
    try { vm.runInContext(read(f), ctx, { filename: f }); }
    catch (e) { console.error("   โหลด " + f + " ไม่ได้: " + e.message); }
  });
  var inst = {
    win: win, els: els, puts: puts, store: store, dispatched: dispatched, fetches: fetches,
    serverFixture: server,
    html: function () { return els.acRoot ? els.acRoot.innerHTML : ""; },
    fireDoc: function (type) { (docListeners[type] || []).slice().forEach(function (fn) { fn(new CustomEvent(type, {})); }); },
    // คลิกปุ่มบันทึก: จดจำนวน GET ก่อนคลิก → getsAfterSave() = GET ที่เกิดจากการบันทึกครั้งนั้น
    click: function (attr, val) { if (attr === "data-ac-save") getsAtSave = gets; return dom.click(attr, val); },
    setValue: dom.setValue, badInput: dom.badInput, node: dom.node,
    getsAfterSave: function () { return gets - getsAtSave; }
  };
  // จำนวน GET /api/portfolio ทั้งหมดของ instance นี้ (อ่านสด)
  Object.defineProperty(inst, "gets", { get: function () { return gets; } });
  return inst;
}

// สวิตช์ของ fetch ปลอมสำหรับ MAIN (เทสต์ Task 3 ตั้งตรง ๆ: serverEmpty = true · failPut = true)
//   serverEmpty → GET ตอบ { data: { quarters: {} } } · failPut → PUT ตอบ 500 · instance อื่นไม่อ่านสองตัวนี้
//   failGet → GET ตอบ 503 · throwGet → GET โยน (true = sync · "reject" = promise ล้ม) — fix round 1
var serverEmpty = false, failPut = false, failGet = false, throwGet = false;
var MAIN = boot({ flags: function () { return { serverEmpty: serverEmpty, failPut: failPut, failGet: failGet, throwGet: throwGet }; } });
var W = MAIN.win, els = MAIN.els, puts = MAIN.puts, store = MAIN.store, dispatched = MAIN.dispatched;
var serverFixture = MAIN.serverFixture;
function html() { return MAIN.html(); }
function click(attr, val) { return MAIN.click(attr, val); }
function setValue(name, v) { return MAIN.setValue(name, v); }
function getsAfterSave() { return MAIN.getsAfterSave(); }
function ppHtml() { return els.ppRoot ? els.ppRoot.innerHTML : ""; }
// ชิ้นของ html ตั้งแต่แท็กเปิดที่มี marker จนถึง marker ถัดไปตัวใดตัวหนึ่ง (ไม่มี = จนจบ)
function sliceFrom(h, marker, stops) {
  var i = h.indexOf(marker);
  if (i < 0) return "";
  var s = h.lastIndexOf("<", i), e = h.length;
  stops.forEach(function (st) { var j = h.indexOf(st, i + marker.length); if (j >= 0 && j < e) e = j; });
  return h.slice(s < 0 ? i : s, e);
}
function kpi(name) { return sliceFrom(html(), 'data-ac-kpi="' + name + '"', ['data-ac-kpi="', "data-ac-chart"]); }
function bars() { var out = [], re = /data-ac-bar="([^"]+)"/g, m, h = html(); while ((m = re.exec(h)) !== null) out.push(m[1]); return out; }
function barOf(key) { return sliceFrom(html(), 'data-ac-bar="' + key + '"', ['data-ac-bar="', "data-ac-cash"]); }
// ป้ายแกนที่ผู้ใช้เห็น (ตัวเลขล้านบาทหลัง ฿ ถ้ามี) ตามลำดับใน html
function ticks() { var out = [], re = /data-ac-tick="[^"]*"[^>]*>฿?([0-9.]+)/g, m, h = html(); while ((m = re.exec(h)) !== null) out.push(m[1]); return out; }
// v2 (ผู้ใช้สั่ง 2026-11-07): ป้ายตัวเลขของส่วน kind ("wait" | "held") ในแท่ง bh — สองตัว: ในส่วน (.ac-in) / ป้ายลอย (.ac-pill)
//   คืน { inside, float } แต่ละตัว = null (ไม่วาด) หรือ { d, m (มีคลาส show-d / show-m), amt, pct (ข้อความไม่มีแท็ก), html }
function lblCopies(bh, kind) {
  function one(re) {
    var m = re.exec(bh);
    if (!m) return null;
    var p = /<span class="ac-seg-amt">(.*?)<\/span><small class="ac-seg-pct">(.*?)<\/small>/.exec(m[2]) || ["", "", ""];
    function txt(s) { return s.replace(/<[^>]+>/g, ""); }
    return { d: / show-d(?= |$)/.test(m[1]), m: / show-m(?= |$)/.test(m[1]), amt: txt(p[1]), pct: txt(p[2]), html: m[2] };
  }
  return {
    inside: one(new RegExp('<div class="ac-in([^"]*)" data-ac-lbl="' + kind + '">(.*?</small>)</div>')),
    float: one(new RegExp('<div class="ac-pill is-' + kind + '([^"]*)" data-ac-lbl="' + kind + '">(.*?</small>)</div>'))
  };
}
// ส่วนที่มีในแท่ง (ตามลำดับที่เห็น บน → ล่าง)
function segKinds(bh) { var out = [], re = /<div class="ac-seg ac-(wait|held)"/g, m; while ((m = re.exec(bh)) !== null) out.push(m[1]); return out; }
// แต่ละส่วน: มีป้ายที่แสดงตัวเดียวต่อจอ — show-d อยู่บน (ในส่วน หรือ ป้ายลอย) ตัวเดียว · show-m ตัวเดียวเช่นกัน
function oneLabelPerWidth(bh) {
  return segKinds(bh).every(function (k) {
    var c = lblCopies(bh, k), i = c.inside || {}, f = c.float || {};
    return (!!i.d) !== (!!f.d) && (!!i.m) !== (!!f.m);
  });
}
// ป้ายใต้แท่ง: "<b>ชื่อ</b>N% ของความมั่งคั่ง" → N (ตัวเลข) · ไม่มี → null
function underPct(bh) { var m = /<div class="ac-lbl"><b>[^<]*<\/b>([0-9]+)% ของความมั่งคั่ง<\/div>/.exec(bh); return m ? Number(m[1]) : null; }

(async function main() {
  // ---------- เทสต์ตามแผน (คำต่อคำ) ----------
  t("portfolio.html: acRoot sits between ppRoot and aaRoot · scripts engine→page after position-page · pp-13 and ac-1 versions", HTML.indexOf('id="acRoot"') > HTML.indexOf('id="ppRoot"') && HTML.indexOf('id="acRoot"') < HTML.indexOf('id="aaRoot"') && /allocation-card-engine\.js\?v=20261107-ac-1"[\s\S]*allocation-card-page\.js\?v=20261107-ac-1"/.test(HTML) && HTML.indexOf("portfolio-position-page.js") < HTML.indexOf("allocation-card-engine.js") && /portfolio-position\.css\?v=20261107-pp-13/.test(HTML) && /portfolio-position-page\.js\?v=20261107-pp-13/.test(HTML));
  await flush(80);
  t("position page exposes last {R,data} and dispatched portfolio-position-rendered", !!W.PortfolioPositionPage.last && W.PortfolioPositionPage.last.R.available === true && dispatched.some(function (e) { return e.type === "portfolio-position-rendered"; }));
  t("card rendered from the same R: title + wealth equals the hero's ความมั่งคั่งรวม", /<h2 class="ac-title">Asset allocation<\/h2>/.test(html()) && /ความมั่งคั่งรวม ฿25\.0 ล้าน · 2026-Q3/.test(html()) && ppHtml().indexOf("25,000,000") >= 0);
  t("kpi invested: ฿19.8 ล้าน · 79% · others line", /data-ac-kpi="invested"[\s\S]*?฿19\.8 ล้าน[\s\S]*?79% ของความมั่งคั่ง[\s\S]*?รวมอื่น ๆ ที่ไม่มีแท่ง ฿0\.5 ล้าน/.test(html()));
  // fix wave [1]: บรรทัดแจกแจงต้องรวมได้ยอดในช่อง (ยังไม่จัดสรร + รอซื้อรวม = รวม ฿5.2 ล้าน) · "เงินสด" เฉย ๆ ไม่ใช้กับเงินสดใน Editor แล้ว
  t("kpi cash: ฿5.2 ล้าน · 21% · breakdown only for classes with wait · no bar inside", /data-ac-kpi="cash"[\s\S]*?เงินสดทั้งหมด = ยังไม่จัดสรร \+ รอซื้อทุกก้อน[\s\S]*?฿5\.2 ล้าน[\s\S]*?21% ของความมั่งคั่ง[\s\S]*?ยังไม่จัดสรร ฿2\.1 ล้าน · รอซื้อ Bitcoin ฿2\.2 ล้าน · หุ้นต่างประเทศ ฿0\.4 ล้าน · หุ้นไทย ฿0\.5 ล้าน \(รอซื้อรวม ฿3\.1 ล้าน\) = รวม ฿5\.2 ล้าน</.test(html()) && !/data-ac-kpi="cash"[\s\S]*?<i style/.test(kpi("cash")) && kpi("cash").indexOf("RMF") < 0 && kpi("cash").indexOf("เงินสด ฿") < 0);
  t("5 bars in fixed order with heights from the numbers (bitcoin 100%, foreign 40%, pvd 10% labelled กองทุนหุ้น)", bars().join() === "bitcoin,foreign,pvd,rmf,thai" && /data-ac-bar="bitcoin" style="height:100%"/.test(html()) && /data-ac-bar="foreign" style="height:40%"/.test(html()) && /data-ac-bar="pvd" style="height:10%"/.test(html()) && /<b>กองทุนหุ้น<\/b>4% ของความมั่งคั่ง/.test(barOf("pvd")) && html().indexOf("เงินสำรองเลี้ยงชีพ") < 0);
  // fix wave [2]: ยอด (.ac-seg-amt) + % (.ac-seg-pct) + คำต่อท้าย (.ac-seg-of) แยกชิ้น — จอ ≤600px CSS ซ่อนเฉพาะคำต่อท้าย
  // v2: ป้ายอยู่ใน .ac-in (ในส่วน) · คำ "รอซื้อ " แยกใน .ac-seg-w (จอ ≤600px ตัดเป็นบรรทัดของตัวเอง) แต่ "฿2.2 ล้าน" ยังเป็นโหนดข้อความเดียว
  //   ใต้แท่ง % = ทั้งแท่ง (ลงทุน + รอซื้อ) ÷ ความมั่งคั่ง → Bitcoin 10 / 25 = 40% (เดิม 7.8 / 25 = 31%)
  t("bitcoin bar: held ฿7.8 ล้าน 78% ของ Bitcoin · wait รอซื้อ ฿2.2 ล้าน 22% (money one text node) · label 40% ของความมั่งคั่ง",
    /data-ac-bar="bitcoin"[\s\S]*?ac-wait" style="height:22%"><div class="ac-in show-d" data-ac-lbl="wait"><span class="ac-seg-amt"><span class="ac-seg-w">รอซื้อ <\/span>฿2\.2 ล้าน<\/span><small class="ac-seg-pct">22%<span class="ac-seg-of"> ของ Bitcoin<\/span><\/small><\/div><\/div>[\s\S]*?ac-held" style="height:78%"><div class="ac-in show-d show-m" data-ac-lbl="held"><span class="ac-seg-amt">฿7\.8 ล้าน<\/span><small class="ac-seg-pct">78%<span class="ac-seg-of"> ของ Bitcoin<\/span><\/small><\/div><\/div>[\s\S]*?<b>Bitcoin<\/b>40% ของความมั่งคั่ง/.test(html()), barOf("bitcoin").slice(0, 600));
  t("RMF bar has no wait segment and reads 100%", !/data-ac-bar="rmf"[\s\S]*?ac-wait/.test(barOf("rmf")) && /<span class="ac-seg-amt">฿2\.9 ล้าน<\/span><small class="ac-seg-pct">100%<span class="ac-seg-of"> ของ กองทุน RMF<\/span><\/small>/.test(barOf("rmf")));
  t("axis ticks 0 · 2.5 · 5 · 7.5 · 10 ล้าน", ticks().join() === "0,2.5,5,7.5,10");
  t("cash band: within · 1–3 · now marker at 2.1/4 = 52.5%", /data-ac-cash="within"/.test(html()) && /ยังไม่จัดสรร ฿2\.1 ล้าน \(เงินสดใน Quarterly Editor\) · ในกรอบ/.test(html()) && /กรอบที่ตั้งไว้ 1–3 ล้าน/.test(html()) && /data-ac-now="52\.5" style="left:52\.5%"/.test(html()));
  t("rule boxes quote the user's own rule with the band numbers, no advisory words", /bear ↑[^<]*กติกาของคุณ[^<]*1 ล้าน/.test(html()) && /bull ↓[^<]*กติกาของคุณ[^<]*3 ล้าน/.test(html()) && !ADVISORY_TH.test(html()) && !ADVISORY_EN.test(html()));
  // v2: ใต้แท่ง % = ทั้งแท่ง (ลงทุนแล้ว + รอซื้อ) เทียบความมั่งคั่งรวม — ข้อความท้ายการ์ดตรงตัวอักษร
  t("no NaN/undefined · no title attributes with money · footer explains % bases (exact text)", !LEAK.test(html()) && !/title="[^"]*฿/.test(html()) &&
    html().indexOf('<p class="ac-foot">รอซื้อ = ส่วนที่ยังไม่ลงทุนของรายการใน Quarterly Editor (แก้ที่ช่อง ลงทุนแล้วกี่ %) · ภายในแท่ง % = ของก้อนนั้นเอง · ใต้แท่ง % = ทั้งแท่ง (ลงทุนแล้ว + รอซื้อ) เทียบความมั่งคั่งรวม</p>') >= 0,
    (/<p class="ac-foot">[^<]*<\/p>/.exec(html()) || [""])[0]);
  // หน้า position วาดใหม่ (เช่น Load Latest Data) → การ์ดตาม · acRoot ไม่ถูก ppRoot เขียนทับ
  // ล้าง acRoot ก่อน (fix round 1) — ไม่งั้นข้อนี้ผ่านได้แม้การ์ดไม่ฟัง event รอบหลัง ๆ
  els.acRoot.innerHTML = "";
  W.PortfolioPositionPage.render(); await flush(20);
  t("re-render of the position page re-renders the card (same numbers) and acRoot is untouched by ppRoot writes", /฿25\.0 ล้าน/.test(html()) && els.ppRoot.innerHTML.indexOf("ac-card") < 0);
  // ไม่มีไตรมาส
  var E = boot({ fixture: { quarters: {} } }); await flush(80);
  t("no quarterly data → card says ยังไม่มีข้อมูลใน Quarterly Editor, no bars, no throw", /ยังไม่มีข้อมูลใน Quarterly Editor/.test(E.html()) && !/data-ac-bar/.test(E.html()));
  t("ES5 page + CSS .ac-card/.ac-bar/.ac-cash + 600px breakpoint", es5ok("allocation-card-page.js") && /\.ac-card\s*\{/.test(css) && /\.ac-bar\s*\{/.test(css) && /\.ac-cash\s*\{/.test(css) && /@media \(max-width: 600px\)[\s\S]*\.ac-/.test(css));

  // ---------- เพิ่มเติมจากแผน ----------
  // คำตัดสินของ controller: หลัง Load Latest Data หน้า position ทิ้ง psCache แล้ววาดจาก snapshot
  //   → last.data ต้องเป็นเอกสารใน snapshot (ไม่ใช่ null) ไม่งั้นการ์ดเสีย allocationPlan กลับไปกรอบเริ่มต้น
  //   ใช้ instance แยก — MAIN ต้องคงสภาพไว้ให้เทสต์ของ Task 3 ที่ต่อท้าย
  var S = boot(); await flush(80);
  var SNAP_DOC = JSON.parse(JSON.stringify(FIX));
  SNAP_DOC.allocationPlan = { cashBand: { min: 500000, max: 2000000 }, updatedAt: "2026-11-02T00:00:00.000Z" };
  S.win.PortfolioDataSnapshot = { read: function () { return { portfolioStatus: { data: SNAP_DOC }, portfolioHoldings: { data: [] } }; } };
  S.win.dispatchEvent(new CustomEvent("portfolio-data-snapshot", {}));
  await flush(20);
  t("after Load Latest Data (psCache dropped) last.data = the snapshot's document → card keeps its allocationPlan (0.5–2)", !!S.win.PortfolioPositionPage.last.data && S.win.PortfolioPositionPage.last.data.allocationPlan.cashBand.min === 500000 && /กรอบที่ตั้งไว้ 0\.5–2 ล้าน/.test(S.html()) && /ความมั่งคั่งรวม ฿25\.0 ล้าน/.test(S.html()));
  // boot: หน้า position วาดเสร็จก่อนไฟล์การ์ดโหลด (มี snapshot ตั้งแต่ต้น · readyState ไม่ใช่ loading)
  //   → การ์ดใช้ PortfolioPositionPage.last ทันที ไม่รอ event (ตรวจทันทีหลัง boot ก่อน fetch ตอบ)
  var B = boot({ snapshot: { portfolioStatus: { data: FIX }, portfolioHoldings: { data: [] } } });
  t("card boots from PortfolioPositionPage.last when the position page rendered first (no event received yet)", /ความมั่งคั่งรวม ฿25\.0 ล้าน · 2026-Q3/.test(B.html()) && /data-ac-bar="bitcoin"/.test(B.html()), B.html().slice(0, 80));

  // ---------- fix round 1 ----------
  // [B][C] ป้ายจุด "ตอนนี้ ฿X ล้าน" (สเปก) · กติกา bear ไม่มีเครื่องหมายคำพูด (สเปกข้อ 4) — อ่านจาก MAIN อย่างเดียว
  t("marker label reads ตอนนี้ ฿2.1 ล้าน · bear rule has no quotation marks", /data-ac-now="52\.5" style="left:52\.5%"><span>ตอนนี้ ฿2\.1 ล้าน<\/span>/.test(html()) && /ลดเงินสดลงไปทาง 1 ล้าน เอาไปซื้อก้อนที่ยังรอซื้อ</.test(html()) && html().indexOf("&quot;") < 0);
  // [2] เส้นทางปกติก่อน Load (ไม่มี snapshot): last.data = เอกสารที่ fetch มา (psCache.data) → กรอบที่ไม่ใช่ค่าเริ่มต้นต้องขึ้น
  var BAND_DOC = JSON.parse(JSON.stringify(FIX));
  BAND_DOC.allocationPlan = { cashBand: { min: 500000, max: 2000000 }, updatedAt: "2026-11-03T00:00:00.000Z" };
  var F = boot({ fixture: BAND_DOC }); await flush(80);
  t("pre-Load fetch path: last.data = the fetched document (psCache.data) → the card shows its band 0.5–2 (cash 2.1 → above)", !!F.win.PortfolioPositionPage.last.data && F.win.PortfolioPositionPage.last.data.allocationPlan.cashBand.max === 2000000 && /กรอบที่ตั้งไว้ 0\.5–2 ล้าน/.test(F.html()) && /data-ac-cash="above"/.test(F.html()));
  // [3] เอนจินล้ม ≠ ไม่มีข้อมูล: ข้อความต่างกัน + console.error("allocation-card", e) · คืนของเดิมแล้ววาดกลับปกติ
  var errs = [], realConsole = F.win.console, realCompute = F.win.AllocationCard.compute;
  F.win.console = { error: function () { errs.push([].slice.call(arguments)); }, log: function () {}, warn: function () {} };
  F.win.AllocationCard.compute = function () { throw new Error("boom"); };
  F.win.AllocationCardPage.render();
  var thrownHtml = F.html();
  F.win.AllocationCard.compute = realCompute; F.win.console = realConsole; F.win.AllocationCardPage.render();
  t("compute throws → distinct message + console.error('allocation-card', e) · restored afterwards", /คำนวณการ์ดไม่สำเร็จ — ลองโหลดหน้าใหม่/.test(thrownHtml) && !/ยังไม่มีข้อมูลใน Quarterly Editor/.test(thrownHtml) && errs.length === 1 && errs[0][0] === "allocation-card" && /boom/.test(String(errs[0][1] && errs[0][1].message)) && /data-ac-bar="bitcoin"/.test(F.html()), thrownHtml.slice(0, 120));
  // [4] v2 (ผู้ใช้สั่ง 2026-11-07 หลัง implement — แทนบรรทัดเล็กใต้ป้าย .ac-lbl-detail เดิม):
  //   ป้ายของส่วนอยู่ในส่วนเมื่อสูงพอ · ไม่พอ → ป้ายลอย (pill) เหนือยอดแท่ง · ตัดสินแยก จอกว้าง (d) / จอ ≤600px (m)
  //   ผลที่คาดคิดจากค่าคงที่ชุดเดียวกับหน้า (AllocationCardPage._fit) และล็อกด้วยตัวเลขคิดมือ:
  //     ความสูงส่วน = CHART_PX × แท่ง% × ส่วน% · CHART_PX = ความสูง .ac-chart − ขอบล่าง 1px = 259 / 199
  //     NEED รอซื้อ จอกว้าง 56 (ป้าย 3 บรรทัดของจอ 601–1239px — พอทั้ง ≥1240px ที่ใช้ 40) · ≤600px 63 · ลงทุน 41 / 49
  //     FIX Bitcoin รอซื้อ (แท่ง 100% · 22%): 56.98 ≥ NEED 56 → ใน (จอกว้าง) · 43.78 < NEED 63 → ลอย (≤600px)
  //     FIX หุ้นต่างประเทศ รอซื้อ (แท่ง 40% · 10%): 10.36 / 7.96 → ลอยทั้งสองจอ · ลงทุน 90%: 93.2 / 71.6 → ใน
  //     FIX กองทุนหุ้น ลงทุน (แท่ง 10% · 100%): 25.9 < 41 / 19.9 < 49 → ลอยทั้งสองจอ
  //     TINY หุ้นไทย 600,000 @50 (แท่ง 6% · 50/50): 7.77 / 5.97 → ทั้งสองส่วนลอยทั้งสองจอ · ป้ายรอซื้ออยู่เหนือป้ายลงทุน
  var FITC = W.AllocationCardPage._fit;
  function fitsAt(kind, bp, barPct, pct) { return FITC.chart[bp] * barPct / 100 * pct / 100 >= FITC.need[kind][bp]; }
  t("fit constants match the CSS: CHART_PX = .ac-chart height − 1px bottom border (260 → 259 · 200 → 199) · ≤1239px puts รอซื้อ on its own line (wait d = 56) · NEED/PILL as documented",
    /\.ac-chart \{ position: relative; height: 260px;/.test(css) && /@media \(max-width: 600px\)[\s\S]*?\.ac-chart \{ height: 200px;/.test(css) &&
    /@media \(max-width: 1239px\) \{[^}]*\}\s*\.ac-seg-w \{ display: block; \}\s*\.ac-seg-of \{ display: none; \}/.test(css) &&
    css.indexOf("@media (max-width: 1239px)") < css.indexOf("@media (max-width: 600px)") &&
    FITC.chart.d === 259 && FITC.chart.m === 199 && JSON.stringify(FITC.need) === '{"wait":{"d":56,"m":63},"held":{"d":41,"m":49}}' &&
    JSON.stringify(FITC.pill) === '{"wait":{"d":56,"m":64},"held":{"d":41,"m":49}}' && FITC.off.d === 5 && FITC.off.m === 4 && FITC.gap.d === 4 && FITC.gap.m === 3, FITC);
  var bc = lblCopies(barOf("bitcoin"), "wait"), bcM = fitsAt("wait", "m", 100, 22);
  t("FIX Bitcoin wait (22% of a 100% bar): inside the dashed box at desktop (56.98px ≥ 56) with รอซื้อ ฿2.2 ล้าน / 22% ของ Bitcoin · phone flag = constants (43.78px < 63 → floating pill instead)",
    fitsAt("wait", "d", 100, 22) === true && bcM === false &&
    !!bc.inside && bc.inside.d === true && bc.inside.m === bcM && bc.inside.amt === "รอซื้อ ฿2.2 ล้าน" && bc.inside.pct === "22% ของ Bitcoin" &&
    !!bc.float && bc.float.d === false && bc.float.m === !bcM && bc.float.amt === "รอซื้อ ฿2.2 ล้าน" && bc.float.pct === "22% ของ Bitcoin" &&
    bc.inside.html.indexOf('<span class="ac-seg-w">รอซื้อ </span>฿2.2 ล้าน</span>') >= 0, bc);
  var fc = lblCopies(barOf("foreign"), "wait"), fh = lblCopies(barOf("foreign"), "held");
  t("FIX หุ้นต่างประเทศ wait (10% of a 40% bar ≈ 10px): floating pill รอซื้อ ฿0.4 ล้าน / 10% ของ หุ้นต่างประเทศ at both widths · no inside copy · held stays inside",
    fitsAt("wait", "d", 40, 10) === false && fitsAt("wait", "m", 40, 10) === false && fc.inside === null &&
    !!fc.float && fc.float.d && fc.float.m && fc.float.amt === "รอซื้อ ฿0.4 ล้าน" && fc.float.pct === "10% ของ หุ้นต่างประเทศ" &&
    /<div class="ac-float"><div class="ac-pill is-wait show-d show-m" data-ac-lbl="wait">/.test(barOf("foreign")) && /<div class="ac-seg ac-wait" style="height:10%"><\/div>/.test(barOf("foreign")) &&
    !!fh.inside && fh.inside.d && fh.inside.m && fh.float === null && fh.inside.amt === "฿3.6 ล้าน" && fh.inside.pct === "90% ของ หุ้นต่างประเทศ", [fc, fh]);
  var pc = lblCopies(barOf("pvd"), "held");
  t("FIX กองทุนหุ้น held (100% of a 10% bar = 25.9px / 19.9px): floating held pill ฿1.0 ล้าน / 100% ของ กองทุนหุ้น at both widths · no inside copy",
    fitsAt("held", "d", 10, 100) === false && fitsAt("held", "m", 10, 100) === false && segKinds(barOf("pvd")).join() === "held" &&
    pc.inside === null && !!pc.float && pc.float.d && pc.float.m && pc.float.amt === "฿1.0 ล้าน" && pc.float.pct === "100% ของ กองทุนหุ้น" &&
    /<div class="ac-pill is-held show-d show-m" data-ac-lbl="held">/.test(barOf("pvd")), pc);
  var TINY = JSON.parse(JSON.stringify(FIX));
  TINY.quarters["2026-Q3"].assets.forEach(function (a) { if (a.type === "thai-stock") { a.manualValue = 600000; a.snapshotValue = 600000; a.investedPercent = 50; } });
  var G = boot({ fixture: TINY }); await flush(80);
  var gThai = sliceFrom(G.html(), 'data-ac-bar="thai"', ['data-ac-bar="', "data-ac-cash"]);
  var gw = lblCopies(gThai, "wait"), gh = lblCopies(gThai, "held");
  var gStack = gThai.slice(gThai.indexOf('<div class="ac-float">'), gThai.indexOf('<div class="ac-seg '));
  t("TINY หุ้นไทย (6% bar, 50/50): both segments float at both widths · wait pill above held pill (markup order) · no inside copies",
    /data-ac-bar="thai" style="height:6%"/.test(gThai) && gw.inside === null && gh.inside === null &&
    !!gw.float && gw.float.d && gw.float.m && !!gh.float && gh.float.d && gh.float.m &&
    gStack.indexOf("ac-pill is-wait") > 0 && gStack.indexOf("ac-pill is-wait") < gStack.indexOf("ac-pill is-held") &&
    gw.float.amt === "รอซื้อ ฿0.3 ล้าน" && gw.float.pct === "50% ของ หุ้นไทย" && gh.float.amt === "฿0.3 ล้าน" && gh.float.pct === "50% ของ หุ้นไทย" && !LEAK.test(G.html()), gThai);
  var KEYS = ["bitcoin", "foreign", "pvd", "rmf", "thai"];
  function gBar(k) { return sliceFrom(G.html(), 'data-ac-bar="' + k + '"', ['data-ac-bar="', "data-ac-cash"]); }
  t("every segment of FIX and TINY shows exactly one label per width (exactly one of inside / floating carries show-d, and exactly one carries show-m)",
    KEYS.every(function (k) { return segKinds(barOf(k)).length > 0 && oneLabelPerWidth(barOf(k)) && oneLabelPerWidth(gBar(k)); }) && html().indexOf("ac-lbl-detail") < 0 && G.html().indexOf("ac-lbl-detail") < 0 && html().indexOf("is-thin") < 0,
    KEYS.map(function (k) { return k + ":" + segKinds(barOf(k)).map(function (s) { var c = lblCopies(barOf(k), s); return s + (c.inside ? " in" + (c.inside.d ? "D" : "") + (c.inside.m ? "M" : "") : "") + (c.float ? " fl" + (c.float.d ? "D" : "") + (c.float.m ? "M" : "") : ""); }).join("/"); }));
  // ใต้แท่ง % = ทั้งแท่ง (ลงทุน + รอซื้อ) ÷ ความมั่งคั่ง — ตัวเดียวกับแถบ "สัดส่วนพอร์ตตอนนี้" ของหน้า position (#ppRoot)
  //   แถบรวมตาม type: กองทุนหุ้น = เงินสำรองเลี้ยงชีพ · กองทุน RMF = RMF-จัง + RMF-ตุ๋ม (6.0 + 5.6 = 11.6 → 12)
  function stripPct(label) { var m = new RegExp(label + ' <b>([0-9.]+)%</b>').exec(ppHtml()); return m ? Number(m[1]) : NaN; }
  var stripRounded = [stripPct("Bitcoin"), stripPct("หุ้นต่างประเทศ"), stripPct("เงินสำรองเลี้ยงชีพ"), stripPct("RMF-จัง") + stripPct("RMF-ตุ๋ม"), stripPct("หุ้นไทย")].map(Math.round);
  t("under-bar % = whole bar of wealth: Bitcoin 40 · หุ้นต่างประเทศ 16 · กองทุนหุ้น 4 · กองทุน RMF 12 · หุ้นไทย 18 · equals the สัดส่วนพอร์ตตอนนี้ strip (rounded)",
    KEYS.map(function (k) { return underPct(barOf(k)); }).join() === "40,16,4,12,18" && stripPct("Bitcoin") === 40 && stripRounded.join() === "40,16,4,12,18",
    [KEYS.map(function (k) { return underPct(barOf(k)); }), stripRounded]);
  // ที่ด้านบนของกราฟ: กองป้ายลอยพ้นยอดกราฟ → class + ตัวแปร px (CSS เพิ่ม margin-top)
  //   FIX: จอกว้างไม่มี · ≤600px Bitcoin รอซื้อลอยบนแท่ง 100% → 199 + FLOAT_OFF 4 + PILL 64 − 199 = 68px
  //   แบบที่ผู้ใช้เห็นจริง (Bitcoin รอซื้อ 10% = ฿1.0 ล้าน): จอกว้าง 25.9px < 56 ลอย → 5 + 56 = 61px · ≤600px 68px
  var BIG = JSON.parse(JSON.stringify(FIX));
  BIG.quarters["2026-Q3"].assets[0].investedPercent = 90;
  var BG = boot({ fixture: BIG }); await flush(80);
  var bgw = lblCopies(sliceFrom(BG.html(), 'data-ac-bar="bitcoin"', ['data-ac-bar="', "data-ac-cash"]), "wait");
  t("chart top room: FIX → has-float-top-m only (--ac-room-m:68px) · Bitcoin wait 10% (user's case) → floats at both widths as รอซื้อ ฿1.0 ล้าน / 10% ของ Bitcoin + has-float-top-d 61px / -m 68px",
    /<div class="ac-chart has-float-top-m" data-ac-chart style="--ac-room-m:68px">/.test(html()) &&
    /<div class="ac-chart has-float-top-d has-float-top-m" data-ac-chart style="--ac-room-d:61px;--ac-room-m:68px">/.test(BG.html()) &&
    bgw.inside === null && !!bgw.float && bgw.float.d && bgw.float.m && bgw.float.amt === "รอซื้อ ฿1.0 ล้าน" && bgw.float.pct === "10% ของ Bitcoin",
    [(/<div class="ac-chart[^>]*>/.exec(html()) || [""])[0], (/<div class="ac-chart[^>]*>/.exec(BG.html()) || [""])[0], bgw]);
  // [A] Privacy Lock: จุด "ตอนนี้" + คำสถานะบอกยอดเงินสดได้ → ไม่วาด · สเกลแถบไม่ขึ้นกับเงินสด · แท่งยังวาด (privacy.js ซ่อน ฿ เอง)
  //   กรอบ 0.5–1 · เงินสด 2.1 (สูงกว่ากรอบ): ปลดล็อก สเกล = 2.1×1.1 = 2.31 ล้าน · ล็อก สเกล = 1×4/3 → ช่วงกรอบ left 37.5% width 37.5%
  var PV_DOC = JSON.parse(JSON.stringify(FIX));
  PV_DOC.allocationPlan = { cashBand: { min: 500000, max: 1000000 } };
  var PV = { locked: true, isLocked: function () { return this.locked; } };
  var L = boot({ fixture: PV_DOC, privacy: PV }); await flush(80);
  t("privacy locked: no data-ac-now marker · no status word · says ล็อกอยู่ · band scale ignores the cash · bars still render",
    !/data-ac-now/.test(L.html()) && !/ในกรอบ|ต่ำกว่ากรอบ|สูงกว่ากรอบ/.test(L.html()) && /ยังไม่จัดสรร ฿2\.1 ล้าน \(เงินสดใน Quarterly Editor\) · ล็อกอยู่/.test(L.html()) &&
    /data-ac-cash="locked"/.test(L.html()) && /ac-band-ok" style="left:37\.5%;width:37\.5%"/.test(L.html()) &&
    /data-ac-bar="bitcoin" style="height:100%"/.test(L.html()) && /฿7\.8 ล้าน<\/span><small class="ac-seg-pct">78%<span class="ac-seg-of"> ของ Bitcoin/.test(L.html()));
  PV.locked = false; L.fireDoc("portfolio-privacy-changed");
  t("unlock (portfolio-privacy-changed on document) re-renders: marker back near the right edge, label anchored inside, status สูงกว่ากรอบ",
    /class="ac-now is-right" data-ac-now="90\.91" style="left:90\.91%"><span>ตอนนี้ ฿2\.1 ล้าน<\/span>/.test(L.html()) && /· สูงกว่ากรอบ/.test(L.html()) && /data-ac-cash="above"/.test(L.html()));

  // ---------- Task 3: ตั้งกรอบเงินสด + บันทึก GET→PUT + ร่าง + Privacy (เทสต์ตามแผน คำต่อคำ บน MAIN) ----------
  t("settings opens the form prefilled in ล้าน (1 / 3)", click("data-ac-settings", "1") && /data-ac-form[\s\S]*name="min"[^>]*value="1"[\s\S]*name="max"[^>]*value="3"/.test(html()));
  // fix round 1 [1]: ตัวอย่างแบบไม่วาดทั้งใบ — ก่อน render() กล่องแถบ (data-ac-cash-wrap) ต้องเปลี่ยนแล้ว
  //   และฟอร์มต้องไม่ถูกวาดใหม่ (node เดิม · html ของ #acRoot เท่าเดิม = ช่องที่กำลังพิมพ์ไม่หายโฟกัส)
  var formNode0 = MAIN.node("data-ac-form", "1"), cashNode0 = MAIN.node("data-ac-cash-wrap", "1"), htmlBeforeTyping = html();
  setValue("min", "1.5"); setValue("max", "2");
  t("typing redraws only the cash-band box in place (no full re-render): 1.5–2 · above · same form node · #acRoot html unchanged",
    !!formNode0 && !!cashNode0 && MAIN.node("data-ac-cash-wrap", "1") === cashNode0 && /กรอบที่ตั้งไว้ 1\.5–2 ล้าน/.test(cashNode0.innerHTML) && /data-ac-cash="above"/.test(cashNode0.innerHTML) &&
    MAIN.node("data-ac-form", "1") === formNode0 && html() === htmlBeforeTyping, cashNode0 && cashNode0.innerHTML.slice(0, 80));
  W.AllocationCardPage.render();
  t("typing previews the band immediately (no PUT yet): 1.5–2 · now 2.1 above", /กรอบที่ตั้งไว้ 1\.5–2 ล้าน/.test(html()) && /data-ac-cash="above"/.test(html()) && puts.length === 0);
  // เพิ่มเติม: ข้อความของฟอร์มไม่รั่ว/ไม่แนะนำซื้อขาย/ไม่มีเงินใน title หรือ aria-label
  t("form copy: no NaN/undefined · no advisory words · no ฿ in title/aria-label", !LEAK.test(html()) && !ADVISORY_TH.test(html()) && !ADVISORY_EN.test(html()) && !/(title|aria-label)="[^"]*฿/.test(html()));
  click("data-ac-save", "1"); await flush(60);
  t("save: GET then PUT · body keeps quarters byte-identical · allocationPlan in baht with updatedAt · allocation untouched", puts.length === 1 && getsAfterSave() === 1 && JSON.stringify(puts[0].data.quarters) === JSON.stringify(FIX.quarters) && puts[0].data.allocationPlan.cashBand.min === 1500000 && puts[0].data.allocationPlan.cashBand.max === 2000000 && /^\d{4}-\d{2}-\d{2}T/.test(puts[0].data.allocationPlan.updatedAt) && JSON.stringify(puts[0].data.allocation) === JSON.stringify(FIX.allocation));
  t("after save: dispatched portfolio-allocation-saved with the new doc · card shows 1.5–2 · form closed · no draft", dispatched.some(function (e) { return e.type === "portfolio-allocation-saved" && e.detail.data.allocationPlan.cashBand.max === 2000000; }) && /กรอบที่ตั้งไว้ 1\.5–2 ล้าน/.test(html()) && !/data-ac-form/.test(html()) && store["allocation_plan_draft_v1"] === undefined);
  // fix wave [7]: ฟอร์มเปิด + พิมพ์ค่าที่ไม่ผ่าน (ต่ำ > สูง) → ตัวอย่างไม่วาดจากฟอร์ม (แถบกลับไปกรอบที่บันทึกไว้ 1.5–2
  //   ไม่ค้างตัวอย่างล่าสุด 1.8–2 และไม่ขึ้น 4–2) · ข้อความเตือนยังไม่ขึ้นจนกดบันทึก · กดแล้วขึ้นข้อความ ไม่ PUT แถบยังเป็นกรอบที่บันทึกไว้
  (function () {
    var INV7 = /กรอบต้องเป็นตัวเลข ≥ 0 และค่าต่ำต้องไม่เกินค่าสูง/;
    click("data-ac-settings", "1");
    var cash7 = MAIN.node("data-ac-cash-wrap", "1");
    setValue("min", "1.8");
    var validPreview = !!cash7 && /กรอบที่ตั้งไว้ 1\.8–2 ล้าน/.test(cash7.innerHTML);
    setValue("min", "4");
    var invalidPreview = cash7 ? cash7.innerHTML : "";
    var noMsgYet = !INV7.test(html()) && W.AllocationCardPage._state.form.error === null;
    var p7 = puts.length;
    click("data-ac-save", "1");
    t("form open + typed min > max: the band preview is NOT drawn from the invalid form (back to the stored 1.5–2) · no message until save · save shows it, no PUT",
      validPreview && /กรอบที่ตั้งไว้ 1\.5–2 ล้าน/.test(invalidPreview) && !/กรอบที่ตั้งไว้ 4–2/.test(invalidPreview) && /data-ac-cash="above"/.test(invalidPreview) &&
      noMsgYet && INV7.test(html()) && /กรอบที่ตั้งไว้ 1\.5–2 ล้าน/.test(html()) && puts.length === p7,
      [validPreview, invalidPreview.slice(0, 120), noMsgYet, puts.length - p7]);
    click("data-ac-cancel", "1");
  })();
  t("invalid band (min > max) refuses with the Thai message and no PUT", (function () { click("data-ac-settings", "1"); setValue("min", "4"); setValue("max", "2"); var n = puts.length; click("data-ac-save", "1"); return /กรอบต้องเป็นตัวเลข ≥ 0 และค่าต่ำต้องไม่เกินค่าสูง/.test(html()) && puts.length === n; })());
  click("data-ac-cancel", "1");
  // เซิร์ฟเวอร์เปลี่ยน quarters ระหว่างเปิดหน้า → PUT ต้องมีของใหม่
  serverFixture.quarters["2026-Q3"].assets[0].manualValue = 11000000; click("data-ac-settings", "1"); setValue("min", "1"); setValue("max", "3"); click("data-ac-save", "1"); await flush(60);
  t("PUT carries the server's latest quarters, not the page's copy", puts[puts.length - 1].data.quarters["2026-Q3"].assets[0].manualValue === 11000000);
  // เซิร์ฟเวอร์ตอบว่าง → ไม่ PUT
  serverEmpty = true; click("data-ac-settings", "1"); setValue("max", "2.5"); var n2 = puts.length; click("data-ac-save", "1"); await flush(60); serverEmpty = false;
  t("empty server doc → refuses to PUT, says why", puts.length === n2 && /ข้อมูลพอร์ตบน server ว่าง/.test(html()));
  // PUT ล้ม → ร่าง + retry
  failPut = true; click("data-ac-settings", "1"); setValue("min", "0.5"); setValue("max", "2"); click("data-ac-save", "1"); await flush(60);
  t("PUT failure → draft saved, error shown, retry button", JSON.parse(store["allocation_plan_draft_v1"]).plan.cashBand.min === 500000 && /data-ac-retry/.test(html()) && /บันทึกไม่สำเร็จ/.test(html()));
  failPut = false; click("data-ac-retry", "1"); await flush(60);
  t("retry PUTs the draft and clears it", puts[puts.length - 1].data.allocationPlan.cashBand.min === 500000 && store["allocation_plan_draft_v1"] === undefined);
  // เปิดหน้าใหม่ขณะมีร่าง → ใช้ร่างก่อนและส่งเอง
  var D2 = boot({ store: { allocation_plan_draft_v1: JSON.stringify({ plan: { cashBand: { min: 700000, max: 2000000 } }, savedAt: "2026-11-07T01:00:00.000Z" }) } }); await flush(100);
  t("boot with a draft: persists it once (min 0.7M), shows the band 0.7–2 and clears the draft", D2.puts.length === 1 && D2.puts[0].data.allocationPlan.cashBand.min === 700000 && /กรอบที่ตั้งไว้ 0\.7–2 ล้าน/.test(D2.html()) && D2.store["allocation_plan_draft_v1"] === undefined, [D2.puts.length]);
  // Privacy — แผนเขียน W.PortfolioPrivacy = { isLocked: true } แล้ว render() · ใช้ stub PV ของ harness แทน
  //   (ล็อกผ่าน flag แล้วยิง portfolio-privacy-changed บน document = เส้นทางเดียวกับ privacy.js จริง)
  W.PortfolioPrivacy = PV; PV.locked = true; MAIN.fireDoc("portfolio-privacy-changed"); click("data-ac-settings", "1");
  t("locked: inputs render empty with the placeholder (money masking is privacy.js's job)",/name="min"[^>]*value=""[^>]*placeholder="ล็อกอยู่/.test(html()) && !/name="min"[^>]*value="[0-9]/.test(html()));
  var nLock = puts.length;
  click("data-ac-save", "1"); await flush(60);
  t("locked + blank inputs on save keeps the stored band (no change)", puts[puts.length - 1].data.allocationPlan.cashBand.min === 500000 && puts[puts.length - 1].data.allocationPlan.cashBand.max === 2000000);
  // เพิ่มเติม: ข้อบนผ่านได้แม้ไม่ PUT (PUT ก่อนหน้าก็ 0.5–2) → ยืนยันว่าบันทึกจริงหนึ่งครั้ง และฟอร์มปิด
  t("locked save really PUT once (not skipped) and closed the form", puts.length === nLock + 1 && !/data-ac-form/.test(html()), [nLock, puts.length]);
  // ล็อกระหว่างฟอร์มเปิด → ช่องที่ prefill ไว้ถูกล้าง · ปลดล็อก → เติมค่าที่ถืออยู่กลับ
  PV.locked = false; MAIN.fireDoc("portfolio-privacy-changed"); click("data-ac-settings", "1");
  var openUnlocked = /name="min"[^>]*value="0\.5"/.test(html());
  PV.locked = true; MAIN.fireDoc("portfolio-privacy-changed");
  var lockedWhileOpen = /name="min"[^>]*value=""[^>]*placeholder="ล็อกอยู่/.test(html()) && /name="max"[^>]*value=""[^>]*placeholder="ล็อกอยู่/.test(html());
  PV.locked = false; MAIN.fireDoc("portfolio-privacy-changed");
  t("privacy toggles while the form is open: lock blanks the prefilled inputs · unlock refills them (0.5 / 2)", openUnlocked && lockedWhileOpen && /name="min"[^>]*value="0\.5"/.test(html()) && /name="max"[^>]*value="2"/.test(html()));
  click("data-ac-cancel", "1");
  PV.locked = false; delete W.PortfolioPrivacy;

  // ---------- fix round 1 ----------
  // [2] ค่าที่ไม่ใช่ตัวเลข / ติดลบ → ข้อความเตือน ไม่ GET ไม่ PUT (สถานะตั้งต้น: กรอบ 0.5–2 บันทึกแล้ว ไม่มีร่าง)
  var INVALID_RE = /กรอบต้องเป็นตัวเลข ≥ 0 และค่าต่ำต้องไม่เกินค่าสูง/;
  click("data-ac-settings", "1"); setValue("max", "abc"); var pA = puts.length; click("data-ac-save", "1"); await flush(30);
  t("max 'abc' → invalid message, no GET, no PUT", INVALID_RE.test(html()) && puts.length === pA && getsAfterSave() === 0);
  setValue("max", "2"); setValue("min", "-1"); var pB = puts.length; click("data-ac-save", "1"); await flush(30);
  t("negative min → invalid message, no GET, no PUT", INVALID_RE.test(html()) && puts.length === pB && getsAfterSave() === 0);
  click("data-ac-cancel", "1");
  // GET ตอบไม่ ok → ร่าง + บันทึกไม่สำเร็จ + ปุ่มลองใหม่ · ไม่ PUT
  failGet = true; click("data-ac-settings", "1"); setValue("min", "0.6"); var pC = puts.length; click("data-ac-save", "1"); await flush(60); failGet = false;
  t("GET ok:false → draft written (0.6) · บันทึกไม่สำเร็จ (HTTP 503) · retry button · no PUT",
    JSON.parse(store["allocation_plan_draft_v1"] || "null").plan.cashBand.min === 600000 && /บันทึกไม่สำเร็จ[^<]*HTTP 503/.test(html()) && /data-ac-retry/.test(html()) && puts.length === pC && !/data-ac-form/.test(html()));
  // GET โยน (sync และ promise ล้ม) → แบบเดียวกัน
  throwGet = true; click("data-ac-settings", "1"); setValue("min", "0.7"); var pD = puts.length; click("data-ac-save", "1"); await flush(60); throwGet = false;
  var syncThrowOk = JSON.parse(store["allocation_plan_draft_v1"] || "null").plan.cashBand.min === 700000 && /บันทึกไม่สำเร็จ/.test(html()) && /data-ac-retry/.test(html()) && puts.length === pD;
  throwGet = "reject"; click("data-ac-settings", "1"); setValue("min", "0.8"); click("data-ac-save", "1"); await flush(60); throwGet = false;
  t("GET throws (sync throw and rejected fetch) → draft written · บันทึกไม่สำเร็จ · retry button · no PUT",
    syncThrowOk && JSON.parse(store["allocation_plan_draft_v1"] || "null").plan.cashBand.min === 800000 && /บันทึกไม่สำเร็จ: ติดต่อ server ไม่สำเร็จ/.test(html()) && /data-ac-retry/.test(html()) && puts.length === pD);
  click("data-ac-retry", "1"); await flush(60);   // เก็บกวาด: ส่งร่าง 0.8–2 สำเร็จ
  var cleanOk = store["allocation_plan_draft_v1"] === undefined && puts[puts.length - 1].data.allocationPlan.cashBand.min === 800000;
  // [3] persistPlan (export) ตรวจที่ขอบการเขียนเอง: กรอบไม่ผ่าน → ข้อความ ไม่ GET ไม่ PUT ไม่เขียนร่าง
  var g3 = MAIN.gets, p3 = puts.length;
  W.AllocationCardPage.persistPlan({ cashBand: { min: 5, max: 1 } }); await flush(30);
  t("persistPlan({min 5, max 1}) called directly → no GET, no PUT, no draft · shows the invalid message",
    cleanOk && MAIN.gets === g3 && puts.length === p3 && store["allocation_plan_draft_v1"] === undefined && INVALID_RE.test(html()), [cleanOk, MAIN.gets - g3, puts.length - p3]);
  // [4] badInput: ช่องเก็บ "?" ระหว่างพิมพ์ → วาดใหม่ทั้งใบ = ช่องว่าง (value="") และค่าในฟอร์มเป็น "" (= คงค่าเดิม) · บันทึกแล้วได้ค่าเดิมฝั่งนั้น
  click("data-ac-settings", "1"); MAIN.badInput("max");
  var sentinelHeld = W.AllocationCardPage._state.form.max === "?";
  W.AllocationCardPage.render();
  var blankShown = /name="max"[^>]*value=""/.test(html()) && W.AllocationCardPage._state.form.max === "" && /name="min"[^>]*value="0\.8"/.test(html());
  setValue("min", "0.9"); var p4 = puts.length; click("data-ac-save", "1"); await flush(60);
  t("badInput sentinel: full re-render shows value=\"\" and resets it to blank → save keeps the stored max (2) with the new min (0.9)",
    sentinelHeld && blankShown && puts.length === p4 + 1 && puts[puts.length - 1].data.allocationPlan.cashBand.min === 900000 && puts[puts.length - 1].data.allocationPlan.cashBand.max === 2000000,
    [sentinelHeld, blankShown, puts.length - p4]);

  // ---------- fix wave ----------
  // [4] คู่ % ที่ปัดแยกกันแล้วได้ 101 — ตรวจจาก html ล้วน (ค่าที่คิดมือ ไม่อ่านเอนจิน)
  //   หุ้นต่างประเทศ: US 2,000,000 @87.5 → ลงทุน 87.5% / รอซื้อ 12.5% → 88% / 12% (ไม่ใช่ 13%) · ไม่มี PVD (แท่งกองทุนหุ้นว่าง)
  //     แท่ง 2 ล้าน บนแกน 10 ล้าน = 20% → รอซื้อ 259 × 0.2 × 0.125 = 6.5px → ป้ายลอย (v2) · ลงทุน 45.3px ≥ 41 → ในส่วน (จอกว้าง)
  //   กองทุน RMF: 8,000,000 @62.5 → 62.5% / 37.5% → 63% / 37% (ไม่ใช่ 38%) · ทั้งสองส่วนอยู่ในแท่ง (จอกว้าง 129.5 / 77.7px)
  //   ช่องภาพรวม: ลงทุน 19,875,000 / ความมั่งคั่ง 25,000,000 = 79.5% → 80% · เงินสดทั้งหมด 20.5% → 20% (ไม่ใช่ 21%)
  var ROUND = { currentQuarter: "2026-Q3", quarters: { "2026-Q3": { key: "2026-Q3", assets: [
    A("bitcoin", "Bitcoin", 10000000, 100),
    A("foreign-stock", "US", 2000000, 87.5),
    A("rmf-jang", "RMF-จัง", 8000000, 62.5),
    A("thai-stock", "หุ้นไทย", 3125000, 100),
    A("cash", "เงินสด", 1875000, 0)
  ] } } };
  var RD = boot({ fixture: ROUND }); await flush(80);
  var rdForeign = sliceFrom(RD.html(), 'data-ac-bar="foreign"', ['data-ac-bar="', "data-ac-cash"]);
  var rdRmf = sliceFrom(RD.html(), 'data-ac-bar="rmf"', ['data-ac-bar="', "data-ac-cash"]);
  var rfw = lblCopies(rdForeign, "wait"), rfh = lblCopies(rdForeign, "held"), rrw = lblCopies(rdRmf, "wait"), rrh = lblCopies(rdRmf, "held");
  t("bar % pairs sum to 100 when rounding bites: foreign 87.5/12.5 → 88% in-bar + 12% on the floating pill · RMF 62.5/37.5 → 63% / 37%",
    /ac-held" style="height:87\.5%"><div class="ac-in show-d" data-ac-lbl="held"><span class="ac-seg-amt">[^<]*<\/span><small class="ac-seg-pct">88%<span class="ac-seg-of"> ของ หุ้นต่างประเทศ/.test(rdForeign) &&
    !!rfh.inside && rfh.inside.pct === "88% ของ หุ้นต่างประเทศ" && !!rfh.float && rfh.float.pct === "88% ของ หุ้นต่างประเทศ" &&
    !!rfw.float && rfw.float.d && rfw.float.m && /^รอซื้อ ฿[0-9.]+ ล้าน$/.test(rfw.float.amt) && rfw.float.pct === "12% ของ หุ้นต่างประเทศ" && !/13%/.test(rdForeign) &&
    /ac-wait" style="height:37\.5%"><div class="ac-in[^"]*" data-ac-lbl="wait"><span class="ac-seg-amt"><span class="ac-seg-w">รอซื้อ <\/span>฿3\.0 ล้าน<\/span><small class="ac-seg-pct">37%</.test(rdRmf) &&
    !!rrw.inside && rrw.inside.d && rrw.inside.pct === "37% ของ กองทุน RMF" &&
    /ac-held" style="height:62\.5%"><div class="ac-in show-d show-m" data-ac-lbl="held"><span class="ac-seg-amt">฿5\.0 ล้าน<\/span><small class="ac-seg-pct">63%</.test(rdRmf) &&
    !!rrh.inside && rrh.inside.pct === "63% ของ กองทุน RMF" && !/38%/.test(rdRmf),
    [rdForeign.slice(0, 700), rdRmf.slice(0, 500)]);
  t("tile % pair sums to 100: ลงทุน 79.5% → 80% · เงินสดทั้งหมด 20.5% → 20% (not 21%)",
    /data-ac-kpi="invested"[\s\S]*?฿19\.9 ล้าน <span class="ac-kpi-p">80% ของความมั่งคั่ง<\/span>/.test(RD.html()) &&
    /data-ac-kpi="cash"[\s\S]*?฿5\.1 ล้าน <span class="ac-kpi-p">20% ของความมั่งคั่ง<\/span>/.test(RD.html()) && !/21% ของความมั่งคั่ง/.test(RD.html()),
    (/<div class="ac-kpis">[\s\S]*?data-ac-chart/.exec(RD.html()) || [""])[0].slice(0, 400));
  // ก้อนว่าง (ROUND ไม่มี provident-fund) = 0% ของความมั่งคั่ง ไม่ใช่ "— ของความมั่งคั่ง"
  var rdPvd = sliceFrom(RD.html(), 'data-ac-bar="pvd"', ['data-ac-bar="', "data-ac-cash"]);
  t("empty class label reads 0% ของความมั่งคั่ง (not —)", /ac-bar is-empty/.test(rdPvd) && /<b>กองทุนหุ้น<\/b>0% ของความมั่งคั่ง/.test(rdPvd) && rdPvd.indexOf("— ของความมั่งคั่ง") < 0, rdPvd.slice(0, 300));
  // [5] หน้า position คำนวณไม่ได้ด้วยเหตุอื่น (reason "error") ≠ ไม่มีข้อมูล → บอกว่าโหลดไม่สำเร็จ ไม่ใช่ "ยังไม่มีข้อมูล"
  var ER = boot(); await flush(80);
  ER.win.dispatchEvent(new CustomEvent("portfolio-position-rendered", { detail: { R: { available: false, reason: "error" }, data: null } }));
  t("R.available false with reason 'error' → โหลดข้อมูลไม่สำเร็จ — ลองกด Load Latest Data (not the no-data text) · no bars",
    /โหลดข้อมูลไม่สำเร็จ — ลองกด Load Latest Data/.test(ER.html()) && !/ยังไม่มีข้อมูลใน Quarterly Editor/.test(ER.html()) && !/data-ac-bar/.test(ER.html()), ER.html().slice(0, 160));

  finish();
})().catch(function (e) {
  fail++;
  console.error("  ✗ เทสต์ล้มกลางทาง: " + (e && e.stack || e));
  finish();
});
