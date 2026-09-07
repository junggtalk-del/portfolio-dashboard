"use strict";
// ============================================================
// §12 DATA SOURCE ADAPTER ARCHITECTURE
//
// อินเทอร์เฟซกลางของ "ระนาบหลักฐาน" — ทุกตัวคืนรูปแบบเดียวกัน:
//   { ok, inspected, items[], source, asOf, reason }
//
// ความหมายของ inspected สำคัญมาก และเป็นตัวกำหนด §10:
//   inspected = true  → เข้าถึงแหล่งข้อมูลได้จริง (ไม่เจอ = NO_CATALYST ได้)
//   inspected = false → เข้าถึงไม่ได้ (ต้องเป็น CATALYST_UNAVAILABLE เท่านั้น)
//
// adapter ที่ยังไม่มีแหล่งจริง ต้องคืน DATA_UNAVAILABLE
// ห้ามคืนข้อมูลปลอม ห้ามคืน [] เฉย ๆ (เพราะ [] จะถูกอ่านว่า "ตรวจแล้วไม่มี")
// ============================================================

const setNews = require("./setNewsAdapter.js");
const secFilings = require("./secFilingAdapter.js");
const thaiFinancials = require("./thaiFinancialAdapter.js");
const FinancialInflection = require("../../public/financial-inflection.js");
// PHASE 3.2 — ประเมิน value trap และ insider activity จาก "ข้อมูลที่มีอยู่แล้ว"
const ValueTrapThai = require("../../public/value-trap-thai.js");
const InsiderActivity = require("../../public/insider-activity.js");

const UNAVAILABLE = "DATA_UNAVAILABLE";

function unavailable(what, why) {
  return {
    ok: false,
    inspected: false,          // ← สำคัญ: ยังไม่ได้ตรวจ ไม่ใช่ตรวจแล้วไม่พบ
    items: [],
    source: null,
    asOf: null,
    reason: UNAVAILABLE + ": " + what + (why ? " — " + why : ""),
  };
}

// ------------------------------------------------------------
// 1) เหตุการณ์ของบริษัท — เชื่อมกับ SET Disclosure แล้ว (ใช้งานได้จริง)
// ------------------------------------------------------------
async function fetchThaiCompanyEvents(ticker, dateRange, opts) {
  return setNews.fetchThaiCompanyEvents(ticker, dateRange, opts);
}

// ------------------------------------------------------------
// 2) เอกสารที่ยื่นต่อ ก.ล.ต. — เชื่อมแล้ว (market.sec.or.th เปิดสาธารณะ ไม่ต้อง auth)
//    แบบ 59    → INSIDER_BUY / INSIDER_SELL (ชื่อผู้บริหาร วันที่ จำนวน ราคาเฉลี่ย)
//    แบบ 246-2 → MAJOR_SHAREHOLDER_CHANGE (% ก่อน/เปลี่ยน/หลัง)
//
//    หมายเหตุเชิงความหมาย: ทั้งสองเป็นข้อเท็จจริงที่ยืนยันแล้ว (C3) แต่ EvidenceModel
//    จะไม่นับเป็น catalyst เพราะ "ผู้บริหารซื้อหุ้น" ไม่ได้เปลี่ยนเศรษฐกิจของกิจการในตัวเอง
//    — มันเป็นสัญญาณ ไม่ใช่กลไก การตีความเป็นสัญญาณบวกคือความเห็น ไม่ใช่หลักฐาน
// ------------------------------------------------------------
async function fetchThaiFilings(ticker, dateRange, opts) {
  return secFilings.fetchThaiFilings(ticker, dateRange, opts);
}

// ------------------------------------------------------------
// 3) หลักฐานทางการเงิน — ระดับ C4 ต้องมาจาก "ตัวเลขจริง" ไม่ใช่หัวข้อข่าว
//
//    ข้อสำคัญที่ต้องบันทึกไว้: SET Disclosure มีหัวข้อ "Financial Statement Quarter x"
//    มากถึง ~36% ของข่าวทั้งหมด แต่หัวข้อลำพัง "ไม่มีตัวเลข" จึงพิสูจน์ inflection ไม่ได้
//    ⇒ ห้ามใช้หัวข้องบเป็น C4 เด็ดขาด (จะเป็นการมโนว่ามีหลักฐานทางการเงิน)
// ------------------------------------------------------------
async function fetchThaiFinancialEvidence(ticker, dateRange, opts) {
  const r = await thaiFinancials.fetchThaiFinancialEvidence(ticker, dateRange, opts);
  // §13 ต้องแยก "ดึงงบไม่ได้" ออกจาก "ไม่มี inflection"
  const inflection = FinancialInflection.compute(r);
  // §12 หลักฐาน C4 เกิดได้เฉพาะเมื่อ inflection ยืนยันได้จริง ไม่ใช่แค่มีตัวเลข
  const ev = FinancialInflection.toEvidence(ticker, inflection);
  return Object.assign({}, r, {
    items: ev ? [ev] : [],
    inflection,
    financialAvailability: inflection.dataAvailability,
  });
}

// ------------------------------------------------------------
// 4) เอกสารนำเสนอ / Opportunity Day — TIER_2
//    SET feed มีแค่ "แจ้งกำหนดการ/แจ้งว่าเผยแพร่แล้ว" ไม่มีเนื้อหาข้างใน
// ------------------------------------------------------------
async function fetchThaiPresentations(ticker, dateRange, opts) {
  return unavailable(
    "ยังไม่ได้เชื่อมเนื้อหา Opportunity Day / presentation",
    "SET feed แจ้งแค่ว่ามีการเผยแพร่ ไม่ได้ให้เนื้อหา จึงสกัดคำพูดผู้บริหาร (C1) ไม่ได้"
  );
}

// ------------------------------------------------------------
// 5) ข่าวจากสื่อ — TIER_3
// ------------------------------------------------------------
async function fetchThaiNews(ticker, dateRange, opts) {
  return unavailable(
    "ยังไม่ได้เชื่อมแหล่งข่าวจากสื่อ",
    "ระบบยังไม่มี provider ข่าวไทย — TIER_3 จึงยังว่าง"
  );
}

// ------------------------------------------------------------
// รายงานสถานะของทุก adapter — ให้ UI แสดงได้ว่าอะไรตรวจแล้ว อะไรยังไม่ได้ตรวจ
// ------------------------------------------------------------
const REGISTRY = [
  { key: "companyEvents", label: "SET Disclosure", sourceType: "SET_DISCLOSURE", tier: 1,
    fn: fetchThaiCompanyEvents, connected: true,
    note: "ข้อมูลเผยแพร่ผ่านตลาดหลักทรัพย์ — ครอบทั้ง SET และ mai" },
  { key: "filings", label: "SEC Filings (59/246-2)", sourceType: "SEC_FILING", tier: 1,
    fn: fetchThaiFilings, connected: true,
    note: "การซื้อขายของผู้บริหาร + ผู้ถือหุ้นใหญ่ข้ามเกณฑ์" },
  { key: "financials", label: "Financial Statements", sourceType: "FINANCIAL_STATEMENT", tier: 1,
    fn: fetchThaiFinancialEvidence, connected: true,
    note: "งบรายไตรมาส ~5-6 งวด (Yahoo fundamentals-timeseries) — แหล่งของ C4" },
  { key: "presentations", label: "Opportunity Day", sourceType: "OPPORTUNITY_DAY", tier: 2,
    fn: fetchThaiPresentations, connected: false,
    note: "คำพูด/แผนของผู้บริหาร — จำเป็นสำหรับ C1" },
  { key: "news", label: "Media News", sourceType: "NEWS", tier: 3,
    fn: fetchThaiNews, connected: false,
    note: "ข่าวจากสื่อ" },
];

function adapterStatus() {
  return REGISTRY.map((a) => ({
    key: a.key, label: a.label, sourceType: a.sourceType, tier: "TIER_" + a.tier,
    connected: a.connected, note: a.note,
    status: a.connected ? "CONNECTED" : UNAVAILABLE,
  }));
}

// ดึงหลักฐานจากทุก adapter ที่ต่อแล้ว
// inspected รวม = true ก็ต่อเมื่อมีอย่างน้อยหนึ่ง adapter ที่ตรวจสำเร็จ
async function fetchAllEvidence(ticker, dateRange, opts) {
  const results = {};
  let anyInspected = false;
  for (const a of REGISTRY) {
    let r;
    try { r = await a.fn(ticker, dateRange, opts); }
    catch (e) { r = unavailable(a.label, String((e && e.message) || e)); }
    results[a.key] = r;
    if (r && r.inspected) anyInspected = true;
  }
  return { ticker, inspected: anyInspected, results, adapters: adapterStatus() };
}

// รวมหลักฐานจากทุกแหล่งที่ต่อแล้ว ให้อยู่ในรูป raw ที่ EvidenceModel รับได้
// คืน { inspected, items[], perSource } — inspected = true ถ้ามีอย่างน้อยหนึ่งแหล่งที่ตรวจสำเร็จ
async function collectRawEvidence(ticker, dateRange, opts, classifier) {
  const perSource = {};
  let inspected = false;
  const items = [];

  const events = await fetchThaiCompanyEvents(ticker, dateRange, opts);
  perSource.companyEvents = { inspected: !!events.inspected, count: events.items.length, reason: events.reason || null };
  if (events.inspected) {
    inspected = true;
    if (classifier) {
      const cls = classifier.classifyFeed(events.items, ticker);
      perSource.companyEvents.routine = cls.routineCount;
      perSource.companyEvents.unknown = cls.unknownCount;
      perSource.companyEvents.qualified = cls.evidence.length;
      cls.evidence.forEach((e) => items.push(e.raw));
    }
  }

  const filings = await fetchThaiFilings(ticker, dateRange, opts);
  perSource.filings = { inspected: !!filings.inspected, count: filings.items.length, reason: filings.reason || null };
  if (filings.inspected) {
    inspected = true;
    filings.items.forEach((f) => {
      const raw = secFilings.toEvidence(f);
      if (raw) items.push(raw);
    });
  }

  const fin = await fetchThaiFinancialEvidence(ticker, dateRange, opts);
  perSource.financials = { inspected: !!fin.inspected, count: (fin.items || []).length,
    quarters: (fin.quarters || []).length, availability: fin.financialAvailability || null,
    inflectionState: fin.inflection && fin.inflection.state ? fin.inflection.state.key : null,
    reason: fin.reason || null };
  if (fin.inspected) {
    inspected = true;
    (fin.items || []).forEach((e) => items.push(e));
  }

  // P0b — value trap จากงบไทยหลายไตรมาส (ไม่ดึงแหล่งใหม่ ใช้ fin.quarters ที่มีอยู่)
  const valueTrap = ValueTrapThai.assess(fin.quarters || []);
  perSource.valueTrap = { risk: valueTrap.risk.key, signals: valueTrap.signals.length,
    quarters: valueTrap.quartersUsed };

  // P1b — insider activity จากเอกสาร ก.ล.ต. แบบ 59 ที่ดึงมาแล้ว
  const insiderSrc = (perSource.filings && perSource.filings.inspected) ? filings.items : null;
  const insider = InsiderActivity.assess(
    (insiderSrc || []).map((f) => ({ eventType: f.eventType, eventDate: f.date,
      title: null, sourceUrl: f.url || null, sourceName: "ก.ล.ต. แบบ " + f.form, sourceTier: "TIER_1" })),
    { inspected: !!(perSource.filings && perSource.filings.inspected), asOf: opts && opts.asOf }
  );
  perSource.insider = { state: insider.state.key, buys: insider.buyCount, sells: insider.sellCount };

  return { ticker, inspected, items, perSource, inflection: fin.inflection || null,
    valueTrap, insider, financialQuarters: fin.quarters || [] };
}

module.exports = {
  UNAVAILABLE,
  collectRawEvidence,
  fetchThaiCompanyEvents,
  fetchThaiFilings,
  fetchThaiFinancialEvidence,
  fetchThaiPresentations,
  fetchThaiNews,
  fetchAllEvidence,
  adapterStatus,
  REGISTRY,
};
