(function () {
  "use strict";
  // ============================================================
  // §16 FINANCIAL INFLECTION — ชั้น deterministic บนตัวเลขงบจริง
  //
  // กติกาที่ห้ามพัง:
  //  1. §13 "ไม่มีข้อมูล" ≠ "ไม่มี inflection"
  //       FINANCIAL_EVIDENCE_UNAVAILABLE = ดึงงบไม่ได้/ไตรมาสไม่พอ
  //       NO_INFLECTION                  = มีงบครบแล้ว และตัวเลขไม่ได้พลิก
  //     สองอย่างนี้ต้องแยกกันเด็ดขาด
  //  2. ราคาไม่เกี่ยวข้องที่นี่เลย — ไฟล์นี้เห็นแค่ตัวเลขงบ
  //  3. ไม่มีการให้คะแนนรวม — คืนสถานะต่อรายการ พร้อมตัวเลขที่ใช้ตัดสิน
  //  4. backlog ไม่มีแหล่งใดให้ ⇒ BACKLOG_INFLECTION = UNAVAILABLE ตลอด ห้ามเดาจากรายได้
  //
  // ข้อมูลที่ใช้: ~5 ไตรมาสจาก lib/evidence/thaiFinancialAdapter
  //   ⇒ เทียบ YoY ได้เพียงคู่เดียว (ไตรมาสล่าสุด vs 4 ไตรมาสก่อน) และ QoQ ได้หลายคู่
  // ============================================================

  var VERSION = "1.0.0";

  var STATE = {
    UNAVAILABLE:          { key: "FINANCIAL_EVIDENCE_UNAVAILABLE", n: -1, label: "FINANCIAL EVIDENCE UNAVAILABLE",
      thai: "ยังดึงตัวเลขงบไม่ได้ หรือไตรมาสไม่พอเทียบ — ไม่ได้แปลว่าไม่มี inflection" },
    NO_INFLECTION:        { key: "NO_INFLECTION", n: 0, label: "NO INFLECTION",
      thai: "มีงบครบแล้ว ตัวเลขยังไม่พลิก" },
    EARLY_INFLECTION:     { key: "EARLY_INFLECTION", n: 1, label: "EARLY INFLECTION",
      thai: "เริ่มเห็นสัญญาณพลิกในไตรมาสล่าสุด" },
    CONFIRMED_INFLECTION: { key: "CONFIRMED_INFLECTION", n: 2, label: "CONFIRMED INFLECTION",
      thai: "พลิกและยืนได้ต่อเนื่อง" },
    STRONG_INFLECTION:    { key: "STRONG_INFLECTION", n: 3, label: "STRONG INFLECTION",
      thai: "พลิกแรงและยืนต่อเนื่อง" },
  };

  // เกณฑ์ (ตรึงไว้ให้ตรวจสอบได้ ไม่ใช่ค่าที่ปรับตามอารมณ์)
  var CFG = {
    minQuartersYoY: 5,        // ต้องมีอย่างน้อย 5 งวดจึงเทียบ YoY ได้ 1 คู่
    minQuartersQoQ: 3,
    earlyPct: 10,             // โต >10% = เริ่มเห็น
    confirmedPct: 25,         // โต >25% = ชัด
    strongPct: 50,            // โต >50% = แรง
    marginEarlyPp: 1.5,       // มาร์จิ้นดีขึ้น 1.5pp
    marginConfirmedPp: 3,
    marginStrongPp: 6,
    debtImprovePct: 10,       // หนี้ลด >10%
    // P0a เกณฑ์ระดับสัมบูรณ์ของมาร์จิ้น (หน่วย % ไม่ใช่ pp)
    // ที่มาของค่า: มาจากความหมายทางการเงินที่ระบบใช้อยู่แล้ว ไม่ใช่ค่าที่ตั้งตามหุ้นตัวใด
    //   marginNearZero  = "เกือบคุ้มทุน" — ยังขาดทุนจากการดำเนินงานแต่ใกล้จุดคุ้มทุน
    //   marginHealthy   = ระดับที่ถือว่าเป็นบวกอย่างมีความหมาย (ไม่ใช่บวกเพราะปัดเศษ)
    marginNearZero: -5,       // มาร์จิ้น > -5% = เกือบคุ้มทุน
    marginHealthy: 5,         // มาร์จิ้น >= +5% = บวกอย่างมีความหมาย
  };

  function num(v) { return typeof v === "number" && isFinite(v) ? v : null; }
  function pctChange(now, then) {
    var a = num(now), b = num(then);
    if (a == null || b == null) return null;
    if (b === 0) return null;                     // หารศูนย์ไม่ได้ — ห้ามเดา
    return ((a - b) / Math.abs(b)) * 100;
  }
  function r1(v) { return v == null ? null : Math.round(v * 10) / 10; }

  // สถานะจากเปอร์เซ็นต์การเปลี่ยนแปลง + ความต่อเนื่อง
  function gradePct(yoyPct, qoqPositiveStreak) {
    if (yoyPct == null) return null;
    var streak = qoqPositiveStreak || 0;
    // YoY เป็นตัวตัดสินหลัก — streak ใช้แยกเฉพาะระดับ STRONG
    // (เดิมใช้ streak เป็นเงื่อนไขของ CONFIRMED ทำให้ EPS ที่โต 173% YoY ถูกกดเป็น EARLY
    //  เพียงเพราะ QoQ ล่าสุดย่อ ซึ่งไม่สมเหตุสมผล)
    if (yoyPct >= CFG.strongPct && streak >= 1) return STATE.STRONG_INFLECTION;
    if (yoyPct >= CFG.strongPct) return STATE.CONFIRMED_INFLECTION;
    if (yoyPct >= CFG.confirmedPct) return STATE.CONFIRMED_INFLECTION;
    if (yoyPct >= CFG.earlyPct) return STATE.EARLY_INFLECTION;
    return STATE.NO_INFLECTION;
  }

  // พลิกจากขาดทุนเป็นกำไร = inflection ที่ชัดที่สุด เปอร์เซ็นต์อธิบายไม่ได้
  function signFlip(now, then) {
    var a = num(now), b = num(then);
    if (a == null || b == null) return null;
    if (b < 0 && a > 0) return "loss-to-profit";
    if (b > 0 && a < 0) return "profit-to-loss";
    return null;
  }

  function seriesOf(quarters, field) {
    return (quarters || []).map(function (q) { return { date: q.date, v: num(q[field]) }; })
      .filter(function (x) { return x.v != null; });
  }

  function qoqStreak(series) {
    // นับว่าไตรมาสล่าสุดขึ้นต่อเนื่องกี่ครั้ง
    var n = 0;
    for (var i = series.length - 1; i > 0; i--) {
      if (series[i].v > series[i - 1].v) n++;
      else break;
    }
    return n;
  }

  // ประเมินรายการหนึ่ง (revenue / eps / fcf / debt)
  function assessMetric(quarters, field, opts) {
    opts = opts || {};
    var s = seriesOf(quarters, field);
    if (s.length < CFG.minQuartersQoQ) {
      return { state: STATE.UNAVAILABLE, reason: "มีข้อมูลเพียง " + s.length + " งวด — น้อยกว่า " + CFG.minQuartersQoQ,
        yoyPct: null, qoqPct: null, latest: null, latestDate: null, streak: null, signFlip: null, series: s };
    }
    var latest = s[s.length - 1];
    var prev = s[s.length - 2];
    // YoY ต้องหางวดที่ห่างกัน 4 ไตรมาสจริง ๆ (ไม่ใช่แค่ index -5)
    var yoyRef = null;
    if (s.length >= CFG.minQuartersYoY) yoyRef = s[s.length - 5];
    var yoy = yoyRef ? pctChange(latest.v, yoyRef.v) : null;
    var qoq = pctChange(latest.v, prev.v);
    var flip = yoyRef ? signFlip(latest.v, yoyRef.v) : signFlip(latest.v, prev.v);
    var streak = qoqStreak(s);

    var state;
    if (flip === "loss-to-profit") {
      state = streak >= 2 ? STATE.CONFIRMED_INFLECTION : STATE.EARLY_INFLECTION;
    } else if (flip === "profit-to-loss") {
      state = STATE.NO_INFLECTION;                 // แย่ลง ไม่ใช่ inflection บวก
    } else if (opts.lowerIsBetter) {
      // หนี้: ลดลงคือดี
      var drop = yoy != null ? -yoy : (qoq != null ? -qoq : null);
      state = drop == null ? STATE.UNAVAILABLE
        : (drop >= CFG.debtImprovePct ? STATE.CONFIRMED_INFLECTION
          : (drop > 0 ? STATE.EARLY_INFLECTION : STATE.NO_INFLECTION));
    } else if (yoy == null) {
      // ไม่มี YoY ⇒ ยังยืนยันไม่ได้ ต้องบอกว่าข้อมูลไม่พอ ไม่ใช่ "ไม่มี inflection"
      state = STATE.UNAVAILABLE;
    } else {
      state = gradePct(yoy, streak);
    }

    return {
      state: state,
      yoyPct: r1(yoy), qoqPct: r1(qoq),
      latest: latest.v, latestDate: latest.date,
      yoyRefDate: yoyRef ? yoyRef.date : null,
      streak: streak, signFlip: flip,
      quartersUsed: s.length,
      reason: state.key === "FINANCIAL_EVIDENCE_UNAVAILABLE"
        ? (yoy == null ? "มีข้อมูล " + s.length + " งวด ยังเทียบ YoY ไม่ได้ (ต้องมี " + CFG.minQuartersYoY + ")" : null)
        : null,
      series: s,
    };
  }

  // มาร์จิ้น: เทียบเป็น percentage point ไม่ใช่ %
  // P0a — ประเมินมาร์จิ้นโดยดู "ระดับสัมบูรณ์" และ "ทิศทาง" ร่วมกัน
  //
  // ปัญหาเดิม: จัดระดับจาก percentage point ล้วน ทำให้ -80.4% → -67.3% (+13pp)
  //            กลายเป็น STRONG_INFLECTION ซึ่งอ่านว่า "ฟื้นตัวแข็งแรง"
  //            แต่ความจริงคือ "ขาดทุนน้อยลง" — คนละเรื่องกัน
  //
  // หลักการ: การดีขึ้น ≠ การฟื้นตัว
  //   ยังติดลบลึก → ติดลบน้อยลง      = กำลังดีขึ้น แต่ยังไม่ใช่การฟื้นที่ยืนยันได้ (สูงสุด EARLY)
  //   ติดลบ → เกือบคุ้มทุน (> -5%)     = กำลังดีขึ้น (สูงสุด EARLY)
  //   ติดลบ → เป็นบวก (ข้ามศูนย์)      = หลักฐานแข็งขึ้นอย่างมีนัย (CONFIRMED, หรือ STRONG ถ้าบวกมากพอ)
  //   บวก → บวกมากขึ้น                = แข็งแรงขึ้นจริง (ไล่ระดับตาม pp เหมือนเดิม)
  //   บวก → ลดลง / ติดลบทรงตัว        = ไม่ใช่การฟื้น
  //
  // คงคำศัพท์สาธารณะเดิมทั้งสี่ระดับ ไม่เพิ่มสถานะใหม่
  function assessMargin(quarters) {
    var s = seriesOf(quarters, "operatingMargin");
    if (s.length < CFG.minQuartersQoQ) {
      return { state: STATE.UNAVAILABLE, reason: "มีมาร์จิ้นเพียง " + s.length + " งวด",
        latestPct: null, yoyPp: null, qoqPp: null, series: s };
    }
    var latest = s[s.length - 1], prev = s[s.length - 2];
    var yoyRef = s.length >= CFG.minQuartersYoY ? s[s.length - 5] : null;
    var yoyPp = yoyRef ? (latest.v - yoyRef.v) * 100 : null;
    var qoqPp = (latest.v - prev.v) * 100;

    var latestPct = latest.v * 100;
    var basePct = yoyRef ? yoyRef.v * 100 : null;
    var crossedZero = basePct != null && basePct < 0 && latestPct >= 0;
    var stillNegative = latestPct < 0;
    var nearBreakeven = stillNegative && latestPct > CFG.marginNearZero;
    var levelNote = null;

    var state;
    if (yoyPp == null) {
      state = STATE.UNAVAILABLE;
    } else if (yoyPp <= 0) {
      // ทรงตัวหรือแย่ลง — ไม่ใช่การฟื้นในทุกกรณี
      state = STATE.NO_INFLECTION;
      levelNote = latestPct >= 0
        ? "มาร์จิ้นเป็นบวก " + r1(latestPct) + "% แต่ลดลง " + r1(Math.abs(yoyPp)) + "pp จากปีก่อน — เป็นการถดถอย"
        : "มาร์จิ้นติดลบ " + r1(latestPct) + "% และไม่ได้ดีขึ้น (" + r1(yoyPp) + "pp)";
    } else if (stillNegative) {
      // ยังขาดทุนจากการดำเนินงาน — ดีขึ้นเท่าไหร่ก็ยังไม่ใช่การฟื้นที่ยืนยันได้
      // จำกัดเพดานไว้ที่ EARLY_INFLECTION เพื่อไม่ให้ "แย่น้อยลง" อ่านเป็น "แข็งแรง"
      state = yoyPp >= CFG.marginEarlyPp ? STATE.EARLY_INFLECTION : STATE.NO_INFLECTION;
      levelNote = "มาร์จิ้นยังติดลบ " + r1(latestPct) + "% (ดีขึ้น " + r1(yoyPp) + "pp จาก " + r1(basePct) + "%) — " +
        (nearBreakeven ? "ใกล้จุดคุ้มทุนแล้วแต่ยังไม่ถึง" : "ยังขาดทุนจากการดำเนินงานลึก") +
        " · การดีขึ้นไม่ใช่การฟื้นตัวโดยอัตโนมัติ จึงไม่ยกเกิน EARLY";
    } else if (crossedZero) {
      // ข้ามจากติดลบเป็นบวก = หลักฐานแข็งขึ้นอย่างมีนัยจริง
      state = (yoyPp >= CFG.marginStrongPp && latestPct >= CFG.marginHealthy)
        ? STATE.STRONG_INFLECTION : STATE.CONFIRMED_INFLECTION;
      levelNote = "มาร์จิ้นพลิกจากติดลบ " + r1(basePct) + "% เป็นบวก " + r1(latestPct) + "% — ข้ามจุดคุ้มทุนแล้ว" +
        (state === STATE.CONFIRMED_INFLECTION && latestPct < CFG.marginHealthy
          ? " (แต่ยังบวกน้อยกว่า " + CFG.marginHealthy + "% จึงยังไม่ยกเป็น STRONG)" : "");
    } else {
      // บวกอยู่แล้วและบวกมากขึ้น — ไล่ระดับตาม pp เหมือนเดิม
      state = yoyPp >= CFG.marginStrongPp ? STATE.STRONG_INFLECTION
        : (yoyPp >= CFG.marginConfirmedPp ? STATE.CONFIRMED_INFLECTION
          : (yoyPp >= CFG.marginEarlyPp ? STATE.EARLY_INFLECTION : STATE.NO_INFLECTION));
      levelNote = "มาร์จิ้นเป็นบวก " + r1(latestPct) + "% และเพิ่มขึ้น " + r1(yoyPp) + "pp";
    }

    return {
      state: state, latestPct: r1(latestPct), latestDate: latest.date,
      basePct: r1(basePct), yoyPp: r1(yoyPp), qoqPp: r1(qoqPp),
      yoyRefDate: yoyRef ? yoyRef.date : null,
      // P0a ข้อมูลเชิงระดับ เพื่อให้ตรวจย้อนหลังได้ว่าทำไมไม่ยกระดับ
      stillNegative: stillNegative, nearBreakeven: nearBreakeven, crossedZero: crossedZero,
      levelCapped: stillNegative && yoyPp != null && yoyPp >= CFG.marginConfirmedPp,
      levelNote: levelNote,
      quartersUsed: s.length,
      reason: state.key === "FINANCIAL_EVIDENCE_UNAVAILABLE" ? "ยังเทียบ YoY ของมาร์จิ้นไม่ได้" : null,
      series: s,
    };
  }

  // ============================================================
  // compute(financialResult) → ชุด inflection ทั้งหมด
  // financialResult = ผลจาก thaiFinancialAdapter.fetchThaiFinancialEvidence
  // ============================================================
  function compute(financialResult) {
    var fr = financialResult || {};
    var out = {
      version: VERSION,
      available: false,
      state: STATE.UNAVAILABLE,
      source: fr.source || null,
      asOf: fr.asOf || null,
      quarterCount: 0,
      latestQuarter: null,
      rejectedQuarters: fr.rejected || [],
      metrics: {},
      note: null,
      // §13 ต้องแยกให้ชัดในผลลัพธ์เอง
      dataAvailability: null,
    };

    if (!fr.inspected || !Array.isArray(fr.quarters) || !fr.quarters.length) {
      out.dataAvailability = "FINANCIAL_EVIDENCE_UNAVAILABLE";
      out.note = fr.reason || "FINANCIAL_EVIDENCE_UNAVAILABLE: ยังไม่มีตัวเลขงบให้ประเมิน";
      ["REVENUE_INFLECTION", "EPS_INFLECTION", "MARGIN_INFLECTION", "FCF_INFLECTION",
        "DEBT_IMPROVEMENT", "BACKLOG_INFLECTION"].forEach(function (k) {
        out.metrics[k] = { state: STATE.UNAVAILABLE, reason: "ยังไม่มีตัวเลขงบ" };
      });
      return out;
    }

    var qs = fr.quarters;
    out.available = true;
    out.dataAvailability = "FINANCIAL_DATA_AVAILABLE";
    out.quarterCount = qs.length;
    out.latestQuarter = qs[qs.length - 1].date;

    out.metrics.REVENUE_INFLECTION = assessMetric(qs, "revenue");
    out.metrics.EPS_INFLECTION = assessMetric(qs, "eps");
    out.metrics.MARGIN_INFLECTION = assessMargin(qs);
    out.metrics.FCF_INFLECTION = assessMetric(qs, "fcf");
    out.metrics.DEBT_IMPROVEMENT = assessMetric(qs, "totalDebt", { lowerIsBetter: true });
    // §16 backlog: ไม่มีแหล่งข้อมูล — ห้ามอนุมานจากรายได้
    out.metrics.BACKLOG_INFLECTION = { state: STATE.UNAVAILABLE,
      reason: "ไม่มีแหล่งข้อมูล backlog ของหุ้นไทย — ห้ามอนุมานจากรายได้" };

    // สถานะรวม = ระดับสูงสุดที่ "ยืนยันได้จริง" ในรายการหลัก (รายได้/EPS/มาร์จิ้น)
    // สถานะรวมต้องมีการยืนยันข้ามรายการ — รายการเดียวแรงไม่พอที่จะเรียกทั้งบริษัทว่า STRONG
    // (เจอจริง: ADVANC มาร์จิ้น +6.8pp แต่รายได้ +0.3% — เรียก STRONG จะเกินจริง)
    var core = ["REVENUE_INFLECTION", "EPS_INFLECTION", "MARGIN_INFLECTION"];
    var best = null, anyKnown = false, confirmedCount = 0;
    core.forEach(function (k) {
      var m = out.metrics[k];
      if (!m || !m.state) return;
      if (m.state.n < 0) return;
      anyKnown = true;
      if (m.state.n >= STATE.CONFIRMED_INFLECTION.n) confirmedCount++;
      if (!best || m.state.n > best.n) best = m.state;
    });
    // ต้องมี ≥2 รายการหลักที่ยืนยันได้ จึงจะยกถึง CONFIRMED/STRONG
    if (best && best.n >= STATE.CONFIRMED_INFLECTION.n && confirmedCount < 2) {
      best = STATE.EARLY_INFLECTION;
      out.crossCheckNote = "มีเพียง 1 รายการหลักที่ยืนยันได้ — ลดระดับรวมลงเป็น EARLY (ต้องมี ≥2 รายการ)";
    }
    out.confirmedCoreCount = confirmedCount;

    // เกตกันความขัดแย้ง: รายได้หดแรงแล้วจะเรียกว่า inflection ไม่ได้
    // (เจอจริง: ABM มี EPS +150% แต่รายได้ -57.7% — การเรียก STRONG จะบิดเบือนความจริง)
    var revM = out.metrics.REVENUE_INFLECTION;
    if (best && best.n >= STATE.CONFIRMED_INFLECTION.n &&
        revM && revM.yoyPct != null && revM.yoyPct <= -15) {
      best = STATE.EARLY_INFLECTION;
      out.contradictionNote = "รายได้ YoY " + revM.yoyPct + "% — หดแรง จึงยังยืนยัน inflection ไม่ได้ " +
        "แม้รายการอื่นจะดูดี (อาจมาจากรายการพิเศษ ไม่ใช่ธุรกิจหลัก)";
    }
    if (!anyKnown) {
      out.state = STATE.UNAVAILABLE;
      out.dataAvailability = "FINANCIAL_EVIDENCE_UNAVAILABLE";
      out.note = "มีตัวเลขงบ " + qs.length + " งวด แต่ยังไม่พอเทียบ YoY — ยังยืนยัน inflection ไม่ได้ " +
        "(ไม่ได้แปลว่าไม่มี inflection)";
    } else {
      out.state = best;
      out.note = null;
    }

    // §19 หลักฐานระดับ C4 ต้องมี inflection ที่ยืนยันได้จริง ไม่ใช่แค่มีตัวเลข
    out.qualifiesAsC4 = out.state.n >= STATE.CONFIRMED_INFLECTION.n;
    return out;
  }

  // แปลงผลเป็น "หลักฐาน" ให้ EvidenceModel — เฉพาะเมื่อยืนยันได้
  // ห้ามสร้างหลักฐานจากตัวเลขที่ยังเทียบ YoY ไม่ได้
  //
  // PHASE 5 — หลักฐานชิ้นนี้อยู่ระนาบ FINANCIAL:
  //   ใช้ยืนยัน FINANCIAL IMPACT ได้ · ร่วมยกขั้นเป็น C4 ได้เมื่อมีเหตุการณ์ธุรกิจ C3 อยู่ก่อน
  //   แต่ "ลำพัง" สร้าง catalyst C0-C5 ไม่ได้ (§1 งบฟื้น ≠ catalyst)
  //   evidenceStrength ยังเป็น C4_FINANCIAL_EVIDENCE เพราะเป็นความแข็งของหลักฐานทางการเงินจริง
  //   — ความแข็งของหลักฐาน กับ ขั้นของ catalyst เป็นคนละมิติ (evidence-model คุมเรื่องนี้)
  function toEvidence(ticker, inflection, opts) {
    opts = opts || {};
    if (!inflection || !inflection.available || !inflection.qualifiesAsC4) return null;
    var picked = null, pickedKey = null;
    ["REVENUE_INFLECTION", "EPS_INFLECTION", "MARGIN_INFLECTION", "FCF_INFLECTION"].forEach(function (k) {
      var m = inflection.metrics[k];
      if (!m || !m.state || m.state.n < 2) return;
      if (!picked || m.state.n > picked.state.n) { picked = m; pickedKey = k; }
    });
    if (!picked) return null;
    var detail = pickedKey === "MARGIN_INFLECTION"
      ? "มาร์จิ้น " + picked.latestPct + "% (YoY " + (picked.yoyPp >= 0 ? "+" : "") + picked.yoyPp + "pp)"
      : "YoY " + (picked.yoyPct >= 0 ? "+" : "") + picked.yoyPct + "%" +
        (picked.signFlip === "loss-to-profit" ? " · พลิกจากขาดทุนเป็นกำไร" : "");
    return {
      ticker: String(ticker).toUpperCase(),
      eventDate: inflection.latestQuarter,
      sourceType: "FINANCIAL_STATEMENT",
      evidencePlane: "FINANCIAL",
      sourceName: inflection.source || "งบรายไตรมาส",
      sourceUrl: opts.sourceUrl || null,           // §27 ไม่มีก็ null ห้ามแต่ง
      eventType: pickedKey === "EPS_INFLECTION" ? "EPS_INFLECTION"
        : pickedKey === "MARGIN_INFLECTION" ? "MARGIN_INFLECTION"
          : pickedKey === "FCF_INFLECTION" ? "FCF_INFLECTION" : "REVENUE_INFLECTION",
      title: "งบไตรมาส " + inflection.latestQuarter + ": " + picked.state.label + " — " + detail,
      summary: null,
      evidenceStrength: "C4_FINANCIAL_EVIDENCE",
      confidence: null,
      affectedBusiness: null,
      expectedImpact: null,
      status: "REPORTED",
    };
  }

  var FinancialInflection = {
    VERSION: VERSION, STATE: STATE, CFG: CFG,
    compute: compute, toEvidence: toEvidence,
    _internal: { assessMetric: assessMetric, assessMargin: assessMargin, pctChange: pctChange,
      signFlip: signFlip, qoqStreak: qoqStreak, seriesOf: seriesOf, gradePct: gradePct },
  };

  if (typeof window !== "undefined") window.FinancialInflection = FinancialInflection;
  if (typeof module !== "undefined" && module.exports) module.exports = FinancialInflection;
})();
