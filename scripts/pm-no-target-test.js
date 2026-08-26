// หน้า AI Portfolio Manager ต้องไม่มีคำว่า "เป้า" หลุดออกจอในทุก section
// รันด้วย engine ตัวจริง (PMEngine + ThesisEngine + KB จริง) แล้ว render ทุก section
// จับได้ทั้งข้อความที่หน้าเขียนเอง และข้อความที่ engine สร้าง (why/rule/detail/note)
"use strict";
var fs = require("fs");
var PM = require(process.cwd() + "/public/portfolio-manager-engine.js");
var TE = require(process.cwd() + "/public/thesis-engine.js");
var TD = require(process.cwd() + "/public/thesis-data.js");

var SRC = fs.readFileSync(process.cwd() + "/public/portfolio-manager-page.js", "utf8");
var CUT = "  // ธงแดง/มูลค่าเปลี่ยนจาก Action Center";
if (SRC.indexOf(CUT) < 0) throw new Error("anchor bootstrap หาย");
var body = SRC.slice(0, SRC.indexOf(CUT)).replace(/^\(function \(\) \{/, "");
body += [
  "",
  "  return {",
  "    noTarget: noTarget, allocEditor: allocEditor,",
  "    sections: { overview: sectionOverview, current: sectionCurrent, zones: sectionZones,",
  "      deployment: sectionDeployment, manager: sectionManager, risk: sectionRisk, method: sectionMethod },",
  "    hasTargets: typeof sectionTargets !== \"undefined\",",
  "    setView: function (v) { writeJson(CVIEW_STORE, v); },",
  "  };",
  "",
].join("\n");

var store = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
  setItem: function (k, v) { store[k] = String(v); },
};
global.window = { ThesisData: TD, PMEngine: PM, ThesisEngine: TE, addEventListener: function () {} };
global.document = { readyState: "complete", getElementById: function () { return null; }, addEventListener: function () {} };
var mod = new Function("var sectionTargets;\n" + body)();

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; return; }
  fail++; console.log("  ✗ " + name + (extra ? " — " + extra : ""));
}

// ---- out จาก engine ตัวจริง: ถือ 4 ตัว + index + candidate ที่ยังไม่ถือ ----
function P(t, held, w, tier) { return { ticker: t, held: held, weightPct: w, tierKey: tier }; }
var positions = [P("QQQM", true, 40, "A"), P("NVDA", true, 8.7, "A"), P("META", true, 5.8, "A"),
  P("PLTR", true, 4.7, "C"), P("AMZN", false, 0, "A")];
var out = PM.compute({}, { TE: TE, teOpts: { data: TD }, positions: positions, cashPct: 28.7,
  indexTicker: "QQQM", indexPct: 50, splitMethod: "conviction", maxSinglePct: 10, megaStance: "bullish" });
ok("engine: compute ได้ผล", out.available === true, out.reason);
ok("engine: ยังคำนวณ target ไว้ภายใน (ไม่ได้แก้ engine)",
  out.allocationRows.some(function (r) { return r.target != null; }));

var MV = { QQQM: 2000000, NVDA: 435000, META: 291000, PLTR: 236000 };
var inp = {
  positions: Object.keys(MV).map(function (t) { return { ticker: t, marketValue: MV[t] }; }),
  candidates: [], gross: 5000000, flagSum: 2962000, cashBaht: 2038000, cashPct: 40.8, investedPct: 59.2,
};

// ---- render ทุก section ทั้ง 2 มุม ----
var S = mod.sections;
function renderAll(view) {
  mod.setView(view);
  return [S.overview(out, inp), S.current(out, inp), S.zones(out),
    S.deployment(out, inp), S.manager(out), S.risk(out), S.method()].join("\n");
}
var htmlAll = renderAll("all"), htmlSt = renderAll("stocks");

// ======== กฎหลัก: ไม่มีคำ "เป้า" ที่ใดในหน้า ========
[["ทั้งพอร์ต", htmlAll], ["เฉพาะหุ้นรายตัว", htmlSt]].forEach(function (p) {
  var i = p[1].indexOf("เป้า");
  ok("มุม " + p[0] + ": ไม่มีคำ \"เป้า\" ในหน้าเลย", i < 0,
    i < 0 ? "" : "…" + p[1].slice(Math.max(0, i - 70), i + 70).replace(/\s+/g, " ") + "…");
});
// คำอังกฤษที่แปลว่าเป้าก็ต้องไม่โผล่เป็นป้ายข้อมูล
["<th>Target</th>", ">Target<", "Target Allocation", "Portfolio Alignment", "Allocation Policy"].forEach(function (k) {
  ok('ไม่มีป้าย "' + k + '"', htmlAll.indexOf(k) < 0);
});

// ======== section ที่ต้องหาย / ต้องอยู่ ========
ok("ลบ sectionTargets ออกจากไฟล์แล้ว", mod.hasTargets === false);
ok("ไม่มีหัวข้อ 🎯 Target Allocation", htmlAll.indexOf("Target Allocation") < 0);
ok("ไม่มี pm-target-row", htmlAll.indexOf("pm-target-row") < 0);
ok("ไม่มี pm-tbar (แท่งเทียบเป้า)", htmlAll.indexOf("pm-tbar") < 0);
["💼 Current Portfolio", "🧲 Accumulation Opportunities", "💵 Cash Deployment Plan",
  "🧰 Position Manager", "🛡️ Risk Management"].forEach(function (h) {
  ok("ยังมี section: " + h, htmlAll.indexOf(h) >= 0);
});

// ======== หัวหน้า: เหลือ 4 การ์ด ========
var nStat = (htmlAll.match(/class="pm-stat"/g) || []).length;
ok("หัวหน้าเหลือ 4 การ์ด", nStat === 4, nStat);
["Portfolio Value", "เงินสดพร้อมวาง", "Portfolio Thesis Score", "Portfolio Health"].forEach(function (k) {
  ok("การ์ดที่เก็บไว้: " + k, htmlAll.indexOf(k) >= 0);
});

// ======== Position Manager: ตัดตัวเลขเป้า แต่ยังติ๊ก deploy ได้ ========
var mgr = htmlAll.slice(htmlAll.indexOf("🧰 Position Manager"));
ok("Position Manager: ไม่มีป้าย Target", mgr.indexOf(">Target<") < 0);
ok("Position Manager: ไม่มี Capacity เหลือ", mgr.indexOf("Capacity เหลือ") < 0);
ok("Position Manager: ไม่มี Suggested Today", mgr.indexOf("Suggested Today") < 0);
ok("Position Manager: ยังติ๊ก entry ได้ (คงการจำ deploy)", mgr.indexOf("data-pm-entry=") >= 0);
ok("Position Manager: ยังโชว์น้ำหนักปัจจุบัน", mgr.indexOf("น้ำหนักปัจจุบัน") >= 0);
var tierTh = (mgr.match(/<th>(Tier|Min|Max|Target)<\/th>/g) || []).join(",");
ok("Master Position Size: หัวตารางเหลือ Tier/Min/Max", tierTh === "<th>Tier</th>,<th>Min</th>,<th>Max</th>", tierTh);

// ======== index core ยังตั้งค่าได้ (ไม่ใช่เรื่องเป้า จึงเก็บไว้) ========
ok("Current Portfolio: มีช่องตั้ง index ticker", htmlAll.indexOf('data-pm-alloc="indexTicker"') >= 0);
ok("ไม่มีช่องตั้ง index % แล้ว", htmlAll.indexOf('data-pm-alloc="indexPct"') < 0);
ok("ไม่มีช่องตั้งเพดานรายตัวแล้ว", htmlAll.indexOf('data-pm-alloc="maxSinglePct"') < 0);
ok("ไม่มีช่องเลือกวิธีแบ่งแล้ว", htmlAll.indexOf('data-pm-alloc="splitMethod"') < 0);

// ======== noTarget(): แปลงประโยคจริงจาก engine ให้อ่านรู้เรื่อง ไม่ใช่ตัดคำทิ้งดิบ ๆ ========
[
  ["🟢 Strong Accumulation · Entry 1 trigger แล้ว · เติมได้อีก 1.3pp ถึงเป้า 10%",
    "🟢 Strong Accumulation · Entry 1 trigger แล้ว"],
  ["ทุกตำแหน่งอยู่ระดับเป้าหรือยังไม่มี entry ที่ trigger — ถือตามแผน",
    "ยังไม่มี entry ที่ trigger — ถือตามแผน"],
  ["ครบทุกเงื่อนไข — วางฐาน 50% ของเป้าได้", "ครบทุกเงื่อนไข — วางฐานได้"],
  ["ห่างเป้ารวม 36.2pp — น้ำหนักจริงยังไม่สอดคล้องเป้าแบบไดนามิก",
    "ห่างรวม 36.2pp — น้ำหนักจริงยังไม่สอดคล้องแผน"],
  ["Index core — ตั้งเป้าคงที่ 50% ของหุ้นต่างประเทศ (ไม่นับเป็นหุ้นรายตัว)",
    "Index core — กำหนดคงที่ 50% ของหุ้นต่างประเทศ (ไม่นับเป็นหุ้นรายตัว)"],
  ["ถือระดับปัจจุบัน — ครบเป้าแล้ว", "ถือระดับปัจจุบัน — ครบระดับแล้ว"],
].forEach(function (c, k) {
  var got = mod.noTarget(c[0]);
  ok("noTarget #" + (k + 1) + ": ได้ประโยคที่อ่านรู้เรื่อง", got === c[1], "ได้ \"" + got + "\"");
  ok("noTarget #" + (k + 1) + ": ไม่เหลือคำเป้า", got.indexOf("เป้า") < 0);
});
ok("noTarget: ข้อความไม่มีคำเป้า ผ่านไม่แปลง", mod.noTarget("NVDA · Zone B") === "NVDA · Zone B");
ok("noTarget: null/undefined ปลอดภัย", mod.noTarget(null) === "" && mod.noTarget(undefined) === "");
ok("noTarget: ตัวเลขไม่เพี้ยน", mod.noTarget("8.7%") === "8.7%");
ok("noTarget: ticker ไม่โดนแตะ", mod.noTarget("GULF.BK") === "GULF.BK");

// ======== ไม่มีขยะหลุดจอ ========
[["all", htmlAll], ["stocks", htmlSt]].forEach(function (p) {
  ok("มุม " + p[0] + ": ไม่มี NaN", p[1].indexOf("NaN") < 0);
  ok("มุม " + p[0] + ": ไม่มี Infinity", p[1].indexOf("Infinity") < 0);
  ok("มุม " + p[0] + ": ไม่มี undefined", p[1].indexOf("undefined") < 0);
  ok("มุม " + p[0] + ": ไม่มี null โชว์", p[1].indexOf(">null<") < 0);
});

// ======== engine ยังไม่ถูกแตะ: หน้าอื่นต้องได้คำเดิม ========
var ENG = fs.readFileSync(process.cwd() + "/public/portfolio-manager-engine.js", "utf8");
ok("engine ยังพูดคำ \"เป้า\" ให้หน้าอื่น (ไม่ได้แก้ engine)", ENG.indexOf("เป้า") >= 0);
ok("engine ยังมี ACTIONS.maintain เดิม", ENG.indexOf("ครบเป้าแล้ว") >= 0);

console.log((fail ? "✗ FAIL" : "✓ PASS") + " — pm-no-target-test: " + pass + " ผ่าน, " + fail + " ไม่ผ่าน");
process.exit(fail ? 1 : 0);
