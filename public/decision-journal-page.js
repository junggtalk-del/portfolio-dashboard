(function () {
  "use strict";
  // ============================================================
  // DECISION JOURNAL — ชั้นแสดงผล (render ลง #djRoot)
  //
  // หน้านี้ไม่คิดกฎเอง: ทุกอย่างที่เป็นการคำนวณมาจาก window.DecisionJournal (เอนจิน pure)
  // ตัวเลขทุกตัวในคำอธิบาย (แถบแตะ · แถบทรงตัว · ย่อ · จำนวนวันยืนยัน · ช่วงเวลา) อ่านจากค่าคงที่ของเอนจิน
  // ห้ามพิมพ์ตัวเลขซ้ำในไฟล์นี้ — เปลี่ยนกติกาที่เอนจินแล้วหน้าต้องเปลี่ยนตามเอง
  //
  // สถานะที่หน้าต้องบอกตรง ๆ เสมอ: กำลังโหลด · ตรงกับเซิร์ฟเวอร์ · บันทึกบนเซิร์ฟเวอร์แล้ว
  //   · ร่างในเครื่อง (ยังไม่ถึงเซิร์ฟเวอร์) · ล้มเหลว — ห้ามขึ้น "บันทึกแล้ว" ถ้ายังไม่ถึงเซิร์ฟเวอร์
  //
  // บันทึก (สเปก §6): GET สด → mergeDocs(server, local) ตาม id → PUT ทั้ง doc
  //   ล้มเหลวทุกแบบ (400/413/500/เน็ตหลุด/GET สดไม่ได้) → เก็บร่างใน localStorage แล้วลองส่งใหม่ตอนเปิดหน้า
  //
  // ES5 เท่านั้น · wire ผ่าน root.querySelectorAll('[data-dj-*]') · อ่านค่าฟอร์มด้วย document.getElementById
  // ไม่ใช่คำแนะนำการลงทุน
  // ============================================================

  var ROOT_ID = "djRoot";
  var DOC_URL = "/api/portfolio?doc=journal";
  var HOLDINGS_URL = "/api/portfolio-holdings";
  var PRIVACY_EVENT = "portfolio-privacy-changed";
  var DRAFT_KEY = "decision_journal_draft_v1";
  var OHLC_KEY = "decision_journal_ohlc_v1";
  var OHLC_CACHE_MAX = 12;      // จำนวนสัญลักษณ์สูงสุดใน cache ราคาของเครื่อง (กันชนโควตา localStorage)
  var HISTORY_DAYS = 730;       // ดึงราคาย้อนหลัง 2 ปี ≈ 500 แท่ง ให้มี SMA200 ก่อนแท่ง as-of (สเปก §5.2)
  var DOC_WARN_RATIO = 0.8;     // เตือนเมื่อขนาดเอกสาร ≥ สัดส่วนนี้ของ MAX_DOC_BYTES (แผน Task 7b → Task 13)

  var SAVED_NOTE = "บันทึกบนเซิร์ฟเวอร์แล้ว";
  var DRAFT_NOTE = "ยังไม่ถึงเซิร์ฟเวอร์ — เก็บร่างไว้ในเครื่องนี้ จะลองส่งใหม่เมื่อเปิดหน้า";
  var NO_DRAFT_NOTE = "ยังไม่ถึงเซิร์ฟเวอร์ และเก็บร่างในเครื่องนี้ไม่ได้ — อย่าเพิ่งปิดหน้านี้ กด “ลองส่งอีกครั้ง”";

  // syncState → ข้อความ + สี (เขียว = ดี · เหลือง = เตือน · แดง = ล้มเหลว · เทา = กำลังทำ)
  var SYNC_LABEL = {
    idle: { text: "ตรงกับเซิร์ฟเวอร์", cls: "is-good" },
    loading: { text: "กำลังโหลด…", cls: "is-muted" },
    saving: { text: "กำลังบันทึก…", cls: "is-muted" },
    saved: { text: SAVED_NOTE, cls: "is-good" },
    draft: { text: "ร่างในเครื่อง — ยังไม่ถึงเซิร์ฟเวอร์", cls: "is-warn" },
    error: { text: "ล้มเหลว", cls: "is-bad" }
  };

  // ชื่อช่องที่เซิร์ฟเวอร์ตรวจ (itemProblems) → ภาษาไทย
  var PROBLEM_TH = { "not-object": "รูปแบบรายการ", id: "รหัสรายการ", date: "วันที่", symbol: "สัญลักษณ์" };

  function emptyForm() {
    return {
      symbol: "", date: "", event: "", feelings: [], direction: "", horizonDays: null, action: "",
      conviction: false, plan: "", withTrade: false, qty: "", price: "", fee: "", currency: ""
    };
  }
  // ฟอร์มเพิ่ม/แก้ไม้จริง (ส่วน "ไม้จริง") — ค่าที่พิมพ์ค้างเป็นสตริงทั้งหมด
  function emptyTradeForm() {
    return { date: "", symbol: "", side: "", qty: "", price: "", fee: "", currency: "", note: "", entryId: "" };
  }

  var state = {
    doc: null,              // เอกสารล่าสุดที่โหลดได้ (null = ยังไม่รู้)
    holdings: [],           // แถวจาก /api/portfolio-holdings เฉพาะ isHolding
    symbols: [],            // สัญลักษณ์ให้เลือก = holdings ∪ ที่เคยบันทึก (canonical · เรียง)
    form: emptyForm(),
    preview: null,          // ผลของปุ่ม "ดูว่ากฎบอกอะไร" (ดู previewRules)
    outcomesById: {},
    pricesBySymbol: {},     // canonical → { bars, sourceType, at: ymd กรุงเทพ, start, cutoff }
    syncState: "idle",      // idle | loading | saving | saved | draft | error
    syncNote: null,
    syncReason: null,       // เหตุผลที่ส่งไม่ถึงเซิร์ฟเวอร์ (ข้อความไทย) หรือ null
    syncAt: null,           // เวลา (HH:mm กรุงเทพ) ที่บันทึกบนเซิร์ฟเวอร์ล่าสุด
    draft: null,            // ร่างใน localStorage { doc, savedAt } หรือ null
    pendingDoc: null,       // doc ที่ส่งไม่ถึง (ถือไว้ในหน่วยความจำด้วย เผื่อเขียนร่างลงเครื่องไม่ได้)
    filters: {},            // ตัวกรองไทม์ไลน์ { symbol, feeling, compliance, action } — ไม่มีคีย์ = ทั้งหมด
    outcomesLoading: false, // กำลังดึงราคาเพื่อคิดผลจริงอยู่ไหม
    priceErrBySymbol: {},   // canonical → เหตุผลที่ดึงราคาผลจริงไม่สำเร็จ (ข้อความไทย)
    confirmDelId: null,     // id ของบันทึกที่กำลังถามยืนยันลบ
    logMsg: null,           // ข้อความบนไทม์ไลน์ เช่น ลบไม่ได้เพราะอะไร
    reviewDraft: {},        // id → { selfVerdict, lesson } ที่เลือก/พิมพ์ค้างในคิวทบทวน (ยังไม่บันทึก)
    reviewMsg: null,        // { id, text } เหตุผลที่การ์ดทบทวนนั้นยังไม่ส่ง
    lastReview: null,       // { id, symbol, date } ของการทบทวนล่าสุดในรอบนี้ — ใช้บอกผลที่หัวคิว
    tradeForm: emptyTradeForm(),
    tradeEditId: null,      // id ของไม้ที่กำลังแก้ในฟอร์ม (null = โหมดเพิ่มไม้)
    tradeConfirmDelId: null,// id ของไม้ที่กำลังถามยืนยันลบ
    tradeMsg: null,         // เหตุผลที่ไม้ยังไม่ส่ง (ข้อความไทย) หรือ null
    lastTrade: null,        // { verb, symbol, date } ของไม้ล่าสุดที่ส่งจากส่วนนี้ — ใช้บอกผลข้างปุ่ม
    ioMsg: null,            // { cls, text } ผลของการส่งออก/นำเข้าไฟล์สำรอง (ข้อความไทย) หรือ null
    lastImport: null,       // { text } การนำเข้าล่าสุดที่ส่งขึ้นเซิร์ฟเวอร์ — ใช้บอกสถานะข้างปุ่มนำเข้า
    methodOpen: false,      // ผู้ใช้เปิด <details> วิธีคิดอยู่ไหม (วาดใหม่แล้วไม่พับเอง)
    locked: false,
    loadError: null,        // เหตุผลที่โหลดเอกสารไม่สำเร็จ (ข้อความไทย) หรือ null
    serverLoaded: false,    // เคยได้สำเนาจากเซิร์ฟเวอร์แล้วหรือยัง (โหลดสำเร็จ / PUT สำเร็จ) — false = state.doc มีแค่ร่างในเครื่อง
    holdingsError: null,    // โหลดรายการหุ้นในพอร์ตไม่สำเร็จ (ไม่ร้ายแรง)
    formError: null,        // เหตุผลที่ปุ่มบันทึกไม่ส่ง (ข้อความไทย) หรือ null
    lastSave: null,         // { symbol, date } ของบันทึกล่าสุดจากฟอร์มนี้ — ใช้บอกผลข้างปุ่มบันทึก
    saving: false,
    loading: false,
    inflight: null,
    nowOverride: null       // เทสต์ฉีดเวลาได้ ("YYYY-MM-DDTHH:mm")
  };
  var loadSeq = 0;          // รอบโหลดล่าสุด — คำตอบของรอบเก่าที่มาถึงทีหลังถูกทิ้ง
  var previewSeq = 0;       // รอบดูกฎล่าสุด — คำตอบราคาที่มาช้าของรอบเก่าถูกทิ้ง
  var putChain = null;      // การส่งขึ้นเซิร์ฟเวอร์ต่อคิวกัน ไม่ยิงซ้อน
  var barsInflight = {};    // คำขอ /api/ohlc ที่ค้างอยู่ (สัญลักษณ์ + ช่วง + วัน + แท่งที่ปิด) — ขอซ้ำระหว่างรอได้ promise เดิม
  var outcomeRuns = 0;      // จำนวนรอบดึงราคาผลจริงที่ยังไม่จบ
  var renderedReviewIds = []; // id ของการ์ดทบทวนที่วาดอยู่บนจอ (อ่านช่องบทเรียนที่พิมพ์ค้างก่อนวาดใหม่)
  var OHLC_CONCURRENCY = 4; // สเปก §6: ดึงราคาพร้อมกันไม่เกิน 4
  var LOG_FILTER_KEYS = ["symbol", "feeling", "compliance", "action"];

  // ---------------- helpers ----------------
  function E() { return window.DecisionJournal || null; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }
  function each(list, fn) {
    if (!list) return;
    for (var i = 0; i < list.length; i++) fn(list[i], i);
  }
  function two(n) { return (n < 10 ? "0" : "") + n; }
  function trimStr(s) { return String(s == null ? "" : s).replace(/^\s+|\s+$/g, ""); }
  function findKey(list, key) {
    for (var i = 0; i < (list || []).length; i++) if (list[i] && list[i].key === key) return list[i];
    return null;
  }
  // ตัวเลขแบบมีคอมมา (ปัดเฉพาะตอนแสดง)
  function fmtNum(n, dp) {
    if (typeof n !== "number" || !isFinite(n)) return "—";
    var s = Math.abs(n).toFixed(dp);
    var parts = s.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return (n < 0 ? "−" : "") + parts.join(".");
  }
  function fmtPct(n, dp) {
    if (typeof n !== "number" || !isFinite(n)) return "—";
    var r = Number(Math.abs(n).toFixed(dp));
    var sign = r === 0 ? "" : (n > 0 ? "+" : "−");
    return sign + Math.abs(n).toFixed(dp) + "%";
  }
  function pctText(n) { return String(n) + "%"; }
  // ช่องตัวเลขที่ผู้ใช้พิมพ์: ตัดคอมมา/ช่องว่าง · ว่าง/อ่านไม่ได้ = null
  function numIn(v) {
    var s = String(v == null ? "" : v).replace(/[,\s]/g, "");
    if (s === "") return null;
    var n = Number(s);
    return isFinite(n) ? n : null;
  }

  // นาฬิกาจริงมีที่เดียวในหน้านี้ — ทุกที่ที่ต้องการเวลาจริง (ISO / ms) เรียก wallClock()
  function wallClock() { return new Date(); }
  function nowIso() { return wallClock().toISOString(); }

  // "ตอนนี้" เวลากรุงเทพ "YYYY-MM-DDTHH:mm" — ส่งเข้าเอนจินเป็นพารามิเตอร์ (เอนจินไม่อ่านนาฬิกาเอง)
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
    // กรุงเทพไม่มีเวลาออมแสง → UTC+7 คงที่
    return new Date(d.getTime() + 7 * 3600000).toISOString().slice(0, 16);
  }
  function todayYmd() { return nowBangkok().slice(0, 10); }

  function privacyLocked() {
    try {
      var pv = window.PortfolioPrivacy;
      return !!(pv && typeof pv.isLocked === "function" && pv.isLocked());
    } catch (e) { return false; }
  }

  // ---------------- localStorage (ทุกจุดห่อ try — โหมดส่วนตัว/บล็อก/เต็ม ต้องไม่ทำให้หน้าพัง) ----------------
  function lsGet(key) {
    try { return window.localStorage ? window.localStorage.getItem(key) : null; } catch (e) { return null; }
  }
  function lsSet(key, val) {
    try {
      if (!window.localStorage) return false;
      window.localStorage.setItem(key, val);
      return true;
    } catch (e) { return false; }
  }
  function lsRemove(key) {
    try { if (window.localStorage) window.localStorage.removeItem(key); } catch (e) { /* ไม่เป็นไร */ }
  }

  // ---------------- เครือข่าย ----------------
  // คืน { ok, status, body, netError, badJson } เสมอ ไม่ throw
  function asResult(p) {
    return p.then(function (r) {
      return r.json().then(
        function (j) { return { ok: !!r.ok, status: r.status, body: j }; },
        function () { return { ok: !!r.ok, status: r.status, body: null, badJson: true }; }
      );
    }, function (e) {
      return { ok: false, status: 0, body: null, netError: String((e && e.message) || e || "") };
    });
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
  function failReason(r) {
    if (r.status === 0) return "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" + (r.netError ? " (" + r.netError + ")" : "");
    if (r.status === 401) return "ต้องเข้าสู่ระบบก่อน (HTTP 401)";
    if (r.badJson) return "เซิร์ฟเวอร์ตอบกลับมาอ่านไม่ได้ (HTTP " + r.status + ")";
    return "HTTP " + r.status + (r.body && typeof r.body.error === "string" ? " · " + r.body.error : "");
  }
  function isDocShape(d) {
    // Array.isArray (ES5) ไม่ใช่ instanceof — ข้อมูลจาก fetch อาจมาจากคนละ realm
    return !!d && typeof d === "object" && !Array.isArray(d) && d.v === E().VERSION &&
      Array.isArray(d.entries) && Array.isArray(d.trades);
  }

  // ---------------- โหลดข้อมูล ----------------
  function applyDoc(r) {
    if (!r.ok) {
      state.syncState = "error";
      state.loadError = failReason(r);
      return false;
    }
    var data = r.body ? r.body.data : null;
    if (data == null) {
      state.doc = E().emptyDoc();                 // เซิร์ฟเวอร์ยังไม่มีแถวนี้ = ยังไม่เคยบันทึก
    } else if (isDocShape(data)) {
      state.doc = data;
    } else {
      // ห้ามเอาของผิดรูปมาแสดงเป็นข้อมูล และห้ามแทนที่ของเดิมที่เคยโหลดได้
      state.syncState = "error";
      state.loadError = "ข้อมูลบนเซิร์ฟเวอร์ผิดรูป ไม่ได้นำมาแสดง";
      return false;
    }
    state.serverLoaded = true;
    state.syncState = "idle";
    state.loadError = null;
    state.syncReason = null;
    state.syncNote = "โหลดเมื่อ " + nowBangkok().slice(11, 16) + " น.";
    return true;
  }

  function applyHoldings(r) {
    var rows = r.ok && r.body && Array.isArray(r.body.data) ? r.body.data : null;
    if (!rows) {
      state.holdings = [];
      state.holdingsError = failReason(r);
      return;
    }
    var out = [];
    each(rows, function (h) { if (h && h.isHolding) out.push(h); });
    state.holdings = out;
    state.holdingsError = null;
  }

  function buildSymbols() {
    var D = E(), seen = {}, out = [];
    function add(raw) {
      var c = D.canonicalSymbol(raw);
      if (c && !seen[c]) { seen[c] = 1; out.push(c); }
    }
    each(state.holdings, function (h) { add(h.canonicalSymbol); });
    if (state.doc) {
      each(D.liveEntries(state.doc), function (e) { add(e.symbol); });
      each(D.liveTrades(state.doc), function (x) { add(x.symbol); });
    }
    out.sort();
    return out;
  }

  // ร่าง + ของค้างในหน่วยความจำ รวมเป็น doc เดียว (null = ไม่มีอะไรค้าง)
  function pendingUnion() {
    var D = E();
    var d = readDraft();
    state.draft = d;
    var pending = d ? d.doc : null;
    if (state.pendingDoc) pending = pending ? D.mergeDocs(pending, state.pendingDoc) : state.pendingDoc;
    return pending;
  }

  function load(force) {
    // กำลังโหลดอยู่และไม่ได้สั่งบังคับ → คืน promise รอบที่ค้าง (ไม่ยิงซ้ำ)
    if (state.inflight && !force) return state.inflight;
    var seq = ++loadSeq;
    state.lastReview = null;
    state.lastImport = null;
    state.loading = true;
    state.syncState = "loading";
    state.syncNote = null;
    state.loadError = null;
    render();
    var p = Promise.all([getJson(DOC_URL), getJson(HOLDINGS_URL)]).then(function (res) {
      if (seq !== loadSeq) return;              // มีรอบใหม่กว่าเริ่มไปแล้ว — คำตอบนี้เก่า
      applyHoldings(res[1]);
      var ok = applyDoc(res[0]);
      // ร่างที่ค้าง (สเปก §6): merge กลับเข้าหน้าแล้วลองส่งอีกครั้ง — ส่งเฉพาะเมื่อโหลดสำเนาเซิร์ฟเวอร์ได้
      var pending = pendingUnion();
      if (pending && state.doc) state.doc = E().mergeDocs(state.doc, pending);
      state.symbols = buildSymbols();
      state.loading = false;
      state.inflight = null;
      render();
      var sent = (ok && pending) ? putDoc(pending) : Promise.resolve(undefined);
      if (!ok) return sent;
      // ผลจริง +7/+30/+90 ของทุกบันทึก (ไม่เก็บใน doc — คิดจากราคาจริงทุกครั้งที่เปิดหน้า สเปก §5.1)
      return sent.then(function (r) { return loadOutcomes().then(function () { return r; }); });
    });
    state.inflight = p;
    return p;
  }

  // ---------------- ร่างในเครื่อง ----------------
  function readDraft() {
    var raw = lsGet(DRAFT_KEY);
    if (!raw) return null;
    var d;
    try { d = JSON.parse(raw); } catch (e) { return null; }
    if (!d || typeof d !== "object" || !isDocShape(d.doc)) return null;
    return { doc: d.doc, savedAt: typeof d.savedAt === "string" ? d.savedAt : null };
  }
  function writeDraft(doc) {
    var d = { doc: doc, savedAt: nowIso() };
    var s;
    try { s = JSON.stringify(d); } catch (e) { return false; }
    if (!lsSet(DRAFT_KEY, s)) return false;
    state.draft = d;
    return true;
  }
  function clearDraft() {
    lsRemove(DRAFT_KEY);
    state.draft = null;
  }

  // ---------------- ส่งขึ้นเซิร์ฟเวอร์: GET สด → merge → PUT ----------------
  function putDoc(doc) {
    function run() { return putOnce(doc); }
    var p = putChain ? putChain.then(run, run) : run();
    putChain = p;
    return p;
  }

  // doc ครอบ sub ครบไหม: ทุกรายการ (ที่มี id) ของ sub อยู่ใน doc ด้วยตราประทับเท่ากันหรือใหม่กว่า
  //   (กติกาเดียวกับ mergeDocs ของเอนจิน: updatedAt ใหม่กว่าชนะ · tombstone ก็เป็นรายการที่มี updatedAt)
  function covers(doc, sub) {
    if (!sub) return true;
    if (!doc) return false;
    var have = {};
    each(doc.entries, function (x) { if (x && typeof x.id === "string") have["e:" + x.id] = x; });
    each(doc.trades, function (x) { if (x && typeof x.id === "string") have["t:" + x.id] = x; });
    var ok = true;
    function check(prefix, list) {
      each(list, function (s) {
        if (!ok || !s || typeof s !== "object" || typeof s.id !== "string" || s.id === "") return;   // ไม่มี id = merge ทิ้งอยู่แล้ว
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

  // วาดใหม่หลังงาน async — ข้อมูลถึงเซิร์ฟเวอร์/ร่างถูกเก็บแล้ว การวาดพังต้องไม่ทำให้สถานะที่บอกผู้ใช้กลับด้าน
  function safeRender(where) {
    try { render(); } catch (e) {
      try { if (window.console && console.error) console.error("decision-journal: วาดหน้าหลัง" + where + "ไม่สำเร็จ", e); } catch (e2) { /* ไม่มี console */ }
    }
  }

  function putOnce(doc) {
    var D = E();
    state.saving = true;
    state.syncState = "saving";
    state.syncNote = null;
    safeRender("เริ่มบันทึก");

    // ร่างที่ค้าง (localStorage + หน่วยความจำ) ไปด้วยทุกครั้ง — ไม่งั้นถ้าเปิดหน้าตอนโหลดไม่ได้แล้วบันทึกรายการใหม่
    // doc ที่ส่ง/ร่างที่เขียนทับจะไม่มีรายการค้างนั้น แล้วร่างถูกลบทั้งที่ยังไม่ถึงเซิร์ฟเวอร์ (สเปก §6: ห้ามข้อมูลหาย)
    var pend = pendingUnion();
    var full = pend ? D.mergeDocs(pend, doc) : doc;
    var merged = null;

    function fail(reason) {
      var keep = merged || full;
      // อ่านร่าง "ตอนนี้" อีกรอบก่อนเขียนทับ — แท็บอื่นอาจเขียนร่างเพิ่มระหว่างที่ GET/PUT ของแท็บนี้ค้างอยู่
      //   (กติกาเดียวกับ succeed() ที่อ่านร่างซ้ำก่อนลบ) ไม่งั้นรายการของแท็บนั้นหายเมื่อปิดแท็บนั้นไป
      var cur = readDraft();
      if (cur) {
        try { keep = D.mergeDocs(cur.doc, keep); } catch (e) { /* รวมไม่ได้ — อย่างน้อยเก็บของแท็บนี้ไว้ */ }
      }
      state.pendingDoc = keep;
      state.doc = D.mergeDocs(state.doc || D.emptyDoc(), keep);
      state.saving = false;
      state.syncReason = reason;
      if (writeDraft(keep)) {
        state.syncState = "draft";
        state.syncNote = DRAFT_NOTE;
      } else {
        state.syncState = "error";
        state.syncNote = NO_DRAFT_NOTE;
      }
      try { state.symbols = buildSymbols(); } catch (e) { /* รายการสัญลักษณ์เก่ายังใช้ได้ */ }
      safeRender("บันทึกไม่สำเร็จ");
      return false;
    }
    function errText(e) { return String((e && e.message) || e || ""); }

    // PUT สำเร็จแล้ว = ข้อมูลอยู่บนเซิร์ฟเวอร์ ตั้งสถานะก่อนแล้วค่อยวาด (วาดพังก็ยังบอกว่าบันทึกแล้วตามจริง)
    function succeed() {
      state.doc = merged;
      state.saving = false;
      state.syncState = "saved";
      state.syncNote = SAVED_NOTE;
      state.syncReason = null;
      state.syncAt = nowBangkok().slice(11, 16);
      state.loadError = null;
      state.serverLoaded = true;           // merged = สำเนาเซิร์ฟเวอร์ที่ GET สด ∪ ของในเครื่อง และ PUT ผ่านแล้ว
      if (covers(merged, state.pendingDoc)) state.pendingDoc = null;
      // ลบร่างเฉพาะเมื่อทุกรายการในร่าง "ตอนนี้" อยู่ใน doc ที่ PUT ไปแล้ว (แท็บอื่นอาจเขียนร่างเพิ่มระหว่างส่ง)
      var d = readDraft();
      if (!d || covers(merged, d.doc)) clearDraft();
      else state.draft = d;
      try { state.symbols = buildSymbols(); } catch (e) { /* วาดใหม่ครั้งหน้า */ }
      safeRender("บันทึกสำเร็จ");
      return true;
    }

    function onPut(w) {
      if (!w.ok) return fail(failReason(w));
      return succeed();
    }
    function onGet(r) {
      if (!r.ok) return fail("อ่านสำเนาบนเซิร์ฟเวอร์ก่อนบันทึกไม่สำเร็จ · " + failReason(r));
      var data = r.body ? r.body.data : null;
      var server;
      if (data == null) server = D.emptyDoc();
      else if (isDocShape(data)) server = data;
      else return fail("ข้อมูลบนเซิร์ฟเวอร์ผิดรูป จึงไม่ส่งทับ");
      var bytes;
      try {
        merged = D.mergeDocs(server, full);
        bytes = D.docBytes(merged);
      } catch (e) {
        merged = null;
        return fail("เกิดข้อผิดพลาดระหว่างรวมกับสำเนาบนเซิร์ฟเวอร์ (" + errText(e) + ")");
      }
      if (bytes > D.MAX_DOC_BYTES) return fail("ขนาดบันทึกเกินที่เซิร์ฟเวอร์รับ (" + fmtNum(bytes / D.MAX_DOC_BYTES * 100, 0) + "%)");
      // ตัวจัดการ error ผูกเฉพาะขั้นเครือข่าย — error หลัง PUT สำเร็จต้องไม่ถูกนับว่า "ไม่ได้บันทึก"
      return sendJson(DOC_URL, "PUT", { data: merged }).then(onPut, function (e) {
        return fail("เกิดข้อผิดพลาดระหว่างส่ง (" + errText(e) + ")");
      });
    }
    return getJson(DOC_URL).then(onGet, function (e) {
      return fail("เกิดข้อผิดพลาดระหว่างอ่านสำเนาบนเซิร์ฟเวอร์ (" + errText(e) + ")");
    });
  }

  function retrySync() {
    var pending = pendingUnion();
    if (!pending) return Promise.resolve(false);
    return putDoc(pending).then(afterDocChange);
  }

  // หลังเอกสารเปลี่ยน (บันทึก/ส่งร่าง) → คิดผลจริงของรายการใหม่ · ค่าที่คืนคือผลของการบันทึกเดิมเสมอ
  //   (ผลจริงดึงไม่สำเร็จ ไม่ได้แปลว่าบันทึกไม่สำเร็จ)
  function afterDocChange(ok) {
    return loadOutcomes().then(function () { return ok; }, function () { return ok; });
  }

  // ---------------- ราคา /api/ohlc + cache (สเปก §5.2 · §6) ----------------
  function ohlcCacheRead() {
    var raw = lsGet(OHLC_KEY);
    if (!raw) return {};
    try {
      var o = JSON.parse(raw);
      return (o && typeof o === "object" && !Array.isArray(o)) ? o : {};
    } catch (e) { return {}; }
  }
  function packBars(bars) {
    var out = [];
    each(bars, function (b) { if (b && typeof b === "object") out.push([b.date, b.high, b.low, b.close]); });
    return out;
  }
  function unpackBars(rows) {
    var out = [];
    each(rows, function (r) { if (Array.isArray(r)) out.push({ date: r[0], high: r[1], low: r[2], close: r[3] }); });
    return out;
  }
  // ใช้ของใน cache ได้เมื่อ: วันเดียวกัน (กรุงเทพ) · แท่งที่ "ปิดแล้ว" ยังเป็นแท่งเดิม (ไม่งั้นแท่งที่ดึงมาตอนยังไม่ปิดจะถูกนับเป็นราคาปิด)
  //   · ช่วงที่ดึงไว้เริ่มเก่าพอ
  function cacheFits(c, start, ymd, cutoff) {
    return !!c && typeof c === "object" && c.at === ymd && c.cutoff === cutoff &&
      typeof c.start === "string" && c.start <= start && Array.isArray(c.bars);
  }
  function ohlcCacheWrite(sym, entry) {
    var all = ohlcCacheRead(), keep = {}, keys = [], k;
    for (k in all) {
      if (Object.prototype.hasOwnProperty.call(all, k) && k !== sym && all[k] && all[k].at === entry.at) keys.push(k);
    }
    while (keys.length > OHLC_CACHE_MAX - 1) keys.shift();
    each(keys, function (x) { keep[x] = all[x]; });
    keep[sym] = entry;
    if (lsSet(OHLC_KEY, JSON.stringify(keep))) return;
    var only = {};
    only[sym] = entry;
    if (!lsSet(OHLC_KEY, JSON.stringify(only))) lsRemove(OHLC_KEY);
  }

  // → Promise<{ ok, bars, sourceType, error?, notFound?, cached? }> ไม่ reject
  function fetchBars(symbol, startYmd) {
    var D = E();
    var sym = D.canonicalSymbol(symbol);
    if (!sym) return Promise.resolve({ ok: false, bars: [], sourceType: null, error: "สัญลักษณ์ว่าง" });
    var now = nowBangkok();
    var ymd = now.slice(0, 10);
    var cutoff = D.closedBarCutoff(D.marketOf(sym), now);
    var start = D.isYmd(startYmd) ? startYmd : D.ymdAdd(ymd, -HISTORY_DAYS);
    var mem = state.pricesBySymbol[sym];
    if (cacheFits(mem, start, ymd, cutoff)) {
      return Promise.resolve({ ok: true, bars: mem.bars, sourceType: mem.sourceType, cached: true });
    }
    var disk = ohlcCacheRead()[sym];
    if (cacheFits(disk, start, ymd, cutoff)) {
      var restored = unpackBars(disk.bars);
      state.pricesBySymbol[sym] = { bars: restored, sourceType: disk.sourceType || null, at: ymd, start: disk.start, cutoff: cutoff };
      return Promise.resolve({ ok: true, bars: restored, sourceType: disk.sourceType || null, cached: true });
    }
    var key = sym + "|" + start + "|" + ymd + "|" + cutoff;
    if (barsInflight[key]) return barsInflight[key];
    var url = "/api/ohlc?symbol=" + encodeURIComponent(D.providerSymbol(sym)) + "&start=" + start + "&_ts=" + wallClock().getTime();
    var p = getJson(url).then(function (r) {
      var body = r.body && typeof r.body === "object" ? r.body : {};
      var bars = Array.isArray(body.bars) ? body.bars : null;
      // Yahoo ตอบ 404 = ไม่มีสัญลักษณ์นี้ที่แหล่งข้อมูล → "ได้ 0 แท่งอย่างชัดเจน" (สเปก §5.2: กองทุน RMF ฯลฯ บันทึกได้เป็น unknown)
      var notFound = !r.ok && typeof body.error === "string" && /\(404\)/.test(body.error);
      if (!(r.ok && bars) && !notFound) return { ok: false, bars: [], sourceType: null, error: failReason(r) };
      var got = notFound ? [] : bars;
      var sourceType = notFound ? "NOT_FOUND" : (typeof body.sourceType === "string" ? body.sourceType : null);
      state.pricesBySymbol[sym] = { bars: got, sourceType: sourceType, at: ymd, start: start, cutoff: cutoff };
      ohlcCacheWrite(sym, { at: ymd, start: start, cutoff: cutoff, sourceType: sourceType, bars: packBars(got) });
      return { ok: true, bars: got, sourceType: sourceType, notFound: notFound };
    });
    barsInflight[key] = p;
    function settle() { if (barsInflight[key] === p) delete barsInflight[key]; }
    p.then(settle, settle);
    return p;
  }

  // ---------------- ผลจริง +7/+30/+90 (สเปก §5.4) ----------------
  // ทำงานทีละไม่เกิน limit ตัว · ใช้ window.mapWithConcurrency (api-auth.js) ถ้ามี · worker พังตัวเดียวไม่หยุดตัวอื่น
  function pool(items, limit, worker) {
    if (typeof window.mapWithConcurrency === "function") {
      try { return Promise.resolve(window.mapWithConcurrency(items, limit, worker)); } catch (e) { return Promise.resolve([]); }
    }
    return new Promise(function (resolve) {
      var n = items.length, next = 0, done = 0;
      if (!n) { resolve([]); return; }
      function finishOne() {
        done++;
        if (done === n) resolve([]);
        else runNext();
      }
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

  function logError(where, e) {
    try { if (window.console && console.error) console.error("decision-journal: " + where + "ไม่สำเร็จ", e); } catch (e2) { /* ไม่มี console */ }
  }

  // ดึงราคา 1 ครั้งต่อสัญลักษณ์ (ช่วงเริ่ม = วันที่บันทึกเก่าสุดของสัญลักษณ์นั้น − MAX_STALE_DAYS ให้มีแท่ง as-of ที่ใช้เป็นราคาตั้งต้น)
  // แล้ว _state.outcomesById[id] = outcomes(entry, bars, nowBangkok) — หน้าไม่คิดผลเอง
  // ดึงไม่สำเร็จ → priceErrBySymbol[sym] และไม่สร้างผลปลอม (การ์ดบอกว่ายังไม่รู้) · ไม่ reject
  function loadOutcomes() {
    var D = E();
    if (!D || !state.doc) return Promise.resolve();
    var groups = {}, syms = [];
    try {
      each(D.liveEntries(state.doc), function (e) {
        var sym = D.canonicalSymbol(e.symbol);
        if (!sym || !D.isYmd(e.date) || typeof e.id !== "string") return;
        var g = groups[sym];
        if (!g) { g = groups[sym] = { min: e.date, entries: [] }; syms.push(sym); }
        if (e.date < g.min) g.min = e.date;
        g.entries.push(e);
      });
    } catch (err) {
      logError("เตรียมดึงราคาผลจริง", err);
      return Promise.resolve();
    }
    // ไม้ที่ยังเปิดอยู่ของสัญลักษณ์ที่ไม่มีบันทึก (เพิ่มไม้เดี่ยว) ต้องมีราคาปิดล่าสุดด้วย — ดึงช่วงสั้นพอได้แท่งล่าสุด
    //   ดึงในรอบเดียวกัน (ไม่ยิงซ้ำ) · สัญลักษณ์ที่มีบันทึกอยู่แล้วใช้ราคาชุดเดียวกับผลจริง
    try {
      each(D.fifo(D.liveTrades(state.doc), null).open, function (o) {
        if (!o || !o.symbol || groups[o.symbol]) return;
        groups[o.symbol] = { min: null, entries: [] };
        syms.push(o.symbol);
      });
    } catch (err) {
      logError("หาไม้ที่เปิดอยู่", err);
    }
    if (!syms.length) return Promise.resolve();
    var now = nowBangkok();
    outcomeRuns++;
    state.outcomesLoading = true;
    safeRender("เริ่มดึงราคาผลจริง");
    function work(sym) {
      var g = groups[sym];
      var start = g.min ? D.ymdAdd(g.min, -D.MAX_STALE_DAYS) : D.ymdAdd(now.slice(0, 10), -TRADE_PRICE_DAYS);
      return fetchBars(sym, start).then(function (res) {
        if (!res.ok) {
          state.priceErrBySymbol[sym] = res.error || "ดึงราคาไม่สำเร็จ";
          return;
        }
        delete state.priceErrBySymbol[sym];
        each(g.entries, function (e) { state.outcomesById[e.id] = D.outcomes(e, res.bars, now); });
      }).then(null, function (err) {
        state.priceErrBySymbol[sym] = "คำนวณผลจริงไม่สำเร็จ (" + String((err && err.message) || err || "") + ")";
      });
    }
    function end() {
      outcomeRuns = Math.max(0, outcomeRuns - 1);
      state.outcomesLoading = outcomeRuns > 0;
      safeRender("ดึงราคาผลจริงเสร็จ");
    }
    return pool(syms, OHLC_CONCURRENCY, work).then(end, end);
  }

  // ---------------- ฟอร์ม: อ่าน/เขียนค่าจาก DOM ----------------
  function field(id) {
    try { return document.getElementById(id); } catch (e) { return null; }
  }
  function valOf(id) {
    var el = field(id);
    if (!el || el.value == null) return "";
    return String(el.value);
  }
  function checkedOf(id) {
    var el = field(id);
    return !!(el && el.checked);
  }
  function readForm() {
    if (!field("djSymbol")) return;          // ฟอร์มยังไม่ถูกวาด
    var f = state.form;
    f.symbol = valOf("djSymbol");
    f.date = valOf("djDate");
    f.event = valOf("djEvent");
    f.direction = valOf("djDirection");
    var h = valOf("djHorizon"), hn = Number(h);
    f.horizonDays = (h !== "" && isFinite(hn)) ? hn : null;
    f.action = valOf("djAction");
    f.conviction = checkedOf("djConviction");
    f.plan = valOf("djPlan");
    f.withTrade = checkedOf("djWithTrade");
    f.qty = valOf("djQty");
    f.price = valOf("djPrice");
    f.fee = valOf("djFee");
    f.currency = valOf("djCurrency");
  }
  function writeFormToDom() {
    var f = state.form;
    function setV(id, v) { var el = field(id); if (el) el.value = v; }
    function setC(id, v) { var el = field(id); if (el) el.checked = !!v; }
    setV("djSymbol", f.symbol);
    setV("djDate", f.date || todayYmd());
    setV("djEvent", f.event);
    setV("djDirection", f.direction);
    setV("djHorizon", f.horizonDays == null ? "" : String(f.horizonDays));
    setV("djAction", f.action);
    setC("djConviction", f.conviction);
    setV("djPlan", f.plan);
    setC("djWithTrade", f.withTrade);
    setV("djQty", f.qty);
    setV("djPrice", f.price);
    setV("djFee", f.fee);
    setV("djCurrency", f.currency);
  }
  function resetForm() {
    state.form = emptyForm();
    state.preview = null;
    state.formError = null;
    writeFormToDom();
  }
  function isTradeAction(kind) { return kind === "buy" || kind === "sell"; }

  // ---------------- ดูว่ากฎบอกอะไร ----------------
  // preview = { status, symbol, date, now, bars, sourceType, notFound, error, memo }
  //   status: loading | bad-symbol | blocked (future/bad-input/stale) | failed | no-bars | ok
  //   now ถูกแช่ไว้ตอนดู — ตอนบันทึกคิดกฎซ้ำจากแท่งชุดเดิมและเวลาเดิม (สิ่งที่บันทึก = สิ่งที่เห็นบนจอ)
  function rulesFor(p, conviction) {
    var key = conviction ? "y" : "n";
    if (!p.memo) p.memo = {};
    if (!p.memo[key]) {
      var r = E().evaluateRules(p.bars || [], { date: p.date, nowBangkok: p.now, symbol: p.symbol, conviction: conviction });
      r.staleSource = p.sourceType === "SERVER_CACHED_DATA";   // /api/ohlc ดึงสดไม่ได้ ใช้สำเนาบนเซิร์ฟเวอร์
      p.memo[key] = r;
    }
    return p.memo[key];
  }
  function convictionNow() { return state.form.action === "buy" && state.form.conviction === true; }

  function previewRules() {
    readForm();
    var D = E();
    var f = state.form;
    var now = nowBangkok();
    var sym = D.canonicalSymbol(f.symbol);
    var date = f.date;
    var seq = ++previewSeq;
    state.formError = null;
    state.lastSave = null;
    if (!sym) {
      state.preview = { status: "bad-symbol", symbol: "", date: date, now: now };
      render();
      return Promise.resolve();
    }
    // วันที่ใช้ไม่ได้ / อยู่ในอนาคต → เอนจินบอกได้ทันทีโดยไม่ต้องดึงราคา
    var pre = D.evaluateRules([], { date: date, nowBangkok: now, symbol: sym, conviction: false });
    if (pre.blocked === "bad-input" || pre.blocked === "future") {
      state.preview = { status: "blocked", blocked: pre.blocked, symbol: sym, date: date, now: now, bars: [], memo: {} };
      render();
      return Promise.resolve();
    }
    state.preview = { status: "loading", symbol: sym, date: date, now: now };
    render();
    return fetchBars(sym, D.ymdAdd(date, -HISTORY_DAYS)).then(function (res) {
      if (seq !== previewSeq) return;
      if (!res.ok) {
        state.preview = { status: "failed", symbol: sym, date: date, now: now, error: res.error || "" };
        render();
        return;
      }
      var p = { status: "", symbol: sym, date: date, now: now, bars: res.bars, sourceType: res.sourceType, notFound: !!res.notFound, memo: {} };
      var rules = rulesFor(p, false);
      p.status = rules.ok ? "ok" : (rules.blocked === "no-bars" ? "no-bars" : "blocked");
      p.blocked = rules.blocked;
      state.preview = p;
      render();
    }).then(null, function (e) {
      if (seq !== previewSeq) return;
      state.preview = { status: "failed", symbol: sym, date: date, now: now, error: String((e && e.message) || e || "") };
      render();
    });
  }

  function previewMatchesForm() {
    var p = state.preview;
    if (!p) return false;
    return p.symbol === E().canonicalSymbol(state.form.symbol) && p.date === state.form.date;
  }
  function canSave() {
    var p = state.preview;
    return !!p && (p.status === "ok" || p.status === "no-bars") && previewMatchesForm() && !state.saving;
  }

  // ---------------- บันทึก ----------------
  function refuse(msg) {
    state.formError = msg;
    render();
    return Promise.resolve(false);
  }

  function save() {
    readForm();
    var D = E();
    var f = state.form;
    var p = state.preview;
    state.formError = null;
    if (state.saving) return Promise.resolve(false);
    if (!p || !previewMatchesForm()) {
      return refuse("กด “ดูว่ากฎบอกอะไร” ก่อนบันทึก" + (p ? " — สัญลักษณ์หรือวันที่เปลี่ยนหลังดูกฎ" : ""));
    }
    if (p.status !== "ok" && p.status !== "no-bars") return refuse("ยังบันทึกไม่ได้ — ดูเหตุผลในกล่องกฎด้านบน");
    var missing = [];
    if (!findKey(D.DIRECTIONS, f.direction)) missing.push("คาดว่าราคาจะ");
    if (D.HORIZONS.indexOf(f.horizonDays) < 0) missing.push("ภายใน");
    if (!findKey(D.ACTIONS, f.action)) missing.push("ทำอะไร");
    if (missing.length) return refuse("ยังไม่ได้เลือก: " + missing.join(" · "));

    var conviction = f.action === "buy" && f.conviction === true;
    var full = rulesFor(p, conviction);
    if (!(full.ok || full.blocked === "no-bars")) return refuse("ยังบันทึกไม่ได้ — ดูเหตุผลในกล่องกฎด้านบน");
    var rules = {}, k;
    for (k in full) {
      if (Object.prototype.hasOwnProperty.call(full, k) && k !== "ok" && k !== "blocked") rules[k] = full[k];
    }
    rules = JSON.parse(JSON.stringify(rules));   // แยกออกจากของที่แสดงบนจอ — บันทึกแล้วแช่แข็ง
    var feelings = [];
    each(D.FEELINGS, function (x) { if (f.feelings.indexOf(x.key) >= 0) feelings.push(x.key); });

    var stamp = nowIso();
    var entry = {
      id: D.newId("e"), createdAt: stamp, updatedAt: stamp, deletedAt: null,
      date: p.date, symbol: p.symbol, label: "",
      context: { event: trimStr(f.event), feelings: feelings, note: "" },
      view: { direction: f.direction, horizonDays: f.horizonDays },
      action: { kind: f.action, plan: trimStr(f.plan), conviction: conviction, tradeIds: [] },
      rules: rules,
      verdict: D.verdictFor(f.action, rules),
      review: { reviewedAt: null, selfVerdict: null, lesson: "" }
    };
    var trades = [];
    if (f.withTrade && isTradeAction(f.action)) {
      var qty = numIn(f.qty);
      var price = numIn(f.price);
      var fee = trimStr(f.fee) === "" ? 0 : numIn(f.fee);
      var bad = [];
      if (qty === null || !(qty > 0)) bad.push("จำนวนต้องมากกว่า 0");
      if (price === null || !(price > 0)) bad.push("ราคาต่อหน่วยต้องมากกว่า 0");
      if (fee === null || fee < 0) bad.push("ค่าธรรมเนียมต้องเป็นตัวเลขที่ไม่ติดลบ");
      if (bad.length) return refuse("ไม้จริง: " + bad.join(" · "));
      var currency = (f.currency === "THB" || f.currency === "USD") ? f.currency : D.currencyOf(p.symbol);
      var tr = {
        id: D.newId("t"), createdAt: stamp, updatedAt: stamp, deletedAt: null,
        date: p.date, symbol: p.symbol, side: f.action, qty: qty, price: price,
        currency: currency, fee: fee, note: "", entryId: entry.id
      };
      entry.action.tradeIds = [tr.id];
      trades.push(tr);
    }

    // กติกาเดียวกับเซิร์ฟเวอร์ (สเปก §6) — รายการเสียตัวเดียวทำให้ทั้ง doc ถูกปฏิเสธตลอดไป จึงไม่ส่งเลย
    var problems = [];
    each([entry].concat(trades), function (it) {
      each(D.itemProblems(it), function (code) {
        var th = PROBLEM_TH[code] || code;
        if (problems.indexOf(th) < 0) problems.push(th);
      });
    });
    if (problems.length) return refuse("ข้อมูลไม่ครบตามที่เซิร์ฟเวอร์รับ (" + problems.join(" · ") + ") — ยังไม่ได้ส่ง");

    var local = D.mergeDocs(state.doc || D.emptyDoc(), { v: D.VERSION, updatedAt: stamp, entries: [entry], trades: trades });
    var bytes = D.docBytes(local);
    if (bytes > D.MAX_DOC_BYTES) {
      return refuse("พื้นที่บันทึกเต็ม (" + fmtNum(bytes / D.MAX_DOC_BYTES * 100, 0) + "% ของที่เซิร์ฟเวอร์รับ) — ยังไม่ได้ส่ง");
    }
    state.doc = local;
    state.symbols = buildSymbols();
    state.lastSave = { symbol: p.symbol, date: p.date };
    state.lastReview = null;
    state.lastTrade = null;
    state.lastImport = null;
    resetForm();
    return putDoc(local).then(afterDocChange);
  }

  // ---------------- ลบบันทึก (tombstone · สเปก §5.1) ----------------
  // ลบ = ประทับ deletedAt บนสำเนา (เหลือเฉพาะคีย์ที่ merge ต้องใช้) แล้วส่งแบบเดียวกับการบันทึก
  // ไม้จริงที่ผูกไว้ไม่ถูกลบ (เป็นข้อเท็จจริงของพอร์ต ลบเองได้ในส่วนไม้จริง)
  function deleteEntry(id) {
    var D = E();
    state.confirmDelId = null;
    state.logMsg = null;
    var found = null;
    if (state.doc) each(D.liveEntries(state.doc), function (e) { if (!found && e.id === id) found = e; });
    if (!found) {
      state.logMsg = "ไม่พบบันทึกนี้ (อาจถูกลบไปแล้ว) — ไม่ได้ส่งอะไร";
      safeRender("ลบไม่สำเร็จ");
      return Promise.resolve(false);
    }
    var stamp = nowIso();
    var tomb = D.tombstone(JSON.parse(JSON.stringify(found)), stamp);
    var problems = tomb ? D.itemProblems(tomb) : ["not-object"];
    if (problems.length) {
      var th = [];
      each(problems, function (code) { th.push(PROBLEM_TH[code] || code); });
      state.logMsg = "ลบไม่ได้ — ข้อมูลรายการนี้ไม่ครบตามที่เซิร์ฟเวอร์รับ (" + th.join(" · ") + ") ยังไม่ได้ส่ง";
      safeRender("ลบไม่สำเร็จ");
      return Promise.resolve(false);
    }
    var local = D.mergeDocs(state.doc, { v: D.VERSION, updatedAt: stamp, entries: [tomb], trades: [] });
    state.doc = local;
    state.lastReview = null;
    state.lastTrade = null;
    state.lastImport = null;
    delete state.outcomesById[id];
    delete state.reviewDraft[id];
    try { state.symbols = buildSymbols(); } catch (e) { /* รายการสัญลักษณ์เก่ายังใช้ได้ */ }
    return putDoc(local);
  }

  // ---------------- ตัวกรองไทม์ไลน์ ----------------
  function setFilter(key, value) {
    if (LOG_FILTER_KEYS.indexOf(key) < 0) return;
    var v = value == null ? "" : String(value);
    if (v === "") delete state.filters[key];
    else state.filters[key] = v;
    render();
  }

  // ---------------- ทบทวน (สเปก §7 ข้อ 2) ----------------
  // คิว = บันทึกที่ reviewDue(entry, outcome) ของเอนจินบอกว่าถึงกำหนด (ช่วงของตัวเองไม่ pending แล้ว และยังไม่ทบทวน)
  //   หน้าไม่ตัดสินเวลาเอง · ไม่มีผลจริง (ยังดึงราคาไม่ได้) = ยังไม่ขึ้นคิว แต่คิวบอกว่าดึงราคาสัญลักษณ์ไหนไม่สำเร็จ
  // บันทึกการทบทวนแก้ได้เฉพาะ review (สเปก §5.1) — ช่องที่แช่แข็งไว้ตอนบันทึกไม่ถูกแตะ
  var REVIEW_VERDICTS = ["right", "wrong", "mixed"];
  function lessonId(id) { return "djLesson-" + id; }
  function reviewDraftOf(id) {
    if (!state.reviewDraft[id]) state.reviewDraft[id] = { selfVerdict: null, lesson: "" };
    return state.reviewDraft[id];
  }
  // เก็บบทเรียนที่พิมพ์ค้างไว้ก่อนวาดใหม่ (ไม่งั้นกดเลือกถูก/ผิดแล้วข้อความหาย)
  function readReviewInputs() {
    each(renderedReviewIds, function (id) {
      var el = field(lessonId(id));
      if (el && el.value != null) reviewDraftOf(id).lesson = String(el.value);
    });
  }
  // [{ e, o }] ที่ถึงกำหนด — ครบกำหนดก่อนขึ้นก่อน (ค้างนานสุดอยู่บนสุด)
  function dueList() {
    var D = E(), out = [];
    if (!state.doc) return out;
    each(D.liveEntries(state.doc), function (e) {
      if (typeof e.id !== "string") return;
      var o = state.outcomesById[e.id];
      if (o && typeof o === "object" && D.reviewDue(e, o)) out.push({ e: e, o: o });
    });
    out.sort(function (a, b) {
      var ad = String(a.o.dueDate || ""), bd = String(b.o.dueDate || "");
      if (ad !== bd) return ad < bd ? -1 : 1;
      return -entryCmp(a.e, b.e);
    });
    return out;
  }

  function setReviewVerdict(id, verdict) {
    if (REVIEW_VERDICTS.indexOf(verdict) < 0) return;
    reviewDraftOf(id).selfVerdict = verdict;     // บทเรียนที่พิมพ์ค้าง render() อ่านเก็บก่อนวาดใหม่
    if (state.reviewMsg && state.reviewMsg.id === id) state.reviewMsg = null;
    render();
  }

  function saveReview(id, input) {
    var D = E();
    var inp = obj(input);
    var verdict = inp.selfVerdict;
    var lesson = typeof inp.lesson === "string" ? trimStr(inp.lesson) : "";
    state.reviewMsg = null;
    function no(text) {
      state.reviewMsg = { id: id, text: text };
      safeRender("ทบทวนไม่สำเร็จ");
      return Promise.resolve(false);
    }
    if (state.saving) return no("กำลังบันทึกรายการก่อนหน้าอยู่ — รอสักครู่แล้วกดอีกครั้ง");
    var found = null;
    if (state.doc) each(D.liveEntries(state.doc), function (e) { if (!found && e.id === id) found = e; });
    if (!found) return no("ไม่พบบันทึกนี้ (อาจถูกลบไปแล้ว) — ไม่ได้ส่งอะไร");
    if (!D.reviewDue(found, state.outcomesById[id])) return no("บันทึกนี้ยังไม่ถึงกำหนดทบทวน หรือทบทวนไปแล้ว — ไม่ได้ส่งอะไร");
    if (REVIEW_VERDICTS.indexOf(verdict) < 0) return no("เลือกก่อนว่ามองย้อนกลับไปแล้ว ตัดสินใจครั้งนี้ถูก ผิด หรือก้ำกึ่ง");
    var stamp = nowIso();
    var copy = JSON.parse(JSON.stringify(found));
    copy.review = { reviewedAt: stamp, selfVerdict: verdict, lesson: lesson };
    D.touch(copy, stamp);
    var problems = D.itemProblems(copy);
    if (problems.length) {
      var th = [];
      each(problems, function (code) { th.push(PROBLEM_TH[code] || code); });
      return no("บันทึกไม่ได้ — ข้อมูลรายการนี้ไม่ครบตามที่เซิร์ฟเวอร์รับ (" + th.join(" · ") + ") ยังไม่ได้ส่ง");
    }
    var local = D.mergeDocs(state.doc, { v: D.VERSION, updatedAt: stamp, entries: [copy], trades: [] });
    var bytes = D.docBytes(local);
    if (bytes > D.MAX_DOC_BYTES) {
      return no("พื้นที่บันทึกเต็ม (" + fmtNum(bytes / D.MAX_DOC_BYTES * 100, 0) + "% ของที่เซิร์ฟเวอร์รับ) — ยังไม่ได้ส่ง");
    }
    state.doc = local;
    delete state.reviewDraft[id];
    var box = field(lessonId(id));
    if (box) box.value = "";
    state.lastReview = { id: id, symbol: D.canonicalSymbol(found.symbol) || String(found.symbol || ""), date: String(found.date || "") };
    state.lastSave = null;
    state.lastTrade = null;
    state.lastImport = null;
    return putDoc(local);
  }

  // ---------------- render ----------------
  function block(id, title, sub, body, extraCls) {
    return '<section id="' + id + '" class="dj-block' + (extraCls ? " " + extraCls : "") + '" aria-labelledby="' + id + 'H">' +
      '<div class="dj-block-head"><h2 id="' + id + 'H">' + esc(title) + "</h2>" +
      (sub ? '<span class="dj-block-sub">' + sub + "</span>" : "") + "</div>" +
      body + "</section>";
  }
  // cls (ถ้ามี) อยู่ที่กล่อง ไม่ใช่ที่ตัวเลข · sub = บรรทัดเล็กใต้ป้าย เช่น สถานะกำลังโหลด
  function tile(n, label, cls, sub) {
    return '<div class="dj-tile' + (cls ? " " + cls : "") + '"><div class="dj-tile-n">' + esc(n) + '</div><div class="dj-tile-l">' + esc(label) + "</div>" +
      (sub ? '<div class="dj-tile-s">' + esc(sub) + "</div>" : "") + "</div>";
  }
  function pill(cls, text) { return '<span class="dj-pill ' + cls + '">' + esc(text) + "</span>"; }
  function syncPill() {
    var sync = SYNC_LABEL[state.syncState] || SYNC_LABEL.idle;
    return '<span class="dj-sync ' + sync.cls + '" role="status" aria-live="polite">' + esc(sync.text) + "</span>";
  }

  function renderSummary() {
    var D = E();
    var sync = SYNC_LABEL[state.syncState] || SYNC_LABEL.idle;
    var note = state.syncNote && state.syncNote !== sync.text ? state.syncNote : "";
    if (state.syncState === "saved" && state.syncAt) note = "เมื่อ " + state.syncAt + " น.";
    var head = syncPill() + (note ? '<span class="dj-sync-note">' + esc(note) + "</span>" : "");
    var alert = "";
    if (state.loadError) {
      alert = '<div class="dj-alert is-bad" role="alert"><div class="dj-alert-text"><strong>โหลดบันทึกจากเซิร์ฟเวอร์ไม่สำเร็จ</strong>' +
        "<span>" + esc(state.loadError) + "</span>" +
        "<span>" + (state.serverLoaded && state.doc ? "ตัวเลขด้านล่างเป็นข้อมูลที่โหลดได้ครั้งก่อน" : "ยังไม่รู้ว่าบนเซิร์ฟเวอร์มีบันทึกอะไรบ้าง") + "</span></div>" +
        '<button type="button" class="dj-btn" data-dj-reload="1">ลองโหลดอีกครั้ง</button></div>';
    }
    var pendingAlert = "";
    if ((state.draft || state.pendingDoc) && state.syncState !== "saving") {
      var isDraft = !!state.draft;
      pendingAlert = '<div class="dj-alert ' + (isDraft ? "is-warn" : "is-bad") + '" role="alert"><div class="dj-alert-text">' +
        "<strong>" + (isDraft ? "มีบันทึกที่ยังไม่ถึงเซิร์ฟเวอร์ (เก็บร่างไว้ในเครื่องนี้)" : "มีบันทึกที่ยังไม่ถึงเซิร์ฟเวอร์ และเก็บร่างในเครื่องนี้ไม่ได้") + "</strong>" +
        (state.syncReason ? "<span>สาเหตุ: " + esc(state.syncReason) + "</span>" : "") +
        "<span>" + (isDraft ? "ระบบจะลองส่งใหม่เมื่อเปิดหน้านี้ หรือกดลองส่งตอนนี้" : "อย่าเพิ่งปิดหน้านี้ กดลองส่งอีกครั้ง") + "</span></div>" +
        '<button type="button" class="dj-btn" data-dj-retry="1">ลองส่งอีกครั้ง</button></div>';
    }
    // ยังไม่เคยได้สำเนาจากเซิร์ฟเวอร์ → state.doc (ถ้ามี) คือร่างในเครื่องล้วน ๆ ห้ามแสดงเป็นยอดรวม
    var known = state.serverLoaded && !!state.doc;
    var nEntries = known ? String(D.liveEntries(state.doc).length) : "—";
    var nTrades = known ? String(D.liveTrades(state.doc).length) : "—";
    // รอทบทวน = คิวเดียวกับส่วน "ถึงกำหนดทบทวน" (dueList) · ระหว่างดึงราคาบอกว่ากำลังดึง (ตัวเลขอาจยังไม่ครบ)
    var dueN = known ? dueList().length : null;
    var dueTile = tile(dueN === null ? "—" : String(dueN), "รอทบทวน", dueN ? "is-warn" : "",
      known && state.outcomesLoading ? "กำลังดึงราคา…" : "");
    var dueLink = dueN
      ? '<a class="dj-due" href="#djReview"><strong>รอทบทวน ' + dueN + " รายการ</strong>" +
        "<span>ผลจริงมาถึงแล้ว — ดูว่าคาดถูกไหม แล้วจดบทเรียนสั้น ๆ</span></a>"
      : "";
    var tiles = dueLink + '<div class="dj-tiles">' + dueTile + factTiles(known) + "</div>" +
      '<div class="dj-tiles dj-tiles-minor">' + tile(nEntries, "บันทึก", "is-minor") + tile(nTrades, "ไม้จริง", "is-minor") + "</div>";
    if (!known && state.doc) {
      tiles += '<p class="dj-note">เฉพาะร่างในเครื่องนี้: บันทึก ' + D.liveEntries(state.doc).length + " · ไม้จริง " +
        D.liveTrades(state.doc).length + " — ยังไม่รู้ว่าบนเซิร์ฟเวอร์มีอะไร</p>";
    }
    var hnote = state.holdingsError
      ? '<p class="dj-note">รายการหุ้นในพอร์ตโหลดไม่สำเร็จ (' + esc(state.holdingsError) + ") — พิมพ์สัญลักษณ์เองได้ตามปกติ</p>"
      : "";
    return block("djSummary", "ภาพรวม", head, alert + pendingAlert + sizeAlert() + tiles + hnote);
  }

  // ---- ภาพรวม: ตัวเลขที่ตอบว่า "ทำตามกฎไหม · คาดถูกไหม · ถืออะไรอยู่ · ได้/เสียเท่าไร" ----
  // ตามกฎ x / y  = per-rule / (per-rule + against) ของบันทึกที่ยังอยู่ (คำตัดสินแช่แข็งตอนบันทึก)
  // คาดถูก a / b = byPrediction.right / byPrediction.judged ของ stats() (ทรงตัวอยู่ในตัวหาร · คาดว่าไม่แน่ใจไม่นับ)
  // ไม้เปิดอยู่ / รับรู้ = fifo() ชุดเดียวกับส่วนไม้จริง · เงินรับรู้แยกสกุล ล็อกอยู่ = XXX ไม่ลงสี
  function fifoNow() {
    var D = E();
    if (!state.doc) return null;
    try { return D.fifo(D.liveTrades(state.doc), lastCloses()); } catch (e) { logError("คิดไม้จริง", e); return null; }
  }
  function statsNow() {
    var D = E();
    if (!state.doc) return null;
    try { return D.stats(D.liveEntries(state.doc), state.outcomesById); } catch (e) { logError("คิดสถิติ", e); return null; }
  }
  function moneyTile(amount, currency, label, sub) {
    return '<div class="dj-tile"><div class="dj-tile-n' + pnlCls(amount) + '">' + esc(moneySigned(amount, currency, true)) + "</div>" +
      '<div class="dj-tile-l">' + esc(label) + "</div>" + (sub ? '<div class="dj-tile-s">' + esc(sub) + "</div>" : "") + "</div>";
  }
  // บรรทัดใต้ "ไม้เปิดอยู่": ชื่อสัญลักษณ์ (ไม่ใช่เงิน ล็อกอยู่ก็แสดงได้) — เดิมเขียนแค่ "สัญลักษณ์" อ่านแล้วไม่รู้ว่าหมายถึงอะไร
  function openSub(res) {
    if (!res) return "คิดไม้จริงไม่สำเร็จ";
    if (!res.open.length) return "ไม่มีไม้ค้าง";
    var names = [];
    for (var i = 0; i < res.open.length && i < 3; i++) names.push(res.open[i].symbol);
    return names.join(" · ") + (res.open.length > 3 ? " และอีก " + (res.open.length - 3) : "");
  }
  function factTiles(known) {
    var D = E();
    var realizedLabel = "กำไร/ขาดทุนที่รับรู้";
    if (!known) {
      return tile("—", "ตามกฎ") + tile("—", "คาดถูก") + tile("—", "ไม้เปิดอยู่") + tile("—", realizedLabel);
    }
    var per = 0, judgedC = 0;
    each(D.liveEntries(state.doc), function (e) {
      var c = obj(e.verdict).compliance;
      if (c === "per-rule") { per++; judgedC++; } else if (c === "against") judgedC++;
    });
    var out = tile(judgedC ? per + " / " + judgedC : "—", "ตามกฎ", "",
      judgedC ? "จากการซื้อ/ขายที่ตัดสินได้" : "ยังไม่มีการซื้อ/ขายที่ตัดสินได้");
    var st = statsNow();
    var bp = st ? st.byPrediction : null;
    var predSub = state.outcomesLoading ? "กำลังดึงราคา… ตัวเลขอาจยังไม่ครบ"
      : (bp && bp.judged ? "จากที่ครบกำหนด · ทรงตัว (" + flatNote() + ") นับในตัวหาร" : "ยังไม่มีบันทึกที่ครบกำหนด");
    out += tile(bp && bp.judged ? bp.right + " / " + bp.judged : "—", "คาดถูก", "", predSub);
    var res = fifoNow();
    out += tile(res ? String(res.open.length) : "—", "ไม้เปิดอยู่", "", openSub(res));
    if (!res) return out + tile("—", realizedLabel);
    var ccys = [], k, sold = {};
    for (k in res.totals) if (Object.prototype.hasOwnProperty.call(res.totals, k)) ccys.push(k);
    ccys.sort();
    each(res.realized, function (r) { if (r && r.currency) sold[r.currency] = 1; });
    if (!ccys.length) return out + tile("—", realizedLabel, "", "ยังไม่มีไม้จริง");
    each(ccys, function (c) {
      out += sold[c]
        ? moneyTile(res.totals[c].realized, c, realizedLabel + " · " + c, "ไม่แปลงสกุล")
        : tile("—", realizedLabel + " · " + c, "", "ยังไม่มีไม้ขาย");
    });
    return out;
  }

  // ขนาดเอกสาร (ไบต์ UTF-8 แบบเดียวกับเซิร์ฟเวอร์) — คิดใหม่เมื่อ doc เปลี่ยนตัวเท่านั้น (doc ใหญ่ได้ถึงเกือบ 1 MB)
  var bytesMemo = { doc: null, n: 0 };
  function docUsage() {
    var D = E();
    if (!state.doc) return null;
    if (bytesMemo.doc !== state.doc) { bytesMemo.doc = state.doc; bytesMemo.n = D.docBytes(state.doc); }
    var max = D.MAX_DOC_BYTES;
    if (!(max > 0)) return null;
    return { bytes: bytesMemo.n, max: max, pct: Math.floor(bytesMemo.n * 100 / max), warn: bytesMemo.n >= DOC_WARN_RATIO * max };
  }
  function sizeAlert() {
    var u = docUsage();
    if (!u || !u.warn) return "";
    var full = u.bytes > u.max;
    return '<div class="dj-alert ' + (full ? "is-bad" : "is-warn") + '" role="status"><div class="dj-alert-text">' +
      "<strong>พื้นที่บันทึกใช้ไปแล้ว " + esc(u.pct) + "%</strong>" +
      "<span>" + (full
        ? "เกินที่เซิร์ฟเวอร์รับแล้ว — บันทึกใหม่จะส่งไม่ได้ ส่งออกไฟล์สำรองไว้ก่อน (ส่วน “วิธีคิด” ด้านล่าง)"
        : "เซิร์ฟเวอร์รับได้ไม่เกิน " + esc(fmtNum(u.max / 1000, 0)) + " KB — ส่งออกไฟล์สำรองไว้ก่อน (ส่วน “วิธีคิด” ด้านล่าง)") +
      "</span></div></div>";
  }

  // ---------------- บันทึกทั้งหมด: ไทม์ไลน์ ใหม่ → เก่า (สเปก §7 ข้อ 4) ----------------
  // ทุกอย่างบนการ์ดมาจากสิ่งที่แช่แข็งไว้ตอนบันทึก + outcomes() ของเอนจิน — หน้าไม่ตัดสินเอง
  // ช่องผลจริงอ่านจาก H.status / H.pct เท่านั้น: pending = รอ · no-data = — · scored = pct
  var SELF_VERDICT_VIEW = {
    right: { cls: "is-good", text: "ตัดสินใจถูก" },
    wrong: { cls: "is-bad", text: "ตัดสินใจผิด" },
    mixed: { cls: "is-muted", text: "ก้ำกึ่ง" }
  };
  var PRED_VIEW = {
    right: { cls: "is-good", text: "คาดถูก" },
    wrong: { cls: "is-bad", text: "คาดผิด" },
    flat: { cls: "is-muted", text: "ทรงตัว" }
  };
  var COMPLIANCE_KEYS = ["per-rule", "against", "unknown", "n/a"];

  function obj(x) { return x && typeof x === "object" && !Array.isArray(x) ? x : {}; }
  function arr(x) { return Array.isArray(x) ? x : []; }
  function thaiOf(list, key) { var f = findKey(list, key); return f ? f.thai : ""; }
  function isNum(n) { return typeof n === "number" && isFinite(n); }
  // "ขยับไม่เกิน ±x%" — x อ่านจาก FLAT_BAND_PCT ของเอนจิน
  function flatNote() { return "ขยับไม่เกิน ±" + pctText(E().FLAT_BAND_PCT); }
  function signedMoney(n, currency) {
    var sign = n > 0 ? "+" : (n < 0 ? "−" : "");
    return sign + (currency === "THB" ? "฿" : "$") + fmtNum(Math.abs(n), 2);
  }

  // เรียงแบบเดียวกับเอนจิน: วันที่ใหม่ก่อน → createdAt ใหม่ก่อน → id (ลำดับนิ่งทุกเครื่อง)
  function entryCmp(a, b) {
    var ad = String(a.date || ""), bd = String(b.date || "");
    if (ad !== bd) return ad < bd ? 1 : -1;
    var ac = String(a.createdAt || ""), bc = String(b.createdAt || "");
    if (ac !== bc) return ac < bc ? 1 : -1;
    var ai = String(a.id), bi = String(b.id);
    return ai < bi ? -1 : (ai > bi ? 1 : 0);
  }
  function matchesFilters(e) {
    var D = E(), f = state.filters;
    if (f.symbol && D.canonicalSymbol(e.symbol) !== f.symbol) return false;
    if (f.feeling && arr(obj(e.context).feelings).indexOf(f.feeling) < 0) return false;
    if (f.compliance && obj(e.verdict).compliance !== f.compliance) return false;
    if (f.action && obj(e.action).kind !== f.action) return false;
    return true;
  }
  function anyFilter() {
    for (var i = 0; i < LOG_FILTER_KEYS.length; i++) if (state.filters[LOG_FILTER_KEYS[i]]) return true;
    return false;
  }

  function filterSelect(key, label, options) {
    var cur = state.filters[key] || "";
    var known = false;
    each(options, function (o) { if (o.value === cur) known = true; });
    if (cur && !known) options = options.concat([{ value: cur, label: cur }]);   // ค่าที่เลือกค้างไว้ต้องยังเห็น
    var h = '<div class="dj-field"><label class="dj-field-l" for="djFilter_' + key + '">' + esc(label) + "</label>" +
      '<select id="djFilter_' + key + '" class="dj-select" data-dj-filter="' + key + '">' +
      '<option value=""' + (cur === "" ? " selected" : "") + ">ทั้งหมด</option>";
    each(options, function (o) {
      h += '<option value="' + esc(o.value) + '"' + (o.value === cur ? " selected" : "") + ">" + esc(o.label) + "</option>";
    });
    return h + "</select></div>";
  }
  function renderFilters(all) {
    var D = E();
    var seen = {}, symOpts = [], syms = [];
    each(all, function (e) {
      var s = D.canonicalSymbol(e.symbol);
      if (s && !seen[s]) { seen[s] = 1; syms.push(s); }
    });
    syms.sort();
    each(syms, function (s) { symOpts.push({ value: s, label: s }); });
    var feelOpts = [], actOpts = [], compOpts = [];
    each(D.FEELINGS, function (x) { feelOpts.push({ value: x.key, label: x.thai }); });
    each(D.ACTIONS, function (x) { actOpts.push({ value: x.key, label: x.thai }); });
    each(COMPLIANCE_KEYS, function (k) { compOpts.push({ value: k, label: VERDICT_VIEW[k].text }); });
    return '<div class="dj-filters">' +
      filterSelect("symbol", "สัญลักษณ์", symOpts) +
      filterSelect("feeling", "อารมณ์", feelOpts) +
      filterSelect("compliance", "ตามกฎ / แหกกฎ", compOpts) +
      filterSelect("action", "ทำอะไร", actOpts) +
      (anyFilter() ? '<button type="button" class="dj-btn" data-dj-filter-clear="1">ล้างตัวกรอง</button>' : "") +
      "</div>";
  }

  // ชิป "กฎบอกว่า" จาก rules ที่แช่แข็ง · สีตามคำตัดสินที่แช่แข็ง: สนับสนุนสิ่งที่ทำ = เขียว · ค้าน = แดง · อื่น ๆ = เทา
  function logRuleChips(rules, verdict) {
    var sup = arr(verdict.supports), opp = arr(verdict.opposes);
    function chip(rid, text) {
      var cls = sup.indexOf(rid) >= 0 ? "is-good" : (opp.indexOf(rid) >= 0 ? "is-bad" : "is-muted");
      return '<span class="dj-rchip ' + cls + '">' + esc(text) + "</span>";
    }
    var r1 = obj(rules.r1), r2 = obj(rules.r2), r3 = obj(rules.r3), tb = obj(r2.touchBounce);
    var t1 = r1.state === "bull" ? "กฎ 1 EMA ขาขึ้น" : (r1.state === "bear" ? "กฎ 1 EMA ขาลง" :
      (r1.state === "flat" ? "กฎ 1 EMA เท่ากัน" : "กฎ 1 ข้อมูลไม่พอ"));
    var t2;
    if (r2.state === "above" || r2.state === "below" || r2.state === "at") {
      t2 = "กฎ 2 " + (r2.state === "above" ? "เหนือ" : (r2.state === "below" ? "ใต้" : "ที่")) + " SMA200";
      if (r2.breakConfirmed === true) t2 += " · หลุดยืนยัน";
      if (r2.reclaimHeld === true) t2 += " · ยืนได้";
      if (tb.met === true) t2 += " · แตะหรือเข้าใกล้แล้วเด้ง";
    } else t2 = "กฎ 2 ข้อมูลไม่พอ";
    var t3 = isNum(r3.dd1yPct) ? "กฎ 3 " + fmtPct(r3.dd1yPct, 1) + " จากจุดสูงสุด 1 ปี" : "กฎ 3 ข้อมูลไม่พอ";
    return chip("r1", t1) + chip("r2", t2) + chip("r3", t3);
  }

  function horizonCells(o, own) {
    var D = E();
    var hz = obj(o.horizons);
    var lim = D.FLAT_BAND_PCT + D.EPS_PCT;
    var out = "";
    each(D.HORIZONS, function (h) {
      var key = String(h);
      var H = obj(hz[key]);
      var isOwn = key === own;
      var val = "—", vcls = "", sub = "";   // sub เป็น HTML ที่ esc แล้ว
      // วันที่ห้ามตัดกลางคำ — จอมือถือช่องแคบ เคยขึ้น "ครบ 2026-10-" แล้วขึ้นบรรทัดใหม่ "31"
      function nw(s) { return '<span class="dj-nw">' + esc(s) + "</span>"; }
      if (H.status === "pending") {
        val = "รอ";
        vcls = " is-wait";
        sub = H.target ? "ครบ " + nw(H.target) : "";
      } else if (H.status === "scored" && isNum(H.pct)) {
        val = fmtPct(H.pct, 1);
        vcls = Math.abs(H.pct) <= lim ? "" : (H.pct > 0 ? " dj-up" : " dj-down");
        sub = (isNum(H.close) ? "ปิด " + nw(fmtNum(H.close, 2)) : "") + (H.date ? (isNum(H.close) ? " · " : "") + nw(H.date) : "");
      } else if (H.status === "no-data") {
        sub = "ไม่มีราคา";
      }
      out += '<div class="dj-hz' + (isOwn ? " is-due" : "") + '" data-hz="' + esc(key) + '">' +
        '<span class="dj-hz-k">+' + esc(key) + " วัน" + (isOwn ? ' <span class="dj-hz-own">ช่วงที่คาด</span>' : "") + "</span>" +
        '<span class="dj-hz-v' + vcls + '">' + esc(val) + "</span>" +
        (sub ? '<span class="dj-hz-s">' + sub + "</span>" : "") + "</div>";
    });
    return '<div class="dj-hzs">' + out + "</div>";
  }

  // ผลที่ช่วงของตัวเอง: คาดถูก/ผิด/ทรงตัว + ผลของการซื้อ/ขาย (ค่าจาก outcomes ของเอนจิน)
  function ownResult(o, view, act) {
    var D = E();
    var own = view.horizonDays;
    if (!isNum(own)) return "";
    var bits = '<span class="dj-out-k">ที่ ' + esc(horizonLabel(own)) + "</span>";
    var pr = o.predicted;
    var dirTh = thaiOf(D.DIRECTIONS, view.direction);
    if (PRED_VIEW[pr]) {
      bits += pill(PRED_VIEW[pr].cls, PRED_VIEW[pr].text) + '<span class="dj-muted">' + esc("คาดว่า" + dirTh) +
        (pr === "flat" ? esc(" · " + flatNote()) : "") + "</span>";
    } else if (pr === "pending") {
      bits += '<span class="dj-muted">คาดถูกหรือผิด: ยังไม่ถึงกำหนด' + (o.dueDate ? " (" + esc(o.dueDate) + ")" : "") + "</span>";
    } else if (pr === "no-data") {
      bits += '<span class="dj-muted">คาดถูกหรือผิด: ไม่มีราคา ตัดสินไม่ได้</span>';
    } else {
      bits += '<span class="dj-muted">ไม่ได้คาดทิศทาง — ไม่ตัดสินถูกผิด</span>';
    }
    var kind = act.kind, ar = o.actionResult;
    if ((kind === "buy" || kind === "sell") && (ar === "good" || ar === "bad" || ar === "flat")) {
      var detail;
      if (ar === "flat") detail = flatNote();
      else if (kind === "buy") detail = ar === "good" ? "ซื้อแล้วราคาขึ้น" : "ซื้อแล้วราคาลง";
      else detail = ar === "good" ? "ขายแล้วราคาลง" : "ขายแล้วราคาขึ้น";
      bits += '<span class="dj-out-sep" aria-hidden="true">·</span><span class="dj-out-k">ผลของการ' + esc(thaiOf(D.ACTIONS, kind)) + "</span>" +
        pill(ar === "good" ? "is-good" : (ar === "bad" ? "is-bad" : "is-muted"), ar === "good" ? "ดี" : (ar === "bad" ? "ไม่ดี" : "ทรงตัว")) +
        '<span class="dj-muted">' + esc(detail) + "</span>";
    }
    return '<div class="dj-out-result">' + bits + "</div>";
  }

  function outcomeBlock(e) {
    var D = E();
    var view = obj(e.view), act = obj(e.action), rules = obj(e.rules);
    var sym = D.canonicalSymbol(e.symbol);
    var o = state.outcomesById[e.id];
    var err = sym ? state.priceErrBySymbol[sym] : null;
    var retry = '<button type="button" class="dj-btn" data-dj-outcomes-retry="1">ลองดึงราคาอีกครั้ง</button>';
    if (!o || typeof o !== "object") {
      if (err) {
        return '<div class="dj-out"><div class="dj-out-msg is-bad"><span><strong>ดึงราคาไม่สำเร็จ</strong> · ' + esc(err) +
          " — ผลจริงยังไม่รู้</span>" + retry + "</div></div>";
      }
      if (state.outcomesLoading) return '<div class="dj-out"><p class="dj-out-msg" role="status">กำลังดึงราคาเพื่อดูผลจริง…</p></div>';
      return '<div class="dj-out"><div class="dj-out-msg"><span>ยังไม่ได้ดึงราคา — ผลจริงยังไม่รู้</span>' + retry + "</div></div>";
    }
    var ref = isNum(o.refClose)
      ? "ราคาตั้งต้น " + fmtNum(o.refClose, 2) + (rules.asOfBar ? " (" + rules.asOfBar + ")" : "")
      : "ไม่มีราคาตั้งต้น — ผลจริงคิดไม่ได้";
    var head = '<div class="dj-out-head"><span>' + esc(ref) + "</span>" +
      (o.lastClosedBar ? "<span>ราคาถึง " + esc(o.lastClosedBar) + "</span>" : "") + "</div>";
    var notes = "";
    if (!o.lastClosedBar) {
      notes += '<p class="dj-warn">ยังไม่มีราคาปิดของ ' + esc(sym || "—") + " จากแหล่งข้อมูล — ช่วงที่ครบกำหนดแล้วจะแสดง “—” จนกว่าจะมีราคา</p>";
    }
    if (o.priceBasisChanged === true) {
      notes += '<p class="dj-warn">ราคาย้อนหลังถูกปรับ (เช่น แตกพาร์) เทียบจากชุดราคาปัจจุบัน</p>';
    } else if (o.refSource === "frozen" && o.lastClosedBar) {
      notes += '<p class="dj-warn">ไม่พบราคาวัน ' + esc(rules.asOfBar || "—") + " ในชุดราคาปัจจุบัน — เทียบกับราคาที่บันทึกไว้ตอนนั้น</p>";
    }
    if (err) notes += '<p class="dj-warn">ดึงราคาใหม่ไม่สำเร็จ (' + esc(err) + ") — แสดงผลจากราคาที่ดึงได้ก่อนหน้า</p>";
    var own = isNum(view.horizonDays) ? String(view.horizonDays) : "";
    return '<div class="dj-out">' + head + horizonCells(o, own) + ownResult(o, view, act) + notes + "</div>";
  }

  // ขายแล้วซื้อกลับ (สเปก §5.4 ท้าย) — ราคาต่อหน่วยของไม้จริง (ราคาตลาด ไม่ใช่ยอดเงินส่วนตัว จึงไม่ซ่อนตอนล็อก)
  function buyBackLine(e, trades) {
    var D = E();
    var bb = null;
    try { bb = D.buyBack(e, trades); } catch (err) { bb = null; }
    if (!bb || !isNum(bb.diffPerUnit)) return "";
    var cur = null;
    each(trades, function (x) { if (x && x.id === bb.sellTradeId && (x.currency === "THB" || x.currency === "USD")) cur = x.currency; });
    if (!cur) cur = D.currencyOf(e.symbol);
    var d = bb.diffPerUnit;
    if (d === 0) return '<p class="dj-buyback is-muted">ซื้อกลับราคาเดียวกับที่ขาย</p>';
    var word = d > 0 ? "ซื้อกลับแพงกว่าที่ขาย" : "ซื้อกลับถูกกว่าที่ขาย";
    var pctT = isNum(bb.diffPct) ? fmtPct(bb.diffPct, 1) + " " : "";
    return '<p class="dj-buyback ' + (d > 0 ? "is-bad" : "is-good") + '">' + esc(word + " " + pctT + "(" + signedMoney(d, cur) + " ต่อหน่วย)") + "</p>";
  }

  function lessonBlock(review) {
    var sv = SELF_VERDICT_VIEW[review.selfVerdict];
    var lesson = typeof review.lesson === "string" ? trimStr(review.lesson) : "";
    if (!sv && !lesson) return "";
    return '<div class="dj-lesson"><div class="dj-lesson-head"><span class="dj-entry-k">บทเรียน' +
      (review.reviewedAt ? " · ทบทวนแล้ว" : "") + "</span>" + (sv ? pill(sv.cls, sv.text) : "") + "</div>" +
      (lesson ? '<p class="dj-lesson-text">' + esc(lesson) + "</p>" : "") + "</div>";
  }

  function deleteControls(e, sym) {
    var id = esc(e.id);
    if (state.confirmDelId === e.id) {
      return '<div class="dj-confirm" role="alert"><span>ลบบันทึกนี้? จะหายจากทุกเครื่องและกู้คืนไม่ได้ · ไม้จริงที่ผูกไว้ยังอยู่ในส่วนไม้จริง</span>' +
        '<div class="dj-confirm-btns"><button type="button" class="dj-btn" data-dj-del-cancel="' + id + '">ยกเลิก</button>' +
        '<button type="button" class="dj-btn dj-btn-danger" data-dj-del-confirm="' + id + '">ยืนยันลบ</button></div></div>';
    }
    return '<button type="button" class="dj-btn dj-btn-quiet" data-dj-del="' + id + '" aria-label="' +
      esc("ลบบันทึก " + sym + " " + (e.date || "")) + '">ลบ</button>';
  }

  // ส่วนที่การ์ดไทม์ไลน์และการ์ดทบทวนใช้ร่วมกัน (ทุกค่ามาจากสิ่งที่แช่แข็งไว้ตอนบันทึก)
  function entryHeadHtml(e, extra) {
    var D = E();
    var act = obj(e.action), verdict = obj(e.verdict);
    var vv = VERDICT_VIEW[verdict.compliance] || VERDICT_VIEW["n/a"];
    var sym = D.canonicalSymbol(e.symbol) || String(e.symbol || "");
    return '<div class="dj-entry-head">' +
      '<span class="dj-entry-date">' + esc(e.date) + "</span>" +
      '<strong class="dj-entry-sym">' + esc(sym) + "</strong>" +
      '<span class="dj-act">' + esc(thaiOf(D.ACTIONS, act.kind) || "ไม่ระบุ") + "</span>" +
      (extra || "") + pill(vv.cls, vv.text) + "</div>";
  }
  function rulesSayHtml(rules, verdict) {
    return '<div class="dj-entry-rules"><span class="dj-entry-k">กฎบอกว่า:</span>' + logRuleChips(rules, verdict) +
      (rules.asOfBar ? '<span class="dj-muted">จากราคาปิด ' + esc(rules.asOfBar) + "</span>" : "") + "</div>" +
      (verdict.why ? '<p class="dj-entry-why">' + esc(verdict.why) + "</p>" : "");
  }
  // สิ่งที่คิดตอนนั้น: คาดว่า · เห็นอะไร · รู้สึก · แผน
  function thoughtHtml(ctx, view, act) {
    var D = E();
    var hd = isNum(view.horizonDays) ? horizonLabel(view.horizonDays) : "—";
    var viewTxt = (view.direction === "up" || view.direction === "down")
      ? "คาดว่าราคาจะ<b>" + esc(thaiOf(D.DIRECTIONS, view.direction)) + "</b> ภายใน " + esc(hd)
      : "คาดว่า: ไม่แน่ใจทิศทาง · ดูผลที่ " + esc(hd);
    var feel = "";
    each(D.FEELINGS, function (x) {
      if (arr(ctx.feelings).indexOf(x.key) >= 0) feel += '<span class="dj-tag">' + esc(x.thai) + "</span>";
    });
    var evText = typeof ctx.event === "string" ? trimStr(ctx.event) : "";
    var plan = typeof act.plan === "string" ? trimStr(act.plan) : "";
    return '<p class="dj-entry-view">' + viewTxt + "</p>" +
      (evText ? '<p class="dj-entry-event">' + esc(evText) + "</p>" : "") +
      (feel ? '<div class="dj-tags" aria-label="ตอนนั้นรู้สึก">' + feel + "</div>" : "") +
      (plan ? '<p class="dj-entry-plan"><span class="dj-entry-k">แผน:</span> ' + esc(plan) + "</p>" : "");
  }

  function entryCard(e, trades) {
    var D = E();
    var ctx = obj(e.context), view = obj(e.view), act = obj(e.action), rules = obj(e.rules), verdict = obj(e.verdict);
    var sym = D.canonicalSymbol(e.symbol) || String(e.symbol || "");
    return '<article class="dj-card dj-entry" data-dj-entry="' + esc(e.id) + '">' +
      entryHeadHtml(e, "") + rulesSayHtml(rules, verdict) +
      thoughtHtml(ctx, view, act) +
      outcomeBlock(e) +
      buyBackLine(e, trades) +
      lessonBlock(obj(e.review)) +
      '<div class="dj-entry-foot">' + deleteControls(e, sym) + "</div>" +
      "</article>";
  }

  function renderLog() {
    var D = E();
    var title = "บันทึกทั้งหมด";
    if (!state.doc) {
      var why = state.loading ? "กำลังโหลดบันทึก…" : "ยังโหลดบันทึกจากเซิร์ฟเวอร์ไม่ได้ — ดูสถานะที่ “ภาพรวม” ด้านบน";
      return block("djLog", title, "", '<p class="dj-placeholder">' + esc(why) + "</p>");
    }
    var msg = state.logMsg ? '<div class="dj-form-msg dj-log-msg" role="alert">' + esc(state.logMsg) + "</div>" : "";
    var all = D.liveEntries(state.doc).slice().sort(entryCmp);
    if (!all.length) {
      return block("djLog", title, "", msg +
        '<p class="dj-placeholder">ยังไม่มีบันทึก — เริ่มจาก “บันทึกใหม่” ด้านบน ระบบจะเติมราคาจริงให้เมื่อถึงกำหนด</p>');
    }
    var shown = [];
    each(all, function (e) { if (matchesFilters(e)) shown.push(e); });
    var count = shown.length === all.length ? all.length + " รายการ · ใหม่ → เก่า" : "แสดง " + shown.length + " จาก " + all.length + " รายการ";
    var body = renderFilters(all) + msg;
    if (!shown.length) {
      body += '<p class="dj-placeholder">ไม่มีบันทึกที่ตรงกับตัวกรอง — กด “ล้างตัวกรอง” เพื่อดูทั้งหมด</p>';
    } else {
      var trades = D.liveTrades(state.doc);
      body += '<div class="dj-cards dj-log">';
      each(shown, function (e) { body += entryCard(e, trades); });
      body += "</div>";
    }
    return block("djLog", title, '<span class="dj-log-count">' + esc(count) + "</span>", body);
  }

  // ---------------- ถึงกำหนดทบทวน: การ์ดละ 1 บันทึก (สเปก §7 ข้อ 2) ----------------
  // ราคาตอนนั้น → ที่กำหนด มาจาก outcomes() (refClose · H.close · H.pct ของช่วงตัวเอง) — หน้าไม่คิด % เอง
  // ช่วงของตัวเองอ่านจาก H.status เท่านั้น: scored = มีตัวเลข · อื่น ๆ (no-data) = "—"
  function closeOn(sym, ymd) {
    var p = state.pricesBySymbol[sym], c = null;
    if (!p || !ymd) return null;
    each(p.bars, function (b) { if (b && b.date === ymd && isNum(b.close)) c = b.close; });
    return c;
  }
  function reviewPriceHtml(e, o, H) {
    var D = E();
    var rules = obj(e.rules);
    var sym = D.canonicalSymbol(e.symbol);
    var main = "ราคาตอนนั้น <b>" + esc(isNum(o.refClose) ? fmtNum(o.refClose, 2) : "—") + "</b> → ที่กำหนด ";
    var scored = H.status === "scored" && isNum(H.pct) && isNum(H.close);
    if (scored) {
      var lim = D.FLAT_BAND_PCT + D.EPS_PCT;
      var cls = Math.abs(H.pct) <= lim ? "" : (H.pct > 0 ? "dj-up" : "dj-down");
      main += "<b>" + esc(fmtNum(H.close, 2)) + "</b> <span" + (cls ? ' class="' + cls + '"' : "") + ">(" + esc(fmtPct(H.pct, 1)) + ")</span>";
    } else {
      main += '<b>—</b> <span class="dj-muted">ไม่มีราคาของช่วงที่ครบกำหนด</span>';
    }
    var sub = [];
    var from = rules.asOfBar || "—";
    sub.push("ราคาปิด " + from + " → " + (scored && H.date ? H.date : (H.target || "—")));
    if (o.lastClosedBar && !(scored && H.date === o.lastClosedBar)) {
      var last = sym ? closeOn(sym, o.lastClosedBar) : null;
      if (last !== null) sub.push("ล่าสุด " + fmtNum(last, 2) + " (" + o.lastClosedBar + ")");
    }
    return '<div class="dj-rv-price"><span class="dj-rv-price-main">' + main + "</span>" +
      '<span class="dj-rv-price-sub">' + esc(sub.join(" · ")) + "</span></div>";
  }

  function reviewCardHtml(e, o) {
    var D = E();
    var id = esc(e.id);
    var ctx = obj(e.context), view = obj(e.view), act = obj(e.action), rules = obj(e.rules), verdict = obj(e.verdict);
    var H = obj(obj(o.horizons)[String(view.horizonDays)]);
    var d = reviewDraftOf(e.id);
    var due = "ครบ " + horizonLabel(view.horizonDays) + (o.dueDate ? " · " + o.dueDate : "");
    var notes = "";
    if (o.priceBasisChanged === true) {
      notes += '<p class="dj-warn">ราคาย้อนหลังถูกปรับ (เช่น แตกพาร์) เทียบจากชุดราคาปัจจุบัน</p>';
    } else if (o.refSource === "frozen" && o.lastClosedBar) {
      notes += '<p class="dj-warn">ไม่พบราคาวัน ' + esc(rules.asOfBar || "—") + " ในชุดราคาปัจจุบัน — เทียบกับราคาที่บันทึกไว้ตอนนั้น</p>";
    }
    var btns = "";
    each(REVIEW_VERDICTS, function (k) {
      var sv = SELF_VERDICT_VIEW[k], on = d.selfVerdict === k;
      btns += '<button type="button" class="dj-chip dj-rv-v ' + sv.cls + (on ? " is-on" : "") + '" aria-pressed="' + (on ? "true" : "false") +
        '" id="' + esc("djRv-" + e.id + "-" + k) + '" data-dj-review-verdict="' + id + ":" + k + '">' + esc(sv.text) + "</button>";
    });
    var msg = state.reviewMsg && state.reviewMsg.id === e.id
      ? '<div class="dj-form-msg" role="alert">' + esc(state.reviewMsg.text) + "</div>"
      : "";
    return '<article class="dj-card dj-rv" data-dj-review="' + id + '">' +
      entryHeadHtml(e, '<span class="dj-rv-due">' + esc(due) + "</span>") +
      '<div class="dj-rv-then"><span class="dj-entry-k">ตอนนั้น</span>' + thoughtHtml(ctx, view, act) + "</div>" +
      rulesSayHtml(rules, verdict) +
      reviewPriceHtml(e, o, H) +
      ownResult(o, view, act) +
      notes +
      '<div class="dj-rv-ask"><span class="dj-field-l" id="' + esc("djRvAsk-" + e.id) + '">มองย้อนกลับไป การตัดสินใจครั้งนี้</span>' +
      '<div class="dj-rv-verdicts" role="group" aria-labelledby="' + esc("djRvAsk-" + e.id) + '">' + btns + "</div></div>" +
      '<div class="dj-field"><label class="dj-field-l" for="' + esc(lessonId(e.id)) + '">บทเรียน <span class="dj-field-h">(ไม่บังคับ)</span></label>' +
      '<textarea id="' + esc(lessonId(e.id)) + '" class="dj-textarea" rows="3" placeholder="เช่น ตอนนั้นกลัวข่าว ทั้งที่กฎยังบอกว่าขาขึ้น">' +
      esc(d.lesson) + "</textarea></div>" +
      msg +
      '<div class="dj-actions dj-rv-save"><button type="button" class="dj-btn dj-btn-primary" data-dj-review-save="' + id + '"' +
      (state.saving ? " disabled" : "") + ">บันทึกการทบทวน</button>" +
      '<span class="dj-field-h">บันทึกแล้วออกจากคิวนี้ บทเรียนไปอยู่ที่การ์ดใน “บันทึกทั้งหมด”</span></div>' +
      "</article>";
  }

  // ดึงราคาไม่สำเร็จ → บันทึกที่ครบกำหนดตามปฏิทินของสัญลักษณ์นั้นขึ้นคิวไม่ได้ (ไม่มีผลจริง) — บอกตรง ๆ แทนการเงียบ
  function reviewPriceWarn() {
    var D = E(), syms = [], seen = {};
    var today = todayYmd();
    each(D.liveEntries(state.doc), function (e) {
      var sym = D.canonicalSymbol(e.symbol);
      if (!sym || seen[sym] || !state.priceErrBySymbol[sym]) return;
      if (obj(e.review).reviewedAt || state.outcomesById[e.id]) return;
      var dueDay = isNum(obj(e.view).horizonDays) ? D.ymdAdd(e.date, obj(e.view).horizonDays) : null;
      if (!dueDay || dueDay > today) return;
      seen[sym] = 1;
      syms.push(sym);
    });
    if (!syms.length) return "";
    return '<div class="dj-out-msg is-bad dj-rv-warn"><span><strong>ดึงราคาไม่สำเร็จ</strong> · ' + esc(syms.join(", ")) +
      " — บันทึกที่ครบกำหนดของสัญลักษณ์นี้ยังขึ้นที่นี่ไม่ได้ จนกว่าจะได้ราคา</span>" +
      '<button type="button" class="dj-btn" data-dj-outcomes-retry="1">ลองดึงราคาอีกครั้ง</button></div>';
  }

  function lastReviewNote() {
    var lr = state.lastReview, s = state.syncState;
    if (!lr || (s !== "saving" && s !== "saved" && s !== "draft" && s !== "error")) return "";
    return '<div class="dj-rv-done">' + syncPill() + '<span class="dj-sync-note">' + esc("ทบทวน " + lr.symbol + " · " + lr.date) + "</span></div>";
  }

  function renderReview() {
    var title = "ถึงกำหนดทบทวน";
    renderedReviewIds = [];
    if (!state.doc) return block("djReview", title, "", "", "dj-hidden");
    var due = dueList();
    var cards = "";
    each(due, function (x) {
      renderedReviewIds.push(x.e.id);
      cards += reviewCardHtml(x.e, x.o);
    });
    var warn = reviewPriceWarn();
    var note = lastReviewNote();
    // ไม่มีอะไรครบกำหนด และไม่มีอะไรต้องบอก → ซ่อนทั้งส่วน (หัวข้อยังอยู่ใน DOM)
    if (!due.length && !warn && !note) return block("djReview", title, "", "", "dj-hidden");
    var sub = due.length ? '<span class="dj-rv-count">' + due.length + " รายการ · ผลจริงมาถึงแล้ว</span>" : "";
    return block("djReview", title, sub, note + warn + (cards ? '<div class="dj-cards">' + cards + "</div>" : ""));
  }
  // ---------------- ไม้จริง (สเปก §5.5 · §7 ข้อ 5) ----------------
  // ตัวเลขทุกตัว (จำนวนที่ถือ · ต้นทุน · กำไรที่รับรู้ · กำไรลอยตัว · ยอดรวมแยกสกุล · คำเตือน) มาจาก fifo() ของเอนจิน — หน้าไม่คิดเอง
  // ราคาล่าสุด = แท่งสุดท้ายที่ดึงไว้ใน _state.pricesBySymbol พร้อมบอกว่าแท่งนั้นปิดตลาดแล้วหรือยัง (closedBarCutoff ของเอนจิน)
  // Privacy Lock (สเปก §7): จำนวนหน่วย · มูลค่าทุน · ค่าธรรมเนียม · กำไร/ขาดทุน (เงินและ %) เป็น XXX และไม่ลงสี (สีบอกได้ว่ากำไรหรือขาดทุน)
  //   ราคาตลาด (ราคาปิดล่าสุด · ราคาไม้ต่อหน่วย · ต้นทุนเฉลี่ยต่อหน่วย) ยังเห็น · ไม่มีจำนวนเงินใน title/aria-label
  // ก่อนส่งทุกครั้ง: ตรวจค่าที่กรอก + itemProblems (กติกาเดียวกับเซิร์ฟเวอร์) ไม่ผ่าน = ไม่ส่ง และบอกเหตุผลที่ฟอร์ม
  var TRADE_PRICE_DAYS = 30;  // ไม้ที่ไม่มีบันทึกผูก: ดึงราคาย้อนหลังแค่พอได้ราคาปิดล่าสุด (ครอบวันหยุดยาว)
  var TRADE_FIELD_IDS = ["djTDate", "djTSymbol", "djTSide", "djTQty", "djTPrice", "djTFee", "djTCurrency", "djTNote", "djTEntry"];
  var TRADE_KEYS = ["date", "symbol", "side", "qty", "price", "fee", "currency", "note", "entryId"];
  var tradeFormFromState = false;   // true = state.tradeForm เพิ่งถูกตั้งจากโค้ด (เริ่มแก้/ล้างฟอร์ม) — render ครั้งถัดไปไม่อ่านค่าจาก DOM ทับ

  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function liveTradeById(id) {
    var D = E(), f = null;
    if (state.doc && typeof id === "string") each(D.liveTrades(state.doc), function (x) { if (!f && x.id === id) f = x; });
    return f;
  }
  function liveEntryById(id) {
    var D = E(), f = null;
    if (state.doc && typeof id === "string") each(D.liveEntries(state.doc), function (x) { if (!f && x.id === id) f = x; });
    return f;
  }

  // { [symbol]: { close, date, closed } } จากราคาที่ดึงไว้ · closed = แท่งนั้นปิดตลาดแล้ว (คิด cutoff ไม่ได้ = null)
  function lastCloses() {
    var D = E(), out = {}, now = nowBangkok(), k;
    for (k in state.pricesBySymbol) {
      if (!Object.prototype.hasOwnProperty.call(state.pricesBySymbol, k)) continue;
      var p = state.pricesBySymbol[k];
      if (!p || !Array.isArray(p.bars)) continue;
      var best = null;
      each(p.bars, function (b) {
        if (b && D.isYmd(b.date) && isNum(b.close) && b.close > 0 && (!best || b.date > best.date)) best = b;
      });
      if (!best) continue;
      var cutoff = D.closedBarCutoff(D.marketOf(k), now);
      out[k] = { close: best.close, date: best.date, closed: cutoff === null ? null : best.date <= cutoff };
    }
    return out;
  }

  // ---- รูปแบบตัวเลข ----
  function ccySign(c) { return c === "THB" ? "฿" : (c === "USD" ? "$" : ""); }
  function moneyDp(c) { return c === "THB" ? 0 : 2; }
  // เงิน: ฿1,234 · $1,234.56 · personal && ล็อกอยู่ → XXX
  function money(amount, currency, personal) {
    if (personal && state.locked) return "XXX";
    if (!isNum(amount)) return "—";
    var dp = moneyDp(currency);
    var neg = amount < 0 && Number(Math.abs(amount).toFixed(dp)) !== 0;
    return (neg ? "−" : "") + ccySign(currency) + fmtNum(Math.abs(amount), dp);
  }
  // กำไร/ขาดทุน: มีเครื่องหมายเสมอ (+$120.00 · −฿350)
  function moneySigned(amount, currency, personal) {
    if (personal && state.locked) return "XXX";
    if (!isNum(amount)) return "—";
    var dp = moneyDp(currency);
    var r = Number(Math.abs(amount).toFixed(dp));
    return (r === 0 ? "" : (amount > 0 ? "+" : "−")) + ccySign(currency) + fmtNum(Math.abs(amount), dp);
  }
  // ราคาต่อหน่วย (ราคาตลาด ไม่ซ่อน) · ต่ำกว่า 1 แสดง 4 ตำแหน่ง
  function unitPrice(n, currency) {
    if (!isNum(n)) return "—";
    return ccySign(currency) + fmtNum(n, n !== 0 && Math.abs(n) < 1 ? 4 : 2);
  }
  // จำนวนหน่วย: ทศนิยมได้ถึง 8 ตำแหน่ง ตัดศูนย์ท้าย (BTC 0.0123 ไม่ถูกปัด)
  function fmtQty(n) {
    if (!isNum(n)) return "—";
    var parts = Math.abs(n).toFixed(8).replace(/\.?0+$/, "").split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return (n < 0 ? "−" : "") + parts.join(".");
  }
  function personal(text) { return state.locked ? "XXX" : text; }
  // คลาสสีของกำไร/ขาดทุน — ล็อกอยู่ไม่ลงสี
  function pnlCls(n) {
    if (state.locked || !isNum(n) || n === 0) return "";
    return n > 0 ? " dj-up" : " dj-down";
  }

  // ---- ฟอร์ม: อ่าน/เขียนค่าจาก DOM ----
  function readTradeForm() {
    if (!field("djTSymbol")) return;
    var f = state.tradeForm;
    f.date = valOf("djTDate");
    f.symbol = valOf("djTSymbol");
    f.side = valOf("djTSide");
    f.qty = valOf("djTQty");
    f.price = valOf("djTPrice");
    f.fee = valOf("djTFee");
    f.currency = valOf("djTCurrency");
    f.note = valOf("djTNote");
    f.entryId = valOf("djTEntry");
  }
  function writeTradeFormToDom() {
    var f = state.tradeForm;
    function setV(id, v) { var el = field(id); if (el) el.value = v; }
    setV("djTDate", f.date || todayYmd());
    setV("djTSymbol", f.symbol);
    setV("djTSide", f.side);
    setV("djTQty", f.qty);
    setV("djTPrice", f.price);
    setV("djTFee", f.fee);
    setV("djTCurrency", f.currency);
    setV("djTNote", f.note);
    setV("djTEntry", f.entryId);
  }
  function resetTradeForm() {
    state.tradeForm = emptyTradeForm();
    state.tradeEditId = null;
    writeTradeFormToDom();
    tradeFormFromState = true;
  }

  function tradeRefuse(msg) {
    state.tradeMsg = msg;
    safeRender("ไม้จริงยังไม่ส่ง");
    return Promise.resolve(false);
  }

  // ไม้อื่นของสัญลักษณ์เดียวกันใช้สกุลอื่นอยู่แล้ว → คืนสกุลนั้น (fifo จะไม่นำไม้ใหม่มาคิด จึงไม่ให้บันทึกตั้งแต่แรก)
  function otherCurrency(sym, ccy, exceptId) {
    var D = E(), found = null;
    each(D.liveTrades(state.doc), function (x) {
      if (found || x.id === exceptId || D.canonicalSymbol(x.symbol) !== sym) return;
      var c = (x.currency === "THB" || x.currency === "USD") ? x.currency : D.currencyOf(sym);
      if (c !== ccy) found = c;
    });
    return found;
  }

  // ค่าที่กรอก (สตริงจากฟอร์มหรือตัวเลขจากโค้ด) → { fields } หรือ { error: ข้อความไทย }
  //   base = ไม้เดิมตอนแก้ (บันทึกที่ผูกไว้เดิมแล้วถูกลบไปทีหลัง ยังแก้ช่องอื่นได้)
  function buildTrade(input, base) {
    var D = E();
    var inp = obj(input);
    var bad = [];
    var sym = D.canonicalSymbol(typeof inp.symbol === "string" ? inp.symbol : "");
    var date = typeof inp.date === "string" ? trimStr(inp.date) : "";
    if (!sym) bad.push("สัญลักษณ์ต้องเป็นตัวอักษรภาษาอังกฤษ เช่น PTT.BK");
    if (!D.isYmd(date)) bad.push("วันที่ไม่ถูกต้อง");
    else if (date > todayYmd()) bad.push("วันที่อยู่ในอนาคต");
    if (inp.side !== "buy" && inp.side !== "sell") bad.push("เลือกว่าซื้อหรือขาย");
    var qty = numIn(inp.qty);
    var price = numIn(inp.price);
    var fee = (inp.fee == null || trimStr(inp.fee) === "") ? 0 : numIn(inp.fee);
    if (qty === null || !(qty > 0)) bad.push("จำนวนต้องมากกว่า 0");
    if (price === null || !(price > 0)) bad.push("ราคาต่อหน่วยต้องมากกว่า 0");
    if (fee === null || fee < 0) bad.push("ค่าธรรมเนียมต้องเป็นตัวเลขที่ไม่ติดลบ");
    var ccy = (inp.currency === "THB" || inp.currency === "USD") ? inp.currency : (sym ? D.currencyOf(sym) : "");
    var entryId = (typeof inp.entryId === "string" && inp.entryId !== "") ? inp.entryId : null;
    var keepOld = !!base && entryId === (base.entryId || null);
    if (entryId && !keepOld) {
      var en = liveEntryById(entryId);
      if (!en) bad.push("ไม่พบบันทึกที่จะผูก (อาจถูกลบไปแล้ว)");
      else if (sym && D.canonicalSymbol(en.symbol) !== sym) bad.push("บันทึกที่เลือกเป็นของ " + D.canonicalSymbol(en.symbol) + " ไม่ใช่ " + sym);
    }
    if (!bad.length) {
      var other = otherCurrency(sym, ccy, base ? base.id : null);
      if (other) bad.push(sym + " มีไม้ที่บันทึกเป็น " + other + " อยู่แล้ว — ไม้ของสัญลักษณ์เดียวกันต้องใช้สกุลเดียวกัน ไม่งั้นระบบไม่นำมาคิด");
    }
    if (bad.length) return { error: bad.join(" · ") };
    return {
      fields: {
        date: date, symbol: sym, side: inp.side, qty: qty, price: price, fee: fee, currency: ccy,
        note: typeof inp.note === "string" ? trimStr(inp.note) : "", entryId: entryId
      }
    };
  }

  // ผูก/ถอดไม้ออกจาก action.tradeIds ของบันทึก (แก้ได้ตามสเปก §5.1) → สำเนาที่ touch แล้ว หรือ null ถ้าไม่ต้องเปลี่ยน
  function relinkEntry(entryId, tradeId, add, stamp) {
    var en = liveEntryById(entryId);
    if (!en) return null;
    var copy = clone(en);
    var act = obj(copy.action);
    var had = arr(act.tradeIds).indexOf(tradeId) >= 0;
    if (had === add) return null;
    var ids = [];
    each(arr(act.tradeIds), function (x) { if (x !== tradeId) ids.push(x); });
    if (add) ids.push(tradeId);
    act.tradeIds = ids;
    copy.action = act;
    E().touch(copy, stamp);
    return copy;
  }

  // ตรวจตามกติกาเซิร์ฟเวอร์ → รวมเข้า doc → ส่ง (GET สด → merge → PUT) · ผลคือผลของการบันทึก
  function commitTrades(trades, entries, stamp, what, fromForm) {
    var D = E();
    var problems = [];
    each(trades.concat(entries), function (it) {
      each(D.itemProblems(it), function (code) {
        var th = PROBLEM_TH[code] || code;
        if (problems.indexOf(th) < 0) problems.push(th);
      });
    });
    if (problems.length) return tradeRefuse("ข้อมูลไม่ครบตามที่เซิร์ฟเวอร์รับ (" + problems.join(" · ") + ") — ยังไม่ได้ส่ง");
    var local = D.mergeDocs(state.doc || D.emptyDoc(), { v: D.VERSION, updatedAt: stamp, entries: entries, trades: trades });
    var bytes = D.docBytes(local);
    if (bytes > D.MAX_DOC_BYTES) {
      return tradeRefuse("พื้นที่บันทึกเต็ม (" + fmtNum(bytes / D.MAX_DOC_BYTES * 100, 0) + "% ของที่เซิร์ฟเวอร์รับ) — ยังไม่ได้ส่ง");
    }
    state.doc = local;
    state.tradeMsg = null;
    state.lastTrade = what;
    state.lastSave = null;
    state.lastReview = null;
    state.lastImport = null;
    if (fromForm) resetTradeForm();
    try { state.symbols = buildSymbols(); } catch (e) { /* รายการสัญลักษณ์เก่ายังใช้ได้ */ }
    return putDoc(local).then(afterDocChange);
  }

  function addTrade(input, fromForm) {
    var D = E();
    state.tradeMsg = null;
    if (state.saving) return tradeRefuse("กำลังบันทึกรายการก่อนหน้าอยู่ — รอสักครู่แล้วกดอีกครั้ง");
    var b = buildTrade(input, null);
    if (b.error) return tradeRefuse(b.error);
    var f = b.fields;
    var stamp = nowIso();
    var tr = {
      id: D.newId("t"), createdAt: stamp, updatedAt: stamp, deletedAt: null,
      date: f.date, symbol: f.symbol, side: f.side, qty: f.qty, price: f.price,
      currency: f.currency, fee: f.fee, note: f.note, entryId: f.entryId
    };
    var entries = [];
    var linked = f.entryId ? relinkEntry(f.entryId, tr.id, true, stamp) : null;
    if (linked) entries.push(linked);
    return commitTrades([tr], entries, stamp, { verb: "เพิ่มไม้", symbol: f.symbol, date: f.date }, fromForm);
  }

  // แก้ไม้ (ไม้พิมพ์ผิดได้ สเปก §5.1) · patch = ช่องที่จะเปลี่ยน ช่องที่ไม่ส่งมาใช้ค่าเดิม
  function updateTrade(id, patch, fromForm) {
    state.tradeMsg = null;
    if (state.saving) return tradeRefuse("กำลังบันทึกรายการก่อนหน้าอยู่ — รอสักครู่แล้วกดอีกครั้ง");
    var cur = liveTradeById(id);
    if (!cur) return tradeRefuse("ไม่พบไม้นี้ (อาจถูกลบไปแล้ว) — ไม่ได้ส่งอะไร");
    var p = obj(patch), input = {};
    each(TRADE_KEYS, function (k) { input[k] = Object.prototype.hasOwnProperty.call(p, k) ? p[k] : cur[k]; });
    var b = buildTrade(input, cur);
    if (b.error) return tradeRefuse(b.error);
    var stamp = nowIso();
    var copy = clone(cur);
    each(TRADE_KEYS, function (k) { copy[k] = b.fields[k]; });
    E().touch(copy, stamp);
    var entries = [];
    var oldLink = cur.entryId || null, newLink = b.fields.entryId;
    if (oldLink !== newLink) {
      var a = oldLink ? relinkEntry(oldLink, id, false, stamp) : null;
      if (a) entries.push(a);
      var c = newLink ? relinkEntry(newLink, id, true, stamp) : null;
      if (c) entries.push(c);
    }
    return commitTrades([copy], entries, stamp, { verb: "แก้ไม้", symbol: b.fields.symbol, date: b.fields.date }, fromForm);
  }

  // ลบไม้ = tombstone (สเปก §5.1) · บันทึกที่ผูกไว้ไม่ถูกแตะ (fifo ไม่นับไม้ที่ลบแล้วอยู่แล้ว)
  function deleteTrade(id) {
    state.tradeConfirmDelId = null;
    state.tradeMsg = null;
    if (state.saving) return tradeRefuse("กำลังบันทึกรายการก่อนหน้าอยู่ — รอสักครู่แล้วกดอีกครั้ง");
    var cur = liveTradeById(id);
    if (!cur) return tradeRefuse("ไม่พบไม้นี้ (อาจถูกลบไปแล้ว) — ไม่ได้ส่งอะไร");
    var stamp = nowIso();
    var tomb = E().tombstone(clone(cur), stamp);
    if (!tomb) return tradeRefuse("ลบไม่ได้ — ข้อมูลไม้นี้อ่านไม่ได้ ยังไม่ได้ส่ง");
    if (state.tradeEditId === id) resetTradeForm();
    return commitTrades([tomb], [], stamp, { verb: "ลบไม้", symbol: E().canonicalSymbol(cur.symbol) || String(cur.symbol || ""), date: String(cur.date || "") }, false);
  }

  function startTradeEdit(id) {
    var D = E();
    var cur = liveTradeById(id);
    if (!cur || state.locked) return;
    function str(v) { return v == null ? "" : String(v); }
    state.tradeForm = {
      date: str(cur.date), symbol: D.canonicalSymbol(cur.symbol) || str(cur.symbol), side: str(cur.side),
      qty: str(cur.qty), price: str(cur.price), fee: str(cur.fee),
      currency: (cur.currency === "THB" || cur.currency === "USD") ? cur.currency : "",
      note: typeof cur.note === "string" ? cur.note : "", entryId: typeof cur.entryId === "string" ? cur.entryId : ""
    };
    state.tradeEditId = id;
    state.tradeMsg = null;
    state.tradeConfirmDelId = null;
    writeTradeFormToDom();
    tradeFormFromState = true;
    render();
    var box = field("djTradeForm");
    if (box && typeof box.scrollIntoView === "function") { try { box.scrollIntoView({ block: "nearest" }); } catch (e) { /* ไม่เป็นไร */ } }
  }
  function cancelTradeEdit() {
    state.tradeMsg = null;
    resetTradeForm();
  }

  // ล็อกความเป็นส่วนตัวระหว่างแก้ไม้ → ยกเลิกการแก้ (ฟอร์มมีจำนวน/ค่าธรรมเนียมของไม้เดิมเติมไว้)
  function onPrivacyChanged() {
    if (privacyLocked() && state.tradeEditId) cancelTradeEdit();
    render();
  }

  // ---- render ----
  function tradeCmp(a, b) {
    var ad = String(a.date || ""), bd = String(b.date || "");
    if (ad !== bd) return ad < bd ? 1 : -1;
    var ac = String(a.createdAt || ""), bc = String(b.createdAt || "");
    if (ac !== bc) return ac < bc ? 1 : -1;
    var ai = String(a.id), bi = String(b.id);
    return ai < bi ? -1 : (ai > bi ? 1 : 0);
  }

  function lastPriceCell(o) {
    if (isNum(o.lastClose)) {
      return unitPrice(o.lastClose, o.priceCurrency) + '<span class="dj-cell-s">' + esc(o.lastDate || "—") + "</span>" +
        (o.lastBarClosed === false ? '<span class="dj-cell-s"><span class="dj-pill is-warn">แท่งยังไม่ปิด</span></span>' : "");
    }
    if (state.priceErrBySymbol[o.symbol]) return '<span class="dj-cell-bad">ดึงราคาไม่สำเร็จ</span>';
    if (state.outcomesLoading) return '<span class="dj-muted">กำลังดึงราคา…</span>';
    return '<span class="dj-muted">ไม่มีราคา</span>';
  }

  function openRowHtml(o) {
    var fl = o.floating;
    var flCell;
    if (state.locked) flCell = "XXX";
    else if (isNum(fl)) flCell = moneySigned(fl, o.currency, true) + (isNum(o.floatingPct) ? '<span class="dj-cell-s">' + esc(fmtPct(o.floatingPct, 1)) + "</span>" : "");
    else if (isNum(o.lastClose)) flCell = '<span class="dj-muted">สกุลไม่ตรง</span>';
    else flCell = '<span class="dj-muted">—</span>';
    return '<tr class="dj-trow" data-dj-open-row="' + esc(o.symbol) + '">' +
      '<td><span class="dj-sym">' + esc(o.symbol) + '</span><span class="dj-cell-s">' + esc(o.currency) + "</span></td>" +
      '<td class="dj-num dj-qty">' + esc(personal(fmtQty(o.qty))) + "</td>" +
      '<td class="dj-num">' + esc(unitPrice(o.avgCost, o.currency)) + "</td>" +
      '<td class="dj-num">' + lastPriceCell(o) + "</td>" +
      '<td class="dj-num">' + esc(money(o.cost, o.currency, true)) + "</td>" +
      '<td class="dj-num' + pnlCls(fl) + '">' + flCell + "</td></tr>";
  }

  function totalsHtml(res) {
    var keys = [], k;
    for (k in res.totals) if (Object.prototype.hasOwnProperty.call(res.totals, k)) keys.push(k);
    if (!keys.length) return "";
    keys.sort();
    var openCcy = {};
    each(res.open, function (o) { openCcy[o.currency] = 1; });
    var h = '<div class="dj-ttotals">';
    each(keys, function (c) {
      var tt = res.totals[c];
      var fl = "";
      if (openCcy[c]) {
        fl = '<span class="dj-ttotal-i"><span>กำไรลอยตัว (ไม้เปิดอยู่)</span>' +
          (tt.floating === null && !state.locked
            ? '<span class="dj-muted">ยังไม่รู้ — ขาดราคาบางตัว</span>'
            : '<b class="dj-ttotal-v' + pnlCls(tt.floating) + '">' + esc(moneySigned(tt.floating, c, true)) + "</b>") + "</span>";
      }
      h += '<div class="dj-ttotal"><span class="dj-ttotal-c">รวม ' + esc(c) + " · ไม่แปลงสกุล</span>" +
        '<span class="dj-ttotal-i"><span>กำไร/ขาดทุนที่รับรู้</span><b class="dj-ttotal-v' + pnlCls(tt.realized) + '">' +
        esc(moneySigned(tt.realized, c, true)) + "</b></span>" + fl + "</div>";
    });
    return h + "</div>";
  }

  function tradesTopHtml(trades, res) {
    var out = "";
    if (!state.serverLoaded) {
      out += '<p class="dj-note">เฉพาะไม้ในร่างของเครื่องนี้ — ยังไม่รู้ว่าบนเซิร์ฟเวอร์มีไม้อะไรบ้าง</p>';
    }
    if (!res) return out + '<div class="dj-out-msg is-bad"><span><strong>คิดกำไร/ขาดทุนไม่สำเร็จ</strong> — ลองรีเฟรชหน้า</span></div>';
    if (res.warnings.length) {
      out += '<div class="dj-twarns" role="status">';
      each(res.warnings, function (w) { out += '<p class="dj-warn">' + esc(w) + "</p>"; });
      out += "</div>";
    }
    if (!trades.length) {
      return out + '<p class="dj-placeholder">ยังไม่มีไม้จริง — เพิ่มไม้ที่ซื้อหรือขายไปแล้วจริงด้านล่าง ระบบจับคู่ไม้ขายกับไม้ซื้อที่เก่าสุดก่อน (FIFO) แล้วคิดกำไร/ขาดทุนให้</p>';
    }
    out += '<h3 class="dj-sub-h">ไม้เปิดอยู่ <span class="dj-sub-n">' + res.open.length + " สัญลักษณ์</span></h3>";
    if (!res.open.length) {
      out += '<p class="dj-placeholder">ไม่มีไม้เปิดอยู่ — ขายครบทุกตัวที่บันทึกซื้อไว้แล้ว</p>';
    } else {
      out += '<div class="dj-table-wrap"><table class="dj-table dj-open-table"><thead><tr>' +
        '<th scope="col">สัญลักษณ์</th><th scope="col" class="dj-num">จำนวน</th><th scope="col" class="dj-num">ต้นทุนเฉลี่ย</th>' +
        '<th scope="col" class="dj-num">ราคาปิดล่าสุด</th><th scope="col" class="dj-num">มูลค่าทุน</th><th scope="col" class="dj-num">กำไรลอยตัว</th>' +
        "</tr></thead><tbody>";
      each(res.open, function (o) { out += openRowHtml(o); });
      out += "</tbody></table></div>";
    }
    return out + totalsHtml(res);
  }

  function linkedCell(x) {
    var D = E();
    if (typeof x.entryId !== "string" || x.entryId === "") return '<span class="dj-muted">—</span>';
    var en = liveEntryById(x.entryId);
    if (!en) return '<span class="dj-muted">บันทึกถูกลบ</span>';
    return esc(String(en.date || "") + " · " + (thaiOf(D.ACTIONS, obj(en.action).kind) || "—"));
  }

  function tradeActions(x, sym) {
    var id = esc(x.id);
    var label = esc(sym + " " + (x.date || ""));
    if (state.tradeConfirmDelId === x.id) {
      return '<div class="dj-tconfirm" role="alert"><span>ลบไม้นี้?</span>' +
        '<button type="button" class="dj-btn" data-dj-trade-del-cancel="' + id + '">ยกเลิก</button>' +
        '<button type="button" class="dj-btn dj-btn-danger" data-dj-trade-del-confirm="' + id + '">ยืนยันลบ</button></div>';
    }
    return '<div class="dj-trow-acts">' +
      (state.locked ? "" : '<button type="button" class="dj-btn" data-dj-trade-edit="' + id + '" aria-label="แก้ไม้ ' + label + '">แก้</button>') +
      '<button type="button" class="dj-btn dj-btn-quiet" data-dj-trade-del="' + id + '" aria-label="ลบไม้ ' + label + '">ลบ</button></div>';
  }

  function tradesListHtml(trades, res) {
    var D = E();
    if (!trades.length) return "";
    var realizedBy = {};
    if (res) each(res.realized, function (r) { realizedBy[r.tradeId] = r; });
    var rows = "";
    each(trades.slice().sort(tradeCmp), function (x) {
      var sym = D.canonicalSymbol(x.symbol) || String(x.symbol || "");
      var ccy = (x.currency === "THB" || x.currency === "USD") ? x.currency : D.currencyOf(sym);
      var r = realizedBy[x.id];
      var rCell, rCls = "";
      if (x.side === "sell") {
        if (r) {
          rCls = pnlCls(r.pnl);
          rCell = esc(moneySigned(r.pnl, r.currency, true)) +
            (isNum(r.pnlPct) ? '<span class="dj-cell-s">' + esc(personal(fmtPct(r.pnlPct, 1))) + "</span>" : "") +
            (r.oversell ? '<span class="dj-cell-s"><span class="dj-pill is-warn">ขายเกิน</span></span>' : "");
        } else {
          rCell = '<span class="dj-pill is-warn">ไม่นำมาคิด</span>';
        }
      } else {
        rCell = '<span class="dj-muted">—</span>';
      }
      var note = typeof x.note === "string" ? trimStr(x.note) : "";
      rows += '<tr class="dj-trow' + (state.tradeEditId === x.id ? " is-editing" : "") + '" data-dj-trade="' + esc(x.id) + '">' +
        '<td><span class="dj-cell-date">' + esc(x.date || "—") + "</span></td>" +
        '<td><span class="dj-sym">' + esc(sym) + "</span>" + (note ? '<span class="dj-cell-s dj-cell-note">' + esc(note) + "</span>" : "") + "</td>" +
        "<td>" + esc(thaiOf(D.ACTIONS, x.side) || "—") + "</td>" +
        '<td class="dj-num dj-qty">' + esc(personal(fmtQty(numIn(x.qty)))) + "</td>" +
        '<td class="dj-num">' + esc(unitPrice(numIn(x.price), ccy)) + "</td>" +
        '<td class="dj-num">' + esc(money(numIn(x.fee) === null ? 0 : numIn(x.fee), ccy, true)) + "</td>" +
        '<td class="dj-num' + rCls + '">' + rCell + "</td>" +
        "<td>" + linkedCell(x) + "</td>" +
        "<td>" + tradeActions(x, sym) + "</td></tr>";
    });
    return '<h3 class="dj-sub-h">ไม้ทั้งหมด <span class="dj-sub-n">' + trades.length + " ไม้ · ใหม่ → เก่า</span></h3>" +
      '<div class="dj-table-wrap"><table class="dj-table dj-trades-table"><thead><tr>' +
      '<th scope="col">วันที่</th><th scope="col">สัญลักษณ์</th><th scope="col">ซื้อ/ขาย</th><th scope="col" class="dj-num">จำนวน</th>' +
      '<th scope="col" class="dj-num">ราคาต่อหน่วย</th><th scope="col" class="dj-num">ค่าธรรมเนียม</th><th scope="col" class="dj-num">กำไรที่รับรู้</th>' +
      '<th scope="col">ผูกกับบันทึก</th><th scope="col"><span class="dj-sr">จัดการ</span></th>' +
      "</tr></thead><tbody>" + rows + "</tbody></table></div>";
  }

  function tselect(id, options, cur, emptyLabel) {
    var h = '<select id="' + id + '" class="dj-select">' +
      (emptyLabel !== null ? '<option value=""' + (cur === "" ? " selected" : "") + ">" + esc(emptyLabel) + "</option>" : "");
    each(options, function (o) {
      h += '<option value="' + esc(o.value) + '"' + (String(cur) === String(o.value) ? " selected" : "") + ">" + esc(o.label) + "</option>";
    });
    return h + "</select>";
  }
  function tradeMsgHtml() {
    return state.tradeMsg ? '<div class="dj-form-msg" role="alert">' + esc(state.tradeMsg) + "</div>" : "";
  }
  function tradeStatusInner() {
    var lt = state.lastTrade, s = state.syncState;
    if (!lt || (s !== "saving" && s !== "saved" && s !== "draft" && s !== "error")) return "";
    return syncPill() + '<span class="dj-sync-note">' + esc(lt.verb + " " + lt.symbol + " · " + lt.date) + "</span>";
  }

  function tradeFormHtml() {
    var D = E();
    var f = state.tradeForm;
    var today = todayYmd();
    var editing = state.tradeEditId ? liveTradeById(state.tradeEditId) : null;
    var sideOpts = [], entOpts = [], seen = {};
    each(["buy", "sell"], function (k) { sideOpts.push({ value: k, label: thaiOf(D.ACTIONS, k) }); });
    var curOpts = [{ value: "THB", label: "THB" }, { value: "USD", label: "USD" }];
    if (state.doc) {
      each(D.liveEntries(state.doc).slice().sort(entryCmp), function (e) {
        if (typeof e.id !== "string" || seen[e.id]) return;
        seen[e.id] = 1;
        entOpts.push({ value: e.id, label: String(e.date || "") + " · " + (D.canonicalSymbol(e.symbol) || "—") + " · " + (thaiOf(D.ACTIONS, obj(e.action).kind) || "—") });
      });
    }
    if (f.entryId && !seen[f.entryId]) entOpts.push({ value: f.entryId, label: "บันทึกที่ถูกลบแล้ว" });
    var title = editing
      ? "แก้ไม้ " + (D.canonicalSymbol(editing.symbol) || "") + " · " + String(editing.date || "")
      : "เพิ่มไม้ที่ซื้อหรือขายจริง";
    var btns = editing
      ? '<button type="button" id="djTSubmit" class="dj-btn dj-btn-primary" data-dj-trade-update="' + esc(editing.id) + '"' + (state.saving ? " disabled" : "") + ">บันทึกการแก้ไข</button>" +
        '<button type="button" class="dj-btn" data-dj-trade-edit-cancel="1">ยกเลิกการแก้</button>'
      : '<button type="button" id="djTSubmit" class="dj-btn dj-btn-primary" data-dj-trade-add="1"' + (state.saving ? " disabled" : "") + ">เพิ่มไม้</button>";
    return '<div id="djTradeForm" class="dj-tform' + (editing ? " is-editing" : "") + '">' +
      '<div class="dj-tform-head"><h3 class="dj-sub-h">' + esc(title) + "</h3>" +
      '<span class="dj-field-h">ไม้ที่ทำไปแล้วจริงตามที่โบรกเกอร์แจ้ง · แก้หรือลบได้ภายหลัง</span></div>' +
      '<div class="dj-tform-grid">' +
      fieldBox("djTDate", "วันที่", '<input id="djTDate" class="dj-input" type="date" value="' + esc(f.date || today) + '" max="' + esc(today) + '">', "") +
      fieldBox("djTSymbol", "สัญลักษณ์",
        '<input id="djTSymbol" class="dj-input" list="djSymbols" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="เช่น NVDA · PTT.BK · BTC" value="' + esc(f.symbol) + '">',
        "หุ้นไทยลงท้าย .BK") +
      fieldBox("djTSide", "ซื้อหรือขาย", tselect("djTSide", sideOpts, f.side, "— เลือก —"), "") +
      fieldBox("djTQty", "จำนวน", '<input id="djTQty" class="dj-input is-num" type="text" inputmode="decimal" autocomplete="off" value="' + esc(f.qty) + '">', "ใส่ทศนิยมได้ เช่น เศษของบิตคอยน์") +
      fieldBox("djTPrice", "ราคาต่อหน่วย", '<input id="djTPrice" class="dj-input is-num" type="text" inputmode="decimal" autocomplete="off" value="' + esc(f.price) + '">', "") +
      fieldBox("djTFee", "ค่าธรรมเนียม", '<input id="djTFee" class="dj-input is-num" type="text" inputmode="decimal" autocomplete="off" placeholder="0" value="' + esc(f.fee) + '">', "รวมภาษี · ว่าง = 0") +
      fieldBox("djTCurrency", "สกุลเงิน", tselect("djTCurrency", curOpts, f.currency, "ตามตลาดของสัญลักษณ์"), ".BK = THB · อื่น ๆ = USD") +
      fieldBox("djTEntry", "ผูกกับบันทึก <span class=\"dj-field-h\">(ไม่บังคับ)</span>", tselect("djTEntry", entOpts, f.entryId, "ไม่ผูก"), "", "dj-tform-entry") +
      fieldBox("djTNote", "หมายเหตุ <span class=\"dj-field-h\">(ไม่บังคับ)</span>", '<input id="djTNote" class="dj-input" type="text" autocomplete="off" value="' + esc(f.note) + '">', "", "dj-field-wide") +
      "</div>" +
      '<div id="djTFormMsgBox">' + tradeMsgHtml() + "</div>" +
      '<div class="dj-actions dj-tform-actions">' + btns +
      '<span id="djTStatus" class="dj-save-status">' + tradeStatusInner() + "</span></div>" +
      "</div>";
  }

  // ส่วนของ djTrades ที่ขึ้นกับข้อมูล (ไม่รวมฟอร์ม) — null = ยังไม่มีเอกสาร
  function tradeParts() {
    var D = E();
    if (!state.doc) return null;
    var trades = D.liveTrades(state.doc);
    var res = null;
    try { res = D.fifo(trades, lastCloses()); } catch (e) { logError("คิดไม้จริง", e); res = null; }
    return { trades: trades, res: res, top: tradesTopHtml(trades, res), list: tradesListHtml(trades, res) };
  }

  function renderTrades() {
    var title = "ไม้จริง";
    if (state.tradeEditId && !liveTradeById(state.tradeEditId)) state.tradeEditId = null;   // ไม้ที่แก้อยู่ถูกลบจากที่อื่น
    var parts = tradeParts();
    if (!parts) {
      var why = state.loading ? "กำลังโหลดไม้จริง…" : "ยังโหลดบันทึกจากเซิร์ฟเวอร์ไม่ได้ — ดูสถานะที่ “ภาพรวม” ด้านบน";
      return block("djTrades", title, "", '<p class="dj-placeholder">' + esc(why) + "</p>" + tradeFormHtml());
    }
    var sub = '<span class="dj-block-note">ซื้อขายจริง · จับคู่ FIFO · กำไร/ขาดทุนแยกสกุล</span>';
    return block("djTrades", title, sub,
      '<div id="djTradesTop">' + parts.top + "</div>" + tradeFormHtml() + '<div id="djTradesList">' + parts.list + "</div>");
  }

  // ---------------- สถิติ (สเปก §5.6 · §7 ข้อ 6) ----------------
  // ตัวเลขทุกตัวมาจาก stats() ของเอนจิน — หน้าแค่หารเป็น % ตอนแสดง: ผลดี = goodN / scoredN · คาดถูก = rightN / judgedN
  // กลุ่มที่ enough === false แสดงแค่จำนวน + "ยังน้อยเกินสรุป" (ไม่มีสัดส่วน/เฉลี่ย) · คาดถูกใช้ประตู predEnough ของมันเอง
  var THIN_TEXT = "ยังน้อยเกินสรุป";
  function shareText(a, b) { return fmtNum(a * 100 / b, 0) + "%"; }
  function ratioCell(col, a, b) {
    return '<td class="dj-num" data-col="' + col + '">' + esc(shareText(a, b)) + '<span class="dj-cell-s">' + esc(a + " จาก " + b) + "</span></td>";
  }
  function thinCell(col, span, n, what) {
    return "<td" + (span > 1 ? ' colspan="' + span + '"' : "") + ' data-col="' + col + '"><span class="dj-thin">' + THIN_TEXT + "</span>" +
      '<span class="dj-cell-s">' + esc(what + " " + n + " รายการ") + "</span></td>";
  }
  function groupRow(key, labelHtml, S) {
    var h = '<tr data-dj-stat="' + esc(key) + '"><th scope="row">' + labelHtml + "</th>" +
      '<td class="dj-num" data-col="n">' + esc(String(S.n)) + "</td>";
    if (S.enough === true && S.scoredN > 0 && isNum(S.avgPct)) {
      var shown = Number(S.avgPct.toFixed(1));
      var cls = shown > 0 ? " dj-up" : (shown < 0 ? " dj-down" : "");
      h += ratioCell("good", S.goodN, S.scoredN) + '<td class="dj-num' + cls + '" data-col="avg">' + esc(fmtPct(S.avgPct, 1)) + "</td>";
    } else {
      h += thinCell("good", 2, S.scoredN, "ครบกำหนด");
    }
    h += (S.predEnough === true && S.judgedN > 0) ? ratioCell("right", S.rightN, S.judgedN) : thinCell("right", 1, S.judgedN, "ตัดสินได้");
    return h + "</tr>";
  }
  function groupTable(rows) {
    return '<div class="dj-table-wrap"><table class="dj-table dj-stats-table"><thead><tr>' +
      '<th scope="col">กลุ่ม</th><th scope="col" class="dj-num">บันทึก</th><th scope="col" class="dj-num">ผลดี</th>' +
      '<th scope="col" class="dj-num">เฉลี่ยในทิศที่ทำ</th><th scope="col" class="dj-num">คาดถูก</th>' +
      "</tr></thead><tbody>" + rows + "</tbody></table></div>";
  }
  function predTable(bp) {
    var D = E();
    var enough = bp.enough === true && bp.judged > 0;
    function row(key, label, n, withShare) {
      var share = withShare && enough ? shareText(n, bp.judged) : "—";
      return '<tr data-dj-stat="pred:' + key + '"><th scope="row">' + label + "</th>" +
        '<td class="dj-num" data-col="n">' + esc(String(n)) + '</td><td class="dj-num" data-col="share">' + esc(share) + "</td></tr>";
    }
    return (enough ? "" : '<p class="dj-stats-note"><span class="dj-thin">' + THIN_TEXT + "</span> — ตัดสินได้ " + esc(bp.judged) +
        " รายการ ต้องมีอย่างน้อย " + esc(D.MIN_STAT_N) + " จึงแสดงสัดส่วน</p>") +
      '<div class="dj-table-wrap"><table class="dj-table dj-stats-table"><thead><tr>' +
      '<th scope="col">ผลที่ช่วงที่คาด</th><th scope="col" class="dj-num">จำนวน</th><th scope="col" class="dj-num">สัดส่วน</th>' +
      "</tr></thead><tbody>" +
      row("right", "คาดถูก", bp.right, true) +
      row("wrong", "คาดผิด", bp.wrong, true) +
      row("flat", "ทรงตัว <span class=\"dj-cell-s\">" + esc(flatNote()) + " ไม่นับว่าถูกหรือผิด</span>", bp.flat, true) +
      row("judged", "<b>รวมที่ตัดสินได้</b>", bp.judged, false) +
      row("unjudged", "คาดว่าไม่แน่ใจ <span class=\"dj-cell-s\">ไม่ตัดสิน</span>", bp.unjudged, false) +
      "</tbody></table></div>";
  }

  function renderStats() {
    var D = E();
    var title = "สถิติ";
    var known = state.serverLoaded && !!state.doc;
    if (!known) {
      var why = state.loading ? "กำลังโหลดบันทึก…" : "ยังโหลดบันทึกจากเซิร์ฟเวอร์ไม่ได้ — ดูสถานะที่ “ภาพรวม” ด้านบน";
      return block("djStats", title, "", '<p class="dj-placeholder">' + esc(why) + "</p>");
    }
    if (!D.liveEntries(state.doc).length) {
      return block("djStats", title, "", '<p class="dj-placeholder">ยังไม่มีบันทึก — สถิติจะขึ้นเมื่อบันทึกครบกำหนดตามช่วงที่คาดไว้</p>');
    }
    var st = statsNow();
    if (!st) return block("djStats", title, "", '<div class="dj-out-msg is-bad"><span><strong>คิดสถิติไม่สำเร็จ</strong> — ลองรีเฟรชหน้า</span></div>');
    var sub = '<span class="dj-block-note">นับเฉพาะบันทึกที่ครบกำหนดตามช่วงที่คาดไว้แล้ว</span>';
    var body = '<p class="dj-stats-note">กลุ่มที่ครบกำหนดน้อยกว่า ' + esc(D.MIN_STAT_N) + " รายการ แสดงแค่จำนวน พร้อมคำว่า “" + THIN_TEXT + "”" +
      " · ผลดี = ซื้อแล้วราคาขึ้น หรือขายแล้วราคาลง เกิน ±" + esc(pctText(D.FLAT_BAND_PCT)) +
      " · เฉลี่ยในทิศที่ทำ: ขายแล้วราคาลงนับเป็นบวก</p>";
    if (state.outcomesLoading) body += '<p class="dj-stats-note" role="status">กำลังดึงราคา… ตัวเลขอาจยังไม่ครบ</p>';

    var bc = st.byCompliance, pr = bc["per-rule"], ag = bc.against;
    if (pr.enough === true && ag.enough === true && pr.scoredN > 0 && ag.scoredN > 0) {
      body += '<p class="dj-insight">ผลของการซื้อ/ขายที่ครบกำหนด: <b>ตามกฎ ดี ' + esc(shareText(pr.goodN, pr.scoredN)) + "</b> (" +
        esc(pr.goodN + " จาก " + pr.scoredN) + ") · <b>แหกกฎ ดี " + esc(shareText(ag.goodN, ag.scoredN)) + "</b> (" +
        esc(ag.goodN + " จาก " + ag.scoredN) + ")</p>";
    }
    body += '<h3 class="dj-sub-h">ตามกฎ vs แหกกฎ</h3>' +
      groupTable(groupRow("comp:per-rule", pill(VERDICT_VIEW["per-rule"].cls, VERDICT_VIEW["per-rule"].text), pr) +
        groupRow("comp:against", pill(VERDICT_VIEW.against.cls, VERDICT_VIEW.against.text), ag));

    var feelRows = "", k;
    for (k in st.byFeeling) {
      if (!Object.prototype.hasOwnProperty.call(st.byFeeling, k)) continue;
      var F = st.byFeeling[k];
      if (!F || !(F.n > 0)) continue;
      feelRows += groupRow("feel:" + k, esc(thaiOf(D.FEELINGS, k) || k), F);
    }
    body += '<h3 class="dj-sub-h">ตามอารมณ์ตอนตัดสินใจ <span class="dj-sub-n">บันทึกหนึ่งนับในทุกอารมณ์ที่ติ๊ก</span></h3>' +
      (feelRows ? groupTable(feelRows) : '<p class="dj-placeholder">ยังไม่มีบันทึกที่เลือกอารมณ์</p>');
    body += '<h3 class="dj-sub-h">ตามที่คาดไว้</h3>' + predTable(st.byPrediction);
    return block("djStats", title, sub, body);
  }

  // ---------------- บันทึกใหม่: ฟอร์ม ----------------
  function horizonLabel(days) {
    if (days % 30 === 0) return (days / 30) + " เดือน";
    if (days % 7 === 0) return (days / 7) + " สัปดาห์";
    return days + " วัน";
  }
  function selectHtml(id, name, options, cur, label) {
    var h = '<select id="' + id + '" class="dj-select" data-dj-field="' + name + '" aria-label="' + esc(label) + '">' +
      '<option value=""' + (cur === "" || cur == null ? " selected" : "") + ">— เลือก —</option>";
    each(options, function (o) {
      h += '<option value="' + esc(o.value) + '"' + (String(cur) === String(o.value) ? " selected" : "") + ">" + esc(o.label) + "</option>";
    });
    return h + "</select>";
  }
  function fieldBox(forId, label, control, hint, extraCls) {
    return '<div class="dj-field' + (extraCls ? " " + extraCls : "") + '">' +
      (forId ? '<label class="dj-field-l" for="' + forId + '">' + label + "</label>" : '<span class="dj-field-l">' + label + "</span>") +
      control + (hint ? '<span class="dj-field-h">' + hint + "</span>" : "") + "</div>";
  }

  function symbolOptions() {
    var D = E(), held = {}, out = "";
    each(state.holdings, function (h) { var c = D.canonicalSymbol(h.canonicalSymbol); if (c) held[c] = 1; });
    each(state.symbols, function (s) { out += '<option value="' + esc(s) + '">' + (held[s] ? "ในพอร์ต" : "เคยบันทึก") + "</option>"; });
    return out;
  }
  function previewLoading() { return !!(state.preview && state.preview.status === "loading"); }
  function previewLabel() { return previewLoading() ? "กำลังดึงราคา…" : "ดูว่ากฎบอกอะไร"; }
  function formMsgHtml() {
    return state.formError ? '<div id="djFormMsg" class="dj-form-msg" role="alert">' + esc(state.formError) + "</div>" : "";
  }
  function feelId(key) { return "djFeel_" + key; }

  function renderNew() {
    var D = E();
    var f = state.form;
    var today = todayYmd();
    var dl = '<datalist id="djSymbols">' + symbolOptions() + "</datalist>";

    var chips = "";
    each(D.FEELINGS, function (x) {
      var on = f.feelings.indexOf(x.key) >= 0;
      chips += '<button type="button" class="dj-chip' + (on ? " is-on" : "") + '" aria-pressed="' + (on ? "true" : "false") +
        '" data-dj-feel="' + esc(x.key) + '" id="' + esc(feelId(x.key)) + '">' + esc(x.thai) + "</button>";
    });
    var dirOpts = [], hzOpts = [], actOpts = [];
    each(D.DIRECTIONS, function (x) { dirOpts.push({ value: x.key, label: x.thai }); });
    each(D.HORIZONS, function (h) { hzOpts.push({ value: h, label: horizonLabel(h) }); });
    each(D.ACTIONS, function (x) { actOpts.push({ value: x.key, label: x.thai }); });
    var dip = esc(pctText(Math.abs(D.DIP_PCT)));
    var tradeOk = isTradeAction(f.action);
    var curOpts = '<option value=""' + (f.currency === "" ? " selected" : "") + ">ตามตลาดของสัญลักษณ์</option>" +
      '<option value="THB"' + (f.currency === "THB" ? " selected" : "") + ">THB</option>" +
      '<option value="USD"' + (f.currency === "USD" ? " selected" : "") + ">USD</option>";

    var form =
      '<div class="dj-form">' +
      '<div class="dj-form-grid">' +
      fieldBox("djSymbol", "สัญลักษณ์",
        '<input id="djSymbol" class="dj-input" list="djSymbols" data-dj-field="symbol" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="เช่น NVDA · PTT.BK · BTC" value="' + esc(f.symbol) + '">' + dl,
        "หุ้นไทยลงท้าย .BK") +
      fieldBox("djDate", "วันที่ตัดสินใจ",
        '<input id="djDate" class="dj-input" type="date" data-dj-field="date" value="' + esc(f.date || today) + '" max="' + esc(today) + '">', "") +
      fieldBox("djEvent", "เห็นอะไร / ข่าวอะไร",
        '<textarea id="djEvent" class="dj-textarea" rows="3" placeholder="เช่น ข่าวผลประกอบการ ตลาดลงแรง เพื่อนบอกต่อ">' + esc(f.event) + "</textarea>", "", "dj-field-wide") +
      fieldBox("", "ตอนนี้รู้สึก <span class=\"dj-field-h\">(เลือกได้หลายอัน)</span>",
        '<div class="dj-chips" role="group" aria-label="ตอนนี้รู้สึก">' + chips + "</div>", "", "dj-field-wide") +
      fieldBox("djDirection", "คาดว่าราคาจะ", selectHtml("djDirection", "direction", dirOpts, f.direction, "คาดว่าราคาจะ"), "") +
      fieldBox("djHorizon", "ภายใน", selectHtml("djHorizon", "horizon", hzOpts, f.horizonDays == null ? "" : f.horizonDays, "ภายใน"), "") +
      fieldBox("djAction", "ทำอะไร", selectHtml("djAction", "action", actOpts, f.action, "ทำอะไร"),
        "ที่ทำจริง ไม่ใช่ที่คิดว่าจะทำ") +
      '<div class="dj-field dj-field-check">' +
      '<label id="djConvictionWrap" class="dj-check' + (f.action === "buy" ? "" : " dj-hidden") + '">' +
      '<input type="checkbox" id="djConviction" data-dj-field="conviction"' + (f.conviction ? " checked" : "") + ">" +
      "<span>ศึกษามาดี / มั่นใจ <span class=\"dj-field-h\">(ใช้กับกฎ 3 ย่อ ≥ " + dip + ")</span></span></label></div>" +
      fieldBox("djPlan", "แผน / หมายเหตุ <span class=\"dj-field-h\">(ไม่บังคับ)</span>",
        '<textarea id="djPlan" class="dj-textarea is-short" rows="2" placeholder="เช่น ถ้าหลุดแนวรับจะทำอะไรต่อ">' + esc(f.plan) + "</textarea>", "", "dj-field-wide") +
      '<div class="dj-field dj-field-wide">' +
      '<label id="djWithTradeWrap" class="dj-check' + (tradeOk ? "" : " dj-hidden") + '">' +
      '<input type="checkbox" id="djWithTrade" data-dj-field="withTrade"' + (f.withTrade ? " checked" : "") + ">" +
      "<span>บันทึกไม้จริงด้วย (ซื้อ/ขายไปแล้วจริง)</span></label>" +
      '<div id="djTradeFields" class="dj-trade-fields' + (f.withTrade && tradeOk ? "" : " dj-hidden") + '">' +
      fieldBox("djQty", "จำนวน", '<input id="djQty" class="dj-input is-num" type="text" inputmode="decimal" autocomplete="off" value="' + esc(f.qty) + '">', "") +
      fieldBox("djPrice", "ราคาต่อหน่วย", '<input id="djPrice" class="dj-input is-num" type="text" inputmode="decimal" autocomplete="off" value="' + esc(f.price) + '">', "") +
      fieldBox("djFee", "ค่าธรรมเนียม", '<input id="djFee" class="dj-input is-num" type="text" inputmode="decimal" autocomplete="off" placeholder="0" value="' + esc(f.fee) + '">', "") +
      fieldBox("djCurrency", "สกุลเงิน", '<select id="djCurrency" class="dj-select">' + curOpts + "</select>", "") +
      "</div></div>" +
      "</div>" +
      '<div class="dj-actions">' +
      '<button type="button" id="djPreviewBtn" class="dj-btn" data-dj-preview="1"' + (previewLoading() ? " disabled" : "") + ">" +
      esc(previewLabel()) + "</button>" +
      '<span class="dj-field-h">ดึงราคาปิดแล้วบอกว่ากฎ 3 ข้อว่าอย่างไร — ต้องดูก่อนจึงบันทึกได้</span></div>' +
      '<div id="djRulePanel" class="dj-rule-panel" aria-live="polite">' + renderPanel() + "</div>" +
      '<div id="djFormMsgBox">' + formMsgHtml() + "</div>" +
      '<div class="dj-actions dj-save-row">' +
      '<button type="button" id="djSaveBtn" class="dj-btn dj-btn-primary" data-dj-save="1"' + (canSave() ? "" : " disabled") + ">บันทึก</button>" +
      '<span id="djSaveStatus" class="dj-save-status">' + saveStatusInner() + "</span></div>" +
      "</div>";
    return block("djNew", "บันทึกใหม่", '<span class="dj-block-note">จดตอนที่ตัดสินใจ ก่อนรู้ผล — บันทึกแล้วแก้ไม่ได้</span>', form);
  }

  function saveStatusInner() {
    if (!state.lastSave) return "";
    var s = state.syncState;
    if (s !== "saving" && s !== "saved" && s !== "draft" && s !== "error") return "";
    return syncPill() + '<span class="dj-sync-note">' + esc(state.lastSave.symbol + " · " + state.lastSave.date) + "</span>";
  }

  // ---------------- บันทึกใหม่: แผงกฎ ----------------
  var VERDICT_VIEW = {
    "per-rule": { cls: "is-good", text: "ตามกฎ", note: "มีกฎอย่างน้อยหนึ่งข้อสนับสนุนสิ่งที่ทำ" },
    against: { cls: "is-bad", text: "แหกกฎ", note: "ไม่มีกฎข้อไหนสนับสนุนสิ่งที่ทำ" },
    unknown: { cls: "is-muted", text: "ตัดสินไม่ได้", note: "ข้อมูลราคาไม่พอทั้งกฎ 1 และกฎ 2" },
    "n/a": { cls: "is-muted", text: "ไม่เกี่ยว", note: "ถือต่อ / ไม่ทำอะไร ไม่ตัดสิน แต่เก็บไว้ว่ากฎบอกอะไรในวันนั้น" }
  };

  function crossText(dir, ago) {
    if (dir !== "up" && dir !== "down") return "";
    var word = dir === "up" ? "ตัดขึ้น" : "ตัดลง";
    if (ago === 0) return " · " + word + "บนแท่งนี้";
    if (typeof ago === "number") return " · " + word + "เมื่อ " + ago + " แท่งก่อน";
    return "";
  }

  // ป้ายบอกว่ากฎข้อนี้สนับสนุนฝั่งไหน · สีเทียบกับสิ่งที่ทำ: สนับสนุนสิ่งที่ทำ = เขียว · ค้าน = แดง · อื่น ๆ = เทา
  function ruleChips(rid, rule, verdict, buyOnly) {
    var cls = verdict.supports.indexOf(rid) >= 0 ? "is-good" : (verdict.opposes.indexOf(rid) >= 0 ? "is-bad" : "is-muted");
    if (!rule || (rule.buy == null && rule.sell == null)) return pill("is-muted", "ข้อมูลไม่พอ");
    var out = "";
    if (rule.buy === true) out += pill(cls, "สนับสนุน ซื้อ");
    if (!buyOnly && rule.sell === true) out += pill(cls, "สนับสนุน ขาย");
    return out || pill("is-muted", "ไม่สนับสนุนฝั่งไหน");
  }

  function ruleRow(name, stateText, chips, hint) {
    return '<li class="dj-rule"><div class="dj-rule-name">' + name + '</div><div class="dj-rule-state">' + stateText + "</div>" +
      '<div class="dj-rule-chips">' + chips + '</div><div class="dj-rule-hint">' + hint + "</div></li>";
  }

  function rulesList(rules, verdict) {
    var D = E();
    var conf = esc(D.CONFIRM_BARS);
    var r1 = rules.r1, r2 = rules.r2, r3 = rules.r3;
    var s1;
    if (!r1 || r1.state === "na") s1 = "ข้อมูลราคาไม่พอ (ต้องมีอย่างน้อย " + esc(D.MIN_EMA_BARS) + " แท่ง)";
    else {
      var rel = r1.state === "bull" ? "เหนือ" : (r1.state === "bear" ? "ใต้" : "เท่ากับ");
      s1 = "EMA12 <span class=\"dj-num\">" + fmtNum(rules.ema12, 2) + "</span> " + rel + " EMA26 <span class=\"dj-num\">" +
        fmtNum(rules.ema26, 2) + "</span>" + esc(crossText(r1.crossDir, r1.crossBarsAgo));
    }
    var s2;
    if (!r2 || r2.state === "na") s2 = "ข้อมูลราคาไม่พอ (ต้องมีอย่างน้อย " + esc(D.MIN_SMA_BARS) + " แท่ง)";
    else {
      var rel2 = r2.state === "above" ? "เหนือ" : (r2.state === "below" ? "ใต้" : "เท่ากับ");
      s2 = "ปิด" + rel2 + " SMA200 <span class=\"dj-num\">" + fmtNum(rules.sma200, 2) + "</span>" +
        (typeof r2.consecutive === "number" ? " มา " + r2.consecutive + " วันติดกัน" : "");
      if (r2.breakConfirmed === true) s2 += " · หลุดยืนยันแล้ว";
      if (r2.reclaimHeld === true) s2 += " · เพิ่งกลับขึ้นมายืนได้";
      var tb = r2.touchBounce || {};
      if (tb.met === true) s2 += " · แตะหรือเข้าใกล้เส้นเมื่อ " + esc(tb.touchDate) + " แล้วเด้ง";
      else if (tb.touchDate) s2 += " · เข้าใกล้เส้นเมื่อ " + esc(tb.touchDate) + " แต่ยังไม่นับว่าเด้ง";
    }
    var s3;
    if (!r3 || typeof r3.dd1yPct !== "number") s3 = "ข้อมูลราคาไม่พอ";
    else {
      s3 = "ห่างจุดสูงสุด 1 ปี <span class=\"dj-num\">" + fmtNum(rules.high1y, 2) + "</span> (" + esc(rules.high1yDate) + ") <span class=\"dj-num\">" +
        fmtPct(r3.dd1yPct, 1) + "</span>";
      if (typeof rules.high1yWindowBars === "number" && rules.high1yWindowBars < D.HIGH1Y_BARS) {
        s3 += " · ใช้ราคา " + rules.high1yWindowBars + " แท่งเท่าที่มี";
      }
      if (r3.dipMet === true) s3 += r3.conviction ? " · ติ๊กศึกษามาดีแล้ว" : " · ยังไม่ได้ติ๊กศึกษามาดี";
    }
    return '<ul class="dj-rules">' +
      ruleRow("กฎ 1 · EMA12/EMA26", s1, ruleChips("r1", r1, verdict, false),
        "ซื้อเข้ากฎเมื่อ EMA12 เหนือ EMA26 · ขายเข้ากฎเมื่อ EMA12 ใต้ EMA26") +
      ruleRow("กฎ 2 · SMA200", s2, ruleChips("r2", r2, verdict, false),
        "ขายเข้ากฎเมื่อปิดใต้เส้น ≥ " + conf + " วัน · ซื้อเข้ากฎเมื่อกลับขึ้นมายืน ≥ " + conf +
        " วัน หรือแตะหรือเข้าใกล้เส้น ±" + esc(pctText(D.TOUCH_BAND_PCT)) + " แล้วเด้ง") +
      ruleRow("กฎ 3 · ย่อจากจุดสูงสุด 1 ปี", s3, ruleChips("r3", r3 && typeof r3.dd1yPct === "number" ? { buy: r3.buy, sell: null } : null, verdict, true),
        "ซื้อเข้ากฎเมื่อย่อ ≥ " + esc(pctText(Math.abs(D.DIP_PCT))) + " และติ๊กว่าศึกษามาดี · ไม่เกี่ยวกับการขาย") +
      "</ul>";
  }

  function verdictBox(verdict) {
    var v = VERDICT_VIEW[verdict.compliance] || VERDICT_VIEW["n/a"];
    var chosen = !!findKey(E().ACTIONS, state.form.action);
    var label = chosen ? v.text : "ยังไม่ได้เลือกว่าทำอะไร";
    var note = chosen ? v.note : "เลือก “ทำอะไร” แล้วระบบจะบอกว่าตามกฎหรือแหกกฎ";
    return '<div class="dj-verdict">' + pill(chosen ? v.cls : "is-muted", label) +
      '<span class="dj-why">' + esc(note) + "</span>" +
      (verdict.why ? '<span class="dj-why-detail">' + esc(verdict.why) + "</span>" : "") +
      '<span class="dj-lock-note">คำตัดสินนี้ถูกล็อกไว้ตอนกดบันทึก แก้ย้อนหลังไม่ได้</span></div>';
  }

  // หุ้นไทยที่พิมพ์ไม่มี .BK แต่มีในรายการ → ชี้ให้เห็น (สัญลักษณ์อาจไปตรงกับหุ้นต่างประเทศที่ชื่อเดียวกัน)
  function bkHint(sym) {
    if (!sym || sym.indexOf(".") >= 0) return "";
    if (state.symbols.indexOf(sym + ".BK") < 0) return "";
    return '<p class="dj-warn">หมายถึง ' + esc(sym + ".BK") + " ไหม? หุ้นไทยต้องลงท้าย .BK — ถ้าใช่ แก้สัญลักษณ์แล้วกดดูใหม่</p>";
  }

  function renderPanel() {
    var p = state.preview;
    var D = E();
    if (!p) return '<p class="dj-panel-hint">ยังไม่ได้ดู — กด “ดูว่ากฎบอกอะไร” ระบบจะดึงราคาปิดและบอกผลกฎทั้ง 3 ข้อ</p>';
    var out = "";
    if (p.status !== "loading" && !previewMatchesForm()) {
      out += '<p class="dj-warn">สัญลักษณ์หรือวันที่เปลี่ยนหลังดูกฎ — กด “ดูว่ากฎบอกอะไร” อีกครั้ง (ด้านล่างเป็นผลของ ' +
        esc((p.symbol || "—") + " · " + (p.date || "—")) + ")</p>";
    }
    if (p.status === "loading") return '<p class="dj-panel-hint" role="status">กำลังดึงราคา ' + esc(p.symbol) + "…</p>";
    if (p.status === "bad-symbol") {
      return out + '<div class="dj-panel-msg is-bad">สัญลักษณ์ต้องเป็นตัวอักษรภาษาอังกฤษ เช่น PTT.BK</div>';
    }
    if (p.status === "failed") {
      return out + '<div class="dj-panel-msg is-bad"><strong>ดึงราคาไม่สำเร็จ · ' + esc(p.symbol) + "</strong>" +
        (p.error ? "<span>" + esc(p.error) + "</span>" : "") + "<span>ยังบันทึกไม่ได้ — ลองกด “ดูว่ากฎบอกอะไร” อีกครั้ง</span></div>";
    }
    var rules = rulesFor(p, convictionNow());
    if (p.status === "blocked") {
      if (p.blocked === "future") return out + '<div class="dj-panel-msg is-bad">วันที่บันทึกอยู่ในอนาคต — เลือกวันนี้หรือวันก่อนหน้า</div>';
      if (p.blocked === "bad-input") return out + '<div class="dj-panel-msg is-bad">วันที่ไม่ถูกต้อง — เลือกวันที่ที่มีอยู่จริงในปฏิทิน</div>';
      return out + '<div class="dj-panel-msg is-bad"><strong>ราคายังไม่มาถึงวันที่บันทึก (ล่าสุด ' + esc(rules.asOfBar || "—") + ")</strong>" +
        "<span>บันทึกไม่ได้จนกว่าราคาของวันนั้นจะมา — ถ้าราคาเก่ากว่าวันที่บันทึกเกิน " + esc(D.MAX_STALE_DAYS) + " วัน ระบบไม่ตัดสินกฎ</span></div>";
    }
    var verdict = D.verdictFor(state.form.action, rules);
    if (p.status === "no-bars") {
      return out + '<div class="dj-panel-msg is-warn"><strong>ไม่มีราคาย้อนหลังพอ ตัดสินกฎไม่ได้</strong>' +
        (p.notFound ? "<span>ไม่พบราคาของ " + esc(p.symbol) + " ที่แหล่งข้อมูล ถ้าพิมพ์ผิด แก้แล้วกดดูใหม่</span>" : "") +
        "<span>บันทึกได้ แต่คำตัดสินจะเป็น “ตัดสินไม่ได้”</span></div>" + bkHint(p.symbol) + verdictBox(verdict);
    }
    var headBits = '<div class="dj-panel-head"><strong>' + esc(p.symbol) + "</strong>" +
      "<span>ใช้ราคาปิด " + esc(rules.asOfBar) + ' · <span class="dj-num">' + fmtNum(rules.close, 2) + "</span></span>";
    if (rules.asOfBar && rules.asOfBar !== p.date) {
      var gap = D.daysBetween(rules.asOfBar, p.date);
      if (typeof gap === "number" && gap > 0) headBits += '<span class="dj-muted">(ก่อนวันที่บันทึก ' + gap + " วัน — วันหยุดหรือแท่งยังไม่ปิด)</span>";
    }
    if (rules.partialBarDropped) headBits += '<span class="dj-muted">แท่งวันนี้ยังไม่ปิด จึงไม่ใช้</span>';
    headBits += "</div>";
    var stale = rules.staleSource
      ? '<p class="dj-warn">ราคามาจากสำเนาบนเซิร์ฟเวอร์ (ดึงสดไม่สำเร็จ) — ตรวจวันที่ของแท่งด้านบนก่อนบันทึก</p>'
      : "";
    return out + headBits + stale + bkHint(p.symbol) + rulesList(rules, verdict) + verdictBox(verdict);
  }

  // อัปเดตเฉพาะจุดเมื่อเปลี่ยนช่องในฟอร์ม (ไม่วาดทั้งหน้า → โฟกัส/คีย์บอร์ดมือถือไม่หลุด และคลิกปุ่มถัดไปไม่หาย)
  function setClass(id, cls) { var el = field(id); if (el) el.className = cls; }
  // ส่วนที่ซ่อน/แสดงและชิปความรู้สึก ให้ตรงกับ state.form (ไม่แตะค่าในช่องกรอก)
  function syncFormChrome() {
    var f = state.form;
    var tradeOk = isTradeAction(f.action);
    setClass("djConvictionWrap", "dj-check" + (f.action === "buy" ? "" : " dj-hidden"));
    setClass("djWithTradeWrap", "dj-check" + (tradeOk ? "" : " dj-hidden"));
    setClass("djTradeFields", "dj-trade-fields" + (f.withTrade && tradeOk ? "" : " dj-hidden"));
    each(E().FEELINGS, function (x) {
      var el = field(feelId(x.key)), on = f.feelings.indexOf(x.key) >= 0;
      if (!el) return;
      el.className = "dj-chip" + (on ? " is-on" : "");
      if (el.setAttribute) el.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }
  function updateFormBits() {
    readForm();
    syncFormChrome();
    var panel = field("djRulePanel");
    if (panel) panel.innerHTML = renderPanel();
    var btn = field("djSaveBtn");
    if (btn) btn.disabled = !canSave();
  }

  function toggleFeeling(key, el) {
    if (!findKey(E().FEELINGS, key)) return;
    var cur = state.form.feelings, next = [], on = cur.indexOf(key) < 0;
    each(E().FEELINGS, function (x) {
      if (x.key === key ? on : cur.indexOf(x.key) >= 0) next.push(x.key);
    });
    state.form.feelings = next;
    if (el) {
      el.className = "dj-chip" + (on ? " is-on" : "");
      if (el.setAttribute) el.setAttribute("aria-pressed", on ? "true" : "false");
    }
  }

  // ---------------- วิธีคิด (ตัวเลขทุกตัวมาจากเอนจิน) ----------------
  // หาเวลาที่แท่งของวันหนึ่ง "ปิดแล้ว" จาก closedBarCutoff ของเอนจินเอง (ไม่พิมพ์ชั่วโมงซ้ำ)
  // ใช้วันพุธ เพื่อไม่ให้ติดเสาร์-อาทิตย์
  function cutoffRule(market) {
    var D = E(), base = "2026-10-21";
    var first = D.closedBarCutoff(market, base + "T00:00");
    for (var h = 1; h < 24; h++) {
      var c = D.closedBarCutoff(market, base + "T" + two(h) + ":00");
      if (c !== first) return { hour: two(h) + ":00", sameDay: c === base };
    }
    return null;
  }
  function cutoffLine(label, market) {
    var r = cutoffRule(market);
    if (!r) return "";
    return "<li>" + esc(label) + ": แท่งของวันใดใช้ได้ตั้งแต่ " + esc(r.hour) + " " +
      (r.sameDay ? "ของวันเดียวกัน" : "ของวันถัดไป") + " (เวลากรุงเทพ)</li>";
  }

  function renderMethod() {
    var D = E();
    var conf = esc(D.CONFIRM_BARS);
    var hz = [];
    each(D.HORIZONS, function (h) { hz.push("+" + h + " (" + horizonLabel(h) + ")"); });
    var body =
      '<details class="dj-method" data-dj-method="1"' + (state.methodOpen ? " open" : "") +
      '><summary>กฎ 3 ข้อ · วิธีตัดสิน · ราคาที่ใช้ · ผลจริง · สถิติ · ไม้จริง</summary><div class="dj-method-body">' +
      "<h3>กฎ 3 ข้อ (" + esc(D.RULES_VERSION) + ")</h3>" +
      "<ul>" +
      "<li><b>กฎ 1 EMA12/EMA26</b> — ซื้อเข้ากฎเมื่อ EMA12 อยู่เหนือ EMA26 · ขายเข้ากฎเมื่อ EMA12 อยู่ใต้ EMA26 · ไม่จำกัดว่าต้องทำในวันที่เส้นตัด</li>" +
      "<li><b>กฎ 2 หลุด SMA200</b> — ขายเข้ากฎเมื่อราคาปิดต่ำกว่า SMA200 ติดต่อกัน ≥ " + conf + " วัน (ต่ำวันเดียวยังไม่นับ)</li>" +
      "<li><b>กฎ 2 ยืนได้</b> — ซื้อเข้ากฎเมื่อราคาปิดเหนือ SMA200 ติดต่อกัน ≥ " + conf + " วัน และเพิ่งตัดขึ้นมาภายใน " +
        esc(D.RECLAIM_MAX_BARS_AGO + 1) + " แท่ง</li>" +
      "<li><b>กฎ 2 แตะหรือเข้าใกล้แล้วเด้ง</b> — ใน " + esc(D.TOUCH_LOOKBACK_BARS) + " แท่งก่อนหน้า ราคาต่ำสุดลงมาแตะหรือเข้าใกล้ SMA200 ในระยะ ±" +
        esc(pctText(D.TOUCH_BAND_PCT)) + " แล้ววันที่ใช้ปิดเหนือเส้นและสูงกว่าวันที่แตะ · ถ้าก่อนหน้านั้นปิดใต้เส้นติดกัน ≥ " + conf +
        " วัน ถือว่าหลุดแล้ว ไม่นับว่าเด้ง ต้องรอ “ยืนได้” แทน</li>" +
      "<li><b>กฎ 3 ย่อ " + esc(pctText(Math.abs(D.DIP_PCT))) + "</b> — ซื้อเข้ากฎเมื่อราคาต่ำกว่าจุดสูงสุด 1 ปี (" + esc(D.HIGH1Y_BARS) +
        " แท่ง) ตั้งแต่ " + esc(pctText(Math.abs(D.DIP_PCT))) + " ขึ้นไป และคุณติ๊กว่าศึกษามาดี/มั่นใจ (ระบบตัดสินข้อนี้แทนไม่ได้) · ข้อนี้ไม่เกี่ยวกับการขาย</li>" +
      "</ul>" +
      "<h3>ตามกฎ / แหกกฎ</h3>" +
      "<ul>" +
      "<li>คิดตอนกดบันทึก แล้วล็อกไว้ แก้ย้อนหลังไม่ได้</li>" +
      "<li><b>ตามกฎ</b> = มีกฎอย่างน้อยหนึ่งข้อสนับสนุนสิ่งที่ทำ · <b>แหกกฎ</b> = ไม่มีกฎข้อไหนสนับสนุน</li>" +
      "<li>ถือต่อ / ไม่ทำอะไร = ไม่ตัดสิน แต่เก็บไว้ว่ากฎบอกอะไรในวันนั้น</li>" +
      "<li>ข้อมูลราคาไม่พอทั้งกฎ 1 และกฎ 2 = ตัดสินไม่ได้ (บันทึกได้ แต่ไม่นับเป็นตามกฎหรือแหกกฎ)</li>" +
      "</ul>" +
      "<h3>ราคาที่ใช้</h3>" +
      "<ul>" +
      "<li>ใช้ราคาปิดรายวันของแท่งที่ปิดตลาดแล้วเท่านั้น แท่งที่ยังไม่ปิดจะไม่ถูกใช้ และหน้าจะบอกวันที่ของแท่งที่ใช้เสมอ</li>" +
      cutoffLine("หุ้นไทยและตลาดเอเชีย", "TH") +
      cutoffLine("หุ้นสหรัฐ", "US") +
      cutoffLine("คริปโต", "CRYPTO") +
      "<li>ถ้าราคาล่าสุดที่มีเก่ากว่าวันที่บันทึกเกิน " + esc(D.MAX_STALE_DAYS) + " วัน จะบันทึกไม่ได้ จนกว่าราคาจะมาถึง</li>" +
      "</ul>" +
      "<h3>ผลจริงภายหลัง</h3>" +
      "<ul>" +
      "<li>ระบบเติมราคาจริงที่ " + esc(hz.join(" / ")) + " วันปฏิทินหลังวันที่บันทึก เมื่อแท่งของวันนั้นปิดแล้ว</li>" +
      "<li>ราคาขยับไม่เกิน ±" + esc(pctText(D.FLAT_BAND_PCT)) + " นับเป็น “ทรงตัว” ทั้งเรื่องคาดถูก/คาดผิด และผลของการซื้อ/ขาย (ไม่นับว่าดีหรือไม่ดี)</li>" +
      "<li>ถ้าราคาย้อนหลังต่างจากที่บันทึกไว้เกิน " + esc(pctText(D.BASIS_TOLERANCE_PCT)) + " (เช่น แตกพาร์) จะเทียบจากชุดราคาปัจจุบันและบอกไว้ที่บันทึกนั้น</li>" +
      "</ul>" +
      "<h3>สถิติ</h3>" +
      "<ul>" +
      "<li>นับเฉพาะบันทึกที่ครบกำหนดตามช่วงที่คาดไว้ (" + esc(hz.join(" / ")) + ") และแท่งของวันนั้นปิดแล้ว · บันทึกที่ลบแล้วไม่นับ</li>" +
      "<li><b>ผลดี</b> = จำนวนที่ผลดี ÷ จำนวนการซื้อ/ขายที่ครบกำหนด · ผลดีคือซื้อแล้วราคาขึ้น หรือขายแล้วราคาลง เกิน ±" +
        esc(pctText(D.FLAT_BAND_PCT)) + " (ขยับไม่เกินนั้นคือทรงตัว ไม่นับว่าดี)</li>" +
      "<li><b>เฉลี่ยในทิศที่ทำ</b> = ค่าเฉลี่ยการเปลี่ยนแปลงของราคา โดยกลับเครื่องหมายให้การขาย (ขายแล้วราคาลงนับเป็นบวก)</li>" +
      "<li><b>คาดถูก</b> = คาดถูก ÷ (คาดถูก + คาดผิด + ทรงตัว) · คาดว่าไม่แน่ใจไม่นับ</li>" +
      "<li>อารมณ์ติ๊กได้หลายอัน บันทึกหนึ่งจึงนับในทุกอารมณ์ที่ติ๊ก</li>" +
      "<li>กลุ่มที่มีน้อยกว่า " + esc(D.MIN_STAT_N) + " รายการ แสดงแค่จำนวน พร้อมคำว่า “ยังน้อยเกินสรุป”</li>" +
      "</ul>" +
      "<h3>ไม้จริง</h3>" +
      "<ul>" +
      "<li>ไม้ขายจับคู่กับไม้ซื้อที่เก่าสุดก่อน (FIFO) · หักค่าธรรมเนียมตามสัดส่วนที่จับคู่ได้</li>" +
      "<li>กำไร/ขาดทุนแยกตามสกุลเงิน ไม่แปลงค่าเงิน · สัญลักษณ์หนึ่งใช้สกุลเดียว</li>" +
      "<li>ถ้ามีการแตกพาร์ ให้แก้จำนวน/ราคาไม้เองตามโบรกเกอร์</li>" +
      "</ul>" +
      "</div></details>";
    var disclaimer = '<p class="dj-disclaimer">หน้านี้บอกแค่ว่ากฎที่คุณตั้งเองพูดว่าอะไร และราคาจริงเป็นอย่างไรภายหลัง — ไม่ใช่คำแนะนำการลงทุน</p>';
    return block("djMethod", "วิธีคิด", "", body + '<div id="djBackup" class="dj-backup">' + backupInner() + "</div>" + disclaimer);
  }

  // ---------------- สำรองข้อมูล: ส่งออก / นำเข้าไฟล์ .json (สเปก §6 · แบบ thai-dr-page.js) ----------------
  // ส่งออก = doc ทั้งก้อน (รวมรายการที่ลบแล้ว — ไม่งั้นนำไปกู้ที่เครื่องอื่นแล้วรายการที่ลบจะกลับมา)
  //   ล็อกความเป็นส่วนตัวอยู่ = ไม่ส่งออก (ไฟล์มีจำนวนหน่วยและราคาไม้จริง)
  // นำเข้า = รวมตาม id แบบเดียวกับการซิงก์ (updatedAt ใหม่กว่าชนะ · เท่ากันใช้ของในหน้า) แล้วส่งขึ้นเซิร์ฟเวอร์ (GET สด → merge → PUT)
  //   รายการที่เซิร์ฟเวอร์จะปฏิเสธ (itemProblems) ไม่ส่ง — ข้ามและบอกว่ากี่รายการ เพราะอะไร
  function usageLine() {
    var u = docUsage();
    if (!u) return "";
    return "ใช้พื้นที่บันทึกไปแล้ว " + (u.pct < 1 ? "น้อยกว่า 1%" : u.pct + "%") + " ของที่เซิร์ฟเวอร์รับ";
  }
  function ioInner() {
    var out = "";
    var li = state.lastImport, s = state.syncState;
    if (li && (s === "saving" || s === "saved" || s === "draft" || s === "error")) {
      out += '<span class="dj-save-status">' + syncPill() + '<span class="dj-sync-note">' + esc(li.text) + "</span></span>";
    }
    if (state.ioMsg) {
      out += '<p class="dj-io-msg ' + esc(state.ioMsg.cls) + '" role="' + (state.ioMsg.cls === "is-bad" ? "alert" : "status") + '">' +
        esc(state.ioMsg.text) + "</p>";
    }
    return out;
  }
  function backupInner() {
    var has = !!state.doc;
    var usage = usageLine();
    return '<div class="dj-backup-text"><strong>สำรองข้อมูล</strong>' +
      // รวมทีละรายการตาม id: รายการเดียวกันใช้ฉบับที่แก้ล่าสุด — ถ้าในไฟล์ลบไว้ใหม่กว่า ก็ลบที่นี่ด้วย
      // (เดิมเขียนว่า "ไม่ลบของที่มีอยู่" ซึ่งไม่จริงเมื่อไฟล์มีการลบที่ใหม่กว่า)
      "<span>ส่งออกบันทึกและไม้จริงทั้งหมดเป็นไฟล์ .json · นำเข้าแล้วรวมกับของเดิมทีละรายการ — รายการเดียวกันใช้ฉบับที่แก้ล่าสุด (รวมถึงการลบ) รายการที่มีแค่ฝั่งเดียวเก็บไว้ทั้งหมด</span>" +
      (usage ? '<span class="dj-muted">' + esc(usage) + "</span>" : "") + "</div>" +
      '<div class="dj-backup-btns">' +
      '<button type="button" class="dj-btn" data-dj-export="1"' + (!has || state.locked ? " disabled" : "") + ">ส่งออกไฟล์</button>" +
      // ระหว่างบันทึก ช่องไฟล์ถูกปิด — ป้ายที่มองเห็นต้องดูปิดด้วย ไม่งั้นกดแล้วเงียบ
      '<label class="dj-btn dj-file' + (state.saving ? " is-disabled" : "") + '"' + (state.saving ? ' aria-disabled="true"' : "") +
      '>นำเข้าไฟล์<input type="file" class="dj-file-input" accept=".json,application/json" data-dj-import="1"' +
      (state.saving ? " disabled" : "") + "></label></div>" +
      (state.locked ? '<p class="dj-note">ปลดล็อกความเป็นส่วนตัวก่อนส่งออก — ไฟล์มีจำนวนหน่วยและราคาไม้จริง</p>' : "") +
      '<div id="djIoBox" class="dj-io">' + ioInner() + "</div>";
  }

  function exportPayload() {
    var D = E();
    return { v: D.VERSION, exportedAt: nowIso(), doc: clone(state.doc || D.emptyDoc()) };
  }

  function exportFile() {
    var D = E();
    if (state.locked) {
      state.ioMsg = { cls: "is-warn", text: "ปลดล็อกความเป็นส่วนตัวก่อนส่งออก — ไฟล์มีจำนวนหน่วยและราคาไม้จริง" };
      safeRender("ส่งออก");
      return false;
    }
    if (!state.doc) {
      state.ioMsg = { cls: "is-bad", text: "ยังไม่มีข้อมูลให้ส่งออก — รอโหลดบันทึกก่อน" };
      safeRender("ส่งออก");
      return false;
    }
    var payload = exportPayload();
    var name = "decision-journal-" + todayYmd() + ".json";
    try {
      var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) { /* ไม่เป็นไร */ } }, 1000);
    } catch (e) {
      state.ioMsg = { cls: "is-bad", text: "ส่งออกไม่สำเร็จ (" + String((e && e.message) || e || "") + ")" };
      safeRender("ส่งออก");
      return false;
    }
    var gone = 0;
    each(payload.doc.entries, function (x) { if (x && x.deletedAt) gone++; });
    each(payload.doc.trades, function (x) { if (x && x.deletedAt) gone++; });
    state.ioMsg = { cls: "is-good", text: "ส่งออกแล้ว: บันทึก " + D.liveEntries(payload.doc).length + " · ไม้จริง " + D.liveTrades(payload.doc).length +
      (gone ? " (รวมรายการที่ลบแล้ว " + gone + " ไว้ในไฟล์ด้วย)" : "") + " — " + name +
      (state.serverLoaded ? "" : " · ยังไม่รู้ว่าบนเซิร์ฟเวอร์มีอะไรเพิ่ม ไฟล์นี้มีเฉพาะที่อยู่ในเครื่องนี้") };
    safeRender("ส่งออก");
    return true;
  }

  // obj = ไฟล์ที่ส่งออกจากหน้านี้ { v, exportedAt, doc } หรือ doc ตรง ๆ { v, entries, trades } → Promise<boolean>
  function importPayload(obj) {
    var D = E();
    state.ioMsg = null;
    state.lastImport = null;
    function no(text) {
      state.ioMsg = { cls: "is-bad", text: text };
      safeRender("นำเข้าไม่สำเร็จ");
      return Promise.resolve(false);
    }
    if (state.saving) return no("กำลังบันทึกรายการก่อนหน้าอยู่ — รอสักครู่แล้วนำเข้าอีกครั้ง");
    var top = obj && typeof obj === "object" && !Array.isArray(obj) ? obj : null;
    var src = top ? (top.doc !== undefined ? top.doc : top) : null;
    if (!src || typeof src !== "object" || Array.isArray(src) || !Array.isArray(src.entries) || !Array.isArray(src.trades)) {
      return no("ไฟล์นี้ไม่ใช่ไฟล์สำรองของ Decision Journal (ต้องมีรายการบันทึกและไม้จริง) — ไม่ได้นำเข้า");
    }
    if (src.v !== undefined && src.v !== D.VERSION) {
      return no("ไฟล์นี้ไม่ใช่ไฟล์สำรองของ Decision Journal เวอร์ชันที่หน้านี้รู้จัก (v" + String(src.v) + ") — ไม่ได้นำเข้า");
    }
    var cur = {};
    if (state.doc) {
      each(state.doc.entries, function (x) { if (x && typeof x.id === "string") cur["e:" + x.id] = x; });
      each(state.doc.trades, function (x) { if (x && typeof x.id === "string") cur["t:" + x.id] = x; });
    }
    var entries = [], trades = [], bad = 0, why = [], fresh = 0, updated = 0, same = 0;
    function stamp(x) { return x && typeof x.updatedAt === "string" ? x.updatedAt : ""; }
    function take(list, prefix, out) {
      each(list, function (it) {
        var probs = D.itemProblems(it);
        var copy = null;
        if (!probs.length) {
          try { copy = clone(it); } catch (e) { probs = ["not-object"]; }
        }
        if (probs.length) {
          bad++;
          each(probs, function (code) { var th = PROBLEM_TH[code] || code; if (why.indexOf(th) < 0) why.push(th); });
          return;
        }
        var have = cur[prefix + copy.id];
        if (!have) fresh++;
        else if (stamp(copy) > stamp(have)) updated++;
        else same++;
        out.push(copy);
      });
    }
    take(src.entries, "e:", entries);
    take(src.trades, "t:", trades);
    var skipped = bad ? " · ข้าม " + bad + " รายการที่ข้อมูลไม่ครบตามที่เซิร์ฟเวอร์รับ (" + why.join(" · ") + ")" : "";
    if (!entries.length && !trades.length) return no("ไม่มีรายการที่นำเข้าได้" + skipped + " — ไม่ได้ส่ง");
    if (!fresh && !updated && state.serverLoaded) {
      state.ioMsg = { cls: bad ? "is-warn" : "is-muted", text: "ไม่มีอะไรใหม่ในไฟล์ — ทุกรายการมีอยู่แล้วในฉบับเดียวกันหรือใหม่กว่า ไม่ได้ส่ง" + skipped };
      safeRender("นำเข้า");
      return Promise.resolve(true);
    }
    // ไฟล์ไว้ก่อน doc ของหน้า → ตราประทับเท่ากันใช้ของในหน้า (mergeDocs ให้ชุดหลังชนะเมื่อเท่ากัน)
    var local = D.mergeDocs({ v: D.VERSION, updatedAt: null, entries: entries, trades: trades }, state.doc || D.emptyDoc());
    var bytes = D.docBytes(local);
    if (bytes > D.MAX_DOC_BYTES) {
      return no("รวมไฟล์นี้แล้วเกินพื้นที่ที่เซิร์ฟเวอร์รับ (" + fmtNum(bytes / D.MAX_DOC_BYTES * 100, 0) + "%) — ไม่ได้นำเข้า");
    }
    state.doc = local;
    try { state.symbols = buildSymbols(); } catch (e) { /* รายการสัญลักษณ์เก่ายังใช้ได้ */ }
    state.lastSave = null;
    state.lastTrade = null;
    state.lastReview = null;
    state.lastImport = { text: "นำเข้า ใหม่ " + fresh + " · อัปเดต " + updated + " รายการ" };
    state.ioMsg = skipped ? { cls: "is-warn", text: "นำเข้าแล้วบางส่วน" + skipped } : null;
    return putDoc(local).then(afterDocChange);
  }

  function importFile(el) {
    var f = el && el.files && el.files[0];
    if (!f) return;
    state.ioMsg = null;
    state.lastImport = null;
    var rd;
    try { rd = new FileReader(); } catch (e) {
      state.ioMsg = { cls: "is-bad", text: "เบราว์เซอร์นี้อ่านไฟล์ไม่ได้ — ไม่ได้นำเข้า" };
      safeRender("นำเข้า");
      return;
    }
    rd.onload = function () {
      var j;
      try { j = JSON.parse(String(rd.result)); } catch (e) {
        state.ioMsg = { cls: "is-bad", text: "อ่านไฟล์ไม่ได้ — ต้องเป็นไฟล์ .json ที่ส่งออกจากหน้านี้ (ไม่ได้นำเข้า)" };
        safeRender("นำเข้า");
        return;
      }
      importPayload(j);
    };
    rd.onerror = function () {
      state.ioMsg = { cls: "is-bad", text: "อ่านไฟล์ไม่สำเร็จ — ลองเลือกไฟล์ใหม่ (ไม่ได้นำเข้า)" };
      safeRender("นำเข้า");
    };
    rd.readAsText(f);
    try { el.value = ""; } catch (e) { /* เลือกไฟล์เดิมซ้ำไม่ได้ก็ไม่เป็นไร */ }
  }

  // ช่องในฟอร์มที่ผู้ใช้กำลังพิมพ์/เลือกอยู่ (null = ไม่มี) — ถ้ามี ห้ามวาดฟอร์มใหม่ทั้งก้อน
  //   (innerHTML ทั้งก้อนทำให้เคอร์เซอร์กระโดด และคำที่ IME ภาษาไทยกำลังประกอบบนมือถือหลุด)
  var FORM_FIELD_IDS = ["djSymbol", "djDate", "djEvent", "djDirection", "djHorizon", "djAction", "djConviction",
    "djPlan", "djWithTrade", "djQty", "djPrice", "djFee", "djCurrency"];
  function focusedFormField() {
    var a;
    try { a = document.activeElement; } catch (e) { return null; }
    if (!a || !a.id || FORM_FIELD_IDS.indexOf(a.id) < 0) return null;
    return field(a.id) === a ? a : null;
  }
  // เนื้อในของ <section> ที่ block() สร้าง (แท็กเปิดไม่มี ">" ในค่า attribute)
  function innerOf(sectionHtml) {
    var i = sectionHtml.indexOf(">");
    var j = sectionHtml.lastIndexOf("</section>");
    return sectionHtml.slice(i + 1, j < 0 ? sectionHtml.length : j);
  }
  function setInner(id, h) { var el = field(id); if (el) el.innerHTML = h; return el; }
  // วาดเนื้อในของ section ใหม่ และตามคลาสของ section ด้วย (เช่น dj-hidden ของคิวทบทวนที่ว่าง/มีรายการ)
  function setSection(id, sectionHtml) {
    var el = setInner(id, innerOf(sectionHtml));
    if (!el) return null;
    var m = /^<section[^>]*\sclass="([^"]*)"/.exec(sectionHtml);
    if (m) el.className = m[1];
    return el;
  }

  // ระหว่างที่ผู้ใช้อยู่ในช่องของฟอร์ม: วาดใหม่เฉพาะส่วนนอกฟอร์ม + จุดที่เปลี่ยนตามสถานะในฟอร์ม
  // ช่องกรอกทุกช่องไม่ถูกแตะ (ค่า · เคอร์เซอร์ · IME อยู่ครบ)
  function renderAroundForm() {
    var others = [
      ["djSummary", renderSummary], ["djReview", renderReview], ["djLog", renderLog],
      ["djTrades", renderTrades], ["djStats", renderStats]
    ];   // djMethod: วาดใหม่เฉพาะกล่องสำรองข้อมูล (refreshBackup) — ตัวคำอธิบายมีแต่ค่าคงที่ของเอนจิน
    each(others, function (o) {
      var el = setSection(o[0], o[1]());
      if (el) wire(el);
    });
    refreshBackup();
    setInner("djSymbols", symbolOptions());
    setInner("djRulePanel", renderPanel());
    setInner("djFormMsgBox", formMsgHtml());
    setInner("djSaveStatus", saveStatusInner());
    var pb = field("djPreviewBtn");
    if (pb) {
      pb.disabled = previewLoading();
      pb.innerHTML = esc(previewLabel());
    }
    var sb = field("djSaveBtn");
    if (sb) sb.disabled = !canSave();
    syncFormChrome();
  }

  // ระหว่างที่ผู้ใช้พิมพ์บทเรียนในคิวทบทวน: วาดใหม่ทุกส่วนยกเว้นคิวทบทวน (ช่องที่พิมพ์อยู่ไม่ถูกแตะ)
  //   คิวจะตามสถานะล่าสุดในการวาดครั้งถัดไปที่ผู้ใช้ไม่ได้อยู่ในช่องบทเรียน
  function focusedLessonField() {
    var a;
    try { a = document.activeElement; } catch (e) { return null; }
    if (!a || typeof a.id !== "string" || a.id.indexOf("djLesson-") !== 0) return null;
    return field(a.id) === a ? a : null;
  }
  function renderAroundReview() {
    var others = [
      ["djSummary", renderSummary], ["djNew", renderNew], ["djLog", renderLog],
      ["djTrades", renderTrades], ["djStats", renderStats]
    ];
    each(others, function (o) {
      var el = setSection(o[0], o[1]());
      if (el) wire(el);
    });
    refreshBackup();
  }
  // กล่องสำรองข้อมูลใน djMethod (ปุ่มส่งออก/นำเข้า · ข้อความผล · พื้นที่ที่ใช้) — ไม่แตะ <details> ที่ผู้ใช้อาจเปิดอ่านอยู่
  function refreshBackup() {
    var el = setInner("djBackup", backupInner());
    if (el) wire(el);
  }

  // ระหว่างที่ผู้ใช้อยู่ในช่องของฟอร์มไม้จริง: วาดใหม่ทุกส่วนนอกฟอร์มไม้ + ตารางในส่วนไม้จริง (ช่องกรอกไม่ถูกแตะ)
  function focusedTradeField() {
    var a;
    try { a = document.activeElement; } catch (e) { return null; }
    if (!a || !a.id || TRADE_FIELD_IDS.indexOf(a.id) < 0) return null;
    return field(a.id) === a ? a : null;
  }
  function renderAroundTradeForm() {
    var others = [
      ["djSummary", renderSummary], ["djReview", renderReview], ["djNew", renderNew],
      ["djLog", renderLog], ["djStats", renderStats]
    ];
    each(others, function (o) {
      var el = setSection(o[0], o[1]());
      if (el) wire(el);
    });
    var parts = tradeParts();
    if (parts) {
      var top = setInner("djTradesTop", parts.top);
      if (top) wire(top);
      var list = setInner("djTradesList", parts.list);
      if (list) wire(list);
    }
    setInner("djTFormMsgBox", tradeMsgHtml());
    setInner("djTStatus", tradeStatusInner());
    var b = field("djTSubmit");
    if (b) b.disabled = !!state.saving;
    refreshBackup();
  }

  function render() {
    var root = document.getElementById(ROOT_ID);
    if (!root) return;
    state.locked = privacyLocked();
    if (!E()) {
      root.innerHTML = '<div class="dj-empty"><strong>โหลดส่วนคำนวณของหน้าไม่สำเร็จ</strong>ลองรีเฟรชหน้าอีกครั้ง</div>';
      return;
    }
    readForm();                                  // เก็บสิ่งที่พิมพ์ค้างไว้ก่อนวาดใหม่
    readReviewInputs();
    if (tradeFormFromState) tradeFormFromState = false;   // เพิ่งตั้งฟอร์มไม้จากโค้ด — ค่าใน state คือของจริง
    else readTradeForm();
    if (focusedFormField() && field("djNew")) {
      renderAroundForm();
      return;
    }
    if (focusedLessonField() && field("djReview")) {
      renderAroundReview();
      return;
    }
    if (focusedTradeField() && field("djTrades")) {
      renderAroundTradeForm();
      return;
    }
    var activeId = null;
    try { activeId = document.activeElement && document.activeElement.id ? document.activeElement.id : null; } catch (e) { activeId = null; }
    root.innerHTML = renderSummary() + renderReview() + renderNew() + renderLog() + renderTrades() + renderStats() + renderMethod();
    wire(root);
    if (activeId) {
      var again = field(activeId);
      if (again && typeof again.focus === "function") { try { again.focus(); } catch (e) { /* ไม่เป็นไร */ } }
    }
  }

  function wire(root) {
    each(root.querySelectorAll("[data-dj-reload]"), function (el) {
      el.addEventListener("click", function () { load(true); });
    });
    each(root.querySelectorAll("[data-dj-retry]"), function (el) {
      el.addEventListener("click", function () { retrySync(); });
    });
    each(root.querySelectorAll("[data-dj-feel]"), function (el) {
      el.addEventListener("click", function () { toggleFeeling(el.getAttribute("data-dj-feel"), el); });
    });
    each(root.querySelectorAll("[data-dj-preview]"), function (el) {
      el.addEventListener("click", function () { previewRules(); });
    });
    each(root.querySelectorAll("[data-dj-save]"), function (el) {
      el.addEventListener("click", function () { save(); });
    });
    each(root.querySelectorAll("[data-dj-field]"), function (el) {
      var name = el.getAttribute("data-dj-field");
      el.addEventListener("change", function () { updateFormBits(); });
      if (name === "symbol" || name === "date") el.addEventListener("input", function () { updateFormBits(); });
    });
    // ไทม์ไลน์: ตัวกรอง · ลบ (ยืนยันก่อน) · ดึงราคาผลจริงใหม่
    each(root.querySelectorAll("[data-dj-filter]"), function (el) {
      el.addEventListener("change", function () { setFilter(el.getAttribute("data-dj-filter"), el.value); });
    });
    each(root.querySelectorAll("[data-dj-filter-clear]"), function (el) {
      el.addEventListener("click", function () { state.filters = {}; render(); });
    });
    each(root.querySelectorAll("[data-dj-del]"), function (el) {
      el.addEventListener("click", function () {
        state.confirmDelId = el.getAttribute("data-dj-del");
        state.logMsg = null;
        render();
      });
    });
    each(root.querySelectorAll("[data-dj-del-cancel]"), function (el) {
      el.addEventListener("click", function () { state.confirmDelId = null; render(); });
    });
    each(root.querySelectorAll("[data-dj-del-confirm]"), function (el) {
      el.addEventListener("click", function () { deleteEntry(el.getAttribute("data-dj-del-confirm")); });
    });
    each(root.querySelectorAll("[data-dj-outcomes-retry]"), function (el) {
      el.addEventListener("click", function () { loadOutcomes(); });
    });
    // คิวทบทวน: เลือกถูก/ผิด/ก้ำกึ่ง ("<id>:<verdict>") · บันทึก (อ่านบทเรียนจากช่องตอนกด)
    each(root.querySelectorAll("[data-dj-review-verdict]"), function (el) {
      el.addEventListener("click", function () {
        var v = String(el.getAttribute("data-dj-review-verdict") || "");
        var cut = v.lastIndexOf(":");
        if (cut > 0) setReviewVerdict(v.slice(0, cut), v.slice(cut + 1));
      });
    });
    each(root.querySelectorAll("[data-dj-review-save]"), function (el) {
      el.addEventListener("click", function () {
        var id = el.getAttribute("data-dj-review-save");
        var d = reviewDraftOf(id);
        var box = field(lessonId(id));
        saveReview(id, { selfVerdict: d.selfVerdict, lesson: box && box.value != null ? String(box.value) : d.lesson });
      });
    });
    // ไม้จริง: เพิ่ม / แก้ (เติมฟอร์ม → บันทึกการแก้ไข) / ลบ (ยืนยันก่อน)
    each(root.querySelectorAll("[data-dj-trade-add]"), function (el) {
      el.addEventListener("click", function () { readTradeForm(); addTrade(clone(state.tradeForm), true); });
    });
    each(root.querySelectorAll("[data-dj-trade-update]"), function (el) {
      el.addEventListener("click", function () {
        readTradeForm();
        updateTrade(el.getAttribute("data-dj-trade-update"), clone(state.tradeForm), true);
      });
    });
    each(root.querySelectorAll("[data-dj-trade-edit]"), function (el) {
      el.addEventListener("click", function () { startTradeEdit(el.getAttribute("data-dj-trade-edit")); });
    });
    each(root.querySelectorAll("[data-dj-trade-edit-cancel]"), function (el) {
      el.addEventListener("click", function () { cancelTradeEdit(); render(); });
    });
    each(root.querySelectorAll("[data-dj-trade-del]"), function (el) {
      el.addEventListener("click", function () {
        state.tradeConfirmDelId = el.getAttribute("data-dj-trade-del");
        state.tradeMsg = null;
        render();
      });
    });
    each(root.querySelectorAll("[data-dj-trade-del-cancel]"), function (el) {
      el.addEventListener("click", function () { state.tradeConfirmDelId = null; render(); });
    });
    each(root.querySelectorAll("[data-dj-trade-del-confirm]"), function (el) {
      el.addEventListener("click", function () { deleteTrade(el.getAttribute("data-dj-trade-del-confirm")); });
    });
    // วิธีคิด: จำว่าเปิด <details> อยู่ไหม · สำรองข้อมูล: ส่งออก / นำเข้าไฟล์
    each(root.querySelectorAll("[data-dj-method]"), function (el) {
      el.addEventListener("toggle", function () { state.methodOpen = !!el.open; });
    });
    each(root.querySelectorAll("[data-dj-export]"), function (el) {
      el.addEventListener("click", function () { exportFile(); });
    });
    each(root.querySelectorAll("[data-dj-import]"), function (el) {
      el.addEventListener("change", function () { importFile(el); });
    });
  }

  // ---------------- boot ----------------
  function boot() {
    try {
      document.addEventListener(PRIVACY_EVENT, function () { onPrivacyChanged(); });
    } catch (e) { /* ไม่มี event ก็ยังใช้หน้าได้ แค่ไม่ re-render ทันที */ }
    render();
    load(false);
  }

  window.DecisionJournalPage = {
    render: render,
    load: load,
    _state: state,
    _nowBangkok: nowBangkok,
    _previewRules: previewRules,
    _save: save,
    _fetchBars: function (symbol, startYmd) {
      return fetchBars(symbol, startYmd).then(function (r) { return { bars: r.bars, sourceType: r.sourceType, ok: r.ok, error: r.error || null }; });
    },
    _putDoc: putDoc,
    _readDraft: readDraft,
    _clearDraft: clearDraft,
    _loadOutcomes: loadOutcomes,
    _deleteEntry: deleteEntry,
    _setFilter: setFilter,
    _saveReview: saveReview,
    _addTrade: function (input) { return addTrade(input, false); },
    _updateTrade: function (id, patch) { return updateTrade(id, patch, false); },
    _deleteTrade: deleteTrade,
    _lastCloses: lastCloses,
    _money: money,
    _exportPayload: exportPayload,
    _importPayload: importPayload
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
