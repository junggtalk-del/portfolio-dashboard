"use strict";
// ============================================================
// ตัวช่วยเทสต์ (ไม่ใช่ชุดเทสต์): ForeignSleeve ที่ล็อกนาฬิกา
//
// spec 2026-11-09-pm-foreign-sleeve-design.md Addendum ข้อ 5: ไตรมาสปัจจุบันของเอกสารที่เก่ากว่าไตรมาสตามปฏิทินของ "วันนี้"
//   → sleeveOf = editor / quarter-ended · หน้าเว็บเรียกโมดูลโดยไม่ส่ง opts (= Date.now())
// เทสต์ที่ fixture ปักไตรมาสไว้ (เช่น "2026-Q3" / "2026-Q4") ต้องได้ผลเดิมทุกวันที่รัน →
//   ห่อโมดูล (ตัวที่ require ใน Node หรือ window.ForeignSleeve ที่โหลดใน VM) ให้ sleeveOf / applyToDoc / applyToSnapshot
//   ได้ opts.now คงที่เสมอ (ผู้เรียกส่ง now มาเอง = ใช้ของผู้เรียก) · ฟังก์ชัน/ค่าอื่นส่งต่อตัวเดิม
//   หน้าเว็บอ่าน window.ForeignSleeve ตอนเรียก (ไม่เก็บไว้ตอนโหลด) → แทนที่หลังโหลด foreign-sleeve.js ก่อนสคริปต์หน้าได้
//
// ใช้:  var clock = require("./sleeve-clock");
//       win.ForeignSleeve = clock.withClock(win.ForeignSleeve, clock.Q4_2026);
// ============================================================

// เที่ยงวันตามเวลาท้องถิ่น (โมดูลคิดไตรมาสด้วยเวลาท้องถิ่น แบบ Quarterly Editor) — ไม่ขึ้นกับเขตเวลาของเครื่องที่รัน
function at(y, m, d, hh, mm, ss) {
  return new Date(y, m - 1, d, hh == null ? 12 : hh, mm || 0, ss || 0).getTime();
}

function withClock(FS, now) {
  if (!FS || typeof FS !== "object") return FS;
  var out = {};
  Object.keys(FS).forEach(function (k) { out[k] = FS[k]; });
  function o(opts) {
    var r = {};
    if (opts && typeof opts === "object") Object.keys(opts).forEach(function (k) { r[k] = opts[k]; });
    if (r.now == null) r.now = now;
    return r;
  }
  out.sleeveOf = function (ps, holdings, opts) { return FS.sleeveOf(ps, holdings, o(opts)); };
  out.applyToDoc = function (ps, holdings, opts) { return FS.applyToDoc(ps, holdings, o(opts)); };
  // holdings undefined ต้องคง "ไม่ส่ง" (= ใช้ holdings ใน snapshot) — ส่งต่อ undefined ตรง ๆ ให้ผลเดียวกัน
  out.applyToSnapshot = function (snapshot, holdings, opts) { return FS.applyToSnapshot(snapshot, holdings, o(opts)); };
  out.CLOCK = now;
  return out;
}

module.exports = {
  at: at,
  withClock: withClock,
  Q3_2026: at(2026, 9, 15),   // fixture ที่ไตรมาสปัจจุบัน = 2026-Q3
  Q4_2026: at(2026, 11, 9)    // fixture ที่ไตรมาสปัจจุบัน = 2026-Q4 (วันที่เขียน spec)
};
