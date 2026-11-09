"use strict";
// ============================================================
// Foreign sleeve — โมดูลกลาง (public/foreign-sleeve.js) — เทสต์คิดมือ
//   node scripts/foreign-sleeve-test.js
//
// หุ้นต่างประเทศยึดหน้า AI Portfolio Manager: invested = Σ มูลค่าหุ้นต่างประเทศที่ถือ (กติกา bucket เดิมของหน้า PM)
//   · cash = ช่องใหม่ doc.foreignSleeve.cash (0 = กรอกแล้ว) · gross = invested + cash
//   · โหมด pm เมื่อกรอก cash แล้ว และ holdings ไม่ว่าง · ไม่งั้น editor = พฤติกรรมเดิม (คืนตัวเดิม)
//   · applyToDoc แทนแถว foreign-stock ของไตรมาสปัจจุบันด้วยแถวสังเคราะห์ ห้ามแก้ต้นฉบับ
//   · ผ่าน PortfolioPosition.compute จริง · hook ใน PMEngine / AdaptivePosition ทำงานเฉพาะเมื่อมี window
//   · ไม่มี NaN/undefined/Infinity · ES5 · ไม่มีคำแนะนำซื้อขาย
// ============================================================
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var PUB = path.join(__dirname, "..", "public");
var MODULE = path.join(PUB, "foreign-sleeve.js");

var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; console.log("  PASS  " + name); }
  else { fail++; console.log("  FAIL  " + name + (extra !== undefined ? "  → " + JSON.stringify(extra) : "")); }
}
function finish() {
  console.log("");
  console.log(pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
}
// แถว Quarterly Editor: มูลค่าเดียวกันทั้ง manual/snapshot · inv = ลงทุนแล้วกี่ %
function A(type, name, value, inv) {
  return { type: type, name: name, manualValue: value, snapshotValue: value, investedPercent: inv };
}
function near(a, b) { return typeof a === "number" && Math.abs(a - b) < 1e-6; }
// อ่านซอร์สแบบไม่ล้ม — ให้ขั้น RED ล้มที่ require ด้วย "Cannot find module" ตามแผน
var src = (function () { try { return fs.readFileSync(MODULE, "utf8"); } catch (e) { return ""; } })();
// ES5 เคร่งครัด: ไม่มี arrow / const / let / template literal / class / spread / async
function es5ok(file) {
  var s;
  try { s = fs.readFileSync(path.join(PUB, file), "utf8"); } catch (e) { return false; }
  var banned = ["=>", "const ", "let ", "`", "class ", "...", "async"];
  for (var i = 0; i < banned.length; i++) {
    if (s.indexOf(banned[i]) >= 0) { console.log("    es5ok: พบ " + JSON.stringify(banned[i]) + " ใน " + file); return false; }
  }
  return true;
}
// JSON.stringify กลืน NaN/Infinity เป็น null และทิ้ง undefined — จึงเดินดูค่าเองทุกชั้น
function badValues(o, at, seen) {
  at = at || "$"; seen = seen || [];
  if (o === undefined) return [at];
  if (typeof o === "number") return Number.isFinite(o) ? [] : [at];
  if (!o || typeof o !== "object") return [];
  if (seen.indexOf(o) >= 0) return [];
  seen.push(o);
  var out = [];
  Object.keys(o).forEach(function (k) { out = out.concat(badValues(o[k], at + "." + k, seen)); });
  return out;
}
var LEAK = /NaN|undefined|Infinity/;
var ADVISORY = /ควรซื้อ|ควรขาย|น่าซื้อ|น่าขาย|น่าเข้า|แนะนำซื้อ|จุดเข้า|ตัดขาดทุน|\b(Buy|Sell)\b/;

// ---------- โหลดโมดูล (RED: Cannot find module) ----------
var FS = require("../public/foreign-sleeve.js");
var PP = require("../public/portfolio-position-engine.js");
var PM = require("../public/portfolio-manager-engine.js");
var AP = require("../public/adaptive-position-engine.js");

// กติกาเดิมของ portfolio-manager-page.js buildInputs (บรรทัด ~128–133) คัดลอกคำต่อคำ — ตัวอ้างอิงสำหรับ parity
//   (canonical = upper-trim ของ canonicalSymbol || ticker ตามสัญญาของ Task 1)
function refBucket(h) {
  var raw = String(h.canonicalSymbol || h.ticker || "").trim().toUpperCase();
  var isThaiFund = /RMF|SSF/i.test(raw) || /THAI_MUTUAL_FUND|MUTUAL/i.test(String(h.assetType || ""));
  var bucket = h.portfolioBucket || (raw.endsWith(".BK") ? "thai-stock" : (raw.indexOf("BTC") >= 0 ? "bitcoin" : (isThaiFund ? "thai-fund" : "foreign-stock")));
  return bucket;
}

// ---------- fixture: holdings ผสม ----------
function H(sym, mv, extra) {
  var h = { canonicalSymbol: sym, isHolding: true, marketValue: mv };
  if (extra) Object.keys(extra).forEach(function (k) { h[k] = extra[k]; });
  return h;
}
var HOLD = [
  H("NVDA", 2000000),                                              // foreign
  H("GOOG", 300000),                                               // foreign (สอง class นับทั้งคู่)
  H("GOOGL", 200000),                                              // foreign
  H("PTT.BK", 500000),                                             // thai-stock
  H("BTCUSD", 7000000),                                            // bitcoin
  H("K-GTECHRMF", 900000),                                         // RMF ไม่มี bucket → thai-fund
  H("KFGBRANDA", 400000, { assetType: "THAI_MUTUAL_FUND" }),       // กองทุนไทยจาก assetType → thai-fund
  H("SCBS&P500SSF", 120000),                                       // SSF → thai-fund
  H("QQQM", 2200000, { portfolioBucket: "foreign-stock" }),        // ตั้ง bucket เอง → foreign
  H("AAPL", 150000, { portfolioBucket: "thai-stock" }),            // ตั้ง bucket เอง (ชนะกติกา) → ไม่นับ
  H("MSFT", 999999, { isHolding: false }),                          // ไม่ได้ถือ → ไม่นับ
  { ticker: " amd ", isHolding: true, marketValue: 50000 },        // ไม่มี canonicalSymbol → ใช้ ticker (upper-trim) → foreign
  H("TSLA", -5),                                                   // มูลค่าติดลบ → ไม่นับ
  H("PLTR", "abc")                                                 // มูลค่าไม่ใช่ตัวเลข → ไม่นับ
];
var INVESTED = 2000000 + 300000 + 200000 + 2200000 + 50000; // 4,750,000
var EXPECT_BUCKET = {
  NVDA: "foreign-stock", GOOG: "foreign-stock", GOOGL: "foreign-stock", "PTT.BK": "thai-stock", BTCUSD: "bitcoin",
  "K-GTECHRMF": "thai-fund", KFGBRANDA: "thai-fund", "SCBS&P500SSF": "thai-fund", QQQM: "foreign-stock", AAPL: "thai-stock",
  MSFT: "foreign-stock", AMD: "foreign-stock", TSLA: "foreign-stock", PLTR: "foreign-stock"
};

// ---------- fixture: เอกสาร Quarterly Editor 2 ไตรมาส (ไตรมาสปัจจุบันมีหุ้นต่างประเทศ 2 แถว) ----------
function mkDoc(cash) {
  var d = {
    currentQuarter: "2026-Q4",
    allocation: { foo: 1 },
    quarters: {
      "2026-Q3": { key: "2026-Q3", assets: [
        A("bitcoin", "Bitcoin", 9000000, 78),
        A("foreign-stock", "US", 3800000, 90),
        A("thai-stock", "หุ้นไทย", 4000000, 88),
        A("cash", "เงินสด", 2000000, 0)
      ] },
      "2026-Q4": { key: "2026-Q4", savedAt: null, assets: [
        A("bitcoin", "Bitcoin", 10000000, 78),
        A("foreign-stock", "US-A", 2500000, 90),
        A("thai-stock", "หุ้นไทย", 4500000, 88),
        A("foreign-stock", "US-B", 1500000, 90),
        A("cash", "เงินสด", 2100000, 0)
      ] }
    }
  };
  if (cash !== undefined) d.foreignSleeve = { cash: cash, updatedAt: "2026-11-09T01:02:03.000Z" };
  return d;
}
var GROSS = INVESTED + 600000; // 5,350,000

console.log("== ทั่วไป ==");
t("VERSION = fs-1", FS.VERSION === "fs-1");
t("โหลดใน browser (VM ไม่มี module) → window.ForeignSleeve", (function () {
  var ctx = { window: {} };
  try { vm.runInNewContext(src, ctx); } catch (e) { return false; }
  return !!(ctx.window.ForeignSleeve && ctx.window.ForeignSleeve.VERSION === "fs-1" && typeof ctx.window.ForeignSleeve.applyToSnapshot === "function");
})());
t("exports ครบตามสัญญา", ["bucketOf", "investedOf", "docOf", "cashOf", "sleeveOf", "applyToDoc", "applyToSnapshot"].every(function (k) { return typeof FS[k] === "function"; }));

console.log("== bucketOf / investedOf (parity กับหน้า PM) ==");
HOLD.forEach(function (h) {
  var key = String(h.canonicalSymbol || h.ticker).trim().toUpperCase();
  t("bucketOf " + key + " = " + EXPECT_BUCKET[key] + " (ตรงกติกาเดิม)", FS.bucketOf(h) === EXPECT_BUCKET[key] && FS.bucketOf(h) === refBucket(h), FS.bucketOf(h));
});
t("bucketOf: มี BTC ในชื่อ (BTC-USD) → bitcoin · .BK ชนะ BTC ไม่ได้มาก่อน", FS.bucketOf({ canonicalSymbol: "BTC-USD" }) === "bitcoin" && FS.bucketOf({ canonicalSymbol: "XBTC.BK" }) === "thai-stock");
t("bucketOf: assetType 'mutual fund' (ตัวเล็ก) → thai-fund", FS.bucketOf({ canonicalSymbol: "ABCFUND", assetType: "mutual fund" }) === "thai-fund");
t("bucketOf: portfolioBucket ชนะแม้เป็น .BK", FS.bucketOf({ canonicalSymbol: "GULF.BK", portfolioBucket: "foreign-stock" }) === "foreign-stock");
t("bucketOf: null / ไม่ใช่ object → สตริง ไม่ล้ม และไม่ใช่ foreign-stock", typeof FS.bucketOf(null) === "string" && FS.bucketOf(null) !== "foreign-stock" && FS.bucketOf(undefined) !== "foreign-stock");
t("investedOf = 4,750,000 (NVDA + GOOG + GOOGL + QQQM + AMD)", FS.investedOf(HOLD) === INVESTED, FS.investedOf(HOLD));
t("investedOf: GOOG + GOOGL นับทั้งคู่", FS.investedOf([H("GOOG", 300000), H("GOOGL", 200000)]) === 500000);
t("investedOf: ไม่ใช่ array / ว่าง / มี null → 0 ไม่ล้ม", FS.investedOf(null) === 0 && FS.investedOf(undefined) === 0 && FS.investedOf([]) === 0 && FS.investedOf([null, undefined, 5]) === 0);
t("investedOf: marketValue สตริงตัวเลขนับได้ (แบบ fin ของหน้า PM) · Infinity/NaN ไม่นับ", FS.investedOf([H("NVDA", "1000"), H("AMD", Infinity), H("META", NaN), H("ARM", null)]) === 1000);

console.log("== docOf / cashOf ==");
var DOC0 = { foreignSleeve: { cash: 0 } };
t("docOf: {data: doc} → doc · doc ตรง → doc · null → null · {data:null} → null", FS.docOf({ data: DOC0 }) === DOC0 && FS.docOf(DOC0) === DOC0 && FS.docOf(null) === null && FS.docOf(undefined) === null && FS.docOf({ data: null }) === null && FS.docOf("x") === null);
t("cashOf {data:{foreignSleeve:{cash:0}}} → 0 (กรอกแล้วว่าเป็นศูนย์)", FS.cashOf({ data: { foreignSleeve: { cash: 0 } } }) === 0);
t("cashOf doc ตรง {foreignSleeve:{cash:600000}} → 600000", FS.cashOf({ foreignSleeve: { cash: 600000 } }) === 600000);
t("cashOf: 'abc' / -1 / null / ไม่มีคีย์ → null", FS.cashOf({ data: { foreignSleeve: { cash: "abc" } } }) === null && FS.cashOf({ data: { foreignSleeve: { cash: -1 } } }) === null && FS.cashOf({ data: { foreignSleeve: { cash: null } } }) === null && FS.cashOf({ data: { foreignSleeve: {} } }) === null && FS.cashOf({ data: {} }) === null);
t("cashOf: NaN / Infinity / สตริงตัวเลข / ps ว่าง → null", FS.cashOf({ foreignSleeve: { cash: NaN } }) === null && FS.cashOf({ foreignSleeve: { cash: Infinity } }) === null && FS.cashOf({ foreignSleeve: { cash: "600000" } }) === null && FS.cashOf(null) === null && FS.cashOf({ data: null }) === null && FS.cashOf({ foreignSleeve: null }) === null);

console.log("== sleeveOf (โหมด) ==");
var S1 = FS.sleeveOf({ data: mkDoc(600000) }, HOLD);
t("cash 600000 + holdings ไม่ว่าง → pm · gross = invested + 600000", S1.source === "pm" && S1.reason === null && S1.invested === INVESTED && S1.cash === 600000 && S1.gross === GROSS, S1);
t("pm: investedPct = invested / gross × 100 · updatedAt จากเอกสาร", near(S1.investedPct, INVESTED / GROSS * 100) && S1.updatedAt === "2026-11-09T01:02:03.000Z", S1);
var S0 = FS.sleeveOf({ data: mkDoc(0) }, HOLD);
t("cash 0 → pm (0 = กรอกแล้ว) · gross = invested", S0.source === "pm" && S0.cash === 0 && S0.gross === INVESTED && near(S0.investedPct, 100), S0);
var SN = FS.sleeveOf({ data: mkDoc() }, HOLD);
t("cash ไม่ได้กรอก → editor / no-cash · ตัวเลข null ทั้งหมด", SN.source === "editor" && SN.reason === "no-cash" && SN.invested === null && SN.cash === null && SN.gross === null && SN.investedPct === null, SN);
var SE = FS.sleeveOf({ data: mkDoc(600000) }, []);
t("holdings [] → editor / no-holdings (ห้ามเป็นหุ้นต่างประเทศ = cash ล้วน)", SE.source === "editor" && SE.reason === "no-holdings" && SE.invested === null && SE.cash === null && SE.gross === null && SE.investedPct === null, SE);
t("holdings null / undefined / ไม่ใช่ array → editor / no-holdings", FS.sleeveOf({ data: mkDoc(600000) }, null).reason === "no-holdings" && FS.sleeveOf({ data: mkDoc(600000) }).reason === "no-holdings" && FS.sleeveOf({ data: mkDoc(600000) }, { data: HOLD }).reason === "no-holdings");
t("ps null → editor / no-cash ไม่ล้ม", FS.sleeveOf(null, HOLD).source === "editor" && FS.sleeveOf(null, HOLD).reason === "no-cash");
t("pm: gross 0 (ไม่มีหุ้นต่างประเทศ + cash 0) → investedPct 0 ไม่หารศูนย์", (function () { var s = FS.sleeveOf({ data: mkDoc(0) }, [H("PTT.BK", 1)]); return s.source === "pm" && s.gross === 0 && s.investedPct === 0; })());
t("sleeveOf ทุกโหมด: ครบ 7 คีย์ ไม่มี NaN/undefined/Infinity", [S1, S0, SN, SE, FS.sleeveOf(null, null)].every(function (s) {
  return ["source", "reason", "invested", "cash", "gross", "investedPct", "updatedAt"].every(function (k) { return k in s; }) && badValues(s).length === 0;
}));
t("updatedAt ไม่ใช่สตริง → null", FS.sleeveOf({ data: { foreignSleeve: { cash: 5, updatedAt: 123 } } }, HOLD).updatedAt === null);

console.log("== applyToDoc ==");
var PSW = { data: mkDoc(600000), meta: "keep" };
var beforeW = JSON.stringify(PSW);
var OW = FS.applyToDoc(PSW, HOLD);
var cur = OW && OW.data && OW.data.quarters["2026-Q4"];
var syn = cur && cur.assets.filter(function (a) { return a.fromPM; })[0];
t("pm {data}: คืนรูป {data} · สำเนาใหม่ทุกชั้นที่แก้", OW !== PSW && OW.data !== PSW.data && OW.data.quarters !== PSW.data.quarters && cur !== PSW.data.quarters["2026-Q4"] && cur.assets !== PSW.data.quarters["2026-Q4"].assets && OW.meta === "keep");
t("แถว foreign-stock เดิม 2 แถว → แถวสังเคราะห์ 1 แถว", cur.assets.filter(function (a) { return a.type === "foreign-stock"; }).length === 1 && !!syn && cur.assets.length === 4);
t("แถวสังเคราะห์ค่าตรง: gross 5,350,000 · investedPercent = invested/gross×100 · ชื่อ · fromPM",
  syn.type === "foreign-stock" && syn.name === "หุ้นต่างประเทศ · AI Portfolio Manager" && syn.manualValue === GROSS && syn.snapshotValue === GROSS && near(syn.investedPercent, INVESTED / GROSS * 100) && syn.fromPM === true, syn);
t("แถวอื่นคงเดิม (reference เดียวกัน · ลำดับเดิม · แถวสังเคราะห์อยู่ตำแหน่งแถวหุ้นต่างประเทศแรก)", (function () {
  var o = PSW.data.quarters["2026-Q4"].assets;
  return cur.assets[0] === o[0] && cur.assets[1] === syn && cur.assets[2] === o[2] && cur.assets[3] === o[4];
})());
t("ไตรมาสอื่น / คีย์อื่นของเอกสารคงเดิม", OW.data.quarters["2026-Q3"] === PSW.data.quarters["2026-Q3"] && OW.data.allocation === PSW.data.allocation && OW.data.foreignSleeve === PSW.data.foreignSleeve && OW.data.currentQuarter === "2026-Q4" && cur.key === "2026-Q4" && cur.savedAt === null);
t("input ไม่ถูกแก้ (JSON ก่อน/หลังเท่ากัน)", JSON.stringify(PSW) === beforeW);
t("output ไม่มี NaN/undefined/Infinity", badValues(OW).length === 0, badValues(OW));
var PSD = mkDoc(600000), beforeD = JSON.stringify(PSD);
var OD = FS.applyToDoc(PSD, HOLD);
t("pm doc ตรง: คืน doc ตรง (ไม่ห่อ data) · แถวสังเคราะห์ · input ไม่ถูกแก้", OD !== PSD && !("data" in OD) && OD.quarters["2026-Q4"].assets.filter(function (a) { return a.type === "foreign-stock"; }).length === 1 && OD.quarters["2026-Q4"].assets.filter(function (a) { return a.fromPM; })[0].manualValue === GROSS && JSON.stringify(PSD) === beforeD);
t("ไตรมาสปัจจุบันไม่มีแถว foreign-stock เลย → เพิ่มแถวสังเคราะห์ท้ายรายการ", (function () {
  var d = mkDoc(600000);
  d.quarters["2026-Q4"].assets = d.quarters["2026-Q4"].assets.filter(function (a) { return a.type !== "foreign-stock"; });
  var o = FS.applyToDoc({ data: d }, HOLD).data.quarters["2026-Q4"].assets;
  return o.length === 4 && o[3].fromPM === true && o[3].manualValue === GROSS && d.quarters["2026-Q4"].assets.length === 3;
})());
t("currentQuarter ไม่อยู่ใน quarters → ใช้คีย์ล่าสุดเมื่อ sort", (function () {
  var d = mkDoc(600000); d.currentQuarter = "2027-Q1";
  var o = FS.applyToDoc({ data: d }, HOLD).data;
  return o.quarters["2026-Q4"].assets.some(function (a) { return a.fromPM; }) && o.quarters["2026-Q3"] === d.quarters["2026-Q3"] && !o.quarters["2027-Q1"];
})());
t("ไม่มี currentQuarter → ใช้คีย์ล่าสุดเมื่อ sort", (function () {
  var d = mkDoc(600000); delete d.currentQuarter;
  return FS.applyToDoc(d, HOLD).quarters["2026-Q4"].assets.some(function (a) { return a.fromPM; });
})());
// E13 (final fix wave · mutation survivor): currentQuarter เป็นคีย์ที่เก่ากว่าคีย์ล่าสุดเมื่อ sort (มี 2026-Q4 อยู่แล้วแต่ยังตั้ง 2026-Q3)
//   → แทนแถวหุ้นต่างประเทศของ currentQuarter (2026-Q3) ไม่ใช่ 2026-Q4 · PortfolioPosition.compute (key = currentQuarter) ต้องเห็นตรงกัน
function isFromPM(a) { return !!a && a.fromPM === true; }
function isForeign(a) { return !!a && a.type === "foreign-stock"; }
var DCQ = mkDoc(600000); DCQ.currentQuarter = "2026-Q3";
var beforeCQ = JSON.stringify(DCQ);
var OCQ = FS.applyToDoc({ data: DCQ }, HOLD).data;
var q3cq = OCQ.quarters["2026-Q3"].assets;
t("currentQuarter 2026-Q3 (เก่ากว่า 2026-Q4 ที่มีอยู่) → แถว US 3.8 ล้าน ของ 2026-Q3 ถูกแทนด้วยแถวสังเคราะห์ (ตำแหน่งเดิม) · 2026-Q4 ไม่ถูกแตะ (reference เดิม · ไม่มี fromPM) · input ไม่ถูกแก้",
  q3cq.filter(isFromPM).length === 1 && q3cq.filter(isForeign).length === 1 && q3cq.length === 4 && q3cq[1].fromPM === true && q3cq[1].manualValue === GROSS &&
  OCQ.quarters["2026-Q4"] === DCQ.quarters["2026-Q4"] && !OCQ.quarters["2026-Q4"].assets.some(isFromPM) && OCQ.currentQuarter === "2026-Q3" && JSON.stringify(DCQ) === beforeCQ,
  q3cq.map(function (a) { return a.name; }));
var SNAPCQ = { portfolioStatus: { data: DCQ }, portfolioHoldings: { data: HOLD } };
var RCQ0 = PP.compute(SNAPCQ, {}), RCQ1 = PP.compute(FS.applyToSnapshot(SNAPCQ), {});
function bkOf(R, type) { return (R.buckets || []).filter(function (b) { return b.type === type; })[0]; }
t("PortfolioPosition.compute บนผลลัพธ์ตรงกัน: quarterKey 2026-Q3 ทั้งคู่ · foreign-stock 3,800,000 → 5,350,000 (แถวสังเคราะห์แถวเดียว) · total 18,800,000 → 20,350,000",
  RCQ0.available === true && RCQ1.available === true && RCQ0.quarterKey === "2026-Q3" && RCQ1.quarterKey === "2026-Q3" &&
  bkOf(RCQ0, "foreign-stock").gross === 3800000 && bkOf(RCQ1, "foreign-stock").gross === GROSS && bkOf(RCQ1, "foreign-stock").invested === INVESTED &&
  bkOf(RCQ1, "foreign-stock").quarterAssets.length === 1 && bkOf(RCQ1, "foreign-stock").quarterAssets[0].name === "หุ้นต่างประเทศ · AI Portfolio Manager" &&
  RCQ0.totals.total === 18800000 && RCQ1.totals.total === 20350000,
  [RCQ0.quarterKey, RCQ1.quarterKey, RCQ0.totals && RCQ0.totals.total, RCQ1.totals && RCQ1.totals.total, bkOf(RCQ1, "foreign-stock") && bkOf(RCQ1, "foreign-stock").gross]);
t("pm แต่ไตรมาสปัจจุบันไม่มี assets → สร้าง assets ใหม่มีแถวสังเคราะห์ ไม่แก้ต้นฉบับ", (function () {
  var d = mkDoc(600000); delete d.quarters["2026-Q4"].assets;
  var o = FS.applyToDoc(d, HOLD);
  return o.quarters["2026-Q4"].assets.length === 1 && o.quarters["2026-Q4"].assets[0].fromPM === true && !("assets" in d.quarters["2026-Q4"]);
})());
t("cash 0: แถวสังเคราะห์ investedPercent 100", (function () {
  var a = FS.applyToDoc({ data: mkDoc(0) }, HOLD).data.quarters["2026-Q4"].assets.filter(function (x) { return x.fromPM; })[0];
  return a.manualValue === INVESTED && near(a.investedPercent, 100);
})());
t("gross 0 → แถวสังเคราะห์ investedPercent 0 ไม่มี NaN", (function () {
  var o = FS.applyToDoc({ data: mkDoc(0) }, [H("PTT.BK", 1)]);
  var a = o.data.quarters["2026-Q4"].assets.filter(function (x) { return x.fromPM; })[0];
  return a.manualValue === 0 && a.investedPercent === 0 && badValues(o).length === 0;
})());
var PSN = { data: mkDoc() };
t("editor (no-cash) → คืน reference เดิม", FS.applyToDoc(PSN, HOLD) === PSN);
var PSE = { data: mkDoc(600000) };
t("editor (no-holdings) → คืน reference เดิม", FS.applyToDoc(PSE, []) === PSE && FS.applyToDoc(PSE, null) === PSE);
t("pm แต่เอกสารไม่มีไตรมาส → คืนตัวเดิม (ไม่สร้างไตรมาสขึ้นเอง)", (function () { var p = { data: { foreignSleeve: { cash: 5 } } }; var q = { data: { foreignSleeve: { cash: 5 }, quarters: {} } }; return FS.applyToDoc(p, HOLD) === p && FS.applyToDoc(q, HOLD) === q; })());
t("ps null / undefined → คืนตัวเดิม ไม่ล้ม", FS.applyToDoc(null, HOLD) === null && FS.applyToDoc(undefined, HOLD) === undefined);

console.log("== applyToSnapshot ==");
var SNAP = { loadedAt: "2026-11-09", portfolioStatus: { data: mkDoc(600000) }, portfolioHoldings: { data: HOLD }, scoring: { x: 1 } };
var beforeS = JSON.stringify(SNAP);
var OS = FS.applyToSnapshot(SNAP);
t("pm: holdings ไม่ส่ง = snapshot.portfolioHoldings.data → shallow copy ที่ portfolioStatus แปลงแล้ว", OS !== SNAP && OS.portfolioStatus !== SNAP.portfolioStatus && OS.portfolioHoldings === SNAP.portfolioHoldings && OS.scoring === SNAP.scoring && OS.loadedAt === "2026-11-09" && OS.portfolioStatus.data.quarters["2026-Q4"].assets.some(function (a) { return a.fromPM && a.manualValue === GROSS; }));
t("applyToSnapshot ไม่แก้ snapshot ต้นฉบับ", JSON.stringify(SNAP) === beforeS);
t("ส่ง holdings [] เอง → editor คืนตัวเดิม (holdings ที่ส่งชนะของใน snapshot)", FS.applyToSnapshot(SNAP, []) === SNAP);
t("ส่ง holdings เอง → ใช้ชุดนั้น", (function () { var o = FS.applyToSnapshot({ portfolioStatus: { data: mkDoc(0) }, portfolioHoldings: { data: [] } }, [H("NVDA", 1000)]); return o.portfolioStatus.data.quarters["2026-Q4"].assets.filter(function (a) { return a.fromPM; })[0].manualValue === 1000; })());
var SNAPN = { portfolioStatus: { data: mkDoc() }, portfolioHoldings: { data: HOLD } };
t("editor (no-cash) → คืน snapshot ตัวเดิม", FS.applyToSnapshot(SNAPN) === SNAPN);
var SNAPH = { portfolioStatus: { data: mkDoc(600000) }, portfolioHoldings: null };
t("snapshot ไม่มี holdings → editor คืนตัวเดิม", FS.applyToSnapshot(SNAPH) === SNAPH);
t("snapshot null / ไม่ใช่ object → คืนตัวเดิม ไม่ล้ม", FS.applyToSnapshot(null) === null && FS.applyToSnapshot(undefined) === undefined);

console.log("== ผ่าน PortfolioPosition.compute จริง ==");
var SNAPP = { portfolioStatus: { data: mkDoc(600000) }, portfolioHoldings: { data: HOLD } };
var R0 = PP.compute(SNAPP, {});
var R1 = PP.compute(FS.applyToSnapshot(SNAPP), {});
function bk(R, type) { return (R.buckets || []).filter(function (b) { return b.type === type; })[0]; }
t("ก่อนแปลง: foreign-stock = Editor 4,000,000 · total 20,600,000", R0.available === true && bk(R0, "foreign-stock").gross === 4000000 && R0.totals.total === 20600000, R0.totals);
t("หลังแปลง: foreign-stock ของ R = gross ของ PM (5,350,000) · invested 4,750,000 · cash 600,000", R1.available === true && bk(R1, "foreign-stock").gross === GROSS && bk(R1, "foreign-stock").invested === INVESTED && bk(R1, "foreign-stock").cash === 600000, bk(R1, "foreign-stock"));
t("R.totals.total เปลี่ยนตามส่วนต่าง (20,600,000 − 4,000,000 + 5,350,000 = 21,950,000)", R1.totals.total === R0.totals.total - 4000000 + GROSS && R1.totals.total === 21950000, [R0.totals.total, R1.totals.total]);
t("investedSum / cashSum ขยับเท่าส่วนต่างของหุ้นต่างประเทศ", R1.totals.investedSum === R0.totals.investedSum - 3600000 + INVESTED && R1.totals.cashSum === R0.totals.cashSum - 400000 + 600000, [R0.totals, R1.totals]);
t("QoQ ยังเทียบไตรมาสก่อนจาก Editor (3,800,000)", R1.prevQuarterKey === "2026-Q3" && bk(R1, "foreign-stock").qoq.thb === GROSS - 3800000 && R1.totals.qoq.thb === R1.totals.total - (9000000 + 3800000 + 4000000 + 2000000), [bk(R1, "foreign-stock").qoq, R1.totals.qoq]);
t("ส่วนอื่นของ R ไม่เปลี่ยน (bitcoin / thai-stock / cash)", ["bitcoin", "thai-stock", "cash"].every(function (k) { return bk(R1, k).gross === bk(R0, k).gross && bk(R1, k).invested === bk(R0, k).invested; }));
t("ส่วน foreign-stock มี quarterAsset เดียว = แถวสังเคราะห์", bk(R1, "foreign-stock").quarterAssets.length === 1 && bk(R1, "foreign-stock").quarterAssets[0].name === "หุ้นต่างประเทศ · AI Portfolio Manager");

console.log("== hook: PMEngine.quarterlyBuckets ==");
var SNAPQ = { portfolioStatus: { data: mkDoc(600000) }, portfolioHoldings: { data: HOLD } };
t("Node ไม่มี window → พฤติกรรมเดิม (Editor 4,000,000)", typeof window === "undefined" && PM.quarterlyBuckets(SNAPQ)["foreign-stock"] === 4000000);
global.window = { ForeignSleeve: FS };
var QB1 = PM.quarterlyBuckets(SNAPQ), QBN = PM.quarterlyBuckets({ portfolioStatus: { data: mkDoc() }, portfolioHoldings: { data: HOLD } });
var QBE = PM.quarterlyBuckets({ portfolioStatus: { data: mkDoc(600000) }, portfolioHoldings: { data: [] } });
delete global.window;
t("มี window.ForeignSleeve + โหมด pm → foreign-stock = gross ของ PM · ก้อนอื่นเท่าเดิม", QB1["foreign-stock"] === GROSS && QB1.bitcoin === 10000000 && QB1["thai-stock"] === 4500000 && QB1.cash === 2100000, QB1);
t("มี window.ForeignSleeve แต่โหมด editor (ไม่กรอก cash / holdings ว่าง) → Editor 4,000,000", QBN["foreign-stock"] === 4000000 && QBE["foreign-stock"] === 4000000);
t("quarterlyBuckets ไม่แก้ snapshot ต้นฉบับ", SNAPQ.portfolioStatus.data.quarters["2026-Q4"].assets.length === 5 && !SNAPQ.portfolioStatus.data.quarters["2026-Q4"].assets.some(function (a) { return a.fromPM; }));

console.log("== hook: AdaptivePosition (สัดส่วนลงทุนปัจจุบัน) ==");
// fixture เบา ๆ ให้ compute เดินถึงขั้น 6 (เทียบสัดส่วนลงทุน) — ลอกรูปจาก adaptive-position-smoke-test.js
var LKEYS = ["model", "cloud", "gpu", "networking", "memory", "foundry", "equipment", "power", "utility", "enterprise"];
function mkR(m) {
  return {
    available: true,
    layers: LKEYS.map(function (k) { return { key: k, name: k.toUpperCase(), momentum: m, companies: [] }; }),
    phase: { current: { key: "inference", name: "Inference Expansion" }, next: { key: "power", name: "Power Expansion" }, confidence: 70, evidenceMet: 66 },
    timeline: [{ key: "model", status: "past" }, { key: "gpu", status: "past" }, { key: "inference", status: "current" }, { key: "power", status: "future" }, { key: "enterprise", status: "future" }, { key: "agent", status: "future" }],
    rotation: { ranked: LKEYS.slice(0, 3).map(function (k) { return { key: k, momentum: m }; }) },
    concentration: { level: { key: "medium" } }
  };
}
function series(n, f) { var a = []; for (var i = 0; i < n; i++) a.push(f(i)); return a; }
function apSnap(doc, holdings) {
  return {
    historicalData: { "^TNX": { closes: series(30, function () { return 4.0; }) }, QQQM: { closes: series(320, function (i) { return 50 + i * 0.3; }) }, BTCUSD: { closes: series(320, function (i) { return 50 + i * 0.3; }) } },
    portfolioStatus: { data: doc },
    portfolioHoldings: { data: holdings }
  };
}
var AP_OPTS = { R: mkR(78), regime: { available: true, score: 70, regime: { key: "risk-on", label: "Risk-On" } }, PP: PP };
// Editor: total 20.6M · invested 7.8M + 3.6M + 3.96M = 15.36M → 74.6% · PM: total 21.95M · invested 16.51M → 75.2%
var ap0 = AP.compute(apSnap(mkDoc(600000), HOLD), AP_OPTS);
global.window = { ForeignSleeve: FS };
var ap1 = AP.compute(apSnap(mkDoc(600000), HOLD), AP_OPTS);
var apN = AP.compute(apSnap(mkDoc(), HOLD), AP_OPTS);
var apE = AP.compute(apSnap(mkDoc(600000), []), AP_OPTS);
delete global.window;
t("Node ไม่มี window → สัดส่วนลงทุนจาก Editor 74.6%", ap0.available === true && ap0.currentInvestedPct === 74.6, ap0.currentInvestedPct);
t("มี window.ForeignSleeve + โหมด pm → สัดส่วนลงทุนใช้ sleeve ของ PM 75.2%", ap1.available === true && ap1.currentInvestedPct === 75.2, ap1.currentInvestedPct);
t("มี window.ForeignSleeve แต่โหมด editor → 74.6% เท่าเดิม", apN.currentInvestedPct === 74.6 && apE.currentInvestedPct === 74.6, [apN.currentInvestedPct, apE.currentInvestedPct]);

console.log("== ซอร์ส ==");
t("ES5 + ป้ายไทย + ไม่มีคำแนะนำซื้อขาย ในโมดูล", es5ok("foreign-sleeve.js") && /หุ้นต่างประเทศ/.test(src) && !ADVISORY.test(src));
t("โมดูล pure: ไม่แตะ DOM / fetch / storage", src.length > 0 && !/document\.|fetch\(|localStorage|sessionStorage|XMLHttpRequest/.test(src));
t("โมดูลใช้ \"use strict\" + window.ForeignSleeve + module.exports", /"use strict"/.test(src) && /window\.ForeignSleeve\s*=/.test(src) && /module\.exports\s*=/.test(src));
t("engines ที่แก้ยังเป็น ES5", es5ok("portfolio-manager-engine.js") && es5ok("adaptive-position-engine.js"));
t("hook ใน engines ไม่มีคำแนะนำซื้อขายใหม่", (function () {
  var a = fs.readFileSync(path.join(PUB, "portfolio-manager-engine.js"), "utf8"), b = fs.readFileSync(path.join(PUB, "adaptive-position-engine.js"), "utf8");
  return /ForeignSleeve/.test(a) && /ForeignSleeve/.test(b) && !/ควรซื้อ|ควรขาย|น่าซื้อ|น่าขาย|แนะนำซื้อ|ตัดขาดทุน/.test(a + b);
})());
t("ทั้ง 7 หน้าโหลด /foreign-sleeve.js?v=20261109-fs-1 หลัง data-snapshot.js (+ portfolio-core.js) และก่อน engine/page ที่ใช้", (function () {
  var pages = ["portfolio-manager.html", "portfolio.html", "home.html", "action-center.html", "accumulation-center.html", "asset.html", "adaptive-position.html"];
  var users = ["portfolio-manager-engine.js", "adaptive-position-engine.js", "portfolio-position-engine.js", "portfolio-position-page.js", "mission-control-page.js", "action-center-page.js", "accumulation-page.js", "thesis-reconcile.js", "portfolio-manager-page.js", "asset-page.js"];
  var bad = [];
  pages.forEach(function (p) {
    var s = fs.readFileSync(path.join(PUB, p), "utf8");
    var tag = '<script src="/foreign-sleeve.js?v=20261109-fs-1"></script>';
    var at = s.indexOf(tag);
    if (at < 0 || s.indexOf(tag, at + 1) >= 0) { bad.push(p + ": tag"); return; }
    var snapAt = s.indexOf("/data-snapshot.js"), coreAt = s.indexOf("/portfolio-core.js");
    if (snapAt < 0 || snapAt > at) bad.push(p + ": ก่อน data-snapshot");
    if (coreAt >= 0 && coreAt > at) bad.push(p + ": ก่อน portfolio-core");
    users.forEach(function (u) { var ua = s.indexOf("/" + u); if (ua >= 0 && ua < at) bad.push(p + ": หลัง " + u); });
  });
  if (bad.length) console.log("    " + bad.join(" · "));
  return bad.length === 0;
})());

finish();
