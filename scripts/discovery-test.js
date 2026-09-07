// THAI CATALYST HUNTER — PHASE 3 · DISCOVERY + FINANCIAL INTELLIGENCE
// node scripts/discovery-test.js
//
// ครอบ §28 ทั้งหมด · หัวใจที่ทดสอบซ้ำ ๆ:
//   • แหล่งค้นพบสร้าง LEAD ได้ แต่ห้ามสร้าง C3/C4/C5
//   • จำนวนแหล่งค้นพบมาก ≠ หลักฐานแข็ง
//   • "ไม่มีข้อมูล" ≠ "ไม่มี catalyst" ≠ "ไม่มี inflection"
"use strict";
var fs = require("fs");
var path = require("path");
var DP = require("../public/discovery-plane.js");
var EM = require("../public/evidence-model.js");
var FI = require("../public/financial-inflection.js");
var CE = require("../public/catalyst-engine.js");

var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; return; }
  fail++; console.error("  ✗ " + name + (extra !== undefined ? " — got: " + JSON.stringify(extra) : ""));
}

var UNI = ["TRT", "M", "BTS", "ADVANC", "DELTA", "UBA", "EURO", "SAMART", "AI", "NEW", "IT"];
var CTX = { universe: UNI, asOf: "2026-09-07", now: "2026-09-07", assumeStockContext: true };
function d(o) { return DP.normalizeDiscovery(o, CTX); }
function disc(o) {
  o = o || {};
  return d({
    id: o.id || null,
    sourceType: o.st || "NEWS",
    sourceName: o.name || "แหล่งทดสอบ",
    sourceUrl: o.url === undefined ? "https://example.test/1" : o.url,
    publishedAt: o.date === undefined ? "2026-09-01" : o.date,
    title: o.title === undefined ? "หุ้น TRT ได้งานใหม่จากดาต้าเซ็นเตอร์" : o.title,
    summary: o.summary === undefined ? null : o.summary,
    ticker: o.ticker === undefined ? null : o.ticker,
  });
}
function primary(o) {
  o = o || {};
  return EM.normalizeEvidence({
    ticker: o.ticker || "TRT",
    eventDate: o.date || "2026-09-05",
    sourceType: o.st || "SET_DISCLOSURE",
    sourceName: "SET",
    sourceUrl: "https://set.test/x",
    eventType: o.eventType || "NEW_ORDER",
    title: o.title || "TRT ยืนยันคำสั่งซื้อใหม่",
    evidenceStrength: o.strength || "C3_CONFIRMED_EVENT",
    status: "VERIFIED",
  });
}

// ============================================================
console.log("== §17 SOURCE TIER ==");
{
  var expect = {
    SET_DISCLOSURE: "TIER_1", SEC_FILING: "TIER_1", COMPANY_DISCLOSURE: "TIER_1",
    FINANCIAL_STATEMENT: "TIER_1", INSIDER_TRANSACTION: "TIER_1", REGULATORY: "TIER_1",
    COMPANY_PRESENTATION: "TIER_2", COMPANY_IR: "TIER_2", OPPORTUNITY_DAY: "TIER_2",
    NEWS: "TIER_3", INDUSTRY_DATA: "TIER_3",
    THAIVI: "TIER_3_5", THAIVI_MEMBER_USER_PROVIDED: "TIER_3_5", SOCIAL: "TIER_3_5", SOCIAL_USER_PROVIDED: "TIER_3_5",
    RUMOR: "TIER_4", OTHER: "TIER_4",
  };
  Object.keys(expect).forEach(function (k) {
    var st = EM.SOURCE_TYPES[k];
    t(k + " = " + expect[k], !!st && EM.TIERS[st.tier].key === expect[k], st ? EM.TIERS[st.tier].key : "ไม่มี");
  });
  t("เพดาน TIER_3_5 = C1", EM.TIERS[3.5].maxStrength === 1);
  t("เพดาน TIER_4 = C0", EM.TIERS[4].maxStrength === 0);
  t("ไม่มี tier ใดเพดานถึง C5", [1, 2, 3, 3.5, 4].every(function (n) { return EM.TIERS[n].maxStrength < 5; }));
  t("isDiscoveryTier: 3.5 และ 4 คือระนาบค้นพบ", EM.isDiscoveryTier(3.5) && EM.isDiscoveryTier(4));
  t("isDiscoveryTier: 1-3 ไม่ใช่", !EM.isDiscoveryTier(1) && !EM.isDiscoveryTier(3));
  t("isPrimaryTier: เฉพาะ 1-2", EM.isPrimaryTier(1) && EM.isPrimaryTier(2) && !EM.isPrimaryTier(3));
}

// ============================================================
console.log("== §3/§4/§5 NEWS / FACEBOOK / THAIVI / USER-PROVIDED → LEAD ==");
{
  [["NEWS", "ข่าว"], ["SOCIAL", "Facebook (โพสต์สาธารณะ)"], ["THAIVI", "ThaiVI"],
    ["THAIVI_MEMBER_USER_PROVIDED", "ThaiVI สมาชิก (ผู้ใช้นำมาให้)"], ["SOCIAL_USER_PROVIDED", "โซเชียล (ผู้ใช้นำมาให้)"],
  ].forEach(function (x) {
    var c = DP.buildClusters([disc({ st: x[0] })], []);
    t(x[1] + " → LEAD", c[0].catalystStage === "LEAD", c[0].catalystStage);
    t(x[1] + " → stageSource = DISCOVERY", c[0].stageSource === "DISCOVERY");
    t(x[1] + " → ยังไม่ได้ตรวจสอบ", c[0].verificationStatus === "UNVERIFIED");
  });
  t("แหล่งค้นพบตั้ง verificationStatus = UNVERIFIED เสมอ",
    disc({ st: "SOCIAL" }).verificationStatus === "UNVERIFIED");
  t("แหล่งค้นพบที่อ้างว่า VERIFIED มาเองก็ไม่ยกสถานะกลุ่ม", (function () {
    var e = d({ sourceType: "SOCIAL", sourceUrl: "u", publishedAt: "2026-09-01",
      title: "หุ้น TRT ได้งานใหม่", verificationStatus: "VERIFIED" });
    var c = DP.buildClusters([e], []);
    return c[0].catalystStage === "LEAD";
  })());
}

console.log("== §17 RUMOR → C0 ==");
{
  var r = EM.normalizeEvidence({ ticker: "TRT", eventDate: "2026-09-01", sourceType: "RUMOR",
    sourceUrl: "u", eventType: "NEW_ORDER", title: "ลือว่าได้งานใหญ่", evidenceStrength: "C3_CONFIRMED_EVENT" });
  t("RUMOR = TIER_4", r.sourceTier === "TIER_4");
  t("RUMOR อ้าง C3 → ถูกกดเหลือ C0", r.evidenceStrength === "C0_RUMOR", r.evidenceStrength);
  t("RUMOR → stage C0_RUMOR", EM.buildStory("TRT", [r], { inspected: true }).catalystStage.key === "C0_RUMOR");
}

console.log("== §12 แหล่งค้นพบลำพัง ห้ามถึง C3/C4/C5 ==");
{
  ["NEWS", "SOCIAL", "THAIVI", "THAIVI_MEMBER_USER_PROVIDED", "SOCIAL_USER_PROVIDED", "RUMOR"].forEach(function (st) {
    var raw = { ticker: "TRT", eventDate: "2026-09-01", sourceType: st, sourceUrl: "u",
      eventType: "NEW_ORDER", title: "อ้างว่าได้งาน", evidenceStrength: "C3_CONFIRMED_EVENT", status: "VERIFIED" };
    var story = EM.buildStory("TRT", [raw], { inspected: true });
    t(st + " ลำพัง ไม่ถึง C3", story.catalystStage.n < 3, story.catalystStage.key);
    var withMkt = EM.buildStory("TRT", [raw], { inspected: true, marketRecognized: true });
    t(st + " + ตลาดรับรู้ ก็ไม่ถึง C5", withMkt.catalystStage.key !== "C5_MARKET_RECOGNIZED", withMkt.catalystStage.key);
    var c4try = EM.buildStory("TRT", [Object.assign({}, raw, { evidenceStrength: "C4_FINANCIAL_EVIDENCE" })], { inspected: true });
    t(st + " อ้าง C4 ก็ไม่ได้ C4", c4try.catalystStage.key !== "C4_FINANCIAL_EVIDENCE", c4try.catalystStage.key);
  });
  // จำนวนมากก็ไม่ช่วย
  var many = [];
  for (var i = 0; i < 40; i++) {
    many.push({ ticker: "TRT", eventDate: "2026-0" + ((i % 8) + 1) + "-01", sourceType: i % 2 ? "SOCIAL" : "THAIVI",
      sourceUrl: "u" + i, eventType: "NEW_ORDER", title: "ลือว่าได้งาน " + i, evidenceStrength: "C3_CONFIRMED_EVENT" });
  }
  t("40 สัญญาณค้นพบ ยังไม่ถึง C3", EM.buildStory("TRT", many, { inspected: true }).catalystStage.n < 3);
  t("40 ข่าว TIER_3 ยังไม่ถึง C3", EM.buildStory("TRT",
    many.map(function (m) { return Object.assign({}, m, { sourceType: "NEWS" }); }), { inspected: true }).catalystStage.n < 3);
}

console.log("== §12/§10 แหล่งปฐมภูมิ → C3 เมื่อเข้าเกณฑ์ ==");
{
  var story = EM.buildStory("TRT", [primary()], { inspected: true });
  t("SET Disclosure C3 → C3_CONFIRMED", story.catalystStage.key === "C3_CONFIRMED", story.catalystStage.key);
  t("ก.ล.ต. C3 → C3_CONFIRMED",
    EM.buildStory("TRT", [primary({ st: "SEC_FILING" })], { inspected: true }).catalystStage.key === "C3_CONFIRMED");
  t("TIER_2 (oppday) อ้าง C3 → ได้แค่ C2",
    EM.buildStory("TRT", [primary({ st: "OPPORTUNITY_DAY" })], { inspected: true }).catalystStage.key === "C2_ANNOUNCED");
  // §10 ห่วงโซ่ครบ
  var chain = DP.buildClusters(
    [disc({ st: "SOCIAL", date: "2026-08-20", title: "หุ้น TRT อาจได้ออเดอร์หม้อแปลงเพิ่ม" }),
      disc({ st: "THAIVI", date: "2026-08-25", title: "หุ้น TRT ความต้องการหม้อแปลงดีขึ้น" }),
      disc({ st: "NEWS", date: "2026-08-28", title: "หุ้น TRT ดาต้าเซ็นเตอร์ดันความต้องการหม้อแปลง" })],
    [primary({ date: "2026-09-05" })]);
  t("LEAD → NARRATIVE → C3 เมื่อมีเอกสารปฐมภูมิ", chain[0].catalystStage === "C3_CONFIRMED", chain[0].catalystStage);
  t("ขั้นมาจากหลักฐาน ไม่ใช่จากการค้นพบ", chain[0].stageSource === "EVIDENCE");
  t("verification = VERIFIED", chain[0].verificationStatus === "VERIFIED");
  t("§21 ไทม์ไลน์เก็บทั้งการค้นพบและหลักฐาน", chain[0].timeline.length === 4, chain[0].timeline.length);
  t("§10 ไม่ลบประวัติการค้นพบเมื่อมีหลักฐานแข็งกว่า",
    chain[0].timeline.filter(function (x) { return x.kind === "DISCOVERY"; }).length === 3);
  t("ไทม์ไลน์เรียงตามเวลา", (function () {
    var ds = chain[0].timeline.map(function (x) { return x.date; });
    return JSON.stringify(ds) === JSON.stringify(ds.slice().sort());
  })());
}

// ============================================================
console.log("== §9 NARRATIVE_EMERGING ==");
{
  var one = DP.buildClusters([disc({ st: "NEWS" })], []);
  t("1 แหล่ง → LEAD", one[0].catalystStage === "LEAD");
  var two = DP.buildClusters([disc({ st: "NEWS", url: "u1" }), disc({ st: "THAIVI", url: "u2", date: "2026-09-02" })], []);
  t("2 แหล่งอิสระ → NARRATIVE_EMERGING", two[0].catalystStage === "NARRATIVE_EMERGING", two[0].catalystStage);
  var same = DP.buildClusters([disc({ st: "NEWS", url: "u1" }), disc({ st: "NEWS", url: "u2", date: "2026-09-02" })], []);
  t("2 ชิ้นจากแหล่งชนิดเดียวกัน → ยังเป็น LEAD", same[0].catalystStage === "LEAD", same[0].catalystStage);
  t("NARRATIVE_EMERGING ไม่ใช่ C3", two[0].catalystStage !== "C3_CONFIRMED");
  t("NARRATIVE_EMERGING ยังไม่ verified", two[0].verificationStatus === "UNVERIFIED");
  t("นับแหล่งอิสระถูกต้อง", two[0].independentFreshSources === 2, two[0].independentFreshSources);
  t("อธิบายว่ายังไม่มีหลักฐานปฐมภูมิ", String(two[0].note).indexOf("ยังไม่มีหลักฐานปฐมภูมิ") >= 0, two[0].note);
}

console.log("== §8/§25 STORY CLUSTER + dedupe ที่ไม่ใช่แค่ URL ==");
{
  var SPEC = ["clusterId", "ticker", "storyTitle", "storyCategory", "firstDetectedDate", "latestDetectedDate",
    "discoverySources", "evidenceSources", "eventIds", "sourceCount", "sourceDiversity",
    "verificationStatus", "catalystStage"];
  var c = DP.buildClusters([disc({ st: "NEWS", id: "n1" }), disc({ st: "THAIVI", id: "t1", date: "2026-09-03" })], []);
  var miss = SPEC.filter(function (k) { return !Object.prototype.hasOwnProperty.call(c[0], k); });
  t("StoryCluster มีฟิลด์ครบตามสเปค §8", miss.length === 0, miss);
  t("เก็บ eventIds ทุกชิ้น", c[0].eventIds.length === 2, c[0].eventIds);
  t("นับ sourceDiversity แยกจาก sourceCount", c[0].sourceCount === 2 && c[0].sourceDiversity === 2);
  t("เก็บรายการแหล่งค้นพบไว้ครบ", c[0].discoverySources.length === 2);
  t("ไม่ยุบเป็นคะแนนเดียว",
    !Object.prototype.hasOwnProperty.call(c[0], "score") && !Object.prototype.hasOwnProperty.call(c[0], "totalScore"));

  // บทความซ้ำ URL ต่างกัน → กลุ่มเดียว
  var dup = DP.buildClusters([
    disc({ st: "NEWS", url: "https://a.test/1", date: "2026-09-01", title: "หุ้น TRT ได้งานหม้อแปลงใหม่" }),
    disc({ st: "NEWS", url: "https://b.test/9", date: "2026-09-02", title: "TRT รับงานหม้อแปลง (TRT)" }),
    disc({ st: "NEWS", url: "https://c.test/7", date: "2026-09-03", title: "หุ้น TRT คว้างานหม้อแปลง" }),
  ], []);
  t("3 บทความ URL ต่างกัน เรื่องเดียวกัน → 1 cluster", dup.length === 1, dup.length);
  t("cluster เก็บทั้ง 3 ชิ้น", dup[0].sourceCount === 3);

  // เรื่องต่างกัน → แยกกลุ่ม
  var diff = DP.buildClusters([
    disc({ st: "NEWS", url: "u1", title: "หุ้น TRT ได้งานใหม่" }),
    disc({ st: "NEWS", url: "u2", title: "หุ้น DELTA เปลี่ยนผู้บริหาร", date: "2026-09-02" }),
  ], []);
  t("เรื่องต่างหุ้น → แยก cluster", diff.length === 2, diff.length);
  var diffType = DP.buildClusters([
    disc({ st: "NEWS", url: "u1", title: "หุ้น TRT ได้งานใหม่" }),
    disc({ st: "NEWS", url: "u2", title: "หุ้น TRT เปลี่ยนผู้บริหาร", date: "2026-09-02" }),
  ], []);
  t("หุ้นเดียวกันแต่คนละประเภทเหตุการณ์ → แยก cluster", diffType.length === 2, diffType.length);
  var farApart = DP.buildClusters([
    disc({ st: "NEWS", url: "u1", title: "หุ้น TRT ได้งานใหม่", date: "2026-01-01" }),
    disc({ st: "NEWS", url: "u2", title: "หุ้น TRT ได้งานใหม่", date: "2026-09-01" }),
  ], []);
  t("ห่างกันเกินหน้าต่างเวลา → แยก cluster", farApart.length === 2, farApart.length);
}

console.log("== §11 CONFLICTING SOURCES ==");
{
  var c = DP.buildClusters([
    disc({ st: "NEWS", url: "u1", date: "2026-09-01", title: "หุ้น TRT ได้งานใหม่ก้อนใหญ่" }),
    disc({ st: "THAIVI", url: "u2", date: "2026-09-02", title: "หุ้น TRT ข่าวได้งานใหม่ถูกยกเลิกแล้ว" }),
  ], []);
  t("แหล่งขัดแย้ง → CONFLICTING_EVIDENCE", c[0].catalystStage === "CONFLICTING_EVIDENCE", c[0].catalystStage);
  t("verification = CONFLICTING", c[0].verificationStatus === "CONFLICTING");
  t("เก็บข้ออ้างทั้งสองด้าน", c[0].conflictingClaims.positive.length === 1 && c[0].conflictingClaims.negative.length === 1);
  t("ข้ออ้างเก็บที่มาไว้ครบ", !!c[0].conflictingClaims.positive[0].url && !!c[0].conflictingClaims.positive[0].date);
  t("ไม่เลือกด้านบวกให้เอง", String(c[0].note).indexOf("ไม่เลือกด้านบวก") >= 0);
  t("ขัดแย้งกันไม่ยกระดับเป็น NARRATIVE_EMERGING", c[0].catalystStage !== "NARRATIVE_EMERGING");
  // ขัดแย้งกัน + มีหลักฐานปฐมภูมิ → หลักฐานชนะ แต่ธงขัดแย้งยังอยู่
  var withEv = DP.buildClusters([
    disc({ st: "NEWS", url: "u1", date: "2026-09-01", title: "หุ้น TRT ได้งานใหม่" }),
    disc({ st: "NEWS", url: "u2", date: "2026-09-02", title: "หุ้น TRT งานใหม่ถูกยกเลิก" }),
  ], [primary({ date: "2026-09-05" })]);
  t("มีหลักฐานปฐมภูมิ → ขั้นมาจากหลักฐาน", withEv[0].stageSource === "EVIDENCE");
  t("แต่ยังคงธงขัดแย้งไว้", withEv[0].conflicting === true);
}

console.log("== §26 STALE NEWS ==");
{
  var old = disc({ st: "NEWS", date: "2024-03-01" });
  t("บทความ 2 ปีก่อน → stale", old.stale === true, old.staleDays);
  t("บันทึกจำนวนวัน", typeof old.staleDays === "number" && old.staleDays > 500);
  t("อธิบายว่าไม่ถือเป็นสัญญาณใหม่", old.notes.join(" ").indexOf("ไม่ถือเป็นสัญญาณใหม่") >= 0);
  var c = DP.buildClusters([old], []);
  t("สัญญาณเก่าล้วน → ไม่เป็น LEAD", c[0].catalystStage === "NONE", c[0].catalystStage);
  t("แต่ยังเก็บไว้ในไทม์ไลน์", c[0].timeline.length === 1);
  t("ทำเครื่องหมาย stale ในไทม์ไลน์", c[0].timeline[0].stale === true);
  var fresh = disc({ st: "NEWS", date: "2026-09-01" });
  t("บทความใหม่ → ไม่ stale", fresh.stale === false, fresh.staleDays);
  t("นับ staleCount แยก", DP.buildClusters([old, fresh], [])[0].staleCount >= 0);
  t("เก็บ 3 วันที่แยกกัน (§26)", (function () {
    var e = d({ sourceType: "NEWS", publishedAt: "2026-09-01", eventDate: "2026-08-28",
      retrievedAt: "2026-09-07", title: "หุ้น TRT ได้งานใหม่", sourceUrl: "u" });
    return e.publishedAt === "2026-09-01" && e.eventDate === "2026-08-28" && e.retrievedAt === "2026-09-07";
  })());
  t("วันที่อนาคตถูกตั้งข้อสังเกต",
    d({ sourceType: "NEWS", publishedAt: "2027-01-01", title: "หุ้น TRT ได้งาน", sourceUrl: "u" })
      .notes.join(" ").indexOf("อนาคต") >= 0);
}

console.log("== §5 UNKNOWN TICKER / MISSING DATE / MISSING URL ==");
{
  t("ระบุ ticker ไม่ได้ → UNKNOWN", disc({ title: "ตลาดหุ้นไทยผันผวนตามเฟด" }).ticker === "UNKNOWN");
  t("ticker ที่ไม่อยู่ในทะเบียน → ไม่รับ",
    disc({ ticker: "ZZZZ", title: "อะไรก็ตาม" }).ticker === "UNKNOWN");
  t("บอกเหตุผลว่าไม่อยู่ในทะเบียน",
    disc({ ticker: "ZZZZ", title: "x" }).notes.join(" ").indexOf("ไม่อยู่ในทะเบียน") >= 0);
  t("หลาย ticker ในพาดหัว → AMBIGUOUS/UNKNOWN", (function () {
    var r = DP.extractTickers("ชู TRT-DELTA-M เด่น", UNI, { assumeStockContext: true });
    return r.ticker === "UNKNOWN";
  })());
  t("ticker สั้น (M) ไม่มีเครื่องหมาย → UNKNOWN",
    DP.extractTickers("ผมชอบ M มากเลย", UNI, { assumeStockContext: true }).ticker === "UNKNOWN");
  t("ticker สั้นที่มีวงเล็บและเป็นประธาน → รับได้",
    DP.extractTickers("(M) เปิดงบไตรมาส 2", UNI, { assumeStockContext: true }).ticker === "M");
  t("คำอังกฤษที่ตรงกับ ticker (AI/NEW/IT) ไม่รับจากตัวพิมพ์ใหญ่โดด ๆ", (function () {
    return ["AI", "NEW", "IT"].every(function (w) {
      return DP.extractTickers("กลุ่ม " + w + "-ชิป มาแรง", UNI, { assumeStockContext: true }).ticker === "UNKNOWN";
    });
  })());
  t("ชื่อผู้ให้ความเห็นไม่ถูกอ่านเป็นประธาน",
    DP.extractTickers("สรุปกระดานรายใหญ่วันนี้ M มูลค่าสูงสุด", UNI, { assumeStockContext: true }).ticker === "UNKNOWN");

  t("ไม่มีวันที่ → ปฏิเสธ", !!disc({ date: null }).rejected);
  t("ไม่มีวันที่ → ข้อความบอกว่าห้ามเดา", String(disc({ date: null }).rejected).indexOf("ห้ามเดา") >= 0);
  t("ไม่มีหัวข้อ → ปฏิเสธ", !!disc({ title: null }).rejected);
  t("ปฏิเสธแล้วไม่เข้า cluster", DP.buildClusters([disc({ date: null })], []).length === 0);

  var noUrl = disc({ url: null });
  t("ไม่มี URL → sourceUrl = null (ไม่แต่ง)", noUrl.sourceUrl === null);
  t("ไม่มี URL → ยังใช้ได้แต่เตือน", !noUrl.rejected && noUrl.notes.join(" ").indexOf("ลิงก์ต้นทาง") >= 0);
  t("§27 เก็บที่มาครบทุกชิ้น", (function () {
    var e = disc({ st: "THAIVI" });
    return e.sourceType && e.sourceTier && e.sourceName && e.publishedAt && e.retrievedAt && e.verificationStatus;
  })());
}

console.log("== §7 keyword = สัญญาณค้นพบ ไม่ใช่หลักฐาน ==");
{
  var s = DP.detectSignals("หุ้น TRT ได้งานใหม่ เพิ่มกำลังผลิตหม้อแปลง รับดาต้าเซ็นเตอร์");
  t("จับคำไทยได้", s.keywords.length >= 3, s.keywords);
  t("แปลงเป็นประเภทเหตุการณ์", s.eventTypes.indexOf("NEW_ORDER") >= 0 && s.eventTypes.indexOf("CAPACITY_EXPANSION") >= 0);
  t("จับคำอังกฤษได้", DP.detectSignals("new order and backlog expansion").eventTypes.indexOf("BACKLOG") >= 0);
  t("โทนลบถูกตรวจจับ", DP.detectSignals("สัญญาถูกยกเลิก").negative === true);
  t("คำค้นครอบทั้งไทยและอังกฤษ", DP.KEYWORDS.length >= 50, DP.KEYWORDS.length);
  t("มีประเภทเหตุการณ์ของระนาบค้นพบครบ", ["INDUSTRY_DEMAND_CHANGE", "INDUSTRY_SUPPLY_CHANGE",
    "TURNAROUND", "MARGIN_RECOVERY", "EARNINGS_RECOVERY"].every(function (k) { return !!DP.eventTypeInfo(k); }));
  t("§6 ประเภทเหตุการณ์รวมทั้งสองระนาบ", DP.allEventTypes().length >= 40, DP.allEventTypes().length);
  // คำที่ตรงต้องไม่กลายเป็นหลักฐาน
  var kwOnly = DP.buildClusters([disc({ st: "SOCIAL", title: "หุ้น TRT ได้งานใหม่ backlog เพิ่ม คำสั่งซื้อเข้า" })], []);
  t("คำค้นเยอะแค่ไหนก็ยังเป็น LEAD", kwOnly[0].catalystStage === "LEAD", kwOnly[0].catalystStage);
  t("ไม่มี evidenceItems จากคำค้น", kwOnly[0].evidenceItems.length === 0);
}

// ============================================================
console.log("== §13/§16 FINANCIAL_EVIDENCE_UNAVAILABLE ≠ NO_FINANCIAL_INFLECTION ==");
{
  var un = FI.compute({ inspected: false, quarters: [], reason: "FINANCIAL_EVIDENCE_UNAVAILABLE: ดึงไม่ได้" });
  t("ดึงงบไม่ได้ → FINANCIAL_EVIDENCE_UNAVAILABLE", un.state.key === "FINANCIAL_EVIDENCE_UNAVAILABLE");
  t("dataAvailability บอกชัด", un.dataAvailability === "FINANCIAL_EVIDENCE_UNAVAILABLE");
  t("ทุกรายการเป็น UNAVAILABLE", Object.keys(un.metrics).every(function (k) {
    return un.metrics[k].state.key === "FINANCIAL_EVIDENCE_UNAVAILABLE";
  }));
  t("ไม่ใช่ NO_INFLECTION", un.state.key !== "NO_INFLECTION");
  t("อธิบายว่าไม่ได้แปลว่าไม่มี inflection",
    String(un.state.thai).indexOf("ไม่ได้แปลว่าไม่มี") >= 0);
  t("ไม่เข้าเกณฑ์ C4", un.qualifiesAsC4 !== true);

  // มีงบครบแต่ไม่พลิก → NO_INFLECTION (คนละอย่าง)
  function q(date, rev, ni, op, eps, fcf, debt) {
    return { date: date, revenue: rev, netIncome: ni, operatingIncome: op, eps: eps, fcf: fcf,
      totalDebt: debt, currency: "THB", periodType: "3M",
      operatingMargin: rev && rev > 0 && op != null ? op / rev : null };
  }
  var flat = { inspected: true, source: "test", quarters: [
    q("2025-06-30", 1000, 100, 100, 1.0, 50, 500), q("2025-09-30", 1010, 101, 101, 1.01, 50, 500),
    q("2025-12-31", 1005, 100, 100, 1.0, 50, 500), q("2026-03-31", 1015, 102, 102, 1.02, 50, 500),
    q("2026-06-30", 1020, 103, 103, 1.03, 50, 500)] };
  var fl = FI.compute(flat);
  t("มีงบครบแต่แบน → NO_INFLECTION", fl.state.key === "NO_INFLECTION", fl.state.key);
  t("dataAvailability = FINANCIAL_DATA_AVAILABLE", fl.dataAvailability === "FINANCIAL_DATA_AVAILABLE");
  t("สองสถานะนี้ต้องต่างกัน", fl.state.key !== un.state.key);
  t("แบน → ไม่เข้าเกณฑ์ C4", fl.qualifiesAsC4 === false);
  t("แบน → ไม่สร้างหลักฐาน", FI.toEvidence("TRT", fl) === null);

  // §16 สถานะทั้ง 4 ระดับมีจริง
  ["NO_INFLECTION", "EARLY_INFLECTION", "CONFIRMED_INFLECTION", "STRONG_INFLECTION"].forEach(function (k) {
    t("มีสถานะ " + k, !!FI.STATE[k]);
  });
  // §16 backlog ไม่มีแหล่ง
  t("BACKLOG_INFLECTION = UNAVAILABLE เสมอ",
    fl.metrics.BACKLOG_INFLECTION.state.key === "FINANCIAL_EVIDENCE_UNAVAILABLE");
  t("บอกว่าห้ามอนุมาน backlog จากรายได้",
    String(fl.metrics.BACKLOG_INFLECTION.reason).indexOf("ห้ามอนุมาน") >= 0);

  // §15 ข้อมูลเสียต้องถูกปฏิเสธ ไม่กลืนเงียบ
  var FA = require("../lib/evidence/thaiFinancialAdapter.js");
  t("revenue = 0 พร้อมมีกำไร → ถูกตั้งข้อสังเกต",
    FA.__internals.validQuarter({ date: "2026-06-30", revenue: 0, netIncome: 100, currency: "THB", periodType: "3M" }).length > 0);
  t("สกุลเงินไม่ใช่ THB → ถูกตั้งข้อสังเกต",
    FA.__internals.validQuarter({ date: "2026-06-30", revenue: 100, currency: "USD", periodType: "3M" }).length > 0);
  t("งวดไม่ใช่ 3M → ถูกตั้งข้อสังเกต",
    FA.__internals.validQuarter({ date: "2026-06-30", revenue: 100, currency: "THB", periodType: "12M" }).length > 0);
  t("วันที่ผิดรูปแบบ → ถูกตั้งข้อสังเกต",
    FA.__internals.validQuarter({ date: "Q2/2026", revenue: 100, currency: "THB", periodType: "3M" }).length > 0);
  t("งวดที่ถูกต้อง → ผ่าน",
    FA.__internals.validQuarter({ date: "2026-06-30", revenue: 100, netIncome: 10, currency: "THB", periodType: "3M" }).length === 0);
}

console.log("== §16 FINANCIAL EVIDENCE → C4 · และ C5 ต้องมีการรับรู้ของตลาด ==");
{
  function q(date, rev, op, eps) {
    return { date: date, revenue: rev, netIncome: Math.round(rev * 0.1), operatingIncome: op, eps: eps,
      fcf: 100, totalDebt: 500, currency: "THB", periodType: "3M",
      operatingMargin: rev > 0 ? op / rev : null };
  }
  var strong = { inspected: true, source: "test", quarters: [
    q("2025-06-30", 500, 20, 0.10), q("2025-09-30", 600, 40, 0.16), q("2025-12-31", 700, 70, 0.24),
    q("2026-03-31", 850, 110, 0.36), q("2026-06-30", 900, 130, 0.42)] };
  var inf = FI.compute(strong);
  t("ตัวเลขพลิกจริง → ยืนยันได้", inf.state.n >= 2, inf.state.key);
  t("มี ≥2 รายการหลักยืนยัน", inf.confirmedCoreCount >= 2, inf.confirmedCoreCount);
  t("เข้าเกณฑ์ C4", inf.qualifiesAsC4 === true);
  var ev = FI.toEvidence("TRT", inf);
  t("สร้างหลักฐาน C4 ได้", !!ev && ev.evidenceStrength === "C4_FINANCIAL_EVIDENCE");
  t("หลักฐาน C4 เป็น TIER_1", EM.normalizeEvidence(ev).sourceTier === "TIER_1");
  t("หลักฐาน C4 ผ่านเพดาน", EM.normalizeEvidence(ev).evidenceStrength === "C4_FINANCIAL_EVIDENCE");
  t("§27 ไม่มี URL ก็เป็น null ไม่แต่ง", ev.sourceUrl === null);
  t("ฟิลด์ที่งบไม่บอกยังเป็น null", ev.summary === null && ev.expectedImpact === null && ev.confidence === null);

  var story = EM.buildStory("TRT", [ev], { inspected: true });
  // PHASE 5 — §1 งบฟื้น ≠ catalyst · หลักฐานงบลำพังไม่สร้างขั้น catalyst เลย
  t("งบล้วน → ไม่มีขั้น catalyst (NONE)", story.catalystStage.key === "NONE", story.catalystStage.key);
  t("งบล้วน → availability = NO_CATALYST (ตรวจแล้วไม่พบ)",
    story.availability.key === "NO_CATALYST", story.availability.key);
  t("งบล้วน → ไม่ถูกนับเป็นหลักฐาน catalyst", story.evidenceItems.length === 0);
  t("งบล้วน → หลักฐานงบยังเข้าถึงได้ที่ financialEvidence",
    (story.financialEvidence || []).length === 1);
  t("งบล้วน → ยังยืนยัน financialImpact ได้", (story.financialImpact || []).length === 1);
  t("งบล้วน + ตลาดยังไม่รับรู้ → ยังไม่มีขั้น",
    EM.buildStory("TRT", [ev], { inspected: true, marketRecognized: false }).catalystStage.key === "NONE");
  t("งบล้วน + ตลาดรับรู้ → ยังไม่ถึง C5 (ราคาไม่สร้าง catalyst)",
    EM.buildStory("TRT", [ev], { inspected: true, marketRecognized: true }).catalystStage.key === "NONE");
  t("หลักฐานงบ relevance = FINANCIAL_EVIDENCE ไม่ใช่ CATALYST_RELEVANT",
    EM.normalizeEvidence(ev).catalystRelevance === "FINANCIAL_EVIDENCE",
    EM.normalizeEvidence(ev).catalystRelevance);
  t("หลักฐานงบถูกติดระนาบ FINANCIAL",
    EM.normalizeEvidence(ev).evidencePlane === "FINANCIAL");
  t("รายการเดียวแรงไม่พอที่จะยืนยันทั้งบริษัท", (function () {
    var oneOnly = { inspected: true, source: "test", quarters: [
      q("2025-06-30", 1000, 20, 1.0), q("2025-09-30", 1000, 30, 1.0), q("2025-12-31", 1000, 40, 1.0),
      q("2026-03-31", 1000, 60, 1.0), q("2026-06-30", 1000, 120, 1.0)] };
    var o = FI.compute(oneOnly);
    return o.state.n < 2 && !!o.crossCheckNote;
  })());
}

console.log("== §12 ราคาไม่มีสิทธิ์สร้าง catalyst (ผ่าน engine จริง) ==");
{
  function series(bp, vm) {
    var c = [], v = [], dts = [], start = 20, peak = start + 300 * 0.05;
    for (var i = 0; i < 300; i++) { c.push(start + i * 0.05); v.push(1e6); dts.push("a"); }
    var low = peak * 0.5;
    for (var j = 0; j < 200; j++) { c.push(peak * (1 - 0.5 * (j + 1) / 200)); v.push(1e6); dts.push("b"); }
    for (var k = 0; k < 60; k++) { c.push(low * (1 + bp * (k + 1) / 60)); v.push(k >= 40 ? 1e6 * vm : 1e6); dts.push("c"); }
    var b = []; for (var x = 0; x < c.length; x++) b.push(100);
    return { ticker: "TRT", name: "T", market: "SET", closes: c, volumes: v, dates: dts,
      benchCloses: b, benchSymbol: "^SET.BK", source: "test" };
  }
  var bad = [];
  for (var bp = 0; bp <= 100; bp += 20) {
    for (var vm = 1; vm <= 3; vm++) {
      var o = CE.analyze(series(bp / 100, vm), null,
        { inspected: true, items: [], totalDisclosures: 30, routineCount: 30, unknownCount: 0, note: "x" });
      if (o.catalyst.availability.key !== "NO_CATALYST") bad.push("avail@" + bp);
      if (o.catalyst.maturity.key !== "NONE") bad.push("mat@" + bp);
      if (o.lifecycle !== "DISCOVERY") bad.push("life@" + bp);
    }
  }
  t("กวาด 18 คอมบิเนชันราคา: ไม่มีอันไหนสร้าง catalyst", bad.length === 0, bad.slice(0, 5));
}

// ============================================================
console.log("== §2/§12 ทะเบียนแหล่ง: ที่เข้าไม่ได้ต้องเป็น DATA_UNAVAILABLE ==");
{
  var R = require("../lib/discovery/registry.js");
  var st = R.discoverySourceStatus();
  t("มีแหล่งค้นพบในทะเบียน ≥ 6", st.length >= 6, st.length);
  t("มีแหล่งที่ต่อแล้ว ≥ 2", st.filter(function (s) { return s.connected; }).length >= 2);
  t("แหล่งที่ยังไม่ต่อ = DATA_UNAVAILABLE",
    st.filter(function (s) { return !s.connected; }).every(function (s) { return s.status === "DATA_UNAVAILABLE"; }));
  t("Facebook อยู่ในทะเบียนและเป็น DATA_UNAVAILABLE",
    st.some(function (s) { return s.key === "facebook" && !s.connected && s.status === "DATA_UNAVAILABLE"; }));
  t("ทุกแหล่งมี tier", st.every(function (s) { return /^TIER_(1|2|3|3\.5|4)$/.test(s.tier); }));
  t("ทุกแหล่งมีบันทึกผลการทดสอบการเข้าถึง",
    st.filter(function (s) { return !s.connected; }).every(function (s) { return !!s.access; }));

  var A = require("../lib/evidence/adapters.js");
  var ast = A.adapterStatus();
  t("adapter หลักฐาน: งบการเงินต่อแล้ว",
    ast.some(function (a) { return a.sourceType === "FINANCIAL_STATEMENT" && a.connected; }));
  t("adapter หลักฐาน: มี ≥3 ตัวที่ต่อแล้ว", ast.filter(function (a) { return a.connected; }).length >= 3);
}

console.log("== §4 กล่องขาเข้าของผู้ใช้: ว่างและไม่มีของปลอม ==");
{
  var inbox = require("../public/discovery-inbox.js");
  t("มี items เป็น array", Array.isArray(inbox.items));
  t("ว่างโดยตั้งใจ — ไม่มีเบาะแสที่แต่งขึ้น", inbox.items.length === 0, inbox.items.length);
  var src = fs.readFileSync(path.join(__dirname, "..", "public", "discovery-inbox.js"), "utf8");
  t("เตือนห้ามใส่ตัวอย่างสมมติ", src.indexOf("ห้ามใส่ตัวอย่างสมมติ") >= 0);
  t("ระบุว่ายก C3 ไม่ได้", src.indexOf("C3_CONFIRMED") >= 0);
  var UP = require("../lib/discovery/userProvidedAdapter.js");
  t("ผู้ใช้ตั้ง verificationStatus เองไม่ได้", (function () {
    var raw = UP.__internals.toRawDiscovery({ sourceType: "THAIVI_MEMBER_USER_PROVIDED",
      title: "x", publishedAt: "2026-09-01", verificationStatus: "VERIFIED" }, 0);
    return raw.verificationStatus === "UNVERIFIED";
  })());
  t("sourceType ที่ไม่รู้จัก → OTHER", (function () {
    var raw = UP.__internals.toRawDiscovery({ sourceType: "MY_OWN_SOURCE", title: "x", publishedAt: "2026-09-01" }, 0);
    return raw.sourceType === "OTHER";
  })());
  t("ไม่มีหัวข้อและข้ออ้าง → ไม่รับ",
    UP.__internals.toRawDiscovery({ sourceType: "SOCIAL", publishedAt: "2026-09-01" }, 0) === null);
  t("URL ว่าง → null ไม่แต่ง", (function () {
    var raw = UP.__internals.toRawDiscovery({ sourceType: "SOCIAL", title: "x", publishedAt: "2026-09-01", sourceUrl: "  " }, 0);
    return raw.sourceUrl === null;
  })());
}

console.log("== §24/§31 โครงสร้างสะอาด · ไม่มีคำซื้อขาย · ไม่ hard-code หุ้น ==");
{
  var PUB = path.join(__dirname, "..", "public");
  var LIBD = path.join(__dirname, "..", "lib", "discovery");
  var LIBE = path.join(__dirname, "..", "lib", "evidence");
  var files = [
    [PUB, "discovery-plane.js"], [PUB, "financial-inflection.js"], [PUB, "discovery-inbox.js"],
    [LIBD, "kaohoonAdapter.js"], [LIBD, "thaiviAdapter.js"], [LIBD, "userProvidedAdapter.js"], [LIBD, "registry.js"],
    [LIBE, "thaiFinancialAdapter.js"],
  ];
  files.forEach(function (f) {
    var src = fs.readFileSync(path.join(f[0], f[1]), "utf8");
    t(f[1] + ": ไม่มีคำสั่งซื้อขาย",
      !/\b(strong buy|strong sell|ควรซื้อ|ควรขาย|แนะนำซื้อ|แนะนำขาย)\b/i.test(src));
    t(f[1] + ": deterministic (ไม่มี Math.random)", src.indexOf("Math.random") < 0);
  });
  // §31 ห้าม hard-code M/TRT/BTS เป็น production candidate
  var prod = [[PUB, "discovery-plane.js"], [PUB, "financial-inflection.js"],
    [LIBD, "kaohoonAdapter.js"], [LIBD, "thaiviAdapter.js"], [LIBD, "registry.js"],
    [LIBE, "thaiFinancialAdapter.js"]];
  prod.forEach(function (f) {
    var src = fs.readFileSync(path.join(f[0], f[1]), "utf8");
    // อ้างอิงในคอมเมนต์ได้ (เป็นบันทึกผลทดสอบ) แต่ต้องไม่อยู่ในโค้ดที่ทำงาน
    var code = src.split("\n").filter(function (l) {
      var tr = l.trim();
      return tr && tr.indexOf("//") !== 0 && tr.indexOf("*") !== 0;
    }).join("\n");
    t(f[1] + ": ไม่ hard-code M/TRT/BTS ในโค้ดที่ทำงาน",
      !/["'](TRT|BTS)["']/.test(code), (code.match(/["'](TRT|BTS)["']/) || [])[0]);
  });
  // ระนาบค้นพบต้องไม่รู้จักราคา
  var dpSrc = fs.readFileSync(path.join(PUB, "discovery-plane.js"), "utf8");
  t("discovery-plane ไม่แตะราคา",
    !/\bcloses\b|\bdrawdown\b|\bvolumes\b|priceFacts/.test(dpSrc));
  var fiSrc = fs.readFileSync(path.join(PUB, "financial-inflection.js"), "utf8");
  t("financial-inflection ไม่แตะราคา",
    !/\bcloses\b|\bdrawdown\b|priceFacts/.test(fiSrc));
  // ตรวจเฉพาะโค้ดที่ทำงาน — คอมเมนต์อ้างถึง TIERS.maxStrength ได้ (เป็นเอกสารว่าเพดานอยู่ที่ไหน)
  var dpCode = dpSrc.split("\n").filter(function (l) {
    var tr = l.trim();
    return tr && tr.indexOf("//") !== 0 && tr.indexOf("*") !== 0;
  }).join("\n");
  t("นิยาม tier อยู่ที่ evidence-model ที่เดียว (ไม่มีในโค้ดของ discovery-plane)",
    dpCode.indexOf("maxStrength") < 0 && !/TIERS\s*=\s*\{/.test(dpCode));
}

console.log("");
console.log(pass + fail + " checks · " + pass + " passed · " + fail + " failed");
process.exit(fail ? 1 : 0);
