// Quarterly Editor · Bitcoin กรอกเป็นจำนวน BTC (2026-11-25 · spec docs/superpowers/specs/2026-11-25-btc-quantity-design.md)
//   node scripts/editor-btc-qty-test.js
// ดึงฟังก์ชันจริงจาก public/app.js มารันใน sandbox คู่กับ public/btc-value.js ตัวจริง (แบบ quarterly-editor-save-test)
//   · แถว bitcoin ของไตรมาสที่ตามราคา: ช่องจำนวน BTC แทนช่องบาท · มูลค่า = จำนวน × BTC-USD × USD/THB
//   · ไม่มีราคา = ไม่บันทึกแถวใหม่ (ไม่ใช่บันทึกเป็น 0) · จำนวน BTC ถูกซ่อนตอนล็อก Privacy
//   · บันทึก / คัดลอกไตรมาส คำนวณจากจำนวนก่อนเสมอ · การบันทึกอยู่ในล็อกเอกสารของหน้า
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var PUB = path.join(__dirname, "..", "public");
var SRC = fs.readFileSync(path.join(PUB, "app.js"), "utf8");
var SRC_BV = fs.readFileSync(path.join(PUB, "btc-value.js"), "utf8");
var HTML = fs.readFileSync(path.join(PUB, "index.html"), "utf8");

var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + (extra != null ? "  → " + (typeof extra === "string" ? extra : JSON.stringify(extra)) : "")); }
}
function finish() { console.log("\n" + (pass + fail) + " checks · " + pass + " passed · " + fail + " failed"); process.exit(fail ? 1 : 0); }
// const ใน vm ไม่ใช่ property ของ global object → อ่านผ่าน runInContext
function K(S, name) { return vm.runInContext(name, S.ctx); }
// ฟังก์ชันระดับบนสุดของ app.js จบด้วย "}" ที่ต้นบรรทัด (app.js เป็น CRLF)
function extract(name) {
  var re = new RegExp("(^|\\n)((?:async )?function " + name + "\\()");
  var m = re.exec(SRC);
  if (!m) throw new Error("ไม่เจอฟังก์ชัน " + name + " ใน app.js");
  var start = m.index + m[1].length;
  var endRe = /\r?\n\}\r?\n/g;
  endRe.lastIndex = start;
  var e = endRe.exec(SRC);
  if (!e) throw new Error("หาจุดจบของ " + name + " ไม่เจอ");
  return SRC.slice(start, e.index) + "\n}\n";
}
function constLine(name) {
  var m = new RegExp("(^|\\n)(const " + name + " = [^\\n]*;)").exec(SRC);
  if (!m) throw new Error("ไม่เจอ const " + name + " ใน app.js");
  return m[2];
}
var CODE;
try {
  var typeLabels = /const TYPE_LABELS = \{[\s\S]*?\r?\n\};/.exec(SRC);
  if (!typeLabels) throw new Error("ไม่เจอ TYPE_LABELS");
  CODE = [typeLabels[0], constLine("NOT_LOADED_TH"), constLine("BTC_NO_PRICE_TH"), constLine("BTC_NO_FX_TH"), constLine("BTC_QTY_INVALID_TH"), constLine("PM_QUARTER_ENDED_TH"), constLine("PM_FOREIGN_LOCKED_TH")].join("\n") + "\n" +
    ["currentQuarter", "currentQuarterKey", "clamp", "formatMoney", "formatPercent", "formatNetFlow", "escapeHtml", "assetGrossValue", "getTotals", "assetMetrics",
      "assetKey", "compareQuarter", "getPreviousSavedQuarter", "isPMSyncedAsset", "privacyLocked", "moneyFieldText", "formMoneyText", "applyMoneyPrivacy",
      "editingAsset", "btcLive", "btcMissingText", "isBtcQtyMode", "applyBtcValues", "formatBtcQty", "renderBtcNote", "updateFormMode", "readAssetFromForm", "renderRows",
      "copyFromPreviousQuarter", "portfolioHeaders", "readJsonResponse", "adoptServerAllocation", "adoptServerBtcPrices", "persistRemoteData", "patchSnapshotDoc", "statusToneOf"].map(extract).join("\n");
} catch (e) {
  console.log("  ✗ ดึงฟังก์ชันจาก app.js ไม่ได้: " + e.message);
  pass = 0; fail = 1; finish();
}

var AT = "2026-11-25T02:00:00.000Z";
function fakeDate(nowIso) {
  var D = function (a) { return arguments.length ? new Date(a) : new Date(nowIso); };
  D.now = function () { return Date.parse(nowIso); }; D.parse = Date.parse; D.UTC = Date.UTC; D.prototype = Date.prototype;
  return D;
}
function classList() { var s = {}; return { toggle: function (c, on) { if (on === undefined) on = !s[c]; s[c] = !!on; return s[c]; }, add: function (c) { s[c] = true; }, remove: function (c) { s[c] = false; }, contains: function (c) { return !!s[c]; } }; }
function input(v) { return { value: v == null ? "" : String(v), placeholder: "", disabled: false, required: false, classList: classList(), addEventListener: function () {} }; }
function doc(opts) {
  opts = opts || {};
  return {
    currentQuarter: opts.current || "2026-Q4",
    allocation: { keep: 1 },
    quarters: {
      "2026-Q3": { key: "2026-Q3", savedAt: "2026-09-30T00:00:00.000Z", assets: [{ id: "b3", type: "bitcoin", name: "Bitcoin", btcQty: 0.4, manualValue: 1200000, snapshotValue: 1200000, investedPercent: 50, btcPriceUsd: 90000, usdThb: 33.3333, btcValuedAt: "2026-09-30T02:00:00.000Z" }] },
      "2026-Q4": { key: "2026-Q4", savedAt: null, assets: opts.q4 || [{ id: "b4", type: "bitcoin", name: "Bitcoin", btcQty: 0.5, manualValue: 1500000, snapshotValue: 1500000, investedPercent: 60, netFlow: 0 }] }
    }
  };
}
function sandbox(o) {
  o = o || {};
  var store = { btc_value_fx_v1: JSON.stringify({ day: "2026-11-25", thb: 34 }) };
  if (o.noFx) delete store.btc_value_fx_v1;
  var snap = o.noPrice ? null : { snapshotId: "s1", loadedAt: AT, historicalData: { BTCUSD: { lastUpdated: AT, dates: ["2026-11-25"], closes: [100000] } }, technicalSignals: {} };
  if (snap && o.withSnapDoc) snap.portfolioStatus = { data: doc(), mode: "supabase" };
  var calls = [], lockCalls = [], rows = [], snapWrites = [];
  var els = {
    typeInput: input(o.type || "bitcoin"), nameInput: input("Bitcoin"), valueInput: input(o.value), investedPercentInput: input(o.invested == null ? "60" : o.invested),
    investedPercentField: input(), netFlowInput: input("0"), btcQtyInput: input(o.qty), btcQtyNote: { textContent: "" },
    manualValueField: input(), btcQtyField: input(), statusText: { textContent: "" }, quarterStatus: { textContent: "" },
    rows: { innerHTML: "", appendChild: function (r) { rows.push(r); } }, emptyState: input(), panelSubtitle: { textContent: "" }
  };
  var win = {};
  var ctx = {
    state: { data: o.data || doc(), editingId: o.editingId || null, hydrating: false, saving: false, loaded: true, storageMode: "supabase", lastUpdated: null, foreignFromPM: false, pmReason: null, pmSyncPending: false },
    elements: els,
    window: win, document: { createElement: function () { return { innerHTML: "" }; } },
    localStorage: { getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; }, setItem: function (k, v) { store[k] = String(v); }, removeItem: function (k) { delete store[k]; } },
    sessionStorage: { getItem: function () { return "pw"; } },
    resetForm: function () {}, render: function () {}, renderSummary: function () {}, saveData: function () {}, syncForeignFromPM: function () { return false; },
    fetch: function (url, init) {
      var method = (init && init.method) || "GET";
      calls.push({ url: url, method: method, body: init && init.body ? JSON.parse(init.body) : null });
      if (method === "GET") return Promise.resolve({ ok: true, status: 200, text: function () { return Promise.resolve(JSON.stringify({ data: o.server || doc() })); } });
      if (o.failPut) return Promise.resolve({ ok: false, status: 500, text: function () { return Promise.resolve(JSON.stringify({ error: "boom" })); } });
      return Promise.resolve({ ok: true, status: 200, text: function () { return Promise.resolve(JSON.stringify({ ok: true })); } });
    },
    crypto: { randomUUID: function () { return "new-" + Math.random().toString(36).slice(2, 8); } },
    console: console, JSON: JSON, Math: Math, Date: fakeDate("2026-11-25T03:00:00.000Z"), Object: Object, Array: Array, Promise: Promise, Number: Number, String: String, Boolean: Boolean, Map: Map, Set: Set,
    isFinite: isFinite, RegExp: RegExp, Error: Error, Intl: Intl
  };
  win.PortfolioDataSnapshot = { read: function () { return snap; }, write: function (s) { snap = s; snapWrites.push(s); return s; } };
  win.PortfolioPrivacy = { isLocked: function () { return !!o.locked; } };
  win.confirm = function () { return true; };
  if (o.lock) win.PortfolioCore = { withDocLock: function (task) { lockCalls.push("lock"); return Promise.resolve().then(task); } };
  win.localStorage = ctx.localStorage;
  ctx.window = win;
  vm.createContext(ctx);
  // btc-value.js reads window.* — load it with the sandbox's window as its root
  var bvCtx = { console: console, JSON: JSON, Math: Math, Date: ctx.Date, Object: Object, Array: Array, Promise: Promise, String: String, Number: Number, isFinite: isFinite, RegExp: RegExp, Error: Error, localStorage: ctx.localStorage };
  bvCtx.window = bvCtx; vm.createContext(bvCtx); vm.runInContext(SRC_BV, bvCtx, { filename: "btc-value.js" });
  win.BtcValue = bvCtx.BtcValue;
  vm.runInContext(CODE, ctx, { filename: "app.js (extracted)" });
  return { ctx: ctx, els: els, calls: calls, lockCalls: lockCalls, rows: rows, store: store, snapWrites: snapWrites };
}

(async function () {
  console.log("== โหมดจำนวน BTC: เฉพาะ bitcoin ในไตรมาสที่ตามราคา ==");
  var S = sandbox();
  t("bitcoin + 2026-Q4 (ไตรมาสล่าสุด ยังไม่จบ) → โหมดจำนวน", S.ctx.isBtcQtyMode("bitcoin") === true);
  t("ประเภทอื่น → ไม่ใช่", S.ctx.isBtcQtyMode("cash") === false && S.ctx.isBtcQtyMode("foreign-stock") === false);
  var SQ3 = sandbox({ data: doc({ current: "2026-Q3" }) });
  t("เลือกดูไตรมาสเก่า (2026-Q3) → กรอกบาทแบบเดิม", SQ3.ctx.isBtcQtyMode("bitcoin") === false);
  S.ctx.updateFormMode();
  t("updateFormMode: ซ่อนช่องบาท · โชว์ช่องจำนวน BTC", S.els.manualValueField.classList.contains("is-hidden") === true && S.els.btcQtyField.classList.contains("is-hidden") === false);
  var SC = sandbox({ type: "cash" }); SC.ctx.updateFormMode();
  t("updateFormMode ประเภทอื่น: โชว์ช่องบาท · ซ่อนช่องจำนวน", SC.els.manualValueField.classList.contains("is-hidden") === false && SC.els.btcQtyField.classList.contains("is-hidden") === true);

  console.log("== อ่านฟอร์ม: จำนวน × ราคา ==");
  var R = sandbox({ qty: "0.5" });
  var a = R.ctx.readAssetFromForm();
  t("0.5 BTC · ลงทุน 60% → manualValue = snapshotValue = 1,700,000 · เก็บจำนวน + ราคาที่ใช้", a && a.type === "bitcoin" && a.btcQty === 0.5 && a.manualValue === 1700000 && a.snapshotValue === 1700000 && a.investedPercent === 60 && a.btcPriceUsd === 100000 && a.usdThb === 34 && a.btcValuedAt === AT, a);
  var RN = sandbox({ qty: "0.5", noPrice: true });
  t("ไม่มีราคา BTC (ยังไม่เคย Load Latest Data) → ไม่บันทึก + บอกให้กด Load Latest Data", RN.ctx.readAssetFromForm() === null && RN.els.statusText.textContent === K(RN, "BTC_NO_PRICE_TH") && /Load Latest Data/.test(RN.els.statusText.textContent), RN.els.statusText.textContent);
  var RF = sandbox({ qty: "0.5", noFx: true });
  // final review #3: มีราคา BTC แต่ดึง USD/THB ไม่ได้เลย → Load Latest Data ไม่ช่วย (ไม่ได้ดึงอัตราแลกเปลี่ยน) → บอกตรงเรื่อง
  t("มีราคา BTC แต่ไม่มี USD/THB เลย → ไม่บันทึก + บอกว่าดึงอัตราแลกเปลี่ยนไม่ได้ (ไม่ใช่ให้กด Load Latest Data)",
    RF.ctx.readAssetFromForm() === null && RF.els.statusText.textContent === K(RF, "BTC_NO_FX_TH") && !/Load Latest Data/.test(RF.els.statusText.textContent), RF.els.statusText.textContent);
  var RFN = sandbox({ qty: "0.5", noFx: true }); RFN.ctx.renderBtcNote();
  t("…โน้ตใต้ช่องบอกเรื่องเดียวกัน", RFN.els.btcQtyNote.textContent === K(RFN, "BTC_NO_FX_TH"), RFN.els.btcQtyNote.textContent);
  ["", "-1", "abc"].forEach(function (q) {
    var RQ = sandbox({ qty: q });
    t("จำนวน \"" + q + "\" → ไม่บันทึก + กรุณากรอกจำนวน BTC", RQ.ctx.readAssetFromForm() === null && /^กรุณากรอกจำนวน BTC/.test(RQ.els.statusText.textContent), RQ.els.statusText.textContent);
  });
  var R0 = sandbox({ qty: "0" });
  t("0 BTC ได้ (ขายหมดแล้ว) → ฿0", (function () { var x = R0.ctx.readAssetFromForm(); return x && x.btcQty === 0 && x.manualValue === 0; })());
  var RE = sandbox({ qty: "0.5", noPrice: true, editingId: "b4", data: doc({ q4: [{ id: "b4", type: "bitcoin", name: "Bitcoin", btcQty: 0.4, manualValue: 1350000, snapshotValue: 1350000, investedPercent: 60, btcPriceUsd: 99000, usdThb: 34.1, btcValuedAt: "2026-11-24T02:00:00.000Z" }] }) });
  t("แก้แถวเดิมที่มีราคาเก็บไว้ ตอนไม่มีราคาใหม่ → ใช้ราคาของแถว (0.5 × 99,000 × 34.1)", (function () { var x = RE.ctx.readAssetFromForm(); return x && x.manualValue === Math.round(0.5 * 99000 * 34.1 * 100) / 100; })());
  var RB = sandbox({ type: "cash", value: "250000" });
  t("ประเภทอื่นยังกรอกบาทเหมือนเดิม (ไม่มีฟิลด์ BTC)", (function () { var x = RB.ctx.readAssetFromForm(); return x && x.manualValue === 250000 && !("btcQty" in x); })());

  console.log("== Privacy Lock ==");
  var RL = sandbox({ qty: "", locked: true, editingId: "b4" });
  t("ล็อก + แก้แถวเดิม + ช่องจำนวนว่าง → ใช้จำนวนที่บันทึกไว้ (0.5) ไม่ใช่ error", (function () { var x = RL.ctx.readAssetFromForm(); return x && x.btcQty === 0.5 && x.manualValue === 1700000; })());
  t("formatBtcQty ล็อก → \"XXX BTC\"", RL.ctx.formatBtcQty(0.5) === "XXX BTC");
  t("formatBtcQty ปลด → \"0.5 BTC\" · \"2 BTC\" · \"1.23456789 BTC\"", S.ctx.formatBtcQty(0.5) === "0.5 BTC" && S.ctx.formatBtcQty(2) === "2 BTC" && S.ctx.formatBtcQty(1.23456789) === "1.23456789 BTC");
  RL.els.btcQtyInput.value = "0.5"; RL.ctx.applyMoneyPrivacy();
  t("แก้แถวเดิมตอนล็อก → ช่องจำนวนวาดว่าง + placeholder ล็อก", RL.els.btcQtyInput.value === "" && /ล็อกอยู่/.test(RL.els.btcQtyInput.placeholder));
  var T = sandbox(); T.ctx.renderRows();
  var TL = sandbox({ locked: true }); TL.ctx.renderRows();
  t("ตาราง: ใต้ชื่อแถว bitcoin มี \"0.5 BTC\" · ล็อกแล้วเป็น \"XXX BTC\" ไม่มีตัวเลขจำนวน", /class="btc-qty">0\.5 BTC</.test(T.rows[0].innerHTML) && /class="btc-qty">XXX BTC</.test(TL.rows[0].innerHTML) && TL.rows[0].innerHTML.indexOf("0.5") < 0, [T.rows[0] && T.rows[0].innerHTML.slice(0, 200)]);

  console.log("== คำนวณใหม่ในหน่วยความจำ / คัดลอกไตรมาส ==");
  var A = sandbox();
  t("applyBtcValues: 1,500,000 → 1,700,000 ในหน่วยความจำ · ไม่บันทึกเอง", A.ctx.applyBtcValues() === true && A.ctx.state.data.quarters["2026-Q4"].assets[0].manualValue === 1700000 && A.calls.length === 0);
  t("…รอบสองราคาเดิม → ไม่เปลี่ยน", A.ctx.applyBtcValues() === false);
  var CP = sandbox({ data: doc({ q4: [] }) });
  CP.ctx.copyFromPreviousQuarter();
  var copied = CP.ctx.state.data.quarters["2026-Q4"].assets[0];
  t("คัดลอกจาก 2026-Q3 → แถว bitcoin มีจำนวน 0.4 และมูลค่าตามราคาวันนี้ (0.4 × 100,000 × 34 = 1,360,000)", copied && copied.btcQty === 0.4 && copied.manualValue === 1360000 && copied.btcValuedAt === AT, copied);

  console.log("== บันทึก: คำนวณก่อน PUT · อยู่ในล็อกเอกสาร ==");
  var P = sandbox({ lock: true });
  await P.ctx.persistRemoteData();
  var put = P.calls.filter(function (c) { return c.method === "PUT"; })[0];
  t("PUT ส่งแถว bitcoin = 1,700,000 (ราคาใหม่) แม้ในหน่วยความจำยังเป็น 1,500,000", put && put.body.data.quarters["2026-Q4"].assets[0].manualValue === 1700000, put && put.body.data.quarters["2026-Q4"].assets[0]);
  t("GET (adopt) → PUT อยู่ในล็อกเอกสารครั้งเดียว", P.lockCalls.length === 1 && P.calls.map(function (c) { return c.method; }).join() === "GET,PUT", [P.lockCalls, P.calls.map(function (c) { return c.method; })]);
  var PN = sandbox();
  await PN.ctx.persistRemoteData();
  t("ไม่มี PortfolioCore → บันทึกตรงแบบเดิม", PN.calls.map(function (c) { return c.method; }).join() === "GET,PUT");

  console.log("== บันทึกจาก Editor ที่รู้แต่ราคาเก่า ต้องไม่ดึงมูลค่าบน server ที่ใหม่กว่ากลับ (final review #1) ==");
  // แท็บนี้ / เครื่องนี้รู้ราคา $100,000 (snapshot เก่า) · server ถูกประเมินด้วย $110,000 แล้ว (เครื่องอื่น / btc-value.js อีกแท็บ)
  var T2 = "2026-11-25T09:00:00.000Z";
  function rowDoc(qty, value, usd, at) { return doc({ q4: [{ id: "b4", type: "bitcoin", name: "Bitcoin", btcQty: qty, manualValue: value, snapshotValue: value, investedPercent: 60, btcPriceUsd: usd, usdThb: 34, btcValuedAt: at },
    { id: "c4", type: "cash", name: "เงินสด", manualValue: 500000, snapshotValue: 500000, investedPercent: 0 }] }); }
  var RB = sandbox({ data: rowDoc(0.5, 1700000, 100000, AT), server: rowDoc(0.5, 1870000, 110000, T2) });
  RB.ctx.state.data.quarters["2026-Q4"].assets[1].manualValue = 600000;   // ผู้ใช้แก้แถวเงินสดแล้วกดบันทึก
  await RB.ctx.persistRemoteData();
  var rbBody = (RB.calls.filter(function (c) { return c.method === "PUT"; })[0] || {}).body;
  var rbRow = rbBody && rbBody.data.quarters["2026-Q4"].assets[0];
  t("server ประเมินที่ $110,000 (ใหม่กว่า) · แท็บนี้รู้แค่ $100,000 → PUT คง 1,870,000 ที่ราคาใหม่ (ไม่ถอยกลับ) · แถวเงินสดที่แก้ไปด้วย",
    !!rbRow && rbRow.manualValue === 1870000 && rbRow.snapshotValue === 1870000 && rbRow.btcPriceUsd === 110000 && rbRow.btcValuedAt === T2 && rbBody.data.quarters["2026-Q4"].assets[1].manualValue === 600000, rbRow);
  var RQ6 = sandbox({ data: rowDoc(0.6, 1700000, 100000, AT), server: rowDoc(0.5, 1870000, 110000, T2) });
  await RQ6.ctx.persistRemoteData();
  var q6 = RQ6.calls.filter(function (c) { return c.method === "PUT"; })[0].body.data.quarters["2026-Q4"].assets[0];
  t("…จำนวนที่แก้ในแท็บนี้ (0.6) คงไว้ แต่คิดด้วยราคาใหม่ (0.6 × 110,000 × 34 = 2,244,000)", q6.btcQty === 0.6 && q6.manualValue === 2244000 && q6.btcValuedAt === T2, q6);
  var RN2 = sandbox({ data: rowDoc(0.5, 1700000, 100000, AT), server: rowDoc(0.5, 1360000, 80000, "2026-11-20T09:00:00.000Z") });
  await RN2.ctx.persistRemoteData();
  var n2 = RN2.calls.filter(function (c) { return c.method === "PUT"; })[0].body.data.quarters["2026-Q4"].assets[0];
  t("server เก่ากว่าแท็บนี้ → ใช้ราคาของแท็บนี้ (1,700,000 ที่ $100,000)", n2.manualValue === 1700000 && n2.btcPriceUsd === 100000 && n2.btcValuedAt === AT, n2);
  // แท็บไม่มีราคาสด (ไม่มี snapshot) แต่แถวของแท็บประเมินด้วยราคาที่ใหม่กว่า server → ต้องไม่รับราคาเก่าของ server มาทับ
  var RO = sandbox({ noPrice: true, data: rowDoc(0.5, 1700000, 100000, AT), server: rowDoc(0.5, 1360000, 80000, "2026-11-20T09:00:00.000Z") });
  await RO.ctx.persistRemoteData();
  var ro = RO.calls.filter(function (c) { return c.method === "PUT"; })[0].body.data.quarters["2026-Q4"].assets[0];
  t("…แท็บไม่มีราคาสดแต่แถวของแท็บใหม่กว่า → ไม่รับราคาเก่าของ server (คง 1,700,000 ที่ $100,000)", ro.manualValue === 1700000 && ro.btcPriceUsd === 100000 && ro.btcValuedAt === AT, ro);

  console.log("== หลังบันทึก: สำเนาเอกสารใน snapshot = ฉบับที่บันทึก (หน้าอื่น + btc-value.js ไม่ต้องรอ Load Latest Data) ==");
  var PS = sandbox({ withSnapDoc: true });
  await PS.ctx.persistRemoteData();
  var sw = PS.snapWrites[PS.snapWrites.length - 1];
  var psPut = PS.calls.filter(function (c) { return c.method === "PUT"; })[0];
  t("PUT สำเร็จ → snapshot.portfolioStatus.data = เอกสารที่ PUT (แถว bitcoin 1,700,000) · mode / ฟิลด์อื่นของ snapshot คงไว้",
    PS.snapWrites.length === 1 && JSON.stringify(sw.portfolioStatus.data) === JSON.stringify(psPut.body.data) && sw.portfolioStatus.mode === "supabase" && sw.snapshotId === "s1" && sw.loadedAt === AT && sw.portfolioStatus.data.quarters["2026-Q4"].assets[0].manualValue === 1700000);
  PS.ctx.state.data.quarters["2026-Q4"].assets[0].name = "changed later";
  t("…เป็นสำเนา ไม่แชร์ reference กับเอกสารในหน้า", sw.portfolioStatus.data.quarters["2026-Q4"].assets[0].name === "Bitcoin");
  var PF = sandbox({ withSnapDoc: true, failPut: true });
  await PF.ctx.persistRemoteData();
  t("PUT ล้ม → ไม่แตะ snapshot", PF.snapWrites.length === 0);
  var P0 = sandbox({ noPrice: true });
  await P0.ctx.persistRemoteData();
  t("ยังไม่มี snapshot เลย → ไม่สร้างขึ้นเอง", P0.snapWrites.length === 0);

  console.log("== ข้อความ / หน้า ==");
  t("ข้อความไม่มีราคา = สีเตือน", S.ctx.statusToneOf(K(S, "BTC_NO_PRICE_TH")) === "qe-st-warn");
  t("ข้อความดึงอัตราแลกเปลี่ยนไม่ได้ = สีเตือน", S.ctx.statusToneOf(K(S, "BTC_NO_FX_TH")) === "qe-st-warn");
  t("ข้อความกรอกจำนวนผิด = สีผิดพลาด", S.ctx.statusToneOf(K(S, "BTC_QTY_INVALID_TH")) === "qe-st-bad");
  var N = sandbox({ qty: "0.5" }); N.ctx.renderBtcNote();
  t("โน้ตใต้ช่อง: ≈ ฿1,700,000 · BTC $100,000 · USD/THB 34.00 · ราคา ณ …", /≈ ฿1,700,000/.test(N.els.btcQtyNote.textContent) && /BTC \$100,000 · USD\/THB 34\.00/.test(N.els.btcQtyNote.textContent) && /ราคา ณ/.test(N.els.btcQtyNote.textContent), N.els.btcQtyNote.textContent);
  // privacy.js ซ่อน "ตัวเลข + บาท/THB" ทุกตัว — อัตราแลกเปลี่ยนไม่ใช่เงิน ต้องไม่อยู่ในรูปนั้น (เจอใน Chrome: "× XXX บาท/USD")
  t("…อัตราแลกเปลี่ยนไม่อยู่ในรูป \"ตัวเลข บาท/THB\" (privacy.js จะไม่ซ่อนผิด) · มีแต่ ฿ ของมูลค่า", !/[\d,.]+\s?(?:บาท|THB)(?![A-Za-z0-9])/.test(N.els.btcQtyNote.textContent), N.els.btcQtyNote.textContent);
  var labelM = /<label class="btc-qty-field is-hidden">[\s\S]*?<\/label>/.exec(HTML);
  t("index.html: ช่อง #btcQtyInput + โน้ต #btcQtyNote อยู่ใน .btc-qty-field", !!labelM && /id="btcQtyInput"/.test(labelM[0]) && /id="btcQtyNote"/.test(labelM[0]));
  var iBv = HTML.indexOf('/btc-value.js?v=20261125-btc-1"'), iApp = HTML.indexOf("/app.js?v=");
  t("index.html: โหลด btc-value.js ก่อน app.js", iBv > 0 && iApp > iBv);
  t("หัวฟอร์มบอกว่า Bitcoin กรอกเป็นจำนวน BTC", /Bitcoin กรอกเป็นจำนวน BTC/.test(HTML));
  finish();
})().catch(function (e) { fail++; console.log("  ✗ เทสต์ล้มกลางทาง: " + (e && e.stack || e)); finish(); });
