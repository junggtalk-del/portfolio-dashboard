"use strict";
// ============================================================
// ตรวจ btc-forecast-log.js
// สิ่งที่ต้องพิสูจน์:
//   1. snapshot ถูกแช่แข็ง — ข้อมูลใหม่เข้ามาแล้วของเก่าต้องไม่ขยับ
//   2. ราคาจริงมาจากแท่งราคาจริงเท่านั้น ยังไม่ถึงวัน = pending ห้ามเดา
//   3. ส่วนต่างคิดถูกทั้ง % และดอลลาร์ ทิศของเครื่องหมายต้องสื่อความถูก
//   4. ไม่มี NaN / Infinity / undefined หลุดออกมา
// ============================================================
var FL = require("../public/btc-forecast-log.js");

var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; return; }
  fail++;
  console.log("  ✗ " + name + (extra !== undefined ? "  → " + JSON.stringify(extra) : ""));
}
function near(a, b, eps) { return a != null && b != null && Math.abs(a - b) < (eps == null ? 1e-9 : eps); }

// ---- ตัวช่วยสร้างข้อมูลจำลอง ----
function ymd(ms) { return new Date(ms).toISOString().slice(0, 10); }
var DAY = 86400000, WK = 7 * DAY;
var T0 = Date.UTC(2026, 0, 7);   // พุธ

function fakeResult(spotDate, spot, prices) {
  // เลียนแบบผลของ global-liquidity-engine แบบย่อ ให้ buildSnapshot กินได้
  var pts = prices.map(function (p, i) {
    return {
      weeksAhead: i + 1,
      price: p,
      priceLo68: p * 0.8, priceHi68: p * 1.2,
      priceLo95: p * 0.6, priceHi95: p * 1.4,
      priceBasis: i < 6 ? "observed" : "chained"
    };
  });
  return {
    available: true,
    weeks: [{ date: spotDate, btcClose: spot }],
    projection: {
      points: pts, lagWeeks: 13, explainedPct: 4.27, slope: 1.61, n: 395
    }
  };
}
function bars(startMs, closes) {
  return closes.map(function (c, i) { return { date: ymd(startMs + i * DAY), close: c }; });
}

console.log("== สร้าง snapshot ==");
{
  var R = fakeResult("2026-01-07", 100000, [101000, 102000, 103000]);
  var s = FL.buildSnapshot(R, "2026-01-07");
  t("สร้าง snapshot ได้", !!s, s);
  t("เก็บราคาจริง ณ ตอนทำนายไว้ด้วย", s.spot === 100000, s.spot);
  t("เก็บวันที่ทำนาย", s.takenAt === "2026-01-07", s.takenAt);
  t("เก็บความแม่นของโมเดลตอนนั้น (r²)", s.r2Pct === 4.27, s.r2Pct);
  t("จำนวนจุดครบ", s.points.length === 3, s.points.length);
  t("วันเป้าหมาย = spot + n สัปดาห์", s.points[0].targetDate === "2026-01-14" &&
    s.points[1].targetDate === "2026-01-21" && s.points[2].targetDate === "2026-01-28",
    s.points.map(function (p) { return p.targetDate; }));
  t("เก็บช่วง 68/95 ไว้ด้วย", s.points[0].lo95 === 60600 && s.points[0].hi95 === 141400,
    [s.points[0].lo95, s.points[0].hi95]);
  t("เก็บที่มาของฐานราคา", s.points[0].basis === "observed");

  t("ไม่มีผล → ไม่สร้างของปลอม", FL.buildSnapshot(null, "2026-01-07") === null);
  t("ไม่มี projection → null", FL.buildSnapshot({ available: true, weeks: [] }, "2026-01-07") === null);
  t("วันที่ผิดรูป → null", FL.buildSnapshot(R, "7 ม.ค. 69") === null);
  t("ไม่มีราคาจริงให้อ้าง → null",
    FL.buildSnapshot({ available: true, weeks: [{ date: "2026-01-07", btcClose: null }],
      projection: { points: [{ weeksAhead: 1, price: 1 }] } }, "2026-01-07") === null);
  t("จุดที่ไม่มีราคา ถูกข้าม ไม่ใช่เก็บ null", (function () {
    var R2 = fakeResult("2026-01-07", 100000, [101000, 102000]);
    R2.projection.points[0].price = null;
    var s2 = FL.buildSnapshot(R2, "2026-01-07");
    return s2.points.length === 1 && s2.points[0].weeksAhead === 2;
  })());
}

console.log("== snapshot ต้องถูกแช่แข็ง ==");
{
  // นี่คือหัวใจของฟีเจอร์: บันทึกแล้ว ข้อมูลใหม่ต้องไม่ย้อนไปแก้ของเก่า
  var log = { v: 1, entries: [] };
  var s1 = FL.buildSnapshot(fakeResult("2026-01-07", 100000, [101000]), "2026-01-07");
  log = FL.addSnapshot(log, s1);
  var frozen = JSON.stringify(log.entries[0]);

  // โมเดลเปลี่ยนใจครั้งใหญ่ในสัปดาห์ถัดมา
  var s2 = FL.buildSnapshot(fakeResult("2026-01-14", 70000, [55000]), "2026-01-14");
  log = FL.addSnapshot(log, s2);

  t("บันทึกแล้วมี 2 รายการ", log.entries.length === 2, log.entries.length);
  t("รายการเก่าไม่ถูกแก้แม้แต่ไบต์เดียว", JSON.stringify(log.entries[0]) === frozen);
  t("รายการเก่ายังทำนาย 101000 เหมือนเดิม", log.entries[0].points[0].price === 101000);
  t("เรียงตามวันที่เสมอ", log.entries[0].takenAt < log.entries[1].takenAt);

  // บันทึกซ้ำวันเดียวกัน = แทนที่ ไม่ใช่เพิ่มแถว
  var s2b = FL.buildSnapshot(fakeResult("2026-01-14", 71000, [56000]), "2026-01-14");
  var log2 = FL.addSnapshot(log, s2b);
  t("บันทึกซ้ำวันเดิม → แทนที่ ไม่เพิ่มแถว", log2.entries.length === 2, log2.entries.length);
  t("แทนที่แล้วได้ค่าใหม่", log2.entries[1].points[0].price === 56000);
  t("แต่รายการแรกยังไม่ขยับ", JSON.stringify(log2.entries[0]) === frozen);

  // ไม่แก้ของเดิมแบบ in-place
  var before = JSON.stringify(log);
  FL.addSnapshot(log, FL.buildSnapshot(fakeResult("2026-02-04", 80000, [81000]), "2026-02-04"));
  t("addSnapshot ไม่แก้ log ตัวเดิม (ไม่ mutate)", JSON.stringify(log) === before);

  // เกินเพดานต้องตัดตัวเก่าสุด ไม่ใช่ตัวใหม่
  var big = { v: 1, entries: [] };
  for (var i = 0; i < FL.MAX_ENTRIES + 25; i++) {
    big = FL.addSnapshot(big, FL.buildSnapshot(
      fakeResult(ymd(T0 + i * WK), 100000 + i, [100000 + i]), ymd(T0 + i * WK)));
  }
  t("ไม่เก็บเกินเพดาน", big.entries.length === FL.MAX_ENTRIES, big.entries.length);
  t("ตัดตัวเก่าสุดทิ้ง เก็บตัวใหม่ไว้",
    big.entries[big.entries.length - 1].takenAt === ymd(T0 + (FL.MAX_ENTRIES + 24) * WK));
}

console.log("== จังหวะบันทึก: สัปดาห์ละครั้ง ==");
{
  t("log ว่าง → บันทึกเลย", FL.shouldCapture({ entries: [] }, "2026-01-07") === true);
  t("log เป็น null → บันทึกเลย", FL.shouldCapture(null, "2026-01-07") === true);
  var lg = { entries: [{ takenAt: "2026-01-07", points: [] }] };
  t("วันเดียวกัน → ยังไม่บันทึกซ้ำ", FL.shouldCapture(lg, "2026-01-07") === false);
  t("ผ่านไป 6 วัน → ยังไม่ถึงรอบ", FL.shouldCapture(lg, "2026-01-13") === false);
  t("ครบ 7 วัน → บันทึก", FL.shouldCapture(lg, "2026-01-14") === true);
  t("ผ่านไปนาน → บันทึก", FL.shouldCapture(lg, "2026-03-01") === true);
  t("นาฬิกาเพี้ยนย้อนอดีต → ไม่บันทึก", FL.shouldCapture(lg, "2025-12-01") === false);
  t("วันที่ผิดรูป → ไม่บันทึก", FL.shouldCapture(lg, "ไม่ใช่วันที่") === false);
  t("เลือกรายการล่าสุดถูก แม้เรียงสลับ",
    FL.shouldCapture({ entries: [{ takenAt: "2026-01-14" }, { takenAt: "2026-01-02" }] }, "2026-01-16") === false);
}

console.log("== หาราคาจริง ห้ามเดา ==");
{
  var bs = bars(Date.UTC(2026, 0, 1), [90000, 91000, 92000, 93000, 94000]);  // 1-5 ม.ค.
  t("ตรงวัน → ได้ราคาวันนั้น", FL.actualAt(bs, "2026-01-03").close === 92000);
  t("ไม่มีแท่งวันนั้น → ใช้ล่าสุดที่ไม่เกิน", FL.actualAt(bs, "2026-01-07").close === 94000);
  t("บอกวันของราคาที่ใช้จริง", FL.actualAt(bs, "2026-01-07").date === "2026-01-05");
  t("วันก่อนข้อมูลทั้งหมด → null", FL.actualAt(bs, "2025-12-20") === null);
  t("ห่างเกินเพดาน → null ไม่ลากค่าเก่ามาใช้", FL.actualAt(bs, "2026-02-01") === null);
  t("ไม่มีแท่งเลย → null", FL.actualAt([], "2026-01-03") === null);
  t("แท่งเสีย (close เป็น null/0/ติดลบ) ถูกข้าม", (function () {
    var bad = [{ date: "2026-01-01", close: 90000 }, { date: "2026-01-02", close: null },
               { date: "2026-01-03", close: 0 }, { date: "2026-01-04", close: -5 }];
    var r = FL.actualAt(bad, "2026-01-04");
    return r && r.close === 90000 && r.date === "2026-01-01";
  })());
  t("ไม่มองอนาคต — แท่งหลังวันเป้าหมายไม่ถูกใช้", (function () {
    var r = FL.actualAt(bs, "2026-01-02");
    return r.close === 91000;   // ไม่ใช่ 94000
  })());
}

console.log("== เทียบผล: ส่วนต่าง % และดอลลาร์ ==");
{
  var log3 = FL.addSnapshot({ entries: [] },
    FL.buildSnapshot(fakeResult("2026-01-07", 100000, [110000]), "2026-01-07"));
  // เป้าหมาย 2026-01-14 ราคาจริง 100,000
  var bs3 = bars(Date.UTC(2026, 0, 8), [100000, 100000, 100000, 100000, 100000, 100000, 100000]);
  var ev = FL.evaluate(log3, bs3, "2026-01-20");
  var row = ev.rows[0];
  t("ให้คะแนนแล้ว", row.status === "scored", row.status);
  t("ราคาจริงถูกดึงมาจากแท่งจริง", row.actual === 100000, row.actual);
  t("ส่วนต่างดอลลาร์ = ทำนาย − จริง", row.diffUsd === 10000, row.diffUsd);
  t("ส่วนต่าง % คิดจากราคาจริงเป็นฐาน", near(row.diffPct, 10, 1e-9), row.diffPct);
  t("ค่าสัมบูรณ์ถูก", row.absPct === 10, row.absPct);
  t("เครื่องหมายบวก = โมเดลทายสูงไป", row.diffUsd > 0 && row.predicted > row.actual);

  // ทายต่ำไปต้องได้เครื่องหมายลบ
  var log4 = FL.addSnapshot({ entries: [] },
    FL.buildSnapshot(fakeResult("2026-01-07", 100000, [90000]), "2026-01-07"));
  var ev4 = FL.evaluate(log4, bs3, "2026-01-20");
  t("เครื่องหมายลบ = โมเดลทายต่ำไป", ev4.rows[0].diffUsd === -10000 && ev4.rows[0].diffPct === -10,
    [ev4.rows[0].diffUsd, ev4.rows[0].diffPct]);

  // อยู่ในช่วงไหม
  t("ราคาจริงอยู่ในช่วง 68% → in68 = true", (function () {
    // ทำนาย 110000 ช่วง 68% = 88000..132000 ราคาจริง 100000 → อยู่ใน
    return row.in68 === true && row.in95 === true;
  })(), [row.lo68, row.hi68, row.actual]);
  t("ราคาจริงหลุดช่วง → in95 = false", (function () {
    var lg = FL.addSnapshot({ entries: [] },
      FL.buildSnapshot(fakeResult("2026-01-07", 100000, [200000]), "2026-01-07"));
    // ช่วง 95% = 120000..280000 ราคาจริง 100000 → หลุด
    var e2 = FL.evaluate(lg, bs3, "2026-01-20");
    return e2.rows[0].in95 === false && e2.rows[0].in68 === false;
  })());

  // ทิศทาง
  t("ทายขึ้นแล้วขึ้นจริง = ถูกทิศ", (function () {
    var up = bars(Date.UTC(2026, 0, 8), [120000, 120000, 120000, 120000, 120000, 120000, 120000]);
    return FL.evaluate(log3, up, "2026-01-20").rows[0].direction === "ถูกทิศ";
  })());
  t("ทายขึ้นแต่ลงจริง = ผิดทิศ", row.direction === "ผิดทิศ", row.direction);

  // เทียบกับการเดาแบบ "ราคาไม่เปลี่ยน"
  t("โมเดลแย่กว่าเดาว่าไม่เปลี่ยน → beatNaive = false", row.beatNaive === false,
    [row.diffPct, row.naiveDiffPct]);
  t("โมเดลดีกว่าเดาว่าไม่เปลี่ยน → beatNaive = true", (function () {
    // ทำนาย 110000, spot 100000, จริง 108000 → โมเดลพลาด 1.85% การเดาพลาด 7.4%
    var b2 = bars(Date.UTC(2026, 0, 8), [108000, 108000, 108000, 108000, 108000, 108000, 108000]);
    return FL.evaluate(log3, b2, "2026-01-20").rows[0].beatNaive === true;
  })());
}

console.log("== ยังไม่ถึงวัน = pending ห้ามให้คะแนน ==");
{
  var log5 = FL.addSnapshot({ entries: [] },
    FL.buildSnapshot(fakeResult("2026-01-07", 100000, [101000, 102000, 103000]), "2026-01-07"));
  var bs5 = bars(Date.UTC(2026, 0, 8), [100000, 100000, 100000, 100000, 100000, 100000, 100000]);
  var ev5 = FL.evaluate(log5, bs5, "2026-01-14");   // ถึงแค่จุดแรก
  var byT = {};
  ev5.rows.forEach(function (r) { byT[r.targetDate] = r; });
  t("จุดที่ถึงกำหนดแล้ว → scored", byT["2026-01-14"].status === "scored");
  t("จุดที่ยังไม่ถึง → pending", byT["2026-01-21"].status === "pending" &&
    byT["2026-01-28"].status === "pending");
  t("pending ต้องไม่มีราคาจริง", byT["2026-01-21"].actual === null);
  t("pending ต้องไม่มีส่วนต่าง", byT["2026-01-21"].diffPct === null && byT["2026-01-21"].diffUsd === null);
  t("นับ pending ไว้ในสรุป", ev5.summary.pending === 2, ev5.summary.pending);
  t("สรุปนับเฉพาะที่ให้คะแนนแล้ว", ev5.summary.scored === 1, ev5.summary.scored);

  // ถึงกำหนดแล้วแต่ไม่มีข้อมูลราคา = no-data ไม่ใช่ scored ที่เดาเอา
  var ev6 = FL.evaluate(log5, [], "2026-02-01");
  t("ถึงกำหนดแต่ไม่มีราคา → no-data", ev6.rows.every(function (r) { return r.status === "no-data"; }));
  t("no-data ไม่ถูกนับเป็นคะแนน", ev6.summary.scored === 0 && ev6.summary.noData === 3,
    [ev6.summary.scored, ev6.summary.noData]);
  t("ไม่มีคะแนน → สถิติเป็น null ไม่ใช่ 0", ev6.summary.maePct === null && ev6.summary.hit95Pct === null);
}

console.log("== สรุปสถิติ ==");
{
  // สร้าง 4 คำทำนายที่พลาด +10%, -10%, +20%, -4%
  var lg = { entries: [] };
  var preds = [110000, 90000, 120000, 96000];
  for (var i = 0; i < preds.length; i++) {
    lg = FL.addSnapshot(lg, FL.buildSnapshot(
      fakeResult(ymd(T0 + i * WK), 100000, [preds[i]]), ymd(T0 + i * WK)));
  }
  // ราคาจริงคงที่ 100000 ตลอด
  var closes = []; for (var c = 0; c < 80; c++) closes.push(100000);
  var bsx = bars(T0, closes);
  var ev = FL.evaluate(lg, bsx, ymd(T0 + 60 * DAY));
  t("ให้คะแนนครบ 4 รายการ", ev.summary.scored === 4, ev.summary.scored);
  t("MAE = ค่าเฉลี่ยของค่าสัมบูรณ์ (11%)", near(ev.summary.maePct, 11, 1e-9), ev.summary.maePct);
  t("ค่ากลางของค่าสัมบูรณ์ = 10%", near(ev.summary.medianAbsPct, 10, 1e-9), ev.summary.medianAbsPct);
  t("ค่าเอนเอียง = เฉลี่ยแบบมีเครื่องหมาย (+4%)", near(ev.summary.biasPct, 4, 1e-9), ev.summary.biasPct);
  t("MAE ต้องไม่เท่ากับค่าเอนเอียง (คนละความหมาย)", ev.summary.maePct !== ev.summary.biasPct);
  t("บอกรายการที่พลาดมากสุด", ev.summary.worst.absPct === 20, ev.summary.worst.absPct);
  t("บอกรายการที่แม่นสุด", ev.summary.best.absPct === 4, ev.summary.best.absPct);
  t("อัตราเข้าช่วง 95% คิดเป็น %", ev.summary.hit95Pct != null && ev.summary.hit95Pct >= 0 &&
    ev.summary.hit95Pct <= 100, ev.summary.hit95Pct);
  t("อัตราทายถูกทิศคิดเป็น %", ev.summary.directionPct != null &&
    ev.summary.directionPct >= 0 && ev.summary.directionPct <= 100, ev.summary.directionPct);

  // แยกตามระยะ
  var lg2 = FL.addSnapshot({ entries: [] },
    FL.buildSnapshot(fakeResult("2026-01-07", 100000, [110000, 120000]), "2026-01-07"));
  var ev2 = FL.evaluate(lg2, bars(Date.UTC(2026, 0, 8), closes), "2026-03-01");
  t("แยกสถิติตามระยะล่วงหน้า", ev2.byHorizon.length === 2, ev2.byHorizon.length);
  t("ระยะ 1 สัปดาห์พลาด 10%", near(ev2.byHorizon[0].maePct, 10, 1e-9), ev2.byHorizon[0]);
  t("ระยะ 2 สัปดาห์พลาด 20%", near(ev2.byHorizon[1].maePct, 20, 1e-9), ev2.byHorizon[1]);
  t("เรียงตามระยะจากใกล้ไปไกล", ev2.byHorizon[0].weeksAhead < ev2.byHorizon[1].weeksAhead);
}

console.log("== นำเข้าไฟล์ที่อาจถูกแก้มา ==");
{
  t("ไม่ใช่ object → ได้ log ว่าง", FL.sanitize(null).entries.length === 0);
  t("entries ไม่ใช่ array → log ว่าง", FL.sanitize({ entries: "x" }).entries.length === 0);
  t("รายการที่วันที่ผิดรูป ถูกทิ้ง",
    FL.sanitize({ entries: [{ takenAt: "เมื่อวาน", points: [{ targetDate: "2026-01-14", price: 1 }] }] }).entries.length === 0);
  t("จุดที่ราคาเป็นข้อความ ถูกทิ้ง", (function () {
    var o = FL.sanitize({ entries: [{ takenAt: "2026-01-07", points: [
      { targetDate: "2026-01-14", price: "แพง" }, { targetDate: "2026-01-21", price: 102000 }] }] });
    return o.entries.length === 1 && o.entries[0].points.length === 1 &&
      o.entries[0].points[0].price === 102000;
  })());
  t("ราคาติดลบ/ศูนย์ ถูกทิ้ง", (function () {
    var o = FL.sanitize({ entries: [{ takenAt: "2026-01-07", points: [
      { targetDate: "2026-01-14", price: -5 }, { targetDate: "2026-01-21", price: 0 }] }] });
    return o.entries.length === 0;
  })());
  t("basis แปลกปลอม ถูกล้างเป็น null", (function () {
    var o = FL.sanitize({ entries: [{ takenAt: "2026-01-07", points: [
      { targetDate: "2026-01-14", price: 1000, basis: "มั่ว" }] }] });
    return o.entries[0].points[0].basis === null;
  })());
  t("ข้อมูลดีผ่านได้ครบ", (function () {
    var good = FL.addSnapshot({ entries: [] },
      FL.buildSnapshot(fakeResult("2026-01-07", 100000, [110000]), "2026-01-07"));
    var round = FL.sanitize(JSON.parse(JSON.stringify(good)));
    return round.entries.length === 1 && round.entries[0].points[0].price === 110000 &&
      round.entries[0].spot === 100000;
  })());
}

console.log("== ห้ามมีค่าผิดรูป ==");
{
  var bad = [];
  var cases = [
    ["log ว่าง", { entries: [] }, []],
    ["ไม่มีแท่งราคา", FL.addSnapshot({ entries: [] },
      FL.buildSnapshot(fakeResult("2026-01-07", 100000, [110000]), "2026-01-07")), []],
    ["spot เป็น 0", (function () {
      var r = fakeResult("2026-01-07", 0, [110000]);
      return FL.addSnapshot({ entries: [] }, FL.buildSnapshot(r, "2026-01-07"));
    })(), bars(Date.UTC(2026, 0, 8), [100000, 100000, 100000, 100000, 100000, 100000, 100000])],
    ["ราคาจริงเล็กมาก", FL.addSnapshot({ entries: [] },
      FL.buildSnapshot(fakeResult("2026-01-07", 100000, [110000]), "2026-01-07")),
      bars(Date.UTC(2026, 0, 8), [0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01])]
  ];
  cases.forEach(function (c) {
    var r;
    try { r = FL.evaluate(c[1], c[2], "2026-02-01"); }
    catch (e) { bad.push(c[0] + ": throw " + e.message); return; }
    JSON.stringify(r, function (k, v) {
      if (typeof v === "number" && !isFinite(v)) bad.push(c[0] + "." + k + "=" + v);
      return v;
    });
    (r.rows || []).forEach(function (row, ri) {
      Object.keys(row).forEach(function (k) {
        if (row[k] === undefined) bad.push(c[0] + ".rows[" + ri + "]." + k + "=undefined");
      });
    });
  });
  t("ไม่มี NaN/Infinity/undefined และไม่ throw", bad.length === 0, bad.slice(0, 6));
}

console.log("== ไม่มีคำชี้นำซื้อขาย ==");
{
  var src = require("fs").readFileSync(require("path").join(__dirname, "..", "public", "btc-forecast-log.js"), "utf8");
  t("ไม่มีคำว่า Buy/Sell ในโค้ด", !/\b(buy|sell)\b/i.test(src));
  t("ไม่มีคำแนะนำซื้อ/ขายภาษาไทย", !/ควรซื้อ|ควรขาย|น่าซื้อ|น่าขาย/.test(src));
}

console.log("\n" + (pass + fail) + " checks · " + pass + " passed · " + fail + " failed");
process.exit(fail ? 1 : 0);
