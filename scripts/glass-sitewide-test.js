// Glass cards — site-wide contract (2026-11)
//   node scripts/glass-sitewide-test.js
//
// PAGES lists every page that wears the shared glass cards (public/glass-cards.css). A page task appends its
// page name when it converts the page (batch 1: home · portfolio-manager · portfolio · thesis; then the rest).
// When glass-cards.css changes, bump GC_V here, in the file's own header, and on every page in PAGES.
//
// What must stay true:
//   · each page in PAGES: public/<page>.html loads Inter 700 and /glass-cards.css?v=<GC_V> exactly once, and the
//     EFFECTIVE stylesheet order — the static <link>s plus what app-navigation.js ensureStylesheet() injects, run for
//     real in a vm — is theme.css → mission-control.css (+ any injected shell sheet) → glass-cards.css → the page's own
//     stylesheets (on /home, mission-control-v2.css is page CSS and comes after glass-cards.css). So .gc-card wins over
//     shell styles at equal specificity, and page CSS can still adjust the glass.
//   · the page's own source (its HTML + the scripts it loads, shared shell scripts excluded; comments stripped)
//     renders gc-card in a class string — a mention in a comment does not count.
//   · every page that loads glass-cards.css is in PAGES and uses GC_V; GC_V names the gc-<n> in the file header.
//   · glass-cards.css stays page-agnostic: no Doto / dot-matrix / LED font, every class selector starts with gc-,
//     never .gc-grid / .gc-axis (SVG chart classes of public/app.js, older than the gc- prefix), and every clickable or
//     focusable piece (gc-btn, gc-btn-ghost, gc-field, gc-info, gc-table-wrap, plus any gc- class that sets
//     cursor:pointer or has a :hover rule) has its own :focus-visible outline.
//   · mission-control.css (the shell, loaded on every page) leaves the glass alone: its light-theme background rules
//     skip any element that also wears gc-card, the old blur / cyan mc-glow layer are off under glass, and a hidden
//     mc-btn stays hidden (the header's Retry Failed button).
//   · the shared pieces page tasks build on — gc-table (+ gc-table-wrap, gc-cell-num), gc-btn / gc-btn-ghost,
//     gc-field, gc-section-h — exist, are documented in the header block, and keep the contract below.
"use strict";
var fs = require("fs");
var path = require("path");

// ---- edit here when a page joins or the file is bumped ----
var PAGES = ["market-risk", "home", "portfolio-manager", "portfolio", "thesis",
  "index", "action-center", "accumulation-center", "asset", "bitcoin-monitor", "smart-dca", "thai-dr-monitor",
  "ai-cycle", "scanner", "backtest", "wave3", "adaptive-position", "catalyst-hunter", "decision-journal"];
var GC_V = "20261121-gc-2";

// shell / infrastructure scripts every page loads — never count as "the page renders glass cards"
var SHELL_SCRIPTS = ["theme.js", "api-auth.js", "privacy.js", "big-cache.js", "data-snapshot.js", "app-navigation.js"];

var ROOT = path.join(__dirname, "..");
var PUB = path.join(ROOT, "public");
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), "utf8"); }
var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; console.log("  PASS  " + name); }
  else { fail++; console.log("  FAIL  " + name + (extra != null ? " — " + (typeof extra === "string" ? extra : JSON.stringify(extra)) : "")); }
}

var CSS = read("public/glass-cards.css");
var BODY = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
var HEADER = (CSS.match(/^\/\*[\s\S]*?\*\//) || [""])[0];

// every style rule (top level and inside @media / @container): { sel: [selectors], body, i }
var RULES = (function () {
  var out = [], re = /([^{}]+)\{([^{}]*)\}/g, m;
  while ((m = re.exec(BODY)) !== null) {
    var prelude = m[1].trim();
    if (prelude.charAt(0) === "@") continue;
    out.push({ sel: prelude.split(",").map(function (s) { return s.trim().replace(/\s+/g, " "); }), body: m[2], i: m.index });
  }
  return out;
})();
function rulesWith(selector) { return RULES.filter(function (r) { return r.sel.indexOf(selector) >= 0; }); }
function decl(rules, prop) {
  // last declaration of `prop` across the given rules (cascade order inside this file)
  var v = null;
  rules.forEach(function (r) {
    var re = new RegExp("(?:^|;)\\s*" + prop.replace(/[-]/g, "\\-") + "\\s*:\\s*([^;]+)", "g"), m;
    while ((m = re.exec(r.body)) !== null) v = m[1].trim();
  });
  return v;
}
function px(v) { var m = /^(\d+(?:\.\d+)?)px$/.exec(String(v || "").trim()); return m ? Number(m[1]) : null; }
function attr(tag, name) {
  var m = new RegExp("\\s" + name + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))", "i").exec(tag);
  return m ? (m[1] != null ? m[1] : m[2] != null ? m[2] : m[3]) : null;
}
function stripHtmlComments(html) { return html.replace(/<!--[\s\S]*?-->/g, ""); }
// local stylesheets in document order, whatever the attribute order inside <link …>
function localSheets(html) {
  var out = [], re = /<link\b[^>]*>/gi, m;
  html = stripHtmlComments(html);
  while ((m = re.exec(html)) !== null) {
    var rel = attr(m[0], "rel"), href = attr(m[0], "href");
    if (!rel || !/(^|\s)stylesheet(\s|$)/i.test(rel) || !href || href.charAt(0) !== "/" || href.charAt(1) === "/") continue;
    var q = href.indexOf("?"), p = q < 0 ? href : href.slice(0, q), v = /[?&]v=([^&]*)/.exec(href);
    if (!/\.css$/.test(p)) continue;
    out.push({ file: p.slice(1), href: href, v: v ? v[1] : null, at: m.index });
  }
  return out;
}
function localScripts(html) {
  var out = [], re = /<script\b[^>]*>/gi, m;
  html = stripHtmlComments(html);
  while ((m = re.exec(html)) !== null) {
    var src = attr(m[0], "src");
    if (src && src.charAt(0) === "/" && src.charAt(1) !== "/") out.push(src.split("?")[0].slice(1));
  }
  return out;
}
function stripJsComments(s) { return s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/[^\n]*/g, "$1"); }
// gc-card used as a class: inside a JS string literal (comments stripped) or a class="" attribute (HTML comments stripped)
function rendersGcCard(html, scripts) {
  if (/\bclass\s*=\s*"[^"]*\bgc-card\b/.test(stripHtmlComments(html))) return true;
  return scripts.some(function (js) { return /(["'])(?:(?!\1)[^\n\\]|\\.)*\bgc-card\b(?:(?!\1)[^\n\\]|\\.)*\1/.test(stripJsComments(js)); });
}

// the shell's ensureStylesheet() run for real against a page's static <link>s → the effective order
var NAV = read("public/app-navigation.js");
var ENSURE_SRC = (function () {
  var m = /\n  function ensureStylesheet\(/.exec(NAV);
  if (!m) return null;
  var end = NAV.indexOf("\n  }\n", m.index + 1);
  return end < 0 ? null : NAV.slice(m.index + 1, end + 4);
})();
var INJECTED = (function () {
  var out = [], re = /ensureStylesheet\("([^"]+)"\)/g, m;
  while ((m = re.exec(NAV)) !== null) out.push(m[1]);
  return out;
})();
function effectiveSheets(html) {
  var vm = require("vm");
  var head = { kids: [] };
  function mk(href, injected) { return { rel: "stylesheet", href: href, injected: !!injected, parentNode: head, getAttribute: function (k) { return k === "href" ? this.href : k === "rel" ? this.rel : null; } }; }
  head.kids = localSheets(html).map(function (s) { return mk(s.href, false); });
  head.appendChild = function (n) { n.parentNode = head; head.kids.push(n); return n; };
  head.insertBefore = function (n, ref) { n.parentNode = head; head.kids.splice(head.kids.indexOf(ref), 0, n); return n; };
  var doc = { head: head, createElement: function () { return mk("", true); },
    querySelectorAll: function () { return head.kids.filter(function (k) { return k.rel === "stylesheet"; }); } };
  var ctx = vm.createContext({ document: doc });
  try {
    vm.runInContext(ENSURE_SRC + "\nthis.ensureStylesheet = ensureStylesheet;", ctx);
    if (/\/app-navigation\.js/.test(html)) INJECTED.forEach(function (h) { ctx.ensureStylesheet(h); });
  } catch (e) { return { error: "ensureStylesheet threw: " + e.message }; }
  return head.kids.map(function (k) { return { file: k.href.split("?")[0].slice(1), injected: k.injected }; });
}

// ------------------------------------------------------------------ pages
console.log("== pages in PAGES ==");
t("PAGES is a non-empty list of unique page names", PAGES.length > 0 && PAGES.every(function (p, i) { return /^[a-z0-9-]+$/.test(p) && PAGES.indexOf(p) === i; }), PAGES);
PAGES.forEach(function (page) {
  var file = path.join(PUB, page + ".html");
  if (!fs.existsSync(file)) { t(page + ".html exists", false); return; }
  var html = fs.readFileSync(file, "utf8");
  var sheets = localSheets(html);
  var gc = sheets.filter(function (s) { return s.file === "glass-cards.css"; });
  t(page + ": loads /glass-cards.css?v=" + GC_V + " exactly once", gc.length === 1 && gc[0].v === GC_V, gc.map(function (s) { return s.v; }));
  var eff = ENSURE_SRC ? effectiveSheets(html) : { error: "ensureStylesheet not found in app-navigation.js" };
  if (eff.error) { t(page + ": effective stylesheet order (static + injected)", false, eff.error); eff = []; }
  var files = eff.map(function (s) { return s.file + (s.injected ? "(injected)" : ""); });
  var iG = eff.map(function (s) { return s.file; }).indexOf("glass-cards.css");
  var iT = eff.map(function (s) { return s.file; }).indexOf("theme.css");
  var before = iG < 0 ? [] : eff.slice(0, iG), after = iG < 0 ? [] : eff.slice(iG + 1);
  var badBefore = before.filter(function (s) { return !(s.file === "theme.css" || s.file === "mission-control.css" || s.injected); });
  var badAfter = after.filter(function (s) { return s.injected || s.file === "theme.css" || s.file === "mission-control.css"; });
  var iM = eff.map(function (s) { return s.file; }).indexOf("mission-control.css");
  t(page + ": effective order theme.css → mission-control.css / injected shell sheets → glass-cards.css → page CSS [" + files.join(" · ") + "]",
    !!ENSURE_SRC && iT === 0 && iG > iT && (iM < 0 || (iM > iT && iM < iG)) && after.length > 0 && badBefore.length === 0 && badAfter.length === 0,
    { beforeGlass: badBefore.map(function (s) { return s.file; }), afterGlass: badAfter.map(function (s) { return s.file; }) });
  t(page + ": loads Inter 700 (numbers are Inter 700 tabular)", /fonts\.googleapis\.com\/css2\?family=Inter:wght@[^"&]*700/.test(html));
  var own = localScripts(html).filter(function (f) { return SHELL_SCRIPTS.indexOf(f) < 0; });
  var js = own.map(function (f) { return fs.existsSync(path.join(PUB, f)) ? fs.readFileSync(path.join(PUB, f), "utf8") : ""; });
  t(page + ": the page's own source renders gc-card in a class string (" + (own.length ? own.join(", ") : "HTML only") + ")", rendersGcCard(html, js));
});

console.log("== every page that loads glass-cards.css ==");
{
  var loaders = fs.readdirSync(PUB).filter(function (f) { return /\.html$/.test(f); }).filter(function (f) {
    return fs.readFileSync(path.join(PUB, f), "utf8").indexOf("/glass-cards.css") >= 0;
  });
  var unlisted = loaders.filter(function (f) { return PAGES.indexOf(f.replace(/\.html$/, "")) < 0; });
  t("every page that loads glass-cards.css is in PAGES (" + loaders.length + " pages)", loaders.length > 0 && unlisted.length === 0, unlisted);
  var vers = {};
  loaders.forEach(function (f) { localSheets(fs.readFileSync(path.join(PUB, f), "utf8")).forEach(function (s) { if (s.file === "glass-cards.css") vers[s.v] = (vers[s.v] || []).concat(f); }); });
  t("one version everywhere, = GC_V (" + GC_V + ")", Object.keys(vers).length === 1 && vers[GC_V], vers);
  var hv = /glass-cards\.css — shared "glass card" look · (gc-\d+)/.exec(HEADER);
  t("GC_V matches the gc-<n> written in the file header", !!hv && GC_V.slice(-hv[1].length - 1) === "-" + hv[1], hv && hv[1]);
}

// ------------------------------------------------------------------ page-agnostic stylesheet
console.log("== glass-cards.css stays page-agnostic ==");
{
  t("no Doto / dot-matrix font anywhere in the file (comments included)", !/doto|dot-?matrix/i.test(CSS));
  var fonts = [];
  RULES.forEach(function (r) { var re = /font(?:-family)?\s*:\s*([^;]+)/g, m; while ((m = re.exec(r.body)) !== null) fonts.push(m[1].trim()); });
  t("no LED / segment / digital face in any font declaration, no @font-face",
    !/@font-face/.test(BODY) && fonts.every(function (f) { return !/\bLED\b|segment|digital|matrix|DSEG/i.test(f); }), fonts.filter(function (f) { return /LED|segment|digital|matrix/i.test(f); }));
  var classes = [];
  RULES.forEach(function (r) { r.sel.forEach(function (s) { var re = /\.(-?[_a-zA-Z][\w-]*)/g, c; while ((c = re.exec(s)) !== null) classes.push(c[1]); }); });
  var foreign = classes.filter(function (c) { return c.indexOf("gc-") !== 0; });
  t("every class selector starts with gc- (" + classes.length + " class refs)", classes.length > 60 && foreign.length === 0, foreign);
  // public/app.js draws the Quarterly Editor charts with <line class="gc-grid"> / <text class="gc-axis"> (styled in styles.css):
  // those names predate this file's gc- prefix, so a rule here with either name would restyle that chart on "/"
  var chartClash = classes.filter(function (c) { return c === "gc-grid" || c === "gc-axis"; });
  t("never defines .gc-grid / .gc-axis (SVG chart classes of public/app.js that predate the gc- prefix)", chartClash.length === 0, chartClash);

  // clickable / focusable pieces: the named ones + any gc- class with cursor:pointer or its own :hover
  var interactive = ["gc-btn", "gc-btn-ghost", "gc-field", "gc-info", "gc-table-wrap"];
  RULES.forEach(function (r) {
    r.sel.forEach(function (s) {
      var h = /\.(gc-[\w-]+)(?::not\([^)]*\))*:hover/.exec(s);
      if (h && interactive.indexOf(h[1]) < 0) interactive.push(h[1]);
      if (/cursor\s*:\s*pointer/.test(r.body)) {
        var last = s.split(/\s|>|\+|~/).filter(Boolean).pop() || "", c = /\.(gc-[\w-]+)/.exec(last);
        if (c && interactive.indexOf(c[1]) < 0) interactive.push(c[1]);
      }
    });
  });
  var noRing = interactive.filter(function (k) {
    var fv = RULES.filter(function (r) { return r.sel.some(function (s) { return new RegExp("\\." + k + ":focus-visible$").test(s); }); });
    var o = decl(fv, "outline");
    return !fv.length || !o || /^(none|0)\b/.test(o);
  });
  t("every clickable/focusable piece has its own :focus-visible outline (" + interactive.join(", ") + ")", interactive.length >= 5 && noRing.length === 0, noRing);
}

// ------------------------------------------------------------------ the shell stylesheet leaves the glass alone
console.log("== mission-control.css leaves the glass alone ==");
{
  var MC = read("public/mission-control.css").replace(/\/\*[\s\S]*?\*\//g, "");
  var MC_RULES = (function () {
    var out = [], re = /([^{}]+)\{([^{}]*)\}/g, m;
    while ((m = re.exec(MC)) !== null) {
      var prelude = m[1].trim();
      if (prelude.charAt(0) === "@") continue;
      out.push({ sel: prelude.split(",").map(function (s) { return s.trim().replace(/\s+/g, " "); }), body: m[2] });
    }
    return out;
  })();
  function mcRule(selector) { return MC_RULES.filter(function (r) { return r.sel.indexOf(selector) >= 0; }); }
  // mc-* classes some page renders on the same element as gc-card (class strings in public/*.js / *.html)
  var withGlass = {};
  fs.readdirSync(PUB).filter(function (f) { return /\.(js|html)$/.test(f); }).forEach(function (f) {
    var src = fs.readFileSync(path.join(PUB, f), "utf8"), re = /class(?:Name)?\s*=\s*\\?["'`]([^"'`\n]*\bgc-card\b[^"'`\n]*)/g, m;
    while ((m = re.exec(src)) !== null) (m[1].match(/(?:^|[\s"'`])(mc-[\w-]+)/g) || []).forEach(function (c) { withGlass[c.replace(/^[\s"'`]/, "")] = 1; });
  });
  t("pages render mc-metric and mc-page-hero together with gc-card (asset · bitcoin-monitor) — the classes the guards below protect",
    !!withGlass["mc-metric"] && !!withGlass["mc-page-hero"], Object.keys(withGlass));
  // every light-theme background rule whose subject could be a glass card must skip it (html[data-theme] + 2 classes > .gc-card)
  var leaks = [];
  MC_RULES.forEach(function (r) {
    if (!/(^|;)\s*background(-color|-image)?\s*:/.test(r.body)) return;
    r.sel.forEach(function (s) {
      if (s.indexOf('html[data-theme="light"]') !== 0) return;
      var subject = s.split(/\s+|>|\+|~/).filter(Boolean).pop() || "";
      var hit = (subject.match(/\.(mc-[\w-]+)/g) || []).some(function (c) { return withGlass[c.slice(1)]; });
      if (hit && subject.indexOf(":not(.gc-card)") < 0) leaks.push(s);
    });
  });
  t("light theme: html[data-theme=light] .mc-metric / .mc-page-hero backgrounds exclude .gc-card (no white face on a glass card)",
    mcRule('html[data-theme="light"] .mc-metric:not(.gc-card)').length === 1 && mcRule('html[data-theme="light"] .mc-page-hero:not(.gc-card)').length === 1 &&
    /background/.test(mcRule('html[data-theme="light"] .mc-metric:not(.gc-card)').concat(mcRule('html[data-theme="light"] .mc-page-hero:not(.gc-card)')).map(function (r) { return r.body; }).join("")));
  t("light theme: no background rule in mission-control.css lands on an mc-* class that is rendered with gc-card", leaks.length === 0, leaks);
  var blur = MC_RULES.filter(function (r) { return r.sel.indexOf(".mc-card.gc-card") >= 0 && r.sel.indexOf(".gc-card .mc-card") >= 0; });
  t("under glass the old blur is off: .mc-card.gc-card, .gc-card .mc-card { backdrop-filter: none (+ -webkit-) }",
    blur.length === 1 && /(^|;)\s*backdrop-filter\s*:\s*none/.test(blur[0].body) && /-webkit-backdrop-filter\s*:\s*none/.test(blur[0].body));
  t("under glass the cyan mc-glow layer is off: .mc-glow.gc-card::before { content: none }",
    mcRule(".mc-glow.gc-card::before").some(function (r) { return /(^|;)\s*content\s*:\s*none/.test(r.body); }));
  t("a hidden mc-btn stays hidden: .mc-btn[hidden] { display: none } beats .mc-btn { display: inline-flex } (header Retry Failed starts hidden)",
    mcRule(".mc-btn[hidden]").some(function (r) { return /(^|;)\s*display\s*:\s*none/.test(r.body); }) &&
    /<button class="mc-btn" id="appRetryFailedButton" type="button" hidden>/.test(NAV));
}

// ------------------------------------------------------------------ shared pieces for page tasks
console.log("== shared pieces (gc-table · gc-btn · gc-field · gc-section-h) ==");
{
  var PIECES = ["gc-table", "gc-table-wrap", "gc-cell-num", "gc-btn", "gc-btn-ghost", "gc-field", "gc-section-h"];
  var undocumented = PIECES.filter(function (k) { return !new RegExp("\\." + k + "\\b").test(HEADER); });
  t("each shared piece is documented in the header block", undocumented.length === 0, undocumented);

  // tokens: on the card = the glass values · outside a card each piece falls back to the site theme (--app-*)
  var card = RULES.filter(function (r) { return r.sel.length === 1 && r.sel[0] === ".gc-card"; });
  var TOK = { "--gc-line-strong": /^rgba\(255, 255, 255, 0?\.\d+\)$/, "--gc-hover": /^rgba\(0, 0, 0, 0?\.\d+\)$/, "--gc-fill": /^rgba\(255, 255, 255, 0?\.1\d?\)$/,
    "--gc-rim": /^rgba\(255, 255, 255, 0?\.\d+\)$/, "--gc-rim-strong": /^rgba\(255, 255, 255, 0?\.\d+\)$/, "--gc-press": /^rgba\(0, 0, 0, 0?\.\d+\)$/,
    "--gc-btn-rim": /^transparent$/, "--gc-focus": /^#fff$/, "--gc-well": /^rgba\(0, 0, 0, 0?\.\d+\)$/ };
  var badTok = Object.keys(TOK).filter(function (k) { return !TOK[k].test(decl(card, k) || ""); });
  t("the card defines the on-glass tokens (hover/press darken, rims/fill are white-tinted, focus ring white) + color-scheme: dark",
    badTok.length === 0 && decl(card, "color-scheme") === "dark", badTok.map(function (k) { return k + "=" + decl(card, k); }));
  var pieceRules = RULES.filter(function (r) { return r.sel.some(function (s) { return /^(select)?\.gc-(table|btn|field)/.test(s); }); });
  var bare = [];
  pieceRules.forEach(function (r) { var re = /var\((--gc-[\w-]+)\)/g, m; while ((m = re.exec(r.body)) !== null) bare.push(r.sel[0] + " " + m[1]); });
  t("outside a card nothing is left undefined: every --gc-* in table / button / field rules has a fallback", pieceRules.length > 10 && bare.length === 0, bare);
  var themed = [];
  pieceRules.forEach(function (r) { var re = /var\((--gc-(?:ink|ink-2|line|line-strong|hover|rim|rim-strong|press|btn-rim|focus|well)), ([^;]+?)\)(?:[;\s]|$)/g, m; while ((m = re.exec(r.body)) !== null) if (!/var\(--app-/.test(m[2])) themed.push(r.sel[0] + " " + m[1] + " → " + m[2]); });
  t("those fallbacks are the site theme tokens (--app-*), so the pieces read in both themes off the glass", themed.length === 0, themed);

  // table
  var tbl = RULES.filter(function (r) { return r.sel.length === 1 && r.sel[0] === ".gc-table"; });
  t("gc-table: full width, collapsed borders, tabular figures, ink text (theme text off the glass)",
    decl(tbl, "width") === "100%" && decl(tbl, "border-collapse") === "collapse" && /tabular-nums/.test(decl(tbl, "font-variant-numeric") || "") && decl(tbl, "color") === "var(--gc-ink, var(--app-text))");
  var cells = RULES.filter(function (r) { return r.sel.indexOf(".gc-table th") >= 0 && r.sel.indexOf(".gc-table td") >= 0; });
  t("gc-table cells: padding + a 1px divider in --gc-line", cells.length > 0 && !!decl(cells, "padding") && /^1px solid var\(--gc-line, var\(--app-border\)\)$/.test(decl(cells, "border-bottom") || ""));
  var head = rulesWith(".gc-table thead th");
  t("gc-table header row: secondary ink (white-tinted on glass, theme text-2 off it), no wrap", decl(head, "color") === "var(--gc-ink-2, var(--app-text-2))" && decl(head, "white-space") === "nowrap");
  var hover = RULES.filter(function (r) { return r.sel.some(function (s) { return /^\.gc-table tbody tr:hover/.test(s); }); });
  t("gc-table row hover = --gc-hover (darkens on glass — ink-2 is only 4.5:1 at the brightest spot)", /^var\(--gc-hover, /.test(decl(hover, "background") || ""), decl(hover, "background"));
  var lastRow = RULES.filter(function (r) { return r.sel.some(function (s) { return /^\.gc-table tbody tr:last-child/.test(s); }); });
  t("gc-table: no divider under the last row", /^0$|^none$/.test(decl(lastRow, "border-bottom") || ""));
  var num = rulesWith(".gc-table .gc-cell-num");
  t("gc-cell-num: right-aligned, no wrap, numeral font", decl(num, "text-align") === "right" && decl(num, "white-space") === "nowrap" && /^var\(--gc-num-font, "Inter"/.test(decl(num, "font-family") || ""));
  var wrap = RULES.filter(function (r) { return r.sel.length === 1 && r.sel[0] === ".gc-table-wrap"; });
  t("gc-table-wrap: scrolls sideways inside its own box (max-width 100%)", decl(wrap, "overflow-x") === "auto" && decl(wrap, "max-width") === "100%");

  // buttons
  var base = RULES.filter(function (r) { return r.sel.indexOf(".gc-btn") >= 0 && r.sel.indexOf(".gc-btn-ghost") >= 0 && /cursor/.test(r.body); });
  var mh = px(decl(base, "min-height"));
  t("gc-btn / gc-btn-ghost share one base: inline-flex, ≥ 32px tall, pointer, pill radius, Inter 700, no underline",
    base.length === 1 && decl(base, "display") === "inline-flex" && mh != null && mh >= 32 && decl(base, "cursor") === "pointer" &&
    decl(base, "border-radius") === "999px" && decl(base, "font-weight") === "700" && decl(base, "text-decoration") === "none" &&
    /var\(--gc-font/.test(decl(base, "font-family") || ""), base.length ? base[0].body.replace(/\s+/g, " ").slice(0, 200) : "no shared base rule");
  t("gc-btn: white face, near-black text (≥ 15:1), rim only off the glass", decl(base, "background") === "#fff" && decl(base, "color") === "#0b0b12" &&
    decl(base, "box-shadow") === "inset 0 0 0 1px var(--gc-btn-rim, var(--app-muted))");
  // <a> is content-box by default: without this an <a class="gc-btn"> measured 52px tall (36 + padding) in Chrome
  t("gc-btn / gc-btn-ghost / gc-field size their border box (same height on <a>, <button>, <input>)",
    decl(base, "box-sizing") === "border-box" && decl(RULES.filter(function (r) { return r.sel.length === 1 && r.sel[0] === ".gc-field"; }), "box-sizing") === "border-box");
  var ghost = RULES.filter(function (r) { return r.sel.length === 1 && r.sel[0] === ".gc-btn-ghost"; });
  t("gc-btn-ghost: --gc-fill face + 1px --gc-rim + card ink (transparent / muted rim / theme text off the glass)",
    decl(ghost, "background") === "var(--gc-fill, transparent)" && decl(ghost, "box-shadow") === "inset 0 0 0 1px var(--gc-rim, var(--app-muted))" &&
    decl(ghost, "color") === "var(--gc-ink, var(--app-text))");
  function lastIndex(pred) { var i = -1; RULES.forEach(function (r) { if (r.sel.some(pred)) i = Math.max(i, r.i); }); return i; }
  var ENABLED = ':not\\(:disabled\\):not\\(\\[aria-disabled="true"\\]\\)';
  var iBtnHover = lastIndex(function (s) { return new RegExp("^\\.gc-btn" + ENABLED + ":hover$").test(s); });
  var iGhostHover = lastIndex(function (s) { return new RegExp("^\\.gc-btn-ghost" + ENABLED + ":hover$").test(s); });
  var ghostHover = RULES.filter(function (r) { return r.sel.some(function (s) { return new RegExp("^\\.gc-btn-ghost" + ENABLED + ":hover$").test(s); }); });
  t("hover: gc-btn has one, and gc-btn-ghost's comes after it with its own face — class=\"gc-btn gc-btn-ghost\" never turns white",
    iBtnHover > 0 && iGhostHover > iBtnHover && decl(ghostHover, "background") === "var(--gc-fill, transparent)", [iBtnHover, iGhostHover, decl(ghostHover, "background")]);
  var stateSel = [];
  RULES.forEach(function (r) { r.sel.forEach(function (s) { if (/^\.gc-(btn|btn-ghost|field)\b.*:(hover|active)$/.test(s)) stateSel.push(s); }); });
  var leaky = stateSel.filter(function (s) { return !/:not\(:disabled\)/.test(s) || (/^\.gc-btn/.test(s) && !/:not\(\[aria-disabled="true"\]\)/.test(s)); });
  t("hover / active never apply to a disabled control (:disabled, and aria-disabled=\"true\" on buttons)", stateSel.length >= 5 && leaky.length === 0, leaky);
  var dis = RULES.filter(function (r) { return r.sel.indexOf(".gc-btn:disabled") >= 0; });
  var disSel = dis.length ? dis[0].sel : [];
  t("gc-btn / gc-btn-ghost disabled (:disabled and aria-disabled=\"true\"): dimmed, not clickable (pointer-events: none)",
    [".gc-btn:disabled", ".gc-btn-ghost:disabled", '.gc-btn[aria-disabled="true"]', '.gc-btn-ghost[aria-disabled="true"]'].every(function (s) { return disSel.indexOf(s) >= 0; }) &&
    !!decl(dis, "opacity") && decl(dis, "pointer-events") === "none", disSel);

  // fields
  var fld = RULES.filter(function (r) { return r.sel.indexOf(".gc-field") >= 0 && r.sel.length === 1; });
  var fmh = px(decl(fld, "min-height"));
  t("gc-field: dark well on glass (--gc-well) / page surface off it, --gc-rim border, card ink, shrinks in narrow boxes",
    decl(fld, "background") === "var(--gc-well, var(--app-surface))" && decl(fld, "border") === "1px solid var(--gc-rim, var(--app-muted))" &&
    decl(fld, "color") === "var(--gc-ink, var(--app-text))" && decl(fld, "max-width") === "100%" && decl(fld, "min-width") === "0" &&
    fmh != null && fmh >= 32 && /var\(--gc-font/.test(decl(fld, "font-family") || "") && /tabular-nums/.test(decl(fld, "font-variant-numeric") || ""));
  t("gc-field native parts follow the surface: no color-scheme of its own (dark from the card, theme off it)", decl(fld, "color-scheme") == null);
  var ph = rulesWith(".gc-field::placeholder");
  t("gc-field placeholder: secondary ink at full opacity (≥ 4.5:1 on the well)", decl(ph, "color") === "var(--gc-ink-2, var(--app-text-2))" && decl(ph, "opacity") === "1");
  var fdis = RULES.filter(function (r) { return r.sel.some(function (s) { return /^\.gc-field:disabled$/.test(s); }); });
  t("gc-field disabled: dimmed + not-allowed cursor", fdis.length > 0 && !!decl(fdis, "opacity") && decl(fdis, "cursor") === "not-allowed");
  var opt = RULES.filter(function (r) { return r.sel.some(function (s) { return /option$/.test(s); }); });
  t("dark <option> colours only inside a card", opt.length > 0 && opt.every(function (r) { return r.sel.every(function (s) { return /^\.gc-card /.test(s); }); }), opt.map(function (r) { return r.sel.join(","); }));
  var rings = RULES.filter(function (r) { return r.sel.some(function (s) { return /^\.gc-(btn|btn-ghost|field|table-wrap):focus-visible$/.test(s); }); });
  t("focus rings of the shared pieces: --gc-focus (white on glass) / --app-accent off it", rings.length > 0 && rings.every(function (r) { return /outline:\s*2px solid var\(--gc-focus, var\(--app-accent\)\)/.test(r.body); }), rings.length);

  // section heading (on the page, not on a card → follows the site theme)
  var sh = RULES.filter(function (r) { return r.sel.length === 1 && r.sel[0] === ".gc-section-h"; });
  var shp = rulesWith(".gc-section-h p");
  var shAll = RULES.filter(function (r) { return r.sel.some(function (s) { return s.indexOf(".gc-section-h") === 0; }); });
  t("gc-section-h: theme text colours (--app-text / --app-text-2), no card ink, no background",
    decl(sh, "color") === "var(--app-text)" && decl(shp, "color") === "var(--app-text-2)" &&
    shAll.every(function (r) { return !/--gc-ink|#fff\b|background/.test(r.body); }));
  t("gc-section-h: heading 17px / 700, sub-line 12.5px", px(decl(sh, "font-size")) === 17 && decl(sh, "font-weight") === "700" && px(decl(shp, "font-size")) === 12.5);
  t("header says which pieces are page-only / work on and off the glass", /page only[\s\S]{0,200}\.gc-section-h/i.test(HEADER) && /off the glass/i.test(HEADER));

  // motion + theme
  var rm = /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\}\s*\}/.exec(BODY);
  t("reduced motion also stills buttons and fields used outside a card", !!rm && /\.gc-btn\b/.test(rm[1]) && /\.gc-btn-ghost\b/.test(rm[1]) && /\.gc-field\b/.test(rm[1]));
  t("no light-theme override for any on-glass piece (tiles keep their colours in both themes)",
    !/html\[data-theme="light"\][^{]*\.gc-(table|btn|field)/.test(BODY));
}

// ------------------------------------------------------------------ the test's own parsers
console.log("== helpers ==");
{
  var ls = localSheets('<link href="/a.css?v=1" rel="stylesheet" /><link rel=stylesheet href=/b.css><link rel="preconnect" href="/c.css"><!-- <link rel="stylesheet" href="/d.css"> --><link rel="stylesheet" href="https://x/e.css">');
  t("localSheets: any attribute order, unquoted values, skips non-stylesheets / comments / remote", ls.map(function (s) { return s.file + "@" + s.v; }).join() === "a.css@1,b.css@null", ls);
  t("gc-card in a comment does not count · in a class string it does",
    !rendersGcCard("<p>x</p><!-- class=\"gc-card\" -->", ["// renders gc-card later\nvar a = 1;", "/* gc-card */ var b = 2;"]) &&
    rendersGcCard("", ['var c = \'<div class="mr-card gc-card \' + tone;']) && rendersGcCard('<div class="x gc-card gc-neutral">', []));
}

console.log("");
console.log(pass + fail + " checks · " + pass + " passed · " + fail + " failed");
process.exit(fail ? 1 : 0);
