// Quarterly Editor (/ → public/index.html) — การ์ดแก้ว (glass-cards.css gc-2) · glass batch 2 Task 1
//   node scripts/quarterly-editor-glass-test.js
// ตรวจ: โหลด glass-cards.css ก่อน styles.css · การ์ดทุกใบเป็น gc-card (neutral ตอนเริ่ม)
//   · การ์ด "เติบโตจากไตรมาสก่อน" ได้สีจากสถานะที่ renderSummary คิดอยู่แล้ว (ไม่มีไตรมาสก่อน → neutral · ≥ 0 → calm · < 0 → danger)
//   · สถานะอื่นทาสีที่ข้อความ/ชิป ไม่ใช่ทั้งการ์ด (statusToneOf · ป้าย PM = gc-chip)
//   · Privacy Lock กับช่องเงินของฟอร์มแก้ไข (privacy.js ซ่อนเฉพาะข้อความ ไม่แตะ <input>)
// ดึงฟังก์ชันจริงจาก public/app.js มารันใน vm (กติกาเดียวกับ editor-follows-pm-test.js) — ไม่ copy โค้ดมาเขียนใหม่
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var ROOT = path.join(__dirname, "..");
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), "utf8"); }
var HTML = read("public/index.html"), CSS = read("public/styles.css"), SRC = read("public/app.js");

var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + (extra != null ? "  → " + (typeof extra === "string" ? extra : JSON.stringify(extra)) : "")); }
}
function finish() {
  console.log("\n" + (pass + fail) + " checks · " + pass + " passed · " + fail + " failed");
  process.exit(fail ? 1 : 0);
}

// ---------------- ดึงโค้ดจาก app.js (ฟังก์ชันระดับบนสุดจบด้วย "}" ที่ต้นบรรทัด · const บรรทัดเดียว/หลายบรรทัด) ----------------
function extract(name) {
  var m = new RegExp("(^|\\n)((?:async )?function " + name + "\\()").exec(SRC);
  if (!m) throw new Error("ไม่เจอฟังก์ชัน " + name + " ใน app.js");
  var start = m.index + m[1].length;
  var endRe = /\r?\n\}\r?\n/g;
  endRe.lastIndex = start;
  var e = endRe.exec(SRC);
  if (!e) throw new Error("หาจุดจบของ " + name + " ไม่เจอ");
  return SRC.slice(start, e.index) + "\n}\n";
}
function extractConst(name) {
  var m = new RegExp("(^|\\n)(const " + name + " = )").exec(SRC);
  if (!m) throw new Error("ไม่เจอ const " + name + " ใน app.js");
  var rest = SRC.slice(m.index + m[1].length);
  var nl = rest.search(/\r?\n/);
  var firstLine = nl < 0 ? rest : rest.slice(0, nl);
  if (/;\s*$/.test(firstLine)) return firstLine + "\n";
  var e = /\r?\n\};\r?\n/.exec(rest);
  if (!e) throw new Error("หาจุดจบของ const " + name + " ไม่เจอ");
  return rest.slice(0, e.index) + "\n};\n";
}
function code(consts, funcs) { return consts.map(extractConst).join("\n") + "\n" + funcs.map(extract).join("\n"); }
function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
function classList(initial) {
  var set = {};
  (initial || []).forEach(function (c) { set[c] = true; });
  return {
    add: function (c) { set[c] = true; },
    remove: function (c) { delete set[c]; },
    contains: function (c) { return !!set[c]; },
    toggle: function (c, force) { var on = force === undefined ? !set[c] : !!force; if (on) set[c] = true; else delete set[c]; return on; },
    list: function () { return Object.keys(set).sort(); }
  };
}
var TONES = ["gc-calm", "gc-normal", "gc-warning", "gc-danger", "gc-neutral"];

// ================= static: index.html =================
console.log("== index.html: stylesheet order · fonts · versions ==");
var iTheme = HTML.indexOf("/theme.css?v="), iGc = HTML.indexOf('/glass-cards.css?v=20261121-gc-2"'), iPage = HTML.indexOf('/styles.css?v=20261126-qe-7"');
t("glass-cards.css?v=20261121-gc-2 loaded exactly once · after theme.css · before styles.css?v=20261126-qe-7",
  HTML.split("/glass-cards.css").length === 2 && iTheme > 0 && iTheme < iGc && iGc < iPage, [iTheme, iGc, iPage]);
t("loads Inter 700 + Noto Sans Thai (numbers are Inter 700 tabular)", /fonts\.googleapis\.com\/css2\?family=Inter:wght@[^"&]*700[^"]*family=Noto\+Sans\+Thai/.test(HTML));
t("app.js bumped to 20261125-app-16", /\/app\.js\?v=20261125-app-16"/.test(HTML));
t("no dot-matrix / LED numeral font in the page files", !/doto|dot-?matrix|DSEG|\bLED\b/i.test(HTML + CSS));

// opening tags with their classes / ids
var TAGS = (function () {
  var out = [], re = /<([a-z][a-z0-9]*)\b([^>]*)>/gi, m, html = HTML.replace(/<!--[\s\S]*?-->/g, "");
  while ((m = re.exec(html)) !== null) {
    var c = /\sclass="([^"]*)"/.exec(m[2]), id = /\sid="([^"]*)"/.exec(m[2]);
    out.push({ tag: m[1].toLowerCase(), attrs: m[2], cls: c ? c[1].split(/\s+/).filter(Boolean) : [], id: id ? id[1] : "" });
  }
  return out;
})();
function has(x, c) { return x.cls.indexOf(c) >= 0; }
function byId(id) { return TAGS.filter(function (x) { return x.id === id; })[0] || { cls: [], attrs: "" }; }
function tonesOf(x) { return x.cls.filter(function (c) { return TONES.indexOf(c) >= 0; }); }

console.log("== cards (card → status → tone) ==");
var CARD_HOSTS = TAGS.filter(function (x) { return has(x, "controls-bar") || has(x, "summary-card") || has(x, "portfolio-panel") || has(x, "asset-form"); });
t("11 cards: แถบไตรมาส · 4 ช่องสรุป · 5 แผง (สัดส่วน · ภาพรวมการเติบโต · กราฟ · การเติบโตรายสินทรัพย์ · Assets) · ฟอร์ม",
  CARD_HOSTS.length === 11, CARD_HOSTS.length);
t("…every one is gc-card with exactly one tone, and that tone starts as gc-neutral (no status in the static HTML)",
  CARD_HOSTS.every(function (x) { return has(x, "gc-card") && tonesOf(x).length === 1 && tonesOf(x)[0] === "gc-neutral"; }),
  CARD_HOSTS.filter(function (x) { return !(has(x, "gc-card") && tonesOf(x).join() === "gc-neutral"); }).map(function (x) { return x.cls.join("."); }));
t("…no other element wears gc-card", TAGS.filter(function (x) { return has(x, "gc-card"); }).length === 11);
t("…the 4 summary tiles are gc-tile (compact)", TAGS.filter(function (x) { return has(x, "summary-card"); }).every(function (x) { return has(x, "gc-tile"); }));
t("summary numbers wear gc-num (Inter 700 tabular) · Wealth รวม = gc-num-m · others gc-num-s",
  has(byId("totalWealth"), "gc-num") && has(byId("totalWealth"), "gc-num-m") &&
  ["investedValue", "cashValue", "quarterGrowth"].every(function (id) { return has(byId(id), "gc-num") && has(byId(id), "gc-num-s"); }));

console.log("== tables · fields · buttons (shared gc pieces) ==");
var tables = TAGS.filter(function (x) { return x.tag === "table"; }), wraps = TAGS.filter(function (x) { return has(x, "table-wrap"); });
t("3 tables are gc-table", tables.length === 3 && tables.every(function (x) { return has(x, "gc-table"); }));
t("…their scroll boxes are gc-table-wrap + tabindex=0 + aria-label (keyboard can scroll them)",
  wraps.length === 3 && wraps.every(function (x) { return has(x, "gc-table-wrap") && /\stabindex="0"/.test(x.attrs) && /\saria-label="[^"]+"/.test(x.attrs); }));
var FIELDS = ["quarterInput", "newQuarterYearInput", "newQuarterNumberInput", "typeInput", "nameInput", "valueInput", "investedPercentInput", "netFlowInput"];
t("controls-bar + form fields are gc-field (" + FIELDS.length + ")", FIELDS.every(function (id) { return has(byId(id), "gc-field"); }), FIELDS.filter(function (id) { return !has(byId(id), "gc-field"); }));
t("primary actions = gc-btn (บันทึกไตรมาสนี้ · เพิ่มเข้าพอร์ต)", has(byId("saveSnapshotButton"), "gc-btn") && !has(byId("saveSnapshotButton"), "gc-btn-ghost") && has(byId("submitButton"), "gc-btn") && !has(byId("submitButton"), "gc-btn-ghost"));
t("other buttons = gc-btn gc-btn-ghost (รีเฟรช · เพิ่มไตรมาส · คัดลอก · ยกเลิกแก้ไข · 3 โหมดกราฟ)",
  ["refreshButton", "newQuarterButton", "copyPrevQuarterButton", "cancelEditButton"].every(function (id) { return has(byId(id), "gc-btn") && has(byId(id), "gc-btn-ghost"); }) &&
  TAGS.filter(function (x) { return has(x, "growth-mode-btn"); }).length === 3 && TAGS.filter(function (x) { return has(x, "growth-mode-btn"); }).every(function (x) { return has(x, "gc-btn") && has(x, "gc-btn-ghost"); }));
t("THB pills = gc-pill gc-pill-ghost", TAGS.filter(function (x) { return has(x, "currency-pill"); }).length === 2 && TAGS.filter(function (x) { return has(x, "currency-pill"); }).every(function (x) { return has(x, "gc-pill") && has(x, "gc-pill-ghost"); }));

console.log("== nothing removed: ids · classes · hooks ==");
var IDS = ["refreshButton", "saveSnapshotButton", "quarterInput", "newQuarterYearInput", "newQuarterNumberInput", "newQuarterButton", "copyPrevQuarterButton", "quarterStatus",
  "authPanel", "authTitle", "authStatus", "authForm", "authPasswordInput", "signInButton", "signOutButton", "totalWealth", "lastUpdated", "investedValue", "investedPercent",
  "cashValue", "cashPercent", "quarterGrowth", "quarterGrowthNote", "overviewView", "pieSubtitle", "allocationChart", "chartLegend", "quarterRows", "growthChartMode", "growthChart",
  "growthChartLegend", "assetGrowthSubtitle", "assetGrowthRows", "manageView", "assetForm", "formTitle", "typeInput", "nameInput", "valueInput", "investedPercentInput", "pmLockNote",
  "netFlowInput", "submitButton", "cancelEditButton", "statusText", "panelSubtitle", "currencyNote", "allocationInvested", "allocationCash", "assetRows", "emptyState"];
t("all " + IDS.length + " ids still there", IDS.every(function (id) { return byId(id).id === id; }), IDS.filter(function (id) { return byId(id).id !== id; }));
var CLASSES = ["topbar", "top-actions", "ghost-button", "controls-bar", "secondary-button", "summary-grid", "summary-card", "wealth-card", "tabs", "tab-button", "view-panel",
  "overview-grid", "portfolio-panel", "chart-panel", "panel-header", "currency-pill", "pie-layout", "legend-list", "table-wrap", "compact", "growth-mode", "growth-mode-btn",
  "growth-chart", "growth-legend", "workspace", "asset-form", "form-header", "manual-value-field", "invested-percent-field", "form-note", "pm-lock-note", "net-flow-field",
  "form-actions", "primary-button", "allocation-strip", "allocation-invested", "allocation-cash", "empty-state", "empty-icon", "requires-auth", "is-hidden", "is-active"];
t("all " + CLASSES.length + " page classes still there", CLASSES.every(function (c) { return TAGS.some(function (x) { return has(x, c); }); }), CLASSES.filter(function (c) { return !TAGS.some(function (x) { return has(x, c); }); }));
t("data-view / data-gmode hooks kept (2 + 3)", (HTML.match(/data-view="/g) || []).length === 2 && (HTML.match(/data-gmode="/g) || []).length === 3);
t("no ฿ in any title / aria-label of the page", !/(?:title|aria-label)="[^"]*฿/.test(HTML));

console.log("== styles.css ==");
t("inside a card the page tokens become glass ink (--ink / --navy / --muted / --line)",
  /\.gc-card\s*\{[^}]*--ink:\s*var\(--gc-ink\)[^}]*--navy:\s*var\(--gc-ink\)[^}]*--muted:\s*var\(--gc-ink-2\)[^}]*--line:\s*var\(--gc-line\)/.test(CSS));
t("old card surfaces removed (no wealth-card gradient · summary/panel/form/controls no own background)",
  !/linear-gradient\(135deg, #17324d/.test(CSS) &&
  !/\.(summary-card|asset-form|portfolio-panel|controls-bar)\s*(,[^{]*)?\{[^}]*background\s*:/.test(CSS));
// 2026-11-26 (ผู้ใช้เห็นในภาพ): .row-actions อยู่บน <td> — display:flex ทำให้เซลล์ไม่ใช่ table-cell ไม่ยืดตามแถว
//   เส้นแบ่งแถวของเซลล์ปุ่มเหลื่อม (แถว 3 บรรทัด เช่น Bitcoin + จำนวน BTC: เซลล์จบที่ 62px ขณะแถวสูง 88px · วัดใน Chrome)
t("ปุ่มท้ายแถว (.row-actions บน <td>) ไม่ใช้ display:flex — เซลล์ต้องยืดเต็มแถว · เว้นระยะปุ่มด้วย margin แทน gap",
  !/\.row-actions\s*\{[^}]*display\s*:/.test(CSS) && /\.row-actions\s*>\s*\*\s*\+\s*\*\s*\{[^}]*margin-left\s*:\s*8px/.test(CSS) && /\.row-actions\s*\{[^}]*white-space\s*:\s*nowrap/.test(CSS));
t("styles.css bumped to 20261126-qe-7", /\/styles\.css\?v=20261126-qe-7"/.test(HTML));
t("status text colours exist (qe-st-ok / -bad / -warn)", /\.qe-st-ok\b[^{]*\{[^}]*color/.test(CSS) && /\.qe-st-bad\b[^{]*\{[^}]*color/.test(CSS) && /\.qe-st-warn\b[^{]*\{[^}]*color/.test(CSS));
// fix round 1 [1]: gc-num is nowrap inside an overflow-hidden card → summary amounts were clipped at 981–1100px
t("summary numbers never clipped: wrap as last resort (white-space normal + overflow-wrap anywhere) and shrink with the tile (clamp + cqi)",
  /\.summary-card strong\.gc-num\s*\{[^}]*white-space:\s*normal[^}]*overflow-wrap:\s*anywhere/.test(CSS) &&
  /\.summary-card strong\.gc-num-s\s*\{[^}]*font-size:\s*clamp\(\s*\d+px,\s*[\d.]+cqi,\s*24px\s*\)/.test(CSS) &&
  /\.summary-card strong\.gc-num-m\s*\{[^}]*font-size:\s*clamp\(\s*\d+px,\s*[\d.]+cqi,\s*36px\s*\)/.test(CSS));
// fix round 1 (found in the re-check): 981–1200px with the sidebar open — controls bar needs ~850px (nowrap gc-btn, clipped by
//   the card) and the 2-column overview grid has a 798px minimum (page scrollWidth 1082 at 981/1024) → simpler grids up to 1200px
t("≤ 1200px: controls bar 3 columns + overview grid one column (before the 980px rules, so those still win below 981px)", (function () {
  var i1200 = CSS.indexOf("@media (max-width: 1200px)"), i980 = CSS.indexOf("@media (max-width: 980px)");
  var block = i1200 < 0 ? "" : CSS.slice(i1200, i980);
  return i1200 > 0 && i1200 < i980 && /\.controls-bar\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/.test(block) &&
    /\.overview-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/.test(block);
})());
// fix round 1 [2]: the navy "รวม" swatch of the contribution legend needs the total dot's white ring on the glass
t("contribution legend total swatch has a white ring (like the total dot)", /\.growth-legend-item\.is-total i\s*\{[^}]*box-shadow:\s*0 0 0 1\.5px #fff/.test(CSS));
t("old button / field rules do not fight the gc pieces (scoped :not(.gc-btn) / :not(.gc-field))",
  /\.ghost-button:not\(\.gc-btn\)/.test(CSS) && /\.primary-button:not\(\.gc-btn\)/.test(CSS) && /\.secondary-button:not\(\.gc-btn\)/.test(CSS) && /input:not\(\.gc-field\):focus/.test(CSS));

// ================= tone of the growth tile (renderSummary) =================
console.log("== การ์ด เติบโตจากไตรมาสก่อน: สถานะเดิมของ renderSummary → tone ==");
var SUM_CODE;
try {
  SUM_CODE = code(["PM_QUARTER_ENDED_TH"], ["currentQuarterKey", "currentQuarter", "compareQuarter", "clamp", "formatMoney", "formatPercent", "assetGrossValue",
    "getTotals", "growthPercent", "getPreviousSavedQuarter", "growthToneOf", "renderSummary"]);
} catch (e) { t("extract renderSummary + helpers from app.js", false, e.message); finish(); }
function summary(doc) {
  var card = { classList: classList(["summary-card", "gc-card", "gc-tile", "gc-neutral"]) };
  function box() { return { textContent: "", style: {}, title: "", disabled: false }; }
  var els = { totalWealth: box(), investedValue: box(), investedPercent: box(), cashValue: box(), cashPercent: box(), quarterGrowthNote: box(), currencyNote: box(),
    allocationInvested: box(), allocationCash: box(), quarterStatus: box(), lastUpdated: box(), copyPrevQuarterButton: box(),
    quarterGrowth: { textContent: "", className: "positive gc-num gc-num-s", parentNode: card } };
  var ctx = { state: { data: clone(doc), lastUpdated: null, pmReason: null }, elements: els };
  vm.createContext(ctx);
  vm.runInContext(SUM_CODE, ctx, { filename: "app.js (extracted)" });
  ctx.renderSummary();
  return { card: card, el: els };
}
function q(key, value, saved) { return { key: key, savedAt: saved ? "2026-09-30T10:00:00.000Z" : null, assets: [{ id: key, type: "bitcoin", name: "Bitcoin", manualValue: value, snapshotValue: value, investedPercent: 100, netFlow: 0 }] }; }
function doc2(prev, now) { return { currentQuarter: "2026-Q4", quarters: { "2026-Q3": q("2026-Q3", prev, true), "2026-Q4": q("2026-Q4", now, false) } }; }
function tones(card) { return card.classList.list().filter(function (c) { return TONES.indexOf(c) >= 0; }); }
var S0 = summary({ currentQuarter: "2026-Q4", quarters: { "2026-Q4": q("2026-Q4", 1000000, false) } });
t("ไม่มีไตรมาสก่อนหน้า (qGrowth null) → gc-neutral", tones(S0.card).join() === "gc-neutral" && S0.el.quarterGrowthNote.textContent === "ยังไม่มีไตรมาสก่อนหน้า", tones(S0.card));
var S1 = summary(doc2(1000000, 1100000));
t("โต +10% (positive) → gc-calm · ตัวเลขยังมีคลาส positive + gc-num gc-num-s",
  tones(S1.card).join() === "gc-calm" && S1.el.quarterGrowth.textContent === "+10.00%" && /(^|\s)positive(\s|$)/.test(S1.el.quarterGrowth.className) &&
  /\bgc-num\b/.test(S1.el.quarterGrowth.className) && /\bgc-num-s\b/.test(S1.el.quarterGrowth.className), [tones(S1.card), S1.el.quarterGrowth.className]);
var S2 = summary(doc2(1000000, 900000));
t("หด −10% (negative) → gc-danger · คลาส negative", tones(S2.card).join() === "gc-danger" && /(^|\s)negative(\s|$)/.test(S2.el.quarterGrowth.className), [tones(S2.card), S2.el.quarterGrowth.className]);
var S3 = summary(doc2(1000000, 1000000));
t("เท่าเดิม 0.00% → gc-calm (หน้าเดิมนับ ≥ 0 เป็น positive)", tones(S3.card).join() === "gc-calm" && /(^|\s)positive(\s|$)/.test(S3.el.quarterGrowth.className), tones(S3.card));
var S4 = summary(doc2(1000000, 900000));
S4.el.quarterGrowth.parentNode = S4.card;
(function () {
  // วาดซ้ำเมื่อสถานะเปลี่ยน → เหลือ tone เดียวเสมอ (ไม่ค้างสีเก่า)
  var ctx = { state: { data: doc2(1000000, 900000), lastUpdated: null, pmReason: null }, elements: S4.el };
  vm.createContext(ctx);
  vm.runInContext(SUM_CODE, ctx);
  ctx.renderSummary();
  ctx.state.data = doc2(1000000, 1200000);
  ctx.renderSummary();
  t("วาดใหม่หลังสถานะเปลี่ยน (danger → calm) → เหลือ tone เดียว", tones(S4.card).join() === "gc-calm", tones(S4.card));
})();
t("growthToneOf ไม่ประดิษฐ์ normal / warning (หน้านี้มีแค่ บวก/ลบ/ไม่มีไตรมาสก่อน)", !/gc-normal|gc-warning/.test(extract("growthToneOf")));

// ================= status text tone (statusToneOf) =================
console.log("== ข้อความสถานะ: สีที่ตัวข้อความ (ไม่ใช่ทั้งการ์ด) ==");
var ST;
try {
  var stCtx = { };
  vm.createContext(stCtx);
  vm.runInContext(code(["PM_SYNC_STATUS_TH", "PM_FOREIGN_LOCKED_TH", "PM_QUARTER_ENDED_TH", "NOT_LOADED_TH", "BTC_NO_PRICE_TH", "BTC_NO_FX_TH", "BTC_QTY_INVALID_TH"], ["statusToneOf", "paintStatusTone"]) +
    "\nthis.PM_SYNC_STATUS_TH = PM_SYNC_STATUS_TH; this.PM_FOREIGN_LOCKED_TH = PM_FOREIGN_LOCKED_TH; this.PM_QUARTER_ENDED_TH = PM_QUARTER_ENDED_TH; this.NOT_LOADED_TH = NOT_LOADED_TH;" +
    " this.BTC_NO_PRICE_TH = BTC_NO_PRICE_TH; this.BTC_NO_FX_TH = BTC_NO_FX_TH; this.BTC_QTY_INVALID_TH = BTC_QTY_INVALID_TH;", stCtx);
  ST = stCtx;
} catch (e) { t("extract statusToneOf / paintStatusTone from app.js", false, e.message); finish(); }
var CASES = [
  ["บันทึกลง database แล้ว", "qe-st-ok"], ["บันทึกแล้ว (Local fallback mode)", "qe-st-ok"], ["โหลดข้อมูลจาก database แล้ว", "qe-st-ok"], ["โหลดข้อมูลแล้ว (Local fallback mode)", "qe-st-ok"],
  ["บันทึกไม่สำเร็จ: boom", "qe-st-bad"], ["โหลดจาก database ไม่สำเร็จ: offline", "qe-st-bad"], [ST.NOT_LOADED_TH, "qe-st-bad"],
  ["กรุณากรอกมูลค่าปัจจุบันเป็นบาทให้ถูกต้อง", "qe-st-bad"], ["กรุณากรอกปีและไตรมาสให้ถูกต้อง", "qe-st-bad"],
  [ST.PM_QUARTER_ENDED_TH, "qe-st-warn"], ["บันทึก 2026-Q3 ล่าสุด 30/9/2569 17:00:00 · " + ST.PM_QUARTER_ENDED_TH, "qe-st-warn"], [ST.PM_FOREIGN_LOCKED_TH, "qe-st-warn"],
  // 2026-11-25 · Bitcoin เป็นจำนวน BTC: ยังไม่มีราคา = เตือน · กรอกจำนวนผิด = ผิดพลาด
  [ST.BTC_NO_PRICE_TH, "qe-st-warn"], [ST.BTC_NO_FX_TH, "qe-st-warn"], [ST.BTC_QTY_INVALID_TH, "qe-st-bad"],
  ["กำลังบันทึกลง database...", ""], ["กำลังโหลดข้อมูลจาก database...", ""], [ST.PM_SYNC_STATUS_TH, ""], ["บันทึก 2026-Q4 ล่าสุด 22/11/2569 10:00:00", ""],
  ["2026-Q4 ยังไม่เคยบันทึก snapshot", ""], ["ข้อมูลจะถูกเก็บแยกตามไตรมาสที่เลือก", ""], ["รีเฟรชหน้าจอแล้ว", ""], ["", ""]
];
var wrong = CASES.filter(function (c) { return ST.statusToneOf(c[0]) !== c[1]; }).map(function (c) { return c[0] + " → " + ST.statusToneOf(c[0]) + " (want " + (c[1] || "none") + ")"; });
t("statusToneOf: สำเร็จ → ok · ไม่สำเร็จ/กรุณากรอก → bad · ไตรมาสจบแล้ว/แก้ที่หน้า PM → warn · กำลัง…/ข้อมูลทั่วไป → ไม่มีสี (" + CASES.length + " ข้อความจริงของหน้า)", wrong.length === 0, wrong);
var stEl = { textContent: "บันทึกไม่สำเร็จ: x", classList: classList(["form-note", "qe-st-ok"]) };
ST.paintStatusTone(stEl);
var afterBad = stEl.classList.list().join();
stEl.textContent = "กำลังบันทึกลง database...";
ST.paintStatusTone(stEl);
t("paintStatusTone: เหลือสีเดียวตามข้อความล่าสุด · ข้อความไม่มีสถานะ = ล้างสี · คลาสเดิมคงอยู่",
  afterBad === "form-note,qe-st-bad" && stEl.classList.list().join() === "form-note", [afterBad, stEl.classList.list().join()]);
t("app.js ทาสีทุกครั้งที่ข้อความเปลี่ยน (MutationObserver บน #statusText + #quarterStatus)", /function watchStatusTone\(/.test(SRC) && /new MutationObserver\(/.test(SRC) && /\nwatchStatusTone\(\);/.test(SRC));

// ================= rows: PM chip + row buttons =================
console.log("== ตาราง Assets: ชิปแถวที่ล็อกจาก PM · ปุ่มแถว ==");
var ROW_CODE;
try {
  ROW_CODE = code(["TYPE_LABELS", "PM_DELETE_TITLE_TH"], ["currentQuarterKey", "currentQuarter", "clamp", "formatMoney", "formatPercent", "formatNetFlow", "assetGrossValue",
    "getTotals", "assetMetrics", "isPMSyncedAsset", "escapeHtml", "renderRows"]);
} catch (e) { t("extract renderRows from app.js", false, e.message); finish(); }
var rowsOut = [];
var rctx = {
  state: { foreignFromPM: true, data: { currentQuarter: "2026-Q4", quarters: { "2026-Q4": { key: "2026-Q4", assets: [
    { id: "f4", type: "foreign-stock", name: "US", manualValue: 6000000, investedPercent: 93, netFlow: 150000 },
    { id: "b4", type: "bitcoin", name: "Bitcoin", manualValue: 1000000, investedPercent: 100, netFlow: 0 }] } } } },
  elements: { rows: { set innerHTML(v) { rowsOut.length = 0; }, get innerHTML() { return ""; }, appendChild: function (r) { rowsOut.push(r); } }, emptyState: { classList: classList() }, panelSubtitle: { textContent: "" } },
  document: { createElement: function () { return { innerHTML: "" }; } }
};
vm.createContext(rctx);
vm.runInContext(ROW_CODE, rctx);
rctx.renderRows();
var r0 = rowsOut[0] ? rowsOut[0].innerHTML : "", r1 = rowsOut[1] ? rowsOut[1].innerHTML : "";
t("แถวที่ล็อกจาก PM: ป้ายเป็นชิป (pm-source-badge gc-chip gc-chip-flat) + ลิงก์ /portfolio-manager", /<a class="pm-source-badge gc-chip gc-chip-flat" href="\/portfolio-manager">จาก AI Portfolio Manager<\/a>/.test(r0), r0.slice(0, 300));
t("ปุ่มแก้ไข = icon-button edit-button gc-btn gc-btn-ghost · ปุ่มลบ = delete-button gc-btn gc-btn-ghost (คลาสเดิมคงอยู่)",
  /class="icon-button edit-button gc-btn gc-btn-ghost"[^>]*data-edit-id="f4"/.test(r0) && /class="delete-button gc-btn gc-btn-ghost"[^>]*data-delete-id="f4"[^>]*\sdisabled/.test(r0) &&
  /class="delete-button gc-btn gc-btn-ghost"[^>]*data-delete-id="b4"/.test(r1) && !/disabled/.test(r1), r0.slice(-320));
t("…ไม่มี ฿ ใน title / aria-label ของแถว", !/(?:title|aria-label)="[^"]*฿/.test(r0 + r1));
t("ปุ่มลบไตรมาส (ตารางภาพรวมการเติบโต) = delete-button gc-btn gc-btn-ghost", /class="delete-button gc-btn gc-btn-ghost" type="button" data-delete-quarter=/.test(extract("renderGrowthTables")));

// ================= Privacy Lock: ช่องเงินของฟอร์มแก้ไข =================
console.log("== Privacy Lock: ช่องเงินในฟอร์มแก้ไข (privacy.js ไม่แตะ <input>) ==");
var LOCKED_PH = "ล็อกอยู่ — ใส่ค่าใหม่ได้";
var PV_CODE;
try {
  PV_CODE = code(["TYPE_LABELS", "PM_SYNC_STATUS_TH", "PM_FOREIGN_LOCKED_TH", "PM_DELETE_TITLE_TH", "PM_QUARTER_ENDED_TH", "NOT_LOADED_TH", "BTC_NO_PRICE_TH", "BTC_NO_FX_TH", "BTC_QTY_INVALID_TH"], [
    "currentQuarterKey", "currentQuarter", "portfolioHeaders", "readJsonResponse", "adoptServerAllocation", "persistRemoteData", "saveData", "compareQuarter", "clamp",
    "assetKey", "isPMSyncedAsset", "setFormPMLock", "syncForeignFromPM", "applyPMSync", "runPendingPMSync", "readAssetFromForm", "handleFormSubmit", "editAsset", "resetForm",
    "updateFormMode", "privacyLocked", "moneyFieldText", "formMoneyText", "applyMoneyPrivacy", "onEditorPrivacyChanged",
    // 2026-11-25 Bitcoin เป็นจำนวน BTC (sandbox ไม่มี window.BtcValue = ช่องบาทแบบเดิม)
    "editingAsset", "btcLive", "btcMissingText", "isBtcQtyMode", "applyBtcValues", "formatBtcQty", "renderBtcNote", "adoptServerBtcPrices"]);
} catch (e) { t("extract the form path + privacy helpers from app.js", false, e.message); finish(); }
var DOC = { currentQuarter: "2026-Q4", quarters: { "2026-Q4": { key: "2026-Q4", savedAt: null, assets: [
  { id: "f4", type: "foreign-stock", name: "US", manualValue: 5000000, snapshotValue: 4900000, investedPercent: 92, netFlow: 100000 },
  { id: "old", type: "bitcoin", name: "Bitcoin", manualValue: 800000, snapshotValue: 800000, investedPercent: 100 }] } } };
function field(value, ph) { return { value: value == null ? "" : String(value), placeholder: ph, disabled: false, required: false, classList: classList() }; }
function bootForm(locked) {
  var calls = [], pv = { locked: !!locked };
  var el = {
    statusText: { textContent: "" }, typeInput: field("bitcoin"), nameInput: field(""), valueInput: field("", "250000"), investedPercentInput: field("100"),
    investedPercentField: { classList: classList() }, netFlowInput: field("0", "0"), formTitle: { textContent: "" }, submitButton: { textContent: "" },
    cancelEditButton: { classList: classList(["is-hidden"]) }, pmLockNote: { classList: classList(["is-hidden"]) }
  };
  el.form = { reset: function () { el.typeInput.value = "bitcoin"; el.nameInput.value = ""; el.valueInput.value = ""; el.investedPercentInput.value = "100"; el.netFlowInput.value = "0"; } };
  var ctx = {
    state: { data: clone(DOC), editingId: null, saving: false, hydrating: false, loaded: true, storageMode: "supabase", foreignFromPM: false, pmReason: null, pmHoldings: null, pmSyncPending: false },
    elements: el, render: function () {}, renderSummary: function () {}, renderRows: function () {}, setActiveView: function () {},
    sessionStorage: { getItem: function () { return "pw"; } },
    fetch: function (url, init) {
      var method = (init && init.method) || "GET";
      calls.push({ url: url, method: method, body: init && init.body ? JSON.parse(init.body) : null });
      var body = method === "GET" ? { data: clone(DOC) } : { ok: true };
      return Promise.resolve({ ok: true, status: 200, text: function () { return Promise.resolve(JSON.stringify(body)); } });
    },
    window: { PortfolioPrivacy: { isLocked: function () { return pv.locked; } } },
    crypto: { randomUUID: function () { return "uuid-1"; } }
  };
  vm.createContext(ctx);
  vm.runInContext(PV_CODE, ctx, { filename: "app.js (extracted)" });
  return {
    ctx: ctx, el: el, pv: pv, calls: calls,
    asset: function (id) { return ctx.state.data.quarters["2026-Q4"].assets.filter(function (a) { return a.id === id; })[0]; },
    submit: function () { ctx.handleFormSubmit({ preventDefault: function () {} }); },
    puts: function () { return calls.filter(function (c) { return c.method === "PUT"; }); },
    setLock: function (v) { pv.locked = v; ctx.onEditorPrivacyChanged(); }
  };
}
function flush() { return new Promise(function (r) { setTimeout(r, 5); }); }

(async function privacy() {
  var U = bootForm(false);
  U.ctx.editAsset("f4");
  t("ไม่ล็อก: กดแก้ไข → ช่องมูลค่า/เงินเติม-ถอนแสดงค่าที่บันทึกไว้ + placeholder เดิม (พฤติกรรมเดิม)",
    String(U.el.valueInput.value) === "5000000" && String(U.el.netFlowInput.value) === "100000" && U.el.valueInput.placeholder === "250000" && U.el.netFlowInput.placeholder === "0",
    [U.el.valueInput.value, U.el.netFlowInput.value, U.el.valueInput.placeholder]);
  U.submit(); await flush();
  var uRow = clone(U.asset("f4"));

  var L = bootForm(true);
  L.ctx.editAsset("f4");
  t("ล็อก: กดแก้ไข → ช่องเงินทั้งสองว่าง + placeholder '" + LOCKED_PH + "' (ไม่มีเงินใน <input>)",
    L.el.valueInput.value === "" && L.el.netFlowInput.value === "" && L.el.valueInput.placeholder === LOCKED_PH && L.el.netFlowInput.placeholder === LOCKED_PH,
    [L.el.valueInput.value, L.el.netFlowInput.value, L.el.valueInput.placeholder]);
  t("…ชื่อ / % ลงทุนจริง (ไม่ใช่เงิน) ยังแสดงตามปกติ", L.el.nameInput.value === "US" && String(L.el.investedPercentInput.value) === "92");
  L.submit(); await flush();
  var lRow = L.asset("f4"), lPut = L.puts()[0];
  t("ล็อก + บันทึกโดยเว้นว่าง → คงค่าที่บันทึกไว้ (มูลค่า 5,000,000 · เงินเติม 100,000) ไม่บันทึก 0 ทับ",
    lRow.manualValue === 5000000 && lRow.netFlow === 100000 && !!lPut && lPut.body.data.quarters["2026-Q4"].assets[0].manualValue === 5000000 && lPut.body.data.quarters["2026-Q4"].assets[0].netFlow === 100000,
    JSON.stringify(lRow));
  var strip = function (a) { var c = clone(a); delete c.updatedAt; return JSON.stringify(c); };
  t("…ผลเท่ากับกดบันทึกโดยไม่แตะช่องตอนไม่ล็อก (snapshotValue = มูลค่า ตามเดิม)", strip(lRow) === strip(uRow), [strip(lRow), strip(uRow)]);

  var T = bootForm(true);
  T.ctx.editAsset("f4");
  T.el.valueInput.value = "5200000";
  T.submit(); await flush();
  t("ล็อก + พิมพ์มูลค่าใหม่ (เงินเติมเว้นว่าง) → บันทึกค่าใหม่ 5,200,000 · เงินเติมคงเดิม 100,000",
    T.asset("f4").manualValue === 5200000 && T.asset("f4").snapshotValue === 5200000 && T.asset("f4").netFlow === 100000, JSON.stringify(T.asset("f4")));
  var Z = bootForm(true);
  Z.ctx.editAsset("f4");
  Z.el.netFlowInput.value = "0";
  Z.submit(); await flush();
  t("ล็อก + พิมพ์ 0 เอง → บันทึก 0 ตามที่พิมพ์ (เว้นว่างเท่านั้นที่คงค่าเดิม)", Z.asset("f4").netFlow === 0 && Z.asset("f4").manualValue === 5000000);

  var LG = bootForm(true), LGU = bootForm(false);
  LG.ctx.editAsset("old"); LG.submit(); await flush();
  LGU.ctx.editAsset("old"); LGU.submit(); await flush();
  t("แถวเก่าไม่มีเงินเติม/ถอน: ล็อกแล้วเว้นว่าง = ผลเดียวกับไม่ล็อกไม่แตะช่อง (ช่องแสดง 0)", strip(LG.asset("old")) === strip(LGU.asset("old")) && LG.asset("old").manualValue === 800000,
    [strip(LG.asset("old")), strip(LGU.asset("old"))]);

  var C = bootForm(false);
  C.ctx.editAsset("f4");
  C.setLock(true);
  t("เปิดแก้ไขตอนปลดล็อก แล้วกดล็อก → ช่องเงินว่างทันที + placeholder ล็อก", C.el.valueInput.value === "" && C.el.netFlowInput.value === "" && C.el.valueInput.placeholder === LOCKED_PH);
  C.setLock(false);
  t("…ปลดล็อกอีกครั้ง → ช่องที่ว่างได้ค่าที่บันทึกไว้คืน + placeholder เดิม", C.el.valueInput.value === "5000000" && C.el.netFlowInput.value === "100000" && C.el.valueInput.placeholder === "250000");

  var R = bootForm(true);
  R.ctx.editAsset("f4");
  R.el.valueInput.value = "4800000";
  R.setLock(false);
  t("แก้ตอนล็อก พิมพ์มูลค่าใหม่ แล้วปลดล็อก → ค่าที่พิมพ์คงไว้ · ช่องเงินเติมที่ว่างได้ค่าเดิมคืน", R.el.valueInput.value === "4800000" && R.el.netFlowInput.value === "100000");
  R.submit(); await flush();
  t("…บันทึก → มูลค่าใหม่ 4,800,000 · เงินเติม 100,000 (ไม่ใช่ 0)", R.asset("f4").manualValue === 4800000 && R.asset("f4").netFlow === 100000);
  t("…ฟอร์มปิด (resetForm) → placeholder กลับเป็นค่าเดิม · ช่องว่าง/0 ตามค่าเริ่มของฟอร์ม",
    R.el.valueInput.placeholder === "250000" && R.el.netFlowInput.placeholder === "0" && R.el.valueInput.value === "" && R.el.netFlowInput.value === "0");

  var N = bootForm(true);
  N.setLock(true);
  t("ล็อกแต่ไม่ได้แก้รายการ (ฟอร์มเพิ่มใหม่) → ไม่แตะค่า (เงินเติมยังเป็น 0) · placeholder เดิม",
    N.el.netFlowInput.value === "0" && N.el.netFlowInput.placeholder === "0" && N.el.valueInput.placeholder === "250000");

  // fix round 1 [3]: แถวที่ล็อกตาม PM — ช่องมูลค่าถูกปิด (setFormPMLock) → placeholder ไม่บอกว่า "ใส่ค่าใหม่ได้"
  var PMR = bootForm(true);
  PMR.ctx.state.foreignFromPM = true;
  PMR.ctx.editAsset("f4");
  t("ล็อก + แก้แถวที่ล็อกตาม PM: ช่องมูลค่า (ถูกปิด) = 'ล็อกอยู่' · ช่องเงินเติม/ถอน (แก้ได้) = '" + LOCKED_PH + "' · ทั้งสองว่าง",
    PMR.el.valueInput.disabled === true && PMR.el.valueInput.placeholder === "ล็อกอยู่" && PMR.el.netFlowInput.placeholder === LOCKED_PH &&
    PMR.el.valueInput.value === "" && PMR.el.netFlowInput.value === "", [PMR.el.valueInput.disabled, PMR.el.valueInput.placeholder, PMR.el.netFlowInput.placeholder]);
  PMR.ctx.resetForm();
  t("…ฟอร์มปิด → ช่องเปิดคืน + placeholder เดิม", PMR.el.valueInput.disabled === false && PMR.el.valueInput.placeholder === "250000");

  t("app.js ฟัง portfolio-privacy-changed → onEditorPrivacyChanged", /document\.addEventListener\("portfolio-privacy-changed", onEditorPrivacyChanged\)/.test(SRC));
  finish();
})().catch(function (e) {
  console.log("  ✗ เทสต์ล้ม: " + (e && e.stack || e));
  process.exit(1);
});
