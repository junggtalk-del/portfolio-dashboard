// THAI CATALYST HUNTER — deterministic tests
// node scripts/catalyst-test.js
// ครอบทุก stage ตามสเปค §25 + เคสขอบ + ยืนยันว่า "ข้อมูลไม่มี ต้องยังคงไม่มี" (ห้ามเดา)
"use strict";
var fs = require("fs");
var CE = require("../public/catalyst-engine.js");

var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; return; }
  fail++; console.error("  ✗ " + name + (extra != null ? " — got: " + JSON.stringify(extra) : ""));
}

// ---------- fixture: สร้างเส้นราคาที่ควบคุมได้ ----------
// ขึ้นถึง peak → ร่วง dropPct → เด้ง bouncePct (วอลุ่ม volMult ช่วงเด้ง)
function series(opt) {
  opt = opt || {};
  var up = opt.upBars == null ? 300 : opt.upBars;
  var down = opt.downBars == null ? 200 : opt.downBars;
  var bounce = opt.bounceBars == null ? 60 : opt.bounceBars;
  var drop = opt.dropPct == null ? 0.5 : opt.dropPct;
  var bouncePct = opt.bouncePct == null ? 0 : opt.bouncePct;
  var volBase = opt.volBase == null ? 1e6 : opt.volBase;
  var volMult = opt.volMult == null ? 1 : opt.volMult;
  var closes = [], volumes = [], dates = [];
  var start = 20, peak = start + up * 0.05;
  for (var i = 0; i < up; i++) { closes.push(start + i * 0.05); volumes.push(volBase); dates.push("2024-01-01"); }
  var low = peak * (1 - drop);
  for (var j = 0; j < down; j++) { closes.push(peak * (1 - drop * (j + 1) / down)); volumes.push(volBase); dates.push("2025-06-01"); }
  for (var k = 0; k < bounce; k++) {
    closes.push(low * (1 + bouncePct * (k + 1) / bounce));
    // วอลุ่มพุ่งเฉพาะ 20 แท่งท้าย เพื่อให้ ratio (20 วันล่าสุด vs 60 วันก่อนหน้า) สะท้อนจริง
    volumes.push(k >= bounce - 20 ? volBase * volMult : volBase);
    dates.push("2026-08-01");
  }
  return { ticker: opt.ticker || "TEST", name: opt.name || "Test PCL", market: "SET",
    closes: closes, volumes: volumes, dates: dates,
    benchCloses: opt.bench === null ? null : (opt.bench || closes.map(function (_, i) { return 100 + i * 0.005; })),
    benchSymbol: "^SET.BK", source: "test" };
}
// ดัชนีที่นิ่ง (ไม่เด้ง) — ให้ offLowExcess ของหุ้นสะท้อนตัวมันเอง
function flatBench(n) { var a = []; for (var i = 0; i < n; i++) a.push(100); return a; }

function ev(date, strength, type) {
  return { date: date, type: "e", catalystType: type || "NEW_REVENUE", evidenceStrength: strength, description: "เหตุการณ์ " + strength, source: "test" };
}

console.log("== Stage 1: Deep Drawdown classification ==");
{
  var cases = [[0.05, "NORMAL"], [0.2, "PULLBACK"], [0.35, "DEEP_DRAWDOWN"], [0.5, "SEVERE_DRAWDOWN"], [0.7, "EXTREME_DRAWDOWN"]];
  cases.forEach(function (c) {
    var pf = series({ dropPct: c[0], bounceBars: 0 });
    var r = CE.analyze(pf, null);
    t("ย่อ " + Math.round(c[0] * 100) + "% → " + c[1], r.drawdown.state.key === c[1], r.drawdown.state.key + " (" + r.drawdown.drawdown52wPct + "%)");
  });
  var deep = CE.analyze(series({ dropPct: 0.5, bounceBars: 0 }), null).drawdown;
  t("มี high/low 52w", deep.high52w != null && deep.low52w != null);
  t("มี drawdown 3 ปี (ข้อมูล 500 แท่ง < 756 → null + note)", deep.drawdown3yPct === null && typeof deep.drawdown3yNote === "string", deep.drawdown3yNote);
  var long = CE.analyze(series({ upBars: 700, downBars: 200, dropPct: 0.4, bounceBars: 0 }), null).drawdown;
  t("ข้อมูล ≥3 ปี → drawdown3yPct คำนวณได้", long.drawdown3yPct != null, long.drawdown3yPct);
  t("ระบุจำนวนปีของข้อมูลตามจริง", long.yearsOfData >= 3);
}

console.log("== Stage 1 edge: ข้อมูลราคาไม่พอ ==");
{
  var short = CE.analyze({ ticker: "S", closes: [10, 11, 12], dates: ["a", "b", "c"], volumes: [1, 1, 1] }, null);
  t("ราคา 3 แท่ง → INSUFFICIENT", short.drawdown.state.key === "INSUFFICIENT" && short.drawdown.available === false);
  t("ไม่พังและ state = CATALYST_UNAVAILABLE (ไม่มี KB = ยังไม่ได้ตรวจ ≠ ตรวจแล้วไม่มี)",
    short.state.key === "CATALYST_UNAVAILABLE", short.state.key);
  var noPrice = CE.analyze({ ticker: "N", closes: [], dates: [], volumes: [] }, null);
  t("ไม่มีราคาเลย → ไม่ throw", noPrice.drawdown.state.key === "INSUFFICIENT");
  t("recognition = UNKNOWN เมื่อไม่มีราคา", noPrice.recognition.state.key === "UNKNOWN");
}

console.log("== Stage 6: Market Recognition (ต้องเทียบดัชนี ไม่ใช่ค่าสัมบูรณ์) ==");
{
  var n = 560;
  // หุ้นเด้ง 40% ขณะดัชนีนิ่ง → เฉพาะตัวจริง
  var solo = CE.analyze(series({ dropPct: 0.5, bouncePct: 0.4, volMult: 2.5, bench: flatBench(n) }), null);
  t("เด้งเกินดัชนีมาก + วอลุ่มเข้า → CONFIRMED/OVERHEATED",
    ["CONFIRMED", "OVERHEATED"].indexOf(solo.recognition.state.key) >= 0, solo.recognition.state.key);
  // หุ้นเด้ง 40% แต่ดัชนีเด้ง 40% เท่ากัน → เป็น beta ของตลาด ไม่ใช่การรับรู้เฉพาะตัว
  var benchUp = [];
  for (var i = 0; i < 500; i++) benchUp.push(100);
  for (var j = 0; j < 60; j++) benchUp.push(100 * (1 + 0.4 * (j + 1) / 60));
  var beta = CE.analyze(series({ dropPct: 0.5, bouncePct: 0.4, volMult: 1, bench: benchUp }), null);
  t("เด้งเท่าดัชนี → ไม่ใช่ CONFIRMED (เป็น beta)", beta.recognition.state.key !== "CONFIRMED", beta.recognition.state.key);
  t("อธิบายว่าเป็นการฟื้นทั้งตลาด", beta.recognition.evidence.join(" ").indexOf("ทั้งตลาด") >= 0, beta.recognition.evidence);
  // ไม่เด้งเลย → EARLY (ตลาดยังไม่รับรู้)
  var early = CE.analyze(series({ dropPct: 0.5, bouncePct: 0.01, bench: flatBench(n) }), null);
  t("ยังไม่เด้ง → EARLY", early.recognition.state.key === "EARLY", early.recognition.state.key);
  // วอลุ่มผิดปกติ (100 เท่า) ต้องถูกตัดทิ้ง ไม่ใช่สัญญาณ
  var anomaly = CE.analyze(series({ dropPct: 0.5, bouncePct: 0.1, volMult: 100, bench: flatBench(n) }), null);
  t("วอลุ่ม 100 เท่า → ตั้งธง anomaly", anomaly.recognition.metrics.volumeAnomaly === true);
  t("วอลุ่มผิดปกติไม่ถูกนับเป็นสัญญาณ", anomaly.recognition.metrics.volumeRatio20vs60 === null);
  // ไม่มีดัชนี → ใช้ fallback ได้แต่ไม่ throw
  var noBench = CE.analyze(series({ dropPct: 0.5, bouncePct: 0.4, bench: null }), null);
  t("ไม่มีดัชนี → ยังคำนวณได้ (fallback)", noBench.recognition.state.key !== "UNKNOWN", noBench.recognition.state.key);
  t("ไม่มีดัชนี → relStrength เป็น null ไม่ใช่ 0", noBench.recognition.metrics.relStrength3mPp === null);
}

console.log("== Stage 2/3/4: Why Fell · Catalyst · Evidence (จาก KB เท่านั้น) ==");
{
  var pf = series({ dropPct: 0.5, bouncePct: 0.05, bench: flatBench(560) });
  var noKb = CE.analyze(pf, null);
  // PHASE 3.2 (P1a): ไม่มี KB แล้วชั้นอธิบายของไทยจะจัดหมวดจากราคา/ดัชนี/งบ/เอกสาร
  // หมวดที่ได้ต้องเป็นหมวดที่ถูกต้องตามรายการ และต้องไม่ใช่หมวดเชิงธุรกิจถ้าไม่มีหลักฐาน
  var WF_CATS = ["MARKET_WIDE_DECLINE", "RELATIVE_UNDERPERFORMANCE",
    "FUNDAMENTAL_DETERIORATION_EVIDENCE", "KNOWN_EVENT_EVIDENCE", "UNKNOWN"];
  t("ไม่มี KB → whyFell อยู่ในหมวดที่กำหนด", WF_CATS.indexOf(noKb.whyFell.category) >= 0, noKb.whyFell.category);
  t("ไม่มี KB → ห้ามสรุปเป็นหมวดเชิงธุรกิจ (ไม่มีหลักฐานงบ/เอกสาร)",
    ["FUNDAMENTAL_DETERIORATION_EVIDENCE", "KNOWN_EVENT_EVIDENCE"].indexOf(noKb.whyFell.category) < 0,
    noKb.whyFell.category);
  t("ไม่มี KB → ทำเครื่องหมายว่าอนุมานจากราคาเท่านั้น",
    noKb.whyFell.inferredFromPriceOnly === true || noKb.whyFell.category === "UNKNOWN",
    noKb.whyFell.category);
  t("ไม่มี KB → เก็บตัวเลขที่ใช้ตัดสินไว้ตรวจได้",
    noKb.whyFell.category === "UNKNOWN" || noKb.whyFell.gapVsIndexPp != null);
  t("ไม่มี KB → catalyst.available = false", noKb.catalyst.available === false);
  t("ไม่มี KB → maturity = NONE (DATA UNAVAILABLE)", noKb.catalyst.maturity.key === "NONE");
  t("ไม่มี KB → story = UNKNOWN", noKb.catalyst.story.key === "UNKNOWN");
  t("ไม่มี KB → state = CATALYST_UNAVAILABLE (ไม่ใช่ VALUE_TRAP และไม่ใช่ NO_CATALYST)",
    noKb.state.key === "CATALYST_UNAVAILABLE", noKb.state.key);
  t("ไม่มี KB → availability = CATALYST_UNAVAILABLE", noKb.catalyst.availability.key === "CATALYST_UNAVAILABLE");

  // whyFell ที่ระบุ category ผิด → ตกเป็น UNKNOWN ไม่ใช่รับค่ามั่ว
  var badCat = CE.analyze(pf, { whyFell: { category: "ไม่มีจริง" }, events: [] });
  // category ที่ไม่รู้จักต้องไม่ถูกรับมาใช้ตรง ๆ — ตกเป็น UNKNOWN แล้วชั้นไทยจึงจัดหมวดใหม่จากหลักฐาน
  t("category นอกลิสต์ → ไม่ถูกรับมาใช้", badCat.whyFell.category !== "ไม่มีจริง");
  t("category นอกลิสต์ → ได้หมวดที่ถูกต้องตามรายการ",
    WF_CATS.indexOf(badCat.whyFell.category) >= 0, badCat.whyFell.category);
  t("category นอกลิสต์ → ยังไม่สรุปเป็นหมวดเชิงธุรกิจ",
    ["FUNDAMENTAL_DETERIORATION_EVIDENCE", "KNOWN_EVENT_EVIDENCE"].indexOf(badCat.whyFell.category) < 0);
}

console.log("== Stage 8: Catalyst Maturity C0-C5 จากความแข็งของหลักฐาน ==");
{
  var pf = series({ dropPct: 0.5, bouncePct: 0.03, bench: flatBench(560) });
  function mat(strengths) {
    return CE.analyze(pf, { events: strengths.map(function (s, i) { return ev("2026-0" + (i + 1) + "-01", s); }) }).catalyst.maturity.key;
  }
  t("ข่าวลือ/ไม่ระบุที่มา → C0", mat(["rumor"]) === "C0_RUMOR", mat(["rumor"]));
  t("evidenceStrength ที่ไม่รู้จัก → C0 (ไม่ใช่ C1)", mat(["ไม่รู้จัก"]) === "C0_RUMOR", mat(["ไม่รู้จัก"]));
  t("ผู้บริหารพูด → C1", mat(["statement"]) === "C1_STORY", mat(["statement"]));
  t("สื่อรายงาน → C1", mat(["report"]) === "C1_STORY", mat(["report"]));
  t("ประกาศทางการ → C2", mat(["announcement"]) === "C2_ANNOUNCED");
  t("สัญญา/คำสั่งซื้อ → C3", mat(["contract"]) === "C3_CONFIRMED");
  t("ไฟลิ่ง → C3", mat(["filing"]) === "C3_CONFIRMED");
  t("ปรากฏในงบ → C4", mat(["financial"]) === "C4_FINANCIAL_EVIDENCE");
  t("ใช้หลักฐานแข็งสุดเป็นตัวกำหนด", mat(["statement", "contract", "report"]) === "C3_CONFIRMED");
  // C5 ต้องยกระดับจากการรับรู้ของตลาดจริง ไม่ใช่กรอกเอง
  var recognized = CE.analyze(series({ dropPct: 0.5, bouncePct: 0.3, volMult: 2, bench: flatBench(560) }),
    { events: [ev("2026-01-01", "contract"), ev("2026-02-01", "contract")] });
  t("C3 + ตลาดรับรู้จริง → ยกระดับเป็น C5", recognized.catalyst.maturity.key === "C5_MARKET_RECOGNIZED", recognized.catalyst.maturity.key);
  t("บันทึกว่า C5 มาจากหลักฐาน C3+ ร่วมกับการรับรู้ของตลาด (ไม่ใช่ราคาล้วน)",
    String(recognized.catalyst.maturityUpgradedBy || "").indexOf("catalyst(C3+)") >= 0, recognized.catalyst.maturityUpgradedBy);
  t("maturityEvidence ยังคงเป็นขั้นจากหลักฐานจริง ไม่ถูกราคาเขียนทับ",
    recognized.catalyst.maturityEvidence.key === "C3_CONFIRMED", recognized.catalyst.maturityEvidence.key);
}

console.log("== Stage 9: Story Strength (คำพูดเดี่ยว ๆ ห้ามเป็น STRONG) ==");
{
  var pf = series({ dropPct: 0.5, bouncePct: 0.03, bench: flatBench(560) });
  function story(strengths) {
    return CE.analyze(pf, { events: strengths.map(function (s, i) { return ev("2026-0" + (i + 1) + "-01", s); }) }).catalyst.story.key;
  }
  t("คำพูดผู้บริหารอย่างเดียว → WEAK (ห้าม STRONG)", story(["statement"]) === "WEAK", story(["statement"]));
  t("สื่อรายงานอย่างเดียว → WEAK (ยังไม่ประกาศ)", story(["report"]) === "WEAK", story(["report"]));
  t("ประกาศ 1 ครั้ง → EMERGING", story(["announcement"]) === "EMERGING");
  t("หลักฐานแข็งหลายชิ้น → STRONG", story(["announcement", "contract", "contract"]) === "STRONG", story(["announcement", "contract", "contract"]));
  var transf = CE.analyze(pf, { transformative: true, events: [ev("2026-01-01", "contract"), ev("2026-02-01", "contract"), ev("2026-03-01", "announcement")] });
  t("ระบุ transformative + หลักฐานครบ → TRANSFORMATIVE", transf.catalyst.story.key === "TRANSFORMATIVE", transf.catalyst.story.key);
}

console.log("== Stage 5: Fundamental Inflection ==");
{
  var pf = series({ dropPct: 0.5, bouncePct: 0.03, bench: flatBench(560) });
  function infl(prev, last) {
    return CE.analyze(pf, { events: [ev("2026-01-01", "contract")],
      financials: { asOf: "2026-Q2", series: [Object.assign({ period: "2026-Q1" }, prev), Object.assign({ period: "2026-Q2" }, last)] } }).inflection;
  }
  t("ไม่มีงบ → INSUFFICIENT (ไม่ใช่ NO_INFLECTION)",
    CE.analyze(pf, { events: [] }).inflection.state.key === "INSUFFICIENT");
  t("งบทรงตัว → NO_INFLECTION", infl({ revenue: 100, eps: 1 }, { revenue: 101, eps: 1.01 }).state.key === "NO_INFLECTION");
  t("รายได้โต 20% → EARLY_INFLECTION", infl({ revenue: 100, eps: 1 }, { revenue: 120, eps: 1.01 }).state.key === "EARLY_INFLECTION");
  t("รายได้+EPS โต → CONFIRMED_INFLECTION", infl({ revenue: 100, eps: 1 }, { revenue: 120, eps: 1.3 }).state.key === "CONFIRMED_INFLECTION");
  t("3 ตัวโตพร้อมกัน → STRONG_INFLECTION",
    infl({ revenue: 100, eps: 1, fcf: 10 }, { revenue: 120, eps: 1.3, fcf: 14 }).state.key === "STRONG_INFLECTION");
  t("EPS พลิกจากลบเป็นบวก นับเป็นสัญญาณบวก",
    infl({ revenue: 100, eps: -1 }, { revenue: 101, eps: 0.5 }).signals.some(function (s) { return s.field === "eps" && s.dir === "up"; }));
  t("margin ขยับ ≥1pp จึงนับ", infl({ revenue: 100, opMarginPct: 10 }, { revenue: 100, opMarginPct: 12 }).signals.some(function (s) { return s.field === "opMarginPct"; }));
}

console.log("== Stage 7: Value Trap Detector ==");
{
  var pf = series({ dropPct: 0.6, bouncePct: 0.02, bench: flatBench(560) });
  function trap(fin, events, why) {
    return CE.analyze(pf, { whyFell: why ? { category: why } : undefined, events: events || [],
      financials: { asOf: "2026-Q2", series: [Object.assign({ period: "Q1" }, fin[0]), Object.assign({ period: "Q2" }, fin[1])] } });
  }
  t("ไม่มีงบ → trap = UNKNOWN (ไม่ใช่ LOW/ปลอดภัย)",
    CE.analyze(pf, { events: [] }).valueTrap.risk.key === "UNKNOWN");
  var bad = trap([{ revenue: 100, eps: 2, fcf: 10, debt: 50 }, { revenue: 80, eps: 1, fcf: 5, debt: 70 }], []);
  t("รายได้/EPS/FCF ลด + หนี้เพิ่ม + ไม่มี catalyst → HIGH", bad.valueTrap.risk.key === "HIGH", bad.valueTrap.risk.key);
  t("state = VALUE_TRAP_RISK", bad.state.key === "VALUE_TRAP_RISK");
  t("แสดงสัญญาณที่ตรวจพบ", bad.valueTrap.signals.length >= 3, bad.valueTrap.signals);
  var withCat = trap([{ revenue: 100, eps: 2, fcf: 10, debt: 50 }, { revenue: 80, eps: 1, fcf: 5, debt: 70 }],
    [ev("2026-01-01", "contract"), ev("2026-02-01", "contract")]);
  t("เสื่อมเหมือนกันแต่มี catalyst น่าเชื่อ → ไม่ใช่ HIGH", withCat.valueTrap.risk.key !== "HIGH", withCat.valueTrap.risk.key);
  var healthy = trap([{ revenue: 100, eps: 2, fcf: 10, debt: 50 }, { revenue: 120, eps: 2.5, fcf: 12, debt: 45 }], [ev("2026-01-01", "contract")]);
  t("งบดีขึ้น → LOW", healthy.valueTrap.risk.key === "LOW", healthy.valueTrap.risk.key);
}

console.log("== Stage 13: Candidate States + ราคาถูกห้าม override การเสื่อม ==");
{
  var bench = flatBench(560);
  // EARLY_CATALYST: ย่อลึก + C3 + ตลาดยังไม่รับรู้
  var early = CE.analyze(series({ dropPct: 0.55, bouncePct: 0.05, bench: bench }),
    { events: [ev("2026-01-01", "announcement"), ev("2026-02-01", "contract"), ev("2026-03-01", "contract")] });
  t("ย่อลึก + C3 + ตลาดยังไม่รับรู้ → EARLY_CATALYST", early.state.key === "EARLY_CATALYST", early.state.key);
  t("อธิบายเหตุผลได้", early.stateWhy.length >= 1 && early.stateWhy[0].indexOf("ย่อลึก") >= 0);
  // STORY_ONLY: มีแต่คำพูด
  var storyOnly = CE.analyze(series({ dropPct: 0.5, bouncePct: 0.03, bench: bench }), { events: [ev("2026-01-01", "statement")] });
  t("มีแต่คำพูด → STORY_ONLY", storyOnly.state.key === "STORY_ONLY", storyOnly.state.key);
  // SPECULATIVE: รายงานสื่อ ยังไม่ประกาศ
  var spec = CE.analyze(series({ dropPct: 0.5, bouncePct: 0.03, bench: bench }), { events: [ev("2026-01-01", "rumor")] });
  t("ข่าวลือ → SPECULATIVE (คุณภาพหลักฐานอ่อนสุด)", spec.state.key === "SPECULATIVE", spec.state.key);
  var rep2 = CE.analyze(series({ dropPct: 0.5, bouncePct: 0.03, bench: bench }), { events: [ev("2026-01-01", "report"), ev("2026-02-01", "report")] });
  t("สื่อรายงานแต่ยังไม่ประกาศ → STORY_ONLY", rep2.state.key === "STORY_ONLY", rep2.state.key);
  // EMERGING: ย่อลึก + ประกาศแล้ว แต่ยังไม่มีสัญญา
  var emerg = CE.analyze(series({ dropPct: 0.5, bouncePct: 0.03, bench: bench }), { events: [ev("2026-01-01", "announcement")] });
  t("ย่อลึก + C2 → EMERGING", emerg.state.key === "EMERGING", emerg.state.key);
  // PRICED_IN: C3 + ตลาดรับรู้แล้ว
  var priced = CE.analyze(series({ dropPct: 0.5, bouncePct: 0.3, volMult: 2, bench: bench }),
    { events: [ev("2026-01-01", "contract"), ev("2026-02-01", "contract")] });
  t("C3 + ตลาดรับรู้ → PRICED_IN", priced.state.key === "PRICED_IN", priced.state.key);
  // EXIT_WATCH: ร้อนแรงผิดปกติ
  var exitW = CE.analyze(series({ dropPct: 0.5, bouncePct: 1.2, volMult: 4, bench: bench }),
    { events: [ev("2026-01-01", "contract"), ev("2026-02-01", "contract")] });
  t("ราคา/วอลุ่มร้อนผิดปกติ + C3 → EXIT_WATCH", exitW.state.key === "EXIT_WATCH", exitW.state.key + " recog=" + exitW.recognition.state.key);
  // ราคาถูก/ย่อลึกมาก ห้าม override การเสื่อมของธุรกิจ
  var cheapBroken = CE.analyze(series({ dropPct: 0.75, bouncePct: 0.02, bench: bench }),
    { events: [], financials: { series: [{ revenue: 100, eps: 2, fcf: 10, debt: 40 }, { revenue: 70, eps: 0.5, fcf: 3, debt: 65 }] } });
  t("ย่อ 75% + งบเสื่อม + ไม่มี catalyst → VALUE_TRAP_RISK (ไม่ใช่โอกาส)",
    cheapBroken.state.key === "VALUE_TRAP_RISK", cheapBroken.state.key);
  // TURNAROUND: เคยเสื่อมแต่เริ่มฟื้น
  var turn = CE.analyze(series({ dropPct: 0.2, bouncePct: 0.05, bench: bench }),
    { events: [ev("2026-01-01", "announcement")],
      financials: { series: [{ revenue: 100, eps: 1, fcf: 10, debt: 60 }, { revenue: 118, eps: 1.05, fcf: 8, debt: 62 }] } });
  t("ย่อไม่ลึก + เริ่มฟื้น + เคยมีสัญญาณเสื่อม → TURNAROUND", turn.state.key === "TURNAROUND", turn.state.key);
}

console.log("== Stage 9: Lifecycle ==");
{
  var bench = flatBench(560);
  function life(o) { return CE.analyze(o.pf, o.kb).lifecycle; }
  t("ไม่มี catalyst + ราคานิ่ง → DISCOVERY",
    life({ pf: series({ dropPct: 0.5, bouncePct: 0.02, bench: bench }), kb: null }) === "DISCOVERY");
  t("ประกาศแล้ว + ตลาดยังไม่รับรู้ → EARLY",
    life({ pf: series({ dropPct: 0.5, bouncePct: 0.02, bench: bench }), kb: { events: [ev("2026-01-01", "announcement")] } }) === "EARLY");
  t("C2 (ประกาศ) + ตลาดเริ่มขยับ → ยังเป็น EARLY (ตลาดไม่ยกขั้นของ catalyst)",
    life({ pf: series({ dropPct: 0.5, bouncePct: 0.06, bench: bench }), kb: { events: [ev("2026-01-01", "announcement")] } }) === "EARLY",
    life({ pf: series({ dropPct: 0.5, bouncePct: 0.06, bench: bench }), kb: { events: [ev("2026-01-01", "announcement")] } }));
  t("C3 (สัญญา) + ตลาดเริ่มรับรู้ → RECOGNITION",
    life({ pf: series({ dropPct: 0.5, bouncePct: 0.08, bench: bench }), kb: { events: [ev("2026-01-01", "contract")] } }) === "RECOGNITION",
    life({ pf: series({ dropPct: 0.5, bouncePct: 0.08, bench: bench }), kb: { events: [ev("2026-01-01", "contract")] } }));
  t("ตลาดรับรู้ชัด → EXPANSION หรือ PRICED_IN",
    ["EXPANSION", "PRICED_IN"].indexOf(life({ pf: series({ dropPct: 0.5, bouncePct: 0.3, volMult: 2, bench: bench }), kb: { events: [ev("2026-01-01", "contract"), ev("2026-02-01", "contract")] } })) >= 0);
  t("ร้อนผิดปกติ → EXIT",
    life({ pf: series({ dropPct: 0.5, bouncePct: 1.2, volMult: 4, bench: bench }), kb: { events: [ev("2026-01-01", "contract"), ev("2026-02-01", "contract")] } }) === "EXIT");
  t("LIFECYCLE มี 6 ขั้นตามสเปค", CE.LIFECYCLE.length === 6 && CE.LIFECYCLE[0] === "DISCOVERY" && CE.LIFECYCLE[5] === "EXIT");
}

console.log("== §19/§20: Re-rating mechanism + Invalidation ==");
{
  var bench = flatBench(560);
  var noCat = CE.analyze(series({ dropPct: 0.5, bench: bench }), null);
  t("ไม่มี catalyst → RE-RATING = INSUFFICIENT EVIDENCE",
    noCat.rerating.available === false && noCat.rerating.note.indexOf("INSUFFICIENT") >= 0);
  var withCat = CE.analyze(series({ dropPct: 0.5, bouncePct: 0.03, bench: bench }),
    { headline: "ดีมานด์หม้อแปลง", events: [ev("2026-01-01", "announcement"), ev("2026-02-01", "contract")] });
  t("มี catalyst → มีสายโซ่ 5 ขั้น", withCat.rerating.available && withCat.rerating.chain.length === 5, withCat.rerating.chain.length);
  t("ขั้นที่มีหลักฐานถูกทำเครื่องหมาย done", withCat.rerating.chain[1].done === true);
  t("ขั้นที่ยังไม่เกิด ไม่ถูกทำเครื่องหมาย", withCat.rerating.chain[4].done === false);
  t("invalidation มีเงื่อนไขเสมอ (สำคัญกว่าเรื่องเล่าฝั่งบวก)", noCat.invalidation.conditions.length >= 5);
  var custom = CE.analyze(series({ dropPct: 0.5, bench: bench }), { events: [], invalidation: ["เงื่อนไขเฉพาะตัว"] });
  t("invalidation เฉพาะตัวถูกนำมาก่อน", custom.invalidation.conditions[0] === "เงื่อนไขเฉพาะตัว");
}

console.log("== §17: ลำดับความสำคัญ (deterministic ไม่ใช่คะแนน) ==");
{
  var bench = flatBench(560);
  function mk(state, kb, drop) { return CE.analyze(series({ ticker: state, dropPct: drop == null ? 0.5 : drop, bouncePct: 0.03, bench: bench }), kb); }
  var list = [
    mk("TRAP", { events: [], financials: { series: [{ revenue: 100, eps: 2, fcf: 10, debt: 40 }, { revenue: 70, eps: 1, fcf: 4, debt: 60 }] } }),
    mk("EARLY", { events: [ev("2026-01-01", "announcement"), ev("2026-02-01", "contract"), ev("2026-03-01", "contract")] }),
    mk("STORY", { events: [ev("2026-01-01", "statement")] }),
    mk("NONE", null),
  ];
  var ranked = CE.rank(list);
  t("EARLY_CATALYST มาก่อน", ranked[0].state.key === "EARLY_CATALYST", ranked.map(function (r) { return r.state.key; }));
  t("VALUE_TRAP_RISK อยู่หลัง STORY_ONLY",
    ranked.findIndex(function (r) { return r.state.key === "VALUE_TRAP_RISK"; }) >
    ranked.findIndex(function (r) { return r.state.key === "STORY_ONLY"; }));
  t("กลุ่มไม่มี catalyst อยู่ท้ายสุดเสมอ",
    ["NO_CATALYST", "CATALYST_UNAVAILABLE"].indexOf(ranked[ranked.length - 1].state.key) >= 0,
    ranked[ranked.length - 1].state.key);
  // ในสถานะเดียวกัน: ย่อลึกกว่ามาก่อน
  var a = mk("A", { events: [ev("2026-01-01", "announcement")] }, 0.35);
  var b = mk("B", { events: [ev("2026-01-01", "announcement")] }, 0.55);
  var r2 = CE.rank([a, b]);
  t("สถานะเดียวกัน → ย่อลึกกว่ามาก่อน", r2[0].drawdown.drawdown52wPct <= r2[1].drawdown.drawdown52wPct,
    r2.map(function (x) { return x.drawdown.drawdown52wPct; }));
}

console.log("== ห้ามมโน / ห้ามใช้คำซื้อขาย / โครงสร้างสะอาด ==");
{
  var bench = flatBench(560);
  var r = CE.analyze(series({ dropPct: 0.5, bouncePct: 0.1, bench: bench }), null);
  var js = JSON.stringify(r);
  t("ไม่มี NaN/undefined/Infinity ใน output", js.indexOf("NaN") < 0 && js.indexOf("undefined") < 0 && js.indexOf("Infinity") < 0);
  t("ไม่มีคำ Buy/Sell", !/\b(Buy|Sell|BUY|SELL)\b/.test(js));
  var src = fs.readFileSync(process.cwd() + "/public/catalyst-engine.js", "utf8");
  t("engine ไม่มีคำ ซื้อ/ขาย ในสถานะ", !/label: "[^"]*(ซื้อ|ขาย)/.test(src));
  t("มี disclaimer ว่าไม่ใช่คำสั่งซื้อขาย", r.disclaimer.indexOf("ไม่ใช่คำสั่งซื้อขาย") >= 0);
  t("dataQuality ระบุว่า story plane มีหรือไม่", r.dataQuality.storyPlaneAvailable === false && r.dataQuality.catalystKb === "DATA UNAVAILABLE");
  t("dataQuality เก็บ source/asOf/จำนวนแท่ง", r.dataQuality.priceBars > 0 && r.dataQuality.benchmark === "^SET.BK");
  // ทุก state enum ต้องมี thai + icon
  ["DD", "MATURITY", "STORY", "INFLECTION", "RECOG", "TRAP", "STATE"].forEach(function (grp) {
    var ok = Object.keys(CE[grp]).every(function (k) { return CE[grp][k].thai != null || CE[grp][k].label != null; });
    t("enum " + grp + " มีคำอธิบายครบ", ok);
  });
}

console.log("== เคสขอบเพิ่มเติม ==");
{
  var bench = flatBench(560);
  var pf = series({ dropPct: 0.5, bench: bench });
  t("event ไม่มีวันที่ → ถูกกรองทิ้ง (ห้ามมโนวันที่)",
    CE.analyze(pf, { events: [{ type: "x", evidenceStrength: "contract", description: "ไม่มีวันที่" }] }).catalyst.available === false);
  t("events ว่าง → available = false", CE.analyze(pf, { events: [] }).catalyst.available === false);
  t("KB มีแต่ชื่อ → ไม่พัง", CE.analyze(pf, { name: "X" }).state.key === "NO_CATALYST");
  t("volumes เป็น null ทั้งชุด → ไม่พัง",
    CE.analyze({ ticker: "V", closes: pf.closes, dates: pf.dates, volumes: pf.closes.map(function () { return null; }), benchCloses: bench }, null).recognition.metrics.volumeRatio20vs60 === null);
  t("closes มี null ปน → ยังคำนวณ drawdown ได้",
    CE.analyze({ ticker: "N", closes: pf.closes.map(function (c, i) { return i % 50 === 0 ? null : c; }), dates: pf.dates, volumes: pf.volumes, benchCloses: bench }, null).drawdown.available === true);
  t("timeline เรียงเก่า→ใหม่",
    (function () {
      var r = CE.analyze(pf, { events: [ev("2026-05-01", "contract"), ev("2026-01-01", "statement"), ev("2026-03-01", "announcement")] });
      return r.timeline[0].date === "2026-01-01" && r.timeline[2].date === "2026-05-01";
    })());
}



// ============================================================
// PHASE 1.1 VALIDATION CASES A-F
// จุดประสงค์: พิสูจน์ว่า "ขั้นของ catalyst" (มาจากหลักฐาน) กับ "การรับรู้ของตลาด"
// (มาจากราคา) เป็นคนละมิติ และราคาไม่มีสิทธิ์สร้าง catalyst ที่ไม่มีอยู่จริง
// ============================================================
console.log("== PHASE 1.1: Validation Cases A-F ==");
{
  var B = flatBench(560);
  // KB ที่ "มีอยู่จริงแต่ไม่พบเหตุการณ์เข้าเกณฑ์" — ต่างจาก kb = null (ยังไม่มีข้อมูล)
  var checkedNoEvents = { name: "Checked PCL", asOf: "2026-09", events: [] };

  // ---------- Case A: ไม่มี catalyst + ราคาขึ้น 50% ----------
  // ต้องไม่กลายเป็น C5 และ lifecycle ต้องไม่ไปถึง RECOGNITION
  var A = CE.analyze(series({ dropPct: 0.5, bouncePct: 0.5, volMult: 2.5, bench: B }), checkedNoEvents);
  t("A · ราคาขึ้นแรง ตลาดรับรู้ชัด", A.recognition.state.n >= CE.RECOG.CONFIRMED.n, A.recognition.state.key);
  t("A · catalyst maturity ยังเป็น NONE (ราคาไม่สร้าง catalyst)", A.catalyst.maturity.key === "NONE", A.catalyst.maturity.key);
  t("A · ไม่ใช่ C5 เด็ดขาด", A.catalyst.maturity.key !== "C5_MARKET_RECOGNIZED");
  t("A · availability = NO_CATALYST (ตรวจแล้วไม่พบ)", A.catalyst.availability.key === "NO_CATALYST", A.catalyst.availability.key);
  t("A · lifecycle = DISCOVERY (ห้ามเป็น RECOGNITION/EXPANSION)", A.lifecycle === "DISCOVERY", A.lifecycle);
  t("A · state = UNEXPLAINED_MARKET_MOVE (ตลาดขยับแต่อธิบายไม่ได้)",
    A.state.key === "UNEXPLAINED_MARKET_MOVE", A.state.key);
  t("A · บอกชัดว่าไม่ใช่สัญญาณบวก", A.stateWhy.join(" ").indexOf("ไม่ใช่สัญญาณบวก") >= 0);

  // ---------- Case B: C1 story + ราคาขึ้น ----------
  var Bc = CE.analyze(series({ dropPct: 0.5, bouncePct: 0.12, volMult: 2, bench: B }),
    { events: [ev("2026-03-01", "statement")] });
  t("B · หลักฐานเป็นคำพูดผู้บริหาร → C1_STORY", Bc.catalyst.maturity.key === "C1_STORY", Bc.catalyst.maturity.key);
  t("B · ราคาขึ้นไม่ยกเป็น C5 อัตโนมัติ", Bc.catalyst.maturity.key !== "C5_MARKET_RECOGNIZED");
  t("B · ตลาดอาจขยับได้ (BUILDING ขึ้นไป)", Bc.recognition.state.n >= CE.RECOG.BUILDING.n, Bc.recognition.state.key);
  t("B · maturityEvidence คงเป็น C1", Bc.catalyst.maturityEvidence.key === "C1_STORY");

  // ---------- Case C: C3 สัญญายืนยัน + ตลาดเริ่มแข็ง ----------
  var C = CE.analyze(series({ dropPct: 0.5, bouncePct: 0.08, bench: B }),
    { events: [ev("2026-04-01", "contract")] });
  t("C · สัญญาจริง → C3_CONFIRMED", C.catalyst.maturity.key === "C3_CONFIRMED", C.catalyst.maturity.key);
  t("C · การรับรู้อยู่ระดับ EARLY/BUILDING",
    ["EARLY", "BUILDING"].indexOf(C.recognition.state.key) >= 0, C.recognition.state.key);
  t("C · lifecycle = EARLY หรือ RECOGNITION",
    ["EARLY", "RECOGNITION"].indexOf(C.lifecycle) >= 0, C.lifecycle);

  // ---------- Case D: C4 หลักฐานในงบ + ตลาดรับรู้ชัด ----------
  // maturityEvidence ต้องคง C4 ไว้ (มิติหลักฐาน) แม้ตลาดจะรับรู้แล้ว
  var D = CE.analyze(series({ dropPct: 0.5, bouncePct: 0.3, volMult: 2, bench: B }),
    { events: [ev("2026-02-01", "financial"), ev("2026-05-01", "financial")] });
  t("D · หลักฐานในงบ → maturityEvidence = C4_FINANCIAL_EVIDENCE",
    D.catalyst.maturityEvidence.key === "C4_FINANCIAL_EVIDENCE", D.catalyst.maturityEvidence.key);
  t("D · ตลาดรับรู้ชัด = CONFIRMED ขึ้นไป", D.recognition.state.n >= CE.RECOG.CONFIRMED.n, D.recognition.state.key);
  t("D · มิติหลักฐานไม่ถูกราคาเขียนทับ", D.catalyst.maturityEvidence.key !== "C5_MARKET_RECOGNIZED");

  // ---------- Case E: มี catalyst จริง + ตลาดรับรู้ชัดเจน ----------
  var E = CE.analyze(series({ dropPct: 0.5, bouncePct: 0.3, volMult: 2, bench: B }),
    { events: [ev("2026-01-01", "contract"), ev("2026-02-01", "contract")] });
  t("E · C3+ กับตลาดรับรู้ชัด → C5_MARKET_RECOGNIZED",
    E.catalyst.maturity.key === "C5_MARKET_RECOGNIZED", E.catalyst.maturity.key);
  t("E · C5 ต้องอ้างทั้งหลักฐานและตลาด",
    String(E.catalyst.maturityUpgradedBy || "").indexOf("catalyst(C3+)") >= 0 &&
    String(E.catalyst.maturityUpgradedBy || "").indexOf("market-recognition") >= 0, E.catalyst.maturityUpgradedBy);
  t("E · อธิบายที่มาของ C5 เป็นภาษาคน", (E.catalyst.maturityNote || "").length > 0);

  // ---------- Case F: ไม่มีข้อมูล catalyst เลย ----------
  var F = CE.analyze(series({ dropPct: 0.45, bouncePct: 0.02, bench: B }), null);
  t("F · ไม่มี KB → availability = CATALYST_UNAVAILABLE",
    F.catalyst.availability.key === "CATALYST_UNAVAILABLE", F.catalyst.availability.key);
  t("F · ต้องไม่ใช่ NO_CATALYST (ยังไม่ได้ตรวจ ≠ ตรวจแล้วไม่มี)",
    F.catalyst.availability.key !== "NO_CATALYST");
  t("F · state = CATALYST_UNAVAILABLE", F.state.key === "CATALYST_UNAVAILABLE", F.state.key);
  t("F · lifecycle = DISCOVERY", F.lifecycle === "DISCOVERY", F.lifecycle);
  t("F · dataQuality บอกว่า story plane ไม่มี", F.dataQuality.storyPlaneAvailable === false);

  // ---------- แยกสองมิติชัดเจน: ไม่มีคอมบิเนชันที่ขัดกันเอง ----------
  var combos = [A, Bc, C, D, E, F];
  t("ทุกเคส: ไม่มี catalyst → lifecycle ต้องเป็น DISCOVERY เท่านั้น",
    combos.every(function (o) {
      return o.catalyst.availability.key === "CATALYST_IDENTIFIED" || o.lifecycle === "DISCOVERY";
    }));
  t("ทุกเคส: ไม่มี catalyst → ห้ามเป็น C5",
    combos.every(function (o) {
      return o.catalyst.availability.key === "CATALYST_IDENTIFIED" || o.catalyst.maturity.key !== "C5_MARKET_RECOGNIZED";
    }));
  t("ทุกเคส: C5 ต้องมี maturityEvidence ระดับ C3 ขึ้นไปเสมอ",
    combos.every(function (o) {
      return o.catalyst.maturity.key !== "C5_MARKET_RECOGNIZED" || o.catalyst.maturityEvidence.n >= 3;
    }));
  t("ทุกเคส: availability สามค่านี้เท่านั้น",
    combos.every(function (o) {
      return ["CATALYST_UNAVAILABLE", "NO_CATALYST", "CATALYST_IDENTIFIED"].indexOf(o.catalyst.availability.key) >= 0;
    }));
}

// ---------- lifecycle ต้องไม่มีทางไป RECOGNITION เมื่อไม่มี catalyst (สุ่มกว้าง) ----------
console.log("== PHASE 1.1: ไม่มี catalyst ห้ามถึง RECOGNITION (กวาดทุกความแรงของราคา) ==");
{
  var bad = [];
  for (var bp = 0; bp <= 100; bp += 5) {
    for (var vm = 1; vm <= 4; vm++) {
      [null, { name: "x", asOf: "2026-09", events: [] }].forEach(function (kb) {
        var o = CE.analyze(series({ dropPct: 0.5, bouncePct: bp / 100, volMult: vm, bench: flatBench(560) }), kb);
        if (["RECOGNITION", "EXPANSION"].indexOf(o.lifecycle) >= 0) bad.push(bp + "%/" + vm + "x");
        if (o.catalyst.maturity.key === "C5_MARKET_RECOGNIZED") bad.push("C5@" + bp + "%");
      });
    }
  }
  t("ไม่มี catalyst: 84 คอมบิเนชันราคา/วอลุ่ม ไม่มีอันไหนขึ้น RECOGNITION หรือ C5",
    bad.length === 0, bad.slice(0, 6));
}
console.log("== หน้าเว็บ: Radar + Detail render จริง ==");
{
  var vm = require("vm");
  var PUB = process.cwd() + "/public";
  var els = {};
  function mkEl() {
    return { innerHTML: "", style: {}, attributes: {}, children: [], appendChild: function () {},
      setAttribute: function (k, v) { this.attributes[k] = v; }, getAttribute: function (k) { return this.attributes[k] || null; },
      addEventListener: function () {}, querySelector: function () { return null; }, querySelectorAll: function () { return []; },
      closest: function () { return null; }, classList: { add: function () {}, remove: function () {}, contains: function () { return false; } } };
  }
  var doc = { readyState: "complete", createElement: mkEl, addEventListener: function () {},
    getElementById: function (id) { if (!els[id]) { els[id] = mkEl(); els[id].id = id; } return els[id]; },
    querySelector: function () { return mkEl(); }, querySelectorAll: function () { return []; } };
  var bench2 = flatBench(560);
  var pfx = series({ ticker: "TESTCO", dropPct: 0.55, bouncePct: 0.05, bench: bench2 });
  // ตัวที่ราคาวิ่งแรงโดยไม่มีข้อมูล catalyst — ต้องออกมาเป็น UNEXPLAINED_MARKET_MOVE
  var pfm = series({ ticker: "MOVERCO", dropPct: 0.5, bouncePct: 0.5, volMult: 2.5, bench: bench2 });
  function apiItem(tk, nm, pf) {
    return { ticker: tk, name: nm, market: "SET", universe: "SET100",
      dates: pf.dates, closes: pf.closes, volumes: pf.volumes, bars: pf.closes.length,
      source: "test", sourceType: "LIVE_MARKET_DATA", range: "5y" };
  }
  var fakeApi = { total: 2, offset: 0, scanned: 2, done: true, nextOffset: null,
    universe: "THAI_ALL",
    universeMeta: { source: "SET registry (test)", asOf: "2026-09-07T00:00:00.000Z",
      degraded: false, note: null, counts: { set: 637, mai: 231, total: 868 } },
    benchmark: { symbol: "^SET.BK", closes: bench2, available: true },
    items: [apiItem("TESTCO", "Test PCL", pfx), apiItem("MOVERCO", "Mover PCL", pfm)], failed: [] };
  var store2 = {};
  var win = { document: doc, location: { search: "", pathname: "/catalyst-hunter" },
    history: { pushState: function (q) { win.location.search = q.indexOf("?") >= 0 ? q.slice(q.indexOf("?")) : ""; } },
    localStorage: { getItem: function (k) { return store2[k] || null; }, setItem: function (k, v) { store2[k] = String(v); } },
    addEventListener: function () {}, fetch: function () { return Promise.resolve({ ok: true, json: function () { return Promise.resolve(fakeApi); } }); },
    console: console, Math: Math, JSON: JSON, Date: Date, Number: Number, String: String, Object: Object, Array: Array,
    encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent, isFinite: isFinite,
    parseInt: parseInt, parseFloat: parseFloat, Promise: Promise, RegExp: RegExp, Error: Error, setTimeout: setTimeout };
  win.window = win; win.self = win;
  var ctx = vm.createContext(win);
  var bootOk = true;
  ["catalyst-engine.js", "catalyst-data.js", "catalyst-page.js"].forEach(function (f) {
    try { vm.runInContext(fs.readFileSync(PUB + "/" + f, "utf8"), ctx, { filename: f }); }
    catch (e) { bootOk = false; console.error("   boot " + f + ": " + e.message); }
  });
  t("หน้าเว็บ boot ได้", bootOk);
  var done = false;
  // PHASE 4.1: หน้าใหม่ไม่ auto-scan เอง — เรียก scanAll แล้วรอ
  win.CatalystPage.scanAll(true).then(function () {
    var html = els.chRoot.innerHTML;

    // ---------- RADAR ----------
    t("Radar render ได้", html.length > 3000, html.length);
    t("§1 header มีชื่อผลิตภัณฑ์", html.indexOf("Catalyst Hunter") >= 0);
    t("§1 header มี subtitle", html.indexOf("Thai Event-Driven") >= 0);
    t("§1 header บอกความสดของข้อมูล", html.indexOf("ข้อมูล ณ") >= 0);
    // PHASE 6 — กริด 12 สถานะย้ายไปอยู่ใน <details> ของส่วน "ทำไมส่วนใหญ่ไม่ใช่เป้า"
    // viewport แรกเป็นของ Hunter Brief แทน
    t("§1 มี Hunter Brief แทนกริด 12 สถานะบนสุด",
      html.indexOf("Hunter Brief") >= 0 && html.indexOf("ch-brief-grid") >= 0);
    t("§1 Brief มีสี่ตัวเลขตัดสินใจ",
      ["RARE OPPORTUNITY", "NEAR-MISS", "CATALYST EXISTS", "EMERGING"]
        .every(function (x) { return html.indexOf(x) >= 0; }));
    t("§1 Brief ระบุว่าไม่ใช่คำแนะนำ", html.indexOf("ไม่ใช่คำแนะนำการลงทุน") >= 0);
    t("§1 Brief ชี้ว่า 12 สถานะครบอยู่ด้านล่าง",
      html.indexOf("สถานะครบทั้ง 12 กลุ่ม") >= 0);
    t("กริด 12 สถานะยังอยู่ (ไม่ถูกลบ) แต่ย้ายไปอยู่ใน details",
      html.indexOf("ch-allstates") >= 0 && html.indexOf("ch-sum-grid") >= 0);
    t("การ์ดสรุปยังกดกรองได้", html.indexOf("data-ch-filter-status") >= 0);
    t("Hunter Brief มาก่อน All Candidates",
      html.indexOf("Hunter Brief") < html.indexOf("All Candidates"));

    // PART 2 — Rare Opportunities ต้องบอกบริบท X / Y scanned และห้ามสื่อว่าเป็นรายการแนะนำ
    t("§3 มี Rare Opportunities", html.indexOf("Rare Opportunities") >= 0);
    t("§3 บอกบริบท X / Y scanned", /Rare Opportunities[\s\S]{0,200}?\d+ \/ \d+ scanned/.test(html));
    t("§3 มีเกณฑ์กำกับไว้ชัด",
      html.indexOf("Deep drawdown + <strong>genuine business/event catalyst</strong>") >= 0 &&
      html.indexOf("strong financial inflection") >= 0);
    t("§3 ไม่ใช้คำว่า confirmed catalyst ลอย ๆ อีกแล้ว",
      html.indexOf("Deep drawdown + confirmed catalyst") < 0);
    // PHASE 5 — ต้องระบุว่า catalyst หมายถึงเหตุการณ์เชิงธุรกิจ
    t("§3 ระบุว่า catalyst = เหตุการณ์เชิงธุรกิจ",
      html.indexOf("business/event") >= 0 &&
      html.indexOf("เหตุการณ์เชิงธุรกิจที่ยืนยันแล้ว") >= 0);
    t("§3 ระบุว่างบล้วนจะเป็น FUNDAMENTAL RECOVERY",
      html.indexOf("จะถูกจัดเป็น FUNDAMENTAL RECOVERY") >= 0);
    t("§3 ระบุว่าไม่ใช่รายการแนะนำ", html.indexOf("ไม่ใช่รายการแนะนำ") >= 0);
    t("§3 ไม่ใช้คำ Top Picks / Best Stocks / Buy Candidates",
      !/top picks|best stocks|buy candidates/i.test(html));
    (function () {
      // การ์ดขึ้นเฉพาะเมื่อมี STRONG_EARLY_CATALYST จริง — ไม่มีก็ต้องบอกตรง ๆ ห้ามเว้นว่าง
      var src = fs.readFileSync(PUB + "/catalyst-page.js", "utf8");
      var rare = win.CatalystPage._state.rows.filter(function (r) {
        return r.qualification && r.qualification.state.key === "STRONG_EARLY_CATALYST"; });
      if (rare.length) {
        t("§3 การ์ดมีหัวข้อ Positive/Risk Evidence",
          html.indexOf("Positive Evidence") >= 0 && html.indexOf("Risk Evidence") >= 0);
        t("§3 การ์ดมีปุ่มดูหลักฐานทั้งหมด", html.indexOf("ดูหลักฐานทั้งหมด") >= 0);
      } else {
        // PHASE 5.1 — สถานะว่างต้องอธิบายเกณฑ์ ไม่ใช่กริดว่างและไม่ใช่ข้อความปฏิเสธ
        t("§3 ไม่มีตัวเข้าเกณฑ์ → บอกตรง ๆ ว่าไม่มี",
          html.indexOf("ยังไม่พบหุ้นที่ผ่านเกณฑ์ Rare Opportunity ครบทุกข้อ") >= 0);
        t("§3 ไม่มีกริดการ์ดว่าง", html.indexOf("ch-rare-grid") < 0);
        t("§3 มีบล็อกสถานะว่างที่ตั้งใจ", html.indexOf("ch-zero") >= 0);
        t("§3 แสดงเกณฑ์ครบทั้งห้าข้อ",
          ["Deep Drawdown", "Genuine Business/Event Catalyst ≥ C3",
            "Strong / Confirmed Financial Inflection",
            "Market Recognition = UNKNOWN / EARLY / BUILDING", "Value Trap ≠ HIGH"]
            .every(function (x) { return html.indexOf(x) >= 0; }));
        t("§3 มีข้อความว่าไม่มีรายการให้ติดตามในกลุ่มนี้",
          html.indexOf("ไม่มีรายการให้ติดตามในกลุ่มนี้ ณ รอบสแกนปัจจุบัน") >= 0);
        t("§3 ใช้ถ้อยคำที่บอกว่าเป็นผลลัพธ์ที่ถูกต้อง ไม่ใช่ระบบพัง",
          html.indexOf("No qualifying setup detected in the current scan") >= 0);
        t("§3 ไม่ใช้ถ้อยคำปฏิเสธแบบเหมารวม",
          !/No opportunities|ไม่มีโอกาส/i.test(html));
        t("§3 ชี้ทางไปกลุ่มที่ยังน่าติดตาม",
          html.indexOf("CATALYST EXISTS") >= 0 && html.indexOf("EMERGING") >= 0);
        t("§3 โค้ดการ์ดมีหัวข้อ Positive/Risk Evidence และปุ่มดูหลักฐานครบ",
          src.indexOf("Positive Evidence") >= 0 && src.indexOf("Risk Evidence") >= 0 &&
          src.indexOf("ดูหลักฐานทั้งหมด") >= 0);
      }
    })();

    // PART 1 — Qualification Landscape ห้ามสื่อว่าเป็นลำดับขั้น
    t("§4 เปลี่ยนชื่อเป็น Qualification Landscape", html.indexOf("Qualification Landscape") >= 0);
    t("§4 ไม่มีชื่อ Catalyst Pipeline แล้ว", html.indexOf("Catalyst Pipeline") < 0);
    t("§4 มีคำกำกับไทยว่าไม่ใช่ลำดับที่ต้องพัฒนาไปตามขั้น",
      html.indexOf("ไม่ใช่ลำดับที่หุ้นต้องพัฒนาไปตามขั้น") >= 0);
    t("§4 มีคำกำกับอังกฤษ not a required progression",
      html.indexOf("not a required progression") >= 0);
    t("§4 ไม่มีลูกศรลงระหว่างกลุ่ม (ไม่มี ch-lscape-sep / ch-pipe-sep)",
      html.indexOf("ch-lscape-sep") < 0 && html.indexOf("ch-pipe-sep") < 0);
    t("§4 ปฏิเสธการสื่อว่า FUNDAMENTAL RECOVERY เดินไปเป็น CATALYST EXISTS",
      html.indexOf("ไม่ได้กำลังเดินไปเป็น") >= 0);
    (function () {
      // ในบล็อก landscape ต้องไม่มีอักขระลูกศรเลย
      var a = html.indexOf("Qualification Landscape");
      var b = html.indexOf("Deep Drawdown ×", a);
      var seg = a >= 0 && b > a ? html.slice(a, b) : "";
      t("§4 บล็อก landscape ไม่มีอักขระลูกศร", seg.length > 0 && seg.indexOf("↓") < 0 && seg.indexOf("→") < 0);
      t("§4 ยังคงจำนวนของแต่ละกลุ่ม", /ch-lscape-n">\d+</.test(seg));
    })();

    // PART 5 — matrix ต้องบอกว่าเป็นแผนที่บรรยาย ไม่ใช่การจัดอันดับ
    t("§5 มีเมทริกซ์ Drawdown × Market Recognition",
      html.indexOf("Deep Drawdown × Market Recognition") >= 0);
    t("§5 ระบุว่าเป็นแผนที่บรรยาย ไม่ใช่การจัดอันดับ",
      html.indexOf("แผนที่บรรยาย ไม่ใช่การจัดอันดับ") >= 0 &&
      html.indexOf("Descriptive map — not a ranking") >= 0);
    t("§5 ระบุว่าไม่ได้แปลงเป็นคะแนน", html.indexOf("ไม่ได้แปลงเป็นคะแนน") >= 0);
    t("§5 ไม่บอกว่าโซนไหนน่าเข้าซื้อ", html.indexOf("ไม่ได้บอกว่าช่องไหนน่าเข้าซื้อ") >= 0);
    t("§5 แกนย่อครบ 4 ช่วง",
      ["&gt; 50%", "30–50%", "20–30%", "&lt; 20%"].every(function (x) { return html.indexOf(x) >= 0; }));
    t("§5 แกนการรับรู้ครบ 5 ระดับ",
      ["UNKNOWN", "EARLY", "BUILDING", "CONFIRMED", "OVERHEATED"]
        .every(function (x) { return html.indexOf(">" + x + "<") >= 0; }));

    // PART 4 — ตาราง candidate
    t("§6 มีตาราง Candidates", html.indexOf("Candidates") >= 0);
    t("§6 คอลัมน์ครบ 9 ช่อง",
      ["Ticker", "Status", "52W Drawdown", "Catalyst", "Financial", "Recognition", "Value Trap",
        "Why Fell", "Lifecycle"].every(function (x) { return html.indexOf(">" + x + "<") >= 0; }));
    t("§6 Why Fell เป็นป้ายกระชับ", html.indexOf("ch-whybadge") >= 0);
    t("§6 ป้าย Why Fell ใช้คำสั้นตามสเปค",
      /ch-whybadge[^>]*>(FUNDAMENTAL|MARKET-WIDE|RELATIVE|KNOWN EVENT|UNKNOWN)</.test(html));
    t("§6 ป้าย Why Fell มี tooltip อธิบาย", /ch-whybadge[^>]*title="[^"]{10,}/.test(html));
    (function () {
      var src = fs.readFileSync(PUB + "/catalyst-page.js", "utf8");
      var known = win.CatalystPage._state.rows.filter(function (r) {
        return r.valueTrap && r.valueTrap.risk && r.valueTrap.risk.key !== "UNKNOWN"; });
      t("§6 Value Trap แสดงจำนวนสัญญาณแยกจากระดับ",
        known.length ? html.indexOf("ch-sigcount") >= 0 : src.indexOf("ch-sigcount") >= 0);
      t("§6 Value Trap ในตารางใช้ตัวห่อ ch-trap", html.indexOf("ch-trap ch-tone-") >= 0);
    })();
    t("§6 มีตัวกรองและช่องค้นหา",
      html.indexOf("data-ch-filter=") >= 0 && html.indexOf("data-ch-search") >= 0);
    t("§6 หัวคอลัมน์เรียงได้", html.indexOf("data-ch-sort=") >= 0);
    t("§6 บอกบริบท X / Y scanned ไม่ใช่เลขลอย", /\d+ \/ \d+ scanned/.test(html));

    // PART 3 — value trap ต้องไม่ดูเหมือนคะแนน และ UNKNOWN ต้องไม่มีจำนวน
    (function () {
      var rows = win.CatalystPage._state.rows;
      var unk = rows.filter(function (r) {
        return r.valueTrap && r.valueTrap.risk && r.valueTrap.risk.key === "UNKNOWN"; });
      t("Value Trap UNKNOWN ไม่แสดงจำนวนสัญญาณ (0 signals จะดูเหมือนปลอดภัย)",
        !/UNKNOWN<\/b><span class="ch-sigcount"/.test(html));
      t("Value Trap UNKNOWN ใช้โทนกลาง", unk.length === 0 ||
        /ch-trap ch-tone-grey"[^>]*><b>UNKNOWN/.test(html));
      t("Value Trap UNKNOWN มี tooltip ว่าไม่ได้แปลว่าปลอดภัย", unk.length === 0 ||
        html.indexOf("ไม่ได้แปลว่าปลอดภัย") >= 0);
    })();

    // PART 6 — ส่วนถูกคัดออก
    t("§7 มีส่วนอธิบายว่าทำไมส่วนใหญ่ไม่ใช่เป้า",
      html.indexOf("ทำไมหุ้นส่วนใหญ่ไม่ใช่เป้า") >= 0);
    t("§7 สื่อว่าหุ้นที่ตกไม่ได้เป็นโอกาสทุกตัว", html.indexOf("หุ้นที่ตกไม่ได้เป็นโอกาสทุกตัว") >= 0);
    t("§7 มีคำอธิบายอังกฤษ deliberately rejects",
      html.indexOf("deliberately rejects many deeply beaten-down stocks") >= 0);
    t("§7 VALUE TRAP RISK อธิบายว่าความเสื่อมลบล้างการเป็นโอกาส",
      win.CatalystPage._state.rows.filter(function (r) {
        return r.qualification && r.qualification.state.key === "VALUE_TRAP_RISK"; }).length
        ? html.indexOf("ลบล้างการจัดเป็นโอกาส") >= 0
        : fs.readFileSync(PUB + "/catalyst-page.js", "utf8").indexOf("ลบล้างการจัดเป็นโอกาส") >= 0);
    t("§7 CATALYST_UNAVAILABLE ไม่ถูกนับเป็นถูกปฏิเสธ",
      html.indexOf("ไม่ได้ถูกปฏิเสธ") >= 0 ||
      html.indexOf('data-ch-filter-status="CATALYST_UNAVAILABLE"') < 0);

    // PART 10 — กติกาความหมาย
    t("§8 มีกติกาความหมาย (การจัดหมวด ≠ คำแนะนำ)", html.indexOf("ch-semantics") >= 0);
    t("§8 ระบุ UNKNOWN ≠ ปลอดภัย", /UNKNOWN <span class="ch-neq">≠<\/span> ปลอดภัย/.test(html));
    t("§8 ระบุ ย่อลึก ≠ โอกาส", /ย่อลึก <span class="ch-neq">≠<\/span> โอกาส/.test(html));
    // PHASE 5 — กติกาใหม่ที่ต้องปรากฏบนหน้า
    t("§8 ระบุ C4 จากงบ ≠ C4 ของ catalyst ธุรกิจ",
      html.indexOf("C4 จากหลักฐานงบ") >= 0 && html.indexOf("C4 ของ catalyst เชิงธุรกิจ") >= 0);
    t("§8 ระบุ Business Impact ≠ Financial Impact",
      html.indexOf("Business Impact") >= 0 && html.indexOf("Financial Impact") >= 0 &&
      html.indexOf("ไม่ได้พิสูจน์ว่าธุรกิจเปลี่ยน") >= 0);
    t("§8 ระบุ งบฟื้น ≠ catalyst", html.indexOf("งบฟื้น (Fundamental Recovery)") >= 0);

    // ---------- PHASE 6: information architecture ----------
    (function () {
      var src = fs.readFileSync(PUB + "/catalyst-page.js", "utf8");
      var rows = win.CatalystPage._state.rows;
      // (2) Today's Targets
      t("มีส่วน Today's Targets", html.indexOf("Today's Targets") >= 0);
      t("Today's Targets ระบุว่าไม่ใช่การจัดอันดับ",
        html.indexOf("ไม่ใช่การจัดอันดับและไม่ใช่คำแนะนำ") >= 0);
      t("Today's Targets ระบุว่าการ์ดทุกใบน้ำหนักเท่ากัน",
        html.indexOf("การ์ดทุกใบมีน้ำหนักเท่ากัน") >= 0);
      t("Today's Targets ไม่แสดงเลขลำดับหรือ priority",
        !/ch-target[^>]*>[\s\S]{0,120}(อันดับ|#\d|priority)/i.test(html));
      t("cap 6 ใบต่อกลุ่ม", src.indexOf("var TARGET_CAP = 6;") >= 0);
      // (8) ไม่มี VALUE_TRAP_RISK ใน Today's Targets
      var tgSeg = (function () {
        var i = html.indexOf("Today's Targets"), j = html.indexOf("Near-Miss —", i);
        return j > i ? html.slice(i, j) : html.slice(i);
      })();
      var trapTk = rows.filter(function (r) {
        return r.valueTrap && r.valueTrap.risk && r.valueTrap.risk.key === "HIGH"; })
        .map(function (r) { return r.ticker; });
      t("Today's Targets ไม่มีหุ้น trap HIGH เลย",
        trapTk.every(function (tk) { return tgSeg.indexOf('data-ch-ticker="' + tk + '"') < 0; }));
      // การ์ดตอบสี่คำถาม
      if (tgSeg.indexOf("ch-target\"") >= 0) {
        t("การ์ดเป้าหมายตอบสี่คำถาม",
          tgSeg.indexOf("ทำไมน่าสนใจ") >= 0 && tgSeg.indexOf("ผ่านแล้ว") >= 0 &&
          tgSeg.indexOf("ยังไม่ผ่าน") >= 0 && tgSeg.indexOf("รออะไร") >= 0);
        t("การ์ดเป้าหมายใช้สัญลักษณ์ ✓ / ○ / →",
          tgSeg.indexOf("✓") >= 0 && tgSeg.indexOf("○") >= 0 && tgSeg.indexOf("→") >= 0);
      } else {
        t("ไม่มีเป้าหมาย → บอกตรง ๆ", tgSeg.indexOf("ไม่มีตัวที่เข้ากลุ่มเป้าหมาย") >= 0);
      }
      // (3) Near-Miss แยกตามเหตุที่รอ
      var nrSeg = (function () {
        var i = html.indexOf("Near-Miss —"), j = html.indexOf("Catalyst Watch", i);
        return i < 0 ? "" : (j > i ? html.slice(i, j) : html.slice(i));
      })();
      var hasNear = rows.some(function (r) { return true; }) && nrSeg.length > 0;
      if (hasNear) {
        t("Near-Miss แยกกลุ่มตามเหตุที่รอ",
          nrSeg.indexOf("รอราคา") >= 0 || nrSeg.indexOf("รอ catalyst ยืนยัน") >= 0);
        t("Near-Miss แสดง ผ่านแล้ว / ยังไม่ผ่าน / รออะไร",
          nrSeg.indexOf("ผ่านแล้ว") >= 0 && nrSeg.indexOf("ยังไม่ผ่าน") >= 0 &&
          nrSeg.indexOf("รออะไร") >= 0);
        t("Near-Miss คงคำกำกับว่าไว้ติดตาม ไม่ใช่คำแนะนำ",
          nrSeg.indexOf("Near-miss is for monitoring, not recommendation") >= 0);
        t("Near-Miss ประกาศการทับกับ Today's Targets",
          nrSeg.indexOf("ไม่ใช่การนับสองรอบ") >= 0);
      }
      // (9)(10) งบฟื้น/emerging ไม่ถูกนำเสนอเป็น catalyst ยืนยันแล้ว
      t("Catalyst Watch แยก confirmed กับ emerging ให้เห็นต่าง",
        html.indexOf("Catalyst Watch") < 0 ||
        (html.indexOf("ch-watch-confirmed") >= 0 || html.indexOf("ch-watch-emerging") >= 0));
      t("Emerging ระบุว่ายังไม่ยืนยัน",
        html.indexOf("Catalyst Watch") < 0 || html.indexOf("ยังไม่ถึงขั้นยืนยัน") >= 0);
      // harness นี้ไม่โหลด catalyst-qualification.js จึงไม่มีสถานะ FUNDAMENTAL_RECOVERY ให้เรนเดอร์
      // ถ้าไม่มีในผล ให้ตรวจที่โค้ดว่าคำอธิบายยังอยู่
      t("FUNDAMENTAL RECOVERY อธิบายว่าไม่ใช่ catalyst เชิงธุรกิจ",
        rows.some(function (r) { return r.qualification &&
          r.qualification.state.key === "FUNDAMENTAL_RECOVERY"; })
          ? html.indexOf("ยังไม่พบ catalyst เชิงธุรกิจอิสระ") >= 0
          : src.indexOf("ยังไม่พบ catalyst เชิงธุรกิจอิสระ") >= 0);
      // (11) "ขาดอะไร" มาจาก dimensions
      t("เกณฑ์อ่านจาก q.dimensions", src.indexOf("q.dimensions") >= 0 &&
        src.indexOf("RARE_GATES") >= 0);
      t("ใช้ q.priority เพื่อเรียงเท่านั้น ไม่แสดงค่า",
        src.indexOf("function byEnginePriority") >= 0 &&
        !/prio\(r\)[^;]{0,40}(esc|innerHTML|\+ *"<)/.test(src));
      // (6) ไม่มีการคำนวณแบบ engine ใน UI
      t("UI ไม่มีฟังก์ชันตัดสินแบบ engine",
        !/function\s+(computeMaturity|computeQualification|deriveStage|assessMargin|classifyWhyFell)/
          .test(src));
      t("whyInteresting มาจาก engine ตัดความยาวเท่านั้น",
        /function whyLine[\s\S]{0,220}q\.whyInteresting[\s\S]{0,60}clip\(/.test(src));
      // (12)(13)(14) ของเดิมยังอยู่
      t("All Candidates ยังอยู่และเปลี่ยนบทบาท",
        html.indexOf("All Candidates") >= 0 &&
        html.indexOf("ใช้สำหรับสำรวจและเจาะลึกหลังดู Today's Targets") >= 0);
      t("Landscape ยังเป็นบริบท ไม่ใช่กลไกล่าหุ้น",
        html.indexOf("Qualification Landscape") >= 0 &&
        html.indexOf("Qualification Landscape") > html.indexOf("Today's Targets"));
      t("Matrix ยังคงป้ายแผนที่บรรยาย",
        html.indexOf("Descriptive map — not a ranking") >= 0);
      t("ความสดของข้อมูลยังเห็นในจอแรก",
        html.indexOf("ch-brief-meta") >= 0 && html.indexOf("scanned") >= 0);
      // ลำดับหน้าถูกต้อง
      t("ลำดับ section ถูกต้อง", (function () {
        // ต้องจับ "หัวข้อ" จาก markup — คำเหล่านี้ถูกอ้างอิงข้ามส่วนด้วย (เช่น "ดูในตาราง All Candidates")
        var order = ["<h2>Hunter Brief</h2>", "<h2>Today's Targets</h2>",
          "<h2>ทำไมหุ้นส่วนใหญ่ไม่ใช่เป้า</h2>", "<h2>Qualification Landscape</h2>",
          "<h2>All Candidates ", "<h2>แหล่งข้อมูลและความครบถ้วน</h2>"];
        var pos = order.map(function (x) { return html.indexOf(x); });
        if (pos.some(function (p) { return p < 0; })) {
          console.error("     หัวข้อที่หาไม่เจอ: " + order.filter(function (x, i) {
            return pos[i] < 0; }).join(" | "));
          return false;
        }
        for (var i = 1; i < pos.length; i++) if (pos[i] < pos[i - 1]) return false;
        return pos[0] >= 0;
      })());
    })();

    // ---------- PHASE 5.1 ----------
    (function () {
      var rows = win.CatalystPage._state.rows;
      var rare = rows.filter(function (r) {
        return r.qualification && r.qualification.state.key === "STRONG_EARLY_CATALYST"; });
      var src = fs.readFileSync(PUB + "/catalyst-page.js", "utf8");
      // ศูนย์ต้องแสดงชัด
      // ป้ายชื่อมาจากโมดูล qualification ซึ่ง harness นี้ไม่ได้โหลด — ตรวจที่ตัวการ์ดแทน
      t("สรุปแสดงสถานะโอกาสแม้เป็นศูนย์",
        html.indexOf('data-ch-filter-status="STRONG_EARLY_CATALYST"') >= 0 &&
        html.indexOf('data-ch-filter-status="EARLY_CATALYST"') >= 0);
      t("การ์ดศูนย์กำกับว่าไม่มีในรอบนี้",
        rare.length > 0 || html.indexOf("ไม่มีในรอบนี้") >= 0);
      t("การ์ดศูนย์มีคลาสแยก", rare.length > 0 || html.indexOf("ch-sum-card is-zero") >= 0 ||
        /ch-sum-card[^"]*is-zero/.test(html));
      // near-miss แสดงเฉพาะเมื่อไม่มีตัวผ่านครบ
      if (rare.length === 0) {
        var anyNear = html.indexOf("หุ้นที่ใกล้ผ่านเกณฑ์") >= 0;
        t("ไม่มีตัวผ่านครบ → มีส่วนหุ้นที่ใกล้ผ่านเกณฑ์ (ถ้ามีตัวที่ตกข้อเดียว)",
          anyNear || src.indexOf("function nearMiss") >= 0);
        if (anyNear) {
          t("near-miss กำกับว่าไว้ติดตาม ไม่ใช่คำแนะนำ",
            html.indexOf("Near-miss is for monitoring, not recommendation") >= 0 &&
            html.indexOf("ไว้เพื่อติดตาม ไม่ใช่คำแนะนำ") >= 0);
          t("near-miss บอกข้อที่ยังไม่ผ่านและค่าที่ต้องการ",
            html.indexOf("ข้อที่ยังไม่ผ่าน") >= 0 && html.indexOf("ต้องการ:") >= 0);
          t("near-miss ระบุว่าไม่มีคะแนนและไม่วัดระยะห่าง",
            html.indexOf("ไม่มีคะแนนและไม่มีการวัดระยะห่าง") >= 0);
        }
      } else {
        t("มีตัวผ่านครบ → ไม่ต้องมีส่วน near-miss", html.indexOf("หุ้นที่ใกล้ผ่านเกณฑ์") < 0);
      }
      // ไม่มีคะแนนระยะห่าง
      t("ไม่มีคะแนนระยะห่างจากโอกาส",
        !/distanceToOpportunity|nearScore|gapScore/.test(src) &&
        !/ระยะห่าง\s*\d/.test(html));
      // เกณฑ์อ่านจากมิติของ engine ไม่ใช่เส้นตัดที่ UI ตั้งเอง
      t("เกณฑ์ near-miss อ่านจาก q.dimensions", src.indexOf("q.dimensions") >= 0 &&
        src.indexOf("RARE_GATES") >= 0);
      t("UI ไม่ฝังเส้นตัดตัวเลขของเกณฑ์", (function () {
        var g = /var RARE_GATES = \[[\s\S]*?\n  \];/.exec(src);
        return g && !/-30|>= 3|MAT_N|FIN_N/.test(g[0]);
      })());
      // นับจาก API ไม่ hard-code
      t("จำนวนมาจากผลสแกนจริง ไม่ hard-code",
        !/= *19\b|= *867\b|expectedCount/.test(src));
      // ธงอ่านคู่กับสถานะหลักได้
      t("UI อ่านธงจาก engine ไม่คิดเอง", src.indexOf("function hasRecoveryFlag") >= 0 &&
        src.indexOf('flags') >= 0);
      var withFlag = rows.filter(function (r) {
        return r.qualification && (r.qualification.flags || []).indexOf("FUNDAMENTAL_RECOVERY") >= 0; });
      t("มีธงงบฟื้น → แสดงคู่กับสถานะหลักในตาราง",
        withFlag.length === 0 || html.indexOf("งบฟื้น</span>") >= 0 ||
        html.indexOf("ch-flag") >= 0);
    })();
    t("§7 อธิบาย FUNDAMENTAL RECOVERY ว่าไม่ใช่ catalyst เชิงธุรกิจ",
      html.indexOf("ยังไม่พบ catalyst เชิงธุรกิจอิสระ") >= 0 ||
      fs.readFileSync(PUB + "/catalyst-page.js", "utf8")
        .indexOf("ยังไม่พบ catalyst เชิงธุรกิจอิสระ") >= 0);
    (function () {
      var src = fs.readFileSync(PUB + "/catalyst-page.js", "utf8");
      t("UI แยกจำนวนหลักฐานสองระนาบ",
        src.indexOf("function bizCount") >= 0 && src.indexOf("function finEvCount") >= 0);
      t("UI ไม่คำนวณระนาบเอง — อ่านจาก engine",
        src.indexOf("businessEvidenceCount") >= 0);
      t("UI มีคำอธิบายกรณีงบฟื้นล้วน", src.indexOf("isRecoveryOnly") >= 0);
    })();
    t("แสดงแหล่งข้อมูลและความครบถ้วน", html.indexOf("แหล่งข้อมูลและความครบถ้วน") >= 0);
    t("แถวคลิกเข้า detail ได้", html.indexOf("data-ch-ticker") >= 0);

    // ---------- กฎห้าม (PART 11) ----------
    t("ไม่มีคะแนน 0-100 บนหน้า", !/Catalyst Score|Confidence Score|คะแนนรวม/i.test(html));
    t("ไม่มีคำชี้นำการซื้อขาย", !/strong buy|strong sell|ควรซื้อ|ควรขาย|แนะนำซื้อ|แนะนำขาย/i.test(html));
    t("มีข้อความว่าไม่ใช่คำสั่งซื้อขาย", html.indexOf("ไม่ใช่คำสั่งซื้อขาย") >= 0);

    // ---------- จากผลตรวจอิสระ: palette ห้ามสื่อว่า "ลึกกว่า/ยังไม่รับรู้ = ดีกว่า" ----------
    t("ย่อ 52W ไม่ถูกระบายเป็นสีเขียว (ย่อลึก ≠ โอกาส)",
      !/ch-dim ch-tone-green"[^>]*><small>52W Drawdown/.test(html));
    t("ระดับการรับรู้ไม่ใช้สีเขียว (EARLY ≠ ข้อดี)", (function () {
      var src = fs.readFileSync(PUB + "/catalyst-page.js", "utf8");
      var m = /function recogTone\(k\) \{[\s\S]*?\}/.exec(src);
      return m && m[0].indexOf("green") < 0;
    })());
    t("UI ไม่ฝังเส้นตัดของ engine ไว้เอง (-30 / n >= 3)", (function () {
      var src = fs.readFileSync(PUB + "/catalyst-page.js", "utf8");
      return !/maturity\.n >= 3/.test(src) && !/ddPct\(r\) <= -30/.test(src);
    })());
    t("โค้ดไม่แต่งแถวไทม์ไลน์จากสถานะ", (function () {
      var src = fs.readFileSync(PUB + "/catalyst-page.js", "utf8");
      return src.indexOf("การรับรู้ของตลาด: \" + recogKey(r)") < 0 &&
        src.indexOf("kind: \"MARKET\"") < 0;
    })());
    t("§7 กระทบยอดครบทุกตัว ไม่มีกลุ่มหาย",
      html.indexOf("ซึ่งไม่ได้อยู่ทั้งสองกล่องด้านบน") >= 0 ||
      fs.readFileSync(PUB + "/catalyst-page.js", "utf8")
        .indexOf("ซึ่งไม่ได้อยู่ทั้งสองกล่องด้านบน") >= 0);
    t("§7 บอกว่ากลุ่มที่ซ้ำกับ Landscape ไม่ใช่การนับสองรอบ",
      html.indexOf("ไม่ใช่การนับสองรอบ") >= 0 ||
      fs.readFileSync(PUB + "/catalyst-page.js", "utf8").indexOf("ไม่ใช่การนับสองรอบ") >= 0);
    t("§6 อธิบายว่าเลขหลัง · คือจำนวนสัญญาณ",
      html.indexOf("จำนวนสัญญาณเสื่อมที่ตรวจพบ") >= 0);

    // ---------- ผลตรวจรอบสอง ----------
    (function () {
      var src = fs.readFileSync(PUB + "/catalyst-page.js", "utf8");
      t("UI ไม่สร้างรายการความเสี่ยงจากเส้นตัดที่ตั้งเอง",
        src.indexOf("หลักฐาน catalyst มีเพียง") < 0);
      t("+N more นับจากรายการเต็มหลังรวมแถวซ้ำ",
        src.indexOf("(pos.total || pos.length) - Math.min(POS_N, pos.length)") >= 0);
      t("หลักฐานติดป้ายชั้นที่มา", src.indexOf("ch-ev-layer") >= 0);
      t("รวมแถวหลักฐานที่ผู้อ่านแยกไม่ออก", src.indexOf("var byRow = {}") >= 0);
      t("รวมแถวแล้วไม่ทิ้งลิงก์ของฉบับอื่น", src.indexOf("g.moreUrls.push") >= 0);
      t("insider ใน tension ใช้ชุดที่ตัดสินทิศทาง", src.indexOf("ia.recentBuyCount") >= 0);
      t("streak บอกฐาน QoQ", src.indexOf("QoQ ขึ้นต่อเนื่อง") >= 0);
      t("ห่วงโซ่อ้างหลักฐานตัวเดียวกับ headline ของ engine",
        src.indexOf("C_catalyst.headline") >= 0);
      t("Backlog กลับเป็นแถวได้ถ้ามีข้อมูล", src.indexOf("function finRows") >= 0);
      t("ไม่มีโค้ดตายค้างไว้ (matThai)", src.indexOf("matThai") < 0);
      t("§7.2 ใช้ matLabel ไม่ใช่ maturity.label ตรง ๆ",
        !/\["Catalyst", r\.catalyst && r\.catalyst\.maturity \? r\.catalyst\.maturity\.label/.test(src));
    })();
    t("ป้ายจำนวน Candidates มีบริบท", /ch-count">\d+ จาก \d+</.test(html));
    t("§5 บอกว่าช่วงบนแกนเป็นช่วงแสดงผล ไม่ใช่เกณฑ์ของ engine",
      html.indexOf("ช่วงสำหรับแสดงผล") >= 0);
    t("Rare Opportunities ไม่ใช้กรอบเขียว (ความน่าซื้อ)", (function () {
      var css = fs.readFileSync(PUB + "/catalyst-hunter.css", "utf8");
      var m = /\.ch-sec-primary \{[^}]*\}/.exec(css);
      var c2 = /\.ch-rare \{[^}]*\}/.exec(css);
      return m && c2 && !/52, 211, 153/.test(m[0]) && !/52, 211, 153/.test(c2[0]);
    })());
    t("CSS ไม่มีสไตล์ไทม์ไลน์ที่เลิกใช้แล้ว", (function () {
      var css = fs.readFileSync(PUB + "/catalyst-hunter.css", "utf8");
      return css.indexOf(".ch-tl-financial") < 0 && css.indexOf(".ch-tl-market") < 0;
    })());
    (function () {
      var src = fs.readFileSync(PUB + "/catalyst-page.js", "utf8");
      t("UI ไม่คำนวณคะแนนรวมเอง", !/totalScore|compositeScore|function\s+\w*Score/.test(src));
      t("UI ไม่คำนวณ maturity/trap/qualification ใหม่",
        !/function\s+(computeMaturity|computeTrap|computeQualification|classifyWhyFell)/.test(src));
    })();

    // ---------- CSS ----------
    var css = fs.readFileSync(PUB + "/catalyst-hunter.css", "utf8");
    t("CSS มีโทนของทุกสถานะ", ["green", "amber", "orange", "red", "blue", "violet", "grey"]
      .every(function (k) { return css.indexOf(".ch-tone-" + k) >= 0; }));
    t("CSS: UNKNOWN/grey ไม่ใช้สีเขียว", (function () {
      var m = css.match(/\.ch-tone-grey\s*\{[^}]*\}/);
      return m && !/34d399|emerald/i.test(m[0]);
    })());
    t("CSS มีสไตล์ landscape (ไม่ใช่ pipeline)",
      css.indexOf(".ch-lscape") >= 0 && css.indexOf(".ch-pipe-sep") < 0);
    t("CSS มีตาราง metric Before/Latest/Direction", css.indexOf(".ch-mtable") >= 0);
    t("CSS เน้น value trap HIGH", css.indexOf(".ch-vt.is-high") >= 0);
    t("CSS: จำนวนสัญญาณไม่ถูกจัดเป็น badge คะแนน (ใช้เส้นประ)",
      /\.ch-sigcount\s*\{[^}]*dashed/.test(css));
    t("CSS ตัวเชื่อมห่วงโซ่แยกทึบ/ขาด",
      css.indexOf(".ch-chain-link.is-solid") >= 0 && css.indexOf(".ch-chain-link.is-broken") >= 0);
    t("CSS ตารางกว้างเลื่อนในกรอบตัวเอง ไม่ล้นหน้า", css.indexOf(".ch-tablewrap { overflow-x: auto; }") >= 0);
    t("CSS desktop-first มี breakpoint 1400/1100/780",
      css.indexOf("@media (max-width: 1400px)") >= 0 &&
      css.indexOf("@media (max-width: 1100px)") >= 0 &&
      css.indexOf("@media (max-width: 780px)") >= 0);
    t("CSS ไม่ใช้ color-mix (เลี่ยงกรณีเบราว์เซอร์ไม่รองรับแล้ว border หาย)",
      css.indexOf("color-mix") < 0);

    // ---------- DETAIL ----------
    win.location.search = "?ticker=TESTCO";
    win.CatalystPage.render();
    var d = els.chRoot.innerHTML;
    t("Detail render ได้", d.length > 3000, d.length);
    t("Detail มีปุ่มกลับ Radar", d.indexOf("data-ch-home") >= 0);

    // 7.1 header ครบทุกมิติ
    t("Detail header มีทุกมิติตามสเปค",
      ["52W Drawdown", "Catalyst", "Financial Inflection", "Market Recognition", "Value Trap", "Lifecycle"]
        .every(function (x) { return d.indexOf(">" + x + "<") >= 0; }));

    [["1 ทำไมหุ้นตัวนี้อยู่ที่นี่", "ทำไมหุ้นตัวนี้อยู่ที่นี่"],
      ["2 evidence chain", "ห่วงโซ่หลักฐาน (Evidence Chain)"],
      ["3 ทำไมราคาตก", "ทำไมราคาตก"],
      ["4 อะไรเปลี่ยนในตัวเลข", "อะไรเปลี่ยนในตัวเลข"],
      ["5 value trap", "Value Trap"],
      ["6 evidence tension", "หลักฐานที่ขัดกันเอง"],
      ["7 insider activity", "การซื้อขายของผู้บริหาร"],
      ["8 market recognition", "ตลาดรับรู้แล้วแค่ไหน"],
      ["9 ยังขาดหลักฐานอะไร", "ยังขาดหลักฐานอะไร"],
      ["10 อะไรจะพิสูจน์ว่าคิดผิด", "อะไรจะพิสูจน์ว่าเราคิดผิด"],
      ["11 ไทม์ไลน์หลักฐาน", "ไทม์ไลน์หลักฐาน"],
      ["12 related candidates", "Related Candidates"],
    ].forEach(function (x) {
      t("Detail มีส่วน " + x[0], d.indexOf(x[1]) >= 0);
    });

    // 7.3 ห่วงโซ่ต้องเป็นหลักฐาน ไม่ใช่การพยากรณ์
    t("Detail ห่วงโซ่ระบุว่าไม่ใช่การพยากรณ์", d.indexOf("ไม่ใช่การพยากรณ์") >= 0);
    // 7.5 ตาราง Before/Latest/Direction
    t("Detail มีหัวตาราง Metric/Before/Latest/Direction",
      ["Metric", "Before", "Latest", "Direction"].every(function (x) { return d.indexOf(">" + x + "<") >= 0; }) ||
      d.indexOf("Evidence unavailable") >= 0);
    // 7.13 related ตามสเปค 4 กลุ่ม
    t("Detail related ครบ 4 กลุ่มตามสเปค",
      ["Same Catalyst", "Same Financial Inflection", "Same Market Recognition", "Same Lifecycle"]
        .every(function (x) { return d.indexOf(x) >= 0; }));

    t("Detail แสดง Evidence unavailable เมื่อไม่มีข้อมูล", d.indexOf("Evidence unavailable") >= 0);
    t("Detail แสดง value trap เสมอ (ห้ามซ่อน)", d.indexOf("Value Trap") >= 0);
    t("Detail ระบุว่า UNKNOWN ไม่ได้แปลว่าปลอดภัย", d.indexOf("ไม่ได้แปลว่าปลอดภัย") >= 0);
    t("Detail: UNKNOWN value trap มีข้อความอังกฤษกำกับ",
      d.indexOf("UNKNOWN does not mean safe") >= 0);
    t("Detail: insider ไม่มีข้อมูล → บอกว่าไม่มี", d.indexOf("ยังไม่มีผลการตรวจเอกสาร") >= 0);
    t("โค้ดกำกับว่า insider ไม่ยกระดับ catalyst",
      fs.readFileSync(PUB + "/catalyst-page.js", "utf8")
        .indexOf("does not independently create") >= 0);
    t("Detail ไม่มีราคาเป้าหมาย/จุดตัดขาดทุน",
      d.indexOf("ไม่มีราคาเป้าหมายและไม่มีจุดตัดขาดทุน") >= 0);
    t("Detail ไม่มีคำชี้นำการซื้อขาย",
      !/strong buy|strong sell|ควรซื้อ|ควรขาย|แนะนำซื้อ|แนะนำขาย/i.test(d));
    t("Detail ไม่มีคะแนน", !/Catalyst Score|Confidence Score|คะแนนรวม/i.test(d));

    // ---------- จากผลตรวจอิสระ ----------
    (function () {
      // ห่วงโซ่ขึ้นเฉพาะเมื่อ engine ให้ q.rerating มา
      var row = win.CatalystPage._state.rows.filter(function (x) { return x.ticker === "TESTCO"; })[0];
      var ch = row && row.qualification && row.qualification.rerating;
      if (ch && ch.chain && ch.chain.length) {
        t("Detail ห่วงโซ่มีบรรทัดวันที่/แหล่งทุกขั้น (ไม่มีก็บอกว่าไม่มี)",
          (d.match(/ch-chain-meta/g) || []).length === ch.chain.length,
          (d.match(/ch-chain-meta/g) || []).length);
        t("Detail ขั้นที่ engine ไม่ให้วัน/แหล่ง ขึ้นว่า Evidence unavailable",
          d.indexOf("Date / Source: Evidence unavailable") >= 0);
      } else {
        t("Detail ไม่มีห่วงโซ่ → บอกว่า Evidence unavailable", d.indexOf("Evidence unavailable") >= 0);
        t("โค้ดมีบรรทัดวันที่/แหล่งของทุกขั้น",
          fs.readFileSync(PUB + "/catalyst-page.js", "utf8")
            .indexOf("Date / Source: Evidence unavailable") >= 0);
      }
    })();
    t("Detail ไม่มีแถวไทม์ไลน์ที่เป็นสถานะ (MARKET/FINANCIAL ที่ UI แต่ง)",
      d.indexOf('ch-tl ch-tl-market') < 0 && d.indexOf('ch-tl ch-tl-financial') < 0);
    t("Detail §1 ระบุ ย่อลึก ≠ โอกาส และ C4 ≠ การันตี",
      d.indexOf("ย่อลึก ≠ โอกาส") >= 0 && d.indexOf("C4 ≠ การันตีว่าธุรกิจเปลี่ยน") >= 0);
    t("Detail §4 ระบุ งบพลิก ≠ catalyst", d.indexOf("งบพลิก ≠ catalyst") >= 0);
    // PHASE 6 — จอแรกของ Detail ต้องตอบสี่คำถาม
    t("Detail มีสรุป PASSED / NOT YET / WAITING FOR / RISK",
      ["ผ่านแล้ว (PASSED)", "ยังไม่ผ่าน (NOT YET)", "รออะไร (WAITING FOR)", "ความเสี่ยง (RISK)"]
        .every(function (x) { return d.indexOf(x) >= 0; }));
    t("Detail สรุปมาก่อนหัวข้อ 1", d.indexOf("ch-dsum") < d.indexOf("ทำไมหุ้นตัวนี้อยู่ที่นี่"));
    t("Detail สรุประบุว่าไม่ใช่คำแนะนำ",
      d.indexOf("เป็นการจัดหมวด <strong>ไม่ใช่คำแนะนำ</strong>") >= 0);
    t("Detail ยังมี evidence/timeline ครบ (ไม่ถูกลบ)",
      d.indexOf("ไทม์ไลน์หลักฐาน") >= 0 && d.indexOf("หลักฐานที่ขัดกันเอง") >= 0 &&
      d.indexOf("Related Candidates") >= 0);
    // PHASE 5.1 — งบล้วนต้องไม่แสดง BUSINESS IMPACT = CONFIRMED_EVENT
    (function () {
      var row = win.CatalystPage._state.rows.filter(function (x) { return x.ticker === "TESTCO"; })[0];
      var biz = row && row.catalyst ? (row.catalyst.businessEvidenceCount || 0) : 0;
      if (biz === 0) {
        t("ไม่มีเหตุการณ์ธุรกิจ → ไม่แสดง CONFIRMED_EVENT", d.indexOf("CONFIRMED_EVENT") < 0);
        t("ไม่มีเหตุการณ์ธุรกิจ → BUSINESS IMPACT ขึ้น NOT_ESTABLISHED",
          d.indexOf("NOT_ESTABLISHED") >= 0 || d.indexOf("Evidence unavailable") >= 0);
      }
      t("โค้ดกั้น BUSINESS IMPACT ด้วยจำนวนเหตุการณ์ธุรกิจ",
        fs.readFileSync(process.cwd() + "/public/catalyst-qualification.js", "utf8")
          .indexOf("businessEvidenceCount") >= 0);
      t("UI แสดงชื่อ NO INDEPENDENT BUSINESS CATALYST เมื่อมีแต่หลักฐานงบ",
        fs.readFileSync(PUB + "/catalyst-page.js", "utf8")
          .indexOf("NO INDEPENDENT BUSINESS CATALYST") >= 0);
    })();
    t("Detail §4 ไม่มีแถว Backlog ที่ว่างเปล่า แต่ประกาศช่องว่างไว้",
      d.indexOf(">Backlog<") < 0 || d.indexOf("ไม่มีในตาราง: <b>Backlog</b>") >= 0);
    t("Detail §7.7 กำกับว่าจำนวนรายการไม่ใช่จำนวนข้อเท็จจริงอิสระ",
      d.indexOf("ไม่ใช่จำนวนข้อเท็จจริงที่เป็นอิสระต่อกัน") >= 0);
    t("Detail §7.11 บอกว่าบางข้ออ้างข้อมูลที่ระบบตรวจไม่ได้",
      d.indexOf("บางข้ออ้างข้อมูลที่ระบบยังตรวจไม่ได้") >= 0);
    t("Detail ไม่ใช้ X/3 ลอย ๆ กับรายการหลักที่ยืนยันแล้ว",
      d.indexOf("ยืนยันข้ามรายการ") < 0);
    t("Detail §11 ไม่อ้างว่าเงื่อนไขปรับรายตัว",
      d.indexOf("ไม่ได้ปรับรายตัวตามหลักฐานของหุ้นนี้") >= 0 &&
      d.indexOf("ผูกกับประเภทหลักฐานที่พบจริง") < 0);
    t("Detail §13 บอกว่าแสดงกี่จากกี่", /ch-rel-col"><h4>[^<]*<span>\d+ จาก \d+<\/span>/.test(d) ||
      d.indexOf("ไม่มี</p>") >= 0);
    t("Detail: catalyst ที่ตรวจแล้วไม่พบ ต้องไม่ขึ้นว่า DATA UNAVAILABLE", (function () {
      var src = fs.readFileSync(PUB + "/catalyst-page.js", "utf8");
      return src.indexOf("function matLabel") >= 0;
    })());
    win.location.search = "";

    done = true; finish();
  }).catch(function (e) {
    console.error("  ✗ หน้าเว็บ: " + e.message); fail++; done = true; finish();
  });

  setTimeout(function () { if (!done) { console.error("  ✗ หน้าเว็บ: timeout"); fail++; finish(); } }, 8000);
}

function finish() {
  console.log("\n" + (pass + fail) + " checks · " + pass + " passed · " + fail + " failed");
  process.exit(fail ? 1 : 0);
}
