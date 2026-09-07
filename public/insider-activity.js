(function () {
  "use strict";
  // ============================================================
  // INSIDER ACTIVITY — มิติหลักฐานสนับสนุน (PHASE 3.2 · P1b)
  //
  // ข้อมูลมีอยู่แล้วจากเฟส 2: ก.ล.ต. แบบ 59 (INSIDER_BUY / INSIDER_SELL)
  // ตัวอย่างที่ audit พบ: CMC มีรายการซื้อของผู้บริหาร 119 ครั้ง
  // แต่ระบบเก็บไว้ใน otherEvents โดยไม่เคยแสดงให้ผู้ใช้เห็น
  //
  // กติกาที่ห้ามพัง:
  //  1. ผู้บริหารซื้อหุ้น "ไม่" กลายเป็น catalyst C3/C4 โดยอัตโนมัติ
  //  2. การซื้อของผู้บริหารลำพัง "ไม่ใช่" หลักฐานว่าธุรกิจกำลังเปลี่ยน
  //  3. ลำพังมันสร้างสถานะโอกาสไม่ได้ — เป็นหลักฐานสนับสนุนวิทยานิพนธ์เท่านั้น
  //     (เพดานนี้บังคับที่ evidence-model อยู่แล้ว: INSIDER_BUY/SELL มี mech = null
  //      จึงได้ catalystRelevance = UNKNOWN และไม่ถูกนับเป็น catalyst)
  //  4. ไม่ให้คะแนน ไม่จัดอันดับ
  // ============================================================

  var VERSION = "1.0.0";

  var STATE = {
    BUYING:  { key: "BUYING",  icon: "🟢", label: "INSIDER BUYING",
      thai: "ผู้บริหาร/ผู้ถือหุ้นใหญ่ซื้อเป็นส่วนใหญ่ในช่วงที่ดู" },
    SELLING: { key: "SELLING", icon: "🔴", label: "INSIDER SELLING",
      thai: "ผู้บริหาร/ผู้ถือหุ้นใหญ่ขายเป็นส่วนใหญ่ในช่วงที่ดู" },
    MIXED:   { key: "MIXED",   icon: "🟡", label: "INSIDER MIXED",
      thai: "มีทั้งซื้อและขาย ไม่มีทิศทางชัด" },
    NONE:    { key: "NONE",    icon: "⚫", label: "NO INSIDER ACTIVITY",
      thai: "ตรวจเอกสาร ก.ล.ต. แล้วไม่พบรายการในช่วงที่ดู" },
    UNKNOWN: { key: "UNKNOWN", icon: "⚪", label: "DATA UNAVAILABLE",
      thai: "ยังตรวจเอกสาร ก.ล.ต. ไม่สำเร็จ — ไม่ได้แปลว่าไม่มีรายการ" },
  };

  var CFG = {
    recentDays: 180,      // ช่วงที่ถือว่า "ล่าสุด"
    dominanceRatio: 0.7,  // ต้องเป็นด้านเดียว ≥70% จึงเรียกว่ามีทิศทาง
    minForDirection: 3,   // และต้องมีอย่างน้อย 3 รายการ
  };

  function iso(v) {
    var s = v == null ? "" : String(v);
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? m[0] : null;
  }
  function daysBetween(a, b) {
    if (!a || !b) return null;
    var t1 = Date.parse(a + "T00:00:00Z"), t2 = Date.parse(b + "T00:00:00Z");
    if (isNaN(t1) || isNaN(t2)) return null;
    return Math.round((t2 - t1) / 86400000);
  }

  // ============================================================
  // assess(events, opts)
  //   events = รายการหลักฐานที่ระบบมีอยู่ (จาก story.otherEvents / timeline)
  //   opts.inspected = ตรวจแหล่ง ก.ล.ต. สำเร็จหรือไม่ (false → UNKNOWN ไม่ใช่ NONE)
  // ============================================================
  function assess(events, opts) {
    opts = opts || {};
    var asOf = iso(opts.asOf) || null;

    if (opts.inspected !== true) {
      return { version: VERSION, state: STATE.UNKNOWN, buyCount: null, sellCount: null,
        totalCount: null, recentCount: null, latestDate: null, references: [],
        note: "ยังตรวจเอกสาร ก.ล.ต. ไม่สำเร็จ — UNKNOWN ไม่ได้แปลว่าไม่มีรายการ",
        isSupportingEvidenceOnly: true };
    }

    var list = Array.isArray(events) ? events : [];
    var buys = [], sells = [];
    list.forEach(function (e) {
      if (!e) return;
      var type = String(e.eventType || e.type || "").toUpperCase();
      if (type !== "INSIDER_BUY" && type !== "INSIDER_SELL") return;
      var rec = {
        date: iso(e.eventDate || e.date),
        title: e.title || null,
        url: e.sourceUrl || e.url || null,        // ไม่มีก็ null ห้ามแต่ง
        source: e.sourceName || e.sourceType || null,
        tier: e.sourceTier || null,
      };
      if (type === "INSIDER_BUY") buys.push(rec); else sells.push(rec);
    });

    var all = buys.concat(sells).filter(function (x) { return x.date; })
      .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    var total = buys.length + sells.length;

    if (!total) {
      return { version: VERSION, state: STATE.NONE, buyCount: 0, sellCount: 0, totalCount: 0,
        recentCount: 0, latestDate: null, references: [],
        note: "ตรวจเอกสาร ก.ล.ต. แล้วไม่พบรายการซื้อขายของผู้บริหารในช่วงที่ดึงมา",
        isSupportingEvidenceOnly: true };
    }

    var latestDate = all.length ? all[0].date : null;
    var ref = asOf || latestDate;
    var recentBuys = buys.filter(function (x) {
      var d = daysBetween(x.date, ref);
      return d != null && d >= 0 && d <= CFG.recentDays;
    }).length;
    var recentSells = sells.filter(function (x) {
      var d = daysBetween(x.date, ref);
      return d != null && d >= 0 && d <= CFG.recentDays;
    }).length;
    var recentTotal = recentBuys + recentSells;

    // ทิศทางตัดสินจากช่วงล่าสุดก่อน ถ้าช่วงล่าสุดไม่มีรายการจึงใช้ทั้งชุด
    var bC = recentTotal ? recentBuys : buys.length;
    var sC = recentTotal ? recentSells : sells.length;
    var basis = recentTotal ? "ช่วง " + CFG.recentDays + " วันล่าสุด" : "ทั้งชุดที่ดึงมา";
    var n = bC + sC;

    var state;
    if (n < CFG.minForDirection) {
      state = STATE.MIXED;
    } else if (bC / n >= CFG.dominanceRatio) {
      state = STATE.BUYING;
    } else if (sC / n >= CFG.dominanceRatio) {
      state = STATE.SELLING;
    } else {
      state = STATE.MIXED;
    }

    return {
      version: VERSION,
      state: state,
      buyCount: buys.length,
      sellCount: sells.length,
      totalCount: total,
      recentBuyCount: recentBuys,
      recentSellCount: recentSells,
      recentCount: recentTotal,
      directionBasis: basis,
      latestDate: latestDate,
      // อ้างอิงหลักฐานจริง (จำกัดจำนวนเพื่อไม่ให้ payload บวม)
      references: all.slice(0, 8),
      note: "ซื้อ " + buys.length + " · ขาย " + sells.length + " รายการ (ทิศทางจาก" + basis + ") — " +
        "เป็นหลักฐานสนับสนุน ไม่ใช่ catalyst และลำพังไม่สร้างสถานะโอกาส",
      isSupportingEvidenceOnly: true,
    };
  }

  var InsiderActivity = {
    VERSION: VERSION, STATE: STATE, CFG: CFG, assess: assess,
    _internal: { iso: iso, daysBetween: daysBetween },
  };

  if (typeof window !== "undefined") window.InsiderActivity = InsiderActivity;
  if (typeof module !== "undefined" && module.exports) module.exports = InsiderActivity;
})();
