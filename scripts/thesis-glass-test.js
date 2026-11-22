// Glass cards on /thesis (Task 5 · 2026-11) — node scripts/thesis-glass-test.js
//
// Every card on /thesis wears the shared glass (public/glass-cards.css) with ONE tone taken from a status the page
// already computes; a card without a status is gc-neutral. Section headings sit on the page (gc-section-h); inner
// blocks of a card are dark wells, never a glass card inside a glass card.
//
// How: the real page (thesis-page.js + the real engines + the real KB) is booted in a vm. The page's internals are
// reached by rewriting its export line IN THIS TEST ONLY, then every status is forced through the real render path
// (a real engine result with the one field under test replaced). Overview / compare are the real modules via require.
"use strict";
var vm = require("vm"), fs = require("fs"), path = require("path");
var ROOT = path.join(__dirname, ".."), PUB = path.join(ROOT, "public");
var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; console.log("  PASS  " + name); }
  else { fail++; console.log("  FAIL  " + name + (extra != null ? "  → " + (typeof extra === "string" ? extra : JSON.stringify(extra)) : "")); }
}
function read(f) { return fs.readFileSync(path.join(PUB, f), "utf8"); }

// ------------------------------------------------------------------ helpers on HTML strings
var TONES = ["gc-calm", "gc-normal", "gc-warning", "gc-danger", "gc-neutral"];
function attrOf(tag, name) { var m = new RegExp("\\s" + name + "=\"([^\"]*)\"").exec(tag); return m ? m[1] : null; }
// every element whose class list has gc-card: { tag, cls, tones[] }
function glassCards(html) {
  var out = [], re = /<([a-z][\w-]*)\b[^>]*>/g, m;
  while ((m = re.exec(html)) !== null) {
    var cls = attrOf(m[0], "class");
    if (!cls || !/(^|\s)gc-card(\s|$)/.test(cls)) continue;
    out.push({ tag: m[1], cls: cls, tones: cls.split(/\s+/).filter(function (c) { return TONES.indexOf(c) >= 0; }) });
  }
  return out;
}
// tone of the first glass card whose class list contains every class in `want` (string, space separated)
function toneOf(html, want) {
  var need = want.split(/\s+/);
  var c = glassCards(html).filter(function (g) { var list = g.cls.split(/\s+/); return need.every(function (k) { return list.indexOf(k) >= 0; }); })[0];
  return c ? (c.tones.length === 1 ? c.tones[0] : "tones:" + c.tones.join("+")) : null;
}
// gc-card nested inside a gc-card (simple tag walker; void + self-closing tags never open)
var VOID = { area: 1, base: 1, br: 1, col: 1, embed: 1, hr: 1, img: 1, input: 1, link: 1, meta: 1, source: 1, track: 1, wbr: 1 };
function nestedGlass(html) {
  var stack = [], bad = [], re = /<(\/?)([a-zA-Z][\w-]*)([^>]*)>/g, m;
  while ((m = re.exec(html)) !== null) {
    var tag = m[2].toLowerCase();
    if (m[1]) { for (var i = stack.length - 1; i >= 0; i--) { if (stack[i].tag === tag) { stack.length = i; break; } } continue; }
    if (VOID[tag] || /\/\s*$/.test(m[3])) continue;
    var cls = attrOf(m[0], "class") || "", glass = /(^|\s)gc-card(\s|$)/.test(cls);
    if (glass && stack.some(function (s) { return s.glass; })) bad.push(cls);
    stack.push({ tag: tag, glass: glass });
  }
  return bad;
}
function oneToneEach(html) { return glassCards(html).filter(function (g) { return g.tones.length !== 1; }).map(function (g) { return g.cls; }); }
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function lumHex(h) {
  var m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(h); if (!m) return null;
  function lin(v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  return 0.2126 * lin(parseInt(m[1], 16)) + 0.7152 * lin(parseInt(m[2], 16)) + 0.0722 * lin(parseInt(m[3], 16));
}

// ------------------------------------------------------------------ boot the real page in a vm
var SRC = read("thesis-page.js");
var EXPORT = "window.ThesisPage = { render: render };";
var INTERNALS = ["headerSection", "stickyBar", "heroSection", "thesisSection", "fallingSection", "decisionSection", "fundamentalsSection",
  "historySection", "revenueSection", "executionSection", "competitiveSection", "capitalSection", "changedSection", "explainSection",
  "methodSection", "valuationContextSection", "forwardSection", "intelligenceSection", "liteSection", "emptyState", "onRootClick", "render"];
t("thesis-page.js keeps its export line (this test hooks the internals there)", SRC.indexOf(EXPORT) >= 0);
var HOOKED = SRC.replace(EXPORT, "window.ThesisPage = { render: render, _t: { " + INTERNALS.map(function (n) { return n + ": " + n; }).join(", ") + " } };");

function mkEl(id) {
  return { id: id, innerHTML: "", value: "", style: {}, attrs: {},
    appendChild: function () {}, setAttribute: function (k, v) { this.attrs[k] = v; }, getAttribute: function (k) { return this.attrs[k] || null; },
    addEventListener: function () {}, querySelector: function () { return null; }, querySelectorAll: function () { return []; },
    closest: function () { return null; }, focus: function () {}, classList: { add: function () {}, remove: function () {}, contains: function () { return false; } } };
}
function boot(search, snapshot, preStore) {
  var els = {}, store = preStore ? clone(preStore) : {};
  var doc = { readyState: "complete", createElement: mkEl, addEventListener: function () {},
    getElementById: function (id) { if (!els[id]) els[id] = mkEl(id); return els[id]; },
    querySelector: function () { return mkEl(); }, querySelectorAll: function () { return []; }, body: mkEl("body"), documentElement: mkEl("html") };
  var win = { document: doc, location: { search: search, pathname: "/thesis" }, history: { pushState: function () {}, replaceState: function () {} },
    localStorage: { getItem: function (k) { return k in store ? store[k] : null; }, setItem: function (k, v) { store[k] = String(v); }, removeItem: function (k) { delete store[k]; } },
    addEventListener: function () {}, dispatchEvent: function () {}, console: console, Math: Math, JSON: JSON, Date: Date, Number: Number, String: String,
    Object: Object, Array: Array, Boolean: Boolean, isFinite: isFinite, isNaN: isNaN, parseInt: parseInt, parseFloat: parseFloat, Promise: Promise,
    RegExp: RegExp, Error: Error, encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent, setTimeout: setTimeout, clearTimeout: clearTimeout, Intl: Intl };
  win.window = win; win.self = win; win.globalThis = win;
  win.PortfolioDataSnapshot = { read: function () { return snapshot || {}; } };
  var ctx = vm.createContext(win);
  ["scoring.js", "thesis-data.js", "thesis-engine.js", "valuation-engine.js", "intelligence-engine.js", "thesis-overview.js", "thesis-compare.js"]
    .forEach(function (f) { vm.runInContext(read(f), ctx, { filename: f }); });
  vm.runInContext(HOOKED, ctx, { filename: "thesis-page.js" });
  return { win: win, P: win.ThesisPage._t, html: function () { return els.thRoot ? els.thRoot.innerHTML : ""; }, store: store };
}
function closestTarget(attr, val) {
  return { id: "", closest: function (sel) { return sel === "[" + attr + "]" ? { getAttribute: function (k) { return k === attr ? val : null; } } : null; } };
}

var B = boot("?ticker=GOOG", {});
var P = B.P, W = B.win;
var TE0 = W.ThesisEngine, VE0 = W.ValuationEngine, IE0 = W.IntelligenceEngine;
var R0 = clone(TE0.compute("GOOG", {}, {}));
t("boot: the real page rendered GOOG in the vm", R0.available === true && B.html().indexOf('th-sec-n">16<') >= 0);

// ================================================================== 1. full detail renders: structure on every KB ticker
console.log("== 1. full detail page (every KB ticker): one tone per card · no glass inside glass · headings on the page ==");
{
  var tickers = Object.keys(W.ThesisData.companies);
  var multi = [], nested = [], noBody = [], headOff = [], badCls = [], fullHtml = {}, few = [];
  tickers.forEach(function (tk) {
    var b = boot("?ticker=" + encodeURIComponent(tk), {});
    var h = b.html(); fullHtml[tk] = h;
    if (glassCards(h).length < 12) few.push(tk + " " + glassCards(h).length);
    oneToneEach(h).forEach(function (c) { multi.push(tk + ": " + c); });
    nestedGlass(h).forEach(function (c) { nested.push(tk + ": " + c); });
    (h.match(/<section class="th-sec">[\s\S]*?<\/section>/g) || []).forEach(function (s) {
      if (s.indexOf('<div class="th-sec-head gc-section-h">') < 0) headOff.push(tk);
      if (!glassCards(s).length) noBody.push(tk + " " + ((/th-sec-n">([^<]*)</.exec(s) || [])[1]));
    });
    if (/class="[^"]*\b(undefined|null|NaN)\b/.test(h) || /gc-(undefined|null)/.test(h)) badCls.push(tk);
  });
  t("every detail page is on glass (≥ 12 glass cards each)", few.length === 0, few.slice(0, 6));
  t("every card has exactly one tone (" + tickers.length + " tickers)", multi.length === 0, multi.slice(0, 5));
  t("no glass card inside a glass card", nested.length === 0, nested.slice(0, 5));
  t("every numbered section: heading on the page (th-sec-head gc-section-h)", headOff.length === 0, headOff.slice(0, 5));
  t("every numbered section has its content on glass", noBody.length === 0, noBody.slice(0, 8));
  t("no undefined / null / NaN in any class list", badCls.length === 0, badCls);
  var g = fullHtml.GOOG;
  t("the hero, the sticky bar and the data-age badge are glass", !!toneOf(g, "th-hero") && !!toneOf(g, "th-sticky gc-strip") && !!toneOf(g, "th-stale gc-strip"));
  t("the header data note is a neutral strip", toneOf(g, "th-datanote gc-strip") === "gc-neutral");
  t("the page loading placeholder lives in thesis.html (covered in § 9)", true);
  // sections without a status of their own stay neutral whatever the data
  var NEUTRAL = ["5", "7", "8", "10", "11", "12", "13"], off = [];
  tickers.forEach(function (tk) {
    (fullHtml[tk].match(/<section class="th-sec">[\s\S]*?<\/section>/g) || []).forEach(function (s) {
      var n = (/th-sec-n">([^<]*)</.exec(s) || [])[1];
      if (NEUTRAL.indexOf(n) >= 0) glassCards(s).forEach(function (c) { if (c.tones[0] !== "gc-neutral") off.push(tk + " §" + n + " " + c.cls); });
    });
  });
  t("§5 §7 §8 §10 §11 §12 §13 (no status of their own) are gc-neutral on every ticker", off.length === 0, off.slice(0, 5));
  // gc-num on the big figures
  t("§2 thesis score is gc-num (Inter 700 tabular) — no inline colour on it", /<div class="th-score-big"><b class="gc-num">\d+<\/b>/.test(g) && !/th-score-big"><b style=/.test(g));
  t("tables sit in a gc-table-wrap that keyboards reach (tabindex 0 · role region · aria-label)",
    (g.match(/class="th-table-wrap gc-table-wrap" tabindex="0" role="region" aria-label="[^"]+"/g) || []).length >= 3 &&
    (g.match(/class="th-table-wrap"/g) || []).length === 0);
  t("tables are gc-table", (g.match(/<table class="th-table[^"]*\bgc-table\b/g) || []).length >= 3 && !/<table class="th-table(?![^"]*gc-table)[^"]*"/.test(g));
}

// ================================================================== 2. answer: hero + sticky bar
console.log("== 2. answer (YES / WAIT / NO) → hero + sticky bar ==");
{
  var ANSWER = { YES: "gc-calm", WAIT: "gc-warning", NO: "gc-danger" };
  Object.keys(ANSWER).forEach(function (a) {
    var R = clone(R0); R.finalVerdict.answer = a;
    t("hero " + a + " → " + ANSWER[a], toneOf(P.heroSection(R), "th-hero") === ANSWER[a], toneOf(P.heroSection(R), "th-hero"));
    t("sticky bar " + a + " → " + ANSWER[a], toneOf(P.stickyBar(R), "th-sticky gc-strip") === ANSWER[a], toneOf(P.stickyBar(R), "th-sticky"));
    t("hero " + a + " keeps th-hero-" + a.toLowerCase() + " + th-answer-" + a.toLowerCase(), P.heroSection(R).indexOf("th-hero-" + a.toLowerCase()) >= 0 && P.heroSection(R).indexOf("th-answer th-answer-" + a.toLowerCase()) >= 0);
  });
  var Rl = clone(R0); delete Rl.finalVerdict; Rl.lite = true;
  t("sticky bar on a Lite ticker (no answer) → gc-neutral", toneOf(P.stickyBar(Rl), "th-sticky") === "gc-neutral", toneOf(P.stickyBar(Rl), "th-sticky"));
  var hh = P.heroSection(clone(R0));
  t("hero: the 5 factor cells keep their exact markup (thesis-val-consistency reads it)", /<div class="th-fcell"><span>Valuation<\/span><b>/.test(hh));
  t("hero: no glass inside the hero", glassCards(hh).length === 1 && nestedGlass(hh).length === 0);
}

// ================================================================== 3. §2 thesis status (brief: Very Strong/Strong calm · Neutral normal · Weak warning · Broken danger)
console.log("== 3. §2 thesis status → tone ==");
{
  var ST = [
    [{ key: "very-strong", label: "Very Strong", thai: "แข็งแกร่งมาก", tone: "bull" }, "gc-calm"],
    [{ key: "strong", label: "Strong", thai: "แข็งแกร่ง", tone: "bull" }, "gc-calm"],
    [{ key: "neutral", label: "Neutral", thai: "กลาง ๆ", tone: "watch" }, "gc-normal"],
    [{ key: "weak", label: "Weak", thai: "อ่อนแรง", tone: "bear" }, "gc-warning"],
    [{ key: "broken", label: "Broken", thai: "thesis เสีย", tone: "bear" }, "gc-danger"]];
  ST.forEach(function (p) {
    var R = clone(R0); R.thesis.status = p[0];
    var h = P.thesisSection(R);
    t("§2 " + p[0].label + " → " + p[1], toneOf(h, "th-sec-body") === p[1], toneOf(h, "th-sec-body"));
    t("§2 " + p[0].label + ": the status chip keeps its tone as a class (no inline colour on the glass)",
      h.indexOf('<span class="th-chip th-tone-' + p[0].tone + '">' + p[0].label) >= 0 && !/<span class="th-chip" style=/.test(h));
  });
  var Rn = clone(R0); Rn.thesis.status = null;
  t("§2 no status → gc-neutral", toneOf(P.thesisSection(Rn), "th-sec-body") === "gc-neutral", toneOf(P.thesisSection(Rn), "th-sec-body"));
  t("§2 keeps the section number markup (intelligence-test reads th-sec-n\">2<)", P.thesisSection(clone(R0)).indexOf('<span class="th-sec-n">2</span>') >= 0);
}

// ================================================================== 4. §3 dip class · §4 decision · §9 competitive (engine tone words: bull calm · blue normal · watch warning · bear danger)
//   §3 exception (🟡 rule, site-wide): dip types macro / rotation → gc-normal by key — the colour of the 🟡 Macro Pullback card on
//   /accumulation-center (accumulation-page.js GC_DIP_TONE), which links here. Every other engine "watch" on /thesis stays gc-warning.
console.log("== 4. §3 dip class · §4 decision · §9 competitive ==");
{
  function fallingR(key, tone) {
    var R = clone(R0); R.falling = { hasData: true, drawdownPct: -12.5, primary: { key: "market", label: "ตลาด", detail: "x" }, secondary: null, causes: [{ key: "market", label: "ตลาด", magnitude: 70, detail: "y" }] };
    R.dipClass = { key: key, label: key, thai: "t", tone: tone, why: "w" };
    return R;
  }
  var DIP = [["healthy", "bull", "gc-calm"], ["rotation", "watch", "gc-normal"], ["macro", "watch", "gc-normal"], ["fundamental", "bear", "gc-danger"], ["broken", "bear", "gc-danger"]];
  DIP.forEach(function (d) {
    var h = P.fallingSection(fallingR(d[0], d[1]));
    t("§3 dip " + d[0] + " → " + d[2], toneOf(h, "th-dipbanner gc-strip") === d[2], toneOf(h, "th-dipbanner"));
    t("§3 dip " + d[0] + ": the evidence card is gc-neutral", toneOf(h, "th-sec-body") === "gc-neutral", toneOf(h, "th-sec-body"));
    t("§3 dip " + d[0] + ": the strip keeps its th-tone-" + d[1] + " class", h.indexOf('<div class="th-dipbanner th-tone-' + d[1] + " gc-card gc-strip " + d[2] + '">') >= 0);
  });
  // cross-page: /accumulation-center paints its 🟡 Macro Pullback card (engine dip macro / rotation + accumulate) with GC_DIP_TONE.macro
  var accM = /\n  var GC_DIP_TONE = (\{[^}]*\});/.exec(read("accumulation-page.js").replace(/\r\n/g, "\n"));
  var GDT = accM ? vm.runInNewContext("(" + accM[1] + ")") : null;
  var tMacro = toneOf(P.fallingSection(fallingR("macro", "watch")), "th-dipbanner gc-strip"), tRot = toneOf(P.fallingSection(fallingR("rotation", "watch")), "th-dipbanner gc-strip");
  t("§3 macro / rotation = /accumulation-center 🟡 Macro Pullback card (GC_DIP_TONE.macro read from accumulation-page.js)",
    !!GDT && GDT.macro === "gc-normal" && tMacro === GDT.macro && tRot === GDT.macro, [GDT && GDT.macro, tMacro, tRot]);
  // a WAIT answer next to a macro dip: only the dip strip is normal — hero, sticky bar and §4 Wait stay gc-warning
  var Rw = fallingR("macro", "watch"); Rw.finalVerdict.answer = "WAIT"; Rw.decision = { key: "wait", label: "Wait", thai: "รอ — เกตหลักยังปิด", tone: "watch", why: ["a"] };
  t("WAIT answer + macro dip: §3 strip gc-normal · hero / sticky WAIT and §4 Wait stay gc-warning",
    toneOf(P.fallingSection(Rw), "th-dipbanner gc-strip") === "gc-normal" && toneOf(P.heroSection(Rw), "th-hero") === "gc-warning" &&
    toneOf(P.stickyBar(Rw), "th-sticky gc-strip") === "gc-warning" && toneOf(P.decisionSection(Rw), "th-sec-body") === "gc-warning",
    [toneOf(P.fallingSection(Rw), "th-dipbanner"), toneOf(P.heroSection(Rw), "th-hero"), toneOf(P.stickyBar(Rw), "th-sticky"), toneOf(P.decisionSection(Rw), "th-sec-body")]);
  var Rnd = clone(R0); Rnd.falling = { hasData: false }; Rnd.dipClass = { key: null, label: "No Data", thai: "ยังไม่มีข้อมูลราคา", tone: "watch", why: "" };
  var hnd = P.fallingSection(Rnd);
  t("§3 no price data (dip key null, engine tone watch) → banner gc-neutral, evidence gc-neutral",
    toneOf(hnd, "th-dipbanner th-dipbanner-none gc-strip") === "gc-neutral" && toneOf(hnd, "th-sec-body") === "gc-neutral", [toneOf(hnd, "th-dipbanner"), toneOf(hnd, "th-sec-body")]);
  var DEC = [["strong-accumulate", "bull", "gc-calm"], ["accumulate", "bull", "gc-calm"], ["wait", "watch", "gc-warning"], ["reduce-tactical", "bear", "gc-danger"], ["review-thesis", "bear", "gc-danger"]];
  DEC.forEach(function (d) {
    var R = clone(R0); R.decision = { key: d[0], label: d[0], thai: "t", tone: d[1], why: ["a"] };
    var h = P.decisionSection(R);
    t("§4 decision " + d[0] + " → " + d[2], toneOf(h, "th-sec-body") === d[2], toneOf(h, "th-sec-body"));
  });
  var Rdx = clone(R0); Rdx.decision = { key: "x", label: "x", thai: "", tone: undefined, why: [] };
  t("§4 decision without a tone → gc-neutral", toneOf(P.decisionSection(Rdx), "th-sec-body") === "gc-neutral");
  var COMP = [["strengthening", "gc-calm"], ["stable", "gc-normal"], ["weakening", "gc-danger"]];
  COMP.forEach(function (c) {
    var R = clone(R0); R.competitive.overall = c[0];
    t("§9 competitive overall " + c[0] + " → " + c[1], toneOf(P.competitiveSection(R), "th-sec-body") === c[1], toneOf(P.competitiveSection(R), "th-sec-body"));
  });
  var Rcx = clone(R0); delete Rcx.competitive.overall;
  t("§9 no overall → gc-neutral", toneOf(P.competitiveSection(Rcx), "th-sec-body") === "gc-neutral", toneOf(P.competitiveSection(Rcx), "th-sec-body"));
}

// ================================================================== 5. header data-age badge
console.log("== 5. header data-age badge (ป้ายอายุข้อมูล) ==");
{
  var ES = [["current", "th-stale-ok", "gc-calm"], ["due-soon", "th-stale-soon", "gc-warning"], ["stale", "th-stale-warn", "gc-danger"], ["overdue", "th-stale-warn", "gc-danger"]];
  ES.forEach(function (e) {
    var R = clone(R0); R.earnings = { state: e[0], hasDate: true, nextEarnings: "2026-12-15", daysToEarnings: e[0] === "overdue" ? -9 : 12, estimated: false }; R.staleMonths = 4;
    var h = P.headerSection(R);
    t("header badge " + e[0] + " → " + e[1] + " " + e[2], toneOf(h, "th-stale " + e[1] + " gc-strip") === e[2], toneOf(h, "th-stale"));
    t("header badge " + e[0] + ": header itself stays on the page (no glass header)", h.indexOf('<header class="th-head">') === 0);
  });
}

// ================================================================== 6. §6 Business Growth vs Price
console.log("== 6. §6 verdict · Fundamental Alignment · Growth Quality ==");
{
  function withHistory(mut, fn) {
    W.ThesisEngine = Object.assign({}, TE0, { computeHistory: function (tk, s, o) { var H = TE0.computeHistory(tk, s, o); if (H && H.available) mut(H); return H; } });
    try { return fn(); } finally { W.ThesisEngine = TE0; }
  }
  var VER = [["business-ahead", "bull", "gc-calm"], ["aligned", "bull", "gc-calm"], ["slightly-ahead", "watch", "gc-warning"], ["significantly-ahead", "bear", "gc-danger"],
    ["deteriorating", "bear", "gc-danger"], ["insufficient", "watch", "gc-neutral"]];
  VER.forEach(function (v) {
    var h = withHistory(function (H) { H.verdict.key = v[0]; H.verdict.tone = v[1]; }, function () { return P.historySection(clone(R0)); });
    t("§6 verdict " + v[0] + " → " + v[2], toneOf(h, "th-bp-verdict") === v[2], toneOf(h, "th-bp-verdict"));
  });
  [[72, "gc-calm"], [55, "gc-warning"], [41, "gc-danger"]].forEach(function (a) {
    var h = withHistory(function (H) { H.alignment.score = a[0]; }, function () { return P.historySection(clone(R0)); });
    var cards = glassCards(h).filter(function (c) { return /(^|\s)th-bp-card(\s|$)/.test(c.cls); });
    t("§6 Fundamental Alignment " + a[0] + " → " + a[1] + " (the chip's band)", cards.length === 2 && cards[0].tones[0] === a[1], cards.map(function (c) { return c.tones[0]; }));
  });
  [["strengthening", "bull", "gc-calm"], ["stable", "watch", "gc-warning"], ["weakening", "bear", "gc-danger"]].forEach(function (q) {
    var h = withHistory(function (H) { H.quality.label = { key: q[0], label: q[0], thai: "t", tone: q[1] }; }, function () { return P.historySection(clone(R0)); });
    var cards = glassCards(h).filter(function (c) { return /(^|\s)th-bp-card(\s|$)/.test(c.cls); });
    t("§6 Growth Quality " + q[0] + " → " + q[2], cards.length === 2 && cards[1].tones[0] === q[2], cards.map(function (c) { return c.tones[0]; }));
  });
  var hNo = withHistory(function (H) { H.alignment.label = null; H.quality.label = null; }, function () { return P.historySection(clone(R0)); });
  var noLab = glassCards(hNo).filter(function (c) { return /(^|\s)th-bp-card(\s|$)/.test(c.cls); });
  t("§6 score cards without a label → gc-neutral", noLab.length === 2 && noLab.every(function (c) { return c.tones[0] === "gc-neutral"; }), noLab.map(function (c) { return c.cls; }));
  var h6 = P.historySection(clone(R0));
  t("§6 charts + table card, attribution and the why/disclosure card are gc-neutral",
    toneOf(h6, "th-bp-main") === "gc-neutral" && toneOf(h6, "th-bp-attr") === "gc-neutral" && toneOf(h6, "th-bp-foot") === "gc-neutral", [toneOf(h6, "th-bp-main"), toneOf(h6, "th-bp-attr"), toneOf(h6, "th-bp-foot")]);
  t("§6 the charts and the table are on the main card (one card, no nesting)", nestedGlass(h6).length === 0 && h6.indexOf("th-bp-main") >= 0 && h6.indexOf("th-bp-charts") > h6.indexOf("th-bp-main") && h6.indexOf("th-bp-table") < h6.indexOf("th-bp-cards"));
  t("§6 view buttons: the on button is gc-btn, the others gc-btn gc-btn-ghost (data hooks kept)",
    /class="th-yrbtn th-yrbtn-on gc-btn" data-th-hmode="year"/.test(h6) && /class="th-yrbtn gc-btn gc-btn-ghost" data-th-hmode="quarter"/.test(h6) && /data-th-hyears="\d"/.test(h6));
  var hUn = withHistory(function () {}, function () { W.ThesisEngine = Object.assign({}, TE0, { computeHistory: function () { return { available: false, thai: "ไม่มี" }; } }); return P.historySection(clone(R0)); });
  t("§6 no history → one gc-neutral card", glassCards(hUn).length === 1 && glassCards(hUn)[0].tones[0] === "gc-neutral");
}

// ================================================================== 7. §11 what changed (direction drives the row marker, not the card)
console.log("== 7. §11 what changed ==");
{
  var R = clone(R0);
  R.whatChanged = [{ metric: "a", prev: "1", now: "2", direction: "positive" }, { metric: "b", prev: "1", now: "0", direction: "negative" },
    { metric: "c", prev: "1", now: "1", direction: "neutral" }, { metric: "d", prev: "1", now: "2", direction: "up" }, { metric: "e", prev: "2", now: "1", direction: "down" }];
  var h = P.changedSection(R);
  var rows = (h.match(/th-chg-row th-chg-(up|down|flat)/g) || []).map(function (x) { return x.replace("th-chg-row th-chg-", ""); });
  t("§11 KB words positive / negative / neutral (and up / down) → row up / down / flat", rows.join(",") === "up,down,flat,up,down", rows.join(","));
  t("§11 the row arrow follows the same direction (▲ ▼ ▬)", (h.match(/th-trend-(up|down|flat)/g) || []).join(",") === "th-trend-up,th-trend-down,th-trend-flat,th-trend-up,th-trend-down");
  t("§11 the card itself stays gc-neutral", toneOf(h, "th-sec-body") === "gc-neutral");
}

// ================================================================== 8. §14 valuation · §15 forward · §16 intelligence
console.log("== 8. §14 valuation ==");
{
  function withVE(mut, fn) {
    W.ValuationEngine = Object.assign({}, VE0, { compute: function (tk, s, o) { var V = VE0.compute(tk, s, o); if (V && V.available) mut(V); return V; } });
    try { return fn(); } finally { W.ValuationEngine = VE0; }
  }
  var CLS = [["ATTRACTIVE", "gc-calm"], ["FAIR", "gc-normal"], ["PREMIUM", "gc-warning"], ["EXPENSIVE", "gc-danger"], ["INSUFFICIENT_DATA", "gc-neutral"]];
  CLS.forEach(function (c) {
    var h = withVE(function (V) { V.classification = c[0]; V.warnings = []; }, function () { return P.valuationContextSection(clone(R0)); });
    t("§14 " + c[0] + " → " + c[1], toneOf(h, "th-sec-body") === c[1], toneOf(h, "th-sec-body"));
    t("§14 " + c[0] + ": the P/E card keeps the markup thesis-val-consistency reads", /<small>P\/E \(trailing TTM\)<\/small><b>~[0-9.]+<\/b>/.test(h));
  });
  var hSt = withVE(function (V) { V.warnings = ["STALE_PRICE", "STALE_FUNDAMENTAL"]; }, function () { return P.valuationContextSection(clone(R0)); });
  var strips = glassCards(hSt).filter(function (c) { return /th-stale-warn/.test(c.cls); });
  t("§14 STALE PRICE / STALE FUNDAMENTAL banners → their own gc-danger strips above the card", strips.length === 2 && strips.every(function (c) { return c.tones[0] === "gc-danger" && /gc-strip/.test(c.cls); }), strips.map(function (c) { return c.cls; }));
  var hNa = withVE(function (V) { V.pe.current = null; V.warnings = ["NON_POSITIVE_TTM_EPS"]; }, function () { return P.valuationContextSection(clone(R0)); });
  t("§14 P/E N/A → one gc-neutral card", toneOf(hNa, "th-sec-body") === "gc-neutral" && hNa.indexOf("N/A — ข้อมูลไม่พอคำนวณ P/E") >= 0);
  t("§14 no glass inside the valuation card", glassCards(hSt).length >= 3 && nestedGlass(hSt).length === 0);
}
console.log("== 8b. §15 forward view: data-age badges ==");
{
  var TK = "GOOG", orig = W.ThesisData.companies[TK];
  function ym(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2); }
  function ymd(d) { return ym(d) + "-" + ("0" + d.getDate()).slice(-2); }
  var now = new Date(), past = new Date(now.getTime() - 40 * 86400000), soon = new Date(now.getTime() + 5 * 86400000), far = new Date(now.getTime() + 60 * 86400000);
  function fw(asOf, ne) { var c = clone(orig); c.forwardView.asOf = asOf; c.nextEarnings = ne; W.ThesisData.companies[TK] = c; try { return P.forwardSection(clone(R0)); } finally { W.ThesisData.companies[TK] = orig; } }
  var hOk = fw(ym(now), ymd(far));
  t("§15 fresh forwardView + far earnings → both badges th-stale-ok gc-calm",
    glassCards(hOk).filter(function (c) { return /th-stale-ok/.test(c.cls); }).length === 2 && glassCards(hOk).filter(function (c) { return /th-stale/.test(c.cls); }).every(function (c) { return c.tones[0] === "gc-calm"; }));
  var hSoon = fw(ym(now), ymd(soon));
  t("§15 earnings in 5 days → th-stale-soon gc-warning", toneOf(hSoon, "th-stale th-stale-soon gc-strip") === "gc-warning", toneOf(hSoon, "th-stale-soon"));
  void past;
  var hOld = fw("2025-01", ymd(far));
  t("§15 forwardView older than 3 months → th-stale-warn gc-danger", toneOf(hOld, "th-stale th-stale-warn gc-strip") === "gc-danger", toneOf(hOld, "th-stale-warn"));
  var hPass = fw("2025-01", "2025-02-10");
  t("§15 earnings already out after the stamp → th-stale-warn gc-danger (both badges)", glassCards(hPass).filter(function (c) { return /th-stale-warn/.test(c.cls) && c.tones[0] === "gc-danger"; }).length === 2);
  t("§15 badges sit in the badge row, the content card is gc-neutral", hOk.indexOf('<div class="th-fw-badges">') >= 0 && toneOf(hOk, "th-sec-body") === "gc-neutral" && nestedGlass(hOk).length === 0);
}
console.log("== 8c. §16 investment intelligence ==");
{
  var IE = IE0;
  function withIE(mut, fn) {
    W.IntelligenceEngine = Object.assign({}, IE0, { compute: function (tk, s, o) { var X = IE0.compute(tk, s, o); if (X && X.available) mut(X); return X; } });
    try { return fn(); } finally { W.IntelligenceEngine = IE0; }
  }
  var ICON = { "🟢": "gc-calm", "🟡": "gc-normal", "🟠": "gc-warning", "🔴": "gc-danger", "⚪": "gc-neutral" };
  function tileTone(h, label) {
    var c = new RegExp('<div class="([^"]*)"><small>' + label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "</small>").exec(h);
    if (!c) return null; var tones = c[1].split(/\s+/).filter(function (k) { return TONES.indexOf(k) >= 0; });
    return /gc-card/.test(c[1]) && /gc-tile/.test(c[1]) && tones.length === 1 ? tones[0] : "bad:" + c[1];
  }
  Object.keys(IE.INTERP).forEach(function (k) {
    var h = withIE(function (X) { X.summary.state = IE.INTERP[k]; }, function () { return P.intelligenceSection(clone(R0)); });
    var want = ICON[IE.INTERP[k].icon];
    t("§16 hero (summary) " + k + " " + IE.INTERP[k].icon + " → " + want, toneOf(h, "th-ii-hero") === want, toneOf(h, "th-ii-hero"));
  });
  var FIELDS = [["Thesis Health", "HEALTH", function (X, s) { X.health.state = s; }], ["Expectations", "EXPECT", function (X, s) { X.expectations.state = s; }],
    ["AI Monetization", "MONET", function (X, s) { X.aiMonetization.state = s; }], ["Growth vs Valuation", "QUAD", function (X, s) { X.matrixPoint.quadrant = s; }],
    ["Business vs Price", "DIVERGE", function (X, s) { X.divergence.state = s; }], ["Investment Readiness", "READINESS", function (X, s) { X.readiness.state = s; }]];
  FIELDS.forEach(function (f) {
    var bad = [];
    Object.keys(IE[f[1]]).forEach(function (k) {
      var st = IE[f[1]][k], h = withIE(function (X) { f[2](X, st); }, function () { return P.intelligenceSection(clone(R0)); });
      var want = ICON[st.icon] || "gc-neutral", got = tileTone(h, f[0]);
      if (got !== want) bad.push(k + " " + got + " (want " + want + ")");
    });
    t("§16 tile \"" + f[0] + "\": every " + f[1] + " state → the tone of its own icon 🟢 calm · 🟡 normal · 🟠 warning · 🔴 danger · ⚪ neutral", bad.length === 0, bad);
  });
  var h16 = P.intelligenceSection(clone(R0));
  t("§16 tiles without a status (Drawdown · Value Chain) → gc-neutral", tileTone(h16, "Drawdown") === "gc-neutral" && tileTone(h16, "Value Chain") === "gc-neutral", [tileTone(h16, "Drawdown"), tileTone(h16, "Value Chain")]);
  t("§16 the 8 evidence tiles are glass tiles in the th-ii-cards grid", (h16.match(/<div class="th-vx-card gc-card gc-tile gc-[a-z]+"><small>/g) || []).length === 8 && h16.indexOf('<div class="th-vx-cards th-ii-cards">') >= 0);
  function drawerTone(h, emoji) { var m = new RegExp('<details class="([^"]*)"[^>]*><summary>' + emoji).exec(h); if (!m) return null; var tn = m[1].split(/\s+/).filter(function (k) { return TONES.indexOf(k) >= 0; }); return /gc-card/.test(m[1]) && tn.length === 1 ? tn[0] : "bad:" + m[1]; }
  Object.keys(IE.DIVERGE).forEach(function (k) {
    var h = withIE(function (X) { X.divergence.state = IE.DIVERGE[k]; }, function () { return P.intelligenceSection(clone(R0)); });
    t("§16 drawer ⚖️ Business vs Price " + k + " → " + ICON[IE.DIVERGE[k].icon], drawerTone(h, "⚖️") === ICON[IE.DIVERGE[k].icon], drawerTone(h, "⚖️"));
  });
  Object.keys(IE.READINESS).forEach(function (k) {
    var h = withIE(function (X) { X.readiness.state = IE.READINESS[k]; }, function () { return P.intelligenceSection(clone(R0)); });
    t("§16 drawer 🚦 Investment Readiness " + k + " → " + ICON[IE.READINESS[k].icon], drawerTone(h, "🚦") === ICON[IE.READINESS[k].icon], drawerTone(h, "🚦"));
  });
  ["IMPROVING", "STABLE", "MIXED", "DETERIORATING"].forEach(function (k) {
    var h = withIE(function (X) { X.change = { firstObservation: false, state: IE.CHANGE[k], deltas: [], why: [], note: "n", currentAsOf: "2026-11-20", previousAsOf: "2026-10-20" }; }, function () { return P.intelligenceSection(clone(R0)); });
    t("§16 drawer 🕓 Thesis Change " + k + " → " + ICON[IE.CHANGE[k].icon], drawerTone(h, "🕓") === ICON[IE.CHANGE[k].icon], drawerTone(h, "🕓"));
  });
  var hFirst = withIE(function (X) { X.change = { firstObservation: true, state: IE.CHANGE.INSUFFICIENT, deltas: [], why: [], note: "First observation" }; }, function () { return P.intelligenceSection(clone(R0)); });
  t("§16 drawer 🕓 first observation → gc-neutral", drawerTone(hFirst, "🕓") === "gc-neutral", drawerTone(hFirst, "🕓"));
  ["🩺", "📈", "🤖", "📉", "🧭", "⛓️"].forEach(function (e) { t("§16 drawer " + e + " (evidence, no state in its summary) → gc-neutral", drawerTone(h16, e) === "gc-neutral", drawerTone(h16, e)); });
  t("§16 data quality strip → gc-neutral", toneOf(h16, "th-vx-qual") === "gc-neutral");
  t("§16 no glass inside glass (inner hero blocks of the drawers are wells)", glassCards(h16).length >= 18 && nestedGlass(h16).length === 0, nestedGlass(h16));
  t("§16 still renders the pieces intelligence-test reads (th-ii-hero · th-sec-n 16 · matrix)", h16.indexOf("th-ii-hero") >= 0 && h16.indexOf('th-sec-n">16<') >= 0 && h16.indexOf("th-ii-matrix") >= 0);
}

// ================================================================== 9. lite · empty · re-render paths
console.log("== 9. Lite view · empty states · re-render paths ==");
{
  var closes = []; for (var i = 0; i < 260; i++) closes.push(100 + i * 0.2 - (i > 230 ? (i - 230) * 1.2 : 0));
  var snapLite = { historicalData: { AAPL: { closes: closes }, "^GSPC": { closes: closes }, "^IXIC": { closes: closes } } };
  var bl = boot("?ticker=AAPL", snapLite), hl = bl.html();
  t("Lite: rendered (th-lite-grid)", hl.indexOf("th-lite-grid") >= 0, hl.slice(0, 120));
  t("Lite: banner · 5 tiles · causes · CTA are all gc-neutral glass",
    toneOf(hl, "th-lite-banner gc-strip") === "gc-neutral" && (hl.match(/<div class="th-lite-card gc-card gc-tile gc-neutral">/g) || []).length === 5 && toneOf(hl, "th-lite-cta gc-strip") === "gc-neutral",
    [toneOf(hl, "th-lite-banner"), toneOf(hl, "th-lite-cta")]);
  t("Lite: sticky bar neutral, no nesting", toneOf(hl, "th-sticky") === "gc-neutral" && nestedGlass(hl).length === 0);
  var he = P.emptyState({ thai: "ไม่มีข้อมูล" });
  t("empty state → mc-empty gc-card gc-neutral", he.indexOf('<div class="mc-empty gc-card gc-neutral">') === 0);
  W.ThesisEngine = null; P.render(); var hn = B.html(); W.ThesisEngine = TE0;
  t("engine missing → mc-empty gc-card gc-neutral", hn.indexOf('<div class="mc-empty gc-card gc-neutral"><strong>Thesis Engine ไม่พร้อม') >= 0);
  // re-render through the real click handler: quarter view · year range · compare on/off
  var bq = boot("?ticker=GOOG", {});
  bq.P.onRootClick({ target: closestTarget("data-th-hmode", "quarter") });
  var hq = bq.html();
  t("re-render: quarter view (data-th-hmode click) keeps every card glass + one tone + no nesting",
    hq.indexOf('data-th-hquarters="8"') >= 0 && oneToneEach(hq).length === 0 && nestedGlass(hq).length === 0 && toneOf(hq, "th-bp-main") === "gc-neutral" && toneOf(hq, "th-hero") != null);
  t("re-render: quarter range buttons gc-btn / gc-btn-ghost", /class="th-yrbtn th-yrbtn-on gc-btn" data-th-hquarters="12"/.test(hq) && /class="th-yrbtn gc-btn gc-btn-ghost" data-th-hquarters="4"/.test(hq));
  bq.P.onRootClick({ target: closestTarget("data-th-hmode", "year") });
  bq.P.onRootClick({ target: closestTarget("data-th-hyears", "3") });
  var hy = bq.html();
  t("re-render: year range click (3 ปี) keeps glass", /class="th-yrbtn th-yrbtn-on gc-btn" data-th-hyears="3"/.test(hy) && oneToneEach(hy).length === 0 && nestedGlass(hy).length === 0);
  var bc = boot("?ticker=GOOG", {}, { thCompareSel_v1: JSON.stringify(["GOOG", "NVDA"]) });
  bc.P.onRootClick({ target: closestTarget("data-th-cmp-toggle", "1") });
  var hc = bc.html();
  t("re-render: compare toggle → compare view on glass (heads + radar + table cards) · no nesting",
    hc.indexOf("thc-wrap") >= 0 && glassCards(hc).length >= 4 && nestedGlass(hc).length === 0 && oneToneEach(hc).length === 0, glassCards(hc).length);
  var bo = boot("", {});
  var ho = bo.html();
  t("overview (/thesis) inside the page: glass, one tone each, no nesting", ho.indexOf("tho-head") >= 0 && glassCards(ho).length >= 6 && oneToneEach(ho).length === 0 && nestedGlass(ho).length === 0);
  bo.P.onRootClick({ target: closestTarget("data-tho-sort", "thesis") });
  var hos = bo.html();
  t("re-render: overview sort click keeps the glass", hos.indexOf("▲") >= 0 && glassCards(hos).length >= 6 && glassCards(hos).length === glassCards(ho).length && nestedGlass(hos).length === 0);
  var TOkeep = bo.win.ThesisOverview; bo.win.ThesisOverview = null; bo.P.render(); var hom = bo.html(); bo.win.ThesisOverview = TOkeep;
  t("overview module missing → mc-empty gc-card gc-neutral", hom.indexOf('<div class="mc-empty gc-card gc-neutral"><strong>Overview module ไม่พร้อม') >= 0, hom.slice(0, 160));
}

// ================================================================== 10. overview module (health tone on the highlight cards)
console.log("== 10. overview: highlight cards by thesis health ==");
{
  var IEr = require("../public/intelligence-engine.js"), TEr = require("../public/thesis-engine.js"), VEr = require("../public/valuation-engine.js");
  var PMr = require("../public/portfolio-manager-engine.js"), AIRr = require("../public/ai-rotation-engine.js"), Dr = require("../public/thesis-data.js");
  var TO = require("../public/thesis-overview.js");
  var FORCE = { GOOG: ["BROKEN", null], NVDA: ["DETERIORATING", null], MSFT: ["INTACT", "HIGH_QUALITY_DIP"], META: ["WATCH", null] };
  var IEs = Object.assign({}, IEr, { compute: function (tk, s, o) {
    var X = IEr.compute(tk, s, o);
    if (X && X.available && FORCE[tk]) { X.health.state = IEr.HEALTH[FORCE[tk][0]]; if (FORCE[tk][0] === "WATCH") X.health.counts.warnings = 2; if (FORCE[tk][1]) X.summary.state = IEr.INTERP[FORCE[tk][1]]; }
    return X; } });
  var deps = { data: Dr, TE: TEr, VE: VEr, PM: PMr, IE: IEs, AIR: AIRr };
  var M = TO.computeModel({}, deps), h = TO.render({}, deps);
  var GC_HEALTH = { INTACT: "gc-calm", WATCH: "gc-normal", DETERIORATING: "gc-warning", BROKEN: "gc-danger", INSUFFICIENT: "gc-neutral" };
  var cards = [], re = /<article class="([^"]*)">[\s\S]*?<b class="tho-tk" >([^<]+)<\/b>/g, m;
  while ((m = re.exec(h)) !== null) cards.push({ cls: m[1], t: m[2] });
  var byT = {}; M.rows.forEach(function (r) { byT[r.t] = r; });
  var wrong = cards.filter(function (c) { var want = GC_HEALTH[byT[c.t].health] || "gc-neutral"; return c.cls.split(/\s+/).indexOf(want) < 0 || !/gc-card/.test(c.cls); });
  var seenT = {}; cards.forEach(function (c) { seenT[(c.cls.match(/gc-(calm|normal|warning|danger|neutral)/) || [""])[0]] = 1; });
  t("highlight cards: tone = thesis health (INTACT calm · WATCH normal · DETERIORATING warning · BROKEN danger)", cards.length === 4 && wrong.length === 0, cards.map(function (c) { return c.t + " " + c.cls; }));
  t("highlight cards cover calm / normal / warning / danger in this fixture", seenT["gc-calm"] && seenT["gc-normal"] && seenT["gc-warning"] && seenT["gc-danger"], Object.keys(seenT));
  t("highlight cards keep tho-card tho-card-<prio> (+ the tho-chip markup intelligence-test counts)", cards.every(function (c) { return /^tho-card tho-card-(high|medium|low) gc-card /.test(c.cls); }) && (h.match(/tho-chip"/g) || []).length >= 12);
  t("overview header card → gc-neutral", toneOf(h, "tho-head") === "gc-neutral");
  var heads = h.match(/<div class="tho-sec-h gc-section-h"><h2>/g) || [];
  t("each overview section: heading on the page (gc-section-h) — 5 sections", heads.length === 5, heads.length);
  var bodies = glassCards(h).filter(function (c) { return /tho-body/.test(c.cls); });
  t("overview section bodies (Read Next · Top Opportunities · Strong Business · all assets) → gc-neutral", bodies.length === 4 && bodies.every(function (c) { return c.tones[0] === "gc-neutral"; }), bodies.map(function (c) { return c.cls; }));
  t("overview: no nesting, one tone each", glassCards(h).length >= 9 && nestedGlass(h).length === 0 && oneToneEach(h).length === 0);
  t("overview buttons: READ THESIS / ⇄ เทียบหุ้น are gc-btn gc-btn-ghost (hooks kept)", (h.match(/class="tho-open gc-btn gc-btn-ghost" data-th-(ticker|cmp-toggle)=/g) || []).length === 5);
  t("overview tables in a keyboard-reachable gc-table-wrap + gc-table", (h.match(/class="th-table-wrap gc-table-wrap" tabindex="0" role="region" aria-label="[^"]+"/g) || []).length === 2 &&
    (h.match(/<table class="th-table tho-table[^"]*gc-table/g) || []).length === 2);
  t("overview: section names unchanged (intelligence-test reads them)", ["Investment Thesis Overview", "Today’s Highlights", "Read Next", "Top Opportunities", "Strong Business · Wait", "หุ้นทั้งหมดที่ติดตาม"].every(function (s) { return h.indexOf(s) >= 0; }));
  var hErr = TO.render({}, { data: null });
  t("overview unavailable → mc-empty gc-card gc-neutral", hErr.indexOf('<div class="mc-empty gc-card gc-neutral">') === 0);
}

// ================================================================== 11. compare module (thesis status on each head card)
console.log("== 11. compare: head cards by thesis status ==");
{
  var TEr2 = require("../public/thesis-engine.js"), VEr2 = require("../public/valuation-engine.js"), Dr2 = require("../public/thesis-data.js");
  var TC = require("../public/thesis-compare.js");
  var STAT = { GOOG: { key: "very-strong", label: "Very Strong", thai: "แข็งแกร่งมาก", tone: "bull" }, NVDA: { key: "strong", label: "Strong", thai: "แข็งแกร่ง", tone: "bull" },
    META: { key: "neutral", label: "Neutral", thai: "กลาง ๆ", tone: "watch" }, INTC: { key: "weak", label: "Weak", thai: "อ่อนแรง", tone: "bear" }, AMD: { key: "broken", label: "Broken", thai: "thesis เสีย", tone: "bear" } };
  var TEs = Object.assign({}, TEr2, { compute: function (tk, s, o) { var R = TEr2.compute(tk, s, o); if (R && R.available && STAT[tk]) R.thesis.status = STAT[tk]; return R; } });
  var hc = TC.render(["GOOG", "NVDA", "META", "INTC", "AMD"], {}, { TE: TEs, VE: VEr2, data: Dr2 });
  var heads = [], re = /<div class="(thc-head[^"]*)"[^>]*><div class="thc-head-t"><b[^>]*>([^<]+)<\/b>/g, m;
  while ((m = re.exec(hc)) !== null) heads.push(m[2] + ":" + (m[1].match(/gc-(calm|normal|warning|danger|neutral)/) || ["?"])[0]);
  t("compare heads: Very Strong / Strong calm · Neutral normal · Weak warning · Broken danger",
    heads.join(",") === "GOOG:gc-calm,NVDA:gc-calm,META:gc-normal,INTC:gc-warning,AMD:gc-danger", heads.join(","));
  t("compare: radar card, table card and the 10-fundamentals drawer → gc-neutral",
    toneOf(hc, "thc-radarwrap") === "gc-neutral" && toneOf(hc, "thc-tablecard") === "gc-neutral" && toneOf(hc, "th-fw-src thc-funds") === "gc-neutral", [toneOf(hc, "thc-radarwrap"), toneOf(hc, "thc-tablecard"), toneOf(hc, "thc-funds")]);
  t("compare: heading on the page, no nesting, one tone each", hc.indexOf('<div class="th-sec-head gc-section-h">') >= 0 && nestedGlass(hc).length === 0 && oneToneEach(hc).length === 0);
  var inks = []; var ri = /<div class="thc-head-t"><b style="color:(#[0-9a-f]{6})">/gi; while ((m = ri.exec(hc)) !== null) inks.push(m[1]);
  t("compare: ticker names on glass use the lifted ink of their series colour (luminance ≥ 0.45)", inks.length === 5 && inks.every(function (c) { return lumHex(c) >= 0.45; }), inks.map(function (c) { return c + " " + Math.round(lumHex(c) * 100) / 100; }));
  t("compare: the series colour itself is kept (top rim of each head card + radar)", /class="thc-head[^"]*" style="border-top:3px solid #f472b6"/.test(hc) && hc.indexOf('stroke="#f472b6"') >= 0);
  t("compare: the head score is gc-num (white — the card tone carries the band)", (hc.match(/<div class="thc-head-score"><b class="gc-num">/g) || []).length === 5);
  var h1 = TC.render(["GOOG"], {}, { TE: TEs, VE: VEr2, data: Dr2 });
  t("compare with fewer than 2 → thc-empty mc-empty gc-card gc-neutral", h1.indexOf('<div class="thc-empty mc-empty gc-card gc-neutral">') === 0);
}

// ================================================================== 12. stylesheet + HTML contract
console.log("== 12. thesis.css + thesis.html ==");
{
  var CSS = read("thesis.css"), BODY = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
  function rule(sel) { var re = new RegExp("(^|\\})\\s*" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}", "m"); var m = re.exec(BODY); return m ? m[2] : null; }
  var tok = rule("#thRoot .gc-card");
  t("in-card token map: --mc-text → --gc-ink · --mc-muted → --gc-ink-2 · --mc-border → --gc-line · --mc-card → --gc-well",
    !!tok && /--mc-text:\s*var\(--gc-ink\)/.test(tok) && /--mc-muted:\s*var\(--gc-ink-2\)/.test(tok) && /--mc-border:\s*var\(--gc-line\)/.test(tok) && /--mc-card:\s*var\(--gc-well\)/.test(tok), tok);
  t("in-card status inks are lifted (luminance ≥ 0.6 for --th-bull / --th-watch / --th-bear / --th-blue)",
    !!tok && ["--th-bull", "--th-watch", "--th-bear", "--th-blue"].every(function (k) { var m = new RegExp(k + ":\\s*(#[0-9a-f]{6})", "i").exec(tok); return m && lumHex(m[1]) >= 0.6; }), tok);
  var sec = rule(".th-sec");
  t("old section card skin removed (.th-sec has no border / background / padding)", sec != null && !/border|background|padding/.test(sec), sec);
  var hero = rule(".th-hero");
  t("old hero skin removed (.th-hero has no border / background; no th-hero-yes/no/wait borders)", hero != null && !/border|background/.test(hero) && !/\.th-hero-(yes|no|wait)\s*\{/.test(BODY), hero);
  var RULES = []; (function () { var re = /([^{}]+)\{([^{}]*)\}/g, m; while ((m = re.exec(BODY)) !== null) { var pre = m[1].trim(); if (pre.charAt(0) !== "@") RULES.push({ sel: pre.split(",").map(function (s) { return s.trim().replace(/\s+/g, " "); }), body: m[2] }); } })();
  function blockFor(selTail) { return RULES.some(function (r) { return r.sel.some(function (s) { return s === selTail || s.slice(-(selTail.length + 1)) === " " + selTail; }) && /(^|;)\s*display:\s*block/.test(r.body); }); }
  var mixed = ["details.gc-card", ".th-stale.gc-card", ".th-datanote.gc-card", ".mc-empty.gc-card", ".th-vx-qual.gc-card", ".th-lite-banner.gc-card", ".th-lite-cta.gc-card"];
  t("details cards and mixed-content cards are display:block (gc-card is a flex column)", mixed.every(blockFor), mixed.filter(function (s) { return !blockFor(s); }));
  t("the sticky bar stays sticky on the glass (.th-sticky.gc-card position: sticky)", /\.th-sticky\.gc-card\s*\{[^}]*position:\s*sticky/.test(BODY));
  t("chart grid / axis strokes on the glass are white-tinted (Macro look)", /\.gc-card \.th-bp-svg line\s*\{[^}]*stroke:\s*rgba\(255,\s*255,\s*255/.test(BODY) && /\.gc-card \.th-vx-pechart line[^{]*\{[^}]*stroke:\s*rgba\(255,\s*255,\s*255/.test(BODY));
  t("focus ring of a scrolling table wrap is drawn inside the card", /\.gc-card \.gc-table-wrap:focus-visible\s*\{[^}]*outline-offset:\s*-2px/.test(BODY));
  t("no dot / LED number font", !/doto|dot-?matrix|DSEG/i.test(CSS));
  t("no text dimmed with opacity on the glass (old .th-earn-est / .th-yrsel-note / noGuidance opacities neutralised)", /\.gc-card \.th-earn-est[^{]*\{[^}]*opacity:\s*1/.test(BODY) && /\.gc-card \.th-yrsel-note[^{]*\{[^}]*opacity:\s*1/.test(BODY));

  var HTML = read("thesis.html");
  var iM = HTML.indexOf('href="/mission-control.css?v='), iG = HTML.indexOf('href="/glass-cards.css?v=20261121-gc-2"'), iT = HTML.indexOf('href="/thesis.css?v=20261122-th-33"');
  t("thesis.html: mission-control.css → glass-cards.css (gc-2) → thesis.css (th-33)", iM > 0 && iG > iM && iT > iG, [iM, iG, iT]);
  t("thesis.html: script versions bumped (th-55 · tho-8 · cmp-3)", HTML.indexOf("/thesis-page.js?v=20261122-th-55") > 0 && HTML.indexOf("/thesis-overview.js?v=20261122-tho-8") > 0 && HTML.indexOf("/thesis-compare.js?v=20261122-cmp-3") > 0);
  t("thesis.html: the loading placeholder is a neutral glass card", HTML.indexOf('<div class="mc-empty gc-card gc-neutral"><strong>กำลังโหลด Investment Thesis…</strong></div>') > 0);
}

// ================================================================== 13. privacy: the page shows no portfolio money
console.log("== 13. privacy ==");
{
  var b = boot("?ticker=NVDA", {}), h = b.html();
  var attrs = (h.match(/\s(title|aria-label)="[^"]*"/g) || []).filter(function (a) { return /฿\s?\d|\d\s?(บาท|THB)/.test(a); });
  t("no money in any title / aria-label on a detail page", attrs.length === 0, attrs.slice(0, 3));
  t("no <input> renders a value on the page (the Lite box starts empty)", !/<input[^>]*\svalue="[^"]+"/.test(h));
}

console.log("");
console.log(pass + fail + " checks · " + pass + " passed · " + fail + " failed");
process.exit(fail ? 1 : 0);
