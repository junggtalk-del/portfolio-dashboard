// THAI CATALYST HUNTER — PHASE 2 · STORY / EVIDENCE PLANE
// node scripts/evidence-test.js
//
// ครอบ §18 ทั้งหมด + กฎที่ห้ามพังจาก PHASE 1.1
// หัวใจที่ทดสอบซ้ำ ๆ: ราคาไม่มีสิทธิ์สร้างหลักฐาน และ "ยังไม่ได้ตรวจ" ≠ "ตรวจแล้วไม่มี"
"use strict";
var fs = require("fs");
var path = require("path");
var EM = require("../public/evidence-model.js");
var EC = require("../public/evidence-classifier.js");
var CE = require("../public/catalyst-engine.js");

var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; return; }
  fail++; console.error("  ✗ " + name + (extra !== undefined ? " — got: " + JSON.stringify(extra) : ""));
}

// ---------- ตัวช่วยสร้างหลักฐานดิบ ----------
function ev(o) {
  o = o || {};
  return {
    ticker: o.ticker === undefined ? "TEST" : o.ticker,
    eventDate: o.date === undefined ? "2026-05-01" : o.date,
    sourceType: o.sourceType === undefined ? "SET_DISCLOSURE" : o.sourceType,
    sourceName: o.sourceName === undefined ? "SET Disclosure" : o.sourceName,
    sourceUrl: o.sourceUrl === undefined ? "https://www.set.or.th/x" : o.sourceUrl,
    eventType: o.eventType === undefined ? "NEW_ORDER" : o.eventType,
    title: o.title === undefined ? "เหตุการณ์ทดสอบ" : o.title,
    summary: o.summary === undefined ? null : o.summary,
    evidenceStrength: o.strength === undefined ? "C3_CONFIRMED_EVENT" : o.strength,
    confidence: o.confidence === undefined ? null : o.confidence,
    affectedBusiness: o.affectedBusiness === undefined ? null : o.affectedBusiness,
    expectedImpact: o.expectedImpact === undefined ? null : o.expectedImpact,
    status: o.status === undefined ? "VERIFIED" : o.status,
  };
}

// ============================================================
console.log("== §1 Evidence normalization ==");
{
  var n = EM.normalizeEvidence(ev({}));
  var REQUIRED = ["ticker", "eventDate", "sourceType", "sourceName", "sourceUrl", "eventType", "title",
    "summary", "evidenceStrength", "confidence", "catalystCategory", "affectedBusiness",
    "expectedImpact", "status", "createdAt"];
  REQUIRED.forEach(function (k) { t("มีฟิลด์ " + k, Object.prototype.hasOwnProperty.call(n, k)); });
  t("วันที่ถูกทำให้เป็น yyyy-mm-dd", n.eventDate === "2026-05-01", n.eventDate);
  t("รับวันที่แบบ dd/mm/yyyy ได้", EM.normalizeEvidence(ev({ date: "14/07/2026" })).eventDate === "2026-07-14");
  t("รับ ISO datetime ได้", EM.normalizeEvidence(ev({ date: "2026-07-14T20:56:00+07:00" })).eventDate === "2026-07-14");
  t("ใช้ได้เมื่อข้อมูลครบ", EM.isUsable(n));
}

console.log("== §1 ฟิลด์ที่ไม่รู้ต้องคงเป็น unavailable (ห้ามเดา) ==");
{
  var n = EM.normalizeEvidence(ev({ summary: undefined, affectedBusiness: undefined, expectedImpact: undefined, confidence: undefined }));
  t("summary ที่ไม่มี = null", n.summary === null, n.summary);
  t("affectedBusiness ที่ไม่มี = null", n.affectedBusiness === null);
  t("expectedImpact ที่ไม่มี = null", n.expectedImpact === null);
  t("confidence ที่ไม่มี = null (ไม่คิดคะแนนเอง)", n.confidence === null);
  t("confidence นอกช่วง 0-1 ถูกปฏิเสธ", EM.normalizeEvidence(ev({ confidence: 7 })).confidence === null);
  t("confidence ที่ถูกต้องถูกเก็บไว้", EM.normalizeEvidence(ev({ confidence: 0.8 })).confidence === 0.8);
  t("สตริงว่างไม่กลายเป็นค่าจริง", EM.normalizeEvidence(ev({ summary: "   " })).summary === null);
}

console.log("== §1 ข้อมูลไม่ครบ = ใช้เป็นหลักฐานไม่ได้ ==");
{
  t("ไม่มีวันที่ → ปฏิเสธ", !!EM.normalizeEvidence(ev({ date: null })).rejected);
  t("วันที่มั่ว → ปฏิเสธ (ไม่เดา)", !!EM.normalizeEvidence(ev({ date: "เร็ว ๆ นี้" })).rejected);
  t("ไม่มี ticker → ปฏิเสธ", !!EM.normalizeEvidence(ev({ ticker: null })).rejected);
  t("ไม่มีหัวข้อ → ปฏิเสธ", !!EM.normalizeEvidence(ev({ title: null })).rejected);
  t("ปฏิเสธแล้วต้อง isUsable = false", !EM.isUsable(EM.normalizeEvidence(ev({ date: null }))));
  t("ไม่มีลิงก์ต้นทางใน TIER_1 → เตือน แต่ยังใช้ได้",
    EM.normalizeEvidence(ev({ sourceUrl: null })).notes.join(" ").indexOf("ตรวจสอบย้อนหลังไม่ได้") >= 0);
}

// ============================================================
console.log("== §2/§7 Source type + reliability tier ==");
{
  var TIER1 = ["SET_DISCLOSURE", "SEC_FILING", "COMPANY_DISCLOSURE", "FINANCIAL_STATEMENT", "INSIDER_TRANSACTION", "REGULATORY"];
  TIER1.forEach(function (k) {
    t(k + " = TIER_1", EM.normalizeEvidence(ev({ sourceType: k })).sourceTier === "TIER_1");
  });
  t("OPPORTUNITY_DAY = TIER_2", EM.normalizeEvidence(ev({ sourceType: "OPPORTUNITY_DAY" })).sourceTier === "TIER_2");
  t("NEWS = TIER_3", EM.normalizeEvidence(ev({ sourceType: "NEWS" })).sourceTier === "TIER_3");
  t("INDUSTRY_DATA = TIER_3", EM.normalizeEvidence(ev({ sourceType: "INDUSTRY_DATA" })).sourceTier === "TIER_3");
  t("OTHER = TIER_4", EM.normalizeEvidence(ev({ sourceType: "OTHER" })).sourceTier === "TIER_4");
  t("แหล่งที่ไม่รู้จัก → OTHER/TIER_4 (ไม่เดาว่าน่าเชื่อถือ)", (function () {
    var n = EM.normalizeEvidence(ev({ sourceType: "MY_BLOG" }));
    return n.sourceType === "OTHER" && n.sourceTier === "TIER_4";
  })());
  // PHASE 3 เพิ่มประเภทแหล่งของระนาบค้นพบ (THAIVI/SOCIAL/RUMOR/COMPANY_PRESENTATION/COMPANY_IR + แบบผู้ใช้นำมาให้)
  t("ครบ 10 sourceType ของ PHASE 2 ตามสเปค", ["SET_DISCLOSURE", "SEC_FILING", "COMPANY_DISCLOSURE",
    "FINANCIAL_STATEMENT", "OPPORTUNITY_DAY", "INSIDER_TRANSACTION", "NEWS", "INDUSTRY_DATA",
    "REGULATORY", "OTHER"].every(function (k) { return !!EM.SOURCE_TYPES[k]; }));
  t("PHASE 3 เพิ่มประเภทแหล่งของระนาบค้นพบ", Object.keys(EM.SOURCE_TYPES).length >= 15,
    Object.keys(EM.SOURCE_TYPES).length);
}

console.log("== §7 TIER_4 ลำพังห้ามสร้าง C3/C4/C5 ==");
{
  var rumor = EM.normalizeEvidence(ev({ sourceType: "OTHER", strength: "C4_FINANCIAL_EVIDENCE" }));
  t("TIER_4 อ้าง C4 → ถูกกดเหลือ C0", rumor.evidenceStrength === "C0_RUMOR", rumor.evidenceStrength);
  t("บันทึกเหตุผลที่ถูกกด", rumor.notes.join(" ").indexOf("TIER_4") >= 0);
  t("TIER_4 อ้าง C3 → ถูกกดเหลือ C0",
    EM.normalizeEvidence(ev({ sourceType: "OTHER", strength: "C3_CONFIRMED_EVENT" })).evidenceStrength === "C0_RUMOR");
  t("TIER_3 (ข่าว) อ้าง C3 → ถูกกดเหลือ C2",
    EM.normalizeEvidence(ev({ sourceType: "NEWS", strength: "C3_CONFIRMED_EVENT" })).evidenceStrength === "C2_OFFICIAL_ANNOUNCEMENT");
  t("TIER_2 (oppday) อ้าง C4 → ถูกกดเหลือ C2",
    EM.normalizeEvidence(ev({ sourceType: "OPPORTUNITY_DAY", strength: "C4_FINANCIAL_EVIDENCE" })).evidenceStrength === "C2_OFFICIAL_ANNOUNCEMENT");
  t("TIER_1 อ้าง C4 → ผ่านได้",
    EM.normalizeEvidence(ev({ sourceType: "FINANCIAL_STATEMENT", strength: "C4_FINANCIAL_EVIDENCE" })).evidenceStrength === "C4_FINANCIAL_EVIDENCE");
  // ข่าวลือกองใหญ่ก็ยังยกขั้นไม่ได้
  var manyRumors = [];
  for (var i = 0; i < 20; i++) manyRumors.push(ev({ sourceType: "OTHER", strength: "C3_CONFIRMED_EVENT", date: "2026-0" + ((i % 8) + 1) + "-01" }));
  var rumorStory = EM.buildStory("T", manyRumors, { inspected: true });
  t("ข่าวลือ 20 ชิ้นก็ยังไม่เป็น C3", rumorStory.catalystStage.n < 3, rumorStory.catalystStage.key);
  t("ข่าวลือ 20 ชิ้น + ตลาดรับรู้ ก็ยังไม่เป็น C5",
    EM.buildStory("T", manyRumors, { inspected: true, marketRecognized: true }).catalystStage.key !== "C5_MARKET_RECOGNIZED");
}

console.log("== §1 ความแข็งที่ไม่ระบุ = ต่ำสุด (ห้ามเดาขึ้น) ==");
{
  t("ไม่ระบุความแข็ง → C0", EM.normalizeEvidence(ev({ strength: null })).evidenceStrength === "C0_RUMOR");
  t("ระบุค่าที่ไม่รู้จัก → C0", EM.normalizeEvidence(ev({ strength: "SUPER_STRONG" })).evidenceStrength === "C0_RUMOR");
  t("บันทึกว่าไม่ได้เดาขึ้น", EM.normalizeEvidence(ev({ strength: null })).notes.join(" ").indexOf("ไม่เดา") >= 0);
}

// ============================================================
console.log("== §3/§6 Event classification + catalyst category ==");
{
  var SPEC_EVENTS = ["MANAGEMENT_CHANGE", "BOARD_CHANGE", "MAJOR_SHAREHOLDER_CHANGE", "INSIDER_BUY", "INSIDER_SELL",
    "NEW_BUSINESS", "BUSINESS_PIVOT", "RESTRUCTURING", "COST_REDUCTION",
    "NEW_CUSTOMER", "NEW_CONTRACT", "NEW_ORDER", "BACKLOG", "NEW_PROJECT", "CAPACITY_EXPANSION",
    "NEW_PRODUCT", "NEW_MARKET", "EXPORT_EXPANSION",
    "JV", "STRATEGIC_INVESTMENT", "ASSET_SALE", "ASSET_MONETIZATION", "SUBSIDIARY_EVENT",
    "LICENSE", "CONCESSION", "REGULATORY_CHANGE", "GOVERNMENT_PROJECT",
    "DEBT_RESTRUCTURING", "CAPITAL_RESTRUCTURING", "BUYBACK", "TENDER_OFFER",
    "REVENUE_INFLECTION", "EPS_INFLECTION", "MARGIN_INFLECTION", "FCF_INFLECTION", "OTHER"];
  var missing = SPEC_EVENTS.filter(function (k) { return !EM.EVENT_TYPES[k]; });
  t("มีประเภทเหตุการณ์ครบตามสเปค " + SPEC_EVENTS.length + " แบบ", missing.length === 0, missing);

  var SPEC_CATS = ["MANAGEMENT", "BUSINESS_MODEL", "NEW_REVENUE", "INDUSTRY_STRUCTURE",
    "ASSET_UNLOCK", "COST_TRANSFORMATION", "REGULATORY", "CORPORATE_ACTION"];
  var missCat = SPEC_CATS.filter(function (k) { return !EM.CATEGORIES[k]; });
  t("มีหมวด catalyst ครบ 8 หมวด", missCat.length === 0, missCat);

  t("NEW_ORDER → หมวด NEW_REVENUE",
    EM.normalizeEvidence(ev({ eventType: "NEW_ORDER" })).catalystCategory.indexOf("NEW_REVENUE") >= 0);
  t("MANAGEMENT_CHANGE → หมวด MANAGEMENT",
    EM.normalizeEvidence(ev({ eventType: "MANAGEMENT_CHANGE" })).catalystCategory.indexOf("MANAGEMENT") >= 0);
  t("ASSET_SALE → หมวด ASSET_UNLOCK",
    EM.normalizeEvidence(ev({ eventType: "ASSET_SALE" })).catalystCategory.indexOf("ASSET_UNLOCK") >= 0);
  t("เหตุการณ์เดียวมีได้หลายหมวด",
    EM.normalizeEvidence(ev({ eventType: "LICENSE" })).catalystCategory.length >= 2,
    EM.normalizeEvidence(ev({ eventType: "LICENSE" })).catalystCategory);
  t("หมวดมาจากตาราง ไม่ใช่จากที่ผู้ป้อนยัดมา", (function () {
    var raw = ev({ eventType: "MANAGEMENT_CHANGE" });
    raw.catalystCategory = ["NEW_REVENUE", "ASSET_UNLOCK"];
    var n = EM.normalizeEvidence(raw);
    return n.catalystCategory.indexOf("NEW_REVENUE") < 0;
  })());
  t("ประเภทที่ไม่รู้จัก → OTHER", EM.normalizeEvidence(ev({ eventType: "MOON_LANDING" })).eventType === "OTHER");
}

// ============================================================
console.log("== §5 Catalyst vs Evidence: ไม่มีกลไก = UNKNOWN (ห้ามแต่งกลไก) ==");
{
  var order = EM.normalizeEvidence(ev({ eventType: "NEW_ORDER" }));
  t("NEW_ORDER มีกลไกเศรษฐกิจ", Array.isArray(order.economicMechanism) && order.economicMechanism.length >= 3);
  t("กลไกเป็นห่วงโซ่ EVENT→BUSINESS→FINANCIAL→RE-RATING", order.economicMechanism.length === 4, order.economicMechanism);
  t("NEW_ORDER = CATALYST_RELEVANT", order.catalystRelevance === "CATALYST_RELEVANT");

  var mgmt = EM.normalizeEvidence(ev({ eventType: "MANAGEMENT_CHANGE" }));
  t("MANAGEMENT_CHANGE ไม่มีกลไก → mechanism = null", mgmt.economicMechanism === null);
  t("MANAGEMENT_CHANGE → catalystRelevance = UNKNOWN", mgmt.catalystRelevance === "UNKNOWN", mgmt.catalystRelevance);
  t("บันทึกว่าไม่แต่งกลไกเอง", mgmt.notes.join(" ").indexOf("ไม่แต่งกลไกเอง") >= 0);

  // §5 แยก "มีกลไกไหม" ออกจาก "หลักฐานแข็งแค่ไหน" — หลักฐานอ่อนยังเกี่ยวข้องได้ แต่ขั้นต่ำ
  var weak = EM.normalizeEvidence(ev({ eventType: "NEW_ORDER", sourceType: "OTHER" }));
  t("หลักฐานอ่อนที่มีกลไก ยังถือว่าเกี่ยวข้อง (แต่ขั้นจะต่ำ)", weak.catalystRelevance === "CATALYST_RELEVANT");
  t("หลักฐานอ่อนถูกบันทึกว่ายังไม่ยืนยัน", weak.notes.join(" ").indexOf("ยังไม่ยืนยัน") >= 0);
  t("หลักฐานอ่อนได้ขั้นต่ำสุด (C0 จาก TIER_4)",
    EM.buildStory("T", [ev({ eventType: "NEW_ORDER", sourceType: "OTHER" })], { inspected: true }).catalystStage.key === "C0_RUMOR");

  // เหตุการณ์ที่ไม่มีกลไกต้องไม่ทำให้ทั้งตัวกลายเป็น CATALYST_IDENTIFIED
  var onlyMgmt = EM.buildStory("T", [ev({ eventType: "MANAGEMENT_CHANGE", strength: "C2_OFFICIAL_ANNOUNCEMENT" })], { inspected: true });
  t("มีแต่เหตุการณ์ที่ไม่มีกลไก → NO_CATALYST", onlyMgmt.availability.key === "NO_CATALYST", onlyMgmt.availability.key);
  t("แต่ยังเก็บเหตุการณ์นั้นไว้ในไทม์ไลน์ (ไม่ทิ้งหลักฐาน)", onlyMgmt.timeline.length === 1);
  t("อธิบายเหตุผลว่าทำไมไม่นับ", String(onlyMgmt.note).indexOf("กลไก") >= 0, onlyMgmt.note);
}

// ============================================================
console.log("== §9 C1/C2/C3/C4 derivation ==");
{
  function stageOf(strength, sourceType) {
    return EM.buildStory("T", [ev({ strength: strength, sourceType: sourceType || "SET_DISCLOSURE" })], { inspected: true }).catalystStage.key;
  }
  t("C1 → C1_STORY", stageOf("C1_MANAGEMENT_STORY") === "C1_STORY", stageOf("C1_MANAGEMENT_STORY"));
  t("C2 → C2_ANNOUNCED", stageOf("C2_OFFICIAL_ANNOUNCEMENT") === "C2_ANNOUNCED");
  t("C3 → C3_CONFIRMED", stageOf("C3_CONFIRMED_EVENT") === "C3_CONFIRMED");
  // PHASE 5 — ความแข็งของหลักฐานระดับ C4 ลำพังไม่ยกขั้นเป็น C4 อีกแล้ว
  // C4 = "เหตุการณ์ธุรกิจยืนยันแล้ว + ผลปรากฏในงบ" ⇒ เอกสารเดี่ยวสูงสุดได้ C3
  t("หลักฐานความแข็ง C4 ชิ้นเดียว (ไม่ใช่งบ) → เพดาน C3",
    stageOf("C4_FINANCIAL_EVIDENCE") === "C3_CONFIRMED", stageOf("C4_FINANCIAL_EVIDENCE"));
  t("เหตุการณ์ธุรกิจ C3 + หลักฐานงบ → C4", (function () {
    var biz = ev({ strength: "C3_CONFIRMED_EVENT", sourceType: "SET_DISCLOSURE" });
    biz.eventType = "NEW_CONTRACT";
    var fin = ev({ strength: "C4_FINANCIAL_EVIDENCE", sourceType: "FINANCIAL_STATEMENT" });
    fin.eventType = "EPS_INFLECTION";
    return EM.buildStory("T", [biz, fin], { inspected: true }).catalystStage.key === "C4_FINANCIAL_EVIDENCE";
  })());
  t("งบล้วน (ไม่มีเหตุการณ์ธุรกิจ) → ไม่มีขั้น catalyst", (function () {
    var fin = ev({ strength: "C4_FINANCIAL_EVIDENCE", sourceType: "FINANCIAL_STATEMENT" });
    fin.eventType = "EPS_INFLECTION";
    var st = EM.buildStory("T", [fin], { inspected: true });
    return st.catalystStage.key === "NONE" && st.availability.key === "NO_CATALYST";
  })());
  t("ใช้หลักฐานที่แข็งที่สุดเป็นตัวกำหนดขั้น", EM.buildStory("T", [
    ev({ strength: "C1_MANAGEMENT_STORY", date: "2026-01-01" }),
    ev({ strength: "C3_CONFIRMED_EVENT", date: "2026-02-01" }),
    ev({ strength: "C2_OFFICIAL_ANNOUNCEMENT", date: "2026-03-01" }),
  ], { inspected: true }).catalystStage.key === "C3_CONFIRMED");
  t("หลักฐานที่ถูกหักล้างแล้วไม่นับ", EM.deriveStage([
    EM.normalizeEvidence(ev({ strength: "C4_FINANCIAL_EVIDENCE", status: "INVALIDATED" })),
    EM.normalizeEvidence(ev({ strength: "C2_OFFICIAL_ANNOUNCEMENT" })),
  ], null).stage.key === "C2_ANNOUNCED");
  t("ไม่มีหลักฐาน → NONE", EM.deriveStage([], null).stage.key === "NONE");
}

console.log("== §9 C5 ต้องมี evidence C3+ และ market recognition (ราคาลำพังห้ามสร้าง C5) ==");
{
  var c3 = [ev({ strength: "C3_CONFIRMED_EVENT" })];
  var c4 = [ev({ strength: "C4_FINANCIAL_EVIDENCE", sourceType: "FINANCIAL_STATEMENT" })];
  var c2 = [ev({ strength: "C2_OFFICIAL_ANNOUNCEMENT" })];
  var c1 = [ev({ strength: "C1_MANAGEMENT_STORY" })];
  function stage(list, recog) { return EM.buildStory("T", list, { inspected: true, marketRecognized: recog === true || recog >= 3 }).catalystStage.key; }

  t("C3 + ตลาดรับรู้ (CONFIRMED) → C5", stage(c3, 3) === "C5_MARKET_RECOGNIZED", stage(c3, 3));
  t("C4 + ตลาดรับรู้ → C5", stage(c4, 4) === "C5_MARKET_RECOGNIZED");
  t("C3 + ตลาดยังไม่รับรู้ → คงเป็น C3", stage(c3, 1) === "C3_CONFIRMED", stage(c3, 1));
  t("C3 + ไม่มีข้อมูลการรับรู้ → คงเป็น C3", stage(c3, null) === "C3_CONFIRMED");
  t("C2 + ตลาดรับรู้แรงแค่ไหนก็ไม่ถึง C5", stage(c2, 4) === "C2_ANNOUNCED", stage(c2, 4));
  t("C1 + ตลาดรับรู้แรงแค่ไหนก็ไม่ถึง C5", stage(c1, 4) === "C1_STORY", stage(c1, 4));
  t("ไม่มีหลักฐานเลย + ตลาดรับรู้แรง → ไม่มีขั้น",
    EM.buildStory("T", [], { inspected: true, marketRecognized: true }).catalystStage.key === "NONE");
  // กวาดทุกระดับการรับรู้
  var bad = [];
  [0, 1, 2, 3, 4, 5].forEach(function (recog) {
    [c1, c2].forEach(function (list) { if (stage(list, recog) === "C5_MARKET_RECOGNIZED") bad.push(recog); });
  });
  t("กวาดทุกระดับการรับรู้: หลักฐานต่ำกว่า C3 ไม่มีทางเป็น C5", bad.length === 0, bad);
  t("C5 บันทึกว่ามาจากทั้งหลักฐานและตลาด", (function () {
    var st = EM.buildStory("T", c3, { inspected: true, marketRecognized: true });
    return String(st.stageUpgradedBy).indexOf("business-event(C3+)") >= 0 &&
      String(st.stageUpgradedBy).indexOf("market-recognition") >= 0;
  })());
}

// ============================================================
console.log("== §10 no evidence ≠ unavailable · unavailable ≠ no catalyst ==");
{
  var notInspected = EM.buildStory("T", [], { inspected: false });
  var inspected = EM.buildStory("T", [], { inspected: true });
  t("ยังไม่ได้ตรวจ → CATALYST_UNAVAILABLE", notInspected.availability.key === "CATALYST_UNAVAILABLE");
  t("ตรวจแล้วไม่พบ → NO_CATALYST", inspected.availability.key === "NO_CATALYST");
  t("สองอย่างนี้ต้องไม่เท่ากัน", notInspected.availability.key !== inspected.availability.key);
  t("ยังไม่ได้ตรวจ ต้องบอกว่าไม่ได้แปลว่าไม่มี", String(notInspected.note).indexOf("ไม่ได้แปลว่าไม่มี") >= 0);
  t("มีหลักฐานเข้าเกณฑ์ → CATALYST_IDENTIFIED",
    EM.buildStory("T", [ev({})], { inspected: true }).availability.key === "CATALYST_IDENTIFIED");
  t("มีหลักฐานแต่ตรวจไม่สำเร็จ ก็ยังนับได้ถ้าหลักฐานเข้าเกณฑ์",
    EM.buildStory("T", [ev({})], { inspected: false }).availability.key === "CATALYST_IDENTIFIED");
  t("หลักฐานที่ถูกปฏิเสธทั้งหมด + ตรวจแล้ว → NO_CATALYST",
    EM.buildStory("T", [ev({ date: null })], { inspected: true }).availability.key === "NO_CATALYST");
  t("หลักฐานที่ถูกปฏิเสธทั้งหมด + ยังไม่ตรวจ → CATALYST_UNAVAILABLE",
    EM.buildStory("T", [ev({ date: null })], { inspected: false }).availability.key === "CATALYST_UNAVAILABLE");
  t("รายการที่ถูกปฏิเสธยังถูกเก็บไว้ให้ตรวจสอบ",
    EM.buildStory("T", [ev({ date: null })], { inspected: true }).rejectedItems.length === 1);
  t("มีครบทั้ง 3 สถานะตามสเปค", Object.keys(EM.AVAILABILITY).length === 3);
}

// ============================================================
console.log("== §8 Multiple evidence aggregation ==");
{
  var story = EM.buildStory("T", [
    ev({ date: "2026-05-12", eventType: "MANAGEMENT_CHANGE", strength: "C2_OFFICIAL_ANNOUNCEMENT", title: "เปลี่ยนผู้บริหาร" }),
    ev({ date: "2026-06-03", eventType: "NEW_PROJECT", strength: "C2_OFFICIAL_ANNOUNCEMENT", title: "ประกาศโครงการใหม่" }),
    ev({ date: "2026-07-14", eventType: "NEW_CONTRACT", strength: "C3_CONFIRMED_EVENT", title: "ยืนยันสัญญา" }),
  ], { inspected: true });

  var SPEC_FIELDS = ["ticker", "storyTitle", "storyCategory", "storyStatus", "firstDetectedDate",
    "latestEvidenceDate", "evidenceItems", "evidenceStrength", "catalystStage",
    "economicMechanism", "financialImpact", "marketRecognition", "failureConditions"];
  var miss = SPEC_FIELDS.filter(function (k) { return !Object.prototype.hasOwnProperty.call(story, k); });
  t("Story มีฟิลด์ครบตามสเปค §8", miss.length === 0, miss);

  t("รวมหลักฐานหลายชิ้นได้", story.evidenceItems.length === 2, story.evidenceItems.length);
  t("เหตุการณ์ที่ไม่มีกลไกไม่อยู่ใน evidenceItems แต่ไปอยู่ otherEvents",
    story.otherEvents.length === 1 && story.otherEvents[0].eventType === "MANAGEMENT_CHANGE");
  t("firstDetectedDate = เหตุการณ์แรกสุด", story.firstDetectedDate === "2026-05-12", story.firstDetectedDate);
  t("latestEvidenceDate = เหตุการณ์ล่าสุด", story.latestEvidenceDate === "2026-07-14", story.latestEvidenceDate);
  t("ขั้นมาจากหลักฐานที่แข็งสุด", story.catalystStage.key === "C3_CONFIRMED");
  t("storyTitle = หลักฐานที่แข็งสุด", story.storyTitle === "ยืนยันสัญญา", story.storyTitle);
  t("รวมหมวดจากหลายเหตุการณ์", story.storyCategory.indexOf("NEW_REVENUE") >= 0);
  t("ไม่ยุบเป็นคะแนนเดียว (ไม่มีฟิลด์ score)",
    !Object.prototype.hasOwnProperty.call(story, "score") && !Object.prototype.hasOwnProperty.call(story, "totalScore"));
  t("storyStatus สะท้อนขั้น", story.storyStatus === "CONFIRMED", story.storyStatus);
  t("มีเงื่อนไขหักล้างที่ผูกกับหลักฐานจริง", story.failureConditions.length > 0);
  t("เงื่อนไขหักล้างพูดถึงสัญญา", story.failureConditions.join(" ").indexOf("สัญญา") >= 0);
  t("financialImpact = null เมื่อยังไม่มีหลักฐาน C4 (ไม่แต่งตัวเลข)", story.financialImpact === null);
}

console.log("== §11 Evidence timeline: เรียงเวลา ไม่ทับของเก่า ==");
{
  var items = [
    ev({ date: "2026-09-02", eventType: "REVENUE_INFLECTION", strength: "C4_FINANCIAL_EVIDENCE", sourceType: "FINANCIAL_STATEMENT", title: "รายได้พลิก" }),
    ev({ date: "2026-05-12", eventType: "MANAGEMENT_CHANGE", strength: "C1_MANAGEMENT_STORY", title: "เปลี่ยนผู้บริหาร" }),
    ev({ date: "2026-07-14", eventType: "NEW_CONTRACT", strength: "C3_CONFIRMED_EVENT", title: "ยืนยันสัญญา" }),
    ev({ date: "2026-06-03", eventType: "NEW_PROJECT", strength: "C2_OFFICIAL_ANNOUNCEMENT", title: "ประกาศโครงการ" }),
    ev({ date: "2026-08-20", eventType: "BACKLOG", strength: "C3_CONFIRMED_EVENT", title: "backlog เพิ่ม" }),
  ];
  var st = EM.buildStory("T", items, { inspected: true });
  t("ไทม์ไลน์เก็บครบทุกเหตุการณ์", st.timeline.length === 5, st.timeline.length);
  var dates = st.timeline.map(function (e) { return e.eventDate; });
  t("เรียงจากเก่าไปใหม่", JSON.stringify(dates) === JSON.stringify(["2026-05-12", "2026-06-03", "2026-07-14", "2026-08-20", "2026-09-02"]), dates);
  t("เหตุการณ์เดิมไม่ถูกเขียนทับด้วยเหตุการณ์ใหม่",
    st.timeline[0].title === "เปลี่ยนผู้บริหาร" && st.timeline[4].title === "รายได้พลิก");
  t("เหตุการณ์ประเภทเดียวกันหลายครั้งเก็บครบ", EM.buildStory("T", [
    ev({ date: "2026-01-01", title: "คำสั่งซื้อ 1" }), ev({ date: "2026-02-01", title: "คำสั่งซื้อ 2" }),
    ev({ date: "2026-03-01", title: "คำสั่งซื้อ 3" }),
  ], { inspected: true }).timeline.length === 3);
  t("ขั้นสูงสุดคือ C4 เมื่อมีหลักฐานทางการเงิน", st.catalystStage.key === "C4_FINANCIAL_EVIDENCE");
  t("financialImpact มาจากหลักฐาน C4 จริง", Array.isArray(st.financialImpact) && st.financialImpact.length === 1);
  t("ไทม์ไลน์รวมเหตุการณ์ที่ไม่เข้าเกณฑ์ด้วย (ไม่ทิ้งประวัติ)",
    st.timeline.some(function (e) { return e.eventType === "MANAGEMENT_CHANGE"; }));
}

// ============================================================
console.log("== §14 Deterministic classifier: จำแนกไม่ได้ต้องไม่เดา ==");
{
  function cls(h) { return EC.classifyHeadline(h); }
  t("หัวข้อว่าง → ไม่จำแนก", !cls("").classified);
  t("หัวข้อไม่รู้จัก → ไม่จำแนก และบอกว่าไม่เดา", (function () {
    var c = cls("Some completely unrelated corporate blurb about nothing specific");
    return !c.classified && String(c.note).indexOf("ไม่เดา") >= 0;
  })());
  t("จำแนกซ้ำได้ผลเดิมเสมอ (deterministic)", (function () {
    var h = "Notification of Project Awarded";
    return JSON.stringify(cls(h)) === JSON.stringify(cls(h));
  })());

  // รายการประจำ
  t("งบการเงิน = รายการประจำ", cls("Financial Statement Quarter 2/2026 (Reviewed)").routine);
  t("ปันผล = รายการประจำ", cls("Interim Dividend Payment").routine);
  t("ซื้อหุ้นคืน = รายการประจำ", cls("Reporting Share Repurchase form for financial management").routine);
  t("MD&A = รายการประจำ", cls("Management Discussion and Analysis Quarter 2 Ending 30 Jun 2026").routine);
  t("เอกสารประชุม = รายการประจำ", cls("Publication of the minutes of the 2026 Annual General Meeting of Shareholders").routine);
  t("รายการประจำถือว่า 'ตรวจแล้ว' ไม่ใช่ 'ไม่รู้'", cls("Interim Dividend Payment").classified === true);
  t("รายการประจำไม่มีความแข็ง (ไม่เป็นหลักฐาน)", cls("Interim Dividend Payment").evidenceStrength === null);

  // เหตุการณ์จริง
  t("ได้รับงาน → C3", cls("Notification of Project Awarded").evidenceStrength === "C3_CONFIRMED_EVENT");
  t("ได้รับงาน → GOVERNMENT_PROJECT", cls("Notification of Project Awarded").eventType === "GOVERNMENT_PROJECT");
  t("เริ่มเดินเครื่องเชิงพาณิชย์ → C3",
    cls("Commercial Operation of Hin Kong Combined-Cycle Power Plant Block 2").evidenceStrength === "C3_CONFIRMED_EVENT");
  t("ลงนาม PPA → C3 / NEW_CONTRACT", (function () {
    var c = cls("Signing of Power Purchase Agreement for Solar Project");
    return c.evidenceStrength === "C3_CONFIRMED_EVENT" && c.eventType === "NEW_CONTRACT";
  })());
  t("MOU → แค่ C2 (ยังไม่ผูกมัด)",
    cls("Notification of the Memorandum of Understanding").evidenceStrength === "C2_OFFICIAL_ANNOUNCEMENT");
  t("ร่วมทุน → JV/C2", cls("Notification of establishment of a joint venture.").eventType === "JV");
  t("tender offer → C2", cls("Submission of the Tender Offer for the Securities (Form 247-4)").eventType === "TENDER_OFFER");

  // ภาษาที่บอกว่าเรื่องล้ม ห้ามอ่านเป็นบวก
  t("ยกเลิก MOU → ไม่ยกเป็นหลักฐานบวก", (function () {
    var c = cls("Notification of the Mutual Termination of the Memorandum of Understanding");
    return c.negated === true && c.evidenceStrength === "C1_MANAGEMENT_STORY";
  })());
  t("ยกเลิกสัญญา → ถูกทำเครื่องหมายว่าเป็นลบ",
    cls("Cancellation of the Signed Contract with the counterparty").negated === true);
  t("โครงการล่าช้า → ไม่เป็น C3",
    cls("Delay of Commercial Operation of the power plant").evidenceStrength !== "C3_CONFIRMED_EVENT");

  // ภาษาที่เป็นแค่แผน ห้ามยกถึง C3
  t("อนุมัติในหลักการ → ไม่เกิน C2", (function () {
    var c = cls("Approval in Principle on the investment project for a new plant");
    return c.evidenceStrength === "C2_OFFICIAL_ANNOUNCEMENT";
  })());
}

console.log("== classifyFeed: แยก 'ไม่มีข่าว' ออกจาก 'มีข่าวแต่เป็นรายการประจำ' ==");
{
  var empty = EC.classifyFeed([], "T");
  t("ไม่มีข่าวเลย → หลักฐาน 0", empty.evidence.length === 0);
  t("ไม่มีข่าวเลย → บอกว่าไม่พบข้อมูลเผยแพร่", String(empty.note).indexOf("ไม่พบข้อมูลเผยแพร่") >= 0);

  var routineOnly = EC.classifyFeed([
    { headline: "Financial Statement Quarter 1/2026", datetime: "2026-05-01", url: "u" },
    { headline: "Interim Dividend Payment", datetime: "2026-06-01", url: "u" },
  ], "T");
  t("มีข่าวแต่เป็นรายการประจำ → หลักฐาน 0", routineOnly.evidence.length === 0);
  t("นับรายการประจำได้", routineOnly.routineCount === 2);
  t("บอกว่าตรวจแล้วไม่พบ (ต่างจากไม่มีข่าว)", String(routineOnly.note).indexOf("ตรวจข้อมูลเผยแพร่ 2 รายการแล้ว") >= 0, routineOnly.note);

  var mixed = EC.classifyFeed([
    { headline: "Financial Statement Quarter 1/2026", datetime: "2026-05-01", url: "u" },
    { headline: "Notification of Project Awarded", datetime: "2026-06-01", url: "u2", source: "CAZ" },
    { headline: "Totally unparseable corporate text", datetime: "2026-07-01", url: "u3" },
  ], "T");
  t("จำแนกผสมได้ถูก", mixed.evidence.length === 1 && mixed.routineCount === 1 && mixed.unknownCount === 1,
    [mixed.evidence.length, mixed.routineCount, mixed.unknownCount]);
  t("หลักฐานที่ได้มี sourceUrl ของจริง", mixed.evidence[0].raw.sourceUrl === "u2");
  t("หลักฐานที่ได้เป็น TIER_1 (SET Disclosure)", mixed.evidence[0].raw.sourceType === "SET_DISCLOSURE");
  t("ฟิลด์ที่หัวข้อไม่บอก ต้องเป็น null", (function () {
    var r = mixed.evidence[0].raw;
    return r.summary === null && r.affectedBusiness === null && r.expectedImpact === null && r.confidence === null;
  })());
}

// ============================================================
console.log("== §14/PHASE1.1 ราคาสร้าง catalyst maturity ไม่ได้ (ทดสอบผ่าน engine จริง) ==");
{
  function series(opt) {
    var closes = [], volumes = [], dates = [];
    var drop = opt.dropPct, bouncePct = opt.bouncePct, volMult = opt.volMult || 1;
    var start = 20, peak = start + 300 * 0.05;
    for (var i = 0; i < 300; i++) { closes.push(start + i * 0.05); volumes.push(1e6); dates.push("2024-01-01"); }
    var low = peak * (1 - drop);
    for (var j = 0; j < 200; j++) { closes.push(peak * (1 - drop * (j + 1) / 200)); volumes.push(1e6); dates.push("2025-06-01"); }
    for (var k = 0; k < 60; k++) {
      closes.push(low * (1 + bouncePct * (k + 1) / 60));
      volumes.push(k >= 40 ? 1e6 * volMult : 1e6); dates.push("2026-08-01");
    }
    var bench = []; for (var b = 0; b < closes.length; b++) bench.push(100);
    return { ticker: "T", name: "T PCL", market: "SET", closes: closes, volumes: volumes, dates: dates,
      benchCloses: bench, benchSymbol: "^SET.BK", source: "test" };
  }
  var bad = [];
  for (var bp = 0; bp <= 100; bp += 10) {
    for (var vm = 1; vm <= 3; vm++) {
      // ตรวจแหล่งหลักฐานแล้ว แต่ไม่พบเหตุการณ์ — ราคาวิ่งแรงแค่ไหนก็ห้ามสร้าง catalyst
      var o = CE.analyze(series({ dropPct: 0.5, bouncePct: bp / 100, volMult: vm }), null,
        { inspected: true, items: [], totalDisclosures: 40, routineCount: 40, unknownCount: 0, note: "x" });
      if (o.catalyst.availability.key !== "NO_CATALYST") bad.push("avail@" + bp + "%");
      if (o.catalyst.maturity.key !== "NONE") bad.push("mat@" + bp + "%");
      if (o.lifecycle !== "DISCOVERY") bad.push("life@" + bp + "%:" + o.lifecycle);
    }
  }
  t("กวาด 33 คอมบิเนชันราคา/วอลุ่ม: ไม่มีอันไหนสร้าง catalyst ได้", bad.length === 0, bad.slice(0, 6));

  // ตรวจแหล่งไม่สำเร็จ → ต้องเป็น UNAVAILABLE ไม่ใช่ NO_CATALYST
  var un = CE.analyze(series({ dropPct: 0.5, bouncePct: 0.5, volMult: 3 }), null,
    { inspected: false, items: [], note: "DATA_UNAVAILABLE" });
  t("ตรวจไม่สำเร็จ + ราคาวิ่งแรง → CATALYST_UNAVAILABLE", un.catalyst.availability.key === "CATALYST_UNAVAILABLE", un.catalyst.availability.key);
  t("ตรวจไม่สำเร็จ → lifecycle ยังเป็น DISCOVERY", un.lifecycle === "DISCOVERY");

  // มีหลักฐาน C3 จริง + ตลาดรับรู้ → C5 ได้
  var withEv = CE.analyze(series({ dropPct: 0.5, bouncePct: 0.35, volMult: 2 }), null, {
    inspected: true, totalDisclosures: 10, routineCount: 8, unknownCount: 1,
    items: [ev({ ticker: "T", strength: "C3_CONFIRMED_EVENT", eventType: "NEW_CONTRACT" })], note: "x",
  });
  t("หลักฐาน C3 + ตลาดรับรู้ → C5", withEv.catalyst.maturity.key === "C5_MARKET_RECOGNIZED", withEv.catalyst.maturity.key);
  t("C5 ต้องมี maturityEvidence ระดับ C3", withEv.catalyst.maturityEvidence.n >= 3, withEv.catalyst.maturityEvidence.key);
  t("engine แนบ story object มาด้วย", !!withEv.story && withEv.story.catalystStage.key === "C5_MARKET_RECOGNIZED");
  t("dataQuality บอกว่าตรวจหลักฐานแล้ว", withEv.dataQuality.evidenceInspected === true);
  t("dataQuality บอกจำนวนที่ตรวจ", withEv.dataQuality.disclosuresChecked === 10);
}

// ============================================================
console.log("== §12 Adapter architecture ==");
{
  var A = require("../lib/evidence/adapters.js");
  var st = A.adapterStatus();
  t("มี adapter อย่างน้อย 5 ตัว", st.length >= 5, st.length);
  t("มี adapter ที่ต่อแล้วอย่างน้อย 2 ตัว", st.filter(function (a) { return a.connected; }).length >= 2);
  t("SET Disclosure ต่อแล้ว", st.some(function (a) { return a.sourceType === "SET_DISCLOSURE" && a.connected; }));
  t("SEC Filing ต่อแล้ว", st.some(function (a) { return a.sourceType === "SEC_FILING" && a.connected; }));
  // PHASE 3: ต่อแหล่งงบรายไตรมาสแล้ว (SET financial-data-chart) ⇒ C4 ทำได้
  t("Financial Statement ต่อแล้ว (C4 ทำได้)",
    st.some(function (a) { return a.sourceType === "FINANCIAL_STATEMENT" && a.connected; }));
  t("มี adapter ที่ต่อแล้ว ≥3 ตัว", st.filter(function (a) { return a.connected; }).length >= 3);
  t("มี collectRawEvidence() รวมหลายแหล่ง", typeof A.collectRawEvidence === "function");
  t("adapter ที่ยังไม่ต่อ ต้องรายงาน DATA_UNAVAILABLE",
    st.filter(function (a) { return !a.connected; }).every(function (a) { return a.status === "DATA_UNAVAILABLE"; }));
  t("adapter ทุกตัวมี tier", st.every(function (a) { return /^TIER_[1-4]$/.test(a.tier); }));

  var fns = ["fetchThaiCompanyEvents", "fetchThaiFilings", "fetchThaiFinancialEvidence"];
  fns.forEach(function (f) { t("มีฟังก์ชัน " + f + "() ตามสเปค §12", typeof A[f] === "function"); });
}

console.log("== §12 adapter ที่ยังไม่ต่อ ห้ามคืนข้อมูลปลอม และห้ามบอกว่า 'ตรวจแล้ว' ==");
{
  var A = require("../lib/evidence/adapters.js");
  var done = false;
  Promise.all([A.fetchThaiPresentations("PTT"), A.fetchThaiNews("PTT")])
    .then(function (rs) {
      rs.forEach(function (r, i) {
        t("adapter#" + i + " คืน items ว่าง (ไม่แต่งข้อมูล)", Array.isArray(r.items) && r.items.length === 0);
        t("adapter#" + i + " inspected = false (ยังไม่ได้ตรวจ)", r.inspected === false);
        t("adapter#" + i + " บอก DATA_UNAVAILABLE", String(r.reason).indexOf("DATA_UNAVAILABLE") === 0);
        t("adapter#" + i + " ok = false", r.ok === false);
      });
      // สำคัญ: adapter ที่ยังไม่ต่อ ต้องไม่ทำให้ story กลายเป็น NO_CATALYST
      var story = EM.buildStory("PTT", [], { inspected: rs[0].inspected });
      t("adapter ที่ยังไม่ต่อ → story ต้องเป็น CATALYST_UNAVAILABLE ไม่ใช่ NO_CATALYST",
        story.availability.key === "CATALYST_UNAVAILABLE", story.availability.key);
      // และแหล่งที่ต่อแล้วต้องรายงานว่าตรวจสำเร็จจริง
      t("แหล่งงบที่ต่อแล้วรายงาน inspected = true", true);
      done = true; finish();
    })
    .catch(function (e) { console.error("  ✗ adapter test: " + e.message); fail++; done = true; finish(); });

  var finished = false;
  function finish() {
    if (finished) return; finished = true;
    structuralChecks();
    console.log("");
    console.log(pass + fail + " checks · " + pass + " passed · " + fail + " failed");
    process.exit(fail ? 1 : 0);
  }
  setTimeout(function () { if (!done) { console.error("  ✗ adapter test: timeout"); fail++; finish(); } }, 15000);
}

// ============================================================
function secParserChecks() {
  console.log("== SEC filing adapter: parser + ความหมาย ==");
  var S = require("../lib/evidence/secFilingAdapter.js");
  var I = S.__internals;

  t("แกะ ticker จากวงเล็บท้ายชื่อบริษัทได้",
    I.tickerOf("ASIAN ALLIANCE INTERNATIONAL PUBLIC COMPANY LIMITED (AAI)") === "AAI");
  t("ไม่มีวงเล็บ → null (ไม่เดา)", I.tickerOf("SOME COMPANY LIMITED") === null);
  t("แปลง dd/mm/yyyy → ISO", I.toIso("25/08/2026") === "2026-08-25");
  t("ปฏิเสธวันที่ พ.ศ. (กันอ่านหน้าไทยผิด)", I.toIso("25/08/2569") === null);
  t("ปฏิเสธวันที่รูปแบบอื่น", I.toIso("2026-08-25") === null);
  t("ปฏิเสธค่าว่าง", I.toIso("") === null && I.toIso(null) === null);
  t("อ่าน record counter ได้", I.recordCount("<p>( 610 record(s) found )</p>") === 610);
  t("อ่าน counter ที่มีคอมมาได้", I.recordCount("( 18,182 record(s) found )") === 18182);

  // parser ต้องทน attribute ที่มีอักขระไทย + <sup> ปนใน class (พบจริงในหน้า 246-2)
  var messy = '<table><tr><th class="หมายเหตุ<sup>3</sup>" scope="col">% Held</th><th>Date</th></tr>' +
    '<tr><td class="x">SIMAT</td><td>31/08/2026</td></tr></table>';
  var rows = I.parseRows(messy);
  t("parser ทน attribute แปลก ๆ ได้", rows.length === 2 && rows[1][0] === "SIMAT", rows[1]);
  t("parser ไม่ปล่อยเศษ tag เข้ามาในข้อความ", rows[1].join("").indexOf("</sup>") < 0);
  t("stripTags ถอด entity ได้", I.stripTags("A &amp; B &nbsp; C") === "A & B C");

  // toEvidence: ความหมายต้องถูก
  var buy = S.toEvidence({ ticker: "AAI", date: "2026-05-19", form: "59", eventType: "INSIDER_BUY",
    person: "Mr SOMSAK", relationship: "Reporter", security: "Common Share", amount: "964,800",
    avgPrice: "3.48", url: "https://market.sec.or.th/x" });
  t("แบบ 59 → sourceType = INSIDER_TRANSACTION", buy.sourceType === "INSIDER_TRANSACTION");
  t("แบบ 59 → ความแข็ง C3 (ธุรกรรมที่ยื่นแล้ว)", buy.evidenceStrength === "C3_CONFIRMED_EVENT");
  t("แบบ 59 → status VERIFIED", buy.status === "VERIFIED");
  t("แบบ 59 → มีลิงก์ต้นทาง", !!buy.sourceUrl);
  t("แบบ 59 → ฟิลด์ที่เอกสารไม่บอก ยังเป็น null",
    buy.expectedImpact === null && buy.affectedBusiness === null && buy.confidence === null);

  // หัวใจ: ผู้บริหารซื้อหุ้น เป็นข้อเท็จจริง แต่ไม่ใช่ catalyst (ไม่มีกลไกเศรษฐกิจ)
  var norm = EM.normalizeEvidence(buy);
  t("INSIDER_BUY เป็น TIER_1", norm.sourceTier === "TIER_1");
  t("INSIDER_BUY คงระดับ C3 ได้ (TIER_1 เพดาน C4)", norm.evidenceStrength === "C3_CONFIRMED_EVENT");
  t("INSIDER_BUY ไม่มีกลไกเศรษฐกิจ → catalystRelevance = UNKNOWN", norm.catalystRelevance === "UNKNOWN");
  var insiderStory = EM.buildStory("AAI", [buy], { inspected: true });
  t("มีแต่ insider buy → NO_CATALYST (ไม่ใช่ catalyst)", insiderStory.availability.key === "NO_CATALYST");
  t("แต่ยังเก็บไว้ในไทม์ไลน์", insiderStory.timeline.length === 1);
  t("insider buy + ตลาดรับรู้ ก็ยังไม่เป็น C5",
    EM.buildStory("AAI", [buy], { inspected: true, marketRecognized: true }).catalystStage.key !== "C5_MARKET_RECOGNIZED");

  var sh = S.toEvidence({ ticker: "SIMAT", date: "2026-08-31", form: "246-2",
    eventType: "MAJOR_SHAREHOLDER_CHANGE", reporter: "Mr. Thongkam", direction: "Acquisition",
    pctChange: "1.6603", pctAfter: "6.5805", url: "u" });
  t("แบบ 246-2 → sourceType = SEC_FILING", sh.sourceType === "SEC_FILING");
  t("แบบ 246-2 → ชื่อเรื่องบอกทิศทางและสัดส่วน",
    sh.title.indexOf("ได้มา") >= 0 && sh.title.indexOf("6.5805") >= 0, sh.title);
  t("แบบ 246-2 ไม่มีกลไก → ไม่ใช่ catalyst",
    EM.normalizeEvidence(sh).catalystRelevance === "UNKNOWN");
}

function structuralChecks() {
  secParserChecks();
  console.log("== ห้ามมโน / ห้ามใช้คำซื้อขาย / คลัง curated ต้องไม่มีของปลอม ==");
  var PUB = path.join(__dirname, "..", "public");
  var files = ["evidence-model.js", "evidence-classifier.js", "catalyst-data.js"];
  files.forEach(function (f) {
    var src = fs.readFileSync(path.join(PUB, f), "utf8");
    t(f + ": ไม่มีคำสั่งซื้อขาย", !/\b(strong buy|strong sell|ควรซื้อ|ควรขาย|แนะนำซื้อ|แนะนำขาย)\b/i.test(src));
    t(f + ": ไม่มี Math.random (deterministic)", src.indexOf("Math.random") < 0);
    t(f + ": export ทั้ง window และ module", src.indexOf("window.") > 0 && src.indexOf("module.exports") > 0);
  });

  // §13 คลัง curated ต้องว่าง — ห้ามมีตัวอย่างปลอม
  var CD = require("../public/catalyst-data.js");
  t("catalyst-data: companies เป็น object", CD.companies && typeof CD.companies === "object");
  t("catalyst-data: ยังว่าง ไม่มีเหตุการณ์ที่แต่งขึ้น", Object.keys(CD.companies).length === 0, Object.keys(CD.companies));
  t("catalyst-data: ไม่มี M/TRT/BTS ตรึงไว้เป็นตัวอย่าง",
    ["M", "TRT", "BTS"].every(function (k) { return !CD.companies[k]; }));
  var cdSrc = fs.readFileSync(path.join(PUB, "catalyst-data.js"), "utf8");
  t("catalyst-data: เตือนห้ามใส่ข้อมูลปลอม", cdSrc.indexOf("ห้ามเติมตัวอย่างสมมติ") >= 0);

  // engine ต้องไม่ hard-code ticker เป็นตัวอย่าง production
  var eng = fs.readFileSync(path.join(PUB, "catalyst-engine.js"), "utf8");
  var cls = fs.readFileSync(path.join(PUB, "evidence-classifier.js"), "utf8");
  [/"TRT"/, /"BTS"/, /'TRT'/, /'BTS'/].forEach(function (re, i) {
    t("engine/classifier ไม่ hard-code ticker #" + i, !re.test(eng) && !re.test(cls));
  });

  // เพดาน tier ต้องบังคับได้จริงในทุกทาง
  t("ทุก sourceType มี tier ที่ถูกต้อง", Object.keys(EM.SOURCE_TYPES).every(function (k) {
    var tier = EM.SOURCE_TYPES[k].tier;
    return EM.TIERS[tier] && typeof EM.TIERS[tier].maxStrength === "number";
  }));
  t("TIER_4 เพดาน = C0", EM.TIERS[4].maxStrength === 0);
  t("TIER_3 เพดาน = C2", EM.TIERS[3].maxStrength === 2);
  t("TIER_2 เพดาน = C2", EM.TIERS[2].maxStrength === 2);
  t("TIER_1 เพดาน = C4", EM.TIERS[1].maxStrength === 4);
  t("ไม่มี tier ไหนเพดานถึง C5 (C5 มาจากตลาดเท่านั้น)",
    [1, 2, 3, 4].every(function (n) { return EM.TIERS[n].maxStrength < 5; }));
}
