"use strict";
// ============================================================
// AI PORTFOLIO MANAGER (/portfolio-manager) — การ์ดแก้ว (glass-cards.css)
//   node scripts/pm-glass-test.js
//
// วาดทุก section ของ portfolio-manager-page.js (ตัดที่ anchor bootstrap แบบ pm-view-test) แล้วล็อก:
//   · การ์ด → สถานะต้นทาง → tone (สถานะที่หน้าคำนวณอยู่แล้วเท่านั้น):
//       Overall Recommendation (.pm-hero-main)   ACTIONS.tone  bull → calm · neutral → normal · watch → warning · bear → danger
//       Portfolio Health (pm-stat ที่ 4)          overview.health.key  strong → calm · moderate → normal · weak → danger · unknown → neutral
//       Portfolio Value / เงินสด / Thesis Score     ไม่มีสถานะของตัวเอง → neutral
//       Accumulation card (.pm-card) · Position Manager card (.pm-mgr)
//                                                  Zone หลัง safety gate  A/B → calm · C → normal · D → warning · E → danger
//       Cash Deployment (.pm-dep)                  มีเงินก้อนถัดไป → calm (ตัวแรกโดน gate → warning) · ยังไม่มี entry trigger → neutral
//       Risk rule (.pm-rule)                       active (ACTIVE) → danger · ไม่ active (PASS) → calm
//       Current Portfolio · แถบนับ Zone · Master Position Size · ข้อความวิธีคิด · ข้อความว่าง → neutral
//   · ไม่มีการ์ดแก้วซ้อนการ์ดแก้ว · หัว section อยู่บนพื้นหน้า (gc-section-h)
//   · ชิ้นกลาง: ตาราง gc-table ใน gc-table-wrap (โฟกัสได้ + aria-label ไม่มีเงิน) · ช่องกรอก gc-field · ปุ่ม gc-btn / gc-btn-ghost ·
//     ตัวเลข gc-num · ป้าย gc-pill · <th> ยังเปล่า (pm-view-test / pm-no-target-test อ่าน <th> ตรง ๆ)
//   · Privacy Lock: maskText ของ privacy.js ทุก text node (ยกเว้นในกล่อง data-pv-skip แบบตัวจริง) แล้วไม่เหลือยอดเงิน ·
//     ไม่มีเงินใน title / aria-label · ช่องเงินสดตอนล็อก = ว่าง + placeholder และยังเป็น gc-field
//   · CSS: โทเคน mc ในการ์ด = หมึกแก้ว · ผิวการ์ด/ปุ่ม/ช่องเก่าถูกลบ (glass-cards.css วาดแทน) · สีตัวหนังสือบนแก้วสว่างพอ ·
//     การ์ดที่มีข้อความปน inline เป็น block · เวอร์ชัน bump · ลำดับ stylesheet
// ============================================================
var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
var PUB = path.join(ROOT, "public");
function read(f) { return fs.readFileSync(path.join(PUB, f), "utf8"); }
var maskText = require("../public/privacy.js").maskText;
var PM = require("../public/portfolio-manager-engine.js");
var TE = require("../public/thesis-engine.js");
var TD = require("../public/thesis-data.js");

var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; return; }
  fail++;
  console.error("  ✗ " + name + (extra !== undefined ? "  → " + JSON.stringify(extra) : ""));
}
function finish() {
  console.log("");
  console.log(pass + fail + " checks · " + pass + " passed · " + fail + " failed");
  process.exit(fail ? 1 : 0);
}

var TONES = ["gc-calm", "gc-normal", "gc-warning", "gc-danger", "gc-neutral"];

// ---------------------------------------------------------------- harness (ตัดที่ anchor เดียวกับ pm-view-test)
var SRC = read("portfolio-manager-page.js");
var CUT = "  // ธงแดง/มูลค่าเปลี่ยนจาก Action Center";
if (SRC.indexOf(CUT) < 0) throw new Error("anchor bootstrap หาย — harness ต้องอัปเดต");
var body = SRC.slice(0, SRC.indexOf(CUT)).replace(/^\(function \(\) \{/, "");
body += [
  "",
  "  return {",
  "    S: { overview: sectionOverview, current: sectionCurrent, zones: sectionZones, deployment: sectionDeployment,",
  "         manager: sectionManager, risk: sectionRisk, method: sectionMethod },",
  "    render: render, cashUi: cashUi, bind: bind,",
  "    setView: function (v) { writeJson(CVIEW_STORE, v); },",
  "    setIntel: function (m) { intelMap = m; }",
  "  };",
  ""
].join("\n");

var store = {};
var PV = { locked: false, isLocked: function () { return this.locked; } };
var rootEl = { innerHTML: "", querySelectorAll: function () { return []; }, contains: function () { return false; } };
var SNAPSHOT = null;
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
  setItem: function (k, v) { store[k] = String(v); },
  removeItem: function (k) { delete store[k]; }
};
global.window = {
  ThesisData: TD, PMEngine: PM, ThesisEngine: TE, PortfolioPrivacy: PV, addEventListener: function () {},
  PortfolioDataSnapshot: { read: function () { return SNAPSHOT; } }
};
global.document = {
  readyState: "complete", activeElement: null, addEventListener: function () {},
  getElementById: function (id) { return id === "pmRoot" ? rootEl : null; }
};
var mod = new Function(body)();
var S = mod.S;

// ---------------------------------------------------------------- HTML parser (stack · ปิดแท็กที่ค้าง เช่น <option> ใน datalist)
var VOID = { area: 1, base: 1, br: 1, col: 1, embed: 1, hr: 1, img: 1, input: 1, link: 1, meta: 1, source: 1, track: 1, wbr: 1 };
function classOf(tag) { var m = /\sclass="([^"]*)"/.exec(tag); return m ? m[1].split(/\s+/).filter(Boolean) : []; }
function parse(h) {
  var re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g, m, stack = [], all = [];
  while ((m = re.exec(h)) !== null) {
    var tag = m[2].toLowerCase();
    if (m[1]) {
      for (var i = stack.length - 1; i >= 0; i--) {
        if (stack[i].tag !== tag) continue;
        for (var j = stack.length - 1; j > i; j--) stack[j].end = m.index;
        stack[i].end = re.lastIndex;
        stack.length = i;
        break;
      }
      continue;
    }
    var el = { tag: tag, open: m[0], start: m.index, cls: classOf(m[0]), parent: stack.length ? stack[stack.length - 1] : null, end: h.length };
    all.push(el);
    if (!(/\/$/.test(m[3]) || VOID[tag])) stack.push(el);
  }
  all.forEach(function (e) { e.outer = h.slice(e.start, e.end); });
  return all;
}
function has(el, c) { return el.cls.indexOf(c) >= 0; }
function byClass(h, c) { return parse(h).filter(function (e) { return has(e, c); }); }
function first(h, c) { return byClass(h, c)[0] || null; }
function toneOf(el) {
  if (!el) return "(no element)";
  var tn = el.cls.filter(function (c) { return TONES.indexOf(c) >= 0; });
  return has(el, "gc-card") && tn.length === 1 ? tn[0] : "(" + el.cls.join(" ") + ")";
}
function glassAncestor(el) { for (var p = el.parent; p; p = p.parent) if (has(p, "gc-card")) return p; return null; }
function attrsOf(h, name) { var out = [], re = new RegExp("\\s" + name + "=\"([^\"]*)\"", "g"), m; while ((m = re.exec(h)) !== null) out.push(m[1]); return out; }
function attr(tag, name) { var m = new RegExp("\\s" + name + "=\"([^\"]*)\"").exec(tag); return m ? m[1] : null; }
var MONEY_NUM = /\d{1,3}(?:,\d{3})+/;

// ---------------------------------------------------------------- fixtures
var Z = PM.ZONES, ACT = PM.ACTIONS;
function ladder() {
  return [
    { n: 1, title: "Entry 1", completed: true, triggered: true, blocked: false, why: "ทำแล้ว", rule: "ฐาน" },
    { n: 2, title: "Entry 2", completed: false, triggered: true, blocked: false, why: "ราคาย่อ", rule: "ย่อ −10%" },
    { n: 3, title: "Entry 3", completed: false, triggered: false, blocked: false, why: "ยังไม่ถึง", rule: "ย่อ −20%" },
    { n: 4, title: "Entry 4", completed: false, triggered: false, blocked: true, why: "ปิด", rule: "ย่อ −30%" }
  ];
}
function row(ticker, zk, o) {
  o = o || {};
  return {
    ticker: ticker, name: ticker + " Inc.", covered: true, held: o.held !== false, isIndex: !!o.isIndex,
    zone: Z[zk], accScore: o.score == null ? 70 : o.score, zoneWhy: ["เหตุผล " + zk], stale: !!o.stale,
    acc: { parts: [{ key: "thesis", label: "Thesis", weight: 40, value: 80 }, { key: "timing", label: "Timing", weight: 20, value: 35 }, { key: "valuation", label: "Valuation", weight: 15, value: null }] },
    why: [{ ok: true, txt: "ผ่าน" }, { ok: false, txt: "ยังไม่ผ่าน" }],
    ladder: ladder(), weightPct: o.w == null ? 5 : o.w, tier: { key: o.tier || "A" },
    action: o.action || ACT.wait, techConflict: !!o.tech, techConflictWhy: o.tech ? "เทคนิคยังสวน" : null
  };
}
function ovOut(recKey, healthKey, stance) {
  var H = { strong: "แข็งแรง", moderate: "ปานกลาง", weak: "เปราะบาง", unknown: "ยังประเมินไม่ได้" };
  return { megaStance: stance || "bullish", overview: { recommendation: ACT[recKey], recommendationWhy: "เพราะ " + recKey, score: healthKey === "unknown" ? null : 72,
    health: { key: healthKey, label: H[healthKey], why: "คะแนนเฉลี่ย" } } };
}
// ตัวเลขเงินทุกตัวมี ≥ 4 หลัก (มีคอมม่า) — จับได้ด้วย MONEY_NUM
var INP = { cashSource: "pm", gross: 5000000, flagSum: 3565000, cashBaht: 1435000, cashPct: 28.7, investedPct: 71.3, cashEntered: 1435000, cashReason: null,
  positions: [{ ticker: "QQQM", marketValue: 2000000 }, { ticker: "NVDA", marketValue: 435000 }, { ticker: "META", marketValue: 291000 }, { ticker: "GOOG", marketValue: 168000, dual: true }] };
var INP_ED = { cashSource: "editor", gross: null, flagSum: 2894000, cashBaht: null, cashPct: null, investedPct: null, cashEntered: null, cashReason: "no-cash", positions: INP.positions };
function curOut(rows) { return { allocationRows: rows, policy: { indexTicker: "QQQM", indexPct: 50 } }; }
var CUR_ROWS = [row("QQQM", "D", { isIndex: true, w: 40 }), row("NVDA", "B", { w: 8.7, action: ACT.increase, tech: true }), row("META", "E", { w: 5.8, action: ACT.review }),
  row("GOOG", "C", { w: 3.4, action: ACT.maintain }), row("AMZN", "A", { held: false, w: null })];
function depOut(items) { return { deployment: { items: items, cashReserveFinal: 40, reserveWhy: ["reserve ฐาน 20%"], scaled: false, deployable: 60 } }; }
var DEP_ITEMS = [{ ticker: "NVDA", pctOfCash: 30, why: "Entry 2 trigger", halved: false }, { ticker: "META", pctOfCash: 30, why: "Entry 1", halved: true }];
function gateFor(ticker, zoneKey) {
  var m = {};
  m[ticker] = { intel: { health: { state: { key: "BROKEN", icon: "⛔", label: "BROKEN", thai: "หลักฐานพัง" }, pillars: [{ status: "crit", label: "Revenue", evidence: "ชะลอ 2 ไตรมาส" }] } },
    gate: { overridden: true, zoneKey: zoneKey, why: "Thesis Health BROKEN → บังคับ Zone " + zoneKey } };
  return m;
}
var TIER_DEFS = { A: { key: "A", label: "Tier A — Core", min: 5, max: 20 }, B: { key: "B", label: "Tier B — Infra", min: 2, max: 10 }, C: { key: "C", label: "Tier C — Satellite", min: 0, max: 5 } };

// ================================================================ 1 · การ์ด → สถานะต้นทาง → tone
console.log("== 1 · การ์ด → สถานะต้นทาง → tone ==");
mod.setIntel(null);
// Overall Recommendation
[["increase", "gc-calm"], ["maintain", "gc-normal"], ["wait", "gc-warning"], ["review", "gc-danger"]].forEach(function (c) {
  var h = S.overview(ovOut(c[0], "moderate"), INP);
  t("Overall Recommendation (.pm-hero-main): " + c[0] + " (tone " + ACT[c[0]].tone + ") → " + c[1], toneOf(first(h, "pm-hero-main")) === c[1], toneOf(first(h, "pm-hero-main")));
});
// Portfolio Health tile + the other 3 tiles
[["strong", "gc-calm"], ["moderate", "gc-normal"], ["weak", "gc-danger"], ["unknown", "gc-neutral"]].forEach(function (c) {
  var h = S.overview(ovOut("maintain", c[0]), INP);
  var tiles = byClass(h, "pm-stat");
  var health = tiles.filter(function (e) { return e.outer.indexOf("Portfolio Health") >= 0; })[0];
  t("Portfolio Health tile: health.key " + c[0] + " → " + c[1] + " (gc-tile)", toneOf(health) === c[1] && has(health, "gc-tile"), toneOf(health));
  var others = tiles.filter(function (e) { return e !== health; });
  t("health " + c[0] + ": Portfolio Value / เงินสด / Thesis Score tiles ไม่มีสถานะของตัวเอง → gc-neutral (×3 gc-tile)",
    tiles.length === 4 && others.length === 3 && others.every(function (e) { return toneOf(e) === "gc-neutral" && has(e, "gc-tile"); }), others.map(toneOf));
});
(function () {
  var h = S.overview(ovOut("wait", "strong", "bearish"), INP_ED);
  t("editor mode (ยังไม่กรอกเงินสด) ยังวาด 4 tiles แก้ว + hero-main", byClass(h, "pm-stat").filter(function (e) { return has(e, "gc-card"); }).length === 4 && toneOf(first(h, "pm-hero-main")) === "gc-warning");
  t(".pm-hero เป็นแค่ที่จัดวาง (ไม่ใช่การ์ด) · .pm-hero-grid คงคลาสเดิมตัวเดียว (pm-cash-test อ่าน class=\"pm-hero-grid\")",
    !has(first(h, "pm-hero"), "gc-card") && h.indexOf('class="pm-hero-grid"') >= 0);
})();

// Accumulation cards (zone after the safety gate)
(function () {
  var rows = ["A", "B", "C", "D", "E"].map(function (k, i) { return row("Z" + k, k, { score: 90 - i * 10 }); });
  var h = S.zones({ rows: rows });
  var EXP = { A: "gc-calm", B: "gc-calm", C: "gc-normal", D: "gc-warning", E: "gc-danger" };
  Object.keys(EXP).forEach(function (k) {
    var card = byClass(h, "pm-card-" + k.toLowerCase()).filter(function (e) { return e.tag === "article"; })[0];
    t("Accumulation card Zone " + k + " (" + Z[k].icon + " " + Z[k].tone + ") → " + EXP[k], toneOf(card) === EXP[k], toneOf(card));
  });
  t("แถบนับ Zone (.pm-strip) ไม่มีสถานะ → gc-card gc-strip gc-neutral", toneOf(first(h, "pm-strip")) === "gc-neutral" && has(first(h, "pm-strip"), "gc-strip"));
  t("ชิปนับ Zone = gc-pill gc-pill-ghost ×5 · ตัวเลขนับ gc-num", byClass(h, "pm-pill").length === 5 && byClass(h, "pm-pill").every(function (e) { return has(e, "gc-pill") && has(e, "gc-pill-ghost") && /<b class="gc-num">\d+<\/b>/.test(e.outer); }));
  t("คะแนนบนการ์ด (pm-score b) = gc-num", byClass(h, "pm-score").every(function (e) { return /<b class="gc-num">/.test(e.outer); }) && byClass(h, "pm-score").length === 5);
  // safety gate: Zone B → E (BROKEN) — card follows the gated zone (same as its chip and class pm-card-e)
  mod.setIntel(gateFor("ZB", "E"));
  var hg = S.zones({ rows: [row("ZB", "B")] });
  var gc = byClass(hg, "pm-card").filter(function (e) { return e.tag === "article"; })[0];
  t("safety gate บังคับ Zone B → E: การ์ด = gc-danger (ตาม zone หลัง gate เหมือนชิป/คลาส pm-card-e)", toneOf(gc) === "gc-danger" && has(gc, "pm-card-e"), toneOf(gc));
  mod.setIntel(null);
})();

// Cash Deployment
(function () {
  var hTop = S.deployment(depOut(DEP_ITEMS), INP);
  t("Cash Deployment: มีเงินก้อนถัดไป (top ไม่โดน gate) → gc-calm", toneOf(first(hTop, "pm-dep")) === "gc-calm", toneOf(first(hTop, "pm-dep")));
  mod.setIntel(gateFor("NVDA", "E"));
  var hGate = S.deployment(depOut(DEP_ITEMS), INP);
  t("Cash Deployment: ตัวแรกโดน safety gate (⛔ ตรวจหลักฐานก่อน) → gc-warning", toneOf(first(hGate, "pm-dep")) === "gc-warning" && hGate.indexOf("⛔") >= 0, toneOf(first(hGate, "pm-dep")));
  mod.setIntel(null);
  var hWait = S.deployment(depOut([]), INP);
  t("Cash Deployment: ยังไม่มี entry trigger (ถือเงินสดรอ 100% · เดิมกล่องเทา) → gc-neutral", toneOf(first(hWait, "pm-dep")) === "gc-neutral" && hWait.indexOf("pm-dep-next-wait") >= 0, toneOf(first(hWait, "pm-dep")));
  t("Cash Deployment: แถวรายตัว / reserve / ข้อความว่าง เป็นช่องในการ์ด ไม่ใช่การ์ดซ้อน",
    [hTop, hWait].every(function (h) { return byClass(h, "gc-card").length === 1; }));
})();

// Position Manager
(function () {
  var rows = ["A", "B", "C", "D", "E"].map(function (k) { return row("M" + k, k); });
  var h = S.manager({ allocationRows: rows, tierDefs: TIER_DEFS });
  var EXP = { A: "gc-calm", B: "gc-calm", C: "gc-normal", D: "gc-warning", E: "gc-danger" };
  var cards = byClass(h, "pm-mgr");
  Object.keys(EXP).forEach(function (k) {
    var card = cards.filter(function (e) { return e.outer.indexOf("/asset/M" + k + '"') >= 0; })[0];
    t("Position Manager card Zone " + k + " → " + EXP[k], toneOf(card) === EXP[k], toneOf(card));
  });
  mod.setIntel(gateFor("MB", "E"));
  var hg = S.manager({ allocationRows: [row("MB", "B")], tierDefs: TIER_DEFS });
  t("Position Manager: safety gate B → E → gc-danger (เหมือนชิป zone ในหัวการ์ด)", toneOf(first(hg, "pm-mgr")) === "gc-danger", toneOf(first(hg, "pm-mgr")));
  mod.setIntel(null);
  t("Master Position Size (tier editor) ไม่มีสถานะ → gc-card gc-neutral ห่อ <details>", toneOf(first(h, "pm-tiercard")) === "gc-neutral" && first(h, "pm-tiercard").outer.indexOf('<details class="pm-details pm-tiercfg">') >= 0);
  var he = S.manager({ allocationRows: [], tierDefs: TIER_DEFS });
  t("Position Manager ว่าง → mc-empty gc-card gc-neutral", toneOf(first(he, "mc-empty")) === "gc-neutral");
  t("ตัวเลขในการ์ด (น้ำหนักปัจจุบัน / Tier) = gc-num", byClass(h, "pm-mnum").length === 10 && byClass(h, "pm-mnum").every(function (e) { return /<b class="gc-num">/.test(e.outer); }));
})();

// Risk rules
(function () {
  var h = S.risk({ risk: [{ n: 1, rule: "Rule A", detail: "d1", active: true }, { n: 2, rule: "Rule B", detail: "d2", active: false }] });
  var rules = byClass(h, "pm-rule");
  t("Risk rule active (ป้าย ACTIVE · เดิมขอบชมพู) → gc-danger", toneOf(rules[0]) === "gc-danger" && has(rules[0], "pm-rule-on"), toneOf(rules[0]));
  t("Risk rule ไม่ active (ป้าย PASS · เดิมป้ายเขียว) → gc-calm", toneOf(rules[1]) === "gc-calm" && has(rules[1], "pm-rule-off"), toneOf(rules[1]));
  t("Risk rule = gc-tile · ป้าย ACTIVE/PASS = gc-pill · กฎอยู่ในกริด .pm-rules", rules.every(function (e) { return has(e, "gc-tile") && /class="pm-rule-badge gc-pill"/.test(e.outer); }) && !!first(h, "pm-rules"));
})();

// Current Portfolio + footer + empty states
(function () {
  mod.setView("all");
  var h = S.current(curOut(CUR_ROWS), INP);
  var card = first(h, "pm-current");
  t("Current Portfolio: ตาราง/pie/ฟอร์มอยู่ในการ์ดเดียว gc-neutral (สีอยู่ที่ชิปของแถว ไม่ใช่ทั้งการ์ด)", toneOf(card) === "gc-neutral" && card.outer.indexOf("pm-pie-wrap") >= 0 && card.outer.indexOf("<table") >= 0 && card.outer.indexOf("pm-addform") >= 0 && card.outer.indexOf("pm-alloccfg") >= 0);
  t("Current Portfolio: ชิป zone / action ของแถวคงคลาสเดิม (pm-zone-x · pm-action pm-bull …)",
    /class="pm-zone pm-zone-b"/.test(h) && /class="pm-zone pm-zone-e"/.test(h) && /class="pm-action pm-bull"/.test(h) && /class="pm-action pm-bear"/.test(h) && /class="pm-action pm-neutral">Reserve/.test(h));
  var he = S.current(curOut([]), INP);
  t("Current Portfolio ว่าง → mc-empty gc-card gc-neutral", toneOf(first(he, "mc-empty")) === "gc-neutral");
  var hf = S.method();
  t("ข้อความวิธีคิด (footer) → gc-card gc-neutral", toneOf(first(hf, "pm-foot")) === "gc-neutral");
})();

// render() states that are not the page
(function () {
  SNAPSHOT = null; rootEl.innerHTML = "";
  mod.render();
  t("render ไม่มี snapshot → mc-empty gc-card gc-neutral", toneOf(first(rootEl.innerHTML, "mc-empty")) === "gc-neutral", rootEl.innerHTML.slice(0, 160));
})();

// ================================================================ 2 · ทั้งหน้าด้วย engine จริง: ทุกการ์ดมี tone เดียว · ไม่ซ้อน · หัว section บนพื้นหน้า
console.log("== 2 · ทั้งหน้า (PMEngine + ThesisEngine + KB จริง) ==");
function P(tk, held, w, tier) { return { ticker: tk, held: held, weightPct: w, tierKey: tier }; }
var OUT = PM.compute({}, { TE: TE, teOpts: { data: TD }, positions: [P("QQQM", true, 40, "A"), P("NVDA", true, 8.7, "A"), P("META", true, 5.8, "A"), P("PLTR", true, 4.7, "C"), P("AMZN", false, 0, "A")],
  cashPct: 28.7, indexTicker: "QQQM", indexPct: 50, splitMethod: "conviction", maxSinglePct: 10, megaStance: "bullish" });
var INP_FULL = { cashSource: "pm", gross: 5000000, flagSum: 2962000, cashBaht: 2038000, cashPct: 40.8, investedPct: 59.2, cashEntered: 2038000, cashReason: null,
  positions: [{ ticker: "QQQM", marketValue: 2000000 }, { ticker: "NVDA", marketValue: 435000 }, { ticker: "META", marketValue: 291000 }, { ticker: "PLTR", marketValue: 236000 }] };
function renderAll(view) {
  mod.setView(view);
  return [S.overview(OUT, INP_FULL), S.current(OUT, INP_FULL), S.zones(OUT), S.deployment(OUT, INP_FULL), S.manager(OUT), S.risk(OUT), S.method()].join("\n");
}
t("engine: compute ได้ผล", OUT.available === true, OUT.reason);
[["all", renderAll("all")], ["stocks", renderAll("stocks")]].forEach(function (p) {
  var h = p[1], els = parse(h);
  var cards = els.filter(function (e) { return has(e, "gc-card"); });
  var bad = cards.filter(function (e) { return TONES.indexOf(toneOf(e)) < 0; });
  t(p[0] + ": การ์ดแก้ว " + cards.length + " ใบ — ทุกใบมี tone เดียว", cards.length >= 15 && bad.length === 0, bad.map(function (e) { return e.cls.join(" "); }).slice(0, 4));
  var nested = cards.filter(function (e) { return glassAncestor(e); });
  t(p[0] + ": ไม่มีการ์ดแก้วซ้อนในการ์ดแก้ว", nested.length === 0, nested.map(function (e) { return e.cls.join(" ") + " ⊂ " + glassAncestor(e).cls.join(" "); }).slice(0, 4));
  var topCards = ["pm-hero-main", "pm-stat", "pm-current", "pm-strip", "pm-card", "pm-dep", "pm-mgr", "pm-tiercard", "pm-rule", "pm-foot"];
  var missing = topCards.filter(function (c) { var l = els.filter(function (e) { return has(e, c) && e.tag !== "span"; }); return !l.length || l.some(function (e) { return !has(e, "gc-card"); }); });
  t(p[0] + ": ทุกการ์ดระดับบน (hero · 4 tiles · Current · แถบนับ · Accumulation · Deployment · Manager · tier · Risk · footer) เป็นแก้ว", missing.length === 0, missing);
  var h2s = els.filter(function (e) { return e.tag === "h2"; });
  var offPage = h2s.filter(function (e) { return !(has(e, "gc-section-h") || (e.parent && has(e.parent, "gc-section-h"))) || glassAncestor(e); });
  t(p[0] + ": หัว section ทุกอัน (h2 ×" + h2s.length + ") อยู่บนพื้นหน้า ใน gc-section-h", h2s.length === 5 && offPage.length === 0, offPage.map(function (e) { return e.outer.slice(0, 60); }));
  t(p[0] + ": ไม่มี style=\"color:…\" บนแก้ว (สีอยู่ที่การ์ด/ชิป/คลาส)", !/style="[^"]*(?:^|;|\s)color\s*:/.test(h));
  t(p[0] + ": ไม่มี NaN / undefined / Infinity", !/NaN|undefined|Infinity/.test(h));
  var ths = (h.match(/<th[\s>]/g) || []).length, bareTh = (h.match(/<th>/g) || []).length;
  t(p[0] + ": <th> ทุกตัวยังเปล่า (pm-view-test นับ <th> 6 ตัว · pm-no-target-test อ่าน <th>Tier</th>)", ths > 0 && ths === bareTh, [ths, bareTh]);
});

// ================================================================ 3 · ชิ้นกลางจาก glass-cards.css
console.log("== 3 · ตาราง · ช่องกรอก · ปุ่ม ==");
(function () {
  mod.setView("all");
  var h = S.current(curOut(CUR_ROWS), INP), els = parse(h);
  var tbl = els.filter(function (e) { return e.tag === "table"; })[0];
  var wrap = els.filter(function (e) { return has(e, "pm-tablewrap"); })[0];
  t("ตาราง Current = pm-table gc-table ใน pm-tablewrap gc-table-wrap", !!tbl && has(tbl, "pm-table") && has(tbl, "gc-table") && !!wrap && has(wrap, "gc-table-wrap") && tbl.parent === wrap);
  t("ช่องเลื่อนของตาราง: tabindex=0 + role=region + aria-label ไม่มีเงิน", attr(wrap.open, "tabindex") === "0" && attr(wrap.open, "role") === "region" &&
    !!attr(wrap.open, "aria-label") && !/฿|\d/.test(attr(wrap.open, "aria-label")), wrap && wrap.open);
  var numTd = els.filter(function (e) { return e.tag === "td" && has(e, "pm-num"); });
  t("เซลล์ตัวเลข (มูลค่า / น้ำหนัก) = pm-num gc-cell-num (" + numTd.length + ")", numTd.length >= 10 && numTd.every(function (e) { return has(e, "gc-cell-num"); }));
  function ctl(sel) { return els.filter(sel); }
  var fields = ctl(function (e) { return (e.tag === "input" || e.tag === "select") && !/type="checkbox"/.test(e.open); });
  t("ช่องกรอก/เลือกทุกตัวใน Current (tier · มูลค่า · ticker · มูลค่าที่เพิ่ม · index ticker) = gc-field", fields.length >= 7 && fields.every(function (e) { return has(e, "gc-field"); }), fields.filter(function (e) { return !has(e, "gc-field"); }).map(function (e) { return e.open; }));
  t("tier select คง data-pm-tier + <option value=\"A\" selected> (pm-settings-sync-test อ่าน)", /<select class="pm-tier-sel gc-field" data-pm-tier="NVDA"><option value="A" selected>A<\/option>/.test(h));
  var btn = function (c) { return ctl(function (e) { return e.tag === "button" && has(e, c); }); };
  t("✕ เอาออก / ➕ เพิ่ม (ด่วน) = gc-btn gc-btn-ghost · ปุ่มเพิ่ม (#pmAddBtn) = gc-btn",
    btn("pm-rm-btn").length >= 2 && btn("pm-rm-btn").every(function (e) { return has(e, "gc-btn") && has(e, "gc-btn-ghost"); }) &&
    btn("pm-addquick").length === 1 && has(btn("pm-addquick")[0], "gc-btn-ghost") && has(btn("pm-add-btn")[0], "gc-btn") && !has(btn("pm-add-btn")[0], "gc-btn-ghost"));
  var cv = ctl(function (e) { return e.tag === "button" && attr(e.open, "data-pm-cview"); });
  t("ปุ่มสลับมุม: ที่เลือก = gc-btn (ขาว) · อีกปุ่ม = gc-btn gc-btn-ghost · คง is-on pm-bull ติดกัน",
    cv.length === 2 && has(cv[0], "gc-btn") && !has(cv[0], "gc-btn-ghost") && /class="pm-stance-btn is-on pm-bull[^"]*" data-pm-cview="all"/.test(h) && has(cv[1], "gc-btn-ghost"));
  // hero: stance + cash field
  var ho = S.overview(ovOut("maintain", "strong", "bearish"), INP);
  var st = parse(ho).filter(function (e) { return e.tag === "button" && attr(e.open, "data-pm-stance"); });
  t("สวิตช์ Bullish/Bearish: ที่เลือก = gc-btn · อีกปุ่ม = gc-btn-ghost · class ขึ้นต้น pm-stance-btn is-on (pm-settings-sync-test อ่าน)",
    st.length === 2 && has(st[1], "gc-btn") && !has(st[1], "gc-btn-ghost") && has(st[0], "gc-btn-ghost") && /class="pm-stance-btn is-on[^"]*" data-pm-stance="bearish"/.test(ho));
  var cin = parse(ho).filter(function (e) { return e.tag === "input" && attr(e.open, "data-pm-cash") === "1"; })[0];
  var csave = parse(ho).filter(function (e) { return e.tag === "button" && attr(e.open, "data-pm-cash-save") === "1"; })[0];
  t("ช่องเงินสด = pm-cash-inp gc-field · ปุ่มบันทึก = pm-cash-btn gc-btn", !!cin && has(cin, "pm-cash-inp") && has(cin, "gc-field") && !!csave && has(csave, "gc-btn") && !has(csave, "gc-btn-ghost"));
  var stats = byClass(ho, "pm-stat");
  t("ค่าในการ์ดตัวเลข 3 ใบ = <b class=\"gc-num\"> · Portfolio Health (ข้อความไทย) ไม่ใช่ gc-num",
    stats.slice(0, 3).every(function (e) { return /<\/small><b class="gc-num">/.test(e.outer); }) && /<\/small><b>แข็งแรง<\/b>/.test(stats[3].outer));
  // fix round 1 [3]: Portfolio Value is Thai text "ยังไม่ตั้งค่า" when neither the Editor gross nor the flagged sum exists → not gc-num
  var hNone = S.overview(ovOut("maintain", "strong"), { cashSource: "editor", gross: null, flagSum: null, cashBaht: null, cashPct: null, investedPct: null, cashEntered: null, cashReason: "no-cash", positions: [] });
  var vNone = byClass(hNone, "pm-stat")[0];
  t("Portfolio Value = \"ยังไม่ตั้งค่า\" (ไม่มี gross / ผลรวมธงแดง) → <b> ธรรมดา ไม่ใช่ gc-num", !!vNone && /<\/small><b>ยังไม่ตั้งค่า<\/b>/.test(vNone.outer), vNone && vNone.outer.slice(0, 160));
  var vSum = byClass(S.overview(ovOut("maintain", "strong"), INP_ED), "pm-stat")[0];
  t("Portfolio Value = ผลรวมธงแดง (editor mode ไม่มี gross) ยังเป็นตัวเลข → gc-num", !!vSum && /<\/small><b class="gc-num">฿2,894,000<\/b>/.test(vSum.outer), vSum && vSum.outer.slice(0, 160));
  mod.cashUi.saveState = "error"; mod.cashUi.error = "HTTP 503"; mod.cashUi.draft = { cash: 800000, savedAt: "2026-11-21T00:00:00.000Z" }; mod.cashUi.draftNotice = "ใช้ค่าที่ยังไม่ได้บันทึก";
  var hr = S.overview(ovOut("maintain", "strong"), INP);
  mod.cashUi.saveState = "idle"; mod.cashUi.error = null; mod.cashUi.draft = null; mod.cashUi.draftNotice = null;
  var retry = parse(hr).filter(function (e) { return e.tag === "button" && attr(e.open, "data-pm-cash-retry") === "1"; })[0];
  t("ปุ่มลองบันทึกอีกครั้ง = pm-cash-btn gc-btn gc-btn-ghost", !!retry && has(retry, "gc-btn") && has(retry, "gc-btn-ghost"), retry && retry.open);
  // manager tier inputs
  var hm = S.manager({ allocationRows: [row("MA", "A")], tierDefs: TIER_DEFS });
  var ti = parse(hm).filter(function (e) { return e.tag === "input" && attr(e.open, "data-pm-tierdef"); });
  t("ช่อง Min/Max ของ Tier (6 ช่อง) = gc-field · ตาราง tier = gc-table", ti.length === 6 && ti.every(function (e) { return has(e, "gc-field"); }) && /<table class="pm-table gc-table">/.test(hm));
  t("checkbox ของ Entry ladder คง data-pm-entry/data-n (ไม่แต่งเป็น gc-field)", /<input type="checkbox" data-pm-entry="MA" data-n="1" checked>/.test(hm));
})();

// ================================================================ 4 · Privacy Lock
console.log("== 4 · Privacy Lock ==");
// what privacy.js does: mask every text node unless it sits inside [data-pv-skip] (inputs are never text nodes)
function maskedScreen(h) {
  var els = parse(h), skip = els.filter(function (e) { return /\sdata-pv-skip=/.test(e.open); });
  var ranges = skip.map(function (e) { return [e.start, e.end]; });
  var out = "", re = />([^<]+)</g, m, last = 0;
  while ((m = re.exec(h)) !== null) {
    var at = m.index + 1, inSkip = ranges.some(function (r) { return at > r[0] && at < r[1]; });
    out += h.slice(last, at) + (inSkip ? m[1] : maskText(m[1]));
    last = at + m[1].length;
  }
  return out + h.slice(last);
}
(function () {
  PV.locked = true;
  [["all", renderAll("all")], ["stocks", renderAll("stocks")]].forEach(function (p) {
    var h = p[1], mk = maskedScreen(h);
    var raw = h.match(/฿[\d,]+/g) || [];
    t(p[0] + ": หน้ามียอดเงิน ฿ (" + raw.length + " จุด) ทุกจุดอยู่ใน text node เดียวกับ ฿", raw.length >= 4 && raw.every(function (s) { return MONEY_NUM.test(s) || /^฿\d+$/.test(s); }), raw.slice(0, 4));
    var screen = mk.replace(/<[^>]*>/g, " ");
    var left = screen.match(new RegExp(MONEY_NUM.source, "g")) || [];
    t(p[0] + ": ล็อกแล้ว (maskText แบบ privacy.js) ไม่เหลือตัวเลขเงินบนจอ · มี ฿XXX", left.length === 0 && !/฿\s?\d/.test(screen) && /฿XXX/.test(screen), left.slice(0, 5));
    // an amount = ฿ + digits, a comma-grouped number, or digits + บาท/THB (the unit word alone, e.g. "แก้มูลค่า (บาท)", is not money)
    var leak = attrsOf(h, "title").concat(attrsOf(h, "aria-label")).filter(function (s) { return /฿\s?-?\d/.test(s) || MONEY_NUM.test(s) || /\d\s?(?:บาท|THB)/.test(s); });
    t(p[0] + ": ไม่มีเงินใน title / aria-label", leak.length === 0, leak);
    var cin = parse(h).filter(function (e) { return e.tag === "input" && attr(e.open, "data-pm-cash") === "1"; })[0];
    t(p[0] + ": ช่องเงินสดตอนล็อก = ว่าง + placeholder 'ล็อกอยู่ — ใส่ค่าใหม่ได้' และยังเป็น gc-field", !!cin && attr(cin.open, "value") === "" && attr(cin.open, "placeholder") === "ล็อกอยู่ — ใส่ค่าใหม่ได้" && has(cin, "gc-field"), cin && cin.open);
    // fix round 1 [1]/[2]: privacy.js never masks <input value> → the page itself must not put money there while locked
    var mv = parse(h).filter(function (e) { return e.tag === "input" && attr(e.open, "data-pm-mv"); });
    t(p[0] + ": ช่องมูลค่าหุ้นรายตัว (" + mv.length + " ช่อง) ตอนล็อก = value=\"\" + placeholder 'ล็อกอยู่ — ใส่ค่าใหม่ได้'",
      mv.length >= 3 && mv.every(function (e) { return attr(e.open, "value") === "" && attr(e.open, "placeholder") === "ล็อกอยู่ — ใส่ค่าใหม่ได้"; }), mv.map(function (e) { return attr(e.open, "value"); }));
    var moneyVals = parse(h).filter(function (e) { return e.tag === "input" && /\d{4,}|\d{1,3},\d{3}/.test(attr(e.open, "value") || ""); }).map(function (e) { return e.open; });
    t(p[0] + ": ไม่มี <input value> ไหนเป็นตัวเลขขนาดเงิน (≥ 4 หลัก) ตอนล็อก", moneyVals.length === 0, moneyVals.slice(0, 3));
  });
  PV.locked = false;
  var hu = renderAll("all");
  var cu = parse(hu).filter(function (e) { return e.tag === "input" && attr(e.open, "data-pm-cash") === "1"; })[0];
  t("ปลดล็อก: ช่องเงินสดแสดงค่าที่เก็บไว้ (2038000) ตามเดิม", !!cu && attr(cu.open, "value") === "2038000", cu && cu.open);
  var mu = parse(hu).filter(function (e) { return e.tag === "input" && attr(e.open, "data-pm-mv"); });
  var MVX = { QQQM: "2000000", NVDA: "435000", META: "291000", PLTR: "236000" };
  t("ปลดล็อก: ช่องมูลค่าหุ้นรายตัวแสดงมูลค่าเดิม (QQQM 2000000 · NVDA 435000 · META 291000 · PLTR 236000) ไม่มี placeholder ล็อก",
    mu.length === 4 && mu.every(function (e) { return attr(e.open, "value") === MVX[attr(e.open, "data-pm-mv")] && attr(e.open, "placeholder") == null; }), mu.map(function (e) { return attr(e.open, "data-pm-mv") + "=" + attr(e.open, "value"); }));
})();

// ---- the [data-pm-mv] change handler (bind() for real, a fake #pmRoot · the list PortfolioCore.updateHolding
//      would send recorded — since 2026-11-24 the page saves ONE row via updateHolding, not the whole list) ----
(function () {
  function fakeRoot(h) {
    var handlers = [];
    return {
      handlers: handlers,
      querySelectorAll: function (sel) {
        var m = /^\[([a-z-]+)\]$/.exec(sel), out = [];
        if (!m) return out;
        var re = new RegExp("<[a-zA-Z]+\\b[^>]*\\s" + m[1] + "=\"([^\"]*)\"[^>]*>", "g"), mm;
        while ((mm = re.exec(h)) !== null) {
          (function (tag, val) {
            var el = { tagName: "INPUT", value: attr(tag, "value") || "", checked: false,
              getAttribute: function (k) { return attr(tag, k); },
              addEventListener: function (ev, fn) { handlers.push({ attr: m[1], val: val, ev: ev, fn: fn, el: el }); },
              blur: function () {}, focus: function () {} };
            out.push(el);
          })(mm[0], mm[1]);
        }
        return out;
      }
    };
  }
  function change(root, ticker, typed) {
    var hd = root.handlers.filter(function (x) { return x.attr === "data-pm-mv" && x.val === ticker && x.ev === "change"; })[0];
    if (!hd) return false;
    hd.el.value = typed;
    hd.fn({ preventDefault: function () {} });
    return true;
  }
  var saves = [];
  window.PortfolioCore = {
    readLocalHoldings: function () { return [{ canonicalSymbol: "NVDA", assetName: "NVIDIA", isHolding: true, marketValue: 435000, portfolioBucket: "foreign-stock" }]; },
    // records the list after the page's find/mutate — the promise never settles (no follow-up sync in this vm)
    updateHolding: function (find, mutate) {
      var list = this.readLocalHoldings(), i = find(list), next = mutate(i >= 0 ? list[i] : null);
      if (i >= 0) list[i] = next; else list.push(next);
      saves.push(JSON.parse(JSON.stringify(list)));
      return new Promise(function () {});
    }
  };
  try {
    PV.locked = true; mod.setView("all");
    var rl = fakeRoot(S.current(curOut(CUR_ROWS), INP));
    mod.bind(rl);
    var bound = change(rl, "NVDA", "");
    t("ล็อกอยู่ + ช่องมูลค่าว่าง (change) → ไม่บันทึก (ไม่ใช่บันทึก 0 ทับมูลค่าเดิม)", bound && saves.length === 0, [bound, saves.length]);
    change(rl, "NVDA", "   ");
    t("ล็อกอยู่ + ช่องมีแต่ช่องว่าง → ไม่บันทึก", saves.length === 0, saves.length);
    change(rl, "NVDA", "735000");
    var nv = saves.length === 1 ? saves[0].filter(function (x) { return x.canonicalSymbol === "NVDA"; })[0] : null;
    t("ล็อกอยู่ + พิมพ์ค่าใหม่ 735000 → บันทึกตามปกติ (NVDA marketValue 735000, ยังถือ)", !!nv && nv.marketValue === 735000 && nv.isHolding === true, saves.length);
    PV.locked = false;
    var ru = fakeRoot(S.current(curOut(CUR_ROWS), INP));
    mod.bind(ru);
    var n0 = saves.length;
    change(ru, "NVDA", "500000");
    t("ปลดล็อก + พิมพ์ 500000 → บันทึกตามเดิม", saves.length === n0 + 1 && saves[saves.length - 1].filter(function (x) { return x.canonicalSymbol === "NVDA"; })[0].marketValue === 500000);
  } finally { PV.locked = false; delete window.PortfolioCore; }
})();

// ================================================================ 5 · CSS
console.log("== 5 · portfolio-manager.css ==");
var CSS = read("portfolio-manager.css");
var CBODY = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
var RULES = (function () {
  var out = [], re = /([^{}]+)\{([^{}]*)\}/g, m;
  while ((m = re.exec(CBODY)) !== null) {
    var prelude = m[1].trim();
    if (prelude.charAt(0) === "@") continue;
    out.push({ sel: prelude.split(",").map(function (s) { return s.trim().replace(/\s+/g, " "); }), body: m[2] });
  }
  return out;
})();
function rulesFor(pred) { return RULES.filter(function (r) { return r.sel.some(pred); }); }
function exact(s) { return rulesFor(function (x) { return x === s; }); }
function declIn(rules, prop) {
  var v = null;
  rules.forEach(function (r) { var re = new RegExp("(?:^|;)\\s*" + prop.replace(/-/g, "\\-") + "\\s*:\\s*([^;]+)", "g"), m; while ((m = re.exec(r.body)) !== null) v = m[1].trim(); });
  return v;
}
function lin(v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
function lumHex(h) { var m = /^#([0-9a-f]{6})$/i.exec(h || ""); if (!m) return -1; var n = parseInt(m[1], 16); return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); }
(function () {
  var remap = exact("#pmRoot .gc-card");
  var INK = { "--mc-text": "var(--gc-ink)", "--mc-text-2": "var(--gc-ink)", "--mc-muted": "var(--gc-ink-2)", "--mc-dim": "var(--gc-ink-2)", "--mc-faint": "var(--gc-ink-2)", "--mc-border": "var(--gc-line)", "--mc-card": "var(--gc-well)" };
  var badInk = Object.keys(INK).filter(function (k) { return declIn(remap, k) !== INK[k]; });
  t("#pmRoot .gc-card แมปโทเคน mc (รวม --mc-dim ที่ไฟล์นี้ใช้) → หมึก/เส้น/ช่องของแก้ว", remap.length === 1 && badInk.length === 0, badInk.map(function (k) { return k + "=" + declIn(remap, k); }));
  var SKIN = /(?:^|;)\s*(?:background(?:-color|-image)?|border(?:-[a-z]+)*|box-shadow)\s*:/;
  var gone = ["pm-hero", "pm-hero-main", "pm-stat", "pm-card", "pm-mgr", "pm-rule", "pm-foot", "pm-dep", "pm-current", "pm-strip", "pm-tiercard"].filter(function (k) {
    return exact("." + k).some(function (r) { return SKIN.test(r.body); });
  });
  t("ผิวการ์ดเก่า (พื้น/ขอบ/เงา) ของการ์ดที่เป็นแก้วถูกลบ — glass-cards.css วาดแทน", gone.length === 0, gone);
  t(".pm-card-a / -b / -e และ .pm-rule-on / -off ไม่วาดขอบสีเก่าแล้ว (tone แทน)", rulesFor(function (s) { return /^\.pm-card-[a-e]$|^\.pm-rule-(on|off)$/.test(s) && true; }).every(function (r) { return !SKIN.test(r.body); }));
  var CTRL = ["pm-stance-btn", "pm-cash-inp", "pm-cash-btn", "pm-mv-inp", "pm-rm-btn", "pm-addquick", "pm-add-btn", "pm-tier-sel", "pm-tier-inp", "pm-alloc-inp"];
  var FACE = /(?:^|;)\s*(?:background(?:-color)?|border(?:-[a-z]+)*|color|font(?:-family|-size)?|padding|box-shadow|border-radius)\s*:/;
  var painted = [];
  RULES.forEach(function (r) { r.sel.forEach(function (s) { CTRL.forEach(function (c) { if (new RegExp("\\." + c + "(?![\\w-])").test(s) && FACE.test(r.body)) painted.push(s); }); if (/^\.pm-addform input/.test(s) && FACE.test(r.body)) painted.push(s); }); });
  t("ปุ่ม/ช่องที่ใส่ gc-btn / gc-field ไม่มีพื้น ขอบ สี ฟอนต์ padding ของตัวเองทับ (ไฟล์นี้โหลดหลัง glass-cards.css)", painted.length === 0, painted);
  var toneSingle = rulesFor(function (s) { return /^\.pm-(bull|bear|watch|neutral)$/.test(s); });
  t("ไม่มีกฎสีกว้าง .pm-bull/.pm-bear/.pm-watch/.pm-neutral (เคยทาสีปุ่ม gc-btn ที่ติด is-on pm-bull และกล่อง Overall Recommendation)", toneSingle.length === 0, toneSingle.map(function (r) { return r.sel.join(","); }));
  // text colour on the glass: every hex colour (and every --pm-chip-ink) has luminance ≥ 0.70 (≥ 4.7:1 on the brightest pixel of every tone)
  var weak = [];
  RULES.forEach(function (r) {
    var onPage = r.sel.every(function (s) { return /^\.pm-header|^#pmRoot > \.pm-stale|^\.pm-sec \.gc-section-h/.test(s); });
    if (onPage) return;
    var re = /(?:^|;)\s*(color|--pm-chip-ink|fill)\s*:\s*(#[0-9a-fA-F]{6})/g, m;
    while ((m = re.exec(r.body)) !== null) if (lumHex(m[2]) < 0.70) weak.push(r.sel.join(",") + " " + m[1] + ":" + m[2] + " L=" + lumHex(m[2]).toFixed(3));
    var re3 = /(?:^|;)\s*(color|fill)\s*:\s*(#[0-9a-fA-F]{3})(?![0-9a-fA-F])/g;
    while ((m = re3.exec(r.body)) !== null) if (!/^#fff$/i.test(m[2])) weak.push(r.sel.join(",") + " " + m[1] + ":" + m[2]);
  });
  t("สีตัวหนังสือบนแก้วสว่างพอ: hex ทุกตัว luminance ≥ 0.70 (โมเดลเดียวกับ Task 1–2)", weak.length === 0, weak);
  var dimVar = RULES.filter(function (r) { return /#94a3b8|#64748b|#cbd5e1/.test(r.body) && !r.sel.every(function (s) { return /^\.pm-header|^#pmRoot > \.pm-stale/.test(s); }); });
  t("ไม่มีเทา #94a3b8 / #64748b ค้างเป็นสีตัวหนังสือในการ์ด (ต่ำกว่า 4.5:1 บนแก้ว)", dimVar.length === 0, dimVar.map(function (r) { return r.sel.join(","); }));
  t("การ์ดที่มีข้อความปน inline (footer · mc-empty) เป็น block ไม่ใช่ flex column ของ gc-card",
    declIn(exact(".pm-foot"), "display") === "block" && declIn(exact("#pmRoot .mc-empty.gc-card"), "display") === "block");
  t("ชิปนับ Zone มีช่องไฟ (gc-pill เป็น inline-flex: \"A\" กับเลขนับไม่ติดกัน)", /^\d+px$/.test(declIn(exact(".pm-pill"), "gap") || ""));
  var block = declIn(exact(".pm-entry-block"), "opacity");
  t("Entry ที่ปิด จางไม่เกิน opacity 0.75 บนแก้ว (หมึกรอง ≥ 4.5:1 แบบ Task 2)", Number(block) >= 0.75, block);
  t("ตัวเลขกลาง pie = Inter 700 (ไม่ใช่ 800)", declIn(exact(".pm-pie-c1"), "font-weight") === "700");
  t("แท่ง deploy (สีไม่มีความหมาย) เป็นขาวแบบ Macro", /#fff|rgba\(255, ?255, ?255/.test(declIn(exact(".pm-depbar i"), "background") || ""), declIn(exact(".pm-depbar i"), "background"));
  t("ไม่มีฟอนต์ตัวเลขแบบจุด (Doto / dot-matrix / LED / DSEG) · ไม่มี @font-face", !/doto|dot-?matrix|DSEG|\bLED\b/i.test(CSS) && !/@font-face/.test(CBODY));
  t("กฎที่เทสต์อื่นอ้างยังอยู่: .pm-techwarn { · .pm-cash-inp { · .pm-cashbox {", /\.pm-techwarn\s*\{/.test(CSS) && /\.pm-cash-inp\s*\{/.test(CSS) && /\.pm-cashbox\s*\{/.test(CSS));
  t("กริดการ์ดไม่บังคับกว้างเกินจอ 390 (minmax(min(…, 100%), 1fr))", /minmax\(min\(\d+px, 100%\), 1fr\)/.test(declIn(exact(".pm-grid"), "grid-template-columns") || "") &&
    /minmax\(min\(\d+px, 100%\), 1fr\)/.test(declIn(exact(".pm-rules"), "grid-template-columns") || ""));
})();

// ================================================================ 6 · HTML + เวอร์ชัน
console.log("== 6 · portfolio-manager.html ==");
(function () {
  var HTML = read("portfolio-manager.html");
  function ver(f) { var m = new RegExp(f.replace(/[.]/g, "\\.") + "\\?v=([^\"]+)\"").exec(HTML); return m ? m[1] : null; }
  t("portfolio-manager.css → 20261124-pm-15 · portfolio-manager-page.js → 20261125-pm-36", ver("/portfolio-manager.css") === "20261124-pm-15" && ver("/portfolio-manager-page.js") === "20261125-pm-36",
    [ver("/portfolio-manager.css"), ver("/portfolio-manager-page.js")]);
  var iM = HTML.indexOf("/mission-control.css?v="), iG = HTML.indexOf("/glass-cards.css?v=20261121-gc-2"), iP = HTML.indexOf("/portfolio-manager.css?v=");
  t("ลำดับ: mission-control.css → glass-cards.css (gc-2) → portfolio-manager.css", iM > 0 && iG > iM && iP > iG, [iM, iG, iP]);
  t("ระหว่างโหลด: mc-empty gc-card gc-neutral", /<div class="mc-empty gc-card gc-neutral"><strong>กำลังโหลด AI Portfolio Manager…<\/strong><\/div>/.test(HTML));
})();

finish();
