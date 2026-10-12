"use strict";
// THAI DR MONITOR — proxy ของทะเบียน DR จาก SET
//
// ทำไมต้องมี endpoint นี้: SET ต้อง cookie handshake 2 ขั้น (โหลดหน้า HTML เอา
// cookie ก่อน แล้วยิง API พร้อม Referer) ซึ่งเบราว์เซอร์ทำเองไม่ได้ — ยิงตรงจะได้ 403
// ที่นี่ทำหน้าที่ "ดึงมาส่งต่อ" อย่างเดียว ไม่ยุบรวม ไม่จัดประเภท ไม่ตีความ
// ตรรกะ inventory ทั้งหมดอยู่ใน public/thai-dr-engine.js ฝั่ง client
// เพื่อให้ทดสอบได้โดยไม่ต้องมีเน็ต
//
// REUSE เท่านั้น: handshake เดิมของ lib/thaiUniverseFull.js — ไม่มี provider ใหม่

const { loadThaiDrUniverse } = require("../lib/discovery/thaiDrAdapter.js");

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(payload));
}

module.exports = async function handler(req, res) {
  const query = req.query || {};
  const force = String(query.force || "") === "1";

  try {
    const data = await loadThaiDrUniverse({ force });
    // ดึงไม่ได้เลยและไม่มี cache → 503 เพื่อให้ฝั่ง client แยกออกจาก "ได้ข้อมูลแต่เก่า"
    const status = !data.rows.length && data.degraded ? 503 : 200;
    send(res, status, {
      ok: !!data.rows.length,
      rows: data.rows,
      total: data.rows.length,
      tradingDate: data.tradingDate,
      tradeDateType: data.tradeDateType,
      asOf: data.asOf,
      fetchedAt: new Date().toISOString(),
      source: data.source,
      sourceUrl: "https://www.set.or.th/th/market/product/dr/marketdata",
      degraded: data.degraded,
      complete: data.complete,
      reason: data.reason,
    });
  } catch (err) {
    send(res, 500, {
      ok: false,
      rows: [],
      total: 0,
      tradingDate: null,
      tradeDateType: null,
      asOf: null,
      fetchedAt: new Date().toISOString(),
      source: null,
      sourceUrl: "https://www.set.or.th/th/market/product/dr/marketdata",
      degraded: true,
      complete: false,
      reason: "ดึงทะเบียน DR ไม่สำเร็จ: " + String((err && err.message) || err),
    });
  }
};
