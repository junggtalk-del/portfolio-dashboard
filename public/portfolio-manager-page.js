(function () {
  "use strict";

  // ============================================================
  // AI Portfolio Manager — PAGE (Portfolio Decision Layer)
  // "Where should my next dollar go?" — ไม่ใช่หน้าเทรด ไม่ใช่หน้า execution
  //
  // หน้านี้เป็นแค่ adapter + renderer:
  //  - น้ำหนัก/เงินสด: sleeve หุ้นต่างประเทศจาก window.ForeignSleeve.sleeveOf
  //    · โหมด pm (กรอกช่อง "เงินสดรอซื้อหุ้นต่างประเทศ" แล้ว + มี holdings): ฐาน % = Σ หุ้นที่ถือ + เงินสดที่กรอก
  //    · โหมด editor (ยังไม่กรอก / holdings ยังไม่มา): สูตรเดิม — Quarterly Editor bucket "หุ้นต่างประเทศ"
  //      (gross รวมเงินสดใน sleeve) · เงินสด = gross − Σ หุ้น
  //  - เอกสารพอร์ต: GET /api/portfolio สดตอนเปิดหน้า (psCache) ใช้แทน snapshot.portfolioStatus ที่อาจค้าง
  //  - ช่องเงินสด: บันทึก = GET สด → เอกสารว่าง = ไม่ PUT → สำเนาทุกคีย์ + foreignSleeve { cash, updatedAt } → PUT
  //    (โครงเดียวกับ allocation-card-page.js persistPlan · ไม่เคย PUT เอกสารที่แปลงแล้ว — ไม่มี fromPM)
  //    ล้มเหลว = ร่าง localStorage "pm_foreign_cash_draft_v1" + ปุ่มลองใหม่ · ร่างล้างหลัง PUT สำเร็จเท่านั้น
  //  - แถวหุ้นต่างประเทศของไตรมาสล่าสุดที่ยังไม่จบ (โหมด pm เท่านั้น): PUT เดียวกันเขียนแถวนั้นเป็นค่า PM
  //    (ForeignSleeve.applyToDoc mark:false) · หลังแก้มูลค่าหุ้นรายตัวสำเร็จ = GET สด → แถวเดียวกัน → PUT (หน่วง ~1.5 วิ)
  //    → ไตรมาสที่เก็บไว้ = ค่า PM ล่าสุดตอนสิ้นไตรมาส (วันแรกของไตรมาสใหม่ผู้อ่านใช้ค่าที่เก็บ — ผลตอบแทนไม่กระโดดข้ามคืน)
  //  - ตำแหน่ง: snapshot.portfolioHoldings (ต้นทุนเฉลี่ยจาก averageCost ถ้ามี)
  //  - ทุกการตัดสินใจ: window.PMEngine (ThesisEngine เป็นแกน — deterministic)
  //  - Tier ต่อหุ้น + Entry ที่ deploy แล้ว: localStorage (ผู้ใช้กำหนดเอง)
  // ไม่มีคำ Buy/Sell — Increase Position / Maintain / Wait / Review Thesis
  // ============================================================

  var ROOT_ID = "pmRoot";
  var TIER_STORE = "pmTierConfig_v1";     // { map:{TICKER:"A"}, tiers:{A:{max,target,min},...} }
  var PROGRESS_STORE = "pmEntryProgress_v1"; // { TICKER: {"1":true,...} }
  var STANCE_STORE = "pmMegaStance_v1";   // "bullish"|"bearish" — มุมมอง AI Megatrend ผู้ใช้ตั้งเอง
  var ALLOC_STORE = "pmAllocPolicy_v1";   // { indexTicker, indexPct, splitMethod }
  var CVIEW_STORE = "pmCurrentView_v1";   // "all"|"stocks" — มุมมองตาราง Current Portfolio
  var state = { out: null, cashPct: null, gross: null, invested: null };
  var intelMap = null; // {TICKER: {intel, gate}} จาก IntelligenceEngine — null เมื่อ engine ไม่ได้โหลด

  // ---- ช่องเงินสดรอซื้อหุ้นต่างประเทศ (→ เอกสารพอร์ต foreignSleeve) ----
  var CASH_DRAFT_KEY = "pm_foreign_cash_draft_v1";   // { cash, savedAt } — เขียนเมื่อบันทึกล้มเหลว
  var CASH_LABEL_TH = "เงินสดรอซื้อหุ้นต่างประเทศ";
  var CASH_PM_TH = "หุ้นที่ถือ + เงินสดที่กรอกในหน้านี้";
  var CASH_EDITOR_TH = "ยังไม่ได้กรอกเงินสด — ตอนนี้ใช้ยอดหุ้นต่างประเทศจาก Quarterly Editor";
  var CASH_NOHOLD_TH = "กรอกเงินสดแล้ว แต่รายการหุ้นยังไม่โหลด — ตอนนี้ใช้ยอดหุ้นต่างประเทศจาก Quarterly Editor";
  // ForeignSleeve.sleeveOf reason "past-quarter": กรอกเงินสดแล้ว แต่ Editor เปิดไตรมาสที่เก่ากว่าไตรมาสล่าสุด → ใช้ค่า Editor ของไตรมาสนั้น
  var CASH_PAST_TH = "Quarterly Editor กำลังเปิดไตรมาสเก่า — ใช้ยอดจาก Editor จนกว่าจะกลับไปไตรมาสล่าสุด";
  // reason "quarter-ended" (spec Addendum ข้อ 5): ไตรมาสล่าสุดใน Editor จบแล้วตามปฏิทิน → ใช้ค่าที่เก็บใน Editor จนกว่าจะสร้างไตรมาสใหม่
  var CASH_ENDED_TH = "ไตรมาสใน Quarterly Editor จบแล้ว — สร้างไตรมาสใหม่ใน Editor เพื่อให้หุ้นต่างประเทศตาม AI Portfolio Manager";
  var CASH_INVALID_TH = "เงินสดต้องเป็นตัวเลข ≥ 0";
  var CASH_EMPTY_SERVER_TH = "ข้อมูลพอร์ตบน server ว่าง — ยกเลิกการบันทึกเพื่อกันข้อมูลหาย";
  var CASH_DRAFT_TH = "ใช้ค่าที่ยังไม่ได้บันทึก";
  var CASH_LOCKED_PH = "ล็อกอยู่ — ใส่ค่าใหม่ได้";
  var CASH_KEPT_TH = "ช่องว่าง = ใช้ค่าเดิม (ไม่ได้บันทึกใหม่)";
  var CASH_SUPERSEDED_TH = "มีค่าที่ใหม่กว่าจากเครื่องอื่น — ใช้ค่านั้นแทนร่างที่ค้าง";
  var CASH_BAD_INPUT = "?";   // type=number ที่เบราว์เซอร์อ่านไม่ออก (value "" + badInput) ≠ เว้นว่าง
  var psCache = null;    // คำตอบ GET /api/portfolio สด ({ data: doc }) — ใช้แทน snapshot.portfolioStatus
  var psFetchedAt = 0;   // เวลาที่ตั้ง psCache (ms) — Load Latest Data ที่ใหม่กว่านี้ = ใช้สำเนาใน snapshot แทน
  var psSeq = 0;         // นับการเปลี่ยน psCache — GET ที่ออกไปก่อนการเปลี่ยนครั้งล่าสุดห้ามทับ
  var psInflight = false;    // GET สดกำลังรอคำตอบ — กลับมาที่แท็บ (focus + visibilitychange) ไม่ยิงซ้ำ
  var renderPending = false; // GET สดได้เอกสารใหม่ขณะผู้ใช้พิมพ์อยู่ในช่องของหน้า → รอ focusout ค่อยวาด
  var repatching = false;    // กำลัง patch snapshot ซ้ำ (onSnapshotWritten) — event ของตัวเองไม่ต้องจัดการ
  var cashUi = {
    saveState: "idle",   // "idle" | "saving" | "saved" | "error" | "kept" | "superseded"
    error: null,         // เหตุที่บันทึกไม่สำเร็จ (ข้อความไทย)
    inputError: null,    // ค่าในช่องไม่ผ่าน (ไม่ GET ไม่ PUT)
    typed: null,         // ข้อความที่พิมพ์ค้างในช่อง (วาดใหม่ระหว่างพิมพ์ไม่หาย) · null = ใช้ค่าที่เก็บไว้
    draft: null,         // ร่างที่ยังไม่ได้บันทึก { cash, savedAt }
    draftNotice: null
  };
  var cashEl = null;     // ช่องกรอกของการวาดรอบล่าสุด — ปุ่มบันทึกอ่านค่าจากตัวนี้
  var ownSaved = null;   // เอกสารที่หน้านี้เพิ่ง PUT — event portfolio-allocation-saved ของตัวเองไม่ต้องรับซ้ำ
  // ---- เขียนแถวหุ้นต่างประเทศลงไตรมาสล่าสุดหลังแก้มูลค่าหุ้นรายตัว (หน่วง · ทีละรอบ · ล้มเหลว = บอกสั้น ๆ ไม่มีร่าง) ----
  var ROW_SYNC_DELAY_MS = 1500;
  var ROW_SYNC_FAIL_TH = "ยังเขียนหุ้นต่างประเทศลงไตรมาสใน Quarterly Editor ไม่สำเร็จ — จะลองอีกครั้งเมื่อบันทึกเงินสดหรือมูลค่าหุ้นครั้งถัดไป";
  var rowSync = {
    timer: null,     // รอบที่ตั้งเวลาไว้ (หน่วงหลังบันทึกมูลค่าหุ้นครั้งล่าสุด)
    promise: null,   // รอบที่กำลัง GET/PUT — มีได้ทีละรอบ · บันทึกเงินสดรอรอบนี้ก่อน GET ของตัวเอง
    again: false,    // มีคำขอเข้ามาระหว่างรอบที่ค้าง → ตั้งเวลาใหม่เมื่อรอบนั้นจบ
    failed: false    // รอบล่าสุดล้มเหลว → ข้อความสั้นในกล่องเงินสด (ล้างเมื่อเขียนสำเร็จครั้งถัดไป)
  };

  // ถ้อยคำที่อ้าง "เป้า" — ตัดออกเฉพาะหน้านี้ (engine ยังพูดคำเดิมให้หน้าอื่น)
  // เรียงจากรูปเฉพาะ → รูปกว้าง · anchored ทั้งหมด ถ้า engine เปลี่ยนข้อความ กฎจะไม่ match เฉย ๆ
  var NO_TARGET_TXT = [
    [/ · เติมได้อีก [\d.]+pp ถึงเป้า [\d.]+%/g, ""],
    [/ทุกตำแหน่งอยู่ระดับเป้าหรือยังไม่มี entry ที่ trigger/g, "ยังไม่มี entry ที่ trigger"],
    [/วางฐาน ([\d.]+)% ของเป้าได้/g, "วางฐานได้"],
    [/ถึงเป้า [\d.]+%/g, ""],
    [/ห่างเป้ารวมเพียง/g, "ห่างรวมเพียง"], [/ห่างเป้ารวม/g, "ห่างรวม"], [/ห่างเป้า/g, "ห่าง"],
    [/สอดคล้องเป้าแบบไดนามิก/g, "สอดคล้องแผน"],
    [/ไม่ดันเป้าเพิ่ม/g, "ไม่ดันสัดส่วนเพิ่ม"],
    [/ระบบแบ่งเป้าให้/g, "ระบบแบ่งสัดส่วนให้"],
    [/เกินเป้า/g, "ถือเกิน"], [/ครบเป้าแล้ว/g, "ครบระดับแล้ว"],
    [/ลดเป้าลงระดับ/g, "ลดระดับลงเป็น"], [/ตั้งเป้าคงที่/g, "กำหนดคงที่"],
    [/ระดับเป้า/g, "ระดับที่วางไว้"], [/ของเป้า/g, ""], [/เป้าคงที่/g, "สัดส่วนคงที่"],
  ];
  function noTarget(v) {
    var t = String(v == null ? "" : v);
    if (t.indexOf("เป้า") < 0) return t;   // ทางด่วน: ข้อความส่วนใหญ่ไม่มีคำนี้
    for (var i = 0; i < NO_TARGET_TXT.length; i++) t = t.replace(NO_TARGET_TXT[i][0], NO_TARGET_TXT[i][1]);
    return t.replace(/\s{2,}/g, " ").replace(/\s+·\s*$/, "").trim();
  }
  function esc(s) { return String(noTarget(s)).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  function fin(v) { if (v == null || v === "") return null; var n = Number(v); return Number.isFinite(n) ? n : null; }
  function pct(v, d) { return v == null ? "—" : v.toFixed(d == null ? 1 : d) + "%"; }
  function baht(v) { return v == null ? "—" : "฿" + Math.round(v).toLocaleString("en-US"); }
  function readSnapshot() { try { return (window.PortfolioDataSnapshot && window.PortfolioDataSnapshot.read && window.PortfolioDataSnapshot.read()) || null; } catch (e) { return null; } }
  function canonical(t) { return window.PortfolioCore && window.PortfolioCore.canonicalSymbolFromTicker ? window.PortfolioCore.canonicalSymbolFromTicker(t) : String(t || "").toUpperCase(); }
  function readJson(key, fallback) { try { var v = JSON.parse(localStorage.getItem(key) || "null"); return v == null ? fallback : v; } catch (e) { return fallback; } }
  function writeJson(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* full */ } }
  function copyOf(o) {
    var out = {};
    for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) out[k] = o[k];
    return out;
  }
  // Privacy Lock (privacy.js) ซ่อน ฿ ในข้อความ แต่ไม่แตะค่าใน <input> → ตอนล็อกช่องเงินสดต้องวาดว่างเอง
  function privacyLocked() {
    try { return !!(window.PortfolioPrivacy && typeof window.PortfolioPrivacy.isLocked === "function" && window.PortfolioPrivacy.isLocked()); }
    catch (e) { return false; }
  }

  // ---------------- เอกสารพอร์ต: GET สด (psCache) > สำเนาใน snapshot · ร่างเงินสดซ้อนทับเพื่อแสดงเท่านั้น ----------------
  // รับได้ทั้ง { data: doc } (คำตอบ /api/portfolio) และ doc ตรง
  function docOfPs(ps) { return ps && typeof ps === "object" ? (ps.data || (ps.quarters ? ps : null)) : null; }
  function isCashNum(v) { return typeof v === "number" && isFinite(v) && v >= 0; }
  // JSON ที่เรียงคีย์ — เทียบเอกสารสองชุดโดยไม่สนลำดับคีย์ (jsonb บน server ไม่รักษาลำดับ)
  function stableJson(v) {
    if (v === null || typeof v !== "object") return JSON.stringify(v);
    if (Array.isArray(v)) return "[" + v.map(function (x) { return x === undefined ? "null" : stableJson(x); }).join(",") + "]";
    var keys = Object.keys(v).sort(), parts = [];
    for (var i = 0; i < keys.length; i++) {
      if (v[keys[i]] !== undefined) parts.push(JSON.stringify(keys[i]) + ":" + stableJson(v[keys[i]]));
    }
    return "{" + parts.join(",") + "}";
  }
  // เวลาบันทึกเงินสดของเอกสาร (ms) · ไม่มี / อ่านไม่ออก = null
  function sleeveTime(doc) {
    var f = doc && doc.foreignSleeve;
    var t = f && typeof f.updatedAt === "string" ? Date.parse(f.updatedAt) : NaN;
    return isFinite(t) ? t : null;
  }
  // สำเนาเอกสารที่ foreignSleeve = เงินสดในร่าง — ใช้วาดหน้าเท่านั้น (ห้ามนำไป PUT · persistCash GET สดเสมอ)
  function withCash(ps, cash) {
    var doc = docOfPs(ps);
    if (!doc) return ps;
    var nd = copyOf(doc);
    nd.foreignSleeve = { cash: cash, updatedAt: null };
    return { data: nd };
  }
  // snapshot ที่หน้านี้ใช้คำนวณ: portfolioStatus = psCache (ถ้ามี) + ร่างเงินสด (ถ้ามี) · ฟิลด์อื่นคงเดิม
  function effectiveSnapshot(snap) {
    if (!snap) return snap;
    var ps = psCache || snap.portfolioStatus;
    if (cashUi.draft) ps = withCash(ps, cashUi.draft.cash);
    if (ps === snap.portfolioStatus) return snap;
    var out = copyOf(snap);
    out.portfolioStatus = ps;
    return out;
  }
  // ร่าง = { cash (บาท ≥ 0), savedAt } · ผิดรูป = ไม่ใช้
  function readCashDraft() {
    try {
      var d = JSON.parse(localStorage.getItem(CASH_DRAFT_KEY) || "null");
      return d && typeof d === "object" && isCashNum(d.cash) ? d : null;
    } catch (e) { return null; }
  }
  // คืนร่างเสมอ (เก็บในหน่วยความจำได้แม้ localStorage ใช้ไม่ได้ — ปุ่มลองใหม่ยังส่งได้)
  function writeCashDraft(cash) {
    var d = { cash: cash, savedAt: new Date().toISOString() };
    try { localStorage.setItem(CASH_DRAFT_KEY, JSON.stringify(d)); } catch (e) { /* full */ }
    return d;
  }
  function clearCashDraft() { try { localStorage.removeItem(CASH_DRAFT_KEY); } catch (e) { /* ignore */ } }

  // ---------------- stores (ผู้ใช้กำหนด — deterministic) ----------------
  function tierConfig() {
    var c = readJson(TIER_STORE, {});
    return { map: c.map || {}, tiers: c.tiers || {} };
  }
  function mergedTierDefs() {
    var PM = window.PMEngine, over = tierConfig().tiers, out = {};
    Object.keys(PM.TIER_DEFS).forEach(function (k) {
      var base = PM.TIER_DEFS[k], o = over[k] || {};
      out[k] = { key: k, label: base.label,
        max: fin(o.max) != null ? o.max : base.max,
        target: fin(o.target) != null ? o.target : base.target,
        min: fin(o.min) != null ? o.min : base.min };
    });
    return out;
  }
  function tierKeyFor(ticker) {
    var c = tierConfig();
    return c.map[ticker] || window.PMEngine.DEFAULT_TIER_MAP[ticker] || "C";
  }
  function setTier(ticker, key) {
    var c = tierConfig(); c.map[ticker] = key; writeJson(TIER_STORE, c); render();
  }
  function setTierParam(tierKey, field, value) {
    var c = tierConfig(); c.tiers[tierKey] = c.tiers[tierKey] || {};
    var n = fin(value); if (n == null || n < 0 || n > 100) return;
    c.tiers[tierKey][field] = n; writeJson(TIER_STORE, c); render();
  }
  function megaStance() { var v = readJson(STANCE_STORE, "bullish"); return v === "bearish" ? "bearish" : "bullish"; }
  function setStance(v) { writeJson(STANCE_STORE, v === "bearish" ? "bearish" : "bullish"); render(); }
  // มุมมองตาราง Current Portfolio: "all" = ทั้งพอร์ต (index core + หุ้น + เงินสด) · "stocks" = เฉพาะหุ้นรายตัว
  function currentView() { return readJson(CVIEW_STORE, "all") === "stocks" ? "stocks" : "all"; }
  function setCurrentView(v) { writeJson(CVIEW_STORE, v === "stocks" ? "stocks" : "all"); render(); }
  function allocPolicy() {
    var c = readJson(ALLOC_STORE, {});
    var pct = fin(c.indexPct); if (pct == null || pct < 0 || pct > 100) pct = 50;
    var cap = fin(c.maxSinglePct); if (cap == null || cap <= 0 || cap > 100) cap = 10;
    return { indexTicker: (c.indexTicker || "QQQM").toUpperCase(), indexPct: pct,
      splitMethod: c.splitMethod === "equal" ? "equal" : "conviction", maxSinglePct: cap };
  }
  function indexTicker() { return allocPolicy().indexTicker; }
  function setAllocField(field, value) {
    var c = readJson(ALLOC_STORE, {});
    if (field === "indexPct") { var n = fin(value); if (n == null || n < 0 || n > 100) return; c.indexPct = n; }
    else if (field === "maxSinglePct") { var m = fin(value); if (m == null || m <= 0 || m > 100) return; c.maxSinglePct = m; }
    else if (field === "indexTicker") { c.indexTicker = String(value || "QQQM").toUpperCase().trim() || "QQQM"; }
    else if (field === "splitMethod") { c.splitMethod = value === "equal" ? "equal" : "conviction"; }
    writeJson(ALLOC_STORE, c); render();
  }
  function entryProgress() { return readJson(PROGRESS_STORE, {}); }
  function toggleEntry(ticker, n, done) {
    var p = entryProgress(); p[ticker] = p[ticker] || {};
    if (done) p[ticker][n] = true; else delete p[ticker][n];
    writeJson(PROGRESS_STORE, p); render();
  }

  // ---------------- positions (sleeve หุ้นต่างประเทศ = "AI portfolio") ----------------
  // รายการหุ้นที่หน้านี้ใช้คิด sleeve (snapshot.portfolioHoldings ผ่าน dedupe) — ชุดเดียวกันทั้งตอนวาดและตอนเขียนแถวลงเอกสาร
  //   → แถวที่เขียนลงไตรมาส = ตัวเลขที่หน้านี้แสดงพอดี (saveHoldings เขียน snapshot ก่อน resolve)
  function holdingsOf(snapshot) {
    var core = window.PortfolioCore;
    var rows = (snapshot && snapshot.portfolioHoldings && snapshot.portfolioHoldings.data) || [];
    return core && core.dedupeHoldings ? core.dedupeHoldings(rows) : rows;
  }
  function buildInputs(snapshot) {
    var PM = window.PMEngine, FS = window.ForeignSleeve;
    var holdings = holdingsOf(snapshot);
    // sleeve หุ้นต่างประเทศ: โหมด pm (กรอกเงินสดแล้ว + มี holdings) = Σ หุ้นที่ถือ + เงินสดที่กรอก
    // โหมด editor = สูตรเดิม (gross จากแถว foreign-stock ของ Quarterly Editor)
    var ps = snapshot && snapshot.portfolioStatus;
    var sleeve = FS && FS.sleeveOf ? FS.sleeveOf(ps, holdings) : { source: "editor", reason: "no-cash" };
    var cashEntered = FS && FS.cashOf ? FS.cashOf(ps) : null;
    var pmMode = sleeve.source === "pm";
    var gross = pmMode ? sleeve.gross : (PM.quarterlyBuckets(snapshot)["foreign-stock"] || 0);
    var progress = entryProgress();
    var idxKey = canonical(indexTicker());

    // ---- pass 1: เก็บ "หุ้นธงแดง" (isHolding) ในกลุ่มหุ้นต่างประเทศ + รวมมูลค่า ----
    // ฐาน % = ผลรวมมูลค่าหุ้นธงแดงเอง (สัดส่วน 100% ของหุ้นต่างประเทศตามที่ผู้ใช้สั่ง)
    // ไม่พึ่ง Quarterly Editor gross อีกต่อไป → META ที่ปักธงแดงถูกนำมาคำนวณเสมอ
    var flagged = [], flagSum = 0, flagIdx = new Map(), heldSet = new Set();
    holdings.forEach(function (h) {
      if (!h || !h.isHolding) return;
      var raw = canonical(h.canonicalSymbol);
      var key = raw === "GOOGL" ? "GOOG" : raw; // thesis KB ใช้ GOOG (เหมือน thesis-reconcile)
      // กองทุนไทย (RMF/SSF/กองทุนรวม) ที่ยังไม่ตั้ง bucket ต้องไม่หลุดเข้า foreign-stock
      // — ไม่งั้น K-GTECHRMF โดนนับเป็นหุ้นธงแดงแล้วฐาน % เพี้ยนทั้งตาราง (audit 2026-08)
      var isThaiFund = /RMF|SSF/i.test(raw) || /THAI_MUTUAL_FUND|MUTUAL/i.test(String(h.assetType || ""));
      var bucket = h.portfolioBucket || (raw.endsWith(".BK") ? "thai-stock" : (raw.indexOf("BTC") >= 0 ? "bitcoin" : (isThaiFund ? "thai-fund" : "foreign-stock")));
      if (bucket !== "foreign-stock") return; // GULF.BK/BTC อยู่ sleeve อื่น — คนละฐาน %
      var mv = fin(h.marketValue) || 0;
      flagSum += mv;
      if (flagIdx.has(key)) { // ถือทั้ง GOOG+GOOGL (สอง class) → รวมมูลค่าเข้าตัวแรก ไม่ทิ้ง
        var f = flagged[flagIdx.get(key)]; f.mv += mv; f.dual = true; if (f.avgCost == null) f.avgCost = fin(h.averageCost);
      } else {
        flagIdx.set(key, flagged.length); heldSet.add(key);
        flagged.push({ key: key, name: h.assetName || key, mv: mv, avgCost: fin(h.averageCost) });
      }
    });
    // ฐาน % = Portfolio Value หุ้นต่างประเทศทั้งก้อน (โหมด pm: หุ้นที่ถือ + เงินสดที่กรอก ·
    // โหมด editor: Quarterly Editor รวมเงินสดใน sleeve)
    // — ฐาน = Portfolio Value ทั้งก้อน (เดิมใช้ผลรวมหุ้นธงแดง → QQQM 2M/5M โชว์ 56.6% แทน 40%)
    // ไม่มี gross (ยังไม่ตั้ง Quarterly และยังไม่กรอกเงินสด) → fallback ฐานผลรวมธงแดงแบบเดิม
    var wBase = gross > 0 ? Math.max(gross, flagSum) : flagSum;
    var positions = flagged.map(function (f) {
      return {
        ticker: f.key, name: f.name, held: true, dual: !!f.dual,
        weightPct: wBase > 0 ? (f.mv / wBase) * 100 : null,
        marketValue: f.mv, avgCost: f.avgCost,
        tierKey: tierKeyFor(f.key), entryDone: progress[f.key] || {}
      };
    });

    // ---- index anchor (QQQM): ถ้ายังไม่ปักธงแดง เติมเป็นตำแหน่ง target (current 0%) ----
    if (!heldSet.has(idxKey)) {
      positions.push({ ticker: idxKey, name: idxKey + " (Index core)", held: false, weightPct: 0,
        tierKey: tierKeyFor(idxKey), entryDone: progress[idxKey] || {} });
    }

    // ---- ตัวที่มี thesis แต่ยังไม่ถือ — โชว์ในโซนเป็น "ตัวเลือกที่ยังไม่ถือ" (ไม่เข้า allocation) ----
    var TE = window.ThesisEngine, TD = window.ThesisData;
    var candidates = [];
    if (TE && TD && TE.companiesFrom) {
      TE.companiesFrom(TD).forEach(function (c) {
        var key = canonical(c.ticker);
        if (heldSet.has(key) || key === idxKey || key.endsWith(".BK")) return;
        if (key === "GOOGL" && heldSet.has("GOOG")) return;
        candidates.push({ ticker: c.ticker, name: c.name || c.ticker, held: false, weightPct: 0,
          tierKey: tierKeyFor(key), entryDone: progress[key] || {} });
      });
    }
    var cashPct, cashBaht; // เงินสดพร้อมวางใน sleeve (% / ฿)
    if (pmMode) {
      // โหมด pm: เงินสด = ค่าที่กรอกในหน้านี้ตรง ๆ (0 = กรอกแล้วว่าเป็นศูนย์) — ไม่เอา Editor มาลบ
      cashBaht = sleeve.cash;
      cashPct = gross > 0 ? (sleeve.cash / gross) * 100 : null;
    } else {
      cashPct = gross > 0 ? Math.max(0, ((gross - flagSum) / gross) * 100) : null;
      cashBaht = gross > 0 ? Math.max(0, gross - flagSum) : null;
    }
    var investedPct = cashPct != null ? Math.max(0, 100 - cashPct) : null;
    return { positions: positions, candidates: candidates, cashPct: cashPct,
      cashBaht: cashBaht, investedPct: investedPct,
      flagSum: flagSum > 0 ? flagSum : null, flagCount: flagged.length, gross: gross > 0 ? gross : null,
      cashSource: pmMode ? "pm" : "editor", cashReason: sleeve.reason || null, cashEntered: cashEntered };
  }

  // ---------------- จัดการหุ้นในพอร์ต (ย้ายมาจาก Action Center — path เขียนเดิม: PortfolioCore.saveHoldings) ----------------
  function holdingsNow() {
    var core = window.PortfolioCore;
    if (core && core.readLocalHoldings) { try { return core.readLocalHoldings() || []; } catch (e) { } }
    var snap = readSnapshot();
    return ((snap && snap.portfolioHoldings && snap.portfolioHoldings.data) || []).slice();
  }
  // hold=true → ตั้ง/แก้มูลค่า · hold=false → เอาออกจากพอร์ต (เก็บเป็น watchlist เหมือนพฤติกรรมเดิมของ AC)
  function saveHoldingAmount(symbol, amount, hold) {
    var core = window.PortfolioCore;
    if (!core || !core.saveHoldings) { alert("PortfolioCore ไม่พร้อม — refresh หน้าก่อน"); return; }
    var key = canonical(symbol);
    var holdings = holdingsNow();
    var idx = -1;
    holdings.forEach(function (h, i) { if (idx < 0 && canonical(h.canonicalSymbol || h.ticker) === key) idx = i; });
    if (idx < 0 && key === "GOOG") holdings.forEach(function (h, i) { if (idx < 0 && canonical(h.canonicalSymbol || h.ticker) === "GOOGL") idx = i; });
    var base = idx >= 0 ? holdings[idx]
      : (core.normalizeHolding ? core.normalizeHolding({ symbol: key, assetName: key, assetType: "" }) : { canonicalSymbol: key, assetName: key });
    var next = Object.assign({}, base, {
      isHolding: !!hold,
      watchlistOnly: !hold,
      marketValue: hold ? Math.max(0, fin(amount) || 0) : 0,
      portfolioBucket: base.portfolioBucket || "foreign-stock",
      updatedAt: new Date().toISOString()
    });
    if (idx >= 0) holdings[idx] = next; else holdings.push(next);
    var saved = null;
    try { saved = core.saveHoldings(holdings); } catch (e) { /* local เขียนแล้ว sync server ทีหลัง — core จัดการเอง */ }
    // core ยิง "portfolio-holdings-updated" → หน้า re-render อัตโนมัติ
    // บันทึกรายการหุ้นสำเร็จ → ตั้งเวลาเขียนแถวหุ้นต่างประเทศของไตรมาสล่าสุดเป็นค่า PM (หน่วง รวมการแก้ติด ๆ กันเป็นรอบเดียว)
    if (saved && typeof saved.then === "function") saved.then(scheduleRowSync, function () { /* บันทึกรายการหุ้นไม่สำเร็จ — ไม่เขียนแถว */ });
  }
  function kbTickersNotHeld(heldRows) {
    var held = {};
    (heldRows || []).forEach(function (r) { if (r.held) held[r.ticker] = 1; });
    var D = window.ThesisData && window.ThesisData.companies ? window.ThesisData.companies : {};
    return Object.keys(D).filter(function (t) { return !held[t] && t.indexOf(".BK") < 0; });
  }


  // ---------------- Intelligence Layer (ชั้นหลักฐาน — optional, ไม่แตะการคำนวณของ PMEngine) ----------------
  function computeIntelMap(out, snapshot) {
    var IE = window.IntelligenceEngine;
    if (!IE || typeof IE.compute !== "function" || !out || !out.rows) return null;
    var R = null; // ผล rotation คำนวณครั้งเดียว แชร์ทุก ticker
    try { R = window.AIRotationEngine && window.AIRotationEngine.compute ? window.AIRotationEngine.compute(snapshot || {}) : null; } catch (eR) { R = null; }
    var map = {};
    out.rows.forEach(function (r) {
      if (!r.covered || !r.o) return;
      try {
        var X = IE.compute(r.ticker, snapshot || {}, { o: r.o, R: R, gsum: r.growth || null, zoneKey: r.zone ? r.zone.key : null });
        if (X && X.available) map[r.ticker] = { intel: X, gate: IE.gateZone(r.zone ? r.zone.key : null, X.health.state.key) };
      } catch (eI) { /* ตัวไหนพังก็ข้าม — หน้าเดิมต้องไม่ล้ม */ }
    });
    return map;
  }
  function intelOf(ticker) { return intelMap && intelMap[ticker] ? intelMap[ticker] : null; }
  function healthChip(ticker) {
    var it = intelOf(ticker);
    if (!it) return "";
    var st = it.intel.health.state;
    return '<span class="pm-ii-chip pm-ii-' + st.key.toLowerCase() + '" title="Thesis Health: ' + esc(st.thai) + '">' + st.icon + ' ' + esc(st.label) + '</span>';
  }
  // zone หลัง safety gate: คืน {zone, gated:bool, why} — zone object ของ PMEngine.ZONES
  function gatedZone(r) {
    var it = intelOf(r.ticker);
    if (!it || !it.gate || !it.gate.overridden || !window.PMEngine || !window.PMEngine.ZONES) return { zone: r.zone, gated: false, why: null };
    return { zone: window.PMEngine.ZONES[it.gate.zoneKey] || r.zone, gated: true, why: it.gate.why };
  }
  // ---------------- UI helpers ----------------
  function toneClass(tone) { return tone === "bull" ? "pm-bull" : tone === "bear" ? "pm-bear" : tone === "watch" ? "pm-watch" : "pm-neutral"; }
  function zoneChip(zone) { return '<span class="pm-zone pm-zone-' + zone.key.toLowerCase() + '">' + zone.icon + " " + esc(zone.label) + "</span>"; }
  // row ไม่บังคับ — ใส่มาเมื่อไหร่จะติดป้ายเตือนให้ถ้าเทคนิคสวนกับคำตัดสิน
  // (PM ตัดสินจากพื้นฐาน+โซน ส่วนหน้า Asset 360 ดูโมเมนตัม สองอย่างขัดกันได้โดยที่ทั้งคู่จริง
  //  ต้องบอกตรงนี้ ไม่ปล่อยให้ผู้ใช้ไปเจอเองตอนคลิกเข้าหน้า Asset แล้วคิดว่าระบบพัง)
  function actionChip(a, row) {
    var chip = '<span class="pm-action ' + toneClass(a.tone) + '">' + esc(a.label) + "</span>";
    if (row && row.techConflict && row.techConflictWhy) {
      chip += ' <span class="pm-techwarn" title="' + esc(row.techConflictWhy) +
        '">เทคนิคยังไม่ยืนยัน</span>';
    }
    return chip;
  }
  function whyList(why) {
    return why.map(function (a) {
      return '<div class="pm-why ' + (a.ok ? "pm-ok" : "pm-no") + '">' + (a.ok ? "✓" : "✗") + " " + esc(a.txt) + "</div>";
    }).join("");
  }
  function assetLink(t) { return '<a class="pm-sym" href="/asset/' + encodeURIComponent(t) + '">' + esc(t) + "</a>"; }

  // ---------------- S1: Portfolio Overview ----------------
  function sectionOverview(out, inp) {
    var ov = out.overview;
    return '<section class="pm-sec"><div class="pm-hero">' +
      '<div class="pm-hero-main">' +
      '<div class="pm-hero-q">"ถ้ามีเงินสดวันนี้ ควรวางเงินก้อนถัดไปที่ตำแหน่งไหน"</div>' +
      '<div class="pm-stance"><small>🧠 AI Megatrend — คุณตัดสินใจเอง (ระบบไม่คำนวณให้):</small>' +
      '<button type="button" class="pm-stance-btn' + (out.megaStance === "bullish" ? " is-on pm-bull" : "") + '" data-pm-stance="bullish">🐂 Bullish</button>' +
      '<button type="button" class="pm-stance-btn' + (out.megaStance === "bearish" ? " is-on pm-bear" : "") + '" data-pm-stance="bearish">🐻 Bearish</button>' +
      "<span>" + (out.megaStance === "bearish" ? "Bearish = งดสะสมใหม่ทุกตัว (Rule 1) จนกว่าจะสลับกลับ" : "Bullish = เปิดสะสมตามเงื่อนไข Zone/Entry ปกติ") + "</span></div>" +
      '<div class="pm-hero-rec ' + toneClass(ov.recommendation.tone) + '"><small>Overall Recommendation</small><b>' + esc(ov.recommendation.label) + "</b><span>" + esc(ov.recommendationWhy) + "</span></div>" +
      "</div>" +
      '<div class="pm-hero-grid">' +
      (inp.cashSource === "pm"
        ? stat("Portfolio Value (หุ้นต่างประเทศ)", baht(inp.gross != null ? inp.gross : 0), esc(CASH_PM_TH))
        : stat("Portfolio Value (หุ้นต่างประเทศ)", inp.gross != null ? baht(inp.gross) : (inp.flagSum != null ? baht(inp.flagSum) : "ยังไม่ตั้งค่า"), inp.gross != null ? "จาก Portfolio Position → หุ้นต่างประเทศ (Quarterly Editor)" : "ตั้งค่าที่ Portfolio Position → หุ้นต่างประเทศ หรือกรอกเงินสดในการ์ดถัดไป (ตอนนี้ใช้ผลรวมหุ้นธงแดงชั่วคราว)")) +
      cashStat(inp) +
      stat("Portfolio Thesis Score", ov.score == null ? "—" : ov.score + "/100", "ค่าเฉลี่ย Investment Thesis ถ่วงน้ำหนักตามสัดส่วนถือจริง (คนละตัวกับ Accumulation Score)") +
      stat("Portfolio Health", esc(ov.health.label), esc(ov.health.why)) +
      "</div></div></section>";
  }
  function stat(t, v, sub, extra, attr) {
    return '<div class="pm-stat"' + (attr || "") + "><small>" + t + "</small><b>" + v + "</b><span>" + sub + "</span>" + (extra || "") + "</div>";
  }
  // การ์ด "ลงทุนแล้ว · เงินสดพร้อมวาง" + ช่องเงินสดรอซื้อหุ้นต่างประเทศ (บันทึกเมื่อ Enter / ปุ่มบันทึก)
  function cashStat(inp) {
    var pmMode = inp.cashSource === "pm";
    var sub;
    if (pmMode) sub = "ลงทุน " + baht(inp.flagSum || 0) + " · เงินสดพร้อมวาง " + baht(inp.cashBaht) + " (ฐาน = หุ้นที่ถือ + เงินสดที่กรอก)";
    else if (inp.cashBaht != null) sub = "ลงทุน " + baht(inp.flagSum || 0) + " · เงินสดใน sleeve " + baht(inp.cashBaht) + " (ฐาน = หุ้นตปท.ทั้งก้อน)";
    else sub = "กรอกเงินสดด้านล่าง หรือตั้งมูลค่า sleeve ที่ Portfolio Position ก่อน จึงจะคำนวณส่วนเงินสดได้";
    return stat("ลงทุนแล้ว · เงินสดพร้อมวาง",
      inp.investedPct != null ? pct(inp.investedPct, 1) + " · " + pct(inp.cashPct, 1) : "—",
      sub, cashBoxHtml(inp), ' data-pm-cash-card="1"');
  }
  // ช่องกรอก: ล็อกอยู่ = วาดว่าง + placeholder (เว้นว่างตอนบันทึก = ใช้ค่าเดิม) · พิมพ์ค้าง = คงข้อความที่พิมพ์
  // เงินที่แสดงเป็น ฿ ในข้อความ (privacy.js ซ่อนได้) · ไม่มีเงินใน title / aria-label
  function cashBoxHtml(inp) {
    var locked = privacyLocked();
    var saving = cashUi.saveState === "saving";
    if (cashUi.typed === CASH_BAD_INPUT) cashUi.typed = ""; // ช่องใหม่ว่างเสมอ → ค่าในหน่วยความจำต้องว่างด้วย
    var stored = cashUi.draft ? cashUi.draft.cash : inp.cashEntered;
    var val = cashUi.typed != null ? cashUi.typed : (locked || stored == null ? "" : String(stored));
    var src = inp.cashSource === "pm" ? "ที่มา: " + CASH_PM_TH
      : (inp.cashReason === "no-holdings" ? CASH_NOHOLD_TH
        : (inp.cashReason === "past-quarter" ? CASH_PAST_TH
          : (inp.cashReason === "quarter-ended" ? CASH_ENDED_TH : CASH_EDITOR_TH)));
    var dis = saving ? " disabled" : "";
    return '<div class="pm-cashbox" data-pm-cashbox="1">' +
      '<label class="pm-cash-lbl" for="pmCashInp">' + esc(CASH_LABEL_TH) + " (บาท)</label>" +
      '<div class="pm-cash-row">' +
      '<input id="pmCashInp" class="pm-cash-inp" type="number" min="0" step="any" inputmode="decimal" value="' + esc(val) + '" data-pm-cash="1"' +
        (locked ? ' placeholder="' + esc(CASH_LOCKED_PH) + '"' : "") + dis + ">" +
      '<button type="button" class="pm-cash-btn" data-pm-cash-save="1"' + dis + ">บันทึก</button>" +
      "</div>" +
      '<small class="pm-cash-src">' + esc(src) + "</small>" +
      cashStatusHtml() + "</div>";
  }
  // สถานะการบันทึก + ร่าง (ไม่มีตัวเลขเงิน)
  function cashStatusHtml() {
    var s = cashUi.saveState, cls = "pm-cash-status", parts = [];
    if (cashUi.inputError) { cls += " is-error"; parts.push("<span>" + esc(cashUi.inputError) + "</span>"); }
    if (s === "saving") parts.push("<span>กำลังบันทึกเงินสด…</span>");
    else if (s === "error") { cls += " is-error"; parts.push("<span>" + esc("บันทึกไม่สำเร็จ: " + (cashUi.error || "ติดต่อ server ไม่สำเร็จ")) + "</span>"); }
    else if (s === "saved") { cls += " is-ok"; parts.push("<span>บันทึกเงินสดแล้ว</span>"); }
    else if (s === "kept") parts.push("<span>" + esc(CASH_KEPT_TH) + "</span>");
    else if (s === "superseded") parts.push("<span>" + esc(CASH_SUPERSEDED_TH) + "</span>");
    if (cashUi.draft && cashUi.draftNotice) {
      parts.push('<span class="pm-cash-draft">' + esc(cashUi.draftNotice + (s === "error" ? " (เก็บไว้ในเครื่องนี้)" : "")) + "</span>");
      if (s === "error") parts.push('<button type="button" class="pm-cash-btn" data-pm-cash-retry="1">ลองบันทึกอีกครั้ง</button>');
    }
    // เขียนแถวหุ้นต่างประเทศหลังแก้มูลค่าหุ้นไม่สำเร็จ — แจ้งสั้น ๆ (ไม่มีร่าง: บันทึกครั้งถัดไปเขียนแถวนี้ใหม่เอง)
    if (rowSync.failed) parts.push('<span class="pm-cash-rownote" data-pm-rowsync="failed">' + esc(ROW_SYNC_FAIL_TH) + "</span>");
    if (!parts.length) return "";
    return '<div class="' + cls + '" data-pm-cash-status="' + esc(s) + '" role="status">' + parts.join("") + "</div>";
  }

  // ---------------- pie: องค์ประกอบพอร์ต (SVG donut — ES5, ไม่มี lib) ----------------
  var PIE_COLORS = ["#34d399", "#f472b6", "#fbbf24", "#a78bfa", "#22d3ee", "#fb923c", "#4ade80", "#f87171", "#c084fc", "#2dd4bf"];
  var PIE_INDEX_COLOR = "#60a5fa";
  var PIE_OTHER_COLOR = "#64748b";
  function polarXY(cx, cy, r, deg) {
    var rad = (deg * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  }
  function donutSlice(cx, cy, rOut, rIn, a0, a1) {
    var big = a1 - a0 > 180 ? 1 : 0;
    var p0 = polarXY(cx, cy, rOut, a0), p1 = polarXY(cx, cy, rOut, a1);
    var q1 = polarXY(cx, cy, rIn, a1), q0 = polarXY(cx, cy, rIn, a0);
    var f = function (n) { return n.toFixed(2); };
    return "M" + f(p0[0]) + " " + f(p0[1]) +
      " A" + rOut + " " + rOut + " 0 " + big + " 1 " + f(p1[0]) + " " + f(p1[1]) +
      " L" + f(q1[0]) + " " + f(q1[1]) +
      " A" + rIn + " " + rIn + " 0 " + big + " 0 " + f(q0[0]) + " " + f(q0[1]) + " Z";
  }
  // slices: [{ label, pct, color }] — pct = % ของทั้งพอร์ต (รวมกันควรได้ ~100)
  function pieSvg(slices, centerBig, centerSmall) {
    var sum = 0;
    slices.forEach(function (x) { sum += x.pct; });
    if (!(sum > 0)) return '';
    var CX = 100, CY = 100, RO = 88, RI = 54, a = -90, body = "";
    slices.forEach(function (x) {
      var span = (x.pct / sum) * 360;
      if (!(span > 0)) return;
      if (span >= 359.99) {
        // ชิ้นเดียวเต็มวง: arc path วาดไม่ได้ (จุดเริ่ม = จุดจบ) ต้องใช้ circle
        body += '<circle cx="' + CX + '" cy="' + CY + '" r="' + ((RO + RI) / 2) + '" fill="none" stroke="' + x.color + '" stroke-width="' + (RO - RI) + '"></circle>';
      } else {
        body += '<path d="' + donutSlice(CX, CY, RO, RI, a, a + span) + '" fill="' + x.color + '">' +
          '<title>' + esc(x.label) + ' ' + pct(x.pct) + '</title></path>';
      }
      if (x.pct / sum >= 0.055) {
        var m = polarXY(CX, CY, (RO + RI) / 2, a + span / 2);
        body += '<text class="pm-pie-lbl" x="' + m[0].toFixed(1) + '" y="' + m[1].toFixed(1) + '">' + esc(x.label) + '</text>';
      }
      a += span;
    });
    var mid = "";
    if (centerBig) {
      mid = '<text class="pm-pie-c1" x="100" y="97">' + esc(centerBig) + '</text>' +
        '<text class="pm-pie-c2" x="100" y="117">' + esc(centerSmall || '') + '</text>';
    }
    return '<svg class="pm-pie" viewBox="0 0 200 200" role="img" aria-label="สัดส่วนพอร์ต">' + body + mid + '</svg>';
  }
  function pieBlock(rows, posByTicker, pol, idxMv, cashMv, wholeBase, stocksSharePct, stocksOnly) {
    if (!(wholeBase > 0)) return '<div class="pm-dim pm-pie-none">ใส่มูลค่าหุ้น + Portfolio Value ก่อน จึงจะวาดสัดส่วนได้</div>';
    var stocks = [];
    rows.forEach(function (r) {
      if (r.isIndex || !r.held) return;
      var mv = fin(posByTicker[r.ticker] && posByTicker[r.ticker].marketValue);
      if (mv == null || mv <= 0) return;
      stocks.push({ ticker: r.ticker, mv: mv, pct: (mv / wholeBase) * 100 });
    });
    stocks.sort(function (x, y) { return y.mv - x.mv; });
    var slices = [], legend = [];
    stocks.forEach(function (x, k) {
      var c = PIE_COLORS[k % PIE_COLORS.length];
      slices.push({ label: x.ticker, pct: x.pct, color: c });
      legend.push({ label: x.ticker, pct: x.pct, color: c });
    });
    // มุมทั้งพอร์ต = แยกชิ้น index/เงินสด · มุมหุ้นรายตัว = รวบเป็นชิ้นจางเดียว (วงยังปิดครบ 100%)
    if (stocksOnly) {
      var restPct = (((idxMv || 0) + (cashMv || 0)) / wholeBase) * 100;
      if (restPct > 0) slices.push({ label: 'อื่น ๆ', pct: restPct, color: PIE_OTHER_COLOR });
    } else {
      if (idxMv > 0) {
        slices.unshift({ label: pol.indexTicker || 'index', pct: (idxMv / wholeBase) * 100, color: PIE_INDEX_COLOR });
        legend.unshift({ label: pol.indexTicker || 'index', pct: (idxMv / wholeBase) * 100, color: PIE_INDEX_COLOR });
      }
      if (cashMv > 0) {
        slices.push({ label: 'เงินสด', pct: (cashMv / wholeBase) * 100, color: PIE_OTHER_COLOR });
        legend.push({ label: 'เงินสด', pct: (cashMv / wholeBase) * 100, color: PIE_OTHER_COLOR });
      }
    }
    var svg = pieSvg(slices, stocksSharePct == null ? null : pct(stocksSharePct), 'หุ้นรายตัวรวม');
    if (!svg) return '';
    var lg = legend.map(function (x) {
      return '<span class="pm-pie-item"><i style="background:' + x.color + '"></i>' + esc(x.label) + '<b>' + pct(x.pct) + '</b></span>';
    }).join('');
    var cap = stocksOnly
      ? 'สัดส่วนหุ้นรายตัว — % ของทั้งพอร์ต · ส่วนจาง = ' + esc(pol.indexTicker || 'index') + ' + เงินสด'
      : 'องค์ประกอบพอร์ตทั้งก้อน — index core + หุ้นรายตัว + เงินสด';
    return '<div class="pm-pie-wrap">' + svg +
      '<div class="pm-pie-side"><div class="pm-pie-cap">' + cap + '</div>' +
      '<div class="pm-pie-legend">' + lg + '</div></div></div>';
  }
  // ---------------- S2: Current Portfolio (ธงแดง + index core + เงินสด) ----------------
  function sectionCurrent(out, inp) {
    var rows = out.allocationRows;
    if (!rows.length) return '<section class="pm-sec"><h2>💼 Current Portfolio</h2><div class="mc-empty">ยังไม่มีหุ้นธงแดงในกลุ่มหุ้นต่างประเทศ — ปักธงแดง + ใส่มูลค่าได้ที่ Action Center</div></section>';
    var tierSel = function (r) {
      if (r.isIndex) return '<span class="pm-idxtag">Index</span>';
      return '<select class="pm-tier-sel" data-pm-tier="' + esc(r.ticker) + '">' +
        ["A", "B", "C"].map(function (k) { return '<option value="' + k + '"' + (r.tier.key === k ? " selected" : "") + ">" + k + "</option>"; }).join("") + "</select>";
    };
    // map มูลค่า/dual จาก positions (engine ไม่ pass-through marketValue)
    var posByTicker = {};
    ((inp && inp.positions) || []).forEach(function (p) { posByTicker[p.ticker] = p; });
    var mvCell = function (r) {
      var p = posByTicker[r.ticker];
      if (!r.held || !p) return '<td class="pm-num"><button type="button" class="pm-addquick" data-pm-addquick="' + esc(r.ticker) + '" title="เพิ่ม ' + esc(r.ticker) + ' เข้าพอร์ต">➕ เพิ่ม</button></td>';
      if (p.dual) return '<td class="pm-num" title="ถือสองคลาส (GOOG+GOOGL) — มูลค่ารวม แก้แยกคลาสที่หน้า Portfolio">' + baht(p.marketValue) + ' <span class="pm-dim">🔒</span></td>';
      return '<td class="pm-num" data-pv-skip="1"><input class="pm-mv-inp" type="number" min="0" step="any" inputmode="decimal" value="' + (p.marketValue || 0) + '" data-pm-mv="' + esc(r.ticker) + '" title="แก้มูลค่า (บาท) แล้ว Enter/คลิกออก เพื่อบันทึก">' +
        '<button type="button" class="pm-rm-btn" data-pm-remove="' + esc(r.ticker) + '" title="เอาออกจากพอร์ต (เก็บเป็น watchlist)">✕</button></td>';
    };
    // ---- 2 มุม: ทั้งพอร์ต vs เฉพาะหุ้นรายตัว ----
    // มุมที่ 2 = กรองรายชื่อออกมาเฉพาะหุ้นรายตัว — น้ำหนักทุกช่องยังอิงฐาน
    // ทั้งพอร์ต (Portfolio Value หุ้นต่างประเทศ) เหมือนมุมแรก ไม่ rebase ให้เทียบกันข้ามมุมได้
    var stocksOnly = currentView() === "stocks";
    var pol = out.policy || {};
    var stocksBase = 0, idxMv = null;
    rows.forEach(function (r) {
      var mv = fin(posByTicker[r.ticker] && posByTicker[r.ticker].marketValue);
      if (r.isIndex) { idxMv = mv; return; }
      if (r.held && mv != null && mv > 0) stocksBase += mv;
    });

    var visRows = (stocksOnly ? rows.filter(function (r) { return !r.isIndex; }) : rows).slice();
    // เรียงตามมูลค่า มาก→น้อย (ลำดับเดียวกับ pie) · ตัวที่ยังไม่ใส่มูลค่า/ยังไม่ถือ ไปท้ายสุด
    var mvSort = function (r) {
      var mv = fin(posByTicker[r.ticker] && posByTicker[r.ticker].marketValue);
      return r.held && mv != null && mv > 0 ? mv : -1;
    };
    visRows.sort(function (x, y) {
      var a = mvSort(x), b = mvSort(y);
      if (a !== b) return b - a;
      return x.ticker < y.ticker ? -1 : x.ticker > y.ticker ? 1 : 0;   // เสมอ = เรียงชื่อ ให้ลำดับนิ่ง
    });
    var tr = visRows.map(function (r) {
      var wcell = r.weightPct == null ? '<span class="pm-dim" title="ใส่มูลค่า (บาท) เพื่อคิดสัดส่วน">—</span>' : pct(r.weightPct);
      return "<tr" + (r.isIndex ? ' class="pm-row-index"' : "") + ">" +
        "<td>" + assetLink(r.ticker) + (r.isIndex ? ' <span class="pm-idxtag">core</span>' : "") + '<small class="pm-dim"> ' + esc(r.name) + (r.held ? "" : " · ยังไม่ถือ") + "</small></td>" +
        "<td>" + tierSel(r) + "</td>" +
        mvCell(r) +
        '<td class="pm-num">' + wcell + "</td>" +
        "<td>" + (r.covered ? (function () { var gz = gatedZone(r); return zoneChip(gz.zone) + (gz.gated ? ' <span class="pm-ii-gate" title="' + esc(gz.why) + '">⛔ gated</span>' : "") + healthChip(r.ticker); })() : '<span class="pm-dim">ไม่มี thesis</span>') + "</td>" +
        "<td>" + (r.covered ? actionChip((function () { var gz2 = gatedZone(r); return gz2.gated && gz2.zone.key === "E" && window.PMEngine ? window.PMEngine.ACTIONS.review : r.action; })(), r) : '<a class="pm-dim" href="/thesis">/thesis-update ' + esc(r.ticker) + "</a>") + "</td></tr>";
    }).join("");
    // แถวเงินสด — ให้ครบ 100%: โหมด pm = เงินสดรอซื้อที่กรอกในหน้านี้ · โหมด editor = Portfolio Value − ผลรวมมูลค่าหุ้นที่ลงทุน
    if (!stocksOnly && inp && inp.cashBaht != null && inp.gross != null) {
      var cashW = inp.gross > 0 ? (inp.cashBaht / Math.max(inp.gross, inp.flagSum || 0)) * 100 : null;
      var cashWhy = inp.cashSource === "pm" ? "เงินสดรอซื้อหุ้นต่างประเทศที่กรอกในหน้านี้" : "Portfolio Value − หุ้นที่ลงทุน";
      tr += '<tr class="pm-row-cash">' +
        '<td>💵 <b>เงินสดใน sleeve</b><small class="pm-dim"> ' + cashWhy + "</small></td>" +
        "<td><span class='pm-idxtag'>Cash</span></td>" +
        '<td class="pm-num">' + baht(inp.cashBaht) + "</td>" +
        '<td class="pm-num"><b>' + (cashW == null ? "—" : pct(cashW)) + "</b></td>" +
        '<td><span class="pm-dim">รอ deploy ตาม Cash Deployment Plan ด้านล่าง</span></td>' +
        '<td><span class="pm-action pm-neutral">Reserve</span></td></tr>';
    }
    // ฟอร์มเพิ่มหุ้นเข้าพอร์ต (ย้ายมาจาก Action Center) — เขียนลง store เดียวกับทั้งแอป
    var dl = kbTickersNotHeld(rows).map(function (t) { return '<option value="' + esc(t) + '">'; }).join("");
    var addForm = '<div class="pm-addform" data-pv-skip="1">➕ <b>เพิ่มหุ้นเข้าพอร์ต:</b> ' +
      '<input id="pmAddTicker" list="pmKbList" placeholder="TICKER เช่น MSFT" maxlength="12" autocomplete="off"><datalist id="pmKbList">' + dl + "</datalist>" +
      '<input id="pmAddAmount" type="number" min="0" step="any" inputmode="decimal" placeholder="มูลค่า (฿)">' +
      '<button type="button" id="pmAddBtn" class="pm-add-btn">เพิ่ม</button>' +
      '<small class="pm-dim">bucket: หุ้นต่างประเทศ · บันทึกชุดข้อมูลเดียวกับหน้า Portfolio/ทั้งแอป · พิมพ์ ticker นอก list ได้</small></div>';
    var cashMv = inp && inp.cashBaht != null ? inp.cashBaht : null;
    var wholeBase = stocksBase + (idxMv || 0) + (cashMv || 0);
    var stocksSharePct = wholeBase > 0 ? (stocksBase / wholeBase) * 100 : null;
    var vnote = stocksOnly
      ? "กรองเฉพาะรายชื่อหุ้นรายตัว (ซ่อน " + esc(pol.indexTicker || "index") + " + เงินสด) — ตัวเลขทุกช่องยังอิงฐานทั้งพอร์ต"
      : "ฐาน 100% = Portfolio Value หุ้นต่างประเทศ (index core + หุ้นรายตัว + เงินสด)";
    var vsw = '<div class="pm-viewsw"><small>มุมมอง:</small>' +
      '<button type="button" class="pm-stance-btn' + (stocksOnly ? "" : " is-on pm-bull") + '" data-pm-cview="all">🥧 ทั้งพอร์ต</button>' +
      '<button type="button" class="pm-stance-btn' + (stocksOnly ? " is-on pm-bull" : "") + '" data-pm-cview="stocks">📊 เฉพาะหุ้นรายตัว</button>' +
      "<span>" + vnote + "</span></div>";
    return '<section class="pm-sec"><h2>💼 Current Portfolio <small>(' + (stocksOnly ? "เฉพาะหุ้นรายตัว — ตัด index core + เงินสดออก เพื่อดูสัดส่วนภายในกลุ่มหุ้น" : "หุ้นธงแดง + index core + เงินสด — เห็นทั้งพอร์ตรวม") + ' · แก้มูลค่า/เพิ่ม/เอาออก ได้ที่นี่)</small></h2>' + vsw + pieBlock(rows, posByTicker, pol, idxMv, cashMv, wholeBase, stocksSharePct, stocksOnly) +
      '<div class="pm-tablewrap"><table class="pm-table"><thead><tr><th>Ticker</th><th>Tier</th><th>มูลค่า (฿)</th><th>น้ำหนักปัจจุบัน</th><th>Accumulation Zone</th><th>Position Status</th></tr></thead><tbody>' +
      tr + "</tbody></table></div>" + addForm + allocEditor(pol) + "</section>";
  }

  // ตัวระบุ index core (ต้องรู้ว่าแถวไหนคือ index — ไม่ใช่เรื่องเป้า) · %/เพดาน/วิธีแบ่ง ถอดออกแล้ว
  function allocEditor(p) {
    return '<details class="pm-details pm-alloccfg" data-pv-skip="1"><summary>⚙️ ตั้งค่า index core</summary>' +
      '<div class="pm-allocrow"><label>Index ticker <input class="pm-alloc-inp" type="text" value="' + esc(p.indexTicker) + '" data-pm-alloc="indexTicker"></label></div>' +
      '<small>ตัวที่ถือเป็นแกน index ของพอร์ต — ใช้แยกแถว index ออกจากหุ้นรายตัว (ค่าเก็บในเครื่อง)</small></details>';
  }
  // ---------------- S4: Accumulation Opportunities (Zone นำ Score รอง) ----------------
  // "Dip" = dipTiming ของ PMEngine (ยิ่งย่อยิ่งได้แต้ม) — คนละสูตรกับ Timing Score เทคนิคหน้าอื่น
  var SCORE_SHORT = { thesis: "Thesis", growthPrice: "Growth", timing: "Dip", valuation: "Val(curated)" };
  function scoreFormula(parts, score) {
    var terms = (parts || []).filter(function (p) { return p.value != null; })
      .map(function (p) { return (SCORE_SHORT[p.key] || p.key) + " " + p.value + "·" + p.weight + "%"; });
    return terms.join(" + ") + " = <b>" + (score == null ? "—" : score) + "</b>";
  }
  function scoreBars(parts, score) {
    var avail = (parts || []).filter(function (p) { return p.value != null; });
    var wsum = avail.reduce(function (s, p) { return s + p.weight; }, 0) || 1;
    var rows = (parts || []).map(function (p) {
      if (p.value == null) return '<div class="pm-sp-row pm-dim"><span class="pm-sp-lbl">' + esc(p.label) + ' <em>' + p.weight + '%</em></span><span class="pm-sp-none">— ไม่มีข้อมูล (เกลี่ยน้ำหนักให้ตัวอื่น)</span></div>';
      var contrib = Math.round(p.value * p.weight / wsum * 10) / 10;
      var col = p.value >= 70 ? "#34d399" : p.value >= 40 ? "#f59e0b" : "#f43f5e";
      return '<div class="pm-sp-row"><span class="pm-sp-lbl">' + esc(p.label) + ' <em>' + p.weight + '%</em></span>' +
        '<div class="pm-sp-bar"><i style="width:' + Math.min(100, p.value) + '%;background:' + col + '"></i></div>' +
        '<b class="pm-sp-v">' + p.value + '</b><i class="pm-sp-c" title="ส่วนที่สมทบเข้าคะแนนรวม">+' + contrib + "</i></div>";
    }).join("");
    return '<div class="pm-sp-head">Accumulation Score = ผลรวมถ่วงน้ำหนัก (renormalize เมื่อบางปัจจัยไม่มีข้อมูล) = <b>' + (score == null ? "—" : score) + "/100</b></div>" + rows;
  }
  function sectionZones(out) {
    var all = out.rows.filter(function (r) { return r.covered; })
      .sort(function (a, b) { return gatedZone(a).zone.rank - gatedZone(b).zone.rank || (b.accScore || 0) - (a.accScore || 0); }); // เรียงตาม zone หลัง safety gate ให้ตรงกับที่ card แสดง
    if (!all.length) return "";
    var cards = all.map(function (r) {
      var ladderMini = r.ladder.map(function (e) {
        var cls = e.completed ? "pm-lad-done" : e.triggered ? "pm-lad-hot" : "pm-lad-wait";
        return '<span class="pm-lad ' + cls + '" title="' + esc(e.title + " — " + (e.completed ? "Deploy แล้ว" : e.triggered ? "Trigger แล้ว รอ deploy" : e.why)) + '">E' + e.n + "</span>";
      }).join("");
      var gz = gatedZone(r);
      var it = intelOf(r.ticker);
      var gateLine = gz.gated ? '<div class="pm-ii-gateline">⛔ ' + esc(gz.why) + "</div>" : "";
      var evLines = "";
      if (it) {
        var bad = it.intel.health.pillars.filter(function (p) { return p.status === "warn" || p.status === "crit"; });
        if (bad.length) evLines = '<div class="pm-ii-ev">' + bad.map(function (p) {
          return (p.status === "crit" ? "✗ " : "⚠ ") + esc(p.label) + ": " + esc(p.evidence);
        }).join("<br>") + "</div>";
      }
      return '<article class="pm-card pm-card-' + gz.zone.key.toLowerCase() + '">' +
        '<div class="pm-card-head">' + assetLink(r.ticker) +
        (r.held ? "" : '<span class="pm-newpos">ยังไม่ได้ถือ — ตัวเลือกตำแหน่งใหม่</span>') +
        '<span class="pm-score"><b>' + (r.accScore == null ? "—" : r.accScore) + "</b>/100</span></div>" +
        '<div class="pm-card-zone">' + zoneChip(gz.zone) + "<small>" + esc(gz.zone.thai) + "</small>" + healthChip(r.ticker) + "</div>" + gateLine +
        '<div class="pm-card-zonewhy">' + r.zoneWhy.map(function (w) { return esc(w); }).join(" · ") + "</div>" +
        '<div class="pm-scoreline">📊 ' + scoreFormula(r.acc.parts, r.accScore) + "</div>" +
        '<div class="pm-lads">' + ladderMini + "</div>" +
        '<details class="pm-details"><summary>ที่มาของคะแนน + เหตุผล</summary>' +
        '<div class="pm-scorebars">' + scoreBars(r.acc.parts, r.accScore) + "</div>" +
        '<div class="pm-whywrap">' + whyList(r.why) + "</div></details>" +
        evLines +
        (r.stale ? '<div class="pm-stale">⚠ thesis เก่า — /thesis-update ' + esc(r.ticker) + "</div>" : "") +
        "</article>";
    }).join("");
    var counts = {};
    all.forEach(function (r) { var zk = gatedZone(r).zone.key; counts[zk] = (counts[zk] || 0) + 1; }); // นับ zone หลัง safety gate ให้ตรงกับ card
    var strip = ["A", "B", "C", "D", "E"].map(function (k) {
      var z = window.PMEngine.ZONES[k];
      return '<span class="pm-pill">' + z.icon + " " + k + " <b>" + (counts[k] || 0) + "</b></span>";
    }).join("");
    return '<section class="pm-sec"><h2>🧲 Accumulation Opportunities</h2>' +
      "<p>ตำแหน่งไหน \"ควรค่าแก่เงินก้อนถัดไป\" — Zone คือตัวตัดสินหลัก คะแนนเป็นรอง · น้ำหนัก: Thesis 40 · Business Growth vs ราคา (ถ่วงน้ำหนัก 2-5 ปี · ปีล่าสุดมากกว่า) 25 · Timing 20 · Valuation 15 (ถอด Macro/ดอกเบี้ยออกจากคะแนนแล้ว · มุมมอง AI Megatrend คุณตั้งเองเป็นเกต · EMA/SMA200/RSI เป็นแค่เครื่องมือจับจังหวะ)</p>" +
      '<div class="pm-strip">' + strip + "</div>" +
      '<div class="pm-grid">' + cards + "</div></section>";
  }

  // ---------------- S5: Cash Deployment Plan ----------------
  function sectionDeployment(out, inp) {
    var d = out.deployment;
    // ฿ ต่อรายการ = สัดส่วนของเงินสดจริงใน sleeve (คำนวณได้เมื่อกรอกเงินสดในหน้านี้ หรือตั้ง Quarterly Editor แล้ว)
    var bahtOf = function (pctCash) { return inp.cashBaht != null ? baht(inp.cashBaht * pctCash / 100) : null; };
    var items = d.items.map(function (i) {
      var amt = bahtOf(i.pctOfCash);
      var gI = intelOf(i.ticker);
      var gateWarn = gI && gI.gate && gI.gate.overridden ? '<div class="pm-ii-gateline">⛔ ' + esc(gI.gate.why) + " — ตรวจหลักฐานที่ /thesis §16 ก่อนวางเงิน</div>" : "";
      return '<div class="pm-dep-row"><div class="pm-dep-head">' + assetLink(i.ticker) +
        '<b>' + i.pctOfCash.toFixed(1) + "% ของเงินสด" + (amt ? " ≈ " + amt : "") + "</b></div>" +
        '<div class="pm-depbar"><i style="width:' + Math.min(100, i.pctOfCash) + '%"></i></div>' +
        '<small>' + esc(i.why) + (i.halved ? " · ถูกลดครึ่งจาก Macro Risk-Off (Rule 3)" : "") + "</small>" + gateWarn + "</div>";
    }).join("");
    // headline: เงินก้อนถัดไปควรไปที่ไหน เท่าไหร่ — ตอบใน 1 บรรทัด ไม่ต้องไล่อ่านแผน
    var top = d.items && d.items.length ? d.items[0] : null;
    var headline;
    var topGate = top ? intelOf(top.ticker) : null;
    var topGated = topGate && topGate.gate && topGate.gate.overridden;
    if (top) {
      var topAmt = bahtOf(top.pctOfCash);
      headline = '<div class="pm-dep-next">🎯 เงินก้อนถัดไป → <b>' + esc(top.ticker) + "</b> " +
        (topAmt ? "<b>≈ " + topAmt + "</b> (" + top.pctOfCash.toFixed(1) + "% ของเงินสด " + baht(inp.cashBaht) + ")" : top.pctOfCash.toFixed(1) + "% ของเงินก้อนที่จะวาง") +
        (d.items.length > 1 ? " · ตัวถัดไป: " + d.items.slice(1, 3).map(function (i) { return esc(i.ticker); }).join(", ") : "") + "</div>" +
        (topGated ? '<div class="pm-ii-gateline">⛔ ' + esc(topGate.gate.why) + " — ตรวจหลักฐานที่ /thesis §16 ก่อนวางเงินตามบรรทัดบน</div>" : "");
    } else {
      headline = '<div class="pm-dep-next pm-dep-next-wait">🛡️ ตอนนี้ยังไม่มี entry ที่ trigger — <b>ถือเงินสดรอ 100%</b>' +
        (inp.cashBaht != null ? " (เงินสดใน sleeve " + baht(inp.cashBaht) + " · " + pct(inp.cashPct, 1) + ")" : "") +
        " · ตัวถัดไปดูจาก Zone ที่ดีสุดในตาราง Accumulation ด้านบน</div>";
    }
    return '<section class="pm-sec"><h2>💵 Cash Deployment Plan <small>(เงินสดที่พร้อมวาง = 100%)</small></h2>' +
      headline +
      (inp.cashPct != null ? "<p>เงินสดจริงใน sleeve ตอนนี้ " + pct(inp.cashPct, 1) + " (" + baht(inp.cashBaht) + ") ของ sleeve — แผนด้านล่างคิดเป็นสัดส่วนของเงินสดก้อนนี้</p>"
        : "<p>ยังไม่มีข้อมูลเงินสด (กรอกเงินสดรอซื้อด้านบน หรือตั้ง Quarterly Editor) — แผนแสดงเป็นสัดส่วนสมมติของเงินก้อนที่จะวาง</p>") +
      (items || '<div class="mc-empty">วันนี้ยังไม่มี entry ที่ trigger ในตำแหน่งที่ถือ — เงินสดคงเป็น reserve 100%</div>') +
      '<div class="pm-dep-row pm-dep-reserve"><div class="pm-dep-head">🛡️ Cash Reserve<b>' + d.cashReserveFinal.toFixed(1) + "%</b></div>" +
      '<div class="pm-depbar pm-depbar-res"><i style="width:' + Math.min(100, d.cashReserveFinal) + '%"></i></div>' +
      "<small>" + d.reserveWhy.map(esc).join(" · ") + (d.scaled ? " · แผนถูกสเกลลงให้พอดีเพดาน deploy " + d.deployable + "%" : "") + "</small></div>" +
      "</section>";
  }

  // ---------------- S6: Position Manager (+ Entry Ladder + tier editor) ----------------
  function sectionManager(out) {
    var rows = out.allocationRows.filter(function (r) { return r.covered; });
    var cards = rows.map(function (r) {
      var lad = r.ladder.map(function (e) {
        var cls = e.completed ? "pm-entry-done" : e.blocked ? "pm-entry-block" : e.triggered ? "pm-entry-hot" : "pm-entry-wait";
        var status = e.completed ? "Deploy แล้ว" : e.blocked ? "ปิด" : e.triggered ? "Trigger แล้ว — รอ deploy" : "Waiting";
        return '<div class="pm-entry ' + cls + '">' +
          '<label><input type="checkbox" data-pm-entry="' + esc(r.ticker) + '" data-n="' + e.n + '"' + (e.completed ? " checked" : "") + (e.blocked && !e.completed ? " disabled" : "") + "> " +
          "<b>" + esc(e.title) + "</b></label>" +
          '<span class="pm-entry-status">' + status + "</span>" +
          "<small>" + esc(e.rule) + '</small><small class="pm-entry-why">→ ' + esc(e.why) + "</small></div>";
      }).join("");
      var gzM = gatedZone(r);
      var mgrGate = gzM.gated ? '<div class="pm-ii-gateline">⛔ ' + esc(gzM.why) + " — entry ladder ด้านล่างคิดจาก zone เดิมของ engine อย่าใช้จนกว่าหลักฐานจะเคลียร์</div>" : "";
      return '<article class="pm-mgr">' +
        '<div class="pm-mgr-head">' + assetLink(r.ticker) + (r.isIndex ? ' <span class="pm-idxtag">Index core</span>' : "") + zoneChip(gatedZone(r).zone) + actionChip(gatedZone(r).gated && gatedZone(r).zone.key === "E" && window.PMEngine ? window.PMEngine.ACTIONS.review : r.action, r) + healthChip(r.ticker) + "</div>" +
        '<div class="pm-mgr-nums">' +
        mnum("น้ำหนักปัจจุบัน", pct(r.weightPct)) + mnum(r.isIndex ? "ประเภท" : "Tier", r.isIndex ? "Index" : r.tier.key) +
        "</div>" + mgrGate +
        '<div class="pm-entries">' + lad + "</div></article>";
    }).join("");
    return '<section class="pm-sec"><h2>🧰 Position Manager <small>(Entry Ladder — ระบบจำว่า deploy ไปแล้วขั้นไหน)</small></h2>' +
      "<p>ติ๊ก ✓ เมื่อวางเงินจริงของ entry นั้นแล้ว — ระบบจะจำไว้ข้ามวัน และหักออกจากแผน Cash Deployment ด้านบน (เก็บในเครื่อง)</p>" +
      (cards || '<div class="mc-empty">ยังไม่มีตำแหน่งที่มี Investment Thesis</div>') +
      tierEditor(out) + "</section>";
  }
  function mnum(t, v) { return '<div class="pm-mnum"><small>' + t + "</small><b>" + v + "</b></div>"; }
  function tierEditor(out) {
    var defs = out.tierDefs;
    var rows = ["A", "B", "C"].map(function (k) {
      var d = defs[k];
      var inp = function (f) { return '<input class="pm-tier-inp" type="number" min="0" max="100" step="0.5" value="' + d[f] + '" data-pm-tierdef="' + k + '" data-f="' + f + '">'; };
      return "<tr><td>" + esc(d.label) + "</td><td>" + inp("min") + "</td><td>" + inp("max") + "</td></tr>";
    }).join("");
    return '<details class="pm-details pm-tiercfg"><summary>⚙️ Master Position Size — ปรับกรอบ Tier ได้ (Min / Max % ของ sleeve)</summary>' +
      '<table class="pm-table"><thead><tr><th>Tier</th><th>Min</th><th>Max</th></tr></thead><tbody>' + rows + "</tbody></table>" +
      "<small>เปลี่ยน Tier รายตัวได้ที่ตาราง Current Portfolio — ค่าเก็บในเครื่อง (localStorage)</small></details>";
  }

  // ---------------- S7: Risk Management ----------------
  function sectionRisk(out) {
    var rows = out.risk.map(function (r) {
      return '<div class="pm-rule ' + (r.active ? "pm-rule-on" : "pm-rule-off") + '">' +
        '<span class="pm-rule-badge">' + (r.active ? "ACTIVE" : "PASS") + "</span>" +
        "<b>Rule " + r.n + " — " + esc(r.rule) + "</b><small>" + esc(r.detail) + "</small></div>";
    }).join("");
    return '<section class="pm-sec"><h2>🛡️ Risk Management <small>(hard rules — บังคับทั้งพอร์ต)</small></h2>' + rows + "</section>";
  }

  // ---------------- S8: Explainability / methodology ----------------
  function sectionMethod() {
    return '<footer class="pm-foot">🧠 <b>วิธีคิดทั้งหมดเปิดเผย:</b> Zone/คะแนน/แผนเงิน มาจาก Investment Thesis Engine + Market Regime + Rate Monitor + เทคนิคจาก snapshot · มุมมอง AI Megatrend <b>คุณตัดสินใจเอง</b> (สวิตช์ Bullish/Bearish ด้านบน — เป็นเกต Rule 1 ไม่ใช่คะแนนคำนวณ) — สูตร Accumulation Score ชุดเดียวกับ Accumulation Center (engine กลางตัวเดียวกัน) · deterministic ไม่มี AI-generated opinion · กดดู "ทำไม" ได้ทุกการ์ด · ไม่ใช่คำแนะนำการลงทุน</footer>';
  }

  // ---------------- เงินสดรอซื้อหุ้นต่างประเทศ: บันทึกลงเอกสารพอร์ต (โครงเดียวกับ allocation-card-page.js persistPlan) ----------------
  function thError(msg) { var e = new Error(msg); e.pmTh = true; return e; }

  // id ของแถวหุ้นต่างประเทศที่หน้านี้เขียน (แถวใหม่ / ข้อมูลเก่าไม่มี id) — ปุ่มแก้ไข/ลบของ Quarterly Editor อ้างแถวด้วย id
  function newRowId() {
    try { if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID(); } catch (e) { /* ใช้ตัวสำรอง */ }
    return "fs-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }
  // เอกสารดิบที่จะ PUT (สำเนาทุกคีย์ของ server) → แถวหุ้นต่างประเทศของไตรมาสล่าสุดเป็นค่า PM
  //   เฉพาะเมื่อ ForeignSleeve.sleeveOf(doc, รายการหุ้นที่หน้านี้แสดง) = pm (กรอกเงินสดแล้ว + มีหุ้น + ไตรมาสปัจจุบัน = ล่าสุด
  //   + ยังไม่จบตามปฏิทิน) · ไม่งั้นคืน doc ตัวเดิม (ไตรมาสไม่ถูกแตะ)
  //   แถวที่แทน = applyToDoc mark:false: คงชื่อ/id/ทุกฟิลด์ของแถวแรก · เงินเติม/ถอนรวมทุกแถว · ไม่มี fromPM · แถวอื่นและไตรมาสอื่น reference เดิม
  //   แถวไม่มี id → ให้ id (แถวใหม่ได้ createdAt / updatedAt แบบที่ Quarterly Editor ตั้ง)
  function withForeignRow(doc) {
    var FS = window.ForeignSleeve;
    if (!FS || typeof FS.applyToDoc !== "function") return doc;
    var out = FS.applyToDoc(doc, holdingsOf(readSnapshot()), { mark: false });
    if (out === doc || !out || !out.quarters) return doc;
    var key = FS.latestKeyOf ? FS.latestKeyOf(out) : null;
    var q = key ? out.quarters[key] : null;
    var before = key && doc.quarters[key] && Array.isArray(doc.quarters[key].assets) ? doc.quarters[key].assets : [];
    var wasNew = !before.some(function (a) { return a && a.type === "foreign-stock"; });
    var rows = q && Array.isArray(q.assets) ? q.assets : [];
    for (var i = 0; i < rows.length; i++) {
      var a = rows[i];
      if (!a || a.type !== "foreign-stock") continue;
      // แถวที่ applyToDoc คืนเป็นสำเนาใหม่เสมอ → ตั้งค่าบนตัวนี้ได้โดยไม่แตะเอกสารของ server
      if (!a.id) a.id = newRowId();
      if (wasNew && !a.createdAt) { a.createdAt = new Date().toISOString(); a.updatedAt = null; }
      break;
    }
    return out;
  }

  // GET สด → เอกสารไม่มีไตรมาส = ไม่ PUT → สำเนาทุกคีย์ของเอกสารบน server → ตั้ง foreignSleeve → PUT { data }
  // body = เอกสารดิบจาก server เสมอ (ไม่ใช่ psCache / snapshot ที่หน้าใช้วาด) · แถว foreign-stock ของไตรมาสล่าสุดที่ยังไม่จบ
  //   = ค่า PM ตามเงินสดใหม่ (withForeignRow · โหมด pm เท่านั้น) · ไตรมาสอื่น / แถวอื่น / คีย์อื่น คงเดิมทุก byte
  // bootDraft (เฉพาะร่างที่ส่งเองตอนเปิดหน้า): server มีเงินสดที่บันทึกหลังร่างนี้ (เช่นจากเครื่องอื่น) → ไม่ PUT
  //   ทิ้งร่าง ใช้ค่าบน server · บันทึกที่ผู้ใช้กด / ปุ่มลองใหม่ ไม่ผ่านเงื่อนไขนี้
  // รอบเขียนแถวหลังแก้มูลค่าหุ้นกำลังค้าง → รอให้จบก่อน GET (สอง GET→PUT สลับกัน = ตัวหลังทับเงินสดของตัวแรก)
  function persistCash(cash, bootDraft) {
    if (cashUi.saveState === "saving") return;
    cashUi.inputError = null;
    // ตรวจที่ขอบการเขียน — ค่าไม่ผ่าน = ไม่ GET ไม่ PUT ไม่เขียนร่าง
    if (!isCashNum(cash)) { cashUi.inputError = CASH_INVALID_TH; render(); return; }
    var mine = { cash: cash, updatedAt: new Date().toISOString() };
    cashUi.saveState = "saving";
    cashUi.error = null;
    render();
    var getDoc = function () { return window.fetch("/api/portfolio", { cache: "no-store" }); };
    var p;
    if (rowSync.promise) p = rowSync.promise.then(getDoc, getDoc);
    else {
      try { p = getDoc(); }
      catch (e) { p = Promise.reject(e); }
    }
    p.then(function (r) {
      if (!r || !r.ok) throw thError("อ่านข้อมูลพอร์ตก่อนบันทึกไม่ได้ (HTTP " + (r ? r.status : "?") + ")");
      return r.json();
    }).then(function (j) {
      var data = j && (j.data || (j.quarters ? j : null));
      // กันเคสร้ายแรง: server ตอบเอกสารที่ไม่มีไตรมาส → PUT ทับจะลบพอร์ตทั้งก้อน
      if (!data || !data.quarters || !Object.keys(data.quarters).length) throw thError(CASH_EMPTY_SERVER_TH);
      if (bootDraft) {
        var serverAt = sleeveTime(data), draftAt = Date.parse(bootDraft.savedAt);
        if (serverAt != null && isFinite(draftAt) && serverAt > draftAt) {
          var sup = new Error("superseded");
          sup.pmSuperseded = data;
          throw sup;
        }
      }
      var next = {};
      Object.keys(data).forEach(function (k) { next[k] = data[k]; });   // quarters / allocation / allocationPlan คงเดิมทุก byte
      next.foreignSleeve = mine;
      next = withForeignRow(next);   // โหมด pm: แถวหุ้นต่างประเทศของไตรมาสล่าสุด = หุ้นที่ถือ + เงินสดใหม่
      return window.fetch("/api/portfolio", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ data: next })
      }).then(function (r2) {
        if (!r2 || !r2.ok) throw thError("server ตอบ HTTP " + (r2 ? r2.status : "?"));
        return next;
      });
    }).then(onCashPersisted, function (e) {
      if (e && e.pmSuperseded) onDraftSuperseded(e.pmSuperseded);
      else onCashFailed(mine, e);
    });
  }

  // ร่างตอนเปิดหน้าเก่ากว่าเงินสดบน server → ไม่ PUT · ทิ้งร่าง · ใช้เอกสารบน server · บอกผู้ใช้สั้น ๆ
  function onDraftSuperseded(doc) {
    psCache = { data: doc };
    psFetchedAt = Date.now();
    psSeq++;
    clearCashDraft();
    cashUi.draft = null;
    cashUi.draftNotice = null;
    cashUi.typed = null;
    cashUi.inputError = null;
    cashUi.saveState = "superseded";
    cashUi.error = null;
    render();
  }

  function onCashPersisted(next) {
    psCache = { data: next };   // เอกสารชุดที่เพิ่ง PUT = ฉบับล่าสุด
    psFetchedAt = Date.now();
    psSeq++;
    ownSaved = next;
    clearCashDraft();
    cashUi.draft = null;
    cashUi.draftNotice = null;
    cashUi.typed = null;
    cashUi.inputError = null;
    cashUi.saveState = "saved";
    cashUi.error = null;
    rowSync.failed = false;   // PUT นี้เขียนแถวหุ้นต่างประเทศตามค่าล่าสุดแล้ว (หรือไม่ใช่โหมด pm = ไม่มีแถวต้องเขียน)
    patchSnapshot(next);
    // event บน window อยู่แค่ในหน้านี้ (ไม่ข้ามแท็บ/หน้า) — หน้าอื่นได้เงินสดใหม่จาก snapshot ใน localStorage
    // ที่ patch ข้างบน และจาก GET /api/portfolio สดของหน้านั้นเอง · ยิงไว้ให้ส่วนอื่นที่อาจวางบนหน้านี้ในอนาคต
    try {
      if (typeof window.CustomEvent === "function" && typeof window.dispatchEvent === "function") {
        window.dispatchEvent(new window.CustomEvent("portfolio-allocation-saved", { detail: { data: next } }));
      }
    } catch (e) { /* ignore */ }
    render();
  }

  // ล้มเหลวทุกแบบ (GET/PUT ไม่ ok · เอกสารบน server ว่าง · เน็ตหลุด) → เก็บร่าง แสดงร่าง + ปุ่มลองใหม่
  function onCashFailed(mine, e) {
    cashUi.draft = writeCashDraft(mine.cash);
    cashUi.draftNotice = CASH_DRAFT_TH;
    cashUi.typed = null;
    cashUi.saveState = "error";
    cashUi.error = (e && e.pmTh && e.message) || "ติดต่อ server ไม่สำเร็จ";
    render();
  }

  // สำเนาเอกสารใน Data Snapshot ของ browser นี้ → foreignSleeve ใหม่ (หน้าอื่นใน browser เดียวกันเห็นทันที ไม่ต้องรอ Load)
  // คงทุกฟิลด์ของ snapshot และของ wrapper portfolioStatus · แทนเฉพาะ data ด้วยเอกสารดิบชุดที่เพิ่ง PUT
  function patchSnapshot(next) {
    try {
      var P = window.PortfolioDataSnapshot;
      if (!P || typeof P.read !== "function" || typeof P.write !== "function") return;
      var snap = P.read();
      if (!snap || typeof snap !== "object") return;
      var out = copyOf(snap);
      var old = snap.portfolioStatus;
      var ps = old && typeof old === "object" && Object.prototype.hasOwnProperty.call(old, "data") ? copyOf(old) : {};
      ps.data = next;
      out.portfolioStatus = ps;
      P.write(out);
    } catch (e) { /* snapshot เป็นแค่สำเนา — เขียนไม่ได้ก็ไม่กระทบเอกสารบน server */ }
  }

  // ---------------- แถวหุ้นต่างประเทศของไตรมาสล่าสุด ← มูลค่าหุ้นที่เพิ่งบันทึก (spec Addendum ข้อ 5 · final review) ----------------
  // บันทึกมูลค่าหุ้นรายตัวสำเร็จ → ตั้งเวลาใหม่ทุกครั้ง (แก้ติด ๆ กัน = รอบเดียว)
  function scheduleRowSync() {
    if (rowSync.timer) clearTimeout(rowSync.timer);
    rowSync.timer = setTimeout(function () { rowSync.timer = null; runRowSync(); }, ROW_SYNC_DELAY_MS);
  }
  // GET สด → เอกสารไม่มีไตรมาส = ไม่ PUT (ล้มเหลว) → สำเนาทุกคีย์ → withForeignRow → ไม่ใช่โหมด pm / แถวเท่าเดิม = ไม่ PUT
  //   → PUT { data } (ไม่มี fromPM) → สำเนาใน snapshot + event แบบบันทึกเงินสด
  //   ทีละรอบ: รอบค้าง = จำไว้แล้วตั้งเวลาใหม่ตอนจบ · บันทึกเงินสดกำลังส่ง = ตั้งเวลาใหม่ (PUT นั้นเขียนแถวเดียวกันอยู่แล้ว)
  //   ล้มเหลว = rowSync.failed (ข้อความสั้นในกล่องเงินสด) · ไม่มีร่าง — บันทึกเงินสด/มูลค่าหุ้นครั้งถัดไปเขียนแถวนี้ใหม่เอง
  function runRowSync() {
    if (rowSync.promise) { rowSync.again = true; return; }
    if (cashUi.saveState === "saving") { scheduleRowSync(); return; }
    var p;
    try { p = window.fetch("/api/portfolio", { cache: "no-store" }); }
    catch (e) { p = Promise.reject(e); }
    rowSync.promise = p.then(function (r) {
      if (!r || !r.ok) throw thError("HTTP " + (r ? r.status : "?"));
      return r.json();
    }).then(function (j) {
      var data = j && (j.data || (j.quarters ? j : null));
      // server ตอบเอกสารที่ไม่มีไตรมาส → PUT ทับจะลบพอร์ตทั้งก้อน → ไม่ส่ง
      if (!data || !data.quarters || !Object.keys(data.quarters).length) throw thError(CASH_EMPTY_SERVER_TH);
      var copy = {};
      Object.keys(data).forEach(function (k) { copy[k] = data[k]; });
      var next = withForeignRow(copy);
      if (next === copy || stableJson(next.quarters) === stableJson(data.quarters)) return null;   // ไม่ใช่โหมด pm / ตรงอยู่แล้ว
      return window.fetch("/api/portfolio", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ data: next })
      }).then(function (r2) {
        if (!r2 || !r2.ok) throw thError("HTTP " + (r2 ? r2.status : "?"));
        return next;
      });
    }).then(function (next) {
      if (next) onRowSynced(next);
      setRowSyncFailed(false);
    }, function () {
      setRowSyncFailed(true);
    }).then(function () {
      rowSync.promise = null;
      if (rowSync.again) { rowSync.again = false; scheduleRowSync(); }
    });
  }
  // ข้อความล้มเหลวเปลี่ยน → วาดเมื่อผู้ใช้ไม่ได้พิมพ์อยู่ (ตัวเลขบนหน้าไม่เปลี่ยน — โหมด pm คิดจากหุ้นที่ถือ + เงินสด)
  function setRowSyncFailed(v) {
    if (rowSync.failed === v) return;
    rowSync.failed = v;
    renderWhenIdle();
  }
  // PUT สำเร็จ → เอกสารชุดนี้ = ฉบับล่าสุด (psCache) · patch สำเนาใน snapshot ให้หน้าอื่นใน browser นี้ · event แบบบันทึกเงินสด
  //   ไม่วาดใหม่: ตัวเลขบนหน้าไม่เปลี่ยน และผู้ใช้อาจกำลังพิมพ์มูลค่าหุ้นตัวถัดไป (patch ผ่าน repatching = ไม่วาดใน onSnapshotWritten)
  function onRowSynced(next) {
    psCache = { data: next };
    psFetchedAt = Date.now();
    psSeq++;
    ownSaved = next;
    repatching = true;
    try { patchSnapshot(next); } finally { repatching = false; }
    try {
      if (typeof window.CustomEvent === "function" && typeof window.dispatchEvent === "function") {
        window.dispatchEvent(new window.CustomEvent("portfolio-allocation-saved", { detail: { data: next } }));
      }
    } catch (e) { /* ignore */ }
  }

  // type=number: ข้อความที่เบราว์เซอร์อ่านไม่ออกได้ value "" — ไม่ใช่ "เว้นว่าง = ใช้ค่าเดิม"
  function readCashInput(el) {
    var v = el.value;
    if (v === "" && el.validity && el.validity.badInput) return CASH_BAD_INPUT;
    return v == null ? "" : String(v);
  }
  // Enter / ปุ่มบันทึก
  function onCashSave() {
    if (cashUi.saveState === "saving") return;
    var raw = cashEl ? readCashInput(cashEl) : (cashUi.typed == null ? "" : cashUi.typed);
    cashUi.typed = raw;
    var s = String(raw).replace(/^\s+|\s+$/g, "");
    if (s === "" && privacyLocked()) {
      // ล็อกอยู่ ช่องวาดว่าง: เว้นว่าง = ใช้ค่าเดิม → ไม่ GET ไม่ PUT (มีร่างค้าง = ส่งร่างนั้นอีกครั้ง)
      cashUi.typed = null;
      cashUi.inputError = null;
      if (cashUi.draft) { persistCash(cashUi.draft.cash); return; }
      cashUi.saveState = "kept";
      render();
      return;
    }
    var n = s === "" ? NaN : Number(s);
    if (!isCashNum(n)) { cashUi.inputError = CASH_INVALID_TH; render(); return; }
    persistCash(n);
  }
  function onCashRetry() {
    if (cashUi.draft && cashUi.saveState !== "saving") persistCash(cashUi.draft.cash);
  }

  // GET /api/portfolio สด (ตอนเปิดหน้า / กลับมาที่แท็บ) → psCache
  //   · GET ค้างอยู่ = ไม่ยิงซ้ำ (focus + visibilitychange มาคู่กันตอนกลับมาที่แท็บ)
  //   · คำตอบถูกทิ้งเมื่อ psSeq เปลี่ยนระหว่างรอ (บันทึกเงินสด / GET อื่นที่รับไปแล้ว / Load ที่ทิ้ง psCache)
  //   · เอกสารเหมือนชุดที่ใช้วาดอยู่ = ไม่วาดใหม่ · ต่างกันแต่ผู้ใช้พิมพ์อยู่ในช่องของหน้า = รอ focusout
  function ensurePortfolioFetched() {
    if (psInflight) return;
    psInflight = true;
    var seq = psSeq;
    try {
      window.fetch("/api/portfolio", { cache: "no-store" })
        .then(function (r) { return r && r.ok ? r.json() : null; })
        .then(function (j) {
          psInflight = false;
          var d = docOfPs(j);
          if (!d || !d.quarters || !Object.keys(d.quarters).length) return;
          if (seq !== psSeq) return;
          var changed = stableJson(d) !== stableJson(currentDoc());
          psCache = j.data ? j : { data: d };
          psFetchedAt = Date.now();
          psSeq++;
          if (changed) renderWhenIdle();
        }, function () { psInflight = false; /* ใช้สำเนาใน snapshot ต่อ */ });
    } catch (e) { psInflight = false; }
  }
  // เอกสารพอร์ตที่หน้าใช้วาดอยู่ (ไม่รวมร่างที่ซ้อนทับ)
  function currentDoc() {
    if (psCache) return docOfPs(psCache);
    var s = readSnapshot();
    return s ? docOfPs(s.portfolioStatus) : null;
  }
  // มีตัวควบคุมในหน้านี้ถูกโฟกัสอยู่ไหม (ช่องมูลค่าหุ้น / เพิ่มหุ้น / เงินสด หรือปุ่ม) — วาดใหม่ตอนนี้ = ข้อความที่พิมพ์ค้างหาย
  //   ปุ่มนับด้วย: กดปุ่มบันทึก = โฟกัสย้ายมาที่ปุ่มตอน mousedown · วาดใหม่ก่อน mouseup = innerHTML ถูกแทน → คลิกหาย
  function inRoot(el) {
    var root = document.getElementById(ROOT_ID);
    return !!(root && el && typeof root.contains === "function" && root.contains(el));
  }
  function inputFocused() {
    try {
      var ae = document.activeElement;
      return inRoot(ae) && /^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(String(ae.tagName || ""));
    } catch (e) { return false; }
  }
  function renderWhenIdle() {
    if (inputFocused()) { renderPending = true; return; }
    render();
  }
  // ออกจากช่อง → ถ้ามีการวาดที่เลื่อนไว้ → วาด เมื่อโฟกัสออกจากตัวควบคุมของหน้าแล้วเท่านั้น
  //   โฟกัสย้ายไปตัวอื่นใน #pmRoot (relatedTarget อยู่ใน root เช่นปุ่มบันทึก) = ยังใช้งานหน้าอยู่ → คง pending ไว้
  //   รอ focusout ของตัวนั้น (render อื่นที่เกิดก่อน เช่นหลังกดบันทึก ล้าง pending ให้แล้ว)
  function onFocusOut(ev) {
    if (!renderPending) return;
    var next = ev ? ev.relatedTarget : null;
    try { if (next && inRoot(next)) return; } catch (e) { /* ignore */ }
    setTimeout(function () {
      if (!renderPending || inputFocused()) return;
      render();
    }, 0);
  }
  function refreshOnFocus() {
    if (document.hidden) return;
    if (Date.now() - psFetchedAt > 30000) ensurePortfolioFetched();
  }
  // snapshot เขียนใหม่:
  //   · Load Latest Data (loadedAt ใหม่กว่า psCache) → ใช้สำเนาใน snapshot ที่สดกว่า
  //   · ไม่งั้นคง psCache (holdings เปลี่ยน / หน้านี้ patch หลังบันทึก) — และถ้า snapshot เพิ่งถูกเขียนด้วย foreignSleeve
  //     ที่เก่ากว่าของ psCache (เช่น Load ที่อ่าน /api/portfolio ก่อน PUT เงินสด) → patch snapshot ด้วย psCache อีกครั้ง
  //     ให้หน้าอื่นที่อ่านแต่ snapshot ได้เงินสดล่าสุด · หลัง patch เวลาเท่ากัน → รอบถัดไปไม่ patch ซ้ำ (ไม่วน)
  function onSnapshotWritten() {
    if (repatching) return;   // event จาก patch ด้านล่าง — วาดครั้งเดียวที่ท้ายฟังก์ชันนี้
    if (psCache) {
      var s = readSnapshot();
      var at = s && s.loadedAt ? Date.parse(s.loadedAt) : NaN;
      var sd = s ? docOfPs(s.portfolioStatus) : null;
      var pd = docOfPs(psCache);
      if (isFinite(at) && at > psFetchedAt && sd && sd.quarters) { psCache = null; psSeq++; }
      else if (sd && sd.quarters && pd && sleeveTime(pd) != null && (sleeveTime(sd) == null || sleeveTime(sd) < sleeveTime(pd))) {
        repatching = true;
        try { patchSnapshot(pd); } finally { repatching = false; }
      }
    }
    render();
  }
  // โค้ดกันไว้ก่อน: ตอนนี้ไม่มีส่วนอื่นบนหน้านี้ที่บันทึกเอกสารพอร์ต (event บน window ไม่ข้ามหน้า)
  // ถ้าวันหน้ามี → ใช้เอกสารชุดนั้น · event ของตัวเองรับไปแล้วใน onCashPersisted
  function onAllocationSaved(ev) {
    var d = ev && ev.detail && ev.detail.data;
    if (!d || typeof d !== "object" || d === ownSaved) return;
    if (d.quarters) { psCache = { data: d }; psFetchedAt = Date.now(); psSeq++; }
    render();
  }
  // ล็อก/ปลดล็อก Privacy → วาดช่องใหม่ (ล็อก = ว่าง · ปลดล็อก = ค่าที่เก็บไว้) · ทิ้งข้อความที่พิมพ์ค้าง
  function onPrivacyChanged() {
    cashUi.typed = null;
    render();
  }

  // ---------------- render ----------------
  function render() {
    var root = document.getElementById(ROOT_ID);
    if (!root) return;
    renderPending = false;   // วาดรอบนี้ครอบการวาดที่เลื่อนไว้แล้ว
    var refocus = false;
    try { refocus = !!(cashEl && document.activeElement === cashEl); } catch (e) { refocus = false; }
    cashEl = null;   // ช่องของรอบก่อนหายไปพร้อม innerHTML — bind() ตั้งใหม่
    var PM = window.PMEngine, TE = window.ThesisEngine, TD = window.ThesisData;
    if (!PM || !TE || !TD) { root.innerHTML = '<div class="mc-empty"><strong>Engine ไม่พร้อม</strong> — refresh หน้านี้</div>'; return; }
    var snapshot = readSnapshot();
    if (!snapshot) {
      root.innerHTML = headerHtml() + '<div class="mc-empty"><strong>ยังไม่มี Data Snapshot</strong><br>กด Load Latest Data ก่อน — น้ำหนักพอร์ต/เทคนิค/Mega Trend ต้องใช้ข้อมูลจริง</div>';
      return;
    }
    snapshot = effectiveSnapshot(snapshot);
    var inp = buildInputs(snapshot);
    var ap = allocPolicy();
    var out = PM.compute(snapshot, {
      positions: inp.positions.concat(inp.candidates),
      cashPct: inp.cashPct,
      tierDefs: mergedTierDefs(),
      megaStance: megaStance(),
      indexTicker: ap.indexTicker, indexPct: ap.indexPct, splitMethod: ap.splitMethod, maxSinglePct: ap.maxSinglePct
    });
    if (!out.available) { root.innerHTML = '<div class="mc-empty">' + esc(out.reason || "ประเมินไม่ได้") + "</div>"; return; }
    state.out = out;
    intelMap = computeIntelMap(out, snapshot);
    root.innerHTML = headerHtml() +
      sectionOverview(out, inp) +
      sectionCurrent(out, inp) +
      sectionZones(out) +
      sectionDeployment(out, inp) +
      sectionManager(out) +
      sectionRisk(out) +
      sectionMethod();
    bind(root);
    // วาดใหม่ระหว่างพิมพ์ในช่องเงินสด (เช่น holdings อัปเดต) → โฟกัสคืน
    if (refocus && cashEl && typeof cashEl.focus === "function") { try { cashEl.focus(); } catch (e) { /* ignore */ } }
  }
  function headerHtml() {
    return '<header class="pm-header"><h1>💼 AI Portfolio Manager</h1>' +
      "<p>Portfolio Decision Layer — ไม่ตอบว่า \"วันนี้เกิดอะไรขึ้น\" แต่ตอบว่า <b>\"เงินก้อนถัดไปควรไปที่ไหน\"</b> · ใช้เฉพาะ Increase Position / Maintain / Wait / Review Thesis</p></header>";
  }
  function bind(root) {
    root.querySelectorAll("[data-pm-tier]").forEach(function (el) {
      el.addEventListener("change", function () { setTier(el.getAttribute("data-pm-tier"), el.value); });
    });
    // จัดการพอร์ต: แก้มูลค่า / เอาออก / เพิ่มหุ้น (path เขียนเดียวกับทั้งแอป)
    root.querySelectorAll("[data-pm-mv]").forEach(function (el) {
      el.addEventListener("change", function () { saveHoldingAmount(el.getAttribute("data-pm-mv"), el.value, true); });
      el.addEventListener("keydown", function (ev) { if (ev.key === "Enter") { ev.preventDefault(); el.blur(); } });
    });
    root.querySelectorAll("[data-pm-remove]").forEach(function (el) {
      el.addEventListener("click", function () {
        var t = el.getAttribute("data-pm-remove");
        if (confirm("เอา " + t + " ออกจากพอร์ต? (record ยังอยู่เป็น watchlist — เพิ่มกลับได้ตลอด)")) saveHoldingAmount(t, 0, false);
      });
    });
    root.querySelectorAll("[data-pm-addquick]").forEach(function (el) {
      el.addEventListener("click", function () {
        var t = el.getAttribute("data-pm-addquick");
        var ti = document.getElementById("pmAddTicker"), am = document.getElementById("pmAddAmount");
        if (ti) ti.value = t;
        if (am) { am.focus(); am.scrollIntoView({ block: "center", behavior: "smooth" }); }
      });
    });
    var addBtn = document.getElementById("pmAddBtn");
    if (addBtn) addBtn.addEventListener("click", function () {
      var ti = document.getElementById("pmAddTicker"), am = document.getElementById("pmAddAmount");
      var t = ti ? String(ti.value || "").trim().toUpperCase() : "";
      var v = am ? fin(am.value) : null;
      if (!t) { alert("ใส่ ticker ก่อน"); return; }
      if (v == null || v < 0) { alert("ใส่มูลค่า (฿) เป็นตัวเลข"); return; }
      saveHoldingAmount(t, v, true);
    });
    root.querySelectorAll("[data-pm-entry]").forEach(function (el) {
      el.addEventListener("change", function () { toggleEntry(el.getAttribute("data-pm-entry"), el.getAttribute("data-n"), el.checked); });
    });
    root.querySelectorAll("[data-pm-tierdef]").forEach(function (el) {
      el.addEventListener("change", function () { setTierParam(el.getAttribute("data-pm-tierdef"), el.getAttribute("data-f"), el.value); });
    });
    root.querySelectorAll("[data-pm-cview]").forEach(function (el) {
      el.addEventListener("click", function () { setCurrentView(el.getAttribute("data-pm-cview")); });
    });
    root.querySelectorAll("[data-pm-stance]").forEach(function (el) {
      el.addEventListener("click", function () { setStance(el.getAttribute("data-pm-stance")); });
    });
    root.querySelectorAll("[data-pm-alloc]").forEach(function (el) {
      var ev = el.tagName === "SELECT" ? "change" : "change";
      el.addEventListener(ev, function () { setAllocField(el.getAttribute("data-pm-alloc"), el.value); });
    });
    // ช่องเงินสดรอซื้อหุ้นต่างประเทศ: พิมพ์ = จำข้อความไว้ (ยังไม่บันทึก) · Enter / ปุ่มบันทึก = บันทึก (คลิกออกไม่บันทึก)
    var cashInputs = root.querySelectorAll("[data-pm-cash]");
    cashEl = cashInputs.length ? cashInputs[0] : null;
    if (cashEl) {
      var ci = cashEl;
      ci.addEventListener("input", function () { cashUi.typed = readCashInput(ci); });
      ci.addEventListener("keydown", function (ev) {
        if (ev && ev.key === "Enter") { if (ev.preventDefault) ev.preventDefault(); onCashSave(); }
      });
    }
    root.querySelectorAll("[data-pm-cash-save]").forEach(function (el) {
      el.addEventListener("click", function (ev) { if (ev && ev.preventDefault) ev.preventDefault(); onCashSave(); });
    });
    root.querySelectorAll("[data-pm-cash-retry]").forEach(function (el) {
      el.addEventListener("click", onCashRetry);
    });
  }

  // ธงแดง/มูลค่าเปลี่ยนจาก Action Center → snapshot ยิง event นี้ (ไม่ใช่ data-snapshot)
  window.addEventListener("portfolio-data-snapshot", onSnapshotWritten);
  window.addEventListener("portfolio-holdings-updated", render);
  window.addEventListener("portfolio-allocation-saved", onAllocationSaved);
  window.addEventListener("focus", refreshOnFocus);
  // privacy.js ยิง "portfolio-privacy-changed" บน document
  document.addEventListener("portfolio-privacy-changed", onPrivacyChanged);
  document.addEventListener("visibilitychange", refreshOnFocus);
  document.addEventListener("focusout", onFocusOut);
  // ร่างจากรอบก่อน (บันทึกล้ม) → แสดงร่างก่อน แล้วลองส่งเองหนึ่งครั้ง · ล้มอีก = คงร่าง + ปุ่มลองใหม่
  //   server มีเงินสดที่บันทึกหลังร่าง (เครื่องอื่น) → ไม่ส่ง ทิ้งร่าง ใช้ค่าบน server
  var bootDraft = readCashDraft();
  if (bootDraft) { cashUi.draft = bootDraft; cashUi.draftNotice = CASH_DRAFT_TH; }
  function boot() {
    render();
    ensurePortfolioFetched();   // เอกสารพอร์ตสด — snapshot.portfolioStatus เป็นแค่สำเนาตอน Load Latest Data
    if (bootDraft) persistCash(bootDraft.cash, bootDraft);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  window.PortfolioManagerPage = { render: render, persistCash: persistCash };
})();
