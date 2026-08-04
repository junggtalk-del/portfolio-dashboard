(function () {
  "use strict";

  // ============================================================
  // AI Portfolio Manager — ENGINE (Portfolio Decision Layer)
  // ตอบคำถามเดียว: "ถ้ามีเงินสดวันนี้ ควรวางเงินก้อนถัดไปที่ตำแหน่งไหน"
  //
  // Reuse ทั้งหมด ไม่คำนวณซ้ำ:
  //  - ThesisEngine.compute ให้ thesis/macro/rates/valuation/dipClass ในคอลเดียว
  //  - AI Megatrend: **ผู้ใช้ตัดสินใจเอง** (bullish/bearish — ตั้งในหน้า) ไม่ใช้
  //    คะแนน Mega Trend ที่ระบบคำนวณอีกต่อไป (ผู้ใช้สั่งถอดออก Aug 2026)
  //  - เทคนิค (EMA/SMA200/RSI) จาก snapshot — เป็น "เครื่องมือจับจังหวะ" เท่านั้น
  //  - Accumulation Score สูตรเดียวกับ Accumulation Center — ไฟล์นี้เป็น
  //    "บ้านหลัก" ของสูตร แล้ว Accumulation Center delegate มาที่นี่
  //
  // Deterministic ล้วน ไม่มี LLM · ไม่มีคำ Buy/Sell — ใช้เฉพาะ
  // Increase Position / Maintain / Wait / Review Thesis
  // ============================================================

  function fin(v) { if (v == null || v === "") return null; var n = Number(v); return Number.isFinite(n) ? n : null; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function round1(v) { return Math.round(v * 10) / 10; }
  function roundHalf(v) { return Math.round(v * 2) / 2; }

  // ---------------- Master Position Size (Tier) — configurable ----------------
  var TIER_DEFS = {
    A: { key: "A", label: "Tier A — Core AI Leaders", max: 20, target: 10, min: 5 },
    B: { key: "B", label: "Tier B — AI Infrastructure", max: 10, target: 6, min: 2 },
    C: { key: "C", label: "Tier C — Satellite", max: 5, target: 3, min: 0 }
  };
  var DEFAULT_TIER_MAP = {
    NVDA: "A", GOOG: "A", GOOGL: "A", META: "A", AMZN: "A",
    ASML: "B", TSM: "B", AVGO: "B", MSFT: "B", QQQM: "B"
  };

  var VAL_SCORE = { cheap: 85, fair: 70, premium: 50, expensive: 30 };
  var VAL_TH = { cheap: "ถูก", fair: "สมเหตุสมผล", premium: "พรีเมียม", expensive: "แพง" };

  // Business Growth vs Stock Price (5 ปี) — §6 ของ Investment Thesis (ThesisEngine.computeHistory)
  // ธุรกิจโตนำราคา = โอกาสสะสมดี (พื้นฐานหนุนเกินราคา) · ราคานำธุรกิจมาก = ระวัง (ผลตอบแทนมาจาก multiple)
  var GROWTH_SCORE = { "business-ahead": 90, "aligned": 74, "slightly-ahead": 55, "significantly-ahead": 38, "deteriorating": 20 };
  var GROWTH_TH = {
    "business-ahead": "ธุรกิจโตนำราคา", "aligned": "ราคาเดินคู่ธุรกิจ", "slightly-ahead": "ราคานำเล็กน้อย",
    "significantly-ahead": "ราคานำธุรกิจมาก", "deteriorating": "พื้นฐาน 5 ปีแผ่วลง", "insufficient": "ข้อมูล 5 ปีไม่พอวัด"
  };
  // history = ผล ThesisEngine.computeHistory (window เดียว) · insufficient/no-history → null
  function growthPriceScore(history) {
    if (!history || !history.available || !history.verdict) return null;
    var s = GROWTH_SCORE[history.verdict.key];
    return s != null ? s : null;
  }
  var GROWTH_WINDOWS = [2, 3, 4]; // ช่วงปีล่าสุดที่ใช้เฉลี่ยเป็นปัจจัย (ผู้ใช้สั่ง Aug 2026)
  function growthLabelFromScore(s) {
    if (s == null) return "ไม่มีข้อมูล";
    if (s >= 82) return "ธุรกิจโตนำราคา";
    if (s >= 65) return "ราคาเดินคู่ธุรกิจ";
    if (s >= 47) return "ราคานำเล็กน้อย";
    return "ราคานำธุรกิจมาก";
  }
  // รวมผล computeHistory หลาย window (2/3/4 ปี) → เฉลี่ยคะแนน verdict ที่มีจริง
  function growthSummary(histories, windows) {
    windows = windows || GROWTH_WINDOWS;
    var scores = [], parts = [];
    (histories || []).forEach(function (h, i) {
      if (h && h.available && h.verdict) {
        var s = GROWTH_SCORE[h.verdict.key];
        if (s != null) { scores.push(s); parts.push({ years: windows[i], key: h.verdict.key, score: s, gapPp: h.metrics ? h.metrics.gapPp : null }); }
      }
    });
    var avg = scores.length ? Math.round(scores.reduce(function (a, b) { return a + b; }, 0) / scores.length) : null;
    return { score: avg, label: growthLabelFromScore(avg), windows: parts };
  }
  // รับได้ทั้ง growth summary (มี .score) หรือ history เดี่ยว (มี .verdict) — คืนคะแนน 0-100 หรือ null
  function growthScoreOf(growth) {
    if (!growth) return null;
    if (Object.prototype.hasOwnProperty.call(growth, "score")) return growth.score; // summary
    return growthPriceScore(growth); // single history (backward-compat)
  }

  var ZONES = {
    A: { key: "A", icon: "💎", label: "Zone A — Rare Opportunity", thai: "โอกาสหายาก — พื้นฐานแข็งมากและย่อลึก", tone: "bull", rank: 0 },
    B: { key: "B", icon: "🟢", label: "Zone B — Strong Accumulation", thai: "เข้าเกณฑ์สะสมแบบมีน้ำหนัก", tone: "bull", rank: 1 },
    C: { key: "C", icon: "🟡", label: "Zone C — Gradual Accumulation", thai: "ทยอยสะสมแบบค่อยเป็นค่อยไป", tone: "watch", rank: 2 },
    D: { key: "D", icon: "🟠", label: "Zone D — Wait", thai: "ยังไม่ใช่จังหวะวางเงินเพิ่ม", tone: "watch", rank: 3 },
    E: { key: "E", icon: "🔴", label: "Zone E — Review Thesis", thai: "พื้นฐานไม่ผ่านเกณฑ์ — ทบทวน thesis ก่อน", tone: "bear", rank: 4 }
  };

  var ACTIONS = {
    increase: { key: "increase", label: "Increase Position", thai: "เพิ่มน้ำหนักตำแหน่งนี้", tone: "bull" },
    maintain: { key: "maintain", label: "Maintain", thai: "ถือระดับปัจจุบัน — ครบเป้าแล้ว", tone: "neutral" },
    wait: { key: "wait", label: "Wait", thai: "รอ — เงื่อนไขยังไม่ครบ", tone: "watch" },
    review: { key: "review", label: "Review Thesis", thai: "ทบทวน thesis ก่อนวางเงินเพิ่ม", tone: "bear" }
  };

  // Risk Management (hard rules) — ตัวเลขตายตัวตามสเปก
  // Rule 1 ใช้ "มุมมอง AI Megatrend ที่ผู้ใช้ตั้งเอง" (bullish/bearish) แทนคะแนนคำนวณ
  var RULES = {
    THESIS_MIN: 70,      // Rule 2: Thesis < 70 → Review Thesis
    RISK_OFF_REGIME: 40, // Rule 3: Macro Risk-Off → ลดขนาด deployment 50%
    BASE_RESERVE: 25,    // สำรองเงินสดขั้นต่ำเสมอ
    RISK_OFF_RESERVE_ADD: 25,
    RATES_RESERVE_ADD: 15 // Rule 4: Interest Rate High Alert → เพิ่ม reserve
  };
  function normStance(s) { return s === "bearish" ? "bearish" : "bullish"; }

  // ---------------- technicals (จาก snapshot — timing เท่านั้น) ----------------
  function techOf(snapshot, ticker) {
    var keys = ticker === "GOOG" ? ["GOOG", "GOOGL"] : [ticker];
    for (var i = 0; i < keys.length; i++) {
      var t = snapshot && snapshot.technicalSignals && snapshot.technicalSignals[keys[i]];
      var r = snapshot && snapshot.rsiSignals && snapshot.rsiSignals[keys[i]];
      if (t || r) return { tech: t || {}, rsi: fin(r && r.rsi14) != null ? fin(r && r.rsi14) : fin(t && t.rsi14) };
    }
    return { tech: {}, rsi: null };
  }
  function smaDistPct(tr) {
    var price = fin(tr.tech.latestClose), sma = fin(tr.tech.sma200);
    if (price == null || sma == null || sma <= 0) return null;
    return (price / sma - 1) * 100;
  }
  function emaBullish(tr) {
    var e12 = fin(tr.tech.ema12), e26 = fin(tr.tech.ema26);
    if (e12 != null && e26 != null) return e12 > e26;
    if (tr.tech.emaTrendStatus === "EMA_BULLISH") return true;
    if (tr.tech.emaTrendStatus === "EMA_BEARISH") return false;
    return null;
  }

  // ---------------- dip-timing subscore (น้ำหนักแค่ 10% — ห้าม dominate) ----------------
  function dipTiming(o, tr) {
    var dd = o.falling && fin(o.falling.drawdownPct) != null ? Math.abs(Math.min(o.falling.drawdownPct, 0)) : null;
    var s = 40, notes = [];
    if (dd != null) {
      if (dd >= 5) { s += 20; notes.push("ย่อแล้ว " + dd.toFixed(1) + "% จาก high 90 วัน"); }
      else notes.push("ย่อเพียง " + dd.toFixed(1) + "% — ยังไม่ถึงเกณฑ์ ≥5%");
      if (dd >= 10) s += 10;
    }
    if (tr.rsi != null) {
      if (tr.rsi < 30) { s += 15; notes.push("RSI oversold (" + tr.rsi.toFixed(0) + ")"); }
      else if (tr.rsi < 40) { s += 8; notes.push("RSI เริ่มต่ำ (" + tr.rsi.toFixed(0) + ")"); }
    }
    var dist = smaDistPct(tr);
    if (dist != null) {
      if (Math.abs(dist) <= 3) { s += 10; notes.push("ราคาใกล้ SMA200 (" + dist.toFixed(1) + "%)"); }
      else if (dist > 0) s += 5;
    }
    return { score: clamp(Math.round(s), 0, 100), dd: dd, dist: dist, notes: notes };
  }

  // ---------------- Accumulation Score (สูตรกลาง — Accumulation Center ใช้ตัวนี้) ----------------
  // Thesis 35 · Macro 10 · Rates 10 · Timing 10 · Valuation 10 (renormalize
  // เมื่อบางส่วนไม่มีข้อมูล) — Mega Trend ถูกถอดออกตามคำสั่งผู้ใช้ (Aug 2026):
  // มุมมอง AI Megatrend ผู้ใช้ตัดสินใจเองเป็น "เกต" ไม่ใช่ส่วนหนึ่งของคะแนน
  // Accumulation Score (ผู้ใช้สั่ง Aug 2026): ตัด Macro ออก · Thesis 50 · Business
  // Growth vs ราคา (เฉลี่ย 2/3/4 ปีล่าสุด) 30 · Timing 10 · Valuation 10 · ไม่มีดอกเบี้ย
  // growth = growth summary จาก growthSummary() (หรือ history เดี่ยว backward-compat)
  function accumulationScore(o, tr, growth) {
    var timing = dipTiming(o, tr);
    var valLevel = o.valuationView ? o.valuationView.level : null;
    var parts = [
      { key: "thesis", label: "Investment Thesis", value: fin(o.thesis.score), weight: 50 },
      { key: "growthPrice", label: "Business Growth vs ราคา (2-4 ปี)", value: growthScoreOf(growth), weight: 30 },
      { key: "timing", label: "Technical Timing", value: timing.score, weight: 10 },
      { key: "valuation", label: "Valuation", value: valLevel ? VAL_SCORE[valLevel] : null, weight: 10 }
    ];
    var w = 0, acc = 0;
    parts.forEach(function (p) { if (p.value != null) { w += p.weight; acc += p.value * p.weight; } });
    return { score: w ? Math.round(acc / w) : null, parts: parts, timing: timing, valLevel: valLevel };
  }

  // ---------------- why-checklist (explainability กลาง) ----------------
  function whyChecklist(o, timing, valLevel, growth) {
    var why = [];
    var push = function (ok, txt) { why.push({ ok: ok, txt: txt }); };
    if (o.revenueQuality && o.revenueQuality.acceleration === "accelerating") push(true, "รายได้กำลังเร่งตัว");
    else if (o.revenueQuality && o.revenueQuality.acceleration === "decelerating") push(false, "รายได้กำลังชะลอ");
    if (fin(o.aiExecution && o.aiExecution.score) != null) push(o.aiExecution.score >= 75, "AI execution " + o.aiExecution.score + "/100" + (o.aiExecution.score >= 75 ? " — แข็งแรง" : " — กลาง ๆ"));
    var gscore = growthScoreOf(growth);
    if (gscore != null) {
      var wtxt = growth && growth.windows && growth.windows.length ? " (" + growth.windows.map(function (p) { return p.years + "ปี"; }).join("/") + ")" : "";
      push(gscore >= 65, "Business Growth vs ราคา" + wtxt + ": " + growthLabelFromScore(gscore) + " ~" + gscore);
    }
    timing.notes.slice(0, 2).forEach(function (n) { push(!/ยังไม่ถึงเกณฑ์/.test(n), n); });
    if (valLevel) push(valLevel === "cheap" || valLevel === "fair", "Valuation " + (VAL_TH[valLevel] || valLevel));
    if (o.thesis.trend && o.thesis.trend.key === "deteriorating") push(false, "ผลประกอบการล่าสุดแผ่วลง");
    return why;
  }

  // ---------------- Quarterly bucket gross (ฐาน % — ที่เดียว ใช้ร่วมทุกหน้า) ----------------
  function quarterlyBuckets(snapshot) {
    var totals = {};
    try {
      var ps = snapshot && snapshot.portfolioStatus;
      var data = ps && (ps.data || (ps.quarters ? ps : null));
      if (!data || !data.quarters) return totals;
      var keys = Object.keys(data.quarters).sort();
      var key = (data.currentQuarter && data.quarters[data.currentQuarter]) ? data.currentQuarter : keys[keys.length - 1];
      var assets = (data.quarters[key] && data.quarters[key].assets) || [];
      assets.forEach(function (a) {
        var m = Number(a && a.manualValue), s = Number(a && a.snapshotValue);
        var gross = Number.isFinite(m) ? m : (Number.isFinite(s) ? s : 0);
        if (gross > 0) totals[a.type || "custom"] = (totals[a.type || "custom"] || 0) + gross;
      });
    } catch (e) { /* graceful */ }
    return totals;
  }

  // ---------------- Accumulation Zone (A-E — Zone นำ Score เป็นรอง) ----------------
  function zoneOf(o, acc, tr, exposurePct, tierDef, stance) {
    var th = fin(o.thesis.score) != null ? o.thesis.score : 0;
    var dk = o.dipClass ? o.dipClass.key : null;
    var why = [];
    // Rule 2: Thesis < 70 หรือย่อจากพื้นฐานตัวเอง → Review ก่อนเสมอ
    if (th < RULES.THESIS_MIN || dk === "broken" || dk === "fundamental") {
      why.push(th < RULES.THESIS_MIN ? "Investment Thesis " + th + " < " + RULES.THESIS_MIN : "การย่อมาจากพื้นฐานตัวเอง (" + dk + ")");
      return { zone: ZONES.E, why: why };
    }
    // Rule 1: มุมมอง AI Megatrend (ผู้ใช้ตั้งเอง) = Bearish → งดสะสมใหม่
    if (normStance(stance) === "bearish") {
      why.push("คุณตั้งมุมมอง AI Megatrend = Bearish — งดสะสมใหม่ (Rule 1)");
      return { zone: ZONES.D, why: why };
    }
    // เต็มเพดาน tier → ไม่วางเงินเพิ่ม
    if (exposurePct != null && tierDef && exposurePct >= tierDef.max) {
      why.push("ถือ " + round1(exposurePct) + "% ≥ เพดาน Tier " + tierDef.key + " (" + tierDef.max + "%)");
      return { zone: ZONES.D, why: why };
    }
    var score = acc.score == null ? 0 : acc.score;
    var timing = acc.timing;
    var deepDip = (timing.dd != null && timing.dd >= 10) || (tr.rsi != null && tr.rsi < 35) || (timing.dist != null && timing.dist < 0);
    if (score >= 80 && th >= 85 && deepDip) {
      why.push("Accumulation Score " + score + " ≥ 80 · Thesis " + th + " ≥ 85 · ย่อลึก/ต่ำกว่า SMA200");
      return { zone: ZONES.A, why: why };
    }
    if (score >= 72) { why.push("Accumulation Score " + score + " ≥ 72"); return { zone: ZONES.B, why: why }; }
    if (score >= 62) { why.push("Accumulation Score " + score + " (62-71)"); return { zone: ZONES.C, why: why }; }
    why.push("Accumulation Score " + score + " < 62 — องค์ประกอบยังไม่หนุนพอ");
    return { zone: ZONES.D, why: why };
  }

  // ---------------- Entry Ladder (4 entries = 50/20/15/15 ของ target position) ----------------
  function entryLadder(zoneKey, o, tr, ctx) {
    ctx = ctx || {};
    var th = fin(o.thesis.score) || 0;
    var bull = normStance(ctx.stance) === "bullish";
    var regime = o.inputs && o.inputs.regime;
    var riskOff = regime && fin(regime.score) != null ? regime.score < RULES.RISK_OFF_REGIME : false;
    var dist = smaDistPct(tr);
    var rsi = tr.rsi;
    var emaBull = emaBullish(tr);
    var inAccZone = zoneKey === "A" || zoneKey === "B" || zoneKey === "C";

    var e1 = (zoneKey === "A" || zoneKey === "B") && th >= 85 && bull && !riskOff;
    var e2 = dist != null && dist <= 0.5 && dist >= -3;
    var e3 = (rsi != null && rsi < 35) || (dist != null && dist <= -5);
    var e4 = zoneKey === "A" && emaBull === true && rsi != null && rsi < 50;

    return [
      { n: 1, pct: 50, title: "Entry 1 — ฐานหลัก", triggered: !!e1,
        rule: "Zone A/B + Thesis ≥85 + มุมมอง AI Megatrend ของคุณ = Bullish + Macro ไม่ Risk-Off",
        why: e1 ? "ครบทุกเงื่อนไข — วางฐาน 50% ของเป้าได้" :
          (zoneKey !== "A" && zoneKey !== "B" ? "ยังไม่อยู่ Zone A/B" : th < 85 ? "Thesis " + th + " < 85" : !bull ? "คุณตั้งมุมมอง AI Megatrend = Bearish" : "Macro อยู่โหมด Risk-Off") },
      { n: 2, pct: 20, title: "Entry 2 — แตะ SMA200", triggered: !!e2,
        rule: "ราคาแตะ SMA200 หรือต่ำกว่าไม่เกิน 3%",
        why: dist == null ? "ไม่มีข้อมูล SMA200" : e2 ? "ราคาห่าง SMA200 " + dist.toFixed(1) + "% — อยู่ในย่านสะสม" : "ราคาห่าง SMA200 " + dist.toFixed(1) + "% — ยังไม่แตะย่าน" },
      { n: 3, pct: 15, title: "Entry 3 — Oversold ลึก", triggered: !!e3,
        rule: "RSI < 35 หรือราคาต่ำกว่า SMA200 เกิน 5%",
        why: e3 ? (rsi != null && rsi < 35 ? "RSI " + rsi.toFixed(0) + " < 35" : "ราคาต่ำกว่า SMA200 " + Math.abs(dist).toFixed(1) + "%") : "RSI " + (rsi == null ? "ไม่มีข้อมูล" : rsi.toFixed(0)) + " · ยังไม่ oversold ลึก" },
      { n: 4, pct: 15, title: "Entry 4 — ยืนยันกลับตัว", triggered: !!e4,
        rule: "Zone A + EMA12 ตัดขึ้นเหนือ EMA26 หลัง oversold (bullish divergence ยังไม่มีข้อมูลในระบบ — ใช้ EMA cross แทน)",
        why: e4 ? "Zone A + โมเมนตัมเริ่มกลับตัว (EMA bull · RSI " + rsi.toFixed(0) + ")" : zoneKey !== "A" ? "ยังไม่อยู่ Zone A" : emaBull !== true ? "EMA12 ยังไม่ตัดขึ้นเหนือ EMA26" : "RSI ยังไม่อยู่ช่วงฟื้นจาก oversold" }
    ].map(function (e) {
      if (!inAccZone) { e.triggered = false; e.blocked = true; e.why = zoneKey === "E" ? "Zone E — ทบทวน thesis ก่อน" : "Zone D — งดสะสมใหม่"; }
      return e;
    });
  }

  // ---------------- Dynamic Target Allocation (เป้าไม่คงที่ — อธิบายได้ทุกตัวคูณ) ----------------
  function targetFor(tierDef, o, stance, growth) {
    var th = fin(o.thesis.score) != null ? o.thesis.score : 0;
    if (th < RULES.THESIS_MIN) {
      return { target: tierDef.min, raw: tierDef.min, base: tierDef.target, mods: [],
        why: ["Thesis " + th + " < " + RULES.THESIS_MIN + " → Review Thesis — ลดเป้าลงระดับ Minimum ของ Tier (" + tierDef.min + "%)"] };
    }
    var regime = o.inputs && o.inputs.regime;
    var valLevel = o.valuationView ? o.valuationView.level : null;
    var mods = [];
    if (th >= 85) mods.push({ label: "Thesis " + th + " (แข็งมาก)", mult: 1.4 });
    else if (th >= 78) mods.push({ label: "Thesis " + th + " (แข็ง)", mult: 1.2 });
    else mods.push({ label: "Thesis " + th + " (ผ่านเกณฑ์)", mult: 1.0 });
    mods.push(normStance(stance) === "bullish"
      ? { label: "AI Megatrend = Bullish (มุมมองของคุณ)", mult: 1.1 }
      : { label: "AI Megatrend = Bearish (มุมมองของคุณ)", mult: 0.8 });
    if (regime && fin(regime.score) != null) {
      var rs = regime.score;
      mods.push(rs >= 60 ? { label: "Macro Regime " + rs + " (หนุน)", mult: 1.05 }
        : rs >= RULES.RISK_OFF_REGIME ? { label: "Macro Regime " + rs + " (กลาง)", mult: 1.0 }
          : { label: "Macro Regime " + rs + " (Risk-Off)", mult: 0.85 });
    }
    // Business Growth vs Stock Price (เฉลี่ย 2-4 ปีล่าสุด) — แทนที่ตัวคูณดอกเบี้ยเดิม
    var gs = growthScoreOf(growth);
    if (gs != null) {
      if (gs >= 82) mods.push({ label: "ธุรกิจโตนำราคา (2-4 ปี)", mult: 1.1 });
      else if (gs < 47) mods.push({ label: "ราคานำธุรกิจมาก (2-4 ปี)", mult: 0.88 });
      else if (gs < 60) mods.push({ label: "ราคานำเล็กน้อย (2-4 ปี)", mult: 0.95 });
    }
    if (valLevel === "cheap") mods.push({ label: "Valuation ถูก", mult: 1.1 });
    else if (valLevel === "expensive") mods.push({ label: "Valuation แพง", mult: 0.85 });
    var mult = 1;
    mods.forEach(function (m) { mult *= m.mult; });
    var raw = tierDef.target * mult;
    var target = clamp(roundHalf(raw), tierDef.min, tierDef.max);
    var why = mods.map(function (m) { return m.label + " ×" + m.mult.toFixed(2); });
    why.push("Conviction = " + tierDef.target + "% × " + mult.toFixed(2) + " = " + round1(raw) + "% (คุมกรอบ Tier [" + tierDef.min + "-" + tierDef.max + "%] = " + target + "%)");
    // raw = ค่า conviction ก่อนคุมกรอบ — ใช้เป็นน้ำหนักตอนแบ่งก้อน 50% หุ้นรายตัว
    return { target: target, raw: raw, base: tierDef.target, mods: mods, why: why };
  }

  // water-filling: แบ่ง pool ตามน้ำหนัก โดยแต่ละตัวไม่เกิน cap (%); ส่วนเกินไหลไปตัวอื่น
  // ตัวไหนชน cap → คงที่ = cap · เหลือที่แบ่งไม่ได้ (ทุกตัวชน cap) คืนเป็น leftover
  function capWaterfill(weights, pool, cap) {
    var n = weights.length;
    var alloc = [], capped = [];
    for (var i = 0; i < n; i++) { alloc.push(0); capped.push(false); }
    var remaining = pool;
    for (var iter = 0; iter <= n; iter++) {
      var wsum = 0;
      for (var j = 0; j < n; j++) if (!capped[j]) wsum += weights[j];
      if (wsum <= 0 || remaining <= 1e-9) break;
      var scale = remaining / wsum;
      var newly = [];
      for (var k = 0; k < n; k++) if (!capped[k] && weights[k] * scale >= cap - 1e-9) newly.push(k);
      if (newly.length === 0) {
        for (var m = 0; m < n; m++) if (!capped[m]) alloc[m] = weights[m] * scale;
        remaining = 0; break;
      }
      for (var q = 0; q < newly.length; q++) { alloc[newly[q]] = cap; capped[newly[q]] = true; remaining -= cap; }
    }
    return alloc; // real % ต่อ satellite, แต่ละตัว ≤ cap, Σ ≤ pool
  }

  // ---------------- Allocation Policy (core-satellite: index + หุ้นรายตัว) ----------------
  // ผู้ใช้กำหนด: index ETF (เช่น QQQM) = indexPct% ของ sleeve หุ้นต่างประเทศ ·
  // หุ้นธงแดงที่เหลือแบ่งส่วนที่เหลือ (100-indexPct)% — conviction-weighted โดย
  // default (น้ำหนัก = raw conviction ต่อตัว) หรือ equal ถ้า splitMethod="equal".
  // **เพดานหุ้นรายตัว maxSinglePct (default 10%)** ของพอร์ตหุ้นต่างประเทศทั้งหมด
  // (index ไม่โดนเพดานนี้ — เป็น "หุ้นรายตัว" ที่คุม). รับ "เฉพาะ satellites" เพื่อให้
  // ก้อนที่แบ่ง = ก้อนที่แสดงจริง. index target + Σsatellite + unallocated = 100.
  function allocationPolicy(satellites, opts) {
    opts = opts || {};
    var indexKey = String(opts.indexTicker || "QQQM").toUpperCase();
    var indexPct = fin(opts.indexPct) != null ? clamp(opts.indexPct, 0, 100) : 50;
    var equal = opts.splitMethod === "equal";
    var maxSingle = fin(opts.maxSinglePct) != null ? clamp(opts.maxSinglePct, 0.1, 100) : 10;
    var satellitePool = 100 - indexPct;
    var targets = {}, notes = {};
    var sats = (satellites || []).filter(function (r) { return r.ticker.toUpperCase() !== indexKey; });
    var unallocated = 0;
    if (sats.length === 0) {
      unallocated = round1(satellitePool);
    } else {
      var weights = sats.map(function (r) {
        var w = equal ? 1 : Math.max(fin(r.rawConviction) != null ? r.rawConviction : (r.tier ? r.tier.target : 3), 1);
        return { ticker: r.ticker, w: w };
      });
      var wsum = weights.reduce(function (s, x) { return s + x.w; }, 0) || 1;
      var poolUnits = Math.round(satellitePool * 10);
      var capUnits = Math.round(maxSingle * 10);
      // แบ่งแบบ water-filling (เพดานต่อตัว) แล้ว round เป็นหน่วย 0.1% ด้วย largest-remainder
      var alloc = capWaterfill(weights.map(function (x) { return x.w; }), satellitePool, maxSingle);
      var exactU = alloc.map(function (v) { return v * 10; });
      var floors = exactU.map(function (e) { return Math.floor(e + 1e-9); });
      var distributedU = Math.round(exactU.reduce(function (s, e) { return s + e; }, 0));
      var used = floors.reduce(function (s, f) { return s + f; }, 0);
      var remainder = distributedU - used;
      var order = exactU.map(function (e, i) { return { i: i, frac: e - Math.floor(e + 1e-9), room: capUnits - floors[i] }; })
        .filter(function (o) { return o.room > 0; }) // ไม่ bump ตัวที่จะทะลุเพดาน
        .sort(function (a, b) { return b.frac - a.frac; });
      for (var k = 0; k < remainder && k < order.length; k++) floors[order[k].i] += 1;
      var satTotalU = 0;
      weights.forEach(function (x, i) {
        satTotalU += floors[i];
        var t = round1(floors[i] / 10);
        var atCap = floors[i] >= capUnits;
        targets[x.ticker.toUpperCase()] = t;
        notes[x.ticker.toUpperCase()] = (equal
          ? "แบ่งเท่ากัน " + satellitePool + "% ÷ " + sats.length + " ตัว"
          : "Conviction " + round1(x.w) + " / รวม " + round1(wsum) + " × " + satellitePool + "%") +
          " → " + t + "%" + (atCap ? " · ชนเพดานรายตัว " + maxSingle + "%" : "");
      });
      unallocated = round1((poolUnits - satTotalU) / 10);
    }
    // index anchor: ได้ indexPct เสมอ (ถือแล้วหรือยังไม่ถือก็เป็นเป้า) — ไม่โดนเพดานรายตัว
    targets[indexKey] = indexPct;
    notes[indexKey] = "Index core — ตั้งเป้าคงที่ " + indexPct + "% ของหุ้นต่างประเทศ (ไม่นับเป็นหุ้นรายตัว)";
    return {
      indexTicker: indexKey, indexPct: indexPct, indexTarget: indexPct, satellitePool: satellitePool,
      splitMethod: equal ? "equal" : "conviction", satelliteCount: sats.length, maxSinglePct: maxSingle,
      unallocated: unallocated, targets: targets, notes: notes
    };
  }

  // ---------------- finalize target-dependent fields (หลังรู้ policy target) ----------------
  // รองรับทั้ง covered (มี zone/ladder → มี action) และ uncovered held (target เท่านั้น)
  function applyTarget(row, target, isIndex) {
    row.isIndex = !!isIndex;
    row.target = target == null ? null : round1(target);
    var cur = fin(row.weightPct) != null ? row.weightPct : 0;
    if (row.target != null) {
      row.gap = round1(Math.max(0, row.target - cur));
      row.over = round1(Math.max(0, cur - row.target)); // เกินเป้า (ไว้บอก "ถือเกิน" แบบไม่ใช้คำขาย)
      row.capacity = row.gap; // headroom ถึงเป้า policy (เพดานจริงคือเป้า ไม่ใช่ tier.max)
    } else { row.gap = 0; row.over = 0; row.capacity = 0; }
    if (!row.covered) { row.pendingPp = 0; row.action = null; return row; } // uncovered → target เท่านั้น
    var pendingPp = 0;
    (row.ladder || []).forEach(function (e) { if (e.triggered && !e.completed && !e.blocked) pendingPp += (e.pct / 100) * (row.target || 0); });
    row.pendingPp = round1(Math.min(pendingPp, row.gap));
    var action = positionAction(row.zone.key, row.gap);
    if (action.key === "increase" && row.pendingPp <= 0) action = ACTIONS.maintain;
    row.action = action;
    return row;
  }

  // ---------------- Position action (4 คำเท่านั้น) ----------------
  function positionAction(zoneKey, gap) {
    if (zoneKey === "E") return ACTIONS.review;
    if (zoneKey === "D") return gap > 0 ? ACTIONS.wait : ACTIONS.maintain;
    return gap > 0.25 ? ACTIONS.increase : ACTIONS.maintain;
  }

  // ---------------- ประเมินรายตัว ----------------
  // pos = { ticker, name, held, weightPct|null, avgCost|null, tierKey, entryDone:{1:bool..} }
  function evaluate(pos, snapshot, TE, tierDefs, teOpts, stance) {
    var tierDef = tierDefs[pos.tierKey] || tierDefs.C;
    var o;
    try { o = TE.compute(pos.ticker, snapshot, teOpts || {}); } catch (e) { o = null; }
    if (!o || !o.available) {
      return { ticker: pos.ticker, name: pos.name || pos.ticker, covered: false, held: !!pos.held,
        tier: tierDef, weightPct: fin(pos.weightPct), avgCost: fin(pos.avgCost) };
    }
    var tr = techOf(snapshot, pos.ticker);
    // Business Growth vs ราคา = เฉลี่ยจาก 3 ช่วงปีล่าสุด (2/3/4 ปี) ผ่าน computeHistory
    var histories = GROWTH_WINDOWS.map(function (y) {
      try {
        var ho = { years: y };
        for (var k in (teOpts || {})) if (Object.prototype.hasOwnProperty.call(teOpts, k)) ho[k] = teOpts[k];
        ho.years = y;
        return TE.computeHistory ? TE.computeHistory(pos.ticker, snapshot, ho) : null;
      } catch (e2) { return null; }
    });
    var growth = growthSummary(histories, GROWTH_WINDOWS);
    var acc = accumulationScore(o, tr, growth);
    var zr = zoneOf(o, acc, tr, fin(pos.weightPct), tierDef, stance);
    var ladder = entryLadder(zr.zone.key, o, tr, { stance: stance });
    var done = pos.entryDone || {};
    ladder.forEach(function (e) { e.completed = !!done[e.n]; });
    var ti = targetFor(tierDef, o, stance, growth);
    var price = fin(tr.tech.latestClose);
    var avgCost = fin(pos.avgCost);
    var glPct = price != null && avgCost != null && avgCost > 0 ? (price / avgCost - 1) * 100 : null;
    // target-dependent fields (gap/capacity/pendingPp/action) เติมทีหลังใน applyTarget
    // เพราะเป้าจริงมาจาก allocationPolicy (QQQM 50% + หุ้นรายตัวแบ่ง 50%) ไม่ใช่ tier
    return {
      ticker: pos.ticker, name: o.name || pos.name || pos.ticker, covered: true, held: !!pos.held,
      tier: tierDef, weightPct: fin(pos.weightPct), avgCost: avgCost, price: price, glPct: glPct,
      o: o, thesisScore: o.thesis.score, thesisTrend: o.thesis.trend ? o.thesis.trend.key : null,
      regimeScore: o.inputs && o.inputs.regime ? fin(o.inputs.regime.score) : null,
      ratesSevere: !!(o.inputs && o.inputs.rates && o.inputs.rates.severe),
      acc: acc, accScore: acc.score, zone: zr.zone, zoneWhy: zr.why,
      why: whyChecklist(o, acc.timing, acc.valLevel, growth),
      growth: growth, growthScore: growth.score, growthLabel: growth.label,
      ladder: ladder, targetInfo: ti, rawConviction: ti.raw,
      convictionTarget: ti.target, stale: !!o.stale, dd: acc.timing.dd
    };
  }

  // ---------------- Cash Deployment Plan (เงินสด = 100%) ----------------
  function deploymentPlan(rows, cashPct, ctx) {
    ctx = ctx || {};
    var reserve = RULES.BASE_RESERVE;
    var reserveWhy = ["สำรองพื้นฐาน " + RULES.BASE_RESERVE + "% — เผื่อโอกาส Zone A ที่ยังไม่มา"];
    var halve = false;
    if (ctx.regimeScore != null && ctx.regimeScore < RULES.RISK_OFF_REGIME) {
      reserve += RULES.RISK_OFF_RESERVE_ADD; halve = true;
      reserveWhy.push("Macro Risk-Off (regime " + ctx.regimeScore + " < " + RULES.RISK_OFF_REGIME + ") → reserve +" + RULES.RISK_OFF_RESERVE_ADD + "pp และลดขนาดทุก entry ลง 50% (Rule 3)");
    }
    if (ctx.ratesSevere) {
      reserve += RULES.RATES_RESERVE_ADD;
      reserveWhy.push("Interest Rate High Alert → reserve +" + RULES.RATES_RESERVE_ADD + "pp (Rule 4)");
    }
    reserve = Math.min(reserve, 100);
    var deployable = 100 - reserve;
    var cash = fin(cashPct);
    var items = rows
      .filter(function (r) { return r.covered && (r.zone.key === "A" || r.zone.key === "B" || r.zone.key === "C") && r.pendingPp > 0; })
      .sort(function (a, b) { return a.zone.rank - b.zone.rank || (b.accScore || 0) - (a.accScore || 0); })
      .map(function (r) {
        // แปลง pp ของพอร์ต → % ของเงินสดก้อนนี้
        var pctOfCash = cash != null && cash > 0 ? (r.pendingPp / cash) * 100 : r.pendingPp * 4; // ไม่มีข้อมูลเงินสด → สเกลสมมติ 25% ของพอร์ต
        if (halve) pctOfCash *= 0.5;
        var entries = r.ladder.filter(function (e) { return e.triggered && !e.completed && !e.blocked; }).map(function (e) { return "Entry " + e.n; });
        return { ticker: r.ticker, zone: r.zone, accScore: r.accScore, pctOfCash: pctOfCash, pendingPp: r.pendingPp,
          entries: entries, halved: halve,
          why: r.zone.icon + " " + r.zone.label.replace(/^Zone [A-E] — /, "") + " · " + entries.join("+") + " trigger แล้ว · เติมได้อีก " + r.pendingPp + "pp ถึงเป้า " + r.target + "%" };
      });
    var total = 0;
    items.forEach(function (i) { total += i.pctOfCash; });
    var scaled = false;
    if (total > deployable && total > 0) {
      var f = deployable / total;
      items.forEach(function (i) { i.pctOfCash = i.pctOfCash * f; });
      scaled = true; total = deployable;
    }
    items.forEach(function (i) { i.pctOfCash = round1(i.pctOfCash); });
    var used = 0; items.forEach(function (i) { used += i.pctOfCash; });
    return { reserve: reserve, reserveWhy: reserveWhy, deployable: deployable, halved: halve,
      items: items, used: round1(used), cashReserveFinal: round1(100 - used), scaled: scaled, cashPct: cash };
  }

  // ---------------- Risk rules panel ----------------
  function riskRules(rows, ctx) {
    var bearish = normStance(ctx.megaStance) === "bearish";
    var weakThesis = rows.filter(function (r) { return r.covered && r.thesisScore < RULES.THESIS_MIN; });
    var riskOff = ctx.regimeScore != null && ctx.regimeScore < RULES.RISK_OFF_REGIME;
    return [
      { n: 1, rule: "AI Megatrend (มุมมองของคุณ) = Bearish → งดสะสมใหม่", active: bearish,
        detail: bearish ? "คุณตั้งมุมมอง Bearish — ทุก entry ปิด ไม่มี deployment ใหม่จนกว่าจะสลับเป็น Bullish"
          : "คุณตั้งมุมมอง Bullish — เปิดสะสมได้ตามเงื่อนไข Zone/Entry ปกติ" },
      { n: 2, rule: "Investment Thesis < " + RULES.THESIS_MIN + " → Review Thesis", active: weakThesis.length > 0,
        detail: weakThesis.length ? "ต้องทบทวน: " + weakThesis.map(function (r) { return r.ticker + " (" + r.thesisScore + ")"; }).join(", ") : "ทุกตัวที่ถือผ่านเกณฑ์ Thesis ≥ " + RULES.THESIS_MIN },
      { n: 3, rule: "Macro Risk-Off → ลดขนาด deployment ใหม่ 50%", active: riskOff,
        detail: ctx.regimeScore == null ? "ไม่มีข้อมูล regime — ยังไม่ trigger" : riskOff ? "Regime " + ctx.regimeScore + " < " + RULES.RISK_OFF_REGIME + " — ทุก entry ถูกลดขนาดครึ่งหนึ่ง (เช่น Entry 1: 50% → 25%)" : "Regime " + ctx.regimeScore + " ≥ " + RULES.RISK_OFF_REGIME + " — deployment เต็มขนาด" },
      { n: 4, rule: "Interest Rate High Alert → เพิ่ม Cash Reserve อัตโนมัติ", active: !!ctx.ratesSevere,
        detail: ctx.ratesSevere ? "ลมต้านดอกเบี้ยแรง — reserve +" + RULES.RATES_RESERVE_ADD + "pp" : "ลมต้านดอกเบี้ยยังรับได้ — reserve ปกติ" }
    ];
  }

  // ---------------- Portfolio Overview ----------------
  // rows ที่ส่งเข้ามา = allocationRows (index + หุ้นธงแดง) — เป็น "พอร์ตหุ้นต่างประเทศ"
  function overview(rows, cashPct, ctx) {
    ctx = ctx || {};
    var covered = rows.filter(function (r) { return r.covered; });
    var wSum = 0, thAcc = 0, useWeights = covered.some(function (r) { return fin(r.weightPct) != null && r.weightPct > 0; });
    covered.forEach(function (r) {
      var w = useWeights ? (fin(r.weightPct) || 0) : 1;
      wSum += w; thAcc += w * (fin(r.thesisScore) || 0);
    });
    var score = wSum > 0 ? Math.round(thAcc / wSum) : null;
    var strongW = 0;
    covered.forEach(function (r) { if (r.thesisScore >= RULES.THESIS_MIN) strongW += useWeights ? (fin(r.weightPct) || 0) : 1; });
    var pctStrong = wSum > 0 ? (strongW / wSum) * 100 : null;
    var health = score == null ? { key: "unknown", label: "ยังประเมินไม่ได้", why: "ไม่มีตำแหน่งที่มี Investment Thesis" }
      : score >= 75 && pctStrong >= 70 ? { key: "strong", label: "แข็งแรง", why: "คะแนนเฉลี่ยถ่วงน้ำหนัก " + score + " และ " + Math.round(pctStrong) + "% ของน้ำหนักอยู่ในตัวที่ Thesis ≥ 70" }
        : score >= 60 ? { key: "moderate", label: "ปานกลาง", why: "คะแนนเฉลี่ย " + score + " — มีบางตำแหน่งที่ Thesis ต่ำกว่าเกณฑ์" }
          : { key: "weak", label: "เปราะบาง", why: "คะแนนเฉลี่ย " + score + " — น้ำหนักส่วนใหญ่อยู่ในตัวที่พื้นฐานไม่ผ่านเกณฑ์" };
    // drift = ผลรวม |target − น้ำหนักจริง| ทุกแถวใน allocation (รวม uncovered held ที่มีเป้าแล้ว)
    var drift = 0, driftKnown = false;
    rows.forEach(function (r) { if (fin(r.weightPct) != null && fin(r.target) != null) { drift += Math.abs(r.target - r.weightPct); driftKnown = true; } });
    var alignScore = driftKnown ? clamp(Math.round(100 - drift * 2), 0, 100) : null;
    var alignment = alignScore == null ? { key: "unknown", label: "—", why: "ยังไม่มีข้อมูลน้ำหนัก — ใส่มูลค่า (฿) ที่ธงแดงก่อน" }
      : alignScore >= 85 ? { key: "aligned", label: "ตรงเป้า", score: alignScore, why: "ห่างเป้ารวมเพียง " + round1(drift) + "pp" }
        : alignScore >= 65 ? { key: "near", label: "ใกล้เป้า", score: alignScore, why: "ห่างเป้ารวม " + round1(drift) + "pp — มีช่องเติมตามแผน entry" }
          : { key: "off", label: "ต้องปรับ", score: alignScore, why: "ห่างเป้ารวม " + round1(drift) + "pp — น้ำหนักจริงยังไม่สอดคล้องเป้าแบบไดนามิก" };
    // Overall recommendation — cascade เดียว อธิบายได้
    var rec, recWhy;
    var anyAB = covered.filter(function (r) { return (r.zone.key === "A" || r.zone.key === "B") && r.pendingPp > 0; });
    var anyC = covered.filter(function (r) { return r.zone.key === "C" && r.pendingPp > 0; });
    var bearish = normStance(ctx.megaStance) === "bearish";
    if (covered.length === 0) { rec = ACTIONS.wait; recWhy = "ยังไม่มีตำแหน่งที่มี Investment Thesis — เพิ่มด้วย /thesis-update"; }
    else if (bearish) { rec = ACTIONS.wait; recWhy = "คุณตั้งมุมมอง AI Megatrend = Bearish — งดสะสมใหม่ทั้งพอร์ต (Rule 1)"; }
    else if (score != null && score < RULES.THESIS_MIN) { rec = ACTIONS.review; recWhy = "คะแนน Thesis เฉลี่ยของพอร์ต " + score + " < " + RULES.THESIS_MIN + " — ทบทวนก่อนวางเงินเพิ่ม"; }
    else if (anyAB.length) { rec = ACTIONS.increase; recWhy = anyAB.map(function (r) { return r.ticker; }).join(", ") + " อยู่ Zone " + anyAB.map(function (r) { return r.zone.key; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).join("/") + " และ entry trigger แล้ว"; }
    else if (anyC.length) { rec = ACTIONS.increase; recWhy = "ทยอยสะสมแบบ gradual: " + anyC.map(function (r) { return r.ticker; }).join(", ") + " (Zone C)"; }
    else { rec = ACTIONS.maintain; recWhy = "ทุกตำแหน่งอยู่ระดับเป้าหรือยังไม่มี entry ที่ trigger — ถือตามแผน"; }
    return { score: score, health: health, alignment: alignment, drift: driftKnown ? round1(drift) : null,
      pctStrong: pctStrong == null ? null : Math.round(pctStrong), recommendation: rec, recommendationWhy: recWhy };
  }

  // ---------------- main compute ----------------
  // opts: { TE, positions:[{ticker,name,held,weightPct,avgCost,tierKey,entryDone}],
  //         cashPct, tierDefs, megaStance ("bullish"|"bearish"),
  //         indexTicker ("QQQM"), indexPct (50), splitMethod ("conviction"|"equal") }
  function compute(snapshot, opts) {
    opts = opts || {};
    var TE = opts.TE || (typeof window !== "undefined" ? window.ThesisEngine : null);
    if (!TE) return { available: false, reason: "ThesisEngine ไม่พร้อม" };
    var tierDefs = opts.tierDefs || TIER_DEFS;
    var teOpts = opts.teOpts || {};
    var stance = normStance(opts.megaStance);
    var rows = (opts.positions || []).map(function (p) { return evaluate(p, snapshot, TE, tierDefs, teOpts, stance); });
    var covered = rows.filter(function (r) { return r.covered; });
    var idxKey = String(opts.indexTicker || "QQQM").toUpperCase();

    // satellites = หุ้น "ธงแดง" (held) ที่ไม่ใช่ index — covered หรือ uncovered ก็นับ
    // (เงินของหุ้น uncovered ที่ถือต้องอยู่ในฐาน 100% ด้วย ไม่หายไปเงียบ ๆ)
    var satellites = rows.filter(function (r) { return r.held && r.ticker.toUpperCase() !== idxKey; });

    // ---- Allocation Policy: index = indexPct% · satellites แบ่ง (100-indexPct)% · เพดานรายตัว ----
    var policy = allocationPolicy(satellites, {
      indexTicker: idxKey, indexPct: opts.indexPct, splitMethod: opts.splitMethod, maxSinglePct: opts.maxSinglePct
    });

    // index row: แถวใด ๆ ที่ ticker ตรง idxKey (ถือ/ยังไม่ถือ/uncovered ก็ได้) — ต้องมีเสมอ
    var indexRow = rows.find(function (r) { return r.ticker.toUpperCase() === idxKey; }) || null;
    if (!indexRow && policy.indexPct > 0) {
      indexRow = { ticker: policy.indexTicker, name: policy.indexTicker + " (Index core)", covered: false, held: false, weightPct: null, tier: tierDefs.B };
    }

    // apply targets: index → indexTarget · satellite (held) → policy · candidate → convictionTarget
    rows.forEach(function (r) {
      var isIndex = r.ticker.toUpperCase() === idxKey;
      if (isIndex) applyTarget(r, policy.indexTarget, true);
      else if (r.held) applyTarget(r, policy.targets[r.ticker.toUpperCase()] != null ? policy.targets[r.ticker.toUpperCase()] : 0, false);
      else if (r.covered) applyTarget(r, r.convictionTarget, false); // candidate ยังไม่ถือ → เป้าเชิงข้อมูล (ไม่เข้า allocationRows)
    });
    if (indexRow && rows.indexOf(indexRow) === -1) applyTarget(indexRow, policy.indexTarget, true); // synthetic index (ไม่มีใน positions)

    var first = covered[0];
    var ctx = {
      regimeScore: first ? first.regimeScore : null,
      ratesSevere: first ? first.ratesSevere : false,
      megaStance: stance
    };
    var heldRows = rows.filter(function (r) { return r.held; });
    // allocationRows = "พอร์ตหุ้นต่างประเทศ" ตาม policy: index core (เสมอ) + หุ้นธงแดงทุกตัว
    var allocationRows = [];
    if (indexRow) allocationRows.push(indexRow);
    satellites.forEach(function (r) { if (r !== indexRow) allocationRows.push(r); });

    // แผนวางเงิน = ตาม allocation policy (index core + หุ้นธงแดง) — เงินก้อนถัดไปเข้าพอร์ตนี้
    var deployment = deploymentPlan(allocationRows, opts.cashPct, ctx);
    return {
      available: true, rows: rows, heldRows: heldRows, allocationRows: allocationRows,
      indexRow: indexRow, policy: policy, ctx: ctx, megaStance: stance,
      overview: overview(allocationRows, opts.cashPct, ctx),
      deployment: deployment,
      risk: riskRules(heldRows, ctx),
      tierDefs: tierDefs
    };
  }

  var PMEngine = {
    VERSION: "1.0",
    TIER_DEFS: TIER_DEFS, DEFAULT_TIER_MAP: DEFAULT_TIER_MAP,
    VAL_SCORE: VAL_SCORE, VAL_TH: VAL_TH, GROWTH_SCORE: GROWTH_SCORE, GROWTH_TH: GROWTH_TH,
    GROWTH_WINDOWS: GROWTH_WINDOWS, ZONES: ZONES, ACTIONS: ACTIONS, RULES: RULES,
    techOf: techOf, smaDistPct: smaDistPct, emaBullish: emaBullish,
    growthPriceScore: growthPriceScore, growthSummary: growthSummary, growthScoreOf: growthScoreOf, growthLabelFromScore: growthLabelFromScore,
    dipTiming: dipTiming, accumulationScore: accumulationScore, whyChecklist: whyChecklist,
    quarterlyBuckets: quarterlyBuckets,
    zoneOf: zoneOf, entryLadder: entryLadder, targetFor: targetFor,
    allocationPolicy: allocationPolicy, applyTarget: applyTarget,
    positionAction: positionAction, evaluate: evaluate,
    deploymentPlan: deploymentPlan, riskRules: riskRules, overview: overview,
    compute: compute
  };

  if (typeof window !== "undefined") window.PMEngine = PMEngine;
  if (typeof module !== "undefined" && module.exports) module.exports = PMEngine;
})();
