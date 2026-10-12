"use strict";
// THAI DR — ทะเบียน DR ที่จดทะเบียนในไทย จากแหล่งของ SET เอง
//
// แหล่ง: https://www.set.or.th/api/set/dr/list
//   ต้อง handshake 2 ขั้นเหมือน lib/thaiUniverseFull.js — โหลดหน้า HTML ก่อน
//   เพื่อเอา cookie ของ WAF แล้วยิง API พร้อม Referer มิฉะนั้นได้ 403
//   (ยืนยันแล้วว่าต้องมี "ทั้งคู่" — ขาดอย่างใดอย่างหนึ่งก็ 403)
//   ไม่มี API key · ไม่มี pagination · ยืนยันแล้ว 551 รายการในคำขอเดียว
//
// นโยบายข้อมูล: ห้ามมโนรายการ DR ถ้าดึงไม่ได้ → ใช้ cache ล่าสุดบนดิสก์
//   และต้องติดธง degraded เสมอ ห้ามทำให้ของเก่าดูเหมือนของสด
//
// ⚠ ไฟล์นี้ "ดึงมาส่งต่อ" อย่างเดียว ไม่ยุบรวม ไม่จัดประเภท
//   ตรรกะ inventory ทั้งหมดอยู่ที่ public/thai-dr-engine.js เพื่อให้เทสต์ได้โดยไม่ต้องมีเน็ต

const https = require("https");
const fs = require("fs");
const path = require("path");

const LIST_URL = "https://www.set.or.th/api/set/dr/list";
const REFERER = "https://www.set.or.th/en/market/product/dr/overview";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const CACHE_FILE = path.join(__dirname, "..", "..", ".cache", "thai-dr.json");
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // ทะเบียน DR เปลี่ยนช้า — วันละ 2 ครั้งพอ
const FETCH_TIMEOUT_MS = 20000;
// กันกรณี API ตอบมาไม่ครบ: ถ้าได้น้อยผิดปกติ ต้อง throw ไม่ใช่คืนลิสต์สั้น ๆ
// เพราะลิสต์สั้นจะถูกอ่านว่า "DR หายไปเป็นร้อยตัว" ซึ่งอันตรายกว่าการไม่มีข้อมูล
const MIN_EXPECTED_ROWS = 300;

// ฟิลด์ที่ inventory ใช้จริง — ตัดวอลุ่ม/มูลค่าซื้อขายรายวันออก
// เก็บ last + offer ไว้เพื่อเทียบกับราคาตามทฤษฎีที่คิดจากหุ้นแม่
// (DR ที่ยังไม่มีการซื้อขายวันนี้จะไม่มี last แต่มี offer)
const KEEP_FIELDS = [
  "symbol",
  "name",
  "last",
  "prior",
  "offer",
  "bid",
  "marketStatus",
  "issuer",
  "issuerName",
  "issuerId",
  "underlying",
  "underlyingName",
  "underlyingClassName",
  "underlyingClassId",
  "underlyingExchange",
  "underlyingUrl",
  "conversionRatio",
  "firstTradeDate",
  "outstandingShare",
  "outstandingDate",
  "listedShare",
  "securityType",
  "securityTypeName",
  "tradingSession",
];

function httpGet(url, cookies, referer) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const headers = {
      "User-Agent": UA,
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
    };
    if (cookies) headers.Cookie = cookies;
    if (referer) headers.Referer = referer;
    const req = https.get(
      { hostname: u.hostname, path: u.pathname + u.search, headers },
      (res) => {
        const chunks = [];
        res.on("data", (d) => chunks.push(d));
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            setCookie: res.headers["set-cookie"] || [],
            body: Buffer.concat(chunks),
          })
        );
      }
    );
    req.setTimeout(FETCH_TIMEOUT_MS, () => req.destroy(new Error("SET DR timeout")));
    req.on("error", reject);
  });
}

function slimRow(r) {
  const out = {};
  for (let i = 0; i < KEEP_FIELDS.length; i++) {
    const k = KEEP_FIELDS[i];
    const v = r[k];
    if (v !== null && v !== undefined && v !== "") out[k] = v;
  }
  return out;
}

async function fetchFromSet() {
  const page = await httpGet(REFERER); // ขั้น 1: เอา cookie ของ WAF
  if (page.status !== 200) throw new Error("SET หน้าเว็บ DR ตอบ " + page.status);
  const jar = page.setCookie.map((c) => String(c).split(";")[0]).join("; ");
  if (!jar) throw new Error("ไม่ได้ cookie จาก SET");

  const api = await httpGet(LIST_URL, jar, REFERER); // ขั้น 2: ยิง API
  if (api.status !== 200) throw new Error("SET DR list ตอบ " + api.status);

  let json;
  try {
    json = JSON.parse(api.body.toString("utf8"));
  } catch (e) {
    throw new Error("SET DR list ตอบไม่ใช่ JSON");
  }

  const raw = Array.isArray(json && json.data) ? json.data : [];
  // ต้องมี symbol เสมอ — แถวที่ไม่มีคือข้อมูลเสีย ทิ้งได้
  const rows = raw.filter((r) => r && typeof r.symbol === "string" && r.symbol).map(slimRow);

  if (rows.length < MIN_EXPECTED_ROWS) {
    throw new Error(
      "SET DR list ได้แค่ " + rows.length + " รายการ — ผิดปกติ (คาดว่า >= " + MIN_EXPECTED_ROWS + ")"
    );
  }

  return {
    rows,
    tradingDate: json.tradingDate || null,
    tradeDateType: json.tradeDateType || null,
    asOf: new Date().toISOString(),
  };
}

function readCache() {
  try {
    const raw = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    if (!Array.isArray(raw && raw.rows) || !raw.rows.length) return null;
    return raw;
  } catch (e) {
    return null;
  }
}

function writeCache(payload) {
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(payload), "utf8");
  } catch (e) {
    /* cache เขียนไม่ได้ก็ไม่เป็นไร — แค่ต้องดึงใหม่ทุกครั้ง */
  }
}

let memo = { at: 0, payload: null };

// คืน { rows, tradingDate, tradeDateType, asOf, source, degraded, complete, reason }
//
// complete = true เมื่อ "ดึงสดสำเร็จและผ่านการ์ดจำนวนแถว" เท่านั้น
//   ฝั่ง client ใช้ธงนี้ตัวเดียวในการตัดสินว่า symbol ที่หายไปนับว่าหายจริงไหม
//   ของจาก cache ไม่ใช่ complete เพราะอาจไม่สะท้อนทะเบียนปัจจุบัน
async function loadThaiDrUniverse(opts) {
  const o = opts || {};
  const force = !!o.force;
  const now = Date.now();

  if (!force && memo.payload && now - memo.at < CACHE_TTL_MS) return memo.payload;

  if (!force) {
    const cached = readCache();
    if (cached && cached.at && now - cached.at < CACHE_TTL_MS) {
      const payload = {
        rows: cached.rows,
        tradingDate: cached.tradingDate || null,
        tradeDateType: cached.tradeDateType || null,
        asOf: cached.asOf || null,
        source: "SET DR list (cache บนดิสก์)",
        degraded: false,
        complete: true, // cache ที่ยังไม่หมดอายุ = ภาพทะเบียนที่ครบของรอบนั้น
        reason: null,
      };
      memo = { at: now, payload };
      return payload;
    }
  }

  try {
    const fresh = await fetchFromSet();
    const payload = {
      rows: fresh.rows,
      tradingDate: fresh.tradingDate,
      tradeDateType: fresh.tradeDateType,
      asOf: fresh.asOf,
      source: "SET DR list (api/set/dr/list)",
      degraded: false,
      complete: true,
      reason: null,
    };
    writeCache({ at: now, ...fresh });
    memo = { at: now, payload };
    return payload;
  } catch (err) {
    // ดึงสดไม่ได้ → ใช้ของเก่าแต่ต้องบอกตรง ๆ ว่าเก่าและยังไม่ยืนยัน
    const stale = readCache();
    if (stale) {
      const payload = {
        rows: stale.rows,
        tradingDate: stale.tradingDate || null,
        tradeDateType: stale.tradeDateType || null,
        asOf: stale.asOf || null,
        source: "SET DR list (cache เก่า)",
        degraded: true,
        complete: false, // ⚠ ห้ามตัดสินว่า symbol ไหนหายจากข้อมูลชุดนี้
        reason: "ดึงทะเบียน DR จาก SET ไม่สำเร็จ (" + err.message + ") — แสดงข้อมูลที่เก็บไว้ล่าสุด",
      };
      memo = { at: 0, payload: null }; // ไม่ memo ของเก่า เพื่อให้รอบหน้าลองใหม่
      return payload;
    }
    return {
      rows: [],
      tradingDate: null,
      tradeDateType: null,
      asOf: null,
      source: null,
      degraded: true,
      complete: false,
      reason: "ดึงทะเบียน DR จาก SET ไม่สำเร็จ (" + err.message + ") และไม่มี cache",
    };
  }
}

module.exports = {
  loadThaiDrUniverse,
  __internals: { fetchFromSet, slimRow, CACHE_FILE, KEEP_FIELDS, MIN_EXPECTED_ROWS },
};
