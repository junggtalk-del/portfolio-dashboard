"use strict";
// ============================================================
// SET DISCLOSURE ADAPTER — แหล่งหลักฐานจริงชั้น TIER_1
//
// แหล่ง: https://www.set.or.th/api/set/news/search  (ทะเบียนข่าว/ข้อมูลเผยแพร่ของตลาดเอง)
// ต้อง handshake แบบเดียวกับทะเบียนหุ้น (cookie + Referer) — ใช้ซ้ำจาก lib/thaiUniverseFull
//
// กลยุทธ์ดึงข้อมูล (วัดจริงแล้ว):
//   • bulk ตามช่วงวันที่ ไม่ระบุ symbol → ข่าวทั้งตลาดในครั้งเดียว
//     01/01/2026–07/09/2026 = 48,962 รายการ 4,876 symbol 18.8MB ใน ~4 วินาที
//   • per-ticker (/api/set/news/{sym}/list) คืนแค่ 4 ข่าวล่าสุด ไม่มีประวัติ → ใช้ไม่ได้
//   ⇒ ดึง bulk ครั้งเดียวแล้วจัดกลุ่มตาม symbol ฝั่งเรา
//
// สิ่งที่ adapter นี้ "ไม่" ทำ:
//   • ไม่ตัดสินว่าเป็น catalyst หรือไม่ (นั่นเป็นงานของ evidence-model + classifier)
//   • ไม่แต่งข้อมูลที่ไม่มี — ดึงไม่ได้ต้องคืน DATA_UNAVAILABLE
// ============================================================

const https = require("https");
const fs = require("fs");
const path = require("path");

const NEWS_URL = "https://www.set.or.th/api/set/news/search";
const REFERER = "https://www.set.or.th/en/market/get-quote/stock";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const CACHE_DIR = path.join(__dirname, "..", "..", ".cache");
const CACHE_FILE = path.join(CACHE_DIR, "set-news.json");
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // ข่าวออกระหว่างวัน — 6 ชม.กำลังดี
const TIMEOUT_MS = 90000;
const MAX_BYTES = 64 * 1024 * 1024;

const UNAVAILABLE = "DATA_UNAVAILABLE";

function httpGet(url, cookies, referer) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const headers = { "User-Agent": UA, Accept: "application/json, text/plain, */*", "Accept-Language": "en-US,en;q=0.9" };
    if (cookies) headers.Cookie = cookies;
    if (referer) headers.Referer = referer;
    const req = https.get({ hostname: u.hostname, path: u.pathname + u.search, headers }, (res) => {
      const chunks = [];
      let size = 0;
      res.on("data", (d) => {
        size += d.length;
        if (size > MAX_BYTES) { req.destroy(new Error("SET news ตอบใหญ่เกิน " + MAX_BYTES + " ไบต์")); return; }
        chunks.push(d);
      });
      res.on("end", () => resolve({ status: res.statusCode, setCookie: res.headers["set-cookie"] || [], body: Buffer.concat(chunks) }));
    });
    req.setTimeout(TIMEOUT_MS, () => req.destroy(new Error("SET news timeout")));
    req.on("error", reject);
  });
}

// dd/mm/yyyy ตามที่ API ต้องการ (ยืนยันแล้วว่า yyyy-mm-dd ได้ HTTP 400)
function toSetDate(d) {
  const dt = d instanceof Date ? d : new Date(String(d));
  if (isNaN(dt.getTime())) return null;
  const p = (n) => String(n).padStart(2, "0");
  return p(dt.getDate()) + "/" + p(dt.getMonth() + 1) + "/" + dt.getFullYear();
}

async function handshake() {
  const page = await httpGet(REFERER);
  if (page.status !== 200) throw new Error("SET หน้าเว็บตอบ " + page.status);
  const jar = page.setCookie.map((c) => String(c).split(";")[0]).join("; ");
  if (!jar) throw new Error("ไม่ได้ cookie จาก SET");
  return jar;
}

// ดึงข่าวทั้งตลาดในช่วงวันที่ — คืน array ดิบตามที่ SET ให้มา (ไม่แปลงความหมายใด ๆ)
async function fetchBulkNews(fromDate, toDate, opts) {
  const jar = (opts && opts.jar) || (await handshake());
  const from = toSetDate(fromDate), to = toSetDate(toDate);
  if (!from || !to) throw new Error("ช่วงวันที่ไม่ถูกต้อง");
  const lang = (opts && opts.lang) || "en";
  const url = `${NEWS_URL}?lang=${encodeURIComponent(lang)}&fromDate=${encodeURIComponent(from)}&toDate=${encodeURIComponent(to)}`;
  const res = await httpGet(url, jar, REFERER);
  if (res.status !== 200) throw new Error("SET news ตอบ " + res.status);
  const json = JSON.parse(res.body.toString("utf8"));
  const list = Array.isArray(json && json.newsInfoList) ? json.newsInfoList : [];
  return { list, totalCount: Number(json && json.totalCount) || list.length, from, to, lang, bytes: res.body.length };
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
  } catch (e) { /* เขียน cache ไม่ได้ก็ยังทำงานต่อได้ */ }
}

// จัดกลุ่มตาม symbol — เก็บเฉพาะฟิลด์ที่ SET ให้จริง ไม่เติมอะไรเอง
function groupBySymbol(list) {
  const by = {};
  list.forEach((n) => {
    const sym = n && typeof n.symbol === "string" ? n.symbol.trim().toUpperCase() : "";
    if (!sym) return;
    if (!by[sym]) by[sym] = [];
    by[sym].push({
      id: n.id == null ? null : String(n.id),
      datetime: n.datetime || null,
      symbol: sym,
      source: n.source || null,
      url: n.url || null,
      headline: n.headline || null,
      tag: n.tag == null || n.tag === "" ? null : String(n.tag),
      product: n.product || null,
      lang: n.lang || null,
    });
  });
  Object.keys(by).forEach((k) => {
    by[k].sort((a, b) => String(a.datetime || "").localeCompare(String(b.datetime || "")));
  });
  return by;
}

let memo = { at: 0, payload: null };

// โหลดคลังข่าว (bulk + cache) — คืน { ok, bySymbol, ... } หรือ { ok:false, reason }
async function loadNewsIndex(opts) {
  opts = opts || {};
  const force = !!opts.force;
  const months = Number.isFinite(opts.months) ? Math.max(1, Math.min(60, opts.months)) : 24;
  const now = Date.now();

  if (!force && memo.payload && now - memo.at < CACHE_TTL_MS) return memo.payload;

  const disk = readCache();
  if (!force && disk && now - Number(disk.at || 0) < CACHE_TTL_MS && Number(disk.months || 0) >= months) {
    const payload = { ok: true, bySymbol: disk.bySymbol, asOf: new Date(disk.at).toISOString(),
      source: "SET Disclosure (cache บนดิสก์)", coverage: disk.coverage || null, months: disk.months,
      totalItems: disk.totalItems || null, degraded: false, reason: null };
    memo = { at: now, payload };
    return payload;
  }

  const to = new Date();
  const from = new Date(to.getTime() - months * 30.44 * 24 * 60 * 60 * 1000);
  try {
    const bulk = await fetchBulkNews(from, to, { lang: opts.lang || "en" });
    const bySymbol = groupBySymbol(bulk.list);
    const dates = bulk.list.map((n) => n.datetime).filter(Boolean).sort();
    const coverage = { from: (dates[0] || "").slice(0, 10) || null, to: (dates[dates.length - 1] || "").slice(0, 10) || null,
      symbols: Object.keys(bySymbol).length, requestedFrom: bulk.from, requestedTo: bulk.to };
    writeCache({ at: now, months, bySymbol, coverage, totalItems: bulk.list.length });
    const payload = { ok: true, bySymbol, asOf: new Date(now).toISOString(),
      source: "SET Disclosure (api/set/news/search)", coverage, months,
      totalItems: bulk.list.length, degraded: false, reason: null };
    memo = { at: now, payload };
    return payload;
  } catch (error) {
    const msg = String((error && error.message) || error);
    if (disk) {
      const payload = { ok: true, bySymbol: disk.bySymbol, asOf: new Date(disk.at).toISOString(),
        source: "SET Disclosure (cache เก่า)", coverage: disk.coverage || null, months: disk.months,
        totalItems: disk.totalItems || null, degraded: true,
        reason: "ดึงข่าวสดไม่สำเร็จ (" + msg + ") — ใช้ cache ล่าสุด" };
      memo = { at: now, payload };
      return payload;
    }
    // ไม่มีข้อมูลเลย = DATA_UNAVAILABLE ห้ามคืน list ว่างเปล่าแบบเงียบ ๆ
    const payload = { ok: false, bySymbol: null, asOf: null, source: null, coverage: null,
      months, totalItems: null, degraded: true,
      reason: UNAVAILABLE + ": ดึงข้อมูลเผยแพร่จาก SET ไม่สำเร็จ (" + msg + ") และไม่มี cache" };
    memo = { at: now, payload };
    return payload;
  }
}

// ---- §12 adapter interface: fetchThaiCompanyEvents(ticker, dateRange) ----
// คืน { ok, inspected, items[], ... }
//  inspected = true  → ตรวจแหล่งข้อมูลสำเร็จแล้ว (ไม่เจอ = NO_CATALYST ได้)
//  inspected = false → ตรวจไม่สำเร็จ (ต้องเป็น CATALYST_UNAVAILABLE เท่านั้น)
async function fetchThaiCompanyEvents(ticker, dateRange, opts) {
  const sym = String(ticker || "").trim().toUpperCase();
  if (!sym) return { ok: false, inspected: false, items: [], reason: UNAVAILABLE + ": ไม่ได้ระบุ ticker", source: null, asOf: null };
  const idx = await loadNewsIndex(opts);
  if (!idx.ok) return { ok: false, inspected: false, items: [], reason: idx.reason, source: null, asOf: null, coverage: null };

  let items = idx.bySymbol[sym] || [];
  const from = dateRange && dateRange.from ? String(dateRange.from).slice(0, 10) : null;
  const to = dateRange && dateRange.to ? String(dateRange.to).slice(0, 10) : null;
  if (from || to) {
    items = items.filter((n) => {
      const d = String(n.datetime || "").slice(0, 10);
      if (!d) return false;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }
  return { ok: true, inspected: true, items, source: idx.source, asOf: idx.asOf,
    coverage: idx.coverage, degraded: idx.degraded, reason: idx.degraded ? idx.reason : null };
}

module.exports = {
  loadNewsIndex, fetchThaiCompanyEvents, fetchBulkNews,
  UNAVAILABLE, CACHE_FILE,
};
module.exports.__internals = { toSetDate, groupBySymbol, handshake, httpGet, REFERER };
