"use strict";
// ============================================================
// BACKTEST LAB (/backtest) — การ์ดแก้ว (glass-cards.css)
//   node scripts/backtest-glass-test.js
//
// บูต backtest-page.js ตัวจริงใน VM (DOM ปลอมตาม id ของหน้า · fetch /api/backtest ปลอม · canvas ปลอมที่จดสีที่วาด)
// กดปุ่ม "เริ่ม Backtest" แล้วล็อก:
//   · การ์ด → สถานะต้นทาง → tone (สถานะที่หน้าคำนวณอยู่แล้วเท่านั้น):
//       การ์ดตัวเลข (.metric-card) คลาสเดิมของหน้า  good → gc-calm · warn → gc-warning · bad → gc-danger · ไม่มี → gc-neutral
//         ผลตอบแทนรวม totalReturnPct ≥ 0 good / < 0 bad · Profit Factor > 1.3 หรือ ∞ good / อื่น warn ·
//         Max Drawdown < −25 bad / อื่น warn · คะแนนกลยุทธ์ ≥ 70 good / อื่น warn · อัตราชนะ · จำนวนครั้งที่เทรด → neutral
//       การ์ดช่วงเวลา (.period-card)  is-warning (overfit ที่ Out-of-sample) → gc-warning ·
//         ช่วงที่ไม่มีเทรด (0 / ไม่มีค่า) หรือผลตอบแทนไม่มี/ไม่ใช่ตัวเลขจำกัด (null · NaN · "-") → gc-neutral ·
//         ไม่งั้นกำไร/ขาดทุนของช่วงนั้น (กติกาเดียวกับผลตอบแทนรวม) ≥ 0 → gc-calm · < 0 → gc-danger  (fix round 1)
//       การ์ด Overfit warning → gc-warning · กล่องข้อความว่าง/กำลังคำนวณ/ล้มเหลว (.empty-box) → gc-neutral
//       แผงตั้งค่า · แถบแท็บ · การ์ดกราฟ · การ์ดตาราง → gc-neutral (ไม่มีสถานะ)
//   · ไม่มีการ์ดแก้วซ้อนการ์ดแก้ว · หัว section อยู่บนพื้นหน้า (gc-section-h) · ตัวเลขการ์ด gc-num
//   · ชิ้นกลาง: ช่องตั้งค่า gc-field · ปุ่ม gc-btn / gc-btn-ghost · ตาราง gc-table ใน gc-table-wrap (โฟกัสได้ + aria-label) · gc-cell-num
//   · กราฟ: ไม่ทาพื้นขาวทับแก้ว · เส้น drawdown คงสีแดงเดิม (สีมีความหมาย) · เส้น equity ขาวแบบ Macro
//   · escape ทุกค่าที่ใส่ใน innerHTML (ข้อความ error) · ไม่มีตัวเลขใน title / aria-label (เงินสมมุติของ backtest ไม่ใช่เงินพอร์ต ไม่มี ฿)
//   · id / คลาส / aria / ข้อความเดิมยังอยู่ · glass-cards.css ก่อน backtest.css · Inter 700 · เวอร์ชัน bump
// ============================================================
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var ROOT = path.join(__dirname, "..");
var PUB = path.join(ROOT, "public");
function read(f) { return fs.readFileSync(path.join(PUB, f), "utf8"); }

var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; return; }
  fail++;
  console.error("  ✗ " + name + (extra !== undefined ? "  → " + JSON.stringify(extra) : ""));
}

var TONES = ["gc-calm", "gc-normal", "gc-warning", "gc-danger", "gc-neutral"];
var GC_V = "20261121-gc-2";
var V = { css: "20261122-backtest-3", js: "20261122-backtest-4" };
var HTML = read("backtest.html");
var CSS = read("backtest.css");
var JS = read("backtest-page.js");

function tonesOf(cls) { return String(cls).split(/\s+/).filter(function (c) { return TONES.indexOf(c) >= 0; }); }
function has(cls, c) { return (" " + cls + " ").indexOf(" " + c + " ") >= 0; }

// ---------------------------------------------------------------- fixtures
function curve(n, key, f) { var out = []; for (var i = 0; i < n; i++) { var o = { date: "2024-01-" + (i < 9 ? "0" : "") + (i + 1) }; o[key] = f(i); out.push(o); } return out; }
function result(o) {
  return {
    symbol: o.symbol, strategyName: o.strategyName || "EMA Trend + RSI Filter", marketData: { source: "Synthetic" },
    metrics: o.metrics, strategyScore: o.score, verdict: o.verdict || "ยังไม่น่าสนใจ",
    periodResults: o.periods, overfitWarning: !!o.overfit,
    trades: [{ entryDate: "2024-01-02", exitDate: "2024-01-09", entryPrice: 100, exitPrice: 104.5, shares: 10, pnl: 45, pnlPct: 4.5, exitReason: "Exit rule", holdingDays: 7 }],
    equityCurve: curve(12, "equity", function (i) { return 10000 + i * 120; }),
    drawdownCurve: curve(12, "drawdown", function (i) { return -(i % 4) * 2.5; })
  };
}
var GOOD = result({
  symbol: "SPY", score: 75, verdict: "น่าสนใจมาก",
  metrics: { totalReturnPct: 35.2, netProfit: 3520, winRate: 58, tradeCount: 31, profitFactor: 1.8, maxDrawdown: -12, averageHoldingPeriod: 9.5, expectancy: 25 },
  periods: { in_sample: { metrics: { totalReturnPct: 20, winRate: 60, tradeCount: 20, profitFactor: 1.9 } },
    out_of_sample: { metrics: { totalReturnPct: -5, winRate: 40, tradeCount: 6, profitFactor: 0.8 } } }   // recent ไม่มี → "-"
});
var BAD = result({
  symbol: "QQQ", score: 40,
  metrics: { totalReturnPct: -8.4, netProfit: -840, winRate: 35, tradeCount: 14, profitFactor: 0.9, maxDrawdown: -31.5, averageHoldingPeriod: 6, expectancy: -12 },
  periods: { in_sample: { metrics: { totalReturnPct: 30, winRate: 62, tradeCount: 9, profitFactor: 2.1 } },
    out_of_sample: { metrics: { totalReturnPct: -12, winRate: 30, tradeCount: 5, profitFactor: 0.6 } },
    recent: { metrics: { totalReturnPct: 0, winRate: 50, tradeCount: 2, profitFactor: 1 } } },
  overfit: true
});
var INF = result({
  symbol: "NVDA", score: 70,
  metrics: { totalReturnPct: 0, netProfit: 0, winRate: 100, tradeCount: 3, profitFactor: null, maxDrawdown: -25, averageHoldingPeriod: 4, expectancy: 10 },
  periods: {}
});
var PAYLOAD = { ranking: [GOOD, BAD, INF], results: [GOOD, BAD, INF], generatedAt: "2026-11-22T00:00:00.000Z", errors: [] };
// fix round 1: ช่วงที่ไม่มีเทรด / ผลตอบแทนไม่ใช่ตัวเลข (ส่งแบบ raw ไม่ผ่าน JSON เพื่อให้ NaN รอด)
//   In-sample = รูปเดียวกับที่ engine คืนเมื่อช่วงนั้นไม่มีแท่งราคา (bars = 0): 0% · 0 เทรด · PF 0
var ZERO = result({
  symbol: "AMD", score: 30,
  metrics: { totalReturnPct: 2, netProfit: 200, winRate: 50, tradeCount: 4, profitFactor: 1.1, maxDrawdown: -9, averageHoldingPeriod: 5, expectancy: 3 },
  periods: { in_sample: { metrics: { totalReturnPct: 0, netProfit: 0, winRate: 0, tradeCount: 0, profitFactor: 0, maxDrawdown: 0 } },
    out_of_sample: { metrics: { totalReturnPct: NaN, winRate: 50, tradeCount: 4, profitFactor: 1.1 } },
    recent: { metrics: { totalReturnPct: -3.5, winRate: 0, tradeCount: 0, profitFactor: 0 } } }
});
var ODD = result({
  symbol: "TSLA", score: 20,
  metrics: { totalReturnPct: -1, netProfit: -100, winRate: 40, tradeCount: 5, profitFactor: 0.9, maxDrawdown: -15, averageHoldingPeriod: 5, expectancy: -2 },
  periods: { in_sample: { metrics: { totalReturnPct: 26, winRate: 70, tradeCount: 7, profitFactor: 2.4 } },
    out_of_sample: { metrics: { totalReturnPct: 0, winRate: 0, tradeCount: 0, profitFactor: 0 } },          // overfit + 0 เทรด
    recent: { metrics: { totalReturnPct: 4, winRate: 100, profitFactor: null } } },                             // ไม่มี tradeCount → แสดง "Trades: 0"
  overfit: true
});
var NULLRET = result({
  symbol: "META", score: 50,
  metrics: { totalReturnPct: 1, netProfit: 100, winRate: 50, tradeCount: 2, profitFactor: 1.2, maxDrawdown: -5, averageHoldingPeriod: 5, expectancy: 1 },
  periods: { in_sample: { metrics: { totalReturnPct: null, winRate: 50, tradeCount: 3, profitFactor: 1 } },
    out_of_sample: { metrics: { totalReturnPct: "abc", winRate: 50, tradeCount: 3, profitFactor: 1 } },
    recent: { metrics: { totalReturnPct: -0.4, winRate: 50, tradeCount: 1, profitFactor: 0.7 } } }
});

// ---------------------------------------------------------------- fake DOM
function boot(opts) {
  opts = opts || {};
  var els = {}, draws = [];
  function mkCtx(canvasId) {
    var ctx = { font: "", lineWidth: 1, fillStyle: "#000000", strokeStyle: "#000000" };
    ["clearRect", "fillRect", "beginPath", "moveTo", "lineTo", "stroke", "closePath", "fill", "fillText"].forEach(function (op) {
      ctx[op] = function () { draws.push({ canvas: canvasId, op: op, fill: ctx.fillStyle, stroke: ctx.strokeStyle, args: Array.prototype.slice.call(arguments) }); };
    });
    return ctx;
  }
  function mk(id) {
    var html = "";
    var e = {
      id: id, value: "", disabled: false, textContent: "", dataset: {}, style: {}, width: 800, height: id === "drawdownCanvas" ? 220 : 280, listeners: {},
      addEventListener: function (ty, fn) { (this.listeners[ty] = this.listeners[ty] || []).push(fn); },
      insertAdjacentHTML: function (pos, h) { html = pos === "afterbegin" ? h + html : html + h; },
      scrollIntoView: function () {}, closest: function () { return null; },
      classList: { add: function () {}, remove: function () {}, contains: function () { return false; } }
    };
    Object.defineProperty(e, "innerHTML", { get: function () { return html; }, set: function (v) { html = String(v); } });
    Object.defineProperty(e, "selectedOptions", { get: function () {
      var out = [], re = /<option value="([^"]*)"\s+selected\b/g, m;
      while ((m = re.exec(html)) !== null) out.push({ value: m[1] });
      return out;
    } });
    var ctx = null;
    e.getContext = function () { return ctx || (ctx = mkCtx(id)); };
    return e;
  }
  var tabs = ["summarySection", "rankingSection", "tradesSection", "chartsSection"].map(function (target) { var b = mk(""); b.dataset.target = target; return b; });
  var doc = {
    querySelector: function (sel) { if (sel.charAt(0) !== "#") return null; var id = sel.slice(1); return els[id] || (els[id] = mk(id)); },
    querySelectorAll: function (sel) { return sel === ".tab-button" ? tabs : []; },
    createElement: function () { return mk(""); }
  };
  var fetched = [];
  var win = {
    document: doc, console: console, Math: Math, JSON: JSON, Date: Date, Number: Number, String: String, Object: Object, Array: Array,
    Boolean: Boolean, Map: Map, Promise: Promise, RegExp: RegExp, Error: Error, isFinite: isFinite, isNaN: isNaN, parseFloat: parseFloat, parseInt: parseInt,
    setTimeout: setTimeout, clearTimeout: clearTimeout, Intl: Intl,
    fetch: function (url, init) {
      fetched.push({ url: String(url), method: init && init.method });
      if (opts.fail) return Promise.resolve({ ok: false, status: 500, json: function () { return Promise.resolve({ error: opts.fail }); } });
      return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve(opts.raw ? opts.payload : JSON.parse(JSON.stringify(opts.payload || PAYLOAD))); } });
    }
  };
  win.window = win;
  vm.createContext(win);
  vm.runInContext(JS, win, { filename: "backtest-page.js" });
  return {
    els: els, draws: draws, fetched: fetched,
    run: function () { return els.runBacktestButton.listeners.click[0](); },
    pick: function (i) { els.rankingRows.listeners.click[0]({ target: { closest: function () { return { dataset: { rankIndex: String(i) } }; } } }); }
  };
}
function metricCards(html) {
  var out = {}, re = /<article class="([^"]*)">\s*<span>([^<]*)<\/span>\s*<strong([^>]*)>([^<]*)<\/strong>/g, m;
  while ((m = re.exec(html)) !== null) out[m[2]] = { cls: m[1], strongAttrs: m[3], value: m[4] };
  return out;
}
function periodCards(html) {
  var out = [], re = /<article class="([^"]*)">\s*<strong>([^<]*)<\/strong>/g, m;
  while ((m = re.exec(html)) !== null) out.push({ cls: m[1], label: m[2] });
  return out;
}
function tone1(cls) { var tt = tonesOf(cls); return tt.length === 1 ? tt[0] : tt.join("+") || "none"; }

(async function main() {
  // ---------------------------------------------------------------- การ์ดตัวเลข + ช่วงเวลา (ผลดี: SPY)
  var P = boot();
  var initDraws = P.draws.slice();
  await P.run();
  t("fetch /api/backtest POST ครั้งเดียวเหมือนเดิม", P.fetched.length === 1 && P.fetched[0].url === "/api/backtest" && P.fetched[0].method === "POST", P.fetched);
  var mc = metricCards(P.els.summaryCards.innerHTML);
  var labels = ["ผลตอบแทนรวม", "อัตราชนะ", "Profit Factor", "Max Drawdown", "จำนวนครั้งที่เทรด", "คะแนนกลยุทธ์"];
  t("การ์ดตัวเลขครบ 6 ใบ ข้อความหัวเดิม", labels.every(function (l) { return mc[l]; }), Object.keys(mc));
  labels.forEach(function (l) {
    var c = mc[l]; if (!c) return;
    t(l + ": metric-card + gc-card + gc-tile + tone เดียว", has(c.cls, "metric-card") && has(c.cls, "gc-card") && has(c.cls, "gc-tile") && tonesOf(c.cls).length === 1, c.cls);
    t(l + ": ตัวเลขเป็น gc-num (Inter 700 tabular)", /class="[^"]*\bgc-num\b/.test(c.strongAttrs), c.strongAttrs);
  });
  var exp = { "ผลตอบแทนรวม": ["good", "gc-calm"], "อัตราชนะ": [null, "gc-neutral"], "Profit Factor": ["good", "gc-calm"], "Max Drawdown": ["warn", "gc-warning"],
    "จำนวนครั้งที่เทรด": [null, "gc-neutral"], "คะแนนกลยุทธ์": ["good", "gc-calm"] };
  Object.keys(exp).forEach(function (l) {
    var c = mc[l]; if (!c) return;
    var st = exp[l][0];
    t("SPY " + l + ": สถานะเดิม " + (st || "ไม่มี") + " คงคลาสเดิม → " + exp[l][1], tone1(c.cls) === exp[l][1] && (st ? has(c.cls, st) : !/\b(good|warn|bad)\b/.test(c.cls)), c.cls);
  });
  var pc = periodCards(P.els.periodCards.innerHTML);
  t("SPY: การ์ดช่วงเวลา 3 ใบ (ไม่มี overfit)", pc.length === 3 && pc.map(function (p) { return p.label; }).join() === "In-sample,Out-of-sample,Recent test", pc);
  pc.forEach(function (p) { t("ช่วง " + p.label + ": period-card + gc-card + tone เดียว", has(p.cls, "period-card") && has(p.cls, "gc-card") && tonesOf(p.cls).length === 1, p.cls); });
  t("SPY In-sample +20% → gc-calm (กำไร)", pc[0] && tone1(pc[0].cls) === "gc-calm", pc[0]);
  t("SPY Out-of-sample −5% ไม่ overfit → gc-danger (ขาดทุน) ไม่มี is-warning", pc[1] && tone1(pc[1].cls) === "gc-danger" && !has(pc[1].cls, "is-warning"), pc[1]);
  t("SPY Recent ไม่มีผล (\"-\") → gc-neutral", pc[2] && tone1(pc[2].cls) === "gc-neutral" && /Total return: -</.test(P.els.periodCards.innerHTML), pc[2]);

  // ---------------------------------------------------------------- เลือกแถว ranking ที่ 2 (ผลแย่ + overfit: QQQ)
  P.pick(1);
  mc = metricCards(P.els.summaryCards.innerHTML);
  var expBad = { "ผลตอบแทนรวม": ["bad", "gc-danger"], "Profit Factor": ["warn", "gc-warning"], "Max Drawdown": ["bad", "gc-danger"], "คะแนนกลยุทธ์": ["warn", "gc-warning"],
    "อัตราชนะ": [null, "gc-neutral"], "จำนวนครั้งที่เทรด": [null, "gc-neutral"] };
  Object.keys(expBad).forEach(function (l) {
    var c = mc[l]; if (!c) { t("QQQ " + l + " มีการ์ด", false); return; }
    var st = expBad[l][0];
    t("QQQ " + l + ": สถานะเดิม " + (st || "ไม่มี") + " → " + expBad[l][1], tone1(c.cls) === expBad[l][1] && (st ? has(c.cls, st) : true), c.cls);
  });
  pc = periodCards(P.els.periodCards.innerHTML);
  t("QQQ: 3 ช่วง + การ์ด Overfit warning", pc.length === 4 && pc[3].label === "Overfit warning", pc);
  t("QQQ Out-of-sample overfit: คง is-warning → gc-warning (แม้ขาดทุน)", pc[1] && has(pc[1].cls, "is-warning") && tone1(pc[1].cls) === "gc-warning", pc[1]);
  t("QQQ การ์ด Overfit warning: is-warning → gc-warning", pc[3] && has(pc[3].cls, "is-warning") && tone1(pc[3].cls) === "gc-warning", pc[3]);
  t("QQQ Recent 0% · 2 เทรด → gc-calm (มีเทรด · ≥ 0 กติกาเดียวกับผลตอบแทนรวม)", pc[2] && tone1(pc[2].cls) === "gc-calm" && /Trades: 2</.test(P.els.periodCards.innerHTML), pc[2]);
  t("QQQ In-sample +30% → gc-calm", pc[0] && tone1(pc[0].cls) === "gc-calm", pc[0]);

  // ---------------------------------------------------------------- PF ∞ · DD −25 · คะแนน 70 (ขอบ)
  P.pick(2);
  mc = metricCards(P.els.summaryCards.innerHTML);
  t("NVDA Profit Factor ∞ → good → gc-calm", mc["Profit Factor"] && mc["Profit Factor"].value === "∞" && tone1(mc["Profit Factor"].cls) === "gc-calm", mc["Profit Factor"]);
  t("NVDA Max Drawdown −25 (ไม่ต่ำกว่า −25) → warn → gc-warning", mc["Max Drawdown"] && tone1(mc["Max Drawdown"].cls) === "gc-warning", mc["Max Drawdown"]);
  t("NVDA คะแนน 70 → good → gc-calm · ผลตอบแทน 0% → good → gc-calm", mc["คะแนนกลยุทธ์"] && tone1(mc["คะแนนกลยุทธ์"].cls) === "gc-calm" && tone1(mc["ผลตอบแทนรวม"].cls) === "gc-calm");
  pc = periodCards(P.els.periodCards.innerHTML);
  t("NVDA ไม่มีผลรายช่วง → ทั้ง 3 ใบ gc-neutral", pc.length === 3 && pc.every(function (p) { return tone1(p.cls) === "gc-neutral"; }), pc);

  // ---------------------------------------------------------------- fix round 1: ช่วงไม่มีเทรด / ผลตอบแทนไม่ใช่ตัวเลข → neutral
  var Z = boot({ raw: true, payload: { ranking: [ZERO, ODD, NULLRET], results: [ZERO, ODD, NULLRET], generatedAt: "x", errors: [] } });
  await Z.run();
  pc = periodCards(Z.els.periodCards.innerHTML);
  t("AMD In-sample ไม่มีแท่ง/0 เทรด (0% · PF 0 แบบ engine) → gc-neutral ไม่ใช่เขียว", pc[0] && tone1(pc[0].cls) === "gc-neutral" && /Trades: 0</.test(Z.els.periodCards.innerHTML), pc[0]);
  t("AMD Out-of-sample ผลตอบแทน NaN (มี 4 เทรด) → gc-neutral", pc[1] && tone1(pc[1].cls) === "gc-neutral", pc[1]);
  t("AMD Recent −3.5% แต่ 0 เทรด → gc-neutral (ไม่มีเทรด = ไม่มีผล)", pc[2] && tone1(pc[2].cls) === "gc-neutral", pc[2]);
  Z.pick(1);
  pc = periodCards(Z.els.periodCards.innerHTML);
  t("TSLA Out-of-sample overfit + 0 เทรด: คง is-warning ของหน้า → gc-warning", pc[1] && has(pc[1].cls, "is-warning") && tone1(pc[1].cls) === "gc-warning", pc[1]);
  t("TSLA Recent +4% แต่ไม่มี tradeCount (แสดง Trades: 0) → gc-neutral", pc[2] && tone1(pc[2].cls) === "gc-neutral", pc[2]);
  t("TSLA In-sample +26% · 7 เทรด → gc-calm · การ์ด Overfit warning → gc-warning", pc[0] && tone1(pc[0].cls) === "gc-calm" && pc[3] && tone1(pc[3].cls) === "gc-warning", pc);
  Z.pick(2);
  pc = periodCards(Z.els.periodCards.innerHTML);
  t("META In-sample ผลตอบแทน null (3 เทรด) → gc-neutral", pc[0] && tone1(pc[0].cls) === "gc-neutral", pc[0]);
  t("META Out-of-sample ผลตอบแทน \"abc\" → gc-neutral", pc[1] && tone1(pc[1].cls) === "gc-neutral", pc[1]);
  t("META Recent −0.4% · 1 เทรด → gc-danger (มีเทรด · < 0)", pc[2] && tone1(pc[2].cls) === "gc-danger", pc[2]);
  t("การ์ดตัวเลขผลตอบแทนรวมไม่เปลี่ยน: AMD +2% → calm · TSLA −1% → danger (คลาสเดิม good/bad)", (function () {
    var mm = metricCards(Z.els.summaryCards.innerHTML); // ตอนนี้เลือก META (+1%)
    Z.pick(0); var a = metricCards(Z.els.summaryCards.innerHTML)["ผลตอบแทนรวม"];
    Z.pick(1); var b = metricCards(Z.els.summaryCards.innerHTML)["ผลตอบแทนรวม"];
    return mm["ผลตอบแทนรวม"] && tone1(mm["ผลตอบแทนรวม"].cls) === "gc-calm" && a && has(a.cls, "good") && tone1(a.cls) === "gc-calm" && b && has(b.cls, "bad") && tone1(b.cls) === "gc-danger";
  })());

  // ---------------------------------------------------------------- ตาราง
  var rk = P.els.rankingRows.innerHTML, tr = P.els.tradeRows.innerHTML;
  t("ranking: 3 แถว · คง data-rank-index / ranking-button / is-selected", (rk.match(/<tr\b/g) || []).length === 3 && /class="ranking-button"/.test(rk) && /data-rank-index="2"/.test(rk) && /class="is-selected"/.test(rk));
  var rkNum = (rk.split("<tr")[1] || "").match(/<td class="gc-cell-num">/g) || [];
  t("ranking: คอลัมน์ตัวเลข 10 ช่องต่อแถวเป็น gc-cell-num (ชิดขวา)", rkNum.length === 10, rkNum.length);
  var trNum = (tr.split("<tr")[1] || "").match(/<td class="gc-cell-num">/g) || [];
  t("trades: คอลัมน์ตัวเลข 6 ช่องเป็น gc-cell-num", trNum.length === 6, trNum.length);
  var thNum = function (tbodyId) {
    var at = HTML.indexOf('id="' + tbodyId + '"'), start = HTML.lastIndexOf("<thead>", at);
    return (HTML.slice(start, at).match(/<th class="gc-cell-num">/g) || []).length;
  };
  t("หัวตาราง ranking 10 / trades 6 ช่องเป็น gc-cell-num ตรงกับแถว", thNum("rankingRows") === 10 && thNum("tradeRows") === 6, [thNum("rankingRows"), thNum("tradeRows")]);

  // ---------------------------------------------------------------- กราฟบนแก้ว
  var eq = P.draws.filter(function (d) { return d.canvas === "equityCanvas"; }), dd = P.draws.filter(function (d) { return d.canvas === "drawdownCanvas"; });
  t("กราฟ: ไม่ทาพื้นขาวทับการ์ดแก้ว (ไม่มี fillRect)", !P.draws.concat(initDraws).some(function (d) { return d.op === "fillRect"; }));
  t("กราฟ drawdown: เส้นคงสีแดงเดิม #c2413a (สีมีความหมาย)", dd.some(function (d) { return d.op === "stroke" && String(d.stroke).toLowerCase() === "#c2413a"; }), dd.filter(function (d) { return d.op === "stroke"; }).map(function (d) { return d.stroke; }));
  t("กราฟ equity: เส้นขาวแบบ Macro (สีเดิมไม่มีความหมาย)", eq.some(function (d) { return d.op === "stroke" && /^(#fff|#ffffff|rgba?\(255, ?255, ?255)/i.test(String(d.stroke)); }), eq.filter(function (d) { return d.op === "stroke"; }).map(function (d) { return d.stroke; }));
  var txt = P.draws.concat(initDraws).filter(function (d) { return d.op === "fillText"; });
  t("กราฟ: ตัวหนังสือบนแก้วสว่าง (ไม่ใช่เทา #6c778c เดิม)", txt.length > 0 && txt.every(function (d) { return !/#6c778c/i.test(String(d.fill)); }), txt.map(function (d) { return d.fill; }).slice(0, 3));
  t("ก่อนรัน: \"No chart data\" ยังวาดอยู่", initDraws.some(function (d) { return d.op === "fillText" && d.args[0] === "No chart data"; }));

  // ---------------------------------------------------------------- ว่าง / กำลังคำนวณ / ล้มเหลว
  var F = boot({ fail: "<img src=x onerror=alert(1)>" });
  var pending = F.run();
  var loading = F.els.summaryCards.innerHTML;
  t("กำลังคำนวณ: empty-box + gc-card gc-neutral", /<div class="empty-box gc-card gc-neutral">กำลังคำนวณ\.\.\.<\/div>/.test(loading), loading);
  await pending;
  var failed = F.els.summaryCards.innerHTML;
  t("ล้มเหลว: empty-box gc-neutral + ข้อความ error ถูก escape", /class="empty-box gc-card gc-neutral"/.test(failed) && /Backtest failed: &lt;img src=x onerror=alert\(1\)&gt;/.test(failed) && !/<img/.test(failed), failed);
  t("HTML เริ่มต้น: empty-box ยังไม่มีผลลัพธ์ = gc-card gc-neutral", /<div class="empty-box gc-card gc-neutral">ยังไม่มีผลลัพธ์<\/div>/.test(HTML));
  var oddOk = await (function () {
    var odd = JSON.parse(JSON.stringify(GOOD)); odd.symbol = "<b>X</b>"; odd.verdict = "<i>v</i>"; odd.trades[0].exitReason = "<u>r</u>";
    odd.periodResults.in_sample.metrics.tradeCount = "<s>9</s>";   // fix round 1: จำนวนเทรดในการ์ดช่วงเวลา
    var B = boot({ payload: { ranking: [odd], results: [odd], generatedAt: "x", errors: [] } });
    return B.run().then(function () {
      var all = B.els.rankingRows.innerHTML + B.els.tradeRows.innerHTML + B.els.summaryCards.innerHTML + B.els.periodCards.innerHTML;
      return !/<b>X|<i>v|<u>r|<s>9/.test(all) && /&lt;b&gt;X/.test(all) && /Trades: &lt;s&gt;9&lt;\/s&gt;/.test(B.els.periodCards.innerHTML);
    });
  })();
  t("escape: symbol / verdict / เหตุผลขาย / จำนวนเทรดของช่วง ใน innerHTML ไม่เป็นแท็ก", oddOk);

  // ---------------------------------------------------------------- HTML: การ์ดคงที่ · ชิ้นกลาง · ไม่ซ้อน
  function tagOf(id) { var m = new RegExp("<[a-z]+\\b[^>]*\\bid=\"" + id + "\"[^>]*>").exec(HTML); return m ? m[0] : ""; }
  function clsOfTag(tag) { var m = /\bclass="([^"]*)"/.exec(tag); return m ? m[1] : ""; }
  var setup = (/<aside class="([^"]*)"/.exec(HTML) || [])[1] || "";
  t("แผงตั้งค่า: setup-panel gc-card gc-neutral", has(setup, "setup-panel") && has(setup, "gc-card") && tone1(setup) === "gc-neutral", setup);
  ["symbolSelect", "strategySelect", "startDateInput", "endDateInput", "capitalInput", "slippageInput", "commissionInput"].forEach(function (id) {
    t("ช่อง #" + id + " = gc-field", has(clsOfTag(tagOf(id)), "gc-field"), tagOf(id));
  });
  t("ปุ่มเริ่ม Backtest = gc-btn (ทึบ) คง run-button", has(clsOfTag(tagOf("runBacktestButton")), "gc-btn") && has(clsOfTag(tagOf("runBacktestButton")), "run-button") && !has(clsOfTag(tagOf("runBacktestButton")), "gc-btn-ghost"));
  ["runUniverseButton", "exportRankingButton", "exportTradesButton", "exportEquityButton"].forEach(function (id) {
    var c = clsOfTag(tagOf(id));
    t("ปุ่ม #" + id + " = gc-btn gc-btn-ghost คง secondary-button", has(c, "gc-btn") && has(c, "gc-btn-ghost") && has(c, "secondary-button"), c);
  });
  var tabRow = (/<div class="([^"]*\btab-row\b[^"]*)"/.exec(HTML) || [])[1] || "";
  t("แถบแท็บ: tab-row gc-card gc-strip gc-neutral", has(tabRow, "gc-card") && has(tabRow, "gc-strip") && tone1(tabRow) === "gc-neutral", tabRow);
  var tabBtns = HTML.match(/<button class="[^"]*\btab-button\b[^"]*"/g) || [];
  t("ปุ่มแท็บ 4 ปุ่ม gc-btn gc-btn-ghost · ปุ่มแรกคง is-active", tabBtns.length === 4 && tabBtns.every(function (b) { return /gc-btn gc-btn-ghost/.test(b); }) && /is-active/.test(tabBtns[0]), tabBtns);
  var charts = HTML.match(/<article class="[^"]*\bchart-card\b[^"]*"/g) || [];
  t("การ์ดกราฟ 2 ใบ chart-card gc-card gc-neutral", charts.length === 2 && charts.every(function (c) { var k = clsOfTag(c + ">"); return has(k, "gc-card") && tone1(k) === "gc-neutral"; }), charts);
  var tw = HTML.match(/<div class="[^"]*\btable-wrap\b[^"]*">\s*<div [^>]*>\s*<table[^>]*>/g) || [];
  t("ตาราง 2 ชุด: table-wrap gc-card gc-neutral > gc-table-wrap (tabindex 0 + aria-label) > table.gc-table", tw.length === 2 && tw.every(function (x) {
    return /class="table-wrap gc-card gc-neutral"/.test(x) && /class="gc-table-wrap"/.test(x) && /tabindex="0"/.test(x) && /aria-label="[^"\d]+"/.test(x) && /<table class="gc-table">/.test(x);
  }), tw);
  var heads = HTML.match(/<div class="[^"]*\bpanel-heading\b[^"]*">/g) || [];
  t("หัว section 4 ตัวบนพื้นหน้า = panel-heading gc-section-h · หัวแผงตั้งค่า (บนการ์ด) ไม่ใช่ gc-section-h",
    heads.length === 5 && heads.filter(function (h) { return /gc-section-h/.test(h); }).length === 4 && !/gc-section-h/.test(heads[0]), heads);
  var secs = HTML.match(/<section id="[a-zA-Z]+" class="[^"]*"/g) || [];
  t("result-section ไม่ใช่การ์ด (การ์ดอยู่ข้างใน)", secs.length === 4 && secs.every(function (s) { return /result-section/.test(s) && !/gc-card/.test(s); }), secs);
  // ไม่มีการ์ดแก้วซ้อน: เดินแท็กเปิด/ปิดทีละตัว (HTML ทั้งหน้า + สิ่งที่ JS วาดลงใน grid)
  function nestedCards(html) {
    var body = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<!--[\s\S]*?-->/g, "");
    var VOID = { input: 1, br: 1, img: 1, meta: 1, link: 1, hr: 1 }, stack = [], nested = [], cards = 0, re = /<(\/?)([a-z0-9]+)\b([^>]*?)(\/?)>/gi, m;
    while ((m = re.exec(body)) !== null) {
      var tag = m[2].toLowerCase();
      if (m[1]) { while (stack.length && stack.pop().tag !== tag) { /* pop */ } continue; }
      if (VOID[tag] || m[4]) continue;
      var card = /\bclass="[^"]*\bgc-card\b/.test(m[3]);
      if (card) cards++;
      if (card && stack.some(function (s) { return s.card; })) nested.push(m[0]);
      stack.push({ tag: tag, card: card });
    }
    return { cards: cards, nested: nested };
  }
  var nh = nestedCards(HTML.slice(HTML.indexOf("<body")));
  t("ไม่มีการ์ดแก้วซ้อนการ์ดแก้วใน HTML (" + nh.cards + " การ์ด)", nh.cards === 7 && nh.nested.length === 0, nh);
  P.pick(1);
  var nj = nestedCards(P.els.summaryCards.innerHTML + P.els.periodCards.innerHTML);
  t("JS: การ์ดที่วาด (6 ตัวเลข + 4 ช่วง) ไม่ซ้อนกัน", nj.cards === 10 && nj.nested.length === 0, nj);

  // ---------------------------------------------------------------- ของเดิมยังอยู่
  var IDS = ["symbolSelect", "strategySelect", "startDateInput", "endDateInput", "capitalInput", "slippageInput", "commissionInput", "runBacktestButton", "runUniverseButton",
    "exportRankingButton", "exportTradesButton", "exportEquityButton", "setupStatus", "summarySection", "resultSubtitle", "summaryCards", "periodCards", "chartsSection",
    "equityCanvas", "drawdownCanvas", "rankingSection", "rankingRows", "tradesSection", "tradesSubtitle", "tradeRows"];
  var missingIds = IDS.filter(function (id) { return (HTML.match(new RegExp('\\sid="' + id + '"', "g")) || []).length !== 1; });
  t("id เดิม 25 ตัวอยู่ครบ ตัวละครั้ง", missingIds.length === 0, missingIds);
  var CLASSES = ["backtest-shell", "backtest-topbar", "backtest-eyebrow", "backtest-subtitle", "backtest-warning", "backtest-nav", "is-active", "backtest-layout", "setup-panel",
    "panel-heading", "form-grid", "two", "button-stack", "run-button", "secondary-button", "export-grid", "setup-status", "results-panel", "tab-row", "tab-button",
    "result-section", "summary-grid", "empty-box", "period-grid", "chart-grid", "chart-card", "table-wrap"];
  var allCls = {}; (HTML.match(/\sclass="[^"]+"/g) || []).forEach(function (s) { s.replace(/\sclass="|"/g, "").split(/\s+/).forEach(function (c) { allCls[c] = 1; }); });
  var lostCls = CLASSES.filter(function (c) { return !allCls[c]; });
  t("คลาสเดิมอยู่ครบ", lostCls.length === 0, lostCls);
  t("aria-label เดิม + data-target เดิม", /aria-label="เมนูหลัก"/.test(HTML) && /aria-label="Export backtest CSV"/.test(HTML) && /aria-label="Backtest sections"/.test(HTML) &&
    ["summarySection", "rankingSection", "tradesSection", "chartsSection"].every(function (x) { return HTML.indexOf('data-target="' + x + '"') >= 0; }));
  var TEXTS = ["Strategy Research", "Backtest Lab", "ห้องทดลองกลยุทธ์ ทดสอบย้อนหลังด้วยข้อมูลราคาในอดีต", "ผลลัพธ์ย้อนหลังไม่รับประกันผลลัพธ์ในอนาคต และหน้านี้ไม่มีการส่งคำสั่งซื้อขายจริง",
    "กลับ Dashboard พอร์ต", "Market Scanner", "Action Center", "Portfolio Position", "Backtest Lab", "Market Risk", "Strategy Setup", "เลือกหุ้น/ETF และสมมติฐานสำหรับ backtest",
    "หุ้น/ETF", "กลยุทธ์", "เริ่ม", "สิ้นสุด", "เงินเริ่มต้น", "ค่า Slippage (%)", "ค่าคอมมิชชั่น", "เริ่ม Backtest", "Run Universe Backtest", "Export Ranking", "Export Trades",
    "Export Equity", "Phase 2 รองรับ US stocks และ ETFs เท่านั้น ยังไม่มี crypto / broker / live trading", "Backtest Results", "Strategy Ranking", "Trade Details", "Equity Curve",
    "Backtest Results", "กดเริ่ม Backtest เพื่อดูผลลัพธ์", "ยังไม่มีผลลัพธ์", "กราฟพอร์ตย้อนหลัง", "Equity curve และ drawdown ของผลลัพธ์ที่เลือก", "Equity Curve", "Drawdown",
    "Strategy Ranking", "จัดอันดับด้วยคะแนนรวม ไม่ใช่อัตราชนะอย่างเดียว", "Symbol", "Strategy", "Full Return %", "In-sample %", "Out-of-sample %", "Recent %", "Win Rate %",
    "Profit Factor", "Max Drawdown %", "Expectancy", "Trade Count", "Strategy Score", "Verdict", "Warning", "รายการซื้อขาย", "แสดงรายการซื้อขายของผลลัพธ์ที่เลือกจาก ranking",
    "Entry", "Exit", "Entry Price", "Exit Price", "Shares", "P/L", "P/L %", "Reason", "Holding Days"];
  var nowTexts = HTML.slice(HTML.indexOf("<body")).replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, "\n").split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
  t("ข้อความเดิมของหน้าเหมือนเดิมทุกตัว ตามลำดับ (" + TEXTS.length + ")", JSON.stringify(nowTexts) === JSON.stringify(TEXTS), nowTexts.length);

  // ---------------------------------------------------------------- Privacy / คำแนะนำ
  var rendered = P.els.summaryCards.innerHTML + P.els.periodCards.innerHTML + P.els.rankingRows.innerHTML + P.els.tradeRows.innerHTML;
  t("ไม่มีตัวเลขใน title / aria-label (HTML + ที่วาด)", !/(title|aria-label)="[^"]*\d/.test(HTML + rendered));
  t("ไม่มีคำแนะนำซื้อขายในข้อความใหม่", !/ควรซื้อ|ควรขาย|น่าซื้อ|น่าขาย|น่าเข้า|แนะนำซื้อ|จุดเข้า|ตัดขาดทุน/.test(HTML + CSS + JS));

  // ---------------------------------------------------------------- HTML head / CSS
  var sheets = [], rs = /<link\b[^>]*rel="stylesheet"[^>]*href="(\/[^"?]+)(?:\?v=([^"]*))?"/g, m2;
  while ((m2 = rs.exec(HTML)) !== null) sheets.push({ f: m2[1], v: m2[2] });
  var iG = sheets.map(function (s) { return s.f; }).indexOf("/glass-cards.css"), iB = sheets.map(function (s) { return s.f; }).indexOf("/backtest.css");
  t("โหลด /glass-cards.css?v=" + GC_V + " ครั้งเดียว ก่อน /backtest.css (หลัง theme.css)", iG > 0 && iG < iB && sheets[iG].v === GC_V && sheets[0].f === "/theme.css" &&
    sheets.filter(function (s) { return s.f === "/glass-cards.css"; }).length === 1, sheets);
  t("โหลด Inter 700", /fonts\.googleapis\.com\/css2\?family=Inter:wght@[^"&]*700/.test(HTML));
  t("bump: backtest.css?v=" + V.css + " · backtest-page.js?v=" + V.js, HTML.indexOf("/backtest.css?v=" + V.css + '"') >= 0 && HTML.indexOf("/backtest-page.js?v=" + V.js + '"') >= 0);
  var CB = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
  t("CSS: โทเคนของหน้าในการ์ด = หมึกแก้ว (--ink/--navy → --gc-ink · --muted → --gc-ink-2 · --line → --gc-line)",
    /\.gc-card\s*\{[^}]*--ink:\s*var\(--gc-ink\)[^}]*\}/.test(CB) && /\.gc-card\s*\{[^}]*--navy:\s*var\(--gc-ink\)/.test(CB) && /\.gc-card\s*\{[^}]*--muted:\s*var\(--gc-ink-2\)/.test(CB) && /\.gc-card\s*\{[^}]*--line:\s*var\(--gc-line\)/.test(CB));
  t("CSS: ลบสีตัวเลขตามสถานะเดิม (.metric-card.good/.bad/.warn strong) — tone ของการ์ดแทน", !/\.metric-card\.(good|bad|warn)\s+strong/.test(CB));
  function ruleBodies(sel) { var out = [], re = /([^{}]+)\{([^{}]*)\}/g, m; while ((m = re.exec(CB)) !== null) if (m[1].split(",").map(function (s) { return s.trim(); }).indexOf(sel) >= 0) out.push(m[2]); return out; }
  var oldSurface = [".metric-card", ".period-card", ".chart-card", ".setup-panel", ".result-section", ".table-wrap", ".tab-row", ".empty-box", ".run-button", ".secondary-button", ".tab-button"].filter(function (s) {
    return ruleBodies(s).some(function (b) { return /(^|;)\s*(background|border|border-radius|box-shadow)\s*:/.test(b); });
  });
  t("CSS: ผิวการ์ด/ปุ่มเก่า (background/border/radius/shadow) ถูกลบ — glass-cards.css วาดแทน", oldSurface.length === 0, oldSurface);
  var bareEl = [];
  (function () { var re = /([^{}]+)\{([^{}]*)\}/g, m; while ((m = re.exec(CB)) !== null) m[1].split(",").forEach(function (s) { s = s.trim(); if (/^(table|th|td|tr|input|select|option|canvas|label|button)$/.test(s)) bareEl.push(s); }); })();
  t("CSS: ไม่มีกฎ element เปล่า ๆ (table/th/td/input/select/canvas/label/button) ที่ทับชิ้นแก้ว", bareEl.length === 0, bareEl);
  t("CSS: ตัวเลือกที่เลือกไว้ใน listbox ยังเห็น (option:checked มีสีของตัวเอง)", /option:checked[^{]*\{[^}]*background/.test(CB));

  console.log("");
  console.log(pass + fail + " checks · " + pass + " passed · " + fail + " failed");
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.error("CRASH " + (e && e.stack || e)); process.exit(1); });
