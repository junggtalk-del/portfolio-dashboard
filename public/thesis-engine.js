(function () {
  "use strict";

  // ============================================================
  // Investment Thesis Engine — v1. Answers ONE question per company:
  // "บริษัทนี้ยังเดินตาม investment thesis ระยะยาวอยู่ไหม — ควรสะสมจังหวะย่อไหม"
  //
  // Two data planes, clearly separated and disclosed:
  //   CURATED  (window.ThesisData) — fundamentals / revenue quality / AI
  //            execution / moat / capital allocation, hand-curated knowledge
  //            with an as-of stamp. The structural judgment.
  //   LIVE     — technical timing (snapshot.scoring), Mega Trend + gate
  //            (AdaptivePosition), Macro (MarketRegime), rate headwind, and
  //            the drawdown decomposition from real closes.
  //
  // Deterministic. No LLM at runtime. Never Buy/Sell — decisions are
  // Strong Accumulate / Accumulate / Wait / Reduce Tactical / Review Thesis.
  // window.ThesisEngine + module.exports (Node smoke tests).
  // ============================================================

  var VERSION = "1.0.0";

  var COMPANIES = [
    { ticker: "GOOG", name: "Alphabet" }, { ticker: "NVDA", name: "NVIDIA" },
    { ticker: "MSFT", name: "Microsoft" }, { ticker: "META", name: "Meta Platforms" },
    { ticker: "AMZN", name: "Amazon" }, { ticker: "TSM", name: "TSMC" },
    { ticker: "AVGO", name: "Broadcom" }, { ticker: "AMD", name: "AMD" }
  ];
  var ALIAS = { GOOG: ["GOOG", "GOOGL"], GOOGL: ["GOOGL", "GOOG"] };

  function num(v) { if (v == null || v === "") return null; var n = Number(v); return isFinite(n) ? n : null; }
  function round(v, d) { if (v == null || !isFinite(v)) return null; var p = Math.pow(10, d == null ? 0 : d); return Math.round(v * p) / p; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function avg(arr) { var f = (arr || []).filter(function (x) { return Number.isFinite(x); }); return f.length ? f.reduce(function (s, x) { return s + x; }, 0) / f.length : null; }

  var STATUS_MAP = { strengthening: 85, stable: 65, weakening: 35 };
  var ACCEL_MAP = { accelerating: 85, steady: 65, decelerating: 40 };
  var VAL_SCORE = { cheap: 85, fair: 70, premium: 50, expensive: 30 };
  var VAL_TH = { cheap: "ถูก", fair: "สมเหตุสมผล", premium: "พรีเมียม", expensive: "แพง" };

  function thesisStatus(score) {
    if (score >= 85) return { key: "very-strong", label: "Very Strong", thai: "แข็งแกร่งมาก", tone: "bull" };
    if (score >= 70) return { key: "strong", label: "Strong", thai: "แข็งแกร่ง", tone: "bull" };
    if (score >= 55) return { key: "neutral", label: "Neutral", thai: "กลาง ๆ", tone: "watch" };
    if (score >= 40) return { key: "weak", label: "Weak", thai: "อ่อนแรง", tone: "bear" };
    return { key: "broken", label: "Broken", thai: "thesis เสีย", tone: "bear" };
  }
  function confLabel(score) {
    if (score == null) return null;
    if (score >= 80) return { key: "very-high", label: "Very High", thai: "สูงมาก" };
    if (score >= 65) return { key: "high", label: "High", thai: "สูง" };
    if (score >= 45) return { key: "medium", label: "Medium", thai: "ปานกลาง" };
    return { key: "low", label: "Low", thai: "ต่ำ" };
  }

  // ---------------------------------------------------------- staleness + coverage helpers
  // months between cfg.asOf ("YYYY-MM") and now — the curated plane goes stale
  // roughly every earnings cycle; the page shows a refresh warning at >= 3 months.
  var STALE_MONTHS = 3;          // calendar fallback when no nextEarnings recorded
  var EARNINGS_LEAD_DAYS = 7;    // heads-up window before the report
  var ESTIMATED_GRACE_DAYS = 12; // month-only estimates: wait this long past mid-month before "overdue"
  function staleMonthsOf(asOf, nowMs) {
    if (!asOf || !/^\d{4}-\d{2}/.test(String(asOf))) return null;
    var y = Number(String(asOf).slice(0, 4)), m = Number(String(asOf).slice(5, 7));
    var d = nowMs != null ? new Date(nowMs) : new Date();
    var months = (d.getFullYear() - y) * 12 + (d.getMonth() + 1 - m);
    return months < 0 ? 0 : months;
  }
  // earnings-aware reload signal. nextEarnings = "YYYY-MM-DD" (confirmed) or
  // "YYYY-MM" (estimated month → anchored mid-month, shown with ~). Counts down
  // to the real report and flips to "overdue" once it passes while curated data
  // is still pre-report. Falls back to the month-count heuristic when absent.
  function earningsStatusOf(asOf, nextEarnings, nowMs) {
    var staleMonths = staleMonthsOf(asOf, nowMs);
    var calendarStale = staleMonths != null && staleMonths >= STALE_MONTHS;
    var nowD = nowMs != null ? new Date(nowMs) : new Date();
    var s = nextEarnings == null ? "" : String(nextEarnings).trim();
    var mDay = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    var mMon = /^(\d{4})-(\d{2})$/.exec(s);
    var hasDate = !!(mDay || mMon);
    if (!hasDate) {
      // no usable earnings date → pure calendar heuristic (unchanged behaviour)
      return {
        nextEarnings: null, estimated: false, hasDate: false, daysToEarnings: null,
        state: calendarStale ? "stale" : "current",
        staleMonths: staleMonths, stale: calendarStale, dueSoon: false
      };
    }
    var estimated = !mDay;
    var ey = Number((mDay || mMon)[1]), em = Number((mDay || mMon)[2]);
    var ed = mDay ? Number(mDay[3]) : 15; // month-only → mid-month anchor
    var nowUtc = Date.UTC(nowD.getFullYear(), nowD.getMonth(), nowD.getDate());
    var days = Math.floor((Date.UTC(ey, em - 1, ed) - nowUtc) / 86400000);
    // is this report newer than the data we hold? (asOf month < earnings month)
    var asOfM = /^(\d{4})-(\d{2})/.exec(String(asOf || ""));
    var asOfKey = asOfM ? Number(asOfM[1]) * 12 + Number(asOfM[2]) : null;
    var newerThanData = asOfKey == null || (ey * 12 + em) > asOfKey;
    var pastThreshold = estimated ? -ESTIMATED_GRACE_DAYS : 0; // grace for month-only guesses
    var overdue = days < pastThreshold && newerThanData; // report clearly past, data still pre-report
    var dueSoon = days >= 0 && days <= EARNINGS_LEAD_DAYS;  // upcoming (or today) within the lead window
    // precedence: fresh report we missed > data simply old > heads-up before report > current
    var state = overdue ? "overdue" : calendarStale ? "stale" : dueSoon ? "due-soon" : "current";
    return {
      nextEarnings: s, estimated: estimated, hasDate: true, daysToEarnings: days,
      state: state, staleMonths: staleMonths, stale: overdue || calendarStale, dueSoon: dueSoon
    };
  }
  // company chips derive from the DATA (a ticker added via /thesis-update shows
  // up on the page automatically); COMPANIES is the name fallback.
  function companiesFrom(data) {
    var companies = data && data.companies ? data.companies : {};
    var keys = Object.keys(companies);
    if (!keys.length) return COMPANIES.slice();
    var nameOf = {};
    COMPANIES.forEach(function (c) { nameOf[c.ticker] = c.name; });
    return keys.map(function (t) { return { ticker: t, name: (companies[t] && companies[t].name) || nameOf[t] || t }; });
  }

  // ---------------------------------------------------------- live helpers
  function closesFor(ticker, snapshot) {
    var hist = (snapshot && snapshot.historicalData) || {};
    var keys = ALIAS[ticker] || [ticker];
    for (var i = 0; i < keys.length; i++) {
      var h = hist[keys[i]];
      if (h && Array.isArray(h.closes) && h.closes.length >= 30) return h.closes.map(Number).filter(Number.isFinite);
    }
    return null;
  }
  function drawdownPct(closes, lookback) {
    if (!closes || closes.length < 5) return null;
    var lb = Math.min(lookback || 90, closes.length);
    var seg = closes.slice(-lb);
    var hi = Math.max.apply(null, seg);
    var last = seg[seg.length - 1];
    if (!(hi > 0)) return null;
    return round((last / hi - 1) * 100, 1); // negative when below high
  }
  function technicalFor(ticker, snapshot) {
    var s = snapshot || {};
    var keys = ALIAS[ticker] || [ticker];
    for (var i = 0; i < keys.length; i++) {
      var sc = s.scoring && s.scoring.bySymbol && s.scoring.bySymbol[keys[i]];
      var ts = s.technicalSignals && s.technicalSignals[keys[i]];
      if (sc || ts) {
        var aboveSma = ts && num(ts.latestClose) != null && num(ts.sma200) != null ? ts.latestClose > ts.sma200 : null;
        var emaBull = ts && num(ts.ema12) != null && num(ts.ema26) != null ? ts.ema12 > ts.ema26 : null;
        return {
          signalScore: sc ? num(sc.signalScore) : null,
          thaiSignalLabel: sc ? sc.thaiSignalLabel : null,
          aboveSma: aboveSma, emaBull: emaBull
        };
      }
    }
    return null;
  }

  // ---------------------------------------------------------- compute
  function compute(ticker, snapshot, opts) {
    opts = opts || {};
    snapshot = snapshot || {};
    try {
      var T = String(ticker || "").toUpperCase();
      var data = opts.data || (typeof window !== "undefined" ? window.ThesisData : null);
      var cfg = data && data.companies && data.companies[T];
      if (!cfg) return { available: false, reason: "no-config", thai: "ยังไม่มีข้อมูล thesis ของ " + T + " (รองรับ: " + COMPANIES.map(function (c) { return c.ticker; }).join(", ") + ")" };

      // ---- curated pillar scores ----
      var fundScore = round(avg((cfg.fundamentals || []).map(function (f) { return num(f.score); })));
      var revQScore = round(avg([ACCEL_MAP[cfg.revenueQuality && cfg.revenueQuality.acceleration] || null, num(cfg.revenueQuality && cfg.revenueQuality.consistency)]));
      var aiScore = num(cfg.aiExecution && cfg.aiExecution.score);
      var compScore = round(avg([STATUS_MAP[cfg.competitive && cfg.competitive.overall] || null,
        avg((cfg.competitive && cfg.competitive.factors || []).map(function (f) { return STATUS_MAP[f.status] || null; }))]));
      var capScore = num(cfg.capitalAllocation && cfg.capitalAllocation.score);

      var pillars = [
        { key: "fundamentals", score: fundScore, w: 30 },
        { key: "aiExecution", score: aiScore, w: 25 },
        { key: "competitive", score: compScore, w: 20 },
        { key: "revenueQuality", score: revQScore, w: 15 },
        { key: "capitalAllocation", score: capScore, w: 10 }
      ];
      var pw = 0, pa = 0;
      pillars.forEach(function (p) { if (p.score != null) { pw += p.w; pa += p.score * p.w; } });
      if (!pw) return { available: false, reason: "bad-config", thai: "ข้อมูล thesis ของ " + T + " ไม่สมบูรณ์" };
      var thesisScore = Math.round(pa / pw);
      var status = thesisStatus(thesisScore);

      var pos = 0, neg = 0;
      (cfg.whatChanged || []).forEach(function (w) { if (w.direction === "positive") pos++; else if (w.direction === "negative") neg++; });
      var trend = pos > neg ? { key: "improving", thai: "กำลังดีขึ้น" } : pos < neg ? { key: "deteriorating", thai: "กำลังแผ่วลง" } : { key: "stable", thai: "ทรงตัว" };

      // ---- live overlays ----
      var AP = opts.AP || (typeof window !== "undefined" ? window.AdaptivePosition : null);
      var mega = opts.mega !== undefined ? opts.mega : (AP && AP.compute ? AP.compute(snapshot) : null);
      var megaIn = mega && mega.available ? { score: mega.megaTrend.score, stateLabel: mega.megaTrend.state.label, gateOpen: mega.gate.open } : null;
      var regime = opts.regime !== undefined ? opts.regime : (typeof window !== "undefined" && window.MarketRegime && window.MarketRegime.compute ? window.MarketRegime.compute(snapshot) : null);
      var regimeIn = regime && regime.available !== false && num(regime.score) != null ? { score: Math.round(regime.score), label: regime.regime ? regime.regime.label : "" } : null;
      var rates = mega && mega.available && mega.inputs && mega.inputs.rates ? mega.inputs.rates
        : (AP && AP.rateHeadwind ? AP.rateHeadwind(snapshot.historicalData && snapshot.historicalData["^TNX"] && snapshot.historicalData["^TNX"].closes, null) : null);
      var ratesIn = rates && rates.score != null ? { score: rates.score, severe: !!rates.severe } : null;
      var tech = technicalFor(T, snapshot);
      var R = opts.R !== undefined ? opts.R : (typeof window !== "undefined" && window.AIRotationEngine && window.AIRotationEngine.compute ? window.AIRotationEngine.compute(snapshot) : null);

      // ---- §7 why is the stock falling (drawdown decomposition, live) ----
      var closes = closesFor(T, snapshot);
      var dd = closes ? drawdownPct(closes, 90) : null;
      var ddAbs = dd != null ? Math.abs(Math.min(dd, 0)) : null;
      var mkt = drawdownPct(closesFor("^GSPC", snapshot) || (snapshot.historicalData && snapshot.historicalData["^GSPC"] && snapshot.historicalData["^GSPC"].closes) || null, 90);
      var ndq = drawdownPct((snapshot.historicalData && snapshot.historicalData["^IXIC"] && snapshot.historicalData["^IXIC"].closes) || null, 90);
      var mktAbs = mkt != null ? Math.abs(Math.min(mkt, 0)) : null;
      // peers = companies in the same value-chain layer with price data
      var peerDds = [];
      if (R && R.available && R.layers) {
        R.layers.forEach(function (L) {
          if (L.key !== cfg.layer) return;
          (L.companies || []).forEach(function (co) {
            if (String(co.ticker).toUpperCase() === T) return;
            var pc = closesFor(String(co.ticker).toUpperCase(), snapshot);
            var pdd = pc ? drawdownPct(pc, 90) : null;
            if (pdd != null) peerDds.push(Math.abs(Math.min(pdd, 0)));
          });
        });
      }
      var peersAbs = avg(peerDds);
      if (peersAbs == null) peersAbs = ndq != null ? Math.abs(Math.min(ndq, 0)) : null;

      var causes = [];
      if (ddAbs != null && ddAbs >= 3) {
        if (mktAbs != null) causes.push({ key: "market", label: "Market-wide", magnitude: round(Math.min(ddAbs, mktAbs), 1), detail: "ตลาดรวม (S&P500) ย่อ " + mktAbs.toFixed(1) + "% จาก high 90 วัน" });
        if (peersAbs != null && mktAbs != null && peersAbs > mktAbs + 1) causes.push({ key: "rotation", label: "Sector Rotation", magnitude: round(Math.min(ddAbs, peersAbs - mktAbs), 1), detail: "กลุ่มเดียวกัน (" + cfg.layer + ") ย่อลึกกว่าตลาด " + (peersAbs - mktAbs).toFixed(1) + "pp" });
        if (peersAbs != null && ddAbs > peersAbs + 1) causes.push({ key: "company", label: "Company-specific", magnitude: round(ddAbs - peersAbs, 1), detail: "หุ้นย่อลึกกว่ากลุ่มตัวเอง " + (ddAbs - peersAbs).toFixed(1) + "pp — มีแรงขายเฉพาะตัว" });
        if (ratesIn && (ratesIn.severe || ratesIn.score <= 40)) causes.push({ key: "rates", label: "Interest Rates", magnitude: round(clamp((100 - ratesIn.score) / 12, 1, 8), 1), detail: "ลมต้านดอกเบี้ย" + (ratesIn.severe ? "ระดับ Severe" : "กำลังแรง") + " — กดหุ้น growth/AI ทั้งกระดาน" });
        if ((cfg.valuationView && (cfg.valuationView.level === "premium" || cfg.valuationView.level === "expensive")) && fundScore != null && fundScore >= 65 && ddAbs >= 8) {
          causes.push({ key: "valuation", label: "Valuation Compression", magnitude: round(clamp(ddAbs * 0.4, 1, 10), 1), detail: "พื้นฐานยังดี (" + fundScore + ") แต่ราคาเริ่มจาก multiple " + VAL_TH[cfg.valuationView.level] + " — ย่อจากการหด multiple ไม่ใช่ธุรกิจพัง" });
        }
        causes.sort(function (a, b) { return b.magnitude - a.magnitude; });
      }
      var falling = {
        drawdownPct: dd, hasData: closes != null,
        causes: causes,
        primary: causes[0] || null,
        secondary: causes[1] && causes[1].magnitude >= 1 ? causes[1] : null
      };

      // ---- §8 dip classification ----
      var dipClass;
      if (ddAbs == null) dipClass = { key: null, label: "No Data", thai: "ยังไม่มีข้อมูลราคา", tone: "watch", why: "โหลดข้อมูลเพื่อวิเคราะห์การย่อ" };
      else if (thesisScore < 40) dipClass = { key: "broken", label: "Broken Thesis", thai: "thesis เสีย", tone: "bear", why: "คะแนน thesis " + thesisScore + " ต่ำกว่าเกณฑ์ 40 — เหตุผลการถือเดิมไม่เหลือ" };
      else if (falling.primary && falling.primary.key === "company" && (thesisScore < 60 || trend.key === "deteriorating")) dipClass = { key: "fundamental", label: "Fundamental Weakness", thai: "พื้นฐานเริ่มมีปัญหา", tone: "bear", why: "แรงขายเฉพาะตัว + " + (trend.key === "deteriorating" ? "ผลประกอบการล่าสุดแผ่วลง" : "thesis อ่อน (" + thesisScore + ")") };
      else if (ddAbs < 8) dipClass = { key: "healthy", label: "Healthy Pullback", thai: "ย่อปกติในขาขึ้น", tone: "bull", why: "ย่อเพียง " + ddAbs.toFixed(1) + "% จาก high 90 วัน — อยู่ในช่วงพักตัวปกติ" };
      else if (falling.primary && falling.primary.key === "rotation") dipClass = { key: "rotation", label: "Sector Rotation", thai: "เงินหมุนออกจากกลุ่มชั่วคราว", tone: "watch", why: falling.primary.detail };
      else dipClass = { key: "macro", label: "Macro Pullback", thai: "ย่อตามตลาด/มหภาค", tone: "watch", why: (falling.primary ? falling.primary.detail : "แรงกดหลักมาจากปัจจัยภายนอกบริษัท") };

      // ---- §9 decision engine (thesis-first cascade; technical never decides alone) ----
      var valLevel = cfg.valuationView ? cfg.valuationView.level : null;
      var techOk = tech && (tech.aboveSma === true || tech.emaBull === true);
      var gateOpen = megaIn ? megaIn.gateOpen : null;
      var macroOk = regimeIn ? regimeIn.score >= 40 : null;
      var decision, decisionWhy = [];
      if (thesisScore < 55 || dipClass.key === "broken") {
        decision = { key: "review-thesis", label: "Review Thesis", thai: "ทบทวน thesis ก่อน", tone: "bear" };
        decisionWhy.push("thesis " + thesisScore + "/100 (" + status.label + ") — ตรวจเหตุผลการถือเดิมก่อนตัดสินใจใด ๆ");
      } else if (dipClass.key === "fundamental") {
        decision = { key: "wait", label: "Wait", thai: "รอความชัดเจนของงบ/ผลประกอบการ", tone: "watch" };
        decisionWhy.push("การย่อมีกลิ่นปัญหาพื้นฐาน — รอหลักฐานไตรมาสถัดไปยืนยันก่อนสะสมเพิ่ม");
      } else if (gateOpen === false || macroOk === false) {
        if (thesisScore < 70 && (valLevel === "expensive") && tech && tech.aboveSma === false && tech.emaBull === false) {
          decision = { key: "reduce-tactical", label: "Reduce Tactical", thai: "ลดส่วน Tactical", tone: "bear" };
          decisionWhy.push("Mega Trend/Macro ปิดเกต + valuation แพง + เทรนด์ราคาเสีย — ลดเฉพาะส่วน tactical (ไม่แตะ core)");
        } else {
          decision = { key: "wait", label: "Wait", thai: "รอ — เกตหลักยังปิด", tone: "watch" };
          decisionWhy.push(gateOpen === false ? "Mega Trend Gate ปิด (" + (megaIn ? megaIn.stateLabel : "-") + ") — ห้ามสะสมเชิงรุกแม้ technical จะดูดี" : "Macro Regime เป็น Risk-Off — แรงกดระบบใหญ่กว่าปัจจัยรายตัว");
        }
      } else {
        var eligible = (gateOpen === true) && (macroOk === true) && (!ratesIn || !ratesIn.severe) && ddAbs != null && ddAbs >= 5 && techOk === true
          && (dipClass.key === "healthy" || dipClass.key === "macro" || dipClass.key === "rotation");
        if (eligible && thesisScore >= 85 && (valLevel === "cheap" || valLevel === "fair") && ddAbs >= 8) {
          decision = { key: "strong-accumulate", label: "Strong Accumulate", thai: "สะสมได้อย่างมั่นใจ", tone: "bull" };
          decisionWhy.push("thesis แข็งแกร่งมาก (" + thesisScore + ") + ย่อลึก " + ddAbs.toFixed(1) + "% + valuation " + VAL_TH[valLevel] + " + เกตทุกชั้นเปิด");
        } else if (eligible) {
          decision = { key: "accumulate", label: "Accumulate", thai: "ทยอยสะสมตามแผน", tone: "bull" };
          decisionWhy.push("thesis ยังแข็ง (" + thesisScore + ") การย่อเป็น " + dipClass.label + " และเกต Mega Trend/Macro เปิด");
        } else {
          decision = { key: "wait", label: "Wait", thai: "รอจังหวะ/เงื่อนไขให้ครบ", tone: "watch" };
          if (ddAbs != null && ddAbs < 5) decisionWhy.push("ยังไม่ย่อพอ (" + ddAbs.toFixed(1) + "% — เกณฑ์ ≥5%) ไม่ต้องรีบไล่ราคา");
          if (techOk !== true) decisionWhy.push("เทรนด์ technical ยังไม่ยืนยัน (ราคาใต้ SMA200/EMA ตัดลง)");
          if (ratesIn && ratesIn.severe) decisionWhy.push("ลมต้านดอกเบี้ยระดับ Severe");
          if (ddAbs == null) decisionWhy.push("ยังไม่มีข้อมูลราคาสำหรับวัดการย่อ — กด Load Latest Data");
          if (!decisionWhy.length) decisionWhy.push("เงื่อนไขบางส่วนยังไม่ครบ");
        }
      }

      // ---- §10 confidence ----
      var techScore = tech && tech.signalScore != null ? tech.signalScore : (tech ? (techOk ? 65 : 35) : null);
      var confParts = [
        { key: "fundamentals", label: "Fundamentals", value: fundScore, weight: 25 },
        { key: "execution", label: "AI Execution", value: aiScore, weight: 20 },
        { key: "macro", label: "Macro", value: regimeIn ? regimeIn.score : null, weight: 15 },
        { key: "technical", label: "Technical", value: techScore, weight: 20 },
        { key: "valuation", label: "Valuation", value: valLevel ? VAL_SCORE[valLevel] : null, weight: 20 }
      ];
      var cw = 0, ca = 0;
      confParts.forEach(function (p) { if (p.value != null) { cw += p.weight; ca += Math.round(p.value) * p.weight; } });
      var confScore = cw ? Math.round(ca / cw) : null;

      // ---- §11 explainability ----
      var allow = [], discourage = [];
      if (decision.key === "strong-accumulate" || decision.key === "accumulate") {
        allow.push("thesis " + thesisScore + "/100 · " + status.label + " · แนวโน้ม" + trend.thai);
        if (megaIn) allow.push("Mega Trend " + megaIn.score + " (" + megaIn.stateLabel + ") เกตเปิด");
        if (regimeIn) allow.push("Macro " + regimeIn.label + " " + regimeIn.score + "/100");
        if (dipClass.key) allow.push("การย่อจัดเป็น " + dipClass.label + " — ไม่ใช่ปัญหาพื้นฐาน");
      } else {
        decisionWhy.forEach(function (w) { discourage.push(w); });
      }
      var up = confParts.filter(function (p) { return p.value != null && p.value >= 65; }).map(function (p) { return p.label + " " + Math.round(p.value); });
      var down = confParts.filter(function (p) { return p.value != null && p.value < 50; }).map(function (p) { return p.label + " " + Math.round(p.value); });

      // ---- §13 final verdict + PM summary (deterministic template assembly) ----
      var answer = (decision.key === "strong-accumulate" || decision.key === "accumulate") ? "YES" : decision.key === "wait" ? "WAIT" : "NO";
      var pm = cfg.name + ": thesis " + thesisScore + "/100 (" + status.thai + ", " + trend.thai + ") — " + (cfg.thesis && cfg.thesis.statement ? cfg.thesis.statement : "") +
        (ddAbs != null ? " ราคาย่อ " + ddAbs.toFixed(1) + "% จาก high 90 วัน" + (falling.primary ? " สาเหตุหลักคือ " + falling.primary.label : "") + " จัดเป็น " + dipClass.label + "." : " ยังไม่มีข้อมูลราคาสำหรับวัดการย่อ.") +
        (megaIn ? " Mega Trend " + megaIn.stateLabel + " (เกต" + (megaIn.gateOpen ? "เปิด" : "ปิด") + ")" : "") +
        (regimeIn ? " · Macro " + regimeIn.label : "") +
        (valLevel ? " · valuation " + VAL_TH[valLevel] : "") +
        ". สรุป: " + decision.label + " — " + decision.thai + (decisionWhy.length ? " (" + decisionWhy[0] + ")" : "");

      var asOfVal = cfg.asOf || (data && data.asOf) || null;
      var es = earningsStatusOf(asOfVal, cfg.nextEarnings, opts.nowMs);
      return {
        available: true, version: VERSION, ticker: T, name: cfg.name, asOf: asOfVal,
        staleMonths: es.staleMonths, stale: es.stale,
        earnings: { state: es.state, daysToEarnings: es.daysToEarnings, nextEarnings: es.nextEarnings, estimated: es.estimated, dueSoon: es.dueSoon, hasDate: es.hasDate },
        dataNote: "ข้อมูลโครงสร้าง (พื้นฐาน/execution/moat) เป็นความรู้ curated ณ " + (cfg.asOf || "-") + " · Mega Trend/Macro/Technical/ราคา เป็นค่า live จากระบบ",
        thesis: { score: thesisScore, status: status, trend: trend, statement: cfg.thesis ? cfg.thesis.statement : "", pillars: (cfg.thesis && cfg.thesis.pillars) || [] },
        fundamentals: { score: fundScore, items: cfg.fundamentals || [] },
        revenueQuality: { score: revQScore, acceleration: cfg.revenueQuality.acceleration, consistency: cfg.revenueQuality.consistency, recurringPct: cfg.revenueQuality.recurringPct != null ? cfg.revenueQuality.recurringPct : null, note: cfg.revenueQuality.note, segments: cfg.revenueQuality.segments || [] },
        aiExecution: { score: aiScore, items: (cfg.aiExecution && cfg.aiExecution.items) || [] },
        competitive: { score: compScore, overall: cfg.competitive.overall, moat: cfg.competitive.moat, factors: cfg.competitive.factors || [] },
        capitalAllocation: { score: capScore, items: (cfg.capitalAllocation && cfg.capitalAllocation.items) || [], verdict: cfg.capitalAllocation ? cfg.capitalAllocation.verdict : "" },
        valuationView: { level: valLevel, note: cfg.valuationView ? cfg.valuationView.note : "" },
        falling: falling,
        dipClass: dipClass,
        decision: { key: decision.key, label: decision.label, thai: decision.thai, tone: decision.tone, why: decisionWhy },
        finalVerdict: {
          answer: answer,
          confidence: { score: confScore, label: confLabel(confScore) },
          factors: {
            thesis: thesisScore,
            megaTrend: megaIn ? megaIn.score : null,
            macro: regimeIn ? regimeIn.score : null,
            technical: techScore != null ? Math.round(techScore) : null,
            valuation: valLevel ? VAL_TH[valLevel] : null
          },
          risks: cfg.risks || [], pmSummary: pm
        },
        whatChanged: cfg.whatChanged || [],
        confidence: { score: confScore, label: confLabel(confScore), parts: confParts },
        explain: { allow: allow, discourage: discourage, up: up, down: down.length ? down : ["ไม่มีปัจจัยฉุดที่ต่ำกว่า 50"] },
        inputs: { technical: tech, megaTrend: megaIn, regime: regimeIn, rates: ratesIn }
      };
    } catch (e) {
      return { available: false, reason: "error", error: String(e && e.message || e) };
    }
  }

  // ---------------------------------------------------------- Lite view (uncovered tickers)
  // Live-plane ONLY: technical + drawdown decomposition + Mega Trend/Macro/rates.
  // Deliberately NO thesis score, NO dip classification verdict, NO decision and
  // NO YES/NO — the engine never judges a company it has no fundamentals for.
  function computeLite(ticker, snapshot, opts) {
    opts = opts || {};
    snapshot = snapshot || {};
    try {
      var T = String(ticker || "").trim().toUpperCase();
      if (!T) return { available: false, reason: "no-ticker", thai: "กรุณาระบุ ticker" };
      var tech = technicalFor(T, snapshot);
      var closes = closesFor(T, snapshot);
      if (!tech && !closes) return { available: false, reason: "no-price-data", thai: "ไม่พบข้อมูลราคา " + T + " ใน snapshot — เพิ่มเข้า list ที่ Action Center แล้วกด Load Latest Data ก่อน" };

      var AP = opts.AP || (typeof window !== "undefined" ? window.AdaptivePosition : null);
      var mega = opts.mega !== undefined ? opts.mega : (AP && AP.compute ? AP.compute(snapshot) : null);
      var megaIn = mega && mega.available ? { score: mega.megaTrend.score, stateLabel: mega.megaTrend.state.label, gateOpen: mega.gate.open } : null;
      var regime = opts.regime !== undefined ? opts.regime : (typeof window !== "undefined" && window.MarketRegime && window.MarketRegime.compute ? window.MarketRegime.compute(snapshot) : null);
      var regimeIn = regime && regime.available !== false && num(regime.score) != null ? { score: Math.round(regime.score), label: regime.regime ? regime.regime.label : "" } : null;
      var rates = mega && mega.available && mega.inputs && mega.inputs.rates ? mega.inputs.rates
        : (AP && AP.rateHeadwind ? AP.rateHeadwind(snapshot.historicalData && snapshot.historicalData["^TNX"] && snapshot.historicalData["^TNX"].closes, null) : null);
      var ratesIn = rates && rates.score != null ? { score: rates.score, severe: !!rates.severe } : null;

      var dd = closes ? drawdownPct(closes, 90) : null;
      var ddAbs = dd != null ? Math.abs(Math.min(dd, 0)) : null;
      var mktC = (snapshot.historicalData && snapshot.historicalData["^GSPC"] && snapshot.historicalData["^GSPC"].closes) || null;
      var ndqC = (snapshot.historicalData && snapshot.historicalData["^IXIC"] && snapshot.historicalData["^IXIC"].closes) || null;
      var mktAbs = mktC ? Math.abs(Math.min(drawdownPct(mktC, 90) || 0, 0)) : null;
      var ndqAbs = ndqC ? Math.abs(Math.min(drawdownPct(ndqC, 90) || 0, 0)) : null;
      var causes = [];
      if (ddAbs != null && ddAbs >= 3) {
        if (mktAbs != null) causes.push({ key: "market", label: "Market-wide", magnitude: round(Math.min(ddAbs, mktAbs), 1), detail: "ตลาดรวม (S&P500) ย่อ " + mktAbs.toFixed(1) + "% จาก high 90 วัน" });
        if (ndqAbs != null && ddAbs > ndqAbs + 1) causes.push({ key: "company", label: "Company-specific", magnitude: round(ddAbs - ndqAbs, 1), detail: "หุ้นย่อลึกกว่า Nasdaq " + (ddAbs - ndqAbs).toFixed(1) + "pp — มีแรงขายเฉพาะตัว (Lite เทียบดัชนีแทนกลุ่ม)" });
        if (ratesIn && (ratesIn.severe || ratesIn.score <= 40)) causes.push({ key: "rates", label: "Interest Rates", magnitude: round(clamp((100 - ratesIn.score) / 12, 1, 8), 1), detail: "ลมต้านดอกเบี้ย" + (ratesIn.severe ? "ระดับ Severe" : "กำลังแรง") + " — กดหุ้น growth ทั้งกระดาน" });
        causes.sort(function (a, b) { return b.magnitude - a.magnitude; });
      }
      return {
        available: true, lite: true, ticker: T, name: T,
        note: "Lite view — ยังไม่มี curated thesis ของ " + T + ": แสดงเฉพาะข้อมูล live และไม่ประเมิน YES/NO เพราะไม่มีข้อมูลพื้นฐาน · เพิ่มตัวเต็ม: สั่ง /thesis-update " + T + " ใน Claude Code",
        falling: { drawdownPct: dd, hasData: closes != null, causes: causes, primary: causes[0] || null, secondary: causes[1] && causes[1].magnitude >= 1 ? causes[1] : null },
        inputs: { technical: tech, megaTrend: megaIn, regime: regimeIn, rates: ratesIn }
      };
    } catch (e) {
      return { available: false, reason: "error", error: String(e && e.message || e) };
    }
  }

  // ---------------------------------------------------------- Business Growth vs Stock Price (5-Year)
  // Answers ONE question: "ราคาหุ้นที่ผ่านมาถูกหนุนด้วยพื้นฐานธุรกิจจริงไหม"
  // CURATED plane: cfg.history (5 fiscal years of revenue/EPS/margin/FCF/FY-end
  // price, approximate, stamped with asOf) · LIVE plane: current price from the
  // snapshot extends the price series to "now". All scores are fixed formulas —
  // no opinion, no prediction, no target price.
  function cagr(first, last, years) {
    if (!(first > 0) || !(last > 0) || !(years > 0)) return null;
    return Math.pow(last / first, 1 / years) - 1;
  }
  function yoyOf(prev, cur) { return prev > 0 && cur != null && isFinite(cur) ? cur / prev - 1 : null; }
  function stdev(arr) {
    var f = (arr || []).filter(function (x) { return Number.isFinite(x); });
    if (f.length < 2) return null;
    var m = f.reduce(function (s, x) { return s + x; }, 0) / f.length;
    return Math.sqrt(f.reduce(function (s, x) { return s + (x - m) * (x - m); }, 0) / f.length);
  }
  function monthsBetweenYm(a, b) {
    var ma = /^(\d{4})-(\d{2})/.exec(String(a || "")), mb = /^(\d{4})-(\d{2})/.exec(String(b || ""));
    if (!ma || !mb) return null;
    return (Number(mb[1]) - Number(ma[1])) * 12 + (Number(mb[2]) - Number(ma[2]));
  }
  // growth (decimal CAGR) → 0-100: 0%→40 · 15%→70 · ≥30%→100 · ติดลบต่ำกว่า 40
  function growthScale(g) { return g == null ? null : Math.round(clamp(40 + g * 200, 0, 100)); }

  function alignLabel(score) {
    if (score >= 80) return { key: "excellent", label: "Excellent Alignment", thai: "ราคากับธุรกิจสอดคล้องกันดีมาก" };
    if (score >= 65) return { key: "good", label: "Good Alignment", thai: "สอดคล้องกันดี" };
    if (score >= 50) return { key: "fair", label: "Fair Alignment", thai: "สอดคล้องพอใช้" };
    return { key: "weak", label: "Weak Alignment", thai: "ราคากับพื้นฐานไม่ค่อยสอดคล้อง" };
  }
  function qualityLabel(score) {
    if (score >= 65) return { key: "strengthening", label: "Strengthening", thai: "คุณภาพการเติบโตแข็งแรงขึ้น", tone: "bull" };
    if (score >= 45) return { key: "stable", label: "Stable", thai: "คุณภาพการเติบโตทรงตัว", tone: "watch" };
    return { key: "weakening", label: "Weakening", thai: "คุณภาพการเติบโตแผ่วลง", tone: "bear" };
  }

  function computeHistory(ticker, snapshot, opts) {
    opts = opts || {};
    snapshot = snapshot || {};
    try {
      var T = String(ticker || "").toUpperCase();
      var data = opts.data || (typeof window !== "undefined" ? window.ThesisData : null);
      var cfg = data && data.companies && data.companies[T];
      if (!cfg) return { available: false, reason: "no-config", thai: "ยังไม่มีข้อมูล thesis ของ " + T };
      var H = cfg.history;
      if (!H || !Array.isArray(H.years) || H.years.length < 5) {
        return { available: false, reason: "no-history", thai: "ยังไม่มีข้อมูลการเงิน 5 ปีของ " + T + " — สั่ง /thesis-update " + T + " ใน Claude Code เพื่อเพิ่มชุดข้อมูล 5 ปี" };
      }
      var Y = H.years.slice(-5).map(function (y) { // ใช้ 5 ปีล่าสุดเสมอ แม้ KB จะสะสมปีเพิ่ม
        return { fy: y.fy, endYm: y.endYm, rev: num(y.revenueB), eps: num(y.epsAdj), margin: num(y.opMarginPct), fcf: num(y.fcfB), price: num(y.priceFYEnd) };
      });
      var n = Y.length, first = Y[0], last = Y[n - 1];
      var spanMonths = monthsBetweenYm(first.endYm, last.endYm);
      var spanYears = spanMonths != null && spanMonths > 0 ? spanMonths / 12 : n - 1;

      // ---- series + YoY ----
      var revYoys = [], epsYoys = [];
      for (var i = 1; i < n; i++) {
        revYoys.push(yoyOf(Y[i - 1].rev, Y[i].rev));
        epsYoys.push(Y[i - 1].eps > 0 && Y[i].eps != null ? Y[i].eps / Y[i - 1].eps - 1 : null);
      }
      var epsTurnaround = first.eps != null && last.eps != null && first.eps <= 0 && last.eps > 0;

      // ---- CAGR ----
      var revCagr = cagr(first.rev, last.rev, spanYears);
      var epsCagr = cagr(first.eps, last.eps, spanYears); // null เมื่อฐานติดลบ (พลิกกำไร)
      var fcfCagr = cagr(first.fcf, last.fcf, spanYears);
      var marginDelta = first.margin != null && last.margin != null ? last.margin - first.margin : null;
      var marginRecent = Y[n - 2].margin != null && last.margin != null ? last.margin - Y[n - 2].margin : null;

      // ---- price: FY-end curated series + live current price extends to "now" ----
      var closes = closesFor(T, snapshot);
      var livePrice = closes && closes.length ? closes[closes.length - 1] : null;
      var priceCagr5FY = cagr(first.price, last.price, spanYears);
      var priceBasis = "fy-end", priceUsed = last.price, elapsedYears = spanYears;
      if (livePrice != null && livePrice > 0) {
        var m0 = /^(\d{4})-(\d{2})/.exec(String(first.endYm || ""));
        if (m0) {
          var t0 = Date.UTC(Number(m0[1]), Number(m0[2]) - 1, 15);
          var nowMs = opts.nowMs != null ? opts.nowMs : Date.now();
          var el = (nowMs - t0) / 31557600000; // ปีแบบ 365.25 วัน
          if (el > 1) { priceBasis = "live"; priceUsed = livePrice; elapsedYears = el; }
        }
      }
      var priceCagr = cagr(first.price, priceUsed, elapsedYears);

      // ---- composite fundamental growth + gap (pp/ปี) ----
      var fundCagr = epsCagr != null && revCagr != null ? 0.6 * epsCagr + 0.4 * revCagr : (revCagr != null ? revCagr : null);
      // ปัดเศษครั้งเดียวตรงนี้ — verdict/cap/การแสดงผลใช้ค่าเดียวกัน ไม่มี off-by-rounding ที่ threshold
      var gapPp = priceCagr != null && fundCagr != null ? round((priceCagr - fundCagr) * 100, 1) : null;

      // ---- Fundamental Alignment Score (0-100) ----
      var epsPart = epsCagr != null ? growthScale(epsCagr) : (epsTurnaround ? 75 : (last.eps != null && last.eps <= 0 ? 15 : null));
      var fcfPos = Y.filter(function (y) { return y.fcf != null && y.fcf > 0; }).length;
      var fcfBonus = fcfCagr != null ? clamp(Math.round(fcfCagr * 100), -30, 30)
        : (last.fcf != null && last.fcf > 0 && first.fcf != null && first.fcf <= 0 ? 20 : (last.fcf != null && last.fcf <= 0 ? -20 : 0));
      var pricePart = gapPp == null ? null
        : Math.round(clamp(100 - (gapPp > 0 ? Math.min(60, gapPp * 3) : Math.min(40, -gapPp * 1.5)), 0, 100));
      var alignParts = [
        { key: "revenueGrowth", label: "Revenue Growth", value: growthScale(revCagr), weight: 20 },
        { key: "epsGrowth", label: "EPS Growth", value: epsPart, weight: 25 },
        { key: "marginTrend", label: "Margin Trend", value: marginDelta != null ? Math.round(clamp(50 + marginDelta * 5, 0, 100)) : null, weight: 15 },
        { key: "cashFlowTrend", label: "Cash Flow Trend", value: Y.some(function (y) { return y.fcf != null; }) ? clamp(fcfPos * 14 + fcfBonus, 0, 100) : null, weight: 15 },
        { key: "priceSupport", label: "Price vs Fundamentals", value: pricePart, weight: 25 }
      ];
      var aw = 0, aa = 0;
      alignParts.forEach(function (p) { if (p.value != null) { aw += p.weight; aa += p.value * p.weight; } });
      var alignScore = aw ? Math.round(aa / aw) : null;
      // ราคานำหน้าพื้นฐานมาก → alignment ห้ามอ่านเป็น Excellent/Good สวนกับ verdict
      if (alignScore != null && gapPp != null) {
        if (gapPp >= 12) alignScore = Math.min(alignScore, 64);
        else if (gapPp >= 4) alignScore = Math.min(alignScore, 79);
      }

      // ---- Growth Quality Score ----
      var posRev = revYoys.filter(function (x) { return x != null && x > 0; }).length;
      var volRev = stdev(revYoys);
      var epsComputable = epsYoys.filter(function (x) { return x != null; });
      var posEps = epsComputable.filter(function (x) { return x > 0; }).length;
      var profitableYears = Y.filter(function (y) { return y.eps != null && y.eps > 0; }).length;
      var fcfMargin = last.fcf != null && last.rev > 0 ? last.fcf / last.rev : null;
      var accRecent = avg([revYoys[2], revYoys[3]]), accBase = avg([revYoys[0], revYoys[1]]);
      var revAccel = accRecent != null && accBase != null ? accRecent - accBase : null;
      var epsAccel = epsComputable.length >= 4 ? avg([epsYoys[2], epsYoys[3]]) - avg([epsYoys[0], epsYoys[1]]) : null;
      var accelScore = revAccel != null ? clamp(Math.round(50 + revAccel * 150), 0, 100) : null;
      if (accelScore != null && epsAccel != null) accelScore = Math.round((accelScore + clamp(Math.round(50 + epsAccel * 150), 0, 100)) / 2);
      var qualityParts = [
        { key: "revenueConsistency", label: "Revenue Consistency", value: clamp(posRev * 20 + (volRev != null ? Math.round(clamp(20 - volRev * 100, 0, 20)) : 10), 0, 100), weight: 20 },
        { key: "epsConsistency", label: "EPS Consistency", value: Y.some(function (y) { return y.eps != null; }) ? clamp(profitableYears * 12 + posEps * 10, 0, 100) : null, weight: 20 },
        { key: "marginExpansion", label: "Margin Expansion", value: marginDelta != null ? Math.round(clamp(50 + marginDelta * 6 + (marginRecent != null ? marginRecent * 4 : 0), 0, 100)) : null, weight: 20 },
        { key: "cashGeneration", label: "Cash Generation", value: fcfMargin != null ? clamp((last.fcf > 0 ? clamp(Math.round(30 + fcfMargin * 150), 0, 75) : 10) + (first.fcf != null ? (last.fcf > first.fcf ? 15 : -10) : 0) + (fcfPos >= 4 ? 10 : 0), 0, 100) : null, weight: 20 },
        { key: "acceleration", label: "Acceleration", value: accelScore, weight: 20 }
      ];
      var qw = 0, qa = 0;
      qualityParts.forEach(function (p) { if (p.value != null) { qw += p.weight; qa += p.value * p.weight; } });
      var qualityScore = qw ? Math.round(qa / qw) : null;
      var qLabel = qualityScore != null ? qualityLabel(qualityScore) : null;

      // ---- Price Attribution: priceCAGR = revenue growth + (margin+share effect) + multiple expansion ----
      var attribution;
      if (epsCagr != null && priceCagr != null && revCagr != null) {
        var totalPp = round(priceCagr * 100, 1);
        var revPp = round(revCagr * 100, 1);
        var marginPp = round((epsCagr - revCagr) * 100, 1);
        var valPp = round(totalPp - revPp - marginPp, 1); // residual — เอกลักษณ์ rev+margin+multiple = ราคา ถือจริงหลังปัดเศษ
        var drivers = [
          { key: "business", label: "การเติบโตของธุรกิจ (รายได้)", pp: revPp },
          { key: "margin", label: "การขยายอัตรากำไร + ผลของจำนวนหุ้น", pp: marginPp },
          { key: "valuation", label: "การขยายตัวของ valuation (multiple)", pp: valPp }
        ];
        // ตัวขับหลัก = ขนาดผลมากสุด (|pp|) — หุ้นที่ราคาลงเพราะ multiple หด ต้องชี้ multiple ไม่ใช่ตัวบวกเล็ก ๆ
        var main = drivers.slice().sort(function (a, b) { return Math.abs(b.pp) - Math.abs(a.pp); })[0];
        attribution = {
          mode: "pp", drivers: drivers, totalPp: totalPp, mainDriver: main,
          note: "แยกผลตอบแทนราคา ~" + totalPp + "%/ปี = รายได้ " + revPp + "pp + อัตรากำไร/จำนวนหุ้น " + marginPp + "pp + multiple " + valPp + "pp — ตัวที่มีผลมากสุดคือ " + main.label + " (" + (main.pp >= 0 ? "+" : "") + main.pp + "pp/ปี)"
        };
      } else {
        attribution = {
          mode: "inflection",
          drivers: [{ key: "business", label: "การเติบโตของธุรกิจ (รายได้)", pp: revCagr != null ? round(revCagr * 100, 1) : null }],
          totalPp: priceCagr != null ? round(priceCagr * 100, 1) : null,
          mainDriver: { key: "inflection", label: "การพลิกจากขาดทุนเป็นกำไร", pp: null },
          note: epsTurnaround
            ? "EPS พลิกจากขาดทุน (" + first.eps + ") เป็นกำไร (" + last.eps + ") ในช่วง 5 ปี — การแยก contribution เป็น %/ปี ไม่มีความหมายเชิงเลข: แรงขับหลักของราคาคือการพลิกกำไร บวกการขยายตัวของ multiple"
            : "ข้อมูล EPS ไม่พอสำหรับแยก contribution เชิงเลข — ใช้การเติบโตรายได้เป็นแกนอ่านแทน"
        };
      }

      // ---- Final Verdict: Is Price Ahead of Fundamentals? ----
      var verdict;
      var deteriorating = qLabel && qLabel.key === "weakening" &&
        ((revYoys[n - 2] != null && revYoys[n - 2] < 0) || (epsYoys[n - 2] != null && epsYoys[n - 2] < 0) ||
          (Y[n - 2].eps != null && last.eps != null && Y[n - 2].eps <= 0 && last.eps < Y[n - 2].eps) || // ขาดทุนลึกขึ้น
          (marginRecent != null && marginRecent <= -3));
      if (deteriorating) verdict = { key: "deteriorating", label: "Fundamentals Deteriorating", thai: "พื้นฐานกำลังแผ่วลง — คำถามไม่ใช่ราคานำหน้าไหม แต่คือธุรกิจยังโตไหม", tone: "bear" };
      else if (gapPp == null) verdict = { key: "insufficient", label: "Not Measurable", thai: "ข้อมูลไม่พอวัด gap เชิงเลข — อ่านจากซีรีส์และตารางประกอบแทน", tone: "watch" };
      else if (gapPp <= -4) verdict = { key: "business-ahead", label: "Business Ahead of Price", thai: "ธุรกิจโตนำหน้าราคา — พื้นฐานหนุนราคาเกินตัวเลขที่เห็น", tone: "bull" };
      else if (gapPp < 4) verdict = { key: "aligned", label: "Well Aligned", thai: "ราคาเดินคู่ไปกับการเติบโตของธุรกิจ", tone: "bull" };
      else if (gapPp < 12) verdict = { key: "slightly-ahead", label: "Price Slightly Ahead", thai: "ราคานำหน้าธุรกิจเล็กน้อย — ต้องให้ธุรกิจโตตามทัน", tone: "watch" };
      else verdict = { key: "significantly-ahead", label: "Price Significantly Ahead", thai: "ราคานำหน้าธุรกิจมาก — ผลตอบแทนส่วนใหญ่มาจาก multiple ไม่ใช่กำไร", tone: "bear" };

      var why = [];
      why.push("ธุรกิจ: รายได้โตเฉลี่ย " + (revCagr != null ? "~" + round(revCagr * 100, 1) + "%/ปี" : "—") +
        (epsCagr != null ? " · EPS ~" + round(epsCagr * 100, 1) + "%/ปี" : (epsTurnaround ? " · EPS พลิกจากขาดทุนเป็นกำไร (นับเป็นแรงหนุนสำคัญ)" : " · EPS ยังวัด CAGR ไม่ได้")));
      why.push("ราคา: ผลตอบแทน " + (priceCagr != null ? "~" + round(priceCagr * 100, 1) + "%/ปี" : "—") +
        (priceBasis === "live" ? " (ถึงราคาล่าสุด)" : " (ถึงสิ้นปีบัญชีล่าสุด)") +
        (gapPp != null ? " → " + (gapPp >= 0 ? "นำหน้า" : "ตามหลัง") + "การเติบโตพื้นฐาน ~" + round(Math.abs(gapPp), 1) + "pp/ปี" : ""));
      if (marginDelta != null) why.push("ความสามารถทำกำไร: operating margin " + first.margin + "% → " + last.margin + "% (" + (marginDelta >= 0 ? "+" : "") + round(marginDelta, 1) + "pp ใน 5 ปี)");
      if (last.fcf != null) why.push("กระแสเงินสด: FCF " + (first.fcf != null ? "~$" + first.fcf + "B → " : "") + "~$" + last.fcf + "B · เป็นบวก " + fcfPos + "/5 ปี");
      if (opts.thesisScore != null) why.push("Investment thesis: คะแนน " + opts.thesisScore + "/100 — ข้อสรุปนี้อ่านคู่กับ thesis เสมอ ไม่แทนกัน");
      why.push("สรุปจากการรวม การเติบโตธุรกิจ + ราคาหุ้น + ความสามารถทำกำไร + กระแสเงินสด — ไม่ตัดสินจาก valuation ratio ตัวเดียว และไม่มีการพยากรณ์/ราคาเป้าหมาย");

      // ---- indexed series for synchronized charts (ฐาน = 100 ที่ปีแรก) ----
      var epsIndexable = Y.every(function (y) { return y.eps != null && y.eps > 0; });
      var indexed = {
        labels: Y.map(function (y) { return y.fy; }),
        revenue: first.rev > 0 ? Y.map(function (y) { return y.rev != null ? round(y.rev / first.rev * 100, 1) : null; }) : null,
        eps: epsIndexable ? Y.map(function (y) { return round(y.eps / first.eps * 100, 1); }) : null,
        price: first.price > 0 ? Y.map(function (y) { return y.price != null ? round(y.price / first.price * 100, 1) : null; }) : null,
        priceNow: priceBasis === "live" && first.price > 0 ? round(livePrice / first.price * 100, 1) : null
      };

      return {
        available: true, ticker: T, name: cfg.name, asOf: cfg.asOf || null,
        fyNote: H.fyNote || "", epsBasis: H.epsBasis || "", notes: H.notes || "",
        years: Y.map(function (y, idx) {
          return {
            fy: y.fy, endYm: y.endYm, revenueB: y.rev, epsAdj: y.eps, opMarginPct: y.margin, fcfB: y.fcf, priceFYEnd: y.price,
            revYoyPct: idx > 0 && revYoys[idx - 1] != null ? round(revYoys[idx - 1] * 100, 1) : null,
            epsYoyPct: idx > 0 && epsYoys[idx - 1] != null ? round(epsYoys[idx - 1] * 100, 1) : null,
            epsTurn: idx > 0 && epsYoys[idx - 1] == null && Y[idx - 1].eps != null && Y[idx - 1].eps <= 0 && y.eps > 0
          };
        }),
        metrics: {
          revCagrPct: revCagr != null ? round(revCagr * 100, 1) : null,
          revYoyPct: revYoys[n - 2] != null ? round(revYoys[n - 2] * 100, 1) : null,
          epsCagrPct: epsCagr != null ? round(epsCagr * 100, 1) : null,
          epsYoyPct: epsYoys[n - 2] != null ? round(epsYoys[n - 2] * 100, 1) : null,
          epsTurnaround: epsTurnaround,
          fcfCagrPct: fcfCagr != null ? round(fcfCagr * 100, 1) : null,
          marginDeltaPp: marginDelta != null ? round(marginDelta, 1) : null,
          priceCagrPct: priceCagr != null ? round(priceCagr * 100, 1) : null,
          priceCagr5FYPct: priceCagr5FY != null ? round(priceCagr5FY * 100, 1) : null,
          priceBasis: priceBasis, currentPrice: livePrice != null ? round(livePrice, 2) : null,
          fundCagrPct: fundCagr != null ? round(fundCagr * 100, 1) : null,
          gapPp: gapPp
        },
        alignment: { score: alignScore, label: alignScore != null ? alignLabel(alignScore) : null, parts: alignParts },
        quality: { score: qualityScore, label: qLabel, parts: qualityParts },
        attribution: attribution,
        verdict: { key: verdict.key, label: verdict.label, thai: verdict.thai, tone: verdict.tone, why: why },
        indexed: indexed,
        disclosure: "ตัวเลข 5 ปีเป็นค่าประมาณ curated จากรายงานประจำปี (ประทับ asOf " + (cfg.asOf || "-") + ") · ราคาปัจจุบันเป็น live จาก snapshot · การแบ่ง contribution เป็นสูตรคณิตศาสตร์ ไม่ใช่การพยากรณ์ และไม่มีราคาเป้าหมาย"
      };
    } catch (e) {
      return { available: false, reason: "error", error: String(e && e.message || e) };
    }
  }

  var ThesisEngine = {
    VERSION: VERSION,
    COMPANIES: COMPANIES,
    STALE_MONTHS: STALE_MONTHS,
    EARNINGS_LEAD_DAYS: EARNINGS_LEAD_DAYS,
    ESTIMATED_GRACE_DAYS: ESTIMATED_GRACE_DAYS,
    staleMonthsOf: staleMonthsOf,
    earningsStatusOf: earningsStatusOf,
    companiesFrom: companiesFrom,
    thesisStatus: thesisStatus,
    drawdownPct: drawdownPct,
    compute: compute,
    computeLite: computeLite,
    computeHistory: computeHistory
  };

  if (typeof window !== "undefined") window.ThesisEngine = ThesisEngine;
  if (typeof module !== "undefined" && module.exports) module.exports = ThesisEngine;
})();
