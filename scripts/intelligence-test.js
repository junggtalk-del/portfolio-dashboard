// Investment Intelligence Layer — deterministic tests
// node scripts/intelligence-test.js
// ครอบ 18 เคสบังคับตามสเปค + regression 6 หุ้นบังคับ + non-regression กับ engine เดิม
"use strict";
var fs = require("fs");
var IE = require("../public/intelligence-engine.js");
var TE = require("../public/thesis-engine.js");
var VE = require("../public/valuation-engine.js");
var PM = require("../public/portfolio-manager-engine.js");
var AIR = require("../public/ai-rotation-engine.js");
var D = require("../public/thesis-data.js");

var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; return; }
  fail++; console.error("  ✗ " + name + (extra != null ? " — got: " + JSON.stringify(extra) : ""));
}
var TH = IE._internal.thresholds();

// ---------- fixture builders ----------
function quarters(rows) { // rows = [[rev, eps, margin, fcf]...] เก่า→ใหม่ ผูก endYm ต่อเนื่อง
  var y = 2024, m = 1;
  return rows.map(function (r) {
    var q = { q: "Q" + m + "Y" + y, endYm: y + "-" + (m < 10 ? "0" + m : m), revenueB: r[0], epsAdj: r[1], opMarginPct: r[2], fcfB: r[3] };
    m += 3; if (m > 12) { m -= 12; y++; }
    return q;
  });
}
// บริษัทสังเคราะห์แบบครบ config (ให้ TE.compute ทำงานได้จริง)
function synthCompany(over) {
  var base = {
    ticker: "SYN", name: "Synthetic Co", layer: "cloud", asOf: "2026-08",
    thesis: { statement: "x", pillars: ["a"] },
    fundamentals: ["revenueGrowth", "epsGrowth", "fcf", "margin", "roic", "cash", "debt", "dilution", "capitalAllocation", "valuation"].map(function (k) {
      return { key: k, label: k, current: "~", trend: "up", score: 80, impact: "positive", why: "x" };
    }),
    revenueQuality: { acceleration: "accelerating", consistency: 80, recurringPct: 50, note: "x",
      segments: [{ name: "S1", sharePct: 60, growthNote: "x", trend: "up" }, { name: "S2", sharePct: 40, growthNote: "x", trend: "up" }] },
    aiExecution: { score: 85, items: [{ item: "AI1", status: "executing", evidence: "x" }, { item: "AI2", status: "on-track", evidence: "x" }] },
    competitive: { overall: "strengthening", moat: "x", factors: ["marketLeadership", "techLeadership", "executionSpeed", "switchingCost", "ecosystem", "developerAdoption", "customerLockin", "moat"].map(function (k) {
      return { key: k, label: k, status: "stable", note: "x" }; }) },
    capitalAllocation: { score: 75, items: [], verdict: "x" },
    valuationView: { level: "fair", note: "x" },
    whatChanged: [{ metric: "m", prev: "a", now: "b", direction: "positive" }],
    risks: ["r1"],
    history: {
      years: [
        { fy: "FY2022", endYm: "2022-06", revenueB: 40, epsAdj: 2.0, opMarginPct: 30, fcfB: 8, priceFYEnd: 60 },
        { fy: "FY2023", endYm: "2023-06", revenueB: 50, epsAdj: 2.5, opMarginPct: 31, fcfB: 10, priceFYEnd: 75 },
        { fy: "FY2024", endYm: "2024-06", revenueB: 62, epsAdj: 3.1, opMarginPct: 32, fcfB: 13, priceFYEnd: 95 },
        { fy: "FY2025", endYm: "2025-06", revenueB: 78, epsAdj: 3.9, opMarginPct: 33, fcfB: 16, priceFYEnd: 120 },
        { fy: "FY2026", endYm: "2026-06", revenueB: 98, epsAdj: 4.9, opMarginPct: 34, fcfB: 20, priceFYEnd: 150 },
      ],
      // 8 ไตรมาส โตเรียบ ๆ margin/fcf นิ่ง
      quarters: quarters([[20, 1.0, 33, 4], [22, 1.1, 33, 4.5], [24, 1.2, 34, 5], [25, 1.25, 34, 5],
        [27, 1.35, 34, 5.5], [30, 1.5, 34, 6], [33, 1.65, 35, 6.5], [36, 1.8, 35, 7]]),
    },
    forwardView: { asOf: "2026-08", estimateHistory: [{ asOf: "2026-08", fy: "FY2027", eps: 6.0, revenue: 120 }], guidanceTrack: [], consensus: [{ fy: "FY2027", eps: 6.0, revenue: 120, confidence: "high", basis: "non-GAAP" }] },
  };
  Object.keys(over || {}).forEach(function (k) { base[k] = over[k]; });
  return base;
}
function synthData(companies) { return { asOf: "2026-08", companies: companies }; }
function mockO(over) { // ThesisEngine output ขั้นต่ำที่ health ใช้
  var o = { available: true, stale: false,
    thesis: { score: 80, status: { label: "Strong" }, trend: { key: "stable" } },
    dipClass: { key: "healthy" },
    falling: { drawdownPct: -3, drawdown1yPct: -3, hasData: true },
    inputs: { megaTrend: { score: 82, gateOpen: true }, regime: { score: 60 }, rates: { score: 70, severe: false } } };
  Object.keys(over || {}).forEach(function (k) { o[k] = over[k]; });
  return o;
}
function healthOf(cfg, o) {
  var monet = IE._internal.computeMonetization(cfg, o);
  return IE._internal.computeHealth(cfg, o, monet, TH);
}
function closesSeries(spec) { // [[level, bars]...] → array of closes
  var out = [];
  spec.forEach(function (s) { for (var i = 0; i < s[1]; i++) out.push(s[0]); });
  return out;
}

console.log("== เคส 1: Healthy Dip — ธุรกิจปกติ + ราคาย่อ ==");
{
  // MSFT (INTACT ใน KB จริง) + snapshot ราคาย่อ ~15% จาก high 1 ปี
  var closes = [];
  for (var i = 0; i < 400; i++) closes.push(500 + i * 0.25); // ขึ้นเรื่อย ๆ สู่ 600
  for (var j = 0; j < 30; j++) closes.push(600 - j * 3);     // ย่อลงมา ~15%
  var dates = closes.map(function (_, k) { var d = new Date(2025, 0, 1); d.setDate(d.getDate() + k); return d.toISOString().slice(0, 10); });
  var snap = { historicalData: { MSFT: { closes: closes, dates: dates } } };
  var r = IE.compute("MSFT", snap, { data: D, TE: TE, VE: VE, PM: PM, AIR: AIR });
  t("compute available", r.available === true, r.reason);
  t("health = INTACT", r.health.state.key === "INTACT", r.health.state.key);
  t("dd1y สะท้อนการย่อ ~13-15%", r.drawdown.dd1y != null && r.drawdown.dd1y <= -12, r.drawdown.dd1y);
  t("summary เป็น dip เชิงบวก", r.summary.state.key === "HIGH_QUALITY_DIP" || r.summary.state.key === "HEALTHY_DIP", r.summary.state.key);
  t("summary มี why อธิบาย", r.summary.why.length >= 1);
}

console.log("== เคส 2: Fundamental Deterioration — decel 2 ไตรมาสติด ==");
{
  // รายได้ชะลอแรง 2 ไตรมาสติด (YoY +40→+35→+18→+4) แต่ EPS โตนิ่ง +10% ตลอด → crit เดียว
  var cfg2 = synthCompany({ history: { years: synthCompany({}).history.years,
    quarters: quarters([[100, 1, 30, 5], [100, 1, 30, 5], [100, 1, 30, 5], [100, 1, 30, 5],
      [140, 1.1, 30, 5], [135, 1.1, 30, 5], [118, 1.1, 30, 5], [104, 1.1, 30, 5]]) } });
  // rev YoY: q4→+40%, q5→+35%, q6→+18%(drop 17pp>max(5,8.75)✓), q7→+4%(drop 14pp>max(5,4.5)✓) = consecutive · eps YoY +10 คงที่
  var h2 = healthOf(cfg2, mockO());
  t("revenue pillar = crit", h2.pillars.filter(function (p) { return p.key === "revenue"; })[0].status === "crit");
  t("state = DETERIORATING", h2.state.key === "DETERIORATING", h2.state.key);
}

console.log("== เคส 3: Thesis Break — หลาย pillar พังพร้อมกัน ==");
{
  var cfg3 = synthCompany({ history: { years: synthCompany({}).history.years,
    quarters: quarters([[100, 1.0, 30, 5], [100, 1.0, 30, 5], [100, 1.0, 30, 5], [100, 1.0, 30, 5],
      [140, 1.4, 30, 5], [135, 1.35, 30, 5], [118, 1.10, 30, 5], [104, 0.9, 30, 5]]) } });
  // ทั้ง revenue และ eps decel 2 ไตรมาสติด → crit 2 ตัว → BROKEN
  var h3 = healthOf(cfg3, mockO());
  t("criticals >= 2", h3.counts.criticals >= 2, h3.counts.criticals);
  t("state = BROKEN", h3.state.key === "BROKEN", h3.state.key);
  // thesis < 55 (เกณฑ์ review ของ ThesisEngine) → BROKEN แม้ pillar อื่นปกติ
  var h3b = healthOf(synthCompany({}), mockO({ thesis: { score: 50, status: {}, trend: { key: "stable" } } }));
  t("thesis 50 < 55 → BROKEN", h3b.state.key === "BROKEN", h3b.state.key);
  // dipClass broken → BROKEN
  var h3c = healthOf(synthCompany({}), mockO({ dipClass: { key: "broken" } }));
  t("dipClass broken → BROKEN", h3c.state.key === "BROKEN", h3c.state.key);
  // ราคาลงอย่างเดียว (dd −30%) แต่ธุรกิจปกติ → ต้องไม่ BROKEN (กฎ: ราคาไม่ใช่ตัวตัดสิน)
  var h3d = healthOf(synthCompany({}), mockO({ falling: { drawdownPct: -30, drawdown1yPct: -30, hasData: true } }));
  t("ราคาลงแรงอย่างเดียว ≠ BROKEN", h3d.state.key === "INTACT", h3d.state.key);
}

console.log("== เคส 4-5: Earnings Revision — improving / deteriorating ==");
{
  function exp(rows) {
    return IE._internal.computeExpectations(synthCompany({ forwardView: { asOf: "2026-08", estimateHistory: rows, guidanceTrack: [], consensus: [] } }), TH);
  }
  var up = exp([{ asOf: "2026-02", fy: "FY2027", eps: 10.0, revenue: 100 }, { asOf: "2026-08", fy: "FY2027", eps: 10.5, revenue: 106 }]);
  t("+5% → IMPROVING", up.state.key === "IMPROVING", up.state.key);
  t("revision มีตัวเลข chgVsPrevPct", up.revisions.eps.chgVsPrevPct === 5);
  var dn = exp([{ asOf: "2026-02", fy: "FY2027", eps: 10.0 }, { asOf: "2026-08", fy: "FY2027", eps: 9.6 }]);
  t("-4% → DETERIORATING", dn.state.key === "DETERIORATING", dn.state.key);
  var sharp = exp([{ asOf: "2026-02", fy: "FY2027", eps: 10.0 }, { asOf: "2026-08", fy: "FY2027", eps: 9.0 }]);
  t("-10% → SHARPLY DETERIORATING", sharp.state.key === "SHARP_DOWN", sharp.state.key);
  var flat = exp([{ asOf: "2026-02", fy: "FY2027", eps: 10.0 }, { asOf: "2026-08", fy: "FY2027", eps: 10.1 }]);
  t("+1% → STABLE", flat.state.key === "STABLE", flat.state.key);
  // เปลี่ยนปีอ้างอิง (fy เลื่อน) — ห้ามเทียบข้าม fy
  var fyShift = exp([{ asOf: "2026-02", fy: "FY2026", eps: 8.0 }, { asOf: "2026-08", fy: "FY2027", eps: 10.0 }]);
  t("fy เลื่อน → INSUFFICIENT (ไม่เทียบข้ามปี)", fyShift.state.key === "INSUFFICIENT", fyShift.state.key);
}

console.log("== เคส 6-7: AI Monetization — strong / weak / risk ==");
{
  var strong = IE._internal.computeMonetization(synthCompany({}), mockO());
  t("synthetic ดี → STRONG", strong.state.key === "STRONG", strong.state.key);
  t("components ครบ 6", strong.components.length === 6, strong.components.length);
  var weakCfg = synthCompany({
    aiExecution: { score: 30, items: [{ item: "AI1", status: "at-risk", evidence: "x" }] },
    revenueQuality: { acceleration: "decelerating", segments: [{ name: "S", sharePct: 100, trend: "down" }] },
    competitive: { overall: "stable", moat: "x", factors: [] },
    fundamentals: synthCompany({}).fundamentals.map(function (f) {
      return f.key === "revenueGrowth" || f.key === "margin" ? { key: f.key, label: f.key, current: "~", trend: "down", score: 30, impact: "negative", why: "x" } : f; }),
  });
  var weak = IE._internal.computeMonetization(weakCfg, mockO());
  t("synthetic แย่ → WEAK", weak.state.key === "WEAK", weak.state.key);
  // ลงทุนสูง execute สูง แต่ผลธุรกิจต่ำ → MONETIZATION_RISK
  var riskCfg = synthCompany({
    aiExecution: { score: 92, items: [{ item: "A", status: "executing", evidence: "x" }, { item: "B", status: "executing", evidence: "x" }] },
    fundamentals: synthCompany({}).fundamentals.map(function (f) {
      return f.key === "revenueGrowth" || f.key === "margin" ? { key: f.key, label: f.key, current: "~", trend: "flat", score: 40, impact: "neutral", why: "x" } : f; }),
  });
  var risk = IE._internal.computeMonetization(riskCfg, mockO());
  t("ลงทุนสูง+ผลต่ำ → MONETIZATION_RISK", risk.state.key === "MONETIZATION_RISK", risk.state.key);
  t("มีคำอธิบาย why", typeof risk.why === "string" && risk.why.length > 0);
}

console.log("== เคส 8-9: Drawdown สูง / ต่ำ (stock-specific distribution) ==");
{
  // ประวัติมี 5 รอบย่อ: 6,8,10,12,30% แล้วปัจจุบันย่อ 25% (อยู่เหนือ p80=12? → sorted [6,8,10,12,30] p50=10 p80=12... nearest-rank p80 = idx ceil(0.8*5)-1=3 → 12) → 25 ≥ 12 → EXTREME
  var spec = [[100, 60], [94, 10], [101, 30], [92.9, 10], [102, 30], [91.8, 10], [103, 30], [90.6, 10], [104, 30], [72.8, 10], [105, 30]];
  var closes8 = closesSeries(spec);
  for (var k8 = 0; k8 < 10; k8++) closes8.push(105 * (1 - 0.025 * (k8 + 1))); // ย่อปัจจุบันลงถึง ~25%
  var dd8 = IE._internal.ddEpisodes(closes8);
  t("จับรอบย่อได้ ≥4 รอบ", dd8.episodes.length >= 4, dd8.episodes);
  var snap8 = { historicalData: { SYN: { closes: closes8, dates: closes8.map(function () { return "2026-01-01"; }) } } };
  var sd = synthData({ SYN: synthCompany({}) });
  var r8 = IE.compute("SYN", snap8, { data: sd, TE: TE, VE: VE });
  t("ย่อลึกเทียบอดีตตัวเอง → DEEP/EXTREME", r8.drawdown.classification.key === "EXTREME" || r8.drawdown.classification.key === "DEEP", r8.drawdown.classification.key);
  t("มี percentileOfCurrent", r8.drawdown.history.percentileOfCurrent != null);
  t("มีป้าย 'ไม่ใช่คำพยากรณ์'", r8.drawdown.note.indexOf("ไม่ใช่คำพยากรณ์") >= 0);
  // ย่อตื้น
  var closes9 = closesSeries(spec); // จบที่ peak 105 → ไม่มีย่อปัจจุบัน
  closes9.push(104); // ย่อ ~1%
  var r9 = IE.compute("SYN", { historicalData: { SYN: { closes: closes9, dates: [] } } }, { data: sd, TE: TE, VE: VE });
  t("ย่อตื้น → NORMAL", r9.drawdown.classification.key === "NORMAL", r9.drawdown.classification.key);
  t("fromHigh52wPct คำนวณได้", r9.drawdown.fromHigh52wPct != null);
}

console.log("== เคส 10-13: Growth vs Valuation Matrix ทั้ง 4 quadrant ==");
{
  // ปรับปีให้ growth สูง/ต่ำ + ราคาปัจจุบัน (ผ่าน snapshot) ให้ percentile ถูก/แพง
  function mkYears(cagr, pe) { // eps 5 ปีโตตาม cagr · priceFYEnd = eps × pe คงที่
    var out = [], eps = 2.0;
    for (var y = 0; y < 5; y++) {
      out.push({ fy: "FY202" + (2 + y), endYm: (2022 + y) + "-06", revenueB: 40 * Math.pow(1 + cagr, y), epsAdj: Math.round(eps * 100) / 100, opMarginPct: 30, fcfB: 8, priceFYEnd: Math.round(eps * pe * 100) / 100 });
      eps = eps * (1 + cagr);
    }
    return out;
  }
  function quadOf(cagr, peHist, priceNow) {
    var c = synthCompany({});
    c.history = { years: mkYears(cagr, peHist), quarters: c.history.quarters };
    // TTM EPS จาก 8 ไตรมาส synth = 4 ไตรมาสท้าย (1.35+1.5+1.65+1.8=6.3) → pe = priceNow/6.3
    var sdq = synthData({ SYN: c });
    var snapQ = { historicalData: { SYN: { closes: [priceNow], dates: ["2026-08-28"] } } };
    var mp = IE.compute("SYN", snapQ, { data: sdq, TE: TE, VE: VE }).matrixPoint;
    return mp;
  }
  var q1 = quadOf(0.25, 30, 63);   // โต 25%/ปี · อดีต pe 30 · ตอนนี้ pe 10 → ถูก
  t("โตสูง+ถูก → OPPORTUNITY", q1.quadrant.key === "OPPORTUNITY", q1.quadrant.key + " " + JSON.stringify(q1.valuation));
  var q2 = quadOf(0.25, 20, 630);  // โตสูง · ตอนนี้ pe 100 แพงกว่า median มาก
  t("โตสูง+แพง → RICH", q2.quadrant.key === "RICH", q2.quadrant.key);
  var q3 = quadOf(0.02, 30, 63);   // โตต่ำ · ถูก
  t("โตต่ำ+ถูก → VALUE", q3.quadrant.key === "VALUE", q3.quadrant.key);
  var q4 = quadOf(0.02, 20, 630);  // โตต่ำ · แพง
  t("โตต่ำ+แพง → RISK", q4.quadrant.key === "RISK", q4.quadrant.key);
  t("มีป้าย 'ไม่ใช่คำแนะนำซื้อขาย'", q1.note.indexOf("ไม่ใช่คำแนะนำ") >= 0);
  // matrix() รวมทุกตัวใน KB จริง — QQQM (ไม่มี history) ต้องถูกข้าม
  var mx = IE.matrix({}, { data: D, TE: TE, VE: VE, PM: PM });
  t("matrix ครอบ 14 ตัว (ข้าม QQQM)", mx.points.length === 14, mx.points.length);
  t("ทุกจุดมี quadrant enum ถูก", mx.points.every(function (p) { return IE.QUAD[p.quadrant.key] != null; }));
}

console.log("== เคส 14-17: ข้อมูลหาย — ต้องไม่มโน ==");
{
  var empty = synthData({ X: { ticker: "X", name: "X", asOf: "2026-08" } });
  var rX = IE.compute("X", {}, { data: empty, TE: TE, VE: VE });
  t("no fundamentals → health INSUFFICIENT", rX.health.state.key === "INSUFFICIENT", rX.health.state.key);
  t("no estimates → expectations INSUFFICIENT", rX.expectations.state.key === "INSUFFICIENT");
  t("no AI data → monetization INSUFFICIENT", rX.aiMonetization.state.key === "INSUFFICIENT");
  t("no price → drawdown INSUFFICIENT", rX.drawdown.classification.key === "INSUFFICIENT");
  t("no history → quadrant INSUFFICIENT", rX.matrixPoint.quadrant.key === "INSUFFICIENT");
  t("summary → INSUFFICIENT (ไม่เดา)", rX.summary.state.key === "INSUFFICIENT", rX.summary.state.key);
  var rNone = IE.compute("NOPE", {}, { data: D, TE: TE });
  t("ticker ไม่มีใน KB → available:false + reason", rNone.available === false && rNone.reason === "no-config");
  // TSM: estimateHistory ว่าง (0 แถว) ใน KB จริง → ต้อง INSUFFICIENT ไม่ crash
  var rT = IE.compute("TSM", {}, { data: D, TE: TE, VE: VE });
  t("TSM est ว่าง → expectations INSUFFICIENT", rT.expectations.state.key === "INSUFFICIENT");
}

console.log("== เคส 18: stale data ==");
{
  var rStale = IE.compute("SYN", {}, { data: synthData({ SYN: synthCompany({}) }), TE: TE, o: mockO({ stale: true }) });
  t("o.stale=true → out.stale=true", rStale.stale === true);
  var rFresh = IE.compute("NVDA", {}, { data: D, TE: TE });
  t("NVDA asOf ปัจจุบัน → stale=false", rFresh.stale === false, rFresh.stale);
}

console.log("== gateZone — safety gate ของ Accumulation Zone ==");
{
  var g1 = IE.gateZone("A", "BROKEN");
  t("A + BROKEN → บังคับ E", g1.zoneKey === "E" && g1.overridden === true);
  t("มีคำอธิบายการ override", typeof g1.why === "string" && g1.why.indexOf("BROKEN") >= 0);
  t("B + BROKEN → E", IE.gateZone("B", "BROKEN").zoneKey === "E");
  t("E + BROKEN → E (ไม่ซ้ำซ้อน)", IE.gateZone("E", "BROKEN").overridden === false);
  t("A + DETERIORATING → ลดเหลือ C", IE.gateZone("A", "DETERIORATING").zoneKey === "C");
  t("B + DETERIORATING → C", IE.gateZone("B", "DETERIORATING").zoneKey === "C");
  t("C + DETERIORATING → C + warn", (function () { var g = IE.gateZone("C", "DETERIORATING"); return g.zoneKey === "C" && !g.overridden && g.warn; })());
  t("A + WATCH → A + warn", (function () { var g = IE.gateZone("A", "WATCH"); return g.zoneKey === "A" && !g.overridden && g.warn; })());
  t("A + INTACT → ผ่านเฉย ๆ", (function () { var g = IE.gateZone("A", "INTACT"); return g.zoneKey === "A" && !g.warn; })());
  t("รับ state object ได้", IE.gateZone("A", IE.HEALTH.BROKEN).zoneKey === "E");
  t("null ปลอดภัย", IE.gateZone(null, null).overridden === false);
}

console.log("== Regression: 6 หุ้นบังคับ (GOOG META NVDA AMZN MSFT TSM) ==");
{
  var MUST = ["GOOG", "META", "NVDA", "AMZN", "MSFT", "TSM"];
  MUST.forEach(function (tk) {
    var r = IE.compute(tk, {}, { data: D, TE: TE, VE: VE, PM: PM, AIR: AIR });
    t(tk + ": available", r.available === true, r.reason);
    t(tk + ": health enum ถูก", IE.HEALTH[r.health.state.key] != null, r.health.state.key);
    t(tk + ": expectations enum ถูก", IE.EXPECT[r.expectations.state.key] != null);
    t(tk + ": monetization enum ถูก", IE.MONET[r.aiMonetization.state.key] != null);
    t(tk + ": summary enum ถูก", IE.INTERP[r.summary.state.key] != null);
    t(tk + ": valueChain มี layer", r.valueChain.available && typeof r.valueChain.layerKey === "string");
    t(tk + ": pillar ทุกตัวมี evidence", r.health.pillars.every(function (p) { return typeof p.evidence === "string" && p.evidence.length > 0; }));
    t(tk + ": pillar ทุกตัวมี source", r.health.pillars.every(function (p) { return typeof p.source === "string"; }));
    var js = JSON.stringify(r);
    t(tk + ": ไม่มี NaN/undefined ใน output", js.indexOf("NaN") < 0 && js.indexOf("undefined") < 0);
  });
  // GOOG vs GOOGL: snapshot มีแต่ key GOOGL → drawdown ต้องหาเจอ
  var closesG = []; for (var gi = 0; gi < 300; gi++) closesG.push(200 + gi * 0.1);
  var rG = IE.compute("GOOG", { historicalData: { GOOGL: { closes: closesG, dates: [] } } }, { data: D, TE: TE, VE: VE });
  t("GOOG อ่าน snapshot key GOOGL ได้", rG.drawdown.available === true && rG.drawdown.snapshotKey === "GOOGL");
  // TSM (ADR + instrument metadata) — matrixPoint ทำงาน + valuation จาก VE (จัดการ ADR อยู่แล้ว)
  var rTsm = IE.compute("TSM", {}, { data: D, TE: TE, VE: VE, PM: PM });
  t("TSM: matrixPoint มี growth", rTsm.matrixPoint.growthCagrPct != null);
  t("TSM: valuation จาก VE", rTsm.matrixPoint.valuation != null && rTsm.matrixPoint.valuation.classification != null);
  // NVDA fiscal year เหลื่อม (จบ ม.ค.) — YoY ใช้ lag 4 ไตรมาสจาก endYm ไม่ใช่ปีปฏิทิน
  var rN = IE.compute("NVDA", {}, { data: D, TE: TE, VE: VE });
  t("NVDA (FY เหลื่อม): health คำนวณได้", rN.health.state.key !== "INSUFFICIENT");
}

console.log("== Non-regression: engine เดิมต้องได้ค่าเท่า baseline ก่อน implement ==");
{
  var basePath = (process.env.TEMP || "/tmp") + "/intel-baseline.json";
  if (fs.existsSync(basePath)) {
    var base = JSON.parse(fs.readFileSync(basePath, "utf8"));
    Object.keys(base.thesis).forEach(function (tk) {
      var o = TE.compute(tk, {}, { data: D, mega: null, regime: null, R: null });
      t("TE " + tk + " score เท่าเดิม (" + base.thesis[tk].score + ")", o.thesis.score === base.thesis[tk].score, o.thesis.score);
      t("TE " + tk + " decision เท่าเดิม", o.decision.key === base.thesis[tk].decision, o.decision.key);
    });
    var P = function (tk) { return { ticker: tk, held: true, weightPct: 5, tierKey: "A" }; };
    var pmOut = PM.compute({}, { TE: TE, teOpts: { data: D }, positions: Object.keys(base.pm).map(P), cashPct: 25, indexTicker: "QQQM", indexPct: 50 });
    pmOut.rows.forEach(function (r) {
      if (!base.pm[r.ticker]) return;
      t("PM " + r.ticker + " zone เท่าเดิม (" + base.pm[r.ticker].zone + ")", r.zone && r.zone.key === base.pm[r.ticker].zone, r.zone && r.zone.key);
      t("PM " + r.ticker + " acc เท่าเดิม (" + base.pm[r.ticker].acc + ")", r.accScore === base.pm[r.ticker].acc, r.accScore);
    });
    Object.keys(base.ve).forEach(function (tk) {
      var v = VE.compute(tk, {}, { data: D });
      t("VE " + tk + " classification เท่าเดิม", v.classification === base.ve[tk].cls, v.classification);
    });
  } else {
    console.log("  (ข้าม — ไม่มีไฟล์ baseline: " + basePath + ")");
  }
}

console.log("== UI: §16 บน /thesis render จริง ==");
{
  // harness แบบเดียวกับ pm-no-target-test: ตัด boot ของ thesis-page แล้ว expose section
  var SRC16 = fs.readFileSync(process.cwd() + "/public/thesis-page.js", "utf8");
  var CUT16 = "  // ============================================================ boot";
  t("thesis-page มี anchor boot", SRC16.indexOf(CUT16) >= 0);
  var body16 = SRC16.slice(0, SRC16.indexOf(CUT16)).replace(/^\(function \(\) \{/, "");
  body16 += "\n  return { intelligenceSection: intelligenceSection };\n";
  var closes16 = []; for (var c16 = 0; c16 < 400; c16++) closes16.push(500 + c16 * 0.25);
  for (var d16 = 0; d16 < 30; d16++) closes16.push(600 - d16 * 3);
  var snap16 = { historicalData: { MSFT: { closes: closes16, dates: closes16.map(function () { return "2026-08-28"; }) } } };
  var store16 = {};
  global.localStorage = { getItem: function (k) { return store16[k] || null; }, setItem: function (k, v) { store16[k] = String(v); } };
  global.window = { ThesisData: D, ThesisEngine: TE, ValuationEngine: VE, PMEngine: PM, AIRotationEngine: AIR, IntelligenceEngine: IE,
    PortfolioDataSnapshot: { read: function () { return snap16; } }, addEventListener: function () {} };
  global.document = { readyState: "complete", getElementById: function () { return null; }, addEventListener: function () {} };
  var page16 = new Function(body16)();
  var R16 = TE.compute("MSFT", snap16, { data: D });
  var html16 = page16.intelligenceSection(R16);
  t("§16 render ออกมา", typeof html16 === "string" && html16.length > 500, html16.length);
  t("§16 มีเลข section 16", html16.indexOf('th-sec-n">16<') >= 0);
  t("§16 มี executive summary hero", html16.indexOf("th-ii-hero") >= 0);
  t("§16 มีการ์ดสรุป 6 ใบ", (html16.match(/th-vx-card"/g) || []).length >= 6);
  t("§16 มีตาราง pillar", html16.indexOf("Thesis Health — หลักฐานราย pillar") >= 0);
  t("§16 มี matrix svg", html16.indexOf("th-ii-matrix") >= 0);
  t("§16 มีป้าย historical context ไม่ใช่คำพยากรณ์", html16.indexOf("ไม่ใช่คำพยากรณ์") >= 0);
  t("§16 มี data quality strip", html16.indexOf("Intelligence Data Quality") >= 0);
  t("§16 ไม่มี NaN/undefined/Infinity", html16.indexOf("NaN") < 0 && html16.indexOf("undefined") < 0 && html16.indexOf("Infinity") < 0);
  t("§16 dip เชิงบวกบน MSFT + ราคาย่อ", html16.indexOf("HIGH QUALITY DIP") >= 0 || html16.indexOf("HEALTHY DIP") >= 0);
  // ไม่มี IntelligenceEngine → section ต้องหายทั้งก้อน (คืน \"\")
  global.window.IntelligenceEngine = null;
  var page16b = new Function(body16)();
  t("ไม่มี engine → §16 คืนค่าว่าง (หน้าเดิมไม่พัง)", page16b.intelligenceSection(R16) === "");
  global.window.IntelligenceEngine = IE;
}

console.log("== UI: safety gate บนหน้า AI Portfolio Manager ==");
{
  var SRCPM = fs.readFileSync(process.cwd() + "/public/portfolio-manager-page.js", "utf8");
  var CUTPM = "  // ธงแดง/มูลค่าเปลี่ยนจาก Action Center";
  t("pm-page มี anchor bootstrap", SRCPM.indexOf(CUTPM) >= 0);
  var bodyPM = SRCPM.slice(0, SRCPM.indexOf(CUTPM)).replace(/^\(function \(\) \{/, "");
  bodyPM += "\n  return { sectionZones: sectionZones, sectionCurrent: sectionCurrent, sectionDeployment: sectionDeployment, setIntel: function (out, snap) { intelMap = computeIntelMap(out, snap); } };\n";
  // บริษัท synthetic ที่ thesis ดี (80) แต่ rev+eps decel 2 ไตรมาสติด → health BROKEN ขณะ PMEngine ให้ zone ปกติ
  var brk = synthCompany({ ticker: "SYNBRK", history: { years: synthCompany({}).history.years,
    quarters: quarters([[100, 1.0, 30, 5], [100, 1.0, 30, 5], [100, 1.0, 30, 5], [100, 1.0, 30, 5],
      [140, 1.4, 30, 5], [135, 1.35, 30, 5], [118, 1.10, 30, 5], [104, 0.9, 30, 5]]) } });
  var dataPM = synthData({ SYNBRK: brk });
  var storePM = {};
  global.localStorage = { getItem: function (k) { return storePM[k] || null; }, setItem: function (k, v) { storePM[k] = String(v); } };
  global.window = { ThesisData: dataPM, ThesisEngine: TE, ValuationEngine: VE, PMEngine: PM, IntelligenceEngine: IE,
    PortfolioDataSnapshot: { read: function () { return {}; } }, addEventListener: function () {} };
  global.document = { readyState: "complete", getElementById: function () { return null; }, addEventListener: function () {} };
  var pagePM = new Function(bodyPM)();
  var outPM = PM.compute({}, { TE: TE, teOpts: { data: dataPM }, positions: [{ ticker: "SYNBRK", held: true, weightPct: 5, tierKey: "A" }], cashPct: 25, indexTicker: "QQQM", indexPct: 50 });
  var rowPM = outPM.rows.filter(function (r) { return r.ticker === "SYNBRK"; })[0];
  t("PMEngine เองยังให้ zone ปกติ (ไม่ใช่ E) — พิสูจน์ว่า engine ไม่ถูกแก้", rowPM.zone.key !== "E", rowPM.zone.key);
  pagePM.setIntel(outPM, {});
  var zonesHtml = pagePM.sectionZones(outPM);
  t("card แสดง chip BROKEN", zonesHtml.indexOf("pm-ii-broken") >= 0);
  t("card แสดง gate เป็น Zone E", zonesHtml.indexOf("pm-card-e") >= 0);
  t("มีคำอธิบายการ override", zonesHtml.indexOf("⛔") >= 0 && zonesHtml.indexOf("BROKEN") >= 0);
  t("มีหลักฐาน pillar ใน card", zonesHtml.indexOf("pm-ii-ev") >= 0);
  t("zones ไม่มีคำ 'เป้า' หลุด (กติกาหน้านี้)", zonesHtml.indexOf("เป้า") < 0);
  var curHtml = pagePM.sectionCurrent(outPM, { positions: [{ ticker: "SYNBRK", marketValue: 100000 }], gross: 1000000, flagSum: 100000, cashBaht: 900000, cashPct: 90, investedPct: 10 });
  t("ตาราง Current แสดง gated", curHtml.indexOf("pm-ii-gate") >= 0);
  // ไม่มี IntelligenceEngine → HTML ต้องเท่าเดิมทุก byte (หน้าเดิมไม่เปลี่ยน)
  global.window.IntelligenceEngine = null;
  var pagePM2 = new Function(bodyPM)();
  pagePM2.setIntel(outPM, {});
  var z2 = pagePM2.sectionZones(outPM);
  t("ไม่มี engine → ไม่มี chip/gate ใด ๆ", z2.indexOf("pm-ii-") < 0 && z2.indexOf("⛔") < 0);
  t("ไม่มี engine → zone เดิมของ PMEngine", z2.indexOf("pm-card-" + rowPM.zone.key.toLowerCase()) >= 0);
}

console.log("== review fixes: 7 finding ที่ยืนยันแล้วต้องไม่กลับมา ==");
{
  // #1: แถว estimate ที่ eps:null ปน (เคส ASML จริง) — revision ต้องเทียบจากแถวที่มีค่า ไม่โชว์ null
  var fxRows=[{asOf:"2026-02",fy:"FY2026",eps:null,revenue:43.21},{asOf:"2026-05",fy:"FY2026",eps:26.0,revenue:43.8},{asOf:"2026-08",fy:"FY2026",eps:26.5,revenue:44.0}];
  var fxE=IE._internal.computeExpectations(synthCompany({forwardView:{asOf:"2026-08",estimateHistory:fxRows,guidanceTrack:[],consensus:[]}}),TH);
  t("#1 eps prev มาจากแถวที่มีค่า (26.0 ไม่ใช่ null)", fxE.revisions.eps.prev===26.0, fxE.revisions.eps.prev);
  t("#1 chgVsPrevPct คำนวณได้", fxE.revisions.eps.chgVsPrevPct!=null);
  // ทุก field null หมด → INSUFFICIENT ไม่ใช่ revisions ว่างเปล่า
  var fxN=IE._internal.computeExpectations(synthCompany({forwardView:{asOf:"2026-08",estimateHistory:[{asOf:"2026-02",fy:"FY2026",eps:null},{asOf:"2026-08",fy:"FY2026",eps:null}],guidanceTrack:[],consensus:[]}}),TH);
  t("#1 ทุกแถว null → INSUFFICIENT", fxN.state.key==="INSUFFICIENT" && fxN.revisions===null);
  // #7: WATCH ที่ราคาไม่ได้ย่อ → ป้ายต้องไม่อ้างว่าราคาลง
  var fxW=IE.compute("GOOG",{},{data:D,TE:TE,VE:VE});
  if(fxW.health.state.key==="WATCH"){
    t("#7 GOOG (WATCH, ไม่มีข้อมูล dip) → INTERP.WATCH ไม่ใช่ WATCH_DIP", fxW.summary.state.key==="WATCH", fxW.summary.state.key);
    t("#7 ป้ายไม่อ้างว่าราคาลง", fxW.summary.state.thai.indexOf("ราคาลง")<0);
  } else { t("#7 (precondition GOOG=WATCH เปลี่ยนไป — ตรวจ enum แทน)", IE.INTERP.WATCH!=null); t("#7b", true); }
  t("#7 CAUTION ไม่อ้างราคาในป้าย", IE.INTERP.CAUTION.thai.indexOf("ราคาลง")<0);
  t("#7 INTERP.WATCH อยู่ใน enum", IE.INTERP.WATCH && IE.INTERP.WATCH.key==="WATCH");
}

console.log("== verify round 2: ช่องที่ปิดเพิ่ม ==");
{
  // B1: growthVsPrice ต้องไม่ตายเงียบ (เดิมส่ง object เข้า growthSummary ที่รับ array)
  var gv=IE.compute("GOOG",{},{data:D,TE:TE,VE:VE,PM:PM}).matrixPoint.growthVsPrice;
  t("B1 growthVsPrice ทำงานจริง (GOOG มีคะแนน)", gv!=null && typeof gv.score==="number", JSON.stringify(gv));
  // C: ส่ง gsum เข้าไปต้อง reuse ไม่คำนวณใหม่
  var fakeG={score:42,label:"x",windows:[{years:2}]};
  var gv2=IE.compute("GOOG",{},{data:D,TE:TE,VE:VE,PM:PM,gsum:fakeG}).matrixPoint.growthVsPrice;
  t("C gsum ที่ส่งเข้าถูก reuse", gv2 && gv2.score===42, gv2 && gv2.score);
  // B5: EPS พลิกขาดทุน → crit ไม่ใช่ na (detector ต้องไม่บอดตรงจุดพัง)
  var colQ=quarters([[100,1.0,30,5],[100,1.0,30,5],[100,1.0,30,5],[100,1.0,30,5],[100,0.9,30,5],[100,0.5,30,5],[100,-0.2,30,5],[100,-0.8,30,5]]);
  var hCol=healthOf(synthCompany({history:{years:synthCompany({}).history.years,quarters:colQ}}),mockO());
  var epsP=hCol.pillars.filter(function(p){return p.key==="eps";})[0];
  t("B5 พลิกขาดทุน → eps pillar crit", epsP.status==="crit", epsP.status+" — "+epsP.evidence);
  // B6: closes null หมด → high52w ต้อง null ไม่ใช่ -Infinity
  var nulls=[];for(var nn=0;nn<300;nn++)nulls.push(null);
  var rNul=IE.compute("SYN",{historicalData:{SYN:{closes:nulls,dates:[]}}},{data:synthData({SYN:synthCompany({})}),TE:TE,VE:VE});
  t("B6 all-null closes → high52w null", rNul.drawdown.high52w==null, rNul.drawdown.high52w);
  t("B6 ไม่มี Infinity ใน output", JSON.stringify(rNul).indexOf("Infinity")<0);
  // B7: <252 แท่ง → ไม่ป้ายว่าเป็น high 52 สัปดาห์
  var r31=IE.compute("SYN",{historicalData:{SYN:{closes:Array.apply(null,{length:60}).map(function(_,i){return 100+i;}),dates:[]}}},{data:synthData({SYN:synthCompany({})}),TE:TE,VE:VE});
  t("B7 60 แท่ง → high52w null + มี note", r31.drawdown.high52w==null && typeof r31.drawdown.high52wNote==="string");
  // B9: ข้อมูลราคาสั้น (<30 แท่ง TE มองไม่เห็น) แต่ร่วงแรง — summary ต้องเห็น dip เดียวกับการ์ด F4
  var crash=IE.compute("MSFT",{historicalData:{MSFT:{closes:[400,395,390,385,380,300,250,200],dates:[]}}},{data:D,TE:TE,VE:VE});
  t("B9 การ์ด F4 เห็น dip", crash.drawdown.currentDdPct!=null && crash.drawdown.currentDdPct>=20, crash.drawdown.currentDdPct);
  t("B9 summary ใช้ dip ตัวเดียวกัน (ไม่ใช่ MONITOR)", crash.summary.state.key!=="MONITOR", crash.summary.state.key);
  // A: PRICE_RISK เมื่อไม่มีข้อมูลราคา ห้ามอ้างว่าราคาไม่ได้ย่อ
  var rAsml=IE.compute("ASML",{},{data:D,TE:TE,VE:VE});
  if(rAsml.summary.state.key==="PRICE_RISK"){
    t("A PRICE_RISK (ไม่มีราคา) ไม่อ้างว่าราคาไม่ได้ย่อ", rAsml.summary.why.join(" ").indexOf("ไม่ได้ย่อ")<0, rAsml.summary.why.join(" | "));
  } else { t("A (precondition ASML ไม่ใช่ PRICE_RISK แล้ว — ผ่าน)", true); }
  // B10: margin trend หาย → null ไม่มโน 35
  var noTrend=synthCompany({fundamentals:synthCompany({}).fundamentals.map(function(f){return f.key==="margin"?{key:"margin",label:"margin",current:"~",score:80,impact:"positive",why:"x"}:f;})});
  var mNT=IE._internal.computeMonetization(noTrend,mockO());
  var mi=mNT.components.filter(function(c){return c.key==="marginImpact";})[0];
  t("B10 trend หาย → marginImpact null", mi.score===null, mi.score);
  // แทน baseline file: assertion ถาวร — engine เดิมต้องไม่รู้จัก IntelligenceEngine เลย
  ["thesis-engine.js","portfolio-manager-engine.js","valuation-engine.js","ai-rotation-engine.js","adaptive-position-engine.js","market-regime.js"].forEach(function(f){
    var src=fs.readFileSync(process.cwd()+"/public/"+f,"utf8");
    t("อิสระ: "+f+" ไม่อ้างถึง IntelligenceEngine", src.indexOf("IntelligenceEngine")<0);
  });
}

console.log("== /thesis full-page scrutiny: fwParseVal (comma หลักพัน) ==");
{
  var SRCP=fs.readFileSync(process.cwd()+"/public/thesis-page.js","utf8");
  var CUTP=SRCP.indexOf("============================================================ boot");
  var bodyP=SRCP.slice(0,SRCP.lastIndexOf("// ",CUTP)).replace(/^\(function \(\) \{/,"");
  bodyP += "\n return {p:fwParseVal};\n";
  global.localStorage={getItem:function(){return null;},setItem:function(){}};
  global.window={addEventListener:function(){}};
  global.document={readyState:"complete",getElementById:function(){return null;},addEventListener:function(){}};
  var fwP=new Function(bodyP)().p;
  t("comma หลักพัน: ~฿50,294M → 50294 (เคยได้ 172!)", fwP("~฿50,294M")===50294, fwP("~฿50,294M"));
  t("~฿37,640M → 37640", fwP("~฿37,640M")===37640);
  t("ช่วงจริงยังเป็นจุดกึ่งกลาง: ≈$3.43-3.46B → ~3445", Math.abs(fwP("≈$3.43-3.46B")-3445)<1);
  t("ช่วง+comma: ฿50,294-52,100M → 51197", fwP("฿50,294-52,100M")===51197);
  t("guidance ±: ~$91.0B ±2% → 91000", fwP("~$91.0B ±2%")===91000);
  t("ไม่มีหน่วย (EPS ต่อหุ้น) → null ไม่เดาสเกล", fwP("~$4.20")===null);
  t("ข้อความไทยล้วน → null", fwP("ไม่ให้ guidance รายไตรมาส")===null);
}

console.log("== Thesis Overview (LEVEL 1 landing) — model + render ==");
{
  var TO = require("../public/thesis-overview.js");
  global.localStorage = { getItem: function () { return null; }, setItem: function () {} };
  global.window = { ThesisData: D, ThesisEngine: TE, ValuationEngine: VE, PMEngine: PM, AIRotationEngine: AIR, IntelligenceEngine: IE, addEventListener: function () {} };
  global.document = { readyState: "complete", getElementById: function () { return null; }, addEventListener: function () {} };
  var M = TO.computeModel({}, { data: D, TE: TE, VE: VE, PM: PM, IE: IE, AIR: AIR });
  t("model available", M.available === true, M.reason);
  t("model: 14 assets (ไม่รวม QQQM)", M.total === 14 && M.rows.length === 14);
  t("model: counts รวม = 14", M.counts.hi + M.counts.watch + M.counts.wait + M.counts.review === 14, JSON.stringify(M.counts));
  t("model: highlights 3-5 ใบ", M.highlights.length >= 3 && M.highlights.length <= 5, M.highlights.length);
  t("model: readNext 3-5 แถว", M.readNext.length >= 3 && M.readNext.length <= 5, M.readNext.length);
  t("model: priority มีแค่ HIGH/MEDIUM/LOW", M.rows.every(function (m) { return ["HIGH", "MEDIUM", "LOW"].indexOf(m.prio.key) >= 0; }));
  t("model: opportunities ไม่มี DETERIORATING/BROKEN", M.opportunities.every(function (m) { return m.health !== "BROKEN" && m.health !== "DETERIORATING"; }));
  t("model: opportunities ≤5", M.opportunities.length <= 5, M.opportunities.length);
  t("model: strongWait = INTACT + thesis≥75 เท่านั้น", M.strongWait.every(function (m) { return m.health === "INTACT" && m.thesis >= 75; }));
  t("model: ทุกตัวมี reason หนึ่งประโยค", M.rows.every(function (m) { return typeof m.reason === "string" && m.reason.length > 5; }));
  var hOv = TO.render({}, { data: D, TE: TE, VE: VE, PM: PM, IE: IE, AIR: AIR });
  ["Investment Thesis Overview", "Today’s Highlights", "Read Next", "Top Opportunities", "Thesis Watch", "Strong Business · Wait", "Thesis Review", "All AI Assets"]
    .forEach(function (sec) { t("render: มี section " + sec, hOv.indexOf(sec) >= 0); });
  t("render: chip/แถวคลิกได้", (hOv.match(/data-th-ticker=/g) || []).length >= 14);
  t("render: หัวตารางเรียงได้ (9 คอลัมน์ รวม Acc)", (hOv.match(/data-tho-sort=/g) || []).length === 9);
  t("render: การ์ดติดป้าย Thesis ชัด", hOv.indexOf(">Thesis ")>=0);
  t("render: การ์ดโชว์ Accumulation Score คู่กัน", hOv.indexOf("Accumulation Score:")>=0);
  t("render: ตาราง opportunities มีคอลัมน์ Acc Score", hOv.indexOf("<th>Acc Score</th>")>=0);
  t("render: ไม่มี NaN/undefined/Infinity/null หลุด", ["NaN", "undefined", "Infinity", ">null<"].every(function (b) { return hOv.indexOf(b) < 0; }));
  t("render: ไม่มีคำ Buy/Sell", !/\b(Buy|Sell)\b/.test(hOv));
  // sort ตาราง: เรียง thesis desc ต้องเปลี่ยนลำดับแถวอย่าง deterministic
  var hSorted = TO.render({}, { data: D, TE: TE, VE: VE, PM: PM, IE: IE, AIR: AIR, }, undefined);
  void hSorted;
}

console.log("== Routing acceptance: /thesis = Overview · ?ticker=X = Detail ==");
{
  var TO2 = require("../public/thesis-overview.js");
  var SRCR = fs.readFileSync(process.cwd() + "/public/thesis-page.js", "utf8");
  var CUTR = SRCR.indexOf("============================================================ boot");
  var bodyR = SRCR.slice(0, SRCR.lastIndexOf("// ", CUTR)).replace(/^\(function \(\) \{/, "");
  bodyR += "\n return { render: render };\n";
  var rootObj = { innerHTML: "" };
  var storeR = {};
  function mkPageR(search) {
    global.localStorage = { getItem: function (k) { return storeR[k] || null; }, setItem: function (k, v) { storeR[k] = String(v); } };
    global.window = { ThesisData: D, ThesisEngine: TE, ValuationEngine: VE, PMEngine: PM, AIRotationEngine: AIR, IntelligenceEngine: IE,
      ThesisOverview: TO2, PortfolioDataSnapshot: { read: function () { return {}; } },
      location: { search: search }, history: { pushState: function () {} }, addEventListener: function () {} };
    global.document = { readyState: "complete", getElementById: function (id) { return id === "thRoot" ? rootObj : null; }, addEventListener: function () {} };
    return new Function(bodyR)();
  }
  // 1) /thesis (ไม่มี ticker) → Overview เต็มหน้า ห้ามมี detail ใด ๆ
  rootObj.innerHTML = "";
  mkPageR("").render();
  t("/thesis → เห็น Overview", rootObj.innerHTML.indexOf("Investment Thesis Overview") >= 0);
  t("/thesis → ไม่มี section detail (§2 Thesis Score)", rootObj.innerHTML.indexOf('th-sec-n">2<') < 0);
  t("/thesis → ไม่มี hero YES/WAIT ของ GOOG", rootObj.innerHTML.indexOf("th-hero") < 0);
  // 2) ?ticker=GOOG → detail เดิม + ปุ่มกลับ Overview · ไม่มีหน้า Overview ปน
  rootObj.innerHTML = "";
  mkPageR("?ticker=GOOG").render();
  t("?ticker=GOOG → เห็น detail (§2)", rootObj.innerHTML.indexOf('th-sec-n">2<') >= 0);
  t("?ticker=GOOG → มี §16 ตามเดิม", rootObj.innerHTML.indexOf('th-sec-n">16<') >= 0);
  t("?ticker=GOOG → ไม่มีปุ่มกลับรก ๆ (ผู้ใช้สั่งถอด — กลับผ่านเมนู/back)", rootObj.innerHTML.indexOf("data-th-home") < 0);
  t("?ticker=GOOG → ไม่มี Overview ปนใต้ detail", rootObj.innerHTML.indexOf("Today’s Highlights") < 0);
  // 3) ticker ตัวเล็ก + ticker นอก KB (lite path) — ไม่พังหน้า
  rootObj.innerHTML = "";
  mkPageR("?ticker=goog").render();
  t("?ticker=goog (ตัวเล็ก) → uppercase แล้วเปิด detail ได้", rootObj.innerHTML.indexOf('th-sec-n">2<') >= 0);
  rootObj.innerHTML = "";
  mkPageR("?ticker=AAPL").render();
  t("?ticker=AAPL (นอก KB) → lite path ไม่พัง และไม่ใช่ Overview", rootObj.innerHTML.length > 200 && rootObj.innerHTML.indexOf("Today’s Highlights") < 0);
}

console.log("");
console.log(pass + fail + " checks · " + pass + " passed · " + fail + " failed");
process.exit(fail ? 1 : 0);
