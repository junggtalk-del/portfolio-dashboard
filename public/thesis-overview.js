(function () {
  "use strict";
  // ============================================================
  // Investment Thesis — OVERVIEW (landing page ของ /thesis)
  // "Morning Investment Briefing": วันนี้ควรดูตัวไหน อ่านอะไรก่อน
  // ตัวไหนธุรกิจแข็งแต่ควรรอ ตัวไหนมีสัญญาณเตือน ตัวไหนต้องทบทวน
  //
  // REUSE ล้วน: ThesisEngine / PMEngine (zone+acc) / ValuationEngine /
  // IntelligenceEngine (health/summary/monetization/expectations) —
  // ไม่มีคะแนนใหม่ · Read Priority มีแค่ HIGH/MEDIUM/LOW จากหลักฐานเดิม
  // ข้อมูลไม่มี = "—" · ไม่ใช่คำแนะนำซื้อขาย
  // ============================================================

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  function num(v) { if (typeof v === "number") return isFinite(v) ? v : null; if (typeof v === "string") { if (v.trim() === "") return null; var x = Number(v); return isFinite(x) ? x : null; } return null; }

  var VE_TH = { ATTRACTIVE: "🟢 Attractive", FAIR: "🔵 Fair", PREMIUM: "🟡 Premium", EXPENSIVE: "🔴 Expensive", INSUFFICIENT_DATA: "—" };
  var PRIO = {
    HIGH: { key: "HIGH", label: "HIGH", cls: "tho-p-high" },
    MEDIUM: { key: "MEDIUM", label: "MEDIUM", cls: "tho-p-med" },
    LOW: { key: "LOW", label: "LOW", cls: "tho-p-low" },
  };
  var HEALTH_RANK = { BROKEN: 0, DETERIORATING: 1, WATCH: 2, INSUFFICIENT: 3, INTACT: 4 };

  // ---------------- model ----------------
  function deps(opts) {
    opts = opts || {};
    var W = typeof window !== "undefined" ? window : {};
    return {
      data: opts.data || W.ThesisData || null,
      TE: opts.TE || W.ThesisEngine || null,
      VE: opts.VE || W.ValuationEngine || null,
      PM: opts.PM || W.PMEngine || null,
      IE: opts.IE || W.IntelligenceEngine || null,
      AIR: opts.AIR || W.AIRotationEngine || null,
    };
  }

  // ลำดับความสำคัญ "ควรอ่านก่อน" — deterministic จากหลักฐานเดิมล้วน (เลขน้อย = สำคัญกว่า)
  function importanceRank(m) {
    if (m.health === "BROKEN") return 0;
    if (m.health === "DETERIORATING") return 1;
    if (m.earnings === "overdue") return 2;             // งบใหม่ออกแล้ว KB ยังไม่อัปเดต
    if (m.summary === "HIGH_QUALITY_DIP") return 3;
    if (m.health === "WATCH" && m.warns >= 2) return 4;
    if (m.summary === "HEALTHY_DIP") return 5;
    if (m.summary === "PRICE_RISK") return 6;
    if (m.health === "WATCH") return 7;
    if (m.earnings === "due-soon") return 8;
    return 9; // MONITOR ปกติ
  }
  function prioOf(rank) { return rank <= 4 ? PRIO.HIGH : rank <= 8 ? PRIO.MEDIUM : PRIO.LOW; }

  // เหตุผลหนึ่งประโยค — template ตายตัวต่อสถานะ ใช้หลักฐานที่มีจริง
  function reasonOf(m) {
    var warnTxt = m.warnLabels.length ? m.warnLabels.join(" · ") : "";
    if (m.health === "BROKEN") return "หลาย pillar พังพร้อมกัน — ทบทวน thesis ก่อนตัดสินใจใด ๆ";
    if (m.health === "DETERIORATING") return "พื้นฐานเสื่อมถอยต่อเนื่อง" + (m.critLabels.length ? " (" + m.critLabels.join(" · ") + ")" : "") + " — ต้องทบทวน";
    if (m.earnings === "overdue") return "งบใหม่ประกาศแล้ว — ข้อมูล thesis ยังไม่ได้อัปเดต (รัน /thesis-update)";
    if (m.summary === "HIGH_QUALITY_DIP") return "ราคาย่อ" + (m.dd != null ? " " + Math.round(Math.abs(m.dd)) + "%" : "") + " ขณะพื้นฐานยังแข็งแรง · valuation " + (VE_TH[m.veClass] || "—");
    if (m.summary === "HEALTHY_DIP") return "ราคาย่อ" + (m.dd != null ? " " + Math.round(Math.abs(m.dd)) + "%" : "") + " แต่หลักฐานธุรกิจปกติทุกตัว";
    if (m.summary === "PRICE_RISK") return "ธุรกิจแข็งแรง แต่ valuation ตึงระดับสุดขั้ว" + (m.vePctl != null ? " (percentile " + m.vePctl + ")" : "");
    if (m.health === "WATCH") return "มีสัญญาณให้จับตา: " + (warnTxt || "ดูหลักฐานใน §16");
    if (m.earnings === "due-soon") return "ใกล้ประกาศงบ — เตรียมอ่านผลรอบใหม่";
    return "ธุรกิจแข็งแรง ราคายังไม่ให้จังหวะ — ติดตามต่อ";
  }

  function computeModel(snapshot, opts) {
    var d = deps(opts);
    if (!d.data || !d.data.companies || !d.TE || !d.IE) return { available: false, reason: "engine ไม่พร้อม" };
    var tickers = Object.keys(d.data.companies).filter(function (t) { return t !== "QQQM"; }); // ETF ไม่ใช่หุ้นรายตัว
    snapshot = snapshot || {};

    // zone/acc จาก PMEngine — คำนวณครั้งเดียวทั้งชุด (candidate ไม่ต้องถือจริง)
    var pmRows = {};
    if (d.PM && typeof d.PM.compute === "function") {
      try {
        var out = d.PM.compute(snapshot, { TE: d.TE, teOpts: { data: d.data },
          positions: tickers.map(function (t) { return { ticker: t, held: false, weightPct: null, tierKey: "A" }; }),
          cashPct: null, indexTicker: "QQQM", indexPct: 50 });
        (out.rows || []).forEach(function (r) { if (r.covered) pmRows[r.ticker] = r; });
      } catch (ePm) { pmRows = {}; }
    }
    var Rrot = null;
    if (d.AIR && typeof d.AIR.compute === "function") { try { Rrot = d.AIR.compute(snapshot); } catch (eR) { Rrot = null; } }

    var rows = [], counts = { hi: 0, watch: 0, wait: 0, review: 0 };
    var mega = null, loadedAt = snapshot.loadedAt || null;
    tickers.forEach(function (t) {
      var cfg = d.data.companies[t];
      var m = { t: t, name: cfg.name || t, thesis: null, health: "INSUFFICIENT", healthIcon: "⚪", healthThai: "",
        summary: "INSUFFICIENT", summaryLabel: "—", summaryWhy: [], monet: null, monetState: "—", expect: "—",
        veClass: null, vePctl: null, vePe: null, veMedian: null, vePrem: null, veFwd: null,
        quad: null, quadIcon: "", quadThai: "", growth: null, revCagr: null, peg: null, pegBasis: null,
        ddCls: null, ddClsThai: "", ddBasis: null, sc: null,
        zone: null, zoneLabel: "—", zoneIcon: "", acc: null, dd: null,
        earnings: null, warns: 0, crits: 0, warnLabels: [], critLabels: [], gated: false, gateWhy: null,
        divKey: "INSUFFICIENT", divIcon: "⚪", divLabel: "—", rdKey: "INSUFFICIENT", rdIcon: "⚪", rdLabel: "—", cgKey: "INSUFFICIENT", cgIcon: "⚪" };
      try {
        var pr = pmRows[t] || null;
        var o = pr && pr.o ? pr.o : d.TE.compute(t, snapshot, { data: d.data });
        if (o && o.available) {
          m.thesis = o.thesis.score;
          m.earnings = o.earnings ? o.earnings.state : null;
          m.dd = o.falling ? num(o.falling.drawdown1yPct) : null;
          if (!mega && o.inputs && o.inputs.megaTrend) mega = o.inputs.megaTrend;
        }
        var X = d.IE.compute(t, snapshot, { data: d.data, TE: d.TE, VE: d.VE, PM: d.PM, o: o && o.available ? o : null, R: Rrot, gsum: pr ? pr.growth : null, zoneKey: pr && pr.zone ? pr.zone.key : null });
        try { if (d.IE.changeLog && typeof window !== "undefined" && window.localStorage) d.IE.changeLog.record(t, X.observation, window.localStorage); } catch (eCl) { /* เต็ม/ปิด */ }
        if (X && X.available) {
          m.health = X.health.state.key; m.healthIcon = X.health.state.icon; m.healthThai = X.health.state.thai;
          m.summary = X.summary.state.key; m.summaryLabel = X.summary.state.label; m.summaryWhy = X.summary.why || [];
          m.monet = X.aiMonetization.overall; m.monetState = X.aiMonetization.state.icon + " " + X.aiMonetization.state.key;
          m.expect = X.expectations.state.key;
          m.warns = X.health.counts.warnings; m.crits = X.health.counts.criticals;
          X.health.pillars.forEach(function (p) {
            if (p.status === "warn") m.warnLabels.push(p.label);
            if (p.status === "crit") m.critLabels.push(p.label);
          });
          if (X.matrixPoint && X.matrixPoint.valuation) {
            var mv = X.matrixPoint.valuation;
            m.veClass = mv.classification; m.vePctl = mv.percentile;
            m.vePe = num(mv.peNow); m.veMedian = num(mv.median); m.vePrem = num(mv.premiumVsMedianPct); m.veFwd = num(mv.forwardPe);
          }
          if (X.matrixPoint && X.matrixPoint.quadrant) { m.quad = X.matrixPoint.quadrant.key; m.quadIcon = X.matrixPoint.quadrant.icon || ""; m.quadThai = X.matrixPoint.quadrant.thai || ""; }
          if (X.matrixPoint) m.growth = num(X.matrixPoint.growthCagrPct);
          if (m.dd == null && X.drawdown && X.drawdown.available) m.dd = X.drawdown.dd1y;
          // ความลึกของรอบย่อ "เทียบรอบย่อในอดีตของหุ้นตัวนั้นเอง" (percentile ของ episodes)
          if (X.drawdown && X.drawdown.available && X.drawdown.classification) {
            m.ddCls = X.drawdown.classification.key;
            m.ddClsThai = X.drawdown.classification.thai || "";
            m.ddBasis = X.drawdown.classificationBasis || null;
          }
          if (X.divergence) { m.divKey = X.divergence.state.key; m.divIcon = X.divergence.state.icon; m.divLabel = X.divergence.state.label; }
          if (X.readiness) { m.rdKey = X.readiness.state.key; m.rdIcon = X.readiness.state.icon; m.rdLabel = X.readiness.state.label; }
          if (X.change) { m.cgKey = X.change.state.key; m.cgIcon = X.change.state.icon; }
        }
        if (pr && pr.zone) {
          var g = d.IE.gateZone ? d.IE.gateZone(pr.zone.key, m.health) : { zoneKey: pr.zone.key, overridden: false };
          m.zone = g.zoneKey; m.gated = !!g.overridden; m.gateWhy = g.why || null;
          var zdef = d.PM && d.PM.ZONES ? d.PM.ZONES[g.zoneKey] : null;
          m.zoneLabel = zdef ? zdef.label : ("Zone " + g.zoneKey);
          m.zoneIcon = zdef ? zdef.icon : "";
          m.acc = pr.accScore;
        }
      } catch (e) { /* ตัวไหนพังให้คงค่า INSUFFICIENT — ไม่ล้มทั้งหน้า */ }
      // รายได้โตต่อปี — จาก computeHistory ตัวเดียวกับที่ matrix ใช้ (ไม่ parse string)
      try {
        var hh = d.TE.computeHistory(t, snapshot, { data: d.data });
        if (hh && hh.available && hh.metrics) m.revCagr = num(hh.metrics.revCagrPct);
      } catch (eH) { /* ไม่มีประวัติ — คงเป็น null */ }
      // PEG = P/E ÷ อัตราโตต่อปี (สูตรมาตรฐาน) · ใช้ forward P/E ถ้ามี ไม่งั้น trailing
      // ประกาศฐานไว้เสมอ เพราะ trailing GAAP บิดแรงกับหุ้นที่กำไรบัญชีต่ำ (เช่น DDOG)
      var pegPe = num(m.veFwd) != null && m.veFwd > 0 ? m.veFwd : (num(m.vePe) != null && m.vePe > 0 ? m.vePe : null);
      if (pegPe != null && num(m.growth) != null && m.growth > 0) {
        m.peg = Math.round((pegPe / m.growth) * 100) / 100;
        m.pegBasis = (num(m.veFwd) != null && m.veFwd > 0) ? "forward" : "trailing";
      }
      m.rank = importanceRank(m);
      m.prio = prioOf(m.rank);
      m.reason = reasonOf(m);
      // นับกลุ่ม (mapping เดียวกับที่ตกลงไว้)
      if (m.summary === "HIGH_QUALITY_DIP" || m.summary === "HEALTHY_DIP") counts.hi++;
      else if (m.summary === "WATCH" || m.summary === "WATCH_DIP") counts.watch++;
      else if (m.summary === "REVIEW_THESIS" || m.summary === "CAUTION") counts.review++;
      else counts.wait++;
      rows.push(m);
    });

    function byImportance(a, b) { return a.rank - b.rank || (b.acc || 0) - (a.acc || 0) || (b.thesis || 0) - (a.thesis || 0) || (a.t < b.t ? -1 : 1); }
    var ranked = rows.slice().sort(byImportance);

    // ---- Top Opportunities: checklist 6 ข้อ "เทียบกับตัวเองล้วน" ----
    // ไม่มีการเปรียบเทียบข้ามหุ้นในคะแนนเลย — แต่ละข้อถามว่าหุ้นตัวนี้ดีกว่า/ถูกกว่าตัวมันเองในอดีตไหม
    // เกณฑ์ทุกข้อมาจาก engine ที่มีอยู่แล้ว ไม่มีเลขที่คิดขึ้นใหม่ (ที่มาอยู่ในตาราง SELF_CHECKS)
    var pool = rows.filter(function (m) { return m.health !== "BROKEN" && m.health !== "DETERIORATING"; });
    pool.forEach(function (m) { m.sc = selfCheck(m); });
    var opportunities = pool.slice().sort(function (a, b) {
      // ผ่านมากกว่ามาก่อน → ข้อมูลครบกว่า → P/E ต่ำกว่าค่ากลางตัวเองมากกว่า → ย่อลึกกว่า → thesis สูงกว่า
      return (b.sc.passed - a.sc.passed) || (b.sc.known - a.sc.known) ||
        ((a.vePrem == null ? 0 : a.vePrem) - (b.vePrem == null ? 0 : b.vePrem)) ||
        ((a.dd == null ? 0 : a.dd) - (b.dd == null ? 0 : b.dd)) ||
        ((b.thesis || 0) - (a.thesis || 0)) || (a.t < b.t ? -1 : 1);
    }).slice(0, 10);
    var watchList = rows.filter(function (m) { return m.health === "WATCH" || m.health === "DETERIORATING" || m.health === "BROKEN"; })
      .sort(function (a, b) { return HEALTH_RANK[a.health] - HEALTH_RANK[b.health] || (b.warns + 2 * b.crits) - (a.warns + 2 * a.crits); });
    var strongWait = rows.filter(function (m) {
      return m.health === "INTACT" && (m.thesis || 0) >= 75 && (m.summary === "MONITOR" || m.summary === "PRICE_RISK");
    }).sort(function (a, b) { return (b.thesis || 0) - (a.thesis || 0); });
    var review = rows.filter(function (m) {
      return m.health === "BROKEN" || m.health === "DETERIORATING" ||
        m.monetState.indexOf("MONETIZATION_RISK") >= 0 || m.monetState.indexOf("WEAK") >= 0 ||
        m.expect === "DETERIORATING" || m.expect === "SHARP_DOWN" ||
        (mega && mega.gateOpen === false);
    }).sort(byImportance);

    return {
      available: true, rows: rows, ranked: ranked, counts: counts, total: tickers.length,
      loadedAt: loadedAt, mega: mega,
      highlights: ranked.slice(0, 4),
      readNext: ranked.slice(0, 5),
      opportunities: opportunities, watchList: watchList, strongWait: strongWait, review: review,
    };
  }

  // ---------------- view helpers ----------------
  // ---- checklist 6 ข้อ: ทุกข้อเทียบกับตัวหุ้นเอง ไม่มีการเทียบข้ามหุ้น ----
  // เกณฑ์ทุกข้ออ้างอิงค่าที่ engine ใช้อยู่แล้ว — คอลัมน์ src คือที่มา (โชว์ใน legend)
  var SELF_CHECKS = [
    { key: "dip", label: "ราคาย่อลึก", head: "ราคาย่อลึก (เทียบรอบย่อของตัวเอง)",
      src: "IntelligenceEngine — percentile ของรอบย่อในอดีตของหุ้นตัวนั้นเอง (DEEP ≥ p50 · EXTREME ≥ p80) ประวัติไม่พอใช้เกณฑ์ทั่วไป 10/20%",
      get: function (m) {
        if (!m.ddCls) return { known: false, txt: "— รอโหลดราคา" };
        var ok = m.ddCls === "DEEP" || m.ddCls === "EXTREME";
        return { known: true, pass: ok, txt: m.ddCls + (m.dd != null ? " · ▼" + Math.abs(m.dd).toFixed(0) + "%" : ""), sub: m.ddClsThai };
      } },
    { key: "pe", label: "P/E ต่ำกว่าค่ากลางตัวเอง", head: "P/E ต่ำกว่าค่ากลางตัวเอง",
      src: "ValuationEngine — เทียบมัธยฐาน P/E 5 ปีของหุ้นตัวนั้นเอง (ติดลบ = ถูกกว่าที่เคยเป็น)",
      get: function (m) {
        if (num(m.vePrem) == null) return { known: false, txt: "— ประวัติ P/E ไม่ถึงเกณฑ์" };
        return { known: true, pass: m.vePrem < 0,
          txt: (m.vePrem < 0 ? "ต่ำกว่า " : "สูงกว่า ") + Math.abs(m.vePrem) + "%",
          sub: num(m.vePctl) != null ? "percentile " + m.vePctl : "" };
      } },
    { key: "fund", label: "พื้นฐานไม่เปลี่ยน", head: "พื้นฐานไม่เปลี่ยน",
      src: "IntelligenceEngine health — INTACT = ไม่มี pillar ไหนเสื่อม · WATCH = มีจุดต้องดู (ไม่ผ่านข้อนี้)",
      get: function (m) {
        if (!m.health || m.health === "INSUFFICIENT") return { known: false, txt: "— ข้อมูลไม่พอ" };
        return { known: true, pass: m.health === "INTACT", txt: m.healthIcon + " " + m.health };
      } },
    { key: "rev", label: "รายได้โตดี", head: "รายได้โตดี",
      src: "ThesisEngine computeHistory — CAGR รายได้ 5 ปี ≥ 15%/ปี (เกณฑ์เดียวกับ matrix.growthHighCagrPct ของ engine)",
      get: function (m) {
        if (num(m.revCagr) == null) return { known: false, txt: "— ไม่มีประวัติรายได้" };
        return { known: true, pass: m.revCagr >= 15, txt: (m.revCagr >= 0 ? "+" : "") + m.revCagr + "%/ปี", sub: "CAGR 5 ปี" };
      } },
    { key: "story", label: "story ยังดี", head: "story ยังดี",
      src: "ThesisEngine thesis score ≥ 75 (เกณฑ์เดียวกับที่หน้านี้ใช้จัดกลุ่ม Strong Business · Wait)",
      get: function (m) {
        if (num(m.thesis) == null) return { known: false, txt: "—" };
        return { known: true, pass: m.thesis >= 75, txt: String(m.thesis), sub: m.summaryLabel || "" };
      } },
    { key: "peg", label: "PEG ดี", head: "PEG ดี",
      src: "P/E ÷ อัตราโตต่อปี (fundCagr = 0.6×EPS + 0.4×Rev ของ engine) · ผ่านเมื่อ < 1 ตามสูตรมาตรฐาน · ใช้ forward P/E ถ้ามี ไม่งั้น trailing",
      get: function (m) {
        if (num(m.peg) == null) return { known: false, txt: "— คำนวณไม่ได้" };
        return { known: true, pass: m.peg < 1, txt: m.peg.toFixed(2),
          sub: (m.pegBasis === "forward" ? "fwd" : "trailing") + " P/E ÷ โต " + m.growth + "%" };
      } },
  ];

  // ประเมิน 6 ข้อ + ประโยคสรุปหนึ่งบรรทัด (ประกอบจากค่าเดียวกับที่ใช้เรียง)
  function selfCheck(m) {
    var cells = [], passed = 0, known = 0, hit = [], miss = [];
    SELF_CHECKS.forEach(function (c) {
      var r = c.get(m);
      r.key = c.key; r.label = c.label;
      if (r.known) { known++; if (r.pass) { passed++; hit.push(c.label); } else miss.push(c.label); }
      cells.push(r);
    });
    var why = "ผ่าน " + passed + "/" + known + " ข้อที่วัดได้" +
      (hit.length ? " — " + hit.join(" · ") : "") +
      (miss.length ? " · ยังไม่ผ่าน: " + miss.join(" · ") : "") +
      (known < SELF_CHECKS.length ? " · วัดไม่ได้ " + (SELF_CHECKS.length - known) + " ข้อ" : "");
    return { cells: cells, passed: passed, known: known, total: SELF_CHECKS.length, why: why };
  }

  function megaTxt(mega) {
    if (!mega || num(mega.score) == null) return "—";
    var st = mega.stateLabel || (mega.gateOpen ? "Strong" : "Weak"); // state จริงจาก AdaptivePosition (64 = Neutral)
    return st + " (" + mega.score + ")" + (mega.gateOpen === false ? " · gate ปิด" : "");
  }
  function veTxt(m) { return m.veClass ? (VE_TH[m.veClass] || m.veClass) : "—"; }
  function zoneTxt(m) { return m.zone ? m.zoneIcon + " " + esc(m.zoneLabel) + (m.gated ? " ⛔" : "") : "—"; }
  function openBtn(t, label) { return '<button type="button" class="tho-open" data-th-ticker="' + esc(t) + '">' + esc(label || "READ THESIS →") + "</button>"; }
  function healthTxt(m) { return m.healthIcon + " " + esc(m.health); }

  // ---------------- render ----------------
  function render(snapshot, opts) {
    var M = computeModel(snapshot, opts);
    if (!M.available) return '<div class="mc-empty"><strong>ยังแสดง Overview ไม่ได้</strong><br>' + esc(M.reason || "") + "</div>";
    var sort = (opts && opts.sort) || null;

    // 1) EXECUTIVE HEADER
    var dateTxt = M.loadedAt ? "ณ ข้อมูล " + esc(String(M.loadedAt).slice(0, 10)) : "ยังไม่โหลดราคาสด — กด Load Latest Data เพื่อให้ครบทุกมุม";
    var h = '<section class="tho-head"><div class="tho-head-main">' +
      "<h1>Investment Thesis Overview</h1>" +
      '<p>AI Stock Intelligence · ' + M.total + " Assets (ไม่รวม QQQM — ETF) · " + dateTxt + "</p></div>" +
      '<div class="tho-counters">' +
      '<span class="tho-c tho-c-hi">🟢 <b>' + M.counts.hi + "</b> High Interest</span>" +
      '<span class="tho-c tho-c-watch">🟡 <b>' + M.counts.watch + "</b> Watch</span>" +
      '<span class="tho-c tho-c-wait">🟠 <b>' + M.counts.wait + "</b> Wait</span>" +
      '<span class="tho-c tho-c-review">🔴 <b>' + M.counts.review + "</b> Thesis Review</span>" +
      "</div>" +
      '<div class="tho-tools"><button type="button" class="tho-open" data-th-cmp-toggle="1">⇄ เทียบหุ้น</button></div>' +
      "</section>";

    // 2) TODAY'S HIGHLIGHTS ⭐ (hero)
    var cards = M.highlights.map(function (m) {
      return '<article class="tho-card tho-card-' + m.prio.key.toLowerCase() + '">' +
        '<div class="tho-card-head"><b class="tho-tk" >' + esc(m.t) + "</b><small>" + esc(m.name) + "</small>" +
        '<span class="tho-score" title="Investment Thesis Score (คนละตัวกับ Accumulation Score)">Thesis ' + (m.thesis == null ? "—" : m.thesis) + '<small>/100</small></span></div>' +
        '<div class="tho-acc">Accumulation Score: <b>' + (m.acc == null ? "—" : m.acc) + "</b> (ตัวเดียวกับหน้า AI Portfolio Manager)</div>" +
        '<div class="tho-card-grid">' +
        "<span>" + healthTxt(m) + "</span>" +
        "<span>Mega Trend: " + esc(megaTxt(M.mega)) + "</span>" +
        "<span>Valuation: " + veTxt(m) + "</span>" +
        "<span>" + zoneTxt(m) + "</span></div>" +
        '<div class="tho-chips">' +
        '<span class="tho-chip">' + m.healthIcon + " " + esc(m.health) + "</span>" +
        '<span class="tho-chip" title="Business vs Price">' + m.divIcon + " " + esc(m.divLabel) + "</span>" +
        '<span class="tho-chip" title="Investment Readiness (ไม่ใช่คำสั่งซื้อขาย)">' + m.rdIcon + " " + esc(m.rdLabel) + "</span></div>" +
        '<p class="tho-reason">"' + esc(m.reason) + '"</p>' +
        openBtn(m.t) + "</article>";
    }).join("");
    h += '<section class="tho-sec tho-hero"><h2>⭐ Today’s Highlights</h2><p>ตัวที่สำคัญที่สุดวันนี้ — ทั้งโอกาสและความเสี่ยง (ไม่ใช่แค่คะแนนสูงสุด)</p><div class="tho-cards">' + cards + "</div></section>";

    // 3) READ NEXT 📖
    var rn = M.readNext.map(function (m, i) {
      return '<div class="tho-row" data-th-ticker="' + esc(m.t) + '" role="button">' +
        '<span class="tho-rank">#' + (i + 1) + "</span>" +
        '<b class="tho-tk">' + esc(m.t) + "</b>" +
        '<span class="tho-prio ' + m.prio.cls + '">' + m.prio.label + "</span>" +
        '<span class="tho-why">"' + esc(m.reason) + '"</span>' +
        '<span class="tho-cta">อ่าน →</span></div>';
    }).join("");
    h += '<section class="tho-sec"><h2>📖 Read Next</h2><p>ลำดับที่ควรอ่านก่อน — จากพัฒนาการที่สำคัญที่สุด (ไม่ใช่การจัดอันดับซื้อขาย)</p>' + rn + "</section>";

    // 4) TOP OPPORTUNITIES 🔥 — checklist 6 ข้อ เทียบตัวเองล้วน · 10 แถว
    var scHead = SELF_CHECKS.map(function (c) { return "<th>" + esc(c.head) + "</th>"; }).join("");
    var scCell = function (r) {
      if (!r.known) return '<td class="tho-sc-na">' + esc(r.txt) + "</td>";
      return '<td class="tho-sc ' + (r.pass ? "is-pass" : "is-no") + '"><b>' + (r.pass ? "✓" : "○") + " " + esc(r.txt) + "</b>" +
        (r.sub ? "<br><small>" + esc(r.sub) + "</small>" : "") + "</td>";
    };
    var opRows = M.opportunities.map(function (m, i) {
      var sc = m.sc || { cells: [], passed: 0, known: 0, total: 6, why: "" };
      var cells = sc.cells.map(scCell).join("");
      var score = '<b class="tho-sc-sum">' + sc.passed + "/" + sc.known + "</b>" +
        (sc.known < sc.total ? "<br><small>วัดไม่ได้ " + (sc.total - sc.known) + "</small>" : "");
      return '<tr data-th-ticker="' + esc(m.t) + '" class="tho-vr-row"><td class="tho-vr-no">' + (i + 1) + "</td>" +
        "<td><b>" + esc(m.t) + "</b><br><small>" + esc(m.name) + "</small></td>" +
        "<td>" + score + "</td>" + cells +
        "<td><b>" + (m.acc == null ? "—" : m.acc) + "</b></td>" +
        "<td>" + zoneTxt(m) + "</td></tr>" +
        '<tr data-th-ticker="' + esc(m.t) + '" class="tho-vr-why"><td></td><td colspan="' + (SELF_CHECKS.length + 3) + '">↳ ' + esc(sc.why) + "</td></tr>";
    }).join("");
    var opStale = M.loadedAt ? "" :
      '<div class="th-muted-box">⚠ ยังไม่โหลดราคาสด — ข้อ "ราคาย่อลึก" วัดไม่ได้ ส่วน P/E และ PEG ใช้ราคาสิ้นไตรมาสจาก KB · กด <b>Load Latest Data</b> แล้วผลจะคำนวณใหม่จากราคาจริง</div>';
    var opLegend = '<details class="tho-legend"><summary>อ่านตารางนี้ยังไง — เกณฑ์แต่ละข้อมาจากไหน</summary>' +
      "<p><b>ทุกข้อเทียบกับตัวหุ้นเอง ไม่มีการเปรียบเทียบกับหุ้นตัวอื่นเลย</b> — ถามว่า \"วันนี้ดีกว่า/ถูกกว่าตัวมันเองในอดีตไหม\" " +
      "คอลัมน์ <b>ผ่าน</b> คือจำนวนข้อที่ผ่านจากจำนวนข้อที่วัดได้ · เรียงจากผ่านมากไปน้อย · เท่ากันดูข้อมูลครบกว่า แล้วดู P/E ที่ต่ำกว่าค่ากลางตัวเองมากกว่า</p><ul>" +
      SELF_CHECKS.map(function (c) { return "<li><b>" + esc(c.head) + "</b> — " + esc(c.src) + "</li>"; }).join("") +
      "<li><b>Acc Score / Zone</b> — มุมมองของ AI Portfolio Manager (คงไว้ให้เทียบ — บางตัวผ่านหลายข้อแต่ PM ให้รอ ให้อ่านประกอบกัน)</li>" +
      "<li>✓ = ผ่าน · ○ = ยังไม่ผ่าน · — = วัดไม่ได้ (ไม่นับเป็นตก แต่ทำให้ตัวหารน้อยลง)</li>" +
      "</ul></details>";
    h += '<section class="tho-sec"><h2>🔥 Top Opportunities</h2><p>10 อันดับ · <b>เทียบกับตัวเองล้วน ไม่เทียบกับหุ้นตัวอื่น</b> — ราคาย่อลึกเทียบรอบย่อของตัวเอง · P/E ต่ำกว่าค่ากลางตัวเอง · พื้นฐานไม่เปลี่ยน · รายได้โตดี · story ยังดี · PEG ดี → เรียงตามจำนวนข้อที่ผ่าน · ตัด DETERIORATING/BROKEN ออก — บริบท ไม่ใช่คำแนะนำซื้อขาย</p>' +
      opStale + opLegend +
      '<div class="th-table-wrap"><table class="th-table tho-table tho-vr"><thead><tr><th>#</th><th>Ticker</th><th>ผ่าน</th>' + scHead + "<th>Acc Score</th><th>Zone</th></tr></thead><tbody>" +
      (opRows || '<tr><td colspan="' + (SELF_CHECKS.length + 4) + '">—</td></tr>') + "</tbody></table></div></section>";

    // 5) THESIS WATCH ⚠️
    var wRows = M.watchList.map(function (m) {
      var flags = m.critLabels.map(function (l) { return '<span class="tho-flag tho-flag-crit">' + esc(l) + " ✗</span>"; })
        .concat(m.warnLabels.map(function (l) { return '<span class="tho-flag">' + esc(l) + " ↓</span>"; })).join(" ");
      return '<div class="tho-watch">' +
        '<div class="tho-watch-head"><b>' + esc(m.t) + "</b> " + healthTxt(m) + "</div>" +
        '<div class="tho-flags">' + (flags || "—") + "</div>" +
        '<p class="tho-reason">"' + esc(m.reason) + '"</p>' + openBtn(m.t, "REVIEW THESIS →") + "</div>";
    }).join("");
    h += '<section class="tho-sec"><h2>⚠️ Thesis Watch</h2>' +
      (wRows || '<div class="tho-allclear">🟢 ไม่พบการเสื่อมถอยของ thesis ที่มีนัย</div>') + "</section>";

    // 6) STRONG BUSINESS · WAIT 💎
    var swRows = M.strongWait.map(function (m) {
      return '<div class="tho-row" data-th-ticker="' + esc(m.t) + '" role="button"><b class="tho-tk">' + esc(m.t) + "</b>" +
        '<span class="tho-prio tho-p-low">Thesis ' + m.thesis + "</span>" +
        '<span class="tho-why">ธุรกิจแข็งแรง แต่' + (m.summary === "PRICE_RISK" ? "ราคาตึง (" + veTxt(m) + ")" : "ยังไม่มีจังหวะย่อที่มีนัย" + (m.veClass ? " · " + veTxt(m) : "")) + " — รอได้</span>" +
        '<span class="tho-cta">อ่าน →</span></div>';
    }).join("");
    h += '<section class="tho-sec"><h2>💎 Strong Business · Wait</h2><p>WAIT ไม่ได้แปลว่าบริษัทแย่ — thesis แข็งแรง แต่จังหวะ/ราคายังไม่เข้าเงื่อนไข</p>' +
      (swRows || '<div class="th-muted">—</div>') + "</section>";

    // 7) THESIS REVIEW 🔴
    var rvRows = M.review.map(function (m) {
      var tags = [];
      if (m.health === "BROKEN" || m.health === "DETERIORATING") tags.push(healthTxt(m));
      if (m.monetState.indexOf("MONETIZATION_RISK") >= 0 || m.monetState.indexOf("WEAK") >= 0) tags.push("AI Monetization " + esc(m.monetState));
      if (m.expect === "DETERIORATING" || m.expect === "SHARP_DOWN") tags.push("Estimates ↓");
      if (M.mega && M.mega.gateOpen === false) tags.push("Mega Trend gate ปิด");
      return '<div class="tho-watch"><div class="tho-watch-head"><b>' + esc(m.t) + "</b> " + tags.join(" · ") + "</div>" +
        '<p class="tho-reason">"' + esc(m.reason) + '"</p>' + openBtn(m.t, "REVIEW THESIS →") + "</div>";
    }).join("");
    h += '<section class="tho-sec"><h2>🔴 Thesis Review</h2><p>ความเสี่ยงที่ต้องสอบลึก — พื้นฐานเสื่อม / monetization / ประมาณการ / Mega Trend</p>' +
      (rvRows || '<div class="tho-allclear">🟢 ไม่มีตัวที่เข้าเงื่อนไขต้องทบทวนตอนนี้</div>') + "</section>";

    // 8) ALL AI ASSETS (ท้ายสุด + sort ได้)
    var cols = [
      { k: "t", label: "Ticker" }, { k: "thesis", label: "Thesis" }, { k: "acc", label: "Acc Score" }, { k: "mega", label: "Mega Trend" },
      { k: "div", label: "Divergence" }, { k: "rd", label: "Readiness" },
      { k: "monet", label: "AI Monetization" }, { k: "ve", label: "Valuation" }, { k: "health", label: "Health" },
      { k: "zone", label: "Zone" }, { k: "prio", label: "Read Priority" },
    ];
    var ZR2 = { A: 0, B: 1, C: 2, D: 3, E: 4 };
    var VR = { ATTRACTIVE: 0, FAIR: 1, PREMIUM: 2, EXPENSIVE: 3 };
    function sortVal(m, k) {
      if (k === "t") return m.t;
      if (k === "thesis") return -(m.thesis == null ? -1 : m.thesis);
      if (k === "acc") return -(m.acc == null ? -1 : m.acc);
      if (k === "div") { var DR = { POSITIVE: 0, ALIGNED: 1, NEGATIVE: 2, THESIS_RISK: 3, INSUFFICIENT: 4 }; return DR[m.divKey] != null ? DR[m.divKey] : 9; }
      if (k === "rd") { var RR = { READY: 0, WATCH_PREPARE: 1, WAIT: 2, THESIS_REVIEW: 3, INSUFFICIENT: 4 }; return RR[m.rdKey] != null ? RR[m.rdKey] : 9; }
      if (k === "mega") return 0; // ตลาดเดียวกันทุกตัว
      if (k === "monet") return -(m.monet == null ? -1 : m.monet);
      if (k === "ve") return m.veClass in VR ? VR[m.veClass] : 9;
      if (k === "health") return HEALTH_RANK[m.health] != null ? HEALTH_RANK[m.health] : 9;
      if (k === "zone") return m.zone in ZR2 ? ZR2[m.zone] : 9;
      if (k === "prio") return m.rank;
      return 0;
    }
    var tableRows = M.rows.slice();
    if (sort && sort.col) {
      tableRows.sort(function (a, b) {
        var av = sortVal(a, sort.col), bv = sortVal(b, sort.col);
        var c = av < bv ? -1 : av > bv ? 1 : (a.t < b.t ? -1 : 1);
        return sort.dir === "desc" ? -c : c;
      });
    } else tableRows.sort(function (a, b) { return a.rank - b.rank || (a.t < b.t ? -1 : 1); });
    var thead = cols.map(function (c) {
      var mark = sort && sort.col === c.k ? (sort.dir === "desc" ? " ▼" : " ▲") : "";
      return '<th><button type="button" class="tho-sort" data-tho-sort="' + c.k + '">' + esc(c.label) + mark + "</button></th>";
    }).join("");
    var tbody = tableRows.map(function (m) {
      return '<tr data-th-ticker="' + esc(m.t) + '"><td><b>' + esc(m.t) + '</b><small class="th-muted"> ' + esc(m.name) + "</small></td>" +
        "<td>" + (m.thesis == null ? "—" : m.thesis) + "</td>" +
        "<td><b>" + (m.acc == null ? "—" : m.acc) + "</b></td>" +
        "<td>" + esc(megaTxt(M.mega)) + "</td>" +
        "<td>" + (m.monet == null ? "—" : m.monet) + "</td>" +
        "<td>" + veTxt(m) + "</td>" +
        "<td>" + healthTxt(m) + "</td>" +
        "<td>" + zoneTxt(m) + "</td>" +
        '<td><span class="tho-prio ' + m.prio.cls + '">' + m.prio.label + "</span></td></tr>";
    }).join("");
    h += '<section class="tho-sec"><h2>📋 All AI Assets</h2><p>ทั้ง universe · คลิกหัวคอลัมน์เพื่อเรียง · คลิกแถวเพื่อเปิด thesis รายตัว</p>' +
      '<div class="th-table-wrap"><table class="th-table tho-table"><thead><tr>' + thead + "</tr></thead><tbody>" + tbody + "</tbody></table></div>" +
      '<div class="th-muted">ที่มา: ThesisEngine · PMEngine (Zone/Acc) · ValuationEngine · IntelligenceEngine — ไม่มีคะแนนใหม่ · ข้อมูลไม่มี = "—" · ไม่ใช่คำแนะนำซื้อขาย</div></section>';

    return '<div class="tho">' + h + "</div>";
  }

  var ThesisOverview = { render: render, computeModel: computeModel, _internal: { importanceRank: importanceRank, prioOf: prioOf, reasonOf: reasonOf } };
  if (typeof window !== "undefined") window.ThesisOverview = ThesisOverview;
  if (typeof module !== "undefined" && module.exports) module.exports = ThesisOverview;
})();
