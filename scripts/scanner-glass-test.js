"use strict";
// ============================================================
// MARKET SCANNER (/scanner) — การ์ดแก้ว (glass-cards.css)
//   node scripts/scanner-glass-test.js
//
// บูต scanner-page.js จริงใน VM (DOM ปลอมของ #scannerRoot · localStorage ปลอมที่มีผลสแกนล่าสุด scanner_results_v1 ·
// fetch ปลอมไม่ตอบ — หน้าสแกนเมื่อกดปุ่มเท่านั้น) แล้วล็อก:
//   · การ์ด → สถานะต้นทาง → tone (สถานะที่หน้าคำนวณอยู่แล้วเท่านั้น · ไม่มีสถานะ → gc-neutral):
//       🔔 สัญญาณซื้อ (.sc-card.sc-card-buy)  ระดับวอลุ่มที่การ์ดคิดอยู่แล้ว (volCls จาก volumeConfirmation ของเซิร์ฟเวอร์)
//            sc-vol-strong (VERY_STRONG_VOLUME · STRONG_VOLUME_CONFIRMED) → calm · sc-vol-ok (VOLUME_CONFIRMED) → normal ·
//            sc-vol-weak (VOLUME_NOT_CONFIRMED · VOLUME_DATA_NOT_AVAILABLE) → warning
//       ⏳ ใกล้ตัดขึ้น (.sc-card ไม่มี sc-card-buy)  NEAR_EMA_BULLISH_CROSS (แท็กอำพันเดิม · "รอ … เพื่อ confirm") → warning
//       แผงควบคุม (.sc-hero) · ข้อความว่าง (.sc-empty / .mc-empty) · การ์ดกลุ่ม (.sc-uni-sec) · วิธีคิด (.sc-method) → neutral
//     หน้านี้ไม่มีสถานะ "แย่" → ไม่มี gc-danger (ใต้ SMA200 = แท็กสีแดงเดิมบนการ์ด ไม่ใช่สีการ์ด)
//   · ทุกการ์ดมี tone เดียว · ไม่มีการ์ดแก้วซ้อนการ์ดแก้ว · หัว section อยู่บนพื้นหน้า (gc-section-h) · ราคา gc-num
//   · ชิ้นกลาง: ตาราง gc-table ใน gc-table-wrap (โฟกัสได้ + aria-label) · ช่อง symbol gc-field · ปุ่ม gc-btn / gc-btn-ghost ·
//     แถบความคืบหน้าตอนสแกน gc-funnel-rail (สีขาว — ไล่สีเดิมไม่มีความหมาย)
//   · id / data-scan / ข้อความเดิมคงอยู่ · ค่าใน innerHTML ถูก escape
//   · HTML / CSS: glass-cards.css ครั้งเดียว หลัง mission-control.css ก่อน scanner.css · Inter 700 · เวอร์ชัน bump ·
//     โทเคน mc ในการ์ด = หมึกแก้ว · ผิวการ์ด/ปุ่มเก่าถูกลบ
// ============================================================
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var PUB = path.join(__dirname, "..", "public");
function read(f) { return fs.readFileSync(path.join(PUB, f), "utf8"); }

var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; return; }
  fail++;
  console.error("  ✗ " + name + (extra !== undefined ? "  → " + JSON.stringify(extra) : ""));
}

var TONES = ["gc-calm", "gc-normal", "gc-warning", "gc-danger", "gc-neutral"];
var GC_V = "20261121-gc-2";
var V = { css: "20261122-sc-2", js: "20261122-sc-2" };
var ADVISORY = /ควรซื้อ|ควรขาย|น่าซื้อ|น่าขาย|น่าเข้า|แนะนำซื้อ|จุดเข้า|ตัดขาดทุน|\bBuy\b|\bSell\b/;

// ---------------------------------------------------------------- fixture (รูปเดียวกับแถวที่ /api/thai-stock-scanner ส่ง)
var VOL_THAI = { VERY_STRONG_VOLUME: "วอลุ่มแรงมาก", STRONG_VOLUME_CONFIRMED: "วอลุ่ม confirm แรง", VOLUME_CONFIRMED: "วอลุ่ม confirm",
  VOLUME_NOT_CONFIRMED: "วอลุ่มยังไม่ confirm", VOLUME_DATA_NOT_AVAILABLE: "ไม่มีข้อมูลวอลุ่ม" };
function buy(uni, sym, vol, ratio, sma, days, extra) {
  var r = { displaySymbol: sym, name: sym + " Corp", close: 123.45, signal: "EMA_BULLISH_CROSS", signalThai: "EMA12 ตัดขึ้น EMA26",
    crossoverDate: "2026-11-20", daysSinceCrossover: days, volumeRatio: ratio, volumeConfirmation: vol, volumeConfirmationThai: VOL_THAI[vol],
    sma200Status: sma, action: ratio >= 1 ? "เริ่มมีสัญญาณฟื้นตัวพร้อมวอลุ่ม / เฝ้าดูต่อ" : "เริ่มมีสัญญาณฟื้นตัว แต่ควรรอวอลุ่ม confirm", _uni: uni };
  Object.keys(extra || {}).forEach(function (k) { r[k] = extra[k]; });
  return r;
}
function near(uni, sym, vol, gap) {
  return { displaySymbol: sym, name: sym + " Holdings", close: 45.6, signal: "NEAR_EMA_BULLISH_CROSS", signalThai: "ใกล้ตัดขึ้น", emaGapPct: gap,
    volumeConfirmation: vol, volumeConfirmationThai: VOL_THAI[vol], sma200Status: "BELOW_SMA200", action: "รอ EMA12 ตัดขึ้น EMA26 เพื่อ confirm", _uni: uni };
}
var AT = new Date(Date.now() - 5 * 60000).toISOString();
var RESULTS = {
  SET100_MAI: { results: [buy("SET100_MAI", "AAA", "VERY_STRONG_VOLUME", 2.4, "ABOVE_SMA200", 1), buy("SET100_MAI", "BBB", "STRONG_VOLUME_CONFIRMED", 1.7, "BELOW_SMA200", 2)],
    near: [near("SET100_MAI", "NNN", "VERY_STRONG_VOLUME", -0.2)], insufficient: [{ displaySymbol: "IIII", reason: "ข้อมูลไม่พอ" }], failed: [], total: 12, scannedAt: AT },
  DR: { results: [buy("DR", "CCC", "VOLUME_CONFIRMED", 1.2, "ABOVE_SMA200", 3, { drNote: "CCC80" })], near: [], insufficient: [], failed: [], total: 5, scannedAt: AT },
  CRYPTO10: { results: [buy("CRYPTO10", "DDD", "VOLUME_NOT_CONFIRMED", 0.6, "BELOW_SMA200", 1),
    buy("CRYPTO10", "EEE", "VOLUME_DATA_NOT_AVAILABLE", null, "SMA200_NOT_AVAILABLE", 2, { name: '<img src=x onerror="alert(1)">' })],
    near: [near("CRYPTO10", "MMM", "VOLUME_NOT_CONFIRMED", -0.4)], insufficient: [], failed: [{ displaySymbol: "FFF", errorMessage: "HTTP 500" }], total: 10, scannedAt: AT },
  CUSTOM_GLOBAL: { results: [], near: [], insufficient: [], failed: [], total: 2, scannedAt: AT }
};
var EXPECT = { AAA: "gc-calm", BBB: "gc-calm", CCC: "gc-normal", DDD: "gc-warning", EEE: "gc-warning", NNN: "gc-warning", MMM: "gc-warning" };

// ---------------------------------------------------------------- boot scanner-page.js in a VM
var SRC = read("scanner-page.js");
function boot(store) {
  var listeners = {};
  var root = {
    innerHTML: "",
    querySelector: function (sel) {
      if (sel === ".sc-hero") return null; // renderControls() → full render(): the progress markup lands in innerHTML
      return { addEventListener: function (ev, fn) { listeners[sel] = fn; }, value: "" };
    },
    querySelectorAll: function () { return []; }
  };
  var doc = {
    readyState: "complete",
    getElementById: function (id) { return id === "scannerRoot" ? root : null; },
    addEventListener: function () {},
    createElement: function () { return { innerHTML: "", firstChild: null }; }
  };
  var ls = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); }
  };
  var fetched = [];
  var win = {};
  var ctx = vm.createContext({
    window: win, document: doc, localStorage: ls, console: console, Date: Date, JSON: JSON, Math: Math, Promise: Promise,
    fetch: function (url) { fetched.push(String(url)); return new Promise(function () {}); } // never answers: the scan stays "in progress"
  });
  vm.runInContext(SRC, ctx, { filename: "scanner-page.js" });
  return { root: root, page: win.ScannerPage, fetched: fetched, click: function (sel) { if (listeners[sel]) listeners[sel](); return !!listeners[sel]; } };
}

// ---------------------------------------------------------------- tiny parser for the rendered markup
var VOID = { input: 1, br: 1, img: 1, hr: 1, meta: 1, link: 1, wbr: 1 };
function parse(html) {
  var out = [], stack = [], re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, m;
  while ((m = re.exec(html)) !== null) {
    var tag = m[2].toLowerCase();
    if (m[1]) {
      for (var i = stack.length - 1; i >= 0; i--) if (stack[i].tag === tag) { stack[i].inner = html.slice(stack[i].start, m.index); stack.length = i; break; }
      continue;
    }
    var cm = /\sclass="([^"]*)"/.exec(m[3]);
    var el = { tag: tag, attrs: m[3], cls: cm ? cm[1].split(/\s+/).filter(Boolean) : [], start: m.index + m[0].length, parent: stack.length ? stack[stack.length - 1] : null, inner: "" };
    out.push(el);
    if (!VOID[tag]) stack.push(el);
  }
  return out;
}
function has(el, c) { return el.cls.indexOf(c) >= 0; }
function attrOf(el, name) { var m = new RegExp("\\s" + name + '="([^"]*)"').exec(el.attrs); return m ? m[1] : null; }
function inGlass(el) { for (var p = el.parent; p; p = p.parent) if (has(p, "gc-card")) return true; return false; }
function tonesOf(el) { return el.cls.filter(function (c) { return TONES.indexOf(c) >= 0; }); }
function text(s) { return String(s).replace(/<[^>]*>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&"); }
function symOf(card) { var m = /<b class="sc-sym">([^<]*)<\/b>/.exec(card.inner); return m ? m[1] : null; }
function cardsWhere(els, c) { return els.filter(function (e) { return has(e, c); }); }

// every glass card: exactly one tone · never glass inside glass
function cardContract(label, els) {
  var cards = cardsWhere(els, "gc-card");
  var badTone = cards.filter(function (c) { return tonesOf(c).length !== 1; }).map(function (c) { return c.cls.join(" "); });
  var nested = cards.filter(inGlass).map(function (c) { return c.cls.join(" "); });
  t(label + ": every gc-card has exactly one tone", cards.length > 0 && badTone.length === 0, badTone);
  t(label + ": no glass card inside a glass card", nested.length === 0, nested);
  t(label + ": no gc-danger — the scanner computes no 'bad' status", cardsWhere(els, "gc-danger").length === 0);
  return cards;
}

// ================================================================ 1. scan results → tones (real render path)
console.log("== results on screen ==");
var B = boot({ scanner_results_v1: JSON.stringify(RESULTS) });
var HTML1 = B.root.innerHTML;
var E1 = parse(HTML1);
cardContract("results", E1);
t("nothing is fetched on load (scans run on button press only)", B.fetched.length === 0, B.fetched);

var sig = cardsWhere(E1, "sc-card");
var got = {};
sig.forEach(function (c) { got[symOf(c)] = { tone: tonesOf(c), buy: has(c, "sc-card-buy"), tile: has(c, "gc-card") && has(c, "gc-tile") }; });
// AAA..EEE are buys (🔔 grid + nothing else), NNN/MMM are near (⏳ grid)
Object.keys(EXPECT).forEach(function (sym) {
  var g = got[sym];
  t("signal card " + sym + " → " + EXPECT[sym], !!g && g.tile && g.tone.length === 1 && g.tone[0] === EXPECT[sym], g);
});
t("buy cards keep .sc-card-buy, near cards do not", got.AAA && got.AAA.buy && got.CCC.buy && got.NNN && !got.NNN.buy && !got.MMM.buy);
t("one tile per row (5 buys + 2 near)", sig.length === 7, sig.length);
// one case per tone the page can produce, from the volume level the card itself shows
var volTag = {};
sig.forEach(function (c) {
  var tag = parse(c.inner).filter(function (e) { return has(e, "sc-tag") && (has(e, "sc-vol-strong") || has(e, "sc-vol-ok") || has(e, "sc-vol-weak")); })[0];
  if (tag && has(c, "sc-card-buy")) volTag[symOf(c)] = tag.cls.filter(function (k) { return /^sc-vol-/.test(k); })[0];
});
t("buy tone follows the card's own volume tag (strong → calm · ok → normal · weak → warning)",
  volTag.AAA === "sc-vol-strong" && volTag.BBB === "sc-vol-strong" && volTag.CCC === "sc-vol-ok" && volTag.DDD === "sc-vol-weak" && volTag.EEE === "sc-vol-weak", volTag);
t("below SMA200 does not change the card tone (BBB below → still calm) · the SMA tag keeps its red class",
  got.BBB && got.BBB.tone[0] === "gc-calm" && /class="sc-tag sc-sma-below">ใต้ SMA200/.test(HTML1));

var close = cardsWhere(E1, "sc-close");
t("price on every tile = gc-num (Inter 700 tabular)", close.length === 7 && close.every(function (e) { return has(e, "gc-num"); }));

// no-status cards → neutral
var hero = cardsWhere(E1, "sc-hero")[0];
t("control panel (.sc-hero) → gc-card gc-neutral", !!hero && has(hero, "gc-card") && tonesOf(hero).join() === "gc-neutral");
var unis = cardsWhere(E1, "sc-uni-sec");
t("universe sections (SET · DR · Crypto · Custom) → gc-card gc-neutral", unis.length === 4 && unis.every(function (u) { return has(u, "gc-card") && tonesOf(u).join() === "gc-neutral"; }), unis.length);
var method = cardsWhere(E1, "sc-method")[0];
t("method note (.sc-method) → gc-card gc-neutral", !!method && has(method, "gc-card") && tonesOf(method).join() === "gc-neutral");
var inEmpty = cardsWhere(E1, "sc-empty");
t("an empty universe ('ไม่พบสัญญาณในกลุ่มนี้') stays a plain box inside its card (no glass in glass)",
  inEmpty.length === 1 && !has(inEmpty[0], "gc-card") && inGlass(inEmpty[0]) && text(inEmpty[0].inner) === "ไม่พบสัญญาณในกลุ่มนี้");

// section headings sit on the page
var heads = cardsWhere(E1, "sc-block-head");
t("section heads (🔔 · ⏳) are gc-section-h on the page", heads.length === 2 && heads.every(function (h) { return has(h, "gc-section-h") && !inGlass(h); }), heads.length);

// tables
var wraps = cardsWhere(E1, "gc-table-wrap");
var tables = E1.filter(function (e) { return e.tag === "table"; });
t("each result table: table.sc-tbl.gc-table inside a gc-table-wrap", tables.length === 3 && tables.every(function (tb) { return has(tb, "sc-tbl") && has(tb, "gc-table") && tb.parent && has(tb.parent, "gc-table-wrap"); }), tables.length);
t("table wraps are focusable regions with an aria-label (no money, no advisory words)", wraps.length === 3 && wraps.every(function (w) {
  var al = attrOf(w, "aria-label");
  return attrOf(w, "tabindex") === "0" && attrOf(w, "role") === "region" && !!al && !/฿|บาท/.test(al) && !ADVISORY.test(al);
}));
var numTh = E1.filter(function (e) { return e.tag === "th" && has(e, "gc-cell-num"); }).map(function (e) { return text(e.inner); });
t("numeric columns (ราคา · วอลุ่ม) are gc-cell-num", numTh.join() === "ราคา,วอลุ่ม,ราคา,วอลุ่ม,ราคา,วอลุ่ม", numTh);
var numTd = E1.filter(function (e) { return e.tag === "td" && has(e, "gc-cell-num"); });
t("each table row (7: SET 3 · DR 1 · Crypto 3) has 2 numeric cells", numTd.length === 2 * 7, numTd.length);

// controls
function byId(els, id) { return els.filter(function (e) { return attrOf(e, "id") === id; })[0]; }
var all = byId(E1, "scScanAll"), cust = byId(E1, "scScanCustom"), inp = byId(E1, "scCustom");
var scans = E1.filter(function (e) { return attrOf(e, "data-scan") != null; });
t("▶ สแกนทั้งหมด = gc-btn (white) and keeps id + sc-btn classes", !!all && has(all, "gc-btn") && !has(all, "gc-btn-ghost") && has(all, "sc-btn") && has(all, "sc-btn-primary"));
t("universe buttons keep data-scan and wear gc-btn gc-btn-ghost", scans.map(function (b) { return attrOf(b, "data-scan"); }).join() === "SET100_MAI,DR,CRYPTO10" &&
  scans.every(function (b) { return has(b, "gc-btn") && has(b, "gc-btn-ghost") && has(b, "sc-btn"); }));
t("สแกน custom = gc-btn gc-btn-ghost (id kept)", !!cust && has(cust, "gc-btn") && has(cust, "gc-btn-ghost"));
t("symbol input #scCustom = gc-field", !!inp && inp.tag === "input" && has(inp, "gc-field"));
var stamps = cardsWhere(E1, "sc-stamp");
t("scan stamps = gc-pill gc-pill-ghost", stamps.length === 3 && stamps.every(function (s) { return has(s, "gc-pill") && has(s, "gc-pill-ghost"); }));

// copy + escaping
["🔎 Market Scanner", "▶ สแกนทั้งหมด", "🔔 สัญญาณซื้อที่พบ", "⏳ ใกล้ตัดขึ้น", "เรียงตามความแรง (วอลุ่ม → ความสด → เหนือ SMA200)", "ไม่พบสัญญาณในกลุ่มนี้",
  "ข้อมูลไม่พอ/ล้มเหลว 1 รายการ", "IIII — ข้อมูลไม่พอ", "FFF — HTTP 500", "ข้อมูลเพื่อประกอบการตัดสินใจ ไม่ใช่คำแนะนำซื้อขาย", "สแกน 12 · ซื้อ 2 · ใกล้ตัด 1"].forEach(function (s) {
  t("copy kept: " + s, text(HTML1).indexOf(s) >= 0);
});
t("values put into innerHTML are escaped", HTML1.indexOf("<img") < 0 && HTML1.indexOf("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;") >= 0);

// ================================================================ 2. empty / no-buy states
console.log("== empty states ==");
var E0 = parse(boot({}).root.innerHTML);
cardContract("first visit", E0);
var e0 = cardsWhere(E0, "sc-empty");
t("first visit: 'กด ▶ สแกนทั้งหมด …' is a neutral glass card on the page", e0.length === 1 && has(e0[0], "gc-card") && tonesOf(e0[0]).join() === "gc-neutral" && !inGlass(e0[0]) &&
  text(e0[0].inner) === "กด ▶ สแกนทั้งหมด เพื่อเริ่มค้นหาสัญญาณซื้อ");
t("first visit: no signal tiles, no tables", cardsWhere(E0, "sc-card").length === 0 && cardsWhere(E0, "gc-table").length === 0);

var NOBUY = { DR: { results: [], near: [near("DR", "QQQ", "VOLUME_CONFIRMED", -0.1)], insufficient: [], failed: [], total: 5, scannedAt: AT } };
var EN = parse(boot({ scanner_results_v1: JSON.stringify(NOBUY) }).root.innerHTML);
cardContract("no buys", EN);
var en = cardsWhere(EN, "sc-empty").filter(function (e) { return !inGlass(e); });
t("no buys: 'ยังไม่พบสัญญาณซื้อ …' is a neutral glass card", en.length === 1 && has(en[0], "gc-card") && tonesOf(en[0]).join() === "gc-neutral" && /^ยังไม่พบสัญญาณซื้อ/.test(text(en[0].inner)));
var q = cardsWhere(EN, "sc-card")[0];
t("no buys: the near card is still warning", !!q && tonesOf(q).join() === "gc-warning" && !has(q, "sc-card-buy"));

// ================================================================ 3. while scanning (progress bar + หยุด)
console.log("== scanning ==");
var S = boot({ scanner_results_v1: JSON.stringify(RESULTS) });
t("▶ สแกนทั้งหมด is wired", S.click("#scScanAll"));
var ES = parse(S.root.innerHTML);
cardContract("scanning", ES);
var bar = cardsWhere(ES, "sc-progress-bar")[0];
var fill = bar ? parse(bar.inner).filter(function (e) { return e.tag === "i"; })[0] : null;
t("progress bar = gc-funnel-rail > i.gc-funnel-fill (white, width from the scan)", !!bar && has(bar, "gc-funnel-rail") && !!fill && has(fill, "gc-funnel-fill") && /width:\s*\d+%/.test(attrOf(fill, "style") || ""));
var stop = byId(ES, "scCancel");
t("หยุด = gc-btn gc-btn-ghost (id kept)", !!stop && has(stop, "gc-btn") && has(stop, "gc-btn-ghost") && text(stop.inner) === "หยุด");
var allS = byId(ES, "scScanAll");
t("buttons are disabled while a scan runs", !!allS && /\sdisabled\b/.test(allS.attrs));
t("the scan asked the existing endpoint only", S.fetched.length === 1 && S.fetched[0].indexOf("/api/thai-stock-scanner?universe=SET100_MAI") === 0, S.fetched);

// ================================================================ 4. HTML: stylesheet order + versions
console.log("== scanner.html ==");
var PAGE = read("scanner.html");
var sheets = [], re = /<link\b[^>]*rel="stylesheet"[^>]*href="\/([^"?]+)(?:\?v=([^"]*))?"/g, m;
while ((m = re.exec(PAGE)) !== null) sheets.push({ f: m[1], v: m[2] || null });
var names = sheets.map(function (s) { return s.f; });
var iT = names.indexOf("theme.css"), iM = names.indexOf("mission-control.css"), iG = names.indexOf("glass-cards.css"), iS = names.indexOf("scanner.css");
t("glass-cards.css?v=" + GC_V + " loaded exactly once", sheets.filter(function (s) { return s.f === "glass-cards.css"; }).length === 1 && iG >= 0 && sheets[iG].v === GC_V, sheets);
t("order theme.css → mission-control.css → glass-cards.css → scanner.css", iT === 0 && iM > iT && iG > iM && iS > iG, names);
t("Inter 700 is loaded", /fonts\.googleapis\.com\/css2\?family=Inter:wght@[^"&]*700/.test(PAGE));
t("scanner.css bumped to " + V.css, iS >= 0 && sheets[iS].v === V.css, iS >= 0 ? sheets[iS].v : null);
t("scanner-page.js bumped to " + V.js, PAGE.indexOf('src="/scanner-page.js?v=' + V.js + '"') >= 0);
t("loading placeholder = mc-empty gc-card gc-neutral (same as the other glass pages)", /<div class="mc-empty gc-card gc-neutral"><strong>กำลังโหลด Market Scanner…<\/strong><\/div>/.test(PAGE));
t("the page root (#scannerRoot.sc-page) is kept", /<main id="scannerRoot" class="sc-page">/.test(PAGE));

// ================================================================ 5. scanner.css: token map + old faces gone
console.log("== scanner.css ==");
var CSS = read("scanner.css");
var BODY = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
var RULES = [], rr = /([^{}]+)\{([^{}]*)\}/g, r;
while ((r = rr.exec(BODY)) !== null) { var pre = r[1].trim(); if (pre.charAt(0) !== "@") RULES.push({ sel: pre.split(",").map(function (s) { return s.trim().replace(/\s+/g, " "); }), body: r[2] }); }
function rulesFor(sel) { return RULES.filter(function (x) { return x.sel.indexOf(sel) >= 0; }); }
var map = rulesFor(".sc-page .gc-card").map(function (x) { return x.body; }).join(";");
t("inside a card the mc text tokens become glass ink (--mc-text → --gc-ink · --mc-muted → --gc-ink-2)",
  /--mc-text:\s*var\(--gc-ink\)/.test(map) && /--mc-muted:\s*var\(--gc-ink-2\)/.test(map) && /--mc-border:\s*var\(--gc-line\)/.test(map), map);
var pageMap = RULES.filter(function (x) { return x.sel.length === 1 && x.sel[0] === ".sc-page" && /--mc-muted/.test(x.body); }).map(function (x) { return x.body; }).join(";");
t("on the page --mc-muted follows the theme (--app-text-2 — #64748b is under 4.5:1 on both page backgrounds)", /--mc-muted:\s*var\(--app-text-2\)/.test(pageMap), pageMap);
var FACE = [".sc-card", ".sc-card-buy", ".sc-hero", ".sc-uni-sec", ".sc-method", ".sc-empty", ".sc-btn", ".sc-btn-primary", ".sc-btn-ghost",
  ".sc-btn:hover:not(:disabled)", ".sc-customline input", ".sc-stamp", ".sc-progress-bar", ".sc-progress-bar i", ".sc-tbl th", ".sc-tbl td"];
var faces = [];
FACE.forEach(function (sel) { rulesFor(sel).forEach(function (x) { if (/(^|;)\s*(background|border|border-radius|box-shadow)\s*:/.test(x.body)) faces.push(sel); }); });
t("no old face left on elements that wear the glass / shared controls (background · border · radius · shadow)", faces.length === 0, faces);
t("no dot-matrix / LED font", !/doto|dot-?matrix|\bLED\b|DSEG|segment/i.test(CSS));

console.log("");
console.log(pass + fail + " checks · " + pass + " passed · " + fail + " failed");
process.exit(fail ? 1 : 0);
