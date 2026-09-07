(function () {
  "use strict";
  // ============================================================
  // CATALYST HUNTER — UI (PHASE 4.1)
  //
  // ไฟล์นี้เป็น "ชั้นแสดงผล" ล้วน — อ่านผลจาก engine ที่มีอยู่แล้วมาจัดลำดับและอธิบาย
  // ห้ามคิดตรรกะธุรกิจใหม่ที่นี่:
  //   • ไม่มีคะแนน 0-100 · ไม่มีคะแนนความมั่นใจ · ไม่มีคำชี้นำการซื้อขาย
  //   • ไม่คำนวณซ้ำ: catalyst maturity / financial inflection / value trap /
  //     why fell / market recognition / qualification / lifecycle
  //   • ไม่แต่งข้อมูล: ไม่มีข้อมูล = แสดง UNKNOWN หรือ "Evidence unavailable"
  //
  // สิ่งที่ไฟล์นี้ทำ: จัดลำดับชั้นความสำคัญ · แปลงชื่อฟิลด์ให้อ่านได้ ·
  //                  วางหลักฐานบวก/ลบให้เห็นคู่กัน · เปิดทางไปดูที่มาของหลักฐาน
  //
  // กติกาความหมายที่ UI ต้องรักษา (PART 10):
  //   การจัดหมวด ≠ คำแนะนำ · หลักฐาน ≠ ข้อพิสูจน์ · งบพลิก ≠ catalyst
  //   insider ≠ catalyst · ตลาดรับรู้ ≠ catalyst · ย่อลึก ≠ โอกาส
  //   UNKNOWN ≠ ปลอดภัย · C4 ≠ การันตีว่าธุรกิจเปลี่ยน · re-rating ≠ พยากรณ์ราคา
  // ============================================================

  var ROOT_ID = "chRoot";
  var CACHE_KEY = "catalystScanCache_v2";
  var CACHE_TTL_MIN = 120;
  var BATCH = 24;

  var state = {
    rows: [], bench: null, loading: false, progress: null, universe: "THAI_ALL",
    error: null, scannedAt: null, failed: [], evidenceMeta: null, universeMeta: null,
    // ตัวกรอง/เรียง — ใช้เฉพาะฟิลด์ที่มีอยู่จริง ไม่มีคะแนนซ่อน
    filter: { status: null, maturity: null, financial: null, recognition: null, trap: null, lifecycle: null, q: "" },
    sort: { key: "priority", dir: 1 },
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }
  function el() { return document.getElementById(ROOT_ID); }
  function clip(t, n) { t = String(t == null ? "" : t); return t.length > n ? t.slice(0, n - 1) + "…" : t; }
  function pct(v) { return v == null ? "—" : (v > 0 ? "+" : "") + v + "%"; }
  function pp(v) { return v == null ? "—" : (v > 0 ? "+" : "") + v + "pp"; }
  function na(v) { return v == null || v === "" ? "—" : v; }

  // ตัวเลขเงิน — ย่อหน่วยให้อ่านได้ ไม่ปัดจนความหมายเปลี่ยน
  function money(v) {
    if (v == null || !isFinite(v)) return "—";
    var a = Math.abs(v), s = v < 0 ? "-" : "";
    if (a >= 1e9) return s + "฿" + (a / 1e9).toFixed(2) + "bn";
    if (a >= 1e6) return s + "฿" + (a / 1e6).toFixed(1) + "M";
    if (a >= 1e3) return s + "฿" + (a / 1e3).toFixed(0) + "k";
    return s + "฿" + a.toFixed(0);
  }
  function perShare(v) {
    if (v == null || !isFinite(v)) return "—";
    return (v < 0 ? "-" : "") + Math.abs(v).toFixed(2);
  }

  function urlTicker() {
    try {
      var m = /[?&]ticker=([A-Za-z0-9.^%-]{1,16})/.exec(window.location.search || "");
      return m ? decodeURIComponent(m[1]).toUpperCase() : null;
    } catch (e) { return null; }
  }
  function pushUrl(qs) {
    try { if (window.history && window.history.pushState) window.history.pushState({}, "", qs); } catch (e) {}
  }

  function CE() { return window.CatalystEngine; }
  function CQ() { return window.CatalystQualification; }
  function KB() { return (window.CatalystData && window.CatalystData.companies) || {}; }

  // ---------- cache ----------
  function readCache() {
    try {
      var raw = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (!raw || !raw.at || !Array.isArray(raw.items) || !raw.items.length) return null;
      if ((Date.now() - raw.at) / 60000 > CACHE_TTL_MIN) return null;
      return raw;
    } catch (e) { return null; }
  }
  function writeCache(items, bench, failed, meta) {
    try {
      var slim = items.map(function (i) {
        return { ticker: i.ticker, name: i.name, market: i.market, universe: i.universe,
          closes: i.closes.slice(-CE().CONFIG.bars.year - 20), dates: i.dates.slice(-CE().CONFIG.bars.year - 20),
          volumes: (i.volumes || []).slice(-CE().CONFIG.bars.year - 20),
          fullBars: i.bars, source: i.source, sourceType: i.sourceType, range: i.range,
          dd: i.dd, evidence: i.evidence || null };
      });
      localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), items: slim,
        bench: bench ? bench.slice(-300) : null, failed: failed || [],
        universeMeta: (meta && meta.universeMeta) || null, evidenceMeta: (meta && meta.evidenceMeta) || null }));
    } catch (e) { /* เต็ม — ข้ามได้ */ }
  }

  function analyzeItem(item, bench) {
    var kb = KB()[item.ticker] || null;
    var facts = { ticker: item.ticker, name: item.name, market: item.market,
      closes: item.closes, dates: item.dates, volumes: item.volumes,
      benchCloses: bench, benchSymbol: "^SET.BK", source: item.source };
    var r = CE().analyze(facts, kb, item.evidence || null);
    if (item.dd) r.drawdown = item.dd;
    r.universe = item.universe;
    r.sourceType = item.sourceType;
    r.range = item.range;
    return r;
  }

  async function scanAll(force) {
    if (state.loading) return;
    state.loading = true; state.error = null;
    if (!force) {
      var c = readCache();
      if (c) {
        state.bench = c.bench;
        state.rows = c.items.map(function (i) { return analyzeItem(i, c.bench); });
        state.failed = c.failed || [];
        if (c.universeMeta) state.universeMeta = c.universeMeta;
        if (c.evidenceMeta) state.evidenceMeta = c.evidenceMeta;
        state.scannedAt = new Date(c.at).toISOString();
        state.loading = false; render();
        return;
      }
    }
    var items = [], failed = [], bench = null, offset = 0, total = null;
    try {
      while (true) {
        state.progress = { done: offset, total: total };
        render();
        var res = await fetch("/api/catalyst-scan?universe=" + encodeURIComponent(state.universe) +
          "&offset=" + offset + "&limit=" + BATCH + "&_ts=" + Date.now(), { cache: "no-store" });
        if (!res.ok) throw new Error("สแกนไม่สำเร็จ (HTTP " + res.status + ")");
        var j = await res.json();
        total = j.total;
        if (j.evidenceMeta) state.evidenceMeta = j.evidenceMeta;
        if (j.universeMeta) state.universeMeta = j.universeMeta;
        if (!bench && j.benchmark && j.benchmark.available) bench = j.benchmark.closes;
        (j.items || []).forEach(function (i) {
          i.dd = CE()._internal.computeDrawdown(i.closes, i.dates);
          items.push(i);
        });
        (j.failed || []).forEach(function (f) { failed.push(f); });
        if (j.done || j.nextOffset == null) break;
        offset = j.nextOffset;
      }
      state.bench = bench;
      state.rows = items.map(function (i) { return analyzeItem(i, bench); });
      state.failed = failed;
      state.scannedAt = new Date().toISOString();
      writeCache(items, bench, failed,
        { universeMeta: state.universeMeta, evidenceMeta: state.evidenceMeta });
    } catch (e) {
      state.error = String((e && e.message) || e);
    }
    state.progress = null; state.loading = false; render();
  }

  // ============================================================
  // ตัวช่วยอ่านค่าจากผล engine (แปลงชื่อฟิลด์ ไม่ตัดสินใหม่)
  // ============================================================
  function Qof(r) { return r && r.qualification ? r.qualification : null; }
  function statusKey(r) { var q = Qof(r); return q ? q.state.key : (r.state ? r.state.key : "—"); }
  function statusLabel(r) { var q = Qof(r); return q ? q.state.label : (r.state ? r.state.label : "—"); }
  function prio(r) { var q = Qof(r); return q ? q.priority : 99; }
  function ddPct(r) { return r.drawdown && r.drawdown.available ? r.drawdown.drawdown52wPct : null; }
  function finState(r) {
    return r.financialInflection && r.financialInflection.available
      ? r.financialInflection.state.key : "FINANCIAL_EVIDENCE_UNAVAILABLE";
  }
  function finShort(r) {
    return { NO_INFLECTION: "NO", EARLY_INFLECTION: "EARLY", CONFIRMED_INFLECTION: "CONFIRMED",
      STRONG_INFLECTION: "STRONG", FINANCIAL_EVIDENCE_UNAVAILABLE: "UNAVAILABLE" }[finState(r)] || finState(r);
  }
  function matShort(r) {
    var k = r.catalyst && r.catalyst.maturity ? r.catalyst.maturity.key : "NONE";
    var m = k.match(/^C(\d)/);
    if (m) return "C" + m[1];
    var av = r.catalyst && r.catalyst.availability ? r.catalyst.availability.key : "";
    return av === "CATALYST_UNAVAILABLE" ? "UNAVAIL" : (av === "NO_CATALYST" ? "NONE" : "—");
  }
  // PHASE 5 — จำนวนหลักฐานแยกตามระนาบ (engine ส่งมาให้แล้ว)
  //   ระนาบธุรกิจ = เหตุการณ์ที่ทำให้ธุรกิจเปลี่ยน · ระนาบงบ = ผลลัพธ์ที่ปรากฏในงบ
  function bizCount(r) {
    var c = r.catalyst;
    if (!c) return 0;
    return typeof c.businessEvidenceCount === "number" ? c.businessEvidenceCount : (c.evidenceCount || 0);
  }
  function finEvCount(r) {
    var c = r.catalyst;
    if (c && typeof c.financialEvidenceCount === "number") return c.financialEvidenceCount;
    return ((r.story && r.story.financialEvidence) || []).length;
  }
  // งบฟื้นแต่ยังไม่พบเหตุการณ์เชิงธุรกิจ — สถานะที่ต้องอธิบายให้ตรง ไม่ใช่เรียกว่า catalyst
  //
  // ต้องมาจากผลของ engine เท่านั้น: สถานะหลักเป็น FUNDAMENTAL_RECOVERY หรือ engine ติดธงมาให้
  // ห้ามให้ UI ตัดสินเองจากระดับงบ (เคยใช้ state.n >= 1 ซึ่งเป็นเส้นตัด enum ภายในของ engine
  // ผลคือหุ้น VALUE_TRAP_RISK ที่ engine ไม่ได้ติดธง ก็ขึ้นกล่อง "FUNDAMENTAL RECOVERY"
  // ใต้ป้าย VALUE TRAP RISK — เป็นการพูดแทน engine และทำให้คำเตือน trap อ่อนลง)
  function isRecoveryOnly(r) {
    if (bizCount(r) > 0) return false;
    return statusKey(r) === "FUNDAMENTAL_RECOVERY" || hasRecoveryFlag(r);
  }
  // ธงเสริมจาก engine — สถานะหลักตอบคำถามหนึ่ง ธงตอบอีกคำถาม สองอย่างอยู่ร่วมกันได้
  //   สถานะหลัก UNEXPLAINED_MARKET_MOVE = "มีเหตุการณ์ธุรกิจอธิบายการขยับของราคาไหม"
  //   ธง FUNDAMENTAL_RECOVERY            = "ตัวเลขงบกำลังดีขึ้นไหม"
  function flagsOf(r) { var q = Qof(r); return (q && q.flags) || []; }
  function hasRecoveryFlag(r) { return flagsOf(r).indexOf("FUNDAMENTAL_RECOVERY") >= 0; }
  function trapKey(r) { return r.valueTrap && r.valueTrap.risk ? r.valueTrap.risk.key : "UNKNOWN"; }
  function recogKey(r) { return r.recognition && r.recognition.state ? r.recognition.state.key : "UNKNOWN"; }
  function rs3m(r) { return r.recognition && r.recognition.metrics ? r.recognition.metrics.relStrength3mPp : null; }

  // ---------- value trap: จำนวน "สัญญาณ" ไม่ใช่คะแนน ----------
  // มาจาก engine ตรง ๆ (detail.signalCount หรือความยาว signals) — ถ้าไม่มีก็ไม่แต่งขึ้น
  function trapCount(r) {
    var vt = r.valueTrap || {};
    if (vt.detail && vt.detail.signalCount != null) return vt.detail.signalCount;
    if (vt.signals) return vt.signals.length;
    return null;
  }
  function sigUnit(n) { return n === 1 ? " signal" : " signals"; }
  // UNKNOWN ไม่มีจำนวนสัญญาณ (ข้อมูลไม่พอจะนับ) — ห้ามใส่ 0 ให้ดูเหมือนปลอดภัย
  // ในตารางย่อเหลือ "· N" แต่ต้องมี title กำกับว่าเป็นจำนวนสัญญาณ ไม่ใช่คะแนน
  function trapPill(r, compact) {
    var k = trapKey(r), n = trapCount(r);
    if (k === "UNKNOWN" || n == null) {
      return '<span class="ch-trap ch-tone-grey" title="' +
        esc("UNKNOWN — ข้อมูลงบไม่พอสรุป ไม่ได้แปลว่าปลอดภัย") + '"><b>UNKNOWN</b></span>';
    }
    return '<span class="ch-trap ch-tone-' + trapTone(k) + '" title="' +
      esc(k + " · " + n + sigUnit(n) + " — จำนวนสัญญาณเสื่อมที่ตรวจพบ ไม่ใช่คะแนน") + '"><b>' +
      esc(k) + "</b>" + '<span class="ch-sigcount">· ' + n + (compact ? "" : sigUnit(n)) +
      "</span></span>";
  }
  function trapPlain(r) {
    var k = trapKey(r), n = trapCount(r);
    if (k === "UNKNOWN" || n == null) return "UNKNOWN";
    return k + " · " + n + sigUnit(n);
  }

  // ---------- why fell: ป้ายกำกับสั้น + คำอธิบายเต็มไว้ใน tooltip ----------
  var WHY_BADGE = {
    FUNDAMENTAL_DETERIORATION_EVIDENCE: "FUNDAMENTAL",
    KNOWN_EVENT_EVIDENCE: "KNOWN EVENT",
    MARKET_WIDE_DECLINE: "MARKET-WIDE",
    RELATIVE_UNDERPERFORMANCE: "RELATIVE",
    UNKNOWN: "UNKNOWN",
  };
  function whyKey(r) { return (r.whyFell && r.whyFell.category) || "UNKNOWN"; }
  function whyBadgeText(r) { var k = whyKey(r); return WHY_BADGE[k] || k; }
  function whyTone(k) {
    return { FUNDAMENTAL_DETERIORATION_EVIDENCE: "red", KNOWN_EVENT_EVIDENCE: "orange",
      MARKET_WIDE_DECLINE: "blue", RELATIVE_UNDERPERFORMANCE: "amber", UNKNOWN: "grey" }[k] || "grey";
  }
  function whyTip(r) {
    var wf = r.whyFell || {};
    var parts = [whyKey(r)];
    if (wf.thai) parts.push(wf.thai);
    (wf.evidence || []).slice(0, 3).forEach(function (e) { parts.push("• " + e); });
    if (wf.inferredFromPriceOnly) parts.push("(มาจากการเทียบราคากับดัชนีเท่านั้น)");
    return parts.join("\n");
  }

  // ---------- หลักฐานบวก/ลบ: อ่านจากผลที่ engine จัดหมวดไว้แล้ว ----------
  var FIN_LABEL = { REVENUE_INFLECTION: "รายได้", EPS_INFLECTION: "กำไรต่อหุ้น",
    MARGIN_INFLECTION: "มาร์จิ้น", FCF_INFLECTION: "กระแสเงินสดอิสระ", DEBT_IMPROVEMENT: "ภาระหนี้" };

  // ลำดับใช้ฟิลด์ของ engine เท่านั้น ไม่ตั้งลำดับความสำคัญเองด้วยมือ:
  //   1) หลักฐาน catalyst จากระนาบ story — มีระดับความแข็ง C0-C4 กำกับมาชัด เรียงตามระดับแล้วตามวันที่
  //   2) รายการงบที่ engine จัดว่าพลิกแล้ว — เรียงตามลำดับสถานะ (state.n) ที่ engine ให้
  //   3) สัญญาณที่ดีขึ้นจากชั้น value trap
  //   4) insider — engine ประกาศเองว่าเป็นหลักฐานสนับสนุน จึงอยู่ท้ายเสมอ
  // storyLimit: การ์ดบน Radar ตัดเหลือไม่กี่ชิ้น · หน้า Detail ต้องได้ครบ (ส่ง null)
  // เลขที่เอกสารจากลิงก์ของ SET — ใช้แยกเอกสารที่พาดหัวขึ้นต้นเหมือนกัน
  function docRef(url) {
    var m = /[?&]id=(d+)/.exec(String(url || ""));
    return m ? "#" + m[1] : "";
  }
  function cLevel(strength) {
    var m = /^C(\d)/.exec(String(strength || ""));
    return m ? Number(m[1]) : -1;
  }
  function positiveEvidence(r, storyLimit, titleLen) {
    var out = [];
    var items = ((r.story && r.story.evidenceItems) || []).slice().sort(function (a, b) {
      var d = cLevel(b.evidenceStrength) - cLevel(a.evidenceStrength);
      return d ? d : String(b.eventDate || "").localeCompare(String(a.eventDate || ""));
    });
    items.forEach(function (e) {
      out.push({ text: String(e.evidenceStrength || "").replace(/_.*/, "") + ": " +
        clip(e.title, titleLen || 56),
        detail: e.eventType, layer: "เหตุการณ์",
        mergeKey: String(e.evidenceStrength || "") + "|" + String(e.title || ""),
        src: (e.sourceName || e.sourceType || "") + " · " + (e.eventDate || "") +
          (docRef(e.sourceUrl) ? " · " + docRef(e.sourceUrl) : ""),
        url: e.sourceUrl || null });
    });
    var fi = r.financialInflection;
    if (fi && fi.available) {
      Object.keys(FIN_LABEL).map(function (k) { return { k: k, x: fi.metrics[k] }; })
        // ข้ามรายการที่ engine จัดเป็น "ยังไม่พลิก" หรือ "ไม่มีข้อมูล" (อ่านจาก key ไม่ใช่เส้นตัดของ UI)
        .filter(function (m) {
          return m.x && m.x.state && m.x.state.key !== "NO_INFLECTION" &&
            m.x.state.key !== "FINANCIAL_EVIDENCE_UNAVAILABLE";
        })
        .sort(function (a, b) { return b.x.state.n - a.x.state.n; })
        .forEach(function (m) {
          var x = m.x;
          var detail = m.k === "MARGIN_INFLECTION"
            ? (x.latestPct + "% · YoY " + pp(x.yoyPp)) : ("YoY " + pct(x.yoyPct));
          out.push({ text: FIN_LABEL[m.k] + " " +
            x.state.key.replace("_INFLECTION", "").replace("DEBT_", ""),
            detail: detail, layer: "งบรายไตรมาส",
            src: "งบรายไตรมาส " + (fi.latestQuarter || ""), url: null });
        });
    }
    (r.valueTrap && r.valueTrap.improving ? r.valueTrap.improving : []).forEach(function (sg) {
      if (sg) out.push({ text: sg, detail: null, layer: "ตรวจ value trap",
        src: "value trap · งบ " + (r.valueTrap.quartersUsed || "?") + " ไตรมาส", url: null });
    });
    var ia = r.insiderActivity;
    if (ia && ia.state && ia.state.key === "BUYING") {
      // ต้องโชว์ชุดที่ engine ใช้ตัดสินทิศทาง ไม่ใช่ยอดรวมทั้งชุด
      // (ยอดรวมอาจเป็น 7/7 ขณะที่ทิศทางมาจาก 3/0 ในช่วงล่าสุด — โชว์ยอดรวมเดี่ยว ๆ จะขัดกันเอง)
      var iaDetail = ia.recentCount
        ? "ซื้อ " + ia.recentBuyCount + " · ขาย " + ia.recentSellCount + " (" + (ia.directionBasis || "") + ")"
        : "ซื้อ " + ia.buyCount + " · ขาย " + ia.sellCount + " (ทั้งชุดที่ดึงมา)";
      out.push({ text: "ผู้บริหาร/ผู้ถือหุ้นใหญ่ซื้อ", detail: iaDetail, layer: "ก.ล.ต. แบบ 59",
        src: "ก.ล.ต. แบบ 59" + (ia.latestDate ? " · ล่าสุด " + ia.latestDate : ""), url: null,
        supportingOnly: true });
    }
    // รวมแถวที่ผู้อ่านแยกไม่ออก (ข้อความ + แหล่ง เหมือนกัน) ให้เป็นแถวเดียว
    // เอกสารฉบับแก้ไขของ SET ใช้พาดหัวเดียวกับต้นฉบับ ⇒ ถ้าปล่อยไว้จะนับซ้ำและอ่านเหมือนกันทุกตัวอักษร
    // ไม่ทิ้งหลักฐาน: เก็บลิงก์ของทุกฉบับไว้ในแถวเดียวและบอกจำนวนฉบับ
    var byRow = {}, dedup = [];
    out.forEach(function (e) {
      // แถวที่มี mergeKey (หลักฐานเหตุการณ์) เทียบด้วยพาดหัวจริงเท่านั้น —
      // ไม่รวมแหล่งที่มา เพราะเลขที่เอกสารต่างกันได้แม้เป็นเรื่องเดียวกัน
      var k = e.mergeKey ? e.mergeKey : e.text + "|" + (e.src || "");
      if (byRow[k]) {
        var g = byRow[k];
        g.copies = (g.copies || 1) + 1;
        if (e.url && e.url !== g.url) { g.moreUrls = g.moreUrls || []; g.moreUrls.push(e.url); }
        return;
      }
      byRow[k] = e; dedup.push(e);
    });
    // total = จำนวนรายการที่มีจริงหลังรวมแถวซ้ำ — ใช้บอก "+N more" ให้ตรงกับหน้า Detail
    var total = dedup.length;
    if (storyLimit != null) {
      var kept = 0;
      dedup = dedup.filter(function (e) {
        if (e.layer !== "เหตุการณ์") return true;
        kept++; return kept <= storyLimit;
      });
    }
    dedup.total = total;
    return dedup;
  }

  function riskEvidence(r) {
    var out = [];
    (r.valueTrap && r.valueTrap.signals ? r.valueTrap.signals : []).forEach(function (s) {
      out.push({ text: s, src: "value trap · งบ " + (r.valueTrap.quartersUsed || "?") + " ไตรมาส", url: null });
    });
    var fi = r.financialInflection;
    if (fi) {
      if (fi.contradictionNote) out.push({ text: fi.contradictionNote, src: "financial-inflection", url: null });
      if (fi.crossCheckNote) out.push({ text: fi.crossCheckNote, src: "financial-inflection", url: null });
      if (fi.available) {
        var m = fi.metrics;
        if (m.MARGIN_INFLECTION && m.MARGIN_INFLECTION.stillNegative) {
          out.push({ text: m.MARGIN_INFLECTION.levelNote || "มาร์จิ้นยังติดลบ",
            src: "งบ " + (fi.latestQuarter || ""), url: null });
        }
        ["REVENUE_INFLECTION", "EPS_INFLECTION", "FCF_INFLECTION"].forEach(function (k) {
          var x = m[k];
          if (!x || !x.state) return;
          if (x.state.key === "NO_INFLECTION" && x.yoyPct != null && x.yoyPct < 0) {
            out.push({ text: FIN_LABEL[k] + "ลดลง YoY " + x.yoyPct + "%",
              src: "งบ " + (fi.latestQuarter || ""), url: null });
          }
        });
      }
    }
    var ia = r.insiderActivity;
    if (ia && ia.state && ia.state.key === "SELLING") {
      out.push({ text: "ผู้บริหาร/ผู้ถือหุ้นใหญ่ขายเป็นส่วนใหญ่",
        src: "ก.ล.ต. แบบ 59 · ขาย " + ia.sellCount, url: null });
    }
    if (r.whyFell && r.whyFell.category === "UNKNOWN") {
      out.push({ text: "ยังไม่ทราบสาเหตุที่ราคาตก", src: "why-fell-thai", url: null });
    }
    // ไม่สร้างรายการ "หลักฐานมีน้อย" จากเส้นตัดที่ UI ตั้งเอง —
    // จำนวนหลักฐานแสดงอยู่แล้วในหัวข้อ 1 และ 2 ให้ผู้อ่านตัดสินเอง
    return out;
  }

  // ---------- โทนสี ----------
  function tone(k) {
    if (k === "STRONG_EARLY_CATALYST" || k === "EARLY_CATALYST" || k === "CATALYST_EXISTS") return "green";
    if (k === "EMERGING" || k === "TURNAROUND" || k === "FUNDAMENTAL_RECOVERY") return "amber";
    if (k === "UNEXPLAINED_MARKET_MOVE") return "violet";
    if (k === "STORY_ONLY" || k === "SPECULATIVE") return "orange";
    if (k === "VALUE_TRAP_RISK") return "red";
    if (k === "PRICED_IN" || k === "EXIT_WATCH") return "blue";
    return "grey";
  }
  function finTone(k) {
    return { STRONG_INFLECTION: "green", CONFIRMED_INFLECTION: "green", EARLY_INFLECTION: "amber",
      NO_INFLECTION: "grey", FINANCIAL_EVIDENCE_UNAVAILABLE: "grey" }[k] || "grey";
  }
  // ระดับการรับรู้เป็น "ลำดับ" ไม่ใช่ "ดี/แย่" ⇒ ไม่ใช้เขียว (EARLY = ตลาดยังไม่รับรู้ ไม่ใช่ข้อดีในตัวเอง)
  // OVERHEATED คงสีแดงเพราะ engine ใช้เป็นตัวขับ EXIT_WATCH ซึ่งเป็นความเสี่ยงจริง
  function recogTone(k) {
    return { UNKNOWN: "grey", EARLY: "blue", BUILDING: "blue", CONFIRMED: "violet", OVERHEATED: "red" }[k] || "grey";
  }
  // โทนของ catalyst = ลำดับความแข็งของหลักฐานที่ engine ให้ (C0-C5) ไม่ใช่การตัดสินว่าดีพอหรือยัง
  function matTone(r) {
    var k = r.catalyst && r.catalyst.maturity ? r.catalyst.maturity.key : "";
    if (/^C[45]/.test(k)) return "violet";
    if (/^C[23]/.test(k)) return "blue";
    if (/^C[01]/.test(k)) return "grey";
    return "grey";
  }
  // F9: maturity.NONE.label = "DATA UNAVAILABLE" ซึ่งผิดสำหรับหุ้นที่ "ตรวจแล้วไม่พบ"
  //     ⇒ เมื่อยังไม่มีระดับ ให้ใช้ availability เป็นตัวบอกความจริง ห้ามพูดว่าไม่มีข้อมูล
  function matLabel(r) {
    var mat = r.catalyst && r.catalyst.maturity ? r.catalyst.maturity : null;
    var av = r.catalyst && r.catalyst.availability ? r.catalyst.availability : null;
    if (mat && mat.key !== "NONE") return mat.label;
    // PHASE 5.1 — ตรวจแล้วไม่พบเหตุการณ์ แต่มีหลักฐานงบ: ต้องบอกให้ตรงว่าขาดอะไร
    if (av && av.key === "NO_CATALYST" && finEvCount(r) > 0) return "NO INDEPENDENT BUSINESS CATALYST";
    return av ? av.label : "—";
  }
  // UNKNOWN ต้องเป็นกลาง ห้ามเขียว
  function trapTone(k) { return { LOW: "green", MEDIUM: "amber", HIGH: "red", UNKNOWN: "grey" }[k] || "grey"; }

  // ============================================================
  // SECTION 1 — HEADER
  // ============================================================
  function fmtDT(iso) {
    try {
      var d = new Date(iso);
      var MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      var p = function (n) { return String(n).padStart(2, "0"); };
      return p(d.getDate()) + " " + MO[d.getMonth()] + " " + d.getFullYear() + " " +
        p(d.getHours()) + ":" + p(d.getMinutes());
    } catch (e) { return String(iso).slice(0, 16).replace("T", " "); }
  }
  function freshness() {
    var m = state.evidenceMeta || {};
    var parts = [];
    if (state.scannedAt) parts.push("สแกน " + fmtDT(state.scannedAt));
    if (m.coverage && m.coverage.to) parts.push("ข้อมูลเผยแพร่ถึง " + m.coverage.to);
    if (m.sources && m.sources.financials && m.sources.financials.asOf) {
      parts.push("งบ " + String(m.sources.financials.asOf).slice(0, 10));
    }
    return parts.length ? parts.join(" · ") : "ยังไม่มีข้อมูล";
  }

  // บริบทของการสแกน — บอกทั้งจักรวาลและส่วนที่ดึงไม่ได้ ไม่โชว์เลขเดียวลอย ๆ
  function scanContext() {
    var uni = state.universeMeta && state.universeMeta.counts ? state.universeMeta.counts.total : null;
    var n = state.rows.length;
    if (uni == null) return n + " ตัวในผลสแกน";
    var gap = uni - n;
    var s = n + " / " + uni + " scanned";
    if (gap > 0) s += " · " + gap + " unavailable";
    return s;
  }
  // เหตุผลของตัวที่ดึงไม่ได้ — ใช้เฉพาะข้อความที่ API ส่งกลับมาจริง ห้ามเดา
  function scanGapDetail() {
    var uni = state.universeMeta && state.universeMeta.counts ? state.universeMeta.counts.total : null;
    var gap = uni == null ? 0 : uni - state.rows.length;
    if (gap <= 0) return "";
    var f = state.failed || [];
    if (f.length) {
      var shown = f.slice(0, 6).map(function (x) {
        return esc(x.ticker) + (x.errorMessage ? " (" + esc(clip(x.errorMessage, 64)) + ")" : "");
      }).join(" · ");
      return "ดึงราคาไม่ได้: " + shown + (f.length > 6 ? " · และอีก " + (f.length - 6) + " ตัว" : "");
    }
    return gap + " ตัวไม่ได้กลับมาในผลสแกนรอบนี้ — API ไม่ได้ระบุเหตุผล";
  }

  function header(detailMode) {
    return '<header class="ch-hero">' +
      '<div class="ch-hero-main">' +
      (detailMode ? '<button type="button" class="ch-btn ch-btn-ghost" data-ch-home="1">← Catalyst Radar</button>' : "") +
      "<h1>Catalyst Hunter</h1>" +
      '<p class="ch-hero-sub">Thai Event-Driven &amp; Turnaround Intelligence</p>' +
      '<p class="ch-hero-lead">ค้นหาหุ้นไทยที่ราคาถูกทิ้งอย่างหนัก แต่มี catalyst ใหม่ที่กำลังเปลี่ยนธุรกิจจริง ' +
      "และตลาดยังไม่รับรู้เต็มที่</p></div>" +
      '<div class="ch-hero-meta">' +
      '<div class="ch-fresh"><small>ข้อมูล ณ</small><b>' + esc(freshness()) + "</b>" +
      (state.rows.length ? '<small class="ch-scanctx">' + esc(scanContext()) + "</small>" : "") +
      (state.universeMeta && state.universeMeta.counts
        ? "<small>จักรวาล SET " + state.universeMeta.counts.set +
          " · mai " + state.universeMeta.counts.mai + "</small>" : "") + "</div>" +
      '<button type="button" class="ch-btn" data-ch-rescan="1">' +
      (state.loading ? "กำลังสแกน…" : "สแกนใหม่") + "</button></div></header>";
  }

  // ============================================================
  // SECTION 2 — RADAR SUMMARY
  // ============================================================
  var SUMMARY_ORDER = ["STRONG_EARLY_CATALYST", "EARLY_CATALYST", "CATALYST_EXISTS", "EMERGING",
    "TURNAROUND", "FUNDAMENTAL_RECOVERY", "UNEXPLAINED_MARKET_MOVE", "STORY_ONLY", "SPECULATIVE",
    "VALUE_TRAP_RISK", "PRICED_IN", "EXIT_WATCH", "NO_CATALYST", "CATALYST_UNAVAILABLE"];

  function counts() {
    var c = {};
    state.rows.forEach(function (r) { var k = statusKey(r); c[k] = (c[k] || 0) + 1; });
    return c;
  }

  // ศูนย์เป็นข้อมูล — สถานะโอกาสต้องแสดงแม้เป็น 0 เพื่อไม่ให้ดูเหมือนระบบพัง
  var ALWAYS_SHOW = { STRONG_EARLY_CATALYST: 1, EARLY_CATALYST: 1 };
  function radarSummary() {
    var c = counts();
    var q = CQ() ? CQ().QUAL : {};
    var cards = SUMMARY_ORDER.filter(function (k) { return c[k] || ALWAYS_SHOW[k]; }).map(function (k) {
      var def = q[k] || { label: k, icon: "", thai: "" };
      var on = state.filter.status === k;
      var v = c[k] || 0;
      return '<button type="button" class="ch-sum-card' + (on ? " is-on" : "") +
        (v === 0 ? " is-zero" : "") + " ch-tone-" + tone(k) + '"' +
        ' data-ch-filter-status="' + esc(k) + '" title="' + esc(def.thai || "") + '">' +
        "<small>" + esc(def.icon || "") + " " + esc(def.label || k) + "</small><b>" + v + "</b>" +
        (v === 0 ? "<em>ไม่มีในรอบนี้</em>" : "") + "</button>";
    }).join("");
    return '<section class="ch-sec"><div class="ch-sec-head"><h2>Radar Summary</h2>' +
      "<p>นับจากสถานะที่ engine จัดไว้ — กดเพื่อกรองรายการด้านล่าง" +
      (state.filter.status
        ? ' · <button type="button" class="ch-link" data-ch-filter-status="">ล้างตัวกรอง</button>' : "") +
      "</p></div>" + '<div class="ch-sum-grid">' + cards + "</div></section>";
  }

  // ============================================================
  // SECTION 3 — RARE OPPORTUNITIES
  // การจัดหมวดที่พบได้ยาก ไม่ใช่รายการแนะนำ
  // ============================================================
  // เกณฑ์ทั้งห้าของ Rare Opportunity — สะท้อนเงื่อนไขของ STRONG_EARLY_CATALYST ใน engine
  // ทุกข้ออ่านจาก "คีย์สถานะ" ที่ engine คำนวณไว้แล้ว (q.dimensions) —
  // ไม่มีการคิดเลขใหม่ ไม่มีเส้นตัดตัวเลขซ้ำใน UI และไม่มีคะแนน
  var RARE_GATES = [
    { key: "dd", label: "Deep Drawdown", req: "ย่อลึกจาก high 52 สัปดาห์",
      ok: function (r, D) { return !!(D.A_price && D.A_price.deep); },
      got: function (r, D) {
        return D.A_price && D.A_price.pct != null
          ? pct(D.A_price.pct) + (D.A_price.label ? " (" + D.A_price.label + ")" : "") : "ไม่มีข้อมูลราคา";
      } },
    { key: "cat", label: "Genuine Business/Event Catalyst ≥ C3", req: "C3 ขึ้นไป และต้องเป็นเหตุการณ์เชิงธุรกิจ",
      ok: function (r, D) {
        return /^C[345]/.test((D.C_catalyst && D.C_catalyst.maturityKey) || "") && bizCount(r) > 0;
      },
      got: function (r, D) {
        if (bizCount(r) === 0) return "ไม่มีเหตุการณ์เชิงธุรกิจอิสระ";
        return (D.C_catalyst && D.C_catalyst.maturityKey ? D.C_catalyst.maturityKey.replace(/_.*/, "") : "—") +
          " · เหตุการณ์ธุรกิจ " + bizCount(r) + " ชิ้น";
      } },
    { key: "fin", label: "Strong / Confirmed Financial Inflection", req: "STRONG หรือ CONFIRMED",
      ok: function (r, D) {
        var k = D.D_financial && D.D_financial.stateKey;
        return k === "STRONG_INFLECTION" || k === "CONFIRMED_INFLECTION";
      },
      got: function (r) { return finShort(r); } },
    { key: "recog", label: "Market Recognition = UNKNOWN / EARLY / BUILDING", req: "ตลาดยังรับรู้ไม่เต็ม",
      ok: function (r, D) {
        return ["UNKNOWN", "EARLY", "BUILDING"].indexOf((D.E_recognition && D.E_recognition.key) || "") >= 0;
      },
      got: function (r, D) { return (D.E_recognition && D.E_recognition.key) || "UNKNOWN"; } },
    { key: "trap", label: "Value Trap ≠ HIGH", req: "ไม่ติด value trap สูง",
      ok: function (r, D) { return !(D.F_valueTrap && D.F_valueTrap.high); },
      got: function (r) { return trapPlain(r); } },
  ];
  function rareGateMisses(r) {
    var q = Qof(r);
    var D = (q && q.dimensions) || {};
    return RARE_GATES.filter(function (g) { return !g.ok(r, D); })
      .map(function (g) { return { gate: g, got: g.got(r, D) }; });
  }
  function dimRow(r) {
    var items = [
      // ย่อลึก ≠ โอกาส ⇒ เป็นกลางเสมอ · ระดับความลึกอ่านจากตัวเลขและป้ายสถานะของ engine
      ["52W Drawdown", pct(ddPct(r)), "grey",
        r.drawdown && r.drawdown.state ? r.drawdown.state.label : null],
      ["Catalyst", matShort(r), matTone(r), matLabel(r)],
      ["Financial Inflection", finShort(r), finTone(finState(r)), null],
      ["Market Recognition", recogKey(r), recogTone(recogKey(r)), null],
      ["Value Trap", trapPlain(r), trapTone(trapKey(r)), null],
    ];
    return items.map(function (x) {
      return '<div class="ch-dim ch-tone-' + x[2] + '"' + (x[3] ? ' title="' + esc(x[3]) + '"' : "") +
        "><small>" + esc(x[0]) + "</small><b>" + esc(x[1]) + "</b></div>";
    }).join("");
  }

  // การ์ดโชว์เฉพาะหลักฐานที่แข็งสุดตามลำดับที่ engine จัดมา (ไม่จัดลำดับใหม่เอง)
  // หลักฐานทั้งหมดยังอยู่ครบในหน้า Detail
  function rareCard(r) {
    // การ์ดตัดหลักฐาน catalyst เหลือ 2 ชิ้นที่แข็งสุด (ตามระดับ C ของ engine) — ที่เหลือดูในหน้า Detail
    var pos = positiveEvidence(r, 2), risk = riskEvidence(r);
    var POS_N = 3, RISK_N = 3;
    // จำนวนที่ยังไม่ได้แสดง = รายการเต็ม (หลังรวมแถวซ้ำ) ลบด้วยที่แสดงบนการ์ด
    // ครอบทั้งการตัดของ storyLimit และการตัด POS_N ⇒ ตรงกับจำนวนในหน้า Detail
    var posMore = Math.max(0, (pos.total || pos.length) - Math.min(POS_N, pos.length));
    var riskMore = Math.max(0, risk.length - RISK_N);
    return '<article class="ch-rare">' +
      '<div class="ch-rare-top"><div><h3>' + esc(r.ticker) + "<small>" + esc(r.market) + "</small></h3>" +
      '<p class="ch-rare-name">' + esc(clip(r.name, 52)) + "</p></div>" +
      '<span class="ch-badge ch-tone-' + tone(statusKey(r)) + '">' + esc(statusLabel(r)) + "</span></div>" +
      '<div class="ch-dims">' + dimRow(r) + "</div>" +
      '<div class="ch-rare-ev">' +
      '<div class="ch-ev-col"><h4>Positive Evidence</h4>' +
      (pos.length ? '<ul class="ch-list">' + pos.slice(0, POS_N).map(function (e) {
        return '<li><span class="ch-ok">✓</span> ' + esc(e.text) +
          (e.detail ? " <em>" + esc(e.detail) + "</em>" : "") +
          (e.supportingOnly ? ' <span class="ch-tag-sup">สนับสนุน</span>' : "") + "</li>";
      }).join("") + "</ul>" +
        (posMore ? '<p class="ch-more">+ ' + posMore + " more evidence — ดูครบในหน้า Detail</p>" : "")
        : '<p class="ch-na">ไม่มีหลักฐานบวกที่บันทึกไว้</p>') + "</div>" +
      '<div class="ch-ev-col"><h4>Risk Evidence</h4>' +
      (risk.length ? '<ul class="ch-list">' + risk.slice(0, RISK_N).map(function (e) {
        return '<li><span class="ch-warn">⚠</span> ' + esc(clip(e.text, 92)) + "</li>";
      }).join("") + "</ul>" +
        (riskMore ? '<p class="ch-more">+ ' + riskMore + " more evidence — ดูครบในหน้า Detail</p>" : "")
        : '<p class="ch-na">ไม่มีหลักฐานความเสี่ยงที่บันทึกไว้</p>') + "</div></div>" +
      '<button type="button" class="ch-btn ch-btn-wide" data-ch-ticker="' + esc(r.ticker) + '">' +
      "ดูหลักฐานทั้งหมด →</button></article>";
  }

  // เมื่อไม่มีตัวผ่านเกณฑ์ครบ ต้องอธิบาย "เกณฑ์" ไม่ใช่ปล่อยกริดว่าง
  // และต้องไม่พูดว่า "ไม่มีโอกาส" เพราะระบบยังมี CATALYST_EXISTS / EMERGING / FUNDAMENTAL RECOVERY อยู่
  function rareEmptyState() {
    return '<div class="ch-zero">' +
      '<p class="ch-zero-lead"><b>ยังไม่พบหุ้นที่ผ่านเกณฑ์ Rare Opportunity ครบทุกข้อ</b><br>' +
      '<span class="ch-en">No qualifying setup detected in the current scan.</span></p>' +
      '<div class="ch-zero-gates"><h4>เกณฑ์ที่ต้องผ่านครบทั้งห้าข้อ</h4><ul>' +
      RARE_GATES.map(function (g) {
        return "<li><span>✓</span> " + esc(g.label) + "<em>" + esc(g.req) + "</em></li>";
      }).join("") + "</ul></div>" +
      '<p class="ch-note">ไม่มีรายการให้ติดตามในกลุ่มนี้ ณ รอบสแกนปัจจุบัน — ' +
      "หมายถึง<strong>ยังไม่มีตัวไหนผ่านเกณฑ์ทั้งห้าข้อพร้อมกัน</strong> " +
      "ไม่ได้หมายความว่าไม่มีอะไรน่าติดตามเลย · หุ้นที่มี catalyst เชิงธุรกิจจริงยังอยู่ในกลุ่ม " +
      "CATALYST EXISTS และ EMERGING ด้านล่าง</p></div>";
  }

  function rareOpportunities() {
    var list = state.rows.filter(function (r) { return statusKey(r) === "STRONG_EARLY_CATALYST"; })
      .sort(function (a, b) { return (ddPct(a) || 0) - (ddPct(b) || 0); });
    var body = list.length
      ? '<div class="ch-rare-grid">' + list.map(rareCard).join("") + "</div>"
      : rareEmptyState();
    return '<section class="ch-sec ch-sec-primary"><div class="ch-sec-head">' +
      '<h2>Rare Opportunities <span class="ch-count">' + list.length + " / " + state.rows.length +
      " scanned</span></h2>" +
      "<p>Deep drawdown + <strong>genuine business/event catalyst</strong> + " +
      "strong financial inflection + market not fully recognized<br>" +
      "<strong>เป็นการจัดหมวดที่พบได้ยาก ไม่ใช่รายการแนะนำ</strong> — " +
      "ทุกตัวยังต้องอ่านหลักฐานความเสี่ยงในการ์ดและในหน้า Detail<br>" +
      "คำว่า catalyst ที่นี่หมายถึง<strong>เหตุการณ์เชิงธุรกิจที่ยืนยันแล้ว</strong> — " +
      "งบที่ดีขึ้นเพียงอย่างเดียวไม่นับ และจะถูกจัดเป็น FUNDAMENTAL RECOVERY</p></div>" + body + "</section>";
  }

  // ============================================================
  // SECTION 3.5 — หุ้นที่ใกล้ผ่านเกณฑ์ (แสดงเฉพาะเมื่อไม่มีตัวผ่านครบ)
  // "ตกข้อเดียว" นับจากเกณฑ์ห้าข้อข้างบน ซึ่งอ่านจากมิติของ engine ทั้งหมด
  // ไม่ใช่คะแนน ไม่ใช่ระยะห่างจากโอกาส และไม่ใช่รายการแนะนำ — เรียงตามลำดับความสำคัญของ engine
  // ============================================================
  function nearMiss() {
    var cand = [];
    state.rows.forEach(function (r) {
      var miss = rareGateMisses(r);
      if (miss.length === 1) cand.push({ r: r, miss: miss[0] });
    });
    if (!cand.length) return "";
    cand.sort(function (a, b) {
      var d = prio(a.r) - prio(b.r);
      return d ? d : String(a.r.ticker).localeCompare(String(b.r.ticker));
    });
    var shown = cand.slice(0, 12);
    var rows = shown.map(function (x) {
      return '<button type="button" class="ch-near" data-ch-ticker="' + esc(x.r.ticker) + '">' +
        '<div class="ch-near-top"><b>' + esc(x.r.ticker) + "</b>" +
        '<span class="ch-pill ch-tone-' + tone(statusKey(x.r)) + '">' + esc(statusLabel(x.r)) + "</span>" +
        "</div>" +
        '<p class="ch-near-name">' + esc(clip(x.r.name || "", 44)) + "</p>" +
        '<div class="ch-near-gate"><small>ข้อที่ยังไม่ผ่าน</small>' +
        "<b>" + esc(x.miss.gate.label) + "</b>" +
        "<span>ปัจจุบัน: " + esc(x.miss.got) + "</span>" +
        "<span>ต้องการ: " + esc(x.miss.gate.req) + "</span></div></button>";
    }).join("");
    return '<section class="ch-sec"><div class="ch-sec-head">' +
      '<h2>หุ้นที่ใกล้ผ่านเกณฑ์ <span class="ch-count">' + cand.length + " / " + state.rows.length +
      " scanned</span></h2>" +
      "<p>ตกเกณฑ์ Rare Opportunity เพียง<strong>ข้อเดียว</strong> จากห้าข้อ · " +
      "เรียงตามลำดับความสำคัญของสถานะที่ engine จัดไว้ ไม่มีคะแนนและไม่มีการวัดระยะห่าง<br>" +
      "<strong>ไว้เพื่อติดตาม ไม่ใช่คำแนะนำ</strong> " +
      '<span class="ch-en">Near-miss is for monitoring, not recommendation.</span></p></div>' +
      '<div class="ch-near-grid">' + rows + "</div>" +
      (cand.length > shown.length
        ? '<p class="ch-note">แสดง ' + shown.length + " จาก " + cand.length +
          " รายการ — ที่เหลืออยู่ในตาราง Candidates</p>" : "") +
      "</section>";
  }

  // ============================================================
  // SECTION 4 — QUALIFICATION LANDSCAPE
  // สถานะเหล่านี้จัดแยกกันเป็นอิสระ ไม่ใช่ขั้นของ pipeline
  // ⇒ ห้ามมีลูกศรหรือสิ่งที่สื่อว่าไล่จากขั้นหนึ่งไปอีกขั้น
  // ============================================================
  var LANDSCAPE = ["STRONG_EARLY_CATALYST", "EARLY_CATALYST", "CATALYST_EXISTS", "EMERGING",
    "FUNDAMENTAL_RECOVERY", "UNEXPLAINED_MARKET_MOVE"];

  function landscape() {
    var c = counts();
    var q = CQ() ? CQ().QUAL : {};
    var max = Math.max.apply(null, LANDSCAPE.map(function (k) { return c[k] || 0; }).concat([1]));
    var rows = LANDSCAPE.map(function (k) {
      var n = c[k] || 0;
      var def = q[k] || { label: k, thai: "" };
      var w = n ? Math.max(4, Math.round((n / max) * 100)) : 0;
      var on = state.filter.status === k;
      return '<button type="button" class="ch-lscape' + (on ? " is-on" : "") + " ch-tone-" + tone(k) + '"' +
        ' data-ch-filter-status="' + esc(k) + '" title="' + esc(def.thai || "") + '">' +
        '<span class="ch-lscape-label">' + esc(def.label || k) + "</span>" +
        '<span class="ch-lscape-bar"><i class="ch-bg-' + tone(k) + '" style="width:' + w + '%"></i></span>' +
        '<span class="ch-lscape-n">' + n + "</span>" +
        '<span class="ch-lscape-thai">' + esc(def.thai || "") + "</span></button>";
    }).join("");
    return '<section class="ch-sec"><div class="ch-sec-head"><h2>Qualification Landscape</h2>' +
      "<p>การจัดกลุ่มตามหลักฐานปัจจุบัน ไม่ใช่ลำดับที่หุ้นต้องพัฒนาไปตามขั้น<br>" +
      '<span class="ch-en">Current evidence classifications — not a required progression.</span></p></div>' +
      '<div class="ch-lscape-grid">' + rows + "</div>" +
      '<p class="ch-note">แต่ละกลุ่มถูกจัดแยกกันเป็นอิสระจากหลักฐานที่มี — ' +
      "FUNDAMENTAL RECOVERY ไม่ได้กำลังเดินไปเป็น CATALYST EXISTS และ EMERGING ก็ไม่ได้กำลังเดินไปเป็น " +
      "STRONG EARLY · กดเพื่อกรองรายการด้านล่าง</p></section>";
  }

  // ============================================================
  // SECTION 5 — DRAWDOWN × MARKET RECOGNITION (แผนที่บรรยาย ไม่ใช่การจัดอันดับ)
  // ============================================================
  var DD_BANDS = [
    { key: "gt50", label: "> 50%", test: function (v) { return v != null && v <= -50; } },
    { key: "30_50", label: "30–50%", test: function (v) { return v != null && v <= -30 && v > -50; } },
    { key: "20_30", label: "20–30%", test: function (v) { return v != null && v <= -20 && v > -30; } },
    { key: "lt20", label: "< 20%", test: function (v) { return v != null && v > -20; } },
  ];
  var RECOG_COLS = ["UNKNOWN", "EARLY", "BUILDING", "CONFIRMED", "OVERHEATED"];

  function matrix() {
    var rows = filtered();
    var cells = {};
    rows.forEach(function (r) {
      var band = DD_BANDS.filter(function (b) { return b.test(ddPct(r)); })[0];
      if (!band) return;
      var col = recogKey(r);
      if (RECOG_COLS.indexOf(col) < 0) col = "UNKNOWN";
      var k = band.key + "|" + col;
      (cells[k] = cells[k] || []).push(r);
    });
    var head = "<tr><th></th>" + RECOG_COLS.map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("") + "</tr>";
    var body = DD_BANDS.map(function (b) {
      return "<tr><th>" + esc(b.label) + "</th>" + RECOG_COLS.map(function (c) {
        var list = cells[b.key + "|" + c] || [];
        if (!list.length) return '<td class="ch-mx-empty"></td>';
        var top = list.slice().sort(function (x, y) { return prio(x) - prio(y); }).slice(0, 6);
        return '<td><div class="ch-mx-cell">' + top.map(function (r) {
          return '<button type="button" class="ch-chipbtn ch-tone-' + tone(statusKey(r)) + '"' +
            ' data-ch-ticker="' + esc(r.ticker) + '" title="' +
            esc(r.ticker + " · " + statusLabel(r) + " · ย่อ " + pct(ddPct(r)) +
              (r.drawdown && r.drawdown.state ? " (" + r.drawdown.state.label + ")" : "")) +
            '">' + esc(r.ticker) + "</button>";
        }).join("") +
          (list.length > 6 ? '<span class="ch-mx-more">+' + (list.length - 6) + "</span>" : "") + "</div></td>";
      }).join("") + "</tr>";
    }).join("");
    return '<section class="ch-sec"><div class="ch-sec-head">' +
      '<h2>Deep Drawdown × Market Recognition <span class="ch-tagline">แผนที่บรรยาย ไม่ใช่การจัดอันดับ</span></h2>' +
      "<p>ใช้ค่าที่มีอยู่จริงของแต่ละมิติ — ไม่ได้แปลงเป็นคะแนน ไม่มีช่องไหนเป็น “โซนที่ดีกว่า” และ" +
      "ไม่ได้บอกว่าช่องไหนน่าเข้าซื้อ · กดที่ ticker เพื่อดูรายละเอียด<br>" +
      '<span class="ch-en">Descriptive map — not a ranking.</span></p></div>' +
      '<div class="ch-tablewrap"><table class="ch-matrix"><thead>' + head + "</thead><tbody>" + body +
      "</tbody></table></div>" +
      '<p class="ch-note">แกนตั้ง = ระดับการย่อจาก high 52 สัปดาห์ · แกนนอน = ระดับการรับรู้ของตลาด · ' +
      "ย่อลึกไม่ได้แปลว่าเป็นโอกาส · ช่วงบนแกนตั้งเป็น<strong>ช่วงสำหรับแสดงผล</strong> " +
      "ไม่ใช่เกณฑ์จัดระดับของ engine (PULLBACK / DEEP / SEVERE / EXTREME) — ชี้ที่ ticker เพื่อดูระดับที่ engine ให้</p>" +
      "</section>";
  }

  // ============================================================
  // SECTION 6 — CANDIDATE TABLE
  // ============================================================
  var COLS = [
    { key: "ticker", label: "Ticker", get: function (r) { return r.ticker; } },
    { key: "status", label: "Status", get: statusKey },
    { key: "dd", label: "52W Drawdown", get: ddPct, num: true },
    { key: "cat", label: "Catalyst", get: matShort },
    { key: "fin", label: "Financial", get: finShort },
    { key: "recog", label: "Recognition", get: recogKey },
    { key: "trap", label: "Value Trap", get: trapKey },
    { key: "why", label: "Why Fell", get: whyKey },
    { key: "life", label: "Lifecycle", get: function (r) { return r.lifecycle || "—"; } },
  ];

  function filtered() {
    var f = state.filter;
    var q = String(f.q || "").trim().toUpperCase();
    return state.rows.filter(function (r) {
      if (f.status && statusKey(r) !== f.status) return false;
      if (f.maturity && matShort(r) !== f.maturity) return false;
      if (f.financial && finShort(r) !== f.financial) return false;
      if (f.recognition && recogKey(r) !== f.recognition) return false;
      if (f.trap && trapKey(r) !== f.trap) return false;
      if (f.lifecycle && (r.lifecycle || "") !== f.lifecycle) return false;
      if (q && (r.ticker + " " + (r.name || "")).toUpperCase().indexOf(q) < 0) return false;
      return true;
    });
  }

  function sorted(list) {
    var s = state.sort;
    var col = COLS.filter(function (c) { return c.key === s.key; })[0];
    var out = list.slice();
    if (s.key === "priority" || !col) {
      // ค่าเริ่มต้น: ลำดับความสำคัญของสถานะ แล้วย่อลึกกว่ามาก่อน (ไม่มีคะแนนซ่อน)
      out.sort(function (a, b) {
        var d = prio(a) - prio(b);
        return d ? d : (ddPct(a) || 0) - (ddPct(b) || 0);
      });
      return out;
    }
    out.sort(function (a, b) {
      var va = col.get(a), vb = col.get(b);
      if (col.num) {
        va = va == null ? Infinity : va; vb = vb == null ? Infinity : vb;
        return (va - vb) * s.dir;
      }
      return String(va == null ? "" : va).localeCompare(String(vb == null ? "" : vb)) * s.dir;
    });
    return out;
  }

  function uniq(fn) {
    var s = {};
    state.rows.forEach(function (r) { var v = fn(r); if (v != null && v !== "") s[v] = 1; });
    return Object.keys(s).sort();
  }
  function selectFilter(name, label, values, cur) {
    return '<label class="ch-fld"><small>' + esc(label) + "</small>" +
      '<select data-ch-filter="' + esc(name) + '"><option value="">ทั้งหมด</option>' +
      values.map(function (v) {
        return '<option value="' + esc(v) + '"' + (cur === v ? " selected" : "") + ">" + esc(v) + "</option>";
      }).join("") + "</select></label>";
  }

  function candidateTable() {
    var list = sorted(filtered());
    var shown = list.slice(0, 120);
    var f = state.filter;
    var controls = '<div class="ch-filters">' +
      '<label class="ch-fld ch-fld-wide"><small>ค้นหา</small>' +
      '<input type="search" placeholder="ticker หรือชื่อบริษัท" data-ch-search="1" value="' +
      esc(f.q || "") + '" /></label>' +
      selectFilter("status", "Status", uniq(statusKey), f.status) +
      selectFilter("maturity", "Catalyst", uniq(matShort), f.maturity) +
      selectFilter("financial", "Financial", uniq(finShort), f.financial) +
      selectFilter("recognition", "Recognition", uniq(recogKey), f.recognition) +
      selectFilter("trap", "Value Trap", uniq(trapKey), f.trap) +
      selectFilter("lifecycle", "Lifecycle", uniq(function (r) { return r.lifecycle; }), f.lifecycle) + "</div>";

    var head = "<tr>" + COLS.map(function (c) {
      var on = state.sort.key === c.key;
      return '<th><button type="button" class="ch-sortbtn' + (on ? " is-on" : "") + '" data-ch-sort="' +
        esc(c.key) + '">' + esc(c.label) + (on ? (state.sort.dir > 0 ? " ▲" : " ▼") : "") + "</button></th>";
    }).join("") + "</tr>";

    var body = shown.map(function (r) {
      return '<tr data-ch-ticker="' + esc(r.ticker) + '">' +
        "<td><b>" + esc(r.ticker) + "</b><small> " + esc(r.market) + "</small></td>" +
        '<td><span class="ch-pill ch-tone-' + tone(statusKey(r)) + '">' + esc(statusLabel(r)) + "</span>" +
        (hasRecoveryFlag(r)
          ? ' <span class="ch-flag" title="' +
            esc("ตัวเลขงบกำลังฟื้น — เป็นข้อเท็จจริงคนละเรื่องกับ catalyst") + '">+ งบฟื้น</span>' : "") +
        "</td>" +
        '<td class="ch-num">' + pct(ddPct(r)) + "</td>" +
        "<td>" + esc(matShort(r)) + "</td>" +
        '<td class="ch-txt-' + finTone(finState(r)) + '">' + esc(finShort(r)) + "</td>" +
        "<td>" + esc(recogKey(r)) + "</td>" +
        "<td>" + trapPill(r, true) + "</td>" +
        '<td><span class="ch-whybadge ch-tone-' + whyTone(whyKey(r)) + '" title="' + esc(whyTip(r)) + '">' +
        esc(whyBadgeText(r)) + "</span></td>" +
        "<td><small>" + esc(r.lifecycle || "—") + "</small></td></tr>";
    }).join("");

    return '<section class="ch-sec"><div class="ch-sec-head">' +
      '<h2>Candidates <span class="ch-count">' + list.length +
      " จาก " + state.rows.length + "</span></h2>" +
      "<p>เรียงตามลำดับความสำคัญของสถานะ แล้วย่อลึกกว่ามาก่อน · กดหัวคอลัมน์เพื่อเรียงตามฟิลด์นั้น · " +
      "ชี้ที่ป้าย Why Fell เพื่อดูคำอธิบายและหลักฐาน · ในคอลัมน์ Value Trap ตัวเลขหลัง “·” คือ" +
      "<strong>จำนวนสัญญาณเสื่อมที่ตรวจพบ</strong> ไม่ใช่คะแนน" +
      (state.sort.key !== "priority"
        ? ' · <button type="button" class="ch-link" data-ch-sort="priority">กลับค่าเริ่มต้น</button>' : "") +
      "</p></div>" + controls +
      '<div class="ch-tablewrap"><table class="ch-table"><thead>' + head + "</thead><tbody>" + body +
      "</tbody></table></div>" +
      '<p class="ch-note">' + esc(scanContext()) +
      (scanGapDetail() ? " · " + scanGapDetail() : "") +
      (list.length > shown.length
        ? " · แสดง " + shown.length + " จาก " + list.length + " รายการที่ผ่านตัวกรอง — ใช้ตัวกรองเพื่อดูให้แคบลง"
        : "") + "</p></section>";
  }

  // ============================================================
  // SECTION 7 — NEGATIVE / REJECTED CANDIDATES
  // ============================================================
  function negativeSignals() {
    var c = counts();
    var rejected = [
      ["VALUE_TRAP_RISK", "ความเสื่อมในงบแรงพอที่จะลบล้างการจัดเป็นโอกาส — ความถูกของราคาไม่ลบล้างข้อนี้"],
      ["NO_CATALYST", "ตรวจข้อมูลเผยแพร่และเอกสาร ก.ล.ต. แล้ว ไม่พบเหตุการณ์ที่เข้าเกณฑ์"],
      ["FUNDAMENTAL_RECOVERY", "งบฟื้น แต่ยังไม่พบ catalyst เชิงธุรกิจอิสระ — " +
        "ตัวเลขที่ดีขึ้นเป็นผลลัพธ์ ไม่ใช่เหตุการณ์ที่ทำให้ธุรกิจเปลี่ยน"],
      ["UNEXPLAINED_MARKET_MOVE", "ราคา/วอลุ่มขยับแต่อธิบายไม่ได้ — เป็นคิวไปหาข้อมูล ไม่ใช่สัญญาณบวก"],
      ["PRICED_IN", "catalyst สุกงอมและตลาดรับรู้เต็มแล้ว"],
      ["EXIT_WATCH", "ราคา/วอลุ่มร้อนแรงผิดปกติหลัง catalyst ยืนยัน"],
    ].filter(function (x) { return c[x[0]]; });
    var totalRejected = rejected.reduce(function (a, x) { return a + c[x[0]]; }, 0);
    // CATALYST_UNAVAILABLE = ยังตรวจไม่ได้ ไม่ใช่ถูกปฏิเสธ — แยกออกมาไม่นับรวม
    var unchecked = c.CATALYST_UNAVAILABLE || 0;
    // ต้องกระทบยอดให้ครบทุกตัว: กลุ่มที่ไม่ได้อยู่ทั้งใน Landscape และในกล่องนี้ ต้องถูกพูดถึง
    var inRejected = {}; rejected.forEach(function (x) { inRejected[x[0]] = 1; });
    var elsewhere = Object.keys(c).filter(function (k) {
      return !inRejected[k] && k !== "CATALYST_UNAVAILABLE" && LANDSCAPE.indexOf(k) < 0;
    }).sort(function (a, b) { return c[b] - c[a]; });
    var elsewhereN = elsewhere.reduce(function (a, k) { return a + c[k]; }, 0);
    // UNEXPLAINED_MARKET_MOVE ปรากฏทั้งใน Landscape และในกล่องนี้ — ต้องบอกตรง ๆ ว่าเป็นตัวเดียวกัน
    var alsoInLandscape = rejected.filter(function (x) { return LANDSCAPE.indexOf(x[0]) >= 0; })
      .map(function (x) { return ((CQ() ? CQ().QUAL[x[0]] : null) || { label: x[0] }).label; });
    return '<section class="ch-sec ch-sec-reject"><div class="ch-sec-head">' +
      "<h2>ทำไมหุ้นส่วนใหญ่ถูกคัดออก</h2>" +
      "<p>Catalyst Hunter <strong>ตั้งใจ</strong>ปฏิเสธหุ้นที่ราคาตกหนักจำนวนมาก เมื่อหลักฐานไม่พอหรือ" +
      "ความเสี่ยงสูงเกินไป — หุ้นที่ตกไม่ได้เป็นโอกาสทุกตัว · ยังไม่เข้าเกณฑ์โอกาส " + totalRejected +
      " จาก " + state.rows.length + " ตัว<br>" +
      '<span class="ch-en">Catalyst Hunter deliberately rejects many deeply beaten-down stocks ' +
      "when evidence is insufficient or risk is too high.</span></p></div>" +
      '<div class="ch-reject-grid">' + rejected.map(function (x) {
        var on = state.filter.status === x[0];
        var def = (CQ() ? CQ().QUAL[x[0]] : null) || { label: x[0] };
        return '<button type="button" class="ch-reject' + (on ? " is-on" : "") +
          (x[0] === "VALUE_TRAP_RISK" ? " is-danger" : "") + '" data-ch-filter-status="' +
          esc(x[0]) + '"><div class="ch-reject-top"><b>' + c[x[0]] + "</b><span>" + esc(def.label) +
          "</span></div><p>" + esc(x[1]) + "</p></button>";
      }).join("") + "</div>" +
      (unchecked
        ? '<p class="ch-note">แยกไว้ต่างหาก: <b>' + unchecked + " ตัว</b> เป็น CATALYST UNAVAILABLE — " +
          "ยังตรวจแหล่งหลักฐานไม่สำเร็จ <strong>ไม่ได้ถูกปฏิเสธ</strong> และไม่ได้แปลว่าไม่มี catalyst · " +
          '<button type="button" class="ch-link" data-ch-filter-status="CATALYST_UNAVAILABLE">ดูรายการ</button></p>'
        : "") +
      (alsoInLandscape.length
        ? '<p class="ch-note">' + esc(alsoInLandscape.join(" · ")) +
          " ปรากฏทั้งใน Qualification Landscape ด้านบนและในกล่องนี้ — เป็นหุ้นชุดเดียวกัน " +
          "ไม่ใช่การนับสองรอบ (อยู่ในกล่องนี้เพราะยังไม่เข้าเกณฑ์โอกาส)</p>" : "") +
      (elsewhereN
        ? '<p class="ch-note">อีก <b>' + elsewhereN + " ตัว</b> อยู่ในกลุ่ม " +
          elsewhere.map(function (k) {
            var def = (CQ() ? CQ().QUAL[k] : null) || { label: k };
            return '<button type="button" class="ch-link" data-ch-filter-status="' + esc(k) + '">' +
              esc(def.label) + " " + c[k] + "</button>";
          }).join(" · ") + " ซึ่งไม่ได้อยู่ทั้งสองกล่องด้านบน — ดูได้ในตาราง Candidates</p>" : "") +
      "</section>";
  }

  // ============================================================
  // SECTION 8 — กติกาความหมาย (PART 10)
  // ============================================================
  var SEMANTICS = [
    ["การจัดหมวด", "คำแนะนำ", "สถานะทุกอันบอกว่า “หลักฐานอยู่ระดับไหน” ไม่ได้บอกว่าให้ทำอะไรกับหุ้น"],
    ["หลักฐาน", "ข้อพิสูจน์", "หลักฐานคือสิ่งที่ตรวจเจอจากแหล่งจริง ไม่ใช่ข้อสรุปว่าเรื่องจะจบแบบนั้น"],
    ["งบพลิก (Financial Inflection)", "catalyst", "ตัวเลขดีขึ้นเป็นผลลัพธ์ ไม่ใช่เหตุการณ์ที่ทำให้ธุรกิจเปลี่ยน"],
    ["insider ซื้อ", "catalyst", "เป็นหลักฐานสนับสนุนเท่านั้น ยกระดับ catalyst ไม่ได้"],
    ["ตลาดรับรู้", "catalyst", "ราคา/วอลุ่มขยับเป็นตัวชี้เชิงราคา ไม่ใช่ตัวตรวจจับ catalyst"],
    ["ย่อลึก", "โอกาส", "การย่อเป็นเงื่อนไขตั้งต้น ไม่ใช่เหตุผลให้สนใจโดยตัวมันเอง"],
    ["UNKNOWN", "ปลอดภัย", "UNKNOWN แปลว่าข้อมูลไม่พอสรุป — ไม่ได้แปลว่าตรวจแล้วไม่พบปัญหา"],
    ["C4", "การันตีว่าธุรกิจเปลี่ยน", "C4 คือความแข็งของหลักฐาน ไม่ใช่ขนาดของผลกระทบ"],
    ["Potential re-rating", "พยากรณ์ราคา", "เป็นการบอกว่าห่วงโซ่หลักฐานครบถึงขั้นไหน ไม่ใช่การคาดการณ์ราคา"],
    ["C4 จากหลักฐานงบ", "C4 ของ catalyst เชิงธุรกิจ",
      "ระดับ C4 หมายถึงเหตุการณ์ธุรกิจที่ยืนยันแล้วและเริ่มเห็นผลในงบ — งบที่ดีขึ้นลำพังไม่สร้างขั้นนี้"],
    ["Business Impact", "Financial Impact",
      "งบไตรมาสยืนยันได้ว่าตัวเลขเปลี่ยน แต่ไม่ได้พิสูจน์ว่าธุรกิจเปลี่ยน — สองขั้นนี้แยกกันในห่วงโซ่"],
    ["งบฟื้น (Fundamental Recovery)", "catalyst",
      "ผลประกอบการฟื้นเป็นข้อเท็จจริงที่มีค่า แต่ยังไม่ใช่เรื่องใหม่ที่ทำให้ตลาดต้องตีมูลค่าใหม่"],
  ];
  function semantics() {
    return '<section class="ch-sec ch-sec-quiet"><details class="ch-semantics"><summary>' +
      "อ่านให้ตรงกัน: สิ่งที่หน้านี้บอก และสิ่งที่ไม่ได้บอก</summary>" +
      '<div class="ch-sem-grid">' + SEMANTICS.map(function (s) {
        return '<div class="ch-sem"><b>' + esc(s[0]) + ' <span class="ch-neq">≠</span> ' + esc(s[1]) +
          "</b><p>" + esc(s[2]) + "</p></div>";
      }).join("") + "</div></details></section>";
  }

  function dataQuality() {
    var m = state.evidenceMeta || {};
    var cards = (m.adapters || []).map(function (a) {
      return '<div class="ch-adapter' + (a.connected ? " is-on" : "") + '"><b>' +
        (a.connected ? "✓ " : "○ ") + esc(a.label) + "</b><small>" + esc(a.tier) + " · " +
        (a.connected ? "CONNECTED" : '<span class="ch-na">DATA UNAVAILABLE</span>') + "</small></div>";
    }).join("");
    var anyShort = state.rows.filter(function (r) {
      return r.drawdown && r.drawdown.available && r.drawdown.bars < CE().CONFIG.bars.threeYear;
    }).length;
    return '<section class="ch-sec ch-sec-quiet"><div class="ch-sec-head"><h2>แหล่งข้อมูลและความครบถ้วน</h2>' +
      "<p>แหล่งที่ยังไม่ได้ต่อ = ยังไม่ได้ตรวจ ไม่ได้แปลว่าไม่มีข้อมูล</p></div>" +
      (cards ? '<div class="ch-adapters">' + cards + "</div>" : "") +
      '<p class="ch-note">' + esc(scanContext()) +
      (scanGapDetail() ? " · " + scanGapDetail() : "") +
      " · ราคา: Yahoo Finance (.BK) · ดัชนี ^SET.BK" +
      (state.bench ? " (" + state.bench.length + " แท่ง)"
        : ' <span class="ch-na">ไม่มี — relative strength ไม่ถูกคำนวณ</span>') +
      (anyShort ? " · " + anyShort + " ตัวมีข้อมูลไม่ถึง 3 ปี" : "") +
      " · ไม่ใช่คำสั่งซื้อขาย</p></section>";
  }

  function radar() {
    if (!state.rows.length) return "";
    var rareCount = state.rows.filter(function (r) {
      return statusKey(r) === "STRONG_EARLY_CATALYST";
    }).length;
    return radarSummary() + rareOpportunities() +
      // แสดงเฉพาะเมื่อไม่มีตัวผ่านครบ — ถ้ามีตัวผ่านแล้ว ส่วนนี้จะกลายเป็นรายการรองที่ไม่จำเป็น
      (rareCount === 0 ? nearMiss() : "") +
      landscape() + matrix() + candidateTable() +
      negativeSignals() + semantics() + dataQuality();
  }

  // ============================================================
  // DETAIL PAGE — พื้นที่สืบหลักฐานของหุ้นตัวเดียว
  // ============================================================
  function sec(n, title, body, sub, cls) {
    return '<section class="ch-blk ' + (cls || "") + '"><h3><span>' + n + "</span>" + esc(title) + "</h3>" +
      (sub ? '<p class="ch-sub">' + sub + "</p>" : "") + body + "</section>";
  }
  function unavailable(msg) {
    return '<div class="ch-unavail">Evidence unavailable' + (msg ? " — " + esc(msg) : "") + "</div>";
  }
  function srcTag(src, url) {
    if (!src && !url) return "";
    var t = esc(clip(src || "แหล่งที่มา", 64));
    return url ? ' <a class="ch-src" href="' + esc(url) + '" target="_blank" rel="noopener">' + t + " ↗</a>"
      : ' <span class="ch-src">' + t + "</span>";
  }

  // ---------- 7.5 ตาราง Before → Latest → Direction ----------
  // ค่าทุกช่องมาจาก fi.metrics[k] ตรง ๆ: before = ค่าที่ yoyRefDate จาก series (margin ใช้ basePct)
  var FIN_METRICS = [
    { key: "REVENUE_INFLECTION", label: "รายได้ (Revenue)", unit: "money" },
    { key: "EPS_INFLECTION", label: "กำไรต่อหุ้น (EPS)", unit: "share" },
    { key: "MARGIN_INFLECTION", label: "มาร์จิ้นสุทธิ (Margin)", unit: "margin" },
    { key: "FCF_INFLECTION", label: "กระแสเงินสดอิสระ (FCF)", unit: "money" },
    // หนี้: ค่าน้อยกว่าคือดีกว่า — ต้องกำกับไว้ ไม่งั้นลูกศร ▲ อ่านผิด
    { key: "DEBT_IMPROVEMENT", label: "ภาระหนี้ (Debt)", unit: "money", hint: "ลดลง = ดีขึ้น" },
  ];
  // BACKLOG_INFLECTION วันนี้ UNAVAILABLE ตลอด (ไม่มีแหล่งข้อมูลของหุ้นไทย) จึงประกาศใต้ตารางแทนแถวเปล่า
  // แต่ถ้าวันหนึ่งมีข้อมูลจริง ต้องกลับมาเป็นแถวในตาราง ไม่ใช่หายไปเงียบ ๆ
  var BACKLOG_KEY = "BACKLOG_INFLECTION";
  var BACKLOG_ROW = { key: BACKLOG_KEY, label: "Backlog / งานในมือ", unit: "money" };
  function finRows(fi) {
    var m = fi.metrics[BACKLOG_KEY];
    var backlogAvailable = m && m.state && m.state.n >= 0;
    return backlogAvailable ? FIN_METRICS.concat([BACKLOG_ROW]) : FIN_METRICS;
  }
  function seriesAt(m, date) {
    if (!m || !m.series || !date) return null;
    for (var i = 0; i < m.series.length; i++) if (m.series[i].date === date) return m.series[i].v;
    return null;
  }
  function fmtUnit(v, unit) {
    if (v == null) return "—";
    if (unit === "share") return perShare(v);
    if (unit === "margin") return v + "%";
    return money(v);
  }
  function finTable(fi) {
    var rows = finRows(fi).map(function (d) {
      var m = fi.metrics[d.key];
      if (!m || !m.state) return "";
      var unavail = m.state.n < 0;
      if (unavail) {
        return '<tr class="ch-m-unavail"><th>' + esc(d.label) + "</th>" +
          '<td colspan="3"><span class="ch-na">UNAVAILABLE</span>' +
          (m.reason ? ' <span class="ch-src">' + esc(clip(m.reason, 92)) + "</span>" : "") + "</td>" +
          '<td><span class="ch-mstate ch-tone-grey">UNAVAILABLE</span></td></tr>';
      }
      var before, latest, dir;
      if (d.unit === "margin") {
        before = m.basePct == null ? "—" : m.basePct + "%";
        latest = m.latestPct == null ? "—" : m.latestPct + "%";
        dir = m.yoyPp == null ? "—" : pp(m.yoyPp);
      } else {
        before = fmtUnit(seriesAt(m, m.yoyRefDate), d.unit);
        latest = fmtUnit(m.latest, d.unit);
        dir = m.yoyPct == null ? "—" : pct(m.yoyPct) + " YoY";
      }
      var up = (d.unit === "margin" ? m.yoyPp : m.yoyPct);
      // ลูกศรบอก "ตัวเลขขึ้นหรือลง" เท่านั้น ไม่ได้บอกดี/แย่ —
      // ความหมายดี/แย่อ่านจากคอลัมน์ Engine state และจากป้าย "ลดลง = ดีขึ้น" ของแถวหนี้
      var arrow = up == null ? "" : (up > 0 ? "▲" : (up < 0 ? "▼" : "•"));
      return "<tr><th>" + esc(d.label) +
        (d.hint ? "<small>" + esc(d.hint) + "</small>" : "") +
        (m.yoyRefDate ? '<small>เทียบ ' + esc(m.yoyRefDate) + "</small>" : "") + "</th>" +
        '<td class="ch-num">' + esc(before) + "</td>" +
        '<td class="ch-num"><b>' + esc(latest) + "</b>" +
        (m.latestDate ? "<small>" + esc(m.latestDate) + "</small>" : "") + "</td>" +
        '<td class="ch-num ch-txt-' + finTone(m.state.key) + '">' + arrow + " " + esc(dir) +
        // streak ของ engine นับจาก "ค่าดิบขึ้นต่อเนื่องแบบ QoQ" ซึ่งเป็นฐานต่างจาก YoY ในช่องเดียวกัน
        (m.streak ? '<small>QoQ ขึ้นต่อเนื่อง ' + m.streak + " งวด</small>" : "") + "</td>" +
        '<td><span class="ch-mstate ch-tone-' + finTone(m.state.key) + '">' +
        esc(m.state.key.replace("_INFLECTION", "")) + "</span>" +
        (m.levelNote ? '<small class="ch-src">' + esc(clip(m.levelNote, 84)) + "</small>" : "") +
        (m.signFlip ? '<small class="ch-src">' + esc(m.signFlip) + "</small>" : "") + "</td></tr>";
    }).join("");
    return '<div class="ch-tablewrap"><table class="ch-mtable"><thead><tr>' +
      "<th>Metric</th><th>Before</th><th>Latest</th><th>Direction</th><th>Engine state</th>" +
      "</tr></thead><tbody>" + rows + "</tbody></table></div>";
  }

  // วันที่/แหล่งของแต่ละขั้น — อ่านจากฟิลด์ที่ engine ให้มาแล้วเท่านั้น
  // BUSINESS IMPACT และ RE-RATING: engine ไม่ได้ให้วันและแหล่ง ⇒ ต้องขึ้นว่าไม่มี ห้ามเติม
  function chainMeta(step, r, fi) {
    // ต้องอ้างหลักฐานชิ้นเดียวกับที่ engine เลือกเป็นตัวนำ (headline) —
    // ถ้า UI เรียงเองแล้วเสมอกัน อาจได้ชิ้นอื่นที่วันเดียวกันแต่แหล่งต่างกัน
    var all = (r.story && r.story.evidenceItems) || [];
    var head = r.qualification && r.qualification.dimensions &&
      r.qualification.dimensions.C_catalyst ? r.qualification.dimensions.C_catalyst.headline : null;
    var ev = null;
    if (head) {
      for (var i = 0; i < all.length; i++) if (all[i].title === head) { ev = all[i]; break; }
    }
    if (step === "CATALYST" && ev) {
      return { date: ev.eventDate, src: ev.sourceName || ev.sourceType, url: ev.sourceUrl || null };
    }
    if (step === "FINANCIAL IMPACT" && fi && fi.available) {
      return { date: fi.latestQuarter, src: fi.source, asOf: true };
    }
    if (step === "MARKET RECOGNITION" && r.drawdown && r.drawdown.priceDate) {
      return { date: r.drawdown.priceDate, src: "ราคา/วอลุ่ม", asOf: true };
    }
    return null;
  }
  function chainMetaHtml(step, r, fi) {
    var mt = chainMeta(step, r, fi);
    if (!mt) {
      return '<span class="ch-chain-meta ch-na">Date / Source: Evidence unavailable</span>';
    }
    return '<span class="ch-chain-meta">' + (mt.asOf ? "ข้อมูล ณ " : "") + esc(mt.date || "—") +
      srcTag(mt.src, mt.url) + "</span>";
  }

  function detail(ticker) {
    var r = state.rows.filter(function (x) { return x.ticker === ticker; })[0];
    if (!r) {
      return header(true) + '<div class="ch-empty"><b>ยังไม่มีข้อมูลของ ' + esc(ticker) + "</b><br>" +
        "กด “สแกนใหม่” หรือกลับไปหน้า Radar</div>";
    }
    var q = Qof(r);
    var fi = r.financialInflection;
    var h = header(true);

    // ---------- 7.1 HEADER ----------
    var hdDims = [
      ["52W Drawdown", ddPct(r) == null ? "—" : pct(ddPct(r)),
        r.drawdown && r.drawdown.state ? r.drawdown.state.label : "", "grey"],
      [bizCount(r) > 0 ? "Business/Event Catalyst" : "Catalyst",
        matShort(r), matLabel(r), matTone(r)],
      ["Financial Inflection", finShort(r), fi && fi.available ? fi.quarterCount + " ไตรมาส" : "ยังไม่มีตัวเลขงบ",
        finTone(finState(r))],
      ["Market Recognition", recogKey(r), r.recognition && r.recognition.state ? r.recognition.state.thai : "",
        recogTone(recogKey(r))],
      ["Value Trap", trapPlain(r), r.valueTrap && r.valueTrap.risk ? r.valueTrap.risk.thai : "",
        trapTone(trapKey(r))],
      ["Lifecycle", r.lifecycle || "—", "", "grey"],
    ];
    h += '<section class="ch-dhead"><div class="ch-dhead-id">' +
      "<h2>" + esc(r.ticker) + "<small>" + esc(r.market) + "</small></h2>" +
      '<p class="ch-dname">' + esc(r.name || "") + "</p>" +
      '<span class="ch-badge ch-badge-lg ch-tone-' + tone(statusKey(r)) + '">' + esc(statusLabel(r)) + "</span>" +
      // สองข้อเท็จจริงพร้อมกันได้: สถานะหลัก + ธงงบฟื้น
      (hasRecoveryFlag(r)
        ? '<span class="ch-badge ch-badge-lg ch-flag-badge" title="' +
          esc("งบฟื้น แต่ยังไม่พบ catalyst เชิงธุรกิจอิสระ — เป็นคำตอบของคำถามที่ต่างกัน") +
          '">+ FUNDAMENTAL RECOVERY</span>' : "") +
      "</div>" +
      '<div class="ch-dhead-dims">' + hdDims.map(function (d) {
        return '<div class="ch-dhcell ch-tone-' + d[3] + '"><small>' + esc(d[0]) + "</small><b>" + esc(d[1]) +
          "</b>" + (d[2] ? "<em>" + esc(clip(d[2], 52)) + "</em>" : "") + "</div>";
      }).join("") + "</div>" +
      '<p class="ch-src ch-dhead-fresh">ข้อมูล ณ ' + esc(freshness()) + "</p></section>";

    // ---------- 7.2 WHY IS THIS STOCK HERE ----------
    var D = (q && q.dimensions) || {};
    var dims = [
      ["Deep Drawdown", ddPct(r) == null ? "—" : pct(ddPct(r)) + " จาก high 52W",
        D.A_price ? (D.A_price.label || "") + (D.A_price.deep ? " · ย่อลึก" : " · ยังไม่เข้าเกณฑ์ย่อลึก") : null],
      ["Catalyst", matLabel(r),
        D.C_catalyst ? D.C_catalyst.availability + " · เหตุการณ์ธุรกิจ " + bizCount(r) + " ชิ้น" +
          (finEvCount(r) ? " · หลักฐานงบ " + finEvCount(r) + " ชิ้น" : "") : null],
      ["Financial Inflection", finShort(r),
        fi && fi.available
          ? fi.quarterCount + " ไตรมาส · รายการหลักที่ยืนยันแล้ว " + fi.confirmedCoreCount + " จาก 3"
          : "ยังไม่มีตัวเลขงบ"],
      ["Market Recognition", recogKey(r), r.recognition && r.recognition.state ? r.recognition.state.thai : null],
      ["Value Trap", trapPlain(r), r.valueTrap && r.valueTrap.risk ? r.valueTrap.risk.thai : null],
    ];
    h += sec(1, "ทำไมหุ้นตัวนี้อยู่ที่นี่",
      '<div class="ch-whygrid">' + dims.map(function (d) {
        return '<div class="ch-whycell"><small>' + esc(d[0]) + "</small><b>" + esc(d[1]) + "</b>" +
          (d[2] ? "<em>" + esc(clip(d[2], 76)) + "</em>" : "") + "</div>";
      }).join("") + "</div>" +
      // PHASE 5 — งบฟื้นโดยไม่มีเหตุการณ์เชิงธุรกิจ ต้องพูดตรง ๆ ไม่เรียกว่า catalyst
      (isRecoveryOnly(r)
        ? '<div class="ch-recovery-note"><b>FUNDAMENTAL RECOVERY</b>' +
          "<p>งบฟื้น แต่ยังไม่พบ catalyst เชิงธุรกิจอิสระ — " +
          "ตัวเลขที่ดีขึ้น (" + esc(finShort(r)) + ") เป็น<strong>ผลลัพธ์</strong> " +
          "ไม่ใช่เหตุการณ์ที่ทำให้ธุรกิจเปลี่ยน · ระบบตรวจข้อมูลเผยแพร่และเอกสาร ก.ล.ต. แล้ว " +
          "ยังไม่พบสัญญา/ลูกค้า/โครงการ/การแปลงสินทรัพย์ที่อธิบายกลไกได้</p></div>"
        : "") +
      (q && q.whyInteresting ? '<div class="ch-explain ch-explain-lead"><p>' + esc(q.whyInteresting) + "</p></div>" : "") +
      (q ? '<div class="ch-explain">' + q.why.map(function (w) { return "<p>" + esc(w) + "</p>"; }).join("") + "</div>" : "") +
      (q && q.flags && q.flags.length ? '<p class="ch-note">ธงเสริม: ' + q.flags.map(esc).join(" · ") + "</p>" : ""),
      "ประกอบจากค่าที่ engine คำนวณไว้เท่านั้น — ไม่มีการเขียนบรรยายเพิ่ม และช่องที่ไม่มีข้อมูลจะขึ้น UNKNOWN · " +
      "<strong>ย่อลึก ≠ โอกาส</strong> และ <strong>C4 ≠ การันตีว่าธุรกิจเปลี่ยน</strong> " +
      "(C4 คือความแข็งของหลักฐาน ไม่ใช่ขนาดของผลกระทบ)",
      "ch-blk-primary");

    // ---------- 7.3 EVIDENCE CHAIN ----------
    var chain = q && q.rerating ? q.rerating : null;
    var chainBody;
    if (chain && chain.chain && chain.chain.length) {
      chainBody = '<div class="ch-chain">' + chain.chain.map(function (s, i) {
        var nx = chain.chain[i + 1];
        var isLast = i === chain.chain.length - 1;
        var lastGap = isLast && !s.supported;
        var label = s.step === "RE-RATING" && !s.supported
          ? "Re-rating evidence: not established" : (s.state || "Evidence unavailable");
        // ตัวเชื่อม: ทึบเมื่อสองขั้นที่ติดกันมีหลักฐานทั้งคู่ · ขาดเมื่อขั้นใดขั้นหนึ่งยังไม่มี
        var link = isLast ? "" :
          (s.supported && nx.supported
            ? '<span class="ch-chain-link is-solid" aria-hidden="true">↓</span>'
            : '<span class="ch-chain-link is-broken">⋯ <em>หลักฐานไม่ต่อเนื่อง — ยังไม่ได้พิสูจน์ว่าเชื่อมกัน</em></span>');
        return '<div class="ch-chain-step ' + (s.supported ? "is-ok" : "is-gap") + '">' +
          '<span class="ch-chain-ico">' + (s.supported ? "✓" : "?") + "</span><div><b>" + esc(s.step) + "</b>" +
          '<span class="ch-chain-state">' + esc(label) + "</span>" +
          (s.supported ? "<p>" + esc(s.detail) + "</p>"
            : '<p class="ch-na">' + esc(s.detail || "Evidence unavailable") + "</p>") +
          chainMetaHtml(s.step, r, fi) +
          (lastGap ? '<p class="ch-note ch-note-warn">ขั้นสุดท้ายยังไม่มีหลักฐาน — ห้ามอ่านเป็นการคาดการณ์ราคา</p>' : "") +
          "</div></div>" + link;
      }).join("") + "</div>" +
        '<p class="ch-note">' + esc(chain.note || "") +
        (chain.brokenAt ? " · ห่วงโซ่ขาดที่ขั้น " + esc(chain.brokenAt) : "") + "</p>";
    } else {
      chainBody = unavailable("ยังไม่มีผลห่วงโซ่");
    }
    h += sec(2, "ห่วงโซ่หลักฐาน (Evidence Chain)", chainBody,
      "เป็นห่วงโซ่ของ<strong>หลักฐาน</strong> ไม่ใช่การพยากรณ์ · ขั้นที่ยังไม่มีหลักฐานจะขึ้น Evidence unavailable " +
      "และตัวเชื่อมจะขาด — ระบบไม่ลากเส้นให้ดูเหมือนพิสูจน์ความเป็นเหตุเป็นผลแล้ว");

    // ---------- 7.4 WHY DID THE STOCK FALL ----------
    var wf = r.whyFell || {};
    h += sec(3, "ทำไมราคาตก",
      '<div class="ch-kv-lg"><span class="ch-whybadge ch-whybadge-lg ch-tone-' + whyTone(whyKey(r)) + '">' +
      esc(whyBadgeText(r)) + "</span><b>" + esc(wf.category || "UNKNOWN") + "</b><span>" +
      esc(wf.thai || "") + "</span></div>" +
      // UNKNOWN ต้องบอกตรง ๆ ว่าหลักฐานยังไม่ระบุสาเหตุ — แม้จะมีข้อเท็จจริงเชิงราคาประกอบอยู่
      (whyKey(r) === "UNKNOWN"
        ? '<div class="ch-unavail">หลักฐานที่มีอยู่ยังไม่ระบุสาเหตุที่เจาะจงได้ ' +
          "(Available evidence does not establish a specific cause.)</div>"
        : "") +
      (wf.evidence && wf.evidence.length
        ? '<h4>Supported by</h4><ul class="ch-list">' +
          wf.evidence.map(function (e) { return "<li>" + esc(e) + "</li>"; }).join("") + "</ul>"
        : (whyKey(r) === "UNKNOWN" ? "" : unavailable("ไม่มีหลักฐานประกอบ"))) +
      (wf.unknowns && wf.unknowns.length
        ? '<div class="ch-unknowns"><small>ยังไม่ทราบ</small><ul>' +
          wf.unknowns.map(function (u) { return "<li>" + esc(u) + "</li>"; }).join("") + "</ul></div>" : "") +
      (wf.inferredFromPriceOnly
        ? '<p class="ch-note ch-note-warn">หมวดนี้มาจากการเทียบราคากับดัชนีเท่านั้น — ยังไม่ใช่สาเหตุทางธุรกิจ' +
          (wf.gapVsIndexPp != null ? " (ต่างจากดัชนี " + pp(wf.gapVsIndexPp) + ")" : "") + "</p>" : "") +
      (wf.note ? '<p class="ch-note">' + esc(wf.note) + "</p>" : ""),
      "ราคาที่ลงไม่ได้แปลว่าธุรกิจแย่ — ระบบแยกข้อเท็จจริงเชิงราคาออกจากหลักฐานเชิงธุรกิจ " +
      "และไม่สร้างเรื่องเล่าเชิงสาเหตุจากราคาเพียงอย่างเดียว");

    // ---------- 7.5 WHAT CHANGED ----------
    h += sec(4, "อะไรเปลี่ยนในตัวเลข",
      fi && fi.available
        ? finTable(fi) +
          '<p class="ch-note">งบ ' + fi.quarterCount + " ไตรมาส · ล่าสุด " + esc(fi.latestQuarter || "—") +
          " · รายการหลักที่ยืนยันแล้ว " + fi.confirmedCoreCount + " จาก 3 (รายได้ / EPS / มาร์จิ้น)" +
          srcTag(fi.source) + "</p>" +
          (fi.metrics[BACKLOG_KEY] && fi.metrics[BACKLOG_KEY].state &&
            fi.metrics[BACKLOG_KEY].state.n < 0
            ? '<p class="ch-note">ไม่มีในตาราง: <b>Backlog</b> — ' +
              esc(fi.metrics[BACKLOG_KEY].reason || "ไม่มีแหล่งข้อมูล") +
              " (ช่องว่างนี้เป็นข้อจำกัดของแหล่งข้อมูล ไม่ใช่ว่าบริษัทไม่มีงานในมือ)</p>" : "") +
          (fi.contradictionNote ? '<p class="ch-note ch-note-warn">' + esc(fi.contradictionNote) + "</p>" : "") +
          (fi.crossCheckNote ? '<p class="ch-note ch-note-warn">' + esc(fi.crossCheckNote) + "</p>" : "")
        : unavailable(fi && fi.note ? fi.note : "ยังไม่มีตัวเลขงบรายไตรมาส"),
      "ทิศทางและหลักฐาน ไม่ใช่คะแนน · Before = งวดเดียวกันปีก่อน (มาร์จิ้นใช้ฐานที่ engine ใช้เทียบ) · " +
      "ช่องที่ไม่มีข้อมูลขึ้น UNAVAILABLE ไม่ใช่ 0 · <strong>งบพลิก ≠ catalyst</strong> — " +
      "ตัวเลขที่ดีขึ้นเป็นผลลัพธ์ ไม่ใช่เหตุการณ์ที่ทำให้ธุรกิจเปลี่ยน");

    // ---------- 7.6 VALUE TRAP CHECK ----------
    var vt = r.valueTrap || {};
    var vtKey = trapKey(r);
    var vtCount = trapCount(r);
    var vtTitle = vtKey === "HIGH" ? "VALUE TRAP RISK" : "ตรวจ Value Trap";
    var vtBanner = '<div class="ch-vt ch-tone-' + trapTone(vtKey) + (vtKey === "HIGH" ? " is-high" : "") + '">' +
      "<b>" + esc(vtKey) + "</b>" +
      (vtKey !== "UNKNOWN" && vtCount != null
        ? '<span class="ch-sigcount ch-sigcount-lg">' + vtCount + " signals</span>" : "") +
      "<span>" + esc(vt.risk ? vt.risk.thai : "") + "</span></div>";
    var vtBody;
    if (vtKey === "UNKNOWN") {
      vtBody = '<div class="ch-unavail"><b>Insufficient financial evidence — UNKNOWN does not mean safe.</b><br>' +
        "ข้อมูลงบไม่พอจะสรุป — <strong>UNKNOWN ไม่ได้แปลว่าปลอดภัย</strong>" +
        (vt.note ? "<br>เหตุผล: " + esc(vt.note) : "") + "</div>";
    } else if (vt.signals && vt.signals.length) {
      vtBody = '<div class="ch-vt-cols"><div><h4>สัญญาณเสื่อมที่พบ (' + vt.signals.length + ")</h4>" +
        '<ul class="ch-list">' +
        vt.signals.map(function (s) { return '<li><span class="ch-warn">⚠</span> ' + esc(s) + "</li>"; }).join("") +
        "</ul></div>" +
        (vt.improving && vt.improving.length
          ? '<div><h4>สัญญาณที่ดีขึ้น (ใช้หักล้าง)</h4><ul class="ch-list">' +
            vt.improving.map(function (s) { return '<li><span class="ch-ok">✓</span> ' + esc(s) + "</li>"; }).join("") +
            "</ul></div>" : "") + "</div>";
    } else {
      vtBody = '<p class="ch-note">ไม่พบสัญญาณเสื่อมเชิงโครงสร้างจากงบที่ตรวจ ' +
        (vt.quartersUsed ? "(" + vt.quartersUsed + " ไตรมาส)" : "") + "</p>" +
        (vt.improving && vt.improving.length
          ? '<h4>สัญญาณที่ดีขึ้น</h4><ul class="ch-list">' +
            vt.improving.map(function (s) { return '<li><span class="ch-ok">✓</span> ' + esc(s) + "</li>"; }).join("") +
            "</ul>" : "");
    }
    h += sec(5, vtTitle, vtBanner + vtBody +
      '<p class="ch-note">' + esc(vt.note || "") + srcTag(vt.source) + "</p>",
      "ต้องแสดงเสมอ — และ UNKNOWN ไม่ได้แปลว่าปลอดภัย · ตัวเลขคือ<strong>จำนวนสัญญาณ</strong> ไม่ใช่คะแนน",
      vtKey === "HIGH" ? "ch-blk-danger" : "");

    // ---------- 7.7 EVIDENCE TENSION ----------
    // หน้า Detail ต้องได้หลักฐานครบ (storyLimit = null) และตัดชื่อยาวขึ้นเพื่อให้แยกรายการออกจากกันได้
    // 170 ตัวอักษร: ชื่อเอกสาร SET ที่ต่างกันตรงท้าย (เช่น "(Revised)") ต้องไม่ถูกตัดจนเหลือข้อความเดียวกัน
    var pos = positiveEvidence(r, null, 170), risk = riskEvidence(r);
    var tensionBody;
    if (pos.length && risk.length) {
      tensionBody = '<div class="ch-tension"><div class="ch-tension-col ch-tension-pos">' +
        "<h4>POSITIVE EVIDENCE <span>" + pos.length + " รายการ</span></h4>" +
        '<ul class="ch-list">' + pos.map(function (e) {
          return '<li><span class="ch-ok">✓</span> ' + esc(e.text) +
            (e.detail ? " <em>" + esc(e.detail) + "</em>" : "") +
            (e.layer ? ' <span class="ch-ev-layer">' + esc(e.layer) + "</span>" : "") +
            (e.copies > 1 ? ' <span class="ch-copies">' + e.copies + " ฉบับ (พาดหัวเดียวกัน)</span>" : "") +
            (e.supportingOnly ? ' <span class="ch-tag-sup">สนับสนุน</span>' : "") + srcTag(e.src, e.url) +
            (e.moreUrls || []).map(function (u, i) {
              return ' <a class="ch-src" href="' + esc(u) + '" target="_blank" rel="noopener">ฉบับที่ ' +
                (i + 2) + " ↗</a>";
            }).join("") + "</li>";
        }).join("") + "</ul></div>" +
        '<div class="ch-tension-col ch-tension-neg"><h4>RISK EVIDENCE <span>' + risk.length + " รายการ</span></h4>" +
        '<ul class="ch-list">' + risk.map(function (e) {
          return '<li><span class="ch-warn">⚠</span> ' + esc(e.text) + srcTag(e.src, e.url) + "</li>";
        }).join("") + "</ul></div></div>";
    } else if (pos.length || risk.length) {
      var only = pos.length ? pos : risk;
      tensionBody = '<div class="ch-tension"><div class="ch-tension-col ' +
        (pos.length ? "ch-tension-pos" : "ch-tension-neg") + '"><h4>' +
        (pos.length ? "POSITIVE EVIDENCE" : "RISK EVIDENCE") + " <span>" + only.length + " รายการ</span></h4>" +
        '<ul class="ch-list">' + only.map(function (e) {
          return "<li>" + (pos.length ? '<span class="ch-ok">✓</span> ' : '<span class="ch-warn">⚠</span> ') +
            esc(e.text) + srcTag(e.src, e.url) + "</li>";
        }).join("") + "</ul></div></div>" +
        '<p class="ch-note">ไม่พบหลักฐานที่ขัดกันอย่างมีนัย ' +
        "(No material conflicting evidence detected.)</p>";
    } else {
      tensionBody = unavailable("ยังไม่มีหลักฐานทั้งสองด้าน");
    }
    h += sec(6, "หลักฐานที่ขัดกันเอง (Evidence Tension)", tensionBody,
      "หมวดบวก/ลบมาจากผลที่ engine จัดไว้แล้ว — หน้านี้ไม่ตัดสินเอง และไม่เติมฝ่ายใดฝ่ายหนึ่งให้ครบคู่ · " +
      "ป้ายเล็กหลังแต่ละบรรทัดคือ<strong>ชั้นที่หลักฐานมาจาก</strong> — เรื่องเดียวกันอาจถูกยืนยันจากหลายชั้น " +
      "จำนวนรายการจึงไม่ใช่จำนวนข้อเท็จจริงที่เป็นอิสระต่อกัน และไม่ใช่คะแนน");

    // ---------- 7.8 INSIDER ACTIVITY ----------
    var ia = r.insiderActivity;
    var iaRange = "";
    if (ia && ia.references && ia.references.length) {
      var ds = ia.references.map(function (x) { return x.date; }).filter(Boolean).sort();
      if (ds.length) iaRange = ds[0] + " → " + ds[ds.length - 1];
    }
    h += sec(7, "การซื้อขายของผู้บริหาร (Insider Activity)",
      ia && ia.state
        ? '<div class="ch-kv-lg"><b>' + esc(ia.state.key) + "</b><span>" + esc(ia.state.thai || "") + "</span></div>" +
          (ia.state.key === "UNKNOWN"
            ? '<div class="ch-unavail">' + esc(ia.note || "ยังไม่พบรายการในช่วงที่ตรวจ") + "</div>"
            : '<div class="ch-ins-grid"><div><small>ซื้อ (buys) ทั้งชุด</small><b>' + na(ia.buyCount) + "</b></div>" +
              "<div><small>ขาย (sells) ทั้งชุด</small><b>" + na(ia.sellCount) + "</b></div>" +
              (ia.recentBuyCount != null && ia.recentSellCount != null
                ? "<div><small>ซื้อ/ขาย ในช่วงที่ใช้ตัดสินทิศทาง</small><b>" +
                  ia.recentBuyCount + " / " + ia.recentSellCount + "</b></div>" : "") +
              "<div><small>ล่าสุด</small><b>" + esc(na(ia.latestDate)) + "</b></div>" +
              (iaRange ? "<div><small>ช่วงที่พบรายการ</small><b>" + esc(iaRange) + "</b></div>" : "") +
              (ia.directionBasis ? "<div><small>ทิศทางจาก</small><b>" + esc(ia.directionBasis) + "</b></div>" : "") +
              "</div>" +
              (ia.references && ia.references.length
                ? '<ul class="ch-list ch-list-sm">' + ia.references.slice(0, 5).map(function (x) {
                    return "<li>" + esc(x.date || "—") + srcTag(x.source, x.url) + "</li>";
                  }).join("") + "</ul>" : "")) +
          '<p class="ch-note ch-note-warn">เป็นหลักฐาน<strong>สนับสนุน</strong>เท่านั้น — ' +
          "ไม่ยกระดับ catalyst ไปเป็น C3/C4 และลำพังไม่สร้างสถานะโอกาส<br>" +
          '<span class="ch-en">Insider activity is supporting evidence and does not independently create ' +
          "Catalyst C3/C4.</span></p>"
        : unavailable("ยังไม่มีผลการตรวจเอกสาร ก.ล.ต."),
      "ที่มา: ก.ล.ต. แบบ 59 · ไม่มีคะแนน insider และไม่ใช้จัดอันดับระหว่างบริษัท");

    // ---------- 7.9 MARKET RECOGNITION ----------
    var rg = r.recognition || {};
    var rm = rg.metrics || {};
    h += sec(8, "ตลาดรับรู้แล้วแค่ไหน (Market Recognition)",
      '<div class="ch-kv-lg"><b>' + esc(recogKey(r)) + "</b><span>" + esc(rg.state ? rg.state.thai : "") + "</span></div>" +
      "<h4>Supporting facts</h4>" +
      '<div class="ch-ins-grid"><div><small>RS 3 เดือน vs ดัชนี</small><b>' +
      (rm.relStrength3mPp == null ? "—" : pp(rm.relStrength3mPp)) + "</b></div>" +
      "<div><small>เด้งจาก low 52W</small><b>" + pct(rm.offLow52wPct) + "</b></div>" +
      "<div><small>เด้งเกินดัชนี</small><b>" + (rm.offLowExcessPp == null ? "—" : pp(rm.offLowExcessPp)) + "</b></div>" +
      "<div><small>วอลุ่ม 20 vs 60 วัน</small><b>" +
      (rm.volumeRatio20vs60 == null ? '<span class="ch-na">ไม่มีข้อมูล</span>' : rm.volumeRatio20vs60 + "x") +
      "</b></div>" +
      "<div><small>ฐานยกสูงขึ้น</small><b>" + (rm.higherLows == null ? "—" : (rm.higherLows ? "ใช่" : "ไม่")) +
      "</b></div></div>" +
      (rg.evidence && rg.evidence.length
        ? '<ul class="ch-list">' + rg.evidence.map(function (e) { return "<li>" + esc(e) + "</li>"; }).join("") + "</ul>" : "") +
      (rm.volumeAnomaly ? '<p class="ch-note ch-note-warn">ข้อมูลวอลุ่มผิดปกติ — ไม่ถูกนำมานับ</p>' : "") +
      '<p class="ch-note">' + esc(rg.note || "") + "</p>",
      "เป็นตัวชี้เชิงราคา ไม่ใช่ตัวบอกว่ามี catalyst · ตัวเลขทั้งหมดมาจาก engine ไม่ได้แปลงเป็นคะแนน");

    // ---------- 7.10 WHAT IS STILL MISSING ----------
    h += sec(9, "ยังขาดหลักฐานอะไร (What is still missing)",
      q && q.missing && q.missing.length
        ? '<ul class="ch-list ch-miss-list">' + q.missing.map(function (m) {
            return '<li><span class="ch-miss">⚠</span> <b>' + esc(m.item) + "</b>" +
              '<span class="ch-miss-why">' + esc(m.why) + "</span>" +
              '<span class="ch-src">หาต่อได้ที่: ' + esc(m.where) + "</span></li>";
          }).join("") + "</ul>"
        : unavailable("ไม่มีรายการที่บันทึกไว้"),
      "ตอบคำถามว่า “ยังต้องไปตรวจอะไรอีกก่อนจะเชื่อ thesis นี้” — รายการมาจาก engine เท่านั้น ไม่ได้คิดหมวดเพิ่ม",
      "ch-blk-missing");

    // ---------- 7.11 WHAT WOULD PROVE US WRONG ----------
    var fails = (r.story && r.story.failureConditions && r.story.failureConditions.length)
      ? r.story.failureConditions : ((r.invalidation && r.invalidation.conditions) || []);
    h += sec(10, "อะไรจะพิสูจน์ว่าเราคิดผิด (What would prove us wrong)",
      fails.length
        ? '<ul class="ch-list">' + fails.map(function (x) {
            return '<li><span class="ch-warn">✗</span> ' + esc(x) + "</li>";
          }).join("") + "</ul>" +
          (r.invalidation && r.invalidation.note ? '<p class="ch-note">' + esc(r.invalidation.note) + "</p>" : "")
        : unavailable("engine ยังไม่ได้ให้รายการเงื่อนไขสำหรับ thesis ประเภทนี้"),
      "เป็นรายการมาตรฐานตามประเภทของ thesis ที่ engine ใช้ — <strong>ไม่ได้ปรับรายตัวตามหลักฐานของหุ้นนี้</strong> " +
      "จึงอาจมีข้อที่ไม่เกี่ยวกับหุ้นตัวนี้ และบางข้ออ้างข้อมูลที่ระบบยังตรวจไม่ได้ (เช่น backlog — ดูหัวข้อ 5) · " +
      "ไม่มีราคาเป้าหมายและไม่มีจุดตัดขาดทุน");

    // ---------- 7.12 EVIDENCE TIMELINE ----------
    // ไทม์ไลน์รับเฉพาะเหตุการณ์ที่มีอยู่ใน story.timeline ของ engine
    // ห้ามเติมแถวที่ UI แต่งขึ้นจาก "สถานะ" (เช่นระดับการรับรู้ของตลาด) — สถานะไม่ใช่เหตุการณ์
    // และงบไตรมาสมาเป็นหลักฐานอยู่ใน timeline แล้ว การเติมซ้ำทำให้เห็นสองแถวของงวดเดียวกัน
    var tl = (r.story && r.story.timeline) || [];
    var merged = tl.map(function (e) {
      return { date: e.eventDate, kind: e.catalystRelevance === "CATALYST_RELEVANT" ? "EVIDENCE" : "OTHER",
        title: e.title, sourceName: e.sourceName || e.sourceType, url: e.sourceUrl,
        strength: e.evidenceStrength, tier: e.sourceTier, type: e.eventType };
    }).filter(function (e) { return e.date; })
      .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });

    h += sec(11, "ไทม์ไลน์หลักฐาน (Evidence Timeline)",
      merged.length
        ? '<div class="ch-timeline">' + merged.slice(0, 24).map(function (e) {
            return '<div class="ch-tl ch-tl-' + esc(String(e.kind).toLowerCase()) + '">' +
              '<span class="ch-tl-date">' + esc(e.date) + '</span><span class="ch-tl-body"><b>' +
              esc(clip(e.title, 96)) + "</b><small>" +
              '<span class="ch-tl-kind">' + esc(e.kind) + "</span>" +
              (e.type ? " · " + esc(e.type) : "") + (e.strength ? " · " + esc(e.strength) : "") +
              (e.tier ? " · " + esc(e.tier) : "") + srcTag(e.sourceName, e.url) + "</small></span></div>";
          }).join("") + "</div>" +
          (merged.length > 24 ? '<p class="ch-note">แสดง 24 จาก ' + merged.length + " รายการ</p>" : "")
        : unavailable("ยังไม่มีเหตุการณ์ที่ระบุวันได้"),
      "มีเฉพาะเหตุการณ์ที่ตรวจเจอจากแหล่งจริง — ไม่เติมแถวจากสถานะที่ระบบสรุปเอง " +
      "(ระดับการรับรู้ของตลาดอยู่ในหัวข้อ 9 ไม่ใช่เหตุการณ์) · แถวที่ไม่เข้าเกณฑ์ catalyst จะขึ้น OTHER");

    // ---------- 7.13 RELATED CANDIDATES ----------
    var relDefs = [
      ["Same Catalyst", function (x) { return matShort(x) === matShort(r); }],
      ["Same Financial Inflection", function (x) { return finState(x) === finState(r); }],
      ["Same Market Recognition", function (x) { return recogKey(x) === recogKey(r); }],
      ["Same Lifecycle", function (x) { return (x.lifecycle || "") === (r.lifecycle || ""); }],
    ];
    h += sec(12, "หุ้นที่จัดอยู่กลุ่มเดียวกัน (Related Candidates)",
      '<div class="ch-rel">' + relDefs.map(function (d) {
        var all = state.rows.filter(function (x) { return x.ticker !== r.ticker && d[1](x); })
          .sort(function (a, b) { return prio(a) - prio(b); });
        var list = all.slice(0, 8);
        return '<div class="ch-rel-col"><h4>' + esc(d[0]) +
          (all.length ? " <span>" + list.length + " จาก " + all.length + "</span>" : "") + "</h4>" +
          (list.length ? '<div class="ch-rel-chips">' + list.map(function (x) {
            return '<button type="button" class="ch-chipbtn ch-tone-' + tone(statusKey(x)) + '"' +
              ' data-ch-ticker="' + esc(x.ticker) + '" title="' + esc(x.ticker + " · " + statusLabel(x)) + '">' +
              esc(x.ticker) + "</button>";
          }).join("") + "</div>" : '<p class="ch-na">ไม่มี</p>') + "</div>";
      }).join("") + "</div>",
      "จับกลุ่มจากฟิลด์ที่มีอยู่เท่านั้น — ไม่มีคะแนนความคล้ายและไม่มีการจัดอันดับ · " +
      "เรียงตามลำดับความสำคัญของสถานะ แล้วตัดเหลือ 8 ตัวแรก · กลุ่มที่จับจากค่าว่าง " +
      "(เช่น NO CATALYST) จะกว้างมาก ไม่ได้แปลว่าเป็นหุ้นคล้ายกัน");

    var dq = r.dataQuality || {};
    h += '<p class="ch-note ch-foot">ราคา ' + esc(dq.price || "—") + " ณ " + esc(dq.priceAsOf || "—") +
      " (" + na(dq.priceBars) + " แท่ง) · แหล่งหลักฐาน " + esc(dq.catalystKb || "—") +
      (dq.disclosuresChecked != null
        ? " · ตรวจข้อมูลเผยแพร่ " + dq.disclosuresChecked + " รายการ (ประจำ " + na(dq.routineFiltered) +
          " · จำแนกไม่ได้ " + na(dq.unclassified) + ")" : "") +
      " · " + esc(r.disclaimer || "") + " · ไม่ใช่คำสั่งซื้อขาย</p>";
    return h;
  }

  // ============================================================
  // RENDER + EVENTS
  // ============================================================
  function render() {
    var root = el();
    if (!root) return;
    var ticker = urlTicker();
    var body;
    if (state.error) {
      body = header(false) + '<div class="ch-empty"><b>เกิดข้อผิดพลาด</b><br>' + esc(state.error) +
        '<br><button type="button" class="ch-btn" data-ch-rescan="1">ลองอีกครั้ง</button></div>';
    } else if (state.loading && !state.rows.length) {
      var p = state.progress;
      body = header(false) + '<div class="ch-empty">กำลังสแกนหุ้นไทยทั้งตลาด' +
        (p && p.total ? " · " + p.done + "/" + p.total : "") + "…</div>";
    } else if (!state.rows.length) {
      body = header(false) + '<div class="ch-empty"><b>ยังไม่ได้สแกน</b><br>' +
        "Catalyst Hunter สแกนหุ้นไทยทั้งตลาด (SET + mai) ซึ่งใช้เวลาราวหนึ่งนาทีครึ่ง " +
        "จึงไม่เริ่มเองอัตโนมัติ — กด “สแกนใหม่” เพื่อเริ่ม<br>" +
        '<button type="button" class="ch-btn ch-btn-wide" data-ch-rescan="1">เริ่มสแกน</button></div>';
    } else if (ticker) {
      body = detail(ticker);
    } else {
      body = header(false) + radar();
    }
    root.innerHTML = body;
  }

  function onClick(e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest("[data-ch-home]")) { pushUrl("/catalyst-hunter"); render(); window.scrollTo(0, 0); return; }
    if (t.closest("[data-ch-rescan]")) { scanAll(true); return; }
    var fs = t.closest("[data-ch-filter-status]");
    if (fs) {
      var v = fs.getAttribute("data-ch-filter-status");
      state.filter.status = v === "" ? null : (state.filter.status === v ? null : v);
      render(); return;
    }
    var sb = t.closest("[data-ch-sort]");
    if (sb) {
      var k = sb.getAttribute("data-ch-sort");
      if (state.sort.key === k) state.sort.dir = -state.sort.dir;
      else { state.sort.key = k; state.sort.dir = 1; }
      render(); return;
    }
    var tk = t.closest("[data-ch-ticker]");
    if (tk) {
      var sym = tk.getAttribute("data-ch-ticker");
      if (sym) { pushUrl("/catalyst-hunter?ticker=" + encodeURIComponent(sym)); render(); window.scrollTo(0, 0); }
    }
  }
  function onChange(e) {
    var t = e.target;
    if (!t || !t.getAttribute) return;
    var f = t.getAttribute("data-ch-filter");
    if (f) { state.filter[f] = t.value || null; render(); }
  }
  function onInput(e) {
    var t = e.target;
    if (!t || !t.getAttribute || t.getAttribute("data-ch-search") == null) return;
    state.filter.q = t.value || "";
    render();
    // คืนโฟกัสให้ช่องค้นหาหลังเรนเดอร์ใหม่
    var box = document.querySelector("[data-ch-search]");
    if (box) { try { box.focus(); box.setSelectionRange(box.value.length, box.value.length); } catch (err) {} }
  }

  function boot() {
    var root = el();
    if (!root) return;
    root.addEventListener("click", onClick);
    root.addEventListener("change", onChange);
    root.addEventListener("input", onInput);
    window.addEventListener("popstate", function () { render(); });
    // โหลดจาก cache ถ้ามี — ไม่สแกนทั้งตลาด (868 ตัว / ~37 คำขอ) เองโดยผู้ใช้ไม่ได้สั่ง
    if (readCache()) scanAll(false); else render();
  }

  window.CatalystPage = { scanAll: scanAll, render: render, _state: state };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
