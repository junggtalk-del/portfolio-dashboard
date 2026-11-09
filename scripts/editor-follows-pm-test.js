// Quarterly Editor ตามหน้า AI Portfolio Manager (spec 2026-11-09-pm-foreign-sleeve-design.md · Addendum ข้อ 1, 3, 4)
//   แถวหุ้นต่างประเทศของไตรมาสปัจจุบัน (= ไตรมาสล่าสุด) ใน state ของ Editor ได้มูลค่ารวม + % ลงทุนจริงจาก PM
//   คงชื่อ/id ของแถวแรก · เงินเติม/ถอนรวมทุกแถว · ไม่มี fromPM · ไม่ PUT ตอนซิงก์ (บันทึกไปกับการแก้ครั้งถัดไป)
//   ล็อก: เพิ่มหุ้นต่างประเทศใหม่ไม่ได้ · แก้ได้เฉพาะชื่อ + เงินเติม/ถอน · ลบไม่ได้ · "บันทึกไตรมาส" แช่ค่าที่ซิงก์
//   โหมด editor (ยังไม่กรอกเงินสด / ไม่มี holdings / ดูไตรมาสเก่า) = พฤติกรรมเดิมทุกอย่าง
// ดึงฟังก์ชันจริงจาก public/app.js มารันใน sandbox แบบ quarterly-editor-save-test.js — ไม่ copy โค้ดมาเขียนใหม่
// node scripts/editor-follows-pm-test.js
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var ROOT = path.join(__dirname, "..");
var SRC = fs.readFileSync(path.join(ROOT, "public", "app.js"), "utf8");
var HTML = fs.readFileSync(path.join(ROOT, "public", "index.html"), "utf8");
var CSS = fs.readFileSync(path.join(ROOT, "public", "styles.css"), "utf8");
var FS = require("../public/foreign-sleeve.js");
// fix round 1 (spec Addendum ข้อ 5 · quarter-ended): โมดูลตัดสินด้วย "วันนี้" → harness ใส่ window.ForeignSleeve ที่ล็อกนาฬิกา
//   ค่าเริ่ม 9 พ.ย. 2026 (fixture ปักไตรมาสปัจจุบัน 2026-Q4) · boot({ now }) เปลี่ยนได้ — ผลเดิมทุกวันที่รัน
var CLOCK = require("./sleeve-clock");

var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + (extra != null ? "  → " + extra : "")); }
}
function finish() {
  console.log("\n" + (pass + fail) + " checks · " + pass + " passed · " + fail + " failed");
  process.exit(fail ? 1 : 0);
}

// ---------------- ดึงโค้ดจริงจาก app.js ----------------
// ฟังก์ชันระดับบนสุดจบด้วย "}" ที่ต้นบรรทัด (กติกาเดียวกับ quarterly-editor-save-test.js)
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
// const ระดับบนสุด: บรรทัดเดียวจบด้วย ";" · object หลายบรรทัดจบด้วย "};" ที่ต้นบรรทัด
function extractConst(name) {
  var re = new RegExp("(^|\\n)(const " + name + " = )");
  var m = re.exec(SRC);
  if (!m) throw new Error("ไม่เจอ const " + name + " ใน app.js");
  var rest = SRC.slice(m.index + m[1].length);
  var nl = rest.search(/\r?\n/);
  var firstLine = nl < 0 ? rest : rest.slice(0, nl);
  if (/;\s*$/.test(firstLine)) return firstLine + "\n";
  var e = /\r?\n\};\r?\n/.exec(rest);
  if (!e) throw new Error("หาจุดจบของ const " + name + " ไม่เจอ");
  return rest.slice(0, e.index) + "\n};\n";
}
var FUNCS = [
  "currentQuarterKey", "currentQuarter", "portfolioHeaders", "readJsonResponse", "adoptServerAllocation", "persistRemoteData", "saveData",
  "compareQuarter", "clamp", "formatMoney", "formatPercent", "formatNetFlow", "assetGrossValue", "getTotals", "assetMetrics", "assetKey",
  "getPreviousSavedQuarter", "escapeHtml", "renderRows", "readAssetFromForm", "handleFormSubmit", "editAsset", "deleteAsset", "resetForm",
  "saveSnapshot", "createOrSwitchQuarter", "addQuarterFromInputs", "copyFromPreviousQuarter", "deleteQuarter", "updateFormMode",
  // ใหม่ (Task 2)
  "fetchPMHoldings", "syncForeignFromPM", "refreshForeignFromPM", "isPMSyncedAsset", "setFormPMLock", "onEditorTabReturn",
  // fix round 1
  "applyPMSync", "runPendingPMSync",
  // final fix wave: [1] state.loaded (โหลดใหม่แทนรับคีย์) · [4] รอบดึงที่ค้าง (saveSnapshot รอ)
  "loadRemoteData", "reloadRemoteData", "pullPMHoldings", "refreshQuotes"
];
var CONSTS = ["TYPE_LABELS", "PM_SYNC_STATUS_TH", "PM_FOREIGN_LOCKED_TH", "PM_DELETE_TITLE_TH", "PM_QUARTER_ENDED_TH", "NOT_LOADED_TH"];
var CODE;
try {
  CODE = CONSTS.map(extractConst).join("\n") + "\n" + FUNCS.map(extract).join("\n");
} catch (e) {
  console.log("  ✗ ดึงโค้ดจาก app.js ไม่ได้: " + e.message);
  fail++;
  finish();
}

// ข้อความที่ผู้ใช้เห็น (ปักตามบรีฟ)
var SYNC_TH = "หุ้นต่างประเทศอัปเดตจาก AI Portfolio Manager แล้ว — จะบันทึกพร้อมการแก้ครั้งถัดไป";
var LOCKED_TH = "หุ้นต่างประเทศดึงจาก AI Portfolio Manager — แก้มูลค่าที่หน้านั้น";
var BADGE_TH = "จาก AI Portfolio Manager";
var DELETE_TITLE_TH = "แก้มูลค่าที่หน้า AI Portfolio Manager";
// final fix wave [2c]: ค่าที่เก็บไว้ของไตรมาสที่จบแล้ว = ประวัติของไตรมาสนั้น (แก้ได้)
var ENDED_TH = "ไตรมาสนี้จบแล้วตามปฏิทิน — ค่าหุ้นต่างประเทศที่เก็บไว้คือประวัติของไตรมาสนี้ (แก้ได้) · สร้างไตรมาสใหม่เพื่อให้ตาม AI Portfolio Manager";
var SAVED_TH = "บันทึกลง database แล้ว";
// final fix wave [1]: โหลดครั้งแรกไม่สำเร็จ → ไม่ PUT
var NOT_LOADED_TH = "ยังโหลดข้อมูลพอร์ตจาก server ไม่สำเร็จ — ยังไม่บันทึกเพื่อกันข้อมูลหาย (ลองรีเฟรชหน้าจอ)";
var LOAD_FAIL_RE = /^โหลดจาก database ไม่สำเร็จ/;

// ---------------- harness ----------------
function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
function resp(status, body) {
  return { ok: status >= 200 && status < 300, status: status, text: function () { return Promise.resolve(body === undefined ? "" : JSON.stringify(body)); } };
}
function flush() { return new Promise(function (r) { setTimeout(r, 5); }); }
function classList(initial) {
  var set = {};
  (initial || []).forEach(function (c) { set[c] = true; });
  return {
    add: function (c) { set[c] = true; },
    remove: function (c) { delete set[c]; },
    contains: function (c) { return !!set[c]; },
    toggle: function (c, force) { var on = force === undefined ? !set[c] : !!force; if (on) set[c] = true; else delete set[c]; return on; }
  };
}
function field(value) { return { value: value == null ? "" : String(value), disabled: false, required: false, classList: classList() }; }

function boot(opts) {
  var calls = [], rowsOut = [], uuid = 0;
  var counters = { render: 0, views: [] };
  var elements = {
    statusText: { textContent: "" }, quarterStatus: { textContent: "" },
    quarterInput: { value: "" }, newQuarterYearInput: { value: "" }, newQuarterNumberInput: { value: "" },
    typeInput: field("bitcoin"), nameInput: field(""), valueInput: field(""), investedPercentInput: field("100"),
    investedPercentField: { classList: classList() }, netFlowInput: field("0"),
    formTitle: { textContent: "" }, submitButton: { textContent: "" }, cancelEditButton: { classList: classList(["is-hidden"]) },
    pmLockNote: { classList: classList(["is-hidden"]) },
    rows: { set innerHTML(v) { rowsOut.length = 0; }, get innerHTML() { return ""; }, appendChild: function (r) { rowsOut.push(r); } },
    emptyState: { classList: classList() }, panelSubtitle: { textContent: "" }
  };
  elements.form = {
    reset: function () {
      elements.typeInput.value = "bitcoin"; elements.nameInput.value = ""; elements.valueInput.value = "";
      elements.investedPercentInput.value = "100"; elements.netFlowInput.value = "0";
    }
  };
  // boot() จำลองหน้า "หลังโหลดเอกสารสำเร็จแล้ว" (loaded true) · opts.loaded === false = โหลดครั้งแรกล้ม
  var state = {
    data: clone(opts.doc), editingId: null, activeView: "overview", saving: false, hydrating: !!opts.hydrating, loaded: opts.loaded !== false,
    lastUpdated: null, storageMode: "supabase", foreignFromPM: false, pmReason: null, pmHoldings: null, pmRefreshing: false, pmRefreshRun: null, pmSyncPending: false
  };
  function fakeFetch(url, init) {
    var method = (init && init.method) || "GET";
    calls.push({ url: url, method: method, headers: init && init.headers, body: init && init.body ? JSON.parse(init.body) : null });
    if (url === "/api/portfolio-holdings") {
      if (opts.holdingsFail === "throw") return Promise.reject(new Error("offline"));
      if (opts.holdingsFail) return Promise.resolve(resp(500, { error: "boom" }));
      return Promise.resolve(resp(200, { data: clone(opts.holdings), mode: "supabase" }));
    }
    if (url === "/api/portfolio" && method === "GET" && opts.getFail && opts.getFail()) return Promise.resolve(resp(503, { error: "unavailable" }));
    if (url === "/api/portfolio" && method === "GET") return Promise.resolve(resp(200, { data: clone(opts.server || opts.doc) }));
    if (url === "/api/portfolio" && method === "PUT") return Promise.resolve(resp(200, { ok: true }));
    return Promise.resolve(resp(404, {}));
  }
  var ctx = {
    state: state, elements: elements,
    render: function () { counters.render++; },
    renderSummary: function () {},
    setActiveView: function (v) { counters.views.push(v); },
    sessionStorage: { getItem: function () { return "pw"; } },
    fetch: fakeFetch,
    window: {
      ForeignSleeve: CLOCK.withClock(FS, opts.now || CLOCK.Q4_2026),
      PortfolioDataSnapshot: { read: function () { return opts.snapshot === undefined ? null : clone(opts.snapshot); } },
      confirm: function () { return true; }
    },
    document: { hidden: !!opts.hidden, createElement: function () { return { innerHTML: "" }; } },
    crypto: { randomUUID: function () { uuid++; return "uuid-" + uuid; } },
    console: console
  };
  vm.createContext(ctx);
  vm.runInContext(CODE, ctx, { filename: "app.js (extracted)" });
  return {
    ctx: ctx, state: state, el: elements, calls: calls, rows: rowsOut, counters: counters,
    puts: function () { return calls.filter(function (c) { return c.method === "PUT"; }); },
    q: function (key) { return state.data.quarters[key]; },
    submit: function () { ctx.handleFormSubmit({ preventDefault: function () {} }); }
  };
}

// app.js ทั้งไฟล์ใน DOM ปลอม — ครอบคลุมบรรทัดเริ่มหน้า (โหลด holdings คู่ขนาน → loadRemoteData → ซิงก์) และ listener focus/visibilitychange
function bootFull(opts) {
  var calls = [], els = {}, winListeners = {}, docListeners = {}, uuid = 0;
  var ctx2d = { clearRect: function () {}, beginPath: function () {}, arc: function () {}, fill: function () {}, moveTo: function () {}, closePath: function () {}, fillStyle: "" };
  function makeEl() {
    var html = "";
    var el = {
      textContent: "", value: "", disabled: false, required: false, title: "", style: {}, dataset: {}, width: 340, height: 340,
      children: [], listeners: {}, classList: classList(),
      addEventListener: function (type, fn) { (el.listeners[type] = el.listeners[type] || []).push(fn); },
      appendChild: function (c) { el.children.push(c); },
      querySelectorAll: function () { return []; },
      getContext: function () { return ctx2d; },
      reset: function () {}
    };
    Object.defineProperty(el, "innerHTML", { get: function () { return html; }, set: function (v) { html = String(v); el.children.length = 0; } });
    return el;
  }
  function el(sel) { if (!els[sel]) els[sel] = makeEl(); return els[sel]; }
  function fakeFetch(url, init) {
    var method = (init && init.method) || "GET";
    calls.push({ url: url, method: method, body: init && init.body ? JSON.parse(init.body) : null });
    if (url === "/api/portfolio-holdings") return Promise.resolve(resp(200, { data: clone(opts.holdings), mode: "supabase" }));
    // final fix wave [1]: opts.getFail() = true → GET เอกสารตอบ 503 (โหลดครั้งแรกล้ม / server ยังไม่ฟื้น)
    if (url === "/api/portfolio" && method === "GET" && opts.getFail && opts.getFail()) return Promise.resolve(resp(503, { error: "unavailable" }));
    if (url === "/api/portfolio" && method === "GET") return Promise.resolve(resp(200, { data: clone(opts.doc), mode: "supabase" }));
    return Promise.resolve(resp(200, { ok: true }));
  }
  var ctx = {
    fetch: fakeFetch,
    sessionStorage: { getItem: function () { return "pw"; } },
    crypto: { randomUUID: function () { uuid++; return "uuid-" + uuid; } },
    window: {
      ForeignSleeve: CLOCK.withClock(FS, opts.now || CLOCK.Q4_2026),
      PortfolioDataSnapshot: { read: function () { return null; } },
      confirm: function () { return true; },
      addEventListener: function (type, fn) { (winListeners[type] = winListeners[type] || []).push(fn); }
    },
    document: {
      hidden: false,
      body: { classList: classList() },
      querySelector: el,
      querySelectorAll: function () { return []; },
      createElement: function () { return makeEl(); },
      addEventListener: function (type, fn) { (docListeners[type] = docListeners[type] || []).push(fn); }
    },
    console: console
  };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx, { filename: "app.js" });
  return {
    calls: calls, el: el, ctx: ctx,
    fire: function (type) { (winListeners[type] || []).forEach(function (fn) { fn({}); }); },
    fireDoc: function (type) { (docListeners[type] || []).forEach(function (fn) { fn({}); }); },
    click: function (sel) { (el(sel).listeners.click || []).forEach(function (fn) { fn({ preventDefault: function () {} }); }); },
    puts: function () { return calls.filter(function (c) { return c.method === "PUT"; }); }
  };
}

// ---------------- fixtures ----------------
var DOC = {
  currentQuarter: "2026-Q4",
  quarters: {
    "2026-Q3": { key: "2026-Q3", savedAt: "2026-09-30T10:00:00.000Z", assets: [
      { id: "f3", type: "foreign-stock", name: "US", manualValue: 4600000, snapshotValue: 4600000, investedPercent: 90, netFlow: 0 },
      { id: "b3", type: "bitcoin", name: "Bitcoin", manualValue: 900000, snapshotValue: 900000, investedPercent: 100, netFlow: 0 }
    ] },
    "2026-Q4": { key: "2026-Q4", savedAt: null, assets: [
      { id: "f4", type: "foreign-stock", name: "US", manualValue: 5000000, snapshotValue: 5000000, investedPercent: 92, netFlow: 100000 },
      { id: "b4", type: "bitcoin", name: "Bitcoin", manualValue: 1000000, snapshotValue: 1000000, investedPercent: 100, netFlow: 0 },
      { id: "f4b", type: "foreign-stock", name: "EU", manualValue: 300000, snapshotValue: 300000, investedPercent: 100, netFlow: 50000 }
    ] }
  },
  allocation: { version: 1, map: {} },
  foreignSleeve: { cash: 400000, updatedAt: "2026-11-09T01:00:00.000Z" }
};
// หุ้นต่างประเทศที่ถือ = NVDA 3,000,000 + MSFT 2,600,000 = 5,600,000 · + เงินสด 400,000 = gross 6,000,000 (ลงทุนจริง 93.33%)
var HOLDINGS = [
  { canonicalSymbol: "NVDA", isHolding: true, marketValue: 3000000, portfolioBucket: "" },
  { canonicalSymbol: "MSFT", isHolding: true, marketValue: 2600000 },
  { canonicalSymbol: "PTT.BK", isHolding: true, marketValue: 700000 },
  { canonicalSymbol: "AAPL", isHolding: false, marketValue: 999999 }
];
var GROSS = 6000000, PCT = 5600000 / 6000000 * 100;
function near(a, b) { return typeof a === "number" && Math.abs(a - b) < 1e-6; }
function noCash(doc) { var d = clone(doc); delete d.foreignSleeve; return d; }
function hasFromPM(v) { return JSON.stringify(v).indexOf("fromPM") >= 0; }
function foreignRows(assets) { return (assets || []).filter(function (a) { return a.type === "foreign-stock"; }); }
// ไม่มี ฿ ใน title / aria-label (privacy.js ซ่อนได้เฉพาะ text node)
function moneyInAttr(html) { return /(?:title|aria-label)="[^"]*฿/.test(html); }

(async function main() {
  // ================= static =================
  console.log("== index.html / styles.css ==");
  var iFs = HTML.indexOf('/foreign-sleeve.js?v=20261109-fs-4"'), iApp = HTML.indexOf('/app.js?v=20261109-app-13"');
  t("index.html โหลด foreign-sleeve.js?v=20261109-fs-4 ก่อน app.js?v=20261109-app-13", iFs > 0 && iApp > 0 && iFs < iApp, iFs + " / " + iApp);
  t("index.html มีบรรทัดอธิบาย #pmLockNote (ซ่อนไว้ก่อน) ในฟอร์ม", /id="pmLockNote"/.test(HTML) && /class="[^"]*is-hidden[^"]*"[^>]*id="pmLockNote"|id="pmLockNote"[^>]*class="[^"]*is-hidden/.test(HTML));
  t("styles.css bump เป็น 20261109-qe-4 และมีสไตล์ป้าย .pm-source-badge", /\/styles\.css\?v=20261109-qe-4"/.test(HTML) && CSS.indexOf(".pm-source-badge") >= 0);
  var banned = ["ควรซื้อ", "ควรขาย", "น่าซื้อ", "น่าขาย", "น่าเข้า", "แนะนำซื้อ", "จุดเข้า", "ตัดขาดทุน"].filter(function (w) { return SRC.indexOf(w) >= 0 || HTML.indexOf(w) >= 0; });
  t("app.js / index.html ไม่มีคำแนะนำซื้อขาย", banned.length === 0, banned.join(","));

  // ================= A: ซิงก์ตอนเปิดหน้า (โหมด pm) =================
  console.log("== โหมด pm: ซิงก์แถวหุ้นต่างประเทศของไตรมาสปัจจุบัน ==");
  var A = boot({ doc: DOC, holdings: HOLDINGS });
  A.el.statusText.textContent = "โหลดข้อมูลจาก database แล้ว";
  var changed = await A.ctx.refreshForeignFromPM({ holdings: A.ctx.fetchPMHoldings() });
  var q4 = A.q("2026-Q4").assets;
  var row = q4[0];
  t("ซิงก์แล้วคืน true · state.foreignFromPM = true", changed === true && A.state.foreignFromPM === true);
  t("แถวหุ้นต่างประเทศแรกคงชื่อ/id (US · f4) และอยู่ตำแหน่งเดิม", row && row.id === "f4" && row.name === "US" && row.type === "foreign-stock", JSON.stringify(row));
  t("manualValue = snapshotValue = gross จาก PM (6,000,000)", row && row.manualValue === GROSS && row.snapshotValue === GROSS, row && row.manualValue);
  t("investedPercent = ลงทุนจริงของ PM (93.33%)", row && near(row.investedPercent, PCT), row && row.investedPercent);
  t("เงินเติม/ถอน = ผลรวมของแถวหุ้นต่างประเทศเดิมทุกแถว (100,000 + 50,000)", row && row.netFlow === 150000, row && row.netFlow);
  t("แถวหุ้นต่างประเทศอื่น (EU) ถูกรวม — เหลือหุ้นต่างประเทศแถวเดียว", foreignRows(q4).length === 1 && q4.length === 2, JSON.stringify(q4.map(function (a) { return a.name; })));
  t("แถวอื่น (Bitcoin) ไม่ถูกแตะ", JSON.stringify(q4[1]) === JSON.stringify(DOC.quarters["2026-Q4"].assets[1]));
  t("ไตรมาสก่อน (2026-Q3) ไม่ถูกแตะ", JSON.stringify(A.q("2026-Q3")) === JSON.stringify(DOC.quarters["2026-Q3"]));
  t("ไม่มี fromPM ใน state ที่จะถูกบันทึก", !hasFromPM(A.state.data));
  t("ไม่มีการ PUT ตอนซิงก์ (มีแค่ GET holdings ครั้งเดียว)", A.puts().length === 0 && A.calls.length === 1 && A.calls[0].url === "/api/portfolio-holdings" && A.calls[0].method === "GET",
    A.calls.map(function (c) { return c.method + " " + c.url; }).join(","));
  t("GET holdings ส่งรหัสผ่านไปด้วย (portfolioHeaders)", !!A.calls[0].headers && A.calls[0].headers["x-portfolio-password"] === "pw");
  t("ข้อความสถานะ: '" + SYNC_TH + "'", A.el.statusText.textContent === SYNC_TH, A.el.statusText.textContent);
  t("วาดหน้าใหม่หลังซิงก์", A.counters.render >= 1);
  // การ์ดสรุป / วงกลม / ตารางการเติบโต อ่าน state.data → ตามค่าที่ซิงก์ (6,000,000 + Bitcoin 1,000,000)
  var totNow = A.ctx.getTotals(), totSnap = A.ctx.getTotals(A.q("2026-Q4").assets, { useSnapshot: true });
  t("ยอดรวมของหน้า (การ์ดสรุป + ตารางการเติบโตที่ใช้ snapshot) = 7,000,000 · ลงทุนจริงหุ้นต่างประเทศ = 5,600,000",
    totNow.wealth === 7000000 && totSnap.wealth === 7000000 && near(totNow.invested, 5600000 + 1000000), JSON.stringify(totNow));

  A.el.statusText.textContent = "x";
  var again = await A.ctx.refreshForeignFromPM({});
  t("ซิงก์ซ้ำด้วยค่าเดิม → ไม่เปลี่ยน (คืน false · ข้อความสถานะไม่ถูกทับ · ไม่ PUT)", again === false && A.el.statusText.textContent === "x" && A.puts().length === 0 && A.q("2026-Q4").assets[0].manualValue === GROSS);

  console.log("== บันทึกครั้งถัดไปส่งค่าที่ซิงก์ ==");
  await A.ctx.persistRemoteData();
  var put = A.puts()[0];
  var pq4 = put && put.body.data.quarters["2026-Q4"].assets;
  t("persistRemoteData PUT แถวหุ้นต่างประเทศ = ค่าที่ซิงก์ (6,000,000 · 93.33% · เงินเติม 150,000 · id f4)",
    !!pq4 && pq4.length === 2 && pq4[0].id === "f4" && pq4[0].manualValue === GROSS && near(pq4[0].investedPercent, PCT) && pq4[0].netFlow === 150000, pq4 && JSON.stringify(pq4[0]));
  t("…PUT ไม่มี fromPM", !!put && !hasFromPM(put.body));
  t("…PUT คง foreignSleeve ไว้", !!put && JSON.stringify(put.body.data.foreignSleeve) === JSON.stringify(DOC.foreignSleeve));

  // ================= B: เอกสารเก่ามี fromPM ติดมา =================
  var DOCF = clone(DOC); DOCF.quarters["2026-Q4"].assets[0].fromPM = true;
  var B = boot({ doc: DOCF, holdings: HOLDINGS });
  await B.ctx.refreshForeignFromPM({});
  t("เอกสารที่มี fromPM ติดมา → หลังซิงก์ไม่เหลือ fromPM", !hasFromPM(B.state.data) && B.q("2026-Q4").assets[0].manualValue === GROSS);

  // ================= C: โหมด editor =================
  console.log("== โหมด editor: state ไม่เปลี่ยน ==");
  async function editorCase(label, opts) {
    var E = boot(opts);
    E.el.statusText.textContent = "x";
    var ch = await E.ctx.refreshForeignFromPM({});
    t(label + " → state ไม่เปลี่ยน · foreignFromPM = false · ไม่ PUT · สถานะไม่ถูกทับ",
      ch === false && JSON.stringify(E.state.data) === JSON.stringify(opts.doc) && E.state.foreignFromPM === false && E.puts().length === 0 && E.el.statusText.textContent === "x",
      JSON.stringify(E.q(opts.doc.currentQuarter).assets.map(function (a) { return a.manualValue; })));
    return E;
  }
  await editorCase("ยังไม่กรอกเงินสดในหน้า PM", { doc: noCash(DOC), holdings: HOLDINGS });
  await editorCase("holdings ว่าง ([])", { doc: DOC, holdings: [] });
  await editorCase("GET holdings 500 + ไม่มี snapshot", { doc: DOC, holdings: HOLDINGS, holdingsFail: true });
  await editorCase("GET holdings throw + snapshot ไม่มี portfolioHoldings", { doc: DOC, holdings: HOLDINGS, holdingsFail: "throw", snapshot: { portfolioStatus: null } });
  var DOCP = clone(DOC); DOCP.currentQuarter = "2026-Q3";
  var P = await editorCase("Editor เปิดไตรมาสเก่า (2026-Q3 ขณะที่มี 2026-Q4)", { doc: DOCP, holdings: HOLDINGS });
  P.ctx.editAsset("f3");
  t("ไตรมาสเก่า: แก้แถวหุ้นต่างประเทศได้ตามปกติ (ช่องมูลค่า/% ไม่ถูกปิด)", P.el.valueInput.disabled === false && P.el.investedPercentInput.disabled === false && P.el.typeInput.disabled === false);

  console.log("== holdings สำรองจาก data snapshot ==");
  var SN = boot({ doc: DOC, holdings: HOLDINGS, holdingsFail: true, snapshot: { portfolioHoldings: { data: clone(HOLDINGS) } } });
  await SN.ctx.refreshForeignFromPM({});
  t("GET holdings 500 → ใช้ holdings ใน snapshot → ซิงก์ได้ (6,000,000)", SN.state.foreignFromPM === true && SN.q("2026-Q4").assets[0].manualValue === GROSS);
  var SN2 = boot({ doc: DOC, holdings: HOLDINGS, holdingsFail: "throw", snapshot: { portfolioHoldings: { data: clone(HOLDINGS) } } });
  await SN2.ctx.refreshForeignFromPM({});
  t("GET holdings throw (เน็ตหลุด) → ใช้ holdings ใน snapshot", SN2.state.foreignFromPM === true && SN2.q("2026-Q4").assets[0].manualValue === GROSS);

  // ================= D: เพิ่มหุ้นต่างประเทศใหม่ตอน pm =================
  console.log("== ล็อก: เพิ่ม / แก้ / ลบ ==");
  var D = boot({ doc: DOC, holdings: HOLDINGS });
  await D.ctx.refreshForeignFromPM({});
  D.el.typeInput.value = "foreign-stock"; D.el.nameInput.value = "Robinhood"; D.el.valueInput.value = "100000"; D.el.investedPercentInput.value = "100"; D.el.netFlowInput.value = "0";
  D.submit(); await flush();
  t("เพิ่มรายการ foreign-stock ตอน pm → ไม่เพิ่ม", D.q("2026-Q4").assets.length === 2 && foreignRows(D.q("2026-Q4").assets).length === 1);
  t("…ข้อความ '" + LOCKED_TH + "'", D.el.statusText.textContent === LOCKED_TH, D.el.statusText.textContent);
  t("…ไม่บันทึก (ไม่มี PUT)", D.puts().length === 0);
  D.el.typeInput.value = "thai-stock"; D.el.nameInput.value = "SET"; D.el.valueInput.value = "250000"; D.el.investedPercentInput.value = "100"; D.el.netFlowInput.value = "0";
  D.submit(); await flush();
  var dput = D.puts()[0];
  t("เพิ่มสินทรัพย์อื่น (หุ้นไทย) ตอน pm ได้ตามปกติ + บันทึก", D.q("2026-Q4").assets.length === 3 && !!dput && dput.body.data.quarters["2026-Q4"].assets.length === 3);
  t("…PUT นั้นพาค่าที่ซิงก์ไปด้วย (6,000,000) และไม่มี fromPM", !!dput && dput.body.data.quarters["2026-Q4"].assets[0].manualValue === GROSS && !hasFromPM(dput.body));

  // แก้รายการ bitcoin ให้เป็น foreign-stock ตอน pm = เพิ่มแถวหุ้นต่างประเทศที่สอง → ไม่ได้
  var D2 = boot({ doc: DOC, holdings: HOLDINGS });
  await D2.ctx.refreshForeignFromPM({});
  D2.ctx.editAsset("b4");
  D2.el.typeInput.value = "foreign-stock";
  D2.submit(); await flush();
  t("แก้รายการอื่นให้กลายเป็น foreign-stock ตอน pm → ไม่ได้ (ข้อความเดียวกัน · ไม่ PUT)",
    D2.q("2026-Q4").assets[1].type === "bitcoin" && D2.el.statusText.textContent === LOCKED_TH && D2.puts().length === 0);

  // ================= E: แก้แถวที่ซิงก์ =================
  var E = boot({ doc: DOC, holdings: HOLDINGS });
  await E.ctx.refreshForeignFromPM({});
  E.ctx.editAsset("f4");
  t("แก้แถวที่ซิงก์: ช่องมูลค่า + % ลงทุนจริง + ประเภท ถูกปิด", E.el.valueInput.disabled === true && E.el.investedPercentInput.disabled === true && E.el.typeInput.disabled === true);
  t("…ชื่อ + เงินเติม/ถอน ยังแก้ได้", E.el.nameInput.disabled === false && E.el.netFlowInput.disabled === false);
  t("…แสดงบรรทัดอธิบาย (#pmLockNote)", E.el.pmLockNote.classList.contains("is-hidden") === false);
  t("…ช่องมูลค่าแสดงค่าจาก PM", Number(E.el.valueInput.value) === GROSS, E.el.valueInput.value);
  t("…เปิดแท็บจัดการข้อมูล", E.counters.views.indexOf("manage") >= 0);
  E.el.nameInput.value = "US (Dime)"; E.el.valueInput.value = "1"; E.el.investedPercentInput.value = "5"; E.el.netFlowInput.value = "200000"; E.el.typeInput.value = "bitcoin";
  E.submit(); await flush();
  var erow = E.q("2026-Q4").assets[0];
  t("บันทึกแถวที่ซิงก์: มูลค่า/% ที่ส่งจากฟอร์มถูกแทนด้วยค่า PM", erow.manualValue === GROSS && erow.snapshotValue === GROSS && near(erow.investedPercent, PCT), JSON.stringify(erow));
  t("…ชื่อ + เงินเติม/ถอนรับตามที่แก้ · ประเภทยังเป็นหุ้นต่างประเทศ · id เดิม", erow.name === "US (Dime)" && erow.netFlow === 200000 && erow.type === "foreign-stock" && erow.id === "f4", JSON.stringify(erow));
  var eput = E.puts()[0];
  t("…PUT ส่งค่านั้น (ไม่มี fromPM)", !!eput && eput.body.data.quarters["2026-Q4"].assets[0].name === "US (Dime)" && eput.body.data.quarters["2026-Q4"].assets[0].manualValue === GROSS &&
    eput.body.data.quarters["2026-Q4"].assets[0].netFlow === 200000 && !hasFromPM(eput.body));
  t("…ฟอร์มกลับเป็นปกติ (เปิดช่องคืน · ซ่อนคำอธิบาย · ไม่อยู่ในโหมดแก้)", E.el.valueInput.disabled === false && E.el.investedPercentInput.disabled === false && E.el.typeInput.disabled === false &&
    E.el.pmLockNote.classList.contains("is-hidden") && E.state.editingId === null);
  E.el.statusText.textContent = "x";
  await E.ctx.refreshForeignFromPM({});
  t("ซิงก์รอบถัดไปคงชื่อที่ผู้ใช้แก้ + เงินเติม/ถอน", E.q("2026-Q4").assets[0].name === "US (Dime)" && E.q("2026-Q4").assets[0].netFlow === 200000 && E.el.statusText.textContent === "x");

  // แก้แถวอื่นตอน pm = ปกติ · สลับจากแถวที่ล็อกไปแถวอื่นโดยไม่กดยกเลิก → ปลดล็อก
  E.ctx.editAsset("f4"); E.ctx.editAsset("b4");
  t("สลับไปแก้ Bitcoin หลังเปิดแถวที่ซิงก์ → ช่องเปิดคืน + ซ่อนคำอธิบาย", E.el.valueInput.disabled === false && E.el.investedPercentInput.disabled === false && E.el.pmLockNote.classList.contains("is-hidden"));
  E.el.valueInput.value = "1200000";
  E.submit(); await flush();
  t("…แก้มูลค่า Bitcoin ได้ตามปกติ", E.q("2026-Q4").assets[1].manualValue === 1200000);

  // ================= F: ลบแถวที่ซิงก์ =================
  var F = boot({ doc: DOC, holdings: HOLDINGS });
  await F.ctx.refreshForeignFromPM({});
  F.ctx.deleteAsset("f4"); await flush();
  t("ลบแถวที่ซิงก์ไม่ได้ (ยังอยู่ · ข้อความ · ไม่ PUT)", F.q("2026-Q4").assets.some(function (a) { return a.id === "f4"; }) && F.el.statusText.textContent === LOCKED_TH && F.puts().length === 0);
  F.ctx.deleteAsset("b4"); await flush();
  t("ลบแถวอื่นได้ตามปกติ + บันทึก", !F.q("2026-Q4").assets.some(function (a) { return a.id === "b4"; }) && F.puts().length === 1);

  // ================= G: บันทึกไตรมาส =================
  console.log("== บันทึกไตรมาส (saveSnapshot) แช่ค่าที่ซิงก์ ==");
  var G = boot({ doc: DOC, holdings: HOLDINGS });
  await G.ctx.refreshForeignFromPM({});
  // หุ้นในหน้า PM ขยับหลังซิงก์ครั้งก่อน (holdings ในหน้านี้อัปเดตแล้ว) → กดบันทึกไตรมาสต้องแช่ค่าล่าสุด
  var H2 = clone(HOLDINGS); H2[0].marketValue = 3500000;
  G.state.pmHoldings = H2;
  G.ctx.saveSnapshot(); await flush();
  var grow = G.q("2026-Q4").assets[0];
  t("saveSnapshot: แถวหุ้นต่างประเทศแช่ค่าจาก PM ล่าสุด (6,500,000)", grow.manualValue === 6500000 && grow.snapshotValue === 6500000 && !!G.q("2026-Q4").savedAt, JSON.stringify(grow));
  var gput = G.puts()[0];
  t("…PUT ส่งค่าที่แช่ + savedAt · ไม่มี fromPM", !!gput && gput.body.data.quarters["2026-Q4"].assets[0].snapshotValue === 6500000 && !!gput.body.data.quarters["2026-Q4"].savedAt && !hasFromPM(gput.body));
  t("…ไตรมาสก่อนไม่ถูกแตะ", !!gput && JSON.stringify(gput.body.data.quarters["2026-Q3"]) === JSON.stringify(DOC.quarters["2026-Q3"]));

  // ================= H: เปลี่ยนไตรมาส =================
  console.log("== เปลี่ยน / เพิ่ม / คัดลอกไตรมาส ==");
  var Q = boot({ doc: DOC, holdings: HOLDINGS });
  await Q.ctx.refreshForeignFromPM({});
  Q.el.quarterInput.value = "2026-Q3";
  Q.ctx.createOrSwitchQuarter(); await flush();
  t("เลือกดูไตรมาสเก่า → ปลดล็อก (foreignFromPM = false) · ไตรมาสเก่าไม่ถูกทับ", Q.state.foreignFromPM === false && JSON.stringify(Q.q("2026-Q3")) === JSON.stringify(DOC.quarters["2026-Q3"]));
  t("…isPMSyncedAsset(แถวหุ้นต่างประเทศไตรมาสเก่า) = false", Q.ctx.isPMSyncedAsset(Q.q("2026-Q3").assets[0]) === false);
  var qput = Q.puts()[0];
  t("…PUT จากการเปลี่ยนไตรมาส: ไตรมาสเก่าคงเดิม · ไม่มี fromPM", !!qput && JSON.stringify(qput.body.data.quarters["2026-Q3"]) === JSON.stringify(DOC.quarters["2026-Q3"]) && !hasFromPM(qput.body));
  Q.ctx.deleteAsset("f3"); await flush();
  t("…ไตรมาสเก่า: ลบแถวหุ้นต่างประเทศได้ตามปกติ", !Q.q("2026-Q3").assets.some(function (a) { return a.id === "f3"; }));
  Q.el.quarterInput.value = "2026-Q4";
  Q.ctx.createOrSwitchQuarter(); await flush();
  t("กลับมาไตรมาสล่าสุด → ล็อกอีกครั้ง (ใช้ holdings ที่โหลดไว้ ไม่ต้องรอ)", Q.state.foreignFromPM === true && Q.ctx.isPMSyncedAsset(Q.q("2026-Q4").assets[0]) === true);

  // ไตรมาสใหม่ (ล่าสุด) ว่าง → แถวหุ้นต่างประเทศจาก PM ใช้ชื่อแถวหุ้นต่างประเทศแรกของไตรมาสก่อน (ตัวตนต่อเนื่อง — Addendum ข้อ 3)
  var N = boot({ doc: DOC, holdings: HOLDINGS });
  await N.ctx.refreshForeignFromPM({});
  N.el.newQuarterYearInput.value = "2027"; N.el.newQuarterNumberInput.value = "1";
  N.ctx.addQuarterFromInputs(); await flush();
  var nq = N.q("2027-Q1");
  t("เพิ่มไตรมาสใหม่ (ล่าสุด) ตอน pm → มีแถวหุ้นต่างประเทศจาก PM แถวเดียว ชื่อ US (ตามแถวแรกของ 2026-Q4) มี id",
    !!nq && nq.assets.length === 1 && nq.assets[0].type === "foreign-stock" && nq.assets[0].name === "US" && !!nq.assets[0].id && nq.assets[0].manualValue === GROSS, nq && JSON.stringify(nq.assets));
  t("…ล็อก (foreignFromPM) · PUT ไม่มี fromPM", N.state.foreignFromPM === true && N.puts().length === 1 && !hasFromPM(N.puts()[0].body));
  N.ctx.copyFromPreviousQuarter(); await flush();
  var nAssets = N.q("2027-Q1").assets;
  t("คัดลอกจากไตรมาสก่อนตอน pm → คัดลอกเฉพาะสินทรัพย์อื่น (Bitcoin) · หุ้นต่างประเทศยังแถวเดียวค่าจาก PM",
    nAssets.length === 2 && foreignRows(nAssets).length === 1 && foreignRows(nAssets)[0].manualValue === GROSS && nAssets.some(function (a) { return a.type === "bitcoin"; }),
    JSON.stringify(nAssets.map(function (a) { return a.type + ":" + a.name + ":" + a.manualValue; })));

  // แถวหุ้นต่างประเทศเดิมไม่มี id (ข้อมูลเก่า) → แถวที่ซิงก์ได้ id (ปุ่มแก้ไข/ลบอ้างได้)
  var DOCI = clone(DOC); delete DOCI.quarters["2026-Q4"].assets[0].id;
  var I = boot({ doc: DOCI, holdings: HOLDINGS });
  await I.ctx.refreshForeignFromPM({});
  t("แถวหุ้นต่างประเทศเดิมไม่มี id → แถวที่ซิงก์ได้ id", !!I.q("2026-Q4").assets[0].id && I.q("2026-Q4").assets[0].name === "US");

  // ลบไตรมาสล่าสุดขณะดูไตรมาสนั้น → ไตรมาสที่เหลือล่าสุดกลายเป็นปัจจุบัน → ตั้งโหมดใหม่
  //   fix round 1 (Addendum ข้อ 5): 2026-Q3 จบแล้วตามปฏิทิน (วันนี้ 9 พ.ย. 2026) → quarter-ended: ไม่ซิงก์ ไม่ล็อก
  //   และ PUT ของการลบต้องไม่เขียนค่า PM ลง 2026-Q3 (เดิมเทสต์นี้คาดให้ซิงก์ = ประวัติถูกเขียนทับ)
  var DQ = boot({ doc: DOC, holdings: HOLDINGS });
  await DQ.ctx.refreshForeignFromPM({});
  DQ.ctx.deleteQuarter("2026-Q4"); await flush();
  var dqPut = DQ.puts()[0];
  t("ลบไตรมาสปัจจุบัน (พ.ย.) → 2026-Q3 เป็นล่าสุดแต่จบแล้วตามปฏิทิน → ไม่ซิงก์ ไม่ล็อก (quarter-ended) · 2026-Q3 คงค่าเดิม",
    DQ.state.data.currentQuarter === "2026-Q3" && DQ.state.foreignFromPM === false && DQ.state.pmReason === "quarter-ended" &&
    JSON.stringify(DQ.q("2026-Q3")) === JSON.stringify(DOC.quarters["2026-Q3"]));
  t("…PUT ของการลบ: 2026-Q3 = ค่าเดิม (หุ้นต่างประเทศ 4,600,000 ไม่ใช่ค่า PM) · ไม่มี 2026-Q4",
    !!dqPut && JSON.stringify(dqPut.body.data.quarters["2026-Q3"]) === JSON.stringify(DOC.quarters["2026-Q3"]) && dqPut.body.data.quarters["2026-Q3"].assets[0].manualValue === 4600000 &&
    !dqPut.body.data.quarters["2026-Q4"]);
  // ตัวเทียบ: ลบแบบเดียวกันระหว่างที่ 2026-Q3 ยังไม่จบ (15 ก.ย. 2026) → 2026-Q3 เป็นไตรมาสปัจจุบันจริง → ซิงก์ + ล็อก
  var DQS = boot({ doc: DOC, holdings: HOLDINGS, now: CLOCK.Q3_2026 });
  await DQS.ctx.refreshForeignFromPM({});
  DQS.ctx.deleteQuarter("2026-Q4"); await flush();
  t("ตัวเทียบ: ลบ 2026-Q4 ระหว่างที่ 2026-Q3 ยังไม่จบ (ก.ย.) → ซิงก์ + ล็อก 2026-Q3", DQS.state.foreignFromPM === true && DQS.q("2026-Q3").assets[0].manualValue === GROSS);

  // ================= I: ตารางรายการ =================
  console.log("== ตาราง Assets ในไตรมาสนี้ ==");
  var R = boot({ doc: DOC, holdings: HOLDINGS });
  await R.ctx.refreshForeignFromPM({});
  R.ctx.renderRows();
  var r0 = R.rows[0] && R.rows[0].innerHTML || "", r1 = R.rows[1] && R.rows[1].innerHTML || "";
  t("แถวที่ซิงก์มีป้าย '" + BADGE_TH + "' + ลิงก์ /portfolio-manager", r0.indexOf(BADGE_TH) >= 0 && r0.indexOf('href="/portfolio-manager"') >= 0, r0.slice(0, 400));
  t("…ปุ่มลบถูกปิด พร้อม title '" + DELETE_TITLE_TH + "'", /data-delete-id="f4"[^>]*\sdisabled/.test(r0) && r0.indexOf('title="' + DELETE_TITLE_TH + '"') >= 0, r0.slice(-400));
  t("…ไม่มี ฿ ใน title / aria-label", !moneyInAttr(r0));
  t("…ปุ่มแก้ไขยังกดได้", /data-edit-id="f4"/.test(r0) && !/data-edit-id="f4"[^>]*disabled/.test(r0));
  t("แถวอื่นไม่มีป้าย + ปุ่มลบปกติ", r1.indexOf(BADGE_TH) < 0 && !/disabled/.test(r1));
  var RE = boot({ doc: noCash(DOC), holdings: HOLDINGS });
  await RE.ctx.refreshForeignFromPM({});
  RE.ctx.renderRows();
  t("โหมด editor: ไม่มีป้าย ไม่มีปุ่มที่ถูกปิด", RE.rows.length === 3 && RE.rows.every(function (r) { return r.innerHTML.indexOf(BADGE_TH) < 0 && !/disabled/.test(r.innerHTML); }));

  // ================= J: โหมด editor แก้/เพิ่มหุ้นต่างประเทศได้เหมือนเดิม =================
  console.log("== โหมด editor: พฤติกรรมเดิม ==");
  var K = boot({ doc: noCash(DOC), holdings: HOLDINGS });
  await K.ctx.refreshForeignFromPM({});
  K.ctx.editAsset("f4");
  t("แก้แถวหุ้นต่างประเทศได้ (ช่องไม่ถูกปิด · ไม่มีคำอธิบาย)", K.el.valueInput.disabled === false && K.el.investedPercentInput.disabled === false && K.el.pmLockNote.classList.contains("is-hidden"));
  K.el.valueInput.value = "7000000"; K.el.investedPercentInput.value = "80";
  K.submit(); await flush();
  t("…บันทึกมูลค่าที่กรอกเอง (7,000,000 · 80%)", K.q("2026-Q4").assets[0].manualValue === 7000000 && K.q("2026-Q4").assets[0].investedPercent === 80);
  K.el.typeInput.value = "foreign-stock"; K.el.nameInput.value = "JP"; K.el.valueInput.value = "100000"; K.el.investedPercentInput.value = "100";
  K.submit(); await flush();
  t("…เพิ่มแถวหุ้นต่างประเทศใหม่ได้", foreignRows(K.q("2026-Q4").assets).length === 3);
  K.ctx.deleteAsset("f4b"); await flush();
  t("…ลบแถวหุ้นต่างประเทศได้", !K.q("2026-Q4").assets.some(function (a) { return a.id === "f4b"; }));

  // ================= K: กันยิงซ้อน / กลับมาที่แท็บ =================
  console.log("== กันยิงซ้อน · กลับมาที่แท็บ ==");
  var O = boot({ doc: DOC, holdings: HOLDINGS });
  await Promise.all([O.ctx.refreshForeignFromPM({}), O.ctx.refreshForeignFromPM({})]);
  t("เรียกซ้อนกัน 2 ครั้ง → GET holdings ครั้งเดียว", O.calls.filter(function (c) { return c.url === "/api/portfolio-holdings"; }).length === 1);
  O.ctx.editAsset("b4");
  var before = O.calls.length;
  var skipped = await O.ctx.refreshForeignFromPM({});
  t("กำลังแก้รายการอยู่ → ไม่ดึง ไม่ซิงก์", skipped === false && O.calls.length === before);
  var HY = boot({ doc: DOC, holdings: HOLDINGS, hydrating: true });
  await HY.ctx.refreshForeignFromPM({});
  t("กำลังโหลดเอกสาร (hydrating) → ไม่ดึง", HY.calls.length === 0);
  var HID = boot({ doc: DOC, holdings: HOLDINGS, hidden: true });
  HID.ctx.onEditorTabReturn(); await flush();
  t("แท็บยังซ่อนอยู่ → ไม่ดึง", HID.calls.length === 0);

  // แท็บ Editor เปิดค้าง (เงินสด 400,000) → ไปกรอกเงินสดใหม่ 800,000 ในหน้า PM → กลับมา
  var SERVER = clone(DOC); SERVER.foreignSleeve = { cash: 800000, updatedAt: "2026-11-09T09:00:00.000Z" };
  var TR = boot({ doc: DOC, holdings: HOLDINGS, server: SERVER });
  await TR.ctx.refreshForeignFromPM({});
  TR.ctx.onEditorTabReturn(); await flush();
  var trow = TR.q("2026-Q4").assets[0];
  t("กลับมาที่แท็บ → รับเงินสดล่าสุดจาก server แล้วซิงก์ (5,600,000 + 800,000 = 6,400,000)", trow.manualValue === 6400000 && TR.state.data.foreignSleeve.cash === 800000, JSON.stringify(trow));
  t("…ไม่ PUT (มีแค่ GET)", TR.puts().length === 0 && TR.calls.every(function (c) { return c.method === "GET"; }));
  t("…ข้อความสถานะบอกว่าอัปเดตแล้ว", TR.el.statusText.textContent === SYNC_TH);

  // ================= fix round 1 · [1] ไตรมาสที่จบตามปฏิทินไม่รับค่า PM (Addendum ข้อ 5) =================
  console.log("== fix round 1 [1]: ไตรมาสที่จบตามปฏิทิน (quarter-ended) ==");
  // probe ของผู้รีวิว: ไตรมาสล่าสุด 2026-Q3 แช่ 30 ก.ย. ที่ 4,600,000 · เปิด Editor เดือน ต.ค. · กด "เพิ่มไตรมาส 2026-Q4"
  var DOC_R = {
    currentQuarter: "2026-Q3",
    quarters: {
      "2026-Q2": { key: "2026-Q2", savedAt: "2026-06-30T10:00:00.000Z", assets: [
        { id: "f2", type: "foreign-stock", name: "US", manualValue: 4200000, snapshotValue: 4200000, investedPercent: 90, netFlow: 0 },
        { id: "b2", type: "bitcoin", name: "Bitcoin", manualValue: 800000, snapshotValue: 800000, investedPercent: 100, netFlow: 0 }
      ] },
      "2026-Q3": { key: "2026-Q3", savedAt: "2026-09-30T10:00:00.000Z", assets: [
        { id: "f3", type: "foreign-stock", name: "US", manualValue: 4600000, snapshotValue: 4600000, investedPercent: 90, netFlow: 0 },
        { id: "b3", type: "bitcoin", name: "Bitcoin", manualValue: 900000, snapshotValue: 900000, investedPercent: 100, netFlow: 0 }
      ] }
    },
    foreignSleeve: { cash: 400000, updatedAt: "2026-10-10T01:00:00.000Z" }
  };
  var OCT = CLOCK.at(2026, 10, 15);
  var RO = boot({ doc: DOC_R, holdings: HOLDINGS, now: OCT });
  RO.el.statusText.textContent = "โหลดข้อมูลจาก database แล้ว";
  var roCh = await RO.ctx.refreshForeignFromPM({});
  t("เปิด Editor 15 ต.ค. ขณะไตรมาสล่าสุด = 2026-Q3 (จบแล้ว) → ไม่ซิงก์ ไม่ล็อก (quarter-ended) · state ไม่เปลี่ยน · ไม่ PUT",
    roCh === false && RO.state.foreignFromPM === false && RO.state.pmReason === "quarter-ended" && JSON.stringify(RO.state.data) === JSON.stringify(DOC_R) && RO.puts().length === 0);
  t("…ข้อความสถานะ '" + ENDED_TH + "'", RO.el.statusText.textContent === ENDED_TH, RO.el.statusText.textContent);
  RO.ctx.editAsset("f3");
  t("…แก้แถวหุ้นต่างประเทศของไตรมาสที่จบแล้วได้ตามปกติ (ไม่ล็อก) + บอกเหตุผลที่ไม่ตาม PM", RO.el.valueInput.disabled === false && RO.el.investedPercentInput.disabled === false &&
    RO.el.pmLockNote.classList.contains("is-hidden") && RO.el.statusText.textContent === ENDED_TH);
  RO.ctx.resetForm();
  RO.el.newQuarterYearInput.value = "2026"; RO.el.newQuarterNumberInput.value = "4";
  RO.ctx.addQuarterFromInputs(); await flush();
  var roPut = RO.puts()[0];
  t("กดเพิ่มไตรมาส 2026-Q4 → PUT: 2026-Q3 ค่าเดิมทุกอย่าง (หุ้นต่างประเทศแช่ไว้ 4,600,000 · ไม่ใช่ค่า PM)",
    !!roPut && JSON.stringify(roPut.body.data.quarters["2026-Q3"]) === JSON.stringify(DOC_R.quarters["2026-Q3"]) && roPut.body.data.quarters["2026-Q3"].assets[0].manualValue === 4600000,
    roPut && JSON.stringify(roPut.body.data.quarters["2026-Q3"].assets[0]));
  var roQ4 = roPut && roPut.body.data.quarters["2026-Q4"];
  t("…2026-Q4 ได้แถวหุ้นต่างประเทศจาก PM (ชื่อ US ตามไตรมาสก่อน · 6,000,000) · ล็อก · ไม่มี fromPM",
    !!roQ4 && roQ4.assets.length === 1 && roQ4.assets[0].name === "US" && roQ4.assets[0].manualValue === GROSS && RO.state.foreignFromPM === true && RO.state.pmReason === null && !hasFromPM(roPut.body),
    roQ4 && JSON.stringify(roQ4.assets));
  // สลับกลับไปดู 2026-Q3 (ตอนนี้เป็นไตรมาสเก่า) → past-quarter ไม่แตะ
  RO.el.quarterInput.value = "2026-Q3"; RO.ctx.createOrSwitchQuarter(); await flush();
  t("…สลับกลับไปดู 2026-Q3 → ไม่ล็อก · 2026-Q3 ยังเป็นค่าเดิม", RO.state.foreignFromPM === false && RO.state.pmReason === "past-quarter" && JSON.stringify(RO.q("2026-Q3")) === JSON.stringify(DOC_R.quarters["2026-Q3"]));
  // ตัวเทียบ: เอกสารเดียวกันเปิดก่อนสิ้นไตรมาส (15 ก.ย.) → 2026-Q3 ยังเป็นไตรมาสปัจจุบัน → ซิงก์ตามปกติ
  var RS = boot({ doc: DOC_R, holdings: HOLDINGS, now: CLOCK.Q3_2026 });
  await RS.ctx.refreshForeignFromPM({});
  t("ตัวเทียบ: เอกสารเดียวกันวันที่ 15 ก.ย. (ไตรมาสยังไม่จบ) → ซิงก์ + ล็อก 2026-Q3 (6,000,000)", RS.state.foreignFromPM === true && RS.q("2026-Q3").assets[0].manualValue === GROSS);

  // ================= fix round 1 · [2] ซิงก์ที่ถูกข้ามต้องทำต่อเมื่อฟอร์มปิด =================
  console.log("== fix round 1 [2]: ซิงก์ที่ค้าง (pmSyncPending) ==");
  // probe P2: กดแก้แถวหุ้นต่างประเทศขณะ GET holdings ยังไม่ตอบ → ฟอร์มยังไม่ล็อก → holdings มา (ฟอร์มยังเปิด = ข้าม) → ส่งฟอร์ม
  var P2 = boot({ doc: DOC, holdings: HOLDINGS });
  var release2; var pend2 = new Promise(function (r) { release2 = r; });
  var run2 = P2.ctx.refreshForeignFromPM({ holdings: pend2 });
  P2.ctx.editAsset("f4");
  t("กดแก้ขณะ holdings ยังไม่มา → ช่องยังไม่ถูกปิด", P2.el.valueInput.disabled === false && P2.state.foreignFromPM === false);
  release2(clone(HOLDINGS));
  var r2 = await run2;
  t("holdings มาแล้วแต่ฟอร์มเปิดอยู่ → ข้าม (pmSyncPending) · state ยังไม่เปลี่ยน", r2 === false && P2.state.pmSyncPending === true && P2.q("2026-Q4").assets[0].manualValue === 5000000 && P2.state.foreignFromPM === false);
  P2.el.valueInput.value = "9999999"; P2.el.netFlowInput.value = "120000";
  P2.submit(); await flush();
  var p2row = P2.q("2026-Q4").assets[0], p2put = P2.puts()[0];
  t("ส่งฟอร์ม → ซิงก์ที่ค้างทำก่อนบันทึก: แถวเป็นค่า PM (6,000,000 ไม่ใช่ 9,999,999) · เงินเติม/ถอนที่กรอก 120,000 + EU 50,000 · ล็อก",
    p2row.manualValue === GROSS && p2row.netFlow === 170000 && foreignRows(P2.q("2026-Q4").assets).length === 1 && P2.state.foreignFromPM === true && P2.state.pmSyncPending === false, JSON.stringify(p2row));
  t("…PUT ส่งค่า PM (ไม่มีค่าที่พิมพ์ 9,999,999) · ไม่มี fromPM", !!p2put && p2put.body.data.quarters["2026-Q4"].assets[0].manualValue === GROSS && JSON.stringify(p2put.body).indexOf("9999999") < 0 && !hasFromPM(p2put.body));
  P2.el.typeInput.value = "foreign-stock"; P2.el.nameInput.value = "JP"; P2.el.valueInput.value = "100000"; P2.el.investedPercentInput.value = "100";
  P2.submit(); await flush();
  t("…เพิ่มหุ้นต่างประเทศแถวที่สองถูกปฏิเสธ", foreignRows(P2.q("2026-Q4").assets).length === 1 && P2.el.statusText.textContent === LOCKED_TH && P2.puts().length === 1);

  // กดยกเลิกแก้ไข (resetForm) ก็ต้องทำซิงก์ที่ค้าง + วาดใหม่ (ไม่ต้องรอ focus รอบหน้า)
  var PC = boot({ doc: DOC, holdings: HOLDINGS });
  var releaseC; var pendC = new Promise(function (r) { releaseC = r; });
  var runC = PC.ctx.refreshForeignFromPM({ holdings: pendC });
  PC.ctx.editAsset("b4"); releaseC(clone(HOLDINGS)); await runC;
  var rendersBefore = PC.counters.render;
  PC.ctx.resetForm();
  t("ยกเลิกแก้ไข → ซิงก์ที่ค้างทำทันที (ล็อก · 6,000,000) + วาดใหม่ · ไม่ PUT", PC.state.foreignFromPM === true && PC.q("2026-Q4").assets[0].manualValue === GROSS &&
    PC.counters.render > rendersBefore && PC.state.pmSyncPending === false && PC.puts().length === 0 && PC.el.statusText.textContent === SYNC_TH);

  // focus ระหว่างฟอร์มเปิด → ไม่ดึง แต่จำไว้ (pending) → ปิดฟอร์มแล้วซิงก์ด้วย holdings ที่มีอยู่
  var PF = boot({ doc: DOC, holdings: HOLDINGS });
  await PF.ctx.refreshForeignFromPM({});
  PF.ctx.editAsset("b4");
  var pfCalls = PF.calls.length;
  await PF.ctx.refreshForeignFromPM({ adoptServer: true });
  t("focus ระหว่างฟอร์มเปิด → ไม่ดึง · ตั้ง pmSyncPending", PF.calls.length === pfCalls && PF.state.pmSyncPending === true);

  // persistRemoteData รับ foreignSleeve ใหม่จาก server (เงินสดเพิ่งแก้ในหน้า PM) → ซิงก์ใหม่ก่อน PUT
  var SERVER8 = clone(DOC); SERVER8.foreignSleeve = { cash: 800000, updatedAt: "2026-11-09T09:00:00.000Z" };
  var PA = boot({ doc: DOC, holdings: HOLDINGS, server: SERVER8 });
  await PA.ctx.refreshForeignFromPM({});
  PA.ctx.editAsset("b4"); PA.el.valueInput.value = "1100000";
  PA.submit(); await flush();
  var paPut = PA.puts()[0];
  t("บันทึกหลังเงินสดบน server เปลี่ยน (400,000 → 800,000) → ซิงก์ใหม่ก่อน PUT: หุ้นต่างประเทศ 6,400,000 · Bitcoin 1,100,000 ที่แก้",
    !!paPut && paPut.body.data.quarters["2026-Q4"].assets[0].manualValue === 6400000 && paPut.body.data.quarters["2026-Q4"].assets[1].manualValue === 1100000 &&
    paPut.body.data.foreignSleeve.cash === 800000 && PA.q("2026-Q4").assets[0].manualValue === 6400000 && !hasFromPM(paPut.body),
    paPut && JSON.stringify(paPut.body.data.quarters["2026-Q4"].assets.map(function (a) { return a.manualValue; })));
  // …ถ้าฟอร์มยังเปิดอยู่ตอนบันทึก (ลบแถวอื่นระหว่างแก้) → ไม่ซิงก์ใต้ฟอร์ม · จำไว้ แล้วซิงก์ตอนฟอร์มปิด
  var DOC_C = clone(DOC); DOC_C.quarters["2026-Q4"].assets.push({ id: "c4", type: "cash", name: "เงินสด", manualValue: 200000, snapshotValue: 200000, investedPercent: 0, netFlow: 0 });
  var SERVER8C = clone(DOC_C); SERVER8C.foreignSleeve = { cash: 800000, updatedAt: "2026-11-09T09:00:00.000Z" };
  var PE2 = boot({ doc: DOC_C, holdings: HOLDINGS, server: SERVER8C });
  await PE2.ctx.refreshForeignFromPM({});
  PE2.ctx.editAsset("b4");
  PE2.ctx.deleteAsset("c4"); await flush();
  var peq = PE2.puts()[0];
  t("ลบแถวอื่นระหว่างฟอร์มเปิด + server มีเงินสดใหม่ → PUT ไม่ซิงก์ใต้ฟอร์ม (6,000,000) · pmSyncPending", !!peq && peq.body.data.quarters["2026-Q4"].assets[0].manualValue === GROSS && PE2.state.pmSyncPending === true);
  PE2.ctx.resetForm();
  t("…ปิดฟอร์ม → ซิงก์ด้วยเงินสดใหม่ (6,400,000)", PE2.q("2026-Q4").assets[0].manualValue === 6400000 && PE2.state.pmSyncPending === false);

  // ================= fix round 1 · [3] บันทึกไตรมาสระหว่างฟอร์มเปิด =================
  console.log("== fix round 1 [3]: บันทึกไตรมาสขณะฟอร์มแก้ไขเปิดอยู่ ==");
  // probe P3: ฟอร์มเปิดบนแถวหุ้นต่างประเทศ (ยังไม่ล็อก — holdings มาระหว่างนั้น) · พิมพ์ค้างไว้ · กด "บันทึกไตรมาสนี้"
  var P3 = boot({ doc: DOC, holdings: HOLDINGS });
  var release3; var pend3 = new Promise(function (r) { release3 = r; });
  var run3 = P3.ctx.refreshForeignFromPM({ holdings: pend3 });
  P3.ctx.editAsset("f4"); release3(clone(HOLDINGS)); await run3;
  P3.el.valueInput.value = "9999999"; P3.el.nameInput.value = "พิมพ์ค้าง";
  P3.ctx.saveSnapshot(); await flush();
  var p3row = P3.q("2026-Q4").assets[0], p3put = P3.puts()[0];
  t("บันทึกไตรมาส → ฟอร์มถูกปิดก่อน (ค่าที่พิมพ์ค้างไม่ถูกบันทึก) · แถวแช่ค่า PM 6,000,000 ชื่อเดิม US · ล็อก",
    P3.state.editingId === null && p3row.manualValue === GROSS && p3row.snapshotValue === GROSS && p3row.name === "US" && P3.state.foreignFromPM === true, JSON.stringify(p3row));
  t("…PUT ไม่มีค่าที่พิมพ์ค้าง (9,999,999 / ชื่อที่พิมพ์) · savedAt ตั้งแล้ว", !!p3put && JSON.stringify(p3put.body).indexOf("9999999") < 0 && JSON.stringify(p3put.body).indexOf("พิมพ์ค้าง") < 0 && !!p3put.body.data.quarters["2026-Q4"].savedAt);
  t("…ฟอร์มกลับเป็นปกติ (ช่องเปิด · ซ่อนคำอธิบาย)", P3.el.valueInput.disabled === false && P3.el.typeInput.disabled === false && P3.el.pmLockNote.classList.contains("is-hidden"));
  t("…ข้อความสถานะตรงความจริง: '" + SAVED_TH + "' (ไม่ใช่ 'จะบันทึกพร้อมการแก้ครั้งถัดไป')", P3.el.statusText.textContent === SAVED_TH, P3.el.statusText.textContent);
  // ทางกลับ: ฟอร์มเปิดบนแถวที่ล็อก แล้วโหมดหลุดเป็น editor ตอนบันทึกไตรมาส (holdings ว่าง) → ฟอร์มต้องไม่ค้างแบบล็อก
  var P3B = boot({ doc: DOC, holdings: HOLDINGS });
  await P3B.ctx.refreshForeignFromPM({});
  P3B.ctx.editAsset("f4");
  P3B.state.pmHoldings = [];
  P3B.ctx.saveSnapshot(); await flush();
  t("ฟอร์มเปิดบนแถวที่ล็อก + บันทึกไตรมาสตอนโหมดหลุดเป็น editor → ฟอร์มปิด ช่องเปิดคืน · แช่ค่าที่มีอยู่ (6,000,000)",
    P3B.state.editingId === null && P3B.el.valueInput.disabled === false && P3B.state.foreignFromPM === false && P3B.q("2026-Q4").assets[0].snapshotValue === GROSS && P3B.puts().length === 1);

  // ================= L: รัน app.js ทั้งไฟล์ (บรรทัดเริ่มหน้า + listener) =================
  console.log("== เปิดหน้าจริง (app.js ทั้งไฟล์ใน DOM ปลอม) ==");
  var FB = bootFull({ doc: DOC, holdings: HOLDINGS });
  await flush(); await flush();
  t("เปิดหน้า: GET holdings + GET เอกสาร · ไม่มี PUT (ไม่บันทึกเองตอนเปิดหน้า)",
    FB.calls.some(function (c) { return c.url === "/api/portfolio-holdings" && c.method === "GET"; }) && FB.calls.some(function (c) { return c.url === "/api/portfolio" && c.method === "GET"; }) &&
    FB.calls.every(function (c) { return c.method === "GET"; }), FB.calls.map(function (c) { return c.method + " " + c.url; }).join(","));
  t("…ข้อความสถานะหลังซิงก์", FB.el("#statusText").textContent === SYNC_TH, FB.el("#statusText").textContent);
  var fbRows = FB.el("#assetRows").children;
  t("…ตารางแสดงแถวที่ซิงก์ (ป้าย + ปุ่มลบปิด) และ Wealth รวมตามค่า PM (7,000,000)",
    fbRows.length === 2 && fbRows[0].innerHTML.indexOf(BADGE_TH) >= 0 && /data-delete-id="f4"[^>]*\sdisabled/.test(fbRows[0].innerHTML) && /7,000,000/.test(FB.el("#totalWealth").textContent),
    FB.el("#totalWealth").textContent);
  var nCalls = FB.calls.length;
  FB.fire("focus"); FB.fireDoc("visibilitychange");
  await flush(); await flush();
  var fresh = FB.calls.slice(nCalls);
  t("กลับมาที่แท็บ (focus + visibilitychange พร้อมกัน) → ดึงรอบเดียว (holdings 1 + เอกสาร 1) · ไม่มี PUT",
    fresh.filter(function (c) { return c.url === "/api/portfolio-holdings"; }).length === 1 && fresh.filter(function (c) { return c.url === "/api/portfolio"; }).length === 1 &&
    fresh.every(function (c) { return c.method === "GET"; }), fresh.map(function (c) { return c.method + " " + c.url; }).join(","));
  var FE = bootFull({ doc: noCash(DOC), holdings: HOLDINGS });
  await flush(); await flush();
  t("เปิดหน้าโหมด editor: ไม่มีป้าย · ไม่มี PUT · Wealth ตาม Editor (6,300,000)",
    FE.el("#assetRows").children.length === 3 && FE.el("#assetRows").children.every(function (r) { return r.innerHTML.indexOf(BADGE_TH) < 0; }) &&
    FE.calls.every(function (c) { return c.method === "GET"; }) && /6,300,000/.test(FE.el("#totalWealth").textContent), FE.el("#totalWealth").textContent);
  // fix round 1 [1]: เปิดหน้าจริง 15 ต.ค. ขณะไตรมาสล่าสุด = 2026-Q3 → ไม่ซิงก์ · บอกเหตุผล (แถบไตรมาสคงอยู่หลังวาดใหม่) · เพิ่ม 2026-Q4 ด้วยปุ่มจริง
  var FQ = bootFull({ doc: DOC_R, holdings: HOLDINGS, now: OCT });
  await flush(); await flush();
  t("เปิดหน้า 15 ต.ค. (2026-Q3 จบแล้ว): ไม่มีป้าย · ไม่มี PUT · ข้อความสถานะ + แถบไตรมาสบอกให้สร้างไตรมาสใหม่ · Wealth ตาม Editor (5,500,000)",
    FQ.el("#assetRows").children.length === 2 && FQ.el("#assetRows").children.every(function (r) { return r.innerHTML.indexOf(BADGE_TH) < 0; }) &&
    FQ.calls.every(function (c) { return c.method === "GET"; }) && FQ.el("#statusText").textContent === ENDED_TH &&
    FQ.el("#quarterStatus").textContent.indexOf(ENDED_TH) >= 0 && /5,500,000/.test(FQ.el("#totalWealth").textContent),
    [FQ.el("#statusText").textContent, FQ.el("#quarterStatus").textContent, FQ.el("#totalWealth").textContent]);
  FQ.el("#newQuarterYearInput").value = "2026"; FQ.el("#newQuarterNumberInput").value = "4";
  (FQ.el("#newQuarterButton").listeners.click || []).forEach(function (fn) { fn({}); });
  await flush(); await flush();
  var fqPut = FQ.calls.filter(function (c) { return c.method === "PUT"; })[0];
  t("กดปุ่มเพิ่มไตรมาส 2026-Q4 → PUT: 2026-Q3 คงค่าที่แช่ (4,600,000) · 2026-Q4 แถว US 6,000,000 · แถบไตรมาสไม่มีข้อความไตรมาสจบแล้ว",
    !!fqPut && JSON.stringify(fqPut.body.data.quarters["2026-Q3"]) === JSON.stringify(DOC_R.quarters["2026-Q3"]) &&
    fqPut.body.data.quarters["2026-Q4"].assets.length === 1 && fqPut.body.data.quarters["2026-Q4"].assets[0].manualValue === GROSS && fqPut.body.data.quarters["2026-Q4"].assets[0].name === "US" &&
    FQ.el("#quarterStatus").textContent.indexOf(ENDED_TH) < 0 && FQ.el("#assetRows").children[0].innerHTML.indexOf(BADGE_TH) >= 0,
    fqPut && JSON.stringify(fqPut.body.data.quarters["2026-Q4"]));

  // ================= final fix wave [1]: โหลดครั้งแรกไม่สำเร็จต้องไม่ดูเหมือนโหลดแล้ว =================
  console.log("== final fix wave [1]: โหลดเอกสารครั้งแรกไม่สำเร็จ (state.loaded) ==");
  function gets(list, url) { return list.filter(function (c) { return c.url === url && c.method === "GET"; }).length; }
  // ระดับฟังก์ชัน: loaded false → persist ไม่ยิงอะไรเลย · ซิงก์ไม่ทำ · ดึงรอบใหม่ไม่รับคีย์จาก server
  var NL = boot({ doc: DOC, holdings: HOLDINGS, loaded: false, server: SERVER8 });
  await NL.ctx.persistRemoteData();
  t("loaded false → persistRemoteData ไม่ GET ไม่ PUT · ข้อความ '" + NOT_LOADED_TH + "'", NL.calls.length === 0 && NL.el.statusText.textContent === NOT_LOADED_TH, NL.el.statusText.textContent);
  NL.state.pmHoldings = clone(HOLDINGS);
  t("loaded false → syncForeignFromPM ไม่ทำ (false · ไม่ล็อก · state ไม่เปลี่ยน)",
    NL.ctx.syncForeignFromPM() === false && NL.state.foreignFromPM === false && JSON.stringify(NL.state.data) === JSON.stringify(DOC));
  NL.el.statusText.textContent = "x";
  await NL.ctx.refreshForeignFromPM({ adoptServer: true });
  t("loaded false → refreshForeignFromPM({ adoptServer }) ดึงแค่ holdings · ไม่รับ foreignSleeve ของ server (ยัง 400,000) · ไม่ซิงก์ · สถานะไม่ถูกทับ",
    gets(NL.calls, "/api/portfolio") === 0 && NL.state.data.foreignSleeve.cash === 400000 && NL.state.foreignFromPM === false &&
    NL.q("2026-Q4").assets[0].manualValue === 5000000 && NL.el.statusText.textContent === "x" && NL.puts().length === 0);
  var NLR = boot({ doc: DOC, holdings: HOLDINGS, loaded: false, getFail: function () { return true; } });
  NLR.ctx.onEditorTabReturn(); NLR.ctx.onEditorTabReturn(); await flush(); await flush();
  t("loaded false + กลับมาที่แท็บ 2 ครั้งติด → โหลดเอกสารใหม่ (GET เอกสาร 1 ครั้ง) แทนดึง holdings/รับคีย์ · ล้มอีก = ข้อความผิดพลาด · ไม่ PUT",
    gets(NLR.calls, "/api/portfolio") === 1 && gets(NLR.calls, "/api/portfolio-holdings") === 0 && NLR.puts().length === 0 &&
    NLR.state.loaded === false && LOAD_FAIL_RE.test(NLR.el.statusText.textContent), NLR.calls.map(function (c) { return c.method + " " + c.url; }).join(","));
  NLR.ctx.refreshQuotes(); await flush(); await flush();
  t("loaded false + ปุ่มรีเฟรช → โหลดเอกสารใหม่อีกครั้ง (ไม่ใช่ 'รีเฟรชหน้าจอแล้ว')", gets(NLR.calls, "/api/portfolio") === 2 && LOAD_FAIL_RE.test(NLR.el.statusText.textContent), NLR.el.statusText.textContent);

  // probe ของผู้รีวิว (app.js ทั้งไฟล์): GET แรกล้ม → focus → (เดิม) รับ foreignSleeve + ซิงก์สร้างแถว PM + ทับข้อความผิดพลาด
  //   → บันทึกครั้งถัดไป PUT เอกสารไตรมาสเดียว = ประวัติทุกไตรมาสหาย
  var getDown = true;
  var FL = bootFull({ doc: DOC, holdings: HOLDINGS, getFail: function () { return getDown; } });
  await flush(); await flush();
  var flStatus0 = FL.el("#statusText").textContent;
  t("เปิดหน้า: GET เอกสารล้ม → ข้อความผิดพลาด · ไม่มี PUT · ไม่มีแถว (ไม่ซิงก์แถว PM เข้าไตรมาสว่าง)",
    LOAD_FAIL_RE.test(flStatus0) && FL.puts().length === 0 && FL.el("#assetRows").children.length === 0, flStatus0);
  var fl0 = FL.calls.length;
  FL.fire("focus"); FL.fireDoc("visibilitychange");
  await flush(); await flush();
  var flA = FL.calls.slice(fl0);
  t("focus + visibilitychange ขณะ server ยังล้ม → โหลดเอกสารใหม่ 1 ครั้ง (ไม่ดึง holdings/ไม่รับคีย์) · ไม่มี PUT · ข้อความผิดพลาดคงอยู่ · ไม่มีแถว PM",
    gets(flA, "/api/portfolio") === 1 && flA.length === 1 && FL.puts().length === 0 && LOAD_FAIL_RE.test(FL.el("#statusText").textContent) &&
    FL.el("#assetRows").children.length === 0, [flA.map(function (c) { return c.method + " " + c.url; }).join(","), FL.el("#statusText").textContent]);
  FL.el("#newQuarterYearInput").value = "2027"; FL.el("#newQuarterNumberInput").value = "1";
  FL.click("#newQuarterButton"); await flush(); await flush();
  t("ระหว่างยังโหลดไม่สำเร็จ: กดเพิ่มไตรมาส → ไม่ PUT · ข้อความ '" + NOT_LOADED_TH + "' · ไม่มีแถว PM",
    FL.puts().length === 0 && FL.el("#statusText").textContent === NOT_LOADED_TH && FL.el("#assetRows").children.every(function (r) { return r.innerHTML.indexOf(BADGE_TH) < 0; }),
    FL.el("#statusText").textContent);
  // server ฟื้น → กลับมาที่แท็บ = โหลดเอกสารจริงทั้งก้อน → ซิงก์ตามปกติ (ไตรมาสที่กดเพิ่มบนเอกสารว่างถูกทิ้ง)
  getDown = false;
  var fl1 = FL.calls.length;
  FL.fire("focus"); await flush(); await flush(); await flush();
  var flB = FL.calls.slice(fl1);
  var flRows = FL.el("#assetRows").children;
  t("server ฟื้น + focus → โหลดเอกสารจริง + ดึง holdings → ซิงก์: แถว PM (ป้าย) · Wealth 7,000,000 · ข้อความซิงก์ · ไม่มี PUT",
    gets(flB, "/api/portfolio") === 1 && gets(flB, "/api/portfolio-holdings") === 1 && FL.puts().length === 0 && flRows.length === 2 &&
    flRows[0].innerHTML.indexOf(BADGE_TH) >= 0 && /7,000,000/.test(FL.el("#totalWealth").textContent) && FL.el("#statusText").textContent === SYNC_TH,
    [flB.map(function (c) { return c.method + " " + c.url; }).join(","), FL.el("#totalWealth").textContent, FL.el("#statusText").textContent]);
  FL.click("#saveSnapshotButton"); await flush(); await flush(); await flush();
  var flPut = FL.puts()[0];
  t("…บันทึกไตรมาสหลังโหลดสำเร็จ → PUT มีทุกไตรมาสของ server (2026-Q3 เดิมทุก byte · 2026-Q4 หุ้นต่างประเทศ 6,000,000) · ไม่มี 2027-Q1 จากเอกสารว่าง · ไม่มี fromPM",
    !!flPut && Object.keys(flPut.body.data.quarters).sort().join() === "2026-Q3,2026-Q4" &&
    JSON.stringify(flPut.body.data.quarters["2026-Q3"]) === JSON.stringify(DOC.quarters["2026-Q3"]) &&
    flPut.body.data.quarters["2026-Q4"].assets[0].snapshotValue === GROSS && !hasFromPM(flPut.body),
    flPut && Object.keys(flPut.body.data.quarters).join());
  // ตัวเทียบ: เอกสารบน server ว่าง ({ data: null }) = โหลดสำเร็จ (ผู้ใช้ใหม่) → บันทึกได้ตามเดิม
  var FN = bootFull({ doc: null, holdings: [] });
  await flush(); await flush();
  FN.click("#saveSnapshotButton"); await flush(); await flush();
  t("ตัวเทียบ: server ตอบเอกสารว่าง = โหลดสำเร็จ → บันทึกไตรมาสได้ (PUT 1 ครั้ง)", FN.puts().length === 1 && FN.el("#statusText").textContent === SAVED_TH, FN.el("#statusText").textContent);

  // ================= final fix wave [3]: ชื่อแถวหุ้นต่างประเทศใหม่ตรงกันทุกทาง =================
  console.log("== final fix wave [3]: ชื่อแถวใหม่ — Editor = ผู้อ่านทุกหน้า (ForeignSleeve.newRowNameOf) ==");
  var DOC_N = clone(DOC);
  DOC_N.quarters["2026-Q3"].assets[0].name = "บัญชี Dime";
  DOC_N.quarters["2026-Q4"].assets = DOC_N.quarters["2026-Q4"].assets.filter(function (a) { return a.type !== "foreign-stock"; });
  var NM = boot({ doc: DOC_N, holdings: HOLDINGS });
  await NM.ctx.refreshForeignFromPM({});
  var nmEditor = foreignRows(NM.q("2026-Q4").assets)[0];
  var nmReader = foreignRows(CLOCK.withClock(FS, CLOCK.Q4_2026).applyToDoc({ data: clone(DOC_N) }, HOLDINGS).data.quarters["2026-Q4"].assets)[0];
  t("ไตรมาสปัจจุบันไม่มีแถวหุ้นต่างประเทศ → Editor และผู้อ่าน (applyToDoc) ตั้งชื่อเดียวกัน 'บัญชี Dime' (ชื่อแถวแรกของไตรมาสก่อน) · มูลค่า/% เท่ากัน",
    !!nmEditor && !!nmReader && nmEditor.name === "บัญชี Dime" && nmReader.name === nmEditor.name && nmEditor.name === FS.newRowNameOf(DOC_N) &&
    nmEditor.manualValue === nmReader.manualValue && near(nmEditor.investedPercent, nmReader.investedPercent),
    [nmEditor && nmEditor.name, nmReader && nmReader.name]);
  t("…แถวของ Editor มี id + createdAt (ปุ่มแก้ไขอ้างได้) · ไม่มี fromPM", !!nmEditor && !!nmEditor.id && !!nmEditor.createdAt && !hasFromPM(NM.state.data));
  var DOC_N2 = clone(DOC_N); DOC_N2.quarters["2026-Q3"].assets = DOC_N2.quarters["2026-Q3"].assets.filter(function (a) { return a.type !== "foreign-stock"; });
  var NM2 = boot({ doc: DOC_N2, holdings: HOLDINGS });
  await NM2.ctx.refreshForeignFromPM({});
  var nm2Reader = foreignRows(CLOCK.withClock(FS, CLOCK.Q4_2026).applyToDoc(clone(DOC_N2), HOLDINGS).quarters["2026-Q4"].assets)[0];
  t("ไตรมาสก่อนก็ไม่มีแถวหุ้นต่างประเทศ → ทั้งสองทางใช้ 'หุ้นต่างประเทศ'",
    foreignRows(NM2.q("2026-Q4").assets)[0].name === "หุ้นต่างประเทศ" && nm2Reader.name === "หุ้นต่างประเทศ");

  // ================= final fix wave [4]: บันทึกไตรมาสรอรอบดึงรายการหุ้นที่ค้าง =================
  console.log("== final fix wave [4]: saveSnapshot รอรอบดึงที่ค้าง (กลับมาที่แท็บ) ==");
  var SS = boot({ doc: DOC, holdings: HOLDINGS });
  await SS.ctx.refreshForeignFromPM({});   // ซิงก์ครั้งก่อน = 6,000,000
  var releaseS; var pendS = new Promise(function (r) { releaseS = r; });
  var runS = SS.ctx.refreshForeignFromPM({ holdings: pendS, adoptServer: true });   // กลับมาที่แท็บ: รายการหุ้นยังไม่มา
  var saveS = SS.ctx.saveSnapshot();
  await flush();
  t("กดบันทึกไตรมาสระหว่างรอบดึงค้าง → ยังไม่แช่ ยังไม่ PUT (รอรอบนั้น)", SS.puts().length === 0 && !SS.q("2026-Q4").savedAt && SS.state.pmRefreshRun !== null);
  var H35 = clone(HOLDINGS); H35[0].marketValue = 3500000;   // หุ้นในหน้า PM ขยับระหว่างอยู่หน้าอื่น
  releaseS(H35);
  await runS; await saveS; await flush();
  var ssPut = SS.puts()[0], ssRow = SS.q("2026-Q4").assets[0];
  t("…รอบดึงจบ → แช่ค่าจากรายการหุ้นชุดใหม่ (6,500,000 ไม่ใช่ 6,000,000 ชุดเก่า) · PUT ครั้งเดียว · ไม่มี fromPM",
    ssRow.manualValue === 6500000 && ssRow.snapshotValue === 6500000 && !!SS.q("2026-Q4").savedAt && SS.puts().length === 1 &&
    !!ssPut && ssPut.body.data.quarters["2026-Q4"].assets[0].snapshotValue === 6500000 && !hasFromPM(ssPut.body) && SS.state.pmRefreshRun === null,
    JSON.stringify(ssRow));
  // ไม่มีรอบค้าง → แช่ทันที (พฤติกรรมเดิม — ไม่มี await)
  var SN0 = boot({ doc: DOC, holdings: HOLDINGS });
  await SN0.ctx.refreshForeignFromPM({});
  SN0.ctx.saveSnapshot();
  t("ไม่มีรอบดึงค้าง → แช่ทันทีในจังหวะเดียวกับที่กด (savedAt ตั้งแล้วก่อน await ใด ๆ)", !!SN0.q("2026-Q4").savedAt && SN0.q("2026-Q4").assets[0].snapshotValue === GROSS);

  finish();
})().catch(function (e) {
  console.log("  ✗ เทสต์ล้ม: " + (e && e.stack || e));
  process.exit(1);
});
