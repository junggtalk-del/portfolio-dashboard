"use strict";
// ============================================================
// SEC FILING ADAPTER — แบบรายงานต่อ ก.ล.ต. (TIER_1)
//
// แหล่ง: market.sec.or.th/public/idisc  — เปิดสาธารณะ ไม่ต้อง auth ไม่มี WAF
//   • r59-2     แบบ 59  = การซื้อขายหลักทรัพย์ของกรรมการ/ผู้บริหาร
//   • r246-2    แบบ 246-2 = การได้มา/จำหน่ายไปของผู้ถือหุ้นรายใหญ่ (ข้ามเกณฑ์)
//   • fs-revised = คำสั่งให้แก้ไขงบการเงิน (สัญญาณลบที่ชัดเจน)
//
// ข้อจำกัดที่วัดจริงแล้ว:
//   • ไม่มี parameter กรองรายบริษัท — ต้องดึงตามช่วงวันที่แล้วจัดกลุ่มเอง
//   • ตอบกลับเป็น HTML (server-rendered) ไม่ใช่ JSON
//   • ticker อยู่ในวงเล็บท้ายชื่อบริษัท: "ASIAN ALLIANCE ... (AAI)"
//   • วันที่เป็น dd/mm/yyyy (ค.ศ. ในหน้า en) — หน้า th เป็น พ.ศ. จึงใช้ en เท่านั้น
//
// สิ่งที่ adapter นี้ "ไม่" ทำ:
//   • ไม่ตัดสินว่าผู้บริหารซื้อ = สัญญาณดี — นั่นเป็นการตีความ ไม่ใช่หลักฐานเชิงกลไก
//     EvidenceModel จะจัด INSIDER_BUY เป็น "ไม่มีกลไกเศรษฐกิจ" โดยอัตโนมัติ
//   • ไม่แต่งข้อมูล — ดึงไม่ได้ต้องคืน DATA_UNAVAILABLE
// ============================================================

const https = require("https");
const fs = require("fs");
const path = require("path");

const HOST = "market.sec.or.th";
const BASE = "https://market.sec.or.th/public/idisc/en/ViewMore/";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const CACHE_DIR = path.join(__dirname, "..", "..", ".cache");
const CACHE_FILE = path.join(CACHE_DIR, "sec-filings.json");
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const TIMEOUT_MS = 60000;
const MAX_BYTES = 96 * 1024 * 1024;

const UNAVAILABLE = "DATA_UNAVAILABLE";

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const headers = {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    };
    const req = https.get({ hostname: u.hostname, path: u.pathname + u.search, headers }, (res) => {
      const chunks = [];
      let size = 0;
      res.on("data", (d) => {
        size += d.length;
        if (size > MAX_BYTES) { req.destroy(new Error("SEC ตอบใหญ่เกินกำหนด")); return; }
        chunks.push(d);
      });
      res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
    });
    req.setTimeout(TIMEOUT_MS, () => req.destroy(new Error("SEC timeout")));
    req.on("error", reject);
  });
}

function ymd(d) {
  const dt = d instanceof Date ? d : new Date(String(d));
  if (isNaN(dt.getTime())) return null;
  const p = (n) => String(n).padStart(2, "0");
  return "" + dt.getFullYear() + p(dt.getMonth() + 1) + p(dt.getDate());
}

// dd/mm/yyyy → yyyy-mm-dd · ไม่ตรงรูปแบบ = null (ห้ามเดาวันที่)
function toIso(v) {
  const m = String(v || "").trim().match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  const y = Number(m[3]);
  // กัน พ.ศ. หลุดเข้ามา — ปีเกิน 2400 แปลว่าอ่านหน้าผิดภาษา
  if (y > 2400) return null;
  return m[3] + "-" + m[2] + "-" + m[1];
}

function stripTags(html) {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

// แยกแถว/เซลล์ — ระวัง attribute ที่มีอักขระไทยและ <sup> ปนใน class (พบจริงในหน้า 246-2)
function parseRows(html) {
  const out = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = rowRe.exec(html)) !== null) {
    const cells = [];
    const cellRe = /<t[dh](?:\s+[a-zA-Z-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*))*\s*>([\s\S]*?)<\/t[dh]>/gi;
    let c;
    while ((c = cellRe.exec(m[1])) !== null) cells.push(stripTags(c[1]));
    if (cells.length) out.push(cells);
  }
  return out;
}

// "ASIAN ALLIANCE INTERNATIONAL PUBLIC COMPANY LIMITED (AAI)" → AAI
function tickerOf(companyCell) {
  const m = String(companyCell || "").match(/\(([A-Z0-9&.\-]{1,12})\)\s*$/);
  return m ? m[1] : null;
}

function recordCount(html) {
  const m = String(html).match(/\(\s*([\d,]+)\s*record\(s\)\s*found\s*\)/i);
  return m ? Number(String(m[1]).replace(/,/g, "")) : null;
}

// ---------- แบบ 59: การซื้อขายของกรรมการ/ผู้บริหาร ----------
async function fetchForm59(fromDate, toDate) {
  const from = ymd(fromDate), to = ymd(toDate);
  if (!from || !to) throw new Error("ช่วงวันที่ไม่ถูกต้อง");
  const url = BASE + "r59-2?DateType=1&DateFrom=" + from + "&DateTo=" + to;
  const res = await httpGet(url);
  if (res.status !== 200) throw new Error("SEC r59-2 ตอบ " + res.status);
  const html = res.body.toString("utf8");
  const rows = parseRows(html).filter((c) => c.length >= 8);
  const items = [];
  rows.forEach((c) => {
    const ticker = tickerOf(c[0]);
    const date = toIso(c[4]);
    if (!ticker || !date) return;                 // ข้อมูลไม่ครบ = ไม่เอา ห้ามเดา
    // รายการที่ผู้ยื่นเพิกถอนแล้ว ต้องไม่นับเป็นหลักฐาน (ข้อความต่อท้ายในช่องจำนวน)
    if (/revoked/i.test(c.join(" "))) return;
    const method = String(c[7] || "").trim();
    // จำแนกจากคำที่เอกสารเขียนจริงเท่านั้น ไม่เดา
    let eventType = null;
    if (/^purchase/i.test(method)) eventType = "INSIDER_BUY";
    else if (/^(sale|sell)/i.test(method)) eventType = "INSIDER_SELL";
    else if (/transfer|receipt|acceptance/i.test(method)) eventType = "OTHER";
    if (!eventType) return;
    items.push({
      ticker, date, companyName: c[0], person: c[1] || null, relationship: c[2] || null,
      security: c[3] || null, amount: c[5] || null, avgPrice: c[6] || null,
      method, remark: c[8] || null, eventType, form: "59", url,
    });
  });
  return { items, counter: recordCount(html), bytes: res.body.length, url };
}

// ---------- แบบ 246-2: ผู้ถือหุ้นใหญ่ข้ามเกณฑ์ ----------
async function fetchForm2462(fromDate, toDate) {
  const from = ymd(fromDate), to = ymd(toDate);
  if (!from || !to) throw new Error("ช่วงวันที่ไม่ถูกต้อง");
  const url = BASE + "r246-2?DateType=1&DateFrom=" + from + "&DateTo=" + to;
  const res = await httpGet(url);
  if (res.status !== 200) throw new Error("SEC r246-2 ตอบ " + res.status);
  const html = res.body.toString("utf8");
  // โครงสร้างจริง 14 คอลัมน์ (ตรวจกับหน้าเว็บแล้ว — ต่างจากที่คาดไว้ตอนแรก):
  // 0 ticker · 1 ชื่อผู้ทำรายการ · 2 ได้มา/จำหน่ายไป · 3 ชนิดหลักทรัพย์
  // 4-6 %ก่อน/เปลี่ยน/หลัง · 7 วันที่ทำรายการ · 8-10 %ของกลุ่ม · 11 หมายเหตุ · 13 เลขที่แบบ
  const rows = parseRows(html).filter((c) => c.length >= 8);
  const items = [];
  rows.forEach((c) => {
    if (/revoked/i.test(c.join(" "))) return;
    const raw = String(c[0] || "").trim();
    const ticker = /^[A-Z0-9&.-]{1,12}$/.test(raw) ? raw : tickerOf(raw);
    const date = toIso(c[7]);
    if (!ticker || !date) return;
    const dir = String(c[2] || "").trim();
    const pctChange = String(c[5] || "").trim();
    const pctAfter = String(c[6] || "").trim();
    items.push({ ticker, date, reporter: c[1] || null, direction: dir || null, security: c[3] || null,
      pctBefore: c[4] || null, pctChange: pctChange || null, pctAfter: pctAfter || null,
      detail: (dir ? dir + " " : "") + (pctChange ? pctChange + "% " : "") + "(ถือหลังทำรายการ " + (pctAfter || "?") + "%)",
      eventType: "MAJOR_SHAREHOLDER_CHANGE", form: "246-2", url });
  });
  return { items, counter: recordCount(html), bytes: res.body.length, url };
}

function readCache() {
  try {
    const raw = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    if (!raw || typeof raw.bySymbol !== "object") return null;
    return raw;
  } catch (e) { return null; }
}
function writeCache(payload) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(payload), "utf8");
  } catch (e) { /* ไม่เป็นไร */ }
}

let memo = { at: 0, payload: null };

async function loadFilingIndex(opts) {
  opts = opts || {};
  const force = !!opts.force;
  const months = Number.isFinite(opts.months) ? Math.max(1, Math.min(60, opts.months)) : 24;
  const now = Date.now();
  if (!force && memo.payload && now - memo.at < CACHE_TTL_MS) return memo.payload;

  const disk = readCache();
  if (!force && disk && now - Number(disk.at || 0) < CACHE_TTL_MS && Number(disk.months || 0) >= months) {
    const payload = { ok: true, bySymbol: disk.bySymbol, asOf: new Date(disk.at).toISOString(),
      source: "SEC IDISC (cache บนดิสก์)", coverage: disk.coverage || null, months: disk.months,
      totalItems: disk.totalItems || null, degraded: false, reason: null };
    memo = { at: now, payload };
    return payload;
  }

  const to = new Date();
  const from = new Date(to.getTime() - months * 30.44 * 24 * 60 * 60 * 1000);
  try {
    const [f59, f246] = await Promise.all([fetchForm59(from, to), fetchForm2462(from, to)]);
    const all = f59.items.concat(f246.items);
    if (!all.length) throw new Error("SEC ไม่คืนรายการที่แกะได้เลย");
    const bySymbol = {};
    all.forEach((it) => {
      if (!bySymbol[it.ticker]) bySymbol[it.ticker] = [];
      bySymbol[it.ticker].push(it);
    });
    Object.keys(bySymbol).forEach((k) => bySymbol[k].sort((a, b) => String(a.date).localeCompare(String(b.date))));
    const dates = all.map((i) => i.date).sort();
    const coverage = { from: dates[0] || null, to: dates[dates.length - 1] || null,
      symbols: Object.keys(bySymbol).length, form59: f59.items.length, form2462: f246.items.length,
      counter59: f59.counter, counter2462: f246.counter };
    writeCache({ at: now, months, bySymbol, coverage, totalItems: all.length });
    const payload = { ok: true, bySymbol, asOf: new Date(now).toISOString(),
      source: "SEC IDISC (แบบ 59 + 246-2)", coverage, months, totalItems: all.length, degraded: false, reason: null };
    memo = { at: now, payload };
    return payload;
  } catch (error) {
    const msg = String((error && error.message) || error);
    if (disk) {
      const payload = { ok: true, bySymbol: disk.bySymbol, asOf: new Date(disk.at).toISOString(),
        source: "SEC IDISC (cache เก่า)", coverage: disk.coverage || null, months: disk.months,
        totalItems: disk.totalItems || null, degraded: true,
        reason: "ดึง SEC สดไม่สำเร็จ (" + msg + ") — ใช้ cache ล่าสุด" };
      memo = { at: now, payload };
      return payload;
    }
    const payload = { ok: false, bySymbol: null, asOf: null, source: null, coverage: null, months,
      totalItems: null, degraded: true,
      reason: UNAVAILABLE + ": ดึงเอกสาร ก.ล.ต. ไม่สำเร็จ (" + msg + ") และไม่มี cache" };
    memo = { at: now, payload };
    return payload;
  }
}

// §12 adapter interface
async function fetchThaiFilings(ticker, dateRange, opts) {
  const sym = String(ticker || "").trim().toUpperCase();
  if (!sym) return { ok: false, inspected: false, items: [], reason: UNAVAILABLE + ": ไม่ได้ระบุ ticker", source: null, asOf: null };
  const idx = await loadFilingIndex(opts);
  if (!idx.ok) return { ok: false, inspected: false, items: [], reason: idx.reason, source: null, asOf: null, coverage: null };

  let items = idx.bySymbol[sym] || [];
  const from = dateRange && dateRange.from ? String(dateRange.from).slice(0, 10) : null;
  const to = dateRange && dateRange.to ? String(dateRange.to).slice(0, 10) : null;
  if (from || to) {
    items = items.filter((n) => {
      const d = String(n.date || "").slice(0, 10);
      if (!d) return false;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }
  return { ok: true, inspected: true, items, source: idx.source, asOf: idx.asOf,
    coverage: idx.coverage, degraded: idx.degraded, reason: idx.degraded ? idx.reason : null };
}

// แปลงเป็นหลักฐานดิบพร้อมส่งเข้า EvidenceModel
// หมายเหตุสำคัญ: เอกสารเหล่านี้ยืนยัน "ธุรกรรมที่เกิดขึ้นแล้ว" จึงเป็น C3
// แต่ EvidenceModel จะไม่นับเป็น catalyst เพราะ INSIDER_BUY/SELL ไม่มีกลไกเศรษฐกิจในตัวเอง
function toEvidence(item) {
  if (!item || !item.ticker || !item.date) return null;
  const isInsider = item.form === "59";
  const title = isInsider
    ? (item.person || "ผู้บริหาร") + " " + (item.eventType === "INSIDER_BUY" ? "ซื้อ" : item.eventType === "INSIDER_SELL" ? "ขาย" : "ทำรายการ") +
      " " + (item.security || "หลักทรัพย์") + " " + (item.amount || "") + (item.avgPrice ? " @ " + item.avgPrice : "")
    : (item.reporter || "ผู้ถือหุ้นใหญ่") + " " +
      (/acquisition/i.test(item.direction || "") ? "ได้มา" : /disposition/i.test(item.direction || "") ? "จำหน่ายไป" : "เปลี่ยนแปลงการถือครอง") +
      (item.pctChange ? " " + item.pctChange + "%" : "") +
      (item.pctAfter ? " (ถือหลังทำรายการ " + item.pctAfter + "%)" : "");
  return {
    ticker: item.ticker,
    eventDate: item.date,
    sourceType: isInsider ? "INSIDER_TRANSACTION" : "SEC_FILING",
    sourceName: "ก.ล.ต. แบบ " + item.form,
    sourceUrl: item.url || null,
    eventType: item.eventType,
    title: title.trim(),
    summary: isInsider ? (item.relationship || null) : (item.detail || null),
    evidenceStrength: "C3_CONFIRMED_EVENT",   // ธุรกรรมที่ยื่นแล้ว = เกิดขึ้นจริง
    confidence: null,
    affectedBusiness: null,
    expectedImpact: null,
    status: "VERIFIED",
  };
}

module.exports = { loadFilingIndex, fetchThaiFilings, fetchForm59, fetchForm2462, toEvidence, UNAVAILABLE, CACHE_FILE };
module.exports.__internals = { parseRows, tickerOf, toIso, ymd, stripTags, recordCount };
