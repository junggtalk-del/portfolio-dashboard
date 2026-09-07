"use strict";
// ============================================================
// §4 USER-PROVIDED DISCOVERY — ช่องทางที่ถูกต้องสำหรับเนื้อหาที่ต้องล็อกอิน
//
// ปัญหา: เนื้อหาสมาชิก ThaiVI และโพสต์ Facebook เข้าถึงอัตโนมัติไม่ได้
//        และระบบ "จะไม่" ข้ามระบบยืนยันตัวตน ไม่เก็บรหัสผ่าน ไม่ฝ่า paywall
// ทางออก: ผู้ใช้เป็นคนนำเนื้อหามาให้เอง แล้วระบบเก็บที่มาไว้ครบ (provenance)
//
// สิ่งที่เนื้อหาแบบนี้ทำได้/ไม่ได้:
//   • ทำได้: สร้าง LEAD และร่วมนับเป็น NARRATIVE_EMERGING
//   • ทำไม่ได้: สร้าง C3/C4/C5 — TIER_3.5 มีเพดานความแข็งที่ C1 (บังคับที่ evidence-model)
//
// รูปแบบไฟล์: public/discovery-inbox.js (ผู้ใช้แก้เอง หรือให้ผมช่วยเพิ่มเมื่อผู้ใช้ส่งลิงก์มา)
// ============================================================

const path = require("path");

const UNAVAILABLE = "DATA_UNAVAILABLE";
const INBOX_PATH = path.join(__dirname, "..", "..", "public", "discovery-inbox.js");

// sourceType ที่อนุญาตให้ผู้ใช้ระบุได้ (ต้องคงที่มาให้ตรวจย้อนหลังได้)
const ALLOWED = {
  THAIVI_MEMBER_USER_PROVIDED: 1,
  SOCIAL_USER_PROVIDED: 1,
  THAIVI: 1,
  SOCIAL: 1,
  NEWS: 1,
  COMPANY_PRESENTATION: 1,
  COMPANY_IR: 1,
  OPPORTUNITY_DAY: 1,
  RUMOR: 1,
  OTHER: 1,
};

function loadInbox() {
  try {
    delete require.cache[require.resolve(INBOX_PATH)];
    const mod = require(INBOX_PATH);
    return mod && Array.isArray(mod.items) ? mod : null;
  } catch (e) {
    return null;
  }
}

// แปลงรายการที่ผู้ใช้วางไว้ → รูปแบบดิบของ DiscoveryEvent
// ฟิลด์ที่ผู้ใช้ไม่ให้ = null ห้ามเติมแทน · ที่มาต้องเก็บครบ (§27)
function toRawDiscovery(entry, index) {
  if (!entry || typeof entry !== "object") return null;
  const st = String(entry.sourceType || "").toUpperCase();
  const sourceType = ALLOWED[st] ? st : "OTHER";
  const title = entry.title == null ? null : String(entry.title).trim();
  const claim = entry.rawClaim == null ? null : String(entry.rawClaim).trim();
  if (!title && !claim) return null;
  return {
    id: "user:" + (entry.id != null ? String(entry.id) : String(index + 1)),
    sourceType,
    sourceName: entry.sourceName == null ? "ผู้ใช้นำมาให้เอง" : String(entry.sourceName),
    sourceUrl: entry.sourceUrl == null || String(entry.sourceUrl).trim() === "" ? null : String(entry.sourceUrl).trim(),
    publishedAt: entry.publishedAt == null ? null : String(entry.publishedAt),
    eventDate: entry.eventDate == null ? null : String(entry.eventDate),
    retrievedAt: entry.retrievedAt == null ? null : String(entry.retrievedAt),
    title: title || claim,
    summary: entry.summary == null ? null : String(entry.summary),
    rawClaim: claim || title,
    fullText: entry.fullText == null ? null : String(entry.fullText),
    // ผู้ใช้ระบุ ticker ได้ แต่ discovery-plane จะตรวจกับทะเบียนก่อนรับ
    ticker: entry.ticker == null ? null : String(entry.ticker).toUpperCase(),
    eventType: entry.eventType == null ? null : String(entry.eventType).toUpperCase(),
    confidence: typeof entry.confidence === "number" ? entry.confidence : null,
    // ผู้ใช้ยืนยันเองไม่ได้ — ต้องมีแหล่งปฐมภูมิ จึงตรึงเป็น UNVERIFIED
    verificationStatus: "UNVERIFIED",
    userProvided: true,
  };
}

async function loadDiscoveryIndex(opts) {
  opts = opts || {};
  const inbox = loadInbox();
  if (!inbox) {
    return { ok: false, inspected: false, items: [], source: null, asOf: null, coverage: null,
      degraded: true, reason: UNAVAILABLE + ": ไม่พบ public/discovery-inbox.js" };
  }
  const items = [];
  const rejected = [];
  inbox.items.forEach((e, i) => {
    const raw = toRawDiscovery(e, i);
    if (raw) items.push(raw);
    else rejected.push({ index: i, reason: "ไม่มีหัวข้อหรือข้อความอ้าง" });
  });
  const dates = items.map((i) => String(i.publishedAt || i.eventDate || "").slice(0, 10)).filter(Boolean).sort();
  return {
    ok: true,
    inspected: true,           // อ่านกล่องขาเข้าสำเร็จ (ว่างเปล่าก็คือ "ตรวจแล้วไม่มี")
    items,
    source: "ผู้ใช้นำมาให้เอง (discovery-inbox)",
    asOf: inbox.asOf || null,
    coverage: { count: items.length, rejected: rejected.length,
      from: dates[0] || null, to: dates[dates.length - 1] || null },
    degraded: false,
    reason: null,
  };
}

module.exports = { loadDiscoveryIndex, INBOX_PATH, ALLOWED, UNAVAILABLE };
module.exports.__internals = { toRawDiscovery, loadInbox };
