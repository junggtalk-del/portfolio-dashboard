"use strict";
// ============================================================
// PORTFOLIO POSITION (/portfolio) — การ์ดแก้ว (glass-cards.css) บนสามส่วนของหน้า
//   node scripts/portfolio-glass-test.js
//
// บูตหน้าเต็มใน VM (สคริปต์ตามลำดับที่ portfolio.html โหลดจริง · fetch ปลอม · DOM ปลอมของ #acRoot / #aaRoot ที่ผูก handler ได้)
// แล้วล็อก:
//   · การ์ด → สถานะต้นทาง → tone (สถานะที่หน้าคำนวณอยู่แล้วเท่านั้น · ไม่มีสถานะ → gc-neutral):
//       #ppRoot  ความมั่งคั่งรวม (.pp-stat แรก)  แถว record.whole ของไตรมาสที่แสดง G.status  ahead → calm · on → normal · behind → warning ·
//                                               ไม่มีสถานะ → neutral · ไม่มี engine / เทียบไม่ได้ → QoQ (pp-up → calm · pp-down → danger · ไม่มี → neutral)
//                ลงทุนจริง · เงินสด · แถบลงทุน/เงินสด · สัดส่วนพอร์ตตอนนี้ · ข้อความว่าง → neutral
//       #acRoot  การ์ด Asset allocation (.ac-main) → neutral (สีแท่งประเภทสินทรัพย์คงเดิม)
//                แถบเงินสด (.ac-cash) cashBand.status  within → calm · below / above → warning · ล็อกอยู่ → neutral (สีบอกสถานะ = บอกยอดเงินสด)
//       #aaRoot  ประโยคสรุป (.aa-headline) headline().tone · การ์ดเป้าปีนี้ (.aa-stat-target) TV.status · การ์ดพอร์ต (.aa-card) P.status
//                                               ahead → calm · on → normal · behind → warning · no-target / no-data → neutral
//                ยังไม่จัด (.aa-stat ที่ 3) · กล่องยังจัดไม่ครบ (.aa-unassigned)  มีรายการ → warning · ไม่มี → neutral
//                เกษียณ (.aa-headline ใน #aaRetire)  verdict comfortable → calm · tight → normal · short → warning
//                ช่วงที่ 1 (.aa-phase แรก)  เงินพอ (is-ok) → calm · ยังขาด → warning · ช่วงที่ 2 → neutral
//                แถวแบ่งสัดส่วน (.aa-arow)  aa-sum is-ok → calm · is-warn → warning · is-bad → danger
//                แถบบันทึก (.aa-savebar)  saved → calm · failed → danger · อื่น ๆ → neutral · ป้ายเตือน (.aa-banner) → warning
//                อื่น ๆ (มูลค่ารวม · จัดแล้ว · ไตรมาส · จากนี้ · กราฟ · ช่องตั้งค่า · ตาราง · คุณภาพข้อมูล · วิธีคำนวณ) → neutral
//   · ไม่มีการ์ดแก้วซ้อนการ์ดแก้ว · ทุกการ์ดมี tone เดียว · หัว section อยู่บนพื้นหน้า (gc-section-h) · ตัวเลขส่วนหัว gc-num
//   · ชิ้นกลาง: ตาราง gc-table ใน gc-table-wrap (โฟกัสได้ + aria-label ไม่มีเงิน) · ช่องกรอก gc-field · ปุ่ม gc-btn / gc-btn-ghost
//   · Privacy Lock: maskText ของ privacy.js ทุก text node แล้วไม่เหลือยอดเงิน · ไม่มีเงินใน title / aria-label ·
//     ช่องเงิน (ต้องใช้เงินเดือนละ · เติมเงินไตรมาสละ · กรอบเงินสด) ตอนล็อก = value "" + placeholder · ไม่บันทึกช่องว่างตอนล็อก ·
//     ปลดล็อก → ค่ากลับมา · แถบเงินสดตอนล็อกไม่มีจุด "ตอนนี้" และเป็น neutral
//   · CSS / HTML: glass-cards.css ก่อนไฟล์ของหน้า · โทเคน mc ในการ์ด = หมึกแก้ว · ผิวการ์ดเก่าถูกลบ · สีที่มีความหมายคงไว้ · เวอร์ชัน bump
// ============================================================
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var ROOT = path.join(__dirname, "..");
var PUB = path.join(ROOT, "public");
function read(f) { return fs.readFileSync(path.join(PUB, f), "utf8"); }
var maskText = require("../public/privacy.js").maskText;

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
function flush(ms) { return new Promise(function (r) { setTimeout(r, ms == null ? 60 : ms); }); }

var TONES = ["gc-calm", "gc-normal", "gc-warning", "gc-danger", "gc-neutral"];
var GC_V = "20261121-gc-2";
var V = { ppCss: "20261122-pp-15", aaCss: "20261122-aa-11", ppJs: "20261122-pp-17", acJs: "20261125-ac-4", aaJs: "20261125-aa-15" };
var ADVISORY = /ควรซื้อ|ควรขาย|น่าซื้อ|น่าขาย|น่าเข้า|แนะนำซื้อ|จุดเข้า|ตัดขาดทุน/;

// ---------------------------------------------------------------- fixture (ชุดเดียวกับ asset-allocation-view-test + กรอบเงินสด)
function qKey(back) {
  var now = new Date();
  var idx = now.getFullYear() * 4 + Math.floor(now.getMonth() / 3) - back;
  return Math.floor(idx / 4) + "-Q" + ((idx % 4 + 4) % 4 + 1);
}
function row(type, name, value, netFlow) {
  var a = { id: type + name + value, type: type, name: name, manualValue: value, snapshotValue: value, investedPercent: type === "cash" ? 0 : 100 };
  if (netFlow !== undefined) a.netFlow = netFlow;
  return a;
}
function fixture(plan) {
  var F = { currentQuarter: qKey(0), quarters: {}, allocation: {
    version: 1,
    map: { "cash::เงินสด": "short", "rmf-jang::RMF-จัง": "mid", "thai-stock::หุ้นไทย": "mid" },
    ports: { short: { expectedReturnPct: 3 }, mid: { expectedReturnPct: 6 }, long: { expectedReturnPct: null } },
    monthlyExpense: 50000,
    retirement: { inflationPct: 3, workYears: 20, retireYears: 25, annualContribution: 240000, currentAge: 42 },
    updatedAt: "2026-09-01T00:00:00.000Z"
  }, allocationPlan: plan || { cashBand: { min: 1000000, max: 3000000 }, updatedAt: "2026-11-01T00:00:00.000Z" } };
  F.quarters[qKey(3)] = { key: qKey(3), assets: [row("cash", "เงินสด", 300000), row("rmf-jang", "RMF-จัง", 100000)] };
  F.quarters[qKey(2)] = { key: qKey(2), assets: [row("cash", "เงินสด", 300000), row("rmf-jang", "RMF-จัง", 100000)] };
  F.quarters[qKey(1)] = { key: qKey(1), assets: [row("cash", "เงินสด", 240000, -60000), row("rmf-jang", "RMF-จัง", 100000), row("thai-stock", "หุ้นไทย", 200000)] };
  F.quarters[qKey(0)] = { key: qKey(0), assets: [row("cash", "เงินสด", 250000, 0), row("rmf-jang", "RMF-จัง", 100000), row("thai-stock", "หุ้นไทย", 210000), row("bitcoin", "Bitcoin", 50000)] };
  return F;
}

// ---------------------------------------------------------------- scripts ตามลำดับของ portfolio.html
var HTML = read("portfolio.html");
var SKIP = ["theme.js", "api-auth.js", "privacy.js", "app-navigation.js", "scoring.js", "data-snapshot.js", "big-cache.js"];
var SCRIPTS = (function () {
  var out = [], re = /<script src="\/([A-Za-z0-9._-]+\.js)/g, m;
  while ((m = re.exec(HTML)) !== null) if (SKIP.indexOf(m[1]) < 0) out.push(m[1]);
  return out;
})();
// สอง realm ใน VM: array ที่สคริปต์สร้างต้องผ่าน instanceof Array ของ host (แบบ allocation-card-test)
var ONE_REALM_ARRAY = new Proxy(Array, {
  get: function (target, key, receiver) {
    if (key === Symbol.hasInstance) return function (x) { return Array.isArray(x); };
    return Reflect.get(target, key, receiver);
  }
});

// ---------------------------------------------------------------- DOM ปลอม
// root.querySelectorAll("[attr]") → node ปลอมหนึ่งตัวต่อแท็กที่มี attr นั้นใน innerHTML (ทุกตัว ไม่ตัดซ้ำ) · attribute จากแท็กจริง ·
//   .value จาก value="…" · addEventListener เก็บที่ node · เขียน innerHTML ใหม่ = node ชุดใหม่ (ของเดิมหลุด)
function parseAttrs(tag) {
  var out = {}, re = /\s([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:="([^"]*)")?/g, m;
  while ((m = re.exec(tag)) !== null) out[m[1]] = m[2] === undefined ? "" : m[2];
  return out;
}
function unesc(s) { return String(s).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"); }
function plainEl(id) {
  return {
    id: id || "", innerHTML: "", value: "", style: {}, attrs: {}, hidden: false,
    appendChild: function () {}, setAttribute: function (k, v) { this.attrs[k] = v; }, getAttribute: function (k) { return this.attrs[k] || null; },
    addEventListener: function () {}, removeEventListener: function () {}, querySelector: function () { return null; }, querySelectorAll: function () { return []; },
    closest: function () { return null; }, focus: function () {}, contains: function () { return false; },
    classList: { add: function () {}, remove: function () {}, contains: function () { return false; }, toggle: function () {} }
  };
}
function mkRoot(id) {
  var el = plainEl(id), h = "", nodes = [];
  function build(sel) {
    var m = /^\[([a-z-]+)\]$/.exec(sel);
    if (!m) return [];
    var attr = m[1], out = [], re = /<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, mm;
    while ((mm = re.exec(h)) !== null) {
      var a = parseAttrs(mm[0]);
      if (!Object.prototype.hasOwnProperty.call(a, attr)) continue;
      var at = mm.index;
      var found = null;
      for (var i = 0; i < nodes.length; i++) if (nodes[i]._at === at) { found = nodes[i]; break; }
      if (!found) {
        found = {
          _at: at, _h: {}, tagName: mm[1].toUpperCase(), attributes: a, value: a.value !== undefined ? unesc(a.value) : "", disabled: "disabled" in a,
          innerHTML: "", hidden: false, style: {}, validity: {}, placeholder: a.placeholder !== undefined ? unesc(a.placeholder) : "",
          getAttribute: function (k) { return Object.prototype.hasOwnProperty.call(this.attributes, k) ? unesc(this.attributes[k]) : null; },
          setAttribute: function (k, v) { this.attributes[k] = String(v); },
          addEventListener: function (ev, fn) { this._h[ev] = fn; }, removeEventListener: function () {}, focus: function () {},
          querySelector: function () { return null; }, querySelectorAll: function () { return []; }
        };
        nodes.push(found);
      }
      out.push(found);
    }
    return out;
  }
  Object.defineProperty(el, "innerHTML", { get: function () { return h; }, set: function (v) { h = String(v); nodes = []; } });
  el.querySelectorAll = function (sel) { return build(sel); };
  el.querySelector = function (sel) { var l = build(sel); return l.length ? l[0] : null; };
  el.nodes = function () { return nodes; };
  return el;
}

function boot(o) {
  o = o || {};
  var winL = {}, docL = {}, puts = [], dispatched = [], els = {};
  var server = JSON.parse(JSON.stringify(o.fixture || fixture()));
  var store = o.store || {};
  var PV = { locked: !!o.locked };
  var flags = { failPut: !!o.failPut };
  var doc = {
    readyState: "complete", hidden: false, activeElement: null, createElement: function () { return plainEl(); },
    addEventListener: function (ty, fn) { (docL[ty] = docL[ty] || []).push(fn); }, removeEventListener: function () {},
    getElementById: function (id) { if (!els[id]) els[id] = mkRoot(id); return els[id]; },
    querySelector: function () { return null; }, querySelectorAll: function () { return []; },
    body: plainEl("body"), documentElement: plainEl("html")
  };
  function respond(ok, status, body) { return Promise.resolve({ ok: ok, status: status, json: function () { return Promise.resolve(body); } }); }
  var win = {
    document: doc, location: { search: "", pathname: "/portfolio", href: "http://localhost/portfolio" },
    history: { pushState: function () {}, replaceState: function () {} },
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); }, removeItem: function (k) { delete store[k]; }
    },
    addEventListener: function (ty, fn) { (winL[ty] = winL[ty] || []).push(fn); }, removeEventListener: function () {},
    dispatchEvent: function (e) { dispatched.push(e); (winL[e && e.type] || []).slice().forEach(function (fn) { fn(e); }); return true; },
    CustomEvent: function (type, init) { this.type = type; this.detail = init ? init.detail : undefined; },
    fetch: function (url, init) {
      var u = String(url);
      if (/^\/api\/portfolio(\?|$)/.test(u)) {
        if (init && init.method === "PUT") {
          var body = JSON.parse(init.body);
          puts.push(body);
          if (flags.failPut) return respond(false, 500, { error: "boom" });
          Object.keys(server).forEach(function (k) { delete server[k]; });
          Object.keys(body.data || {}).forEach(function (k) { server[k] = JSON.parse(JSON.stringify(body.data[k])); });
          return respond(true, 200, { ok: true });
        }
        return respond(true, 200, { data: JSON.parse(JSON.stringify(server)) });
      }
      return respond(false, 404, {});
    },
    PortfolioPrivacy: { isLocked: function () { return PV.locked; } },
    console: console, Math: Math, JSON: JSON, Date: Date, Number: Number, String: String,
    Object: Object, Array: ONE_REALM_ARRAY, Boolean: Boolean, isFinite: isFinite, isNaN: isNaN,
    parseInt: parseInt, parseFloat: parseFloat, Promise: Promise, RegExp: RegExp, Error: Error, TypeError: TypeError,
    encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent,
    setTimeout: setTimeout, clearTimeout: clearTimeout, Intl: Intl
  };
  win.window = win; win.self = win; win.globalThis = win;
  var ctx = vm.createContext(win);
  var loaded = true;
  SCRIPTS.forEach(function (f) {
    try { vm.runInContext(read(f), ctx, { filename: f }); }
    catch (e) { loaded = false; console.error("   โหลด " + f + " ไม่ได้: " + e.message); }
  });
  var realAA = win.AssetAllocation && win.AssetAllocation.compute;
  var realPP = win.PortfolioPosition && win.PortfolioPosition.compute;
  var I = {
    win: win, els: els, puts: puts, store: store, PV: PV, flags: flags, dispatched: dispatched, loaded: loaded,
    pp: function () { return els.ppRoot ? els.ppRoot.innerHTML : ""; },
    ac: function () { return els.acRoot ? els.acRoot.innerHTML : ""; },
    aa: function () { return els.aaRoot ? els.aaRoot.innerHTML : ""; },
    all: function () { return I.pp() + I.ac() + I.aa(); },
    fireDoc: function (ty) { (docL[ty] || []).slice().forEach(function (fn) { fn({ type: ty }); }); },
    // ผลของ engine ที่หน้าอ่าน (record.whole · ports · retirement …) ถูกแก้ก่อนถึงหน้า — ทดสอบการ map สถานะ → tone ทีละกรณี
    patchAA: function (fn) {
      win.AssetAllocation.compute = function () {
        var out = realAA.apply(this, arguments);
        if (fn && out && out.available) fn(out);
        return out;
      };
    },
    patchPP: function (fn) {
      win.PortfolioPosition.compute = function () {
        var out = realPP.apply(this, arguments);
        if (fn && out && out.available) fn(out);
        return out;
      };
    },
    noAA: function () { win.AssetAllocation = null; },
    renderAll: function () {
      if (win.PortfolioPositionPage) win.PortfolioPositionPage.render();
      if (win.AssetAllocationPage) win.AssetAllocationPage.render();
    }
  };
  return I;
}

// ---------------------------------------------------------------- อ่านการ์ดจาก HTML
function cards(h) {
  var out = [], re = /<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, m;
  while ((m = re.exec(h)) !== null) {
    var a = parseAttrs(m[0]);
    if (a["class"] === undefined) continue;
    var cls = a["class"].split(/\s+/).filter(Boolean);
    if (cls.indexOf("gc-card") >= 0) out.push({ tag: m[1].toLowerCase(), cls: cls, attrs: a, raw: m[0], at: m.index });
  }
  return out;
}
function toneOf(c) {
  if (!c) return "MISSING";
  var tt = c.cls.filter(function (k) { return TONES.indexOf(k) >= 0; });
  return tt.length === 1 ? tt[0] : (tt.length ? "MULTI:" + tt.join("+") : "NONE");
}
function cardsBy(h, k) { return cards(h).filter(function (c) { return c.cls.indexOf(k) >= 0; }); }
function tonesBy(h, k) { return cardsBy(h, k).map(toneOf); }
function oneTone(h) { return cards(h).filter(function (c) { return toneOf(c).indexOf("gc-") !== 0; }).map(function (c) { return c.raw.slice(0, 90); }); }
var VOID = { input: 1, br: 1, img: 1, meta: 1, link: 1, hr: 1, col: 1, source: 1, wbr: 1 };
function nestedGlass(h) {
  var stack = [], bad = [], re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, m;
  while ((m = re.exec(h)) !== null) {
    var tag = m[2].toLowerCase();
    if (m[1] === "/") {
      for (var i = stack.length - 1; i >= 0; i--) if (stack[i].tag === tag) { stack.length = i; break; }
      continue;
    }
    if (VOID[tag] || /\/\s*$/.test(m[3])) continue;
    var glass = /(^|\s)class="[^"]*\bgc-card\b/.test(m[3]);
    if (glass && stack.some(function (s) { return s.glass; })) bad.push(m[0].slice(0, 80));
    stack.push({ tag: tag, glass: glass });
  }
  return bad;
}
// ข้อความที่ผู้ใช้เห็นหลัง privacy.js ซ่อน: maskText ทีละ text node (ตัดแท็กออก)
function maskedText(h) {
  return h.split(/<[^>]*>/).map(function (s) { return maskText(s); }).join("\n");
}
var MONEY_TXT = /฿\s?[−-]?\d|\d{1,3}(?:,\d{3})+|\d\s?(?:บาท|THB)/;
function moneyAttrs(h) {
  var out = [], re = /\s(title|aria-label)="([^"]*)"/g, m;
  while ((m = re.exec(h)) !== null) if (MONEY_TXT.test(m[2])) out.push(m[1] + "=" + m[2].slice(0, 60));
  return out;
}
function inputs(h) {
  var out = [], re = /<input\b[^>]*>/g, m;
  while ((m = re.exec(h)) !== null) out.push(parseAttrs(m[0]));
  return out;
}

(async function main() {
  // ================================================================ 0 · โหลด
  var A = boot(); await flush(120);
  t("โหลดสคริปต์ครบตามที่ portfolio.html โหลด (" + SCRIPTS.join(", ") + ")", A.loaded && !!A.win.PortfolioPositionPage && !!A.win.AllocationCardPage && !!A.win.AssetAllocationPage);
  t("ทั้งสามส่วนวาดแล้ว", A.pp().length > 300 && A.ac().length > 300 && A.aa().length > 3000, [A.pp().length, A.ac().length, A.aa().length]);

  // ================================================================ 1 · #ppRoot
  console.log("== 1 · Portfolio Position (#ppRoot) ==");
  var pp = A.pp();
  var ppStats = cardsBy(pp, "pp-stat");
  t("pp: ทุกการ์ดเป็นแก้ว tone เดียว · ไม่ซ้อนกัน", cards(pp).length >= 5 && oneTone(pp).length === 0 && nestedGlass(pp).length === 0, { n: cards(pp).length, bad: oneTone(pp), nested: nestedGlass(pp) });
  t("pp: 3 ช่องสรุปเป็นการ์ดแก้ว (gc-tile) · ลงทุนจริง + เงินสด = neutral", ppStats.length === 3 && ppStats.every(function (c) { return c.cls.indexOf("gc-tile") >= 0; }) &&
    toneOf(ppStats[1]) === "gc-neutral" && toneOf(ppStats[2]) === "gc-neutral", ppStats.map(function (c) { return c.cls.join(" "); }));
  t("pp: แถบลงทุน/เงินสด (.pp-invstrip) และ สัดส่วนพอร์ตตอนนี้ (.pp-block) = neutral",
    tonesBy(pp, "pp-invstrip").join() === "gc-neutral" && tonesBy(pp, "pp-block").join() === "gc-neutral", [tonesBy(pp, "pp-invstrip"), tonesBy(pp, "pp-block")]);
  t("pp: หัวหน้า (h1 + บรรทัดไตรมาส) อยู่บนพื้นหน้า (gc-section-h) ไม่ใช่การ์ด", /class="pp-hero-head gc-section-h"/.test(pp) && !/<section class="pp-hero[^"]*gc-card/.test(pp));
  t("pp: ตัวเลขส่วนหัว 3 ตัวเป็น gc-num", (pp.match(/class="pp-stat-n gc-num[^"]*"/g) || []).length === 3, (pp.match(/class="pp-stat-n[^"]*"/g) || []));
  // สถานะเทียบเป้าของแถวไตรมาสที่แสดง (record.whole) — ตัวเดียวกับคำ เกินเป้า / ตามเป้า / ต่ำกว่าเป้า ในบล็อก 3 บรรทัด
  function wealthWith(patchRow) {
    A.patchAA(function (out) { out.record.whole.rows.forEach(function (r) { if (r.key === qKey(0)) patchRow(r); }); });
    A.win.PortfolioPositionPage.render();
    return toneOf(cardsBy(A.pp(), "pp-stat")[0]);
  }
  var wBehind = toneOf(ppStats[0]);
  t("pp: fixture จริง (ไม่รวมเงินเติม ต่ำกว่าเป้า) → ความมั่งคั่งรวม = warning", wBehind === "gc-warning" && /pp-grow-st is-behind/.test(pp), wBehind);
  t("pp: G.status ahead → calm", wealthWith(function (r) { r.status = "ahead"; }) === "gc-calm");
  t("pp: G.status on → normal", wealthWith(function (r) { r.status = "on"; }) === "gc-normal");
  t("pp: G.status behind → warning", wealthWith(function (r) { r.status = "behind"; }) === "gc-warning");
  t("pp: คำนวณไม่ได้ (real null · no-data) → neutral", wealthWith(function (r) { r.real = null; r.status = "no-data"; }) === "gc-neutral");
  t("pp: ไม่มีเป้า (target null · ไม่มีคำสถานะ) → neutral", wealthWith(function (r) { r.target = null; r.status = null; }) === "gc-neutral");
  A.patchAA(null);
  // ไม่มี engine ของ Asset Allocation → บรรทัด QoQ เดิม (pp-up / pp-down)
  var aaKeep = A.win.AssetAllocation;
  A.noAA(); A.win.PortfolioPositionPage.render();
  t("pp: ไม่มี engine → QoQ ขึ้น (pp-up) → calm", toneOf(cardsBy(A.pp(), "pp-stat")[0]) === "gc-calm" && /pp-stat-s pp-up">QoQ/.test(A.pp()), toneOf(cardsBy(A.pp(), "pp-stat")[0]));
  A.patchPP(function (R) { R.totals.qoq = { thb: -45000, pct: -7.4 }; }); A.win.PortfolioPositionPage.render();
  t("pp: QoQ ลง (pp-down) → danger", toneOf(cardsBy(A.pp(), "pp-stat")[0]) === "gc-danger" && /pp-stat-s pp-down">QoQ/.test(A.pp()));
  A.patchPP(function (R) { R.totals.qoq = null; }); A.win.PortfolioPositionPage.render();
  t("pp: ไม่มีไตรมาสก่อนหน้า → neutral", toneOf(cardsBy(A.pp(), "pp-stat")[0]) === "gc-neutral" && /ยังไม่มีไตรมาสก่อนหน้า/.test(A.pp()));
  A.patchPP(null); A.win.AssetAllocation = aaKeep; A.win.PortfolioPositionPage.render();
  t("pp: แถบลงทุน: ราง + เนื้อ + คำบรรยายอยู่ในการ์ดแถบ · title เป็น % ล้วน", /<div class="pp-invstrip gc-card gc-tile gc-neutral"><div class="pp-invbar" title="ลงทุนจริง [\d.]+% · เงินสด [\d.]+%"><i style="width:[\d.]+%"><\/i><\/div><div class="pp-invbar-cap">/.test(A.pp()));
  t("pp: สีแท่งประเภทสินทรัพย์คงเดิม (style background ของ bucket)", /<div class="pp-alloc"><i style="width:[\d.]+%;background:#/.test(A.pp()));

  // ================================================================ 2 · #acRoot
  console.log("== 2 · Asset allocation card (#acRoot) ==");
  var ac = A.ac();
  t("ac: section.ac-card คงคลาส + data-ac-card · เป็นตัวห่อ (ไม่ใช่แก้ว) · การ์ดหลัก .ac-main = neutral", /<section class="ac-card" data-ac-card>/.test(ac) && tonesBy(ac, "ac-main").join() === "gc-neutral", tonesBy(ac, "ac-main"));
  t("ac: ไม่ซ้อน · tone เดียว", nestedGlass(ac).length === 0 && oneTone(ac).length === 0, { nested: nestedGlass(ac), bad: oneTone(ac) });
  t("ac: fixture จริง (ยังไม่จัดสรร ฿0.25 ล้าน < กรอบ 1–3) → แถบเงินสด below → warning", /data-ac-cash="below"/.test(ac) && tonesBy(ac, "ac-cash").join() === "gc-warning", tonesBy(ac, "ac-cash"));
  t("ac: แถบเงินสดอยู่ใน data-ac-cash-wrap (วาดใหม่ขณะพิมพ์ได้ tone ใหม่ด้วย) · foot อยู่หลังการ์ด", /<div class="ac-cash-wrap" data-ac-cash-wrap="1"><div class="ac-cash gc-card gc-[a-z]+" data-ac-cash="below">/.test(ac) &&
    ac.indexOf('class="ac-foot"') > ac.indexOf("data-ac-cash-wrap"));
  function cashToneWith(plan) {
    A.dispatched.length = 0;
    A.win.dispatchEvent(new A.win.CustomEvent("portfolio-allocation-saved", { detail: { data: { allocationPlan: { cashBand: plan, updatedAt: "2026-11-21T00:00:00.000Z" } } } }));
    var h = A.ac();
    return { tone: tonesBy(h, "ac-cash").join(), status: (/data-ac-cash="([a-z]+)"/.exec(h) || [])[1] };
  }
  var cw = cashToneWith({ min: 100000, max: 300000 });
  t("ac: within → calm", cw.status === "within" && cw.tone === "gc-calm", cw);
  var ca = cashToneWith({ min: 0, max: 200000 });
  t("ac: above → warning", ca.status === "above" && ca.tone === "gc-warning", ca);
  var cb = cashToneWith({ min: 1000000, max: 3000000 });
  t("ac: below → warning", cb.status === "below" && cb.tone === "gc-warning", cb);
  cashToneWith({ min: 100000, max: 300000 });
  A.PV.locked = true; A.fireDoc("portfolio-privacy-changed");
  t("ac: ล็อกอยู่ → neutral (สีสถานะบอกยอดเงินสดได้) · ไม่มีจุดตอนนี้", tonesBy(A.ac(), "ac-cash").join() === "gc-neutral" && /data-ac-cash="locked"/.test(A.ac()) && !/data-ac-now/.test(A.ac()), tonesBy(A.ac(), "ac-cash"));
  A.PV.locked = false; A.fireDoc("portfolio-privacy-changed");
  t("ac: ปลดล็อก → calm กลับมา", tonesBy(A.ac(), "ac-cash").join() === "gc-calm");
  t("ac: ปุ่มตั้งกรอบเงินสด = gc-btn gc-btn-ghost (คง ac-settings + data hook)", /<button type="button" class="ac-settings gc-btn gc-btn-ghost" data-ac-settings="1" aria-expanded="false">ตั้งกรอบเงินสด<\/button>/.test(A.ac()));
  var acSettings = A.els.acRoot.querySelector("[data-ac-settings]");
  acSettings._h.click({ preventDefault: function () {} });
  var acf = A.ac();
  t("ac: ฟอร์มอยู่ในการ์ดหลัก (ก่อนแถบเงินสด) · ช่อง = gc-field · บันทึก = gc-btn · ยกเลิก = gc-btn gc-btn-ghost",
    acf.indexOf("data-ac-form") > acf.indexOf('class="ac-main') && acf.indexOf("data-ac-form") < acf.indexOf("data-ac-cash-wrap") && nestedGlass(acf).length === 0 &&
    (acf.match(/<input class="gc-field" type="number" name="(min|max)"/g) || []).length === 2 &&
    /class="ac-btn is-primary gc-btn" data-ac-save="1"/.test(acf) && /class="ac-btn gc-btn gc-btn-ghost" data-ac-cancel="1"/.test(acf));
  A.els.acRoot.querySelector("[data-ac-cancel]")._h.click({});
  t("ac: สีแท่งที่มีความหมายคงเดิม (ลงทุนแล้ว ac-held · รอซื้อ ac-wait · ป้าย show-d/show-m)", /class="ac-seg ac-held"/.test(A.ac()) && /class="ac-in show-d/.test(A.ac()));
  t("ac: ยอด kpi เป็นตัวเลขส่วนหัว (Inter 700 tabular ผ่าน CSS ของ .ac-kpi-v)", /\.ac-kpi-v \{[^}]*font-weight: 700[^}]*tabular-nums/.test(read("portfolio-position.css")));

  // ================================================================ 3 · #aaRoot
  console.log("== 3 · Asset Allocation (#aaRoot) ==");
  var aa = A.aa();
  t("aa: ทุกการ์ด tone เดียว · ไม่ซ้อน", cards(aa).length >= 20 && oneTone(aa).length === 0 && nestedGlass(aa).length === 0, { n: cards(aa).length, bad: oneTone(aa), nested: nestedGlass(aa) });
  t("aa: หัว section ทุกอันอยู่บนพื้นหน้า (gc-section-h)", (aa.match(/class="aa-block-head gc-section-h"/g) || []).length >= 7 && (aa.match(/class="aa-block-head"/g) || []).length === 0,
    (aa.match(/class="aa-block-head[^"]*"/g) || []).length);
  t("aa: หัว ASSET ALLOCATION อยู่บนพื้นหน้า", /<div class="aa-hero-head gc-section-h"><h1 class="aa-title">ASSET ALLOCATION<\/h1>/.test(aa) && !/<section class="aa-hero[^"]*gc-card/.test(aa));
  // fixture จริง: พอร์ตสั้น/กลางตามหลังต่อเนื่อง · ระยะยาวไม่มีข้อมูล · Bitcoin ยังไม่จัด
  t("aa: ประโยคสรุป (fixture: ตามหลังต่อเนื่อง) → warning", toneOf(cardsBy(aa, "aa-headline")[0]) === "gc-warning" && /aa-headline is-behind gc-card/.test(aa));
  var portT = tonesBy(aa, "aa-card");
  t("aa: การ์ดพอร์ต (fixture) short behind → warning · mid behind → warning · long no-data → neutral", portT.join() === "gc-warning,gc-warning,gc-neutral", portT);
  var stats = cardsBy(aa, "aa-stat");
  t("aa: ช่องหัวหน้า มูลค่ารวม · จัดแล้ว · ไตรมาส = neutral · ยังไม่จัด (1 รายการ) = warning", stats.length >= 4 && toneOf(stats[0]) === "gc-neutral" && toneOf(stats[1]) === "gc-neutral" &&
    toneOf(stats[2]) === "gc-warning" && toneOf(stats[3]) === "gc-neutral", stats.map(toneOf));
  t("aa: ตัวเลขหัวหน้าเป็น gc-num (ยกเว้น \"N รายการ\" ที่มีคำไทย)", (aa.match(/class="aa-stat-n gc-num[^"]*"/g) || []).length >= 3 && /<div class="aa-stat-n">\d+ รายการ<\/div>/.test(aa) &&
    (aa.match(/class="aa-card-val gc-num[^"]*"/g) || []).length === 3);
  t("aa: กล่องยังจัดไม่ครบ (มี Bitcoin) → warning", tonesBy(aa, "aa-unassigned").join() === "gc-warning");
  var rows = cardsBy(aa, "aa-arow");
  t("aa: แถวแบ่งสัดส่วน 4 แถว = gc-tile · จัด 100% → calm · ยังไม่จัด → warning", rows.length === 4 && rows.every(function (c) { return c.cls.indexOf("gc-tile") >= 0; }) &&
    rows.filter(function (c) { return toneOf(c) === "gc-calm"; }).length === 3 && rows.filter(function (c) { return toneOf(c) === "gc-warning"; }).length === 1, rows.map(toneOf));
  t("aa: จากนี้ (.aa-fh ×3) · กราฟเกษียณ · ช่องตั้งค่าเกษียณ · ตารางบันทึก · คุณภาพข้อมูล · ช่องตั้งค่า = neutral",
    tonesBy(aa, "aa-fh").join() === "gc-neutral,gc-neutral,gc-neutral" && tonesBy(aa, "aa-retire-chart").join() === "gc-neutral" && tonesBy(aa, "aa-retire-set").join() === "gc-neutral" &&
    tonesBy(aa, "aa-rec-card").join() === "gc-neutral" && tonesBy(aa, "aa-quality").join() === "gc-neutral" &&
    tonesBy(aa, "aa-field").length === 5 && tonesBy(aa, "aa-field").every(function (x) { return x === "gc-neutral"; }),
    [tonesBy(aa, "aa-fh"), tonesBy(aa, "aa-retire-chart"), tonesBy(aa, "aa-retire-set"), tonesBy(aa, "aa-rec-card"), tonesBy(aa, "aa-quality"), tonesBy(aa, "aa-field")]);
  // ตารางรายไตรมาสมีเฉพาะพอร์ตที่มีไตรมาส (fixture: สั้น + กลาง · ระยะยาวไม่มีข้อมูล = ไม่มีตาราง)
  var nQT = (aa.match(/<summary>ดูรายไตรมาสของพอร์ต/g) || []).length;
  t("aa: <details> ตารางรายไตรมาส (" + nQT + ") + วิธีคำนวณ = การ์ด neutral · ตารางรายพอร์ต (อยู่ในการ์ดบันทึก) ไม่ใช่แก้ว",
    nQT === 2 && cardsBy(aa, "aa-details").length === nQT + 1 && tonesBy(aa, "aa-details").every(function (x) { return x === "gc-neutral"; }) && /<details class="aa-details aa-rec-ports">/.test(aa),
    cardsBy(aa, "aa-details").length);
  t("aa: ช่วงที่ 2 = neutral", toneOf(cardsBy(aa, "aa-phase")[1]) === "gc-neutral", tonesBy(aa, "aa-phase"));
  t("aa: แถบบันทึก (ข้อมูลตรงกับที่บันทึกไว้) → neutral · gc-strip", tonesBy(aa, "aa-savebar").join() === "gc-neutral" && /class="aa-savebar gc-card gc-strip gc-neutral" data-save-state="idle"/.test(aa));
  // ตารางทั้งพอร์ต + รายพอร์ต + รายไตรมาส (nQT)
  var nTbl = (aa.match(/<table\b/g) || []).length;
  t("aa: ตารางทุกตัว (" + nTbl + ") = gc-table ใน gc-table-wrap ที่โฟกัสได้ (aria-label ไม่มีเงิน)",
    nTbl === 2 + nQT && (aa.match(/<table class="aa-table[^"]*gc-table"/g) || []).length === nTbl &&
    (aa.match(/class="aa-table-wrap[^"]*gc-table-wrap" tabindex="0" role="region" aria-label="[^"]+"/g) || []).length === nTbl, nTbl);
  t("aa: ช่องกรอก/เลือกทุกตัว = gc-field", (function () {
    var all = (aa.match(/<(input|select)\b[^>]*>/g) || []);
    return all.length >= 20 && all.every(function (x) { return /class="[^"]*\bgc-field\b/.test(x); });
  })(), (aa.match(/<(input|select)\b[^>]*>/g) || []).filter(function (x) { return !/gc-field/.test(x); }).slice(0, 3));
  t("aa: สีประจำพอร์ต (จุด) คงเดิม", /class="aa-dot" style="background:#/.test(aa));

  // ---- ทุก tone ของ aa ผ่านผลของ engine ที่แก้ทีละกรณี
  function aaWith(fn) { A.patchAA(fn); A.win.AssetAllocationPage.render(); return A.aa(); }
  function setPorts(out, st) {
    ["short", "mid", "long"].forEach(function (p, i) {
      var P = out.ports[p];
      P.trailing = null; P.status = st[i]; P.gapRatio = st[i] === "ahead" ? 0.02 : (st[i] === "behind" ? -0.02 : 0);
    });
    out.ports.short.runway = { months: null };
  }
  var hA = aaWith(function (out) { setPorts(out, ["ahead", "on", "behind"]); });
  t("aa: การ์ดพอร์ต ahead → calm · on → normal · behind → warning", tonesBy(hA, "aa-card").join() === "gc-calm,gc-normal,gc-warning", tonesBy(hA, "aa-card"));
  var hNT = aaWith(function (out) { setPorts(out, ["no-target", "no-data", "on"]); });
  t("aa: no-target → neutral · no-data → neutral", tonesBy(hNT, "aa-card").slice(0, 2).join() === "gc-neutral,gc-neutral", tonesBy(hNT, "aa-card"));
  var hHa = aaWith(function (out) { setPorts(out, ["ahead", "no-data", "no-data"]); });
  t("aa: ประโยคสรุป ahead → calm", /aa-headline is-ahead gc-card gc-calm/.test(hHa), (/class="aa-headline[^"]*"/.exec(hHa) || [])[0]);
  var hHo = aaWith(function (out) { setPorts(out, ["on", "no-data", "no-data"]); });
  t("aa: ประโยคสรุป on → normal", /aa-headline is-on gc-card gc-normal/.test(hHo), (/class="aa-headline[^"]*"/.exec(hHo) || [])[0]);
  var hHb = aaWith(function (out) { setPorts(out, ["behind", "on", "on"]); });
  t("aa: ประโยคสรุป behind → warning", /aa-headline is-behind gc-card gc-warning/.test(hHb));
  // fix round 1: ประโยคที่ไม่ได้บอกสถานะเทียบเป้า (tone ค่าเริ่มต้น "on") → neutral แบบการ์ดพอร์ต · คลาส is-on คงไว้
  function headOf(h) { return (/<div class="aa-headline[^"]*">[^<]*<\/div>/.exec(h) || [""])[0]; }
  var hN1 = aaWith(function (out) { ["short", "mid", "long"].forEach(function (p) { out.ports[p].hasData = false; }); });
  t("aa: ประโยคสรุป ยังไม่มีข้อมูล (ไม่มีพอร์ตไหนมีข้อมูล) → neutral · คลาส is-on คงเดิม",
    /^<div class="aa-headline is-on gc-card gc-neutral">(ยังไม่ได้จัดสินทรัพย์เข้าพอร์ตใดเลย|ยังไม่มีข้อมูลพอจะวัดผลตอบแทน)/.test(headOf(hN1)), headOf(hN1).slice(0, 120));
  var hN2 = aaWith(function (out) { setPorts(out, ["no-target", "no-target", "no-target"]); });
  t("aa: ประโยคสรุป ยังไม่ได้ตั้งผลตอบแทนคาดหวัง → neutral",
    /^<div class="aa-headline is-on gc-card gc-neutral">มีข้อมูลผลตอบแทนแล้ว แต่ยังไม่ได้ตั้งผลตอบแทนคาดหวัง/.test(headOf(hN2)), headOf(hN2).slice(0, 120));
  var hN3 = aaWith(function (out) { setPorts(out, ["ahead", "on", "on"]); out.ports.short.runway = { months: 12 }; });
  t("aa: ประโยคสรุปที่มีแค่ runway (ไม่มีคำเทียบเป้า · tone ค่าเริ่มต้น) → neutral",
    /^<div class="aa-headline is-on gc-card gc-neutral">พอร์ตระยะสั้นมีเงินพอใช้อีก ~12\.0 เดือน<\/div>$/.test(headOf(hN3)), headOf(hN3));
  function tvWith(st) {
    return aaWith(function (out) {
      var W = out.record.whole, y = W.yearly[W.yearly.length - 1];
      y.real = 0.05; y.target = 0.04; y.status = st;
    });
  }
  ["ahead:gc-calm", "on:gc-normal", "behind:gc-warning"].forEach(function (pair) {
    var p = pair.split(":"), h = tvWith(p[0]), c = cardsBy(h, "aa-stat-target")[0];
    t("aa: การ์ดผลตอบแทนจริงปีนี้ " + p[0] + " → " + p[1], !!c && toneOf(c) === p[1] && c.cls.indexOf("is-" + p[0]) >= 0, c && c.cls);
  });
  function verdictWith(v, short) {
    return aaWith(function (out) {
      var RT = out.retirement;
      if (RT && RT.expected) { RT.expected.verdict = v; RT.expected.shortfallAtRetirement = short; }
    });
  }
  var hv = verdictWith("comfortable", 0);
  t("aa: fixture พร้อมคิดแผนเกษียณ (มีหัวสรุปเกษียณ + ช่วงที่ 1/2)", /id="aaRetire"[\s\S]*class="aa-headline/.test(hv) && cardsBy(hv, "aa-phase").length === 2);
  function retireTone(h) { var s = h.slice(h.indexOf('id="aaRetire"')); return toneOf(cardsBy(s, "aa-headline")[0]); }
  t("aa: เกษียณ comfortable (สบาย) → calm · ช่วงที่ 1 เงินพอ (is-ok) → calm", retireTone(hv) === "gc-calm" && toneOf(cardsBy(hv, "aa-phase")[0]) === "gc-calm" && /class="aa-phase is-ok gc-card gc-calm"/.test(hv), [retireTone(hv), tonesBy(hv, "aa-phase")]);
  var ht = verdictWith("tight", 0);
  t("aa: เกษียณ tight (พอดีตัว) → normal", retireTone(ht) === "gc-normal", retireTone(ht));
  var hs = verdictWith("short", 1234567);
  t("aa: เกษียณ short (เสี่ยง — เงินไม่พอ) → warning · ช่วงที่ 1 ยังขาด → warning", retireTone(hs) === "gc-warning" && toneOf(cardsBy(hs, "aa-phase")[0]) === "gc-warning" && /class="aa-phase gc-card gc-warning"/.test(hs),
    [retireTone(hs), tonesBy(hs, "aa-phase")]);
  var hR = aaWith(function (out) {
    out.assetsAll[0].valid = false; out.assetsAll[0].sumPct = 130;
    out.assetsAll[1].valid = true; out.assetsAll[1].sumPct = 100;
    out.assetsAll[2].valid = true; out.assetsAll[2].sumPct = 40;
    out.assetsAll[3].valid = true; out.assetsAll[3].sumPct = 0;
  });
  var rt = tonesBy(hR, "aa-arow");
  t("aa: แถว is-bad (เกิน 100%) → danger · is-ok → calm · is-warn (40% · 0%) → warning", rt.join() === "gc-danger,gc-calm,gc-warning,gc-warning" &&
    /aa-sum is-bad/.test(hR) && /aa-sum is-ok/.test(hR), rt);
  var hU = aaWith(function (out) { out.unassigned = []; out.totals.unassignedCount = 0; out.totals.unassigned = 0; });
  t("aa: จัดครบ → กล่อง is-empty neutral · ช่องยังไม่จัด neutral", tonesBy(hU, "aa-unassigned").join() === "gc-neutral" && /class="aa-unassigned is-empty gc-card gc-neutral"/.test(hU) && toneOf(cardsBy(hU, "aa-stat")[2]) === "gc-neutral");
  var hB = aaWith(function (out) {
    out.meta.staleKeys = ["thai-stock::เก่า"]; out.meta.invalidSplits = [{ name: "ทอง", sum: 120 }];
    if (out.retirement) { out.retirement.unassignedExcluded = 50000; out.retirement.unassignedPct = 8; }
  });
  t("aa: ป้ายเตือน (สัดส่วนเกิน · คีย์ค้าง · ยังไม่รวมส่วนที่ไม่จัด) = gc-tile warning · ปุ่มลบ = gc-btn gc-btn-ghost",
    tonesBy(hB, "aa-banner").length === 3 && tonesBy(hB, "aa-banner").every(function (x) { return x === "gc-warning"; }) && nestedGlass(hB).length === 0 &&
    /class="aa-btn aa-btn-danger gc-btn gc-btn-ghost" data-drop-stale=/.test(hB), tonesBy(hB, "aa-banner"));
  A.patchAA(null); A.win.AssetAllocationPage.render();
  // ยังตั้งค่าไม่ครบ → กล่องข้อความ neutral
  var hNR = aaWith(function (out) { out.retirement.ready = false; out.retirement.missing = ["อายุ"]; });
  t("aa: แผนเกษียณยังตั้งค่าไม่ครบ → กล่องข้อความ neutral + ช่องตั้งค่า", tonesBy(hNR, "aa-retire-note").join() === "gc-neutral" && tonesBy(hNR, "aa-retire-set").join() === "gc-neutral" && nestedGlass(hNR).length === 0);
  A.patchAA(null); A.win.AssetAllocationPage.render();

  // แถบบันทึก: บันทึกสำเร็จ → calm · ไม่สำเร็จ → danger
  A.win.AssetAllocationPage.setExpected("long", 7); A.win.AssetAllocationPage.persistNow(); await flush(80);
  t("aa: บันทึกสำเร็จ → แถบบันทึก calm", /data-save-state="saved"/.test(A.aa()) && tonesBy(A.aa(), "aa-savebar").join() === "gc-calm", tonesBy(A.aa(), "aa-savebar"));
  A.flags.failPut = true; A.win.AssetAllocationPage.setExpected("long", 8); A.win.AssetAllocationPage.persistNow(); await flush(80);
  var hF = A.aa();
  t("aa: บันทึกไม่สำเร็จ → แถบบันทึก danger · ปุ่มลองอีกครั้ง/ทิ้งร่าง = gc-btn gc-btn-ghost", /data-save-state="failed"/.test(hF) && tonesBy(hF, "aa-savebar").join() === "gc-danger" &&
    /class="aa-btn gc-btn gc-btn-ghost" type="button" data-save-now/.test(hF) && /class="aa-btn aa-btn-danger gc-btn gc-btn-ghost" type="button" data-discard-draft/.test(hF), tonesBy(hF, "aa-savebar"));
  A.flags.failPut = false;

  // ร่างที่ยังไม่ได้บันทึก (ใหม่กว่าของ server) → ป้ายบนสุด = warning
  var D = boot({ store: { asset_allocation_draft_v1: JSON.stringify({ allocation: fixture().allocation, savedAt: "2099-01-01T00:00:00.000Z" }) }, failPut: true }); await flush(160);
  var hD = D.aa();
  t("aa: ป้ายร่างที่ยังไม่บันทึก (บนสุด) → gc-tile warning · มาก่อนหัวหน้า", /^<div class="aa-banner gc-card gc-tile gc-warning">/.test(hD) && hD.indexOf("aa-banner") < hD.indexOf("aa-hero"), hD.slice(0, 120));

  // ข้อความว่าง (ไม่มีไตรมาส)
  var E = boot({ fixture: { quarters: {} } }); await flush(120);
  t("ข้อความว่างทั้งสามส่วน = การ์ด neutral (ไม่ซ้อน)", tonesBy(E.pp(), "pp-hero-inner").join() === "gc-neutral" && tonesBy(E.ac(), "ac-main").join() === "gc-neutral" &&
    /<p class="ac-empty">/.test(E.ac()) && (tonesBy(E.aa(), "aa-hero-inner").join() === "gc-neutral" || tonesBy(E.aa(), "mc-empty").join() === "gc-neutral") &&
    nestedGlass(E.all()).length === 0, [E.pp().slice(0, 90), E.ac().slice(0, 90), E.aa().slice(0, 90)]);
  t("placeholder ตอนโหลดใน portfolio.html = mc-empty gc-card gc-neutral ทั้งสามจุด", (HTML.match(/class="mc-empty gc-card gc-neutral"/g) || []).length === 3);

  // ================================================================ 4 · Privacy Lock
  console.log("== 4 · Privacy Lock ==");
  var L = boot({ locked: true }); await flush(160);
  var lockedAll = L.all();
  var txt = maskedText(lockedAll);
  var left = (txt.match(new RegExp(MONEY_TXT.source, "g")) || []);
  t("ล็อก: ทุก text node ผ่าน maskText แล้วไม่เหลือยอดเงิน (ยอดรวม · แถบ · การ์ด allocation · Asset Allocation)", left.length === 0, left.slice(0, 6));
  // fix round 1: เงินแบบย่อ (648M · 4.3M · 520k) ก็ต้องไม่เหลือ
  var compact = txt.match(/(^|[^A-Za-z0-9_.])\d+(?:\.\d+)?[Mk](?![A-Za-z0-9_])/gm) || [];
  t("ล็อก: ไม่เหลือเงินแบบย่อ …M / …k ในข้อความที่เห็น", compact.length === 0, compact.slice(0, 6));
  // ตัวเลข "N ล้าน" ที่ไม่มี ฿ เหลือได้เฉพาะกรอบเงินสดที่ผู้ใช้ตั้งเอง (ค่าตั้ง ไม่ใช่เงินในพอร์ต — การ์ดตั้งใจคงไว้ตอนล็อก)
  var bandNums = [], reL = /(?:^|[^฿X\d.])(\d+(?:\.\d+)?)(?:–(\d+(?:\.\d+)?))? ล้าน/gm, mL;
  while ((mL = reL.exec(txt)) !== null) { bandNums.push(mL[1]); if (mL[2]) bandNums.push(mL[2]); }
  t("ล็อก: \"N ล้าน\" ที่ไม่มี ฿ มีแค่กรอบเงินสดที่ตั้งไว้ (1 · 3 ล้าน ในหัวแถบ ขีดแถบ และกติกา)", bandNums.length > 0 && bandNums.every(function (n) { return n === "1" || n === "3"; }), bandNums);
  t("ล็อก: มี ฿XXX จริงในทั้งสามส่วน", /฿XXX/.test(maskedText(L.pp())) && /฿XXX/.test(maskedText(L.ac())) && /฿XXX/.test(maskedText(L.aa())));
  t("ล็อก: ไม่มีเงินใน title / aria-label", moneyAttrs(lockedAll).length === 0, moneyAttrs(lockedAll));
  var ins = inputs(L.aa());
  var exp = ins.filter(function (a) { return "data-monthly-expense" in a; })[0], con = ins.filter(function (a) { return a["data-retire"] === "quarterlyContribution"; })[0];
  t("ล็อก: ต้องใช้เงินเดือนละ = value \"\" + placeholder ล็อกอยู่", !!exp && exp.value === "" && exp.placeholder === "ล็อกอยู่ — ใส่ค่าใหม่ได้" && /gc-field/.test(exp["class"]), exp);
  t("ล็อก: เติมเงินไตรมาสละ = value \"\" + placeholder ล็อกอยู่", !!con && con.value === "" && con.placeholder === "ล็อกอยู่ — ใส่ค่าใหม่ได้", con);
  var moneyVals = inputs(lockedAll).filter(function (a) { return /\d{4,}|\d{1,3},\d{3}/.test(a.value || ""); }).map(function (a) { return (a.id || a.name || a["data-retire"] || "?") + "=" + a.value; });
  t("ล็อก: ไม่มี <input value> ขนาดเงินที่ไหนบนหน้า", moneyVals.length === 0, moneyVals);
  t("ล็อก: ช่องที่ไม่ใช่เงินยังแสดงค่า (อายุ 42 · เงินเฟ้อ 3 · % แบ่งพอร์ต 100)", ins.some(function (a) { return a["data-retire"] === "currentAge" && a.value === "42"; }) &&
    ins.some(function (a) { return a["data-retire"] === "inflationPct" && a.value === "3"; }) && ins.some(function (a) { return a["data-split"] === "rmf-jang::RMF-จัง" && a.value === "100"; }));
  t("ล็อก: แถบเงินสด neutral ไม่มีจุดตอนนี้", tonesBy(L.ac(), "ac-cash").join() === "gc-neutral" && !/data-ac-now/.test(L.ac()));
  // ช่องว่างตอนล็อกไม่ถูกบันทึก (ไม่งั้นล้างค่าที่ตั้งไว้) · พิมพ์ค่าใหม่ตอนล็อกยังบันทึกได้
  function aaNode(pred) { return L.els.aaRoot.querySelectorAll(pred.attr).filter(pred.fn)[0]; }
  var cNode = aaNode({ attr: "[data-retire]", fn: function (n) { return n.getAttribute("data-retire") === "quarterlyContribution"; } });
  var eNode = aaNode({ attr: "[data-monthly-expense]", fn: function () { return true; } });
  var nPut0 = L.puts.length;
  if (cNode) { cNode.value = ""; cNode._h.change && cNode._h.change({}); }
  if (eNode) { eNode.value = "  "; eNode._h.change && eNode._h.change({}); }
  await flush(700);
  var al = L.win.AssetAllocationPage.currentAllocation();
  t("ล็อก + ช่องเงินว่างแล้ว change → ไม่แตะค่าเดิม (240,000/ปี · 50,000/เดือน) · ไม่ PUT", !!cNode && !!eNode && !!cNode._h.change && !!eNode._h.change && al.retirement.annualContribution === 240000 && al.monthlyExpense === 50000 && L.puts.length === nPut0,
    [al.retirement.annualContribution, al.monthlyExpense, L.puts.length - nPut0]);
  cNode = aaNode({ attr: "[data-retire]", fn: function (n) { return n.getAttribute("data-retire") === "quarterlyContribution"; } });
  cNode.value = "70,000"; cNode._h.change({});
  await flush(800);
  t("ล็อก + พิมพ์ค่าใหม่ 70,000 → บันทึก (ปีละ 280,000)", L.win.AssetAllocationPage.currentAllocation().retirement.annualContribution === 280000 && L.puts.length > nPut0 &&
    L.puts[L.puts.length - 1].data.allocation.retirement.annualContribution === 280000);
  L.PV.locked = false; L.fireDoc("portfolio-privacy-changed");
  var unl = inputs(L.aa());
  t("ปลดล็อก → วาดใหม่ ช่องเงินกลับมามีค่า (50000 · 70,000) ไม่มี placeholder ล็อก", unl.some(function (a) { return "data-monthly-expense" in a && a.value === "50000" && a.placeholder === undefined; }) &&
    unl.some(function (a) { return a["data-retire"] === "quarterlyContribution" && a.value === "70,000"; }));
  var uNode = L.els.aaRoot.querySelectorAll("[data-monthly-expense]")[0];
  uNode.value = ""; uNode._h.change({});
  t("ปลดล็อกแล้วล้างช่อง → พฤติกรรมเดิม (ค่าใช้จ่ายเป็น null)", L.win.AssetAllocationPage.currentAllocation().monthlyExpense === null);
  L.PV.locked = true; L.fireDoc("portfolio-privacy-changed");
  t("ล็อกอีกครั้ง → ช่องเงินว่างอีก", inputs(L.aa()).filter(function (a) { return a["data-retire"] === "quarterlyContribution"; })[0].value === "");
  // fix round 1: ป้ายแกนเงินของกราฟเกษียณ (x = L − 7 = 89 · text-anchor end — ป้ายอายุตัวท้ายของแกนนอนก็ end แต่ x ต่างกัน)
  //   เดิมเป็น "648M" ล้วน privacy.js (MONEY_RE: ฿ / บาท / THB) ไม่ซ่อน · ล็อกอยู่ → "฿648M" → maskText → "฿XXXM"
  //   instance ใหม่ (L ด้านบนล้างค่าใช้จ่ายไปแล้ว → แผนเกษียณตั้งค่าไม่ครบ → ไม่มีกราฟ)
  function yAxis(h) { var out = [], re = /<text class="aa-axis" x="89" y="[^"]*" text-anchor="end">([^<]*)<\/text>/g, m; while ((m = re.exec(h)) !== null) out.push(m[1]); return out; }
  var LA = boot({ locked: true }); await flush(160);
  var yl = yAxis(LA.aa());
  t("ล็อก: ป้ายแกนเงินของกราฟเกษียณผ่าน maskText แล้วไม่มีตัวเลข ยกเว้น \"0\" ตัวเดียว", yl.length === 4 && yl.some(function (s) { return /^฿\d/.test(s); }) &&
    yl.every(function (s) { var m = maskText(s); return m === "0" || !/\d/.test(m); }), yl.map(function (s) { return s + " → " + maskText(s); }));
  LA.PV.locked = false; LA.fireDoc("portfolio-privacy-changed");
  var yu = yAxis(LA.aa());
  t("ปลดล็อก: ป้ายแกนเงินกลับเป็นข้อความเดิม (ไม่มี ฿ · 3 ป้าย M/k + 0)", yu.length === 4 && yu.every(function (s) { return s.indexOf("฿") < 0; }) &&
    yu.filter(function (s) { return /^\d+(\.\d)?[Mk]$/.test(s); }).length === 3 && yu[3] === "0", yu);
  LA.PV.locked = true; LA.fireDoc("portfolio-privacy-changed");
  t("ล็อกอีกครั้ง: ป้ายแกนเงินมี ฿ อีก", yAxis(LA.aa()).filter(function (s) { return /^฿/.test(s); }).length === 3, yAxis(LA.aa()));

  // ================================================================ 5 · source / CSS / HTML
  console.log("== 5 · source · CSS · HTML ==");
  function es5ok(f) { var s = read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, ""); return !/=>|\bconst\s|\blet\s|`/.test(s); }
  ["portfolio-position-page.js", "allocation-card-page.js", "asset-allocation-page.js"].forEach(function (f) {
    t(f + ": ES5 · ไม่มีคำแนะนำซื้อขาย", es5ok(f) && !ADVISORY.test(read(f)) && !/\b(Buy|Sell)\b/.test(read(f)));
  });
  var sheets = []; (function () { var re = /<link rel="stylesheet" href="\/([a-z0-9-]+\.css)\?v=([^"]+)"/g, m; while ((m = re.exec(HTML)) !== null) sheets.push(m[1] + "@" + m[2]); })();
  var files = sheets.map(function (s) { return s.split("@")[0]; });
  t("portfolio.html: theme → mission-control → glass-cards (" + GC_V + ", ครั้งเดียว) → portfolio-position.css → asset-allocation.css",
    files.indexOf("theme.css") === 0 && files.indexOf("mission-control.css") < files.indexOf("glass-cards.css") && files.indexOf("glass-cards.css") < files.indexOf("portfolio-position.css") &&
    files.indexOf("glass-cards.css") < files.indexOf("asset-allocation.css") && sheets.filter(function (s) { return s === "glass-cards.css@" + GC_V; }).length === 1 &&
    files.filter(function (f) { return f === "glass-cards.css"; }).length === 1, sheets);
  t("portfolio.html: เวอร์ชัน bump (css pp-15 · aa-11 · js pp-17 · ac-4 · aa-15)",
    HTML.indexOf("/portfolio-position.css?v=" + V.ppCss + '"') > 0 && HTML.indexOf("/asset-allocation.css?v=" + V.aaCss + '"') > 0 &&
    HTML.indexOf("/portfolio-position-page.js?v=" + V.ppJs + '"') > 0 && HTML.indexOf("/allocation-card-page.js?v=" + V.acJs + '"') > 0 && HTML.indexOf("/asset-allocation-page.js?v=" + V.aaJs + '"') > 0);
  var PPC = read("portfolio-position.css"), AAC = read("asset-allocation.css");
  function ruleOf(css, sel) { var i = css.indexOf("\n" + sel + " {"); if (i < 0) return null; return css.slice(i + 1, css.indexOf("}", i) + 1); }
  t("portfolio-position.css: ในการ์ดแก้ว token mc/pp = หมึกแก้ว (.pp-page .gc-card · .ac-embedded .gc-card)",
    /\.pp-page \.gc-card,\s*\.ac-embedded \.gc-card \{[^}]*--mc-text: var\(--gc-ink\);[^}]*--mc-muted: var\(--gc-ink-2\);[^}]*--mc-border: var\(--gc-line\);[^}]*--pp-bull: #7cf5c6;[^}]*--pp-bear: #ffcfdb;/.test(PPC));
  t("portfolio-position.css: นอกการ์ด (บนพื้นหน้า) ตัวหนังสือรองตามธีม (--app-text-2)", /\.pp-page,\s*\.ac-embedded \{[^}]*--mc-muted: var\(--app-text-2\)/.test(PPC));
  t("portfolio-position.css: ผิวการ์ดเก่าถูกลบ (.pp-hero / .pp-stat / .ac-card / .ac-cash ไม่มี background / border ของตัวเอง)",
    ["\.pp-hero", "\.pp-stat", "\.ac-card", "\.ac-cash"].every(function (s) { var r = ruleOf(PPC, s.replace("\\", "")); return !r || !/background|border:/.test(r); }),
    ["\.pp-hero", "\.pp-stat", "\.ac-card", "\.ac-cash"].map(function (s) { return ruleOf(PPC, s.replace("\\", "")); }));
  t("portfolio-position.css: แถบลงทุนเป็นเส้นขาว (ไม่ใช่ฟ้า-เขียว)", !/\.pp-invbar i \{[^}]*#38bdf8/.test(PPC) && /\.pp-invbar i \{[^}]*#fff/.test(PPC));
  t("portfolio-position.css: แท่งลงทุนแล้วสีเขียวเดิม (โทนมืดในการ์ดทั้งสองธีม) · จุดตอนนี้ = เหลือง signal", /\.ac-embedded \.gc-card \{[^}]*--ac-held-bg: linear-gradient\(180deg, #1f5f4c, #17493b\)/.test(PPC) &&
    /\.ac-band \[data-ac-now\] \{[^}]*background: var\(--gc-signal\)/.test(PPC) && /\.ac-band \[data-ac-now\] span \{[^}]*color: var\(--gc-signal\)/.test(PPC));
  t("asset-allocation.css: ในการ์ดแก้ว token mc/aa = หมึกแก้ว · สีสถานะยกให้สว่างบนแก้ว",
    /\.aa-page \.gc-card \{[^}]*--mc-text: var\(--gc-ink\);[^}]*--mc-muted: var\(--gc-ink-2\);[^}]*--aa-ahead: #7cf5c6;[^}]*--aa-behind: #ffd98a;/.test(AAC));
  t("asset-allocation.css: นอกการ์ดตัวหนังสือรองตามธีม", /\.aa-page \{[^}]*--mc-muted: var\(--app-text-2\)/.test(AAC));
  t("asset-allocation.css: ผิวการ์ดเก่าถูกลบ (aa-hero / aa-card / aa-fh / aa-retire / aa-arow / aa-field / aa-quality / aa-savebar / aa-headline ไม่มี background ของตัวเอง)",
    [".aa-hero", ".aa-card", ".aa-fh", ".aa-retire", ".aa-arow", ".aa-field", ".aa-quality", ".aa-savebar", ".aa-headline", ".aa-stat", ".aa-phase", ".aa-unassigned", ".aa-banner"].every(function (s) { var r = ruleOf(AAC, s); return !r || !/background|border:/.test(r); }),
    [".aa-hero", ".aa-card", ".aa-fh", ".aa-retire", ".aa-arow", ".aa-field", ".aa-quality", ".aa-savebar", ".aa-headline", ".aa-stat", ".aa-phase", ".aa-unassigned", ".aa-banner"].filter(function (s) { var r = ruleOf(AAC, s); return r && /background|border:/.test(r); }));
  t("asset-allocation.css: สีประจำพอร์ต + เส้นกราฟเกษียณคงเดิม", /--aa-short: #38bdf8;/.test(AAC) && /--aa-mid: #f59e0b;/.test(AAC) && /--aa-long: #a855f7;/.test(AAC) && /#22d3ee/.test(read("asset-allocation-page.js")));
  t("asset-allocation.css: การ์ดกราฟเกษียณไม่ตัด tooltip (overflow visible) และวาดทับการ์ดถัดไป (z-index 1)", /\.aa-retire-chart\.gc-card \{ overflow: visible; z-index: 1; \}/.test(AAC));
  t("asset-allocation.css: วงโฟกัสของกล่องตารางในการ์ดวาดด้านใน (outline-offset −2px — การ์ดตัดวงด้านนอก)", /\.aa-page \.gc-card \.gc-table-wrap:focus-visible \{ outline-offset: -2px; \}/.test(AAC));
  t("asset-allocation.css: การ์ดที่มีข้อความปน inline (ป้ายเตือน · mc-empty · details) เป็น block", /\.aa-banner\.gc-card[^{]*\{[^}]*display: block/.test(AAC) && /details\.aa-details\.gc-card[^{]*\{[^}]*display: block/.test(AAC));
  t("asset-allocation.css: จอ ≤600px ตารางทั้งพอร์ตกว้างเต็มการ์ด (ช่องท้ายไม่ตกขอบแบบก่อนมีการ์ด)",
    /@media \(max-width: 600px\) \{[^@]*\.aa-rec-card\.gc-card \{ padding-left: 0; padding-right: 0; \}[^@]*\.aa-rec-card > \.aa-rec-wrap \{ border-left: 0; border-right: 0;/.test(AAC));
  t(".aa-embedded ยังปลด max-width / padding / margin / min-width (portfolio-merged-test)", /\.aa-embedded \{[^}]*max-width: none[^}]*min-width: 0[^}]*margin: 0[^}]*padding: 0/.test(AAC));

  finish();
})().catch(function (e) {
  fail++;
  console.error("  ✗ เทสต์ล้มกลางทาง: " + (e && e.stack || e));
  finish();
});
