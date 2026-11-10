"use strict";
// ============================================================
// หน้า AI Portfolio Manager — ค่าตั้ง 4 ตัว (Tier / Entry Ladder / มุมมอง AI Megatrend / index core) ขึ้น server (?doc=pm)
//   node scripts/pm-settings-sync-test.js
//
// รันหน้าจริงใน VM sandbox (สคริปต์ตามลำดับใน portfolio-manager.html · harness แบบ pm-cash-test):
//   fetch ปลอม: /api/portfolio (เอกสารพอร์ต) แยกจาก /api/portfolio?doc=pm (เอกสารค่าตั้ง · ตรวจด้วย validator ตัวจริง)
//   DOM ปลอมของ #pmRoot ที่อ่าน attribute ทุกตัวของแท็ก (select ที่ selected · checkbox checked · data-n)
// ล็อก:
//   เปิดหน้า: server มีเอกสาร → รับของ server + เขียน cache ในเครื่อง + ไม่ PUT · server ว่าง + เครื่องมีค่า → PUT ครั้งเดียว (ย้าย)
//     · GET ล้ม → ไม่ PUT · เอกสารที่อ่านไม่ออก (v ไม่ใช่ 1) → ไม่ PUT ทับ
//   แก้ค่า: เขียนเครื่องทันที → หน่วง ~0.8 วิ → GET สด → PUT ครั้งเดียว ทับเฉพาะคีย์ที่แก้ (คีย์อื่นของ server คงเดิม)
//     · แก้รัว ๆ = PUT น้อยครั้ง · ทีละรอบ · แก้ระหว่างส่ง = ส่งต่ออีกรอบ
//     · PUT ล้ม → ค่าในเครื่องคงอยู่ + ข้อความ + ค้างส่ง (ข้ามการปิดหน้า) → ลองใหม่ตอนแก้ครั้งถัดไป / กลับมาที่แท็บ
//     · 400 → ข้อความ + console.error ไม่ลองซ้ำเอง
//   กลับมาที่แท็บ: server เปลี่ยน → รับ + วาดใหม่ (รอ focusout ถ้าพิมพ์อยู่) · มีค้างส่ง → ไม่รับทับ
//   pmCurrentView_v1 ไม่ขึ้น server · ไม่มี listener ใหม่ต่อการวาด
// ============================================================
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var CLOCK = require("./sleeve-clock");
var V = require("../lib/pm-settings-validation.js");

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
function flush(ms) { return new Promise(function (r) { setTimeout(r, ms == null ? 60 : ms); }); }
function clone(x) { return x === undefined ? undefined : JSON.parse(JSON.stringify(x)); }
var DEBOUNCE_WAIT = 1100;   // หน่วง ~800 ms + เผื่อ

var FAIL_TH = "บันทึกค่าตั้งขึ้น server ไม่สำเร็จ — จะลองใหม่เมื่อแก้ครั้งถัดไปหรือกลับมาที่หน้านี้";
var ADVISORY_TH = /ควรซื้อ|ควรขาย|น่าซื้อ|น่าขาย|น่าเข้า|แนะนำซื้อ|จุดเข้า|ตัดขาดทุน/;
var ADVISORY_EN = /\b(Buy|Sell)\b/;
var K = { tier: "pmTierConfig_v1", entry: "pmEntryProgress_v1", stance: "pmMegaStance_v1", alloc: "pmAllocPolicy_v1", view: "pmCurrentView_v1", pending: "pmSettingsPending_v1" };
var PM_URL = "/api/portfolio?doc=pm";

// ---------- fixture เอกสารพอร์ต (แบบ pm-cash-test) ----------
function A(type, name, value, inv) { return { type: type, name: name, manualValue: value, snapshotValue: value, investedPercent: inv }; }
var FIX = {
  currentQuarter: "2026-Q4",
  quarters: { "2026-Q4": { key: "2026-Q4", assets: [A("foreign-stock", "US", 5000000, 70), A("bitcoin", "Bitcoin", 3000000, 100)] } }
};
function H(sym, mv) { return { canonicalSymbol: sym, assetName: sym, isHolding: true, marketValue: mv }; }
var HOLDINGS = [H("QQQM", 2000000), H("NVDA", 435000), H("META", 291000)];
function SNAP() {
  return { dataVersion: "2026-06-portfolio-dashboard-v1", snapshotId: "snap-test", loadedAt: "2026-11-08T01:00:00.000Z", status: "ready",
    marketRisk: {}, historicalData: {}, technicalIndicators: {},
    portfolioHoldings: { data: clone(HOLDINGS), mode: "server" }, portfolioStatus: { data: clone(FIX), mode: "supabase" } };
}

var HTML = read("portfolio-manager.html");
var SKIP = ["data-snapshot.js", "privacy.js"];
var SCRIPTS = (function () {
  var out = [], re = /<script src="\/([A-Za-z0-9._-]+\.js)\?v=[^"]*"/g, m;
  while ((m = re.exec(HTML)) !== null) out.push(m[1]);
  return out;
})().filter(function (f) { return SKIP.indexOf(f) < 0; });

// ---------- DOM ปลอม ----------
function mkEl(id) {
  return {
    id: id, innerHTML: "", textContent: "", value: "", style: {}, attrs: {}, hidden: false, children: [],
    appendChild: function (c) { this.children.push(c); return c; }, removeChild: function () {}, insertBefore: function (c) { return c; },
    prepend: function () {}, append: function () {}, remove: function () {},
    setAttribute: function (k, v) { this.attrs[k] = v; }, getAttribute: function (k) { return this.attrs[k] || null; },
    removeAttribute: function (k) { delete this.attrs[k]; }, hasAttribute: function (k) { return k in this.attrs; },
    addEventListener: function () {}, removeEventListener: function () {},
    querySelector: function () { return null; }, querySelectorAll: function () { return []; },
    closest: function () { return null; }, contains: function () { return false; }, focus: function () {}, blur: function () {},
    scrollIntoView: function () {}, getBoundingClientRect: function () { return { top: 0, left: 0, width: 0, height: 0 }; },
    classList: { add: function () {}, remove: function () {}, toggle: function () {}, contains: function () { return false; } }, dataset: {}
  };
}
function CustomEvent(type, init) { this.type = type; this.detail = init && init.detail; }
// ทุก attribute ของแท็กเปิด
function attrsOf(tag) {
  var out = {}, re = /\s([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:="([^"]*)")?/g, m;
  var inner = tag.replace(/^<[a-zA-Z]+/, "").replace(/\/?>$/, "");
  while ((m = re.exec(" " + inner)) !== null) out[m[1]] = m[2] === undefined ? "" : m[2].replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  return out;
}
function mkDom() {
  var h = "", cache = {}, renders = 0;
  function build(sel) {
    var m = /^\[([a-z-]+)\]$/.exec(sel);
    if (!m) return [];
    var attr = m[1], re = new RegExp("<([a-zA-Z]+)\\s[^>]*\\s?" + attr + '="[^"]*"[^>]*>', "g"), mm, out = [];
    while ((mm = re.exec(h)) !== null) {
      var tag = mm[0], at = attrsOf(tag);
      if (!(attr in at)) continue;
      var el = { tagName: mm[1].toUpperCase(), attributes: at, value: at.value || "", checked: "checked" in at, disabled: "disabled" in at,
        handlers: {}, style: {},
        getAttribute: function (k) { return k in this.attributes ? this.attributes[k] : null; },
        setAttribute: function (k, v) { this.attributes[k] = String(v); },
        hasAttribute: function (k) { return k in this.attributes; },
        addEventListener: function (ev, fn) { (this.handlers[ev] = this.handlers[ev] || []).push(fn); },
        removeEventListener: function () {}, focus: function () {}, blur: function () {}, scrollIntoView: function () {} };
      if (el.tagName === "SELECT") {
        var close = h.indexOf("</select>", mm.index), body = h.slice(mm.index, close < 0 ? h.length : close);
        var sm = /<option value="([^"]*)" selected>/.exec(body) || /<option value="([^"]*)"/.exec(body);
        el.value = sm ? sm[1] : "";
      }
      out.push(el);
    }
    return out;
  }
  function list(sel) { if (!cache[sel]) cache[sel] = build(sel); return cache[sel]; }
  function mkRoot(id) {
    var el = mkEl(id);
    Object.defineProperty(el, "innerHTML", { get: function () { return h; }, set: function (v) { h = String(v); cache = {}; renders++; } });
    el.querySelectorAll = function (sel) { return list(sel); };
    el.querySelector = function (sel) { var l = list(sel); return l.length ? l[0] : null; };
    el.contains = function (n) { for (var s in cache) if (cache[s].indexOf(n) >= 0) return true; return false; };
    return el;
  }
  // element ของการวาดรอบปัจจุบันที่ตรง attr=val (+ เงื่อนไข attribute อื่น)
  function find(attr, val, extra) {
    return list("[" + attr + "]").filter(function (e) {
      if (val != null && e.getAttribute(attr) !== String(val)) return false;
      for (var k in (extra || {})) if (e.getAttribute(k) !== String(extra[k])) return false;
      return true;
    });
  }
  function fire(el, ev) {
    if (!el || el.disabled) return false;
    var fns = el.handlers[ev] || [];
    if (!fns.length) return false;
    fns.forEach(function (fn) { fn({ type: ev, target: el, currentTarget: el, preventDefault: function () {}, stopPropagation: function () {} }); });
    return true;
  }
  return { mkRoot: mkRoot, find: find, fire: fire, renders: function () { return renders; }, html: function () { return h; } };
}

// ---------- boot ----------
//   o.store: localStorage เริ่มต้น · o.pm: เอกสาร pm บน server (null = ยังไม่มี) · o.flags(): สวิตช์ของ ?doc=pm
function boot(o) {
  o = o || {};
  var store = o.store || {};
  var dom = mkDom();
  var els = {}, fetches = [], pmPuts = [], pmGets = 0, heldPuts = [], heldGets = [], errors = [], loadErrors = [];
  var winL = {}, docL = {}, winAdds = 0, docAdds = 0;
  // o.pmRef: เอกสาร pm บน server ที่ใช้ร่วมกันหลาย instance (สองแท็บ origin เดียวกัน = store + server เดียวกัน)
  var pm = o.pmRef || { doc: o.pm === undefined ? null : clone(o.pm) };
  function flag(n) { try { return o.flags ? o.flags()[n] : undefined; } catch (e) { return undefined; } }
  function respond(ok, status, body) {
    return Promise.resolve({ ok: ok, status: status, json: function () { return Promise.resolve(body); }, text: function () { return Promise.resolve(JSON.stringify(body)); } });
  }
  var doc = {
    readyState: "complete", createElement: mkEl, hidden: false, title: "", activeElement: null,
    addEventListener: function (type, fn) { docAdds++; (docL[type] = docL[type] || []).push(fn); }, removeEventListener: function () {},
    getElementById: function (id) { if (!els[id]) els[id] = id === "pmRoot" ? dom.mkRoot(id) : mkEl(id); return els[id]; },
    querySelector: function () { return null; }, querySelectorAll: function () { return []; },
    createTreeWalker: function () { return { nextNode: function () { return null; } }; },
    body: mkEl("body"), documentElement: mkEl("html"), head: mkEl("head")
  };
  var win = {
    document: doc, location: { search: "", pathname: "/portfolio-manager", href: "http://localhost/portfolio-manager", origin: "http://localhost", reload: function () {} },
    history: { pushState: function () {}, replaceState: function () {} }, navigator: { userAgent: "node" },
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); }, removeItem: function (k) { delete store[k]; }
    },
    sessionStorage: { getItem: function (k) { return k === "portfolioPassword" ? "pw" : null; }, setItem: function () {}, removeItem: function () {} },
    addEventListener: function (type, fn) { winAdds++; (winL[type] = winL[type] || []).push(fn); },
    removeEventListener: function (type, fn) { var l = winL[type] || [], i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); },
    dispatchEvent: function (e) { (winL[e && e.type] || []).slice().forEach(function (fn) { fn(e); }); return true; },
    CustomEvent: CustomEvent,
    fetch: function (url, init) {
      var u = String(url), method = (init && init.method) || "GET";
      fetches.push({ url: u, method: method, cache: init && init.cache, at: Date.now() });
      if (u === PM_URL) {
        if (method === "PUT") {
          var body = JSON.parse(init.body);
          pmPuts.push(body);
          var finishPut = function () {
            if (flag("failPut")) return respond(false, 500, { error: "boom" });
            if (!V.isValidPmSettingsDoc(body && body.data)) return respond(false, 400, { error: "Refusing to save: PM settings are malformed." });
            pm.doc = clone(body.data);
            return respond(true, 200, { ok: true });
          };
          if (flag("holdPut")) return new Promise(function (r) { heldPuts.push(function () { r(finishPut()); }); });
          return finishPut();
        }
        pmGets++;
        if (flag("throwGet")) throw new TypeError("Failed to fetch");
        if (flag("rejectGet")) return Promise.reject(new TypeError("Failed to fetch"));
        if (flag("failGet")) return respond(false, 503, { error: "unavailable" });
        var payload = { data: clone(pm.doc) };
        if (flag("holdGet")) return new Promise(function (r) { heldGets.push(function () { r(respond(true, 200, payload)); }); });
        return respond(true, 200, payload);
      }
      if (u === "/api/portfolio") {
        if (method === "PUT") return respond(true, 200, { ok: true });
        return respond(true, 200, { data: clone(FIX), mode: "supabase" });
      }
      return respond(false, 404, {});
    },
    console: { log: function () {}, info: function () {}, warn: function () {}, error: function () { errors.push([].slice.call(arguments).map(String).join(" ")); } },
    Math: Math, JSON: JSON, Date: Date, Number: Number, String: String, Object: Object, Array: Array, Boolean: Boolean, isFinite: isFinite, isNaN: isNaN,
    parseInt: parseInt, parseFloat: parseFloat, Promise: Promise, RegExp: RegExp, Error: Error, TypeError: TypeError,
    Map: Map, Set: Set, WeakMap: WeakMap, Symbol: Symbol, encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent,
    setTimeout: setTimeout, clearTimeout: clearTimeout, setInterval: function () { return 0; }, clearInterval: function () {},
    requestAnimationFrame: function (fn) { return setTimeout(fn, 0); },
    Intl: Intl, URL: URL, Headers: Headers, Request: Request, Response: Response,
    alert: function () {}, confirm: function () { return false; },
    matchMedia: function () { return { matches: false, addEventListener: function () {}, addListener: function () {} }; }, innerWidth: 1280
  };
  win.window = win; win.self = win; win.globalThis = win;
  var snapState = SNAP();
  win.PortfolioDataSnapshot = { STORAGE_KEY: "portfolio_dashboard_data_snapshot", read: function () { return snapState; },
    write: function (s) { snapState = s; win.dispatchEvent(new CustomEvent("portfolio-data-snapshot", { detail: s })); return s; } };
  var ctx = vm.createContext(win);
  SCRIPTS.forEach(function (f) {
    try { vm.runInContext(read(f), ctx, { filename: f }); } catch (e) { loadErrors.push(f + ": " + e.message); }
    if (f === "foreign-sleeve.js" && win.ForeignSleeve) win.ForeignSleeve = CLOCK.withClock(win.ForeignSleeve, CLOCK.Q4_2026);
  });
  var mark = 0;
  var inst = {
    win: win, store: store, pm: pm, pmPuts: pmPuts, fetches: fetches, errors: errors, loadErrors: loadErrors,
    html: dom.html, renders: dom.renders, find: dom.find, fire: dom.fire,
    pmGets: function () { return pmGets; },
    listenerAdds: function () { return winAdds + docAdds; },
    mark: function () { mark = fetches.length; },
    pmCalls: function () { return fetches.slice(mark).filter(function (f) { return f.url === PM_URL; }).map(function (f) { return f.method; }).join(","); },
    allPmCalls: function () { return fetches.filter(function (f) { return f.url === PM_URL; }).map(function (f) { return f.method + (f.method === "GET" ? ":" + f.cache : ""); }).join(","); },
    releasePuts: function () { var l = heldPuts.splice(0); l.forEach(function (fn) { fn(); }); return l.length; },
    releaseGets: function () { var l = heldGets.splice(0); l.forEach(function (fn) { fn(); }); return l.length; },
    tabReturn: function () { win.dispatchEvent(new CustomEvent("focus", {})); (docL.visibilitychange || []).slice().forEach(function (fn) { fn(new CustomEvent("visibilitychange", {})); }); },
    focusEl: function (el) { doc.activeElement = el; },
    blurAll: function () { doc.activeElement = null; (docL.focusout || []).slice().forEach(function (fn) { fn(new CustomEvent("focusout", {})); }); },
    local: function (k) { var v = store[k]; return v == null ? null : JSON.parse(v); }
  };
  return inst;
}
// ตัวช่วยอ่านหน้า
function tierSel(I, ticker) { return I.find("data-pm-tier", ticker)[0] || null; }
function setTier(I, ticker, key) { var el = tierSel(I, ticker); if (!el) return false; el.value = key; return I.fire(el, "change"); }
function entryBox(I, ticker, n) { return I.find("data-pm-entry", ticker, { "data-n": n })[0] || null; }
function tick(I, ticker, n, on) { var el = entryBox(I, ticker, n); if (!el) return false; el.checked = on; return I.fire(el, "change"); }
function stanceOn(I) { var m = /class="pm-stance-btn is-on[^"]*" data-pm-stance="(\w+)"/.exec(I.html()); return m ? m[1] : null; }
function clickStance(I, v) { return I.fire(I.find("data-pm-stance", v)[0], "click"); }
// ข้อความสถานะทุกบรรทัด (data-pm-settings-sync) ต่อกัน · "" = ไม่มีข้อความ
function failNote(h) { return (h.match(/<div[^>]*data-pm-settings-sync="[^"]*"[^>]*>[\s\S]*?<\/div>/g) || []).join(""); }
// ข้อความหนึ่งชนิด (failed / rejected / unknown / offline / superseded) · null = ไม่มี
function noteOf(h, kind) { var m = new RegExp('<div[^>]*data-pm-settings-sync="' + kind + '"[^>]*>([\\s\\S]*?)<\\/div>').exec(h); return m ? m[1] : null; }
function iso(deltaMs) { return new Date(Date.now() + deltaMs).toISOString(); }
function pendingOps(I) { var p = I.local(K.pending); return p && Array.isArray(p.ops) ? p.ops : []; }
var OFFLINE_TH = "ยังโหลดค่าตั้งจาก server ไม่ได้ — ใช้ค่าในเครื่องนี้ชั่วคราว";
var SUPERSEDED_TH = "มีค่าที่ใหม่กว่าจากเครื่องอื่น — ใช้ค่านั้นแทนการแก้ที่ค้าง";
K.backup = "pmSettingsLocalBackup_v1";

// เอกสารบน server ที่อีกเครื่องตั้งไว้ (บันทึกเมื่อวาน — เวลาอิงนาฬิกาตอนรัน)
var SERVER_DOC = {
  v: 1,
  tierConfig: { map: { NVDA: "C", META: "B" }, tiers: { A: { min: 6, max: 18 } } },
  entryProgress: { NVDA: { "1": true }, META: { "2": true } },
  megaStance: "bearish",
  allocPolicy: { indexTicker: "QQQM", indexPct: 50 },
  updatedAt: iso(-86400000)
};

(async function main() {
  t("portfolio-manager.html loads portfolio-manager-page.js?v=20261110-pm-33", /portfolio-manager-page\.js\?v=20261110-pm-33"/.test(HTML));

  // ================= 1. server มีเอกสาร → รับ + เขียน cache + ไม่ PUT =================
  console.log("== 1. server has a doc → adopt, no PUT on open ==");
  var S1 = {}; S1[K.tier] = JSON.stringify({ map: { NVDA: "A" }, tiers: {} }); S1[K.stance] = JSON.stringify("bullish");
  S1[K.view] = JSON.stringify("stocks");
  var S1orig = clone(S1);
  var B1 = boot({ store: S1, pm: SERVER_DOC });
  var firstStance = stanceOn(B1), firstTier = tierSel(B1, "NVDA") && tierSel(B1, "NVDA").value;
  await flush(120);
  t("all scripts load in the sandbox", B1.loadErrors.length === 0, B1.loadErrors);
  t("first paint uses localStorage at once (NVDA tier A · bullish) before the server answers", firstTier === "A" && firstStance === "bullish", [firstTier, firstStance]);
  t("on open: exactly one GET ?doc=pm with cache no-store · no PUT (NVDA and the stance exist on the server → server wins)", B1.allPmCalls() === "GET:no-store" && B1.pmPuts.length === 0, B1.allPmCalls());
  t("server values adopted into the localStorage cache (tierConfig · entryProgress · megaStance · allocPolicy)",
    JSON.stringify(B1.local(K.tier)) === JSON.stringify({ map: { NVDA: "C", META: "B" }, tiers: { A: { min: 6, max: 18 } } }) &&
    JSON.stringify(B1.local(K.entry)) === JSON.stringify(SERVER_DOC.entryProgress) && B1.local(K.stance) === "bearish" &&
    JSON.stringify(B1.local(K.alloc)) === JSON.stringify(SERVER_DOC.allocPolicy), [B1.local(K.tier), B1.local(K.entry), B1.local(K.stance)]);
  t("re-rendered with the server values: NVDA tier C · META tier B · stance bearish · NVDA entry 1 ticked",
    tierSel(B1, "NVDA").value === "C" && tierSel(B1, "META").value === "B" && stanceOn(B1) === "bearish" && !!entryBox(B1, "NVDA", "1") && entryBox(B1, "NVDA", "1").checked,
    [tierSel(B1, "NVDA") && tierSel(B1, "NVDA").value, stanceOn(B1)]);
  var bk1 = B1.local(K.backup);
  t("first adopt on this device kept a one-time backup of the old local values (pmSettingsLocalBackup_v1)",
    !!bk1 && bk1.values && JSON.stringify(bk1.values.tierConfig) === S1orig[K.tier] && JSON.stringify(bk1.values.megaStance) === S1orig[K.stance] &&
    bk1.values.entryProgress === null && bk1.values.allocPolicy === null && /^\d{4}-\d\d-\d\dT/.test(bk1.savedAt), bk1);
  t("pmCurrentView_v1 stays on this device (still stocks) · never part of a request", B1.local(K.view) === "stocks" && B1.fetches.every(function (f) { return f.url.indexOf("View") < 0; }));
  t("no note · no console.error · nothing pending", failNote(B1.html()) === "" && B1.errors.length === 0 && pendingOps(B1).length === 0, B1.errors);
  // server ไม่มีบางคีย์ → ค่าในเครื่องของคีย์นั้นถูกส่งขึ้น (เฉพาะคีย์นั้น · จาก GET สด) — "ใช้ร่วมกันทุกเครื่อง" เป็นจริง
  var S1b = {}; S1b[K.alloc] = JSON.stringify({ indexTicker: "VOO" }); S1b[K.stance] = JSON.stringify("bearish");
  var B1b = boot({ store: S1b, pm: { v: 1, tierConfig: { map: { NVDA: "B" }, tiers: {} }, updatedAt: iso(-86400000) } });
  await flush(150);
  var p1b = B1b.pmPuts[0] && B1b.pmPuts[0].data;
  t("server doc without allocPolicy/megaStance → one GET,PUT uploading just those two local keys · tierConfig = the server's · local values kept",
    B1b.allPmCalls() === "GET:no-store,PUT" && !!p1b && JSON.stringify(p1b.allocPolicy) === JSON.stringify({ indexTicker: "VOO" }) && p1b.megaStance === "bearish" &&
    JSON.stringify(p1b.tierConfig) === JSON.stringify({ map: { NVDA: "B" }, tiers: {} }) && JSON.stringify(B1b.local(K.alloc)) === JSON.stringify({ indexTicker: "VOO" }) &&
    B1b.local(K.stance) === "bearish" && B1b.local(K.tier).map.NVDA === "B" && pendingOps(B1b).length === 0, [B1b.allPmCalls(), p1b]);

  // ================= 1c. ครั้งแรกของเครื่องที่มีค่าเดิม (rollout): backup + รวมรายตัว · server ชนะเมื่อชน =================
  console.log("== 1c. rollout: first adopt merges per ticker, server wins on conflicts ==");
  var S1c = {};
  S1c[K.tier] = JSON.stringify({ map: { NVDA: "A", AMD: "B" }, tiers: { B: { max: 9 }, C: { max: 4 } } });
  S1c[K.entry] = JSON.stringify({ NVDA: { "2": true }, AMD: { "1": true }, TSM: {} });
  S1c[K.stance] = JSON.stringify("bearish");
  S1c[K.alloc] = JSON.stringify({ indexTicker: "QQQM", indexPct: 40 });
  var S1cOrig = clone(S1c);
  var SRV1c = { v: 1, tierConfig: { map: { NVDA: "C" }, tiers: { B: { max: 12 } } }, entryProgress: { NVDA: { "1": true } }, allocPolicy: { indexTicker: "VOO" }, updatedAt: iso(-86400000) };
  var B1c = boot({ store: S1c, pm: SRV1c });
  await flush(150);
  var p1c = B1c.pmPuts[0] && B1c.pmPuts[0].data;
  t("one GET then one PUT", B1c.allPmCalls() === "GET:no-store,PUT", B1c.allPmCalls());
  t("tierConfig: server wins NVDA (C) and tier B · local-only AMD + tier C uploaded",
    !!p1c && JSON.stringify(p1c.tierConfig.map) === JSON.stringify({ NVDA: "C", AMD: "B" }) && JSON.stringify(p1c.tierConfig.tiers) === JSON.stringify({ B: { max: 12 }, C: { max: 4 } }), p1c && p1c.tierConfig);
  t("entryProgress: server wins NVDA (its ticks only) · local-only AMD uploaded · empty local TSM not uploaded",
    !!p1c && JSON.stringify(p1c.entryProgress) === JSON.stringify({ NVDA: { "1": true }, AMD: { "1": true } }), p1c && p1c.entryProgress);
  t("allocPolicy: server's indexTicker VOO kept · local-only indexPct 40 added · megaStance (server lacks it) uploaded",
    !!p1c && JSON.stringify(p1c.allocPolicy) === JSON.stringify({ indexTicker: "VOO", indexPct: 40 }) && p1c.megaStance === "bearish", p1c && [p1c.allocPolicy, p1c.megaStance]);
  var bk1c = B1c.local(K.backup);
  t("backup holds the old local values exactly as they were before the first adopt",
    !!bk1c && ["tierConfig", "entryProgress", "megaStance", "allocPolicy"].every(function (k, i) { return JSON.stringify(bk1c.values[k]) === S1cOrig[[K.tier, K.entry, K.stance, K.alloc][i]]; }), bk1c);
  t("local cache = the merged doc (NVDA C · AMD B · NVDA entry {1} · AMD entry {1}) · nothing pending",
    B1c.local(K.tier).map.NVDA === "C" && B1c.local(K.tier).map.AMD === "B" && JSON.stringify(B1c.local(K.entry).NVDA) === '{"1":true}' && B1c.local(K.entry).AMD["1"] === true &&
    pendingOps(B1c).length === 0, [B1c.local(K.tier), B1c.local(K.entry)]);
  // เปิดอีกครั้ง (backup มีแล้ว) → ไม่รวมซ้ำ · backup ไม่ถูกเขียนทับ
  var S1c2 = clone(B1c.store);
  var t2 = JSON.parse(S1c2[K.tier]); t2.map.ZZZ = "A"; S1c2[K.tier] = JSON.stringify(t2);
  var B1c2 = boot({ store: S1c2, pm: B1c.pm.doc });
  await flush(150);
  t("second open (backup present): no merge again, no PUT · stray local-only ZZZ replaced by the server value · backup unchanged",
    B1c2.pmPuts.length === 0 && B1c2.local(K.tier).map.ZZZ === undefined && JSON.stringify(B1c2.local(K.backup)) === JSON.stringify(bk1c), [B1c2.allPmCalls(), B1c2.local(K.tier)]);

  // ================= 2. server ว่าง + เครื่องมีค่า → ย้ายครั้งเดียว =================
  console.log("== 2. server empty + local values → one migration PUT ==");
  var S2 = {};
  S2[K.tier] = JSON.stringify({ map: { NVDA: "B", PLTR: "C" }, tiers: { C: { max: 4 } } });
  S2[K.entry] = JSON.stringify({ NVDA: { "1": true, "3": true }, META: {} });
  S2[K.stance] = JSON.stringify("bearish");
  S2[K.alloc] = JSON.stringify({ indexTicker: "QQQM", indexPct: 40, maxSinglePct: 12, splitMethod: "equal" });
  S2[K.view] = JSON.stringify("stocks");
  var before2 = clone(S2);
  var B2 = boot({ store: S2, pm: null });
  await flush(150);
  var m2 = B2.pmPuts[0] && B2.pmPuts[0].data;
  t("server empty → GET then exactly one PUT ?doc=pm", B2.allPmCalls() === "GET:no-store,PUT" && B2.pmPuts.length === 1, B2.allPmCalls());
  t("migration body = { v:1, the 4 local values verbatim, updatedAt ISO } · nothing else (no pmCurrentView)",
    !!m2 && m2.v === 1 && JSON.stringify(m2.tierConfig) === before2[K.tier] && JSON.stringify(m2.entryProgress) === before2[K.entry] &&
    JSON.stringify(m2.megaStance) === before2[K.stance] && JSON.stringify(m2.allocPolicy) === before2[K.alloc] && /^\d{4}-\d\d-\d\dT/.test(m2.updatedAt) &&
    Object.keys(m2).sort().join() === "allocPolicy,entryProgress,megaStance,tierConfig,updatedAt,v", m2);
  t("server now holds the migrated doc (validator accepted it) · local values unchanged · no note", JSON.stringify(B2.pm.doc) === JSON.stringify(m2) &&
    [K.tier, K.entry, K.stance, K.alloc, K.view].every(function (k) { return B2.store[k] === before2[k]; }) && failNote(B2.html()) === "");
  await flush(DEBOUNCE_WAIT);
  t("…and only once (no further PUT later)", B2.pmPuts.length === 1, B2.pmPuts.length);
  var B2b = boot({ store: {}, pm: B2.pm.doc });
  await flush(120);
  t("a second device with empty storage opens the page → gets the migrated values (NVDA tier B · bearish) · no PUT",
    B2b.pmPuts.length === 0 && B2b.local(K.tier).map.NVDA === "B" && B2b.local(K.stance) === "bearish" && tierSel(B2b, "NVDA").value === "B" && stanceOn(B2b) === "bearish",
    [B2b.pmPuts.length, B2b.local(K.tier)]);
  var B2c = boot({ store: {}, pm: null });
  await flush(150);
  t("server empty + nothing local → GET only, no PUT", B2c.allPmCalls() === "GET:no-store" && B2c.pmPuts.length === 0, B2c.allPmCalls());
  var S2d = {}; S2d[K.view] = JSON.stringify("stocks");
  var B2d = boot({ store: S2d, pm: null });
  await flush(150);
  t("server empty + only pmCurrentView_v1 local → no PUT (the view is not a server setting)", B2d.pmPuts.length === 0, B2d.allPmCalls());

  // ================= 3. GET ล้ม → ไม่ PUT · ข้อความเบา ๆ =================
  console.log("== 3. GET fails → never PUT, quiet note ==");
  var f3 = { failGet: true };
  var S3 = {}; S3[K.tier] = JSON.stringify({ map: { NVDA: "B" }, tiers: {} });
  var B3 = boot({ store: S3, pm: SERVER_DOC, flags: function () { return f3; } });
  await flush(150);
  t("GET 503 on open → no PUT · local values still drive the page (NVDA tier B) · quiet note '" + OFFLINE_TH + "' (no failure note)",
    B3.pmPuts.length === 0 && tierSel(B3, "NVDA").value === "B" && B3.local(K.tier).map.NVDA === "B" && (noteOf(B3.html(), "offline") || "").indexOf(OFFLINE_TH) >= 0 &&
    noteOf(B3.html(), "failed") === null, [B3.allPmCalls(), failNote(B3.html())]);
  var f3b = { rejectGet: true };
  var B3b = boot({ store: clone(S3), pm: null, flags: function () { return f3b; } });
  var f3c = { throwGet: true };
  var B3c = boot({ store: clone(S3), pm: null, flags: function () { return f3c; } });
  await flush(150);
  t("GET rejects / throws on open (server may be empty) → still no PUT (never migrate blind)", B3b.pmPuts.length === 0 && B3c.pmPuts.length === 0 && B3b.loadErrors.length === 0 && B3c.loadErrors.length === 0);
  f3.failGet = false;
  B3.mark(); B3.tabReturn(); await flush(150);
  t("tab return after the outage → exactly one GET · server values adopted (NVDA tier C — exists on the server, server wins) · no PUT · quiet note gone",
    B3.pmCalls() === "GET" && B3.pmPuts.length === 0 && tierSel(B3, "NVDA").value === "C" && failNote(B3.html()) === "", [B3.pmCalls(), tierSel(B3, "NVDA") && tierSel(B3, "NVDA").value]);

  // ================= P. ฐานเก่า/ว่าง ต้องไม่ทับค่าทั้งก้อนของ server (review: P1 · P2 · P3) =================
  console.log("== P. edits on a stale/empty local base never replace the server's whole setting ==");
  // P1: ล้างข้อมูลเว็บ · GET แรกล้ม · ผู้ใช้ตั้ง NVDA=A · GET ถัดไปได้
  var fP1 = { failGet: true };
  var P1 = boot({ store: {}, pm: SERVER_DOC, flags: function () { return fP1; } });
  await flush(200);
  var p1Offline = (noteOf(P1.html(), "offline") || "").indexOf(OFFLINE_TH) >= 0;
  fP1.failGet = false;
  setTier(P1, "NVDA", "A");
  await flush(DEBOUNCE_WAIT);
  t("P1 cleared site data + first GET 503 + set NVDA=A → server tierConfig keeps META B and tier A override, only NVDA → A · quiet note was shown, now gone",
    p1Offline && JSON.stringify(P1.pm.doc.tierConfig) === JSON.stringify({ map: { NVDA: "A", META: "B" }, tiers: { A: { min: 6, max: 18 } } }) &&
    JSON.stringify(P1.pm.doc.entryProgress) === JSON.stringify(SERVER_DOC.entryProgress) && failNote(P1.html()) === "", [p1Offline, P1.pm.doc.tierConfig]);
  t("P1 local cache now = server + the edit (META B · tier A override back on this device)", JSON.stringify(P1.local(K.tier)) === JSON.stringify(P1.pm.doc.tierConfig), P1.local(K.tier));
  // P2: กลับแท็บ (> 30 วิ) · อีกเครื่องตั้ง META=A · ผู้ใช้แก้ NVDA ระหว่างที่ GET ยังไม่ตอบ
  var fP2 = {};
  var P2 = boot({ store: {}, pm: SERVER_DOC, flags: function () { return fP2; } });
  await flush(200);
  P2.pm.doc = clone(SERVER_DOC); P2.pm.doc.tierConfig.map.META = "A"; P2.pm.doc.updatedAt = iso(-1000);
  var realNow0 = Date.now;
  Date.now = function () { return realNow0() + 31000; };
  try {
    fP2.holdGet = true;
    P2.tabReturn(); await flush(30);
    setTier(P2, "NVDA", "B");
    fP2.holdGet = false; P2.releaseGets();
    await flush(DEBOUNCE_WAIT);
  } finally { Date.now = realNow0; }
  t("P2 edit made while the tab-return GET was held → the other device's META=A survives · NVDA=B applied · tiers kept",
    JSON.stringify(P2.pm.doc.tierConfig) === JSON.stringify({ map: { NVDA: "B", META: "A" }, tiers: { A: { min: 6, max: 18 } } }) && P2.local(K.tier).map.META === "A", P2.pm.doc.tierConfig);
  // P3: แก้ค้างส่ง (PUT ล้ม) ข้ามการ reload · ระหว่างนั้นอีกเครื่องตั้ง PLTR=B (ทีหลัง)
  var fP3 = { failPut: true };
  var P3 = boot({ store: {}, pm: SERVER_DOC, flags: function () { return fP3; } });
  await flush(200);
  setTier(P3, "META", "A");
  await flush(DEBOUNCE_WAIT);
  var p3ops = pendingOps(P3);
  var newer = clone(SERVER_DOC); newer.tierConfig.map.PLTR = "B"; newer.updatedAt = "2099-01-01T00:00:00.000Z";
  var P3r = boot({ store: clone(P3.store), pm: newer });
  await flush(300);
  t("P3 the failed edit is stored as one op {tierConfig · map.META = A · base B}",
    p3ops.length === 1 && p3ops[0].key === "tierConfig" && JSON.stringify(p3ops[0].path) === '["map","META"]' && p3ops[0].value === "A" && p3ops[0].base === "B" && /^\d{4}-/.test(p3ops[0].at), p3ops);
  t("P3 reload → GET,PUT · META=A applied on top of the newer server doc · the other device's PLTR=B kept · tiers kept · nothing pending",
    P3r.allPmCalls() === "GET:no-store,PUT" && JSON.stringify(P3r.pm.doc.tierConfig) === JSON.stringify({ map: { NVDA: "C", META: "A", PLTR: "B" }, tiers: { A: { min: 6, max: 18 } } }) &&
    pendingOps(P3r).length === 0 && noteOf(P3r.html(), "superseded") === null, [P3r.allPmCalls(), P3r.pm.doc.tierConfig]);

  // ================= 4. เปลี่ยน Tier → หน่วง → GET สด → PUT เดียว (แก้เฉพาะจุดที่เปลี่ยน) =================
  console.log("== 4. change a tier → debounced GET + one PUT, only the changed entry replaced ==");
  var B4 = boot({ store: {}, pm: SERVER_DOC });
  await flush(120);
  B4.pm.doc.entryProgress = { NVDA: { "1": true, "2": true }, AMD: { "1": true } };
  B4.pm.doc.updatedAt = iso(-5000);
  var b4At = B4.pm.doc.updatedAt;
  B4.mark();
  var changed4 = setTier(B4, "NVDA", "A");
  var immediate4 = B4.local(K.tier);
  await flush(300);
  var early4 = B4.pmCalls(), shownEarly = tierSel(B4, "NVDA").value;
  await flush(DEBOUNCE_WAIT);
  var p4 = B4.pmPuts[0] && B4.pmPuts[0].data;
  t("change event wrote localStorage at once (NVDA → A) and the page re-rendered with it before any request",
    changed4 && immediate4.map.NVDA === "A" && early4 === "" && shownEarly === "A", [changed4, immediate4, early4, shownEarly]);
  t("after the debounce: exactly GET then one PUT", B4.pmCalls() === "GET,PUT" && B4.pmPuts.length === 1, B4.pmCalls());
  t("PUT body: tierConfig = server's with only NVDA → A · entryProgress = the OTHER device's newer value · megaStance/allocPolicy from server · v 1 · new updatedAt",
    !!p4 && p4.v === 1 && JSON.stringify(p4.tierConfig) === JSON.stringify({ map: { NVDA: "A", META: "B" }, tiers: { A: { min: 6, max: 18 } } }) &&
    JSON.stringify(p4.entryProgress) === JSON.stringify({ NVDA: { "1": true, "2": true }, AMD: { "1": true } }) && p4.megaStance === "bearish" &&
    JSON.stringify(p4.allocPolicy) === JSON.stringify(SERVER_DOC.allocPolicy) && Date.parse(p4.updatedAt) > Date.parse(b4At), p4);
  t("after the save the other device's entry ticks reach this device's cache too",
    JSON.stringify(B4.local(K.entry)) === JSON.stringify({ NVDA: { "1": true, "2": true }, AMD: { "1": true } }), B4.local(K.entry));
  t("nothing pending after success (pmSettingsPending_v1 cleared) · no note", B4.store[K.pending] === undefined && failNote(B4.html()) === "", B4.store[K.pending]);
  B4.mark(); setTier(B4, "NVDA", "A"); await flush(DEBOUNCE_WAIT);
  t("choosing the same tier again sends nothing", B4.pmCalls() === "", B4.pmCalls());
  B4.mark(); clickStance(B4, "bullish"); await flush(DEBOUNCE_WAIT);
  var p4s = B4.pmPuts[B4.pmPuts.length - 1].data;
  t("stance click → GET,PUT with megaStance bullish only changed", B4.pmCalls() === "GET,PUT" && p4s.megaStance === "bullish" && JSON.stringify(p4s.tierConfig) === JSON.stringify(p4.tierConfig), B4.pmCalls());
  // ติ๊ก entry ขณะอีกเครื่องติ๊กอีกช่องของหุ้นตัวเดียวกัน → ทั้งสองติ๊กอยู่
  var box = B4.find("data-pm-entry", null).filter(function (e) { return !e.disabled && !e.checked; })[0];
  var bt = box && box.getAttribute("data-pm-entry"), bn = box && box.getAttribute("data-n");
  B4.pm.doc.entryProgress[bt] = B4.pm.doc.entryProgress[bt] || {}; B4.pm.doc.entryProgress[bt]["99"] = true; B4.pm.doc.updatedAt = iso(-1000);
  B4.mark();
  var ticked = box ? tick(B4, bt, bn, true) : false;
  await flush(DEBOUNCE_WAIT);
  var p4e = B4.pmPuts[B4.pmPuts.length - 1].data;
  t("ticking an entry box → GET,PUT · that tick added · the other device's tick on the same ticker kept · AMD kept", ticked && B4.pmCalls() === "GET,PUT" &&
    p4e.entryProgress[bt][bn] === true && p4e.entryProgress[bt]["99"] === true && p4e.entryProgress.AMD["1"] === true, [ticked, B4.pmCalls(), p4e && p4e.entryProgress]);
  B4.mark(); tick(B4, bt, bn, false); await flush(DEBOUNCE_WAIT);
  var p4u = B4.pmPuts[B4.pmPuts.length - 1].data;
  t("un-ticking → GET,PUT · only that tick removed", B4.pmCalls() === "GET,PUT" && p4u.entryProgress[bt][bn] === undefined && p4u.entryProgress[bt]["99"] === true, p4u && p4u.entryProgress[bt]);
  // index core: ตัวอักษรนอก ticker ถูกตัดทิ้งก่อนตัดความยาว
  var idxEl = B4.find("data-pm-alloc", "indexTicker")[0];
  B4.mark();
  if (idxEl) { idxEl.value = " voo🚀ก "; B4.fire(idxEl, "change"); }
  await flush(DEBOUNCE_WAIT);
  var p4i = B4.pmPuts[B4.pmPuts.length - 1].data;
  t("index ticker typed ' voo🚀ก ' → stored and sent as VOO (ticker characters only) · other alloc fields from the server kept",
    !!idxEl && B4.local(K.alloc).indexTicker === "VOO" && B4.pmCalls() === "GET,PUT" && p4i.allocPolicy.indexTicker === "VOO" && p4i.allocPolicy.indexPct === 50, [B4.local(K.alloc), p4i && p4i.allocPolicy]);
  B4.mark(); B4.fire(B4.find("data-pm-cview", "stocks")[0], "click"); await flush(DEBOUNCE_WAIT);
  t("table view switch (pmCurrentView_v1) → stored locally, no request to the server", B4.local(K.view) === "stocks" && B4.pmCalls() === "", B4.pmCalls());
  t("no PUT body ever carried pmCurrentView / pmCurrentView_v1", B4.pmPuts.every(function (b) { return JSON.stringify(b).indexOf("View") < 0; }));

  // ================= 5. PUT ล้ม → ค่าในเครื่องคงอยู่ + ข้อความ + ลองใหม่ =================
  console.log("== 5. PUT fails → local kept + note + retried ==");
  var f5 = { failPut: true };
  var B5 = boot({ store: {}, pm: SERVER_DOC, flags: function () { return f5; } });
  await flush(120);
  B5.mark(); setTier(B5, "META", "A"); await flush(DEBOUNCE_WAIT);
  var h5 = B5.html();
  t("PUT 500 → local value kept (META A) · page still shows A", B5.local(K.tier).map.META === "A" && tierSel(B5, "META").value === "A" && B5.pmCalls() === "GET,PUT", B5.pmCalls());
  t("note shown: '" + FAIL_TH + "' (role=status) · no ฿ · no advisory words", (noteOf(h5, "failed") || "").indexOf(FAIL_TH) >= 0 && /role="status"/.test(failNote(h5)) &&
    failNote(h5).indexOf("฿") < 0 && !ADVISORY_TH.test(failNote(h5)) && !ADVISORY_EN.test(failNote(h5)), failNote(h5));
  t("pending op persisted for the next page load (pmSettingsPending_v1.ops)", pendingOps(B5).length === 1 && pendingOps(B5)[0].key === "tierConfig", B5.store[K.pending]);
  t("server copy unchanged (META still B there)", B5.pm.doc.tierConfig.map.META === "B");
  await flush(DEBOUNCE_WAIT);
  t("no automatic retry loop while nothing happens", B5.pmCalls() === "GET,PUT", B5.pmCalls());
  f5.failPut = false;
  B5.mark(); clickStance(B5, "bullish"); await flush(DEBOUNCE_WAIT);
  var p5 = B5.pmPuts[B5.pmPuts.length - 1].data;
  t("next edit (stance) retries: GET,PUT carrying BOTH the pending tier op (META A) and the new megaStance", B5.pmCalls() === "GET,PUT" && p5.tierConfig.map.META === "A" && p5.megaStance === "bullish", [B5.pmCalls(), p5]);
  t("success clears the note and the pending ops", failNote(B5.html()) === "" && B5.store[K.pending] === undefined);
  f5.failPut = true;
  B5.mark(); setTier(B5, "NVDA", "B"); await flush(DEBOUNCE_WAIT);
  f5.failPut = false;
  var noteBefore = (noteOf(B5.html(), "failed") || "").indexOf(FAIL_TH) >= 0;
  B5.mark(); B5.tabReturn(); await flush(150);
  t("PUT failed again → tab return (focus + visibilitychange) retries exactly once: GET,PUT · tier NVDA B on the server · note gone",
    noteBefore && B5.pmCalls() === "GET,PUT" && B5.pm.doc.tierConfig.map.NVDA === "B" && failNote(B5.html()) === "", [noteBefore, B5.pmCalls()]);
  var f5b = { failGet: false };
  var B5b = boot({ store: {}, pm: SERVER_DOC, flags: function () { return f5b; } });
  await flush(120);
  f5b.failGet = true;
  B5b.mark(); setTier(B5b, "NVDA", "A"); await flush(DEBOUNCE_WAIT);
  t("GET fails while saving → no PUT · failure note · op kept", B5b.pmCalls() === "GET" && B5b.pmPuts.length === 0 && (noteOf(B5b.html(), "failed") || "").indexOf(FAIL_TH) >= 0 && pendingOps(B5b).length === 1, B5b.pmCalls());

  // ================= 5c. ค้างส่งข้ามการ reload · ชนกับค่าที่ใหม่กว่าจากเครื่องอื่น =================
  console.log("== 5c. pending ops across a reload · conflicts with newer changes ==");
  function synced(extraTier) {
    var s = {};
    s[K.tier] = JSON.stringify(extraTier); s[K.entry] = JSON.stringify(SERVER_DOC.entryProgress); s[K.stance] = JSON.stringify("bearish");
    s[K.alloc] = JSON.stringify(SERVER_DOC.allocPolicy); s[K.backup] = JSON.stringify({ savedAt: iso(-86400000), values: {} });
    return s;
  }
  var opMeta = { id: "op-meta", key: "tierConfig", path: ["map", "META"], value: "A", base: "B", at: iso(-600000) };
  var opNvda = { id: "op-nvda", key: "tierConfig", path: ["map", "NVDA"], value: "B", base: "C", at: iso(-600000) };
  // (a) server ไม่เปลี่ยนที่จุดนั้น → ใช้ op · ส่วนอื่นของ tierConfig คงเดิม
  var S5a = synced({ map: { NVDA: "C", META: "A" }, tiers: { A: { min: 6, max: 18 } } }); S5a[K.pending] = JSON.stringify({ ops: [opMeta] });
  var B5a = boot({ store: S5a, pm: SERVER_DOC });
  await flush(150);
  var p5a = B5a.pmPuts[0] && B5a.pmPuts[0].data;
  t("reload with a pending op (META A, base B) and the server still at B → GET,PUT · only META changes · tiers/entryProgress/megaStance kept · op cleared",
    B5a.allPmCalls() === "GET:no-store,PUT" && !!p5a && JSON.stringify(p5a.tierConfig) === JSON.stringify({ map: { NVDA: "C", META: "A" }, tiers: { A: { min: 6, max: 18 } } }) &&
    JSON.stringify(p5a.entryProgress) === JSON.stringify(SERVER_DOC.entryProgress) && p5a.megaStance === "bearish" && pendingOps(B5a).length === 0 && failNote(B5a.html()) === "",
    [B5a.allPmCalls(), p5a]);
  // (b) อีกเครื่องเปลี่ยน META ทีหลัง op → ทิ้ง op · ใช้ค่าของ server · ข้อความหนึ่งบรรทัด
  var SRV5b = clone(SERVER_DOC); SRV5b.tierConfig.map.META = "C"; SRV5b.updatedAt = iso(-60000);
  var S5b = synced({ map: { NVDA: "C", META: "A" }, tiers: { A: { min: 6, max: 18 } } }); S5b[K.pending] = JSON.stringify({ ops: [opMeta] });
  var B5bb = boot({ store: S5b, pm: SRV5b });
  await flush(150);
  t("server changed META to C after the pending op (newer updatedAt) → op dropped, no PUT · local META = C · note '" + SUPERSEDED_TH + "' · op cleared",
    B5bb.pmPuts.length === 0 && B5bb.local(K.tier).map.META === "C" && tierSel(B5bb, "META").value === "C" && (noteOf(B5bb.html(), "superseded") || "").indexOf(SUPERSEDED_TH) >= 0 &&
    pendingOps(B5bb).length === 0, [B5bb.allPmCalls(), B5bb.local(K.tier), failNote(B5bb.html())]);
  // (c) สอง op: op หนึ่งชน (META) อีก op ไม่ชน (NVDA) → ส่งเฉพาะตัวที่ไม่ชน
  var S5c = synced({ map: { NVDA: "B", META: "A" }, tiers: { A: { min: 6, max: 18 } } }); S5c[K.pending] = JSON.stringify({ ops: [opMeta, opNvda] });
  var B5c = boot({ store: S5c, pm: SRV5b });
  await flush(150);
  var p5c = B5c.pmPuts[0] && B5c.pmPuts[0].data;
  t("one conflicting op + one clean op → GET,PUT with NVDA=B applied and META kept at the server's C · superseded note · nothing pending",
    B5c.allPmCalls() === "GET:no-store,PUT" && !!p5c && p5c.tierConfig.map.NVDA === "B" && p5c.tierConfig.map.META === "C" && noteOf(B5c.html(), "superseded") !== null &&
    pendingOps(B5c).length === 0 && B5c.local(K.tier).map.META === "C" && B5c.local(K.tier).map.NVDA === "B", [B5c.allPmCalls(), p5c && p5c.tierConfig]);
  B5c.mark(); clickStance(B5c, "bullish"); await flush(DEBOUNCE_WAIT);
  t("the superseded note goes away at the next edit", noteOf(B5c.html(), "superseded") === null && B5c.pmCalls() === "GET,PUT", B5c.pmCalls());
  // (d) อีกเครื่องตั้งค่าเดียวกับ op ที่ค้าง (ทีหลัง) → ไม่ใช่การชน: ทิ้งเงียบ ๆ ไม่มี PUT ไม่มีข้อความ
  var SRV5d = clone(SERVER_DOC); SRV5d.tierConfig.map.META = "A"; SRV5d.updatedAt = iso(-60000);
  var S5d = synced({ map: { NVDA: "C", META: "A" }, tiers: { A: { min: 6, max: 18 } } }); S5d[K.pending] = JSON.stringify({ ops: [opMeta] });
  var B5d = boot({ store: S5d, pm: SRV5d });
  await flush(150);
  t("the other device already set the same value (META A) later → op dropped silently: no PUT · no superseded note · nothing pending",
    B5d.pmPuts.length === 0 && noteOf(B5d.html(), "superseded") === null && failNote(B5d.html()) === "" && pendingOps(B5d).length === 0 && B5d.local(K.tier).map.META === "A",
    [B5d.allPmCalls(), failNote(B5d.html()), pendingOps(B5d)]);
  // (e) แก้จุดเดิมสองครั้ง (C→A→B) ค้างทั้งคู่ · อีกเครื่องแก้คีย์อื่นทีหลัง (updatedAt ใหม่กว่าทั้งสอง op) → ไม่ชน: ได้ B
  var SRV5e = clone(SERVER_DOC); SRV5e.megaStance = "bullish"; SRV5e.updatedAt = iso(-60000);
  var opN1 = { id: "op-n1", key: "tierConfig", path: ["map", "NVDA"], value: "A", base: "C", at: iso(-600000) };
  var opN2 = { id: "op-n2", key: "tierConfig", path: ["map", "NVDA"], value: "B", base: "A", at: iso(-540000) };
  var S5e = synced({ map: { NVDA: "B", META: "B" }, tiers: { A: { min: 6, max: 18 } } }); S5e[K.pending] = JSON.stringify({ ops: [opN1, opN2] });
  var B5e = boot({ store: S5e, pm: SRV5e });
  await flush(150);
  var p5e = B5e.pmPuts[0] && B5e.pmPuts[0].data;
  t("two pending edits on one path (C→A→B) + another device changed only megaStance later → GET,PUT with NVDA B (the last edit) · bullish kept · no superseded note",
    B5e.allPmCalls() === "GET:no-store,PUT" && !!p5e && p5e.tierConfig.map.NVDA === "B" && p5e.megaStance === "bullish" && noteOf(B5e.html(), "superseded") === null && pendingOps(B5e).length === 0,
    [B5e.allPmCalls(), p5e && p5e.tierConfig, failNote(B5e.html())]);
  // (f) เหมือน (e) แต่อีกเครื่องเปลี่ยน NVDA เป็น D ระหว่างสอง op → op แรกชน (ทิ้ง) · op หลังใหม่กว่า → ใช้ (B ชนะตามเวลา)
  var SRV5f = clone(SERVER_DOC); SRV5f.tierConfig.map.NVDA = "A"; SRV5f.updatedAt = iso(-570000);
  var opF2 = { id: "op-f2", key: "tierConfig", path: ["map", "NVDA"], value: "C", base: "B", at: iso(-540000) };
  var opF1 = { id: "op-f1", key: "tierConfig", path: ["map", "NVDA"], value: "B", base: "C", at: iso(-600000) };
  var S5f = synced({ map: { NVDA: "C", META: "B" }, tiers: { A: { min: 6, max: 18 } } }); S5f[K.pending] = JSON.stringify({ ops: [opF1, opF2] });
  var B5f = boot({ store: S5f, pm: SRV5f });
  await flush(150);
  var p5f = B5f.pmPuts[0] && B5f.pmPuts[0].data;
  t("other device set NVDA=A between two pending edits → the older edit is dropped (note) · the newer edit (NVDA C, made after it) still applies",
    B5f.allPmCalls() === "GET:no-store,PUT" && !!p5f && p5f.tierConfig.map.NVDA === "C" && noteOf(B5f.html(), "superseded") !== null && pendingOps(B5f).length === 0,
    [B5f.allPmCalls(), p5f && p5f.tierConfig, failNote(B5f.html())]);

  // ================= 5d. ค่าที่มีแต่ในเครื่อง (ส่งขึ้นแบบรวม) ต้องไม่ทับค่าที่ server เพิ่งได้มาจากอีกเครื่อง (review S3) =================
  console.log("== 5d. queued uploads of device-only values never overwrite what the server gained since ==");
  var noAlloc = clone(SERVER_DOC); delete noAlloc.allocPolicy;
  // S3: server ไม่มี allocPolicy → op ส่งทั้งคีย์ {VOO} ค้าง (PUT ล้ม) · อีกเครื่องเขียน allocPolicy {QQQM, 40} ก่อน op.at เล็กน้อย
  var S3s = {}; S3s[K.alloc] = JSON.stringify({ indexTicker: "VOO" });
  var f3s = { failPut: true };
  var E3 = boot({ store: S3s, pm: noAlloc, flags: function () { return f3s; } });
  await flush(300);
  var e3ops = pendingOps(E3);
  E3.pm.doc = clone(noAlloc); E3.pm.doc.allocPolicy = { indexTicker: "QQQM", indexPct: 40 }; E3.pm.doc.updatedAt = iso(-5000);
  f3s.failPut = false;
  E3.mark(); E3.tabReturn(); await flush(300);
  t("S3 queued whole-key upload {VOO} + the other device created allocPolicy {QQQM, 40} meanwhile → server keeps {QQQM, 40} (no PUT needed) · note '" + SUPERSEDED_TH + "' · local = server's · nothing pending",
    e3ops.length === 1 && e3ops[0].key === "allocPolicy" && e3ops[0].path.length === 0 && JSON.stringify(E3.pm.doc.allocPolicy) === JSON.stringify({ indexTicker: "QQQM", indexPct: 40 }) &&
    noteOf(E3.html(), "superseded") !== null && JSON.stringify(E3.local(K.alloc)) === JSON.stringify({ indexTicker: "QQQM", indexPct: 40 }) && pendingOps(E3).length === 0,
    [e3ops, E3.pmCalls(), E3.pm.doc.allocPolicy, failNote(E3.html())]);
  // ฟิลด์ที่มีแต่ในเครื่องยังถูกเพิ่ม · ฟิลด์ที่ชน = ของ server
  var S3t = {}; S3t[K.alloc] = JSON.stringify({ indexTicker: "VOO", maxSinglePct: 12 });
  var f3t = { failPut: true };
  var E3t = boot({ store: S3t, pm: noAlloc, flags: function () { return f3t; } });
  await flush(300);
  E3t.pm.doc = clone(noAlloc); E3t.pm.doc.allocPolicy = { indexTicker: "QQQM", indexPct: 40 }; E3t.pm.doc.updatedAt = iso(-5000);
  f3t.failPut = false;
  E3t.mark(); E3t.tabReturn(); await flush(300);
  t("…same with a device-only field: GET,PUT → allocPolicy {QQQM, 40, maxSinglePct 12} (server wins indexTicker, device-only maxSinglePct added) · note shown",
    E3t.pmCalls() === "GET,PUT" && JSON.stringify(E3t.pm.doc.allocPolicy) === JSON.stringify({ indexTicker: "QQQM", indexPct: 40, maxSinglePct: 12 }) &&
    noteOf(E3t.html(), "superseded") !== null && pendingOps(E3t).length === 0, [E3t.pmCalls(), E3t.pm.doc.allocPolicy]);
  // megaStance ทั้งคีย์ (มีแต่ในเครื่อง) · อีกเครื่องตั้งค่าอื่นไว้แล้ว → ของ server
  var S3u = {}; S3u[K.stance] = JSON.stringify("bearish");
  var noStance = clone(SERVER_DOC); delete noStance.megaStance;
  var f3u = { failPut: true };
  var E3u = boot({ store: S3u, pm: noStance, flags: function () { return f3u; } });
  await flush(300);
  E3u.pm.doc = clone(noStance); E3u.pm.doc.megaStance = "bullish"; E3u.pm.doc.updatedAt = iso(-5000);
  f3u.failPut = false;
  E3u.mark(); E3u.tabReturn(); await flush(300);
  t("queued device-only megaStance (bearish) + another device set bullish meanwhile → server keeps bullish · no PUT · note · local bullish",
    E3u.pmCalls() === "GET" && E3u.pm.doc.megaStance === "bullish" && E3u.local(K.stance) === "bullish" && noteOf(E3u.html(), "superseded") !== null && pendingOps(E3u).length === 0,
    [E3u.pmCalls(), E3u.pm.doc.megaStance]);
  // รวมรายหุ้นครั้งแรก: AMD (มีแต่ในเครื่อง) ค้าง · อีกเครื่องตั้ง AMD=C ก่อน op.at เล็กน้อย → ของ server
  var S3v = {}; S3v[K.tier] = JSON.stringify({ map: { AMD: "B" }, tiers: {} });
  var f3v = { failPut: true };
  var E3v = boot({ store: S3v, pm: SERVER_DOC, flags: function () { return f3v; } });
  await flush(300);
  var e3vops = pendingOps(E3v);
  E3v.pm.doc = clone(SERVER_DOC); E3v.pm.doc.tierConfig.map.AMD = "C"; E3v.pm.doc.updatedAt = iso(-5000);
  f3v.failPut = false;
  E3v.mark(); E3v.tabReturn(); await flush(300);
  t("queued first-adopt upload map.AMD=B + another device set AMD=C meanwhile → server keeps C · no PUT · note",
    e3vops.length === 1 && JSON.stringify(e3vops[0].path) === '["map","AMD"]' && E3v.pmCalls() === "GET" && E3v.pm.doc.tierConfig.map.AMD === "C" &&
    E3v.local(K.tier).map.AMD === "C" && noteOf(E3v.html(), "superseded") !== null && pendingOps(E3v).length === 0, [e3vops, E3v.pmCalls(), E3v.pm.doc.tierConfig.map]);
  // การกดของผู้ใช้เอง (ไม่ใช่การส่งค่าเดิมในเครื่อง) ยังใช้กติกาเวลา: เครื่องที่ล้างข้อมูลแล้ว GET แรกล้ม · กด Bearish · server เป็น bullish มานานแล้ว → bearish
  var fUs = { failGet: true };
  var EUs = boot({ store: {}, pm: SERVER_DOC, flags: function () { return fUs; } });
  await flush(200);
  var srvBull = clone(SERVER_DOC); srvBull.megaStance = "bullish"; EUs.pm.doc = srvBull;
  fUs.failGet = false;
  clickStance(EUs, "bearish"); await flush(DEBOUNCE_WAIT);
  t("an explicit user click with an empty local base (stance bearish) still wins over an OLDER server value (time rule, not 'server wins')",
    EUs.pm.doc.megaStance === "bearish" && noteOf(EUs.html(), "superseded") === null && pendingOps(EUs).length === 0, [EUs.pm.doc.megaStance, failNote(EUs.html())]);

  // ================= 6. แก้รัว ๆ = PUT น้อยครั้ง · ทีละรอบ =================
  console.log("== 6. rapid edits coalesce · single in-flight ==");
  var B6 = boot({ store: {}, pm: SERVER_DOC });
  await flush(120);
  B6.mark();
  setTier(B6, "NVDA", "A"); await flush(150); setTier(B6, "NVDA", "B"); await flush(150);
  setTier(B6, "META", "C"); await flush(150); clickStance(B6, "bullish"); await flush(150); setTier(B6, "NVDA", "A");
  await flush(DEBOUNCE_WAIT);
  var p6 = B6.pmPuts[B6.pmPuts.length - 1].data;
  t("5 edits within the debounce window (NVDA A→B→A) → exactly one GET,PUT with the final values (NVDA A · META C · bullish)",
    B6.pmCalls() === "GET,PUT" && p6.tierConfig.map.NVDA === "A" && p6.tierConfig.map.META === "C" && p6.megaStance === "bullish", [B6.pmCalls(), p6]);
  var f6 = { holdPut: false };
  var B6b = boot({ store: {}, pm: SERVER_DOC, flags: function () { return f6; } });
  await flush(120);
  f6.holdPut = true;
  B6b.mark(); setTier(B6b, "NVDA", "A"); await flush(DEBOUNCE_WAIT);
  var inflight6 = B6b.pmCalls();
  setTier(B6b, "META", "C"); await flush(DEBOUNCE_WAIT);
  var during6 = B6b.pmCalls();
  f6.holdPut = false; B6b.releasePuts(); await flush(200);
  var last6 = B6b.pmPuts[B6b.pmPuts.length - 1].data;
  t("edit while a PUT is in flight → no second request until it answers (single in-flight)", inflight6 === "GET,PUT" && during6 === "GET,PUT", [inflight6, during6]);
  t("…then exactly one more GET,PUT carrying the later edit (META C) and keeping the earlier one (NVDA A)",
    B6b.pmCalls() === "GET,PUT,GET,PUT" && last6.tierConfig.map.META === "C" && last6.tierConfig.map.NVDA === "A" && B6b.pm.doc.tierConfig.map.META === "C" && B6b.store[K.pending] === undefined,
    [B6b.pmCalls(), last6 && last6.tierConfig]);
  var f6c = { holdPut: false, failPut: false };
  var B6c = boot({ store: {}, pm: SERVER_DOC, flags: function () { return f6c; } });
  await flush(120);
  f6c.holdPut = true; f6c.failPut = true;
  B6c.mark(); setTier(B6c, "NVDA", "A"); await flush(DEBOUNCE_WAIT);
  setTier(B6c, "META", "C"); await flush(DEBOUNCE_WAIT);
  f6c.holdPut = false; B6c.releasePuts(); await flush(30);
  var failedNote6 = (noteOf(B6c.html(), "failed") || "").indexOf(FAIL_TH) >= 0;
  f6c.failPut = false;
  await flush(DEBOUNCE_WAIT);
  t("edit made while a PUT was in flight that then fails → note, then one more GET,PUT after the debounce carrying both edits · note gone",
    failedNote6 && B6c.pmCalls() === "GET,PUT,GET,PUT" && B6c.pm.doc.tierConfig.map.NVDA === "A" && B6c.pm.doc.tierConfig.map.META === "C" && failNote(B6c.html()) === "",
    [failedNote6, B6c.pmCalls()]);
  await flush(DEBOUNCE_WAIT);
  t("…and nothing after that (no loop)", B6c.pmCalls() === "GET,PUT,GET,PUT", B6c.pmCalls());

  // ================= 6d. สองแท็บ (localStorage + server เดียวกัน) =================
  console.log("== 6d. two tabs of the same origin ==");
  var SS = {}, REF = { doc: clone(SERVER_DOC) }, fA = { failPut: false }, fB = { holdPut: false };
  var TA = boot({ store: SS, pmRef: REF, flags: function () { return fA; } });
  var TB = boot({ store: SS, pmRef: REF, flags: function () { return fB; } });
  await flush(150);
  fB.holdPut = true;
  TB.mark(); clickStance(TB, "bullish"); await flush(DEBOUNCE_WAIT);           // แท็บ B: op stance · PUT ค้าง
  fA.failPut = true;
  TA.mark(); setTier(TA, "META", "A"); await flush(DEBOUNCE_WAIT);            // แท็บ A: op META · PUT (ส่ง op ทั้งสอง) ล้ม
  var opsMid = (JSON.parse(SS[K.pending] || "{}").ops || []).map(function (o) { return o.key; }).sort().join();
  fB.holdPut = false; TB.releasePuts(); await flush(150);                    // แท็บ B สำเร็จ → ลบเฉพาะ op ที่ตัวเองส่ง
  var opsAfter = JSON.parse(SS[K.pending] || "{}").ops || [];
  var tierAfter = JSON.parse(SS[K.tier]);
  t("tab B's successful PUT removes only the ops it sent: tab A's META op (added while B's PUT was in flight) stays pending",
    TB.pmCalls() === "GET,PUT" && opsMid === "megaStance,tierConfig" && opsAfter.length === 1 && opsAfter[0].key === "tierConfig" && REF.doc.megaStance === "bullish" && REF.doc.tierConfig.map.META === "B",
    [TB.pmCalls(), opsMid, opsAfter, REF.doc.megaStance]);
  t("tab B's adopt respects tab A's stored pending op: the shared cache keeps META A (not reverted to the server's B)", tierAfter.map.META === "A", tierAfter);
  fA.failPut = false;
  TB.mark(); TB.tabReturn(); await flush(150);
  t("tab return in tab B sends the remaining pending op → server META A · nothing pending", TB.pmCalls() === "GET,PUT" && REF.doc.tierConfig.map.META === "A" && SS[K.pending] === undefined, [TB.pmCalls(), REF.doc.tierConfig]);

  // ================= 7. กลับมาที่แท็บ =================
  console.log("== 7. tab return ==");
  var realNow = Date.now;
  var B7 = boot({ store: {}, pm: SERVER_DOC });
  var B7b = boot({ store: {}, pm: SERVER_DOC });
  var f7 = { failPut: false };
  var B7c = boot({ store: {}, pm: SERVER_DOC, flags: function () { return f7; } });
  await flush(150);
  B7.mark(); B7.tabReturn(); await flush(100);
  t("tab return within 30 s of the last read → no extra GET", B7.pmCalls() === "", B7.pmCalls());
  B7.pm.doc = clone(SERVER_DOC); B7.pm.doc.megaStance = "bullish"; B7.pm.doc.tierConfig.map.NVDA = "A"; B7.pm.doc.updatedAt = iso(-1000);
  B7b.pm.doc = clone(B7.pm.doc);
  Date.now = function () { return realNow() + 31000; };
  try {
    var r7 = B7.renders(), adds7 = B7.listenerAdds();
    B7.mark(); B7.tabReturn(); await flush(150);
    t("server changed on another device → focus + visibilitychange = one GET · adopted (bullish · NVDA A) · re-rendered · no PUT",
      B7.pmCalls() === "GET" && stanceOn(B7) === "bullish" && tierSel(B7, "NVDA").value === "A" && B7.local(K.stance) === "bullish" && B7.renders() > r7 && B7.pmPuts.length === 0,
      [B7.pmCalls(), stanceOn(B7), B7.renders() - r7]);
    t("no new window/document listeners from renders or syncs", B7.listenerAdds() === adds7, [adds7, B7.listenerAdds()]);
    var focusEl = B7b.find("data-pm-tierdef", "A", { "data-f": "min" })[0] || tierSel(B7b, "META");
    B7b.focusEl(focusEl);
    var r7b = B7b.renders();
    B7b.mark(); B7b.tabReturn(); await flush(150);
    var deferred = B7b.renders() === r7b && B7b.pmCalls() === "GET";
    B7b.blurAll(); await flush(30);
    t("adopt while an input of the page has focus → no render until focusout, then one render with the new values",
      !!focusEl && deferred && B7b.renders() === r7b + 1 && stanceOn(B7b) === "bullish", [!!focusEl, deferred, B7b.renders() - r7b]);
  } finally { Date.now = realNow; }
  // ค้างส่ง + อีกเครื่องเปลี่ยนจุดเดียวกันทีหลัง → ใช้ค่าของเครื่องอื่น (ไม่ย้อนทับ) · คีย์อื่นรับตามปกติ
  f7.failPut = true;
  B7c.mark(); setTier(B7c, "META", "A"); await flush(DEBOUNCE_WAIT);
  f7.failPut = false;
  B7c.pm.doc = clone(SERVER_DOC); B7c.pm.doc.tierConfig.map.META = "C"; B7c.pm.doc.megaStance = "bullish"; B7c.pm.doc.updatedAt = iso(60000);
  Date.now = function () { return realNow() + 31000; };
  try { B7c.mark(); B7c.tabReturn(); await flush(150); } finally { Date.now = realNow; }
  t("pending META=A + the other device set META=C later → tab return: GET only (op dropped, no PUT) · META C · bullish adopted · superseded note · nothing pending",
    B7c.pmCalls() === "GET" && B7c.local(K.tier).map.META === "C" && B7c.local(K.stance) === "bullish" && noteOf(B7c.html(), "superseded") !== null &&
    noteOf(B7c.html(), "failed") === null && pendingOps(B7c).length === 0 && B7c.pm.doc.tierConfig.map.META === "C", [B7c.pmCalls(), B7c.local(K.tier), failNote(B7c.html())]);

  // ================= 8. 400 / เอกสารอ่านไม่ออก / หน้าที่ประเมินไม่ได้ =================
  console.log("== 8. server refuses (400) / unreadable server doc ==");
  var B8 = boot({ store: {}, pm: SERVER_DOC });
  await flush(120);
  B8.store[K.alloc] = JSON.stringify({ indexTicker: "QQQM", satellitePool: 50, indexPct: "50" });
  B8.mark(); B8.win.PortfolioManagerPage.render(); setTier(B8, "NVDA", "A"); await flush(DEBOUNCE_WAIT);
  t("local junk in an untouched key never reaches the server (only the edited entry is sent)", B8.pmCalls() === "GET,PUT" && JSON.stringify(B8.pmPuts[0].data.allocPolicy) === JSON.stringify(SERVER_DOC.allocPolicy), B8.pmPuts[0] && B8.pmPuts[0].data.allocPolicy);
  B8.pm.doc.junk = 1;
  B8.mark(); setTier(B8, "META", "C"); await flush(DEBOUNCE_WAIT);
  var h8 = B8.html();
  t("400 from the server → note (no retry promise) + console.error · local kept", B8.pmCalls() === "GET,PUT" && noteOf(h8, "rejected") !== null && failNote(h8).indexOf(FAIL_TH) < 0 &&
    B8.errors.length > 0 && B8.local(K.tier).map.META === "C", [B8.pmCalls(), failNote(h8), B8.errors]);
  Date.now = function () { return realNow() + 31000; };
  try { B8.mark(); B8.tabReturn(); await flush(150); } finally { Date.now = realNow; }
  await flush(DEBOUNCE_WAIT);
  t("…no automatic retry after a 400 (tab return sends nothing)", B8.pmCalls() === "", B8.pmCalls());
  // engine ประเมินไม่ได้ (out.available false) → ยังเห็นข้อความสถานะ
  var realCompute = B8.win.PMEngine.compute;
  B8.win.PMEngine.compute = function () { return { available: false, reason: "ทดสอบ: ประเมินไม่ได้" }; };
  B8.win.PortfolioManagerPage.render();
  var h8u = B8.html();
  B8.win.PMEngine.compute = realCompute;
  t("render path where the engine is unavailable still shows the status note", h8u.indexOf("ทดสอบ: ประเมินไม่ได้") >= 0 && noteOf(h8u, "rejected") !== null, h8u.slice(0, 300));
  var S8b = {}; S8b[K.tier] = JSON.stringify({ map: { NVDA: "A" }, tiers: {} });
  var B8b = boot({ store: S8b, pm: { v: 2, somethingNew: true } });
  await flush(150);
  B8b.mark(); setTier(B8b, "META", "C"); await flush(DEBOUNCE_WAIT);
  t("server doc with v 2 → never overwritten (no PUT at open or after an edit) · local kept · note + console.error",
    B8b.pmPuts.length === 0 && B8b.pm.doc.v === 2 && B8b.local(K.tier).map.NVDA === "A" && noteOf(B8b.html(), "unknown") !== null && B8b.errors.length > 0, [B8b.allPmCalls(), B8b.errors]);

  // ================= 9. โค้ด =================
  var SRC = read("portfolio-manager-page.js");
  var CUT = "  // ธงแดง/มูลค่าเปลี่ยนจาก Action Center";
  t("pm-view harness anchor + names still above it", SRC.indexOf(CUT) > 0 &&
    ["function sectionCurrent", "function pieSvg", "function writeJson", "CVIEW_STORE"].every(function (k) { var i = SRC.indexOf(k); return i >= 0 && i < SRC.indexOf(CUT); }));
  t("the page calls the ?doc=pm endpoint (no new serverless function)", SRC.indexOf('"/api/portfolio?doc=pm"') >= 0 && !fs.existsSync(path.join(__dirname, "..", "api", "pm-settings.js")));
  t("every rendered state free of NaN/undefined/[object", [B1, B1c, B2, B4, B5, B5bb, B7, B8, P1, P3r].every(function (I) { return !/(NaN|undefined|\[object )/.test(I.html()); }));
  t("no ฿ inside title/aria-label on the rendered pages", [B1, B4, B5].every(function (I) { return !/(title|aria-label)="[^"]*฿/.test(I.html()); }));
  t("status texts carry no money and no advisory words", [FAIL_TH, OFFLINE_TH, SUPERSEDED_TH].every(function (s) { return s.indexOf("฿") < 0 && !ADVISORY_TH.test(s) && !ADVISORY_EN.test(s); }));

  finish();
})().catch(function (e) {
  fail++;
  console.error("  ✗ เทสต์ล้มกลางทาง: " + (e && e.stack || e));
  finish();
});
