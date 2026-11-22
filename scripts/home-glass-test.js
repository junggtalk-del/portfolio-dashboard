"use strict";
// ============================================================
// HOME (/home) — การ์ดแก้ว (glass-cards.css) บนการ์ดของ Mission Control (mission-control-page.js)
//   node scripts/home-glass-test.js
//
// วาดหน้าเต็มใน VM (mission-control-page.js ทั้งไฟล์ · MarketRegime / snapshot / ThesisEngine ปลอม · ไม่ออกเน็ต)
// แล้วล็อก:
//   · ทุกการ์ดระดับบนใน #mcRoot ใส่ gc-card + tone เดียว · tone มาจากสถานะที่หน้าคำนวณอยู่แล้วตามตาราง:
//       🧾 thesis reload strip   reload (overdue/stale) → gc-danger · ใกล้ออกงบอย่างเดียว → gc-warning
//       1 · วันนี้ต้องทำอะไร      R.action.tone  bull / watch-bull → calm · neutral → normal · warn → warning · bear → danger
//       2 · พอร์ตเป็นไง           ⚠ กระจุกตัว (แถว Editor > 40%) → gc-warning · ไม่มี → gc-neutral · ไม่มีข้อมูล → gc-neutral
//       3 · ตลาดเป็นไง            R.band  green / lightgreen → calm · yellow → normal · orange → warning · red → danger
//       🔬 เจาะลึกตลาด / hero     ไม่มีสถานะ → gc-neutral
//   · ไม่มีการ์ดแก้วซ้อนการ์ดแก้ว · ข้อความบนแก้วไม่ระบายสีด้วย inline style (สีอยู่ที่การ์ด / จุด)
//   · วาดใหม่ (สลับช่วงกราฟ · snapshot event) แล้วการ์ดยังเป็นแก้ว
//   · Privacy Lock: ปิดทุก text node ด้วย maskText ของ privacy.js แล้วไม่เหลือยอดเงิน · ไม่มีเงินใน title / aria-label
//   · CSS (mission-control-v2.css): โทเคน mc ถูกแมปเป็นหมึกแก้วในการ์ด · สไตล์การ์ดเก่าที่ถูกแทนถูกลบ ·
//     selector ใหม่ทุกตัวจำกัดที่ #mcRoot (ไฟล์นี้ถูกโหลดทุกหน้า) · เวอร์ชันถูก bump
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
var ADVISORY = /ควรซื้อ|ควรขาย|น่าซื้อ|น่าขาย|น่าเข้า|แนะนำซื้อ|จุดเข้า|ตัดขาดทุน/;

// ---------------------------------------------------------------- fixtures
var BAND_COLOR = { green: "#22c55e", lightgreen: "#84cc16", yellow: "#eab308", orange: "#f97316", red: "#ef4444" };
function mkR(score, actionTone, band) {
  return {
    score: score, color: BAND_COLOR[band], band: band,
    regime: score >= 60 ? { key: "risk-on", label: "Risk-On" } : score >= 40 ? { key: "neutral", label: "Neutral" } : { key: "risk-off", label: "Risk-Off" },
    action: { key: "k-" + actionTone, label: "Label " + actionTone, thai: "แนวทาง " + actionTone, tone: actionTone },
    confidence: { key: "medium", label: "Medium" },
    reasons: ["เครดิตยังนิ่ง"], warnings: ["ดอลลาร์แข็ง"],
    components: [
      { key: "dxy", label: "Dollar Index (DXY)", available: true, weight: 15, contribution: 6, displayValue: "104.2", status: "weakening", trend1m: "up", trend3m: "up" },
      { key: "btcMa200", label: "Bitcoin vs MA200", available: true, weight: 10, contribution: 7, displayValue: "+4% vs MA200", status: "improving", trend1m: "up", trend3m: "up" },
      { key: "nasdaqHH", label: "Nasdaq Higher High", available: true, weight: 10, contribution: 5, displayValue: "HH", status: "neutral", trend1m: "flat", trend3m: "flat" },
      { key: "vix", label: "Equity Fear (VIX)", available: false, weight: 15 }
    ],
    gold: { available: true, displayValue: "GLD 251", trend3m: "up" },
    coverage: 88,
    suggestedAllocation: [{ key: "usTech", pct: 25 }, { key: "bitcoin", pct: 10 }, { key: "gold", pct: 10 }, { key: "cash", pct: 35 }, { key: "defensive", pct: 20 }],
    snapshotMissing: false
  };
}
function A(type, name, value, inv) { return { type: type, name: name, manualValue: value, investedPercent: inv }; }
// money with a recognisable shape: every amount the page can print from this fixture has ≥ 4 digits
var DOC_CONC = { currentQuarter: "2026-Q4", quarters: { "2026-Q4": { assets: [A("foreign-stock", "US", 12345678, 70), A("bitcoin", "Bitcoin", 3456789, 100), A("cash", "เงินสด", 1234567, 0)] } } };
var DOC_SPREAD = { currentQuarter: "2026-Q4", quarters: { "2026-Q4": { assets: [A("foreign-stock", "US", 3000000, 80), A("bitcoin", "Bitcoin", 2600000, 100), A("thai-stock", "หุ้นไทย", 2400000, 90), A("cash", "เงินสด", 2200000, 0)] } } };
function mkSnap(doc) {
  return {
    loadedAt: "2026-11-21T07:00:00.000Z",
    portfolioStatus: doc ? { data: doc } : null,
    portfolioHoldings: { data: [
      { canonicalSymbol: "QQQM", isHolding: true, marketValue: 2000000 },
      { canonicalSymbol: "NVDA", isHolding: true, marketValue: 900000 },
      { canonicalSymbol: "BTCUSD", isHolding: true, marketValue: 600000 }
    ] },
    scoring: { bySymbol: {
      NVDA: { actionCategory: "BUY", isHolding: true, timingScore: 72, actionPriority: 3, thaiAction: "สะสม" },
      AMD: { actionCategory: "SELL", isHolding: false, timingScore: 31, actionPriority: 2, thaiAction: "ลดน้ำหนัก" }
    } },
    watchlist: { triggeredToday: [{ displaySymbol: "TSM", ev: { thaiReason: "เข้าเงื่อนไข watchlist", timingScore: 60 } }] },
    bitcoinIntelligence: { available: true, cycleState: "Accumulation", forecastBias: "bullish", forecast90Median: 12 }
  };
}
var HIST = [];
(function () { for (var i = 0; i < 30; i++) HIST.push({ date: "2026-" + (i < 15 ? "05" : "06") + "-" + String(10 + (i % 15)).padStart(2, "0"), score: (i * 7) % 100 }); })();
// ---------------------------------------------------------------- VM harness
// ThesisEngine ปลอม (opt.thesis = { TICKER: "overdue" | "stale" | "due-soon" | "fresh" }) — asOf "as-<i>" บอกว่าเป็นตัวไหน
function boot(o) {
  var handlers = {}, els = {}, store = {};
  function mkEl(id) {
    var on = {};
    return {
      id: id, innerHTML: "", textContent: "", className: "", disabled: false, attributes: {}, _on: on,
      addEventListener: function (ev, fn) { (on[ev] = on[ev] || []).push(fn); },
      setAttribute: function (k, v) { this.attributes[k] = String(v); },
      removeAttribute: function (k) { delete this.attributes[k]; },
      classList: { toggle: function () {} }
    };
  }
  ["mcRoot", "mcSnapTime", "mcSnapPill", "mcLoadLatest", "mcMenuToggle", "mcSidebar", "mcxHistRanges", "mcxLoad"].forEach(function (id) { els[id] = mkEl(id); });
  var st = { R: o.R, snap: o.snap, hist: o.hist || HIST };
  var thesisStates = o.thesis || {};
  var tickers = Object.keys(thesisStates);
  var TD = { companies: {} };
  tickers.forEach(function (k, i) { TD.companies[k] = { asOf: "as-" + i, nextEarnings: "next-" + i }; });
  var TE = {
    companiesFrom: function (D) { return Object.keys(D.companies).map(function (k) { return { ticker: k }; }); },
    earningsStatusOf: function (asOf) {
      var k = tickers[Number(String(asOf).slice(3))], s = thesisStates[k] || "fresh";
      return { state: s, daysToEarnings: s === "overdue" ? -3 : 4, staleMonths: 5, hasDate: true };
    }
  };
  var win = {
    console: console, setTimeout: setTimeout, clearTimeout: clearTimeout,
    document: { getElementById: function (id) { return els[id] || null; } },
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; }
    },
    addEventListener: function (ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); },
    fetch: function () { return Promise.resolve({ ok: false, json: function () { return Promise.resolve(null); } }); },
    PortfolioDataSnapshot: {
      read: function () { return st.snap; },
      freshness: function () { return { key: "fresh", thai: "ข้อมูลล่าสุด" }; }
    },
    MarketRegime: { compute: function () { return st.R; }, history: function () { return st.hist; } },
    ThesisEngine: tickers.length ? TE : undefined,
    ThesisData: tickers.length ? TD : undefined
  };
  win.window = win;
  vm.createContext(win);
  vm.runInContext(read("mission-control-page.js"), win, { filename: "mission-control-page.js" });
  return {
    root: els.mcRoot, st: st, els: els,
    html: function () { return els.mcRoot.innerHTML; },
    snapshotEvent: function () { (handlers["portfolio-data-snapshot"] || []).forEach(function (f) { f(); }); },
    clickRange: function (r) {
      var on = els.mcxHistRanges._on.click || [];
      on.forEach(function (f) { f({ target: { closest: function () { return { dataset: { r: r } }; } } }); });
    }
  };
}

// ---------------------------------------------------------------- HTML helpers
var VOID = { area: 1, base: 1, br: 1, col: 1, embed: 1, hr: 1, img: 1, input: 1, link: 1, meta: 1, source: 1, track: 1, wbr: 1 };
// top-level elements of an HTML fragment: [{ tag, open, cls, inner, outer }]
function topLevel(h) {
  var re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/?)>/g, m, depth = 0, out = [], cur = null;
  while ((m = re.exec(h)) !== null) {
    var closing = m[1] === "/", tag = m[2].toLowerCase(), self = m[3] === "/" || VOID[tag];
    if (closing) {
      depth--;
      if (depth === 0 && cur) { cur.outer = h.slice(cur.start, re.lastIndex); cur.inner = h.slice(cur.innerStart, m.index); out.push(cur); cur = null; }
      continue;
    }
    if (depth === 0 && !self) cur = { tag: tag, open: m[0], start: m.index, innerStart: re.lastIndex, cls: classOf(m[0]) };
    if (!self) depth++;
  }
  return out;
}
function classOf(tag) { var m = /\sclass="([^"]*)"/.exec(tag); return m ? m[1].split(/\s+/).filter(Boolean) : []; }
function tonesOf(cls) { return cls.filter(function (c) { return TONES.indexOf(c) >= 0; }); }
function cardBy(h, marker) {
  var list = topLevel(h);
  for (var i = 0; i < list.length; i++) if (list[i].outer.indexOf(marker) >= 0) return list[i];
  return null;
}
function toneOf(card) { if (!card) return "(no card)"; var tn = tonesOf(card.cls); return card.cls.indexOf("gc-card") >= 0 && tn.length === 1 ? tn[0] : "(" + card.cls.join(" ") + ")"; }
function gcCount(s) { return (String(s).match(/class="[^"]*\bgc-card\b/g) || []).length; }
// Privacy Lock: what privacy.js does to every text node (attributes untouched)
function masked(h) { return String(h).replace(/>([^<]+)</g, function (m, txt) { return ">" + maskText(txt) + "<"; }); }
function attrsOf(h, name) { var out = [], re = new RegExp("\\s" + name + "=\"([^\"]*)\"", "g"), m; while ((m = re.exec(h)) !== null) out.push(m[1]); return out; }
var MONEY_NUM = /\d{1,3}(?:,\d{3})+/;

// ================================================================ 1 · tone per card
console.log("== 1 · การ์ด → สถานะต้นทาง → tone ==");
var MK = {
  reload: "Investment Thesis · ความสดของข้อมูล curated",
  decision: "1 · วันนี้ต้องทำอะไร",
  pf: "2 · พอร์ตเป็นไง",
  mkt: "3 · ตลาดเป็นไง",
  more: "เจาะลึกตลาด"
};
// decision card follows R.action.tone (band held at yellow)
var ACTION_CASES = [["bull", "gc-calm"], ["watch-bull", "gc-calm"], ["neutral", "gc-normal"], ["warn", "gc-warning"], ["bear", "gc-danger"]];
ACTION_CASES.forEach(function (c) {
  var P = boot({ R: mkR(50, c[0], "yellow"), snap: mkSnap(DOC_SPREAD) });
  var card = cardBy(P.html(), MK.decision);
  t("1 · วันนี้ต้องทำอะไร: R.action.tone " + c[0] + " → " + c[1], toneOf(card) === c[1], toneOf(card));
});
// market card follows R.band (action held at neutral)
var BAND_CASES = [["green", 85, "gc-calm"], ["lightgreen", 66, "gc-calm"], ["yellow", 50, "gc-normal"], ["orange", 27, "gc-warning"], ["red", 8, "gc-danger"]];
BAND_CASES.forEach(function (c) {
  var P = boot({ R: mkR(c[1], "neutral", c[0]), snap: mkSnap(DOC_SPREAD) });
  var card = cardBy(P.html(), MK.mkt);
  t("3 · ตลาดเป็นไง: R.band " + c[0] + " (score " + c[1] + ") → " + c[2], toneOf(card) === c[2], toneOf(card));
});
// the two cards read their OWN status: same page, action bear + band green → decision danger · market calm
(function () {
  var P = boot({ R: mkR(82, "bear", "green"), snap: mkSnap(DOC_SPREAD) });
  t("each card reads its own status: action bear + band green → decision gc-danger · market gc-calm",
    toneOf(cardBy(P.html(), MK.decision)) === "gc-danger" && toneOf(cardBy(P.html(), MK.mkt)) === "gc-calm",
    [toneOf(cardBy(P.html(), MK.decision)), toneOf(cardBy(P.html(), MK.mkt))]);
})();
// portfolio: concentration flag → warning · otherwise / empty → neutral
(function () {
  var P1 = boot({ R: mkR(50, "neutral", "yellow"), snap: mkSnap(DOC_CONC) });
  var c1 = cardBy(P1.html(), MK.pf);
  t("2 · พอร์ตเป็นไง: ⚠ กระจุกตัว (US 72%) → gc-warning", toneOf(c1) === "gc-warning" && !!c1 && /⚠ กระจุกตัว: US 72%/.test(c1.outer), toneOf(c1));
  var P2 = boot({ R: mkR(50, "neutral", "yellow"), snap: mkSnap(DOC_SPREAD) });
  var c2 = cardBy(P2.html(), MK.pf);
  t("2 · พอร์ตเป็นไง: ไม่มีแถวเกิน 40% → gc-neutral (ไม่มีสถานะ ไม่ประดิษฐ์ 'ดี')", toneOf(c2) === "gc-neutral" && !!c2 && c2.outer.indexOf("กระจุกตัว") < 0, toneOf(c2));
  var P3 = boot({ R: mkR(50, "neutral", "yellow"), snap: mkSnap(null) });
  var c3 = cardBy(P3.html(), MK.pf);
  t("2 · พอร์ตเป็นไง (ยังไม่มีข้อมูลพอร์ต) → gc-neutral", toneOf(c3) === "gc-neutral" && !!c3 && /ยังไม่มีข้อมูลพอร์ต/.test(c3.outer), toneOf(c3));
})();
// thesis reload strip: reload (overdue / stale) → danger · due-soon only → warning · nothing due → no strip
(function () {
  var P1 = boot({ R: mkR(50, "neutral", "yellow"), snap: mkSnap(DOC_SPREAD), thesis: { NVDA: "overdue", HOOD: "due-soon" } });
  var c1 = cardBy(P1.html(), MK.reload);
  t("🧾 reload strip: มี ⚠ ควรโหลดใหม่ (overdue) → gc-danger", toneOf(c1) === "gc-danger" && /ควรโหลดใหม่/.test(c1.outer) && /ใกล้ออกงบ/.test(c1.outer), toneOf(c1));
  var P2 = boot({ R: mkR(50, "neutral", "yellow"), snap: mkSnap(DOC_SPREAD), thesis: { TSM: "stale" } });
  t("🧾 reload strip: stale อย่างเดียว → gc-danger", toneOf(cardBy(P2.html(), MK.reload)) === "gc-danger", toneOf(cardBy(P2.html(), MK.reload)));
  var P3 = boot({ R: mkR(50, "neutral", "yellow"), snap: mkSnap(DOC_SPREAD), thesis: { HOOD: "due-soon" } });
  var c3 = cardBy(P3.html(), MK.reload);
  t("🧾 reload strip: 🔔 ใกล้ออกงบ อย่างเดียว → gc-warning", toneOf(c3) === "gc-warning" && c3.outer.indexOf("ควรโหลดใหม่") < 0, toneOf(c3));
  var P4 = boot({ R: mkR(50, "neutral", "yellow"), snap: mkSnap(DOC_SPREAD), thesis: { GOOG: "fresh" } });
  t("🧾 reload strip: ไม่มีตัวที่ถึงเวลา → ไม่วาดแถบเลย", !cardBy(P4.html(), MK.reload));
  // chips: links stay links (href + data-th-ticker) and wear the glass buttons
  var chips = (c1.outer.match(/<a [^>]*class="[^"]*mcx-reload-chip[^"]*"[^>]*>/g) || []);
  t("🧾 reload chips: ลิงก์เดิม (href /thesis?ticker= + data-th-ticker) · ใส่ gc-btn (ควรโหลดใหม่ = ขาว · ใกล้ออกงบ = ghost)",
    chips.length === 2 && chips.every(function (a) { return /href="\/thesis\?ticker=/.test(a) && /data-th-ticker="/.test(a) && /\bgc-btn\b/.test(a); }) &&
    /mcx-reload-reload[^"]*"/.test(chips.join()) && chips.filter(function (a) { return /mcx-reload-soon/.test(a); }).every(function (a) { return /\bgc-btn-ghost\b/.test(a); }) &&
    chips.filter(function (a) { return /mcx-reload-reload/.test(a); }).every(function (a) { return !/\bgc-btn-ghost\b/.test(a); }), chips);
})();
// no-status cards
(function () {
  var P = boot({ R: mkR(50, "neutral", "yellow"), snap: mkSnap(DOC_SPREAD) });
  var more = cardBy(P.html(), MK.more);
  t("🔬 เจาะลึกตลาด (ไม่มีสถานะ) → gc-neutral", toneOf(more) === "gc-neutral" && !!more && more.tag === "details", toneOf(more));
  t("🔬 แผงข้างใน (Money Flow · Lead–Lag · Market Regime) เป็นช่องในการ์ด ไม่ใช่การ์ดแก้วซ้อน", !!more && gcCount(more.inner) === 0 &&
    /💧 Money Flow/.test(more.inner) && /Lead–Lag Timeline/.test(more.inner) && /🌐 Market Regime/.test(more.inner), more && gcCount(more.inner));
  var E = boot({ R: { snapshotMissing: true }, snap: null });
  var hero = cardBy(E.html(), "Load Latest Data");
  t("ยังไม่มี snapshot: hero Mission Control → gc-neutral · ปุ่ม Load เดิม (id mcxLoad) ใส่ gc-btn", toneOf(hero) === "gc-neutral" &&
    /<button class="[^"]*\bgc-btn\b[^"]*" id="mcxLoad"/.test(E.html()), [toneOf(hero), (/<button[^>]*id="mcxLoad"[^>]*>/.exec(E.html()) || [""])[0]]);
  var HTML = read("home.html");
  var ph = /<main class="mc-content" id="mcRoot">\s*<section class="([^"]*)"/.exec(HTML);
  t("home.html: hero ระหว่างโหลด (กำลังประเมิน…) → gc-card gc-neutral", !!ph && ph[1].split(/\s+/).indexOf("gc-card") >= 0 && tonesOf(ph[1].split(/\s+/)).join() === "gc-neutral", ph && ph[1]);
})();
// every top-level card in #mcRoot: gc-card + exactly one tone · no nested glass
(function () {
  var P = boot({ R: mkR(35, "warn", "orange"), snap: mkSnap(DOC_CONC), thesis: { NVDA: "overdue" } });
  var list = topLevel(P.html());
  var bad = list.filter(function (c) { return c.cls.indexOf("gc-card") < 0 || tonesOf(c.cls).length !== 1; }).map(function (c) { return c.open.slice(0, 90); });
  var nested = list.filter(function (c) { return gcCount(c.inner) > 0; }).map(function (c) { return c.open.slice(0, 90); });
  t("ทุกการ์ดระดับบนใน #mcRoot (" + list.length + " ใบ) ใส่ gc-card + tone เดียว", list.length === 5 && bad.length === 0, bad);
  t("ไม่มีการ์ดแก้วซ้อนในการ์ดแก้ว", nested.length === 0, nested);
  t("คงคลาสเดิมของการ์ด (mcx-reload · mcx-decision mcx-acc-warn · mc-card mc-panel mcx-pf · mc-card mc-panel · mc-card mc-panel mcx-more)",
    list[0].cls.indexOf("mcx-reload") >= 0 && list[1].cls.indexOf("mcx-decision") >= 0 && list[1].cls.indexOf("mcx-acc-warn") >= 0 &&
    ["mc-card", "mc-panel", "mcx-pf"].every(function (k) { return list[2].cls.indexOf(k) >= 0; }) &&
    ["mc-card", "mc-panel"].every(function (k) { return list[3].cls.indexOf(k) >= 0; }) &&
    ["mc-card", "mc-panel", "mcx-more"].every(function (k) { return list[4].cls.indexOf(k) >= 0; }), list.map(function (c) { return c.cls.join(" "); }));
})();

// ================================================================ 2 · on the glass
console.log("== 2 · บนแก้ว: ตัวเลข · ปุ่ม · สีข้อความ ==");
(function () {
  var P = boot({ R: mkR(27, "bear", "orange"), snap: mkSnap(DOC_CONC) });
  var h = P.html();
  var inlineColour = (h.match(/style="(?:[^"]*[;\s])?(?:color|border-left-color)\s*:[^"]*"/g) || []);
  t("(ตัวตรวจ inline colour จับได้จริง)", /style="(?:[^"]*[;\s])?(?:color|border-left-color)\s*:[^"]*"/.test('<b style="color:#f00">') &&
    /style="(?:[^"]*[;\s])?(?:color|border-left-color)\s*:[^"]*"/.test('<i style="width:3%; color:#f00">') && !/style="(?:[^"]*[;\s])?(?:color|border-left-color)\s*:[^"]*"/.test('<i style="width:3%;background:#f00">'));
  t("ไม่มีข้อความที่ระบายสีด้วย inline style (สีอยู่ที่ tone ของการ์ด · ความหมายเดิมคงไว้เป็นจุดสี/แท่ง)", inlineColour.length === 0, inlineColour.slice(0, 5));
  var dec = cardBy(h, MK.decision), pf = cardBy(h, MK.pf), mkt = cardBy(h, MK.mkt);
  t("พอร์ต: ตัวเลขหลัก 3 ช่องเป็น gc-num (มูลค่ารวม · สินทรัพย์ · ลงทุน/เงินสด)",
    (pf.outer.match(/<strong class="gc-num[^"]*">/g) || []).length === 3, (pf.outer.match(/<strong[^>]*>/g) || []));
  t("พอร์ต: ป้ายกระจุกตัวเป็นชิปสัญญาณเสี่ยง (gc-chip gc-chip-risk) คงคลาส mcx-pf-warn", /class="mcx-pf-warn gc-chip gc-chip-risk"/.test(pf.outer));
  t("ตลาด: คะแนนในแถบเทียบช่วงก่อนหน้าเป็น gc-num (4 ช่อง)", (mkt.outer.match(/<strong class="gc-num[^"]*">/g) || []).length === 4, (mkt.outer.match(/<strong[^>]*>/g) || []));
  t("ตลาด: ปุ่มช่วงกราฟ 3M/6M/1Y/2Y = gc-btn (ช่วงที่เลือก = ขาว is-active · ที่เหลือ ghost) คง data-r",
    /<button type="button" class="gc-btn is-active" data-r="1Y">1Y<\/button>/.test(mkt.outer) &&
    ["3M", "6M", "2Y"].every(function (r) { return new RegExp('<button type="button" class="gc-btn gc-btn-ghost" data-r="' + r + '">').test(mkt.outer); }),
    (mkt.outer.match(/<button[^>]*data-r[^>]*>/g) || []));
  t("ตลาด: คำอธิบายสีของแท่ง (ลดเสี่ยง/กลาง/ลงทุนได้ · Risk-On/Neutral/Risk-Off) = จุดสีเดิม + ข้อความหมึกแก้ว",
    (mkt.outer.match(/<span class="mcx-sc"><i style="background:#(?:ef4444|eab308|22c55e)"><\/i>/g) || []).length === 6, (mkt.outer.match(/mcx-sc[^<]*<i[^>]*>/g) || []));
  t("ตลาด: แท่งคะแนนย้อนหลังยังเป็นสีเดิม (เขียว/เหลือง/แดง = ความหมายเฉพาะ)", /class="mcx-hist-bar" style="[^"]*background:#ef4444/.test(mkt.outer) && /class="mcx-hist-bar" style="[^"]*background:#22c55e/.test(mkt.outer));
  t("ตลาด: ประโยคสรุปเป็น gc-callout มีจุดสีของ band", /<div class="mcx-mkt-verdict gc-callout"><i class="mcx-band-dot" style="background:#f97316"><\/i><b>Risk-Off · 27\/100<\/b>/.test(mkt.outer), (/mcx-mkt-verdict[^]*?<\/b>/.exec(mkt.outer) || [""])[0]);
  t("ตลาด: ลิงก์ Bitcoin เป็นปุ่ม ghost (คง href /bitcoin-monitor)", /<a class="mcx-mkt-btc gc-btn gc-btn-ghost" href="\/bitcoin-monitor">/.test(mkt.outer));
  // fix round 1: gc-btn is inline-flex — loose text runs + <b> each became a flex column and words broke mid-word at 390px
  (function () {
    var m = /<a class="mcx-mkt-btc[^"]*" href="\/bitcoin-monitor">([\s\S]*?)<\/a>/.exec(mkt.outer);
    var inner = m ? m[1] : "", kids = topLevel(inner), stray = kids.length ? inner.replace(kids[0].outer, "").trim() : inner.trim();
    t("ตลาด: เนื้อหาลิงก์ Bitcoin อยู่ใน span เดียว (flex item เดียว → ข้อความไหลเป็นบรรทัดเดียวกัน ไม่แตกเป็นคอลัมน์) · ข้อความเดิมครบ",
      kids.length === 1 && kids[0].tag === "span" && kids[0].cls.indexOf("mcx-mkt-btc-txt") >= 0 && stray === "" &&
      /₿ Bitcoin: <b>Accumulation<\/b> · คาดการณ์ 90D <b class="mcx-pos">เอนขึ้น \(median \+12%\)<\/b> →/.test(kids[0].inner), inner);
  })();
  t("วันนี้ต้องทำอะไร: หมายเหตุสวนแนวทาง = gc-callout gc-callout-dashed", /<div class="mcx-q-note gc-callout gc-callout-dashed">/.test(dec.outer) || dec.outer.indexOf("mcx-q-note") < 0);
  var more = cardBy(h, MK.more);
  t("เจาะลึก · Market Regime: ป้าย band = จุดสีเดิม + ข้อความหมึก", /<div class="mcx-hero-band"><i class="mcx-band-dot" style="background:#f97316"><\/i>Risk-Off<\/div>/.test(more.inner), (/mcx-hero-band[^]*?<\/div>/.exec(more.inner) || [""])[0]);
  t("ไม่มีคำแนะนำซื้อขาย / NaN / undefined", !ADVISORY.test(h) && !/NaN|undefined|\[object /.test(h));
})();

// ================================================================ 3 · re-render paths keep the glass
console.log("== 3 · วาดใหม่แล้วยังเป็นแก้ว ==");
(function () {
  var P = boot({ R: mkR(66, "watch-bull", "lightgreen"), snap: mkSnap(DOC_CONC), thesis: { HOOD: "due-soon" } });
  P.clickRange("3M");
  var h1 = P.html();
  t("สลับช่วงกราฟ 3M (render ใหม่ทั้ง #mcRoot): ทุกการ์ดยังเป็นแก้ว tone เดิม · ปุ่ม 3M เป็นช่วงที่เลือก",
    toneOf(cardBy(h1, MK.reload)) === "gc-warning" && toneOf(cardBy(h1, MK.decision)) === "gc-calm" && toneOf(cardBy(h1, MK.pf)) === "gc-warning" &&
    toneOf(cardBy(h1, MK.mkt)) === "gc-calm" && toneOf(cardBy(h1, MK.more)) === "gc-neutral" && /class="gc-btn is-active" data-r="3M"/.test(h1),
    topLevel(h1).map(function (c) { return toneOf(c); }));
  P.st.R = mkR(12, "bear", "red"); P.st.snap = mkSnap(DOC_SPREAD);
  P.snapshotEvent();
  var h2 = P.html();
  t("snapshot event (Load Latest Data เสร็จ) → วาดใหม่ตามสถานะใหม่: decision gc-danger · market gc-danger · พอร์ต gc-neutral",
    toneOf(cardBy(h2, MK.decision)) === "gc-danger" && toneOf(cardBy(h2, MK.mkt)) === "gc-danger" && toneOf(cardBy(h2, MK.pf)) === "gc-neutral",
    topLevel(h2).map(function (c) { return toneOf(c); }));
})();

// ================================================================ 4 · Privacy Lock
console.log("== 4 · Privacy Lock ==");
(function () {
  [DOC_CONC, DOC_SPREAD].forEach(function (doc, i) {
    var P = boot({ R: mkR(45, "neutral", "yellow"), snap: mkSnap(doc), thesis: { NVDA: "overdue" } });
    var h = P.html(), mk = masked(h);
    var rawMoney = (h.match(/฿[\d,]+/g) || []);
    t("fixture " + (i + 1) + ": หน้ามียอดเงิน ฿ จริง (" + rawMoney.length + " จุด) และทุกจุดอยู่ใน text node เดียวกับ ฿", rawMoney.length >= 6 && rawMoney.every(function (s) { return MONEY_NUM.test(s) || /฿\d+$/.test(s); }), rawMoney.slice(0, 4));
    var text = mk.replace(/<[^>]*>/g, " ");     // what is on screen after the mask (attributes are checked below)
    var left = text.match(new RegExp(MONEY_NUM.source, "g")) || [];
    t("fixture " + (i + 1) + ": ล็อกแล้ว (maskText ทุก text node แบบ privacy.js) ไม่เหลือตัวเลขเงินสักตัวบนจอ", left.length === 0 && !/฿\s?\d/.test(text) && /฿XXX/.test(text), left.slice(0, 5));
    var leakAttr = attrsOf(h, "title").concat(attrsOf(h, "aria-label")).filter(function (s) { return s.indexOf("฿") >= 0 || MONEY_NUM.test(s) || /บาท|THB/.test(s); });
    t("fixture " + (i + 1) + ": ไม่มีเงินใน title / aria-label", leakAttr.length === 0, leakAttr);
  });
})();

// ================================================================ 5 · CSS + versions
console.log("== 5 · mission-control-v2.css + เวอร์ชัน ==");
var CSS = read("mission-control-v2.css");
var BODY = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
var RULES = (function () {
  var out = [], re = /([^{}]+)\{([^{}]*)\}/g, m;
  while ((m = re.exec(BODY)) !== null) {
    var prelude = m[1].trim();
    if (prelude.charAt(0) === "@") continue;
    out.push({ sel: prelude.split(",").map(function (s) { return s.trim().replace(/\s+/g, " "); }), body: m[2] });
  }
  return out;
})();
function rulesFor(pred) { return RULES.filter(function (r) { return r.sel.some(pred); }); }
function declIn(rules, prop) {
  var v = null;
  rules.forEach(function (r) { var re = new RegExp("(?:^|;)\\s*" + prop.replace(/-/g, "\\-") + "\\s*:\\s*([^;]+)", "g"), m; while ((m = re.exec(r.body)) !== null) v = m[1].trim(); });
  return v;
}
function lin(v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
function lumHex(h) { var m = /^#([0-9a-f]{6})$/i.exec(h || ""); if (!m) return -1; var n = parseInt(m[1], 16); return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); }
(function () {
  var remap = RULES.filter(function (r) { return r.sel.length === 1 && r.sel[0] === "#mcRoot .gc-card"; });
  var INK = { "--mc-text": "var(--gc-ink)", "--mc-text-2": "var(--gc-ink-2)", "--mc-muted": "var(--gc-ink-2)", "--mc-faint": "var(--gc-ink-2)",
    "--mc-border": "var(--gc-line)", "--mc-elevated": "var(--gc-well)", "--mc-card": "var(--gc-well)" };
  var badInk = Object.keys(INK).filter(function (k) { return declIn(remap, k) !== INK[k]; });
  t("#mcRoot .gc-card แมปโทเคน mc → หมึก/เส้น/ช่องของแก้ว (ตัวหนังสือขาวทั้งสองธีม)", remap.length === 1 && badInk.length === 0, badInk.map(function (k) { return k + "=" + declIn(remap, k); }));
  var ACC = ["--mc-emerald", "--mc-red", "--mc-rose", "--mc-amber", "--mc-cyan", "--mc-teal", "--mc-blue", "--mc-violet"];
  var weak = ACC.filter(function (k) { return lumHex(declIn(remap, k)) < 0.70; });
  t("สีสถานะบนแก้ว (เขียว/แดง/ส้ม/ฟ้า…) สว่างพอ: luminance ≥ 0.70 (≥ 4.7:1 บนจุดสว่างสุดของทุก tone · โมเดลเดียวกับ Task 1)", weak.length === 0,
    weak.map(function (k) { return k + "=" + declIn(remap, k) + " L=" + lumHex(declIn(remap, k)).toFixed(3); }));
  t("--mc-bg บนแก้ว = สีเข้ม (ตัวอักษรบนเม็ดสีอ่อน เช่น ป้าย 'ตอนนี้' / เลขขั้น Lead–Lag อ่านได้ทั้งสองธีม)", lumHex(declIn(remap, "--mc-bg")) >= 0 && lumHex(declIn(remap, "--mc-bg")) < 0.02, declIn(remap, "--mc-bg"));
  // old card skins that the glass replaces are gone
  var VISUAL = /(?:^|;)\s*(?:background(?:-color|-image)?|border(?:-left)?|border-radius|box-shadow)\s*:/;
  ["mcx-decision", "mcx-reload", "ha-box"].forEach(function (k) {
    var rs = rulesFor(function (s) { return s === "." + k; });
    t("." + k + ": ไม่มีพื้น/ขอบ/เงาของการ์ดเก่าแล้ว (glass-cards.css ทำแทน)", rs.length > 0 && rs.every(function (r) { return !VISUAL.test(r.body); }), rs.map(function (r) { return r.body.trim().slice(0, 120); }));
  });
  t(".mcx-decision::after / .mcx-decision.mcx-acc-* / .mcx-acc-* ถูกลบ (แสงทับ + ขอบซ้ายสีเก่า แทนด้วย tone)",
    rulesFor(function (s) { return /^\.mcx-decision::after$|^\.mcx-decision\.mcx-acc-|^\.mcx-acc-/.test(s); }).length === 0);
  t(".ha-b / .ha-in / .mcx-reload-chip ไม่ทับหน้าตา gc-btn / gc-field (ไม่มีพื้น/ขอบ/สีของตัวเอง)",
    ["ha-b", "ha-in", "mcx-reload-chip"].every(function (k) { var rs = rulesFor(function (s) { return s === "." + k; }); return rs.length > 0 && rs.every(function (r) { return !VISUAL.test(r.body) && !/(?:^|;)\s*color\s*:/.test(r.body); }); }) &&
    rulesFor(function (s) { return /^\.mcx-reload-chip\.mcx-reload-(reload|soon)$|^\.ha-b\.is-done$|^\.ha-in:focus-visible$|^\.ha-b:focus-visible$/.test(s); }).length === 0);
  // the file loads on EVERY page (app-navigation injects it): every glass rule is scoped to Home
  var unscoped = [];
  RULES.forEach(function (r) { r.sel.forEach(function (s) { if (/gc-/.test(s) && !/^#mcRoot\b/.test(s) && !/^\.mcx-hero:not\(:where\(\.gc-card\)\)/.test(s)) unscoped.push(s); }); });
  t("selector ที่พูดถึง gc- ทุกตัวจำกัดที่ #mcRoot (หรือเป็นตัวกัน .mcx-hero:not(:where(.gc-card)))", unscoped.length === 0, unscoped);
  var heroSel = [];
  RULES.forEach(function (r) { r.sel.forEach(function (s) { if (/(^|[\s>+~,])\.mcx-hero(?![\w-])/.test(s)) heroSel.push(s); }); });
  var heroBad = heroSel.filter(function (s) { return !/^\.mcx-hero:not\(:where\(\.gc-card\)\)/.test(s) && !/^#mcRoot \.mcx-hero\.gc-card/.test(s); });
  t(".mcx-hero (ใช้ร่วมกับ /bitcoin-monitor): ทุก selector กันด้วย :not(:where(.gc-card)) — specificity เท่าเดิม หน้าอื่นไม่เปลี่ยน", heroSel.length >= 3 && heroBad.length === 0, heroBad);
  var arc = rulesFor(function (s) { return s === "#mcRoot .gc-card .mcx-gauge-svg circle + circle"; });
  var num = rulesFor(function (s) { return s === "#mcRoot .gc-card .mcx-gauge-num"; });
  t("เกจบนแก้ว: เส้นโค้ง + ตัวเลขเป็นสีขาว (สีของ band อยู่ที่ tone ของการ์ด + จุดสี) · ตัวเลข Inter 700 (--gc-num-font)",
    declIn(arc, "stroke") === "#fff" && declIn(num, "fill") === "#fff" && declIn(num, "font-family") === "var(--gc-num-font)" && declIn(num, "font-weight") === "700",
    [declIn(arc, "stroke"), declIn(num, "fill"), declIn(num, "font-family")]);
  // found in Chrome: .ha-kpi-n kept font-weight 800 over .gc-num's 700 (this file loads after glass-cards.css)
  var numSel = [".ha-kpi-n", ".mcx-pf-hero > div strong", ".mcx-trend-cell strong"];
  var heavy = numSel.filter(function (s) { var w = declIn(rulesFor(function (x) { return x === s; }), "font-weight"); return w != null && w !== "700"; });
  t("ตัวเลขที่ใส่ gc-num (KPI ครั้ง · หัวพอร์ต · คะแนนเทียบช่วง) ไม่ถูกกฎเดิมทับเป็นน้ำหนักอื่น (Inter 700)", heavy.length === 0, heavy);
  // found in Chrome/model: opacity .6 put ink-2 at 3.65:1 on the glass well
  var ans = declIn(rulesFor(function (s) { return s === ".ha-rule.is-answered"; }), "opacity");
  var off = declIn(rulesFor(function (s) { return s === "#mcRoot .gc-card .mcx-contrib-off"; }), "opacity");
  t("แถวที่จาง (ติ๊กแล้ว · ส่วนประกอบที่ยังไม่เชื่อม) จางไม่เกิน opacity 0.75 บนแก้ว (หมึกรอง ≥ 4.5:1)", Number(ans) >= 0.75 && Number(off) >= 0.75, [ans, off]);
  // fix round 1: mission-control.css .mc-btn:hover lifts (translateY) and .mc-btn-primary:hover adds a cyan glow — the
  //   glass pills that keep mc-btn (ดึงราคาใหม่ / ลองใหม่ / Load Latest Data of the empty hero) must not
  var mcHover = rulesFor(function (s) { return s === "#mcRoot .mc-btn.gc-btn:hover"; });
  t("ปุ่มแก้วที่ยังมี mc-btn (ha-btn · #mcxLoad) ไม่ยก/ไม่เรืองฟ้าตอน hover: #mcRoot .mc-btn.gc-btn:hover → transform none + ขอบแก้วเดิม",
    declIn(mcHover, "transform") === "none" && declIn(mcHover, "box-shadow") === "inset 0 0 0 1px var(--gc-btn-rim, var(--app-muted))" &&
    rulesFor(function (s) { return s === "#mcRoot .ha-btn.gc-btn:hover"; }).length === 0, [declIn(mcHover, "transform"), declIn(mcHover, "box-shadow")]);
  var btcTxt = rulesFor(function (s) { return s === "#mcRoot .mcx-mkt-btc-txt"; });
  t("ข้อความในลิงก์ Bitcoin หดได้ในปุ่ม (min-width: 0) จึงตัดบรรทัดตามคำ ไม่ล้นการ์ด", declIn(btcTxt, "min-width") === "0", declIn(btcTxt, "min-width"));
  t("ช่อง ha-histwrap ยังเลื่อนแนวนอนในกล่องของตัวเอง · 600px ยังเรียง KPI 2×2", /\.ha-histwrap\s*\{[^}]*overflow-x:\s*auto/.test(CSS) && /@media \(max-width: 600px\)[\s\S]*\.ha-kpis\s*\{[^}]*repeat\(2/.test(CSS));
  var fonts = [];
  RULES.forEach(function (r) { var re = /font(?:-family)?\s*:\s*([^;]+)/g, m; while ((m = re.exec(r.body)) !== null) fonts.push(m[1].trim()); });
  t("ตัวเลขบนแก้วไม่ใช้ฟอนต์แบบจุด: ไม่มี Doto / dot-matrix ทั้งไฟล์ · ไม่มี LED / segment / digital ใน font ใด ๆ · ไม่มี @font-face",
    !/doto|dot-?matrix|DSEG/i.test(CSS) && !/@font-face/.test(BODY) && fonts.length > 0 && fonts.every(function (f) { return !/\bLED\b|segment|digital|matrix/i.test(f); }),
    fonts.filter(function (f) { return /LED|segment|digital|matrix/i.test(f); }));
})();
(function () {
  var HOME = read("home.html"), AIC = read("ai-cycle.html"), W3 = read("wave3.html"), NAV = read("app-navigation.js");
  function ver(h, f) { var m = new RegExp(f.replace(/[.]/g, "\\.") + "\\?v=([^\"]+)\"").exec(h); return m ? m[1] : null; }
  var v2 = ver(HOME, "/mission-control-v2.css");
  t("mission-control-v2.css bump → 20261122-mcx-12 ทั้ง home / ai-cycle / wave3 และเวอร์ชันที่ app-navigation ฉีด", v2 === "20261122-mcx-12" && ver(AIC, "/mission-control-v2.css") === v2 &&
    ver(W3, "/mission-control-v2.css") === v2 && NAV.indexOf('ensureStylesheet("/mission-control-v2.css?v=' + v2 + '")') >= 0, [v2, ver(AIC, "/mission-control-v2.css"), ver(W3, "/mission-control-v2.css")]);
  t("mission-control-page.js → 20261122-mc2-21 · home-action-page.js → 20261122-ha-3", ver(HOME, "/mission-control-page.js") === "20261122-mc2-21" && ver(HOME, "/home-action-page.js") === "20261122-ha-3",
    [ver(HOME, "/mission-control-page.js"), ver(HOME, "/home-action-page.js")]);
  var iG = HOME.indexOf("/glass-cards.css?v="), iM = HOME.indexOf("/mission-control.css?v="), iV = HOME.indexOf("/mission-control-v2.css?v=");
  t("home.html: mission-control.css → glass-cards.css → mission-control-v2.css", iM > 0 && iG > iM && iV > iG, [iM, iG, iV]);
})();

finish();
