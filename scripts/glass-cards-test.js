// Glass cards (gc-*) on the Macro Dashboard (/market-risk) — 2026-11
//   node scripts/glass-cards-test.js
//
// What must stay true:
//   · public/glass-cards.css is page-agnostic: every class selector starts with gc-, it documents
//     itself, has the 4 tones + neutral, focus-visible and reduced-motion, and NO dot-matrix font
//     (the user rejected Doto: "ลายตา เวียนหัว").
//   · market-risk.html loads Inter + glass-cards.css BEFORE market-risk.css, with the pinned versions.
//   · market-risk-page.js stays ES5 in its view layer (async/await only in the 6 pre-existing loaders).
//   · Driven end-to-end in a vm sandbox (fake DOM + synthetic market data): every card the page
//     renders is a glass card whose gc-<tone> equals its own mr-<tone>; all four tones appear;
//     zone knobs sit at the gauge's risk %; sparklines are white with a glowing end dot; card text
//     is unchanged (numbers keep their exact text even with the unit split out).
//   · A second sandbox with gaps (no equity score · no ^TYX bars): a missing value has no tone — zoneOf(null) / rateTone(null)
//     give "" → gc-neutral with a "—" pill, never the violet "ปกติ".
"use strict";
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var ROOT = path.join(__dirname, "..");
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), "utf8"); }
var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; console.log("  PASS  " + name); }
  else { fail++; console.log("  FAIL  " + name + (extra != null ? " — " + (typeof extra === "string" ? extra : JSON.stringify(extra)) : "")); }
}
function stripComments(s) { return s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/[^\n]*/g, "$1"); }
function textOf(html) { return String(html).replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'"); }

// hostile text arriving from the API must reach the screen as text, never as markup
var HOSTILE = '<img src=x onerror=alert(1)>&"';
var HOSTILE_ESC = "&lt;img src=x onerror=alert(1)&gt;&amp;&quot;";

var CSS = read("public/glass-cards.css");
var MR_CSS = read("public/market-risk.css");
var HTML = read("public/market-risk.html");
var PAGE = read("public/market-risk-page.js");

// ------------------------------------------------------------------ shared stylesheet
console.log("== glass-cards.css ==");
{
  var body = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
  t("no Doto / dot-matrix / LED font anywhere (incl. comments' code)", !/doto|dot-?matrix|\bLED\b/i.test(body) && !/doto/i.test(CSS));
  var preludes = [], m, re = /([^{}]+)\{/g;
  while ((m = re.exec(body)) !== null) preludes.push(m[1].trim());
  var selectors = preludes.filter(function (p) { return p.charAt(0) !== "@"; });
  var classes = [];
  selectors.forEach(function (s) { var c, cr = /\.(-?[_a-zA-Z][\w-]*)/g; while ((c = cr.exec(s)) !== null) classes.push(c[1]); });
  var foreign = classes.filter(function (c) { return c.indexOf("gc-") !== 0; });
  t("every class selector starts with gc- (" + classes.length + " class refs)", classes.length > 40 && foreign.length === 0, foreign);
  t("tones calm · normal · warning · danger · neutral defined from RGB custom properties",
    ["calm", "normal", "warning", "danger", "neutral"].every(function (k) { return new RegExp("\\.gc-" + k + "\\s*\\{[^}]*--gc-a:[^}]*--gc-b:[^}]*--gc-c:").test(body); }));
  t("card = two radial washes + dark base + sheen + 1px rim + offset shadow + 28px radius",
    /radial-gradient\(120% 95% at 100% 0%/.test(body) && /radial-gradient\(110% 90% at 0% 100%/.test(body) &&
    /\.gc-card::after\s*\{[^}]*linear-gradient\(180deg/.test(body) && /border:\s*1px solid rgba\(255, 255, 255/.test(body) &&
    /--gc-shadow:\s*0 24px 48px -28px/.test(body) && /--gc-radius:\s*28px/.test(body));
  t("secondary ink is tinted white (no grey) and ink-3 is never used for text colour",
    /--gc-ink-2:\s*rgba\(245, 245, 250, 0\.8\)/.test(body) && !/color:\s*var\(--gc-ink-3\)/.test(body));
  t("numbers: Inter, 700, tabular-nums, letter-spacing -0.03em",
    /\.gc-num\s*\{[^}]*font-family:\s*var\(--gc-num-font\)[^}]*font-weight:\s*700[^}]*letter-spacing:\s*-0\.03em[^}]*tabular-nums/.test(body) &&
    /--gc-num-font:\s*"Inter"/.test(body));
  t("pieces present: pill(+ghost) info chip×3 dir zone knob spark ring funnel callout list dl stats tile strip",
    ["gc-pill", "gc-pill-ghost", "gc-info", "gc-chip-risk", "gc-chip-safe", "gc-chip-flat", "gc-dir-risk", "gc-zone-track", "gc-zone-labels", "gc-knob",
      "gc-spark-dot", "gc-ring-arc", "gc-funnel-fill", "gc-callout", "gc-list-row", "gc-dl-row", "gc-stat", "gc-tile", "gc-strip"]
      .every(function (k) { return new RegExp("\\." + k + "\\b").test(body); }));
  t("info button: focus-visible ring + hover state; reduced motion respected",
    /\.gc-info:focus-visible\s*\{[^}]*outline:\s*2px solid/.test(body) && /\.gc-info:hover/.test(body) && /@media \(prefers-reduced-motion: reduce\)/.test(body));
  t("light theme keeps the vivid tile (only the shadow changes)", /html\[data-theme="light"\] \.gc-card\s*\{\s*--gc-shadow:[^}]*\}/.test(body) &&
    !/html\[data-theme="light"\][^{]*\{[^}]*(--gc-a|--gc-ink|background)/.test(body));
  t("documented: usage block at the top names the card, tones and pieces", /^\/\* =+\s*\n\s*glass-cards\.css/.test(CSS) && /\.gc-calm \.gc-normal \.gc-warning \.gc-danger/.test(CSS) && /Load order/.test(CSS));
}

// ------------------------------------------------------------------ html + page css
console.log("== market-risk.html / market-risk.css ==");
{
  var iGc = HTML.indexOf('href="/glass-cards.css?v=20261121-gc-2"'), iMr = HTML.indexOf('href="/market-risk.css?v=20261121-mr-3"');
  t("glass-cards.css (gc-2) loads before market-risk.css (mr-3)", iGc > 0 && iMr > 0 && iGc < iMr);
  t("market-risk-page.js bumped to mr-7", /src="\/market-risk-page\.js\?v=20261122-mr-7"/.test(HTML));
  t("Inter + Noto Sans Thai from Google Fonts; no Doto", /family=Inter:wght@[^"&]*500;600;700;800/.test(HTML) && /family=Noto\+Sans\+Thai/.test(HTML) && !/doto/i.test(HTML));
  t("header / nav / eyebrow / section ids untouched",
    /<p class="risk-eyebrow">Global Macro Monitor<\/p>/.test(HTML) && /<h1>Macro Dashboard<\/h1>/.test(HTML) && /id="mrVerdict" aria-label="สรุประดับความระวัง"/.test(HTML) &&
    ["mrRiskAssetBody", "mrRateBody", "mrMacroCards", "mrEquityCards", "mrEquityRef", "mrWarnings", "refreshRiskButton"].every(function (id) { return HTML.indexOf('id="' + id + '"') > 0; }));
  t("market-risk.css: no Doto; grids use minmax(0, 1fr); single column at ≤600px",
    !/doto/i.test(MR_CSS) && /\.mr-grid\s*\{[^}]*repeat\(3, minmax\(0, 1fr\)\)/.test(MR_CSS) && /@media \(max-width: 600px\)\s*\{\s*\.mr-grid\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\)/.test(MR_CSS));
  t("market-risk.css no longer paints the old tinted cards (glass owns the look)",
    !/\.mr-card\s*\{[^}]*background/.test(MR_CSS) && !/\.mr-card\.mr-(warning|danger)/.test(MR_CSS) && !/\.mr-val-(calm|warning|danger)\s*\{/.test(MR_CSS));
}

// ------------------------------------------------------------------ ES5 + wording
console.log("== market-risk-page.js source ==");
{
  var code = stripComments(PAGE);
  var RULES = [["arrow", /=>/], ["const", /\bconst\s/], ["let", /\blet\s/], ["template literal", /`/], ["class", /\bclass\s+[A-Z]/], ["optional chaining", /\?\.[a-zA-Z_]/],
    ["Array includes/fill/find", /\.(includes|fill|find)\(/],
    ["ES2015+ library", /Object\.(assign|entries|values)|\.repeat\(|\.startsWith\(|\.endsWith\(|\.padStart\(|\.padEnd\(|\.findIndex\(|Number\.is(Finite|NaN|Integer)|Array\.from/]];
  var probs = RULES.filter(function (r) { return r[1].test(code); }).map(function (r) { return r[0]; });
  t("ES5 syntax (no arrow/const/let/template/class/?./ES2015 methods)", probs.length === 0, probs);
  var asyncNames = (code.match(/async function [A-Za-z0-9_]+/g) || []).map(function (s) { return s.slice(15); }).sort();
  t("async/await only in the 6 pre-existing data loaders (no new async code)",
    asyncNames.join() === ["fetch5y", "fetchOhlc", "load5y", "loadAll", "loadApi", "loadMacro"].join() && (code.match(/\bawait\b/g) || []).length === 19, asyncNames);
  var ADVISORY_TH = /ควรซื้อ|ควรขาย|น่าซื้อ|น่าขาย|น่าเข้า|แนะนำซื้อ|จุดเข้า|ตัดขาดทุน/, ADVISORY_EN = /\b(Buy|Sell)\b/;
  t("no advisory wording in page / html / both stylesheets",
    [PAGE, HTML, CSS, MR_CSS].every(function (s) { return !ADVISORY_TH.test(s) && !ADVISORY_EN.test(s); }));
  t("asOfLine(def.get()) wiring kept (stale-data guard)", /asOfLine\(def\.get\(\)\)/.test(PAGE));
}

// ------------------------------------------------------------------ numHtml escapes both halves
console.log("== numHtml / esc (taken from the page source) ==");
{
  var escSrc = PAGE.match(/function esc\(s\) \{[^\n]*\}/), numSrc = PAGE.match(/function numHtml\(s\) \{[\s\S]*?\n  \}\n/);
  if (!escSrc || !numSrc) { console.error("esc / numHtml not found in market-risk-page.js — renamed or moved?"); process.exit(1); }
  var H = vm.runInNewContext("(function(){" + escSrc[0] + "\n" + numSrc[0] + "\nreturn { esc: esc, numHtml: numHtml };})()");
  var unitCase = H.numHtml("5" + HOSTILE), wholeCase = H.numHtml(HOSTILE);
  t("numHtml splits the unit without changing the text (5.40% · 0.91 pp · 80/100 · 100.6 · —)",
    H.numHtml("5.40%") === '5.40<span class="gc-unit">%</span>' && H.numHtml("0.91 pp") === '0.91<span class="gc-unit"> pp</span>' &&
    H.numHtml("80/100") === '80<span class="gc-unit">/100</span>' && H.numHtml("100.6") === "100.6" && H.numHtml("—") === "—");
  t("numHtml escapes hostile text in the unit half and in the no-number case",
    unitCase === '5<span class="gc-unit">' + HOSTILE_ESC + "</span>" && wholeCase === HOSTILE_ESC && textOf(unitCase) === "5" + HOSTILE && textOf(wholeCase) === HOSTILE,
    [unitCase, wholeCase]);
}

// ------------------------------------------------------------------ vm sandbox
function weekdaysBack(n) {
  var out = [], d = new Date(Date.UTC(2026, 10, 20));
  while (out.length < n) { var w = d.getUTCDay(); if (w !== 0 && w !== 6) out.unshift(d.toISOString().slice(0, 10)); d = new Date(d.getTime() - 86400000); }
  return out;
}
// flat at `base`, then a straight ramp to `end` over the last 22 bars (so Δ21 bars = end − base)
function ramp(n, base, end, wiggle) {
  var c = [];
  for (var i = 0; i < n; i++) {
    var k = i - (n - 22);
    var v = k <= 0 ? base : base + (end - base) * (k / 21);
    if (wiggle && k < 0) v += Math.sin(i / 5) * wiggle;
    c.push(Math.round(v * 10000) / 10000);
  }
  return c;
}
// tones by design: 10Y Δ+0.60 → danger · curve 1.7pp → calm · 30Y 4.60 → normal · DXY +3% → warning
// HYG +3% → calm · MOVE 90 → normal · VIX 13 → calm · VVIX 95 → warning · equity score 80 → danger
var SERIES = {
  "^TNX": function (n) { return ramp(n, 4.1, 4.7, 0.03); },
  "^IRX": function (n) { return ramp(n, 2.4, 3.0, 0.03); },
  "^TYX": function (n) { return ramp(n, 4.6, 4.6, 0.02); },
  "DX-Y.NYB": function (n) { return ramp(n, 100, 103, 0.4); },
  "HYG": function (n) { return ramp(n, 76, 78.28, 0.2); },
  "^MOVE": function (n) { return ramp(n, 90, 90, 2); },
  "^VIX": function (n) { return ramp(n, 13, 13, 0.3); },
  "^VVIX": function (n) { return ramp(n, 95, 95, 1); },
  "BTC-USD": function (n) { return ramp(n, 90000, 99000, 900); },
  "^IXIC": function (n) { return ramp(n, 20000, 19000, 150); },
  "^GSPC": function (n) { return ramp(n, 6500, 6520, 40); },
  "^SET50.BK": function (n) { return ramp(n, 900, 880, 4); }
};
// reference tiles by design: SPX 1M normal · XLK 1M danger · XLK−SPX warning · VIX calm · VVIX warning · VIXEQ ×2 neutral
var API = {
  generatedAt: "2026-11-20T22:00:00.000Z",
  metrics: { spxOneMonthReturn: 2, xlkOneMonthReturn: -9, techLeadershipSpread: 12, vix: 13, vvix: 95, vixeq: null, vixeqSpread: null },
  flags: [{ id: "x", thai: "ทดสอบธงเสี่ยง " + HOSTILE, severity: "danger", detail: "VVIX = 95" }],
  risk: { score: 80, level: { label: "Hedge / Reduce Risk " + HOSTILE, thai: "ระดับทดสอบ", tone: "danger" }, activeFlags: 1 }
};

function makeEl(id) { return { id: id, innerHTML: "", textContent: "", addEventListener: function () {}, classList: { add: function () {}, contains: function () { return false; } } }; }
var IDS = ["riskStatus", "riskTimestamp", "refreshRiskButton", "mrVerdict", "mrRiskAssetBody", "mrRateBody", "mrMacroCards", "mrEquityCards", "mrEquityRef", "mrWarnings"];
// the real page in its own vm sandbox, fed `api` + `series` (symbol → generator; a missing symbol = no bars)
function bootPage(api, series) {
  var els = {}, store = {}, fetchLog = [];
  IDS.forEach(function (id) { els[id] = makeEl(id); });
  var sb = {
    console: console,
    document: {
      readyState: "complete",
      getElementById: function (id) { return els[id] || null; },
      addEventListener: function () {},
      body: { appendChild: function () {}, style: {} }
    },
    localStorage: { getItem: function (k) { return store[k] == null ? null : store[k]; }, setItem: function (k, v) { store[k] = String(v); }, removeItem: function (k) { delete store[k]; } },
    fetch: function (url) {
      fetchLog.push(url);
      var u = new URL(url, "http://x");
      var body;
      if (u.pathname === "/api/market-risk") body = api;
      else if (u.pathname === "/api/ohlc") {
        var sym = u.searchParams.get("symbol"), n = u.searchParams.get("days") === "1825" ? 900 : 260, gen = series[sym];
        var dates = weekdaysBack(n), closes = gen ? gen(n) : [];
        body = { bars: closes.map(function (c, i) { return { date: dates[i], close: c }; }), sourceType: "LIVE_MARKET_DATA", fetchedAt: "2026-11-20T22:00:00.000Z", error: null };
      } else return Promise.resolve({ ok: false, status: 404, json: function () { return Promise.resolve({}); } });
      return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve(JSON.parse(JSON.stringify(body))); } });
    },
    setTimeout: setTimeout,
    clearTimeout: clearTimeout
  };
  sb.window = sb;
  sb.window.addEventListener = function () {};
  vm.createContext(sb);
  vm.runInContext(PAGE, sb, { filename: "market-risk-page.js" });
  return { els: els, sb: sb, fetchLog: fetchLog };
}
var MAIN = bootPage(API, SERIES), els = MAIN.els, sb = MAIN.sb, fetchLog = MAIN.fetchLog;
// a second page with gaps: the market-risk payload has no equity score, and ^TYX (US 30Y) returns no bars
var API_GAP = JSON.parse(JSON.stringify(API)); delete API_GAP.risk.score;
var SERIES_GAP = {}; Object.keys(SERIES).forEach(function (k) { if (k !== "^TYX") SERIES_GAP[k] = SERIES[k]; });
var GAP = bootPage(API_GAP, SERIES_GAP);

function settle(n) { var p = Promise.resolve(); for (var i = 0; i < n; i++) p = p.then(function () { return new Promise(function (r) { setImmediate(r); }); }); return p; }

settle(400).then(function () {
  console.log("== rendered page (vm sandbox, synthetic data) ==");
  var MD = sb.MacroDashboard;
  t("page loaded all data (12 ohlc + 2 five-year + market-risk)", fetchLog.length === 15 && /gc-card/.test(els.mrMacroCards.innerHTML), fetchLog.length);
  var all = IDS.map(function (id) { return els[id].innerHTML; }).join("\n");

  // every card tag: gc-card + exactly one gc tone, equal to its own mr tone
  var tagRe = /<(article|div)\s+class="([^"]*)"/g, mm, cardTags = [], tones = {};
  while ((mm = tagRe.exec(all)) !== null) {
    var cls = mm[2].split(/\s+/);
    var isCard = cls.indexOf("mr-card") >= 0 || cls.indexOf("mr-verdict") >= 0 || cls.indexOf("mr-ref-cell") >= 0 || cls.indexOf("mr-rate-actions") >= 0 || cls.indexOf("mr-warn-card") >= 0 || cls.indexOf("mr-allclear") >= 0;
    if (!isCard) continue;
    var gcT = cls.filter(function (c) { return /^gc-(calm|normal|warning|danger|neutral)$/.test(c); });
    var mrT = cls.filter(function (c) { return /^mr-(calm|normal|warning|danger)$/.test(c) || /^mr-rate-actions-(calm|normal|warning|danger)$/.test(c) || /^mr-val-(calm|normal|warning|danger)$/.test(c); })
      .map(function (c) { return c.replace(/^mr-(rate-actions-|val-)?/, ""); });
    cardTags.push({ cls: mm[2], glass: cls.indexOf("gc-card") >= 0, gc: gcT, mr: mrT });
    if (gcT.length === 1) tones[gcT[0].slice(3)] = (tones[gcT[0].slice(3)] || 0) + 1;
  }
  var notGlass = cardTags.filter(function (c) { return !c.glass || c.gc.length !== 1; });
  var mismatch = cardTags.filter(function (c) { return c.mr.length && (c.gc.length !== 1 || c.mr[0] !== c.gc[0].slice(3)); });
  t("every rendered card is a glass card with one tone class (" + cardTags.length + " cards)", cardTags.length >= 20 && notGlass.length === 0, notGlass.map(function (c) { return c.cls; }));
  t("each card's gc-<tone> equals its own mr-<tone>", mismatch.length === 0, mismatch.map(function (c) { return c.cls; }));
  t("all four tones render (calm · normal · warning · danger) + neutral for an empty reference value",
    tones.calm > 0 && tones.normal > 0 && tones.warning > 0 && tones.danger > 0 && tones.neutral > 0, tones);

  // gauge cards: tone, knob position, unchanged text
  var gauges = MD.macroGauges();
  var cards = els.mrMacroCards.innerHTML.split("<article").slice(1);
  var gaugeIssues = [];
  gauges.forEach(function (g) {
    var chunk = cards.filter(function (c) { return c.indexOf(g.title.replace(/&/g, "&amp;")) >= 0; })[0];
    if (!chunk) { gaugeIssues.push("no card for " + g.title); return; }
    if (chunk.indexOf("gc-" + g.tone + '"') < 0 && chunk.indexOf("gc-" + g.tone + " ") < 0) gaugeIssues.push(g.key + " tone");
    var knob = /class="mr-bar-marker gc-knob" style="left:([\d.]+)%"/.exec(chunk);
    if (!knob || knob[1] !== Math.max(0, Math.min(100, g.risk)).toFixed(1)) gaugeIssues.push(g.key + " knob " + (knob && knob[1]) + " vs " + g.risk);
    if (textOf(chunk).indexOf(g.value) < 0) gaugeIssues.push(g.key + " value text " + g.value);
    if (!/class="gc-spark"/.test(chunk) || !/gc-spark-dot/.test(chunk)) gaugeIssues.push(g.key + " spark");
    if (textOf(chunk).indexOf("ผ่อนคลายปกติจับตาเสี่ยง") < 0) gaugeIssues.push(g.key + " zone labels");
  });
  t("6 macro gauges: tone class, knob at risk %, value text, spark, Thai zone labels", gauges.length === 6 && gaugeIssues.length === 0, gaugeIssues);
  t("designed tones landed (10Y danger · curve calm · 30Y normal · DXY warning · HYG calm · MOVE normal)",
    gauges.map(function (g) { return g.key + ":" + g.tone; }).join() === "rates:danger,curve:calm,long:normal,dxy:warning,credit:calm,move:normal",
    gauges.map(function (g) { return g.key + ":" + g.tone; }).join());

  var eq = els.mrEquityCards.innerHTML;
  t("equity: score card is a ring (0-100) with text 80/100; VIX calm, VVIX warning",
    /class="gc-ring"/.test(eq) && /stroke-dashoffset="62\.8"/.test(eq) && textOf(eq).indexOf("80/100") >= 0 &&
    /mr-card mr-calm gc-card gc-calm[\s\S]*VIX \(ความกลัวหุ้น\)/.test(eq) && /mr-card mr-warning gc-card gc-warning[\s\S]*VVIX/.test(eq));
  t("trend chips: toward-risk = gc-chip-risk only on mr-tr-risk, flat = gc-chip-flat",
    !/mr-tr-risk gc-chip gc-chip-(safe|flat)/.test(all) && !/mr-tr-flat gc-chip gc-chip-(risk|safe)/.test(all) && /mr-tr-\w+ gc-chip gc-chip-/.test(all));

  var ra = els.mrRiskAssetBody.innerHTML;
  var rails = ra.match(/<div class="mr-ra-track gc-funnel-rail">[\s\S]*?<\/div>/g) || [];
  var railOk = rails.length === 4 && rails.every(function (r) {
    var w = /gc-funnel-fill" style="width:(\d+)%"/.exec(r), k = /mr-ra-marker gc-knob" style="left:(\d+)%"/.exec(r);
    return w && k && w[1] === k[1];
  });
  t("risk-asset: 4 funnel rails, white fill width = knob position; no coloured inline text left",
    railOk && !/style="color:/.test(ra) && /← ขายออก/.test(ra) && /ลงเต็มส่วน →/.test(ra), rails.length);

  var rate = els.mrRateBody.innerHTML;
  t("rate monitor: headwind + 30Y + 10Y + curve cards + action strip are glass; data-explain hooks kept",
    (rate.match(/gc-card/g) || []).length === 5 && ["rateHeadwind", "rateMonitor", "rateHist", "rateCurve30"].every(function (k) { return rate.indexOf('data-explain="' + k + '"') > 0; }) &&
    /10Y ≥ 4\.60% \(High Alert\)/.test(textOf(rate)) && /Current Yield/.test(rate) && /ข้อมูล ณ/.test(textOf(rate)));
  t("30Y healthy → calm card; 10Y high alert → danger card", /mr-card mr-calm mr-rate-card gc-card gc-calm[\s\S]*?\(\^TYX\)/.test(rate) && /mr-card mr-danger mr-rate-card gc-card gc-danger[\s\S]*?\(\^TNX\)/.test(rate));
  t("info buttons are real <button>s with aria-label + gc-info", (all.match(/<button class="mr-info gc-info" type="button" data-explain="[a-zA-Z0-9]+" aria-label="คำอธิบาย [^"]+">i<\/button>/g) || []).length >= 12);
  t("warnings list sits in a danger glass card (a danger flag is active)", /mr-warn-card gc-card gc-danger"><ul class="mr-warn-list gc-list">/.test(els.mrWarnings.innerHTML) && /🔴 ทดสอบธงเสี่ยง/.test(els.mrWarnings.innerHTML));
  t("reference strip: 7 tiles, empty VIXEQ values are neutral", (els.mrEquityRef.innerHTML.match(/mr-ref-cell gc-card gc-tile/g) || []).length === 7 && (els.mrEquityRef.innerHTML.match(/gc-tile gc-neutral/g) || []).length === 2);
  // each tile's colour = zoneOf(interp(value, that tile's anchors)) — REF_DEFS read from the page source itself
  var refCtx = {};
  vm.createContext(refCtx);
  [/var VIX_ANCHORS = \[[^\n]*;/, /var VVIX_ANCHORS = \[[^\n]*;/, /var REF_DEFS = \[[\s\S]*?\n  \];/].forEach(function (re) {
    var src = PAGE.match(re); if (!src) throw new Error("REF_DEFS / anchors not found in market-risk-page.js: " + re);
    vm.runInContext(src[0], refCtx);
  });
  var refHtml = els.mrEquityRef.innerHTML, m0 = API.metrics, hasVixeq = Number(m0.vixeq) > 0;
  var refRows = refCtx.REF_DEFS.map(function (def) {
    var raw = Number(m0[def.key]), v = (def.needVixeq && !hasVixeq) || !isFinite(raw) ? null : raw;
    var want = v == null ? "neutral" : MD.zoneOf(MD.interp(v, def.anchors));
    var lab = def.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    var got = new RegExp('<div class="mr-ref-cell gc-card gc-tile gc-([a-z]+)"><span>' + lab + "</span>").exec(refHtml);
    return { label: def.label, want: want, got: got ? got[1] : null };
  });
  var refBad = refRows.filter(function (r) { return r.got !== r.want; });
  var refTones = refRows.map(function (r) { return r.want; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
  t("reference tiles: each gc-<tone> = zoneOf(interp(value, its anchors)); the data covers all 5 tones",
    refRows.length === 7 && refBad.length === 0 && refTones.length === 5, refBad.length ? refBad : refTones);
  t("API text is escaped: no raw <img anywhere; the flag row and the score label show the escaped text",
    all.indexOf("<img") < 0 && els.mrWarnings.innerHTML.indexOf("🔴 ทดสอบธงเสี่ยง " + HOSTILE_ESC + " — VVIX = 95") >= 0 &&
    eq.indexOf('<div class="mr-sub gc-meta">Hedge / Reduce Risk ' + HOSTILE_ESC + "</div>") >= 0 && textOf(eq).indexOf("Hedge / Reduce Risk " + HOSTILE) >= 0);
  t("verdict is a glass card with a glowing dot", /<div class="mr-verdict mr-danger gc-card gc-danger"><div class="mr-verdict-main"><span class="mr-verdict-dot gc-dot"><\/span>/.test(els.mrVerdict.innerHTML));

  // ---- missing data has no tone: gc-neutral like every other page, never the violet "ปกติ" (normal)
  console.log("== missing data → gc-neutral (zoneOf / rateTone) ==");
  function cardChunk(html, text) { return html.split("<article").slice(1).filter(function (c) { return c.indexOf(text) >= 0; })[0] || ""; }
  function classOf(chunk) { var m = /^ class="([^"]*)"/.exec(chunk); return m ? m[1] : ""; }
  function gcOf(chunk) { return (classOf(chunk).match(/\bgc-(calm|normal|warning|danger|neutral)\b/g) || []).join("+"); }
  function pillOf(chunk) { var m = /<span class="mr-tone-pill gc-pill">([^<]*)<\/span>/.exec(chunk); return m ? m[1] : null; }
  t("zoneOf(null / undefined) → no zone (\"\"); real values keep their zones (0 calm · 49.9 normal · 50 warning · 75 danger)",
    MD.zoneOf(null) === "" && MD.zoneOf(undefined) === "" && MD.zoneOf(0) === "calm" && MD.zoneOf(49.9) === "normal" && MD.zoneOf(50) === "warning" && MD.zoneOf(75) === "danger",
    [MD.zoneOf(null), MD.zoneOf(undefined)]);
  var gapEq = GAP.els.mrEquityCards.innerHTML, gapRate = GAP.els.mrRateBody.innerHTML;
  var sc = cardChunk(gapEq, "Equity Risk Score");
  t("no equity score: Equity Risk Score card → gc-neutral, pill \"—\" (not ปกติ), value —/100, no ring / zone bar, no mr-normal hook",
    gcOf(sc) === "gc-neutral" && pillOf(sc) === "—" && textOf(sc).indexOf("—/100") >= 0 && sc.indexOf("gc-ring") < 0 && sc.indexOf("gc-zone") < 0 && !/\bmr-normal\b/.test(classOf(sc)),
    [classOf(sc), pillOf(sc)]);
  var r30 = cardChunk(gapRate, "(^TYX)"), r10 = cardChunk(gapRate, "(^TNX)");
  t("no 30Y bars: its rate card → gc-neutral with pill \"—\" (no mr-normal); the 10Y card keeps its own tone (danger)",
    gcOf(r30) === "gc-neutral" && pillOf(r30) === "—" && !/\bmr-normal\b/.test(classOf(r30)) && gcOf(r10) === "gc-danger", [classOf(r30), pillOf(r30), gcOf(r10)]);
  var gapAll = IDS.map(function (id) { return GAP.els[id].innerHTML; }).join("\n");
  var gapCards = gapAll.split("<article").slice(1);
  var gapBad = gapCards.filter(function (c) { return gcOf(c).split("+").length !== 1 || !gcOf(c) || (gcOf(c) === "gc-neutral" && pillOf(c) === "ปกติ"); });
  t("gap page: every card is one-tone glass and no gc-neutral card reads \"ปกติ\" (" + gapCards.length + " cards)", gapCards.length >= 8 && gapBad.length === 0,
    gapBad.map(function (c) { return classOf(c) + " · " + pillOf(c); }));

  console.log("== spark() / zoneBar() ==");
  var s = MD.spark([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "danger");
  var dot = /gc-spark-dot" style="left:([\d.]+)%;top:([\d.]+)%"/.exec(s);
  t("spark: white line, no tone colour, end dot at the last point (top-right for a rising series)",
    /class="gc-spark-line"[^>]*stroke="#fff"/.test(s) && !/#f43f5e|#f59e0b|#34d399|#64748b/.test(s) && !!dot && dot[1] === (292 / 300 * 100).toFixed(2) && dot[2] === (8 / 64 * 100).toFixed(2), dot);
  var s2 = MD.spark([5, 5, 5, 5, 5, 5, 5, 5, 5, 5], "calm");
  t("spark: flat series has no NaN; area fill + dashed now-line present", !/NaN|Infinity/.test(s2) && /class="gc-spark-area"/.test(s2) && /class="gc-spark-now"[^>]*stroke-dasharray/.test(s2));
  t("spark: < 10 points or null → empty", MD.spark([1, 2, 3], "calm") === "" && MD.spark(null) === "");
  var ids = (els.mrMacroCards.innerHTML + rate).match(/id="(mrSparkFill\d+)"/g) || [];
  t("spark gradient ids are unique on the page", ids.length >= 6 && ids.length === ids.filter(function (v, i, a) { return a.indexOf(v) === i; }).length, ids.length);
  function knobAt(html) { var k = /gc-knob" style="left:([\d.]+)%"/.exec(html); return k ? k[1] : null; }
  function lit(html) { return (html.match(/gc-zone-seg gc-lit/g) || []).length; }
  t("zoneBar(r) puts the knob at r% (0 · 37.5 · 100) and clamps (−5 → 0, 140 → 100)",
    knobAt(MD.zoneBar(0)) === "0.0" && knobAt(MD.zoneBar(37.5)) === "37.5" && knobAt(MD.zoneBar(100)) === "100.0" && knobAt(MD.zoneBar(-5)) === "0.0" && knobAt(MD.zoneBar(140)) === "100.0");
  t("zoneBar lights segments up to the knob's zone (0→1 · 25→2 · 50→3 · 75→4 · 76→4); null → empty",
    lit(MD.zoneBar(0)) === 1 && lit(MD.zoneBar(25)) === 2 && lit(MD.zoneBar(50)) === 3 && lit(MD.zoneBar(75)) === 4 && lit(MD.zoneBar(76)) === 4 && MD.zoneBar(null) === "",
    [0, 25, 50, 75, 76].map(function (r) { return r + "→" + lit(MD.zoneBar(r)); }).join(" "));
  // the bar must agree with the card colour: lit segments = zoneOf's zone (boundaries 25/50/75 belong to the upper zone)
  var ZONE_N = { calm: 1, normal: 2, warning: 3, danger: 4 };
  var zoneMismatch = [0, 24.9, 25, 49.9, 50, 74.9, 75, 100].filter(function (r) { return lit(MD.zoneBar(r)) !== ZONE_N[MD.zoneOf(r)]; });
  t("zoneBar lit count matches zoneOf at 0 · 24.9 · 25 · 49.9 · 50 · 74.9 · 75 · 100", zoneMismatch.length === 0,
    zoneMismatch.map(function (r) { return r + ": lit " + lit(MD.zoneBar(r)) + " vs " + MD.zoneOf(r); }).join(", "));
  t("zoneBar keeps the four Thai labels and the old hooks", textOf(MD.zoneBar(50)) === "ผ่อนคลายปกติจับตาเสี่ยง" && /class="mr-bar gc-zone-track"/.test(MD.zoneBar(50)) && /mr-bar-labels gc-zone-labels/.test(MD.zoneBar(50)));

  console.log("");
  console.log(pass + fail + " checks · " + pass + " passed · " + fail + " failed");
  process.exit(fail ? 1 : 0);
}).catch(function (e) { console.error("test crashed:", e); process.exit(1); });
