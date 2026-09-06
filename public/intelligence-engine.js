(function () {
  "use strict";
  // ============================================================
  // Investment Intelligence Layer — 6 ฟีเจอร์วิเคราะห์เสริมบน engine เดิม
  //   F1 Thesis Break Detector   (health)
  //   F2 Earnings Revision       (expectations)
  //   F3 AI Monetization         (aiMonetization)
  //   F4 Price Drawdown Map      (drawdown)
  //   F5 Growth vs Valuation     (matrixPoint + matrix())
  //   F6 AI Value Chain Position (valueChain)
  // + summary (integration) + gateZone (safety gate ให้ Accumulation Zone)
  //
  // หลักการ: REUSE ไม่ rebuild — ThesisEngine เป็นแหล่ง thesis/dipClass/inputs,
  // ValuationEngine เป็นแหล่ง P/E canonical, PMEngine เป็นแหล่ง growthSummary,
  // AIRotationEngine เป็นแหล่ง phase/layer · ไม่มีการยิง network · ไม่มี LLM
  // ข้อมูลไม่มี = แสดง na/"—" ห้ามประมาณเงียบ ๆ (no fabrication)
  // ตอบคำถามเดียว: "หุ้นลง — นี่คือจังหวะสะสม หรือ thesis กำลังพัง?"
  // ============================================================

  var VERSION = "1.0.0";

  // ---------------- เกณฑ์ทั้งหมด (deterministic + อธิบายได้) ----------------
  // เกณฑ์ที่มีอยู่แล้วในระบบจะอ่านจาก engine ตัวจริงตอนรัน (ดู thresholds())
  // ตัวเลขในนี้คือเกณฑ์ "ใหม่" ที่ยังไม่มีที่อื่น พร้อมเหตุผลกำกับ
  var CONFIG = {
    // YoY deceleration: YoY ล่าสุดต่ำกว่า YoY ก่อนหน้าเกิน max(5pp, 25% ของ YoY เดิม)
    // — 5pp กันฐานโตช้า, 25% สัมพัทธ์กันฐานโตเร็ว (NVDA +106%→+85% ไม่ควรนับว่าแย่)
    decel: { minPp: 5, relFrac: 0.25, healthyYoyPct: 25 }, // YoY ปัจจุบันยัง ≥25% = โตแรงอยู่ ไม่นับ decel (กัน false positive จากฐานสุดขั้ว เช่น +214%→+128%)
    marginDropPp: 3,          // opMargin ล่าสุด < ค่าเฉลี่ย 4 ไตรมาสก่อน − 3pp = ผิดปกติ
    fcfDropFrac: 0.4,         // FCF ล่าสุด < 60% ของค่าเฉลี่ย 4 ไตรมาสก่อน = ผิดปกติ
    weakeningFactorsWarn: 3,  // competitive factors "weakening" ≥ 3 จาก 8 = warning
    minCompanyPillars: 3,     // pillar ระดับบริษัทที่มีข้อมูล < 3 → INSUFFICIENT
    brokenCriticals: 2,       // critical ระดับบริษัท ≥ 2 พร้อมกัน → BROKEN
    // Earnings Revision (จาก estimateHistory — append-only trail):
    expect: { improvePct: 2, deterioratePct: -2, sharpPct: -8 },
    // Drawdown episode: นับเฉพาะย่อ ≥5% จาก peak จนกลับไป peak ใหม่ (จบรอบ)
    dd: { episodeMinPct: 5, minEpisodes: 4, deepPctl: 50, extremePctl: 80,
          genericDeep: 10, genericExtreme: 20, meaningfulDip: 10 },
    // Matrix: growth สูง = fundCagr (0.6×EPS + 0.4×Rev — สูตรเดิมของ computeHistory) ≥ 15%/ปี
    matrix: { growthHighCagrPct: 15 },
    // AI Monetization: map สถานะ curated → คะแนน (ล้อ STATUS_MAP ของ ThesisEngine)
    monet: {
      statusMap: { executing: 100, "on-track": 70, "at-risk": 35 },
      accelMap: { accelerating: 85, steady: 65, decelerating: 40 },
      compMap: { strengthening: 85, stable: 65, weakening: 35 },
      strongMin: 75, moderateMin: 55,
      riskExecMin: 70, riskMonetMax: 55, // ลงทุน/execute สูงแต่ผลธุรกิจต่ำ = MONETIZATION RISK
    },
  };

  // เกณฑ์ที่ "ยืม" จาก engine เดิม — อ่านตอนรันเพื่อไม่ duplicate ค่า
  function thresholds() {
    var PM = typeof window !== "undefined" ? window.PMEngine : (typeof _PM !== "undefined" ? _PM : null);
    var pmRules = PM && PM.RULES ? PM.RULES : null;
    return {
      thesisMin: pmRules ? pmRules.THESIS_MIN : 70,        // PMEngine RULES.THESIS_MIN (Zone E gate)
      riskOffRegime: pmRules ? pmRules.RISK_OFF_REGIME : 40, // PMEngine RULES.RISK_OFF_REGIME
      thesisReview: 55,   // ThesisEngine decision cascade: thesis < 55 → review-thesis
      megaGateMin: 70,    // AdaptivePosition STATES: gate เปิดเมื่อ strong (≥70) — อ่านจาก gateOpen จริงเมื่อมี
      estRevWarnPct: -2, estRevCritPct: -8,
    };
  }
  var _PM = null; // node: ให้ opts.PM inject

  // ---------------- utils (แนวเดียวกับ ValuationEngine — กัน Number(null)=0) ----------------
  function num(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v === "string") { if (v.trim() === "") return null; var x = Number(v); return isFinite(x) ? x : null; }
    return null;
  }
  function round1(v) { return v == null ? null : Math.round(v * 10) / 10; }
  function avg(arr) {
    var s = 0, n = 0;
    for (var i = 0; i < arr.length; i++) { var v = num(arr[i]); if (v != null) { s += v; n++; } }
    return n ? s / n : null;
  }
  function pctl(sortedAsc, p) { // percentile แบบ nearest-rank บน array เรียงแล้ว
    if (!sortedAsc.length) return null;
    var idx = Math.max(0, Math.ceil((p / 100) * sortedAsc.length) - 1);
    return sortedAsc[idx];
  }

  // สถานะ pillar: ok | warn | crit | na
  function pillar(key, label, status, evidence, companyPillar, source) {
    return { key: key, label: label, status: status, evidence: evidence,
      companyPillar: !!companyPillar, source: source || "thesis-data (curated)" };
  }

  var HEALTH = {
    INTACT: { key: "INTACT", icon: "🟢", label: "INTACT", thai: "thesis ยังแข็งแรง" },
    WATCH: { key: "WATCH", icon: "🟡", label: "WATCH", thai: "มีสัญญาณให้จับตา ยังไม่ถึงขั้นเสื่อม" },
    DETERIORATING: { key: "DETERIORATING", icon: "🟠", label: "DETERIORATING", thai: "หลักฐานเสื่อมถอยต่อเนื่อง" },
    BROKEN: { key: "BROKEN", icon: "🔴", label: "BROKEN", thai: "เหตุผลที่ถือหุ้นตัวนี้ใช้ไม่ได้แล้ว" },
    INSUFFICIENT: { key: "INSUFFICIENT", icon: "⚪", label: "INSUFFICIENT DATA", thai: "ข้อมูลไม่พอสรุป" },
  };
  var EXPECT = {
    IMPROVING: { key: "IMPROVING", icon: "🟢", label: "IMPROVING", thai: "ตลาดปรับคาดการณ์ขึ้น" },
    STABLE: { key: "STABLE", icon: "🟡", label: "STABLE", thai: "คาดการณ์ทรงตัว" },
    DETERIORATING: { key: "DETERIORATING", icon: "🟠", label: "DETERIORATING", thai: "คาดการณ์ถูกปรับลง" },
    SHARP_DOWN: { key: "SHARP_DOWN", icon: "🔴", label: "SHARPLY DETERIORATING", thai: "คาดการณ์ถูกหั่นแรง" },
    INSUFFICIENT: { key: "INSUFFICIENT", icon: "⚪", label: "INSUFFICIENT DATA", thai: "ประวัติ estimate ยังไม่พอ (ต้อง ≥2 จุดเวลา)" },
  };
  var MONET = {
    STRONG: { key: "STRONG", icon: "🟢", label: "STRONG", thai: "การลงทุน AI แปลงเป็นผลธุรกิจชัด" },
    MODERATE: { key: "MODERATE", icon: "🟡", label: "MODERATE", thai: "แปลงเป็นผลธุรกิจได้ระดับกลาง" },
    MONETIZATION_RISK: { key: "MONETIZATION_RISK", icon: "🟠", label: "MONETIZATION RISK", thai: "ลงทุน/execute สูง แต่ผลธุรกิจยังไม่ตาม" },
    WEAK: { key: "WEAK", icon: "🔴", label: "WEAK", thai: "หลักฐาน monetization อ่อน" },
    INSUFFICIENT: { key: "INSUFFICIENT", icon: "⚪", label: "INSUFFICIENT DATA", thai: "ข้อมูล AI ไม่พอสรุป" },
  };
  var QUAD = {
    OPPORTUNITY: { key: "OPPORTUNITY", icon: "🟢", label: "OPPORTUNITY", thai: "โตสูง + ราคาน่าสนใจ" },
    RICH: { key: "RICH", icon: "🟡", label: "GREAT BUSINESS / PRICE RICH", thai: "ธุรกิจดี แต่ราคาแพง" },
    VALUE: { key: "VALUE", icon: "🟡", label: "VALUE / SLOW GROWTH", thai: "ราคาน่าสนใจ แต่โตช้า" },
    RISK: { key: "RISK", icon: "🔴", label: "HIGH RISK", thai: "โตช้า + ราคาแพง" },
    INSUFFICIENT: { key: "INSUFFICIENT", icon: "⚪", label: "INSUFFICIENT DATA", thai: "ข้อมูลไม่พอจัด quadrant" },
  };
  var DIP_CLS = {
    NORMAL: { key: "NORMAL", label: "NORMAL PULLBACK", thai: "ย่อระดับปกติของหุ้นตัวนี้" },
    DEEP: { key: "DEEP", label: "DEEP PULLBACK", thai: "ย่อลึกกว่ารอบส่วนใหญ่ในอดีต" },
    EXTREME: { key: "EXTREME", label: "EXTREME DRAWDOWN", thai: "ลึกระดับหายากของหุ้นตัวนี้" },
    INSUFFICIENT: { key: "INSUFFICIENT", label: "INSUFFICIENT DATA", thai: "ไม่มีข้อมูลราคาพอ" },
  };
  var INTERP = {
    HIGH_QUALITY_DIP: { key: "HIGH_QUALITY_DIP", icon: "🟢", label: "HIGH QUALITY DIP", thai: "ธุรกิจแข็งแรง + ราคาถูกลง — จังหวะสะสมมีหลักฐานรองรับ" },
    HEALTHY_DIP: { key: "HEALTHY_DIP", icon: "🟢", label: "HEALTHY DIP", thai: "ราคาลงแต่ธุรกิจยังแข็งแรง" },
    WATCH_DIP: { key: "WATCH_DIP", icon: "🟡", label: "DIP + WATCH", thai: "ราคาลงและมีสัญญาณให้จับตา — ยังไม่รีบ" },
    WATCH: { key: "WATCH", icon: "🟡", label: "WATCH", thai: "มีสัญญาณให้จับตา — ติดตามใกล้ชิด (ราคายังไม่ได้ย่อมีนัย)" },
    CAUTION: { key: "CAUTION", icon: "🟠", label: "CAUTION", thai: "พื้นฐานเสื่อมถอย — ระวัง (ดูหลักฐานราย pillar)" },
    REVIEW_THESIS: { key: "REVIEW_THESIS", icon: "🔴", label: "REVIEW THESIS", thai: "หลาย pillar พังพร้อมกัน — ทบทวน thesis ก่อน" },
    PRICE_RISK: { key: "PRICE_RISK", icon: "🟡", label: "PRICE RISK", thai: "ธุรกิจดีแต่ราคาตึงระดับสุดขั้ว" },
    MONITOR: { key: "MONITOR", icon: "🟢", label: "HEALTHY / MONITOR", thai: "ปกติดี — ติดตามต่อ" },
    INSUFFICIENT: { key: "INSUFFICIENT", icon: "⚪", label: "INSUFFICIENT DATA", thai: "ข้อมูลไม่พอสรุปภาพรวม" },
  };

  // ---------------- snapshot helpers ----------------
  function closesOf(snapshot, ticker) {
    // alias เดียวกับ PMEngine.techOf: GOOG ลอง GOOGL ด้วย
    var keys = ticker === "GOOG" ? ["GOOG", "GOOGL"] : [ticker];
    var hd = snapshot && snapshot.historicalData ? snapshot.historicalData : null;
    if (!hd) return null;
    for (var i = 0; i < keys.length; i++) {
      var h = hd[keys[i]];
      if (h && Array.isArray(h.closes) && h.closes.length >= 2) {
        return { closes: h.closes, dates: h.dates || [], key: keys[i] };
      }
    }
    return null;
  }
  function smaAt(closes, period) {
    if (!closes || closes.length < period) return null;
    var s = 0, n = 0;
    for (var i = closes.length - period; i < closes.length; i++) {
      var v = num(closes[i]); if (v == null) return null; s += v; n++;
    }
    return n === period ? s / n : null;
  }

  // ============================================================
  // F1 — THESIS BREAK DETECTOR
  // ============================================================
  // deceleration event บน series YoY: คืน "none" | "single" | "consecutive" | "na"
  function decelState(vals) { // vals = [{v: YoY%}] เรียงเก่า→ใหม่ (null = คำนวณไม่ได้)
    function decelAt(i) {
      if (i < 1) return null;
      var cur = vals[i], prev = vals[i - 1];
      if (cur == null || prev == null) return null;
      if (cur >= CONFIG.decel.healthyYoyPct) return false; // ยังโต ≥25% — ชะลอจากฐานสุดขั้วไม่ใช่หลักฐานเสื่อม
      var drop = prev - cur;
      return drop > Math.max(CONFIG.decel.minPp, CONFIG.decel.relFrac * Math.abs(prev));
    }
    var last = decelAt(vals.length - 1), prev = decelAt(vals.length - 2);
    if (last == null) return "na";
    if (last && prev === true) return "consecutive";
    if (last) return "single";
    return "none";
  }
  function yoySeries(quarters, field) {
    // YoY ของแต่ละไตรมาส = เทียบ 4 ไตรมาสก่อน · ข้ามคู่ที่ฐาน ≤ 0 (EPS ติดลบเทียบ % ไม่ได้)
    var out = [];
    for (var i = 4; i < quarters.length; i++) {
      var a = num(quarters[i][field]), b = num(quarters[i - 4][field]);
      out.push(a != null && b != null && b > 0 && a > 0 ? ((a / b) - 1) * 100 : null);
    }
    return out;
  }
  function computeHealth(cfg, o, monet, TH) {
    var pillars = [];
    var Q = cfg.history && Array.isArray(cfg.history.quarters) ? cfg.history.quarters : [];
    var hasQ = Q.length >= 6; // ≥6 = เช็ค decel จุดล่าสุดได้ (warn) · consecutive (crit) ต้อง ≥7 — 6 พอดีจะได้แค่ warn ซึ่งตั้งใจให้ conservative

    // --- growth pillars (จากงบไตรมาสจริงใน KB) ---
    function qPillar(key, label, field) {
      if (!hasQ) return pillar(key, label, "na", "ไตรมาสใน KB ไม่พอ (ต้อง ≥6)", true);
      // พลิกจากกำไรเป็นขาดทุน (เทียบไตรมาสเดียวกันปีก่อน) — YoY เทียบ % ไม่ได้ แต่คือการเสื่อมที่ชัดที่สุด
      var lastV = num(Q[Q.length - 1][field]), yagoV = Q.length >= 5 ? num(Q[Q.length - 5][field]) : null;
      if (lastV != null && yagoV != null && yagoV > 0 && lastV <= 0)
        return pillar(key, label, "crit", "พลิกจาก " + yagoV + " เป็น " + lastV + " (ปีก่อนกำไร ตอนนี้ติดลบ)", true);
      var yo = yoySeries(Q, field);
      var st = decelState(yo);
      var lastYo = yo.length ? yo[yo.length - 1] : null;
      var txt = lastYo == null ? "YoY ล่าสุดคำนวณไม่ได้ (ฐานติดลบ/ไม่มีข้อมูล)" : "YoY ล่าสุด " + round1(lastYo) + "%";
      if (st === "na") return pillar(key, label, "na", txt, true);
      if (st === "consecutive") return pillar(key, label, "crit", txt + " — ชะลอแรง 2 ไตรมาสติด", true);
      if (st === "single") return pillar(key, label, "warn", txt + " — ชะลอแรง 1 ไตรมาส (รอยืนยัน)", true);
      return pillar(key, label, "ok", txt + " — ไม่มีสัญญาณชะลอผิดปกติ", true);
    }
    pillars.push(qPillar("revenue", "Revenue growth", "revenueB"));
    pillars.push(qPillar("eps", "EPS growth", "epsAdj"));

    // --- margin: ล่าสุดเทียบค่าเฉลี่ย 4 ไตรมาสก่อนหน้า ---
    (function () {
      if (!hasQ) { pillars.push(pillar("margin", "Operating margin", "na", "ไตรมาสไม่พอ", true)); return; }
      function dropAt(i) {
        var cur = num(Q[i].opMarginPct); if (cur == null || i < 4) return null;
        var base = avg([Q[i - 1].opMarginPct, Q[i - 2].opMarginPct, Q[i - 3].opMarginPct, Q[i - 4].opMarginPct]);
        return base == null ? null : base - cur;
      }
      var dLast = dropAt(Q.length - 1), dPrev = dropAt(Q.length - 2);
      var curM = num(Q[Q.length - 1].opMarginPct);
      if (dLast == null) { pillars.push(pillar("margin", "Operating margin", "na", "ไม่มีข้อมูล margin", true)); return; }
      var txt = "ล่าสุด " + round1(curM) + "% เทียบเฉลี่ย 4 ไตรมาสก่อน" + (dLast > 0 ? " ลดลง " + round1(dLast) + "pp" : "");
      if (dLast > CONFIG.marginDropPp && dPrev != null && dPrev > CONFIG.marginDropPp)
        pillars.push(pillar("margin", "Operating margin", "crit", txt + " — ทรุด 2 ไตรมาสติด", true));
      else if (dLast > CONFIG.marginDropPp)
        pillars.push(pillar("margin", "Operating margin", "warn", txt + " — ทรุด 1 ไตรมาส (รอยืนยัน)", true));
      else pillars.push(pillar("margin", "Operating margin", "ok", txt || "ทรงตัว/ดีขึ้น", true));
    })();

    // --- FCF: ติดลบ หรือหด >40% เทียบเฉลี่ย 4 ไตรมาสก่อน ---
    (function () {
      if (!hasQ) { pillars.push(pillar("fcf", "Free cash flow", "na", "ไตรมาสไม่พอ", true)); return; }
      function weakAt(i) {
        var cur = num(Q[i].fcfB); if (cur == null || i < 4) return null;
        if (cur < 0) return "neg";
        var base = avg([Q[i - 1].fcfB, Q[i - 2].fcfB, Q[i - 3].fcfB, Q[i - 4].fcfB]);
        if (base == null || base <= 0) return null;
        return cur < base * (1 - CONFIG.fcfDropFrac) ? "drop" : "ok";
      }
      var wLast = weakAt(Q.length - 1), wPrev = weakAt(Q.length - 2);
      var curF = num(Q[Q.length - 1].fcfB);
      if (wLast == null) { pillars.push(pillar("fcf", "Free cash flow", "na", "ไม่มีข้อมูล FCF", true)); return; }
      var txt = "FCF ล่าสุด " + round1(curF) + "B";
      // FCF อยู่ในลิสต์ WARNING ของสเปค (ไม่ใช่ CRITICAL) — capex AI ทำ FCF ติดลบโดยตั้งใจได้
      // จึง cap ที่ warn เสมอ แต่บันทึกความต่อเนื่องไว้ในหลักฐาน
      if (wLast !== "ok" && wPrev != null && wPrev !== "ok")
        pillars.push(pillar("fcf", "Free cash flow", "warn", txt + " — อ่อนแรง 2 ไตรมาสติด (" + wLast + ") · ดูว่าเป็น capex ตั้งใจหรือธุรกิจแผ่ว", true));
      else if (wLast !== "ok")
        pillars.push(pillar("fcf", "Free cash flow", "warn", txt + (wLast === "neg" ? " — ติดลบ" : " — หดเกิน " + (CONFIG.fcfDropFrac * 100) + "% เทียบเฉลี่ย 4 ไตรมาส"), true));
      else pillars.push(pillar("fcf", "Free cash flow", "ok", txt + " — ปกติ", true));
    })();

    // --- earnings estimates (forwardView.estimateHistory — append-only trail) ---
    (function () {
      var eh = cfg.forwardView && Array.isArray(cfg.forwardView.estimateHistory) ? cfg.forwardView.estimateHistory : [];
      // เทียบเฉพาะแถว fy เดียวกัน (ปีอ้างอิงเลื่อน = คนละฐาน)
      var lastRow = eh.length ? eh[eh.length - 1] : null;
      var sameFy = lastRow ? eh.filter(function (r) { return r.fy === lastRow.fy && num(r.eps) != null; }) : [];
      if (sameFy.length < 2) { pillars.push(pillar("estimates", "Earnings estimates", "na", "ประวัติ estimate " + eh.length + " จุด — ต้อง ≥2 จุดใน fy เดียวกัน", true)); return; }
      var a = num(sameFy[sameFy.length - 2].eps), b = num(sameFy[sameFy.length - 1].eps);
      var chg = a > 0 ? ((b / a) - 1) * 100 : null;
      if (chg == null) { pillars.push(pillar("estimates", "Earnings estimates", "na", "ฐาน estimate ไม่คำนวณได้", true)); return; }
      var txt = "EPS consensus " + lastRow.fy + " " + a + " → " + b + " (" + (chg >= 0 ? "+" : "") + round1(chg) + "%)";
      if (chg <= TH.estRevCritPct) pillars.push(pillar("estimates", "Earnings estimates", "crit", txt + " — หั่นแรง", true));
      else if (chg <= TH.estRevWarnPct) pillars.push(pillar("estimates", "Earnings estimates", "warn", txt + " — ปรับลง", true));
      else pillars.push(pillar("estimates", "Earnings estimates", "ok", txt, true));
    })();

    // --- AI monetization (จาก F3) ---
    if (monet && monet.state && monet.state.key !== "INSUFFICIENT") {
      var mk = monet.state.key;
      pillars.push(pillar("aiMonetization", "AI monetization",
        mk === "WEAK" ? "crit" : mk === "MONETIZATION_RISK" ? "warn" : "ok",
        monet.state.label + " — " + monet.state.thai, true, "intelligence: F3 (จาก curated KB)"));
    } else {
      pillars.push(pillar("aiMonetization", "AI monetization", "na", "ข้อมูล AI ไม่พอ", true));
    }

    // --- competitive position ---
    (function () {
      var comp = cfg.competitive;
      if (!comp || !comp.overall) { pillars.push(pillar("competitive", "AI competitive position", "na", "ไม่มีข้อมูล", true)); return; }
      var weakN = (comp.factors || []).filter(function (f) { return f.status === "weakening"; }).length;
      if (comp.overall === "weakening")
        pillars.push(pillar("competitive", "AI competitive position", "crit", "ภาพรวม weakening — ฐานการแข่งขันเสื่อม", true));
      else if (weakN >= CONFIG.weakeningFactorsWarn)
        pillars.push(pillar("competitive", "AI competitive position", "warn", weakN + "/8 ปัจจัยกำลังอ่อนแรง", true));
      else pillars.push(pillar("competitive", "AI competitive position", "ok", "ภาพรวม " + comp.overall + " · อ่อนแรง " + weakN + "/8 ปัจจัย", true));
    })();

    // --- thesis score (เกณฑ์เดิม: PMEngine THESIS_MIN=70 → Zone E · TE <55 → review) ---
    (function () {
      var ts = o && o.available && o.thesis ? num(o.thesis.score) : null;
      if (ts == null) { pillars.push(pillar("thesisScore", "Investment Thesis score", "na", "ThesisEngine ไม่มีผล", true, "thesis-engine")); return; }
      if (ts < TH.thesisReview) pillars.push(pillar("thesisScore", "Investment Thesis score", "crit", ts + " < " + TH.thesisReview + " (เกณฑ์ review-thesis ของ ThesisEngine)", true, "thesis-engine"));
      else if (ts < TH.thesisMin) pillars.push(pillar("thesisScore", "Investment Thesis score", "warn", ts + " < " + TH.thesisMin + " (เกณฑ์ THESIS_MIN ของ PMEngine)", true, "thesis-engine"));
      else pillars.push(pillar("thesisScore", "Investment Thesis score", "ok", ts + "/100", true, "thesis-engine"));
    })();

    // --- market pillars (กว้างทั้งตลาด — ดันได้แค่ WATCH ไม่ใช่ BROKEN ของหุ้นรายตัว) ---
    (function () {
      var mt = o && o.inputs ? o.inputs.megaTrend : null;
      if (!mt || num(mt.score) == null) { pillars.push(pillar("megaTrend", "AI Mega Trend", "na", "ไม่มีข้อมูล (ต้องมี snapshot)", false, "adaptive-position-engine")); return; }
      if (mt.gateOpen === false) pillars.push(pillar("megaTrend", "AI Mega Trend", "warn", "score " + mt.score + " — gate ปิด (< " + TH.megaGateMin + ")", false, "adaptive-position-engine"));
      else pillars.push(pillar("megaTrend", "AI Mega Trend", "ok", "score " + mt.score + " — gate เปิด", false, "adaptive-position-engine"));
    })();
    (function () {
      var rg = o && o.inputs ? o.inputs.regime : null;
      if (!rg || num(rg.score) == null) { pillars.push(pillar("macro", "Macro regime", "na", "ไม่มีข้อมูล", false, "market-regime")); return; }
      if (rg.score < TH.riskOffRegime) pillars.push(pillar("macro", "Macro regime", "warn", "score " + rg.score + " — Risk-Off (< " + TH.riskOffRegime + ")", false, "market-regime"));
      else pillars.push(pillar("macro", "Macro regime", "ok", "score " + rg.score, false, "market-regime"));
    })();

    // --- สรุปสถานะ ---
    var company = pillars.filter(function (p) { return p.companyPillar; });
    var companyAvail = company.filter(function (p) { return p.status !== "na"; });
    var crits = company.filter(function (p) { return p.status === "crit"; });
    var warns = pillars.filter(function (p) { return p.status === "warn"; });
    var ts = o && o.available && o.thesis ? num(o.thesis.score) : null;
    var dipBroken = o && o.available && o.dipClass && o.dipClass.key === "broken";

    var state, why = [];
    if (companyAvail.length < CONFIG.minCompanyPillars) {
      state = HEALTH.INSUFFICIENT;
      why.push("pillar ระดับบริษัทที่มีข้อมูลเพียง " + companyAvail.length + "/" + company.length + " (ต้อง ≥" + CONFIG.minCompanyPillars + ")");
    } else if (crits.length >= CONFIG.brokenCriticals || (ts != null && ts < TH.thesisReview) || dipBroken) {
      state = HEALTH.BROKEN;
      if (crits.length >= CONFIG.brokenCriticals) why.push(crits.length + " pillar หลักพังพร้อมกัน: " + crits.map(function (p) { return p.label; }).join(", "));
      if (ts != null && ts < TH.thesisReview) why.push("Thesis score " + ts + " ต่ำกว่าเกณฑ์ review (" + TH.thesisReview + ")");
      if (dipBroken) why.push("ThesisEngine จัด dip class = broken");
    } else if (crits.length === 1) {
      state = HEALTH.DETERIORATING;
      why.push("pillar เสื่อมต่อเนื่อง: " + crits[0].label + " (" + crits[0].evidence + ")");
    } else if (warns.length >= 1) {
      state = HEALTH.WATCH;
      why.push("มี " + warns.length + " สัญญาณเตือน: " + warns.map(function (p) { return p.label; }).join(", "));
    } else {
      state = HEALTH.INTACT;
      why.push("ทุก pillar ที่มีข้อมูล (" + companyAvail.length + " ตัว) ปกติ");
    }
    return {
      state: state, pillars: pillars, why: why,
      counts: { criticals: crits.length, warnings: warns.length, companyAvailable: companyAvail.length, total: pillars.length },
      note: "ราคาหุ้นอย่างเดียวไม่ใช่ตัวตัดสิน thesis break — วัดจากหลักฐานธุรกิจ · pillar ตลาด (Mega Trend/Macro) ดันได้สูงสุดแค่ WATCH",
    };
  }

  // ============================================================
  // F2 — EARNINGS REVISION / EXPECTATION MOMENTUM
  // ============================================================
  function computeExpectations(cfg, TH) {
    var fv = cfg.forwardView || null;
    var eh = fv && Array.isArray(fv.estimateHistory) ? fv.estimateHistory : [];
    var gt = fv && Array.isArray(fv.guidanceTrack) ? fv.guidanceTrack : [];

    // --- revision: เทียบใน fy เดียวกันของแถวล่าสุด ---
    var lastRow = eh.length ? eh[eh.length - 1] : null;
    var sameFy = lastRow ? eh.filter(function (r) { return r.fy === lastRow.fy; }) : [];
    var revisions = null, state = EXPECT.INSUFFICIENT;
    if (sameFy.length >= 2) {
      // เทียบต่อ field เฉพาะแถวที่มีค่าจริง — KB มีแถว eps:null ปนได้ (เช่น ASML FY2026)
      function rev(field) {
        var rows = sameFy.filter(function (r) { return num(r[field]) != null; });
        if (rows.length < 2) return null;
        var first = rows[0], prev = rows[rows.length - 2], cur = rows[rows.length - 1];
        var f0 = num(first[field]), p0 = num(prev[field]), c0 = num(cur[field]);
        return {
          fy: cur.fy, current: c0, currentAsOf: cur.asOf,
          prev: p0, prevAsOf: prev.asOf,
          first: f0, firstAsOf: first.asOf,
          chgVsPrevPct: p0 > 0 ? round1(((c0 / p0) - 1) * 100) : null,
          chgVsFirstPct: f0 > 0 ? round1(((c0 / f0) - 1) * 100) : null,
        };
      }
      revisions = { eps: rev("eps"), revenue: rev("revenue"), points: sameFy.length };
      if (!revisions.eps && !revisions.revenue) revisions = null; // ไม่มี field ไหนเทียบได้เลย
      var key = revisions && revisions.eps && revisions.eps.chgVsPrevPct != null ? revisions.eps.chgVsPrevPct
        : (revisions && revisions.revenue ? revisions.revenue.chgVsPrevPct : null);
      if (key == null) state = EXPECT.INSUFFICIENT;
      else if (key <= CONFIG.expect.sharpPct) state = EXPECT.SHARP_DOWN;
      else if (key <= CONFIG.expect.deterioratePct) state = EXPECT.DETERIORATING;
      else if (key >= CONFIG.expect.improvePct) state = EXPECT.IMPROVING;
      else state = EXPECT.STABLE;
    }

    // --- surprise (หลักฐาน ไม่ใช่คำสั่งซื้อขาย): guidance บริษัท vs ทำได้จริง 4 ไตรมาสล่าสุด ---
    // guidanceTrack เรียงใหม่→เก่าเสมอ (convention บังคับใน /thesis-update + validate ใน skill) — slice(0,4) = 4 ไตรมาสล่าสุด
    var revRows = gt.filter(function (g) { return g.metric === "revenue" && g.result && g.result !== "noGuidance"; }).slice(0, 4);
    var epsRows = gt.filter(function (g) { return g.metric === "eps" && g.result && g.result !== "noGuidance"; }).slice(0, 4);
    function surStat(rows) {
      if (!rows.length) return null;
      var beats = rows.filter(function (r) { return r.result === "beat"; }).length;
      return { rows: rows.map(function (r) { return { quarter: r.quarter, result: r.result, magnitudePct: num(r.magnitudePct) }; }),
        beats: beats, n: rows.length };
    }
    return {
      state: state, revisions: revisions,
      surprise: { revenue: surStat(revRows), eps: surStat(epsRows),
        basis: "เทียบ guidance ของบริษัทเอง (จาก guidanceTrack) — ไม่ใช่ consensus ของนักวิเคราะห์" },
      asOf: fv ? fv.asOf : null,
      source: "thesis-data forwardView (curated, append-only)",
      note: sameFy.length < 2
        ? "estimateHistory มี " + eh.length + " จุด — revision trend ต้องการ ≥2 จุดใน fy เดียวกัน (สะสมเพิ่มทุกครั้งที่รัน /thesis-update)"
        : "เทียบ estimate " + sameFy.length + " จุดเวลาใน " + lastRow.fy,
    };
  }

  // ============================================================
  // F3 — AI MONETIZATION
  // ============================================================
  function computeMonetization(cfg, o) {
    var M = CONFIG.monet;
    var comps = [];
    function comp(key, label, score, evidence, source) {
      comps.push({ key: key, label: label, score: score == null ? null : Math.round(score), evidence: evidence, source: source || "thesis-data (curated)" });
    }
    var ai = cfg.aiExecution || null;

    // 1) AI Investment / Execution — aiExecution.score (curated ทุกตัว)
    comp("investment", "AI Investment / Execution", ai ? num(ai.score) : null,
      ai ? "aiExecution score จาก KB" : "—");

    // 2) AI Adoption — สถานะ initiative รายตัว (executing/on-track/at-risk)
    (function () {
      var items = ai && Array.isArray(ai.items) ? ai.items : [];
      if (!items.length) { comp("adoption", "AI Adoption (initiatives)", null, "—"); return; }
      var vals = items.map(function (it) { return M.statusMap[it.status] != null ? M.statusMap[it.status] : null; });
      var okN = items.filter(function (it) { return it.status === "executing"; }).length;
      comp("adoption", "AI Adoption (initiatives)", avg(vals),
        items.length + " initiative: executing " + okN + " · " + items.map(function (it) { return it.item + "=" + it.status; }).slice(0, 3).join(" · ") + (items.length > 3 ? " …" : ""));
    })();

    // 3) AI Demand — revenueQuality.acceleration + ทิศ segment
    (function () {
      var rq = cfg.revenueQuality || null;
      if (!rq || !rq.acceleration) { comp("demand", "AI Demand", null, "—"); return; }
      var base = M.accelMap[rq.acceleration] != null ? M.accelMap[rq.acceleration] : null;
      var segs = Array.isArray(rq.segments) ? rq.segments : [];
      var up = segs.filter(function (s) { return s.trend === "up"; }).length;
      comp("demand", "AI Demand", base,
        "revenue " + rq.acceleration + " · segment ขาขึ้น " + up + "/" + segs.length);
    })();

    // 4) AI Monetization — ผลธุรกิจที่วัดได้: fundamentals revenueGrowth + margin (แยกจาก "การลงทุน")
    var monetScore = null;
    (function () {
      var f = {};
      (cfg.fundamentals || []).forEach(function (x) { f[x.key] = x; });
      var rg = f.revenueGrowth ? num(f.revenueGrowth.score) : null;
      var mg = f.margin ? num(f.margin.score) : null;
      monetScore = avg([rg, mg]);
      comp("monetization", "AI Monetization (ผลธุรกิจ)", monetScore,
        monetScore == null ? "—" : "จาก fundamentals: revenueGrowth " + (rg == null ? "—" : rg) + " · margin " + (mg == null ? "—" : mg));
    })();

    // 5) AI Margin Impact — ทิศ margin (trend ของ fundamental)
    (function () {
      var f = (cfg.fundamentals || []).filter(function (x) { return x.key === "margin"; })[0];
      if (!f) { comp("marginImpact", "AI Margin Impact", null, "—"); return; }
      var v = f.trend === "up" ? 80 : f.trend === "flat" ? 60 : f.trend === "down" ? 35 : null; // trend แปลก/หาย = ไม่รู้ ไม่เดา
      comp("marginImpact", "AI Margin Impact", v, v == null ? "—" : "margin trend " + f.trend + " — " + (f.current || ""));
    })();

    // 6) Competitive Position
    (function () {
      var c = cfg.competitive || null;
      if (!c || !c.overall) { comp("competitive", "Competitive Position", null, "—"); return; }
      comp("competitive", "Competitive Position", M.compMap[c.overall] != null ? M.compMap[c.overall] : null, "overall " + c.overall);
    })();

    var scores = comps.map(function (c) { return c.score; }).filter(function (v) { return v != null; });
    var overall = scores.length ? Math.round(avg(scores)) : null;
    var invest = comps[0].score, adopt = comps[1].score;
    var investSide = avg([invest, adopt]);

    var state, why;
    if (scores.length < 3) { state = MONET.INSUFFICIENT; why = "มีข้อมูลเพียง " + scores.length + "/6 องค์ประกอบ"; }
    // MONETIZATION RISK: ฝั่งลงทุน/execute สูง แต่ฝั่งผลธุรกิจต่ำ — "ลงทุนเยอะไม่ใช่ข่าวดีอัตโนมัติ"
    else if (investSide != null && investSide >= M.riskExecMin && monetScore != null && monetScore < M.riskMonetMax) {
      state = MONET.MONETIZATION_RISK;
      why = "ลงทุน/execute " + Math.round(investSide) + " แต่ผลธุรกิจ " + Math.round(monetScore) + " — เงินลงไปแล้วผลยังไม่ตามมา";
    } else if (overall >= M.strongMin) { state = MONET.STRONG; why = "คะแนนรวม " + overall + " — การลงทุน AI มีผลธุรกิจที่วัดได้รองรับ"; }
    else if (overall >= M.moderateMin) { state = MONET.MODERATE; why = "คะแนนรวม " + overall; }
    else { state = MONET.WEAK; why = "คะแนนรวม " + overall + " — หลักฐาน monetization อ่อน"; }

    // trend: จาก whatChanged ทิศบวก/ลบ + acceleration
    var wc = cfg.whatChanged || [];
    var pos = wc.filter(function (w) { return w.direction === "positive"; }).length;
    var neg = wc.filter(function (w) { return w.direction === "negative"; }).length;
    var trend = pos > neg ? "improving" : neg > pos ? "deteriorating" : "flat";

    return { state: state, overall: overall, components: comps, trend: trend, why: why,
      asOf: cfg.asOf || null, source: "thesis-data (curated) — ไม่มีตัวเลข AI revenue ที่บริษัทไม่ได้เปิดเผย" };
  }

  // ============================================================
  // F4 — PRICE DRAWDOWN MAP
  // ============================================================
  function ddEpisodes(closes) {
    // รอบย่อ = จาก peak ลงไป trough แล้วกลับขึ้นมาปิดที่ peak ใหม่ (นับเฉพาะลึก ≥ episodeMinPct)
    var peak = null, trough = null, episodes = [], currentDepth = null;
    for (var i = 0; i < closes.length; i++) {
      var c = num(closes[i]); if (c == null || c <= 0) continue;
      if (peak == null || c >= peak) {
        if (peak != null && trough != null) {
          var depth = (1 - trough / peak) * 100;
          if (depth >= CONFIG.dd.episodeMinPct) episodes.push(round1(depth));
        }
        peak = c; trough = c;
      } else if (trough == null || c < trough) trough = c;
    }
    // รอบที่ยังไม่จบ = drawdown ปัจจุบัน (ไม่รวมเข้า list ประวัติ)
    if (peak != null && trough != null && trough < peak) currentDepth = round1((1 - trough / peak) * 100);
    return { episodes: episodes, currentOngoing: currentDepth };
  }
  function computeDrawdown(cfg, o, snapshot, ticker) {
    var pd = closesOf(snapshot, ticker);
    if (!pd) {
      return { available: false, classification: DIP_CLS.INSUFFICIENT,
        note: "ไม่มีข้อมูลราคาใน snapshot — กด Load Latest Data", source: "snapshot.historicalData" };
    }
    var closes = pd.closes;
    var price = null, priceDate = null;
    for (var i = closes.length - 1; i >= 0; i--) { var v = num(closes[i]); if (v != null && v > 0) { price = v; priceDate = pd.dates[i] || null; break; } }
    function maxOf(arr) { // กัน Math.max() บน array ว่าง = -Infinity
      var vals = arr.filter(function (x) { return num(x) != null; });
      return vals.length ? Math.max.apply(null, vals) : null;
    }
    var hi52 = closes.length >= 252 ? maxOf(closes.slice(-252)) : null; // <252 แท่ง = ยังไม่ครบ 52 สัปดาห์ ไม่ป้ายมั่ว
    var hiAll = maxOf(closes);
    var dataYears = round1(closes.length / 252);

    var sma50 = smaAt(closes, 50), sma200 = smaAt(closes, 200);
    var tech = snapshot && snapshot.technicalSignals ? (snapshot.technicalSignals[pd.key] || snapshot.technicalSignals[ticker]) : null;
    if (sma200 == null && tech && num(tech.sma200) != null) sma200 = num(tech.sma200);

    var ep = ddEpisodes(closes);
    var sorted = ep.episodes.slice().sort(function (a, b) { return a - b; });
    // drawdown ปัจจุบัน: ใช้ของ ThesisEngine (90 วัน + 1 ปี) เป็นหลัก — สูตรเดียวกับที่ทุกหน้าใช้
    var dd90 = o && o.available && o.falling ? num(o.falling.drawdownPct) : null;
    var dd1y = o && o.available && o.falling ? num(o.falling.drawdown1yPct) : null;
    var curDd = dd1y != null ? Math.abs(Math.min(dd1y, 0)) : (ep.currentOngoing != null ? ep.currentOngoing : null);

    var cls = DIP_CLS.NORMAL, basis;
    if (curDd == null) { cls = DIP_CLS.INSUFFICIENT; basis = "ไม่มีข้อมูล drawdown"; }
    else if (sorted.length >= CONFIG.dd.minEpisodes) {
      var p50 = pctl(sorted, CONFIG.dd.deepPctl), p80 = pctl(sorted, CONFIG.dd.extremePctl);
      basis = "เทียบการย่อในอดีตของหุ้นตัวนี้เอง " + sorted.length + " รอบ (median " + p50 + "% · p80 " + p80 + "%)";
      if (curDd >= p80) cls = DIP_CLS.EXTREME;
      else if (curDd >= p50) cls = DIP_CLS.DEEP;
    } else {
      basis = "ประวัติรอบย่อไม่พอ (" + sorted.length + " รอบ) — ใช้เกณฑ์ทั่วไป " + CONFIG.dd.genericDeep + "/" + CONFIG.dd.genericExtreme + "%";
      if (curDd >= CONFIG.dd.genericExtreme) cls = DIP_CLS.EXTREME;
      else if (curDd >= CONFIG.dd.genericDeep) cls = DIP_CLS.DEEP;
    }
    return {
      available: true,
      price: price, priceAsOf: priceDate, snapshotKey: pd.key,
      fromHigh52wPct: price != null && hi52 != null && hi52 > 0 ? round1((price / hi52 - 1) * 100) : null,
      high52w: hi52 != null && hi52 > 0 ? round1(hi52) : null,
      high52wNote: closes.length < 252 ? "ข้อมูลมี " + closes.length + " แท่ง (<252) — ยังคำนวณ high 52 สัปดาห์ไม่ได้" : null,
      fromDataHighPct: price != null && hiAll > 0 ? round1((price / hiAll - 1) * 100) : null,
      dataHighNote: "จากข้อมูลที่มี ~" + dataYears + " ปี (ไม่ใช่ all-time จริงถ้าข้อมูลสั้น)",
      dd90: dd90, dd1y: dd1y,
      currentDdPct: curDd, // ค่าที่ classification ใช้ — interpret ต้องใช้ตัวเดียวกัน
      smaDist50Pct: price != null && sma50 != null ? round1((price / sma50 - 1) * 100) : null,
      smaDist200Pct: price != null && sma200 != null ? round1((price / sma200 - 1) * 100) : null,
      history: {
        episodes: sorted, count: sorted.length,
        percentileOfCurrent: curDd != null && sorted.length
          ? Math.round((sorted.filter(function (e) { return e <= curDd; }).length / sorted.length) * 100) : null,
        maxHistorical: sorted.length ? sorted[sorted.length - 1] : null,
      },
      classification: cls, classificationBasis: basis,
      note: "บริบทจากอดีต ไม่ใช่คำพยากรณ์ (Historical context, not prediction)",
      source: "snapshot.historicalData (" + (closes.length) + " แท่ง) + ThesisEngine.falling",
    };
  }

  // ============================================================
  // F5 — GROWTH vs VALUATION
  // ============================================================
  function computeMatrixPoint(cfg, ticker, snapshot, deps) {
    var TE = deps.TE, PM = deps.PM, VE = deps.VE, data = deps.data;
    var preGrowth = deps.gsum || null; // growthSummary ที่คำนวณไว้แล้ว (เช่น r.growth จาก PMEngine) — reuse ไม่คำนวณซ้ำ
    // growth: ใช้ fundCagrPct ของ computeHistory (0.6×EPS + 0.4×Rev — สูตรที่มีอยู่แล้ว)
    var growth = null, growthWhy = "—", gsummary = null;
    try {
      var h5 = TE.computeHistory(ticker, snapshot, { data: data });
      if (h5 && h5.available && h5.metrics) {
        growth = num(h5.metrics.fundCagrPct);
        growthWhy = "fundCagr " + (growth == null ? "—" : round1(growth) + "%/ปี") +
          " (rev " + (h5.metrics.revCagrPct == null ? "—" : round1(h5.metrics.revCagrPct) + "%") +
          " · eps " + (h5.metrics.epsCagrPct == null ? "—" : round1(h5.metrics.epsCagrPct) + "%") + ")";
      }
      // growth-vs-price score เดิมของ PMEngine เป็นหลักฐานรอง
      if (preGrowth && preGrowth.windows) gsummary = preGrowth;
      else if (PM && PM.growthSummary && PM.GROWTH_WINDOWS) {
        // growthSummary รับ array เรียง index ตรงกับ windows (ดู PMEngine L68) — ห้ามส่ง object
        var hs = PM.GROWTH_WINDOWS.map(function (y) {
          try { return TE.computeHistory(ticker, snapshot, { data: data, years: y }); } catch (e2) { return null; }
        });
        gsummary = PM.growthSummary(hs, PM.GROWTH_WINDOWS);
      }
    } catch (e) { /* growth = null */ }

    var val = null;
    try {
      var V = VE.compute(ticker, snapshot || {}, { data: data });
      if (V && V.available) {
        val = { classification: V.classification, percentile: V.percentile ? V.percentile.value : null,
          peNow: V.pe ? V.pe.current : null, median: V.history ? V.history.median : null,
          premiumVsMedianPct: V.premiumVsMedianPct, forwardPe: V.forwardPe ? V.forwardPe.pe : null };
      }
    } catch (e3) { /* val = null */ }

    var quadrant = QUAD.INSUFFICIENT, cheap = null;
    if (val && val.classification && val.classification !== "INSUFFICIENT_DATA" && growth != null) {
      cheap = val.classification === "ATTRACTIVE" || val.classification === "FAIR";
      var hi = growth >= CONFIG.matrix.growthHighCagrPct;
      quadrant = hi && cheap ? QUAD.OPPORTUNITY : hi ? QUAD.RICH : cheap ? QUAD.VALUE : QUAD.RISK;
    }
    return {
      ticker: ticker, name: cfg.name || ticker,
      growthCagrPct: growth == null ? null : round1(growth), growthWhy: growthWhy,
      growthVsPrice: gsummary ? { score: gsummary.score, label: gsummary.label } : null,
      valuation: val, quadrant: quadrant,
      thresholds: { growthHighCagrPct: CONFIG.matrix.growthHighCagrPct, cheapClasses: "ATTRACTIVE/FAIR (จาก Valuation Engine percentile)" },
      note: "เครื่องมือให้บริบท — ไม่ใช่คำแนะนำซื้อขายโดยตรง",
      source: "thesis-engine computeHistory + valuation-engine (" + (val ? "val-2" : "ไม่มีผล") + ")",
    };
  }

  // ============================================================
  // F6 — AI VALUE CHAIN POSITION
  // ============================================================
  function computeValueChain(cfg, ticker, snapshot, deps) {
    var layerKey = cfg.layer || null;
    if (!layerKey) return { available: false, note: "ไม่มี layer ใน KB" };
    var R = deps.R;
    if (!R && deps.AIR && typeof deps.AIR.compute === "function") {
      try { R = deps.AIR.compute(snapshot || {}); } catch (e) { R = null; }
    }
    var AIR = deps.AIR;
    var layerMeta = null;
    if (AIR && Array.isArray(AIR.LAYERS)) {
      layerMeta = AIR.LAYERS.filter(function (l) { return l.key === layerKey; })[0] || null;
    }
    var rLayer = null, phase = null, nextPhase = null;
    if (R && R.available) {
      rLayer = (R.layers || []).filter(function (l) { return l.key === layerKey; })[0] || null;
      phase = R.phase ? R.phase.current : null;
      nextPhase = R.phase ? R.phase.next : null;
    }
    // benefit = affinity ของ layer ต่อ phase ปัจจุบัน (นิยามเดิมใน AIRotationEngine.PHASES)
    var aff = null, nextAff = null;
    if (AIR && Array.isArray(AIR.PHASES) && phase) {
      var ph = AIR.PHASES.filter(function (p) { return p.key === phase.key; })[0];
      var np = nextPhase ? AIR.PHASES.filter(function (p) { return p.key === nextPhase.key; })[0] : null;
      aff = ph && ph.affinity ? (ph.affinity[layerKey] || 0) : null;
      nextAff = np && np.affinity ? (np.affinity[layerKey] || 0) : null;
    }
    var BEN = { 3: "HIGH", 2: "MEDIUM-HIGH", 1: "MEDIUM", 0: "LOW" };
    var segs = cfg.revenueQuality && Array.isArray(cfg.revenueQuality.segments) ? cfg.revenueQuality.segments : [];
    return {
      available: true,
      layerKey: layerKey,
      layerName: layerMeta ? layerMeta.name : layerKey,
      layerThesis: layerMeta ? layerMeta.thesis : null,
      // exposure จริงจาก segment ที่ curate ไว้ — ไม่แต่ง secondary ที่ไม่มีหลักฐาน
      exposureDetail: segs.map(function (s) { return { name: s.name, sharePct: s.sharePct, trend: s.trend }; }),
      phase: phase ? { key: phase.key, name: phase.name } : null,
      nextPhase: nextPhase ? { key: nextPhase.key, name: nextPhase.name } : null,
      benefit: aff == null ? null : (BEN[aff] || "LOW"),
      benefitNext: nextAff == null ? null : (BEN[nextAff] || "LOW"),
      benefitWhy: aff == null ? "ไม่มีผล AIRotationEngine (ต้องมี snapshot)" :
        "affinity ของ layer " + layerKey + " ต่อ phase ปัจจุบัน = " + aff + "/3 · phase ถัดไป = " + (nextAff == null ? "—" : nextAff + "/3"),
      rotation: rLayer ? { score: rLayer.rotationScore, direction: rLayer.direction, momentum: rLayer.momentum, trendLabel: rLayer.trendLabel } : null,
      trend: rLayer ? (rLayer.direction === "in" || rLayer.direction === "hot" ? "up" : rLayer.direction === "out" ? "down" : "flat") : null,
      competitivePosition: cfg.competitive ? cfg.competitive.overall : null,
      source: "ai-rotation-engine (LAYERS/PHASES/compute) + thesis-data.layer/segments",
    };
  }

  // ============================================================
  // INTEGRATION — สรุปหนึ่งคำตอบ + safety gate
  // ============================================================
  function interpret(health, drawdown, matrixPoint, TH) {
    var hk = health.state.key;
    var dd = drawdown && drawdown.available ? (drawdown.currentDdPct != null ? drawdown.currentDdPct : (drawdown.dd1y != null ? Math.abs(Math.min(drawdown.dd1y, 0)) : null)) : null;
    var val = matrixPoint && matrixPoint.valuation ? matrixPoint.valuation : null;
    var cheap = val && (val.classification === "ATTRACTIVE" || (val.classification === "FAIR" && num(val.premiumVsMedianPct) != null && val.premiumVsMedianPct < 0));
    var extreme = val && (val.classification === "EXPENSIVE" || (num(val.percentile) != null && val.percentile > 90));
    var why = [];

    if (hk === "INSUFFICIENT") return { state: INTERP.INSUFFICIENT, why: health.why };
    if (hk === "BROKEN") return { state: INTERP.REVIEW_THESIS, why: health.why };
    if (hk === "DETERIORATING") {
      why = health.why.slice();
      if (dd != null && dd >= CONFIG.dd.meaningfulDip) why.push("ราคาลง " + round1(dd) + "% พร้อมพื้นฐานเสื่อม — ไม่ใช่ dip ธรรมดา");
      return { state: INTERP.CAUTION, why: why };
    }
    var dipping = dd != null && dd >= CONFIG.dd.meaningfulDip;
    if (dipping && hk === "INTACT" && cheap) {
      why.push("ย่อ " + round1(dd) + "% จาก high 1 ปี ขณะที่ pillar ธุรกิจปกติทุกตัว");
      why.push("valuation " + val.classification + (val.premiumVsMedianPct != null ? " (" + val.premiumVsMedianPct + "% เทียบ median ตัวเอง)" : ""));
      return { state: INTERP.HIGH_QUALITY_DIP, why: why };
    }
    if (dipping && hk === "INTACT") {
      why.push("ย่อ " + round1(dd) + "% แต่หลักฐานธุรกิจยังปกติ" + (val ? " · valuation " + val.classification : ""));
      return { state: INTERP.HEALTHY_DIP, why: why };
    }
    if (dipping && hk === "WATCH") {
      why = health.why.slice(); why.push("ราคาย่อ " + round1(dd) + "% — รอสัญญาณเตือนเคลียร์ก่อน");
      return { state: INTERP.WATCH_DIP, why: why };
    }
    if (!dipping && extreme && (hk === "INTACT" || hk === "WATCH")) {
      // dd == null = ไม่มีข้อมูลราคา — ห้าม assert ว่า "ราคาไม่ได้ย่อ" (no fabrication)
      why.push("valuation ตึงระดับสุดขั้ว (" + (val ? val.classification + " · percentile " + val.percentile : "") + ")" +
        (dd != null ? " ขณะราคาไม่ได้ย่อมีนัย" : " (ยังไม่มีข้อมูลราคาใน snapshot — ยืนยันการย่อไม่ได้)"));
      return { state: INTERP.PRICE_RISK, why: why };
    }
    why = health.why.slice();
    if (hk === "WATCH") return { state: INTERP.WATCH, why: why }; // ไม่มี dip มีนัย — ห้ามใช้ป้ายที่อ้างว่าราคาลง
    return { state: INTERP.MONITOR, why: why };
  }

  // safety gate ให้ Accumulation Zone (ไม่แทน zoneOf — เป็นชั้นหลักฐานเพิ่ม):
  //   BROKEN        → บังคับ Zone E (ห้ามเป็นโอกาสสะสมปกติ)
  //   DETERIORATING → A/B ถูกลดเหลือ C (สะสมได้แบบระวังเท่านั้น)
  //   WATCH         → zone เดิม + ป้ายเตือน
  function gateZone(zoneKey, healthState) {
    var hk = healthState && healthState.key ? healthState.key : healthState;
    if (!zoneKey || !hk) return { zoneKey: zoneKey, overridden: false, warn: false, why: null };
    if (hk === "BROKEN" && zoneKey !== "E")
      return { zoneKey: "E", overridden: true, warn: true, why: "Thesis Health = BROKEN — ระบบยกระดับเป็น Zone E (Review Thesis) ทับ zone เดิม (" + zoneKey + ")" };
    if (hk === "DETERIORATING" && (zoneKey === "A" || zoneKey === "B"))
      return { zoneKey: "C", overridden: true, warn: true, why: "Thesis Health = DETERIORATING — ลดจาก Zone " + zoneKey + " เหลือ C (สะสมแบบระวัง รอหลักฐานกลับ)" };
    if (hk === "DETERIORATING" || hk === "WATCH")
      return { zoneKey: zoneKey, overridden: false, warn: true, why: "Thesis Health = " + hk + " — ดูหลักฐานใน Intelligence ก่อนวางเงิน" };
    return { zoneKey: zoneKey, overridden: false, warn: false, why: null };
  }

  // ============================================================
  // MAIN
  // ============================================================
  function deps(opts) {
    opts = opts || {};
    var W = typeof window !== "undefined" ? window : {};
    return {
      data: opts.data || W.ThesisData || null,
      TE: opts.TE || W.ThesisEngine || null,
      VE: opts.VE || W.ValuationEngine || null,
      PM: opts.PM || W.PMEngine || null,
      AIR: opts.AIR || W.AIRotationEngine || null,
      R: opts.R || null, // ผล AIRotationEngine.compute ที่คำนวณไว้แล้ว (optional — จะคำนวณเองถ้ามี AIR)
      o: opts.o || null, // ผล ThesisEngine.compute ที่คำนวณไว้แล้ว (optional)
      gsum: opts.gsum || null, // ผล PMEngine.growthSummary ที่คำนวณไว้แล้ว (optional — PM page ส่ง r.growth)
    };
  }

  function compute(ticker, snapshot, opts) {
    var d = deps(opts);
    _PM = d.PM;
    var out = { version: VERSION, ticker: ticker, generatedAt: null, available: false };
    if (!d.data || !d.data.companies || !d.data.companies[ticker]) { out.reason = "no-config"; return out; }
    if (!d.TE || typeof d.TE.compute !== "function") { out.reason = "no-thesis-engine"; return out; }
    var cfg = d.data.companies[ticker];
    var TH = thresholds();
    try {
      var o = d.o;
      if (!o) { try { o = d.TE.compute(ticker, snapshot || {}, { data: d.data }); } catch (eo) { o = null; } }
      var monet = computeMonetization(cfg, o);
      var health = computeHealth(cfg, o, monet, TH);
      var expectations = computeExpectations(cfg, TH);
      var drawdown = computeDrawdown(cfg, o, snapshot, ticker);
      var matrixPoint = computeMatrixPoint(cfg, ticker, snapshot, d);
      var valueChain = computeValueChain(cfg, ticker, snapshot, d);
      var summary = interpret(health, drawdown, matrixPoint, TH);

      out.available = true;
      out.name = cfg.name || ticker;
      out.asOf = cfg.asOf || null;
      out.stale = o && o.available ? !!o.stale : null;
      out.thesisScore = o && o.available ? o.thesis.score : null;
      out.megaTrend = o && o.available && o.inputs ? o.inputs.megaTrend : null;
      out.health = health;
      out.expectations = expectations;
      out.aiMonetization = monet;
      out.drawdown = drawdown;
      out.matrixPoint = matrixPoint;
      out.valueChain = valueChain;
      out.summary = summary;
      out.thresholdsUsed = TH;
      return out;
    } catch (e) {
      out.reason = "error"; out.error = String(e && e.message ? e.message : e);
      return out;
    }
  }

  // matrix รวมทุก ticker ใน KB (ให้หน้า UI วาด scatter) — ข้ามตัวที่ไม่มี history (เช่น QQQM)
  function matrix(snapshot, opts) {
    var d = deps(opts);
    if (!d.data || !d.data.companies) return { available: false, points: [] };
    var pts = [];
    Object.keys(d.data.companies).forEach(function (t) {
      var cfg = d.data.companies[t];
      if (!cfg.history || !Array.isArray(cfg.history.years) || !cfg.history.years.length) return;
      try { pts.push(computeMatrixPoint(cfg, t, snapshot, d)); } catch (e) { /* ข้ามตัวที่พัง */ }
    });
    return { available: pts.length > 0, points: pts,
      note: "Growth = fundCagr (0.6×EPS + 0.4×Rev, computeHistory เดิม) · Valuation = Valuation Engine percentile เทียบอดีตตัวเอง — บริบท ไม่ใช่คำแนะนำซื้อขาย" };
  }

  var IntelligenceEngine = {
    VERSION: VERSION, CONFIG: CONFIG,
    HEALTH: HEALTH, EXPECT: EXPECT, MONET: MONET, QUAD: QUAD, DIP_CLS: DIP_CLS, INTERP: INTERP,
    compute: compute, matrix: matrix, gateZone: gateZone,
    // เปิด internal ให้ test แบบ deterministic
    _internal: { decelState: decelState, yoySeries: yoySeries, ddEpisodes: ddEpisodes, thresholds: thresholds,
      computeHealth: computeHealth, computeExpectations: computeExpectations, computeMonetization: computeMonetization },
  };
  if (typeof window !== "undefined") window.IntelligenceEngine = IntelligenceEngine;
  if (typeof module !== "undefined" && module.exports) module.exports = IntelligenceEngine;
})();
