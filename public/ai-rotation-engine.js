(function () {
  "use strict";

  // ============================================================
  // AI Rotation Engine — the strategic intelligence layer.
  //
  // Answers: where is the AI Supercycle today, where is capital rotating,
  // how is the portfolio positioned, and what rotation the evidence supports.
  //
  // 100% DETERMINISTIC + EXPLAINABLE. No AI API, no price charts, no technical
  // indicators. Intelligence = curated value-chain research (config) + business
  // rules + reused AI Boom Universe scores + real Portfolio Holdings.
  //
  // Reuse: window.AIBoomScoring.calculateFinalScore (quality+momentum-hype-val),
  // AI Boom Universe seed scores, snapshot.portfolioHoldings, MarketRegime.
  // ============================================================

  // ---- 10 AI value-chain layers (curated research). Each company carries the
  //      same 4 sub-scores AI Boom Universe uses (0-10): quality/momentum/hype/val.
  var LAYERS = [
    { key: "model", name: "AI Models", order: 1, thesis: "ผู้สร้างโมเดล frontier — ต้นน้ำสุดของห่วงโซ่ กำหนดดีมานด์ compute ทั้งระบบ",
      companies: [c("META", "Meta Platforms", 8, 8, 6, 5), c("GOOGL", "Alphabet", 9, 7, 6, 5)] },
    { key: "cloud", name: "Cloud / Hyperscaler", order: 2, thesis: "ผู้ลงทุน capex ดาต้าเซนเตอร์ — เป็นกระเป๋าเงินที่ไหลไปทั้งห่วงโซ่",
      companies: [c("MSFT", "Microsoft", 9, 7, 6, 6), c("AMZN", "Amazon", 8, 7, 6, 5), c("ORCL", "Oracle", 7, 8, 6, 6)] },
    { key: "gpu", name: "GPU / Accelerators", order: 3, thesis: "หัวใจ compute ของ AI — ดีมานด์นำทั้งวัฏจักร แต่ต้องระวัง valuation",
      companies: [c("NVDA", "NVIDIA", 10, 8, 9, 8), c("AMD", "AMD", 8, 7, 7, 6)] },
    { key: "networking", name: "Networking", order: 4, thesis: "เชื่อม GPU หลายหมื่นตัวเป็นคลัสเตอร์เดียว — คอขวดของ scale-out",
      companies: [c("AVGO", "Broadcom", 9, 8, 7, 6), c("ANET", "Arista Networks", 8, 7, 6, 6)] },
    { key: "memory", name: "Memory / HBM", order: 5, thesis: "HBM เป็นคอขวดจริงของ AI training — supply ตึง วัฏจักรราคาหนุน",
      companies: [c("MU", "Micron", 8, 8, 6, 5)] },
    { key: "foundry", name: "Foundry", order: 6, thesis: "ผู้ผลิตชิปขั้นสูง — ควบคุมกำลังการผลิตของทั้งอุตสาหกรรม",
      companies: [c("TSM", "TSMC", 9, 8, 6, 5)] },
    { key: "equipment", name: "Semi Equipment", order: 7, thesis: "ขายจอบขายเสียมให้ทุก foundry — ได้ประโยชน์จากการขยายกำลังผลิต",
      companies: [c("ASML", "ASML", 9, 7, 6, 6), c("AMAT", "Applied Materials", 8, 7, 5, 5), c("LRCX", "Lam Research", 8, 6, 5, 5)] },
    { key: "power", name: "Power / Electrical", order: 8, thesis: "ดาต้าเซนเตอร์กินไฟมหาศาล — ระบบไฟ/ระบายความร้อนคือคอขวดรอบถัดไป",
      companies: [c("VRT", "Vertiv", 8, 7, 7, 6), c("ETN", "Eaton", 8, 6, 5, 5)] },
    { key: "utility", name: "Utility / Energy", order: 9, thesis: "แหล่งพลังงานป้อนดาต้าเซนเตอร์ — ดีมานด์ไฟฟ้าโครงสร้างระยะยาว",
      companies: [c("CEG", "Constellation Energy", 8, 7, 6, 5), c("VST", "Vistra", 7, 7, 6, 5)] },
    { key: "enterprise", name: "Enterprise AI", order: 10, thesis: "นำ AI ไปสร้างรายได้จริงในองค์กร — ปลายน้ำที่ยืนยันว่าวัฏจักรยั่งยืน",
      companies: [c("PLTR", "Palantir", 8, 8, 8, 7), c("NOW", "ServiceNow", 8, 6, 5, 5), c("CRM", "Salesforce", 7, 5, 4, 4)] }
  ];
  function c(t, n, q, m, h, v) { return { ticker: t, name: n, q: q, m: m, h: h, v: v }; }

  // ---- 6 AI cycle phases (timeline order). affinity[layer] 0-3 = how strongly
  //      capital favors that layer in the phase. entry[] = deterministic evidence
  //      predicates over layer momentum (0-100) that must hold to be IN the phase.
  var PHASES = [
    { key: "model", name: "Model Race", thesis: "แข่งสร้างโมเดลใหญ่ขึ้นเรื่อย ๆ — ดีมานด์ compute จุดติด",
      affinity: { model: 3, gpu: 2, cloud: 1 },
      entry: [ev("model", "Model momentum ตั้งตัว", "model", 60)] },
    { key: "gpu", name: "GPU Expansion", thesis: "เร่งซื้อ GPU และขยายกำลังผลิตชิปครั้งใหญ่",
      affinity: { gpu: 3, foundry: 3, equipment: 2, memory: 2, networking: 1 },
      entry: [ev("gpu", "GPU rotation แรง", "gpu", 65), ev("foundry", "Foundry เร่งกำลังผลิต", "foundry", 65), ev("equip", "Equipment ตามมา", "equipment", 55)] },
    { key: "inference", name: "Inference Expansion", thesis: "ดีมานด์ย้ายจาก training สู่ inference — cloud/networking/memory ขยายตัว",
      affinity: { cloud: 3, networking: 3, memory: 2, gpu: 2, enterprise: 1 },
      entry: [ev("cloud", "Cloud capex ขยาย", "cloud", 65), ev("net", "Networking scale-out", "networking", 65), ev("mem", "Memory/HBM ตึงตัว", "memory", 65), ev("gpu2", "GPU ยังนำ", "gpu", 60)] },
    { key: "power", name: "Power Expansion", thesis: "ไฟฟ้า/ระบบระบายความร้อนกลายเป็นคอขวด — capital หมุนสู่ power/utility",
      affinity: { power: 3, utility: 3, equipment: 1 },
      entry: [ev("pow", "Power rotation ยืนยัน", "power", 72), ev("util", "Utility ดีมานด์ไฟฟ้าพุ่ง", "utility", 75), ev("equip2", "Electrical equipment เร่ง", "equipment", 65)] },
    { key: "enterprise", name: "Enterprise AI", thesis: "องค์กรนำ AI ไปสร้างรายได้จริงเป็นวงกว้าง",
      affinity: { enterprise: 3, cloud: 2, model: 2 },
      entry: [ev("ent", "Enterprise AI momentum", "enterprise", 70), ev("cloud2", "Cloud ยังแข็ง", "cloud", 65), ev("model2", "Model layer ยั่งยืน", "model", 65)] },
    { key: "agent", name: "AI Agent Economy", thesis: "AI agent ทำงานแทนคนเป็นระบบเศรษฐกิจใหม่",
      affinity: { enterprise: 3, model: 3, cloud: 2 },
      entry: [ev("ent2", "Enterprise AI เป็นวงกว้าง", "enterprise", 75), ev("model3", "Model layer นำ", "model", 70), ev("cloud3", "Cloud รองรับ agent", "cloud", 70)] }
  ];
  function ev(key, label, layer, threshold) { return { key: key, label: label, layer: layer, threshold: threshold }; }

  // broad AI/tech ETFs & funds → spread across the mega-cap layers for exposure.
  var BROAD_AI = { NDX01: 1, QQQM: 1, SPTECH80: 1, XLK: 1, SCBNDQ: 1, KKP_NDQ: 1, ONE_UGG_RA: 1, SCB_GLOBAL_TECH: 1, KKP_G_TECH: 1, B_INNOTECH: 1, "K-GTECHRMF": 1, "K-USXNDQRMF": 1, "^IXIC": 1, "^NDX": 1 };
  var BROAD_SPREAD = ["model", "cloud", "gpu", "networking"];

  // ---- helpers ----
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function round(v, d) { var p = Math.pow(10, d == null ? 0 : d); return Math.round(Number(v) * p) / p; }
  function normTicker(t) { return String(t || "").trim().toUpperCase().replace(/\.BK$/, "").replace(/[^A-Z0-9_^-]/g, ""); }
  function aliasTicker(t) { t = normTicker(t); return t === "GOOG" ? "GOOGL" : t; }

  // reuse AI Boom Universe final-score formula (quality + momentum - hype - valuation)
  function finalScoreRaw(co) {
    if (typeof window !== "undefined" && window.AIBoomScoring && typeof window.AIBoomScoring.calculateFinalScore === "function") {
      return window.AIBoomScoring.calculateFinalScore({ quality_score: co.q, momentum_score: co.m, hype_risk_score: co.h, valuation_risk_score: co.v, mock_signals: {} });
    }
    return co.q + co.m - co.h - co.v; // same formula, headless fallback
  }
  function finalPct(raw) { return round(clamp((raw + 20) / 40 * 100, 0, 100), 0); } // -20..20 → 0..100

  // pull real AI Boom Universe seed scores when a ticker exists there (reuse)
  function seedOverlay(ticker) {
    try {
      var seed = (typeof window !== "undefined" && window.AIBoomUniverseSeed && window.AIBoomUniverseSeed.ai_boom_universe) || [];
      var hit = seed.filter(function (a) { return aliasTicker(a.ticker) === aliasTicker(ticker); })[0];
      if (!hit) return null;
      return { q: hit.quality_score, m: hit.momentum_score, h: hit.hype_risk_score, v: hit.valuation_risk_score, inUniverse: true };
    } catch (e) { return null; }
  }

  // ============================================================ compute
  function compute(snapshot, opts) {
    opts = opts || {};
    snapshot = snapshot || {};
    var generatedAt = opts.now || null;

    // ---- 1. enrich companies + layer aggregates ----
    var holdings = (snapshot.portfolioHoldings && Array.isArray(snapshot.portfolioHoldings.data)) ? snapshot.portfolioHoldings.data : [];
    var holdMap = {}; var totalHeld = 0;
    holdings.forEach(function (h) {
      if (!h || h.isHolding === false) return;
      var key = aliasTicker(h.canonicalSymbol || h.displaySymbol || h.symbol);
      var mv = Number(h.marketValue) || 0;
      if (!key) return;
      holdMap[key] = (holdMap[key] || 0) + mv; totalHeld += mv;
    });

    var ticker2layer = {};
    var layerData = LAYERS.map(function (L) {
      var companies = L.companies.map(function (co) {
        ticker2layer[aliasTicker(co.ticker)] = L.key;
        var ov = seedOverlay(co.ticker);
        var eff = ov ? { q: ov.q, m: ov.m, h: ov.h, v: ov.v } : { q: co.q, m: co.m, h: co.h, v: co.v };
        var raw = finalScoreRaw(eff);
        var owned = holdMap[aliasTicker(co.ticker)] || 0;
        return { ticker: co.ticker, name: co.name, quality: eff.q, momentum: eff.m, hype: eff.h, valuation: eff.v,
          finalScore: round(raw, 1), finalPct: finalPct(raw), inUniverse: !!ov, owned: owned > 0, marketValue: owned };
      });
      var momentum = round(avg(companies.map(function (x) { return x.momentum; })) * 10, 0); // 0-100
      var quality = round(avg(companies.map(function (x) { return x.quality; })) * 10, 0);
      var avgFinal = round(avg(companies.map(function (x) { return x.finalPct; })), 0);
      return { key: L.key, name: L.name, order: L.order, thesis: L.thesis, companies: companies, momentum: momentum, quality: quality, avgFinal: avgFinal };
    });
    var byKey = {}; layerData.forEach(function (l) { byKey[l.key] = l; });
    function mom(k) { return byKey[k] ? byKey[k].momentum : 0; }

    // ---- 2. current + next phase from CONTIGUOUS evidence ----
    var phaseEval = PHASES.map(function (p) {
      var checks = p.entry.map(function (e) { var v = mom(e.layer); return { key: e.key, label: e.label, layer: e.layer, threshold: e.threshold, value: v, met: v >= e.threshold }; });
      var met = checks.filter(function (c2) { return c2.met; }).length;
      return { key: p.key, name: p.name, thesis: p.thesis, affinity: p.affinity, checks: checks, metRatio: checks.length ? met / checks.length : 0 };
    });
    var curIdx = 0;
    for (var i = 0; i < phaseEval.length; i++) { if (phaseEval[i].metRatio >= 0.5) curIdx = i; else break; }
    var current = phaseEval[curIdx];
    var nextIdx = Math.min(curIdx + 1, PHASES.length - 1);
    var nextP = phaseEval[nextIdx];

    // confidence in the current-phase call
    var alignMom = phaseAlignment(current.affinity, byKey) / 100;
    var regimeConf = 0.7;
    try { if (window.MarketRegime && window.MarketRegime.compute) { var R = window.MarketRegime.compute(snapshot); if (R && R.confidence) regimeConf = R.confidence.key === "high" ? 0.85 : R.confidence.key === "low" ? 0.55 : 0.7; } } catch (e) {}
    var confidence = round(100 * clamp(0.5 * current.metRatio + 0.3 * alignMom + 0.2 * regimeConf, 0, 1), 0);

    var phaseWhy = [
      "อยู่ในเฟส “" + current.name + "” เพราะหลักฐานเข้าเงื่อนไข " + Math.round(current.metRatio * 100) + "% และเฟสก่อนหน้าครบทุกข้อ",
      "เฟสถัดไปคาดว่าเป็น “" + nextP.name + "” — ดูเงื่อนไขยืนยันที่ Section 8",
      "Confidence " + confidence + "% = 50% หลักฐานเฟสปัจจุบัน + 30% โมเมนตัมกลุ่มที่เฟสนี้เน้น + 20% Market Regime"
    ];

    // ---- 3. rotation score + direction per layer ----
    var layers = layerData.map(function (l) {
      var curAff = (current.affinity[l.key] || 0) / 3;
      var nextAff = (nextP.affinity[l.key] || 0) / 3;
      var pastAff = pastAffinity(l.key, curIdx);
      var rotationScore = round(clamp(0.45 * l.momentum + 0.35 * nextAff * 100 + 0.20 * curAff * 100, 0, 100), 0);
      var cycleScore = round(clamp(0.55 * curAff * 100 + 0.30 * l.momentum + 0.15 * nextAff * 100, 0, 100), 0);
      var direction, trendLabel;
      if (nextAff > curAff && nextAff > 0) { direction = "in"; trendLabel = "เงินกำลังหมุนเข้า"; }
      else if (pastAff > curAff && pastAff > nextAff) { direction = "out"; trendLabel = "เริ่มหมุนออก"; }
      else if (curAff >= 0.66) { direction = "hot"; trendLabel = "เป็นกลุ่มนำตอนนี้"; }
      else { direction = "stable"; trendLabel = "ทรงตัว"; }
      var top = l.companies.slice().sort(function (a, b) { return b.finalPct - a.finalPct; });
      return Object.assign({}, l, {
        cycleScore: cycleScore, rotationScore: rotationScore, direction: direction, trendLabel: trendLabel,
        curAff: curAff, nextAff: nextAff, topCompanies: top,
        why: [
          "Rotation " + rotationScore + " = 45% momentum(" + l.momentum + ") + 35% แรงดึงเฟสถัดไป(" + Math.round(nextAff * 100) + ") + 20% เฟสปัจจุบัน(" + Math.round(curAff * 100) + ")",
          direction === "in" ? "เฟสถัดไป (" + nextP.name + ") เน้นกลุ่มนี้มากกว่าเฟสปัจจุบัน → เงินกำลังหมุนเข้า"
            : direction === "hot" ? "เฟสปัจจุบันเน้นกลุ่มนี้เป็นหลัก" : direction === "out" ? "เฟสที่ผ่านมาเน้นกลุ่มนี้ ตอนนี้แรงเริ่มลด" : "ยังไม่ใช่กลุ่มที่เฟสไหนเน้นเป็นพิเศษ"
        ]
      });
    });
    var rankedRotation = layers.slice().sort(function (a, b) { return b.rotationScore - a.rotationScore; });

    // ---- 4. suggested allocation from rotation scores (cap + cash) ----
    var CASH = 10, CAP = 20;
    var totalRot = rankedRotation.reduce(function (s, l) { return s + l.rotationScore; }, 0) || 1;
    var alloc = rankedRotation.map(function (l) { return { key: l.key, name: l.name, pct: (100 - CASH) * l.rotationScore / totalRot }; });
    // cap then redistribute
    var overflow = 0; alloc.forEach(function (a) { if (a.pct > CAP) { overflow += a.pct - CAP; a.pct = CAP; } });
    var room = alloc.filter(function (a) { return a.pct < CAP; });
    var roomSum = room.reduce(function (s, a) { return s + a.pct; }, 0) || 1;
    room.forEach(function (a) { a.pct += overflow * a.pct / roomSum; });
    var suggestedByLayer = {}; alloc.forEach(function (a) { suggestedByLayer[a.key] = round(a.pct, 1); });

    // ---- 5. portfolio exposure per layer (holdings → layers) ----
    var layerExposureVal = {}; LAYERS.forEach(function (L) { layerExposureVal[L.key] = 0; });
    var aiValue = 0, nonAiValue = 0, unmatched = [];
    Object.keys(holdMap).forEach(function (tk) {
      var mv = holdMap[tk];
      if (ticker2layer[tk]) { layerExposureVal[ticker2layer[tk]] += mv; aiValue += mv; }
      else if (BROAD_AI[tk] || BROAD_AI[normTicker(tk)]) { BROAD_SPREAD.forEach(function (lk) { layerExposureVal[lk] += mv / BROAD_SPREAD.length; }); aiValue += mv; }
      else { nonAiValue += mv; unmatched.push({ ticker: tk, marketValue: mv }); }
    });
    var exposureByLayer = LAYERS.map(function (L) {
      var mv = layerExposureVal[L.key];
      var curPct = aiValue > 0 ? round(mv / aiValue * 100, 1) : 0;
      var sugPct = suggestedByLayer[L.key] || 0;
      var drift = round(curPct - sugPct, 1);
      var status = drift > 5 ? "over" : drift < -5 ? "under" : "balanced";
      return { key: L.key, name: L.name, currentPct: curPct, suggestedPct: sugPct, driftPp: drift, status: status, marketValue: round(mv, 0) };
    });
    var alignmentScore = round(clamp(100 - exposureByLayer.reduce(function (s, e) { return s + Math.abs(e.driftPp); }, 0) / 2, 0, 100), 0);

    // ---- 5b. join exposure into every layer (Current / Ideal / Difference) ----
    var expByKey = {}; exposureByLayer.forEach(function (e) { expByKey[e.key] = e; });
    var dirByKey = {};
    layers.forEach(function (l) {
      dirByKey[l.key] = l.direction;
      var e = expByKey[l.key];
      l.exposure = { currentPct: e.currentPct, idealPct: e.suggestedPct, diffPp: e.driftPp, status: e.status };
    });

    // ---- 5c. AI Portfolio Score = Cycle Alignment + Rotation Alignment + Diversification ----
    function dirScore(d) { return d === "in" ? 1 : d === "hot" ? 0.6 : d === "out" ? -1 : 0; }
    var cycleAlignment = alignmentScore;
    var avgDir = 0; layers.forEach(function (l) { avgDir += (l.exposure.currentPct / 100) * dirScore(l.direction); });
    var rotationAlignment = aiValue > 0 ? round(clamp((avgDir + 1) / 2 * 100, 0, 100), 0) : 0;
    var shares = layers.map(function (l) { return l.exposure.currentPct / 100; });
    var hhi = shares.reduce(function (s, x) { return s + x * x; }, 0);
    var nL = LAYERS.length, evenHhi = 1 / nL;
    var diversification = aiValue > 0 ? round(clamp((1 - (hhi - evenHhi) / (1 - evenHhi)) * 100, 0, 100), 0) : 0;
    var pScoreVal = aiValue > 0 ? round(0.40 * cycleAlignment + 0.35 * rotationAlignment + 0.25 * diversification, 0) : null;
    var portfolioScore = {
      score: pScoreVal, grade: pScoreVal == null ? "—" : pScoreVal >= 80 ? "A" : pScoreVal >= 65 ? "B" : pScoreVal >= 50 ? "C" : "D",
      components: [
        { key: "cycle", label: "Cycle Alignment", value: cycleAlignment, weight: 40, desc: "สัดส่วนพอร์ตใกล้เป้าที่เหมาะกับวัฏจักรแค่ไหน" },
        { key: "rotation", label: "Rotation Alignment", value: rotationAlignment, weight: 35, desc: "ถือหนักในกลุ่มที่เงินหมุนเข้า (+) หรือหมุนออก (−)" },
        { key: "diversification", label: "Diversification", value: diversification, weight: 25, desc: "กระจายในห่วงโซ่ AI ดีแค่ไหน (ยิ่งกระจุกยิ่งต่ำ)" }
      ],
      why: pScoreVal == null ? ["ยังไม่มี Holdings — เพิ่มในหน้า Portfolio เพื่อคำนวณ AI Portfolio Score"]
        : ["AI Portfolio Score " + pScoreVal + " = 40% Cycle Alignment(" + cycleAlignment + ") + 35% Rotation Alignment(" + rotationAlignment + ") + 25% Diversification(" + diversification + ")",
           "Cycle = ระยะห่างสัดส่วนจริงกับเป้า · Rotation = +คะแนนถ้าถือหนักกลุ่มที่เงินหมุนเข้า −ถ้าหมุนออก · Diversification = จาก HHI (กระจายจริง ~" + (hhi > 0 ? round(1 / hhi, 1) : 0) + " กลุ่ม)"]
    };

    // ---- 5d. AI Concentration Risk (overweight layers) ----
    var maxShare = layers.reduce(function (m, l) { return Math.max(m, l.exposure.currentPct); }, 0);
    var overweightLayers = exposureByLayer.filter(function (e) { return e.status === "over"; })
      .map(function (e) { return { key: e.key, name: e.name, currentPct: e.currentPct, idealPct: e.suggestedPct, excessPp: e.driftPp, direction: dirByKey[e.key] }; })
      .sort(function (a, b) { return b.excessPp - a.excessPp; });
    var concScore = aiValue > 0 ? round(clamp(hhi * 100, 0, 100), 0) : 0;
    var concLevel = (maxShare >= 40 || concScore >= 45) ? { key: "high", label: "สูง" } : (maxShare >= 25 || concScore >= 28) ? { key: "medium", label: "ปานกลาง" } : { key: "low", label: "ต่ำ" };
    var concentration = {
      score: concScore, level: concLevel, maxShare: round(maxShare, 1), effectiveLayers: hhi > 0 ? round(1 / hhi, 1) : 0, overweightLayers: overweightLayers,
      why: aiValue > 0
        ? ["Concentration " + concScore + "/100 (จาก HHI) · กลุ่มใหญ่สุด " + round(maxShare, 0) + "% ของพอร์ต AI · กระจายจริงเทียบเท่า ~" + (hhi > 0 ? round(1 / hhi, 1) : 0) + " กลุ่ม",
           overweightLayers.length ? "Overweight: " + overweightLayers.map(function (o) { return o.name + " (+" + o.excessPp + "pp" + (o.direction === "out" ? ", กำลังหมุนออก" : "") + ")"; }).join(" · ") : "ไม่มีกลุ่มที่ overweight เกินเกณฑ์"]
        : ["ยังไม่มี Holdings"]
    };

    // ---- 5e. Rotation Radar data (capital momentum vs your exposure) ----
    var rotationRadar = {
      axes: layers.slice().sort(function (a, b) { return a.order - b.order; }).map(function (l) { return { key: l.key, name: l.name, momentum: l.momentum, rotation: l.rotationScore, exposure: l.exposure.currentPct, direction: l.direction }; }),
      why: ["เรดาร์เทียบ “แรงเงินหมุน (Rotation)” ของแต่ละกลุ่ม กับ “สัดส่วนพอร์ตคุณ” — ช่องที่ Rotation กว้างแต่พอร์ตแคบ = โอกาสที่ยังไม่ได้ลงน้ำหนัก",
            "เส้นทึบ = Rotation Score (เงินกำลังไป) · เส้นประ = สัดส่วน exposure จริงของคุณ"]
    };

    // ---- 6. suggested rotation (Increase / Maintain / Reduce — never Buy/Sell) ----
    var rotationPlan = exposureByLayer.map(function (e) {
      var L = layers.filter(function (l) { return l.key === e.key; })[0];
      var action = "Maintain", note;
      if (e.status === "under" && (L.direction === "in" || L.direction === "hot")) { action = "Increase Exposure"; note = "ต่ำกว่าสัดส่วนที่เหมาะ " + Math.abs(e.driftPp) + "pp และเงินกำลังหมุนเข้ากลุ่มนี้"; }
      else if (e.status === "over" && L.direction === "out") { action = "Reduce Exposure"; note = "สูงกว่าสัดส่วนที่เหมาะ " + e.driftPp + "pp และแรงเงินเริ่มหมุนออก"; }
      else if (e.status === "under") { action = "Increase Exposure"; note = "ต่ำกว่าสัดส่วนที่เหมาะ " + Math.abs(e.driftPp) + "pp"; }
      else if (e.status === "over") { action = "Reduce Exposure"; note = "สูงกว่าสัดส่วนที่เหมาะ " + e.driftPp + "pp"; }
      else { note = "สัดส่วนใกล้เคียงที่เหมาะแล้ว"; }
      return { key: e.key, name: e.name, action: action, driftPp: e.driftPp, currentPct: e.currentPct, suggestedPct: e.suggestedPct, direction: L.direction, note: note };
    });

    // ---- 6b. actual rotation paths (overweight/rotating-out → underweight/rotating-in) ----
    var S = exposureByLayer.filter(function (e) { return e.driftPp > 3; }).map(function (e) { return { name: e.name, key: e.key, dir: dirByKey[e.key], left: e.driftPp }; })
      .sort(function (a, b) { return (b.dir === "out" ? 1 : 0) - (a.dir === "out" ? 1 : 0) || b.left - a.left; });
    var K = exposureByLayer.filter(function (e) { return e.driftPp < -3; }).map(function (e) { return { name: e.name, key: e.key, dir: dirByKey[e.key], left: -e.driftPp }; })
      .sort(function (a, b) { return ((b.dir === "in" ? 2 : b.dir === "hot" ? 1 : 0) - (a.dir === "in" ? 2 : a.dir === "hot" ? 1 : 0)) || b.left - a.left; });
    var rotationPaths = []; var gi = 0, gj = 0, guard = 0;
    while (gi < S.length && gj < K.length && guard++ < 40) {
      var move = Math.min(S[gi].left, K[gj].left);
      if (move >= 2) rotationPaths.push({ from: S[gi].name, fromKey: S[gi].key, fromDir: S[gi].dir, to: K[gj].name, toKey: K[gj].key, toDir: K[gj].dir, pp: round(move, 1),
        why: ["ทยอยย้ายน้ำหนัก ~" + round(move, 1) + "pp: " + S[gi].name + " (สูงกว่าเป้า" + (S[gi].dir === "out" ? " และเริ่มหมุนออก" : "") + ") → " + K[gj].name + " (ต่ำกว่าเป้า" + (K[gj].dir === "in" ? " และเงินกำลังหมุนเข้า" : "") + ")"] });
      S[gi].left -= move; K[gj].left -= move;
      if (S[gi].left < 2) gi++; if (K[gj].left < 2) gj++;
    }
    rotationPaths = rotationPaths.slice(0, 6);

    // ---- 7. opportunity ranking — best companies in the strongest layers,
    //         PLUS every owned company (so holdings are always visible) ----
    var strongKeys = rankedRotation.slice(0, 5).map(function (l) { return l.key; });
    var opportunities = [];
    layers.forEach(function (l) {
      var strong = strongKeys.indexOf(l.key) >= 0;
      l.companies.forEach(function (co) {
        if (!strong && !co.owned) return; // include strong-layer names + any owned holding
        opportunities.push({ ticker: co.ticker, name: co.name, layer: l.name, layerKey: l.key, finalScore: co.finalScore, finalPct: co.finalPct, quality: co.quality, hype: co.hype, valuation: co.valuation, owned: co.owned, inUniverse: co.inUniverse, rotationScore: l.rotationScore, inStrongLayer: strong, direction: l.direction });
      });
    });
    // owned first, then by opportunity score
    opportunities.sort(function (a, b) { return (b.owned ? 1 : 0) - (a.owned ? 1 : 0) || b.finalPct - a.finalPct || b.rotationScore - a.rotationScore; });
    opportunities = opportunities.slice(0, 14).map(function (o) {
      o.note = o.owned && o.direction === "out" ? "ถืออยู่ในกลุ่มที่เริ่มหมุนออก — พิจารณาทยอยลดน้ำหนัก"
        : o.owned ? "ถืออยู่ · อยู่ในกลุ่มที่เงินยังหมุนเข้า/นำ"
        : o.hype >= 8 ? "คุณภาพสูงแต่ hype/valuation ตึง — ทยอยสะสม"
        : o.finalPct >= 60 ? "คุณภาพเด่น อยู่ในกลุ่มที่เงินหมุนเข้า" : "ติดตามเป็นตัวเลือก";
      return o;
    });
    var ownedCount = opportunities.filter(function (o) { return o.owned; }).length;

    // ---- 8. next-phase confirmation checklist ----
    var nextChecklist = nextP.checks.map(function (c2) {
      return { label: c2.label, status: c2.met ? "met" : "pending", detail: "โมเมนตัมกลุ่ม " + (byKey[c2.layer] ? byKey[c2.layer].name : c2.layer) + " = " + c2.value + " / เกณฑ์ " + c2.threshold };
    });
    var nextMet = nextChecklist.filter(function (x) { return x.status === "met"; }).length;

    // ---- 9. portfolio actions (strategic summary) ----
    var actions = buildActions(rotationPlan, exposureByLayer, current, nextP, alignmentScore, aiValue, nonAiValue, unmatched);

    // ---- timeline ----
    var timeline = PHASES.map(function (p, idx) {
      return { key: p.key, name: p.name, thesis: p.thesis, order: idx + 1, status: idx < curIdx ? "past" : idx === curIdx ? "current" : idx === nextIdx ? "next" : "future" };
    });

    return {
      available: true, generatedAt: generatedAt,
      phase: { current: { key: current.key, name: current.name, thesis: current.thesis }, next: { key: nextP.key, name: nextP.name, thesis: nextP.thesis }, confidence: confidence, evidenceMet: Math.round(current.metRatio * 100), why: phaseWhy },
      timeline: timeline,
      layers: layers,
      rotation: { ranked: rankedRotation.map(function (l) { return { key: l.key, name: l.name, rotationScore: l.rotationScore, direction: l.direction, trendLabel: l.trendLabel, momentum: l.momentum }; }), why: ["เรียงกลุ่มตาม Rotation Score — บอกว่าเงินสถาบันน่าจะหมุนเข้ากลุ่มไหนแรงสุดตอนนี้", "กลุ่มที่ direction = เข้า คือกลุ่มที่เฟสถัดไป (" + nextP.name + ") จะให้ความสำคัญมากขึ้น"] },
      allocation: { suggested: alloc.map(function (a) { return { key: a.key, name: a.name, pct: round(a.pct, 1) }; }).sort(function (a, b) { return b.pct - a.pct; }), cashPct: CASH },
      exposure: { byLayer: exposureByLayer, totalAiValue: round(aiValue, 0), nonAiValue: round(nonAiValue, 0), alignmentScore: alignmentScore, unmatched: unmatched, hasHoldings: totalHeld > 0 },
      rotationPlan: rotationPlan,
      rotationPaths: rotationPaths,
      portfolioScore: portfolioScore,
      concentration: concentration,
      rotationRadar: rotationRadar,
      opportunities: opportunities,
      ownedCount: ownedCount,
      nextPhaseChecklist: { items: nextChecklist, met: nextMet, total: nextChecklist.length, nextPhase: nextP.name },
      actions: actions,
      meta: { layers: LAYERS.length, companies: layerData.reduce(function (s, l) { return s + l.companies.length; }, 0), phase: current.key }
    };
  }

  // ---- sub-helpers ----
  function avg(a) { var f = a.filter(function (x) { return isFinite(x); }); return f.length ? f.reduce(function (s, x) { return s + x; }, 0) / f.length : 0; }
  function phaseAlignment(affinity, byKey) {
    var num = 0, den = 0;
    Object.keys(affinity).forEach(function (k) { var w = affinity[k]; num += w * (byKey[k] ? byKey[k].momentum : 0); den += w; });
    return den ? num / den : 0;
  }
  function pastAffinity(layerKey, curIdx) {
    var best = 0;
    for (var i = 0; i < curIdx; i++) { var a = (PHASES[i].affinity[layerKey] || 0) / 3; if (a > best) best = a; }
    return best;
  }
  function buildActions(plan, exposure, current, nextP, alignmentScore, aiValue, nonAiValue, unmatched) {
    var out = [];
    var inc = plan.filter(function (p) { return p.action === "Increase Exposure"; }).sort(function (a, b) { return a.driftPp - b.driftPp; });
    var red = plan.filter(function (p) { return p.action === "Reduce Exposure"; }).sort(function (a, b) { return b.driftPp - a.driftPp; });
    if (!aiValue) {
      out.push({ tone: "info", title: "ยังไม่มีข้อมูลพอร์ต AI", detail: "เพิ่ม Holdings ในหน้า Portfolio เพื่อให้ระบบเทียบสัดส่วนจริงกับสัดส่วนที่เหมาะกับวัฏจักร AI ปัจจุบัน" });
      return out;
    }
    out.push({ tone: alignmentScore >= 70 ? "good" : alignmentScore >= 50 ? "warn" : "risk", title: "Alignment กับวัฏจักร " + alignmentScore + "/100", detail: "พอร์ต AI ของคุณ" + (alignmentScore >= 70 ? "จัดวางสอดคล้อง" : alignmentScore >= 50 ? "ยังพอใช้ แต่มีบางกลุ่มคลาด" : "คลาดจาก") + "สัดส่วนที่เหมาะกับเฟส " + current.name });
    if (inc.length) out.push({ tone: "warn", title: "กลุ่มที่ควรค่อย ๆ เพิ่ม", detail: inc.slice(0, 3).map(function (p) { return p.name + " (ต่ำกว่าเป้า " + Math.abs(p.driftPp) + "pp" + (p.direction === "in" ? ", เงินกำลังหมุนเข้า" : "") + ")"; }).join(" · ") });
    if (red.length) out.push({ tone: "warn", title: "กลุ่มที่ควรค่อย ๆ ลด", detail: red.slice(0, 3).map(function (p) { return p.name + " (สูงกว่าเป้า " + p.driftPp + "pp)"; }).join(" · ") });
    out.push({ tone: "info", title: "เฟสถัดไป: " + nextP.name, detail: "ถ้าหลักฐานใน Section 8 ครบ วัฏจักรจะเลื่อนสู่ " + nextP.name + " — เตรียมทยอยเพิ่มกลุ่มที่เฟสนั้นเน้นล่วงหน้า" });
    if (nonAiValue > 0 && unmatched.length) out.push({ tone: "info", title: "สินทรัพย์นอกธีม AI", detail: unmatched.length + " รายการไม่ได้อยู่ในห่วงโซ่ AI (" + unmatched.slice(0, 4).map(function (u) { return u.ticker; }).join(", ") + ") — เป็นบริบท ไม่นับใน AI allocation" });
    return out;
  }

  var AIRotationEngine = { compute: compute, LAYERS: LAYERS, PHASES: PHASES };
  if (typeof window !== "undefined") window.AIRotationEngine = AIRotationEngine;
  if (typeof module !== "undefined" && module.exports) module.exports = AIRotationEngine;
})();
