"use strict";
// ============================================================
// Foreign sleeve — โมดูลกลาง (public/foreign-sleeve.js) — เทสต์คิดมือ
//   node scripts/foreign-sleeve-test.js
//
// หุ้นต่างประเทศยึดหน้า AI Portfolio Manager: invested = Σ มูลค่าหุ้นต่างประเทศที่ถือ (กติกา bucket เดิมของหน้า PM)
//   · cash = ช่องใหม่ doc.foreignSleeve.cash (0 = กรอกแล้ว) · gross = invested + cash
//   · โหมด pm เมื่อกรอก cash แล้ว และ holdings ไม่ว่าง · ไม่งั้น editor = พฤติกรรมเดิม (คืนตัวเดิม)
//   · applyToDoc แทนแถว foreign-stock ของไตรมาสปัจจุบันด้วยแถวเดียว ห้ามแก้ต้นฉบับ
//   · Addendum 2026-11-09 (editor-follows-pm Task 1): แถวที่แทน = สำเนาแถวหุ้นต่างประเทศแรก (คงชื่อ/id)
//     + netFlow รวมของแถวเดิม · applyToAssets (mark:false = ไม่ใส่ fromPM) · ใช้ค่า PM เฉพาะไตรมาสล่าสุด
//     (ไตรมาสปัจจุบันเก่ากว่าคีย์ล่าสุด → editor / past-quarter) · ผลตอบแทนต่อเนื่องผ่าน AssetAllocation จริง
//   · Addendum ข้อ 5 (editor-follows-pm Task 2 fix round 1): ไตรมาสปัจจุบันที่จบตามปฏิทินแล้ว → editor / quarter-ended
//     (opts.now · fixture ทั้งไฟล์ใช้นาฬิกาคงที่ 9 พ.ย. 2026 จาก scripts/sleeve-clock.js)
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
// Addendum ข้อ 5 (editor-follows-pm Task 2 fix round 1): sleeveOf ดู "วันนี้" (opts.now · ไม่ส่ง = Date.now())
//   fixture ด้านล่างปักไตรมาสปัจจุบัน 2026-Q4 → FS = โมดูลที่ล็อกนาฬิกาไว้ 9 พ.ย. 2026 (scripts/sleeve-clock.js) ให้ผลเดิมทุกวันที่รัน
//   รวม hook ใน engines (global.window.ForeignSleeve = FS) · RAW = โมดูลตัวจริง ใช้ในส่วน quarter-ended ที่ส่ง opts.now เอง
var RAW = require("../public/foreign-sleeve.js");
var clock = require("./sleeve-clock");
var FS = clock.withClock(RAW, clock.Q4_2026);
var PP = require("../public/portfolio-position-engine.js");
var PM = require("../public/portfolio-manager-engine.js");
var AP = require("../public/adaptive-position-engine.js");
var AAE = require("../public/asset-allocation-engine.js");

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
  // ตัวตนของแถว Editor (Addendum: แถวที่แทนต้องคงทุกฟิลด์ของแถวหุ้นต่างประเทศแรก)
  var q4 = d.quarters["2026-Q4"].assets;
  q4[1].id = "fx-a"; q4[1].createdAt = "2026-10-01T00:00:00.000Z"; q4[1].note = "บัญชี IB";
  q4[3].id = "fx-b";
  if (cash !== undefined) d.foreignSleeve = { cash: cash, updatedAt: "2026-11-09T01:02:03.000Z" };
  return d;
}
var GROSS = INVESTED + 600000; // 5,350,000

console.log("== ทั่วไป ==");
t("VERSION = fs-4", RAW.VERSION === "fs-4" && FS.VERSION === "fs-4", RAW.VERSION);
t("โหลดใน browser (VM ไม่มี module) → window.ForeignSleeve", (function () {
  var ctx = { window: {} };
  try { vm.runInNewContext(src, ctx); } catch (e) { return false; }
  return !!(ctx.window.ForeignSleeve && ctx.window.ForeignSleeve.VERSION === "fs-4" && typeof ctx.window.ForeignSleeve.applyToSnapshot === "function" &&
    typeof ctx.window.ForeignSleeve.applyToAssets === "function" && typeof ctx.window.ForeignSleeve.latestKeyOf === "function");
})());
t("exports ครบตามสัญญา (+ applyToAssets · latestKeyOf · newRowNameOf)", ["bucketOf", "investedOf", "docOf", "cashOf", "sleeveOf", "latestKeyOf", "newRowNameOf", "applyToAssets", "applyToDoc", "applyToSnapshot"].every(function (k) { return typeof FS[k] === "function"; }));

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

console.log("== latestKeyOf + ไตรมาสล่าสุดเท่านั้น (Addendum ข้อ 4) ==");
t("latestKeyOf: {data: doc} / doc ตรง → คีย์ล่าสุดเมื่อ sort (2026-Q4) ไม่ขึ้นกับลำดับคีย์ในออบเจกต์",
  FS.latestKeyOf({ data: mkDoc(600000) }) === "2026-Q4" && FS.latestKeyOf(mkDoc()) === "2026-Q4" &&
  FS.latestKeyOf({ quarters: { "2027-Q1": {}, "2026-Q4": {}, "2026-Q2": {} } }) === "2027-Q1");
t("latestKeyOf: ไม่สนใจ currentQuarter (currentQuarter 2026-Q3 → ยังได้ 2026-Q4)", (function () { var d = mkDoc(600000); d.currentQuarter = "2026-Q3"; return FS.latestKeyOf(d) === "2026-Q4"; })());
t("latestKeyOf: ไม่มีไตรมาส / quarters ว่าง / ps null / {data:null} → null ไม่ล้ม",
  FS.latestKeyOf({ data: { foreignSleeve: { cash: 5 } } }) === null && FS.latestKeyOf({ quarters: {} }) === null && FS.latestKeyOf(null) === null &&
  FS.latestKeyOf(undefined) === null && FS.latestKeyOf({ data: null }) === null && FS.latestKeyOf({ quarters: "x" }) === null);
var DPQ = mkDoc(600000); DPQ.currentQuarter = "2026-Q3";
var SPQ = FS.sleeveOf({ data: DPQ }, HOLD);
t("currentQuarter 2026-Q3 เก่ากว่าคีย์ล่าสุด 2026-Q4 (กรอก cash + มี holdings) → editor / past-quarter · ตัวเลข null · updatedAt คงไว้",
  SPQ.source === "editor" && SPQ.reason === "past-quarter" && SPQ.invested === null && SPQ.cash === null && SPQ.gross === null && SPQ.investedPct === null &&
  SPQ.updatedAt === "2026-11-09T01:02:03.000Z" && badValues(SPQ).length === 0, SPQ);
t("ลำดับเหตุผล (ปักไว้): no-cash ก่อน no-holdings ก่อน past-quarter", (function () {
  var noCash = mkDoc(); noCash.currentQuarter = "2026-Q3";
  return FS.sleeveOf({ data: noCash }, HOLD).reason === "no-cash" && FS.sleeveOf({ data: noCash }, []).reason === "no-cash" &&
    FS.sleeveOf({ data: DPQ }, []).reason === "no-holdings" && FS.sleeveOf({ data: DPQ }, null).reason === "no-holdings" &&
    FS.sleeveOf({ data: DPQ }, HOLD).reason === "past-quarter";
})());
t("currentQuarter = คีย์ล่าสุด / ไม่อยู่ใน quarters / ไม่มี → pm (ไม่ใช่ past-quarter)", (function () {
  var a = mkDoc(600000), b = mkDoc(600000), c = mkDoc(600000);
  b.currentQuarter = "2027-Q1"; delete c.currentQuarter;
  return FS.sleeveOf(a, HOLD).source === "pm" && FS.sleeveOf(b, HOLD).source === "pm" && FS.sleeveOf(c, HOLD).source === "pm";
})());
t("ไตรมาสเดียว (currentQuarter = คีย์เดียว) → pm · เอกสารไม่มีไตรมาส → pm เหมือนเดิม (applyToDoc ไม่สร้างไตรมาสเอง)", (function () {
  var one = { currentQuarter: "2026-Q4", foreignSleeve: { cash: 1 }, quarters: { "2026-Q4": { assets: [] } } };
  return FS.sleeveOf(one, HOLD).source === "pm" && FS.sleeveOf({ data: { foreignSleeve: { cash: 5 } } }, HOLD).source === "pm";
})());

console.log("== ไตรมาสที่จบตามปฏิทิน (Addendum ข้อ 5 · opts.now) ==");
// เคสจริง: ไตรมาสล่าสุดของเอกสาร = 2026-Q3 (แช่ 30 ก.ย.) แต่เปิดหน้าเดือน พ.ย. → ห้ามเอาค่าวันนี้ไปใส่ไตรมาสที่ปิดแล้ว
var NOV = clock.at(2026, 11, 9), SEP_LAST = clock.at(2026, 9, 30, 23, 59, 59), DEC_LATE = clock.at(2026, 12, 31, 23, 59, 59), JAN1 = clock.at(2027, 1, 1, 0, 0, 0);
function q3Doc(cash) { var d = mkDoc(cash); delete d.quarters["2026-Q4"]; d.currentQuarter = "2026-Q3"; return d; }
var DQE = q3Doc(600000), DQE_JSON = JSON.stringify(DQE);
var SQE = RAW.sleeveOf({ data: DQE }, HOLD, { now: NOV });
t("ไตรมาสล่าสุด 2026-Q3 เปิดดูเดือน พ.ย. 2026 → editor / quarter-ended · ตัวเลข null · updatedAt คงไว้ · ครบ 7 คีย์",
  SQE.source === "editor" && SQE.reason === "quarter-ended" && SQE.invested === null && SQE.cash === null && SQE.gross === null && SQE.investedPct === null &&
  SQE.updatedAt === "2026-11-09T01:02:03.000Z" && badValues(SQE).length === 0 &&
  ["source", "reason", "invested", "cash", "gross", "investedPct", "updatedAt"].every(function (k) { return k in SQE; }), SQE);
var PQE = { data: DQE }, SNQE = { portfolioStatus: PQE, portfolioHoldings: { data: HOLD } };
t("quarter-ended: applyToDoc คืน reference เดิม ({data} และ doc ตรง) · applyToSnapshot คืน snapshot ตัวเดิม (holdings ใน snapshot / ส่งเอง) · input ไม่ถูกแก้",
  RAW.applyToDoc(PQE, HOLD, { now: NOV }) === PQE && RAW.applyToDoc(DQE, HOLD, { now: NOV }) === DQE &&
  RAW.applyToSnapshot(SNQE, undefined, { now: NOV }) === SNQE && RAW.applyToSnapshot(SNQE, HOLD, { now: NOV }) === SNQE && JSON.stringify(DQE) === DQE_JSON);
t("เอกสาร 2026-Q3 วันสุดท้ายของไตรมาส (30 ก.ย. 23:59:59) → pm",
  RAW.sleeveOf(DQE, HOLD, { now: SEP_LAST }).source === "pm" && RAW.applyToDoc(DQE, HOLD, { now: SEP_LAST }).quarters["2026-Q3"].assets.filter(isFromPM).length === 1);
t("เอกสาร 2026-Q4 เดือน พ.ย. → pm (แทนแถวของ 2026-Q4)",
  RAW.sleeveOf(mkDoc(600000), HOLD, { now: NOV }).source === "pm" && RAW.applyToDoc(mkDoc(600000), HOLD, { now: NOV }).quarters["2026-Q4"].assets.filter(isFromPM).length === 1);
t("เอกสาร 2026-Q4 ปลาย ธ.ค. (31 ธ.ค. 23:59:59) → pm", RAW.sleeveOf(mkDoc(600000), HOLD, { now: DEC_LATE }).source === "pm");
t("เอกสาร 2026-Q4 วันแรกของไตรมาสถัดไปพอดี (1 ม.ค. 2027 00:00:00) → quarter-ended · applyToDoc คืนตัวเดิม", (function () {
  var d = mkDoc(600000), s = RAW.sleeveOf(d, HOLD, { now: JAN1 });
  return s.source === "editor" && s.reason === "quarter-ended" && RAW.applyToDoc(d, HOLD, { now: JAN1 }) === d;
})());
t("opts.now เป็น Date ได้ (รวม Date จาก realm อื่น) — ผลเดียวกับ ms", (function () {
  var foreignJan = vm.runInNewContext("new Date(" + JAN1 + ")"), foreignNov = vm.runInNewContext("new Date(" + NOV + ")");
  return RAW.sleeveOf(mkDoc(600000), HOLD, { now: new Date(JAN1) }).reason === "quarter-ended" && RAW.sleeveOf(mkDoc(600000), HOLD, { now: new Date(NOV) }).source === "pm" &&
    RAW.sleeveOf(mkDoc(600000), HOLD, { now: foreignJan }).reason === "quarter-ended" && RAW.sleeveOf(mkDoc(600000), HOLD, { now: foreignNov }).source === "pm";
})());
t("ไตรมาสในอนาคต (currentQuarter 2027-Q1 เป็นคีย์ล่าสุด เปิดดู พ.ย. 2026) → pm", (function () {
  var d = mkDoc(600000); d.quarters["2027-Q1"] = { key: "2027-Q1", assets: [] }; d.currentQuarter = "2027-Q1";
  return RAW.sleeveOf(d, HOLD, { now: NOV }).source === "pm";
})());
// ไม่ส่ง opts (= หน้าเว็บ) → Date.now(): ตัวเทียบคิดคีย์ไตรมาสของวันนี้เองในเทสต์ (เวลาท้องถิ่น)
function calKey(ms) { var dd = new Date(ms); return dd.getFullYear() + "-Q" + (Math.floor(dd.getMonth() / 3) + 1); }
function soloDoc(key) { var d = { currentQuarter: key, foreignSleeve: { cash: 600000 }, quarters: {} }; d.quarters[key] = { key: key, assets: [A("foreign-stock", "US", 1, 100)] }; return d; }
var TODAY_KEY = calKey(Date.now()), LAST_YEAR_KEY = (new Date().getFullYear() - 1) + "-Q" + (Math.floor(new Date().getMonth() / 3) + 1);
t("ไม่ส่ง opts / now ไม่ถูกต้อง (NaN · 'abc' · null · {}) → ใช้ Date.now(): ไตรมาสของวันนี้ (" + TODAY_KEY + ") → pm · ไตรมาสเดียวกันของปีก่อน (" + LAST_YEAR_KEY + ") → quarter-ended",
  [undefined, {}, { now: NaN }, { now: "abc" }, { now: null }, { now: {} }].every(function (o) {
    return RAW.sleeveOf(soloDoc(TODAY_KEY), HOLD, o).source === "pm" && RAW.sleeveOf(soloDoc(LAST_YEAR_KEY), HOLD, o).reason === "quarter-ended";
  }));
t("ลำดับเหตุผล (ปักไว้): no-cash → no-holdings → past-quarter → quarter-ended", (function () {
  var noCash = q3Doc();
  var past = mkDoc(600000); past.currentQuarter = "2026-Q3";   // ดูไตรมาสเก่า และ (ใน ม.ค. 2027) ไตรมาสนั้นจบแล้วด้วย
  return RAW.sleeveOf(noCash, HOLD, { now: JAN1 }).reason === "no-cash" && RAW.sleeveOf(DQE, [], { now: JAN1 }).reason === "no-holdings" &&
    RAW.sleeveOf(past, HOLD, { now: JAN1 }).reason === "past-quarter" && RAW.sleeveOf(DQE, HOLD, { now: JAN1 }).reason === "quarter-ended";
})());
t("คีย์ไตรมาสผิดรูป / เอกสารไม่มีไตรมาส → ไม่นับว่าจบ (pm ตามเดิม · applyToDoc ไม่สร้างไตรมาส)", (function () {
  var bad = { currentQuarter: "abc", foreignSleeve: { cash: 1 }, quarters: { abc: { assets: [] } } };
  var none = { data: { foreignSleeve: { cash: 5 } } };
  return RAW.sleeveOf(bad, HOLD, { now: JAN1 }).source === "pm" && RAW.sleeveOf(none, HOLD, { now: JAN1 }).source === "pm" && RAW.applyToDoc(none, HOLD, { now: JAN1 }) === none;
})());
t("PortfolioPosition.compute บนเอกสาร quarter-ended ผ่านโมดูล = เอกสารดิบ (หุ้นต่างประเทศ Editor 3,800,000 ของ 2026-Q3)", (function () {
  var R = PP.compute(RAW.applyToSnapshot(SNQE, undefined, { now: NOV }), {});
  var b = (R.buckets || []).filter(function (x) { return x.type === "foreign-stock"; })[0];
  return R.available === true && R.quarterKey === "2026-Q3" && !!b && b.gross === 3800000;
})());

console.log("== applyToDoc ==");
var PSW = { data: mkDoc(600000), meta: "keep" };
var beforeW = JSON.stringify(PSW);
var OW = FS.applyToDoc(PSW, HOLD);
var cur = OW && OW.data && OW.data.quarters["2026-Q4"];
var syn = cur && cur.assets.filter(function (a) { return a.fromPM; })[0];
t("pm {data}: คืนรูป {data} · สำเนาใหม่ทุกชั้นที่แก้", OW !== PSW && OW.data !== PSW.data && OW.data.quarters !== PSW.data.quarters && cur !== PSW.data.quarters["2026-Q4"] && cur.assets !== PSW.data.quarters["2026-Q4"].assets && OW.meta === "keep");
t("แถว foreign-stock เดิม 2 แถว → แถวที่แทน 1 แถว", cur.assets.filter(function (a) { return a.type === "foreign-stock"; }).length === 1 && !!syn && cur.assets.length === 4);
t("แถวที่แทนค่าตรง: gross 5,350,000 (manual = snapshot) · investedPercent = invested/gross×100 · fromPM",
  syn.type === "foreign-stock" && syn.manualValue === GROSS && syn.snapshotValue === GROSS && near(syn.investedPercent, INVESTED / GROSS * 100) && syn.fromPM === true, syn);
// Addendum ข้อ 3: ตัวคิดผลตอบแทนจับคู่ข้ามไตรมาสด้วย type::name → แถวที่แทนต้องเป็นแถวเดิม (แถวแรก) ไม่ใช่ชื่อใหม่
var origA = PSW.data.quarters["2026-Q4"].assets[1];
t("แถวที่แทน = สำเนาแถวหุ้นต่างประเทศแรก (US-A): name / id / createdAt / ฟิลด์อื่นคงเดิม · ไม่ใช่ชื่อสังเคราะห์",
  syn.name === "US-A" && syn.id === "fx-a" && syn.createdAt === "2026-10-01T00:00:00.000Z" && syn.note === "บัญชี IB" &&
  JSON.stringify(cur).indexOf("AI Portfolio Manager") < 0, syn);
t("แถวที่แทนเป็น object ใหม่ — แถวเดิมของ input ไม่ถูกแก้ (US-A ยัง 2,500,000 · ไม่มี fromPM)",
  syn !== origA && origA.manualValue === 2500000 && origA.snapshotValue === 2500000 && origA.investedPercent === 90 && !("fromPM" in origA));
t("แถวเดิมไม่มี netFlow เลย → แถวที่แทนไม่มีคีย์ netFlow", !("netFlow" in syn), syn);
// เงินเติม/ถอนของแถวหุ้นต่างประเทศเดิมทุกแถวรวมเข้าแถวที่แทน (Addendum ข้อ 3)
function synOf(d) { var o = FS.applyToDoc(d, HOLD); return (o.data || o).quarters["2026-Q4"].assets.filter(function (a) { return a.fromPM; })[0]; }
function withFlows(fa, fb) {
  var d = mkDoc(600000), q = d.quarters["2026-Q4"].assets;
  if (fa !== undefined) q[1].netFlow = fa;
  if (fb !== undefined) q[3].netFlow = fb;
  return d;
}
t("netFlow: US-A 100,000 + US-B −20,000 → แถวที่แทน netFlow 80,000", synOf(withFlows(100000, -20000)).netFlow === 80000, synOf(withFlows(100000, -20000)));
t("netFlow: มีแถวเดียว (US-B −20,000 · US-A ไม่มีคีย์) → −20,000", synOf(withFlows(undefined, -20000)).netFlow === -20000);
t("netFlow: 0 + ไม่มี → คีย์ netFlow = 0 (มีค่าที่กรอก)", (function () { var s = synOf(withFlows(0)); return "netFlow" in s && s.netFlow === 0; })());
t("netFlow: แถวแรก null / '' + อีกแถวไม่มี → ไม่มีคีย์ netFlow (ไม่ใช่ null)", !("netFlow" in synOf(withFlows(null))) && !("netFlow" in synOf(withFlows("", undefined))));
t("netFlow: NaN / Infinity / 'abc' / true ไม่นับ · สตริงตัวเลข '5000' นับ (กติกา fin ของ AssetAllocation) → 5,000",
  synOf(withFlows(NaN, "5000")).netFlow === 5000 && !("netFlow" in synOf(withFlows(Infinity, "abc"))) && !("netFlow" in synOf(withFlows(true))));
t("netFlow ไม่มี NaN/undefined ในผลลัพธ์ทุกกรณี", [withFlows(100000, -20000), withFlows(NaN, Infinity), withFlows(null, "x")].every(function (d) { return badValues(FS.applyToDoc(d, HOLD)).length === 0; }));
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
// final fix wave [3]: ชื่อแถวใหม่ = ชื่อแถวหุ้นต่างประเทศแรกของไตรมาสก่อน (newRowNameOf) — เดิม "หุ้นต่างประเทศ" เสมอ ต่างจาก Editor
t("ไตรมาสปัจจุบันไม่มีแถว foreign-stock เลย → เพิ่มแถวท้ายรายการ ชื่อตามแถวหุ้นต่างประเทศแรกของไตรมาสก่อน (\"US\") · ไม่มีคีย์ netFlow", (function () {
  var d = mkDoc(600000);
  d.quarters["2026-Q4"].assets = d.quarters["2026-Q4"].assets.filter(function (a) { return a.type !== "foreign-stock"; });
  var o = FS.applyToDoc({ data: d }, HOLD).data.quarters["2026-Q4"].assets;
  return o.length === 4 && o[3].fromPM === true && o[3].manualValue === GROSS && o[3].snapshotValue === GROSS && o[3].type === "foreign-stock" &&
    o[3].name === "US" && !("netFlow" in o[3]) && near(o[3].investedPercent, INVESTED / GROSS * 100) && d.quarters["2026-Q4"].assets.length === 3;
})());
console.log("== final fix wave [3]: newRowNameOf · applyToAssets opts.defaultName · applyToDoc opts.mark ==");
function noForeignQ4(d) { d.quarters["2026-Q4"].assets = d.quarters["2026-Q4"].assets.filter(function (a) { return a.type !== "foreign-stock"; }); return d; }
t("newRowNameOf: ไตรมาสก่อนมีแถวหุ้นต่างประเทศ \"US\" → \"US\" (รับทั้ง {data} และ doc ตรง)", FS.newRowNameOf({ data: mkDoc(600000) }) === "US" && FS.newRowNameOf(mkDoc(600000)) === "US");
t("newRowNameOf: แถวหุ้นต่างประเทศแรกของไตรมาสก่อน (ไม่ใช่แถวที่สอง)", (function () {
  var d = mkDoc(600000); d.quarters["2026-Q3"].assets.push(A("foreign-stock", "EU", 1, 100));
  d.quarters["2026-Q3"].assets.unshift(A("foreign-stock", "Dime", 1, 100));
  return FS.newRowNameOf(d) === "Dime";
})());
t("newRowNameOf: ไตรมาสก่อนไม่มีแถวหุ้นต่างประเทศ / ชื่อว่าง / ไม่มีไตรมาสก่อน / เอกสารว่าง → \"หุ้นต่างประเทศ\"", (function () {
  var a = mkDoc(600000); a.quarters["2026-Q3"].assets = a.quarters["2026-Q3"].assets.filter(function (x) { return x.type !== "foreign-stock"; });
  var b = mkDoc(600000); b.quarters["2026-Q3"].assets[1].name = "";
  var c = mkDoc(600000); delete c.quarters["2026-Q3"];
  return [a, b, c, null, {}, { data: null }].every(function (x) { return FS.newRowNameOf(x) === "หุ้นต่างประเทศ"; });
})());
t("newRowNameOf: อิงไตรมาสปัจจุบัน (currentQuarter) — ดูไตรมาสเก่าอยู่ = ไตรมาสก่อนหน้าของไตรมาสนั้น", (function () {
  var d = mkDoc(600000); d.quarters["2026-Q2"] = { key: "2026-Q2", assets: [A("foreign-stock", "Q2-name", 1, 100)] }; d.currentQuarter = "2026-Q3";
  return FS.newRowNameOf(d) === "Q2-name";
})());
t("applyToAssets opts.defaultName (สตริงไม่ว่าง) → ชื่อแถวใหม่ · ว่าง / ไม่ใช่สตริง → \"หุ้นต่างประเทศ\" · มีแถวเดิม = คงชื่อแถวเดิม", (function () {
  var s = FS.sleeveOf(mkDoc(600000), HOLD);
  var a = FS.applyToAssets([], s, { defaultName: "US" }), b = FS.applyToAssets([], s, { defaultName: "" }), c = FS.applyToAssets([], s, { defaultName: 5 });
  var e = FS.applyToAssets(mkDoc(600000).quarters["2026-Q4"].assets, s, { defaultName: "XX" });
  return a[0].name === "US" && b[0].name === "หุ้นต่างประเทศ" && c[0].name === "หุ้นต่างประเทศ" && e[1].name === "US-A";
})());
t("applyToDoc ใช้ newRowNameOf ตัวเดียวกับที่ Editor เรียก: ชื่อแถวใหม่ === FS.newRowNameOf(doc)", (function () {
  var d = noForeignQ4(mkDoc(600000)); d.quarters["2026-Q3"].assets[1].name = "บัญชี Dime";
  var o = FS.applyToDoc(d, HOLD).quarters["2026-Q4"].assets.filter(function (a) { return a.type === "foreign-stock"; });
  return o.length === 1 && o[0].name === "บัญชี Dime" && o[0].name === FS.newRowNameOf(d);
})());
t("applyToDoc opts.mark === false → แถวที่แทนไม่มี fromPM (ค่าเท่ากับแบบ mark) · ไม่ส่ง = fromPM true · input ไม่ถูกแก้", (function () {
  var d = mkDoc(600000), j = JSON.stringify(d);
  var m = FS.applyToDoc(d, HOLD).quarters["2026-Q4"].assets[1], u = FS.applyToDoc(d, HOLD, { mark: false }).quarters["2026-Q4"].assets[1];
  var cm = {}; Object.keys(m).forEach(function (k) { if (k !== "fromPM") cm[k] = m[k]; });
  return m.fromPM === true && !("fromPM" in u) && JSON.stringify(cm) === JSON.stringify(u) && JSON.stringify(d) === j;
})());
t("applyToDoc mark:false ผ่าน applyToSnapshot ได้ (opts ส่งต่อ) และ quarter-ended ยังคืนตัวเดิม", (function () {
  var snap = { portfolioStatus: { data: mkDoc(600000) }, portfolioHoldings: { data: HOLD } };
  var o = FS.applyToSnapshot(snap, undefined, { mark: false });
  var q3 = mkDoc(600000); delete q3.quarters["2026-Q4"]; q3.currentQuarter = "2026-Q3";
  return !("fromPM" in o.portfolioStatus.data.quarters["2026-Q4"].assets[1]) && FS.applyToDoc(q3, HOLD, { mark: false }) === q3;
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
// E13 — ความคาดหมายเปลี่ยนตาม Addendum ข้อ 4 (editor-follows-pm Task 1 · แทนข้อ E13 ของ final fix wave ที่คาดให้แทนค่าไตรมาสเก่า):
//   currentQuarter เป็นคีย์ที่เก่ากว่าคีย์ล่าสุดเมื่อ sort (มี 2026-Q4 อยู่แล้วแต่ Editor เลือกดู 2026-Q3)
//   → ห้ามเอาค่า PM วันนี้ไปทับประวัติ: sleeveOf = editor / past-quarter · applyToDoc / applyToSnapshot คืนตัวเดิม (reference เดียวกัน)
//   · PortfolioPosition.compute (key = currentQuarter) จึงเห็นค่า Editor ของ 2026-Q3 ตรงกับเอกสารดิบ
function isFromPM(a) { return !!a && a.fromPM === true; }
var DCQ = mkDoc(600000); DCQ.currentQuarter = "2026-Q3";
var beforeCQ = JSON.stringify(DCQ);
var PCQ = { data: DCQ };
t("E13: currentQuarter 2026-Q3 (เก่ากว่า 2026-Q4) → applyToDoc คืน reference เดิม ({data} และ doc ตรง) · ไม่มี fromPM ที่ไหน · input ไม่ถูกแก้",
  FS.applyToDoc(PCQ, HOLD) === PCQ && FS.applyToDoc(DCQ, HOLD) === DCQ && JSON.stringify(DCQ).indexOf("fromPM") < 0 && JSON.stringify(DCQ) === beforeCQ);
var SNAPCQ = { portfolioStatus: { data: DCQ }, portfolioHoldings: { data: HOLD } };
t("E13: applyToSnapshot ไตรมาสเก่า → คืน snapshot ตัวเดิม (holdings ใน snapshot และส่งเอง)", FS.applyToSnapshot(SNAPCQ) === SNAPCQ && FS.applyToSnapshot(SNAPCQ, HOLD) === SNAPCQ);
var RCQ0 = PP.compute(SNAPCQ, {}), RCQ1 = PP.compute(FS.applyToSnapshot(SNAPCQ), {});
function bkOf(R, type) { return (R.buckets || []).filter(function (b) { return b.type === type; })[0]; }
t("E13: PortfolioPosition.compute เท่ากันทั้งดิบ/ผ่านโมดูล: quarterKey 2026-Q3 · foreign-stock = Editor 3,800,000 (แถว US) · total 18,800,000",
  RCQ0.available === true && RCQ1.available === true && RCQ0.quarterKey === "2026-Q3" && RCQ1.quarterKey === "2026-Q3" &&
  bkOf(RCQ1, "foreign-stock").gross === 3800000 && bkOf(RCQ1, "foreign-stock").quarterAssets.length === 1 && bkOf(RCQ1, "foreign-stock").quarterAssets[0].name === "US" &&
  RCQ0.totals.total === 18800000 && RCQ1.totals.total === 18800000,
  [RCQ0.quarterKey, RCQ1.quarterKey, RCQ0.totals && RCQ0.totals.total, RCQ1.totals && RCQ1.totals.total, bkOf(RCQ1, "foreign-stock") && bkOf(RCQ1, "foreign-stock").gross]);
t("E13: เลือกกลับมาที่ไตรมาสล่าสุด (2026-Q4) → pm อีกครั้ง (แทนแถวของ 2026-Q4)", (function () {
  var d = mkDoc(600000); d.currentQuarter = "2026-Q4";
  var o = FS.applyToDoc(d, HOLD);
  return o !== d && o.quarters["2026-Q4"].assets.filter(isFromPM).length === 1 && o.quarters["2026-Q3"] === d.quarters["2026-Q3"];
})());
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

console.log("== applyToAssets (แกนกลาง · Task 2 ใช้ mark:false) ==");
var AS_DOC = mkDoc(600000), AS_IN = AS_DOC.quarters["2026-Q4"].assets;
AS_IN[1].netFlow = 100000; AS_IN[3].netFlow = -20000;
var AS_BEFORE = JSON.stringify(AS_IN), AS_S = FS.sleeveOf(AS_DOC, HOLD);
var AS1 = FS.applyToAssets(AS_IN, AS_S), AS0 = FS.applyToAssets(AS_IN, AS_S, { mark: false });
t("คืน array ใหม่ · input (array + ทุกแถว) ไม่ถูกแก้ · แถวอื่น reference เดิม ลำดับเดิม",
  Array.isArray(AS1) && AS1 !== AS_IN && JSON.stringify(AS_IN) === AS_BEFORE && AS1.length === 4 &&
  AS1[0] === AS_IN[0] && AS1[2] === AS_IN[2] && AS1[3] === AS_IN[4] && AS1[1] !== AS_IN[1]);
t("ค่าตรงกับ applyToDoc: US-A (id fx-a) · gross · investedPercent · netFlow 80,000 · fromPM true",
  AS1[1].name === "US-A" && AS1[1].id === "fx-a" && AS1[1].manualValue === GROSS && AS1[1].snapshotValue === GROSS &&
  near(AS1[1].investedPercent, INVESTED / GROSS * 100) && AS1[1].netFlow === 80000 && AS1[1].fromPM === true &&
  JSON.stringify(AS1[1]) === JSON.stringify(synOf(withFlows(100000, -20000))), AS1[1]);
t("opts.mark === false → ไม่มีคีย์ fromPM (ค่าอื่นเท่ากัน)",
  !("fromPM" in AS0[1]) && AS0[1].name === "US-A" && AS0[1].manualValue === GROSS && AS0[1].netFlow === 80000 && AS0.length === 4 && JSON.stringify(AS_IN) === AS_BEFORE, AS0[1]);
t("mark:false ลบ fromPM ที่ติดมากับแถวเดิมด้วย (กันแถวที่ถูกแปลงแล้วถูกส่งเข้ามาซ้ำแล้วหลุดไป PUT)", (function () {
  var again = FS.applyToAssets(AS1, AS_S, { mark: false });
  return !("fromPM" in again[1]) && again[1].name === "US-A" && again[1].netFlow === 80000 && AS1[1].fromPM === true;
})());
t("opts อื่น ๆ (ไม่ส่ง / {} / mark true / mark 0) → ใส่ fromPM", [undefined, {}, { mark: true }, { mark: 0 }].every(function (o) { return FS.applyToAssets(AS_IN, AS_S, o)[1].fromPM === true; }));
t("assets ไม่ใช่ array (null / undefined / {}) → [แถว \"หุ้นต่างประเทศ\" แถวเดียว]", [null, undefined, {}].every(function (x) {
  var o = FS.applyToAssets(x, AS_S);
  return Array.isArray(o) && o.length === 1 && o[0].type === "foreign-stock" && o[0].name === "หุ้นต่างประเทศ" && o[0].manualValue === GROSS && !("netFlow" in o[0]);
}));
t("sleeve ไม่ใช่โหมด pm / null → คืน assets ตัวเดิม (reference เดียวกัน)",
  FS.applyToAssets(AS_IN, FS.sleeveOf(mkDoc(), HOLD)) === AS_IN && FS.applyToAssets(AS_IN, null) === AS_IN && FS.applyToAssets(AS_IN, { source: "pm", gross: NaN, invested: 1 }) === AS_IN);
t("แถวที่ไม่ใช่ object ใน assets (null) คงไว้ตามเดิม ไม่ล้ม", (function () {
  var o = FS.applyToAssets([null, A("foreign-stock", "X", 1, 100)], AS_S);
  return o.length === 2 && o[0] === null && o[1].name === "X" && o[1].manualValue === GROSS;
})());

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
t("ส่วน foreign-stock มี quarterAsset เดียว = แถวที่แทน (ชื่อแถวเดิม US-A)", bk(R1, "foreign-stock").quarterAssets.length === 1 && bk(R1, "foreign-stock").quarterAssets[0].name === "US-A");

console.log("== ความต่อเนื่องของผลตอบแทน (AssetAllocation.compute จริง · Addendum ข้อ 2–3) ==");
// ไตรมาสก่อน (แช่แล้ว) มี "หุ้นต่างประเทศ" 4,000,000 · ไตรมาสนี้ใน Editor แยกเป็น "หุ้นต่างประเทศ" 2.5 ล้าน (เติม 100,000)
//   + "ETF" 1.5 ล้าน (ถอน 20,000) · ทุกแถวกรอก netFlow (แถวอื่น = 0) · cash 600,000 → แถวที่แทน "หุ้นต่างประเทศ" 5,350,000 netFlow 80,000
// ตัวคิดผลตอบแทนต้องเห็นรายการเดิมต่อเนื่อง: ไม่ประมาณเงินเติม (imputed) · ไม่มีรายการหาย · ไม่มีรายการใหม่ netFlow 0
// และเงินเติมไตรมาสนี้ = 80,000 จากแถวหุ้นต่างประเทศ (แถวอื่น 0)
function N(type, name, value, inv, nf) { var a = A(type, name, value, inv); if (nf !== undefined) a.netFlow = nf; return a; }
function contDoc(curForeign) {
  return {
    currentQuarter: "2026-Q4", foreignSleeve: { cash: 600000, updatedAt: "2026-11-09T01:02:03.000Z" },
    quarters: {
      "2026-Q3": { key: "2026-Q3", assets: [N("bitcoin", "Bitcoin", 9000000, 78, 0), N("foreign-stock", "หุ้นต่างประเทศ", 4000000, 90, 0), N("thai-stock", "หุ้นไทย", 4000000, 88, 0), N("cash", "เงินสด", 2000000, 0, 0)] },
      "2026-Q4": { key: "2026-Q4", assets: [N("bitcoin", "Bitcoin", 10000000, 78, 0)].concat(curForeign, [N("thai-stock", "หุ้นไทย", 4500000, 88, 0), N("cash", "เงินสด", 2100000, 0, 0)]) }
    }
  };
}
var CONT_ALLOC = { version: 1, map: { "foreign-stock::หุ้นต่างประเทศ": { long: 100 }, "bitcoin::Bitcoin": { long: 100 }, "thai-stock::หุ้นไทย": { mid: 100 }, "cash::เงินสด": { short: 100 } }, ports: {}, retirement: {} };
function wholeQ4(doc) { var o = AAE.compute({ data: doc }, CONT_ALLOC); return o && o.available ? o.record.whole.rows.filter(function (r) { return r.key === "2026-Q4"; })[0] : null; }
function longQ4(doc) { var o = AAE.compute({ data: doc }, CONT_ALLOC); return o && o.available ? o.ports.long.quarters.filter(function (q) { return q.key === "2026-Q4"; })[0] : null; }
var CONT = contDoc([N("foreign-stock", "หุ้นต่างประเทศ", 2500000, 90, 100000), N("foreign-stock", "ETF", 1500000, 90, -20000)]);
var CONT_T = FS.applyToDoc({ data: CONT }, HOLD).data;
var CW = wholeQ4(CONT_T), CL = longQ4(CONT_T);
t("แปลงแล้ว: ไตรมาสนี้มีแถวหุ้นต่างประเทศเดียว ชื่อเดิม \"หุ้นต่างประเทศ\" 5,350,000 netFlow 80,000",
  CONT_T.quarters["2026-Q4"].assets.filter(function (a) { return a.type === "foreign-stock"; }).length === 1 &&
  CONT_T.quarters["2026-Q4"].assets[1].name === "หุ้นต่างประเทศ" && CONT_T.quarters["2026-Q4"].assets[1].manualValue === GROSS && CONT_T.quarters["2026-Q4"].assets[1].netFlow === 80000);
t("record.whole ไตรมาสนี้: ไม่มีเงินเติมที่ประมาณเอง (imputedFlow 0) · flowSource recorded · flow = 80,000 (netFlow ที่คงไว้)",
  !!CW && CW.imputedFlow === 0 && CW.flowSource === "recorded" && CW.flow === 80000 && CW.recordedFlow === 80000, CW && [CW.imputedFlow, CW.flowSource, CW.flow]);
t("record.whole ไตรมาสนี้: มูลค่าต้นงวด 19,000,000 → ปลายงวด 21,950,000 (หุ้นต่างประเทศจาก PM)", !!CW && CW.vStart === 19000000 && CW.vEnd === 21950000, CW && [CW.vStart, CW.vEnd]);
t("พอร์ตยาว (หุ้นต่างประเทศ + Bitcoin) ไตรมาสนี้: imputed / disappeared / newZero ว่างทั้งหมด · flow 80,000",
  !!CL && CL.imputed.length === 0 && CL.disappeared.length === 0 && CL.newZero.length === 0 && CL.flow === 80000, CL && [CL.imputed, CL.disappeared, CL.newZero, CL.flow]);
// ตัวเทียบ (ยืนยันว่าเทสต์จับบั๊กได้): แถวชื่อใหม่แบบเดิม ("หุ้นต่างประเทศ · AI Portfolio Manager" ไม่มี netFlow) → ตัวคิดเห็น "ขายของเก่า ซื้อของใหม่"
var OLDSTYLE = contDoc([{ type: "foreign-stock", name: "หุ้นต่างประเทศ · AI Portfolio Manager", manualValue: GROSS, snapshotValue: GROSS, investedPercent: INVESTED / GROSS * 100, fromPM: true }]);
var OW2 = wholeQ4(OLDSTYLE), OL2 = longQ4(OLDSTYLE);
t("ตัวเทียบ: ถ้าแถวที่แทนเปลี่ยนชื่อ → imputedFlow 5,350,000 และ \"หุ้นต่างประเทศ\" หายจากพอร์ตยาว (บั๊กที่ Addendum ข้อ 3 กัน)",
  !!OW2 && OW2.imputedFlow === GROSS && !!OL2 && OL2.disappeared.length === 1 && OL2.disappeared[0].name === "หุ้นต่างประเทศ", OW2 && [OW2.imputedFlow, OL2 && OL2.disappeared]);
// ไตรมาสนี้ไม่มีแถวหุ้นต่างประเทศใน Editor เลย → แถวที่เพิ่มชื่อ "หุ้นต่างประเทศ" (= ป้ายประเภทของ AssetAllocation) ต่อกับไตรมาสก่อนได้
var CONT_N = FS.applyToDoc(contDoc([]), HOLD), CWN = wholeQ4(CONT_N), CLN = longQ4(CONT_N);
t("ไม่มีแถวเดิม → แถว \"หุ้นต่างประเทศ\" ต่อกับไตรมาสก่อน: imputedFlow 0 · ไม่มีรายการหาย/ใหม่ในพอร์ตยาว",
  !!CWN && CWN.imputedFlow === 0 && CWN.vEnd === 21950000 && !!CLN && CLN.imputed.length === 0 && CLN.disappeared.length === 0 && CLN.newZero.length === 0,
  CWN && [CWN.imputedFlow, CWN.flowSource, CLN && CLN.disappeared]);
t("AssetAllocation บนเอกสารแปลง: ไม่มี NaN/undefined/Infinity ใน record.whole", badValues(AAE.compute({ data: CONT_T }, CONT_ALLOC).record.whole).length === 0);

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
global.window = { ForeignSleeve: FS };
var QBP = PM.quarterlyBuckets({ portfolioStatus: { data: DCQ }, portfolioHoldings: { data: HOLD } });
delete global.window;
t("มี window.ForeignSleeve แต่ Editor เลือกดูไตรมาสเก่า (past-quarter) → ค่า Editor ของไตรมาสนั้น (US 3,800,000)", QBP["foreign-stock"] === 3800000 && QBP.bitcoin === 9000000, QBP);
// hook ไม่ส่ง opts (= Date.now() บนหน้าจริง) → นาฬิกาของ window.ForeignSleeve ตัดสิน: 1 ม.ค. 2027 ไตรมาส 2026-Q4 จบแล้ว → ค่า Editor
global.window = { ForeignSleeve: clock.withClock(RAW, JAN1) };
var QBQE = PM.quarterlyBuckets(SNAPQ);
delete global.window;
t("hook ใน PMEngine: ไตรมาส 2026-Q4 จบแล้วตามปฏิทิน (quarter-ended) → ค่า Editor 4,000,000", QBQE["foreign-stock"] === 4000000, QBQE);

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
// thesis.html โหลดโมดูลก่อน portfolio-core.js มาตั้งแต่ fs-1 (โมดูลไม่พึ่ง PortfolioCore) → ตรวจลำดับเฉพาะ 7 หน้า · เวอร์ชันตรวจทั้ง 9 หน้า
// (index.html = Quarterly Editor โหลดโมดูลก่อน app.js ตั้งแต่ editor-follows-pm Task 2)
t("ทั้ง 7 หน้าโหลด /foreign-sleeve.js?v=20261109-fs-4 หลัง data-snapshot.js (+ portfolio-core.js) และก่อน engine/page ที่ใช้ · 9 หน้า (รวม thesis.html + index.html) เป็น fs-4 ไม่เหลือเวอร์ชันเก่า", (function () {
  var pages = ["portfolio-manager.html", "portfolio.html", "home.html", "action-center.html", "accumulation-center.html", "asset.html", "adaptive-position.html"];
  var users = ["portfolio-manager-engine.js", "adaptive-position-engine.js", "portfolio-position-engine.js", "portfolio-position-page.js", "mission-control-page.js", "action-center-page.js", "accumulation-page.js", "thesis-reconcile.js", "portfolio-manager-page.js", "asset-page.js"];
  var bad = [];
  pages.forEach(function (p) {
    var s = fs.readFileSync(path.join(PUB, p), "utf8");
    var tag = '<script src="/foreign-sleeve.js?v=20261109-fs-4"></script>';
    var at = s.indexOf(tag);
    if (at < 0 || s.indexOf(tag, at + 1) >= 0) { bad.push(p + ": tag"); return; }
    var snapAt = s.indexOf("/data-snapshot.js"), coreAt = s.indexOf("/portfolio-core.js");
    if (snapAt < 0 || snapAt > at) bad.push(p + ": ก่อน data-snapshot");
    if (coreAt >= 0 && coreAt > at) bad.push(p + ": ก่อน portfolio-core");
    users.forEach(function (u) { var ua = s.indexOf("/" + u); if (ua >= 0 && ua < at) bad.push(p + ": หลัง " + u); });
  });
  var loaders = 0;
  fs.readdirSync(PUB).filter(function (f) { return /\.html$/.test(f); }).forEach(function (f) {
    var s = fs.readFileSync(path.join(PUB, f), "utf8");
    if (s.indexOf("/foreign-sleeve.js?v=") < 0) return;
    loaders++;
    if (s.indexOf("/foreign-sleeve.js?v=20261109-fs-4") < 0) bad.push(f + ": เวอร์ชันเก่า");
  });
  if (loaders !== 9) bad.push("หน้าที่โหลดโมดูล " + loaders + " หน้า (คาด 9)");
  if (bad.length) console.log("    " + bad.join(" · "));
  return bad.length === 0;
})());

finish();
