(function () {
  "use strict";
  // ============================================================
  // THAI CATALYST HUNTER — EVIDENCE MODEL (STORY PLANE)
  //
  // หน้าที่: แปลง "เหตุการณ์จริงของบริษัท" ให้เป็นหลักฐานที่มีโครงสร้าง
  // แล้วรวมเป็น Story object ให้ catalyst-engine เอาไปใช้
  //
  // กติกาที่ห้ามพัง:
  //  1. ราคาไม่มีสิทธิ์กำหนดความแข็งของหลักฐาน — ไฟล์นี้ไม่รู้จักราคาเลย
  //     (market recognition ถูกส่งเข้ามาจากภายนอกตอน derive C5 เท่านั้น)
  //  2. ฟิลด์ที่ไม่รู้ = null เสมอ ห้ามเดา ห้ามเติมค่าเริ่มต้นที่ดูดี
  //  3. TIER_4 (ข่าวลือ/ไม่ยืนยัน) ลำพังห้ามสร้าง C3/C4/C5
  //  4. "ยังไม่ได้ตรวจ" (UNAVAILABLE) ≠ "ตรวจแล้วไม่พบ" (NO_CATALYST) ตลอดกาล
  //  5. ถ้าอธิบายกลไกเศรษฐกิจไม่ได้ → catalystRelevance = UNKNOWN ห้ามแต่งกลไกเอง
  //  6. LLM ใช้ "สกัดข้อมูล" ได้ แต่ห้ามตัดสินสถานะใด ๆ — ทุกสถานะมาจากกฎในไฟล์นี้
  // ============================================================

  var VERSION = "1.0.0";

  // ---------- §2 ประเภทแหล่งข้อมูล + §7 ชั้นความน่าเชื่อถือ ----------
  // tier ผูกกับ "ชนิดของแหล่ง" ไม่ใช่ "ความน่าสนใจของข่าว"
  var SOURCE_TYPES = {
    SET_DISCLOSURE:      { key: "SET_DISCLOSURE",      tier: 1, label: "SET Disclosure",        thai: "ข้อมูลเผยแพร่ผ่านตลาดหลักทรัพย์" },
    SEC_FILING:          { key: "SEC_FILING",          tier: 1, label: "SEC Filing",            thai: "แบบรายงานต่อ ก.ล.ต." },
    COMPANY_DISCLOSURE:  { key: "COMPANY_DISCLOSURE",  tier: 1, label: "Company Filing",        thai: "เอกสารที่บริษัทยื่นอย่างเป็นทางการ" },
    FINANCIAL_STATEMENT: { key: "FINANCIAL_STATEMENT", tier: 1, label: "Financial Statement",   thai: "งบการเงิน" },
    OPPORTUNITY_DAY:     { key: "OPPORTUNITY_DAY",     tier: 2, label: "Opportunity Day",       thai: "งานพบนักลงทุน" },
    INSIDER_TRANSACTION: { key: "INSIDER_TRANSACTION", tier: 1, label: "Insider Transaction",   thai: "รายงานการถือครองของผู้บริหาร" },
    COMPANY_PRESENTATION: { key: "COMPANY_PRESENTATION", tier: 2, label: "Company Presentation", thai: "เอกสารนำเสนอของบริษัท" },
    COMPANY_IR:          { key: "COMPANY_IR",          tier: 2, label: "Company IR",            thai: "ช่องทางนักลงทุนสัมพันธ์" },
    NEWS:                { key: "NEWS",                tier: 3, label: "News",                  thai: "สื่อ" },
    INDUSTRY_DATA:       { key: "INDUSTRY_DATA",       tier: 3, label: "Industry Data",         thai: "ข้อมูลอุตสาหกรรม" },
    REGULATORY:          { key: "REGULATORY",          tier: 1, label: "Regulatory",            thai: "หน่วยงานกำกับ" },
    // ---- ระนาบค้นพบ (§1) — สร้าง LEAD ได้ แต่ห้ามสร้าง C3/C4/C5 ----
    THAIVI:              { key: "THAIVI",              tier: 3.5, label: "ThaiVI",              thai: "เว็บบอร์ด/บทความ ThaiVI (สาธารณะ)" },
    THAIVI_MEMBER_USER_PROVIDED: { key: "THAIVI_MEMBER_USER_PROVIDED", tier: 3.5,
      label: "ThaiVI (member, user-provided)", thai: "เนื้อหาสมาชิก ThaiVI ที่ผู้ใช้นำมาให้เอง" },
    SOCIAL:              { key: "SOCIAL",              tier: 3.5, label: "Social",              thai: "โพสต์สาธารณะบนโซเชียล" },
    SOCIAL_USER_PROVIDED: { key: "SOCIAL_USER_PROVIDED", tier: 3.5, label: "Social (user-provided)",
      thai: "เนื้อหาโซเชียลที่ผู้ใช้นำมาให้เอง" },
    RUMOR:               { key: "RUMOR",               tier: 4, label: "Rumor",                 thai: "ข่าวลือ ยังไม่มีใครยืนยัน" },
    OTHER:               { key: "OTHER",               tier: 4, label: "Other",                 thai: "อื่น ๆ / ยังไม่ยืนยัน" },
  };

  // เพดานความแข็ง (§7/§17) — ผูกกับ "ชนิดของแหล่ง" ไม่ใช่ความน่าสนใจของเนื้อหา
  // TIER 3.5 = ระนาบค้นพบ: บอกได้ว่า "น่าสนใจ" แต่ยืนยันไม่ได้ → เพดาน C1
  // ไม่มี tier ไหนถึง C5 เพราะ C5 ต้องมีการรับรู้ของตลาดร่วมด้วยเสมอ
  var TIERS = {
    1:   { n: 1,   key: "TIER_1",   label: "TIER 1",   thai: "เอกสารทางการ/งบที่สอบทานแล้ว", maxStrength: 4 },
    2:   { n: 2,   key: "TIER_2",   label: "TIER 2",   thai: "เอกสารนำเสนอ/IR ของบริษัทเอง", maxStrength: 2 },
    3:   { n: 3,   key: "TIER_3",   label: "TIER 3",   thai: "สื่อ/ข้อมูลอุตสาหกรรมที่น่าเชื่อถือ", maxStrength: 2 },
    3.5: { n: 3.5, key: "TIER_3_5", label: "TIER 3.5", thai: "ThaiVI/โซเชียลสาธารณะ — ใช้ค้นพบเท่านั้น", maxStrength: 1 },
    4:   { n: 4,   key: "TIER_4",   label: "TIER 4",   thai: "ยังไม่ยืนยัน/ข่าวลือ",          maxStrength: 0 },
  };
  // แหล่งระดับนี้ขึ้นไปคือ "ระนาบค้นพบ" — ห้ามใช้ยืนยัน catalyst ลำพัง
  var DISCOVERY_TIER_MIN = 3.5;
  function isDiscoveryTier(tierN) { return Number(tierN) >= DISCOVERY_TIER_MIN; }
  function isPrimaryTier(tierN) { return Number(tierN) <= 2; }

  // ---------- §4 ความแข็งของหลักฐาน ----------
  var STRENGTH = {
    C0_RUMOR:               { key: "C0_RUMOR",               n: 0, label: "C0 · RUMOR",              thai: "ข่าวลือ ยังไม่ยืนยัน" },
    C1_MANAGEMENT_STORY:    { key: "C1_MANAGEMENT_STORY",    n: 1, label: "C1 · MANAGEMENT STORY",   thai: "ผู้บริหารพูดถึงแผน/ทิศทาง" },
    C2_OFFICIAL_ANNOUNCEMENT: { key: "C2_OFFICIAL_ANNOUNCEMENT", n: 2, label: "C2 · OFFICIAL ANNOUNCEMENT", thai: "ประกาศอย่างเป็นทางการ" },
    C3_CONFIRMED_EVENT:     { key: "C3_CONFIRMED_EVENT",     n: 3, label: "C3 · CONFIRMED EVENT",    thai: "สัญญา/คำสั่งซื้อ/โครงการที่อนุมัติแล้ว" },
    C4_FINANCIAL_EVIDENCE:  { key: "C4_FINANCIAL_EVIDENCE",  n: 4, label: "C4 · FINANCIAL EVIDENCE", thai: "ปรากฏในตัวเลขงบแล้ว" },
  };
  var STRENGTH_BY_N = {};
  Object.keys(STRENGTH).forEach(function (k) { STRENGTH_BY_N[STRENGTH[k].n] = STRENGTH[k]; });

  // ---------- §3 ประเภทเหตุการณ์ + §6 หมวด catalyst ----------
  // categories = หมวดที่เหตุการณ์นั้นส่งผล (มีได้หลายหมวดถ้าอธิบายได้)
  // mechanism  = กลไกเศรษฐกิจ EVENT → BUSINESS → FINANCIAL → RE-RATING (§5)
  //              null = อธิบายไม่ได้ → catalystRelevance = UNKNOWN (ห้ามแต่ง)
  var EVENT_TYPES = {
    MANAGEMENT_CHANGE:       { cats: ["MANAGEMENT"], thai: "เปลี่ยนผู้บริหาร", mech: null },
    BOARD_CHANGE:            { cats: ["MANAGEMENT"], thai: "เปลี่ยนกรรมการ", mech: null },
    MAJOR_SHAREHOLDER_CHANGE:{ cats: ["MANAGEMENT", "CORPORATE_ACTION"], thai: "ผู้ถือหุ้นใหญ่เปลี่ยน", mech: null },
    INSIDER_BUY:             { cats: ["MANAGEMENT"], thai: "ผู้บริหารซื้อหุ้น", mech: null },
    INSIDER_SELL:            { cats: ["MANAGEMENT"], thai: "ผู้บริหารขายหุ้น", mech: null },

    NEW_BUSINESS:     { cats: ["BUSINESS_MODEL", "NEW_REVENUE"], thai: "ธุรกิจใหม่",
      mech: ["ธุรกิจใหม่", "แหล่งรายได้เพิ่ม", "รายได้อนาคต", "โอกาส re-rate"] },
    BUSINESS_PIVOT:   { cats: ["BUSINESS_MODEL"], thai: "เปลี่ยนโมเดลธุรกิจ", mech: null },
    RESTRUCTURING:    { cats: ["COST_TRANSFORMATION", "BUSINESS_MODEL"], thai: "ปรับโครงสร้าง", mech: null },
    COST_REDUCTION:   { cats: ["COST_TRANSFORMATION"], thai: "ลดต้นทุน",
      mech: ["ลดต้นทุน", "มาร์จิ้นดีขึ้น", "กำไรเพิ่ม", "โอกาส re-rate"] },

    NEW_CUSTOMER:       { cats: ["NEW_REVENUE"], thai: "ลูกค้าใหม่",
      mech: ["ลูกค้าใหม่", "ฐานรายได้กว้างขึ้น", "รายได้อนาคต", "โอกาส re-rate"] },
    NEW_CONTRACT:       { cats: ["NEW_REVENUE"], thai: "สัญญาใหม่",
      mech: ["สัญญาใหม่", "backlog เพิ่ม", "รายได้อนาคต", "โอกาส re-rate"] },
    NEW_ORDER:          { cats: ["NEW_REVENUE"], thai: "คำสั่งซื้อใหม่",
      mech: ["คำสั่งซื้อใหม่", "backlog เพิ่ม", "รายได้อนาคต", "EPS มีโอกาสขึ้น"] },
    BACKLOG:            { cats: ["NEW_REVENUE"], thai: "backlog",
      mech: ["backlog เพิ่ม", "รายได้ที่มองเห็นล่วงหน้า", "รายได้อนาคต", "โอกาส re-rate"] },
    NEW_PROJECT:        { cats: ["NEW_REVENUE"], thai: "โครงการใหม่",
      mech: ["โครงการใหม่", "กำลังผลิต/งานในมือเพิ่ม", "รายได้อนาคต", "โอกาส re-rate"] },
    CAPACITY_EXPANSION: { cats: ["NEW_REVENUE"], thai: "ขยายกำลังผลิต",
      mech: ["ขยายกำลังผลิต", "ขายได้มากขึ้น", "รายได้อนาคต", "โอกาส re-rate"] },
    NEW_PRODUCT:        { cats: ["NEW_REVENUE", "BUSINESS_MODEL"], thai: "สินค้าใหม่",
      mech: ["สินค้าใหม่", "แหล่งรายได้เพิ่ม", "รายได้อนาคต", "โอกาส re-rate"] },
    NEW_MARKET:         { cats: ["NEW_REVENUE"], thai: "ตลาดใหม่",
      mech: ["ตลาดใหม่", "ฐานลูกค้ากว้างขึ้น", "รายได้อนาคต", "โอกาส re-rate"] },
    EXPORT_EXPANSION:   { cats: ["NEW_REVENUE"], thai: "ขยายส่งออก",
      mech: ["ขยายส่งออก", "ยอดขายต่างประเทศเพิ่ม", "รายได้อนาคต", "โอกาส re-rate"] },

    JV:                    { cats: ["BUSINESS_MODEL", "NEW_REVENUE"], thai: "ร่วมทุน", mech: null },
    STRATEGIC_INVESTMENT:  { cats: ["BUSINESS_MODEL"], thai: "ลงทุนเชิงกลยุทธ์", mech: null },
    ASSET_SALE:            { cats: ["ASSET_UNLOCK"], thai: "ขายสินทรัพย์",
      mech: ["ขายสินทรัพย์", "ได้เงินสด/ลดภาระ", "กำไรพิเศษหรือหนี้ลด", "โอกาส re-rate"] },
    ASSET_MONETIZATION:    { cats: ["ASSET_UNLOCK"], thai: "แปลงสินทรัพย์เป็นเงินสด",
      mech: ["แปลงสินทรัพย์เป็นเงินสด", "มูลค่าที่ซ่อนอยู่ถูกรับรู้", "งบดุลดีขึ้น", "โอกาส re-rate"] },
    SUBSIDIARY_EVENT:      { cats: ["CORPORATE_ACTION"], thai: "เหตุการณ์ในบริษัทย่อย", mech: null },

    LICENSE:            { cats: ["REGULATORY", "NEW_REVENUE"], thai: "ใบอนุญาต",
      mech: ["ได้ใบอนุญาต", "ทำธุรกิจนั้นได้", "รายได้อนาคต", "โอกาส re-rate"] },
    CONCESSION:         { cats: ["REGULATORY", "NEW_REVENUE"], thai: "สัมปทาน",
      mech: ["ได้สัมปทาน", "รายได้ระยะยาวที่มองเห็น", "รายได้อนาคต", "โอกาส re-rate"] },
    REGULATORY_CHANGE:  { cats: ["REGULATORY", "INDUSTRY_STRUCTURE"], thai: "กฎเกณฑ์เปลี่ยน", mech: null },
    GOVERNMENT_PROJECT: { cats: ["NEW_REVENUE", "REGULATORY"], thai: "งานภาครัฐ",
      mech: ["ได้งานภาครัฐ", "backlog เพิ่ม", "รายได้อนาคต", "โอกาส re-rate"] },

    DEBT_RESTRUCTURING:    { cats: ["CORPORATE_ACTION", "ASSET_UNLOCK"], thai: "ปรับโครงสร้างหนี้", mech: null },
    CAPITAL_RESTRUCTURING: { cats: ["CORPORATE_ACTION"], thai: "ปรับโครงสร้างทุน", mech: null },
    BUYBACK:               { cats: ["CORPORATE_ACTION"], thai: "ซื้อหุ้นคืน", mech: null },
    TENDER_OFFER:          { cats: ["CORPORATE_ACTION"], thai: "คำเสนอซื้อ", mech: null },

    // ---------- ระนาบ FINANCIAL (PLANE B) ----------
    // สี่รายการนี้เป็น "ผลลัพธ์ที่ปรากฏในงบ" ไม่ใช่เหตุการณ์ที่ทำให้ธุรกิจเปลี่ยน
    // plane: "FINANCIAL" ⇒ ยืนยัน FINANCIAL IMPACT ได้ แต่ลำพังสร้าง catalyst C0-C5 ไม่ได้ (§1 งบฟื้น ≠ catalyst)
    // mech ยังเก็บไว้เพราะเป็นคำอธิบายว่า "ตัวเลขนี้แปลเป็นอะไร" — ไม่ใช่ตั๋วผ่านสู่ catalyst
    REVENUE_INFLECTION: { cats: ["NEW_REVENUE"], thai: "รายได้พลิก", plane: "FINANCIAL",
      mech: ["รายได้พลิกขึ้น", "ธุรกิจฟื้นจริง", "กำไรมีโอกาสตาม", "โอกาส re-rate"] },
    EPS_INFLECTION:     { cats: ["NEW_REVENUE"], thai: "กำไรต่อหุ้นพลิก", plane: "FINANCIAL",
      mech: ["EPS พลิกขึ้น", "ความสามารถทำกำไรกลับมา", "กำไรที่ยั่งยืนขึ้น", "โอกาส re-rate"] },
    MARGIN_INFLECTION:  { cats: ["COST_TRANSFORMATION"], thai: "มาร์จิ้นพลิก", plane: "FINANCIAL",
      mech: ["มาร์จิ้นพลิกขึ้น", "โครงสร้างต้นทุนดีขึ้น", "กำไรเพิ่ม", "โอกาส re-rate"] },
    FCF_INFLECTION:     { cats: ["ASSET_UNLOCK"], thai: "กระแสเงินสดอิสระพลิก", plane: "FINANCIAL",
      mech: ["FCF พลิกบวก", "ธุรกิจสร้างเงินสดเองได้", "ลดพึ่งพาการกู้", "โอกาส re-rate"] },

    OTHER: { cats: [], thai: "อื่น ๆ", mech: null },
  };

  var CATEGORIES = {
    MANAGEMENT:          "ผู้บริหาร/โครงสร้างผู้ถือหุ้น",
    BUSINESS_MODEL:      "โมเดลธุรกิจ",
    NEW_REVENUE:         "แหล่งรายได้ใหม่",
    INDUSTRY_STRUCTURE:  "โครงสร้างอุตสาหกรรม",
    ASSET_UNLOCK:        "ปลดล็อกมูลค่าสินทรัพย์",
    COST_TRANSFORMATION: "โครงสร้างต้นทุน",
    REGULATORY:          "กฎเกณฑ์/ใบอนุญาต",
    CORPORATE_ACTION:    "รายการของบริษัท",
  };

  // ---------- §5 ความเกี่ยวข้องกับ catalyst ----------
  var RELEVANCE = {
    CATALYST_RELEVANT: { key: "CATALYST_RELEVANT", label: "CATALYST RELEVANT", thai: "อธิบายกลไกกระทบเศรษฐกิจของกิจการได้" },
    // ระนาบ B — เป็นหลักฐานจริงและมีค่า แต่เป็น "ผลลัพธ์" ไม่ใช่ "เหตุการณ์ที่ทำให้เกิดผล"
    // ต่างจาก NOT_RELEVANT (รายการประจำ) และต่างจาก UNKNOWN (อธิบายกลไกไม่ได้)
    FINANCIAL_EVIDENCE: { key: "FINANCIAL_EVIDENCE", label: "FINANCIAL EVIDENCE",
      thai: "หลักฐานผลลัพธ์ในงบ — ยืนยันผลทางการเงินได้ แต่ไม่ใช่ catalyst ในตัวเอง" },
    NOT_RELEVANT:      { key: "NOT_RELEVANT",      label: "NOT RELEVANT",      thai: "เป็นรายการปกติ ไม่กระทบเศรษฐกิจของกิจการ" },
    UNKNOWN:           { key: "UNKNOWN",           label: "UNKNOWN",           thai: "ยังอธิบายกลไกไม่ได้ — ระบบไม่แต่งกลไกเอง" },
  };

  // ---------- ระนาบของหลักฐาน ----------
  var PLANE = { BUSINESS: "BUSINESS", FINANCIAL: "FINANCIAL" };
  function planeOf(eventType) {
    var t = EVENT_TYPES[eventType];
    return t && t.plane === PLANE.FINANCIAL ? PLANE.FINANCIAL : PLANE.BUSINESS;
  }
  function isFinancialPlane(e) {
    // ผู้ผลิตหลักฐานประกาศระนาบมาเองได้ (financial-inflection ทำ) — ถ้าไม่ประกาศดูจากตาราง
    if (e && e.evidencePlane) return e.evidencePlane === PLANE.FINANCIAL;
    return planeOf(e && e.eventType) === PLANE.FINANCIAL;
  }

  // ---------- §1 สถานะของหลักฐานแต่ละชิ้น ----------
  var EV_STATUS = {
    VERIFIED:    { key: "VERIFIED",    thai: "ยืนยันจากเอกสารต้นทาง" },
    REPORTED:    { key: "REPORTED",    thai: "มีรายงาน แต่ยังไม่ได้ตรวจเอกสารต้นทาง" },
    UNVERIFIED:  { key: "UNVERIFIED",  thai: "ยังไม่ยืนยัน" },
    SUPERSEDED:  { key: "SUPERSEDED",  thai: "ถูกแทนที่ด้วยหลักฐานใหม่กว่า" },
    INVALIDATED: { key: "INVALIDATED", thai: "ถูกหักล้างแล้ว" },
  };

  // ---------- §10 ความพร้อมของข้อมูล ----------
  var AVAILABILITY = {
    CATALYST_UNAVAILABLE: { key: "CATALYST_UNAVAILABLE", thai: "ยังตรวจแหล่งหลักฐานไม่สำเร็จ — ไม่ได้แปลว่าไม่มี catalyst" },
    NO_CATALYST:          { key: "NO_CATALYST",          thai: "ตรวจแหล่งหลักฐานแล้ว ไม่พบเหตุการณ์ที่เข้าเกณฑ์" },
    CATALYST_IDENTIFIED:  { key: "CATALYST_IDENTIFIED",  thai: "พบเหตุการณ์ที่เข้าเกณฑ์" },
  };

  // ---------- §8 สถานะของ story ----------
  var STORY_STATUS = {
    FORMING:     { key: "FORMING",     thai: "เพิ่งเริ่มมีหลักฐาน" },
    DEVELOPING:  { key: "DEVELOPING",  thai: "หลักฐานทยอยเพิ่ม" },
    CONFIRMED:   { key: "CONFIRMED",   thai: "มีหลักฐานยืนยันแล้ว" },
    IN_NUMBERS:  { key: "IN_NUMBERS",  thai: "เห็นผลในงบแล้ว" },
    STALLED:     { key: "STALLED",     thai: "ไม่มีหลักฐานใหม่มานาน" },
    INVALIDATED: { key: "INVALIDATED", thai: "ถูกหักล้าง" },
  };

  // ---------- §9 ขั้นของ catalyst (ชื่อต้องตรงกับ catalyst-engine) ----------
  var STAGE = {
    NONE:                  { key: "NONE",                  n: -1 },
    C1_STORY:              { key: "C1_STORY",              n: 1 },
    C2_ANNOUNCED:          { key: "C2_ANNOUNCED",          n: 2 },
    C3_CONFIRMED:          { key: "C3_CONFIRMED",          n: 3 },
    C4_FINANCIAL_EVIDENCE: { key: "C4_FINANCIAL_EVIDENCE", n: 4 },
    C5_MARKET_RECOGNIZED:  { key: "C5_MARKET_RECOGNIZED",  n: 5 },
    C0_RUMOR:              { key: "C0_RUMOR",              n: 0 },
  };

  // ============================================================
  // helpers — ห้ามเดา: อะไรไม่รู้ต้องเป็น null
  // ============================================================
  function str(v) {
    if (v == null) return null;
    var s = String(v).trim();
    return s.length ? s : null;
  }
  // รับ ISO / yyyy-mm-dd / dd/mm/yyyy — คืน yyyy-mm-dd หรือ null (ห้ามเดาวันที่)
  function isoDate(v) {
    var s = str(v);
    if (!s) return null;
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[1] + "-" + m[2] + "-" + m[3];
    m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) return m[3] + "-" + m[2] + "-" + m[1];
    return null;
  }

  // ============================================================
  // §1 NORMALIZE — ทำหลักฐานดิบให้เป็นโครงสร้างมาตรฐาน
  // ============================================================
  function normalizeEvidence(raw, ctx) {
    ctx = ctx || {};
    var out = {
      ticker: str(raw && raw.ticker) || str(ctx.ticker),
      eventDate: isoDate(raw && raw.eventDate),
      sourceType: null,
      sourceName: str(raw && raw.sourceName),
      sourceUrl: str(raw && raw.sourceUrl),
      eventType: null,
      title: str(raw && raw.title),
      summary: str(raw && raw.summary),
      evidenceStrength: null,
      confidence: null,
      catalystCategory: [],
      affectedBusiness: str(raw && raw.affectedBusiness),
      expectedImpact: str(raw && raw.expectedImpact),
      status: null,
      createdAt: str(raw && raw.createdAt) || str(ctx.now),
      // ---- ฟิลด์เสริมสำหรับตรวจสอบย้อนหลัง ----
      sourceTier: null,
      catalystRelevance: null,
      economicMechanism: null,
      rejected: null,
      notes: [],
    };

    // sourceType — ไม่รู้จัก = OTHER (tier 4) ไม่ใช่ null เพราะต้องมี tier ไว้จำกัดความแข็ง
    var stKey = String((raw && raw.sourceType) || "").toUpperCase();
    out.sourceType = SOURCE_TYPES[stKey] ? stKey : "OTHER";
    if (!SOURCE_TYPES[stKey]) out.notes.push("ไม่รู้จัก sourceType ที่ระบุมา — จัดเป็น OTHER (TIER 4)");
    out.sourceTier = TIERS[SOURCE_TYPES[out.sourceType].tier].key;

    // eventType — ไม่รู้จัก = OTHER
    var etKey = String((raw && raw.eventType) || "").toUpperCase();
    out.eventType = EVENT_TYPES[etKey] ? etKey : "OTHER";
    if (etKey && !EVENT_TYPES[etKey]) out.notes.push("ไม่รู้จัก eventType ที่ระบุมา — จัดเป็น OTHER");

    // §6 หมวด — มาจากตาราง ไม่ใช่จากที่ผู้ป้อนอ้าง (กันการยัดหมวดเอง)
    out.catalystCategory = (EVENT_TYPES[out.eventType].cats || []).slice();

    // §4 + §7 ความแข็ง โดนเพดานของ tier บังคับ
    var declared = String((raw && raw.evidenceStrength) || "").toUpperCase();
    var s = STRENGTH[declared] || null;
    if (!s) {
      // ไม่ระบุความแข็ง = ต่ำสุด ห้ามเดาขึ้น
      s = STRENGTH.C0_RUMOR;
      if (declared) out.notes.push("ไม่รู้จักระดับความแข็งที่ระบุมา — ถือเป็น C0");
      else out.notes.push("ไม่ได้ระบุความแข็งของหลักฐาน — ถือเป็น C0 (ระบบไม่เดาขึ้น)");
    }
    var cap = TIERS[SOURCE_TYPES[out.sourceType].tier].maxStrength;
    if (s.n > cap) {
      out.notes.push("แหล่งระดับ " + out.sourceTier + " ยกได้สูงสุด " +
        (STRENGTH_BY_N[cap] ? STRENGTH_BY_N[cap].label : "C0") + " — ลดจาก " + s.label + " ตามกฎ §7");
      s = STRENGTH_BY_N[cap];
    }
    out.evidenceStrength = s.key;

    // §5 กลไกเศรษฐกิจ — มาจากตารางเท่านั้น อธิบายไม่ได้ = UNKNOWN
    // §5 — "เกี่ยวข้องกับ catalyst ไหม" ขึ้นกับว่ามีกลไกเศรษฐกิจหรือไม่ "เท่านั้น"
    // ความแข็งของหลักฐาน (C0-C4) เป็นคนละมิติ และถูกเก็บใน evidenceStrength แยกไว้แล้ว
    // เอาสองอย่างมาปนกันจะทำให้ "เรื่องที่จริงแต่ยังอ่อน" หายไปจากระบบทั้งที่ควรติดตาม
    var mech = EVENT_TYPES[out.eventType].mech;
    // ระนาบ: ประกาศจากผู้ผลิตหลักฐานก่อน ถ้าไม่ประกาศให้ดูจากประเภทเหตุการณ์
    out.evidencePlane = (raw && raw.evidencePlane === PLANE.FINANCIAL) ? PLANE.FINANCIAL
      : planeOf(out.eventType);
    if (out.evidencePlane === PLANE.FINANCIAL) {
      // §1 งบฟื้น ≠ catalyst — ผลลัพธ์ในงบยืนยัน FINANCIAL IMPACT ได้ แต่ไม่สร้างขั้นของ catalyst
      out.economicMechanism = mech ? mech.slice() : null;
      out.catalystRelevance = RELEVANCE.FINANCIAL_EVIDENCE.key;
      out.notes.push("เป็นผลลัพธ์ที่ปรากฏในงบ ไม่ใช่เหตุการณ์เชิงธุรกิจ — " +
        "ใช้ยืนยันผลทางการเงินได้ แต่ลำพังไม่สร้าง catalyst (§1)");
    } else if (mech) {
      out.economicMechanism = mech.slice();
      out.catalystRelevance = RELEVANCE.CATALYST_RELEVANT.key;
      if (s.n < STRENGTH.C2_OFFICIAL_ANNOUNCEMENT.n) {
        out.notes.push("มีกลไกที่อธิบายได้ แต่หลักฐานยังอ่อน (" + s.label + ") — ติดตามได้ แต่ยังไม่ยืนยัน");
      }
    } else {
      out.economicMechanism = null;
      out.catalystRelevance = RELEVANCE.UNKNOWN.key;
      out.notes.push("อธิบายกลไกกระทบเศรษฐกิจจากประเภทเหตุการณ์นี้ไม่ได้ — ระบบไม่แต่งกลไกเอง");
    }

    // status
    var stat = String((raw && raw.status) || "").toUpperCase();
    out.status = EV_STATUS[stat] ? stat
      : (SOURCE_TYPES[out.sourceType].tier === 1 ? EV_STATUS.REPORTED.key : EV_STATUS.UNVERIFIED.key);

    // confidence — ตัวเลขที่ผู้ป้อนให้เท่านั้น ไม่มีก็ null (ห้ามคิดคะแนนเอง)
    var c = raw && raw.confidence;
    out.confidence = typeof c === "number" && isFinite(c) && c >= 0 && c <= 1 ? c : null;

    // ---- ตรวจความสมบูรณ์: ไม่มีวันที่หรือ ticker = ใช้เป็นหลักฐานไม่ได้ ----
    if (!out.ticker) out.rejected = "ไม่มี ticker";
    else if (!out.eventDate) out.rejected = "ไม่มีวันที่ของเหตุการณ์ (ห้ามเดาวันที่)";
    else if (!out.title) out.rejected = "ไม่มีหัวข้อ/รายละเอียด";
    else if (!out.sourceUrl && SOURCE_TYPES[out.sourceType].tier <= 2) {
      out.notes.push("ไม่มีลิงก์ต้นทาง — ตรวจสอบย้อนหลังไม่ได้");
    }
    return out;
  }

  function isUsable(ev) { return !!(ev && !ev.rejected); }

  // ============================================================
  // §9 ขั้นของ catalyst จากหลักฐานล้วน
  // marketRecognition ใช้ "เฉพาะ" ตอนยก C5 และต้องมีหลักฐาน >= C3 อยู่แล้ว
  // ============================================================
  // marketRecognized: boolean — "ตลาดรับรู้แล้วหรือยัง"
  // ห้ามให้ไฟล์นี้ตั้งสเกลของตัวเอง เพราะสเกลการรับรู้เป็นของ catalyst-engine (RECOG)
  // ถ้ามีสองสเกล จะได้ผลไม่ตรงกัน (เคยเกิดจริง: engine บอก C5 แต่ story บอก C3)
  // PHASE 5 — ขั้นของ catalyst (C0-C5) เป็นขั้นของ "เหตุการณ์เชิงธุรกิจ" เท่านั้น
  //   C0-C3 : คิดจากหลักฐานระนาบ BUSINESS ล้วน — หลักฐานงบไม่มีสิทธิ์ยกขั้น
  //   C4    : ต้องมีทั้ง "เหตุการณ์ธุรกิจระดับ C3" และ "ผลปรากฏในงบ" ⇒ งบล้วนไปไม่ถึง
  //   C5    : C3 ขึ้นไป + ตลาดรับรู้ (ราคายังไม่มีสิทธิ์สร้างขั้น เหมือนเดิม)
  // financialItems ส่งเข้ามาแยก เพื่อไม่ให้ปนกับการนับความแข็งของเหตุการณ์
  function deriveStage(evidenceItems, marketRecognized, financialItems) {
    var usable = (evidenceItems || []).filter(isUsable).filter(function (e) {
      return e.status !== EV_STATUS.INVALIDATED.key;
    });
    var hasFinancialEvidence = (financialItems || []).filter(isUsable).filter(function (e) {
      return e.status !== EV_STATUS.INVALIDATED.key;
    }).length > 0;
    if (!usable.length) return { stage: STAGE.NONE, evidenceStrengthN: -1, upgradedBy: null, note: null };

    var best = -1, bestPrimary = -1;
    usable.forEach(function (e) {
      var n = STRENGTH[e.evidenceStrength] ? STRENGTH[e.evidenceStrength].n : 0;
      if (n > best) best = n;
      // §12/§17 — C3 ขึ้นไปต้องมีการยืนยันจากแหล่งปฐมภูมิ (TIER 1-2)
      // แหล่งค้นพบจะกองกันมากแค่ไหนก็ยกไม่ได้ — นั่นคือความนิยม ไม่ใช่การยืนยัน
      var tierN = SOURCE_TYPES[e.sourceType] ? SOURCE_TYPES[e.sourceType].tier : 4;
      if (isPrimaryTier(tierN) && n > bestPrimary) bestPrimary = n;
    });
    if (best >= 3 && bestPrimary < 3) {
      best = Math.min(best, 2);   // ไม่มีแหล่งปฐมภูมิยืนยัน → สูงสุด C2
    }

    // ความแข็งของเหตุการณ์ธุรกิจเพดาน C3 — ระดับ C4 ไม่ใช่ "ความแข็งของเอกสาร"
    // แต่เป็น "เห็นผลในงบแล้ว" ซึ่งต้องมีเหตุการณ์ธุรกิจอยู่ก่อน
    var stage = best >= 3 ? STAGE.C3_CONFIRMED
      : best >= 2 ? STAGE.C2_ANNOUNCED
        : best >= 1 ? STAGE.C1_STORY : STAGE.C0_RUMOR;

    var out = { stage: stage, evidenceStrengthN: Math.min(best, 3), upgradedBy: null, note: null };

    // C4 = เหตุการณ์ธุรกิจยืนยันแล้ว (C3) + ผลปรากฏในงบ · ขาดข้อใดข้อหนึ่งไปไม่ถึง
    if (best >= 3 && hasFinancialEvidence) {
      out.stage = STAGE.C4_FINANCIAL_EVIDENCE;
      out.evidenceStrengthN = 4;
      out.upgradedBy = "business-event(C3+) + financial-evidence";
      out.note = "C4 = เหตุการณ์ธุรกิจยืนยันแล้ว และผลเริ่มปรากฏในงบ — " +
        "งบลำพังไม่สร้างขั้นนี้ (§1 งบฟื้น ≠ catalyst)";
    }

    // C5 ต้องมี "ทั้งสองอย่าง" — หลักฐาน >= C3 และตลาดรับรู้จริง
    // ราคาลำพังยกขั้นไม่ได้เด็ดขาด: ถ้า best < 3 บรรทัดนี้ไม่มีทางทำงาน
    if (best >= 3 && marketRecognized === true) {
      out.stage = STAGE.C5_MARKET_RECOGNIZED;
      out.upgradedBy = "business-event(C3+) + market-recognition";
      out.note = "C5 = เหตุการณ์ธุรกิจระดับ " + (STRENGTH_BY_N[Math.min(best, 3)] ? STRENGTH_BY_N[Math.min(best, 3)].label : "C3") +
        " + ตลาดรับรู้แล้ว — ราคาเองไม่ได้สร้างขั้นของ catalyst";
    }
    return out;
  }

  // ============================================================
  // §8 + §11 รวมหลักฐานหลายชิ้นเป็น Story (เก็บไทม์ไลน์ ไม่ทับของเก่า)
  // ============================================================
  function buildStory(ticker, rawEvidence, opts) {
    opts = opts || {};
    var inspected = opts.inspected === true;   // ตรวจแหล่งข้อมูลสำเร็จหรือยัง
    // ผู้เรียกต้องบอกมาตรง ๆ ว่าตลาดรับรู้แล้วหรือยัง (engine เป็นคนตัดสินด้วยสเกลของมัน)
    var recognized = opts.marketRecognized === true;
    var recogN = typeof opts.marketRecognitionN === "number" ? opts.marketRecognitionN : null;

    var all = (rawEvidence || []).map(function (r) { return normalizeEvidence(r, { ticker: ticker, now: opts.now || null }); });
    var usable = all.filter(isUsable);
    var rejected = all.filter(function (e) { return !!e.rejected; });

    // §11 ไทม์ไลน์เรียงตามเวลา เก็บครบทุกชิ้น ไม่มีการเขียนทับ
    var timeline = usable.slice().sort(function (a, b) {
      if (a.eventDate === b.eventDate) return 0;
      return a.eventDate < b.eventDate ? -1 : 1;
    });

    // §5 — เหตุการณ์ที่อธิบายกลไกกระทบเศรษฐกิจไม่ได้ ไม่นับเป็น catalyst
    // (เช่น เปลี่ยนผู้บริหาร เพิ่มทุน รายการเกี่ยวโยง — เป็นข้อเท็จจริงที่จริง
    //  แต่ลำพังมันไม่ได้บอกว่าเศรษฐกิจของกิจการกำลังเปลี่ยน)
    // ของพวกนี้ยังอยู่ในไทม์ไลน์ครบ เพียงแต่ไม่ยกสถานะ
    var qualifying = usable.filter(function (e) {
      return e.catalystRelevance === RELEVANCE.CATALYST_RELEVANT.key;
    });
    // PHASE 5 — ระนาบ B: หลักฐานผลลัพธ์ในงบ เก็บแยกไว้ใช้ยืนยันผลทางการเงิน
    // ไม่อยู่ใน qualifying จึงไม่สร้าง availability = CATALYST_IDENTIFIED และไม่ยกขั้น catalyst
    var financialItems = usable.filter(isFinancialPlane);

    // §10 availability — ยังไม่ได้ตรวจ ≠ ตรวจแล้วไม่พบ
    var availability;
    if (!qualifying.length) availability = inspected ? AVAILABILITY.NO_CATALYST : AVAILABILITY.CATALYST_UNAVAILABLE;
    else availability = AVAILABILITY.CATALYST_IDENTIFIED;

    if (availability.key !== AVAILABILITY.CATALYST_IDENTIFIED.key) {
      return {
        ticker: ticker, storyTitle: null, storyCategory: [], storyStatus: null,
        firstDetectedDate: timeline[0] ? timeline[0].eventDate : null,
        latestEvidenceDate: timeline[timeline.length - 1] ? timeline[timeline.length - 1].eventDate : null,
        // เก็บของที่ตรวจเจอไว้เสมอ แม้ยังไม่เข้าเกณฑ์ catalyst (§11 ห้ามทิ้งประวัติ)
        evidenceItems: [], otherEvents: usable, rejectedItems: rejected, timeline: timeline,
        evidenceStrength: null, evidenceStrengthN: -1,
        catalystStage: STAGE.NONE, stageUpgradedBy: null, stageNote: null,
        // PHASE 5 — ไม่มี catalyst ไม่ได้แปลว่าไม่มีหลักฐานงบ · สองอย่างนี้แยกกัน
        financialEvidence: financialItems,
        economicMechanism: null,
        financialImpact: financialItems.length
          ? financialItems.map(function (e) {
            return { date: e.eventDate, title: e.title, impact: e.expectedImpact };
          }) : null,
        marketRecognition: recognized, failureConditions: [],
        availability: availability, inspected: inspected,
        note: !inspected
          ? "ยังตรวจแหล่งหลักฐานไม่สำเร็จ — ไม่ได้แปลว่าไม่มี catalyst"
          : (usable.length
            ? "ตรวจแล้วพบเหตุการณ์ " + usable.length + " รายการ แต่ยังไม่มีรายการใดที่อธิบายกลไกกระทบเศรษฐกิจของกิจการได้"
            : "ตรวจแหล่งหลักฐานแล้ว ไม่พบเหตุการณ์ที่เข้าเกณฑ์ catalyst"),
      };
    }

    // ขั้นคิดจาก "รายการที่เข้าเกณฑ์" เท่านั้น — เปลี่ยนผู้บริหารระดับ C2 ไม่ควรดัน stage
    var derived = deriveStage(qualifying, recognized, financialItems);

    // หลักฐานที่แข็งที่สุด (แข็งก่อน แล้วจึงใหม่กว่า) = ตัวแทนของ story
    var ranked = qualifying.slice().sort(function (a, b) {
      var d = STRENGTH[b.evidenceStrength].n - STRENGTH[a.evidenceStrength].n;
      if (d) return d;
      return a.eventDate < b.eventDate ? 1 : -1;
    });
    var lead = ranked[0];

    var cats = {};
    qualifying.forEach(function (e) { (e.catalystCategory || []).forEach(function (c) { cats[c] = true; }); });

    var mechSrc = ranked[0] || null;
    // ถ้าไม่มีชิ้นไหนอธิบายกลไกได้ ต้องเป็น null ห้ามแต่ง
    var mechanism = mechSrc && mechSrc.economicMechanism ? mechSrc.economicMechanism.slice() : null;

    // PHASE 5 — อ่านจากระนาบงบโดยตรง (qualifying เป็นเหตุการณ์ธุรกิจล้วนแล้ว)
    var hasFinancial = financialItems.length > 0;
    // stage >= 4 ตอนนี้แปลว่า "เหตุการณ์ธุรกิจ C3 + ผลปรากฏในงบ" ตามกฎใหม่ของ deriveStage
    var status = derived.stage.n >= 4 ? STORY_STATUS.IN_NUMBERS
      : derived.stage.n >= 3 ? STORY_STATUS.CONFIRMED
        : qualifying.length > 1 ? STORY_STATUS.DEVELOPING : STORY_STATUS.FORMING;
    if (qualifying.some(function (e) { return e.status === EV_STATUS.INVALIDATED.key; }) && qualifying.length === 1) {
      status = STORY_STATUS.INVALIDATED;
    }

    return {
      ticker: ticker,
      storyTitle: lead.title,
      storyCategory: Object.keys(cats),
      storyStatus: status.key,
      firstDetectedDate: timeline[0] ? timeline[0].eventDate : null,
      latestEvidenceDate: timeline[timeline.length - 1] ? timeline[timeline.length - 1].eventDate : null,
      evidenceItems: qualifying,
      // §11 เหตุการณ์อื่นที่ตรวจเจอแต่ยังไม่เข้าเกณฑ์ — เก็บไว้ให้เห็นในไทม์ไลน์
      otherEvents: usable.filter(function (e) { return e.catalystRelevance !== RELEVANCE.CATALYST_RELEVANT.key; }),
      rejectedItems: rejected,
      timeline: timeline,
      evidenceStrength: STRENGTH_BY_N[derived.evidenceStrengthN] ? STRENGTH_BY_N[derived.evidenceStrengthN].key : null,
      evidenceStrengthN: derived.evidenceStrengthN,
      catalystStage: derived.stage,
      stageUpgradedBy: derived.upgradedBy,
      stageNote: derived.note,
      economicMechanism: mechanism,
      // PHASE 5 — หลักฐานงบเก็บแยกและยังเข้าถึงได้เสมอ
      financialEvidence: financialItems,
      // financialImpact มาจากหลักฐานระนาบงบจริงเท่านั้น ไม่มีก็ null
      financialImpact: hasFinancial
        ? financialItems.map(function (e) {
          return { date: e.eventDate, title: e.title, impact: e.expectedImpact };
        }) : null,
      marketRecognition: recognized,
      failureConditions: failureConditions(qualifying, derived.stage),
      availability: availability,
      inspected: true,
      note: null,
    };
  }

  // §17 "อะไรจะพิสูจน์ว่าเราคิดผิด" — ผูกกับประเภทหลักฐานที่มีจริง ไม่ใช่ข้อความทั่วไป
  function failureConditions(usable, stage) {
    var out = [];
    var types = {};
    usable.forEach(function (e) { types[e.eventType] = true; });
    if (types.NEW_ORDER || types.NEW_CONTRACT || types.BACKLOG || types.GOVERNMENT_PROJECT) {
      out.push("สัญญา/คำสั่งซื้อถูกยกเลิกหรือเลื่อน");
      out.push("backlog ไม่แปลงเป็นรายได้ในงบไตรมาสถัดไป");
    }
    if (types.CAPACITY_EXPANSION || types.NEW_PROJECT) out.push("โครงการล่าช้าหรือต้นทุนบานปลาย");
    if (types.NEW_BUSINESS || types.NEW_PRODUCT || types.NEW_MARKET) out.push("ธุรกิจใหม่ไม่สร้างรายได้ตามที่ประกาศ");
    if (types.COST_REDUCTION || types.MARGIN_INFLECTION) out.push("มาร์จิ้นกลับไปที่ระดับเดิม");
    if (types.LICENSE || types.CONCESSION || types.REGULATORY_CHANGE) out.push("ใบอนุญาต/สัมปทานถูกเพิกถอนหรือเงื่อนไขเปลี่ยน");
    if (types.MANAGEMENT_CHANGE || types.BOARD_CHANGE) out.push("ผู้บริหารชุดใหม่ลาออกอีกหรือกลยุทธ์ถูกยกเลิก");
    if (stage && stage.n >= 3) out.push("งบไตรมาสถัดไปไม่เห็นผลกระทบตามกลไกที่อ้าง");
    if (!out.length) out.push("ยังไม่มีเงื่อนไขหักล้างที่ผูกกับหลักฐานชุดนี้ได้");
    return out;
  }

  var EvidenceModel = {
    VERSION: VERSION,
    SOURCE_TYPES: SOURCE_TYPES, TIERS: TIERS, STRENGTH: STRENGTH, STRENGTH_BY_N: STRENGTH_BY_N,
    PLANE: PLANE, planeOf: planeOf, isFinancialPlane: isFinancialPlane,
    DISCOVERY_TIER_MIN: DISCOVERY_TIER_MIN, isDiscoveryTier: isDiscoveryTier, isPrimaryTier: isPrimaryTier,
    EVENT_TYPES: EVENT_TYPES, CATEGORIES: CATEGORIES, RELEVANCE: RELEVANCE,
    EV_STATUS: EV_STATUS, AVAILABILITY: AVAILABILITY, STORY_STATUS: STORY_STATUS, STAGE: STAGE,
    normalizeEvidence: normalizeEvidence,
    deriveStage: deriveStage,
    buildStory: buildStory,
    isUsable: isUsable,
    _internal: { isoDate: isoDate, failureConditions: failureConditions },
  };

  if (typeof window !== "undefined") window.EvidenceModel = EvidenceModel;
  if (typeof module !== "undefined" && module.exports) module.exports = EvidenceModel;
})();
