// Valuation Engine smoke + adversarial test suite
// run: node scripts/valuation-smoke-test.js
"use strict";
const VE = require("../public/valuation-engine.js");
const KB = require("../public/thesis-data.js");

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log("  PASS  " + name); }
  else { fail++; console.log("  FAIL  " + name + (detail != null ? " — " + detail : "")); }
}
const NOW = new Date("2026-08-15T12:00:00Z").getTime(); // ตรึงเวลา — determinism

// ---------- fixture builders ----------
function mkData(history, forwardView) {
  return { companies: { TT: { ticker: "TT", history: history, forwardView: forwardView || undefined, fundamentals: [] } } };
}
function mkQuarters(epsArr, startY) {
  // สร้างไตรมาสจบทุก 3 เดือน ล่าสุด = 2026-06 (ยังสด ณ NOW)
  const out = [];
  const yms = ["2025-09", "2025-12", "2026-03", "2026-06"];
  for (let i = 0; i < epsArr.length; i++) {
    out.push({ q: "Q" + (i + 1), endYm: yms[i] || "2026-06", epsAdj: epsArr[i], priceQEnd: 100 });
  }
  return out;
}
function mkYears(peArr) {
  // ปี FY2021.. ราคา = pe (eps=1) → P/E ตรงตัว
  return peArr.map((pe, i) => ({ fy: "FY202" + (1 + i), endYm: "202" + (1 + i) + "-12", revenueB: 10, epsAdj: 1, opMarginPct: 20, fcfB: 1, priceFYEnd: pe }));
}
function snapWith(price, dateStr) {
  return { historicalData: { TT: { dates: [dateStr], closes: [price] } } };
}
const BASE_HIST = { epsBasis: "diluted GAAP, split-adjusted", years: mkYears([11, 19, 27, 29, 29]), quarters: mkQuarters([1, 2, 3, 4]) };
function clone(o) { return JSON.parse(JSON.stringify(o)); }

console.log("== Phase 3: TTM EPS ==");
{
  const V = VE.compute("TT", snapWith(310, "2026-08-14"), { data: mkData(clone(BASE_HIST)), nowMs: NOW });
  check("TTM = ผลรวม 4 ไตรมาสล่าสุด (1+2+3+4=10)", V.eps.ttm === 10);
  check("quarterCount=4 · epsAsOf=ไตรมาสล่าสุด", V.eps.quarterCount === 4 && V.eps.asOf === "2026-06");
  check("current P/E = price/TTM = 31", V.pe.current === 31);
  check("ไม่ใช้ FY/forward EPS (methodology = TTM_TRAILING)", V.pe.methodology === "TTM_TRAILING");
}
{
  const h = clone(BASE_HIST); h.quarters[2].epsAdj = null; // missing quarter
  const V = VE.compute("TT", snapWith(310, "2026-08-14"), { data: mkData(h), nowMs: NOW });
  check("ไตรมาสขาด (null) → TTM null + MISSING_EPS + ไม่มโน", V.eps.ttm === null && V.warnings.indexOf("MISSING_EPS") >= 0 && V.pe.current === null);
  check("ไตรมาสขาด → INSUFFICIENT_DATA ไม่ใช่ตัวเลขปลอม", V.classification === "INSUFFICIENT_DATA");
}
{
  const h = clone(BASE_HIST); h.quarters = h.quarters.slice(0, 3); // < 4 quarters
  const V = VE.compute("TT", snapWith(310, "2026-08-14"), { data: mkData(h), nowMs: NOW });
  check("<4 ไตรมาส → TTM null", V.eps.ttm === null && V.classification === "INSUFFICIENT_DATA");
}
{
  const h = clone(BASE_HIST); h.quarters[1].endYm = h.quarters[2].endYm; // duplicated quarter
  const V = VE.compute("TT", snapWith(310, "2026-08-14"), { data: mkData(h), nowMs: NOW });
  check("ไตรมาสซ้ำ → DUPLICATE_QUARTER + ไม่คำนวณ TTM", V.warnings.indexOf("DUPLICATE_QUARTER") >= 0 && V.eps.ttm === null);
}

console.log("== Adversarial round 2 (จาก review) ==");
{
  const h = clone(BASE_HIST); // รูตรงกลาง: 2025-06, 2025-09, 2025-12, 2026-06 (ข้าม 2026-03)
  h.quarters = [
    { q: "Qa", endYm: "2025-06", epsAdj: 1, priceQEnd: 100 },
    { q: "Qb", endYm: "2025-09", epsAdj: 2, priceQEnd: 100 },
    { q: "Qc", endYm: "2025-12", epsAdj: 3, priceQEnd: 100 },
    { q: "Qd", endYm: "2026-06", epsAdj: 4, priceQEnd: 100 }
  ];
  const V = VE.compute("TT", snapWith(310, "2026-08-14"), { data: mkData(h), nowMs: NOW });
  check("ไตรมาสมีรู (ไม่ติดกัน) → NON_CONTIGUOUS_QUARTERS + ไม่ติดป้าย TTM", V.warnings.indexOf("NON_CONTIGUOUS_QUARTERS") >= 0 && V.eps.ttm === null);
}
{
  const h = clone(BASE_HIST); h.quarters[1].epsAdj = "  "; // whitespace string
  const V = VE.compute("TT", snapWith(310, "2026-08-14"), { data: mkData(h), nowMs: NOW });
  check("epsAdj เป็น whitespace → null ไม่ใช่ 0", V.eps.ttm === null);
  const h2 = clone(BASE_HIST); h2.quarters[1].epsAdj = [];
  const V2 = VE.compute("TT", snapWith(310, "2026-08-14"), { data: mkData(h2), nowMs: NOW });
  check("epsAdj เป็น array → null ไม่ใช่ 0", V2.eps.ttm === null);
}
{
  const V = VE.compute("TT", { historicalData: { TT: { dates: [], closes: [310] } } }, { data: mkData(clone(BASE_HIST)), nowMs: NOW });
  check("ราคาไม่มีวันที่ → PRICE_DATE_UNKNOWN + stale (ไม่หลอกว่า fresh)", V.warnings.indexOf("PRICE_DATE_UNKNOWN") >= 0 && V.price.stale === true);
}
{
  const V = VE.compute("TT", snapWith(310, "2027-01-01"), { data: mkData(clone(BASE_HIST)), nowMs: NOW });
  check("ราคาวันที่อนาคต → FUTURE_PRICE_DATE + stale", V.warnings.indexOf("FUTURE_PRICE_DATE") >= 0 && V.price.stale === true);
}
{
  const h = clone(BASE_HIST); // เดือนไม่เต็มหลัก — sort ตัวอักษรจะสลับ ต้องถูกตัดทิ้งทั้งแถว
  h.quarters = [
    { q: "Qa", endYm: "2025-3", epsAdj: 5, priceQEnd: 100 },
    { q: "Qb", endYm: "2025-06", epsAdj: 1, priceQEnd: 100 },
    { q: "Qc", endYm: "2025-09", epsAdj: 2, priceQEnd: 100 },
    { q: "Qd", endYm: "2025-12", epsAdj: 3, priceQEnd: 100 },
    { q: "Qe", endYm: "2026-03", epsAdj: 4, priceQEnd: 100 }
  ];
  const V = VE.compute("TT", snapWith(310, "2026-08-14"), { data: mkData(h), nowMs: NOW });
  check("endYm รูปแบบผิด (2025-3) ถูกตัด → TTM จาก 4 ตัวที่ valid ติดกัน = 10", V.eps.ttm === 10 && V.eps.asOf === "2026-03");
}
{
  const V = VE.compute("TT", snapWith(310, "2026-08-14"), { data: mkData(clone(BASE_HIST), { asOf: "2026-08", estimateHistory: [], guidanceTrack: [], consensus: [{ fy: "FY2027", revenue: 100, eps: 5, confidence: "high" }], note: "" }), nowMs: NOW, assumePriceCurrency: "THB" });
  check("currency mismatch → forwardPe ก็ต้องไม่คำนวณ (guard เดียวกัน)", V.forwardPe === null);
}
{
  const V = VE.compute("TT", snapWith(310, "2026-08-14"), { data: mkData(clone(BASE_HIST)), nowMs: NOW });
  check("record ไม่มี peRaw รั่วออกมา (ค่าดิบใช้ภายใน)", V.history.points.every(p => !("peRaw" in p)));
}

console.log("== Negative / zero EPS ==");
{
  const h = clone(BASE_HIST); h.quarters = mkQuarters([-3, -3, 2, 2]);
  const V = VE.compute("TT", snapWith(310, "2026-08-14"), { data: mkData(h), nowMs: NOW });
  check("TTM ติดลบ → NON_POSITIVE_TTM_EPS + pe null", V.warnings.indexOf("NON_POSITIVE_TTM_EPS") >= 0 && V.pe.current === null);
}
{
  const h = clone(BASE_HIST); h.quarters = mkQuarters([-1, -1, 1, 1]);
  const V = VE.compute("TT", snapWith(310, "2026-08-14"), { data: mkData(h), nowMs: NOW });
  check("TTM = 0 → pe null (ไม่หารศูนย์)", V.pe.current === null);
}

console.log("== Phase 4: price/fundamental sync + staleness ==");
{
  const V = VE.compute("TT", snapWith(310, "2026-08-14"), { data: mkData(clone(BASE_HIST)), nowMs: NOW });
  check("ราคา live สด → quality.price=fresh · source=live-snapshot", V.quality.price === "fresh" && V.price.source === "live-snapshot");
  check("record มี priceAsOf/epsAsOf/valuationAsOf ครบ", V.asOf.price === "2026-08-14" && V.asOf.eps === "2026-06" && V.asOf.valuation === "2026-08-15");
}
{
  const V = VE.compute("TT", {}, { data: mkData(clone(BASE_HIST)), nowMs: NOW }); // ไม่มี snapshot → fallback KB
  check("ไม่มี snapshot → fallback ราคาสิ้นไตรมาส + STALE_PRICE (ไม่เงียบ)", V.price.source === "kb-quarter-end" && V.warnings.indexOf("STALE_PRICE") >= 0);
  check("stale → quality.price=stale + staleDays>7", V.quality.price === "stale" && V.price.staleDays > 7);
}
{
  const V = VE.compute("TT", snapWith(310, "2026-07-20"), { data: mkData(clone(BASE_HIST)), nowMs: NOW }); // ราคาเก่า 26 วัน
  check("ราคา live เก่า >7 วัน → STALE_PRICE", V.warnings.indexOf("STALE_PRICE") >= 0);
}
{
  const h = clone(BASE_HIST); h.quarters = h.quarters.map((q, i) => ({ ...q, endYm: ["2025-01", "2025-04", "2025-07", "2025-10"][i] })); // ไตรมาสล่าสุดจบ ต.ค. 2025 (>135 วัน)
  const V = VE.compute("TT", snapWith(310, "2026-08-14"), { data: mkData(h), nowMs: NOW });
  check("EPS เก่าเกินรอบงบ → STALE_FUNDAMENTAL", V.warnings.indexOf("STALE_FUNDAMENTAL") >= 0 && V.quality.eps === "stale");
}
{
  const h = clone(BASE_HIST); h.quarters = [];
  const V = VE.compute("TT", {}, { data: mkData(h), nowMs: NOW });
  check("ไม่มีราคาเลย → MISSING_PRICE + pe null", V.warnings.indexOf("MISSING_PRICE") >= 0 && V.pe.current === null);
}

console.log("== Phase 14: ADR / currency / split ==");
{
  const V = VE.compute("TSM", snapWith(0, ""), { data: KB, nowMs: NOW });
  check("TSM: isAdr + ratio 5 จาก instrument metadata (ไม่ hard-code ใน engine)", V.adr.isAdr === true && V.adr.ratio === 5 && V.adr.verified === true);
  check("TSM: ไม่มีการคูณ/หาร ratio (ฐาน ADR เดียวกันทั้งราคาและ EPS)", V.adr.conversionApplied === false);
}
{
  const V = VE.compute("ASML", {}, { data: KB, nowMs: NOW });
  check("ASML: ADR 1:1 verified", V.adr.isAdr === true && V.adr.ratio === 1 && V.adr.verified === true);
}
{
  const h = clone(BASE_HIST); h.epsBasis = "diluted per ADR (US listing)"; // ADR แต่ไม่มี instrument
  const V = VE.compute("TT", snapWith(310, "2026-08-14"), { data: mkData(h), nowMs: NOW });
  check("epsBasis บอก ADR แต่ไม่มี ratio → ADR_RATIO_UNVERIFIED", V.warnings.indexOf("ADR_RATIO_UNVERIFIED") >= 0 && V.quality.adr === "unverified");
}
{
  const V = VE.compute("TT", snapWith(310, "2026-08-14"), { data: mkData(clone(BASE_HIST)), nowMs: NOW, assumePriceCurrency: "THB" });
  check("สกุลเงินไม่ตรง → CURRENCY_MISMATCH + pe null (ห้ามหารข้ามสกุล)", V.warnings.indexOf("CURRENCY_MISMATCH") >= 0 && V.pe.current === null);
}
{
  const V = VE.compute("GULF.BK", {}, { data: KB, nowMs: NOW });
  check("GULF.BK: THB ทั้งคู่ → currencyMatch", V.quality.currencyMatch === true && V.price.currency === "THB");
}
{
  const splitDocs = ["NVDA", "AMZN", "AVGO", "GOOG"].every(t => /split/i.test(KB.companies[t].history.epsBasis));
  check("split safety: KB epsBasis ประทับ split-adjusted (ฐานตรงกับราคา Yahoo ที่ปรับ split)", splitDocs);
}

console.log("== Phase 5-7: historical series + median ==");
{
  const h = clone(BASE_HIST);
  h.years.push({ fy: "FY2026", endYm: "2026-12", epsAdj: -2, priceFYEnd: 100 }); // ปีขาดทุน
  h.years.push({ fy: "FY2027", endYm: "2027-12", epsAdj: null, priceFYEnd: 100 }); // null
  h.years.push({ fy: "FY2021", endYm: "2021-12", epsAdj: 1, priceFYEnd: 999 }); // duplicate fy
  const V = VE.compute("TT", snapWith(310, "2026-08-14"), { data: mkData(h), nowMs: NOW });
  check("ปีขาดทุน/null/ปีซ้ำ ถูกตัดออกพร้อมเหตุผล", V.history.sampleCount === 5 && V.history.excluded.length === 3);
  check("methodology เดียวทั้ง series (FYEND_TRAILING)", V.history.points.every(p => p.methodology === "FYEND_TRAILING"));
  check("ทุกจุดมี period/price/eps/pe", V.history.points.every(p => p.period && p.price > 0 && p.eps > 0 && p.pe > 0));
}
{
  const h = clone(BASE_HIST); h.years = mkYears([10, 20, 30]);
  const V = VE.compute("TT", snapWith(310, "2026-08-14"), { data: mkData(h), nowMs: NOW });
  check("median คี่ [10,20,30] = 20 (median จริง ไม่ใช่ average)", V.history.median === 20);
}
{
  const h = clone(BASE_HIST); h.years = mkYears([10, 20, 30, 40]);
  const V = VE.compute("TT", snapWith(310, "2026-08-14"), { data: mkData(h), nowMs: NOW });
  check("median คู่ [10,20,30,40] = 25", V.history.median === 25);
  check("sampleCount ถูกเก็บ", V.history.sampleCount === 4);
}

console.log("== Phase 8: percentile (spec ตัวอย่าง hist=[11,19,27,29,29]) ==");
{
  const D = mkData(clone(BASE_HIST)); // years → P/E [11,19,27,29,29] · TTM=10
  const at = (price) => VE.compute("TT", snapWith(price, "2026-08-14"), { data: D, nowMs: NOW });
  check("current 31 (เหนือทั้งหมด) → percentile 100 Very High", at(310).percentile.value === 100 && at(310).percentile.label === "Very High");
  check("current 29 (เท่าค่าสูงสุด, ties inclusive) → 100", at(290).percentile.value === 100);
  check("current 28 → 60 (3/5)", at(280).percentile.value === 60);
  check("current 19 → 40 (2/5 ties inclusive — deterministic)", at(190).percentile.value === 40);
  check("current 11 (เท่าค่าต่ำสุด) → 20 (1/5)", at(110).percentile.value === 20);
  check("current 10 (ใต้ทั้งหมด) → 0 + label Very Low", at(100).percentile.value === 0 && at(100).percentile.label === "Very Low");
  check("boundary 25/50/75: 27→60 Normal · min/max เก็บครบ", at(270).percentile.value === 60 && at(270).history.min === 11 && at(270).history.max === 29);
  const twice = [at(310), at(310)];
  check("determinism: คำนวณซ้ำได้ byte เดิม", JSON.stringify(twice[0]) === JSON.stringify(twice[1]));
}
{
  const h = clone(BASE_HIST); h.years = mkYears([11, 19, 27]); // 3 จุด < 5
  const V = VE.compute("TT", snapWith(310, "2026-08-14"), { data: mkData(h), nowMs: NOW });
  check("ประวัติ <5 จุด → percentile null + INSUFFICIENT_DATA (ไม่มโน)", V.percentile.value === null && V.classification === "INSUFFICIENT_DATA");
}

console.log("== Phase 9: classification (context ไม่ใช่สัญญาณ) ==");
{
  const D = mkData(clone(BASE_HIST));
  const at = (price) => VE.compute("TT", snapWith(price, "2026-08-14"), { data: D, nowMs: NOW });
  check("pct 20 → ATTRACTIVE", at(110).classification === "ATTRACTIVE");
  check("pct 40 → FAIR", at(190).classification === "FAIR");
  check("pct 60 → FAIR (≤65)", at(280).classification === "FAIR");
  check("pct 100 + premium +14.8% (<40) → PREMIUM", at(310).classification === "PREMIUM" && at(310).premiumVsMedianPct === 14.8);
  check("pct 100 + premium ≥40% → EXPENSIVE", at(400).classification === "EXPENSIVE");
  const banned = JSON.stringify(at(310));
  check("record ไม่มีคำ Buy/Sell", banned.indexOf("Buy") < 0 && banned.indexOf("Sell") < 0);
}

console.log("== Phase 15: cache/method metadata ==");
{
  const V = VE.compute("TT", snapWith(310, "2026-08-14"), { data: mkData(clone(BASE_HIST)), nowMs: NOW });
  check("record มี schemaVersion + methodologyVersion + generatedAt + source", V.schemaVersion === 1 && typeof V.methodologyVersion === "string" && !!V.generatedAt && V.eps.source === "kb-curated");
}

console.log("== Phase 12: TSM regression (ราคา fixture — ห้ามผลิตเลข stale แบบเงียบ) ==");
{
  const ttm = KB.companies.TSM.history.quarters.slice(-4).reduce((a, q) => a + q.epsAdj, 0); // จาก KB ไม่ hard-code
  const freshPrice = 426.35; // fixture สดจาก provider จริง ณ วันเขียน test (asOf 2026-08-14)
  const V = VE.compute("TSM", snapWith2("TSM", freshPrice, "2026-08-14"), { data: KB, nowMs: NOW });
  const expectedPe = Math.round(freshPrice / ttm * 100) / 100;
  check("TSM: ราคาสด → pe = price/TTM = " + expectedPe + " (ไม่ใช่ค่า stale ~24.4)", V.pe.current === expectedPe && Math.abs(V.pe.current - 24.4) > 3);
  check("TSM: percentile สูง (เหนือ median ชัด) ไม่ใช่ 40", V.percentile.value >= 80);
  check("TSM: ไม่มี STALE_PRICE เมื่อราคาสด", V.warnings.indexOf("STALE_PRICE") < 0);
  const VS = VE.compute("TSM", {}, { data: KB, nowMs: NOW });
  check("TSM: ไม่มีราคาสด → ประกาศ STALE_PRICE (ไม่เงียบ)", VS.warnings.indexOf("STALE_PRICE") >= 0 && VS.price.source === "kb-quarter-end");
}
function snapWith2(sym, price, dateStr) { const s = { historicalData: {} }; s.historicalData[sym] = { dates: [dateStr], closes: [price] }; return s; }

console.log("== Phase 13: cross-stock (KB จริง + ราคา fixture สด) ==");
{
  const FIX = { TSM: 426.35, GOOG: 320, META: 780, NVDA: 182, AMZN: 230, MSFT: 520 };
  Object.keys(FIX).forEach((t) => {
    const V = VE.compute(t, snapWith2(t, FIX[t], "2026-08-14"), { data: KB, nowMs: NOW });
    let ok;
    if (t === "AMZN") {
      // AMZN FY2022 ขาดทุน GAAP → ถูกตัดออก เหลือ 4 จุด (<5) → INSUFFICIENT อย่างซื่อสัตย์ ไม่ใช่บั๊ก
      ok = V.available && V.pe.current > 0 && V.history.sampleCount === 4 &&
        V.history.excluded.some(x => x.reason === "non-positive-eps") &&
        V.percentile.value === null && V.classification === "INSUFFICIENT_DATA";
    } else {
      ok = V.available && V.pe.current > 0 && V.history.median > 0 && V.history.sampleCount >= 5 &&
        V.percentile.value !== null && ["ATTRACTIVE", "FAIR", "PREMIUM", "EXPENSIVE"].indexOf(V.classification) >= 0 &&
        V.quality.price === "fresh" && V.eps.quarterCount === 4;
    }
    check(t + ": pipeline ครบ (pe=" + V.pe.current + " med=" + V.history.median + " pct=" + V.percentile.value + " → " + V.classification + ")", ok);
  });
}

console.log("== Edge: ticker จริงข้อมูลไม่ครบ ==");
{
  const V = VE.compute("HOOD", snapWith2("HOOD", 91, "2026-08-14"), { data: KB, nowMs: NOW });
  check("HOOD: ปี valid <5 → INSUFFICIENT_DATA + percentile null (แต่ pe ยังโชว์ได้)", V.classification === "INSUFFICIENT_DATA" && V.percentile.value === null && V.pe.current > 0);
  const P = VE.compute("PLTR", snapWith2("PLTR", 155, "2026-08-14"), { data: KB, nowMs: NOW });
  check("PLTR: KB ใช้ EPS adjusted บวกทุกปี → 5 จุด valid ไม่มี excluded (การตัดปีขาดทุนทดสอบใน synthetic แล้ว)", P.history.sampleCount === 5 && P.history.excluded.length === 0);
  const Q = VE.compute("QQQM", {}, { data: KB, nowMs: NOW });
  check("QQQM: ไม่มี history → available=false + INSUFFICIENT", Q.available === false && Q.classification === "INSUFFICIENT_DATA");
  const Z = VE.compute("ZZNOPE", {}, { data: KB, nowMs: NOW });
  check("ticker ไม่มีใน KB → fail อย่างปลอดภัย", Z.available === false);
}

console.log("");
console.log(pass + fail + " checks · " + pass + " passed · " + fail + " failed");
process.exit(fail ? 1 : 0);
