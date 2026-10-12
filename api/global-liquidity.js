"use strict";
// ============================================================
// GLOBAL LIQUIDITY — proxy ของ FRED (Fed / ECB / BOJ + อัตราแลกเปลี่ยน)
//
// ทำไมต้องมี endpoint นี้: fredgraph.csv ไม่ส่ง Access-Control-Allow-Origin
// เบราว์เซอร์จึงยิงตรงไม่ได้ · ที่นี่ทำหน้าที่ "ดึงมาส่งต่อ" อย่างเดียว
// ไม่ตีความ ไม่คำนวณตัวชี้วัด — ตรรกะทั้งหมดอยู่ใน global-liquidity-engine.js
// ฝั่ง client เพื่อให้ทดสอบได้โดยไม่ต้องมีเน็ต
//
// สิ่งที่ต้องรู้เกี่ยวกับข้อมูล (ส่งติดไปกับผลลัพธ์ทุกครั้ง):
//   WALCL      รายสัปดาห์ (พุธ)  · ล้าน USD
//   ECBASSETSW รายสัปดาห์ (ศุกร์) · ล้าน EUR  — ออกช้ากว่า Fed ~1-2 สัปดาห์
//   JPNASSETS  *รายเดือน*        · 100 ล้าน JPY — ความถี่ต่ำกว่าอีกสองตัว
//   DEXUSEU    รายวัน · USD ต่อ 1 EUR
//   DEXJPUS    รายวัน · JPY ต่อ 1 USD
// ============================================================

const FRED_CSV = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=";

// ชุดข้อมูลที่ดึง — unit/freq ติดไปด้วยเพื่อให้ฝั่ง client ไม่ต้องเดา
const SERIES = {
  fed: { id: "WALCL", unit: "millionUSD", freq: "weekly", label: "Fed total assets" },
  ecb: { id: "ECBASSETSW", unit: "millionEUR", freq: "weekly", label: "ECB total assets" },
  boj: { id: "JPNASSETS", unit: "hundredMillionJPY", freq: "monthly", label: "BOJ total assets" },
  usdPerEur: { id: "DEXUSEU", unit: "usdPerEur", freq: "daily", label: "USD/EUR" },
  jpyPerUsd: { id: "DEXJPUS", unit: "jpyPerUsd", freq: "daily", label: "JPY/USD" },
};

const CACHE_MS = 6 * 60 * 60 * 1000;   // ข้อมูลรายสัปดาห์/รายเดือน — 6 ชม. เหลือเฟือ
const FETCH_TIMEOUT_MS = 20000;
let cache = { at: 0, payload: null };

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(payload));
}

// FRED ใส่ "." แทนค่าว่างในวันหยุด — ต้องทิ้ง ไม่ใช่แปลงเป็น 0
function parseCsv(text) {
  const out = [];
  const lines = String(text || "").split("\n");
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const comma = line.indexOf(",");
    if (comma < 0) continue;
    const date = line.slice(0, comma).trim();
    const raw = line.slice(comma + 1).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (raw === "" || raw === ".") continue;
    const value = Number(raw);
    if (!Number.isFinite(value)) continue;
    out.push({ date, value });
  }
  return out;
}

// ตัดประวัติเก่าทิ้งก่อนส่ง — ชุดเต็มรวมกัน ~0.84 MB ซึ่งเกินจำเป็นมาก
// กราฟใช้ย้อนหลังไม่กี่ปี และการหาค่า lag ที่ fit ที่สุดก็ใช้ช่วงเดียวกัน
function trim(rows, fromDate) {
  if (!fromDate) return rows;
  const out = [];
  for (let i = 0; i < rows.length; i++) if (rows[i].date >= fromDate) out.push(rows[i]);
  // กันกรณีขอช่วงสั้นจนไม่เหลืออะไร — ส่งท้าย ๆ กลับไปอย่างน้อยหนึ่งกำมือ
  return out.length ? out : rows.slice(-8);
}

async function fetchSeries(key) {
  const meta = SERIES[key];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(FRED_CSV + encodeURIComponent(meta.id), {
      signal: controller.signal,
      headers: { "user-agent": "Mozilla/5.0 (compatible; portfolio-dashboard/1.0)" },
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const rows = parseCsv(await r.text());
    if (!rows.length) throw new Error("ไม่มีแถวข้อมูลที่ใช้ได้");
    return {
      key, id: meta.id, label: meta.label, unit: meta.unit, freq: meta.freq,
      ok: true, rows, firstDate: rows[0].date, lastDate: rows[rows.length - 1].date, count: rows.length,
    };
  } catch (error) {
    return {
      key, id: meta.id, label: meta.label, unit: meta.unit, freq: meta.freq,
      ok: false, rows: [], firstDate: null, lastDate: null, count: 0,
      error: String((error && error.message) || error),
    };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    send(res, 405, { error: "Method not allowed." });
    return;
  }
  const force = String((req.query && req.query.force) || "") === "1";
  let years = Number((req.query && req.query.years) || 8);
  if (!Number.isFinite(years) || years < 1) years = 8;
  if (years > 30) years = 30;
  const fromDate = new Date(Date.now() - years * 365.25 * 86400000).toISOString().slice(0, 10);

  if (!force && cache.payload && Date.now() - cache.at < CACHE_MS) {
    send(res, 200, Object.assign({}, trimPayload(cache.payload, fromDate, years), {
      cached: true, cacheAgeSec: Math.round((Date.now() - cache.at) / 1000),
    }));
    return;
  }

  const keys = Object.keys(SERIES);
  const results = await Promise.all(keys.map(fetchSeries));
  const series = {};
  results.forEach((r) => { series[r.key] = r; });

  // ขาดตัวไหนบอกตรง ๆ — ฝั่ง client จะได้ไม่คำนวณต่อบนข้อมูลที่ไม่ครบ
  const missing = results.filter((r) => !r.ok).map((r) => r.id);
  const payload = {
    source: "FRED (fredgraph.csv) — Fed · ECB · BOJ · FX",
    sourceUrl: "https://fred.stlouisfed.org/",
    generatedAt: new Date().toISOString(),
    complete: missing.length === 0,
    missing,
    notes: {
      boj: "JPNASSETS เป็นข้อมูลรายเดือน ไม่ใช่รายสัปดาห์ — ฝั่ง client ต้องถือค่าเดิมไปจนกว่าจะมีเดือนใหม่",
      ecbLag: "ECBASSETSW มักออกช้ากว่า WALCL ราว 1-2 สัปดาห์ สัปดาห์ท้าย ๆ จึงอาจมีไม่ครบทั้งสามธนาคาร",
      units: "WALCL = ล้าน USD · ECBASSETSW = ล้าน EUR · JPNASSETS = 100 ล้าน JPY (ต้องแปลงก่อนรวม)",
    },
    series,
    cached: false,
  };

  // เก็บ cache เป็นชุดเต็ม แล้วค่อยตัดตอนส่ง — ขอช่วงสั้นลงจะได้ไม่ต้องยิง FRED ใหม่
  if (payload.complete) cache = { at: Date.now(), payload };
  send(res, payload.complete ? 200 : 503, trimPayload(payload, fromDate, years));
};

function trimPayload(payload, fromDate, years) {
  const series = {};
  Object.keys(payload.series).forEach((k) => {
    const s = payload.series[k];
    const rows = trim(s.rows, fromDate);
    series[k] = Object.assign({}, s, {
      rows,
      firstDate: rows.length ? rows[0].date : null,
      count: rows.length,
      fullCount: s.count,
    });
  });
  return Object.assign({}, payload, { series, requestedYears: years, trimmedFrom: fromDate });
}

module.exports.__internals = { parseCsv, trim, SERIES };
