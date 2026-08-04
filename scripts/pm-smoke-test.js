// AI Portfolio Manager engine — smoke tests (Node, no browser)
// node scripts/pm-smoke-test.js
"use strict";
const PM = require("../public/portfolio-manager-engine.js");
const TE = require("../public/thesis-engine.js");
const TD = require("../public/thesis-data.js");

let pass = 0, fail = 0;
function t(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.error("  ✗ " + name); }
}

function mockO(over) {
  const base = {
    available: true, name: "Mock Co",
    thesis: { score: 86, status: {}, trend: { key: "stable" } },
    decision: { key: "accumulate", why: [] },
    dipClass: { key: "macro" },
    falling: { drawdownPct: -8 },
    valuationView: { level: "fair" },
    inputs: { megaTrend: { score: 88, gateOpen: true }, regime: { score: 55 }, rates: { score: 60, severe: false } },
    revenueQuality: { acceleration: "accelerating" },
    aiExecution: { score: 80 },
    stale: false
  };
  return Object.assign(base, over || {});
}
const TR = (price, sma, rsi, e12, e26) => ({ tech: { latestClose: price, sma200: sma, ema12: e12, ema26: e26 }, rsi: rsi });

// ---------- dipTiming ----------
{
  const d = PM.dipTiming(mockO(), TR(100, 100, 33)); // dd8 → +20, rsi33 → +8, dist0 → +10
  t("dipTiming: dd8/rsi33/atSMA = 78", d.score === 78);
  t("dipTiming: dist computed", d.dist === 0);
  const d2 = PM.dipTiming(mockO({ falling: { drawdownPct: -12 } }), TR(98, 100, 28));
  t("dipTiming: deep dip 40+20+10+15+10=95", d2.score === 95);
  const d3 = PM.dipTiming(mockO({ falling: null }), { tech: {}, rsi: null });
  t("dipTiming: headless base 40", d3.score === 40 && d3.dd === null && d3.dist === null);
}

// ---------- accumulationScore (renormalize) ----------
{
  const a = PM.accumulationScore(mockO({ inputs: {}, valuationView: null }), { tech: {}, rsi: null });
  // เหลือ thesis(86×50) + timing(dd8 → 60 ×10) จากน้ำหนัก 60
  t("accScore: renormalized (thesis+timing only)", a.score === Math.round((86 * 50 + 60 * 10) / 60));
  const full = PM.accumulationScore(mockO(), TR(100, 100, 33));
  t("accScore: full parts = 4 (ตัด Macro/Mega/Rates ออก)", full.parts.length === 4 && full.parts.every(p => p.weight > 0));
  t("accScore: weights = 50/30/10/10", full.parts.map(p => p.weight).join(",") === "50,30,10,10");
  t("accScore: ไม่มี part mega/rates/macro", !full.parts.some(p => p.key === "mega" || p.key === "rates" || p.key === "macro"));
  t("accScore: growthPrice weight = 30", (full.parts.find(p => p.key === "growthPrice") || {}).weight === 30);
  t("accScore: thesis weight = 50", (full.parts.find(p => p.key === "thesis") || {}).weight === 50);
}

// ---------- growthPriceScore (§6 Business Growth vs Stock Price) ----------
{
  const H = (key, gapPp) => ({ available: true, verdict: { key: key, label: key }, metrics: { gapPp: gapPp } });
  t("growth: business-ahead → 90", PM.growthPriceScore(H("business-ahead", -8)) === 90);
  t("growth: aligned → 74", PM.growthPriceScore(H("aligned", 1)) === 74);
  t("growth: significantly-ahead → 38", PM.growthPriceScore(H("significantly-ahead", 20)) === 38);
  t("growth: deteriorating → 20", PM.growthPriceScore(H("deteriorating", null)) === 20);
  t("growth: insufficient → null (renormalize)", PM.growthPriceScore(H("insufficient", null)) === null);
  t("growth: no history → null", PM.growthPriceScore(null) === null && PM.growthPriceScore({ available: false }) === null);
  // เข้า accumulationScore เป็น factor value จริง
  const withH = PM.accumulationScore(mockO(), TR(100, 100, 33), H("business-ahead", -8));
  const gp = withH.parts.find(p => p.key === "growthPrice");
  t("growth: accScore ใช้ค่าจริง (business-ahead=90)", gp.value === 90);
  const noH = PM.accumulationScore(mockO(), TR(100, 100, 33), null);
  t("growth: ไม่มี history → factor null (renormalize ทิ้ง)", noH.parts.find(p => p.key === "growthPrice").value === null);
  // targetFor: business-ahead ×1.1 ดันเป้าขึ้น · significantly-ahead ×0.9 กดลง
  const tUp = PM.targetFor(PM.TIER_DEFS.A, mockO(), "bullish", H("business-ahead", -8));
  const tBase = PM.targetFor(PM.TIER_DEFS.A, mockO(), "bullish", null);
  const tDown = PM.targetFor(PM.TIER_DEFS.A, mockO(), "bullish", H("significantly-ahead", 20));
  t("growth: targetFor business-ahead ดันเป้า > base", tUp.raw > tBase.raw && tDown.raw < tBase.raw);
  // whyChecklist: มีบรรทัด Business Growth + ไม่มีคำ "ดอกเบี้ย"
  const why = PM.whyChecklist(mockO(), PM.dipTiming(mockO(), TR(100, 100, 33)), "fair", H("business-ahead", -8));
  t("growth: whyChecklist มีบรรทัด Business Growth", why.some(w => /Business Growth vs ราคา/.test(w.txt)));
  t("growth: whyChecklist ไม่มีคำ ดอกเบี้ย/Macro", !why.some(w => /ดอกเบี้ย|Macro/.test(w.txt)));
}

// ---------- growthSummary (เฉลี่ย 2/3/4 ปีล่าสุด) ----------
{
  const H = (key) => ({ available: true, verdict: { key: key, label: key }, metrics: { gapPp: 0 } });
  // 3 windows: business-ahead(90), aligned(74), slightly-ahead(55) → เฉลี่ย 73
  const g = PM.growthSummary([H("business-ahead"), H("aligned"), H("slightly-ahead")], [2, 3, 4]);
  t("growthSummary: เฉลี่ย 3 window = 73", g.score === Math.round((90 + 74 + 55) / 3) && g.windows.length === 3);
  t("growthSummary: label จากคะแนนเฉลี่ย", g.label === PM.growthLabelFromScore(g.score));
  // บาง window ไม่มีข้อมูล → เฉลี่ยเฉพาะที่มี
  const g2 = PM.growthSummary([H("business-ahead"), null, { available: false }], [2, 3, 4]);
  t("growthSummary: ข้าม window ที่ไม่มี → เฉลี่ยเฉพาะที่มี (90)", g2.score === 90 && g2.windows.length === 1);
  // ทุก window ไม่มี → null (renormalize)
  const g0 = PM.growthSummary([null, null, null], [2, 3, 4]);
  t("growthSummary: ทุก window ว่าง → score null", g0.score === null);
  // เข้า accumulationScore เป็น factor value
  const sc = PM.accumulationScore(mockO(), TR(100, 100, 33), g);
  t("growthSummary: accScore ใช้ค่าเฉลี่ย 73", (sc.parts.find(p => p.key === "growthPrice") || {}).value === 73);
  const scNull = PM.accumulationScore(mockO(), TR(100, 100, 33), g0);
  t("growthSummary: null → factor null (renormalize)", (scNull.parts.find(p => p.key === "growthPrice") || {}).value === null);
}

// ---------- zoneOf ----------
{
  const tier = PM.TIER_DEFS.A;
  const zE = PM.zoneOf(mockO({ thesis: { score: 65, trend: { key: "stable" } } }), PM.accumulationScore(mockO({ thesis: { score: 65, trend: { key: "stable" } } }), TR(100, 100, 50)), TR(100, 100, 50), 5, tier);
  t("zone: thesis<70 → E", zE.zone.key === "E");
  const oF = mockO({ dipClass: { key: "fundamental" } });
  t("zone: fundamental dip → E", PM.zoneOf(oF, PM.accumulationScore(oF, TR(100, 100, 50)), TR(100, 100, 50), 5, tier).zone.key === "E");
  const oStance = mockO();
  t("zone: stance Bearish → D (Rule 1)", PM.zoneOf(oStance, PM.accumulationScore(oStance, TR(100, 100, 50)), TR(100, 100, 50), 5, tier, "bearish").zone.key === "D");
  const oB = mockO();
  t("zone: at tier max → D", PM.zoneOf(oB, PM.accumulationScore(oB, TR(100, 100, 50)), TR(100, 100, 50), 20, tier).zone.key === "D");
  const oA = mockO({ thesis: { score: 90, trend: { key: "stable" } }, falling: { drawdownPct: -12 }, valuationView: { level: "cheap" }, inputs: { megaTrend: { score: 90, gateOpen: true }, regime: { score: 70 }, rates: { score: 75, severe: false } } });
  const trA = TR(98, 100, 28);
  const accA = PM.accumulationScore(oA, trA);
  t("zone A fixture: score >= 80", accA.score >= 80);
  t("zone: rare opportunity → A", PM.zoneOf(oA, accA, trA, 5, tier).zone.key === "A");
  // rsi45 → ไม่ deep-dip (กัน zone A) เพื่อทดสอบ B โดยเฉพาะ
  const accB = PM.accumulationScore(oB, TR(100, 100, 45));
  const zB = PM.zoneOf(oB, accB, TR(100, 100, 45), 5, tier);
  t("zone: strong default fixture → B", accB.score >= 72 && zB.zone.key === "B");
  const oD = mockO({ thesis: { score: 71, trend: { key: "stable" } }, falling: { drawdownPct: -1 }, valuationView: { level: "expensive" }, inputs: { megaTrend: { score: 72 }, regime: { score: 45 }, rates: { score: 45, severe: false } } });
  const accD = PM.accumulationScore(oD, TR(110, 100, 60));
  t("zone: weak mix → C/D (score<72)", accD.score < 72);
}

// ---------- entryLadder ----------
{
  const o = mockO();
  const lad = PM.entryLadder("B", o, TR(99, 100, 33));
  t("ladder: 4 entries", lad.length === 4);
  t("ladder: pct 50/20/15/15 = 100", lad.reduce((s, e) => s + e.pct, 0) === 100 && lad[0].pct === 50);
  t("ladder: E1 triggered (B + th86>=85 + Bullish + notRiskOff)", lad[0].triggered === true);
  const ladBear = PM.entryLadder("B", o, TR(99, 100, 33), { stance: "bearish" });
  t("ladder: E1 ปิดเมื่อ stance Bearish", ladBear[0].triggered === false && /Bearish/.test(ladBear[0].why));
  t("ladder: E2 triggered (dist -1%)", lad[1].triggered === true);
  t("ladder: E3 triggered (rsi 33)", lad[2].triggered === true);
  t("ladder: E4 not (zone B)", lad[3].triggered === false);
  const ladRiskOff = PM.entryLadder("B", mockO({ inputs: { megaTrend: { score: 88 }, regime: { score: 30 }, rates: { score: 40, severe: false } } }), TR(99, 100, 33));
  t("ladder: E1 blocked เมื่อ Risk-Off", ladRiskOff[0].triggered === false);
  const ladA = PM.entryLadder("A", o, TR(99, 100, 42, 105, 100)); // emaBull + rsi 42
  t("ladder: E4 triggered (A + EMA bull + rsi<50)", ladA[3].triggered === true);
  const ladE = PM.entryLadder("E", o, TR(99, 100, 20));
  t("ladder: zone E ⇒ ทุก entry blocked", ladE.every(e => !e.triggered && e.blocked));
  const ladFar = PM.entryLadder("B", o, TR(120, 100, 55));
  t("ladder: ราคาเหนือ SMA200 20% ⇒ E2/E3 ไม่ trigger", !ladFar[1].triggered && !ladFar[2].triggered);
}

// ---------- targetFor ----------
{
  const tierA = PM.TIER_DEFS.A;
  const weak = PM.targetFor(tierA, mockO({ thesis: { score: 65, trend: { key: "stable" } } }));
  t("target: thesis<70 → tier min", weak.target === tierA.min);
  const std = PM.targetFor(tierA, mockO()); // th86 ×1.4 · Bullish ×1.1 · regime55 ×1.0 = 1.54 → 15.4 → 15.5
  t("target: th86/Bullish/regime55/fair → 15.5%", std.target === 15.5);
  const bear = PM.targetFor(tierA, mockO(), "bearish"); // 1.4×0.8 = 1.12 → 11.2 → 11
  t("target: stance Bearish กดเป้าลง (11%)", bear.target === 11);
  const capped = PM.targetFor({ key: "X", label: "X", max: 20, target: 18, min: 5 },
    mockO({ thesis: { score: 90, trend: { key: "stable" } }, valuationView: { level: "cheap" }, inputs: { megaTrend: { score: 90 }, regime: { score: 70 }, rates: { score: 75, severe: false } } }));
  t("target: clamp ที่เพดาน tier", capped.target === 20);
  const floor = PM.targetFor(PM.TIER_DEFS.B, mockO({ thesis: { score: 70, trend: { key: "stable" } }, valuationView: { level: "expensive" }, inputs: { regime: { score: 30 }, rates: { score: 30, severe: true } } }), "bearish");
  t("target: กดลงไม่ทะลุ tier min", floor.target >= PM.TIER_DEFS.B.min);
  t("target: มี why ทุกตัวคูณ", std.why.length >= 3);
}

// ---------- evaluate (base) + applyTarget (finalize) ----------
{
  const mockTE = { compute: () => mockO() };
  const row = PM.evaluate({ ticker: "MOCK", held: true, weightPct: 8, avgCost: 80, tierKey: "A", entryDone: { 1: true } },
    { technicalSignals: { MOCK: { latestClose: 99, sma200: 100 } }, rsiSignals: { MOCK: { rsi14: 33 } } }, mockTE, PM.TIER_DEFS, {}, "bullish");
  t("evaluate: covered + zone A (Thesis 50 + deep-dip rsi33)", row.covered && row.zone.key === "A");
  t("evaluate: rawConviction/convictionTarget ออกมา", row.convictionTarget === 15.5 && row.rawConviction > 0);
  t("evaluate: ยังไม่ finalize target (ต้อง applyTarget)", row.target === undefined && row.gap === undefined);
  t("evaluate: ladder merge completed", row.ladder[0].completed === true && row.ladder[1].completed === false);
  t("evaluate: G/L = +23.75%", Math.abs(row.glPct - 23.75) < 0.01);
  // applyTarget: กำหนดเป้า 16% → gap 8 · E1 done → E2(20%×16=3.2)+E3(15%×16=2.4)=5.6
  PM.applyTarget(row, 16, false);
  t("applyTarget: target 16 gap 8", row.target === 16 && row.gap === 8);
  t("applyTarget: pendingPp = 5.6 (E1 completed)", row.pendingPp === 5.6);
  t("applyTarget: action = Increase Position", row.action.key === "increase");
  const rowFull = PM.evaluate({ ticker: "MOCK", held: true, weightPct: 16.5, tierKey: "A" },
    { technicalSignals: { MOCK: { latestClose: 99, sma200: 100 } }, rsiSignals: { MOCK: { rsi14: 33 } } }, mockTE, PM.TIER_DEFS, {}, "bullish");
  PM.applyTarget(rowFull, 16, false);
  t("applyTarget: current > target → gap 0 + over", rowFull.gap === 0 && rowFull.over === 0.5 && rowFull.action.key === "maintain");
  const uncov = PM.evaluate({ ticker: "XX", held: true, tierKey: "C" }, {}, { compute: () => ({ available: false }) }, PM.TIER_DEFS);
  t("evaluate: uncovered → covered:false", uncov.covered === false);
}

// ---------- allocationPolicy (QQQM index + satellites) ----------
{
  const mk = (tk, held, raw, tierKey, w) => ({ covered: true, held: held, ticker: tk, rawConviction: raw, tier: PM.TIER_DEFS[tierKey], thesisScore: 80, weightPct: w });
  const rows = [
    mk("QQQM", true, 6, "B", 40),
    mk("NVDA", true, 22, "A", 8),
    mk("META", true, 14, "A", 5),
    mk("AMD", true, 4, "C", 2)
  ];
  // NC = no-cap (maxSinglePct 100) เพื่อทดสอบการแบ่งตามสัดส่วนล้วน (แยกจากเพดาน)
  const NC = { indexTicker: "QQQM", indexPct: 50, splitMethod: "conviction", maxSinglePct: 100 };
  const pol = PM.allocationPolicy(rows, NC);
  t("policy: QQQM = 50% (index core)", pol.targets.QQQM === 50);
  t("policy: satellitePool = 50", pol.satellitePool === 50 && pol.satelliteCount === 3);
  const satSum = pol.targets.NVDA + pol.targets.META + pol.targets.AMD;
  t("policy: satellites รวม ≈ 50", Math.abs(satSum - 50) < 0.5);
  t("policy: NVDA > META > AMD (conviction)", pol.targets.NVDA > pol.targets.META && pol.targets.META > pol.targets.AMD);
  t("policy: total ≈ 100", Math.abs(pol.targets.QQQM + satSum - 100) < 0.5);
  const eq = PM.allocationPolicy(rows, { indexTicker: "QQQM", indexPct: 50, splitMethod: "equal", maxSinglePct: 100 });
  t("policy equal: แบ่งเท่ากัน 50/3 ≈ 16.7", Math.abs(eq.targets.NVDA - 16.7) < 0.2 && eq.targets.NVDA === eq.targets.META);
  t("policy: satellites รวมเป๊ะ = satellitePool (largest-remainder)", satSum === 50);
  const pol60 = PM.allocationPolicy(rows, { indexTicker: "QQQM", indexPct: 60, maxSinglePct: 100 });
  t("policy: index % ปรับได้ (60/40)", pol60.targets.QQQM === 60 && pol60.satellitePool === 40);
  // index ยังไม่ถือ → ยัง anchor 50%
  const noIdx = PM.allocationPolicy([mk("NVDA", true, 22, "A", 8)], { indexTicker: "QQQM", indexPct: 50, maxSinglePct: 100 });
  t("policy: index ยังไม่ถือ ก็ตั้งเป้า 50%", noIdx.targets.QQQM === 50 && noIdx.unallocated === 0);
  // 0 satellites → satellitePool เป็น unallocated (ไม่หาย, ไม่ยัดใส่ index)
  const empty = PM.allocationPolicy([], { indexTicker: "QQQM", indexPct: 50 });
  t("policy: 0 satellites → unallocated = 50 (index ยัง 50)", empty.targets.QQQM === 50 && empty.unallocated === 50 && empty.satelliteCount === 0);
  // uncovered satellite (rawConviction undefined) → fallback = tier.target
  const uncov = PM.allocationPolicy([mk("PLTR", true, undefined, "C", 3), mk("NVDA", true, 22, "A", 8)], { indexTicker: "QQQM", indexPct: 50, maxSinglePct: 100 });
  t("policy: uncovered satellite ได้ target (fallback tier)", uncov.targets.PLTR > 0 && Math.abs(uncov.targets.PLTR + uncov.targets.NVDA - 50) < 0.01);
}

// ---------- เพดานหุ้นรายตัว maxSinglePct (default 10%) ----------
{
  const mkS = (tk, raw) => ({ covered: true, held: true, ticker: tk, rawConviction: raw, tier: PM.TIER_DEFS.A, thesisScore: 80, weightPct: 0 });
  const sum = (p, ks) => ks.reduce((s, k) => s + (p.targets[k] || 0), 0);
  // 2 sats high conviction: ไม่มี cap → 30/20 · cap 10 → 10/10 + unalloc 30
  const cap = PM.allocationPolicy([mkS("AA", 30), mkS("BB", 20)], { indexTicker: "QQQM", indexPct: 50, maxSinglePct: 10 });
  t("cap: แต่ละตัว ≤ 10% (10/10)", cap.targets.AA === 10 && cap.targets.BB === 10);
  t("cap: ส่วนเกิน = unallocated (30) · รวม 100 เป๊ะ", cap.unallocated === 30 && Math.abs(cap.targets.QQQM + cap.targets.AA + cap.targets.BB + cap.unallocated - 100) < 0.01);
  t("cap: policy.maxSinglePct = 10 (default)", PM.allocationPolicy([mkS("AA", 30)], { indexTicker: "QQQM", indexPct: 50 }).maxSinglePct === 10);
  // water-fill: ตัวเด่นชนเพดาน ส่วนเกินไหลไปตัวอื่น (5 ตัว pool 50 → 10 ทุกตัว, ไม่มีตัวไหน >10)
  const wf = PM.allocationPolicy([mkS("BIG", 100), mkS("B2", 5), mkS("C2", 5), mkS("D2", 5), mkS("E2", 5)], { indexTicker: "QQQM", indexPct: 50, maxSinglePct: 10 });
  const wks = ["BIG", "B2", "C2", "D2", "E2"];
  t("cap: water-fill ไม่มีตัวไหน >10 · เต็มโควตา 50", wks.every((k) => wf.targets[k] <= 10.001) && Math.abs(sum(wf, wks) - 50) < 0.1 && wf.unallocated === 0);
  t("cap: ตัวเด่น (BIG) ถูก cap ไม่กินหมด", wf.targets.BIG === 10);
  // เพดานปรับได้
  const cap15 = PM.allocationPolicy([mkS("AA", 30), mkS("BB", 20)], { indexTicker: "QQQM", indexPct: 50, maxSinglePct: 15 });
  t("cap: ปรับเพดานเป็น 15 → ตัวใหญ่ได้ถึง 15", cap15.targets.AA === 15);
}

// ---------- deploymentPlan ----------
{
  const mkRow = (over) => Object.assign({
    covered: true, held: true, ticker: "R1", zone: PM.ZONES.B, accScore: 80, pendingPp: 5.6, target: 16,
    ladder: [{ n: 1, pct: 50, triggered: true, completed: false }], megaScore: 88, thesisScore: 86
  }, over || {});
  const d = PM.deploymentPlan([mkRow()], 20, { regimeScore: 55, ratesSevere: false });
  t("deploy: reserve พื้นฐาน 25", d.reserve === 25);
  t("deploy: 5.6pp ของพอร์ต บนเงินสด 20% → 28% ของเงินสด", d.items.length === 1 && d.items[0].pctOfCash === 28);
  t("deploy: cash reserve final = 72", d.cashReserveFinal === 72);
  const dRO = PM.deploymentPlan([mkRow()], 20, { regimeScore: 30, ratesSevere: false });
  t("deploy Rule3: risk-off → reserve 50 + ลดครึ่ง (28→14)", dRO.reserve === 50 && dRO.items[0].pctOfCash === 14 && dRO.halved);
  const dR4 = PM.deploymentPlan([mkRow()], 20, { regimeScore: 55, ratesSevere: true });
  t("deploy Rule4: rates alert → reserve 40", dR4.reserve === 40);
  const big = PM.deploymentPlan([mkRow({ pendingPp: 30, ticker: "R1" }), mkRow({ pendingPp: 30, ticker: "R2", zone: PM.ZONES.A })], 20, { regimeScore: 55 });
  const sum = big.items.reduce((s, i) => s + i.pctOfCash, 0);
  t("deploy: scale ไม่เกิน deployable 75", big.scaled && Math.abs(sum - 75) < 0.3);
  t("deploy: Zone A มาก่อน B", big.items[0].ticker === "R2");
  const dE = PM.deploymentPlan([mkRow({ zone: PM.ZONES.E, pendingPp: 5 }), mkRow({ zone: PM.ZONES.D, pendingPp: 5, ticker: "R3" })], 20, {});
  t("deploy: Zone D/E ไม่ถูกวางเงิน", dE.items.length === 0 && dE.cashReserveFinal === 100);
}

// ---------- riskRules ----------
{
  const rows = [
    { covered: true, ticker: "OK", thesisScore: 86 },
    { covered: true, ticker: "WK", thesisScore: 65 }
  ];
  const rules = PM.riskRules(rows, { regimeScore: 30, ratesSevere: true, megaStance: "bearish" });
  t("risk: 4 กฎ", rules.length === 4);
  t("risk R1 active (stance Bearish — ผู้ใช้ตั้งเอง)", rules[0].active && /Bearish/.test(rules[0].detail));
  t("risk R2 active (WK thesis 65)", rules[1].active && /WK/.test(rules[1].detail));
  t("risk R3 active (regime 30)", rules[2].active);
  t("risk R4 active (rates severe)", rules[3].active);
  const calm = PM.riskRules([{ covered: true, ticker: "OK", thesisScore: 86 }], { regimeScore: 60, ratesSevere: false, megaStance: "bullish" });
  t("risk: ปกติ (Bullish) → ไม่มีกฎ active", calm.every(r => !r.active));
}

// ---------- overview ----------
{
  const mk = (tk, w, th, zoneKey, pending) => ({
    covered: true, held: true, ticker: tk, weightPct: w, thesisScore: th, target: 10,
    zone: PM.ZONES[zoneKey], pendingPp: pending
  });
  const ov = PM.overview([mk("AA", 10, 86, "B", 4), mk("BB", 6, 78, "C", 2)], 30);
  t("overview: weighted score", ov.score === Math.round((10 * 86 + 6 * 78) / 16));
  t("overview: recommendation = Increase (Zone B trigger)", ov.recommendation.key === "increase");
  const ovWait = PM.overview([mk("AA", 10, 86, "D", 0), mk("BB", 6, 80, "D", 0)], 30, { megaStance: "bearish" });
  t("overview: stance Bearish → Wait", ovWait.recommendation.key === "wait");
  const ovRev = PM.overview([mk("AA", 10, 60, "E", 0), mk("BB", 6, 55, "E", 0)], 30);
  t("overview: thesis เฉลี่ยต่ำ → Review Thesis", ovRev.recommendation.key === "review");
  const ovM = PM.overview([mk("AA", 10, 86, "D", 0), mk("BB", 6, 80, "B", 0)], 30);
  t("overview: ไม่มี pending → Maintain", ovM.recommendation.key === "maintain");
}

// ---------- quarterlyBuckets ----------
{
  const snap = { portfolioStatus: { data: { currentQuarter: "2026-Q3", quarters: { "2026-Q3": { assets: [
    { type: "foreign-stock", manualValue: 700000 }, { type: "foreign-stock", snapshotValue: 300000 },
    { type: "thai-stock", manualValue: 200000 }
  ] } } } } };
  const b = PM.quarterlyBuckets(snap);
  t("buckets: foreign gross 1,000,000", b["foreign-stock"] === 1000000);
  t("buckets: thai 200,000", b["thai-stock"] === 200000);
  t("buckets: headless → {}", Object.keys(PM.quarterlyBuckets(null)).length === 0);
}

// ---------- ห้ามมีคำ Buy/Sell ----------
{
  const dump = JSON.stringify([PM.ZONES, PM.ACTIONS, PM.TIER_DEFS]) + JSON.stringify(
    PM.compute({}, { TE: { compute: () => mockO() }, positions: [{ ticker: "MOCK", held: true, weightPct: 8, tierKey: "A" }], cashPct: 20 })
  );
  t("ไม่มีคำ Buy/Sell ในผลลัพธ์", !/\b(buy|sell)\b/i.test(dump) && !/ซื้อ|ขาย/.test(dump));
}

// ---------- helper: ผลรวมเป้าใน allocationRows (target ที่ไม่ null) + unallocated = 100 ----------
function allocSum(out) {
  const rowSum = out.allocationRows.reduce((s, r) => s + (r.target || 0), 0);
  return Math.round((rowSum + (out.policy.unallocated || 0)) * 10) / 10;
}

// ---------- integration: ThesisEngine จริง (headless) ----------
{
  const positions = [
    { ticker: "QQQM", held: true, weightPct: 30, tierKey: "B" },
    { ticker: "NVDA", held: true, weightPct: 8, tierKey: "A" },
    { ticker: "HOOD", held: true, weightPct: 2, tierKey: "C" },
    { ticker: "PLTR", held: true, weightPct: 1, tierKey: "C" } // ถือธงแดงแต่ไม่มี thesis (uncovered)
  ];
  const out = PM.compute({}, { TE: TE, positions: positions, cashPct: 25, teOpts: { data: TD }, indexTicker: "QQQM", indexPct: 50 });
  t("integration: available", out.available === true);
  const qqqm = out.rows[0], nvda = out.rows[1], hood = out.rows[2], pltr = out.rows[3];
  t("integration: NVDA covered + zone A-E", nvda.covered && "ABCDE".includes(nvda.zone.key));
  t("integration: NVDA ladder 4 + why checklist", nvda.ladder.length === 4 && nvda.why.length > 0);
  t("integration: QQQM = index core target 50%", qqqm.isIndex === true && qqqm.target === 50);
  t("integration: NVDA เป็น satellite (target 0-50, ไม่ผูก tier max)", nvda.target > 0 && nvda.target <= 50 && !nvda.isIndex);
  t("integration: HOOD (thesis<70) → Zone E + Review", hood.zone.key === "E" && hood.action.key === "review");
  t("integration: PLTR (held uncovered) อยู่ใน allocationRows + มี target", pltr.covered === false && out.allocationRows.indexOf(pltr) !== -1 && pltr.target > 0);
  t("integration: allocationRows = index + ธงแดงทุกตัว (รวม uncovered) = 4", out.allocationRows.length === 4);
  t("integration: ★ เป้ารวม = 100% เป๊ะ (invariant)", allocSum(out) === 100);
  t("integration: policy.indexTicker/indexPct", out.policy.indexTicker === "QQQM" && out.policy.indexPct === 50);
  t("integration: overview + deployment + risk ครบ", !!out.overview && !!out.deployment && out.risk.length === 4);
  t("integration: overview recommendation เป็น 1 ใน 4", ["increase", "maintain", "wait", "review"].includes(out.overview.recommendation.key));
  t("integration: default stance = bullish", out.megaStance === "bullish");
}

// ---------- invariant: เป้ารวม 100% ทุกสถานการณ์ (บั๊กที่ review เจอ) ----------
{
  const P = (t, held, w, tier) => ({ ticker: t, held: held, weightPct: w, tierKey: tier });
  // 1) มี candidate ที่ยังไม่ถือปนมา (หน้าจริงยัด candidates เสมอ) → ต้องไม่ดูดโควตา
  const withCand = PM.compute({}, { TE: TE, teOpts: { data: TD }, indexTicker: "QQQM", indexPct: 50, cashPct: 20,
    positions: [P("QQQM", true, 30, "B"), P("NVDA", true, 40, "A"), P("META", true, 30, "A"),
      P("AMZN", false, 0, "A"), P("MSFT", false, 0, "B"), P("GOOG", false, 0, "A")] });
  t("invariant: candidate ไม่ถือ ไม่ดูดโควตา → รวม 100", allocSum(withCand) === 100);
  t("invariant: candidate ไม่อยู่ใน allocationRows", withCand.allocationRows.every(r => r.held || r.isIndex));
  // 2) ถือ index อย่างเดียว (0 satellites) → index 50 + unallocated 50 = 100
  const idxOnly = PM.compute({}, { TE: TE, teOpts: { data: TD }, indexTicker: "QQQM", indexPct: 50, cashPct: 20,
    positions: [P("QQQM", true, 100, "B")] });
  t("invariant: index-only → รวม 100 (unallocated 50)", allocSum(idxOnly) === 100 && idxOnly.policy.unallocated === 50);
  // 3) index ยังไม่ถือ (uncovered index) → ยังมี index row + รวม 100
  const uncovIdx = PM.compute({}, { TE: TE, teOpts: { data: TD }, indexTicker: "VOO", indexPct: 50, cashPct: 20,
    positions: [P("NVDA", true, 60, "A"), P("META", true, 40, "A")] });
  t("invariant: uncovered index (VOO) → มี index row + รวม 100", uncovIdx.indexRow && uncovIdx.indexRow.target === 50 && allocSum(uncovIdx) === 100);
  // 4) weightPct=null (ยังไม่ใส่ ฿) → Alignment ต้องเป็น 'unknown' ไม่ใช่ 'ต้องปรับ 100pp'
  const noVal = PM.compute({}, { TE: TE, teOpts: { data: TD }, indexTicker: "QQQM", indexPct: 50, cashPct: null,
    positions: [P("QQQM", true, null, "B"), P("NVDA", true, null, "A"), P("META", true, null, "A")] });
  t("invariant: weightPct=null → Alignment unknown (ไม่ใช่ off/100pp)", noVal.overview.alignment.key === "unknown");
  t("invariant: weightPct=null คงเป็น null (ไม่ถูก coerce เป็น 0)", noVal.rows[0].weightPct === null);
  // 5) Bearish ยังทำงาน
  const outBear = PM.compute({}, { TE: TE, positions: [P("NVDA", true, 8, "A")], cashPct: 25, teOpts: { data: TD }, megaStance: "bearish" });
  t("invariant: Bearish → NVDA Zone D + Overall Wait + Rule 1 active",
    outBear.rows[0].zone.key === "D" && outBear.overview.recommendation.key === "wait" && outBear.risk[0].active);
}

console.log(pass + fail + " checks · " + pass + " passed" + (fail ? " · " + fail + " FAILED" : ""));
process.exit(fail ? 1 : 0);
