// Adaptive Position (/adaptive-position) on glass cards — glass-cards.css gc-2 · 2026-11-22
//   node scripts/adaptive-position-glass-test.js
//
// What must stay true:
//   · adaptive-position.html loads glass-cards.css once, after theme.css / mission-control.css and before
//     adaptive-position.css, plus Inter 700; adaptive-position.css / adaptive-position-page.js pins bumped (ap-2).
//   · every card's tone comes from a status the page already computes (no invented status), no status → gc-neutral:
//       hero "AI Mega Trend" + §2 Mega Trend Breakdown = engine state tone (bull / watch / bear) → calm / warning / danger
//       hero "จังหวะย่อวันนี้" + §3 Dip-Buy Checklist = dip verdict tone (bull Add Position / watch Wait) → calm / warning
//       hero "สิ่งที่ควรทำตอนนี้" + §4 Core / Tactical Plan = recommendation (increase / maintain / reduce / unknown)
//         → calm / normal / warning / neutral (the page's green / sky / amber / muted)
//       §5 Confidence = the band the gauge was painted with (scoreColor ≥70 / ≥40 / lower) → calm / warning / danger
//       hero "สัดส่วนแนะนำ" · §6 Explainability · loading / empty / error = no status → gc-neutral
//   · no glass inside glass; the page header stays on the page.
//   · the page shows no money (percent only): no ฿ text, no money attribute, no <input> for privacy.js to miss.
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

// ------------------------------------------------------------------ fixtures (same shapes as adaptive-position-smoke-test.js)
var LKEYS = ["model", "cloud", "gpu", "networking", "memory", "foundry", "equipment", "power", "utility", "enterprise"];
function mkR(momentum, ov) {
  ov = ov || {};
  return {
    available: true,
    layers: LKEYS.map(function (k) { return { key: k, name: k.toUpperCase(), momentum: ov[k] != null ? ov[k] : momentum, companies: [] }; }),
    phase: { current: { key: "inference", name: "Inference Expansion" }, next: { key: "power", name: "Power Expansion" }, confidence: ov.conf != null ? ov.conf : 70, evidenceMet: ov.ev != null ? ov.ev : 66 },
    timeline: [{ key: "model", status: "past" }, { key: "gpu", status: "past" }, { key: "inference", status: "current" }, { key: "power", status: "future" }, { key: "enterprise", status: "future" }, { key: "agent", status: "future" }],
    rotation: { ranked: LKEYS.slice(0, 3).map(function (k) { return { key: k, momentum: momentum }; }) },
    concentration: { level: { key: ov.conc || "medium" } }
  };
}
function mkRegime(score) { return { available: true, score: score, regime: score >= 60 ? { key: "risk-on", label: "Risk-On" } : score >= 40 ? { key: "neutral", label: "Neutral" } : { key: "risk-off", label: "Risk-Off" } }; }
function flatY(v) { var a = []; for (var i = 0; i < 30; i++) a.push(v); return a; }
function breakout() { var c = [], i; for (i = 0; i < 240; i++) c.push(100); for (i = 0; i < 10; i++) c.push(90); c.push(103, 104); return c; }
function uptrend() { var a = []; for (var i = 0; i < 320; i++) a.push(50 + i * 0.3); return a; }
function snapWith(qqq, investedPct) {
  return { historicalData: { "^TNX": { closes: flatY(4.0) }, QQQM: { closes: qqq }, BTCUSD: { closes: uptrend() } },
    portfolioStatus: investedPct == null ? null : { data: { currentQuarter: "2026-Q3", quarters: { "2026-Q3": { key: "2026-Q3", assets: [
      { type: "foreign-stock", name: "x", manualValue: 1000000, snapshotValue: null, investedPercent: investedPct }] } } } } };
}
var PPmock = { deriveQuarterly: function (ps) {
  var a = ps.data.quarters["2026-Q3"].assets[0], inv = a.manualValue * a.investedPercent / 100;
  return { total: a.manualValue, investedSum: inv, cashSum: a.manualValue - inv };
} };
var SCENARIOS = {
  strong: { snap: snapWith(breakout(), 60), opts: { R: mkR(90), regime: mkRegime(75), PP: PPmock } },
  maintain: { snap: snapWith(uptrend(), 88), opts: { R: mkR(78), regime: mkRegime(70), PP: PPmock } },
  weak: { snap: snapWith(breakout(), 80), opts: { R: mkR(20, { conf: 20, ev: 20, conc: "high" }), regime: mkRegime(20), PP: PPmock } },
  neutralUnknown: { snap: snapWith(uptrend(), null), opts: { R: mkR(62), regime: mkRegime(55), PP: null } }
};

// ------------------------------------------------------------------ page boot in a vm (real engine + page; fixture opts injected)
function boot(sc, mode) {
  var root = { id: "apRoot", innerHTML: "" };
  var ctx = {
    console: console,
    document: { readyState: "complete", hidden: false, getElementById: function (id) { return id === "apRoot" ? root : null; }, addEventListener: function () {} },
    addEventListener: function () {},
    fetch: function () { return new Promise(function () {}); },        // /api/portfolio never answers → render uses the fixture only
    PortfolioDataSnapshot: { read: function () { return sc ? sc.snap : null; } }
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  var R = null;
  if (mode !== "no-engine") {
    vm.runInContext(read("adaptive-position-engine.js"), ctx, { filename: "adaptive-position-engine.js" });
    var real = ctx.AdaptivePosition.compute;
    ctx.AdaptivePosition.compute = function (snap, opts) {
      if (mode === "throw") throw new Error("boom");
      if (mode === "unavailable") return { available: false, reason: "no-data" };
      R = real(snap, Object.assign({}, opts, sc ? sc.opts : {}));
      return R;
    };
  }
  vm.runInContext(read("adaptive-position-page.js"), ctx, { filename: "adaptive-position-page.js" });
  return { html: root.innerHTML, R: R, tones: ctx.AdaptivePositionPage && ctx.AdaptivePositionPage.tones };
}

// tiny tag walker: every element with its classes, attributes and how many gc-card ancestors it has
function walk(html) {
  var re = /<(\/?)([a-zA-Z][\w-]*)\b([^>]*?)(\/?)>/g, m, stack = [], out = [];
  var VOID = { br: 1, img: 1, input: 1, hr: 1, meta: 1, link: 1, wbr: 1 };
  while ((m = re.exec(html)) !== null) {
    var tag = m[2].toLowerCase();
    if (m[1] === "/") { for (var i = stack.length - 1; i >= 0; i--) if (stack[i].tag === tag) { stack.length = i; break; } continue; }
    var attrs = m[3], cm = /\sclass="([^"]*)"/.exec(" " + attrs);
    var el = { tag: tag, cls: cm ? cm[1].split(/\s+/).filter(Boolean) : [], attrs: attrs,
      gcAncestors: stack.filter(function (e) { return e.cls.indexOf("gc-card") >= 0; }).length };
    out.push(el);
    if (!(m[4] === "/" || VOID[tag])) stack.push(el);
  }
  return out;
}
var TONES = ["gc-calm", "gc-normal", "gc-warning", "gc-danger", "gc-neutral"];
function toneOf(el) { var x = el.cls.filter(function (c) { return TONES.indexOf(c) >= 0; }); return x.length === 1 ? x[0] : (x.length ? "MANY:" + x.join("+") : null); }
function has(el, c) { return el.cls.indexOf(c) >= 0; }

// ------------------------------------------------------------------ HTML wiring
console.log("== adaptive-position.html ==");
{
  var H = read("adaptive-position.html");
  var iT = H.indexOf("/theme.css?v="), iM = H.indexOf("/mission-control.css?v="), iG = H.indexOf("/glass-cards.css?v="), iA = H.indexOf("/adaptive-position.css?v=");
  t("loads /glass-cards.css?v=20261121-gc-2 exactly once", (H.match(/\/glass-cards\.css\?v=/g) || []).length === 1 && H.indexOf("/glass-cards.css?v=20261121-gc-2\"") > 0);
  t("order theme.css → mission-control.css → glass-cards.css → adaptive-position.css", iT > 0 && iM > iT && iG > iM && iA > iG, [iT, iM, iG, iA]);
  t("loads Inter 700 (figures are Inter 700 tabular)", /fonts\.googleapis\.com\/css2\?family=Inter:wght@[^"&]*700/.test(H));
  t("pins bumped: adaptive-position.css + adaptive-position-page.js → 20261122-ap-2",
    H.indexOf("/adaptive-position.css?v=20261122-ap-2\"") > 0 && H.indexOf("/adaptive-position-page.js?v=20261122-ap-2\"") > 0);
  t("loading placeholder is a neutral glass card (class + text kept)", H.indexOf('<div class="mc-empty gc-card gc-neutral"><strong>กำลังโหลด Adaptive Position…</strong></div>') > 0);
}

// ------------------------------------------------------------------ status → tone maps
console.log("== status → tone ==");
var T = boot(null, "no-engine").tones || {};
t("AdaptivePositionPage.tones exposes engine · reco · conf", ["engine", "reco", "conf"].every(function (k) { return typeof T[k] === "function"; }));
if (typeof T.engine === "function") {
  t("engine tone (Mega Trend state · Dip verdict) → bull calm · watch warning · bear danger · unknown neutral",
    T.engine("bull") === "gc-calm" && T.engine("watch") === "gc-warning" && T.engine("bear") === "gc-danger" &&
    T.engine(undefined) === "gc-neutral" && T.engine("constructor") === "gc-neutral");
  t("recommendation → increase calm · maintain normal · reduce warning · unknown / missing neutral",
    T.reco("increase") === "gc-calm" && T.reco("maintain") === "gc-normal" && T.reco("reduce") === "gc-warning" &&
    T.reco("unknown") === "gc-neutral" && T.reco(undefined) === "gc-neutral" && T.reco("toString") === "gc-neutral");
  var confCases = [[100, "gc-calm"], [70, "gc-calm"], [69, "gc-warning"], [40, "gc-warning"], [39, "gc-danger"], [0, "gc-danger"], [null, "gc-neutral"], [undefined, "gc-neutral"]];
  t("confidence → calm ≥70 · warning ≥40 · danger below · no score neutral (the gauge's own scoreColor bands)",
    confCases.every(function (c) { return T.conf(c[0]) === c[1]; }), confCases.map(function (c) { return c[0] + "→" + T.conf(c[0]); }));
}

// ------------------------------------------------------------------ full renders (real engine, fixture inputs)
console.log("== render ==");
var seen = {};
Object.keys(SCENARIOS).forEach(function (name) {
  var B = boot(SCENARIOS[name]), R = B.R, els = walk(B.html), Tn = B.tones;
  if (!R || !R.available) { t(name + ": engine available", false, R); return; }
  var cards = els.filter(function (e) { return has(e, "gc-card"); });
  cards.forEach(function (e) { seen[toneOf(e)] = true; });
  t(name + ": 9 glass cards (4 hero tiles + 5 sections), each with exactly one tone", cards.length === 9 && cards.every(function (e) { return TONES.indexOf(toneOf(e)) >= 0; }),
    cards.map(function (e) { return e.cls.join(" "); }));
  t(name + ": no glass inside glass · hero wrapper and header are not cards", cards.every(function (e) { return e.gcAncestors === 0; }) &&
    els.filter(function (e) { return has(e, "ap-hero") || has(e, "ap-head"); }).every(function (e) { return !has(e, "gc-card"); }));
  var tiles = els.filter(function (e) { return has(e, "ap-hcell"); });
  var want = [Tn.engine(R.megaTrend.state.tone), Tn.engine(R.dip.verdict.tone), "gc-neutral", Tn.reco(R.recommendation.key)];
  t(name + ": hero tiles = state " + R.megaTrend.state.key + " · dip " + R.dip.verdict.key + " · allocation · reco " + R.recommendation.key + " → " + want.join(" "),
    tiles.length === 4 && tiles.every(function (e, i) { return has(e, "gc-card") && toneOf(e) === want[i]; }), tiles.map(toneOf));
  var secs = els.filter(function (e) { return e.tag === "section" && has(e, "ap-sec"); });
  var wantS = [Tn.engine(R.megaTrend.state.tone), Tn.engine(R.dip.verdict.tone), Tn.reco(R.recommendation.key), Tn.conf(R.confidence.score), "gc-neutral"];
  t(name + ": sections §2–§6 = state · dip · reco · confidence " + R.confidence.score + " · explain → " + wantS.join(" "),
    secs.length === 5 && secs.every(function (e, i) { return has(e, "gc-card") && toneOf(e) === wantS[i]; }), secs.map(toneOf));
  var gate = els.filter(function (e) { return has(e, "ap-gate"); })[0];
  t(name + ": gate " + (R.gate.open ? "open → gc-chip-safe" : "closed → gc-chip-risk") + " (classes kept)",
    gate && has(gate, R.gate.open ? "ap-gate-open" : "ap-gate-closed") && has(gate, "gc-chip") && has(gate, R.gate.open ? "gc-chip-safe" : "gc-chip-risk"));
  var wrap = els.filter(function (e) { return has(e, "ap-table-wrap"); })[0], table = els.filter(function (e) { return has(e, "ap-table"); })[0];
  t(name + ": allocation table = gc-table in a focusable gc-table-wrap (tabindex 0 + aria-label)", wrap && table && has(table, "gc-table") && has(wrap, "gc-table-wrap") &&
    /\stabindex="0"/.test(" " + wrap.attrs) && /\saria-label="[^"]+"/.test(" " + wrap.attrs));
  t(name + ": status labels on the glass are white pills / callout (no inline text colour left)",
    els.filter(function (e) { return has(e, "ap-chip"); }).every(function (e) { return has(e, "gc-pill") && !/\sstyle=/.test(" " + e.attrs); }) &&
    els.filter(function (e) { return has(e, "ap-note"); }).every(function (e) { return has(e, "gc-callout") && has(e, "gc-callout-dashed"); }) &&
    !/<b style="color:/.test(B.html));
  var hb = /<div class="ap-hbig"><b class="gc-num gc-num-m">(\d+)<\/b><span>\/100<\/span><\/div>/.exec(B.html);
  t(name + ": Mega Trend score is a gc-num figure (" + R.megaTrend.score + "/100)", hb && Number(hb[1]) === R.megaTrend.score);
  // privacy: the page shows percentages only — nothing for privacy.js to mask, nothing it could miss
  var attrVals = [], ar = /\s(title|aria-label|value|placeholder|data-[\w-]+)="([^"]*)"/g, am;
  while ((am = ar.exec(B.html)) !== null) attrVals.push(am[1] + "=" + am[2]);
  t(name + ": no money anywhere (no ฿ / บาท / THB text or attribute, no 1,000,000 figure, no <input>)",
    !/฿|บาท|THB|1,000,000|1000000/.test(B.html) && !/<input\b/i.test(B.html) && attrVals.every(function (v) { return !/฿|บาท|THB|\d{1,3},\d{3}/.test(v); }), attrVals.slice(0, 6));
});
t("the renders exercise every tone the page can produce (calm · normal · warning · danger · neutral)", TONES.every(function (k) { return seen[k]; }), Object.keys(seen));

console.log("== empty · error · engine missing ==");
[["unavailable", "ยังคำนวณ Adaptive Position ไม่ได้"], ["throw", "คำนวณไม่สำเร็จ"], ["no-engine", "Adaptive Position Engine ไม่พร้อม"]].forEach(function (c) {
  var B = boot(SCENARIOS.strong, c[0]);
  t(c[0] + ": message card is mc-empty gc-card gc-neutral (text kept)", B.html.indexOf('<div class="mc-empty gc-card gc-neutral"><strong>' + c[1] + "</strong>") >= 0, B.html.slice(0, 160));
});

// ------------------------------------------------------------------ page CSS
console.log("== adaptive-position.css ==");
{
  var CSS = read("adaptive-position.css"), BODY = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
  var rules = [], re = /([^{}]+)\{([^{}]*)\}/g, m;
  while ((m = re.exec(BODY)) !== null) { var pre = m[1].trim(); if (pre.charAt(0) !== "@") rules.push({ sel: pre.split(",").map(function (s) { return s.trim().replace(/\s+/g, " "); }), body: m[2] }); }
  function rulesFor(sel) { return rules.filter(function (r) { return r.sel.indexOf(sel) >= 0; }); }
  var skins = [".ap-hero", ".ap-hcell", ".ap-sec"].filter(function (s) { return rulesFor(s).some(function (r) { return /(^|;)\s*(background|border|border-radius|box-shadow)\s*:/.test(r.body); }); });
  t("old card skins removed from .ap-hero / .ap-hcell / .ap-sec (the glass shows through)", skins.length === 0, skins);
  var faces = [".ap-chip", ".ap-conf-badge", ".ap-gate", ".ap-gate-open", ".ap-gate-closed", ".ap-reco-increase", ".ap-reco-reduce", ".ap-reco-maintain", ".ap-reco-unknown",
    ".ap-note", ".ap-tone-bull", ".ap-tone-watch", ".ap-tone-bear", ".ap-table", ".ap-table th", ".ap-table td", ".ap-table-wrap"].filter(function (s) {
    return rulesFor(s).some(function (r) { return /(^|;)\s*(background|background-color|color|border|border-color|box-shadow)\s*:/.test(r.body); });
  });
  t("no page rule repaints a gc face it sits on (pill · chip · callout · table load before this file)", faces.length === 0, faces);
  var remap = rulesFor("#apRoot .gc-card").filter(function (r) { return r.sel.length === 1; }), rb = remap.length ? remap[0].body : "";
  function tok(name) { var mm = new RegExp(name.replace(/-/g, "\\-") + "\\s*:\\s*([^;]+)").exec(rb); return mm ? mm[1].trim() : null; }
  t("inside #apRoot .gc-card the mc-* text tokens point to the glass ink",
    tok("--mc-text") === "var(--gc-ink)" && tok("--mc-text-2") === "var(--gc-ink-2)" && tok("--mc-muted") === "var(--gc-ink-2)" && tok("--mc-border") === "var(--gc-line)");
  function lum(hex) {
    var h = String(hex || "").replace("#", ""); if (h.length !== 6) return 0;
    return [0, 2, 4].map(function (i) { var c = parseInt(h.substr(i, 2), 16) / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); })
      .reduce(function (s, c, i) { return s + c * [0.2126, 0.7152, 0.0722][i]; }, 0);
  }
  var lifted = ["--ap-bull", "--ap-watch", "--ap-bear", "--ap-core"].map(function (k) { return [k, tok(k), Math.round(lum(tok(k)) * 100) / 100]; });
  t("status text colours on the glass are lifted to luminance ≥ 0.70 (≥ 4.7:1 on every tone)", lifted.every(function (x) { return x[2] >= 0.7; }), lifted);
  var loose = [];
  rules.forEach(function (r) { r.sel.forEach(function (s) { if (/\.gc-/.test(s) && s.indexOf("#apRoot ") !== 0) loose.push(s); }); });
  t("every rule that touches gc-* is scoped to #apRoot (no global glass overrides)", loose.length === 0, loose);
  t("no dot-matrix / LED number font", !/doto|dot-?matrix|DSEG|\bLED\b|segment/i.test(CSS));
}

console.log("\n" + pass + " passed, " + fail + " failed");
process.exitCode = fail ? 1 : 0;
