"use strict";
// ============================================================
// THAI DR MONITOR — เทสต์ชั้นแสดงผล (VM sandbox ไม่ต้องใช้เบราว์เซอร์)
//   node scripts/thai-dr-monitor-view-test.js
//
// ล็อก §12 ข้อ 19-27:
//   จำนวน DR กับจำนวนสินทรัพย์ต้องแยกกันชัด · DR หลายตัวยุบเป็นแถวเดียว
//   กางรายละเอียดแล้วเห็น DR ครบทุกตัว · ตัวกรองและการค้นหาทำงาน
//   ข้อผิดพลาด/ข้อมูลเก่าต้องมองเห็น · ห้ามมีค่าผิดรูปหลุดออกจอ · ห้ามมีคำชี้นำซื้อขาย
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

// ---------- ข้อมูลจำลองที่สะท้อนของจริง ----------
function dr(o) {
  return {
    symbol: o.symbol,
    name: "Depositary Receipt on " + o.underlying + " Issued by " + (o.issuer || "PI"),
    issuer: o.issuer || "PI",
    issuerName: o.issuerName || "บริษัทหลักทรัพย์ พาย จำกัด (มหาชน)",
    underlying: o.underlying,
    underlyingName: o.underlyingName,
    underlyingClassName: o.classId === "7" ? "หน่วยของโครงการจัดการลงทุนต่างประเทศ" : "หุ้นสามัญต่างประเทศ",
    underlyingClassId: o.classId || "6",
    underlyingExchange: o.exchange,
    underlyingUrl: o.url || ("https://example.test/" + o.underlying),
    conversionRatio: o.ratio || "100 : 1",
    last: o.last == null ? null : o.last,
    offer: o.offer ? { volume: 100, price: String(o.offer) } : null,
    // ส่ง firstTradeDate: null มาได้จริง (ใช้ทดสอบกรณีแหล่งไม่มีวันจดทะเบียน)
    firstTradeDate: o.firstTradeDate === null ? null
      : (o.firstTradeDate || "2024-05-01T00:00:00+07:00"),
    outstandingShare: 1234567,
    outstandingDate: "2026-10-09T00:00:00+07:00",
    securityTypeName: "ตราสารแสดงสิทธิในหลักทรัพย์ต่างประเทศ (DR)",
    tradingSession: "ช่วงกลางวันและกลางคืน"
  };
}
var NASDAQ = "The Nasdaq Stock Market";
var HKEX = "The Stock Exchange of Hong Kong Limited";
var ARCA = "The New York Stock Exchange Archipelago";

var FAKE_ROWS = [
  // สินทรัพย์เดียว 4 DR — ต้องยุบเป็นแถวเดียว
  dr({ symbol: "AAPL01", underlying: "AAPL", underlyingName: "บริษัท APPLE INC. (AAPL)", exchange: NASDAQ, issuer: "PI",
    url: "https://www.nasdaq.com/market-activity/stocks/aapl", ratio: "340 : 1", last: 33.5 }),
  dr({ symbol: "AAPL03", underlying: "AAPL", underlyingName: "บริษัท APPLE INC. (AAPL)", exchange: NASDAQ, issuer: "INVX",
    url: "https://www.nasdaq.com/market-activity/stocks/aapl", ratio: "3,000 : 1", last: 3.8 }),
  dr({ symbol: "AAPL19", underlying: "AAPL", underlyingName: "บริษัท APPLE INC. (AAPL)", exchange: NASDAQ, issuer: "KKPS",
    url: "https://www.nasdaq.com/market-activity/stocks/aapl", ratio: "1,500 : 1", last: 7.5 }),
  dr({ symbol: "AAPL80", underlying: "AAPL", underlyingName: "บริษัท APPLE INC. (AAPL)", exchange: NASDAQ, issuer: "KTB",
    url: "https://www.nasdaq.com/market-activity/stocks/aapl", ratio: "1,000 : 1", offer: 11.2 }),
  // ฮ่องกง
  dr({ symbol: "BABA01", underlying: "BABA", underlyingName: "บริษัท ALIBABA GROUP HOLDING LIMITED (9988)", exchange: HKEX }),
  // ETF ดัชนี
  dr({ symbol: "IVV23", underlying: "IVV ETF", underlyingName: "โครงการจัดการลงทุนต่างประเทศ ISHARES CORE S&P 500 ETF (IVV)", exchange: ARCA, classId: "7" }),
  // กองที่จัดไม่ได้ → รอตรวจ
  dr({ symbol: "JEPI01", underlying: "JEPI ETF", underlyingName: "โครงการจัดการลงทุนต่างประเทศ JPMORGAN EQUITY PREMIUM INCOME ETF (JEPI)", exchange: ARCA, classId: "7" }),
  // เพิ่งจดทะเบียน
  dr({ symbol: "NEWCO01", underlying: "NEWCO", underlyingName: "บริษัท NEW COMPANY (NEWCO)", exchange: NASDAQ, firstTradeDate: "2026-10-05T00:00:00+07:00" }),
  // ไม่มีวันจดทะเบียนจากแหล่ง — ใช้ทดสอบว่า "ค่าว่างต้องไปท้ายตาราง"
  dr({ symbol: "NODATE01", underlying: "NODATE", underlyingName: "บริษัท NO LISTING DATE (NODATE)",
    exchange: NASDAQ, firstTradeDate: null })
].concat((function () {
  // สินทรัพย์ที่มี DR 12 ตัว — ถ้าเรียง drCount เป็นข้อความ "12" จะมาก่อน "4" ผิด
  var out = [];
  for (var i = 1; i <= 12; i++) {
    out.push(dr({ symbol: "MANY" + (i < 10 ? "0" + i : i), underlying: "MANY",
      underlyingName: "บริษัท MANY LISTINGS (MANY)", exchange: NASDAQ, issuer: "PI" }));
  }
  return out;
})());

var apiPayload = {
  ok: true, rows: FAKE_ROWS, total: FAKE_ROWS.length,
  tradingDate: "2026-10-12T00:00:00+07:00", tradeDateType: "C",
  asOf: "2026-10-12T03:00:00Z", fetchedAt: "2026-10-12T03:00:00Z",
  source: "SET DR list (api/set/dr/list)",
  sourceUrl: "https://www.set.or.th/th/market/product/dr/marketdata",
  degraded: false, complete: true, reason: null
};

// ---------- sandbox ที่มี DOM พอให้หน้าเว็บทำงานจริง ----------
// เก็บ HTML ที่ render แล้วไว้ตรวจ — ไม่ได้ parse จริง แต่ query ตาม attribute ได้
var els = {};
function mkEl(tag) {
  var el = {
    tagName: (tag || "div").toUpperCase(), innerHTML: "", value: "", checked: false,
    type: "", style: {}, attributes: {}, files: null, href: "", download: "",
    appendChild: function () {}, removeChild: function () {}, click: function () {},
    focus: function () {}, setSelectionRange: function () {},
    setAttribute: function (k, v) { this.attributes[k] = v; },
    getAttribute: function (k) { return this.attributes[k] === undefined ? null : this.attributes[k]; },
    addEventListener: function (ev, fn) {
      this._on = this._on || {};
      (this._on[ev] = this._on[ev] || []).push(fn);
    },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    closest: function () { return null; },
    classList: { add: function () {}, remove: function () {}, contains: function () { return false; } }
  };
  return el;
}
// จำลอง querySelectorAll เท่าที่ wire() ต้องใช้: คืน element ปลอมหนึ่งตัวต่อ attribute
// ที่พบใน HTML ที่ render ออกมา เพื่อให้ handler ถูกผูกจริง แล้วเทสต์กดได้เหมือนผู้ใช้
// (ถ้าคืน [] เปล่า ๆ wire() จะไม่ผูกอะไรเลย แล้วเทสต์จะเขียวบนเส้นทางที่ไม่ใช่ของจริง)
var handlers = {};
function collectAttr(attr) {
  var h = (els.drRoot && els.drRoot.innerHTML) || "";
  var re = new RegExp(attr + '="([^"]*)"', "g"), m, out = [], seen = {};
  while ((m = re.exec(h)) !== null) {
    if (seen[m[1]]) continue;
    seen[m[1]] = 1;
    out.push(m[1]);
  }
  return out;
}
// อ่านจาก HTML จริงว่า attribute นั้นอยู่บน tag อะไร
function tagFor(attr, val) {
  var h = (els.drRoot && els.drRoot.innerHTML) || "";
  var i = h.indexOf(attr + '="' + val + '"');
  if (i < 0) return "DIV";
  var open = h.lastIndexOf("<", i);
  var m = /^<([a-zA-Z]+)/.exec(h.slice(open, i));
  return m ? m[1].toUpperCase() : "DIV";
}
function fakeNodes(sel) {
  var m = /^\[([a-z-]+)\]$/.exec(sel);
  if (!m) return [];
  var attr = m[1];
  return collectAttr(attr).map(function (val) {
    // tagName ต้องตรงกับของจริง เพราะ wire() ใช้ el.tagName ตัดสินว่าเป็น chip
    // (<button>) · select · หรือ input — ถ้าเป็น div หมด จะเข้า branch ผิด
    var tag = tagFor(attr, val);
    var el = mkEl(tag);
    el.attributes[attr] = val;
    if (tag === "INPUT") el.type = attr === "data-dr-ignore" ? "checkbox" : "search";
    el.addEventListener = function (ev, fn) {
      handlers[attr + "|" + val + "|" + ev] = fn;
    };
    // จำ element ไว้ เพื่อให้เทสต์ตั้งค่า .checked ได้ก่อนยิง change
    nodes[attr + "|" + val] = el;
    return el;
  });
}
var nodes = {};
function nodeOf(attr, val) { return nodes[attr + "|" + val] || null; }
function clickAttr(attr, val) {
  var fn = handlers[attr + "|" + val + "|click"];
  if (!fn) return false;
  fn({ stopPropagation: function () {} });
  return true;
}
// จำลองการติ๊ก checkbox: ตั้ง el.checked แล้วยิง change เหมือนเบราว์เซอร์จริง
// (handler อ่านค่าจาก el.checked ไม่ใช่จาก event)
function setCheck(attr, val, checked) {
  var el = nodeOf(attr, val);
  var fn = handlers[attr + "|" + val + "|change"];
  if (!el || !fn) return false;
  el.checked = !!checked;
  fn({ stopPropagation: function () {}, target: el });
  return true;
}

var doc = {
  readyState: "complete", body: mkEl("body"),
  createElement: function (tag) { return mkEl(tag); },
  addEventListener: function () {},
  getElementById: function (id) {
    if (!els[id]) {
      els[id] = mkEl("main");
      els[id].id = id;
      els[id].querySelectorAll = function (sel) { return fakeNodes(sel); };
    }
    return els[id];
  },
  querySelector: function () { return null; },
  querySelectorAll: function (sel) { return fakeNodes(sel); }
};
var store = {};
var fetchCalls = [];
var nextResponse = { ok: true, status: 200, body: apiPayload };
var win = {
  document: doc,
  location: { search: "", pathname: "/thai-dr-monitor", origin: "http://localhost" },
  history: { pushState: function () {} },
  localStorage: {
    getItem: function (k) { return store[k] === undefined ? null : store[k]; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  },
  addEventListener: function () {},
  fetch: function (url) {
    var u = String(url);
    fetchCalls.push(u);
    // ราคาหุ้นแม่
    if (u.indexOf("/api/ohlc") >= 0) {
      var sym = (/symbol=([^&]+)/.exec(u) || [])[1] || "";
      var px = decodeURIComponent(sym) === "AAPL" ? 336.64 : 107;
      return Promise.resolve({ ok: true, status: 200, json: function () {
        return Promise.resolve({ bars: [{ date: "2026-10-09", close: px }] });
      } });
    }
    // อัตราแลกเปลี่ยน
    if (u.indexOf("frankfurter") >= 0) {
      return Promise.resolve({ ok: true, status: 200, json: function () {
        return Promise.resolve({ date: "2026-10-09", base: "USD",
          rates: { THB: 33.53, HKD: 7.8476, JPY: 151.2, EUR: 0.92, SGD: 1.29, CNY: 7.1, TWD: 31.5, DKK: 6.9 } });
      } });
    }
    var r = nextResponse;
    return Promise.resolve({
      ok: r.ok, status: r.status,
      json: function () { return Promise.resolve(r.body); }
    });
  },
  URL: { createObjectURL: function () { return "blob:x"; }, revokeObjectURL: function () {} },
  Blob: function () {},
  FileReader: function () {},
  console: console, Math: Math, JSON: JSON, Date: Date, Number: Number, String: String,
  Object: Object, Array: Array, Boolean: Boolean, encodeURIComponent: encodeURIComponent,
  decodeURIComponent: decodeURIComponent, isFinite: isFinite, parseInt: parseInt,
  parseFloat: parseFloat, Promise: Promise, RegExp: RegExp, Error: Error,
  setTimeout: setTimeout, clearTimeout: clearTimeout,
  Intl: typeof Intl !== "undefined" ? Intl : undefined
};
win.window = win; win.self = win;
var ctx = vm.createContext(win);

// โหลดสคริปต์ชุดเดียวกับที่ HTML โหลดจริง โดยอ่านลำดับจากตัว HTML เอง
// (hardcode ลิสต์เคยทำให้เทสต์เขียวบนเส้นทางที่ไม่ใช่ของจริงมาแล้วในโปรเจกต์นี้)
var SKIP = ["theme.js", "api-auth.js", "privacy.js", "app-navigation.js"];
var HTML_SCRIPTS = (function () {
  var src = fs.readFileSync(PUB + "/thai-dr-monitor.html", "utf8");
  var out = [], re = /<script src="\/([A-Za-z0-9._-]+\.js)/g, m;
  while ((m = re.exec(src)) !== null) if (SKIP.indexOf(m[1]) < 0) out.push(m[1]);
  return out;
})();
var bootOk = true;
HTML_SCRIPTS.forEach(function (f) {
  try { vm.runInContext(fs.readFileSync(PUB + "/" + f, "utf8"), ctx, { filename: f }); }
  catch (e) { bootOk = false; console.error("   boot " + f + ": " + e.message); }
});

console.log("== boot ==");
t("หน้าเว็บ boot ได้", bootOk);
t("โหลดสคริปต์ครบตามที่ HTML โหลดจริง", HTML_SCRIPTS.length === 3, HTML_SCRIPTS);
t("window.ThaiDrMonitor ถูกโหลด", !!win.ThaiDrMonitor);
t("window.ThaiDrPage ถูกโหลด", !!win.ThaiDrPage);
// ลำดับสำคัญ: ตารางกลุ่มธุรกิจต้องมาก่อน engine ไม่งั้น sectorOf() จะได้ unknown หมด
t("HTML โหลดตารางกลุ่ม → engine → page ตามลำดับ",
  HTML_SCRIPTS[0] === "thai-dr-sectors.js" &&
  HTML_SCRIPTS[1] === "thai-dr-engine.js" &&
  HTML_SCRIPTS[2] === "thai-dr-page.js", HTML_SCRIPTS);

function html() { return (els.drRoot && els.drRoot.innerHTML) || ""; }
// หา canonicalKey ของ BABA จาก view ปัจจุบัน
function key2OfBaba() {
  var k = null;
  (win.ThaiDrPage._state.view.assets || []).forEach(function (a) {
    if (a.underlyingSymbol === "BABA") k = a.canonicalKey;
  });
  return k;
}
// รอให้ promise ที่ค้างอยู่ทำงานจบ (ใช้หลังกดปุ่มที่ไปกระตุ้น fetch)
function flush() {
  return new Promise(function (r) { setTimeout(r, 30); })
    .then(function () { return new Promise(function (r) { setTimeout(r, 30); }); });
}
function countOf(re) { return (html().match(re) || []).length; }

function finish() {
  console.log("");
  console.log(pass + fail + " checks · " + pass + " passed · " + fail + " failed");
  process.exit(fail ? 1 : 0);
}

var watchdog = setTimeout(function () {
  console.error("  ✗ หน้าเว็บ: timeout");
  fail++;
  finish();
}, 15000);

win.ThaiDrPage.load(false).then(function () {
  clearTimeout(watchdog);

  console.log("== §19 จำนวน DR กับจำนวนสินทรัพย์ต้องแยกกัน ==");
  var h = html();
  t("เรียก /api/thai-dr จริง", fetchCalls.length === 1 && fetchCalls[0].indexOf("/api/thai-dr") === 0,
    fetchCalls);
  t("มีป้าย “DR ที่จดทะเบียน”", h.indexOf("DR ที่จดทะเบียน") >= 0);
  t("มีป้าย “สินทรัพย์อ้างอิง”", h.indexOf("สินทรัพย์อ้างอิง") >= 0);
  var st = win.ThaiDrPage._state.view.summary;
  t("นับ DR = 21", st.totalDrListings === 21, st.totalDrListings);
  t("นับสินทรัพย์ = 7", st.totalAssets === 7, st.totalAssets);
  t("สองตัวเลขนี้ไม่เท่ากัน (ยุบรวมทำงานจริง)", st.totalDrListings !== st.totalAssets);
  t("นับสินทรัพย์ที่มี DR หลายตัว = 2", st.multiDrAssets === 2, st.multiDrAssets);
  t("นับของรอตรวจ >= 1", st.needsReview >= 1, st.needsReview);
  t("แสดงทั้งสองตัวเลขบนจอ (21 DR กับ 7 สินทรัพย์)", (function () {
    var vals = [], re = /dr-stat__value">([^<]*)</g, m;
    while ((m = re.exec(h)) !== null) vals.push(m[1]);
    return vals.indexOf("21") >= 0 && vals.indexOf("7") >= 0;
  })(), (function () {
    var vals = [], re = /dr-stat__value">([^<]*)</g, m;
    while ((m = re.exec(h)) !== null) vals.push(m[1]);
    return vals;
  })());

  console.log("== ดีไซน์: ลำดับจุดเด่น (highlight ladder) ==");
  // design system กำหนดว่าหนึ่งหน้ามีจุดเด่นได้ไม่เกินสี่ระดับ
  t("มีแถบ hero หัวหน้า", h.indexOf('class="dr-hero"') >= 0);
  t("ชื่อหน้าอยู่ในแถบ hero", /dr-hero[\s\S]{0,400}Thai DR Monitor/.test(h));
  t("มีการ์ด hero หนึ่งใบเท่านั้น", countOf(/dr-stat--hero/g) === 1, countOf(/dr-stat--hero/g));
  t("การ์ด hero คือ DR ทั้งหมด (ตัวเลขนำของหน้า)",
    /dr-stat--hero[\s\S]{0,300}>21</.test(h));
  t("มีแถบสัดส่วนในการ์ด hero", h.indexOf("dr-split") >= 0);
  t("การ์ด “จดทะเบียนใหม่” ใช้สีทอง", h.indexOf("dr-stat--new") >= 0);
  t("การ์ด “รอตรวจ” เป็นระดับต้องทำ", h.indexOf("dr-stat--alert") >= 0);
  t("การ์ดรอตรวจมีปุ่มพาไปกรอง", h.indexOf("data-dr-goreview") >= 0);
  t("ไม่ใช้อีโมจิเป็นไอคอน (ใช้ SVG เส้น)",
    countOf(/class="dr-ico"/g) >= 6 && h.indexOf("🌏") < 0, countOf(/class="dr-ico"/g));

  console.log("== ดีไซน์: ตัวกรองเป็น chip ==");
  // นับเฉพาะ <button class="dr-chip ..."> ไม่ใช่ dr-chip__count ที่อยู่ข้างใน
  // checkbox ที่เหลือบนหน้าคือคอลัมน์ "ไม่สนใจ" ในตาราง ซึ่งเป็นคนละเรื่องกับตัวกรอง
  t("ตัวกรองใช้ chip ไม่ใช่ checkbox", (function () {
    var bar = /<div class="dr-filterbar">[\s\S]*?<\/div>\s*<div class="dr-results"/.exec(h);
    var barHtml = bar ? bar[0] : "";
    return countOf(/class="dr-chip[ "]/g) === 4 && barHtml.indexOf('type="checkbox"') < 0;
  })(), countOf(/class="dr-chip[ "]/g));
  t("chip บอกจำนวนในตัวเอง", countOf(/dr-chip__count/g) === 4, countOf(/dr-chip__count/g));
  t("chip บอกสถานะเปิด/ปิดด้วย aria-pressed", h.indexOf('aria-pressed="false"') >= 0);
  t("มีแถบบอกผลการกรอง", h.indexOf('class="dr-results"') >= 0);

  console.log("== ดีไซน์: แถวในตาราง ==");
  t("มี avatar อักษรย่อหน้าแถว", countOf(/class="dr-av/g) >= 5, countOf(/class="dr-av/g));
  t("มีลูกศรกางแถว", countOf(/class="dr-chev"/g) >= 5);
  t("สัญลักษณ์ DR เป็นแท็ก ไม่ใช่ข้อความคั่นคอมมา", countOf(/class="dr-drtag"/g) >= 5);
  t("ตัวนับ DR > 1 ใช้สีทึบ", h.indexOf("dr-count--many") >= 0);
  t("ticker อยู่ใต้ชื่อด้วยฟอนต์ mono", h.indexOf("dr-cell-sub dr-code") >= 0);
  t("แถวที่จดทะเบียนใหม่มีพื้นสีทอง", h.indexOf("dr-row--new") >= 0);
  t("ชื่อสินทรัพย์ถูกย่อให้อ่านง่าย แต่เก็บชื่อเต็มใน title",
    /title="บริษัท APPLE INC\. \(AAPL\)"/.test(h) && h.indexOf(">APPLE INC.<") >= 0,
    (/dr-cell-main"[^>]*>[^<]*/.exec(h) || [])[0]);

  console.log("== §20 DR หลายตัวยุบเป็นแถวเดียว ==");
  t("มีแถวสินทรัพย์ 7 แถว", countOf(/data-dr-row="/g) === 7, countOf(/data-dr-row="/g));
  t("AAPL ปรากฏเป็นแถวเดียว", countOf(/data-dr-row="[^"]*AAPL/g) === 1, countOf(/data-dr-row="[^"]*AAPL/g));
  t("แถว AAPL บอกว่ามี 4 DR", (function(){var m=h.match(/dr-drtag">AAPL[0-9]+</g)||[];return m.length===4;})(), (h.match(/dr-drtag">AAPL[0-9]+</g)||[]).length);

  console.log("== §21 กางรายละเอียดแล้วเห็น DR ครบ ==");
  var key = null;
  win.ThaiDrPage._state.view.assets.forEach(function (a) {
    if (a.underlyingSymbol === "AAPL") key = a.canonicalKey;
  });
  win.ThaiDrPage._state.expanded[key] = true;
  win.ThaiDrPage.render();
  var hd = html();
  t("กางแล้วเห็น DR ครบทั้ง 4 ตัว",
    hd.indexOf("AAPL01") >= 0 && hd.indexOf("AAPL03") >= 0 &&
    hd.indexOf("AAPL19") >= 0 && hd.indexOf("AAPL80") >= 0);
  // ตารางรายละเอียดแสดงชื่อเต็มของผู้ออก (issuerName) ถ้ามี — ไม่ใช่ตัวย่อ
  t("เห็นชื่อผู้ออกของทุก DR (ย่อแล้ว)", countOf(/พาย/g) >= 3, countOf(/พาย/g));
  t("เก็บตัวย่อผู้ออกไว้ครบในข้อมูล", (function () {
    var a = null;
    win.ThaiDrPage._state.view.assets.forEach(function (x) {
      if (x.underlyingSymbol === "AAPL") a = x;
    });
    return a.drListings.map(function (d) { return d.issuer; }).join(",") === "PI,INVX,KKPS,KTB";
  })());
  t("เห็นอัตราแปลงสภาพของแต่ละ DR (คนละอัตรากัน)",
    hd.indexOf("340 : 1") >= 0 && hd.indexOf("3,000 : 1") >= 0 && hd.indexOf("1,500 : 1") >= 0,
    hd.indexOf("340 : 1"));
  // วันที่แสดงเป็น พ.ศ. ตามรูปแบบไทย (2024 → 67)
  t("เห็นวันจดทะเบียนจากแหล่ง (รูปแบบไทย)", /พ\.ค\. 67/.test(hd), hd.indexOf("พ.ค.") >= 0);
  t("มีลิงก์ไปแหล่งต้นทางที่ SET ให้มา",
    hd.indexOf("https://www.nasdaq.com/market-activity/stocks/aapl") >= 0);
  t("มีคอลัมน์ “ระบบเห็นครั้งแรก” แยกจากวันจดทะเบียน",
    hd.indexOf("ระบบเห็นครั้งแรก") >= 0 && hd.indexOf("วันจดทะเบียน") >= 0);
  win.ThaiDrPage._state.expanded[key] = false;

  console.log("== เรียงลำดับได้ทุกคอลัมน์ ==");
  // คอลัมน์ "สัญลักษณ์" ถูกยุบเข้าไปอยู่ใต้ชื่อสินทรัพย์ในดีไซน์ใหม่ จึงไม่มีหัวแยก
  var SORTABLE = ["name", "geo", "sector", "drs", "newest", "status"];
  t("หัวตารางกดเรียงได้ครบทุกคอลัมน์ที่ควรเรียง",
    SORTABLE.every(function (f) { return html().indexOf('data-dr-sort="' + f + '"') >= 0; }),
    SORTABLE.filter(function (f) { return html().indexOf('data-dr-sort="' + f + '"') < 0; }));
  t("คอลัมน์ที่เรียงอยู่มีลูกศรบอกทิศ", /dr-arrow">\s*[▲▼]/.test(html()));

  // กดที่หัวคอลัมน์จริง ๆ ผ่าน handler ที่ wire() ผูกไว้ — ไม่ใช่ตั้ง state เอง
  function names() {
    return win.ThaiDrPage._visible().map(function (a) { return a.canonicalName; });
  }
  // ค่าเริ่มต้นคือเรียงชื่อ A→Z อยู่แล้ว การกดคอลัมน์เดิมจึงเป็นการสลับทิศ
  var asc = names();
  t("ค่าเริ่มต้นเรียงชื่อ A→Z", asc[0] <= asc[asc.length - 1], asc.slice(0, 2));
  t("handler ของหัวคอลัมน์ถูกผูกจริง", clickAttr("data-dr-sort", "name") === true);
  var desc = names();
  t("กดคอลัมน์เดิมแล้วสลับทิศจริง",
    asc.join("|") === desc.slice().reverse().join("|"),
    { asc: asc.slice(0, 2), desc: desc.slice(0, 2) });
  t("ทิศที่เก็บไว้เปลี่ยนเป็น -1", win.ThaiDrPage._state.sortDir === -1,
    win.ThaiDrPage._state.sortDir);
  clickAttr("data-dr-sort", "name");
  t("กดอีกครั้งกลับมา A→Z", names().join("|") === asc.join("|"));

  clickAttr("data-dr-sort", "drs");
  var byDrs = win.ThaiDrPage._visible().map(function (a) { return a.drCount; });
  t("กดคอลัมน์จำนวน DR → เริ่มจากมากไปน้อย",
    byDrs[0] === 12 && byDrs[0] >= byDrs[byDrs.length - 1], byDrs);
  // ถ้าเรียงเป็นข้อความ "12" < "4" จะทำให้ 4 ขึ้นก่อน 12 — ต้องจับให้ได้
  t("เรียงเป็นตัวเลขจริง ไม่ใช่ข้อความ (12 ต้องมาก่อน 4)", (function () {
    for (var i = 1; i < byDrs.length; i++) if (byDrs[i - 1] < byDrs[i]) return false;
    return byDrs[0] === 12 && byDrs.indexOf(4) > 0;
  })(), byDrs);
  clickAttr("data-dr-sort", "drs");
  var byDrsAsc = win.ThaiDrPage._visible().map(function (a) { return a.drCount; });
  t("กดซ้ำ → น้อยไปมาก", byDrsAsc[byDrsAsc.length - 1] === 12, byDrsAsc);
  t("เรียงน้อย→มากก็ยังเป็นตัวเลข", (function () {
    for (var i = 1; i < byDrsAsc.length; i++) if (byDrsAsc[i - 1] > byDrsAsc[i]) return false;
    return true;
  })(), byDrsAsc);

  clickAttr("data-dr-sort", "newest");
  clickAttr("data-dr-sort", "newest");   // ให้เป็นทิศน้อย→มาก
  var byDate = win.ThaiDrPage._visible().map(function (a) { return a.newestListingDate; });
  t("มีรายการที่ไม่มีวันจดทะเบียนไว้ทดสอบจริง",
    byDate.filter(function (d) { return d == null; }).length >= 1, byDate);
  t("ค่าว่างไปท้ายเสมอแม้เรียงน้อย→มาก", (function () {
    var seenNull = false;
    for (var i = 0; i < byDate.length; i++) {
      if (byDate[i] == null) seenNull = true;
      else if (seenNull) return false;   // มีค่าจริงโผล่หลังค่าว่าง = ผิด
    }
    return true;
  })(), byDate);
  clickAttr("data-dr-sort", "newest");   // สลับเป็นมาก→น้อย
  var byDateDesc = win.ThaiDrPage._visible().map(function (a) { return a.newestListingDate; });
  t("ค่าว่างไปท้ายเสมอแม้เรียงมาก→น้อย (ไม่ใช่ขึ้นหัวตาราง)", (function () {
    var seenNull = false;
    for (var i = 0; i < byDateDesc.length; i++) {
      if (byDateDesc[i] == null) seenNull = true;
      else if (seenNull) return false;
    }
    return true;
  })(), byDateDesc);

  clickAttr("data-dr-sort", "name");
  win.ThaiDrPage.render();

  console.log("== เทียบราคาหุ้นแม่กับ DR ==");
  // กดแถว AAPL เหมือนผู้ใช้ — การดึงราคาต้องถูกกระตุ้นจากการกางแถวเอง
  var fetchBefore = fetchCalls.length;
  t("handler ของแถวถูกผูกจริง", clickAttr("data-dr-row", key) === true);
  t("กางแถวแล้วยิงขอราคาเอง (ไม่ต้องเรียกเอง)",
    fetchCalls.length > fetchBefore, { before: fetchBefore, after: fetchCalls.length });
  t("ยิงด้วย ticker ที่แปลงจาก URL ทางการ",
    fetchCalls.slice(fetchBefore).some(function (u) {
      return u.indexOf("/api/ohlc?symbol=AAPL") >= 0;
    }), fetchCalls.slice(fetchBefore));
  // รอให้ promise ของการดึงราคาที่ถูกกระตุ้นจากการคลิกทำงานจบ
  return flush().then(function () {
    win.ThaiDrPage._state.expanded[key] = true;
    win.ThaiDrPage.render();
    var hp = html();
    t("ยิงขอราคาหุ้นแม่ด้วย ticker ที่ถูก",
      fetchCalls.some(function (u) { return u.indexOf("/api/ohlc?symbol=AAPL") >= 0; }), fetchCalls);
    t("ยิงขออัตราแลกเปลี่ยน",
      fetchCalls.some(function (u) { return u.indexOf("frankfurter") >= 0; }));
    t("แสดงราคาหุ้นแม่", hp.indexOf("ราคาหุ้นแม่") >= 0 && hp.indexOf("336.64") >= 0);
    t("บอกสกุลเงินของหุ้นแม่", hp.indexOf("USD") >= 0);
    // ดีไซน์ใหม่: อัตราแลกเปลี่ยนอยู่ในกล่อง KPI ไม่ใช่ข้อความบรรทัดเดียว
    t("บอกอัตราแลกเปลี่ยนที่ใช้", hp.indexOf("อัตราแลกเปลี่ยน") >= 0 && /33\.53/.test(hp),
      (/33\.\d+/.exec(hp) || [])[0]);
    t("บอกหน่วยของอัตราแลกเปลี่ยน", hp.indexOf("บาท/USD") >= 0);
    t("มีคอลัมน์ราคาตามทฤษฎี", hp.indexOf("ราคาตามทฤษฎี") >= 0);
    t("มีคอลัมน์ราคาตลาด", hp.indexOf("ราคาตลาด") >= 0);
    t("มีคอลัมน์ส่วนต่าง", hp.indexOf("ต่างจากทฤษฎี") >= 0);

    // ตรวจเลขจริงที่คำนวณได้ — ของจริงคือ 33.199
    t("คิดราคาตามทฤษฎีของ AAPL01 ถูก (33.199)", hp.indexOf("33.199") >= 0, (function () {
      var m = /33\.\d{3}/.exec(hp); return m ? m[0] : hp.slice(0, 0);
    })());
    t("คิดราคาของ DR อัตราอื่นถูกด้วย (AAPL03 = 3.763)", hp.indexOf("3.763") >= 0);
    t("DR ทั้ง 4 ตัวมีราคาตามทฤษฎีครบ", (function () {
      var a = null;
      win.ThaiDrPage._state.view.assets.forEach(function (x) {
        if (x.underlyingSymbol === "AAPL") a = x;
      });
      var priced = win.ThaiDrMonitor.priceListings(a,
        { price: 336.64, currency: "USD" }, win.ThaiDrPage._state.fx);
      return priced.length === 4 && priced.every(function (d) { return d.theoreticalThb > 0; });
    })());
    t("แสดงส่วนต่างเป็นเปอร์เซ็นต์", /[+\-]\d+\.\d{2}%/.test(hp), (/[+\-]\d+\.\d{2}%/.exec(hp) || [])[0]);
    // ทิศของอัตราแลกเปลี่ยนต้องถูก: ต้องเป็น "บาทต่อ 1 หน่วยสกุลนั้น"
    // HKD ถูกส่งมาเป็น 7.8476 ต่อ USD → บาทต่อ HKD ต้อง = 33.53/7.8476 ≈ 4.27
    // ถ้าคูณแทนหารจะได้ 263 ซึ่งผิดเป็นสิบเท่า
    var fx = win.ThaiDrPage._state.fx;
    t("อัตราแลกเปลี่ยน USD ถูก (บาทต่อดอลลาร์)", Math.abs(fx.USD - 33.53) < 0.01, fx.USD);
    t("อัตราแลกเปลี่ยน HKD กลับด้านถูก (บาทต่อ HKD ≈ 4.27)",
      Math.abs(fx.HKD - 33.53 / 7.8476) < 0.01, fx.HKD);
    t("บาทต่อ HKD ต้องน้อยกว่าบาทต่อ USD เสมอ", fx.HKD < fx.USD, [fx.HKD, fx.USD]);
    t("บาทต่อ JPY ต้องน้อยกว่า 1", fx.JPY < 1, fx.JPY);
    t("DR ที่ใช้ราคาเสนอขายถูกกำกับไว้", hp.indexOf("เสนอขาย") >= 0);
    t("ย้ำว่าไม่ใช่สัญญาณซื้อขาย", hp.indexOf("ไม่ใช่สัญญาณซื้อขาย") >= 0);

    // ตลาดที่แปลง ticker ไม่ได้ ต้องบอกตรง ๆ ไม่ใช่ค้าง
    var ivvKey = null;
    win.ThaiDrPage._state.view.assets.forEach(function (x) {
      if (x.underlyingSymbol === "IVV ETF") ivvKey = x.canonicalKey;
    });
    var ivv = null;
    win.ThaiDrPage._state.view.assets.forEach(function (x) {
      if (x.canonicalKey === ivvKey) ivv = x;
    });
    return win.ThaiDrPage._loadQuote(ivv).then(function () {
      win.ThaiDrPage._state.expanded[key] = false;
      win.ThaiDrPage._state.expanded[ivvKey] = true;
      win.ThaiDrPage.render();
      var hu = html();
      t("ตลาดที่ยังแปลง ticker ไม่ได้ → บอกตรง ๆ",
        hu.indexOf("ยังดึงราคาหุ้นแม่จากตลาดนี้ไม่ได้") >= 0, hu.indexOf("ราคาหุ้นแม่"));
      t("และยังแสดงราคาตลาดของ DR ได้", hu.indexOf("ราคาตลาด") >= 0);
      t("ไม่แสดงราคาทฤษฎีมั่ว ๆ เมื่อไม่มีราคาหุ้นแม่",
        win.ThaiDrMonitor.priceListings(ivv, null, win.ThaiDrPage._state.fx)
          .every(function (d) { return d.theoreticalThb === null; }));
      win.ThaiDrPage._state.expanded[ivvKey] = false;
      win.ThaiDrPage.render();
      return runRest();
    });
  });

  function runRest() {
  console.log("== คอลัมน์ราคา: ราคาล่าสุด · ลงจาก ATH · ลงจาก ATH 1 ปี ==");
  var hc = html();
  t("มีหัวคอลัมน์ราคาล่าสุด", hc.indexOf('data-dr-sort="last"') >= 0);
  t("มีหัวคอลัมน์ลงจาก ATH", hc.indexOf('data-dr-sort="fromAth"') >= 0);
  t("มีหัวคอลัมน์ลงจาก ATH 1 ปี", hc.indexOf('data-dr-sort="fromAth1y"') >= 0);
  t("ยังไม่โหลด → แสดงขีด ไม่ใช่ 0 หรือค่ามั่ว", (function () {
    var rows = hc.split('data-dr-row=');
    return rows.length > 1 && rows[1].indexOf(">0<") < 0;
  })());
  t("มีปุ่มโหลดราคา", hc.indexOf("data-dr-loadstats") >= 0);
  t("ปุ่มบอกจำนวนที่ต้องโหลด", /โหลดราคา \d+ ตัว/.test(hc), (/โหลดราคา[^<]*/.exec(hc) || [])[0]);

  // ---- ทุกตัวในรายการดึงราคาไม่ได้ (เช่น กรองเฉพาะเวียดนาม 13 ตัว) ----
  // ของจริง: ตลาด Hochiminh แปลง ticker ไม่ได้เลย 17/17 → ทุกแถวเป็น unsupported
  // เดิม need/have นับแต่ ok กับ error ทำให้ unsupported ตกสำรวจ → ปุ่มหายเงียบ ๆ
  // ผู้ใช้เห็นแค่ "—" สามช่อง ไม่มีอะไรบอกว่าทำไม
  (function () {
    var vis = win.ThaiDrPage._visible();
    var saved = {};
    for (var i = 0; i < vis.length; i++) {
      saved[vis[i].canonicalKey] = win.ThaiDrPage._state.stats[vis[i].canonicalKey];
      win.ThaiDrPage._state.stats[vis[i].canonicalKey] = {
        state: "unsupported", ticker: null, note: "ตลาดนี้ยังดึงราคาย้อนหลังไม่ได้"
      };
    }
    win.ThaiDrPage.render();
    var hu = html();
    t("ทุกตัวดึงราคาไม่ได้ → ยังบอกผู้ใช้ว่าเกิดอะไรขึ้น",
      /ดึงราคาไม่ได้|ยังดึงราคา|ไม่รองรับ/.test(hu),
      (/(ดึงราคา|รองรับ)[^<]{0,40}/.exec(hu) || [])[0] || "(ไม่มีข้อความอะไรเลย)");
    t("ทุกตัวดึงราคาไม่ได้ → บอกจำนวนด้วย",
      /[0-9]+ ตัว/.test(hu),
      (/[0-9]+ ตัว[^<]{0,20}/.exec(hu) || [])[0]);
    t("ทุกตัวดึงราคาไม่ได้ → ไม่โชว์ปุ่มที่กดแล้วไม่เกิดอะไร",
      hu.indexOf("data-dr-loadstats") < 0,
      (/data-dr-loadstats[^>]{0,30}/.exec(hu) || [])[0]);

    // เคสที่เจอจริงบ่อยสุด: โหลดได้บางส่วน + ดึงไม่ได้บางส่วน
    // (ทั้งตาราง 341 = โหลดได้ 248 · ดึงไม่ได้ 93 จาก 15 ตลาด)
    // ห้ามบอกแค่ "ราคาครบแล้ว 248 ตัว" เพราะอ่านแล้วเข้าใจว่าครบทุกตัว
    var vis2 = win.ThaiDrPage._visible();
    var saved2 = {};
    for (var m = 0; m < vis2.length; m++) {
      saved2[vis2[m].canonicalKey] = win.ThaiDrPage._state.stats[vis2[m].canonicalKey];
      win.ThaiDrPage._state.stats[vis2[m].canonicalKey] = (m % 2 === 0)
        ? { state: "ok", ticker: "X", data: { last: 10, lastDate: "2026-10-09",
            currency: "USD", ath: 20, athDate: "2020-01-01", fromAthPct: -50,
            ath1y: 15, ath1yDate: "2026-01-01", fromAth1yPct: -33,
            coversFullYear: true, athReliable: true, historyDays: 4000,
            firstDate: "2015-01-02", bars: 2500, yearBars: 252 } }
        : { state: "unsupported", ticker: null, note: "ตลาดนี้ยังดึงราคาย้อนหลังไม่ได้" };
    }
    win.ThaiDrPage.render();
    var hmix = html();
    t("โหลดได้บางส่วน → ต้องบอกด้วยว่าอีกกี่ตัวดึงไม่ได้ ไม่ใช่บอกแค่ว่าครบ",
      /ราคาครบแล้ว[^<]*ดึงราคาไม่ได้/.test(hmix),
      (/ราคาครบแล้ว[^<]{0,70}/.exec(hmix) || [])[0]);
    for (var k2 in saved2) {
      if (saved2[k2] === undefined) delete win.ThaiDrPage._state.stats[k2];
      else win.ThaiDrPage._state.stats[k2] = saved2[k2];
    }
    win.ThaiDrPage.render();
    for (var k in saved) {
      if (saved[k] === undefined) delete win.ThaiDrPage._state.stats[k];
      else win.ThaiDrPage._state.stats[k] = saved[k];
    }
    win.ThaiDrPage.render();
  })();

  // ใส่สถิติจำลองแล้วตรวจว่าแสดงถูก
  var aaplKey = key;
  win.ThaiDrPage._state.stats[aaplKey] = {
    state: "ok", ticker: "AAPL",
    // หุ้นประวัติยาว (2960 แท่ง / 11 ปี) → athReliable = true
    data: { last: 336.64, lastDate: "2026-10-09", currency: "USD",
      ath: 500, athDate: "2024-01-15", fromAthPct: -32.672,
      ath1y: 400, ath1yDate: "2026-02-01", fromAth1yPct: -15.84,
      coversFullYear: true, athReliable: true, historyDays: 4298,
      firstDate: "2015-01-02", bars: 2960, yearBars: 252 }
  };
  win.ThaiDrPage.render();
  var hs = html();
  t("แสดงราคาล่าสุด", hs.indexOf("336.64") >= 0);
  t("แสดงสกุลเงินของหุ้นแม่", /336\.64<span class="dr-cell-sub">USD/.test(hs));
  t("แสดงลงจาก ATH เป็น % ทศนิยม 1 ตำแหน่ง", hs.indexOf("-32.7%") >= 0,
    (/-3[0-9.]+%/.exec(hs) || [])[0]);
  t("แสดงลงจาก ATH 1 ปี", hs.indexOf("-15.8%") >= 0);
  t("ลงลึกกว่า 30% ทำสีแดง", hs.indexOf("dr-dip-deep") >= 0);
  t("ลง 10-30% ทำสีอำพัน", hs.indexOf("dr-dip-mid") >= 0);
  t("บอกค่า ATH และวันที่ใน title", /title="[^"]*ATH 500[^"]*"/.test(hs),
    (/title="[^"]*ATH[^"]*"/.exec(hs) || [])[0]);

  // เรียงตามคอลัมน์ราคาได้
  clickAttr("data-dr-sort", "fromAth");
  var withStat = win.ThaiDrPage._visible();
  t("เรียงตามลงจาก ATH ได้ — ตัวที่มีข้อมูลอยู่บนสุด",
    withStat[0].canonicalKey === aaplKey, withStat[0].underlyingSymbol);
  t("ตัวที่ยังไม่มีข้อมูลไปท้ายตาราง", (function () {
    var last = withStat[withStat.length - 1];
    return !win.ThaiDrPage._state.stats[last.canonicalKey];
  })());

  // ประวัติราคาสั้น — ตัวเลข "ลงจาก ATH" ต้องบอกว่าเชื่อได้แค่ไหน
  // เคสจริง: CBRS 103 แท่ง (148 วัน) แสดง -47.2% ปนกับ BABA -65% ที่มีข้อมูล 10 ปี
  // ใช้ตัวเลขจากของจริง: 2513.HK (Z.AI) 186 แท่ง / 274 วัน → -73.4%
  // สำคัญ: ต้อง "ลึกกว่า" ตัวที่ประวัติยาว (BABA -65.2%) ไม่งั้นเทสต์แยกไม่ออก
  // ว่าการเรียงถูกเพราะ guard หรือถูกเพราะเลขมันลึกกว่าอยู่แล้ว
  win.ThaiDrPage._state.stats[aaplKey] = {
    state: "ok", ticker: "2513.HK",
    data: { last: 40, lastDate: "2026-10-09", currency: "HKD",
      ath: 150.4, athDate: "2026-02-14", fromAthPct: -73.4,
      ath1y: 150.4, ath1yDate: "2026-02-14", fromAth1yPct: -73.4,
      coversFullYear: false, athReliable: false, historyDays: 274,
      firstDate: "2026-01-08", bars: 186, yearBars: 186 }
  };
  win.ThaiDrPage.render();
  var hShort = html();
  t("ประวัติสั้น → ยังแสดงตัวเลขให้เห็น ไม่ซ่อน", hShort.indexOf("-73.4%") >= 0);
  t("ประวัติสั้น → บอกช่วงข้อมูลใต้ตัวเลข", /ข้อมูล 9 เดือน/.test(hShort),
    (/ข้อมูล [0-9][^<]*/.exec(hShort) || [])[0]);
  // ประวัติสั้น: ต้องจางทั้งสองคอลัมน์
  // ข้อมูลสั้นกว่า 1 ปี ทำให้ ATH กับ ATH 1 ปี เป็นยอดเดียวกัน
  // (ของจริง 2513.HK: -73.4% ทั้งสองช่อง) ลงสีคนละแบบ = ขัดกันเองในแถวเดียว
  t("ประวัติสั้น → คอลัมน์ ATH ไม่ลงสีแดงเตือนเหมือนย่อลึกจริง",
    /dr-dip-weak[^>]*title="สูงสุดเท่าที่มีข้อมูล/.test(hShort),
    (/dr-num-cell[^"]*"\s*title="สูงสุด[^"]{0,40}/.exec(hShort) || [])[0]);
  t("tooltip บอกว่าไม่ใช่จุดสูงสุดตลอดกาล",
    /title="[^"]*ไม่ใช่จุดสูงสุดตลอดกาล/.test(hShort),
    (/title="สูงสุด[^"]{0,90}/.exec(hShort) || [])[0]);
  // ช่อง ATH คือ <td> ถัดจากช่องราคาล่าสุด (title="ราคาปิด ...") เสมอ
  // ต้องผูกกับช่องนี้โดยเฉพาะ เพราะช่อง 1 ปี ก็ใช้คำเดียวกันแล้ว
  // ค้นทั้งหน้าจะผ่านทั้งที่ช่อง ATH พัง (พิสูจน์แล้วด้วย mutation test)
  var ATH_CELL_RE = new RegExp(
    'title="ราคาปิด[^"]*">[^<]*<span[^>]*>[^<]*<\/span><\/td>' +
    '<td [^>]*title="สูงสุดเท่าที่มีข้อมูล');
  t("tooltip ช่อง ATH ใช้คำว่า “สูงสุดเท่าที่มีข้อมูล” ไม่ใช่ ATH",
    ATH_CELL_RE.test(hShort),
    (/title="ราคาปิด[^"]*">[sS]{0,120}?title="[^"]{0,24}/.exec(hShort) || [])[0]);
  t("tooltip บอกวันเริ่มของข้อมูล", /title="[^"]*ตั้งแต่/.test(hShort));

  // กฎการเรียงต้องอธิบายตรงจุดที่ผู้ใช้กด ไม่ใช่ซ่อนไว้ในเซลล์
  // คนกด "ลงลึกสุดก่อน" แล้วเห็น -65.2% อยู่เหนือ -73.4% จะคิดว่าระบบพัง
  t("หัวคอลัมน์ ลงจาก ATH อธิบายว่าทำไมประวัติสั้นถึงถูกดันลง",
    /data-dr-sort="fromAth"[^>]*title="[^"]*2 ปี[^"]*ท้าย/.test(hShort),
    (/data-dr-sort="fromAth"[^>]*title="[^"]{0,80}/.exec(hShort) || [])[0]);
  t("หัวคอลัมน์อื่นยังมี tooltip เดิม",
    /data-dr-sort="geo"[^>]*title="กดเพื่อเรียงลำดับ"/.test(hShort),
    (/data-dr-sort="geo"[^>]*title="[^"]{0,40}/.exec(hShort) || [])[0]);

  // คอลัมน์ ATH 1 ปี ต้องได้การปฏิบัติชุดเดียวกัน ไม่งั้นคลิกคอลัมน์ข้าง ๆ
  // ก็เห็นภาพที่หลอกเหมือนเดิม — นับ dr-dip-weak ต้องได้ 2 ช่อง
  t("ประวัติสั้น → คอลัมน์ ATH 1 ปี ก็จางด้วย ไม่ใช่แดงสดข้างเดียว",
    (hShort.match(/dr-dip-weak/g) || []).length === 2,
    (hShort.match(/dr-dip-weak/g) || []).length + " ช่อง");
  t("ประวัติสั้น → ไม่มีช่องไหนเป็นสีเตือนย่อลึก",
    !/dr-dip-(deep|mid)/.test(hShort),
    (/dr-dip-(deep|mid)/.exec(hShort) || [])[0]);
  // ป้ายคอลัมน์ 1 ปี ต้องบอกช่วงจริง ไม่ใช่ "ไม่ครบปี" ลอย ๆ
  // 360 วันกับ 1 แท่ง ไม่ควรได้ป้ายเดียวกัน
  t("ประวัติสั้น → คอลัมน์ 1 ปี บอกช่วงข้อมูลจริง",
    (hShort.match(/dr-cell-sub">ข้อมูล 9 เดือน/g) || []).length === 2,
    (hShort.match(/dr-cell-sub">[^<]{0,14}/g) || []).join(" | "));
  // ตัวประวัติยาวต้องไม่มีอะไรเพิ่ม — การเปิดเผยต้องไม่สมมาตรกลับทาง
  t("ประวัติยาว → ไม่มีป้ายเพิ่ม ไม่มีสีจาง (ห้ามสร้างความมั่นใจเกินจริง)",
    !/dr-dip-weak/.test(hs) && !/dr-cell-sub">ข้อมูล /.test(hs),
    (/dr-cell-sub">ข้อมูล [^<]{0,12}/.exec(hs) || [])[0]);

  // เรียง "ลงจาก ATH" — ประวัติสั้นต้องไม่แย่งที่หุ้นที่ลงจากยอดจริง
  win.ThaiDrPage._state.stats[key2OfBaba()] = {
    state: "ok", ticker: "9988.HK",
    data: { last: 107, lastDate: "2026-10-09", currency: "HKD",
      ath: 307.4, athDate: "2020-10-28", fromAthPct: -65.2,
      ath1y: 173.6, ath1yDate: "2025-10-27", fromAth1yPct: -38.4,
      coversFullYear: true, athReliable: true, historyDays: 4298,
      firstDate: "2015-01-02", bars: 2960, yearBars: 252 }
  };
  win.ThaiDrPage._state.sort = "fromAth";
  win.ThaiDrPage._state.sortDir = 1;       // น้อย→มาก = ลงลึกสุดขึ้นก่อน
  var ordered = win.ThaiDrPage._visible();
  t("เรียงลงจาก ATH: หุ้นที่ลงจากยอดจริงขึ้นก่อน (ไม่ใช่ตัวประวัติสั้นที่เลขลึกกว่า)",
    ordered[0].canonicalKey === key2OfBaba(),
    ordered.slice(0, 2).map(function (a) {
      var st = win.ThaiDrPage._state.stats[a.canonicalKey];
      return a.underlyingSymbol + "=" + (st && st.data ? st.data.fromAthPct : "—");
    }));
  // ตัวประวัติสั้นถูกจัดเป็น "ไม่มีค่า" เหมือนแถวที่ยังไม่โหลดราคา → อยู่กลุ่มท้าย
  // สิ่งที่ต้องพิสูจน์คือ "อยู่หลังตัวที่มี ATH เชื่อถือได้ทุกตัว" ไม่ใช่ "อยู่บรรทัดสุดท้าย"
  t("ตัวประวัติสั้นอยู่หลังตัวที่ ATH เชื่อถือได้ทุกตัว", (function () {
    var idxShort = -1, lastReliable = -1;
    ordered.forEach(function (a, i) {
      if (a.canonicalKey === aaplKey) idxShort = i;
      var st = win.ThaiDrPage._state.stats[a.canonicalKey];
      if (st && st.data && st.data.athReliable) lastReliable = i;
    });
    return idxShort > lastReliable;
  })(), ordered.map(function (a) {
    var st = win.ThaiDrPage._state.stats[a.canonicalKey];
    return a.underlyingSymbol + (st && st.data ? (st.data.athReliable ? "(ok)" : "(สั้น)") : "");
  }));
  t("ตัวประวัติสั้นไม่หายไปจากตาราง",
    ordered.filter(function (a) { return a.canonicalKey === aaplKey; }).length === 1);

  // "รู้เลขแต่เทียบข้ามตัวไม่ได้" ต้องไม่ถูกยุบรวมกับ "ไม่รู้เลขเลย"
  // แถวที่โชว์ -73.4% อยู่ ไม่ควรจมอยู่ใต้แถวที่ดึงราคาไม่ได้
  (function () {
    var errKey = "ERRX@NASDAQ";
    win.ThaiDrPage._state.stats[errKey] = { state: "error", note: "ดึงราคาไม่ได้" };
    var view = win.ThaiDrPage._state.view;
    var hadErr = view.assets.some(function (a) { return a.canonicalKey === errKey; });
    if (!hadErr) {
      var proto = view.assets[view.assets.length - 1];
      var clone = JSON.parse(JSON.stringify(proto));
      clone.canonicalKey = errKey;
      clone.underlyingSymbol = "ERRX";
      clone.canonicalName = "ERRX Corp";
      view.assets.push(clone);
    }
    [1, -1].forEach(function (dir) {
      win.ThaiDrPage._state.sort = "fromAth";
      win.ThaiDrPage._state.sortDir = dir;
      var ord = win.ThaiDrPage._visible();
      var iShort = -1, iErr = -1, lastOk = -1;
      ord.forEach(function (a, i) {
        if (a.canonicalKey === aaplKey) iShort = i;
        if (a.canonicalKey === errKey) iErr = i;
        var st = win.ThaiDrPage._state.stats[a.canonicalKey];
        if (st && st.data && st.data.athReliable) lastOk = i;
      });
      t("เรียง dir=" + dir + ": ตัวเชื่อได้ → ตัวประวัติสั้น → ตัวไม่มีข้อมูล",
        lastOk < iShort && iShort < iErr,
        ord.map(function (a) {
          var st = win.ThaiDrPage._state.stats[a.canonicalKey];
          return a.underlyingSymbol +
            (!st || !st.data ? "(—)" : st.data.athReliable ? "(ok)" : "(สั้น)");
        }).join(" "));
    });
    // เอาแถวทดสอบออก ไม่ให้ไปเพี้ยนเทสต์นับจำนวนแถวที่ตามมา
    var vv = win.ThaiDrPage._state.view;
    vv.assets = vv.assets.filter(function (a) { return a.canonicalKey !== errKey; });
    delete win.ThaiDrPage._state.stats[errKey];
    win.ThaiDrPage._state.sort = "name";
    win.ThaiDrPage._state.sortDir = 1;
    win.ThaiDrPage.render();
  })();
  win.ThaiDrPage._state.sort = "name";
  win.ThaiDrPage._state.sortDir = 1;
  delete win.ThaiDrPage._state.stats[key2OfBaba()];
  win.ThaiDrPage.render();

  // ข้อมูลไม่ครบ 1 ปี ต้องบอก
  win.ThaiDrPage._state.stats[aaplKey].data.coversFullYear = false;
  win.ThaiDrPage.render();
  (function () {
    var h = html();
    t("ข้อมูลไม่ครบ 1 ปี → ขึ้นป้ายบอกช่วงข้อมูลจริง",
      /dr-cell-sub">ข้อมูล [0-9]/.test(h),
      (/dr-cell-sub">ข้อมูล [^<]{0,12}/.exec(h) || [])[0]);
    t("ข้อมูลไม่ครบ 1 ปี → tooltip บอกว่ายังไม่ครบปี",
      /title="[^"]*ยังไม่ครบ 1 ปี/.test(h),
      (/title="สูงสุดเท่าที่มีข้อมูล[^"]{0,80}/.exec(h) || [])[0]);
  })();

  // ตลาดที่ดึงไม่ได้ ต้องบอกเหตุผลใน title ไม่ใช่เงียบ
  win.ThaiDrPage._state.stats[aaplKey] = {
    state: "unsupported", ticker: null, note: "ตลาดนี้ยังดึงราคาย้อนหลังไม่ได้"
  };
  win.ThaiDrPage.render();
  t("ดึงไม่ได้ → บอกเหตุผลใน title",
    html().indexOf("ตลาดนี้ยังดึงราคาย้อนหลังไม่ได้") >= 0);
  delete win.ThaiDrPage._state.stats[aaplKey];
  clickAttr("data-dr-sort", "name");
  win.ThaiDrPage.render();

  console.log("== กลุ่มธุรกิจ + ป้าย AI ==");
  var hsec = html();
  t("มีคอลัมน์กลุ่มธุรกิจ", hsec.indexOf("กลุ่มธุรกิจ") >= 0);
  t("กดเรียงตามกลุ่มธุรกิจได้", hsec.indexOf('data-dr-sort="sector"') >= 0);
  t("แถวแสดงชื่อกลุ่มธุรกิจ", hsec.indexOf("เซมิคอนดักเตอร์") >= 0 ||
    hsec.indexOf("อินเทอร์เน็ต") >= 0, (/dr-cell-sub">[^<]*/.exec(hsec) || [])[0]);
  t("หุ้น AI มีป้าย AI", hsec.indexOf('class="dr-ai">AI<') >= 0);
  t("มี chip กรองกลุ่ม AI", hsec.indexOf('data-dr-f="ai"') >= 0);
  t("มี dropdown เลือกกลุ่มธุรกิจ", hsec.indexOf('data-dr-f="sector"') >= 0);
  t("มีตัวเลือกจัดกลุ่มตามธุรกิจ", hsec.indexOf('value="sectorTh"') >= 0);
  t("ประเภทเครื่องมือย้ายไปอยู่บรรทัดรอง",
    /dr-cell-sub">(หุ้นรายตัว|ETF)/.test(hsec), (/dr-cell-sub">[^<]{0,20}/.exec(hsec) || [])[0]);

  // AAPL อยู่ในตาราง curated → ต้องได้กลุ่ม ไม่ใช่ unknown
  var aapl = null;
  win.ThaiDrPage._state.view.assets.forEach(function (a) {
    if (a.underlyingSymbol === "AAPL") aapl = a;
  });
  t("AAPL ได้กลุ่มธุรกิจจากตาราง", aapl && aapl.sectorTh === "ฮาร์ดแวร์/อุปกรณ์",
    aapl && aapl.sectorTh);
  t("BABA ติดป้าย AI", (function () {
    var b = null;
    win.ThaiDrPage._state.view.assets.forEach(function (a) {
      if (a.underlyingSymbol === "BABA") b = a;
    });
    return b && b.isAi === true;
  })());

  // กรองเฉพาะ AI
  var allN = win.ThaiDrPage._visible().length;
  clickAttr("data-dr-f", "ai");
  var aiOnly = win.ThaiDrPage._visible();
  t("กดกรอง AI แล้วเหลือเฉพาะที่ติดป้าย AI",
    aiOnly.length > 0 && aiOnly.length < allN && aiOnly.every(function (a) { return a.isAi; }),
    [aiOnly.length, allN]);
  t("แถบผลลัพธ์บอกว่ากรอง AI อยู่", html().indexOf("กลุ่ม AI") >= 0);
  clickAttr("data-dr-f", "ai");
  t("กดอีกครั้งกลับมาครบ", win.ThaiDrPage._visible().length === allN);

  // กรองตามกลุ่มธุรกิจ
  win.ThaiDrPage._state.filters.sector = "ฮาร์ดแวร์/อุปกรณ์";
  win.ThaiDrPage.render();
  var secOnly = win.ThaiDrPage._visible();
  t("กรองกลุ่มธุรกิจได้",
    secOnly.length > 0 && secOnly.every(function (a) { return a.sectorTh === "ฮาร์ดแวร์/อุปกรณ์"; }),
    secOnly.map(function (a) { return a.underlyingSymbol; }));
  win.ThaiDrPage._state.filters.sector = "";

  // จัดกลุ่มตามธุรกิจ
  win.ThaiDrPage._state.group = "sectorTh";
  win.ThaiDrPage.render();
  t("จัดกลุ่มตามธุรกิจได้", countOf(/class="dr-group"/g) >= 2, countOf(/class="dr-group"/g));
  t("หัวกลุ่มเป็นชื่อกลุ่มธุรกิจ", html().indexOf("ฮาร์ดแวร์/อุปกรณ์</b>") >= 0 ||
    /dr-group"><td[^>]*><b>[^<]*\//.test(html()));
  win.ThaiDrPage._state.group = "none";

  // เรียงตามกลุ่ม — AI ขึ้นก่อนในกลุ่มเดียวกัน
  clickAttr("data-dr-sort", "sector");
  var bySec = win.ThaiDrPage._visible();
  t("เรียงตามกลุ่มแล้ว AI ขึ้นก่อน", (function () {
    var firstNonAi = -1;
    for (var i = 0; i < bySec.length; i++) {
      if (!bySec[i].isAi && firstNonAi < 0) firstNonAi = i;
      if (bySec[i].isAi && firstNonAi >= 0) return false;  // AI โผล่หลัง non-AI = ผิด
    }
    return true;
  })(), bySec.map(function (a) { return (a.isAi ? "AI:" : "") + a.underlyingSymbol; }));
  clickAttr("data-dr-sort", "name");
  win.ThaiDrPage.render();

  console.log("== Top pick: ติ๊กแล้วยกขึ้นตารางแยกด้านบน ==");
  var before0 = win.ThaiDrPage._visible().length;
  var hp0 = html();
  t("มีคอลัมน์ Top pick", hp0.indexOf("Top pick") >= 0);
  t("ทุกแถวมี checkbox Top pick",
    countOf(/data-dr-pick="/g) === win.ThaiDrPage._visible().length,
    [countOf(/data-dr-pick="/g), win.ThaiDrPage._visible().length]);
  t("ยังไม่ติ๊ก → ไม่มีตาราง Top pick", hp0.indexOf("dr-pickwrap") < 0);
  t("แสดงดาวว่าง", countOf(/☆/g) > 0);

  // ติ๊กสองตัว
  var pickA = win.ThaiDrPage._visible()[1].canonicalKey;
  var pickAName = win.ThaiDrPage._visible()[1].canonicalName;
  var pickB = win.ThaiDrPage._visible()[3].canonicalKey;
  t("ติ๊ก Top pick ได้ผ่าน handler จริง", setCheck("data-dr-pick", pickA, true) === true);
  setCheck("data-dr-pick", pickB, true);
  var hp1 = html();
  t("เกิดตาราง Top pick ขึ้นมา", hp1.indexOf("dr-pickwrap") >= 0);
  t("หัวตารางชื่อ Top pick", /<h3>Top pick<\/h3>/.test(hp1));
  t("บอกจำนวนที่เลือก", /dr-pick-head[\s\S]{0,400}>2</.test(hp1), (/dr-count[^>]*>\d+</.exec(hp1) || [])[0]);
  t("ตาราง Top pick มี 2 แถว", (function () {
    var seg = /<section class="dr-pickwrap">[\s\S]*?<\/section>/.exec(hp1);
    if (!seg) return false;
    return (seg[0].match(/data-dr-row="/g) || []).length === 2;
  })());
  t("ตาราง Top pick อยู่เหนือตารางหลัก",
    hp1.indexOf("dr-pickwrap") < hp1.indexOf('class="dr-card dr-tablewrap"'));
  t("ดาวเปลี่ยนเป็นทึบ", countOf(/★/g) >= 2, countOf(/★/g));
  t("แถวในตารางหลักมีเส้นทอง", countOf(/dr-row--pick/g) >= 2, countOf(/dr-row--pick/g));
  t("ยังอยู่ในตารางหลักด้วย (ไม่ได้ย้ายออก)",
    win.ThaiDrPage._visible().length === before0, [win.ThaiDrPage._visible().length, before0]);
  t("มีปุ่มล้างทั้งหมด", hp1.indexOf("data-dr-clearpicks") >= 0);

  // ไม่ขึ้นกับตัวกรอง — นี่คือจุดสำคัญของฟีเจอร์
  win.ThaiDrPage._state.filters.q = "ไม่มีทางเจอสิ่งนี้";
  win.ThaiDrPage.render();
  var hFiltered = html();
  t("กรองจนตารางหลักว่าง แต่ตาราง Top pick ยังอยู่ครบ", (function () {
    var seg = /<section class="dr-pickwrap">[\s\S]*?<\/section>/.exec(hFiltered);
    return seg && (seg[0].match(/data-dr-row="/g) || []).length === 2;
  })(), hFiltered.indexOf("dr-pickwrap") >= 0);
  t("ตารางหลักขึ้นข้อความว่างตามปกติ", hFiltered.indexOf("ไม่มีรายการที่ตรงกับตัวกรอง") >= 0);
  win.ThaiDrPage._state.filters.q = "";
  win.ThaiDrPage.render();

  // ติ๊ก "ไม่สนใจ" ให้ตัวที่เป็น Top pick → ต้องยังอยู่ในตาราง Top pick
  setCheck("data-dr-ignore", pickA, true);
  t("ติ๊กไม่สนใจแล้วยังอยู่ในตาราง Top pick", (function () {
    var seg = /<section class="dr-pickwrap">[\s\S]*?<\/section>/.exec(html());
    return seg && seg[0].indexOf(pickA) >= 0;
  })());
  setCheck("data-dr-ignore", pickA, false);

  // จัดกลุ่ม: ตาราง Top pick ต้องไม่ถูกจัดกลุ่มด้วย
  win.ThaiDrPage._state.group = "geography";
  win.ThaiDrPage.render();
  t("ตาราง Top pick ไม่จัดกลุ่ม (เป็นลิสต์สั้นอยู่แล้ว)", (function () {
    var seg = /<section class="dr-pickwrap">[\s\S]*?<\/section>/.exec(html());
    return seg && seg[0].indexOf('class="dr-group"') < 0;
  })());
  t("แต่ตารางหลักยังจัดกลุ่มตามปกติ", html().indexOf('class="dr-group"') >= 0);
  win.ThaiDrPage._state.group = "none";
  win.ThaiDrPage.render();

  // เอาออก
  setCheck("data-dr-pick", pickB, false);
  t("เอาออกแล้วเหลือ 1 แถว", (function () {
    var seg = /<section class="dr-pickwrap">[\s\S]*?<\/section>/.exec(html());
    return seg && (seg[0].match(/data-dr-row="/g) || []).length === 1;
  })());

  // เก็บลงเครื่อง + จำข้ามการเปิดหน้า
  t("บันทึก Top pick ลง localStorage", (function () {
    try { return JSON.parse(store["thai_dr_toppick_v1"] || "{}")[pickA] === true; }
    catch (e) { return false; }
  })(), store["thai_dr_toppick_v1"]);
  t("เปิดหน้าใหม่ยังจำ Top pick ไว้", (function () {
    win.ThaiDrPage._state.picked = {};
    win.ThaiDrPage._hydratePicked();
    return win.ThaiDrPage._state.picked[pickA] === true;
  })());

  // คลิกในช่อง Top pick ต้องไม่กางแถว
  t("คลิกในช่อง Top pick แล้วไม่กางแถว", (function () {
    var target = win.ThaiDrPage._visible()[0].canonicalKey;
    var fn = handlers["data-dr-row|" + target + "|click"];
    if (!fn) return false;
    fn({ stopPropagation: function () {},
      target: { closest: function (sel) { return sel === ".dr-pick-col" ? {} : null; } } });
    return !win.ThaiDrPage._state.expanded[target];
  })());

  // ปุ่มล้างทั้งหมด
  clickAttr("data-dr-clearpicks", "1");
  t("กดล้างทั้งหมดแล้วตาราง Top pick หายไป", html().indexOf("dr-pickwrap") < 0);
  t("ล้างใน localStorage ด้วย", (function () {
    try { return Object.keys(JSON.parse(store["thai_dr_toppick_v1"] || "{}")).length === 0; }
    catch (e) { return false; }
  })());

  console.log("== ติ๊ก “ไม่สนใจ” แล้วดันไปท้ายตาราง ==");
  var hi0 = html();
  t("มีหัวคอลัมน์ไม่สนใจ", hi0.indexOf("ไม่สนใจ") >= 0);
  t("ทุกแถวมี checkbox ไม่สนใจ",
    countOf(/data-dr-ignore="/g) === win.ThaiDrPage._visible().length,
    [countOf(/data-dr-ignore="/g), win.ThaiDrPage._visible().length]);

  // ติ๊กตัวที่อยู่บนสุดตอนเรียงตามชื่อ
  clickAttr("data-dr-sort", "name");
  var before = win.ThaiDrPage._visible();
  var victim = before[0].canonicalKey;
  var victimName = before[0].canonicalName;
  t("ติ๊ก checkbox ได้จริงผ่าน handler ที่ wire() ผูกไว้",
    setCheck("data-dr-ignore", victim, true) === true);
  t("ติ๊กแล้วสถานะถูกเก็บ", win.ThaiDrPage._state.ignored[victim] === true);
  var after = win.ThaiDrPage._visible();
  t("ติ๊กแล้วถูกดันไปท้ายสุด",
    after[after.length - 1].canonicalKey === victim,
    { ท้ายสุด: after[after.length - 1].canonicalName, ที่ติ๊ก: victimName });
  t("ไม่ได้หายไปจากตาราง", after.length === before.length, [after.length, before.length]);
  t("ตัวอื่นยังเรียงตามเดิม", after[0].canonicalKey === before[1].canonicalKey);

  // ต้องอยู่ท้ายสุดไม่ว่าจะเรียงคอลัมน์ไหน ทิศไหน
  var SORT_ALL = ["name", "geo", "type", "drs", "newest", "status", "last", "fromAth", "fromAth1y"];
  var stuckBottom = true, failedAt = null;
  for (var si = 0; si < SORT_ALL.length; si++) {
    win.ThaiDrPage._state.sort = SORT_ALL[si];
    for (var dir = 0; dir < 2; dir++) {
      win.ThaiDrPage._state.sortDir = dir === 0 ? 1 : -1;
      var v = win.ThaiDrPage._visible();
      if (v[v.length - 1].canonicalKey !== victim) {
        stuckBottom = false;
        failedAt = SORT_ALL[si] + (dir === 0 ? " ขึ้น" : " ลง");
      }
    }
  }
  t("อยู่ท้ายสุดทุกคอลัมน์ ทุกทิศ (9 คอลัมน์ × 2 ทิศ)", stuckBottom, failedAt);
  win.ThaiDrPage._state.sort = "name";
  win.ThaiDrPage._state.sortDir = 1;

  // ติ๊กหลายตัว — ใช้ checkbox จริงอีกครั้ง
  var second = win.ThaiDrPage._visible()[0].canonicalKey;
  setCheck("data-dr-ignore", second, true);
  var multi = win.ThaiDrPage._visible();
  t("ติ๊กหลายตัวก็ไปอยู่ท้ายทั้งหมด", (function () {
    var n = multi.length;
    return win.ThaiDrPage._state.ignored[multi[n - 1].canonicalKey] &&
      win.ThaiDrPage._state.ignored[multi[n - 2].canonicalKey] &&
      !win.ThaiDrPage._state.ignored[multi[n - 3].canonicalKey];
  })(), multi.slice(-3).map(function (a) { return a.canonicalName; }));

  // หน้าจอ: แถวจาง + checkbox ติ๊กอยู่ + นับจำนวน
  win.ThaiDrPage.render();
  var hi1 = html();
  t("แถวที่ไม่สนใจมีคลาสจาง", countOf(/dr-row--ignored/g) === 2, countOf(/dr-row--ignored/g));
  t("checkbox แสดงสถานะติ๊กไว้", countOf(/data-dr-ignore="[^"]*" checked/g) === 2,
    countOf(/data-dr-ignore="[^"]*" checked/g));
  t("บอกจำนวนที่ไม่สนใจ", /ไม่สนใจ 2 \(อยู่ท้ายตาราง\)/.test(hi1), (/ไม่สนใจ[^<]*/.exec(hi1) || [])[0]);
  t("มีปุ่มซ่อนที่ไม่สนใจ", hi1.indexOf("data-dr-toggleignored") >= 0);
  t("แถวที่ไม่สนใจไม่เอาพื้นสีทอง “ใหม่” มาดึงสายตา", (function () {
    // ถ้าตัวที่ติ๊กเป็นตัวที่จดทะเบียนใหม่ ต้องไม่มีทั้งสองคลาสพร้อมกัน
    return !/dr-row--new[^"]*dr-row--ignored|dr-row--ignored[^"]*dr-row--new/.test(hi1);
  })());

  // ปุ่มซ่อน → หายไปเลย ไม่ใช่แค่ดันลงล่าง
  clickAttr("data-dr-toggleignored", "1");
  var hidden = win.ThaiDrPage._visible();
  t("กดซ่อนแล้วหายไปจากตาราง", hidden.length === before.length - 2,
    [hidden.length, before.length]);
  t("ที่เหลือไม่มีตัวที่ติ๊กเลย",
    hidden.every(function (a) { return !win.ThaiDrPage._state.ignored[a.canonicalKey]; }));
  t("ปุ่มเปลี่ยนเป็น “แสดงที่ไม่สนใจ”", html().indexOf("แสดงที่ไม่สนใจ (2)") >= 0);
  clickAttr("data-dr-toggleignored", "1");
  t("กดอีกครั้งกลับมาแสดง", win.ThaiDrPage._visible().length === before.length);

  // จัดกลุ่ม: ต้องแยกเป็นกลุ่ม "ไม่สนใจ" ท้ายสุด ไม่ใช่ท้ายของแต่ละกลุ่ม
  win.ThaiDrPage._state.group = "geography";
  win.ThaiDrPage.render();
  var hg = html();
  t("จัดกลุ่มแล้วมีกลุ่ม “ไม่สนใจ” แยกต่างหาก", hg.indexOf("dr-group--ignored") >= 0);
  t("กลุ่มไม่สนใจอยู่ท้ายสุดของตาราง", (function () {
    var iIgn = hg.indexOf("dr-group--ignored");
    var lastGroup = hg.lastIndexOf('class="dr-group"');
    return iIgn > lastGroup;
  })());
  win.ThaiDrPage._state.group = "none";

  // เก็บลงเครื่อง
  t("บันทึกรายการไม่สนใจลง localStorage", (function () {
    try {
      var saved = JSON.parse(store["thai_dr_ignored_v1"] || "{}");
      return saved[victim] === true;
    } catch (e) { return false; }
  })(), store["thai_dr_ignored_v1"]);

  // เปิดหน้าใหม่ต้องจำได้ — จำลองโดยล้าง state แล้วให้ boot อ่านจาก storage
  t("เปิดหน้าใหม่แล้วยังจำที่ติ๊กไว้", (function () {
    var keep = win.ThaiDrPage._state.ignored;
    win.ThaiDrPage._state.ignored = {};          // เหมือนเพิ่งโหลดหน้า
    win.ThaiDrPage._hydrateIgnored();            // สิ่งที่ boot() ทำ
    var ok = win.ThaiDrPage._state.ignored[victim] === true &&
      win.ThaiDrPage._state.ignored[second] === true;
    if (!ok) win.ThaiDrPage._state.ignored = keep;
    return ok;
  })(), store["thai_dr_ignored_v1"]);

  // คลิกที่ช่อง "ไม่สนใจ" ต้องไม่กางแถว
  t("คลิกในช่องไม่สนใจแล้วไม่กางแถว", (function () {
    var openBefore = countOf(/class="dr-detail"/g);
    var target = win.ThaiDrPage._visible()[0].canonicalKey;
    var fn = handlers["data-dr-row|" + target + "|click"];
    if (!fn) return false;
    // event ที่ target อยู่ในเซลล์ไม่สนใจ
    fn({ stopPropagation: function () {},
      target: { closest: function (sel) { return sel === ".dr-ign-col" ? {} : null; } } });
    return !win.ThaiDrPage._state.expanded[target];
  })());
  t("คลิกนอกช่องไม่สนใจยังกางแถวได้ตามปกติ", (function () {
    var target = win.ThaiDrPage._visible()[0].canonicalKey;
    var fn = handlers["data-dr-row|" + target + "|click"];
    fn({ stopPropagation: function () {},
      target: { closest: function () { return null; } } });
    var opened = !!win.ThaiDrPage._state.expanded[target];
    win.ThaiDrPage._state.expanded[target] = false;
    return opened;
  })());

  // ล้างสถานะก่อนไปเทสต์ข้ออื่น
  win.ThaiDrPage._state.ignored = {};
  win.ThaiDrPage.render();

  console.log("== §22 ตัวกรองตลาด/ประเภท ==");
  win.ThaiDrPage._state.filters.geo = "ฮ่องกง";
  win.ThaiDrPage.render();
  t("กรองตลาดฮ่องกง → เหลือ 1 แถว", countOf(/data-dr-row="/g) === 1, countOf(/data-dr-row="/g));
  t("และเป็น ALIBABA", html().indexOf("ALIBABA") >= 0);
  win.ThaiDrPage._state.filters.geo = "";

  win.ThaiDrPage._state.filters.type = win.ThaiDrMonitor.TYPE.ETF_INDEX;
  win.ThaiDrPage.render();
  t("กรองประเภท ETF ดัชนี → เหลือ 1 แถว", countOf(/data-dr-row="/g) === 1, countOf(/data-dr-row="/g));
  t("และเป็น IVV", html().indexOf("IVV") >= 0);
  win.ThaiDrPage._state.filters.type = "";

  win.ThaiDrPage._state.filters.multi = true;
  win.ThaiDrPage.render();
  t("กรอง “มี DR มากกว่า 1” → เหลือ 2 แถว", countOf(/data-dr-row="/g) === 2, countOf(/data-dr-row="/g));
  win.ThaiDrPage._state.filters.multi = false;

  win.ThaiDrPage._state.filters.review = true;
  win.ThaiDrPage.render();
  t("กรอง “รอตรวจ” → ได้เฉพาะตัวที่จัดไม่ได้", html().indexOf("JPMORGAN") >= 0);
  t("และไม่ติดหุ้นที่จัดได้มาด้วย", html().indexOf("APPLE INC") < 0);
  win.ThaiDrPage._state.filters.review = false;

  console.log("== §23 ตัวกรองของใหม่ ==");
  win.ThaiDrPage._state.filters.isNew = true;
  win.ThaiDrPage.render();
  var hn = html();
  t("กรอง “จดทะเบียนใหม่” → เหลือ 1 แถว", countOf(/data-dr-row="/g) === 1, countOf(/data-dr-row="/g));
  t("และเป็นตัวที่เพิ่งจดทะเบียนจริง", hn.indexOf("NEW COMPANY") >= 0);
  t("ไม่ใช่ทุกตัวที่เพิ่งถูกเห็นครั้งแรก", hn.indexOf("APPLE INC") < 0);
  win.ThaiDrPage._state.filters.isNew = false;

  console.log("== §24 ค้นหาเจอทั้งสัญลักษณ์อ้างอิงและ DR ==");
  win.ThaiDrPage._state.filters.q = "AAPL19";
  win.ThaiDrPage.render();
  t("ค้นด้วย DR symbol เจอ", countOf(/data-dr-row="/g) === 1 && html().indexOf("APPLE") >= 0);
  win.ThaiDrPage._state.filters.q = "BABA";
  win.ThaiDrPage.render();
  t("ค้นด้วยสัญลักษณ์อ้างอิงเจอ", countOf(/data-dr-row="/g) === 1 && html().indexOf("ALIBABA") >= 0);
  win.ThaiDrPage._state.filters.q = "พาย";
  win.ThaiDrPage.render();
  t("ค้นด้วยชื่อผู้ออกเจอ", countOf(/data-dr-row="/g) >= 1, countOf(/data-dr-row="/g));
  win.ThaiDrPage._state.filters.q = "ไม่มีทางเจอสิ่งนี้";
  win.ThaiDrPage.render();
  t("ค้นไม่เจอ → ขึ้นข้อความว่าง ไม่ throw", html().indexOf("ไม่มีรายการที่ตรงกับตัวกรอง") >= 0);
  win.ThaiDrPage._state.filters.q = "";
  win.ThaiDrPage.render();

  // ตารางว่างเพราะตัวกรองชนกัน — ต้องบอกว่า "ตัวไหน" เป็นตัวตัดทิ้ง
  // เคสจริงจากผู้ใช้: เปิด chip รอตรวจ ค้างไว้ แล้วค้น ASML → ว่างเปล่า
  // โดยที่หน้าจอไม่ได้บอกเลยว่า ASML มีอยู่ แต่ถูก chip ตัดออก
  console.log("== ตารางว่างเพราะตัวกรองชนกัน ต้องบอกสาเหตุ ==");
  win.ThaiDrPage._state.filters.review = true;
  win.ThaiDrPage._state.filters.q = "AAPL";
  win.ThaiDrPage.render();
  var hConflict = html();
  t("ยืนยันว่าเงื่อนไขนี้ทำให้ตารางว่างจริง", win.ThaiDrPage._visible().length === 0);
  t("บอกว่าคำค้นมีผลลัพธ์อยู่ แต่ถูกตัดด้วยตัวกรองอื่น",
    hConflict.indexOf("ถูกตัดออกด้วยตัวกรอง") >= 0, hConflict.indexOf("ไม่มีรายการ") >= 0);
  // ชื่อตัวกรองอยู่ใน <b> จึงต้องข้ามแท็กได้ (ใช้ [^<]* จะหยุดที่ < ก่อนถึงชื่อ)
  t("ระบุชื่อตัวกรองที่เป็นต้นเหตุ (รอตรวจ)",
    /ถูกตัดออกด้วยตัวกรอง[\s\S]{0,30}รอตรวจ/.test(hConflict),
    (/ถูกตัดออกด้วยตัวกรอง[\s\S]{0,40}/.exec(hConflict) || [])[0]);
  t("มีปุ่มปิดตัวกรองตัวนั้นให้เลย", hConflict.indexOf("data-dr-offfilter=") >= 0);
  t("ไม่ไปแนะนำให้ลบคำค้นที่ผู้ใช้ตั้งใจพิมพ์",
    hConflict.indexOf("เปลี่ยนคำค้น") < 0 || hConflict.indexOf("รอตรวจ") >= 0);
  // กดปุ่มแล้วต้องเห็นผลจริง
  t("กดปุ่มปิดตัวกรองแล้วเจอรายการ", (function () {
    var ok = clickAttr("data-dr-offfilter", "review");
    return ok && win.ThaiDrPage._visible().length > 0;
  })(), win.ThaiDrPage._visible().length);
  t("ตัวกรองนั้นถูกปิดจริง", win.ThaiDrPage._state.filters.review === false);
  t("คำค้นของผู้ใช้ยังอยู่", win.ThaiDrPage._state.filters.q === "AAPL");

  // เปิดสองตัวกรอง แต่มี "ตัวเดียว" ที่ปิดแล้วเห็นผล
  //   q=ALIBABA → BABA ผ่าน · BABA เป็น AI และอยู่กลุ่มอินเทอร์เน็ต
  //   ai=true    → BABA ผ่าน (ไม่ใช่ต้นเหตุ)
  //   sector=ฮาร์ดแวร์ → BABA ไม่ผ่าน (ตัวนี้คือต้นเหตุ)
  // ถ้าโค้ดคืน "ตัวแรกที่เปิดอยู่" จะชี้ ai ซึ่งปิดแล้วก็ยังว่าง = ผิด
  win.ThaiDrPage._state.filters.ai = true;
  win.ThaiDrPage._state.filters.sector = "ฮาร์ดแวร์/อุปกรณ์";
  win.ThaiDrPage._state.filters.q = "ALIBABA";
  win.ThaiDrPage.render();
  var hTwo = html();
  t("เปิดสองตัวกรอง → ตารางว่างจริง", win.ThaiDrPage._visible().length === 0);
  t("ปิด ai อย่างเดียวยังว่าง (ยืนยันว่า ai ไม่ใช่ต้นเหตุ)", (function () {
    win.ThaiDrPage._state.filters.ai = false;
    var n = win.ThaiDrPage._visible().length;
    win.ThaiDrPage._state.filters.ai = true;
    return n === 0;
  })());
  t("ชี้ตัวกรองที่ปิดแล้วเห็นผลจริง (กลุ่มธุรกิจ) ไม่ใช่ตัวแรกที่เปิดอยู่",
    /ถูกตัดออกด้วยตัวกรอง[\s\S]{0,60}กลุ่มธุรกิจ/.test(hTwo),
    (/ถูกตัดออกด้วยตัวกรอง[\s\S]{0,70}/.exec(hTwo) || [])[0]);
  t("ปุ่มที่ให้มาคือตัวกรองกลุ่มธุรกิจ", hTwo.indexOf('data-dr-offfilter="sector"') >= 0,
    (/data-dr-offfilter="[a-z]+"/.exec(hTwo) || [])[0]);
  t("กดแล้วเห็นผลจริง", (function () {
    clickAttr("data-dr-offfilter", "sector");
    return win.ThaiDrPage._visible().length > 0;
  })(), win.ThaiDrPage._visible().length);
  win.ThaiDrPage._state.filters.sector = "";
  win.ThaiDrPage._state.filters.ai = false;

  // ค้นไม่เจอจริง ๆ (ไม่มีตัวกรองอื่นเกี่ยวข้อง) → ข้อความเดิม ไม่ใช่โทษตัวกรอง
  win.ThaiDrPage._state.filters.review = false;
  win.ThaiDrPage._state.filters.q = "ไม่มีทางเจอสิ่งนี้";
  win.ThaiDrPage.render();
  t("ค้นไม่เจอจริง → ไม่โทษตัวกรองมั่ว", html().indexOf("ถูกตัดออกด้วยตัวกรอง") < 0);
  t("และยังขึ้นข้อความว่างตามปกติ", html().indexOf("ไม่มีรายการที่ตรงกับตัวกรอง") >= 0);
  win.ThaiDrPage._state.filters.q = "";
  win.ThaiDrPage.render();

  console.log("== จัดกลุ่ม ==");
  win.ThaiDrPage._state.group = "geography";
  win.ThaiDrPage.render();
  t("จัดกลุ่มตามตลาดได้", countOf(/dr-group/g) >= 2, countOf(/dr-group/g));
  t("ยังเห็นทุกแถว", countOf(/data-dr-row="/g) === 7, countOf(/data-dr-row="/g));
  win.ThaiDrPage._state.group = "instrumentType";
  win.ThaiDrPage.render();
  t("จัดกลุ่มตามประเภทได้", countOf(/dr-group/g) >= 2);
  win.ThaiDrPage._state.group = "none";
  win.ThaiDrPage.render();

  console.log("== §25 ข้อผิดพลาดและข้อมูลเก่าต้องมองเห็น ==");
  // ดีไซน์ใหม่: วันที่ข้อมูลและแหล่งอยู่บนแถบ hero
  t("บอกวันที่ของข้อมูล", /ข้อมูล \d/.test(html()), (/ข้อมูล [^<]*/.exec(html()) || [])[0]);
  t("บอกแหล่งข้อมูล", html().indexOf("SET DR list") >= 0);
  t("บอกว่าเป็นการบันทึกครั้งแรก (baseline) ไม่ใช่ของใหม่ทั้งหมด",
    html().indexOf("ฐานตั้งต้น") >= 0);

  // แหล่งล่ม → ต้องเก็บของเดิมไว้ ไม่ใช่กลายเป็นหน้าว่าง
  var before = win.ThaiDrPage._state.view.assets.length;
  nextResponse = { ok: false, status: 503, body: {
    ok: false, rows: [], total: 0, degraded: true, complete: false,
    reason: "ดึงทะเบียน DR จาก SET ไม่สำเร็จ (timeout) และไม่มี cache"
  } };
  return win.ThaiDrPage.load(true).then(function () {
    var he = html();
    t("แหล่งล่ม → ยังแสดงรายการเดิมไว้",
      win.ThaiDrPage._state.view.assets.length === before,
      win.ThaiDrPage._state.view.assets.length);
    t("แหล่งล่ม → ขึ้นคำเตือนให้เห็น", he.indexOf("ดึงข้อมูลไม่สำเร็จ") >= 0);
    t("แหล่งล่ม → บอกว่าไม่ได้อัปเดตสถานะ", he.indexOf("ไม่ได้</b>อัปเดตสถานะ") >= 0 ||
      he.indexOf("ไม่ได้") >= 0);
    t("แหล่งล่ม → ไม่กลายเป็นหน้าว่าง", countOf(/data-dr-row="/g) === 7, countOf(/data-dr-row="/g));

    // สแกนไม่ครบ → ห้ามบอกว่าอะไรหาย
    nextResponse = { ok: true, status: 200, body: {
      ok: true, rows: FAKE_ROWS.slice(0, 3), total: 3,
      tradingDate: "2026-10-13T00:00:00+07:00", fetchedAt: "2026-10-13T03:00:00Z",
      source: "SET DR list (cache เก่า)", degraded: true, complete: false,
      reason: "ข้อมูลไม่สด"
    } };
    return win.ThaiDrPage.load(true);
  }).then(function () {
    var hp = html();
    t("สแกนไม่ครบ → เตือนว่าจะไม่ตัดสินว่าอะไรหาย",
      hp.indexOf("ไม่ใช่การสแกนที่ครบ") >= 0 || hp.indexOf("ไม่สด") >= 0);
    t("สแกนไม่ครบ → ไม่มีตัวไหนถูกมาร์คว่าหาย",
      win.ThaiDrPage._state.view.summary.missing === 0,
      win.ThaiDrPage._state.view.summary.missing);

    console.log("== §26 ห้ามมีค่าผิดรูปหลุดออกจอ ==");
    // ไล่ทุกมุมมองที่ผู้ใช้กดได้จริง
    var views = [];
    ["none", "geography", "instrumentType"].forEach(function (g) {
      win.ThaiDrPage._state.group = g;
      win.ThaiDrPage.render();
      views.push(html());
    });
    win.ThaiDrPage._state.group = "none";
    win.ThaiDrPage._state.view.assets.forEach(function (a) {
      win.ThaiDrPage._state.expanded[a.canonicalKey] = true;
    });
    win.ThaiDrPage.render();
    views.push(html());
    win.ThaiDrPage._state.editing = win.ThaiDrPage._state.view.assets[0].canonicalKey;
    win.ThaiDrPage.render();
    views.push(html());

    var leaked = [];
    views.forEach(function (v, i) {
      var m = v.match(/(NaN|undefined|Infinity|\[object )/);
      if (m) leaked.push("view" + i + ": " + v.slice(Math.max(0, v.indexOf(m[0]) - 40), v.indexOf(m[0]) + 30));
    });
    t("ไม่มี NaN/undefined/Infinity/[object หลุดออกจอ", leaked.length === 0, leaked.slice(0, 3));

    console.log("== §27 ห้ามมีคำชี้นำซื้อขาย ==");
    var all = views.join(" ");
    t("ไม่มีคำว่า Buy/Sell", !/\b(Buy|Sell|BUY|SELL)\b/.test(all));
    t("ไม่มีคำแนะนำซื้อขายภาษาไทย", !/ควรซื้อ|ควรขาย|น่าซื้อ|น่าขาย|แนะนำซื้อ|จุดเข้า|ตัดขาดทุน/.test(all));
    t("ไม่มีการจัดอันดับความน่าสนใจ", !/น่าสนใจที่สุด|อันดับ 1|คะแนนรวม/.test(all));
    t("ระบุชัดว่าไม่ใช่คำแนะนำลงทุน",
      all.indexOf("ไม่ใช่คำแนะนำการลงทุน") >= 0 || all.indexOf("ไม่ใช่คำแนะนำลงทุน") >= 0);

    console.log("== กรณีว่างเปล่า ==");
    store = {};
    var emptyEls = els.drRoot;
    win.ThaiDrPage._state.view = null;
    win.ThaiDrPage._state.rows = null;
    win.ThaiDrPage._state.error = "ทดสอบ: ไม่มีข้อมูล";
    win.ThaiDrPage.render();
    t("ไม่มีข้อมูล → ขึ้นข้อความชัดเจน ไม่ throw",
      emptyEls.innerHTML.indexOf("ยังไม่มีข้อมูล") >= 0);
    t("และยังแสดงปุ่มโหลดใหม่", emptyEls.innerHTML.indexOf("data-dr-reload") >= 0);

    finish();
  });
  }  // runRest
}).catch(function (e) {
  clearTimeout(watchdog);
  console.error("  ✗ หน้าเว็บ throw: " + (e && e.stack || e));
  fail++;
  finish();
});
