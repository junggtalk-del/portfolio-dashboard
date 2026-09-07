(function () {
  "use strict";
  // ============================================================
  // EVIDENCE CLASSIFIER — แปลงหัวข้อข้อมูลเผยแพร่ของ SET เป็นประเภทเหตุการณ์
  //
  // กฎเหล็ก:
  //  • deterministic ล้วน — regex บนข้อความ ไม่มี LLM ตอน runtime
  //  • เข้มงวดกว่าครอบคลุม: จับไม่ชัด = UNKNOWN ห้ามเดา
  //    (false positive แพงกว่ามาก — มันจะสร้าง "catalyst" ที่ไม่มีอยู่จริง)
  //  • ราคาไม่เกี่ยวข้องที่นี่เลย ไฟล์นี้เห็นแค่ข้อความ
  //  • หัวข้อที่เป็นรายการประจำ (งบ/ปันผล/ประชุม/ซื้อหุ้นคืน) ถูกจัดเป็น ROUTINE
  //    เพื่อให้ระบบพูดได้ว่า "ตรวจแล้วไม่พบ catalyst" อย่างซื่อสัตย์
  //
  // ฐานข้อมูลที่ใช้ออกแบบกฎ: ข้อมูลเผยแพร่จริง 61,409 รายการ (SET+mai 868 ตัว, 2 ปี)
  // สัดส่วนที่วัดได้: งบการเงิน 36% · ประชุมผู้ถือหุ้น/บอร์ด 17% · ซื้อหุ้นคืน 8.8%
  //   · ปันผล 5.2% · เปลี่ยนผู้บริหาร 2.7% · ซื้อ/ขายสินทรัพย์ 1.6%
  //   · เหตุการณ์ธุรกิจที่เป็น catalyst ได้จริง ~2%
  //
  // ข้อจำกัดที่รู้ตัวและบันทึกไว้:
  //  ก) หัวข้อเดียวมักพูดหลายเรื่องรวมกัน เช่น
  //     "...increase of registered capital, list of acquisition and disposal of assets"
  //     ระบบจัดตามกฎที่ตรงก่อน (deterministic) แต่เก็บ allMatches ไว้ให้ตรวจย้อนหลังได้
  //  ข) มีหัวข้อ "Progress Report on..." ของเรื่องเดียวกันหลายครั้ง — นับเป็นหลายหลักฐาน
  //     ระดับ story จะเลือกชิ้นที่แข็งสุด/ใหม่สุดเป็นตัวแทน จึงไม่ทำให้ขั้นเพี้ยน
  //  ค) หัวข้อไม่มีตัวเลข จึงยืนยัน C4 (revenue/EPS/margin/FCF) ไม่ได้เลย
  // ============================================================

  var VERSION = "1.0.0";

  // ---------- 1) รายการประจำ: ตรวจก่อนเสมอ ----------
  // ถ้าเข้าอันใดอันหนึ่ง = ไม่ใช่ catalyst แน่นอน (ไม่ใช่ "ไม่รู้")
  var ROUTINE = [
    [/^financial (statement|performance)\b/i, "งบการเงินตามรอบ"],
    [/^operating result\b/i, "ผลดำเนินงานตามรอบ"],
    [/^management discussion and analysis\b/i, "คำอธิบายของฝ่ายจัดการ"],
    [/\b(share|shares|treasury stock)s? repurchase(d)?\b|\brepurchase of shares\b|\bdistribution of repurchased shares\b/i, "รายงานซื้อหุ้นคืน"],
    [/^(interim )?dividend payment\b|\bomission of dividend\b/i, "ปันผล"],
    [/\b(annual general meeting|extraordinary general meeting|agm|egm)\b.*\b(minutes|invitation|notice|publication|convening|disclosure)\b/i, "เอกสารประชุมผู้ถือหุ้น"],
    [/^(publication|disclosure) of the (minutes|invitation|notice)\b/i, "เผยแพร่เอกสารประชุม"],
    [/\bshareholders meeting'?s? resolution\b/i, "มติที่ประชุมผู้ถือหุ้น"],
    [/\b(company'?s )?holidays for the year\b|\bannual holidays\b|\bpublic holidays\b/i, "วันหยุด"],
    [/\bform to report on names of members and scope of work of the audit committee\b/i, "รายงานคณะกรรมการตรวจสอบ"],
    [/\b(notification convening date of|report of) the public presentation\b/i, "งานพบนักลงทุน (แจ้งกำหนดการ)"],
    [/\bnet asset value\b|\breport nav\b|^report nav\b/i, "มูลค่าทรัพย์สินสุทธิ"],
    [/\breport on the results of the exercise\b|\bexercise of (prg-)?w\d|\bconvertible debentures\b/i, "ผลการใช้สิทธิ"],
    [/\bregistration of paid-?up capital\b/i, "จดทะเบียนทุนชำระแล้ว"],
    [/\bcb sign\b|\bsp sign\b|\bnp sign\b|\bmarket surveillance measure\b|\bfree float\b/i, "ป้ายเตือน/มาตรการกำกับ"],
    [/\btrading (halt|suspension)\b/i, "พักการซื้อขาย"],
    [/\bclarification of news or information requested by set\b/i, "ชี้แจงตามที่ตลาดขอ"],
    [/\bcredit rating\b/i, "อันดับเครดิต"],
    [/\butilization of proceeds\b/i, "รายงานการใช้เงิน"],
  ];

  // ---------- 2) เหตุการณ์ที่เป็น catalyst ได้ ----------
  // แต่ละกฎ: [regex, eventType, ระดับความแข็งสูงสุดที่หัวข้อนี้ยืนยันได้, คำอธิบาย]
  // "ระดับที่หัวข้อยืนยันได้" ต่างจาก "ระดับที่ผู้ป้อนอ้าง" — หัวข้อลำพังยืนยันได้จำกัด
  var RULES = [
    // --- C3: ยืนยันแล้วว่าเกิดขึ้นจริง (ภาษาบอกผลลัพธ์ ไม่ใช่แผน) ---
    [/\bnotifica?tion of (the )?project awarded\b|\bproject awarded\b|\bbeing awarded of\b|\bawarded (the )?(contract|project|bid)\b|\bwinning the bid\b|\bsuccessful bidder\b/i,
      "GOVERNMENT_PROJECT", "C3_CONFIRMED_EVENT", "ได้รับงาน/ชนะประมูลแล้ว"],
    [/\bcommercial operation\b(?!.*\bdelay)/i,
      "CAPACITY_EXPANSION", "C3_CONFIRMED_EVENT", "เริ่มดำเนินการเชิงพาณิชย์แล้ว"],
    [/\b(signing|execution|entering into) of (a |the )?(power purchase|sale and purchase|service|construction|supply|concession|lease)\s*agreement\b|\bsigned (a |the )?(contract|agreement)\b|\bentered into (a |the )?(contract|agreement)\b/i,
      "NEW_CONTRACT", "C3_CONFIRMED_EVENT", "ลงนามสัญญาแล้ว"],
    [/\bacquisition of the .{0,40}\blicen[cs]e\b|\bobtained (a |the )?(licen[cs]e|permit|concession)\b|\bgranted (a |the )?(licen[cs]e|concession)\b/i,
      "LICENSE", "C3_CONFIRMED_EVENT", "ได้รับใบอนุญาต/สัมปทานแล้ว"],
    [/\bcompletion of the (acquisition|disposal|divestment|sale)\b|\bcompleted the (acquisition|disposal|sale)\b/i,
      "ASSET_SALE", "C3_CONFIRMED_EVENT", "ทำรายการเสร็จแล้ว"],

    // --- C2: ประกาศ/มติอย่างเป็นทางการ (เกิดจริงหรือยังต้องรอ) ---
    [/\btender offer\b|\bform 247\b/i, "TENDER_OFFER", "C2_OFFICIAL_ANNOUNCEMENT", "คำเสนอซื้อหลักทรัพย์"],
    [/\bjoint venture\b|\bestablishment of (a )?joint venture\b/i, "JV", "C2_OFFICIAL_ANNOUNCEMENT", "ร่วมทุน"],
    [/\bestablishment of (a )?new subsidiary\b|\bregistration of (a )?new subsidiary\b|\bincorporation of (a )?(new )?subsidiary\b/i,
      "SUBSIDIARY_EVENT", "C2_OFFICIAL_ANNOUNCEMENT", "ตั้งบริษัทย่อยใหม่"],
    [/\b(disposal|divestment|sale) of (the )?(shares?|shareholding|investment|assets?|land|ordinary shares)\b|\bdivestment\b/i,
      "ASSET_SALE", "C2_OFFICIAL_ANNOUNCEMENT", "ขายสินทรัพย์/เงินลงทุน"],
    [/\bacquisition of (the )?(shares?|ordinary shares|business|assets?)\b|\bacquire (the )?(shares?|business|assets?)\b/i,
      "STRATEGIC_INVESTMENT", "C2_OFFICIAL_ANNOUNCEMENT", "เข้าซื้อกิจการ/สินทรัพย์"],
    [/\binvestment (project|in)\b|\bapproval in principle on the investment\b|\bprogress on investment\b/i,
      "STRATEGIC_INVESTMENT", "C2_OFFICIAL_ANNOUNCEMENT", "โครงการลงทุน"],
    [/\bcapacity expansion\b|\bexpansion project\b|\bnew (plant|factory|production line)\b|\bproduction machine\b/i,
      "CAPACITY_EXPANSION", "C2_OFFICIAL_ANNOUNCEMENT", "ขยายกำลังผลิต"],
    [/\bnew business (plan|direction)\b|\bbusiness restructuring\b/i,
      "BUSINESS_PIVOT", "C2_OFFICIAL_ANNOUNCEMENT", "แผนธุรกิจใหม่/ปรับโครงสร้างธุรกิจ"],
    [/\bdebt restructuring\b|\brehabilitation plan\b/i, "DEBT_RESTRUCTURING", "C2_OFFICIAL_ANNOUNCEMENT", "ปรับโครงสร้างหนี้"],
    [/\bcapital (increase|restructuring|reduction)\b|\brights offering\b|\bprivate placement\b/i,
      "CAPITAL_RESTRUCTURING", "C2_OFFICIAL_ANNOUNCEMENT", "ปรับโครงสร้างทุน"],
    [/\bmemorandum of understanding\b|\bmou\b/i, "NEW_CONTRACT", "C2_OFFICIAL_ANNOUNCEMENT", "บันทึกความเข้าใจ"],
    [/\bconnected transaction\b|\bacquisition or disposition of assets\b/i,
      "SUBSIDIARY_EVENT", "C2_OFFICIAL_ANNOUNCEMENT", "รายการเกี่ยวโยง/ได้มาจำหน่ายไป"],
    [/\bchange (in|of) (the )?(major )?shareholder|\binternal restructuring of major shareholders\b|\bbig lot transaction\b/i,
      "MAJOR_SHAREHOLDER_CHANGE", "C2_OFFICIAL_ANNOUNCEMENT", "ผู้ถือหุ้นใหญ่เปลี่ยน"],

    // --- ผู้บริหาร: เป็นข้อเท็จจริงที่ยืนยันแล้ว แต่ยังไม่มีกลไกเศรษฐกิจในตัวเอง ---
    [/\bresignation of (a |the )?(director|executive|chief|ceo|cfo|president)\b|\bchanging of (ceo|cfo|chief|managing director)\b/i,
      "MANAGEMENT_CHANGE", "C2_OFFICIAL_ANNOUNCEMENT", "ผู้บริหารลาออก/เปลี่ยน"],
    [/\bappointment of (a |the |new )?(director|executive|chief|ceo|cfo|managing director|president)\b|\bnew (ceo|cfo|managing director)\b/i,
      "MANAGEMENT_CHANGE", "C2_OFFICIAL_ANNOUNCEMENT", "แต่งตั้งผู้บริหาร"],
    [/\b(election|appointment) of (new )?directors?\b|\bchange of directors?\b/i,
      "BOARD_CHANGE", "C2_OFFICIAL_ANNOUNCEMENT", "เปลี่ยนกรรมการ"],
  ];

  // มติบอร์ด "เพื่อพิจารณา/อนุมัติในหลักการ" ยังไม่ใช่ของที่เกิดแล้ว → กดลงเป็น C2 เสมอ
  var PLAN_LANGUAGE = /\bapproval in principle\b|\bresolution(s)? (of|on)\b.*\bto (consider|approve|study)\b|\bplan(s|ned|ning)? to\b|\bintend(s|ed)? to\b|\bproposed\b|\bfeasibility\b/i;
  // ภาษาที่บอกว่าเรื่องล้ม/ยกเลิก → ต้องไม่ถูกอ่านเป็น catalyst บวก
  var NEGATIVE_LANGUAGE = /\b(termination|cancel(l)?ation|cancelled|terminated|withdraw(al|n)?|revocation|revoked|rescission|abandon)\b|\bmutual termination\b|\bdelay(ed)?\b|\bpostpone(d|ment)?\b|\bfail(ed|ure)\b/i;

  var STRENGTH_N = { C0_RUMOR: 0, C1_MANAGEMENT_STORY: 1, C2_OFFICIAL_ANNOUNCEMENT: 2, C3_CONFIRMED_EVENT: 3, C4_FINANCIAL_EVIDENCE: 4 };

  // ============================================================
  // classifyHeadline(headline) → ผลการจำแนกแบบตรวจสอบย้อนหลังได้
  // ============================================================
  function classifyHeadline(headline, opts) {
    opts = opts || {};
    var h = String(headline == null ? "" : headline).replace(/\s+/g, " ").trim();
    var out = {
      headline: h || null,
      eventType: null,
      evidenceStrength: null,
      routine: false,
      routineReason: null,
      matchedRule: null,
      negated: false,
      planOnly: false,
      classified: false,
      allMatches: [],   // กฎทั้งหมดที่ตรงกับหัวข้อนี้ — ไว้ตรวจว่าหัวข้อพูดหลายเรื่องหรือไม่
      multiTopic: false,
      note: null,
    };
    if (!h) { out.note = "ไม่มีหัวข้อให้จำแนก"; return out; }

    // (1) รายการประจำมาก่อน — "ตรวจแล้วไม่ใช่ catalyst" ต่างจาก "ไม่รู้"
    for (var i = 0; i < ROUTINE.length; i++) {
      if (ROUTINE[i][0].test(h)) {
        out.routine = true; out.routineReason = ROUTINE[i][1];
        out.eventType = "OTHER"; out.evidenceStrength = null; out.classified = true;
        out.note = "รายการประจำ (" + ROUTINE[i][1] + ") — ไม่ใช่ catalyst";
        return out;
      }
    }

    // (2) เหตุการณ์ที่อาจเป็น catalyst
    // เก็บกฎที่ตรงทั้งหมดก่อน แล้วใช้กฎแรก (เรียงจากยืนยันแน่นสุด) เป็นตัวตัดสิน
    for (var m = 0; m < RULES.length; m++) {
      if (RULES[m][0].test(h)) out.allMatches.push({ eventType: RULES[m][1], rule: RULES[m][3] });
    }
    out.multiTopic = (function () {
      var seen = {};
      for (var q = 0; q < out.allMatches.length; q++) seen[out.allMatches[q].eventType] = true;
      return Object.keys(seen).length > 1;
    })();

    for (var j = 0; j < RULES.length; j++) {
      if (!RULES[j][0].test(h)) continue;
      out.matchedRule = RULES[j][3];
      out.eventType = RULES[j][1];
      var strength = RULES[j][2];

      // ภาษาที่บอกว่าเรื่องล้ม → ไม่ยกระดับ และทำเครื่องหมายไว้
      if (NEGATIVE_LANGUAGE.test(h)) {
        out.negated = true;
        out.evidenceStrength = "C1_MANAGEMENT_STORY";
        out.classified = true;
        out.note = "พบคำที่บ่งชี้การยกเลิก/ล่าช้า — ไม่ถือเป็นหลักฐานเชิงบวก";
        return out;
      }
      // ภาษาที่เป็นแค่แผน → กดไม่ให้เกิน C2
      if (PLAN_LANGUAGE.test(h) && STRENGTH_N[strength] > 2) {
        out.planOnly = true;
        strength = "C2_OFFICIAL_ANNOUNCEMENT";
        out.note = "ภาษาบ่งชี้ว่ายังเป็นแผน/อนุมัติในหลักการ — ไม่ยกถึงระดับยืนยัน";
      }
      out.evidenceStrength = strength;
      out.classified = true;
      if (out.multiTopic && !out.note) {
        out.note = "หัวข้อพูดหลายเรื่อง (" + out.allMatches.length + " กฎตรง) — จัดตาม \"" + out.matchedRule + "\" ซึ่งยืนยันแน่นสุด";
      }
      return out;
    }

    // (3) จับไม่ได้ = ไม่รู้ ห้ามเดา
    out.note = "ไม่มีกฎที่ตรงกับหัวข้อนี้ — ระบบไม่เดาประเภทเหตุการณ์";
    return out;
  }

  // ============================================================
  // แปลงข่าว SET ดิบ 1 รายการ → หลักฐานดิบพร้อมส่งเข้า EvidenceModel
  // คืน null ถ้าเป็นรายการประจำหรือจำแนกไม่ได้ (ไม่เอาเข้าคลังหลักฐาน)
  // ============================================================
  function toEvidence(newsItem, ticker) {
    if (!newsItem) return null;
    var cls = classifyHeadline(newsItem.headline);
    if (!cls.classified || cls.routine || !cls.evidenceStrength) return null;
    return {
      raw: {
        ticker: ticker || newsItem.symbol || null,
        eventDate: newsItem.datetime || null,
        sourceType: "SET_DISCLOSURE",
        sourceName: "SET Disclosure" + (newsItem.source ? " · " + newsItem.source : ""),
        sourceUrl: newsItem.url || null,
        eventType: cls.eventType,
        title: newsItem.headline || null,
        summary: null,              // หัวข้ออย่างเดียว ไม่มีเนื้อความ — ห้ามแต่ง
        evidenceStrength: cls.evidenceStrength,
        confidence: null,           // ไม่มีตัวเลขความมั่นใจจากแหล่ง — ต้องเป็น null
        affectedBusiness: null,     // หัวข้อไม่บอก — ห้ามเดา
        expectedImpact: null,       // หัวข้อไม่บอก — ห้ามเดา
        status: "REPORTED",         // ยังไม่ได้เปิดเอกสารต้นทางอ่าน
        createdAt: null,
      },
      classification: cls,
    };
  }

  // สรุปผลการตรวจข่าวของหุ้นหนึ่งตัว
  // สำคัญ: ต้องแยก "ไม่มีข่าวเลย" ออกจาก "มีข่าวแต่เป็นรายการประจำล้วน"
  function classifyFeed(newsItems, ticker) {
    var items = Array.isArray(newsItems) ? newsItems : [];
    var evidence = [], routine = 0, unknown = 0, negated = 0;
    items.forEach(function (n) {
      var cls = classifyHeadline(n && n.headline);
      if (cls.routine) { routine++; return; }
      if (!cls.classified) { unknown++; return; }
      if (cls.negated) negated++;
      var ev = toEvidence(n, ticker);
      if (ev) evidence.push(ev);
    });
    return {
      ticker: ticker || null,
      totalDisclosures: items.length,
      routineCount: routine,
      unknownCount: unknown,
      negatedCount: negated,
      evidence: evidence,
      note: items.length === 0
        ? "ไม่พบข้อมูลเผยแพร่ของหุ้นตัวนี้ในช่วงที่ดึงมา"
        : (evidence.length === 0
          ? "ตรวจข้อมูลเผยแพร่ " + items.length + " รายการแล้ว ไม่พบเหตุการณ์ที่เข้าเกณฑ์ catalyst"
          : "พบเหตุการณ์ที่เข้าเกณฑ์ " + evidence.length + " รายการ จาก " + items.length + " รายการ"),
    };
  }

  var EvidenceClassifier = {
    VERSION: VERSION,
    classifyHeadline: classifyHeadline,
    toEvidence: toEvidence,
    classifyFeed: classifyFeed,
    _internal: { ROUTINE: ROUTINE, RULES: RULES, PLAN_LANGUAGE: PLAN_LANGUAGE, NEGATIVE_LANGUAGE: NEGATIVE_LANGUAGE },
  };

  if (typeof window !== "undefined") window.EvidenceClassifier = EvidenceClassifier;
  if (typeof module !== "undefined" && module.exports) module.exports = EvidenceClassifier;
})();
