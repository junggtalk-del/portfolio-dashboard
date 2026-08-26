// Current Portfolio: 2 มุม (ทั้งพอร์ต / เฉพาะหุ้นรายตัว) + pie + ลำดับตามมูลค่า
// assert บน HTML ที่ render จริง ไม่ใช่แค่ตรวจว่า syntax ผ่าน
// (เคส asOfLine เคยผ่านที่ API แต่ UI ไม่เคย render — บทเรียนเดียวกัน)
//
// กฎที่ต้องคุม:
//   1. มุมที่ 2 กรอง "รายชื่อ" เท่านั้น — น้ำหนักต้องเท่ามุมแรกเป๊ะ (ห้าม rebase)
//   2. ตารางไม่มีคอลัมน์ "เป้า" (ยกเลิกแล้ว) — เหลือ 6 คอลัมน์
//   3. pie ทุกมุมต้องปิดวงครบ 100% และไม่มี NaN/Infinity หลุดจอ
//   4. แถวเรียงตามมูลค่า มาก→น้อย ตรงลำดับกับ pie
"use strict";
var fs = require("fs");
var SRC = fs.readFileSync(process.cwd() + "/public/portfolio-manager-page.js", "utf8");

// ตัด bootstrap ท้ายไฟล์ (แตะ DOM จริง) แล้ว export ฟังก์ชันภายในออกมาทดสอบ
var CUT = "  // ธงแดง/มูลค่าเปลี่ยนจาก Action Center";
if (SRC.indexOf(CUT) < 0) throw new Error("anchor bootstrap หาย — harness ต้องอัปเดต");
var body = SRC.slice(0, SRC.indexOf(CUT));
body = body.replace(/^\(function \(\) \{/, "");
body += "\n  return { sectionCurrent: sectionCurrent, pieSvg: pieSvg, setView: function (v) { writeJson(CVIEW_STORE, v); } };\n";

var store = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
  setItem: function (k, v) { store[k] = String(v); },
};
global.window = { ThesisData: { companies: { MSFT: {}, TSM: {} } }, addEventListener: function () {} };
global.document = { readyState: "complete", getElementById: function () { return null; }, addEventListener: function () {} };
var mod = new Function(body)();

function row(t, tier, held, w, target, isIndex) {
  return { ticker: t, name: t + " Inc.", tier: { key: tier }, isIndex: !!isIndex, held: held,
    weightPct: w, target: target, covered: true, zone: { key: "B", label: "Strong Accumulation", icon: "🟢" },
    action: { label: "Maintain", tone: "neutral" } };
}
// ตัวเลขชุดเดียวกับพอร์ตจริง: QQQM 2.0M + หุ้น 1.565M + เงินสด 1.435M = 5.0M
var MV = { QQQM: 2000000, AMZN: 148000, ASML: 165000, GOOG: 168000, META: 291000, NVDA: 435000, PLTR: 236000, SHOP: 122000 };
var out = {
  allocationRows: [
    row("QQQM", "A", true, 40.0, 50, true),
    row("AMZN", "A", true, 3.0, 9), row("ASML", "A", true, 3.3, 8.1),
    row("GOOG", "A", true, 3.4, 10), row("META", "A", true, 5.8, 9.5),
    row("NVDA", "A", true, 8.7, 10), row("PLTR", "C", true, 4.7, 2.6),
    row("SHOP", "C", true, 2.4, 0.8),
  ],
  policy: { indexTicker: "QQQM", indexPct: 50, satellitePool: 50, splitMethod: "conviction", maxSinglePct: 10 },
};
var inp = {
  positions: Object.keys(MV).map(function (t) { return { ticker: t, marketValue: MV[t] }; }),
  gross: 5000000, flagSum: 3565000, cashBaht: 1435000, cashPct: 28.7, investedPct: 71.3,
};

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; return; }
  fail++; console.log("  ✗ " + name + (extra ? " — " + extra : ""));
}
function tbodyOf(html) { return html.slice(html.indexOf("<tbody>")); }
// แถวหุ้นเหลือ % เดียว = น้ำหนักปัจจุบัน (คอลัมน์เป้าถูกยกเลิกแล้ว)
function tableRows(html) {
  var map = {};
  tbodyOf(html).split("<tr").forEach(function (chunk) {
    var t = /class="pm-sym"[^>]*>([A-Z.]+)</.exec(chunk);
    if (!t) return;
    var p = (chunk.match(/>(-?[\d.]+)%</g) || []).map(function (x) { return Number(x.slice(1, -2)); });
    map[t[1]] = { pcts: p, w: p.length > 0 ? p[0] : null, tds: (chunk.match(/<td[ >]/g) || []).length };
  });
  return map;
}
function tableOrder(html) {
  return (tbodyOf(html).match(/class="pm-sym"[^>]*>([A-Z.]+)</g) || []).map(function (x) {
    return /pm-sym"[^>]*>([A-Z.]+)</.exec(x)[1];
  });
}
// ชิ้นใน pie อ่านจาก <title>LABEL 12.3%</title> ที่ผูกกับแต่ละ path
function pieSlices(html) {
  var wrap = html.indexOf('class="pm-pie-wrap"');
  if (wrap < 0) return [];
  var svg = html.slice(wrap, html.indexOf("</svg>", wrap));
  return (svg.match(/<title>([^<]+)<\/title>/g) || []).map(function (x) {
    var m = /<title>(.+) (-?[\d.]+)%<\/title>/.exec(x);
    return { label: m[1], pct: Number(m[2]) };
  });
}
function pieLegend(html) {
  return (html.match(/<i style="background:[^"]+"><\/i>([^<]+)<b>(-?[\d.]+)%<\/b>/g) || []).map(function (x) {
    var m = /<\/i>([^<]+)<b>(-?[\d.]+)%<\/b>/.exec(x);
    return { label: m[1], pct: Number(m[2]) };
  });
}
function byLabel(arr) { var o = {}; arr.forEach(function (x) { o[x.label] = x.pct; }); return o; }

// ======== มุม 1: ทั้งพอร์ต ========
mod.setView("all");
var hAll = mod.sectionCurrent(out, inp);
var tAll = tableRows(hAll);
ok("all: มีปุ่มสลับ 2 ปุ่ม", (hAll.match(/data-pm-cview=/g) || []).length === 2);
ok("all: ปุ่มทั้งพอร์ตติดสว่าง", /is-on pm-bull" data-pm-cview="all"/.test(hAll));
ok("all: มี QQQM ในตาราง", !!tAll.QQQM);
ok("all: มีแถวเงินสด", hAll.indexOf("pm-row-cash") >= 0);
ok("all: QQQM = 40.0%", tAll.QQQM && tAll.QQQM.w === 40, tAll.QQQM && tAll.QQQM.w);
ok("all: NVDA = 8.7%", tAll.NVDA && tAll.NVDA.w === 8.7, tAll.NVDA && tAll.NVDA.w);
ok("all: หัวข้อบอกว่าเห็นทั้งพอร์ต", hAll.indexOf("เห็นทั้งพอร์ตรวม") >= 0);

// ======== คอลัมน์ "เป้า" ต้องหายไปหมด ========
var thead = hAll.slice(hAll.indexOf("<thead>"), hAll.indexOf("</thead>"));
ok("เป้า: ไม่มี <th>เป้า</th>", thead.indexOf("เป้า") < 0, thead);
ok("เป้า: หัวตารางเหลือ 6 คอลัมน์", (thead.match(/<th>/g) || []).length === 6, (thead.match(/<th>/g) || []).length);
ok("เป้า: แถวหุ้นมี 6 td", tAll.NVDA && tAll.NVDA.tds === 6, tAll.NVDA && tAll.NVDA.tds);
ok("เป้า: แถวหุ้นเหลือ % เดียว (น้ำหนัก)", tAll.NVDA && tAll.NVDA.pcts.length === 1, tAll.NVDA && tAll.NVDA.pcts.join(","));
ok("เป้า: ไม่มีเลข 9.5/8.1/2.6 (เป้าเดิม) หลุดในตาราง",
  ["9.5%", "8.1%", "2.6%"].every(function (x) { return tbodyOf(hAll).indexOf(x) < 0; }));
var cashRow = tbodyOf(hAll).split("<tr").filter(function (c) { return c.indexOf("pm-row-cash") >= 0; })[0] || "";
ok("เป้า: แถวเงินสดมี 6 td", (cashRow.match(/<td[ >]/g) || []).length === 6, (cashRow.match(/<td[ >]/g) || []).length);
ok("เป้า: แถวเงินสดไม่มีคำ reserve ในช่องเป้า", cashRow.indexOf("pm-dim\">reserve") < 0);
ok("เป้า: section 🎯 Target Allocation ถูกลบออกจากหน้านี้แล้ว", SRC.indexOf("🎯 Target Allocation") < 0);
// รายละเอียดการลบเป้าทุก section อยู่ที่ scripts/pm-no-target-test.js

// ======== มุม 2: เฉพาะหุ้นรายตัว ========
mod.setView("stocks");
var hSt = mod.sectionCurrent(out, inp);
var tSt = tableRows(hSt);
ok("stocks: ปุ่มหุ้นรายตัวติดสว่าง", /is-on pm-bull" data-pm-cview="stocks"/.test(hSt));
ok("stocks: ไม่มี QQQM ในตาราง", !tSt.QQQM, Object.keys(tSt).join(","));
ok("stocks: ไม่มีแถวเงินสด", hSt.indexOf("pm-row-cash") < 0);
ok("stocks: เหลือหุ้นครบ 7 ตัว", Object.keys(tSt).length === 7, Object.keys(tSt).length);
ok("stocks: note บอกว่าอิงฐานทั้งพอร์ต", hSt.indexOf("ยังอิงฐานทั้งพอร์ต") >= 0);

// *** กฎหลัก: น้ำหนักต้องเท่ามุมแรกเป๊ะ — ห้าม rebase ***
Object.keys(tSt).forEach(function (t) {
  ok("stocks: " + t + " น้ำหนักเท่ามุม all (" + tAll[t].w + "%)", tSt[t].w === tAll[t].w, tSt[t].w);
});
var sumW = Object.keys(tSt).reduce(function (a, t) { return a + (tSt[t].w || 0); }, 0);
ok("stocks: น้ำหนักรวม = 31.3% ของทั้งพอร์ต (ไม่ใช่ 100)", Math.abs(sumW - 31.3) < 0.15, sumW.toFixed(2));

// ======== pie: มุมทั้งพอร์ต ========
var pAll = pieSlices(hAll), lAll = pieLegend(hAll), pmAll = byLabel(pAll);
ok("pie all: 9 ชิ้น (QQQM + 7 หุ้น + เงินสด)", pAll.length === 9, pAll.length);
ok("pie all: QQQM = 40.0%", pmAll.QQQM === 40, pmAll.QQQM);
ok("pie all: เงินสด = 28.7%", pmAll["เงินสด"] === 28.7, pmAll["เงินสด"]);
ok("pie all: NVDA = 8.7% (เท่าตาราง)", pmAll.NVDA === 8.7, pmAll.NVDA);
var sumPAll = pAll.reduce(function (a, x) { return a + x.pct; }, 0);
ok("pie all: รวมทุกชิ้น = 100%", Math.abs(sumPAll - 100) < 0.2, sumPAll.toFixed(2));
ok("pie all: ชิ้นแรกคือ index (QQQM)", pAll[0].label === "QQQM", pAll[0].label);
ok("pie all: หุ้นเรียงมูลค่ามาก→น้อย", pAll[1].label === "NVDA" && pAll[2].label === "META", pAll[1].label + "," + pAll[2].label);
ok("pie all: legend 9 รายการ", lAll.length === 9, lAll.length);
ok("pie all: กลางวงบอกสัดส่วนหุ้นรวม 31.3%", /pm-pie-c1[^>]*>31\.3%</.test(hAll));
ok("pie all: กลางวงมีคำอธิบาย", hAll.indexOf("หุ้นรายตัวรวม") >= 0);

// ======== pie: มุมหุ้นรายตัว ========
var pSt = pieSlices(hSt), lSt = pieLegend(hSt), pmSt = byLabel(pSt);
ok("pie stocks: 8 ชิ้น (7 หุ้น + อื่น ๆ)", pSt.length === 8, pSt.length);
ok("pie stocks: ไม่มีชิ้น QQQM แยก", pmSt.QQQM == null);
ok("pie stocks: ชิ้นจาง 'อื่น ๆ' = 68.7%", Math.abs(pmSt["อื่น ๆ"] - 68.7) < 0.1, pmSt["อื่น ๆ"]);
ok("pie stocks: NVDA ยัง 8.7% (ไม่ rebase)", pmSt.NVDA === 8.7, pmSt.NVDA);
var sumPSt = pSt.reduce(function (a, x) { return a + x.pct; }, 0);
ok("pie stocks: รวมทุกชิ้น = 100% (วงปิดครบ)", Math.abs(sumPSt - 100) < 0.2, sumPSt.toFixed(2));
ok("pie stocks: legend มีแต่หุ้น 7 ตัว", lSt.length === 7, lSt.length);
ok("pie stocks: legend ไม่มีเงินสด/QQQM", !byLabel(lSt)["เงินสด"] && !byLabel(lSt).QQQM);
ok("pie stocks: caption อธิบายส่วนจาง", hSt.indexOf("ส่วนจาง = QQQM + เงินสด") >= 0);

// ======== SVG ต้องไม่มีพิกัดเสีย ========
[["all", hAll], ["stocks", hSt]].forEach(function (p) {
  ok("มุม " + p[0] + ": ไม่มี NaN", p[1].indexOf("NaN") < 0);
  ok("มุม " + p[0] + ": ไม่มี Infinity", p[1].indexOf("Infinity") < 0);
  ok("มุม " + p[0] + ": ไม่มี undefined", p[1].indexOf("undefined") < 0);
  ok("มุม " + p[0] + ": path arc ครบทุกชิ้น", (p[1].match(/<path d="M/g) || []).length >= 8);
});

// ======== ลำดับแถว: มูลค่า มาก→น้อย (ต้องตรงลำดับ pie) ========
var ordAll = tableOrder(hAll), ordSt = tableOrder(hSt);
var EXP_ALL = ["QQQM", "NVDA", "META", "PLTR", "GOOG", "ASML", "AMZN", "SHOP"];
ok("เรียง all: มูลค่ามาก→น้อย", ordAll.join(",") === EXP_ALL.join(","), ordAll.join(","));
ok("เรียง stocks: มูลค่ามาก→น้อย", ordSt.join(",") === EXP_ALL.slice(1).join(","), ordSt.join(","));
var pieOrdSt = pSt.map(function (x) { return x.label; }).filter(function (l) { return l !== "อื่น ๆ"; });
ok("เรียง: ตาราง = pie (มุมหุ้นรายตัว)", pieOrdSt.join(",") === ordSt.join(","), pieOrdSt.join(",") + " vs " + ordSt.join(","));

// ตัวที่ยังไม่ถือ / ยังไม่ใส่มูลค่า ต้องไปท้ายสุด ไม่แทรกกลาง
var outMix = { allocationRows: [
  row("AAA", "A", false, null, 5), row("NVDA", "A", true, 8.7, 10),
  row("ZZZ", "A", true, null, 5), row("META", "A", true, 5.8, 9.5),
  row("QQQM", "A", true, 40, 50, true), row("BBB", "A", false, null, 5),
], policy: out.policy };
var inpMix = { positions: [{ ticker: "QQQM", marketValue: 2000000 }, { ticker: "NVDA", marketValue: 435000 },
  { ticker: "META", marketValue: 291000 }, { ticker: "ZZZ", marketValue: 0 }],
  gross: 5000000, flagSum: 2726000, cashBaht: 1435000 };
mod.setView("all");
var ordMix = tableOrder(mod.sectionCurrent(outMix, inpMix));
ok("เรียง: 3 ตัวแรกคือตัวที่มีมูลค่า", ordMix.slice(0, 3).join(",") === "QQQM,NVDA,META", ordMix.join(","));
ok("เรียง: ตัวไม่มีมูลค่าไปท้าย เรียงชื่อ", ordMix.slice(3).join(",") === "AAA,BBB,ZZZ", ordMix.slice(3).join(","));

// ======== เคสขอบ ========
// 1) ชิ้นเดียวเต็มวง → arc path วาดไม่ได้ ต้อง fallback เป็น circle
var full = mod.pieSvg([{ label: "ONE", pct: 100, color: "#34d399" }], "100%", "x");
ok("edge เต็มวง: ใช้ <circle> ไม่ใช่ arc", full.indexOf("<circle") >= 0 && full.indexOf('<path d="M') < 0);
ok("edge เต็มวง: ไม่มี NaN", full.indexOf("NaN") < 0);
// 2) ผลรวม 0 / ไม่มีข้อมูล
ok("edge ผลรวม 0: คืนค่าว่าง", mod.pieSvg([{ label: "A", pct: 0, color: "#fff" }], null, null) === "");
ok("edge ไม่มีชิ้น: คืนค่าว่าง", mod.pieSvg([], null, null) === "");
// 3) ไม่มีมูลค่าเลย → ไม่วาด pie แต่ต้องไม่ crash
var outEmpty = { allocationRows: [row("QQQM", "A", true, null, 50, true), row("NVDA", "A", false, null, 10)], policy: out.policy };
var hZero = mod.sectionCurrent(outEmpty, { positions: [], gross: null, flagSum: null, cashBaht: null });
ok("edge ฐาน 0: ขึ้นข้อความแทน pie", hZero.indexOf("pm-pie-none") >= 0);
ok("edge ฐาน 0: ไม่มี NaN/Infinity", hZero.indexOf("NaN") < 0 && hZero.indexOf("Infinity") < 0);
// 4) หุ้นตัวเดียว + ไม่มี index/เงินสด
var out1 = { allocationRows: [row("NVDA", "A", true, 100, 10)], policy: { indexTicker: "QQQM", indexPct: 50 } };
var h1 = mod.sectionCurrent(out1, { positions: [{ ticker: "NVDA", marketValue: 100000 }], gross: 100000, flagSum: 100000, cashBaht: null });
ok("edge หุ้นเดียว: วาดได้ ไม่มี NaN", h1.indexOf("NaN") < 0 && h1.indexOf("pm-pie-wrap") >= 0);
ok("edge หุ้นเดียว: เต็มวงใช้ circle", h1.indexOf("<circle") >= 0);
// 5) หุ้นเกิน 10 ตัว → สีหมุนวน ไม่พัง
var many = [row("QQQM", "A", true, 20, 50, true)], mvMany = { QQQM: 200000 };
for (var k = 0; k < 13; k++) { var tk = "S" + k; many.push(row(tk, "A", true, 1, 1)); mvMany[tk] = 10000; }
var hMany = mod.sectionCurrent({ allocationRows: many, policy: out.policy },
  { positions: Object.keys(mvMany).map(function (t) { return { ticker: t, marketValue: mvMany[t] }; }), gross: 330000, flagSum: 330000, cashBaht: 0 });
ok("edge 13 หุ้น: สีวนได้ ไม่มี undefined", hMany.indexOf("undefined") < 0 && hMany.indexOf("NaN") < 0);
ok("edge 13 หุ้น: pie มี 14 ชิ้น", pieSlices(hMany).length === 14, pieSlices(hMany).length);

console.log((fail ? "✗ FAIL" : "✓ PASS") + " — pm-view-test: " + pass + " ผ่าน, " + fail + " ไม่ผ่าน");
process.exit(fail ? 1 : 0);
