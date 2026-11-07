(function () {
  "use strict";
  // ============================================================
  // Allocation Card — เอนจินของการ์ด "Asset allocation" บนหน้า /portfolio
  //
  // ตอบคำถามเดียว: เงินอยู่ที่ไหน — แต่ละก้อน (Bitcoin · หุ้นต่างประเทศ · กองทุน RMF ·
  // หุ้นไทย) ลงทุนจริงไปเท่าไร และมีส่วนที่ยังไม่ลงทุน ("รอซื้อ") เท่าไร · เงินสดใน Editor
  // อยู่ตรงไหนของกรอบเงินสด ต่ำ–สูง ที่ผู้ใช้ตั้งเอง
  //
  // แหล่งตัวเลข: R = PortfolioPosition.compute(snapshot) (portfolio-position-engine.js)
  //   - ภาพรวม (wealth / invested / cashTotal) อ่านจาก R.totals ตรง ๆ — ตัวเดียวกับ
  //     ส่วนหัวของหน้า ห้ามคิดใหม่ ไม่งั้นการ์ดกับส่วนหัวจะขัดกัน
  //   - ค่าของแต่ละก้อนอ่านจาก R.buckets เท่านั้น (bucket.invested = ส่วนที่ลงทุนแล้ว ·
  //     bucket.cash = ส่วนที่ยังไม่ลงทุนตามช่อง "ลงทุนแล้วกี่ %") — ห้ามอ่าน quarters เอง
  //
  // ข้อตกลงของไฟล์นี้ (แบบเดียวกับ portfolio-position-engine / asset-allocation-engine):
  //   - pure: ไม่มี DOM · ไม่มี fetch · ไม่อ่าน/เขียน storage
  //   - ES5 syntax เท่านั้น (var / function / ต่อ string)
  //   - ค่าที่ไม่รู้ต้องเป็น null เสมอ — ห้ามออก NaN / Infinity / undefined
  //   - เงินเป็นบาท ไม่ปัด · % เป็นตัวเลข 0–100 ไม่ปัด (ปัดที่ชั้นแสดงผลเท่านั้น)
  //   - ตัวเลขล้วน ไม่มีคำแนะนำ ไม่มีสัญญาณ — แถบเงินสดบอกแค่ ต่ำกว่า / ในกรอบ / สูงกว่ากรอบ
  // ============================================================

  var VERSION = "ac-1";

  // กรอบเงินสดเริ่มต้น (บาท) — ผู้ใช้แก้ได้ เก็บใน allocationPlan.cashBand ของเอกสารพอร์ต
  var DEFAULT_BAND = { min: 1000000, max: 3000000 };

  // ก้อนที่มีแท่ง เรียงตามลำดับนี้เสมอ · types = type ของรายการใน Quarterly Editor
  // (ผู้ใช้สั่ง 2026-11-07: เงินสำรองเลี้ยงชีพแยกเป็นแท่งของตัวเอง ใช้ชื่อ "กองทุนหุ้น" บนกราฟ)
  var CLASSES = [
    { key: "bitcoin", label: "Bitcoin", types: ["bitcoin"] },
    { key: "foreign", label: "หุ้นต่างประเทศ", types: ["foreign-stock"] },
    { key: "pvd", label: "กองทุนหุ้น", types: ["provident-fund"] },
    { key: "rmf", label: "กองทุน RMF", types: ["rmf-jang", "rmf-tum"] },
    { key: "thai", label: "หุ้นไทย", types: ["thai-stock"] }
  ];

  // ---------------------------------------------------------------- helpers
  // เข้มกับชนิด: รับเฉพาะ number ที่จำกัด — Number(null)=0 / Number("")=0 จะไม่หลุดเข้ามาเงียบ ๆ
  function num(v) { return (typeof v === "number" && isFinite(v)) ? v : null; }

  // a × 100 / b — b ต้องมากกว่า 0 ไม่งั้น null (คูณก่อนหาร ให้ค่ากลม ๆ ออกมาตรง)
  function pctOf(a, b) {
    if (a === null || b === null || !(b > 0)) return null;
    return a * 100 / b;
  }

  // ปัดขึ้นเป็นขั้น 1, 2, 2.5, 5 × 10^k ที่ ≥ x (บาท) · x ≤ 0 หรือไม่รู้ → 1,000,000
  // หาเลขยกกำลังด้วยการคูณ/หาร 10 ทีละขั้น (ไม่ใช้ log — log ของ 10^k คลาดได้ เช่น 2.9999…)
  function niceCeil(x) {
    if (typeof x !== "number" || !isFinite(x) || !(x > 0)) return 1000000;
    var p = 1;
    while (p * 10 <= x) p *= 10;
    while (p > x) p /= 10;
    var steps = [1, 2, 2.5, 5, 10];
    for (var i = 0; i < steps.length; i++) {
      if (steps[i] * p >= x) return steps[i] * p;
    }
    return 10 * p;
  }

  // กรอบเงินสดที่ใช้ได้: ตัวเลขจำกัด ≥ 0 ทั้งคู่ และ min ≤ max → { min, max } · ไม่ผ่าน → null
  // กติกาเดียวของทั้งระบบ — normalizePlan ใช้ตัวนี้ และหน้า (allocation-card-page.js) เรียกผ่าน AllocationCard.validBand
  function validBand(b) {
    if (!b || typeof b !== "object") return null;
    var mn = num(b.min), mx = num(b.max);
    if (mn === null || mx === null || mn < 0 || mx < 0 || mn > mx) return null;
    return { min: mn, max: mx };
  }

  // ---------------------------------------------------------------- plan
  // raw = allocationPlan จากเอกสาร /api/portfolio (อาจไม่มี / ผิดรูป)
  // กรอบต้องเป็นตัวเลขจำกัด ≥ 0 และ min ≤ max — ไม่งั้นใช้ค่าเริ่มต้นทั้งคู่ (ไม่ผสมครึ่ง ๆ)
  function normalizePlan(raw) {
    var r = (raw && typeof raw === "object") ? raw : {};
    var band = validBand(r.cashBand) || { min: DEFAULT_BAND.min, max: DEFAULT_BAND.max };
    var updatedAt = (typeof r.updatedAt === "string" && r.updatedAt) ? r.updatedAt : null;
    return { cashBand: band, updatedAt: updatedAt };
  }

  // ---------------------------------------------------------------- compute
  function classOfType(type) {
    for (var i = 0; i < CLASSES.length; i++) {
      if (CLASSES[i].types.indexOf(type) >= 0) return CLASSES[i].key;
    }
    return null;
  }

  function compute(R, plan) {
    if (!R || typeof R !== "object") return { available: false, reason: "no-data" };
    if (R.available !== true) return { available: false, reason: typeof R.reason === "string" ? R.reason : null };

    var P = normalizePlan(plan);
    var totals = (R.totals && typeof R.totals === "object") ? R.totals : {};
    var buckets = Array.isArray(R.buckets) ? R.buckets : [];

    // ภาพรวม = ตัวเลขเดียวกับส่วนหัวของหน้า
    var wealth = num(totals.total);
    var invested = num(totals.investedSum);
    var cashTotal = num(totals.cashSum);

    // รวมเงินต่อก้อนจาก R.buckets
    var sums = {};
    CLASSES.forEach(function (c) { sums[c.key] = { held: 0, wait: 0 }; });
    var others = { held: 0, wait: 0 };
    var cashEditor = 0;
    buckets.forEach(function (b) {
      if (!b || typeof b !== "object") return;
      if (b.type === "cash") { cashEditor += num(b.gross) || 0; return; }
      var k = classOfType(b.type);
      // นอกก้อนที่มีแท่ง = custom (เอนจินเดิมแปลง type ที่ไม่รู้จักเป็น custom อยู่แล้ว) — นับในความมั่งคั่ง ไม่มีแท่ง
      var s = k ? sums[k] : others;
      s.held += num(b.invested) || 0;
      s.wait += num(b.cash) || 0;
    });

    // wealthPct = ทั้งแท่ง (ลงทุนแล้ว + รอซื้อ) ÷ ความมั่งคั่งรวม — ฐานเดียวกับบล็อก "สัดส่วนพอร์ตตอนนี้" ของหน้า
    //   (ผู้ใช้สั่ง 2026-11-07 หลัง implement: เดิมเป็น held ÷ wealth) · ก้อนว่าง → null · wealth 0 / ไม่รู้ → null
    //   Σ wealthPct ของทุกก้อน + เงินสดใน Editor + อื่น ๆ (ลงทุน + รอซื้อ) = 100
    var classes = CLASSES.map(function (c) {
      var held = sums[c.key].held, wait = sums[c.key].wait;
      var total = held + wait;
      var empty = !(total > 0);
      return {
        key: c.key, label: c.label,
        held: held, wait: wait, total: total,
        heldPct: empty ? null : pctOf(held, total),
        waitPct: empty ? null : pctOf(wait, total),
        // ก้อนว่างคือ 0% ของความมั่งคั่งจริง ๆ (ไม่ใช่ "ไม่รู้") — null เฉพาะตอนความมั่งคั่ง 0 (pctOf กันหารศูนย์)
        wealthPct: pctOf(total, wealth),
        empty: empty
      };
    });

    // แกนตั้งของกราฟแท่ง: ค่าสูงสุดของ total ทุกก้อน ปัดขึ้น · 5 ขีด 0, ¼, ½, ¾, max
    var top = 0;
    classes.forEach(function (c) { if (c.total > top) top = c.total; });
    var axisMax = niceCeil(top);

    // แถบเงินสด: เทียบเงินสดใน Editor (ไม่ใช่ cashTotal) กับกรอบของผู้ใช้
    var band = P.cashBand;
    var now = cashEditor;
    var status = null;
    if (now !== null) status = now < band.min ? "below" : (now > band.max ? "above" : "within");
    var scaleMax = Math.max(band.max * 4 / 3, (now || 0) * 1.1);
    // กรอบ 0–0 กับเงินสด 0 → สเกล 0 หน้าจะหารด้วยศูนย์ · ใช้ 1,000,000 แบบเดียวกับแกน
    if (!(scaleMax > 0)) scaleMax = 1000000;

    return {
      available: true,
      reason: null,
      quarterKey: typeof R.quarterKey === "string" ? R.quarterKey : null,
      wealth: wealth,
      invested: invested,
      investedPct: pctOf(invested, wealth),
      cashEditor: cashEditor,
      waitSum: cashTotal === null ? null : cashTotal - cashEditor,
      cashTotal: cashTotal,
      cashTotalPct: pctOf(cashTotal, wealth),
      classes: classes,
      others: others,
      axis: { max: axisMax, ticks: [0, axisMax / 4, axisMax / 2, axisMax * 3 / 4, axisMax] },
      cashBand: { min: band.min, max: band.max, now: now, status: status, scaleMax: scaleMax }
    };
  }

  var AllocationCard = {
    VERSION: VERSION,
    DEFAULT_BAND: DEFAULT_BAND,
    CLASSES: CLASSES,
    normalizePlan: normalizePlan,
    validBand: validBand,
    compute: compute,
    niceCeil: niceCeil
  };

  if (typeof window !== "undefined") window.AllocationCard = AllocationCard;
  if (typeof module !== "undefined" && module.exports) module.exports = AllocationCard;
})();
