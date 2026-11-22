"use strict";
// ============================================================
// SMART DCA (/smart-dca) — การ์ดแก้ว (glass-cards.css)
//   node scripts/smart-dca-glass-test.js
//
// รัน smart-dca-engine.js + smart-dca-page.js ของจริงใน vm (DOM ปลอม · cache Coin Metrics สมมุติใน localStorage
// จึงวาดแบบ synchronous · ไม่มีเน็ต) แล้วล็อก:
//   · การ์ด → สถานะต้นทาง → tone (สถานะที่หน้าคำนวณอยู่แล้วเท่านั้น):
//       Hero (.sdca-hero)              โซน MVRV/Mayer ปัจจุบัน  fire/deep/accum/early (×>1) → calm · base (×1) → normal ·
//                                      rich/hot (×0.5/×0.25) → warning · euphoria (×0) → danger · ไม่มีโซน → neutral
//       ผล backtest (.sdca-cmp-card)   🏆 is-winner → calm · อีกใบ → neutral
//       แถบสรุป (.sdca-diff)           Smart DCA ชนะ → calm · แพ้ ("ROI แย่กว่า") → danger · เสมอ → neutral
//       ไทล์ journal (.sdca-j-card)    มูลค่าตอนนี้ (กำไร/ขาดทุนยังไม่ขาย) · กำไรที่ขายแล้ว → calm/danger · ที่เหลือ → neutral
//       แผนขาย (.sdca-sellplan)        is-active (โซนแพง + มี BTC) → warning · อื่น → neutral
//       แถบเตือน (.sdca-banner)        โหมดสำรอง Mayer · ขายเกินที่ถือ → warning (หน้าเดิมทาสีเหลืองอำพัน ⚠️)
//       ตารางโซน · กราฟ · ฟอร์ม · รายการ · วิธีคิด · โหลด/ผิดพลาด → neutral
//   · การ์ดละหนึ่ง tone · ไม่มีการ์ดแก้วซ้อนการ์ดแก้ว · ตัวเลข gc-num · ช่องกรอก gc-field · ปุ่ม gc-btn / gc-btn-ghost
//   · Privacy: maskText ของ privacy.js ทุก text node แล้วไม่เหลือ ฿ตัวเลข · ไม่มีเงินใน title / aria-label
//   · HTML โหลด glass-cards.css ก่อน smart-dca.css · CSS ไม่วาดหน้าการ์ด/ปุ่ม/ช่องเก่าทับของแก้ว · สีขึ้น/ลงบนแก้วสว่างพอ
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
  if (cond) { pass++; console.log("  PASS  " + name); return; }
  fail++;
  console.log("  FAIL  " + name + (extra !== undefined ? "  → " + JSON.stringify(extra) : ""));
}

var TONES = ["gc-calm", "gc-normal", "gc-warning", "gc-danger", "gc-neutral"];
var ENGINE = read("smart-dca-engine.js");
var PAGE = read("smart-dca-page.js");

// ---------------------------------------------------------------- harness
function today() { return new Date().toISOString().slice(0, 10); }
function dailyDates(startISO, n) {
  var out = [], t0 = Date.parse(startISO + "T00:00:00Z");
  for (var i = 0; i < n; i++) out.push(new Date(t0 + i * 86400000).toISOString().slice(0, 10));
  return out;
}
// Coin Metrics day cache in the page's own compact format: { u: today, rows: [[date, price, mvrv]] }
function cmCache(n, priceFn, valFn) {
  return JSON.stringify({ u: today(), rows: dailyDates("2024-01-01", n).map(function (d, i) { return [d, priceFn(i), valFn(i)]; }) });
}
function flat(v) { return cmCache(420, function () { return 100; }, function () { return v; }); }

// fake elements for every id="sdca…" in a render (the browser rebuilds them on each innerHTML) — value from the tag
function fakeEl(id, value) {
  var h = {};
  return { id: id, value: value, textContent: "", listeners: h, focus: function () {},
    addEventListener: function (type, fn) { (h[type] = h[type] || []).push(fn); },
    fire: function (type) { var self = this; (h[type] || []).forEach(function (fn) { fn({ preventDefault: function () {}, target: self }); }); } };
}
function makeEls(html) {
  var els = {}, re = /<([a-z]+)\b([^>]*)\bid="(sdca[A-Za-z]+)"([^>]*)>/g, m;
  while ((m = re.exec(html)) !== null) { var v = /\bvalue="([^"]*)"/.exec(m[2] + " " + m[4]); els[m[3]] = fakeEl(m[3], v ? v[1] : ""); }
  return els;
}

// opts: { store: {key: string}, fetch: fn, locked: bool } → { html, ctx, rerender, el, renders, fireDoc, lock }
function boot(opts) {
  var store = {};
  Object.keys(opts.store || {}).forEach(function (k) { store[k] = opts.store[k]; });
  var html = "", renders = 0, els = {}, docListeners = {}, LOCK = { v: !!opts.locked };
  var root = {};
  Object.defineProperty(root, "innerHTML", { get: function () { return html; }, set: function (h) { html = h; renders++; els = makeEls(h); } });
  var ctx = {
    console: console,
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; }
    },
    fetch: opts.fetch || function () { return new Promise(function () {}); },
    addEventListener: function () {},
    document: {
      readyState: "complete",
      activeElement: null,
      addEventListener: function (type, fn) { (docListeners[type] = docListeners[type] || []).push(fn); },
      getElementById: function (id) { return id === "sdcaRoot" ? root : (els[id] || null); },
      querySelector: function () { return null; },
      querySelectorAll: function () { return []; }
    }
  };
  if (opts.locked != null) ctx.PortfolioPrivacy = { isLocked: function () { return LOCK.v; } };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(ENGINE, ctx, { filename: "smart-dca-engine.js" });
  vm.runInContext(PAGE, ctx, { filename: "smart-dca-page.js" });
  return { root: root, ctx: ctx, store: store, html: function () { return root.innerHTML; }, rerender: function () { ctx.SmartDCAPage.render(); return root.innerHTML; },
    el: function (id) { return els[id] || null; }, renders: function () { return renders; },
    fireDoc: function (type) { (docListeners[type] || []).forEach(function (fn) { fn({ detail: { locked: LOCK.v } }); }); },
    lock: function (v) { LOCK.v = !!v; } };
}
// the <input …> tag of one id in a render
function tagOf(html, id) { var m = new RegExp('<input\\b[^>]*\\bid="' + id + '"[^>]*>').exec(html); return m ? m[0] : ""; }
function tick() { return new Promise(function (r) { setImmediate(r); }); }

// every element whose class list has gc-card, in document order: { cls: [..], first: "sdca-…" }
function cards(html) {
  var out = [], re = /<([a-z][a-z0-9]*)\b[^>]*\bclass="([^"]*)"/gi, m;
  while ((m = re.exec(html)) !== null) {
    var cls = m[2].split(/\s+/).filter(Boolean);
    if (cls.indexOf("gc-card") >= 0) out.push({ tag: m[1], cls: cls, first: cls[0] });
  }
  return out;
}
function toneOf(card) { var ts = card.cls.filter(function (c) { return TONES.indexOf(c) >= 0; }); return ts.length === 1 ? ts[0] : ts.join("+") || "none"; }
function cardBy(html, cls) { return cards(html).filter(function (c) { return c.cls.indexOf(cls) >= 0; }); }
function tonesBy(html, cls) { return cardBy(html, cls).map(toneOf); }
// gc-card inside gc-card?
function nested(html) {
  var VOID = { input: 1, br: 1, img: 1, hr: 1, meta: 1, link: 1, line: 1, rect: 1, polyline: 1, path: 1, circle: 1 };
  var stack = [], bad = [], re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*?)(\/?)>/g, m;
  while ((m = re.exec(html)) !== null) {
    var close = m[1] === "/", tag = m[2].toLowerCase(), attrs = m[3], selfClose = m[4] === "/";
    if (close) { while (stack.length && stack[stack.length - 1].tag !== tag) stack.pop(); stack.pop(); continue; }
    var isCard = /\bclass="[^"]*\bgc-card\b/.test(attrs);
    if (isCard && stack.some(function (s) { return s.card; })) bad.push(tag + ":" + (/class="([^"]*)"/.exec(attrs) || [])[1]);
    if (!selfClose && !VOID[tag]) stack.push({ tag: tag, card: isCard });
  }
  return bad;
}
function textNodes(html) {
  return html.replace(/<svg[\s\S]*?<\/svg>/g, " ").split(/<[^>]*>/).map(function (s) {
    return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  }).filter(function (s) { return s.trim(); });
}

var JOURNAL_KEY = "smart_dca_journal_v1", FX_KEY = "smart_dca_fx_v1", CACHE_KEY = "smart_dca_cm_v1";
function fx(thb) { return JSON.stringify({ u: today(), thb: thb }); }
function journal(list) { return JSON.stringify(list.map(function (e, i) { e.id = "j" + i; return e; })); }

(async function main() {
  // ---------------------------------------------------------------- 1 · hero tone = current zone
  console.log("\n[1] hero (.sdca-hero) tone = MVRV zone of the latest value");
  var ZONE_CASES = [
    [0.5, "fire", "gc-calm"], [0.9, "deep", "gc-calm"], [1.2, "accum", "gc-calm"], [1.7, "early", "gc-calm"],
    [2.2, "base", "gc-normal"], [2.7, "rich", "gc-warning"], [3.2, "hot", "gc-warning"], [4.0, "euphoria", "gc-danger"]
  ];
  ZONE_CASES.forEach(function (c) {
    var h = boot({ store: { smart_dca_cm_v1: flat(c[0]) } }).html();
    t("MVRV " + c[0] + " (" + c[1] + ") → hero " + c[2], tonesBy(h, "sdca-hero").join() === c[2], tonesBy(h, "sdca-hero"));
  });
  var nz = boot({ store: { smart_dca_cm_v1: cmCache(420, function () { return 100; }, function () { return null; }) } }).html();
  t("no valuation (neutralFallback, ×1) → hero gc-neutral", tonesBy(nz, "sdca-hero").join() === "gc-neutral", tonesBy(nz, "sdca-hero"));
  t("no valuation → its warning chip is gc-chip gc-chip-risk", /class="sdca-chip sdca-chip-warn gc-chip gc-chip-risk"/.test(nz));
  var h22 = boot({ store: { smart_dca_cm_v1: flat(2.2) } }).html();
  t("hero ×N is white gc-num gc-num-xl (no inline zone colour on the text)", /<div class="sdca-mult gc-num gc-num-xl">×1<\/div>/.test(h22));
  t("hero zone name keeps the zone colour on a dot, text white", /<div class="sdca-zone-name"><i class="sdca-zdot" style="background:#facc15"><\/i>โซนปกติ/.test(h22));
  t("hero suggestion number is gc-num", /<div class="sdca-suggest">งวดนี้แนะนำ DCA ≈ <b class="gc-num">฿1,000<\/b><\/div>/.test(h22));
  t("hero controls are gc-field (#sdcaBase, #sdcaFreq)", /id="sdcaBase" class="gc-field"/.test(h22) && /id="sdcaFreq" class="gc-field"/.test(h22));
  t("hero chips are gc-chip gc-chip-flat", (h22.match(/class="sdca-chip gc-chip gc-chip-flat"/g) || []).length >= 2);

  // every zone key of both tables has a tone in the map (no zone silently falls to neutral)
  var eng = boot({ store: { smart_dca_cm_v1: flat(2.2) } }).ctx.SmartDCA;
  var keys = eng.MVRV_ZONES.concat(eng.MAYER_ZONES).map(function (z) { return z.key; });
  var missing = keys.filter(function (k) { return !new RegExp("\\b" + k + ': "gc-(calm|normal|warning|danger)"').test(PAGE); });
  t("GC_ZONE_TONE covers every MVRV + Mayer zone key (" + keys.length + ")", missing.length === 0, missing);

  // ---------------------------------------------------------------- 2 · ladder
  console.log("\n[2] zone ladder (.sdca-ladder) = gc-neutral, zone colours kept");
  t("ladder card gc-neutral", tonesBy(h22, "sdca-ladder").join() === "gc-neutral", tonesBy(h22, "sdca-ladder"));
  var pills = h22.match(/<b class="sdca-zmult" style="background:#[0-9a-f]{6}">×[\d.]+<\/b>/g) || [];
  t("8 ×N pills carry the zone colour as their face", pills.length === 8, pills.length);
  t("current row keeps its zone ring + the white gc-pill 'now' marker", /sdca-zrow is-current" style="box-shadow:inset 0 0 0 1.5px #facc15/.test(h22) && /<span class="sdca-znow gc-pill">◀ ตอนนี้<\/span>/.test(h22));
  t("section headings sit on the page (gc-section-h)", (h22.match(/<h2 class="gc-section-h">/g) || []).length === 4, (h22.match(/<h2 class="gc-section-h">/g) || []).length);

  // ---------------------------------------------------------------- 3 · backtest outcome
  console.log("\n[3] backtest: 🏆 winner card + Smart DCA win/lose strip");
  // Smart wins: expensive plateau → cheap bottom (×3) → recovery (same shape as smart-dca-smoke-test)
  var win = boot({ store: { smart_dca_cm_v1: cmCache(420, function (i) { return i < 140 || i >= 280 ? 100 : 50; }, function (i) { return i < 140 || i >= 280 ? 2.2 : 0.9; }) } }).html();
  var winCards = cardBy(win, "sdca-cmp-card");
  t("smart wins: DCA ปกติ card gc-neutral · Smart DCA card (🏆 is-winner) gc-calm",
    winCards.length === 2 && toneOf(winCards[0]) === "gc-neutral" && toneOf(winCards[1]) === "gc-calm" && winCards[1].cls.indexOf("is-winner") >= 0, winCards.map(toneOf));
  t("smart wins: diff strip gc-calm", tonesBy(win, "sdca-diff").join() === "gc-calm", tonesBy(win, "sdca-diff"));
  // Smart loses: valuation says "cheap ×4" at the high price and "euphoria ×0" at the low price
  var lose = boot({ store: { smart_dca_cm_v1: cmCache(420, function (i) { return i < 140 || i >= 280 ? 100 : 50; }, function (i) { return i < 140 ? 0.5 : i < 280 ? 4.0 : 2.2; }) } }).html();
  var loseCards = cardBy(lose, "sdca-cmp-card");
  t("smart loses: DCA ปกติ card (🏆 is-winner) gc-calm · Smart DCA card gc-neutral",
    loseCards.length === 2 && toneOf(loseCards[0]) === "gc-calm" && loseCards[0].cls.indexOf("is-winner") >= 0 && toneOf(loseCards[1]) === "gc-neutral", loseCards.map(toneOf));
  t("smart loses: diff strip ('ROI แย่กว่า') gc-danger", tonesBy(lose, "sdca-diff").join() === "gc-danger" && /ROI แย่กว่า/.test(lose), tonesBy(lose, "sdca-diff"));
  // tie: flat price, base zone → identical ROI
  var tieCards = cardBy(h22, "sdca-cmp-card");
  t("tie: both cards gc-neutral · diff strip gc-neutral", tieCards.map(toneOf).join() === "gc-neutral,gc-neutral" && tonesBy(h22, "sdca-diff").join() === "gc-neutral", [tieCards.map(toneOf), tonesBy(h22, "sdca-diff")]);
  t("ROI figures are gc-num gc-num-s (up/down colour kept)", (win.match(/class="sdca-cmp-roi gc-num gc-num-s sdca-(up|down)"/g) || []).length === 2);
  t("year select is gc-field", /id="sdcaYear" class="gc-field"/.test(h22));
  t("chart card gc-neutral, zone colours on the price line", tonesBy(h22, "sdca-chart-card").join() === "gc-neutral" && /<polyline [^>]*stroke="#facc15"/.test(h22));
  var short = boot({ store: { smart_dca_cm_v1: flat(2.2), smart_dca_settings_v1: JSON.stringify({ startYear: "2024" }) } });
  t("backtest still renders with the start year setting (sanity)", cardBy(short.html(), "sdca-cmp-card").length === 2);

  // ---------------------------------------------------------------- 4 · journal
  console.log("\n[4] journal tiles · sell plan · banner · form · list");
  var lossJ = boot({ store: { smart_dca_cm_v1: flat(2.2), smart_dca_fx_v1: fx(35), smart_dca_journal_v1: journal([{ date: "2026-01-05", side: "buy", thb: 10000, priceThb: 5000, btc: 2 }]) } });
  var lossH = lossJ.rerender(); // fx comes from the day cache after the first paint — the page shows it on the next render
  var tiles = cardBy(lossH, "sdca-j-card");
  t("4 tiles: BTC คงเหลือ / ต้นทุนเฉลี่ย / ต้นทุนคงเหลือ gc-neutral · มูลค่าตอนนี้ (ขาดทุน −30%) gc-danger",
    tiles.map(toneOf).join() === "gc-neutral,gc-neutral,gc-neutral,gc-danger" && /sdca-down">-30\.0%/.test(lossH), tiles.map(toneOf));
  t("tiles are gc-card gc-tile with gc-num gc-num-xs values", tiles.every(function (c) { return c.cls.indexOf("gc-tile") >= 0; }) && (lossH.match(/<b class="gc-num gc-num-xs/g) || []).length === 4);
  var gainH = boot({ store: { smart_dca_cm_v1: flat(2.2), smart_dca_fx_v1: fx(35), smart_dca_journal_v1: journal([{ date: "2026-01-05", side: "buy", thb: 10000, priceThb: 2500, btc: 4 }]) } }).rerender();
  t("มูลค่าตอนนี้ (กำไร +40%) → gc-calm", cardBy(gainH, "sdca-j-card").map(toneOf)[3] === "gc-calm" && /sdca-up">\+40\.0%/.test(gainH), cardBy(gainH, "sdca-j-card").map(toneOf));
  var noFx = boot({ store: { smart_dca_cm_v1: flat(2.2), smart_dca_journal_v1: journal([{ date: "2026-01-05", side: "buy", thb: 10000, priceThb: 2500, btc: 4 }]) } }).rerender();
  t("no USD/THB yet (รออัตรา) → มูลค่าตอนนี้ gc-neutral", cardBy(noFx, "sdca-j-card").map(toneOf)[3] === "gc-neutral" && /รออัตรา USD\/THB/.test(noFx));
  var realG = boot({ store: { smart_dca_cm_v1: flat(2.2), smart_dca_fx_v1: fx(35), smart_dca_journal_v1: journal([
    { date: "2026-01-05", side: "buy", thb: 10000, priceThb: 2500, btc: 4 }, { date: "2026-02-05", side: "sell", thb: 8000, priceThb: 4000, btc: 2 }]) } }).rerender();
  t("กำไรที่ขายแล้ว +฿3,000 → gc-calm", cardBy(realG, "sdca-j-card").map(toneOf)[4] === "gc-calm" && /\+฿3,000/.test(realG), cardBy(realG, "sdca-j-card").map(toneOf));
  var realL = boot({ store: { smart_dca_cm_v1: flat(2.2), smart_dca_fx_v1: fx(35), smart_dca_journal_v1: journal([
    { date: "2026-01-05", side: "buy", thb: 10000, priceThb: 2500, btc: 4 }, { date: "2026-02-05", side: "sell", thb: 2000, priceThb: 1000, btc: 2 }]) } }).rerender();
  t("กำไรที่ขายแล้ว −฿3,000 → gc-danger", cardBy(realL, "sdca-j-card").map(toneOf)[4] === "gc-danger" && /฿-3,000/.test(realL), cardBy(realL, "sdca-j-card").map(toneOf));

  var richHeld = boot({ store: { smart_dca_cm_v1: flat(2.7), smart_dca_journal_v1: journal([{ date: "2026-01-05", side: "buy", thb: 10000, priceThb: 2500, btc: 4 }]) } }).html();
  t("sell plan active (rich zone + BTC held) → gc-warning", tonesBy(richHeld, "sdca-sellplan").join() === "gc-warning" && cardBy(richHeld, "sdca-sellplan")[0].cls.indexOf("is-active") >= 0, tonesBy(richHeld, "sdca-sellplan"));
  var richEmpty = boot({ store: { smart_dca_cm_v1: flat(2.7) } }).html();
  t("sell plan: expensive zone but no BTC → gc-neutral", tonesBy(richEmpty, "sdca-sellplan").join() === "gc-neutral", tonesBy(richEmpty, "sdca-sellplan"));
  t("sell plan: not an expensive zone → gc-neutral", tonesBy(h22, "sdca-sellplan").join() === "gc-neutral", tonesBy(h22, "sdca-sellplan"));
  var over = boot({ store: { smart_dca_cm_v1: flat(2.2), smart_dca_journal_v1: journal([
    { date: "2026-01-05", side: "buy", thb: 1000, priceThb: 1000, btc: 1 }, { date: "2026-02-05", side: "sell", thb: 4000, priceThb: 2000, btc: 2 }]) } }).html();
  t("oversell banner → gc-card gc-strip gc-warning", tonesBy(over, "sdca-banner").join() === "gc-warning" && /sdca-banner gc-card gc-strip gc-warning">⚠️ มีรายการขายมากกว่า/.test(over), tonesBy(over, "sdca-banner"));
  t("no oversell → no banner", tonesBy(h22, "sdca-banner").length === 0);
  t("form gc-neutral · fields gc-field ×4 · submit gc-btn", tonesBy(h22, "sdca-j-form").join() === "gc-neutral" &&
    ["sdcaJDate", "sdcaJSide", "sdcaJThb", "sdcaJPrice"].every(function (id) { return new RegExp('id="' + id + '" class="gc-field"').test(h22); }) &&
    /<button type="submit" class="sdca-btn sdca-btn-primary gc-btn">บันทึก<\/button>/.test(h22));
  t("list card gc-neutral (with entries) · empty note gc-neutral (without)", tonesBy(gainH, "sdca-j-list").join() === "gc-neutral" && tonesBy(h22, "sdca-j-empty").join() === "gc-neutral");
  t("export / import / reload are gc-btn gc-btn-ghost (on the page)", /class="sdca-btn gc-btn gc-btn-ghost" id="sdcaJExport"/.test(h22) &&
    /<label class="sdca-btn sdca-btn-file gc-btn gc-btn-ghost">Import CSV<input type="file" id="sdcaJImport"/.test(h22) && /id="sdcaReload" class="sdca-btn gc-btn gc-btn-ghost"/.test(h22));
  t("methodology gc-neutral", tonesBy(h22, "sdca-method").join() === "gc-neutral");
  t("the journal heading chip stays a page chip (no gc-chip off the glass)", /<span class="sdca-chip sdca-chip-warn">สัปดาห์นี้ยังไม่ได้บันทึก DCA<\/span>/.test(h22));

  // ---------------------------------------------------------------- 5 · loading / error / Mayer fallback (async paths)
  console.log("\n[5] loading · error · Mayer fallback banner");
  var loading = boot({ store: {} }).html(); // fetch never resolves
  t("loading → mc-empty gc-card gc-neutral", tonesBy(loading, "mc-empty").join() === "gc-neutral" && /กำลังโหลด Smart DCA…/.test(loading));
  var errB = boot({ store: {}, fetch: function () { return Promise.reject(new Error("offline")); } });
  await tick(); await tick(); await tick();
  t("error → mc-empty gc-card gc-neutral + retry gc-btn", tonesBy(errB.html(), "mc-empty").join() === "gc-neutral" && /id="sdcaRetry" class="sdca-btn gc-btn"/.test(errB.html()), errB.html().slice(0, 200));
  var bars = dailyDates("2024-01-01", 420).map(function (d) { return { date: d, close: 100 }; });
  var mayer = boot({ store: {}, fetch: function (url) {
    if (/coinmetrics/.test(url)) return Promise.reject(new Error("CM down"));
    if (/\/api\/ohlc/.test(url)) return Promise.resolve({ ok: true, json: function () { return Promise.resolve({ bars: bars }); } });
    return new Promise(function () {});
  } });
  for (var k = 0; k < 6; k++) await tick();
  var mh = mayer.html();
  t("Mayer fallback → banner gc-card gc-strip gc-warning", tonesBy(mh, "sdca-banner").join() === "gc-warning" && /โหมดสำรอง/.test(mh), tonesBy(mh, "sdca-banner"));
  t("Mayer fallback: flat price → Mayer 1.0 (early ×1.5) → hero gc-calm", tonesBy(mh, "sdca-hero").join() === "gc-calm" && /×1\.5/.test(mh), tonesBy(mh, "sdca-hero"));

  // ---------------------------------------------------------------- 6 · structure across every render above
  console.log("\n[6] one tone per card · no glass inside glass");
  var ALL = [h22, nz, win, lose, lossH, gainH, realG, realL, richHeld, over, loading, errB.html(), mh];
  var noTone = [], nests = [];
  ALL.forEach(function (h) { cards(h).forEach(function (c) { if (TONES.indexOf(toneOf(c)) < 0) noTone.push(c.first + ":" + toneOf(c)); }); nests = nests.concat(nested(h)); });
  t("every gc-card has exactly one tone class", noTone.length === 0, noTone);
  t("no gc-card inside another gc-card", nests.length === 0, nests);

  // ---------------------------------------------------------------- 7 · privacy lock
  console.log("\n[7] privacy: masked text has no ฿ amounts · no money in title / aria-label");
  [["journal + fx", realG], ["oversell", over], ["hero/backtest", h22]].forEach(function (p) {
    var left = textNodes(p[1]).map(maskText).filter(function (s) { return /฿\s?-?\d/.test(s) || /\d\s?(บาท|THB)/.test(s); });
    t(p[0] + ": after maskText no text node keeps a ฿ figure", left.length === 0, left.slice(0, 3));
    var attrs = (p[1].match(/\s(title|aria-label)="[^"]*"/g) || []).filter(function (a) { return /฿|บาท|THB|\d{3}/.test(a); });
    t(p[0] + ": no money in title / aria-label", attrs.length === 0, attrs);
  });
  t("the journal amounts were really there before masking (the test sees money)", textNodes(realG).some(function (s) { return /฿\d/.test(s); }));

  // ---------------------------------------------------------------- 8 · HTML / CSS / JS contract
  console.log("\n[8] smart-dca.html · smart-dca.css · smart-dca-page.js");
  var HTML = read("smart-dca.html");
  var links = []; HTML.replace(/<link rel="stylesheet" href="\/([^"?]+)\?v=([^"]+)"/g, function (m, f, v) { links.push(f + "@" + v); });
  var files = links.map(function (l) { return l.split("@")[0]; });
  t("glass-cards.css?v=20261121-gc-2 exactly once, after mission-control.css and before smart-dca.css",
    links.filter(function (l) { return l === "glass-cards.css@20261121-gc-2"; }).length === 1 && files.indexOf("mission-control.css") < files.indexOf("glass-cards.css") &&
    files.indexOf("glass-cards.css") < files.indexOf("smart-dca.css") && files.indexOf("theme.css") === 0, links);
  t("bumped: smart-dca.css → 20261122-sdca-4 · smart-dca-page.js → 20261122-sdca-5 (privacy fix) · engine unchanged → sdca-3",
    /\/smart-dca\.css\?v=20261122-sdca-4"/.test(HTML) && /\/smart-dca-page\.js\?v=20261122-sdca-5"/.test(HTML) && /\/smart-dca-engine\.js\?v=20260723-sdca-3"/.test(HTML));
  t("Inter 700 loaded · no dot-matrix font", /family=Inter:wght@[^"&]*700/.test(HTML) && !/doto|dot-?matrix|DSEG/i.test(HTML + read("smart-dca.css")));
  t("static placeholder is a neutral glass card", /<main id="sdcaRoot" class="sdca-page"><div class="mc-empty gc-card gc-neutral">/.test(HTML));

  var CSS = read("smart-dca.css").replace(/\/\*[\s\S]*?\*\//g, "");
  var rules = []; CSS.replace(/([^{}]+)\{([^{}]*)\}/g, function (m, sel, body) { if (sel.trim().charAt(0) !== "@") rules.push({ sel: sel.trim().replace(/\s+/g, " "), body: body }); });
  var FACED = [".sdca-hero", ".sdca-ladder", ".sdca-cmp-card", ".sdca-chart-card", ".sdca-j-card", ".sdca-j-form", ".sdca-j-list", ".sdca-method", ".sdca-sellplan", ".sdca-banner", ".sdca-diff", ".sdca-btn", ".sdca-btn-primary", ".sdca-btn-file"];
  var painted = rules.filter(function (r) {
    return r.sel.split(",").some(function (s) { s = s.trim(); return FACED.some(function (f) { return s === f || s.indexOf(f + ".") === 0 || s.indexOf(f + ":") === 0; }); }) &&
      /(^|;)\s*(background|border|border-radius|box-shadow)\s*:/.test(r.body);
  }).map(function (r) { return r.sel; });
  t("old card / button faces removed — glass-cards.css paints them", painted.length === 0, painted);
  var oldFields = rules.filter(function (r) { return /(input|select)\b/.test(r.sel) && /(^|;)\s*(background|border|color)\s*:/.test(r.body); }).map(function (r) { return r.sel; });
  t("no page rule repaints inputs / selects over gc-field", oldFields.length === 0, oldFields);
  var map = rules.filter(function (r) { return r.sel === "#sdcaRoot .gc-card"; });
  var mapBody = map.length ? map[0].body : "";
  t("inside the glass the --mc-* tokens become glass ink", /--mc-text:\s*var\(--gc-ink\)/.test(mapBody) && /--mc-text-2:\s*var\(--gc-ink\)/.test(mapBody) &&
    /--mc-muted:\s*var\(--gc-ink-2\)/.test(mapBody) && /--mc-border:\s*var\(--gc-line\)/.test(mapBody), mapBody.replace(/\s+/g, " ").slice(0, 160));
  function lum(hex) {
    var h = hex.replace("#", ""); if (h.length === 3) h = h.replace(/(.)/g, "$1$1");
    var c = [0, 2, 4].map(function (i) { var v = parseInt(h.substr(i, 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  var up = /--sdca-up:\s*(#[0-9a-f]{3,6})/i.exec(mapBody), down = /--sdca-down:\s*(#[0-9a-f]{3,6})/i.exec(mapBody);
  t("up / down text on the glass lifted to luminance ≥ 0.70 (≥ 4.5:1 at every tone's brightest pixel)", !!up && !!down && lum(up[1]) >= 0.7 && lum(down[1]) >= 0.7, [up && up[1], down && down[1]]);
  var blocks = rules.filter(function (r) { return /(^|, )(\.sdca-sellplan|\.sdca-method|#sdcaRoot \.mc-empty\.gc-card)( ?,|$)/.test(r.sel) && /display:\s*block/.test(r.body); });
  t("cards with mixed inline content are display:block (sell plan · methodology · empty/error)", blocks.length === 3, blocks.map(function (r) { return r.sel; }));
  t("journal form lays out as a row on the glass (gc-card is a column)", rules.some(function (r) { return r.sel === ".sdca-j-form" && /flex-direction:\s*row/.test(r.body); }));

  var code = PAGE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/[^\n]*/g, "$1");
  t("smart-dca-page.js stays ES5 (no arrow / let / const / template literal)", !/=>|`|\blet\s|\bconst\s/.test(code));
  var forbidden = /ควรซื้อ|ควรขาย|น่าซื้อ|น่าขาย|น่าเข้า|แนะนำซื้อ|จุดเข้า|ตัดขาดทุน/;
  t("no buy/sell advice wording in any render", ALL.every(function (h) { return !forbidden.test(h); }));

  // ---------------------------------------------------------------- 9 · Privacy Lock: money in <input value>
  console.log("\n[9] privacy lock: #sdcaBase / #sdcaJThb blank + placeholder while locked (privacy.js never touches <input value>)");
  var PH = 'placeholder="ล็อกอยู่ — ใส่ค่าใหม่ได้"';
  var LST = { smart_dca_cm_v1: flat(2.2), smart_dca_fx_v1: fx(35), smart_dca_settings_v1: JSON.stringify({ base: 1500, freq: "weekly", startYear: "2020" }) };
  var L1 = boot({ store: LST, locked: true }), lh = L1.rerender();
  t("locked: #sdcaBase value=\"\" + locked placeholder (settings.base 1500 not in the field)", /\bvalue=""/.test(tagOf(lh, "sdcaBase")) && tagOf(lh, "sdcaBase").indexOf(PH) >= 0 && !/1500/.test(tagOf(lh, "sdcaBase")), tagOf(lh, "sdcaBase"));
  t("locked: #sdcaJThb value=\"\" + locked placeholder, still required", /\bvalue=""/.test(tagOf(lh, "sdcaJThb")) && tagOf(lh, "sdcaJThb").indexOf(PH) >= 0 && /\brequired\b/.test(tagOf(lh, "sdcaJThb")), tagOf(lh, "sdcaJThb"));
  t("locked: #sdcaJPrice (market BTC price ฿/BTC) keeps its value", /\bvalue="3500"/.test(tagOf(lh, "sdcaJPrice")), tagOf(lh, "sdcaJPrice"));
  t("locked: no BTC preview derived from a hidden amount", L1.el("sdcaJBtcPreview") && L1.el("sdcaJBtcPreview").textContent === "", L1.el("sdcaJBtcPreview") && L1.el("sdcaJBtcPreview").textContent);
  var U1 = boot({ store: LST, locked: false }), uh = U1.rerender();
  t("unlocked: #sdcaBase value=\"1500\", no placeholder", /\bvalue="1500"/.test(tagOf(uh, "sdcaBase")) && tagOf(uh, "sdcaBase").indexOf("placeholder") < 0, tagOf(uh, "sdcaBase"));
  t("unlocked: #sdcaJThb prefilled with the suggestion (×1 → 1500), no placeholder", /\bvalue="1500"/.test(tagOf(uh, "sdcaJThb")) && tagOf(uh, "sdcaJThb").indexOf("placeholder") < 0, tagOf(uh, "sdcaJThb"));
  // blank change while locked never overwrites settings.base and does not repaint
  var n0 = L1.renders(), base0 = L1.store.smart_dca_settings_v1;
  L1.el("sdcaBase").value = ""; L1.el("sdcaBase").fire("input"); L1.el("sdcaBase").fire("change");
  t("locked: blank #sdcaBase input + change → settings.base kept (1500), no repaint", L1.store.smart_dca_settings_v1 === base0 && JSON.parse(base0).base === 1500 && L1.renders() === n0, [L1.store.smart_dca_settings_v1, L1.renders() - n0]);
  L1.el("sdcaBase").value = "2500"; L1.el("sdcaBase").fire("input"); L1.el("sdcaBase").fire("change");
  var lh2 = L1.html();
  t("locked: typing a new amount still saves it (2500) and the repaint keeps the field blank", JSON.parse(L1.store.smart_dca_settings_v1).base === 2500 && L1.renders() === n0 + 1 && /\bvalue=""/.test(tagOf(lh2, "sdcaBase")), [L1.store.smart_dca_settings_v1, tagOf(lh2, "sdcaBase")]);
  // side-change refill: blank while locked, the prefill when unlocked (rich zone → sell plan ×0.5 of the base)
  var RST = { smart_dca_cm_v1: flat(2.7), smart_dca_settings_v1: JSON.stringify({ base: 1500 }) };
  var L2 = boot({ store: RST, locked: true }); L2.el("sdcaJThb").value = "777"; L2.el("sdcaJSide").value = "sell"; L2.el("sdcaJSide").fire("change");
  t("locked: side change (→ ขาย) leaves #sdcaJThb empty", L2.el("sdcaJThb").value === "", L2.el("sdcaJThb").value);
  var U2 = boot({ store: RST, locked: false }); U2.el("sdcaJSide").value = "sell"; U2.el("sdcaJSide").fire("change");
  t("unlocked: side change (→ ขาย) refills the sell-plan amount (750)", String(U2.el("sdcaJThb").value) === "750", U2.el("sdcaJThb").value);
  // lock / unlock repaint (privacy.js fires portfolio-privacy-changed on document)
  var P1 = boot({ store: LST, locked: true }); P1.lock(false); P1.fireDoc("portfolio-privacy-changed");
  t("unlock event → repaint with the amounts back in the fields", /\bvalue="1500"/.test(tagOf(P1.html(), "sdcaBase")) && /\bvalue="1500"/.test(tagOf(P1.html(), "sdcaJThb")), [tagOf(P1.html(), "sdcaBase"), tagOf(P1.html(), "sdcaJThb")]);
  P1.lock(true); P1.fireDoc("portfolio-privacy-changed");
  t("lock event → repaint with the fields blank again", /\bvalue=""/.test(tagOf(P1.html(), "sdcaBase")) && /\bvalue=""/.test(tagOf(P1.html(), "sdcaJThb")));

  console.log("\n" + (pass + fail) + " checks · " + pass + " passed · " + fail + " failed");
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
