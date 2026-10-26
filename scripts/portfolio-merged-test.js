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
    addEventListener: function (t, fn) { this._h = this._h || {}; (this._h[t] = this._h[t] || []).push(fn); }, removeEventListener: function () {},
    querySelector: function () { return null; }, querySelectorAll: function () { return []; },
    closest: function () { return null; }, focus: function () {},
    classList: { add: function () {}, remove: function () {}, contains: function () { return false; } } };
}
var els = {}, store = {};
var doc = { readyState: "complete", createElement: mkEl, addEventListener: function () {},
  getElementById: function (id) { if (!els[id]) els[id] = mkEl(id); return els[id]; },
  querySelector: function () { return mkEl(); }, querySelectorAll: function () { return []; },
  body: mkEl("body"), documentElement: mkEl("html"), hidden: false };
var winH = {}, dispatched = [], FAIL_PUT = false;
var win = {
  document: doc, location: { search: "", pathname: "/portfolio", href: "http://localhost/portfolio" },
  history: { pushState: function () {}, replaceState: function () {} },
  localStorage: { getItem: function (k) { return k in store ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); }, removeItem: function (k) { delete store[k]; } },
  addEventListener: function (ty, fn) { (winH[ty] = winH[ty] || []).push(fn); }, removeEventListener: function () {},
  dispatchEvent: function (e) { dispatched.push(e); (winH[e && e.type] || []).slice().forEach(function (fn) { fn(e); }); return true; },
  CustomEvent: function (type, init) { this.type = type; this.detail = init ? init.detail : undefined; },
  fetch: function (url, init) {
    if (init && init.method === "PUT") {
      if (FAIL_PUT) return Promise.resolve({ ok: false, status: 401, json: function () { return Promise.resolve({ error: "locked" }); } });
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

  // ---- หัว Position: รวมเงินเติม · เงินเติมไตรมาสนี้ · ไม่รวมเงินเติม — แสดงคู่กันเสมอ ไม่ต้องกดสลับ ----
  // ทั้ง 3 ตัวมาจาก record.whole ของ AssetAllocation (ตัวเดียวกับตารางบันทึกผลตอบแทนท้ายหน้า)
  // fixture: เติมเงินปีละ 240,000 → ไตรมาสละ 60,000 · ไตรมาสล่าสุด 540,000 → 610,000 (รวม Bitcoin ที่ยังไม่จัด)
  console.log("== Portfolio Position: รวมเงินเติม / เงินเติม / ไม่รวมเงินเติม คู่กันเสมอ ==");
  function growLine(html, label) {
    var block = (String(html || "").match(/<div class="pp-grow">[\s\S]*?<\/div>/) || [""])[0];
    var head = '<span class="pp-grow-k">' + label + "</span>";
    var k = block.indexOf(head);
    if (k < 0) return null;
    var rest = block.slice(k + head.length);
    var next = rest.indexOf('<span class="pp-grow-k">');
    if (next >= 0) rest = rest.slice(0, next);
    var vm = /^<span class="pp-grow-v([^"]*)">([^<]*)<\/span>/.exec(rest);
    var nm = /<span class="pp-grow-n([^"]*)">([\s\S]*)<\/span>/.exec(rest);
    if (!vm || !nm) return null;
    return { vcls: vm[1], v: vm[2], ncls: nm[1], n: nm[2].replace(/<[^>]+>/g, ""), nHtml: nm[2] };
  }
  function growBlockOf(html) { return (String(html || "").match(/<div class="pp-grow">[\s\S]*?<\/div>/) || [""])[0]; }
  function ppNow() { win.PortfolioPositionPage.render(); return els.ppRoot ? els.ppRoot.innerHTML : ""; }
  function norm(s) { return String(s == null ? "" : s).replace(/−/g, "-"); }
  function aaRealOf(key) {
    var aaNow = els.aaRoot ? els.aaRoot.innerHTML : "";
    var m = (new RegExp("<tr><td>" + key + "(?:<span[^>]*>[^<]*<\\/span>)?<\\/td>(?:<td[^>]*>.*?<\\/td>){4}<td[^>]*>([+−-]?\\d+\\.\\d)%")).exec(aaNow);
    return m ? m[1] : null;
  }
  var G0 = ppNow();
  var gN = growLine(G0, "รวมเงินเติม"), gF = growLine(G0, "เงินเติมไตรมาสนี้"), gR = growLine(G0, "ไม่รวมเงินเติม");
  t("ไม่มีปุ่มสลับแล้ว (แสดงคู่กันเสมอ)", G0.indexOf("data-pp-view") < 0);
  t("มี 3 บรรทัด: รวมเงินเติม · เงินเติมไตรมาสนี้ · ไม่รวมเงินเติม", !!gN && !!gF && !!gR, (G0.match(/pp-grow[\s\S]{0,300}/) || ["(ไม่มี .pp-grow)"])[0]);
  var hand0 = (610000 / 540000 - 1) * 100, handR = (610000 - 540000 - 60000) / (540000 + 0.5 * 60000) * 100;
  t("รวมเงินเติม = คิดมือ 610,000 ÷ 540,000 − 1 = +" + hand0.toFixed(1) + "%", !!gN && norm(gN.v) === "+" + hand0.toFixed(1) + "%" && /pp-up/.test(gN.vcls), gN && gN.v);
  t("…บอกมูลค่าเพิ่ม +฿70,000", !!gN && /มูลค่าเพิ่ม \+฿70,000/.test(gN.n), gN && gN.n);
  t("เงินเติมไตรมาสนี้ ฿60,000 ตามที่ตั้งไว้ไตรมาสละ", !!gF && gF.v === "฿60,000" && gF.n === "ตามที่ตั้งไว้ไตรมาสละ" && !/pp-warn/.test(gF.ncls), gF && (gF.v + " | " + gF.n));
  t("ไม่รวมเงินเติม = คิดมือ 10,000 ÷ 570,000 = +" + handR.toFixed(1) + "%", !!gR && norm(gR.v) === "+" + handR.toFixed(1) + "%", gR && gR.v);
  t("…เทียบเป้า ~2.4%/ไตรมาส และบอกว่าต่ำกว่าเป้า", !!gR && /เป้า ~2\.4%\/ไตรมาส · ต่ำกว่าเป้า/.test(gR.n), gR && gR.n);
  t("…คำสถานะอยู่ในป้ายที่ไม่ตัดกลางคำ (ภาษาไทยตัด ตาม|เป้า ได้)", !!gR && /<b class="pp-grow-st is-behind">ต่ำกว่าเป้า<\/b>/.test(gR.nHtml), gR && gR.nHtml);
  t("ตารางทั้งพอร์ต (AA) แสดงตัวเดียวกับหัว Position", !!gR && aaRealOf(qKey(0)) !== null && norm(aaRealOf(qKey(0)) + "%") === norm(gR.v), aaRealOf(qKey(0)) + " vs " + (gR && gR.v));
  t("ไม่มีร่องรอย ÷4 / ค่าประมาณ ≈ แบบเดิม", !/≈|÷ 4 =|ค่าประมาณจาก|เติมเงินปีละ/.test(G0));
  t("ไม่มี NaN/undefined", !/NaN|undefined|Infinity/.test(G0));

  console.log("== หัว Position: ทุกสถานะต้องพูดจริง ==");
  var realCompute = win.AssetAllocation.compute;
  function withRow(patch) {
    win.AssetAllocation.compute = function (a, b) {
      var out = realCompute(a, b);
      var W = out && out.record && out.record.whole;
      if (W) W.rows.forEach(function (r) { if (r.key === qKey(0)) Object.keys(patch).forEach(function (k) { r[k] = patch[k]; }); });
      return out;
    };
  }
  withRow({ flowSource: "none", flow: 0, real: 610000 / 540000 - 1, settingOverridden: false });
  var hN = ppNow(), nF = growLine(hN, "เงินเติมไตรมาสนี้"), nR = growLine(hN, "ไม่รวมเงินเติม");
  t("ยังไม่ได้ตั้งไตรมาสละ → เงินเติม — และเตือนสีอำพัน", !!nF && nF.v === "—" && /pp-warn/.test(nF.ncls) && /ยังไม่ได้ตั้ง “เติมเงินเข้าพอร์ตไตรมาสละ”/.test(nF.n), nF && (nF.v + " | " + nF.n));
  t("…บอกว่าไม่รวมเงินเติม = รวมเงินเติม เพราะไม่มีอะไรให้หัก", !!nR && /เท่ากับรวมเงินเติม/.test(nR.n), nR && nR.n);
  t("…ไม่โกหกว่า '+฿0 · หักออกแล้ว'", growBlockOf(hN).length > 0 && !/฿0|หักออกแล้ว/.test(growBlockOf(hN)));
  withRow({ flowSource: "recorded", flow: -20000, settingOverridden: true });
  var hRc = growLine(ppNow(), "เงินเติมไตรมาสนี้");
  t("กรอก netFlow ในรายการ → ใช้ยอดที่กรอก และบอกว่าแทนยอดไตรมาสละ", !!hRc && norm(hRc.v) === "-฿20,000" && /ตามที่กรอกในรายการ \(ใช้แทนยอดไตรมาสละ ฿60,000\)/.test(hRc.n), hRc && (hRc.v + " | " + hRc.n));
  withRow({ flowSource: "partial", flow: 140000 });
  var hP = growLine(ppNow(), "เงินเติมไตรมาสนี้");
  t("กรอกไว้บางรายการ → เตือนว่าอาจคลาดเคลื่อน", !!hP && hP.v === "฿140,000" && /pp-warn/.test(hP.ncls) && /กรอกไว้บางรายการ/.test(hP.n), hP && (hP.v + " | " + hP.n));
  withRow({ flowSource: "imputed", flow: 200000 });
  var hI = growLine(ppNow(), "เงินเติมไตรมาสนี้");
  t("ระบบประมาณจากรายการใหม่ → บอกตรง ๆ และเตือน", !!hI && hI.v === "฿200,000" && /pp-warn/.test(hI.ncls) && /ระบบประมาณจากรายการที่เพิ่งเข้าพอร์ต/.test(hI.n), hI && (hI.v + " | " + hI.n));
  withRow({ real: null, status: "no-data" });
  var hX = ppNow(), xR = growLine(hX, "ไม่รวมเงินเติม");
  t("คำนวณไม่ได้ → — พร้อมเหตุผล ไม่ใช่ +0.0%", !!xR && xR.v === "—" && /คำนวณไม่ได้/.test(xR.n) && !/\+0\.0%/.test(growBlockOf(hX)), xR && (xR.v + " | " + xR.n));
  withRow({ span: 2, prevKey: qKey(2), flowSource: "setting", flow: 120000, target: Math.pow(1.1, 0.5) - 1, status: "behind" });
  var hS = ppNow(), sN = growLine(hS, "รวมเงินเติม"), sF = growLine(hS, "เงินเติมไตรมาสนี้"), sR = growLine(hS, "ไม่รวมเงินเติม");
  t("ข้ามไตรมาส → บอกว่าเทียบกับไตรมาสไหน", !!sN && sN.n.indexOf("เทียบ " + qKey(2) + " (2 ไตรมาส)") >= 0, sN && sN.n);
  t("…เงินเติม × 2 ไตรมาส", !!sF && sF.v === "฿120,000" && /× 2 ไตรมาส/.test(sF.n), sF && (sF.v + " | " + sF.n));
  t("…เป้าตามช่วง 2 ไตรมาส ~4.9%", !!sR && /เป้า ~4\.9% \(2 ไตรมาส\)/.test(sR.n), sR && sR.n);
  withRow({ status: "ahead" });
  t("สถานะ ahead → เกินเป้า", /· เกินเป้า$/.test((growLine(ppNow(), "ไม่รวมเงินเติม") || {}).n || ""));
  withRow({ status: "on" });
  t("สถานะ on → ตามเป้า", /· ตามเป้า$/.test((growLine(ppNow(), "ไม่รวมเงินเติม") || {}).n || ""));
  // ไตรมาสที่แสดงไม่มีแถว (ไตรมาสแรก) → กลับไปใช้ QoQ เดิม + บอกเหตุผล
  win.AssetAllocation.compute = function (a, b) {
    var out = realCompute(a, b);
    var W = out && out.record && out.record.whole;
    if (W) { W.rows = W.rows.filter(function (r) { return r.key !== qKey(0); }); W.baseKey = qKey(0); }
    return out;
  };
  var hB = ppNow();
  t("ไม่มีแถวของไตรมาสนี้ → QoQ เดิม + บอกเหตุผล", hB.indexOf("pp-grow") < 0 && hB.indexOf("QoQ") >= 0 && /ไม่รวมเงินเติม: ไตรมาสแรกที่มีข้อมูล/.test(hB));
  win.AssetAllocation.compute = realCompute;
  var aaKeep = win.AssetAllocation;
  win.AssetAllocation = null;
  var hNo = ppNow();
  t("ไม่มี engine → QoQ เดิมล้วน ไม่มีบล็อก 3 บรรทัด", hNo.indexOf("pp-grow") < 0 && hNo.indexOf("QoQ") >= 0);
  var qoqM = /QoQ [^<(]*\(([+−-]?[\d.]+)%\)/.exec(hNo);
  t("รวมเงินเติม ตรงกับ QoQ เดิมของหน้า (ฐานเดียวกัน = ทุกรายการ)", !!qoqM && !!gN && Math.abs(Number(norm(qoqM[1])) - Number(norm(gN.v).replace("%", ""))) < 0.06,
    (qoqM && qoqM[1]) + " vs " + (gN && gN.v));
  win.AssetAllocation = aaKeep;
  ppNow();

  console.log("== หัว Position อ่านแถวของไตรมาสที่แสดง ไม่ใช่แถวล่าสุดเสมอ ==");
  function sendSaved(data) { (winH["portfolio-allocation-saved"] || []).forEach(function (fn) { fn({ type: "portfolio-allocation-saved", detail: { data: data } }); }); }
  var OLDQ = JSON.parse(JSON.stringify(FIXTURE)); OLDQ.currentQuarter = qKey(1);
  sendSaved(OLDQ);
  var hQ = els.ppRoot.innerHTML, qN = growLine(hQ, "รวมเงินเติม"), qR = growLine(hQ, "ไม่รวมเงินเติม");
  t("currentQuarter = " + qKey(1) + " → หัวหน้าเป็นไตรมาสนั้น", hQ.indexOf("ไตรมาส <b>" + qKey(1) + "</b>") >= 0);
  t("…ใช้ตัวเลขของ " + qKey(1) + " (+35.0% / +0.0%) ไม่ใช่ของ " + qKey(0), !!qN && norm(qN.v) === "+35.0%" && !!qR && norm(qR.v) === "+0.0%", (qN && qN.v) + " / " + (qR && qR.v));
  sendSaved(JSON.parse(JSON.stringify(FIXTURE)));

  console.log("== แก้ “เติมเงินเข้าพอร์ตไตรมาสละ” ในส่วน AA → หัว Position ตามทันที (ไม่ต้องรอบันทึก/รีโหลด) ==");
  var b0 = growLine(els.ppRoot.innerHTML, "เงินเติมไตรมาสนี้");
  t("ก่อนแก้: ฿60,000", !!b0 && b0.v === "฿60,000", b0 && b0.v);
  var nCh = dispatched.filter(function (e) { return e && e.type === "portfolio-allocation-changed"; }).length;
  win.AssetAllocationPage.setRetirement("quarterlyContribution", "120000");
  var a1 = els.ppRoot.innerHTML, a1F = growLine(a1, "เงินเติมไตรมาสนี้"), a1R = growLine(a1, "ไม่รวมเงินเติม");
  t("AA ส่ง portfolio-allocation-changed ทันทีที่แก้", dispatched.filter(function (e) { return e && e.type === "portfolio-allocation-changed"; }).length > nCh);
  t("หัว Position ใช้ ฿120,000 ทันที (ยังไม่ต้องบันทึก)", !!a1F && a1F.v === "฿120,000", a1F && a1F.v);
  var hand2 = (610000 - 540000 - 120000) / (540000 + 0.5 * 120000) * 100;
  t("…ไม่รวมเงินเติม = คิดมือ " + hand2.toFixed(1) + "%", !!a1R && norm(a1R.v) === hand2.toFixed(1) + "%", a1R && a1R.v);
  t("…ตรงกับตารางทั้งพอร์ตในส่วน AA", !!a1R && norm(aaRealOf(qKey(0)) + "%") === norm(a1R.v), aaRealOf(qKey(0)) + " vs " + (a1R && a1R.v));
  // บันทึกไม่สำเร็จ (เช่น Privacy Lock ยังไม่ปลด) → หัวหน้ากับตารางต้องยังตรงกัน ไม่เด้งกลับไปใช้ค่าเก่า
  FAIL_PUT = true;
  win.AssetAllocationPage.persistNow();
  setTimeout(function () {
    var f1 = growLine(els.ppRoot.innerHTML, "เงินเติมไตรมาสนี้"), f1R = growLine(els.ppRoot.innerHTML, "ไม่รวมเงินเติม");
    t("บันทึกไม่สำเร็จ → AA บอกว่าบันทึกไม่สำเร็จ", (els.aaRoot.innerHTML || "").indexOf('data-save-state="failed"') >= 0);
    t("…หัว Position ยังใช้ ฿120,000 ตรงกับตาราง (ไม่เด้งกลับเป็นค่าเก่า)", !!f1 && f1.v === "฿120,000" && !!f1R && norm(aaRealOf(qKey(0)) + "%") === norm(f1R.v),
      (f1 && f1.v) + " · " + aaRealOf(qKey(0)) + " vs " + (f1R && f1R.v));
    FAIL_PUT = false;
    win.AssetAllocationPage.persistNow();
    setTimeout(function () {
      var sv = dispatched.filter(function (e) { return e && e.type === "portfolio-allocation-saved" && e.detail && e.detail.data && e.detail.data.allocation; });
      var last = sv.length ? sv[sv.length - 1].detail.data : null;
      t("บันทึกสำเร็จ → ส่ง portfolio-allocation-saved ที่เก็บปีละ 480,000", !!last && last.allocation.retirement.annualContribution === 480000,
        last && last.allocation.retirement.annualContribution);
      var s1 = growLine(els.ppRoot.innerHTML, "เงินเติมไตรมาสนี้");
      t("…หัว Position ยัง ฿120,000", !!s1 && s1.v === "฿120,000", s1 && s1.v);
      console.log("");
      console.log(pass + fail + " checks · " + pass + " passed · " + fail + " failed");
      process.exit(fail ? 1 : 0);
    }, 200);
  }, 200);
}, 120);
