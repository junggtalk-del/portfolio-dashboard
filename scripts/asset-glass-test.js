"use strict";
// ============================================================
// ASSET 360 (/asset/:symbol) — การ์ดแก้ว (glass-cards.css gc-2)
//   node scripts/asset-glass-test.js
//
// บูต asset-page.js ใน VM (scoring.js + signal-quality.js ของจริง · snapshot สมมุติ · DOM ปลอมของ #asset360)
// แล้วล็อก:
//   · การ์ด → สถานะต้นทาง → tone (สถานะที่หน้าคำนวณอยู่แล้วเท่านั้น · ไม่มีสถานะ → gc-neutral):
//       hero  Latest Price (upDown ของเปลี่ยนวันนี้)  mc-up → calm · mc-down → danger · ไม่มี → neutral
//             Signal Score (timing.grade)  A/B → calm · C/D → warning · E → danger · ไม่มีคะแนน → neutral
//             Action (action.key) = สีของการ์ด /action-center ที่ลิงก์มา: การ์ดหุ้นที่ถือ (positionVerdict) · key ที่ไม่มีคำตัดสิน → การ์ดตัดสินใจ (decisionTone)
//             Portfolio Weight / Status → neutral
//       Investment Thesis (th.score)  ≥70 → calm · ≥55 → warning · ต่ำกว่า → danger
//       Signal & Action (signal.tone)  bull → calm · watch-bull / neutral → normal · watch-bear → warning · bear → danger · waiting → neutral
//       Technical Indicators (แต่ละ tile)  EMA bull → calm · bear → warning · SMA200 above → calm · below → danger ·
//             RSI แข็งแรง → calm · กลาง → normal · อ่อนแรง/Overbought/Oversold → warning · วอลุ่ม ≥1x → calm · <1x → normal · ไม่มีข้อมูล → neutral
//       Data Quality  ป้ายข้อมูลเริ่มเก่า → warning · สด → neutral
//       Asset Snapshot · Price Chart · Portfolio Impact · Underlying Exposure · Signal History → neutral
//   · ไม่มีแก้วซ้อนแก้ว · ทุกการ์ด tone เดียว · หัว Technical Indicators อยู่บนพื้นหน้า (gc-section-h) · ตาราง gc-table ใน gc-table-wrap
//   · Privacy Lock: มูลค่าถือครอง ($ / ตัวเลขเปล่า ที่ privacy.js ซ่อนไม่ได้) ตอนล็อก = XXX · ไม่มีเงินใน title / aria-label · ปลดล็อก → ค่ากลับ
//   · HTML / CSS: glass-cards.css ก่อน asset.css · Inter 700 · เวอร์ชัน bump · ผิวเก่า (mc-glow / mc-metric ธีมสว่าง) ถูกปิดใต้การ์ดแก้ว
//     ที่ mission-control.css (ไฟล์กลาง) — asset.css ไม่มีสำเนาซ้ำ
// ============================================================
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var ROOT = path.join(__dirname, "..");
var PUB = path.join(ROOT, "public");
function read(f) { return fs.readFileSync(path.join(PUB, f), "utf8"); }
var maskText = require("../public/privacy.js").maskText;

var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; return; }
  fail++;
  console.error("  ✗ " + name + (extra !== undefined ? "  → " + JSON.stringify(extra) : ""));
}

var TONES = ["gc-calm", "gc-normal", "gc-warning", "gc-danger", "gc-neutral"];
var GC_V = "20261121-gc-2";
var V = { css: "20261122-asset-4", js: "20261122-a360-6" };

// ---------------------------------------------------------------- snapshot สมมุติ (NVDA · ขาขึ้น · ถือครอง)
var N = 260;
function dateList(n) {
  var out = [], t0 = Date.UTC(2025, 7, 1);
  for (var i = 0; i < n; i++) out.push(new Date(t0 + i * 86400000).toISOString().slice(0, 10));
  return out;
}
function snap(o) {
  o = o || {};
  var closes = [];
  for (var i = 0; i < N; i++) closes.push(Math.round((100 + i * 0.3) * 100) / 100);
  if (o.lastDown) closes[N - 1] = closes[N - 2] - 2;
  if (o.oneClose) closes = [closes[N - 1]];
  var ds = dateList(closes.length);
  var tech = {
    latestClose: closes[closes.length - 1], latestDate: ds[ds.length - 1], ema12: 170, ema26: 165, sma200: 150, rsi14: 50,
    volumeRatio: 1.2, emaStatus: "EMA_BULLISH", sma200Status: "ABOVE_SMA200", daysSinceEmaBullishCross: 20
  };
  Object.keys(o.tech || {}).forEach(function (k) { tech[k] = o.tech[k]; });
  return {
    dataVersion: "2026-06-portfolio-dashboard-v1", loadedAt: new Date().toISOString(),
    assets: [{ ticker: "NVDA", canonicalSymbol: "NVDA", displaySymbol: "NVDA", name: "NVIDIA", asset_type: "US Stock" }],
    historicalData: { NVDA: { closes: closes, dates: ds, volumes: closes.map(function () { return 1000000; }), latestClose: tech.latestClose, source: "Synthetic" } },
    technicalSignals: { NVDA: tech },
    rsiSignals: { NVDA: { rsi14: tech.rsi14, signal: "NEUTRAL" } },
    portfolioHoldings: { data: o.noHolding ? [] : [{ canonicalSymbol: "NVDA", isHolding: true, marketValue: 1234567, targetWeight: 12.5, quantity: 100, averageCost: 120.5 }] },
    exposureMap: { assetExposures: { NVDA: { tags: ["AI", "Semis"] }, AMD: { tags: ["Semis"] } } },
    marketRisk: { risk: { level: { label: "Normal" } } }
  };
}
var THESIS = { ticker: "NVDA", score: 80, statusLabel: "แข็งแรง", trendThai: "ดีขึ้น", answer: "YES", decisionLabel: "ถือได้", decisionThai: "ทดสอบ", valLevel: "FAIR", dipClassLabel: "ย่อปกติ", stale: false };

// ---------------------------------------------------------------- VM
function boot() {
  var winL = {}, docL = {};
  var S = { snap: snap(), fresh: { key: "fresh", thai: "ข้อมูลสด" }, thesis: null, action: null, locked: false, toneOf: null, grade: null };
  var root = { id: "asset360", innerHTML: "" };
  var doc = {
    readyState: "complete",
    getElementById: function (id) { return id === "asset360" ? root : null; },
    addEventListener: function (ty, fn) { (docL[ty] = docL[ty] || []).push(fn); }, removeEventListener: function () {},
    querySelector: function () { return null; }, querySelectorAll: function () { return []; }
  };
  var win = {
    document: doc, location: { pathname: "/asset/NVDA", hostname: "localhost", search: "" },
    addEventListener: function (ty, fn) { (winL[ty] = winL[ty] || []).push(fn); }, removeEventListener: function () {},
    fetch: function () { return Promise.resolve({ ok: false, json: function () { return Promise.resolve(null); } }); },
    console: { log: function () {}, debug: function () {}, warn: function () {}, error: console.error },
    PortfolioDataSnapshot: {
      read: function () { return S.snap; },
      freshness: function () { return S.fresh; }
    },
    ThesisReconcile: {
      VAL_TH: { FAIR: "ราคาเหมาะสม" },
      // action ไม่ null = ผลชั่ง Thesis ที่หน้าใช้แทน action ของ Scoring (เส้นทางจริงของหน้า)
      forAsset: function () { return { thesis: S.thesis, action: S.action, note: null }; }
    },
    PortfolioPrivacy: { isLocked: function () { return S.locked; } },
    Math: Math, JSON: JSON, Date: Date, Number: Number, String: String, Object: Object, Array: Array, Boolean: Boolean,
    isFinite: isFinite, isNaN: isNaN, parseInt: parseInt, parseFloat: parseFloat, Promise: Promise, RegExp: RegExp,
    Error: Error, encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent, setTimeout: setTimeout, clearTimeout: clearTimeout, Intl: Intl
  };
  win.window = win; win.self = win; win.globalThis = win;
  var ctx = vm.createContext(win);
  var loaded = true;
  ["scoring.js", "signal-quality.js"].forEach(function (f) {
    try { vm.runInContext(read(f), ctx, { filename: f }); } catch (e) { loaded = false; console.error("   โหลด " + f + " ไม่ได้: " + e.message); }
  });
  // ผลของ engine ที่หน้าอ่านถูกแก้ทีละกรณี (tone ของสัญญาณ · grade ของคะแนน) — ทดสอบการ map สถานะ → tone
  var Sc = win.Scoring, realClassify = Sc && Sc.classifySignal, realScore = Sc && Sc.scoreAsset;
  if (Sc) {
    Sc.classifySignal = function (input) { var r = realClassify(input); if (S.toneOf) r.tone = S.toneOf; return r; };
    Sc.scoreAsset = function (input, opts) {
      var r = realScore(input, opts);
      if (S.grade === "none") r.timing.score = null;
      else if (S.grade) r.timing.grade = S.grade;
      return r;
    };
  }
  try { vm.runInContext(read("asset-page.js"), ctx, { filename: "asset-page.js" }); } catch (e) { loaded = false; console.error("   โหลด asset-page.js ไม่ได้: " + e.message); }
  return {
    S: S, root: root, loaded: loaded, win: win,
    html: function () { return root.innerHTML; },
    rerender: function () { (winL["portfolio-data-snapshot"] || []).forEach(function (fn) { fn({}); }); return root.innerHTML; },
    privacyChanged: function () { (docL["portfolio-privacy-changed"] || []).forEach(function (fn) { fn({}); }); return root.innerHTML; },
    hasPrivacyListener: function () { return (docL["portfolio-privacy-changed"] || []).length > 0; }
  };
}

// ---------------------------------------------------------------- อ่านการ์ดจาก HTML
function parseAttrs(tag) {
  var out = {}, re = /\s([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:="([^"]*)")?/g, m;
  while ((m = re.exec(tag)) !== null) out[m[1]] = m[2] === undefined ? "" : m[2];
  return out;
}
function cards(h) {
  var out = [], re = /<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, m;
  while ((m = re.exec(h)) !== null) {
    var a = parseAttrs(m[0]);
    if (a["class"] === undefined) continue;
    var cls = a["class"].split(/\s+/).filter(Boolean);
    if (cls.indexOf("gc-card") >= 0) out.push({ cls: cls, raw: m[0], at: m.index });
  }
  return out;
}
function toneOf(c) {
  if (!c) return "MISSING";
  var tt = c.cls.filter(function (k) { return TONES.indexOf(k) >= 0; });
  return tt.length === 1 ? tt[0] : (tt.length ? "MULTI:" + tt.join("+") : "NONE");
}
function cardsBy(h, k) { return cards(h).filter(function (c) { return c.cls.indexOf(k) >= 0; }); }
// การ์ดที่ข้อความ text อยู่ระหว่างแท็กเปิดของมันกับการ์ดใบถัดไป (การ์ดไม่ซ้อนกัน)
function cardWith(h, text) {
  var cs = cards(h);
  for (var i = 0; i < cs.length; i++) {
    var seg = h.slice(cs[i].at, i + 1 < cs.length ? cs[i + 1].at : h.length);
    if (seg.indexOf(text) >= 0) return cs[i];
  }
  return null;
}
var VOID = { input: 1, br: 1, img: 1, meta: 1, link: 1, hr: 1, col: 1, source: 1, wbr: 1, line: 1, rect: 1, polyline: 1 };
function nestedGlass(h) {
  var stack = [], bad = [], re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, m;
  while ((m = re.exec(h)) !== null) {
    var tag = m[2].toLowerCase();
    if (m[1] === "/") {
      for (var i = stack.length - 1; i >= 0; i--) if (stack[i].tag === tag) { stack.length = i; break; }
      continue;
    }
    if (VOID[tag] || /\/\s*$/.test(m[3])) continue;
    var glass = /(^|\s)class="[^"]*\bgc-card\b/.test(m[3]);
    if (glass && stack.some(function (s) { return s.glass; })) bad.push(m[0].slice(0, 80));
    stack.push({ tag: tag, glass: glass });
  }
  return bad;
}
function maskedText(h) { return h.split(/<[^>]*>/).map(function (s) { return maskText(s); }).join("\n"); }
var MONEY_TXT = /฿\s?[−-]?\d|\d{1,3}(?:,\d{3})+|\d\s?(?:บาท|THB)/;
function moneyAttrs(h) {
  var out = [], re = /\s(title|aria-label)="([^"]*)"/g, m;
  while ((m = re.exec(h)) !== null) if (MONEY_TXT.test(m[2])) out.push(m[1] + "=" + m[2].slice(0, 60));
  return out;
}

// ================================================================ 0 · โหลด + โครง
var A = boot();
var h = A.html();
t("โหลด scoring.js + signal-quality.js + asset-page.js ใน VM แล้ววาดหน้า", A.loaded && h.length > 3000 && /Asset 360/.test(h), h.slice(0, 200));
t("ทุกการ์ดเป็นแก้ว tone เดียว · ไม่ซ้อนกัน", cards(h).length >= 14 && cards(h).every(function (c) { return toneOf(c).indexOf("gc-") === 0; }) && nestedGlass(h).length === 0,
  { n: cards(h).length, bad: cards(h).filter(function (c) { return toneOf(c).indexOf("gc-") !== 0; }).map(function (c) { return c.raw; }), nested: nestedGlass(h) });
t("คลาส / id / ข้อความเดิมยังอยู่ (mc-card mc-panel · a360Chart · a360Range · หัว panel)", /id="a360Chart"/.test(h) && /id="a360Range"/.test(h) &&
  ["Asset Snapshot", "Price Chart", "Signal &amp; Action", "Technical Indicators", "Portfolio Impact", "Underlying Exposure", "Signal History", "Data Quality"].every(function (s) { return h.indexOf("<h2>" + s + "</h2>") >= 0; }) &&
  (h.match(/class="mc-card mc-panel mc-fade/g) || []).length === 8);

// ================================================================ 1 · hero
var metrics = cardsBy(h, "mc-metric");
t("hero: 4 ช่องเป็น gc-card gc-tile (คง mc-card mc-metric mc-glow)", metrics.length === 4 && metrics.every(function (c) { return ["mc-card", "mc-metric", "mc-glow", "gc-tile"].every(function (k) { return c.cls.indexOf(k) >= 0; }); }), metrics.map(function (c) { return c.cls.join(" "); }));
t("hero: Portfolio Weight = neutral", toneOf(metrics[3]) === "gc-neutral", metrics.map(toneOf));
t("hero: Action fixture จริง (ถือ · ขาขึ้นต่อเนื่อง → HOLD_ADD ถือต่อ) → calm", toneOf(metrics[1]) === "gc-calm" && /ถือต่อ/.test(h), toneOf(metrics[1]));
t("hero: หัวหน้าอยู่บนพื้นหน้า (mc-page-hero ไม่ใช่การ์ด)", /<section class="mc-page-hero mc-fade">/.test(h));
t("hero: ราคา / คะแนน / น้ำหนัก เป็นตัวเลข gc-num", (h.match(/class="mc-value gc-num gc-num-s"/g) || []).length === 3);
t("hero: ราคาขึ้นวันนี้ (mc-up) → calm", toneOf(metrics[0]) === "gc-calm" && /mc-delta mc-up/.test(h), toneOf(metrics[0]));
A.S.snap = snap({ lastDown: true });
t("hero: ราคาลงวันนี้ (mc-down) → danger", toneOf(cardsBy(A.rerender(), "mc-metric")[0]) === "gc-danger" && /mc-delta mc-down/.test(A.html()));
A.S.snap = snap({ oneClose: true });
t("hero: ไม่มีราคาก่อนหน้า → neutral", toneOf(cardsBy(A.rerender(), "mc-metric")[0]) === "gc-neutral");
A.S.snap = snap({ noHolding: true });
var hW = A.rerender();
t("hero: ไม่ได้ถือ → ช่อง Status (Watchlist) = neutral", toneOf(cardsBy(hW, "mc-metric")[3]) === "gc-neutral" && /Watchlist/.test(hW));
// แถว watchlist ไม่มีการ์ดหุ้นที่ถือบน /action-center — การ์ดตัดสินใจ (code watch → gc-warning) คือการ์ดเดียวที่ลิงก์มา
t("hero: Action fixture จริงแบบไม่ได้ถือ (ขาขึ้นต่อเนื่อง → BUY_FIRST_WAIT_VOLUME ตามเทรนด์ / รอย่อ) → warning = การ์ดตัดสินใจ /action-center",
  toneOf(cardsBy(hW, "mc-metric")[1]) === "gc-warning" && /ตามเทรนด์ \/ รอย่อ/.test(hW), toneOf(cardsBy(hW, "mc-metric")[1]));
A.S.snap = snap();
// fixture จริง: EMA บวก + เหนือ SMA200 + วอลุ่ม 1.2x → 35 + 25 + 9 = 69 → grade C
t("hero: Signal Score fixture จริง (69 · grade C) → warning", toneOf(cardsBy(A.rerender(), "mc-metric")[2]) === "gc-warning" && />69</.test(A.html()), toneOf(cardsBy(A.html(), "mc-metric")[2]));
[["A", "gc-calm"], ["B", "gc-calm"], ["C", "gc-warning"], ["D", "gc-warning"], ["E", "gc-danger"], ["none", "gc-neutral"]].forEach(function (p) {
  A.S.grade = p[0];
  var c = cardsBy(A.rerender(), "mc-metric")[2];
  t("hero: Signal Score grade " + p[0] + " → " + p[1], toneOf(c) === p[1], toneOf(c));
});
A.S.grade = null;

// ---- Action (hero) = action.key → tone เดียวกับการ์ดของ /action-center: การ์ดหุ้นที่ถือ (positionVerdict → GC_POS_TONE)
//      key ที่ positionVerdict ไม่มีคำตัดสิน → การ์ดตัดสินใจ (ACTION_CODE code → decisionTone → GC_DECISION_TONE · watch → warning)
function actionTile(key) {
  A.S.action = key === null ? null : { key: key, action: "Test", thaiAction: "ทดสอบ " + key };
  var c = cardsBy(A.rerender(), "mc-metric")[1];
  A.S.action = null;
  return toneOf(c);
}
[["SELL_ALL", "gc-danger"], ["SELL_FIRST", "gc-danger"], ["REVIEW_THESIS", "gc-danger"], ["BUY_DIP", "gc-calm"], ["BUY_MORE", "gc-calm"], ["HOLD_ADD", "gc-calm"],
  ["HOLD_CORE", "gc-warning"], ["HOLD_LIMIT", "gc-warning"], ["WATCH_CLOSELY", "gc-warning"],
  ["BUY_FIRST_WAIT_VOLUME", "gc-warning"], ["BUY_FIRST_SMALL", "gc-warning"], ["WATCH_WAIT", "gc-warning"],
  ["DATA_WAITING", "gc-neutral"], ["AVOID_WAIT", "gc-neutral"], ["SOME_NEW_KEY", "gc-neutral"]].forEach(function (p) {
  t("hero: Action " + p[0] + " → " + p[1], actionTile(p[0]) === p[1], actionTile(p[0]));
});
(function () {
  var realAFS = A.win.Scoring.actionFromSignal;
  A.win.Scoring.actionFromSignal = function () { throw new Error("probe"); };
  var c = cardsBy(A.rerender(), "mc-metric")[1];
  A.win.Scoring.actionFromSignal = realAFS;
  t("hero: ไม่มี action (\"—\") → neutral", toneOf(c) === "gc-neutral" && /<div class="mc-value" style="font-size:24px;">—<\/div>/.test(A.html()), toneOf(c));
})();
// drift: อ่านซอร์สของ /action-center แล้วเทียบทุก key ที่ Scoring / ThesisReconcile ให้ได้ กับการ์ดของ /action-center ที่ลิงก์มา /asset
//   key ที่ positionVerdict ให้คำตัดสิน (rank 0–2) → การ์ดหุ้นที่ถือ  gcPosTone(row, positionVerdict(row)) → GC_POS_TONE
//   key ที่ positionVerdict ไม่มีคำตัดสิน (⚪ rank 3) → การ์ดตัดสินใจ  ACTION_CODE[key].code → decisionTone → gcDecisionTone → GC_DECISION_TONE
//     (แถว watchlist ไม่มีการ์ดหุ้นที่ถือ) · key จริงทุกตัวต้องอยู่ใน ACTION_CODE ไม่งั้นการ์ดตัดสินใจตกไปค่าตั้งต้นของมันเอง → นับเป็น drift
//   key สมมุติ ("" / SOME_NEW_KEY) ที่ /action-center ไม่รู้จัก → การ์ดหุ้นที่ถือ ⚪ (/asset ไม่ประดิษฐ์สถานะ → neutral)
var AC = (function () {
  var src = read("action-center-page.js").replace(/\r\n/g, "\n");
  // ตั้งแต่บรรทัด start ถึงบรรทัดปิด end ตัวแรกหลัง after (หาไม่เจอ → null)
  function cut(start, after, end) {
    var i0 = src.indexOf(start), j = i0 < 0 ? -1 : src.indexOf(after, i0), i1 = j < 0 ? -1 : src.indexOf(end, j + 1);
    return i0 < 0 || i1 < 0 ? null : src.slice(i0 + 1, i1 + end.length - 1);
  }
  var parts = [
    cut("\n  var GC_POS_TONE = ", "\n  function gcPosTone(", "\n  }\n"), // GC_*_TONE + gcTone · isFallbackHold · gcDecisionTone · gcPosTone
    cut("\n  const ACTION_CODE = {", "\n  const ACTION_CODE = {", "\n  };\n"),
    cut("\n  function positionVerdict(row) {", "\n  function positionVerdict(row) {", "\n  }\n"),
    cut("\n  function decisionTone(row) {", "\n  function decisionTone(row) {", "\n  }\n")
  ];
  if (parts.some(function (p) { return !p; })) return null;
  var ctx = vm.createContext({});
  vm.runInContext(parts.join("\n") + "\nthis.api = { ACTION_CODE: ACTION_CODE, positionVerdict: positionVerdict, decisionTone: decisionTone, gcPosTone: gcPosTone, gcDecisionTone: gcDecisionTone };", ctx);
  return ctx.api;
})();
var PROBE_KEYS = ["", "SOME_NEW_KEY"];
var RECON_KEYS = (function () { var out = [], re = /\bkey: "([A-Z_]+)"/g, m, s = read("thesis-reconcile.js"); while ((m = re.exec(s)) !== null) if (out.indexOf(m[1]) < 0) out.push(m[1]); return out; })();
var REAL_KEYS = Object.keys(A.win.Scoring.ACTION_META).concat(RECON_KEYS).filter(function (k, i, a) { return a.indexOf(k) === i; });
var ACTION_KEYS = REAL_KEYS.concat(PROBE_KEYS);
function acCard(k) {
  var row = { decision: { actionKey: k } }, v = AC.positionVerdict(row);
  if (v.rank < 3 || PROBE_KEYS.indexOf(k) >= 0) return { card: "การ์ดหุ้นที่ถือ", tone: AC.gcPosTone(row, v) };
  if (!Object.prototype.hasOwnProperty.call(AC.ACTION_CODE, k)) return { card: "การ์ดตัดสินใจ", tone: "ไม่มีใน ACTION_CODE" };
  var d = { decision: { action: AC.ACTION_CODE[k].code, actionKey: k } };
  return { card: "การ์ดตัดสินใจ", tone: AC.gcDecisionTone(d, AC.decisionTone(d)) };
}
var viaDecision = !AC ? [] : ACTION_KEYS.filter(function (k) { return acCard(k).card === "การ์ดตัดสินใจ"; });
var drift = !AC ? ["อ่าน GC_*_TONE / ACTION_CODE / positionVerdict / decisionTone จาก action-center-page.js ไม่ได้"] :
  ACTION_KEYS.filter(function (k) { return actionTile(k) !== acCard(k).tone; }).map(function (k) { var c = acCard(k); return k + ": asset " + actionTile(k) + " ≠ action-center " + c.card + " " + c.tone; });
t("hero: Action tone = /action-center ทุก key (" + ACTION_KEYS.length + " keys · Scoring.ACTION_META + ThesisReconcile) — การ์ดหุ้นที่ถือ positionVerdict → GC_POS_TONE · " +
  "ไม่มีคำตัดสิน → การ์ดตัดสินใจ decisionTone → GC_DECISION_TONE (" + viaDecision.join(" · ") + ")",
  !!AC && RECON_KEYS.length >= 4 && REAL_KEYS.length >= 14 && drift.length === 0 &&
  ["BUY_FIRST_WAIT_VOLUME", "BUY_FIRST_SMALL", "WATCH_WAIT"].every(function (k) { return viaDecision.indexOf(k) >= 0; }), drift);

// ================================================================ 2 · Signal & Action (signal.tone)
var sigCard = function () { return cardWith(A.rerender(), "<h2>Signal &amp; Action</h2>"); };
t("Signal & Action: fixture จริง (ขาขึ้นต่อเนื่อง · tone bull) → calm", toneOf(sigCard()) === "gc-calm" && /signal-state-chip sig-bull/.test(A.html()), toneOf(sigCard()));
[["bull", "gc-calm"], ["watch-bull", "gc-normal"], ["neutral", "gc-normal"], ["watch-bear", "gc-warning"], ["bear", "gc-danger"], ["waiting", "gc-neutral"]].forEach(function (p) {
  A.S.toneOf = p[0];
  t("Signal & Action: signal " + p[0] + " → " + p[1], toneOf(sigCard()) === p[1], toneOf(sigCard()));
});
A.S.toneOf = null;

// ================================================================ 3 · Investment Thesis (th.score)
t("Thesis: ไม่มี thesis → ไม่มีการ์ด thesis", A.rerender().indexOf("Investment Thesis") < 0);
function thesisCard(score) {
  A.S.thesis = JSON.parse(JSON.stringify(THESIS)); A.S.thesis.score = score;
  var c = cardWith(A.rerender(), "Investment Thesis");
  A.S.thesis = null;
  return c;
}
// แถบเดียวกับ /thesis §2 + การ์ดเทียบ: Very Strong / Strong → calm · Neutral → normal · Weak → warning · Broken → danger
[[90, "gc-calm"], [70, "gc-calm"], [69, "gc-normal"], [60, "gc-normal"], [55, "gc-normal"], [54, "gc-warning"], [40, "gc-warning"], [39, "gc-danger"], [30, "gc-danger"], [null, "gc-neutral"]].forEach(function (p) {
  var c = thesisCard(p[0]);
  t("Thesis: score " + p[0] + " → " + p[1] + " (คง mc-card mc-glow)", !!c && toneOf(c) === p[1] && c.cls.indexOf("mc-glow") >= 0, c && c.cls);
});
// drift: thesis-engine.js thesisStatus(score).key → GC_THESIS ที่อ่านจากซอร์สของ thesis-page.js (และ thesis-compare.js ต้องเหมือนกัน)
var GC_THESIS_OF = function (file) {
  var m = /\n  var GC_THESIS = (\{[^}]*\});/.exec(read(file).replace(/\r\n/g, "\n"));
  return m ? vm.runInNewContext("(" + m[1] + ")") : null;
};
var GT = GC_THESIS_OF("thesis-page.js"), GTC = GC_THESIS_OF("thesis-compare.js");
var TE = require("../public/thesis-engine.js");
var thDrift = [];
if (GT && TE && typeof TE.thesisStatus === "function") {
  for (var sc = 0; sc <= 100; sc++) {
    var want = GT[TE.thesisStatus(sc).key] || "gc-neutral", got = toneOf(thesisCard(sc));
    if (got !== want) thDrift.push(sc + ": asset " + got + " ≠ thesis " + want);
  }
}
t("Thesis: ทุกคะแนน 0–100 = /thesis (thesisStatus ของ engine → GC_THESIS ของ thesis-page.js) · thesis-compare.js ใช้ map เดียวกัน",
  !!GT && !!GTC && JSON.stringify(GT) === JSON.stringify(GTC) && typeof TE.thesisStatus === "function" && thDrift.length === 0, thDrift.slice(0, 6));

// ================================================================ 4 · Technical Indicators (tile ละ tone)
function tiles(o) { A.S.snap = snap({ tech: o }); return cardsBy(A.rerender(), "a360-ind").map(toneOf); }
var t0 = tiles({});
t("Indicators: 4 tile แก้ว (EMA · SMA200 · RSI · วอลุ่ม) · fixture จริง bull · above · RSI 50 กลาง · 1.2x", t0.join() === "gc-calm,gc-calm,gc-normal,gc-calm", t0);
t("Indicators: ตัวห่ออยู่บนพื้นหน้า (a360-tiles ไม่ใช่แก้ว) · หัว gc-section-h", /<section class="mc-card mc-panel mc-fade a360-tiles"><div class="mc-panel-head gc-section-h">/.test(A.html()) &&
  cardsBy(A.html(), "a360-tiles").length === 0);
t("Indicators: EMA_BEARISH → warning · BELOW_SMA200 → danger", tiles({ emaStatus: "EMA_BEARISH", ema12: 160, sma200Status: "BELOW_SMA200", sma200: 200 }).slice(0, 2).join() === "gc-warning,gc-danger");
t("Indicators: EMA / SMA200 ไม่มีข้อมูล → neutral", tiles({ emaStatus: "EMA_NOT_AVAILABLE", ema12: null, ema26: null, sma200Status: "SMA200_NOT_AVAILABLE", sma200: null }).slice(0, 2).join() === "gc-neutral,gc-neutral");
[[65, "gc-calm"], [50, "gc-normal"], [35, "gc-warning"], [75, "gc-warning"], [25, "gc-warning"], [null, "gc-neutral"]].forEach(function (p) {
  t("Indicators: RSI " + p[0] + " → " + p[1], tiles({ rsi14: p[0] })[2] === p[1], tiles({ rsi14: p[0] })[2]);
});
[[1.4, "gc-calm"], [1, "gc-calm"], [0.7, "gc-normal"], [null, "gc-neutral"]].forEach(function (p) {
  t("Indicators: วอลุ่ม " + p[0] + " → " + p[1], tiles({ volumeRatio: p[0] })[3] === p[1], tiles({ volumeRatio: p[0] })[3]);
});
t("Indicators: ตัวเลข RSI / วอลุ่ม เป็น gc-num", (A.html().match(/class="a360-big gc-num"/g) || []).length === 2);
A.S.snap = snap();

// ================================================================ 5 · การ์ดที่ไม่มีสถานะ + Data Quality
var h5 = A.rerender();
var neutralTitles = ["Asset Snapshot", "Price Chart", "Portfolio Impact", "Underlying Exposure", "Signal History", "Data Quality"];
var nt = neutralTitles.map(function (s) { return toneOf(cardWith(h5, "<h2>" + s + "</h2>")); });
t("ไม่มีสถานะ → neutral: Snapshot · Chart · Impact · Exposure · History · Data Quality (ข้อมูลสด)", nt.every(function (x) { return x === "gc-neutral"; }), nt);
A.S.fresh = { key: "stale", thai: "ข้อมูลเริ่มเก่า" };
var hS = A.rerender();
t("Data Quality: ข้อมูลเริ่มเก่า (ป้ายเตือนเดิม) → warning", toneOf(cardWith(hS, "<h2>Data Quality</h2>")) === "gc-warning" && /ข้อมูลเริ่มเก่า ควรกด Load Latest Data/.test(hS));
A.S.fresh = { key: "fresh", thai: "ข้อมูลสด" };
var h6 = A.rerender();
t("Signal History: gc-table ใน gc-table-wrap ที่โฟกัสได้ (aria-label ไม่มีเงิน) · คอลัมน์ตัวเลข gc-cell-num",
  /<div class="gc-table-wrap" tabindex="0" role="region" aria-label="ประวัติสัญญาณ"><table class="a360-table gc-table">/.test(h6) && (h6.match(/class="num gc-cell-num"/g) || []).length >= 2);
t("Price Chart: ปุ่มช่วง = gc-btn gc-btn-ghost · คง data-range + is-active ที่ 1M", /<button class="gc-btn gc-btn-ghost is-active" data-range="1M">1M<\/button>/.test(h6) &&
  (h6.match(/<button class="gc-btn gc-btn-ghost[^"]*" data-range="/g) || []).length === 6);
t("Price Chart: สีแท่ง / เส้นที่มีความหมายคงเดิม (legend)", /background:#10b981/.test(h6) && /background:#f43f5e/.test(h6) && /background:#f59e0b/.test(h6) && /background:#a855f7/.test(h6));

// ================================================================ 6 · Privacy Lock
t("ฟัง portfolio-privacy-changed บน document แล้ววาดใหม่", A.hasPrivacyListener());
var hU = A.rerender();
t("ปลดล็อก: มูลค่าถือครองแสดงครบ 3 จุด (hero · Snapshot · Impact) เหมือนเดิม", (hU.match(/1,234,567/g) || []).length === 3 && /\$1,234,567/.test(hU), (hU.match(/1,234,567/g) || []).length);
A.S.locked = true;
var hL = A.privacyChanged();
t("ล็อก: ไม่มีมูลค่าถือครองใน HTML เลย ($ และตัวเลขเปล่าที่ privacy.js ซ่อนไม่ได้) → XXX", hL.indexOf("1,234,567") < 0 && /\$XXX/.test(hL) && />XXX<\/div>/.test(hL));
t("ล็อก: ข้อความที่เห็น (หลัง maskText) ไม่มีเงิน ฿", !/฿\s?[−-]?\d/.test(maskedText(hL)));
t("ไม่มีเงินใน title / aria-label (ล็อกและปลดล็อก)", moneyAttrs(hL).length === 0 && moneyAttrs(hU).length === 0, moneyAttrs(hU));
A.S.locked = false;
t("ปลดล็อก → ค่ากลับมา", (A.privacyChanged().match(/1,234,567/g) || []).length === 3);

// ================================================================ 7 · ยังไม่มี snapshot
A.S.snap = null;
var hN = A.rerender();
t("ไม่มี snapshot: การ์ด neutral + ปุ่ม Load = gc-btn (คง mc-btn mc-btn-primary + id)", /<section class="mc-card mc-panel gc-card gc-neutral"><div class="mc-empty">/.test(hN) &&
  /<button class="mc-btn mc-btn-primary gc-btn" id="a360Load" type="button">Load Latest Data<\/button>/.test(hN) && nestedGlass(hN).length === 0);

// ================================================================ 8 · HTML / CSS / ซอร์ส
var HTML = read("asset.html");
function sheets(html) { var out = [], re = /<link rel="stylesheet" href="\/([a-z0-9.-]+\.css)\?v=([^"]+)"/g, m; while ((m = re.exec(html)) !== null) out.push(m[1] + "@" + m[2]); return out; }
var sh = sheets(HTML), files = sh.map(function (s) { return s.split("@")[0]; });
t("asset.html: theme.css → mission-control.css → glass-cards.css (" + GC_V + " ครั้งเดียว) → asset.css", files.indexOf("theme.css") === 0 && files.indexOf("mission-control.css") < files.indexOf("glass-cards.css") &&
  files.indexOf("glass-cards.css") < files.indexOf("asset.css") && sh.filter(function (s) { return s === "glass-cards.css@" + GC_V; }).length === 1 && files.filter(function (f) { return f === "glass-cards.css"; }).length === 1, sh);
t("asset.html: Inter 700", /fonts\.googleapis\.com\/css2\?family=Inter:wght@[^"&]*700/.test(HTML));
t("asset.html: เวอร์ชัน bump (asset.css " + V.css + " · asset-page.js " + V.js + ")", sh.indexOf("asset.css@" + V.css) >= 0 && HTML.indexOf('src="/asset-page.js?v=' + V.js + '"') >= 0);
var CSS = read("asset.css"), CSSB = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
// ผิวเก่าใต้การ์ดแก้วปิดที่ไฟล์กลาง mission-control.css แล้ว (2026-11-22 integration) — asset.css ไม่ต้องมีสำเนา
var MCB = read("mission-control.css").replace(/\/\*[\s\S]*?\*\//g, "");
t("ผิวเก่าใต้การ์ดแก้วถูกปิดที่ mission-control.css (blur · mc-glow layer · หน้าขาวของ mc-metric ธีมสว่างข้าม .gc-card) · asset.css ไม่มีสำเนาซ้ำ",
  /\.mc-card\.gc-card,\s*\.gc-card \.mc-card \{[^}]*(^|[^-])backdrop-filter: none/.test(MCB) && /\.mc-glow\.gc-card::before \{ content: none; \}/.test(MCB) &&
  /html\[data-theme="light"\] \.mc-metric:not\(\.gc-card\) \{ background: #ffffff; \}/.test(MCB) &&
  !/\.asset-360 \.mc-card\.gc-card|\.asset-360 \.mc-glow\.gc-card|\.asset-360 \.mc-metric\.gc-card/.test(CSSB));
t("asset.css: ปุ่ม mc-btn + gc-btn (#a360Load) ไม่ยก / ไม่เรือง cyan ตอน hover (แบบ /home · (0,3,0) ชนะ .mc-btn-primary:hover)",
  /\.asset-360 \.mc-btn\.gc-btn:hover \{ transform: none; box-shadow: inset 0 0 0 1px var\(--gc-btn-rim, var\(--app-muted\)\); \}/.test(CSSB));
t("asset.css: ไม่มี rule พื้น/ขอบของ .a360-ind ตัวเปล่าที่จะชนะ gc-card (asset.css โหลดหลัง glass-cards.css)", !/(^|\})\s*\.a360-ind\s*\{[^}]*(background|border)/.test(CSSB));
t("asset.css: โทเคนในการ์ด = หมึกแก้ว · สีสถานะยกให้ ≥ 4.5:1", /\.asset-360 \.gc-card \{[^}]*--mc-muted: var\(--gc-ink-2\)[^}]*--mc-emerald: #7cf5c6[^}]*--app-up: #7cf5c6/.test(CSSB));
t("asset.css: ไม่มีฟอนต์จุด (Doto / dot-matrix / LED)", !/doto|dot-?matrix|\bLED\b/i.test(CSS));
var JS = read("asset-page.js");
var blockA = JS.slice(JS.indexOf("// ---------------------------------------------------------------- glass cards"), JS.indexOf("function getSnapshot"));
var blockB = JS.slice(JS.indexOf("function metric("), JS.indexOf("function watchlistControl"));
var blockC = JS.slice(JS.indexOf("function panel("), JS.indexOf("function emptyPage"));
t("ซอร์สใหม่ (tone · privacy · metric · panel · tilePanel) เป็น ES5", [blockA, blockB, blockC].every(function (b) { return b.length > 100 && !/=>|`|\bconst\b|\blet\b/.test(b); }), [blockA.length, blockB.length, blockC.length]);
t("ไม่มีคำแนะนำซื้อขายในซอร์สใหม่", !/ควรซื้อ|ควรขาย|น่าซื้อ|น่าขาย|น่าเข้า|แนะนำซื้อ|จุดเข้า|ตัดขาดทุน|\bBuy\b|\bSell\b/.test(blockA + blockB + blockC));

console.log("");
console.log(pass + fail + " checks · " + pass + " passed · " + fail + " failed");
process.exit(fail ? 1 : 0);
