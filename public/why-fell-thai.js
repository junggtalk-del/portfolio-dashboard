(function () {
  "use strict";
  // ============================================================
  // WHY DID THE STOCK FALL — THAI LAYER (PHASE 3.2 · P1a)
  //
  // ปัญหาที่ audit พบ: whyFell = UNKNOWN ทั้ง 280/280 ตัว เพราะอ่านจาก KB ที่ไม่มีหุ้นไทย
  //
  // กติกาที่สำคัญที่สุด: ห้ามอนุมานเหตุผลทางธุรกิจจากราคาเพียงอย่างเดียว
  //   "ราคาลง 50%" ไม่ได้แปลว่า "นักลงทุนหมดความเชื่อมั่นในธุรกิจ" — นั่นคือการเดา
  //   ระบบจึงแยกให้ชัดว่าอะไรคือ "ข้อเท็จจริงเชิงราคา" กับอะไรคือ "หลักฐานเชิงธุรกิจ"
  //
  // หมวดที่คืนได้:
  //   MARKET_WIDE_DECLINE               ดัชนีก็ลงใกล้เคียงกัน — ไม่ใช่เรื่องเฉพาะตัว
  //   RELATIVE_UNDERPERFORMANCE         ลงแรงกว่าดัชนีอย่างมีนัย (ข้อเท็จจริงเชิงราคา ไม่ใช่สาเหตุทางธุรกิจ)
  //   FUNDAMENTAL_DETERIORATION_EVIDENCE มีหลักฐานในงบว่าธุรกิจเสื่อมจริง
  //   KNOWN_EVENT_EVIDENCE              มีเหตุการณ์ลบที่ระบุวันได้จากเอกสาร
  //   UNKNOWN                           หลักฐานไม่พอ — ยอมรับได้และดีกว่าการเดา
  //
  // ใช้เฉพาะข้อมูลที่ไหลอยู่ในระบบแล้ว: ประวัติราคา · ดัชนีอ้างอิง · ข้อมูลเผยแพร่ SET · แนวโน้มงบ
  // ไม่ดึงแหล่งใหม่
  // ============================================================

  var VERSION = "1.0.0";

  var CATEGORY = {
    MARKET_WIDE_DECLINE: { key: "MARKET_WIDE_DECLINE",
      thai: "ลงไปพร้อมตลาด — ดัชนีก็ปรับลงใกล้เคียงกัน ไม่ใช่เรื่องเฉพาะตัว" },
    RELATIVE_UNDERPERFORMANCE: { key: "RELATIVE_UNDERPERFORMANCE",
      thai: "ลงแรงกว่าดัชนีอย่างมีนัย — เป็นข้อเท็จจริงเชิงราคา ยังไม่ใช่สาเหตุทางธุรกิจ" },
    FUNDAMENTAL_DETERIORATION_EVIDENCE: { key: "FUNDAMENTAL_DETERIORATION_EVIDENCE",
      thai: "มีหลักฐานในงบว่าธุรกิจเสื่อมต่อเนื่อง" },
    KNOWN_EVENT_EVIDENCE: { key: "KNOWN_EVENT_EVIDENCE",
      thai: "มีเหตุการณ์ลบที่ระบุวันได้จากเอกสาร" },
    UNKNOWN: { key: "UNKNOWN",
      thai: "ยังระบุสาเหตุจากหลักฐานที่มีไม่ได้ — ระบบไม่เดาจากราคา" },
  };

  var CFG = {
    marketWideTolerancePp: 12,   // ต่างจากดัชนีไม่เกิน 12pp = ถือว่าลงไปพร้อมตลาด
    underperformPp: 20,          // ลงมากกว่าดัชนีเกิน 20pp = ลงแรงกว่าอย่างมีนัย
    minBars: 120,
  };

  function num(v) { return typeof v === "number" && isFinite(v) ? v : null; }
  function r1(v) { return v == null ? null : Math.round(v * 10) / 10; }

  // drawdown ของดัชนีจากชุดปิดที่ไหลอยู่ในระบบแล้ว (อ่านเท่านั้น ไม่แก้ engine ราคา)
  function benchDrawdownPct(benchCloses, window) {
    if (!Array.isArray(benchCloses) || benchCloses.length < CFG.minBars) return null;
    var w = benchCloses.slice(Math.max(0, benchCloses.length - (window || 252)));
    var hi = null, now = num(w[w.length - 1]);
    for (var i = 0; i < w.length; i++) { var v = num(w[i]); if (v != null && (hi == null || v > hi)) hi = v; }
    if (hi == null || now == null || hi <= 0) return null;
    return (now / hi - 1) * 100;
  }

  // ============================================================
  // classify(input) — คืนหมวด + หลักฐานที่ใช้ + สิ่งที่ยังไม่รู้
  // ============================================================
  function classify(input) {
    input = input || {};
    var dd = input.drawdown || {};
    var stockDd = num(dd.drawdown52wPct);
    var benchDd = num(input.benchDrawdownPct);
    if (benchDd == null) benchDd = benchDrawdownPct(input.benchCloses);

    var trap = input.valueTrap || null;
    var fin = input.financialInflection || null;
    var adverse = Array.isArray(input.adverseEvents) ? input.adverseEvents : [];

    var evidence = [];
    var unknowns = [];
    var gapPp = (stockDd != null && benchDd != null) ? stockDd - benchDd : null;

    if (stockDd != null) evidence.push("ราคาลง " + r1(stockDd) + "% จาก high 52 สัปดาห์");
    else unknowns.push("ข้อมูลราคาไม่พอคำนวณการย่อ");
    if (benchDd != null) evidence.push("ดัชนีอ้างอิงลง " + r1(benchDd) + "% ในช่วงเดียวกัน");
    else unknowns.push("ไม่มีข้อมูลดัชนีให้เทียบ");

    // ---------- 1) เหตุการณ์ลบที่ระบุวันได้ (หลักฐานแข็งสุด) ----------
    if (adverse.length) {
      adverse.slice(0, 4).forEach(function (e) {
        evidence.push("เหตุการณ์: " + String(e.date || "?") + " " + String(e.title || e.type || "").slice(0, 90));
      });
      return finish(CATEGORY.KNOWN_EVENT_EVIDENCE, evidence, unknowns, gapPp, stockDd, benchDd, adverse.length,
        "มีเหตุการณ์ลบที่ระบุวันได้ " + adverse.length + " รายการจากเอกสาร — ใช้เป็นสาเหตุที่อ้างอิงได้");
    }

    // ---------- 2) หลักฐานในงบว่าธุรกิจเสื่อม ----------
    // ต้องมาจาก value trap ที่ประเมินด้วยงบหลายไตรมาส ไม่ใช่จากราคา
    if (trap && trap.risk && (trap.risk.key === "HIGH" || (trap.risk.key === "MEDIUM" && (trap.signals || []).length >= 2))) {
      (trap.signals || []).slice(0, 4).forEach(function (s) { evidence.push("งบ: " + s); });
      return finish(CATEGORY.FUNDAMENTAL_DETERIORATION_EVIDENCE, evidence, unknowns, gapPp, stockDd, benchDd, 0,
        "อธิบายด้วยหลักฐานในงบ (" + (trap.signals || []).length + " สัญญาณจาก " + (trap.quartersUsed || "?") +
        " ไตรมาส) — ไม่ได้อนุมานจากราคา");
    }

    // ---------- 3/4) เทียบกับดัชนี — เป็นข้อเท็จจริงเชิงราคา ไม่ใช่สาเหตุทางธุรกิจ ----------
    if (gapPp != null) {
      if (Math.abs(gapPp) <= CFG.marketWideTolerancePp) {
        return finish(CATEGORY.MARKET_WIDE_DECLINE, evidence, unknowns, gapPp, stockDd, benchDd, 0,
          "ต่างจากดัชนีเพียง " + r1(gapPp) + "pp — การลงส่วนใหญ่อธิบายด้วยตลาดรวม ยังไม่พบเหตุเฉพาะตัว");
      }
      if (gapPp <= -CFG.underperformPp) {
        unknowns.push("ยังไม่พบเอกสารหรือหลักฐานในงบที่อธิบายว่าทำไมลงแรงกว่าตลาด");
        return finish(CATEGORY.RELATIVE_UNDERPERFORMANCE, evidence, unknowns, gapPp, stockDd, benchDd, 0,
          "ลงแรงกว่าดัชนี " + r1(Math.abs(gapPp)) + "pp — ระบบรายงานเป็นข้อเท็จจริงเชิงราคาเท่านั้น " +
          "ไม่สรุปว่าเป็นเพราะธุรกิจแย่ (นั่นต้องมีหลักฐานแยก)");
      }
    }

    // ---------- 5) ไม่พอสรุป ----------
    if (fin && fin.available) {
      unknowns.push("งบมี " + (fin.quarterCount || "?") + " ไตรมาสแล้วแต่ไม่พบรูปแบบเสื่อมที่อธิบายการลงได้");
    } else {
      unknowns.push("ยังไม่มีตัวเลขงบให้ตรวจ");
    }
    unknowns.push("ไม่มีเอกสารเหตุการณ์ลบที่ระบุวันได้");
    return finish(CATEGORY.UNKNOWN, evidence, unknowns, gapPp, stockDd, benchDd, 0,
      "หลักฐานที่มีไม่พอระบุสาเหตุ — ระบบเลือกตอบ UNKNOWN แทนการเดา");
  }

  function finish(cat, evidence, unknowns, gapPp, stockDd, benchDd, eventCount, note) {
    return {
      version: VERSION,
      category: cat.key,
      thai: cat.thai,
      evidence: evidence,
      unknowns: unknowns,
      // ตัวเลขที่ใช้ตัดสิน เก็บไว้ให้ตรวจย้อนหลังได้
      stockDrawdownPct: r1(stockDd),
      benchDrawdownPct: r1(benchDd),
      gapVsIndexPp: r1(gapPp),
      adverseEventCount: eventCount,
      note: note,
      // ย้ำในผลลัพธ์เองว่าไม่ได้อนุมานเหตุทางธุรกิจจากราคา
      inferredFromPriceOnly: cat.key === "MARKET_WIDE_DECLINE" || cat.key === "RELATIVE_UNDERPERFORMANCE",
    };
  }

  // ดึงเหตุการณ์ลบที่ระบุวันได้จากหลักฐานที่ระบบมีอยู่แล้ว
  // ใช้เฉพาะสิ่งที่ classifier ทำเครื่องหมายว่าเป็นลบ หรือประเภทที่เป็นลบชัดเจน
  var ADVERSE_TYPES = { DEBT_RESTRUCTURING: 1, CAPITAL_RESTRUCTURING: 1 };
  var ADVERSE_TEXT = /trading (halt|suspension)|\bsp sign\b|\bnp sign\b|possible delisting|rehabilitation|ยกเลิก|เพิกถอน|พักการซื้อขาย|ฟื้นฟูกิจการ|ผิดนัดชำระ|default/i;

  function extractAdverse(storyOrEvents) {
    var items = [];
    if (!storyOrEvents) return items;
    var list = Array.isArray(storyOrEvents) ? storyOrEvents
      : (storyOrEvents.timeline || []).concat(storyOrEvents.otherEvents || []);
    list.forEach(function (e) {
      if (!e) return;
      var title = String(e.title || "");
      var type = String(e.eventType || e.type || "");
      var isAdverse = ADVERSE_TEXT.test(title) || (ADVERSE_TYPES[type] && ADVERSE_TEXT.test(title));
      if (isAdverse) items.push({ date: e.eventDate || e.date || null, title: title, type: type });
    });
    // เรียงใหม่สุดก่อน และตัดซ้ำด้วยหัวข้อ
    var seen = {};
    return items.filter(function (x) {
      var k = String(x.date) + "|" + x.title.slice(0, 40);
      if (seen[k]) return false; seen[k] = true; return true;
    }).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
  }

  var WhyFellThai = {
    VERSION: VERSION, CATEGORY: CATEGORY, CFG: CFG,
    classify: classify, extractAdverse: extractAdverse, benchDrawdownPct: benchDrawdownPct,
    _internal: { ADVERSE_TEXT: ADVERSE_TEXT },
  };

  if (typeof window !== "undefined") window.WhyFellThai = WhyFellThai;
  if (typeof module !== "undefined" && module.exports) module.exports = WhyFellThai;
})();
