// Bitcoin Monitor on glass (2026-11-22) — every card of the three tabs wears glass-cards.css
//   node scripts/bitcoin-monitor-glass-test.js
//
// What must stay true:
//   · bitcoin-monitor.html loads /glass-cards.css once, after mission-control.css and before the page's own CSS.
//   · a card's tone is a status the page ALREADY computes (and paints) — never a new one:
//       Monitor  — hero tiles (action / valuation zone: toneColor · risk: low/medium/high), Buy Zone (bz.tone),
//                  metric tiles (zoneTag under/fair/expensive/over · na), Deep Dive tiles (tag green/gray/amber/red ·
//                  blue baseline), every other card gc-neutral; the nested Data & Sources panels stay wells.
//       Intelligence — verdict (decision tone), forecast (bias), every other section gc-neutral.
//       สภาพคล่อง — BALI / BTC tiles by the gl-pos / gl-neg sign, everything else gc-neutral.
//   · new code is ES5; no dot-matrix font; Bitcoin Monitor shows no portfolio money (no /api/portfolio read).
// The pages run for real in a vm with synthetic market data — no network, no portfolio documents.
"use strict";
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var ROOT = path.join(__dirname, "..");
var PUB = path.join(ROOT, "public");
function read(f) { return fs.readFileSync(path.join(PUB, f), "utf8"); }
var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; console.log("  PASS  " + name); }
  else { fail++; console.log("  FAIL  " + name + (extra != null ? " — " + (typeof extra === "string" ? extra : JSON.stringify(extra)) : "")); }
}
var TONES = ["gc-calm", "gc-normal", "gc-warning", "gc-danger", "gc-neutral"];
function toneOf(cls) { var m = String(cls).match(/\bgc-(calm|normal|warning|danger|neutral)\b/g) || []; return m.length === 1 ? m[0] : (m.length ? "MANY:" + m.join("+") : null); }

// ------------------------------------------------------------------ HTML / CSS
console.log("== page loads the glass ==");
var HTML = read("bitcoin-monitor.html");
function sheetIndex(file) { return HTML.indexOf('href="/' + file + "?v="); }
var iMC = sheetIndex("mission-control.css"), iGC = sheetIndex("glass-cards.css"), iBM = sheetIndex("bitcoin-monitor.css"), iBI = sheetIndex("bitcoin-intelligence.css");
t("glass-cards.css loaded exactly once", (HTML.match(/\/glass-cards\.css\?v=/g) || []).length === 1);
t("order: mission-control.css → glass-cards.css → bitcoin-monitor.css → bitcoin-intelligence.css", iMC > 0 && iGC > iMC && iBM > iGC && iBI > iBM, [iMC, iGC, iBM, iBI]);
t("Inter 700 is loaded (numbers are Inter 700 tabular)", /fonts\.googleapis\.com\/css2\?family=Inter:wght@[^"&]*700/.test(HTML));
var CSS_BM = read("bitcoin-monitor.css"), CSS_BI = read("bitcoin-intelligence.css");
t("no dot-matrix / LED numeral font in the page CSS", !/doto|dot-?matrix|\bLED\b|DSEG/i.test(CSS_BM + CSS_BI));
t("glass token map: inside #btcRoot .gc-card the --mc-* ink is the glass ink + lifted hues", /#btcRoot \.gc-card \{[^}]*--mc-text: var\(--gc-ink\);[^}]*--mc-muted: var\(--gc-ink-2\);[^}]*--mc-emerald: #7cf5c6;/.test(CSS_BM));
// the shell switches its own decorations off under glass (2026-11-22 integration) — no page copy of those rules any more
var CSS_MC = read("mission-control.css").replace(/\/\*[\s\S]*?\*\//g, "");
t("light theme cannot repaint the hero / tiles white: mission-control.css's light .mc-page-hero / .mc-metric faces skip .gc-card (no page copy)",
  /html\[data-theme="light"\] \.mc-page-hero:not\(\.gc-card\) \{/.test(CSS_MC) && /html\[data-theme="light"\] \.mc-metric:not\(\.gc-card\) \{/.test(CSS_MC) &&
  !/html\[data-theme="light"\][^{]*#btcRoot \.mc-(page-hero|metric)\.gc-card/.test(CSS_BM));
t("no blur behind the glass: mission-control.css .mc-card.gc-card, .gc-card .mc-card { backdrop-filter: none } (no page copy)",
  /\.mc-card\.gc-card,\s*\.gc-card \.mc-card \{[^}]*(^|[^-])backdrop-filter: none/.test(CSS_MC) && !/#btcRoot \.mc-card\.gc-card/.test(CSS_BM));
t("hero glass card keeps its page layout (display: block · padding) and the tile figure font rule",
  /#btcRoot \.mc-page-hero\.gc-card \{ display: block; padding: 24px 26px; \}/.test(CSS_BM) && /#btcRoot \.mc-metric\.gc-card \.mc-value \{ font-family: var\(--gc-num-font\)/.test(CSS_BM));
t("the old Buy Zone stripe (.btc-acc-*) and verdict stripe (.bi-vd border-left 5px) are gone", !/\.btc-acc-(bull|bear|warn|neutral)\s*\{/.test(CSS_BM) && !/\.bi-vd \{ border-left: 5px/.test(CSS_BI));

// ------------------------------------------------------------------ grids never wider than their glass card (fix round 1)
// The glass has overflow:hidden, so a grid wider than its card hides cards for good (Similar Cases lost cases 4/5/9/10 and
// their Replay buttons at 1024–1366). Each grid below has ONE column rule at every width — no fixed count, no breakpoint.
console.log("== grids fit their glass card at every width ==");
function cssRules(css) {
  var out = [], re = /([^{}]+)\{([^{}]*)\}/g, m, body = css.replace(/\/\*[\s\S]*?\*\//g, "");
  while ((m = re.exec(body)) !== null) {
    var pre = m[1].trim();
    out.push({ sel: pre.split(",").map(function (s) { return s.trim(); }), body: m[2], at: m.index });
  }
  // a rule is inside @media when the nearest unmatched "{" before it belongs to an @media prelude
  out.forEach(function (r) {
    var depth = 0, i = r.at - 1;
    for (; i >= 0; i--) { var ch = body.charAt(i); if (ch === "}") depth++; else if (ch === "{") { if (depth === 0) break; depth--; } }
    r.media = i >= 0 && /@media[^{}]*$/.test(body.slice(0, i));
  });
  return out;
}
var BI_RULES = cssRules(CSS_BI), BM_RULES = cssRules(CSS_BM);
function colsOf(rules, cls) {
  var hits = [];
  rules.forEach(function (r) {
    if (!r.sel.some(function (s) { return new RegExp("\\." + cls + "(?![\\w-])").test(s); })) return;
    var m = /grid-template-columns\s*:\s*([^;]+)/.exec(r.body);
    if (m) hits.push({ sel: r.sel.join(", "), v: m[1].trim(), media: r.media });
  });
  return hits;
}
[["bi-cases-grid", "repeat(auto-fill, minmax(min(100%, 232px), 1fr))", "a case card needs 204–227px"],
 ["bi-out-grid", "repeat(auto-fit, minmax(min(100%, 110px), 1fr))", "6 outcome cells, nested in 🔬"],
 ["bi-pb-exs", "repeat(auto-fit, minmax(min(100%, 150px), 1fr))", "5 playbook examples, nested in 🔬"],
 ["bi-combo-grid", "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", "combo cards, nested in 🔬"]].forEach(function (g) {
  var hits = colsOf(BI_RULES, g[0]);
  t("." + g[0] + ": exactly one column rule, no @media override — " + g[1] + " (" + g[2] + ")",
    hits.length === 1 && !hits[0].media && hits[0].v === g[1], hits);
});
t("no fixed column count is left for those grids anywhere (repeat(<n>, 1fr) would overflow again)",
  ["bi-cases-grid", "bi-out-grid", "bi-pb-exs", "bi-combo-grid"].every(function (c) { return colsOf(BI_RULES, c).every(function (h) { return !/repeat\(\d/.test(h.v); }); }));
(function () {
  var nm = BI_RULES.filter(function (r) { return r.sel.indexOf(".bi-cyc-sim-name") >= 0 && r.sel.indexOf(".bi-cyc-path-name") >= 0; });
  t("🌀 Cycle similarity / path names wrap (no ellipsis cut, no nowrap)", nm.length === 1 && !/text-overflow|white-space:\s*nowrap|overflow:\s*hidden/.test(nm[0].body) && /overflow-wrap:\s*anywhere/.test(nm[0].body), nm.map(function (r) { return r.body.trim(); }));
})();
(function () {
  var rs = BI_RULES.filter(function (r) { return r.sel.indexOf("#btcRoot .bi-research-body > .gc-card") >= 0 && !r.media; });
  t("🔬 sections nested in Research scroll sideways inside their own card (overflow-x: auto) instead of being cut by the glass",
    rs.length === 1 && /overflow-x\s*:\s*auto/.test(rs[0].body) && /overflow-y\s*:\s*hidden/.test(rs[0].body), rs.map(function (r) { return r.body.trim(); }));
})();
(function () {
  var st = BI_RULES.filter(function (r) { return r.sel.length === 1 && r.sel[0] === ".bi-pb-risk-st"; });
  var red = BI_RULES.filter(function (r) { return r.sel.length === 1 && r.sel[0] === ".bi-pb-r"; });
  t("Playbook risk word (.bi-pb-risk-st) drops the dot's background → its colour is text, not text-on-itself (was 1:1)",
    st.length === 1 && /background\s*:\s*none/.test(st[0].body) && red.length === 1 && st[0].at > red[0].at);
  var ref = BM_RULES.filter(function (r) { return r.sel.indexOf("#btcRoot .gc-card .btc-ref-btn") >= 0; });
  t("reference-link pills wrap inside their tile on the glass (white-space: normal, max-width 100%)",
    ref.length === 1 && /white-space\s*:\s*normal/.test(ref[0].body) && /max-width\s*:\s*100%/.test(ref[0].body));
  var first = BM_RULES.filter(function (r) { return r.sel.indexOf(".btc-chart-inner > .btc-yl + .btc-xl") >= 0; });
  var last = BM_RULES.filter(function (r) { return r.sel.indexOf(".btc-chart-inner > .btc-xl:last-child") >= 0; });
  t("chart: first date anchored left (no -50%), last date anchored right (-100%) — both stay inside the card",
    first.length === 1 && /transform\s*:\s*none/.test(first[0].body) && last.length === 1 && /translateX\(-100%\)/.test(last[0].body));
})();

// ------------------------------------------------------------------ ES5 in the new code
console.log("== new code is ES5 ==");
var SRC_BM = read("bitcoin-monitor-page.js"), SRC_BI = read("bitcoin-intelligence-page.js"), SRC_GL = read("global-liquidity-page.js");
function gcLines(src) { return src.split("\n").filter(function (l) { return /^\s*(var|const|let|function)\s+(GC_|gcTone|gcSignTone)/.test(l); }); }
var gcl = gcLines(SRC_BM).concat(gcLines(SRC_BI), gcLines(SRC_GL));
t("tone maps / helpers are declared with var + function (" + gcl.length + " lines)", gcl.length >= 7 && gcl.every(function (l) { return !/\b(const|let)\b|=>|`/.test(l); }), gcl.filter(function (l) { return /\b(const|let)\b|=>|`/.test(l); }));
t("global-liquidity-page.js stays ES5 (no const / let / arrow / template literal)", !/\bconst\s|\blet\s|=>|`/.test(SRC_GL.replace(/\/\/[^\n]*/g, "")));
t("the page reads no portfolio document (no /api/portfolio) — no money to mask", !/\/api\/portfolio/.test(SRC_BM + SRC_BI + SRC_GL + read("btc-onchain-live.js")));

// ------------------------------------------------------------------ Monitor tab, run for real
console.log("== Monitor tab · tones from the page's own statuses ==");
var DAY = 86400000;
function ymd(ms) { return new Date(ms).toISOString().slice(0, 10); }
function runMonitor(sc) {
  var root = { innerHTML: "", querySelector: function () { return null; }, querySelectorAll: function () { return []; } };
  var store = {};
  var metrics = {};
  Object.keys(sc.api).forEach(function (k) { metrics[k] = { value: sc.api[k], source: "Synthetic", freshness: "D1", date: ymd(Date.now() - DAY) }; });
  store.btc_monitor_api_v1 = JSON.stringify({ metrics: metrics, fetchedAt: new Date().toISOString(), providers: {} });
  var bgeo = {};
  Object.keys(sc.bgeo).forEach(function (k) { bgeo[k] = { value: sc.bgeo[k], date: ymd(Date.now() - DAY) }; });
  var closes = [], dates = [];
  for (var i = 0; i < 260; i++) { closes.push(sc.tech.latestClose * (0.8 + 0.2 * i / 259)); dates.push(ymd(Date.now() - (259 - i) * DAY)); }
  var snap = { loadedAt: new Date().toISOString(), technicalSignals: { BTCUSD: sc.tech }, historicalData: { BTCUSD: { closes: closes, dates: dates } } };
  var ctx = {
    console: console,
    document: { readyState: "complete", getElementById: function (id) { return id === "btcRoot" ? root : null; }, addEventListener: function () {} },
    localStorage: { getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; }, setItem: function (k, v) { store[k] = String(v); } },
    fetch: function () { return new Promise(function () {}); },   // stays "loading" — no network
    addEventListener: function () {},
    PortfolioDataSnapshot: { read: function () { return snap; } },
    BtcOnchainLive: { get: function () { return { metrics: bgeo }; }, load: function () {} }
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(SRC_BM, ctx, { filename: "bitcoin-monitor-page.js" });
  return root.innerHTML;
}
function chunks(html, opener) { return html.split(opener).slice(1).map(function (c) { return c.slice(0, c.indexOf('">')); }); }
function cardsAfter(html, opener) { return html.split(opener).slice(1); }

var ZONE_TONE = { "ต่ำกว่ามูลค่า": "gc-calm", "ปกติ": "gc-normal", "แพง": "gc-warning", "ร้อนเกินไป": "gc-danger", "ไม่มีข้อมูล": "gc-neutral" };
var DD_TONE = { "ถูกสุดขั้ว": "gc-calm", "ต่ำ": "gc-calm", "ยอมแพ้": "gc-calm", "ความหวัง": "gc-calm", "ยอมขายขาดทุน": "gc-calm", "ขายขาดทุนเล็กน้อย": "gc-calm", "แรงซื้อเยอะ": "gc-calm", "ถูกล็อกเยอะ": "gc-calm",
  "กลาง": "gc-normal", "ลังเล": "gc-normal", "ขายมีกำไร": "gc-normal", "ปกติ": "gc-normal", "ระดับกลาง": "gc-normal",
  "สูง": "gc-warning", "เชื่อมั่น": "gc-warning", "กำไรหนา ระวัง": "gc-warning", "เริ่มตึง": "gc-warning",
  "ยอดดอย": "gc-danger", "ยูโฟเรีย": "gc-danger", "แรงซื้อหมด": "gc-danger", "เส้นฐาน": "gc-neutral" };
var COLOR_TONE = { "var(--mc-emerald)": "gc-calm", "var(--mc-blue)": "gc-normal", "var(--mc-amber)": "gc-warning", "var(--mc-red)": "gc-danger" };
var BZ_TONE = { bull: "gc-calm", neutral: "gc-normal", warn: "gc-warning", bear: "gc-danger" };

var SCENARIOS = {
  cheap: { tech: { latestClose: 60000, ema12: 61000, ema26: 59000, sma200: 55000, rsi14: 45, volumeRatio: 1.1, latestDate: ymd(Date.now()) },
    api: { mvrvRatio: 0.8, puellMultiple: 0.4, fearGreed: 15, fundingRate: -0.01, openInterest: 3e10, takerBuySellRatio: 1.1, longShortRatio: 1.5 },
    bgeo: { mvrvZScore: -0.5, nupl: -0.1, realizedPrice: 45000, sopr: 0.97, ssr: 5, lthSupply: 16e6 } },
  mid: { tech: { latestClose: 70000, ema12: 69000, ema26: 70500, sma200: 72000, rsi14: 50, volumeRatio: 1, latestDate: ymd(Date.now()) },
    api: { mvrvRatio: 1.5, puellMultiple: 1.0, fearGreed: 50, fundingRate: 0.005 },
    bgeo: { mvrvZScore: 3, nupl: 0.3, realizedPrice: 50000, sopr: 1.02, ssr: 15, lthSupply: 14e6 } },
  warm: { tech: { latestClose: 90000, ema12: 91000, ema26: 88000, sma200: 70000, rsi14: 62, volumeRatio: 1, latestDate: ymd(Date.now()) },
    api: { mvrvRatio: 2.5, puellMultiple: 2, fearGreed: 60, fundingRate: 0.02 },
    bgeo: { mvrvZScore: 6, nupl: 0.6, realizedPrice: 52000, sopr: 1.05, ssr: 30, lthSupply: 14e6 } },
  hot: { tech: { latestClose: 110000, ema12: 112000, ema26: 105000, sma200: 80000, rsi14: 78, volumeRatio: 1.3, latestDate: ymd(Date.now()) },
    api: { mvrvRatio: 3.8, puellMultiple: 4.5, fearGreed: 90, fundingRate: 0.07 },
    bgeo: { mvrvZScore: 7.5, nupl: 0.8, realizedPrice: 55000, sopr: 1.05, ssr: 45, lthSupply: 14e6 } }
};
var seen = { metric: {}, dd: {}, hero: {}, bz: {} };
Object.keys(SCENARIOS).forEach(function (name) {
  var html;
  try { html = runMonitor(SCENARIOS[name]); } catch (e) { t(name + ": Monitor renders in the vm", false, e.stack); return; }
  t(name + ": Monitor tab rendered (hero + Buy Zone + Deep Dive)", /mc-page-hero/.test(html) && /btc-acc-/.test(html) && /btc-dd-card/.test(html), html.slice(0, 200));

  // metric tiles: tone = the zone chip shown on the tile
  var bad = [], n = 0;
  cardsAfter(html, '<div class="mc-card btc-ind-card').forEach(function (c) {
    var cls = c.slice(0, c.indexOf('">')), title = (/btc-ind-title">([^<]*)/.exec(c) || [])[1], zone = (/class="btc-zone"[^>]*>([^<]*)</.exec(c) || [])[1];
    var want = ZONE_TONE[zone], got = toneOf(cls); n++;
    seen.metric[got] = 1;
    if (!/\bgc-card\b/.test(cls) || !/\bgc-tile\b/.test(cls) || got !== want) bad.push(title + ": " + zone + " → " + got + " (want " + want + ")");
  });
  t(name + ": " + n + " metric tiles — tone = their zone chip (ถูก calm · ปกติ normal · แพง warning · ร้อน danger · ไม่มีข้อมูล neutral)", n >= 10 && bad.length === 0, bad);

  // Deep Dive tiles: tone = the tag colour (blue baseline / no value = neutral)
  bad = []; n = 0;
  cardsAfter(html, '<div class="mc-card btc-dd-card').forEach(function (c) {
    var cls = c.slice(0, c.indexOf('">')), title = (/btc-dd-title">([^<]*)/.exec(c) || [])[1], tag = (/class="btc-dd-tag"[^>]*>([^<]*)</.exec(c) || [])[1];
    var want = tag == null ? "gc-neutral" : DD_TONE[tag], got = toneOf(cls); n++;
    seen.dd[got] = 1;
    if (!/\bgc-card\b/.test(cls) || !/\bgc-tile\b/.test(cls) || got !== want) bad.push(title + ": " + tag + " → " + got + " (want " + want + ")");
  });
  t(name + ": 6 Deep Dive tiles — tone = their tag colour", n === 6 && bad.length === 0, bad);

  // hero tiles: tone agrees with the colour the tile already paints (price: no status)
  bad = []; n = 0;
  cardsAfter(html, '<div class="mc-card mc-metric mc-glow').forEach(function (c) {
    var cls = c.slice(0, c.indexOf('">')), label = (/mc-label"><span>([^<]*)/.exec(c) || [])[1], col = (/class="mc-value" style="[^"]*color:([^";]*)/.exec(c) || [])[1];
    var value = (/class="mc-value"[^>]*>([^<]*)</.exec(c) || [])[1];
    var want = label === "BTC Price" || value === "—" ? "gc-neutral" : COLOR_TONE[col], got = toneOf(cls); n++;
    seen.hero[got] = 1;
    if (!/\bgc-card\b/.test(cls) || got !== want) bad.push(label + ": " + col + " → " + got + " (want " + want + ")");
  });
  t(name + ": 4 hero tiles — tone agrees with the colour each already paints", n === 4 && bad.length === 0, bad);

  // Buy Zone card: tone = bz.tone (btc-acc-<tone>)
  var bz = /class="mc-card mc-panel mc-fade btc-acc-(\w+) ([^"]*)"/.exec(html);
  if (bz) seen.bz[toneOf(bz[2])] = 1;
  t(name + ": Buy Zone card tone = bz.tone (" + (bz && bz[1]) + " → " + (bz && toneOf(bz[2])) + ")", !!bz && /\bgc-card\b/.test(bz[2]) && toneOf(bz[2]) === BZ_TONE[bz[1]]);

  // every other card: neutral glass · the Data & Sources inner panels are wells (no second glass)
  var body = html.slice(html.indexOf('id="btcTabBody"'));
  var dsAt = body.indexOf('btc-datasrc-body">');
  var outer = dsAt < 0 ? body : body.slice(0, dsAt);
  var inner = dsAt < 0 ? "" : body.slice(dsAt);
  var panels = chunks(outer, '<section class="mc-card mc-panel').concat(chunks(outer, '<details class="mc-card mc-panel'), chunks(outer, '<section class="mc-page-hero'));
  var notGlass = panels.filter(function (cls) { return !/\bgc-card\b/.test(cls) || TONES.indexOf(toneOf(cls)) < 0; });
  var notNeutral = panels.filter(function (cls) { return !/btc-acc-/.test(cls) && toneOf(cls) !== "gc-neutral"; });
  t(name + ": all " + panels.length + " top-level cards are glass; all but the Buy Zone are gc-neutral", panels.length >= 10 && notGlass.length === 0 && notNeutral.length === 0, { notGlass: notGlass, notNeutral: notNeutral });
  var wells = chunks(inner, '<section class="mc-card mc-panel');
  t(name + ": the 4 panels inside Data & Sources stay wells (no nested glass)", wells.length === 4 && wells.every(function (cls) { return !/\bgc-card\b/.test(cls); }), wells);
  t(name + ": Data & Sources inputs are gc-field; its buttons gc-btn (ids kept)", /<input type="number" class="gc-field"[^>]*data-oc="/.test(inner) && /class="mc-btn mc-btn-primary gc-btn" id="btcSave"/.test(inner) && /class="mc-btn gc-btn gc-btn-ghost" id="btcClear"/.test(inner));
});
t("across the scenarios metric tiles produce every tone (calm · normal · warning · danger · neutral)", TONES.every(function (k) { return seen.metric[k]; }), Object.keys(seen.metric));
t("across the scenarios Deep Dive tiles produce every tone", TONES.every(function (k) { return seen.dd[k]; }), Object.keys(seen.dd));
t("hero tiles produce calm · warning · danger (+ neutral price)", ["gc-calm", "gc-warning", "gc-danger", "gc-neutral"].every(function (k) { return seen.hero[k]; }), Object.keys(seen.hero));
t("Buy Zone card produces at least calm and danger", seen.bz["gc-calm"] && seen.bz["gc-danger"], Object.keys(seen.bz));

// no-price state: the provider bar on its own is a glass card
(function () {
  var html = runMonitor({ tech: {}, api: {}, bgeo: {} });
  var mb = /class="mc-card mc-panel mc-fade btc-modebar([^"]*)"/.exec(html);
  t("no price yet: the provider bar stands alone as gc-card gc-neutral; the empty card too", !!mb && /gc-card gc-neutral/.test(mb[1]) && /btc-empty gc-card gc-neutral/.test(html), mb && mb[1]);
})();

// ------------------------------------------------------------------ Intelligence tab
console.log("== Intelligence tab · verdict / forecast tones ==");
function runIntel() {
  var ctx = { console: console, addEventListener: function () {},
    document: { getElementById: function () { return null; }, createElement: function () { return { style: {}, appendChild: function () {} }; }, body: { appendChild: function () {} } } };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(SRC_BI, ctx, { filename: "bitcoin-intelligence-page.js" });
  return ctx.BitcoinIntelligenceUI;
}
var UI = runIntel();
function biOf(label, bias) {
  var bi = { available: true, meta: { bars: 4000, lastDate: "2026-11-21", mode: "incremental" },
    decision: { decision: { label: label, rationale: ["r1"] } },
    currentPattern: { date: "2026-11-21", close: 90000 }, patternScore: { total: 55 } };
  if (bias) {
    var proj = [], path = [];
    for (var k = 0; k <= 90; k++) proj.push({ k: k, p25: 95 + k * 0.01, p75: 105 + k * 0.05, median: 100 + k * 0.03 });
    for (var j = 0; j < 45; j++) path.push(95 + j * 0.1);
    bi.analogForecast = { windowDays: 45, projHorizon: 90, current: { path: path, conditions: [] }, projection: { points: proj },
      outcome: { 30: { median: 2, positivePct: 60, p25: -5, p75: 8 }, 60: { median: 3, positivePct: 61, p25: -6, p75: 10 }, 90: { median: 4, positivePct: 62, p25: -8, p75: 14 } },
      bias: bias, confidence: 55, topPaths: [], matches: [], summary: [], poolSize: 100, strongPool: 10 };
  }
  return { bitcoinIntelligence: bi };
}
var VERDICT = { "Accumulation": "gc-calm", "Neutral": "gc-normal", "Wait": "gc-warning", "Reduce Risk": "gc-danger", "Distribution": "gc-danger", "Something New": "gc-normal" };
Object.keys(VERDICT).forEach(function (label) {
  var h = UI.html(biOf(label));
  var m = /<section class="([^"]*)" id="bi-verdict">/.exec(h);
  t("verdict \"" + label + "\" → " + VERDICT[label] + " (the page's own decision tone; unknown label = its neutral fallback)", !!m && /\bgc-card\b/.test(m[1]) && toneOf(m[1]) === VERDICT[label], m && m[1]);
});
var BIAS = { bullish: "gc-calm", bearish: "gc-danger", neutral: "gc-normal" };
Object.keys(BIAS).forEach(function (b) {
  var h = UI.html(biOf("Neutral", b));
  var m = /<section class="([^"]*)" id="bi-forecast">/.exec(h);
  t("forecast bias " + b + " → " + BIAS[b], !!m && toneOf(m[1]) === BIAS[b], m && m[1]);
});
(function () {
  var h = UI.html(biOf("Wait", "bullish"));
  var secs = [];
  var re = /<section class="([^"]*)" id="(bi-[a-z0-9-]+)"[^>]*>/g, m;
  while ((m = re.exec(h)) !== null) secs.push({ cls: m[1], id: m[2] });
  var others = secs.filter(function (s) { return s.id !== "bi-verdict" && s.id !== "bi-forecast"; });
  t("every other Intelligence section is gc-card gc-neutral (" + others.map(function (s) { return s.id; }).join(", ") + ")",
    others.length >= 3 && others.every(function (s) { return /\bgc-card\b/.test(s.cls) && toneOf(s.cls) === "gc-neutral"; }), others);
  t("refresh bar is a neutral glass strip; its button wears gc-btn (data-bi-load kept)", /class="bi-refreshbar gc-card gc-strip gc-neutral"/.test(h) && /class="mc-btn mc-btn-primary bi-refresh-btn gc-btn" data-bi-load="1"/.test(h));
  var empty = UI.html({});
  t("no Intelligence yet: the empty card is gc-card gc-neutral", /class="mc-card mc-panel mc-fade bi-empty gc-card gc-neutral"/.test(empty));
  var nr = UI.html({ bitcoinIntelligence: { available: false, reason: "x" } });
  t("not ready: gc-card gc-neutral", /class="mc-card mc-panel mc-fade gc-card gc-neutral"/.test(nr));
})();

// ------------------------------------------------------------------ Liquidity tab
console.log("== สภาพคล่อง tab · stat tiles by the gl-pos / gl-neg sign ==");
function runGL(latest) {
  var ctx = { console: console, addEventListener: function () {}, dispatchEvent: function () {}, CustomEvent: function () {}, document: {} };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(SRC_GL, ctx, { filename: "global-liquidity-page.js" });
  var st = ctx.GlobalLiquidityUI._state;
  st.result = { available: true, latest: latest, bestLag: { weeks: 12, corr: 0.31, n: 300 }, lagScan: { 0: { corr: 0.2 } },
    options: { changeWeeks: 6, leadWeeks: 0 }, weeks: [], projection: null, notes: ["n"], coverage: { completeWeeks: 1, totalWeeks: 1, bojCarriedWeeks: 0 }, disclaimer: "d" };
  st.raw = { series: {} };
  return ctx.GlobalLiquidityUI.html();
}
function tiles(h) {
  return cardsAfter(h, '<div class="gl-card ').map(function (c) {   // trailing space: not the gl-cards grid
    return { cls: c.slice(0, c.indexOf('">')), label: (/<small>([^<]*)/.exec(c) || [])[1], b: (/<b class="([^"]*)"/.exec(c) || [])[1] };
  });
}
[{ baliPct: -1.2, btcPct: 3.4, want: ["gc-neutral", "gc-danger", "gc-calm", "gc-neutral"] },
 { baliPct: 0.8, btcPct: -2.1, want: ["gc-neutral", "gc-calm", "gc-danger", "gc-neutral"] },
 { baliPct: null, btcPct: null, want: ["gc-neutral", "gc-neutral", "gc-neutral", "gc-neutral"] }].forEach(function (c) {
  var h = runGL({ totalUsd: 2.1e7, date: "2026-11-15", baliPct: c.baliPct, btcPct: c.btcPct, btcClose: 90000 });
  var ts = tiles(h), got = ts.map(function (x) { return toneOf(x.cls); });
  var signOk = ts.slice(1, 3).every(function (x) { var tn = toneOf(x.cls); return tn === "gc-neutral" || (tn === "gc-danger") === /\bgl-neg\b/.test(x.b); });
  t("BALI " + c.baliPct + " · BTC " + c.btcPct + " → tiles " + got.join(" / ") + " (red sign = danger, green = calm, no value = neutral)",
    ts.length === 4 && got.join() === c.want.join() && signOk && ts.every(function (x) { return /\bgc-card gc-tile\b/.test(x.cls) && /\bgc-num\b/.test(x.b); }), got);
  if (c.baliPct === -1.2) {
    t("the liquidity section is one neutral glass card; tables are gc-table in a focusable gc-table-wrap", /<section class="gl-sec gc-card gc-neutral">/.test(h) &&
      /class="gl-tablewrap gc-table-wrap" tabindex="0" aria-label="[^"]+"><table class="gl-table gc-table">/.test(h));
    t("its reload button keeps data-gl-reload and wears gc-btn gc-btn-ghost", /class="mc-btn gc-btn gc-btn-ghost" data-gl-reload="1"/.test(h));
  }
});

// ------------------------------------------------------------------ 🔬 Research: Interpretation + Playbook tones (real engine)
// The engine runs in a vm on deterministic synthetic bars (as big-cache-consumers-test does); 🔬 is opened through the
// page's own click handler; then the decision label / playbook tone are varied to get one case per tone.
function finish() {
  console.log("");
  console.log(pass + fail + " checks · " + pass + " passed · " + fail + " failed");
  process.exit(fail ? 1 : 0);
}
function engineBars(n, end) {
  var out = [], px = 3000, s = 12345, t0 = Date.parse(end + "T00:00:00Z") - (n - 1) * DAY;
  for (var i = 0; i < n; i++) {
    s = (s * 1103515245 + 12345) % 2147483648;
    px = Math.max(100, px * (1 + 0.0009 + 0.0022 * Math.sin(i / 160) + ((s % 2001) - 1000) / 33000));
    out.push({ date: ymd(t0 + i * DAY), open: px, high: px * 1.012, low: px * 0.988, close: Math.round(px * 100) / 100, volume: 1000 + (s % 5000) });
  }
  return out;
}
(async function () {
  console.log("== 🔬 Research · Interpretation + Playbook tones (real engine on synthetic bars) ==");
  var BARS = engineBars(3300, "2026-11-20");
  function btcFetch(url) {
    var start = (/[?&]start=([0-9-]+)/.exec(String(url)) || [])[1] || "1900-01-01";
    var text = JSON.stringify({ bars: BARS.filter(function (b) { return b.date >= start; }) });
    return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve(JSON.parse(text)); }, text: function () { return Promise.resolve(text); } });
  }
  var store = {};
  var tabBody = { innerHTML: "", handlers: {}, addEventListener: function (type, fn) { (this.handlers[type] = this.handlers[type] || []).push(fn); } };
  var win = { console: console, setTimeout: setTimeout, clearTimeout: clearTimeout, Promise: Promise, fetch: btcFetch,
    localStorage: { getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; }, setItem: function (k, v) { store[k] = String(v); }, removeItem: function (k) { delete store[k]; } },
    addEventListener: function () {},
    document: { getElementById: function (id) { return id === "btcTabBody" ? tabBody : id === "bi-verdict" ? (tabBody.innerHTML.indexOf('id="bi-verdict"') >= 0 ? {} : null) : null },
      createElement: function () { return { style: {}, appendChild: function () {} }; }, body: { appendChild: function () {} } } };
  win.window = win; win.self = win;
  var ctx = vm.createContext(win);
  vm.runInContext(read("big-cache.js"), ctx, { filename: "big-cache.js" });
  vm.runInContext(read("bitcoin-intelligence.js"), ctx, { filename: "bitcoin-intelligence.js" });
  var bi = await win.BitcoinIntelligence.run({}, { fetch: btcFetch });
  var SN = { bitcoinIntelligence: bi };
  win.PortfolioDataSnapshot = { read: function () { return SN; } };
  vm.runInContext(SRC_BI, ctx, { filename: "bitcoin-intelligence-page.js" });
  var BUI = win.BitcoinIntelligenceUI;
  t("engine built a full Intelligence (decision + playbook + similar cases)", !!(bi && bi.available && bi.decision && bi.playbook && bi.playbook.state && (bi.similarCases || []).length),
    bi && { available: bi.available, playbook: !!bi.playbook, cases: (bi.similarCases || []).length });
  tabBody.innerHTML = BUI.html(SN);
  BUI.wire(tabBody);
  (tabBody.handlers.click || []).forEach(function (fn) { fn({ target: { closest: function (sel) { return sel === "[data-research]" ? {} : null; }, classList: { contains: function () { return false; } } } }); });
  var h = tabBody.innerHTML;
  t("🔬 opens through the page's own click handler (Interpretation + Playbook rendered)", /id="bi-interpret"/.test(h) && /id="bi-playbook"/.test(h), h.length);
  function secClass(html, id) { var m = new RegExp('<section class="([^"]*)" id="' + id + '"[^>]*>').exec(html); return m ? m[1] : null; }
  var others = [], re = /<section class="([^"]*)" id="(bi-[a-z0-9-]+)"[^>]*>/g, m;
  while ((m = re.exec(h)) !== null) if (["bi-verdict", "bi-forecast", "bi-interpret", "bi-playbook"].indexOf(m[2]) < 0) others.push({ id: m[2], cls: m[1] });
  // every 🔬 box scrolls sideways on narrow screens → it is a named region (role + aria-label = its title, no emoji)
  var body = h.slice(h.indexOf('class="bi-research-body"')), boxes = [], rb = /<section class="[^"]*" id="(bi-[a-z0-9-]+)"([^>]*)>/g, mb;
  while ((mb = rb.exec(body)) !== null) boxes.push({ id: mb[1], attrs: mb[2] });
  var unnamed = boxes.filter(function (b) { var al = (/aria-label="([^"]*)"/.exec(b.attrs) || [])[1] || ""; return !/role="region"/.test(b.attrs) || !/^[A-Za-z0-9฀-๿]/.test(al); });
  t("every 🔬 box (" + boxes.length + ") is role=\"region\" with an aria-label = its title (no leading emoji)", boxes.length >= 15 && unnamed.length === 0, unnamed);
  t("every other 🔬 section is gc-card gc-neutral (" + others.length + ": " + others.map(function (o) { return o.id; }).join(", ") + ")",
    others.length >= 8 && others.every(function (o) { return /\bgc-card\b/.test(o.cls) && toneOf(o.cls) === "gc-neutral"; }), others.filter(function (o) { return toneOf(o.cls) !== "gc-neutral"; }));
  t("🔬 renders the three reflowing grids (cases · outcome · playbook examples)", /class="bi-cases-grid"/.test(h) && /class="bi-out-grid"/.test(h) && /class="bi-pb-exs"/.test(h));
  var LABELS = { "Accumulation": "gc-calm", "Neutral": "gc-normal", "Wait": "gc-warning", "Reduce Risk": "gc-danger", "Distribution": "gc-danger" };
  var orig = bi.decision.decision.label;
  Object.keys(LABELS).forEach(function (label) {
    bi.decision.decision.label = label;
    var cls = secClass(BUI.html(SN), "bi-interpret");
    t("Interpretation \"" + label + "\" → " + LABELS[label] + " (same decision tone as the verdict)", !!cls && /\bgc-card\b/.test(cls) && toneOf(cls) === LABELS[label], cls);
  });
  bi.decision.decision.label = orig;
  var PB = { bull: "gc-calm", neutral: "gc-normal", warn: "gc-warning", bear: "gc-danger", "something-else": "gc-normal" };
  var origTone = bi.playbook.tone;
  Object.keys(PB).forEach(function (tn) {
    bi.playbook.tone = tn;
    var cls = secClass(BUI.html(SN), "bi-playbook");
    t("Playbook stance tone " + tn + " → " + PB[tn] + " (the page's dtone; unknown = its neutral)", !!cls && toneOf(cls) === PB[tn], cls);
  });
  bi.playbook.tone = origTone;
})().then(finish, function (e) { t("🔬 Research engine run", false, e && e.stack); finish(); });
