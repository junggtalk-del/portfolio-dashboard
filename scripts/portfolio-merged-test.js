// ============================================================
// /portfolio หลังรวม Asset Allocation เข้ามาต่อท้าย
//
// สิ่งที่ล็อกไว้:
//   1. หน้านี้แสดงเฉพาะสองส่วนบนของ Portfolio Position (สรุป + แถบสัดส่วน)
//      ส่วนที่เหลือ (bucket board / trays / modal) ต้องไม่โผล่
//   2. เนื้อหา Asset Allocation ทั้งชุดต้องต่อท้ายอยู่บนหน้าเดียวกัน
//   3. #aaRoot ต้องเป็น "พี่น้อง" ของ #ppRoot ไม่ใช่ลูก — ไม่งั้นจะถูกเขียนทับ
//      ทุกครั้งที่ Portfolio Position เรนเดอร์ใหม่
//   4. เมนู Asset Allocation ต้องหายไป และ /asset-allocation ต้องพาไป /portfolio
//   5. ห้ามมี NaN / undefined / Infinity หลุดออกจอ
// ============================================================
"use strict";
var vm = require("vm"), fs = require("fs"), path = require("path");
var PUB = path.join(__dirname, "..", "public");

var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; return; }
  fail++; console.error("  ✗ " + name + (extra !== undefined ? "  → " + JSON.stringify(extra) : ""));
}

// ---------------- โครงของหน้า (อ่านจากไฟล์จริง) ----------------
var HTML = fs.readFileSync(path.join(PUB, "portfolio.html"), "utf8");

console.log("== โครงหน้า portfolio.html ==");
t("มี #ppRoot", /id="ppRoot"/.test(HTML));
t("มี #aaRoot", /id="aaRoot"/.test(HTML));
t("#aaRoot อยู่หลัง #ppRoot", HTML.indexOf('id="ppRoot"') < HTML.indexOf('id="aaRoot"'));
t("#aaRoot เป็นพี่น้อง ไม่ใช่ลูกของ #ppRoot (อยู่นอก </main>)", (function () {
  var mainEnd = HTML.indexOf("</main>");
  return mainEnd > 0 && HTML.indexOf('id="aaRoot"') > mainEnd;
})());
t("โหลด engine ของทั้งสองฝั่ง",
  HTML.indexOf("/portfolio-position-engine.js") >= 0 && HTML.indexOf("/asset-allocation-engine.js") >= 0);
t("โหลด page module ของทั้งสองฝั่ง",
  HTML.indexOf("/portfolio-position-page.js") >= 0 && HTML.indexOf("/asset-allocation-page.js") >= 0);
t("โหลด CSS ของทั้งสองฝั่ง",
  HTML.indexOf("/portfolio-position.css") >= 0 && HTML.indexOf("/asset-allocation.css") >= 0);
t("#aaRoot ใช้คลาส aa-embedded (กว้างเท่ากับ .pp-page)", /id="aaRoot"[^>]*aa-embedded/.test(HTML));
t("engine ถูกโหลดก่อน page module ของฝั่ง AA",
  HTML.indexOf("/asset-allocation-engine.js") < HTML.indexOf("/asset-allocation-page.js"));

console.log("== CSS โหมดฝัง ==");
var CSS = fs.readFileSync(path.join(PUB, "asset-allocation.css"), "utf8");
t("มีกฎ .aa-embedded", CSS.indexOf(".aa-embedded") >= 0);
var emb = (/\.aa-embedded\s*\{[^}]*\}/.exec(CSS) || [""])[0];
// เปลือก Mission Control ปลด max-width/padding ให้เฉพาะ <main> — บล็อกนี้เป็น <div>
// จึงต้องทำเองให้เหมือนกัน ไม่งั้นขอบซ้าย/ขวาจะไม่ตรงกับ Portfolio Position
t("ปลด max-width เองเหมือนที่เปลือกทำให้ <main>", /max-width:\s*none/.test(emb), emb);
t("ตั้ง padding/margin เป็น 0 ให้เปลือกคุมระยะขอบแทน",
  /padding:\s*0/.test(emb) && /margin:\s*0/.test(emb), emb);
// .mc-content เป็น flex column — ถ้าไม่มี min-width:0 ตัว flex item จะไม่ยอมหด
// ต่ำกว่าความกว้างตารางข้างใน แล้วดันหน้าให้กว้าง 650px บนจอ 390px (เจอมาแล้วจริง)
t("มี min-width: 0 กัน flex item ไม่ยอมหดบนจอแคบ", /min-width:\s*0/.test(emb), emb);
t("ยืนยันว่าเปลือกปลด max-width ให้เฉพาะ <main> จริง (ถ้ากฎนี้เปลี่ยน ต้องรื้อ .aa-embedded)",
  /\.mc-shell-active\s+\.mc-content\s*>\s*main\s*\{/.test(
    fs.readFileSync(path.join(PUB, "mission-control.css"), "utf8")));
t("ยืนยันว่า .mc-content เป็น flex (เหตุผลที่ต้องมี min-width:0)",
  /\.mc-content\s*\{[^}]*display:\s*flex/.test(fs.readFileSync(path.join(PUB, "mission-control.css"), "utf8")));

console.log("== เมนูและเส้นทางเดิม ==");
var NAV = fs.readFileSync(path.join(PUB, "app-navigation.js"), "utf8");
t("ไม่มีเมนู Asset Allocation ใน SIDEBAR แล้ว", !/p:\s*"\/asset-allocation"/.test(NAV));
t("ไม่มี PAGE_META ของ /asset-allocation แล้ว", !/"\/asset-allocation":\s*\{/.test(NAV));
t("เมนู Portfolio Position ยังอยู่", /p:\s*"\/portfolio"/.test(NAV));
t("คำโปรยของ /portfolio พูดถึงเนื้อหาที่รวมเข้ามาแล้ว",
  /"\/portfolio":[\s\S]{0,400}?(3 ระยะ|เกษียณ)/.test(NAV));
var AAHTML = fs.readFileSync(path.join(PUB, "asset-allocation.html"), "utf8");
t("/asset-allocation พาไป /portfolio (ลิงก์เดิมไม่พัง)",
  AAHTML.indexOf('url=/portfolio') >= 0 && AAHTML.indexOf('location.replace("/portfolio")') >= 0);
t("/asset-allocation ไม่โหลด page module ของ AA อีกแล้ว (ไม่มีที่แก้ข้อมูลสองที่)",
  AAHTML.indexOf("asset-allocation-page.js") < 0);

console.log("== portfolio-position-page.js เรนเดอร์เฉพาะสองส่วนบน ==");
var PPJS = fs.readFileSync(path.join(PUB, "portfolio-position-page.js"), "utf8");
var renderBody = (/function render\(\)[\s\S]*?\n  \}/.exec(PPJS) || [""])[0];
t("ดึงตัว render() ออกมาอ่านได้", renderBody.length > 0);
t("ยังเรนเดอร์สรุปมูลค่า (summaryStrip)", renderBody.indexOf("summaryStrip(R)") >= 0);
t("ยังเรนเดอร์แถบสัดส่วน (allocationBar)", renderBody.indexOf("allocationBar(R)") >= 0);
["bucketBoard", "traysSection", "methodologyNote", "modalHtml"].forEach(function (fn) {
  t("ไม่เรนเดอร์ " + fn + " แล้ว", renderBody.indexOf(fn + "(") < 0);
});
t("ไม่ดึงรายชื่อสินทรัพย์มาให้ modal ที่ไม่มีแล้ว",
  !/function init\(\)[\s\S]{0,200}?buildAssetOptions\(\);/.test(PPJS));

// ---------------- เรนเดอร์จริงใน sandbox ----------------
function qKey(back) {
  var now = new Date();
  var idx = now.getFullYear() * 4 + Math.floor(now.getMonth() / 3) - back;
  return Math.floor(idx / 4) + "-Q" + ((idx % 4 + 4) % 4 + 1);
}
function arow(type, name, value, netFlow) {
  var a = { id: type + name + value, type: type, name: name, manualValue: value,
    snapshotValue: value, investedPercent: type === "cash" ? 0 : 100 };
  if (netFlow !== undefined) a.netFlow = netFlow;
  return a;
}
var FIXTURE = { currentQuarter: qKey(0), quarters: {}, allocation: {
  version: 1,
  map: { "cash::เงินสด": "short", "rmf-jang::RMF-จัง": "mid", "thai-stock::หุ้นไทย": "mid" },
  ports: { short: { expectedReturnPct: 3 }, mid: { expectedReturnPct: 6 }, long: { expectedReturnPct: null } },
  monthlyExpense: 50000,
  retirement: { inflationPct: 3, workYears: 20, retireYears: 25, annualContribution: 240000, currentAge: 42 },
  updatedAt: "2026-09-01T00:00:00.000Z"
} };
FIXTURE.quarters[qKey(3)] = { key: qKey(3), assets: [arow("cash", "เงินสด", 300000), arow("rmf-jang", "RMF-จัง", 100000)] };
FIXTURE.quarters[qKey(2)] = { key: qKey(2), assets: [arow("cash", "เงินสด", 300000), arow("rmf-jang", "RMF-จัง", 100000)] };
FIXTURE.quarters[qKey(1)] = { key: qKey(1), assets: [arow("cash", "เงินสด", 240000, -60000), arow("rmf-jang", "RMF-จัง", 100000), arow("thai-stock", "หุ้นไทย", 200000)] };
FIXTURE.quarters[qKey(0)] = { key: qKey(0), assets: [arow("cash", "เงินสด", 250000, 0), arow("rmf-jang", "RMF-จัง", 100000), arow("thai-stock", "หุ้นไทย", 210000), arow("bitcoin", "Bitcoin", 50000)] };

function mkEl(id) {
  return { id: id, innerHTML: "", value: "", style: {}, attrs: {}, hidden: false,
    appendChild: function () {}, setAttribute: function (k, v) { this.attrs[k] = v; },
    getAttribute: function (k) { return this.attrs[k] || null; },
    addEventListener: function () {}, removeEventListener: function () {},
    querySelector: function () { return null; }, querySelectorAll: function () { return []; },
    closest: function () { return null; }, focus: function () {},
    classList: { add: function () {}, remove: function () {}, contains: function () { return false; } } };
}
var els = {}, store = {};
var doc = { readyState: "complete", createElement: mkEl, addEventListener: function () {},
  getElementById: function (id) { if (!els[id]) els[id] = mkEl(id); return els[id]; },
  querySelector: function () { return mkEl(); }, querySelectorAll: function () { return []; },
  body: mkEl("body"), documentElement: mkEl("html"), hidden: false };
var win = {
  document: doc, location: { search: "", pathname: "/portfolio", href: "http://localhost/portfolio" },
  history: { pushState: function () {}, replaceState: function () {} },
  localStorage: { getItem: function (k) { return k in store ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); }, removeItem: function (k) { delete store[k]; } },
  addEventListener: function () {}, removeEventListener: function () {}, dispatchEvent: function () {},
  fetch: function (url, init) {
    if (init && init.method === "PUT") {
      return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve({ ok: true }); } });
    }
    var copy = JSON.parse(JSON.stringify(FIXTURE));
    return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve({ data: copy }); } });
  },
  console: console, Math: Math, JSON: JSON, Date: Date, Number: Number, String: String,
  Object: Object, Array: Array, Boolean: Boolean, isFinite: isFinite, isNaN: isNaN,
  parseInt: parseInt, parseFloat: parseFloat, Promise: Promise, RegExp: RegExp, Error: Error,
  encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent,
  setTimeout: setTimeout, clearTimeout: clearTimeout, Intl: Intl
};
win.window = win; win.self = win; win.globalThis = win;
var ctx = vm.createContext(win);

// โหลดสคริปต์ชุดเดียวกับที่ portfolio.html โหลดจริง โดยอ่านลำดับจาก HTML เอง
var SKIP = ["theme.js", "api-auth.js", "privacy.js", "app-navigation.js", "scoring.js", "data-snapshot.js"];
var SCRIPTS = (function () {
  var out = [], re = /<script src="\/([A-Za-z0-9._-]+\.js)/g, m;
  while ((m = re.exec(HTML)) !== null) if (SKIP.indexOf(m[1]) < 0) out.push(m[1]);
  return out;
})();
var bootOk = true;
SCRIPTS.forEach(function (f) {
  try { vm.runInContext(fs.readFileSync(path.join(PUB, f), "utf8"), ctx, { filename: f }); }
  catch (e) { bootOk = false; console.error("   โหลด " + f + " ไม่ได้: " + e.message); }
});

console.log("== เรนเดอร์จริงทั้งสองฝั่งบนหน้าเดียว ==");
t("โหลดสคริปต์ครบตามที่หน้าเว็บโหลดจริง", bootOk && SCRIPTS.length >= 5, SCRIPTS);
t("engine ทั้งสองฝั่งพร้อม", !!win.PortfolioPosition && !!win.AssetAllocation);
t("page module ทั้งสองฝั่งพร้อม", !!win.PortfolioPositionPage && !!win.AssetAllocationPage);

setTimeout(function () {
  var pp = els.ppRoot ? els.ppRoot.innerHTML : "";
  var aa = els.aaRoot ? els.aaRoot.innerHTML : "";

  t("ฝั่ง Portfolio Position เรนเดอร์แล้ว", pp.length > 300, pp.length);
  t("ฝั่ง Asset Allocation เรนเดอร์แล้ว", aa.length > 1000, aa.length);
  t("สองฝั่งไม่ทับกัน (คนละ element)", els.ppRoot !== els.aaRoot);

  console.log("== Portfolio Position: เหลือเฉพาะที่ใช้ ==");
  t("มีสรุปความมั่งคั่งรวม", pp.indexOf("ความมั่งคั่งรวม") >= 0);
  t("มีลงทุนจริง / เงินสด", pp.indexOf("ลงทุนจริง") >= 0 && pp.indexOf("เงินสด/ยังไม่ลงทุน") >= 0);
  t("มีแถบสัดส่วนพอร์ตตอนนี้", pp.indexOf("สัดส่วนพอร์ตตอนนี้") >= 0);
  t("ไม่มี modal จัดการรายการแล้ว", pp.indexOf("ppModal") < 0);
  t("ไม่มีถาด/ตะกร้าและปุ่มเพิ่มรายการแล้ว",
    pp.indexOf("data-add-bucket") < 0 && pp.indexOf("data-edit-item") < 0);
  t("ไม่มีหัวข้อวิธีคิดของ Portfolio Position แล้ว", pp.indexOf("pp-method") < 0);

  console.log("== Asset Allocation: มาครบทั้งชุด ==");
  ["ระยะสั้น", "ระยะกลาง", "ระยะยาว"].forEach(function (s) {
    t("มีพอร์ต " + s, aa.indexOf(s) >= 0);
  });
  t("มีส่วนแผนเกษียณ", aa.indexOf("เกษียณ") >= 0);
  t("มีส่วนจัดสินทรัพย์เข้าพอร์ต", aa.indexOf("aaAssign") >= 0 || aa.indexOf("data-assign") >= 0);
  t("มีส่วนตั้งค่า", aa.indexOf("ผลตอบแทนคาดหวัง") >= 0 || aa.indexOf("ตั้งค่า") >= 0);
  t("มีส่วนบันทึกผลตอบแทนย้อนหลัง", aa.indexOf("บันทึกผลตอบแทน") >= 0 || aa.indexOf("ไตรมาส") >= 0);
  t("มีวิธีคำนวณ", aa.indexOf("วิธีคำนวณ") >= 0);
  t("มีแถบบันทึก", aa.indexOf("aa-savebar") >= 0 || aa.indexOf("บันทึก") >= 0);

  console.log("== สุขอนามัยของข้อความ ==");
  var both = pp + aa;
  t("ไม่มี NaN / undefined / Infinity / [object",
    !/NaN|undefined|Infinity|\[object /.test(both),
    (both.match(/.{0,40}(NaN|undefined|Infinity|\[object ).{0,20}/) || [""])[0]);
  t("ไม่มีคำชี้นำซื้อขาย", !/\b(buy|sell)\b/i.test(both));
  t("หัวข้อ 'สัดส่วนพอร์ตตอนนี้' มีอันเดียว ไม่ซ้ำ",
    (both.match(/สัดส่วนพอร์ตตอนนี้/g) || []).length === 1,
    (both.match(/สัดส่วนพอร์ตตอนนี้/g) || []).length);

  console.log("");
  console.log(pass + fail + " checks · " + pass + " passed · " + fail + " failed");
  process.exit(fail ? 1 : 0);
}, 120);
