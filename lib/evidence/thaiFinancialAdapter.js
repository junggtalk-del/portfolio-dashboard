"use strict";
// ============================================================
// THAI QUARTERLY FINANCIAL ADAPTER (TIER_1) — แหล่งของ C4_FINANCIAL_EVIDENCE
//
// แหล่งหลัก: SET เอง — https://www.set.or.th/api/set/stock/{SYM}/company-highlight/financial-data-chart?accumulated=false
//   ตรวจจริงแล้ว (2026-09-07): TRT/ABM/ADVANC ได้ 18 งวด · UBA 16 งวด · 39 ฟิลด์ · ช่วง 2022-03 → 2026-06
//   ฟิลด์ที่ใช้: totalRevenue, netProfit, eps, ebit, ebitda, netOperating/netInvesting/netFinancing,
//               totalAsset, totalLiability, equity, roa, roe, netProfitMargin, grossProfitMargin, deRatio,
//               isRestatement + restatementDate (ตรวจการปรับปรุงงบย้อนหลังได้)
//   ⚠ หน่วยเป็น "พันบาท" — ยืนยันด้วยการเทียบ TRT Q2/2026: SET 700,xxx (พันบาท) = Yahoo 696.8M บาท
//   ต้อง handshake cookie + Referer แบบเดียวกับ endpoint อื่นของ SET
//
// แหล่งสำรอง: query2.finance.yahoo.com/ws/fundamentals-timeseries
// (ผลทดสอบ Yahoo · §15 · 2026-09-07 · 15 ตัวคละหุ้นใหญ่/เล็ก/mai):
//   • ครบ ≥4 ไตรมาส และ ≥4 ฟิลด์ = 15/15 ตัว รวม UBA, ABM, SMO, EURO, CAZ, SPREME (mai/ไมโครแคป)
//   • ช่วง 2025-03-31 → 2026-06-30 · periodType = "3M" · currencyCode = "THB"
//   • ฟิลด์: TotalRevenue, NetIncome, OperatingIncome, DilutedEPS, FreeCashFlow, TotalDebt
//
// สิ่งที่ "ใช้ไม่ได้" และเหตุผล (บันทึกไว้กันคนอื่นเดินซ้ำ):
//   • Yahoo /v10/quoteSummary?modules=incomeStatementHistoryQuarterly → เชื่อถือไม่ได้กับหุ้นไทย
//       TRT.BK คืนข้อมูลปี 2013-2014 (เก่า 12 ปี) · BTS.BK คืน revenue=0 ทุกไตรมาส
//       M.BK คืน revenue=0 ในไตรมาส 2025-09 · operatingIncome เป็น null ทุกตัว
//   • SET /api/set/stock/{sym}/company-highlight → เป็น "รายปี" (2022-2026) ไม่ใช่รายไตรมาส
//   • SET endpoint งบรายไตรมาสอื่น ๆ ทดสอบแล้ว 400/404 ทั้งหมด
//
// ข้อจำกัดที่ต้องยอมรับ:
//   • ลึกแค่ ~5 ไตรมาส ⇒ เทียบ YoY ได้เพียงไตรมาสล่าสุดหนึ่งคู่
//   • ไตรมาสเก่าสุดมักมีแต่ EPS (revenue เป็น null)
//   • ไม่มี backlog — ไม่มีแหล่งใดให้ ⇒ BACKLOG_INFLECTION ต้องเป็น UNAVAILABLE ตลอด
//   • Yahoo เป็นข้อมูลรวบรวม ไม่ใช่งบที่บริษัทยื่นเอง — แต่จัดเป็น TIER_1 เพราะเป็นตัวเลขงบจริง
//     (ถ้าเจอความไม่สอดคล้อง ระบบจะตั้งธง suspect ไม่กลืนเงียบ ๆ ตาม §15)
// ============================================================

const https = require("https");
const fs = require("fs");
const path = require("path");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const CACHE_DIR = path.join(__dirname, "..", "..", ".cache");
const CACHE_FILE = path.join(CACHE_DIR, "thai-financials.json");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;   // งบออกไตรมาสละครั้ง — วันละครั้งเหลือเฟือ
const TIMEOUT_MS = 30000;
const POLITE_DELAY_MS = 220;

const UNAVAILABLE = "DATA_UNAVAILABLE";
const FIN_UNAVAILABLE = "FINANCIAL_EVIDENCE_UNAVAILABLE";

const FIELDS = [
  ["quarterlyTotalRevenue", "revenue"],
  ["quarterlyNetIncome", "netIncome"],
  ["quarterlyOperatingIncome", "operatingIncome"],
  ["quarterlyDilutedEPS", "eps"],
  ["quarterlyFreeCashFlow", "fcf"],
  ["quarterlyTotalDebt", "totalDebt"],
];

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function get(url, headers, jar) {
  return new Promise((resolve) => {
    let u;
    try { u = new URL(url); } catch (e) { return resolve({ status: 0, err: "bad url" }); }
    const h = Object.assign({ "User-Agent": UA, Accept: "application/json,text/plain,*/*" }, headers || {});
    if (jar) h.Cookie = jar;
    const rq = https.get({ hostname: u.hostname, path: u.pathname + u.search, headers: h }, (r) => {
      const b = [];
      r.on("data", (d) => b.push(d));
      r.on("end", () => resolve({ status: r.statusCode, body: Buffer.concat(b).toString("utf8"),
        setCookie: r.headers["set-cookie"] || [] }));
    });
    rq.setTimeout(TIMEOUT_MS, () => { rq.destroy(); resolve({ status: 0, err: "timeout" }); });
    rq.on("error", (e) => resolve({ status: 0, err: e.message }));
  });
}

// ============================================================
// แหล่งหลัก: SET financial-data-chart
// ============================================================
const SET_REF = "https://www.set.or.th/en/market/get-quote/stock";
const SET_UNIT_MULTIPLIER = 1000;      // ค่าในนี้เป็นพันบาท → คูณพันเพื่อให้เป็นบาท

let setSession = { at: 0, jar: null };

async function ensureSetSession(force) {
  const now = Date.now();
  if (!force && setSession.jar && now - setSession.at < 20 * 60 * 1000) return setSession;
  const page = await get(SET_REF);
  const jar = (page.setCookie || []).map((c) => String(c).split(";")[0]).join("; ");
  setSession = { at: now, jar: jar || null };
  return setSession;
}

function numOrNull(v) { return typeof v === "number" && isFinite(v) ? v : null; }
function scale(v) { const n = numOrNull(v); return n == null ? null : n * SET_UNIT_MULTIPLIER; }

// แปลงงวดของ SET → รูปแบบเดียวกับที่ financial-inflection ใช้
function fromSetPeriod(p) {
  const end = String(p && p.endDate ? p.endDate : "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) return null;
  const begin = String(p.beginDate || "").slice(0, 10);
  // ต้องเป็นงวด 3 เดือน (accumulated=false) — ถ้าช่วงกว้างกว่านั้น ไม่ใช่ไตรมาสเดี่ยว
  let periodType = "3M";
  if (/^\d{4}-\d{2}-\d{2}$/.test(begin)) {
    const days = Math.round((Date.parse(end) - Date.parse(begin)) / 86400000);
    if (days > 120) periodType = days > 250 ? "12M" : "6M";
  }
  const revenue = scale(p.totalRevenue);
  const ebit = scale(p.ebit);
  return {
    date: end,
    beginDate: begin || null,
    currency: "THB",
    periodType,
    quarter: p.quarter == null ? null : p.quarter,
    year: p.year == null ? null : p.year,
    revenue,
    netIncome: scale(p.netProfit),
    operatingIncome: ebit,
    eps: numOrNull(p.eps),                                  // eps เป็นบาทต่อหุ้น ไม่ต้องคูณ
    fcf: (function () {
      const op = scale(p.netOperating), inv = scale(p.netInvesting);
      return op == null ? null : (inv == null ? op : op + inv);   // FCF ประมาณ = CFO + CFI
    })(),
    totalDebt: scale(p.totalLiability),
    ebitda: scale(p.ebitda),
    equity: scale(p.equity),
    roe: numOrNull(p.roe),
    roa: numOrNull(p.roa),
    netProfitMargin: numOrNull(p.netProfitMargin),
    grossProfitMargin: numOrNull(p.grossProfitMargin),
    deRatio: numOrNull(p.deRatio),
    // มาร์จิ้นดำเนินงานคำนวณจาก ebit/revenue เพื่อให้เทียบกันได้กับแหล่งสำรอง
    operatingMargin: (revenue && revenue > 0 && ebit != null) ? ebit / revenue : null,
    restated: p.isRestatement === true || !!p.restatementDate,
    restatementDate: p.restatementDate || null,
    fsType: p.fsType || null,
    src: "SET",
  };
}

async function fetchQuartersFromSet(ticker, opts) {
  opts = opts || {};
  const sym = String(ticker).toUpperCase();
  const ss = await ensureSetSession(opts.forceSession);
  if (!ss.jar) throw new Error("ไม่ได้ cookie จาก SET");
  const url = "https://www.set.or.th/api/set/stock/" + encodeURIComponent(sym) +
    "/company-highlight/financial-data-chart?accumulated=false&lang=en";
  const r = await get(url, { Referer: SET_REF }, ss.jar);
  if (r.status !== 200) throw new Error("SET financial-data-chart ตอบ " + r.status);
  let j;
  try { j = JSON.parse(r.body); } catch (e) { throw new Error("SET financial-data-chart ตอบไม่ใช่ JSON"); }
  const arr = Array.isArray(j) ? j : (j && Array.isArray(j.data) ? j.data : []);
  if (!arr.length) throw new Error("SET ไม่คืนงวดใดเลย");

  const rejected = [];
  const clean = [];
  arr.map(fromSetPeriod).filter(Boolean).forEach((q) => {
    const problems = validQuarter(q);
    if (problems.length) { rejected.push({ date: q.date, problems }); return; }
    clean.push(q);
  });
  clean.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return { symbol: sym, quarters: clean, rejected, rawCount: arr.length, source: "SET company-highlight" };
}

let session = { at: 0, jar: null, crumb: null };

async function ensureSession(force) {
  const now = Date.now();
  if (!force && session.crumb && now - session.at < 30 * 60 * 1000) return session;
  const fc = await get("https://fc.yahoo.com/");
  const jar = (fc.setCookie || []).map((c) => String(c).split(";")[0]).join("; ");
  const cr = await get("https://query2.finance.yahoo.com/v1/test/getcrumb", { Accept: "text/plain" }, jar);
  const crumb = cr.status === 200 && cr.body ? cr.body.trim() : null;
  session = { at: now, jar: jar || null, crumb: crumb || null };
  return session;
}

// ---- §15 ตรวจข้อมูลอย่างเข้มงวด: ห้ามกลืนของเสียเงียบ ๆ ----
function validQuarter(q) {
  const problems = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(q.date || ""))) problems.push("วันที่งวดผิดรูปแบบ");
  if (q.currency && q.currency !== "THB") problems.push("สกุลเงินไม่ใช่ THB (" + q.currency + ")");
  if (q.periodType && q.periodType !== "3M") problems.push("ไม่ใช่งวด 3 เดือน (" + q.periodType + ")");
  // revenue = 0 พร้อมมีกำไร = ข้อมูลเสีย (เจอจริงใน quoteSummary ของ BTS/M)
  if (q.revenue === 0 && q.netIncome != null && q.netIncome !== 0) problems.push("revenue = 0 แต่มีกำไร — ข้อมูลไม่สมเหตุสมผล");
  if (q.revenue != null && q.revenue < 0) problems.push("revenue ติดลบ");
  return problems;
}

async function fetchQuarters(ticker, opts) {
  opts = opts || {};
  const sym = String(ticker).toUpperCase() + ".BK";
  const s = await ensureSession(opts.forceSession);
  const types = FIELDS.map((f) => f[0]).join(",");
  let url = "https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/" + sym +
    "?symbol=" + encodeURIComponent(sym) + "&type=" + types + "&period1=1400000000&period2=1893456000";
  if (s.crumb) url += "&crumb=" + encodeURIComponent(s.crumb);
  const r = await get(url, null, s.jar);
  if (r.status !== 200) throw new Error("Yahoo timeseries ตอบ " + r.status);
  let j;
  try { j = JSON.parse(r.body); } catch (e) { throw new Error("Yahoo timeseries ตอบไม่ใช่ JSON"); }
  const arr = (j.timeseries && j.timeseries.result) || [];

  const byDate = {};
  const seen = {};
  arr.forEach((block) => {
    const key = Object.keys(block).find((k) => k !== "meta" && k !== "timestamp");
    if (!key || !Array.isArray(block[key])) return;
    const map = FIELDS.find((f) => f[0] === key);
    if (!map) return;
    block[key].filter(Boolean).forEach((v) => {
      const d = v.asOfDate;
      if (!d) return;
      if (!byDate[d]) byDate[d] = { date: d, currency: null, periodType: null };
      const raw = v.reportedValue && typeof v.reportedValue.raw === "number" ? v.reportedValue.raw : null;
      // ค่าซ้ำงวดเดียวกัน (restatement) — เก็บค่าแรกและตั้งธง
      const sk = d + ":" + map[1];
      if (seen[sk] && byDate[d][map[1]] != null && byDate[d][map[1]] !== raw) {
        byDate[d].restated = true;
      }
      seen[sk] = true;
      byDate[d][map[1]] = raw;
      if (v.currencyCode) byDate[d].currency = v.currencyCode;
      if (v.periodType) byDate[d].periodType = v.periodType;
    });
  });

  const quarters = Object.keys(byDate).sort().map((d) => byDate[d]);
  const rejected = [];
  const clean = [];
  quarters.forEach((q) => {
    const problems = validQuarter(q);
    if (problems.length) { rejected.push({ date: q.date, problems }); return; }
    // margin คำนวณได้เมื่อมีทั้ง revenue และ operatingIncome และ revenue > 0
    q.operatingMargin = (q.revenue && q.revenue > 0 && q.operatingIncome != null)
      ? q.operatingIncome / q.revenue : null;
    clean.push(q);
  });

  return { symbol: sym, quarters: clean, rejected, rawCount: quarters.length };
}

function readCache() {
  try {
    const raw = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    if (!raw || typeof raw.byTicker !== "object") return null;
    return raw;
  } catch (e) { return null; }
}
function writeCache(payload) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(payload), "utf8");
  } catch (e) { /* ไม่เป็นไร */ }
}

let memoIdx = null;

// §12 adapter interface — คืน { ok, inspected, quarters[], ... }
// inspected = false เมื่อดึงไม่สำเร็จ ⇒ ต้องเป็น FINANCIAL_EVIDENCE_UNAVAILABLE (§13)
async function fetchThaiFinancialEvidence(ticker, dateRange, opts) {
  opts = opts || {};
  const sym = String(ticker || "").trim().toUpperCase();
  if (!sym) {
    return { ok: false, inspected: false, quarters: [], items: [], source: null, asOf: null,
      reason: FIN_UNAVAILABLE + ": ไม่ได้ระบุ ticker" };
  }
  const now = Date.now();
  if (!memoIdx) memoIdx = readCache() || { at: 0, byTicker: {} };

  const cached = memoIdx.byTicker[sym];
  if (!opts.force && cached && now - Number(cached.at || 0) < CACHE_TTL_MS) {
    return { ok: true, inspected: true, quarters: cached.quarters, items: [],
      source: (cached.source || "งบรายไตรมาส") + " (cache)", asOf: new Date(cached.at).toISOString(),
      rejected: cached.rejected || [], degraded: false, reason: null };
  }

  // ลองแหล่งหลัก (SET) ก่อน — ลึกกว่าและเป็นข้อมูลของตลาดเอง
  let r = null, usedSource = null, primaryError = null;
  try {
    r = await fetchQuartersFromSet(sym, opts);
    usedSource = "SET company-highlight (financial-data-chart)";
    if (!r.quarters.length) { primaryError = "SET ไม่มีงวดที่ผ่านการตรวจ"; r = null; }
  } catch (e) {
    primaryError = String((e && e.message) || e);
    r = null;
  }
  try {
    if (!r) {
      r = await fetchQuarters(sym, opts);
      usedSource = "Yahoo fundamentals-timeseries (สำรอง)" + (primaryError ? " — SET ล้มเหลว: " + primaryError : "");
      if (!r.quarters.length) throw new Error("ไม่มีไตรมาสที่ผ่านการตรวจ (ดิบ " + r.rawCount + " งวด)");
    }
    memoIdx.byTicker[sym] = { at: now, quarters: r.quarters, rejected: r.rejected, source: usedSource };
    memoIdx.at = now;
    writeCache(memoIdx);
    return { ok: true, inspected: true, quarters: r.quarters, items: [],
      source: usedSource, asOf: new Date(now).toISOString(),
      rejected: r.rejected, degraded: false, reason: null };
  } catch (error) {
    const msg = String((error && error.message) || error);
    if (cached) {
      return { ok: true, inspected: true, quarters: cached.quarters, items: [],
        source: "Yahoo fundamentals-timeseries (cache เก่า)", asOf: new Date(cached.at).toISOString(),
        rejected: cached.rejected || [], degraded: true,
        reason: "ดึงงบสดไม่สำเร็จ (" + msg + ") — ใช้ cache ล่าสุด" };
    }
    // ห้ามคืน quarters: [] แบบเงียบ ๆ เพราะจะถูกอ่านว่า "ไม่มี inflection"
    return { ok: false, inspected: false, quarters: [], items: [], source: null, asOf: null,
      rejected: [], degraded: true,
      reason: FIN_UNAVAILABLE + ": ดึงงบรายไตรมาสไม่สำเร็จ (" + msg + ")" };
  }
}

// ดึงหลายตัวแบบสุภาพ
async function fetchMany(tickers, opts) {
  const out = {};
  const list = Array.isArray(tickers) ? tickers : [];
  for (let i = 0; i < list.length; i++) {
    if (i > 0) await sleep(POLITE_DELAY_MS);
    try { out[list[i]] = await fetchThaiFinancialEvidence(list[i], null, opts); }
    catch (e) {
      out[list[i]] = { ok: false, inspected: false, quarters: [], items: [],
        reason: FIN_UNAVAILABLE + ": " + String((e && e.message) || e) };
    }
  }
  return out;
}

module.exports = { fetchThaiFinancialEvidence, fetchMany, fetchQuarters, fetchQuartersFromSet, ensureSession, ensureSetSession,
  UNAVAILABLE, FIN_UNAVAILABLE, CACHE_FILE, FIELDS };
module.exports.__internals = { validQuarter, get, fromSetPeriod, scale, SET_UNIT_MULTIPLIER };
