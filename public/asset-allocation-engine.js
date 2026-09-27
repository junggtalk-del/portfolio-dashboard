(function () {
  "use strict";
  // ============================================================
  // Asset Allocation Engine — แบ่งพอร์ตเป็น 3 ระยะ (สั้น/กลาง/ยาว)
  // แล้ววัด "ผลตอบแทนจริง" ของแต่ละระยะเทียบกับ "ผลตอบแทนที่คาดหวัง"
  //
  // ทำไมต้องมี engine แยก: ตัวเลขการเติบโตทุกที่ในแอปตอนนี้คิดจาก
  // value_now / value_prev − 1 บนยอดคงเหลือ ซึ่ง "รวมเงินที่เติม/ถอนเข้าไปด้วย"
  // (ดู public/app.js:411 ที่เขียนกำกับไว้เอง) — โอนเงินเดือนเข้าพอร์ตระยะสั้น
  // จะอ่านออกมาเป็นผลตอบแทน +30% ซึ่งไม่จริง
  // engine นี้จึงหักเงินเติม/ถอน (netFlow) ออกด้วยวิธี Modified Dietz
  //
  // ข้อตกลงของไฟล์นี้:
  //   - pure: ไม่มี DOM · ไม่มี fetch · ไม่เขียน storage · ไม่มี logic ของ UI
  //   - ES5 syntax เท่านั้น (var / function / ต่อ string)
  //   - ค่าที่คำนวณไม่ได้ต้องเป็น null เสมอ — ห้ามออก NaN / Infinity / undefined
  //   - ไม่ปัดเศษ (ปัดที่ชั้นแสดงผลเท่านั้น) · ผลตอบแทนเป็นเศษส่วน ไม่ใช่ %
  // ============================================================

  // สำเนาจาก public/app.js TYPE_LABELS — ใช้เติมชื่อเวลา asset ไม่ได้ตั้งชื่อเอง
  var TYPE_LABELS = {
    bitcoin: "Bitcoin",
    "foreign-stock": "หุ้นต่างประเทศ",
    "thai-stock": "หุ้นไทย",
    "provident-fund": "เงินสำรองเลี้ยงชีพ",
    "rmf-jang": "RMF-จัง",
    "rmf-tum": "RMF-ตุ๋ม",
    cash: "เงินสด",
    custom: "อื่นๆ"
  };

  var PORTS = ["short", "mid", "long"];
  var PORT_META = {
    short: { key: "short", label: "ระยะสั้น", sub: "เงินใช้จ่าย / สภาพคล่อง", color: "#38bdf8" },
    mid: { key: "mid", label: "ระยะกลาง", sub: "ลงทุนระยะกลาง", color: "#f59e0b" },
    long: { key: "long", label: "ระยะยาว", sub: "เสี่ยงสูง ถือยาว", color: "#a855f7" }
  };

  var DEFAULTS = { dietzWeight: 0.5, horizonQuarters: 4, trailQuarters: 3, imputeEntries: true };
  var GAP_BAND = 0.005; // ห่างจากเส้นคาดหวังน้อยกว่า 0.5% ถือว่า "ตามเป้า"

  // ---------------------------------------------------------------- helpers
  // เข้มกับ coercion: Number(null)=0 · Number("")=0 · Number(" ")=0 · Number([])=0
  // ถ้าปล่อยผ่าน ค่าที่หายไปจะกลายเป็น 0 เงียบ ๆ แล้วผลตอบแทนผิดโดยไม่มี error
  function fin(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v === "string") {
      var s = v.replace(/^\s+|\s+$/g, "");
      if (s === "") return null;
      var n = Number(s);
      return isFinite(n) ? n : null;
    }
    return null;
  }
  function safe(v) { var n = fin(v); return n === null ? null : n; }
  function clampNum(v, lo, hi) { return v === null ? null : Math.max(lo, Math.min(hi, v)); }
  function isObj(o) { return !!o && typeof o === "object" && !(o instanceof Array); }

  function assetKey(asset) {
    if (!asset) return "";
    var t = asset.type == null ? "" : String(asset.type);
    var n = asset.name ? String(asset.name) : (TYPE_LABELS[t] || "");
    return t + "::" + n;
  }

  function compareQuarter(a, b) {
    var A = String(a).split("-Q"), B = String(b).split("-Q");
    var ay = Number(A[0]), aq = Number(A[1]), by = Number(B[0]), bq = Number(B[1]);
    if (!isFinite(ay) || !isFinite(by)) return String(a) < String(b) ? -1 : (String(a) > String(b) ? 1 : 0);
    return ay === by ? aq - bq : ay - by;
  }

  function shiftQuarter(key, n) {
    var p = String(key).split("-Q");
    var y = Number(p[0]), q = Number(p[1]);
    if (!isFinite(y) || !isFinite(q)) return null;
    var idx = y * 4 + (q - 1) + (Number(n) || 0);
    return Math.floor(idx / 4) + "-Q" + (((idx % 4) + 4) % 4 + 1);
  }

  // ---------------------------------------------------------------- config
  // สัดส่วนของสินทรัพย์หนึ่งตัวข้ามพอร์ต เช่น Bitcoin สั้น 0% กลาง 30% ยาว 70%
  // รองรับรูปแบบเก่า (ค่าเป็น string ชื่อพอร์ตเดียว) โดยแปลงเป็น 100% ของพอร์ตนั้น
  function normalizeSplit(v) {
    var out = {};
    if (typeof v === "string") {
      if (PORTS.indexOf(v) < 0) return null;
      out[v] = 100;
      return out;
    }
    if (!isObj(v)) return null;
    PORTS.forEach(function (p) {
      var n = fin(v[p]);
      if (n === null || !(n > 0)) return;
      out[p] = Math.min(100, n);
    });
    return Object.keys(out).length ? out : null;
  }
  function splitSum(split) {
    var s = 0;
    if (!split) return 0;
    PORTS.forEach(function (p) { s += split[p] || 0; });
    return s;
  }

  function normalizeAllocation(raw) {
    var src = isObj(raw) ? raw : {};
    var out = { version: 1, map: {}, ports: {}, monthlyExpense: null, updatedAt: null };
    var m = isObj(src.map) ? src.map : {};
    Object.keys(m).forEach(function (k) {
      var sp = normalizeSplit(m[k]);           // ค่าที่อ่านไม่ออก = ยังไม่จัด
      if (sp) out.map[k] = sp;
    });
    var ps = isObj(src.ports) ? src.ports : {};
    PORTS.forEach(function (p) {
      var cfg = isObj(ps[p]) ? ps[p] : {};
      out.ports[p] = { expectedReturnPct: safe(cfg.expectedReturnPct) };
    });
    out.monthlyExpense = safe(src.monthlyExpense);
    var rt = isObj(src.retirement) ? src.retirement : {};
    out.retirement = {
      inflationPct: clampNum(safe(rt.inflationPct), -50, 100),
      annualContribution: safe(rt.annualContribution),  // null = ใช้ค่าที่สังเกตได้จาก netFlow
      // จำกัดช่วงที่สมเหตุสมผล: พิมพ์เกินหลักเดียว (เช่น 100 แทน 10 ปี) ไม่ควรทำให้
      // ตัวเลขบานเป็น Infinity หรือกราฟมีแสนจุด — ที่ workYears ≥ 15,000 ปี
      // (1.05^15000) ล้นความละเอียดของ double แล้ว wealthAtRetirement กลายเป็น Infinity
      workYears: clampNum(safe(rt.workYears), 0, 80),
      retireYears: clampNum(safe(rt.retireYears), 0, 80),
      currentAge: clampNum(safe(rt.currentAge), 0, 120),  // ไม่บังคับ — ใส่แล้วหน้าเว็บจะแสดงเป็นอายุแทนจำนวนปี
      postReturnPct: clampNum(safe(rt.postReturnPct), -50, 100)  // ผลตอบแทนคาดหวัง "หลังเกษียณ" · null = ใช้ค่าเดียวกับก่อนเกษียณ
    };
    out.updatedAt = typeof src.updatedAt === "string" ? src.updatedAt : null;
    return out;
  }

  // ---------------------------------------------------------------- retirement
  // เงินก้อนที่ต้องมี ณ วันเกษียณ เพื่อถอนใช้ R ปี โดยค่าใช้จ่ายโตตามเงินเฟ้อ
  // และเงินที่เหลือยังได้ผลตอบแทน g ต่อไป (ถอนต้นปี = annuity due)
  //   A = ค่าใช้จ่ายปีแรกของการเกษียณ (เป็นเงินตอนนั้น ไม่ใช่เงินวันนี้)
  //   r = ผลตอบแทนที่แท้จริง = (1+g)/(1+i) − 1
  function requiredCapital(A, R, g, i) {
    var a = fin(A), n = fin(R), gg = fin(g), ii = fin(i);
    if (a === null || n === null || gg === null || ii === null) return null;
    if (!(n > 0) || !(a >= 0) || 1 + ii <= 0) return null;
    var r = (1 + gg) / (1 + ii) - 1;
    var v;
    if (Math.abs(r) < 1e-9) v = a * n;                       // ผลตอบแทนเท่าเงินเฟ้อพอดี
    else v = a * (1 - Math.pow(1 + r, -n)) * (1 + r) / r;
    return isFinite(v) ? v : null;
  }

  // เดินเงินปีต่อปี: ช่วงทำงานเติมเงินปลายปี · ช่วงเกษียณถอนต้นปีแล้วที่เหลือค่อยโต
  function projectWealth(opts) {
    var W0 = fin(opts.startWealth), g = fin(opts.rate), i = fin(opts.inflationPct);
    var gPost = fin(opts.postRate); if (gPost === null) gPost = g;   // ไม่ระบุ = ใช้อัตราเดียวกัน
    var Y = fin(opts.workYears), R = fin(opts.retireYears);
    var C = fin(opts.annualContribution), E = fin(opts.monthlyExpense);
    if (W0 === null || g === null || i === null || Y === null || R === null || E === null) return null;
    if (Y < 0 || R <= 0 || 1 + i <= 0 || 1 + g <= 0 || 1 + gPost <= 0) return null;
    if (C === null) C = 0;

    var series = [{ year: 0, wealth: W0, phase: "work", flow: 0 }];
    var W = W0, t, runsOut = null;
    for (t = 1; t <= Y; t++) {
      var c = C * Math.pow(1 + i, t - 1);                    // เงินที่เติมโตตามเงินเฟ้อ
      W = W * (1 + g) + c;
      series.push({ year: t, wealth: W, phase: "work", flow: c });
    }
    var wealthAtRetirement = W;
    var A = E * 12 * Math.pow(1 + i, Y);                     // ค่าใช้จ่ายปีแรกหลังเกษียณ
    for (t = 1; t <= R; t++) {
      var x = A * Math.pow(1 + i, t - 1);
      W = (W - x) * (1 + gPost);   // ช่วงเกษียณใช้ผลตอบแทนหลังเกษียณ
      // เผื่อความคลาดเคลื่อนของทศนิยม: พอร์ตที่มีเงิน "พอดีเป๊ะ" จะจบที่ราว −1e-9
      // ถ้าเทียบกับ 0 ตรง ๆ จะถูกตีว่าเงินหมด ทั้งที่จริงคือพอดี
      var tol = Math.abs(x) * 1e-9 + 1e-6;
      if (W < -tol && runsOut === null) runsOut = Y + t;
      series.push({ year: Y + t, wealth: W < 0 ? 0 : W, phase: "retire", flow: -x });
    }
    if (Math.abs(W) <= Math.abs(A) * 1e-9 + 1e-6) W = 0;
    return {
      series: series, wealthAtRetirement: wealthAtRetirement,
      endWealth: W, runsOutInYear: runsOut, postRate: gPost,
      yearsShort: runsOut === null ? 0 : (Y + R) - runsOut + 1,
      firstRetirementExpense: A
    };
  }

  // ต้องเติมเงินปีละเท่าไหร่ เงินถึงจะพอดีจนจบช่วงเกษียณ (ค้นหาแบบแบ่งครึ่ง)
  // endWealth เพิ่มตาม C แบบ monotonic จึงใช้ bisection ได้ปลอดภัย
  function solveContribution(opts) {
    function endAt(c) {
      var p = projectWealth({
        startWealth: opts.startWealth, rate: opts.rate, postRate: opts.postRate, inflationPct: opts.inflationPct,
        workYears: opts.workYears, retireYears: opts.retireYears,
        annualContribution: c, monthlyExpense: opts.monthlyExpense
      });
      return p ? p.endWealth : null;
    }
    var zero = endAt(0);
    if (zero === null) return null;
    if (zero >= 0) return 0;                                  // ไม่ต้องเติมก็พอแล้ว
    if (!(fin(opts.workYears) > 0)) return null;              // เกษียณแล้ว เติมไม่ได้
    var hi = Math.max(1, Math.abs(fin(opts.monthlyExpense)) * 12), guard = 0;
    while (endAt(hi) < 0 && guard++ < 80) hi *= 2;
    if (guard >= 80) return null;
    var lo = 0;
    for (var k = 0; k < 200; k++) {
      var mid = (lo + hi) / 2;
      if (endAt(mid) < 0) lo = mid; else hi = mid;
    }
    return isFinite(hi) ? hi : null;
  }

  // ---- ช่วงหลังเกษียณ: มีเงินก้อนนี้แล้ว ถอนใช้ได้ปีละเท่าไหร่
  //
  // (1) แบบ "หมดพอดีตอนจบแผน" — กลับด้านสูตร requiredCapital
  function sustainableAnnual(W, R, g, i) {
    var w = fin(W), n = fin(R), gg = fin(g), ii = fin(i);
    if (w === null || n === null || gg === null || ii === null) return null;
    if (!(n > 0) || !(w > 0) || 1 + ii <= 0) return null;
    var r = (1 + gg) / (1 + ii) - 1;
    var factor = Math.abs(r) < 1e-9 ? n : (1 - Math.pow(1 + r, -n)) * (1 + r) / r;
    if (!(factor > 0)) return null;
    var v = w / factor;
    return isFinite(v) ? v : null;
  }

  // (2) แบบ "ไม่แตะต้นเงิน" — ถอนได้เฉพาะส่วนที่ผลตอบแทนชนะเงินเฟ้อ เงินต้นจึงโตตามเงินเฟ้อ
  //     และถอนได้เท่าเดิมในค่าเงินจริงไปตลอด ไม่มีวันหมด
  //     A = W · r/(1+r) — พิสูจน์: (W − A)(1+g) = W(1+i) ⇒ A = W[1 − (1+i)/(1+g)]
  function perpetualAnnual(W, g, i) {
    var w = fin(W), gg = fin(g), ii = fin(i);
    if (w === null || gg === null || ii === null || !(w > 0) || 1 + ii <= 0) return null;
    var r = (1 + gg) / (1 + ii) - 1;
    if (!(r > 0)) return null;        // ผลตอบแทนไม่ชนะเงินเฟ้อ → ไม่มีทางอยู่ได้ตลอด
    var v = w * r / (1 + r);
    return isFinite(v) ? v : null;
  }

  // ต้องทำผลตอบแทนกี่ %/ปี เงินถึงจะพอดี ณ วันเกษียณ
  //
  // ระวัง: อัตรานี้มีผลกับ "ทั้งสองฝั่ง" พร้อมกัน — ผลตอบแทนสูงขึ้นทำให้เงินที่จะมีโตขึ้น
  // และทำให้เงินที่ต้องมีลดลงด้วย (เพราะเงินที่เหลือหลังเกษียณงอกเร็วขึ้น)
  // จึงแก้สมการตรง ๆ ไม่ได้ ต้องค้นหา แต่ผลต่าง (เงินที่จะมี − เงินที่ต้องมี)
  // เพิ่มตาม g แบบ monotonic จึงใช้ bisection ได้ปลอดภัย
  function solveRequiredRate(opts) {
    var i = fin(opts.inflationPct), R = fin(opts.retireYears);
    if (i === null || R === null || !(R > 0)) return null;
    var gPost = fin(opts.postRate);
    function diff(g) {
      var p = projectWealth({
        startWealth: opts.startWealth, rate: g, postRate: gPost, inflationPct: i,
        workYears: opts.workYears, retireYears: R,
        annualContribution: opts.annualContribution, monthlyExpense: opts.monthlyExpense
      });
      if (!p) return null;
      var req = requiredCapital(p.firstRetirementExpense, R, gPost === null ? g : gPost, i);
      if (req === null) return null;
      return p.wealthAtRetirement - req;
    }
    var lo = -0.95, hi = 0.5, d = diff(lo);
    if (d === null) return null;
    if (d >= 0) return lo;                         // พอแล้วแม้ผลตอบแทนติดลบหนัก
    var guard = 0;
    d = diff(hi);
    while (d !== null && d < 0 && guard++ < 40) { hi *= 1.5; d = diff(hi); }
    if (d === null || d < 0) return null;          // ต้องสูงเกินกว่าจะเป็นจริงได้
    for (var k = 0; k < 200; k++) {
      var mid = (lo + hi) / 2, dm = diff(mid);
      if (dm === null) return null;
      if (dm < 0) lo = mid; else hi = mid;
    }
    return isFinite(hi) ? hi : null;
  }

  // ผลตอบแทนรวมของพอร์ต ถ่วงตามมูลค่าจริงของแต่ละพอร์ต
  // ใช้เฉพาะพอร์ตที่มีตัวเลข — ถ้าไม่มีเลยคืน null (ห้ามเดา)
  function blendRate(portsOut, pick) {
    var sum = 0, weight = 0, used = [];
    PORTS.forEach(function (p) {
      var P = portsOut[p], v = pick(P);
      if (v === null || v === undefined || !(P.latestValue > 0)) return;
      sum += v * P.latestValue;
      weight += P.latestValue;
      used.push(p);
    });
    if (!(weight > 0)) return { rate: null, coveredPct: 0, ports: [] };
    return { rate: sum / weight, coveredPct: weight, ports: used };
  }

  // ---------------------------------------------------------------- math
  // Modified Dietz: r = (Vend − Vstart − F) / (Vstart + w·F)
  // w = 0.5 เพราะผู้ใช้บันทึกเงินเติม/ถอน "สุทธิทั้งไตรมาส" โดยไม่มีวันที่
  // จึงสมมติว่าเงินเข้ากลางงวด — ทุกตัวเลขที่ออกจอต้องมี "~" กำกับ
  function dietz(vStart, vEnd, flow, w) {
    var s = fin(vStart), e = fin(vEnd), f = fin(flow);
    var weight = fin(w);
    if (weight === null) weight = DEFAULTS.dietzWeight;
    if (s === null || e === null || f === null) return null;
    if (!(s > 0)) return null;                 // พอร์ตว่างต้นงวด — ไม่มีฐานให้คิด %
    var denom = s + weight * f;
    if (!(denom > 0)) return null;             // ถอนมากกว่าที่มี — ตัวเลขจะไม่มีความหมาย
    var r = (e - s - f) / denom;
    return isFinite(r) ? r : null;
  }

  // ผลตอบแทนต่อกัน (chain-link) → ดัชนีเริ่มที่ 100
  // r ที่เป็น null นับเป็น 0% (ไม่โต ไม่ลด) เพื่อไม่ให้ดัชนีขาดตอน
  function chainIndex(returns) {
    var out = [100], acc = 1;
    (returns || []).forEach(function (r) {
      var v = fin(r);
      acc = acc * (1 + (v === null ? 0 : v));
      out.push(acc * 100);
    });
    return out;
  }

  // ต้องมีอย่างน้อย 4 ไตรมาสถึงจะพูดว่า "ต่อปี" ได้ — ต่ำกว่านั้นคืน null
  function annualize(cumReturn, nQuarters) {
    var c = fin(cumReturn), n = fin(nQuarters);
    if (c === null || n === null || n < 4) return null;
    if (1 + c <= 0) return null;
    var v = Math.pow(1 + c, 4 / n) - 1;
    return isFinite(v) ? v : null;
  }

  // เส้นคาดหวัง: ทบต้นจากผลตอบแทนต่อปี E มาเป็นรายไตรมาส
  function expectedIndex(E, k) {
    var e = fin(E), q = fin(k);
    if (e === null || q === null) return null;
    if (1 + e <= 0) return null;
    var v = 100 * Math.pow(1 + e, q / 4);
    return isFinite(v) ? v : null;
  }

  // ต้องทำผลตอบแทนต่อปีเท่าไหร่ จึงจะกลับไปอยู่บนเส้นคาดหวังภายใน H ไตรมาส
  function requiredAnnualized(indexNow, E, kNow, H) {
    var a = fin(indexNow), e = fin(E), k = fin(kNow), h = fin(H);
    if (a === null || e === null || k === null || h === null) return null;
    if (!(a > 0) || !(h > 0) || 1 + e <= 0) return null;
    var target = 100 * Math.pow(1 + e, (k + h) / 4);
    if (!isFinite(target) || !(target > 0)) return null;
    var v = Math.pow(target / a, 4 / h) - 1;
    return isFinite(v) ? v : null;
  }

  // นับเฉพาะไตรมาสที่ "ต่ำกว่าเส้นคาดหวังติดต่อกัน" โดยนับถอยจากไตรมาสล่าสุด
  function trailingBehind(actualArr, expectedArr, n) {
    var need = fin(n);
    if (need === null) need = DEFAULTS.trailQuarters;
    var A = actualArr || [], E = expectedArr || [];
    var count = 0;
    for (var i = Math.min(A.length, E.length) - 1; i >= 1; i--) {
      var a = fin(A[i]), e = fin(E[i]);
      if (a === null || e === null || !(a < e)) break;
      count++;
    }
    return { count: count, warn: count >= need };
  }

  // drawdown ต้องคิดจาก "ดัชนีที่หักเงินเติม/ถอนแล้ว" เท่านั้น
  // ถ้าคิดจากมูลค่าดิบ การถอนเงินออกไปใช้จะอ่านออกมาเหมือนพอร์ตพัง
  function maxDrawdown(indexArr) {
    var A = (indexArr || []).map(fin).filter(function (v) { return v !== null; });
    if (A.length < 2) return null;
    var peak = A[0], peakIdx = 0, worst = 0, wPeak = 0, wTrough = 0;
    for (var i = 1; i < A.length; i++) {
      if (A[i] > peak) { peak = A[i]; peakIdx = i; }
      if (peak > 0) {
        var dd = A[i] / peak - 1;
        if (dd < worst) { worst = dd; wPeak = peakIdx; wTrough = i; }
      }
    }
    var cur = peak > 0 ? A[A.length - 1] / peak - 1 : null;
    return {
      maxDrawdown: isFinite(worst) ? worst : null,
      peakIdx: wPeak, troughIdx: wTrough,
      currentDrawdown: cur !== null && isFinite(cur) ? cur : null
    };
  }

  // ---------------------------------------------------------------- series
  function unwrap(portfolioData) {
    var ps = portfolioData || null;
    return ps && (ps.data || (ps.quarters ? ps : null));
  }

  // มูลค่าของ 1 รายการ — กติกาเดียวกับ portfolio-position-engine.js:105-108
  // ไตรมาสปัจจุบันใช้ manualValue (ค่าที่กำลังแก้) ไตรมาสก่อนใช้ snapshotValue (ค่าที่แช่ไว้)
  function grossOf(asset, preferManual) {
    var m = fin(asset.manualValue), s = fin(asset.snapshotValue);
    return preferManual ? (m !== null ? m : (s === null ? 0 : s)) : (s !== null ? s : (m === null ? 0 : m));
  }

  function buildSeries(data, allocation, opts) {
    var o = opts || {};
    var impute = o.imputeEntries !== false;
    var quarters = isObj(data) && isObj(data.quarters) ? data.quarters : {};
    var allKeys = Object.keys(quarters).sort(compareQuarter);
    var currentQuarter = data && typeof data.currentQuarter === "string" ? data.currentQuarter : null;

    // รวมรายการของแต่ละไตรมาสตาม assetKey (รายการชื่อซ้ำในไตรมาสเดียวกันให้บวกกัน
    // เหมือน mapAssetsByKey ใน app.js:351-360 ไม่งั้นจะนับรายการหายไปหนึ่งตัว)
    var perQuarter = {}, kept = [], skipped = [];
    allKeys.forEach(function (k) {
      var q = quarters[k];
      var list = (q && q.assets instanceof Array) ? q.assets : [];
      var preferManual = k === currentQuarter;
      var rows = {}, total = 0;
      list.forEach(function (a) {
        if (!isObj(a)) return;
        var key = assetKey(a);
        var v = grossOf(a, preferManual) || 0;
        var nf = fin(a.netFlow);
        var r = rows[key];
        if (!r) {
          r = rows[key] = {
            key: key, type: a.type == null ? "" : String(a.type),
            name: a.name ? String(a.name) : (TYPE_LABELS[a.type] || String(a.type || "")),
            value: 0, flow: 0, hasFlow: false
          };
        }
        r.value += v;
        if (nf !== null) { r.flow += nf; r.hasFlow = true; }
        total += v;
      });
      // ไตรมาสที่ทั้งไตรมาสเป็นศูนย์ (เช่นสร้างไตรมาสหน้าไว้ล่วงหน้าแต่ยังไม่กรอก)
      // ต้องข้าม ไม่งั้นจะอ่านออกมาเป็น −100% ทุกพอร์ต
      if (total <= 0) { skipped.push(k); return; }
      perQuarter[k] = rows;
      kept.push(k);
    });

    return {
      keys: kept, skipped: skipped, perQuarter: perQuarter,
      currentQuarter: currentQuarter,
      latestKey: kept.length ? kept[kept.length - 1] : null,
      impute: impute
    };
  }

  // ---------------------------------------------------------------- compute
  function compute(portfolioData, allocationRaw, opts) {
    var o = opts || {};
    var dietzWeight = fin(o.dietzWeight); if (dietzWeight === null) dietzWeight = DEFAULTS.dietzWeight;
    var horizonQuarters = fin(o.horizonQuarters); if (horizonQuarters === null || horizonQuarters <= 0) horizonQuarters = DEFAULTS.horizonQuarters;
    var trailQuarters = fin(o.trailQuarters); if (trailQuarters === null || trailQuarters <= 0) trailQuarters = DEFAULTS.trailQuarters;

    var data = unwrap(portfolioData);
    var allocation = normalizeAllocation(allocationRaw !== undefined && allocationRaw !== null
      ? allocationRaw
      : (data && data.allocation));

    if (!data || !isObj(data.quarters) || !Object.keys(data.quarters).length) {
      return {
        available: false, reason: "no-quarterly",
        thai: "ยังไม่มีข้อมูลใน Quarterly Editor",
        allocation: allocation,
        meta: { dietzWeight: dietzWeight, horizonQuarters: horizonQuarters, trailQuarters: trailQuarters }
      };
    }

    var S = buildSeries(data, allocation, { imputeEntries: o.imputeEntries });
    if (!S.keys.length) {
      return {
        available: false, reason: "no-values",
        thai: "มีไตรมาสอยู่ แต่ยังไม่มีมูลค่าสินทรัพย์ในไตรมาสไหนเลย",
        allocation: allocation,
        meta: { dietzWeight: dietzWeight, horizonQuarters: horizonQuarters, trailQuarters: trailQuarters }
      };
    }

    var keys = S.keys, latestKey = S.latestKey;
    var latestRows = S.perQuarter[latestKey];

    // ---- รายการทั้งหมดที่เคยเห็น (ใช้ทำรายการ "ยังไม่จัด" และรายการต่อพอร์ต)
    var seen = {};
    keys.forEach(function (k) {
      var rows = S.perQuarter[k];
      Object.keys(rows).forEach(function (kk) {
        var r = rows[kk];
        var s = seen[kk];
        if (!s) s = seen[kk] = { key: kk, name: r.name, type: r.type, latestValue: 0, lastSeenKey: null, presentQuarters: 0 };
        s.name = r.name; s.type = r.type;
        s.presentQuarters++;
        s.lastSeenKey = k;
        if (k === latestKey) s.latestValue = r.value;
      });
    });
    var seenKeys = Object.keys(seen);

    // map ที่ชี้ไปรายการที่ไม่มีอยู่ในไตรมาสไหนเลย (เช่นเปลี่ยนชื่อรายการ)
    var staleKeys = Object.keys(allocation.map).filter(function (k) { return seenKeys.indexOf(k) < 0; });

    // สัดส่วนที่ "ใช้ได้จริง" ของแต่ละรายการ — ถ้ารวมกันเกิน 100% ถือว่ายังตั้งค่าไม่ถูก
    // และไม่เอาเข้าพอร์ตเลย เพราะถ้าปล่อยผ่าน ยอดรวมของพอร์ตจะมากกว่ามูลค่าพอร์ตจริง
    var invalidSplits = [];
    function effSplit(k) {
      var sp = allocation.map[k];
      if (!sp) return null;
      if (splitSum(sp) > 100 + 1e-9) return null;
      return sp;
    }
    seenKeys.forEach(function (k) {
      var sp = allocation.map[k];
      if (sp && splitSum(sp) > 100 + 1e-9) {
        invalidSplits.push({ key: k, name: seen[k].name, sum: splitSum(sp), split: sp });
      }
    });
    function weightOf(k, p) {
      var sp = effSplit(k);
      return sp && sp[p] > 0 ? sp[p] / 100 : 0;
    }

    // ---- ยอดรวมของไตรมาสล่าสุด (ส่วนที่จัดแล้ว = มูลค่า × สัดส่วนที่จัด)
    var latestTotal = 0, assignedTotal = 0;
    Object.keys(latestRows).forEach(function (kk) {
      var v = latestRows[kk].value;
      latestTotal += v;
      var sp = effSplit(kk);
      if (sp) assignedTotal += v * Math.min(100, splitSum(sp)) / 100;
    });

    // "ยังไม่จัด" = รายการที่จัดไม่ครบ 100% (รวมถึงยังไม่จัดเลย) พร้อมส่วนที่เหลือ
    var unassigned = seenKeys
      .map(function (k) {
        var s = seen[k], sp = effSplit(k);
        var assignedPctOfAsset = sp ? Math.min(100, splitSum(sp)) : 0;
        return {
          key: k, name: s.name, type: s.type, typeLabel: TYPE_LABELS[s.type] || s.type,
          latestValue: s.latestValue, lastSeenKey: s.lastSeenKey,
          split: sp || {}, assignedPct: assignedPctOfAsset,
          remainderPct: 100 - assignedPctOfAsset,
          remainderValue: s.latestValue * (100 - assignedPctOfAsset) / 100,
          invalid: !sp && !!allocation.map[k]     // ตั้งค่าไว้แต่รวมเกิน 100%
        };
      })
      .filter(function (a) { return a.remainderPct > 1e-9 || a.invalid; })
      .sort(function (a, b) { return b.remainderValue - a.remainderValue; });

    // รายการทั้งหมดพร้อมสัดส่วน — ให้หน้าเว็บใช้ทำตารางแบ่ง %
    var assetsAll = seenKeys.map(function (k) {
      var s = seen[k], sp = allocation.map[k] || {};
      return {
        key: k, name: s.name, type: s.type, typeLabel: TYPE_LABELS[s.type] || s.type,
        latestValue: s.latestValue, lastSeenKey: s.lastSeenKey, presentQuarters: s.presentQuarters,
        split: { short: sp.short || 0, mid: sp.mid || 0, long: sp.long || 0 },
        sumPct: splitSum(sp), valid: splitSum(sp) <= 100 + 1e-9
      };
    }).sort(function (a, b) { return b.latestValue - a.latestValue; });

    // ---- ต่อพอร์ต
    var portsOut = {}, seriesByPort = {};
    PORTS.forEach(function (p) {
      var meta = PORT_META[p];
      var memberKeys = seenKeys.filter(function (k) { return weightOf(k, p) > 0; });

      // มูลค่า / เงินเติม-ถอน / สถานะข้อมูล ของแต่ละไตรมาส
      var V = [], F = [], status = [], notes = [];
      keys.forEach(function (k, i) {
        var rows = S.perQuarter[k];
        var prevRows = i > 0 ? S.perQuarter[keys[i - 1]] : null;
        var v = 0, f = 0, withFlow = 0, rowCount = 0;
        var imputed = [], disappeared = [], newZero = [];
        memberKeys.forEach(function (kk) {
          // สินทรัพย์หนึ่งตัวอยู่ได้หลายพอร์ตตามสัดส่วน — ทั้งมูลค่าและเงินเติม/ถอน
          // ต้องถูกหารตามสัดส่วนเดียวกัน ไม่งั้นผลตอบแทนของพอร์ตจะผิดทันที
          var w = weightOf(kk, p);
          var r = rows[kk];
          if (r) {
            rowCount++;
            v += r.value * w;
            if (r.hasFlow) { withFlow++; f += r.flow * w; }
            if (i > 0) {
              var existedBefore = !!(prevRows && prevRows[kk]);
              if (!r.hasFlow && !existedBefore && r.value > 0 && S.impute) {
                // รายการเก่าที่เพิ่งโผล่ในไตรมาสนี้และไม่มีข้อมูลเงินเติม —
                // ถือว่าเงินที่เห็นคือเงินที่ใส่เข้ามา ไม่ใช่กำไร
                f += r.value * w;
                imputed.push({ key: kk, name: r.name, value: r.value * w, weightPct: w * 100 });
              } else if (r.hasFlow && r.flow === 0 && !existedBefore && r.value > 0) {
                newZero.push({ key: kk, name: r.name, value: r.value * w });
              }
            }
          } else if (i > 0 && prevRows && prevRows[kk]) {
            disappeared.push({ key: kk, name: prevRows[kk].name, value: prevRows[kk].value * w });
          }
        });
        V.push(v); F.push(f);
        status.push(rowCount === 0 ? "none" : (withFlow === rowCount ? "recorded" : (withFlow === 0 ? "missing" : "partial")));
        notes.push({ imputed: imputed, disappeared: disappeared, newZero: newZero });
      });

      seriesByPort[p] = { V: V, F: F, status: status };

      // ไตรมาสฐาน = ไตรมาสแรกที่พอร์ตนี้มีมูลค่า
      var baseIdx = -1;
      for (var bi = 0; bi < V.length; bi++) { if (V[bi] > 0) { baseIdx = bi; break; } }

      var latestValue = V.length ? V[V.length - 1] : 0;
      var expectedReturnPct = allocation.ports[p].expectedReturnPct;
      var E = expectedReturnPct === null ? null : expectedReturnPct / 100;

      if (baseIdx < 0) {
        portsOut[p] = emptyPort(meta, expectedReturnPct, E, latestValue, latestTotal, memberKeys, seen, function (k) { return weightOf(k, p); });
        return;
      }

      var rets = [], qrows = [];
      var n = keys.length - 1 - baseIdx;
      for (var i2 = baseIdx + 1; i2 < keys.length; i2++) {
        rets.push(dietz(V[i2 - 1], V[i2], F[i2], dietzWeight));
      }
      var idx = chainIndex(rets);                    // ยาว n+1 เริ่มที่ฐาน
      var expIdx = [];
      for (var e2 = 0; e2 <= n; e2++) expIdx.push(expectedIndex(E, e2));

      var recorded = 0;
      for (var i3 = baseIdx + 1, j = 0; i3 < keys.length; i3++, j++) {
        if (status[i3] === "recorded") recorded++;
        var rr = rets[j];
        var reason2 = null;
        if (rr === null) reason2 = !(V[i3 - 1] > 0) ? "empty-start" : "inconsistent";
        var flags = [];
        if (status[i3] === "missing") flags.push("ไม่มีข้อมูลเงินเติม/ถอนในไตรมาสนี้ — คิดเป็น 0");
        else if (status[i3] === "partial") flags.push("มีข้อมูลเงินเติม/ถอนบางรายการ");
        if (notes[i3].imputed.length) flags.push("ประมาณเงินเริ่มต้นให้ " + notes[i3].imputed.length + " รายการที่เพิ่งเข้าพอร์ตและไม่มีข้อมูลเดิม");
        if (notes[i3].disappeared.length) flags.push("มี " + notes[i3].disappeared.length + " รายการหายจากพอร์ตโดยไม่ได้บันทึกการถอน");
        if (notes[i3].newZero.length) flags.push("รายการใหม่บันทึกเงินเติม = 0 — ถ้าซื้อด้วยเงินใหม่ควรบันทึกจำนวนเงิน");
        if (reason2 === "inconsistent") flags.push("ถอนมากกว่ามูลค่าที่มี — คำนวณผลตอบแทนไม่ได้");
        if (rr !== null && Math.abs(F[i3]) > V[i3 - 1] + V[i3]) flags.push("เงินเข้า/ออกก้อนใหญ่มากเทียบกับขนาดพอร์ต — ตัวเลขไวต่อสมมติฐานกลางงวด");
        qrows.push({
          key: keys[i3], vStart: V[i3 - 1], vEnd: V[i3], flow: F[i3],
          flowStatus: status[i3], r: rr, rReason: reason2,
          index: idx[j + 1], expectedIndex: expIdx[j + 1],
          imputed: notes[i3].imputed, disappeared: notes[i3].disappeared, newZero: notes[i3].newZero,
          flags: flags
        });
      }

      var cumReturn = n > 0 ? idx[n] / 100 - 1 : null;
      var annReturn = annualize(cumReturn, n);
      var annNote = annReturn === null && cumReturn !== null ? "ยังไม่ครบปี (" + n + "/4 ไตรมาส)" : null;
      var expLast = expIdx[n];
      var gapRatio = (expLast !== null && expLast > 0 && n > 0) ? idx[n] / expLast - 1 : null;
      var statusKey = E === null ? "no-target"
        : n === 0 ? "no-data"
        : gapRatio === null ? "no-data"
        : gapRatio >= GAP_BAND ? "ahead" : (gapRatio <= -GAP_BAND ? "behind" : "on");

      var reqAnn = requiredAnnualized(idx[n], E, n, horizonQuarters);
      var required = (E === null || reqAnn === null) ? null : {
        horizonQuarters: horizonQuarters,
        targetIndex: 100 * Math.pow(1 + E, (n + horizonQuarters) / 4),
        targetKey: shiftQuarter(latestKey, horizonQuarters),
        requiredAnn: reqAnn
      };
      var tb = E === null ? null : trailingBehind(idx, expIdx, trailQuarters);
      var trailing = tb === null ? null : {
        count: tb.count, warn: tb.warn,
        thai: tb.warn ? "ต่ำกว่าเส้นคาดหวังติดต่อกัน " + tb.count + " ไตรมาส" : null
      };
      var dd = maxDrawdown(idx);
      var drawdown = dd === null ? null : {
        maxDrawdown: dd.maxDrawdown,
        peakKey: keys[baseIdx + dd.peakIdx] || null,
        troughKey: keys[baseIdx + dd.troughIdx] || null,
        currentDrawdown: dd.currentDrawdown
      };
      var runway = null;
      if (p === "short") {
        var me = allocation.monthlyExpense;
        runway = { months: (me !== null && me > 0 && latestValue > 0) ? latestValue / me : null, monthlyExpense: me };
      }

      var warnings = [];
      if (trailing && trailing.warn) warnings.push({ kind: "trailing", thai: trailing.thai });
      if (recorded < n) warnings.push({ kind: "coverage", thai: "มีข้อมูลเงินเติม/ถอนครบเพียง " + recorded + " จาก " + n + " ไตรมาส — ผลตอบแทนอาจคลาดเคลื่อน" });
      var impCount = 0, disCount = 0;
      qrows.forEach(function (q) { impCount += q.imputed.length; disCount += q.disappeared.length; });
      if (impCount) warnings.push({ kind: "imputed", thai: "รายการเก่า " + impCount + " รายการถูกประมาณเงินเริ่มต้น เพราะข้อมูลเดิมไม่มี netFlow" });
      if (disCount) warnings.push({ kind: "disappeared", thai: "มี " + disCount + " รายการหายจากพอร์ตโดยไม่ได้บันทึกการถอน — จะอ่านเป็นผลตอบแทนติดลบ" });

      portsOut[p] = {
        key: p, label: meta.label, sub: meta.sub, color: meta.color,
        expectedReturnPct: expectedReturnPct, E: E,
        hasData: true, latestValue: latestValue,
        share: latestTotal > 0 ? latestValue / latestTotal : null,
        baseKey: keys[baseIdx], n: n,
        quarters: qrows,
        indexSeries: idx, expectedSeries: expIdx, seriesKeys: keys.slice(baseIdx),
        cumReturn: cumReturn, annReturn: annReturn, annNote: annNote,
        gapRatio: gapRatio, status: statusKey,
        required: required, trailing: trailing, drawdown: drawdown, runway: runway,
        flowCoverage: { recorded: recorded, total: n, thai: recorded + "/" + n + " ไตรมาสมีข้อมูลเงินเติม/ถอน" },
        assets: memberKeys.map(function (k) {
          var s = seen[k], w = weightOf(k, p);
          return {
            key: k, name: s.name, type: s.type, typeLabel: TYPE_LABELS[s.type] || s.type,
            latestValue: s.latestValue,             // มูลค่าเต็มของสินทรัพย์
            weightPct: w * 100,                     // สัดส่วนที่อยู่ในพอร์ตนี้
            allocatedValue: s.latestValue * w,      // มูลค่าเฉพาะส่วนที่อยู่ในพอร์ตนี้
            lastSeenKey: s.lastSeenKey, presentQuarters: s.presentQuarters
          };
        }).sort(function (a, b) { return b.allocatedValue - a.allocatedValue; }),
        warnings: warnings
      };
    });

    // ---- บันทึกผลตอบแทนรายไตรมาส: ทั้ง 3 พอร์ต + ทั้งพอร์ตรวม เรียงในตารางเดียว
    //
    // "ทั้งพอร์ตรวม" คิดจากผลรวมของทุกพอร์ต (มูลค่ารวม / เงินเติม-ถอนรวม) แล้วเข้าสูตร
    // Modified Dietz เหมือนกัน — ไม่ใช่การเฉลี่ยผลตอบแทนของ 3 พอร์ต เพราะการเฉลี่ย
    // จะให้น้ำหนักพอร์ตเล็กมากเกินจริง
    var totV = [], totF = [];
    keys.forEach(function (k, i) {
      var v = 0, f = 0;
      PORTS.forEach(function (p) { v += seriesByPort[p].V[i] || 0; f += seriesByPort[p].F[i] || 0; });
      totV.push(v); totF.push(f);
    });
    var totBase = -1;
    for (var tb = 0; tb < totV.length; tb++) { if (totV[tb] > 0) { totBase = tb; break; } }
    var totRets = [], totN = totBase < 0 ? 0 : keys.length - 1 - totBase;
    for (var ti = totBase + 1; totBase >= 0 && ti < keys.length; ti++) {
      totRets.push(dietz(totV[ti - 1], totV[ti], totF[ti], dietzWeight));
    }
    var totIdx = chainIndex(totRets);
    var totCum = totN > 0 ? totIdx[totN] / 100 - 1 : null;

    var recordRows = [];
    for (var ri = 1; ri < keys.length; ri++) {
      var row = { key: keys[ri], ports: {}, overall: null, overallFlow: null, overallValue: totV[ri] };
      PORTS.forEach(function (p) {
        var P = portsOut[p];
        var q = null;
        for (var qi = 0; qi < P.quarters.length; qi++) { if (P.quarters[qi].key === keys[ri]) { q = P.quarters[qi]; break; } }
        row.ports[p] = q
          ? { r: q.r, flow: q.flow, vEnd: q.vEnd, flowStatus: q.flowStatus, rReason: q.rReason }
          : { r: null, flow: null, vEnd: seriesByPort[p].V[ri] || 0, flowStatus: "none", rReason: "no-data" };
      });
      if (totBase >= 0 && ri > totBase) { row.overall = totRets[ri - totBase - 1]; row.overallFlow = totF[ri]; }
      recordRows.push(row);
    }

    var record = {
      rows: recordRows,
      overall: {
        label: "ทั้งพอร์ตรวม", baseKey: totBase >= 0 ? keys[totBase] : null, n: totN,
        latestValue: totV.length ? totV[totV.length - 1] : 0,
        cumReturn: totCum, annReturn: annualize(totCum, totN),
        annNote: annualize(totCum, totN) === null && totCum !== null ? "ยังไม่ครบปี (" + totN + "/4 ไตรมาส)" : null
      }
    };

    // ---- เกษียณ: เงินพอหรือยัง
    var rtCfg = allocation.retirement || {};
    var observedFlow = 0, flowQ = 0;
    keys.slice(-4).forEach(function (k, idx, arr) {
      if (idx === 0 && arr.length > 1 && keys.length > 4) return;   // เทียบ 4 ไตรมาสล่าสุด
      var rows = S.perQuarter[k];
      Object.keys(rows).forEach(function (kk) { if (rows[kk].hasFlow) { observedFlow += rows[kk].flow; } });
      flowQ++;
    });
    var observedAnnualFlow = flowQ > 0 ? observedFlow * (4 / flowQ) : null;

    var expBlend = blendRate(portsOut, function (P) { return P.expectedReturnPct === null ? null : P.expectedReturnPct / 100; });
    var actBlend = blendRate(portsOut, function (P) { return P.annReturn; });

    var missing = [];
    if (allocation.monthlyExpense === null || !(allocation.monthlyExpense > 0)) missing.push("ค่าใช้จ่ายต่อเดือน");
    if (rtCfg.inflationPct === null) missing.push("อัตราเงินเฟ้อ");
    if (rtCfg.workYears === null || !(rtCfg.workYears >= 0)) missing.push("จำนวนปีที่จะทำงานต่อ");
    if (rtCfg.retireYears === null || !(rtCfg.retireYears > 0)) missing.push("จำนวนปีหลังเกษียณ");
    if (expBlend.rate === null) missing.push("ผลตอบแทนคาดหวังของพอร์ต");

    var contribution = rtCfg.annualContribution !== null ? rtCfg.annualContribution
      : (observedAnnualFlow !== null ? observedAnnualFlow : 0);
    var contributionSource = rtCfg.annualContribution !== null ? "user"
      : (observedAnnualFlow !== null ? "observed" : "none");

    var postCfg = rtCfg.postReturnPct;
    // ฐานของการฉายภาพต้องเป็น "เงินที่จัดเข้าพอร์ตแล้ว" ไม่ใช่มูลค่าพอร์ตทั้งก้อน
    // เพราะอัตราผลตอบแทนที่ใช้ถ่วงมาจากพอร์ตที่จัดแล้วเท่านั้น — ถ้าเอาเงินทั้งก้อน
    // ไปโตด้วยอัตรานั้น ส่วนที่ยังไม่จัดจะถูกยัดอัตราที่ไม่มีใครตั้งให้มันเลย
    var planWealth = assignedTotal;
    function scenario(rate, source) {
      if (rate === null) return null;
      var postRate = postCfg === null ? rate : postCfg / 100;   // ไม่ตั้ง = ใช้อัตราเดียวกัน
      var p = projectWealth({
        startWealth: planWealth, rate: rate, postRate: postRate, inflationPct: rtCfg.inflationPct / 100,
        workYears: rtCfg.workYears, retireYears: rtCfg.retireYears,
        annualContribution: contribution, monthlyExpense: allocation.monthlyExpense
      });
      if (!p) return null;
      var req = requiredCapital(p.firstRetirementExpense, rtCfg.retireYears, postRate, rtCfg.inflationPct / 100);
      var needRate = solveRequiredRate({
        startWealth: planWealth, postRate: postCfg === null ? null : postCfg / 100, inflationPct: rtCfg.inflationPct / 100,
        workYears: rtCfg.workYears, retireYears: rtCfg.retireYears,
        annualContribution: contribution, monthlyExpense: allocation.monthlyExpense
      });
      var need = solveContribution({
        startWealth: planWealth, rate: rate, postRate: postRate, inflationPct: rtCfg.inflationPct / 100,
        workYears: rtCfg.workYears, retireYears: rtCfg.retireYears,
        monthlyExpense: allocation.monthlyExpense
      });
      // ช่วงที่ 2: มีเงินเท่านี้ตอนเกษียณแล้ว ถอนใช้ได้เดือนละเท่าไหร่
      var infl = rtCfg.inflationPct / 100;
      var toToday = Math.pow(1 + infl, rtCfg.workYears);   // แปลงเงินตอนนั้นกลับเป็นค่าเงินวันนี้
      var susA = sustainableAnnual(p.wealthAtRetirement, rtCfg.retireYears, postRate, infl);
      var perpA = perpetualAnnual(p.wealthAtRetirement, postRate, infl);
      var afterRetirement = {
        wealthAtRetirement: p.wealthAtRetirement,
        spendAll: susA === null ? null : {
          annualNominal: susA, monthlyNominal: susA / 12, monthlyToday: susA / 12 / toToday
        },
        keepCapital: perpA === null ? null : {
          annualNominal: perpA, monthlyNominal: perpA / 12, monthlyToday: perpA / 12 / toToday
        },
        planned: {
          monthlyToday: allocation.monthlyExpense,
          runsOutInYear: p.runsOutInYear,
          runsOutAtAge: (p.runsOutInYear !== null && rtCfg.currentAge !== null) ? rtCfg.currentAge + p.runsOutInYear : null,
          lastsYears: p.runsOutInYear === null ? rtCfg.retireYears : p.runsOutInYear - rtCfg.workYears
        }
      };
      var yearlyExpenseAtEnd = p.firstRetirementExpense * Math.pow(1 + rtCfg.inflationPct / 100, rtCfg.retireYears - 1);
      var verdict = p.runsOutInYear !== null ? "short"
        : (p.endWealth >= yearlyExpenseAtEnd ? "comfortable" : "tight");
      return {
        rateSource: source, ratePct: rate * 100, postRatePct: postRate * 100,
        series: p.series, wealthAtRetirement: p.wealthAtRetirement,
        requiredAtRetirement: req,
        gapAtRetirement: req === null ? null : p.wealthAtRetirement - req,
        endWealth: p.endWealth < 0 ? 0 : p.endWealth,
        runsOutInYear: p.runsOutInYear, yearsShort: p.yearsShort,
        firstRetirementExpense: p.firstRetirementExpense,
        requiredAnnualContribution: need,
        shortfallAtRetirement: req === null ? null : Math.max(0, req - p.wealthAtRetirement),
        requiredRatePct: needRate === null ? null : needRate * 100,
        extraRatePp: (needRate === null || rate === null) ? null : (needRate - rate) * 100,
        extraContributionNeeded: need === null ? null : Math.max(0, need - contribution),
        verdict: verdict,
        afterRetirement: afterRetirement
      };
    }

    var ready = missing.length === 0;
    var retirement = {
      ready: ready, missing: missing,
      monthlyExpense: allocation.monthlyExpense,
      inflationPct: rtCfg.inflationPct, workYears: rtCfg.workYears, retireYears: rtCfg.retireYears,
      annualContribution: contribution, contributionSource: contributionSource,
      observedAnnualFlow: observedAnnualFlow,
      startWealth: planWealth,
      portfolioTotal: latestTotal,
      unassignedExcluded: latestTotal - assignedTotal,
      unassignedPct: latestTotal > 0 ? (latestTotal - assignedTotal) / latestTotal * 100 : null,
      startYear: Number(String(latestKey).split("-Q")[0]) || null,
      currentAge: rtCfg.currentAge,
      retireAge: (rtCfg.currentAge !== null && rtCfg.workYears !== null) ? rtCfg.currentAge + rtCfg.workYears : null,
      endAge: (rtCfg.currentAge !== null && rtCfg.workYears !== null && rtCfg.retireYears !== null) ? rtCfg.currentAge + rtCfg.workYears + rtCfg.retireYears : null,
      expectedRatePct: expBlend.rate === null ? null : expBlend.rate * 100,
      postReturnPct: rtCfg.postReturnPct,
      postRateUsedPct: rtCfg.postReturnPct !== null ? rtCfg.postReturnPct : (expBlend.rate === null ? null : expBlend.rate * 100),
      actualRatePct: actBlend.rate === null ? null : actBlend.rate * 100,
      actualRatePorts: actBlend.ports,
      expected: ready ? scenario(expBlend.rate, "expected") : null,
      actual: ready && actBlend.rate !== null ? scenario(actBlend.rate, "actual") : null
    };

    return {
      available: true, reason: null,
      quarters: keys, skippedQuarters: S.skipped,
      latestKey: latestKey, currentQuarter: S.currentQuarter,
      totals: {
        latest: latestTotal, assigned: assignedTotal,
        unassigned: latestTotal - assignedTotal,
        assignedPct: latestTotal > 0 ? assignedTotal / latestTotal : null,
        unassignedCount: unassigned.length
      },
      ports: portsOut,
      record: record,
      retirement: retirement,
      unassigned: unassigned,
      assetsAll: assetsAll,
      allocation: allocation,
      meta: {
        dietzWeight: dietzWeight, horizonQuarters: horizonQuarters,
        trailQuarters: trailQuarters, imputeEntries: S.impute,
        staleKeys: staleKeys, invalidSplits: invalidSplits
      }
    };
  }

  function emptyPort(meta, expectedReturnPct, E, latestValue, latestTotal, memberKeys, seen, wOf) {
    return {
      key: meta.key, label: meta.label, sub: meta.sub, color: meta.color,
      expectedReturnPct: expectedReturnPct, E: E,
      hasData: false, latestValue: latestValue || 0,
      share: latestTotal > 0 ? (latestValue || 0) / latestTotal : null,
      baseKey: null, n: 0, quarters: [],
      indexSeries: [], expectedSeries: [], seriesKeys: [],
      cumReturn: null, annReturn: null, annNote: null,
      gapRatio: null, status: "no-data",
      required: null, trailing: null, drawdown: null,
      runway: meta.key === "short" ? { months: null, monthlyExpense: null } : null,
      flowCoverage: { recorded: 0, total: 0, thai: "ยังไม่มีไตรมาสให้คำนวณ" },
      assets: (memberKeys || []).map(function (k) {
        var s = seen[k], w = wOf ? wOf(k) : 0;
        return {
          key: k, name: s.name, type: s.type, typeLabel: TYPE_LABELS[s.type] || s.type,
          latestValue: s.latestValue, weightPct: w * 100, allocatedValue: s.latestValue * w,
          lastSeenKey: s.lastSeenKey, presentQuarters: s.presentQuarters
        };
      }),
      warnings: []
    };
  }

  // (ไม่มีอะไรเพิ่มตรงนี้ — ตัวช่วยของ UI อยู่ในไฟล์ page)
  var AssetAllocation = {
    compute: compute,
    normalizeAllocation: normalizeAllocation,
    normalizeSplit: normalizeSplit,
    splitSum: splitSum,
    buildSeries: buildSeries,
    assetKey: assetKey,
    compareQuarter: compareQuarter,
    shiftQuarter: shiftQuarter,
    dietz: dietz,
    chainIndex: chainIndex,
    annualize: annualize,
    expectedIndex: expectedIndex,
    maxDrawdown: maxDrawdown,
    requiredAnnualized: requiredAnnualized,
    requiredCapital: requiredCapital,
    projectWealth: projectWealth,
    solveContribution: solveContribution,
    solveRequiredRate: solveRequiredRate,
    sustainableAnnual: sustainableAnnual,
    perpetualAnnual: perpetualAnnual,
    blendRate: blendRate,
    trailingBehind: trailingBehind,
    PORTS: PORTS,
    PORT_META: PORT_META,
    TYPE_LABELS: TYPE_LABELS,
    DEFAULTS: DEFAULTS
  };

  if (typeof window !== "undefined") window.AssetAllocation = AssetAllocation;
  if (typeof module !== "undefined" && module.exports) module.exports = AssetAllocation;
})();
