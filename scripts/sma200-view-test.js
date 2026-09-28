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
// BOTHCO — เข้าเงื่อนไข "ทั้งสอง" ตัวสแกน (catalyst ยืนยันแล้ว + reclaim)
// ต้องมีตัวแบบนี้ ไม่งั้นเส้นทางรวมหุ้นซ้ำบนหน้าภาพรวมจะไม่เคยถูกทดสอบเลย
var BOTH_CLOSES = rep(200, 100).concat([93, 105, 106]);
// BACKCO — เคยกลับขึ้นเหนือเส้น แล้วหลุดกลับลงไปใต้เส้น
var BACK_CLOSES = rep(200, 100).concat([92, 106, 80, 78]);
// NOVOLCO — กลับขึ้นเหนือเส้นจริง แต่วอลุ่มวันนั้นไม่พุ่ง → ต้องไม่ถูกนับเป็นผลสแกน
var NOVOL_CLOSES = rep(200, 100).concat([94, 107, 108]);

// วอลุ่มฐานคงที่ แล้วพุ่งเฉพาะวันที่เกิดสัญญาณ (ทุก fixture สัญญาณอยู่ที่ดัชนี 201)
var VOL_BASE = 1000000;
var SIGNAL_IDX = 201;
function volsWithSpike(len, mult) {
  var v = rep(len, VOL_BASE);
  if (len > SIGNAL_IDX) v[SIGNAL_IDX] = Math.round(VOL_BASE * mult);
  return v;
}

var DATES = recentTradingDates(204);
var SHORT_DATES = DATES.slice(-120);

// เหตุการณ์ธุรกิจที่ทำให้ engine จัดเป็น CATALYST_EXISTS (ยืนยันด้วยการรันจริง)
function catalystEvidence(tk) {
  return {
    inspected: true, totalDisclosures: 3, routineCount: 0, unknownCount: 0, filingsCount: 1,
    perSource: {}, items: [{
      ticker: tk, eventDate: DATES[DATES.length - 20], sourceType: "SET_DISCLOSURE",
      sourceName: "SET Disclosure", sourceUrl: "https://www.set.or.th/x",
      eventType: "NEW_ORDER", title: "เซ็นสัญญาโครงการใหม่", summary: null,
      evidenceStrength: "C3_CONFIRMED_EVENT", confidence: null,
      affectedBusiness: null, expectedImpact: null, status: "VERIFIED"
    }], note: "ทดสอบ"
  };
}

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

function apiItem(tk, nm, closes, dates, evidence, volMult) {
  // วันที่ต้องยาวเท่าราคาเสมอ — ถ้าไม่เท่า โมดูลจะถือว่าจับคู่ไม่ได้ (ถูกต้องแล้ว)
  // แล้วเทสต์จะเพี้ยนเงียบ ๆ เพราะ asOf/signalDate กลายเป็น null
  var d = dates.length === closes.length ? dates : dates.slice(-closes.length);
  return { ticker: tk, name: nm, market: "SET", universe: "SET",
    dates: d, closes: closes,
    volumes: volsWithSpike(closes.length, volMult == null ? 1 : volMult),
    bars: closes.length, source: "test", sourceType: "LIVE_MARKET_DATA", range: "5y",
    evidence: evidence || null };
}

var fakeApi = {
  total: 6, offset: 0, scanned: 6, done: true, nextOffset: null, universe: "THAI_ALL",
  universeMeta: { source: "SET registry (test)", asOf: new Date().toISOString(),
    degraded: false, note: null, counts: { set: 637, mai: 231, total: 868 } },
  benchmark: { symbol: "^SET.BK", closes: rep(203, 100), available: true },
  items: [
    apiItem("RECLAIMCO", "Reclaim PCL", RECLAIM_CLOSES, DATES, null, 2.0),
    apiItem("FLATCO", "Flat PCL", FLAT_CLOSES, DATES),
    apiItem("TRAPCO", "Trap PCL", TRAP_CLOSES, DATES, trapEvidence(), 1.8),
    apiItem("SHORTCO", "Short PCL", SHORT_CLOSES, SHORT_DATES),
    apiItem("BOTHCO", "Both PCL", BOTH_CLOSES, DATES, catalystEvidence("BOTHCO"), 1.5),
    apiItem("BACKCO", "Back Below PCL", BACK_CLOSES, DATES, null, 2.2),
    // วอลุ่มเท่าเดิมทุกวัน → +0% → ตกเงื่อนไข ทั้งที่ราคากลับขึ้นเหนือเส้นจริง
    apiItem("NOVOLCO", "No Volume PCL", NOVOL_CLOSES, DATES, null, 1.0),
  ],
  failed: [],
};
fakeApi.total = fakeApi.items.length;
fakeApi.scanned = fakeApi.items.length;

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
// โหลดสคริปต์ชุดเดียวกับที่ catalyst-hunter.html โหลดจริง โดยอ่านลำดับจากตัว HTML เอง
// เหตุผล: เคยพลาดมาแล้วสองรอบ — ไม่โหลด catalyst-qualification.js ทำให้ r.qualification
// เป็น null และไม่โหลด evidence-model.js ทำให้ระนาบหลักฐานไม่ทำงานเลย
// ผลคือเทสต์ "เขียว" อยู่บนเส้นทางที่ไม่ใช่ของจริง
var SKIP = ["theme.js", "api-auth.js", "privacy.js", "app-navigation.js"];
var HTML_SCRIPTS = (function () {
  var src = fs.readFileSync(PUB + "/catalyst-hunter.html", "utf8");
  var out = [], re = /<script src="\/([A-Za-z0-9._-]+\.js)/g, m;
  while ((m = re.exec(src)) !== null) if (SKIP.indexOf(m[1]) < 0) out.push(m[1]);
  return out;
})();
HTML_SCRIPTS.forEach(function (f) {
  try { vm.runInContext(fs.readFileSync(PUB + "/" + f, "utf8"), ctx, { filename: f }); }
  catch (e) { bootOk = false; console.error("   boot " + f + ": " + e.message); }
});

console.log("== boot + ลำดับการโหลด ==");
t("หน้าเว็บ boot ได้พร้อมโมดูลเทคนิค", bootOk);
t("window.Sma200Reclaim ถูกโหลด", !!win.Sma200Reclaim);
t("window.CatalystQualification ถูกโหลด (ไม่งั้นเทสต์สถานะจะทดสอบเส้นทางปลอม)",
  !!win.CatalystQualification);
t("ระนาบหลักฐานถูกโหลด (ไม่งั้น catalyst จะเป็น NONE ทุกตัวแบบเงียบ ๆ)",
  !!win.EvidenceModel && !!win.EvidenceClassifier);
t("โหลดสคริปต์ครบตามที่หน้าเว็บจริงโหลด", HTML_SCRIPTS.length >= 11, HTML_SCRIPTS);
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

  console.log("== หน้าภาพรวม (HUB) — หน้าแรกของ /catalyst-hunter ==");
  var hub = els.chRoot.innerHTML;
  t("หน้าภาพรวมเรนเดอร์ได้", hub.length > 1500, hub.length);
  t("มีการ์ดของทุกตัวสแกน",
    hub.indexOf("Thai Catalyst Hunter") >= 0 && hub.indexOf("SMA200 Reclaim") >= 0);
  t("การ์ดบอกเงื่อนไขของตัวสแกนไว้ชัด",
    hub.indexOf("วันก่อนหน้าปิดที่หรือต่ำกว่า SMA200") >= 0);
  t("มีตารางรวมหุ้นที่เข้าเงื่อนไข", hub.indexOf("หุ้นที่เข้าเงื่อนไข") >= 0);
  t("RECLAIMCO (เข้าเงื่อนไข SMA200) อยู่ในตารางรวม",
    hub.indexOf('data-ch-ticker="RECLAIMCO"') >= 0);
  t("FLATCO (ไม่เข้าเงื่อนไขไหนเลย) ไม่อยู่ในตารางรวม",
    hub.indexOf('data-ch-ticker="FLATCO"') < 0);
  t("SHORTCO (ข้อมูลไม่พอ) ไม่อยู่ในตารางรวม",
    hub.indexOf('data-ch-ticker="SHORTCO"') < 0);
  t("มีป้ายบอกว่าเข้าเงื่อนไขของตัวสแกนไหน", hub.indexOf("ch-hub-badge") >= 0);
  t("ย้ำว่าเข้าหลายข้อ = ข้อเท็จจริง ไม่ใช่คะแนน", hub.indexOf("ไม่ใช่คะแนน") >= 0);

  // ---- หุ้นที่เข้าสองเงื่อนไขพร้อมกัน ----
  t("BOTHCO เข้าทั้งสองตัวสแกนจริง (ไม่งั้นเทสต์ด้านล่างว่างเปล่า)",
    ["STRONG_EARLY_CATALYST", "EARLY_CATALYST", "CATALYST_EXISTS"].indexOf(
      row("BOTHCO").qualification.state.key) >= 0 && row("BOTHCO").technical.status === "RECLAIM",
    [row("BOTHCO").qualification.state.key, row("BOTHCO").technical.status]);
  t("BOTHCO ปรากฏเป็นแถวเดียว ไม่ซ้ำตามจำนวนเงื่อนไขที่เข้า",
    (hub.match(/<tr data-ch-ticker="BOTHCO"/g) || []).length === 1,
    (hub.match(/<tr data-ch-ticker="BOTHCO"/g) || []).length);
  // นับ "ป้ายจริง" ไม่ใช่ทุกที่ที่มีคำว่า ch-hub-badge — คลาสของ <td> คือ ch-hub-badgeS
  // ซึ่งมีคำนั้นเป็นส่วนหนึ่ง ถ้านับหลวม ๆ จะได้เกินมา 1 เสมอ
  t("แถวของ BOTHCO ติดป้ายครบทั้งสองตัวสแกน", (function () {
    var m = /<tr data-ch-ticker="BOTHCO"[\s\S]*?<\/tr>/.exec(hub);
    return !!m && (m[0].match(/class="ch-hub-badge ch-tone-/g) || []).length === 2;
  })(), (function () {
    var m = /<tr data-ch-ticker="BOTHCO"[\s\S]*?<\/tr>/.exec(hub);
    return m ? (m[0].match(/class="ch-hub-badge ch-tone-/g) || []).length : null;
  })());
  t("แถวที่เข้าเงื่อนไขเดียวติดป้ายเดียว", (function () {
    var m = /<tr data-ch-ticker="RECLAIMCO"[\s\S]*?<\/tr>/.exec(hub);
    return !!m && (m[0].match(/class="ch-hub-badge ch-tone-/g) || []).length === 1;
  })());
  t("ตัวที่เข้าสองเงื่อนไขถูกจัดไว้เหนือตัวที่เข้าข้อเดียว",
    hub.indexOf('data-ch-ticker="BOTHCO"') < hub.indexOf('data-ch-ticker="RECLAIMCO"'),
    [hub.indexOf('data-ch-ticker="BOTHCO"'), hub.indexOf('data-ch-ticker="RECLAIMCO"')]);
  t("บอกจำนวนตัวที่เข้ามากกว่าหนึ่งข้อ", /<b>1 ตัว<\/b>เข้าเงื่อนไขมากกว่าหนึ่งข้อ/.test(hub));

  // ---- ความสดของข้อมูลต้องเห็นได้บนทุกแท็บ ไม่ใช่เฉพาะแท็บ Catalyst ----
  t("หน้าภาพรวมบอกอายุของผลสแกน (ไม่โชว์ของเก่าเงียบ ๆ)", hub.indexOf("ch-age") >= 0);
  t("หน้าภาพรวมบอกสถานะการจำผลสแกน", hub.indexOf("ch-cache") >= 0);
  t("หน้าภาพรวมบอกวันของข้อมูล", hub.indexOf("ข้อมูล ณ") >= 0);
  t("ปุ่มสแกนมีปุ่มเดียวในหน้า", (hub.match(/data-ch-rescan=/g) || []).length === 1,
    (hub.match(/data-ch-rescan=/g) || []).length);
  t("บอกว่ากดครั้งเดียวได้ครบทุกตัวสแกน", hub.indexOf("ได้ผลครบทุกตัวสแกน") >= 0);

  console.log("== แท็บ ==");
  // ต้องตรวจ "ในแถบแท็บ" เท่านั้น — การ์ดบนหน้าภาพรวมก็มี data-ch-view เหมือนกัน
  // ถ้าตรวจทั้งหน้า แท็บหายไปก็ยังเขียวได้เพราะไปเจอที่การ์ดแทน
  var tabBar = (/<nav class="ch-tabs"[\s\S]*?<\/nav>/.exec(hub) || [""])[0];
  t("มีแถบแท็บจริง", tabBar.length > 0);
  t("แถบแท็บมีครบสามอัน (ภาพรวม + สองตัวสแกน)",
    tabBar.indexOf('data-ch-view="hub"') >= 0 && tabBar.indexOf('data-ch-view="catalyst"') >= 0 &&
    tabBar.indexOf('data-ch-view="sma200"') >= 0, tabBar.slice(0, 160));
  t("จำนวนแท็บ = 1 + จำนวนตัวสแกน", (tabBar.match(/data-ch-view=/g) || []).length === 3,
    (tabBar.match(/data-ch-view=/g) || []).length);
  t("แท็บภาพรวมถูกทำเครื่องหมายว่าเปิดอยู่",
    /data-ch-view="hub" aria-current="page"|class="ch-tab is-on" data-ch-view="hub"/.test(hub));
  t("แท็บมีตัวเลขจำนวนที่เข้าเงื่อนไข", hub.indexOf("ch-tab-n") >= 0);

  console.log("== แท็บ SMA200 ==");
  win.location.search = "?view=sma200";
  win.CatalystPage.render();
  var sv = els.chRoot.innerHTML;
  t("แท็บ SMA200 เรนเดอร์ได้", sv.indexOf("SMA200 Reclaim") >= 0 && sv.length > 1500);
  t("มีคอลัมน์วันที่เกิดสัญญาณ", sv.indexOf("วันที่เกิดสัญญาณ") >= 0);
  t("มีคอลัมน์ระยะห่างก่อนหน้า/วันที่ข้าม",
    sv.indexOf("ระยะห่างก่อนหน้า") >= 0 && sv.indexOf("ระยะห่างวันที่ข้าม") >= 0);
  t("มีคอลัมน์แรงของการกลับขึ้น", sv.indexOf("แรงของการกลับขึ้น") >= 0);
  t("ยังแสดง Value Trap คู่กันเสมอ", sv.indexOf("Value Trap") >= 0);
  t("RECLAIMCO อยู่ในตาราง", sv.indexOf('data-ch-ticker="RECLAIMCO"') >= 0);
  t("FLATCO ไม่อยู่ในตาราง", sv.indexOf('data-ch-ticker="FLATCO"') < 0);
  t("บอกว่าไม่ใช่ catalyst และไม่ใช่คำแนะนำ",
    sv.indexOf("ไม่ใช่ catalyst และไม่ใช่คำแนะนำ") >= 0);
  t("แยก 'ข้อมูลไม่พอ' ออกจาก 'ตรวจแล้วไม่พบ' อย่างชัดเจน",
    sv.indexOf("ประวัติราคาไม่พอคำนวณ SMA200") >= 0 && sv.indexOf("เป็นคนละเรื่อง") >= 0);
  t("นับ SHORTCO เป็นข้อมูลไม่พอ ไม่ใช่ไม่พบสัญญาณ",
    /ประวัติราคาไม่พอคำนวณ SMA200 <b>1<\/b>/.test(sv), undefined);

  console.log("== ตัวกรองของแท็บ SMA200 ==");
  t("มีชิปตัวกรองสามแบบ",
    sv.indexOf('data-ch-smafilter="all"') >= 0 && sv.indexOf('data-ch-smafilter="holding"') >= 0 &&
    sv.indexOf('data-ch-smafilter="fellback"') >= 0);
  var allN = (sv.match(/data-ch-ticker="/g) || []).length;
  win.CatalystPage._state.smaFilter = "fellback";
  win.CatalystPage.render();
  var fb = els.chRoot.innerHTML;
  t("กรอง 'หลุดกลับลงไปแล้ว' ตัดตัวที่ยังยืนเหนือเส้นออก",
    (fb.match(/data-ch-ticker="/g) || []).length < allN,
    [(fb.match(/data-ch-ticker="/g) || []).length, allN]);
  t("BACKCO อยู่ในผล 'หลุดกลับลงไปแล้ว'", fb.indexOf('data-ch-ticker="BACKCO"') >= 0);
  t("BACKCO หลุดกลับลงใต้เส้นจริง (ไม่งั้นเทสต์ตัวกรองว่างเปล่า)",
    row("BACKCO").technical.status === "RECLAIM" && row("BACKCO").technical.stillAbove === false,
    [row("BACKCO").technical.status, row("BACKCO").technical.stillAbove]);
  win.CatalystPage._state.smaFilter = "holding";
  win.CatalystPage.render();
  var hd = els.chRoot.innerHTML;
  t("กรอง 'ยังยืนเหนือเส้น' ยังเห็น RECLAIMCO", hd.indexOf('data-ch-ticker="RECLAIMCO"') >= 0);
  t("กรอง 'ยังยืนเหนือเส้น' ต้องตัด BACKCO ออก (ตัวกรองทำงานจริง ไม่ใช่ผ่านทุกตัว)",
    hd.indexOf('data-ch-ticker="BACKCO"') < 0);
  t("สองตัวกรองให้ผลต่างกันจริง", fb !== hd);
  win.CatalystPage._state.smaFilter = "all";
  win.CatalystPage.render();
  t("กลับมา 'ทั้งหมด' ได้จำนวนเดิม",
    (els.chRoot.innerHTML.match(/data-ch-ticker="/g) || []).length === allN);

  console.log("== เงื่อนไขวอลุ่มในชั้นแสดงผล ==");
  win.CatalystPage._state.smaFilter = "all";
  win.location.search = "?view=sma200";
  win.CatalystPage.render();
  var sv2 = els.chRoot.innerHTML;
  var nv = row("NOVOLCO");
  t("NOVOLCO กลับขึ้นเหนือเส้นจริง แต่วอลุ่มไม่ผ่าน (ไม่งั้นเทสต์ด้านล่างว่างเปล่า)",
    nv.technical.status === "RECLAIM" && nv.technical.volumeConfirmed === false,
    [nv.technical.status, nv.technical.volumeConfirmed, nv.technical.volumeVsAvgPct]);
  t("ตัวที่วอลุ่มไม่ผ่าน ไม่อยู่ในผลของตัวสแกน",
    sv2.indexOf('<tr data-ch-ticker="NOVOLCO"') < 0);
  t("ตัวที่วอลุ่มผ่าน ยังอยู่", sv2.indexOf('data-ch-ticker="RECLAIMCO"') >= 0);
  t("มีคอลัมน์วอลุ่มเทียบค่าเฉลี่ย 10 วัน", sv2.indexOf("วอลุ่ม vs เฉลี่ย 10 วัน") >= 0);
  t("หัวข้อบอกเงื่อนไขวอลุ่มไว้ชัด",
    sv2.indexOf("สูงกว่าค่าเฉลี่ย 10 วันทำการก่อนหน้าเกิน 20%") >= 0);
  t("บอกว่าค่าเฉลี่ยไม่รวมวันที่เกิดสัญญาณ",
    sv2.indexOf("ค่าเฉลี่ยวอลุ่มไม่รวมวันที่เกิดสัญญาณ") >= 0);

  // ทางเดินของตัวเลขต้องไล่ได้ ไม่ใช่โผล่เลขเดียวลอย ๆ
  t("มีบรรทัดทางเดินของเงื่อนไข", sv2.indexOf("ทางเดินของเงื่อนไข") >= 0);
  t("ทางเดิน: reclaim ทั้งหมด 5 → ผ่านวอลุ่ม 4 · ตก 1",
    /กลับขึ้นเหนือ SMA200 <b>5<\/b> ตัว/.test(sv2) &&
    /ผ่านเงื่อนไขวอลุ่ม <b>4<\/b>/.test(sv2) &&
    /ตกเงื่อนไขวอลุ่ม <b>1<\/b>/.test(sv2),
    (/ทางเดินของเงื่อนไข[\s\S]{0,260}/.exec(sv2) || [""])[0].replace(/<[^>]*>/g, ""));

  t("มีชิปดูตัวที่ตกเงื่อนไขวอลุ่ม", sv2.indexOf('data-ch-smafilter="novol"') >= 0);
  t("ชิปนั้นระบุว่าไม่นับเป็นผลสแกน", sv2.indexOf("ไม่นับเป็นผลสแกน") >= 0);
  win.CatalystPage._state.smaFilter = "novol";
  win.CatalystPage.render();
  var nvv = els.chRoot.innerHTML;
  t("กดชิปแล้วเห็น NOVOLCO", nvv.indexOf('data-ch-ticker="NOVOLCO"') >= 0);
  t("กดชิปแล้วไม่เห็นตัวที่ผ่านเงื่อนไข", nvv.indexOf('<tr data-ch-ticker="RECLAIMCO"') < 0);
  win.CatalystPage._state.smaFilter = "all";
  win.CatalystPage.render();

  console.log("== หน้าภาพรวมต้องนับตามเงื่อนไขใหม่ ==");
  win.location.search = "";
  win.CatalystPage.render();
  var hub2 = els.chRoot.innerHTML;
  t("NOVOLCO ไม่ขึ้นหน้าภาพรวม (ไม่เข้าเงื่อนไขตัวสแกนใด)",
    hub2.indexOf('data-ch-ticker="NOVOLCO"') < 0);
  t("การ์ด SMA200 บนหน้าภาพรวมบอกเงื่อนไขวอลุ่มด้วย",
    hub2.indexOf("วอลุ่มวันนั้นสูงกว่าค่าเฉลี่ย 10 วันก่อนหน้าเกิน 20%") >= 0);

  console.log("== หน้าเจาะลึกของตัวที่วอลุ่มไม่ผ่าน ==");
  win.location.search = "?ticker=NOVOLCO";
  win.CatalystPage.render();
  var dn = els.chRoot.innerHTML;
  t("ยังบอกว่าเกิดการกลับขึ้นเหนือเส้นจริง (ไม่ลบข้อเท็จจริงทิ้ง)",
    dn.indexOf("เกิดการกลับขึ้นเหนือ SMA200 จริง") >= 0);
  t("อธิบายว่าทำไมไม่ถูกนับเป็นผลสแกน",
    dn.indexOf("ไม่ถูกนับเป็นผลของตัวสแกน SMA200") >= 0);
  t("แสดงวอลุ่มวันที่ข้ามและค่าเฉลี่ย",
    dn.indexOf("วอลุ่มวันที่ข้าม") >= 0 && dn.indexOf("เฉลี่ย 10 วันก่อนหน้า") >= 0);
  t("แสดงส่วนต่างวอลุ่มพร้อมเกณฑ์", /ไม่ถึงเกณฑ์ > 20%/.test(dn));
  win.location.search = "?ticker=RECLAIMCO";
  win.CatalystPage.render();
  t("ตัวที่ผ่าน แสดงว่าผ่านเกณฑ์", /ผ่านเกณฑ์ > 20%/.test(els.chRoot.innerHTML));
  t("ตัวที่ผ่าน ไม่ขึ้นคำเตือนว่าไม่ถูกนับ",
    els.chRoot.innerHTML.indexOf("ไม่ถูกนับเป็นผลของตัวสแกน SMA200") < 0);

  console.log("== แท็บ Catalyst — ต้องไม่มี SMA200 ปนแล้ว ==");
  win.location.search = "?view=catalyst";
  win.CatalystPage.render();
  var cv = els.chRoot.innerHTML;
  t("แท็บ Catalyst ยังเป็นของเดิมครบ",
    cv.indexOf("All Candidates") >= 0 && cv.indexOf("Hunter Brief") >= 0);
  t("ไม่มีคอลัมน์ SMA200 ในตาราง All Candidates", cv.indexOf('data-ch-sort="tech"') < 0);
  t("ไม่มีตัวกรอง SMA200", cv.indexOf('data-ch-filter="technical"') < 0);
  t("ไม่มีป้ายเทคนิคในการ์ด/ตาราง", cv.indexOf("ch-tech-pill") < 0 && cv.indexOf("ch-tech-line") < 0);
  t("ตัวกรองเดิมของ catalyst ยังอยู่ครบ",
    ["status", "maturity", "financial", "recognition", "trap", "lifecycle"].every(function (k) {
      return cv.indexOf('data-ch-filter="' + k + '"') >= 0;
    }));

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
  // หน้าภาพรวมแสดง "เฉพาะตัวที่เข้าเงื่อนไข" — หุ้นที่เข้าสองข้อต้องยังเป็นแถวเดียว
  // ไม่ใช่โผล่ซ้ำข้อละแถว
  t("ตารางรวมไม่มี ticker ซ้ำแม้เข้าหลายเงื่อนไข", (function () {
    var seen = {}, dup = 0, m, re = /<tr data-ch-ticker="([^"]+)"/g;
    while ((m = re.exec(radar)) !== null) { if (seen[m[1]]) dup++; seen[m[1]] = 1; }
    return dup === 0;
  })());
  // 4 จาก 6: BOTHCO (สองเงื่อนไข) · RECLAIMCO · TRAPCO · BACKCO (SMA200 อย่างเดียว)
  // FLATCO ไม่เข้าอะไรเลย · SHORTCO ข้อมูลไม่พอ
  t("ตารางรวมมีเฉพาะตัวที่เข้าเงื่อนไข (4 จาก 6 ที่สแกน)",
    (radar.match(/<tr data-ch-ticker="/g) || []).length === 4,
    (radar.match(/<tr data-ch-ticker="/g) || []).length);
  t("หุ้นที่ติด value trap HIGH ยังขึ้นหน้าภาพรวมได้ถ้าเข้าเงื่อนไข แต่ต้องเห็นป้ายเสี่ยงคู่กัน",
    (function () {
      var m = /<tr data-ch-ticker="TRAPCO"[\s\S]*?<\/tr>/.exec(radar);
      return !!m && m[0].indexOf("HIGH") >= 0;
    })());
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
