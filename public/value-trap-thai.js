(function () {
  "use strict";
  // ============================================================
  // THAI VALUE TRAP (PHASE 3.2 · P0b)
  //
  // ปัญหาที่ audit พบ: computeTrap เดิมอ่านจาก thesis-data.js ซึ่งไม่มีหุ้นไทย
  // ทำให้ value trap = UNKNOWN ทั้ง 280/280 ตัว — เกตความปลอดภัยไม่ทำงานเลย
  // ทั้งที่เฟส 3 ต่องบ SET (16-18 ไตรมาส) ได้แล้ว
  //
  // โมดูลนี้ใช้ "ข้อมูลที่มีอยู่แล้ว" จาก lib/evidence/thaiFinancialAdapter
  // ไม่ดึงแหล่งใหม่ ไม่ให้คะแนน 0-100 ไม่มีกฎเฉพาะ ticker
  //
  // หลักการที่ห้ามพัง:
  //  1. UNKNOWN = หลักฐานไม่พอ "ไม่ใช่ปลอดภัย" เด็ดขาด
  //  2. ไตรมาสแย่ไตรมาสเดียวไม่ใช่ value trap — ต้องเห็นความเสื่อมต่อเนื่องหลายไตรมาส
  //  3. ห้ามใช้กฎง่าย ๆ แบบ "รายได้ลด = value trap"
  //     เป้าหมายคือ "ความเสื่อมเชิงโครงสร้าง" ไม่ใช่ความอ่อนแอชั่วคราว
  //  4. สัญญาณที่ดีขึ้นต้องหักล้างสัญญาณเสื่อมได้ (รายได้ลดแต่มาร์จิ้นดีขึ้น ≠ เสื่อมโครงสร้าง)
  //  5. ราคาไม่เกี่ยวข้องที่นี่เลย — ไฟล์นี้เห็นแค่ตัวเลขงบ
  // ============================================================

  var VERSION = "1.0.0";

  var RISK = {
    UNKNOWN: { key: "UNKNOWN", icon: "⚪", label: "DATA UNAVAILABLE",
      thai: "หลักฐานงบไม่พอสรุป — ไม่ได้แปลว่าปลอดภัย" },
    LOW: { key: "LOW", icon: "🟢", label: "LOW", thai: "ตรวจงบหลายไตรมาสแล้ว ไม่พบความเสื่อมเชิงโครงสร้าง" },
    MEDIUM: { key: "MEDIUM", icon: "🟡", label: "MEDIUM", thai: "มีสัญญาณเสื่อมบางส่วน แต่ยังไม่ครบรูปแบบโครงสร้าง" },
    HIGH: { key: "HIGH", icon: "🔴", label: "HIGH", thai: "เห็นความเสื่อมเชิงโครงสร้างต่อเนื่องหลายไตรมาส" },
  };

  var CFG = {
    minQuarters: 6,          // ต้องมีอย่างน้อย 6 งวดจึงประเมินได้ (เทียบ YoY + ดูแนวโน้ม)
    trendWindow: 4,          // ดูแนวโน้ม 4 ไตรมาสล่าสุด
    persistRatio: 0.6,       // ต้องเสื่อมอย่างน้อย 60% ของช่วงที่ดู
    revDeclinePct: -10,      // รายได้ YoY ต่ำกว่า -10% ถือว่าลดอย่างมีนัย
    epsDeclinePct: -20,
    debtRisePct: 15,         // หนี้ YoY เพิ่มเกิน 15%
    marginDeterioratePp: -3, // มาร์จิ้นแย่ลงเกิน 3pp
    weakRoe: 0,              // ROE ติดลบ = อ่อนแอ
    highSignalsForHigh: 3,   // ต้องมี ≥3 สัญญาณโครงสร้างจึงเป็น HIGH
    netForHigh: 2,           // และหลังหักสัญญาณที่ดีขึ้นแล้วต้องเหลือ ≥2
  };

  function num(v) { return typeof v === "number" && isFinite(v) ? v : null; }
  function r1(v) { return v == null ? null : Math.round(v * 10) / 10; }

  function seriesOf(quarters, field) {
    return (quarters || []).map(function (q) { return { date: q.date, v: num(q[field]) }; })
      .filter(function (x) { return x.v != null; });
  }
  function pctChange(now, then) {
    var a = num(now), b = num(then);
    if (a == null || b == null || b === 0) return null;
    return ((a - b) / Math.abs(b)) * 100;
  }

  // ---------- ความต่อเนื่องของการเสื่อม ----------
  // ไตรมาสแย่ไตรมาสเดียวไม่นับ — ต้องเห็นทิศทางลงเป็นส่วนใหญ่ของช่วงที่ดู
  function declineTrend(series, window) {
    var w = Math.min(window || CFG.trendWindow, series.length - 1);
    if (w < 2) return null;
    var recent = series.slice(-(w + 1));
    var down = 0, steps = 0;
    for (var i = 1; i < recent.length; i++) {
      steps++;
      if (recent[i].v < recent[i - 1].v) down++;
    }
    return { down: down, steps: steps, ratio: steps ? down / steps : null,
      persistent: steps >= 2 && (down / steps) >= CFG.persistRatio };
  }

  // ---------- ประเมิน ----------
  function assess(quarters, opts) {
    opts = opts || {};
    var qs = Array.isArray(quarters) ? quarters.slice() : [];
    qs.sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });

    if (qs.length < CFG.minQuarters) {
      return {
        version: VERSION, risk: RISK.UNKNOWN, signals: [], improving: [], detail: {},
        quartersUsed: qs.length,
        note: "มีงบเพียง " + qs.length + " ไตรมาส (ต้องมี " + CFG.minQuarters + ") — " +
          "หลักฐานไม่พอสรุป และ UNKNOWN ไม่ได้แปลว่าปลอดภัย",
      };
    }

    var signals = [];     // สัญญาณเสื่อมเชิงโครงสร้าง
    var improving = [];   // สัญญาณที่ดีขึ้น (ใช้หักล้าง)
    var detail = {};

    var rev = seriesOf(qs, "revenue");
    var eps = seriesOf(qs, "eps");
    var mgn = seriesOf(qs, "operatingMargin");
    var fcf = seriesOf(qs, "fcf");
    var debt = seriesOf(qs, "totalDebt");
    var roe = seriesOf(qs, "roe");
    var roa = seriesOf(qs, "roa");

    function yoy(series) {
      if (series.length < 5) return null;
      return pctChange(series[series.length - 1].v, series[series.length - 5].v);
    }

    // 1) รายได้เสื่อมต่อเนื่อง — ต้องทั้งลด YoY อย่างมีนัย และมีแนวโน้มลงต่อเนื่อง
    var revYoY = yoy(rev), revTrend = declineTrend(rev);
    detail.revenueYoYPct = r1(revYoY);
    detail.revenueTrend = revTrend;
    if (revYoY != null && revYoY <= CFG.revDeclinePct && revTrend && revTrend.persistent) {
      signals.push("รายได้ลดต่อเนื่อง (YoY " + r1(revYoY) + "% และลง " + revTrend.down + "/" + revTrend.steps + " ไตรมาสล่าสุด)");
    } else if (revYoY != null && revYoY >= 10) {
      improving.push("รายได้โต YoY " + r1(revYoY) + "%");
    }

    // 2) กำไรต่อหุ้นเสื่อมต่อเนื่อง
    var epsYoY = yoy(eps), epsTrend = declineTrend(eps);
    detail.epsYoYPct = r1(epsYoY);
    var epsLatest = eps.length ? eps[eps.length - 1].v : null;
    var epsNegCount = eps.slice(-CFG.trendWindow).filter(function (x) { return x.v < 0; }).length;
    detail.epsNegativeQuarters = epsNegCount;
    if (epsYoY != null && epsYoY <= CFG.epsDeclinePct && epsTrend && epsTrend.persistent) {
      signals.push("กำไรต่อหุ้นลดต่อเนื่อง (YoY " + r1(epsYoY) + "%)");
    }
    // ขาดทุนซ้ำหลายไตรมาส = สัญญาณโครงสร้าง (ไม่ใช่ไตรมาสเดียว)
    if (epsNegCount >= 3) {
      signals.push("ขาดทุนต่อหุ้น " + epsNegCount + " จาก " + CFG.trendWindow + " ไตรมาสล่าสุด");
    } else if (epsYoY != null && epsYoY >= 20) {
      improving.push("กำไรต่อหุ้นโต YoY " + r1(epsYoY) + "%");
    }

    // 3) มาร์จิ้นเสื่อม / ติดลบเรื้อรัง
    var mgnLatestPct = mgn.length ? mgn[mgn.length - 1].v * 100 : null;
    var mgnBasePct = mgn.length >= 5 ? mgn[mgn.length - 5].v * 100 : null;
    var mgnPp = (mgnLatestPct != null && mgnBasePct != null) ? mgnLatestPct - mgnBasePct : null;
    detail.marginLatestPct = r1(mgnLatestPct);
    detail.marginYoYPp = r1(mgnPp);
    var mgnNegCount = mgn.slice(-CFG.trendWindow).filter(function (x) { return x.v < 0; }).length;
    detail.marginNegativeQuarters = mgnNegCount;
    if (mgnPp != null && mgnPp <= CFG.marginDeterioratePp) {
      signals.push("มาร์จิ้นแย่ลง " + r1(Math.abs(mgnPp)) + "pp จากปีก่อน");
    }
    // ติดลบเรื้อรังทุกไตรมาสที่ดู = โครงสร้าง ไม่ใช่ชั่วคราว
    if (mgnNegCount >= CFG.trendWindow) {
      signals.push("มาร์จิ้นติดลบทุกไตรมาสใน " + CFG.trendWindow + " ไตรมาสล่าสุด (ล่าสุด " + r1(mgnLatestPct) + "%)");
    }
    if (mgnPp != null && mgnPp >= 3 && mgnLatestPct != null && mgnLatestPct > 0) {
      improving.push("มาร์จิ้นเป็นบวกและดีขึ้น " + r1(mgnPp) + "pp");
    }

    // 4) กระแสเงินสดจากดำเนินงาน/FCF ติดลบซ้ำ
    var fcfNegCount = fcf.slice(-CFG.trendWindow).filter(function (x) { return x.v < 0; }).length;
    detail.fcfNegativeQuarters = fcfNegCount;
    detail.fcfLatest = fcf.length ? fcf[fcf.length - 1].v : null;
    if (fcfNegCount >= 3) {
      signals.push("กระแสเงินสดอิสระติดลบ " + fcfNegCount + " จาก " + CFG.trendWindow + " ไตรมาสล่าสุด");
    } else if (fcfNegCount === 0 && fcf.length >= CFG.trendWindow) {
      improving.push("กระแสเงินสดอิสระเป็นบวกทุกไตรมาสที่ดู");
    }

    // 5) หนี้/หนี้สินรวมเพิ่มขึ้นต่อเนื่อง
    var debtYoY = yoy(debt);
    var debtTrend = debt.length >= 3 ? declineTrend(debt.map(function (x) { return { date: x.date, v: -x.v }; })) : null;
    detail.debtYoYPct = r1(debtYoY);
    if (debtYoY != null && debtYoY >= CFG.debtRisePct && debtTrend && debtTrend.persistent) {
      signals.push("หนี้สินรวมเพิ่มต่อเนื่อง (YoY +" + r1(debtYoY) + "%)");
    } else if (debtYoY != null && debtYoY <= -10) {
      improving.push("หนี้สินรวมลดลง YoY " + r1(debtYoY) + "%");
    }

    // 6) ROE/ROA อ่อนแอเรื้อรัง
    var roeNegCount = roe.slice(-CFG.trendWindow).filter(function (x) { return x.v <= CFG.weakRoe; }).length;
    var roaNegCount = roa.slice(-CFG.trendWindow).filter(function (x) { return x.v <= CFG.weakRoe; }).length;
    detail.roeWeakQuarters = roeNegCount;
    detail.roeLatest = roe.length ? r1(roe[roe.length - 1].v) : null;
    if (roe.length >= CFG.trendWindow && roeNegCount >= CFG.trendWindow) {
      signals.push("ROE ติดลบทุกไตรมาสใน " + CFG.trendWindow + " ไตรมาสล่าสุด");
    } else if (roa.length >= CFG.trendWindow && roaNegCount >= 3) {
      signals.push("ROA อ่อนแอ " + roaNegCount + " จาก " + CFG.trendWindow + " ไตรมาสล่าสุด");
    }

    // 7) การปรับปรุงงบย้อนหลัง = สัญญาณเตือนด้านคุณภาพข้อมูล/บัญชี
    var restated = qs.filter(function (q) { return q.restated === true; });
    detail.restatedQuarters = restated.length;
    if (restated.length >= 2) {
      signals.push("งบถูกปรับปรุงย้อนหลัง " + restated.length + " งวด — สัญญาณเตือนด้านคุณภาพงบ");
    } else if (restated.length === 1) {
      // งวดเดียวยังไม่สรุป — บันทึกไว้ให้เห็น แต่ไม่นับเป็นสัญญาณทั้งด้านเสื่อมและด้านดี
      detail.restatementNote = "มีการปรับปรุงงบ 1 งวด — บันทึกไว้แต่ยังไม่ถือเป็นสัญญาณ";
    }

    // ---------- สรุประดับความเสี่ยง ----------
    var net = signals.length - improving.length;
    detail.signalCount = signals.length;
    detail.improvingCount = improving.length;
    detail.netSignals = net;

    var risk;
    if (signals.length >= CFG.highSignalsForHigh && net >= CFG.netForHigh) risk = RISK.HIGH;
    else if (signals.length >= 1) risk = RISK.MEDIUM;
    else risk = RISK.LOW;

    var note;
    if (risk === RISK.HIGH) {
      note = "พบสัญญาณเสื่อมเชิงโครงสร้าง " + signals.length + " ข้อ (หักสัญญาณที่ดีขึ้น " +
        improving.length + " ข้อแล้วเหลือ " + net + ") จากงบ " + qs.length + " ไตรมาส";
    } else if (risk === RISK.MEDIUM) {
      note = "พบสัญญาณเสื่อม " + signals.length + " ข้อ แต่ยังไม่ครบรูปแบบโครงสร้าง" +
        (improving.length ? " และมีสัญญาณที่ดีขึ้น " + improving.length + " ข้อถ่วงไว้" : "");
    } else {
      note = "ตรวจงบ " + qs.length + " ไตรมาสแล้วไม่พบสัญญาณเสื่อมเชิงโครงสร้าง" +
        (improving.length ? " · มีสัญญาณที่ดีขึ้น " + improving.length + " ข้อ" : "");
    }

    return {
      version: VERSION, risk: risk, signals: signals, improving: improving, detail: detail,
      quartersUsed: qs.length, note: note,
    };
  }

  // สร้างชุดไตรมาสจากผลของ FinancialInflection (ซึ่งเก็บ series ของแต่ละรายการไว้)
  // ใช้เมื่อมีแต่ผล inflection ไม่มีไตรมาสดิบ — ไม่ดึงข้อมูลใหม่
  function quartersFromInflection(inflection) {
    if (!inflection || !inflection.metrics) return [];
    var map = {};
    var pick = [
      ["REVENUE_INFLECTION", "revenue"], ["EPS_INFLECTION", "eps"],
      ["MARGIN_INFLECTION", "operatingMargin"], ["FCF_INFLECTION", "fcf"],
      ["DEBT_IMPROVEMENT", "totalDebt"],
    ];
    pick.forEach(function (pair) {
      var m = inflection.metrics[pair[0]];
      if (!m || !Array.isArray(m.series)) return;
      m.series.forEach(function (x) {
        if (!x || !x.date) return;
        if (!map[x.date]) map[x.date] = { date: x.date };
        map[x.date][pair[1]] = x.v;
      });
    });
    return Object.keys(map).sort().map(function (d) { return map[d]; });
  }

  var ValueTrapThai = {
    VERSION: VERSION, RISK: RISK, CFG: CFG,
    assess: assess, quartersFromInflection: quartersFromInflection,
    _internal: { declineTrend: declineTrend, seriesOf: seriesOf, pctChange: pctChange },
  };

  if (typeof window !== "undefined") window.ValueTrapThai = ValueTrapThai;
  if (typeof module !== "undefined" && module.exports) module.exports = ValueTrapThai;
})();
