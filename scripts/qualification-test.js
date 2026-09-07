// THAI CATALYST HUNTER — PHASE 3.1 · CATALYST QUALIFICATION
// node scripts/qualification-test.js
//
// ครอบ §15 เคส 1-6 และ §17 ทั้งหมด
// หัวใจ: งบฟื้น ≠ catalyst · ราคาหรือการรับรู้ของตลาดสร้าง catalyst ไม่ได้
//        value trap เป็นตัว override · ห่วงโซ่ re-rating ห้ามเติมข้อที่ไม่มีหลักฐาน
"use strict";
var fs = require("fs");
var path = require("path");
var Q = require("../public/catalyst-qualification.js");
var CE = require("../public/catalyst-engine.js");

var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; return; }
  fail++; console.error("  ✗ " + name + (extra !== undefined ? " — got: " + JSON.stringify(extra) : ""));
}

var FIN_KEYS = ["NO_INFLECTION", "EARLY_INFLECTION", "CONFIRMED_INFLECTION", "STRONG_INFLECTION"];
var RECOG_KEYS = { "-1": "UNKNOWN", 0: "EARLY", 1: "BUILDING", 2: "CONFIRMED", 3: "OVERHEATED" };

// สร้างชุดอินพุตครบเจ็ดมิติ — ค่าที่ไม่ระบุ = "ไม่มีข้อมูล" ไม่ใช่ค่าดี
function mk(o) {
  o = o || {};
  var hasDd = o.noPrice !== true;
  return {
    drawdown: hasDd
      ? { available: true, state: { rank: o.ddRank === undefined ? 3 : o.ddRank, label: o.ddLabel || "DEEP DRAWDOWN" },
          deepRank: 2, drawdown52wPct: o.pct === undefined ? -48 : o.pct, offLow52wPct: 5, bars: 1200 }
      : { available: false },
    catalyst: {
      availability: { key: o.avail || (o.mat === undefined ? "CATALYST_UNAVAILABLE" : "CATALYST_IDENTIFIED") },
      available: (o.avail || "CATALYST_IDENTIFIED") === "CATALYST_IDENTIFIED" && o.mat !== undefined,
      maturity: { n: o.mat === undefined ? -1 : o.mat, key: o.mat === undefined ? "NONE" : "C" + o.mat + "_TEST",
        label: o.mat === undefined ? "NONE" : "C" + o.mat },
      maturityEvidence: { n: o.mat === undefined ? -1 : o.mat },
      story: { n: o.story === undefined ? 2 : o.story },
      evidenceCount: o.ev === undefined ? 3 : o.ev,
      headline: o.headline === undefined ? "เหตุการณ์ทดสอบ" : o.headline,
      types: o.types || ["NEW_ORDER"],
    },
    financialInflection: o.fin === undefined
      ? { available: false, state: { key: "FINANCIAL_EVIDENCE_UNAVAILABLE", n: -1 }, quarterCount: 0, metrics: {} }
      : { available: true, state: { key: FIN_KEYS[o.fin], n: o.fin }, quarterCount: o.quarters === undefined ? 18 : o.quarters,
          latestQuarter: "2026-06-30", confirmedCoreCount: o.core === undefined ? (o.fin >= 2 ? 2 : 0) : o.core, metrics: {} },
    recognition: { state: { n: o.recog === undefined ? 0 : o.recog,
      key: RECOG_KEYS[String(o.recog === undefined ? 0 : o.recog)],
      label: RECOG_KEYS[String(o.recog === undefined ? 0 : o.recog)] }, evidence: [] },
    valueTrap: { risk: { key: o.trap || "LOW" }, signals: o.trapSignals || [] },
    lifecycle: o.life || "EARLY",
    kbInflection: o.kbInf === undefined ? null : { state: { n: o.kbInf } },
  };
}
function st(o) { return Q.qualify(mk(o)).state.key; }

// ============================================================
console.log("== §15 เคสตัวอย่าง 1-6 ==");
{
  t("1. งบฟื้นอย่างเดียว → FUNDAMENTAL_RECOVERY",
    st({ avail: "NO_CATALYST", fin: 2 }) === "FUNDAMENTAL_RECOVERY", st({ avail: "NO_CATALYST", fin: 2 }));
  t("2. C3 + งบยังไม่ขยับ → EARLY_CATALYST",
    st({ mat: 3, fin: 0 }) === "EARLY_CATALYST", st({ mat: 3, fin: 0 }));
  t("3. C3 + งบยืนยันแล้ว (CONFIRMED) → STRONG_EARLY_CATALYST",
    st({ mat: 3, fin: 2 }) === "STRONG_EARLY_CATALYST", st({ mat: 3, fin: 2 }));
  t("3b. C3 + งบเริ่มขยับ (EARLY) → ยังเป็น EARLY_CATALYST",
    st({ mat: 3, fin: 1 }) === "EARLY_CATALYST", st({ mat: 3, fin: 1 }));
  t("4. ย่อลึก + ไม่มี catalyst + พื้นฐานเสื่อม → VALUE_TRAP_RISK",
    st({ avail: "NO_CATALYST", trap: "HIGH", trapSignals: ["a", "b"] }) === "VALUE_TRAP_RISK");
  t("5. catalyst + ตลาดรับรู้เต็ม → PRICED_IN",
    st({ mat: 5, recog: 2 }) === "PRICED_IN", st({ mat: 5, recog: 2 }));
  t("5b. catalyst ยืนยัน + ตลาดร้อนผิดปกติ → EXIT_WATCH",
    st({ mat: 3, recog: 3 }) === "EXIT_WATCH", st({ mat: 3, recog: 3 }));
  t("6. งบฟื้นแรง + ไม่มี catalyst → FUNDAMENTAL_RECOVERY",
    st({ avail: "NO_CATALYST", fin: 3 }) === "FUNDAMENTAL_RECOVERY");
}

console.log("== §1/§3/§7 งบฟื้น ≠ catalyst ==");
{
  // ทุกระดับการฟื้นของงบ ถ้าไม่มี catalyst ต้องไม่กลายเป็นโอกาสแบบ catalyst
  [1, 2, 3].forEach(function (f) {
    var r = Q.qualify(mk({ avail: "NO_CATALYST", fin: f }));
    t("งบระดับ " + FIN_KEYS[f] + " ไม่มี catalyst → FUNDAMENTAL_RECOVERY", r.state.key === "FUNDAMENTAL_RECOVERY", r.state.key);
    t("งบระดับ " + FIN_KEYS[f] + " ไม่ยกเป็น EARLY_CATALYST", r.state.key !== "EARLY_CATALYST");
    t("งบระดับ " + FIN_KEYS[f] + " ไม่ยกเป็น STRONG_EARLY_CATALYST", r.state.key !== "STRONG_EARLY_CATALYST");
    t("งบระดับ " + FIN_KEYS[f] + " ไม่ยก maturity ของ catalyst",
      r.dimensions.C_catalyst.maturityN < 0, r.dimensions.C_catalyst.maturityN);
  });
  // §7 ข้อความอธิบายต้องตรงตามที่สเปคกำหนด
  var rec = Q.qualify(mk({ avail: "NO_CATALYST", fin: 2 }));
  t("§7 ข้อความอธิบายตรงตามสเปค",
    rec.why.join(" ").indexOf("ผลประกอบการเริ่มฟื้น แต่ยังไม่พบ Catalyst ใหม่ที่ยืนยันได้") >= 0, rec.why[0]);
  t("§3 ระบุว่าไม่ยกเป็น C3/C4/C5", rec.why.join(" ").indexOf("ไม่ยกเป็น C3/C4/C5") >= 0);
  t("มิติ catalyst ยังเป็น NO_CATALYST", rec.dimensions.C_catalyst.availability === "NO_CATALYST");
}

console.log("== §4 C3 + ยังไม่มีหลักฐานงบ = EARLY_CATALYST ==");
{
  t("C3 + งบไม่มีข้อมูล → EARLY_CATALYST", st({ mat: 3 }) === "EARLY_CATALYST", st({ mat: 3 }));
  t("C3 + งบ NO_INFLECTION → EARLY_CATALYST", st({ mat: 3, fin: 0 }) === "EARLY_CATALYST");
  t("C3 + ตลาด UNKNOWN → EARLY_CATALYST", st({ mat: 3, recog: -1 }) === "EARLY_CATALYST", st({ mat: 3, recog: -1 }));
  t("C3 + ตลาด BUILDING → EARLY_CATALYST", st({ mat: 3, recog: 1 }) === "EARLY_CATALYST", st({ mat: 3, recog: 1 }));
  t("C4 + ตลาดยังรับรู้น้อย → ยังเป็น EARLY_CATALYST", st({ mat: 4, recog: 0 }) === "EARLY_CATALYST", st({ mat: 4, recog: 0 }));
  // แยก EARLY vs EMERGING ให้ชัด
  t("C2 (ประกาศแล้ว) → EMERGING ไม่ใช่ EARLY_CATALYST", st({ mat: 2 }) === "EMERGING", st({ mat: 2 }));
  t("C1 → STORY_ONLY", st({ mat: 1 }) === "STORY_ONLY", st({ mat: 1 }));
  t("C0 → SPECULATIVE", st({ mat: 0 }) === "SPECULATIVE", st({ mat: 0 }));
  var r = Q.qualify(mk({ mat: 3, fin: 0 }));
  t("§4 อธิบายว่างบยังไม่ขยับเป็นเรื่องปกติของ catalyst ช่วงต้น",
    r.why.join(" ").indexOf("ปกติสำหรับ catalyst ช่วงต้น") >= 0);
}

console.log("== §5 C3 + งบเริ่มฟื้น = STRONG_EARLY_CATALYST ==");
{
  // เกณฑ์งบของ STRONG_EARLY = STRONG หรือ CONFIRMED (EARLY ยังไม่นับ)
  t("C3 + CONFIRMED_INFLECTION → STRONG_EARLY", st({ mat: 3, fin: 2 }) === "STRONG_EARLY_CATALYST");
  t("C3 + STRONG_INFLECTION → STRONG_EARLY", st({ mat: 3, fin: 3 }) === "STRONG_EARLY_CATALYST", st({ mat: 3, fin: 3 }));
  t("C3 + ตลาด BUILDING + งบยืนยัน → STRONG_EARLY", st({ mat: 3, fin: 2, recog: 1 }) === "STRONG_EARLY_CATALYST");
  t("C3 + ตลาด BUILDING + งบ STRONG → STRONG_EARLY", st({ mat: 3, fin: 3, recog: 1 }) === "STRONG_EARLY_CATALYST");
  // ความหมายที่ต้องคงไว้: งบระดับ EARLY ยังไม่นับเป็น STRONG_EARLY
  t("C3 + EARLY_INFLECTION → ยังเป็น EARLY_CATALYST (ไม่ใช่ STRONG)",
    st({ mat: 3, fin: 1 }) === "EARLY_CATALYST", st({ mat: 3, fin: 1 }));
  t("C3 + NO_INFLECTION → EARLY_CATALYST", st({ mat: 3, fin: 0 }) === "EARLY_CATALYST");
  t("STRONG_EARLY มีลำดับสูงสุด", Q.QUAL.STRONG_EARLY_CATALYST.prio === 1);
  t("EARLY_CATALYST ลำดับที่สอง", Q.QUAL.EARLY_CATALYST.prio === 2);
  var r = Q.qualify(mk({ mat: 3, fin: 2 }));
  t("§5 อธิบายครบทั้งสี่มิติ", r.why.length >= 4, r.why.length);
  t("§5 อ้างถึงงบที่ยืนยันแล้ว", r.why.join(" ").indexOf("งบยืนยันเรื่องแล้ว") >= 0, r.why);
  var rEarly = Q.qualify(mk({ mat: 3, fin: 1 }));
  t("งบ EARLY อธิบายว่ายังไม่ถึงขั้นยืนยัน",
    rEarly.why.join(" ").indexOf("ยังไม่ถึงขั้นยืนยัน") >= 0, rEarly.why);
}

console.log("== §6 catalyst ที่ราคาไม่ย่อลึก ไม่ใช่ EARLY_CATALYST ==");
{
  t("C3 + ไม่ย่อลึก → CATALYST_EXISTS", st({ mat: 3, ddRank: 0, pct: -8 }) === "CATALYST_EXISTS", st({ mat: 3, ddRank: 0, pct: -8 }));
  t("C3 + ไม่ย่อลึก + งบยืนยันแล้ว → ยังไม่ใช่ STRONG_EARLY",
    st({ mat: 3, fin: 2, ddRank: 0, pct: -5 }) !== "STRONG_EARLY_CATALYST", st({ mat: 3, fin: 2, ddRank: 0, pct: -5 }));
  t("C4 + ไม่ย่อลึก + งบ STRONG → ยังไม่ใช่ STRONG_EARLY",
    st({ mat: 4, fin: 3, ddRank: 0, pct: -6 }) !== "STRONG_EARLY_CATALYST", st({ mat: 4, fin: 3, ddRank: 0, pct: -6 }));
  t("C3 + ตลาดรับรู้ CONFIRMED + ใกล้จุดสูง → ไม่ใช่ EARLY_CATALYST",
    ["CATALYST_EXISTS", "PRICED_IN", "EMERGING"].indexOf(st({ mat: 3, recog: 2, ddRank: 0, pct: -3 })) >= 0,
    st({ mat: 3, recog: 2, ddRank: 0, pct: -3 }));
  var r = Q.qualify(mk({ mat: 3, ddRank: 0, pct: -8 }));
  t("§6 อธิบายว่าเครื่องมือเน้นย่อลึก", r.why.join(" ").indexOf("ย่อลึก") >= 0);
  t("CATALYST_EXISTS ลำดับต่ำกว่า EARLY_CATALYST",
    Q.QUAL.CATALYST_EXISTS.prio > Q.QUAL.EARLY_CATALYST.prio);
}

console.log("== §8 value trap เป็นตัว override ==");
{
  // ทุกสถานะที่ดูดี ถ้า trap HIGH ต้องกลายเป็น VALUE_TRAP_RISK
  [{ mat: 3, fin: 3 }, { mat: 3, fin: 2 }, { mat: 4 }, { mat: 3, pct: -70 }, { avail: "NO_CATALYST", fin: 3 }]
    .forEach(function (o, i) {
      var withTrap = Object.assign({}, o, { trap: "HIGH", trapSignals: ["เสื่อม1", "เสื่อม2"] });
      t("เคส#" + i + " + trap HIGH → VALUE_TRAP_RISK", st(withTrap) === "VALUE_TRAP_RISK", st(withTrap));
    });
  t("trap MEDIUM ไม่ override", st({ mat: 3, fin: 2, trap: "MEDIUM" }) === "STRONG_EARLY_CATALYST");
  var r = Q.qualify(mk({ mat: 3, fin: 2, trap: "HIGH", trapSignals: ["x"] }));
  t("§8 อธิบายว่าราคาถูกไม่ลบล้างการเสื่อม", r.why.join(" ").indexOf("ความถูกของราคาไม่ลบล้าง") >= 0);
  t("§8 ยังคงบอกว่ามี catalyst อยู่", r.why.join(" ").indexOf("มี catalyst ระดับ") >= 0);
  t("§8 มิติ catalyst ยังอ่านได้ ไม่ถูกลบ", r.dimensions.C_catalyst.maturityN === 3);
  t("§8 มิติงบยังอ่านได้", r.dimensions.D_financial.n === 2);
}

console.log("== §9 UNEXPLAINED_MARKET_MOVE แยกจาก FUNDAMENTAL_RECOVERY ==");
{
  t("ตลาด BUILDING + ไม่มี catalyst → UNEXPLAINED", st({ avail: "NO_CATALYST", recog: 1 }) === "UNEXPLAINED_MARKET_MOVE");
  t("ตลาด CONFIRMED + ไม่มี catalyst → UNEXPLAINED", st({ avail: "NO_CATALYST", recog: 2 }) === "UNEXPLAINED_MARKET_MOVE");
  t("ตลาด OVERHEATED + ไม่มี catalyst → UNEXPLAINED", st({ avail: "NO_CATALYST", recog: 3 }) === "UNEXPLAINED_MARKET_MOVE");
  var both = Q.qualify(mk({ avail: "NO_CATALYST", recog: 2, fin: 2 }));
  t("§9 ตลาดขยับ + งบฟื้น → state = UNEXPLAINED_MARKET_MOVE", both.state.key === "UNEXPLAINED_MARKET_MOVE");
  t("§9 และตั้งธง FUNDAMENTAL_RECOVERY ควบ", both.flags.indexOf("FUNDAMENTAL_RECOVERY") >= 0, both.flags);
  t("§9 อธิบายว่าธุรกิจดีขึ้นและตลาดตอบสนอง แต่ไม่มี catalyst",
    both.why.join(" ").indexOf("ยังไม่พบ catalyst ใหม่ที่ยืนยันได้") >= 0);
  t("§9 ไม่ยก maturity", both.dimensions.C_catalyst.maturityN < 0);
  t("§9 ระบุว่าไม่ใช่สัญญาณบวก", both.why.join(" ").indexOf("ไม่ใช่สัญญาณบวก") >= 0);
  // ตลาดยังไม่ขยับ + งบฟื้น = FUNDAMENTAL_RECOVERY ล้วน
  t("ตลาดยังไม่ขยับ + งบฟื้น → FUNDAMENTAL_RECOVERY",
    st({ avail: "NO_CATALYST", recog: 0, fin: 2 }) === "FUNDAMENTAL_RECOVERY");
}

console.log("== การรับรู้ของตลาด/ราคา สร้าง catalyst ไม่ได้ ==");
{
  // กวาดทุกระดับการรับรู้ × ทุกระดับการย่อ เมื่อไม่มี catalyst
  var bad = [];
  [-1, 0, 1, 2, 3].forEach(function (rg) {
    [0, 1, 2, 3].forEach(function (rank) {
      [undefined, 0, 1, 2, 3].forEach(function (f) {
        var o = { avail: "NO_CATALYST", recog: rg, ddRank: rank, pct: -60 };
        if (f !== undefined) o.fin = f;
        var r = Q.qualify(mk(o));
        if (["EARLY_CATALYST", "STRONG_EARLY_CATALYST", "CATALYST_EXISTS", "PRICED_IN", "EXIT_WATCH"].indexOf(r.state.key) >= 0) {
          bad.push(r.state.key + "@recog" + rg + "/rank" + rank + "/fin" + f);
        }
        if (r.dimensions.C_catalyst.maturityN >= 0) bad.push("mat@" + rg);
      });
    });
  });
  t("กวาด 100 คอมบิเนชัน: ไม่มี catalyst → ไม่มีทางได้สถานะที่ต้องมี catalyst", bad.length === 0, bad.slice(0, 5));
  t("ย่อลึกสุด + ไม่มี catalyst → NO_CATALYST", st({ avail: "NO_CATALYST", pct: -90 }) === "NO_CATALYST");
  t("ยังตรวจไม่ได้ + ย่อลึก → CATALYST_UNAVAILABLE", st({ pct: -60 }) === "CATALYST_UNAVAILABLE", st({ pct: -60 }));
  t("สองสถานะนี้ต่างกัน", st({ avail: "NO_CATALYST" }) !== st({}));
}

console.log("== §2 เจ็ดมิติต้องแยกกันและอ่านกลับได้ ==");
{
  var r = Q.qualify(mk({ mat: 3, fin: 2, recog: 1, trapSignals: ["s1"] }));
  ["A_price", "B_discovery", "C_catalyst", "D_financial", "E_recognition", "F_valueTrap", "G_lifecycle"]
    .forEach(function (k) { t("มีมิติ " + k, Object.prototype.hasOwnProperty.call(r.dimensions, k)); });
  t("ไม่มีคะแนนรวม 0-100",
    !Object.prototype.hasOwnProperty.call(r, "score") && !Object.prototype.hasOwnProperty.call(r, "totalScore"));
  t("priority เป็นลำดับ ไม่ใช่คะแนน", r.priority === Q.QUAL.STRONG_EARLY_CATALYST.prio);
  t("มิติราคายังอ่านค่าเดิมได้", r.dimensions.A_price.pct === -48 && r.dimensions.A_price.deep === true);
  t("มิติงบยังอ่านค่าเดิมได้", r.dimensions.D_financial.stateKey === "CONFIRMED_INFLECTION");
  t("มิติการรับรู้ยังอ่านค่าเดิมได้", r.dimensions.E_recognition.key === "BUILDING");
  // §10 สถานะทั้งหมดตามสเปคต้องมีจริง
  ["EARLY_CATALYST", "STRONG_EARLY_CATALYST", "EMERGING", "TURNAROUND", "FUNDAMENTAL_RECOVERY",
    "UNEXPLAINED_MARKET_MOVE", "STORY_ONLY", "SPECULATIVE", "VALUE_TRAP_RISK", "PRICED_IN",
    "EXIT_WATCH", "CATALYST_UNAVAILABLE", "NO_CATALYST"].forEach(function (k) {
    t("§10 มีสถานะ " + k, !!Q.QUAL[k]);
  });
  t("§6 มี CATALYST_EXISTS ด้วย", !!Q.QUAL.CATALYST_EXISTS);
  // §11 ลำดับต้องไม่ซ้ำและเรียงตามสเปค
  var prios = Object.keys(Q.QUAL).map(function (k) { return Q.QUAL[k].prio; });
  t("§11 ลำดับไม่ซ้ำกัน", new Set(prios).size === prios.length);
  t("§11 STRONG_EARLY < EARLY < EMERGING < TURNAROUND < FUNDAMENTAL_RECOVERY < UNEXPLAINED",
    Q.QUAL.STRONG_EARLY_CATALYST.prio < Q.QUAL.EARLY_CATALYST.prio &&
    Q.QUAL.EARLY_CATALYST.prio < Q.QUAL.EMERGING.prio &&
    Q.QUAL.EMERGING.prio < Q.QUAL.TURNAROUND.prio &&
    Q.QUAL.TURNAROUND.prio < Q.QUAL.FUNDAMENTAL_RECOVERY.prio &&
    Q.QUAL.FUNDAMENTAL_RECOVERY.prio < Q.QUAL.UNEXPLAINED_MARKET_MOVE.prio);
  t("§11 STORY_ONLY < SPECULATIVE < VALUE_TRAP < PRICED_IN < EXIT_WATCH",
    Q.QUAL.STORY_ONLY.prio < Q.QUAL.SPECULATIVE.prio &&
    Q.QUAL.SPECULATIVE.prio < Q.QUAL.VALUE_TRAP_RISK.prio &&
    Q.QUAL.VALUE_TRAP_RISK.prio < Q.QUAL.PRICED_IN.prio &&
    Q.QUAL.PRICED_IN.prio < Q.QUAL.EXIT_WATCH.prio);
}

console.log("== §12 \"ทำไมน่าสนใจ\" สร้างจากข้อเท็จจริงที่มีเท่านั้น ==");
{
  var r = Q.qualify(mk({ mat: 3, fin: 1, recog: 0 }));
  t("มีข้อความ whyInteresting", typeof r.whyInteresting === "string" && r.whyInteresting.length > 40);
  t("อ้างเปอร์เซ็นต์การย่อจริง", r.whyInteresting.indexOf("48%") >= 0, r.whyInteresting);
  t("อ้างระดับ catalyst จริง", r.whyInteresting.indexOf("C3") >= 0);
  t("อ้างระดับการรับรู้จริง", r.whyInteresting.indexOf("EARLY") >= 0);
  t("อ้างสถานะงบจริง", r.whyInteresting.indexOf("EARLY_INFLECTION") >= 0);
  // ไม่มีข้อมูล → ต้องบอกว่าไม่มี ไม่ใช่เงียบหรือเดา
  var noData = Q.qualify(mk({ noPrice: true }));
  t("ไม่มีข้อมูลราคา → บอกตรง ๆ", noData.whyInteresting.indexOf("ยังไม่มีข้อมูลราคา") >= 0, noData.whyInteresting);
  t("ไม่มีตัวเลขงบ → บอก FINANCIAL_EVIDENCE_UNAVAILABLE",
    noData.whyInteresting.indexOf("FINANCIAL_EVIDENCE_UNAVAILABLE") >= 0);
  t("ยังตรวจ catalyst ไม่ได้ → บอกว่าไม่ได้แปลว่าไม่มี",
    noData.whyInteresting.indexOf("ไม่ได้แปลว่าไม่มี") >= 0);
  var noCat = Q.qualify(mk({ avail: "NO_CATALYST", fin: 0 }));
  t("ตรวจแล้วไม่พบ → ข้อความต่างจากยังตรวจไม่ได้",
    noCat.whyInteresting.indexOf("ตรวจแหล่งหลักฐานแล้วยังไม่พบ") >= 0);
  t("งบครบแต่ไม่พลิก → บอกว่าไม่พลิก (ไม่ใช่ไม่มีข้อมูล)",
    noCat.whyInteresting.indexOf("ยังไม่พลิก") >= 0);
  t("value trap สูง → ปรากฏในข้อความ",
    Q.qualify(mk({ mat: 3, trap: "HIGH", trapSignals: ["a"] })).whyInteresting.indexOf("สัญญาณธุรกิจเสื่อม") >= 0);
}

console.log("== §13 \"ยังขาดอะไร\" ต้องระบุชัด ==");
{
  var r = Q.qualify(mk({ mat: 3, fin: 2 }));
  t("มีรายการ missing", Array.isArray(r.missing) && r.missing.length > 0);
  t("ทุกรายการมี item/why/where",
    r.missing.every(function (m) { return m.item && m.why && m.where; }));
  var items = r.missing.map(function (m) { return m.item; }).join(" | ");
  t("§13 ระบุมูลค่าสัญญา", items.indexOf("มูลค่าสัญญา") >= 0, items);
  t("§13 ระบุ backlog", items.indexOf("backlog") >= 0);
  t("§13 ระบุแนวทางจากผู้บริหาร", items.indexOf("แนวทางจากผู้บริหาร") >= 0);
  t("บอกเหตุผลว่าทำไมยังไม่มี (มูลค่าสัญญาอยู่ในไฟล์แนบ)",
    r.missing.filter(function (m) { return m.item.indexOf("มูลค่าสัญญา") >= 0; })[0].why.indexOf("ไฟล์แนบ") >= 0);
  var noFin = Q.qualify(mk({ mat: 3 }));
  t("ไม่มีตัวเลขงบ → ระบุเป็นสิ่งที่ขาด",
    noFin.missing.some(function (m) { return m.item.indexOf("ตัวเลขงบรายไตรมาส") >= 0; }));
  var c2 = Q.qualify(mk({ mat: 2 }));
  t("C2 → ระบุว่าขาดหลักฐานยืนยัน",
    c2.missing.some(function (m) { return m.item.indexOf("หลักฐานยืนยันว่าเกิดขึ้นจริง") >= 0; }));
  var noCat2 = Q.qualify(mk({ avail: "NO_CATALYST" }));
  t("ไม่มี catalyst → ระบุว่าขาดเหตุการณ์ที่เข้าเกณฑ์",
    noCat2.missing.some(function (m) { return m.item.indexOf("เหตุการณ์") >= 0; }));
  t("ระบุที่ไปหาต่อ", noCat2.missing[0].where.length > 5);
  var partial = Q.qualify(mk({ mat: 3, fin: 1, core: 1 }));
  t("งบยืนยันได้แค่ 1 รายการ → ระบุว่าขาดการยืนยันข้ามรายการ",
    partial.missing.some(function (m) { return m.item.indexOf("ยืนยันข้ามรายการ") >= 0; }));
  var noPrice = Q.qualify(mk({ noPrice: true, mat: 3 }));
  t("ไม่มีข้อมูลราคา → ระบุเป็นสิ่งที่ขาด",
    noPrice.missing.some(function (m) { return m.item.indexOf("ราคาย้อนหลัง") >= 0; }));
}

console.log("== §14 ห่วงโซ่ re-rating ห้ามเติมข้อที่ไม่มีหลักฐาน ==");
{
  var r = Q.qualify(mk({ mat: 3, fin: 0 }));
  var chain = r.rerating.chain;
  t("มี 5 ขั้น", chain.length === 5, chain.length);
  t("ลำดับขั้นตรงตามสเปค",
    chain.map(function (s) { return s.step; }).join(">") ===
    "CATALYST>BUSINESS IMPACT>FINANCIAL IMPACT>MARKET RECOGNITION>RE-RATING");
  var fin = chain.filter(function (s) { return s.step === "FINANCIAL IMPACT"; })[0];
  t("C3 + งบยังไม่ขยับ → FINANCIAL IMPACT = NOT_YET_OBSERVED", fin.state === "NOT_YET_OBSERVED", fin.state);
  t("ขั้นที่ไม่มีหลักฐาน supported = false", fin.supported === false);
  t("§14 ไม่ประมาณขนาดของผลกระทบ", fin.detail.indexOf("ไม่ประมาณ") >= 0);
  t("ห่วงโซ่ยังไม่ครบ", r.rerating.complete === false);
  t("บอกว่าขาดที่ขั้นไหน", r.rerating.brokenAt === "FINANCIAL IMPACT", r.rerating.brokenAt);
  t("อธิบายว่าไม่เติมข้อที่ไม่มีหลักฐาน", r.rerating.note.indexOf("ไม่เติมข้อที่ไม่มีหลักฐาน") >= 0);

  var noCat = Q.qualify(mk({ avail: "NO_CATALYST", fin: 2 }));
  var c1 = noCat.rerating.chain[0];
  t("ไม่มี catalyst → ขั้นแรกไม่ supported", c1.supported === false);
  t("ไม่มี catalyst → BUSINESS IMPACT = NOT_ESTABLISHED",
    noCat.rerating.chain[1].state === "NOT_ESTABLISHED");
  t("แต่ FINANCIAL IMPACT ยังรายงานตามจริง",
    noCat.rerating.chain[2].state === "CONFIRMED_INFLECTION", noCat.rerating.chain[2].state);
  t("RE-RATING = INSUFFICIENT_EVIDENCE", noCat.rerating.chain[4].state === "INSUFFICIENT_EVIDENCE");

  var noFin = Q.qualify(mk({ mat: 3 }));
  t("ไม่มีตัวเลขงบ → FINANCIAL_EVIDENCE_UNAVAILABLE (ไม่ใช่ NOT_YET_OBSERVED)",
    noFin.rerating.chain[2].state === "FINANCIAL_EVIDENCE_UNAVAILABLE", noFin.rerating.chain[2].state);

  var full = Q.qualify(mk({ mat: 3, fin: 2, recog: 1 }));
  t("ครบทุกขั้น → RE-RATING = IN_PROGRESS", full.rerating.chain[4].state === "IN_PROGRESS", full.rerating.chain[4].state);
  t("ครบทุกขั้น → complete = true", full.rerating.complete === true);
}

console.log("== §11 การจัดลำดับ ==");
{
  var list = [
    { ticker: "A", qualification: Q.qualify(mk({ avail: "NO_CATALYST" })), drawdown: { drawdown52wPct: -20 } },
    { ticker: "B", qualification: Q.qualify(mk({ mat: 3, fin: 2 })), drawdown: { drawdown52wPct: -48 } },
    { ticker: "C", qualification: Q.qualify(mk({ mat: 3 })), drawdown: { drawdown52wPct: -50 } },
    { ticker: "D", qualification: Q.qualify(mk({ avail: "NO_CATALYST", fin: 2 })), drawdown: { drawdown52wPct: -30 } },
    { ticker: "E", qualification: Q.qualify(mk({ mat: 3, trap: "HIGH", trapSignals: ["x"] })), drawdown: { drawdown52wPct: -60 } },
  ];
  var ranked = Q.rank(list);
  t("STRONG_EARLY มาก่อน", ranked[0].ticker === "B", ranked.map(function (x) { return x.ticker; }));
  t("EARLY_CATALYST มาที่สอง", ranked[1].ticker === "C");
  t("FUNDAMENTAL_RECOVERY มาก่อน VALUE_TRAP",
    ranked.findIndex(function (x) { return x.ticker === "D"; }) <
    ranked.findIndex(function (x) { return x.ticker === "E"; }));
  t("CATALYST_UNAVAILABLE อยู่ท้าย", ranked[ranked.length - 1].ticker === "A", ranked[ranked.length - 1].ticker);
  // ลำดับเดียวกัน → ย่อลึกกว่ามาก่อน
  var same = Q.rank([
    { ticker: "X", qualification: Q.qualify(mk({ mat: 3 })), drawdown: { drawdown52wPct: -30 } },
    { ticker: "Y", qualification: Q.qualify(mk({ mat: 3 })), drawdown: { drawdown52wPct: -70 } },
  ]);
  t("ลำดับเท่ากัน → ย่อลึกกว่ามาก่อน", same[0].ticker === "Y", same[0].ticker);
}

console.log("== ต่อกับ engine จริง: ราคาสร้าง catalyst ไม่ได้ ==");
{
  function series(bp, vm) {
    var c = [], v = [], dts = [], start = 20, peak = start + 300 * 0.05;
    for (var i = 0; i < 300; i++) { c.push(start + i * 0.05); v.push(1e6); dts.push("a"); }
    var low = peak * 0.5;
    for (var j = 0; j < 200; j++) { c.push(peak * (1 - 0.5 * (j + 1) / 200)); v.push(1e6); dts.push("b"); }
    for (var k = 0; k < 60; k++) { c.push(low * (1 + bp * (k + 1) / 60)); v.push(k >= 40 ? 1e6 * vm : 1e6); dts.push("c"); }
    var b = []; for (var x = 0; x < c.length; x++) b.push(100);
    return { ticker: "TEST", name: "T", market: "SET", closes: c, volumes: v, dates: dts,
      benchCloses: b, benchSymbol: "^SET.BK", source: "test" };
  }
  var bad = [];
  for (var bp = 0; bp <= 100; bp += 25) {
    for (var vm = 1; vm <= 3; vm++) {
      [null, { available: true, state: { key: "STRONG_INFLECTION", n: 3 }, quarterCount: 18, metrics: {} }]
        .forEach(function (fi) {
          var o = CE.analyze(series(bp / 100, vm), null, {
            inspected: true, items: [], totalDisclosures: 30, routineCount: 30, unknownCount: 0,
            note: "x", financialInflection: fi });
          if (!o.qualification) { bad.push("no-qual@" + bp); return; }
          var k = o.qualification.state.key;
          if (["EARLY_CATALYST", "STRONG_EARLY_CATALYST", "CATALYST_EXISTS"].indexOf(k) >= 0) bad.push(k + "@" + bp);
          if (o.catalyst.maturity.key !== "NONE") bad.push("mat@" + bp);
        });
    }
  }
  t("กวาด 30 คอมบิเนชัน (ราคา×วอลุ่ม×งบ): ไม่มี catalyst → ไม่มีสถานะโอกาส", bad.length === 0, bad.slice(0, 5));

  var withFin = CE.analyze(series(0.05, 1), null, {
    inspected: true, items: [], totalDisclosures: 30, routineCount: 30, unknownCount: 0, note: "x",
    financialInflection: { available: true, state: { key: "CONFIRMED_INFLECTION", n: 2 }, quarterCount: 18,
      confirmedCoreCount: 2, metrics: {} } });
  t("engine: งบฟื้น + ไม่มี catalyst → FUNDAMENTAL_RECOVERY",
    withFin.qualification.state.key === "FUNDAMENTAL_RECOVERY", withFin.qualification.state.key);
  t("engine: แนบ qualification มาด้วย", !!withFin.qualification && !!withFin.qualification.dimensions);
  t("engine: เก็บสถานะจากระนาบราคาเดิมไว้เทียบได้", !!withFin.priceState);
  t("engine: state ใช้ค่าจาก qualification", withFin.state.key === withFin.qualification.state.key);
}

console.log("== เกณฑ์ที่ปรับ: STRONG_EARLY ต้องมีงบ STRONG หรือ CONFIRMED ==");
{
  // 1) ย่อลึก + C3 + งบ EARLY + ตลาด EARLY → EARLY_CATALYST
  t("1. ย่อลึก+C3+งบ EARLY+ตลาด EARLY → EARLY_CATALYST",
    st({ mat: 3, fin: 1, recog: 0 }) === "EARLY_CATALYST", st({ mat: 3, fin: 1, recog: 0 }));
  // 2) ย่อลึก + C3 + งบ STRONG + ตลาด EARLY → STRONG_EARLY_CATALYST
  t("2. ย่อลึก+C3+งบ STRONG+ตลาด EARLY → STRONG_EARLY_CATALYST",
    st({ mat: 3, fin: 3, recog: 0 }) === "STRONG_EARLY_CATALYST", st({ mat: 3, fin: 3, recog: 0 }));
  // 3) ย่อลึก + C4 + งบ STRONG + ตลาด BUILDING → STRONG_EARLY_CATALYST
  t("3. ย่อลึก+C4+งบ STRONG+ตลาด BUILDING → STRONG_EARLY_CATALYST",
    st({ mat: 4, fin: 3, recog: 1 }) === "STRONG_EARLY_CATALYST", st({ mat: 4, fin: 3, recog: 1 }));
  // 4) ย่อลึก + C4 + งบ CONFIRMED + ตลาด UNKNOWN → STRONG_EARLY_CATALYST
  t("4. ย่อลึก+C4+งบ CONFIRMED+ตลาด UNKNOWN → STRONG_EARLY_CATALYST",
    st({ mat: 4, fin: 2, recog: -1 }) === "STRONG_EARLY_CATALYST", st({ mat: 4, fin: 2, recog: -1 }));
  // 5) ย่อลึก + C4 + งบ STRONG + ตลาด CONFIRMED/OVERHEATED → ห้ามเป็น STRONG_EARLY
  t("5a. ตลาด CONFIRMED → ห้ามเป็น STRONG_EARLY",
    st({ mat: 4, fin: 3, recog: 2 }) !== "STRONG_EARLY_CATALYST", st({ mat: 4, fin: 3, recog: 2 }));
  t("5b. ตลาด OVERHEATED → ห้ามเป็น STRONG_EARLY",
    st({ mat: 4, fin: 3, recog: 3 }) !== "STRONG_EARLY_CATALYST", st({ mat: 4, fin: 3, recog: 3 }));
  t("5c. C3 + ตลาด OVERHEATED → EXIT_WATCH", st({ mat: 3, fin: 3, recog: 3 }) === "EXIT_WATCH");
  // 6) ย่อลึก + งบ STRONG แต่ไม่มี catalyst → FUNDAMENTAL_RECOVERY
  t("6. ย่อลึก+งบ STRONG+ไม่มี catalyst → FUNDAMENTAL_RECOVERY",
    st({ avail: "NO_CATALYST", fin: 3 }) === "FUNDAMENTAL_RECOVERY", st({ avail: "NO_CATALYST", fin: 3 }));
  t("6b. และไม่ใช่ STRONG_EARLY_CATALYST",
    st({ avail: "NO_CATALYST", fin: 3 }) !== "STRONG_EARLY_CATALYST");
  t("6c. งบ STRONG + ยังตรวจ catalyst ไม่ได้ → ก็ยังไม่ใช่ STRONG_EARLY",
    st({ fin: 3 }) !== "STRONG_EARLY_CATALYST", st({ fin: 3 }));
  // 7) value trap HIGH ทับทุกอย่าง แม้งบ STRONG
  t("7. trap HIGH + C4 + งบ STRONG → VALUE_TRAP_RISK",
    st({ mat: 4, fin: 3, trap: "HIGH", trapSignals: ["a"] }) === "VALUE_TRAP_RISK");
  t("7b. trap HIGH + C3 + งบ CONFIRMED → VALUE_TRAP_RISK",
    st({ mat: 3, fin: 2, trap: "HIGH", trapSignals: ["a", "b"] }) === "VALUE_TRAP_RISK");
  // 8) catalyst แต่ไม่ย่อลึก → CATALYST_EXISTS
  t("8. C3 + งบ STRONG + ไม่ย่อลึก → CATALYST_EXISTS",
    st({ mat: 3, fin: 3, ddRank: 0, pct: -10 }) === "CATALYST_EXISTS", st({ mat: 3, fin: 3, ddRank: 0, pct: -10 }));
  t("8b. C4 + งบ CONFIRMED + ไม่ย่อลึก → CATALYST_EXISTS",
    st({ mat: 4, fin: 2, ddRank: 0, pct: -12 }) === "CATALYST_EXISTS", st({ mat: 4, fin: 2, ddRank: 0, pct: -12 }));

  // ลำดับต้องคงเดิม: STRONG_EARLY เหนือ EARLY
  t("STRONG_EARLY ยังเหนือ EARLY_CATALYST",
    Q.QUAL.STRONG_EARLY_CATALYST.prio < Q.QUAL.EARLY_CATALYST.prio);
  t("จำนวนสถานะยังเป็น 14 ตัวเดิม", Object.keys(Q.QUAL).length === 14, Object.keys(Q.QUAL).length);
  t("ยังไม่มีคะแนนรวม", (function () {
    var r = Q.qualify(mk({ mat: 4, fin: 3 }));
    return !Object.prototype.hasOwnProperty.call(r, "score") &&
      !Object.prototype.hasOwnProperty.call(r, "totalScore");
  })());
  // กวาดตารางความจริงของเงื่อนไขงบ × การรับรู้ เมื่อย่อลึก + C3
  var truth = [];
  [-1, 0, 1, 2, 3].forEach(function (rg) {
    [undefined, 0, 1, 2, 3].forEach(function (f) {
      var o = { mat: 3, recog: rg };
      if (f !== undefined) o.fin = f;
      var k = st(o);
      var shouldStrong = (f === 2 || f === 3) && rg <= 1;
      if (shouldStrong && k !== "STRONG_EARLY_CATALYST") truth.push("ควรเป็น STRONG: recog" + rg + "/fin" + f + " → " + k);
      if (!shouldStrong && k === "STRONG_EARLY_CATALYST") truth.push("ไม่ควรเป็น STRONG: recog" + rg + "/fin" + f);
    });
  });
  t("กวาดตารางความจริง 25 ช่อง (งบ × การรับรู้) ตรงตามเกณฑ์ใหม่ทั้งหมด", truth.length === 0, truth.slice(0, 4));
}

console.log("== โครงสร้างสะอาด · ไม่มีคำซื้อขาย · ไม่ hard-code หุ้น ==");
{
  var src = fs.readFileSync(path.join(__dirname, "..", "public", "catalyst-qualification.js"), "utf8");
  t("ไม่มีคำสั่งซื้อขาย", !/\b(strong buy|strong sell|ควรซื้อ|ควรขาย|แนะนำซื้อ|แนะนำขาย)\b/i.test(src));
  t("deterministic (ไม่มี Math.random)", src.indexOf("Math.random") < 0);
  t("export ทั้ง window และ module", src.indexOf("window.CatalystQualification") > 0 && src.indexOf("module.exports") > 0);
  var code = src.split("\n").filter(function (l) {
    var tr = l.trim();
    return tr && tr.indexOf("//") !== 0 && tr.indexOf("*") !== 0;
  }).join("\n");
  t("ไม่ hard-code ticker ในโค้ดที่ทำงาน", !/["'](TRT|BTS|M)["']/.test(code), (code.match(/["'](TRT|BTS|M)["']/) || [])[0]);
  t("ไม่ดึงข้อมูลภายนอก (ชั้นรวมผลล้วน)", !/https?:\/\/|require\(["']https/.test(code));
  t("§11 ระบุว่าลำดับไม่ใช่คำแนะนำการลงทุน", src.indexOf("ไม่ใช่คำแนะนำ") >= 0);
}

console.log("");
console.log(pass + fail + " checks · " + pass + " passed · " + fail + " failed");
process.exit(fail ? 1 : 0);
