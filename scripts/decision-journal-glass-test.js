"use strict";
// ============================================================
// DECISION JOURNAL — glass cards (glass-cards batch 2–4 · Task 14 · dj-8)
//   node scripts/decision-journal-glass-test.js
//
// Boots the real page in a vm (same harness idea as decision-journal-view-test.js: fake DOM, fake fetch,
// never the network, never the real journal/portfolio documents) and checks:
//   · card → existing status → tone: realized P/L tile = pnlCls (calm / danger / neutral, neutral while locked or
//     when the figure rounds to 0 — a break-even float residue such as +1.4e-14 shows "$0.00"),
//     alerts is-bad → danger · is-warn → warning, due strip → warning, every section + tile without a status → neutral
//   · one tone per card, no glass card inside a glass card
//   · shared pieces: gc-field on every form control in a card, gc-btn / gc-btn gc-btn-ghost on in-card buttons,
//     gc-num on the tile figure · emotion chips keep class="dj-chip"
//   · privacy lock: money tiles neutral + XXX, no money in title/aria-label, no figures left in <input value>
//   · HTML loads glass-cards.css between mission-control.css and decision-journal.css · versions bumped
//   · the page CSS never repaints a glass card and keeps colours in --dj-* tokens (lifted text tokens ≥ 0.70 luminance)
// ============================================================
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var E = require("../public/decision-journal-engine.js");
var HA = require("../public/home-action-engine.js");

var ROOT = path.join(__dirname, "..");
var PUB = path.join(ROOT, "public");
var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; return; }
  fail++;
  console.error("  ✗ " + name + (extra !== undefined ? "  → " + JSON.stringify(extra) : ""));
}
function readPub(f) { return fs.readFileSync(path.join(PUB, f), "utf8"); }

// ---------- fixture ----------
function rep(v, n) { var a = []; for (var i = 0; i < n; i++) a.push(v); return a; }
function isWeekend(ymd) { var dow = new Date(ymd + "T00:00:00Z").getUTCDay(); return dow === 0 || dow === 6; }
function mkBarsEnding(endYmd, closes) {
  var dates = [], d = endYmd;
  while (dates.length < closes.length) { if (!isWeekend(d)) dates.unshift(d); d = E.ymdAdd(d, -1); }
  return dates.map(function (dt, i) { return { date: dt, open: closes[i], high: closes[i], low: closes[i], close: closes[i], volume: 1000 }; });
}
var BARS = {
  NVDA: mkBarsEnding("2026-10-23", rep(100, 252).concat([101, 102, 103, 104, 105, 106, 107, 108])),
  "PTT.BK": mkBarsEnding("2026-10-23", rep(30, 260))
};
function mkEntry(o) {
  return {
    id: o.id, createdAt: o.createdAt, updatedAt: o.createdAt, deletedAt: null, date: o.date, symbol: o.symbol, label: "",
    context: { event: o.event || "", feelings: o.feelings || [], note: "" },
    view: { direction: o.direction, horizonDays: o.horizonDays },
    action: { kind: o.action, plan: "", conviction: false, tradeIds: [] },
    rules: {
      version: "dj-rules-1", source: "yahoo:/api/ohlc", asOfBar: o.asOfBar, barsUsed: 500, partialBarDropped: false,
      close: o.close, ema12: null, ema26: null, sma200: null, high1y: null, high1yDate: null, high1yWindowBars: null,
      r1: { state: "bull", crossDir: null, crossBarsAgo: null, buy: true, sell: false },
      r2: { state: "above", consecutive: 30, crossDir: null, crossBarsAgo: null, breakConfirmed: false, reclaimHeld: false,
        touchBounce: { met: false, touchDate: null, touchLow: null, touchSma: null }, buy: false, sell: false },
      r3: { dd1yPct: -5, dipMet: false, conviction: false, buy: false }
    },
    verdict: o.verdict,
    review: { reviewedAt: null, selfVerdict: null, lesson: "" }
  };
}
function mkTrade(id, date, symbol, side, qty, price, currency) {
  return { id: id, createdAt: date + "T03:00:00.000Z", updatedAt: date + "T03:00:00.000Z", deletedAt: null,
    date: date, symbol: symbol, side: side, qty: qty, price: price, currency: currency, fee: 0, note: "", entryId: null };
}
function haEntry() {
  var ev = { symbol: "NVDA", rule: 2, side: "sell", date: "2026-10-20", close: 107, kind: "break", detail: { crossDate: "2026-10-19" } };
  return HA.makeEntry(ev, { response: "done", nowIso: "2026-10-20T03:00:00.000Z", respondedAt: "2026-10-20T03:00:00.000Z",
    execPrice: 107, positionValue: 50000, positionCurrency: "THB", amount: null, D: E });
}
// e_g1: แหกกฎ · ครบ +7 แล้ว → คิวทบทวน (แถบรอทบทวน) · e_g2: ตามกฎ · ยังไม่ครบ · + entry จากกล่อง Action
// ไม้: NVDA ขายกำไร +$120 (USD) · PTT.BK ขายขาดทุน −฿500 (THB)
function profitLossJournal() {
  return {
    v: 1, updatedAt: "2026-10-20T10:00:00.000Z", haLaunchedAt: "2026-10-19",
    entries: [
      mkEntry({ id: "e_g1", createdAt: "2026-09-01T03:00:00.000Z", date: "2026-09-01", symbol: "NVDA", event: "ข่าวร้าย", feelings: ["fear"],
        direction: "down", horizonDays: 7, action: "sell", asOfBar: "2026-08-31", close: 100,
        verdict: { compliance: "against", supports: [], opposes: ["r1"], rulesSay: "buy", why: "กฎ 1: EMA12 ยังเหนือ EMA26" } }),
      mkEntry({ id: "e_g2", createdAt: "2026-10-20T10:00:00.000Z", date: "2026-10-20", symbol: "PTT.BK", event: "ย่อมาแรง", feelings: ["calm"],
        direction: "up", horizonDays: 90, action: "buy", asOfBar: "2026-10-17", close: 30,
        verdict: { compliance: "per-rule", supports: ["r1"], opposes: [], rulesSay: "buy", why: "กฎ 1: EMA12 เหนือ EMA26" } }),
      haEntry()
    ],
    trades: [
      mkTrade("t_g1", "2026-01-05", "NVDA", "buy", 10, 100, "USD"),
      mkTrade("t_g2", "2026-03-02", "NVDA", "sell", 4, 130, "USD"),
      mkTrade("t_g3", "2026-02-02", "PTT.BK", "buy", 100, 35, "THB"),
      mkTrade("t_g4", "2026-04-01", "PTT.BK", "sell", 100, 30, "THB")
    ]
  };
}
function zeroJournal() {
  var j = profitLossJournal();
  j.trades = [mkTrade("t_z1", "2026-02-02", "PTT.BK", "buy", 10, 30, "THB"), mkTrade("t_z2", "2026-04-01", "PTT.BK", "sell", 10, 30, "THB")];
  return j;
}
// break-even in decimal (+0.1 +0.2 −0.3 per share) but the float sum is +1.42e-14 → the tile reads "$0.00"
function residueJournal() {
  var j = profitLossJournal();
  j.trades = [mkTrade("t_r1", "2026-01-05", "NVDA", "buy", 3, 101.3, "USD"), mkTrade("t_r2", "2026-02-02", "NVDA", "sell", 1, 101.4, "USD"),
    mkTrade("t_r3", "2026-02-03", "NVDA", "sell", 1, 101.5, "USD"), mkTrade("t_r4", "2026-02-04", "NVDA", "sell", 1, 101, "USD")];
  return j;
}
var JOURNAL = profitLossJournal();

// ---------- sandbox ----------
var els = {}, handlers = {}, nodes = {};
function mkEl(tag) {
  return {
    tagName: (tag || "div").toUpperCase(), innerHTML: "", value: "", checked: false, disabled: false, type: "", style: {}, attributes: {},
    appendChild: function () {}, removeChild: function () {}, click: function () {}, focus: function () {}, scrollIntoView: function () {},
    setAttribute: function (k, v) { this.attributes[k] = v; },
    getAttribute: function (k) { return this.attributes[k] === undefined ? null : this.attributes[k]; },
    removeAttribute: function (k) { delete this.attributes[k]; },
    addEventListener: function () {}, querySelector: function () { return null; }, querySelectorAll: function () { return []; },
    closest: function () { return null; },
    classList: { add: function () {}, remove: function () {}, contains: function () { return false; }, toggle: function () {} }
  };
}
function html() { return (els.djRoot && els.djRoot.innerHTML) || ""; }
function fakeNodes(sel) {
  var m = /^\[([a-z-]+)\]$/.exec(sel);
  if (!m) return [];
  var attr = m[1], re = new RegExp(attr + '="([^"]*)"', "g"), mm, out = [], seen = {}, h = html();
  while ((mm = re.exec(h)) !== null) {
    if (seen[mm[1]]) continue;
    seen[mm[1]] = 1;
    var el = mkEl("div");
    el.attributes[attr] = mm[1];
    (function (key) { el.addEventListener = function (ev, fn) { handlers[key + "|" + ev] = fn; }; })(attr + "|" + mm[1]);
    nodes[attr + "|" + mm[1]] = el;
    out.push(el);
  }
  return out;
}
function clickAttr(attr, val) {
  var fn = handlers[attr + "|" + val + "|click"];
  if (!fn) return false;
  fn({ stopPropagation: function () {}, preventDefault: function () {}, target: nodes[attr + "|" + val] });
  return true;
}
var docListeners = {};
var doc = {
  readyState: "complete", body: mkEl("body"), head: mkEl("head"), activeElement: null,
  createElement: function (tag) { return mkEl(tag); },
  addEventListener: function (type, fn) { (docListeners[type] = docListeners[type] || []).push(fn); },
  removeEventListener: function () {},
  dispatchEvent: function (ev) { (docListeners[ev && ev.type] || []).slice().forEach(function (fn) { fn(ev); }); return true; },
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
var store = {}, fetchCalls = [], failGet = null, failPut = null, privacyLocked = false;
function resp(status, body) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status: status,
    json: function () { return Promise.resolve(JSON.parse(JSON.stringify(body))); },
    text: function () { return Promise.resolve(JSON.stringify(body)); } });
}
var win = {
  document: doc,
  location: { search: "", pathname: "/decision-journal", origin: "http://localhost" },
  history: { pushState: function () {}, replaceState: function () {} },
  localStorage: { getItem: function (k) { return store[k] === undefined ? null : store[k]; }, setItem: function (k, v) { store[k] = String(v); }, removeItem: function (k) { delete store[k]; } },
  sessionStorage: { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} },
  addEventListener: function () {},
  CustomEvent: function (type, init) { this.type = type; this.detail = init && init.detail; },
  PortfolioPrivacy: { isLocked: function () { return privacyLocked; } },
  fetch: function (url, init) {
    var u = String(url), method = String((init && init.method) || "GET").toUpperCase();
    fetchCalls.push({ url: u, method: method });
    if (/^\/api\/portfolio\?doc=journal(&|$)/.test(u)) {
      if (method === "PUT") return failPut ? resp(failPut, { error: "fixture" }) : resp(200, { ok: true });
      if (failGet) return resp(failGet, { error: "fixture" });
      return resp(200, { data: JSON.parse(JSON.stringify(JOURNAL)), mode: "supabase" });
    }
    if (/^\/api\/portfolio-holdings(\?|$)/.test(u)) return resp(200, { data: [], mode: "supabase" });
    if (/^\/api\/ohlc\?/.test(u)) {
      var sym = decodeURIComponent((/[?&]symbol=([^&]+)/.exec(u) || [])[1] || "");
      return resp(200, { bars: BARS[sym] || [], sourceType: "LIVE" });
    }
    return resp(404, { error: "not routed" });
  },
  URL: { createObjectURL: function () { return "blob:x"; }, revokeObjectURL: function () {} },
  Blob: function () {}, FileReader: function () {},
  console: console, Math: Math, JSON: JSON, Date: Date, Number: Number, String: String, Object: Object, Array: Array, Boolean: Boolean,
  encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent, isFinite: isFinite, isNaN: isNaN,
  parseInt: parseInt, parseFloat: parseFloat, Promise: Promise, RegExp: RegExp, Error: Error, TypeError: TypeError,
  setTimeout: setTimeout, clearTimeout: clearTimeout, Intl: typeof Intl !== "undefined" ? Intl : undefined
};
win.window = win; win.self = win;
win.__DJ_NOW = "2026-10-25T12:00";
var ctx = vm.createContext(win);
var DJ_HTML = readPub("decision-journal.html");
var SKIP = ["theme.js", "api-auth.js", "privacy.js", "big-cache.js", "app-navigation.js"];
var bootOk = true;
(function () {
  var re = /<script src="\/([A-Za-z0-9._-]+\.js)/g, m;
  while ((m = re.exec(DJ_HTML)) !== null) {
    if (SKIP.indexOf(m[1]) >= 0) continue;
    try { vm.runInContext(readPub(m[1]), ctx, { filename: m[1] }); } catch (e) { bootOk = false; console.error("   boot " + m[1] + ": " + e.message); }
  }
})();
var P = win.DecisionJournalPage;

// ---------- helpers ----------
function load(journal) {
  JOURNAL = journal;
  var S = P._state;
  delete store.decision_journal_draft_v1;
  S.draft = null; S.pendingDoc = null; S.pricesBySymbol = {}; S.outcomesById = {}; S.priceErrBySymbol = {}; S.filters = {};
  return P.load(true).then(function () { return P._loadOutcomes(); }).then(function () { P.render(); });
}
var TONES = ["gc-calm", "gc-normal", "gc-warning", "gc-danger", "gc-neutral"];
function classesOf(tag) { var m = /\sclass="([^"]*)"/.exec(tag); return m ? m[1].split(/\s+/) : []; }
function startTags(h) { var out = [], re = /<[a-zA-Z][a-zA-Z0-9]*\b[^>]*>/g, m; while ((m = re.exec(h)) !== null) out.push(m[0]); return out; }
function glassTags(h) { return startTags(h).filter(function (tg) { return classesOf(tg).indexOf("gc-card") >= 0; }); }
function toneOf(tag) { var c = classesOf(tag).filter(function (x) { return TONES.indexOf(x) >= 0; }); return c.length === 1 ? c[0].slice(3) : (c.length ? "many" : "none"); }
function sectionTag(id) { var m = new RegExp('<section id="' + id + '"[^>]*>').exec(html()); return m ? m[0] : ""; }
function tileTag(label) {
  var h = html(), i = h.indexOf('<div class="dj-tile-l">' + label + "</div>");
  if (i < 0) return "";
  var a = Math.max(h.lastIndexOf('<div class="dj-tile ', i), h.lastIndexOf('<a class="dj-tile ', i));
  return a < 0 ? "" : h.slice(a, h.indexOf(">", a) + 1);
}
function tileNumTag(label) {
  var h = html(), i = h.indexOf('<div class="dj-tile-l">' + label + "</div>");
  var a = h.lastIndexOf('<div class="dj-tile-n', i);
  return i < 0 || a < 0 ? "" : h.slice(a, h.indexOf("</div>", a));
}
// glass inside glass: walk the tags with a stack (void / self-closing tags never open)
function nestedGlass(h) {
  var VOID = { input: 1, br: 1, img: 1, hr: 1, meta: 1, link: 1, source: 1, wbr: 1, col: 1 };
  var stack = [], re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, m, bad = [];
  while ((m = re.exec(h)) !== null) {
    var name = m[2].toLowerCase();
    if (m[1] === "/") {
      for (var i = stack.length - 1; i >= 0; i--) if (stack[i].name === name) { stack.length = i; break; }
      continue;
    }
    if (VOID[name] || /\/$/.test(m[3])) continue;
    var glass = classesOf(m[0]).indexOf("gc-card") >= 0;
    if (glass && stack.some(function (s) { return s.glass; })) bad.push(m[0].slice(0, 90));
    stack.push({ name: name, glass: glass });
  }
  return bad;
}
function lum(hex) {
  var h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map(function (c) { return c + c; }).join("");
  var rgb = [0, 2, 4].map(function (i) {
    var c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

var SECTIONS = ["djReview", "djNew", "djLog", "djStats", "djHaOut", "djTrades", "djMethod"];

// ============================================================
function runAll() {
  // ---------- files ----------
  t("boots", bootOk && !!P);
  var head = DJ_HTML.slice(0, DJ_HTML.indexOf("</head>"));
  var iMc = head.indexOf('href="/mission-control.css?v='), iGc = head.indexOf('href="/glass-cards.css?v=20261121-gc-2"'), iDj = head.indexOf('href="/decision-journal.css?v=');
  t("HTML: glass-cards.css (gc-2) once, after mission-control.css, before decision-journal.css",
    (DJ_HTML.match(/\/glass-cards\.css\?v=/g) || []).length === 1 && iMc >= 0 && iMc < iGc && iGc < iDj, [iMc, iGc, iDj]);
  t("HTML: Inter 700 loaded", /fonts\.googleapis\.com\/css2\?family=Inter:wght@[^"&]*700/.test(DJ_HTML));
  t("HTML: decision-journal.css 20261122-dj-8 · page script 20261122-dj-9 (pnlCls: a figure that rounds to 0 is neutral)",
    /decision-journal\.css\?v=20261122-dj-8"/.test(DJ_HTML) && /decision-journal-page\.js\?v=20261122-dj-9"/.test(DJ_HTML));
  t("HTML: the loading placeholder is a neutral glass card",
    /<main id="djRoot" class="dj-page"><div class="dj-empty gc-card gc-neutral"><strong>กำลังโหลด Decision Journal…<\/strong><\/div><\/main>/.test(DJ_HTML));

  // ---------- profit (USD) + loss (THB), unlocked ----------
  privacyLocked = false;
  return load(profitLossJournal()).then(function () {
    var h = html();
    t("fixture: review queue visible (due strip) and the home-action card has its table",
      /class="dj-due[ "]/.test(h) && /data-dj-hao="followed:7"/.test(h) && !/<section id="djReview" class="[^"]*dj-hidden/.test(h));
    var notGlass = SECTIONS.filter(function (id) {
      var cl = classesOf(sectionTag(id));
      return !(cl.indexOf("dj-block") === 0 && cl.indexOf("is-card") >= 0 && cl.indexOf("gc-card") >= 0 && toneOf(sectionTag(id)) === "neutral");
    });
    t("every section (review · new · log · stats · home-action · trades · method) is ONE neutral glass card", notGlass.length === 0, notGlass);
    t("the summary section itself is not a card (its tiles are)", classesOf(sectionTag("djSummary")).indexOf("gc-card") < 0);
    var plain = ["บันทึกทั้งหมด", "ตามกฎ", "คาดถูก", "ไม้เปิดอยู่"].filter(function (l) {
      var cl = classesOf(tileTag(l));
      return !(cl.indexOf("gc-card") >= 0 && cl.indexOf("gc-tile") >= 0 && toneOf(tileTag(l)) === "neutral");
    });
    t("tiles without a status (บันทึกทั้งหมด · ตามกฎ · คาดถูก · ไม้เปิดอยู่) → gc-tile gc-neutral", plain.length === 0, plain);
    t("realized P/L tile, profit (USD +$120) → gc-calm", toneOf(tileTag("กำไร/ขาดทุนที่รับรู้ · USD")) === "calm" &&
      /\+\$120\.00/.test(tileNumTag("กำไร/ขาดทุนที่รับรู้ · USD")), tileTag("กำไร/ขาดทุนที่รับรู้ · USD"));
    t("realized P/L tile, loss (THB −฿500) → gc-danger", toneOf(tileTag("กำไร/ขาดทุนที่รับรู้ · THB")) === "danger" &&
      /−฿500/.test(tileNumTag("กำไร/ขาดทุนที่รับรู้ · THB")), tileTag("กำไร/ขาดทุนที่รับรู้ · THB"));
    t("the tile figure is gc-num (Inter 700 tabular) and keeps its colour hook", /<div class="dj-tile-n dj-up gc-num">/.test(h) &&
      /<div class="dj-tile-n dj-down gc-num">/.test(h) && /<div class="dj-tile-n gc-num">/.test(h));
    var due = (/<a class="dj-due[^"]*"/.exec(h) || [""])[0];
    t("due strip (รอทบทวน N รายการ) → gc-card gc-strip gc-warning", classesOf(due).indexOf("gc-strip") >= 0 && toneOf(due) === "warning", due);
    var tags = glassTags(h);
    var badTone = tags.filter(function (tg) { return toneOf(tg) === "none" || toneOf(tg) === "many"; });
    t("every glass card has exactly one tone (" + tags.length + " cards)", tags.length >= 14 && badTone.length === 0, badTone);
    t("no gc-normal anywhere (the page has no 'normal' status)", !/\bgc-normal\b/.test(h));
    t("no glass card inside a glass card", nestedGlass(h).length === 0, nestedGlass(h));

    // controls
    var fields = startTags(h).filter(function (tg) { return /^<(input|select|textarea)\b/.test(tg) && /class="dj-(input|select|textarea)/.test(tg); });
    var noField = fields.filter(function (tg) { return classesOf(tg).indexOf("gc-field") < 0; });
    t("every form control in a card wears gc-field (" + fields.length + ")", fields.length >= 20 && noField.length === 0, noField.map(function (x) { return x.slice(0, 60); }));
    t("header search stays page-styled (not on glass)", /<input id="djSearch" class="dj-search-input"/.test(h));
    var btns = startTags(h).filter(function (tg) { return /^<(button|label)\b/.test(tg) && /class="dj-btn[ "]/.test(tg); });
    var inCard = btns.filter(function (tg) { return classesOf(tg).indexOf("dj-new-btn") < 0; });
    var badBtn = inCard.filter(function (tg) {
      var cl = classesOf(tg);
      if (cl.indexOf("gc-btn") < 0) return true;
      return cl.indexOf("dj-btn-primary") >= 0 ? cl.indexOf("gc-btn-ghost") >= 0 : cl.indexOf("gc-btn-ghost") < 0;
    });
    t("in-card buttons: primary = gc-btn · others = gc-btn gc-btn-ghost (" + inCard.length + ")", inCard.length >= 10 && badBtn.length === 0,
      badBtn.map(function (x) { return x.slice(0, 80); }));
    t("header 'บันทึกใหม่' keeps the page's own button (off the glass)", /<button type="button" class="dj-btn dj-btn-primary dj-new-btn" data-dj-jump="new">/.test(h));
    t("emotion chips keep class=\"dj-chip\" exactly", (h.match(/<button type="button" class="dj-chip" aria-pressed="false" data-dj-feel="/g) || []).length === 8);
    t("money tiles carry no money in title/aria-label", !/(title|aria-label)="[^"]*[฿$]\s?[\d,]/.test(h));

    // ---------- alerts: GET fails → danger ----------
    failGet = 500;
    return P.load(true);
  }).then(function () {
    var a = (/<div class="dj-alert[^"]*"/.exec(html()) || [""])[0];
    t("load failed alert (is-bad) → gc-strip gc-danger", /\bis-bad\b/.test(a) && classesOf(a).indexOf("gc-strip") >= 0 && toneOf(a) === "danger", a);
    failGet = null;
    return load(profitLossJournal());
  }).then(function () {
    // ---------- PUT fails → the draft alert (is-warn) → warning ----------
    failPut = 500;
    return P._addTrade({ date: "2026-10-20", symbol: "PTT.BK", side: "buy", qty: "1", price: "30", fee: "", currency: "THB", note: "", entryId: "" });
  }).then(function () {
    P.render();
    var a = (/<div class="dj-alert is-warn[^"]*"/.exec(html()) || [""])[0];
    t("draft kept on this device (is-warn) → gc-strip gc-warning", classesOf(a).indexOf("gc-strip") >= 0 && toneOf(a) === "warning", a || html().slice(0, 0));
    failPut = null;
    delete store.decision_journal_draft_v1;
    return load(zeroJournal());
  }).then(function () {
    t("realized P/L exactly 0 → no status → gc-neutral", toneOf(tileTag("กำไร/ขาดทุนที่รับรู้ · THB")) === "neutral" &&
      /<div class="dj-tile-n gc-num">฿0<\/div>/.test(html()), tileNumTag("กำไร/ขาดทุนที่รับรู้ · THB"));
    return load(residueJournal());
  }).then(function () {
    var realized = E.fifo(residueJournal().trades, {}).totals.USD.realized;
    var h = html();
    t("fixture: the break-even USD total carries a float residue (> 0, < 0.005)", realized > 0 && realized < 0.005, realized);
    t("realized P/L that rounds to $0.00 (float residue) → no status → gc-neutral, figure uncoloured",
      toneOf(tileTag("กำไร/ขาดทุนที่รับรู้ · USD")) === "neutral" && /<div class="dj-tile-n gc-num">\$0\.00<\/div>/.test(h),
      [tileTag("กำไร/ขาดทุนที่รับรู้ · USD"), tileNumTag("กำไร/ขาดทุนที่รับรู้ · USD")]);
    t("…and the trade totals show that $0.00 uncoloured too (no dj-up / dj-down)",
      /<b class="dj-ttotal-v">\$0\.00<\/b>/.test(h) && !/class="dj-ttotal-v dj-(up|down)">\$0\.00/.test(h));

    // ---------- privacy lock ----------
    return load(profitLossJournal());
  }).then(function () {
    // unlocked: start editing the THB sell (the form fills with its qty / fee) → then lock
    clickAttr("data-dj-trade-edit", "t_g4");
    var editing = /<input id="djTQty"[^>]*value="100"/.test(html());
    privacyLocked = true;
    doc.dispatchEvent(new win.CustomEvent("portfolio-privacy-changed", {}));
    P.render();
    var h = html();
    t("fixture: editing a trade filled the form before the lock", editing);
    t("locked: money tiles have no status tone (colour would tell profit from loss) and show XXX",
      toneOf(tileTag("กำไร/ขาดทุนที่รับรู้ · USD")) === "neutral" && toneOf(tileTag("กำไร/ขาดทุนที่รับรู้ · THB")) === "neutral" &&
      /<div class="dj-tile-n gc-num">XXX<\/div>/.test(tileNumTag("กำไร/ขาดทุนที่รับรู้ · USD") + "</div>"),
      [tileTag("กำไร/ขาดทุนที่รับรู้ · USD"), tileNumTag("กำไร/ขาดทุนที่รับรู้ · USD")]);
    t("locked: no gc-calm / gc-danger anywhere, no coloured money in the trade totals",
      !/\bgc-(calm|danger)\b/.test(h) && !/class="dj-ttotal-v dj-(up|down)"/.test(h));
    var valued = startTags(h).filter(function (tg) { return /^<input\b/.test(tg) && /\bvalue="[^"]*\d[^"]*"/.test(tg) && !/type="date"/.test(tg); });
    t("locked: no figure left in any <input value> (trade edit cancelled on lock)", valued.length === 0, valued.map(function (x) { return x.slice(0, 90); }));
    t("locked: no money in title / aria-label", !/(title|aria-label)="[^"]*([฿$]\s?[\d,]|\d[\d,]*\s?(บาท|THB))/.test(h));
    privacyLocked = false;

    // ---------- CSS ----------
    var css = readPub("decision-journal.css").replace(/\/\*[\s\S]*?\*\//g, "");
    t("page CSS draws no gradients (the glass washes come from glass-cards.css)", !/gradient\(/.test(css));
    var rules = [], re = /([^{}]+)\{([^{}]*)\}/g, m;
    while ((m = re.exec(css)) !== null) rules.push({ sel: m[1].trim().replace(/\s+/g, " "), body: m[2] });
    var REPAINT = /(^|;)\s*(background(-color|-image)?|border(-color)?|box-shadow)\s*:/;
    var glassBases = [".dj-block.is-card", ".dj-tile", ".dj-alert", ".dj-due", ".dj-empty"];
    var repaint = rules.filter(function (r) {
      return r.sel.split(",").some(function (s) { s = s.trim(); return glassBases.indexOf(s) >= 0 || /\.gc-card$/.test(s); }) && REPAINT.test(r.body);
    }).map(function (r) { return r.sel; });
    t("page CSS never repaints a glass card (no background / border / shadow on the glass elements)", repaint.length === 0, repaint);
    var glassTok = rules.filter(function (r) { return r.sel === ".dj-page .gc-card"; }).map(function (r) { return r.body; }).join(";");
    var lifted = {}, tm, tre = /(--dj-[a-z]+-i)\s*:\s*(#[0-9a-fA-F]{3,6})\b/g;
    while ((tm = tre.exec(glassTok)) !== null) lifted[tm[1]] = tm[2];
    var dim = Object.keys(lifted).filter(function (k) { return lum(lifted[k]) < 0.70; });
    t("on glass every hue text token is lifted to luminance ≥ 0.70 (≥ 4.5:1 on every tone) — " + Object.keys(lifted).length + " tokens",
      Object.keys(lifted).length === 11 && dim.length === 0, dim.map(function (k) { return k + " " + lifted[k] + " " + lum(lifted[k]).toFixed(3); }));
    t("on glass the page text tokens become glass ink", /--mc-text:\s*var\(--gc-ink\)/.test(glassTok) && /--mc-muted:\s*var\(--gc-ink-2\)/.test(glassTok) &&
      /--dj-muted:\s*var\(--gc-ink-2\)/.test(glassTok) && /--dj-line:\s*var\(--gc-line\)/.test(glassTok));
    t("no light-theme override inside the glass (cards look the same in both themes)",
      !/html\[data-theme="light"\] \.dj-(step-n|block-head > \.dj-ico|stat-head > \.dj-ico)/.test(css));
    var COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\b(rgba?|hsla?|oklch|oklab|lab|lch)\(/;
    var loose = rules.filter(function (r) {
      var decls = r.body.split(";").map(function (d) { return d.trim(); }).filter(Boolean);
      return !decls.every(function (d) { return d.indexOf("--dj-") === 0; }) && COLOR_LITERAL.test(r.body);
    }).map(function (r) { return r.sel; });
    t("colour literals only inside --dj-* token blocks (glass included)", loose.length === 0, loose);
    return null;
  });
}

runAll().then(function () {
  console.log("");
  console.log(pass + fail + " checks · " + pass + " passed · " + fail + " failed");
  process.exit(fail ? 1 : 0);
}, function (e) {
  console.error("  ✗ threw: " + (e && e.stack || e));
  console.log(pass + fail + 1 + " checks · " + pass + " passed · " + (fail + 1) + " failed");
  process.exit(1);
});
