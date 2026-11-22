"use strict";
// ============================================================
// ACCUMULATION CENTER (/accumulation-center) — การ์ดแก้ว (glass-cards.css)
//   node scripts/accumulation-glass-test.js
//
// รัน accumulation-page.js จริงใน vm (engine ปลอมที่คุมผลได้ทีละตัว) แล้วล็อก:
//   · การ์ด → สถานะต้นทาง → tone (สถานะที่หน้าคำนวณอยู่แล้วเท่านั้น):
//       การ์ดจัดอันดับ (.acc-card)   ประเภทจังหวะย่อ dip.key (4 ระดับเดียวกับแถบนับบนหัวหน้า)
//                                     🟢 healthy → calm · 🟡 macro → normal · 🟠 wait → warning · 🔴 review → danger
//       แถบนับ (.acc-strip) · กล่องชิปตัวที่ยังไม่จัดอันดับ (.acc-chips) · ข้อความว่าง/กำลังโหลด (.mc-empty) → neutral
//     กล่องคำแนะนำ (.acc-rec bull/watch/bear) คงสีของตัวเองบนการ์ด (เช่น ครบเพดาน 10% → Wait บนการ์ด healthy)
//   · อันดับ 11+ (section "อันดับที่เหลือ") ก็เป็นแก้ว · ไม่มีแก้วซ้อนแก้ว · หัว section อยู่บนพื้นหน้า (gc-section-h)
//   · คลาส/ข้อความเดิมอยู่ครบ · escape ค่าใน innerHTML · ไม่มี Buy/Sell
//   · Privacy: หน้านี้ไม่แสดงเงิน — มูลค่าถือครองไม่โผล่ · maskText ไม่มีอะไรให้ซ่อน · title/aria-label ไม่มีเงิน
//   · HTML: glass-cards.css ครั้งเดียว ก่อน accumulation.css หลัง mission-control.css · Inter 700 · เวอร์ชัน bump
//   · CSS: โทเคน mc ในการ์ด = หมึกแก้ว · ผิวการ์ดเก่าถูกลบ · สีตัวหนังสือบนแก้วสว่างพอ (luminance ≥ 0.70)
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
  if (cond) { pass++; console.log("  PASS  " + name); return; }
  fail++;
  console.log("  FAIL  " + name + (extra !== undefined ? "  → " + JSON.stringify(extra) : ""));
}

var TONES = ["gc-calm", "gc-normal", "gc-warning", "gc-danger", "gc-neutral"];
var GC_V = "20261121-gc-2";

// ---------------------------------------------------------------- HTML parser (stack)
var VOID = { area: 1, base: 1, br: 1, col: 1, embed: 1, hr: 1, img: 1, input: 1, link: 1, meta: 1, source: 1, track: 1, wbr: 1 };
function classOf(tag) { var m = /\sclass="([^"]*)"/.exec(tag); return m ? m[1].split(/\s+/).filter(Boolean) : []; }
function parse(h) {
  var re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g, m, stack = [], all = [];
  while ((m = re.exec(h)) !== null) {
    var tag = m[2].toLowerCase();
    if (m[1]) {
      for (var i = stack.length - 1; i >= 0; i--) {
        if (stack[i].tag !== tag) continue;
        for (var j = stack.length - 1; j > i; j--) stack[j].end = m.index;
        stack[i].end = re.lastIndex;
        stack.length = i;
        break;
      }
      continue;
    }
    var el = { tag: tag, open: m[0], start: m.index, cls: classOf(m[0]), parent: stack.length ? stack[stack.length - 1] : null, end: h.length };
    all.push(el);
    if (!(/\/$/.test(m[3]) || VOID[tag])) stack.push(el);
  }
  all.forEach(function (e) { e.outer = h.slice(e.start, e.end); });
  return all;
}
function has(el, c) { return el.cls.indexOf(c) >= 0; }
function byClass(h, c) { return parse(h).filter(function (e) { return has(e, c); }); }
function toneOf(el) {
  if (!el) return "(no element)";
  var tn = el.cls.filter(function (c) { return TONES.indexOf(c) >= 0; });
  return has(el, "gc-card") && tn.length === 1 ? tn[0] : "(" + el.cls.join(" ") + ")";
}
function glassAncestor(el) { for (var p = el.parent; p; p = p.parent) if (has(p, "gc-card")) return p; return null; }
function attrsOf(h, name) { var out = [], re = new RegExp("\\s" + name + "=\"([^\"]*)\"", "g"), m; while ((m = re.exec(h)) !== null) out.push(m[1]); return out; }
function textOf(h) { return h.replace(/<[^>]*>/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/&amp;/g, "&"); }

// ---------------------------------------------------------------- fixtures (engine ปลอม — คุม dip / decision / คะแนน ทีละตัว)
// [ticker, thesis score, dipClass.key, decision.key, Accumulation Score, ชื่อ]
var FIX = [
  ["AAA", 82, "healthy", "strong-accumulate", 95, "Alpha Corp"],          // healthy → calm · rec Aggressive (bull)
  ["BBB", 78, "macro", "accumulate", 90, "Beta <img src=x onerror=alert(1)>"], // macro → normal · rec Gradual (bull) · ชื่อต้อง escape
  ["CCC", 70, "technical", "wait", 85, "Gamma"],                          // wait → warning · rec Wait (watch)
  ["DDD", 50, "fundamental", "review-thesis", 80, "Delta"],               // review → danger · rec Review Thesis (bear)
  ["EEE", 80, "healthy", "strong-accumulate", 75, "Epsilon"],             // healthy แต่ถือครบเพดาน → rec Wait (watch) · การ์ดยัง calm
  ["FFF", 74, "macro", "accumulate", 70, "Phi"],
  ["GGG", 66, "technical", "wait", 65, "Gee"],
  ["HHH", 72, "healthy", "accumulate", 60, "Eta"],
  ["III", 68, "macro", "strong-accumulate", 55, "Iota"],
  ["JJJ", 64, "technical", "wait", 50, "Jay"],
  ["KKK", 60, "broken", "wait", 45, "Kappa"],                              // อันดับ 11 · review → danger
  ["LLL", 76, "healthy", "accumulate", 40, "Lambda"]                      // อันดับ 12 · healthy → calm
];
var EXPECT = { AAA: "gc-calm", BBB: "gc-normal", CCC: "gc-warning", DDD: "gc-danger", EEE: "gc-calm", FFF: "gc-normal", GGG: "gc-warning",
  HHH: "gc-calm", III: "gc-normal", JJJ: "gc-warning", KKK: "gc-danger", LLL: "gc-calm" };
var HELD_MV = 234567.89, BUCKET = 1172839.45; // มูลค่าถือครอง (เงิน) — ห้ามโผล่บนหน้า
var byT = {}; FIX.forEach(function (f) { byT[f[0]] = f; });

var allUnavailable = false;
var TE = {
  companiesFrom: function () { return FIX.map(function (f) { return { ticker: f[0] }; }); },
  compute: function (ticker) {
    var f = byT[ticker];
    if (!f || allUnavailable) return { available: false };
    return { available: true, name: f[5], thesis: { score: f[1] }, dipClass: { key: f[2] },
      decision: { key: f[3], thai: "คำตัดสิน " + ticker, why: ["เหตุผล " + ticker] }, stale: ticker === "CCC" };
  },
  computeHistory: function () { return null; }
};
var PM = {
  GROWTH_WINDOWS: [2, 3, 4, 5],
  techOf: function () { return {}; },
  growthSummary: function () { return {}; },
  accumulationScore: function (o) {
    var f = null; FIX.forEach(function (x) { if (x[5] === o.name) f = x; });
    return { score: f ? f[4] : null, timing: { dd: -12.34 }, valLevel: "fair",
      parts: [{ label: "Thesis", weight: 40, value: 82 }, { label: "Timing", weight: 20, value: 45 }, { label: "Valuation", weight: 15, value: 20 }, { label: "Growth", weight: 25, value: null }] };
  },
  whyChecklist: function () { return [{ ok: true, txt: "Thesis แข็ง" }, { ok: false, txt: "ยังไม่ย่อถึงโซน" }]; },
  quarterlyBuckets: function () { return { "foreign-stock": BUCKET }; }
};
var IE = {
  compute: function (ticker) {
    if (ticker !== "AAA" && ticker !== "DDD") return { available: false };
    return { available: true, health: { state: { icon: "🟢", key: "intact" } }, divergence: { state: { icon: "↗", key: "aligned" } },
      readiness: { state: { icon: "⏳", label: "รอยืนยัน" }, waitingFor: [] } };
  }
};
var SNAPSHOT = { portfolioHoldings: { data: [
  { canonicalSymbol: "EEE", isHolding: true, marketValue: HELD_MV * 1, portfolioBucket: "foreign-stock", assetName: "Epsilon" },
  { canonicalSymbol: "AAA", isHolding: true, marketValue: 5678.9, portfolioBucket: "foreign-stock", assetName: "Alpha Corp" }
] } };
SNAPSHOT.portfolioHoldings.data[0].marketValue = 0.2 * BUCKET; // 20% ≥ เพดาน 10%

// ---------------------------------------------------------------- run the real page in a vm
var rootEl = { innerHTML: "" };
var snap = SNAPSHOT;
var win = {
  ThesisEngine: TE, ThesisData: {}, PMEngine: PM, IntelligenceEngine: IE,
  PortfolioDataSnapshot: { read: function () { return snap; } },
  PortfolioCore: { canonicalSymbolFromTicker: function (x) { return String(x || "").toUpperCase(); } },
  AIBoomUniverseSeed: { ai_boom_universe: FIX.map(function (f, i) { return { id: "s" + i, ticker: f[0], name: f[5] }; })
    .concat([{ id: "u1", ticker: "ZZZ", name: "Zed" }, { id: "u2", ticker: "YYY", name: "Why" }]) },
  addEventListener: function () {}
};
var ctx = vm.createContext({
  window: win,
  document: { readyState: "complete", addEventListener: function () {}, getElementById: function (id) { return id === "accRoot" ? rootEl : null; } },
  localStorage: { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} },
  console: console
});
vm.runInContext(read("accumulation-page.js"), ctx, { filename: "accumulation-page.js" });
var render = win.AccumulationPage.render;

// ================================================================ 1) full render
console.log("== full render: card → status → tone ==");
render();
var H = rootEl.innerHTML;
var cards = byClass(H, "acc-card");
t("12 ranked cards rendered (10 top + 2 rest)", cards.length === 12, cards.length);
var wrong = [];
cards.forEach(function (c) {
  var m = /class="acc-sym"[^>]*>([^<]+)</.exec(c.outer), tk = m ? m[1] : "?";
  if (toneOf(c) !== EXPECT[tk]) wrong.push(tk + ": " + toneOf(c) + " ≠ " + EXPECT[tk]);
});
t("every ranked card = gc-card + ONE tone from its pullback class (healthy→calm · macro→normal · wait→warning · review→danger)", wrong.length === 0, wrong);
function cardOf(tk) { return cards.filter(function (c) { return c.outer.indexOf(">" + tk + "</a>") >= 0; })[0]; }
t("one case per tone: AAA calm · BBB normal · CCC warning · DDD danger",
  toneOf(cardOf("AAA")) === "gc-calm" && toneOf(cardOf("BBB")) === "gc-normal" && toneOf(cardOf("CCC")) === "gc-warning" && toneOf(cardOf("DDD")) === "gc-danger",
  [toneOf(cardOf("AAA")), toneOf(cardOf("BBB")), toneOf(cardOf("CCC")), toneOf(cardOf("DDD"))]);
t("cards stay <article class=\"acc-card …\"> (class kept)", cards.every(function (c) { return c.tag === "article"; }));
t("the recommendation keeps its own colour on the card: EEE healthy (calm) capped at 10% → Wait = acc-rec-watch",
  toneOf(cardOf("EEE")) === "gc-calm" && /class="acc-rec acc-rec-watch"/.test(cardOf("EEE").outer) && /ถือครบเพดาน 10%/.test(cardOf("EEE").outer));
t("rec classes kept: bull (AAA) · watch (CCC) · bear (DDD)",
  /acc-rec acc-rec-bull/.test(cardOf("AAA").outer) && /acc-rec acc-rec-watch/.test(cardOf("CCC").outer) && /acc-rec acc-rec-bear/.test(cardOf("DDD").outer));

console.log("== partial paths + neutral cards ==");
var secs = byClass(H, "acc-sec");
var rest = secs.filter(function (s) { return /อันดับที่เหลือ/.test(s.outer); })[0];
var restCards = rest ? byClass(rest.outer, "acc-card") : [];
t("rank 11+ (section อันดับที่เหลือ) are glass too: KKK danger · LLL calm",
  restCards.length === 2 && toneOf(cardOf("KKK")) === "gc-danger" && toneOf(cardOf("LLL")) === "gc-calm" && rest.outer.indexOf(">#11<") >= 0);
var strip = byClass(H, "acc-strip")[0];
t("count strip (.acc-strip) = gc-card gc-strip gc-neutral", !!strip && toneOf(strip) === "gc-neutral" && has(strip, "gc-strip"), strip && strip.cls);
var pills = byClass(H, "acc-pill");
t("4 count pills = gc-pill gc-pill-ghost with a gc-num count", pills.length === 4 && pills.every(function (p) { return has(p, "gc-pill") && has(p, "gc-pill-ghost") && /<b class="gc-num">\d+<\/b>/.test(p.outer); }));
t("counts unchanged: Healthy 4 · Macro 3 · Wait 3 · Review 2", /🟢 Healthy <b class="gc-num">4<\/b>/.test(H) && /🟡 Macro <b class="gc-num">3<\/b>/.test(H) && /🟠 Wait <b class="gc-num">3<\/b>/.test(H) && /🔴 Review <b class="gc-num">2<\/b>/.test(H));
var chips = byClass(H, "acc-chips")[0];
t("uncovered chips box (.acc-chips) = gc-card gc-strip gc-neutral", !!chips && toneOf(chips) === "gc-neutral" && has(chips, "gc-strip"), chips && chips.cls);
var chipEls = byClass(H, "acc-chip");
t("uncovered chips: ZZZ + YYY, links keep acc-chip + gc-pill gc-pill-ghost", chipEls.length === 2 && chipEls.every(function (c) { return c.tag === "a" && has(c, "gc-pill") && has(c, "gc-pill-ghost"); }) && /ZZZ/.test(chips.outer) && /YYY/.test(chips.outer));
t("sections are not cards (no glass behind a section of cards)", secs.length === 3 && secs.every(function (s) { return !has(s, "gc-card"); }));
var heads = byClass(H, "gc-section-h");
t("each section heading sits on the page (gc-section-h, not inside a card)", heads.length === 3 && heads.every(function (h) { return !glassAncestor(h); }));
var gcs = byClass(H, "gc-card");
var nested = gcs.filter(function (g) { return glassAncestor(g); });
t("no glass card inside a glass card", nested.length === 0, nested.map(function (g) { return g.cls.join(" "); }));
t("every glass card has exactly one tone", gcs.every(function (g) { return TONES.indexOf(toneOf(g)) >= 0; }), gcs.filter(function (g) { return TONES.indexOf(toneOf(g)) < 0; }).map(function (g) { return g.cls.join(" "); }));

console.log("== markup on the glass ==");
t("score = gc-num (Inter 700 tabular)", cards.every(function (c) { return /<div class="acc-score"[^>]*><b class="gc-num gc-num-s">\d+<\/b>/.test(c.outer); }));
var top3 = cards.filter(function (c) { return has(c, "acc-card-top"); });
t("acc-card-top kept on ranks 1–3 only", top3.length === 3 && [">#1<", ">#2<", ">#3<"].every(function (r, i) { return top3[i].outer.indexOf(r) >= 0; }));
var ranks = byClass(H, "acc-rank");
t("rank badge: top 3 = solid gc-pill · the rest = gc-pill gc-pill-ghost",
  ranks.length === 12 && ranks.every(function (r, i) { return has(r, "gc-pill") && (i < 3 ? !has(r, "gc-pill-ghost") : has(r, "gc-pill-ghost")); }));
t("original texts kept", ["🏆 Top 10 Accumulation Opportunities", "อันดับที่เหลือ", "ยังไม่จัดอันดับ (2 ตัว — ไม่มี Investment Thesis)", "📎 Universe เดียวกับ Action Center",
  "🧺 Accumulation Center", "ทำไมถึงเข้า/ไม่เข้าเกณฑ์ + องค์ประกอบคะแนน", "⚠ ข้อมูล thesis เก่า — สั่ง /thesis-update CCC", "Healthy Pullback", "Review Investment Thesis"]
  .every(function (s) { return H.indexOf(s) >= 0; }));
t("values are escaped (company name with <img …>)", H.indexOf("<img") < 0 && H.indexOf("Beta &lt;img src=x onerror=alert(1)&gt;") >= 0);
t("no Buy / Sell / trade-call words in the rendered page", !/\bBuy\b|\bSell\b|ควรซื้อ|ควรขาย|น่าซื้อ|น่าขาย|น่าเข้า|แนะนำซื้อ|จุดเข้า|ตัดขาดทุน/.test(textOf(H)));

console.log("== privacy (the page shows no money) ==");
var TXT = textOf(H);
var mvStrs = ["234,567", "234567", "1,172,839", "1172839", "5,678", "5678"];
t("holding market values / bucket totals never reach the page", mvStrs.every(function (s) { return H.indexOf(s) < 0; }), mvStrs.filter(function (s) { return H.indexOf(s) >= 0; }));
t("privacy.js maskText has nothing to hide (no ฿ / บาท / THB amounts)", maskText(TXT) === TXT && !/฿|บาท|THB/.test(TXT));
var labels = attrsOf(H, "title").concat(attrsOf(H, "aria-label"));
t("no money in title / aria-label", labels.length > 0 && labels.every(function (s) { return !/฿|บาท|THB|\d{1,3}(?:,\d{3})+/.test(s); }), labels);

console.log("== empty / not-ready paths ==");
snap = null; render();
var E1 = rootEl.innerHTML, e1 = byClass(E1, "mc-empty")[0];
t("no snapshot → mc-empty = gc-card gc-neutral (header without strip)", !!e1 && toneOf(e1) === "gc-neutral" && /ยังไม่มี Data Snapshot/.test(E1) && byClass(E1, "acc-strip").length === 0);
snap = SNAPSHOT; win.PMEngine = null; render();
var E2 = rootEl.innerHTML, e2 = byClass(E2, "mc-empty")[0];
t("engine not ready → mc-empty = gc-card gc-neutral", !!e2 && toneOf(e2) === "gc-neutral" && /Thesis\/PM Engine ไม่พร้อม/.test(E2));
win.PMEngine = PM; allUnavailable = true; render();
var E3 = rootEl.innerHTML, e3 = byClass(E3, "mc-empty")[0];
t("nothing to rank → top section empty note = gc-card gc-neutral", !!e3 && toneOf(e3) === "gc-neutral" && /ยังไม่มีตัวที่ประเมินได้/.test(E3) && byClass(E3, "acc-card").length === 0);
allUnavailable = false;
win.AIBoomUniverseSeed = { ai_boom_universe: [] }; render();
t("no uncovered tickers → chips box renders empty (CSS hides an empty strip)", /<div class="acc-chips gc-card gc-strip gc-neutral"><\/div>/.test(rootEl.innerHTML));

// ================================================================ 2) HTML
console.log("== accumulation-center.html ==");
var HTML = read("accumulation-center.html");
var links = []; (function () { var re = /<link\b[^>]*rel="stylesheet"[^>]*>/g, m; while ((m = re.exec(HTML)) !== null) { var h = /href="([^"]+)"/.exec(m[0]); if (h) links.push(h[1]); } })();
var files = links.map(function (h) { return h.split("?")[0]; });
var gcLinks = links.filter(function (h) { return h.split("?")[0] === "/glass-cards.css"; });
t("loads /glass-cards.css?v=" + GC_V + " exactly once", gcLinks.length === 1 && gcLinks[0] === "/glass-cards.css?v=" + GC_V, gcLinks);
t("order: theme.css → mission-control.css → glass-cards.css → accumulation.css", files.indexOf("/theme.css") === 0 &&
  files.indexOf("/mission-control.css") < files.indexOf("/glass-cards.css") && files.indexOf("/glass-cards.css") < files.indexOf("/accumulation.css"), files);
t("loads Inter 700", /fonts\.googleapis\.com\/css2\?family=Inter:wght@[^"&]*700/.test(HTML));
t("accumulation.css + accumulation-page.js versions bumped", !/accumulation\.css\?v=20260830-acc-css-2"/.test(HTML) && !/accumulation-page\.js\?v=20260830-acc-9"/.test(HTML) &&
  /accumulation\.css\?v=20261122-acc-css-3"/.test(HTML) && /accumulation-page\.js\?v=20261122-acc-10"/.test(HTML));
var ph = byClass(HTML, "mc-empty")[0];
t("loading placeholder = mc-empty gc-card gc-neutral inside #accRoot", !!ph && toneOf(ph) === "gc-neutral" && /<main id="accRoot" class="acc-page">/.test(HTML));

// ================================================================ 3) CSS
console.log("== accumulation.css ==");
var CSS = read("accumulation.css"), BODY = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
var RULES = (function () { var out = [], re = /([^{}]+)\{([^{}]*)\}/g, m; while ((m = re.exec(BODY)) !== null) { var p = m[1].trim(); if (p.charAt(0) === "@") continue; out.push({ sel: p.split(",").map(function (s) { return s.trim().replace(/\s+/g, " "); }), body: m[2] }); } return out; })();
function rulesFor(sel) { return RULES.filter(function (r) { return r.sel.indexOf(sel) >= 0; }); }
function decl(rules, prop) { var v = null; rules.forEach(function (r) { var re = new RegExp("(?:^|;)\\s*" + prop.replace(/-/g, "\\-") + "\\s*:\\s*([^;]+)", "g"), m; while ((m = re.exec(r.body)) !== null) v = m[1].trim(); }); return v; }
var remap = rulesFor("#accRoot .gc-card");
t("inside a card the --mc-* tokens become glass ink (text/muted/border)", decl(remap, "--mc-text") === "var(--gc-ink)" && decl(remap, "--mc-text-2") === "var(--gc-ink)" &&
  decl(remap, "--mc-muted") === "var(--gc-ink-2)" && decl(remap, "--mc-border") === "var(--gc-line)");
t("mixed-content empty card stays block", decl(rulesFor("#accRoot .mc-empty.gc-card"), "display") === "block");
var faces = [".acc-card", ".acc-sec", ".acc-card-top", ".acc-strip", ".acc-chips", ".acc-pill", ".acc-chip"].filter(function (s) {
  var b = rulesFor(s).map(function (r) { return r.body; }).join(";");
  return /(?:^|;)\s*(background|border|border-color)\s*:/.test(b) || /52, 211, 153/.test(b);
});
t("old card / pill faces removed (glass-cards.css paints them)", faces.length === 0, faces);
t("the count pills keep a gap (inline-flex would glue text + count)", !!decl(rulesFor(".acc-pill"), "gap"));
t("an empty chips strip is hidden", decl(rulesFor(".acc-chips:empty"), "display") === "none");
function lum(hex) {
  var m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || "").trim()); if (!m) return -1;
  var h = m[1].length === 3 ? m[1].replace(/(.)/g, "$1$1") : m[1];
  var c = [0, 2, 4].map(function (i) { var v = parseInt(h.substr(i, 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
var inks = { ".acc-ok": decl(rulesFor(".acc-ok"), "color"), ".acc-no": decl(rulesFor(".acc-no"), "color"), ".acc-stale": decl(rulesFor(".acc-stale"), "color"),
  ".acc-rec-bull": decl(rulesFor(".acc-rec-bull"), "--acc-rec-ink"), ".acc-rec-watch": decl(rulesFor(".acc-rec-watch"), "--acc-rec-ink"), ".acc-rec-bear": decl(rulesFor(".acc-rec-bear"), "--acc-rec-ink") };
var dim = Object.keys(inks).filter(function (k) { return !(lum(inks[k]) >= 0.70); });
t("coloured text on the glass is lifted (luminance ≥ 0.70 → ≥ 4.5:1 on every tone)", dim.length === 0, dim.map(function (k) { return k + "=" + inks[k]; }));
t("no opacity-dimmed text inside the card (ink-2 is the floor)", !/opacity\s*:\s*0?\.\d/.test(rulesFor(".acc-part span em").map(function (r) { return r.body; }).join(";")));
t("no Doto / dot-matrix / LED font", !/doto|dot-?matrix|\bLED\b|DSEG/i.test(CSS));

console.log("");
console.log(pass + fail + " checks · " + pass + " passed · " + fail + " failed");
process.exit(fail ? 1 : 0);
