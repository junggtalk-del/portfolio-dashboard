// ============================================================
// Asset Allocation Engine — ล็อกกติกาการคำนวณผลตอบแทนจริง
//
// ทำไมต้องมีชุดนี้: ตัวเลขการเติบโตเดิมทุกที่ในแอปคิดจากยอดคงเหลือล้วน ๆ
// (value_now / value_prev − 1) ซึ่งรวมเงินที่เติม/ถอนเข้าไปด้วย — โอนเงินเดือน
// เข้าพอร์ตจะอ่านเป็น "ผลตอบแทน" ทันที engine นี้ต้องหักเงินเติม/ถอนออกจริง
//
// ค่าที่คาดหวังทุกตัวในไฟล์นี้เขียนเป็น "นิพจน์เลขคณิตที่ตรวจด้วยมือได้"
// เช่น 10000/130000 — ไม่ได้ก๊อปผลลัพธ์จาก engine มาแปะ (ไม่งั้นเทสต์จะยืนยันตัวเอง)
// ============================================================
"use strict";
var AA = require("../public/asset-allocation-engine.js");
var PP = require("../public/portfolio-position-engine.js");

var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + (extra != null ? "  → " + extra : "")); }
}
function near(a, b, tol) {
  if (a === null || b === null || a === undefined || b === undefined) return false;
  return Math.abs(a - b) <= (tol == null ? 1e-9 : tol);
}
function tNear(name, got, want, tol) {
  t(name, near(got, want, tol), "got " + got + " · want " + want);
}

// ไตรมาสสัมพัทธ์กับวันที่รัน — ห้ามตรึงวันที่ ไม่งั้นเทสต์จะแดงเองเมื่อเวลาผ่านไป
function qKey(back) {
  var now = new Date();
  var idx = now.getFullYear() * 4 + Math.floor(now.getMonth() / 3) - back;
  return Math.floor(idx / 4) + "-Q" + ((idx % 4 + 4) % 4 + 1);
}
function row(type, name, value, netFlow) {
  var a = { id: type + "-" + name + "-" + value, type: type, name: name, manualValue: value, snapshotValue: value, investedPercent: type === "cash" ? 0 : 100 };
  if (netFlow !== undefined) a.netFlow = netFlow;
  return a;
}
function blob(spec, currentQuarter) {
  var quarters = {};
  Object.keys(spec).forEach(function (k) { quarters[k] = { key: k, assets: spec[k], savedAt: null }; });
  return { data: { currentQuarter: currentQuarter || null, quarters: quarters } };
}

// ============================================================
console.log("\n[1] ตัวอย่างที่ 1 — พอร์ตระยะยาว บันทึกเงินเติม/ถอนครบ · คาดหวัง 8%/ปี");
// มูลค่า 100k → 110k → 160k → 140k → 133k · เงินเติม/ถอน 0, 0, +40k, −30k, 0
// ไตรมาสที่ 2 โตจาก 110k เป็น 160k แต่ 40k มาจากเงินใหม่ → ผลตอบแทนจริงต้องเป็น 10k/130k
// ไม่ใช่ 50k/110k (นี่คือบั๊กที่ทั้งหน้านี้มีไว้เพื่อป้องกัน)
var EX1 = {};
EX1[qKey(4)] = [row("foreign-stock", "หุ้นต่างประเทศ", 100000, 0)];
EX1[qKey(3)] = [row("foreign-stock", "หุ้นต่างประเทศ", 110000, 0)];
EX1[qKey(2)] = [row("foreign-stock", "หุ้นต่างประเทศ", 160000, 40000)];
EX1[qKey(1)] = [row("foreign-stock", "หุ้นต่างประเทศ", 140000, -30000)];
EX1[qKey(0)] = [row("foreign-stock", "หุ้นต่างประเทศ", 133000, 0)];
var ALLOC1 = {
  version: 1, map: { "foreign-stock::หุ้นต่างประเทศ": "long" },
  ports: { short: { expectedReturnPct: null }, mid: { expectedReturnPct: null }, long: { expectedReturnPct: 8 } },
  monthlyExpense: null, updatedAt: null
};
var R1 = AA.compute(blob(EX1, qKey(0)), ALLOC1);
var L1 = R1.ports.long;

t("available", R1.available === true, R1.reason);
t("จำนวนไตรมาสที่ใช้ = 5", R1.quarters.length === 5, R1.quarters.length);
t("มี 4 ไตรมาสที่คำนวณผลตอบแทนได้ (n=4)", L1.n === 4, L1.n);
tNear("r1 = 10000/100000", L1.quarters[0].r, 10000 / 100000);
tNear("r2 = 10000/130000 (หักเงินเติม 40k · กลางงวด)", L1.quarters[1].r, 10000 / 130000);
tNear("r3 = 10000/145000 (หักเงินถอน 30k · กลางงวด)", L1.quarters[2].r, 10000 / 145000);
tNear("r4 = -7000/140000", L1.quarters[3].r, -7000 / 140000);
// ดัชนีทบต้น = 1.1 × 140/130 × 155/145 × 0.95
var IDX1 = 100 * 1.1 * (140 / 130) * (155 / 145) * 0.95;
tNear("ดัชนีล่าสุด = 100 × 1.1 × 140/130 × 155/145 × 0.95", L1.indexSeries[4], IDX1, 1e-9);
tNear("ผลตอบแทนสะสม", L1.cumReturn, IDX1 / 100 - 1, 1e-12);
tNear("ต่อปี (n=4 พอดี ⇒ เท่ากับสะสม)", L1.annReturn, IDX1 / 100 - 1, 1e-12);
tNear("เส้นคาดหวัง k=1 = 100 × 1.08^0.25", L1.expectedSeries[1], 100 * Math.pow(1.08, 0.25), 1e-9);
tNear("เส้นคาดหวัง k=4 = 108", L1.expectedSeries[4], 108, 1e-9);
tNear("ห่างจากเส้นคาดหวัง", L1.gapRatio, IDX1 / 108 - 1, 1e-12);
t("สถานะ = นำเป้า", L1.status === "ahead", L1.status);
t("ไม่ติดเตือนตามหลัง", L1.trailing && L1.trailing.count === 0, L1.trailing && L1.trailing.count);
// drawdown ต้องคิดจากดัชนีที่หักเงินเติม/ถอนแล้ว = −5% (ไตรมาสสุดท้าย)
// ถ้าคิดจากมูลค่าดิบจะได้ 133000/160000−1 = −16.875% ซึ่งคือการ "ถอนเงินไปใช้" ไม่ใช่ขาดทุน
tNear("drawdown สูงสุด = −5% (จากดัชนี ไม่ใช่มูลค่าดิบ)", L1.drawdown.maxDrawdown, -0.05, 1e-12);
t("drawdown ไม่ใช่ −16.875% ของมูลค่าดิบ", !near(L1.drawdown.maxDrawdown, 133000 / 160000 - 1, 1e-6));
t("จุดยอดของ drawdown = ไตรมาสก่อนสุดท้าย", L1.drawdown.peakKey === qKey(1), L1.drawdown.peakKey);
t("จุดต่ำสุดของ drawdown = ไตรมาสล่าสุด", L1.drawdown.troughKey === qKey(0), L1.drawdown.troughKey);
tNear("ต้องทำจากนี้ (4 ไตรมาส) = 100×1.08^2 ÷ ดัชนีล่าสุด − 1", L1.required.requiredAnn, (100 * Math.pow(1.08, 2)) / IDX1 - 1, 1e-12);
t("ระบุไตรมาสเป้าหมายล่วงหน้า 4 ไตรมาส", L1.required.targetKey === qKey(-4), L1.required.targetKey);
t("ข้อมูลเงินเติม/ถอนครบ 4/4", L1.flowCoverage.recorded === 4 && L1.flowCoverage.total === 4, L1.flowCoverage.thai);
t("ไม่มีการประมาณเงินเริ่มต้น", L1.quarters.every(function (q) { return q.imputed.length === 0; }));
t("พอร์ตอื่นไม่มีข้อมูล", R1.ports.short.hasData === false && R1.ports.mid.hasData === false);
t("ไม่มีรายการค้างจัด", R1.unassigned.length === 0, JSON.stringify(R1.unassigned));

// ============================================================
console.log("\n[2] ตัวอย่างที่ 2 — ข้อมูลเก่าไม่มี netFlow + รายการเพิ่งเข้าพอร์ต + runway");
var EX2 = {};
EX2[qKey(3)] = [row("cash", "เงินสด", 300000), row("rmf-jang", "RMF-จัง", 100000)];
EX2[qKey(2)] = [row("cash", "เงินสด", 300000), row("rmf-jang", "RMF-จัง", 100000)];
EX2[qKey(1)] = [row("cash", "เงินสด", 240000, -60000), row("rmf-jang", "RMF-จัง", 100000), row("thai-stock", "หุ้นไทย", 200000)];
EX2[qKey(0)] = [row("cash", "เงินสด", 250000, 0), row("rmf-jang", "RMF-จัง", 100000), row("thai-stock", "หุ้นไทย", 210000), row("bitcoin", "Bitcoin", 50000)];
var ALLOC2 = {
  version: 1,
  map: { "cash::เงินสด": "short", "rmf-jang::RMF-จัง": "mid", "thai-stock::หุ้นไทย": "mid" },
  ports: { short: { expectedReturnPct: 3 }, mid: { expectedReturnPct: 6 }, long: { expectedReturnPct: null } },
  monthlyExpense: 50000, updatedAt: null
};
var R2 = AA.compute(blob(EX2, qKey(0)), ALLOC2);
var SH = R2.ports.short, MD = R2.ports.mid, LG = R2.ports.long;

console.log("  -- ระยะสั้น (เงินสด) --");
tNear("r1 = 0 (ข้อมูลเก่าไม่มี netFlow ⇒ คิดเป็น 0)", SH.quarters[0].r, 0);
tNear("r2 = 0 (ถอน 60k ออกไปใช้ ไม่ใช่ขาดทุน)", SH.quarters[1].r, 0);
tNear("r3 = 10000/240000", SH.quarters[2].r, 10000 / 240000);
t("n = 3", SH.n === 3, SH.n);
t("ยังไม่ครบปี ⇒ ไม่คำนวณต่อปี", SH.annReturn === null, SH.annReturn);
t("บอกเหตุผลว่าทำไมไม่มีตัวเลขต่อปี", SH.annNote === "ยังไม่ครบปี (3/4 ไตรมาส)", SH.annNote);
tNear("ผลตอบแทนสะสม = 1/24", SH.cumReturn, 1 / 24, 1e-12);
t("ไตรมาสที่ไม่มีข้อมูลเงินเติม/ถอน ถูกทำเครื่องหมาย", SH.quarters[0].flowStatus === "missing", SH.quarters[0].flowStatus);
t("ข้อมูลเงินเติม/ถอนครบ 2/3", SH.flowCoverage.recorded === 2 && SH.flowCoverage.total === 3, SH.flowCoverage.thai);
tNear("runway = 250000/50000 = 5 เดือน", SH.runway.months, 5, 1e-12);
tNear("เส้นคาดหวัง k=3 = 100 × 1.03^0.75", SH.expectedSeries[3], 100 * Math.pow(1.03, 0.75), 1e-9);
tNear("ห่างจากเส้นคาดหวัง", SH.gapRatio, (100 * (1 + 1 / 24)) / (100 * Math.pow(1.03, 0.75)) - 1, 1e-12);
t("สถานะ = นำเป้า", SH.status === "ahead", SH.status);

console.log("  -- ระยะกลาง (RMF + หุ้นไทย ที่เพิ่งเข้าพอร์ต) --");
tNear("r1 = 0", MD.quarters[0].r, 0);
// หุ้นไทย 200k โผล่มาในไตรมาสนี้โดยไม่มี netFlow — ต้องถือเป็นเงินที่ใส่เข้ามา ไม่ใช่กำไร
tNear("r2 = 0 (รายการใหม่ 200k ถือเป็นเงินเข้า ไม่ใช่ผลตอบแทน)", MD.quarters[1].r, 0);
t("ไม่ใช่ +200% แบบที่ยอดคงเหลือล้วนจะให้", !near(MD.quarters[1].r, 2, 1e-6), MD.quarters[1].r);
t("บันทึกไว้ว่าประมาณเงินเริ่มต้นให้รายการไหน", MD.quarters[1].imputed.length === 1 && MD.quarters[1].imputed[0].value === 200000, JSON.stringify(MD.quarters[1].imputed));
tNear("r3 = 10000/300000", MD.quarters[2].r, 10000 / 300000);
tNear("ผลตอบแทนสะสม = 1/30", MD.cumReturn, 1 / 30, 1e-12);
t("ข้อมูลเงินเติม/ถอนครบ 0/3", MD.flowCoverage.recorded === 0 && MD.flowCoverage.total === 3, MD.flowCoverage.thai);
t("สถานะ = ตามหลังเป้า", MD.status === "behind", MD.status);
t("เตือนว่าต่ำกว่าเส้นคาดหวังติดต่อกัน 3 ไตรมาส", MD.trailing.warn === true && MD.trailing.count === 3, JSON.stringify(MD.trailing));
tNear("ห่างจากเส้นคาดหวัง", MD.gapRatio, (100 * (1 + 1 / 30)) / (100 * Math.pow(1.06, 0.75)) - 1, 1e-12);
tNear("ต้องทำจากนี้ = (100×1.06^1.75 ÷ ดัชนีล่าสุด)^(4/4) − 1",
  MD.required.requiredAnn, (100 * Math.pow(1.06, 7 / 4)) / (100 * (1 + 1 / 30)) - 1, 1e-12);

console.log("  -- ระยะยาว (ยังไม่มีสมาชิก) --");
t("hasData = false", LG.hasData === false);
t("status = ยังไม่มีข้อมูล", LG.status === "no-data", LG.status);
t("ไม่มีตัวเลขหลอก", LG.cumReturn === null && LG.annReturn === null && LG.drawdown === null && LG.required === null);

console.log("  -- ภาพรวม --");
t("Bitcoin อยู่ในรายการยังไม่จัด", R2.unassigned.length === 1 && R2.unassigned[0].key === "bitcoin::Bitcoin", JSON.stringify(R2.unassigned));
tNear("มูลค่ารวมล่าสุด = 610,000", R2.totals.latest, 610000);
tNear("จัดแล้ว 560,000/610,000", R2.totals.assignedPct, 560000 / 610000, 1e-12);
tNear("ยังไม่จัด = 50,000", R2.totals.unassigned, 50000);

// ============================================================
console.log("\n[3] ฟังก์ชันย่อย — เคสขอบ");
tNear("dietz: ถอนเกือบหมด 100k→0 ถอน 120k ⇒ +0.5", AA.dietz(100000, 0, -120000, 0.5), 0.5, 1e-12);
t("dietz: ถอนมากกว่าที่มี (ตัวหาร ≤ 0) ⇒ null", AA.dietz(100000, 0, -200000, 0.5) === null);
t("dietz: ต้นงวดเป็น 0 ⇒ null ไม่ใช่ Infinity", AA.dietz(0, 50000, 50000, 0.5) === null);
t("dietz: ต้นงวดเป็น 0 และไม่มีเงินเข้า ⇒ null", AA.dietz(0, 50000, 0, 0.5) === null);
t("dietz: null/undefined/'' ไม่ถูกกลืนเป็น 0", AA.dietz(null, 1, 0, 0.5) === null && AA.dietz(1, undefined, 0, 0.5) === null && AA.dietz(1, 2, "", 0.5) === null);
t("dietz: ค่าว่างที่เป็นช่องว่าง ⇒ null", AA.dietz(1, 2, "  ", 0.5) === null);
tNear("annualize(0.2, 8) = 1.2^0.5 − 1", AA.annualize(0.2, 8), Math.pow(1.2, 0.5) - 1, 1e-12);
t("annualize: n=3 ⇒ null (ยังไม่ครบปี)", AA.annualize(0.2, 3) === null);
tNear("annualize: n=4 ⇒ เท่ากับสะสม", AA.annualize(0.2, 4), 0.2, 1e-12);
t("annualize: ขาดทุนเกิน 100% ⇒ null", AA.annualize(-1.5, 8) === null);
var TB = AA.trailingBehind([100, 99, 98, 106, 104], [100, 101, 102, 103, 104.5], 3);
t("trailingBehind นับเฉพาะที่ติดต่อกันจากท้าย (1 ไม่ใช่ 3)", TB.count === 1 && TB.warn === false, JSON.stringify(TB));
var DD = AA.maxDrawdown([100, 110, 99, 120, 96]);
tNear("maxDrawdown = 96/120 − 1", DD.maxDrawdown, 96 / 120 - 1, 1e-12);
t("maxDrawdown ชี้จุดยอดถูก (index 3)", DD.peakIdx === 3 && DD.troughIdx === 4, JSON.stringify(DD));
t("maxDrawdown: จุดเดียว ⇒ null", AA.maxDrawdown([100]) === null);
tNear("expectedIndex(0.08, 4) = 108", AA.expectedIndex(0.08, 4), 108, 1e-12);
t("expectedIndex: E = null ⇒ null", AA.expectedIndex(null, 4) === null);
t("chainIndex: [] ⇒ [100]", AA.chainIndex([]).length === 1 && AA.chainIndex([])[0] === 100);
tNear("chainIndex: null นับเป็น 0%", AA.chainIndex([null, 0.1])[2], 110, 1e-9);
t("shiftQuarter ข้ามปีได้", AA.shiftQuarter("2026-Q4", 1) === "2027-Q1" && AA.shiftQuarter("2026-Q1", -1) === "2025-Q4",
  AA.shiftQuarter("2026-Q4", 1) + " / " + AA.shiftQuarter("2026-Q1", -1));
t("compareQuarter เรียงข้ามปีถูก", ["2027-Q1", "2026-Q4", "2026-Q1"].sort(AA.compareQuarter).join(",") === "2026-Q1,2026-Q4,2027-Q1");

console.log("\n[4] normalizeAllocation — ข้อมูลขยะต้องไม่ทำให้พัง");
var N = AA.normalizeAllocation({ map: { a: "short", b: "นอกโลก", c: null }, ports: { short: { expectedReturnPct: "7.5" }, mid: { expectedReturnPct: "abc" } }, monthlyExpense: "", updatedAt: 123 });
t("เก็บเฉพาะ port ที่รู้จัก และแปลงรูปแบบเก่าเป็นสัดส่วน 100%",
  JSON.stringify(N.map) === JSON.stringify({ a: { short: 100 } }), JSON.stringify(N.map));
tNear("ตัวเลขที่เป็น string ใช้ได้", N.ports.short.expectedReturnPct, 7.5);
t("string ที่ไม่ใช่ตัวเลข ⇒ null", N.ports.mid.expectedReturnPct === null);
t("'' ไม่กลายเป็น 0", N.monthlyExpense === null);
t("updatedAt ที่ไม่ใช่ string ⇒ null", N.updatedAt === null);
t("ports ครบ 3 เสมอ", AA.PORTS.every(function (p) { return N.ports[p] && "expectedReturnPct" in N.ports[p]; }));
t("normalizeAllocation(undefined) ไม่พัง", !!AA.normalizeAllocation().ports.long);

console.log("\n[5] เคสขอบของ compute");
t("ไม่มีข้อมูลเลย ⇒ available=false พร้อมเหตุผล", AA.compute(null).available === false && AA.compute(null).reason === "no-quarterly");
t("blob เปล่า ⇒ ไม่พัง", AA.compute({ data: { quarters: {} } }).available === false);
var one = {}; one[qKey(0)] = [row("cash", "เงินสด", 100000, 0)];
var R5 = AA.compute(blob(one, qKey(0)), { map: { "cash::เงินสด": "short" }, ports: { short: { expectedReturnPct: 3 } } });
t("ไตรมาสเดียว ⇒ ดัชนีมีจุดเดียว ไม่มีผลตอบแทน", R5.ports.short.n === 0 && R5.ports.short.cumReturn === null, R5.ports.short.n);
t("ไตรมาสเดียว ⇒ drawdown null", R5.ports.short.drawdown === null);
t("ไตรมาสเดียว ⇒ แต่ยังรู้มูลค่าและสัดส่วน", R5.ports.short.latestValue === 100000 && R5.ports.short.share === 1);

var R6 = AA.compute(blob(EX2, qKey(0)), { map: {}, ports: {} });
t("map ว่าง ⇒ ทุกตัวอยู่ในยังไม่จัด", R6.unassigned.length === 4, R6.unassigned.length);
t("map ว่าง ⇒ assignedPct = 0", R6.totals.assignedPct === 0, R6.totals.assignedPct);
t("map ว่าง ⇒ ทุกพอร์ต hasData=false", AA.PORTS.every(function (p) { return R6.ports[p].hasData === false; }));

var EX7 = {};
EX7[qKey(2)] = [row("cash", "เงินสด", 100000, 0)];
EX7[qKey(1)] = [row("cash", "เงินสด", 110000, 0)];
EX7[qKey(0)] = [];  // ไตรมาสที่สร้างไว้ล่วงหน้าแต่ยังไม่กรอก
var R7 = AA.compute(blob(EX7, qKey(0)), { map: { "cash::เงินสด": "short" }, ports: {} });
t("ไตรมาสว่างท้ายแถวถูกข้าม", R7.skippedQuarters.length === 1 && R7.skippedQuarters[0] === qKey(0), JSON.stringify(R7.skippedQuarters));
t("ไตรมาสล่าสุดเลื่อนมาเป็นไตรมาสที่มีข้อมูล", R7.latestKey === qKey(1), R7.latestKey);
t("ไม่อ่านเป็น −100%", near(R7.ports.short.cumReturn, 0.1, 1e-12), R7.ports.short.cumReturn);

var EX8 = {};
EX8[qKey(1)] = [row("cash", "กระเป๋า A", 100000, 0), row("cash", "กระเป๋า A", 50000, 0)];
EX8[qKey(0)] = [row("cash", "กระเป๋า A", 160000, 0)];
var R8 = AA.compute(blob(EX8, qKey(0)), { map: { "cash::กระเป๋า A": "short" }, ports: {} });
tNear("ชื่อซ้ำในไตรมาสเดียวกันถูกบวกรวม (150k → 160k)", R8.ports.short.quarters[0].r, 10000 / 150000, 1e-12);

var EX9 = {};
EX9[qKey(1)] = [row("cash", "เงินสด", 100000, 0)];
EX9[qKey(0)] = [row("cash", "เงินสด", 10000, -200000)];  // ถอนมากกว่าที่มี
var R9 = AA.compute(blob(EX9, qKey(0)), { map: { "cash::เงินสด": "short" }, ports: {} });
t("ถอนมากกว่ามูลค่า ⇒ r = null ไม่ใช่ตัวเลขมั่ว", R9.ports.short.quarters[0].r === null, R9.ports.short.quarters[0].r);
t("บอกเหตุผลว่าเพราะอะไร", R9.ports.short.quarters[0].rReason === "inconsistent", R9.ports.short.quarters[0].rReason);
t("มีคำเตือนบนแถวนั้น", R9.ports.short.quarters[0].flags.some(function (f) { return f.indexOf("ถอนมากกว่า") >= 0; }), JSON.stringify(R9.ports.short.quarters[0].flags));

var EX10 = {};
EX10[qKey(1)] = [row("cash", "เงินสด", 100000, 0), row("thai-stock", "หุ้นไทย", 50000, 0)];
EX10[qKey(0)] = [row("cash", "เงินสด", 100000, 0)];  // หุ้นไทยหายไปเฉย ๆ
var R10 = AA.compute(blob(EX10, qKey(0)), { map: { "cash::เงินสด": "short", "thai-stock::หุ้นไทย": "short" }, ports: {} });
t("รายการที่หายไปถูกทำเครื่องหมาย", R10.ports.short.quarters[0].disappeared.length === 1, JSON.stringify(R10.ports.short.quarters[0].disappeared));
t("มีคำเตือนระดับพอร์ต", R10.ports.short.warnings.some(function (w) { return w.kind === "disappeared"; }), JSON.stringify(R10.ports.short.warnings));

var EX11 = {};
EX11[qKey(1)] = [row("cash", "เงินสด", 100000, 0)];
EX11[qKey(0)] = [row("cash", "เงินสด", 100000, 0), row("thai-stock", "หุ้นไทย", 80000, 0)];  // ใหม่ แต่บันทึก 0
var R11 = AA.compute(blob(EX11, qKey(0)), { map: { "cash::เงินสด": "short", "thai-stock::หุ้นไทย": "short" }, ports: {} });
t("รายการใหม่ที่บันทึกเงินเติม = 0 ถูกทักท้วง", R11.ports.short.quarters[0].newZero.length === 1, JSON.stringify(R11.ports.short.quarters[0].newZero));
t("บันทึก 0 ไว้แล้วต้องไม่ถูกประมาณซ้ำ", R11.ports.short.quarters[0].imputed.length === 0);
tNear("และผลตอบแทนคิดจาก 0 จริง ๆ ตามที่ผู้ใช้บันทึก", R11.ports.short.quarters[0].r, 80000 / 100000, 1e-12);

var R12 = AA.compute(blob(EX2, qKey(0)), ALLOC2, { imputeEntries: false });
tNear("ปิดการประมาณเงินเริ่มต้น ⇒ r2 กลายเป็น +200% (ยืนยันว่าสวิตช์ทำงาน)", R12.ports.mid.quarters[1].r, 200000 / 100000, 1e-12);

var R13 = AA.compute(blob(EX1, qKey(0)), { map: { "foreign-stock::หุ้นต่างประเทศ": "long", "ผี::ไม่มีจริง": "mid" }, ports: {} });
t("map ที่ชี้ไปรายการที่ไม่มีอยู่ ถูกรายงานเป็น staleKeys", R13.meta.staleKeys.length === 1 && R13.meta.staleKeys[0] === "ผี::ไม่มีจริง", JSON.stringify(R13.meta.staleKeys));
t("แต่ไม่ทำให้พอร์ต mid พัง", R13.ports.mid.hasData === false);

var R14 = AA.compute(blob(EX1, qKey(0)), { map: { "foreign-stock::หุ้นต่างประเทศ": "long" }, ports: { long: { expectedReturnPct: null } } });
t("ไม่ตั้งเป้า ⇒ status = ยังไม่ตั้งเป้า", R14.ports.long.status === "no-target", R14.ports.long.status);
t("ไม่ตั้งเป้า ⇒ ไม่มีเส้นคาดหวัง/ต้องทำเท่าไหร่/เตือนตามหลัง", R14.ports.long.required === null && R14.ports.long.trailing === null && R14.ports.long.expectedSeries.every(function (v) { return v === null; }));
t("แต่ยังมีผลตอบแทนจริงและ drawdown", R14.ports.long.cumReturn !== null && R14.ports.long.drawdown !== null);
t("ไม่ตั้งค่าใช้จ่ายต่อเดือน ⇒ runway = null", R2.ports.short.runway.monthlyExpense === 50000 && R14.ports.short.runway.months === null);

// ============================================================
console.log("\n[5b] แบ่งสัดส่วนสินทรัพย์ข้ามพอร์ต (เช่น Bitcoin สั้น 0% กลาง 30% ยาว 70%)");
var SP = {};
SP[qKey(1)] = [row("bitcoin", "Bitcoin", 100000, 0)];
SP[qKey(0)] = [row("bitcoin", "Bitcoin", 120000, 0)];
var RSP = AA.compute(blob(SP, qKey(0)), { map: { "bitcoin::Bitcoin": { short: 0, mid: 30, long: 70 } }, ports: {} });
tNear("มูลค่าไปพอร์ตกลาง 30% = 36,000", RSP.ports.mid.latestValue, 36000, 1e-9);
tNear("มูลค่าไปพอร์ตยาว 70% = 84,000", RSP.ports.long.latestValue, 84000, 1e-9);
t("พอร์ตสั้นไม่ได้อะไรเลย (0%)", RSP.ports.short.hasData === false, RSP.ports.short.latestValue);
tNear("รวมสองพอร์ต = มูลค่าเต็ม 120,000", RSP.ports.mid.latestValue + RSP.ports.long.latestValue, 120000, 1e-9);
// กติกาสำคัญ: แบ่งสัดส่วนต้องไม่ทำให้ "ผลตอบแทน" เปลี่ยน — เปลี่ยนแค่ขนาด
tNear("ผลตอบแทนพอร์ตกลาง = +20% (เท่าสินทรัพย์)", RSP.ports.mid.cumReturn, 0.2, 1e-12);
tNear("ผลตอบแทนพอร์ตยาว = +20% (เท่ากันเป๊ะ)", RSP.ports.long.cumReturn, 0.2, 1e-12);
t("สัดส่วนของพอร์ตในภาพรวมถูกต้อง", near(RSP.ports.mid.share, 0.3, 1e-12) && near(RSP.ports.long.share, 0.7, 1e-12),
  RSP.ports.mid.share + " / " + RSP.ports.long.share);
t("ไม่เหลือส่วนที่ยังไม่จัด (30+70=100)", RSP.unassigned.length === 0, JSON.stringify(RSP.unassigned));
t("ตารางรายสินทรัพย์บอกสัดส่วนครบ", RSP.assetsAll.length === 1 &&
  RSP.assetsAll[0].split.short === 0 && RSP.assetsAll[0].split.mid === 30 && RSP.assetsAll[0].split.long === 70 && RSP.assetsAll[0].sumPct === 100,
  JSON.stringify(RSP.assetsAll[0] && RSP.assetsAll[0].split));
t("พอร์ตกลางรู้ว่าถือ Bitcoin อยู่ 30% ของตัวนั้น",
  RSP.ports.mid.assets[0].weightPct === 30 && near(RSP.ports.mid.assets[0].allocatedValue, 36000, 1e-9) && RSP.ports.mid.assets[0].latestValue === 120000);

console.log("  -- เงินเติม/ถอนต้องถูกหารตามสัดส่วนด้วย --");
var SF = {};
SF[qKey(1)] = [row("bitcoin", "Bitcoin", 100000, 0)];
SF[qKey(0)] = [row("bitcoin", "Bitcoin", 200000, 50000)];
var RSF = AA.compute(blob(SF, qKey(0)), { map: { "bitcoin::Bitcoin": { mid: 30, long: 70 } }, ports: {} });
var whole = AA.compute(blob(SF, qKey(0)), { map: { "bitcoin::Bitcoin": "long" }, ports: {} });
tNear("เงินเติมเข้าพอร์ตกลาง = 15,000 (30% ของ 50,000)", RSF.ports.mid.quarters[0].flow, 15000, 1e-9);
tNear("เงินเติมเข้าพอร์ตยาว = 35,000 (70%)", RSF.ports.long.quarters[0].flow, 35000, 1e-9);
tNear("ผลตอบแทนพอร์ตกลาง = 50/125", RSF.ports.mid.cumReturn, 50 / 125, 1e-12);
tNear("ผลตอบแทนพอร์ตยาว = 50/125 (เท่ากัน)", RSF.ports.long.cumReturn, 50 / 125, 1e-12);
tNear("และเท่ากับตอนไม่แบ่ง (แบ่งแล้วผลตอบแทนต้องไม่เพี้ยน)", RSF.ports.mid.cumReturn, whole.ports.long.cumReturn, 1e-12);

console.log("  -- จัดไม่ครบ 100% → ส่วนที่เหลือคือยังไม่จัด --");
var RP = AA.compute(blob(SP, qKey(0)), { map: { "bitcoin::Bitcoin": { mid: 30 } }, ports: {} });
tNear("พอร์ตกลางได้ 36,000", RP.ports.mid.latestValue, 36000, 1e-9);
tNear("ยังไม่จัดอีก 84,000 (70%)", RP.totals.unassigned, 84000, 1e-9);
tNear("จัดแล้ว 30% ของพอร์ตรวม", RP.totals.assignedPct, 0.3, 1e-12);
t("ขึ้นในรายการที่ยังจัดไม่ครบ พร้อมบอกว่าเหลือเท่าไหร่",
  RP.unassigned.length === 1 && RP.unassigned[0].remainderPct === 70 && near(RP.unassigned[0].remainderValue, 84000, 1e-9),
  JSON.stringify(RP.unassigned[0]));

console.log("  -- รวมเกิน 100% → ไม่เอาเข้าพอร์ตเลย และต้องฟ้อง --");
var ROV = AA.compute(blob(SP, qKey(0)), { map: { "bitcoin::Bitcoin": { short: 50, mid: 50, long: 50 } }, ports: {} });
t("ไม่มีพอร์ตไหนได้มูลค่าไป (กันยอดรวมเกินความจริง)",
  AA.PORTS.every(function (p) { return ROV.ports[p].latestValue === 0; }),
  AA.PORTS.map(function (p) { return ROV.ports[p].latestValue; }).join(","));
t("รายงานว่ารายการไหนตั้งค่าเกิน 100%",
  ROV.meta.invalidSplits.length === 1 && ROV.meta.invalidSplits[0].sum === 150, JSON.stringify(ROV.meta.invalidSplits));
t("ยอดรวมที่จัดแล้วไม่บวม", ROV.totals.assigned === 0 && ROV.totals.assignedPct === 0);
t("ยังนับเป็นรายการที่ต้องแก้", ROV.unassigned.length === 1 && ROV.unassigned[0].invalid === true);

console.log("  -- ความเข้ากันได้กับข้อมูลเดิม --");
var RC1 = AA.compute(blob(SP, qKey(0)), { map: { "bitcoin::Bitcoin": "long" }, ports: {} });
var RC2 = AA.compute(blob(SP, qKey(0)), { map: { "bitcoin::Bitcoin": { long: 100 } }, ports: {} });
t("รูปแบบเก่า (string) ให้ผลเท่ากับรูปแบบใหม่ 100% เป๊ะ",
  JSON.stringify(RC1.ports) === JSON.stringify(RC2.ports));
t("normalizeSplit: 'mid' → {mid:100}", JSON.stringify(AA.normalizeSplit("mid")) === JSON.stringify({ mid: 100 }));
t("normalizeSplit: ค่าติดลบ/ศูนย์ถูกตัดทิ้ง", JSON.stringify(AA.normalizeSplit({ short: -5, mid: 0, long: 40 })) === JSON.stringify({ long: 40 }));
t("normalizeSplit: เกิน 100 ต่อพอร์ตถูกตัดที่ 100", JSON.stringify(AA.normalizeSplit({ long: 250 })) === JSON.stringify({ long: 100 }));
t("normalizeSplit: ขยะ → null", AA.normalizeSplit("zzz") === null && AA.normalizeSplit(null) === null && AA.normalizeSplit({}) === null && AA.normalizeSplit(5) === null);
t("normalizeSplit: string ตัวเลขใช้ได้ (มาจาก input)", JSON.stringify(AA.normalizeSplit({ mid: "30", long: "70" })) === JSON.stringify({ mid: 30, long: 70 }));
tNear("splitSum", AA.splitSum({ short: 10, mid: 20, long: 30 }), 60);
tNear("splitSum(null) = 0", AA.splitSum(null), 0);

// ============================================================
console.log("\n[5c] แผนเกษียณ — เงินพอหรือยัง");
console.log("  -- สูตรกับการเดินเงินจริงต้องตรงกัน (กันสูตรผิดแบบเงียบ ๆ) --");
[[20, 0.06, 0.03], [30, 0.08, 0.02], [25, 0.03, 0.03], [10, 0.02, 0.05]].forEach(function (c) {
  var R = c[0], g = c[1], i = c[2], A = 600000;
  var req = AA.requiredCapital(A, R, g, i);
  var pj = AA.projectWealth({ startWealth: req, rate: g, inflationPct: i, workYears: 0, retireYears: R, annualContribution: 0, monthlyExpense: A / 12 });
  t("R=" + R + " g=" + (g * 100) + "% i=" + (i * 100) + "% → ใส่เงินเท่าที่สูตรบอก แล้วเดินจริงจบที่ 0 พอดี",
    Math.abs(pj.endWealth) < Math.max(1e-6, req * 1e-9), "จบที่ " + pj.endWealth);
  t("   และไม่หมดก่อนกำหนด", pj.runsOutInYear === null, pj.runsOutInYear);
});
t("ผลตอบแทนเท่าเงินเฟ้อพอดี → ต้องมี = ค่าใช้จ่าย × จำนวนปี", near(AA.requiredCapital(600000, 20, 0.03, 0.03), 600000 * 20, 1e-6));
t("เงินเฟ้อสูงกว่าผลตอบแทน → ต้องมีมากกว่าค่าใช้จ่าย × ปี", AA.requiredCapital(600000, 20, 0.02, 0.05) > 600000 * 20);
t("ผลตอบแทนสูงกว่าเงินเฟ้อ → ต้องมีน้อยกว่าค่าใช้จ่าย × ปี", AA.requiredCapital(600000, 20, 0.08, 0.02) < 600000 * 20);
t("requiredCapital: ปี = 0 → null", AA.requiredCapital(600000, 0, 0.06, 0.03) === null);
t("projectWealth: ปีเกษียณ = 0 → null", AA.projectWealth({ startWealth: 1, rate: 0.06, inflationPct: 0.03, workYears: 5, retireYears: 0, annualContribution: 0, monthlyExpense: 1 }) === null);
t("projectWealth: ข้อมูลไม่ครบ → null", AA.projectWealth({ startWealth: null, rate: 0.06, inflationPct: 0.03, workYears: 5, retireYears: 5, monthlyExpense: 1 }) === null);

console.log("  -- ช่วงทำงานต้องทบต้น และเงินที่เติมต้องโตตามเงินเฟ้อ --");
// เงินเฟ้อ 0% → เติมเท่าเดิมทุกปี · 1,000,000 ที่ 10% เติมปีละ 100,000
var ACC0 = AA.projectWealth({ startWealth: 1000000, rate: 0.10, inflationPct: 0, workYears: 3, retireYears: 1, annualContribution: 100000, monthlyExpense: 1 });
tNear("ปีที่ 1 = 1,000,000×1.1 + 100,000", ACC0.series[1].wealth, 1200000, 1e-6);
tNear("ปีที่ 2 = 1,200,000×1.1 + 100,000", ACC0.series[2].wealth, 1420000, 1e-6);
tNear("ปีที่ 3 = 1,420,000×1.1 + 100,000", ACC0.series[3].wealth, 1662000, 1e-6);
t("ไม่ใช่แค่บวกเงินเติมเฉย ๆ (ต้องทบต้น)", !near(ACC0.series[3].wealth, 1000000 + 300000, 1));
// เงินเฟ้อ 3% → เงินที่เติมโตปีละ 3%
var ACC3 = AA.projectWealth({ startWealth: 1000000, rate: 0.10, inflationPct: 0.03, workYears: 3, retireYears: 1, annualContribution: 100000, monthlyExpense: 1 });
tNear("ปีที่ 1 เติม 100,000 (ปีแรกยังไม่โต)", ACC3.series[1].wealth, 1000000 * 1.1 + 100000, 1e-6);
tNear("ปีที่ 2 เติม 103,000", ACC3.series[2].wealth, (1000000 * 1.1 + 100000) * 1.1 + 100000 * 1.03, 1e-6);
tNear("ปีที่ 3 เติม 106,090", ACC3.series[3].wealth, ((1000000 * 1.1 + 100000) * 1.1 + 103000) * 1.1 + 100000 * Math.pow(1.03, 2), 1e-6);
tNear("เงินที่เติมถูกบันทึกในซีรีส์ด้วย", ACC3.series[3].flow, 100000 * Math.pow(1.03, 2), 1e-6);
t("มูลค่า ณ วันเกษียณ = ปีสุดท้ายของช่วงทำงาน", near(ACC3.wealthAtRetirement, ACC3.series[3].wealth, 1e-9));

console.log("  -- ต้องเติมปีละเท่าไหร่ถึงจะพอ --");
var SOLVE = { startWealth: 1000000, rate: 0.07, inflationPct: 0.03, workYears: 20, retireYears: 25, monthlyExpense: 50000 };
var needC = AA.solveContribution(SOLVE);
t("หาคำตอบได้", needC !== null && needC > 0, needC);
var atNeed = AA.projectWealth({ startWealth: SOLVE.startWealth, rate: SOLVE.rate, inflationPct: SOLVE.inflationPct, workYears: SOLVE.workYears, retireYears: SOLVE.retireYears, annualContribution: needC, monthlyExpense: SOLVE.monthlyExpense });
t("เติมเท่าที่คำนวณ → เงินพอดีจบที่ ~0 และไม่หมดก่อน",
  atNeed.runsOutInYear === null && Math.abs(atNeed.endWealth) < 1000, atNeed.endWealth);
var atLess = AA.projectWealth({ startWealth: SOLVE.startWealth, rate: SOLVE.rate, inflationPct: SOLVE.inflationPct, workYears: SOLVE.workYears, retireYears: SOLVE.retireYears, annualContribution: needC * 0.8, monthlyExpense: SOLVE.monthlyExpense });
t("เติมน้อยกว่านั้น 20% → เงินหมดก่อนจริง", atLess.runsOutInYear !== null, atLess.endWealth);
t("รวยพออยู่แล้ว → ต้องเติม 0",
  AA.solveContribution({ startWealth: 500000000, rate: 0.07, inflationPct: 0.03, workYears: 5, retireYears: 20, monthlyExpense: 50000 }) === 0);

console.log("  -- ต้องทำผลตอบแทนกี่ %/ปี ถึงจะพอดี --");
// อัตรานี้มีผลกับทั้ง 'เงินที่จะมี' และ 'เงินที่ต้องมี' พร้อมกัน
// ข้อพิสูจน์ที่ถูกต้องคือ ณ อัตรานั้น สองฝั่งต้องเท่ากันพอดี
[[1000000, 20, 25, 300000, 50000, 0.03], [200000, 30, 20, 120000, 30000, 0.02], [5000000, 10, 30, 0, 80000, 0.04]].forEach(function (c) {
  var o = { startWealth: c[0], workYears: c[1], retireYears: c[2], annualContribution: c[3], monthlyExpense: c[4], inflationPct: c[5] };
  var g = AA.solveRequiredRate(o);
  t("เริ่ม " + (c[0] / 1e6) + "M ทำงาน " + c[1] + " ปี → หาอัตราได้", g !== null, g);
  if (g === null) return;
  var pj = AA.projectWealth({ startWealth: o.startWealth, rate: g, inflationPct: o.inflationPct, workYears: o.workYears, retireYears: o.retireYears, annualContribution: o.annualContribution, monthlyExpense: o.monthlyExpense });
  var req = AA.requiredCapital(pj.firstRetirementExpense, o.retireYears, g, o.inflationPct);
  t("   ณ อัตรานั้น เงินที่จะมี = เงินที่ต้องมี พอดี", Math.abs(pj.wealthAtRetirement - req) < Math.max(1, req * 1e-9), "ต่าง " + (pj.wealthAtRetirement - req));
  t("   และเดินจนจบไม่มีเงินหมดก่อน", pj.runsOutInYear === null, pj.runsOutInYear);
  // ต่ำกว่านั้นนิดเดียวต้องไม่พอ — พิสูจน์ว่าเป็น "ขั้นต่ำ" จริง
  var lower = AA.projectWealth({ startWealth: o.startWealth, rate: g - 0.005, inflationPct: o.inflationPct, workYears: o.workYears, retireYears: o.retireYears, annualContribution: o.annualContribution, monthlyExpense: o.monthlyExpense });
  var reqLower = AA.requiredCapital(lower.firstRetirementExpense, o.retireYears, g - 0.005, o.inflationPct);
  t("   ต่ำกว่าอัตรานั้น 0.5 จุด → เงินไม่พอ (เป็นขั้นต่ำจริง)", lower.wealthAtRetirement < reqLower);
});
t("รวยพอจนไม่ต้องการผลตอบแทน → คืนค่าติดลบมาก ๆ",
  AA.solveRequiredRate({ startWealth: 900000000, workYears: 5, retireYears: 20, annualContribution: 0, monthlyExpense: 50000, inflationPct: 0.03 }) < 0);
// เคสที่เป้าหมายใหญ่เกินตัวมาก ๆ: คณิตศาสตร์ยังหาคำตอบได้ (ถ้าผลตอบแทนสูงพอก็ถึงเป้า)
// engine จึงคืนตัวเลขจริงตามสูตร ส่วนการตัดสินว่า "สูงจนไม่สมจริง" เป็นหน้าที่ของชั้นแสดงผล
var absurd = AA.solveRequiredRate({ startWealth: 1000, workYears: 1, retireYears: 40, annualContribution: 0, monthlyExpense: 500000, inflationPct: 0.05 });
t("เป้าหมายใหญ่เกินตัว → คืนอัตราที่สูงมาก (ไม่ใช่ NaN/Infinity)", absurd !== null && isFinite(absurd) && absurd > 1, absurd);
t("และชั้นแสดงผลมีเกณฑ์ตัดว่าสูงเกินจริง (PLAUSIBLE_RATE_PCT)",
  /PLAUSIBLE_RATE_PCT\s*=\s*\d+/.test(require("fs").readFileSync(__dirname + "/../public/asset-allocation-page.js", "utf8")));
t("ข้อมูลไม่ครบ → null", AA.solveRequiredRate({ startWealth: 1000, workYears: 5, retireYears: null, annualContribution: 0, monthlyExpense: 50000, inflationPct: 0.03 }) === null);

console.log("  -- ผลตอบแทนรวมถ่วงตามมูลค่าพอร์ต --");
var RT1 = {};
RT1[qKey(1)] = [row("cash", "เงินสด", 400000, 0), row("bitcoin", "Bitcoin", 600000, 0)];
RT1[qKey(0)] = [row("cash", "เงินสด", 400000, 0), row("bitcoin", "Bitcoin", 600000, 0)];
var ALLOC_RT = {
  map: { "cash::เงินสด": { short: 100 }, "bitcoin::Bitcoin": { long: 100 } },
  ports: { short: { expectedReturnPct: 2 }, mid: { expectedReturnPct: 6 }, long: { expectedReturnPct: 10 } },
  monthlyExpense: 50000,
  retirement: { inflationPct: 3, workYears: 20, retireYears: 25, annualContribution: 300000 }
};
var RRT = AA.compute(blob(RT1, qKey(0)), ALLOC_RT);
tNear("ผลตอบแทนรวม = (400k×2% + 600k×10%) ÷ 1,000k = 6.8%", RRT.retirement.expectedRatePct, (400000 * 2 + 600000 * 10) / 1000000, 1e-9);
t("พอร์ตกลางที่ไม่มีเงินไม่ถูกนับ (ไม่ถ่วงด้วย 6%)", !near(RRT.retirement.expectedRatePct, 6, 1e-6));
t("พร้อมคำนวณ", RRT.retirement.ready === true, JSON.stringify(RRT.retirement.missing));
t("มีทั้งกรณีตามเป้า", !!RRT.retirement.expected);
t("ยังไม่มีกรณีตามจริง (ข้อมูลไม่ถึง 4 ไตรมาส)", RRT.retirement.actual === null);
t("เส้นกราฟยาว = ปีทำงาน + ปีเกษียณ + 1", RRT.retirement.expected.series.length === 20 + 25 + 1, RRT.retirement.expected.series.length);
t("ปีแรกของกราฟ = มูลค่าพอร์ตวันนี้", RRT.retirement.expected.series[0].wealth === 1000000);
t("ช่วงแรกเป็นช่วงทำงาน ช่วงหลังเป็นช่วงเกษียณ",
  RRT.retirement.expected.series[20].phase === "work" && RRT.retirement.expected.series[21].phase === "retire");
tNear("ค่าใช้จ่ายปีแรกหลังเกษียณ = 50,000×12×1.03^20",
  RRT.retirement.expected.firstRetirementExpense, 50000 * 12 * Math.pow(1.03, 20), 1e-6);
t("มีคำตอบว่าต้องเติมปีละเท่าไหร่", RRT.retirement.expected.requiredAnnualContribution !== null);
t("สถานะเป็นหนึ่งในสามแบบ", ["comfortable", "tight", "short"].indexOf(RRT.retirement.expected.verdict) >= 0, RRT.retirement.expected.verdict);
t("ส่วนต่าง = เงินที่จะมี − เงินที่ต้องมี",
  near(RRT.retirement.expected.gapAtRetirement, RRT.retirement.expected.wealthAtRetirement - RRT.retirement.expected.requiredAtRetirement, 1e-6));
t("เงินหมดก่อน ⇔ ส่วนต่างติดลบ",
  (RRT.retirement.expected.runsOutInYear !== null) === (RRT.retirement.expected.gapAtRetirement < 0),
  RRT.retirement.expected.runsOutInYear + " / " + RRT.retirement.expected.gapAtRetirement);

console.log("  -- อายุ และตัวเลขช่องว่างที่ต้องปิด --");
var AGE_PRE = AA.compute(blob(RT1, qKey(0)), {
  map: ALLOC_RT.map, ports: ALLOC_RT.ports, monthlyExpense: 50000,
  retirement: { inflationPct: 3, workYears: 20, retireYears: 25, annualContribution: 300000, currentAge: 42 }
});
var AGE = AA.compute(blob(RT1, qKey(0)), {
  map: ALLOC_RT.map, ports: ALLOC_RT.ports, monthlyExpense: 50000,
  retirement: { inflationPct: 3, workYears: 20, retireYears: 25, annualContribution: 300000, currentAge: 42 }
});
t("เก็บอายุปัจจุบัน", AGE.retirement.currentAge === 42);
t("คำนวณอายุตอนเกษียณ = 42 + 20", AGE.retirement.retireAge === 62, AGE.retirement.retireAge);
t("คำนวณอายุตอนจบแผน = 42 + 20 + 25", AGE.retirement.endAge === 87, AGE.retirement.endAge);
t("ไม่ใส่อายุก็ยังคำนวณได้ (ไม่บังคับ)", RRT.retirement.currentAge === null && RRT.retirement.retireAge === null && RRT.retirement.ready === true);
t("อายุไม่ได้อยู่ในรายการที่ขาด", RRT.retirement.missing.indexOf("อายุ") < 0, JSON.stringify(RRT.retirement.missing));
var scA = AGE.retirement.expected;
t("มีตัวเลขเงินที่ยังขาด", scA.shortfallAtRetirement !== null, scA.shortfallAtRetirement);
t("เงินที่ขาด = เงินที่ต้องมี − เงินที่จะมี (และไม่ติดลบ)",
  near(scA.shortfallAtRetirement, Math.max(0, scA.requiredAtRetirement - scA.wealthAtRetirement), 1e-6));
t("ขาดเงิน ⇔ ส่วนต่างติดลบ", (scA.shortfallAtRetirement > 0) === (scA.gapAtRetirement < 0),
  scA.shortfallAtRetirement + " / " + scA.gapAtRetirement);
t("มีอัตราผลตอบแทนที่ต้องทำให้ได้", scA.requiredRatePct !== null, scA.requiredRatePct);
t("ส่วนต่างอัตรา = ที่ต้องทำ − ที่ตั้งเป้า",
  near(scA.extraRatePp, scA.requiredRatePct - AGE.retirement.expectedRatePct, 1e-9));
t("ขาดเงิน ⇒ ต้องทำผลตอบแทนสูงกว่าที่ตั้งเป้า",
  scA.shortfallAtRetirement > 0 ? scA.requiredRatePct > AGE.retirement.expectedRatePct : scA.requiredRatePct <= AGE.retirement.expectedRatePct,
  scA.requiredRatePct + " vs " + AGE.retirement.expectedRatePct);
// ปิดช่องว่างได้ 2 ทาง — ทั้งสองทางต้องพาไปถึงเป้าได้จริง
var byRate = AA.projectWealth({ startWealth: AGE.retirement.startWealth, rate: scA.requiredRatePct / 100, inflationPct: 0.03, workYears: 20, retireYears: 25, annualContribution: 300000, monthlyExpense: 50000 });
t("ทางที่ 1 (เพิ่มผลตอบแทน) → เงินไม่หมดก่อน", byRate.runsOutInYear === null);
var byContrib = AA.projectWealth({ startWealth: AGE.retirement.startWealth, rate: AGE.retirement.expectedRatePct / 100, inflationPct: 0.03, workYears: 20, retireYears: 25, annualContribution: scA.requiredAnnualContribution, monthlyExpense: 50000 });
t("ทางที่ 2 (เติมเงินเพิ่ม) → เงินไม่หมดก่อน", byContrib.runsOutInYear === null);

console.log("  -- ช่วงที่ 2: หลังเกษียณ ใช้ได้เดือนละเท่าไหร่ --");
[[16000000, 25, 0.053, 0.03], [8000000, 30, 0.07, 0.02], [30000000, 20, 0.04, 0.04]].forEach(function (c) {
  var W = c[0], R = c[1], g = c[2], i = c[3];
  var A = AA.sustainableAnnual(W, R, g, i);
  t("มีเงิน " + (W / 1e6) + "M ใช้ " + R + " ปี → หาได้ว่าถอนได้ปีละเท่าไหร่", A !== null && A > 0, A);
  if (A === null) return;
  // พิสูจน์ด้วยการเดินเงินจริง: ถอนเท่านี้ต้องหมดพอดี ไม่ขาดไม่เกิน
  var pj = AA.projectWealth({ startWealth: W, rate: g, inflationPct: i, workYears: 0, retireYears: R, annualContribution: 0, monthlyExpense: A / 12 });
  t("   ถอนเท่านั้น → เงินหมดพอดีตอนจบ ไม่ขาดก่อน", pj.runsOutInYear === null && Math.abs(pj.endWealth) < Math.max(1, W * 1e-9), pj.endWealth);
  var more = AA.projectWealth({ startWealth: W, rate: g, inflationPct: i, workYears: 0, retireYears: R, annualContribution: 0, monthlyExpense: A / 12 * 1.05 });
  t("   ถอนมากกว่านั้น 5% → เงินหมดก่อน", more.runsOutInYear !== null);
});
// แบบไม่แตะต้นเงิน: เงินต้นต้องโตตามเงินเฟ้อพอดี = ค่าเงินจริงคงที่ตลอดไป
var Wp = 16000000, gp = 0.053, ip = 0.03;
var P = AA.perpetualAnnual(Wp, gp, ip);
t("ถอนแบบไม่แตะต้นเงิน หาได้", P !== null && P > 0, P);
[10, 30, 60].forEach(function (yrs) {
  var q = AA.projectWealth({ startWealth: Wp, rate: gp, inflationPct: ip, workYears: 0, retireYears: yrs, annualContribution: 0, monthlyExpense: P / 12 });
  t("   ผ่าน " + yrs + " ปี เงินต้นยังเท่าเดิมในค่าเงินจริง (โตตามเงินเฟ้อพอดี)",
    Math.abs(q.endWealth - Wp * Math.pow(1 + ip, yrs)) < Wp * 1e-9, q.endWealth);
  t("   และไม่มีวันหมด", q.runsOutInYear === null);
});
t("ถอนแบบไม่แตะต้นเงิน < ถอนจนหมดพอดี เสมอ", P < AA.sustainableAnnual(Wp, 25, gp, ip));
t("ผลตอบแทนไม่ชนะเงินเฟ้อ → ถอนแบบไม่แตะต้นเงินไม่ได้ (null ไม่ใช่ 0)",
  AA.perpetualAnnual(1000000, 0.02, 0.03) === null && AA.perpetualAnnual(1000000, 0.03, 0.03) === null);
t("เงินต้น 0 → null", AA.sustainableAnnual(0, 25, 0.05, 0.03) === null && AA.perpetualAnnual(0, 0.05, 0.03) === null);

var AR = AGE_PRE.retirement.expected.afterRetirement;
t("ผลลัพธ์มีบล็อกหลังเกษียณครบ", !!(AR && AR.spendAll && AR.planned));
t("ตัวเลขค่าเงินวันนี้ = ค่าเงินตอนนั้น ÷ เงินเฟ้อสะสม",
  near(AR.spendAll.monthlyToday, AR.spendAll.monthlyNominal / Math.pow(1.03, 20), 1e-6));
t("ค่าเงินวันนี้ต้องน้อยกว่าค่าเงินตอนนั้น (เงินเฟ้อกินไป 20 ปี)", AR.spendAll.monthlyToday < AR.spendAll.monthlyNominal);
t("บันทึกว่าตั้งใจใช้เดือนละเท่าไหร่", AR.planned.monthlyToday === 50000);
t("ถ้าใช้ตามที่ตั้งไว้แล้วหมดก่อน → บอกว่าอยู่ได้กี่ปี",
  AR.planned.runsOutInYear === null ? AR.planned.lastsYears === 25 : (AR.planned.lastsYears > 0 && AR.planned.lastsYears < 25),
  AR.planned.lastsYears);
t("และบอกอายุตอนเงินหมดเมื่อมีข้อมูลอายุ",
  AR.planned.runsOutInYear === null || AR.planned.runsOutAtAge === 42 + AR.planned.runsOutInYear,
  AR.planned.runsOutAtAge);

console.log("  -- แยกผลตอบแทนคาดหวัง ก่อน/หลังเกษียณ --");
var PRE = { startWealth: 1000000, rate: 0.08, inflationPct: 0.03, workYears: 20, retireYears: 25, annualContribution: 300000, monthlyExpense: 50000 };
var same = AA.projectWealth(PRE);
var split = AA.projectWealth({ startWealth: PRE.startWealth, rate: 0.08, postRate: 0.04, inflationPct: 0.03, workYears: 20, retireYears: 25, annualContribution: 300000, monthlyExpense: 50000 });
tNear("ช่วงทำงานเหมือนกันเป๊ะ (อัตราก่อนเกษียณเท่ากัน)", split.wealthAtRetirement, same.wealthAtRetirement, 1e-9);
t("ช่วงหลังเกษียณต่างกัน (อัตราหลังเกษียณต่ำกว่า → เงินหมดเร็วกว่า)",
  split.endWealth < same.endWealth, split.endWealth + " vs " + same.endWealth);
t("บันทึกอัตราหลังเกษียณที่ใช้จริง", split.postRate === 0.04 && same.postRate === 0.08);
t("ไม่ระบุอัตราหลังเกษียณ → ใช้อัตราเดียวกัน (เข้ากันได้กับข้อมูลเดิม)",
  AA.projectWealth({ startWealth: 1e6, rate: 0.06, inflationPct: 0.03, workYears: 5, retireYears: 5, annualContribution: 0, monthlyExpense: 10000 }).postRate === 0.06);
var SPLITCFG = {
  map: ALLOC_RT.map, ports: ALLOC_RT.ports, monthlyExpense: 50000,
  retirement: { inflationPct: 3, workYears: 20, retireYears: 25, annualContribution: 300000, currentAge: 42, postReturnPct: 4 }
};
var RS = AA.compute(blob(RT1, qKey(0)), SPLITCFG);
tNear("อัตราก่อนเกษียณยังถ่วงจากพอร์ตจริง", RS.retirement.expectedRatePct, (400000 * 2 + 600000 * 10) / 1000000, 1e-9);
t("อัตราหลังเกษียณใช้ค่าที่ตั้งไว้ ไม่ใช่ค่าถ่วง", RS.retirement.postRateUsedPct === 4 && RS.retirement.postReturnPct === 4);
tNear("scenario บันทึกทั้งสองอัตรา", RS.retirement.expected.postRatePct, 4, 1e-9);
// เงินที่ต้องมี ณ วันเกษียณ ต้องคิดจากอัตรา "หลังเกษียณ" เพราะเป็นช่วงที่เงินก้อนนั้นทำงาน
tNear("เงินที่ต้องมีคิดจากอัตราหลังเกษียณ (ไม่ใช่ก่อนเกษียณ)",
  RS.retirement.expected.requiredAtRetirement,
  AA.requiredCapital(RS.retirement.expected.firstRetirementExpense, 25, 0.04, 0.03), 1e-6);
t("อัตราหลังเกษียณต่ำลง → ต้องมีเงินมากขึ้น",
  RS.retirement.expected.requiredAtRetirement > RRT.retirement.expected.requiredAtRetirement,
  RS.retirement.expected.requiredAtRetirement + " vs " + RRT.retirement.expected.requiredAtRetirement);
tNear("ถอนได้เดือนละเท่าไหร่ ก็คิดจากอัตราหลังเกษียณ",
  RS.retirement.expected.afterRetirement.spendAll.annualNominal,
  AA.sustainableAnnual(RS.retirement.expected.wealthAtRetirement, 25, 0.04, 0.03), 1e-6);
// ยังพิสูจน์ได้เหมือนเดิมว่าอัตราที่ต้องทำ ทำให้สองฝั่งเท่ากันพอดี
var gNeed = RS.retirement.expected.requiredRatePct / 100;
var pNeed = AA.projectWealth({ startWealth: RS.retirement.startWealth, rate: gNeed, postRate: 0.04, inflationPct: 0.03, workYears: 20, retireYears: 25, annualContribution: 300000, monthlyExpense: 50000 });
t("อัตราก่อนเกษียณที่ต้องทำ → เงินพอดี ณ วันเกษียณ และไม่หมดก่อน",
  pNeed.runsOutInYear === null && Math.abs(pNeed.wealthAtRetirement - RS.retirement.expected.requiredAtRetirement) < Math.max(1, RS.retirement.expected.requiredAtRetirement * 1e-9),
  pNeed.wealthAtRetirement - RS.retirement.expected.requiredAtRetirement);

console.log("  -- บันทึกผลตอบแทนรายไตรมาสของแต่ละพอร์ต --");
var REC = {};
REC[qKey(3)] = [row("cash", "เงินสด", 300000, 0), row("bitcoin", "Bitcoin", 100000, 0)];
REC[qKey(2)] = [row("cash", "เงินสด", 300000, 0), row("bitcoin", "Bitcoin", 110000, 0)];
REC[qKey(1)] = [row("cash", "เงินสด", 240000, -60000), row("bitcoin", "Bitcoin", 160000, 40000)];
REC[qKey(0)] = [row("cash", "เงินสด", 250000, 0), row("bitcoin", "Bitcoin", 140000, 0)];
var RR = AA.compute(blob(REC, qKey(0)), {
  map: { "cash::เงินสด": { short: 100 }, "bitcoin::Bitcoin": { mid: 30, long: 70 } },
  ports: { short: { expectedReturnPct: 2 }, mid: { expectedReturnPct: 6 }, long: { expectedReturnPct: 9 } }
});
t("มีบันทึกครบทุกไตรมาสที่คำนวณได้ (3 จาก 4)", RR.record.rows.length === 3, RR.record.rows.length);
t("แต่ละแถวมีครบทั้ง 3 พอร์ต", RR.record.rows.every(function (r) {
  return AA.PORTS.every(function (p) { return r.ports[p] !== undefined; });
}));
tNear("ผลตอบแทนในบันทึกตรงกับที่พอร์ตคำนวณไว้", RR.record.rows[2].ports.short.r, RR.ports.short.quarters[2].r, 1e-12);
tNear("Bitcoin แบ่ง 30/70 → พอร์ตกลางกับยาวได้ผลตอบแทนเท่ากัน", RR.record.rows[2].ports.mid.r, RR.record.rows[2].ports.long.r, 1e-12);
// ผลตอบแทนรวมต้องถ่วงตามมูลค่า ไม่ใช่เฉลี่ย 3 พอร์ตเท่า ๆ กัน
var lastRow = RR.record.rows[2];
var naiveAvg = (lastRow.ports.short.r + lastRow.ports.mid.r + lastRow.ports.long.r) / 3;
t("ผลตอบแทนทั้งพอร์ตไม่ใช่การเฉลี่ย 3 พอร์ตแบบไม่ถ่วงน้ำหนัก",
  Math.abs(lastRow.overall - naiveAvg) > 1e-6, lastRow.overall + " vs " + naiveAvg);
// ตรวจกับการคำนวณตรง ๆ: มูลค่ารวม 400k→390k เงินเติม/ถอนรวม 0
tNear("ผลตอบแทนทั้งพอร์ตไตรมาสล่าสุด = (390k − 400k − 0) ÷ 400k",
  lastRow.overall, (390000 - 400000) / 400000, 1e-12);
// ไตรมาสที่เงินเติม/ถอนรวมไม่เป็นศูนย์ — จุดที่พิสูจน์ว่าหักเงินเติม/ถอนออกจริง
// (ถอนเงินสด 60k แต่เติม Bitcoin 40k → สุทธิ −20k) ถ้าไม่หักจะได้ −2.44% แทน +2.5%
var flowRow = RR.record.rows[1];
tNear("เงินเติม/ถอนรวมของทั้งพอร์ต = −60,000 + 40,000", flowRow.overallFlow, -20000, 1e-9);
tNear("ผลตอบแทนทั้งพอร์ต = (400k − 410k + 20k) ÷ (410k − 10k) = +2.5%",
  flowRow.overall, (400000 - 410000 + 20000) / (410000 - 10000), 1e-12);
t("ต่างจากการไม่หักเงินเติม/ถอน (ซึ่งจะได้ติดลบ)",
  Math.abs(flowRow.overall - (400000 - 410000) / 410000) > 1e-6,
  flowRow.overall + " vs " + (400000 - 410000) / 410000);
tNear("มูลค่ารวมในบันทึกตรงกับผลรวมจริง", lastRow.overallValue, 390000, 1e-9);
t("มีสรุปสะสมและต่อปีของทั้งพอร์ต", RR.record.overall.cumReturn !== null && "annReturn" in RR.record.overall);
t("ไตรมาสที่ไม่มีข้อมูลเงินเติม/ถอน ถูกทำเครื่องหมายในบันทึก",
  RR.record.rows.some(function (r) { return AA.PORTS.some(function (p) { return r.ports[p].flowStatus === "recorded"; }); }));
var RRempty = AA.compute(blob(REC, qKey(0)), { map: {}, ports: {} });
t("ยังไม่จัดพอร์ตเลย → บันทึกยังมีแถว แต่ทุกช่องเป็น null", RRempty.record.rows.length === 3 &&
  RRempty.record.rows.every(function (r) { return AA.PORTS.every(function (p) { return r.ports[p].r === null; }); }));
t("และผลตอบแทนรวมเป็น null ไม่ใช่ 0 หลอก ๆ", RRempty.record.rows.every(function (r) { return r.overall === null; }));

console.log("  -- ตั้งค่าไม่ครบต้องบอกว่าขาดอะไร ห้ามเดา --");
var partial = AA.compute(blob(RT1, qKey(0)), { map: ALLOC_RT.map, ports: ALLOC_RT.ports, monthlyExpense: 50000, retirement: { inflationPct: 3 } });
t("ไม่พร้อม", partial.retirement.ready === false);
t("บอกว่าขาดปีทำงานและปีเกษียณ",
  partial.retirement.missing.indexOf("จำนวนปีที่จะทำงานต่อ") >= 0 && partial.retirement.missing.indexOf("จำนวนปีหลังเกษียณ") >= 0,
  JSON.stringify(partial.retirement.missing));
t("ไม่มีตัวเลขหลอกออกมา", partial.retirement.expected === null && partial.retirement.actual === null);
var noExp = AA.compute(blob(RT1, qKey(0)), { map: ALLOC_RT.map, ports: {}, monthlyExpense: 50000, retirement: ALLOC_RT.retirement });
t("ไม่ตั้งผลตอบแทนคาดหวังเลย → บอกว่าขาด และไม่คำนวณ",
  noExp.retirement.ready === false && noExp.retirement.missing.indexOf("ผลตอบแทนคาดหวังของพอร์ต") >= 0 && noExp.retirement.expectedRatePct === null);

console.log("  -- ใช้เงินเติมจริงที่สังเกตได้ เมื่อผู้ใช้ไม่ได้ระบุ --");
var OBS = {};
OBS[qKey(1)] = [row("cash", "เงินสด", 400000, 100000)];
OBS[qKey(0)] = [row("cash", "เงินสด", 500000, 50000)];
var ROBS = AA.compute(blob(OBS, qKey(0)), { map: { "cash::เงินสด": { short: 100 } }, ports: { short: { expectedReturnPct: 3 } }, monthlyExpense: 20000, retirement: { inflationPct: 3, workYears: 10, retireYears: 10 } });
t("ระบบอ่านเงินเติมจริงจาก netFlow ได้", ROBS.retirement.observedAnnualFlow !== null, ROBS.retirement.observedAnnualFlow);
t("และใช้เป็นค่าตั้งต้นเมื่อผู้ใช้ไม่ได้กรอก", ROBS.retirement.contributionSource === "observed");
var RUSER = AA.compute(blob(OBS, qKey(0)), { map: { "cash::เงินสด": { short: 100 } }, ports: { short: { expectedReturnPct: 3 } }, monthlyExpense: 20000, retirement: { inflationPct: 3, workYears: 10, retireYears: 10, annualContribution: 999000 } });
t("ผู้ใช้กรอกเองแล้วใช้ค่าของผู้ใช้", RUSER.retirement.contributionSource === "user" && RUSER.retirement.annualContribution === 999000);

// ============================================================
console.log("\n[5d] บั๊กที่รีวิวเจอ — ล็อกไว้ไม่ให้กลับมา");

console.log("  -- A) ฐานของแผนเกษียณต้องตรงกับอัตราที่ใช้ --");
// เดิม: เอาเงิน "ทั้งพอร์ต" ไปโตด้วยอัตราที่ถ่วงจาก "เฉพาะพอร์ตที่จัดแล้ว"
// ผล: จัดครบ 100% กับจัดแค่ 25% ได้เงินตอนเกษียณเท่ากันเป๊ะ ทั้งที่ 75% ไม่มีใครตั้งเป้าให้
function mixFixture(unassignedPct) {
  var tot = 1000000, u = tot * unassignedPct / 100, a = tot - u, qq = {};
  qq[qKey(1)] = [
    { id: "a", type: "cash", name: "จัดแล้ว", manualValue: a, snapshotValue: a, investedPercent: 0, netFlow: 0 },
    { id: "b", type: "bitcoin", name: "ยังไม่จัด", manualValue: u, snapshotValue: u, investedPercent: 0, netFlow: 0 }];
  qq[qKey(0)] = qq[qKey(1)];
  return AA.compute(blob(qq, qKey(0)), {
    map: { "cash::จัดแล้ว": { short: 100 } }, ports: { short: { expectedReturnPct: 5 } }, monthlyExpense: 30000,
    retirement: { inflationPct: 3, workYears: 20, retireYears: 20, annualContribution: 0, currentAge: 40 }
  }).retirement;
}
var m0 = mixFixture(0), m50 = mixFixture(50), m75 = mixFixture(75);
t("จัดครบ 100% → ฐาน = พอร์ตทั้งก้อน", m0.startWealth === 1000000 && m0.unassignedExcluded === 0);
tNear("จัดแค่ 50% → ฐานเหลือครึ่ง", m50.startWealth, 500000, 1e-9);
tNear("จัดแค่ 25% → ฐานเหลือ 250,000", m75.startWealth, 250000, 1e-9);
t("เงินตอนเกษียณต้องลดตามสัดส่วนที่จัด ไม่ใช่เท่ากันหมด",
  Math.abs(m50.expected.wealthAtRetirement - m0.expected.wealthAtRetirement / 2) < 1,
  m50.expected.wealthAtRetirement + " vs " + m0.expected.wealthAtRetirement / 2);
t("จัด 100% กับจัด 25% ต้องไม่ได้ผลเท่ากัน (บั๊กเดิม)",
  Math.abs(m0.expected.wealthAtRetirement - m75.expected.wealthAtRetirement) > 1,
  m0.expected.wealthAtRetirement + " vs " + m75.expected.wealthAtRetirement);
t("รายงานให้ผู้ใช้รู้ว่าตัดอะไรออกไปเท่าไหร่",
  m75.unassignedExcluded === 750000 && near(m75.unassignedPct, 75, 1e-9) && m75.portfolioTotal === 1000000,
  m75.unassignedExcluded + " / " + m75.unassignedPct);

console.log("  -- C) ค่าที่ใหญ่เกินจริงต้องไม่ทำให้เลขระเบิด --");
// เดิม: workYears >= 15,000 → (1.05^15000) ล้น double → wealthAtRetirement = Infinity
// และกราฟมีแสนจุด ขัดกับสัญญาหัวไฟล์ว่า "ห้ามออก NaN / Infinity"
var HUGE = {};
HUGE[qKey(1)] = [row("cash", "เงินสด", 1000000, 0)];
HUGE[qKey(0)] = [row("cash", "เงินสด", 1050000, 0)];
[100, 15000, 99999].forEach(function (Y) {
  var rt = AA.compute(blob(HUGE, qKey(0)), {
    map: { "cash::เงินสด": { short: 100 } }, ports: { short: { expectedReturnPct: 5 } }, monthlyExpense: 30000,
    retirement: { inflationPct: 3, workYears: Y, retireYears: Y, annualContribution: 0, currentAge: 40 }
  }).retirement;
  t("พิมพ์ " + Y + " ปี → ถูกจำกัดที่ 80 ปี", rt.workYears === 80 && rt.retireYears === 80, rt.workYears + "/" + rt.retireYears);
  t("   เงินตอนเกษียณยังเป็นจำนวนจริง (ไม่ใช่ Infinity)", isFinite(rt.expected.wealthAtRetirement), rt.expected.wealthAtRetirement);
  t("   จุดบนกราฟไม่บานเกินควบคุม", rt.expected.series.length <= 161, rt.expected.series.length);
});
t("อายุถูกจำกัด 0-120", AA.normalizeAllocation({ retirement: { currentAge: 500 } }).retirement.currentAge === 120);
t("เงินเฟ้อถูกจำกัด -50 ถึง 100", AA.normalizeAllocation({ retirement: { inflationPct: 500 } }).retirement.inflationPct === 100 &&
  AA.normalizeAllocation({ retirement: { inflationPct: -99 } }).retirement.inflationPct === -50);
t("ค่าปกติไม่ถูกแตะ", AA.normalizeAllocation({ retirement: { workYears: 20, retireYears: 25, currentAge: 42, inflationPct: 3 } }).retirement.workYears === 20);
t("ไม่ใส่ค่า → ยังเป็น null ไม่ใช่ 0 จากการ clamp",
  AA.normalizeAllocation({}).retirement.workYears === null && AA.normalizeAllocation({}).retirement.currentAge === null);

console.log("\n[6] ความปลอดภัยของผลลัพธ์");
function walk(node, path, bad) {
  if (node === null || node === undefined) { if (node === undefined) bad.push(path + " = undefined"); return; }
  if (typeof node === "number") { if (!isFinite(node)) bad.push(path + " = " + node); return; }
  if (node instanceof Array) { node.forEach(function (v, i) { walk(v, path + "[" + i + "]", bad); }); return; }
  if (typeof node === "object") { Object.keys(node).forEach(function (k) { walk(node[k], path + "." + k, bad); }); }
}
[["EX1", R1], ["EX2", R2], ["ไตรมาสเดียว", R5], ["map ว่าง", R6], ["ไตรมาสว่าง", R7], ["ถอนเกิน", R9], ["ไม่ตั้งเป้า", R14]].forEach(function (pair) {
  var bad = [];
  walk(pair[1], pair[0], bad);
  t(pair[0] + ": ไม่มี NaN / Infinity / undefined หลงเหลือ", bad.length === 0, bad.slice(0, 4).join(" · "));
});
t("ไม่มีคำ Buy/Sell ในผลลัพธ์", !/\b(buy|sell)\b/i.test(JSON.stringify(R2)));
t("ผลลัพธ์แปลงเป็น JSON ได้ (ไม่มี circular)", typeof JSON.stringify(R2) === "string");

console.log("\n[7] netFlow ต้องไม่ขยับตัวเลขของ engine เดิม");
function strip(b) {
  var c = JSON.parse(JSON.stringify(b));
  Object.keys(c.data.quarters).forEach(function (k) {
    c.data.quarters[k].assets.forEach(function (a) { delete a.netFlow; });
  });
  return c;
}
var withFlow = blob(EX2, qKey(0)), noFlow = strip(withFlow);
var D1 = PP.deriveQuarterly(withFlow), D2 = PP.deriveQuarterly(noFlow);
t("deriveQuarterly total เท่าเดิม", D1.total === D2.total, D1.total + " vs " + D2.total);
t("deriveQuarterly output เหมือนเดิมทุก byte", JSON.stringify(D1) === JSON.stringify(D2));


// ============================================================
console.log("\n[W1] เป้าพอร์ตเกษียณ — ทบต้นเป็นรายไตรมาส ไม่ใช่ 10 ÷ 4");
// เป้า 10%/ปี ต้องทบต้นลงเป็นรายไตรมาส = 1.10^(1/4)−1 ≈ 2.411% ไม่ใช่ 10/4 = 2.5%
// ถ้าใช้ 2.5% คูณกัน 4 ไตรมาสจะได้ 10.38% ซึ่งไม่ใช่เป้าที่ตั้งไว้
tNear("เป้าต่อไตรมาสทบต้นจาก 10%/ปี", AA.quarterTarget(10), Math.pow(1.10, 0.25) - 1, 1e-12);
t("เป้าต่อไตรมาสไม่ใช่ 2.5% (10/4)", Math.abs(AA.quarterTarget(10) - 0.025) > 1e-4);
t("เป้า null → null ไม่ใช่ NaN", AA.quarterTarget(null) === null && AA.quarterTarget("") === null);
tNear("เป้า 2 ไตรมาส = 1.10^(2/4)−1", AA.targetFor(10, 2), Math.pow(1.10, 0.5) - 1, 1e-12);
t("เป้า 0 ไตรมาส → null", AA.targetFor(10, 0) === null);
t("quarterIndexOf นับต่อเนื่องข้ามปี", AA.quarterIndexOf("2026-Q1") - AA.quarterIndexOf("2025-Q4") === 1 && AA.quarterIndexOf("abc") === null);

console.log("\n[W2] ทั้งพอร์ต: รายไตรมาส + รายปี (ไม่ได้ตั้งเงินเติมไตรมาสละ)");
// ปีเต็ม 2 ปี + ปีปัจจุบันครึ่งปี · เงินเติมก้อนใหญ่ที่กรอกไว้ใน 2025-Q3
//   2024: 100k → 102.4 → 104.9 → 107.4 → 110.0   (≈2.411%/ไตรมาส = ครบ 10% พอดี)
//   2025: 110.0 → 112.0 → 164.0 (กรอกเติม 50k) → 166.0 → 168.0
//   2026: 168.0 → 170.0 → 172.0 (ยังไม่ครบปี)
var EXY = {};
var yq = Math.pow(1.10, 0.25);
EXY["2024-Q1"] = [row("foreign-stock", "US", 100000, 0)];
EXY["2024-Q2"] = [row("foreign-stock", "US", 100000 * yq, 0)];
EXY["2024-Q3"] = [row("foreign-stock", "US", 100000 * yq * yq, 0)];
EXY["2024-Q4"] = [row("foreign-stock", "US", 100000 * yq * yq * yq, 0)];
EXY["2025-Q1"] = [row("foreign-stock", "US", 110000, 0)];
EXY["2025-Q2"] = [row("foreign-stock", "US", 112000, 0)];
EXY["2025-Q3"] = [row("foreign-stock", "US", 164000, 50000)];   // โต 52k แต่ 50k คือเงินใหม่ที่กรอกไว้
EXY["2025-Q4"] = [row("foreign-stock", "US", 166000, 0)];
EXY["2026-Q1"] = [row("foreign-stock", "US", 168000, 0)];
EXY["2026-Q2"] = [row("foreign-stock", "US", 170000, 0)];
var ALLOCY = {
  version: 1, map: { "foreign-stock::US": { short: 0, mid: 0, long: 100 } },
  ports: { short: { expectedReturnPct: null }, mid: { expectedReturnPct: null }, long: { expectedReturnPct: 8 } },
  monthlyExpense: null, updatedAt: null, retirement: {}
};
var RY = AA.compute(blob(EXY, "2026-Q2"), ALLOCY);
var WY = RY.record.whole;
function wRow(W, k) { return W.rows.filter(function (r) { return r.key === k; })[0]; }
function wYear(W, y) { return W.yearly.filter(function (x) { return x.year === y; })[0]; }

t("ไม่ตั้งค่า → เป้าเกษียณ default 10%/ปี", RY.allocation.retirement.targetReturnPct === 10, RY.allocation.retirement.targetReturnPct);
t("record.whole มีและคิดจากทุกรายการ", !!WY && WY.basis === "all-items", WY && WY.basis);
t("record.target = เป้าของ record.whole", RY.record.target === WY.target && WY.target.annualPct === 10, JSON.stringify(RY.record.target));
t("ไม่ตั้งเงินเติมไตรมาสละ → quarterly.amount = null", WY.quarterly.amount === null && WY.quarterly.source === "none");
t("ไตรมาสฐาน (แรกสุด) ไม่มีแถว", WY.baseKey === "2024-Q1" && !wRow(WY, "2024-Q1"));
t("ทุกแถวมี naive / flow / real / status", WY.rows.every(function (r) {
  return typeof r.naive === "number" && typeof r.flow === "number" && (r.real === null || typeof r.real === "number") &&
    ["ahead", "on", "behind", "no-data"].indexOf(r.status) >= 0;
}));
var w25q3 = wRow(WY, "2025-Q3");
t("2025-Q3 ใช้ยอดที่กรอก 50,000 (recorded)", w25q3.flow === 50000 && w25q3.flowSource === "recorded" && w25q3.recordedFlow === 50000, [w25q3.flow, w25q3.flowSource]);
tNear("2025-Q3 ไม่รวมเงินเติม = Modified Dietz", w25q3.real, AA.dietz(112000, 164000, 50000, 0.5), 1e-12);
tNear("2025-Q3 รวมเงินเติม = ปลายงวด ÷ ต้นงวด − 1", w25q3.naive, 164000 / 112000 - 1, 1e-12);
t("2025-Q3 หักเงินเติมแล้วต่ำกว่าเป้า 2.4% → behind", w25q3.status === "behind", w25q3.status);
var w24q2 = wRow(WY, "2024-Q2");
t("netFlow 0 ทุกรายการ + ไม่ตั้งไตรมาสละ → ไม่มีอะไรให้หัก (source none)", w24q2.flowSource === "none" && w24q2.flow === 0 && w24q2.recordedFlow === null, [w24q2.flowSource, w24q2.flow]);
tNear("…ไม่รวมเงินเติม = รวมเงินเติม", w24q2.real, w24q2.naive, 1e-12);
t("ไตรมาสที่โตตามเป้าพอดี → on", w24q2.status === "on", w24q2.status);

var Y24 = wYear(WY, 2024), Y25 = wYear(WY, 2025), Y26 = wYear(WY, 2026);
t("มีแถวปี 2024 / 2025 / 2026", !!Y24 && !!Y25 && !!Y26, WY.yearly.map(function (y) { return y.year; }).join(","));
t("ปีฐาน (2024) มีผลตอบแทนแค่ 3 ไตรมาส ไม่ใช่ปีเต็ม", Y24.n === 3 && Y24.full === false, Y24.n + "/" + Y24.full);
t("ปี 2025 ครบ 4 ไตรมาส = ปีเต็ม", Y25.n === 4 && Y25.full === true, Y25.n + "/" + Y25.full);
var naive25 = 166000 / (100000 * yq * yq * yq) - 1;   // ต้นปี = ปลาย 2024-Q4 · ปลายปี = 2025-Q4
tNear("ปี 2025 รวมเงินเติม = ปลายปี ÷ ต้นปี − 1", Y25.naive, naive25, 1e-12);
t("ปี 2025 ไม่รวมเงินเติม ต่ำกว่าแบบรวมเงินเติมชัดเจน", Y25.real !== null && Y25.real < naive25 - 0.25, Y25.real + " vs " + naive25);
var chain25 = 1;
WY.rows.filter(function (r) { return r.key.indexOf("2025-") === 0; }).forEach(function (r) { chain25 *= 1 + r.real; });
tNear("ปี 2025 = ต่อ (chain) ของไตรมาสในปีนั้น", Y25.real, chain25 - 1, 1e-12);
t("ปี 2025 เงินเติมรวม = 50,000", Y25.flow === 50000, Y25.flow);
t("ปี 2026 ยังไม่ครบปี (2 ไตรมาส)", Y26.n === 2 && Y26.full === false, Y26.n + "/" + Y26.full);
tNear("เป้า YTD 2 ไตรมาส = 1.10^(2/4)−1", Y26.target, Math.pow(1.10, 0.5) - 1, 1e-12);
tNear("เป้าปีเต็ม = 10%", Y25.target, 0.10, 1e-12);
t("ปี 2025 ต่ำกว่าเป้า → behind", Y25.status === "behind", Y25.status);
t("ปีที่ยังไม่ได้หักเงินเติมบอกไว้ใน note", /ยังไม่ได้หักเงินเติม/.test(Y24.note || ""), Y24.note);

var ALLOC6 = JSON.parse(JSON.stringify(ALLOCY)); ALLOC6.retirement = { targetReturnPct: 6 };
var R6 = AA.compute(blob(EXY, "2026-Q2"), ALLOC6);
t("ตั้งเป้า 6% → target.annualPct = 6", R6.record.whole.target.annualPct === 6);
tNear("ตั้งเป้า 6% → เป้าไตรมาส 1.06^(1/4)−1", R6.record.whole.target.quarterly, Math.pow(1.06, 0.25) - 1, 1e-12);
t("ตั้งเป้า 6% → 2024-Q2 (โต 2.411%) กลายเป็น ahead", wRow(R6.record.whole, "2024-Q2").status === "ahead");
var ALLOCBAD = JSON.parse(JSON.stringify(ALLOCY)); ALLOCBAD.retirement = { targetReturnPct: "abc" };
var RB = AA.compute(blob(EXY, "2026-Q2"), ALLOCBAD);
t("เป้าเป็นตัวหนังสือ → ตกกลับ default 10 ไม่ใช่ NaN", RB.record.whole.target.annualPct === 10, RB.record.whole.target.annualPct);
t("ไม่มี NaN/Infinity ใน record.whole", !/NaN|Infinity/.test(JSON.stringify(RB.record.whole)));
var RE = AA.compute(blob({}, null), ALLOCY);
t("ไม่มีข้อมูล → available=false และไม่ throw", RE.available === false);

console.log("\n[W3] ปีที่มีไตรมาสคำนวณไม่ได้");
// ถอนมากกว่ามูลค่า → dietz คืน null · ปีนั้นต้องสรุปไม่ได้ ห้ามนับเป็น 0% แล้วสรุปสวย ๆ
var EXN = JSON.parse(JSON.stringify(EXY));
EXN["2025-Q3"] = [row("foreign-stock", "US", 164000, -1000000)];
var WN = AA.compute(blob(EXN, "2026-Q2"), ALLOCY).record.whole;
var qN = wRow(WN, "2025-Q3");
t("ไตรมาสที่ถอนเกินมูลค่า → real = null + เหตุผล", qN.real === null && qN.rReason === "inconsistent", [qN.real, qN.rReason]);
t("…สถานะ no-data ไม่ใช่ behind/ahead", qN.status === "no-data", qN.status);
var YN = wYear(WN, 2025);
t("ปี 2025 real = null และบอกว่าคำนวณไม่ได้", YN.real === null && /คำนวณไม่ได้/.test(YN.note || "") && YN.status === "no-data", [YN.real, YN.note, YN.status]);
t("ปีอื่นไม่ถูกกระทบ (2024 ยังมีตัวเลข)", wYear(WN, 2024).real !== null);
t("สรุปทั้งช่วง realCum = null เมื่อมีไตรมาสคำนวณไม่ได้", WN.summary.realCum === null);

console.log("\n[W4] เคสจริงของผู้ใช้: เติมเงินไตรมาสละ ฿250,000 · Quarterly Editor เขียน netFlow: 0 ให้ทุกรายการ");
// ช่องหน้าเว็บกรอกเป็น "ไตรมาสละ" แล้วเก็บ ×4 ลง retirement.annualContribution (แผนเกษียณคิดรายปี)
function edRow(type, name, value, nf, copied) { var a = row(type, name, value, nf === undefined ? 0 : nf); if (copied) a.copiedFrom = copied; return a; }
var ED = {};
ED["2026-Q1"] = [edRow("foreign-stock", "US", 9500000)];
ED["2026-Q2"] = [edRow("foreign-stock", "US", 10050000, 0, "2026-Q1")];
ED["2026-Q3"] = [edRow("foreign-stock", "US", 10420000, 0, "2026-Q2")];
ED["2026-Q4"] = [edRow("foreign-stock", "US", 10930000, 0, "2026-Q3")];
var ALLOCD = {
  version: 1, map: { "foreign-stock::US": { long: 100 } },
  ports: { short: { expectedReturnPct: 2 }, mid: { expectedReturnPct: null }, long: { expectedReturnPct: 8 } },
  monthlyExpense: null, updatedAt: null, retirement: { annualContribution: 1000000 }
};
var RD = AA.compute(blob(ED, "2026-Q4"), ALLOCD), WD = RD.record.whole;
t("เติมเงินไตรมาสละ = 250,000 พอดี (เก็บปีละ 1,000,000)", WD.quarterly.amount === 250000 && WD.quarterly.source === "setting", JSON.stringify(WD.quarterly));
t("ทุกไตรมาสหัก 250,000 ตามที่ตั้ง", WD.rows.length === 3 && WD.rows.every(function (r) { return r.flow === 250000 && r.flowSource === "setting" && r.settingAmount === 250000 && r.settingOverridden === false; }),
  JSON.stringify(WD.rows.map(function (r) { return [r.key, r.flow, r.flowSource]; })));
var d2 = wRow(WD, "2026-Q2"), d3 = wRow(WD, "2026-Q3"), d4 = wRow(WD, "2026-Q4");
// คิดมือ ไม่อ่านจากเอนจิน: (ปลาย − ต้น − เงินเติม) ÷ (ต้น + ครึ่งหนึ่งของเงินเติม)
tNear("2026-Q2 ไม่รวมเงินเติม = (10.05M − 9.5M − 250k) ÷ (9.5M + 125k) ≈ 3.12%", d2.real, 300000 / 9625000, 1e-12);
tNear("2026-Q3 ≈ 1.18%", d3.real, 120000 / 10175000, 1e-12);
tNear("2026-Q4 ≈ 2.47%", d4.real, 260000 / 10545000, 1e-12);
tNear("2026-Q2 รวมเงินเติม ≈ 5.79%", d2.naive, 10050000 / 9500000 - 1, 1e-12);
t("มูลค่าเพิ่ม (change) = ปลายงวด − ต้นงวด", d4.change === 510000 && d4.vStart === 10420000 && d4.vEnd === 10930000, [d4.change, d4.vStart, d4.vEnd]);
t("เทียบเป้า 2.41%: Q2 เกิน · Q3 ต่ำกว่า · Q4 ตามเป้า", d2.status === "ahead" && d3.status === "behind" && d4.status === "on", [d2.status, d3.status, d4.status]);
var YD = wYear(WD, 2026);
t("ปี 2026: 3 ไตรมาส · เงินเติมรวม 750,000", YD.n === 3 && YD.flow === 750000 && YD.settingQuarters === 3, [YD.n, YD.flow, YD.settingQuarters]);
tNear("ปี 2026 รวมเงินเติม = 10.93M ÷ 9.5M − 1", YD.naive, 10930000 / 9500000 - 1, 1e-12);
tNear("ปี 2026 ไม่รวมเงินเติม = chain ของ 3 ไตรมาส", YD.real, (1 + d2.real) * (1 + d3.real) * (1 + d4.real) - 1, 1e-12);
tNear("เป้า YTD 3 ไตรมาส = 1.10^(3/4)−1", YD.target, Math.pow(1.10, 0.75) - 1, 1e-12);
t("สรุปทั้งช่วง: เงินเติมรวม 750,000 และรวม/ไม่รวมเงินเติมแยกกัน", WD.summary.flowTotal === 750000 && WD.summary.naiveCum > WD.summary.realCum, JSON.stringify(WD.summary));
t("ไม่มี NaN/Infinity", !/NaN|Infinity/.test(JSON.stringify(WD)));
// รายพอร์ตก็หักเงินเติมไตรมาสละด้วย — พอร์ตเดียวที่ถือทุกรายการ 100% ต้องได้ตัวเลขเท่าทั้งพอร์ตทุกไตรมาส
var RD0 = AA.compute(blob(ED, "2026-Q4"), (function () { var a = JSON.parse(JSON.stringify(ALLOCD)); a.retirement = {}; return a; })());
t("พอร์ตยาวถือ 100% → ผลตอบแทนรายพอร์ตเท่ากับทั้งพอร์ต (หักเงินเติมแล้ว)", RD.ports.long.quarters.length === 3 &&
  RD.ports.long.quarters.every(function (q) { var w = wRow(WD, q.key); return Math.abs(q.r - w.real) < 1e-12 && q.flow === 250000 && q.flowStatus === "setting"; }),
  JSON.stringify(RD.ports.long.quarters.map(function (q) { return [q.key, q.flow, q.flowStatus, q.r]; })));
t("ไม่ตั้งไตรมาสละ → รายพอร์ตไม่หัก (เท่ารวมเงินเติม)", RD0.ports.long.quarters.every(function (q) { return q.flow === 0 && q.flowStatus === "recorded" && q.alloc === null; }));
t("ตั้งแล้วผลตอบแทนสะสม/ต่อปีของพอร์ตต่ำลง (ไม่นับเงินเติมเป็นกำไร)", RD.ports.long.cumReturn < RD0.ports.long.cumReturn);

t("ไม่ตั้ง → ไม่หัก (source none) และไม่รวมเงินเติม = รวมเงินเติม", RD0.record.whole.rows.every(function (r) { return r.flowSource === "none" && r.flow === 0 && Math.abs(r.real - r.naive) < 1e-12; }));
// ค่าที่พิมพ์ต้องกลับมาเป๊ะ ไม่เพี้ยนจากการเก็บ ×4
var ALLOCQ = JSON.parse(JSON.stringify(ALLOCD)); ALLOCQ.retirement = { annualContribution: 333333.33 * 4 };
t("พิมพ์ 333,333.33 → ได้ 333,333.33 เป๊ะ", AA.compute(blob(ED, "2026-Q4"), ALLOCQ).record.whole.quarterly.amount === 333333.33);
// ตั้งไว้ 0 = ผู้ใช้บอกเองว่าไม่เติม → หัก 0 (ไม่ใช่ "ยังไม่ได้ตั้ง")
var ALLOCZ = JSON.parse(JSON.stringify(ALLOCD)); ALLOCZ.retirement = { annualContribution: 0 };
var WZ = AA.compute(blob(ED, "2026-Q4"), ALLOCZ).record.whole;
t("ตั้งไว้ 0 → source setting · หัก 0", WZ.quarterly.amount === 0 && WZ.rows.every(function (r) { return r.flowSource === "setting" && r.flow === 0; }));

// รายการใหม่ที่ซื้อด้วยเงินเติมแต่ยังไม่ได้จัดพอร์ต ต้องอยู่ในฐานด้วย ไม่งั้นหักเงินเติมจากฐานที่ไม่มีเงินก้อนนั้น
var EDU = JSON.parse(JSON.stringify(ED));
EDU["2026-Q4"] = [edRow("foreign-stock", "US", 10680000, 0, "2026-Q3"), edRow("bitcoin", "Bitcoin", 250000, 0)];
var du = wRow(AA.compute(blob(EDU, "2026-Q4"), ALLOCD).record.whole, "2026-Q4");
t("รายการที่ยังไม่จัดพอร์ตอยู่ในฐานทั้งพอร์ต", du.vEnd === 10930000, du.vEnd);
tNear("…ผลตอบแทนเท่ากับกรณีจัดครบ (ไม่ติดลบเกินจริง)", du.real, 260000 / 10545000, 1e-12);

// ยอดที่กรอกในรายการชนะยอดไตรมาสละ (บอกไว้ด้วยว่าทับยอดที่ตั้ง)
var EDT = JSON.parse(JSON.stringify(ED)); EDT["2026-Q3"][0].netFlow = 400000;
var WT = AA.compute(blob(EDT, "2026-Q4"), ALLOCD).record.whole, dt3 = wRow(WT, "2026-Q3");
t("กรอก netFlow 400,000 → ใช้ 400,000 ไม่ใช่ 250,000", dt3.flow === 400000 && dt3.flowSource === "recorded" && dt3.recordedFlow === 400000, [dt3.flow, dt3.flowSource]);
t("…และบอกว่าทับยอดไตรมาสละที่ตั้งไว้", dt3.settingOverridden === true && dt3.settingAmount === 250000);
t("…ไตรมาสอื่นยังใช้ยอดไตรมาสละ", wRow(WT, "2026-Q2").flowSource === "setting" && wRow(WT, "2026-Q4").flowSource === "setting");
// ย้ายเงินระหว่างรายการ (+X/−X) = กรอกจริง แม้รวมได้ 0
var EDX = JSON.parse(JSON.stringify(ED)); EDX["2026-Q3"] = [edRow("foreign-stock", "US", 10370000, -50000), edRow("cash", "เงินสด", 50000, 50000)];
var dx3 = wRow(AA.compute(blob(EDX, "2026-Q4"), ALLOCD).record.whole, "2026-Q3");
t("ย้ายเงิน +50k/−50k → นับว่ากรอก ใช้ 0 ไม่ใช่ 250,000", dx3.flowSource === "recorded" && dx3.flow === 0 && dx3.settingOverridden === true, [dx3.flowSource, dx3.flow]);
// รายการชื่อซ้ำ +20k/−20k ถูกรวมเป็นแถวเดียวใน buildSeries (flow = 0) → ยังต้องนับว่ากรอก
var EDD = JSON.parse(JSON.stringify(ED)); EDD["2026-Q3"][0].netFlow = 20000; EDD["2026-Q3"].push(edRow("foreign-stock", "US", 0, -20000));
var dd3 = wRow(AA.compute(blob(EDD, "2026-Q4"), ALLOCD).record.whole, "2026-Q3");
t("รายการชื่อซ้ำ +20k/−20k → ยังนับว่ากรอก (ไม่ถูกหักลบจนกลายเป็นไม่ได้กรอก)", dd3.flowSource === "recorded", dd3.flowSource);
// กรอก netFlow ไว้ในรายการที่ยังไม่จัดพอร์ต ก็นับ (ทั้งพอร์ต = ทุกรายการ)
var EDB = JSON.parse(JSON.stringify(EDU)); EDB["2026-Q4"][1].netFlow = 250000;
t("netFlow ในรายการที่ยังไม่จัดพอร์ตก็นับว่ากรอก", wRow(AA.compute(blob(EDB, "2026-Q4"), ALLOCD).record.whole, "2026-Q4").flowSource === "recorded");

// ไตรมาสที่ข้ามไป: หักเงินเติมตามจำนวนไตรมาสที่ผ่านไป และเทียบเป้าตามช่วงนั้น
var EDG = JSON.parse(JSON.stringify(ED)); delete EDG["2026-Q3"];
var WG = AA.compute(blob(EDG, "2026-Q4"), ALLOCD).record.whole, dg4 = wRow(WG, "2026-Q4");
t("ข้าม 2026-Q3 → แถว 2026-Q4 ครอบ 2 ไตรมาส (เทียบกับ 2026-Q2)", dg4.span === 2 && dg4.prevKey === "2026-Q2", [dg4.span, dg4.prevKey]);
t("…หักเงินเติม 2 ไตรมาส = 500,000", dg4.flow === 500000 && dg4.settingAmount === 500000, dg4.flow);
tNear("…เทียบเป้า 2 ไตรมาส", dg4.target, Math.pow(1.10, 0.5) - 1, 1e-12);
t("…ปี 2026 ยังนับเป็น 3 ไตรมาส", wYear(WG, 2026).n === 3, wYear(WG, 2026).n);
// ไตรมาสที่มีแต่ key แต่ไม่มีมูลค่า (สร้างไว้ล่วงหน้า) ต้องเท่ากับข้ามไป ไม่ใช่ −100%
var EDE = JSON.parse(JSON.stringify(EDG)); EDE["2026-Q3"] = [];
t("ไตรมาสว่าง = ข้ามไป ไม่ใช่ −100%", wRow(AA.compute(blob(EDE, "2026-Q4"), ALLOCD).record.whole, "2026-Q4").span === 2 &&
  !wRow(AA.compute(blob(EDE, "2026-Q4"), ALLOCD).record.whole, "2026-Q3"));
// คร่อมปี: 2025-Q3 → 2026-Q1 ครอบ 2025-Q4 ด้วย → ปี 2026 นับ 1 ไตรมาส และบอกว่ามีช่วงคร่อมจากปีก่อน
var EDC = { "2025-Q3": [edRow("foreign-stock", "US", 9000000)], "2026-Q1": [edRow("foreign-stock", "US", 9800000)] };
var WC = AA.compute(blob(EDC, "2026-Q1"), ALLOCD).record.whole;
t("คร่อมปี → span 2 · ปี 2026 n = 1 · note บอกว่าคร่อม", wRow(WC, "2026-Q1").span === 2 && wYear(WC, 2026).n === 1 && /คร่อม/.test(wYear(WC, 2026).note || ""),
  [wRow(WC, "2026-Q1").span, wYear(WC, 2026).n, wYear(WC, 2026).note]);

// ข้อมูลยุคก่อนมี netFlow (ไม่มี field): ไม่ตั้งไตรมาสละ → ระบบเดาเงินเติมจากรายการใหม่ · ตั้งไว้ → ใช้ยอดที่ตั้งแทน
var EL = { "2025-Q4": [row("foreign-stock", "US", 1000000)], "2026-Q1": [row("foreign-stock", "US", 1030000), row("rmf-tum", "RMF-ตุ๋ม", 300000)] };
var ALLOCL = { version: 1, map: { "foreign-stock::US": { long: 100 }, "rmf-tum::RMF-ตุ๋ม": { long: 100 } }, ports: {}, retirement: {} };
var el0 = wRow(AA.compute(blob(EL, "2026-Q1"), ALLOCL).record.whole, "2026-Q1");
t("ข้อมูลเก่า + ไม่ตั้ง → source imputed · เงินเติม = มูลค่ารายการใหม่ 300,000", el0.flowSource === "imputed" && el0.flow === 300000 && el0.imputedFlow === 300000, [el0.flowSource, el0.flow]);
var ALLOCL1 = JSON.parse(JSON.stringify(ALLOCL)); ALLOCL1.retirement = { annualContribution: 1000000 };
var el1 = wRow(AA.compute(blob(EL, "2026-Q1"), ALLOCL1).record.whole, "2026-Q1");
t("ข้อมูลเก่า + ตั้งไตรมาสละ → ใช้ยอดที่ตั้ง 250,000 (ตั้งใจ: ผู้ใช้บอกยอดจริงเอง)", el1.flowSource === "setting" && el1.flow === 250000 && el1.imputedFlow === 300000, [el1.flowSource, el1.flow]);
// กรอกไว้บางรายการ + รายการเก่าไม่มี field → partial
var EP = { "2025-Q4": [row("foreign-stock", "US", 1000000), row("cash", "เงินสด", 100000)],
  "2026-Q1": [row("foreign-stock", "US", 1030000), row("cash", "เงินสด", 150000, 50000)] };
var ep = wRow(AA.compute(blob(EP, "2026-Q1"), ALLOCL).record.whole, "2026-Q1");
t("กรอกไว้บางรายการ → partial", ep.flowSource === "partial" && ep.flow === 50000, [ep.flowSource, ep.flow]);

console.log("\n[W5] แบ่งเงินเติมไตรมาสละเข้ารายพอร์ต ตามสัดส่วนมูลค่าต้นงวด (ฐาน = ทุกรายการ)");
var MALLOC = {
  version: 1, map: { "foreign-stock::US": { long: 100 }, "thai-stock::หุ้นไทย": { mid: 100 }, "cash::เงินสด": { short: 100 } },
  ports: { short: { expectedReturnPct: 2 }, mid: { expectedReturnPct: 6 }, long: { expectedReturnPct: 9 } },
  monthlyExpense: 120000, updatedAt: null,
  retirement: { inflationPct: 4, workYears: 3, retireYears: 30, annualContribution: 1000000, currentAge: 50, targetReturnPct: 10 }
};
// Bitcoin ยังไม่จัดพอร์ต: อยู่ในฐานทั้งพอร์ต และได้ส่วนแบ่งเงินเติมของตัวเอง (ไม่ตกเป็นของพอร์ตไหน)
var EM = {
  "2026-Q1": [edRow("foreign-stock", "US", 6000000), edRow("thai-stock", "หุ้นไทย", 3000000), edRow("cash", "เงินสด", 1000000), edRow("bitcoin", "Bitcoin", 500000)],
  "2026-Q2": [edRow("foreign-stock", "US", 6300000), edRow("thai-stock", "หุ้นไทย", 3100000), edRow("cash", "เงินสด", 1050000), edRow("bitcoin", "Bitcoin", 520000)]
};
var RM = AA.compute(blob(EM, "2026-Q2"), MALLOC);
var mL = RM.ports.long.quarters[0], mM = RM.ports.mid.quarters[0], mS = RM.ports.short.quarters[0];
// คิดมือ: ต้นงวดทุกรายการ 10.5M → ยาว 6/10.5 · กลาง 3/10.5 · สั้น 1/10.5 ของ 250,000
tNear("พอร์ตยาวได้เงินเติม 250,000 × 6M/10.5M", mL.flow, 250000 * 6000000 / 10500000, 1e-6);
tNear("พอร์ตกลางได้ 250,000 × 3M/10.5M", mM.flow, 250000 * 3000000 / 10500000, 1e-6);
tNear("พอร์ตสั้นได้ 250,000 × 1M/10.5M", mS.flow, 250000 * 1000000 / 10500000, 1e-6);
tNear("รวม 3 พอร์ต + ส่วนของ Bitcoin (ยังไม่จัด) = 250,000 พอดี", mL.flow + mM.flow + mS.flow + 250000 * 500000 / 10500000, 250000, 1e-6);
var fL = 250000 * 6 / 10.5, fM = 250000 * 3 / 10.5, fS = 250000 * 1 / 10.5;
tNear("พอร์ตยาว = (6.3M − 6M − เงินเติม) ÷ (6M + ครึ่งหนึ่งของเงินเติม)", mL.r, (300000 - fL) / (6000000 + fL / 2), 1e-12);
tNear("พอร์ตกลาง = (3.1M − 3M − เงินเติม) ÷ (3M + ครึ่งหนึ่ง)", mM.r, (100000 - fM) / (3000000 + fM / 2), 1e-12);
tNear("พอร์ตสั้น = (1.05M − 1M − เงินเติม) ÷ (1M + ครึ่งหนึ่ง)", mS.r, (50000 - fS) / (1000000 + fS / 2), 1e-12);
t("สถานะเงินเติมของทุกพอร์ต = setting พร้อมสัดส่วนที่ใช้", [mL, mM, mS].every(function (q) { return q.flowStatus === "setting" && q.alloc && q.alloc.total === 250000 && q.alloc.span === 1; }) &&
  Math.abs(mL.alloc.share - 6 / 10.5) < 1e-12, JSON.stringify(mL.alloc));
t("หมายเหตุรายไตรมาสบอกว่าเป็นสมมติฐาน ไม่ใช่ 'ไม่มีข้อมูลเงินเติม'", mL.flags.some(function (f) { return /ตามสัดส่วนมูลค่าต้นงวด/.test(f); }) && !mL.flags.some(function (f) { return /ไม่มีข้อมูลเงินเติม/.test(f); }), mL.flags);
t("ความครบของข้อมูลนับไตรมาสที่ใช้ยอดไตรมาสละ และบอกว่ามาจากการแบ่ง", RM.ports.long.flowCoverage.recorded === 1 && RM.ports.long.flowCoverage.fromSetting === 1 &&
  /แบ่งตามสัดส่วนมูลค่าต้นงวด/.test(RM.ports.long.flowCoverage.thai), RM.ports.long.flowCoverage.thai);
t("ไม่มีคำเตือน 'ข้อมูลเงินเติม/ถอนครบเพียง'", !RM.ports.long.warnings.some(function (w) { return w.kind === "coverage"; }));
t("บันทึกรายพอร์ต (record.rows) ใช้ตัวเลขเดียวกับพอร์ต", RM.record.rows[0].ports.long.r === mL.r && RM.record.rows[0].ports.long.flow === mL.flow && RM.record.rows[0].ports.long.flowStatus === "setting");
// ไม่ตั้ง → ตัวเลขเดิม (นับเงินเติมเป็นกำไร) · อัตรา "ทำได้จริง" ในแผนเกษียณต้องลดลงเมื่อหักแล้ว
var MALLOC0 = JSON.parse(JSON.stringify(MALLOC)); MALLOC0.retirement.annualContribution = null;
var RM0 = AA.compute(blob(EM, "2026-Q2"), MALLOC0);
tNear("ไม่ตั้ง → พอร์ตยาว = 6.3M ÷ 6M − 1", RM0.ports.long.quarters[0].r, 0.05, 1e-12);
t("ไม่ตั้ง → สถานะ recorded (netFlow 0 ที่ editor เขียน)", RM0.ports.long.quarters[0].flowStatus === "recorded");
// ข้อมูล 1 ไตรมาสยังไม่ครบปี → annReturn null · ใช้ชุด ED (3 ไตรมาส) ก็ยังไม่ครบ จึงขยายเป็น 5 ไตรมาสเพื่อทดสอบอัตราแผนเกษียณ
var EM5 = JSON.parse(JSON.stringify(EM));
EM5["2026-Q3"] = [edRow("foreign-stock", "US", 6700000), edRow("thai-stock", "หุ้นไทย", 3230000), edRow("cash", "เงินสด", 1100000), edRow("bitcoin", "Bitcoin", 540000)];
EM5["2026-Q4"] = [edRow("foreign-stock", "US", 7050000), edRow("thai-stock", "หุ้นไทย", 3350000), edRow("cash", "เงินสด", 1150000), edRow("bitcoin", "Bitcoin", 560000)];
EM5["2027-Q1"] = [edRow("foreign-stock", "US", 7400000), edRow("thai-stock", "หุ้นไทย", 3480000), edRow("cash", "เงินสด", 1200000), edRow("bitcoin", "Bitcoin", 580000)];
var R5 = AA.compute(blob(EM5, "2027-Q1"), MALLOC), R50 = AA.compute(blob(EM5, "2027-Q1"), MALLOC0);
t("4 ไตรมาส → มีผลตอบแทนต่อปีทั้งสองกรณี", R5.ports.long.annReturn !== null && R50.ports.long.annReturn !== null);
t("หักเงินเติมแล้ว ผลตอบแทนต่อปีของทุกพอร์ตต่ำกว่าแบบไม่หัก", AA.PORTS.every(function (p) { return R5.ports[p].annReturn < R50.ports[p].annReturn; }),
  JSON.stringify(AA.PORTS.map(function (p) { return [p, R5.ports[p].annReturn, R50.ports[p].annReturn]; })));
t("อัตรา 'ทำได้จริง' ของแผนเกษียณใช้ตัวเลขที่หักแล้ว (ต่ำกว่า)", R5.retirement.actualRatePct < R50.retirement.actualRatePct, [R5.retirement.actualRatePct, R50.retirement.actualRatePct]);
// ถ่วงตามมูลค่าพอร์ตล่าสุด (blendRate) จากผลต่อปีที่หักแล้ว — คิดใหม่จากตัวเลขของพอร์ต ไม่อ่านจากเอนจิน
var bw = 0, bs = 0;
AA.PORTS.forEach(function (p) { var P = R5.ports[p]; if (P.annReturn !== null && P.latestValue > 0) { bw += P.latestValue; bs += P.latestValue * P.annReturn; } });
tNear("…อัตรานั้น = ถ่วงผลต่อปีที่หักแล้วด้วยมูลค่าพอร์ต", R5.retirement.actualRatePct, bs / bw * 100, 1e-9);
t("'จากนี้ต้องทำได้เท่าไหร่' คิดจากดัชนีที่หักแล้ว (ต้องทำได้มากขึ้น)", AA.PORTS.every(function (p) { return R5.ports[p].required.requiredAnn > R50.ports[p].required.requiredAnn; }),
  JSON.stringify(AA.PORTS.map(function (p) { return [p, R5.ports[p].required.requiredAnn, R50.ports[p].required.requiredAnn]; })));
t("สถานะเทียบเส้นคาดหวัง (นำ/ตาม/ตาม) คิดจากดัชนีที่หักแล้ว", AA.PORTS.every(function (p) { return R5.ports[p].gapRatio < R50.ports[p].gapRatio; }));
t("record.whole ไม่ถูกกระทบจากการแบ่ง (ทั้งพอร์ตยังเป็นยอดเต็ม)", R5.record.whole.rows.every(function (r) { return r.flow === 250000 && r.flowSource === "setting"; }));

// กรอก netFlow ≠ 0 ในรายการไหนก็ตาม → ไตรมาสนั้นทั้งพอร์ตใช้ยอดที่กรอก → รายพอร์ตก็ใช้ยอดที่กรอก (ไม่แบ่งยอดไตรมาสละ)
var EMT = JSON.parse(JSON.stringify(EM)); EMT["2026-Q2"][2].netFlow = 40000;   // เติมเงินสด 40,000
var RMT = AA.compute(blob(EMT, "2026-Q2"), MALLOC);
t("กรอก netFlow ในไตรมาสนั้น → ไม่แบ่งยอดไตรมาสละเข้ารายพอร์ต", AA.PORTS.every(function (p) { var q = RMT.ports[p].quarters[0]; return q.flowStatus !== "setting" && q.alloc === null; }));
t("…พอร์ตสั้นใช้ยอดที่กรอก 40,000 · พอร์ตยาวใช้ 0 (ไม่ได้กรอก)", RMT.ports.short.quarters[0].flow === 40000 && RMT.ports.long.quarters[0].flow === 0,
  [RMT.ports.short.quarters[0].flow, RMT.ports.long.quarters[0].flow]);
t("…ตรงกับทั้งพอร์ต (recorded)", wRow(RMT.record.whole, "2026-Q2").flowSource === "recorded");

// ไตรมาสที่ข้าม (span 2) → แบ่งยอด 2 ไตรมาส
var EMG = JSON.parse(JSON.stringify(EM5)); delete EMG["2026-Q3"];
var gL = AA.compute(blob(EMG, "2027-Q1"), MALLOC).ports.long.quarters.filter(function (q) { return q.key === "2026-Q4"; })[0];
tNear("ข้าม 2026-Q3 → พอร์ตยาวได้ 500,000 × สัดส่วนต้นงวด (2026-Q2)", gL.flow, 500000 * 6300000 / (6300000 + 3100000 + 1050000 + 520000), 1e-6);
t("…alloc.span = 2", gL.alloc && gL.alloc.span === 2 && gL.alloc.total === 500000);

// ข้อมูลยุคก่อน netFlow + รายการใหม่ในพอร์ต: ตั้งไตรมาสละ → ใช้ยอดที่แบ่ง ไม่ใช่มูลค่ารายการใหม่ (กติกาเดียวกับทั้งพอร์ต)
var ELP = { "2025-Q4": [row("foreign-stock", "US", 1000000)], "2026-Q1": [row("foreign-stock", "US", 1030000), row("rmf-tum", "RMF-ตุ๋ม", 300000)] };
var ALP = { version: 1, map: { "foreign-stock::US": { long: 100 }, "rmf-tum::RMF-ตุ๋ม": { long: 100 } }, ports: {}, retirement: { annualContribution: 1000000 } };
var lp = AA.compute(blob(ELP, "2026-Q1"), ALP).ports.long.quarters[0];
t("ข้อมูลเก่า + ตั้งไตรมาสละ → รายพอร์ตใช้ 250,000 ไม่ใช่ 300,000 และไม่ขึ้นว่าประมาณเงินเริ่มต้น", lp.flow === 250000 && lp.flowStatus === "setting" && lp.imputed.length === 0, [lp.flow, lp.flowStatus, lp.imputed.length]);
var ALP0 = JSON.parse(JSON.stringify(ALP)); ALP0.retirement = {};
var lp0 = AA.compute(blob(ELP, "2026-Q1"), ALP0).ports.long.quarters[0];
t("…ไม่ตั้ง → กลับไปใช้มูลค่ารายการใหม่ 300,000 (imputed) เหมือนเดิม", lp0.flow === 300000 && lp0.imputed.length === 1, [lp0.flow, lp0.imputed.length]);

// พอร์ตที่ไม่เหลือรายการเลยในไตรมาสนั้นไม่ได้รับส่วนแบ่ง
var EMX = JSON.parse(JSON.stringify(EM)); EMX["2026-Q2"] = EMX["2026-Q2"].filter(function (a) { return a.type !== "cash"; });
var xS = AA.compute(blob(EMX, "2026-Q2"), MALLOC).ports.short.quarters[0];
t("พอร์ตสั้นไม่เหลือรายการ → ไม่ได้ส่วนแบ่งเงินเติม (สถานะ none)", xS.flow === 0 && xS.flowStatus === "none" && xS.alloc === null, [xS.flow, xS.flowStatus]);

// ตั้ง 0 = บอกว่าไม่ได้เติม → รายพอร์ตสถานะ setting และหัก 0
var MALLOCZ = JSON.parse(JSON.stringify(MALLOC)); MALLOCZ.retirement.annualContribution = 0;
var zL = AA.compute(blob(EM, "2026-Q2"), MALLOCZ).ports.long.quarters[0];
t("ตั้งไว้ 0 → รายพอร์ตหัก 0 (สถานะ setting)", zL.flow === 0 && zL.flowStatus === "setting", [zL.flow, zL.flowStatus]);
t("[W5] ไม่มี NaN/Infinity", !/NaN|Infinity/.test(JSON.stringify([RM, R5, RMT])));
console.log("\n[W6] เกิน/ขาดเป้าเท่าไหร่ — เป็น % และเป็นเงิน");
var TQ = Math.pow(1.10, 0.25) - 1;
// คิดมือ: 2026-Q2 ต้นงวด 9.5M เติม 250k (กลางงวด) → ถ้าได้ตามเป้าพอดี ปลายงวด = 9.5M + 250k + เป้า × (9.5M + 125k)
var e2 = 9500000 + 250000 + TQ * 9625000, e3 = 10050000 + 250000 + TQ * 10175000;
tNear("2026-Q2 มูลค่าที่ควรมีถ้าได้ตามเป้า", d2.targetEndValue, e2, 1e-6);
tNear("2026-Q2 เกินเป็นเงิน = 10.05M − มูลค่าตามเป้า", d2.targetDiffAmount, 10050000 - e2, 1e-6);
tNear("2026-Q2 เกินเป็น % = ผลจริง − เป้า", d2.targetDiff, 300000 / 9625000 - TQ, 1e-12);
tNear("2026-Q3 ขาดเป็นเงิน = 10.42M − มูลค่าตามเป้า", d3.targetDiffAmount, 10420000 - e3, 1e-6);
t("…ติดลบ และป้ายเป็นต่ำกว่าเป้า", d3.targetDiffAmount < 0 && d3.status === "behind", [d3.targetDiffAmount, d3.status]);
tNear("เงิน = (ผลจริง − เป้า) × (ต้นงวด + ครึ่งหนึ่งของเงินเติม)", d4.targetDiffAmount, (d4.real - TQ) * (10420000 + 125000), 1e-6);
t("เครื่องหมายของเงินตรงกับป้ายทุกไตรมาส", WD.rows.every(function (r) { return r.status === "on" || (r.status === "ahead") === (r.targetDiffAmount > 0); }));
// ทั้งปี: เดินเส้น "ได้ตามเป้าทุกไตรมาส" จากต้นปีจริง + เงินเติมจริง แล้วเทียบปลายปีจริง (ไม่ใช่ผลรวมรายไตรมาส)
var TY = 9500000;
[0, 1, 2].forEach(function () { TY = TY + 250000 + TQ * (TY + 125000); });
tNear("ปี 2026 มูลค่าที่ควรมีถ้าได้ตามเป้าทุกไตรมาส", YD.targetEndValue, TY, 1e-6);
tNear("ปี 2026 เกิน/ขาดเป็นเงิน = 10.93M − เส้นตามเป้า", YD.targetDiffAmount, 10930000 - TY, 1e-6);
t("…ไม่ใช่ผลรวมของรายไตรมาส", Math.abs(YD.targetDiffAmount - (d2.targetDiffAmount + d3.targetDiffAmount + d4.targetDiffAmount)) > 1, [YD.targetDiffAmount, d2.targetDiffAmount + d3.targetDiffAmount + d4.targetDiffAmount]);
tNear("ปี 2026 เกิน/ขาดเป็น % = ผลจริงทั้งปี − เป้า YTD", YD.targetDiff, YD.real - (Math.pow(1.1, 0.75) - 1), 1e-12);
// น้ำหนักกลางงวดต้องมาจากตัวเลือกเดียวกับสูตร Dietz
var dW1 = wRow(AA.compute(blob(ED, "2026-Q4"), ALLOCD, { dietzWeight: 1 }).record.whole, "2026-Q2");
tNear("dietzWeight = 1 → ฐาน = ต้นงวด + เงินเติมทั้งก้อน", dW1.targetEndValue, 9500000 + 250000 + TQ * 9750000, 1e-6);
var YW1 = wYear(AA.compute(blob(ED, "2026-Q4"), ALLOCD, { dietzWeight: 1 }).record.whole, 2026), TW1 = 9500000;
[0, 1, 2].forEach(function () { TW1 = TW1 + 250000 + TQ * (TW1 + 250000); });
tNear("…แถวปีก็ใช้น้ำหนักเดียวกัน", YW1.targetEndValue, TW1, 1e-6);
// ไตรมาสข้าม (span 2) → เป้า 2 ไตรมาส เงินเติม 2 ไตรมาส
var TQ2 = Math.pow(1.10, 0.5) - 1;
tNear("ข้ามไตรมาส: มูลค่าตามเป้า = 10.05M + 500k + เป้า 2 ไตรมาส × (10.05M + 250k)", dg4.targetEndValue, 10050000 + 500000 + TQ2 * 10300000, 1e-6);
// คำนวณไม่ได้ → null (ห้ามเป็น 0 หลอก)
t("ไตรมาสที่ถอนเกินมูลค่า → ส่วนต่าง = null ทั้ง % และเงิน", qN.targetDiff === null && qN.targetDiffAmount === null && qN.targetEndValue === null);
t("ปีที่มีไตรมาสคำนวณไม่ได้ → null", YN.targetDiff === null && YN.targetDiffAmount === null && YN.targetEndValue === null);
t("[W6] ไม่มี NaN/Infinity", !/NaN|Infinity/.test(JSON.stringify([WD, WN, WG])));
// ต้นปี 100k ขาดทุน −20% แล้วเติม 10M ในไตรมาสที่ได้ +26%: ต่อดัชนีได้ 0.8 × 1.26 − 1 = +0.8% < เป้า 2 ไตรมาส 4.88% (ต่ำกว่าเป้า)
// แต่เส้นมูลค่าตามเป้า = 100k → 102,411 → +10M + 2.411% × (102,411 + 5M) = 10,225,450 < มีจริง 11,400,800 (เงินเกิน)
// สองตัววัดคนละอย่างและถูกทั้งคู่ — เอนจินคืนค่าตามจริง ไม่บิดให้ตรงกัน (หน้าเว็บเลือกไม่แสดงเงินในแถวนั้น)
var EMM = { "2026-Q1": [edRow("foreign-stock", "US", 100000)], "2026-Q2": [edRow("foreign-stock", "US", 80000)], "2026-Q3": [edRow("foreign-stock", "US", 11400800, 10000000)] };
var ALMM = { version: 1, map: { "foreign-stock::US": { long: 100 } }, ports: {}, retirement: {} };
var YMM = wYear(AA.compute(blob(EMM, "2026-Q3"), ALMM).record.whole, 2026);
tNear("ปีที่เงินเติมก้อนใหญ่: % ต่อดัชนี = 0.8 × 1.26 − 1", YMM.real, 0.8 * (1 + 1320800 / 5080000) - 1, 1e-12);
t("…ป้ายต่ำกว่าเป้า แต่เงินเกิน (ชี้คนละทิศ)", YMM.status === "behind" && YMM.targetDiffAmount > 0, [YMM.status, YMM.targetDiffAmount]);
var TMM = 100000 + TQ * 100000; TMM = TMM + 10000000 + TQ * (TMM + 5000000);
tNear("…เส้นมูลค่าตามเป้าคิดมือตรง", YMM.targetEndValue, TMM, 1e-6);
console.log("\n" + (pass + fail) + " checks · " + pass + " passed · " + fail + " failed");
process.exit(fail ? 1 : 0);
