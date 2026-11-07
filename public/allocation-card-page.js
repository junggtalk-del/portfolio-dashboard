(function () {
  "use strict";
  // ============================================================
  // Asset allocation card — หน้า (การ์ดบน /portfolio ใน #acRoot)
  //
  // ตอบคำถามเดียว: เงินอยู่ที่ไหน — 5 ก้อน (Bitcoin · หุ้นต่างประเทศ · กองทุนหุ้น (เงินสำรองเลี้ยงชีพ) · กองทุน RMF · หุ้นไทย)
  // ลงทุนจริงเท่าไร รอซื้อเท่าไร · เงินสดใน Editor อยู่ตรงไหนของกรอบที่ผู้ใช้ตั้งเอง
  //
  // แหล่งตัวเลข: R ชุดเดียวกับส่วนหัวของหน้า position — รับทาง event "portfolio-position-rendered"
  //   (detail { R, data }) หรือ PortfolioPositionPage.last ถ้าหน้า position วาดไปก่อนไฟล์นี้โหลด
  //   ไม่คำนวณเอง: AllocationCard.compute(R, plan) (allocation-card-engine.js) แล้วไฟล์นี้ปัด/จัดรูปเท่านั้น
  //   กรอบเงินสดอ่านจาก data.allocationPlan (เอกสาร /api/portfolio) ผ่าน normalizePlan
  //
  // ตั้งกรอบเงินสด (ปุ่ม data-ac-settings → ฟอร์ม data-ac-form เหนือแถบเงินสด):
  //   - ช่อง min / max เป็นล้านบาท · พิมพ์แล้วแถบเงินสดเปลี่ยนทันที (ตัวอย่างจาก state.form ยังไม่บันทึก)
  //   - บันทึก = persistPlan: GET /api/portfolio สด → เอกสารว่าง (ไม่มีไตรมาส) = ไม่ PUT
  //     → สำเนาทุกคีย์ของเอกสารบน server → ตั้ง allocationPlan (บาท + updatedAt) → PUT { data }
  //     สำเร็จ → ยิง "portfolio-allocation-saved" (หน้า position adopt เอกสารชุดนี้แล้ววาดใหม่)
  //     ล้มเหลว → เก็บร่าง localStorage "allocation_plan_draft_v1" + ปุ่มลองใหม่ (data-ac-retry)
  //   - เปิดหน้าแล้วมีร่าง → แสดงร่างก่อน ("ใช้ค่าที่ยังไม่ได้บันทึก") แล้วลองส่งเองหนึ่งครั้ง
  //   - ร่างถูกล้างหลัง PUT สำเร็จเท่านั้น
  //
  // ข้อตกลง:
  //   - ES5 เท่านั้น · ข้อความไทย · ไม่มีข้อความชี้นำให้โยกเงิน (แถบเงินสดบอกแค่ ต่ำกว่า / ในกรอบ / สูงกว่ากรอบ
  //     และกล่องกติกาเป็นการทวนกติกาของผู้ใช้เอง)
  //   - เงินเป็นข้อความ "฿… ล้าน" ในโหนดข้อความเดียว ให้ privacy.js ซ่อนได้ · ห้ามใส่เงินใน title / aria-label
  //     ล็อกอยู่: แถบเงินสดไม่มีจุด "ตอนนี้" และคำสถานะ (สองอย่างนี้บอกยอดเงินสดได้โดยไม่มี ฿)
  //     ช่องในฟอร์มวาดว่าง (placeholder ล็อกอยู่) · เว้นว่างตอนบันทึก = คงค่าเดิมฝั่งนั้น
  //   - ทุกข้อความที่มาจากข้อมูลผ่าน esc()
  //   - เขียนเฉพาะ #acRoot — #ppRoot / #aaRoot เป็นของหน้าอื่น
  // ============================================================

  var ROOT_ID = "acRoot";
  // ---- ป้ายตัวเลขของแต่ละส่วนในแท่ง: อยู่ในส่วนนั้นเมื่อสูงพอ · ไม่พอ → ป้ายลอย (pill) เหนือยอดแท่ง
  //   (ผู้ใช้สั่ง 2026-11-07 หลัง implement: ตัวเลขรอซื้อต้องอยู่ในกรอบประ อ่านชัด · ใส่ไม่พอดีให้ขึ้นไปอยู่บนกรอบประ)
  //   ตัดสินแยกสองขนาดจอ: d = จอกว้าง · m = จอ ≤600px — ทุกตัวเลขข้างล่างต้องตรงกับ portfolio-position.css
  //   (line-height ของทุกบรรทัดเป็น px — ความสูงป้ายจึงคิดได้ตรง ไม่ขึ้นกับฟอนต์)
  // ความสูงที่แท่ง 100% ใช้ (px) = .ac-chart { height } − ขอบล่าง 1 (box-sizing: border-box) → จอกว้าง 260 − 1 = 259 · ≤600px 200 − 1 = 199
  var CHART_PX = { d: 259, m: 199 };
  // ความสูงที่ป้ายในส่วนต้องใช้ (px) — ส่วนที่สูง ≥ ค่านี้ = ป้ายอยู่ในส่วน:
  //   รอซื้อ จอ ≥1240px : ขอบประบน 2 + padding-top 5 + "รอซื้อ ฿2.2 ล้าน" 16 (13px) + "22% ของ …" 14 (11.5px) + เผื่อล่าง 3 = 40
  //   รอซื้อ จอ 601–1239px (กราฟแคบ — "รอซื้อ" ขึ้นบรรทัดเอง · ไม่มี " ของ …"): 2 + 5 + "รอซื้อ" 16 + "฿2.2 ล้าน" 16 + "22%" 14 + 3 = 56
  //     → ค่า d ใช้ 56 ตัวเดียว (พอทั้งสองแบบ — จอ ≥1240px เหลือที่ว่างใต้ป้าย 16px)
  //   ลงทุน  จอกว้าง (ทั้ง ≥601px): ขอบบน 1 + padding-top 6 + "฿7.8 ล้าน" 17 (14px) + "78% …" 14 (11.5px) + เผื่อล่าง 3 = 41
  //   จอ ≤600px ยอดเงินตัดเป็นสองบรรทัด "฿2.2" / "ล้าน" (แท่งกว้าง ~44px ที่จอ 360px — ดู portfolio-position.css):
  //   รอซื้อ ≤600px  : ขอบประบน 2 + padding-top 3 + "รอซื้อ" 13 + "฿2.2" 15 + "ล้าน" 15 + "22%" 13 + เผื่อล่าง 2 = 63
  //   ลงทุน  ≤600px  : ขอบบน 1 + padding-top 3 + "฿7.8" 15 + "ล้าน" 15 + "78%" 13 + เผื่อล่าง 2 = 49
  var NEED_PX = { wait: { d: 56, m: 63 }, held: { d: 41, m: 49 } };
  // ป้ายลอย (.ac-pill) สูงเท่าไร (px) — ใช้คิดว่ากองป้ายเหนือแท่งสูงพ้นขอบบนของกราฟไหม (ใช้ค่าสูงสุดของแต่ละจอ):
  //   รอซื้อ จอกว้าง : ขอบประ 2×2 + padding 3×2 + 16 + 14 = 40 (≥1240px) · + "รอซื้อ" บรรทัดเอง 16 = 56 (601–1239px) → 56
  //   ลงทุน  จอกว้าง : ขอบ 1×2 + padding 4×2 + 17 + 14 = 41
  //   รอซื้อ ≤600px  : ขอบประ 2×2 + padding 2×2 + 13 + 15 + 15 + 13 = 64
  //   ลงทุน  ≤600px  : ขอบ 1×2 + padding 2×2 + 15 + 15 + 13 = 49
  var PILL_PX = { wait: { d: 56, m: 64 }, held: { d: 41, m: 49 } };
  // กองป้ายลอย (.ac-float): ห่างยอดแท่ง FLOAT_OFF px · ป้ายห่างกัน FLOAT_GAP px (= bottom / gap ใน CSS)
  var FLOAT_OFF = { d: 5, m: 4 };
  var FLOAT_GAP = { d: 4, m: 3 };
  var LOCKED_TH = "ล็อกอยู่";
  var STATUS_TH = { below: "ต่ำกว่ากรอบ", within: "ในกรอบ", above: "สูงกว่ากรอบ" };
  var SUB = "ตัวเลขทั้งหมดจาก Quarterly Editor (รอซื้อ = ส่วนที่ยังไม่ลงทุนของแต่ละรายการ) · ระบบไม่แนะนำให้โยก";
  var FOOT = "รอซื้อ = ส่วนที่ยังไม่ลงทุนของรายการใน Quarterly Editor (แก้ที่ช่อง ลงทุนแล้วกี่ %) · ภายในแท่ง % = ของก้อนนั้นเอง · ใต้แท่ง % = ทั้งแท่ง (ลงทุนแล้ว + รอซื้อ) เทียบความมั่งคั่งรวม";
  var NO_DATA_TH = "ยังไม่มีข้อมูลใน Quarterly Editor";
  // หน้า position คำนวณไม่ได้ด้วยเหตุอื่นที่ไม่ใช่ "ไม่มีข้อมูล" (เช่น reason "error") — ข้อความเดียวกับส่วนหัวของหน้า
  var LOAD_FAIL_TH = "โหลดข้อมูลไม่สำเร็จ — ลองกด Load Latest Data";
  // ฟอร์มตั้งกรอบเงินสด + บันทึก
  var DRAFT_KEY = "allocation_plan_draft_v1";
  var DRAFT_TH = "ใช้ค่าที่ยังไม่ได้บันทึก";
  var INVALID_TH = "กรอบต้องเป็นตัวเลข ≥ 0 และค่าต่ำต้องไม่เกินค่าสูง";
  var EMPTY_SERVER_TH = "ข้อมูลพอร์ตบน server ว่าง — ยกเลิกการบันทึกเพื่อกันข้อมูลหาย";
  var LOCKED_PH = "ล็อกอยู่ — ใส่ค่าใหม่ได้";

  var state = {
    last: null,          // { R, data } จากหน้า position · null = ยังไม่ได้รับ
    plan: null,          // AllocationCard.normalizePlan(data.allocationPlan) — หรือแผนในร่างที่ยังไม่ได้บันทึก
    form: null,          // ฟอร์มตั้งกรอบเงินสดที่เปิดอยู่: { min, max (ข้อความในช่อง หน่วยล้าน), error } · null = ปิด
    saveState: "idle",   // "idle" | "saving" | "saved" | "error"
    saveError: null,     // เหตุที่บันทึกไม่สำเร็จ (ข้อความไทย)
    draftNotice: null,   // "ใช้ค่าที่ยังไม่ได้บันทึก" ขณะแสดงแผนจากร่าง
    draft: null          // ร่างที่ยังไม่ได้บันทึก { plan, savedAt } (สำเนาในหน่วยความจำของ localStorage)
  };
  // element ของการวาดรอบล่าสุด (ช่อง min/max · ข้อความในฟอร์ม · กล่องแถบเงินสด) — อัปเดตตัวอย่างขณะพิมพ์
  // โดยไม่วาดการ์ดใหม่ทั้งใบ (วาดใหม่ = ช่องที่กำลังพิมพ์หายโฟกัส)
  var ui = { min: null, max: null, msg: null, cash: null };
  var focusNext = null;  // ช่องที่ต้องโฟกัสหลังวาดรอบถัดไป (เปิดฟอร์ม → "min")

  // ---------------------------------------------------------------- helpers
  function AC() { return window.AllocationCard || null; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }
  function isNum(v) { return typeof v === "number" && isFinite(v); }
  // เงินบาท → "฿19.8 ล้าน" (ล้าน 1 ตำแหน่งเสมอ)
  function fmtM(baht) { return isNum(baht) ? "฿" + (baht / 1e6).toFixed(1) + " ล้าน" : "—"; }
  // % 0–100 → จำนวนเต็ม
  function fmtPct(x) { return isNum(x) ? Math.round(x) + "%" : "—"; }
  // คู่ % ที่รวมกันเป็น 100 (ส่วนลงทุน/รอซื้อของแท่ง · ช่องลงทุน/เงินสดทั้งหมด) → [ข้อความ a, ข้อความ b]
  //   ปัดแยกกันได้ 101 (87.5/12.5 → 88/13) → ปัด a แล้ว b = 100 − a · ตัวใดไม่ใช่ตัวเลข → ปัดทีละตัวตามปกติ
  function pairPct(a, b) {
    if (!isNum(a) || !isNum(b)) return [fmtPct(a), fmtPct(b)];
    var r = Math.round(a);
    return [r + "%", (100 - r) + "%"];
  }
  // ตัดศูนย์ท้ายทศนิยม: 1.00 → "1" · 2.50 → "2.5"
  function trimNum(n, d) {
    var s = n.toFixed(d);
    if (s.indexOf(".") >= 0) s = s.replace(/0+$/, "").replace(/\.$/, "");
    return s;
  }
  // ตัวเลขกรอบเงินสดเป็นล้าน ไม่มี .0 ท้าย: 1,000,000 → "1" · 2,500,000 → "2.5"
  function fmtBandM(baht) { return isNum(baht) ? trimNum(baht / 1e6, 2) : "—"; }
  // ค่าเริ่มต้นของช่องในฟอร์ม (ล้าน) — แบบเดียวกับ fmtBandM แต่ละเอียดถึงหลักบาท
  //   (บันทึกโดยไม่แก้ต้องได้ค่าเดิม ไม่ถูกปัดเหลือ 2 ตำแหน่ง) · 1,000,000 → "1" · 1,234,567 → "1.234567"
  function inputM(baht) { return isNum(baht) ? trimNum(baht / 1e6, 6) : ""; }
  // ค่า % สำหรับ style (0–100, ทศนิยมไม่เกิน 2 ตำแหน่ง)
  function cssPct(x) {
    var n = isNum(x) ? Math.max(0, Math.min(100, x)) : 0;
    return String(Math.round(n * 100) / 100);
  }
  function each(list, fn) { for (var i = 0; list && i < list.length; i++) fn(list[i]); }
  // Privacy Lock (privacy.js) — privacy.js ซ่อนข้อความ ฿ เอง แต่ตำแหน่งจุด "ตอนนี้" บนแถบเงินสด
  // และคำสถานะ (ในกรอบ = เงินสดอยู่ระหว่าง ต่ำ–สูง) บอกยอดเงินสดได้ → ตอนล็อกการ์ดไม่วาดสองอย่างนี้เอง
  function privacyLocked() {
    try { return !!(window.PortfolioPrivacy && typeof window.PortfolioPrivacy.isLocked === "function" && window.PortfolioPrivacy.isLocked()); }
    catch (e) { return false; }
  }
  function normalize(raw) { var A = AC(); return A ? A.normalizePlan(raw) : null; }

  // ---------------------------------------------------------------- draft (localStorage)
  // ร่าง = { plan: { cashBand: { min, max } (บาท), updatedAt }, savedAt } — เขียนเมื่อบันทึกล้มเหลว
  // ล้างหลัง PUT สำเร็จเท่านั้น · ร่างผิดรูป (กรอบไม่ผ่าน) = ไม่ใช้
  // กรอบใช้ได้ไหม — กติกาเดียวกับเอนจิน (AllocationCard.validBand: ตัวเลขจำกัด ≥ 0 และ min ≤ max) · ไม่มีเอนจิน = ไม่ผ่าน
  function validBand(b) {
    var A = AC();
    return !!(A && typeof A.validBand === "function" && A.validBand(b));
  }
  function readDraft() {
    try {
      var d = JSON.parse(window.localStorage.getItem(DRAFT_KEY) || "null");
      return d && typeof d === "object" && d.plan && validBand(d.plan.cashBand) ? d : null;
    } catch (e) { return null; }
  }
  // คืนร่างเสมอ (เก็บในหน่วยความจำได้แม้ localStorage ใช้ไม่ได้ — ปุ่มลองใหม่ยังส่งได้)
  function writeDraft(plan) {
    var d = {
      plan: { cashBand: { min: plan.cashBand.min, max: plan.cashBand.max }, updatedAt: plan.updatedAt || null },
      savedAt: new Date().toISOString()
    };
    try { window.localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch (e) {}
    return d;
  }
  function clearDraft() {
    try { window.localStorage.removeItem(DRAFT_KEY); } catch (e) {}
  }

  // ---------------------------------------------------------------- state
  function adopt(last) {
    state.last = last;
    var data = last && last.data;
    // มีร่างที่ยังไม่ได้บันทึก → แสดงร่าง (ค่าล่าสุดที่ผู้ใช้ตั้ง) จนกว่าจะบันทึกสำเร็จ
    state.plan = normalize(state.draft ? state.draft.plan : (data && data.allocationPlan));
  }

  // ---------------------------------------------------------------- form
  // ค่าในช่อง (ล้านบาท) → บาท · ว่าง = คงค่าเดิมฝั่งนั้น (keep) · อ่านไม่ออก / ติดลบ / ไม่จำกัด = NaN
  function sideBaht(raw, keep) {
    var s = String(raw == null ? "" : raw).replace(/^\s+|\s+$/g, "");
    if (s === "") return isNum(keep) ? keep : NaN;
    var n = Number(s);
    if (!isNum(n) || n < 0) return NaN;
    return Math.round(n * 1e6);
  }
  // แผนจากฟอร์ม · null = ปิดอยู่ หรือค่าไม่ผ่าน (ไม่ใช่ตัวเลข / ติดลบ / ค่าต่ำเกินค่าสูง)
  function formPlan() {
    var f = state.form;
    if (!f) return null;
    var b = state.plan && state.plan.cashBand;
    var mn = sideBaht(f.min, b ? b.min : NaN), mx = sideBaht(f.max, b ? b.max : NaN);
    if (!isNum(mn) || !isNum(mx) || mn > mx) return null;
    return { cashBand: { min: mn, max: mx }, updatedAt: null };
  }
  // แผนที่ใช้วาด: ฟอร์มเปิดและค่าผ่าน → ตัวอย่างจากฟอร์ม (ยังไม่บันทึก) · ไม่งั้นแผนที่ถืออยู่
  function viewPlan() { return formPlan() || state.plan; }

  // เปิดฟอร์ม: ค่าเริ่มต้น = กรอบที่ถืออยู่ (ล้าน) · ล็อกอยู่ = ช่องว่าง (เว้นว่าง = คงค่าเดิม)
  function openForm() {
    var b = state.plan && state.plan.cashBand;
    var blank = privacyLocked() || !b;
    state.form = { min: blank ? "" : inputM(b.min), max: blank ? "" : inputM(b.max), error: null };
    if (state.saveState === "saved") state.saveState = "idle";
  }
  // type=number: ข้อความที่เบราว์เซอร์อ่านไม่ออกได้ value "" — ไม่ใช่ "เว้นว่าง = คงค่าเดิม" → เก็บ BAD_INPUT (ไม่ผ่าน)
  var BAD_INPUT = "?";
  function readInput(el) {
    var v = el.value;
    if (v === "" && el.validity && el.validity.badInput) return BAD_INPUT;
    return v == null ? "" : String(v);
  }
  // วาดใหม่ทั้งใบ = ช่องใหม่ที่ว่าง (เบราว์เซอร์ทิ้งข้อความที่อ่านไม่ออก) → ค่าในฟอร์มต้องเป็น "" ด้วย (= คงค่าเดิม)
  // ไม่งั้นช่องดูว่างแต่กดบันทึกแล้วขึ้นว่าค่าไม่ถูก
  function dropBadInput() {
    if (!state.form) return;
    if (state.form.min === BAD_INPUT) state.form.min = "";
    if (state.form.max === BAD_INPUT) state.form.max = "";
  }

  // ---------------------------------------------------------------- save
  function thError(msg) { var e = new Error(msg); e.acTh = true; return e; }

  // GET → สำเนาทุกคีย์ → ตั้ง allocationPlan → PUT เสมอ (ไม่ทับ quarters / allocation ที่อีกแท็บเพิ่งบันทึก)
  // plan = { cashBand: { min, max } (บาท) } · form = ฟอร์มที่ต้องปิดเมื่อจบ (null = ไม่ได้มาจากฟอร์ม: ลองใหม่ / ร่างตอนเปิดหน้า)
  function persistPlan(plan, form) {
    if (state.saveState === "saving") return;
    // ตรวจที่ขอบการเขียน (persistPlan ถูก export) — กรอบไม่ผ่าน = ไม่ GET ไม่ PUT ไม่เขียนร่าง
    if (!validBand(plan && plan.cashBand)) {
      state.saveState = "error";
      state.saveError = INVALID_TH;
      render();
      return;
    }
    var mine ={ cashBand: { min: plan.cashBand.min, max: plan.cashBand.max }, updatedAt: new Date().toISOString() };
    state.saveState = "saving";
    state.saveError = null;
    render();
    var p;
    try { p = window.fetch("/api/portfolio", { cache: "no-store" }); }
    catch (e) { p = Promise.reject(e); }
    p.then(function (r) {
      if (!r || !r.ok) throw thError("อ่านข้อมูลพอร์ตก่อนบันทึกไม่ได้ (HTTP " + (r ? r.status : "?") + ")");
      return r.json();
    }).then(function (j) {
      var data = j && (j.data || (j.quarters ? j : null));
      // กันเคสร้ายแรง: server ตอบเอกสารที่ไม่มีไตรมาส → PUT ทับจะลบพอร์ตทั้งก้อน
      if (!data || !data.quarters || !Object.keys(data.quarters).length) throw thError(EMPTY_SERVER_TH);
      var next = {};
      Object.keys(data).forEach(function (k) { next[k] = data[k]; });   // quarters / allocation คงเดิมทุก byte
      next.allocationPlan = mine;
      return window.fetch("/api/portfolio", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ data: next })
      }).then(function (r2) {
        if (!r2 || !r2.ok) throw thError("server ตอบ HTTP " + (r2 ? r2.status : "?"));
        return next;
      });
    }).then(function (next) { onPersisted(next, form); }, function (e) { onPersistFailed(mine, form, e); });
  }

  function onPersisted(next, form) {
    state.plan = normalize(next.allocationPlan);
    clearDraft();
    state.draft = null;
    state.draftNotice = null;
    if (state.form === form) state.form = null;
    state.saveState = "saved";
    state.saveError = null;
    // หน้า position ฟังอยู่ → adopt เอกสารชุดนี้ + วาดใหม่ → การ์ดได้ portfolio-position-rendered พร้อม allocationPlan ใหม่
    try {
      if (typeof window.CustomEvent === "function" && typeof window.dispatchEvent === "function") {
        window.dispatchEvent(new window.CustomEvent("portfolio-allocation-saved", { detail: { data: next } }));
      }
    } catch (e) {}
    render();
  }

  // ล้มเหลวทุกแบบ (GET/PUT ไม่ ok · เอกสารบน server ว่าง · เน็ตหลุด) → เก็บร่าง แสดงแผนจากร่าง + ปุ่มลองใหม่
  function onPersistFailed(mine, form, e) {
    state.draft = writeDraft(mine);
    state.draftNotice = DRAFT_TH;
    state.plan = normalize(state.draft.plan);
    if (state.form === form) state.form = null;
    state.saveState = "error";
    state.saveError = (e && e.acTh && e.message) || "ติดต่อ server ไม่สำเร็จ";
    render();
  }

  // ---------------------------------------------------------------- actions
  function onSettings() {
    if (state.form) { state.form = null; render(); return; }
    openForm();
    focusNext = "min";
    render();
  }
  function onCancel() {
    state.form = null;
    render();
  }
  function onSave() {
    if (!state.form || state.saveState === "saving") return;
    if (ui.min) state.form.min = readInput(ui.min);
    if (ui.max) state.form.max = readInput(ui.max);
    var plan = formPlan();
    if (!plan) { state.form.error = INVALID_TH; render(); return; }
    state.form.error = null;
    persistPlan(plan, state.form);
  }
  function onRetry() {
    if (state.draft && state.saveState !== "saving") persistPlan(state.draft.plan, null);
  }
  // พิมพ์ → แถบเงินสดเปลี่ยนทันที (วาดเฉพาะกล่องแถบ ช่องที่กำลังพิมพ์ไม่หายโฟกัส) · ค่าผ่านแล้ว → ลบข้อความเตือน
  function onInput(name, el) {
    if (!state.form) return;
    state.form[name] = readInput(el);
    if (state.form.error && formPlan()) {
      state.form.error = null;
      if (ui.msg) { ui.msg.innerHTML = ""; ui.msg.hidden = true; }
    }
    if (ui.cash) {
      var m = model();
      if (m.M) ui.cash.innerHTML = cashHtml(m.M);
    }
  }

  // ---------------------------------------------------------------- view
  function messageCard(text) {
    return '<section class="ac-card"><p class="ac-empty">' + esc(text) + "</p></section>";
  }

  function headHtml(M) {
    var sum = "ความมั่งคั่งรวม " + fmtM(M.wealth) + (M.quarterKey ? " · " + M.quarterKey : "");
    return '<div class="ac-head"><div class="ac-head-t"><h2 class="ac-title">Asset allocation</h2>' +
      '<span class="ac-head-sum">' + esc(sum) + "</span></div>" +
      '<button type="button" class="ac-settings" data-ac-settings="1" aria-expanded="' + (state.form ? "true" : "false") + '">ตั้งกรอบเงินสด</button></div>' +
      '<p class="ac-sub">' + esc(SUB) + "</p>";
  }

  // ช่องภาพรวม 2 ช่อง — ยอดเงินล้วน ไม่มีแถบสี
  // % สองช่องเป็นคู่ที่รวมกันได้ 100 (ความมั่งคั่ง = ลงทุน + เงินสดทั้งหมด) → pairPct ไม่ให้ขึ้น 80% + 21%
  function kpisHtml(M) {
    var others = M.others || { held: 0, wait: 0 };
    var pp = pairPct(M.investedPct, M.cashTotalPct);
    var inv = '<div class="ac-kpi" data-ac-kpi="invested">' +
      '<div class="ac-kpi-l">ลงทุนในสินทรัพย์จริง</div>' +
      '<div class="ac-kpi-v">' + esc(fmtM(M.invested)) + ' <span class="ac-kpi-p">' + esc(pp[0] + " ของความมั่งคั่ง") + "</span></div>" +
      (others.held > 0 ? '<div class="ac-kpi-d">' + esc("รวมอื่น ๆ ที่ไม่มีแท่ง " + fmtM(others.held)) + "</div>" : "") +
      "</div>";
    // แจกแจงให้ตรงกับยอดในช่อง: ยังไม่จัดสรร (= เงินสดใน Editor) + รอซื้อเฉพาะก้อนที่มีส่วนรอซื้อ
    //   ("อื่น ๆ" ไม่มีแท่ง ถ้ามีส่วนที่ยังไม่ลงทุน) (รอซื้อรวม = waitSum) = รวม (= cashTotal ตัวเดียวกับยอดในช่อง)
    //   "เงินสด" ในการ์ดมีความหมายเดียว = เงินสดทั้งหมด · ส่วนเงินสดใน Editor เรียก "ยังไม่จัดสรร" ทุกที่ (ช่องนี้ + แถบเงินสด)
    var waits = [];
    M.classes.forEach(function (c) { if (c.wait > 0) waits.push(c.label + " " + fmtM(c.wait)); });
    if (others.wait > 0) waits.push("อื่น ๆ " + fmtM(others.wait));
    var parts = "ยังไม่จัดสรร " + fmtM(M.cashEditor) +
      (waits.length ? " · รอซื้อ " + waits.join(" · ") + " (รอซื้อรวม " + fmtM(M.waitSum) + ")" : " · ยังไม่มีส่วนที่รอซื้อ") +
      " = รวม " + fmtM(M.cashTotal);
    var cash = '<div class="ac-kpi" data-ac-kpi="cash">' +
      '<div class="ac-kpi-l">เงินสดทั้งหมด = ยังไม่จัดสรร + รอซื้อทุกก้อน</div>' +
      '<div class="ac-kpi-v">' + esc(fmtM(M.cashTotal)) + ' <span class="ac-kpi-p">' + esc(pp[1] + " ของความมั่งคั่ง") + "</span></div>" +
      '<div class="ac-kpi-d">' + esc(parts) + "</div>" +
      "</div>";
    return '<div class="ac-kpis">' + inv + cash + "</div>";
  }

  // ---- ป้ายของส่วนในแท่ง (ค่าคงที่ CHART_PX / NEED_PX / PILL_PX อยู่ต้นไฟล์)
  var BPS = ["d", "m"];
  // ความสูง (px) ของส่วนหนึ่งของแท่งที่ขนาดจอ bp: กราฟ × แท่ง barPct% ของกราฟ × ส่วน pct% ของแท่ง
  function segPx(bp, barPct, pct) { return CHART_PX[bp] * barPct / 100 * pct / 100; }
  // ป้ายอยู่ในส่วนได้ไหมที่ขนาดจอ bp — ส่วนสูงพอสำหรับป้ายสองบรรทัด (สามบรรทัดสำหรับรอซื้อบนจอ ≤600px)
  function fitsIn(kind, bp, barPct, pct) { return segPx(bp, barPct, pct) >= NEED_PX[kind][bp]; }
  // คลาสบอกจอที่ป้ายตัวนี้แสดง: show-d = จอกว้าง · show-m = จอ ≤600px
  //   CSS ซ่อนป้ายที่ไม่มีคลาสของจอนั้นด้วย display:none (ไม่อยู่ใน accessibility tree) — แต่ละส่วนมีป้ายที่เห็นตัวเดียวต่อจอ
  function showCls(d, m) { return (d ? " show-d" : "") + (m ? " show-m" : ""); }
  // เนื้อป้าย (ในส่วน และป้ายลอยใช้ชุดเดียวกัน): ยอดเงิน .ac-seg-amt + % ของก้อน .ac-seg-pct
  //   "฿… ล้าน" เป็นโหนดข้อความเดียว ให้ privacy.js ซ่อนได้ · คำ "รอซื้อ " อยู่ใน .ac-seg-w แยกจากยอด
  //   จอ ≥1240px: "รอซื้อ ฿2.2 ล้าน" / "22% ของ Bitcoin" · จอ 601–1239px (กราฟแคบ): "รอซื้อ" / "฿2.2 ล้าน" / "22%"
  //   จอ ≤600px (แท่งกว้าง ~44–50px): CSS ตัด .ac-seg-w เป็นบรรทัดของตัวเอง · ยอดเงินตัดที่ช่องว่างเป็น "฿2.2" / "ล้าน"
  //   · ซ่อนคำต่อท้าย " ของ <ก้อน>" (.ac-seg-of) เพราะชื่อก้อนอยู่ใต้แท่งแล้ว → "รอซื้อ" / "฿2.2" / "ล้าน" / "22%"
  function lblInner(kind, money, pctText, of) {
    return '<span class="ac-seg-amt">' + (kind === "wait" ? '<span class="ac-seg-w">รอซื้อ </span>' : "") + esc(money) + "</span>" +
      '<small class="ac-seg-pct">' + esc(pctText) + '<span class="ac-seg-of">' + esc(of) + "</span></small>";
  }
  // กองป้ายลอยสูงพ้นขอบบนของกราฟกี่ px ที่ขนาดจอ bp (0 = ไม่พ้น) · kinds = ป้ายที่ลอยที่จอนั้น
  function roomAbove(bp, barPct, kinds) {
    if (!kinds.length) return 0;
    var h = FLOAT_OFF[bp] + FLOAT_GAP[bp] * (kinds.length - 1);
    each(kinds, function (k) { h += PILL_PX[k][bp]; });
    return Math.max(0, CHART_PX[bp] * barPct / 100 + h - CHART_PX[bp]);
  }

  // แท่งหนึ่ง → { html, room: { d, m } } · room = กองป้ายลอยสูงพ้นกราฟกี่ px (chartHtml เผื่อที่ด้านบนให้)
  function barHtml(c, axisMax) {
    // ใต้แท่ง: % ของทั้งแท่ง (ลงทุนแล้ว + รอซื้อ) เทียบความมั่งคั่งรวม — ฐานเดียวกับบล็อก "สัดส่วนพอร์ตตอนนี้"
    var head = "<b>" + esc(c.label) + "</b>" + esc(fmtPct(c.wealthPct) + " ของความมั่งคั่ง");
    if (c.empty) return { html: '<div class="ac-bar is-empty" data-ac-bar="' + esc(c.key) + '">—<div class="ac-lbl">' + head + "</div></div>", room: { d: 0, m: 0 } };
    var barPct = c.total / axisMax * 100;
    var of = " ของ " + c.label;
    // % ลงทุน + % รอซื้อของก้อนเดียวกันรวมกันได้ 100 เสมอ (ในส่วนหรือในป้ายลอยก็ตาม)
    var pp = pairPct(c.heldPct, c.waitPct);
    // ลำดับที่เห็นในแท่ง: รอซื้อ (บน) แล้วลงทุนแล้ว (ล่าง) — ป้ายลอยเรียงตามนี้ด้วย (ป้ายรอซื้ออยู่เหนือป้ายลงทุน)
    var parts = [];
    if (c.wait > 0) parts.push({ kind: "wait", pct: c.waitPct, money: fmtM(c.wait), pctText: pp[1] });
    if (c.held > 0) parts.push({ kind: "held", pct: c.heldPct, money: fmtM(c.held), pctText: pp[0] });
    var segs = "", pills = "", floats = { d: [], m: [] };
    each(parts, function (p) {
      var inD = fitsIn(p.kind, "d", barPct, p.pct), inM = fitsIn(p.kind, "m", barPct, p.pct);
      var inner = lblInner(p.kind, p.money, p.pctText, of);
      // ป้ายในส่วน — วาดเฉพาะเมื่ออยู่ในส่วนได้อย่างน้อยหนึ่งจอ
      segs += '<div class="ac-seg ac-' + p.kind + '" style="height:' + cssPct(p.pct) + '%">' +
        (inD || inM ? '<div class="ac-in' + showCls(inD, inM) + '" data-ac-lbl="' + p.kind + '">' + inner + "</div>" : "") + "</div>";
      // ป้ายลอย — จอที่ใส่ในส่วนไม่พอ
      if (!inD || !inM) pills += '<div class="ac-pill is-' + p.kind + showCls(!inD, !inM) + '" data-ac-lbl="' + p.kind + '">' + inner + "</div>";
      if (!inD) floats.d.push(p.kind);
      if (!inM) floats.m.push(p.kind);
    });
    var html = '<div class="ac-bar" data-ac-bar="' + esc(c.key) + '" style="height:' + cssPct(barPct) + '%">' +
      (pills ? '<div class="ac-float">' + pills + "</div>" : "") + segs + '<div class="ac-lbl">' + head + "</div></div>";
    return { html: html, room: { d: roomAbove("d", barPct, floats.d), m: roomAbove("m", barPct, floats.m) } };
  }

  // กราฟแท่ง CSS: เส้นแกน absolute ตาม axis.ticks · แท่ง flex สูงเป็น % ของ axis.max
  // ป้ายแกนมี ฿ นำหน้า (ยกเว้น 0) ให้ privacy.js ซ่อนได้ — ขีดสูงสุดบอกขนาดของก้อนที่ใหญ่ที่สุด
  // กองป้ายลอยของแท่งสูง ๆ พ้นขอบบนของกราฟ → has-float-top-d / has-float-top-m + ตัวแปร --ac-room-d / --ac-room-m (px)
  //   CSS เพิ่ม margin-top ของกราฟเท่านั้น ป้ายจึงไม่ทับช่องภาพรวมด้านบน (แยกจอ — ป้ายลอยไม่เหมือนกันทุกจอ)
  function chartHtml(M) {
    var axisMax = M.axis.max;
    var grid = M.axis.ticks.map(function (v) {
      var n = trimNum(v / 1e6, 2);
      var label = v > 0 ? "฿" + n + " ล้าน" : "0";
      return '<div class="ac-grid" style="bottom:' + cssPct(v / axisMax * 100) + '%"><span data-ac-tick="' + esc(n) + '">' + esc(label) + "</span></div>";
    }).join("");
    var room = { d: 0, m: 0 };
    var bars = M.classes.map(function (c) {
      var b = barHtml(c, axisMax);
      each(BPS, function (bp) { if (b.room[bp] > room[bp]) room[bp] = b.room[bp]; });
      return b.html;
    }).join("");
    var cls = "ac-chart", vars = [];
    each(BPS, function (bp) {
      if (!(room[bp] > 0)) return;
      cls += " has-float-top-" + bp;
      vars.push("--ac-room-" + bp + ":" + Math.ceil(room[bp]) + "px");
    });
    return '<div class="' + cls + '" data-ac-chart' + (vars.length ? ' style="' + vars.join(";") + '"' : "") + ">" + grid + bars + "</div>";
  }

  // แถบเงินสด: เงินสดใน Editor เทียบกรอบ ต่ำ–สูง ของผู้ใช้ · ข้อเท็จจริงล้วน
  // ล็อกอยู่: ไม่วาดจุด "ตอนนี้" · คำสถานะเป็น "ล็อกอยู่" · สเกลแถบไม่ขึ้นกับเงินสด (scaleMax ของเอนจิน
  //   ยืดตามเงินสดเมื่อเกินกรอบ — ตำแหน่งกรอบบนแถบจะบอกยอดเงินสดได้) · ตัวเลขกรอบคงไว้ (ค่าที่ผู้ใช้ตั้ง ไม่ใช่เงินในพอร์ต)
  function cashHtml(M) {
    var B = M.cashBand;
    var locked = privacyLocked();
    var sc = locked ? (B.max > 0 ? B.max * 4 / 3 : 1000000) : B.scaleMax;
    var minM = fmtBandM(B.min), maxM = fmtBandM(B.max);
    var st = locked ? LOCKED_TH : (STATUS_TH[B.status] || "");
    // "ยังไม่จัดสรร" = คำเดียวกับต้นบรรทัดแจกแจงของช่องเงินสดทั้งหมด (คำว่า "เงินสด" เฉย ๆ สงวนไว้ให้ยอดรวม)
    var head = "ยังไม่จัดสรร " + fmtM(B.now) + " (เงินสดใน Quarterly Editor)" + (st ? " · " + st : "");
    var ticks = '<span class="ac-band-t is-zero" style="left:0%">0</span>' +
      (B.min > 0 ? '<span class="ac-band-t" style="left:' + cssPct(B.min / sc * 100) + '%">' + esc(minM + " ล้าน") + "</span>" : "") +
      (B.max > B.min ? '<span class="ac-band-t" style="left:' + cssPct(B.max / sc * 100) + '%">' + esc(maxM + " ล้าน") + "</span>" : "");
    // data-ac-now = ตำแหน่งจุด "ตอนนี้" เป็น % ของ scaleMax (ค่าเดียวกับ left) — ให้เทสต์/โพรบอ่านได้โดยไม่ต้องแกะ style
    // ป้าย "ตอนนี้ ฿X ล้าน" ชิดซ้าย/ขวาเมื่อจุดอยู่ใกล้ขอบ ไม่ให้ล้นการ์ดบนจอแคบ · ล็อกอยู่ = ไม่มีจุด
    var nowPct = isNum(B.now) ? B.now / sc * 100 : 0;
    var edge = nowPct < 15 ? " is-left" : (nowPct > 85 ? " is-right" : "");
    var marker = locked ? "" :
      '<i class="ac-now' + edge + '" data-ac-now="' + cssPct(nowPct) + '" style="left:' + cssPct(nowPct) + '%"><span>' + esc("ตอนนี้ " + fmtM(B.now)) + "</span></i>";
    return '<div class="ac-cash" data-ac-cash="' + esc(locked ? "locked" : (B.status || "")) + '">' +
      '<div class="ac-cash-head"><span class="ac-cash-now">' + esc(head) + "</span>" +
        '<span class="ac-cash-range">' + esc("กรอบที่ตั้งไว้ " + minM + "–" + maxM + " ล้าน") + "</span></div>" +
      '<div class="ac-band" data-ac-band>' +
        '<div class="ac-band-ok" style="left:' + cssPct(B.min / sc * 100) + "%;width:" + cssPct((B.max - B.min) / sc * 100) + '%"></div>' +
        marker + ticks +
      "</div>" +
      '<div class="ac-rules">' +
        '<p class="ac-rule is-bear">' + esc("bear ↑ กติกาของคุณ: ลดเงินสดลงไปทาง " + minM + " ล้าน เอาไปซื้อก้อนที่ยังรอซื้อ") + "</p>" +
        '<p class="ac-rule is-bull">' + esc("bull ↓ กติกาของคุณ: พักกำไรเป็นเงินสดขึ้นไปทาง " + maxM + " ล้าน") + "</p>" +
      "</div>" +
      "</div>";
  }

  // ฟอร์มตั้งกรอบเงินสด (หน่วยล้านบาท) — วางเหนือแถบเงินสด ให้เห็นตัวอย่างขณะพิมพ์
  // ปุ่มบันทึกเป็น submit (Enter ในช่อง = คลิกปุ่มนี้) แต่ handler กัน submit จริงแล้วบันทึกเอง
  function formHtml() {
    var f = state.form;
    var locked = privacyLocked();
    var dis = state.saveState === "saving" ? " disabled" : "";
    function field(name, label) {
      return '<label class="ac-form-f"><span>' + esc(label) + "</span>" +
        '<input type="number" name="' + name + '" step="0.1" min="0" inputmode="decimal" value="' + esc(f[name]) + '"' +
        (locked ? ' placeholder="' + esc(LOCKED_PH) + '"' : "") + "></label>";
    }
    var hint = locked
      ? "ล็อกอยู่: ช่องที่เว้นว่างไว้ = ใช้ค่าเดิม"
      : "พิมพ์แล้วแถบเงินสดด้านล่างเปลี่ยนตามทันที (ยังไม่บันทึกจนกว่าจะกดบันทึก)";
    return '<form class="ac-form" data-ac-form="1" novalidate>' +
      '<div class="ac-form-t">ตั้งกรอบเงินสด (ล้านบาท)</div>' +
      '<div class="ac-form-row">' +
        field("min", "ค่าต่ำ") + '<span class="ac-form-dash" aria-hidden="true">–</span>' + field("max", "ค่าสูง") +
        '<div class="ac-form-btns">' +
          '<button type="submit" class="ac-btn is-primary" data-ac-save="1"' + dis + ">บันทึก</button>" +
          '<button type="button" class="ac-btn" data-ac-cancel="1">ยกเลิก</button>' +
        "</div>" +
      "</div>" +
      '<p class="ac-form-hint">' + esc(hint) + "</p>" +
      '<p class="ac-form-err" data-ac-form-msg="1" role="alert"' + (f.error ? "" : " hidden") + ">" + esc(f.error || "") + "</p>" +
      "</form>";
  }

  // สถานะการบันทึก + ร่างที่ยังไม่ได้บันทึก (ไม่มีตัวเลขเงิน)
  function statusHtml() {
    var s = state.saveState, cls = "ac-status", parts = [];
    if (s === "saving") parts.push('<span>กำลังบันทึกกรอบเงินสด…</span>');
    else if (s === "error") { cls += " is-error"; parts.push("<span>" + esc("บันทึกไม่สำเร็จ: " + (state.saveError || "ติดต่อ server ไม่สำเร็จ")) + "</span>"); }
    else if (s === "saved") { cls += " is-ok"; parts.push("<span>บันทึกกรอบเงินสดแล้ว</span>"); }
    if (state.draft && state.draftNotice) {
      parts.push('<span class="ac-status-draft">' + esc(state.draftNotice + (s === "error" ? " (เก็บไว้ในเครื่องนี้)" : "")) + "</span>");
      if (s === "error") parts.push('<button type="button" class="ac-btn" data-ac-retry="1">ลองบันทึกอีกครั้ง</button>');
    }
    if (!parts.length) return "";
    return '<div class="' + cls + '" data-ac-status="' + esc(s) + '" role="status">' + parts.join("") + "</div>";
  }

  // เอนจินกับแผนที่ใช้วาด → { M } หรือ { msg } (ข้อความแทนการ์ด)
  function model() {
    if (!state.last) return { msg: "กำลังโหลด…" };
    var A = AC();
    var R = state.last.R;
    if (!A || !R) return { msg: NO_DATA_TH };
    // ไม่มีข้อมูลจริง (ยังไม่กรอก Editor / ยังไม่มีเอกสาร) ≠ โหลดหรือคำนวณไม่สำเร็จ (reason อื่น เช่น "error")
    if (!R.available) return { msg: R.reason === "no-quarterly" || R.reason === "no-snapshot" ? NO_DATA_TH : LOAD_FAIL_TH };
    var M = null;
    // เอนจินล้ม ≠ ไม่มีข้อมูล — บอกให้ต่างกัน และทิ้งร่องรอยไว้ใน console
    try { M = A.compute(R, viewPlan()); }
    catch (e) {
      try { console.error("allocation-card", e); } catch (e2) {}
      return { msg: "คำนวณการ์ดไม่สำเร็จ — ลองโหลดหน้าใหม่" };
    }
    if (!M || !M.available) return { msg: NO_DATA_TH };
    return { M: M };
  }

  function cardHtml() {
    var m = model();
    if (!m.M) return messageCard(m.msg);
    var M = m.M;
    return '<section class="ac-card" data-ac-card>' +
      headHtml(M) + kpisHtml(M) + chartHtml(M) +
      (state.form ? formHtml() : "") + statusHtml() +
      '<div class="ac-cash-wrap" data-ac-cash-wrap="1">' + cashHtml(M) + "</div>" +
      '<p class="ac-foot">' + esc(FOOT) + "</p>" +
      "</section>";
  }

  // ช่องในฟอร์มที่โฟกัสอยู่ก่อนวาดใหม่ (หน้า position วาดใหม่ระหว่างพิมพ์ได้ เช่นกลับมาที่แท็บ) → โฟกัสคืน
  function focusedField(root) {
    try {
      var ae = document.activeElement;
      if (!ae || typeof root.contains !== "function" || !root.contains(ae) || typeof ae.getAttribute !== "function") return null;
      var n = ae.getAttribute("name");
      return n === "min" || n === "max" ? n : null;
    } catch (e) { return null; }
  }

  // ผูก event กับ element ของการวาดรอบนี้ (innerHTML ใหม่ = element ชุดใหม่)
  function wire(root) {
    ui = { min: null, max: null, msg: null, cash: null };
    if (typeof root.querySelectorAll !== "function") return;
    each(root.querySelectorAll("[data-ac-settings]"), function (el) { el.addEventListener("click", onSettings); });
    each(root.querySelectorAll("[data-ac-form]"), function (el) {
      el.addEventListener("submit", function (ev) { if (ev && ev.preventDefault) ev.preventDefault(); onSave(); });
    });
    each(root.querySelectorAll("[data-ac-save]"), function (el) {
      el.addEventListener("click", function (ev) { if (ev && ev.preventDefault) ev.preventDefault(); onSave(); });
    });
    each(root.querySelectorAll("[data-ac-cancel]"), function (el) { el.addEventListener("click", onCancel); });
    each(root.querySelectorAll("[data-ac-retry]"), function (el) { el.addEventListener("click", onRetry); });
    each(root.querySelectorAll("[name]"), function (el) {
      var name = el.getAttribute("name");
      if (name !== "min" && name !== "max") return;
      ui[name] = el;
      el.addEventListener("input", function () { onInput(name, el); });
    });
    ui.msg = root.querySelector("[data-ac-form-msg]");
    ui.cash = root.querySelector("[data-ac-cash-wrap]");
  }

  function render() {
    var root = document.getElementById(ROOT_ID);
    if (!root) return;
    var keep = focusedField(root);
    dropBadInput();
    root.innerHTML = cardHtml();
    wire(root);
    var f = focusNext || keep;
    focusNext = null;
    if (f && ui[f] && typeof ui[f].focus === "function") { try { ui[f].focus(); } catch (e) {} }
  }

  // ---------------------------------------------------------------- boot
  function onRendered(ev) {
    var d = ev && ev.detail;
    if (!d || !d.R) return;
    adopt(d);
    render();
  }
  // บันทึกเอกสารพอร์ต (การ์ดนี้ หรือส่วน Asset Allocation) → อ่านกรอบเงินสดจากเอกสารชุดใหม่
  //   ยกเว้นมีร่างที่ยังไม่ได้บันทึก (แสดงร่างต่อจนกว่าจะบันทึกสำเร็จ)
  function onSaved(ev) {
    var d = ev && ev.detail && ev.detail.data;
    if (!d || typeof d !== "object") return;
    state.plan = normalize(state.draft ? state.draft.plan : d.allocationPlan);
    render();
  }
  // ล็อก/ปลดล็อก Privacy → วาดแถบเงินสดใหม่ (จุด "ตอนนี้" / คำสถานะ) · ฟอร์มเปิดอยู่: ล็อก = ล้างช่อง
  //   (เว้นว่าง = คงค่าเดิม ไม่วาดค่าที่ตั้งไว้ในช่อง) · ปลดล็อก = ช่องที่ว่างเติมค่าที่ถืออยู่
  function onPrivacy() {
    if (state.form) {
      var b = state.plan && state.plan.cashBand;
      if (privacyLocked()) { state.form.min = ""; state.form.max = ""; }
      else if (b) {
        if (state.form.min === "") state.form.min = inputM(b.min);
        if (state.form.max === "") state.form.max = inputM(b.max);
      }
    }
    render();
  }

  // ฟัง event ทันทีที่โหลด (ไม่รอ DOMContentLoaded) — หน้า position วาดครั้งแรกตอน DOMContentLoaded
  // ถ้ามันวาดไปก่อนแล้ว (readyState ไม่ใช่ loading) ใช้ .last ที่ค้างไว้
  window.addEventListener("portfolio-position-rendered", onRendered);
  window.addEventListener("portfolio-allocation-saved", onSaved);
  // privacy.js ยิง "portfolio-privacy-changed" บน document
  if (document.addEventListener) document.addEventListener("portfolio-privacy-changed", onPrivacy);
  // ร่างจากรอบก่อน (บันทึกล้ม) → แสดงร่างก่อน แล้วลองส่งเองหนึ่งครั้ง · ล้มอีก = คงร่าง + ปุ่มลองใหม่
  var bootDraft = readDraft();
  if (bootDraft) {
    state.draft = bootDraft;
    state.draftNotice = DRAFT_TH;
    state.plan = normalize(bootDraft.plan);
  }
  var P = window.PortfolioPositionPage;
  if (P && P.last) adopt(P.last);
  render();
  if (bootDraft) persistPlan(bootDraft.plan, null);

  // _fit: ค่าคงที่ของกติกา ป้ายในส่วน / ป้ายลอย — ให้เทสต์คิดผลที่คาดจากตัวเลขชุดเดียวกับหน้า
  window.AllocationCardPage = {
    render: render, persistPlan: persistPlan, _state: state,
    _fit: { chart: CHART_PX, need: NEED_PX, pill: PILL_PX, off: FLOAT_OFF, gap: FLOAT_GAP }
  };
})();
