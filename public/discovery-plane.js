(function () {
  "use strict";
  // ============================================================
  // THAI CATALYST HUNTER — DISCOVERY PLANE (PHASE 3)
  //
  // แยก "การค้นพบ" ออกจาก "หลักฐาน" อย่างเด็ดขาด
  //   DISCOVERY ตอบว่า "อาจมีอะไรเกิดขึ้น"        → LEAD / NARRATIVE_EMERGING
  //   EVIDENCE  ตอบว่า "ยืนยันแล้วว่าเกิดขึ้นจริง" → C0-C5 (evidence-model.js)
  //
  // กติกาที่ห้ามพัง:
  //  1. แหล่งค้นพบ (ThaiVI/โซเชียล/ข่าว) สร้าง LEAD ได้ แต่ "ห้าม" สร้าง C3/C4/C5
  //     — เพดานนี้บังคับที่ evidence-model (TIERS.maxStrength) ไม่ใช่ที่นี่
  //  2. คำที่ตรง keyword = "สัญญาณค้นพบ" เท่านั้น ไม่ใช่หลักฐาน
  //  3. จำนวนแหล่งค้นพบมาก ≠ หลักฐานแข็ง — 30 โพสต์ยังเป็น NARRATIVE_EMERGING
  //  4. ระบุ ticker ไม่ชัด = UNKNOWN ห้ามเดา (ticker ไทยชนกับคำทั่วไป: M, A, B, AS, IT, SO)
  //  5. ของเก่าต้องไม่กลายเป็นสัญญาณใหม่ (§26) — มี eventDate/publishedAt/retrievedAt แยกกัน
  //  6. แหล่งขัดแย้งกัน → CONFLICTING_EVIDENCE ห้ามเลือกด้านบวกให้เอง
  //  7. LLM สรุปข้อความได้ แต่ห้ามตัดสินสถานะใด ๆ — ทุกสถานะมาจากกฎในไฟล์นี้
  //
  // นิยาม tier มาจาก evidence-model ที่เดียว (บทเรียน PHASE 2: สเกลซ้อนกันทำให้ผลไม่ตรง)
  // ============================================================

  var VERSION = "1.0.0";

  function EM() {
    if (typeof window !== "undefined" && window.EvidenceModel) return window.EvidenceModel;
    if (typeof module !== "undefined" && module.exports) {
      try { return require("./evidence-model.js"); } catch (e) { return null; }
    }
    return null;
  }

  // ---------- §5 สถานะการตรวจสอบ ----------
  var VERIFICATION = {
    UNVERIFIED:          { key: "UNVERIFIED",          thai: "ยังไม่ได้ตรวจกับแหล่งปฐมภูมิ" },
    PARTIALLY_VERIFIED:  { key: "PARTIALLY_VERIFIED",  thai: "มีแหล่งปฐมภูมิรับบางส่วน" },
    VERIFIED:            { key: "VERIFIED",            thai: "ยืนยันด้วยแหล่งปฐมภูมิแล้ว" },
    REJECTED:            { key: "REJECTED",            thai: "ถูกหักล้างแล้ว" },
    CONFLICTING:         { key: "CONFLICTING",         thai: "แหล่งข้อมูลขัดแย้งกันเอง" },
  };

  // ---------- §9 สถานะของระนาบค้นพบ (คนละชุดกับ catalyst maturity) ----------
  var DISCOVERY_STAGE = {
    NONE: { key: "NONE", n: -1, label: "—", thai: "ไม่มีสัญญาณค้นพบ" },
    LEAD: { key: "LEAD", n: 0, label: "LEAD", icon: "🔎",
      thai: "มีสัญญาณเดียว — ยังเป็นเพียงเบาะแส ต้องไปหาหลักฐานปฐมภูมิ" },
    NARRATIVE_EMERGING: { key: "NARRATIVE_EMERGING", n: 1, label: "NARRATIVE EMERGING", icon: "📡",
      thai: "หลายแหล่งอิสระพูดเรื่องเดียวกัน แต่ยังไม่มีหลักฐานปฐมภูมิยืนยัน" },
    CONFLICTING_EVIDENCE: { key: "CONFLICTING_EVIDENCE", n: 0, label: "CONFLICTING", icon: "⚠",
      thai: "แหล่งข้อมูลขัดแย้งกัน — ระบบไม่เลือกด้านบวกให้เอง" },
  };

  // ---------- §6 ประเภทเหตุการณ์ที่ค้นพบได้ ----------
  // ใช้ชุดเดียวกับ EvidenceModel.EVENT_TYPES + เพิ่มของฝั่งค้นพบโดยเฉพาะ
  var DISCOVERY_ONLY_TYPES = {
    INDUSTRY_DEMAND_CHANGE: { cats: ["INDUSTRY_STRUCTURE"], thai: "ความต้องการในอุตสาหกรรมเปลี่ยน" },
    INDUSTRY_SUPPLY_CHANGE: { cats: ["INDUSTRY_STRUCTURE"], thai: "อุปทานในอุตสาหกรรมเปลี่ยน" },
    TURNAROUND:             { cats: ["BUSINESS_MODEL"],     thai: "พลิกฟื้นกิจการ" },
    MARGIN_RECOVERY:        { cats: ["COST_TRANSFORMATION"], thai: "มาร์จิ้นฟื้น" },
    EARNINGS_RECOVERY:      { cats: ["NEW_REVENUE"],        thai: "กำไรฟื้น" },
  };

  function eventTypeInfo(key) {
    var em = EM();
    if (em && em.EVENT_TYPES[key]) return em.EVENT_TYPES[key];
    if (DISCOVERY_ONLY_TYPES[key]) return DISCOVERY_ONLY_TYPES[key];
    return null;
  }
  function allEventTypes() {
    var em = EM();
    var out = {};
    if (em) Object.keys(em.EVENT_TYPES).forEach(function (k) { out[k] = true; });
    Object.keys(DISCOVERY_ONLY_TYPES).forEach(function (k) { out[k] = true; });
    return Object.keys(out);
  }

  // ---------- §7 คำค้น ไทย + อังกฤษ ----------
  // แต่ละรายการ: [regex, eventType]
  // ย้ำ: คำที่ตรงคือ "สัญญาณค้นพบ" ไม่ใช่หลักฐาน — ห้ามเอาไปยกระดับ maturity
  var KEYWORDS = [
    // งาน/คำสั่งซื้อ
    [/งานใหม่|ได้งาน|รับงาน|ได้รับงาน|ชนะประมูล|ประมูลได้/i, "NEW_ORDER"],
    [/คำสั่งซื้อ|ออเดอร์|ยอดสั่งซื้อ/i, "NEW_ORDER"],
    [/\bnew order\b|\bpurchase order\b|\bwon the bid\b|\bawarded\b/i, "NEW_ORDER"],
    [/backlog|งานในมือ|มูลค่างานในมือ/i, "BACKLOG"],
    [/เซ็นสัญญา|ลงนามสัญญา|ทำสัญญา/i, "NEW_CONTRACT"],
    [/\bnew contract\b|\bsigned (a |the )?contract\b|\bcontract win\b/i, "NEW_CONTRACT"],
    [/ลูกค้าใหม่|ลูกค้ารายใหม่/i, "NEW_CUSTOMER"],
    [/\bnew customer\b|\bnew client\b/i, "NEW_CUSTOMER"],
    // กำลังผลิต/โครงการ
    [/โรงงานใหม่|เพิ่มกำลังผลิต|ขยายกำลังผลิต|กำลังการผลิต|ไลน์ผลิตใหม่/i, "CAPACITY_EXPANSION"],
    [/\bcapacity expansion\b|\bnew (plant|factory)\b|\bproduction line\b/i, "CAPACITY_EXPANSION"],
    [/โครงการใหม่|เริ่มโครงการ/i, "NEW_PROJECT"],
    [/\bnew project\b/i, "NEW_PROJECT"],
    [/โครงการรัฐ|งานรัฐ|ภาครัฐ|รัฐบาลอนุมัติ/i, "GOVERNMENT_PROJECT"],
    [/\bgovernment project\b|\bstate project\b|\bpublic sector project\b/i, "GOVERNMENT_PROJECT"],
    // ธุรกิจ/สินค้า/ตลาด
    [/ธุรกิจใหม่|ธุรกิจตัวใหม่|เข้าสู่ธุรกิจ/i, "NEW_BUSINESS"],
    [/\bnew business\b/i, "NEW_BUSINESS"],
    [/สินค้าใหม่|ผลิตภัณฑ์ใหม่|เปิดตัวสินค้า/i, "NEW_PRODUCT"],
    [/\bnew product\b|\bproduct launch\b/i, "NEW_PRODUCT"],
    [/ตลาดใหม่|บุกตลาด/i, "NEW_MARKET"],
    [/\bnew market\b/i, "NEW_MARKET"],
    [/ส่งออก|ขยายส่งออก|ตลาดต่างประเทศ/i, "EXPORT_EXPANSION"],
    [/\bexport\b/i, "EXPORT_EXPANSION"],
    [/ปรับโมเดลธุรกิจ|เปลี่ยนธุรกิจ|เปลี่ยนทิศทางธุรกิจ/i, "BUSINESS_PIVOT"],
    // ร่วมทุน/สินทรัพย์
    [/ร่วมทุน|กิจการร่วมค้า/i, "JV"],
    [/\bjoint venture\b|\bjv\b/i, "JV"],
    [/ลงทุนเชิงกลยุทธ์|เข้าซื้อกิจการ|ควบรวม/i, "STRATEGIC_INVESTMENT"],
    [/\b(m&a|acquisition|acquire)\b/i, "STRATEGIC_INVESTMENT"],
    [/ขายสินทรัพย์|ขายที่ดิน|ขายหุ้นบริษัทย่อย|จำหน่ายสินทรัพย์/i, "ASSET_SALE"],
    [/\basset sale\b|\bdivest/i, "ASSET_SALE"],
    [/ปลดล็อกมูลค่า|แปลงสินทรัพย์เป็นเงินสด/i, "ASSET_MONETIZATION"],
    // ผู้บริหาร/ผู้ถือหุ้น
    [/ผู้บริหารใหม่|เปลี่ยนผู้บริหาร|ซีอีโอใหม่|ผู้บริหารลาออก/i, "MANAGEMENT_CHANGE"],
    [/\b(ceo|cfo|coo)\b|\bnew (chief|management)\b|\bmanagement change\b/i, "MANAGEMENT_CHANGE"],
    [/เปลี่ยนกรรมการ|กรรมการใหม่/i, "BOARD_CHANGE"],
    [/ผู้ถือหุ้นใหญ่|เปลี่ยนผู้ถือหุ้น|บิ๊กล็อต/i, "MAJOR_SHAREHOLDER_CHANGE"],
    [/\bmajor shareholder\b|\bbig lot\b/i, "MAJOR_SHAREHOLDER_CHANGE"],
    [/ผู้บริหารซื้อหุ้น|ซื้อหุ้นเพิ่ม/i, "INSIDER_BUY"],
    [/ผู้บริหารขายหุ้น/i, "INSIDER_SELL"],
    // งบ/หนี้/ต้นทุน
    [/ปลดหนี้|ลดหนี้|ปรับโครงสร้างหนี้/i, "DEBT_RESTRUCTURING"],
    [/\bdebt restructur/i, "DEBT_RESTRUCTURING"],
    [/เพิ่มทุน|ลดทุน|ปรับโครงสร้างทุน|วอร์แรนต์/i, "CAPITAL_RESTRUCTURING"],
    [/\bcapital (increase|restructur)/i, "CAPITAL_RESTRUCTURING"],
    [/ซื้อหุ้นคืน/i, "BUYBACK"],
    [/\bbuy-?back\b|\bshare repurchase\b/i, "BUYBACK"],
    [/เทนเดอร์ออฟเฟอร์|คำเสนอซื้อ/i, "TENDER_OFFER"],
    [/\btender offer\b/i, "TENDER_OFFER"],
    [/ลดต้นทุน|คุมต้นทุน|ประหยัดต้นทุน/i, "COST_REDUCTION"],
    [/\bcost (reduction|cutting|saving)\b/i, "COST_REDUCTION"],
    // ใบอนุญาต/กฎเกณฑ์
    [/ใบอนุญาต|ได้ใบอนุญาต/i, "LICENSE"],
    [/\blicen[cs]e\b|\bpermit\b/i, "LICENSE"],
    [/สัมปทาน/i, "CONCESSION"],
    [/\bconcession\b/i, "CONCESSION"],
    [/กฎเกณฑ์ใหม่|กฎหมายใหม่|มาตรการรัฐ|นโยบายรัฐ/i, "REGULATORY_CHANGE"],
    [/\bregulatory change\b|\bnew regulation\b/i, "REGULATORY_CHANGE"],
    // ฟื้นตัว
    [/พลิกฟื้น|ฟื้นตัว|กลับมามีกำไร|เทิร์นอะราวด์/i, "TURNAROUND"],
    [/\bturnaround\b|\brecovery\b/i, "TURNAROUND"],
    [/มาร์จิ้นดีขึ้น|อัตรากำไรดีขึ้น|มาร์จิ้นฟื้น/i, "MARGIN_RECOVERY"],
    [/\bmargin (recovery|improve|expansion)\b/i, "MARGIN_RECOVERY"],
    [/กำไรฟื้น|กำไรโต|กำไรพลิก/i, "EARNINGS_RECOVERY"],
    [/\bearnings (recovery|rebound)\b/i, "EARNINGS_RECOVERY"],
    // ธีมอุตสาหกรรม
    [/ดาต้าเซ็นเตอร์|ดาต้าเซนเตอร์/i, "INDUSTRY_DEMAND_CHANGE"],
    [/\bdata ?cent(er|re)\b/i, "INDUSTRY_DEMAND_CHANGE"],
    [/หม้อแปลง/i, "INDUSTRY_DEMAND_CHANGE"],
    [/\btransformer\b/i, "INDUSTRY_DEMAND_CHANGE"],
    [/ความต้องการไฟฟ้า|โครงสร้างพื้นฐานไฟฟ้า|สายส่ง/i, "INDUSTRY_DEMAND_CHANGE"],
    [/\bpower infrastructure\b|\bgrid\b|\belectricity demand\b/i, "INDUSTRY_DEMAND_CHANGE"],
    [/อุปทานตึงตัว|ขาดแคลนวัตถุดิบ|กำลังผลิตล้น/i, "INDUSTRY_SUPPLY_CHANGE"],
    [/\bsupply (shortage|glut|constraint)\b/i, "INDUSTRY_SUPPLY_CHANGE"],
  ];

  // ข้อความที่บ่งชี้ว่าเรื่องล้ม/ตรงข้าม — ต้องไม่ถูกอ่านเป็นสัญญาณบวก
  var NEGATIVE = /ยกเลิก|ล้มเหลว|เลื่อน|ชะลอ|ถอนตัว|ยุติ|ขาดทุนหนัก|ผิดนัด|เพิกถอน|ระงับ|\b(cancel(l)?ed|terminated|withdraw|postpone|delay|fail(ed)?|suspend(ed)?|revoked)\b/i;

  // ---------- helpers ----------
  function str(v) { if (v == null) return null; var s = String(v).trim(); return s.length ? s : null; }
  function isoDate(v) {
    var s = str(v);
    if (!s) return null;
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[1] + "-" + m[2] + "-" + m[3];
    m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) { if (Number(m[3]) > 2400) return null; return m[3] + "-" + m[2] + "-" + m[1]; }
    return null;
  }
  function daysBetween(a, b) {
    if (!a || !b) return null;
    var t1 = Date.parse(a + "T00:00:00Z"), t2 = Date.parse(b + "T00:00:00Z");
    if (isNaN(t1) || isNaN(t2)) return null;
    return Math.round((t2 - t1) / 86400000);
  }

  // ---------- §5 ระบุ ticker แบบอนุรักษ์นิยม ----------
  // ปัญหาจริง: ticker ไทยสั้น ๆ ชนกับคำทั่วไป (M, A, B, AS, IT, SO, DO, TU, ONE, PLUS, STAR)
  // กฎ: ต้องมี "เครื่องหมายบ่งชี้" ชัดเจน มิฉะนั้นคืน UNKNOWN
  //   • อยู่ในวงเล็บ: (TRT)
  //   • มี .BK ต่อท้าย
  //   • นำหน้าด้วยคำบ่งชี้: หุ้น TRT / บมจ. TRT / ticker TRT / $TRT / #TRT
  //   • ticker ยาว >= 3 ตัวและอยู่โดด ๆ เป็นตัวพิมพ์ใหญ่ ในข้อความที่พูดถึงหุ้นชัดเจน
  // ticker ยาว 1-2 ตัว ต้องมีเครื่องหมายเท่านั้น ห้ามรับจากการอยู่โดด ๆ
  // วงเล็บถูกลดความน่าเชื่อถือลง: ใช้ได้เฉพาะเมื่อ ticker อยู่ต้นพาดหัวหรือหลังคำ "หุ้น/บมจ."
  // เพราะเนื้อข่าวมักใส่วงเล็บ ticker ของสถาบันที่ให้ความเห็น
  var TICKER_MARKERS = [
    { re: /\(([A-Z][A-Z0-9&.-]{0,11})\)/g, strong: true, needSubject: true },
    { re: /\b([A-Z][A-Z0-9&.-]{0,11})\.BK\b/g, strong: true },
    { re: /(?:หุ้น|บมจ\.?|บริษัท|ticker|symbol)\s*[:：]?\s*([A-Z][A-Z0-9&.-]{0,11})\b/g, strong: true },
    { re: /[$#]([A-Z][A-Z0-9&.-]{0,11})\b/g, strong: true },
  ];

  // ticker ที่สะกดตรงกับคำอังกฤษ/คำย่อที่พบทั่วไปในข่าวการเงินไทย
  // ตัวเหล่านี้ "เป็น ticker จริง" แต่ในข้อความมักหมายถึงคำธรรมดา
  // จึงยอมรับได้เฉพาะเมื่อมีเครื่องหมายบ่งชี้ชัด — ไม่ยอมรับจากการอยู่โดด ๆ
  var NEEDS_STRONG_MARKER = {
    AI: 1, NEW: 1, IT: 1, SO: 1, DO: 1, ONE: 1, ALL: 1, TOP: 1, BIG: 1, PLUS: 1, STAR: 1,
    GO: 1, UP: 1, US: 1, EU: 1, SET: 1, MAI: 1, ESG: 1, IPO: 1, NVDR: 1, REIT: 1, ETF: 1,
    GDP: 1, FED: 1, CPI: 1, PMI: 1, THB: 1, USD: 1, EPS: 1, ROE: 1, MOU: 1, EV: 1, ASP: 1,
    NET: 1, WIN: 1, BEST: 1, GRAND: 1, PRIME: 1, SMART: 1, SUPER: 1, MASTER: 1, MODERN: 1,
    ECF: 1, TEAM: 1, PROUD: 1, ROJNA: 1, WAVE: 1, WORK: 1, MORE: 1, MILL: 1, PLAN: 1, PIN: 1,
  };
  // ชื่อที่เป็นทั้ง ticker และผู้ให้ความเห็น — ถ้าตามด้วยคำเหล่านี้ แปลว่าเป็น "ผู้พูด" ไม่ใช่ "เรื่อง"
  var ANALYST_CONTEXT = /^\s*(financial markets|securities|research|asset management|หลักทรัพย์|ประเมิน|มอง|คาด|ชี้|แนะ|ระบุ|เผย|วิเคราะห์)/i;
  var ANALYST_PREFIX = /(บล\.|บลจ\.|โบรก|ธนาคาร|ฝ่ายวิจัย|นักวิเคราะห์)\s*$/i;

  // แยก token ที่ต่อกันด้วยขีด/สแลช (BDMS-CPALL, TMT-HANA-SUSCO) ให้เห็นว่ามีหลายตัว
  function candidateTokens(text) {
    return String(text || "")
      .replace(/[\/,]/g, " ")
      .split(/\s+/)
      .reduce(function (acc, w) {
        // ตัดขีดออกเป็นชิ้น ๆ แต่คง ticker ที่มีขีดในตัวเอง (มีน้อยมาก) ไว้เป็นตัวเลือกด้วย
        if (/^[A-Z][A-Z0-9&.]*(-[A-Z][A-Z0-9&.]*)+$/.test(w)) {
          acc.push(w);
          w.split("-").forEach(function (part) { acc.push(part); });
        } else acc.push(w);
        return acc;
      }, [])
      .map(function (w) { return w.toUpperCase().replace(/[^A-Z0-9&.-]/g, "").replace(/\.$/, ""); })
      .filter(Boolean);
  }

  // ticker อยู่ในตำแหน่ง "ประธาน" ของข้อความหรือไม่ (§5)
  //
  // เหตุผลจากข้อมูลจริง: พาดหัวข่าวหุ้นไทยมักอ้างชื่อผู้ให้ความเห็น ซึ่งเองก็เป็นบริษัทจดทะเบียน
  //   "ปิติ ฟันธงเศรษฐกิจไทย..."                → TTB (นักเศรษฐศาสตร์ของ TTB) ไม่ใช่เรื่องของ TTB
  //   "กัณฑรา ชี้ฟันด์โฟลว์ แนะ ชู GULF-ADVANC"  → KBANK ไม่ใช่เรื่องของ KBANK
  //   "FSS แนะ ซื้อ SEAFCO"                     → เรื่องของ SEAFCO ไม่ใช่ FSS
  // การผูกเรื่องเข้าหุ้นผิดตัวคือความผิดพลาดที่ร้ายแรงที่สุดของระบบนี้
  // จึงเลือกความแม่นก่อนความครอบคลุม — ไม่ผ่านเกณฑ์นี้ = UNKNOWN
  var LEAD_IN_QUOTES = " \t\"'\u201c\u2018[(";           // อักขระที่ยอมให้นำหน้าได้
  var SUBJECT_VERBS = ["แนะ", "ชู", "มอง", "เชียร์", "เคาะ", "ลุ้น", "จับตา", "เป้า"];

  // ข้ามคำนำหน้าที่ไม่ใช่เนื้อความ: อิโมจิ/เครื่องหมาย/ตัวเลข และป้ายกำกับ ASCII + : หรือ |
  // ห้ามข้ามอักษรไทย — คำไทยนำหน้าหมายความว่าประธานของเรื่องเป็นอย่างอื่น
  function skipPrefix(t) {
    var i = 0;
    // อักขระที่ข้ามได้: ช่องว่าง เครื่องหมาย ตัวเลข อิโมจิ (ไม่ใช่อักษรไทยและไม่ใช่ A-Z)
    while (i < t.length) {
      var ch = t.charAt(i);
      if (/[A-Za-z\u0E00-\u0E7F]/.test(ch)) break;
      i++;
    }
    // ป้ายกำกับ ASCII ตัวพิมพ์ใหญ่ที่ตามด้วย : หรือ | เช่น "DEEPDIVE : ", "UPDATE | "
    var rest = t.slice(i);
    var lab = rest.match(/^([A-Z][A-Z0-9 _-]{1,18})\s*[:|]\s*/);
    if (lab) {
      i += lab[0].length;
      // ข้ามอักขระที่ไม่ใช่ตัวอักษรอีกรอบ (เช่น อิโมจิหลังป้ายกำกับ)
      while (i < t.length && !/[A-Za-z\u0E00-\u0E7F]/.test(t.charAt(i))) i++;
    }
    return i;
  }

  function isSubjectPosition(text, tok) {
    var t = String(text || "");
    // (1) อยู่ต้นข้อความ — ข้ามอักขระ/ป้ายกำกับนำหน้าที่ยอมรับได้ก่อน
    var i = skipPrefix(t);
    while (i < t.length && LEAD_IN_QUOTES.indexOf(t.charAt(i)) >= 0) i++;
    if (t.substr(i, tok.length) === tok) {
      var after = t.charAt(i + tok.length);
      if (!after || !/[A-Z0-9]/.test(after)) return true;
    }
    // ตัดกฎ "ชู/แนะ + ticker" ออกโดยเจตนา — มันปล่อยรายชื่อหุ้นแนะนำหลายตัวเข้ามา
    // ("ชู BDMS-CPALL", "ชู DELTA-HANA-SCC") ซึ่งไม่ใช่เรื่องของหุ้นตัวใดตัวหนึ่ง
    return false;
  }

  function extractTickers(text, universe, opts) {
    opts = opts || {};
    var t = String(text == null ? "" : text);
    var known = universe && universe.length ? universe : null;
    var inUni = function (s) { return known ? known.indexOf(s) >= 0 : false; };
    var found = {}, weak = {};

    TICKER_MARKERS.forEach(function (m) {
      var re = new RegExp(m.re.source, m.re.flags);
      var mm;
      while ((mm = re.exec(t)) !== null) {
        var cand = mm[1].toUpperCase().replace(/\.$/, "");
        if (!cand) continue;
        if (known && !inUni(cand)) continue;   // ไม่อยู่ในทะเบียน = ไม่รับ
        if (m.needSubject && !isSubjectPosition(t, cand)) continue;
        found[cand] = true;
      }
    });

    // ตัวพิมพ์ใหญ่โดด ๆ ยาว >= 3 → หลักฐานอ่อน ต้องมีบริบทหุ้นในข้อความด้วย
    // บริบทหุ้น: มาจากข้อความเอง หรือแหล่งประกาศมา
    // (เว็บบอร์ดหุ้น/เว็บข่าวหุ้น = ทั้งเว็บอยู่ในบริบทหุ้นอยู่แล้ว ไม่ต้องมีคำว่า "หุ้น" ในพาดหัว)
    var stockContext = opts.assumeStockContext === true ||
      /หุ้น|ตลาดหลักทรัพย์|\bSET\b|\bmai\b|บมจ|นักลงทุน|ราคาหุ้น|งบ|ไตรมาส/i.test(t);
    if (stockContext && known) {
      candidateTokens(t).forEach(function (c) {
        if (c.length < 3) return;              // 1-2 ตัวอักษรต้องมีเครื่องหมายเท่านั้น
        if (found[c] || !inUni(c)) return;
        if (NEEDS_STRONG_MARKER[c]) return;    // คำกำกวม — ต้องมีเครื่องหมายชัด
        // ต่อด้วยขีดแล้วเป็นคำ (AI-ชิป, EV-Car) = เป็นส่วนของวลี ไม่ใช่ ticker
        // หรือตามด้วยคำอังกฤษขึ้นต้นตัวใหญ่ตามด้วยตัวเล็ก (New Economy) = ชื่อเฉพาะ ไม่ใช่ ticker
        var pos = t.indexOf(c);
        if (pos >= 0) {
          var tail = t.slice(pos + c.length, pos + c.length + 24);
          if (/^-\S/.test(tail)) return;
          if (/^\s+[A-Z][a-z]{2,}/.test(tail)) return;
        }
        // ต้องเป็นประธานของข้อความ มิฉะนั้นอาจเป็นชื่อผู้ให้ความเห็น/หุ้นที่ถูกกล่าวถึงผ่าน ๆ
        if (!isSubjectPosition(t, c)) return;
        // กันชื่อโบรก/ธนาคารที่เป็น ticker ด้วย: ดูคำที่อยู่รอบ ๆ
        var at = t.indexOf(c);
        if (at >= 0) {
          var after = t.slice(at + c.length, at + c.length + 30);
          var before = t.slice(Math.max(0, at - 14), at);
          if (ANALYST_CONTEXT.test(after) || ANALYST_PREFIX.test(before)) return;
        }
        weak[c] = true;
      });
    }

    var strong = Object.keys(found);
    var weakList = Object.keys(weak);

    if (strong.length === 1) return { ticker: strong[0], confidence: "STRONG", candidates: strong, note: null };
    if (strong.length > 1) {
      return { ticker: "UNKNOWN", confidence: "AMBIGUOUS", candidates: strong,
        note: "พบหลาย ticker ที่มีเครื่องหมายบ่งชี้ (" + strong.join(", ") + ") — ระบบไม่เลือกให้" };
    }
    // ไม่มีตัวที่มีเครื่องหมาย: รับตัวอ่อนได้ก็ต่อเมื่อมีตัวเดียวจริง ๆ
    if (weakList.length === 1 && opts.allowWeakSingle !== false) {
      return { ticker: weakList[0], confidence: "WEAK", candidates: weakList,
        note: "จับจากตัวพิมพ์ใหญ่โดด ๆ ในบริบทหุ้น — ยังไม่ยืนยัน ควรตรวจกับแหล่งปฐมภูมิ" };
    }
    if (weakList.length > 1) {
      return { ticker: "UNKNOWN", confidence: "AMBIGUOUS", candidates: weakList,
        note: "พาดหัวพูดถึงหลายหุ้น (" + weakList.slice(0, 6).join(", ") + ") — ไม่ใช่เรื่องของตัวใดตัวหนึ่ง" };
    }
    return { ticker: "UNKNOWN", confidence: "NONE", candidates: [],
      note: "ไม่พบ ticker ที่ระบุได้" };
  }

  // ---------- §7 ตรวจคำค้น → สัญญาณค้นพบ ----------
  function detectSignals(text) {
    var t = String(text == null ? "" : text);
    if (!t.trim()) return { keywords: [], eventTypes: [], negative: false };
    var kws = [], types = {};
    KEYWORDS.forEach(function (k) {
      var m = t.match(k[0]);
      if (m) { kws.push(m[0]); types[k[1]] = true; }
    });
    return { keywords: kws, eventTypes: Object.keys(types), negative: NEGATIVE.test(t) };
  }

  // ============================================================
  // §5 DiscoveryEvent — โครงสร้างมาตรฐานของสัญญาณค้นพบ
  // ฟิลด์ที่ไม่รู้ = null เสมอ ห้ามเดา ห้ามแต่ง URL (§27)
  // ============================================================
  var STALE_DAYS_DEFAULT = 120;

  function normalizeDiscovery(raw, ctx) {
    ctx = ctx || {};
    var em = EM();
    var out = {
      id: str(raw && raw.id),
      ticker: null,
      companyName: str(raw && raw.companyName),
      eventDate: isoDate(raw && raw.eventDate),
      publishedAt: isoDate(raw && raw.publishedAt),
      retrievedAt: isoDate(raw && raw.retrievedAt) || isoDate(ctx.now),
      sourceType: null,
      sourceTier: null,
      sourceName: str(raw && raw.sourceName),
      sourceUrl: str(raw && raw.sourceUrl),     // §27 ไม่มีก็ null ห้ามแต่ง
      title: str(raw && raw.title),
      summary: str(raw && raw.summary),
      rawClaim: str(raw && raw.rawClaim) || str(raw && raw.title),
      keywords: [],
      eventTypes: [],
      potentialCatalystCategory: [],
      potentialImpact: str(raw && raw.potentialImpact),
      confidence: null,
      verificationStatus: null,
      tickerConfidence: null,
      stale: null,
      staleDays: null,
      negativeTone: false,
      rejected: null,
      notes: [],
    };

    // ---- แหล่งและ tier (นิยามมาจาก evidence-model ที่เดียว) ----
    var stKey = String((raw && raw.sourceType) || "").toUpperCase();
    if (em && em.SOURCE_TYPES[stKey]) {
      out.sourceType = stKey;
      out.sourceTier = em.TIERS[em.SOURCE_TYPES[stKey].tier].key;
    } else {
      out.sourceType = "OTHER";
      out.sourceTier = em ? em.TIERS[4].key : "TIER_4";
      if (stKey) out.notes.push("ไม่รู้จักแหล่ง \"" + stKey + "\" — จัดเป็น OTHER (TIER 4)");
    }

    // ---- ticker: รับที่ระบุมาถ้าอยู่ในทะเบียน มิฉะนั้นสกัดจากข้อความ ----
    var declared = str(raw && raw.ticker);
    var uni = ctx.universe || null;
    if (declared) {
      var up = declared.toUpperCase();
      if (!uni || uni.indexOf(up) >= 0) { out.ticker = up; out.tickerConfidence = "DECLARED"; }
      else {
        out.ticker = "UNKNOWN"; out.tickerConfidence = "NONE";
        out.notes.push("ticker \"" + up + "\" ไม่อยู่ในทะเบียน SET/mai — ไม่รับ");
      }
    } else {
      // สกัดจาก "พาดหัวเท่านั้น" — เนื้อข่าว/excerpt มักมี ticker ของสถาบันที่ให้ความเห็น
      // ทำให้ผูกเรื่องผิดตัว (วัดจากข้อมูลจริง: KResearch → KBANK, บทวิเคราะห์ AI → หุ้น AI)
      var ex = extractTickers(out.title || out.rawClaim || "", uni,
        { assumeStockContext: ctx.assumeStockContext === true, allowWeakSingle: ctx.allowWeakSingle });
      out.ticker = ex.ticker;
      out.tickerConfidence = ex.confidence;
      if (ex.note) out.notes.push(ex.note);
    }

    // ---- §7 สัญญาณจากคำค้น (ค้นพบเท่านั้น ไม่ใช่หลักฐาน) ----
    var sig = detectSignals([out.title, out.summary, out.rawClaim].filter(Boolean).join(" \n "));
    out.keywords = sig.keywords;
    out.negativeTone = sig.negative;
    var declaredTypes = Array.isArray(raw && raw.eventTypes) ? raw.eventTypes
      : (raw && raw.eventType ? [raw.eventType] : []);
    var types = {};
    declaredTypes.forEach(function (k) { var K = String(k).toUpperCase(); if (eventTypeInfo(K)) types[K] = true; });
    sig.eventTypes.forEach(function (k) { types[k] = true; });
    out.eventTypes = Object.keys(types);
    if (!out.eventTypes.length) {
      out.eventTypes = ["OTHER"];
      out.notes.push("ไม่พบคำค้นที่บ่งชี้ประเภทเหตุการณ์ — ระบบไม่เดาประเภท");
    }

    // ---- §6 หมวด: มาจากตารางเท่านั้น ----
    var cats = {};
    out.eventTypes.forEach(function (k) {
      var info = eventTypeInfo(k);
      (info && info.cats ? info.cats : []).forEach(function (c) { cats[c] = true; });
    });
    out.potentialCatalystCategory = Object.keys(cats);

    // ---- §5 confidence: ตัวเลขจากผู้ป้อนเท่านั้น ไม่มีก็ null ----
    var c = raw && raw.confidence;
    out.confidence = typeof c === "number" && isFinite(c) && c >= 0 && c <= 1 ? c : null;

    // ---- verificationStatus: แหล่งค้นพบเริ่มที่ UNVERIFIED เสมอ ----
    var vs = String((raw && raw.verificationStatus) || "").toUpperCase();
    out.verificationStatus = VERIFICATION[vs] ? vs : VERIFICATION.UNVERIFIED.key;
    if (em && em.isPrimaryTier && em.SOURCE_TYPES[out.sourceType] &&
        em.isPrimaryTier(em.SOURCE_TYPES[out.sourceType].tier) && !VERIFICATION[vs]) {
      // แหล่งปฐมภูมิถือว่าตรวจแล้วบางส่วน (ไปเข้าระนาบหลักฐานต่อ)
      out.verificationStatus = VERIFICATION.PARTIALLY_VERIFIED.key;
    }

    // ---- §26 ความสดใหม่: ของเก่าห้ามกลายเป็นสัญญาณใหม่ ----
    var asOf = isoDate(ctx.asOf) || out.retrievedAt;
    var refDate = out.publishedAt || out.eventDate;
    if (refDate && asOf) {
      var d = daysBetween(refDate, asOf);
      out.staleDays = d;
      var limit = typeof ctx.staleDays === "number" ? ctx.staleDays : STALE_DAYS_DEFAULT;
      out.stale = d != null && d > limit;
      if (out.stale) out.notes.push("เนื้อหาเก่ากว่า " + limit + " วัน (" + d + " วัน) — ไม่ถือเป็นสัญญาณใหม่");
      if (d != null && d < 0) out.notes.push("วันที่อยู่ในอนาคต — ข้อมูลน่าสงสัย");
    }

    // ---- ความสมบูรณ์ ----
    if (!out.title && !out.rawClaim) out.rejected = "ไม่มีหัวข้อหรือข้อความอ้าง";
    else if (!out.publishedAt && !out.eventDate) out.rejected = "ไม่มีวันที่เผยแพร่หรือวันที่เหตุการณ์ (ห้ามเดาวันที่)";
    else if (out.ticker === "UNKNOWN") out.notes.push("ยังระบุหุ้นไม่ได้ — เก็บเป็นสัญญาณระดับอุตสาหกรรม/ยังไม่จัดเข้าหุ้นใด");
    if (!out.sourceUrl) out.notes.push("ไม่มีลิงก์ต้นทาง — ตรวจสอบย้อนหลังไม่ได้");
    return out;
  }

  function isUsableDiscovery(d) { return !!(d && !d.rejected); }

  // ============================================================
  // §25 จัดกลุ่มสัญญาณที่พูดเรื่องเดียวกัน
  // ห้าม dedupe ด้วย URL อย่างเดียว — ใช้ ticker + ประเภท + ความใกล้ของวันที่ + คำที่ซ้ำ
  // ============================================================
  var CLUSTER_WINDOW_DAYS = 30;

  function jaccard(a, b) {
    if (!a.length || !b.length) return 0;
    var setA = {}, inter = 0, uni = {};
    a.forEach(function (x) { setA[x] = true; uni[x] = true; });
    b.forEach(function (x) { if (setA[x]) inter++; uni[x] = true; });
    return inter / Object.keys(uni).length;
  }

  function sameStory(a, b, windowDays) {
    // ต้องเป็นหุ้นเดียวกัน (หรือทั้งคู่ยังไม่ทราบหุ้น)
    if (a.ticker !== b.ticker) return false;
    // ต้องมีประเภทเหตุการณ์ทับกันอย่างน้อยหนึ่ง
    var shared = a.eventTypes.filter(function (t) { return b.eventTypes.indexOf(t) >= 0; });
    if (!shared.length) return false;
    if (shared.length === 1 && shared[0] === "OTHER") return false;   // OTHER ไม่ถือว่าเรื่องเดียวกัน
    // ต้องอยู่ในช่วงเวลาใกล้กัน
    var da = a.publishedAt || a.eventDate, db = b.publishedAt || b.eventDate;
    var gap = daysBetween(da < db ? da : db, da < db ? db : da);
    if (gap == null || gap > (windowDays || CLUSTER_WINDOW_DAYS)) return false;
    return true;
  }

  // ============================================================
  // §8 StoryCluster + §9 LEAD / NARRATIVE_EMERGING
  // ============================================================
  function buildClusters(discoveryEvents, evidenceItems, opts) {
    opts = opts || {};
    var em = EM();
    var windowDays = typeof opts.clusterWindowDays === "number" ? opts.clusterWindowDays : CLUSTER_WINDOW_DAYS;
    var all = (discoveryEvents || []).filter(isUsableDiscovery);
    var evidence = (evidenceItems || []).filter(function (e) { return e && !e.rejected; });

    // ---- จัดกลุ่มสัญญาณค้นพบ ----
    var clusters = [];
    all.forEach(function (d) {
      for (var i = 0; i < clusters.length; i++) {
        for (var j = 0; j < clusters[i].discovery.length; j++) {
          if (sameStory(clusters[i].discovery[j], d, windowDays)) { clusters[i].discovery.push(d); return; }
        }
      }
      clusters.push({ discovery: [d], evidence: [] });
    });

    // ---- ผูกหลักฐานเข้ากลุ่มที่ตรง ticker + ประเภท ----
    var orphanEvidence = [];
    evidence.forEach(function (e) {
      var matched = false;
      for (var i = 0; i < clusters.length; i++) {
        var c = clusters[i];
        if (!c.discovery.length) continue;
        if (c.discovery[0].ticker !== e.ticker) continue;
        var typesInCluster = {};
        c.discovery.forEach(function (d) { d.eventTypes.forEach(function (t) { typesInCluster[t] = true; }); });
        if (typesInCluster[e.eventType]) { c.evidence.push(e); matched = true; break; }
      }
      if (!matched) orphanEvidence.push(e);
    });
    // หลักฐานที่ไม่มีสัญญาณค้นพบมาก่อน = กลุ่มของตัวเอง (เจอจากแหล่งปฐมภูมิโดยตรง)
    orphanEvidence.forEach(function (e) {
      for (var i = 0; i < clusters.length; i++) {
        var c = clusters[i];
        if (c.discovery.length) continue;
        if (c.evidence.length && c.evidence[0].ticker === e.ticker && c.evidence[0].eventType === e.eventType) {
          c.evidence.push(e); return;
        }
      }
      clusters.push({ discovery: [], evidence: [e] });
    });

    return clusters.map(function (c, idx) { return finalizeCluster(c, idx, opts, em); });
  }

  function finalizeCluster(c, idx, opts, em) {
    var disc = c.discovery, ev = c.evidence;
    var ticker = (disc[0] && disc[0].ticker) || (ev[0] && ev[0].ticker) || "UNKNOWN";

    // ---- §8 ความหลากหลายของแหล่ง: นับ "แหล่งที่ต่างกันจริง" ไม่ใช่จำนวนชิ้น ----
    var discSources = {}, evSources = {}, discTiers = {};
    disc.forEach(function (d) { discSources[d.sourceType] = (discSources[d.sourceType] || 0) + 1; discTiers[d.sourceTier] = true; });
    ev.forEach(function (e) { evSources[e.sourceType] = (evSources[e.sourceType] || 0) + 1; });

    var dates = disc.map(function (d) { return d.publishedAt || d.eventDate; })
      .concat(ev.map(function (e) { return e.eventDate; })).filter(Boolean).sort();

    // ---- §11 ขัดแย้งกันไหม: มีทั้งโทนบวกและโทนลบเรื่องเดียวกัน ----
    var pos = disc.filter(function (d) { return !d.negativeTone; }).length;
    var neg = disc.filter(function (d) { return d.negativeTone; }).length;
    var conflicting = pos > 0 && neg > 0;

    // ---- ขั้นของ catalyst: มาจากระนาบหลักฐานเท่านั้น (§12) ----
    var evStage = null, evStageObj = null;
    if (ev.length && em) {
      var derived = em.deriveStage(ev, opts.marketRecognized === true);
      evStageObj = derived.stage;
      evStage = derived.stage.key;
    }

    // ---- §9 ขั้นของระนาบค้นพบ ----
    var fresh = disc.filter(function (d) { return d.stale !== true; });
    var freshSourceTypes = {};
    fresh.forEach(function (d) { freshSourceTypes[d.sourceType] = true; });
    var independentFresh = Object.keys(freshSourceTypes).length;

    var discStage = DISCOVERY_STAGE.NONE;
    if (conflicting) discStage = DISCOVERY_STAGE.CONFLICTING_EVIDENCE;
    else if (independentFresh >= 2) discStage = DISCOVERY_STAGE.NARRATIVE_EMERGING;
    else if (fresh.length >= 1) discStage = DISCOVERY_STAGE.LEAD;

    // ---- สถานะรวมที่แสดง: หลักฐานชนะการค้นพบเสมอ ----
    var stageKey, stageLabel, stageSource;
    if (evStage && evStageObj && evStageObj.n >= 1) {
      stageKey = evStage; stageLabel = evStage; stageSource = "EVIDENCE";
    } else if (discStage.key !== "NONE") {
      stageKey = discStage.key; stageLabel = discStage.label; stageSource = "DISCOVERY";
    } else if (evStage) {
      stageKey = evStage; stageLabel = evStage; stageSource = "EVIDENCE";
    } else {
      stageKey = "NONE"; stageLabel = "—"; stageSource = null;
    }

    // ---- §5 สถานะการตรวจสอบของทั้งกลุ่ม ----
    var verification;
    if (conflicting) verification = VERIFICATION.CONFLICTING.key;
    else if (ev.length && evStageObj && evStageObj.n >= 3) verification = VERIFICATION.VERIFIED.key;
    else if (ev.length) verification = VERIFICATION.PARTIALLY_VERIFIED.key;
    else verification = VERIFICATION.UNVERIFIED.key;

    // ---- storyTitle: จากหลักฐานที่แข็งสุดก่อน แล้วจึงจากสัญญาณค้นพบ ----
    var title = null;
    if (ev.length) {
      var ranked = ev.slice().sort(function (a, b) {
        var sa = em && em.STRENGTH[a.evidenceStrength] ? em.STRENGTH[a.evidenceStrength].n : 0;
        var sb = em && em.STRENGTH[b.evidenceStrength] ? em.STRENGTH[b.evidenceStrength].n : 0;
        return sb - sa;
      });
      title = ranked[0].title;
    } else if (disc.length) {
      title = (fresh[0] || disc[0]).title || (fresh[0] || disc[0]).rawClaim;
    }

    var cats = {};
    disc.forEach(function (d) { (d.potentialCatalystCategory || []).forEach(function (k) { cats[k] = true; }); });
    ev.forEach(function (e) { (e.catalystCategory || []).forEach(function (k) { cats[k] = true; }); });

    // ---- §21 ไทม์ไลน์รวมทั้งการค้นพบและหลักฐาน เรียงเวลา ไม่ลบของเก่า ----
    var timeline = disc.map(function (d) {
      return { kind: "DISCOVERY", date: d.publishedAt || d.eventDate, title: d.title || d.rawClaim,
        sourceType: d.sourceType, sourceTier: d.sourceTier, sourceName: d.sourceName, url: d.sourceUrl,
        stage: d.negativeTone ? "CONFLICTING" : "LEAD", eventTypes: d.eventTypes,
        stale: d.stale === true, verification: d.verificationStatus };
    }).concat(ev.map(function (e) {
      return { kind: "EVIDENCE", date: e.eventDate, title: e.title, sourceType: e.sourceType,
        sourceTier: e.sourceTier, sourceName: e.sourceName, url: e.sourceUrl,
        stage: e.evidenceStrength, eventTypes: [e.eventType], stale: false, verification: e.status };
    })).sort(function (a, b) {
      if (a.date === b.date) return 0;
      return String(a.date) < String(b.date) ? -1 : 1;
    });

    return {
      clusterId: "c" + (idx + 1) + ":" + ticker,
      ticker: ticker,
      storyTitle: title,
      storyCategory: Object.keys(cats),
      firstDetectedDate: dates[0] || null,
      latestDetectedDate: dates[dates.length - 1] || null,
      discoverySources: Object.keys(discSources).map(function (k) { return { sourceType: k, count: discSources[k] }; }),
      evidenceSources: Object.keys(evSources).map(function (k) { return { sourceType: k, count: evSources[k] }; }),
      eventIds: disc.map(function (d) { return d.id; }).filter(Boolean),
      discoveryEvents: disc,
      evidenceItems: ev,
      sourceCount: disc.length + ev.length,
      sourceDiversity: Object.keys(discSources).length + Object.keys(evSources).length,
      independentFreshSources: independentFresh,
      verificationStatus: verification,
      discoveryStage: discStage,
      catalystStage: stageKey,
      stageLabel: stageLabel,
      stageSource: stageSource,
      conflicting: conflicting,
      conflictingClaims: conflicting
        ? { positive: disc.filter(function (d) { return !d.negativeTone; }).map(claimOf),
            negative: disc.filter(function (d) { return d.negativeTone; }).map(claimOf) }
        : null,
      staleCount: disc.filter(function (d) { return d.stale === true; }).length,
      timeline: timeline,
      note: noteFor(discStage, evStage, conflicting, independentFresh, disc.length),
    };
  }

  function claimOf(d) {
    return { sourceType: d.sourceType, sourceTier: d.sourceTier, sourceName: d.sourceName,
      url: d.sourceUrl, date: d.publishedAt || d.eventDate, claim: d.rawClaim || d.title };
  }

  function noteFor(discStage, evStage, conflicting, independentFresh, discCount) {
    if (conflicting) return "แหล่งข้อมูลขัดแย้งกัน — ระบบไม่ยกระดับและไม่เลือกด้านบวกให้เอง";
    if (evStage) return "มีหลักฐานปฐมภูมิแล้ว — ขั้นของ catalyst มาจากหลักฐาน ไม่ใช่จำนวนแหล่งค้นพบ";
    if (discStage.key === "NARRATIVE_EMERGING") {
      return independentFresh + " แหล่งอิสระพูดเรื่องเดียวกัน แต่ยังไม่มีหลักฐานปฐมภูมิ — ยังไม่ใช่ catalyst ที่ยืนยันได้";
    }
    if (discStage.key === "LEAD") return "เบาะแสเดียว ยังไม่มีการยืนยัน — ต้องไปหาเอกสารปฐมภูมิ";
    if (discCount) return "สัญญาณที่มีทั้งหมดเก่าเกินเกณฑ์ — ไม่ถือเป็นเบาะแสใหม่";
    return null;
  }

  var DiscoveryPlane = {
    VERSION: VERSION,
    VERIFICATION: VERIFICATION,
    DISCOVERY_STAGE: DISCOVERY_STAGE,
    DISCOVERY_ONLY_TYPES: DISCOVERY_ONLY_TYPES,
    KEYWORDS: KEYWORDS,
    STALE_DAYS_DEFAULT: STALE_DAYS_DEFAULT,
    CLUSTER_WINDOW_DAYS: CLUSTER_WINDOW_DAYS,
    normalizeDiscovery: normalizeDiscovery,
    isUsableDiscovery: isUsableDiscovery,
    extractTickers: extractTickers,
    detectSignals: detectSignals,
    buildClusters: buildClusters,
    allEventTypes: allEventTypes,
    eventTypeInfo: eventTypeInfo,
    _internal: { sameStory: sameStory, jaccard: jaccard, isoDate: isoDate, daysBetween: daysBetween,
      NEGATIVE: NEGATIVE, candidateTokens: candidateTokens, ANALYST_CONTEXT: ANALYST_CONTEXT,
      ANALYST_PREFIX: ANALYST_PREFIX, isSubjectPosition: isSubjectPosition,
      NEEDS_STRONG_MARKER: NEEDS_STRONG_MARKER, skipPrefix: skipPrefix },
  };

  if (typeof window !== "undefined") window.DiscoveryPlane = DiscoveryPlane;
  if (typeof module !== "undefined" && module.exports) module.exports = DiscoveryPlane;
})();
