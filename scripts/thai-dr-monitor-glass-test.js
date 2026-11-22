"use strict";
// ============================================================
// THAI DR MONITOR — การ์ดแก้ว (glass-cards.css gc-2) · 2026-11-22
//   node scripts/thai-dr-monitor-glass-test.js
//
// ล็อก:
//   · สีการ์ด = สถานะที่หน้าคิดอยู่แล้วเท่านั้น (ตาราง map อยู่ใน thai-dr-page.js เหนือ summaryBlock)
//       การ์ด "รอตรวจ" มีรายการรอตรวจ (dr-stat--alert)          → gc-warning
//       แถบเตือนข้อมูล dr-warn (ดึงไม่สำเร็จ/ไม่สด/สแกนไม่ครบ/เก็บไม่ได้) → gc-warning
//       แท็บ Port อ่าน AI Portfolio Manager ไม่สำเร็จ (dr-pm-error) → gc-danger
//       ที่เหลือไม่มีสถานะ                                          → gc-neutral
//     หน้านี้ไม่มีสถานะ "ดี/ปกติ" ระดับการ์ด → ต้องไม่มี gc-calm / gc-normal เลย
//   · ตัวเลขการ์ด = gc-num · ปุ่ม = gc-btn (รอง/โปร่ง = gc-btn-ghost) · ช่องกรอก = gc-field · ตาราง = gc-table
//   · แผงที่กางในตารางไม่ใช่การ์ดแก้วซ้อน
//   · Privacy: แท็บ Port ไม่แสดงเงินของพอร์ต (จำนวนหุ้น/ต้นทุน/มูลค่า) ทั้งในข้อความ, title, aria-label, value
//   · HTML โหลด glass-cards.css หลัง mission-control.css และก่อน thai-dr-monitor.css
// ============================================================
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var PUB = path.join(__dirname, "..", "public");
var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; return; }
  fail++;
  console.error("  ✗ " + name + (extra !== undefined ? "  → " + JSON.stringify(extra) : ""));
}

// ---------- fixture (รูปเดียวกับ /api/thai-dr) ----------
var NASDAQ = "The Nasdaq Stock Market";
var HKEX = "The Stock Exchange of Hong Kong Limited";
var ARCA = "The New York Stock Exchange Archipelago";
var NEW_DATE = (function () {
  var d = new Date(); d.setDate(d.getDate() - 5);
  var m = d.getMonth() + 1, day = d.getDate();
  return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day + "T00:00:00+07:00";
})();
function dr(o) {
  return {
    symbol: o.symbol, name: "Depositary Receipt on " + o.underlying, issuer: o.issuer || "PI",
    issuerName: "บริษัทหลักทรัพย์ พาย จำกัด (มหาชน)", underlying: o.underlying, underlyingName: o.underlyingName,
    underlyingClassName: o.classId === "7" ? "หน่วยของโครงการจัดการลงทุนต่างประเทศ" : "หุ้นสามัญต่างประเทศ",
    underlyingClassId: o.classId || "6", underlyingExchange: o.exchange,
    underlyingUrl: o.url || ("https://example.test/" + o.underlying), conversionRatio: o.ratio || "100 : 1",
    last: o.last == null ? null : o.last, offer: null, firstTradeDate: o.firstTradeDate || "2024-05-01T00:00:00+07:00",
    outstandingShare: 1234567, outstandingDate: "2026-10-09T00:00:00+07:00",
    securityTypeName: "ตราสารแสดงสิทธิในหลักทรัพย์ต่างประเทศ (DR)", tradingSession: "ช่วงกลางวันและกลางคืน"
  };
}
var ROWS = [
  dr({ symbol: "AAPL01", underlying: "AAPL", underlyingName: "บริษัท APPLE INC. (AAPL)", exchange: NASDAQ,
    url: "https://www.nasdaq.com/market-activity/stocks/aapl", ratio: "340 : 1", last: 33.5 }),
  dr({ symbol: "AAPL80", underlying: "AAPL", underlyingName: "บริษัท APPLE INC. (AAPL)", exchange: NASDAQ, issuer: "KTB",
    url: "https://www.nasdaq.com/market-activity/stocks/aapl", ratio: "1,000 : 1", last: 11.2 }),
  dr({ symbol: "BABA01", underlying: "BABA", underlyingName: "บริษัท ALIBABA GROUP HOLDING LIMITED (9988)", exchange: HKEX }),
  dr({ symbol: "IVV23", underlying: "IVV ETF", underlyingName: "โครงการจัดการลงทุนต่างประเทศ ISHARES CORE S&P 500 ETF (IVV)", exchange: ARCA, classId: "7" }),
  dr({ symbol: "JEPI01", underlying: "JEPI ETF", underlyingName: "โครงการจัดการลงทุนต่างประเทศ JPMORGAN EQUITY PREMIUM INCOME ETF (JEPI)", exchange: ARCA, classId: "7" }),
  dr({ symbol: "NEWCO01", underlying: "NEWCO", underlyingName: "บริษัท NEW COMPANY (NEWCO)", exchange: NASDAQ, firstTradeDate: NEW_DATE })
];
var PAYLOAD = { ok: true, rows: ROWS, total: ROWS.length, tradingDate: "2026-10-12T00:00:00+07:00",
  asOf: "2026-10-12T03:00:00Z", fetchedAt: "2026-10-12T03:00:00Z", source: "SET DR list (api/set/dr/list)",
  sourceUrl: "https://www.set.or.th/th/market/product/dr/marketdata", degraded: false, complete: true, reason: null };

// หุ้นใน PM — แถวจริงของ /api/portfolio-holdings มีเงินของพอร์ตมาด้วย (shapeRow): หน้านี้ต้องไม่แสดงเลย
// (ตัวเลขต้องไม่ชนกับข้อมูลสาธารณะใน fixture — outstandingShare = 1,234,567)
var MONEY = { quantity: 7777, averageCost: 4321.55, costValue: 987654.32, marketValue: 8765432.19, latestPrice: 2468.13 };
function holding(sym, o) {
  var h = { id: sym, canonicalSymbol: sym, displaySymbol: sym, assetName: sym + " Corp", assetType: "US_STOCK",
    providerSymbol: sym, isHolding: true, watchlistOnly: false, portfolioBucket: "foreign-stock", currency: "USD" };
  var k; for (k in MONEY) h[k] = MONEY[k];
  for (k in (o || {})) h[k] = o[k];
  return h;
}
var HOLDINGS = [holding("AAPL"), holding("NVDA"), holding("PTT.BK", { portfolioBucket: "", currency: "THB" })];
var MONEY_STRINGS = ["7777", "7,777", "4321.55", "4,321.55", "987654", "987,654", "8765432", "8,765,432", "2468.13", "2,468.13"];

// ---------- sandbox ----------
var root = { id: "drRoot", innerHTML: "", querySelectorAll: function () { return []; }, querySelector: function () { return null; } };
var store = {};
var win = {
  document: {
    readyState: "complete", body: {}, addEventListener: function () {},
    getElementById: function (id) { return id === "drRoot" ? root : null; },
    querySelector: function () { return null; }, querySelectorAll: function () { return []; },
    createElement: function () { return { click: function () {}, addEventListener: function () {} }; }
  },
  location: { search: "", pathname: "/thai-dr-monitor", origin: "http://localhost" },
  localStorage: {
    getItem: function (k) { return store[k] === undefined ? null : store[k]; },
    setItem: function (k, v) { store[k] = String(v); }, removeItem: function (k) { delete store[k]; }
  },
  addEventListener: function () {},
  fetch: function (url) {
    var u = String(url), body;
    if (u.indexOf("/api/thai-dr") === 0) body = PAYLOAD;
    else if (u.indexOf("/api/portfolio-holdings") === 0) body = { data: HOLDINGS };
    else if (u.indexOf("/api/ohlc") === 0) body = { bars: [{ date: "2026-10-09", close: 336.64 }] };
    else if (u.indexOf("frankfurter") >= 0) body = { date: "2026-10-09", rates: { THB: 33.53, HKD: 7.85, JPY: 151.2, EUR: 0.92, SGD: 1.29, CNY: 7.1, TWD: 31.5, DKK: 6.9 } };
    else return Promise.resolve({ ok: false, status: 404, json: function () { return Promise.resolve({}); } });
    return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve(body); } });
  },
  URL: { createObjectURL: function () { return "blob:x"; }, revokeObjectURL: function () {} },
  Blob: function () {}, FileReader: function () {},
  console: console, Math: Math, JSON: JSON, Date: Date, Number: Number, String: String, Object: Object, Array: Array,
  Boolean: Boolean, encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent, isFinite: isFinite,
  parseInt: parseInt, parseFloat: parseFloat, Promise: Promise, RegExp: RegExp, Error: Error,
  setTimeout: setTimeout, clearTimeout: clearTimeout, Intl: typeof Intl !== "undefined" ? Intl : undefined
};
win.window = win; win.self = win;
var ctx = vm.createContext(win);
var HTML = fs.readFileSync(path.join(PUB, "thai-dr-monitor.html"), "utf8");
var SKIP = ["theme.js", "api-auth.js", "privacy.js", "big-cache.js", "app-navigation.js"];
(function () {
  var re = /<script src="\/([A-Za-z0-9._-]+\.js)/g, m;
  while ((m = re.exec(HTML)) !== null) {
    if (SKIP.indexOf(m[1]) >= 0) continue;
    vm.runInContext(fs.readFileSync(path.join(PUB, m[1]), "utf8"), ctx, { filename: m[1] });
  }
})();
var P = win.ThaiDrPage, S = P._state;
function html() { return root.innerHTML || ""; }
function flush() { return new Promise(function (r) { setTimeout(r, 40); }).then(function () { return new Promise(function (r) { setTimeout(r, 40); }); }); }

// every element that wears the glass: { tag, cls, tones[] }
function cards(h) {
  var out = [], re = /<([a-z0-9]+)\b[^>]*\bclass="([^"]*\bgc-card\b[^"]*)"/g, m;
  while ((m = re.exec(h)) !== null) {
    out.push({ tag: m[1], cls: m[2], tones: m[2].split(/\s+/).filter(function (c) { return /^gc-(calm|normal|warning|danger|neutral)$/.test(c); }) });
  }
  return out;
}
function cardWith(h, cls) { return cards(h).filter(function (c) { return (" " + c.cls + " ").indexOf(" " + cls + " ") >= 0; }); }
function toneOf(c) { return c ? c.tones.join(",") : "(missing)"; }
function allCardsOneTone(h) { return cards(h).every(function (c) { return c.tones.length === 1; }); }
var seenTones = {};
function noteTones(h) { cards(h).forEach(function (c) { c.tones.forEach(function (x) { seenTones[x] = 1; }); }); }
// money of the portfolio in any attribute that is not shown as masked text (title / aria-label / placeholder / value)
function moneyAttrs(h) {
  var out = [], re = /\s(title|aria-label|placeholder|value)="([^"]*)"/g, m;
  while ((m = re.exec(h)) !== null) if (/฿\s?-?\d|\d\s?(บาท|THB)/.test(m[2])) out.push(m[1] + "=" + m[2]);
  return out;
}

console.log("== HTML: glass-cards.css ก่อน CSS ของหน้า ==");
(function () {
  var links = [], re = /<link rel="stylesheet" href="\/([a-z0-9-]+\.css)\?v=([^"]+)"/g, m;
  while ((m = re.exec(HTML)) !== null) links.push(m[1] + "@" + m[2]);
  var files = links.map(function (s) { return s.split("@")[0]; });
  var iM = files.indexOf("mission-control.css"), iG = files.indexOf("glass-cards.css"), iP = files.indexOf("thai-dr-monitor.css");
  t("โหลด /glass-cards.css?v=20261121-gc-2 ครั้งเดียว",
    links.filter(function (s) { return s.indexOf("glass-cards.css@") === 0; }).join() === "glass-cards.css@20261121-gc-2", links);
  t("ลำดับ: mission-control.css → glass-cards.css → thai-dr-monitor.css", iM >= 0 && iM < iG && iG < iP, files);
  t("bump CSS ของหน้า (dr-css-12) + JS ของหน้า (dr-17)",
    HTML.indexOf('href="/thai-dr-monitor.css?v=20261122-dr-css-13"') >= 0 && HTML.indexOf('src="/thai-dr-page.js?v=20261122-dr-17"') >= 0);
  t("โหลด Inter 700 (ตัวเลข gc-num)", /family=Inter:wght@[^"&]*700/.test(HTML));
  t("ข้อความกำลังโหลดใน HTML เป็นการ์ดแก้วกลาง", /<div class="dr-empty gc-card gc-neutral"><strong>กำลังโหลด Thai DR Monitor…<\/strong><\/div>/.test(HTML));
})();

console.log("== CSS ของหน้า: token บนแก้ว + เลย์เอาต์ที่ gc-card เปลี่ยน ==");
(function () {
  var css = fs.readFileSync(path.join(PUB, "thai-dr-monitor.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  var remap = /\.dr-page \.gc-card\s*\{([^}]*)\}/.exec(css);
  var body = remap ? remap[1] : "";
  t("ในการ์ดแก้ว token ข้อความของหน้า = หมึกแก้ว (ทั้งสองธีม)",
    /--text:\s*var\(--gc-ink\)/.test(body) && /--text-muted:\s*var\(--gc-ink-2\)/.test(body) && /--text-subtle:\s*var\(--gc-ink-2\)/.test(body), body.slice(0, 160));
  t("ในการ์ดแก้ว พื้นย่อยมืดลง (ไม่สว่างขึ้น) และฟอนต์ = --gc-font",
    /--surface:\s*var\(--gc-well\)/.test(body) && /--surface-2:\s*rgba\(0,\s*0,\s*0,/.test(body) && /--font-sans:\s*var\(--gc-font\)/.test(body));
  t("ไม่มีฟอนต์จุด/LED", !/doto|dot-?matrix|DSEG|\bLED\b/i.test(css));
  t("แถบกรอง/แถบเตือน = แถวแนวนอน (gc-card เป็นคอลัมน์)",
    /\.dr-filterbar\s*\{[^}]*flex-direction:\s*row/.test(css) && /\.dr-warn,\s*\.dr-note-block\s*\{[^}]*flex-direction:\s*row/.test(css));
  t("การ์ดว่างที่มีข้อความปน <b> เป็น block (ไม่แตกเป็นคอลัมน์)", /\.dr-empty\s*\{[^}]*display:\s*block/.test(css));
  t("การ์ดตารางไม่เลื่อนเอง — gc-table-wrap ข้างในเป็นตัวเลื่อน", /\.dr-tablewrap\.gc-card\s*\{[^}]*overflow:\s*hidden/.test(css));
  t("วงโฟกัสบนแก้ว = ขาว", /\.dr-page \.gc-card :focus-visible\s*\{[^}]*outline-color:\s*#fff/.test(css));
  t("สไตล์การ์ดเก่าถูกถอด (ไม่มีพื้น/ขอบของ .dr-stat .dr-card .dr-foot .dr-filterbar)",
    !/\.dr-stat\s*\{[^}]*background/.test(css) && !/\.dr-card\s*\{[^}]*background/.test(css) &&
    !/\.dr-foot\s*\{[^}]*background/.test(css) && !/\.dr-filterbar\s*\{[^}]*background/.test(css));
})();

var watchdog = setTimeout(function () { fail++; console.error("  ✗ timeout"); finish(); }, 15000);
function finish() {
  console.log("");
  console.log(pass + fail + " checks · " + pass + " passed · " + fail + " failed");
  process.exit(fail ? 1 : 0);
}

P.load(false).then(flush).then(function () {
  clearTimeout(watchdog);
  var keyOf = function (sym) { var k = null; S.view.assets.forEach(function (a) { if (a.underlyingSymbol === sym) k = a.canonicalKey; }); return k; };

  console.log("== การ์ดสรุป 6 ใบ ==");
  S.tab = "all"; P.render();
  var h = html(); noteTones(h);
  var stats = cardWith(h, "dr-stat");
  t("การ์ดสรุปเป็นแก้วครบ 6 ใบ", stats.length === 6, stats.map(function (c) { return c.cls; }));
  t("มีรอตรวจ (" + S.view.summary.needsReview + ") → การ์ด “รอตรวจ” = gc-warning (คู่ dr-stat--alert)",
    S.view.summary.needsReview > 0 && toneOf(cardWith(h, "dr-stat--alert")[0]) === "gc-warning");
  t("การ์ดสรุปที่เหลือ 5 ใบไม่มีสถานะ → gc-neutral",
    stats.filter(function (c) { return c.cls.indexOf("dr-stat--alert") < 0; }).every(function (c) { return toneOf(c) === "gc-neutral"; }),
    stats.map(function (c) { return c.cls; }));
  t("การ์ด hero / จดทะเบียนใหม่ ยังคงคลาสเดิม", cardWith(h, "dr-stat--hero").length === 1 && cardWith(h, "dr-stat--new").length === 1);
  t("ตัวเลขการ์ดสรุปเป็น gc-num ทุกใบ", (h.match(/class="gc-num dr-stat__value"/g) || []).length === 6, (h.match(/dr-stat__value/g) || []).length);
  t("ปุ่ม “ตรวจเลย” = gc-btn gc-btn-ghost", /class="dr-stat__cta gc-btn gc-btn-ghost" data-dr-goreview="1"/.test(h));

  console.log("== การ์ดอื่นบนแท็บ DR ทั้งหมด ==");
  t("แถบกรอง = gc-neutral", toneOf(cardWith(h, "dr-filterbar")[0]) === "gc-neutral");
  t("ช่องค้นหา + 4 select = gc-field", /class="dr-input gc-field"/.test(h) && (h.match(/class="dr-select gc-field"/g) || []).length === 4);
  t("ตารางหลัก = การ์ด gc-neutral + gc-table ใน gc-table-wrap ที่คีย์บอร์ดเข้าถึงได้",
    toneOf(cardWith(h, "dr-tablewrap")[0]) === "gc-neutral" &&
    /class="dr-card dr-tablewrap gc-card gc-neutral"><div class="gc-table-wrap" tabindex="0" aria-label="[^"]+"><table class="dr-table gc-table">/.test(h),
    (/dr-tablewrap[^>]*>[^>]*>[^>]*>/.exec(h) || [])[0]);
  t("วิธีอ่านหน้านี้ = gc-neutral", toneOf(cardWith(h, "dr-foot")[0]) === "gc-neutral");
  t("ทุกการ์ดมี tone เดียว", allCardsOneTone(h), cards(h).filter(function (c) { return c.tones.length !== 1; }).map(function (c) { return c.cls; }));
  (function () {
    var btns = [], re = /<button[^>]*class="([^"]*\bdr-btn\b[^"]*)"/g, m;
    while ((m = re.exec(h)) !== null) btns.push(m[1]);
    var bad = btns.filter(function (c) {
      var ghost = /\bdr-btn--(secondary|ghost)\b/.test(c), primary = /\bdr-btn--primary\b/.test(c);
      return !/\bgc-btn\b/.test(c) || (ghost && !/\bgc-btn-ghost\b/.test(c)) || (primary && /\bgc-btn-ghost\b/.test(c));
    });
    t("ปุ่ม dr-btn ทุกปุ่ม = gc-btn (รอง/โปร่ง = gc-btn-ghost · หลัก = ขาวทึบ)", btns.length >= 4 && bad.length === 0, bad);
  })();

  console.log("== ไม่มีรอตรวจ → การ์ด “รอตรวจ” กลับเป็นกลาง ==");
  var origRows = S.rows;
  S.rows = ROWS.filter(function (r) { return r.underlying !== "JEPI ETF"; });
  P._buildView(); P.render();
  h = html(); noteTones(h);
  t("needsReview = 0 → ไม่มี dr-stat--alert และการ์ดสรุปทั้ง 6 ใบ = gc-neutral",
    S.view.summary.needsReview === 0 && cardWith(h, "dr-stat--alert").length === 0 &&
    cardWith(h, "dr-stat").length === 6 && cardWith(h, "dr-stat").every(function (c) { return toneOf(c) === "gc-neutral"; }),
    [S.view.summary.needsReview, cardWith(h, "dr-stat").map(toneOf)]);
  S.rows = origRows; P._buildView();

  console.log("== แถบเตือนข้อมูล ==");
  function warnTone(setup, undo, label) {
    setup(); P.render();
    var x = html(); noteTones(x);
    var w = cardWith(x, "dr-warn");
    t(label + " → dr-warn = gc-warning", w.length >= 1 && w.every(function (c) { return toneOf(c) === "gc-warning"; }), w.map(function (c) { return c.cls; }));
    undo();
  }
  warnTone(function () { S.error = "HTTP 503"; }, function () { S.error = null; }, "ดึงข้อมูลไม่สำเร็จ");
  warnTone(function () { S.meta.degraded = true; S.meta.reason = "แหล่งช้า"; }, function () { S.meta.degraded = false; S.meta.reason = null; }, "ข้อมูลไม่สด");
  warnTone(function () { S.meta.complete = false; }, function () { S.meta.complete = true; }, "สแกนไม่ครบทะเบียน");
  warnTone(function () { S.storageNote = "จำประวัติการพบเห็นไม่ได้"; }, function () { S.storageNote = null; }, "เก็บข้อมูลในเบราว์เซอร์ไม่ได้");
  S.syncResult = { isBaseline: true, applied: true }; P.render();
  h = html(); noteTones(h);
  t("บันทึกครั้งแรก (ข้อมูลทั่วไป) → dr-note-block = gc-neutral", toneOf(cardWith(h, "dr-note-block")[0]) === "gc-neutral");
  S.syncResult = null;

  console.log("== ตารางว่างเพราะตัวกรอง ==");
  S.filters.q = "ไม่มีทางเจอสิ่งนี้"; P.render();
  h = html(); noteTones(h);
  t("การ์ดว่าง = gc-neutral", toneOf(cardWith(h, "dr-empty")[0]) === "gc-neutral");
  S.filters.q = ""; P.render();

  console.log("== แถวที่กาง: ไม่ซ้อนแก้ว + ตัวเลข KPI = gc-num ==");
  var aKey = keyOf("AAPL");
  var before = cards(html()).length;
  S.quotes[aKey] = { state: "ok", ticker: "AAPL", currency: "USD", price: 336.64, asOf: "2026-10-09" };
  S.fx = { USD: 33.53 };
  S.expanded[aKey] = true; S.editing = aKey; P.render();
  h = html();
  t("กางแถว + เปิดฟอร์มแก้ไข ไม่เพิ่มการ์ดแก้ว (แผงข้างในไม่ใช่แก้วซ้อน)", cards(h).length === before && h.indexOf("dr-detail__panel") >= 0, [before, cards(h).length]);
  t("ตัวเลข KPI ที่มีค่า = gc-num (≥ 4 ช่อง)", (h.match(/class="dr-kpi__value gc-num"/g) || []).length >= 4, (h.match(/dr-kpi__value[^"]*"/g) || []));
  t("ตารางในแผงที่กาง = gc-table", /<div class="dr-tablewrap"><table class="dr-table gc-table">/.test(h));
  t("ช่องในฟอร์มแก้ไข = gc-field (3 ช่อง + 1 select)",
    (h.match(/<input class="gc-field" type="text" data-dr-ov=/g) || []).length === 3 && /<select class="gc-field" data-dr-ov="instrumentType">/.test(h));
  S.expanded[aKey] = false; S.editing = null; delete S.quotes[aKey];

  console.log("== แท็บ Port / Top pick ==");
  S.tab = "port";
  var savedPm = JSON.parse(JSON.stringify(S.pm));
  S.pm.state = "error"; S.pm.error = "ต้องใส่รหัสผ่านก่อน (HTTP 401)"; P.render();
  h = html(); noteTones(h);
  t("อ่าน AI Portfolio Manager ไม่สำเร็จ → การ์ด dr-pm-error = gc-danger", toneOf(cardWith(h, "dr-pm-error")[0]) === "gc-danger");
  S.pm.state = "loading"; P.render();
  h = html(); noteTones(h);
  t("กำลังอ่าน PM → gc-neutral", toneOf(cardWith(h, "dr-empty-tab")[0]) === "gc-neutral");
  S.pm.state = "ok"; S.pm.holdings = []; P.render();
  h = html(); noteTones(h);
  t("PM ไม่มีหุ้นต่างประเทศธงแดง → gc-neutral", toneOf(cardWith(h, "dr-empty-tab")[0]) === "gc-neutral");
  S.pm = savedPm; P._recomputePort();
  S.tab = "pick"; S.picked = {}; P.render();
  h = html(); noteTones(h);
  t("Top pick ว่าง → gc-neutral", toneOf(cardWith(h, "dr-empty-tab")[0]) === "gc-neutral");

  console.log("== Privacy: แท็บ Port ไม่แสดงเงินของพอร์ต ==");
  S.tab = "port"; P.render();
  h = html(); noteTones(h);
  t("แท็บ Port มี AAPL จาก PM (holdings จริงมีเงินติดมา)", S.pm.state === "ok" && Object.keys(S.port).length === 1 && /data-dr-row="/.test(h),
    [S.pm.state, Object.keys(S.port)]);
  var leaked = MONEY_STRINGS.filter(function (s) { return h.indexOf(s) >= 0; });
  t("ไม่มีจำนวนหุ้น/ต้นทุน/มูลค่า/ราคาของพอร์ตใน HTML ของแท็บ Port (ข้อความ title aria-label value)", leaked.length === 0, leaked);
  t("ไม่มีเงิน ฿/บาท/THB ใน title · aria-label · placeholder · value", moneyAttrs(h).length === 0, moneyAttrs(h));
  S.expanded[keyOf("AAPL")] = true; P.render();
  h = html();
  t("กางแถวในแท็บ Port แล้วก็ไม่มีเงินของพอร์ต", MONEY_STRINGS.filter(function (s) { return h.indexOf(s) >= 0; }).length === 0 && moneyAttrs(h).length === 0, moneyAttrs(h));
  S.expanded[keyOf("AAPL")] = false;
  S.tab = "all"; P.render();
  t("แท็บ DR ทั้งหมดก็ไม่มีเงินใน title/aria-label/value", moneyAttrs(html()).length === 0, moneyAttrs(html()));

  console.log("== tone ที่หน้านี้ผลิตได้ ==");
  t("พบครบ neutral · warning · danger", !!(seenTones["gc-neutral"] && seenTones["gc-warning"] && seenTones["gc-danger"]), Object.keys(seenTones));
  t("ไม่มี gc-calm / gc-normal (หน้านี้ไม่มีสถานะดี/ปกติระดับการ์ด)", !seenTones["gc-calm"] && !seenTones["gc-normal"], Object.keys(seenTones));
  finish();
}).catch(function (e) { clearTimeout(watchdog); fail++; console.error("  ✗ threw: " + (e && e.stack || e)); finish(); });
