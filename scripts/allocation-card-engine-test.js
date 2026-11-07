"use strict";
// ============================================================
// Asset allocation card — เอนจิน (public/allocation-card-engine.js) — เทสต์คิดมือ
//   node scripts/allocation-card-engine-test.js
//
// R สร้างจากเอนจินจริง PortfolioPosition.compute (ตัวเดียวกับส่วนหัวของหน้า /portfolio)
// ล็อก: ตัวเลขภาพรวมต้องเท่ากับ R.totals เป๊ะ · ก้อนอ่านจาก R.buckets เท่านั้น
//   · หุ้นนอก = foreign-stock · กองทุนหุ้น = provident-fund (แท่งแยก) · RMF = จัง + ตุ๋ม · custom นับแต่ไม่มีแท่ง
//   · แกนปัดขึ้น 1/2/2.5/5 × 10^k · แถบเงินสดเทียบ cashEditor กับกรอบ · ไม่มี NaN/undefined
//   · ES5 · ป้ายไทย · ไม่มีคำแนะนำซื้อขาย
// ============================================================
var fs = require("fs");
var path = require("path");

var PUB = path.join(__dirname, "..", "public");
var ENGINE = path.join(PUB, "allocation-card-engine.js");

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
// อ่านซอร์สแบบไม่ล้ม — ให้ขั้น RED ล้มที่ require ด้วย "Cannot find module" ตามแผน
var src = (function () { try { return fs.readFileSync(ENGINE, "utf8"); } catch (e) { return ""; } })();
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

// ---------- fixture: R จากเอนจินจริง ----------
var PP = require("../public/portfolio-position-engine.js");
// thai-stock 88% (ไม่ใช่ 90%) ให้ผลรวมรอซื้อ 3.14 ล้าน — เลี่ยงค่า x.x5 ที่ toFixed(1) ปัดไม่แน่นอน
var FIX = { currentQuarter: "2026-Q3", quarters: { "2026-Q3": { key: "2026-Q3", assets: [
  A("bitcoin", "Bitcoin", 10000000, 78),
  A("foreign-stock", "US", 4000000, 90),
  A("provident-fund", "PVD", 1000000, 100),
  A("rmf-jang", "RMF-จัง", 1500000, 100),
  A("rmf-tum", "RMF-ตุ๋ม", 1400000, 100),
  A("thai-stock", "หุ้นไทย", 4500000, 88),
  A("cash", "เงินสด", 2100000, 0),
  A("custom", "อื่นๆ", 500000, 100)
] } } };
var R = PP.compute({ portfolioStatus: { data: FIX }, portfolioHoldings: { data: [] } }, {});

// ---------- เทสต์ตามแผน (คำต่อคำ) ----------
var AC = require("../public/allocation-card-engine.js");
var M = AC.compute(R, AC.normalizePlan(null));
t("available with quarter key", M.available === true && M.quarterKey === "2026-Q3");
t("wealth / invested / cashTotal equal the hero totals (R.totals) exactly", M.wealth === R.totals.total && M.invested === R.totals.investedSum && M.cashTotal === R.totals.cashSum && M.wealth === 25000000);
t("invested 19.76M = sum of invested parts incl. provident + custom", Math.abs(M.invested - 19760000) < 1e-6);
t("cashEditor 2.1M · waitSum 3.14M · cashTotal 5.24M", M.cashEditor === 2100000 && Math.abs(M.waitSum - 3140000) < 1e-6 && Math.abs(M.cashTotal - 5240000) < 1e-6);
var C = {}; M.classes.forEach(function (c) { C[c.key] = c; });
// wealthPct = ทั้งแท่ง (ลงทุนแล้ว + รอซื้อ) ÷ ความมั่งคั่ง (ผู้ใช้สั่ง 2026-11-07 หลัง implement — เดิม held ÷ wealth: 31.2 / 14.4 / 15.84)
t("Bitcoin held 7.8M (78% of class) · wait 2.2M (22%) · whole bar 40% of wealth", Math.abs(C.bitcoin.held - 7800000) < 1e-6 && Math.abs(C.bitcoin.wait - 2200000) < 1e-6 && Math.abs(C.bitcoin.heldPct - 78) < 1e-9 && Math.abs(C.bitcoin.waitPct - 22) < 1e-9 && Math.abs(C.bitcoin.wealthPct - 40) < 1e-9);
t("foreign class = foreign-stock only: held 3.6M · wait 0.4M · total 4.0M · 90% / 10% · whole bar 16% of wealth", Math.abs(C.foreign.held - 3600000) < 1e-6 && Math.abs(C.foreign.wait - 400000) < 1e-6 && Math.abs(C.foreign.total - 4000000) < 1e-6 && Math.abs(C.foreign.heldPct - 90) < 1e-9 && Math.abs(C.foreign.waitPct - 10) < 1e-9 && Math.abs(C.foreign.wealthPct - 16) < 1e-9);
t("pvd class (กองทุนหุ้น) = provident-fund: held 1.0M · no wait · 100% · 4% of wealth", C.pvd.label === "กองทุนหุ้น" && Math.abs(C.pvd.held - 1000000) < 1e-6 && C.pvd.wait === 0 && C.pvd.heldPct === 100 && C.pvd.waitPct === 0 && Math.abs(C.pvd.wealthPct - 4) < 1e-9 && C.pvd.empty === false);
t("RMF = jang + tum 2.9M · no wait → heldPct 100, waitPct 0 · 11.6% of wealth", Math.abs(C.rmf.held - 2900000) < 1e-6 && C.rmf.wait === 0 && C.rmf.heldPct === 100 && C.rmf.waitPct === 0 && C.rmf.empty === false && Math.abs(C.rmf.wealthPct - 11.6) < 1e-9);
t("thai held 3.96M · wait 0.54M · 88/12 · whole bar 18% of wealth", Math.abs(C.thai.held - 3960000) < 1e-6 && Math.abs(C.thai.wait - 540000) < 1e-6 && Math.abs(C.thai.heldPct - 88) < 1e-9 && Math.abs(C.thai.waitPct - 12) < 1e-9 && Math.abs(C.thai.wealthPct - 18) < 1e-9);
// ฐานเดียวกันทั้งการ์ด: ทุกก้อน (ทั้งแท่ง) + เงินสดใน Editor + อื่น ๆ (ลงทุน + รอซื้อ) = ความมั่งคั่งทั้งก้อน
t("Σ classes.wealthPct + cashEditor/wealth + others(held+wait)/wealth = 100", (function () {
  var s = 0; M.classes.forEach(function (c) { s += c.wealthPct; });
  s += M.cashEditor / M.wealth * 100 + (M.others.held + M.others.wait) / M.wealth * 100;
  return Math.abs(s - 100) < 1e-9;
})());
t("others (custom) counted but no bar", M.others.held === 500000 && M.others.wait === 0 && M.classes.length === 5);
t("class order fixed: bitcoin, foreign, pvd, rmf, thai", M.classes.map(function (c) { return c.key; }).join() === "bitcoin,foreign,pvd,rmf,thai");
t("axis max 10M with 5 ticks", M.axis.max === 10000000 && M.axis.ticks.join() === "0,2500000,5000000,7500000,10000000");
t("cash band default 1–3M · now 2.1M within · scaleMax 4M", M.cashBand.min === 1000000 && M.cashBand.max === 3000000 && M.cashBand.now === 2100000 && M.cashBand.status === "within" && M.cashBand.scaleMax === 4000000);
t("band below / above", AC.compute(R, AC.normalizePlan({ cashBand: { min: 2500000, max: 3000000 } })).cashBand.status === "below" && AC.compute(R, AC.normalizePlan({ cashBand: { min: 500000, max: 1000000 } })).cashBand.status === "above");
t("scaleMax follows now when now > max×4/3", AC.compute(R, AC.normalizePlan({ cashBand: { min: 500000, max: 1000000 } })).cashBand.scaleMax === 2100000 * 1.1);
t("normalizePlan: bad shapes → defaults", JSON.stringify(AC.normalizePlan({ cashBand: { min: 5, max: 1 } }).cashBand) === JSON.stringify(AC.DEFAULT_BAND) && JSON.stringify(AC.normalizePlan({ cashBand: { min: "x", max: null } }).cashBand) === JSON.stringify(AC.DEFAULT_BAND) && AC.normalizePlan(undefined).updatedAt === null);
t("normalizePlan keeps a valid band and updatedAt", (function () { var p = AC.normalizePlan({ cashBand: { min: 0, max: 2000000 }, updatedAt: "2026-11-07T00:00:00.000Z" }); return p.cashBand.min === 0 && p.cashBand.max === 2000000 && p.updatedAt === "2026-11-07T00:00:00.000Z"; })());
// ขอบ: ไม่มีไตรมาส · ก้อนว่าง · investedPercent ผิดชนิด
t("R.available false → available false with reason", (function () { var m = AC.compute({ available: false, reason: "no-quarterly" }, AC.normalizePlan(null)); return m.available === false && m.reason === "no-quarterly"; })());
var R2 = PP.compute({ portfolioStatus: { data: { currentQuarter: "2026-Q3", quarters: { "2026-Q3": { key: "2026-Q3", assets: [A("cash","เงินสด",500000,0), A("thai-stock","หุ้นไทย",0,50), A("bitcoin","Bitcoin",1000000,"abc")] } } } }, portfolioHoldings: { data: [] } }, {});
var M2 = AC.compute(R2, AC.normalizePlan(null));
t("empty classes flagged, in-bar pct null, wealthPct 0 (an empty class is 0% of wealth), no NaN anywhere", M2.classes.filter(function (c) { return c.empty; }).length === 4 && M2.classes.filter(function (c) { return c.empty; }).every(function (c) { return c.heldPct === null && c.waitPct === null && c.wealthPct === 0; }) && !/NaN|undefined|Infinity/.test(JSON.stringify(M2)));
// ความมั่งคั่ง 0 → wealthPct null (ไม่หารด้วยศูนย์) แม้ก้อนไม่ว่าง
t("wealth 0 → wealthPct null for a non-empty class", (function () {
  var m = AC.compute({ available: true, totals: { total: 0, investedSum: 0, cashSum: 0 }, buckets: [{ type: "bitcoin", invested: 1000, cash: 0 }] }, AC.normalizePlan(null));
  return m.classes[0].empty === false && m.classes[0].wealthPct === null && !/NaN|Infinity/.test(JSON.stringify(m));
})());
t("bad investedPercent ('abc') is treated as 0 invested like the hero does (bitcoin all wait)", (function () { var b = M2.classes[0]; return b.key === "bitcoin" && b.held === 0 && b.wait === 1000000 && b.waitPct === 100; })());
t("ES5 + Thai labels + no advisory words in the engine", es5ok("allocation-card-engine.js") && /หุ้นต่างประเทศ/.test(src) && !/ควรซื้อ|ควรขาย|น่าซื้อ|น่าขาย|น่าเข้า|แนะนำซื้อ|จุดเข้า|ตัดขาดทุน|\b(Buy|Sell)\b/.test(src));

// ---------- เพิ่มเติมจากแผน ----------
// validBand (export — หน้าใช้ตรวจก่อนบันทึก): กติกาเดียวกับ normalizePlan · ผ่าน → { min, max } · ไม่ผ่าน → null
t("validBand: finite ≥ 0 and min ≤ max → {min,max}; anything else → null",
  JSON.stringify(AC.validBand({ min: 0, max: 0 })) === '{"min":0,"max":0}' && JSON.stringify(AC.validBand({ min: 1000000, max: 3000000 })) === '{"min":1000000,"max":3000000}' &&
  AC.validBand({ min: 5, max: 1 }) === null && AC.validBand({ min: -1, max: 2 }) === null && AC.validBand({ min: 1, max: Infinity }) === null &&
  AC.validBand({ min: NaN, max: 2 }) === null && AC.validBand({ min: "1", max: 2 }) === null && AC.validBand(null) === null && AC.validBand(undefined) === null && AC.validBand(5) === null);
// ขอบกรอบ: เงินสดเท่ากับขอบพอดี = ในกรอบ (สเปก: now < min → below · now > max → above · ไม่งั้น within)
//   mutant "now <= band.min" รอดชุดตามแผนได้ เพราะไม่มีเคสไหนวางเงินสดบนขอบ
t("cash exactly on the band edge is within", AC.compute(R, AC.normalizePlan({ cashBand: { min: 2100000, max: 2100000 } })).cashBand.status === "within");
// กรอบ 0–0 + ไม่มีเงินสด → สูตร scaleMax ได้ 0 (หน้าจะหารด้วยศูนย์) · เอนจินใช้ 1,000,000 แทน แบบเดียวกับแกน
t("band 0–0 with no cash keeps scaleMax > 0", (function () { var m = AC.compute(R2, AC.normalizePlan({ cashBand: { min: 0, max: 0 } })); var R3 = PP.compute({ portfolioStatus: { data: { currentQuarter: "2026-Q3", quarters: { "2026-Q3": { key: "2026-Q3", assets: [A("bitcoin","Bitcoin",1000,100)] } } } }, portfolioHoldings: { data: [] } }, {}); var m3 = AC.compute(R3, AC.normalizePlan({ cashBand: { min: 0, max: 0 } })); return m.cashBand.status === "above" && m3.cashBand.now === 0 && m3.cashBand.status === "within" && m3.cashBand.scaleMax === 1000000; })());

finish();
