"use strict";
// ============================================================
// DECISION JOURNAL — เทสต์ชั้นแสดงผล (VM sandbox ไม่ต้องใช้เบราว์เซอร์)
//   node scripts/decision-journal-view-test.js
//
// harness แบบเดียวกับ scripts/thai-dr-monitor-view-test.js:
//   · โหลดสคริปต์ตามลำดับที่ public/decision-journal.html โหลดจริง (อ่านจาก HTML ไม่ hardcode)
//   · fakeNodes เข้าใจแค่ selector แบบ [data-attr] เปล่า ๆ → หน้าต้อง wire ผ่าน
//     root.querySelectorAll('[data-dj-*]') ทีละ attribute และอ่านค่าฟอร์มด้วย document.getElementById
//   · fetch ปลอมทั้งหมด — เทสต์นี้ห้ามออกเน็ตและห้ามแตะ .local-data ของ repo
//
// โครงไฟล์: แต่ละงานเพิ่ม section(...) ใหม่ "เหนือ" บรรทัด
//   "==== งานถัดไปต่อ section ใหม่เหนือบรรทัดนี้ ====" ห้ามเขียนทับ section เดิม
// ============================================================
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var E = require("../public/decision-journal-engine.js");   // ใช้ทำ fixture (ymdAdd) และอ่านค่าคงที่เพื่อเทียบ

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

// ---------- fixture: แท่งราคา (helper เดียวกับเทสต์เอนจิน) ----------
function rep(v, n) { var a = []; for (var i = 0; i < n; i++) a.push(v); return a; }
function isWeekend(ymd) { var dow = new Date(ymd + "T00:00:00Z").getUTCDay(); return dow === 0 || dow === 6; }
function mkBars(startYmd, closes, lows) {
  var out = [], d = startYmd;
  for (var i = 0; i < closes.length; i++) {
    while (isWeekend(d)) d = E.ymdAdd(d, 1);
    var low = (lows && lows[i] != null) ? lows[i] : closes[i];
    out.push({ date: d, open: closes[i], high: closes[i], low: low, close: closes[i], volume: 1000 });
    d = E.ymdAdd(d, 1);
  }
  return out;
}
// แท่งวันทำการ (จ–ศ) ที่ "จบ" ที่ endYmd — ใช้ทำชุด 260 แท่งที่จบ 2026-10-23 (ศุกร์)
function mkBarsEnding(endYmd, closes) {
  var dates = [], d = endYmd;
  while (dates.length < closes.length) { if (!isWeekend(d)) dates.unshift(d); d = E.ymdAdd(d, -1); }
  return mkBars(dates[0], closes);
}
var RISE8 = [101, 102, 103, 104, 105, 106, 107, 108];
var BARS = {
  NVDA: mkBarsEnding("2026-10-23", rep(100, 252).concat(RISE8)),
  "BTC-USD": mkBarsEnding("2026-10-23", rep(60000, 252).concat([60100, 60200, 60300, 60400, 60500, 60600, 60700, 60800])),
  "K-GTECHRMF": []
};

// ---------- fixture: เอกสารบันทึก (2 entries + 2 trades ตามแผน Task 8/10/12) ----------
function mkEntry(o) {
  return {
    id: o.id, createdAt: o.createdAt, updatedAt: o.createdAt, deletedAt: o.deletedAt || null,
    date: o.date, symbol: o.symbol, label: "",
    context: { event: o.event || "", feelings: o.feelings || [], note: "" },
    view: { direction: o.direction, horizonDays: o.horizonDays },
    action: { kind: o.action, plan: "", conviction: !!o.conviction, tradeIds: [] },
    rules: {
      version: "dj-rules-1", source: "yahoo:/api/ohlc", asOfBar: o.asOfBar, barsUsed: 500, partialBarDropped: false,
      close: o.close, ema12: null, ema26: null, sma200: null, high1y: null, high1yDate: null, high1yWindowBars: null,
      r1: { state: "bull", crossDir: null, crossBarsAgo: null, buy: true, sell: false },
      r2: { state: "above", consecutive: 30, crossDir: null, crossBarsAgo: null, breakConfirmed: false, reclaimHeld: false,
        touchBounce: { met: false, touchDate: null, touchLow: null, touchSma: null }, buy: false, sell: false },
      r3: { dd1yPct: -5, dipMet: false, conviction: !!o.conviction, buy: false }
    },
    verdict: o.verdict,
    review: { reviewedAt: null, selfVerdict: null, lesson: "" }
  };
}
function mkTrade(o) {
  return {
    id: o.id, createdAt: o.createdAt, updatedAt: o.createdAt, deletedAt: null,
    date: o.date, symbol: o.symbol, side: o.side, qty: o.qty, price: o.price,
    currency: o.currency, fee: o.fee || 0, note: "", entryId: o.entryId || null
  };
}
function freshJournal() {
  return {
    v: 1, updatedAt: "2026-10-20T10:00:00.000Z",
    entries: [
      mkEntry({ id: "e_fix1", createdAt: "2026-09-01T03:00:00.000Z", date: "2026-09-01", symbol: "NVDA",
        event: "ข่าวร้าย ตลาดลง", feelings: ["fear"], direction: "down", horizonDays: 7, action: "sell",
        asOfBar: "2026-08-31", close: 100,
        verdict: { compliance: "against", supports: [], opposes: ["r1"], rulesSay: "buy",
          why: "กฎ 1: EMA12 ยังเหนือ EMA26 · กฎ 2: ยังไม่หลุด SMA200" } }),
      mkEntry({ id: "e_fix2", createdAt: "2026-10-20T10:00:00.000Z", date: "2026-10-20", symbol: "PTT.BK",
        event: "ย่อมาแรง", feelings: ["calm"], direction: "up", horizonDays: 90, action: "buy",
        asOfBar: "2026-10-17", close: 32, conviction: true,
        verdict: { compliance: "per-rule", supports: ["r1"], opposes: [], rulesSay: "buy", why: "กฎ 1: EMA12 เหนือ EMA26" } })
    ],
    trades: [
      mkTrade({ id: "t_fix1", createdAt: "2026-01-05T03:00:00.000Z", date: "2026-01-05", symbol: "NVDA", side: "buy", qty: 10, price: 100, currency: "USD" }),
      mkTrade({ id: "t_fix2", createdAt: "2026-03-01T03:00:00.000Z", date: "2026-03-01", symbol: "NVDA", side: "sell", qty: 4, price: 130, currency: "USD" })
    ]
  };
}
var JOURNAL = freshJournal();
// /api/portfolio-holdings คืน { data: [shapeRow(...)] } — ชื่อฟิลด์ตาม api/portfolio-holdings.js shapeRow
var HOLDINGS = [
  { canonicalSymbol: "NVDA", displaySymbol: "NVDA", isHolding: true, watchlistOnly: false },
  { canonicalSymbol: "PTT.BK", displaySymbol: "PTT", isHolding: true, watchlistOnly: false },
  { canonicalSymbol: "K-GTECHRMF", displaySymbol: "K-GTECHRMF", isHolding: true, watchlistOnly: false },
  // watchlist อย่างเดียว — สเปก §5.2 ใช้เฉพาะ isHolding จึงต้องไม่ขึ้นในรายการสัญลักษณ์
  { canonicalSymbol: "AMD", displaySymbol: "AMD", isHolding: false, watchlistOnly: true }
];

// ---------- sandbox ที่มี DOM พอให้หน้าเว็บทำงานจริง ----------
var els = {};
function mkEl(tag) {
  return {
    tagName: (tag || "div").toUpperCase(), innerHTML: "", value: "", checked: false, disabled: false,
    type: "", style: {}, attributes: {}, files: null, href: "", download: "",
    appendChild: function () {}, removeChild: function () {}, click: function () {},
    focus: function () {}, setSelectionRange: function () {},
    setAttribute: function (k, v) { this.attributes[k] = v; },
    getAttribute: function (k) { return this.attributes[k] === undefined ? null : this.attributes[k]; },
    removeAttribute: function (k) { delete this.attributes[k]; },
    addEventListener: function (ev, fn) {
      this._on = this._on || {};
      (this._on[ev] = this._on[ev] || []).push(fn);
    },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    closest: function () { return null; },
    classList: { add: function () {}, remove: function () {}, contains: function () { return false; }, toggle: function () {} }
  };
}
// querySelectorAll ปลอม: คืน element หนึ่งตัวต่อค่าของ attribute ที่พบใน HTML ที่ render แล้ว
// เพื่อให้ handler ถูกผูกจริง แล้วเทสต์กดได้เหมือนผู้ใช้ (คืน [] เปล่า ๆ = เทสต์เขียวบนเส้นทางปลอม)
var handlers = {};
var nodes = {};
function html() { return (els.djRoot && els.djRoot.innerHTML) || ""; }
function collectAttr(attr) {
  var h = html();
  var re = new RegExp(attr + '="([^"]*)"', "g"), m, out = [], seen = {};
  while ((m = re.exec(h)) !== null) {
    if (seen[m[1]]) continue;
    seen[m[1]] = 1;
    out.push(m[1]);
  }
  return out;
}
function tagFor(attr, val) {
  var h = html();
  var i = h.indexOf(attr + '="' + val + '"');
  if (i < 0) return "DIV";
  var open = h.lastIndexOf("<", i);
  var m = /^<([a-zA-Z]+)/.exec(h.slice(open, i));
  return m ? m[1].toUpperCase() : "DIV";
}
function fakeNodes(sel) {
  var m = /^\[([a-z-]+)\]$/.exec(sel);
  if (!m) return [];
  var attr = m[1];
  return collectAttr(attr).map(function (val) {
    var tag = tagFor(attr, val);
    var el = mkEl(tag);
    el.attributes[attr] = val;
    el.addEventListener = function (ev, fn) { handlers[attr + "|" + val + "|" + ev] = fn; };
    nodes[attr + "|" + val] = el;
    return el;
  });
}
function nodeOf(attr, val) { return nodes[attr + "|" + val] || null; }
function clickAttr(attr, val) {
  var fn = handlers[attr + "|" + val + "|click"];
  if (!fn) return false;
  fn({ stopPropagation: function () {}, preventDefault: function () {}, target: nodeOf(attr, val) });
  return true;
}
function changeAttr(attr, val, value) {
  var el = nodeOf(attr, val);
  var fn = handlers[attr + "|" + val + "|change"];
  if (!el || !fn) return false;
  el.value = value;
  fn({ stopPropagation: function () {}, preventDefault: function () {}, target: el });
  return true;
}
function setVal(id, v) { doc.getElementById(id).value = v; }
function getVal(id) { return doc.getElementById(id).value; }

var docListeners = {};
var doc = {
  readyState: "complete", body: mkEl("body"), head: mkEl("head"),
  createElement: function (tag) { return mkEl(tag); },
  addEventListener: function (type, fn) { (docListeners[type] = docListeners[type] || []).push(fn); },
  removeEventListener: function () {},
  dispatchEvent: function (ev) {
    (docListeners[ev && ev.type] || []).slice().forEach(function (fn) { fn(ev); });
    return true;
  },
  getElementById: function (id) {
    if (!els[id]) {
      els[id] = mkEl(id === "djRoot" ? "main" : "input");
      els[id].id = id;
      els[id].querySelectorAll = function (sel) { return fakeNodes(sel); };
    }
    return els[id];
  },
  querySelector: function () { return null; },
  querySelectorAll: function (sel) { return fakeNodes(sel); }
};
function fireDoc(type, detail) { doc.dispatchEvent(new win.CustomEvent(type, { detail: detail || null })); }

var store = {};
var sessionStore = {};
var fetchCalls = [];
var puts = [];
var failGet = null;        // null · เลข HTTP status · "reject" (เน็ตหลุด)
var failPut = null;
var failHoldings = null;
var getDelays = [];        // หน่วงคำตอบ GET journal ทีละครั้ง (ms) — ใช้เทสต์คำตอบเก่ามาทีหลัง
var unrouted = [];
var privacyLocked = false;
function resp(status, body) {
  return Promise.resolve({
    ok: status >= 200 && status < 300, status: status,
    json: function () { return Promise.resolve(JSON.parse(JSON.stringify(body))); },
    text: function () { return Promise.resolve(JSON.stringify(body)); }
  });
}
function failResp(x) {
  if (x === "reject") return Promise.reject(new TypeError("Failed to fetch"));
  return resp(x, { error: "fixture HTTP " + x });
}
function lastPut() { return puts.length ? puts[puts.length - 1].data : null; }

var win = {
  document: doc,
  location: { search: "", pathname: "/decision-journal", origin: "http://localhost" },
  history: { pushState: function () {}, replaceState: function () {} },
  localStorage: {
    getItem: function (k) { return store[k] === undefined ? null : store[k]; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  },
  sessionStorage: {
    getItem: function (k) { return sessionStore[k] === undefined ? null : sessionStore[k]; },
    setItem: function (k, v) { sessionStore[k] = String(v); },
    removeItem: function (k) { delete sessionStore[k]; }
  },
  addEventListener: function () {},
  CustomEvent: function (type, init) { this.type = type; this.detail = init && init.detail; },
  PortfolioPrivacy: { isLocked: function () { return privacyLocked; } },
  fetch: function (url, init) {
    var u = String(url);
    var method = String((init && init.method) || "GET").toUpperCase();
    fetchCalls.push({ url: u, method: method, body: init && init.body });
    if (/^\/api\/portfolio\?doc=journal(&|$)/.test(u)) {
      if (method === "PUT") {
        if (failPut) return failResp(failPut);
        puts.push(JSON.parse(init.body));
        return resp(200, { ok: true });
      }
      if (failGet) return failResp(failGet);
      var body = { data: JOURNAL == null ? null : JSON.parse(JSON.stringify(JOURNAL)), mode: "supabase" };
      var delay = getDelays.length ? getDelays.shift() : 0;
      if (!delay) return resp(200, body);
      return new Promise(function (r) { setTimeout(r, delay); }).then(function () { return resp(200, body); });
    }
    if (/^\/api\/portfolio-holdings(\?|$)/.test(u)) {
      if (failHoldings) return failResp(failHoldings);
      return resp(200, { data: HOLDINGS, mode: "supabase" });
    }
    if (/^\/api\/ohlc\?/.test(u)) {
      var sym = decodeURIComponent((/[?&]symbol=([^&]+)/.exec(u) || [])[1] || "");
      return resp(200, { bars: BARS[sym] || [], sourceType: "LIVE" });
    }
    unrouted.push(u);
    return resp(404, { error: "not routed in test: " + u });
  },
  URL: { createObjectURL: function () { return "blob:x"; }, revokeObjectURL: function () {} },
  Blob: function () {},
  FileReader: function () {},
  console: console, Math: Math, JSON: JSON, Date: Date, Number: Number, String: String,
  Object: Object, Array: Array, Boolean: Boolean, encodeURIComponent: encodeURIComponent,
  decodeURIComponent: decodeURIComponent, isFinite: isFinite, isNaN: isNaN, parseInt: parseInt,
  parseFloat: parseFloat, Promise: Promise, RegExp: RegExp, Error: Error, TypeError: TypeError,
  setTimeout: setTimeout, clearTimeout: clearTimeout,
  Intl: typeof Intl !== "undefined" ? Intl : undefined
};
win.window = win; win.self = win;
// เวลาคงที่ของเทสต์ — หน้าอ่าน window.__DJ_NOW ก่อนนาฬิกาจริง
win.__DJ_NOW = "2026-10-25T12:00";
var ctx = vm.createContext(win);

// ---------- โหลดสคริปต์ชุดเดียวกับที่ HTML โหลดจริง ----------
var SKIP = ["theme.js", "api-auth.js", "privacy.js", "app-navigation.js"];
var DJ_HTML_PATH = path.join(PUB, "decision-journal.html");
var DJ_HTML = null;
try { DJ_HTML = fs.readFileSync(DJ_HTML_PATH, "utf8"); }
catch (e) {
  t("อ่าน public/decision-journal.html ได้", false, e.message);
  finish();
}
var HTML_SCRIPTS = (function () {
  var out = [], re = /<script src="\/([A-Za-z0-9._-]+\.js)/g, m;
  while ((m = re.exec(DJ_HTML)) !== null) if (SKIP.indexOf(m[1]) < 0) out.push(m[1]);
  return out;
})();
var bootOk = true;
HTML_SCRIPTS.forEach(function (f) {
  try { vm.runInContext(fs.readFileSync(path.join(PUB, f), "utf8"), ctx, { filename: f }); }
  catch (e) { bootOk = false; console.error("   boot " + f + ": " + e.message); }
});
var P = win.DecisionJournalPage;

// ---------- helpers ----------
function flush() {
  return new Promise(function (r) { setTimeout(r, 30); })
    .then(function () { return new Promise(function (r) { setTimeout(r, 30); }); });
}
function countOf(re) { return (html().match(re) || []).length; }
// HTML ของ section เดียว (section ไม่ซ้อนกัน)
function sec(id) {
  var h = html();
  var i = h.indexOf('id="' + id + '"');
  if (i < 0) return "";
  var start = h.lastIndexOf("<section", i);
  var end = h.indexOf("</section>", i);
  return h.slice(start, end < 0 ? h.length : end + 10);
}
function tileValue(label) {
  var re = new RegExp('<div class="dj-tile-n">([^<]*)</div><div class="dj-tile-l">' + label + "</div>");
  var m = re.exec(sec("djSummary"));
  return m ? m[1] : null;
}
function stripComments(s) { return s.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, ""); }
// กติกา ES5 ชุดเดียวกับเทสต์เอนจิน (scripts/decision-journal-test.js R2.7)
var ES5_RULES = [
  ["arrow", /=>/], ["const", /\bconst\s/], ["let", /\blet\s/], ["template literal", /`/], ["class", /\bclass\s/], ["optional chaining", /\?\./],
  ["Array includes/fill/find", /\.(includes|fill|find)\(/],
  ["ES2015+ library", /Object\.(assign|entries|values)|\.repeat\(|\.startsWith\(|\.endsWith\(|\.padStart\(|\.padEnd\(|\.findIndex\(|Number\.is(Finite|NaN|Integer)|Array\.from/]
];
function es5Problems(code) {
  var out = [];
  ES5_RULES.forEach(function (r) { var m = r[1].exec(code); if (m) out.push(r[0] + ": " + m[0]); });
  return out;
}
var ADVISORY_TH = /ควรซื้อ|ควรขาย|น่าซื้อ|น่าขาย|แนะนำซื้อ|จุดเข้า|ตัดขาดทุน/;
var ADVISORY_EN = /\b(Buy|Sell)\b/;
var LEAK = /(NaN|undefined|Infinity|\[object )/;
function readPub(f) { return fs.readFileSync(path.join(PUB, f), "utf8"); }

// ---------- ตัวเดิน section ----------
var SECTIONS = [];
function section(name, fn) { SECTIONS.push({ name: name, fn: fn }); }

// ============================================================
// Task 8 — โครงหน้า · HTML · CSS · เมนู · rewrite · privacy event · boot
// ============================================================
section("boot (Task 8)", function () {
  t("boots", bootOk);
  t("scripts from HTML: technical-indicators → engine → page",
    HTML_SCRIPTS.join() === "technical-indicators.js,decision-journal-engine.js,decision-journal-page.js", HTML_SCRIPTS);
  t("globals", !!win.DecisionJournal && !!win.DecisionJournalPage && !!win.AITechnicalIndicators);
  t("page API: render / load / _nowBangkok are functions, _state is an object",
    !!P && typeof P.render === "function" && typeof P.load === "function" &&
    typeof P._nowBangkok === "function" && !!P._state && typeof P._state === "object");
  var S = P ? P._state : {};
  var keys = ["doc", "holdings", "symbols", "form", "preview", "outcomesById", "pricesBySymbol", "syncState", "syncNote", "draft", "filters", "locked", "loadError"];
  t("_state has every key the plan pins", keys.every(function (k) { return Object.prototype.hasOwnProperty.call(S, k); }),
    keys.filter(function (k) { return !Object.prototype.hasOwnProperty.call(S, k); }));
  t("_state types", Array.isArray(S.holdings) && Array.isArray(S.symbols) && !!S.form && typeof S.form === "object" &&
    S.preview === null && !!S.outcomesById && !!S.pricesBySymbol && !!S.filters && typeof S.locked === "boolean" && S.draft === null);
  return null;
});

section("load + skeleton (Task 8)", function () {
  return P.load(false).then(function () {
    var gets = fetchCalls.filter(function (c) { return /\/api\/portfolio\?doc=journal/.test(c.url) && c.method === "GET"; });
    t("GET journal doc on load", gets.length >= 1);
    // boot() เรียก load(false) ไปแล้ว — load(false) ซ้ำระหว่างรอต้องคืน promise เดิม ไม่ยิงซ้ำ
    t("load(false) while loading reuses the in-flight request (one GET)", gets.length === 1, gets.length);
    t("GET holdings on load", fetchCalls.some(function (c) { return /^\/api\/portfolio-holdings/.test(c.url) && c.method === "GET"; }));
    t("load never writes (no PUT)", fetchCalls.every(function (c) { return c.method !== "PUT"; }));
    t("no unrouted fetch", unrouted.length === 0, unrouted);

    var order = ["djSummary", "djReview", "djNew", "djLog", "djTrades", "djStats", "djMethod"].map(function (id) { return html().indexOf('id="' + id + '"'); });
    t("sections in decision-first order", order.every(function (p, i) { return p >= 0 && (i === 0 || p > order[i - 1]); }), order);
    var heads = { djSummary: "ภาพรวม", djReview: "ถึงกำหนดทบทวน", djNew: "บันทึกใหม่", djLog: "บันทึกทั้งหมด", djTrades: "ไม้จริง", djStats: "สถิติ", djMethod: "วิธีคิด" };
    t("each section has its Thai heading", Object.keys(heads).every(function (id) {
      return new RegExp("<h2[^>]*>[^<]*" + heads[id]).test(sec(id));
    }), Object.keys(heads).filter(function (id) { return !new RegExp("<h2[^>]*>[^<]*" + heads[id]).test(sec(id)); }));
    t("sections are <section> elements with dj-block", countOf(/<section id="dj[A-Za-z]+" class="dj-block/g) === 7);
    t("no page hero (shell hero only)", html().indexOf("dj-hero") < 0 && html().indexOf("mc-page-hero") < 0);
    t("disclaimer present", html().indexOf("ไม่ใช่คำแนะนำการลงทุน") >= 0);
    t("no NaN/undefined", !LEAK.test(html()), (LEAK.exec(html()) || [])[0]);
    t("no advisory wording", !ADVISORY_TH.test(html()) && !ADVISORY_EN.test(html()));
    t("no money in title/aria-label", !/(title|aria-label)="[^"]*[฿$]\s?[\d,]/.test(html()));

    var S = P._state;
    t("after load: syncState idle, no loadError", S.syncState === "idle" && S.loadError === null, [S.syncState, S.loadError]);
    t("sync status says the page matches the server (not 'saved' — nothing was saved)",
      /ตรงกับเซิร์ฟเวอร์/.test(sec("djSummary")) && !/บันทึกบนเซิร์ฟเวอร์แล้ว/.test(html()));
    t("doc loaded from server", !!S.doc && S.doc.entries.length === 2 && S.doc.trades.length === 2);
    t("summary counts live entries and trades", tileValue("บันทึก") === "2" && tileValue("ไม้จริง") === "2", [tileValue("บันทึก"), tileValue("ไม้จริง")]);
    t("holdings kept = isHolding rows only", S.holdings.length === 3 && S.holdings.every(function (h) { return h.isHolding; }));
    t("symbols = holdings ∪ entries ∪ trades, canonical, sorted, no watchlist-only",
      S.symbols.join() === "K-GTECHRMF,NVDA,PTT.BK", S.symbols);
    t("no holdings note when holdings loaded", !/รายการหุ้นในพอร์ตโหลดไม่สำเร็จ/.test(html()));
  });
});

section("load: failures are honest (Task 8)", function () {
  // holdings ล่ม = ไม่ร้ายแรง: สัญลักษณ์มาจากบันทึกเท่านั้น และบอกตรง ๆ
  failHoldings = 500;
  return P.load(true).then(function () {
    var S = P._state;
    t("holdings failure is non-fatal", S.syncState === "idle" && S.loadError === null && S.doc.entries.length === 2, [S.syncState, S.loadError]);
    t("holdings failure → symbols from entries/trades only", S.symbols.join() === "NVDA,PTT.BK", S.symbols);
    t("holdings failure is said plainly", /รายการหุ้นในพอร์ตโหลดไม่สำเร็จ/.test(sec("djSummary")));
    failHoldings = null;
    // GET journal ล่ม (HTTP 500) หลังเคยโหลดได้ → เก็บ doc เดิม บอกว่าล้มเหลว มีปุ่มลองใหม่
    failGet = 500;
    return P.load(true);
  }).then(function () {
    var S = P._state;
    t("GET 500 → syncState error with the HTTP status", S.syncState === "error" && /HTTP 500/.test(S.loadError || ""), [S.syncState, S.loadError]);
    t("GET 500 → visible failure text", /โหลดบันทึกจากเซิร์ฟเวอร์ไม่สำเร็จ/.test(sec("djSummary")) && /HTTP 500/.test(sec("djSummary")));
    t("GET 500 → previous doc kept (not replaced by an empty one)", !!S.doc && S.doc.entries.length === 2);
    t("GET 500 → never claims to match/saved", !/ตรงกับเซิร์ฟเวอร์|บันทึกบนเซิร์ฟเวอร์แล้ว/.test(html()));
    t("GET 500 → retry button rendered", /data-dj-reload="/.test(html()));
    t("still no PUT", fetchCalls.every(function (c) { return c.method !== "PUT"; }));
    failGet = null;
    var before = fetchCalls.length;
    var clicked = clickAttr("data-dj-reload", "1");
    t("retry button is wired", clicked);
    return flush().then(function () {
      t("retry → GET again and recovers", fetchCalls.length > before && P._state.syncState === "idle" && P._state.loadError === null, [P._state.syncState, P._state.loadError]);
      t("retry button gone after recovery", !/data-dj-reload="/.test(html()));
    });
  }).then(function () {
    // เปิดหน้าครั้งแรกแล้วเน็ตหลุด: ยังไม่รู้ข้อมูล → ตัวเลขเป็น — ไม่ใช่ 0
    P._state.doc = null;
    failGet = "reject";
    return P.load(true);
  }).then(function () {
    var S = P._state;
    t("network reject → error, readable reason", S.syncState === "error" && /เชื่อมต่อเซิร์ฟเวอร์ไม่ได้/.test(S.loadError || ""), S.loadError);
    t("unknown counts show — not 0", tileValue("บันทึก") === "—" && tileValue("ไม้จริง") === "—", [tileValue("บันทึก"), tileValue("ไม้จริง")]);
    failGet = 401;
    return P.load(true);
  }).then(function () {
    t("401 → asks to sign in", /เข้าสู่ระบบ/.test(P._state.loadError || ""), P._state.loadError);
    failGet = null;
    // เซิร์ฟเวอร์ยังไม่มีแถวนี้ (data: null) = เอกสารว่างจริง → นับ 0 ได้
    JOURNAL = null;
    return P.load(true);
  }).then(function () {
    var S = P._state;
    t("data null → empty doc, idle, counts 0", S.syncState === "idle" && S.doc && S.doc.entries.length === 0 && tileValue("บันทึก") === "0", [S.syncState, tileValue("บันทึก")]);
    t("empty doc still renders all sections without leaks", countOf(/<section id="dj/g) === 7 && !LEAK.test(html()));
    // เอกสารผิดรูปจากเซิร์ฟเวอร์ → ไม่เอามาแสดง บอกว่าผิดรูป
    JOURNAL = { v: 1, entries: "x", trades: [] };
    return P.load(true);
  }).then(function () {
    var S = P._state;
    t("malformed server doc → error 'ผิดรูป', not shown as data", S.syncState === "error" && /ผิดรูป/.test(S.loadError || "") && S.doc && S.doc.entries.length === 0, [S.syncState, S.loadError]);
    // เวอร์ชันเอกสารที่หน้านี้ไม่รู้จัก (v ≠ เอนจิน VERSION) — ห้ามเอามาแสดงเป็นของจริง (เซิร์ฟเวอร์ก็บังคับ v === 1)
    JOURNAL = freshJournal();
    JOURNAL.v = 2;
    return P.load(true);
  }).then(function () {
    var S = P._state;
    t("unknown doc version → error 'ผิดรูป', entries not shown", S.syncState === "error" && /ผิดรูป/.test(S.loadError || "") && S.doc.entries.length === 0, [S.syncState, S.loadError, S.doc.entries.length]);
    // tombstone ไม่นับในภาพรวม
    JOURNAL = freshJournal();
    JOURNAL.entries[0].deletedAt = "2026-10-21T00:00:00.000Z";
    JOURNAL.trades[1].deletedAt = "2026-10-21T00:00:00.000Z";
    return P.load(true);
  }).then(function () {
    t("tombstoned entries/trades are not counted", tileValue("บันทึก") === "1" && tileValue("ไม้จริง") === "1", [tileValue("บันทึก"), tileValue("ไม้จริง")]);
    // คำตอบของรอบเก่าที่มาถึงทีหลังต้องไม่ทับรอบใหม่
    JOURNAL = freshJournal();
    JOURNAL.entries = JOURNAL.entries.slice(0, 1);   // รอบเก่า: 1 รายการ (ตอบช้า 80ms)
    getDelays = [80, 0];
    var older = P.load(true);
    JOURNAL = freshJournal();                         // รอบใหม่: 2 รายการ (ตอบทันที)
    var newer = P.load(true);
    return Promise.all([older, newer]);
  }).then(function () {
    t("a stale response that arrives late does not overwrite the newer load", P._state.doc.entries.length === 2 && P._state.syncState === "idle", P._state.doc.entries.length);
    getDelays = [];
    JOURNAL = freshJournal();
    return P.load(true);
  });
});

section("privacy event (Task 8)", function () {
  t("page listens for portfolio-privacy-changed on document", (docListeners["portfolio-privacy-changed"] || []).length >= 1);
  privacyLocked = true;
  fireDoc("portfolio-privacy-changed", { locked: true });
  t("event → re-render reads PortfolioPrivacy.isLocked() (locked)", P._state.locked === true);
  privacyLocked = false;
  fireDoc("portfolio-privacy-changed", { locked: false });
  t("event → re-render reads PortfolioPrivacy.isLocked() (unlocked)", P._state.locked === false);
  privacyLocked = true; P.render();
  t("render() itself refreshes _state.locked", P._state.locked === true);
  var saved = win.PortfolioPrivacy;
  win.PortfolioPrivacy = undefined;
  var threw = false;
  try { P.render(); } catch (e) { threw = true; }
  t("no PortfolioPrivacy → render does not throw, locked false", !threw && P._state.locked === false);
  win.PortfolioPrivacy = saved; privacyLocked = false; P.render();
  return null;
});

section("_nowBangkok (Task 8)", function () {
  t("uses window.__DJ_NOW when present", P._nowBangkok() === "2026-10-25T12:00");
  P._state.nowOverride = "2026-01-02T03:04";
  t("_state.nowOverride wins", P._nowBangkok() === "2026-01-02T03:04");
  P._state.nowOverride = null;
  var savedNow = win.__DJ_NOW;
  delete win.__DJ_NOW;
  function expectNear(s) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return false;
    var ms = Date.parse(s + ":00Z") - 7 * 3600000;   // เวลากรุงเทพ → UTC
    return Math.abs(ms - Date.now()) < 120000;
  }
  var real = P._nowBangkok();
  t("real clock via Intl: YYYY-MM-DDTHH:mm in Asia/Bangkok", expectNear(real), real);
  var savedIntl = win.Intl;
  win.Intl = undefined;
  var fb = P._nowBangkok();
  t("no Intl → UTC+7 fallback gives the same minute format", expectNear(fb), fb);
  win.Intl = { DateTimeFormat: function () { throw new Error("boom"); } };
  var fb2 = P._nowBangkok();
  t("Intl throws → fallback still works", expectNear(fb2), fb2);
  win.Intl = savedIntl;
  win.__DJ_NOW = savedNow;
  t("restored fixture clock", P._nowBangkok() === "2026-10-25T12:00");
  return null;
});

section("method copy reads engine constants (Task 8)", function () {
  P.render();
  var D = win.DecisionJournal;
  var m = sec("djMethod");
  t("method shows touch band ±TOUCH_BAND_PCT%", m.indexOf("±" + D.TOUCH_BAND_PCT + "%") >= 0 && D.TOUCH_BAND_PCT === 3);
  t("method shows flat band ±FLAT_BAND_PCT% for both prediction and action result",
    m.indexOf("±" + D.FLAT_BAND_PCT + "%") >= 0 && D.FLAT_BAND_PCT === 2 && /คาดถูก/.test(m) && /ผลของ/.test(m));
  t("method shows dip |DIP_PCT|%", m.indexOf(Math.abs(D.DIP_PCT) + "%") >= 0);
  t("method shows ≥ CONFIRM_BARS วัน", m.indexOf("≥ " + D.CONFIRM_BARS + " วัน") >= 0);
  t("method shows every horizon", D.HORIZONS.every(function (h) { return m.indexOf("+" + h) >= 0; }));
  t("method shows stale limit and min-n", m.indexOf(D.MAX_STALE_DAYS + " วัน") >= 0 && m.indexOf(String(D.MIN_STAT_N)) >= 0);
  t("method shows closed-bar hours derived from closedBarCutoff (TH 17:00 · US 05:00 · CRYPTO 07:00)",
    /17:00/.test(m) && /05:00/.test(m) && /07:00/.test(m));
  t("method has FIFO and split note", /FIFO/.test(m) && /แตกพาร์/.test(m));
  t("method has the disclaimer", /ไม่ใช่คำแนะนำการลงทุน/.test(m));

  // พิสูจน์ว่าไม่ได้พิมพ์ตัวเลขตาย: เปลี่ยนค่าคงที่ใน sandbox แล้วตัวเลขบนจอต้องเปลี่ยนตาม
  var saved = { TOUCH_BAND_PCT: D.TOUCH_BAND_PCT, FLAT_BAND_PCT: D.FLAT_BAND_PCT, DIP_PCT: D.DIP_PCT, CONFIRM_BARS: D.CONFIRM_BARS,
    HORIZONS: D.HORIZONS, MAX_STALE_DAYS: D.MAX_STALE_DAYS, MIN_STAT_N: D.MIN_STAT_N, closedBarCutoff: D.closedBarCutoff };
  D.TOUCH_BAND_PCT = 7; D.FLAT_BAND_PCT = 4.5; D.DIP_PCT = -33; D.CONFIRM_BARS = 5; D.HORIZONS = [5, 60];
  D.MAX_STALE_DAYS = 11; D.MIN_STAT_N = 9;
  D.closedBarCutoff = function (market, now) {
    var h = Number(String(now).slice(11, 13)), ymd = String(now).slice(0, 10);
    if (market === "TH" || market === "ASIA") return h >= 16 ? ymd : E.ymdAdd(ymd, -1);
    return saved.closedBarCutoff(market, now);
  };
  P.render();
  var m2 = sec("djMethod");
  t("mutated constants flow into the copy", m2.indexOf("±7%") >= 0 && m2.indexOf("±4.5%") >= 0 && m2.indexOf("33%") >= 0 &&
    m2.indexOf("≥ 5 วัน") >= 0 && m2.indexOf("+5") >= 0 && m2.indexOf("+60") >= 0 && m2.indexOf("11 วัน") >= 0 && /16:00/.test(m2));
  t("old numbers gone after mutation", m2.indexOf("±3%") < 0 && m2.indexOf("±2%") < 0 && m2.indexOf("20%") < 0 &&
    m2.indexOf("≥ 2 วัน") < 0 && m2.indexOf("+90") < 0 && !/17:00/.test(m2));
  Object.keys(saved).forEach(function (k) { D[k] = saved[k]; });
  P.render();
  t("constants restored", sec("djMethod").indexOf("±3%") >= 0);

  var code = stripComments(readPub("decision-journal-page.js"));
  t("page source has no typed copies of the band/dip numbers",
    ["±3", "±2", "20%", "≥ 2 วัน", "17:00", "05:00", "07:00"].every(function (s) { return code.indexOf(s) < 0; }),
    ["±3", "±2", "20%", "≥ 2 วัน", "17:00", "05:00", "07:00"].filter(function (s) { return code.indexOf(s) >= 0; }));
  return null;
});

section("source hygiene (Task 8)", function () {
  var pageSrc = readPub("decision-journal-page.js");
  var engineSrc = readPub("decision-journal-engine.js");
  t("page is ES5", es5Problems(stripComments(pageSrc)).length === 0 && es5Problems(stripComments(engineSrc)).length === 0,
    es5Problems(stripComments(pageSrc)).concat(es5Problems(stripComments(engineSrc))));
  t("page source has no advisory wording", !ADVISORY_TH.test(pageSrc) && !ADVISORY_EN.test(stripComments(pageSrc)));
  // นาฬิกาจริงมีจุดเดียว (wallClock() ที่ _nowBangkok ใช้) — new Date(x) ที่มีอาร์กิวเมนต์คือการแปลงค่า ไม่ใช่อ่านนาฬิกา
  t("page source: wall clock read in one place only",
    (stripComments(pageSrc).match(/new Date\(\)|Date\.now\(/g) || []).length <= 1,
    stripComments(pageSrc).match(/new Date\(\)|Date\.now\(/g));
  return null;
});

section("files: HTML · CSS · nav · rewrite · privacy · versions (Task 8)", function () {
  var dj = DJ_HTML;
  var dr = readPub("thai-dr-monitor.html");
  function headRefs(src) {
    var head = src.slice(0, src.indexOf("</head>"));
    var re = /(?:src|href)="([^"]+)"/g, m, out = [];
    while ((m = re.exec(head)) !== null) out.push(m[1]);
    return out;
  }
  // dj-2 (2026-10-26): CSS แก้หน้ากว้างเกินจอมือถือ + ป้ายนำเข้าไฟล์ — bump เพื่อไม่ให้เบราว์เซอร์ใช้ไฟล์เก่าในแคช
  var want = headRefs(dr).map(function (r) { return r.indexOf("/thai-dr-monitor.css") === 0 ? "/decision-journal.css?v=20261026-dj-2" : r; });
  t("head = thai-dr-monitor head with the page CSS swapped", headRefs(dj).join("|") === want.join("|"), headRefs(dj));
  t("title", /<title>Decision Journal · AI Investment Mission Control<\/title>/.test(dj));
  t("nothing after privacy.js in head", /privacy\.js\?v=[^"]+"><\/script>\s*<\/head>/.test(dj));
  t("body root + loading text", dj.indexOf('<main id="djRoot" class="dj-page"><div class="dj-empty"><strong>กำลังโหลด Decision Journal…</strong></div></main>') >= 0);
  t("body scripts exact order and versions", (function () {
    var body = dj.slice(dj.indexOf("<body"));
    var re = /<script src="([^"]+)"/g, m, out = [];
    while ((m = re.exec(body)) !== null) out.push(m[1]);
    return out.join("|") === ["/technical-indicators.js?v=20260617-action-priority", "/decision-journal-engine.js?v=20261026-dj-2",
      "/decision-journal-page.js?v=20261026-dj-2", "/app-navigation.js?v=20261025-nav-26"].join("|");
  })());
  t("lang th + viewport", /<html lang="th">/.test(dj) && /name="viewport"[^>]*width=device-width/.test(dj));

  var css = readPub("decision-journal.css");
  var cssCode = css.replace(/\/\*[\s\S]*?\*\//g, "");
  t("CSS uses --mc-* tokens", (cssCode.match(/var\(--mc-/g) || []).length >= 10);
  t("CSS has no hex colours (palette comes from tokens)", !/#[0-9a-fA-F]{3,8}\b/.test(cssCode), (/#[0-9a-fA-F]{3,8}\b/.exec(cssCode) || [])[0]);
  t("CSS has no decorative gradients", !/gradient\(/.test(cssCode));
  t("CSS sets no new font family", !/font-family:\s*(?!inherit|var\(--mc-font\))/.test(cssCode));
  // ตัวขยายสถานะ is-* ใช้ได้เมื่อเกาะกับคลาส dj- (แบบ .aa-status.is-ahead ของโปรเจกต์) — ห้ามยืนเดี่ยว
  t("CSS class selectors are dj- prefixed", (function () {
    var bad = [], re = /\.([A-Za-z_][\w-]*)/g, m;
    var sel = cssCode.replace(/\{[^}]*\}/g, "{}");
    while ((m = re.exec(sel)) !== null) {
      var name = m[1];
      if (name.indexOf("dj-") === 0) continue;
      if (name.indexOf("is-") === 0 && /\.dj-[\w-]+(\.is-[\w-]+)*$/.test(sel.slice(0, m.index))) continue;
      bad.push(name);
    }
    return bad.length === 0 || (console.error("   non-dj classes: " + bad.join(",")), false);
  })());
  t("CSS: .dj-table-wrap scrolls horizontally", /\.dj-table-wrap\s*\{[^}]*overflow-x:\s*auto/.test(cssCode));
  t("CSS: mobile ≤600px block exists with single column + 40px touch targets", (function () {
    var i = cssCode.indexOf("@media (max-width: 600px)");
    if (i < 0) return false;
    var blk = cssCode.slice(i, i + 4000);
    return /grid-template-columns:\s*1fr/.test(blk) && /min-height:\s*4[0-9]px/.test(blk);
  })());
  t("CSS: numbers use tabular-nums", /tabular-nums/.test(cssCode));
  t("CSS: dj-hidden hides", /\.dj-hidden\s*\{[^}]*display:\s*none/.test(cssCode));

  var nav = readPub("app-navigation.js");
  t("nav: SIDEBAR Portfolio group has Decision Journal as its first item",
    /\{ label: "Portfolio", items: \[\s*(?:\/\/[^\n]*\s*)*\{ p: "\/decision-journal", i: "📓", t: "Decision Journal" \},/.test(nav));
  t("nav: PAGE_META entry", nav.indexOf('"/decision-journal": { category: "Portfolio", title: "📓 Decision Journal", subtitle: "บันทึกสิ่งที่คิดตอนตัดสินใจ — กฎบอกว่าอะไร · ทำจริงอะไร · ผ่านไปแล้วถูกหรือผิด · ไม้จริงกำไรหรือขาดทุน" }') >= 0);
  t("nav: /decision-journal appears in both SIDEBAR and PAGE_META", (nav.match(/"\/decision-journal"/g) || []).length === 2);

  var vercel = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8"));
  var rw = vercel.rewrites || [];
  var iDj = -1, iCatch = -1;
  rw.forEach(function (r, i) {
    if (r.source === "/decision-journal" && r.destination === "/decision-journal.html") iDj = i;
    if (r.source === "/((?!api/.*).*)") iCatch = i;
  });
  t("vercel: rewrite present before the catch-all, catch-all still last", iDj >= 0 && iCatch === rw.length - 1 && iDj < iCatch, [iDj, iCatch, rw.length]);

  // privacy.js ทำงานจริงใน sandbox: lock()/doUnlock() ต้องยิง event หลังตั้งค่า locked แล้ว
  var privacyDone = (function () {
    var events = [];
    var pdoc = {
      readyState: "loading", body: {}, documentElement: {},
      addEventListener: function () {},
      getElementById: function () { return null; },
      dispatchEvent: function (ev) { events.push({ type: ev.type, locked: ev.detail && ev.detail.locked, now: pwin.PortfolioPrivacy.isLocked() }); return true; }
    };
    var pss = {};
    var pwin = {
      document: pdoc,
      sessionStorage: { getItem: function (k) { return pss[k] === undefined ? null : pss[k]; }, setItem: function (k, v) { pss[k] = String(v); }, removeItem: function (k) { delete pss[k]; } },
      PortfolioAuth: { getPassword: function () { return "pw"; } },
      CustomEvent: function (type, init) { this.type = type; this.detail = init && init.detail; },
      Promise: Promise, Map: Map, console: console, setTimeout: setTimeout
    };
    pwin.window = pwin;
    var pctx = vm.createContext(pwin);
    vm.runInContext(readPub("privacy.js"), pctx, { filename: "privacy.js" });
    var PV = pwin.PortfolioPrivacy;
    PV.lock();
    t("privacy.js: lock() dispatches portfolio-privacy-changed with locked true",
      events.length === 1 && events[0].type === "portfolio-privacy-changed" && events[0].locked === true && events[0].now === true, events);
    return PV.unlock("pw").then(function (ok) {
      t("privacy.js: unlock dispatches portfolio-privacy-changed with locked false",
        ok === true && events.length === 2 && events[1].type === "portfolio-privacy-changed" && events[1].locked === false && events[1].now === false, events);
      return PV.unlock("wrong");
    }).then(function (ok) {
      t("privacy.js: a wrong passcode dispatches nothing", ok === false && events.length === 2, events.length);
      var noEv = vm.createContext({ window: null, document: { readyState: "loading", addEventListener: function () {}, getElementById: function () { return null; } },
        sessionStorage: { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} }, Map: Map, Promise: Promise });
      noEv.window = noEv;
      vm.runInContext(readPub("privacy.js"), noEv, { filename: "privacy.js" });
      var threw = false;
      try { noEv.PortfolioPrivacy.lock(); } catch (e) { threw = true; }
      t("privacy.js: no CustomEvent support → lock() still works", !threw && noEv.PortfolioPrivacy.isLocked() === true);
    });
  })();
  return privacyDone.then(function () {
    var htmls = fs.readdirSync(PUB).filter(function (f) { return /\.html$/.test(f); });
    var navRefs = htmls.filter(function (f) { return readPub(f).indexOf("app-navigation.js?v=") >= 0; });
    var pvRefs = htmls.filter(function (f) { return readPub(f).indexOf("privacy.js?v=") >= 0; });
    t("every HTML that references app-navigation.js uses 20261025-nav-26",
      navRefs.length >= 19 && navRefs.every(function (f) { return /app-navigation\.js\?v=20261025-nav-26"/.test(readPub(f)) && !/app-navigation\.js\?v=(?!20261025-nav-26")/.test(readPub(f)); }),
      navRefs.filter(function (f) { return !/app-navigation\.js\?v=20261025-nav-26"/.test(readPub(f)); }));
    t("every HTML that references privacy.js uses 20261025-pv-2",
      pvRefs.length >= 19 && pvRefs.every(function (f) { return /privacy\.js\?v=20261025-pv-2"/.test(readPub(f)) && !/privacy\.js\?v=(?!20261025-pv-2")/.test(readPub(f)); }),
      pvRefs.filter(function (f) { return !/privacy\.js\?v=20261025-pv-2"/.test(readPub(f)); }));
  });
});

// ============================================================
// Task 9 — ฟอร์มบันทึกใหม่ · แผงกฎ · บันทึก (GET สด → merge → PUT) · ร่างในเครื่อง
// ============================================================
function putCalls() { return fetchCalls.filter(function (c) { return c.method === "PUT"; }); }
function ohlcCalls(providerSym) {
  return fetchCalls.filter(function (c) { return c.url.indexOf("/api/ohlc?symbol=" + providerSym + "&") === 0; });
}
function saveDisabled() { return /data-dj-save[^>]*disabled/.test(html()); }
function fillForm(o) {
  setVal("djSymbol", o.symbol || ""); setVal("djDate", o.date || "");
  setVal("djEvent", o.event || ""); setVal("djDirection", o.direction || "");
  setVal("djHorizon", o.horizon || ""); setVal("djAction", o.action || "");
  setVal("djPlan", o.plan || "");
  doc.getElementById("djConviction").checked = !!o.conviction;
  doc.getElementById("djWithTrade").checked = !!o.withTrade;
  setVal("djQty", o.qty || ""); setVal("djPrice", o.price || ""); setVal("djFee", o.fee || ""); setVal("djCurrency", o.currency || "");
}
function selectHtml(id) {
  var h = html(), i = h.indexOf('<select id="' + id + '"');
  if (i < 0) return "";
  return h.slice(i, h.indexOf("</select>", i));
}
function isIso(s) { return typeof s === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(s); }
function newEntryOf(body, pred) { return (body ? body.entries : []).filter(pred)[0] || null; }
// รายการที่เพิ่งเพิ่มใน PUT ล่าสุด เทียบกับ PUT ที่สำเร็จก่อนหน้า (ไม่พึ่งลำดับ createdAt ที่อาจชนกันในมิลลิวินาทีเดียว)
function addedEntries() {
  var cur = lastPut();
  var prev = puts.length > 1 ? puts[puts.length - 2].data : { entries: [] };
  var had = {};
  prev.entries.forEach(function (x) { had[x.id] = 1; });
  return cur ? cur.entries.filter(function (x) { return !had[x.id]; }) : [];
}
// เส้นทาง /api/ohlc เพิ่มเฉพาะ section (ไม่แตะ router กลาง): สัญลักษณ์ที่กำหนด → ฟังก์ชันคืน Promise ของ response
var BASE_FETCH = win.fetch;
function routeOhlc(extra) {
  win.fetch = function (url, init) {
    var u = String(url);
    var m = /^\/api\/ohlc\?symbol=([^&]+)&/.exec(u);
    var sym = m ? decodeURIComponent(m[1]) : null;
    if (sym && Object.prototype.hasOwnProperty.call(extra, sym)) {
      fetchCalls.push({ url: u, method: "GET", body: undefined });
      return extra[sym]();
    }
    return BASE_FETCH(url, init);
  };
}
function restoreFetch() { win.fetch = BASE_FETCH; }

section("form + preview + save (Task 9)", function () {
  var D = win.DecisionJournal;
  var S = P._state;
  var putsBefore = putCalls().length;
  P.render();
  t("form fields present with datalist from holdings",
    /id="djSymbol"[^>]*list="djSymbols"/.test(html()) && /<option value="NVDA">/.test(html()) && /<option value="PTT\.BK">/.test(html()));
  t("datalist keeps a no-price holding, labelled, and skips watchlist-only rows",
    /<option value="K-GTECHRMF">ในพอร์ต/.test(html()) && !/<option value="AMD">/.test(html()));
  t("feelings chips rendered from engine list", countOf(/data-dj-feel="/g) === 8 &&
    D.FEELINGS.every(function (f) { return html().indexOf('data-dj-feel="' + f.key + '"') >= 0 && sec("djNew").indexOf(f.thai) >= 0; }));
  t("chips are buttons with aria-pressed", countOf(/<button type="button" class="dj-chip" aria-pressed="false" data-dj-feel="/g) === 8);
  t("direction select built from engine DIRECTIONS",
    D.DIRECTIONS.every(function (x) { return selectHtml("djDirection").indexOf('value="' + x.key + '">' + x.thai) >= 0; }));
  t("horizon select built from engine HORIZONS",
    D.HORIZONS.every(function (h) { return selectHtml("djHorizon").indexOf('value="' + h + '"') >= 0; }) &&
    (selectHtml("djHorizon").match(/<option value="\d+"/g) || []).length === D.HORIZONS.length);
  t("action select built from engine ACTIONS",
    D.ACTIONS.every(function (x) { return selectHtml("djAction").indexOf('value="' + x.key + '">' + x.thai) >= 0; }));
  t("required selects start unselected (no silent default)",
    /<option value="" selected/.test(selectHtml("djDirection")) && /<option value="" selected/.test(selectHtml("djHorizon")) && /<option value="" selected/.test(selectHtml("djAction")));
  t("record date defaults to today (Bangkok) and cannot pick the future",
    /id="djDate"[^>]*value="2026-10-25"/.test(html()) && /id="djDate"[^>]*max="2026-10-25"/.test(html()));
  t("save disabled before preview", saveDisabled());
  t("panel invites the preview first", /id="djRulePanel"/.test(html()) && /ดูว่ากฎบอกอะไร/.test(sec("djNew")));
  t("conviction box hidden until action = buy", /id="djConvictionWrap" class="[^"]*dj-hidden/.test(html()));
  t("trade fields hidden until ticked", /id="djTradeFields" class="[^"]*dj-hidden/.test(html()));

  fillForm({ symbol: "nvda", date: "2026-10-24", event: "ข่าวร้าย ตลาดลง", direction: "down", horizon: "30", action: "sell" });
  clickAttr("data-dj-feel", "fear");
  var chip = nodeOf("data-dj-feel", "fear");
  t("feeling chip toggles on (state + class + aria-pressed)",
    S.form.feelings.join() === "fear" && /\bis-on\b/.test(chip.className || "") && chip.getAttribute("aria-pressed") === "true");
  clickAttr("data-dj-feel", "fear");
  t("feeling chip toggles off", S.form.feelings.length === 0 && chip.getAttribute("aria-pressed") === "false");
  clickAttr("data-dj-feel", "fear");
  var callsBefore = fetchCalls.length;
  return P._previewRules().then(function () {
    var oh = fetchCalls.slice(callsBefore).filter(function (c) { return /^\/api\/ohlc\?/.test(c.url); });
    t("fetched /api/ohlc for NVDA with start ~2 years back", fetchCalls.some(function (c) { return /\/api\/ohlc\?symbol=NVDA&start=2024-10-2/.test(c.url); }));
    // 2026-10-24 − 730 วัน = 2024-10-24 (2025 และ 2026 ไม่ใช่ปีอธิกสุรทิน: 365 + 365)
    t("ohlc start = record date − 730 days, cache-busted, exactly one call",
      oh.length === 1 && /^\/api\/ohlc\?symbol=NVDA&start=2024-10-24&_ts=\d+$/.test(oh[0].url), oh);
    var c = S.pricesBySymbol.NVDA;
    t("prices cached in _state by canonical symbol with Bangkok day",
      !!c && c.at === "2026-10-25" && c.bars.length === 260 && c.sourceType === "LIVE");
    var ls = null;
    try { ls = JSON.parse(store.decision_journal_ohlc_v1); } catch (e) { ls = null; }
    t("localStorage ohlc cache keyed by canonical with Bangkok day", !!ls && !!ls.NVDA && ls.NVDA.at === "2026-10-25");
    t("panel shows as-of bar and three rules", /ใช้ราคาปิด 2026-10-23/.test(html()) && /กฎ 1/.test(html()) && /กฎ 2/.test(html()) && /กฎ 3/.test(html()));
    t("panel lives in #djRulePanel inside djNew", /id="djRulePanel"/.test(sec("djNew")) && /ใช้ราคาปิด 2026-10-23/.test(sec("djNew")));
    t("panel shows the as-of close for an eyeball check", /108\.00/.test(sec("djNew")));
    t("user case → แหกกฎ with why", /แหกกฎ/.test(html()) && /EMA12 ยังเหนือ EMA26/.test(html()));
    t("แหกกฎ pill is red", /class="dj-pill is-bad">แหกกฎ</.test(sec("djNew")));
    t("rules 1 and 2 show สนับสนุน ซื้อ, marked as opposing this sell",
      countOf(/class="dj-pill is-bad">สนับสนุน ซื้อ</g) === 2);
    t("no partial-bar note when nothing was dropped", !/แท่งวันนี้ยังไม่ปิด/.test(html()));
    t("save enabled after preview", !/data-dj-save[^>]*disabled/.test(html()));
    t("preview never writes", putCalls().length === putsBefore);
    return P._save();
  }).then(function (ok) {
    var all = putCalls();
    var put = all[all.length - 1];
    t("PUT to ?doc=journal", ok === true && all.length === putsBefore + 1 && put && /\?doc=journal/.test(put.url));
    var iPut = fetchCalls.lastIndexOf(put);
    t("fresh GET of the journal right before the PUT (merge with the server copy)",
      iPut > 0 && fetchCalls[iPut - 1].method === "GET" && /^\/api\/portfolio\?doc=journal/.test(fetchCalls[iPut - 1].url));
    var body = JSON.parse(put.body).data;
    var e = body.entries[0];
    t("merged doc keeps fixture entries + new one", body.entries.length === 3 && body.trades.length === 2);
    t("new entry frozen fields", e.symbol === "NVDA" && e.date === "2026-10-24" && e.context.feelings.join() === "fear" &&
      e.view.direction === "down" && e.view.horizonDays === 30 && e.action.kind === "sell" && e.rules.version === "dj-rules-1" &&
      e.rules.asOfBar === "2026-10-23" && e.verdict.compliance === "against" && e.review.reviewedAt === null, e);
    t("entry stamps, id and the rest of the §5.1 shape",
      /^e_[0-9a-z]{8}$/.test(e.id) && isIso(e.createdAt) && e.updatedAt === e.createdAt && e.deletedAt === null && e.label === "" &&
      e.context.event === "ข่าวร้าย ตลาดลง" && e.context.note === "" && e.action.plan === "" && e.action.conviction === false &&
      e.action.tradeIds.length === 0 && e.review.selfVerdict === null && e.review.lesson === "", e);
    var direct = E.evaluateRules(BARS.NVDA, { date: "2026-10-24", nowBangkok: "2026-10-25T12:00", symbol: "NVDA", conviction: false });
    delete direct.ok; delete direct.blocked;
    t("rules = engine evaluateRules output minus ok/blocked", JSON.stringify(e.rules) === JSON.stringify(direct) &&
      !("ok" in e.rules) && !("blocked" in e.rules) && e.rules.staleSource === false && e.rules.close === 108);
    t("verdict = verdictFor(action, frozen rules)", JSON.stringify(e.verdict) === JSON.stringify(E.verdictFor("sell", e.rules)));
    t("doc-level updatedAt is the save stamp", body.updatedAt === e.createdAt && body.v === 1);
    t("new entry passes the server rules (itemProblems)", D.itemProblems(e).length === 0);
    t("sync note says saved on server", /บันทึกบนเซิร์ฟเวอร์แล้ว/.test(html()));
    t("syncState saved, no draft written", S.syncState === "saved" && S.syncNote === "บันทึกบนเซิร์ฟเวอร์แล้ว" && !store.decision_journal_draft_v1 && S.draft === null);
    t("form reset after save", getVal("djEvent") === "" && /data-dj-save[^>]*disabled/.test(html()));
    t("reset clears symbol, selects, feelings and preview; date back to today",
      getVal("djSymbol") === "" && getVal("djAction") === "" && getVal("djDate") === "2026-10-25" &&
      S.form.feelings.length === 0 && S.preview === null && countOf(/dj-chip is-on/g) === 0);
    t("summary counts the new entry", tileValue("บันทึก") === "3", tileValue("บันทึก"));
    t("no leaks after save", !LEAK.test(html()), (LEAK.exec(html()) || [])[0]);
  });
});

section("buy with conviction + real trade (Task 9)", function () {
  var D = win.DecisionJournal;
  fillForm({ symbol: "btc", date: "2026-10-24", event: "ราคาย่อ", direction: "up", horizon: "90", action: "buy",
    conviction: true, withTrade: true, qty: "0.0123", price: "80,000", fee: "2" });
  return P._previewRules().then(function () {
    t("BTC fetched with provider symbol BTC-USD", ohlcCalls("BTC-USD").length === 1, ohlcCalls("BTC-USD"));
    t("buy while rules 1+2 support → ตามกฎ green", /class="dj-pill is-good">ตามกฎ</.test(sec("djNew")));
    t("conviction box visible for buy", !/id="djConvictionWrap" class="[^"]*dj-hidden/.test(html()));
    t("trade fields visible when ticked for buy", !/id="djTradeFields" class="[^"]*dj-hidden/.test(html()));
    return P._save();
  }).then(function (ok) {
    var b = lastPut();
    var e = newEntryOf(b, function (x) { return x.symbol === "BTCUSD"; });
    var tr = b ? b.trades.filter(function (x) { return e && x.entryId === e.id; })[0] : null;
    t("saved", ok === true && !!e && !!tr);
    t("entry canonical BTCUSD, conviction frozen, per-rule",
      !!e && e.action.conviction === true && e.rules.r3.conviction === true && e.view.horizonDays === 90 && e.verdict.compliance === "per-rule", e && e.verdict);
    t("trade saved canonical symbol, decimals kept, USD, comma stripped from price",
      !!tr && tr.symbol === "BTCUSD" && tr.qty === 0.0123 && tr.price === 80000 && tr.fee === 2 && tr.currency === "USD" &&
      tr.side === "buy" && tr.date === "2026-10-24", tr);
    t("trade ↔ entry linked both ways", !!tr && e.action.tradeIds.length === 1 && e.action.tradeIds[0] === tr.id && /^t_[0-9a-z]{8}$/.test(tr.id));
    t("trade stamps + shape", !!tr && tr.createdAt === e.createdAt && tr.updatedAt === e.createdAt && tr.deletedAt === null && tr.note === "");
    t("trade passes itemProblems", !!tr && D.itemProblems(tr).length === 0);
    t("trade fields hidden again after reset", /id="djTradeFields" class="[^"]*dj-hidden/.test(html()) && getVal("djQty") === "");

    // ขาย + ติ๊กมั่นใจไว้ → ช่องนั้นใช้กับซื้อเท่านั้น จึงไม่ถูกบันทึก
    fillForm({ symbol: "NVDA", date: "2026-10-24", direction: "down", horizon: "7", action: "sell", conviction: true });
    return P._previewRules().then(function () { return P._save(); });
  }).then(function (ok) {
    var add = addedEntries();
    var e = add[0];
    t("conviction ignored for sell", ok === true && add.length === 1 && e.action.kind === "sell" && e.action.conviction === false && e.rules.r3.conviction === false);

    // ถือต่อ + ติ๊กไม้จริงค้างไว้ → ไม่มีไม้ ไม่ตัดสิน
    var nTrades = lastPut().trades.length;
    fillForm({ symbol: "NVDA", date: "2026-10-24", direction: "unsure", horizon: "30", action: "hold", withTrade: true, qty: "1", price: "100" });
    return P._previewRules().then(function () {
      t("hold → ไม่เกี่ยว pill", /class="dj-pill is-muted">ไม่เกี่ยว</.test(sec("djNew")));
      t("hold → trade option hidden", /id="djWithTradeWrap" class="[^"]*dj-hidden/.test(html()));
      return P._save();
    }).then(function (ok2) {
      var add = addedEntries();
      var e = add[0];
      t("hold saves with n/a and no trade", ok2 === true && add.length === 1 && e.action.kind === "hold" && e.verdict.compliance === "n/a" &&
        e.action.tradeIds.length === 0 && lastPut().trades.length === nTrades);
    });
  }).then(function () {
    // ไม้ที่ข้อมูลผิด → ไม่ส่ง และบอกว่าผิดตรงไหน
    var n = putCalls().length;
    fillForm({ symbol: "NVDA", date: "2026-10-24", direction: "up", horizon: "30", action: "buy", withTrade: true, qty: "0", price: "abc", fee: "-1" });
    return P._previewRules().then(function () { return P._save(); }).then(function (ok) {
      t("bad trade numbers → refused, no PUT, reasons shown", ok === false && putCalls().length === n &&
        /จำนวนต้องมากกว่า 0/.test(sec("djNew")) && /ราคาต่อหน่วยต้องมากกว่า 0/.test(sec("djNew")) && /ค่าธรรมเนียม/.test(sec("djNew")));
      t("refused save keeps what was typed", getVal("djQty") === "0" && !/data-dj-save[^>]*disabled/.test(html()));
      // หุ้นไทย + ไม้จริง (ไม่มีราคาย้อนหลังใน fixture) → สกุล THB จากตลาด
      fillForm({ symbol: "ptt.bk", date: "2026-10-24", direction: "up", horizon: "30", action: "buy", withTrade: true, qty: "100", price: "32.5" });
      return P._previewRules().then(function () { return P._save(); });
    }).then(function (ok) {
      var b = lastPut();
      var e = newEntryOf(b, function (x) { return x.symbol === "PTT.BK" && x.action.tradeIds.length === 1; });
      var tr = e ? b.trades.filter(function (x) { return x.id === e.action.tradeIds[0]; })[0] : null;
      t("Thai symbol trade defaults to THB", ok === true && !!tr && tr.currency === "THB" && tr.qty === 100 && tr.price === 32.5 && tr.fee === 0, tr);
    });
  });
});

section("blocked states (Task 9)", function () {
  var D = win.DecisionJournal;
  var S = P._state;
  fillForm({ symbol: "K-GTECHRMF", date: "2026-10-24", direction: "up", horizon: "30", action: "buy" });
  return P._previewRules().then(function () {
    t("0 bars → unknown notice and save enabled", /ไม่มีราคาย้อนหลังพอ/.test(html()) && !/data-dj-save[^>]*disabled/.test(html()));
    t("0 bars → ตัดสินไม่ได้ grey pill", /class="dj-pill is-muted">ตัดสินไม่ได้</.test(sec("djNew")));
    return P._save();
  }).then(function (ok) {
    var e = newEntryOf(lastPut(), function (x) { return x.symbol === "K-GTECHRMF"; });
    t("0-bar entry saved as unknown with every rule na", ok === true && !!e && e.verdict.compliance === "unknown" &&
      e.rules.barsUsed === 0 && e.rules.asOfBar === null && e.rules.r1.state === "na" && e.rules.r2.state === "na" && e.rules.r3.dd1yPct === null, e && e.rules);

    BARS.STALE = mkBars("2025-01-06", rep(100, 260)).slice(0, 200);   // จบก่อน 2026-10-24 นานมาก
    fillForm({ symbol: "STALE", date: "2026-10-24", direction: "up", horizon: "30", action: "buy" });
    return P._previewRules();
  }).then(function () {
    t("stale → blocked, save disabled", /ราคายังไม่มาถึงวันที่บันทึก/.test(html()) && /data-dj-save[^>]*disabled/.test(html()));
    t("stale names the last bar", html().indexOf("ล่าสุด " + BARS.STALE[199].date) >= 0, BARS.STALE[199].date);
    var n = putCalls().length;
    return P._save().then(function (ok) { t("stale → _save refuses without PUT", ok === false && putCalls().length === n); });
  }).then(function () {
    var n = fetchCalls.length;
    fillForm({ symbol: "AMD", date: "2026-10-26", direction: "up", horizon: "30", action: "buy" });
    return P._previewRules().then(function () {
      t("future date → วันที่บันทึกอยู่ในอนาคต, no fetch, save disabled",
        /วันที่บันทึกอยู่ในอนาคต/.test(html()) && fetchCalls.length === n && saveDisabled());
      return P._save();
    }).then(function (ok) { t("future → _save refuses", ok === false && fetchCalls.length === n); });
  }).then(function () {
    var n = fetchCalls.length;
    fillForm({ symbol: "AMD", date: "2026-02-30", direction: "up", horizon: "30", action: "buy" });
    return P._previewRules().then(function () {
      t("impossible date (bad-input) → message, no fetch, save disabled", /วันที่ไม่ถูกต้อง/.test(html()) && fetchCalls.length === n && saveDisabled());
      fillForm({ symbol: "AMD", date: "", direction: "up", horizon: "30", action: "buy" });
      return P._previewRules();
    }).then(function () {
      t("empty date (bad-input) → message, no fetch", /วันที่ไม่ถูกต้อง/.test(html()) && fetchCalls.length === n && saveDisabled());
      fillForm({ symbol: "ปตท", date: "2026-10-24", direction: "up", horizon: "30", action: "buy" });
      return P._previewRules();
    }).then(function () {
      t("symbol with empty canonical form → refused, no fetch",
        /สัญลักษณ์ต้องเป็นตัวอักษรภาษาอังกฤษ เช่น PTT\.BK/.test(html()) && fetchCalls.length === n && saveDisabled());
      return P._save().then(function (ok) { t("empty canonical → _save refuses", ok === false && fetchCalls.length === n); });
    });
  }).then(function () {
    // พิมพ์ ptt ไม่มี .BK แต่ในรายการมี PTT.BK → ชี้ให้เห็น
    fillForm({ symbol: "ptt", date: "2026-10-24", direction: "up", horizon: "30", action: "buy" });
    return P._previewRules().then(function () {
      t("ptt without .BK → hint to PTT.BK", /PTT\.BK/.test(sec("djNew")) && /\.BK/.test(sec("djNew")) && /หมายถึง PTT\.BK/.test(sec("djNew")));
    });
  }).then(function () {
    routeOhlc({
      NOPE: function () { return resp(502, { error: "Yahoo request failed (404)", bars: [] }); },
      DOWN: function () { return resp(502, { error: "Yahoo request failed (500)", bars: [] }); },
      OFFLINE: function () { return Promise.reject(new TypeError("Failed to fetch")); },
      SLOW: function () { return new Promise(function (r) { setTimeout(r, 60); }).then(function () { return resp(200, { bars: BARS["BTC-USD"], sourceType: "LIVE" }); }); },
      CACHED: function () { return resp(200, { bars: BARS.NVDA, sourceType: "SERVER_CACHED_DATA" }); }
    });
    fillForm({ symbol: "NOPE", date: "2026-10-24", direction: "up", horizon: "30", action: "buy" });
    return P._previewRules().then(function () {
      t("Yahoo 404 = explicit 0 bars → savable as unknown with a not-found note",
        /ไม่มีราคาย้อนหลังพอ/.test(html()) && /ไม่พบราคา/.test(sec("djNew")) && !saveDisabled());
      fillForm({ symbol: "DOWN", date: "2026-10-24", direction: "up", horizon: "30", action: "buy" });
      return P._previewRules();
    }).then(function () {
      t("price fetch failure → ดึงราคาไม่สำเร็จ with status, save disabled",
        /ดึงราคาไม่สำเร็จ/.test(sec("djNew")) && /HTTP 502/.test(sec("djNew")) && saveDisabled());
      var n = putCalls().length;
      return P._save().then(function (ok) { t("failed fetch → _save refuses", ok === false && putCalls().length === n); });
    }).then(function () {
      var before = ohlcCalls("DOWN").length;
      return P._previewRules().then(function () { t("failed fetch is not cached (retry fetches again)", ohlcCalls("DOWN").length === before + 1); });
    }).then(function () {
      fillForm({ symbol: "OFFLINE", date: "2026-10-24", direction: "up", horizon: "30", action: "buy" });
      return P._previewRules();
    }).then(function () {
      t("network reject → ดึงราคาไม่สำเร็จ, save disabled", /ดึงราคาไม่สำเร็จ/.test(sec("djNew")) && /เชื่อมต่อ/.test(sec("djNew")) && saveDisabled());
      fillForm({ symbol: "CACHED", date: "2026-10-24", direction: "up", horizon: "30", action: "buy" });
      return P._previewRules();
    }).then(function () {
      t("server-cached prices → savable with a visible warning", /สำเนาบนเซิร์ฟเวอร์/.test(sec("djNew")) && !saveDisabled());
      return P._save();
    }).then(function (ok) {
      var e = newEntryOf(lastPut(), function (x) { return x.symbol === "CACHED"; });
      t("server-cached prices → rules.staleSource true", ok === true && !!e && e.rules.staleSource === true);
      // คำตอบเก่าที่มาถึงทีหลังต้องไม่ทับแผงของคำขอใหม่
      fillForm({ symbol: "SLOW", date: "2026-10-24", direction: "up", horizon: "30", action: "buy" });
      var slow = P._previewRules();
      fillForm({ symbol: "NVDA", date: "2026-10-24", direction: "up", horizon: "30", action: "buy" });
      var fast = P._previewRules();
      return Promise.all([slow, fast]);
    }).then(function () {
      t("a slow preview answering late does not replace the newer one", S.preview && S.preview.symbol === "NVDA" && !/SLOW/.test(sec("djNew")) && !saveDisabled());
      restoreFetch();
    }, function (e) { restoreFetch(); throw e; });
  }).then(function () {
    // เปลี่ยนสัญลักษณ์/วันที่หลังดูกฎ → ปุ่มบันทึกปิด และ _save ปฏิเสธ
    setVal("djSymbol", "AMD");
    P.render();
    t("symbol changed after preview → save disabled + outdated note", saveDisabled() && /เปลี่ยนหลังดูกฎ/.test(sec("djNew")));
    var n = putCalls().length;
    return P._save().then(function (ok) {
      t("symbol changed → _save refuses and asks to preview again", ok === false && putCalls().length === n && /ดูว่ากฎบอกอะไร/.test(sec("djNew")));
      setVal("djSymbol", "NVDA"); setVal("djDate", "2026-10-22");
      P.render();
      t("date changed after preview → save disabled", saveDisabled());
    });
  }).then(function () {
    // แท่งที่ยังไม่ปิดถูกทิ้งและบอกตรง ๆ: 2026-10-24 03:00 กรุงเทพ → US ปิดถึง 2026-10-22 เท่านั้น
    P._state.nowOverride = "2026-10-24T03:00";
    fillForm({ symbol: "NVDA", date: "2026-10-23", direction: "up", horizon: "30", action: "buy" });
    return P._previewRules().then(function () {
      t("unclosed bar dropped and said so", /ใช้ราคาปิด 2026-10-22/.test(html()) && /แท่งวันนี้ยังไม่ปิด จึงไม่ใช้/.test(html()));
      P._state.nowOverride = null;
    }, function (e) { P._state.nowOverride = null; throw e; });
  }).then(function () {
    var D2 = win.DecisionJournal;
    t("still no leaks / advisory words / money in titles", !LEAK.test(html()) && !ADVISORY_TH.test(html()) && !ADVISORY_EN.test(html()) &&
      !/(title|aria-label)="[^"]*[฿$]\s?[\d,]/.test(html()), (LEAK.exec(html()) || [])[0]);
    t("engine untouched", D2 === D);
  });
});

section("save failures keep a draft (Task 9)", function () {
  var S = P._state;
  function saveOnce(kind, label) {
    fillForm({ symbol: "NVDA", date: "2026-10-24", event: "ทดสอบ " + label, direction: "up", horizon: "7", action: "buy" });
    return P._previewRules().then(function () { failPut = kind; return P._save(); })
      .then(function (ok) { failPut = null; return ok; }, function (e) { failPut = null; throw e; });
  }
  function draftDoc() { try { return JSON.parse(store.decision_journal_draft_v1).doc; } catch (e) { return null; } }
  function draftHas(label) {
    var d = draftDoc();
    return !!d && d.entries.some(function (x) { return x.context && x.context.event === "ทดสอบ " + label; });
  }
  var chain = Promise.resolve();
  [[500, "500"], [413, "413"], [400, "400"], ["reject", "reject"]].forEach(function (k) {
    chain = chain.then(function () {
      var n = putCalls().length;
      return saveOnce(k[0], k[1]).then(function (ok) {
        t("PUT fails (" + k[1] + ") → draft kept, honest note", ok === false && !!store.decision_journal_draft_v1 &&
          /ยังไม่ถึงเซิร์ฟเวอร์/.test(html()) && !/บันทึกบนเซิร์ฟเวอร์แล้ว/.test(html()), [ok, S.syncState]);
        t("PUT fails (" + k[1] + ") → it really tried to PUT", putCalls().length === n + 1);
        t("PUT fails (" + k[1] + ") → syncState draft + pinned note", S.syncState === "draft" &&
          S.syncNote === "ยังไม่ถึงเซิร์ฟเวอร์ — เก็บร่างไว้ในเครื่องนี้ จะลองส่งใหม่เมื่อเปิดหน้า", [S.syncState, S.syncNote]);
        t("PUT fails (" + k[1] + ") → the new entry is in the draft and on screen", draftHas(k[1]) &&
          S.doc.entries.some(function (x) { return x.context && x.context.event === "ทดสอบ " + k[1]; }));
        t("PUT fails (" + k[1] + ") → reason shown + retry button", (k[0] === "reject" ? /เชื่อมต่อเซิร์ฟเวอร์ไม่ได้/ : new RegExp("HTTP " + k[0])).test(sec("djSummary")) &&
          /data-dj-retry="1"/.test(sec("djSummary")));
        t("PUT fails (" + k[1] + ") → form reset (entry is safe in the draft)", getVal("djEvent") === "");
      });
    });
  });
  return chain.then(function () {
    // GET สดก่อน PUT ล้มเหลว → ห้าม PUT ทับแบบไม่ได้ merge
    var n = putCalls().length;
    fillForm({ symbol: "NVDA", date: "2026-10-24", event: "ทดสอบ get", direction: "up", horizon: "7", action: "buy" });
    return P._previewRules().then(function () { failGet = 500; return P._save(); }).then(function (ok) {
      failGet = null;
      t("fresh GET fails → no blind PUT, draft kept", ok === false && putCalls().length === n && draftHas("get") && S.syncState === "draft");
    }, function (e) { failGet = null; throw e; });
  }).then(function () {
    // เขียนร่างลงเครื่องไม่ได้ (โหมดส่วนตัว / เต็ม) → บอกว่าล้มเหลว ไม่ใช่ "เก็บร่างแล้ว"
    var ls = win.localStorage;
    var realSet = ls.setItem;
    ls.setItem = function (k, v) { if (k === "decision_journal_draft_v1") throw new Error("QuotaExceededError"); return realSet.call(ls, k, v); };
    delete store.decision_journal_draft_v1;
    return saveOnce(500, "nodraft").then(function (ok) {
      ls.setItem = realSet;
      t("draft cannot be written → error state, says so plainly", ok === false && S.syncState === "error" &&
        /ยังไม่ถึงเซิร์ฟเวอร์/.test(html()) && /เก็บร่างในเครื่องนี้ไม่ได้/.test(html()) && !/บันทึกบนเซิร์ฟเวอร์แล้ว/.test(html()));
      t("…and the entry is still held in memory", S.doc.entries.some(function (x) { return x.context && x.context.event === "ทดสอบ nodraft"; }));
    }, function (e) { ls.setItem = realSet; throw e; });
  }).then(function () {
    // สร้างร่างใหม่ (ที่รวมรายการค้างในหน่วยความจำไว้ด้วย) ให้ section ถัดไปลองส่งตอนโหลด
    return saveOnce(500, "last").then(function (ok) {
      t("next failure writes a draft that also carries the memory-only entry", ok === false && draftHas("last") && draftHas("nodraft"));
    });
  });
});

section("draft retried on load and by button (Task 9)", function () {
  var S = P._state;
  var draft = JSON.parse(store.decision_journal_draft_v1).doc;
  var ids = draft.entries.map(function (x) { return x.id; });
  failPut = null;
  fetchCalls.length = 0;
  return P.load(true).then(function () {
    t("draft re-sent on load and cleared", fetchCalls.some(function (c) { return c.method === "PUT"; }) && !store.decision_journal_draft_v1);
    var body = lastPut();
    t("re-sent doc = server ∪ draft (every draft id + the fixture entries)",
      ids.every(function (id) { return body.entries.some(function (x) { return x.id === id; }); }) &&
      body.entries.some(function (x) { return x.id === "e_fix1"; }) && body.trades.some(function (x) { return x.id === "t_fix2"; }));
    t("after resend: saved + note, no retry button", S.syncState === "saved" && /บันทึกบนเซิร์ฟเวอร์แล้ว/.test(html()) && S.draft === null &&
      !/data-dj-retry/.test(html()));
    t("page shows the re-sent entries", ids.every(function (id) { return S.doc.entries.some(function (x) { return x.id === id; }); }));
    // ปุ่ม "ลองส่งอีกครั้ง"
    fillForm({ symbol: "NVDA", date: "2026-10-24", event: "ทดสอบ retry", direction: "up", horizon: "7", action: "buy" });
    return P._previewRules().then(function () { failPut = 500; return P._save(); });
  }).then(function (ok) {
    failPut = null;
    t("draft made for the retry test", ok === false && !!store.decision_journal_draft_v1 && /data-dj-retry="1"/.test(html()));
    var n = putCalls().length;
    var clicked = clickAttr("data-dj-retry", "1");
    return flush().then(function () {
      t("retry button re-sends and clears the draft", clicked && putCalls().length === n + 1 && !store.decision_journal_draft_v1 && S.syncState === "saved" &&
        lastPut().entries.some(function (x) { return x.context && x.context.event === "ทดสอบ retry"; }));
    });
  }).then(function () {
    // ร่างที่อ่านไม่ได้ ไม่ทำให้หน้าพัง และไม่ถูกส่ง
    store.decision_journal_draft_v1 = "{bad json";
    var n = putCalls().length;
    return P.load(true).then(function () {
      t("unreadable draft ignored: no PUT, page idle", putCalls().length === n && S.syncState === "idle" && countOf(/<section id="dj/g) === 7);
      t("_readDraft() returns null for it", P._readDraft() === null);
      P._clearDraft();
      t("_clearDraft() removes it", !store.decision_journal_draft_v1 && S.draft === null);
    });
  });
});

section("client-side server rules before PUT (Task 9)", function () {
  var D = win.DecisionJournal;
  var savedNewId = D.newId;
  D.newId = function () { return ""; };   // id ว่าง = ที่เซิร์ฟเวอร์จะปฏิเสธ (journalItemProblems "id")
  var n = putCalls().length;
  fillForm({ symbol: "NVDA", date: "2026-10-24", event: "ทดสอบ id", direction: "up", horizon: "7", action: "buy" });
  return P._previewRules().then(function () { return P._save(); }).then(function (ok) {
    D.newId = savedNewId;
    t("itemProblems guard: invalid item never sent", ok === false && putCalls().length === n && !store.decision_journal_draft_v1);
    t("itemProblems guard: says why and that nothing was sent", /รหัสรายการ/.test(sec("djNew")) && /ยังไม่ได้ส่ง/.test(sec("djNew")));
    t("itemProblems guard: entry not added to the page", !P._state.doc.entries.some(function (x) { return x.context && x.context.event === "ทดสอบ id"; }));
    var savedMax = D.MAX_DOC_BYTES;
    D.MAX_DOC_BYTES = 10;
    return P._save().then(function (ok2) {
      D.MAX_DOC_BYTES = savedMax;
      t("size guard: doc over MAX_DOC_BYTES never sent", ok2 === false && putCalls().length === n && /พื้นที่บันทึก/.test(sec("djNew")));
      return P._save();
    }, function (e) { D.MAX_DOC_BYTES = savedMax; throw e; });
  }, function (e) { D.newId = savedNewId; throw e; }).then(function (ok3) {
    t("after the guards: the same form saves normally", ok3 === true && putCalls().length === n + 1);
  });
});

section("panel copy reads engine constants (Task 9)", function () {
  var D = win.DecisionJournal;
  // action ขาย: คำอธิบาย why ของเอนจินสำหรับขายไม่มีกฎ 3 (ข้อความ why เป็นของเอนจิน ใช้ค่าคงที่ภายในของเอนจินเอง
  // ซึ่งการแก้ property ใน sandbox ไม่กระทบ) — ตัวเลขที่เหลือในส่วนนี้จึงต้องมาจากหน้าเว็บอ่านค่าคงที่เท่านั้น
  fillForm({ symbol: "NVDA", date: "2026-10-24", direction: "down", horizon: "30", action: "sell" });
  return P._previewRules().then(function () {
    var m = sec("djNew");
    t("rule 2 hint shows ±TOUCH_BAND_PCT% and ≥ CONFIRM_BARS วัน", m.indexOf("±" + D.TOUCH_BAND_PCT + "%") >= 0 && m.indexOf("≥ " + D.CONFIRM_BARS + " วัน") >= 0 && D.TOUCH_BAND_PCT === 3);
    t("rule 3 hint + conviction label show |DIP_PCT|%", (m.match(new RegExp(Math.abs(D.DIP_PCT) + "%", "g")) || []).length >= 2);
    t("horizon labels derived from HORIZONS", /1 สัปดาห์/.test(selectHtml("djHorizon")) && /3 เดือน/.test(selectHtml("djHorizon")));
    var saved = { TOUCH_BAND_PCT: D.TOUCH_BAND_PCT, CONFIRM_BARS: D.CONFIRM_BARS, DIP_PCT: D.DIP_PCT, HORIZONS: D.HORIZONS };
    D.TOUCH_BAND_PCT = 7; D.CONFIRM_BARS = 5; D.DIP_PCT = -33; D.HORIZONS = [5, 60];
    P.render();
    var m2 = sec("djNew");
    t("mutated constants flow into the form/panel copy", m2.indexOf("±7%") >= 0 && m2.indexOf("≥ 5 วัน") >= 0 && m2.indexOf("33%") >= 0 &&
      /value="5"/.test(selectHtml("djHorizon")) && /value="60"/.test(selectHtml("djHorizon")));
    t("old numbers gone after mutation", m2.indexOf("±3%") < 0 && m2.indexOf("≥ 2 วัน") < 0 && m2.indexOf("20%") < 0 && !/value="90"/.test(selectHtml("djHorizon")));
    Object.keys(saved).forEach(function (k) { D[k] = saved[k]; });
    P.render();
    t("constants restored", sec("djNew").indexOf("±3%") >= 0);
    return null;
  });
});

section("price cache (Task 9)", function () {
  var S = P._state;
  fillForm({ symbol: "NVDA", date: "2026-10-24", direction: "up", horizon: "30", action: "buy" });
  var n0 = ohlcCalls("NVDA").length;
  return P._previewRules().then(function () {
    t("same day, same closed bar → memory cache, no fetch", ohlcCalls("NVDA").length === n0 && S.preview.status === "ok");
    S.pricesBySymbol = {};
    return P._previewRules();
  }).then(function () {
    t("memory cleared → localStorage cache, no fetch", ohlcCalls("NVDA").length === n0 && S.preview.status === "ok" &&
      S.pricesBySymbol.NVDA && S.pricesBySymbol.NVDA.bars.length === 260 && /ใช้ราคาปิด 2026-10-23/.test(html()));
    P._state.nowOverride = "2026-10-26T06:00";   // US ปิดถึง 2026-10-25 แล้ว — แท่งที่ดึงไว้อาจยังไม่ปิดตอนดึง
    return P._previewRules();
  }).then(function () {
    t("closed-bar cutoff moved → fetch again", ohlcCalls("NVDA").length === n0 + 1 && S.pricesBySymbol.NVDA.at === "2026-10-26");
    P._state.nowOverride = null;
    return P._previewRules();   // กลับมาเวลาเทสต์ปกติ → ดึงใหม่ 1 ครั้ง (cache เป็นของวันอื่น)
  }, function (e) { P._state.nowOverride = null; throw e; }).then(function () {
    var n1 = ohlcCalls("NVDA").length;
    return P._previewRules().then(function () {
      t("back on the fixture day: cached again", ohlcCalls("NVDA").length === n1);
      fillForm({ symbol: "NVDA", date: "2026-01-05", direction: "up", horizon: "30", action: "buy" });
      return P._previewRules();
    }).then(function () {
      t("needs older history than cached → fetch with the earlier start",
        ohlcCalls("NVDA").length === n1 + 1 && ohlcCalls("NVDA").slice(-1)[0].url.indexOf("start=2024-01-06&") > 0);
    });
  }, function (e) { P._state.nowOverride = null; throw e; }).then(function () {
    // วันเดียวกัน แต่แท่ง "ปิดแล้ว" เลื่อน: 2026-10-25 04:00 → US ปิดถึง 10-23 · 06:00 → ปิดถึง 10-24
    // แท่งที่ดึงมาตอน 04:00 อาจเป็นแท่งที่ยังไม่ปิด ห้ามใช้ต่อหลัง 05:00
    P._state.nowOverride = "2026-10-25T04:00";
    fillForm({ symbol: "NVDA", date: "2026-10-23", direction: "up", horizon: "30", action: "buy" });
    var n3;
    return P._previewRules().then(function () {
      n3 = ohlcCalls("NVDA").length;
      P._state.nowOverride = "2026-10-25T06:00";
      return P._previewRules();
    }).then(function () {
      t("same Bangkok day but the closed-bar cutoff moved → fetch again",
        ohlcCalls("NVDA").length === n3 + 1 && S.pricesBySymbol.NVDA.at === "2026-10-25" && S.pricesBySymbol.NVDA.cutoff === "2026-10-24");
      P._state.nowOverride = null;
    }, function (e) { P._state.nowOverride = null; throw e; });
  }).then(function () {
    store.decision_journal_ohlc_v1 = "{broken";
    S.pricesBySymbol = {};
    var n2 = ohlcCalls("NVDA").length;
    var threw = false;
    return P._previewRules().then(null, function () { threw = true; }).then(function () {
      t("broken localStorage cache → fetch, no throw", !threw && ohlcCalls("NVDA").length === n2 + 1 && S.preview.status === "ok");
      return P._fetchBars("nvda", "2024-01-06").then(function (r) {
        t("_fetchBars returns { bars, sourceType } by canonical symbol", Array.isArray(r.bars) && r.bars.length === 260 && r.sourceType === "LIVE");
      });
    });
  });
});

// ============================================================
// Task 9 — แก้ตามรีวิว: ร่างหาย · merge กับสำเนาสด · error หลัง PUT สำเร็จ · วาดใหม่ระหว่างพิมพ์
// ============================================================
function hasId(list, id) { return (list || []).some(function (x) { return x && x.id === id; }); }
function draftObj() { try { return JSON.parse(store.decision_journal_draft_v1).doc; } catch (e) { return null; } }
function fixtureIdsIn(b) {
  return !!b && hasId(b.entries, "e_fix1") && hasId(b.entries, "e_fix2") && hasId(b.trades, "t_fix1") && hasId(b.trades, "t_fix2");
}

section("save merges with the FRESH server copy (Task 9 review fix)", function () {
  var S = P._state;
  delete store.decision_journal_draft_v1;
  S.pendingDoc = null;
  JOURNAL = freshJournal();
  return P.load(true).then(function () {
    // อีกเครื่องบันทึกหลังหน้านี้โหลดไปแล้ว — หน้านี้ไม่เคยเห็นรายการนี้
    JOURNAL.entries.push(mkEntry({ id: "e_otherDevice", createdAt: "2026-10-25T04:00:00.000Z", date: "2026-10-25", symbol: "NVDA",
      event: "จากอีกเครื่อง", direction: "up", horizonDays: 30, action: "hold", asOfBar: "2026-10-23", close: 108,
      verdict: { compliance: "n/a", supports: [], opposes: [], rulesSay: "buy", why: "" } }));
    JOURNAL.trades.push(mkTrade({ id: "t_otherDevice", createdAt: "2026-10-25T04:00:00.000Z", date: "2026-10-24", symbol: "NVDA",
      side: "buy", qty: 1, price: 108, currency: "USD" }));
    t("precondition: the page has not seen the other device's items",
      !hasId(S.doc.entries, "e_otherDevice") && !hasId(S.doc.trades, "t_otherDevice"));
    fillForm({ symbol: "NVDA", date: "2026-10-24", event: "ทดสอบ merge สด", direction: "up", horizon: "30", action: "buy" });
    return P._previewRules().then(function () { return P._save(); });
  }).then(function (ok) {
    var b = lastPut();
    var mine = newEntryOf(b, function (x) { return x.context && x.context.event === "ทดสอบ merge สด"; });
    t("PUT carries the other device's entry + trade (merged with the fresh GET, not the page copy)",
      ok === true && hasId(b.entries, "e_otherDevice") && hasId(b.trades, "t_otherDevice"), b && b.entries.map(function (x) { return x.id; }));
    t("…plus the new entry and every fixture item", !!mine && fixtureIdsIn(b));
    t("page now shows the other device's entry", hasId(S.doc.entries, "e_otherDevice") && hasId(S.doc.trades, "t_otherDevice"));
    JOURNAL = freshJournal();
  }, function (e) { JOURNAL = freshJournal(); throw e; });
});

section("draft survives a failed first load (Task 9 review fix)", function () {
  var S = P._state;
  var X = mkEntry({ id: "e_draftX", createdAt: "2026-10-24T05:00:00.000Z", date: "2026-10-24", symbol: "NVDA",
    event: "ร่างค้าง X", direction: "up", horizonDays: 30, action: "buy", asOfBar: "2026-10-23", close: 108,
    verdict: { compliance: "per-rule", supports: ["r1"], opposes: [], rulesSay: "buy", why: "" } });
  var tX = mkTrade({ id: "t_draftX", createdAt: "2026-10-24T05:00:00.000Z", date: "2026-10-24", symbol: "NVDA",
    side: "buy", qty: 2, price: 108, currency: "USD", entryId: "e_draftX" });
  X.action.tradeIds = ["t_draftX"];
  function seed() {
    store.decision_journal_draft_v1 = JSON.stringify({
      doc: { v: 1, updatedAt: "2026-10-24T05:00:00.000Z", entries: [X], trades: [tX] }, savedAt: "2026-10-24T05:00:00.000Z" });
    S.pendingDoc = null;
    S.doc = null;          // เปิดหน้ามาแล้ว GET แรกล้ม → ยังไม่รู้ว่าบนเซิร์ฟเวอร์มีอะไร
  }
  seed();
  var n0 = putCalls().length;
  failGet = 500;
  return P.load(true).then(function () {
    failGet = null;
    t("first load fails → no PUT, draft untouched, doc unknown", putCalls().length === n0 && !!draftObj() &&
      hasId(draftObj().entries, "e_draftX") && S.doc === null && S.syncState === "error");
    t("…and the page says a draft is waiting", /data-dj-retry="1"/.test(sec("djSummary")) && /ยังไม่ถึงเซิร์ฟเวอร์/.test(sec("djSummary")));
    // ผู้ใช้บันทึกรายการใหม่ (สำเนาสดตอน save โหลดได้แล้ว)
    fillForm({ symbol: "NVDA", date: "2026-10-24", event: "ทดสอบ หลังโหลดล้ม", direction: "up", horizon: "30", action: "buy" });
    return P._previewRules().then(function () { return P._save(); });
  }, function (e) { failGet = null; throw e; }).then(function (ok) {
    var b = lastPut();
    t("save after a failed load: the PUT carries the draft entry + trade",
      ok === true && putCalls().length === n0 + 1 && hasId(b.entries, "e_draftX") && hasId(b.trades, "t_draftX"),
      b && b.entries.map(function (x) { return x.id; }));
    t("…and the new entry and the server's items",
      !!newEntryOf(b, function (x) { return x.context && x.context.event === "ทดสอบ หลังโหลดล้ม"; }) && fixtureIdsIn(b));
    t("draft cleared only after it reached the server", !store.decision_journal_draft_v1 && S.draft === null && S.pendingDoc === null &&
      S.syncState === "saved" && hasId(S.doc.entries, "e_draftX"));

    // แบบที่สอง: GET สดตอนบันทึกก็ล้มด้วย → ร่างที่เขียนใหม่ต้องยังมี X (ห้ามเขียนทับด้วย doc ที่ไม่มี X)
    seed();
    failGet = 500;
    return P.load(true).then(function () {
      fillForm({ symbol: "NVDA", date: "2026-10-24", event: "ทดสอบ get ล้มสองรอบ", direction: "up", horizon: "30", action: "buy" });
      return P._previewRules().then(function () { return P._save(); });
    }).then(function (ok2) {
      var d = draftObj();
      t("GET fails at save too → no PUT, rewritten draft still has X + the new entry",
        ok2 === false && putCalls().length === n0 + 1 && !!d && hasId(d.entries, "e_draftX") && hasId(d.trades, "t_draftX") &&
        d.entries.some(function (x) { return x.context && x.context.event === "ทดสอบ get ล้มสองรอบ"; }));
      failGet = null;
      return P.load(true);
    }).then(function () {
      var b2 = lastPut();
      t("next load re-sends both and clears the draft", putCalls().length === n0 + 2 && hasId(b2.entries, "e_draftX") &&
        b2.entries.some(function (x) { return x.context && x.context.event === "ทดสอบ get ล้มสองรอบ"; }) && !store.decision_journal_draft_v1);
    }, function (e) { failGet = null; throw e; });
  }).then(function () {
    // แท็บอื่นเขียนร่างเพิ่มระหว่างที่หน้านี้กำลัง PUT → ห้ามลบร่างนั้น (ยังไม่ถึงเซิร์ฟเวอร์)
    var late = mkEntry({ id: "e_lateTab", createdAt: "2026-10-25T05:00:00.000Z", date: "2026-10-25", symbol: "NVDA",
      event: "จากอีกแท็บ", direction: "up", horizonDays: 7, action: "hold", asOfBar: "2026-10-23", close: 108,
      verdict: { compliance: "n/a", supports: [], opposes: [], rulesSay: "buy", why: "" } });
    win.fetch = function (url, init) {
      if (/^\/api\/portfolio\?doc=journal/.test(String(url)) && init && init.method === "PUT") {
        store.decision_journal_draft_v1 = JSON.stringify({
          doc: { v: 1, updatedAt: "2026-10-25T05:00:00.000Z", entries: [late], trades: [] }, savedAt: "2026-10-25T05:00:00.000Z" });
      }
      return BASE_FETCH(url, init);
    };
    fillForm({ symbol: "NVDA", date: "2026-10-24", event: "ทดสอบ แท็บอื่น", direction: "up", horizon: "30", action: "buy" });
    return P._previewRules().then(function () { return P._save(); }).then(function (ok) {
      restoreFetch();
      var b = lastPut();
      t("draft written by another tab mid-PUT is kept (not in what was sent)", ok === true && !hasId(b.entries, "e_lateTab") &&
        !!draftObj() && hasId(draftObj().entries, "e_lateTab"));
      t("…saved state for this entry, but the waiting draft is still shown with retry",
        P._state.syncState === "saved" && /data-dj-retry="1"/.test(sec("djSummary")));
      clickAttr("data-dj-retry", "1");
      return flush();
    }, function (e) { restoreFetch(); throw e; }).then(function () {
      t("retry sends the other tab's draft and only then clears it", hasId(lastPut().entries, "e_lateTab") && !store.decision_journal_draft_v1);
    });
  });
});

section("an error after a successful PUT is not reported as not saved (Task 9 review fix)", function () {
  var S = P._state;
  var D = win.DecisionJournal;
  var realLive = D.liveEntries;
  var realErr = console.error;
  var logged = 0;
  var n = putCalls().length;
  win.fetch = function (url, init) {
    var p = BASE_FETCH(url, init);
    if (/^\/api\/portfolio\?doc=journal/.test(String(url)) && init && init.method === "PUT") {
      // PUT ผ่านแล้ว → การวาดหน้าหลังจากนั้นพัง
      return p.then(function (r) { D.liveEntries = function () { throw new Error("render boom"); }; return r; });
    }
    return p;
  };
  function undo() { restoreFetch(); D.liveEntries = realLive; console.error = realErr; }
  fillForm({ symbol: "NVDA", date: "2026-10-24", event: "ทดสอบ วาดพัง", direction: "up", horizon: "30", action: "buy" });
  return P._previewRules().then(function () {
    console.error = function () { logged++; };
    return P._save();
  }).then(function (ok) {
    undo();
    t("render throws after a 200 PUT → save still resolves true", ok === true && putCalls().length === n + 1);
    t("…state says saved, no draft written, nothing pending", S.syncState === "saved" && S.syncNote === "บันทึกบนเซิร์ฟเวอร์แล้ว" &&
      !store.decision_journal_draft_v1 && S.pendingDoc === null && S.draft === null);
    t("…and the error is logged, not swallowed silently", logged >= 1);
    P.render();
    t("next render shows saved, not ยังไม่ถึงเซิร์ฟเวอร์", /บันทึกบนเซิร์ฟเวอร์แล้ว/.test(sec("djSummary")) && !/ยังไม่ถึงเซิร์ฟเวอร์/.test(html()));
  }, function (e) { undo(); throw e; });
});

section("async completions do not rebuild the form while typing (Task 9 review fix)", function () {
  var S = P._state;
  var MARK = "<!--typing-marker-->";
  P.render();
  fillForm({ symbol: "NVDA", date: "2026-10-24", event: "กำลังพิม", direction: "up", horizon: "30", action: "buy" });
  doc.activeElement = doc.getElementById("djEvent");
  els.djRoot.innerHTML = html() + MARK;
  doc.getElementById("djSummary").innerHTML = "";
  function cleanup() { doc.activeElement = null; }
  return P.load(true).then(function () {
    t("load while typing: #djRoot not rebuilt", html().indexOf(MARK) >= 0);
    t("…summary updated in place (inner content only)", /ตรงกับเซิร์ฟเวอร์/.test(els.djSummary.innerHTML) &&
      /โหลดเมื่อ/.test(els.djSummary.innerHTML) && !/<section/.test(els.djSummary.innerHTML) && /<h2 id="djSummaryH">/.test(els.djSummary.innerHTML));
    t("…typed text untouched", getVal("djEvent") === "กำลังพิม");
    return P._previewRules();
  }).then(function () {
    t("preview result lands in #djRulePanel without rebuilding", html().indexOf(MARK) >= 0 &&
      /ใช้ราคาปิด 2026-10-23/.test(els.djRulePanel.innerHTML) && els.djSaveBtn.disabled === false && els.djPreviewBtn.disabled === false);
    setVal("djAction", "");
    return P._save();
  }).then(function (ok) {
    t("refusal while typing shows in #djFormMsgBox", ok === false && html().indexOf(MARK) >= 0 && /ยังไม่ได้เลือก/.test(els.djFormMsgBox.innerHTML));
    setVal("djAction", "buy");
    return P._save();
  }).then(function (ok) {
    t("save completion while typing: status updated in place", ok === true && html().indexOf(MARK) >= 0 &&
      /บันทึกบนเซิร์ฟเวอร์แล้ว/.test(els.djSaveStatus.innerHTML) && /บันทึกบนเซิร์ฟเวอร์แล้ว/.test(els.djSummary.innerHTML) &&
      els.djSaveBtn.disabled === true && els.djFormMsgBox.innerHTML === "");
    t("…form chrome follows the reset form (conviction hidden)", /dj-hidden/.test(els.djConvictionWrap.className || ""));
    cleanup();
    P.render();
    t("focus left the form → full render again", html().indexOf(MARK) < 0 && /บันทึกบนเซิร์ฟเวอร์แล้ว/.test(sec("djSummary")) &&
      countOf(/<section id="dj/g) === 7);
  }).then(null, function (e) { cleanup(); throw e; });
});

section("draft written by another tab while this tab's save fails is kept (Task 9 review-2 fix)", function () {
  var S = P._state;
  JOURNAL = freshJournal();
  delete store.decision_journal_draft_v1;
  S.draft = null;
  S.pendingDoc = null;
  function lateEntry(id, ev) {
    return mkEntry({ id: id, createdAt: "2026-10-25T06:00:00.000Z", date: "2026-10-25", symbol: "NVDA",
      event: ev, direction: "up", horizonDays: 7, action: "hold", asOfBar: "2026-10-23", close: 108,
      verdict: { compliance: "n/a", supports: [], opposes: [], rulesSay: "buy", why: "" } });
  }
  function otherTabWrites(entry) {
    store.decision_journal_draft_v1 = JSON.stringify({
      doc: { v: 1, updatedAt: "2026-10-25T06:00:00.000Z", entries: [entry], trades: [] }, savedAt: "2026-10-25T06:00:00.000Z" });
  }
  function isJournal(url) { return /^\/api\/portfolio\?doc=journal/.test(String(url)); }
  var n0 = putCalls().length;
  // แบบ 1: แท็บอื่นเขียนร่างระหว่าง PUT แล้ว PUT ได้ 500
  win.fetch = function (url, init) {
    if (isJournal(url) && init && init.method === "PUT") otherTabWrites(lateEntry("e_lateFail", "จากอีกแท็บ ตอน PUT ล้ม"));
    return BASE_FETCH(url, init);
  };
  fillForm({ symbol: "NVDA", date: "2026-10-24", event: "ทดสอบ PUT ล้ม แท็บอื่น", direction: "up", horizon: "30", action: "buy" });
  return P._previewRules().then(function () { failPut = 500; return P._save(); }).then(function (ok) {
    failPut = null;
    restoreFetch();
    var d = draftObj();
    t("PUT 500 while another tab wrote a draft → draft keeps the other tab's entry",
      ok === false && putCalls().length === n0 + 1 && !!d && hasId(d.entries, "e_lateFail"), d && d.entries.map(function (x) { return x.id; }));
    t("…and this tab's new entry", !!d && d.entries.some(function (x) { return x.context && x.context.event === "ทดสอบ PUT ล้ม แท็บอื่น"; }));
    t("…the page shows draft kept, not saved", S.syncState === "draft" && /ยังไม่ถึงเซิร์ฟเวอร์/.test(sec("djSummary")) &&
      !/บันทึกบนเซิร์ฟเวอร์แล้ว/.test(sec("djSummary")) && hasId(S.doc.entries, "e_lateFail"));

    // แบบ 2: แท็บอื่นเขียนร่างระหว่าง GET สดตอนบันทึก แล้ว GET ได้ 500
    var armed = true;
    win.fetch = function (url, init) {
      var isGet = !(init && init.method && String(init.method).toUpperCase() !== "GET");
      if (armed && isJournal(url) && isGet) {
        armed = false;
        otherTabWrites(lateEntry("e_lateGetFail", "จากอีกแท็บ ตอน GET ล้ม"));
        failGet = 500;
      }
      return BASE_FETCH(url, init);
    };
    fillForm({ symbol: "NVDA", date: "2026-10-24", event: "ทดสอบ GET ล้ม แท็บอื่น", direction: "up", horizon: "30", action: "buy" });
    return P._previewRules().then(function () { return P._save(); });
  }, function (e) { failPut = null; restoreFetch(); throw e; }).then(function (ok) {
    failGet = null;
    restoreFetch();
    var d = draftObj();
    t("GET 500 while another tab wrote a draft → draft keeps the other tab's entry",
      ok === false && putCalls().length === n0 + 1 && !!d && hasId(d.entries, "e_lateGetFail"), d && d.entries.map(function (x) { return x.id; }));
    t("…plus this tab's earlier and new entries (in-memory pending carried over)", !!d &&
      d.entries.some(function (x) { return x.context && x.context.event === "ทดสอบ GET ล้ม แท็บอื่น"; }) &&
      d.entries.some(function (x) { return x.context && x.context.event === "ทดสอบ PUT ล้ม แท็บอื่น"; }));
    return P.load(true);
  }, function (e) { failGet = null; restoreFetch(); throw e; }).then(function () {
    var b = lastPut();
    t("next load sends everything and clears the draft", putCalls().length === n0 + 2 && hasId(b.entries, "e_lateFail") &&
      hasId(b.entries, "e_lateGetFail") && !store.decision_journal_draft_v1 && S.pendingDoc === null && S.syncState === "saved");
  });
});

section("failed first load + failed save: summary never passes the local draft off as server data (Task 9 review-2 fix)", function () {
  var S = P._state;
  var D = win.DecisionJournal;
  JOURNAL = freshJournal();
  delete store.decision_journal_draft_v1;
  S.draft = null;
  S.pendingDoc = null;
  S.doc = null;
  S.serverLoaded = false;    // เหมือนเปิดหน้าใหม่: ยังไม่เคยได้สำเนาจากเซิร์ฟเวอร์
  failGet = 500;
  return P.load(true).then(function () {
    t("first load fails → counts unknown (—)", tileValue("บันทึก") === "—" && tileValue("ไม้จริง") === "—", [tileValue("บันทึก"), tileValue("ไม้จริง")]);
    t("…alert says the server content is unknown", /ยังไม่รู้ว่าบนเซิร์ฟเวอร์มีบันทึกอะไรบ้าง/.test(sec("djSummary")) &&
      !/โหลดได้ครั้งก่อน/.test(sec("djSummary")));
    fillForm({ symbol: "NVDA", date: "2026-10-24", event: "ทดสอบ โหลดล้ม บันทึกล้ม", direction: "up", horizon: "30", action: "buy" });
    return P._previewRules().then(function () { return P._save(); });
  }).then(function (ok) {
    var sum = sec("djSummary");
    t("save with GET 500 → not saved, draft kept", ok === false && !!draftObj() && S.syncState === "draft" && /HTTP 500/.test(S.loadError || ""),
      [ok, S.syncState, S.loadError]);
    t("…summary does not say โหลดได้ครั้งก่อน", !/โหลดได้ครั้งก่อน/.test(sum) && /ยังไม่รู้ว่าบนเซิร์ฟเวอร์มีบันทึกอะไรบ้าง/.test(sum));
    t("…the local count is not shown as the server total", tileValue("บันทึก") === "—" && tileValue("ไม้จริง") === "—",
      [tileValue("บันทึก"), tileValue("ไม้จริง")]);
    t("…it is labelled as local draft only", /เฉพาะร่างในเครื่องนี้: บันทึก 1 · ไม้จริง 0 — ยังไม่รู้ว่าบนเซิร์ฟเวอร์มีอะไร/.test(sum));
    failGet = null;
    return P.load(true);
  }, function (e) { failGet = null; throw e; }).then(function () {
    var want = String(D.liveEntries(JOURNAL).length + 1);
    var sum = sec("djSummary");
    t("after the server is back: draft sent, real total shown", S.serverLoaded === true && S.syncState === "saved" &&
      !store.decision_journal_draft_v1 && tileValue("บันทึก") === want && !/เฉพาะร่างในเครื่องนี้/.test(sum),
      [tileValue("บันทึก"), want, S.syncState]);
  }, function (e) { failGet = null; throw e; });
});

// ============================================================
// Task 10 — ไทม์ไลน์บันทึก · ผลจริง +7/+30/+90 · ตัวกรอง · ลบ (ยืนยันก่อน)
// ============================================================
// HTML ของการ์ดบันทึกเดียว (<article> ไม่ซ้อนกัน)
function cardOf(id) {
  var h = html();
  var i = h.indexOf('data-dj-entry="' + id + '"');
  if (i < 0) return "";
  var start = h.lastIndexOf("<article", i);
  var end = h.indexOf("</article>", i);
  return h.slice(start, end < 0 ? h.length : end + 10);
}
function logIds() { return collectAttr("data-dj-entry"); }
function logCount() { return countOf(/data-dj-entry="/g); }
// ช่องผลจริงของช่วง h ในการ์ด (ในช่องมีแต่ <span> จึงจบที่ </div> ตัวแรก)
function hzCell(card, h) {
  var i = card.indexOf('data-hz="' + h + '"');
  if (i < 0) return "";
  var s = card.lastIndexOf("<div", i);
  return card.slice(s, card.indexOf("</div>", i) + 6);
}
function filterSel(key) {
  var h = sec("djLog");
  var i = h.indexOf('data-dj-filter="' + key + '"');
  if (i < 0) return "";
  return h.slice(h.lastIndexOf("<select", i), h.indexOf("</select>", i));
}
function setBarClose(sym, ymd, close) {
  BARS[sym].forEach(function (b) { if (b.date === ymd) { b.open = close; b.high = close; b.low = close; b.close = close; } });
}
function barClose(sym, ymd) {
  var b = BARS[sym].filter(function (x) { return x.date === ymd; })[0];
  return b ? b.close : null;
}
// เริ่มจากสำเนาเซิร์ฟเวอร์ (JOURNAL) ล้วน ๆ: ไม่มีร่าง · ไม่มี cache ราคา · ไม่มีผลเก่า · ไม่มีตัวกรอง
function freshLogPage() {
  var S = P._state;
  delete store.decision_journal_draft_v1;
  delete store.decision_journal_ohlc_v1;
  S.draft = null;
  S.pendingDoc = null;
  S.pricesBySymbol = {};
  S.outcomesById = {};
  if (S.priceErrBySymbol) S.priceErrBySymbol = {};
  S.filters = {};
  S.confirmDelId = null;
  fetchCalls.length = 0;
  return P.load(true);
}

section("log: timeline cards + outcomes (Task 10)", function () {
  var S = P._state;
  // แผน Task 10: BARS.NVDA มี 2026-08-31 ปิด 100 และ 2026-09-08 ปิด 103 — แท่งอื่นคงเดิม
  // (ค้างไว้ให้งานถัดไป: Task 11 ใช้ผล +7 ของ e_fix1 ชุดเดียวกัน)
  setBarClose("NVDA", "2026-09-08", 103);
  t("fixture: NVDA 2026-08-31 = 100 · 2026-09-08 = 103", barClose("NVDA", "2026-08-31") === 100 && barClose("NVDA", "2026-09-08") === 103);
  t("page API: _loadOutcomes / _deleteEntry / _setFilter", typeof P._loadOutcomes === "function" &&
    typeof P._deleteEntry === "function" && typeof P._setFilter === "function");
  JOURNAL = freshJournal();
  return freshLogPage().then(function () {
    return P._loadOutcomes();
  }).then(function () {
    t("cards rendered for live entries", logCount() === 2);
    t("cards live in djLog as <article class=\"dj-card …\">, newest first",
      logIds().join() === "e_fix2,e_fix1" && /<article class="dj-card[^"]*" data-dj-entry="e_fix1"/.test(sec("djLog")), logIds());
    var c1 = cardOf("e_fix1"), c2 = cardOf("e_fix2");
    // +7 จาก 2026-09-01 (อังคาร) = 2026-09-08 (อังคาร) · ref = ปิด 2026-08-31 ของชุดสด = 100
    // pct = (103 − 100) × 100 / 100 = +3.0 · US ณ 2026-10-25 12:00 ปิดถึง 2026-10-24 ≥ เป้า → scored
    // คาดลง แต่ +3.0 > +FLAT_BAND_PCT (2) → คาดผิด · ขายแล้วราคาขึ้น → ผลของการขาย ไม่ดี
    t("e_fix1 shows +7 = +3.0% and คาดผิด (predicted down, price up)", /\+3\.0%/.test(c1) && /คาดผิด/.test(c1));
    t("e_fix2 +90 pending shows รอ", /รอ/.test(c2));
    t("compliance pills", /แหกกฎ/.test(c1) && /ตามกฎ/.test(c2));
    t("compliance pill colours: แหกกฎ red · ตามกฎ green", /class="dj-pill is-bad">แหกกฎ</.test(c1) && /class="dj-pill is-good">ตามกฎ</.test(c2));
    var want1 = E.outcomes(JOURNAL.entries[0], BARS.NVDA, "2026-10-25T12:00");
    t("_state.outcomesById[id] = engine outcomes(entry, bars, nowBangkok)",
      !!S.outcomesById.e_fix1 && JSON.stringify(S.outcomesById.e_fix1) === JSON.stringify(want1) && !!S.outcomesById.e_fix2, S.outcomesById.e_fix1);
    t("+7 cell of e_fix1 is the own horizon (is-due) with +3.0% and the close 103.00",
      /is-due/.test(hzCell(c1, 7)) && /\+3\.0%/.test(hzCell(c1, 7)) && /103\.00/.test(hzCell(c1, 7)) && /2026-09-08/.test(hzCell(c1, 7)));
    t("+3.0% is outside the flat band → coloured up", /dj-up/.test(hzCell(c1, 7)));
    t("only the own horizon is marked", (c1.match(/is-due/g) || []).length === 1 && (c2.match(/is-due/g) || []).length === 1 && /is-due/.test(hzCell(c2, 90)));
    // +30 = 2026-10-01 (พฤหัส) ปิด 100 → (100 − 100) × 100 / 100 = 0.0% · +90 = 2026-11-30 ยังไม่ปิด → รอ
    t("e_fix1 +30 = 0.0% · +90 รอ (2026-11-30 not closed yet)",
      /0\.0%/.test(hzCell(c1, 30)) && /รอ/.test(hzCell(c1, 90)) && !/%/.test(hzCell(c1, 90)) && /2026-11-30/.test(hzCell(c1, 90)));
    // TH ณ 2026-10-25 12:00 ปิดถึง 2026-10-24 < 2026-10-27 (+7) → ทุกช่วง pending ไม่มีตัวเลข
    t("e_fix2: every horizon pending, no number, and the own result says ยังไม่ถึงกำหนด",
      [7, 30, 90].every(function (h) { return /รอ/.test(hzCell(c2, h)) && !/%/.test(hzCell(c2, h)); }) && /ยังไม่ถึงกำหนด/.test(c2));
    t("action result: ขาย then price up → ผลของการขาย ไม่ดี", /ผลของการขาย/.test(c1) && /class="dj-pill is-bad">ไม่ดี</.test(c1) && /ขายแล้วราคาขึ้น/.test(c1));
    t("card: date · symbol · action chip · view · event · feelings",
      /2026-09-01/.test(c1) && /NVDA/.test(c1) && /class="dj-act">ขาย</.test(c1) && /class="dj-act">ซื้อ</.test(c2) &&
      /คาดว่า/.test(c1) && /ลง/.test(c1) && /1 สัปดาห์/.test(c1) && /3 เดือน/.test(c2) &&
      /ข่าวร้าย ตลาดลง/.test(c1) && /class="dj-tag">กลัว</.test(c1) && /class="dj-tag">นิ่ง</.test(c2));
    t("กฎบอกว่า: three chips (กฎ 1 EMA · กฎ 2 SMA200 · กฎ 3 −x.x%)",
      /กฎบอกว่า/.test(c1) && /กฎ 1 [^<]*ขาขึ้น/.test(c1) && /กฎ 2 [^<]*เหนือ SMA200/.test(c1) && /กฎ 3 −5\.0%/.test(c1));
    t("rule chip colours follow the frozen verdict (r1 opposed this sell = red, supported that buy = green)",
      /class="dj-rchip is-bad">กฎ 1/.test(c1) && /class="dj-rchip is-good">กฎ 1/.test(c2) && /class="dj-rchip is-muted">กฎ 2/.test(c1));
    t("frozen why shown", /EMA12 ยังเหนือ EMA26/.test(c1));
    t("ref close + as-of bar shown for an eyeball check", /ราคาตั้งต้น 100\.00 \(2026-08-31\)/.test(c1) && /ราคาถึง 2026-10-23/.test(c1));
    // fixture ไม่มีราคา PTT.BK (0 แท่ง) → บอกตรง ๆ ว่ายังไม่มีราคา ไม่ปล่อยให้ "—" โผล่มาเงียบ ๆ ทีหลัง
    t("symbol with no price data says so on its card (only there)", /ยังไม่มีราคาปิดของ PTT\.BK/.test(c2) && !/ยังไม่มีราคาปิดของ/.test(c1));
    t("delete button on every card, no confirm before a click",
      /data-dj-del="e_fix1"/.test(c1) && /data-dj-del="e_fix2"/.test(c2) && !/data-dj-del-confirm=/.test(html()));
    t("no lesson block when not reviewed", !/บทเรียน/.test(c1));
    t("no NaN/undefined, advisory words or money in titles", !LEAK.test(html()) && !ADVISORY_TH.test(html()) && !ADVISORY_EN.test(html()) &&
      !/(title|aria-label)="[^"]*[฿$]\s?[\d,]/.test(html()), (LEAK.exec(html()) || [])[0]);
  });
});

section("log: filters (Task 10)", function () {
  var D = win.DecisionJournal;
  t("four filter selects in djLog", ["symbol", "feeling", "compliance", "action"].every(function (k) {
    return new RegExp('<select[^>]*data-dj-filter="' + k + '"').test(sec("djLog"));
  }));
  t("filters have visible labels", (sec("djLog").match(/<label class="dj-field-l" for="djFilter_/g) || []).length === 4);
  t("symbol options = symbols of live entries", /<option value="NVDA"/.test(filterSel("symbol")) && /<option value="PTT\.BK"/.test(filterSel("symbol")) &&
    (filterSel("symbol").match(/<option value="[^"]+"/g) || []).length === 2);
  t("feeling options from engine FEELINGS", D.FEELINGS.every(function (f) { return filterSel("feeling").indexOf('value="' + f.key + '">' + f.thai) >= 0; }));
  t("compliance options", /value="per-rule">ตามกฎ/.test(filterSel("compliance")) && /value="against">แหกกฎ/.test(filterSel("compliance")) &&
    /value="unknown">ตัดสินไม่ได้/.test(filterSel("compliance")) && /value="n\/a">/.test(filterSel("compliance")));
  t("action options from engine ACTIONS", D.ACTIONS.every(function (a) { return filterSel("action").indexOf('value="' + a.key + '">' + a.thai) >= 0; }));
  t("filter by symbol hides others", (changeAttr("data-dj-filter", "symbol", "PTT.BK"), logCount() === 1));
  t("…the remaining card is PTT.BK and the count says 1 of 2", logIds().join() === "e_fix2" && /แสดง 1 จาก 2/.test(sec("djLog")));
  t("…the chosen option stays selected, _state.filters records it",
    /<option value="PTT\.BK" selected/.test(filterSel("symbol")) && P._state.filters.symbol === "PTT.BK");
  changeAttr("data-dj-filter", "symbol", "");
  t("clearing the symbol filter shows both", logCount() === 2 && !P._state.filters.symbol);
  changeAttr("data-dj-filter", "feeling", "fear");
  t("feeling fear → e_fix1 only", logIds().join() === "e_fix1");
  changeAttr("data-dj-filter", "feeling", "");
  changeAttr("data-dj-filter", "compliance", "per-rule");
  t("compliance per-rule → e_fix2 only", logIds().join() === "e_fix2");
  changeAttr("data-dj-filter", "compliance", "against");
  t("compliance against → e_fix1 only", logIds().join() === "e_fix1");
  changeAttr("data-dj-filter", "action", "buy");
  t("against + buy → no cards, says so, offers a clear button",
    logCount() === 0 && /ไม่มีบันทึกที่ตรงกับตัวกรอง/.test(sec("djLog")) && /data-dj-filter-clear="1"/.test(sec("djLog")));
  clickAttr("data-dj-filter-clear", "1");
  t("clear button resets every filter", logCount() === 2 && Object.keys(P._state.filters).every(function (k) { return !P._state.filters[k]; }));
  t("no clear button when nothing is filtered", !/data-dj-filter-clear=/.test(html()));
  P._setFilter("action", "sell");
  t("_setFilter(key, value) works directly", logIds().join() === "e_fix1");
  P._setFilter("bogus", "x");
  t("unknown filter key ignored", logIds().join() === "e_fix1" && !Object.prototype.hasOwnProperty.call(P._state.filters, "bogus"));
  P._setFilter("action", "");
  t("back to both", logCount() === 2);
  return null;
});

section("log: delete with confirm (Task 10)", function () {
  var S = P._state;
  var n0 = putCalls().length;
  clickAttr("data-dj-del", "e_fix1");
  t("first click shows a confirm step, nothing sent, card still there",
    /data-dj-del-confirm="e_fix1"/.test(cardOf("e_fix1")) && putCalls().length === n0 && logCount() === 2);
  t("confirm says what happens (gone everywhere, real trades kept)", /ทุกเครื่อง/.test(cardOf("e_fix1")) && /ไม้จริง/.test(cardOf("e_fix1")));
  t("only that card asks for confirmation", !/data-dj-del-confirm=/.test(cardOf("e_fix2")));
  clickAttr("data-dj-del-cancel", "e_fix1");
  t("cancel hides the confirm, nothing sent", !/data-dj-del-confirm=/.test(html()) && putCalls().length === n0 && logCount() === 2);
  t("delete requires confirm then tombstones and PUTs", (function () {
    clickAttr("data-dj-del", "e_fix1");
    var confirmShown = /data-dj-del-confirm="e_fix1"/.test(html());
    clickAttr("data-dj-del-confirm", "e_fix1");
    return confirmShown;
  })());
  return flush().then(function () {
    var put = lastPut();
    var e1 = put.entries.filter(function (x) { return x.id === "e_fix1"; })[0];
    t("deleted entry kept as tombstone in PUT, hidden from log", !!e1.deletedAt && logCount() === 1);
    var all = putCalls();
    var iPut = fetchCalls.lastIndexOf(all[all.length - 1]);
    t("exactly one PUT to ?doc=journal, right after a fresh GET", all.length === n0 + 1 && /\?doc=journal/.test(all[all.length - 1].url) &&
      fetchCalls[iPut - 1].method === "GET" && /^\/api\/portfolio\?doc=journal/.test(fetchCalls[iPut - 1].url));
    t("tombstone keeps only the merge keys and passes itemProblems",
      Object.keys(e1).sort().join() === "createdAt,date,deletedAt,id,symbol,updatedAt" && win.DecisionJournal.itemProblems(e1).length === 0, Object.keys(e1));
    var e2 = put.entries.filter(function (x) { return x.id === "e_fix2"; })[0];
    t("the other entry and every trade untouched", !!e2 && !e2.deletedAt && put.trades.length === 2 && put.trades.every(function (x) { return !x.deletedAt; }));
    t("saved on the server after delete", S.syncState === "saved" && /บันทึกบนเซิร์ฟเวอร์แล้ว/.test(sec("djSummary")) && tileValue("บันทึก") === "1");
    t("ohlc fetched at most once per symbol with concurrency pool",
      fetchCalls.filter(function (c) { return /\/api\/ohlc\?symbol=NVDA/.test(c.url); }).length === 1);
    // ช่วงราคาที่ดึง = วันที่บันทึกเก่าสุดของสัญลักษณ์นั้น − MAX_STALE_DAYS (7): 2026-09-01 − 7 = 2026-08-25 · 2026-10-20 − 7 = 2026-10-13
    t("ohlc start = earliest entry date of that symbol − MAX_STALE_DAYS",
      ohlcCalls("NVDA").length === 1 && ohlcCalls("NVDA")[0].url.indexOf("start=2026-08-25&") > 0 &&
      ohlcCalls("PTT.BK").length === 1 && ohlcCalls("PTT.BK")[0].url.indexOf("start=2026-10-13&") > 0 && E.MAX_STALE_DAYS === 7,
      fetchCalls.filter(function (c) { return /\/api\/ohlc/.test(c.url); }).map(function (c) { return c.url; }));
    return P._deleteEntry("e_nope");
  }).then(function (ok) {
    var n1 = putCalls().length;
    t("_deleteEntry(unknown id) → false, nothing sent", ok === false && putCalls().length === n1);
    // ลบตอนเซิร์ฟเวอร์ล่ม → tombstone อยู่ในร่าง รายการซ่อน และบอกตรง ๆ ว่ายังไม่ถึงเซิร์ฟเวอร์
    failPut = 500;
    clickAttr("data-dj-del", "e_fix2");
    clickAttr("data-dj-del-confirm", "e_fix2");
    return flush();
  }).then(function () {
    failPut = null;
    var d = draftObj();
    var t2 = d ? d.entries.filter(function (x) { return x.id === "e_fix2"; })[0] : null;
    t("delete with PUT 500 → tombstone kept in the draft, entry hidden, honest status",
      !!t2 && !!t2.deletedAt && logCount() === 0 && S.syncState === "draft" && !/บันทึกบนเซิร์ฟเวอร์แล้ว/.test(sec("djSummary")));
    t("empty log says so (no filter row)", /ยังไม่มีบันทึก/.test(sec("djLog")) && !/data-dj-filter=/.test(sec("djLog")));
    return P.load(true);
  }, function (e) { failPut = null; throw e; }).then(function () {
    var b = lastPut();
    var t2 = b.entries.filter(function (x) { return x.id === "e_fix2"; })[0];
    t("next load re-sends the tombstone and clears the draft", !!t2 && !!t2.deletedAt && !store.decision_journal_draft_v1 && logCount() === 0);
  });
});

section("log: horizons come from H.status / H.pct only · ทรงตัว band from the engine (Task 10)", function () {
  var D = win.DecisionJournal;
  var realOutcomes = D.outcomes;
  JOURNAL = freshJournal();
  return freshLogPage().then(function () {
    // ตัวปลอม: pending ที่มี date/close/pct ปนมา (ห้ามแสดง) · no-data · scored ติดลบ · คาด/ผล = flat
    D.outcomes = function (entry) {
      if (entry.id !== "e_fix1") return realOutcomes.apply(null, arguments);
      return { refClose: 100, refSource: "fresh", priceBasisChanged: true, lastClosedBar: "2026-10-23", dueDate: "2026-09-08",
        horizons: {
          "7": { target: "2026-09-08", status: "pending", date: "2026-09-08", close: 155.5, pct: 55.5 },
          "30": { target: "2026-10-01", status: "no-data", date: null, close: null, pct: null },
          "90": { target: "2026-11-30", status: "scored", date: "2026-11-27", close: 95.74, pct: -4.26 }
        },
        predicted: "flat", actionResult: "flat" };
    };
    return P._loadOutcomes();
  }).then(function () {
    D.outcomes = realOutcomes;
    var c1 = cardOf("e_fix1");
    t("pending → รอ; the stray date/close/pct are not shown", /รอ/.test(hzCell(c1, 7)) && !/55\.5|155\.50/.test(c1));
    t("no-data → — (no number)", /—/.test(hzCell(c1, 30)) && !/%/.test(hzCell(c1, 30)) && /ไม่มีราคา/.test(hzCell(c1, 30)));
    t("scored → pct from H.pct, red for a fall outside the band", /−4\.3%/.test(hzCell(c1, 90)) && /dj-down/.test(hzCell(c1, 90)) && /95\.74/.test(hzCell(c1, 90)));
    t("priceBasisChanged note", /ราคาย้อนหลังถูกปรับ \(เช่น แตกพาร์\) เทียบจากชุดราคาปัจจุบัน/.test(c1));
    t("flat prediction + flat action result say ทรงตัว with ±FLAT_BAND_PCT% read from the engine",
      /class="dj-pill is-muted">ทรงตัว</.test(c1) && c1.indexOf("±" + D.FLAT_BAND_PCT + "%") >= 0 && D.FLAT_BAND_PCT === 2 && /ผลของการขาย/.test(c1));
    var saved = D.FLAT_BAND_PCT;
    D.FLAT_BAND_PCT = 4.5;
    P.render();
    var m = cardOf("e_fix1");
    t("mutated FLAT_BAND_PCT flows into the log copy (and the colour band)", m.indexOf("±4.5%") >= 0 && m.indexOf("±2%") < 0 && !/dj-down/.test(hzCell(m, 90)));
    D.FLAT_BAND_PCT = saved;
    P.render();
    t("constant restored", cardOf("e_fix1").indexOf("±2%") >= 0);
    // HORIZONS เปลี่ยน → ช่องตามค่าคงที่ ช่วงที่ไม่มีในผล = — ไม่ใช่ undefined
    var savedH = D.HORIZONS;
    D.HORIZONS = [5, 60];
    P.render();
    var h2 = cardOf("e_fix1");
    t("horizon cells follow HORIZONS; a horizon missing from the outcome shows —",
      /data-hz="5"/.test(h2) && /data-hz="60"/.test(h2) && !/data-hz="90"/.test(h2) && /—/.test(hzCell(h2, 5)) && !LEAK.test(html()));
    D.HORIZONS = savedH;
    P.render();
  }, function (e) { D.outcomes = realOutcomes; throw e; });
});

section("log: loading · buy-back line · price fetch failure is honest (Task 10)", function () {
  var S = P._state;
  JOURNAL = freshJournal();
  // e_fix1 (ขาย 2026-09-01) ผูกไม้ขาย 2 @100 และไม้ซื้อกลับ 2 @104 (2026-09-04)
  // → (104 − 100) × 100 / 100 = +4.0% · 104 − 100 = +$4.00 ต่อหน่วย
  JOURNAL.entries[0].action.tradeIds = ["t_sell1", "t_back1"];
  JOURNAL.trades.push(mkTrade({ id: "t_sell1", createdAt: "2026-09-01T03:00:00.000Z", date: "2026-09-01", symbol: "NVDA", side: "sell", qty: 2, price: 100, currency: "USD", entryId: "e_fix1" }));
  JOURNAL.trades.push(mkTrade({ id: "t_back1", createdAt: "2026-09-04T03:00:00.000Z", date: "2026-09-04", symbol: "NVDA", side: "buy", qty: 2, price: 104, currency: "USD", entryId: "e_fix1" }));
  routeOhlc({
    NVDA: function () { return new Promise(function (r) { setTimeout(r, 80); }).then(function () { return resp(200, { bars: BARS.NVDA, sourceType: "LIVE" }); }); },
    "PTT.BK": function () { return resp(500, { error: "upstream down" }); }
  });
  var loading = freshLogPage();
  return new Promise(function (r) { setTimeout(r, 30); }).then(function () {
    t("while prices load the card says so (no blank, no fake number)", /กำลังดึงราคา/.test(cardOf("e_fix1")) && !/data-hz=/.test(cardOf("e_fix1")));
    return loading;
  }).then(function () {
    restoreFetch();
    var c1 = cardOf("e_fix1"), c2 = cardOf("e_fix2");
    t("buy-back line: ซื้อกลับแพงกว่าที่ขาย +4.0% (+$4.00 ต่อหน่วย)", /ซื้อกลับแพงกว่าที่ขาย \+4\.0% \(\+\$4\.00 ต่อหน่วย\)/.test(c1), c1);
    t("buying back higher is red", /class="dj-buyback is-bad"/.test(c1));
    t("no buy-back line on a buy entry", !/ซื้อกลับ/.test(c2));
    t("price fetch failure → card says so with the status, no fake outcome",
      /ดึงราคาไม่สำเร็จ/.test(c2) && /HTTP 500/.test(c2) && !/data-hz=/.test(c2) && !S.outcomesById.e_fix2);
    t("…with a retry button", /data-dj-outcomes-retry="1"/.test(c2));
    t("the other symbol is unaffected", /\+3\.0%/.test(c1));
    clickAttr("data-dj-outcomes-retry", "1");
    return flush();
  }, function (e) { restoreFetch(); throw e; }).then(function () {
    var c2 = cardOf("e_fix2");
    t("retry after recovery → outcomes shown, error gone", !/ดึงราคาไม่สำเร็จ/.test(c2) && /รอ/.test(hzCell(c2, 90)) && !!S.outcomesById.e_fix2);
  });
});

section("log: lesson shown when reviewed (Task 10)", function () {
  JOURNAL = freshJournal();
  JOURNAL.entries[0].review = { reviewedAt: "2026-09-10T03:00:00.000Z", selfVerdict: "wrong", lesson: "ขายเพราะกลัว แล้วเด้ง" };
  return freshLogPage().then(function () {
    var c1 = cardOf("e_fix1");
    t("lesson + self verdict on the card", /บทเรียน/.test(c1) && /ขายเพราะกลัว แล้วเด้ง/.test(c1) && /ตัดสินใจผิด/.test(c1));
    t("not on the unreviewed card", !/บทเรียน/.test(cardOf("e_fix2")));
  });
});

section("log: ohlc pool — once per symbol, at most 4 in flight (Task 10)", function () {
  var S = P._state;
  var syms = ["AAA", "BBB", "CCC", "DDD", "EEE", "FFF"];
  JOURNAL = freshJournal();
  JOURNAL.entries = [];
  JOURNAL.trades = [];
  syms.forEach(function (s) {
    [1, 2].forEach(function (k) {
      JOURNAL.entries.push(mkEntry({ id: "e_pool_" + s + k, createdAt: "2026-10-0" + k + "T03:00:00.000Z", date: "2026-10-0" + k, symbol: s,
        direction: "up", horizonDays: 7, action: "hold", asOfBar: "2026-09-30", close: 100,
        verdict: { compliance: "n/a", supports: [], opposes: [], rulesSay: "none", why: "" } }));
    });
  });
  var inflight = 0, maxInflight = 0, routes = {};
  syms.forEach(function (s) {
    routes[s] = function () {
      inflight++;
      maxInflight = Math.max(maxInflight, inflight);
      return new Promise(function (r) { setTimeout(r, 15); }).then(function () {
        inflight--;
        return resp(200, { bars: BARS.NVDA, sourceType: "LIVE" });
      });
    };
  });
  routeOhlc(routes);
  return freshLogPage().then(function () {
    restoreFetch();
    t("12 entries over 6 symbols rendered", logCount() === 12);
    t("each symbol fetched exactly once (two entries share one fetch)", syms.every(function (s) { return ohlcCalls(s).length === 1; }),
      syms.map(function (s) { return ohlcCalls(s).length; }));
    // วันที่เก่าสุดของแต่ละสัญลักษณ์ 2026-10-01 − 7 = 2026-09-24
    t("start = earliest entry of that symbol − MAX_STALE_DAYS", syms.every(function (s) { return ohlcCalls(s)[0].url.indexOf("start=2026-09-24&") > 0; }));
    t("never more than 4 requests in flight (page's own pool)", maxInflight === 4, maxInflight);
    t("every entry got an outcome", syms.every(function (s) { return !!S.outcomesById["e_pool_" + s + "1"] && !!S.outcomesById["e_pool_" + s + "2"]; }));
    var calls = [];
    win.mapWithConcurrency = function (items, limit, worker) {
      calls.push({ n: items.length, limit: limit });
      return Promise.all(items.map(function (x, i) { return worker(x, i); }));
    };
    S.pricesBySymbol = {};
    delete store.decision_journal_ohlc_v1;
    return P._loadOutcomes().then(function () {
      delete win.mapWithConcurrency;
      t("uses window.mapWithConcurrency(items, 4, worker) when present (api-auth.js)", calls.length === 1 && calls[0].limit === 4 && calls[0].n === 6, calls);
    }, function (e) { delete win.mapWithConcurrency; throw e; });
  }, function (e) { restoreFetch(); throw e; }).then(function () {
    JOURNAL = freshJournal();
    return freshLogPage();
  });
});

section("log: CSS (Task 10)", function () {
  var css = readPub("decision-journal.css").replace(/\/\*[\s\S]*?\*\//g, "");
  t("CSS: log card, horizon grid, own-horizon and filters styled",
    /\.dj-entry\b/.test(css) && /\.dj-hzs\s*\{[^}]*grid-template-columns/.test(css) && /\.dj-hz\.is-due\s*\{/.test(css) && /\.dj-filters\s*\{/.test(css));
  t("CSS: horizon values are tabular-nums and right-aligned", /\.dj-hz-v\s*\{[^}]*tabular-nums[^}]*\}/.test(css) && /\.dj-hz-v\s*\{[^}]*text-align:\s*right/.test(css));
  var i = css.indexOf("@media (max-width: 600px)");
  var blk = i < 0 ? "" : css.slice(i);
  t("CSS: mobile filters drop to two columns", /\.dj-filters\s*\{[^}]*grid-template-columns:\s*repeat\(2/.test(blk));
  t("CSS: long event text wraps (no horizontal page scroll)", /\.dj-entry-event\s*\{[^}]*overflow-wrap:\s*anywhere/.test(css));
  return null;
});

// ============================================================
// Task 11 — คิวทบทวน (ถึงกำหนดทบทวน)
// ============================================================
// HTML ของการ์ดทบทวนเดียว (<article data-dj-review> ไม่ซ้อนกัน)
function reviewCard(id) {
  var h = html();
  var i = h.indexOf('data-dj-review="' + id + '"');
  if (i < 0) return "";
  var start = h.lastIndexOf("<article", i);
  var end = h.indexOf("</article>", i);
  return h.slice(start, end < 0 ? h.length : end + 10);
}
function reviewIds() { return collectAttr("data-dj-review"); }
function reviewCount() { return countOf(/data-dj-review="/g); }
function textOf(s) { return String(s).replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " "); }
function reviewHidden() { return /<section id="djReview" class="dj-block[^"]*\bdj-hidden\b/.test(html()); }
function entryIn(body, id) { return (body ? body.entries : []).filter(function (x) { return x && x.id === id; })[0] || null; }

section("review (Task 11)", function () {
  var S = P._state;
  var D = win.DecisionJournal;
  t("page API: _saveReview", typeof P._saveReview === "function");
  JOURNAL = freshJournal();
  var before = JSON.parse(JSON.stringify(JOURNAL.entries[0]));
  // Task 10 ตั้ง NVDA 2026-09-08 = 103 ไว้แล้ว (ชุดเดียวกัน)
  t("fixture: NVDA 2026-08-31 = 100 · 2026-09-08 = 103", barClose("NVDA", "2026-08-31") === 100 && barClose("NVDA", "2026-09-08") === 103);
  return freshLogPage().then(function () {
    // เวลา fixture 2026-10-25T12:00
    //   e_fix1: +7 จาก 2026-09-01 = 2026-09-08 · US ปิดถึง 2026-10-24 ≥ เป้า → scored → ถึงกำหนด
    //   e_fix2: +90 จาก 2026-10-20 = 2027-01-18 > cutoff → pending → ยังไม่ถึงกำหนด
    t("review queue lists only due entries", countOf(/data-dj-review="/g) === 1 && /data-dj-review="e_fix1"/.test(html()), reviewIds());
    t("summary says รอทบทวน 1", /รอทบทวน<\/[^>]+>\s*<[^>]+>1/.test(html()) || /รอทบทวน 1/.test(html()));
    t("summary tile รอทบทวน = 1 (first tile) and the callout links to #djReview",
      tileValue("รอทบทวน") === "1" && sec("djSummary").indexOf("รอทบทวน") < sec("djSummary").indexOf(">บันทึก<") &&
      /<a [^>]*href="#djReview"[^>]*>[\s\S]*รอทบทวน 1 รายการ/.test(sec("djSummary")), tileValue("รอทบทวน"));
    t("review section visible and the card lives in djReview", !reviewHidden() && /data-dj-review="e_fix1"/.test(sec("djReview")));
    t("review card is not a log card (log still counts 2)", logCount() === 2 && !/data-dj-entry=/.test(reviewCard("e_fix1")));
    var r = reviewCard("e_fix1"), rt = textOf(r);
    t("card: date · symbol · action · compliance pill · due date",
      /2026-09-01/.test(r) && /NVDA/.test(r) && /class="dj-act">ขาย</.test(r) && /class="dj-pill is-bad">แหกกฎ</.test(r) && /2026-09-08/.test(rt));
    t("card: what was thought (direction + horizon, event, feelings)",
      /คาดว่าราคาจะลง ภายใน 1 สัปดาห์/.test(rt) && /ข่าวร้าย ตลาดลง/.test(r) && /class="dj-tag">กลัว</.test(r));
    t("card: กฎบอกว่า chips + frozen why", /กฎบอกว่า/.test(r) && /class="dj-rchip is-bad">กฎ 1/.test(r) && /EMA12 ยังเหนือ EMA26/.test(r));
    // ref = ปิด 2026-08-31 = 100 · ที่กำหนด = ปิด 2026-09-08 = 103 · (103 − 100) × 100 / 100 = +3.0
    t("price line: ราคาตอนนั้น 100.00 → ที่กำหนด 103.00 (+3.0%)", /ราคาตอนนั้น 100\.00 → ที่กำหนด 103\.00 \(\+3\.0%\)/.test(rt), rt);
    t("price line names both bars (2026-08-31 → 2026-09-08)", /2026-08-31/.test(rt) && /2026-09-08/.test(rt));
    // ราคาปิดล่าสุด = 2026-10-23 ปิด 108 (RISE8 ตัวสุดท้าย) — ราคาตลาด ไม่ใช่เงินส่วนตัว
    t("latest close shown for context (no extra % computed by the page)", /ล่าสุด 108\.00 \(2026-10-23\)/.test(rt), rt);
    t("+3.0% is coloured up", /class="dj-up"[^>]*>\(\+3\.0%\)/.test(r));
    t("auto result from outcomes(): คาดผิด + ผลของการขาย ไม่ดี",
      /class="dj-pill is-bad">คาดผิด</.test(r) && /ผลของการขาย/.test(r) && /class="dj-pill is-bad">ไม่ดี</.test(r));
    t("lesson textarea with a visible label", /<textarea id="djLesson-e_fix1"/.test(r) && /<label[^>]*for="djLesson-e_fix1"[^>]*>บทเรียน/.test(r));
    t("three self-verdict buttons + one save button",
      ["right", "wrong", "mixed"].every(function (k) { return new RegExp('<button type="button"[^>]*data-dj-review-verdict="e_fix1:' + k + '"').test(r); }) &&
      /<button type="button"[^>]*data-dj-review-save="e_fix1"/.test(r) && (r.match(/dj-btn-primary/g) || []).length === 1);
    t("verdict buttons read ตัดสินใจถูก / ตัดสินใจผิด / ก้ำกึ่ง and none is pressed yet",
      /ตัดสินใจถูก/.test(r) && /ตัดสินใจผิด/.test(r) && /ก้ำกึ่ง/.test(r) && !/aria-pressed="true"/.test(r));
    t("no NaN/undefined, advisory words or money in titles",
      !LEAK.test(html()) && !ADVISORY_TH.test(html()) && !ADVISORY_EN.test(html()) && !/(title|aria-label)="[^"]*[฿$]\s?[\d,]/.test(html()),
      (LEAK.exec(html()) || [])[0]);

    // บันทึกโดยยังไม่เลือกถูก/ผิด/ก้ำกึ่ง → ไม่ส่ง และบอกเหตุผลที่การ์ดนั้น
    var n0 = putCalls().length;
    clickAttr("data-dj-review-save", "e_fix1");
    return flush().then(function () {
      t("save without a self-verdict → nothing sent, the card says why",
        putCalls().length === n0 && /เลือกก่อน/.test(reviewCard("e_fix1")) && reviewCount() === 1);

      // ขั้นตามแผน
      setVal("djLesson-e_fix1", "ขายเพราะกลัว แล้วเด้ง"); clickAttr("data-dj-review-verdict", "e_fix1:wrong");
      var r2 = reviewCard("e_fix1");
      t("chosen verdict is pressed (aria-pressed) and the typed lesson survives the re-render",
        /aria-pressed="true"[^>]*data-dj-review-verdict="e_fix1:wrong"/.test(r2) && (r2.match(/aria-pressed="true"/g) || []).length === 1 &&
        />ขายเพราะกลัว แล้วเด้ง<\/textarea>/.test(r2) && !/เลือกก่อน/.test(r2));
      clickAttr("data-dj-review-save", "e_fix1");
      return flush();
    }).then(function () {
      var e1 = lastPut().entries.filter(function (x) { return x.id === "e_fix1"; })[0];
      t("review saved with stamp, verdict, lesson; frozen fields untouched", e1.review.reviewedAt && e1.review.selfVerdict === "wrong" && e1.review.lesson === "ขายเพราะกลัว แล้วเด้ง" && e1.rules.asOfBar === "2026-08-31" && e1.verdict.compliance === "against");
      t("queue empties and log card shows the lesson", countOf(/data-dj-review="/g) === 0 && /ขายเพราะกลัว แล้วเด้ง/.test(cardOf("e_fix1")));
      // ช่องที่แช่แข็งตามสเปก §5.1 ต้องเหมือนเดิมทุกตัวอักษร
      var frozen = ["id", "createdAt", "date", "symbol", "label", "context", "view", "action", "rules", "verdict"];
      t("every frozen field byte-identical to the stored entry", frozen.every(function (k) { return JSON.stringify(e1[k]) === JSON.stringify(before[k]); }),
        frozen.filter(function (k) { return JSON.stringify(e1[k]) !== JSON.stringify(before[k]); }));
      t("updatedAt bumped (merge picks this copy), reviewedAt is an ISO stamp",
        isIso(e1.updatedAt) && e1.updatedAt > before.updatedAt && isIso(e1.review.reviewedAt) && e1.review.reviewedAt === e1.updatedAt);
      t("reviewed entry passes the server rules", D.itemProblems(e1).length === 0);
      t("the other entry and every trade untouched",
        JSON.stringify(entryIn(lastPut(), "e_fix2")) === JSON.stringify(JOURNAL.entries[1]) && lastPut().trades.length === 2);
      var all = putCalls();
      var iPut = fetchCalls.lastIndexOf(all[all.length - 1]);
      t("one PUT to ?doc=journal right after a fresh GET", all.length === n0 + 1 && /\?doc=journal/.test(all[all.length - 1].url) &&
        fetchCalls[iPut - 1].method === "GET" && /^\/api\/portfolio\?doc=journal/.test(fetchCalls[iPut - 1].url));
      t("log card: lesson + ตัดสินใจผิด + ทบทวนแล้ว", /ตัดสินใจผิด/.test(cardOf("e_fix1")) && /ทบทวนแล้ว/.test(cardOf("e_fix1")));
      t("summary: รอทบทวน 0, no callout, saved on server",
        tileValue("รอทบทวน") === "0" && !/href="#djReview"/.test(sec("djSummary")) && S.syncState === "saved" && /บันทึกบนเซิร์ฟเวอร์แล้ว/.test(sec("djSummary")));
      t("right after saving, the review section says what was saved (not hidden yet)",
        !reviewHidden() && /ทบทวน NVDA · 2026-09-01/.test(textOf(sec("djReview"))) && /บันทึกบนเซิร์ฟเวอร์แล้ว/.test(sec("djReview")));
      // เซิร์ฟเวอร์จำสิ่งที่ PUT ไปแล้ว → เปิดหน้าใหม่ไม่มีอะไรรอทบทวน → section ซ่อน (หัวข้อยังอยู่ใน DOM)
      JOURNAL = JSON.parse(JSON.stringify(lastPut()));
      return freshLogPage();
    }).then(function () {
      t("nothing due → djReview hidden with dj-hidden (heading kept)", reviewHidden() && reviewCount() === 0 && /ถึงกำหนดทบทวน/.test(sec("djReview")));
      t("…and the summary still says รอทบทวน 0", tileValue("รอทบทวน") === "0");
      t("a reviewed entry from the server is never due again", !D.reviewDue(entryIn(JOURNAL, "e_fix1"), S.outcomesById.e_fix1) && !!S.outcomesById.e_fix1);
    });
  });
});

section("review: guards and failures (Task 11)", function () {
  var S = P._state;
  JOURNAL = freshJournal();
  return freshLogPage().then(function () {
    var n0 = putCalls().length;
    return P._saveReview("e_nope", { selfVerdict: "wrong", lesson: "x" }).then(function (ok) {
      t("_saveReview(unknown id) → false, nothing sent", ok === false && putCalls().length === n0);
      return P._saveReview("e_fix1", { selfVerdict: "maybe", lesson: "x" });
    }).then(function (ok) {
      t("_saveReview with an unknown self-verdict → false, nothing sent, says why",
        ok === false && putCalls().length === n0 && /เลือกก่อน/.test(reviewCard("e_fix1")));
      // ยังไม่ถึงกำหนด (pending) → ไม่ให้ทบทวนล่วงหน้า (คิวมาจาก reviewDue ของเอนจินเท่านั้น)
      return P._saveReview("e_fix2", { selfVerdict: "right", lesson: "เร็วไป" });
    }).then(function (ok) {
      t("_saveReview on an entry that is not due → false, nothing sent", ok === false && putCalls().length === n0);
      failPut = 500;
      return P._saveReview("e_fix1", { selfVerdict: "mixed", lesson: "  ครึ่ง ๆ  " });
    }).then(function (ok) {
      failPut = null;
      var d = draftObj();
      var e1 = d ? entryIn(d, "e_fix1") : null;
      t("PUT 500 → false, the review is kept in the local draft (lesson trimmed)",
        ok === false && !!e1 && e1.review.selfVerdict === "mixed" && e1.review.lesson === "ครึ่ง ๆ" && !!e1.review.reviewedAt);
      t("…honest status: draft, never 'saved', in the summary and in the review section",
        S.syncState === "draft" && !/บันทึกบนเซิร์ฟเวอร์แล้ว/.test(html()) && /ยังไม่ถึงเซิร์ฟเวอร์/.test(sec("djReview")));
      t("…the entry leaves the queue (the review exists locally) and the log shows it", reviewCount() === 0 && /ครึ่ง ๆ/.test(cardOf("e_fix1")) && /ก้ำกึ่ง/.test(cardOf("e_fix1")));
      return P.load(true);
    }, function (e) { failPut = null; throw e; }).then(function () {
      var e1 = entryIn(lastPut(), "e_fix1");
      t("next load re-sends the review and clears the draft",
        !!e1 && e1.review.selfVerdict === "mixed" && !store.decision_journal_draft_v1 && reviewCount() === 0, e1 && e1.review);
    });
  });
});

section("review: horizons from H.status · no-data · ทรงตัว band from the engine (Task 11)", function () {
  var D = win.DecisionJournal;
  var realOutcomes = D.outcomes;
  JOURNAL = freshJournal();
  return freshLogPage().then(function () {
    // ตัวปลอม: e_fix1 ช่วงของตัวเอง (7) = no-data · e_fix2 ช่วงของตัวเอง (90) = scored +1.5% (ในแถบทรงตัว) · flat ทั้งคาดและผล
    D.outcomes = function (entry) {
      if (entry.id === "e_fix1") {
        return { refClose: 100, refSource: "fresh", priceBasisChanged: false, lastClosedBar: "2026-10-23", dueDate: "2026-09-08",
          horizons: {
            "7": { target: "2026-09-08", status: "no-data", date: null, close: null, pct: null },
            "30": { target: "2026-10-01", status: "scored", date: "2026-10-01", close: 100, pct: 0 },
            "90": { target: "2026-11-30", status: "pending", date: "2026-11-27", close: 155.5, pct: 55.5 }
          },
          predicted: "no-data", actionResult: "no-data" };
      }
      return { refClose: 32, refSource: "fresh", priceBasisChanged: true, lastClosedBar: "2026-10-23", dueDate: "2027-01-18",
        horizons: {
          "7": { target: "2026-10-27", status: "scored", date: "2026-10-27", close: 32, pct: 0 },
          "30": { target: "2026-11-19", status: "scored", date: "2026-11-19", close: 32, pct: 0 },
          "90": { target: "2027-01-18", status: "scored", date: "2027-01-18", close: 32.48, pct: 1.5 }
        },
        predicted: "flat", actionResult: "flat" };
    };
    return P._loadOutcomes();
  }).then(function () {
    D.outcomes = realOutcomes;
    t("no-data own horizon is still due (engine reviewDue) · oldest due first", reviewIds().join() === "e_fix1,e_fix2", reviewIds());
    var r1 = textOf(reviewCard("e_fix1")), r2 = reviewCard("e_fix2");
    t("no-data → ที่กำหนด — with ไม่มีราคา, no % (the stray pending pct is not shown)",
      /ราคาตอนนั้น 100\.00 → ที่กำหนด —/.test(r1) && /ไม่มีราคา/.test(r1) && !/%\)/.test(r1) && !/55\.5|155\.50/.test(r1), r1);
    // (32.48 − 32) × 100 / 32 = 1.5 → |1.5| ≤ FLAT_BAND_PCT (2) → ไม่ลงสี
    t("scored +1.5% inside the band: price line uncoloured, ทรงตัว with ±FLAT_BAND_PCT% from the engine",
      /ราคาตอนนั้น 32\.00 → ที่กำหนด 32\.48 \(\+1\.5%\)/.test(textOf(r2)) && !/class="dj-up"[^>]*>\(\+1\.5%\)/.test(r2) &&
      /class="dj-pill is-muted">ทรงตัว</.test(r2) && r2.indexOf("±" + D.FLAT_BAND_PCT + "%") >= 0 && D.FLAT_BAND_PCT === 2, textOf(r2));
    t("priceBasisChanged note on the review card", /ราคาย้อนหลังถูกปรับ \(เช่น แตกพาร์\)/.test(r2));
    t("summary tile counts both", tileValue("รอทบทวน") === "2");
    var saved = D.FLAT_BAND_PCT;
    D.FLAT_BAND_PCT = 4.5;
    P.render();
    var m = reviewCard("e_fix2");
    t("mutated FLAT_BAND_PCT flows into the review copy", m.indexOf("±4.5%") >= 0 && m.indexOf("±2%") < 0);
    D.FLAT_BAND_PCT = saved;
    P.render();
    t("constant restored", reviewCard("e_fix2").indexOf("±2%") >= 0);
    t("no NaN/undefined in the stubbed cards", !LEAK.test(html()), (LEAK.exec(html()) || [])[0]);
  }, function (e) { D.outcomes = realOutcomes; throw e; });
});

section("review: price fetch failure and loading are honest (Task 11)", function () {
  JOURNAL = freshJournal();
  routeOhlc({
    NVDA: function () { return new Promise(function (r) { setTimeout(r, 80); }).then(function () { return resp(500, { error: "upstream down" }); }); }
  });
  var loading = freshLogPage();
  return new Promise(function (r) { setTimeout(r, 30); }).then(function () {
    t("while prices load, the รอทบทวน tile says so", /รอทบทวน<\/div><div class="dj-tile-s">กำลังดึงราคา/.test(sec("djSummary")), sec("djSummary"));
    return loading;
  }).then(function () {
    restoreFetch();
    var rv = sec("djReview");
    t("NVDA prices failed → no fake due card, but the section warns which symbol and offers a retry",
      reviewCount() === 0 && !reviewHidden() && /ดึงราคาไม่สำเร็จ/.test(rv) && /NVDA/.test(rv) && /data-dj-outcomes-retry="1"/.test(rv), textOf(rv));
    clickAttr("data-dj-outcomes-retry", "1");
    return flush();
  }, function (e) { restoreFetch(); throw e; }).then(function () {
    t("retry after recovery → e_fix1 due, warning gone", reviewIds().join() === "e_fix1" && !/ดึงราคาไม่สำเร็จ/.test(sec("djReview")));
  });
});

section("review: CSS (Task 11)", function () {
  var css = readPub("decision-journal.css").replace(/\/\*[\s\S]*?\*\//g, "");
  t("CSS: review card, price line, verdict buttons styled",
    /\.dj-rv\b/.test(css) && /\.dj-rv-price\s*\{/.test(css) && /\.dj-rv-verdicts\s*\{/.test(css) && /\.dj-rv-v\.is-on/.test(css));
  t("CSS: price numbers tabular-nums", /\.dj-rv-price\s*\{[^}]*tabular-nums/.test(css));
  t("CSS: summary callout to the review queue", /\.dj-due\s*\{/.test(css));
  var i = css.indexOf("@media (max-width: 600px)");
  var blk = i < 0 ? "" : css.slice(i);
  t("CSS: on mobile the three verdict buttons share one row, each ≥ 44px tall",
    /\.dj-rv-verdicts\s*\{[^}]*grid-template-columns:\s*repeat\(3/.test(blk) && /\.dj-rv-v\s*\{[^}]*min-height:\s*44px/.test(blk));
  t("CSS: no colored border-left on the review card", !/\.dj-rv[^{]*\{[^}]*border-left:\s*[2-9]/.test(css));
  return null;
});

// ============================================================
// Task 12 — ไม้จริง (FIFO) · Privacy Lock
// ============================================================
// HTML ของแถวตารางเดียว (<tr> ไม่ซ้อนกัน) — แถวไม้เปิดอยู่ / แถวไม้ทั้งหมด
function rowOf(marker) {
  var h = html();
  var i = h.indexOf(marker);
  if (i < 0) return "";
  var s = h.lastIndexOf("<tr", i);
  var e = h.indexOf("</tr>", i);
  return h.slice(s, e < 0 ? h.length : e + 5);
}
function openRow(sym) { return rowOf('data-dj-open-row="' + sym + '"'); }
function tradeRow(id) { return rowOf('data-dj-trade="' + id + '"'); }
// ช่องจำนวนในแถว (คลาส dj-qty) — \b10\b ของแผนจับวันที่ 2026-10-23 ได้ด้วย จึงเช็กช่องนี้ตรง ๆ เพิ่ม
function qtyCell(row) { var m = /class="dj-num dj-qty">([^<]*)</.exec(row); return m ? m[1] : null; }
function tradeIn(body, id) { return (body ? body.trades : []).filter(function (x) { return x && x.id === id; })[0] || null; }
function fillTrade(o) {
  setVal("djTDate", o.date || ""); setVal("djTSymbol", o.symbol || ""); setVal("djTSide", o.side || "");
  setVal("djTQty", o.qty || ""); setVal("djTPrice", o.price || ""); setVal("djTFee", o.fee || "");
  setVal("djTCurrency", o.currency || ""); setVal("djTNote", o.note || ""); setVal("djTEntry", o.entryId || "");
}
function tradeMsg() { var m = /<div id="djTFormMsgBox">([\s\S]*?)<\/div><div class="dj-actions/.exec(sec("djTrades")); return m ? textOf(m[1]) : ""; }
function freshTradesPage() {
  var S = P._state;
  S.tradeEditId = null;
  S.tradeConfirmDelId = null;
  S.tradeMsg = null;
  S.lastTrade = null;
  fillTrade({});
  privacyLocked = false;
  return freshLogPage();
}

section("trades: open positions · add · privacy · delete (Task 12)", function () {
  var S = P._state;
  var D = win.DecisionJournal;
  t("page API: _addTrade / _updateTrade / _deleteTrade / _lastCloses / _money",
    typeof P._addTrade === "function" && typeof P._updateTrade === "function" && typeof P._deleteTrade === "function" &&
    typeof P._lastCloses === "function" && typeof P._money === "function");
  JOURNAL = freshJournal();
  return freshTradesPage().then(function () {
    // fixture: t_fix1 ซื้อ NVDA 10 @100 (2026-01-05) · t_fix2 ขาย 4 @130 (2026-03-01) · NVDA ปิดล่าสุด 108 (2026-10-23 = RISE8 ตัวสุดท้าย)
    var lc = P._lastCloses();
    t("_lastCloses: NVDA = last bar 108 on 2026-10-23, closed (US cutoff at 2026-10-25T12:00 = 2026-10-24)",
      !!lc.NVDA && lc.NVDA.close === 108 && lc.NVDA.date === "2026-10-23" && lc.NVDA.closed === true, lc.NVDA);
    t("open position NVDA 6 @100 with floating vs last close", /data-dj-open-row="NVDA"/.test(html()) && /\b6\b/.test(openRow("NVDA")));
    var o = openRow("NVDA"), ot = textOf(o);
    t("open row: qty cell is exactly 6 (10 − 4)", qtyCell(o) === "6", qtyCell(o));
    // ต้นทุน 6 × 100 = 600 · ลอยตัว 108 × 6 − 600 = +48 · 48 × 100 / 600 = +8.0%
    t("open row: avg $100.00 · last $108.00 (2026-10-23) · cost $600.00 · floating +$48.00 (+8.0%) coloured up",
      /\$100\.00/.test(ot) && /\$108\.00/.test(ot) && /2026-10-23/.test(ot) && /\$600\.00/.test(ot) &&
      /\+\$48\.00/.test(ot) && /\+8\.0%/.test(ot) && /class="dj-num dj-up"/.test(o), ot);
    t("realized pnl for the sell = +120", /\+\$120/.test(tradeRow("t_fix2")));
    // (130 − 100) × 4 = 120 · ค่าธรรมเนียม 0 · 120 × 100 / (100 × 4) = +30.0%
    t("sell row: +$120.00 (+30.0%) coloured up · buy row has no realized amount",
      /\+\$120\.00/.test(textOf(tradeRow("t_fix2"))) && /\+30\.0%/.test(textOf(tradeRow("t_fix2"))) && /dj-up/.test(tradeRow("t_fix2")) &&
      !/\+\$/.test(textOf(tradeRow("t_fix1"))), textOf(tradeRow("t_fix2")));
    t("trade rows show side, unit price (market price) and date",
      /ซื้อ/.test(tradeRow("t_fix1")) && /\$100\.00/.test(tradeRow("t_fix1")) && /2026-01-05/.test(tradeRow("t_fix1")) &&
      /ขาย/.test(tradeRow("t_fix2")) && /\$130\.00/.test(tradeRow("t_fix2")));
    t("trades newest first", html().indexOf('data-dj-trade="t_fix2"') < html().indexOf('data-dj-trade="t_fix1"'));
    var tt = textOf(sec("djTrades"));
    t("totals per currency: USD realized +$120.00 · floating +$48.00", /USD/.test(tt) && /รับรู้[^+−]*\+\$120\.00/.test(tt) && /ลอยตัว[^+−]*\+\$48\.00/.test(tt), tt);
    t("clean fixture → no warning box", !/class="dj-warn"/.test(sec("djTrades")));
    t("wide tables live in .dj-table-wrap", (sec("djTrades").match(/<div class="dj-table-wrap">/g) || []).length === 2);
    t("add form: every pinned id + one primary add button",
      ["djTDate", "djTSymbol", "djTSide", "djTQty", "djTPrice", "djTFee", "djTCurrency", "djTNote", "djTEntry"].every(function (id) {
        return new RegExp('id="' + id + '"').test(sec("djTrades"));
      }) && /<button[^>]*data-dj-trade-add="1"/.test(sec("djTrades")) && (sec("djTrades").match(/dj-btn-primary/g) || []).length === 1);
    t("symbol field shares the holdings datalist", /id="djTSymbol"[^>]*list="djSymbols"/.test(html()));
    t("entry select offers live entries", /<select id="djTEntry"[\s\S]*?value="e_fix1"[\s\S]*?<\/select>/.test(html()));

    var n0 = putCalls().length;
    setVal("djTDate", "2026-10-01"); setVal("djTSymbol", "btc"); setVal("djTSide", "buy"); setVal("djTQty", "0.0123"); setVal("djTPrice", "80000"); setVal("djTFee", "2"); clickAttr("data-dj-trade-add", "1");
    return flush().then(function () { return n0; });
  }).then(function (n0) {
    var tr = lastPut().trades.filter(function (x) { return x.symbol === "BTCUSD"; })[0];
    t("trade saved canonical symbol, decimals kept, USD", tr && tr.qty === 0.0123 && tr.currency === "USD" && tr.fee === 2);
    t("new trade: §5.1 shape (id t_, ISO stamps, side, price, date, no entry link) and passes the server rules",
      !!tr && /^t_/.test(tr.id) && isIso(tr.createdAt) && tr.createdAt === tr.updatedAt && tr.deletedAt === null &&
      tr.side === "buy" && tr.price === 80000 && tr.date === "2026-10-01" && tr.note === "" && tr.entryId === null && D.itemProblems(tr).length === 0, tr);
    var all = putCalls();
    var iPut = fetchCalls.lastIndexOf(all[all.length - 1]);
    t("one PUT to ?doc=journal right after a fresh GET, fixture kept", all.length === n0 + 1 && /\?doc=journal/.test(all[all.length - 1].url) &&
      fetchCalls[iPut - 1].method === "GET" && lastPut().trades.length === 3 && lastPut().entries.length === 2);
    t("form reset after add (date back to today)", getVal("djTQty") === "" && getVal("djTSymbol") === "" && getVal("djTPrice") === "" &&
      getVal("djTFee") === "" && getVal("djTDate") === "2026-10-25");
    t("status next to the add button: saved on server", /บันทึกบนเซิร์ฟเวอร์แล้ว/.test(sec("djTrades")) && /เพิ่มไม้ BTCUSD · 2026-10-01/.test(textOf(sec("djTrades"))));
    t("BTC price fetched once for the new open position", ohlcCalls("BTC-USD").length === 1, ohlcCalls("BTC-USD").map(function (c) { return c.url; }));
    // ราคาปิดล่าสุด BTC-USD = 60800 (2026-10-23) · 60800 × 0.0123 = 747.84 · ต้นทุน 80000 × 0.0123 = 984 · 747.84 − 984 = −236.16
    t("BTCUSD open row: qty 0.0123 (not rounded) · floating −$236.16 coloured down",
      qtyCell(openRow("BTCUSD")) === "0.0123" && /−\$236\.16/.test(openRow("BTCUSD")) && /class="dj-num dj-down"/.test(openRow("BTCUSD")), textOf(openRow("BTCUSD")));
    t("BTC unit price shown as a market price", /\$80,000\.00/.test(tradeRow(tr.id)));

    privacyLocked = true; fireDoc("portfolio-privacy-changed");
    t("locked: personal amounts XXX, market price still visible", /XXX/.test(openRow("NVDA")) && !/\$120/.test(tradeRow("t_fix2")) && /100\.00|\$100/.test(html()));
    t("no money in title attributes", !/title="[^"]*[฿$]\s?[\d,]/.test(html()));
    var st = sec("djTrades");
    t("locked: qty cells XXX (NVDA and BTCUSD), 0.0123 nowhere on the page",
      qtyCell(openRow("NVDA")) === "XXX" && qtyCell(openRow("BTCUSD")) === "XXX" && qtyCell(tradeRow("t_fix1")) === "XXX" && html().indexOf("0.0123") < 0);
    t("locked: cost, floating, realized, fee and totals hidden (no $ amount left except unit prices)",
      !/\$600\.00|\+\$48\.00|\+8\.0%|\+30\.0%|−\$236\.16|\$2\.00/.test(st) && !/รับรู้[^X]*\$/.test(textOf(st)), textOf(st));
    t("locked: no up/down colour leaks the sign", !/dj-up|dj-down/.test(st));
    t("locked: unit prices stay ($100.00 · $130.00 · $80,000.00 · last $108.00)",
      /\$100\.00/.test(st) && /\$130\.00/.test(st) && /\$80,000\.00/.test(st) && /\$108\.00/.test(st));
    t("locked: no edit buttons (an edit would prefill personal amounts)", !/data-dj-trade-edit="/.test(st));
    t("no money in title/aria-label", !/(title|aria-label)="[^"]*[฿$]\s?[\d,]/.test(html()));
    privacyLocked = false; fireDoc("portfolio-privacy-changed");
    t("unlocked again shows amounts", /\+\$120/.test(tradeRow("t_fix2")));
    t("no NaN/undefined, advisory words", !LEAK.test(html()) && !ADVISORY_TH.test(html()) && !ADVISORY_EN.test(html()), (LEAK.exec(html()) || [])[0]);

    var n1 = putCalls().length;
    clickAttr("data-dj-trade-del", "t_fix2");
    t("delete asks first (confirm + cancel), nothing sent yet",
      /data-dj-trade-del-confirm="t_fix2"/.test(html()) && /data-dj-trade-del-cancel="t_fix2"/.test(html()) && putCalls().length === n1);
    clickAttr("data-dj-trade-del-cancel", "t_fix2");
    t("cancel hides the confirm", !/data-dj-trade-del-confirm=/.test(html()) && putCalls().length === n1);
    clickAttr("data-dj-trade-del", "t_fix2"); clickAttr("data-dj-trade-del-confirm", "t_fix2"); return flush();
  }).then(function () {
    t("deleted trade tombstoned and open qty back to 10", lastPut().trades.filter(function (x) { return x.id === "t_fix2"; })[0].deletedAt && /\b10\b/.test(openRow("NVDA")));
    var tomb = tradeIn(lastPut(), "t_fix2");
    t("…qty cell exactly 10 and the row is gone", qtyCell(openRow("NVDA")) === "10" && tradeRow("t_fix2") === "");
    t("…tombstone keeps only the keys merge/server need", Object.keys(tomb).sort().join() === "createdAt,date,deletedAt,id,symbol,updatedAt" && D.itemProblems(tomb).length === 0, Object.keys(tomb));
    // ไม่มีไม้ขายแล้ว: NVDA ลอยตัว 108 × 10 − 1000 = +80 · BTCUSD ยังเปิดอยู่ −236.16 → รวม USD 80 − 236.16 = −156.16
    t("…NVDA floating +$80.00 and the USD floating total −$156.16",
      /\+\$80\.00/.test(openRow("NVDA")) && /ลอยตัว[^+−]*−\$156\.16/.test(textOf(sec("djTrades"))), textOf(sec("djTrades")));
  });
});

section("trades: refusals before PUT and failures (Task 12)", function () {
  var S = P._state;
  var D = win.DecisionJournal;
  JOURNAL = freshJournal();
  return freshTradesPage().then(function () {
    var n0 = putCalls().length;
    function tryForm(o) { fillTrade(o); clickAttr("data-dj-trade-add", "1"); return tradeMsg(); }
    var m1 = tryForm({ date: "2026-10-01", symbol: "ปตท", side: "buy", qty: "100", price: "32" });
    t("Thai symbol → refused with the English-symbol hint", /สัญลักษณ์ต้องเป็นตัวอักษรภาษาอังกฤษ เช่น PTT\.BK/.test(m1), m1);
    var m2 = tryForm({ date: "2026-10-01", symbol: "NVDA", side: "buy", qty: "0", price: "-5", fee: "-1" });
    t("qty 0 · negative price · negative fee → all three reasons", /จำนวนต้องมากกว่า 0/.test(m2) && /ราคาต่อหน่วยต้องมากกว่า 0/.test(m2) && /ค่าธรรมเนียม/.test(m2), m2);
    var m3 = tryForm({ date: "2026-10-26", symbol: "NVDA", side: "buy", qty: "1", price: "100" });
    t("future date (today is 2026-10-25) → refused", /วันที่อยู่ในอนาคต/.test(m3), m3);
    var m4 = tryForm({ date: "2026-02-30", symbol: "NVDA", side: "buy", qty: "1", price: "100" });
    t("impossible date 2026-02-30 → refused", /วันที่ไม่ถูกต้อง/.test(m4), m4);
    var m5 = tryForm({ date: "2026-10-01", symbol: "NVDA", qty: "1", price: "100" });
    t("no side → refused", /เลือกว่าซื้อหรือขาย/.test(m5), m5);
    var m6 = tryForm({ date: "2026-10-01", symbol: "NVDA", side: "buy", qty: "1", price: "3500", currency: "THB" });
    t("NVDA already in USD, new trade in THB → refused (fifo would skip it)", /USD/.test(m6) && /สกุลเดียวกัน/.test(m6), m6);
    var m7 = tryForm({ date: "2026-10-01", symbol: "NVDA", side: "buy", qty: "1", price: "100", entryId: "e_fix2" });
    t("linking an entry of another symbol → refused", /PTT\.BK/.test(m7) && /ไม่ใช่ NVDA/.test(m7), m7);
    t("refusals sent nothing and kept the typed values", putCalls().length === n0 && getVal("djTQty") === "1" && getVal("djTSymbol") === "NVDA");
    t("refusal message is an alert", /<div[^>]*class="dj-form-msg"[^>]*role="alert"/.test(sec("djTrades")));
    return P._addTrade({ date: "2026-10-21", symbol: "ptt.bk", side: "buy", qty: 100, price: 32.25, entryId: "e_fix2" });
  }).then(function (ok) {
    var tr = lastPut().trades.filter(function (x) { return x.symbol === "PTT.BK"; })[0];
    var e2 = entryIn(lastPut(), "e_fix2"), was = JOURNAL.entries[1];
    t("_addTrade with entryId → true, THB from .BK, linked both ways", ok === true && !!tr && tr.currency === "THB" && tr.entryId === "e_fix2" &&
      !!e2 && e2.action.tradeIds.join() === tr.id, e2 && e2.action);
    t("…entry touched (updatedAt bumped) but its frozen fields are identical",
      e2.updatedAt > was.updatedAt && ["context", "view", "rules", "verdict", "date", "symbol"].every(function (k) { return JSON.stringify(e2[k]) === JSON.stringify(was[k]); }) &&
      e2.action.kind === was.action.kind && e2.action.conviction === was.action.conviction);
    t("…trade row shows the linked entry", /2026-10-20/.test(textOf(tradeRow(tr.id))) && /ซื้อ/.test(textOf(tradeRow(tr.id))));
    // THB: ต้นทุน 100 × 32.25 = ฿3,225 (ไม่มีทศนิยม) · ราคาต่อหน่วย ฿32.25
    t("THB money as ฿3,225 and unit price ฿32.25, never 'บาท' after a number",
      /฿3,225(?![\d.])/.test(textOf(openRow("PTT.BK"))) && /฿32\.25/.test(openRow("PTT.BK")) && !/\d บาท/.test(html()), textOf(openRow("PTT.BK")));
    failPut = 500;
    return P._addTrade({ date: "2026-10-22", symbol: "NVDA", side: "sell", qty: 1, price: 120 });
  }).then(function (ok) {
    failPut = null;
    var d = draftObj();
    t("PUT 500 → false, trade kept in the local draft", ok === false && !!d && d.trades.some(function (x) { return x.symbol === "NVDA" && x.date === "2026-10-22"; }));
    t("…honest status: draft, never 'saved'", S.syncState === "draft" && !/บันทึกบนเซิร์ฟเวอร์แล้ว/.test(html()) && /ยังไม่ถึงเซิร์ฟเวอร์/.test(sec("djTrades")));
    return P.load(true);
  }, function (e) { failPut = null; throw e; }).then(function () {
    t("next load re-sends the trade and clears the draft",
      lastPut().trades.some(function (x) { return x.symbol === "NVDA" && x.date === "2026-10-22"; }) && !store.decision_journal_draft_v1);
    return P._deleteTrade("t_nope");
  }).then(function (ok) {
    t("_deleteTrade(unknown) → false with a reason", ok === false && /ไม่พบไม้นี้/.test(tradeMsg()));
    return P._updateTrade("t_fix1", { qty: "-3" });
  }).then(function (ok) {
    t("_updateTrade with an invalid patch → false, nothing sent", ok === false && /จำนวนต้องมากกว่า 0/.test(tradeMsg()));
  });
});

section("trades: edit (Task 12)", function () {
  var S = P._state;
  JOURNAL = freshJournal();
  return freshTradesPage().then(function () {
    clickAttr("data-dj-trade-edit", "t_fix2");
    t("edit prefills the form from the trade", getVal("djTQty") === "4" && getVal("djTPrice") === "130" && getVal("djTSide") === "sell" &&
      getVal("djTSymbol") === "NVDA" && getVal("djTDate") === "2026-03-01" && getVal("djTCurrency") === "USD", [getVal("djTQty"), getVal("djTPrice")]);
    t("edit mode: update + cancel buttons, no add button, row highlighted",
      /data-dj-trade-update="t_fix2"/.test(html()) && /data-dj-trade-edit-cancel="1"/.test(html()) && !/data-dj-trade-add="/.test(html()) &&
      /class="dj-trow is-editing"[^>]*data-dj-trade="t_fix2"/.test(html()));
    setVal("djTQty", "5");
    clickAttr("data-dj-trade-update", "t_fix2");
    return flush();
  }).then(function () {
    var tr = tradeIn(lastPut(), "t_fix2"), was = JOURNAL.trades[1];
    t("update PUTs the same id: qty 5, createdAt kept, updatedAt bumped", tr.qty === 5 && tr.createdAt === was.createdAt && tr.updatedAt > was.updatedAt && tr.price === 130);
    // ขาย 5: (130 − 100) × 5 = +150 · เหลือ 10 − 5 = 5
    t("table follows: realized +$150.00, open qty 5", /\+\$150\.00/.test(tradeRow("t_fix2")) && qtyCell(openRow("NVDA")) === "5");
    t("form back to add mode and empty", /data-dj-trade-add="1"/.test(html()) && !/data-dj-trade-update=/.test(html()) && getVal("djTQty") === "");
    clickAttr("data-dj-trade-edit", "t_fix1");
    clickAttr("data-dj-trade-edit-cancel", "1");
    t("cancel edit → add mode, fields cleared", /data-dj-trade-add="1"/.test(html()) && getVal("djTQty") === "" && getVal("djTPrice") === "");
    clickAttr("data-dj-trade-edit", "t_fix1");
    privacyLocked = true; fireDoc("portfolio-privacy-changed");
    t("locking while editing cancels the edit (prefilled amounts cleared)", S.tradeEditId === null && getVal("djTQty") === "" && !/data-dj-trade-update=/.test(html()));
    privacyLocked = false; fireDoc("portfolio-privacy-changed");
    return P._updateTrade("t_fix1", { entryId: "e_fix1" });
  }).then(function (ok) {
    var e1 = entryIn(lastPut(), "e_fix1");
    t("_updateTrade links an entry later (entry.action.tradeIds gets the id)", ok === true && tradeIn(lastPut(), "t_fix1").entryId === "e_fix1" &&
      e1.action.tradeIds.indexOf("t_fix1") >= 0);
    return P._updateTrade("t_fix1", { entryId: "" });
  }).then(function (ok) {
    var e1 = entryIn(lastPut(), "e_fix1");
    t("…and unlinks it (id removed from the entry)", ok === true && tradeIn(lastPut(), "t_fix1").entryId === null && e1.action.tradeIds.indexOf("t_fix1") < 0);
  });
});

section("trades: warnings · missing price · unclosed bar · _money (Task 12)", function () {
  var S = P._state;
  JOURNAL = freshJournal();
  JOURNAL.trades = [
    mkTrade({ id: "t_fix1", createdAt: "2026-01-05T03:00:00.000Z", date: "2026-01-05", symbol: "NVDA", side: "buy", qty: 10, price: 100, currency: "USD" }),
    mkTrade({ id: "t_over", createdAt: "2026-04-01T03:00:00.000Z", date: "2026-04-01", symbol: "NVDA", side: "sell", qty: 20, price: 110, currency: "USD", fee: 20 }),
    mkTrade({ id: "t_thb", createdAt: "2026-05-01T03:00:00.000Z", date: "2026-05-01", symbol: "NVDA", side: "sell", qty: 1, price: 3500, currency: "THB" }),
    mkTrade({ id: "t_bad", createdAt: "2026-05-02T03:00:00.000Z", date: "2026-05-02", symbol: "NVDA", side: "buy", qty: "abc", price: 100, currency: "USD" }),
    mkTrade({ id: "t_amd", createdAt: "2026-06-01T03:00:00.000Z", date: "2026-06-01", symbol: "AMD", side: "buy", qty: 2, price: 150, currency: "USD" })
  ];
  return freshTradesPage().then(function () {
    var st = sec("djTrades"), tt = textOf(st);
    t("fifo warnings rendered in .dj-warn: oversell · currency · invalid trade",
      /class="dj-warn"[^>]*>[^<]*ขายมากกว่าที่บันทึกซื้อไว้/.test(st) && /class="dj-warn"[^>]*>[^<]*สกุลเงินไม่ตรงกับไม้ก่อนหน้า/.test(st) &&
      /class="dj-warn"[^>]*>[^<]*ข้อมูลไม้ไม่ครบหรือไม่ถูกต้อง/.test(st), tt);
    // ขาย 20 ถือ 10: จับได้ 10 · (110 − 100) × 10 = 100 · ค่าธรรมเนียมขายตามสัดส่วน 20 × 10 / 20 = 10 · 100 − 10 = +90
    t("oversell row: +$90.00 with ขายเกิน", /\+\$90\.00/.test(tradeRow("t_over")) && /ขายเกิน/.test(tradeRow("t_over")), textOf(tradeRow("t_over")));
    t("skipped sell (other currency) says ไม่นำมาคิด", /ไม่นำมาคิด/.test(tradeRow("t_thb")) && !/\+฿|−฿/.test(tradeRow("t_thb")));
    t("NVDA fully sold → no NVDA open row; AMD open", openRow("NVDA") === "" && qtyCell(openRow("AMD")) === "2");
    t("AMD has no price → last price ไม่มีราคา, floating —", /ไม่มีราคา/.test(openRow("AMD")) && !/[+−]\$/.test(openRow("AMD")), textOf(openRow("AMD")));
    t("AMD price was requested once (open trade without an entry)", ohlcCalls("AMD").length === 1);
    t("USD floating total unknown (a price is missing), realized +$90.00", /ลอยตัว[^$]*ยังไม่รู้/.test(tt) && /รับรู้[^+−]*\+\$90\.00/.test(tt), tt);
    t("no NaN/undefined from the bad trade", !LEAK.test(html()), (LEAK.exec(html()) || [])[0]);

    JOURNAL = freshJournal();
    return freshTradesPage();
  }).then(function () {
    // 2026-10-24 04:00 กรุงเทพ: US ปิดถึง 2026-10-22 → แท่ง 2026-10-23 ยังไม่ปิด แต่ใช้ได้พร้อมป้าย (สเปก §5.5)
    S.nowOverride = "2026-10-24T04:00";
    var lc = P._lastCloses();
    P.render();
    var o = openRow("NVDA");
    S.nowOverride = null;
    t("_lastCloses: unclosed last bar → closed false (still the 108 close)", lc.NVDA && lc.NVDA.close === 108 && lc.NVDA.closed === false, lc.NVDA);
    t("open row labels the unclosed bar and still shows floating", /แท่งยังไม่ปิด/.test(o) && /\+\$48\.00/.test(o), textOf(o));
    P.render();
    t("closed again at the fixture time → no label", !/แท่งยังไม่ปิด/.test(openRow("NVDA")));

    t("_money THB = ฿1,234 · USD = $1,234.56 · negative uses −", P._money(1234.4, "THB", false) === "฿1,234" &&
      P._money(1234.56, "USD", false) === "$1,234.56" && P._money(-236.16, "USD", false) === "−$236.16", [P._money(1234.4, "THB", false), P._money(-236.16, "USD", false)]);
    privacyLocked = true; P.render();
    t("_money while locked: personal → XXX, market price → shown", P._money(5, "USD", true) === "XXX" && P._money(5, "USD", false) === "$5.00");
    privacyLocked = false; P.render();
    t("_money unlocked: personal shown", P._money(5, "USD", true) === "$5.00");
  });
});

section("trades: typing is never interrupted · CSS (Task 12)", function () {
  JOURNAL = freshJournal();
  return freshTradesPage().then(function () {
    var MARK = "<!--trade-typing-->";
    fillTrade({ date: "2026-10-02", symbol: "NVDA", side: "buy", qty: "7" });
    doc.activeElement = doc.getElementById("djTQty");
    els.djRoot.innerHTML = html() + MARK;
    doc.getElementById("djTradesTop").innerHTML = "";
    P.render();
    var kept = html().indexOf(MARK) >= 0, top = els.djTradesTop.innerHTML;
    doc.activeElement = null;
    t("render while typing in the trade form: #djRoot not rebuilt, typed qty kept", kept && getVal("djTQty") === "7");
    t("…open positions updated in place", /data-dj-open-row="NVDA"/.test(top));
    P.render();
    t("after leaving the field a full render keeps the typed values", /id="djTQty"[^>]*value="7"/.test(html()));
    fillTrade({});
    P.render();

    var css = readPub("decision-journal.css").replace(/\/\*[\s\S]*?\*\//g, "");
    t("CSS: trade form grid, totals, editing row styled", /\.dj-tform-grid\s*\{/.test(css) && /\.dj-ttotals\s*\{/.test(css) && /\.dj-trow\.is-editing/.test(css));
    var i = css.indexOf("@media (max-width: 600px)");
    var blk = i < 0 ? "" : css.slice(i);
    t("CSS: mobile trade form single column + sticky first table column",
      /\.dj-tform-grid\s*\{[^}]*grid-template-columns:\s*1fr/.test(blk) && /\.dj-table td:first-child[^{]*\{[^}]*position:\s*sticky/.test(blk));
    t("CSS: table numbers tabular-nums and right-aligned", /\.dj-table \.dj-num\s*\{[^}]*text-align:\s*right[^}]*tabular-nums/.test(css));
  });
});

// ============================================================
// Task 13 — แถบภาพรวม · สถิติ · วิธีคิด · ส่งออก/นำเข้า
// ============================================================
function reEsc(s) { return String(s).replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&"); }
// ตัวเลขของกล่องสรุป (ยอมให้ตัวเลขมีคลาสสี เช่น dj-tile-n dj-up)
function tileNum(label) {
  var m = new RegExp('<div class="dj-tile-n[^"]*">([^<]*)</div><div class="dj-tile-l">' + reEsc(label) + "</div>").exec(sec("djSummary"));
  return m ? m[1] : null;
}
function tileBox(label) {
  var h = sec("djSummary");
  var i = h.indexOf('<div class="dj-tile-l">' + label + "</div>");
  if (i < 0) return "";
  var s = h.lastIndexOf('<div class="dj-tile', h.lastIndexOf('<div class="dj-tile-n', i) - 1);
  return h.slice(s, h.indexOf("</div></div>", i) + 12);
}
function tileSub(label) {
  var m = new RegExp('<div class="dj-tile-l">' + reEsc(label) + '</div><div class="dj-tile-s">([^<]*)</div>').exec(sec("djSummary"));
  return m ? m[1] : null;
}
function statRow(key) { return rowOf('data-dj-stat="' + key + '"'); }
function cellOf(row, col) {
  var i = row.indexOf('data-col="' + col + '"');
  if (i < 0) return null;
  var s = row.lastIndexOf("<td", i);
  return textOf(row.slice(s, row.indexOf("</td>", i) + 5)).trim();
}
function cellHtml(row, col) {
  var i = row.indexOf('data-col="' + col + '"');
  if (i < 0) return "";
  var s = row.lastIndexOf("<td", i);
  return row.slice(s, row.indexOf("</td>", i) + 5);
}
// กล่องข้อความของส่วนสำรองข้อมูล (มีแต่ <p>/<span> ข้างใน จึงจบที่ </div> ตัวแรก)
function ioText() {
  var h = html(), i = h.indexOf('id="djIoBox"');
  if (i < 0) return "";
  return textOf(h.slice(i, h.indexOf("</div>", i)));
}

section("summary · stats · method · export/import — plan checks (Task 13)", function () {
  var D = win.DecisionJournal;
  t("page API: _exportPayload / _importPayload", typeof P._exportPayload === "function" && typeof P._importPayload === "function");
  JOURNAL = freshJournal();
  return freshTradesPage().then(function () {
    t("summary tiles", /รอทบทวน/.test(sec("djSummary")) && /ตามกฎ/.test(sec("djSummary")) && /คาดถูก/.test(sec("djSummary")) && /ไม้เปิดอยู่/.test(sec("djSummary")));
    t("stats shows ยังน้อยเกินสรุป when n < 3", /ยังน้อยเกินสรุป/.test(sec("djStats")));
    // แผนเขียน /2%/ ตอนแถบแตะยังเป็น 2 — ผู้ใช้ยืนยัน 2026-10-26: แตะ ±3 · ทรงตัว ±2 → เช็กทั้งสองแถบ และเลขต้องตรงกับค่าคงที่ของเอนจิน
    var m = sec("djMethod");
    t("method shows constants, not hardcoded copies",
      /≥ 2 วัน/.test(m) && /2%/.test(m) && /20%/.test(m) && /แตกพาร์/.test(m) &&
      m.indexOf("≥ " + D.CONFIRM_BARS + " วัน") >= 0 && m.indexOf("±" + D.TOUCH_BAND_PCT + "%") >= 0 &&
      m.indexOf("±" + D.FLAT_BAND_PCT + "%") >= 0 && m.indexOf(Math.abs(D.DIP_PCT) + "%") >= 0 &&
      D.TOUCH_BAND_PCT === 3 && D.FLAT_BAND_PCT === 2 && D.DIP_PCT === -20 && D.CONFIRM_BARS === 2);
    var payload = P._exportPayload();
    t("export payload has doc with entries and trades", payload.v === 1 && payload.doc && payload.doc.entries.length >= 1 && E.isYmd(payload.exportedAt.slice(0, 10)));
    return P._importPayload({ v: 1, doc: { v: 1, entries: [{ id: "e_imp", date: "2026-10-01", symbol: "AMD", createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z", context: { feelings: [] }, view: { direction: "up", horizonDays: 7 }, action: { kind: "none" }, rules: {}, verdict: { compliance: "n/a" }, review: {} }], trades: [] } });
  }).then(function (ok) {
    t("import merges by id and PUTs", ok && lastPut().entries.some(function (x) { return x.id === "e_imp"; }));
    t("…fixture kept next to the imported entry", lastPut().entries.length === 3 && lastPut().trades.length === 2);
    t("…imported entry with sparse fields renders without leaks", logIds().indexOf("e_imp") >= 0 && !LEAK.test(html()), (LEAK.exec(html()) || [])[0]);
    var n = putCalls().length;
    return P._importPayload({ nope: 1 }).then(function (ok2) { return [ok2, n]; });
  }).then(function (r) {
    t("bad import rejected without PUT", r[0] === false && putCalls().length === r[1]);
    t("…and says why", /ไม่ใช่ไฟล์สำรองของ Decision Journal/.test(ioText()), ioText());
  });
});

section("summary strip: ตามกฎ · คาดถูก · ไม้เปิดอยู่ · รับรู้ · privacy · doc size (Task 13)", function () {
  var D = win.DecisionJournal;
  var S = P._state;
  JOURNAL = freshJournal();
  return freshTradesPage().then(function () {
    // ตามกฎ: e_fix1 against · e_fix2 per-rule → ตามกฎ 1 จากที่ตัดสินได้ 2
    t("ตามกฎ x / y = per-rule / (per-rule + against) = 1 / 2", tileNum("ตามกฎ") === "1 / 2", tileNum("ตามกฎ"));
    // คาดถูก: e_fix1 +7 = (103 − 100) × 100 / 100 = +3.0 > FLAT 2 และคาดลง → คาดผิด · e_fix2 ยัง pending → ถูก 0 จากที่ตัดสินได้ 1
    t("คาดถูก a / b = right / judged = 0 / 1", tileNum("คาดถูก") === "0 / 1", tileNum("คาดถูก"));
    t("คาดถูก sub explains the flat band from the constant", (tileSub("คาดถูก") || "").indexOf("±" + D.FLAT_BAND_PCT + "%") >= 0, tileSub("คาดถูก"));
    // ไม้เปิดอยู่: NVDA ซื้อ 10 ขาย 4 → เหลือ 6 → 1 สัญลักษณ์
    t("ไม้เปิดอยู่ = 1 (NVDA 10 − 4 = 6)", tileNum("ไม้เปิดอยู่") === "1", tileNum("ไม้เปิดอยู่"));
    // รับรู้ USD: (130 − 100) × 4 − 0 = +120
    t("กำไร/ขาดทุนที่รับรู้ · USD = +$120.00 coloured up", tileNum("กำไร/ขาดทุนที่รับรู้ · USD") === "+$120.00" &&
      /class="dj-tile-n dj-up"/.test(tileBox("กำไร/ขาดทุนที่รับรู้ · USD")), tileNum("กำไร/ขาดทุนที่รับรู้ · USD"));
    t("no THB realized tile when there are no THB trades", tileNum("กำไร/ขาดทุนที่รับรู้ · THB") === null);
    t("entries / trades counters kept", tileValue("บันทึก") === "2" && tileValue("ไม้จริง") === "2");
    t("tile order: รอทบทวน → ตามกฎ → คาดถูก → ไม้เปิดอยู่ → รับรู้ → บันทึก", (function () {
      var h = sec("djSummary");
      var at = ["รอทบทวน", "ตามกฎ", "คาดถูก", "ไม้เปิดอยู่", "กำไร/ขาดทุนที่รับรู้", "บันทึก"].map(function (l) { return h.indexOf('<div class="dj-tile-l">' + l); });
      return at.every(function (p, i) { return p >= 0 && (i === 0 || p > at[i - 1]); });
    })());
    t("sync status text in the summary", /ตรงกับเซิร์ฟเวอร์/.test(sec("djSummary")));
    t("no doc-size warning on a small doc", !/พื้นที่บันทึกใช้ไปแล้ว/.test(html()));

    privacyLocked = true; fireDoc("portfolio-privacy-changed");
    t("locked: realized tile XXX, uncoloured, no $ amount anywhere in the summary",
      tileNum("กำไร/ขาดทุนที่รับรู้ · USD") === "XXX" && !/dj-up|dj-down/.test(tileBox("กำไร/ขาดทุนที่รับรู้ · USD")) && !/[$฿]\s?\d/.test(sec("djSummary")));
    t("locked: counts are not money and stay visible", tileNum("ตามกฎ") === "1 / 2" && tileNum("ไม้เปิดอยู่") === "1");
    t("no money in title/aria-label", !/(title|aria-label)="[^"]*[฿$]\s?[\d,]/.test(html()));
    privacyLocked = false; fireDoc("portfolio-privacy-changed");
    t("unlocked: realized back", tileNum("กำไร/ขาดทุนที่รับรู้ · USD") === "+$120.00");

    // ตอนกำลังดึงราคา ตัวเลขคาดถูกอาจยังไม่ครบ → บอกตรง ๆ
    S.outcomesLoading = true; P.render();
    t("while prices load the คาดถูก tile says so", /กำลังดึงราคา/.test(tileSub("คาดถูก") || ""), tileSub("คาดถูก"));
    S.outcomesLoading = false; P.render();

    // ขอบ 80%: เปลี่ยน MAX_DOC_BYTES ใน sandbox ให้ขนาดจริงอยู่เหนือ/ใต้ 80% เล็กน้อย
    //   floor(b / 0.8) − 1 ≤ 1.25b − 1 → b / MAX > 0.8 และ < 0.8 + 2/b → แสดง 80%
    //   ceil(b / 0.8) + 2 ≥ 1.25b + 2 → b / MAX < 0.8 → ไม่เตือน
    var saved = D.MAX_DOC_BYTES;
    var b = Buffer.byteLength(JSON.stringify(S.doc), "utf8");
    D.MAX_DOC_BYTES = Math.floor(b / 0.8) - 1; P.render();
    var warnAt80 = /พื้นที่บันทึกใช้ไปแล้ว 80%/.test(sec("djSummary"));
    D.MAX_DOC_BYTES = Math.ceil(b / 0.8) + 2; P.render();
    var quietBelow = !/พื้นที่บันทึกใช้ไปแล้ว/.test(sec("djSummary"));
    D.MAX_DOC_BYTES = saved; P.render();
    t("doc size ≥ 0.8 × MAX_DOC_BYTES → พื้นที่บันทึกใช้ไปแล้ว 80%", warnAt80);
    t("doc size just under 0.8 × MAX_DOC_BYTES → no warning", quietBelow);

    // ไทย 250,000 ตัว × 3 ไบต์ = 750,000 ไบต์ ≥ 0.8 × 900,000 = 720,000 → ต้องเตือน
    // (นับเป็นตัวอักษรจะได้ ~253,000 ≈ 28% แล้วเงียบ — เทสต์นี้จับการนับผิดหน่วย)
    JOURNAL = freshJournal();
    JOURNAL.entries[0].context.event = new Array(250001).join("ก");
    return freshTradesPage();
  }).then(function () {
    var b = Buffer.byteLength(JSON.stringify(S.doc), "utf8");
    var want = Math.floor(b * 100 / 900000);
    t("Thai doc counted in UTF-8 bytes → พื้นที่บันทึกใช้ไปแล้ว " + want + "%", want >= 83 && want < 100 &&
      sec("djSummary").indexOf("พื้นที่บันทึกใช้ไปแล้ว " + want + "%") >= 0, [want, textOf(sec("djSummary")).slice(0, 400)]);
    t("…warning is amber (warning, not failure)", /<div class="dj-alert is-warn"[^>]*>[\s\S]*?พื้นที่บันทึกใช้ไปแล้ว/.test(sec("djSummary")));
    JOURNAL = freshJournal();
    return freshTradesPage();
  });
});

section("stats: three tables from stats() · hand-computed · ยังน้อยเกินสรุป (Task 13)", function () {
  var D = win.DecisionJournal;
  var S = P._state;
  // สัญลักษณ์ STATX (ตลาด US) ราคาคงที่ 100 ยกเว้นวันเป้าหมาย +7 ของแต่ละบันทึก
  BARS.STATX = mkBarsEnding("2026-10-23", rep(100, 260));
  [["2026-09-08", 105], ["2026-09-09", 103], ["2026-09-10", 96], ["2026-09-11", 102],
    ["2026-09-28", 106], ["2026-09-29", 99], ["2026-09-30", 97]].forEach(function (p) { setBarClose("STATX", p[0], p[1]); });
  function sx(id, date, asOf, action, dir, comp, feelings) {
    return mkEntry({ id: id, createdAt: date + "T03:00:00.000Z", date: date, symbol: "STATX", feelings: feelings, direction: dir,
      horizonDays: 7, action: action, asOfBar: asOf, close: 100,
      verdict: { compliance: comp, supports: comp === "per-rule" ? ["r1"] : [], opposes: comp === "against" ? ["r1"] : [], rulesSay: "buy", why: "" } });
  }
  // ขาย/คาดลง (แหกกฎ · กลัว):  a +5 คาดผิด/ไม่ดี · b +3 คาดผิด/ไม่ดี · c −4 คาดถูก/ดี · d +2.0 ทรงตัว (|2| ≤ FLAT 2)
  // ซื้อ/คาดขึ้น (ตามกฎ · นิ่ง): e +6 คาดถูก/ดี · f −1 ทรงตัว · g −3 คาดผิด/ไม่ดี
  // pct = (close − 100) × 100 / 100 ตรง ๆ (ราคาตั้งต้นทุกตัว = 100 ที่แท่ง as-of)
  JOURNAL = { v: 1, updatedAt: "2026-10-01T00:00:00.000Z", trades: [], entries: [
    sx("s_a", "2026-09-01", "2026-08-31", "sell", "down", "against", ["fear", "regret"]),
    sx("s_b", "2026-09-02", "2026-09-01", "sell", "down", "against", ["fear"]),
    sx("s_c", "2026-09-03", "2026-09-02", "sell", "down", "against", ["fear"]),
    sx("s_d", "2026-09-04", "2026-09-03", "sell", "down", "against", ["fear"]),
    sx("s_e", "2026-09-21", "2026-09-18", "buy", "up", "per-rule", ["calm"]),
    sx("s_f", "2026-09-22", "2026-09-21", "buy", "up", "per-rule", ["calm"]),
    sx("s_g", "2026-09-23", "2026-09-22", "buy", "up", "per-rule", ["calm"]),
    // ไม่เข้ากลุ่มตามกฎ/แหกกฎ และไม่ได้คาดทิศ: ถือต่อ (n/a) · ซื้อแต่ข้อมูลไม่พอ (unknown) — ราคา +0 ที่ +7 → "คาดว่าไม่แน่ใจ" 2 รายการ
    sx("s_h", "2026-10-05", "2026-10-02", "hold", "unsure", "n/a", []),
    sx("s_i", "2026-10-06", "2026-10-05", "buy", "unsure", "unknown", [])
  ] };
  return freshTradesPage().then(function () {
    var o = S.outcomesById;
    t("fixture: own-horizon pct and judgements as hand-computed",
      o.s_a && o.s_a.horizons["7"].pct === 5 && o.s_a.predicted === "wrong" && o.s_a.actionResult === "bad" &&
      o.s_c.horizons["7"].pct === -4 && o.s_c.predicted === "right" && o.s_c.actionResult === "good" &&
      o.s_d.horizons["7"].pct === 2 && o.s_d.predicted === "flat" && o.s_d.actionResult === "flat" &&
      o.s_f.horizons["7"].pct === -1 && o.s_f.predicted === "flat" && o.s_g.predicted === "wrong" && o.s_e.actionResult === "good",
      o.s_a && [o.s_a.horizons["7"], o.s_d.horizons["7"]]);
    var st = sec("djStats");
    t("three tables in .dj-table-wrap", (st.match(/<div class="dj-table-wrap"><table class="dj-table/g) || []).length === 3);

    // แหกกฎ: n 4 · ผลดี 1 จาก 4 = 25% · เฉลี่ยในทิศที่ทำ (ขาย = −pct) = (−5 − 3 + 4 − 2) / 4 = −1.5 · คาดถูก 1 จาก 4 = 25%
    var ag = statRow("comp:against");
    t("แหกกฎ row: n 4 · ผลดี 25% (1 จาก 4) · เฉลี่ย −1.5% red · คาดถูก 25% (1 จาก 4)",
      cellOf(ag, "n") === "4" && /^25%\s*1 จาก 4$/.test(cellOf(ag, "good")) && cellOf(ag, "avg") === "−1.5%" && /dj-down/.test(cellHtml(ag, "avg")) &&
      /^25%\s*1 จาก 4$/.test(cellOf(ag, "right")), [cellOf(ag, "n"), cellOf(ag, "good"), cellOf(ag, "avg"), cellOf(ag, "right")]);
    // ตามกฎ: n 3 · ผลดี 1 จาก 3 = 33% · เฉลี่ย (6 − 1 − 3) / 3 = +0.67 → +0.7% · คาดถูก 1 จาก 3 (judged = ถูก e + ผิด g + ทรงตัว f) = 33%
    var pr = statRow("comp:per-rule");
    t("ตามกฎ row: n 3 · ผลดี 33% (1 จาก 3) · เฉลี่ย +0.7% green · คาดถูก 33% (1 จาก 3)",
      cellOf(pr, "n") === "3" && /^33%\s*1 จาก 3$/.test(cellOf(pr, "good")) && cellOf(pr, "avg") === "+0.7%" && /dj-up/.test(cellHtml(pr, "avg")) &&
      /^33%\s*1 จาก 3$/.test(cellOf(pr, "right")), [cellOf(pr, "n"), cellOf(pr, "good"), cellOf(pr, "avg"), cellOf(pr, "right")]);
    t("compliance labels are the verdict pills", /class="dj-pill is-good">ตามกฎ</.test(pr) && /class="dj-pill is-bad">แหกกฎ</.test(ag));
    t("insight line compares the two groups (both have enough)",
      /ตามกฎ ดี 33%/.test(textOf(st)) && /แหกกฎ ดี 25%/.test(textOf(st)), textOf(st).slice(0, 300));

    // อารมณ์: กลัว = ขายทั้ง 4 (เท่ากับแหกกฎ) · นิ่ง = ซื้อทั้ง 3 · เสียดาย = s_a ตัวเดียว → ยังน้อยเกินสรุป
    var fear = statRow("feel:fear"), calm = statRow("feel:calm"), reg = statRow("feel:regret");
    t("feeling กลัว row = แหกกฎ numbers", /กลัว/.test(fear) && cellOf(fear, "n") === "4" && /^25%/.test(cellOf(fear, "good")) && cellOf(fear, "avg") === "−1.5%" && /^25%/.test(cellOf(fear, "right")));
    t("feeling นิ่ง row = ตามกฎ numbers", /นิ่ง/.test(calm) && cellOf(calm, "n") === "3" && /^33%/.test(cellOf(calm, "good")) && cellOf(calm, "avg") === "+0.7%");
    t("feeling เสียดาย (n 1 < MIN_STAT_N) → count only + ยังน้อยเกินสรุป, no ratio/average",
      cellOf(reg, "n") === "1" && /ยังน้อยเกินสรุป/.test(cellOf(reg, "good")) && cellOf(reg, "avg") === null &&
      /ยังน้อยเกินสรุป/.test(cellOf(reg, "right")) && !/%/.test(textOf(reg)), textOf(reg));
    t("feelings never picked are not listed", statRow("feel:greed") === "" && statRow("feel:fomo") === "");

    // คาดการณ์: ถูก c, e = 2 · ผิด a, b, g = 3 · ทรงตัว d, f = 2 · ตัดสินได้ 7 → 2/7 = 28.6 → 29% · 3/7 = 42.9 → 43%
    var pRight = statRow("pred:right"), pWrong = statRow("pred:wrong"), pFlat = statRow("pred:flat"), pAll = statRow("pred:judged");
    t("prediction table: ถูก 2 (29%) · ผิด 3 (43%) · ทรงตัว 2 (29%) · ตัดสินได้ 7",
      cellOf(pRight, "n") === "2" && cellOf(pRight, "share") === "29%" && cellOf(pWrong, "n") === "3" && cellOf(pWrong, "share") === "43%" &&
      cellOf(pFlat, "n") === "2" && cellOf(pFlat, "share") === "29%" && cellOf(pAll, "n") === "7",
      [cellOf(pRight, "share"), cellOf(pWrong, "share"), cellOf(pFlat, "share"), cellOf(pAll, "n")]);
    t("ทรงตัว row explains the band from FLAT_BAND_PCT", textOf(pFlat).indexOf("±" + D.FLAT_BAND_PCT + "%") >= 0, textOf(pFlat));
    t("คาดว่าไม่แน่ใจ row: 2 (s_h, s_i) with no share — not part of the denominator",
      cellOf(statRow("pred:unjudged"), "n") === "2" && cellOf(statRow("pred:unjudged"), "share") === "—", textOf(statRow("pred:unjudged")));
    t("numbers right-aligned (dj-num) in stats tables", /<td class="dj-num[^"]*" data-col="n">/.test(ag) && /<td class="dj-num[^"]*" data-col="share">/.test(pRight));

    // แถบภาพรวมใช้ชุดเดียวกัน: ตามกฎ 3 จาก 7 (n/a และ unknown ไม่อยู่ในตัวหาร) · คาดถูก 2 จาก 7 · รอทบทวน 9 (ครบกำหนดทุกรายการ ยังไม่ทบทวน)
    t("summary agrees with the stats: ตามกฎ 3 / 7 (n/a · unknown excluded) · คาดถูก 2 / 7 · รอทบทวน 9",
      tileNum("ตามกฎ") === "3 / 7" && tileNum("คาดถูก") === "2 / 7" && tileNum("รอทบทวน") === "9" && tileValue("บันทึก") === "9",
      [tileNum("ตามกฎ"), tileNum("คาดถูก"), tileNum("รอทบทวน"), tileValue("บันทึก")]);
    t("stats copy reads MIN_STAT_N", sec("djStats").indexOf("น้อยกว่า " + D.MIN_STAT_N + " รายการ") >= 0);
    // ตัวเลขในคำอธิบายมาจากค่าคงที่ (เปลี่ยนใน sandbox แล้วจอต้องเปลี่ยนตาม)
    var saved = { FLAT_BAND_PCT: D.FLAT_BAND_PCT, MIN_STAT_N: D.MIN_STAT_N };
    D.FLAT_BAND_PCT = 4.5; D.MIN_STAT_N = 9; P.render();
    var st2 = sec("djStats"), sum2 = sec("djSummary");
    var moved = st2.indexOf("±4.5%") >= 0 && st2.indexOf("น้อยกว่า 9 รายการ") >= 0 && st2.indexOf("±2%") < 0 && sum2.indexOf("±4.5%") >= 0;
    D.FLAT_BAND_PCT = saved.FLAT_BAND_PCT; D.MIN_STAT_N = saved.MIN_STAT_N; P.render();
    t("mutated FLAT_BAND_PCT / MIN_STAT_N flow into the stats + summary copy", moved);

    // ระหว่างดึงราคา บอกว่าอาจยังไม่ครบ
    S.outcomesLoading = true; P.render();
    t("stats say prices are still loading", /กำลังดึงราคา/.test(sec("djStats")));
    S.outcomesLoading = false; P.render();
    t("no NaN/undefined/advisory in stats", !LEAK.test(sec("djStats")) && !ADVISORY_TH.test(sec("djStats")) && !ADVISORY_EN.test(sec("djStats")));

    JOURNAL = freshJournal();
    return freshTradesPage();
  }).then(function () {
    // แผน: n < 3 → ยังน้อยเกินสรุป · ไม่มีตัวเลขสัดส่วน/เฉลี่ยในกลุ่มที่น้อยเกิน
    var ag = statRow("comp:against");
    t("small groups: count only + ยังน้อยเกินสรุป", cellOf(ag, "n") === "1" && /ยังน้อยเกินสรุป/.test(cellOf(ag, "good")) && cellOf(ag, "avg") === null);
    t("no insight line when a group is too small", !/ตามกฎ ดี/.test(textOf(sec("djStats"))));
    t("prediction shares hidden when judged < MIN_STAT_N", /ยังน้อยเกินสรุป/.test(textOf(sec("djStats"))) && cellOf(statRow("pred:wrong"), "share") === "—",
      cellOf(statRow("pred:wrong"), "share"));
    JOURNAL = { v: 1, updatedAt: null, entries: [], trades: [] };
    return freshTradesPage();
  }).then(function () {
    t("empty journal → stats placeholder, no tables", /ยังไม่มีบันทึก/.test(sec("djStats")) && !/<table/.test(sec("djStats")));
    t("empty journal → ตามกฎ / คาดถูก show — (nothing to judge yet), not 0 / 0", tileNum("ตามกฎ") === "—" && tileNum("คาดถูก") === "—");
    JOURNAL = freshJournal();
    return freshTradesPage();
  });
});

section("method: stats explained · backup box (Task 13)", function () {
  var D = win.DecisionJournal;
  P.render();
  var m = sec("djMethod");
  t("method explains the stats ratios with the constants", /<h3>สถิติ<\/h3>/.test(m) && /คาดถูก ÷/.test(m) && /ผลดี ÷|ผลดี =/.test(m) &&
    m.indexOf("±" + D.FLAT_BAND_PCT + "%") >= 0 && m.indexOf("น้อยกว่า " + D.MIN_STAT_N + " รายการ") >= 0);
  t("backup box: export button + file input (data-dj-import), neither is primary",
    /<button[^>]*data-dj-export="1"/.test(m) && /<input[^>]*type="file"[^>]*data-dj-import="1"/.test(m) && !/dj-btn-primary/.test(m));
  t("file input sits inside a visible label button", /<label class="dj-btn dj-file">[^<]*<input/.test(m));
  t("<details> wired for open state", /<details class="dj-method" data-dj-method="1"/.test(m));
  var mNode = nodeOf("data-dj-method", "1");
  if (mNode) mNode.open = true;
  var tg = handlers["data-dj-method|1|toggle"];
  if (tg) tg({});
  P.render();
  t("details stay open after a re-render once the user opened them", /<details class="dj-method" data-dj-method="1" open>/.test(sec("djMethod")));
  mNode = nodeOf("data-dj-method", "1");
  if (mNode) mNode.open = false;
  if (handlers["data-dj-method|1|toggle"]) handlers["data-dj-method|1|toggle"]({});
  P.render();
  t("…and closed again when the user closes them", /<details class="dj-method" data-dj-method="1">/.test(sec("djMethod")));
  t("backup box shows usage of the server cap", /ใช้พื้นที่/.test(sec("djMethod")));
  var css = readPub("decision-journal.css").replace(/\/\*[\s\S]*?\*\//g, "");
  t("CSS: stats, backup and file input styled", /\.dj-backup\s*\{/.test(css) && /\.dj-file-input\s*\{/.test(css) && /\.dj-file:focus-within/.test(css) &&
    /\.dj-insight\s*\{/.test(css) && /\.dj-thin\s*\{/.test(css));
  return null;
});

section("export / import: file round trip · refusals · merge rules · failures (Task 13)", function () {
  var S = P._state;
  var blobs = [], created = [];
  var savedBlob = win.Blob, savedReader = win.FileReader, savedCreate = doc.createElement;
  win.Blob = function (parts, opts) { blobs.push({ text: parts.join(""), type: opts && opts.type }); };
  doc.createElement = function (tag) { var el = mkEl(tag); created.push(el); return el; };
  win.FileReader = function () {
    var self = this;
    this.readAsText = function (f) { setTimeout(function () { self.result = f._text; if (self.onload) self.onload({ target: self }); }, 0); };
  };
  function restore() { win.Blob = savedBlob; win.FileReader = savedReader; doc.createElement = savedCreate; }
  JOURNAL = freshJournal();
  JOURNAL.entries.push(mkEntry({ id: "e_gone", createdAt: "2026-08-01T03:00:00.000Z", date: "2026-08-01", symbol: "NVDA", direction: "up", horizonDays: 7, action: "buy",
    asOfBar: "2026-07-31", close: 100, verdict: { compliance: "per-rule", supports: ["r1"], opposes: [], rulesSay: "buy", why: "" } }));
  JOURNAL.entries[2].deletedAt = "2026-09-01T00:00:00.000Z";
  return freshTradesPage().then(function () {
    var n0 = putCalls().length;
    var p = P._exportPayload();
    t("export payload = whole doc incl. tombstones (a restore elsewhere must not resurrect deleted items)",
      p.doc.entries.length === 3 && p.doc.entries.some(function (x) { return x.id === "e_gone" && !!x.deletedAt; }) && p.doc.trades.length === 2);
    t("exportedAt is an ISO stamp", isIso(p.exportedAt), p.exportedAt);
    p.doc.entries[0].context.event = "แก้ในไฟล์";
    t("payload is a copy (editing it does not touch the page state)", S.doc.entries.every(function (x) { return !x.context || x.context.event !== "แก้ในไฟล์"; }));
    clickAttr("data-dj-export", "1");
    var a = created.filter(function (el) { return el.tagName === "A"; })[0];
    var file = blobs.length ? JSON.parse(blobs[blobs.length - 1].text) : null;
    t("export button downloads decision-journal-<today>.json with the doc", !!a && a.download === "decision-journal-2026-10-25.json" &&
      !!file && file.v === 1 && file.doc.entries.length === 3 && file.doc.trades.length === 2 && blobs[blobs.length - 1].type === "application/json", a && a.download);
    t("export never PUTs", putCalls().length === n0);
    t("export says what was saved to the file", /ส่งออก/.test(ioText()) && /บันทึก 2/.test(ioText()) && /ไม้จริง 2/.test(ioText()), ioText());

    privacyLocked = true; fireDoc("portfolio-privacy-changed");
    var nb = blobs.length;
    t("locked: export button disabled with the reason", /<button[^>]*data-dj-export="1"[^>]*disabled/.test(html()) && /ปลดล็อก/.test(sec("djMethod")));
    clickAttr("data-dj-export", "1");
    t("locked: a click (if one gets through) does not write a file", blobs.length === nb);
    privacyLocked = false; fireDoc("portfolio-privacy-changed");

    // นำเข้าไฟล์ผ่านช่องเลือกไฟล์จริง (change → FileReader → JSON → _importPayload)
    var fileDoc = { v: 1, exportedAt: "2026-10-20T00:00:00.000Z", doc: { v: 1, updatedAt: "2026-10-20T00:00:00.000Z", entries: [
      mkEntry({ id: "e_file", createdAt: "2026-10-02T03:00:00.000Z", date: "2026-10-02", symbol: "NVDA", direction: "up", horizonDays: 30, action: "hold",
        asOfBar: "2026-10-01", close: 100, verdict: { compliance: "n/a", supports: [], opposes: [], rulesSay: "buy", why: "" } })
    ], trades: [] } };
    var el = nodeOf("data-dj-import", "1");
    t("file input wired on change", !!el && typeof handlers["data-dj-import|1|change"] === "function");
    el.files = [{ name: "backup.json", _text: JSON.stringify(fileDoc) }];
    el.value = "C:\\fakepath\\backup.json";
    handlers["data-dj-import|1|change"]({ target: el });
    return flush().then(flush).then(function () { return [n0, el]; });
  }).then(function (r) {
    t("file import → one PUT with the new entry", putCalls().length === r[0] + 1 && lastPut().entries.some(function (x) { return x.id === "e_file"; }));
    t("…input cleared so the same file can be picked again", r[1].value === "");
    t("…status next to the buttons: saved on the server", /บันทึกบนเซิร์ฟเวอร์แล้ว/.test(ioText()) && /นำเข้า/.test(ioText()), ioText());
    t("…tombstone kept in the PUT", lastPut().entries.some(function (x) { return x.id === "e_gone" && !!x.deletedAt; }));
    var el = nodeOf("data-dj-import", "1");
    el.files = [{ name: "broken.json", _text: "{ not json" }];
    var n = putCalls().length;
    handlers["data-dj-import|1|change"]({ target: el });
    return flush().then(function () { return n; });
  }).then(function (n) {
    t("broken JSON file → readable message, no PUT", putCalls().length === n && /อ่านไฟล์ไม่ได้/.test(ioText()), ioText());

    // ไฟล์มีรายการที่เซิร์ฟเวอร์ไม่รับ → ข้ามเฉพาะตัวนั้น (บอกเหตุผล) ตัวที่ดีนำเข้าได้
    return P._importPayload({ v: 1, doc: { v: 1, entries: [
      { id: "e_ok2", date: "2026-10-03", symbol: "NVDA", createdAt: "2026-10-03T00:00:00Z", updatedAt: "2026-10-03T00:00:00Z", context: { feelings: [] }, view: { direction: "up", horizonDays: 7 }, action: { kind: "none" }, rules: {}, verdict: { compliance: "n/a" }, review: {} },
      { id: "e_bad", date: "2026-02-30", symbol: "NVDA", updatedAt: "2026-10-03T00:00:00Z" }
    ], trades: [{ id: "t_bad", date: "2026-10-01", symbol: "  ", side: "buy", qty: 1, price: 1, updatedAt: "2026-10-03T00:00:00Z" }] } });
  }).then(function (ok) {
    var b = lastPut();
    t("invalid items skipped, valid one imported", ok === true && b.entries.some(function (x) { return x.id === "e_ok2"; }) &&
      !b.entries.some(function (x) { return x.id === "e_bad"; }) && !b.trades.some(function (x) { return x.id === "t_bad"; }));
    t("…and the message says how many were skipped and why (วันที่ · สัญลักษณ์)", /ข้าม 2 รายการ/.test(ioText()) && /วันที่/.test(ioText()) && /สัญลักษณ์/.test(ioText()), ioText());
    var n = putCalls().length;
    return P._importPayload({ v: 1, doc: { v: 1, entries: [{ id: 5, date: "2026-10-01", symbol: "X" }], trades: [] } }).then(function (ok2) { return [ok2, n]; });
  }).then(function (r) {
    t("nothing importable → false, no PUT, reason shown", r[0] === false && putCalls().length === r[1] && /ไม่มีรายการที่นำเข้าได้/.test(ioText()), ioText());
    // สำเนาเก่าของ e_fix1 (updatedAt เก่ากว่า) ต้องไม่ทับของบนเซิร์ฟเวอร์ · ไม่มีอะไรใหม่ = ไม่ส่ง
    var old = JSON.parse(JSON.stringify(freshJournal().entries[0]));
    old.updatedAt = "2026-08-01T00:00:00.000Z";
    old.context.event = "สำเนาเก่า";
    var n = putCalls().length;
    return P._importPayload({ v: 1, doc: { v: 1, entries: [old], trades: [] } }).then(function (ok3) { return [ok3, n]; });
  }).then(function (r) {
    t("older copy only → nothing new, no PUT, says so", r[0] === true && putCalls().length === r[1] && /ไม่มีอะไรใหม่/.test(ioText()), ioText());
    t("…page copy not overwritten by the older one", S.doc.entries.filter(function (x) { return x.id === "e_fix1"; })[0].context.event === "ข่าวร้าย ตลาดลง");
    // ไฟล์ที่มีทั้งของใหม่ + สำเนาที่ตราประทับเท่ากัน + สำเนาเก่า → ส่ง แต่ตัวที่เท่ากัน/เก่ากว่าต้องไม่ทับของในหน้า
    var fx = freshJournal();
    var tie = JSON.parse(JSON.stringify(fx.entries[0]));
    tie.context.event = "สำเนาตราประทับเท่ากัน";
    var older = JSON.parse(JSON.stringify(fx.entries[1]));
    older.updatedAt = "2026-01-01T00:00:00.000Z";
    older.action.plan = "สำเนาเก่า";
    return P._importPayload({ v: 1, doc: { v: 1, entries: [tie, older,
      { id: "e_mix", date: "2026-10-05", symbol: "NVDA", createdAt: "2026-10-05T00:00:00Z", updatedAt: "2026-10-05T00:00:00Z", context: { feelings: [] },
        view: { direction: "up", horizonDays: 7 }, action: { kind: "none" }, rules: {}, verdict: { compliance: "n/a" }, review: {} }], trades: [] } });
  }).then(function (ok) {
    var b = lastPut();
    t("mixed file: new item sent; same-stamp and older copies do not replace the page copies", ok === true && !!entryIn(b, "e_mix") &&
      entryIn(b, "e_fix1").context.event === "ข่าวร้าย ตลาดลง" && entryIn(b, "e_fix2").action.plan === "" &&
      /ใหม่ 1/.test(ioText()) && /อัปเดต 0/.test(ioText()), [entryIn(b, "e_fix1").context.event, entryIn(b, "e_fix2").action.plan, ioText()]);
    var newer = JSON.parse(JSON.stringify(freshJournal().entries[1]));
    newer.updatedAt = "2026-10-24T00:00:00.000Z";
    newer.action.plan = "แผนจากเครื่องอื่น";
    return P._importPayload({ v: 1, doc: { v: 1, entries: [newer], trades: [] } });
  }).then(function (ok) {
    t("newer copy of an existing id wins (merge by id, newer updatedAt)", ok === true &&
      entryIn(lastPut(), "e_fix2").action.plan === "แผนจากเครื่องอื่น" && /อัปเดต 1/.test(ioText()), ioText());
    return P._importPayload({ v: 1, doc: { v: 2, entries: [], trades: [] } });
  }).then(function (ok) {
    t("doc version ≠ engine VERSION → false with a reason", ok === false && /ไม่ใช่ไฟล์สำรองของ Decision Journal|เวอร์ชัน/.test(ioText()), ioText());
    failPut = 500;
    return P._importPayload({ v: 1, doc: { v: 1, entries: [{ id: "e_draft_imp", date: "2026-10-04", symbol: "NVDA", createdAt: "2026-10-04T00:00:00Z", updatedAt: "2026-10-04T00:00:00Z",
      context: { feelings: [] }, view: { direction: "up", horizonDays: 7 }, action: { kind: "none" }, rules: {}, verdict: { compliance: "n/a" }, review: {} }], trades: [] } });
  }).then(function (ok) {
    failPut = null;
    t("PUT fails → false, kept as a local draft, never 'saved'", ok === false && !!draftObj() && draftObj().entries.some(function (x) { return x.id === "e_draft_imp"; }) &&
      !/บันทึกบนเซิร์ฟเวอร์แล้ว/.test(ioText()) && /ยังไม่ถึงเซิร์ฟเวอร์|ร่าง/.test(ioText()), ioText());
    t("no NaN/undefined/advisory after imports", !LEAK.test(html()) && !ADVISORY_TH.test(html()) && !ADVISORY_EN.test(html()), (LEAK.exec(html()) || [])[0]);
    restore();
    JOURNAL = freshJournal();
    return freshTradesPage();
  }, function (e) { failPut = null; restore(); throw e; });
});

section("browser-probe fixes (2026-10-26): mobile width · import copy · disabled file label", function () {
  var S = P._state;
  // Chrome จริงที่จอ 390: ข้อความโปรแกรมอ่านจอ (.dj-sr, position:absolute) ในคอลัมน์ "จัดการ" ของตารางไม้จริง
  // ไม่มีบรรพบุรุษที่ position ภายในกล่องเลื่อน จึงถูกวางนอกกล่องและถ่างหน้าเป็น 635px
  // VM วาดเลย์เอาต์ไม่ได้ จึงล็อกที่ต้นเหตุ: กล่องตารางต้องเป็น containing block ของ .dj-sr
  var cssRaw = readPub("decision-journal.css").replace(/\/\*[\s\S]*?\*\//g, "");
  var wrapRule = (/\.dj-table-wrap\s*\{([^}]*)\}/.exec(cssRaw) || [])[1] || "";
  t("table wrapper is the containing block for its absolute .dj-sr (page stays 390px wide on a phone)",
    /position\s*:\s*relative/.test(wrapRule) && /overflow-x\s*:\s*auto/.test(wrapRule), wrapRule);
  t("…and .dj-sr is still absolutely positioned (the reason the wrapper must be relative)", /\.dj-sr\s*\{[^}]*position\s*:\s*absolute/.test(cssRaw));
  // ข้อความนำเข้าต้องไม่สัญญาว่า "ไม่ลบของที่มีอยู่" — การลบที่ใหม่กว่าในไฟล์ลบที่นี่ด้วย (merge ตาม id)
  P.render();
  var m = sec("djMethod");
  t("import copy no longer promises it never deletes", m.indexOf("ไม่ลบของที่มีอยู่") < 0 && /รวมถึงการลบ/.test(m), (/สำรองข้อมูล[\s\S]{0,260}/.exec(m) || [""])[0]);
  // ระหว่างบันทึก ช่องไฟล์ปิด → ป้ายที่มองเห็นต้องปิดตาม (aria-disabled + class) ไม่ใช่กดแล้วเงียบ
  var was = S.saving;
  S.saving = true; P.render();
  var busy = sec("djMethod");
  S.saving = was; P.render();
  var idle = sec("djMethod");
  t("saving: file label looks and announces disabled", /<label class="dj-btn dj-file is-disabled" aria-disabled="true">/.test(busy) &&
    /<input[^>]*data-dj-import="1"[^>]*disabled/.test(busy), (/<label class="dj-btn dj-file[^>]*>/.exec(busy) || [""])[0]);
  t("idle: file label enabled again", /<label class="dj-btn dj-file">/.test(idle) && !/aria-disabled/.test((/<label class="dj-btn dj-file[^>]*>/.exec(idle) || [""])[0]));
  t("CSS: disabled file label styled", /\.dj-file\.is-disabled\s*\{/.test(cssRaw));
  // จอมือถือ: วันที่ในช่องผลจริงเคยถูกตัดกลางคำ ("ครบ 2026-10-" / "31") เพราะ .dj-hz-s ตัดได้ทุกที่
  t("CSS: .dj-nw keeps a date/price on one line", /\.dj-nw\s*\{[^}]*white-space\s*:\s*nowrap/.test(cssRaw));
  // ไม้เปิดอยู่: fixture ไม้จริง NVDA ซื้อ 10 ขาย 4 → เปิดอยู่ 1 สัญลักษณ์ = NVDA → บรรทัดใต้ป้ายต้องบอกชื่อ ไม่ใช่คำว่า "สัญลักษณ์" เฉย ๆ
  t("open-positions tile names the symbol(s)", /<div class="dj-tile-l">ไม้เปิดอยู่<\/div><div class="dj-tile-s">NVDA<\/div>/.test(sec("djSummary")),
    (/ไม้เปิดอยู่<\/div>[\s\S]{0,80}/.exec(sec("djSummary")) || [""])[0]);
  JOURNAL = freshJournal();
  return freshLogPage().then(function () { return P._loadOutcomes(); }).then(function () {
    var c = cardOf("e_fix1");
    // e_fix1 = 2026-09-01: +7 → 2026-09-08 ปิด 103 (scored) · +90 → 2026-11-30 ยังไม่ปิด (pending)
    t("scored cell: price and date each kept whole", /ปิด <span class="dj-nw">103\.00<\/span> · <span class="dj-nw">2026-09-08<\/span>/.test(hzCell(c, 7)), hzCell(c, 7));
    t("pending cell: 'ครบ' + a date that never splits", /ครบ <span class="dj-nw">2026-11-30<\/span>/.test(hzCell(c, 90)), hzCell(c, 90));
    t("no NaN/undefined in the cards after the change", !LEAK.test(sec("djLog")));
    JOURNAL = freshJournal();
    return freshTradesPage();
  });
});

// ==== งานถัดไปต่อ section ใหม่เหนือบรรทัดนี้ ====

var watchdog = setTimeout(function () {
  console.error("  ✗ timeout (หน้าเว็บค้าง)");
  fail++;
  finish();
}, 20000);

(function runAll() {
  var i = 0;
  function next() {
    if (i >= SECTIONS.length) { clearTimeout(watchdog); finish(); return; }
    var s = SECTIONS[i++];
    console.log("== " + s.name + " ==");
    var r;
    try { r = s.fn(); }
    catch (e) { fail++; console.error("  ✗ " + s.name + " threw: " + (e && e.stack || e)); next(); return; }
    Promise.resolve(r).then(next, function (e) {
      fail++; console.error("  ✗ " + s.name + " rejected: " + (e && e.stack || e)); next();
    });
  }
  if (!P) { t("window.DecisionJournalPage exists", false); clearTimeout(watchdog); finish(); return; }
  next();
})();
