(function () {
  "use strict";
  // ============================================================
  // HOME — กล่อง Action "ต้องทำอะไรวันนี้" (การ์ดบนสุดของ /home · แทนการ์ด "กฎ 3 ข้อบอกอะไรวันนี้")
  //
  // ผู้ใช้ (สเปก 2026-11-06): บอกเฉพาะสิ่งที่กฎ 3 ข้อ "เพิ่งพูด" ใน 3 วันหลังสุด ต่อหุ้นหนึ่งการ์ด
  //   1. ซื้อ/ขายตาม EMA12 ตัด EMA26   2. ซื้อ/ขายตาม SMA200   3. ย่อ ≥ 20% จาก high 1 ปี
  //   universe เดิม: BTCUSD · ETHUSD · หุ้นธงแดงในกลุ่มหุ้นต่างประเทศของ Current Portfolio
  //     + หุ้นที่เพิ่งออกจากพอร์ต (ขาย / ปลดธง) อีก WINDOW_DAYS + 1 วันจากวันสุดท้ายที่เครื่องนี้เห็น — ป้าย "เพิ่งออกจากพอร์ต"
  //
  // ไม่คิดกฎเอง: เหตุการณ์มาจาก window.HomeActionEngine.detectEvents (ซึ่งเรียก DecisionJournal.evaluateRules
  // ทีละแท่ง) · หน้าต่าง 3 วัน / เทียบกับบันทึกใน Decision Journal มาจาก HomeActionEngine.reconcile
  // ราคามาจาก /api/ohlc โดยตรง (cache เดิมของการ์ดกฎ 3 ข้อ) · บันทึกอ่านจาก /api/portfolio?doc=journal
  //
  // คำตอบของผู้ใช้บันทึกลง Decision Journal เป็น entry ที่ HomeActionEngine.makeEntry สร้าง (id คงที่ต่อเหตุการณ์):
  //   ทำแล้ว → ฟอร์ม inline (ราคาที่ทำ · ฝั่งซื้อมีเงินที่ซื้อ ฿ ใส่หรือไม่ก็ได้) · ไม่ทำ → บันทึกทันที · แก้ → ฟอร์มเดิม บันทึกทับ id เดิม
  //   รายการที่หมดเวลาโดยไม่ได้ติ๊ก (state.toRecord) → "ไม่ได้ตอบ" อัตโนมัติ รวมครั้งเดียว ส่งครั้งเดียว
  //   ส่งแบบเดียวกับ decision-journal-page: GET สด → mergeDocs → PUT (เรียงคิวด้วย putChain)
  //   ส่งไม่สำเร็จ → ร่าง decision_journal_draft_v1 รูปเดียวกับหน้า journal · เปิดหน้า/ดึงใหม่ครั้งถัดไปส่งร่างก่อน
  //   ปุ่มติ๊กทุกปุ่มปิดเมื่อยังโหลดบันทึกจากเซิร์ฟเวอร์ไม่ได้ (ห้ามเขียนทับเอกสารที่ยังไม่เห็น)
  //
  // สรุปผล + ประวัติ (พับได้ ใต้การ์ด · <details data-ha-summary> เปิด/ปิดจำในเครื่อง):
  //   ตัวเลขทั้งหมดมาจาก HomeActionEngine.summary (สัญญาณ 90 วันหลังสุด · ช่วงวัดผล 7|30 สลับได้ ไม่ดึงราคาใหม่)
  //   outcomes ต่อ entry = DecisionJournal.outcomes(entry, bars, now) — ราคาจากแถว universe ที่โหลดแล้ว
  //   สัญลักษณ์ในประวัติที่ไม่อยู่ใน universe (ขายออก/ปลดธง) ดึงเพิ่มผ่าน fetchBars เดิม (cache + inflight เดียวกัน)
  //   ดึงไม่ได้ = ไม่มี outcome → แถวบอก "ไม่มีราคา" (ไม่เดา)
  //   เงินแสดงเป็นข้อความ "฿12,300" เท่านั้น (privacy.js ซ่อนเอง) · ห้ามใส่เงินใน title
  //   Privacy Lock: ช่อง "เงินที่ซื้อ" ที่บันทึกไว้แล้ววาดเป็นช่องว่าง · ว่างตอนยืนยัน = คงค่าเดิม
  // สิ่งที่กล่องบอก = ข้อเท็จจริงของกฎที่ผู้ใช้ตั้งเอง ไม่ใช่คำแนะนำการลงทุน
  // ES5 เท่านั้น · wire ผ่าน [data-ha-*] · ไม่แตะ state ของ mission-control-page.js
  // ============================================================

  var MOUNT_ID = "haRoot";
  var CACHE_KEY = "home_rules_ohlc_v1";          // ชื่อเดิมของการ์ดกฎ 3 ข้อ — ตอนนี้เป็น prefix ของ record ละสัญลักษณ์ใน BigCache
  var CACHE_PREFIX = CACHE_KEY + ":";
  var DOC_URL = "/api/portfolio?doc=journal";
  var DRAFT_KEY = "decision_journal_draft_v1";   // ร่างของ Decision Journal { doc, savedAt } — ใช้ร่วมกับหน้า journal (หน้านั้นส่งร่างเองตอนเปิด)
  var LAUNCH_KEY = "home_action_launched_v1";
  var HORIZON_KEY = "home_action_horizon_v1";     // ช่วงวัดผลที่เลือกในสรุป "7" | "30"
  var SUMMARY_KEY = "home_action_summary_open_v1"; // สรุปเปิดอยู่ไหม "1" | "0"
  var RECENT_KEY = "home_action_recent_v1";       // หุ้นในพอร์ตที่เครื่องนี้เคยเห็น { sym: ymd ที่อยู่ใน universe ครั้งล่าสุด } (เฉพาะเครื่องนี้)
  var HISTORY_DAYS = 730;         // ≈ 500 แท่ง → มี SMA200 + high 1 ปี (เหมือน decision-journal-page)
  var CONCURRENCY = 4;
  var ALWAYS = ["BTCUSD", "ETHUSD"];     // ผู้ใช้สั่งให้ติดตามเสมอ (คีย์ canonical ของเอนจิน · providerSymbol แปลงให้ /api/ohlc)
  var MAX_CACHE_SYMBOLS = 24;

  var state = {
    doc: null,           // เอกสาร Decision Journal ที่โหลดได้ล่าสุด (ผ่าน mergeDocs) · ไม่เคยโหลดได้ = null
    docState: "idle",    // idle | loading | ok | error
    docError: null,      // เหตุผลภาษาไทยเมื่อ docState = error
    launchedAt: null,    // วันเริ่มใช้กล่อง (ymd) — LAUNCH_KEY → doc.haLaunchedAt → วันนี้
    rows: [],            // { sym, source, status: loading|ok|stale|error|no-bars, bars, det, error, sourceType, staleDays }
    events: [],          // เหตุการณ์ทุกสัญลักษณ์ของรอบล่าสุด — reconcile ใหม่หลังบันทึกโดยไม่ดึงราคาใหม่
    items: [],           // reconcile().open รวมทุกสัญลักษณ์: { event, entry, vis }
    toRecord: [],        // reconcile().expired (เฉพาะตอน docState ok) — บันทึกเป็น "ไม่ได้ตอบ" หลังโหลด
    form: null,          // ฟอร์มที่กางอยู่ (ทีละฟอร์ม): { id, mode: new|edit, response: done|skipped, execPrice, amount, amountSaved, error, focus, at }
                         //   execPrice / amount = สตริงดิบจากช่องกรอก (เก็บไว้ข้ามการวาดใหม่) · amountSaved = จำนวนเงินที่บันทึกไว้ (สตริง · ไม่มี = "")
                         //   at = card (ใต้บรรทัดในการ์ด) | hist (ใต้แถวในตารางประวัติ)
    pending: null,       // ส่วนของเอกสารที่ยังไม่ยืนยันว่าถึงเซิร์ฟเวอร์ (กำลังส่ง / ส่งไม่สำเร็จ) · ถึงแล้ว = null
    unseen: null,        // ส่วนที่หน้านี้ PUT สำเร็จแล้ว แต่ GET ของการโหลดยังไม่สะท้อน (GET ถูกตอบก่อน PUT ถึง)
                         //   รวมเข้าเอกสารทุกครั้งที่โหลดจนกว่าสำเนาเซิร์ฟเวอร์จะครอบครบ แล้วจึงล้าง
    syncNote: null,      // ส่งไม่สำเร็จ → "ยังไม่ถึงเซิร์ฟเวอร์ …" · ส่งสำเร็จ = null
    syncReason: null,    // เหตุผลที่ส่งไม่สำเร็จ (ภาษาไทย)
    actionError: null,   // บันทึกไม่ได้เพราะสร้าง entry ไม่ได้ (makeEntry คืน null)
    loading: false,
    loadedAt: null,      // nowBangkok ตอนคิดเสร็จ
    universeNote: null,  // ทำไมไม่มีหุ้นในพอร์ต (ถ้าไม่มี)
    recentOnly: {},      // สัญลักษณ์ (canonical) ที่สแกนเพราะ "เพิ่งออกจากพอร์ต" เท่านั้น → ไม่มีฐานเงิน (positionOf = ไม่ถือ)
    outcomesById: {},    // id → DecisionJournal.outcomes(entry, bars, now) ของ entry กล่องในช่วงสรุป · ไม่มีราคา = ไม่มีคีย์
    histBars: {},        // สัญลักษณ์ในประวัติที่ไม่อยู่ใน universe → แท่งราคา (เฉพาะที่ดึงสำเร็จและมีแท่ง)
    histPending: {},     // สัญลักษณ์ในประวัติที่กำลังดึงราคา
    horizonDays: savedHorizon(),     // ช่วงวัดผลของสรุป 7 | 30 (ค่าเริ่มต้น 7)
    summaryOpen: savedSummaryOpen(), // สรุปกางอยู่ไหม (ค่าเริ่มต้น พับ)
    nowOverride: null
  };

  // ---------------- helpers ----------------
  function DJ() { return window.DecisionJournal || null; }
  function HAE() { return window.HomeActionEngine || null; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function each(list, fn) { for (var i = 0; i < (list ? list.length : 0); i++) fn(list[i], i); }
  function isNum(n) { return typeof n === "number" && isFinite(n); }
  function fmtNum(n, dp) {
    if (!isNum(n)) return "—";
    var s = n.toFixed(dp);
    var parts = s.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  }
  function fmtPx(n) { return fmtNum(n, isNum(n) && Math.abs(n) < 1 ? 4 : 2); }
  function fmtPct(n, dp) { return isNum(n) ? (n > 0 ? "+" : "") + n.toFixed(dp) + "%" : "—"; }
  function wallClock() { return new Date(); }
  function nowBangkok() {
    if (typeof state.nowOverride === "string" && state.nowOverride) return state.nowOverride;
    if (typeof window.__DJ_NOW === "string" && window.__DJ_NOW) return window.__DJ_NOW;
    var d = wallClock();
    try {
      if (typeof Intl !== "undefined" && Intl && Intl.DateTimeFormat) {
        var fmt = new Intl.DateTimeFormat("en-GB", {
          timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
          hour: "2-digit", minute: "2-digit", hourCycle: "h23"
        });
        var parts = fmt.formatToParts(d), p = {};
        for (var i = 0; i < parts.length; i++) p[parts[i].type] = parts[i].value;
        var hh = p.hour === "24" ? "00" : p.hour;
        var s = p.year + "-" + p.month + "-" + p.day + "T" + hh + ":" + p.minute;
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return s;
      }
    } catch (e) { /* ตกไปใช้ UTC+7 */ }
    return new Date(d.getTime() + 7 * 3600000).toISOString().slice(0, 16);
  }
  function lsGet(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } }
  function lsSet(key, val) { try { window.localStorage.setItem(key, val); return true; } catch (e) { return false; } }
  function lsRemove(key) { try { window.localStorage.removeItem(key); } catch (e) { /* ไม่เป็นไร */ } }
  function savedHorizon() { return lsGet(HORIZON_KEY) === "30" ? 30 : 7; }
  function savedSummaryOpen() { return lsGet(SUMMARY_KEY) === "1"; }
  // Privacy Lock (privacy.js) ล็อกอยู่ไหม · ไม่มี privacy.js = ไม่ล็อก
  function privacyLocked() {
    var P = window.PortfolioPrivacy;
    try { return !!(P && typeof P.isLocked === "function" && P.isLocked()); } catch (e) { return false; }
  }
  // เงินเป็นข้อความเสมอ (privacy.js ซ่อน "฿…" ให้เอง) · THB → "฿12,300" · สกุลอื่น → "USD 123.45" · ค่าสัมบูรณ์ (ป้ายบอกทิศ)
  //   privacy.js จับได้แค่ ฿ / บาท / THB → สกุลอื่นซ่อนเองตอนล็อก ("USD XXX") ไม่งั้นเงิน ÷ % ย้อนหาขนาดพอร์ตได้
  //   ล็อก/ปลดล็อก → portfolio-privacy-changed → วาดใหม่ (ผูกไว้ใน boot)
  function moneyAbs(amount, currency) {
    var a = Math.abs(amount);
    if (currency === "THB") return "฿" + fmtNum(a, 0);
    return String(currency) + " " + (privacyLocked() ? "XXX" : fmtNum(a, 2));
  }
  // ป้ายเงินจากเครื่องหมาย (ค่าที่ปัดแล้ว — เศษสตางค์ไม่ได้ป้าย "เสีย")
  //   ทำตามกฎ: บวก "ได้" · ลบ "เสีย" · ไม่ทำ/ไม่ได้ตอบ: บวก "พลาด" (ถ้าทำจะได้) · ลบ "เลี่ยงได้" · ไม่รู้คำตอบ: เครื่องหมายลบอย่างเดียว
  function moneyText(amount, currency, group) {
    var r = currency === "THB" ? Math.round(amount) : Math.round(amount * 100) / 100;
    var word = "";
    if (r > 0) word = group === "followed" ? "ได้ " : (group === "missed" ? "พลาด " : "");
    else if (r < 0) word = group === "followed" ? "เสีย " : (group === "missed" ? "เลี่ยงได้ " : "−");
    return word + moneyAbs(r, currency);
  }
  // ตราประทับ updatedAt / respondedAt = เวลาจริง ISO (กติกาเดียวกับ decision-journal-page)
  function isoNow() { return wallClock().toISOString(); }
  // ตราประทับที่ใหม่กว่า prev เสมอ — mergeDocs ให้ updatedAt ใหม่กว่าชนะ (นาฬิกาเครื่องนี้ช้ากว่าเครื่องที่บันทึกก่อน คำตอบที่แก้ต้องไม่แพ้)
  function stampAfter(prev) {
    var now = isoNow();
    if (typeof prev !== "string" || prev < now) return now;
    var ms = Date.parse(prev);
    return isFinite(ms) ? new Date(ms + 1).toISOString() : now;
  }
  // ช่องตัวเลขที่ผู้ใช้พิมพ์: ตัดคอมมา/ช่องว่าง · ว่าง = null · อ่านไม่ได้ = NaN
  function numIn(v) {
    var s = String(v == null ? "" : v).replace(/[,\s]/g, "");
    if (s === "") return null;
    var n = Number(s);
    return isFinite(n) ? n : NaN;
  }
  // ค่าเริ่มต้นของช่องราคา: ปัด 2 ตำแหน่ง (4 เมื่อ < 1) ตัดศูนย์ท้าย ไม่มีคอมมา (input type=number อ่านคอมมาไม่ได้)
  function inputNum(n) { return isNum(n) ? String(Number(n.toFixed(Math.abs(n) < 1 ? 4 : 2))) : ""; }

  // ---------------- universe: BTC · ETH · หุ้นใน Current Portfolio (AI Portfolio Manager) ----------------
  // กติกาเดียวกับ buildInputs ของ portfolio-manager-page.js: ธงแดง (isHolding) + sleeve foreign-stock
  //   (ไม่มี bucket → หุ้นไทย .BK = thai-stock · BTC = bitcoin · RMF/SSF = thai-fund · ที่เหลือ foreign-stock)
  //   GOOGL → GOOG เหมือน thesis KB
  function snapshot() {
    try { return (window.PortfolioDataSnapshot && window.PortfolioDataSnapshot.read && window.PortfolioDataSnapshot.read()) || null; } catch (e) { return null; }
  }
  function holdingsNow() {
    var core = window.PortfolioCore;
    var local = null;
    if (core && typeof core.readLocalHoldings === "function") {
      try { local = core.readLocalHoldings(); } catch (e) { local = null; }
    }
    if (local && local.length) return local;
    var snap = snapshot();
    var rows = snap && snap.portfolioHoldings && snap.portfolioHoldings.data;
    rows = Array.isArray(rows) ? rows : [];
    if (core && typeof core.dedupeHoldings === "function") { try { return core.dedupeHoldings(rows); } catch (e) { /* ใช้ดิบ */ } }
    return rows;
  }
  function canonical(t) {
    var core = window.PortfolioCore;
    if (core && typeof core.canonicalSymbolFromTicker === "function") { try { return String(core.canonicalSymbolFromTicker(t) || "").toUpperCase(); } catch (e) { /* ด้านล่าง */ } }
    return String(t || "").toUpperCase().replace(/^\s+|\s+$/g, "");
  }
  function bucketOf(h, raw) {
    if (h.portfolioBucket) return h.portfolioBucket;
    if (/\.BK$/.test(raw)) return "thai-stock";
    if (raw.indexOf("BTC") >= 0) return "bitcoin";
    var isThaiFund = /RMF|SSF/i.test(raw) || /THAI_MUTUAL_FUND|MUTUAL/i.test(String(h.assetType || ""));
    return isThaiFund ? "thai-fund" : "foreign-stock";
  }
  function readRecent() {
    var j = null;
    try { j = JSON.parse(lsGet(RECENT_KEY) || "{}"); } catch (e) { j = null; }
    return j && typeof j === "object" && !Array.isArray(j) ? j : {};
  }
  // คืน [{ sym, source }] · sym = คีย์ canonical ของเอนจิน · source = "always" | "portfolio" | "recent"
  //   recent = หุ้นที่เพิ่งออกจาก universe (ขายแล้ว / ปลดธงแดง / ย้าย sleeve) — สแกนต่อถึงวันที่ WINDOW_DAYS + 1
  //     นับจากวันสุดท้ายที่เครื่องนี้เห็นในพอร์ต · สัญญาณที่ขึ้นการ์ดไปแล้วจึงไม่หายก่อนติ๊ก และหมดเวลาแล้วถูกบันทึกเป็น "ไม่ได้ตอบ"
  //     (สัญญาณของแท่ง D ขึ้นการ์ดได้เร็วสุดวัน D กรุงเทพ — ตลาดที่ปิดวันเดียวกัน เช่น .VN / .T — จึงเห็นในพอร์ตครั้งสุดท้าย ≥ D
  //      → วันแรกที่หมดเวลา D + WINDOW_DAYS + 1 ≤ วันสุดท้ายที่เห็น + WINDOW_DAYS + 1)
  //     เกินนั้น = เลิกสแกนและลบออกจาก RECENT_KEY · เก็บเฉพาะในเครื่อง (localStorage)
  function buildUniverse() {
    var E = DJ(), HA = HAE();
    var out = [], seen = {};
    each(ALWAYS, function (p) { seen[p] = 1; out.push({ sym: p, source: "always" }); });
    var holdings = holdingsNow(), n = 0;
    each(holdings, function (h) {
      if (!h || !h.isHolding) return;
      var raw = canonical(h.canonicalSymbol || h.ticker);
      if (!raw) return;
      if (bucketOf(h, raw) !== "foreign-stock") return;
      var key = raw === "GOOGL" ? "GOOG" : raw;
      if (seen[key]) return;
      seen[key] = 1;
      n++;
      out.push({ sym: key, source: "portfolio" });
    });
    state.recentOnly = {};
    var today = nowBangkok().slice(0, 10);
    if (E && HA && E.isYmd(today)) {
      var recent = readRecent(), keep = {}, extra = [], k, gap;
      each(out, function (u) { if (u.source === "portfolio") keep[u.sym] = today; });
      for (k in recent) {
        if (!Object.prototype.hasOwnProperty.call(recent, k) || seen[k] || !E.canonicalSymbol(k) || !E.isYmd(recent[k])) continue;
        gap = E.daysBetween(recent[k], today);
        if (!isNum(gap) || gap > HA.WINDOW_DAYS + 1) continue;
        keep[k] = recent[k];
        extra.push(k);
      }
      extra.sort();
      each(extra, function (s) {
        seen[s] = 1;
        out.push({ sym: s, source: "recent" });
        state.recentOnly[E.canonicalSymbol(s)] = 1;
      });
      lsSet(RECENT_KEY, JSON.stringify(keep));
    }
    state.universeNote = n ? null : (holdings.length
      ? "ยังไม่มีหุ้นธงแดงในกลุ่มหุ้นต่างประเทศ — ปักธงแดงที่ Action Center หรือ AI Portfolio Manager"
      : "ยังไม่มีรายการหุ้นในพอร์ต — กด Load Latest Data หรือเพิ่มที่ AI Portfolio Manager");
    return out;
  }

  // ---------------- ราคา: /api/ohlc + cache ในเครื่อง (คีย์เดียวกับ decision-journal: วัน + แท่งที่ปิด) ----------------
  // ที่เก็บ cache (2026-11-10): window.BigCache (IndexedDB) record ละสัญลักษณ์ "home_rules_ohlc_v1:<SYM>" → entry รูปเดิม
  //   { at, start, cutoff, sourceType, bars: แถวอัด } — ย้ายออกจาก localStorage เพราะก้อนเดียว ≈1M ตัวอักษร
  //   กินโควตาจน Data Snapshot บันทึกไม่ลง (เปลี่ยนหน้าแล้วกลับเป็นชุดเก่า) · record ละตัว = ดึงขนานไม่แย่งเขียนก้อนเดียว
  //   BigCache เป็น async → อ่าน/เขียน/ล้าง เป็น Promise · ไม่มี BigCache (หน้าไม่ได้โหลด big-cache.js) → memory ของหน้านี้
  //   force refresh ล้างทุก record ใต้ prefix · ทุกการอ่านรอให้ล้างเสร็จก่อน (เท่ากับ removeItem ทันทีแบบเดิม)
  //   MAX_CACHE_SYMBOLS: ตัดตัวที่ at เก่าสุดทิ้งตอนจบ refresh (ไม่มีงานเขียนค้าง — ไม่ลบของที่เพิ่งเขียน)
  function packBars(bars) { return bars.map(function (b) { return [b.date, b.open, b.high, b.low, b.close, b.volume]; }); }
  function unpackBars(rows) {
    return (rows || []).map(function (r) { return { date: r[0], open: r[1], high: r[2], low: r[3], close: r[4], volume: r[5] }; });
  }
  function noop() { return undefined; }
  var memStore = null;
  function cacheStore() {
    var bc = window.BigCache;
    if (bc && typeof bc.get === "function" && typeof bc.set === "function" && typeof bc.del === "function" && typeof bc.keys === "function") return bc;
    if (!memStore) {
      var m = {};
      memStore = {
        get: function (k) { return Promise.resolve(Object.prototype.hasOwnProperty.call(m, "k:" + k) ? m["k:" + k] : null); },
        set: function (k, v) { m["k:" + k] = v; return Promise.resolve(true); },
        del: function (k) { delete m["k:" + k]; return Promise.resolve(true); },
        keys: function (p) {
          var out = [], k;
          for (k in m) if (Object.prototype.hasOwnProperty.call(m, k) && k.slice(2).indexOf(p) === 0) out.push(k.slice(2));
          return Promise.resolve(out.sort());
        }
      };
    }
    return memStore;
  }
  function attempt(fn) { try { return Promise.resolve(fn()); } catch (e) { return Promise.reject(e); } }
  var cacheClearing = null;     // force refresh: การล้างที่กำลังทำ — อ่าน cache ทุกครั้งรอให้เสร็จก่อน
  function cacheRead(sym) {
    var st = cacheStore();
    return (cacheClearing || Promise.resolve()).then(function () {
      return attempt(function () { return st.get(CACHE_PREFIX + sym); });
    }).then(function (v) { return v && typeof v === "object" ? v : null; }, function () { return null; });
  }
  function cacheWrite(sym, entry) {
    var st = cacheStore();
    return attempt(function () { return st.set(CACHE_PREFIX + sym, entry); }).then(noop, noop);
  }
  function cacheClear() {
    var st = cacheStore();
    var p = (cacheClearing || Promise.resolve()).then(function () {
      return attempt(function () { return st.keys(CACHE_PREFIX); });
    }).then(function (keys) {
      var dels = [];
      each(keys, function (k) { dels.push(attempt(function () { return st.del(k); }).then(noop, noop)); });
      return Promise.all(dels);
    }).then(noop, noop);
    cacheClearing = p;
    p.then(function () { if (cacheClearing === p) cacheClearing = null; });
    return p;
  }
  // เก็บไม่เกิน MAX_CACHE_SYMBOLS record — ตัดตัวที่ at เก่าสุดก่อน (กติกาเดิม) · ทำทีละรอบ ขอซ้อน = ทำอีกรอบหลังจบ
  var pruning = null, pruneAgain = false;
  function cachePrune() {
    if (pruning) { pruneAgain = true; return pruning; }
    var st = cacheStore();
    pruning = (cacheClearing || Promise.resolve()).then(function () {
      return attempt(function () { return st.keys(CACHE_PREFIX); });
    }).then(function (keys) {
      keys = keys || [];
      if (keys.length <= MAX_CACHE_SYMBOLS) return undefined;
      var reads = [];
      each(keys, function (k) {
        reads.push(attempt(function () { return st.get(k); }).then(function (v) { return { k: k, at: v && v.at }; }, function () { return { k: k, at: undefined }; }));
      });
      return Promise.all(reads).then(function (list) {
        list.sort(function (a, b) { return String(a.at) < String(b.at) ? -1 : 1; });
        var dels = [];
        for (var i = 0; i < list.length - MAX_CACHE_SYMBOLS; i++) {
          (function (k) { dels.push(attempt(function () { return st.del(k); }).then(noop, noop)); })(list[i].k);
        }
        return Promise.all(dels);
      });
    }).then(noop, noop).then(function () {
      pruning = null;
      if (pruneAgain) { pruneAgain = false; return cachePrune(); }
      return undefined;
    });
    return pruning;
  }
  function cacheFits(c, start, ymd, cutoff) {
    return !!(c && c.at === ymd && c.cutoff === cutoff && c.start <= start && Array.isArray(c.bars));
  }
  // คืน { ok, status, body, error? } เสมอ ไม่ reject (เครือข่ายล้ม = status 0)
  function asResult(p) {
    return p.then(function (r) {
      return r.text().then(function (t) {
        var body = null;
        try { body = JSON.parse(t); } catch (e) { body = null; }
        return { ok: !!r.ok, status: r.status, body: body };
      }, function () { return { ok: !!r.ok, status: r.status, body: null }; });
    }, function (e) { return { ok: false, status: 0, body: null, error: String((e && e.message) || e || "") }; });
  }
  function getJson(url) {
    var p;
    try { p = fetch(url, { cache: "no-store" }); } catch (e) { p = Promise.reject(e); }
    return asResult(p);
  }
  function sendJson(url, method, payload) {
    var p;
    try {
      p = fetch(url, { method: method, cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } catch (e) { p = Promise.reject(e); }
    return asResult(p);
  }
  var barsInflight = {};   // คำขอที่ค้างอยู่ (สัญลักษณ์ + วัน + แท่งที่ปิด) — refresh ซ้อน (boot + event) ใช้ promise เดิม ไม่ยิงซ้ำ
  function fetchBars(symbol) {
    var E = DJ();
    var sym = E.canonicalSymbol(symbol);
    var now = nowBangkok(), ymd = now.slice(0, 10);
    var cutoff = E.closedBarCutoff(E.marketOf(sym), now);
    var start = E.ymdAdd(ymd, -HISTORY_DAYS);
    // คำขอเดียวต่อ (สัญลักษณ์ + วัน + แท่งที่ปิด) ครอบทั้งการอ่าน cache และการดึง — ลงทะเบียนทันที (sync) ก่อนรออะไร
    var key = sym + "|" + start + "|" + ymd + "|" + cutoff;
    if (barsInflight[key]) return barsInflight[key];
    var p = cacheRead(sym).then(function (disk) {
      if (cacheFits(disk, start, ymd, cutoff)) return { ok: true, bars: unpackBars(disk.bars), sourceType: disk.sourceType || null, cached: true };
      var url = "/api/ohlc?symbol=" + encodeURIComponent(E.providerSymbol(sym)) + "&start=" + start + "&_ts=" + wallClock().getTime();
      return getJson(url).then(function (r) {
        var body = r.body && typeof r.body === "object" ? r.body : {};
        var bars = Array.isArray(body.bars) ? body.bars : null;
        var notFound = !r.ok && typeof body.error === "string" && /\(404\)/.test(body.error);
        if (!(r.ok && bars) && !notFound) {
          return { ok: false, bars: [], sourceType: null, error: r.error || (typeof body.error === "string" ? body.error : "HTTP " + r.status) };
        }
        var got = notFound ? [] : bars;
        var sourceType = notFound ? "NOT_FOUND" : (typeof body.sourceType === "string" ? body.sourceType : null);
        return cacheWrite(sym, { at: ymd, start: start, cutoff: cutoff, sourceType: sourceType, bars: packBars(got) }).then(function () {
          return { ok: true, bars: got, sourceType: sourceType, notFound: notFound };
        });
      });
    });
    barsInflight[key] = p;
    function settle() { if (barsInflight[key] === p) delete barsInflight[key]; }
    p.then(settle, settle);
    return p;
  }
  function pool(items, limit, worker) {
    if (typeof window.mapWithConcurrency === "function") {
      try { return Promise.resolve(window.mapWithConcurrency(items, limit, worker)); } catch (e) { return Promise.resolve([]); }
    }
    return new Promise(function (resolve) {
      var n = items.length, next = 0, done = 0;
      if (!n) { resolve([]); return; }
      function finishOne() { done++; if (done === n) resolve([]); else runNext(); }
      function runNext() {
        if (next >= n) return;
        var i = next++;
        var p;
        try { p = Promise.resolve(worker(items[i], i)); } catch (e) { p = Promise.resolve(); }
        p.then(finishOne, finishOne);
      }
      for (var k = 0; k < Math.min(limit, n); k++) runNext();
    });
  }

  // ---------------- เอกสาร Decision Journal: โหลด ----------------
  function docFailReason(r) {
    if (r.status === 0) return "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" + (r.error ? " (" + r.error + ")" : "");
    if (r.status === 401) return "ต้องเข้าสู่ระบบก่อน (HTTP 401)";
    if (!r.body || typeof r.body !== "object") return "เซิร์ฟเวอร์ตอบกลับมาอ่านไม่ได้ (HTTP " + r.status + ")";
    return "HTTP " + r.status + (typeof r.body.error === "string" ? " · " + r.body.error : "");
  }
  function isDocShape(d) {
    var E = DJ();
    // Array.isArray (ES5) ไม่ใช่ instanceof — ข้อมูลจาก fetch อาจมาจากคนละ realm
    return !!d && typeof d === "object" && !Array.isArray(d) && d.v === E.VERSION &&
      Array.isArray(d.entries) && (d.trades === undefined || Array.isArray(d.trades));
  }
  // → { ok: true, doc } | { ok: false, error }
  //   data === null = เซิร์ฟเวอร์ยังไม่มีแถวนี้ (ยังไม่เคยบันทึก) → เอกสารว่าง (กติกาเดียวกับ decision-journal-page)
  //   haLaunchedAt ไม่อยู่ในสัญญาของ mergeDocs (ทิ้งคีย์ที่ไม่รู้จัก) → ก๊อปกลับเอง
  function loadDoc() {
    var E = DJ();
    return getJson(DOC_URL).then(function (r) {
      if (!r.ok || !r.body || typeof r.body !== "object") return { ok: false, error: docFailReason(r) };
      var data = r.body.data;
      if (data == null) return { ok: true, doc: E.emptyDoc() };
      if (!isDocShape(data)) return { ok: false, error: "ข้อมูลบนเซิร์ฟเวอร์ผิดรูป (HTTP " + r.status + ")" };
      var doc = E.mergeDocs(E.emptyDoc(), data);
      if (E.isYmd(data.haLaunchedAt)) doc.haLaunchedAt = data.haLaunchedAt;
      return { ok: true, doc: doc };
    }, function (e) {
      return { ok: false, error: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ (" + String((e && e.message) || e || "") + ")" };
    });
  }
  // วันเริ่มใช้กล่อง: localStorage → doc.haLaunchedAt → วันนี้ (เก็บลงเครื่อง · ขั้นถัดไปเขียนลงเอกสาร)
  //   ตอนโหลดเอกสารไม่ได้และเครื่องนี้ยังไม่เคยมีค่า ใช้วันนี้ชั่วคราวแต่ไม่เก็บ (เอกสารอาจมีวันที่เก่ากว่าจากเครื่องอื่น)
  function resolveLaunch(doc, docOk) {
    var E = DJ();
    var saved = lsGet(LAUNCH_KEY);
    if (E.isYmd(saved)) return saved;
    if (doc && E.isYmd(doc.haLaunchedAt)) { lsSet(LAUNCH_KEY, doc.haLaunchedAt); return doc.haLaunchedAt; }
    var today = nowBangkok().slice(0, 10);
    if (docOk) lsSet(LAUNCH_KEY, today);
    return today;
  }
  // ขอบเขตเหตุการณ์ที่กล่องดูแล = เหตุการณ์ที่ยังเห็นได้ในวันเริ่มใช้ (วันเริ่ม − WINDOW_DAYS) เป็นต้นไป
  //   วันแรกจึงเห็นสัญญาณ 3 วันหลังสุดตามปกติ · สัญญาณที่หมดเวลาไปก่อนเริ่มใช้ ไม่แสดงและไม่ถูกบันทึกเป็น "ไม่ได้ตอบ"
  function scopeStart(launchedAt) {
    var E = DJ(), HA = HAE();
    return E.isYmd(launchedAt) ? E.ymdAdd(launchedAt, -HA.WINDOW_DAYS) : null;
  }
  // haLaunchedAt ที่จะเขียนลงเอกสาร: ของเอกสารเอง → วันเริ่มใช้ของหน้านี้ · ไม่มีทั้งคู่ = null
  function launchFor(doc) {
    var E = DJ();
    if (doc && E.isYmd(doc.haLaunchedAt)) return doc.haLaunchedAt;
    return E.isYmd(state.launchedAt) ? state.launchedAt : null;
  }
  // mergeDocs ทิ้งคีย์ระดับเอกสารที่ไม่รู้จัก → ใส่ haLaunchedAt กลับเอง
  function withLaunch(doc, ymd) {
    if (doc && DJ().isYmd(ymd)) doc.haLaunchedAt = ymd;
    return doc;
  }

  // ---------------- เอกสาร Decision Journal: ร่างในเครื่อง (รูปเดียวกับ decision-journal-page) ----------------
  var SYNC_NOTE = "ยังไม่ถึงเซิร์ฟเวอร์ — เก็บไว้ในเครื่อง จะส่งใหม่เมื่อเปิดหน้า";
  var NO_DRAFT_NOTE = "ยังไม่ถึงเซิร์ฟเวอร์ และเก็บไว้ในเครื่องไม่ได้ — กดดึงราคาใหม่เพื่อส่งอีกครั้งก่อนปิดหน้า";
  function readDraft() {
    var raw = lsGet(DRAFT_KEY);
    if (!raw) return null;
    var d;
    try { d = JSON.parse(raw); } catch (e) { return null; }
    if (!d || typeof d !== "object" || !isDocShape(d.doc)) return null;
    return { doc: d.doc, savedAt: typeof d.savedAt === "string" ? d.savedAt : null };
  }
  function writeDraft(doc) {
    var s;
    try { s = JSON.stringify({ doc: doc, savedAt: isoNow() }); } catch (e) { return false; }
    return lsSet(DRAFT_KEY, s);
  }
  // ร่าง + ของที่ยังไม่ยืนยันในหน่วยความจำ รวมเป็นเอกสารเดียว (null = ไม่มีอะไรค้าง)
  function pendingUnion() {
    var D = DJ(), d = readDraft();
    var p = d ? d.doc : null;
    if (state.pending) p = p ? D.mergeDocs(p, state.pending) : state.pending;
    return p;
  }
  // doc ครอบ sub ครบไหม: ทุกรายการ (ที่มี id) ของ sub อยู่ใน doc ด้วย updatedAt เท่ากันหรือใหม่กว่า (กติกาเดียวกับ mergeDocs)
  function covers(doc, sub) {
    if (!sub) return true;
    if (!doc) return false;
    var have = {}, ok = true;
    each(doc.entries, function (x) { if (x && typeof x.id === "string") have["e:" + x.id] = x; });
    each(doc.trades, function (x) { if (x && typeof x.id === "string") have["t:" + x.id] = x; });
    function check(prefix, list) {
      each(list, function (s) {
        if (!ok || !s || typeof s !== "object" || typeof s.id !== "string" || s.id === "") return;
        var m = have[prefix + s.id];
        var su = typeof s.updatedAt === "string" ? s.updatedAt : "";
        var mu = m && typeof m.updatedAt === "string" ? m.updatedAt : "";
        if (!m || mu < su) ok = false;
      });
    }
    check("e:", sub.entries);
    check("t:", sub.trades);
    return ok;
  }

  // ---------------- เอกสาร Decision Journal: ส่งขึ้นเซิร์ฟเวอร์ (GET สด → merge → PUT) ----------------
  // putDoc(delta) → Promise<{ ok, note }> · delta = ส่วนที่เพิ่งเปลี่ยน (null = ส่งแค่ร่าง/ของค้าง)
  //   ส่งเมื่อมีของค้างเท่านั้น (ร่าง ∪ ของที่ยังไม่ยืนยัน ∪ delta) · PUT = สำเนาสด ∪ เอกสารในหน้า ∪ ของค้าง
  //   เรียงคิวด้วย putChain (ไม่ส่งซ้อนกัน)
  //   ล้ม → ร่าง = เฉพาะของที่ยังไม่ถึงเซิร์ฟเวอร์ รวมกับร่างเดิม · สำเร็จ → ล้างร่างเมื่อ doc ที่ PUT ครอบร่างครบ
  var putChain = null;
  function putDoc(delta) {
    var D = DJ();
    if (delta) state.pending = D.mergeDocs(state.pending || D.emptyDoc(), delta);
    function run() { return putOnce(); }
    var p = putChain ? putChain.then(run, run) : run();
    putChain = p;
    return p;
  }
  function errText(e) { return String((e && e.message) || e || ""); }
  function putOnce() {
    var D = DJ();
    var full = pendingUnion();
    if (!full) return Promise.resolve({ ok: true, note: null });
    var merged = null;
    function fail(reason) {
      var keep = full;
      // อ่านร่าง "ตอนนี้" อีกรอบก่อนเขียนทับ — หน้า journal/แท็บอื่นอาจเขียนร่างเพิ่มระหว่างที่ GET/PUT ของหน้านี้ค้าง
      var cur = readDraft();
      if (cur) { try { keep = D.mergeDocs(cur.doc, keep); } catch (e) { /* อย่างน้อยเก็บของหน้านี้ไว้ */ } }
      state.syncNote = writeDraft(keep) ? SYNC_NOTE : NO_DRAFT_NOTE;
      state.syncReason = reason;
      safeRender();
      return { ok: false, note: state.syncNote };
    }
    // PUT สำเร็จ = ข้อมูลอยู่บนเซิร์ฟเวอร์แล้ว: ตั้งสถานะก่อนแล้วค่อยวาด
    function succeed() {
      state.doc = withLaunch(D.mergeDocs(state.doc || D.emptyDoc(), merged), merged.haLaunchedAt);
      state.unseen = D.mergeDocs(state.unseen || D.emptyDoc(), full);   // ถึงเซิร์ฟเวอร์แล้ว แต่ GET ที่ค้างอยู่อาจยังไม่เห็น
      if (covers(merged, state.pending)) state.pending = null;
      var d = readDraft();
      if (d && covers(merged, d.doc)) lsRemove(DRAFT_KEY);   // แท็บอื่นอาจเขียนร่างเพิ่มระหว่างส่ง → ลบเฉพาะเมื่อครอบครบ
      state.syncNote = null;
      state.syncReason = null;
      recompute();
      safeRender();
      return { ok: true, note: null };
    }
    function onGet(r) {
      if (!r.ok || !r.body || typeof r.body !== "object") return fail("อ่านสำเนาบนเซิร์ฟเวอร์ก่อนบันทึกไม่สำเร็จ · " + docFailReason(r));
      var data = r.body.data, fresh, bytes;
      if (data == null) fresh = D.emptyDoc();
      else if (isDocShape(data)) fresh = data;
      else return fail("ข้อมูลบนเซิร์ฟเวอร์ผิดรูป จึงไม่ส่งทับ");
      try {
        merged = D.mergeDocs(fresh, state.doc ? D.mergeDocs(state.doc, full) : full);
        // วันเริ่มใช้เขียนลงเอกสารครั้งแรกครั้งเดียว: เอกสารบนเซิร์ฟเวอร์มีอยู่แล้ว (เครื่องอื่นตั้งไว้) → คงของเดิม
        withLaunch(merged, D.isYmd(fresh.haLaunchedAt) ? fresh.haLaunchedAt : launchFor(state.doc));
        bytes = D.docBytes(merged);
      } catch (e) {
        merged = null;
        return fail("รวมกับสำเนาบนเซิร์ฟเวอร์ไม่สำเร็จ (" + errText(e) + ")");
      }
      if (bytes > D.MAX_DOC_BYTES) return fail("ขนาดบันทึกเกินที่เซิร์ฟเวอร์รับ");
      return sendJson(DOC_URL, "PUT", { data: merged }).then(function (w) {
        return w.ok ? succeed() : fail(docFailReason(w));
      }, function (e) { return fail("เกิดข้อผิดพลาดระหว่างส่ง (" + errText(e) + ")"); });
    }
    return getJson(DOC_URL).then(onGet, function (e) {
      return fail("อ่านสำเนาบนเซิร์ฟเวอร์ก่อนบันทึกไม่สำเร็จ (" + errText(e) + ")");
    });
  }

  // ---------------- บันทึกคำตอบ ----------------
  // รายการที่เปิดอยู่ในการ์ด (เห็นได้) ของ id นี้ → { event, entry, vis } | null
  function openItemOf(id) {
    var HA = HAE();
    for (var i = 0; i < state.items.length; i++) {
      var it = state.items[i];
      if (it && it.event && it.vis && it.vis.visible && HA.entryIdOf(it.event) === id) return it;
    }
    return null;
  }
  // entry ของกล่องที่ยังไม่ถูกลบ ของ id นี้ในเอกสาร (แถวประวัติ) | null
  function liveHaEntry(id) {
    var HA = HAE(), list = state.doc && Array.isArray(state.doc.entries) ? state.doc.entries : [];
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (e && e.id === id && !e.deletedAt && HA.isHomeAction(e)) return e;
    }
    return null;
  }
  // เหตุการณ์จาก entry ที่บันทึกไว้ (แถวประวัติที่พ้นหน้าต่างแล้ว ไม่มีเหตุการณ์ในรอบนี้) — รูปเดียวกับ detectEvents
  //   makeEntry สร้างกลับได้ครบ: rules.close = ราคาปิดแท่งสัญญาณ (ฐานวัดผลเดิม) · detail เดิม
  function eventOfEntry(e) {
    var ha = e.ha && typeof e.ha === "object" ? e.ha : {};
    var rs = e.rules && typeof e.rules === "object" ? e.rules : {};
    return {
      symbol: e.symbol, rule: ha.rule, side: ha.side, date: e.date, close: isNum(rs.close) ? rs.close : null,
      kind: ha.kind, detail: ha.detail && typeof ha.detail === "object" ? ha.detail : {}
    };
  }
  // เป้าหมายของปุ่ม/ฟอร์ม: รายการในการ์ดก่อน → ไม่งั้นแถวประวัติ (entry ที่บันทึกแล้ว) → { event, entry, vis } | null
  function targetOf(id) {
    var it = openItemOf(id);
    if (it) return it;
    var e = liveHaEntry(id);
    return e ? { event: eventOfEntry(e), entry: e, vis: null } : null;
  }
  // ฟอร์มกางที่ไหน: เปิดจากตารางประวัติ หรือรายการไม่อยู่ในการ์ดแล้ว (หมดหน้าต่าง) → ใต้แถวประวัติ · ไม่งั้นใต้บรรทัดในการ์ด
  function formWhere() {
    var f = state.form;
    if (!f) return null;
    return f.at === "hist" || !openItemOf(f.id) ? "hist" : "card";
  }
  // ราคาปิดล่าสุดของสัญลักษณ์ (det.latest.close) → ค่าเริ่มต้นของช่อง "ราคาที่ทำ" · ไม่มี → ราคาปิดแท่งสัญญาณ
  function latestClose(ev) {
    for (var i = 0; i < state.rows.length; i++) {
      var r = state.rows[i];
      if (r && r.sym === ev.symbol && r.det && r.det.latest && isNum(r.det.latest.close)) return r.det.latest.close;
    }
    return isNum(ev.close) ? ev.close : null;
  }
  // ฐานเงินของฝั่งขาย = มูลค่าที่ถืออยู่ตอนติ๊ก (marketValue ของ holding ที่สัญลักษณ์ตรงกัน · GOOGL นับเป็น GOOG เหมือน universe)
  //   หลายแถว (GOOG + GOOGL) รวมกัน · สกุลต่างกัน → ไม่มีฐาน (ไม่แปลงค่าเงิน) · ไม่ถือ / ฝั่งซื้อ → null
  //   หุ้นที่สแกนเพราะเพิ่งออกจากพอร์ต (state.recentOnly) = ไม่ถือแล้ว → null (มูลค่าที่ค้างอยู่ในรายการไม่ใช่ฐาน)
  function positionOf(ev) {
    var E = DJ(), none = { value: null, currency: null };
    if (!ev || ev.side !== "sell") return none;
    var want = E.canonicalSymbol(String(ev.symbol || "")), total = 0, any = false, cur = null, mixed = false, found = false;
    if (Object.prototype.hasOwnProperty.call(state.recentOnly, want)) return none;
    each(holdingsNow(), function (h) {
      if (!h || !h.isHolding) return;
      var raw = canonical(h.canonicalSymbol || h.ticker);
      if (E.canonicalSymbol(raw === "GOOGL" ? "GOOG" : raw) !== want) return;
      found = true;
      var c = typeof h.currency === "string" && h.currency ? h.currency : "THB";
      if (cur === null) cur = c; else if (c !== cur) mixed = true;
      var mv = Number(h.marketValue);
      if (isFinite(mv) && mv > 0) { total += mv; any = true; }
    });
    if (!found) return none;
    return { value: any && !mixed ? total : null, currency: mixed ? null : cur };
  }
  // เพิ่ม entry ลงเอกสารในหน้า → วาดทันที (บรรทัดเปลี่ยนเป็นติ๊กแล้ว) → ส่งขึ้นเซิร์ฟเวอร์
  function record(entries) {
    var D = DJ();
    var delta = { v: D.VERSION, updatedAt: isoNow(), entries: entries, trades: [] };
    state.doc = withLaunch(D.mergeDocs(state.doc || D.emptyDoc(), delta), launchFor(state.doc));
    recompute();
    safeRender();
    return putDoc(delta);
  }
  // แก้คำตอบของ entry ที่บันทึกแล้ว: ก๊อปของเดิมทั้งก้อน แล้วเขียนทับเฉพาะคำตอบ (ha.response / respondedAt / execPrice / amount
  //   · ฐานเงิน) + updatedAt — ที่เหลือคงเดิมทั้งหมด: id · createdAt · rules (ฐานวัดผล + version) · และสิ่งที่หน้า /decision-journal
  //   เขียนไว้ (action.tradeIds ที่ผูกไม้ — engine ใช้ตรวจขายแล้วซื้อคืน · label · context · review)
  //   mergeDocs แทนทั้ง entry ด้วยตัวที่ updatedAt ใหม่กว่า → สร้างใหม่ด้วย makeEntry = ลบของพวกนั้นเงียบ ๆ (trade.entryId ยังชี้มา)
  //   ฐานเงินฝั่งขาย: มีแล้ว = คงค่าตอนติ๊กครั้งแรก · ยังไม่มีแต่รายการยังอยู่ในการ์ด (ภายใน 3 วัน) = มูลค่าที่ถือตอนนี้
  //   · ยังไม่มีและพ้นหน้าต่างแล้ว (แก้จากประวัติ) = คง null — มูลค่าที่ถือวันนี้ไม่ใช่ฐานของวันสัญญาณ
  function reanswered(prev, t, response, execPrice, amount, stamp) {
    var entry;
    try { entry = JSON.parse(JSON.stringify(prev)); } catch (e) { return null; }
    if (!entry || typeof entry !== "object") return null;
    if (!entry.ha || typeof entry.ha !== "object") entry.ha = {};
    var ha = entry.ha;
    if (!isNum(ha.positionValue) && t.vis && t.vis.visible) {
      var pos = positionOf(t.event);
      ha.positionValue = pos.value;
      ha.positionCurrency = pos.currency;
    }
    ha.response = response;
    ha.respondedAt = stamp;
    ha.execPrice = isNum(execPrice) ? execPrice : null;
    ha.amount = isNum(amount) ? amount : null;
    entry.updatedAt = stamp;
    return DJ().itemProblems(entry).length ? null : entry;
  }
  // คำตอบของผู้ใช้ต่อรายการหนึ่ง · ยังไม่มี entry = สร้างด้วย makeEntry · แก้ (มี entry เดิม) = reanswered (id / createdAt /
  //   ของจากหน้า journal คงเดิม · updatedAt ใหม่กว่าของเดิมเสมอ)
  function answer(t, response, execPrice, amount) {
    var HA = HAE(), ev = t.event, prev = t.entry, entry;
    if (prev) {
      entry = reanswered(prev, t, response, execPrice, amount, stampAfter(prev.updatedAt));
    } else {
      var stamp = isoNow(), pos = positionOf(ev);
      entry = HA.makeEntry(ev, {
        response: response, nowIso: stamp, respondedAt: stamp, execPrice: execPrice,
        positionValue: pos.value, positionCurrency: pos.currency, amount: amount
      });
    }
    if (!entry) {
      state.actionError = "บันทึกไม่ได้ (ข้อมูลไม่ครบ)";
      safeRender();
      return Promise.resolve({ ok: false, note: state.actionError });
    }
    state.actionError = null;
    // ปิดเฉพาะฟอร์มของรายการนี้ — กด "ไม่ทำ" บรรทัดอื่นต้องไม่ทิ้งสิ่งที่พิมพ์ค้างในฟอร์มที่กางอยู่
    if (state.form && state.form.id === entry.id) state.form = null;
    return record([entry]);
  }
  // หลังโหลด: รายการที่หมดเวลาโดยไม่ได้ติ๊ก → "ไม่ได้ตอบ" ทุกตัว รวมครั้งเดียว ส่งครั้งเดียว (ไปกับร่างที่ค้างด้วย)
  //   ไม่มี → ส่งร่าง/ของค้าง (ถ้ามี) · โหลดเอกสารไม่ได้ = ไม่บันทึกอะไร · รีโหลดธรรมดาที่ไม่มีอะไรค้าง = ไม่ PUT
  //   ตราประทับ (createdAt / updatedAt) = เที่ยงคืน UTC ของวันสัญญาณ ไม่ใช่เวลาตอนบันทึก: ตอบได้หลังแท่งวันนั้นปิดเท่านั้น
  //   คำตอบจริงทุกคำตอบ (และ tombstone) จึงใหม่กว่าเสมอ แล้วชนะใน mergeDocs ทั้งหน้านี้และหน้า journal
  //   — คำตอบจากอีกเครื่องที่มาถึงทีหลัง (ร่างที่ส่งไม่ทัน / บันทึกระหว่าง GET ตอนโหลดกับ GET ก่อน PUT) ไม่ถูก "ไม่ได้ตอบ" ทับ
  //   เวลาจริงที่บันทึกเก็บไว้ใน ha.recordedAt (ข้อมูลประกอบ ไม่ใช้ตัดสินการ merge)
  function afterLoad() {
    if (state.docState !== "ok") return undefined;
    var HA = HAE(), recordedAt = isoNow(), out = [];
    each(state.toRecord, function (ev) {
      // ฝั่งขายเก็บมูลค่าที่ถืออยู่ตอนบันทึก (ผู้ใช้อยากเห็นผลของการไม่ทำเป็นบาท) · ไม่ถือ / ฝั่งซื้อ = null
      var pos = positionOf(ev);
      var e = HA.makeEntry(ev, {
        response: "unanswered", nowIso: ev.date + "T00:00:00.000Z", respondedAt: null, execPrice: null,
        positionValue: pos.value, positionCurrency: pos.currency, amount: null
      });
      if (e) { e.ha.recordedAt = recordedAt; out.push(e); }
    });
    if (out.length) return record(out);
    return pendingUnion() ? putDoc(null) : undefined;
  }

  // ---------------- เหตุการณ์ต่อสัญลักษณ์ ----------------
  // status: ok · stale (แท่งล่าสุดเก่ากว่าแท่งที่ควรปิดแล้วเกิน MAX_STALE_DAYS — detectEvents ไม่บอกเอง) ·
  //         no-bars (ไม่มีแท่งที่ปิดแล้ว / ไม่พบสัญลักษณ์) · error (ดึงราคาไม่สำเร็จ)
  function evalSymbol(u) {
    var E = DJ(), HA = HAE();
    var sym = E.canonicalSymbol(u.sym);
    var row = { sym: sym, source: u.source, status: "loading", bars: null, det: null, error: null, sourceType: null, staleDays: null };
    return fetchBars(sym).then(function (res) {
      row.sourceType = res.sourceType;
      if (!res.ok) { row.status = "error"; row.error = res.error || "ไม่ทราบสาเหตุ"; return row; }
      row.bars = res.bars;
      var now = nowBangkok();
      var det = HA.detectEvents(res.bars, { symbol: sym, nowBangkok: now });
      row.det = det;
      if (!det.ok || !det.asOfBar) { row.status = "no-bars"; return row; }
      var cutoff = E.closedBarCutoff(E.marketOf(sym), now);
      var gap = E.daysBetween(det.asOfBar, cutoff);
      row.staleDays = gap;
      row.status = isNum(gap) && gap > E.MAX_STALE_DAYS ? "stale" : "ok";
      return row;
    }, function (e) {
      row.status = "error"; row.error = String((e && e.message) || e || "ไม่ทราบสาเหตุ");
      return row;
    });
  }
  function healthy(row) { return row.status === "ok" || row.status === "stale"; }

  // ---------------- render ----------------
  function ruleParts(rule) {
    var HA = HAE();
    var label = String((HA.RULE_LABEL && HA.RULE_LABEL[rule]) || ("กฎ " + rule));
    var m = /^(กฎ \d+) (.+)$/.exec(label);
    return m ? { k: m[1], sub: m[2] } : { k: label, sub: "" };
  }
  function ruleKeyHtml(rule) {
    var p = ruleParts(rule);
    return '<span class="ha-k">' + esc(p.k) + (p.sub ? "<small>" + esc(p.sub) + "</small>" : "") + "</span>";
  }
  function actHtml(side) {
    return side === "buy" ? '<span class="ha-act is-buy">ซื้อ</span>' : '<span class="ha-act is-sell">ขาย</span>';
  }
  // สถานะสั้นจากแท่งล่าสุด (บรรทัดที่ยังไม่มีสัญญาณใหม่)
  function quietStatus(rule, latest) {
    var E = DJ(), L = latest || {};
    if (rule === 1) {
      var r1 = L.r1 || {};
      if (r1.state === "bull") return "EMA12 เหนือ EMA26";
      if (r1.state === "bear") return "EMA12 ใต้ EMA26";
      if (r1.state === "flat") return "EMA12 เท่ากับ EMA26";
      return "ข้อมูลไม่พอ";
    }
    if (rule === 2) {
      var r2 = L.r2 || {};
      var rel = r2.state === "above" ? "เหนือ" : (r2.state === "below" ? "ใต้" : (r2.state === "at" ? "ที่" : null));
      if (!rel) return "ข้อมูลไม่พอ";
      return "ปิด" + rel + " SMA200" + (isNum(r2.consecutive) ? " " + r2.consecutive + " วัน" : "");
    }
    var r3 = L.r3 || {};
    if (!isNum(r3.dd1yPct)) return "ข้อมูลไม่พอ";
    var depth = Math.abs(E.DIP_PCT);
    return fmtPct(r3.dd1yPct, 1) + " จาก high 1 ปี · " + (r3.dipMet === true ? "ถึง " + depth + "% แล้ว" : "ยังไม่ถึง " + depth + "%");
  }
  function eventText(ev, vis) {
    var HA = HAE(), d = ev.detail || {};
    var s = HA.kindThai(ev.kind) || "สัญญาณกฎ " + ev.rule;
    if ((ev.kind === "break" || ev.kind === "reclaim") && d.crossDate) s += " · ข้ามเส้น " + d.crossDate;
    if (ev.kind === "bounce" && d.touchDate) s += " · แตะเมื่อ " + d.touchDate;
    if (ev.kind === "dip" && isNum(d.high1y)) s += " · high 1 ปี " + fmtPx(d.high1y) + (d.high1yDate ? " (" + d.high1yDate + ")" : "");
    s += " · สัญญาณ " + ev.date;
    if (vis && isNum(vis.daysLeft)) s += " · " + (vis.daysLeft === 0 ? "วันสุดท้าย" : "เหลือ " + vis.daysLeft + " วัน");
    return s;
  }
  function answerText(entry) {
    var ha = (entry && entry.ha) || {};
    if (ha.response === "done") return "ทำแล้ว ✓" + (isNum(ha.execPrice) ? " ที่ " + fmtPx(ha.execPrice) : "");
    if (ha.response === "skipped") return "ไม่ทำ";
    if (ha.response === "unanswered") return "ไม่ได้ตอบ";
    return "บันทึกแล้ว";
  }
  // ปุ่มติ๊กปิดเมื่อยังไม่มีบันทึกจากเซิร์ฟเวอร์ (โหลดอยู่ / โหลดไม่ได้) — กันบันทึกทับเอกสารที่ยังไม่เห็น
  function dis() { return state.docState === "ok" ? "" : " disabled"; }
  // ช่อง "เงินที่ซื้อ" ซ่อนค่าไหม: Privacy Lock ล็อกอยู่ และค่าในช่องยังเป็นจำนวนที่บันทึกไว้ (ผู้ใช้ยังไม่ได้พิมพ์ใหม่)
  //   ฟอร์มใหม่ไม่มีอะไรให้ซ่อน · ค่าที่ผู้ใช้เพิ่งพิมพ์เองแสดงกลับตามปกติ
  function amountHidden(f) {
    return !!f && privacyLocked() && typeof f.amountSaved === "string" && f.amountSaved !== "" && f.amount === f.amountSaved;
  }
  // ฟอร์ม inline ใต้บรรทัดกฎ (กางเต็มความกว้างของบรรทัด) · ปุ่มทุกปุ่มเป็น type=button — Enter ในช่องกรอกยิง submit
  //   ซึ่ง render() ดักไว้ (preventDefault → บันทึก) ไม่ให้หน้าโหลดใหม่
  //   เปิดจาก "แก้" มีปุ่มสลับ ทำแล้ว ⇄ ไม่ทำ (บอกว่าจะบันทึกเป็นอะไร) · โหมดไม่ทำไม่มีช่องกรอก
  function formHtml(it, f) {
    var ev = it.event, id = esc(f.id), done = f.response === "done";
    var s = '<form class="ha-form" data-ha-form="' + id + '" novalidate>';
    if (f.mode === "edit") {
      s += '<div class="ha-form-row"><span>แก้คำตอบ · บันทึกใหม่เป็น <b>' + (done ? "ทำแล้ว" : "ไม่ทำ") + "</b></span>" +
        '<button type="button" class="ha-b" data-ha-toggle="' + id + '">' + (done ? "เปลี่ยนเป็น ไม่ทำ" : "เปลี่ยนเป็น ทำแล้ว") + "</button></div>";
    }
    if (done) {
      s += '<label class="ha-field"><span>ราคาที่ทำ</span><input class="ha-in" name="execPrice" type="number" step="any" min="0" inputmode="decimal" autocomplete="off" value="' + esc(f.execPrice) + '"></label>';
      if (ev.side === "buy") {
        // Privacy Lock: จำนวนที่บันทึกไว้ไม่ลง HTML (privacy.js ซ่อนได้แค่ข้อความ ไม่ใช่ value ของช่องกรอก)
        var hide = amountHidden(f);
        s += '<label class="ha-field is-wide"><span>เงินที่ซื้อ ฿</span><input class="ha-in" name="amount" type="number" step="any" min="0" inputmode="decimal" autocomplete="off" placeholder="' +
          (hide ? "ล็อกอยู่ — ใส่ใหม่ได้ถ้าต้องการ" : "เงินที่ซื้อ (บาท ใส่หรือไม่ก็ได้)") + '" value="' + (hide ? "" : esc(f.amount)) + '"></label>';
      }
    } else {
      s += '<span class="ha-form-note">บันทึกว่าไม่ได้ทำตามสัญญาณนี้ ไม่ต้องกรอกราคา</span>';
    }
    if (f.error) s += '<span class="ha-form-err" role="status">' + esc(f.error) + "</span>";
    return s + '<span class="ha-btns"><button type="button" class="ha-b is-done" data-ha-confirm="' + id + '"' + dis() + ">บันทึก</button>" +
      '<button type="button" class="ha-b" data-ha-cancel="' + id + '">ยกเลิก</button></span></form>';
  }
  function itemLineHtml(it) {
    var HA = HAE(), ev = it.event, id = HA.entryIdOf(ev);
    var f = state.form && state.form.id === id && formWhere() === "card" ? state.form : null;
    var what, btns;
    if (it.entry) {
      what = esc((HA.kindThai(ev.kind) || "สัญญาณกฎ " + ev.rule) + " · สัญญาณ " + ev.date) +
        ' · <b class="ha-ans">' + esc(answerText(it.entry)) + "</b>";
      btns = '<button type="button" class="ha-b" data-ha-edit="' + esc(id) + '"' + dis() + ">แก้</button>";
    } else {
      what = esc(eventText(ev, it.vis));
      btns = '<button type="button" class="ha-b is-done" data-ha-done="' + esc(id) + '"' + dis() + ">ทำแล้ว</button>" +
        '<button type="button" class="ha-b" data-ha-skip="' + esc(id) + '"' + dis() + ">ไม่ทำ</button>";
    }
    // ฟอร์มกางอยู่ → ซ่อนปุ่มของบรรทัด (กดยกเลิกแล้วกลับมา) · บรรทัดที่ติ๊กแล้วไม่จางระหว่างแก้
    return '<div class="ha-rule' + (it.entry ? " is-answered" : "") + (f ? " is-editing" : "") + '" data-ha-rule="' + esc(ev.rule) + '">' +
      ruleKeyHtml(ev.rule) + actHtml(ev.side) + '<span class="ha-what">' + what + "</span>" +
      '<span class="ha-btns">' + (f ? "" : btns) + "</span>" + (f ? formHtml(it, f) : "") + "</div>";
  }
  function quietLineHtml(rule, latest) {
    return '<div class="ha-rule is-quiet" data-ha-rule="' + rule + '">' + ruleKeyHtml(rule) +
      '<span class="ha-act is-none">—</span><span class="ha-what">' + esc("ไม่มีสัญญาณใหม่ · " + quietStatus(rule, latest)) + '</span><span class="ha-btns"></span></div>';
  }
  function byDateThenKind(a, b) {
    if (a.event.date !== b.event.date) return a.event.date < b.event.date ? -1 : 1;
    return String(a.event.kind) < String(b.event.kind) ? -1 : (String(a.event.kind) > String(b.event.kind) ? 1 : 0);
  }
  function cardHtml(row, items) {
    var E = DJ(), L = (row.det && row.det.latest) || {};
    var dueToday = 0;
    each(items, function (it) { if (!it.entry && it.vis && it.vis.daysLeft === 0) dueToday++; });
    var head = '<header class="ha-card-head"><a class="ha-sym" href="/decision-journal">' + esc(row.sym) + "</a>" +
      '<span class="ha-src">' + (row.source === "always" ? "ติดตามเสมอ" : (row.source === "recent" ? "เพิ่งออกจากพอร์ต" : "ในพอร์ต")) + "</span>" +
      '<span class="ha-px">ปิดล่าสุด <b>' + esc(fmtPx(L.close)) + "</b> · " + esc(row.det.asOfBar || "—") + "</span>" +
      (dueToday ? '<span class="ha-due">หมดเวลาวันนี้ ' + dueToday + " รายการ</span>" : "") +
      (row.status === "stale" ? '<span class="ha-warn">ราคาเก่ากว่า ' + E.MAX_STALE_DAYS + " วัน</span>" : "") +
      (row.sourceType === "SERVER_CACHED_DATA" ? '<span class="ha-warn">สำเนาบนเซิร์ฟเวอร์</span>' : "") + "</header>";
    var body = "";
    for (var rule = 1; rule <= 3; rule++) {
      var mine = [];
      each(items, function (it) { if (it.event.rule === rule) mine.push(it); });
      mine.sort(byDateThenKind);
      if (!mine.length) body += quietLineHtml(rule, L);
      else each(mine, function (it) { body += itemLineHtml(it); });
    }
    return '<article class="ha-card" data-ha-sym="' + esc(row.sym) + '">' + head + body + "</article>";
  }

  // ---------------- สรุปผล + ประวัติ (ใต้การ์ด · พับได้) ----------------
  // ตัวเลขทุกตัวมาจาก HomeActionEngine.summary (ค่าดิบ) — ที่นี่ปัดและใส่ป้ายไทยอย่างเดียว ไม่คิดผลเอง
  var RESP_THAI = { done: "ทำแล้ว", skipped: "ไม่ทำ", unanswered: "ไม่ได้ตอบ" };
  // เงินรายสกุลของช่องสรุป { THB: n, USD: m } → ข้อความทีละสกุล (THB ก่อน) · ไม่มี = []
  //   moneyN = จำนวนแถวที่มีฐานเงินรายสกุล (จาก summary) · scoredN = แถวที่วัดผลแล้วของกลุ่ม (ฐานของค่าเฉลี่ย %)
  //   เงินรวมมาจากแถวน้อยกว่าที่ค่าเฉลี่ยนับ → บอกต่อท้าย "(จาก k รายการที่มีฐานเงิน)" ไม่ให้อ่านว่าเป็นผลของทุกแถว
  function moneyLines(money, group, moneyN, scoredN) {
    var keys = [], out = [], k;
    for (k in money) if (Object.prototype.hasOwnProperty.call(money, k) && isNum(money[k])) keys.push(k);
    keys.sort(function (a, b) { return a === "THB" ? -1 : (b === "THB" ? 1 : (a < b ? -1 : (a > b ? 1 : 0))); });
    each(keys, function (c) {
      var cnt = moneyN && Object.prototype.hasOwnProperty.call(moneyN, c) ? moneyN[c] : null;
      var part = isNum(cnt) && isNum(scoredN) && cnt < scoredN ? " (จาก " + cnt + " รายการที่มีฐานเงิน)" : "";
      out.push(moneyText(money[c], c, group) + part);
    });
    return out;
  }
  // 4 ช่องสรุป · "ครั้ง" = ทุกรายการของกลุ่มในช่วงสรุป · ค่าเฉลี่ยและเงิน = เฉพาะที่ครบช่วงวัดผลที่เลือกแล้ว (ที่ยังรอไม่นับ)
  function tilesHtml(sum) {
    var c = sum.counts, h = sum.horizonDays;
    function tile(name, label, inner) {
      return '<div class="ha-kpi" data-ha-kpi="' + name + '"><span class="ha-kpi-k">' + esc(label) + "</span>" + inner + "</div>";
    }
    function times(n) { return '<b class="ha-kpi-n">' + n + " ครั้ง</b>"; }
    function line(text, dim) { return '<span class="ha-kpi-v' + (dim ? " is-dim" : "") + '">' + esc(text) + "</span>"; }
    function group(acc, total, avgLead, grp) {
      if (!acc.n) return times(total) + line(total ? "ยังไม่มีผล " + h + " วัน" : "—", true);
      var s = times(total) + line(avgLead + fmtPct(acc.avgPct, 1) + " เฉลี่ย", false);
      if (acc.n < total) s += line("มีผลแล้ว " + acc.n + " จาก " + total + " ครั้ง", true);
      var m = moneyLines(acc.money, grp, acc.moneyN, acc.n);
      return s + (m.length ? '<span class="ha-kpi-m">' + esc(m.join(" · ")) + "</span>" : line("ไม่มีฐานเงิน", true));
    }
    var rules = "";
    for (var r = 1; r <= 3; r++) {
      var br = sum.byRule[String(r)] || { n: 0, avgPct: null };
      rules += '<span class="ha-kpi-rule">กฎ ' + r + " <b>" + esc(br.n ? fmtPct(br.avgPct, 1) : "—") + "</b>" +
        (br.n ? " <small>" + br.n + " ครั้ง</small>" : "") + "</span>";
    }
    return '<div class="ha-kpis">' +
      tile("followed", "ทำตามกฎ", group(sum.followed, c.done, "", "followed")) +
      tile("missed", "ไม่ทำ (รวมไม่ได้ตอบ)", group(sum.missed, c.skipped + c.unanswered, "ถ้าทำจะได้ ", "missed")) +
      tile("unanswered", "ไม่ได้ตอบ", times(c.unanswered) + line("นับเป็นไม่ทำ", true)) +
      tile("byrule", "แยกตามกฎ · เฉลี่ยต่อสัญญาณ", rules) +
      "</div>";
  }
  // ช่อง % ของช่วง 7 / 30 วัน (ราคาขยับจากราคาปิดวันสัญญาณ) · ยังไม่ครบ → "รอ (n/h)" n = วันที่ผ่านไปแล้ว
  //   ไม่มี outcome: กำลังดึงราคาของสัญลักษณ์นี้อยู่ / ไม่มีราคา
  function pctCell(status, pct, horizon, date, today, loading) {
    if (status === "scored") return esc(fmtPct(pct, 1));
    if (status === "pending") {
      var d = DJ().daysBetween(date, today);
      return "รอ (" + (isNum(d) ? Math.max(0, Math.min(horizon, d)) : 0) + "/" + horizon + ")";
    }
    return loading ? "กำลังดึงราคา" : "ไม่มีราคา";
  }
  // ผลต่อพอร์ตของช่วงที่เลือก: % (กลับเครื่องหมายฝั่งขายแล้ว) + เงิน หรือ "ไม่มีฐานเงิน" · ยังไม่ครบ → "รอ"
  //   ช่วง 30 วันยังรอแต่ 7 วันมีผลแล้ว → บอกผล 7 วันไว้ใต้ "รอ" พร้อมป้าย (ไม่ปนกับค่า 30 วัน)
  function impactCell(row, entry, h, loading) {
    var HA = HAE();
    var st = h === 30 ? row.status30 : row.status7;
    var grp = row.response === "done" ? "followed" : (row.response === "skipped" || row.response === "unanswered" ? "missed" : null);
    if (st === "scored") {
      if (!isNum(row.impactPct)) return "—";
      var m = row.money || {};
      return "<b>" + esc(fmtPct(row.impactPct, 1)) + "</b> " +
        (isNum(m.amount) ? '<span class="ha-hist-m">' + esc(moneyText(m.amount, m.currency, grp)) + "</span>" : "<small>ไม่มีฐานเงิน</small>");
    }
    if (st === "pending") {
      var s = "รอ";
      if (h === 30 && row.status7 === "scored" && entry) {
        var m7 = HA.impactMoney(entry, row.pct7), ip7 = HA.impactPct(entry, row.pct7);
        var hint = m7 && isNum(m7.amount) ? moneyText(m7.amount, m7.currency, grp) : (isNum(ip7) ? fmtPct(ip7, 1) : null);
        if (hint) s += "<small>" + esc("7 วัน " + hint) + "</small>";
      }
      return s;
    }
    return loading ? "กำลังดึงราคา" : "ไม่มีราคา";
  }
  function histRowHtml(row, entry, h, today) {
    var HA = HAE(), id = String(row.id || "");
    var sym = DJ().canonicalSymbol(String(row.symbol || ""));
    var loading = !Object.prototype.hasOwnProperty.call(state.outcomesById, id) && !!state.histPending[sym];
    var kind = HA.kindThai(row.kind);
    var exec = row.response === "done" && isNum(row.execPrice) ? "<small>ที่ " + esc(fmtPx(row.execPrice)) + "</small>" : "";
    var s = '<tr data-ha-hrow="' + esc(id) + '">' +
      '<td class="is-date">' + esc(row.date) + "</td>" +
      '<td class="is-sym">' + esc(row.symbol || "—") + "</td>" +
      "<td>" + esc(isNum(row.rule) ? "กฎ " + row.rule : "—") + (kind ? "<small>" + esc(kind) + "</small>" : "") + "</td>" +
      "<td>" + (row.side === "buy" || row.side === "sell" ? actHtml(row.side) : "—") + "</td>" +
      '<td class="is-resp">' + esc(row.response ? RESP_THAI[row.response] : "—") + exec + "</td>" +
      '<td class="is-num">' + esc(fmtPx(row.refClose)) + "</td>" +
      '<td class="is-num">' + pctCell(row.status7, row.pct7, 7, row.date, today, loading) + "</td>" +
      '<td class="is-num">' + pctCell(row.status30, row.pct30, 30, row.date, today, loading) + "</td>" +
      '<td class="is-impact"><span class="ha-hist-imp">' + impactCell(row, entry, h, loading) + "</span>" +
      '<button type="button" class="ha-b" data-ha-edit="' + esc(id) + '" data-ha-at="hist"' + dis() + ">แก้</button></td></tr>";
    // ฟอร์มแก้ของแถวนี้ (ฟอร์มเดียวกับในการ์ด · handler เดียวกัน) กางเป็นแถวของตัวเองใต้แถว
    var f = state.form;
    if (f && f.id === id && formWhere() === "hist") {
      var t = targetOf(id);
      if (t) s += '<tr class="ha-hist-form"><td colspan="9">' + formHtml(t, f) + "</td></tr>";
    }
    return s;
  }
  // <details> พับเริ่มต้น (จำใน SUMMARY_KEY) · สัญญาณ SUMMARY_DAYS วันหลังสุด · ปุ่มช่วงวัดผล 7/30 (จำใน HORIZON_KEY)
  //   ยังไม่เคยโหลดเอกสารได้ = ไม่แสดง (ไม่รู้ประวัติ)
  function summaryHtml() {
    var HA = HAE();
    if (!state.doc) return "";
    var now = nowBangkok(), today = now.slice(0, 10);
    var entries = Array.isArray(state.doc.entries) ? state.doc.entries : [];
    var sum = HA.summary(entries, state.outcomesById, { nowBangkok: now, horizonDays: state.horizonDays });
    var h = sum.horizonDays, byId = {}, hz = "";
    each(entries, function (e) { if (e && typeof e.id === "string" && !e.deletedAt) byId[e.id] = e; });
    each(HA.HORIZONS, function (d) {
      hz += '<button type="button" class="ha-hz-b" data-ha-horizon="' + d + '" aria-pressed="' + (d === h ? "true" : "false") + '">' + d + " วัน</button>";
    });
    var s = '<details class="ha-summary"' + (state.summaryOpen ? " open" : "") + ' data-ha-summary="1">' +
      '<summary class="ha-sum-head"><span class="ha-sum-title">ทำตามกฎแล้วเป็นยังไง · สัญญาณ ' + HA.SUMMARY_DAYS + " วันหลังสุด</span>" +
      '<span class="ha-sum-count">' + sum.counts.total + " รายการ</span></summary>" +
      '<div class="ha-sum-body"><div class="ha-sum-bar"><span>วัดผลหลังวันสัญญาณ</span>' +
      '<span class="ha-hz" role="group" aria-label="ช่วงวัดผล">' + hz + "</span></div>" +
      tilesHtml(sum) +
      '<p class="ha-sum-note">ผลต่อพอร์ต = % ที่ราคาขยับจากราคาปิดวันสัญญาณ (ฝั่งขาย ราคาลง = ผลบวก) × มูลค่าที่ถือตอนติ๊ก (ขาย) หรือเงินที่ซื้อ (ซื้อ) · ' +
      "ยังไม่ครบช่วงแสดง “รอ” และไม่นับในค่าเฉลี่ย · ไม่ทำกับไม่ได้ตอบ = ตัวเลขถ้าทำตามกฎ</p>";
    if (!sum.rows.length) {
      s += '<div class="ha-empty">ยังไม่มีสัญญาณที่บันทึกไว้ใน ' + HA.SUMMARY_DAYS + " วันหลังสุด</div>";
    } else {
      s += '<div class="ha-histwrap"><table class="ha-hist"><thead><tr>' +
        '<th scope="col">วันที่</th><th scope="col">หุ้น</th><th scope="col">กฎ</th><th scope="col">action</th><th scope="col">ตอบ</th>' +
        '<th scope="col" class="is-num">ราคาสัญญาณ</th><th scope="col" class="is-num">7 วัน</th><th scope="col" class="is-num">30 วัน</th>' +
        '<th scope="col">ผลต่อพอร์ต (' + h + " วัน)</th></tr></thead><tbody>";
      each(sum.rows, function (row) { s += histRowHtml(row, byId[row.id] || null, h, today); });
      s += "</tbody></table></div>";
    }
    return s + "</div></details>";
  }

  function html() {
    var E = DJ(), HA = HAE();
    if (!E || !HA) return "";
    var days = HA.WINDOW_DAYS, depth = Math.abs(E.DIP_PCT);
    // รายการที่เห็นได้ จัดกลุ่มตามสัญลักษณ์
    var bySym = {};
    each(state.items, function (it) {
      if (!it || !it.event || !it.vis || !it.vis.visible) return;
      (bySym[it.event.symbol] = bySym[it.event.symbol] || []).push(it);
    });
    var cardRows = [], quiet = [], errs = [], pending = 0, answered = 0, healthyN = 0, freshN = 0;
    // โหลดครั้งแรกยังไม่จบ = ยังไม่เคย reconcile → ห้ามสรุปว่าตัวไหน "ไม่มีสัญญาณใหม่" (แสดงกำลังดึงราคาแทน)
    var firstLoad = state.loading && !state.loadedAt;
    each(firstLoad ? [] : state.rows, function (row, idx) {
      if (healthy(row)) {
        healthyN++;
        if (row.status === "ok") freshN++;
        var items = bySym[row.sym] || [];
        if (!items.length) {
          quiet.push(row.sym + (row.source === "recent" ? " (เพิ่งออกจากพอร์ต)" : "") +
            (row.status === "stale" ? " (ราคาเก่ากว่า " + E.MAX_STALE_DAYS + " วัน)" : ""));
          return;
        }
        var urgent = Infinity;
        each(items, function (it) {
          if (it.entry) { answered++; return; }
          pending++;
          if (isNum(it.vis.daysLeft) && it.vis.daysLeft < urgent) urgent = it.vis.daysLeft;
        });
        cardRows.push({ row: row, items: items, urgent: urgent, idx: idx });
      } else if (row.status === "error") {
        errs.push(row.sym + " · ดึงราคาไม่สำเร็จ · " + row.error);
      } else if (row.status === "no-bars") {
        errs.push(row.sym + " · " + (row.sourceType === "NOT_FOUND" ? "ไม่พบสัญลักษณ์นี้ที่แหล่งข้อมูล" : "ไม่มีราคาย้อนหลัง"));
      }
    });
    // ลำดับการ์ด: ตัวที่ยังไม่ติ๊กและใกล้หมดเวลาก่อน · เท่ากันตามลำดับ universe
    cardRows.sort(function (a, b) { return a.urgent !== b.urgent ? (a.urgent < b.urgent ? -1 : 1) : a.idx - b.idx; });

    var body = "";
    if (state.docState === "error") {
      body += '<div class="ha-docerr" role="alert"><span>' + esc("ยังโหลดบันทึกจากเซิร์ฟเวอร์ไม่ได้ จึงยังติ๊กไม่ได้ — " + (state.docError || "ไม่ทราบสาเหตุ")) +
        '</span><button type="button" class="mc-btn ha-btn" data-ha-docretry="1"' + (state.loading ? " disabled" : "") + ">ลองใหม่</button></div>";
    }
    if (state.syncNote) body += '<p class="ha-sync" role="status">' + esc(state.syncNote + (state.syncReason ? " · " + state.syncReason : "")) + "</p>";
    if (state.actionError) body += '<p class="ha-sync is-err" role="status">' + esc(state.actionError) + "</p>";
    if (firstLoad) {
      body += '<div class="ha-empty">กำลังดึงราคา…</div>';
    } else if (!state.rows.length) {
      body += '<div class="ha-empty">' + esc(state.loading ? "กำลังดึงราคา…" : (state.universeNote || "ยังไม่มีสัญลักษณ์ให้ตรวจ")) + "</div>";
    } else if (cardRows.length) {
      body += '<div class="ha-cards">';
      each(cardRows, function (c) { body += cardHtml(c.row, c.items); });
      body += "</div>";
    } else if (state.loading && !healthyN) {
      body += '<div class="ha-empty">กำลังดึงราคา…</div>';
    } else if (freshN) {
      body += '<div class="ha-empty">วันนี้ไม่มีสัญญาณใหม่ตามกฎ 1-2-3 ใน ' + days + " วันหลังสุด</div>";
    } else if (healthyN) {
      // ราคาทุกตัวค้าง — "ไม่มีสัญญาณ" อาจแค่เพราะแท่งใหม่ยังไม่เข้ามา จึงไม่ยืนยันว่าเงียบ
      body += '<div class="ha-empty">ราคาทุกตัวเก่ากว่า ' + E.MAX_STALE_DAYS + " วัน — ยังบอกไม่ได้ว่ากฎพูดอะไรใน " + days + " วันหลังสุด</div>";
    }
    if (quiet.length) body += '<p class="ha-quiet">' + esc("ไม่มีสัญญาณใหม่ใน " + days + " วัน: " + quiet.join(" · ")) + "</p>";
    each(errs, function (msg) { body += '<div class="ha-err">' + esc(msg) + "</div>"; });
    if (state.rows.length && state.universeNote) body += '<p class="ha-note">' + esc(state.universeNote) + "</p>";
    body += summaryHtml();

    var count = pending || answered
      ? '<span class="ha-count">รอติ๊ก <b>' + pending + "</b> รายการ" + (answered ? " · ติ๊กแล้ว " + answered : "") + "</span>"
      : "";
    var when = state.loading ? "กำลังดึงราคา…" : (state.loadedAt ? "คิดเมื่อ " + state.loadedAt.replace("T", " ") + " น. (เวลากรุงเทพ)" : "");
    return '<section class="ha-box mc-fade" aria-labelledby="haTitle">' +
      '<div class="ha-head"><div class="ha-head-main"><h2 id="haTitle" class="ha-title">ต้องทำอะไรวันนี้</h2>' + count + "</div>" +
      '<div class="ha-tools"><span class="ha-when" role="status">' + esc(when) + "</span>" +
      '<button type="button" class="mc-btn ha-btn" data-ha-refresh="1"' + (state.loading ? " disabled" : "") + ">ดึงราคาใหม่</button></div></div>" +
      '<p class="ha-sub">ตามกฎที่คุณตั้งไว้ (EMA12/26 · SMA200 · ย่อ ≥' + depth + "%) ไม่ใช่คำแนะนำการลงทุน · แสดงเฉพาะสัญญาณใน " + days + " วันหลังสุด</p>" +
      body +
      '<p class="ha-foot">กฎชุดเดียวกับ Decision Journal (' + esc(E.RULES_VERSION) + ") · ราคาปิดของแท่งที่ปิดตลาดแล้ว · " +
      'ดูบันทึกย้อนหลังที่ <a href="/decision-journal">Decision Journal</a></p></section>';
  }
  // การ์ดอยู่บนสุดใน <main id="mcRoot"> — mission-control-page.js เขียน innerHTML ของ mcRoot ทับทุกครั้งที่วาด
  //   จึงต้องเช็กทุกครั้งว่ากล่องยังอยู่ ไม่อยู่ก็สร้างใหม่แล้วแทรกเป็นลูกคนแรก
  function mount() {
    var root = document.getElementById("mcRoot");
    if (!root) return null;
    var el = document.getElementById(MOUNT_ID);
    if (el && el.parentNode === root) return el;
    el = document.createElement("div");
    el.id = MOUNT_ID;
    if (root.firstChild) root.insertBefore(el, root.firstChild); else root.appendChild(el);
    return el;
  }
  // ผูก event (ค่าเริ่มต้น click) ทุก element ที่มี attribute นั้น · fn(ค่า attribute, event, element)
  function bind(el, attr, fn, evName) {
    if (!el || typeof el.querySelectorAll !== "function") return;
    var list = el.querySelectorAll("[" + attr + "]");
    for (var i = 0; i < (list ? list.length : 0); i++) {
      (function (b) {
        b.addEventListener(evName || "click", function (ev) { fn(b.getAttribute(attr), ev, b); });
      })(list[i]);
    }
  }

  // ช่องกรอกของฟอร์มที่กางอยู่: เก็บ element ไว้ตอน render (root.querySelectorAll("[name]") — กางได้ทีละฟอร์ม name จึงไม่ซ้ำ)
  //   อ่าน .value ตอนกดบันทึก/สลับ และก่อนวาดใหม่ทุกครั้ง (วาดใหม่จาก PUT/โหลดเสร็จ ต้องไม่ลบสิ่งที่ผู้ใช้พิมพ์ค้างไว้)
  var formRefs = { id: null, inputs: {}, amountHidden: false };
  function captureForm() {
    var f = state.form, ins = formRefs.inputs;
    if (!f || formRefs.id !== f.id) return;
    if (ins.execPrice && ins.execPrice.value != null) f.execPrice = String(ins.execPrice.value);
    if (ins.amount && ins.amount.value != null) {
      var v = String(ins.amount.value);
      // ช่องที่วาดว่างเพราะ Privacy Lock แล้วยังว่าง = ผู้ใช้ไม่ได้แตะ → คงจำนวนที่บันทึกไว้ (ปลดล็อกแล้ววาดใหม่ก็เห็นค่าเดิม)
      if (!(v === "" && formRefs.amountHidden)) f.amount = v;
    }
  }
  function collectInputs(el) {
    formRefs = { id: state.form ? state.form.id : null, inputs: {}, amountHidden: amountHidden(state.form) };
    if (!state.form || !el || typeof el.querySelectorAll !== "function") return;
    var list = el.querySelectorAll("[name]");
    for (var i = 0; i < (list ? list.length : 0); i++) {
      var n = list[i] && typeof list[i].getAttribute === "function" ? list[i].getAttribute("name") : null;
      if (n === "execPrice" || n === "amount") formRefs.inputs[n] = list[i];
    }
  }
  // ช่องที่ผู้ใช้กำลังพิมพ์อยู่ (ชื่อ) — วาดใหม่แล้วโฟกัสกลับที่เดิม
  function focusedInput() {
    var a = null;
    try { a = document.activeElement; } catch (e) { a = null; }
    if (!a) return null;
    for (var k in formRefs.inputs) {
      if (Object.prototype.hasOwnProperty.call(formRefs.inputs, k) && formRefs.inputs[k] === a) return k;
    }
    return null;
  }
  function focusInput(name) {
    var x = name ? formRefs.inputs[name] : null;
    if (x && typeof x.focus === "function") { try { x.focus(); } catch (e) { /* ไม่เป็นไร */ } }
  }

  // ---------------- ปุ่มติ๊ก ----------------
  function canTick() { return state.docState === "ok"; }
  function onDone(id) {
    if (!canTick()) return;
    var t = targetOf(id);
    if (!t || t.entry) return;
    state.form = { id: id, mode: "new", response: "done", execPrice: inputNum(latestClose(t.event)), amount: "", amountSaved: "", error: null, focus: true, at: "card" };
    state.actionError = null;
    safeRender();
  }
  // แก้: ฟอร์มเดิมพร้อมค่าที่บันทึกไว้ · เริ่มที่ "ทำแล้ว" (คำตอบเดิมเป็นไม่ทำ = ผู้ใช้กดแก้เพื่อเปลี่ยนเป็นทำแล้ว) · ปุ่มสลับเปลี่ยนเป็นไม่ทำได้
  //   ปุ่มในตารางประวัติ (data-ha-at="hist") → ฟอร์มกางใต้แถวนั้น · ปุ่มในการ์ด → ใต้บรรทัดในการ์ด
  function onEdit(id, ev, node) {
    if (!canTick()) return;
    var t = targetOf(id);
    if (!t || !t.entry) return;
    var ha = t.entry.ha && typeof t.entry.ha === "object" ? t.entry.ha : {};
    var amt = isNum(ha.amount) ? String(ha.amount) : "";
    var fromHist = !!node && typeof node.getAttribute === "function" && node.getAttribute("data-ha-at") === "hist";
    state.form = {
      id: id, mode: "edit", response: "done",
      execPrice: isNum(ha.execPrice) ? String(ha.execPrice) : inputNum(latestClose(t.event)),
      amount: amt, amountSaved: amt, error: null, focus: true, at: fromHist ? "hist" : "card"
    };
    state.actionError = null;
    safeRender();
  }
  function onSkip(id) {
    if (!canTick()) return;
    var t = targetOf(id);
    if (t) answer(t, "skipped", null, null);
  }
  function onCancel(id) {
    if (!state.form || state.form.id !== id) return;
    state.form = null;
    safeRender();
  }
  function onToggle(id) {
    var f = state.form;
    if (!f || f.id !== id) return;
    captureForm();
    f.response = f.response === "done" ? "skipped" : "done";
    f.error = null;
    f.focus = f.response === "done";
    safeRender();
  }
  // บันทึกจากฟอร์ม: ราคาที่ทำต้องเป็นตัวเลข > 0 · เงินที่ซื้อ ว่าง = ไม่ระบุ ไม่งั้นต้อง > 0 · ไม่ผ่าน = บอกในฟอร์ม ไม่ส่ง
  function onConfirm(id) {
    var f = state.form;
    if (!f || f.id !== id || !canTick()) return;
    var t = targetOf(id);
    if (!t) { state.form = null; safeRender(); return; }
    captureForm();
    if (f.response !== "done") { answer(t, "skipped", null, null); return; }
    var px = numIn(f.execPrice), amt = null;
    if (!isNum(px) || px <= 0) { f.error = "ราคาต้องมากกว่า 0"; f.focus = true; safeRender(); return; }
    if (t.event.side === "buy") {
      amt = numIn(f.amount);
      if (amt !== null && (!isNum(amt) || amt <= 0)) { f.error = "เงินที่ซื้อต้องมากกว่า 0 หรือเว้นว่าง"; safeRender(); return; }
      // Privacy Lock: ผู้ใช้มองไม่เห็นจำนวนที่บันทึกไว้ ช่องว่างจึงไม่ใช่การ "ล้าง" → คงค่าเดิมของ entry (ไม่เขียนทับเป็น null)
      //   อยากล้างจริงต้องปลดล็อกก่อน
      var prevHa = t.entry && t.entry.ha && typeof t.entry.ha === "object" ? t.entry.ha : null;
      if (amt === null && privacyLocked() && prevHa && isNum(prevHa.amount)) amt = prevHa.amount;
    }
    answer(t, "done", px, amt);
  }

  // ช่วงวัดผลของสรุป: วาดใหม่จากข้อมูลที่มีอยู่ ไม่ดึงราคาใหม่ · จำไว้ในเครื่อง
  function onHorizon(v) {
    var h = v === "30" ? 30 : 7;
    if (h === state.horizonDays) return;
    state.horizonDays = h;
    lsSet(HORIZON_KEY, String(h));
    safeRender();
  }
  // <details> เปิด/ปิดเอง (เบราว์เซอร์) — แค่จำไว้ให้การวาดใหม่คงสภาพเดิม
  //   ห้ามวาดใหม่ตรงนี้: เบราว์เซอร์ยิง toggle ตอนใส่ <details open> ด้วย → วาดใหม่ = วนไม่จบ
  function onSummaryToggle(v, ev, node) {
    var open = !!(node && node.open);
    state.summaryOpen = open;
    lsSet(SUMMARY_KEY, open ? "1" : "0");
  }

  function render() {
    var el = mount();
    if (!el) return;
    captureForm();
    var typing = focusedInput();
    el.innerHTML = html();
    bind(el, "data-ha-refresh", function () { refresh(true); });
    bind(el, "data-ha-horizon", onHorizon);
    bind(el, "data-ha-summary", onSummaryToggle, "toggle");
    bind(el, "data-ha-docretry", function () { refresh(false); });
    bind(el, "data-ha-done", onDone);
    bind(el, "data-ha-skip", onSkip);
    bind(el, "data-ha-edit", onEdit);
    bind(el, "data-ha-confirm", onConfirm);
    bind(el, "data-ha-cancel", onCancel);
    bind(el, "data-ha-toggle", onToggle);
    bind(el, "data-ha-form", function (id, ev) {
      if (ev && typeof ev.preventDefault === "function") ev.preventDefault();
      onConfirm(id);
    }, "submit");
    collectInputs(el);
    if (state.form && state.form.focus) { state.form.focus = false; focusInput("execPrice"); }
    else if (typing) focusInput(typing);
  }
  // วาดใหม่หลังงาน async — ข้อมูลถึงเซิร์ฟเวอร์/ร่างถูกเก็บแล้ว การวาดพังต้องไม่ทำให้สถานะที่บอกผู้ใช้กลับด้าน
  function safeRender() {
    try { render(); } catch (e) {
      try { if (window.console && console.error) console.error("home-action: วาดกล่องไม่สำเร็จ", e); } catch (e2) { /* ไม่มี console */ }
    }
  }

  // ---------------- load ----------------
  // เอกสารกับราคาโหลดขนานกัน · reconcile หลังได้ครบทั้งคู่ · refresh ซ้อน: รอบเก่าที่จบทีหลังถูกทิ้ง (runSeq)
  //   ระหว่างโหลด กล่องยังแสดงผลรอบก่อน (ไม่กระพริบ) แต่ปุ่มติ๊กปิดจนกว่าเอกสารรอบนี้จะมา
  var runSeq = 0;
  function refresh(force) {
    var E = DJ(), HA = HAE();
    if (!E || !HA) return Promise.resolve();
    if (force) cacheClear();   // ล้างทุก record ของกล่อง · การอ่าน cache ที่ตามมา (รอบนี้ + รอบที่ซ้อน) รอให้ล้างเสร็จก่อน
    var seq = ++runSeq;
    var uni = buildUniverse();
    var next = uni.map(function (u) {
      return { sym: E.canonicalSymbol(u.sym), source: u.source, status: "loading", bars: null, det: null, error: null, sourceType: null, staleDays: null };
    });
    // ตัวแทนระหว่างโหลดครั้งแรกเป็นอาร์เรย์ของตัวเอง — worker เขียนลง next เท่านั้น
    //   (ถ้าแชร์อาร์เรย์เดียวกัน วาดกลางทางจะเห็นแถวที่ได้ราคาแล้วแต่ยังไม่ reconcile → "ไม่มีสัญญาณใหม่" ผิด ๆ)
    //   rows กับ items เปลี่ยนพร้อมกันใน apply() เท่านั้น
    if (!state.rows.length) state.rows = next.slice();
    state.loading = true;
    state.docState = "loading";
    render();
    var docRes = null;
    // อ่านเอกสารหลัง PUT ที่ค้างในคิวของหน้านี้จบก่อน — ไม่งั้น GET อาจได้สำเนาก่อน PUT ถึง แล้วคำตอบที่เพิ่งบันทึก
    //   ดูเหมือนยังไม่ได้ตอบ (และถ้าหมดเวลาแล้วจะถูกบันทึกทับเป็น "ไม่ได้ตอบ" ด้วยตราประทับที่ใหม่กว่า)
    var docP = (putChain ? putChain.then(loadDoc, loadDoc) : loadDoc()).then(function (r) { docRes = r; });
    var barsP = pool(uni, CONCURRENCY, function (u, i) {
      return evalSymbol(u).then(function (row) { next[i] = row; });
    });
    return Promise.all([docP, barsP]).then(function () {
      if (seq !== runSeq) return undefined;
      apply(next, docRes || { ok: false, error: "ไม่ทราบสาเหตุ" });
      state.loading = false;
      state.loadedAt = nowBangkok();
      render();
      // การ์ดใช้ได้แล้ว · ราคาของสัญลักษณ์ในประวัติ (นอก universe) ดึงต่อหลังรู้เนื้อหาเอกสาร แล้ววาดสรุปใหม่
      var saved = afterLoad();
      return Promise.all([saved, loadHistoryBars(seq)]).then(function (r) {
        cachePrune();   // จบรอบแล้ว (ไม่มีงานเขียนราคาค้างจากรอบนี้) → ตัด cache ให้เหลือ MAX_CACHE_SYMBOLS · ไม่ต้องรอ
        return r[0];
      });
    });
  }
  // ---------------- สรุปผล: ราคาของสัญลักษณ์ในประวัติ + outcomes ----------------
  // entry ของกล่องในช่วงสรุป (SUMMARY_DAYS วันหลังสุด · ไม่ถูกลบ) — ชุดเดียวกับที่ HomeActionEngine.summary นับ
  function historyEntries() {
    var D = DJ(), HA = HAE(), out = [];
    var since = D.ymdAdd(nowBangkok().slice(0, 10), -HA.SUMMARY_DAYS);
    each(state.doc && state.doc.entries, function (e) {
      if (HA.isHomeAction(e) && !e.deletedAt && D.isYmd(e.date) && (since === null || e.date >= since)) out.push(e);
    });
    return out;
  }
  // แท่งราคาของสัญลักษณ์: แถว universe ของรอบล่าสุดก่อน → ไม่งั้นที่ดึงเพิ่มให้ประวัติ · ไม่มี/ว่าง = null
  function barsFor(sym) {
    for (var i = 0; i < state.rows.length; i++) {
      var r = state.rows[i];
      if (r && r.sym === sym && Array.isArray(r.bars) && r.bars.length) return r.bars;
    }
    var h = state.histBars[sym];
    return Array.isArray(h) && h.length ? h : null;
  }
  // outcomes ของทุก entry ในช่วงสรุปที่มีราคา (DecisionJournal.outcomes นับเฉพาะแท่งที่ปิดแล้วเอง) · ไม่มีราคา = ไม่มีคีย์
  function computeOutcomes() {
    var D = DJ(), now = nowBangkok(), out = {};
    each(historyEntries(), function (e) {
      if (typeof e.id !== "string" || !e.id) return;
      var bars = barsFor(D.canonicalSymbol(String(e.symbol || "")));
      if (!bars) return;
      try { out[e.id] = D.outcomes(e, bars, now); } catch (x) { /* entry เสีย = ไม่มีผล */ }
    });
    state.outcomesById = out;
  }
  // สัญลักษณ์ของ entry ในช่วงสรุปที่ไม่อยู่ใน universe (ขายออก / ปลดธง) → fetchBars เดิม (cache ในเครื่อง + inflight เดียวกัน
  //   — สัญลักษณ์ละครั้ง ไม่ยิงซ้ำ) แล้วคิด outcomes ใหม่ · ดึงไม่ได้ / ไม่มีแท่ง = ไม่มีราคา (ไม่ลองซ้ำในรอบเดียวกัน)
  //   สัญลักษณ์ใน universe ที่ดึงไม่สำเร็จรอบนี้ก็ไม่ดึงซ้ำ · refresh รอบใหม่เริ่มระหว่างทาง → ทิ้งผลรอบนี้
  function loadHistoryBars(seq) {
    var D = DJ(), seen = {}, want = [];
    each(state.rows, function (r) { if (r && r.sym) seen[r.sym] = 1; });
    each(historyEntries(), function (e) {
      var s = D.canonicalSymbol(String(e.symbol || ""));
      if (!s || seen[s]) return;
      seen[s] = 1;
      want.push(s);
    });
    if (!want.length) { state.histBars = {}; state.histPending = {}; return Promise.resolve(); }
    var got = {}, pend = {};
    each(want, function (s) { pend[s] = 1; });
    state.histPending = pend;
    return pool(want, CONCURRENCY, function (s) {
      return fetchBars(s).then(function (res) {
        if (res && res.ok && Array.isArray(res.bars) && res.bars.length) got[s] = res.bars;
      }, function () { /* ไม่มีราคา */ });
    }).then(function () {
      if (seq !== runSeq) return;
      state.histBars = got;
      state.histPending = {};
      computeOutcomes();
      safeRender();
    });
  }
  function apply(rows, docRes) {
    var D = DJ();
    state.rows = rows;
    if (docRes.ok) {
      // คำตอบที่สำเนานี้ยังไม่เห็นรวมกลับเข้าไป — ไม่งั้นบรรทัดที่เพิ่งติ๊กเด้งกลับเป็นยังไม่ติ๊ก และรายการที่หมดเวลาแล้ว
      //   ถูกบันทึกเป็น "ไม่ได้ตอบ" ทับคำตอบจริง (ตราประทับใหม่กว่าชนะ):
      //   · unseen = PUT สำเร็จแล้วแต่ GET นี้ยังไม่สะท้อน → รวมจนกว่าสำเนาจะครอบครบ (ครบแล้วล้าง — tombstone ที่ใหม่กว่าก็นับว่าครอบ)
      //   · ร่าง + ของที่กำลังส่ง (pendingUnion)
      //   ไม่มีอะไรค้าง = ใช้สำเนาเซิร์ฟเวอร์ตรง ๆ (ไม่รวมเอกสารเก่าของหน้าทั้งก้อน — สิ่งที่ถูกลบ/แก้ที่หน้าอื่นต้องเห็นตามเซิร์ฟเวอร์)
      var doc = docRes.doc, pend = pendingUnion();
      if (state.unseen) {
        if (covers(doc, state.unseen)) state.unseen = null;
        else doc = withLaunch(D.mergeDocs(doc, state.unseen), doc.haLaunchedAt);
      }
      if (pend) doc = withLaunch(D.mergeDocs(doc, pend), doc.haLaunchedAt);
      state.doc = doc;
      state.docState = "ok";
      state.docError = null;
    } else {
      // คงเอกสารรอบก่อน (ถ้าเคยโหลดได้) ไว้แสดงว่าอะไรติ๊กแล้ว แต่ห้ามติ๊ก/บันทึกจนกว่าจะโหลดได้อีกครั้ง
      state.docState = "error";
      state.docError = docRes.error;
    }
    state.launchedAt = resolveLaunch(docRes.ok ? state.doc : null, docRes.ok);
    var events = [];
    each(rows, function (r) {
      if (!healthy(r) || !r.det) return;
      each(r.det.events, function (ev) { events.push(ev); });
    });
    state.events = events;
    recompute();
  }
  // เทียบเหตุการณ์ของรอบล่าสุดกับเอกสารในหน้า (หลังโหลด และหลังบันทึกทุกครั้ง — ไม่ดึงราคาใหม่)
  //   ฟอร์มของรายการที่ไม่อยู่แล้ว (หมดเวลา / ถูกลบที่ journal) ปิดไปด้วย
  function recompute() {
    var HA = HAE();
    var entries = state.doc && Array.isArray(state.doc.entries) ? state.doc.entries : [];
    var rec = HA.reconcile(state.events, entries, { nowBangkok: nowBangkok(), launchedAt: scopeStart(state.launchedAt) });
    state.items = rec.open;
    state.toRecord = state.docState === "ok" ? rec.expired : [];
    if (state.form && !targetOf(state.form.id)) state.form = null;
    computeOutcomes();   // entry ที่เพิ่งบันทึก/แก้ได้ผลวัดทันที (ใช้แท่งที่มีอยู่ ไม่ดึงใหม่)
  }

  // mission-control-page.js วาด mcRoot ใหม่ (render ของมัน) → การ์ดหาย → ใส่กลับจาก state ที่มีอยู่ ไม่ดึงราคาใหม่
  function watchRoot() {
    var root = document.getElementById("mcRoot");
    if (!root || typeof MutationObserver !== "function") return;
    try {
      new MutationObserver(function () {
        if (!document.getElementById(MOUNT_ID)) render();
      }).observe(root, { childList: true });
    } catch (e) { /* ไม่มี observer ก็ยังวาดครั้งแรกได้ */ }
  }
  function boot() {
    render();
    watchRoot();
    refresh(false);
    // พอร์ตเปลี่ยน (ปักธงแดง/Load Latest Data) → universe เปลี่ยน
    try { window.addEventListener("portfolio-holdings-updated", function () { refresh(false); }); } catch (e) { /* ไม่เป็นไร */ }
    try { window.addEventListener("portfolio-data-snapshot", function () { refresh(false); }); } catch (e) { /* ไม่เป็นไร */ }
    // ล็อก/ปลดล็อก Privacy Lock → วาดใหม่ (ช่องเงินในฟอร์มที่กางอยู่ซ่อน/แสดงตาม)
    try { document.addEventListener("portfolio-privacy-changed", function () { safeRender(); }); } catch (e) { /* ไม่เป็นไร */ }
  }

  window.HomeAction = {
    refresh: refresh,
    render: render,
    _state: state,
    _buildUniverse: buildUniverse,
    _html: html
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
