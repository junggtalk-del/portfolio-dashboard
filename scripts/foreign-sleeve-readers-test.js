"use strict";
// ============================================================
// หุ้นต่างประเทศยึดหน้า AI Portfolio Manager — ผู้อ่านตัวเลขปัจจุบันบน Home (Mission Control) และ Action Center
//   node scripts/foreign-sleeve-readers-test.js
//
// สองหน้านี้ไม่มีชุดเทสต์ของตัวเอง และการรันทั้งหน้าใน VM ต้องจำลอง DOM / MarketRegime / engine อีกหลายตัว
// → ดึงฟังก์ชันจริงออกจากซอร์ส (แบบ quarterly-editor-save-test.js ดึงจาก app.js — แก้หน้าแล้วเทสต์ตามทันที)
//   แล้วรันใน sandbox ที่โหลด foreign-sleeve.js + portfolio-core.js ตัวจริง
//   Mission Control: Q_TYPES · fin · esc · quarterlyPortfolio · fourAssetStrip · portfolioSection
//   Action Center : holdingsFromSnapshot · computeQuarterlyBuckets (+ state.snapshot / core ของหน้า)
// spec: docs/superpowers/specs/2026-11-09-pm-foreign-sleeve-design.md §3 (Home/Mission Control · Action Center)
// ============================================================
var fs = require("fs"), path = require("path"), vm = require("vm");
var PUB = path.join(__dirname, "..", "public");

var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; console.log("  ✓ " + name); return; }
  fail++;
  console.log("  ✗ " + name + (extra !== undefined ? "  → " + JSON.stringify(extra) : ""));
}
function finish() {
  console.log("");
  console.log(pass + fail + " checks · " + pass + " passed · " + fail + " failed");
  process.exit(fail ? 1 : 0);
}
function read(name) { return fs.readFileSync(path.join(PUB, name), "utf8"); }

// ดึงประกาศระดับ IIFE ของหน้า: บรรทัดที่ตรง startRe ถึงบรรทัด "<ย่อหน้าเดิม>}" (หรือ "};") ตัวถัดไป
//   ประกาศบรรทัดเดียว (เช่น function esc(v) { ... }) = คืนบรรทัดนั้น
function grab(src, startRe, label) {
  var m = startRe.exec(src);
  if (!m) throw new Error("ไม่เจอ " + label);
  var at = m.index + (m[0].charAt(0) === "\n" ? 1 : 0);   // startRe ขึ้นต้นด้วย \n — ตัวบรรทัดเริ่มถัดจากนั้น
  var lineStart = src.lastIndexOf("\n", at - 1) + 1;
  var lineEnd = src.indexOf("\n", at);
  if (lineEnd < 0) lineEnd = src.length;
  var first = src.slice(lineStart, lineEnd).replace(/\r$/, "");
  var indent = /^[ \t]*/.exec(first)[0];
  var opens = (first.match(/\{/g) || []).length, closes = (first.match(/\}/g) || []).length;
  if (opens > 0 && opens === closes) return first + "\n";
  var endRe = new RegExp("\\r?\\n" + indent + "\\};?[ \\t]*(?=\\r?\\n)", "g");
  endRe.lastIndex = lineEnd;
  var e = endRe.exec(src);
  if (!e) throw new Error("หาจุดจบของ " + label + " ไม่เจอ");
  return src.slice(lineStart, e.index + e[0].length) + "\n";
}
function fnRe(name) { return new RegExp("\\n[ \\t]*function " + name + "\\("); }
function constRe(name) { return new RegExp("\\n[ \\t]*const " + name + " = "); }

// sandbox ที่มี window = ตัวมันเอง + foreign-sleeve.js (+ portfolio-core.js) ตัวจริง
function sandbox(extra) {
  var ctx = {
    console: console, Math: Math, JSON: JSON, Date: Date, Number: Number, String: String, Object: Object, Array: Array,
    Boolean: Boolean, isFinite: isFinite, isNaN: isNaN, Map: Map, Set: Set, RegExp: RegExp, Error: Error,
    localStorage: { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} }
  };
  Object.keys(extra || {}).forEach(function (k) { ctx[k] = extra[k]; });
  ctx.window = ctx;
  vm.createContext(ctx);
  return ctx;
}
function load(ctx, file) { vm.runInContext(read(file), ctx, { filename: file }); }

// ---------- fixture (ชุดเดียวกับ allocation-card-test โหมด pm) ----------
function A(type, name, value, inv) { return { type: type, name: name, manualValue: value, snapshotValue: value, investedPercent: inv }; }
function clone(x) { return JSON.parse(JSON.stringify(x)); }
function docOf(cash) {
  var d = { currentQuarter: "2026-Q3", quarters: {
    "2026-Q2": { key: "2026-Q2", assets: [A("bitcoin", "Bitcoin", 9000000, 78), A("foreign-stock", "US", 3500000, 90), A("cash", "เงินสด", 2100000, 0)] },
    "2026-Q3": { key: "2026-Q3", assets: [
      A("bitcoin", "Bitcoin", 10000000, 78),
      A("foreign-stock", "US", 2500000, 90),
      A("foreign-stock", "US-ETF", 1500000, 90),
      A("provident-fund", "PVD", 1000000, 100),
      A("rmf-jang", "RMF-จัง", 1500000, 100),
      A("rmf-tum", "RMF-ตุ๋ม", 1400000, 100),
      A("thai-stock", "หุ้นไทย", 4500000, 88),
      A("cash", "เงินสด", 2100000, 0),
      A("custom", "อื่นๆ", 500000, 100)
    ] } } };
  if (cash != null) d.foreignSleeve = { cash: cash, updatedAt: "2026-11-09T01:00:00.000Z" };
  return d;
}
// หุ้นต่างประเทศที่ถือ 4.2 ล้าน (NVDA 2.0 + QQQM 2.2) · BTCUSD / PTT.BK / AMD (ไม่ได้ถือ) ต้องไม่ถูกนับ
var HOLD = [
  { canonicalSymbol: "NVDA", isHolding: true, marketValue: 2000000, portfolioBucket: "" },
  { canonicalSymbol: "QQQM", isHolding: true, marketValue: 2200000, portfolioBucket: "" },
  { canonicalSymbol: "BTCUSD", isHolding: true, marketValue: 7800000, portfolioBucket: "" },
  { canonicalSymbol: "PTT.BK", isHolding: true, marketValue: 3960000, portfolioBucket: "" },
  { canonicalSymbol: "AMD", isHolding: false, marketValue: 900000, portfolioBucket: "" }
];
var SRC_TH = "หุ้นต่างประเทศจาก AI Portfolio Manager";
var ADVISORY = /ควรซื้อ|ควรขาย|น่าซื้อ|น่าขาย|น่าเข้า|แนะนำซื้อ|จุดเข้า|ตัดขาดทุน|\bBuy\b|\bSell\b/;
function digits(s) { return String(s).replace(/[^0-9]/g, ""); }

// ============================================================ Mission Control (Home)
console.log("== Mission Control · quarterlyPortfolio ==");
var MC_SRC = read("mission-control-page.js");
var MC_CODE;
try {
  MC_CODE = [
    grab(MC_SRC, constRe("Q_TYPES"), "Q_TYPES"),
    grab(MC_SRC, fnRe("fin"), "fin"),
    grab(MC_SRC, fnRe("esc"), "esc"),
    grab(MC_SRC, fnRe("quarterlyPortfolio"), "quarterlyPortfolio"),
    grab(MC_SRC, fnRe("fourAssetStrip"), "fourAssetStrip"),
    grab(MC_SRC, fnRe("portfolioSection"), "portfolioSection")
  ].join("\n");
} catch (e) {
  t("ดึงฟังก์ชันจาก mission-control-page.js ได้", false, e.message);
  finish();
}
// snap = สิ่งที่ PortfolioDataSnapshot.read() คืน · qp = qpCache (ผล GET /api/portfolio สด · null = ยังไม่ได้)
function mc(snap, qp) {
  var ctx = sandbox({ qpCache: qp || null, snapshot: function () { return snap; } });
  load(ctx, "foreign-sleeve.js");
  vm.runInContext(MC_CODE, ctx, { filename: "mission-control-page.js (extracted)" });
  return ctx;
}
function byType(P, type) { return P && P.byType.filter(function (g) { return g.type === type; })[0] || null; }

// pm: GET สด (qpCache) มี foreignSleeve.cash 600,000 + holdings ใน snapshot ของหน้า → หุ้นต่างประเทศ 4.8 ล้าน (ลงทุน 4.2)
var mcQp = { data: docOf(600000) }, mcQpJson = JSON.stringify(mcQp);
var mcSnap = { portfolioStatus: { data: docOf(null) }, portfolioHoldings: { data: clone(HOLD) } };
var mcPm = mc(mcSnap, mcQp);
var P1 = mcPm.quarterlyPortfolio(), f1 = byType(P1, "foreign-stock");
t("pm: มูลค่ารวม = 25,000,000 − 4,000,000 + 4,800,000 = 25,800,000 · หุ้นต่างประเทศ gross 4.8 ล้าน · ลงทุน 4.2 ล้าน (87.5%) · ธง foreignFromPM",
  !!P1 && P1.total === 25800000 && !!f1 && f1.gross === 4800000 && Math.round(f1.invested) === 4200000 && f1.investedPct === 87.5 && P1.foreignFromPM === true,
  P1 && [P1.total, f1 && [f1.gross, f1.invested, f1.investedPct], P1.foreignFromPM]);
var H1 = mcPm.portfolioSection();
t("pm: การ์ด 💼 พอร์ตเป็นไง แสดง ฿25,800,000 และบอกว่าหุ้นต่างประเทศมาจาก AI Portfolio Manager (ข้อความไม่มีคำแนะนำซื้อขาย)",
  digits((/<small>มูลค่ารวม<\/small><strong>([^<]*)<\/strong>/.exec(H1) || ["", ""])[1]) === "25800000" &&
  /<span class="mc-sub">[^<]*· หุ้นต่างประเทศจาก AI Portfolio Manager<\/span>/.test(H1) && !ADVISORY.test(H1),
  (/<span class="mc-sub">[^<]*<\/span>/.exec(H1) || [""])[0]);
t("pm: เอกสารจาก GET สดไม่ถูกแก้ (สำเนาเท่านั้น)", JSON.stringify(mcQp) === mcQpJson);

// pm ผ่าน snapshot (ยังไม่ได้ GET สด): เอกสารใน snapshot มี cash → ใช้ holdings ใน snapshot เดียวกัน
var mcSnap2 = { portfolioStatus: { data: docOf(600000) }, portfolioHoldings: { data: clone(HOLD) } };
var P2 = mc(mcSnap2, null).quarterlyPortfolio();
t("pm ผ่าน snapshot.portfolioStatus (qpCache ว่าง) → 25,800,000 เหมือนกัน", !!P2 && P2.total === 25800000 && P2.foreignFromPM === true, P2 && P2.total);

// editor: ยังไม่กรอกเงินสด / holdings ว่าง → ตัวเลข Editor เดิม ไม่มีป้าย
var P3 = mc({ portfolioStatus: { data: docOf(null) }, portfolioHoldings: { data: clone(HOLD) } }, null).quarterlyPortfolio();
var mcE = mc({ portfolioStatus: { data: docOf(600000) }, portfolioHoldings: { data: [] } }, null);
var P4 = mcE.quarterlyPortfolio(), H4 = mcE.portfolioSection();
t("editor: ไม่มี foreignSleeve.cash → 25,000,000 · หุ้นต่างประเทศ 4.0 ล้าน (2 แถวใน Editor) · ไม่มีธง",
  !!P3 && P3.total === 25000000 && byType(P3, "foreign-stock").gross === 4000000 && P3.foreignFromPM === false, P3 && P3.total);
t("editor: มี cash แต่ holdings ว่าง → 25,000,000 · การ์ดไม่มีป้าย AI Portfolio Manager",
  !!P4 && P4.total === 25000000 && P4.foreignFromPM === false && H4.indexOf("AI Portfolio Manager") < 0 && digits((/<small>มูลค่ารวม<\/small><strong>([^<]*)<\/strong>/.exec(H4) || ["", ""])[1]) === "25000000",
  P4 && P4.total);
// ไม่มีโมดูล ForeignSleeve บนหน้า (โหลดไม่สำเร็จ) → พฤติกรรมเดิม ไม่ throw
var mcNo = sandbox({ qpCache: { data: docOf(600000) }, snapshot: function () { return { portfolioHoldings: { data: clone(HOLD) } }; } });
vm.runInContext(MC_CODE, mcNo, { filename: "mission-control-page.js (extracted)" });
var P5 = mcNo.quarterlyPortfolio();
t("ไม่มี window.ForeignSleeve → 25,000,000 ตาม Editor (ไม่ throw)", !!P5 && P5.total === 25000000 && P5.foreignFromPM === false, P5 && P5.total);

// ---------- final fix wave [3]: จำนวนรายการ + คำเตือนกระจุกตัว · [2]: ไม่มีเงินใน title ----------
// จำนวนรายการ = แถวของ Editor เอง (9 — แบบ editorCount ของ /portfolio) ไม่ใช่ 8 แถวที่วาด (หุ้นต่างประเทศ 2 แถวรวมเป็น 1)
function countOf(H) { return (/<small>สินทรัพย์<\/small><strong>([^<]*)<\/strong>/.exec(H) || ["", ""])[1]; }
t("pm: สินทรัพย์ 9 รายการ (แถวของ Editor) แม้วาด 8 แถว · editor: 9 รายการเหมือนเดิม",
  P1.count === 9 && P1.rows.length === 8 && countOf(H1) === "9 รายการ" && P3.count === 9 && P3.rows.length === 9 && countOf(H4) === "9 รายการ",
  [P1.count, P1.rows.length, countOf(H1), P3.count, countOf(H4)]);
// คำเตือนกระจุกตัวข้ามแถว fromPM: หุ้นที่ถือ NVDA 20 ล้าน → แถวรวมจาก PM 20 + 2.2 + 0.6 = 22.8 ล้าน / 43.8 ล้าน ≈ 52% (หุ้นหลายตัวรวมกัน)
//   → ไม่เตือน · ตัวถัดไป Bitcoin 10 / 43.8 ≈ 23% ไม่เกิน 40%
var BIG_HOLD = clone(HOLD); BIG_HOLD[0].marketValue = 20000000;
var mcBig = mc({ portfolioStatus: { data: docOf(600000) }, portfolioHoldings: { data: BIG_HOLD } }, null);
var PB = mcBig.quarterlyPortfolio(), HB = mcBig.portfolioSection();
t("pm: แถวหุ้นต่างประเทศจาก PM ใหญ่สุด 52% (fromPM) → ไม่มี ⚠ กระจุกตัว",
  !!PB && PB.total === 43800000 && PB.rows[0].fromPM === true && PB.rows[0].pct > 40 && HB.indexOf("กระจุกตัว") < 0,
  PB && [PB.total, PB.rows[0].name, PB.rows[0].pct, (/mcx-pf-warn[^<]*/.exec(HB) || [""])[0]]);
// แถวของ Editor ที่เกิน 40% ยังเตือนตามเดิมในโหมด pm: Bitcoin 30 ล้าน / 45.8 ล้าน ≈ 66%
var BTC_DOC = docOf(600000); BTC_DOC.quarters["2026-Q3"].assets[0] = A("bitcoin", "Bitcoin", 30000000, 78);
var HBtc = mc({ portfolioStatus: { data: BTC_DOC }, portfolioHoldings: { data: clone(HOLD) } }, null).portfolioSection();
t("pm: แถว Editor (Bitcoin 66%) ยังขึ้น ⚠ กระจุกตัว: Bitcoin 66%", /⚠ กระจุกตัว: Bitcoin 66%/.test(HBtc), (/mcx-pf-warn[^<]*/.exec(HBtc) || [""])[0]);
// title ทุกตัวในการ์ดพอร์ต: ไม่มี ฿ และตัวเลขทุกตัวเป็น % (ไม่มียอดเงินดิบ) — ทั้งโหมด pm / editor / แถวรวมใหญ่
function titlesOf(H) { var out = [], re = /\stitle="([^"]*)"/g, m; while ((m = re.exec(H)) !== null) out.push(m[1]); return out; }
function moneyFreeTitle(s) { return s.indexOf("฿") < 0 && !/[0-9]/.test(s.replace(/[0-9]+(\.[0-9]+)?%/g, "")); }
var allTitles = titlesOf(H1).concat(titlesOf(H4), titlesOf(HB), titlesOf(HBtc));
t("การ์ดพอร์ต (Home): title มีแต่ชื่อ + % — ไม่มี ฿ ไม่มียอดเงิน (" + allTitles.length + " title)",
  allTitles.length >= 8 && allTitles.every(moneyFreeTitle) && titlesOf(H1).some(function (s) { return /^ลงทุน [0-9]+% · เงินสด [0-9]+%$/.test(s); }),
  allTitles.filter(function (s) { return !moneyFreeTitle(s); }));

// ============================================================ Action Center
console.log("== Action Center · computeQuarterlyBuckets ==");
var AC_SRC = read("action-center-page.js");
var AC_CODE;
try {
  AC_CODE = [
    "const core = window.PortfolioCore || {};",
    grab(AC_SRC, fnRe("holdingsFromSnapshot"), "holdingsFromSnapshot"),
    grab(AC_SRC, fnRe("computeQuarterlyBuckets"), "computeQuarterlyBuckets")
  ].join("\n");
} catch (e) {
  t("ดึงฟังก์ชันจาก action-center-page.js ได้", false, e.message);
  finish();
}
function ac(snapshot, withSleeve) {
  var ctx = sandbox({ state: { snapshot: snapshot } });
  load(ctx, "portfolio-core.js");
  if (withSleeve !== false) load(ctx, "foreign-sleeve.js");
  vm.runInContext(AC_CODE, ctx, { filename: "action-center-page.js (extracted)" });
  return ctx.computeQuarterlyBuckets();
}
var acSnap = { portfolioStatus: { data: docOf(600000) }, portfolioHoldings: { data: clone(HOLD) } }, acSnapJson = JSON.stringify(acSnap);
var B1 = ac(acSnap);
t("pm: ฐาน % ของ foreign-stock = 4.8 ล้าน (หุ้นที่ถือ 4.2 + เงินสด 0.6 — ตัวเดียวกับหน้า PM) · bucket อื่นตาม Editor เดิม",
  B1["foreign-stock"] === 4800000 && B1.bitcoin === 10000000 && B1["thai-stock"] === 4500000 && B1.cash === 2100000, B1);
t("pm: snapshot ของหน้าไม่ถูกแก้", JSON.stringify(acSnap) === acSnapJson);
// holdings ซ้ำ (NVDA สองแถว) → holdingsFromSnapshot (dedupeHoldings) นับครั้งเดียว เหมือนหน้า PM
var dupHold = clone(HOLD).concat([{ canonicalSymbol: "NVDA", isHolding: true, marketValue: 2000000, portfolioBucket: "" }]);
var B2 = ac({ portfolioStatus: { data: docOf(600000) }, portfolioHoldings: { data: dupHold } });
t("pm: holdings มาจาก holdingsFromSnapshot (dedupe) — NVDA ซ้ำนับครั้งเดียว → 4.8 ล้าน ไม่ใช่ 6.8", B2["foreign-stock"] === 4800000, B2["foreign-stock"]);
var B3 = ac({ portfolioStatus: { data: docOf(null) }, portfolioHoldings: { data: clone(HOLD) } });
var B4 = ac({ portfolioStatus: { data: docOf(600000) }, portfolioHoldings: { data: [] } });
var B5 = ac({ portfolioStatus: { data: docOf(600000) }, portfolioHoldings: { data: clone(HOLD) } }, false);
t("editor: ไม่มี cash / holdings ว่าง / ไม่มีโมดูล → foreign-stock 4.0 ล้าน ตาม Editor (2 แถวรวมกัน)",
  B3["foreign-stock"] === 4000000 && B4["foreign-stock"] === 4000000 && B5["foreign-stock"] === 4000000, [B3["foreign-stock"], B4["foreign-stock"], B5["foreign-stock"]]);

// ============================================================ ซอร์ส + เวอร์ชัน
console.log("== ซอร์ส ==");
t("โค้ดที่เพิ่มไม่มีคำแนะนำซื้อขาย (รวมคอมเมนต์ในฟังก์ชันที่แก้)",
  !ADVISORY.test(grab(MC_SRC, fnRe("quarterlyPortfolio"), "q") + grab(MC_SRC, fnRe("portfolioSection"), "p") + grab(AC_SRC, fnRe("computeQuarterlyBuckets"), "c")));
t("home.html โหลด mission-control-page.js?v=20261109-mc2-18 (final fix wave) · action-center.html โหลด action-center-page.js?v=20261109-zones-15",
  /\/mission-control-page\.js\?v=20261109-mc2-18"/.test(read("home.html")) && /\/action-center-page\.js\?v=20261109-zones-15"/.test(read("action-center.html")));

finish();
