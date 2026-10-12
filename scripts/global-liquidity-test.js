// ============================================================
// GLOBAL LIQUIDITY (BALI) — เทสต์แบบกำหนดผลได้
// node scripts/global-liquidity-test.js
//
// กติกาที่ล็อกไว้:
//   1. หน่วยต้องแปลงถูก — ECB เป็น EUR, BOJ เป็น "100 ล้านเยน" ไม่ใช่ล้าน
//   2. ห้ามมองอนาคต — ค่าที่ใช้ของแต่ละสัปดาห์ต้องมีวันที่ <= สัปดาห์นั้น
//   3. สัปดาห์ที่ข้อมูลไม่ครบสามธนาคาร ต้องไม่ถูกนำมาคิด %เปลี่ยนแปลง
//   4. BOJ รายเดือน → ลากค่าเดิม และต้องติดธงว่าลากมา
//   5. ห้ามมี NaN / Infinity / undefined
// ============================================================
"use strict";
var fs = require("fs"), path = require("path");
var GL = require("../public/global-liquidity-engine.js");
var API = require("../api/global-liquidity.js");

var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; return; }
  fail++; console.error("  ✗ " + name + (extra !== undefined ? "  → " + JSON.stringify(extra) : ""));
}
function near(a, b, eps) { return a != null && b != null && Math.abs(a - b) < (eps == null ? 1e-9 : eps); }

// ---------- ตัวช่วยสร้างข้อมูล ----------
function weeklyDates(n, endYmd) {
  var out = [], ms = Date.UTC(+endYmd.slice(0, 4), +endYmd.slice(5, 7) - 1, +endYmd.slice(8, 10));
  for (var i = 0; i < n; i++) { out.push(new Date(ms).toISOString().slice(0, 10)); ms -= 7 * 86400000; }
  return out.reverse();
}
function rows(dates, valueAt) {
  return dates.map(function (d, i) { return { date: d, value: valueAt(i, d) }; });
}
function payloadOf(o) {
  function ser(id, unit, freq, rws) {
    return { id: id, unit: unit, freq: freq, ok: true, rows: rws,
      firstDate: rws.length ? rws[0].date : null, lastDate: rws.length ? rws[rws.length - 1].date : null, count: rws.length };
  }
  return {
    complete: true, missing: [], series: {
      fed: ser("WALCL", "millionUSD", "weekly", o.fed || []),
      ecb: ser("ECBASSETSW", "millionEUR", "weekly", o.ecb || []),
      boj: ser("JPNASSETS", "hundredMillionJPY", "monthly", o.boj || []),
      usdPerEur: ser("DEXUSEU", "usdPerEur", "daily", o.eur || []),
      jpyPerUsd: ser("DEXJPUS", "jpyPerUsd", "daily", o.jpy || [])
    }
  };
}

console.log("== การแปลงหน่วยเป็น USD ==");
{
  var D = weeklyDates(20, "2026-10-07");
  // Fed 1,000,000 ล้าน USD · ECB 2,000,000 ล้าน EUR @1.25 · BOJ 50,000 (100 ล้านเยน) @100 JPY/USD
  var p = payloadOf({
    fed: rows(D, function () { return 1000000; }),
    ecb: rows(D, function () { return 2000000; }),
    boj: rows(D, function () { return 50000; }),
    eur: rows(D, function () { return 1.25; }),
    jpy: rows(D, function () { return 100; })
  });
  var r = GL.compute(p, []);
  var L = r.latest;
  t("คำนวณได้", r.available === true, r.reason);
  t("Fed ใช้ค่าตรง ๆ (ล้าน USD)", L.fedUsd === 1000000, L.fedUsd);
  t("ECB = ล้าน EUR × USD/EUR = 2.5 ล้านล้าน", L.ecbUsd === 2500000, L.ecbUsd);
  // 50,000 × 100 ล้านเยน = 5,000,000 ล้านเยน ÷ 100 = 50,000 ล้าน USD
  t("BOJ = (100ล้านเยน × 100) ÷ JPY/USD = 50,000 ล้าน USD", L.bojUsd === 50000, L.bojUsd);
  t("รวมถูกต้อง", L.totalUsd === 1000000 + 2500000 + 50000, L.totalUsd);
  t("ถ้าตีความ BOJ เป็น 'ล้านเยน' จะได้ 500 ซึ่งผิด — ยืนยันว่าไม่ใช่ค่านั้น", L.bojUsd !== 500);
}

console.log("== %เปลี่ยนแปลง N สัปดาห์ ==");
{
  var D2 = weeklyDates(20, "2026-10-07");
  // Fed โต 10% ใน 6 สัปดาห์สุดท้าย ส่วนอื่นคงที่
  var p2 = payloadOf({
    fed: rows(D2, function (i) { return i >= 14 ? 1100000 : 1000000; }),
    ecb: rows(D2, function () { return 0; }),
    boj: rows(D2, function () { return 0; }),
    eur: rows(D2, function () { return 1; }),
    jpy: rows(D2, function () { return 1; })
  });
  var r2 = GL.compute(p2, [], { changeWeeks: 6 });
  var last = r2.latest;
  t("ของทั้งหมดเป็น Fed อย่างเดียว", last.totalUsd === 1100000, last.totalUsd);
  t("%เปลี่ยน 6 สัปดาห์ = +10%", near(last.baliPct, 10, 1e-9), last.baliPct);
  var six = r2.weeks[r2.weeks.length - 7];
  t("ย้อนไป 6 สัปดาห์ยังไม่ขึ้น = 0%", near(six.baliPct, 0, 1e-9), six.baliPct);
  t("สัปดาห์แรก ๆ ที่ย้อนไม่ครบหน้าต่าง = null", r2.weeks[0].baliPct === null);
}

console.log("== ห้ามมองอนาคต ==");
{
  var D3 = weeklyDates(12, "2026-10-07");
  var p3 = payloadOf({
    fed: rows(D3, function (i) { return 1000 + i; }),
    // ECB มีค่าเดียว "ในอนาคต" เทียบกับสัปดาห์แรก ๆ
    ecb: [{ date: "2026-09-30", value: 500 }],
    boj: [{ date: "2026-09-01", value: 10 }],
    eur: [{ date: "2026-09-30", value: 1 }],
    jpy: [{ date: "2026-09-01", value: 1 }]
  });
  var r3 = GL.compute(p3, []);
  var early = r3.weeks[0];
  t("สัปดาห์ที่อยู่ก่อนวันของ ECB → ไม่ถูกนับว่าครบ", early.complete === false, early);
  t("สัปดาห์ก่อนหน้านั้นไม่มีค่า ECB เลย", early.ecbUsd === null, early.ecbUsd);
  var anyFuture = r3.weeks.some(function (w) {
    return (w.ecbDate && w.ecbDate > w.date) || (w.bojDate && w.bojDate > w.date);
  });
  t("ไม่มีสัปดาห์ไหนหยิบค่าที่ลงวันที่ใหม่กว่าตัวเองมาใช้", anyFuture === false);
}

console.log("== BOJ รายเดือน: ลากค่าเดิม + ติดธง ==");
{
  var D4 = weeklyDates(16, "2026-10-07");
  var p4 = payloadOf({
    fed: rows(D4, function () { return 1000; }),
    ecb: rows(D4, function () { return 1000; }),
    boj: [{ date: "2026-08-01", value: 10 }, { date: "2026-09-01", value: 11 }],
    eur: rows(D4, function () { return 1; }),
    jpy: rows(D4, function () { return 1; })
  });
  var r4 = GL.compute(p4, []);
  var carried = r4.weeks.filter(function (w) { return w.bojCarried; });
  t("มีสัปดาห์ที่ BOJ ถูกลากค่ามา", carried.length > 0, carried.length);
  t("นับจำนวนสัปดาห์ที่ลากค่าไว้ในสรุป", r4.coverage.bojCarriedWeeks === carried.length);
  t("หมายเหตุบอกผู้ใช้ว่า BOJ เป็นรายเดือน",
    r4.notes.some(function (x) { return x.indexOf("รายเดือน") >= 0; }), r4.notes);
  var tooOld = r4.weeks[0];
  t("BOJ เก่าเกินเกณฑ์ → สัปดาห์นั้นไม่ครบ (ไม่ลากข้ามปี)",
    tooOld.complete === false || tooOld.bojAgeDays <= 50, [tooOld.complete, tooOld.bojAgeDays]);
}

console.log("== สัปดาห์ที่ไม่ครบ ต้องไม่ถูกคิด % ==");
{
  var D5 = weeklyDates(14, "2026-10-07");
  var p5 = payloadOf({
    fed: rows(D5, function () { return 1000; }),
    // ECB หยุดส่งตั้งแต่ 6 สัปดาห์ท้าย
    ecb: rows(D5.slice(0, 8), function () { return 1000; }),
    boj: [{ date: D5[0], value: 10 }, { date: D5[7], value: 10 }],
    eur: rows(D5, function () { return 1; }),
    jpy: rows(D5, function () { return 1; })
  });
  var r5 = GL.compute(p5, []);
  var tail = r5.weeks[r5.weeks.length - 1];
  t("สัปดาห์ท้ายที่ ECB ขาด → complete=false", tail.complete === false, tail.complete);
  t("สัปดาห์ท้ายไม่มี totalUsd", tail.totalUsd === null);
  t("สัปดาห์ท้ายไม่มี baliPct (ไม่เดาแทน)", tail.baliPct === null);
  t("latest ชี้ไปสัปดาห์ล่าสุดที่ครบ ไม่ใช่สัปดาห์ล่าสุดสุด",
    r5.latest && r5.latest.complete === true && r5.latest.date !== tail.date,
    [r5.latest && r5.latest.date, tail.date]);
  t("หมายเหตุเตือนว่า ECB ออกช้ากว่า Fed",
    r5.notes.some(function (x) { return x.indexOf("ECB ออกช้า") >= 0; }), r5.notes);
}

console.log("== หา lag ที่สัมพันธ์สูงสุด ==");
{
  // สร้างข้อมูลที่ BTC "ตาม" BALI ห่าง 5 สัปดาห์เป๊ะ → ต้องหาเจอ
  var N = 120, D6 = weeklyDates(N, "2026-10-07");
  var wave = [];
  for (var i = 0; i < N; i++) wave.push(Math.sin(i / 6) * 1000);
  var p6 = payloadOf({
    fed: rows(D6, function (i) { return 1000000 + wave[i]; }),
    ecb: rows(D6, function () { return 0; }),
    boj: rows(D6, function () { return 0; }),
    eur: rows(D6, function () { return 1; }),
    jpy: rows(D6, function () { return 1; })
  });
  // BTC ขยับตามรูปแบบเดียวกันแต่ช้ากว่า 5 สัปดาห์
  var btc = [];
  for (var k = 0; k < N; k++) {
    var src = k - 5;
    btc.push({ date: D6[k], close: 10000 + (src >= 0 ? wave[src] : 0) });
  }
  var r6 = GL.compute(p6, btc, { changeWeeks: 6, lagScanMax: 20 });
  t("หา bestLag ได้", !!r6.bestLag, r6.bestLag);
  t("bestLag ตรงกับ lag ที่ฝังไว้ (5 สัปดาห์)", r6.bestLag.weeks === 5, r6.bestLag);
  t("สหสัมพันธ์ที่ lag ถูกต้องสูงกว่าที่ lag 0",
    r6.lagScan[5].corr > r6.lagScan[0].corr, [r6.lagScan[0].corr, r6.lagScan[5].corr]);
  t("lagScan มีครบทุกค่าที่ขอ", r6.lagScan.length === 21, r6.lagScan.length);
  t("ทุกแถวของ lagScan บอกจำนวนจุดที่ใช้", r6.lagScan.every(function (x) { return typeof x.n === "number"; }));
}

console.log("== เส้นประในโซนล่วงหน้า (ถดถอย + ช่วงความน่าจะเป็น) ==");
{
  // สร้างข้อมูลให้ความสัมพันธ์อยู่ใน "พื้นที่ที่ engine ถดถอยจริง" คือ %เปลี่ยน 6 สัปดาห์
  // (ไม่ใช่ระดับดิบ — ถ้าฝังที่ระดับดิบ %เปลี่ยนจะเพี้ยนเฟส แล้วเทสต์จะวัดผิดเรื่อง)
  //   baliPct[i] = fed[i]/fed[i-6] - 1
  //   ตั้งให้  btcPct[i+LAG] = SLOPE * baliPct[i]  (+ สัญญาณรบกวนถ้าต้องการ)
  function makeLagged(lagWeeks, slope, noise, seed0) {
    var N = 140, D = [], base = Date.UTC(2024, 0, 3), i;
    for (i = 0; i < N; i++) D.push(new Date(base + i * 7 * 86400000).toISOString().slice(0, 10));
    var seed = seed0 || 11;
    function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
    var lvl = [], v = 1000000;
    for (i = 0; i < N; i++) { v *= 1 + (rnd() - 0.5) * 0.02; lvl.push(v); }
    function rws(f) { return D.map(function (d, k) { return { date: d, value: f(k) }; }); }
    var payload = payloadOf({
      fed: rws(function (k) { return lvl[k]; }),
      ecb: rws(function () { return 0; }),
      boj: rws(function () { return 0; }),
      eur: rws(function () { return 1; }),
      jpy: rws(function () { return 1; })
    });
    var btc = []; for (i = 0; i < N; i++) btc.push(10000);
    for (var j = 6; j < N; j++) {
      var src = j - lagWeeks;
      var want = src >= 6 ? slope * (lvl[src] / lvl[src - 6] - 1) : 0;
      btc[j] = btc[j - 6] * (1 + want + (noise ? (rnd() - 0.5) * noise : 0));
    }
    return { payload: payload, btc: D.map(function (d, k) { return { date: d, close: btc[k] }; }) };
  }

  var clean = makeLagged(7, 2, 0);
  var r8 = GL.compute(clean.payload, clean.btc, { changeWeeks: 6, lagScanMax: 20 });
  var P8 = r8.projection;
  t("มีบล็อกประมาณการ", !!P8, P8);
  t("หา lag ที่ฝังไว้เจอ (7 สัปดาห์)", r8.bestLag.weeks === 7, r8.bestLag);
  t("ใช้ lag เดียวกับที่ fit ได้ดีที่สุด", P8.lagWeeks === r8.bestLag.weeks, [P8.lagWeeks, r8.bestLag.weeks]);
  t("จำนวนจุดล่วงหน้า = lag", P8.points.length === P8.lagWeeks, [P8.points.length, P8.lagWeeks]);
  t("จับความชันที่ฝังไว้ได้ (=2)", near(P8.slope, 2, 1e-6), P8.slope);
  t("ความสัมพันธ์เป๊ะ → r² = 100%", near(P8.explainedPct, 100, 1e-6), P8.explainedPct);
  t("ความสัมพันธ์เป๊ะ → ไม่ติดคำเตือน", P8.warning === null, P8.warning);
  t("ช่วง 95% กว้างกว่าหรือเท่าช่วง 68% เสมอ", P8.points.every(function (x) {
    return (x.hi95 - x.lo95) >= (x.hi68 - x.lo68);
  }));
  t("ค่ากลางอยู่ในช่วงเสมอ", P8.points.every(function (x) {
    return x.fitPct >= x.lo68 && x.fitPct <= x.hi68 && x.fitPct >= x.lo95 && x.fitPct <= x.hi95;
  }));
  t("ทุกจุดบอกว่าอีกกี่สัปดาห์", P8.points.every(function (x) { return x.weeksAhead >= 1; }));
  t("จุดประมาณการอยู่ในโซนล่วงหน้า (เลยปลายข้อมูล BTC จริง)",
    P8.points.every(function (x) { return x.plotIndex > r8.weeks.length - 1 - P8.lagWeeks; }));
  t("อ้างวันต้นทางของ BALI จริง ไม่ได้แต่งวันอนาคต",
    P8.points.every(function (x) { return /^\d{4}-\d{2}-\d{2}$/.test(x.sourceDate); }));
  var projBad = [];
  JSON.stringify(P8, function (k, v) {
    if (typeof v === "number" && !isFinite(v)) projBad.push(k + "=" + v);
    return v;
  });
  P8.points.forEach(function (pt, pi) {
    Object.keys(pt).forEach(function (k) {
      if (pt[k] === undefined) projBad.push("points[" + pi + "]." + k + "=undefined");
    });
  });
  t("ไม่มีค่าผิดรูปในบล็อกประมาณการ", projBad.length === 0, projBad.slice(0, 6));

  // สัญญาณรบกวนแรง → r² ต้องตก ช่วงต้องกว้างขึ้น และต้องขึ้นคำเตือน
  var noisy = makeLagged(7, 2, 0.5, 29);
  var r9 = GL.compute(noisy.payload, noisy.btc, { changeWeeks: 6, lagScanMax: 20 });
  if (r9.projection) {
    t("ข้อมูลมั่ว → r² ต่ำกว่าข้อมูลสะอาดมาก", r9.projection.explainedPct < 50,
      r9.projection.explainedPct);
    t("ข้อมูลมั่ว → ช่วง 95% กว้างกว่าข้อมูลสะอาด",
      r9.projection.typicalBand95 > P8.typicalBand95,
      [r9.projection.typicalBand95, P8.typicalBand95]);
    t("r² ต่ำ → ต้องเตือนผู้ใช้ว่าเส้นประนี้เชื่อไม่ได้",
      r9.projection.explainedPct >= 10 || !!r9.projection.warning,
      [r9.projection.explainedPct, r9.projection.warning]);
  } else {
    t("ไม่มี fit ที่ใช้ได้ → ต้องไม่แต่งเส้นประขึ้นมา", r9.projection === null);
  }

  // ---- ราคา BTC ที่ได้จาก %เปลี่ยน ----
  // กับดัก: ถ้าใช้ "ราคาล่าสุด" เป็นฐาน เลขจะออกมาดูสมเหตุสมผลแต่ผิด
  // ฐานที่ถูกคือราคาเมื่อ W สัปดาห์ก่อน "ช่องนั้น" เพราะ btcPct เป็น %เปลี่ยน W สัปดาห์
  var Wc = r8.options.changeWeeks;
  t("บอกไว้ว่าฐานราคาคือกี่สัปดาห์ก่อนหน้า", P8.priceAnchorWeeks === Wc, [P8.priceAnchorWeeks, Wc]);
  t("ทุกจุดมีราคาคาดการณ์", P8.points.every(function (x) { return x.price != null && x.price > 0; }));
  // หมายเหตุ: fitPct ที่ออกมาถูกปัด 2 ตำแหน่งเพื่อแสดงผล แต่ "ราคา" คิดจากค่าดิบ
  // (ถูกต้องแล้ว — ปัดก่อนคำนวณคือบั๊กคลาส "ปัดเศษก่อนคำนวณสถิติ")
  // จึงยอมให้ต่างได้ไม่เกินผลของการปัด 0.005% บนฐาน บวกเศษ floating point
  function priceTol(x) { return Math.abs(x.baseClose) * 0.00005 + Math.abs(x.price) * 1e-9 + 0.02; }
  t("ราคา = ฐาน × (1 + %/100) ทุกจุด (เผื่อการปัดเศษเพื่อแสดงผล)", P8.points.every(function (x) {
    return near(x.price, x.baseClose * (1 + x.fitPct / 100), priceTol(x));
  }), P8.points.slice(0, 2));
  // ต้องไม่หลวมจนจับบั๊กไม่ได้: ถ้าใช้ฐานผิดตัว ส่วนต่างต้องเกิน tolerance แน่นอน
  t("ความคลาดเคลื่อนที่ยอมให้ แคบกว่าผลของการใช้ฐานผิดตัวมาก", (function () {
    var obs = P8.points.filter(function (x) { return x.priceBasis === "observed"; });
    if (obs.length < 2) return true;
    return obs.every(function (x) {
      var wrong = obs[0].baseClose * (1 + x.fitPct / 100);   // ฐานผิด = ใช้ฐานของจุดแรกกับทุกจุด
      return Math.abs(x.price - wrong) < priceTol(x) ? near(x.baseClose, obs[0].baseClose, 1e-9) : true;
    });
  })());
  t("ช่วงราคา 95% ครอบช่วง 68% และครอบค่ากลาง", P8.points.every(function (x) {
    return x.priceLo95 <= x.priceLo68 && x.priceLo68 <= x.price &&
           x.price <= x.priceHi68 && x.priceHi68 <= x.priceHi95;
  }));
  // ชุดสะอาด r²=100% ทำให้ขอบช่วงเท่าค่ากลางพอดี จึงจับ "ขอบช่วงยุบเป็นเส้นเดียว" ไม่ได้
  // ต้องใช้ชุดที่มีสัญญาณรบกวนมายืนยันว่าช่วงราคากางออกจริง
  var noisyP = GL.compute(makeLagged(7, 2, 0.35, 61).payload,
    makeLagged(7, 2, 0.35, 61).btc, { changeWeeks: 6, lagScanMax: 20 }).projection;
  t("มีชุดข้อมูลรบกวนไว้ตรวจความกว้างของช่วงราคา", !!noisyP && noisyP.points.length > 0);
  if (noisyP && noisyP.points.length) {
    t("ช่วงราคาต้องกางออกจริง ไม่ยุบเป็นค่ากลาง", noisyP.points.every(function (x) {
      return x.priceHi95 > x.price && x.priceLo95 < x.price &&
             x.priceHi68 > x.price && x.priceLo68 < x.price;
    }), noisyP.points[0]);
    t("ช่วงราคา 95% กว้างกว่า 68% จริง", noisyP.points.every(function (x) {
      return (x.priceHi95 - x.priceLo95) > (x.priceHi68 - x.priceLo68);
    }));
    t("ขอบบน/ล่างของราคาไม่เท่ากัน (ไม่ใช่ค่ากลางซ้ำ)", noisyP.points.every(function (x) {
      return x.priceHi95 !== x.priceLo95 && x.priceHi68 !== x.priceLo68;
    }));
    t("ราคาในชุดรบกวนยังเป็นบวกทุกจุด", noisyP.points.every(function (x) { return x.price > 0; }));
  }
  // ช่วงกว้างมากจนขอบล่างต่ำกว่า -100% ⇒ "ราคาติดลบ" ซึ่งเป็นไปไม่ได้
  // ต้องคืน null ไม่ใช่โชว์เลขติดลบ (ผู้ใช้จะเห็น "—" แทนตัวเลขหลอก)
  var wildSrc = makeLagged(7, 2, 2.0, 61);
  var wildP = GL.compute(wildSrc.payload, wildSrc.btc, { changeWeeks: 6, lagScanMax: 20 }).projection;
  if (wildP && wildP.points.length) {
    var belowFull = wildP.points.filter(function (x) { return x.lo95 != null && x.lo95 <= -100; });
    t("มีเคสที่ขอบล่างต่ำกว่า -100% ไว้ทดสอบจริง", belowFull.length > 0, belowFull.length);
    t("ขอบล่างต่ำกว่า -100% ต้องคืน null ไม่ใช่ราคาติดลบ",
      belowFull.every(function (x) { return x.priceLo95 === null; }),
      belowFull.slice(0, 2).map(function (x) { return [x.lo95, x.priceLo95]; }));
    t("ไม่มีราคาติดลบหรือศูนย์หลุดออกมาเลย", wildP.points.every(function (x) {
      return ["price", "priceLo68", "priceHi68", "priceLo95", "priceHi95"].every(function (k) {
        return x[k] === null || x[k] > 0;
      });
    }));
    t("ค่ากลางยังมีราคาอยู่แม้ขอบล่างจะหลุด", wildP.points.every(function (x) {
      return x.price == null || x.price > 0;
    }));
  }
  t("ช่วงราคาแปลงมาจากช่วง % ตัวเดียวกัน", P8.points.every(function (x) {
    return near(x.priceHi95, x.baseClose * (1 + x.hi95 / 100), priceTol(x)) &&
           near(x.priceLo95, x.baseClose * (1 + x.lo95 / 100), priceTol(x));
  }), P8.points.slice(0, 1));
  t("ราคาต้องเป็นบวกเสมอ", P8.points.every(function (x) { return x.price > 0; }));
  t("ระบุที่มาของฐานราคาทุกจุด (จริง/ประมาณ)", P8.points.every(function (x) {
    return x.priceBasis === "observed" || x.priceBasis === "chained";
  }), P8.points.map(function (x) { return x.priceBasis; }));
  t("baseIndex ห่างจาก plotIndex เท่ากับ W พอดี", P8.points.every(function (x) {
    return x.plotIndex - x.baseIndex === Wc;
  }));
  // W สัปดาห์แรกของโซนล่วงหน้าเท่านั้นที่มีราคาจริงเป็นฐาน ที่เหลือเป็นการต่อลูกโซ่
  t("จุดที่ฐานเป็นราคาจริงต้องเป็น W จุดแรกเท่านั้น", (function () {
    var obs = P8.points.filter(function (x) { return x.priceBasis === "observed"; });
    if (obs.length !== Math.min(Wc, P8.points.length)) return false;
    return obs.every(function (x) { return x.weeksAhead <= Wc; });
  })(), [P8.observedBasisCount, Wc]);
  t("นับจำนวนจุดที่ฐานเป็นราคาจริงไว้ถูกต้อง",
    P8.observedBasisCount === P8.points.filter(function (x) { return x.priceBasis === "observed"; }).length,
    P8.observedBasisCount);
  // ฐานต้องไม่ใช่ราคาล่าสุด (เป็นกับดักที่ดูเหมือนถูก)
  t("ไม่ได้ใช้ราคาล่าสุดเป็นฐานของทุกจุด", (function () {
    var obs = P8.points.filter(function (x) { return x.priceBasis === "observed"; });
    if (obs.length < 2) return true;
    var first = obs[0].baseClose;
    return obs.some(function (x) { return !near(x.baseClose, first, 1e-9); });
  })(), P8.points.slice(0, 3).map(function (x) { return x.baseClose; }));
  // จุดที่ต่อลูกโซ่ ฐานต้องเท่ากับ "ราคาคาด" ของช่องที่อยู่ก่อนหน้า W สัปดาห์
  t("จุดต่อลูกโซ่ใช้ราคาคาดของช่องก่อนหน้า W สัปดาห์เป็นฐาน", (function () {
    var byPlot = {};
    P8.points.forEach(function (x) { byPlot[x.plotIndex] = x; });
    return P8.points.filter(function (x) { return x.priceBasis === "chained"; })
      .every(function (x) {
        var src = byPlot[x.baseIndex];
        return src && near(x.baseClose, src.price, Math.abs(x.baseClose) * 1e-6 + 1e-6);
      });
  })());

  // คณิตศาสตร์ของ OLS — ตรวจกับค่าที่คำนวณมือได้
  var ols = GL._internal.ols;
  var xs = [], ys = [], g;
  for (g = 0; g < 20; g++) { xs.push(g); ys.push(3 + 2 * g); }       // เส้นตรงเป๊ะ
  var f = ols(xs, ys);
  t("OLS: slope = 2", near(f.slope, 2, 1e-9), f.slope);
  t("OLS: intercept = 3", near(f.intercept, 3, 1e-9), f.intercept);
  t("เส้นตรงเป๊ะ → ความคลาดเคลื่อน ~0", f.se < 1e-9, f.se);
  t("เส้นตรงเป๊ะ → r = 1", near(f.r, 1, 1e-9), f.r);
  t("ข้อมูลน้อยเกินไป → ไม่ยอม fit", ols([1, 2, 3], [1, 2, 3]) === null);
  t("x ไม่มีความแปรปรวน → ไม่ยอม fit (กันหารศูนย์)",
    ols([5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) === null);

  // ช่วงพยากรณ์: ต้องใช้สูตร "ค่าสังเกตใหม่" (มี 1+ ในราก) ไม่ใช่ช่วงของค่าเฉลี่ย
  var xs2 = [], ys2 = [];
  var sd2 = 13; // ใส่ความคลาดเคลื่อนจริงเข้าไป ไม่งั้น se=0 แล้ววัดอัตราส่วนไม่ได้
  for (g = 0; g < 24; g++) { xs2.push(g); ys2.push(3 + 2 * g + (g % 2 ? sd2 : -sd2)); }
  var f2 = ols(xs2, ys2);
  var pb = GL._internal.predictBand(f2, 10);
  t("ช่วงพยากรณ์สมมาตรรอบค่ากลาง",
    near(pb.hi68 - pb.fit, pb.fit - pb.lo68, 1e-9) && near(pb.hi95 - pb.fit, pb.fit - pb.lo95, 1e-9));
  t("ช่วง 95% = 1.96 เท่าของช่วง 68%",
    near((pb.hi95 - pb.fit) / (pb.hi68 - pb.fit), 1.96, 1e-9),
    (pb.hi95 - pb.fit) / (pb.hi68 - pb.fit));
  t("ช่วงกว้างกว่า se เสมอ (เป็นช่วงของค่าสังเกตใหม่ ไม่ใช่ของค่าเฉลี่ย)",
    pb.hi68 - pb.fit > f2.se, [pb.hi68 - pb.fit, f2.se]);
  // se ต้องหารด้วย n−2 (เสีย degrees of freedom ไปกับ slope+intercept)
  // หารด้วย n จะได้ช่วงแคบกว่าความจริง = หลอกตัวเองว่าแม่นกว่าที่เป็น
  var ssExact = 0;
  for (g = 0; g < xs2.length; g++) {
    var resid = ys2[g] - (f2.intercept + f2.slope * xs2[g]);
    ssExact += resid * resid;
  }
  t("se หารด้วย n−2 ไม่ใช่ n (ไม่งั้นช่วงจะแคบกว่าความจริง)",
    near(f2.se, Math.sqrt(ssExact / (xs2.length - 2)), 1e-9) &&
    !near(f2.se, Math.sqrt(ssExact / xs2.length), 1e-9),
    [f2.se, Math.sqrt(ssExact / (xs2.length - 2)), Math.sqrt(ssExact / xs2.length)]);
  t("ยิ่งไกลจากค่ากลางของ x ช่วงยิ่งกว้าง",
    (GL._internal.predictBand(f2, 60).hi68 - GL._internal.predictBand(f2, 60).fit) >
    (pb.hi68 - pb.fit));
}
console.log("== leadSeries: เลื่อนไปข้างหน้า ==");
{
  var D7 = weeklyDates(30, "2026-10-07");
  var p7 = payloadOf({
    fed: rows(D7, function (i) { return 1000 + i * 10; }),
    ecb: rows(D7, function () { return 0; }),
    boj: rows(D7, function () { return 0; }),
    eur: rows(D7, function () { return 1; }),
    jpy: rows(D7, function () { return 1; })
  });
  var r7 = GL.compute(p7, [], { leadWeeks: 14 });
  var ls = GL.leadSeries(r7);
  t("ได้ชุดจุดที่เลื่อนแล้ว", ls.length > 0, ls.length);
  var withPlot = ls.filter(function (x) { return x.plotDate; });
  t("จุดที่ยังอยู่ในช่วงข้อมูล มีวันที่ปลายทาง", withPlot.length > 0);
  t("วันที่ปลายทางใหม่กว่าวันที่ต้นทางเสมอ",
    withPlot.every(function (x) { return x.plotDate > x.sourceDate; }));
  var future = ls.filter(function (x) { return x.future; });
  t("จุดที่เลยปลายข้อมูลถูกทำเครื่องหมาย future", future.length > 0, future.length);
  t("จุด future ไม่มีวันที่ปลายทาง (ไม่แต่งวันในอนาคต)",
    future.every(function (x) { return x.plotDate === null; }));
}

console.log("== เคสขอบ / ห้ามมีค่าผิดรูป ==");
{
  var bad = [];
  var cases = [
    ["ไม่ส่งอะไรเลย", undefined, undefined],
    ["payload ว่าง", {}, []],
    ["series ว่าง", payloadOf({}), []],
    ["Fed มีแถวเดียว", payloadOf({ fed: [{ date: "2026-10-07", value: 1 }] }), []],
    ["ค่าเป็น 0 ทั้งหมด", payloadOf({
      fed: rows(weeklyDates(10, "2026-10-07"), function () { return 0; }),
      ecb: rows(weeklyDates(10, "2026-10-07"), function () { return 0; }),
      boj: rows(weeklyDates(10, "2026-10-07"), function () { return 0; }),
      eur: rows(weeklyDates(10, "2026-10-07"), function () { return 1; }),
      jpy: rows(weeklyDates(10, "2026-10-07"), function () { return 1; })
    }), []],
    ["FX เป็น 0 (หารศูนย์)", payloadOf({
      fed: rows(weeklyDates(10, "2026-10-07"), function () { return 100; }),
      ecb: rows(weeklyDates(10, "2026-10-07"), function () { return 100; }),
      boj: rows(weeklyDates(10, "2026-10-07"), function () { return 100; }),
      eur: rows(weeklyDates(10, "2026-10-07"), function () { return 0; }),
      jpy: rows(weeklyDates(10, "2026-10-07"), function () { return 0; })
    }), []]
  ];
  cases.forEach(function (c) {
    var r;
    try { r = GL.compute(c[1], c[2]); }
    catch (e) { bad.push(c[0] + ": throw " + e.message); return; }
    if (!r || typeof r !== "object") { bad.push(c[0] + ": ไม่ได้ object"); return; }
    JSON.stringify(r, function (k, v) {
      if (typeof v === "number" && !isFinite(v)) bad.push(c[0] + "." + k + "=" + v);
      return v;
    });
    (r.weeks || []).forEach(function (w, wi) {
      Object.keys(w).forEach(function (k) {
        if (typeof w[k] === "number" && !isFinite(w[k])) bad.push(c[0] + ".weeks[" + wi + "]." + k);
        if (w[k] === undefined) bad.push(c[0] + ".weeks[" + wi + "]." + k + "=undefined");
      });
    });
  });
  t("ไม่มี NaN/Infinity/undefined และไม่ throw ในทุกเคส", bad.length === 0, bad.slice(0, 6));
  t("FX = 0 → ไม่ทำให้สัปดาห์นั้นครบ (กันหารศูนย์)", (function () {
    var r = GL.compute(cases[5][1], []);
    return r.weeks.every(function (w) { return w.complete === false; });
  })());
}

console.log("== API: อ่าน CSV ของ FRED ==");
{
  var parseCsv = API.__internals.parseCsv;
  var csv = "observation_date,WALCL\n2026-01-07,100\n2026-01-14,.\n2026-01-21,\n2026-01-28,200\nbadline\n";
  var out = parseCsv(csv);
  t("อ่านเฉพาะแถวที่ใช้ได้", out.length === 2, out);
  t("ทิ้งแถวที่ค่าเป็นจุด (วันหยุดของ FRED) ไม่แปลงเป็น 0",
    out.every(function (x) { return x.value !== 0; }), out);
  t("ค่าถูกต้องตามลำดับ", out[0].value === 100 && out[1].value === 200, out);
  t("ทิ้งบรรทัดที่ไม่ใช่รูปแบบวันที่", out.every(function (x) { return /^\d{4}-\d{2}-\d{2}$/.test(x.date); }));
  t("CSV ว่าง → ได้ array ว่าง ไม่ throw", parseCsv("").length === 0 && parseCsv(null).length === 0);

  var trim = API.__internals.trim;
  var rws = [{ date: "2020-01-01", value: 1 }, { date: "2026-01-01", value: 2 }];
  t("ตัดประวัติตามวันที่", trim(rws, "2025-01-01").length === 1);
  t("ตัดจนไม่เหลือ → คืนท้าย ๆ กลับมา ไม่ส่ง array ว่าง", trim(rws, "2099-01-01").length > 0);
}

console.log("== ไม่มีคำชี้นำซื้อขาย ==");
{
  var eng = fs.readFileSync(path.join(__dirname, "..", "public", "global-liquidity-engine.js"), "utf8");
  var ui = fs.readFileSync(path.join(__dirname, "..", "public", "global-liquidity-page.js"), "utf8");
  var code = (eng + ui).replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  t("ไม่มีคำ buy/sell ในโค้ด", !/\b(buy|sell)\b/i.test(code));
  t("ไม่มีคำชี้นำภาษาไทย", !/ควรซื้อ|ควรขาย|น่าซื้อ|ซื้อเลย/.test(eng + ui));
  t("UI ระบุว่าไม่ใช่สัญญาณซื้อขาย", ui.indexOf("ไม่ใช่สัญญาณซื้อขาย") >= 0);
  t("engine มี disclaimer ติดผลลัพธ์", GL.compute(payloadOf({
    fed: rows(weeklyDates(10, "2026-10-07"), function () { return 1; }),
    ecb: rows(weeklyDates(10, "2026-10-07"), function () { return 1; }),
    boj: rows(weeklyDates(10, "2026-10-07"), function () { return 1; }),
    eur: rows(weeklyDates(10, "2026-10-07"), function () { return 1; }),
    jpy: rows(weeklyDates(10, "2026-10-07"), function () { return 1; })
  }), []).disclaimer.indexOf("ไม่ใช่คำแนะนำ") >= 0);
  t("engine ไม่มี DOM/fetch (เป็นโมดูลบริสุทธิ์)",
    !/document\.|fetch\(|localStorage|XMLHttpRequest/.test(eng.replace(/typeof window/g, "")));
}

console.log("");
console.log(pass + fail + " checks · " + pass + " passed · " + fail + " failed");
process.exit(fail ? 1 : 0);
