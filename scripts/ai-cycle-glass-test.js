// AI Cycle Intelligence (/ai-cycle) on glass cards — glass-cards.css gc-2 · 2026-11-22
//   node scripts/ai-cycle-glass-test.js
//
// What must stay true:
//   · ai-cycle.html loads glass-cards.css once, after mission-control.css and before mission-control-v2.css / ai-cycle.css
//     (same order as /home), plus Inter 700; ai-cycle.css / ai-cycle-page.js pins bumped.
//   · every card's tone comes from a status the page already computes (no invented status), no status → gc-neutral:
//       hero = Confidence ring band (≥75 / ≥55 / ≥40 / lower) → calm / normal / warning / neutral
//       value-chain layer card = rotation direction (in / hot / out / stable) → calm / normal / warning / neutral
//       AI Portfolio Score = grade A / B / C / D → calm / normal / warning / danger
//       Portfolio Exposure = the engine's Alignment action tone (good / warn / risk) → calm / warning / danger
//       AI Concentration Risk = level low / medium / high → calm / warning / danger
//       Portfolio Rotation = "✅ พอร์ตสอดคล้องกับวัฏจักรแล้ว" (holdings, no rotation path) → calm
//   · no glass inside glass (the value-chain heading sits on the page; its layer cards are the glass).
//   · privacy: portfolio money is text with ฿ (privacy.js masks it) and never sits in a title / aria-label / input.
"use strict";
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var ROOT = path.join(__dirname, "..");
function read(rel) { return fs.readFileSync(path.join(ROOT, "public", rel), "utf8"); }
var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; console.log("  PASS  " + name); }
  else { fail++; console.log("  FAIL  " + name + (extra != null ? " — " + (typeof extra === "string" ? extra : JSON.stringify(extra)) : "")); }
}

// ------------------------------------------------------------------ page boot in a vm (real engine + enhance + page)
var NOW = new Date().toISOString();
function boot(snapshot) {
  var root = { id: "aiCycleRoot", innerHTML: "", addEventListener: function () {} };
  var ctx = {
    console: console,
    document: { readyState: "complete", getElementById: function (id) { return id === "aiCycleRoot" ? root : null; }, addEventListener: function () {} },
    addEventListener: function () {},
    PortfolioDataSnapshot: { read: function () { return snapshot; } }
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  ["ai-boom-universe-data.js", "ai-boom-universe-scoring.js", "ai-rotation-engine.js", "ai-cycle-enhance.js", "ai-cycle-page.js"].forEach(function (f) {
    vm.runInContext(read(f), ctx, { filename: f });
  });
  var R = ctx.AIRotationEngine.compute(snapshot || {}, { now: NOW });
  return { ctx: ctx, html: root.innerHTML, R: R, tones: ctx.AICyclePage && ctx.AICyclePage.tones };
}

// tiny tag walker: every element with its classes, attributes and how many gc-card ancestors it has
function walk(html) {
  var re = /<(\/?)([a-zA-Z][\w-]*)\b([^>]*?)(\/?)>/g, m, stack = [], out = [];
  var VOID = { br: 1, img: 1, input: 1, hr: 1, meta: 1, link: 1, wbr: 1 };
  while ((m = re.exec(html)) !== null) {
    var tag = m[2].toLowerCase();
    if (m[1] === "/") { for (var i = stack.length - 1; i >= 0; i--) if (stack[i].tag === tag) { stack.length = i; break; } continue; }
    var attrs = m[3], cm = /\sclass="([^"]*)"/.exec(" " + attrs), im = /\sid="([^"]*)"/.exec(" " + attrs);
    var el = { tag: tag, cls: cm ? cm[1].split(/\s+/).filter(Boolean) : [], id: im ? im[1] : null, attrs: attrs,
      gcAncestors: stack.filter(function (e) { return e.cls.indexOf("gc-card") >= 0; }).length, parent: stack[stack.length - 1] || null };
    out.push(el);
    if (!(m[4] === "/" || VOID[tag])) stack.push(el);
  }
  return out;
}
var TONES = ["gc-calm", "gc-normal", "gc-warning", "gc-danger", "gc-neutral"];
function toneOf(el) { var x = el.cls.filter(function (c) { return TONES.indexOf(c) >= 0; }); return x.length === 1 ? x[0] : (x.length ? "MANY:" + x.join("+") : null); }
function has(el, c) { return el.cls.indexOf(c) >= 0; }
function sectionByTitle(els, html, title) {
  // the <section class="aic-sec …"> whose head h2 is `title`
  var re = /<section class="(aic-sec[^"]*)"><div class="aic-sec-head"><span class="aic-sec-n">\d+<\/span><div><h2>([^<]*)<\/h2>/g, m;
  while ((m = re.exec(html)) !== null) if (m[2].replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&") === title) return m[1].split(/\s+/);
  return null;
}

// ------------------------------------------------------------------ HTML wiring
console.log("== ai-cycle.html ==");
{
  var H = read("ai-cycle.html"), HOME = read("home.html");
  var iT = H.indexOf("/theme.css?v="), iM = H.indexOf("/mission-control.css?v="), iG = H.indexOf("/glass-cards.css?v="),
    iV = H.indexOf("/mission-control-v2.css?v="), iA = H.indexOf("/ai-cycle.css?v=");
  t("loads /glass-cards.css?v=20261121-gc-2 exactly once", (H.match(/\/glass-cards\.css\?v=/g) || []).length === 1 && H.indexOf("/glass-cards.css?v=20261121-gc-2\"") > 0);
  t("order theme.css → mission-control.css → glass-cards.css → mission-control-v2.css → ai-cycle.css (as on /home)",
    iT > 0 && iM > iT && iG > iM && iV > iG && iA > iV, [iT, iM, iG, iV, iA]);
  t("loads Inter 700 (figures are Inter 700 tabular)", /fonts\.googleapis\.com\/css2\?family=Inter:wght@[^"&]*700/.test(H));
  t("pins bumped: ai-cycle.css → 20261122-aic-6 · ai-cycle-page.js → 20261122-aic-8",
    H.indexOf("/ai-cycle.css?v=20261122-aic-6\"") > 0 && H.indexOf("/ai-cycle-page.js?v=20261122-aic-8\"") > 0);
  var v2 = function (h) { var m = /mission-control-v2\.css\?v=([^"]+)"/.exec(h); return m ? m[1] : null; };
  t("shared mission-control-v2.css keeps the same pin as /home (file not touched by this page)", v2(H) && v2(H) === v2(HOME), [v2(H), v2(HOME)]);
  t("loading placeholder is a neutral glass card (class + text kept)", H.indexOf('<div class="mc-empty gc-card gc-neutral"><strong>กำลังโหลด AI Cycle Intelligence…</strong></div>') > 0);
}

// ------------------------------------------------------------------ status → tone maps
console.log("== status → tone ==");
var B0 = boot(null), T = B0.tones || {};
t("AICyclePage.tones exposes conf · dir · grade · level · align · rotation", ["conf", "dir", "grade", "level", "align", "rotation"].every(function (k) { return typeof T[k] === "function"; }));
if (typeof T.conf === "function") {
  var confCases = [[100, "gc-calm"], [75, "gc-calm"], [74, "gc-normal"], [55, "gc-normal"], [54, "gc-warning"], [40, "gc-warning"], [39, "gc-neutral"], [0, "gc-neutral"], [null, "gc-neutral"]];
  t("Confidence ring band → calm ≥75 · normal ≥55 · warning ≥40 · neutral below (same thresholds as the ring colour)",
    confCases.every(function (c) { return T.conf(c[0]) === c[1]; }), confCases.map(function (c) { return c[0] + "→" + T.conf(c[0]); }));
  t("rotation direction → in calm · hot normal · out warning · stable / unknown neutral",
    T.dir("in") === "gc-calm" && T.dir("hot") === "gc-normal" && T.dir("out") === "gc-warning" && T.dir("stable") === "gc-neutral" && T.dir("??") === "gc-neutral");
  t("AI Portfolio Score grade → A calm · B normal · C warning · D danger · — neutral",
    T.grade("A") === "gc-calm" && T.grade("B") === "gc-normal" && T.grade("C") === "gc-warning" && T.grade("D") === "gc-danger" && T.grade("—") === "gc-neutral");
  // the portfolio cards have a status only when the portfolio holds AI value (engine: exposure.totalAiValue > 0)
  var EX = function (ai) { return ai ? { hasHoldings: true, totalAiValue: 1000 } : ai === 0 ? { hasHoldings: true, totalAiValue: 0 } : { hasHoldings: false, totalAiValue: 0 }; };
  var Rl = function (key, ai) { return { exposure: EX(ai), concentration: { level: key ? { key: key } : undefined } }; };
  t("Concentration level → low calm · medium warning · high danger · none / no AI value neutral",
    T.level(Rl("low", 1)) === "gc-calm" && T.level(Rl("medium", 1)) === "gc-warning" && T.level(Rl("high", 1)) === "gc-danger" && T.level(Rl(null, 1)) === "gc-neutral" &&
    T.level(Rl("low", 0)) === "gc-neutral" && T.level(Rl("low")) === "gc-neutral");
  var Rx = function (ai, tone, title) { return { exposure: EX(ai), actions: [{ tone: tone, title: title || "Alignment กับวัฏจักร 60/100" }], rotationPaths: [] }; };
  t("Exposure = engine Alignment action tone → good calm · warn warning · risk danger · info / no AI value / no holdings neutral",
    T.align(Rx(1, "good")) === "gc-calm" && T.align(Rx(1, "warn")) === "gc-warning" && T.align(Rx(1, "risk")) === "gc-danger" &&
    T.align(Rx(0, "info", "ยังไม่มีข้อมูลพอร์ต AI")) === "gc-neutral" && T.align(Rx(0, "good")) === "gc-neutral" && T.align(Rx(null, "good")) === "gc-neutral");
  t("Portfolio Rotation → calm only for the ✅ aligned state (AI value, no path) · paths / no AI value / no holdings neutral",
    T.rotation({ exposure: EX(1), rotationPaths: [] }) === "gc-calm" &&
    T.rotation({ exposure: EX(1), rotationPaths: [{ from: "GPU", to: "Networking" }] }) === "gc-neutral" &&
    T.rotation({ exposure: EX(0), rotationPaths: [] }) === "gc-neutral" &&
    T.rotation({ exposure: EX(null), rotationPaths: [] }) === "gc-neutral");
}

// ------------------------------------------------------------------ full render, no holdings
function checkRender(label, B) {
  var els = walk(B.html), R = B.R;
  var cards = els.filter(function (e) { return has(e, "gc-card"); });
  t(label + ": page renders glass cards (" + cards.length + ")", cards.length >= 20);
  t(label + ": every card has exactly one tone", cards.every(function (e) { return TONES.indexOf(toneOf(e)) >= 0; }), cards.filter(function (e) { return TONES.indexOf(toneOf(e)) < 0; }).map(function (e) { return e.cls.join(" "); }));
  t(label + ": no glass inside glass", cards.every(function (e) { return e.gcAncestors === 0; }), cards.filter(function (e) { return e.gcAncestors; }).map(function (e) { return e.cls.join(" "); }));
  var hero = els.filter(function (e) { return has(e, "aic-hero"); })[0];
  t(label + ": hero = Confidence band of the phase (" + R.phase.confidence + "% → " + B.tones.conf(R.phase.confidence) + ")", hero && has(hero, "gc-card") && toneOf(hero) === B.tones.conf(R.phase.confidence));
  var secs = els.filter(function (e) { return e.tag === "section" && has(e, "aic-sec"); });
  var open = secs.filter(function (e) { return has(e, "aic-sec-open"); });
  t(label + ": every section is a glass card except the value chain heading (on the page)", secs.length >= 14 && open.length === 1 &&
    secs.every(function (e) { return has(e, "aic-sec-open") ? !has(e, "gc-card") : has(e, "gc-card"); }));
  var vc = els.filter(function (e) { return has(e, "aic-vc-card"); });
  var vcBad = vc.filter(function (e) {
    var key = e.parent && e.parent.id ? e.parent.id.replace("aic-vc-node-", "") : null;
    var L = R.layers.filter(function (l) { return l.key === key; })[0];
    return !L || !has(e, "gc-card") || toneOf(e) !== B.tones.dir(L.direction);
  });
  t(label + ": each value-chain layer card = its rotation direction (" + vc.length + " layers)", vc.length === R.layers.length && vcBad.length === 0, vcBad.map(function (e) { return e.cls.join(" "); }));
  return els;
}
console.log("== render · no holdings ==");
{
  var B = B0, html = B.html;
  checkRender("no holdings", B);
  var none = ["AI Portfolio Score", "Portfolio Exposure", "AI Concentration Risk", "Portfolio Rotation", "AI Flow Map", "Capital Rotation", "AI Conviction Score",
    "Rotation Radar", "New Capital Allocation", "Portfolio Impact", "AI Phase Timeline", "Next Phase Confirmation", "Today's AI Strategy", "Explainability"];
  var notNeutral = none.filter(function (n) { var c = sectionByTitle(null, html, n); return !c || c.indexOf("gc-neutral") < 0; });
  t("no holdings: every section without a status is gc-neutral (" + none.length + ")", notNeutral.length === 0, notNeutral);
}

// ------------------------------------------------------------------ full render, with holdings (synthetic)
console.log("== render · with holdings ==");
{
  var snap = { portfolioHoldings: { data: [
    { canonicalSymbol: "NVDA", isHolding: true, marketValue: 500000 },
    { canonicalSymbol: "MSFT", isHolding: true, marketValue: 300000 },
    { canonicalSymbol: "QQQM", isHolding: true, marketValue: 200000 },
    { canonicalSymbol: "GLD", isHolding: true, marketValue: 100000 }
  ] } };
  var B2 = boot(snap), R2 = B2.R, h2 = B2.html, T2 = B2.tones;
  var els2 = checkRender("holdings", B2);
  var ps = sectionByTitle(null, h2, "AI Portfolio Score"), ex = sectionByTitle(null, h2, "Portfolio Exposure"),
    cc = sectionByTitle(null, h2, "AI Concentration Risk"), pr = sectionByTitle(null, h2, "Portfolio Rotation");
  t("AI Portfolio Score card = grade " + R2.portfolioScore.grade + " → " + T2.grade(R2.portfolioScore.grade), ps && ps.indexOf(T2.grade(R2.portfolioScore.grade)) >= 0 && T2.grade(R2.portfolioScore.grade) !== "gc-neutral", ps);
  t("Portfolio Exposure card = Alignment " + R2.exposure.alignmentScore + " action tone → " + T2.align(R2), ex && ex.indexOf(T2.align(R2)) >= 0 && T2.align(R2) !== "gc-neutral", ex);
  t("AI Concentration Risk card = level " + (R2.concentration.level && R2.concentration.level.key) + " → " + T2.level(R2), cc && cc.indexOf(T2.level(R2)) >= 0 && T2.level(R2) !== "gc-neutral", cc);
  t("Portfolio Rotation card = " + T2.rotation(R2) + " (" + (R2.rotationPaths || []).length + " paths)", pr && pr.indexOf(T2.rotation(R2)) >= 0, pr);
  var wraps = els2.filter(function (e) { return has(e, "aic-table-wrap"); }), tables = els2.filter(function (e) { return has(e, "aic-table"); });
  t("opportunity tables use gc-table inside a focusable named region (gc-table-wrap · tabindex 0 · role=region · aria-label \"ตาราง … เลื่อนซ้ายขวาได้\", as on /home · PM · /thesis)",
    tables.length >= 1 && tables.every(function (e) { return has(e, "gc-table"); }) &&
    wraps.length === tables.length && wraps.every(function (e) { return has(e, "gc-table-wrap") && /\stabindex="0"/.test(" " + e.attrs) && /\srole="region"/.test(" " + e.attrs) && /\saria-label="ตาราง [^"]+ เลื่อนซ้ายขวาได้"/.test(" " + e.attrs); }),
    wraps.map(function (e) { return e.attrs; }));

  // privacy: money is ฿ text (masked by privacy.js) — never in an attribute, never in an input
  var maskText = require("../public/privacy.js").maskText;
  var sm = /<div class="aic-exp-summary">([^<]*)<\/div>/.exec(h2), summary = sm ? sm[1] : "";
  t("Exposure summary shows the AI money as ฿ text", /฿[\d,.]+/.test(summary), summary);
  t("privacy.js masks every figure of that money line (no digit left)", summary && !/\d/.test(maskText(summary)), maskText(summary));
  var attrVals = [], ar = /\s(title|aria-label|value|data-[\w-]+)="([^"]*)"/g, am;
  while ((am = ar.exec(h2)) !== null) attrVals.push(am[1] + "=" + am[2]);
  var money = attrVals.filter(function (v) { return /฿|บาท|THB|500,?000|300,?000|1\.10M|1,100,000/.test(v); });
  t("no money in title / aria-label / value / data-* attributes (" + attrVals.length + " attrs)", money.length === 0, money);
  t("the page renders no <input> (nothing for privacy.js to miss)", !/<input\b/i.test(h2));
}

// ------------------------------------------------------------------ holdings with no AI ticker (review minor 1)
console.log("== render · holdings without AI value (GLD only) ==");
{
  var B3 = boot({ portfolioHoldings: { data: [{ canonicalSymbol: "GLD", isHolding: true, marketValue: 100000 }] } }), R3 = B3.R, h3 = B3.html;
  checkRender("GLD only", B3);
  t("GLD only: the engine state is reproduced (holdings, AI value 0, concentration 'ต่ำ', no rotation path → page shows ✅)",
    R3.exposure.hasHoldings === true && R3.exposure.totalAiValue === 0 && R3.concentration.level.key === "low" && !(R3.rotationPaths || []).length && h3.indexOf("✅ พอร์ตสอดคล้องกับวัฏจักรแล้ว") > 0,
    [R3.exposure.hasHoldings, R3.exposure.totalAiValue, R3.concentration.level, (R3.rotationPaths || []).length]);
  var gNot = ["AI Portfolio Score", "Portfolio Exposure", "AI Concentration Risk", "Portfolio Rotation"].filter(function (n) { var c = sectionByTitle(null, h3, n); return !c || c.indexOf("gc-neutral") < 0; });
  t("GLD only: Portfolio Score · Exposure · Concentration · Rotation are all gc-neutral (no green 'ต่ำ' / '✅' without AI value)", gNot.length === 0, gNot);
}

// ------------------------------------------------------------------ page CSS
console.log("== ai-cycle.css ==");
{
  var CSS = read("ai-cycle.css"), BODY = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
  var rules = [], re = /([^{}]+)\{([^{}]*)\}/g, m;
  while ((m = re.exec(BODY)) !== null) { var pre = m[1].trim(); if (pre.charAt(0) !== "@") rules.push({ sel: pre.split(",").map(function (s) { return s.trim().replace(/\s+/g, " "); }), body: m[2] }); }
  function only(sel) { return rules.filter(function (r) { return r.sel.length === 1 && r.sel[0] === sel; }); }
  var skins = [".aic-hero", ".aic-sec", ".aic-vc-card"].filter(function (s) { return only(s).some(function (r) { return /(^|;)\s*(background|border|border-radius)\s*:/.test(r.body); }); });
  t("old card skins removed from .aic-hero / .aic-sec / .aic-vc-card (the glass shows through)", skins.length === 0, skins);
  var remap = only("#aiCycleRoot .gc-card"), rb = remap.length ? remap[0].body : "";
  function tok(name) { var mm = new RegExp(name.replace(/-/g, "\\-") + "\\s*:\\s*([^;]+)").exec(rb); return mm ? mm[1].trim() : null; }
  t("inside #aiCycleRoot .gc-card the mc-* text tokens point to the glass ink",
    tok("--mc-text") === "var(--gc-ink)" && tok("--mc-text-2") === "var(--gc-ink-2)" && tok("--mc-muted") === "var(--gc-ink-2)" && tok("--mc-border") === "var(--gc-line)");
  function lum(hex) {
    var h = String(hex || "").replace("#", ""); if (h.length !== 6) return 0;
    return [0, 2, 4].map(function (i) { var c = parseInt(h.substr(i, 2), 16) / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); })
      .reduce(function (s, c, i) { return s + c * [0.2126, 0.7152, 0.0722][i]; }, 0);
  }
  var lifted = ["--aic-in", "--aic-hot", "--aic-out", "--mc-red"].map(function (k) { return [k, tok(k), lum(tok(k))]; });
  t("status colours on the glass are lifted to luminance ≥ 0.70 (≥ 4.7:1 on every tone)", lifted.every(function (x) { return x[2] >= 0.7; }), lifted);
  var loose = [];
  rules.forEach(function (r) { r.sel.forEach(function (s) { if (/\.gc-/.test(s) && s.indexOf("#aiCycleRoot ") !== 0) loose.push(s); }); });
  t("every rule that touches gc-* is scoped to #aiCycleRoot (no global glass overrides)", loose.length === 0, loose);
  t("no dot-matrix / LED number font", !/doto|dot-?matrix|DSEG|\bLED\b|segment/i.test(CSS));
  // review minor 2: the "สัดส่วนพอร์ตคุณ" legend dash has the colour of the dashed shape it labels (any rule that sets either, incl. glass overrides)
  var shape = [], legend = [];
  rules.forEach(function (r) {
    if (r.sel.some(function (s) { return /\.aic-radar-exp$/.test(s); })) { var sm2 = /(?:^|;)\s*stroke\s*:\s*([^;]+)/.exec(r.body); if (sm2) shape.push(sm2[1].trim().toLowerCase()); }
    if (r.sel.some(function (s) { return /\.aic-lg-exp$/.test(s); })) { var lm = /repeating-linear-gradient\(\s*90deg\s*,\s*([^\s,]+)/.exec(r.body); if (lm) legend.push(lm[1].trim().toLowerCase()); }
  });
  t("radar legend 'สัดส่วนพอร์ตคุณ' = the colour of the dashed shape it labels", shape.length >= 1 && legend.length >= 1 && legend.every(function (c) { return shape.indexOf(c) >= 0; }) &&
    shape.every(function (c) { return c === shape[0]; }), { shape: shape, legend: legend });
}

console.log("\n" + pass + " passed, " + fail + " failed");
process.exitCode = fail ? 1 : 0;
