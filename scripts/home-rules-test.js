"use strict";
// ============================================================
// HOME — การ์ด "กฎ 3 ข้อบอกอะไรวันนี้" (home-rules-page.js) — เทสต์ชั้นแสดงผลใน VM sandbox
//   node scripts/home-rules-test.js
//
// harness แบบเดียวกับ decision-journal-view-test: โหลด technical-indicators → decision-journal-engine →
//   home-rules-page ตามที่ home.html โหลดจริง (อ่านจาก HTML) · fetch ปลอม · ไม่ออกเน็ต
// ล็อก: universe = BTC + ETH + ธงแดงใน sleeve foreign-stock เท่านั้น · ผลกฎมาจากเอนจิน (ไม่คิดเอง)
//   · เรียงฝั่งขาย → ฝั่งซื้อ → ไม่มีกฎบอก · ไม่มี NaN/undefined · ไม่มีคำแนะนำซื้อขาย · ดึงราคาซ้ำไม่ได้
// ============================================================
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var E = require("../public/decision-journal-engine.js");

var ROOT = path.join(__dirname, "..");
var PUB = path.join(ROOT, "public");
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

// ---------- fixture: แท่งราคา ----------
function rep(v, n) { var a = []; for (var i = 0; i < n; i++) a.push(v); return a; }
function isWeekend(ymd) { var dow = new Date(ymd + "T00:00:00Z").getUTCDay(); return dow === 0 || dow === 6; }
function mkBars(endYmd, closes, daily) {
  var dates = [], d = endYmd;
  while (dates.length < closes.length) { if (daily || !isWeekend(d)) dates.unshift(d); d = E.ymdAdd(d, -1); }
  return closes.map(function (c, i) { return { date: dates[i], open: c, high: c, low: c, close: c, volume: 1000 }; });
}
// เวลาเทสต์ 2026-10-29T12:00 กรุงเทพ → US ปิดถึง 2026-10-28 · CRYPTO ปิดถึง 2026-10-28
var NOW = "2026-10-29T12:00";
var BARS = {
  // BTC: ขึ้นมานานแล้วย่อเล็กน้อย → EMA12 < EMA26 (ฝั่งขาย กฎ 1) · ยังเหนือ SMA200 มาก (ไม่หลุด) · ย่อไม่ถึง 20%
  "BTC-USD": mkBars("2026-10-28", rep(50000, 200).concat(rep(60000, 52)).concat([59700, 59400, 59100, 58800, 58500, 58200, 57900, 57600, 57300, 57000]), true),
  // ETH: เหนือ SMA200 มานานแล้วขยับขึ้นต่อ → EMA12 > EMA26 (ฝั่งซื้อ กฎ 1) · ไม่ใช่ตัดขึ้น SMA200 ใหม่ (ไม่นับยืนได้/เด้ง)
  "ETH-USD": mkBars("2026-10-28", rep(2000, 200).concat(rep(3000, 52)).concat([3010, 3020, 3030, 3040, 3050, 3060, 3070, 3080]), true),
  // NVDA: ราบ 100 → EMA เท่ากัน · เหนือ SMA200 ไม่มีสัญญาณ (ไม่มีกฎบอก)
  NVDA: mkBars("2026-10-28", rep(100, 262)),
  // GOOG: high 200 แล้วร่วงเหลือ 150 ค้าง 30 แท่ง → ย่อ −25% (กฎ 3 ย่อถึง) · ใต้ SMA200 ≥2 แท่ง (หลุดยืนยัน = ฝั่งขาย กฎ 2) · EMA ต่ำ (ฝั่งขาย กฎ 1)
  GOOG: mkBars("2026-10-28", rep(200, 230).concat(rep(150, 30))),
  // INTC: แท่งน้อย (ไม่มี SMA200) — กฎ 2 ข้อมูลไม่พอ
  INTC: mkBars("2026-10-28", rep(30, 40)),
  // RMF ไม่อยู่ใน universe · ตัวที่ไม่พบ
  "K-GTECHRMF": []
};

// ---------- sandbox DOM ----------
var els = {};
function mkEl(tag) {
  var el = {
    tagName: String(tag || "div").toUpperCase(), innerHTML: "", id: "", children: [], parentNode: null, disabled: false,
    attributes: {}, _on: {},
    setAttribute: function (k, v) { this.attributes[k] = v; },
    getAttribute: function (k) { return this.attributes[k] === undefined ? null : this.attributes[k]; },
    addEventListener: function (ev, fn) { (this._on[ev] = this._on[ev] || []).push(fn); },
    appendChild: function (c) { this.children.push(c); c.parentNode = this; return c; },
    insertBefore: function (c, ref) { var i = this.children.indexOf(ref); if (i < 0) this.children.push(c); else this.children.splice(i, 0, c); c.parentNode = this; return c; },
    querySelector: function (sel) {
      var m = /^\[([a-z-]+)\]$/.exec(sel);
      if (!m) return null;
      var re = new RegExp(m[1] + '="([^"]*)"');
      var h = re.exec(this.innerHTML);
      if (!h) return null;
      var b = mkEl("button"); b.attributes[m[1]] = h[1];
      b.addEventListener = function (ev, fn) { handlers[m[1] + "|" + ev] = fn; };
      return b;
    },
    querySelectorAll: function () { return []; }
  };
  Object.defineProperty(el, "firstChild", { get: function () { return this.children[0] || null; } });
  Object.defineProperty(el, "firstElementChild", { get: function () { return this.children[0] || null; } });
  return el;
}
var handlers = {};
var mcRoot = mkEl("main"); mcRoot.id = "mcRoot";
els.mcRoot = mcRoot;
var doc = {
  readyState: "complete",
  getElementById: function (id) {
    if (id === "mcRoot") return mcRoot;
    if (id === "hrRoot") { for (var i = 0; i < mcRoot.children.length; i++) if (mcRoot.children[i].id === "hrRoot") return mcRoot.children[i]; return null; }
    return els[id] || null;
  },
  createElement: function (tag) { return mkEl(tag); },
  addEventListener: function () {}
};
var store = {};
var fetchCalls = [];
var failSym = {};   // provider → "reject" | status
var snapshotObj = null;
var win = {
  document: doc,
  localStorage: {
    getItem: function (k) { return store[k] === undefined ? null : store[k]; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  },
  addEventListener: function () {},
  PortfolioDataSnapshot: { read: function () { return snapshotObj; } },
  fetch: function (url) {
    var u = String(url);
    fetchCalls.push(u.replace(/&_ts=\d+/, ""));
    var sym = decodeURIComponent((/[?&]symbol=([^&]+)/.exec(u) || [])[1] || "");
    if (failSym[sym] === "reject") return Promise.reject(new TypeError("Failed to fetch"));
    var status = failSym[sym] || 200;
    var body = status === 200 ? { bars: BARS[sym] || [], sourceType: "LIVE_MARKET_DATA" } : { error: "fixture HTTP " + status + (status === 404 ? " (404)" : "") };
    return Promise.resolve({ ok: status === 200, status: status, text: function () { return Promise.resolve(JSON.stringify(body)); } });
  },
  console: console, Math: Math, JSON: JSON, Date: Date, Number: Number, String: String, Object: Object, Array: Array,
  Boolean: Boolean, encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent, isFinite: isFinite,
  isNaN: isNaN, parseInt: parseInt, parseFloat: parseFloat, Promise: Promise, RegExp: RegExp, Error: Error, TypeError: TypeError,
  setTimeout: setTimeout, clearTimeout: clearTimeout, Intl: typeof Intl !== "undefined" ? Intl : undefined
};
win.window = win; win.self = win;
win.__DJ_NOW = NOW;
var ctx = vm.createContext(win);

// ---------- โหลดสคริปต์ชุดเดียวกับ home.html ----------
var HOME = fs.readFileSync(path.join(PUB, "home.html"), "utf8");
var WANT = ["technical-indicators.js", "decision-journal-engine.js", "home-rules-page.js"];
var scripts = (function () {
  var out = [], re = /<script src="\/([A-Za-z0-9._-]+\.js)/g, m;
  while ((m = re.exec(HOME)) !== null) if (WANT.indexOf(m[1]) >= 0) out.push(m[1]);
  return out;
})();
t("home.html loads indicators → engine → home-rules (in this order, before app-navigation)", scripts.join() === WANT.join() &&
  HOME.indexOf("home-rules-page.js") < HOME.indexOf("app-navigation.js?v="), scripts);
t("home.html pins the same engine version as decision-journal.html", (function () {
  var a = /decision-journal-engine\.js\?v=([^"]+)/.exec(HOME), b = /decision-journal-engine\.js\?v=([^"]+)/.exec(fs.readFileSync(path.join(PUB, "decision-journal.html"), "utf8"));
  return a && b && a[1] === b[1];
})());
var bootOk = true;
scripts.forEach(function (f) {
  try { vm.runInContext(fs.readFileSync(path.join(PUB, f), "utf8"), ctx, { filename: f }); }
  catch (e) { bootOk = false; console.error("   boot " + f + ": " + e.message); }
});
var H = win.HomeRules;
t("boots · window.HomeRules exposed", bootOk && !!H && typeof H.refresh === "function");

function html() { var r = doc.getElementById("hrRoot"); return r ? r.innerHTML : ""; }
function rowOf(sym) {
  var h = html(), i = h.indexOf('data-hr-row="' + sym + '"');
  if (i < 0) return "";
  var s = h.lastIndexOf("<div", i), e = h.indexOf('data-hr-row="', i + 10);
  return h.slice(s, e < 0 ? h.lastIndexOf('<p class="hr-foot">') : h.lastIndexOf("<div", e));
}
function order() { var out = [], re = /data-hr-row="([^"]+)"/g, m; while ((m = re.exec(html())) !== null) out.push(m[1]); return out; }
function textOf(s) { return String(s).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
var LEAK = /(NaN|undefined|Infinity|\[object )/;
var ADVISORY_TH = /ควรซื้อ|ควรขาย|น่าซื้อ|น่าขาย|แนะนำซื้อ|จุดเข้า|ตัดขาดทุน/;
var ADVISORY_EN = /\b(Buy|Sell)\b/;
function settle() { return new Promise(function (r) { setTimeout(r, 60); }).then(function () { return new Promise(function (r) { setTimeout(r, 60); }); }); }

var SNAP = { portfolioHoldings: { data: [
  { canonicalSymbol: "NVDA", isHolding: true, marketValue: 100000, portfolioBucket: "foreign-stock" },
  { canonicalSymbol: "GOOGL", isHolding: true, marketValue: 80000, portfolioBucket: "foreign-stock" },
  { canonicalSymbol: "INTC", isHolding: true, marketValue: 50000 },               // ไม่มี bucket → foreign-stock
  { canonicalSymbol: "PTT.BK", isHolding: true, marketValue: 50000 },             // หุ้นไทย → ไม่เอา
  { canonicalSymbol: "K-GTECHRMF", isHolding: true, marketValue: 50000 },         // RMF → ไม่เอา
  { canonicalSymbol: "BTCUSD", isHolding: true, marketValue: 50000 },             // bitcoin sleeve → มีอยู่แล้วใน ALWAYS
  { canonicalSymbol: "AMD", isHolding: false, watchlistOnly: true }               // ไม่ใช่ธงแดง → ไม่เอา
] } };

(async function () {
  if (!H) { finish(); return; }
  await settle();
  // ---- ไม่มีพอร์ต: BTC + ETH เท่านั้น + บอกเหตุผล ----
  t("no holdings → universe is BTC + ETH only, with a note why", H._state.rows.length === 2 && order().join() === "BTCUSD,ETHUSD" &&
    /ยังไม่มีรายการหุ้นในพอร์ต/.test(html()), [H._state.rows.map(function (r) { return r.sym + ":" + r.status; }), order()]);
  t("card mounted as the first child of #mcRoot with its heading", mcRoot.children[0] && mcRoot.children[0].id === "hrRoot" && /<h2 id="hrTitle"[^>]*>กฎ 3 ข้อบอกอะไรวันนี้<\/h2>/.test(html()));
  t("subtitle reads the engine constants (±3% · 2 bars · 20%)", html().indexOf("แตะ ±" + E.TOUCH_BAND_PCT + "% แล้วเด้ง") >= 0 &&
    html().indexOf("หลุดยืนยัน " + E.CONFIRM_BARS + " แท่ง") >= 0 && html().indexOf("ย่อ ≥ " + Math.abs(E.DIP_PCT) + "%") >= 0 && E.TOUCH_BAND_PCT === 3 && E.DIP_PCT === -20);
  var n0 = fetchCalls.length;
  t("fetches provider symbols BTC-USD / ETH-USD with a 2-year start", fetchCalls.some(function (u) { return /symbol=BTC-USD&start=2024-10-29/.test(u); }) &&
    fetchCalls.some(function (u) { return /symbol=ETH-USD&start=2024-10-29/.test(u); }), fetchCalls);

  // ---- มีพอร์ต: universe ตาม sleeve · คิดกฎจริง ----
  snapshotObj = SNAP;
  await H.refresh(false);
  await settle();
  var rows = H._state.rows;
  t("universe = BTC · ETH · foreign-stock red-flag holdings (GOOGL→GOOG) · no Thai stock / RMF / watchlist / dup BTC",
    rows.map(function (r) { return r.sym; }).sort().join() === "BTCUSD,ETHUSD,GOOG,INTC,NVDA", rows.map(function (r) { return r.sym; }));
  t("sources tagged: BTC/ETH ติดตามเสมอ · stocks ในพอร์ต", /BTCUSD<\/a><small class="hr-src">ติดตามเสมอ/.test(html()) && /NVDA<\/a><small class="hr-src">ในพอร์ต/.test(html()));
  t("cached BTC/ETH not refetched on the second run (cache key = day + closed bar)",
    fetchCalls.slice(n0).filter(function (u) { return /BTC-USD|ETH-USD/.test(u); }).length === 0, fetchCalls.slice(n0));
  t("every row ok", rows.every(function (r) { return r.status === "ok"; }), rows.map(function (r) { return r.sym + ":" + r.status + (r.error || ""); }));
  // ผลกฎ = ของเอนจินจริง: เทียบกับ evaluateRules โดยตรง
  var btc = rows.filter(function (r) { return r.sym === "BTCUSD"; })[0];
  var ref = E.evaluateRules(BARS["BTC-USD"], { date: "2026-10-29", nowBangkok: NOW, symbol: "BTCUSD", conviction: false });
  t("BTC rules identical to engine.evaluateRules on the same bars (close · EMA · SMA · dd)",
    btc.rules.close === ref.close && btc.rules.ema12 === ref.ema12 && btc.rules.sma200 === ref.sma200 && btc.rules.r3.dd1yPct === ref.r3.dd1yPct && btc.rules.asOfBar === "2026-10-28");
  t("BTC: EMA12 < EMA26 → กฎ 1 ฝั่งขาย chip · above SMA200 · not a dip", /กฎ 1 EMA<\/span><span class="hr-chip is-sell">EMA12 ใต้ EMA26/.test(rowOf("BTCUSD")) &&
    /ปิดเหนือ SMA200/.test(rowOf("BTCUSD")) && /ยังย่อไม่ถึง 20%/.test(rowOf("BTCUSD")) && /hr-side is-sell">ฝั่งขาย · กฎ 1</.test(rowOf("BTCUSD")), textOf(rowOf("BTCUSD")));
  t("ETH: EMA12 > EMA26 → ฝั่งซื้อ · กฎ 1", /hr-chip is-buy">EMA12 เหนือ EMA26/.test(rowOf("ETHUSD")) && /hr-side is-buy">ฝั่งซื้อ · กฎ 1</.test(rowOf("ETHUSD")), textOf(rowOf("ETHUSD")));
  t("GOOG: −25% dip (กฎ 3 ย่อถึง) + confirmed break (กฎ 2 ขาย) + EMA bear → both sides shown, sell first",
    /-25\.0% จาก high 1 ปี/.test(rowOf("GOOG")) && /ย่อถึง 20% แล้ว — เข้ากฎเมื่อคุณศึกษามาดี/.test(rowOf("GOOG")) && /หลุดยืนยัน ≥ 2 แท่ง/.test(rowOf("GOOG")) &&
    /hr-side is-sell">ฝั่งขาย · กฎ 1 \+ กฎ 2<\/span><span class="hr-side is-buy">ฝั่งซื้อ · กฎ 3</.test(rowOf("GOOG")), textOf(rowOf("GOOG")));
  t("NVDA: flat → no rule speaks", /hr-side is-none">ไม่มีกฎบอกฝั่งไหน/.test(rowOf("NVDA")), textOf(rowOf("NVDA")));
  t("INTC: 40 bars → กฎ 2 ข้อมูลไม่พอ (≥ 200 แท่ง) · never claims a side from missing data", /กฎ 2 SMA200<\/span><span class="hr-na">ข้อมูลไม่พอ \(ต้อง ≥ 200 แท่ง\)/.test(rowOf("INTC")) &&
    !/hr-side is-sell|hr-side is-buy/.test(rowOf("INTC").replace(/กฎ 1[^<]*<span class="hr-chip[^>]*>[^<]*/g, "")) || /is-none|is-buy|is-sell/.test(rowOf("INTC")), textOf(rowOf("INTC")));
  t("order: sell-side rows first (BTC, GOOG) → buy (ETH) → none/na", (function () { var o = order(); return o.indexOf("GOOG") < o.indexOf("ETHUSD") && o.indexOf("BTCUSD") < o.indexOf("ETHUSD") && o.indexOf("ETHUSD") < o.indexOf("NVDA"); })(), order());
  t("row links to Decision Journal · footer says it is not advice", /href="\/decision-journal"/.test(rowOf("BTCUSD")) && /ไม่ใช่คำแนะนำการลงทุน/.test(html()));
  t("no NaN/undefined · no advisory wording", !LEAK.test(html()) && !ADVISORY_TH.test(html()) && !ADVISORY_EN.test(html()), (LEAK.exec(html()) || ADVISORY_TH.exec(html()) || [])[0]);
  t("loaded stamp shown after the run", /คิดเมื่อ 2026-10-29 12:00 น\./.test(html()));

  // ---- ดึงราคาไม่สำเร็จ / ไม่พบ: บอกตรง ๆ ไม่เดา ----
  failSym.NVDA = "reject"; failSym.GOOG = 404;
  await H.refresh(true);   // force = ล้าง cache → ยิงใหม่ทุกตัว
  await settle();
  t("network failure → row says ดึงราคาไม่สำเร็จ, no rule chips", /class="hr-row is-err" data-hr-row="NVDA"/.test(html()) && /ดึงราคาไม่สำเร็จ/.test(rowOf("NVDA")) && !/hr-chip/.test(rowOf("NVDA")));
  t("404 → ไม่พบสัญลักษณ์นี้ที่แหล่งข้อมูล", /ไม่พบสัญลักษณ์นี้ที่แหล่งข้อมูล/.test(rowOf("GOOG")));
  t("failed rows sort last; healthy rows keep their result", (function () { var o = order(); return o.indexOf("NVDA") > o.indexOf("ETHUSD") && o.indexOf("GOOG") > o.indexOf("ETHUSD"); })() && /ฝั่งขาย · กฎ 1/.test(rowOf("BTCUSD")));
  t("force refresh refetched BTC (cache cleared)", fetchCalls.slice(-5).some(function (u) { return /BTC-USD/.test(u); }));
  failSym = {};

  // ---- ดึงซ้อน: refresh สองครั้งพร้อมกัน → คำขอต่อสัญลักษณ์ครั้งเดียว ----
  store = {}; H._state.rows = [];
  var n1 = fetchCalls.length;
  var p1 = H.refresh(true), p2 = H.refresh(false);
  await p1; await p2; await settle();
  var dup = {}; fetchCalls.slice(n1).forEach(function (u) { var s = (/symbol=([^&]+)/.exec(u) || [])[1]; dup[s] = (dup[s] || 0) + 1; });
  t("overlapping refreshes share one in-flight request per symbol", Object.keys(dup).every(function (k) { return dup[k] === 1; }), dup);
  t("…and the result still renders every row", H._state.rows.length === 5 && H._state.rows.every(function (r) { return r.status === "ok"; }));

  // ---- mcRoot ถูกวาดใหม่โดยหน้า home → การ์ดกลับมา (ผ่าน render) ----
  mcRoot.children = [];
  H.render();
  t("after mcRoot is rebuilt, render() re-mounts the card first", mcRoot.children.length === 1 && mcRoot.children[0].id === "hrRoot" && /BTCUSD/.test(html()));

  // ---- ES5 ----
  var src = fs.readFileSync(path.join(PUB, "home-rules-page.js"), "utf8").replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  t("home-rules-page.js is ES5 (no arrow/const/let/template)", !/=>|\bconst\s|\blet\s|`/.test(src));
  // ---- CSS ----
  var css = fs.readFileSync(path.join(PUB, "mission-control-v2.css"), "utf8");
  t("CSS: card, rows, side chips and a phone breakpoint exist", /\.hr-card\s*\{/.test(css) && /\.hr-row\s*\{/.test(css) && /\.hr-side\.is-sell/.test(css) && /@media \(max-width: 600px\)[\s\S]*\.hr-row \{ grid-template-columns: 1fr/.test(css));
  finish();
})().catch(function (e) { console.error("  ✗ harness threw: " + (e && e.stack || e)); fail++; finish(); });
