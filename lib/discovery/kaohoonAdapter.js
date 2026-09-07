"use strict";
// ============================================================
// KAOHOON DISCOVERY ADAPTER — ข่าวหุ้นไทย (TIER_3)
//
// แหล่ง: https://www.kaohoon.com/wp-json/wp/v2/posts   (WordPress REST API สาธารณะ)
// ตรวจจริงแล้ว: HTTP 200 · ไม่ต้อง auth · robots.txt ห้ามแค่ /wp-admin/ และเผยแพร่ sitemap เอง
//
// สิ่งที่ได้จริง (วัดแล้ว):
//   • date (ISO) · link (canonical) · title.rendered · excerpt · content.rendered เต็ม ~2,600 ตัวอักษร
//   • pagination ลึก (page=40 ยังตอบ 200)
//   • ?search= ค้นคำภาษาไทยได้ — สำคัญมาก เพราะ SET Disclosure ไม่มีคำว่า backlog/ได้งานเลย
//     ตัวอย่างจริง: ค้น "backlog" → "SAMART ตุนแบ็กล็อก 1.6 หมื่นล." · "SPREME ตุนแบ็กล็อก 5.6 พันลบ."
//
// ข้อจำกัดที่ต้องยอมรับ:
//   • เป็น TIER_3 → เพดานความแข็ง C2 เท่านั้น (บังคับที่ evidence-model) สร้าง C3 ไม่ได้
//   • ระบุ ticker จากพาดหัวได้เพียงบางส่วน — วัดจาก 40 พาดหัวจริง: 7 WEAK · 3 AMBIGUOUS · 30 UNKNOWN
//     พาดหัวส่วนใหญ่เป็นภาวะตลาด/ค่าเงิน/บทวิเคราะห์ ไม่ใช่เรื่องของหุ้นตัวใดตัวหนึ่ง
//   • ห้ามใช้เป็นหลักฐาน — เป็นแหล่ง "ค้นพบ" ล้วน
//
// สิ่งที่ adapter นี้ไม่ทำ: ไม่ตัดสินสถานะใด ๆ · ไม่แต่งข้อมูล · ดึงไม่ได้ = DATA_UNAVAILABLE
// ============================================================

const https = require("https");
const fs = require("fs");
const path = require("path");

const HOST = "www.kaohoon.com";
const API = "/wp-json/wp/v2/posts";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const CACHE_DIR = path.join(__dirname, "..", "..", ".cache");
const CACHE_FILE = path.join(CACHE_DIR, "discovery-kaohoon.json");
const CACHE_TTL_MS = 3 * 60 * 60 * 1000;     // ข่าวออกทั้งวัน — 3 ชม.
const TIMEOUT_MS = 30000;
const POLITE_DELAY_MS = 350;                  // ไม่ยิงถี่
const MAX_PAGES = 12;                         // กันดึงเกินจำเป็น
const PER_PAGE = 50;

const UNAVAILABLE = "DATA_UNAVAILABLE";

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function httpGetJson(pathWithQuery) {
  return new Promise((resolve, reject) => {
    const req = https.get({ hostname: HOST, path: pathWithQuery, headers: {
      "User-Agent": UA, Accept: "application/json", "Accept-Language": "th,en;q=0.9",
    } }, (res) => {
      const chunks = [];
      res.on("data", (d) => chunks.push(d));
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf8");
        if (res.statusCode !== 200) return reject(new Error("Kaohoon ตอบ " + res.statusCode));
        try { resolve({ json: JSON.parse(body), total: Number(res.headers["x-wp-total"]) || null }); }
        catch (e) { reject(new Error("Kaohoon ตอบไม่ใช่ JSON")); }
      });
    });
    req.setTimeout(TIMEOUT_MS, () => req.destroy(new Error("Kaohoon timeout")));
    req.on("error", reject);
  });
}

function strip(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/&#8220;|&#8221;/g, '"').replace(/&#8216;|&#8217;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (m, n) => { try { return String.fromCodePoint(Number(n)); } catch (e) { return " "; } })
    .replace(/\s+/g, " ").trim();
}

// แปลงโพสต์ WordPress → รูปแบบดิบของ DiscoveryEvent (ยังไม่ normalize)
function toRawDiscovery(post) {
  if (!post) return null;
  const title = strip(post.title && post.title.rendered);
  if (!title) return null;
  const iso = String(post.date || "").slice(0, 10);
  const content = strip(post.content && post.content.rendered);
  return {
    id: "kaohoon:" + post.id,
    sourceType: "NEWS",
    sourceName: "ข่าวหุ้น (Kaohoon)",
    sourceUrl: post.link || null,          // §27 ไม่มีก็ null ห้ามแต่ง
    publishedAt: /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null,
    eventDate: null,                        // ข่าวไม่บอกวันที่เหตุการณ์แยก — ห้ามเดา
    title,
    summary: strip(post.excerpt && post.excerpt.rendered).slice(0, 400) || null,
    rawClaim: title,
    fullText: content || null,
    ticker: null,                           // ให้ discovery-plane สกัดเอง (กฎอนุรักษ์นิยม)
    confidence: null,
    verificationStatus: "UNVERIFIED",
  };
}

function readCache() {
  try {
    const raw = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    if (!raw || !Array.isArray(raw.items)) return null;
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

// ดึงโพสต์ล่าสุดหลายหน้า (ค่าเริ่มต้น 4 หน้า = ~200 ข่าว ≈ 2-3 วัน)
async function fetchRecent(opts) {
  opts = opts || {};
  const pages = Math.max(1, Math.min(MAX_PAGES, opts.pages || 4));
  const items = [];
  let total = null;
  for (let p = 1; p <= pages; p++) {
    if (p > 1) await sleep(POLITE_DELAY_MS);
    const r = await httpGetJson(API + "?per_page=" + PER_PAGE + "&page=" + p + "&_fields=id,date,link,title,excerpt,content");
    if (total == null) total = r.total;
    if (!Array.isArray(r.json) || !r.json.length) break;
    r.json.forEach((post) => { const d = toRawDiscovery(post); if (d) items.push(d); });
    if (r.json.length < PER_PAGE) break;
  }
  return { items, total };
}

// ค้นด้วยคำ (ไทย/อังกฤษ) — นี่คือช่องที่เติมสิ่งที่ SET Disclosure ไม่มี
async function searchKeyword(keyword, opts) {
  opts = opts || {};
  const per = Math.max(1, Math.min(50, opts.limit || 20));
  const r = await httpGetJson(API + "?per_page=" + per +
    "&search=" + encodeURIComponent(String(keyword)) + "&_fields=id,date,link,title,excerpt,content");
  const items = [];
  (Array.isArray(r.json) ? r.json : []).forEach((post) => {
    const d = toRawDiscovery(post);
    if (d) { d.matchedKeyword = String(keyword); items.push(d); }
  });
  return { items, total: r.total };
}

// โหลดคลังสัญญาณค้นพบ (ข่าวล่าสุด + ค้นคำชุดที่กำหนด) พร้อม cache
async function loadDiscoveryIndex(opts) {
  opts = opts || {};
  const now = Date.now();
  if (!opts.force && memo.payload && now - memo.at < CACHE_TTL_MS) return memo.payload;

  const disk = readCache();
  if (!opts.force && disk && now - Number(disk.at || 0) < CACHE_TTL_MS) {
    const payload = { ok: true, inspected: true, items: disk.items, source: "Kaohoon (cache บนดิสก์)",
      asOf: new Date(disk.at).toISOString(), coverage: disk.coverage || null, degraded: false, reason: null };
    memo = { at: now, payload };
    return payload;
  }

  try {
    const recent = await fetchRecent({ pages: opts.pages || 4 });
    const byId = {};
    recent.items.forEach((i) => { byId[i.id] = i; });

    // ค้นคำเฉพาะเรื่องที่เกี่ยวกับ catalyst (ไม่ใช่ทุกคำใน KEYWORDS — จะยิงถี่เกินไป)
    const queries = Array.isArray(opts.keywords) && opts.keywords.length ? opts.keywords : DEFAULT_QUERIES;
    for (const q of queries) {
      await sleep(POLITE_DELAY_MS);
      try {
        const r = await searchKeyword(q, { limit: 20 });
        r.items.forEach((i) => {
          if (byId[i.id]) {
            // เก็บคำที่ตรงเพิ่ม ไม่ทับของเดิม
            byId[i.id].matchedKeywords = (byId[i.id].matchedKeywords || []).concat([q]);
          } else {
            i.matchedKeywords = [q];
            byId[i.id] = i;
          }
        });
      } catch (e) { /* คำเดียวล้มเหลวไม่ล้มทั้งชุด */ }
    }

    const items = Object.keys(byId).map((k) => byId[k]);
    const dates = items.map((i) => i.publishedAt).filter(Boolean).sort();
    const coverage = { from: dates[0] || null, to: dates[dates.length - 1] || null,
      count: items.length, siteTotalPosts: recent.total, queries: queries.slice() };
    writeCache({ at: now, items, coverage });
    const payload = { ok: true, inspected: true, items, source: "Kaohoon (wp-json)",
      asOf: new Date(now).toISOString(), coverage, degraded: false, reason: null };
    memo = { at: now, payload };
    return payload;
  } catch (error) {
    const msg = String((error && error.message) || error);
    if (disk) {
      const payload = { ok: true, inspected: true, items: disk.items, source: "Kaohoon (cache เก่า)",
        asOf: new Date(disk.at).toISOString(), coverage: disk.coverage || null, degraded: true,
        reason: "ดึงข่าวสดไม่สำเร็จ (" + msg + ") — ใช้ cache ล่าสุด" };
      memo = { at: now, payload };
      return payload;
    }
    // ห้ามคืน [] เฉย ๆ เพราะจะถูกอ่านว่า "ตรวจแล้วไม่มี"
    const payload = { ok: false, inspected: false, items: [], source: null, asOf: null, coverage: null,
      degraded: true, reason: UNAVAILABLE + ": ดึงข่าว Kaohoon ไม่สำเร็จ (" + msg + ") และไม่มี cache" };
    memo = { at: now, payload };
    return payload;
  }
}

// คำค้นเริ่มต้น: เน้นเหตุการณ์ที่ SET Disclosure ไม่มี (backlog/ได้งาน/สินค้าใหม่)
const DEFAULT_QUERIES = [
  "backlog", "แบ็กล็อก", "ได้งาน", "คว้างาน", "เซ็นสัญญา", "คำสั่งซื้อ",
  "กำลังการผลิต", "โรงงานใหม่", "ธุรกิจใหม่", "ร่วมทุน",
  "ดาต้าเซ็นเตอร์", "หม้อแปลง", "เทิร์นอะราวด์", "ผู้ถือหุ้นใหญ่",
];

module.exports = { loadDiscoveryIndex, fetchRecent, searchKeyword, DEFAULT_QUERIES, UNAVAILABLE, CACHE_FILE };
module.exports.__internals = { strip, toRawDiscovery, httpGetJson, HOST, API };
