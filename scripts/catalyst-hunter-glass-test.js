"use strict";
// ============================================================
// THAI CATALYST HUNTER (/catalyst-hunter) — การ์ดแก้ว (glass-cards.css)
//   node scripts/catalyst-hunter-glass-test.js
//
// บูต catalyst-page.js จริงใน VM (DOM ปลอมของ #chRoot · ไม่มี IndexedDB/cache · ไม่ยิง API) แล้วใส่แถวผลสแกน
// สมมุติลง CatalystPage._state.rows ตรง ๆ (รูปเดียวกับที่ engine คืน) เพื่อล็อก:
//   · การ์ด → สถานะต้นทาง → tone — ใช้โทนที่หน้าคิดไว้แล้ว (tone / finTone / recogTone / trapTone / whyTone)
//       เขียว → gc-calm · ฟ้า/ม่วง → gc-normal · อำพัน/ส้ม → gc-warning · แดง → gc-danger · เทา/นับได้ 0 → gc-neutral
//       ยกเว้นการ์ดสถานะ EXIT_WATCH → gc-warning (statusGc · ป้ายยังฟ้า) — PRICED_IN คง gc-normal
//       Hunter Brief (x[3]) · สรุป 12 สถานะ · Landscape · Rare · Targets · Near-Miss · Catalyst Watch ·
//       ทำไมส่วนใหญ่ไม่ใช่เป้า (is-danger เดิม) · Detail: หัว (สถานะหลัก) · ช่อง RISK · หัวข้อ 3/4/5/8
//       ไม่มีสถานะ → gc-neutral: hero · ตาราง (All Candidates / หุ้นที่เข้าเงื่อนไข / SMA200 / Matrix) · กติกา ·
//       แหล่งข้อมูล · ตัวสแกนบนหน้าภาพรวม · ข้อความว่าง · หัวข้อ Detail ที่ไม่มีสถานะ
//       ผลสแกนไม่ครบ (ch-partial เดิมสีเตือน) → gc-warning
//   · ทุกการ์ดมี tone เดียว · ไม่มีการ์ดแก้วซ้อนการ์ดแก้ว · ตารางรายชื่อ = gc-table ใน gc-table-wrap (โฟกัสได้ + aria-label)
//   · ปุ่ม = gc-btn / gc-btn-ghost · ช่องกรอง = gc-field · ตัวเลขนับ = gc-num
//   · HTML: glass-cards.css ครั้งเดียว หลัง mission-control.css ก่อน catalyst-hunter.css · Inter 700 · เวอร์ชัน bump
//   · CSS: โทเคน mc ในการ์ด = หมึกแก้ว · หน้าการ์ดเดิม (พื้น/กรอบ) ถูกลบ · ปุ่มเก่าไม่วาดหน้าเอง
// หน้านี้ไม่แสดงเงินของพอร์ต (ตัวเลขเงินมีแค่งบของบริษัทในตลาด) จึงไม่มีเทสต์ Privacy lock
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
var V = { css: "20261122-chc-21", js: "20261122-cp-26" };

// ---------------------------------------------------------------- markup helpers
function classesOf(tag) {
  var m = /\sclass="([^"]*)"/.exec(tag);
  return m ? m[1].split(/\s+/).filter(Boolean) : [];
}
// ทุก tag เปิดที่มี class ที่ต้องการ (ทั้งคำ)
function tagsWith(html, cls) {
  var out = [], re = /<([a-z][a-z0-9]*)\b[^>]*>/gi, m;
  while ((m = re.exec(html)) !== null) if (classesOf(m[0]).indexOf(cls) >= 0) out.push(m[0]);
  return out;
}
function toneOf(tag) {
  var c = classesOf(tag);
  return TONES.filter(function (x) { return c.indexOf(x) >= 0; });
}
// tone ของการ์ดใบแรกที่มีคลาสทั้งหมดใน `need` (+ เงื่อนไข attr ถ้ามี)
function cardTone(html, need, attrNeedle) {
  var tags = tagsWith(html, "gc-card").filter(function (tg) {
    var c = classesOf(tg);
    return need.every(function (n) { return c.indexOf(n) >= 0; }) && (!attrNeedle || tg.indexOf(attrNeedle) >= 0);
  });
  if (!tags.length) return null;
  var tn = toneOf(tags[0]);
  return tn.length === 1 ? tn[0] : tn.join("+") || "(none)";
}
// การ์ดซ้อนการ์ด — เดิน tag stack ของ markup ที่หน้าเรนเดอร์
var VOID = { br: 1, img: 1, input: 1, hr: 1, meta: 1, link: 1, wbr: 1, source: 1 };
function nestedCards(html) {
  var stack = [], bad = [], re = /<(\/?)([a-z][a-z0-9]*)\b([^>]*)>/gi, m;
  while ((m = re.exec(html)) !== null) {
    var name = m[2].toLowerCase();
    if (m[1]) {
      for (var i = stack.length - 1; i >= 0; i--) if (stack[i].name === name) { stack.length = i; break; }
      continue;
    }
    if (VOID[name] || /\/\s*$/.test(m[3])) continue;
    var isCard = classesOf(m[0]).indexOf("gc-card") >= 0;
    if (isCard && stack.some(function (x) { return x.card; })) bad.push(m[0].slice(0, 90));
    stack.push({ name: name, card: isCard });
  }
  return bad;
}
function everyCardOneTone(html) {
  return tagsWith(html, "gc-card").filter(function (tg) { return toneOf(tg).length !== 1; })
    .map(function (tg) { return tg.slice(0, 90); });
}

// ---------------------------------------------------------------- fixture (รูปเดียวกับแถวที่ engine คืน)
function row(tk, stateKey, o) {
  o = o || {};
  var mat = o.mat || "C1_RUMOR";
  return {
    ticker: tk, name: tk + " PCL", market: "SET", lifecycle: "WATCH",
    qualification: {
      state: { key: stateKey, label: stateKey.replace(/_/g, " ") }, priority: o.prio || 5,
      dimensions: {
        A_price: { deep: !!o.deep, pct: o.dd != null ? o.dd : -45, label: "DEEP" },
        C_catalyst: { maturityKey: mat, availability: "CATALYST_IDENTIFIED", headline: null },
        D_financial: { stateKey: o.fin || "NO_INFLECTION" },
        E_recognition: { key: o.recog || "EARLY" },
        F_valueTrap: { high: o.trap === "HIGH" }
      },
      whyInteresting: "เหตุผลจาก engine ของ " + tk, why: ["ข้อเท็จจริงจาก engine"], flags: [], missing: [], rerating: null
    },
    drawdown: { available: true, drawdown52wPct: o.dd != null ? o.dd : -45, bars: 800,
      state: { label: "DEEP" }, priceDate: "2026-11-20" },
    catalyst: { maturity: { key: mat, label: mat }, availability: { key: "CATALYST_IDENTIFIED", label: "IDENTIFIED" },
      businessEvidenceCount: o.biz != null ? o.biz : 1, financialEvidenceCount: 0 },
    financialInflection: o.fi || { available: false, state: { key: "FINANCIAL_EVIDENCE_UNAVAILABLE" },
      note: "ยังไม่มีตัวเลขงบ", metrics: {} },
    recognition: { state: { key: o.recog || "EARLY", thai: "ระดับการรับรู้" }, metrics: {}, evidence: [], note: "" },
    valueTrap: { risk: { key: o.trap || "LOW", thai: "ระดับ value trap" },
      signals: o.trap === "HIGH" ? ["หนี้เพิ่มต่อเนื่อง", "กำไรลดต่อเนื่อง"] : [], improving: [], quartersUsed: 4, note: "" },
    whyFell: { category: o.why || "MARKET_WIDE_DECLINE", thai: "คำอธิบายสาเหตุ", evidence: [] },
    technical: null, story: { evidenceItems: [], timeline: [] }, insiderActivity: null, dataQuality: {}
  };
}
var FI_STRONG = { available: true, state: { key: "STRONG_INFLECTION" }, metrics: {}, quarterCount: 8,
  latestQuarter: "2026Q3", confirmedCoreCount: 3, source: "SET" };
var ROWS = [
  // ผ่านครบห้าข้อ → Rare (เขียว)
  row("RAREA", "STRONG_EARLY_CATALYST", { deep: true, mat: "C3_CONFIRMED", fin: "STRONG_INFLECTION", fi: FI_STRONG }),
  // ตกข้อเดียว (ราคายังไม่ย่อลึก) → Near-Miss + Targets "รอราคา" + Watch confirmed (เขียว)
  row("CATC", "CATALYST_EXISTS", { deep: false, mat: "C3_CONFIRMED", fin: "STRONG_INFLECTION", prio: 3 }),
  // เรื่องกำลังก่อตัว → Targets "emerging" + Watch emerging (อำพัน) · trap MEDIUM · why RELATIVE
  row("EMRB", "EMERGING", { deep: true, trap: "MEDIUM", why: "RELATIVE_UNDERPERFORMANCE", prio: 6 }),
  // value trap HIGH → การ์ดปฏิเสธแดง · why FUNDAMENTAL · ตลาดร้อนแรง
  row("TRAPD", "VALUE_TRAP_RISK", { deep: true, trap: "HIGH", why: "FUNDAMENTAL_DETERIORATION_EVIDENCE",
    recog: "OVERHEATED", prio: 8 }),
  // ราคาขยับโดยไม่มีเหตุการณ์อธิบาย (ม่วง) · trap UNKNOWN · why UNKNOWN
  row("MOVEE", "UNEXPLAINED_MARKET_MOVE", { deep: true, trap: "UNKNOWN", why: "UNKNOWN", recog: "UNKNOWN", prio: 7 }),
  // ไม่มี catalyst (เทา)
  row("NONEF", "NO_CATALYST", { deep: true, biz: 0, mat: "NONE", prio: 9 }),
  // catalyst สุกงอมแล้ว (ฟ้า)
  row("PRICG", "PRICED_IN", { deep: false, prio: 8 }),
  // ราคา/วอลุ่มร้อนแรงหลัง catalyst ยืนยัน (ป้ายฟ้า) — หน้านี้ถือเป็นความเสี่ยงจริง → การ์ดระวัง (statusGc)
  // C3 + ยังไม่ย่อลึก + trap ไม่ HIGH → เข้า Today's Targets กลุ่ม "รอราคา"
  row("EXITW", "EXIT_WATCH", { deep: false, mat: "C3_CONFIRMED", recog: "OVERHEATED", prio: 4 })
];

// ---------------------------------------------------------------- VM boot
var els = {};
function mkEl() {
  return { innerHTML: "", style: {}, attributes: {}, children: [], appendChild: function () {},
    setAttribute: function (k, v) { this.attributes[k] = v; }, getAttribute: function (k) { return this.attributes[k] || null; },
    addEventListener: function () {}, querySelector: function () { return null; }, querySelectorAll: function () { return []; },
    closest: function () { return null; }, focus: function () {},
    classList: { add: function () {}, remove: function () {}, contains: function () { return false; } } };
}
var doc = { readyState: "complete", createElement: mkEl, addEventListener: function () {},
  getElementById: function (id) { if (!els[id]) { els[id] = mkEl(); els[id].id = id; } return els[id]; },
  querySelector: function () { return null; }, querySelectorAll: function () { return []; } };
var store = {};
var win = { document: doc, location: { search: "", pathname: "/catalyst-hunter" },
  history: { pushState: function () {} },
  localStorage: { getItem: function (k) { return store[k] || null; }, setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; } },
  addEventListener: function () {}, scrollTo: function () {},
  fetch: function () { return Promise.reject(new Error("no network in test")); },
  console: console, Math: Math, JSON: JSON, Date: Date, Number: Number, String: String, Object: Object, Array: Array,
  encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent, isFinite: isFinite,
  parseInt: parseInt, parseFloat: parseFloat, Promise: Promise, RegExp: RegExp, Error: Error, setTimeout: setTimeout,
  CatalystEngine: { CONFIG: { bars: { year: 250, threeYear: 750 } } } };
win.window = win; win.self = win;
var ctx = vm.createContext(win);
var bootErr = null;
try { vm.runInContext(read("catalyst-page.js"), ctx, { filename: "catalyst-page.js" }); }
catch (e) { bootErr = e.message; }
t("catalyst-page.js boot ได้", !bootErr && !!win.CatalystPage, bootErr);

function view(search) {
  win.location.search = search || "";
  win.CatalystPage.render();
  return els.chRoot.innerHTML;
}

setTimeout(function () {
  var S = win.CatalystPage._state;
  S.cacheChecking = false; S.loading = false; S.partial = null; S.error = null;
  S.rows = JSON.parse(JSON.stringify(ROWS));
  S.scannedAt = new Date().toISOString();
  S.universeMeta = { counts: { set: 637, mai: 231, total: 868 } };

  // ---------------------------------------------------------------- RADAR (?view=catalyst)
  var rad = view("?view=catalyst");
  t("Radar เรนเดอร์ได้", rad.indexOf("Hunter Brief") >= 0 && rad.length > 3000, rad.length);

  // Hunter Brief — tone = x[3] ของ hunterBrief (green/amber/blue/grey)
  (function () {
    var tags = tagsWith(rad, "ch-brief-card");
    var by = {};
    // ลำดับการ์ดคงที่: RARE · NEAR-MISS · CATALYST EXISTS · EMERGING
    ["RARE", "NEAR", "CAT", "EMERG"].forEach(function (k, i) { by[k] = tags[i] ? toneOf(tags[i]).join("+") : null; });
    t("Brief: RARE (1 ตัว · green) → gc-calm", by.RARE === "gc-calm", by);
    t("Brief: NEAR-MISS (1 ตัว · amber) → gc-warning", by.NEAR === "gc-warning", by);
    t("Brief: CATALYST EXISTS (blue) → gc-normal", by.CAT === "gc-normal", by);
    t("Brief: EMERGING (blue) → gc-normal", by.EMERG === "gc-normal", by);
    t("Brief: ตัวเลขเป็น gc-num", /ch-brief-card[^>]*>[\s\S]{0,80}<b class="gc-num">\d+<\/b>/.test(rad));
  })();

  // Rare / Targets / Near-Miss / Watch — tone(statusKey)
  t("Rare card (STRONG_EARLY_CATALYST · green) → gc-calm", cardTone(rad, ["ch-rare"]) === "gc-calm", cardTone(rad, ["ch-rare"]));
  t("Target card CATC (CATALYST_EXISTS) → gc-calm",
    /class="gc-card gc-calm ch-target">[\s\S]{0,40}CATC/.test(rad));
  t("Target card EMRB (EMERGING · amber) → gc-warning",
    /class="gc-card gc-warning ch-target">[\s\S]{0,40}EMRB/.test(rad));
  t("Near-Miss CATC (ตกข้อเดียว) → gc-calm", cardTone(rad, ["ch-near"], 'data-ch-ticker="CATC"') === "gc-calm",
    cardTone(rad, ["ch-near"], 'data-ch-ticker="CATC"'));
  t("Watch: Catalyst Exists → gc-calm", cardTone(rad, ["ch-watch", "ch-watch-confirmed"]) === "gc-calm",
    cardTone(rad, ["ch-watch", "ch-watch-confirmed"]));
  t("Watch: Emerging → gc-warning", cardTone(rad, ["ch-watch", "ch-watch-emerging"]) === "gc-warning",
    cardTone(rad, ["ch-watch", "ch-watch-emerging"]));

  // ทำไมส่วนใหญ่ไม่ใช่เป้า — is-danger เดิม
  t("Reject VALUE_TRAP_RISK (is-danger) → gc-danger",
    cardTone(rad, ["ch-reject"], 'data-ch-filter-status="VALUE_TRAP_RISK"') === "gc-danger");
  t("Reject NO_CATALYST → gc-neutral",
    cardTone(rad, ["ch-reject"], 'data-ch-filter-status="NO_CATALYST"') === "gc-neutral");
  t("Reject: ตัวเลขเป็น gc-num", /ch-reject-top"><b class="gc-num">\d+</.test(rad));

  // สรุป 12 สถานะ — tone(k) · นับได้ 0 → neutral
  [["STRONG_EARLY_CATALYST", "gc-calm"], ["EMERGING", "gc-warning"], ["UNEXPLAINED_MARKET_MOVE", "gc-normal"],
    ["PRICED_IN", "gc-normal"], ["VALUE_TRAP_RISK", "gc-danger"], ["NO_CATALYST", "gc-neutral"],
    ["EARLY_CATALYST", "gc-neutral"], ["EXIT_WATCH", "gc-warning"]].forEach(function (x) {
    var got = cardTone(rad, ["ch-sum-card"], 'data-ch-filter-status="' + x[0] + '"');
    t("สรุปสถานะ " + x[0] + " → " + x[1], got === x[1], got);
  });
  // EXIT_WATCH: การ์ดระวัง แต่ป้ายสถานะยังฟ้าตามเดิม (PRICED_IN ยัง normal — ตรวจไว้ด้านบน)
  t("Target card EXITW (EXIT_WATCH) → gc-warning", /class="gc-card gc-warning ch-target">[\s\S]{0,40}EXITW/.test(rad));
  t("EXIT_WATCH: ป้ายสถานะบนการ์ดยังฟ้า (ch-pill ch-tone-blue)",
    /EXITW[\s\S]{0,200}<span class="ch-pill ch-tone-blue">EXIT WATCH<\/span>/.test(rad));
  t("สรุปสถานะ 0 ตัวยังมีคลาส is-zero เดิม", /class="ch-sum-card is-zero ch-tone-green gc-card gc-tile gc-neutral"/.test(rad));

  // Landscape — tone(k) · 0 ตัว → neutral
  [["STRONG_EARLY_CATALYST", "gc-calm"], ["CATALYST_EXISTS", "gc-calm"], ["EMERGING", "gc-warning"],
    ["UNEXPLAINED_MARKET_MOVE", "gc-normal"], ["EARLY_CATALYST", "gc-neutral"], ["FUNDAMENTAL_RECOVERY", "gc-neutral"]]
    .forEach(function (x) {
      var got = cardTone(rad, ["ch-lscape"], 'data-ch-filter-status="' + x[0] + '"');
      t("Landscape " + x[0] + " → " + x[1], got === x[1], got);
    });

  // ส่วนที่เป็นตาราง/รายการก้อนเดียว = การ์ด gc-neutral · ตาราง gc-table
  t("hero = gc-card gc-neutral", cardTone(rad, ["ch-hero"]) === "gc-neutral");
  t("All Candidates = ch-sec + gc-card gc-neutral", /<section class="ch-sec gc-card gc-neutral"><div class="ch-sec-head">\s*<h2>All Candidates /.test(rad));
  t("Matrix = gc-card gc-neutral", /<section class="ch-sec gc-card gc-neutral"><div class="ch-sec-head"><h2>Deep Drawdown/.test(rad));
  t("กติกาความหมาย = gc-card gc-neutral", /ch-sec ch-sec-quiet gc-card gc-neutral"><details class="ch-semantics">/.test(rad));
  t("แหล่งข้อมูล = gc-card gc-neutral", /ch-sec ch-sec-quiet gc-card gc-neutral"><div class="ch-sec-head"><h2>แหล่งข้อมูล/.test(rad));
  t("ตาราง All Candidates = gc-table ใน gc-table-wrap ที่โฟกัสได้",
    /<div class="ch-tablewrap gc-table-wrap" tabindex="0" aria-label="All Candidates"><table class="ch-table gc-table">/.test(rad));
  t("Matrix wrap โฟกัสได้ + aria-label", /class="ch-tablewrap gc-table-wrap" tabindex="0" aria-label="Deep Drawdown/.test(rad));
  t("ช่องค้นหา/ตัวกรอง = gc-field", /<input type="search" class="gc-field"/.test(rad) && /<select class="gc-field" data-ch-filter=/.test(rad));
  t("คอลัมน์ตัวเลข = gc-cell-num", rad.indexOf('<td class="ch-num gc-cell-num">') >= 0 &&
    /<th class="ch-th-sort gc-cell-num">/.test(rad));
  t("ส่วนกริดการ์ด: หัวข้ออยู่บนพื้นหน้า (gc-section-h)",
    ["Rare Opportunities", "Today's Targets", "Near-Miss", "Catalyst Watch", "Qualification Landscape", "ทำไมหุ้นส่วนใหญ่ไม่ใช่เป้า"]
      .every(function (h) { return new RegExp('<div class="ch-sec-head gc-section-h">\\s*<h2>' + h).test(rad); }));
  t("Radar: ไม่มีการ์ดแก้วซ้อนการ์ดแก้ว", nestedCards(rad).length === 0, nestedCards(rad));
  t("Radar: ทุกการ์ดมี tone เดียว", everyCardOneTone(rad).length === 0, everyCardOneTone(rad));
  t("ปุ่มทุกตัว = gc-btn", tagsWith(rad, "ch-btn").every(function (tg) { return classesOf(tg).indexOf("gc-btn") >= 0; }));

  // ---------------------------------------------------------------- HUB + SMA200
  var hub = view("");
  t("Hub: การ์ดตัวสแกน = gc-card gc-neutral (ไม่มีสถานะดี/แย่)",
    tagsWith(hub, "ch-hub-card").length === 2 && tagsWith(hub, "ch-hub-card").every(function (tg) {
      return toneOf(tg).join() === "gc-neutral"; }));
  t("Hub: ตัวเลขนับ = gc-num", /<b class="ch-hub-n gc-num">\d+/.test(hub));
  t("Hub: ตารางหุ้นที่เข้าเงื่อนไข = gc-table บนการ์ด gc-neutral",
    /<section class="ch-sec gc-card gc-neutral"><div class="ch-sec-head">\s*<h2>หุ้นที่เข้าเงื่อนไข/.test(hub) &&
    /class="ch-tablewrap gc-table-wrap" tabindex="0" aria-label="หุ้นที่เข้าเงื่อนไข"><table class="ch-table gc-table ch-hub-table">/.test(hub));
  t("Hub: ป้ายตัวสแกนคงคลาสเดิม (ch-hub-badge ch-tone-)", hub.indexOf('class="ch-hub-badge ch-tone-') >= 0);
  t("Hub: ไม่มีการ์ดซ้อน", nestedCards(hub).length === 0, nestedCards(hub));
  t("Hub: ทุกการ์ดมี tone เดียว", everyCardOneTone(hub).length === 0, everyCardOneTone(hub));

  var sma = view("?view=sma200");
  t("SMA200: ส่วนตาราง = gc-card gc-neutral", /<section class="ch-sec ch-sec-primary gc-card gc-neutral">/.test(sma));
  t("SMA200: ไม่มีการ์ดซ้อน (ข้อความว่างในการ์ดเป็นบ่อ ไม่ใช่การ์ด)", nestedCards(sma).length === 0, nestedCards(sma));

  // ผลสแกนไม่ครบ — สถานะเตือนเดิม
  S.partial = { nextOffset: 10, total: 868 };
  var part = view("");
  t("ผลสแกนไม่ครบ (ch-partial) → gc-warning", cardTone(part, ["ch-partial"]) === "gc-warning");
  t("ผลสแกนไม่ครบ: ปุ่มสแกนต่อ = gc-btn · เริ่มใหม่ = gc-btn-ghost",
    /class="ch-btn gc-btn" data-ch-resume="1"/.test(part) && /gc-btn gc-btn-ghost" data-ch-rescan="1"/.test(part));
  S.partial = null;

  // ---------------------------------------------------------------- DETAIL
  function blkTone(html, titleNeedle) {
    var re = /<section class="(ch-blk[^"]*)"><h3><span>[^<]*<\/span>([^<]*)<\/h3>/g, m;
    while ((m = re.exec(html)) !== null) if (m[2].indexOf(titleNeedle) >= 0) {
      var tn = TONES.filter(function (x) { return m[1].split(/\s+/).indexOf(x) >= 0; });
      return tn.join("+");
    }
    return null;
  }
  var dA = view("?ticker=RAREA");
  t("Detail หัว RAREA (STRONG_EARLY) → gc-calm", cardTone(dA, ["ch-dhead"]) === "gc-calm", cardTone(dA, ["ch-dhead"]));
  t("Detail RAREA §5 value trap LOW → gc-calm", blkTone(dA, "Value Trap") === "gc-calm", blkTone(dA, "Value Trap"));
  t("Detail RAREA §4 งบ STRONG → gc-calm", blkTone(dA, "อะไรเปลี่ยนในตัวเลข") === "gc-calm", blkTone(dA, "อะไรเปลี่ยนในตัวเลข"));
  t("Detail RAREA §3 why MARKET-WIDE (blue) → gc-normal", blkTone(dA, "ทำไมราคาตก") === "gc-normal", blkTone(dA, "ทำไมราคาตก"));
  t("Detail RAREA §8 recognition EARLY (blue) → gc-normal", blkTone(dA, "ตลาดรับรู้แล้วแค่ไหน") === "gc-normal");
  t("Detail หัวข้อที่ไม่มีสถานะ → gc-neutral",
    ["ทำไมหุ้นตัวนี้อยู่ที่นี่", "ห่วงโซ่หลักฐาน", "หลักฐานที่ขัดกันเอง", "การซื้อขายของผู้บริหาร",
      "หลักฐานเชิงเทคนิค", "ยังขาดหลักฐานอะไร", "อะไรจะพิสูจน์ว่าเราคิดผิด", "ไทม์ไลน์หลักฐาน", "Related Candidates"]
      .every(function (h) { return blkTone(dA, h) === "gc-neutral"; }));
  t("Detail ช่อง RISK ไม่มีหลักฐานเสี่ยง → gc-neutral", cardTone(dA, ["ch-dsum-risk"]) === "gc-neutral");
  t("Detail ช่อง PASSED/NOT YET/WAITING = gc-neutral", tagsWith(dA, "ch-dsum-col").filter(function (tg) {
    return classesOf(tg).indexOf("ch-dsum-risk") < 0; }).every(function (tg) { return toneOf(tg).join() === "gc-neutral"; }));
  t("Detail ปุ่มกลับ = gc-btn gc-btn-ghost", /class="ch-btn ch-btn-ghost gc-btn gc-btn-ghost" data-ch-home="1"/.test(dA));

  var dD = view("?ticker=TRAPD");
  t("Detail หัว TRAPD (VALUE_TRAP_RISK) → gc-danger", cardTone(dD, ["ch-dhead"]) === "gc-danger");
  t("Detail TRAPD §5 value trap HIGH → gc-danger (คง ch-blk-danger เดิม)",
    /<section class="ch-blk ch-blk-danger gc-card gc-danger">/.test(dD));
  t("Detail TRAPD ช่อง RISK มีหลักฐาน → gc-danger", cardTone(dD, ["ch-dsum-risk"]) === "gc-danger");
  t("Detail TRAPD §3 why FUNDAMENTAL (red) → gc-danger", blkTone(dD, "ทำไมราคาตก") === "gc-danger");
  t("Detail TRAPD §8 recognition OVERHEATED (red) → gc-danger", blkTone(dD, "ตลาดรับรู้แล้วแค่ไหน") === "gc-danger");
  t("Detail TRAPD §4 ไม่มีงบ → gc-neutral", blkTone(dD, "อะไรเปลี่ยนในตัวเลข") === "gc-neutral");

  var dB = view("?ticker=EMRB");
  t("Detail หัว EMRB (EMERGING · amber) → gc-warning", cardTone(dB, ["ch-dhead"]) === "gc-warning");
  t("Detail EMRB §5 value trap MEDIUM → gc-warning", blkTone(dB, "Value Trap") === "gc-warning");
  t("Detail EMRB §3 why RELATIVE (amber) → gc-warning", blkTone(dB, "ทำไมราคาตก") === "gc-warning");

  var dE = view("?ticker=MOVEE");
  t("Detail หัว MOVEE (UNEXPLAINED · violet) → gc-normal", cardTone(dE, ["ch-dhead"]) === "gc-normal");
  t("Detail MOVEE §5 value trap UNKNOWN → gc-neutral", blkTone(dE, "Value Trap") === "gc-neutral");
  t("Detail MOVEE §3 why UNKNOWN → gc-neutral", blkTone(dE, "ทำไมราคาตก") === "gc-neutral");
  t("Detail MOVEE §8 recognition UNKNOWN → gc-neutral", blkTone(dE, "ตลาดรับรู้แล้วแค่ไหน") === "gc-neutral");
  t("Detail หัว NONEF (NO_CATALYST · grey) → gc-neutral", cardTone(view("?ticker=NONEF"), ["ch-dhead"]) === "gc-neutral");
  var dW = view("?ticker=EXITW");
  t("Detail หัว EXITW (EXIT_WATCH) → gc-warning · badge ยังฟ้า", cardTone(dW, ["ch-dhead"]) === "gc-warning" &&
    dW.indexOf('class="ch-badge ch-badge-lg ch-tone-blue">EXIT WATCH<') >= 0, cardTone(dW, ["ch-dhead"]));
  t("Detail EXITW §8 recognition OVERHEATED → gc-danger", blkTone(dW, "ตลาดรับรู้แล้วแค่ไหน") === "gc-danger");
  t("Detail หัว PRICG (PRICED_IN) ยัง gc-normal", cardTone(view("?ticker=PRICG"), ["ch-dhead"]) === "gc-normal");
  [dA, dD, dB, dE].forEach(function (d, i) {
    t("Detail #" + i + ": ไม่มีการ์ดซ้อน", nestedCards(d).length === 0, nestedCards(d));
    t("Detail #" + i + ": ทุกการ์ดมี tone เดียว", everyCardOneTone(d).length === 0, everyCardOneTone(d));
  });
  var dX = view("?ticker=NOPE");
  t("Detail ไม่มีข้อมูล → ch-empty gc-card gc-neutral", /class="ch-empty gc-card gc-neutral"><b>ยังไม่มีข้อมูลของ NOPE/.test(dX));

  // ---------------------------------------------------------------- empty states
  S.rows = [];
  var emp = view("");
  t("ยังไม่ได้สแกน → ch-empty gc-card gc-neutral + ปุ่ม gc-btn",
    /class="ch-empty gc-card gc-neutral"><b>ยังไม่ได้สแกน/.test(emp) && /class="ch-btn ch-btn-wide gc-btn" data-ch-rescan="1"/.test(emp));
  S.error = "ทดสอบ";
  var er = view("");
  t("เกิดข้อผิดพลาด → ch-empty gc-card gc-neutral + ปุ่ม gc-btn",
    /class="ch-empty gc-card gc-neutral"><b>เกิดข้อผิดพลาด/.test(er) && /class="ch-btn gc-btn" data-ch-rescan="1">ลองอีกครั้ง/.test(er));
  S.error = null;

  // ---------------------------------------------------------------- source: tone map ใช้โทนเดิมเท่านั้น
  var src = read("catalyst-page.js");
  var mapM = /var GC_TONE = (\{[\s\S]*?\});/.exec(src);
  var map = null;
  try { map = mapM ? vm.runInNewContext("(" + mapM[1] + ")") : null; } catch (e) { map = null; }
  t("GC_TONE ครอบทุกโทนเดิมของหน้า (green amber orange red blue violet grey)",
    !!map && ["green", "amber", "orange", "red", "blue", "violet", "grey"].every(function (k) { return TONES.indexOf(map[k]) >= 0; }), map);
  t("GC_TONE: green→calm · blue/violet→normal · amber/orange→warning · red→danger · grey→neutral",
    !!map && map.green === "gc-calm" && map.blue === "gc-normal" && map.violet === "gc-normal" &&
    map.amber === "gc-warning" && map.orange === "gc-warning" && map.red === "gc-danger" && map.grey === "gc-neutral");
  t("gcTone() ค่าที่ไม่รู้จัก → gc-neutral", /function gcTone\(t\) \{ return Object\.prototype\.hasOwnProperty\.call\(GC_TONE, t\) \? GC_TONE\[t\] : "gc-neutral"; \}/.test(src));

  // ---------------------------------------------------------------- HTML
  var html = read("catalyst-hunter.html");
  var gcLinks = html.match(/\/glass-cards\.css\?v=[^"]+/g) || [];
  t("HTML โหลด glass-cards.css ครั้งเดียว เวอร์ชัน " + GC_V, gcLinks.length === 1 && gcLinks[0] === "/glass-cards.css?v=" + GC_V, gcLinks);
  var iMc = html.indexOf("/mission-control.css"), iGc = html.indexOf("/glass-cards.css"), iCh = html.indexOf("/catalyst-hunter.css");
  t("ลำดับ mission-control.css → glass-cards.css → catalyst-hunter.css", iMc >= 0 && iMc < iGc && iGc < iCh, [iMc, iGc, iCh]);
  t("HTML โหลด Inter 700", /family=Inter:wght@[^"&]*700/.test(html));
  t("catalyst-hunter.css bump เป็น " + V.css, html.indexOf("/catalyst-hunter.css?v=" + V.css + '"') >= 0);
  t("catalyst-page.js bump เป็น " + V.js, html.indexOf("/catalyst-page.js?v=" + V.js + '"') >= 0);
  t("ข้อความโหลดแรกเป็น gc-card gc-neutral", /<main id="chRoot" class="ch-page"><div class="ch-empty gc-card gc-neutral">/.test(html));

  // ---------------------------------------------------------------- CSS
  var css = read("catalyst-hunter.css");
  var body = css.replace(/\/\*[\s\S]*?\*\//g, "");
  function rule(sel) {
    var re = new RegExp("(^|\\})\\s*" + sel.replace(/[.\-]/g, function (c) { return "\\" + c; }) + "\\s*\\{([^}]*)\\}");
    var m = re.exec(body);
    return m ? m[2] : null;
  }
  t("โทเคน mc ในการ์ด = หมึกแก้ว", /#chRoot \.gc-card \{[^}]*--mc-dim: var\(--gc-ink-2\)[^}]*--mc-border: var\(--gc-line\)/.test(body));
  ["ch-hero", "ch-brief", "ch-brief-card", "ch-sum-card", "ch-rare", "ch-target", "ch-near", "ch-watch", "ch-lscape",
    "ch-reject", "ch-hub-card", "ch-dhead", "ch-blk", "ch-dsum-col", "ch-empty", "ch-partial", "ch-sec"].forEach(function (c) {
    var r = rule("." + c);
    t("." + c + " ไม่วาดหน้าการ์ดเอง (ไม่มี background / border)", r !== null && !/(^|;)\s*(background|border)\s*:/.test(r), r);
  });
  t("ปุ่มเก่า .ch-btn ไม่วาดหน้าปุ่มเอง", rule(".ch-btn") === null && !/\.ch-btn:hover/.test(body));
  t("ตัวกรองเก่าไม่วาดหน้าเอง (ใช้ gc-field)", !/\.ch-fld select, \.ch-fld input \{[^}]*background/.test(body));
  t("ไม่มี hover ที่ทับพื้นกระจกของการ์ดที่เป็นปุ่ม",
    !/\.ch-(near|sum-card|lscape|reject|hub-card):hover\s*\{[^}]*background/.test(body) &&
    !/button\.ch-brief-card:hover\s*\{[^}]*background/.test(body));
  t("การ์ดที่เป็นปุ่มมี :focus-visible ของตัวเอง", /#chRoot button\.gc-card:focus-visible \{[^}]*outline:/.test(body));
  t("ไม่มีฟอนต์ตัวเลขแบบจุด", !/Doto|dot-?matrix|LED/i.test(css));
  t("ไม่ใช้ color-mix", css.indexOf("color-mix") < 0);
  // ตัวหนังสือรองบนการ์ด ≥ 4.5:1: แถวหรี่ใช้หมึกรอง (--mc-dim = ink-2 บนกระจก) ไม่ใช่ opacity
  t("แถวหรี่ (ch-tl-other / ch-m-unavail) ใช้สีหมึกรอง ไม่ใช่ opacity",
    /\.ch-tl-other \{[^}]*color: var\(--mc-dim/.test(body) && !/\.ch-tl-other \{[^}]*opacity/.test(body) &&
    /tr\.ch-m-unavail td \{[^}]*color: var\(--mc-dim/.test(body) && !/ch-m-unavail[^{]*\{[^}]*opacity/.test(body));
  t("ไม่มี opacity หรี่ทั้งการ์ด (is-zero)", !/is-zero[^{]*\{[^}]*opacity/.test(body));

  console.log("");
  console.log(pass + fail + " checks · " + pass + " passed · " + fail + " failed");
  process.exit(fail ? 1 : 0);
}, 60);
