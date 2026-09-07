// THAI CATALYST HUNTER — PHASE 3.2 · EVIDENCE INTEGRITY & THAI FUNDAMENTAL RISK
// node scripts/evidence-integrity-test.js
//
// ครอบ P0a (มาร์จิ้น) · P0b (value trap ไทย) · P1a (whyFell) · P1b (insider)
// หัวใจ: การดีขึ้น ≠ การฟื้นตัว · UNKNOWN ≠ ปลอดภัย · ห้ามเดาเหตุจากราคา
//        insider ไม่ใช่ catalyst
"use strict";
var fs = require("fs");
var path = require("path");
var FI = require("../public/financial-inflection.js");
var VT = require("../public/value-trap-thai.js");
var WF = require("../public/why-fell-thai.js");
var IA = require("../public/insider-activity.js");
var Q = require("../public/catalyst-qualification.js");
var EM = require("../public/evidence-model.js");

var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; return; }
  fail++; console.error("  ✗ " + name + (extra !== undefined ? " — got: " + JSON.stringify(extra) : ""));
}

// สร้างชุดไตรมาส n งวด โดย f(q, i, n) เติมค่า
function mkq(n, f) {
  var out = [];
  for (var i = 0; i < n; i++) {
    var y = 2024 + Math.floor(i / 4);
    var mo = String((i % 4) * 3 + 3).padStart(2, "0");
    var q = { date: y + "-" + mo + "-30", currency: "THB", periodType: "3M" };
    f(q, i, n);
    out.push(q);
  }
  return out;
}
// ไล่มาร์จิ้นจาก a → b เป็นเส้นตรง n งวด
function marginRamp(a, b, n) {
  n = n || 5;
  return mkq(n, function (q, i) { q.operatingMargin = (a + (b - a) * (i / (n - 1))) / 100; });
}
function margin(a, b, n) { return FI._internal.assessMargin(marginRamp(a, b, n)); }

// ============================================================
console.log("== P0a มาร์จิ้น: การดีขึ้น ≠ การฟื้นตัว ==");
{
  // เคสที่สเปคระบุ 1-7
  var c1 = margin(-80, -67);
  t("1. -80% → -67% ห้ามเป็น STRONG", c1.state.key !== "STRONG_INFLECTION", c1.state.key);
  t("1b. และห้ามเป็น CONFIRMED (ยังขาดทุนลึก)", c1.state.key !== "CONFIRMED_INFLECTION", c1.state.key);
  t("1c. ยอมรับได้ว่ากำลังดีขึ้น (EARLY)", c1.state.key === "EARLY_INFLECTION", c1.state.key);
  t("1d. บันทึกว่ายังติดลบ", c1.stillNegative === true && String(c1.levelNote).indexOf("ยังติดลบ") >= 0);
  t("1e. บันทึกว่าถูกจำกัดเพดาน", c1.levelCapped === true);

  var c2 = margin(-30, -10);
  t("2. -30% → -10% (+20pp) ห้ามเป็น STRONG", c2.state.key !== "STRONG_INFLECTION", c2.state.key);
  t("2b. ห้ามเป็น CONFIRMED", c2.state.key !== "CONFIRMED_INFLECTION", c2.state.key);
  t("2c. เป็น EARLY", c2.state.key === "EARLY_INFLECTION");

  var c3 = margin(-10, -2);
  t("3. -10% → -2% (+8pp) ห้ามเป็น STRONG", c3.state.key !== "STRONG_INFLECTION", c3.state.key);
  t("3b. เป็น EARLY", c3.state.key === "EARLY_INFLECTION");
  t("3c. ทำเครื่องหมายว่าใกล้จุดคุ้มทุน", c3.nearBreakeven === true);

  var c4 = margin(-5, 3);
  t("4. -5% → +3% เป็นหลักฐานแข็งขึ้นมีนัย", c4.state.key === "CONFIRMED_INFLECTION", c4.state.key);
  t("4b. ทำเครื่องหมายว่าข้ามศูนย์", c4.crossedZero === true);
  t("4c. ไม่ใช่ STRONG เพราะบวกยังน้อย", c4.state.key !== "STRONG_INFLECTION");
  t("4d. ไม่ติดธง stillNegative", c4.stillNegative === false);

  var c5 = margin(5, 10);
  t("5. +5% → +10% แข็งแรงขึ้นจริง", c5.state.key === "CONFIRMED_INFLECTION", c5.state.key);
  t("5b. ไม่ใช่ NO_INFLECTION", c5.state.key !== "NO_INFLECTION");

  var c6 = margin(-20, -20);
  t("6. มาร์จิ้นติดลบทรงตัว → NO_INFLECTION", c6.state.key === "NO_INFLECTION", c6.state.key);
  t("6b. ไม่มีการฟื้นปลอม", c6.state.n <= 0);

  var c7 = margin(12, 4);
  t("7. บวกแล้วถดถอย → NO_INFLECTION", c7.state.key === "NO_INFLECTION", c7.state.key);
  t("7b. อธิบายว่าเป็นการถดถอย", String(c7.levelNote).indexOf("ถดถอย") >= 0, c7.levelNote);

  // ต้องไม่เข้มจนเสีย turnaround จริง
  t("turnaround จริง -20% → +12% ยังได้ STRONG", margin(-20, 12).state.key === "STRONG_INFLECTION",
    margin(-20, 12).state.key);
  t("บวกน้อย → บวกมาก +2% → +14% ได้ STRONG", margin(2, 14).state.key === "STRONG_INFLECTION");
  t("ข้ามศูนย์ไปบวกสูง -8% → +9% ได้ STRONG", margin(-8, 9).state.key === "STRONG_INFLECTION",
    margin(-8, 9).state.key);

  // กวาดตาราง: ยังติดลบ = ห้ามเกิน EARLY ในทุกขนาดของ pp
  var bad = [];
  [-90, -70, -50, -30, -15, -8, -3].forEach(function (base) {
    [-80, -60, -40, -20, -10, -5, -1].forEach(function (end) {
      if (end <= base) return;
      var r = margin(base, end);
      if (r.state.n > 1) bad.push(base + "→" + end + "=" + r.state.key);
    });
  });
  t("กวาดทุกคู่ที่ยังติดลบ: ไม่มีคู่ใดเกิน EARLY", bad.length === 0, bad.slice(0, 5));

  // ผลกระทบต่อสถานะรวม
  var infl = FI.compute({ inspected: true, source: "test", quarters: mkq(5, function (q, i) {
    q.revenue = 1000; q.operatingIncome = 1000 * (-0.8 + i * 0.032); q.eps = 0.1; q.fcf = 10; q.totalDebt = 100;
    q.operatingMargin = -0.8 + i * 0.032;
  }) });
  t("มาร์จิ้นติดลบลึกไม่ทำให้สถานะรวมเป็น STRONG", infl.state.key !== "STRONG_INFLECTION", infl.state.key);
  t("และไม่เข้าเกณฑ์ C4", infl.qualifiesAsC4 === false);
}

// ============================================================
console.log("== P0b value trap จากงบไทย ==");
{
  function decay(n) {
    return mkq(n || 8, function (q, i) {
      q.revenue = 1000 - i * 80; q.eps = 1.0 - i * 0.25;
      q.operatingMargin = (10 - i * 3) / 100; q.fcf = 100 - i * 40;
      q.totalDebt = 500 + i * 40; q.roe = 8 - i * 2; q.roa = 5 - i * 1.5;
    });
  }
  var r1 = VT.assess(decay());
  t("รายได้+กำไรเสื่อมต่อเนื่อง → HIGH", r1.risk.key === "HIGH", r1.risk.key);
  t("ระบุสัญญาณอย่างน้อย 3 ข้อ", r1.signals.length >= 3, r1.signals.length);
  t("ระบุรายได้ลดต่อเนื่อง", r1.signals.join(" ").indexOf("รายได้ลดต่อเนื่อง") >= 0);
  t("อธิบายจำนวนไตรมาสที่ใช้", String(r1.note).indexOf("ไตรมาส") >= 0);

  var cash = mkq(8, function (q, i) {
    q.revenue = 1000; q.eps = 0.5; q.operatingMargin = 0.08;
    q.fcf = -50 - i * 10; q.totalDebt = 500 + i * 50; q.roe = 6; q.roa = 4;
  });
  var r2 = VT.assess(cash);
  t("เงินสดติดลบ + หนี้เพิ่ม → มีสัญญาณ", r2.signals.length >= 2, r2.signals.length);
  t("ระบุกระแสเงินสดติดลบ", r2.signals.join(" ").indexOf("กระแสเงินสดอิสระติดลบ") >= 0);
  t("ระบุหนี้เพิ่มต่อเนื่อง", r2.signals.join(" ").indexOf("หนี้สินรวมเพิ่มต่อเนื่อง") >= 0);

  var mgnEps = mkq(8, function (q, i) {
    q.revenue = 1000; q.eps = 0.6 - i * 0.12; q.operatingMargin = (9 - i * 2) / 100;
    q.fcf = 60; q.totalDebt = 500; q.roe = 5; q.roa = 3;
  });
  var r3 = VT.assess(mgnEps);
  t("มาร์จิ้นเสื่อม + กำไรเสื่อม → มีสัญญาณ", r3.signals.length >= 2, r3.signals.length);
  t("ระบุมาร์จิ้นแย่ลง", r3.signals.join(" ").indexOf("มาร์จิ้นแย่ลง") >= 0);

  // ไตรมาสแย่ไตรมาสเดียว — ห้ามเป็น HIGH
  var one = mkq(8, function (q, i, n) {
    var bad = i === n - 1;
    q.revenue = bad ? 700 : 1000; q.eps = bad ? -0.2 : 0.5;
    q.operatingMargin = bad ? -0.02 : 0.08; q.fcf = bad ? -20 : 80;
    q.totalDebt = 500; q.roe = bad ? -1 : 7; q.roa = 4;
  });
  t("ไตรมาสแย่ไตรมาสเดียว → ห้ามเป็น HIGH", VT.assess(one).risk.key !== "HIGH", VT.assess(one).risk.key);

  // รายได้ลดชั่วคราวแต่มาร์จิ้นดีขึ้น — ห้ามเป็น HIGH
  var temp = mkq(8, function (q, i) {
    q.revenue = 1000 - i * 30; q.eps = 0.4 + i * 0.08;
    q.operatingMargin = (3 + i * 1.5) / 100; q.fcf = 50 + i * 15;
    q.totalDebt = 500 - i * 15; q.roe = 5 + i; q.roa = 3 + i * 0.5;
  });
  var r4 = VT.assess(temp);
  t("รายได้ลดแต่มาร์จิ้นดีขึ้น → ห้ามเป็น HIGH", r4.risk.key !== "HIGH", r4.risk.key);
  t("นับสัญญาณที่ดีขึ้นไว้หักล้าง", r4.improving.length >= 2, r4.improving.length);

  // ฟื้นตัวแข็งแรง → LOW
  var strong = mkq(8, function (q, i) {
    q.revenue = 600 + i * 70; q.eps = -0.1 + i * 0.15;
    q.operatingMargin = (-5 + i * 2.5) / 100; q.fcf = -30 + i * 30;
    q.totalDebt = 600 - i * 30; q.roe = -2 + i * 1.5; q.roa = -1 + i;
  });
  t("ฟื้นตัวแข็งแรง → LOW", VT.assess(strong).risk.key === "LOW", VT.assess(strong).risk.key);

  // ข้อมูลไม่พอ → UNKNOWN และห้ามอ่านว่าปลอดภัย
  var few = VT.assess(mkq(4, function (q) { q.revenue = 1000; }));
  t("งบไม่พอ → UNKNOWN", few.risk.key === "UNKNOWN", few.risk.key);
  t("UNKNOWN ระบุชัดว่าไม่ได้แปลว่าปลอดภัย", String(few.note).indexOf("ไม่ได้แปลว่าปลอดภัย") >= 0);
  t("UNKNOWN ≠ LOW", few.risk.key !== "LOW");
  t("ไม่มีงบเลย → UNKNOWN", VT.assess([]).risk.key === "UNKNOWN");

  // การปรับปรุงงบย้อนหลัง
  var rest = mkq(8, function (q, i, n) {
    q.revenue = 1000; q.eps = 0.5; q.operatingMargin = 0.08; q.fcf = 80;
    q.totalDebt = 500; q.roe = 5; q.roa = 3; q.restated = i >= n - 3;
  });
  var r5 = VT.assess(rest);
  t("ปรับปรุงงบ ≥2 งวด → เป็นสัญญาณ", r5.signals.join(" ").indexOf("ปรับปรุงย้อนหลัง") >= 0, r5.signals);
  var rest1 = mkq(8, function (q, i, n) {
    q.revenue = 1000; q.eps = 0.5; q.operatingMargin = 0.08; q.fcf = 80;
    q.totalDebt = 500; q.roe = 5; q.roa = 3; q.restated = i === n - 1;
  });
  t("ปรับปรุงงบ 1 งวด → ยังไม่เป็นสัญญาณ", VT.assess(rest1).signals.length === 0);
  t("แต่บันทึกไว้ให้เห็น", !!VT.assess(rest1).detail.restatementNote);

  // ห้ามใช้กฎง่าย ๆ "รายได้ลด = trap"
  var revOnly = mkq(8, function (q, i) {
    q.revenue = 1000 - i * 60; q.eps = 0.5; q.operatingMargin = 0.09;
    q.fcf = 80; q.totalDebt = 480; q.roe = 7; q.roa = 5;
  });
  t("รายได้ลดอย่างเดียว → ไม่ใช่ HIGH", VT.assess(revOnly).risk.key !== "HIGH", VT.assess(revOnly).risk.key);

  // ครบ 4 ระดับ
  ["UNKNOWN", "LOW", "MEDIUM", "HIGH"].forEach(function (k) { t("มีระดับ " + k, !!VT.RISK[k]); });
  t("ไม่มีคะแนน 0-100", !Object.prototype.hasOwnProperty.call(VT.assess(decay()), "score"));
}

console.log("== P0b เกต VALUE_TRAP_RISK ยังทำงานผ่าน qualification เดิม ==");
{
  function qin(o) {
    o = o || {};
    return {
      drawdown: { available: true, state: { rank: 3, label: "DEEP" }, deepRank: 2, drawdown52wPct: -50 },
      catalyst: { availability: { key: "CATALYST_IDENTIFIED" }, available: true,
        maturity: { n: o.mat === undefined ? 4 : o.mat, key: "C4_TEST", label: "C4" },
        story: { n: 2 }, evidenceCount: 3, headline: "x" },
      financialInflection: { available: true, state: { key: "STRONG_INFLECTION", n: 3 },
        quarterCount: 18, confirmedCoreCount: 2, metrics: {} },
      recognition: { state: { n: 0, key: "EARLY", label: "EARLY" }, evidence: [] },
      valueTrap: { risk: { key: o.trap || "LOW" }, signals: o.signals || [] },
      lifecycle: "EARLY",
    };
  }
  t("trap HIGH → VALUE_TRAP_RISK (เกตเดิมไม่ถูกแก้)",
    Q.qualify(qin({ trap: "HIGH", signals: ["a", "b", "c"] })).state.key === "VALUE_TRAP_RISK");
  t("trap MEDIUM → ยังเป็นโอกาสได้",
    Q.qualify(qin({ trap: "MEDIUM", signals: ["a"] })).state.key === "STRONG_EARLY_CATALYST");
  t("trap LOW → เป็นโอกาสได้", Q.qualify(qin({ trap: "LOW" })).state.key === "STRONG_EARLY_CATALYST");
  t("trap UNKNOWN → ไม่บล็อก แต่ก็ไม่ถือว่าปลอดภัย (มิติยังอ่านได้)",
    Q.qualify(qin({ trap: "UNKNOWN" })).dimensions.F_valueTrap.key === "UNKNOWN");
  t("จำนวนสถานะยังเป็น 14 ตัวเดิม", Object.keys(Q.QUAL).length === 14, Object.keys(Q.QUAL).length);
}

// ============================================================
console.log("== P1a whyFell: ห้ามเดาเหตุจากราคา ==");
{
  function bench(pct, n) {
    // สร้างชุดปิดของดัชนีที่ลง pct% จาก high
    var out = [], hi = 100;
    for (var i = 0; i < (n || 300); i++) out.push(hi);
    out[out.length - 1] = hi * (1 + pct / 100);
    return out;
  }
  function wf(o) {
    o = o || {};
    return WF.classify({
      drawdown: { available: true, drawdown52wPct: o.stock === undefined ? -50 : o.stock },
      benchCloses: o.benchNull ? null : bench(o.index === undefined ? -10 : o.index),
      valueTrap: o.trap || null,
      financialInflection: o.fin || null,
      adverseEvents: o.events || [],
    });
  }
  // ห้าม 5 หมวดหลุด
  ["MARKET_WIDE_DECLINE", "RELATIVE_UNDERPERFORMANCE", "FUNDAMENTAL_DETERIORATION_EVIDENCE",
    "KNOWN_EVENT_EVIDENCE", "UNKNOWN"].forEach(function (k) { t("มีหมวด " + k, !!WF.CATEGORY[k]); });

  var mw = wf({ stock: -18, index: -15 });
  t("หุ้นลง 18% ดัชนีลง 15% → MARKET_WIDE_DECLINE", mw.category === "MARKET_WIDE_DECLINE", mw.category);
  t("บันทึกว่าอนุมานจากราคาเท่านั้น", mw.inferredFromPriceOnly === true);
  t("มีตัวเลขดัชนีให้ตรวจ", mw.benchDrawdownPct != null && mw.gapVsIndexPp != null);

  var up = wf({ stock: -55, index: -12 });
  t("หุ้นลง 55% ดัชนีลง 12% → RELATIVE_UNDERPERFORMANCE", up.category === "RELATIVE_UNDERPERFORMANCE", up.category);
  t("ระบุชัดว่าไม่สรุปว่าธุรกิจแย่", String(up.note).indexOf("ไม่สรุปว่าเป็นเพราะธุรกิจแย่") >= 0, up.note);
  t("ทำเครื่องหมายว่าเป็นข้อเท็จจริงเชิงราคา", up.inferredFromPriceOnly === true);
  t("ระบุว่ายังไม่พบหลักฐานอธิบาย", up.unknowns.join(" ").indexOf("ยังไม่พบเอกสาร") >= 0);

  var fund = wf({ stock: -55, index: -12,
    trap: { risk: { key: "HIGH" }, signals: ["รายได้ลดต่อเนื่อง", "ขาดทุน 4/4", "ROE ติดลบ"], quartersUsed: 18 } });
  t("มีหลักฐานงบเสื่อม → FUNDAMENTAL_DETERIORATION_EVIDENCE",
    fund.category === "FUNDAMENTAL_DETERIORATION_EVIDENCE", fund.category);
  t("อ้างสัญญาณจากงบเป็นหลักฐาน", fund.evidence.join(" ").indexOf("งบ:") >= 0);
  t("ไม่ใช่การอนุมานจากราคา", fund.inferredFromPriceOnly === false);
  t("หลักฐานงบมาก่อนการเทียบดัชนี", fund.category !== "RELATIVE_UNDERPERFORMANCE");

  var ev = wf({ stock: -55, index: -12,
    trap: { risk: { key: "HIGH" }, signals: ["a", "b", "c"], quartersUsed: 18 },
    events: [{ date: "2026-05-01", title: "SET posted SP sign on securities which maybe subject to possible delisting" }] });
  t("มีเหตุการณ์ลบระบุวันได้ → KNOWN_EVENT_EVIDENCE", ev.category === "KNOWN_EVENT_EVIDENCE", ev.category);
  t("เหตุการณ์มาก่อนหลักฐานงบ", ev.adverseEventCount === 1);
  t("ไม่ใช่การอนุมานจากราคา", ev.inferredFromPriceOnly === false);

  var unk = wf({ stock: -35, index: -20, fin: { available: true, quarterCount: 18 } });
  t("ต่างจากดัชนี 15pp (ไม่เข้าเกณฑ์ใด) → UNKNOWN", unk.category === "UNKNOWN", unk.category);
  t("UNKNOWN บอกว่าเลือกไม่เดา", String(unk.note).indexOf("แทนการเดา") >= 0);
  t("ระบุสิ่งที่ยังไม่รู้", unk.unknowns.length >= 2);
  t("ไม่มีดัชนีเทียบ → UNKNOWN", wf({ benchNull: true }).category === "UNKNOWN",
    wf({ benchNull: true }).category);

  // กวาด: ราคาลงแรงแค่ไหนก็ห้ามได้หมวดเชิงธุรกิจถ้าไม่มีหลักฐาน
  var bad = [];
  [-20, -40, -60, -80, -95].forEach(function (sd) {
    var r = wf({ stock: sd, index: -10 });
    if (r.category === "FUNDAMENTAL_DETERIORATION_EVIDENCE" || r.category === "KNOWN_EVENT_EVIDENCE") {
      bad.push(sd + "→" + r.category);
    }
  });
  t("ราคาลงแรงแค่ไหนก็ไม่สร้างหมวดเชิงธุรกิจ", bad.length === 0, bad);

  // ดึงเหตุการณ์ลบจากหลักฐานที่มี
  var adverse = WF.extractAdverse({ timeline: [
    { eventDate: "2026-05-01", title: "SET posted SP sign on CHO securities" },
    { eventDate: "2026-04-01", title: "Notification of Interim Dividend Payment" },
    { eventDate: "2026-03-01", title: "แจ้งการเข้าสู่กระบวนการฟื้นฟูกิจการ" },
  ] });
  t("ดึงเหตุการณ์ลบได้ 2 รายการ", adverse.length === 2, adverse.length);
  t("ไม่ดึงรายการปกติ (ปันผล)", !adverse.some(function (a) { return /Dividend/i.test(a.title); }));
  t("เรียงใหม่สุดก่อน", adverse[0].date === "2026-05-01");
}

// ============================================================
console.log("== P1b insider activity: หลักฐานสนับสนุน ไม่ใช่ catalyst ==");
{
  function ev(type, date) { return { eventType: type, eventDate: date, sourceUrl: "u", sourceTier: "TIER_1" }; }
  ["BUYING", "SELLING", "MIXED", "NONE", "UNKNOWN"].forEach(function (k) {
    t("มีสถานะ " + k, !!IA.STATE[k]);
  });

  var buys = [];
  for (var i = 0; i < 10; i++) buys.push(ev("INSIDER_BUY", "2026-0" + ((i % 8) + 1) + "-15"));
  var rBuy = IA.assess(buys, { inspected: true, asOf: "2026-09-01" });
  t("ซื้อเป็นส่วนใหญ่ → BUYING", rBuy.state.key === "BUYING", rBuy.state.key);
  t("นับจำนวนถูก", rBuy.buyCount === 10 && rBuy.sellCount === 0);
  t("มีวันล่าสุด", !!rBuy.latestDate);
  t("มีการอ้างอิงหลักฐาน", rBuy.references.length > 0 && rBuy.references[0].url === "u");
  t("ระบุชัดว่าเป็นหลักฐานสนับสนุนเท่านั้น", rBuy.isSupportingEvidenceOnly === true);
  t("ข้อความบอกว่าไม่ใช่ catalyst", String(rBuy.note).indexOf("ไม่ใช่ catalyst") >= 0);

  var sells = [];
  for (var j = 0; j < 8; j++) sells.push(ev("INSIDER_SELL", "2026-0" + ((j % 8) + 1) + "-15"));
  t("ขายเป็นส่วนใหญ่ → SELLING", IA.assess(sells, { inspected: true, asOf: "2026-09-01" }).state.key === "SELLING");

  var mixed = buys.slice(0, 5).concat(sells.slice(0, 5));
  t("ซื้อขายพอกัน → MIXED", IA.assess(mixed, { inspected: true, asOf: "2026-09-01" }).state.key === "MIXED");

  var none = IA.assess([], { inspected: true });
  t("ตรวจแล้วไม่พบ → NONE", none.state.key === "NONE", none.state.key);
  t("NONE อธิบายว่าตรวจแล้ว", String(none.note).indexOf("ตรวจเอกสาร ก.ล.ต. แล้วไม่พบ") >= 0);

  var unk = IA.assess([], { inspected: false });
  t("ตรวจไม่สำเร็จ → UNKNOWN", unk.state.key === "UNKNOWN", unk.state.key);
  t("UNKNOWN ≠ NONE", unk.state.key !== none.state.key);
  t("UNKNOWN บอกว่าไม่ได้แปลว่าไม่มี", String(unk.note).indexOf("ไม่ได้แปลว่าไม่มีรายการ") >= 0);
  t("UNKNOWN ไม่แต่งจำนวน", unk.buyCount === null && unk.sellCount === null);

  t("รายการที่ไม่ใช่ insider ถูกข้าม",
    IA.assess([ev("NEW_ORDER", "2026-05-01"), ev("ASSET_SALE", "2026-06-01")], { inspected: true }).state.key === "NONE");
  t("น้อยกว่า 3 รายการ → MIXED (ไม่สรุปทิศทาง)",
    IA.assess([ev("INSIDER_BUY", "2026-08-01"), ev("INSIDER_BUY", "2026-08-05")], { inspected: true, asOf: "2026-09-01" })
      .state.key === "MIXED");

  // insider ห้ามกลายเป็น catalyst
  var insiderEv = EM.normalizeEvidence({ ticker: "T", eventDate: "2026-08-01", sourceType: "INSIDER_TRANSACTION",
    sourceUrl: "u", eventType: "INSIDER_BUY", title: "ผู้บริหารซื้อหุ้น", evidenceStrength: "C3_CONFIRMED_EVENT",
    status: "VERIFIED" });
  t("INSIDER_BUY ไม่มีกลไกเศรษฐกิจ → catalystRelevance = UNKNOWN",
    insiderEv.catalystRelevance === "UNKNOWN", insiderEv.catalystRelevance);
  var story = EM.buildStory("T", [insiderEv], { inspected: true });
  t("มีแต่ insider buy → NO_CATALYST", story.availability.key === "NO_CATALYST", story.availability.key);
  t("insider buy ไม่สร้าง C3", story.catalystStage.n < 3, story.catalystStage.key);
  t("insider buy + ตลาดรับรู้ ก็ไม่สร้าง C5",
    EM.buildStory("T", [insiderEv], { inspected: true, marketRecognized: true }).catalystStage.key !== "C5_MARKET_RECOGNIZED");
  t("แต่ยังเก็บไว้ในไทม์ไลน์", story.timeline.length === 1);
  t("insider จำนวนมากก็ยังไม่เป็น catalyst", (function () {
    var many = [];
    for (var k = 0; k < 119; k++) {
      many.push(EM.normalizeEvidence({ ticker: "T", eventDate: "2026-0" + ((k % 8) + 1) + "-01",
        sourceType: "INSIDER_TRANSACTION", sourceUrl: "u", eventType: "INSIDER_BUY",
        title: "ซื้อ " + k, evidenceStrength: "C3_CONFIRMED_EVENT", status: "VERIFIED" }));
    }
    return EM.buildStory("T", many, { inspected: true }).availability.key === "NO_CATALYST";
  })());
}

// ============================================================
console.log("== โครงสร้างสะอาด · ไม่มีแหล่งใหม่ · ไม่มีกฎเฉพาะ ticker ==");
{
  var PUB = path.join(__dirname, "..", "public");
  var files = ["value-trap-thai.js", "why-fell-thai.js", "insider-activity.js", "financial-inflection.js"];
  files.forEach(function (f) {
    var src = fs.readFileSync(path.join(PUB, f), "utf8");
    var code = src.split("\n").filter(function (l) {
      var tr = l.trim();
      return tr && tr.indexOf("//") !== 0 && tr.indexOf("*") !== 0;
    }).join("\n");
    t(f + ": ไม่มีคำสั่งซื้อขาย", !/\b(strong buy|strong sell|ควรซื้อ|ควรขาย|แนะนำซื้อ|แนะนำขาย)\b/i.test(src));
    t(f + ": deterministic (ไม่มี Math.random)", src.indexOf("Math.random") < 0);
    t(f + ": ไม่ดึงแหล่งภายนอก", !/https?:\/\//.test(code));
    t(f + ": ไม่มีกฎเฉพาะ ticker",
      !/["'](CMC|BYD|CEN|CIG|BCPG|BIOTEC|ECF|CHO|COMAN|CRANE|TRT|BTS)["']/.test(code),
      (code.match(/["'](CMC|BYD|CEN|CIG|CHO|CRANE)["']/) || [])[0]);
    t(f + ": ไม่มีคะแนน 0-100", !/\bscore\b\s*[:=]/i.test(code));
    t(f + ": export ทั้ง window และ module", src.indexOf("window.") > 0 && src.indexOf("module.exports") > 0);
  });
  // value trap และ whyFell ไม่แตะราคาโดยตรง (ยกเว้น whyFell ที่ใช้ราคาเทียบดัชนีอย่างเปิดเผย)
  var vtSrc = fs.readFileSync(path.join(PUB, "value-trap-thai.js"), "utf8");
  t("value-trap-thai ไม่แตะราคา", !/\bcloses\b|\bdrawdown\b|priceFacts/.test(vtSrc));
  var iaSrc = fs.readFileSync(path.join(PUB, "insider-activity.js"), "utf8");
  t("insider-activity ไม่แตะราคา", !/\bcloses\b|\bdrawdown\b|priceFacts/.test(iaSrc));
  t("insider-activity ไม่แตะ catalyst maturity", !/MATURITY|C3_|C4_/.test(iaSrc));
}

console.log("");
console.log(pass + fail + " checks · " + pass + " passed · " + fail + " failed");
process.exit(fail ? 1 : 0);
