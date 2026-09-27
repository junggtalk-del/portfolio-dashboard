// SMA200 RECLAIM — ตรวจกับจักรวาลจริง SET + mai (สเปค §24)
// node scripts/sma200-universe-check.js [batches]
//
// นี่คือ "ตัวตรวจกับข้อมูลจริง" ไม่ใช่เทสต์กำหนดผล — ต้องมีเน็ตและเซิร์ฟเวอร์รันอยู่
// จึงไม่ถูกรวมในชุดเทสต์ประจำ (ชุดประจำต้องรันได้โดยไม่พึ่งเครือข่าย)
//
// ห้ามตรึงจำนวน ticker ที่คาดหวัง — ทะเบียนตลาดเปลี่ยนได้ตลอด
"use strict";
var http = require("http");
var SR = require("../public/sma200-reclaim.js");
var CE = require("../public/catalyst-engine.js");

var BASE = process.env.DASH_BASE || "http://localhost:4173";
var BATCHES = Math.max(1, parseInt(process.argv[2] || "4", 10) || 4);
var LIMIT = 24;

function get(path) {
  return new Promise(function (resolve, reject) {
    var req = http.get(BASE + path, { timeout: 120000 }, function (res) {
      var body = "";
      res.setEncoding("utf8");
      res.on("data", function (c) { body += c; });
      res.on("end", function () {
        if (res.statusCode !== 200) return reject(new Error("HTTP " + res.statusCode));
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    });
    req.on("timeout", function () { req.destroy(new Error("timeout")); });
    req.on("error", reject);
  });
}

(async function main() {
  var problems = [];
  var first = await get("/api/catalyst-scan?universe=THAI_ALL&offset=0&limit=" + LIMIT + "&_ts=" + Date.now());

  console.log("================ §24 FULL UNIVERSE ================");
  console.log("universe name        : " + first.universe);
  console.log("universe source      : " + ((first.universeMeta && first.universeMeta.source) || "—"));
  console.log("universe asOf        : " + ((first.universeMeta && first.universeMeta.asOf) || "—"));
  var counts = (first.universeMeta && first.universeMeta.counts) || null;
  console.log("counts               : " + (counts ? JSON.stringify(counts) : "—"));
  console.log("total symbols        : " + first.total);

  if (first.universe !== "THAI_ALL") problems.push("universe ไม่ใช่ THAI_ALL: " + first.universe);
  if (!counts || !counts.set || !counts.mai) problems.push("ไม่พบจำนวนแยก SET/mai — อาจไม่ใช่ทั้งตลาด");
  if (counts && counts.set && counts.mai && counts.total !== counts.set + counts.mai) {
    problems.push("counts ไม่สมดุล: set+mai != total");
  }
  // §24 — ต้องไม่ใช่ลิสต์ย่อยแบบเดิม (SET100_MAI มีราว 130-150 ตัว)
  if (first.total < 400) problems.push("total " + first.total + " น้อยเกินกว่าจะเป็นทั้งตลาด — อาจถอยไปใช้ลิสต์เดิม");
  if (first.universeMeta && first.universeMeta.degraded) {
    problems.push("universeMeta.degraded = true — " + (first.universeMeta.note || "ไม่ระบุ"));
  }

  var all = [], markets = {}, failedCount = 0;
  var batch = first, offset = 0;
  for (var b = 0; b < BATCHES; b++) {
    (batch.items || []).forEach(function (it) {
      markets[it.market] = (markets[it.market] || 0) + 1;
      var sig = SR.detect({ closes: it.closes, dates: it.dates });
      sig.__ticker = it.ticker;
      sig.__bars = it.bars;
      all.push(sig);
    });
    failedCount += (batch.failed || []).length;
    if (batch.done || batch.nextOffset == null || b === BATCHES - 1) break;
    offset = batch.nextOffset;
    batch = await get("/api/catalyst-scan?universe=THAI_ALL&offset=" + offset + "&limit=" + LIMIT + "&_ts=" + Date.now());
  }

  var s = SR.summarize(all);
  console.log("---------------------------------------------------");
  console.log("symbols scanned      : " + s.scanned + "  (ตัวอย่าง " + BATCHES + " ชุด × " + LIMIT + ")");
  console.log("markets in sample    : " + JSON.stringify(markets));
  console.log("sufficient SMA200    : " + s.withSma200History);
  console.log("reclaims found       : " + s.reclaim +
    "   (ยังยืนเหนือเส้น " + s.stillAbove + " · หลุดกลับลงไป " + s.fellBackBelow + ")");
  console.log("no reclaim           : " + s.noReclaim);
  console.log("data insufficient    : " + s.insufficient);
  console.log("data stale           : " + s.stale);
  console.log("data unavailable     : " + s.unavailable);
  console.log("price fetch failed   : " + failedCount);
  console.log("latest market data   : " + (s.latestDataDate || "—"));
  console.log("---------------------------------------------------");

  var hits = all.filter(function (x) { return x.status === "RECLAIM"; });
  if (hits.length) {
    console.log("ตัวอย่าง reclaim ที่พบจริง (สูงสุด 10 ตัว):");
    hits.slice(0, 10).forEach(function (x) {
      console.log("  " + String(x.__ticker).padEnd(12) +
        " " + x.signalDate +
        "  " + String(x.previousDistancePct).padStart(7) + "% → " +
        String(x.currentDistancePct).padStart(6) + "%" +
        "  แรง " + String(x.reclaimStrengthPct).padStart(6) + "pp" +
        "  ผ่านมา " + String(x.barsSinceSignal).padStart(2) + " วัน" +
        (x.stillAbove ? "" : "  (หลุดกลับลงแล้ว)"));
    });
  } else {
    console.log("ตัวอย่างนี้ไม่พบ reclaim — ไม่ใช่ข้อผิดพลาด (เหตุการณ์นี้เกิดไม่บ่อย)");
  }

  // ---- ความถูกต้องกับข้อมูลจริง ----
  console.log("---------------------------------------------------");
  var bad = [];
  all.forEach(function (x) {
    Object.keys(x).forEach(function (k) {
      if (typeof x[k] === "number" && !isFinite(x[k])) bad.push(x.__ticker + "." + k);
      if (x[k] === undefined) bad.push(x.__ticker + "." + k + "=undefined");
    });
    if (["RECLAIM", "NO_RECLAIM", "DATA_INSUFFICIENT", "DATA_UNAVAILABLE", "DATA_STALE"].indexOf(x.status) < 0) {
      bad.push(x.__ticker + " status=" + x.status);
    }
    // ห้ามมองอนาคต: วันที่สัญญาณต้องไม่ใหม่กว่าวันของข้อมูลที่ใช้
    if (x.signalDate && x.asOf && x.signalDate > x.asOf) bad.push(x.__ticker + " signalDate > asOf");
  });
  if (bad.length) problems.push("ค่าผิดรูปกับข้อมูลจริง: " + bad.slice(0, 6).join(", "));

  // cache ของหน้าเว็บเก็บ 272 แท่ง — ผลต้องเท่ากับสแกนสดทุกตัว
  var CACHE_BARS = CE.CONFIG.bars.year + 20;
  var drift = [];
  all.forEach(function (x, i) {
    if (!x.__bars) return;
  });
  var reScan = [];
  (batch.items || first.items || []).forEach(function (it) {
    var live = SR.detect({ closes: it.closes, dates: it.dates });
    var cached = SR.detect({ closes: it.closes.slice(-CACHE_BARS), dates: it.dates.slice(-CACHE_BARS) });
    delete live.validObservations; delete cached.validObservations;
    if (JSON.stringify(live) !== JSON.stringify(cached)) drift.push(it.ticker);
    reScan.push(it.ticker);
  });
  console.log("cache consistency    : เทียบ " + reScan.length + " ตัว (เต็ม vs " + CACHE_BARS +
    " แท่ง) · ต่างกัน " + drift.length + " ตัว");
  if (drift.length) problems.push("สแกนสดกับ cache ให้ผลต่างกัน: " + drift.slice(0, 5).join(", "));

  console.log("===================================================");
  if (problems.length) {
    problems.forEach(function (p) { console.error("  ✗ " + p); });
    process.exit(1);
  }
  console.log("ผ่านทุกข้อ — จักรวาลคือ SET + mai จริง และผลกับข้อมูลจริงไม่มีค่าผิดรูป");
})().catch(function (e) {
  console.error("รันไม่สำเร็จ: " + (e && e.message || e));
  console.error("ต้องมี dev server รันอยู่ที่ " + BASE + " (node server.js)");
  process.exit(2);
});
