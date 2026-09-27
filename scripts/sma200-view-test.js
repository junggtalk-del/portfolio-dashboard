// SMA200 RECLAIM — เทสต์ชั้นแสดงผลใน Thai Catalyst Hunter (สเปค §25)
// node scripts/sma200-view-test.js
//
// เรนเดอร์หน้าจริงใน VM sandbox แบบเดียวกับ scripts/catalyst-test.js
// กติกา: วันที่ของ fixture ต้องสร้างจากวันนี้เสมอ ห้ามตรึงวัน
//        (ถ้าตรึง เทสต์จะกลายเป็นระเบิดเวลา — ผ่านวันนี้ แดงเองอีก 8 วัน)
"use strict";
var fs = require("fs");
var vm = require("vm");
var PUB = process.cwd() + "/public";

var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; return; }
  fail++; console.error("  ✗ " + name + (extra !== undefined ? " — got: " + JSON.stringify(extra) : ""));
}

// ---------- วันทำการล่าสุดนับจากวันนี้ (ไม่ตรึงวัน) ----------
function recentTradingDates(n) {
  var out = [];
  var ms = Date.now();
  var d0 = new Date(ms);
  // เริ่มจาก "เมื่อวาน" เพื่อให้แท่งสุดท้ายเป็นแท่งที่ปิดแล้วแน่นอน
  var cur = Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth(), d0.getUTCDate()) - 86400000;
  while (out.length < n) {
    var d = new Date(cur);
    var dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) out.push(d.toISOString().slice(0, 10));
    cur -= 86400000;
  }
  return out.reverse();
}
function rep(n, v) { var a = []; for (var i = 0; i < n; i++) a.push(v); return a; }

// ---------- fixtures ----------
// RECLAIMCO — ย่อลึกแล้วปิดกลับขึ้นเหนือ SMA200 จริง
var RECLAIM_CLOSES = rep(200, 100).concat([92, 106, 107]);
// FLATCO — ราคานิ่ง ไม่เคยข้ามเส้น (ต้องไม่มีป้ายเทคนิคโผล่)
var FLAT_CLOSES = rep(203, 100);
// TRAPCO — มี reclaim และ value trap HIGH พร้อมกัน (สเปค §12)
var TRAP_CLOSES = rep(200, 100).concat([90, 108, 109]);
// SHORTCO — ประวัติราคาไม่พอคำนวณ SMA200
var SHORT_CLOSES = rep(120, 100);

var DATES = recentTradingDates(203);
var SHORT_DATES = DATES.slice(-120);

function trapEvidence() {
  return {
    inspected: true, totalDisclosures: 4, routineCount: 1, unknownCount: 0, filingsCount: 2,
    perSource: {}, items: [],
    valueTrapThai: { risk: { key: "HIGH" },
      signals: ["รายได้ลดลงต่อเนื่อง", "กำไรต่อหุ้นลดลง", "กระแสเงินสดอิสระติดลบ"],
      improving: [], detail: null, quartersUsed: 8, note: "ทดสอบ" },
    note: "ทดสอบ",
  };
}

function apiItem(tk, nm, closes, dates, evidence) {
  return { ticker: tk, name: nm, market: "SET", universe: "SET",
    dates: dates, closes: closes, volumes: closes.map(function () { return 1e6; }),
    bars: closes.length, source: "test", sourceType: "LIVE_MARKET_DATA", range: "5y",
    evidence: evidence || null };
}

var fakeApi = {
  total: 4, offset: 0, scanned: 4, done: true, nextOffset: null, universe: "THAI_ALL",
  universeMeta: { source: "SET registry (test)", asOf: new Date().toISOString(),
    degraded: false, note: null, counts: { set: 637, mai: 231, total: 868 } },
  benchmark: { symbol: "^SET.BK", closes: rep(203, 100), available: true },
  items: [
    apiItem("RECLAIMCO", "Reclaim PCL", RECLAIM_CLOSES, DATES),
    apiItem("FLATCO", "Flat PCL", FLAT_CLOSES, DATES),
    apiItem("TRAPCO", "Trap PCL", TRAP_CLOSES, DATES, trapEvidence()),
    apiItem("SHORTCO", "Short PCL", SHORT_CLOSES, SHORT_DATES),
  ],
  failed: [],
};

// ---------- sandbox ----------
var els = {};
function mkEl() {
  return { innerHTML: "", style: {}, attributes: {}, children: [], appendChild: function () {},
    setAttribute: function (k, v) { this.attributes[k] = v; },
    getAttribute: function (k) { return this.attributes[k] || null; },
    addEventListener: function () {}, querySelector: function () { return null; },
    querySelectorAll: function () { return []; }, closest: function () { return null; },
    classList: { add: function () {}, remove: function () {}, contains: function () { return false; } } };
}
var doc = { readyState: "complete", createElement: mkEl, addEventListener: function () {},
  getElementById: function (id) { if (!els[id]) { els[id] = mkEl(); els[id].id = id; } return els[id]; },
  querySelector: function () { return mkEl(); }, querySelectorAll: function () { return []; } };
var store = {};
var win = { document: doc, location: { search: "", pathname: "/catalyst-hunter" },
  history: { pushState: function (q) { win.location.search = q.indexOf("?") >= 0 ? q.slice(q.indexOf("?")) : ""; } },
  localStorage: { getItem: function (k) { return store[k] || null; },
    setItem: function (k, v) { store[k] = String(v); }, removeItem: function (k) { delete store[k]; } },
  addEventListener: function () {},
  fetch: function () { return Promise.resolve({ ok: true, json: function () { return Promise.resolve(fakeApi); } }); },
  console: console, Math: Math, JSON: JSON, Date: Date, Number: Number, String: String,
  Object: Object, Array: Array, encodeURIComponent: encodeURIComponent,
  decodeURIComponent: decodeURIComponent, isFinite: isFinite, parseInt: parseInt,
  parseFloat: parseFloat, Promise: Promise, RegExp: RegExp, Error: Error, setTimeout: setTimeout,
  Intl: typeof Intl !== "undefined" ? Intl : undefined };
win.window = win; win.self = win;
var ctx = vm.createContext(win);

var bootOk = true;
// ต้องโหลด catalyst-qualification.js ด้วย ไม่งั้น r.qualification = null
// แล้วข้อยืนยันเรื่อง "สถานะไม่เปลี่ยน" จะทดสอบเส้นทางที่ไม่ใช่ของจริง
["catalyst-qualification.js", "technical-indicators.js", "sma200-reclaim.js",
  "catalyst-engine.js", "catalyst-data.js", "catalyst-page.js"]
  .forEach(function (f) {
    try { vm.runInContext(fs.readFileSync(PUB + "/" + f, "utf8"), ctx, { filename: f }); }
    catch (e) { bootOk = false; console.error("   boot " + f + ": " + e.message); }
  });

console.log("== boot + ลำดับการโหลด ==");
t("หน้าเว็บ boot ได้พร้อมโมดูลเทคนิค", bootOk);
t("window.Sma200Reclaim ถูกโหลด", !!win.Sma200Reclaim);
t("window.CatalystQualification ถูกโหลด (ไม่งั้นเทสต์สถานะจะทดสอบเส้นทางปลอม)",
  !!win.CatalystQualification);
t("window.AITechnicalIndicators ถูกโหลด (ตัวคำนวณ SMA ร่วม)", !!win.AITechnicalIndicators);
t("HTML โหลด technical-indicators ก่อน sma200-reclaim", (function () {
  var h = fs.readFileSync(PUB + "/catalyst-hunter.html", "utf8");
  var a = h.indexOf("/technical-indicators.js"), b = h.indexOf("/sma200-reclaim.js"),
    c = h.indexOf("/catalyst-page.js");
  return a >= 0 && b > a && c > b;
})());

var done = false;
win.CatalystPage.scanAll(true).then(function () {
  var rows = win.CatalystPage._state.rows;
  function row(tk) { return rows.filter(function (r) { return r.ticker === tk; })[0]; }

  console.log("== ผลของ engine ต่อ fixture (ต้องตรงกับที่ตั้งใจ ไม่งั้นเทสต์ข้างล่างว่างเปล่า) ==");
  var rc = row("RECLAIMCO"), fl = row("FLATCO"), tp = row("TRAPCO"), sh = row("SHORTCO");
  t("ชั้น qualification ทำงานจริงในแซนด์บ็อกซ์ (ไม่ใช่ null)",
    !!rc.qualification && !!rc.qualification.state, rc.qualification && rc.qualification.state.key);
  t("RECLAIMCO ได้สถานะเทคนิค = RECLAIM", rc.technical && rc.technical.status === "RECLAIM",
    rc.technical && [rc.technical.status, rc.technical.note]);
  t("FLATCO ไม่มีสัญญาณ", fl.technical && fl.technical.status === "NO_RECLAIM", fl.technical && fl.technical.status);
  t("TRAPCO มีสัญญาณ", tp.technical && tp.technical.status === "RECLAIM", tp.technical && tp.technical.status);
  t("TRAPCO ติด value trap HIGH จริง", tp.valueTrap.risk.key === "HIGH", tp.valueTrap.risk.key);
  t("SHORTCO ข้อมูลไม่พอ", sh.technical && sh.technical.status === "DATA_INSUFFICIENT",
    sh.technical && sh.technical.status);

  console.log("== §25 RADAR — ตาราง + ตัวกรอง ==");
  var html = els.chRoot.innerHTML;
  t("Radar เรนเดอร์ได้", html.length > 3000, html.length);
  t("มีคอลัมน์ SMA200 ในตาราง", html.indexOf('data-ch-sort="tech"') >= 0);
  t("มีตัวกรอง SMA200 Reclaim", html.indexOf('data-ch-filter="technical"') >= 0);
  t("ตัวกรองเดิมยังอยู่ครบ (ไม่ถูกแทนที่)",
    ["status", "maturity", "financial", "recognition", "trap", "lifecycle"].every(function (k) {
      return html.indexOf('data-ch-filter="' + k + '"') >= 0;
    }));
  t("ตัวเลือก RECLAIM มีให้เลือกในตัวกรอง", /data-ch-filter="technical"[\s\S]{0,400}?value="RECLAIM"/.test(html));
  t("แถวที่มีสัญญาณขึ้นป้าย RECLAIM", html.indexOf('class="ch-tech-pill"') >= 0);
  // §18 ในตาราง "ข้อมูลไม่พอ" ต้องอ่านออกว่าไม่รู้ ไม่ใช่ "—" ที่แปลว่าไม่มีสัญญาณ
  t("ช่องตารางของ SHORTCO บอกว่าข้อมูลไม่พอ ไม่ใช่ขีดเปล่า", (function () {
    var m = /<tr data-ch-ticker="SHORTCO"[\s\S]*?<\/tr>/.exec(html);
    return !!m && m[0].indexOf("ข้อมูลไม่พอ") >= 0;
  })(), (function () { var m = /<tr data-ch-ticker="SHORTCO"[\s\S]*?<\/tr>/.exec(html); return m ? m[0].slice(0, 200) : null; })());
  t("ช่องตารางของ FLATCO (ตรวจแล้วไม่เจอ) ใช้ขีด — คนละความหมายกับข้อมูลไม่พอ", (function () {
    var m = /<tr data-ch-ticker="FLATCO"[\s\S]*?<\/tr>/.exec(html);
    return !!m && m[0].indexOf("ข้อมูลไม่พอ") < 0;
  })());

  console.log("== §25 ตัวกรองทำงานจริง ==");
  var before = (html.match(/data-ch-ticker="/g) || []).length;
  win.CatalystPage._state.filter.technical = "RECLAIM";
  win.CatalystPage.render();
  var filtered = els.chRoot.innerHTML;
  t("กรอง RECLAIM แล้ว FLATCO หายจากตาราง",
    filtered.indexOf('data-ch-ticker="FLATCO"') < 0, undefined);
  t("กรอง RECLAIM แล้ว RECLAIMCO ยังอยู่", filtered.indexOf('data-ch-ticker="RECLAIMCO"') >= 0);
  t("กรอง RECLAIM แล้ว SHORTCO (ข้อมูลไม่พอ) หายไปด้วย",
    filtered.indexOf("SHORTCO") < 0 || filtered.indexOf('<tr data-ch-ticker="SHORTCO"') < 0);
  win.CatalystPage._state.filter.technical = "NO_RECLAIM";
  win.CatalystPage.render();
  var f2 = els.chRoot.innerHTML;
  t("กรอง NO_RECLAIM แล้วเห็น FLATCO", f2.indexOf('data-ch-ticker="FLATCO"') >= 0);
  t("กรอง NO_RECLAIM แล้ว RECLAIMCO หายจากตาราง",
    f2.indexOf('<tr data-ch-ticker="RECLAIMCO"') < 0);
  win.CatalystPage._state.filter.technical = null;
  win.CatalystPage.render();
  t("ล้างตัวกรองแล้วกลับมาเท่าเดิม",
    (els.chRoot.innerHTML.match(/data-ch-ticker="/g) || []).length === before, undefined);

  console.log("== §25 DETAIL — ตัวที่มีสัญญาณ ==");
  win.location.search = "?ticker=RECLAIMCO";
  win.CatalystPage.render();
  var d = els.chRoot.innerHTML;
  t("มีหัวข้อหลักฐานเชิงเทคนิค", d.indexOf("หลักฐานเชิงเทคนิค — SMA200 Reclaim") >= 0);
  t("บอกวันที่เกิดสัญญาณ", d.indexOf("วันที่เกิดสัญญาณ") >= 0 && d.indexOf(rc.technical.signalDate) >= 0,
    rc.technical.signalDate);
  t("บอกระยะห่างก่อนหน้า", d.indexOf("ระยะห่างก่อนหน้า") >= 0);
  t("บอกระยะห่างวันที่ข้าม", d.indexOf("ระยะห่างวันที่ข้าม") >= 0);
  t("บอกแรงของการกลับขึ้นเป็น pp", /แรงของการกลับขึ้น[\s\S]{0,120}?pp/.test(d));
  t("ระบุว่าไม่ใช่คะแนน", d.indexOf("ไม่ใช่คะแนน") >= 0);
  t("บอกราคาปิดและ SMA200 ของทั้งสองวัน",
    d.indexOf("ปิดวันก่อนหน้า") >= 0 && d.indexOf("ปิดวันที่ข้าม") >= 0 &&
    (d.match(/SMA200 \d/g) || []).length >= 2);
  t("บอกว่าตอนนี้ยังยืนเหนือเส้นไหม", d.indexOf("ตอนนี้ยังเหนือเส้นไหม") >= 0);
  t("บอกวันของข้อมูลราคาที่ใช้ (§17)", d.indexOf("ราคาล่าสุดที่ใช้") >= 0);
  t("เขียนเกณฑ์ไว้ให้ตรวจสอบได้", d.indexOf("ปิดวันก่อนหน้า <strong>ที่หรือต่ำกว่า</strong> SMA200") >= 0);
  t("§13C หัวข้อ Market Recognition อ้างถึงหลักฐานเชิงเทคนิค",
    d.indexOf("หลักฐานเชิงเทคนิคล่าสุด") >= 0);
  t("§10 ระบุชัดว่าไม่ได้เลื่อนขั้นการรับรู้ของตลาด",
    d.indexOf("ไม่ได้เลื่อนขั้นนี้ให้") >= 0);
  t("§13B บล็อกเทคนิคอยู่ 'หลัง' Market Recognition ไม่ใช่ก่อน",
    d.indexOf("ตลาดรับรู้แล้วแค่ไหน") < d.indexOf("หลักฐานเชิงเทคนิค — SMA200 Reclaim"));
  t("§11 ระบุว่าไม่ทำให้กลายเป็น EARLY CATALYST",
    d.indexOf("ไม่ทำให้กลายเป็น EARLY CATALYST") >= 0);

  console.log("== §25 สถานะ catalyst เดิมต้องไม่เปลี่ยน ==");
  t("RECLAIMCO ไม่ได้ถูกยกเป็น EARLY_CATALYST",
    ["EARLY_CATALYST", "STRONG_EARLY_CATALYST"].indexOf(
      rc.qualification ? rc.qualification.state.key : rc.state.key) < 0,
    rc.qualification ? rc.qualification.state.key : rc.state.key);
  t("RECLAIMCO catalyst maturity ยังเป็น NONE", rc.catalyst.maturity.key === "NONE", rc.catalyst.maturity.key);
  t("RECLAIMCO ไม่มี C3/C4/C5", ["C3_CONFIRMED", "C4_FINANCIAL_EVIDENCE", "C5_MARKET_RECOGNIZED"]
    .indexOf(rc.catalyst.maturity.key) < 0);
  t("market recognition ของ RECLAIMCO ไม่มีหลักฐาน SMA200 ปนเข้าไป",
    rc.recognition.evidence.every(function (e) { return e.indexOf("SMA200") < 0; }),
    rc.recognition.evidence);
  t("lifecycle ไม่ถูกแตะ", typeof rc.lifecycle === "string" && rc.lifecycle.length > 0, rc.lifecycle);

  console.log("== §12/§25 DETAIL — value trap HIGH + reclaim พร้อมกัน ==");
  win.location.search = "?ticker=TRAPCO";
  win.CatalystPage.render();
  var dt = els.chRoot.innerHTML;
  t("ยังเห็นป้าย value trap HIGH", dt.indexOf("HIGH") >= 0);
  t("บอกตรง ๆ ว่าราคาขึ้นไม่ลบล้างความเสี่ยง",
    dt.indexOf("ไม่ลบล้างสัญญาณการเสื่อมของธุรกิจ") >= 0);
  t("TRAPCO ยังเป็น VALUE_TRAP_RISK",
    (tp.qualification ? tp.qualification.state.key : tp.state.key) === "VALUE_TRAP_RISK",
    tp.qualification ? tp.qualification.state.key : tp.state.key);
  t("มีทั้งสองข้อเท็จจริงอยู่ในหน้าเดียวกัน (ไม่ซ่อนอันใดอันหนึ่ง)",
    dt.indexOf("SMA200 Reclaim") >= 0 && dt.indexOf("Value Trap") >= 0);

  console.log("== §25 DETAIL — ตัวที่ไม่มีสัญญาณ ต้องไม่มีป้ายเทคนิคหลอน ==");
  win.location.search = "?ticker=FLATCO";
  win.CatalystPage.render();
  var df = els.chRoot.innerHTML;
  t("ไม่มีป้าย ch-tech-pill", df.indexOf("ch-tech-pill") < 0);
  t("ไม่มีบรรทัด 'หลักฐานเชิงเทคนิคล่าสุด'", df.indexOf("หลักฐานเชิงเทคนิคล่าสุด") < 0);
  t("แต่ยังมีหัวข้อเทคนิคที่บอกสถานะตามจริง",
    df.indexOf("หลักฐานเชิงเทคนิค — SMA200 Reclaim") >= 0 && df.indexOf("NO_RECLAIM") >= 0);
  t("ไม่โผล่วันที่สัญญาณปลอม ๆ", df.indexOf("วันที่เกิดสัญญาณ") < 0);

  win.location.search = "?ticker=SHORTCO";
  win.CatalystPage.render();
  var ds = els.chRoot.innerHTML;
  t("ข้อมูลไม่พอ แสดง DATA_INSUFFICIENT ไม่ใช่ 'ไม่มีสัญญาณ'",
    ds.indexOf("DATA_INSUFFICIENT") >= 0 && ds.indexOf("ประวัติราคาไม่พอคำนวณ SMA200") >= 0);
  t("ไม่แต่งค่า SMA200 ขึ้นมาเมื่อข้อมูลไม่พอ",
    /SMA200 ล่าสุด<\/small><b>—<\/b>/.test(ds) || ds.indexOf("<b>—</b>") >= 0);

  console.log("== §25 สุขอนามัยของข้อความทุกหน้า ==");
  var pages = [];
  ["", "?ticker=RECLAIMCO", "?ticker=FLATCO", "?ticker=TRAPCO", "?ticker=SHORTCO"].forEach(function (s) {
    win.location.search = s;
    win.CatalystPage.render();
    pages.push({ s: s || "(radar)", html: els.chRoot.innerHTML });
  });
  var bad = [];
  pages.forEach(function (p) {
    if (/NaN|undefined|Infinity|\[object /.test(p.html)) bad.push(p.s + ": NaN/undefined/Infinity");
    if (/\b(buy|sell)\b/i.test(p.html)) bad.push(p.s + ": buy/sell");
    if (/ซื้อเลย|ควรซื้อ|ควรขาย|น่าซื้อ/.test(p.html)) bad.push(p.s + ": คำชี้นำซื้อขาย");
  });
  t("ทุกหน้าไม่มี NaN/undefined/Infinity และไม่มีคำซื้อขาย", bad.length === 0, bad);

  // §25 ไม่มีการ์ดซ้ำที่เกิดจากสัญญาณเทคนิค
  var radar = pages[0].html;
  var trCount = (radar.match(/<tr data-ch-ticker="RECLAIMCO"/g) || []).length;
  t("RECLAIMCO ปรากฏในตารางแถวเดียว ไม่ซ้ำ", trCount === 1, trCount);
  t("จำนวนแถวในตาราง = จำนวนหุ้นที่สแกน", (radar.match(/<tr data-ch-ticker="/g) || []).length === 4,
    (radar.match(/<tr data-ch-ticker="/g) || []).length);
  t("บล็อกเทคนิคในหน้า detail มีอันเดียว",
    (pages[1].html.match(/หลักฐานเชิงเทคนิค — SMA200 Reclaim/g) || []).length === 1);

  console.log("== หน้าไม่พังเมื่อโมดูลเทคนิคหายไป (degrade ได้) ==");
  var saved = win.Sma200Reclaim;
  win.Sma200Reclaim = undefined;
  var threw = null;
  try {
    win.CatalystPage._state.rows.forEach(function (r) { r.technical = null; });
    win.location.search = "?ticker=RECLAIMCO";
    win.CatalystPage.render();
  } catch (e) { threw = e.message; }
  t("ไม่มีโมดูลเทคนิค → หน้ายังเรนเดอร์ได้ ไม่ throw", threw === null, threw);
  t("ไม่มีโมดูลเทคนิค → บอกตรง ๆ ว่ายังไม่ได้โหลด",
    els.chRoot.innerHTML.indexOf("ยังไม่ได้โหลดโมดูลหลักฐานเชิงเทคนิค") >= 0);
  win.Sma200Reclaim = saved;

  done = true; finish();
}).catch(function (e) {
  console.error("  ✗ หน้าเว็บ: " + (e && e.stack || e)); fail++; done = true; finish();
});

setTimeout(function () { if (!done) { console.error("  ✗ หน้าเว็บ: timeout"); fail++; finish(); } }, 15000);

function finish() {
  console.log("");
  console.log(pass + fail + " checks · " + pass + " passed · " + fail + " failed");
  process.exit(fail ? 1 : 0);
}
