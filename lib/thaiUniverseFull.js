"use strict";
// FULL THAI UNIVERSE — ทะเบียนหลักทรัพย์ทั้ง SET และ mai จากทะเบียนของตลาดเอง
//
// ทำไมต้องมีไฟล์นี้: lib/config/thaiStockUniverse.js เป็นลิสต์ hard-code SET100 (100)
// + mai (44) ซึ่ง (ก) ไม่ครบ (ข) เก่า — มี ticker ที่เพิกถอน/เปลี่ยนชื่อไปแล้ว
// (ค) ป้าย market ผิด (หลายตัวใน MAI_UNIVERSE จริง ๆ อยู่ SET)
// ไฟล์เดิม "ไม่ถูกแก้" เพราะหน้าอื่นใช้ร่วมอยู่ — ที่นี่คือแหล่งเพิ่มเติมสำหรับ Catalyst Hunter
//
// แหล่ง: https://www.set.or.th/api/set/stock/list (ทะเบียนของ SET เอง)
//   ต้อง handshake 2 ขั้น — โหลดหน้า HTML ก่อนเพื่อเอา cookie ของ WAF แล้วยิง API
//   พร้อม Referer มิฉะนั้นได้ 403 (ยืนยันแล้วว่าต้องมี "ทั้งคู่")
// ไม่มี API key · ไม่มี pagination · 4,073 records
//
// นโยบายข้อมูล: ห้ามมโนรายชื่อหุ้น ถ้าดึงไม่ได้ → ใช้ cache ล่าสุดบนดิสก์
// ถ้าไม่มี cache → ตกกลับลิสต์เดิมพร้อมประกาศ degraded ให้ UI เห็นชัด

const https = require("https");
const fs = require("fs");
const path = require("path");
const { getThaiStockUniverse } = require("./config/thaiStockUniverse.js");

const LIST_URL = "https://www.set.or.th/api/set/stock/list";
const REFERER = "https://www.set.or.th/en/market/get-quote/stock";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const CACHE_FILE = path.join(__dirname, "..", ".cache", "thai-universe.json");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // ทะเบียนเปลี่ยนช้า — วันละครั้งพอ
const FETCH_TIMEOUT_MS = 20000;

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
    req.setTimeout(FETCH_TIMEOUT_MS, () => req.destroy(new Error("SET registry timeout")));
    req.on("error", reject);
  });
}

// securityType "S" = หุ้นสามัญ · ตัดกอง PF&REIT และ IFF (โครงสร้างพื้นฐาน) ออก
// เพราะไม่ใช่ "บริษัท" ที่มี catalyst แบบธุรกิจ
function isCommonStock(rec) {
  return (
    rec &&
    rec.securityType === "S" &&
    rec.sector !== "PF&REIT" &&
    rec.isIFF !== true &&
    typeof rec.symbol === "string" &&
    rec.symbol.length > 0
  );
}

function toStock(rec) {
  const market = rec.market === "mai" ? "mai" : "SET";
  return {
    displaySymbol: rec.symbol,
    providerSymbol: rec.symbol + ".BK",
    name: rec.nameEN || rec.nameTH || rec.symbol,
    nameTH: rec.nameTH || null,
    market,
    universe: market === "mai" ? "MAI" : "SET",
    currency: "THB",
    industry: rec.industry || null,
    sector: rec.sector || null,
    oldSymbols: Array.isArray(rec.oldSymbols) ? rec.oldSymbols : [],
  };
}

async function fetchFromSet() {
  const page = await httpGet(REFERER);
  if (page.status !== 200) throw new Error("SET หน้าเว็บตอบ " + page.status);
  const jar = page.setCookie.map((c) => String(c).split(";")[0]).join("; ");
  if (!jar) throw new Error("ไม่ได้ cookie จาก SET");
  const api = await httpGet(LIST_URL, jar, REFERER);
  if (api.status !== 200) throw new Error("SET registry ตอบ " + api.status);
  const json = JSON.parse(api.body.toString("utf8"));
  const all = Array.isArray(json && json.securitySymbols) ? json.securitySymbols : [];
  if (!all.length) throw new Error("SET registry ว่างเปล่า");
  const stocks = all.filter(isCommonStock).map(toStock);
  if (stocks.length < 500) throw new Error("SET registry ได้แค่ " + stocks.length + " ตัว — ผิดปกติ");
  return { stocks, rawRecords: all.length };
}

function readCache() {
  try {
    const raw = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    if (!Array.isArray(raw && raw.stocks) || !raw.stocks.length) return null;
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

// ลิสต์เดิม: ใช้เมื่อดึงทะเบียนไม่ได้และไม่มี cache เท่านั้น
function fallbackStocks() {
  return getThaiStockUniverse("SET100_MAI").map((s) => ({
    ...s,
    nameTH: null,
    industry: null,
    sector: null,
    oldSymbols: [],
  }));
}

let memo = { at: 0, payload: null };

// คืน { stocks, source, asOf, degraded, note, counts }
async function loadFullThaiUniverse(opts) {
  const force = !!(opts && opts.force);
  const now = Date.now();
  if (!force && memo.payload && now - memo.at < CACHE_TTL_MS) return memo.payload;

  const disk = readCache();
  if (!force && disk && now - Number(disk.at || 0) < CACHE_TTL_MS) {
    const payload = build(disk.stocks, "SET registry (cache บนดิสก์)", disk.at, false, null, disk.rawRecords);
    memo = { at: now, payload };
    return payload;
  }

  try {
    const fresh = await fetchFromSet();
    writeCache({ at: now, stocks: fresh.stocks, rawRecords: fresh.rawRecords });
    const payload = build(fresh.stocks, "SET registry (setapi/stock/list)", now, false, null, fresh.rawRecords);
    memo = { at: now, payload };
    return payload;
  } catch (error) {
    const msg = String((error && error.message) || error);
    if (disk) {
      const payload = build(
        disk.stocks,
        "SET registry (cache เก่า)",
        disk.at,
        true,
        "ดึงทะเบียนสดไม่สำเร็จ (" + msg + ") — ใช้ cache ที่ดึงไว้ล่าสุด",
        disk.rawRecords
      );
      memo = { at: now, payload };
      return payload;
    }
    const payload = build(
      fallbackStocks(),
      "ลิสต์ hard-code เดิม (SET100 + mai บางส่วน)",
      null,
      true,
      "ดึงทะเบียน SET ไม่สำเร็จ (" + msg + ") และไม่มี cache — สแกนได้ไม่ครบทั้งตลาด",
      null
    );
    memo = { at: now, payload };
    return payload;
  }
}

function build(stocks, source, at, degraded, note, rawRecords) {
  const counts = { SET: 0, mai: 0 };
  stocks.forEach((s) => {
    counts[s.market === "mai" ? "mai" : "SET"] += 1;
  });
  return {
    stocks,
    source,
    asOf: at ? new Date(at).toISOString() : null,
    degraded: !!degraded,
    note: note || null,
    counts: { set: counts.SET, mai: counts.mai, total: stocks.length, rawRecords: rawRecords || null },
  };
}

// key: THAI_ALL (ทั้งหมด) · SET_ALL · MAI_ALL
async function getFullUniverse(key) {
  const payload = await loadFullThaiUniverse();
  const k = String(key || "THAI_ALL").toUpperCase();
  let stocks = payload.stocks;
  if (k === "SET_ALL") stocks = stocks.filter((s) => s.market === "SET");
  else if (k === "MAI_ALL") stocks = stocks.filter((s) => s.market === "mai");
  return { ...payload, stocks };
}

module.exports = { loadFullThaiUniverse, getFullUniverse, FULL_KEYS: ["THAI_ALL", "SET_ALL", "MAI_ALL"] };
module.exports.__internals = { isCommonStock, toStock, fetchFromSet, CACHE_FILE };
