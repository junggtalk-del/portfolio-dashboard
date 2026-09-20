// ============================================================
// ล็อกกติกา: หน้า /thesis ต้องไม่พูด P/E คนละเลขสำหรับหุ้นตัวเดียวกัน
//
// เหตุที่ต้องมีเทสต์ชุดนี้: หัวการ์ดตัดสินใจเคยพิมพ์ valuationView.note ดิบ ๆ
// ซึ่งเป็นข้อความ curated ที่ "ฝังราคาไว้" และประทับ asOf ไว้ ขณะที่ §14
// คำนวณสดจาก ValuationEngine — พอราคาขยับ สองการ์ดก็พูดคนละเลขทันที
// เคสจริง: META note เขียน "forward P/E ~16x (ราคา ~$542)" ตอน asOf 2026-08
// แต่ราคาขึ้นเป็น $670 → §14 คำนวณได้ ~25.2 ผู้ใช้เห็น 25 กับ 16 บนหน้าเดียวกัน
//
// กติกาที่ล็อกไว้:
//   1. ตัวเลข P/E บนหัวการ์ด ต้องเท่ากับ §14 เป๊ะ (แหล่งเดียว ปัดเศษเดียวกัน)
//   2. §14 บอก N/A เมื่อไหร่ หัวการ์ดห้าม volunteer ตัวเลขแทน
//   3. ข้อความ curated ต้องถูกพับพร้อมป้ายวันที่ ไม่ปนกับเลขสด
// ============================================================
"use strict";
var vm = require("vm"), fs = require("fs"), path = require("path");
var PUB = path.join(__dirname, "..", "public");
var D = require(path.join(PUB, "thesis-data.js"));
var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + (extra != null ? "  → " + extra : "")); }
}

function mkEl(id) {
  return { id: id, innerHTML: "", value: "", style: {}, attrs: {},
    appendChild: function () {}, setAttribute: function (k, v) { this.attrs[k] = v; },
    getAttribute: function (k) { return this.attrs[k] || null; },
    addEventListener: function () {}, querySelector: function () { return null; },
    querySelectorAll: function () { return []; }, closest: function () { return null; },
    focus: function () {}, setSelectionRange: function () {},
    classList: { add: function () {}, remove: function () {}, contains: function () { return false; } } };
}

var SRC = fs.readFileSync(path.join(PUB, "thesis-page.js"), "utf8");
var ROOT_ID = (/ROOT_ID\s*=\s*"([^"]+)"/.exec(SRC) || [])[1] || "thRoot";

function boot(ticker, snapshot) {
  var els = {};
  var doc = { readyState: "complete", createElement: mkEl, addEventListener: function () {},
    getElementById: function (id) { if (!els[id]) els[id] = mkEl(id); return els[id]; },
    querySelector: function () { return mkEl(); }, querySelectorAll: function () { return []; },
    body: mkEl("body"), documentElement: mkEl("html") };
  var store = {};
  var win = { document: doc,
    location: { search: "?ticker=" + ticker, pathname: "/thesis" },
    history: { pushState: function () {}, replaceState: function () {} },
    localStorage: { getItem: function (k) { return k in store ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; } },
    addEventListener: function () {}, dispatchEvent: function () {},
    fetch: function () { return Promise.resolve({ ok: true, json: function () { return Promise.resolve({}); } }); },
    console: console, Math: Math, JSON: JSON, Date: Date, Number: Number, String: String,
    Object: Object, Array: Array, Boolean: Boolean, isFinite: isFinite, isNaN: isNaN,
    parseInt: parseInt, parseFloat: parseFloat, Promise: Promise, RegExp: RegExp, Error: Error,
    encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent,
    setTimeout: setTimeout, clearTimeout: clearTimeout, Intl: Intl };
  win.window = win; win.self = win; win.globalThis = win;
  win.PortfolioDataSnapshot = { read: function () { return snapshot; } };
  var ctx = vm.createContext(win);
  ["scoring.js", "thesis-data.js", "thesis-engine.js", "valuation-engine.js",
   "intelligence-engine.js", "thesis-overview.js", "thesis-compare.js", "thesis-page.js"]
    .forEach(function (f) {
      try { vm.runInContext(fs.readFileSync(path.join(PUB, f), "utf8"), ctx, { filename: f }); }
      catch (e) { console.log("  โหลด " + f + " ไม่ได้: " + e.message); }
    });
  try { win.ThesisPage && win.ThesisPage.render(); } catch (e) { return { err: e.message }; }
  return { html: els[ROOT_ID] ? els[ROOT_ID].innerHTML : "" };
}

// ValuationEngine อ่านราคา live จาก snapshot.historicalData[ticker].closes เท่านั้น
// ถ้าป้อนผิดฟิลด์ เคส "ราคา live" จะตกกลับไปใช้ราคา KB เงียบ ๆ แล้วเทสต์จะไม่ได้ทดสอบจริง
function snapWith(prices) {
  var hd = {};
  Object.keys(prices).forEach(function (k) {
    hd[k] = { closes: [prices[k] * 0.98, prices[k]], dates: ["2026-09-18", "2026-09-19"] };
  });
  return { loadedAt: new Date().toISOString(), historicalData: hd };
}

function heroPe(h) { var m = /<span class="th-valnow[^"]*">P\/E ~([0-9.]+)/.exec(h); return m ? m[1] : null; }
function heroFwd(h) { var m = /<span class="th-valnow[^"]*">[^<]*?forward ~([0-9.]+)/.exec(h); return m ? m[1] : null; }
function heroNA(h) { return /<span class="th-valnow[^"]*">P\/E N\/A/.test(h); }
function s14Pe(h) { var m = /<small>P\/E \(trailing TTM\)<\/small><b>~([0-9.]+)<\/b>/.exec(h); return m ? m[1] : null; }
function s14Fwd(h) { var m = /<small>Forward P\/E<\/small><b>~([0-9.]+)<\/b>/.exec(h); return m ? m[1] : null; }
function s14NA(h) { return h.indexOf("N/A — ข้อมูลไม่พอคำนวณ P/E") >= 0; }

var tickers = Object.keys(D.companies);
var LIVE = {};
tickers.forEach(function (x, i) { LIVE[x] = 80 + i * 37; });

[["ไม่มีราคา live (ต้อง stale เหมือนกันทั้งสองการ์ด)", null],
 ["มีราคา live", snapWith(LIVE)]].forEach(function (pair) {
  var label = pair[0], snap = pair[1];
  console.log("\n== " + label + " ==");
  var same = 0, diff = [], naBoth = 0, naMismatch = [];
  tickers.forEach(function (tk) {
    var r = boot(tk, snap);
    if (r.err) { diff.push(tk + " render error: " + r.err); return; }
    var h = r.html;
    // กติกา 2: §14 บอก N/A -> หัวการ์ดต้องไม่โชว์ตัวเลข
    if (s14NA(h)) {
      if (heroPe(h) != null || heroFwd(h) != null) naMismatch.push(tk + " (§14 N/A แต่หัวโชว์ " + heroPe(h) + "/" + heroFwd(h) + ")");
      else naBoth++;
      return;
    }
    var a = heroPe(h), b = s14Pe(h), af = heroFwd(h), bf = s14Fwd(h);
    if (a == null && b == null) { naBoth++; return; }   // §14 ซ่อนทั้ง section (เช่น ETF)
    if (a == null || b == null) { naMismatch.push(tk + " (หัว " + a + " vs §14 " + b + ")"); return; }
    if (a === b && af === bf) same++;
    else diff.push(tk + ": หัว " + a + "/fwd " + af + " vs §14 " + b + "/fwd " + bf);
  });
  t("P/E และ forward ตรงกันทั้งสองการ์ดทุกตัว (" + same + " ตัว)", diff.length === 0, diff.join(" | "));
  t("§14 บอก N/A เมื่อไหร่ หัวการ์ดไม่ volunteer ตัวเลขแทน (" + naBoth + " ตัว)",
    naMismatch.length === 0, naMismatch.join(", "));
  if (snap) {
    var probe = boot("META", snap).html;
    t("เคสนี้ใช้ราคา live จริง ไม่ได้ตกกลับไปราคา KB",
      probe.indexOf("ราคา live") >= 0 && probe.indexOf("STALE PRICE") < 0);
  }
});

console.log("\n== META: เคสที่ทำให้ต้องมีเทสต์ชุดนี้ ==");
var h = boot("META", snapWith({ META: 670.24 })).html;
console.log("  หัวการ์ด : P/E ~" + heroPe(h) + " · forward ~" + heroFwd(h));
console.log("  §14      : P/E ~" + s14Pe(h) + " · forward ~" + s14Fwd(h));
t("สองการ์ดตรงกัน", heroPe(h) === s14Pe(h) && heroFwd(h) === s14Fwd(h));
t("เลขสดอยู่บนหัวการ์ด ไม่ต้องกางหา", heroPe(h) != null);
t("ข้อความ curated ถูกพับไว้", h.indexOf('<details class="th-valmore"') >= 0);
// ต้องรัดให้อยู่ใน <summary> ของปุ่มพับเท่านั้น — คำว่า "curated ณ" โผล่ในแบนเนอร์หัวหน้าด้วย
// ถ้า assert กว้าง ๆ จะผ่านทั้งที่ป้ายในปุ่มพับหายไป (false pass)
var sumTag = /<details class="th-valmore"><summary>([\s\S]*?)<\/summary>/.exec(h);
t("พับแล้วมีป้ายบอกวันที่ที่ประทับไว้ (ใน summary ของปุ่มพับ)",
  !!sumTag && /curated ณ 20[0-9][0-9]-[0-9][0-9]/.test(sumTag[1]),
  sumTag ? sumTag[1] : "(ไม่มี summary)");
t("ข้อความ curated เดิมยังอยู่ครบ ไม่ได้ลบทิ้ง", h.indexOf("ถูกสุดในกลุ่ม Mag7") >= 0);
t("เลขสดมาก่อนข้อความ curated ในลำดับการอ่าน",
  h.indexOf("th-valnow") >= 0 && h.indexOf("th-valmore") > h.indexOf("th-valnow"));

console.log("\n== หุ้นที่กำไร 12 เดือนติดลบ (INTC) ==");
var hi = boot("INTC", snapWith({ INTC: 108.6 })).html;
t("§14 บอก N/A", s14NA(hi));
t("หัวการ์ดบอก N/A ด้วย ไม่โชว์ตัวเลข", heroNA(hi) && heroPe(hi) == null && heroFwd(hi) == null);
t("บอกเหตุผลให้ผู้ใช้เข้าใจ", hi.indexOf("กำไร 12 เดือนติดลบ") >= 0);

console.log("\n== ข้อความ curated ห้ามกลับไปโชว์ลอย ๆ บนหัวการ์ด ==");
t("ไม่มีการพิมพ์ valuationView.note ดิบนอก <details>",
  /<span class="th-valnote">/.test(h) &&
  h.indexOf('<span class="th-valnote">') > h.indexOf('<details class="th-valmore"'));

// ============================================================
// สองมุมมองมูลค่า — วัดคนละเรื่อง ต้องติดป้ายให้ชัด ห้ามวางปนกันเฉย ๆ
//   engine  = เทียบ P/E กับมัธยฐาน 5 ปีของตัวเอง (กลไก คำนวณสด)
//   curated = วิจารณญาณคน ประทับ asOf และเป็นตัวที่เข้าสูตรคะแนน
// เคสจริง: GOOG ป้ายคนว่า "สมเหตุสมผล" แต่ engine ว่า ATTRACTIVE
//          META ป้ายคนว่า "ถูก" แต่ engine ว่า PREMIUM — กลับข้างทั้งคู่
// ============================================================
console.log("\n== สองมุมมองมูลค่า ต้องติดป้ายว่าอันไหนวัดอะไร ==");
var VX = { ATTRACTIVE: "ต่ำกว่าโซนอดีตตัวเอง", FAIR: "ใกล้ค่ากลางอดีต",
  PREMIUM: "สูงกว่าค่ากลางอดีต", EXPENSIVE: "สูงกว่าอดีตมาก" };
// ต้องรัดให้จับเฉพาะตัว chip จริง — คำว่า "เทียบอดีตตัวเอง" โผล่ในบล็อกคำอธิบาย (th-valbasis) ด้วย
// ถ้า regex กว้าง จะคว้าคำจากคำอธิบายมาแทน แล้วเทสต์จะรายงานผิด (เคยพลาดมาแล้ว)
function engChip(x) {
  var m = /<span class="th-chip th-tone-[^"]*">เทียบอดีตตัวเอง: \S+ ([^<]*)<\/span>/.exec(x);
  return m ? m[1].trim() : null;
}
function humanChip(x) {
  var m = /<span class="th-chip th-tone-[^"]*">มุมมองคน ณ ([0-9]{4}-[0-9]{2}): ([^<]*)<\/span>/.exec(x);
  return m ? { asOf: m[1], v: m[2].trim() } : null;
}
function facCell(x) { var m = /<div class="th-fcell"><span>Valuation<\/span><b>([^<]*)</.exec(x); return m ? m[1] : null; }
function s14Cls(x) { var m = /<span class="th-vx-cls th-vx-cls-([A-Z_]+)">/.exec(x); return m ? m[1] : null; }

var PX = { GOOG: 344.41, META: 665.75, PLTR: 177.64, DDOG: 229.92, MSFT: 493.78 };
var mismatch = [], noEngineOk = 0, labelled = 0;
Object.keys(PX).forEach(function (tk) {
  var x = boot(tk, snapWith(PX)).html;
  var cls = s14Cls(x), e = engChip(x), hu = humanChip(x), fc = facCell(x);
  // 1. ป้าย engine บนการ์ด ต้องใช้คำชุดเดียวกับ §14 เป๊ะ
  if (cls && cls !== "INSUFFICIENT_DATA") {
    if (e !== VX[cls]) mismatch.push(tk + ": การ์ดเขียน \"" + e + "\" แต่ §14 เป็น " + cls);
    else labelled++;
  } else {
    // engine ตัดสินไม่ได้ -> ห้ามมีป้าย engine เลย (ห้ามเดาคำตัดสินแทน)
    if (e != null) mismatch.push(tk + ": engine ตัดสินไม่ได้ แต่การ์ดยังขึ้นป้าย \"" + e + "\"");
    else noEngineOk++;
  }
  // 2. ป้ายมุมมองคน ต้องมีวันที่ และต้องใช้คำเดียวกับช่อง VALUATION
  if (!hu) mismatch.push(tk + ": ไม่มีป้ายมุมมองคนพร้อมวันที่");
  else if (fc && hu.v !== fc) mismatch.push(tk + ": ป้ายคนเขียน \"" + hu.v + "\" แต่ช่อง VALUATION เขียน \"" + fc + "\"");
});
t("ป้าย engine บนการ์ดใช้คำชุดเดียวกับ §14 (" + labelled + " ตัว)", mismatch.length === 0, mismatch.join(" | "));
t("engine ตัดสินไม่ได้ -> ไม่มีป้าย engine เลย (" + noEngineOk + " ตัว)", true);

var g = boot("GOOG", snapWith(PX)).html;
var m2 = boot("META", snapWith(PX)).html;
t("GOOG: โชว์ทั้งมุม engine และมุมคน ไม่ได้เลือกข้างเดียว",
  engChip(g) === "ต่ำกว่าโซนอดีตตัวเอง" && humanChip(g) && humanChip(g).v === "สมเหตุสมผล",
  engChip(g) + " / " + (humanChip(g) ? humanChip(g).v : "—"));
t("META: โชว์ทั้งสองมุมเช่นกัน (engine ว่าพรีเมียม · คนว่าถูก)",
  engChip(m2) === "สูงกว่าค่ากลางอดีต" && humanChip(m2) && humanChip(m2).v === "ถูก",
  engChip(m2) + " / " + (humanChip(m2) ? humanChip(m2).v : "—"));
t("บอกผู้ใช้ว่าสองมุมวัดคนละเรื่อง", g.indexOf("th-valbasis") >= 0);
t("บอกตรง ๆ ว่ามุมไหนเข้าสูตรคะแนน", /เป็นตัวที่เข้าสูตรคะแนนตัดสินใจ|เข้าสูตรคะแนน/.test(g));
t("เตือนว่ามุมคนอาจเก่ากว่าเลขสด", g.indexOf("เก่ากว่าเลขสด") >= 0);

console.log("\n" + (pass + fail) + " checks · " + pass + " passed · " + fail + " failed");
process.exit(fail ? 1 : 0);
