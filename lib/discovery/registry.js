"use strict";
// ============================================================
// §1/§2/§12 DISCOVERY SOURCE REGISTRY
//
// ทะเบียนแหล่งค้นพบ + สถานะการเข้าถึงที่ "ทดสอบจริงแล้ว"
// แหล่งที่เข้าไม่ได้ต้องขึ้น DATA_UNAVAILABLE — ห้ามสร้าง adapter ปลอมที่คืนข้อมูลแต่ง
//
// ทุกสถานะในไฟล์นี้มาจากการยิงจริงและดู HTTP status/เนื้อหาจริง ไม่ใช่การเดา
// ============================================================

const kaohoon = require("./kaohoonAdapter.js");
const thaivi = require("./thaiviAdapter.js");
const userProvided = require("./userProvidedAdapter.js");

const UNAVAILABLE = "DATA_UNAVAILABLE";

function unavailable(label, why) {
  return async function () {
    return { ok: false, inspected: false, items: [], source: null, asOf: null, coverage: null,
      degraded: true, reason: UNAVAILABLE + ": " + label + (why ? " — " + why : "") };
  };
}

// ------------------------------------------------------------
// ผลการทดสอบการเข้าถึง (ยิงจริง 2026-09-07)
// ------------------------------------------------------------
const SOURCES = [
  {
    key: "kaohoon",
    label: "Kaohoon (ข่าวหุ้น)",
    sourceType: "NEWS",
    tier: 3,
    connected: true,
    load: (opts) => kaohoon.loadDiscoveryIndex(opts),
    access: {
      endpoint: "https://www.kaohoon.com/wp-json/wp/v2/posts",
      auth: "ไม่ต้อง",
      robots: "ห้ามเฉพาะ /wp-admin/ · เผยแพร่ sitemap เอง",
      structured: "JSON (WordPress REST)",
      fullText: "มี content.rendered เต็ม ~2,600 ตัวอักษร",
      keywordSearch: "ค้นคำไทยได้ (?search=) — เติมช่องว่างที่ SET Disclosure ไม่มี",
      history: "pagination ลึก (page=40 ยังตอบ 200) · เว็บมีโพสต์รวม ~265,000",
      tickerExtraction: "จากพาดหัวได้ ~43% · ตรวจตัวอย่าง 26 รายการถูกหมด",
      rateLimit: "ไม่พบการจำกัดในการทดสอบ · ระบบยิงห่าง 350ms",
    },
  },
  {
    key: "thaivi",
    label: "ThaiVI (เว็บบอร์ด)",
    sourceType: "THAIVI",
    tier: 3.5,
    connected: true,
    load: (opts) => thaivi.loadDiscoveryIndex(opts),
    access: {
      endpoint: "https://board.thaivi.org/feed.php?mode=topics",
      auth: "ไม่ต้อง (ใช้เฉพาะ ATOM feed ที่เว็บเผยแพร่เอง)",
      robots: "board.thaivi.org: Disallow เฉพาะ /?time=* · www.thaivi.org: มีแต่คอมเมนต์ content-signals ไม่มีค่าจริง",
      structured: "ATOM XML",
      fullText: "หัวข้อใหม่มีเนื้อหา 3,400-7,900 ตัวอักษร · โพสต์ตอบเหลือ ~70 ตัวอักษร",
      history: "เฉพาะรายการล่าสุด ~20-30 หัวข้อ · ไม่มีประวัติย้อนหลัง",
      tickerExtraction: "ต่ำมาก (~1 จาก 45 หัวข้อ) — ชื่อกระทู้มักเป็นธีม ไม่ใช่หุ้นตัวเดียว",
      policy: "ไม่ไล่ crawl กระทู้ · ไม่แตะเนื้อหาสมาชิก · ไม่ใช้เป็นข้อมูลฝึกโมเดล",
    },
  },
  {
    key: "userProvided",
    label: "ผู้ใช้นำมาให้เอง (ThaiVI สมาชิก / โซเชียล)",
    sourceType: "THAIVI_MEMBER_USER_PROVIDED",
    tier: 3.5,
    connected: true,
    load: (opts) => userProvided.loadDiscoveryIndex(opts),
    access: {
      endpoint: "public/discovery-inbox.js (ผู้ใช้วางเอง)",
      auth: "ไม่มี — ผู้ใช้เป็นคนนำเนื้อหามาให้ ระบบไม่เข้าถึงบัญชีใคร",
      note: "ช่องทางที่ถูกต้องสำหรับเนื้อหาที่ต้องล็อกอิน · ไม่เก็บรหัสผ่าน ไม่ผ่านระบบยืนยันตัวตน",
    },
  },
  // ---------- แหล่งที่ทดสอบแล้วเข้าไม่ได้ ----------
  {
    key: "facebook",
    label: "Facebook (โพสต์สาธารณะ)",
    sourceType: "SOCIAL",
    tier: 3.5,
    connected: false,
    load: unavailable("Facebook",
      "หน้าเว็บบังคับล็อกอิน · robots.txt มี Disallow 1,160 บรรทัด · Graph API ต้องผ่าน app review (Page Public Content Access) " +
      "ซึ่งไม่สมเหตุสมผลกับแดชบอร์ดส่วนตัว · ระบบไม่ข้ามระบบยืนยันตัวตนและไม่เก็บรหัสผ่าน " +
      "⇒ ใช้ช่องทาง userProvided แทน (ผู้ใช้วางลิงก์/ข้อความเอง)"),
    access: { robots: "Disallow 1,160 บรรทัด", auth: "ต้องล็อกอิน / ต้อง app review" },
  },
  {
    key: "ryt9",
    label: "RYT9 / InfoQuest",
    sourceType: "NEWS",
    tier: 3,
    connected: false,
    load: unavailable("RYT9", "ทดสอบ /rss/ และ /rss/stock แล้วได้ HTTP 404 · ยังไม่พบ feed ที่ใช้ได้"),
    access: { robots: "ไม่ห้ามทั้งเว็บ", tested: "/rss/ → 404 · /rss/stock → 404" },
  },
  {
    key: "efinancethai",
    label: "eFinanceThai",
    sourceType: "NEWS",
    tier: 3,
    connected: false,
    load: unavailable("eFinanceThai", "ทดสอบ /rss/news.xml แล้วได้ HTTP 404 · robots.txt มี Disallow 79 บรรทัด"),
    access: { robots: "Disallow 79 บรรทัด", tested: "/rss/news.xml → 404" },
  },
  {
    key: "thunhoon",
    label: "Thunhoon",
    sourceType: "NEWS",
    tier: 3,
    connected: false,
    load: unavailable("Thunhoon", "wp-json คืน HTML ไม่ใช่ JSON (ปิด REST API) · robots.txt ค่อนข้างจำกัด"),
    access: { tested: "/wp-json/wp/v2/posts → คืน HTML" },
  },
  {
    key: "oppday",
    label: "Opportunity Day / IR",
    sourceType: "OPPORTUNITY_DAY",
    tier: 2,
    connected: false,
    load: unavailable("Opportunity Day",
      "SET feed แจ้งแค่ว่า 'มีการเผยแพร่' ไม่ได้ให้เนื้อหา · /api/set/company/{sym}/oppday → 404 " +
      "⇒ สกัดคำพูดผู้บริหาร (C1) จากอัตโนมัติยังทำไม่ได้"),
    access: { tested: "/api/set/company/{sym}/oppday → 404" },
  },
];

function discoverySourceStatus() {
  return SOURCES.map((s) => ({
    key: s.key, label: s.label, sourceType: s.sourceType, tier: "TIER_" + s.tier,
    connected: s.connected, status: s.connected ? "CONNECTED" : UNAVAILABLE,
    access: s.access || null,
    reason: s.connected ? null : null,
  }));
}

// ดึงสัญญาณค้นพบจากทุกแหล่งที่ต่อแล้ว
// คืน { inspected, items[], perSource } — items เป็น "raw" ให้ discovery-plane normalize
async function collectDiscovery(opts) {
  opts = opts || {};
  const perSource = {};
  const items = [];
  let anyInspected = false;

  for (const s of SOURCES) {
    if (!s.connected) {
      const r = await s.load(opts);
      perSource[s.key] = { connected: false, inspected: false, count: 0, reason: r.reason };
      continue;
    }
    let r;
    try { r = await s.load(opts); }
    catch (e) {
      r = { ok: false, inspected: false, items: [], reason: UNAVAILABLE + ": " + String((e && e.message) || e) };
    }
    perSource[s.key] = { connected: true, inspected: !!r.inspected, count: (r.items || []).length,
      source: r.source || null, asOf: r.asOf || null, coverage: r.coverage || null,
      degraded: !!r.degraded, reason: r.reason || null };
    if (r.inspected) {
      anyInspected = true;
      (r.items || []).forEach((i) => items.push(i));
    }
  }
  return { inspected: anyInspected, items, perSource, sources: discoverySourceStatus() };
}

module.exports = { SOURCES, discoverySourceStatus, collectDiscovery, UNAVAILABLE };
