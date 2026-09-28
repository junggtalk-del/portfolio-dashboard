// SMA200 RECLAIM — เทสต์แบบกำหนดผลได้ (deterministic)
// node scripts/sma200-reclaim-test.js
//
// ครอบ §23 TEST 1-16 + §24 full universe + เคสขอบที่สเปคไม่ได้สั่งแต่พังได้จริง
// กติกา: ห้ามผูกกับนาฬิกาจริง — ทุกเคสส่ง today เข้าไปเอง
"use strict";
var fs = require("fs");
var SR = require("../public/sma200-reclaim.js");
var TI = require("../public/technical-indicators.js");
var CE = require("../public/catalyst-engine.js");
var CQ = require("../public/catalyst-qualification.js");

var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; return; }
  fail++; console.error("  ✗ " + name + (extra !== undefined ? " — got: " + JSON.stringify(extra) : ""));
}
function near(a, b, eps) { return a != null && b != null && Math.abs(a - b) < (eps == null ? 1e-9 : eps); }

// ---------- ตัวสร้างวันทำการจริง (ข้ามเสาร์-อาทิตย์) ----------
// ใช้วันที่จริงเพื่อให้การตรวจความสดของข้อมูลถูกทดสอบจริง ไม่ใช่วันที่ปลอม
function tradingDates(n, endYmd) {
  var out = [];
  var ms = Date.UTC(+endYmd.slice(0, 4), +endYmd.slice(5, 7) - 1, +endYmd.slice(8, 10));
  while (out.length < n) {
    var d = new Date(ms);
    var dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) out.push(d.toISOString().slice(0, 10));
    ms -= 86400000;
  }
  return out.reverse();
}
function rep(n, v) { var a = []; for (var i = 0; i < n; i++) a.push(v); return a; }

var TODAY = "2026-09-25";          // ศุกร์ — วันอ้างอิงคงที่ของทุกเคส
function mk(closes, opts) {
  opts = opts || {};
  var dates = opts.dates || tradingDates(closes.length, opts.lastDate || "2026-09-24");
  return SR.detect({ closes: closes, dates: dates, today: opts.today || TODAY,
    lookbackBars: opts.lookbackBars, staleDays: opts.staleDays });
}

// ============================================================
console.log("== §6 ต้องใช้ตัวคำนวณ SMA ของระบบ ไม่เขียนสูตรซ้ำ ==");
{
  t("โมดูลไม่มีสูตร SMA ของตัวเอง (ไม่มี rollingSum/หารด้วย period ในไฟล์)", (function () {
    var src = fs.readFileSync(process.cwd() + "/public/sma200-reclaim.js", "utf8");
    // ถ้ามีใครกลับมาเขียนสูตรซ้ำ จะต้องมีการบวกสะสมแล้วหาร — จับคำที่บ่งชี้
    return src.indexOf("rollingSum") < 0 && !/\/\s*SMA_PERIOD/.test(src) &&
      src.indexOf("technical-indicators.js") >= 0;
  })());
  t("เรียก calculateSMA ตัวเดียวกับที่ทั้งเว็บใช้", SR._internal.smaCalc() === TI.calculateSMA);
  t("technical-indicators.js require ได้ (มี module.exports)", typeof TI.calculateSMA === "function");
}

console.log("== §23 TEST 1 — ปิดใต้เส้น แล้วปิดเหนือเส้น => RECLAIM ==");
{
  // 200 แท่งที่ 100 → SMA200[199] = 100 · แท่ง 200 ที่ 99 (ใต้เส้น) · แท่ง 201 ที่ 105 (เหนือเส้น)
  var c = rep(200, 100).concat([99, 105]);
  var r = mk(c);
  t("status = RECLAIM", r.status === "RECLAIM", r.status);
  t("detected = true", r.detected === true);
  t("signalDate = วันสุดท้าย", r.signalDate === tradingDates(202, "2026-09-24")[201], r.signalDate);
  t("previousClose = 99", r.previousClose === 99, r.previousClose);
  t("currentClose = 105", r.currentClose === 105, r.currentClose);
  // SMA200[200] = (199*100 + 99)/200 = 99.995
  t("previousSma200 = 99.995 (ปัดแสดงผล 2 ตำแหน่ง → 100)", near(r.previousSma200, 100, 1e-9), r.previousSma200);
  // SMA200[201] = (198*100 + 99 + 105)/200 = 100.02
  t("currentSma200 = 100.02", near(r.currentSma200, 100.02, 1e-9), r.currentSma200);
  t("previousDistancePct ติดลบ", r.previousDistancePct < 0, r.previousDistancePct);
  t("currentDistancePct เป็นบวก", r.currentDistancePct > 0, r.currentDistancePct);
  t("reclaimStrength = current - previous",
    near(r.reclaimStrengthPct, Math.round((r.currentDistancePct - r.previousDistancePct) * 100) / 100, 0.011),
    [r.reclaimStrengthPct, r.currentDistancePct, r.previousDistancePct]);
  t("barsSinceSignal = 0 (เกิดวันล่าสุด)", r.barsSinceSignal === 0, r.barsSinceSignal);
  t("stillAbove = true", r.stillAbove === true);
  // windowBars ต้องเป็น "จำนวนวันที่ตรวจได้จริง" ไม่ใช่ค่าหน้าต่างที่ขอไว้
  // ข้อมูล 202 วัน → มี SMA200 ตั้งแต่วันที่ 200 → ตรวจ transition ได้แค่ 2 วัน
  t("windowBars = 2 (ไม่ใช่ 60 — ห้ามนับวันที่ยังไม่มี SMA200)", r.windowBars === 2, r.windowBars);
  t("ไม่อ่าน SMA ก่อนที่มันจะเกิด: ทุกเหตุการณ์ต้องมี SMA200 ครบทั้งสองวัน",
    r.events.every(function (e) { return e.previousSma200 != null && e.currentSma200 != null; }));
}

console.log("== §23 TEST 2 — ปิด 'เท่ากับ' เส้นพอดี แล้วปิดเหนือเส้น => RECLAIM ==");
{
  // 200 แท่งที่ 100 → SMA200[199] = 100 พอดี และ close[199] = 100 พอดี (แตะเส้น)
  var c = rep(200, 100).concat([105]);
  var smaChk = TI.calculateSMA(c, 200);
  t("ยืนยันว่าวันก่อนหน้า close == SMA200 เป๊ะจริง (ไม่ใช่แค่ใกล้)",
    c[199] === smaChk[199], [c[199], smaChk[199]]);
  var r = mk(c);
  t("แตะเส้นแล้วปิดเหนือ => RECLAIM", r.status === "RECLAIM", r.status);
  t("previousDistancePct = 0 พอดี", r.previousDistancePct === 0, r.previousDistancePct);
  t("ไม่มีเพดานระยะห่าง: ระยะห่างเดิม 0% ก็ยังนับ", r.detected === true);
}

console.log("== §23 TEST 3 — เหนือเส้นอยู่แล้ว แล้วยังเหนือเส้น => NO_RECLAIM ==");
{
  // ต้องอยู่เหนือเส้น "ตลอดทั้งหน้าต่างที่ตรวจ" ไม่ใช่แค่สองวันท้าย
  // (ชุดแรกที่ลองคือ 200 แท่งที่ 100 แล้วกระโดดไป 120 ซึ่งมี transition จริงที่แท่ง 200)
  var c = rep(190, 100).concat(rep(12, 130));
  var sma = TI.calculateSMA(c, 200);
  t("ยืนยันว่าทุกวันในหน้าต่างอยู่เหนือเส้นจริง",
    c[199] > sma[199] && c[200] > sma[200] && c[201] > sma[201],
    [c[199], sma[199], c[201], sma[201]]);
  var r = mk(c);
  t("status = NO_RECLAIM", r.status === "NO_RECLAIM", r.status);
  t("detected = false", r.detected === false);
  t("ไม่มี signalDate", r.signalDate === null);
  t("stillAbove = true (ยืนเหนือเส้น แต่ไม่ใช่เหตุการณ์)", r.stillAbove === true);
}

console.log("== §23 TEST 4 — ปิด 'เท่ากับ' เส้นในวันปัจจุบัน => NO_RECLAIM (ต้อง > เท่านั้น) ==");
{
  // ออกแบบให้ close[200] == SMA200[200] เป๊ะในเลขฐานสอง:
  // idx 0..198 = 100.5 (199 แท่ง) · idx 199 = 1 · idx 200 = 100
  // SMA200[200] = (198*100.5 + 1 + 100)/200 = 20000/200 = 100 พอดี
  var c = rep(199, 100.5).concat([1, 100]);
  var sma = TI.calculateSMA(c, 200);
  t("ยืนยันว่า close[D] == SMA200[D] เป๊ะจริง (ถ้า float เพี้ยน เทสต์นี้ต้องแดง)",
    c[200] === sma[200], [c[200], sma[200]]);
  t("ยืนยันว่า close[D-1] < SMA200[D-1] จริง", c[199] < sma[199], [c[199], sma[199]]);
  var r = mk(c);
  t("ปิดเท่ากับเส้น => NO_RECLAIM", r.status === "NO_RECLAIM", r.status);
  t("currentDistancePct ปัจจุบัน = 0 แต่ไม่นับเป็นสัญญาณ", r.latestDistancePct === 0, r.latestDistancePct);
  t("stillAbove = false (เท่ากับ ไม่ใช่เหนือ)", r.stillAbove === false, r.stillAbove);
}

console.log("== §23 TEST 5 — ใต้เส้นทั้งสองวัน => NO_RECLAIM ==");
{
  var c = rep(200, 100).concat([80, 82]);
  var r = mk(c);
  t("status = NO_RECLAIM", r.status === "NO_RECLAIM", r.status);
  t("stillAbove = false", r.stillAbove === false);
  t("eventCount = 0", r.eventCount === 0);
}

console.log("== §23 TEST 6 — มีข้อมูลแค่ 199 วัน => DATA_INSUFFICIENT ==");
{
  var r = mk(rep(199, 100));
  t("199 วัน => DATA_INSUFFICIENT", r.status === "DATA_INSUFFICIENT", r.status);
  t("บอกจำนวนที่มีจริง", r.validObservations === 199, r.validObservations);
  t("ไม่แต่ง SMA200 ขึ้นมา", r.currentSma200 === null && r.latestSma200 === null);
  var r200 = mk(rep(200, 100));
  t("200 วัน (มี SMA200 วันเดียว เทียบ D-1 ไม่ได้) => DATA_INSUFFICIENT",
    r200.status === "DATA_INSUFFICIENT", r200.status);
  t("บอกเหตุผลว่าเทียบวันก่อนหน้าไม่ได้", r200.note.indexOf("ยังเทียบวันก่อนหน้าไม่ได้") >= 0, r200.note);
  // สองสถานการณ์นี้ต่างกันจริง ต้องอธิบายคนละแบบ ไม่ใช่ข้อความเดียวเหมารวม
  t("<200 วัน บอกว่า 'คำนวณ SMA200 ไม่ได้เลย' (คนละเหตุผลกับ =200)",
    r.note.indexOf("ต้องมีอย่างน้อย 200 วัน") >= 0 && r.note.indexOf("ยังเทียบวันก่อนหน้าไม่ได้") < 0, r.note);
  var r201 = mk(rep(201, 100));
  t("201 วัน => ตัดสินได้ (ไม่ใช่ DATA_INSUFFICIENT)", r201.status === "NO_RECLAIM", r201.status);
}

console.log("== §23 TEST 7 — ข้อมูลหาย => DATA_UNAVAILABLE / DATA_INSUFFICIENT ==");
{
  t("closes ว่าง => DATA_UNAVAILABLE", SR.detect({ closes: [], dates: [], today: TODAY }).status === "DATA_UNAVAILABLE");
  t("closes ไม่ใช่ array => DATA_UNAVAILABLE", SR.detect({ closes: null, today: TODAY }).status === "DATA_UNAVAILABLE");
  t("ไม่ส่งอะไรเลย => DATA_UNAVAILABLE", SR.detect().status === "DATA_UNAVAILABLE");
  // แท่งเสีย (null/NaN/<=0) ถูกตัดออกจาก 'วันทำการที่ใช้ได้' ตามสเปค §6
  var holes = rep(100, 100).concat([null, NaN, 0, -5, "", " "]).concat(rep(99, 100));
  var rh = mk(holes, { dates: tradingDates(holes.length, "2026-09-24") });
  t("แท่งเสีย 6 แท่ง ถูกตัดทิ้ง เหลือ 199 => DATA_INSUFFICIENT",
    rh.status === "DATA_INSUFFICIENT" && rh.validObservations === 199,
    [rh.status, rh.validObservations]);
  t("coercion ไม่กลืนค่าว่าง: '' และ ' ' ไม่กลายเป็น 0 ที่ผ่านด่าน",
    SR._internal.fin("") === null && SR._internal.fin(" ") === null && SR._internal.fin(null) === null);
  t("string ตัวเลขยังอ่านได้", SR._internal.fin("12.5") === 12.5);
}

console.log("== §23 TEST 8 — ยืนเหนือเส้น 5 วันติด => เหตุการณ์เดียว ==");
{
  var c = rep(200, 100).concat([95, 110, 111, 112, 113, 114]);
  var r = mk(c);
  t("มีเหตุการณ์เดียว ไม่ใช่ห้า", r.eventCount === 1, r.eventCount);
  t("status = RECLAIM", r.status === "RECLAIM");
  t("signalDate = วันที่ข้าม ไม่ใช่วันล่าสุด", r.barsSinceSignal === 4, r.barsSinceSignal);
  t("วันที่สัญญาณคือวันที่ 110 ไม่ใช่ 114", r.currentClose === 110, r.currentClose);
  t("ยืนเหนือเส้นต่ออีก 4 วัน ไม่สร้างสัญญาณใหม่", r.events.length === 1, r.events.map(function (e) { return e.signalDate; }));
}

console.log("== §23 TEST 9 — หลุดลงไปแล้วกลับขึ้นอีก => สองเหตุการณ์แยกกัน ==");
{
  // ขึ้น(1) → หลุดลง → ขึ้นอีก(2)
  var c = rep(200, 100).concat([95, 110, 111, 90, 88, 115, 116]);
  var r = mk(c);
  t("มีสองเหตุการณ์", r.eventCount === 2, r.events.map(function (e) { return e.signalDate + "@" + e.currentClose; }));
  t("เหตุการณ์แรกปิดที่ 110", r.events[0].currentClose === 110, r.events[0].currentClose);
  t("เหตุการณ์ที่สองปิดที่ 115", r.events[1].currentClose === 115, r.events[1].currentClose);
  t("รายงานเหตุการณ์ล่าสุดเป็นตัวแทน", r.currentClose === 115, r.currentClose);
  t("สองเหตุการณ์คนละวัน", r.events[0].signalDate !== r.events[1].signalDate);
  t("barsAgo เรียงจากเก่าไปใหม่", r.events[0].barsAgo > r.events[1].barsAgo,
    [r.events[0].barsAgo, r.events[1].barsAgo]);
}

console.log("== §23 TEST 15 — ห้ามมี NaN / Infinity / undefined ==");
{
  var cases = [
    ["ปกติ", rep(200, 100).concat([95, 110])],
    ["ข้อมูลน้อย", [1, 2, 3]],
    ["ว่าง", []],
    ["ค่าเท่ากันหมด", rep(260, 50)],
    ["ราคาเล็กมาก", rep(200, 0.01).concat([0.009, 0.02])],
    ["ราคาใหญ่มาก", rep(200, 1e9).concat([9e8, 2e9])],
    ["มีค่าเสียปน", rep(210, 100).concat([null, NaN, Infinity, -Infinity, 0, 105])],
  ];
  var bad = [];
  cases.forEach(function (cs) {
    var r = mk(cs[1], { dates: tradingDates(Math.max(1, cs[1].length), "2026-09-24") });
    JSON.stringify(r, function (k, v) {
      if (typeof v === "number" && !isFinite(v)) bad.push(cs[0] + "." + k + "=" + v);
      if (v === undefined && k !== "") bad.push(cs[0] + "." + k + "=undefined");
      return v;
    });
    // JSON.stringify กลืน undefined — ต้องไล่คีย์เองด้วย
    Object.keys(r).forEach(function (k) {
      if (r[k] === undefined) bad.push(cs[0] + "." + k + "=undefined(raw)");
      if (typeof r[k] === "number" && !isFinite(r[k])) bad.push(cs[0] + "." + k + "=" + r[k]);
    });
  });
  t("ทุกเคสไม่มี NaN/Infinity/undefined", bad.length === 0, bad.slice(0, 8));
  t("ราคา Infinity ในชุดข้อมูลถูกตัดทิ้ง ไม่หลุดเข้าการคำนวณ",
    mk(rep(210, 100).concat([Infinity, 105])).validObservations === 211, undefined);
  // ตัวคำนวณระยะห่างต้องกันหารด้วยศูนย์ด้วยตัวเอง ไม่พึ่งว่าชั้นบนกรองมาให้แล้ว
  t("distPct กันหารด้วยศูนย์/ค่าติดลบเอง (ไม่พึ่งตัวกรองชั้นบน)",
    SR._internal.distPct(10, 0) === null && SR._internal.distPct(10, -5) === null &&
    SR._internal.distPct(10, null) === null && SR._internal.distPct(null, 10) === null,
    [SR._internal.distPct(10, 0), SR._internal.distPct(10, -5)]);
  t("distPct คืนค่าปกติเมื่ออินพุตปกติ", SR._internal.distPct(110, 100) === 10.000000000000009 ||
    Math.abs(SR._internal.distPct(110, 100) - 10) < 1e-9, SR._internal.distPct(110, 100));
}

console.log("== §23 TEST 16 — ใช้เฉพาะแท่งที่ปิดแล้ว ==");
{
  var c = rep(200, 100).concat([95, 110]);
  var d = tradingDates(202, "2026-09-25");   // แท่งสุดท้าย = วันนี้ = แท่งที่ยังไม่ปิด
  var r = SR.detect({ closes: c, dates: d, today: "2026-09-25" });
  t("แท่งของวันนี้ถูกตัดออก", r.excludedPartialBar === "2026-09-25", r.excludedPartialBar);
  t("เหลือ 201 วันที่ใช้ได้", r.validObservations === 201, r.validObservations);
  t("asOf = วันทำการก่อนหน้า ไม่ใช่วันนี้", r.asOf === d[200] && r.asOf !== "2026-09-25", r.asOf);
  // แท่งวันนี้ (110) ถูกตัด → เหลือ [.., 95] ซึ่งอยู่ใต้เส้น → ไม่มีสัญญาณ
  t("สัญญาณของแท่งที่ยังไม่ปิด ไม่ถูกนับ", r.status === "NO_RECLAIM", r.status);
  // วันถัดมาแท่งเดียวกันปิดแล้ว → สัญญาณโผล่
  var r2 = SR.detect({ closes: c, dates: d, today: "2026-09-28" });
  t("พอแท่งนั้นปิดแล้ว สัญญาณจึงนับ", r2.status === "RECLAIM" && r2.excludedPartialBar === null, r2.status);
  t("ไม่มีการมองอนาคต: วันที่สัญญาณต้องไม่ใหม่กว่า asOf", r2.signalDate <= r2.asOf, [r2.signalDate, r2.asOf]);
}

console.log("== §17 ความสดของข้อมูล ==");
{
  var c = rep(200, 100).concat([95, 110]);
  var old = tradingDates(202, "2026-08-10");
  var r = SR.detect({ closes: c, dates: old, today: TODAY });
  t("ข้อมูลเก่า 46 วัน => DATA_STALE", r.status === "DATA_STALE", [r.status, r.staleDays]);
  t("บอกวันของข้อมูลตามจริง", r.asOf === "2026-08-10", r.asOf);
  t("ไม่นับเป็นสัญญาณของวันนี้", r.detected === false);
  t("แต่ไม่ซ่อนสิ่งที่ตรวจพบ (ยังบอก signalDate ได้)", r.signalDate === "2026-08-10", r.signalDate);
  var fresh = SR.detect({ closes: c, dates: tradingDates(202, "2026-09-24"), today: TODAY });
  t("ข้อมูล 1 วันก่อน => ไม่ stale", fresh.stale === false && fresh.status === "RECLAIM", [fresh.staleDays, fresh.status]);
  var edge7 = SR.detect({ closes: c, dates: tradingDates(202, "2026-09-18"), today: TODAY });
  t("เก่า 7 วันพอดี => ยังไม่ stale (เกณฑ์คือ > 7)", edge7.stale === false && edge7.staleDays === 7, [edge7.staleDays, edge7.status]);
  var edge8 = SR.detect({ closes: c, dates: tradingDates(202, "2026-09-17"), today: TODAY });
  t("เก่า 8 วัน => stale", edge8.status === "DATA_STALE" && edge8.staleDays === 8, [edge8.staleDays, edge8.status]);
  var noDate = SR.detect({ closes: c, dates: rep(202, null), today: TODAY });
  t("ไม่มีวันที่เลย => บอกตรง ๆ ว่าไม่ทราบความสด ไม่แอบอ้างว่าสด",
    noDate.freshnessKnown === false && noDate.asOf === null && noDate.staleDays === null,
    [noDate.freshnessKnown, noDate.asOf]);
  t("ไม่ทราบความสด แต่ยังตัดสินกฎได้", noDate.status === "RECLAIM", noDate.status);
  var future = SR.detect({ closes: c, dates: tradingDates(202, "2026-10-30"), today: TODAY });
  t("วันที่ในอนาคต ไม่กลายเป็นค่าติดลบ", future.staleDays === 0 && future.stale === false, future.staleDays);
}

console.log("== §15 การเกิดซ้ำ / หน้าต่างย้อนหลัง ==");
{
  // สัญญาณเก่ากว่าหน้าต่าง → ไม่ถูกรายงานว่าเป็นสัญญาณ
  var c = rep(200, 100).concat([95, 110]).concat(rep(70, 120));
  var r = mk(c);
  t("สัญญาณเก่ากว่า 60 วันทำการ => NO_RECLAIM (ไม่ใช่หลักฐานเร็ว ๆ นี้)",
    r.status === "NO_RECLAIM", [r.status, r.windowBars]);
  t("แต่ยังบอกได้ว่าตอนนี้ยืนเหนือเส้น", r.stillAbove === true);
  t("windowBars = 60 ตามค่าตั้งต้น", r.windowBars === 60, r.windowBars);
  var wide = mk(c, { lookbackBars: 200 });
  t("ขยายหน้าต่างแล้วเจอสัญญาณเดิม", wide.status === "RECLAIM" && wide.barsSinceSignal === 70,
    [wide.status, wide.barsSinceSignal]);
}

console.log("== §19 สแกนสด vs อ่านจาก cache ต้องได้คำตอบเดียวกันเป๊ะ ==");
{
  // cache ของหน้า Catalyst Hunter เก็บ 272 แท่ง (slice(-CONFIG.bars.year - 20))
  var CACHE_BARS = CE.CONFIG.bars.year + 20;
  t("cache เก็บ 272 แท่ง และ 200+60 = 260 <= 272 (หน้าต่างอยู่ในงบ)",
    CACHE_BARS === 272 && SR.SMA_PERIOD + SR.LOOKBACK_BARS <= CACHE_BARS,
    [CACHE_BARS, SR.SMA_PERIOD + SR.LOOKBACK_BARS]);

  var full = [];
  for (var i = 0; i < 1250; i++) full.push(100 + Math.sin(i / 7) * 12 + i * 0.01);
  var fullD = tradingDates(1250, "2026-09-24");
  var rFull = SR.detect({ closes: full, dates: fullD, today: TODAY });
  var rCache = SR.detect({ closes: full.slice(-CACHE_BARS), dates: fullD.slice(-CACHE_BARS), today: TODAY });
  t("ข้อมูลเต็ม 1250 แท่ง กับ cache 272 แท่ง ให้ผลเหมือนกันทุกฟิลด์ (ยกเว้นจำนวนแท่งที่อ่าน)",
    JSON.stringify(Object.assign({}, rFull, { validObservations: 0 })) ===
    JSON.stringify(Object.assign({}, rCache, { validObservations: 0 })),
    [rFull.status, rCache.status, rFull.signalDate, rCache.signalDate]);
  t("ทั้งสองเส้นทางเจอสัญญาณจริง (ไม่ใช่เท่ากันเพราะว่างทั้งคู่)",
    rFull.status === "RECLAIM" || rFull.eventCount > 0, [rFull.status, rFull.eventCount]);
}

console.log("== §8/§9/§14 ตัวเลขบรรยาย ไม่ใช่คะแนน ==");
{
  var c = rep(200, 100).concat([92, 106]);
  var r = mk(c);
  // previousDistancePct = (92/99.96 - 1)*100 ≈ -7.96 · currentDistancePct = (106/100.03 - 1)*100 ≈ +5.97
  t("previousDistancePct คิดจาก previousSma200 เป็นฐาน",
    near(r.previousDistancePct, Math.round((92 / ((199 * 100 + 92) / 200) - 1) * 10000) / 100, 0.011),
    r.previousDistancePct);
  t("currentDistancePct คิดจาก currentSma200 เป็นฐาน",
    near(r.currentDistancePct, Math.round((106 / ((198 * 100 + 92 + 106) / 200) - 1) * 10000) / 100, 0.011),
    r.currentDistancePct);
  t("reclaimStrength = ผลต่างของสองระยะ (หน่วย pp)",
    near(r.reclaimStrengthPct, r.currentDistancePct - r.previousDistancePct, 0.011),
    [r.reclaimStrengthPct, r.currentDistancePct - r.previousDistancePct]);

  var src = fs.readFileSync(process.cwd() + "/public/sma200-reclaim.js", "utf8");
  // ตัดคอมเมนต์ก่อนตรวจ — คอมเมนต์ที่ "ห้าม" คำเหล่านี้ก็มีคำนั้นอยู่ด้วย
  var code = src.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  t("ไม่มีคำว่า score/ranking/percentile ในโค้ดจริง",
    !/\bscore\b/i.test(code) && !/\bpercentile\b/i.test(code) && !/\brank\b/i.test(code));
  t("ไม่มีการ sort ใด ๆ ในโมดูล (ไม่จัดอันดับ)", code.indexOf(".sort(") < 0);
  t("ไม่มีคำว่า buy/sell ในโค้ดจริง", !/\b(buy|sell)\b/i.test(code));
  t("ผลลัพธ์ไม่มีฟิลด์ที่เป็นคะแนนรวม",
    Object.keys(r).filter(function (k) { return /score|rank|rating|grade/i.test(k); }).length === 0,
    Object.keys(r));
}

// ============================================================
// §10-§12, §20 · TEST 10-14 — ต้องไม่ไปแตะตรรกะเดิมของ Catalyst Hunter
// ============================================================
console.log("== §20 ชั้นเทคนิคต้องไม่เปลี่ยนผลของ engine เดิมเลย ==");
{
  function series(opt) {
    opt = opt || {};
    var up = opt.upBars == null ? 300 : opt.upBars;
    var down = opt.downBars == null ? 200 : opt.downBars;
    var bounce = opt.bounceBars == null ? 60 : opt.bounceBars;
    var drop = opt.dropPct == null ? 0.5 : opt.dropPct;
    var bouncePct = opt.bouncePct == null ? 0 : opt.bouncePct;
    var closes = [], volumes = [];
    var start = 20, peak = start + up * 0.05;
    for (var i = 0; i < up; i++) { closes.push(start + i * 0.05); volumes.push(1e6); }
    var low = peak * (1 - drop);
    for (var j = 0; j < down; j++) { closes.push(peak * (1 - drop * (j + 1) / down)); volumes.push(1e6); }
    for (var k = 0; k < bounce; k++) { closes.push(low * (1 + bouncePct * (k + 1) / bounce)); volumes.push(1e6); }
    return { ticker: opt.ticker || "TEST", name: "Test PCL", market: "SET",
      closes: closes, volumes: volumes, dates: tradingDates(closes.length, "2026-09-24"),
      benchCloses: rep(closes.length, 100), benchSymbol: "^SET.BK", source: "test" };
  }

  // หุ้นที่มี SMA200 reclaim จริง ๆ ในระนาบเทคนิค (เด้ง 30% ยังไม่ถึงเส้น จึงใช้ 80%)
  var pf = series({ dropPct: 0.55, bouncePct: 0.80 });
  var tech = SR.detect({ closes: pf.closes, dates: pf.dates, today: TODAY });
  t("fixture นี้มี reclaim จริง (ไม่งั้นเทสต์ 10-14 ว่างเปล่า)",
    tech.status === "RECLAIM", [tech.status, tech.eventCount]);

  // TEST 13/14 — ผล engine ต้องเหมือนเดิมเป๊ะ ไม่ว่าจะมีชั้นเทคนิคหรือไม่
  var before = JSON.stringify(CE.analyze(pf, null, null));
  var afterObj = CE.analyze(pf, null, null);
  afterObj.technical = tech;                       // ชั้นเทคนิคถูก "แปะ" ทีหลัง ไม่ได้ป้อนเข้า engine
  var after = JSON.stringify(afterObj.technical ? (function () {
    var cp = JSON.parse(JSON.stringify(afterObj)); delete cp.technical; return cp;
  })() : afterObj);
  t("TEST 13 — ผลของ engine ไม่เปลี่ยนเลยเมื่อมีชั้นเทคนิค (เทียบทั้งก้อน)", before === after);

  var a = CE.analyze(pf, null, null);
  t("TEST 14 — reclaim ไม่สร้าง C3/C4/C5", ["C3_CONFIRMED", "C4_FINANCIAL_EVIDENCE", "C5_MARKET_RECOGNIZED"]
    .indexOf(a.catalyst.maturity.key) < 0, a.catalyst.maturity.key);
  t("TEST 11 — ไม่มี catalyst + reclaim ไม่กลายเป็น EARLY_CATALYST",
    a.state.key !== "EARLY_CATALYST" && a.state.key !== "STRONG_EARLY_CATALYST", a.state.key);
  t("TEST 13 — catalyst maturity ยังเป็น NONE (ราคาไม่สร้าง catalyst)",
    a.catalyst.maturity.key === "NONE", a.catalyst.maturity.key);

  // reclaim ไม่ได้ถูกส่งเข้า engine เลย — พิสูจน์ด้วยการอ่านซอร์ส
  var eng = fs.readFileSync(process.cwd() + "/public/catalyst-engine.js", "utf8");
  var qual = fs.readFileSync(process.cwd() + "/public/catalyst-qualification.js", "utf8");
  t("catalyst-engine.js ไม่รู้จัก SMA200 reclaim เลย",
    !/sma200|Sma200Reclaim|SMA200_RECLAIM/i.test(eng));
  t("catalyst-qualification.js ไม่รู้จัก SMA200 reclaim เลย",
    !/sma200|Sma200Reclaim|SMA200_RECLAIM/i.test(qual));

  // TEST 10 — value trap HIGH ต้องไม่ถูกลบล้าง
  var qHigh = CQ.qualify({
    drawdown: { available: true, state: { key: "SEVERE_DRAWDOWN", rank: 3 }, drawdown52wPct: -50 },
    catalyst: { availability: { key: "CATALYST_IDENTIFIED" }, maturity: { key: "C3_CONFIRMED", n: 3 } },
    financialInflection: null,
    recognition: { state: { key: "EARLY", n: 0 } },
    valueTrap: { risk: { key: "HIGH" }, signals: [1, 2, 3] },
    lifecycle: "EARLY",
  });
  t("TEST 10 — value trap HIGH ยังเป็น VALUE_TRAP_RISK (ชั้นเทคนิคไม่มีสิทธิ์แตะ)",
    qHigh.state.key === "VALUE_TRAP_RISK", qHigh.state.key);
  t("TEST 10 — qualify() ไม่รับพารามิเตอร์ technical ใด ๆ",
    qual.indexOf("technical") < 0 || !/function qualify[\s\S]{0,400}technical/.test(qual));

  // TEST 12 — C3 + ย่อลึก + reclaim: สถานะยังมาจากกฎเดิมล้วน
  var qC3 = CQ.qualify({
    drawdown: { available: true, state: { key: "DEEP_DRAWDOWN", rank: 2 }, drawdown52wPct: -35 },
    catalyst: { availability: { key: "CATALYST_IDENTIFIED" }, maturity: { key: "C3_CONFIRMED", n: 3 },
      businessEventCount: 2 },
    financialInflection: null,
    recognition: { state: { key: "EARLY", n: 0 } },
    valueTrap: { risk: { key: "LOW" }, signals: [] },
    lifecycle: "EARLY",
  });
  var qC3b = CQ.qualify({
    drawdown: { available: true, state: { key: "DEEP_DRAWDOWN", rank: 2 }, drawdown52wPct: -35 },
    catalyst: { availability: { key: "CATALYST_IDENTIFIED" }, maturity: { key: "C3_CONFIRMED", n: 3 },
      businessEventCount: 2 },
    financialInflection: null,
    recognition: { state: { key: "EARLY", n: 0 } },
    valueTrap: { risk: { key: "LOW" }, signals: [] },
    lifecycle: "EARLY",
    technical: { type: "SMA200_RECLAIM", detected: true },     // แอบยัดเข้าไป
  });
  t("TEST 12 — ยัด technical เข้า qualify() แล้วผลไม่เปลี่ยน (ชั้นนั้นไม่อ่านมันเลย)",
    JSON.stringify(qC3) === JSON.stringify(qC3b), [qC3.state.key, qC3b.state.key]);

  // §10 — market recognition ต้องไม่ถูกเลื่อนขั้นเพราะ reclaim
  var recogBefore = CE._internal.computeRecognition(pf.closes, pf.volumes, pf.benchCloses,
    CE._internal.computeDrawdown(pf.closes, pf.dates));
  t("§10 — market recognition คำนวณจากของเดิมล้วน ไม่มี reclaim อยู่ในนั้น",
    recogBefore.evidence.every(function (e) { return e.indexOf("SMA200") < 0; }),
    recogBefore.evidence);
}

console.log("== §24 full universe — นับผลรวมได้ และไม่ตรึงจำนวน ticker ==");
{
  var list = [
    SR.detect({ closes: rep(200, 100).concat([95, 110]), dates: tradingDates(202, "2026-09-24"), today: TODAY }),
    SR.detect({ closes: rep(200, 100).concat([95, 96]), dates: tradingDates(202, "2026-09-24"), today: TODAY }),
    SR.detect({ closes: rep(150, 100), dates: tradingDates(150, "2026-09-24"), today: TODAY }),
    SR.detect({ closes: [], dates: [], today: TODAY }),
    SR.detect({ closes: rep(200, 100).concat([95, 110]), dates: tradingDates(202, "2026-06-01"), today: TODAY }),
  ];
  var s = SR.summarize(list);
  t("นับครบทุกตัว", s.scanned === 5, s);
  t("reclaim = 1", s.reclaim === 1, s.reclaim);
  t("noReclaim = 1", s.noReclaim === 1, s.noReclaim);
  t("insufficient = 1", s.insufficient === 1, s.insufficient);
  t("unavailable = 1", s.unavailable === 1, s.unavailable);
  t("stale = 1", s.stale === 1, s.stale);
  t("ผลรวมของทุกช่อง = จำนวนที่สแกน (ไม่มีตัวไหนถูกนับซ้ำหรือตกหล่น)",
    s.reclaim + s.noReclaim + s.insufficient + s.unavailable + s.stale === s.scanned, s);
  t("withSma200History นับเฉพาะตัวที่ผ่านด่านข้อมูล", s.withSma200History === 3, s.withSma200History);
  t("latestDataDate = วันที่ใหม่สุดในชุด", s.latestDataDate === "2026-09-24", s.latestDataDate);
  t("summarize ของ input ผิดรูป ไม่พัง", SR.summarize(null).scanned === 0 && SR.summarize("x").scanned === 0);

  // จักรวาลต้องมาจากตัวเดิม ไม่มีลิสต์ hard-code ใหม่
  var apiSrc = fs.readFileSync(process.cwd() + "/api/catalyst-scan.js", "utf8");
  t("§3 API ยังใช้ THAI_ALL เป็นค่าเริ่มต้น", /universe\s*=\s*.*THAI_ALL/.test(apiSrc));
  t("§3 ไม่มีจักรวาลใหม่ถูกเพิ่มใน API", apiSrc.indexOf("SMA200") < 0);
  var pageSrc = fs.readFileSync(process.cwd() + "/public/catalyst-page.js", "utf8");
  t("§3 หน้าเว็บยังขอ universe เดิมตัวเดียว",
    (pageSrc.match(/universe=/g) || []).length === 1 && pageSrc.indexOf('universe: "THAI_ALL"') >= 0);
  t("§3 ไม่มีลิสต์ ticker ตรึงไว้ในโมดูลใหม่",
    !/\b(PTT|ADVANC|AOT|CPALL|SCB)\b/.test(fs.readFileSync(process.cwd() + "/public/sma200-reclaim.js", "utf8")));
  t("§19 ไม่มี fetch/XHR/localStorage ในโมดูลใหม่ (ไม่ยิง API ต่อหุ้น)", (function () {
    var src = fs.readFileSync(process.cwd() + "/public/sma200-reclaim.js", "utf8");
    return !/fetch\(|XMLHttpRequest|localStorage|indexedDB|document\./.test(src);
  })());
  t("§19 ไม่มี endpoint ใหม่ใน vercel.json", (function () {
    var v = fs.readFileSync(process.cwd() + "/vercel.json", "utf8");
    return v.indexOf("sma200") < 0 && v.toLowerCase().indexOf("reclaim") < 0;
  })());
  // app-navigation.js มีคำว่า daysSinceSma200Reclaim อยู่แล้วจากสาย Scoring ของพอร์ต (คนละระนาบ)
  // สิ่งที่ห้ามคือ "เมนูใหม่" ไม่ใช่คำว่า sma200
  // ระวัง: "sma" ลอย ๆ ไปชนกับ smart-dca — ต้องใช้ token ที่เจาะจงจริง
  t("§2 ไม่มีเมนูใหม่ใน SIDEBAR", (function () {
    var nav = fs.readFileSync(process.cwd() + "/public/app-navigation.js", "utf8");
    return !/p:\s*"\/[^"]*(?:sma200|reclaim|technical-scanner)[^"]*"/i.test(nav);
  })());
  t("§2 ไม่มีไฟล์หน้าเว็บใหม่โผล่มาในโฟลเดอร์ public",
    fs.readdirSync(process.cwd() + "/public").filter(function (f) {
      return /\.html$/.test(f) && /sma200|reclaim|technical/i.test(f);
    }).length === 0);
  t("§2 จำนวนหน้า HTML เท่าเดิม (18 หน้า)",
    fs.readdirSync(process.cwd() + "/public").filter(function (f) { return /\.html$/.test(f); }).length === 18);
}

console.log("== เงื่อนไขวอลุ่ม: สูงกว่าค่าเฉลี่ย 10 วันก่อนหน้าเกิน 20% ==");
{
  var VB = 1000000;
  // ราคา 202 แท่ง — สัญญาณอยู่ที่ดัชนี 201
  var vc = rep(200, 100).concat([95, 110]);
  var vd = tradingDates(202, "2026-09-24");
  function withVol(mult, opt) {
    var v = rep(202, VB);
    v[201] = typeof mult === "number" ? Math.round(VB * mult) : mult;
    if (opt && opt.mutate) opt.mutate(v);
    return SR.detect({ closes: vc, dates: vd, volumes: v, today: TODAY,
      volumeMinPct: opt && opt.minPct });
  }

  t("ค่าคงที่ตรงตามที่สั่ง: 10 วัน · เกิน 20%",
    SR.VOLUME_LOOKBACK === 10 && SR.VOLUME_MIN_PCT === 20, [SR.VOLUME_LOOKBACK, SR.VOLUME_MIN_PCT]);

  var r2x = withVol(2.0);
  t("วอลุ่ม 2 เท่า (+100%) => ผ่าน", r2x.volumeConfirmed === true, r2x.volumeVsAvgPct);
  t("รายงานวอลุ่มวันสัญญาณตามจริง", r2x.volume === 2000000, r2x.volume);
  t("ค่าเฉลี่ยคิดจาก 10 วันก่อนหน้า ไม่รวมวันสัญญาณ", r2x.volumeAvg === VB, r2x.volumeAvg);
  t("ใช้ตัวอย่างครบ 10 วัน", r2x.volumeSamples === 10, r2x.volumeSamples);
  t("ส่วนต่าง = +100%", near(r2x.volumeVsAvgPct, 100, 1e-9), r2x.volumeVsAvgPct);

  t("+20.0001% => ผ่าน (เกินเกณฑ์)", withVol(1.200001).volumeConfirmed === true);
  // 1.2 ไม่ใช่เลขที่แทนได้เป๊ะในฐานสอง — (1.2-1)*100 จึงไม่เท่ากับ 20 พอดี
  // จะทดสอบ "เท่ากับเกณฑ์พอดี" ต้องใช้อัตราส่วนที่เป๊ะจริง เช่น 1.25 → 25% เป๊ะ
  var exact25 = withVol(1.25, { minPct: 25 });
  t("ยืนยันว่าส่วนต่าง = 25% เป๊ะจริงในเลขฐานสอง (ไม่งั้นเทสต์ขอบนี้ไม่ได้ทดสอบอะไร)",
    exact25.volumeVsAvgPct === 25 && (1250000 / 1000000 - 1) * 100 === 25, exact25.volumeVsAvgPct);
  t("เท่ากับเกณฑ์พอดี => ไม่ผ่าน (เกณฑ์คือ 'มากกว่า' ไม่ใช่ 'ตั้งแต่')",
    exact25.volumeConfirmed === false, exact25.volumeConfirmed);
  // ตัวคูณต้องใหญ่พอให้รอดจาก Math.round ของตัวช่วยสร้างวอลุ่ม
  // (1.2500001 × 1,000,000 ปัดกลับเป็น 1,250,000 → กลายเป็นเคสเดียวกับ 25% พอดี)
  t("เกินเกณฑ์นิดเดียว (25.0001%) => ผ่าน", (function () {
    var r = withVol(1.250001, { minPct: 25 });
    return r.volumeConfirmed === true && r.volume === 1250001;
  })(), withVol(1.250001, { minPct: 25 }).volumeVsAvgPct);
  t("+19.9999% => ไม่ผ่าน", withVol(1.199999).volumeConfirmed === false);
  t("วอลุ่มเท่าเดิม (+0%) => ไม่ผ่าน", withVol(1.0).volumeConfirmed === false);
  t("วอลุ่มต่ำกว่าเฉลี่ย => ไม่ผ่าน", withVol(0.5).volumeConfirmed === false);
  t("ขอบ 20% ตัดสินจากค่าดิบ ไม่ใช่ค่าที่ปัดแล้ว (19.9999 กับ 20.0001 ปัดได้ 20 เท่ากัน)",
    withVol(1.199999).volumeVsAvgPct === withVol(1.200001).volumeVsAvgPct &&
    withVol(1.199999).volumeConfirmed !== withVol(1.200001).volumeConfirmed,
    [withVol(1.199999).volumeVsAvgPct, withVol(1.200001).volumeVsAvgPct]);

  // "ตรวจไม่ได้" ต้องเป็น null ห้ามเป็น false — ไม่มีข้อมูล ≠ ไม่ผ่าน
  t("ไม่ส่ง volumes เลย => ตรวจไม่ได้ (null) ไม่ใช่ไม่ผ่าน",
    SR.detect({ closes: vc, dates: vd, today: TODAY }).volumeConfirmed === null);
  // ต้องใช้ชุดที่ "ยาวกว่า" และมีค่าที่ดัชนีสัญญาณจริง ๆ ไม่งั้นจะได้ null
  // เพราะอ่านไม่เจอ ซึ่งเป็นคนละเหตุผลกับ "ปฏิเสธเพราะจับคู่ไม่ได้"
  t("volumes ยาวไม่ตรงกับ closes => ตรวจไม่ได้ (ปฏิเสธเพราะจับคู่ไม่ได้ ไม่ใช่เพราะอ่านไม่เจอ)",
    SR.detect({ closes: vc, dates: vd, volumes: rep(400, VB * 9), today: TODAY }).volumeConfirmed === null,
    SR.detect({ closes: vc, dates: vd, volumes: rep(400, VB * 9), today: TODAY }).volumeVsAvgPct);
  t("volumes สั้นกว่า closes => ตรวจไม่ได้",
    SR.detect({ closes: vc, dates: vd, volumes: rep(50, VB), today: TODAY }).volumeConfirmed === null);
  t("วอลุ่มวันสัญญาณเป็น null => ตรวจไม่ได้", withVol(null).volumeConfirmed === null);
  t("วอลุ่มวันสัญญาณเป็น 0 => ตรวจไม่ได้ (ไม่ใช่ไม่ผ่าน)", withVol(0).volumeConfirmed === null);
  t("วอลุ่มติดลบ => ตรวจไม่ได้", withVol(-5).volumeConfirmed === null);

  // ตัวอย่างย้อนหลังไม่พอ
  var few = withVol(3.0, { mutate: function (v) {
    for (var i = 191; i <= 200; i++) if (i < 197) v[i] = null;   // เหลือใช้ได้ 4 จาก 10
  } });
  t("วอลุ่มย้อนหลังใช้ได้ 4 จาก 10 => ตรวจไม่ได้ (ต้องมีอย่างน้อย 6)",
    few.volumeConfirmed === null && few.volumeSamples === 4, [few.volumeConfirmed, few.volumeSamples]);
  var six = withVol(3.0, { mutate: function (v) {
    for (var i = 191; i <= 194; i++) v[i] = null;                // เหลือใช้ได้ 6 จาก 10
  } });
  t("วอลุ่มย้อนหลังใช้ได้ 6 จาก 10 => ตัดสินได้",
    six.volumeConfirmed === true && six.volumeSamples === 6, [six.volumeConfirmed, six.volumeSamples]);
  t("ค่าเฉลี่ยคิดจากเฉพาะวันที่ใช้ได้ ไม่หารด้วย 10 เสมอ", six.volumeAvg === VB, six.volumeAvg);

  // ค่าเฉลี่ยต้องไม่รวมวันสัญญาณ — ถ้ารวม ค่าเฉลี่ยจะถูกดันขึ้นและเกณฑ์จะอ่อนลงเอง
  t("วันสัญญาณไม่ถูกนับเข้าค่าเฉลี่ยของตัวเอง", (function () {
    var v = rep(202, VB);
    v[201] = VB * 100;                 // พุ่ง 100 เท่า
    var r = SR.detect({ closes: vc, dates: vd, volumes: v, today: TODAY });
    return r.volumeAvg === VB;         // ถ้ารวมตัวเอง ค่าเฉลี่ยจะกลายเป็น ~10x
  })());

  t("ปรับเกณฑ์ได้เพื่อทดสอบ (volumeMinPct)",
    withVol(1.1, { minPct: 5 }).volumeConfirmed === true &&
    withVol(1.1, { minPct: 50 }).volumeConfirmed === false);

  t("เหตุการณ์แต่ละอันมีค่าวอลุ่มของตัวเอง", (function () {
    var c2 = rep(200, 100).concat([95, 110, 111, 90, 88, 115, 116]);
    var v2 = rep(c2.length, VB);
    v2[201] = VB * 3;                  // เหตุการณ์แรกวอลุ่มพุ่ง
    v2[205] = VB;                      // เหตุการณ์ที่สองวอลุ่มเท่าเดิม
    var r = SR.detect({ closes: c2, dates: tradingDates(c2.length, "2026-09-24"),
      volumes: v2, today: TODAY });
    return r.eventCount === 2 && r.events[0].volumeConfirmed === true &&
      r.events[1].volumeConfirmed === false &&
      r.volumeConfirmed === false;     // ระดับบนสุดรายงานของ "เหตุการณ์ล่าสุด"
  })());

  t("เงื่อนไขวอลุ่มไม่เปลี่ยน status ของการ reclaim (คนละมิติ)",
    withVol(1.0).status === "RECLAIM" && withVol(3.0).status === "RECLAIM",
    [withVol(1.0).status, withVol(3.0).status]);

  t("ไม่มี NaN/Infinity จากฟิลด์วอลุ่มในทุกเคส", (function () {
    var bad = [];
    [2.0, 1.0, 0, -1, null, 1e12].forEach(function (m) {
      var r = withVol(m);
      ["volume", "volumeAvg", "volumeVsAvgPct", "volumeSamples"].forEach(function (k) {
        if (typeof r[k] === "number" && !isFinite(r[k])) bad.push(m + "." + k);
        if (r[k] === undefined) bad.push(m + "." + k + "=undefined");
      });
    });
    return bad.length === 0;
  })());

  t("volumeCheck กันเคสขอบเองได้ (ไม่พึ่งผู้เรียก)",
    SR._internal.volumeCheck(null, 5, 20).confirmed === null &&
    SR._internal.volumeCheck([1, 2, 3], 1, 20).confirmed === null &&
    SR._internal.volumeCheck(rep(20, 100), 3, 20).confirmed === null);

  // สแกนสด vs cache ต้องยังตรงกันเมื่อมีวอลุ่มด้วย
  var CACHE_BARS2 = CE.CONFIG.bars.year + 20;
  var longC = [], longV = [];
  for (var q = 0; q < 900; q++) { longC.push(100 + Math.sin(q / 9) * 14 + q * 0.01); longV.push(VB * (1 + (q % 7) * 0.1)); }
  var longD = tradingDates(900, "2026-09-24");
  var fullR = SR.detect({ closes: longC, dates: longD, volumes: longV, today: TODAY });
  var cacheR = SR.detect({ closes: longC.slice(-CACHE_BARS2), dates: longD.slice(-CACHE_BARS2),
    volumes: longV.slice(-CACHE_BARS2), today: TODAY });
  t("สแกนสดกับ cache ให้ผลวอลุ่มเหมือนกันเป๊ะ",
    JSON.stringify(Object.assign({}, fullR, { validObservations: 0 })) ===
    JSON.stringify(Object.assign({}, cacheR, { validObservations: 0 })),
    [fullR.volumeConfirmed, cacheR.volumeConfirmed, fullR.volumeVsAvgPct, cacheR.volumeVsAvgPct]);

  // summarize ต้องแยกสามช่อง
  var sm = SR.summarize([withVol(2.0), withVol(1.0), withVol(null)]);
  t("summarize แยก ผ่าน/ไม่ผ่าน/ตรวจไม่ได้ ออกจากกัน",
    sm.volumeConfirmed === 1 && sm.volumeRejected === 1 && sm.volumeUnknown === 1, sm);
  t("สามช่องรวมกัน = จำนวน reclaim ทั้งหมด",
    sm.volumeConfirmed + sm.volumeRejected + sm.volumeUnknown === sm.reclaim, sm);
}

console.log("== §27 กฎเดียวกันมีอยู่ก่อนแล้วใน data-snapshot.js — ต้องไม่แตกคอกัน ==");
{
  // public/data-snapshot.js มี smaReclaimDays() ที่ใช้กฎเดียวกันเป๊ะ (pp <= psp && p > sp)
  // แต่รับใช้คนละระนาบ: จักรวาลพอร์ต/วอตช์ลิสต์ ป้อนให้ Scoring ไม่ใช่ Catalyst Hunter
  // ไม่ refactor ข้ามระนาบ (สเปค §20) แต่ต้อง "ตรึง" ไว้ว่ากฎยังตรงกัน ถ้าใครแก้ข้างใดข้างหนึ่งต้องแดง
  var dsSrc = fs.readFileSync(process.cwd() + "/public/data-snapshot.js", "utf8");
  var mSeries = /function sma200Series\(values\)\s*\{[\s\S]*?\n  \}/.exec(dsSrc);
  var mReclaim = /function smaReclaimDays\(closes\)\s*\{[\s\S]*?\n  \}/.exec(dsSrc);
  t("ดึงฟังก์ชันจาก data-snapshot.js ได้ (ถ้าโครงเปลี่ยนต้องรู้ตัว)", !!mSeries && !!mReclaim);
  if (mSeries && mReclaim) {
    var sandbox = {};
    // eval เฉพาะสองฟังก์ชันบริสุทธิ์ตามซอร์สที่ส่งจริง — ไม่ใช่สำเนาที่พิมพ์ซ้ำ
    var f = new Function(mSeries[0] + "\n" + mReclaim[0] + "\nreturn smaReclaimDays;");
    var dsReclaim = f();
    t("กฎใน data-snapshot.js ยังเป็น 'ปิดที่หรือต่ำกว่าเส้น แล้วปิดเหนือเส้น'",
      /pp\s*<=\s*psp\s*&&\s*p\s*>\s*sp/.test(mReclaim[0]));

    var cases = [
      rep(200, 100).concat([95, 110]),
      rep(200, 100).concat([95, 110, 111, 112, 113, 114]),
      rep(200, 100).concat([95, 110, 111, 90, 88, 115, 116]),
      rep(200, 100).concat([120, 125]),
      rep(200, 100).concat([80, 82]),
    ];
    var mismatch = [];
    cases.forEach(function (c, i) {
      var ds = dsReclaim(c).reclaim;                       // จำนวนวันนับจากแท่งสุดท้าย
      // ทำให้เทียบได้: ไม่ตัดแท่งวันนี้ (today ไม่ตรงวันไหนเลย) + หน้าต่างกว้างเท่าชุดข้อมูล
      var mine = SR.detect({ closes: c, dates: tradingDates(c.length, "2026-09-24"),
        today: TODAY, lookbackBars: 500 }).barsSinceSignal;
      if (ds !== mine) mismatch.push({ case: i, dataSnapshot: ds, sma200Reclaim: mine });
    });
    t("สองการนำไปใช้ให้ 'วันที่เกิดสัญญาณ' ตรงกันทุกเคส", mismatch.length === 0, mismatch);
  }
  // ระวัง: daysSinceSma200Reclaim ของเดิมมีคำว่า Sma200Reclaim อยู่แล้ว
  // ที่ต้องไม่มีคือ "การอ้างถึงโมดูลใหม่" ไม่ใช่คำนั้น
  t("§27 ไม่ได้แก้ data-snapshot.js (คนละระนาบ ห้ามแตะ)",
    dsSrc.indexOf("window.Sma200Reclaim") < 0 && dsSrc.indexOf("sma200-reclaim") < 0 &&
    dsSrc.indexOf("SMA200_RECLAIM") < 0);
}

console.log("== เคสขอบเพิ่มเติม (สเปคไม่ได้สั่ง แต่พังได้จริง) ==");
{
  // วันที่จับคู่กับราคาด้วยตำแหน่ง — ความยาวไม่ตรง = จับคู่ไม่ได้ ต้องถือว่าไม่ทราบวันที่
  // ห้ามหยิบวันที่มาใช้แบบเลื่อนตำแหน่งแล้วรายงานวันผิดเงียบ ๆ
  t("dates สั้นกว่า closes => ถือว่าไม่ทราบวันที่ ไม่ใช่จับคู่ผิด", (function () {
    var r = SR.detect({ closes: rep(202, 100), dates: ["2026-09-24"], today: TODAY });
    return r.status === "NO_RECLAIM" && r.excludedPartialBar === null &&
      r.freshnessKnown === false && r.asOf === null;
  })());
  t("dates ยาวกว่า closes => ถือว่าไม่ทราบวันที่ ไม่ใช่รายงานวันเก่าผิด ๆ", (function () {
    var r = SR.detect({ closes: rep(202, 100), dates: tradingDates(300, "2026-09-24"), today: TODAY });
    return r.status === "NO_RECLAIM" && r.freshnessKnown === false && r.asOf === null;
  })());
  t("today รูปแบบผิด => ใช้วันนี้จริงแทน ไม่พัง",
    ["RECLAIM", "NO_RECLAIM", "DATA_STALE"].indexOf(
      SR.detect({ closes: rep(200, 100).concat([95, 110]), dates: tradingDates(202, "2026-09-24"), today: "อะไรก็ไม่รู้" }).status) >= 0);
  t("lookbackBars = 0 => กลับไปใช้ค่าตั้งต้น",
    mk(rep(200, 100).concat([95, 110]), { lookbackBars: 0 }).lookbackBars === 60);
  t("lookbackBars ติดลบ => กลับไปใช้ค่าตั้งต้น",
    mk(rep(200, 100).concat([95, 110]), { lookbackBars: -5 }).lookbackBars === 60);
  t("lookbackBars มหาศาล => ถูกจำกัดที่ 500",
    mk(rep(200, 100).concat([95, 110]), { lookbackBars: 1e9 }).lookbackBars === 500);
  t("ราคาคงที่เป๊ะทั้งชุด => close == SMA ตลอด => ไม่มีสัญญาณ (ไม่ใช่สัญญาณทุกวัน)",
    mk(rep(300, 42)).eventCount === 0);
  t("ราคาขาขึ้นตลอด => อยู่เหนือเส้นตลอด => ไม่มีสัญญาณในหน้าต่าง", (function () {
    var c = []; for (var i = 0; i < 400; i++) c.push(10 + i * 0.5);
    return mk(c).eventCount === 0;
  })());
  t("ราคาขาลงตลอด => อยู่ใต้เส้นตลอด => ไม่มีสัญญาณ", (function () {
    var c = []; for (var i = 0; i < 400; i++) c.push(500 - i * 0.5);
    return mk(c).eventCount === 0;
  })());
  t("ผลลัพธ์เป็น object เสมอ ไม่เคยคืน null/undefined",
    [null, undefined, {}, { closes: "x" }, { closes: [1] }].every(function (o) {
      var r = SR.detect(o); return r && typeof r === "object" && typeof r.status === "string";
    }));
  t("status ทุกเคสอยู่ในชุดที่สเปคกำหนด 5 ค่า", (function () {
    var allowed = ["RECLAIM", "NO_RECLAIM", "DATA_INSUFFICIENT", "DATA_UNAVAILABLE", "DATA_STALE"];
    var inputs = [null, { closes: [] }, { closes: rep(150, 10) }, { closes: rep(200, 10).concat([9, 11]) },
      { closes: rep(200, 10).concat([11, 12]) }];
    return inputs.every(function (o) {
      var r = SR.detect(Object.assign({ today: TODAY }, o || {}));
      return allowed.indexOf(r.status) >= 0;
    });
  })());
  t("ปัดเศษอยู่ชั้นแสดงผลเท่านั้น — การเปรียบเทียบใช้ค่าดิบ", (function () {
    // close สูงกว่า SMA เพียง 0.001% — ถ้าปัดก่อนเทียบ จะกลายเป็นเท่ากันแล้วพลาดสัญญาณ
    var c = rep(199, 100).concat([100]);
    var s199 = TI.calculateSMA(c, 200)[199];
    c.push(s199 * 1.00001 * 200 - (c.slice(1, 200).reduce(function (a, b) { return a + b; }, 0)));
    var r = mk(c);
    return r.status === "RECLAIM";
  })());
  t("ES5 เท่านั้นในโมดูลใหม่ (ไม่มี arrow / const / let / template literal)", (function () {
    var src = fs.readFileSync(process.cwd() + "/public/sma200-reclaim.js", "utf8");
    var code = src.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
    return !/=>/.test(code) && !/\bconst\s/.test(code) && !/\blet\s/.test(code) && code.indexOf("`") < 0;
  })());
}

console.log("");
console.log(pass + fail + " checks · " + pass + " passed · " + fail + " failed");
process.exit(fail ? 1 : 0);
