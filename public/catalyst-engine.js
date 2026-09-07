(function () {
  "use strict";
  // ============================================================
  // THAI CATALYST HUNTER — deterministic engine (SET + mai)
  //
  // คำถามเดียวที่ตอบ: "มีอะไรเปลี่ยนในธุรกิจจนตลาดอาจตีมูลค่าใหม่ไหม"
  // ไม่ใช่ตัวกรองหุ้นถูก · ไม่ใช่สัญญาณซื้อขาย · ไม่มีคะแนนรวมก้อนเดียว
  //
  // แบ่งชัดเป็น 2 ระนาบ:
  //  1) PRICE PLANE  — คำนวณจากราคา/วอลุ่มจริง (Yahoo .BK ผ่าน API เดิม)
  //     Stage 1 Deep Drawdown · Stage 6 Market Recognition
  //  2) STORY PLANE  — ต้องมาจาก catalyst KB ที่ curate เท่านั้น
  //     Stage 2 Why Fell · 3 Catalyst · 4 Evidence · 5 Inflection · 8 Maturity
  //     ไม่มีใน KB = DATA_UNAVAILABLE (ห้ามเดาจากราคา)
  //
  // LLM ห้ามตัดสิน stage ใด ๆ — ทุก state มาจากกฎในไฟล์นี้
  // ============================================================

  var VERSION = "1.0.0";

  // ---------------- states ----------------
  var DD = {
    NORMAL: { key: "NORMAL", icon: "⚪", label: "NORMAL", thai: "ยังไม่ย่อมีนัย", rank: 0 },
    PULLBACK: { key: "PULLBACK", icon: "🟡", label: "PULLBACK", thai: "ย่อปกติ", rank: 1 },
    DEEP_DRAWDOWN: { key: "DEEP_DRAWDOWN", icon: "🟠", label: "DEEP DRAWDOWN", thai: "ย่อลึก", rank: 2 },
    SEVERE_DRAWDOWN: { key: "SEVERE_DRAWDOWN", icon: "🔴", label: "SEVERE DRAWDOWN", thai: "ย่อหนัก", rank: 3 },
    EXTREME_DRAWDOWN: { key: "EXTREME_DRAWDOWN", icon: "🔴", label: "EXTREME DRAWDOWN", thai: "ย่อรุนแรง", rank: 4 },
    INSUFFICIENT: { key: "INSUFFICIENT", icon: "⚪", label: "DATA UNAVAILABLE", thai: "ข้อมูลราคาไม่พอ", rank: -1 },
  };
  var WHY_FELL = ["EARNINGS_DECLINE", "MARGIN_COMPRESSION", "REVENUE_DECLINE", "INDUSTRY_DOWNTURN",
    "COMMODITY_CYCLE", "DEBT_OR_LIQUIDITY", "CORPORATE_PROBLEM", "REGULATORY", "ONE_OFF_EVENT",
    "VALUATION_DE_RATING", "MARKET_PANIC", "UNKNOWN"];
  var WHY_FELL_TH = {
    EARNINGS_DECLINE: "กำไรลดลง", MARGIN_COMPRESSION: "มาร์จิ้นถูกบีบ", REVENUE_DECLINE: "รายได้หด",
    INDUSTRY_DOWNTURN: "อุตสาหกรรมขาลง", COMMODITY_CYCLE: "วัฏจักรสินค้าโภคภัณฑ์",
    DEBT_OR_LIQUIDITY: "ภาระหนี้/สภาพคล่อง", CORPORATE_PROBLEM: "ปัญหาภายในบริษัท",
    REGULATORY: "กฎเกณฑ์/ภาครัฐ", ONE_OFF_EVENT: "เหตุการณ์ครั้งเดียว",
    VALUATION_DE_RATING: "ถูกลด multiple", MARKET_PANIC: "ตลาดตกใจทั้งกระดาน", UNKNOWN: "ยังไม่ทราบ",
  };
  var CAT_TYPES = {
    MANAGEMENT: "ผู้บริหาร/ผู้ถือหุ้น", BUSINESS_MODEL: "โมเดลธุรกิจ", NEW_REVENUE: "รายได้ใหม่",
    STRUCTURAL_INDUSTRY: "โครงสร้างอุตสาหกรรม", ASSET_UNLOCK: "ปลดล็อกสินทรัพย์",
    COST_TRANSFORMATION: "ลดต้นทุน/ปรับโครงสร้าง", REGULATORY_GOV: "ใบอนุญาต/นโยบายรัฐ",
    CORPORATE_ACTION: "คอร์ปอเรตแอ็กชัน",
  };
  var MATURITY = {
    C0_RUMOR: { key: "C0_RUMOR", n: 0, label: "C0 · RUMOR", thai: "ข่าวลือ ยังไม่ยืนยัน" },
    C1_STORY: { key: "C1_STORY", n: 1, label: "C1 · STORY", thai: "ผู้บริหารพูดถึงทิศทางใหม่" },
    C2_ANNOUNCED: { key: "C2_ANNOUNCED", n: 2, label: "C2 · ANNOUNCED", thai: "ประกาศอย่างเป็นทางการ" },
    C3_CONFIRMED: { key: "C3_CONFIRMED", n: 3, label: "C3 · CONFIRMED", thai: "มีสัญญา/คำสั่งซื้อ/ใบอนุญาตจริง" },
    C4_FINANCIAL_EVIDENCE: { key: "C4_FINANCIAL_EVIDENCE", n: 4, label: "C4 · FINANCIAL EVIDENCE", thai: "เริ่มเห็นในตัวเลขงบ" },
    C5_MARKET_RECOGNIZED: { key: "C5_MARKET_RECOGNIZED", n: 5, label: "C5 · MARKET RECOGNIZED", thai: "ตลาดรับรู้แล้วชัดเจน" },
    NONE: { key: "NONE", n: -1, label: "DATA UNAVAILABLE", thai: "ยังไม่มีข้อมูล catalyst" },
  };
  var STORY = {
    UNKNOWN: { key: "UNKNOWN", icon: "⚪", label: "UNKNOWN", thai: "ไม่มีข้อมูลเรื่องราว", n: -1 },
    WEAK: { key: "WEAK", icon: "🟠", label: "WEAK", thai: "หลักฐานอ่อน", n: 0 },
    EMERGING: { key: "EMERGING", icon: "🟡", label: "EMERGING", thai: "เริ่มก่อตัว", n: 1 },
    STRONG: { key: "STRONG", icon: "🟢", label: "STRONG", thai: "แข็งแรง มีหลักฐานหลายชิ้น", n: 2 },
    TRANSFORMATIVE: { key: "TRANSFORMATIVE", icon: "🟢", label: "TRANSFORMATIVE", thai: "เปลี่ยนโครงสร้างธุรกิจ", n: 3 },
  };
  var INFLECTION = {
    NO_INFLECTION: { key: "NO_INFLECTION", icon: "⚪", label: "NO INFLECTION", thai: "ตัวเลขยังไม่เปลี่ยน", n: 0 },
    EARLY_INFLECTION: { key: "EARLY_INFLECTION", icon: "🟡", label: "EARLY INFLECTION", thai: "เริ่มเห็นสัญญาณ", n: 1 },
    CONFIRMED_INFLECTION: { key: "CONFIRMED_INFLECTION", icon: "🟢", label: "CONFIRMED INFLECTION", thai: "ยืนยันแล้ว", n: 2 },
    STRONG_INFLECTION: { key: "STRONG_INFLECTION", icon: "🟢", label: "STRONG INFLECTION", thai: "เปลี่ยนชัดเจน", n: 3 },
    INSUFFICIENT: { key: "INSUFFICIENT", icon: "⚪", label: "DATA UNAVAILABLE", thai: "ไม่มีข้อมูลงบ", n: -1 },
  };
  var RECOG = {
    UNKNOWN: { key: "UNKNOWN", icon: "⚪", label: "UNKNOWN", thai: "ข้อมูลราคาไม่พอ", n: -1 },
    EARLY: { key: "EARLY", icon: "🟢", label: "EARLY", thai: "ตลาดยังไม่รับรู้ — ราคายังนิ่ง/ยังไม่ฟื้น", n: 0 },
    BUILDING: { key: "BUILDING", icon: "🟡", label: "BUILDING", thai: "เริ่มมีแรงซื้อ — ฐานเริ่มยก", n: 1 },
    CONFIRMED: { key: "CONFIRMED", icon: "🟠", label: "CONFIRMED", thai: "ตลาดรับรู้แล้ว — ราคา/วอลุ่มยืนยัน", n: 2 },
    OVERHEATED: { key: "OVERHEATED", icon: "🔴", label: "OVERHEATED", thai: "ร้อนแรงผิดปกติ", n: 3 },
  };
  var TRAP = {
    UNKNOWN: { key: "UNKNOWN", icon: "⚪", label: "DATA UNAVAILABLE", thai: "ไม่มีข้อมูลงบให้ตรวจ" },
    LOW: { key: "LOW", icon: "🟢", label: "LOW", thai: "ไม่พบสัญญาณ value trap" },
    MEDIUM: { key: "MEDIUM", icon: "🟡", label: "MEDIUM", thai: "มีสัญญาณเสื่อมบางส่วน" },
    HIGH: { key: "HIGH", icon: "🔴", label: "HIGH", thai: "ธุรกิจเสื่อมและไม่มี catalyst น่าเชื่อถือ" },
  };
  var STATE = {
    EARLY_CATALYST: { key: "EARLY_CATALYST", icon: "🟢", label: "EARLY CATALYST", thai: "ย่อลึก + catalyst จริง + ตลาดยังไม่รับรู้", prio: 1 },
    CONFIRMED_CATALYST: { key: "CONFIRMED_CATALYST", icon: "🟢", label: "CONFIRMED CATALYST", thai: "catalyst ยืนยันแล้ว ตลาดยังรับรู้น้อย", prio: 2 },
    EMERGING: { key: "EMERGING", icon: "🟡", label: "EMERGING", thai: "ย่อลึก + catalyst น่าเชื่อ แต่หลักฐานยังน้อย", prio: 3 },
    TURNAROUND: { key: "TURNAROUND", icon: "🟡", label: "TURNAROUND", thai: "พื้นฐานเคยแย่ แต่เริ่มเห็นการฟื้น", prio: 4 },
    WATCH: { key: "WATCH", icon: "🟡", label: "WATCH", thai: "น่าสนใจแต่ยังยืนยันไม่พอ", prio: 5 },
    STORY_ONLY: { key: "STORY_ONLY", icon: "🟠", label: "STORY ONLY", thai: "มีแต่คำพูด ยังไม่มีหลักฐาน", prio: 6 },
    SPECULATIVE: { key: "SPECULATIVE", icon: "🟠", label: "SPECULATIVE", thai: "มีเรื่องเล่า แต่คุณภาพหลักฐานอ่อน", prio: 7 },
    VALUE_TRAP_RISK: { key: "VALUE_TRAP_RISK", icon: "🔴", label: "VALUE TRAP RISK", thai: "ธุรกิจเสื่อม ไม่มี catalyst", prio: 8 },
    PRICED_IN: { key: "PRICED_IN", icon: "🔵", label: "PRICED IN", thai: "catalyst สุกงอม ตลาดรับรู้เต็มแล้ว", prio: 9 },
    EXIT_WATCH: { key: "EXIT_WATCH", icon: "🔵", label: "EXIT WATCH", thai: "ดูเหมือนสะท้อนในราคาไปมากแล้ว", prio: 10 },
    // §6 ตลาดขยับแต่ไม่มี catalyst ที่ระบุได้ = คิวไปหาข้อมูล ไม่ใช่สัญญาณบวก
    UNEXPLAINED_MARKET_MOVE: { key: "UNEXPLAINED_MARKET_MOVE", icon: "🔍", label: "UNEXPLAINED MARKET MOVE",
      thai: "ราคา/วอลุ่มขยับ แต่ยังไม่พบ catalyst ที่อธิบายได้ — ต้องไปหาข้อมูลเพิ่ม (ไม่ใช่สัญญาณบวก)", prio: 11 },
    NO_CATALYST: { key: "NO_CATALYST", icon: "⚫", label: "NO CATALYST", thai: "ตรวจข้อมูลแล้วยังไม่พบ catalyst ที่เข้าเกณฑ์", prio: 12 },
    CATALYST_UNAVAILABLE: { key: "CATALYST_UNAVAILABLE", icon: "⚪", label: "CATALYST DATA UNAVAILABLE",
      thai: "ยังไม่มีข้อมูลข่าว/เหตุการณ์ให้ประเมิน — เห็นได้เฉพาะระนาบราคา", prio: 13 },
  };
  var LIFECYCLE = ["DISCOVERY", "EARLY", "RECOGNITION", "EXPANSION", "PRICED_IN", "EXIT"];

  // §5 — "ไม่มีข้อมูล" ≠ "ตรวจแล้วไม่มี catalyst" ≠ "เจอ catalyst"
  // สามอย่างนี้ต้องแยกกันเด็ดขาด ห้ามยุบรวม
  var AVAIL = {
    CATALYST_UNAVAILABLE: { key: "CATALYST_UNAVAILABLE", icon: "⚪", label: "CATALYST DATA UNAVAILABLE",
      thai: "ยังไม่มีข้อมูลข่าว/เหตุการณ์ของหุ้นตัวนี้ในระบบ — ไม่ได้แปลว่าไม่มี catalyst" },
    NO_CATALYST: { key: "NO_CATALYST", icon: "⚫", label: "NO CATALYST",
      thai: "มีข้อมูลแล้วแต่ยังไม่พบเหตุการณ์ที่เข้าเกณฑ์ catalyst" },
    CATALYST_IDENTIFIED: { key: "CATALYST_IDENTIFIED", icon: "🔎", label: "CATALYST IDENTIFIED",
      thai: "พบ catalyst ที่ระบุได้" },
  };

  var CONFIG = {
    dd: { pullback: 15, deep: 30, severe: 45, extreme: 60 },
    bars: { year: 252, threeYear: 756, minForScan: 60 },
    recog: {
      volSpike: 1.8,        // วอลุ่ม 20 วันล่าสุด เทียบ 60 วันก่อนหน้า
      rsWindow: 63,         // ~3 เดือน เทียบ ^SET.BK
      rsStrong: 8,          // ชนะดัชนี ≥8pp = แรงสัมพัทธ์ชัด
      // เด้งจาก low ต้องวัด "ส่วนเกินจากดัชนี" — ดัชนี SET เองก็เด้งจาก low ได้หลายสิบ %
      // ถ้าวัดแบบสัมบูรณ์ หุ้นทุกตัวจะดูเหมือนถูกตลาดรับรู้ทั้งที่เป็นแค่ beta
      offLowExcessStrong: 20,   // เด้งเกินดัชนี 20pp = เฉพาะตัวจริง
      offLowExcessBuilding: 8,
      offLowStrongFallback: 25, // ใช้เมื่อไม่มีดัชนีให้เทียบเท่านั้น
      offLowBuildingFallback: 12,
      volSane: 20,              // วอลุ่มเกิน 20 เท่า = ข้อมูลผิดปกติ ไม่ใช่สัญญาณ
      overheatOffLowExcess: 45, overheatVol: 3, overheatRs: 25,
    },
    trap: { minSignals: 3 },
  };

  // ---------------- utils ----------------
  function num(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v === "string") { if (v.trim() === "") return null; var x = Number(v); return isFinite(x) ? x : null; }
    return null;
  }
  function r1(v) { return v == null ? null : Math.round(v * 10) / 10; }
  function r2(v) { return v == null ? null : Math.round(v * 100) / 100; }
  function maxOf(arr) {
    var best = null;
    for (var i = 0; i < arr.length; i++) { var v = num(arr[i]); if (v != null && (best == null || v > best)) best = v; }
    return best;
  }
  function minOf(arr) {
    var best = null;
    for (var i = 0; i < arr.length; i++) { var v = num(arr[i]); if (v != null && (best == null || v < best)) best = v; }
    return best;
  }
  function avgOf(arr) {
    var s = 0, n = 0;
    for (var i = 0; i < arr.length; i++) { var v = num(arr[i]); if (v != null) { s += v; n++; } }
    return n ? s / n : null;
  }

  // ============================================================
  // STAGE 1 — DEEP DRAWDOWN (ราคาจริงล้วน)
  // ============================================================
  function computeDrawdown(closes, dates) {
    closes = Array.isArray(closes) ? closes : [];
    var n = closes.length;
    var out = { available: false, state: DD.INSUFFICIENT, bars: n,
      note: "ต้องมีราคาอย่างน้อย " + CONFIG.bars.minForScan + " แท่ง" };
    if (n < CONFIG.bars.minForScan) return out;
    var price = null, priceDate = null;
    for (var i = n - 1; i >= 0; i--) { var v = num(closes[i]); if (v != null && v > 0) { price = v; priceDate = (dates && dates[i]) || null; break; } }
    if (price == null) return out;

    var w52 = closes.slice(Math.max(0, n - CONFIG.bars.year));
    var w3y = closes.slice(Math.max(0, n - CONFIG.bars.threeYear));
    var hi52 = maxOf(w52), lo52 = minOf(w52), hi3 = maxOf(w3y), hiAll = maxOf(closes);
    var yearsData = r1(n / CONFIG.bars.year);

    function ddPct(hi) { return hi != null && hi > 0 ? r1((price / hi - 1) * 100) : null; }
    var dd52 = ddPct(hi52);
    var res = {
      available: true, bars: n, yearsOfData: yearsData,
      price: r2(price), priceDate: priceDate,
      high52w: r2(hi52), low52w: r2(lo52),
      drawdown52wPct: dd52,
      drawdown3yPct: n >= CONFIG.bars.threeYear ? ddPct(hi3) : null,
      drawdown3yNote: n >= CONFIG.bars.threeYear ? null : "ข้อมูลไม่ถึง 3 ปี (" + yearsData + " ปี)",
      drawdown5yPct: n >= CONFIG.bars.year * 5 ? ddPct(hiAll) : null,
      drawdownDataHighPct: ddPct(hiAll),
      dataHighNote: "จุดสูงสุดเท่าที่มีข้อมูล ~" + yearsData + " ปี (ไม่ใช่ all-time จริงถ้าข้อมูลสั้น)",
      offLow52wPct: lo52 != null && lo52 > 0 ? r1((price / lo52 - 1) * 100) : null,
    };
    var abs = dd52 == null ? null : Math.abs(Math.min(dd52, 0));
    if (abs == null) res.state = DD.INSUFFICIENT;
    else if (abs > CONFIG.dd.extreme) res.state = DD.EXTREME_DRAWDOWN;
    else if (abs >= CONFIG.dd.severe) res.state = DD.SEVERE_DRAWDOWN;
    else if (abs >= CONFIG.dd.deep) res.state = DD.DEEP_DRAWDOWN;
    else if (abs >= CONFIG.dd.pullback) res.state = DD.PULLBACK;
    else res.state = DD.NORMAL;
    res.note = "ย่อจาก high 52 สัปดาห์ " + (abs == null ? "—" : r1(abs) + "%") + " · เกณฑ์ " +
      CONFIG.dd.pullback + "/" + CONFIG.dd.deep + "/" + CONFIG.dd.severe + "/" + CONFIG.dd.extreme + "%";
    return res;
  }

  // ============================================================
  // STAGE 6 — MARKET RECOGNITION (ราคา/วอลุ่ม/แรงสัมพัทธ์จริง)
  // ============================================================
  function computeRecognition(closes, volumes, benchCloses, dd) {
    var out = { state: RECOG.UNKNOWN, evidence: [], metrics: {},
      note: "ตัวชี้ทางเทคนิคเป็นหลักฐานประกอบ ไม่ใช่ตัวตรวจจับ catalyst" };
    var n = Array.isArray(closes) ? closes.length : 0;
    if (n < CONFIG.bars.minForScan || !dd || !dd.available) return out;

    var offLow = dd.offLow52wPct;
    // ส่วนเกินจากดัชนี: หุ้นเด้งจาก low มากกว่าที่ดัชนีเด้ง เท่าไหร่
    var benchOffLow = null, offLowExcess = null;
    if (Array.isArray(benchCloses) && benchCloses.length >= CONFIG.bars.minForScan) {
      var bw = benchCloses.slice(Math.max(0, benchCloses.length - CONFIG.bars.year));
      var bLo = minOf(bw), bNowV = num(benchCloses[benchCloses.length - 1]);
      if (bLo != null && bLo > 0 && bNowV != null) benchOffLow = r1((bNowV / bLo - 1) * 100);
      if (benchOffLow != null && offLow != null) offLowExcess = r1(offLow - benchOffLow);
    }
    // higher lows: ต่ำสุด 30 วันล่าสุด > ต่ำสุด 30 วันก่อนหน้า
    var lowRecent = minOf(closes.slice(n - 30));
    var lowPrior = minOf(closes.slice(Math.max(0, n - 60), n - 30));
    var higherLows = lowRecent != null && lowPrior != null ? lowRecent > lowPrior : null;
    // volume expansion
    var volRatio = null;
    var volAnomaly = false;
    if (Array.isArray(volumes) && volumes.length === n) {
      var vRecent = avgOf(volumes.slice(n - 20));
      var vBase = avgOf(volumes.slice(Math.max(0, n - 80), n - 20));
      if (vRecent != null && vBase != null && vBase > 0) {
        var raw = vRecent / vBase;
        // อัตราส่วนสูงเกินจริง = ข้อมูลวอลุ่มผิดปกติ (หน่วยเปลี่ยน/ค่าหลุด) ไม่ใช่แรงซื้อ
        if (raw > CONFIG.recog.volSane) { volAnomaly = true; volRatio = null; }
        else volRatio = r2(raw);
      }
    }
    // relative strength vs ดัชนี (63 วัน)
    var rsPp = null;
    if (Array.isArray(benchCloses) && benchCloses.length >= CONFIG.recog.rsWindow + 1) {
      var w = CONFIG.recog.rsWindow;
      var pNow = num(closes[n - 1]), pThen = num(closes[Math.max(0, n - 1 - w)]);
      var bN = benchCloses.length;
      var bNow = num(benchCloses[bN - 1]), bThen = num(benchCloses[Math.max(0, bN - 1 - w)]);
      if (pNow && pThen && bNow && bThen && pThen > 0 && bThen > 0) {
        rsPp = r1(((pNow / pThen) - (bNow / bThen)) * 100);
      }
    }
    out.metrics = { offLow52wPct: offLow, benchOffLow52wPct: benchOffLow, offLowExcessPp: offLowExcess,
      higherLows: higherLows, volumeRatio20vs60: volRatio, volumeAnomaly: volAnomaly, relStrength3mPp: rsPp };

    var score = 0;
    // relScore = หลักฐานว่าตลาดสนใจ "หุ้นตัวนี้เฉพาะตัว" (เด้งเกินดัชนี / วอลุ่ม / แข็งกว่าดัชนี)
    // higherLows เป็นแค่ตัวประกอบ — ลำพังมันบอกได้แค่ว่าหยุดลง ไม่ได้แปลว่าตลาดรับรู้
    var relScore = 0;
    if (offLowExcess != null) {
      if (offLowExcess >= CONFIG.recog.offLowExcessStrong) { score += 2; relScore += 2; out.evidence.push("เด้งจาก low มากกว่าดัชนี " + r1(offLowExcess) + "pp (ดัชนีเด้ง " + benchOffLow + "%)"); }
      else if (offLowExcess >= CONFIG.recog.offLowExcessBuilding) { score += 1; relScore += 1; out.evidence.push("เด้งจาก low มากกว่าดัชนีเล็กน้อย " + r1(offLowExcess) + "pp"); }
      else out.evidence.push("เด้งจาก low " + r1(offLow) + "% แต่ไม่ต่างจากดัชนี (" + benchOffLow + "%) — เป็นการฟื้นทั้งตลาด");
    } else if (offLow != null && offLow >= CONFIG.recog.offLowStrongFallback) { score += 2; relScore += 2; out.evidence.push("เด้งจาก low 52w " + r1(offLow) + "% (ไม่มีดัชนีให้เทียบ)"); }
    else if (offLow != null && offLow >= CONFIG.recog.offLowBuildingFallback) { score += 1; relScore += 1; out.evidence.push("เริ่มเด้งจาก low 52w " + r1(offLow) + "% (ไม่มีดัชนีให้เทียบ)"); }
    if (volAnomaly) out.evidence.push("⚠ ข้อมูลวอลุ่มผิดปกติ (สูงเกิน " + CONFIG.recog.volSane + " เท่า) — ไม่นำมานับ");
    if (higherLows === true) { score += 1; out.evidence.push("ฐานยกสูงขึ้น (higher lows)"); }
    if (volRatio != null && volRatio >= CONFIG.recog.volSpike) { score += 1; relScore += 1; out.evidence.push("วอลุ่ม 20 วันสูงกว่าฐาน " + volRatio + " เท่า"); }
    if (rsPp != null && rsPp >= CONFIG.recog.rsStrong) { score += 1; relScore += 1; out.evidence.push("แข็งกว่าดัชนี 3 เดือน +" + rsPp + "pp"); }
    if (!out.evidence.length) out.evidence.push("ยังไม่พบสัญญาณการรับรู้จากตลาด");

    var overheat = (offLowExcess != null && offLowExcess >= CONFIG.recog.overheatOffLowExcess) &&
      ((volRatio != null && volRatio >= CONFIG.recog.overheatVol) || (rsPp != null && rsPp >= CONFIG.recog.overheatRs));
    // จะบอกว่า "ตลาดรับรู้หุ้นตัวนี้" ไม่ได้ ถ้ามันยังแพ้ดัชนี — นั่นคือ beta ไม่ใช่การรับรู้
    var lagging = rsPp != null && rsPp < 0;
    // ราคายังอยู่ติด low (เด้ง <5%) = ตลาดยังไม่รับรู้ ไม่ว่าฐานจะยกหรือไม่
    var stillAtLows = offLow != null && offLow < 5;
    if (stillAtLows && score <= 1) {
      out.state = RECOG.EARLY;
      out.evidence.push("ราคายังอยู่ใกล้ low 52w (เด้งเพียง " + r1(offLow) + "%) — ยังไม่ถือว่าตลาดรับรู้");
      return out;
    }
    if (overheat) out.state = RECOG.OVERHEATED;
    else if (score >= 3 && !lagging) out.state = RECOG.CONFIRMED;
    else if (score >= 3 && lagging) { out.state = RECOG.BUILDING; out.evidence.push("แต่ยังแพ้ดัชนี 3 เดือน (" + rsPp + "pp) — ยังไม่ถือว่าตลาดรับรู้เฉพาะตัว"); }
    else if (score >= 1 && relScore >= 1) out.state = RECOG.BUILDING;
    else {
      // ได้แต้มจาก higherLows อย่างเดียว = ราคาหยุดลงเฉย ๆ ยังไม่ใช่การรับรู้ของตลาด
      out.state = RECOG.EARLY;
      if (score >= 1) out.evidence.push("มีแต่ฐานยกสูงขึ้น ไม่มีสัญญาณเฉพาะตัว (ไม่เด้งเกินดัชนี/ไม่มีวอลุ่ม) — ยังไม่ถือว่าตลาดรับรู้");
    }
    return out;
  }

  // ============================================================
  // STAGE 2-5, 8 — STORY PLANE (จาก catalyst KB เท่านั้น)
  // ============================================================
  // ความแข็งของหลักฐาน — ตัวกำหนด catalyst maturity
  // rumor(-1)=ข่าวลือ/ไม่ระบุที่มา → C0 · statement(0)=ผู้บริหารพูด → C1 (ตามนิยาม C1 ในสเปค)
  var EV_STRENGTH = { rumor: -1, statement: 0, report: 0, announcement: 2, filing: 3, contract: 3, financial: 4 };
  var EV_UNKNOWN = -1; // evidenceStrength ที่ไม่รู้จัก = ข่าวลือ ไม่ใช่คำพูดที่ยืนยันได้

  function computeWhyFell(kb) {
    if (!kb || !kb.whyFell || !kb.whyFell.category) {
      return { category: "UNKNOWN", thai: WHY_FELL_TH.UNKNOWN, evidence: [], asOf: null,
        note: "ยังไม่มีข้อมูลพื้นฐาน/งบของหุ้นไทยในระบบ — ต้อง curate หรือเพิ่ม data source" };
    }
    var c = String(kb.whyFell.category).toUpperCase();
    if (WHY_FELL.indexOf(c) < 0) c = "UNKNOWN";
    return { category: c, thai: WHY_FELL_TH[c] || c, evidence: kb.whyFell.evidence || [],
      asOf: kb.whyFell.asOf || null, note: kb.whyFell.note || null };
  }

  function computeCatalyst(kb) {
    // availability สามระดับ (§5): ไม่มีข้อมูลเลย / มีข้อมูลแต่ไม่พบ catalyst / พบ catalyst
    var out = { available: false, availability: AVAIL.CATALYST_UNAVAILABLE,
      types: [], events: [], story: STORY.UNKNOWN, maturity: MATURITY.NONE, maturityEvidence: MATURITY.NONE,
      evidenceCount: 0, businessEvidenceCount: 0, financialEvidenceCount: 0,
      strongestEvidence: null, headline: null, asOf: null,
      note: "ไม่มีข้อมูล catalyst ใน KB — ระบบไม่เดาจากราคา (ต้องมีแหล่งข่าว/ไฟลิ่งหรือ curate)" };
    if (!kb) return out;
    // มี KB แล้ว = ตรวจข้อมูลแล้ว → ถ้าไม่มี event ที่เข้าเกณฑ์ คือ "ตรวจแล้วไม่พบ" ไม่ใช่ "ไม่มีข้อมูล"
    if (!Array.isArray(kb.events) || !kb.events.length) {
      out.availability = AVAIL.NO_CATALYST;
      out.note = "มีข้อมูลของหุ้นตัวนี้ใน KB แล้ว แต่ยังไม่มีเหตุการณ์ที่เข้าเกณฑ์ catalyst";
      return out;
    }
    var events = kb.events.slice().filter(function (e) { return e && e.date && e.type; })
      .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    if (!events.length) {
      // มี events แต่ไม่มีอันไหนมี date+type ครบ = ตรวจแล้วใช้ไม่ได้
      out.availability = AVAIL.NO_CATALYST;
      out.note = "มีรายการเหตุการณ์แต่ไม่มีวันที่/ประเภทครบ — ใช้เป็นหลักฐานไม่ได้ (ห้ามมโนวันที่)";
      return out;
    }
    var types = {}, best = -1, evCount = 0;
    events.forEach(function (e) {
      if (e.catalystType && CAT_TYPES[e.catalystType]) types[e.catalystType] = 1;
      var st = EV_STRENGTH[e.evidenceStrength] != null ? EV_STRENGTH[e.evidenceStrength] : EV_UNKNOWN;
      if (st > best) best = st;
      if (st >= EV_STRENGTH.announcement) evCount++;
    });
    // maturity = จากหลักฐานที่แข็งที่สุด (ไม่ใช่คำโฆษณา)
    var mat = best >= EV_STRENGTH.financial ? MATURITY.C4_FINANCIAL_EVIDENCE
      : best >= EV_STRENGTH.contract ? MATURITY.C3_CONFIRMED
        : best >= EV_STRENGTH.announcement ? MATURITY.C2_ANNOUNCED
          : best >= EV_STRENGTH.statement ? MATURITY.C1_STORY : MATURITY.C0_RUMOR;
    // story strength: คำพูดเดี่ยว ๆ ห้ามเป็น STRONG
    var story;
    if (best <= EV_UNKNOWN) story = STORY.WEAK;
    else if (best <= EV_STRENGTH.statement) story = STORY.WEAK;
    else if (evCount >= 3 && best >= EV_STRENGTH.contract) story = kb.transformative === true ? STORY.TRANSFORMATIVE : STORY.STRONG;
    else if (evCount >= 2) story = STORY.EMERGING;
    else story = STORY.EMERGING;
    if (evCount >= 2 && best >= EV_STRENGTH.contract && story.n < STORY.STRONG.n) story = STORY.STRONG;
    return { available: true, availability: AVAIL.CATALYST_IDENTIFIED, types: Object.keys(types), events: events, story: story,
      maturity: mat, maturityEvidence: mat, // §3 จากหลักฐานล้วน
      evidenceCount: evCount, strongestEvidence: best, headline: kb.headline || null,
      asOf: kb.asOf || (events[events.length - 1] || {}).date || null, note: null };
  }

  function computeInflection(kb) {
    if (!kb || !kb.financials || !Array.isArray(kb.financials.series) || kb.financials.series.length < 2) {
      return { state: INFLECTION.INSUFFICIENT, signals: [], asOf: null,
        note: "ไม่มีงบการเงินหุ้นไทยในระบบ — Stage นี้ต้องการ data source ใหม่ (SET filing/SETSMART) หรือ curate" };
    }
    var s = kb.financials.series;
    var last = s[s.length - 1], prev = s[s.length - 2];
    var sig = [];
    ["revenue", "eps", "opMarginPct", "fcf", "backlog"].forEach(function (f) {
      var a = num(prev[f]), b = num(last[f]);
      if (a == null || b == null) return;
      if (f === "opMarginPct") { if (b - a >= 1) sig.push({ field: f, dir: "up", detail: r1(a) + "% → " + r1(b) + "%" }); else if (a - b >= 1) sig.push({ field: f, dir: "down", detail: r1(a) + "% → " + r1(b) + "%" }); return; }
      if (a > 0 && b / a - 1 >= 0.08) sig.push({ field: f, dir: "up", detail: a + " → " + b });
      else if (a > 0 && b / a - 1 <= -0.08) sig.push({ field: f, dir: "down", detail: a + " → " + b });
      else if (a <= 0 && b > 0) sig.push({ field: f, dir: "up", detail: "พลิกเป็นบวก (" + a + " → " + b + ")" });
    });
    var ups = sig.filter(function (x) { return x.dir === "up"; }).length;
    var downs = sig.filter(function (x) { return x.dir === "down"; }).length;
    var st = INFLECTION.NO_INFLECTION;
    if (ups >= 3 && downs === 0) st = INFLECTION.STRONG_INFLECTION;
    else if (ups >= 2 && downs === 0) st = INFLECTION.CONFIRMED_INFLECTION;
    else if (ups >= 1) st = INFLECTION.EARLY_INFLECTION;
    return { state: st, signals: sig, asOf: kb.financials.asOf || last.period || null,
      note: "เทียบงวดล่าสุดกับงวดก่อนหน้าใน KB — catalyst อาจน่าสนใจก่อนตัวเลขเปลี่ยน (NO_INFLECTION ไม่ได้แปลว่าแย่)" };
  }

  // ============================================================
  // STAGE 7 — VALUE TRAP
  // ============================================================
  // P0b — ใช้ผลประเมินจากงบไทยเมื่อมี (คำนวณฝั่ง server จาก fin.quarters)
  // เดิมอ่านจาก KB ซึ่งไม่มีหุ้นไทย ทำให้ทั้งจักรวาลเป็น UNKNOWN
  function computeTrap(whyFell, inflection, catalyst, kb, thaiTrap) {
    if (thaiTrap && thaiTrap.risk && thaiTrap.risk.key) {
      var k = thaiTrap.risk.key;
      return {
        risk: TRAP[k] || TRAP.UNKNOWN,
        signals: Array.isArray(thaiTrap.signals) ? thaiTrap.signals : [],
        improving: Array.isArray(thaiTrap.improving) ? thaiTrap.improving : [],
        detail: thaiTrap.detail || null,
        quartersUsed: thaiTrap.quartersUsed || null,
        source: "งบไทยรายไตรมาส (SET)",
        credibleCatalyst: catalyst.available && catalyst.story.n >= STORY.EMERGING.n &&
          catalyst.maturity.n >= MATURITY.C2_ANNOUNCED.n,
        note: thaiTrap.note || "ประเมินจากงบไทยหลายไตรมาส · UNKNOWN ไม่ได้แปลว่าปลอดภัย",
      };
    }
    var signals = [];
    if (inflection.state.key === "INSUFFICIENT") {
      return { risk: TRAP.UNKNOWN, signals: [],
        note: "ตรวจ value trap ต้องใช้งบการเงิน — ยังไม่มีข้อมูลหุ้นไทยในระบบ จึงไม่สรุป (ไม่ใช่ 'ปลอดภัย')" };
    }
    var f = kb && kb.financials ? kb.financials : {};
    var s = Array.isArray(f.series) ? f.series : [];
    var last = s[s.length - 1] || {}, prev = s[s.length - 2] || {};
    function down(field) { var a = num(prev[field]), b = num(last[field]); return a != null && b != null && a > 0 && b < a; }
    if (down("revenue")) signals.push("รายได้ลดลง");
    if (down("eps")) signals.push("กำไรต่อหุ้นลดลง");
    if (down("fcf")) signals.push("กระแสเงินสดอิสระลดลง");
    var dA = num(prev.debt), dB = num(last.debt);
    if (dA != null && dB != null && dB > dA) signals.push("หนี้เพิ่มขึ้น");
    if (whyFell.category === "INDUSTRY_DOWNTURN") signals.push("อุตสาหกรรมอยู่ขาลง");
    var credible = catalyst.available && catalyst.story.n >= STORY.EMERGING.n && catalyst.maturity.n >= MATURITY.C2_ANNOUNCED.n;
    var risk;
    if (signals.length >= CONFIG.trap.minSignals && !credible) risk = TRAP.HIGH;
    else if (signals.length >= CONFIG.trap.minSignals) risk = TRAP.MEDIUM;
    else if (signals.length >= 1) risk = TRAP.MEDIUM;
    else risk = TRAP.LOW;
    return { risk: risk, signals: signals, credibleCatalyst: credible,
      note: "ราคาถูกห้าม override หลักฐานว่าธุรกิจเสื่อม" };
  }

  // ============================================================
  // STAGE 13 — CANDIDATE STATE + STAGE 9 LIFECYCLE
  // ============================================================
  function computeState(dd, catalyst, inflection, recognition, trap) {
    var deep = dd.available && dd.state.rank >= DD.DEEP_DRAWDOWN.rank;
    var mat = catalyst.maturity.n, story = catalyst.story.n;
    var recog = recognition.state.n;
    var why = [];

    if (!catalyst.available) {
      var unavailable = catalyst.availability.key === AVAIL.CATALYST_UNAVAILABLE.key;
      if (trap.risk.key === "HIGH") { why.push("ธุรกิจเสื่อมและไม่มี catalyst ที่เข้าเกณฑ์"); return { state: STATE.VALUE_TRAP_RISK, why: why }; }
      // §6 ตลาดขยับจริง (BUILDING ขึ้นไป) แต่อธิบายไม่ได้ → เข้าคิวไปหาข้อมูล
      if (recog >= RECOG.BUILDING.n) {
        why.push("ตรวจพบการเคลื่อนไหวของราคา/วอลุ่ม (" + recognition.state.label + ") แต่ยังไม่พบ catalyst ที่อธิบายได้");
        why.push(unavailable ? "สาเหตุ: ยังไม่มีข้อมูลข่าว/เหตุการณ์ของหุ้นตัวนี้ในระบบ" : "สาเหตุ: ตรวจข้อมูลที่มีแล้วไม่พบเหตุการณ์เข้าเกณฑ์");
        why.push("ไม่ใช่สัญญาณบวก — เป็นคิวสำหรับไปหาข้อมูลเพิ่ม");
        return { state: STATE.UNEXPLAINED_MARKET_MOVE, why: why };
      }
      if (deep) why.push("ราคาย่อระดับ " + dd.state.label + " (" + dd.drawdown52wPct + "% จาก high 52w)");
      why.push(unavailable ? "ยังไม่มีข้อมูล catalyst ให้ประเมิน — เห็นเฉพาะระนาบราคา" : "ตรวจข้อมูลที่มีแล้วยังไม่พบ catalyst ที่เข้าเกณฑ์");
      return { state: unavailable ? STATE.CATALYST_UNAVAILABLE : STATE.NO_CATALYST, why: why };
    }
    if (trap.risk.key === "HIGH") {
      why.push("สัญญาณเสื่อม " + trap.signals.length + " ข้อ และ catalyst ยังไม่น่าเชื่อถือพอ");
      return { state: STATE.VALUE_TRAP_RISK, why: why };
    }
    // ตลาดรับรู้เต็มแล้ว
    if (recog >= RECOG.OVERHEATED.n && mat >= MATURITY.C3_CONFIRMED.n) {
      why.push("catalyst ยืนยันแล้วและราคา/วอลุ่มร้อนแรงผิดปกติ");
      return { state: STATE.EXIT_WATCH, why: why };
    }
    if (mat >= MATURITY.C5_MARKET_RECOGNIZED.n || (mat >= MATURITY.C4_FINANCIAL_EVIDENCE.n && recog >= RECOG.CONFIRMED.n)) {
      why.push(mat >= MATURITY.C5_MARKET_RECOGNIZED.n
        ? "catalyst ยืนยันแล้วและตลาดรับรู้ผ่านราคา/วอลุ่มแล้ว (C5)"
        : "เห็นผลในงบแล้วและตลาดรับรู้แล้ว");
      return { state: STATE.PRICED_IN, why: why };
    }
    if (mat <= MATURITY.C0_RUMOR.n) {
      // ข่าวลือ/ไม่ระบุที่มา = มีเรื่องเล่าแต่คุณภาพหลักฐานอ่อนที่สุด
      why.push("มีแต่ข่าวลือ/ไม่ระบุที่มา — คุณภาพหลักฐานอ่อนที่สุด");
      return { state: STATE.SPECULATIVE, why: why };
    }
    if (mat <= MATURITY.C1_STORY.n) {
      // คำพูดผู้บริหาร/รายงานสื่อ แต่ยังไม่ประกาศเป็นทางการ
      why.push("มีแต่คำบอกเล่า ยังไม่มีการประกาศหรือหลักฐานที่ยืนยันได้");
      return { state: STATE.STORY_ONLY, why: why };
    }
    // C2 ขึ้นไป
    var earlyRecog = recog <= RECOG.BUILDING.n;
    if (deep && story >= STORY.EMERGING.n && mat >= MATURITY.C3_CONFIRMED.n && earlyRecog && trap.risk.key !== "HIGH") {
      why.push("ย่อลึก " + dd.drawdown52wPct + "% + catalyst ยืนยันแล้ว (" + catalyst.maturity.label + ") + ตลาดยังรับรู้น้อย");
      return { state: STATE.EARLY_CATALYST, why: why };
    }
    if (mat >= MATURITY.C3_CONFIRMED.n && earlyRecog) {
      why.push("catalyst ยืนยันแล้วและตลาดยังรับรู้น้อย (แต่ราคายังไม่ย่อลึก)");
      return { state: STATE.CONFIRMED_CATALYST, why: why };
    }
    if (inflection.state.n >= INFLECTION.EARLY_INFLECTION.n && trap.signals.length >= 1) {
      why.push("พื้นฐานเคยอ่อนแต่เริ่มเห็นการฟื้นในตัวเลข");
      return { state: STATE.TURNAROUND, why: why };
    }
    if (deep && mat >= MATURITY.C2_ANNOUNCED.n) {
      why.push("ย่อลึก + ประกาศแล้ว แต่หลักฐานยังน้อย");
      return { state: STATE.EMERGING, why: why };
    }
    why.push("มีพัฒนาการแต่ยังยืนยันไม่พอ");
    return { state: STATE.WATCH, why: why };
  }

  // §4 — lifecycle ขับด้วย "ขั้นของ catalyst" เป็นหลัก ตลาดเป็นตัวปรับภายในขั้นเท่านั้น
  // ห้ามเด็ดขาด: ไม่มี catalyst → RECOGNITION/EXPANSION (ราคาขยับไม่ใช่การรับรู้ catalyst)
  function computeLifecycle(state, catalyst, recognition) {
    var k = state.key;
    if (k === "EXIT_WATCH") return "EXIT";
    if (k === "PRICED_IN") return "PRICED_IN";
    // ไม่มี catalyst ที่ระบุได้ = ยังอยู่ขั้นค้นหาเสมอ ไม่ว่าราคาจะขยับแค่ไหน
    if (catalyst.availability.key !== AVAIL.CATALYST_IDENTIFIED.key) return "DISCOVERY";
    var mat = catalyst.maturity.n, recog = recognition.state.n;
    if (mat <= MATURITY.C0_RUMOR.n) return "DISCOVERY";
    if (mat <= MATURITY.C2_ANNOUNCED.n) return "EARLY";
    if (mat === MATURITY.C3_CONFIRMED.n) return recog >= RECOG.BUILDING.n ? "RECOGNITION" : "EARLY";
    if (mat === MATURITY.C4_FINANCIAL_EVIDENCE.n) return recog >= RECOG.CONFIRMED.n ? "EXPANSION" : "RECOGNITION";
    if (mat >= MATURITY.C5_MARKET_RECOGNIZED.n) return "RECOGNITION";
    return "DISCOVERY";
  }

  // ============================================================
  // §19/§20 — กลไก re-rating + เงื่อนไขที่พิสูจน์ว่าเราคิดผิด
  // ============================================================
  function reratingMechanism(catalyst, inflection, kb) {
    if (!catalyst.available || catalyst.maturity.n < MATURITY.C2_ANNOUNCED.n) {
      return { available: false, chain: [], note: "RE-RATING MECHANISM = INSUFFICIENT EVIDENCE (ต้องมี catalyst ระดับ C2 ขึ้นไป)" };
    }
    var head = catalyst.headline || (catalyst.types.map(function (t) { return CAT_TYPES[t]; }).join(" + ") || "catalyst");
    var chain = [{ step: "Catalyst", text: head, done: true }];
    var hasContract = catalyst.strongestEvidence >= EV_STRENGTH.contract;
    chain.push({ step: "Business Impact", text: kb && kb.businessImpact ? kb.businessImpact : "คำสั่งซื้อ/backlog/กำลังการผลิตเพิ่ม", done: hasContract });
    var fin = inflection.state.n >= INFLECTION.EARLY_INFLECTION.n;
    chain.push({ step: "Financial Impact", text: "รายได้/มาร์จิ้น/EPS เริ่มขยับ", done: fin });
    chain.push({ step: "Investor Recognition", text: "ตลาดเริ่มรับรู้ผ่านราคา/วอลุ่ม", done: false });
    chain.push({ step: "Valuation Re-rating", text: "ตลาดให้ multiple ใหม่", done: false });
    return { available: true, chain: chain, note: "สร้างจากหลักฐานที่มีจริง — ขั้นที่ยังไม่ done คือสิ่งที่ต้องรอ" };
  }
  function invalidationConditions(catalyst, kb) {
    var base = [
      "สัญญา/คำสั่งซื้อถูกยกเลิกหรือเลื่อนออกไป",
      "backlog ลดลงต่อเนื่อง",
      "รายได้จากธุรกิจใหม่ไม่ปรากฏในงบตามกรอบเวลาที่บริษัทให้ไว้",
      "มาร์จิ้นยังอ่อนแม้รายได้เพิ่ม",
      "หนี้เพิ่มขึ้นมีนัยเพื่อประคองธุรกิจ",
      "ผู้บริหารกลับลำเรื่องกลยุทธ์",
      "ความต้องการของอุตสาหกรรมแย่ลง",
      "ราคาขึ้นแรงโดยไม่มีการยืนยันจากพื้นฐาน",
    ];
    var extra = kb && Array.isArray(kb.invalidation) ? kb.invalidation : [];
    return { conditions: extra.concat(base), note: "เงื่อนไขที่จะพิสูจน์ว่า thesis ผิด — สำคัญกว่าเรื่องเล่าฝั่งบวก" };
  }

  // ============================================================
  // STORY PLANE — รับผลจาก EvidenceModel (public/evidence-model.js)
  //
  // ทำไมต้องมีชั้นนี้: evidence-model รู้เรื่อง "หลักฐาน" อย่างเดียว
  // ส่วน engine นี้รู้เรื่อง "ราคา" อย่างเดียว — ชั้นนี้เชื่อมสองฝั่งโดยไม่ให้ปนกัน
  // C5 ยังคงต้องมีหลักฐาน C3+ ก่อนเสมอ ราคาไม่มีสิทธิ์สร้างขั้น
  // ============================================================
  function VTT() {
    if (typeof window !== "undefined" && window.ValueTrapThai) return window.ValueTrapThai;
    if (typeof module !== "undefined" && module.exports) {
      try { return require("./value-trap-thai.js"); } catch (e) { return null; }
    }
    return null;
  }
  function WFT() {
    if (typeof window !== "undefined" && window.WhyFellThai) return window.WhyFellThai;
    if (typeof module !== "undefined" && module.exports) {
      try { return require("./why-fell-thai.js"); } catch (e) { return null; }
    }
    return null;
  }
  function IA() {
    if (typeof window !== "undefined" && window.InsiderActivity) return window.InsiderActivity;
    if (typeof module !== "undefined" && module.exports) {
      try { return require("./insider-activity.js"); } catch (e) { return null; }
    }
    return null;
  }

  function CQ() {
    if (typeof window !== "undefined" && window.CatalystQualification) return window.CatalystQualification;
    if (typeof module !== "undefined" && module.exports) {
      try { return require("./catalyst-qualification.js"); } catch (e) { return null; }
    }
    return null;
  }

  function EM() {
    if (typeof window !== "undefined" && window.EvidenceModel) return window.EvidenceModel;
    if (typeof module !== "undefined" && module.exports) {
      try { return require("./evidence-model.js"); } catch (e) { return null; }
    }
    return null;
  }

  // แปลง Story ของ EvidenceModel ให้อยู่ในรูป catalyst ที่ส่วนอื่นของ engine ใช้อยู่
  function catalystFromStory(story) {
    if (!story) return null;
    var em = EM();
    if (!em) return null;

    var availKey = story.availability && story.availability.key;
    if (availKey !== "CATALYST_IDENTIFIED") {
      return {
        available: false,
        availability: availKey === "NO_CATALYST" ? AVAIL.NO_CATALYST : AVAIL.CATALYST_UNAVAILABLE,
        types: [], events: [], story: STORY.UNKNOWN,
        maturity: MATURITY.NONE, maturityEvidence: MATURITY.NONE,
        evidenceCount: 0, businessEvidenceCount: 0,
        financialEvidenceCount: ((story.financialEvidence || []).length),
        strongestEvidence: null, headline: null,
        asOf: story.latestEvidenceDate || null,
        note: story.note || null,
        storyRef: story,
      };
    }

    // ขั้นจากหลักฐานล้วน (EvidenceModel คิดมาแล้วโดยไม่รู้จักราคา)
    var stageKey = story.catalystStage && story.catalystStage.key;
    var mat = MATURITY[stageKey] || MATURITY.NONE;

    var types = {};
    (story.evidenceItems || []).forEach(function (e) { if (e.eventType) types[e.eventType] = true; });

    // ความแข็งของ "เรื่องราว" มาจากจำนวนและระดับหลักฐาน ไม่ใช่จากราคา
    var n = (story.evidenceItems || []).length;
    var st = mat.n >= 3 ? (n >= 2 ? STORY.STRONG : STORY.EMERGING)
      : mat.n >= 2 ? (n >= 3 ? STORY.EMERGING : STORY.WEAK) : STORY.WEAK;

    return {
      available: true,
      availability: AVAIL.CATALYST_IDENTIFIED,
      types: Object.keys(types),
      events: (story.timeline || []).map(function (e) {
        return { date: e.eventDate, type: e.eventType, title: e.title, url: e.sourceUrl,
          strength: e.evidenceStrength, source: e.sourceName, tier: e.sourceTier,
          qualifying: e.catalystRelevance === "CATALYST_RELEVANT" };
      }),
      story: st,
      maturity: mat,
      maturityEvidence: mat,
      evidenceCount: n,
      // PHASE 5 — evidenceItems เป็นเหตุการณ์เชิงธุรกิจล้วนแล้ว (งบถูกแยกไป financialEvidence)
      businessEvidenceCount: n,
      financialEvidenceCount: ((story.financialEvidence || []).length),
      strongestEvidence: story.evidenceStrength || null,
      headline: story.storyTitle || null,
      asOf: story.latestEvidenceDate || null,
      note: null,
      storyRef: story,
    };
  }

  // ============================================================
  // MAIN
  // ============================================================
  function analyze(priceFacts, kb, evidence) {
    kb = kb || null;
    // evidence = ผลจาก adapter (จำแนกแล้วฝั่ง server) — มาก่อน kb ที่ curate ด้วยมือ
    evidence = evidence || (priceFacts && priceFacts.evidence) || null;
    var closes = priceFacts && priceFacts.closes ? priceFacts.closes : [];
    var dd = computeDrawdown(closes, priceFacts && priceFacts.dates);
    var recognition = computeRecognition(closes, priceFacts && priceFacts.volumes, priceFacts && priceFacts.benchCloses, dd);
    var whyFell = computeWhyFell(kb);
    // ลำดับความสำคัญ: หลักฐานจาก adapter → KB ที่ curate ไว้ → ไม่มีข้อมูล
    var catalyst = null, storyObj = null;
    var em = EM();
    if (evidence && em) {
      var rawItems = Array.isArray(evidence.items) ? evidence.items.slice() : [];
      // รวมเหตุการณ์ที่ curate ด้วยมือเข้าไปด้วย (ถ้ามี) — ไม่ทับกัน
      if (kb && Array.isArray(kb.events)) {
        kb.events.forEach(function (e) {
          rawItems.push({
            ticker: (priceFacts && priceFacts.ticker) || null,
            eventDate: e.date || e.eventDate || null,
            sourceType: e.sourceType || "COMPANY_DISCLOSURE",
            sourceName: e.sourceName || e.source || null,
            sourceUrl: e.sourceUrl || e.url || null,
            eventType: e.eventType || null,
            title: e.title || null,
            summary: e.summary || null,
            evidenceStrength: e.evidenceStrength || null,
            confidence: e.confidence == null ? null : e.confidence,
            affectedBusiness: e.affectedBusiness || null,
            expectedImpact: e.expectedImpact || null,
            status: e.status || null,
          });
        });
      }
      storyObj = em.buildStory((priceFacts && priceFacts.ticker) || null, rawItems, {
        inspected: evidence.inspected === true,
        // engine เป็นเจ้าของสเกลการรับรู้ — ส่งข้อสรุปไป ไม่ส่งตัวเลขให้อีกฝั่งตีความเอง
        marketRecognized: recognition.state.n >= RECOG.CONFIRMED.n,
        marketRecognitionN: recognition.state.n,
      });
      catalyst = catalystFromStory(storyObj);
    }
    if (!catalyst) catalyst = computeCatalyst(kb);
    var inflection = computeInflection(kb);
    // §2/§3 — C5 ต้องมี "ทั้งสองอย่าง": catalyst ที่ระบุได้จริง (C3+) และหลักฐานว่าตลาดรับรู้
    // ราคา/วอลุ่ม "ห้าม" สร้าง catalyst ที่ไม่มีอยู่ — ไม่มี catalyst แล้วราคาวิ่ง ≠ C5
    if (catalyst.availability.key === AVAIL.CATALYST_IDENTIFIED.key &&
        catalyst.maturity.n >= MATURITY.C3_CONFIRMED.n &&
        recognition.state.n >= RECOG.CONFIRMED.n) {
      catalyst.maturity = MATURITY.C5_MARKET_RECOGNIZED;
      catalyst.maturityUpgradedBy = "catalyst(C3+) + market-recognition";
    }
    // §3 — maturityEvidence คือขั้นที่มาจากหลักฐานล้วน ราคาห้ามเขียนทับ (ตรวจย้อนหลังได้เสมอ)
    if (catalyst.maturityEvidence && catalyst.maturity.n > catalyst.maturityEvidence.n) {
      catalyst.maturityNote = "C5 = หลักฐานระดับ " + catalyst.maturityEvidence.label +
        " + ตลาดรับรู้แล้ว (" + recognition.state.label + ") — ราคาเองไม่ได้สร้างขั้นของ catalyst";
    }
    var finInfEarly = (evidence && evidence.financialInflection) || null;
    var thaiTrap = (evidence && evidence.valueTrapThai) || null;
    var trap = computeTrap(whyFell, inflection, catalyst, kb, thaiTrap);
    var st = computeState(dd, catalyst, inflection, recognition, trap);
    var lifecycle = computeLifecycle(st.state, catalyst, recognition);

    // P1a — whyFell: ถ้า KB ไม่มีข้อมูล (กรณีหุ้นไทยทั้งหมด) ใช้ชั้นอธิบายของไทย
    // ห้ามอนุมานเหตุผลทางธุรกิจจากราคา — โมดูลนั้นแยกข้อเท็จจริงเชิงราคาออกจากหลักฐานเชิงธุรกิจเอง
    var wft = WFT();
    if (wft && whyFell.category === "UNKNOWN") {
      var adverse = wft.extractAdverse(storyObj || (catalyst.events || []));
      var thaiWhy = wft.classify({
        drawdown: dd,
        benchCloses: priceFacts && priceFacts.benchCloses,
        valueTrap: trap,
        financialInflection: finInfEarly,
        adverseEvents: adverse,
      });
      whyFell = {
        category: thaiWhy.category,
        thai: thaiWhy.thai,
        evidence: thaiWhy.evidence,
        unknowns: thaiWhy.unknowns,
        asOf: dd.priceDate || null,
        note: thaiWhy.note,
        source: "ชั้นอธิบายของไทย (ราคา/ดัชนี/งบ/เอกสาร)",
        gapVsIndexPp: thaiWhy.gapVsIndexPp,
        benchDrawdownPct: thaiWhy.benchDrawdownPct,
        inferredFromPriceOnly: thaiWhy.inferredFromPriceOnly,
      };
    }

    // P1b — insider activity: หลักฐานสนับสนุน ไม่ใช่ catalyst
    var iaMod = IA();
    var insiderActivity = null;
    if (iaMod) {
      if (evidence && evidence.insiderActivity && evidence.insiderActivity.state) {
        insiderActivity = evidence.insiderActivity;   // ประเมินฝั่ง server แล้ว
      } else {
        var pool = storyObj
          ? (storyObj.otherEvents || []).concat(storyObj.evidenceItems || [])
          : [];
        insiderActivity = iaMod.assess(pool, {
          inspected: !!(evidence && evidence.inspected),
          asOf: dd.priceDate || null,
        });
      }
    }

    // PHASE 3.1 — ชั้น qualification รวมเจ็ดมิติเป็นสถานะสุดท้าย
    // ใช้ "งบจริง" (financialInflection) ไม่ใช่ inflection จาก KB ซึ่งเป็นคนละแหล่ง
    var finInf = (evidence && evidence.financialInflection) || null;
    var cq = CQ();
    var qualification = null;
    if (cq) {
      qualification = cq.qualify({
        drawdown: dd, catalyst: catalyst, financialInflection: finInf,
        recognition: recognition, valueTrap: trap, lifecycle: lifecycle,
        kbInflection: inflection,   // ตัวสำรองสำหรับ TURNAROUND เมื่อยังไม่มีตัวเลขงบ
        discovery: (evidence && evidence.discovery) || null,
      });
    }
    return {
      version: VERSION,
      ticker: priceFacts ? priceFacts.ticker : null,
      name: (kb && kb.name) || (priceFacts && priceFacts.name) || null,
      market: priceFacts ? priceFacts.market : null,
      drawdown: dd,
      whyFell: whyFell,
      catalyst: catalyst,
      inflection: inflection,
      recognition: recognition,
      valueTrap: trap,
      // สถานะสุดท้ายมาจากชั้น qualification เมื่อมี (รวมงบ+ค้นพบ) มิฉะนั้นใช้ของเดิม
      state: qualification ? qualification.state : st.state,
      stateWhy: qualification ? qualification.why : st.why,
      priceState: st.state,          // สถานะจากระนาบราคา/หลักฐานเดิม เก็บไว้เทียบได้
      qualification: qualification,
      financialInflection: finInf,
      // P1b มิติหลักฐานสนับสนุน — แยกจาก catalyst ชัดเจน
      insiderActivity: insiderActivity,
      lifecycle: lifecycle,
      story: storyObj || null,
      timeline: catalyst.events || [],
      rerating: reratingMechanism(catalyst, inflection, kb),
      invalidation: invalidationConditions(catalyst, kb),
      dataQuality: {
        price: priceFacts && priceFacts.source ? priceFacts.source : null,
        priceAsOf: dd.priceDate || null,
        priceBars: dd.bars || 0,
        benchmark: priceFacts && priceFacts.benchSymbol ? priceFacts.benchSymbol : null,
        catalystKb: kb ? (kb.asOf || "ไม่ระบุ asOf") : (evidence && evidence.inspected ? "SET Disclosure" : "DATA UNAVAILABLE"),
        storyPlaneAvailable: !!(kb || (evidence && evidence.inspected)),
        evidenceInspected: !!(evidence && evidence.inspected),
        disclosuresChecked: evidence ? evidence.totalDisclosures : null,
        routineFiltered: evidence ? evidence.routineCount : null,
        unclassified: evidence ? evidence.unknownCount : null,
        evidenceNote: evidence ? evidence.note : null,
      },
      disclaimer: "ไม่ใช่คำสั่งซื้อขาย — เป็นเครื่องมือค้นหาและติดตามหลักฐานว่าธุรกิจกำลังเปลี่ยนหรือไม่",
    };
  }

  // จัดอันดับตามสเปค §17 (deterministic ไม่ใช่คะแนนรวม)
  function rank(list) {
    return list.slice().sort(function (a, b) {
      var pa = a.state.prio, pb = b.state.prio;
      if (pa !== pb) return pa - pb;
      // ในสถานะเดียวกัน: หลักฐานแข็งกว่า → ย่อลึกกว่า
      var ea = a.catalyst.strongestEvidence == null ? -1 : a.catalyst.strongestEvidence;
      var eb = b.catalyst.strongestEvidence == null ? -1 : b.catalyst.strongestEvidence;
      if (ea !== eb) return eb - ea;
      var da = a.drawdown.drawdown52wPct == null ? 0 : a.drawdown.drawdown52wPct;
      var db = b.drawdown.drawdown52wPct == null ? 0 : b.drawdown.drawdown52wPct;
      if (da !== db) return da - db; // ติดลบมากกว่า = ย่อลึกกว่า = มาก่อน
      return String(a.ticker) < String(b.ticker) ? -1 : 1;
    });
  }

  var CatalystEngine = {
    VERSION: VERSION, CONFIG: CONFIG,
    DD: DD, WHY_FELL: WHY_FELL, WHY_FELL_TH: WHY_FELL_TH, CAT_TYPES: CAT_TYPES, AVAIL: AVAIL,
    MATURITY: MATURITY, STORY: STORY, INFLECTION: INFLECTION, RECOG: RECOG, TRAP: TRAP,
    STATE: STATE, LIFECYCLE: LIFECYCLE, EV_STRENGTH: EV_STRENGTH,
    analyze: analyze, rank: rank,
    _internal: { computeDrawdown: computeDrawdown, computeRecognition: computeRecognition,
      computeWhyFell: computeWhyFell, computeCatalyst: computeCatalyst, computeInflection: computeInflection,
      computeTrap: computeTrap, computeState: computeState, computeLifecycle: computeLifecycle,
      reratingMechanism: reratingMechanism, invalidationConditions: invalidationConditions },
  };
  if (typeof window !== "undefined") window.CatalystEngine = CatalystEngine;
  if (typeof module !== "undefined" && module.exports) module.exports = CatalystEngine;
})();
