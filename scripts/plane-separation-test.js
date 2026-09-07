// PHASE 5 — PLANE SEPARATION TESTS
// node scripts/plane-separation-test.js
//
// กฎเดียวที่ทุกข้อในไฟล์นี้ปกป้อง:
//   "งบฟื้น ≠ catalyst" — ผลลัพธ์ที่ปรากฏในงบเป็นหลักฐานที่มีค่า แต่ไม่ใช่เหตุการณ์ที่ทำให้ธุรกิจเปลี่ยน
//
// ระนาบ A (BUSINESS/EVENT) สร้างขั้น catalyst C0-C5 ได้
// ระนาบ B (FINANCIAL)      ยืนยัน FINANCIAL IMPACT ได้ · ร่วมยกเป็น C4 ได้เมื่อมีระนาบ A ระดับ C3 อยู่ก่อน
//                          แต่ลำพัง "ห้าม" สร้าง C3/C4/C5 หรือสถานะโอกาสใด ๆ
"use strict";
var EM = require("../public/evidence-model.js");
var FI = require("../public/financial-inflection.js");
var CQ = require("../public/catalyst-qualification.js");

var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; return; }
  fail++; console.error("  ✗ " + name + (extra != null ? " — got: " + JSON.stringify(extra) : ""));
}

// ---------- fixtures ----------
function finEv(over) {
  return Object.assign({
    ticker: "T", eventDate: "2026-06-30", sourceType: "FINANCIAL_STATEMENT",
    evidencePlane: "FINANCIAL", sourceName: "งบรายไตรมาส (SET)", eventType: "EPS_INFLECTION",
    title: "งบไตรมาส 2026-06-30: STRONG INFLECTION — YoY +80%",
    evidenceStrength: "C4_FINANCIAL_EVIDENCE", status: "REPORTED",
  }, over || {});
}
function bizEv(over) {
  return Object.assign({
    ticker: "T", eventDate: "2026-05-01", sourceType: "SET_DISCLOSURE",
    sourceName: "SET Disclosure", eventType: "NEW_CONTRACT",
    title: "ลงนามสัญญาใหม่", evidenceStrength: "C3_CONFIRMED_EVENT", status: "REPORTED",
  }, over || {});
}
// งวดงบ — ชื่อฟิลด์ตามที่ FinancialInflection.compute อ่าน
function fq(date, rev, op, eps) {
  return { date: date, revenue: rev, netIncome: Math.round(rev * 0.1), operatingIncome: op, eps: eps,
    fcf: 100, totalDebt: 500, currency: "THB", periodType: "3M",
    operatingMargin: rev > 0 ? op / rev : null };
}
function story(items, recognized) {
  return EM.buildStory("T", items, { inspected: true, marketRecognized: recognized === true });
}
function stageOf(items, recognized) { return story(items, recognized).catalystStage.key; }

// ---------- 1-3: งบล้วนห้ามสร้าง C3/C4/C5 ----------
console.log("== 1-3: financial inflection ลำพัง ห้ามสร้าง C3/C4/C5 ==");
["REVENUE_INFLECTION", "EPS_INFLECTION", "MARGIN_INFLECTION", "FCF_INFLECTION"].forEach(function (et) {
  var st = story([finEv({ eventType: et })]);
  t(et + " ลำพัง → ไม่มีขั้น catalyst", st.catalystStage.key === "NONE", st.catalystStage.key);
  t(et + " ลำพัง → NO_CATALYST", st.availability.key === "NO_CATALYST", st.availability.key);
  t(et + " ลำพัง → ไม่เข้า evidenceItems", st.evidenceItems.length === 0);
  t(et + " ลำพัง + ตลาดรับรู้ → ยังไม่ถึง C5",
    stageOf([finEv({ eventType: et })], true) === "NONE", stageOf([finEv({ eventType: et })], true));
});
// กวาดทุกความแข็งที่ประกาศมา — ต่อให้อ้างว่าเป็น C4 ก็ยกไม่ได้
["C1_MANAGEMENT_STORY", "C2_OFFICIAL_ANNOUNCEMENT", "C3_CONFIRMED_EVENT", "C4_FINANCIAL_EVIDENCE"]
  .forEach(function (s) {
    t("งบที่อ้างความแข็ง " + s + " ก็ยังไม่สร้างขั้น",
      stageOf([finEv({ evidenceStrength: s })]) === "NONE", stageOf([finEv({ evidenceStrength: s })]));
  });
// หลายไตรมาส/หลายรายการก็ยังไม่ใช่ catalyst
t("หลักฐานงบหลายชิ้นรวมกันก็ไม่สร้าง catalyst", stageOf([
  finEv({ eventType: "REVENUE_INFLECTION", eventDate: "2026-03-31" }),
  finEv({ eventType: "EPS_INFLECTION", eventDate: "2026-06-30" }),
  finEv({ eventType: "MARGIN_INFLECTION", eventDate: "2026-06-30" }),
]) === "NONE");

// ---------- 4-5: qualification ----------
console.log("== 4-5: งบล้วน → FUNDAMENTAL_RECOVERY ไม่ใช่สถานะโอกาส ==");
function qual(over) {
  var base = {
    drawdown: { available: true, drawdown52wPct: -45, state: { key: "SEVERE_DRAWDOWN", label: "SEVERE DRAWDOWN", rank: 3 }, bars: 900 },
    catalyst: { availability: { key: "NO_CATALYST" }, available: false,
      maturity: { key: "NONE", n: -1, label: "DATA UNAVAILABLE" }, evidenceCount: 0,
      businessEvidenceCount: 0, financialEvidenceCount: 1, types: [] },
    financialInflection: { available: true, state: { key: "STRONG_INFLECTION", n: 3 },
      quarterCount: 18, latestQuarter: "2026-06-30", confirmedCoreCount: 3, metrics: {} },
    recognition: { state: { key: "EARLY", n: 0 }, metrics: {} },
    valueTrap: { risk: { key: "LOW" }, signals: [] },
    lifecycle: "ACCUMULATION",
  };
  return CQ.qualify(Object.assign(base, over || {}));
}
var qFinOnly = qual();
t("ย่อลึก + งบ STRONG + ไม่มี catalyst → FUNDAMENTAL_RECOVERY",
  qFinOnly.state.key === "FUNDAMENTAL_RECOVERY", qFinOnly.state.key);
t("ไม่ใช่สถานะโอกาส",
  ["STRONG_EARLY_CATALYST", "EARLY_CATALYST", "CATALYST_EXISTS"].indexOf(qFinOnly.state.key) < 0);
t("เหตุผลระบุว่ายังไม่พบ catalyst",
  qFinOnly.why.join(" ").indexOf("ยังไม่พบ Catalyst") >= 0 ||
  qFinOnly.why.join(" ").indexOf("ไม่ใช่ catalyst") >= 0, qFinOnly.why);
// กวาดทุกระดับงบ — ไม่มี catalyst แล้วห้ามเป็นสถานะโอกาสทุกกรณี
var badFin = [];
[["NO_INFLECTION", 0], ["EARLY_INFLECTION", 1], ["CONFIRMED_INFLECTION", 2], ["STRONG_INFLECTION", 3]]
  .forEach(function (f) {
    [["UNKNOWN", -1], ["EARLY", 0], ["BUILDING", 1], ["CONFIRMED", 2], ["OVERHEATED", 3]].forEach(function (rg) {
      var q = qual({
        financialInflection: { available: true, state: { key: f[0], n: f[1] },
          quarterCount: 18, latestQuarter: "2026-06-30", confirmedCoreCount: 3, metrics: {} },
        recognition: { state: { key: rg[0], n: rg[1] }, metrics: {} },
      });
      if (["STRONG_EARLY_CATALYST", "EARLY_CATALYST", "CATALYST_EXISTS"].indexOf(q.state.key) >= 0) {
        badFin.push(f[0] + "/" + rg[0] + "→" + q.state.key);
      }
    });
  });
t("กวาด 4 ระดับงบ × 5 ระดับการรับรู้: ไม่มี catalyst = ไม่มีสถานะโอกาสเลย",
  badFin.length === 0, badFin);

// ---------- 6: NEW_CONTRACT + งบ → STRONG_EARLY ได้ ----------
console.log("== 6: เหตุการณ์ธุรกิจ + งบ → STRONG_EARLY ได้ ==");
var bizStory = story([bizEv(), finEv()]);
t("เหตุการณ์ธุรกิจ C3 + งบ → C4", bizStory.catalystStage.key === "C4_FINANCIAL_EVIDENCE", bizStory.catalystStage.key);
t("C4 ระบุว่ามาจากธุรกิจ + งบ", /business-event/.test(bizStory.stageUpgradedBy || ""), bizStory.stageUpgradedBy);
var qBiz = qual({
  catalyst: { availability: { key: "CATALYST_IDENTIFIED" }, available: true,
    maturity: { key: "C4_FINANCIAL_EVIDENCE", n: 4, label: "C4 · FINANCIAL EVIDENCE" },
    evidenceCount: 1, businessEvidenceCount: 1, financialEvidenceCount: 1, types: ["NEW_CONTRACT"] },
});
t("ย่อลึก + C4(ธุรกิจ) + งบ STRONG + ตลาด EARLY → STRONG_EARLY_CATALYST",
  qBiz.state.key === "STRONG_EARLY_CATALYST", qBiz.state.key);

// ---------- 7-8: ASSET_SALE ----------
console.log("== 7-8: ASSET_SALE ==");
var assetMech = bizEv({ eventType: "ASSET_SALE", title: "ขายสินทรัพย์" });
t("ASSET_SALE มีกลไก → เป็น catalyst",
  story([assetMech]).availability.key === "CATALYST_IDENTIFIED");
t("ASSET_SALE มีกลไก → ยกขั้นได้ถึง C3", stageOf([assetMech]) === "C3_CONFIRMED", stageOf([assetMech]));
t("ASSET_SALE + งบ → C4", stageOf([assetMech, finEv()]) === "C4_FINANCIAL_EVIDENCE");
t("ASSET_MONETIZATION มีกลไกเช่นกัน",
  story([bizEv({ eventType: "ASSET_MONETIZATION" })]).availability.key === "CATALYST_IDENTIFIED");
// เหตุการณ์ที่อธิบายกลไกไม่ได้ ห้ามกลายเป็น catalyst เพราะงบดีขึ้น
["CAPITAL_RESTRUCTURING", "BUYBACK", "BOARD_CHANGE", "BUSINESS_PIVOT", "JV", "REGULATORY_CHANGE"]
  .forEach(function (et) {
    var st = story([bizEv({ eventType: et }), finEv()]);
    t(et + " (ไม่มีกลไก) + งบดี → ไม่เป็น catalyst",
      st.availability.key === "NO_CATALYST", st.availability.key);
    t(et + " (ไม่มีกลไก) + งบดี → ไม่ถึง C4", st.catalystStage.key === "NONE", st.catalystStage.key);
  });

// ---------- 9: insider ----------
console.log("== 9: insider ห้ามสร้าง catalyst ==");
["INSIDER_BUY", "INSIDER_SELL", "MAJOR_SHAREHOLDER_CHANGE"].forEach(function (et) {
  var st = story([bizEv({ eventType: et, sourceType: "SEC_FILING", sourceName: "ก.ล.ต. แบบ 59" }), finEv()]);
  t(et + " + งบ → ไม่เป็น catalyst", st.availability.key === "NO_CATALYST", st.availability.key);
  t(et + " + งบ → ไม่มีขั้น", st.catalystStage.key === "NONE", st.catalystStage.key);
});

// ---------- 10: ตลาดรับรู้ ----------
console.log("== 10: ตลาดรับรู้ห้ามสร้าง catalyst ==");
t("ไม่มีหลักฐาน + ตลาดรับรู้ → NO_CATALYST",
  EM.buildStory("T", [], { inspected: true, marketRecognized: true }).availability.key === "NO_CATALYST");
t("งบ + ตลาดรับรู้ → ยังไม่มีขั้น", stageOf([finEv()], true) === "NONE");
t("เหตุการณ์ระดับ C2 + ตลาดรับรู้ → ยังไม่ถึง C5",
  stageOf([bizEv({ evidenceStrength: "C2_OFFICIAL_ANNOUNCEMENT" })], true) === "C2_ANNOUNCED");

// ---------- 11: ย่อลึก ----------
console.log("== 11: ย่อลึกห้ามสร้าง catalyst ==");
var badDeep = [];
[-20, -35, -50, -70, -90].forEach(function (pct) {
  var q = qual({ drawdown: { available: true, drawdown52wPct: pct,
    state: { key: "EXTREME_DRAWDOWN", label: "EXTREME DRAWDOWN", rank: 4 }, bars: 900 } });
  if (q.dimensions.C_catalyst.maturityN >= 2) badDeep.push(pct + "→C" + q.dimensions.C_catalyst.maturityN);
  if (["STRONG_EARLY_CATALYST", "EARLY_CATALYST", "CATALYST_EXISTS"].indexOf(q.state.key) >= 0) {
    badDeep.push(pct + "→" + q.state.key);
  }
});
t("กวาดทุกระดับการย่อ: ราคาไม่สร้าง catalyst และไม่สร้างสถานะโอกาส", badDeep.length === 0, badDeep);

// ---------- 12-13: BUSINESS IMPACT vs FINANCIAL IMPACT ----------
console.log("== 12-13: BUSINESS IMPACT ≠ FINANCIAL IMPACT ==");
function nodeOf(q, step) {
  var ch = (q.rerating && q.rerating.chain) || [];
  return ch.filter(function (x) { return x.step === step; })[0] || null;
}
var bizNodeFinOnly = nodeOf(qFinOnly, "BUSINESS IMPACT");
var finNodeFinOnly = nodeOf(qFinOnly, "FINANCIAL IMPACT");
t("งบล้วน → BUSINESS IMPACT ไม่ถูกยืนยัน", bizNodeFinOnly && bizNodeFinOnly.supported === false);
t("งบล้วน → BUSINESS IMPACT = NOT_ESTABLISHED",
  bizNodeFinOnly && bizNodeFinOnly.state === "NOT_ESTABLISHED", bizNodeFinOnly && bizNodeFinOnly.state);
t("งบล้วน → อธิบายว่างบยืนยันได้แค่ผลทางการเงิน",
  bizNodeFinOnly && bizNodeFinOnly.detail.indexOf("ไม่ใช่ผลต่อธุรกิจ") >= 0, bizNodeFinOnly && bizNodeFinOnly.detail);
t("งบล้วน → FINANCIAL IMPACT ถูกยืนยันได้", finNodeFinOnly && finNodeFinOnly.supported === true);
t("งบล้วน → RE-RATING ไม่ถูกยืนยัน", (function () {
  var nd = nodeOf(qFinOnly, "RE-RATING");
  return nd && nd.supported === false;
})());
var bizNodeBiz = nodeOf(qBiz, "BUSINESS IMPACT");
t("มีเหตุการณ์ธุรกิจ C3+ → BUSINESS IMPACT ถูกยืนยัน", bizNodeBiz && bizNodeBiz.supported === true);
t("C4 แต่ businessEvidenceCount = 0 → BUSINESS IMPACT ยังไม่ถูกยืนยัน", (function () {
  var q = qual({ catalyst: { availability: { key: "CATALYST_IDENTIFIED" }, available: true,
    maturity: { key: "C4_FINANCIAL_EVIDENCE", n: 4, label: "C4" },
    evidenceCount: 1, businessEvidenceCount: 0, financialEvidenceCount: 1, types: ["EPS_INFLECTION"] } });
  var nd = nodeOf(q, "BUSINESS IMPACT");
  return nd && nd.supported === false;
})());

// ---------- 14: value trap ยัง override ----------
console.log("== 14: value trap ยังเป็นตัว override ==");
var qTrap = qual({
  catalyst: { availability: { key: "CATALYST_IDENTIFIED" }, available: true,
    maturity: { key: "C4_FINANCIAL_EVIDENCE", n: 4, label: "C4" },
    evidenceCount: 1, businessEvidenceCount: 1, financialEvidenceCount: 1, types: ["NEW_CONTRACT"] },
  valueTrap: { risk: { key: "HIGH" }, signals: ["รายได้ลดต่อเนื่อง", "ขาดทุนหลายไตรมาส", "หนี้เพิ่ม"] },
});
t("trap HIGH override แม้มี catalyst ธุรกิจ C4", qTrap.state.key === "VALUE_TRAP_RISK", qTrap.state.key);

// ---------- 15: โครงสร้าง ----------
console.log("== 15: โครงสร้างและกฎที่ห้ามพัง ==");
var fs2 = require("fs");
var modelSrc = fs2.readFileSync(__dirname + "/../public/evidence-model.js", "utf8");
t("evidence-model ประกาศระนาบไว้ชัด", modelSrc.indexOf("PLANE") >= 0 && modelSrc.indexOf("isFinancialPlane") >= 0);
t("มี RELEVANCE.FINANCIAL_EVIDENCE", !!EM.RELEVANCE.FINANCIAL_EVIDENCE);
t("planeOf ตอบถูกทั้งสองระนาบ",
  EM.planeOf("EPS_INFLECTION") === "FINANCIAL" && EM.planeOf("NEW_CONTRACT") === "BUSINESS" &&
  EM.planeOf("ASSET_SALE") === "BUSINESS" && EM.planeOf("MARGIN_INFLECTION") === "FINANCIAL");
t("ไม่มี engine ที่สองสำหรับระนาบงบ", !fs2.existsSync(__dirname + "/../public/financial-catalyst.js"));
t("ไม่มีคะแนนใน evidence-model", !/totalScore|compositeScore/.test(modelSrc));
t("ไม่มีคำชี้นำซื้อขาย", !/ควรซื้อ|ควรขาย|แนะนำซื้อ|แนะนำขาย|strong buy|strong sell/i.test(modelSrc));
t("ไม่มีกฎเฉพาะ ticker", !/"(CMC|CIG|BYD|CEN|CRANE|PSGC|BCPG|ECF)"/.test(modelSrc));
// toEvidence ยังต้องทำงาน (หลักฐานงบต้องไม่หายไปจากระบบ)
var inf = FI.compute({ inspected: true, source: "test", quarters: [
  fq("2025-03-31", 400, 10, 0.08), fq("2025-06-30", 500, 20, 0.10),
  fq("2025-09-30", 600, 40, 0.16), fq("2025-12-31", 700, 70, 0.24),
  fq("2026-03-31", 850, 110, 0.36), fq("2026-06-30", 900, 130, 0.42)] });
var evFromInf = FI.toEvidence("T", inf);
t("financial-inflection ยังสร้างหลักฐานได้", !!evFromInf);
t("หลักฐานนั้นประกาศระนาบ FINANCIAL มาเอง", evFromInf && evFromInf.evidencePlane === "FINANCIAL");
t("หลักฐานนั้นยังคงความแข็ง C4 (ความแข็ง ≠ ขั้น catalyst)",
  evFromInf && evFromInf.evidenceStrength === "C4_FINANCIAL_EVIDENCE");
t("normalize แล้วยังอยู่ระนาบ FINANCIAL",
  EM.normalizeEvidence(evFromInf).evidencePlane === "FINANCIAL");
t("normalize แล้ว relevance = FINANCIAL_EVIDENCE",
  EM.normalizeEvidence(evFromInf).catalystRelevance === "FINANCIAL_EVIDENCE");

console.log("\n" + (pass + fail) + " checks · " + pass + " passed · " + fail + " failed");
process.exit(fail ? 1 : 0);
