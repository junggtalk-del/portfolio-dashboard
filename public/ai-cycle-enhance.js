(function () {
  "use strict";

  // ============================================================
  // AI Cycle Intelligence — v2 ENHANCEMENT layer (pure, deterministic).
  //
  // Does NOT modify the AI Rotation Engine. It only READS the engine's
  // output object R and derives additional institutional views:
  //   New Capital Allocation · AI Conviction · Flow Map · Phase Duration ·
  //   Business Drivers · Portfolio Impact · Concentration Detail · Strategy.
  //
  // Config below (business drivers, phase history) is curated research data —
  // the same "judgment layer" the rest of the module already uses.
  // ============================================================

  // fundamental reasons capital rotates into each layer (NOT technical analysis)
  var BUSINESS_DRIVERS = {
    model: ["ดีมานด์โมเดล frontier", "การแข่งขันสู่ AGI", "ต้นทุน training พุ่ง"],
    cloud: ["Hyperscaler CapEx", "ดีมานด์ inference บนคลาวด์", "ขยาย region ดาต้าเซนเตอร์"],
    gpu: ["ดีมานด์ AI accelerator", "รอบอัปเกรดชิป (Blackwell/รุ่นถัดไป)", "supply เริ่มตามทัน"],
    networking: ["AI inference traffic พุ่ง", "Hyperscaler CapEx", "Scale-up / scale-out networking", "Ethernet & optical deployment"],
    memory: ["HBM เป็นคอขวดจริง", "supply memory ตึงตัว", "รอบราคาหน่วยความจำขาขึ้น"],
    foundry: ["กำลังผลิต leading-edge ตึง", "ดีมานด์ node ขั้นสูง", "การขยาย fab"],
    equipment: ["การขยาย fab ทั่วโลก", "ดีมานด์เครื่องมือ litho/etch/deposition", "รอบ capex semiconductor"],
    power: ["Data Center expansion", "Grid investment", "AI electricity demand", "ระบบระบายความร้อน/ไฟฟ้า"],
    utility: ["ดีมานด์ไฟฟ้าดาต้าเซนเตอร์", "สัญญาซื้อไฟระยะยาว (PPA)", "พลังงานนิวเคลียร์/หมุนเวียน"],
    enterprise: ["องค์กรนำ AI ไปใช้จริง", "รายได้ AI software", "การมาของ AI agent"]
  };

  // historical average phase durations (curated) + anchor start for the live phase.
  // Labeled "Historical Average Only" in the UI — never a prediction.
  var PHASE_HISTORY = {
    model: { avgDays: 240 },
    gpu: { avgDays: 300 },
    inference: { avgDays: 330, startedAt: "2025-10-15" },
    power: { avgDays: 300 },
    enterprise: { avgDays: 360 },
    agent: { avgDays: 420 }
  };

  // Expanded value-chain roster — 5 related stocks per layer, ranked by
  // AI VALUE-CHAIN RELEVANCE (0-100): how central / pure-play the stock is to
  // THIS layer of the AI value chain. NOT valuation/hype/quality/momentum —
  // purely "how much is this an AI-value-chain play". Curated research data.
  // Display-only: does NOT feed the engine's momentum/phase/rotation.
  // Format: [ticker, name, aiRelevance]  (0-100)
  var VALUE_CHAIN_ROSTER = {
    model: [["GOOGL", "Alphabet (Gemini)", 82], ["META", "Meta (Llama)", 80], ["MSFT", "Microsoft (OpenAI)", 76], ["BIDU", "Baidu (Ernie)", 70], ["AMZN", "Amazon (Anthropic)", 62]],
    cloud: [["CRWV", "CoreWeave (AI neocloud)", 98], ["ORCL", "Oracle Cloud (OCI)", 82], ["MSFT", "Microsoft Azure", 78], ["GOOGL", "Google Cloud", 76], ["AMZN", "Amazon AWS", 74]],
    gpu: [["NVDA", "NVIDIA", 99], ["AMD", "AMD (Instinct)", 82], ["AVGO", "Broadcom (custom AI silicon)", 80], ["MRVL", "Marvell (AI silicon)", 78], ["INTC", "Intel (Gaudi)", 55]],
    networking: [["ANET", "Arista Networks", 88], ["AVGO", "Broadcom (AI networking)", 85], ["MRVL", "Marvell (optical/interconnect)", 82], ["CIEN", "Ciena (optical)", 70], ["CSCO", "Cisco", 55]],
    memory: [["MU", "Micron (HBM)", 88], ["SMCI", "Supermicro (AI servers)", 82], ["WDC", "Western Digital", 60], ["STX", "Seagate", 58], ["SIMO", "Silicon Motion", 55]],
    foundry: [["TSM", "TSMC", 90], ["ASX", "ASE (advanced packaging)", 65], ["GFS", "GlobalFoundries", 62], ["INTC", "Intel Foundry", 58], ["UMC", "United Microelectronics", 55]],
    equipment: [["ASML", "ASML (EUV)", 88], ["AMAT", "Applied Materials", 82], ["LRCX", "Lam Research", 82], ["KLAC", "KLA Corp", 80], ["TER", "Teradyne (AI chip test)", 68]],
    power: [["VRT", "Vertiv (DC power/cooling)", 92], ["GEV", "GE Vernova (grid/power)", 85], ["ETN", "Eaton (electrical)", 78], ["PWR", "Quanta Services", 75], ["HUBB", "Hubbell", 68]],
    utility: [["TLN", "Talen Energy (DC nuclear)", 88], ["CEG", "Constellation Energy", 85], ["VST", "Vistra", 82], ["NEE", "NextEra Energy", 72], ["NRG", "NRG Energy", 68]],
    enterprise: [["PLTR", "Palantir (AI-native)", 90], ["NOW", "ServiceNow (AI workflow)", 78], ["SNOW", "Snowflake (AI data)", 76], ["DDOG", "Datadog (AI observability)", 72], ["CRM", "Salesforce (Agentforce)", 65]]
  };

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function round(v, d) { var p = Math.pow(10, d == null ? 0 : d); return Math.round(Number(v) * p) / p; }
  function layerByKey(R, k) { return (R.layers || []).filter(function (l) { return l.key === k; })[0]; }
  function normTicker(t) { t = String(t || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, ""); return t === "GOOG" ? "GOOGL" : t; }

  // impact score 0-100 (reuse AI Boom Universe formula + seed overlay where present)
  function seedScores(ticker) {
    try {
      var seed = (typeof window !== "undefined" && window.AIBoomUniverseSeed && window.AIBoomUniverseSeed.ai_boom_universe) || [];
      var hit = seed.filter(function (a) { return normTicker(a.ticker) === normTicker(ticker); })[0];
      return hit ? { q: hit.quality_score, m: hit.momentum_score, h: hit.hype_risk_score, v: hit.valuation_risk_score } : null;
    } catch (e) { return null; }
  }
  // AI Value-Chain relevance score (0-100) taken directly from the roster —
  // "how much is this stock an AI-value-chain play", not valuation/hype/quality.
  function impactScore(co) { return round(clamp(Number(co[2]) || 0, 0, 100), 0); }
  // per-layer 5 related stocks, ranked by impact score desc; owned flagged via heldSet
  function valueChainRoster(R, heldSet) {
    heldSet = heldSet || {};
    var out = {};
    Object.keys(VALUE_CHAIN_ROSTER).forEach(function (k) {
      out[k] = VALUE_CHAIN_ROSTER[k].map(function (c) { return { ticker: c[0], name: c[1], score: impactScore(c), owned: !!heldSet[normTicker(c[0])], inUniverse: !!seedScores(c[0]) }; })
        .sort(function (a, b) { return b.score - a.score || (b.owned ? 1 : 0) - (a.owned ? 1 : 0); });
    });
    return out;
  }

  // ---- 1. New Capital Allocation (how NEW money should deploy today) ----
  // Distinct from portfolio rotation: weights strongly toward layers capital is
  // rotating INTO (direction) blended with rotation strength; cash from confidence.
  function newCapital(R) {
    var conf = (R.phase && R.phase.confidence) || 70;
    var cash = clamp(Math.round((100 - conf) / 4 + 3), 5, 18);
    function mult(d) { return d === "in" ? 1.5 : d === "hot" ? 1.1 : d === "out" ? 0.35 : 0.6; }
    var raw = (R.layers || []).map(function (l) { return { key: l.key, name: l.name, w: Math.max(0, l.rotationScore * mult(l.direction)), direction: l.direction }; });
    var tot = raw.reduce(function (s, x) { return s + x.w; }, 0) || 1;
    var alloc = raw.map(function (x) { return { key: x.key, name: x.name, direction: x.direction, pct: (100 - cash) * x.w / tot }; });
    var over = 0; alloc.forEach(function (a) { if (a.pct > 35) { over += a.pct - 35; a.pct = 35; } });
    var room = alloc.filter(function (a) { return a.pct < 35; }); var rs = room.reduce(function (s, a) { return s + a.pct; }, 0) || 1;
    room.forEach(function (a) { a.pct += over * a.pct / rs; });
    alloc.forEach(function (a) { a.pct = round(a.pct, 0); });
    alloc.sort(function (a, b) { return b.pct - a.pct; });
    var items = alloc.filter(function (a) { return a.pct >= 3; });
    var layerSum = items.reduce(function (s, a) { return s + a.pct; }, 0);
    var cashFinal = clamp(100 - layerSum, 3, 40);
    items.push({ key: "cash", name: "เงินสด (Cash)", pct: cashFinal, direction: "cash" });
    var top = items.filter(function (i) { return i.key !== "cash"; }).slice(0, 3);
    return {
      items: items, cashPct: cashFinal,
      why: ["New Capital Allocation = ให้น้ำหนักกลุ่มที่เงินกำลังหมุนเข้า (direction) × Rotation Score แล้ว normalize · เงินสด " + cashFinal + "% มาจาก Confidence " + conf + "% (มั่นใจต่ำ = ถือสดมากขึ้น)",
            "ต่างจาก Portfolio Rotation — อันนี้คือ 'เงินใหม่วันนี้ควรลงตรงไหน' ไม่ใช่การขยับพอร์ตเดิม · เน้น " + top.map(function (t) { return t.name + " " + t.pct + "%"; }).join(", ")]
    };
  }

  // ---- 2. AI Conviction Score per layer (strategic, NOT price momentum) ----
  function conviction(R) {
    return (R.layers || []).map(function (l) {
      var raw = 0.45 * l.rotationScore + 0.30 * l.cycleScore + 0.15 * (l.nextAff || 0) * 100 + 0.10 * (l.direction === "in" ? 100 : l.direction === "hot" ? 75 : l.direction === "out" ? 25 : 45);
      // stretch around the pivot so leaders reach High/Extreme, laggards Weak (strategic spread)
      var v = clamp(round(42 + (raw - 46) * 2.1, 0), 5, 99);
      var label = v >= 90 ? { k: "extreme", t: "Extreme" } : v >= 75 ? { k: "high", t: "High" } : v >= 55 ? { k: "neutral", t: "Neutral" } : { k: "weak", t: "Weak" };
      return { key: l.key, name: l.name, score: v, label: label, direction: l.direction, drivers: (BUSINESS_DRIVERS[l.key] || []).slice(0, 4) };
    }).sort(function (a, b) { return b.score - a.score; });
  }

  // ---- 3. AI Flow Map data (capital rotating across layers, left → right) ----
  function flowMap(R) {
    var conv = conviction(R); var cmap = {}; conv.forEach(function (c) { cmap[c.key] = c; });
    var nodes = (R.layers || []).map(function (l) {
      return { key: l.key, name: l.name, rotationScore: l.rotationScore, direction: l.direction, conviction: cmap[l.key] ? cmap[l.key].score : l.rotationScore,
        cyclePos: (l.nextAff || 0) * 2 + (l.curAff || 0) - (l.direction === "out" ? 0.9 : 0) };
    });
    nodes.sort(function (a, b) { return b.conviction - a.conviction; });
    var pick = nodes.slice(0, 6);
    pick.sort(function (a, b) { return a.cyclePos - b.cyclePos; }); // outgoing (left) → incoming (right)
    return { nodes: pick, why: ["แผนที่การไหลของเงินทุน — เรียงจากกลุ่มที่เงิน 'หมุนออก' (ซ้าย) ไปกลุ่มที่ 'หมุนเข้า' (ขวา) ตามลำดับวัฏจักร", "ความหนาของลูกศร = Rotation Score ของกลุ่มปลายทาง · สีเขียว = หมุนเข้า"] };
  }

  // ---- 4. Current Phase Duration (historical average only — never predict) ----
  function phaseDuration(R, nowIso) {
    var key = R.phase && R.phase.current ? R.phase.current.key : null;
    var h = PHASE_HISTORY[key] || {};
    var now = nowIso ? Date.parse(nowIso) : Date.now();
    var started = h.startedAt ? Date.parse(h.startedAt) : null;
    var elapsed = started != null && isFinite(started) ? Math.max(0, Math.round((now - started) / 86400000)) : null;
    var avg = h.avgDays || null;
    var remaining = (avg != null && elapsed != null) ? Math.round(avg - elapsed) : null;
    var note;
    if (elapsed == null) note = "ยังไม่มีข้อมูลวันเริ่มเฟสนี้";
    else if (remaining != null && remaining < 0) note = "เข้าเฟสมานานกว่าค่าเฉลี่ยในอดีต ~" + Math.abs(remaining) + " วัน — ในอดีตช่วงนี้มักใกล้เปลี่ยนเฟส (ค่าเฉลี่ยเท่านั้น)";
    else note = "อ้างอิงค่าเฉลี่ยในอดีตเท่านั้น (Historical Average Only) ไม่ใช่การพยากรณ์";
    return {
      phaseName: R.phase.current.name, startedAt: h.startedAt || null, elapsedDays: elapsed, avgDays: avg, remainingDays: remaining == null ? null : Math.max(0, remaining), overrun: remaining != null && remaining < 0 ? Math.abs(remaining) : 0, note: note,
      why: ["วันเริ่มเฟสเป็น anchor เชิง research · ค่าเฉลี่ยระยะเวลาเฟสมาจากสถิติในอดีต — ทั้งคู่เป็นข้อมูลอ้างอิง ไม่ใช่การพยากรณ์", "Historical Remaining = ค่าเฉลี่ยในอดีต − จำนวนวันที่ผ่านมา (ถ้าติดลบ = เลยค่าเฉลี่ยแล้ว)"]
    };
  }

  // ---- 5. Portfolio Impact (if no change vs where capital rotates) ----
  function portfolioImpact(R) {
    if (!R.exposure || !R.exposure.hasHoldings) return { available: false, note: "เพิ่ม Holdings เพื่อดูผลกระทบต่อพอร์ต" };
    var over = (R.concentration.overweightLayers || [])[0];
    var incoming = (R.rotation.ranked || []).filter(function (l) { return l.direction === "in"; }).slice(0, 2);
    var underKeys = {}; (R.exposure.byLayer || []).forEach(function (e) { if (e.status === "under") underKeys[e.key] = true; });
    var incomingUnder = incoming.filter(function (l) { return underKeys[l.key]; });
    var path = (R.rotationPaths || [])[0];
    var incNames = (incomingUnder.length ? incomingUnder : incoming).map(function (l) { return l.name; }).join(" และ ");
    return {
      available: true,
      narrative: over ? ("ถ้าไม่ปรับพอร์ต สัดส่วน AI ของคุณจะยิ่งกระจุกใน " + over.name + " (" + over.currentPct + "%) ขณะที่เงินทุนกำลังหมุนเข้า " + (incNames || "กลุ่มอื่น"))
        : ("พอร์ตยังไม่มีกลุ่มที่ overweight ชัดเจน — เงินทุนกำลังหมุนเข้า " + (incNames || "หลายกลุ่ม")),
      currentRisk: over ? { title: "Current Risk", text: "กระจุกใน " + over.name + " " + over.currentPct + "% (เป้า " + over.idealPct + "%)" + (over.direction === "out" ? " ซึ่งเริ่มหมุนออก" : "") } : { title: "Current Risk", text: "การกระจายอยู่ในเกณฑ์ดี" },
      futureOpportunity: { title: "Future Opportunity", text: incNames ? ("เงินกำลังหมุนเข้า " + incNames + (incomingUnder.length ? " ที่คุณยัง underweight" : "")) : "รอสัญญาณการหมุนที่ชัดเจนขึ้น" },
      suggestedAdjustment: { title: "Suggested Adjustment", text: path ? ("ทยอยย้ายน้ำหนัก " + path.from + " → " + path.to + " ~" + path.pp + "pp") : "คงน้ำหนักปัจจุบัน — ยังไม่มีเส้นทางหมุนที่ชัดเจน" },
      why: ["Current Risk มาจาก AI Concentration Risk (กลุ่ม overweight สูงสุด) · Future Opportunity มาจากกลุ่มที่ direction = หมุนเข้า และคุณ underweight · Suggested Adjustment มาจากเส้นทางหมุนอันดับ 1", "เป็นการเทียบ 'ถ้าอยู่เฉย' กับ 'ทิศทางเงินทุน' — ไม่ใช่การพยากรณ์ราคา"]
    };
  }

  // ---- 6. Concentration detail (over / under / missing / HHI / diversification) ----
  function concentrationDetail(R) {
    var c = R.concentration || {};
    var over = (c.overweightLayers || []);
    var under = (R.exposure.byLayer || []).filter(function (e) { return e.status === "under" && e.currentPct >= 1; });
    var missing = (R.exposure.byLayer || []).filter(function (e) { return e.currentPct < 1; });
    var eff = c.effectiveLayers || 0;
    var hhi = eff > 0 ? round(1 / eff, 3) : null;
    var divComp = (R.portfolioScore.components || []).filter(function (x) { return x.key === "diversification"; })[0];
    return {
      available: R.exposure.hasHoldings, score: c.score, level: c.level, hhi: hhi, effectiveLayers: eff,
      diversification: divComp ? divComp.value : null,
      overweight: over, underweight: under, missing: missing, why: c.why
    };
  }

  // ---- 7. Today's AI Strategy (≤6 bullets, evidence + rotation, never predict) ----
  function strategy(R, newCap, dur) {
    var b = [];
    b.push("วัฏจักร AI ปัจจุบันยังเป็น " + R.phase.current.name + " (confidence " + R.phase.confidence + "%)" + (dur && dur.elapsedDays != null ? " · เข้าเฟสมา ~" + dur.elapsedDays + " วัน" : ""));
    var out = (R.rotation.ranked || []).filter(function (l) { return l.direction === "out"; })[0];
    var ins = (R.rotation.ranked || []).filter(function (l) { return l.direction === "in"; }).slice(0, 2);
    b.push("เงินทุนกำลังหมุนจาก " + (out ? out.name : "กลุ่มที่เร่งไปแล้ว") + " ไปยัง " + (ins.length ? ins.map(function (x) { return x.name; }).join(" และ ") : "กลุ่มปลายน้ำ"));
    if (R.exposure.hasHoldings) {
      b.push(R.exposure.alignmentScore >= 65 ? "คงแกนหลัก AI ไว้ — พอร์ตยังสอดคล้องกับวัฏจักรพอสมควร (Alignment " + R.exposure.alignmentScore + ")" : "ทยอย rebalance พอร์ตเข้าหากลุ่มที่เงินหมุนเข้า (Alignment " + R.exposure.alignmentScore + " ยังต่ำ)");
      var paths = (R.rotationPaths || []).slice(0, 2);
      if (paths.length) b.push("เส้นทางหมุนหลักตามหลักฐาน: " + paths.map(function (p) { return p.from + "→" + p.to; }).join(", "));
    } else {
      b.push("ยังไม่มี Holdings — เพิ่มพอร์ตเพื่อประเมิน Alignment และเส้นทางหมุน");
    }
    b.push("เงินใหม่วันนี้: กระจายตาม New Capital Allocation (" + newCap.items.filter(function (i) { return i.key !== "cash"; }).slice(0, 3).map(function (i) { return i.name + " " + i.pct + "%"; }).join(", ") + ")");
    b.push(R.concentration.level && R.concentration.level.key === "high" ? "ความเสี่ยงกระจุกตัวสูง — ให้ความสำคัญกับการกระจายก่อนเพิ่มความเสี่ยง" : "ยังไม่จำเป็นต้องตั้งการ์ดเชิงรับเร่งด่วน");
    return { bullets: b.slice(0, 6), why: ["ทุกข้ออ้างอิงหลักฐานปัจจุบัน (เฟส + Rotation + Exposure + Concentration) และสถิติในอดีต (Phase Duration) — ไม่มีการพยากรณ์ราคา", "New Capital มาจากการ์ด New Capital Allocation · เส้นทางหมุนมาจาก Portfolio Rotation"] };
  }

  var AICycleEnhance = { BUSINESS_DRIVERS: BUSINESS_DRIVERS, VALUE_CHAIN_ROSTER: VALUE_CHAIN_ROSTER, valueChainRoster: valueChainRoster, newCapital: newCapital, conviction: conviction, flowMap: flowMap, phaseDuration: phaseDuration, portfolioImpact: portfolioImpact, concentrationDetail: concentrationDetail, strategy: strategy };
  if (typeof window !== "undefined") window.AICycleEnhance = AICycleEnhance;
  if (typeof module !== "undefined" && module.exports) module.exports = AICycleEnhance;
})();
