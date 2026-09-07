"use strict";
// ============================================================
// THAIVI DISCOVERY ADAPTER — เว็บบอร์ดนักลงทุนเน้นคุณค่า (TIER_3.5)
//
// แหล่ง: https://board.thaivi.org/feed.php?mode=topics   (ATOM feed ที่ phpBB เผยแพร่เอง)
// ตรวจจริงแล้ว:
//   • HTTP 200 หลังตาม redirect · ไม่ต้อง login
//   • robots.txt ของ board.thaivi.org: "User-agent: * / Disallow: /?time=*" — ไม่ห้าม feed
//   • robots.txt ของ www.thaivi.org: มีแต่คอมเมนต์อธิบาย content-signals ไม่มีค่าจริง
//     ตามข้อ (c) ของข้อความนั้นเอง = "ไม่ได้อนุญาตและไม่ได้ห้าม" ผ่าน content signal
//   • ?mode=topics → 20 entry เป็น "หัวข้อใหม่" มีเนื้อหา 3,400-7,900 ตัวอักษร
//   • ค่าเริ่มต้น (ไม่มี mode) → 30 entry แต่ส่วนใหญ่เป็นโพสต์ตอบ เนื้อหาเหลือ ~70 ตัวอักษร
//     ⇒ ใช้ mode=topics
//
// ข้อจำกัด:
//   • feed เก็บแค่รายการล่าสุด ~20 หัวข้อ — ไม่มีประวัติย้อนหลัง
//   • TIER_3.5 → เพดานความแข็ง C1 สร้าง C3/C4/C5 ไม่ได้เด็ดขาด
//   • เนื้อหามีสคริปต์ของ bbcode ปนมา ต้องล้างก่อน
//
// นโยบาย:
//   • ใช้เฉพาะ feed ที่เว็บเผยแพร่เอง — ไม่ไล่ crawl กระทู้ ไม่แตะเนื้อหาสมาชิก
//   • ยิงห่าง ๆ + cache · ไม่ใช้เนื้อหาเป็นข้อมูลฝึกโมเดล
//   • เนื้อหาสมาชิกให้ผู้ใช้นำมาให้เองผ่าน userProvidedAdapter (§4)
// ============================================================

const https = require("https");
const fs = require("fs");
const path = require("path");

const FEED_HOST = "board.thaivi.org";
const FEED_PATHS = ["/feed.php?mode=topics", "/feed.php"];
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const CACHE_DIR = path.join(__dirname, "..", "..", ".cache");
const CACHE_FILE = path.join(CACHE_DIR, "discovery-thaivi.json");
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const TIMEOUT_MS = 30000;
const POLITE_DELAY_MS = 800;

const UNAVAILABLE = "DATA_UNAVAILABLE";

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function httpGet(url, redirects) {
  redirects = redirects || 0;
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.get({ hostname: u.hostname, path: u.pathname + u.search, headers: {
      "User-Agent": UA, Accept: "application/atom+xml,application/xml,text/xml,*/*",
      "Accept-Language": "th,en;q=0.9",
    } }, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && redirects < 4) {
        const next = res.headers.location.startsWith("http")
          ? res.headers.location : u.origin + res.headers.location;
        res.resume();
        return resolve(httpGet(next, redirects + 1));
      }
      const chunks = [];
      res.on("data", (d) => chunks.push(d));
      res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString("utf8"), url }));
    });
    req.setTimeout(TIMEOUT_MS, () => req.destroy(new Error("ThaiVI timeout")));
    req.on("error", reject);
  });
}

function strip(html) {
  return String(html || "")
    // ล้างสคริปต์ของ bbcode ที่ปนมาในเนื้อหา
    .replace(/if\s*\(\s*typeof\s+bbmedia[\s\S]*?\}\s*/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (m, n) => { try { return String.fromCodePoint(Number(n)); } catch (e) { return " "; } })
    .replace(/\s+/g, " ").trim();
}

function tag(entry, name) {
  const m = entry.match(new RegExp("<" + name + "[^>]*>([\\s\\S]*?)</" + name + ">", "i"));
  return m ? strip(m[1]) : null;
}
function linkHref(entry) {
  const m = entry.match(/<link[^>]*href="([^"]+)"/i);
  return m ? m[1].replace(/&amp;/g, "&") : null;
}

// หัวข้อ ATOM ของ phpBB เป็นรูป "ห้อง • หัวข้อ" — แยกออกให้อ่านง่าย
function splitTitle(t) {
  const s = String(t || "");
  const i = s.indexOf(" • ");
  if (i < 0) return { forum: null, topic: s.trim() || null };
  return { forum: s.slice(0, i).trim() || null, topic: s.slice(i + 3).replace(/^Re:\s*/i, "").trim() || null };
}

function toRawDiscovery(entry) {
  const rawTitle = tag(entry, "title");
  const parts = splitTitle(rawTitle);
  if (!parts.topic) return null;
  const updated = tag(entry, "updated") || tag(entry, "published");
  const iso = String(updated || "").slice(0, 10);
  const content = tag(entry, "content") || tag(entry, "summary");
  const url = linkHref(entry);
  const id = tag(entry, "id") || url;
  return {
    id: "thaivi:" + String(id || parts.topic).slice(-40),
    sourceType: "THAIVI",
    sourceName: "ThaiVI" + (parts.forum ? " · " + parts.forum : ""),
    sourceUrl: url || null,                 // §27 ไม่มีก็ null
    publishedAt: /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null,
    eventDate: null,                         // กระทู้ไม่บอกวันที่เหตุการณ์ — ห้ามเดา
    title: parts.topic,
    summary: content ? content.slice(0, 400) : null,
    rawClaim: parts.topic,
    fullText: content || null,
    ticker: null,                            // ให้ discovery-plane สกัดเอง
    confidence: null,
    verificationStatus: "UNVERIFIED",
    forum: parts.forum || null,
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

async function loadDiscoveryIndex(opts) {
  opts = opts || {};
  const now = Date.now();
  if (!opts.force && memo.payload && now - memo.at < CACHE_TTL_MS) return memo.payload;

  const disk = readCache();
  if (!opts.force && disk && now - Number(disk.at || 0) < CACHE_TTL_MS) {
    const payload = { ok: true, inspected: true, items: disk.items, source: "ThaiVI (cache บนดิสก์)",
      asOf: new Date(disk.at).toISOString(), coverage: disk.coverage || null, degraded: false, reason: null };
    memo = { at: now, payload };
    return payload;
  }

  try {
    const byId = {};
    for (let i = 0; i < FEED_PATHS.length; i++) {
      if (i > 0) await sleep(POLITE_DELAY_MS);
      const res = await httpGet("https://" + FEED_HOST + FEED_PATHS[i]);
      if (res.status !== 200) continue;
      const entries = [...res.body.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)].map((m) => m[1]);
      entries.forEach((e) => {
        const d = toRawDiscovery(e);
        // เนื้อหาสั้นมาก (< 120 ตัวอักษร) มักเป็นโพสต์ตอบที่ไม่มีสาระ — ข้าม
        if (!d) return;
        if (d.fullText && d.fullText.length < 120 && byId[d.id]) return;
        if (!byId[d.id] || (d.fullText || "").length > (byId[d.id].fullText || "").length) byId[d.id] = d;
      });
    }
    const items = Object.keys(byId).map((k) => byId[k]);
    if (!items.length) throw new Error("ThaiVI feed ไม่มี entry ที่แกะได้");
    const dates = items.map((i) => i.publishedAt).filter(Boolean).sort();
    const coverage = { from: dates[0] || null, to: dates[dates.length - 1] || null, count: items.length,
      feeds: FEED_PATHS.slice(), note: "feed เก็บเฉพาะรายการล่าสุด ไม่มีประวัติย้อนหลัง" };
    writeCache({ at: now, items, coverage });
    const payload = { ok: true, inspected: true, items, source: "ThaiVI (board feed.php)",
      asOf: new Date(now).toISOString(), coverage, degraded: false, reason: null };
    memo = { at: now, payload };
    return payload;
  } catch (error) {
    const msg = String((error && error.message) || error);
    if (disk) {
      const payload = { ok: true, inspected: true, items: disk.items, source: "ThaiVI (cache เก่า)",
        asOf: new Date(disk.at).toISOString(), coverage: disk.coverage || null, degraded: true,
        reason: "ดึง feed สดไม่สำเร็จ (" + msg + ") — ใช้ cache ล่าสุด" };
      memo = { at: now, payload };
      return payload;
    }
    const payload = { ok: false, inspected: false, items: [], source: null, asOf: null, coverage: null,
      degraded: true, reason: UNAVAILABLE + ": ดึง ThaiVI feed ไม่สำเร็จ (" + msg + ") และไม่มี cache" };
    memo = { at: now, payload };
    return payload;
  }
}

module.exports = { loadDiscoveryIndex, UNAVAILABLE, CACHE_FILE, FEED_PATHS };
module.exports.__internals = { strip, tag, linkHref, splitTitle, toRawDiscovery, httpGet };
