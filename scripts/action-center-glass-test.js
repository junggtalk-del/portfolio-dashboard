"use strict";
// ============================================================
// ACTION CENTER (/action-center) — การ์ดแก้ว (glass-cards.css)
//   node scripts/action-center-glass-test.js
//
// บูต action-center-page.js ทั้งไฟล์ใน VM (DOM ปลอม · fetch ปลอม · Scoring ปลอมที่กำหนด actionKey ต่อสัญลักษณ์ ·
// snapshot สมมุติ — ไม่แตะเอกสารพอร์ตจริง) แล้วล็อก:
//   · การ์ด → สถานะต้นทาง → tone (สถานะที่ engine/หน้าให้อยู่แล้วเท่านั้น · ไม่มีสถานะ → gc-neutral):
//       การ์ดหุ้นที่ถือ (.pos-card)       positionVerdict().tone  sell → danger · buy → calm · watch → warning · none → neutral
//       การ์ดสัญญาณใหม่ Watchlist (.fresh-card)  ฝั่ง  buy → calm · sell → danger
//       รายการ Market (.zone-mkt-list)   การ์ดเดียว neutral (ลูกศร ▲▼ ในแถวคงสีเดิม)
//       ตัวนับโซน (.zone-sum)             neutral (ตัวนับ ไม่มีสถานะ)
//       "No action required" (.zone-empty-ok)  calm (สถานะ ok ที่หน้าคิดอยู่แล้ว)
//       ตัวนับสรุป (.summary-card)        urgent → danger · buy → calm · watch / conflicts → warning เมื่อมีรายการ ·
//                                          ไม่มีรายการ / none / high → neutral
//       การ์ดตัดสินใจ (.decision-card)     decisionTone()  tone-review → danger · tone-buy → calm · tone-watch → warning ·
//                                          tone-hold (DATA_WAITING) / tone-neutral → neutral
//       ทางสำรอง (ไม่มี Scoring): "ถือต่อ" (action hold ที่ไม่ใช่ DATA_WAITING) → normal ทั้งการ์ดตัดสินใจและการ์ดหุ้นที่ถือ ·
//                                          รอก่อน (avoid) → neutral
//       แผงตัวกรอง · หน้าต่างเพิ่มสินทรัพย์   neutral · select / input = gc-field · ปุ่ม = gc-btn
//   · ทุกการ์ดมี tone เดียว · ไม่มีการ์ดแก้วซ้อนการ์ดแก้ว
//   · Privacy Lock: maskText ของ privacy.js ทุก text node แล้วไม่เหลือยอดเงิน · ไม่มีเงินใน title / aria-label
//   · HTML: glass-cards.css ก่อน action-center.css · Inter · เวอร์ชัน bump · CSS: ผิวการ์ดเก่าถูกลบ ·
//     วงแหวนขาวของตัวกรองที่เปิดอยู่คงไว้ตอน hover · แถว Market บนจอ ≤600px
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
function finish() {
  console.log("");
  console.log(pass + fail + " checks · " + pass + " passed · " + fail + " failed");
  process.exit(fail ? 1 : 0);
}

var TONES = ["gc-calm", "gc-normal", "gc-warning", "gc-danger", "gc-neutral"];
var V = { gc: "20261121-gc-2", css: "20261122-zones-11", js: "20261122-zones-17" };
var SRC = read("action-center-page.js");

// ---------------------------------------------------------------- fixture
// แผนต่อสัญลักษณ์: actionKey/section ที่ Scoring (ปลอม) คืน → ผ่าน ACTION_CODE / positionVerdict / decisionTone ของหน้าเอง
var PLAN = {
  SEL: { key: "SELL_ALL", section: "urgent", thai: "ขายหมด / ออกจากสถานะ", tone: "bear" },
  BUY: { key: "BUY_MORE", section: "buy", thai: "ซื้อเพิ่ม / เพิ่มน้ำหนัก", tone: "bull" },
  WCH: { key: "WATCH_CLOSELY", section: "watch", thai: "เฝ้าดูใกล้ชิด", tone: "watch-bull", conflict: true },
  DAT: { key: "DATA_WAITING", section: "none", thai: "รอข้อมูล", tone: "waiting" },
  AVD: { key: "AVOID_WAIT", section: "none", thai: "รอก่อน", tone: "neutral" },
  WAT: { key: "WATCH_WAIT", section: "watch", thai: "เฝ้าดู / รอก่อน", tone: "watch-bull" },
  WAT2: { key: "WATCH_WAIT", section: "watch", thai: "เฝ้าดู / รอก่อน", tone: "watch-bear" },
  MKT: { key: "WATCH_WAIT", section: "watch", thai: "เฝ้าดู / รอก่อน", tone: "watch-bull" }
};
var MONEY = { SEL: 1234567, BUY: 2345678, WCH: 3456789, DAT: 4567891, HLD: 5678912 };
var MONEY_TEXT = ["1,234,567", "2,345,678", "3,456,789", "4,567,891"];
// ทางสำรอง (ไม่มี Scoring): HLD ถือ + EMA ขาขึ้น + เหนือ SMA200 + RSI กลาง → resolveDecisionLegacy ให้ hold "ถือต่อ" ·
// NOD ไม่มีสัญญาณ → avoid "รอก่อน"
var TECH_EXTRA = { HLD: { emaStatus: "EMA_BULLISH", sma200Status: "ABOVE_SMA200", rsiSignal: "NEUTRAL" } };

// EMA12 ตัด EMA26 ที่แท่งล่าสุด (60 แท่งรายวัน): "up" = ขาลงยาวแล้วกระโดดขึ้น · "down" = ขาขึ้นยาวแล้วดิ่งลง
function series(kind) {
  var closes = [], dates = [], i;
  for (i = 0; i < 59; i++) closes.push(kind === "up" ? 100 - i * 0.5 : 50 + i * 0.5);
  closes.push(kind === "up" ? closes[58] + 60 : closes[58] - 55);
  for (i = 0; i < 60; i++) dates.push(new Date(Date.UTC(2026, 8, 1 + i)).toISOString().slice(0, 10));
  return { closes: closes, dates: dates };
}
function snapshot(symbols) {
  var S = { technicalSignals: {}, rsiSignals: {}, prices: {}, historicalData: {}, portfolioHoldings: { data: [] },
    marketRisk: { risk: { level: { label: "Normal", thai: "ปกติ" } } } };
  symbols.forEach(function (s) {
    S.technicalSignals[s] = Object.assign({ latestClose: 42.5, latestDate: "2026-10-29" }, TECH_EXTRA[s] || {});
    if (MONEY[s]) S.portfolioHoldings.data.push({ canonicalSymbol: s, displaySymbol: s, assetName: s + " Co", isHolding: true, marketValue: MONEY[s], portfolioBucket: "foreign-stock" });
  });
  if (symbols.indexOf("WAT") >= 0) S.historicalData.WAT = series("up");
  if (symbols.indexOf("WAT2") >= 0) S.historicalData.WAT2 = series("down");
  if (symbols.indexOf("MKT") >= 0) S.historicalData.MKT = series("up");
  return S;
}

// ---------------------------------------------------------------- DOM ปลอม + บูต
function el(id) {
  var h = "";
  var e = {
    id: id || "", _h: {}, _q: {}, textContent: "", value: "", disabled: false, className: "", style: {},
    addEventListener: function (ty, fn) { this._h[ty] = fn; }, removeEventListener: function () {},
    querySelector: function (sel) { if (!this._q[sel]) this._q[sel] = el(sel); return this._q[sel]; },
    querySelectorAll: function () { return []; }, closest: function () { return null; },
    focus: function () {}, remove: function () {}, scrollIntoView: function () {},
    getAttribute: function () { return null; }, setAttribute: function () {}, appendChild: function () {}
  };
  Object.defineProperty(e, "innerHTML", { get: function () { return h; }, set: function (v) { h = String(v); } });
  return e;
}
function boot(symbols, opts) {
  opts = opts || {};
  var els = {}, store = {}, SNAP = snapshot(symbols);
  var doc = {
    readyState: "complete",
    querySelector: function (sel) { if (!els[sel]) els[sel] = el(sel); return els[sel]; },
    getElementById: function () { return null; },
    createElement: function () { return el(); },
    addEventListener: function () {},
    body: el("body")
  };
  var Scoring = {
    classifySignal: function (input) { var p = PLAN[input.canonicalSymbol] || {}; return { groupKey: "ongoing", thaiLabel: "สัญญาณ " + input.canonicalSymbol, tone: p.tone || "neutral" }; },
    actionFromSignal: function (signal, input) { var p = PLAN[input.canonicalSymbol] || {}; return { key: p.key, section: p.section, thaiAction: p.thai, warnings: [] }; },
    calculateTimingScore: function (input) { var p = PLAN[input.canonicalSymbol] || {}; return { score: 50, gates: {}, conflicts: p.conflict ? [{ code: "MIX", thaiMessage: "สัญญาณขัดกัน", severity: "medium" }] : [] }; },
    renderTimingChip: function () { return ""; },
    renderSignalChip: function () { return ""; }
  };
  var win = {
    document: doc,
    location: { hostname: "vm-test", pathname: "/action-center", search: "" },
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); }, removeItem: function (k) { delete store[k]; }
    },
    fetch: function (url) {
      if (String(url) === "/api/ai-universe") {
        return Promise.resolve({ ok: true, json: function () { return Promise.resolve({ mode: "test", data: { userAssets: [], removedIds: [], watchTickers: ["WAT", "WAT2"], excludedTickers: [] } }); } });
      }
      return Promise.resolve({ ok: false, status: 404, json: function () { return Promise.resolve({}); } });
    },
    addEventListener: function () {},
    confirm: function () { return false; },
    PortfolioDataSnapshot: { read: function () { return SNAP; }, freshness: function () { return { thai: "ข้อมูลสด" }; } },
    PortfolioCore: {},
    Scoring: opts.noScoring ? undefined : Scoring, // ไม่มี Scoring → resolveDecisionLegacy (ทางสำรอง)
    console: console, setTimeout: setTimeout, clearTimeout: clearTimeout
  };
  win.window = win;
  vm.createContext(win);
  vm.runInContext(SRC, win, { filename: "action-center-page.js" });
  return new Promise(function (r) { setTimeout(r, 40); }).then(function () {
    return {
      fresh: els["#freshSignals"].innerHTML,
      summary: els["#actionSummaryCards"].innerHTML,
      sections: els["#actionSections"].innerHTML,
      filters: els["#actionFilters"].innerHTML,
      addButton: els["#addAssetButton"],
      doc: doc,
      created: function () { return doc; }
    };
  });
}

// ---------------------------------------------------------------- helpers
function attrsOf(tag) {
  var out = {}, re = /\s([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:="([^"]*)")?/g, m;
  while ((m = re.exec(tag)) !== null) out[m[1]] = m[2] === undefined ? "" : m[2];
  return out;
}
function classesOf(tag) { return (attrsOf(tag)["class"] || "").split(/\s+/).filter(Boolean); }
function tonesOf(tag) { return classesOf(tag).filter(function (c) { return TONES.indexOf(c) >= 0; }); }
// opening tags whose class list holds `cls`
function tagsWith(html, cls) {
  var out = [], re = /<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, m;
  while ((m = re.exec(html)) !== null) if (classesOf(m[0]).indexOf(cls) >= 0) out.push({ tag: m[0], at: m.index });
  return out;
}
// card (article) per symbol: the symbol is the first .fresh-symbol / .decision-symbol link inside
function cardsBySymbol(html, cls, linkCls) {
  var out = {}, re = new RegExp("<article\\b[^>]*>[\\s\\S]*?</article>", "g"), m;
  while ((m = re.exec(html)) !== null) {
    var open = /^<article\b[^>]*>/.exec(m[0])[0];
    if (classesOf(open).indexOf(cls) < 0) continue;
    var sym = new RegExp('class="' + linkCls + ' asset-link"[^>]*>([^<]+)</a>').exec(m[0]);
    if (sym) out[sym[1]] = { tag: open, tones: tonesOf(open), html: m[0] };
  }
  return out;
}
// no glass card inside another glass card (simple tag stack over well-formed markup)
var VOID = { input: 1, br: 1, img: 1, hr: 1, meta: 1, link: 1 };
function nestedGlass(html) {
  var stack = [], bad = [], re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, m;
  while ((m = re.exec(html)) !== null) {
    var name = m[2].toLowerCase();
    if (m[1]) { while (stack.length) { var top = stack.pop(); if (top.name === name) break; } continue; }
    if (VOID[name] || /\/>$/.test(m[0])) continue;
    var glass = classesOf(m[0]).indexOf("gc-card") >= 0;
    if (glass && stack.some(function (s) { return s.glass; })) bad.push(m[0].slice(0, 80));
    stack.push({ name: name, glass: glass });
  }
  return bad;
}
function unesc(s) { return String(s).replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"); }
function maskedText(html) { return html.split(/<[^>]*>/).map(function (s) { return maskText(unesc(s)); }).join(" "); }
function attrValues(html, name) {
  var out = [], re = new RegExp("\\s" + name + '="([^"]*)"', "g"), m;
  while ((m = re.exec(html)) !== null) out.push(unesc(m[1]));
  return out;
}
function moneyIn(s) { return /฿|บาท|THB/.test(s) || MONEY_TEXT.some(function (n) { return s.indexOf(n) >= 0; }); }

// ================================================================ run
var ALL = ["SEL", "BUY", "WCH", "DAT", "AVD", "WAT", "WAT2", "MKT"];
boot(ALL).then(function (R) {
  console.log("== การ์ดหุ้นที่ถือ (.pos-card) ← positionVerdict().tone ==");
  var pos = cardsBySymbol(R.fresh, "pos-card", "fresh-symbol");
  var POS_WANT = { SEL: ["pos-sell", "gc-danger"], BUY: ["pos-buy", "gc-calm"], WCH: ["pos-watch", "gc-warning"], DAT: ["pos-none", "gc-neutral"] };
  Object.keys(POS_WANT).forEach(function (s) {
    var c = pos[s], want = POS_WANT[s];
    t(s + ": " + want[0] + " → " + want[1] + " (tone เดียว · คลาสเดิมอยู่ครบ)",
      c && classesOf(c.tag).indexOf("gc-card") >= 0 && classesOf(c.tag).indexOf(want[0]) >= 0 && c.tones.length === 1 && c.tones[0] === want[1], c && c.tag);
  });

  console.log("== การ์ดสัญญาณใหม่ Watchlist (.fresh-card) ← ฝั่ง buy/sell ==");
  var fresh = cardsBySymbol(R.fresh, "fresh-card", "fresh-symbol");
  t("WAT: fresh-buy → gc-calm", fresh.WAT && classesOf(fresh.WAT.tag).indexOf("fresh-buy") >= 0 && fresh.WAT.tones.join() === "gc-calm" && classesOf(fresh.WAT.tag).indexOf("gc-card") >= 0, fresh.WAT && fresh.WAT.tag);
  t("WAT2: fresh-sell → gc-danger", fresh.WAT2 && classesOf(fresh.WAT2.tag).indexOf("fresh-sell") >= 0 && fresh.WAT2.tones.join() === "gc-danger" && classesOf(fresh.WAT2.tag).indexOf("gc-card") >= 0, fresh.WAT2 && fresh.WAT2.tag);

  console.log("== Market · ตัวนับโซน · หัวโซน ==");
  var mkt = tagsWith(R.fresh, "zone-mkt-list");
  t("รายการ Market (.zone-mkt-list) = การ์ดแก้ว gc-neutral และมีแถว MKT", mkt.length === 1 && classesOf(mkt[0].tag).indexOf("gc-card") >= 0 && tonesOf(mkt[0].tag).join() === "gc-neutral" && /zone-mkt-row[\s\S]*?>MKT</.test(R.fresh), mkt[0] && mkt[0].tag);
  t("แถว Market ไม่ใช่การ์ด (ไม่มี gc-card ซ้อน)", tagsWith(R.fresh, "zone-mkt-row").every(function (x) { return classesOf(x.tag).indexOf("gc-card") < 0; }));
  var sums = tagsWith(R.fresh, "zone-sum");
  t("ตัวนับโซน 3 ใบ = gc-card gc-neutral · data-fresh-jump คงอยู่", sums.length === 3 && sums.every(function (x) { return classesOf(x.tag).indexOf("gc-card") >= 0 && tonesOf(x.tag).join() === "gc-neutral" && /data-fresh-jump="zone-/.test(x.tag); }), sums.map(function (x) { return x.tag; }));
  t("ตัวเลขตัวนับโซนเป็น gc-num", (R.fresh.match(/<strong class="gc-num[^"]*">/g) || []).length >= 3);
  t("หัว Action Inbox / หัวโซนอยู่บนพื้นหน้า (gc-section-h) ไม่ใช่การ์ด", tagsWith(R.fresh, "gc-section-h").length >= 4 && tagsWith(R.fresh, "zone").every(function (x) { return classesOf(x.tag).indexOf("gc-card") < 0; }));
  t("มีงานต้องลงมือ (SEL/BUY) → ไม่มีกล่อง No action required", tagsWith(R.fresh, "zone-empty-ok").length === 0);

  console.log("== ตัวนับสรุป (.summary-card) ← หมวด + จำนวน ==");
  var SUM_WANT = { urgent: "gc-danger", buy: "gc-calm", watch: "gc-warning", none: "gc-neutral", conflicts: "gc-warning", high: "gc-neutral" };
  var sumTags = tagsWith(R.summary, "summary-card");
  t("6 ใบ · ทุกใบ gc-card tone เดียว · data-summary คงอยู่", sumTags.length === 6 && sumTags.every(function (x) { return classesOf(x.tag).indexOf("gc-card") >= 0 && tonesOf(x.tag).length === 1 && /data-summary="/.test(x.tag); }), sumTags.map(function (x) { return x.tag; }));
  Object.keys(SUM_WANT).forEach(function (k) {
    var x = sumTags.filter(function (s) { return attrsOf(s.tag)["data-summary"] === k; })[0];
    t("summary " + k + " (มีรายการ) → " + SUM_WANT[k], x && tonesOf(x.tag).join() === SUM_WANT[k], x && x.tag);
  });
  t("ตัวเลขตัวนับสรุปเป็น gc-num", (R.summary.match(/<strong class="gc-num[^"]*">/g) || []).length === 6);

  console.log("== การ์ดตัดสินใจ (.decision-card) ← decisionTone() ==");
  var dec = cardsBySymbol(R.sections, "decision-card", "decision-symbol");
  var DEC_WANT = { SEL: ["tone-review", "gc-danger"], BUY: ["tone-buy", "gc-calm"], WCH: ["tone-watch", "gc-warning"], DAT: ["tone-hold", "gc-neutral"], AVD: ["tone-neutral", "gc-neutral"] };
  Object.keys(DEC_WANT).forEach(function (s) {
    var c = dec[s], want = DEC_WANT[s];
    t(s + ": " + want[0] + " → " + want[1], c && classesOf(c.tag).indexOf("gc-card") >= 0 && classesOf(c.tag).indexOf(want[0]) >= 0 && c.tones.length === 1 && c.tones[0] === want[1], c && c.tag);
  });
  t("หัว section อยู่บนพื้นหน้า (gc-section-h) · section ไม่ใช่การ์ด",
    tagsWith(R.sections, "gc-section-h").length === 4 && tagsWith(R.sections, "decision-section").every(function (x) { return classesOf(x.tag).indexOf("gc-card") < 0; }));
  t("ไม่มี inline style ลดความทึบในการ์ด (ตัวหนังสือรอง ≥ 4.5:1)", !/style="opacity/.test(R.sections));

  console.log("== ทุกการ์ด · ไม่ซ้อน ==");
  var allHtml = R.fresh + R.summary + R.sections;
  var cards = tagsWith(allHtml, "gc-card");
  t("ทุกการ์ดแก้วมี tone เดียว (" + cards.length + " ใบ)", cards.length >= 20 && cards.every(function (x) { return tonesOf(x.tag).length === 1; }), cards.filter(function (x) { return tonesOf(x.tag).length !== 1; }).map(function (x) { return x.tag; }));
  t("ไม่มีการ์ดแก้วซ้อนการ์ดแก้ว", nestedGlass(allHtml).length === 0, nestedGlass(allHtml));

  console.log("== ตัวกรอง · หน้าต่างเพิ่มสินทรัพย์ ==");
  var selects = (R.filters.match(/<select\b[^>]*>/g) || []);
  t("select ตัวกรอง 5 ช่อง = gc-field · data-filter คงอยู่", selects.length === 5 && selects.every(function (s) { return classesOf(s).indexOf("gc-field") >= 0 && /data-filter="/.test(s); }), selects);
  var modalHtml = "";
  R.doc.body.appendChild = function (node) { modalHtml = node.innerHTML; };
  if (R.addButton._h.click) R.addButton._h.click();
  var modal = tagsWith(modalHtml, "ac-modal")[0];
  t("หน้าต่างเพิ่มสินทรัพย์ = gc-card gc-neutral (role/aria คงอยู่)", modal && classesOf(modal.tag).indexOf("gc-card") >= 0 && tonesOf(modal.tag).join() === "gc-neutral" && /role="dialog"/.test(modal.tag) && /aria-modal="true"/.test(modal.tag), modal && modal.tag);
  t("ช่อง ticker / ชื่อ = gc-field (id เดิม)", /<input id="acAddTicker"[^>]*class="gc-field"/.test(modalHtml) && /<input id="acAddName"[^>]*class="gc-field"/.test(modalHtml), modalHtml.slice(0, 600));
  t("ปุ่ม ยกเลิก = gc-btn gc-btn-ghost · เพิ่ม = gc-btn (+ ac-primary เดิม)",
    /id="acAddCancel"[^>]*class="gc-btn gc-btn-ghost"|class="gc-btn gc-btn-ghost"[^>]*id="acAddCancel"/.test(modalHtml) &&
    /<button[^>]*id="acAddSave"[^>]*>/.test(modalHtml) && /class="[^"]*\bac-primary\b[^"]*\bgc-btn\b[^"]*"[^>]*id="acAddSave"|id="acAddSave"[^>]*class="[^"]*\bac-primary\b[^"]*\bgc-btn\b/.test(modalHtml), modalHtml);

  console.log("== Privacy Lock ==");
  var masked = maskedText(allHtml);
  t("maskText ทุก text node → ไม่เหลือยอดเงินของพอร์ต (4 ตัวที่ถือ)", !MONEY_TEXT.some(function (n) { return masked.indexOf(n) >= 0; }) && /XXX/.test(masked),
    MONEY_TEXT.filter(function (n) { return masked.indexOf(n) >= 0; }));
  t("ก่อนมาสก์มียอดเงินจริงในการ์ด (เทสต์มีความหมาย)", MONEY_TEXT.every(function (n) { return allHtml.indexOf(n) >= 0; }));
  var titles = attrValues(allHtml + modalHtml, "title").concat(attrValues(allHtml + modalHtml, "aria-label"));
  t("ไม่มีเงินใน title / aria-label (" + titles.length + " ค่า)", titles.length >= 4 && !titles.some(moneyIn), titles.filter(moneyIn));

  // ---- รอบที่ 2: ถือแค่ DAT (ไม่มีงานต้องลงมือ) · ไม่มี urgent / buy / watch / conflicts
  return boot(["DAT", "AVD"]);
}).then(function (R2) {
  console.log("== ไม่มีรายการ → neutral · No action required → calm ==");
  var sumTags = tagsWith(R2.summary, "summary-card");
  ["urgent", "buy", "watch", "conflicts"].forEach(function (k) {
    var x = sumTags.filter(function (s) { return attrsOf(s.tag)["data-summary"] === k; })[0];
    t("summary " + k + " (0 รายการ) → gc-neutral (ไม่แดง/ส้มทั้งที่ไม่มีอะไร)", x && tonesOf(x.tag).join() === "gc-neutral", x && x.tag);
  });
  var ok = tagsWith(R2.fresh, "zone-empty-ok");
  t("กล่อง No action required (.zone-empty-ok) = gc-card gc-calm", ok.length === 1 && classesOf(ok[0].tag).indexOf("gc-card") >= 0 && tonesOf(ok[0].tag).join() === "gc-calm", ok[0] && ok[0].tag);
  var empties = tagsWith(R2.fresh, "zone-empty").filter(function (x) { return classesOf(x.tag).indexOf("zone-empty-ok") < 0; });
  t("กล่องว่างอื่น (Watchlist / Market ว่าง) อยู่บนพื้นหน้า ไม่ใช่การ์ด", empties.length === 2 && empties.every(function (x) { return classesOf(x.tag).indexOf("gc-card") < 0; }), empties.map(function (x) { return x.tag; }));
  t("รอบ 2: ทุกการ์ด tone เดียว · ไม่ซ้อน", tagsWith(R2.fresh + R2.summary + R2.sections, "gc-card").every(function (x) { return tonesOf(x.tag).length === 1; }) && nestedGlass(R2.fresh + R2.summary + R2.sections).length === 0);

  // ---- รอบที่ 3: ทางสำรอง (ไม่มี Scoring → resolveDecisionLegacy) — "ถือต่อ" = normal เหมือน /home และ PM
  return boot(["HLD", "NOD"], { noScoring: true });
}).then(function (R3) {
  console.log("== ทางสำรอง (ไม่มี Scoring): ถือต่อ → normal · รอก่อน → neutral ==");
  var dec3 = cardsBySymbol(R3.sections, "decision-card", "decision-symbol");
  t("HLD (hold \"ถือต่อ\" จากทางสำรอง): tone-hold → gc-normal",
    dec3.HLD && classesOf(dec3.HLD.tag).indexOf("tone-hold") >= 0 && dec3.HLD.tones.join() === "gc-normal" && /ถือต่อ/.test(dec3.HLD.html), dec3.HLD && dec3.HLD.tag);
  t("NOD (avoid \"รอก่อน\" จากทางสำรอง): tone-neutral → gc-neutral",
    dec3.NOD && classesOf(dec3.NOD.tag).indexOf("tone-neutral") >= 0 && dec3.NOD.tones.join() === "gc-neutral", dec3.NOD && dec3.NOD.tag);
  var pos3 = cardsBySymbol(R3.fresh, "pos-card", "fresh-symbol");
  t("HLD การ์ดหุ้นที่ถือ (pos-none · ถือต่อ จากทางสำรอง) → gc-normal",
    pos3.HLD && classesOf(pos3.HLD.tag).indexOf("pos-none") >= 0 && pos3.HLD.tones.join() === "gc-normal" && /ถือต่อ/.test(pos3.HLD.html), pos3.HLD && pos3.HLD.tag);
  t("ทางสำรอง: ทุกการ์ด tone เดียว · ไม่ซ้อน",
    tagsWith(R3.fresh + R3.summary + R3.sections, "gc-card").every(function (x) { return tonesOf(x.tag).length === 1; }) && nestedGlass(R3.fresh + R3.summary + R3.sections).length === 0);

  console.log("== HTML / CSS / ซอร์ส ==");
  var HTML = read("action-center.html");
  var gcAt = HTML.indexOf('href="/glass-cards.css?v=' + V.gc + '"'), cssAt = HTML.indexOf('href="/action-center.css?v=' + V.css + '"');
  t("action-center.html โหลด glass-cards.css?v=" + V.gc + " ก่อน action-center.css?v=" + V.css, gcAt > 0 && cssAt > gcAt, [gcAt, cssAt]);
  t("action-center.html โหลด action-center-page.js?v=" + V.js, HTML.indexOf('src="/action-center-page.js?v=' + V.js + '"') > 0);
  t("ฟอนต์ Inter โหลดคู่ Noto Sans Thai", /family=Inter:wght@[^"&]*&(amp;)?family=Noto\+Sans\+Thai/.test(HTML));
  t("แผงตัวกรอง = การ์ดแก้ว gc-neutral (aria-label เดิม)", /<section class="action-filter-panel gc-card gc-neutral" aria-label="Action filters">/.test(HTML));
  var CSS = read("action-center.css").replace(/\/\*[\s\S]*?\*\//g, "");
  var CARD_CLS = ["summary-card", "decision-card", "fresh-card", "pos-card", "zone-sum", "action-filter-panel", "ac-modal",
    "tone-review", "tone-buy", "tone-watch", "tone-hold", "tone-neutral", "pos-sell", "pos-buy", "pos-watch", "pos-none", "fresh-strong",
    "decision-summary-urgent", "decision-summary-buy", "decision-summary-watch", "decision-summary-none", "decision-summary-conflicts", "decision-summary-high", "zone-mkt-list", "zone-empty-ok"];
  var leftovers = [], re = /([^{}]+)\{([^{}]*)\}/g, m;
  while ((m = re.exec(CSS)) !== null) {
    var decl = m[2];
    if (!/(^|;)\s*(background|border|border-color|opacity)\s*:/.test(decl)) continue;
    m[1].split(",").forEach(function (sel) {
      var last = sel.trim().split(/[\s>+~]+/).pop();
      CARD_CLS.forEach(function (c) {
        if (new RegExp("\\." + c + "(?![\\w-])").test(last) && !/:hover|:focus|:active|is-active/.test(last)) leftovers.push(sel.trim() + " { " + decl.trim().slice(0, 60) + " }");
      });
    });
  }
  t("CSS: ผิวการ์ดเก่า (background / border / opacity) บนคลาสการ์ดถูกลบ — ให้ gc-card วาด", leftovers.length === 0, leftovers);
  t("CSS: วงแหวนขาวของตัวกรองที่เปิดอยู่คงไว้ตอน hover (.summary-card.gc-card.is-active:hover ชนะ hover rim)",
    /\.summary-card\.gc-card\.is-active:hover\s*\{[^}]*box-shadow:\s*inset 0 0 0 2px #fff/.test(CSS) && /\.summary-card\.gc-card:hover\s*\{/.test(CSS));
  t("CSS: จอ ≤600px แถว Market ได้คอลัมน์ชื่อสัญญาณกว้างขึ้น (inset 6px 10px · grid 5 คอลัมน์)",
    /@media \(max-width: 600px\)\s*\{\s*\.zone-mkt-list\s*\{\s*padding:\s*6px 10px;\s*\}\s*\.zone-mkt-row\s*\{\s*grid-template-columns:\s*16px minmax\(48px, \.6fr\) 1fr 56px 34px;\s*\}/.test(CSS));
  t("CSS: โทเคนของหน้าในการ์ดแก้ว = หมึกแก้ว (--ink / --muted / --app-text / --app-card)",
    /\.gc-card[^{]*\{[^}]*--ink:\s*var\(--gc-ink\)[^}]*--muted:\s*var\(--gc-ink-2\)/.test(CSS) && /\.gc-card[^{]*\{[^}]*--app-text:\s*var\(--gc-ink\)[^}]*--app-card:\s*var\(--gc-well\)/.test(CSS));
  t("ซอร์ส: ตาราง tone อยู่ใน action-center-page.js (ไม่มีคำแนะนำซื้อขายใหม่)",
    /GC_POS_TONE/.test(SRC) && /GC_DECISION_TONE/.test(SRC) && !/ควรซื้อ|ควรขาย|น่าซื้อ|น่าขาย|น่าเข้า|แนะนำซื้อ|จุดเข้า|ตัดขาดทุน/.test(SRC));
  finish();
}).catch(function (e) {
  t("บูตหน้าใน VM ได้", false, e && (e.stack || e.message));
  finish();
});
