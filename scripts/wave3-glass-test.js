"use strict";
// ============================================================
// WAVE 3 SETUP — การ์ดแก้ว (glass-cards.css gc-2) · 2026-11-22
//   node scripts/wave3-glass-test.js
//
// ล็อก:
//   · สีการ์ด = สถานะ setup/trigger ที่ engine คิดไว้แล้วเท่านั้น (ตาราง map อยู่ใน wave3-page.js ที่ STATUS)
//       READY   (setup ครบ + breakout + volume ยืนยัน)      → gc-calm    (ดี)
//       WATCH   (setup ขาด ≤ 1 ข้อ — รอทริกเกอร์)           → gc-normal  (ปกติ)
//       WAIT    (setup ขาด ≥ 2 ข้อ — กำลังก่อตัว)           → gc-warning (ระวัง)
//       INVALID (ไม่ผ่าน Trend Qualification = จุดเทา ⚪ "ไม่มี setup") → gc-neutral (ไม่ใช่สถานะอันตราย · controller ruling 2026-11-22)
//       สถานะอื่น/ไม่มีสถานะ                                → gc-neutral
//     หน้านี้ไม่มีสถานะ "แย่" → ต้องไม่มี gc-danger เลย
//     การ์ดที่มีสถานะ: การ์ด Upcoming Setups (ต่อสินทรัพย์) · หน้าต่างรายละเอียด (modal) ของสินทรัพย์
//     การ์ดที่ไม่มีสถานะของตัวเอง → gc-neutral: hero (สรุปทั้งหน้า) · กลุ่มสินทรัพย์ 4 กลุ่ม · หมายเหตุวิธีคิด
//   · การ์ดย่อยใน modal เป็นแผงบนแก้ว ไม่ใช่การ์ดแก้วซ้อน (modal มี gc-card ชิ้นเดียว)
//   · ตัวเลขบนการ์ด = gc-num (Inter 700 tabular) · สีสถานะบนแก้วยกความสว่าง ≥ 0.70 (≥ 4.5:1 ทุก tone)
//   · คงคลาส / data-sym / data-uni / ข้อความเดิม · escape ทุกค่า · สถานะแปลก ๆ ไม่หลุดเข้า class
//   · HTML โหลด glass-cards.css หลัง mission-control.css ก่อน mission-control-v2.css + wave3.css
//     (mission-control-v2.css ใช้ร่วมกับ /home /ai-cycle — ไม่แตะ เวอร์ชันเท่า home)
//   · หน้านี้ไม่แสดงเงินของพอร์ต (แค่ราคาตลาด + ป้าย "ถืออยู่") → ไม่มีเทสต์ Privacy lock
// ============================================================
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var PUB = path.join(__dirname, "..", "public");
function read(f) { return fs.readFileSync(path.join(PUB, f), "utf8"); }
var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; return; }
  fail++;
  console.error("  ✗ " + name + (extra !== undefined ? "  → " + JSON.stringify(extra) : ""));
}

// ---------- fixture (รูปเดียวกับ snapshot.wave3 จาก wave3-engine.js) ----------
function asset(sym, uni, status, readiness, o) {
  o = o || {};
  var a = {
    symbol: sym, name: o.name || (sym + " Inc"), universe: uni, isHolding: !!o.isHolding, status: status,
    readiness: readiness, quality: o.quality || "B+", confidence: 72, price: o.price == null ? 123.45 : o.price, bars: 480,
    waitingFor: status === "WATCH" || status === "WAIT" ? "Breakout เหนือ Wave 1 High" : "",
    fib: { retrace: 52.1, ideal: 50, diff: 2.1, quality: "Excellent", stars: 4 },
    historical: { insufficient: false, occurrences: 9, positivePct: 67, avgReturn: 8.4, medianReturn: 6.1, avgDrawdown: -4.2, worst: -12.5, best: 31.2, horizon: 20 },
    trendQual: { priceAboveEma200: status !== "INVALID", ema50AboveEma200: true, structureOk: true, adxPass: true, adx: 24, adxFloor: 20, passed: status !== "INVALID" },
    waves: { w1: { startVal: 90, startDate: "2026-06-01", endVal: 140, endDate: "2026-08-01" }, w2: { endVal: 114, endDate: "2026-09-15" }, currentVal: 123.45 },
    evidence: [{ kind: "setup", ok: true, label: "EMA12 > EMA26" }, { kind: "setup", ok: false, label: "RSI > 55" }, { kind: "trigger", ok: false, label: "Breakout เหนือ W1 High" }, { kind: "trigger", na: true, label: "Weekly" }],
    components: [{ label: "Trend Structure", max: 25, val: 20 }, { label: "Weekly Confirmation", max: 10, val: null, na: true }],
    targets: [{ label: "127.2%", price: 153.6 }, { label: "161.8%", price: 170.9 }],
    invalidation: ["ปิดต่ำกว่า Wave 2 Low (114)"],
    readings: { ema12: 121, ema26: 118, ema50: 110, ema200: 98, sma50: 109, sma200: 97, rsi: 58, adx: 24, volRatio: 1.4, atr: 3.2, weekly: { above: true, basis: 40 } }
  };
  var k; for (k in o) if (k !== "name" && k !== "isHolding" && k !== "quality" && k !== "price") a[k] = o[k];
  return a;
}
function sec(items) {
  var c = { ready: 0, watch: 0, wait: 0, invalid: 0 };
  items.forEach(function (a) { c[a.status.toLowerCase()] = (c[a.status.toLowerCase()] || 0) + 1; });
  return { items: items, ready: c.ready, watch: c.watch, wait: c.wait, invalid: c.invalid };
}
var QQQM = asset("QQQM", "portfolio", "READY", 81, { isHolding: true, quality: "A" });
var NVDA = asset("NVDA", "aiBoom", "WATCH", 70, { quality: "B+" });
var AMD = asset("AMD", "aiBoom", "WAIT", 61, { quality: "B" });
var INTC = asset("INTC", "aiBoom", "INVALID", 22, { quality: "C" });
var PTT = asset("PTT.BK", "thailand", "WAIT", 64, { name: "PTT <script>alert(1)</script>" });
var BTC = asset("BTC-USD", "crypto", "READY", 88, { quality: "A+", price: 98765.4 });
var ODD = asset("ODD", "crypto", "READY\" onmouseover=\"x", 40);
function upc(a) { return { symbol: a.symbol, name: a.name, universe: a.universe, readiness: a.readiness, quality: a.quality, status: a.status, waitingFor: a.waitingFor, missing: [] }; }
var W3 = {
  available: true, engineVersion: 1, generatedAt: new Date(Date.now() - 5 * 60000).toISOString(),
  universes: { portfolio: sec([QQQM]), aiBoom: sec([NVDA, AMD, INTC]), thailand: sec([PTT]), crypto: sec([BTC]) },
  upcoming: [upc(BTC), upc(QQQM), upc(NVDA), upc(PTT), upc(ODD)],
  meta: { counts: { portfolio: 1, aiBoom: 3, thailand: 1, crypto: 1 }, totalReady: 2, totalWatch: 1 }
};
W3.universes.crypto.items.push(ODD); // สถานะแปลก ๆ อยู่ในกลุ่มด้วย (ซ่อนอยู่ ไม่ใช่ READY/WATCH)

// ---------- sandbox ----------
function boot(snap) {
  var handlers = [];        // คลิกแถว / การ์ด upcoming ที่ wire() ผูกไว้
  var appended = [];        // สิ่งที่ openDetail() ต่อท้าย body
  var root = {
    id: "wave3Root", innerHTML: "",
    querySelectorAll: function (sel) {
      if (sel.indexOf(".w3-row") < 0) return [];
      // คืนตัวคลิกปลอมหนึ่งตัวต่อหนึ่ง data-sym ที่อยู่ใน innerHTML ตอนนี้
      var out = [], re = /data-sym="([^"]*)" data-uni="([^"]*)"/g, m;
      while ((m = re.exec(root.innerHTML)) !== null) {
        (function (s, u) {
          out.push({ getAttribute: function (k) { return k === "data-sym" ? s : u; },
            addEventListener: function (ev, fn) { handlers.push({ sym: s, uni: u, fn: fn }); } });
        })(m[1].replace(/&quot;/g, "\"").replace(/&amp;/g, "&"), m[2]);
      }
      return out;
    }
  };
  var doc = {
    readyState: "complete",
    getElementById: function (id) { return id === "wave3Root" ? root : null; },
    addEventListener: function () {},
    removeEventListener: function () {},
    createElement: function () { return { className: "", innerHTML: "", parentNode: null, addEventListener: function () {} }; },
    body: { style: {}, appendChild: function (n) { n.parentNode = this; appended.push(n); return n; }, removeChild: function () {} }
  };
  var sb = { document: doc, console: console, Date: Date, Math: Math, JSON: JSON };
  sb.window = sb;
  sb.addEventListener = function () {};
  sb.PortfolioDataSnapshot = { read: function () { return snap; } };
  vm.createContext(sb);
  vm.runInContext(read("wave3-page.js"), sb, { filename: "wave3-page.js" });
  return {
    root: root, api: sb.Wave3Page,
    open: function (sym) {
      handlers.length = 0; sb.Wave3Page.render();
      var h = handlers.filter(function (x) { return x.sym === sym; })[0];
      if (!h) return null;
      h.fn();
      return appended[appended.length - 1] || null;
    }
  };
}
// class="…" of the element that carries `marker` (first match after it is fine for our markers)
function classesWith(html, marker) {
  var out = [], re = /class="([^"]*)"/g, m;
  while ((m = re.exec(html)) !== null) if ((" " + m[1] + " ").indexOf(" " + marker + " ") >= 0) out.push(m[1]);
  return out;
}
function toneOf(cls) { var m = /\bgc-(calm|normal|warning|danger|neutral)\b/g, x, all = []; while ((x = m.exec(cls)) !== null) all.push(x[1]); return all.join("+") || null; }
// the opening tag of the element whose attribute data-sym="sym" (upcoming card / row)
function tagFor(html, cls, sym) {
  var re = new RegExp('<button class="([^"]*\\b' + cls + '\\b[^"]*)" data-sym="' + sym.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '"');
  var m = re.exec(html); return m ? m[1] : null;
}

// ============================================================ 1. status → tone (the one map)
var B = boot({ wave3: W3 });
var html = B.root.innerHTML;
t("Wave3Page exposes statusTone (the page's single status → tone map)", B.api && typeof B.api.statusTone === "function");
if (B.api && typeof B.api.statusTone === "function") {
  var ST = B.api.statusTone;
  t("READY → gc-calm (ดี)", ST("READY") === "gc-calm", ST("READY"));
  t("WATCH → gc-normal (ปกติ)", ST("WATCH") === "gc-normal", ST("WATCH"));
  t("WAIT → gc-warning (ระวัง)", ST("WAIT") === "gc-warning", ST("WAIT"));
  t("INVALID → gc-neutral (grey ⚪ = no setup, not a danger state)", ST("INVALID") === "gc-neutral", ST("INVALID"));
  t("no status maps to gc-danger (the page has no 'bad' state)", ["READY", "WATCH", "WAIT", "INVALID"].every(function (s) { return ST(s) !== "gc-danger"; }));
  t("no / unknown status → gc-neutral (never invents a tone)", ST() === "gc-neutral" && ST(null) === "gc-neutral" && ST("") === "gc-neutral" && ST("ready") === "gc-neutral" &&
    ST("toString") === "gc-neutral" && ST("READY\" onmouseover=\"x") === "gc-neutral", [ST(), ST("ready"), ST("toString")]);
}

// ============================================================ 2. cards on the page
var hero = classesWith(html, "w3-hero");
t("hero = one neutral glass card (summary of the whole page, no status of its own)", hero.length === 1 && /\bgc-card\b/.test(hero[0]) && toneOf(hero[0]) === "neutral", hero);
var stats = classesWith(html, "w3-stat-n");
t("hero numbers (READY · WATCH · สแกนแล้ว) are gc-num", stats.length === 3 && stats.every(function (c) { return /\bgc-num\b/.test(c); }), stats);
t("hero stat blocks keep their status hooks (w3-st-ready / w3-st-watch / w3-st-neutral)",
  classesWith(html, "w3-stat").map(function (c) { return (c.match(/w3-st-\w+/) || [""])[0]; }).join() === "w3-st-ready,w3-st-watch,w3-st-neutral");

var upTone = { "BTC-USD": "calm", "QQQM": "calm", "NVDA": "normal", "PTT.BK": "warning" };
Object.keys(upTone).forEach(function (sym) {
  var c = tagFor(html, "w3-up-card", sym);
  t("Upcoming card " + sym + " (" + (sym === "NVDA" ? "WATCH" : sym === "PTT.BK" ? "WAIT" : "READY") + ") → gc-card gc-tile gc-" + upTone[sym],
    !!c && /\bgc-card\b/.test(c) && /\bgc-tile\b/.test(c) && toneOf(c) === upTone[sym], c);
});
var odd = tagFor(html, "w3-up-card", "ODD");
t("Upcoming card with an unknown status → gc-neutral, and the status text never reaches the class attribute",
  !!odd && toneOf(odd) === "neutral" && html.indexOf("onmouseover=\"x") < 0 && html.indexOf('onmouseover="x') < 0, odd);
t("every upcoming card is exactly one tone", classesWith(html, "w3-up-card").every(function (c) { return /^(calm|normal|warning|danger|neutral)$/.test(toneOf(c) || ""); }),
  classesWith(html, "w3-up-card"));

var secs = classesWith(html, "w3-sec");
t("4 universe sections = neutral glass cards (a group of assets has no single status)", secs.length === 4 && secs.every(function (c) { return /\bgc-card\b/.test(c) && toneOf(c) === "neutral"; }), secs);
var rows = classesWith(html, "w3-row");
t("asset rows stay rows inside their section (no glass card per row) · status shown by the pill", rows.length >= 3 && rows.every(function (c) { return !/\bgc-card\b/.test(c); }), rows);
t("row prices are gc-num", classesWith(html, "w3-row-price").length === rows.length && classesWith(html, "w3-row-price").every(function (c) { return /\bgc-num\b/.test(c); }));
t("readiness ring value is gc-num (its band colour stays inline)", classesWith(html, "w3-ring-hole").length > 0 && classesWith(html, "w3-ring-hole").every(function (c) { return /\bgc-num\b/.test(c); }) &&
  /class="w3-ring-hole gc-num" style="color:var\(--w3-a\)"/.test(html));
var method = classesWith(html, "w3-method");
t("methodology note = neutral glass card", method.length === 1 && /\bgc-card\b/.test(method[0]) && toneOf(method[0]) === "neutral", method);
t("Upcoming heading sits on the page (gc-section-h), not on a card", classesWith(html, "w3-block-head").length === 1 && /\bgc-section-h\b/.test(classesWith(html, "w3-block-head")[0]));
var gcCount = (html.match(/\bgc-card\b/g) || []).length;
t("glass cards on the page = hero + upcoming cards + 4 sections + method", gcCount === 1 + W3.upcoming.length + 4 + 1, gcCount);

// hooks / text / escaping kept
t("data-sym / data-uni hooks kept on rows and upcoming cards", /class="w3-row" data-sym="QQQM" data-uni="portfolio"/.test(html) &&
  /data-sym="NVDA" data-uni="aiBoom"/.test(html) && /class="w3-toggle" data-uni="aiBoom"/.test(html));
t("texts kept (Upcoming Setups · universe labels · method)", html.indexOf("🔭 Upcoming Setups") >= 0 && html.indexOf("Portfolio Holdings") >= 0 && html.indexOf("Crypto Top 20") >= 0 &&
  html.indexOf("ไม่ใช่คำแนะนำซื้อ/ขาย") >= 0 && html.indexOf("อะไรกำลัง<b>ใกล้เข้าสู่ Major Wave 3</b>") >= 0);
t("names are escaped", html.indexOf("<script>alert(1)") < 0);

// ============================================================ 3. modal = one glass card, tone = the asset's status
[["QQQM", "calm"], ["NVDA", "normal"], ["BTC-USD", "calm"]].forEach(function (p) {
  var m = B.open(p[0]);
  var mc = m ? classesWith(m.innerHTML, "w3-modal") : [];
  t("detail modal " + p[0] + " → gc-card gc-" + p[1], mc.length === 1 && /\bgc-card\b/.test(mc[0]) && toneOf(mc[0]) === p[1], mc);
});
// WAIT / INVALID rows are hidden until the toggle; their modal is the same builder — open it through an upcoming hook
t("toggle still flips expanded[data-uni] and re-renders", /expanded\[k\] = !expanded\[k\]; render\(\);/.test(read("wave3-page.js")));
function modalFor(a) {
  // open through an upcoming-style hook: the page looks the symbol up in its universe, then in all universes
  var w = JSON.parse(JSON.stringify(W3)); w.upcoming = [upc(a)];
  var X = boot({ wave3: w });
  var m = X.open(a.symbol);
  return m ? m.innerHTML : "";
}
var mWait = modalFor(AMD), mInv = modalFor(INTC);
t("detail modal AMD (WAIT) → gc-warning", toneOf(classesWith(mWait, "w3-modal")[0] || "") === "warning", classesWith(mWait, "w3-modal"));
t("detail modal INTC (INVALID) → gc-neutral", toneOf(classesWith(mInv, "w3-modal")[0] || "") === "neutral", classesWith(mInv, "w3-modal"));
var mOdd = modalFor(ODD);
t("detail modal with an unknown status → gc-neutral (no tone invented)", toneOf(classesWith(mOdd, "w3-modal")[0] || "") === "neutral" && mOdd.indexOf('onmouseover="x') < 0, classesWith(mOdd, "w3-modal"));
t("modal holds ONE glass card — its inner cards are panels on the glass, not nested cards", (mInv.match(/\bgc-card\b/g) || []).length === 1 && classesWith(mInv, "w3-card").length >= 6 &&
  classesWith(mInv, "w3-card").every(function (c) { return !/\bgc-card\b/.test(c); }));
t("modal keeps role=dialog + aria-modal + close button aria-label", /role="dialog" aria-modal="true"/.test(mInv) && /class="w3-modal-close" aria-label="close"/.test(mInv));
t("modal figures are gc-num (fib retracement · historical cells · projection levels)",
  classesWith(mInv, "w3-fib-big").every(function (c) { return /\bgc-num\b/.test(c); }) && classesWith(mInv, "w3-fib-big").length === 1 &&
  classesWith(mInv, "w3-hist-v").length === 7 && classesWith(mInv, "w3-hist-v").every(function (c) { return /\bgc-num\b/.test(c); }) &&
  classesWith(mInv, "w3-tgt-p").length === 2 && classesWith(mInv, "w3-tgt-p").every(function (c) { return /\bgc-num\b/.test(c); }));
t("modal status line keeps its status hook", /class="w3-md-statusline w3-st-invalid"/.test(mInv));

// ============================================================ 4. empty states
var noSnap = boot(null).root.innerHTML, noW3 = boot({ wave3: null }).root.innerHTML;
t("empty state (no snapshot) = neutral glass hero", classesWith(noSnap, "w3-hero").length === 1 && /\bgc-card\b/.test(classesWith(noSnap, "w3-hero")[0]) && toneOf(classesWith(noSnap, "w3-hero")[0]) === "neutral" &&
  noSnap.indexOf("ยังไม่มี Snapshot") >= 0);
t("empty state (no wave3 in snapshot) = neutral glass hero", toneOf(classesWith(noW3, "w3-hero")[0] || "") === "neutral" && noW3.indexOf("ยังไม่ได้สแกน Wave 3") >= 0);

// ============================================================ 5. HTML: load order + versions
var H = read("wave3.html"), HOME = read("home.html");
function ver(h, f) { var m = new RegExp(f.replace(/[.]/g, "\\.") + "\\?v=([^\"]+)\"").exec(h); return m ? m[1] : null; }
var iM = H.indexOf("/mission-control.css?v="), iG = H.indexOf("/glass-cards.css?v="), iV = H.indexOf("/mission-control-v2.css?v="), iW = H.indexOf("/wave3.css?v=");
t("wave3.html: mission-control.css → glass-cards.css → mission-control-v2.css → wave3.css", iM > 0 && iG > iM && iV > iG && iW > iV, [iM, iG, iV, iW]);
t("glass-cards.css loaded once at the site-wide version (20261121-gc-2)", (H.match(/\/glass-cards\.css\?v=/g) || []).length === 1 && ver(H, "/glass-cards.css") === "20261121-gc-2", ver(H, "/glass-cards.css"));
t("wave3.css → 20261122-w3-3 · wave3-page.js → 20261122-w3-3", ver(H, "/wave3.css") === "20261122-w3-3" && ver(H, "/wave3-page.js") === "20261122-w3-3", [ver(H, "/wave3.css"), ver(H, "/wave3-page.js")]);
t("shared mission-control-v2.css untouched: same version as /home", ver(H, "/mission-control-v2.css") === ver(HOME, "/mission-control-v2.css"), [ver(H, "/mission-control-v2.css"), ver(HOME, "/mission-control-v2.css")]);
t("loads Inter 700 (gc-num)", /fonts\.googleapis\.com\/css2\?family=Inter:wght@[^"&]*700/.test(H));
t("loading placeholder keeps its text and is a neutral glass card", /<div class="mc-empty gc-card gc-neutral"><strong>กำลังโหลด Wave 3 Setup…<\/strong><\/div>/.test(H));
t("engine script untouched (wave3-engine.js 20261110-w3-2)", ver(H, "/wave3-engine.js") === "20261110-w3-2");

// ============================================================ 6. CSS: glass wins, tokens on the glass, page-only scope
var CSS = read("wave3.css"), BODY = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
var RULES = (function () {
  var out = [], re = /([^{}]+)\{([^{}]*)\}/g, m;
  while ((m = re.exec(BODY)) !== null) { var p = m[1].trim(); if (p.charAt(0) === "@") continue; out.push({ sel: p.split(",").map(function (s) { return s.trim().replace(/\s+/g, " "); }), body: m[2] }); }
  return out;
})();
function rulesFor(sel) { return RULES.filter(function (r) { return r.sel.indexOf(sel) >= 0; }); }
function decl(rules, prop) { var v = null; rules.forEach(function (r) { var re = new RegExp("(?:^|;)\\s*" + prop.replace(/-/g, "\\-") + "\\s*:\\s*([^;]+)", "g"), m; while ((m = re.exec(r.body)) !== null) v = m[1].trim(); }); return v; }
["w3-hero", "w3-sec", "w3-up-card", "w3-modal", "w3-method"].forEach(function (k) {
  var rs = rulesFor("." + k);
  t("." + k + " no longer paints its own background / border (the glass shows)", rs.length > 0 && decl(rs, "background") == null && decl(rs, "border") == null && decl(rs, "border-radius") == null,
    [decl(rs, "background"), decl(rs, "border"), decl(rs, "border-radius")]);
});
t(".w3-hero keeps its row layout on the flex-column glass card", decl(rulesFor(".w3-hero"), "flex-direction") === "row");
t("text-run cards stay block (method note · loading placeholder · modal)", decl(rulesFor(".w3-method"), "display") === "block" &&
  RULES.some(function (r) { return r.sel.indexOf(".w3-page .mc-empty.gc-card") >= 0 && /display:\s*block/.test(r.body); }));
var glassTok = RULES.filter(function (r) { return r.sel.indexOf(".w3-page .gc-card") >= 0 && r.sel.indexOf(".w3-modal.gc-card") >= 0; });
t("inside a glass card the shared tokens become glass ink (text · text-2 · muted · border · card)",
  decl(glassTok, "--mc-text") === "var(--gc-ink)" && decl(glassTok, "--mc-text-2") === "var(--gc-ink-2)" && decl(glassTok, "--mc-muted") === "var(--gc-ink-2)" &&
  decl(glassTok, "--mc-border") === "var(--gc-line)" && decl(glassTok, "--mc-card") === "var(--gc-well)", glassTok.length);
function lum(hex) {
  var m = /^#([0-9a-f]{6})$/i.exec(hex || ""); if (!m) return -1;
  return [0, 2, 4].map(function (i) { var v = parseInt(m[1].substr(i, 2), 16) / 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); })
    .reduce(function (s, v, i) { return s + v * [0.2126, 0.7152, 0.0722][i]; }, 0);
}
var lifted = ["--w3-a", "--w3-b", "--w3-c", "--w3-d", "--w3-wait", "--mc-red"].map(function (k) { return [k, decl(glassTok, k), Math.round(lum(decl(glassTok, k)) * 1000) / 1000]; });
t("status colours on the glass lifted to luminance ≥ 0.70 (≥ 4.5:1 on every tone)", lifted.every(function (x) { return x[2] >= 0.7; }), lifted);
var page = RULES.filter(function (r) { return r.sel.length === 1 && r.sel[0] === ".w3-page"; });
t("on the page (outside a card) text follows the theme (--app-text / --app-text-2)", decl(page, "--mc-text") === "var(--app-text)" && decl(page, "--mc-muted") === "var(--app-text-2)");
var leak = [];
RULES.forEach(function (r) { r.sel.forEach(function (s) { if (/\.(gc-|mcx-)/.test(s) && !/^\.w3-/.test(s)) leak.push(s); }); });
t("every rule that touches gc-* / mcx-* is scoped to this page (.w3-page … / .w3-modal…)", leak.length === 0, leak);
t("no dot-matrix / LED numeral font", !/doto|dot-?matrix|DSEG|\bLED\b/i.test(CSS));
var focusRows = RULES.filter(function (r) { return r.sel.some(function (s) { return /\.w3-(row|toggle):focus-visible$/.test(s); }); });
t("rows / toggle flush with the card edge draw their focus ring inside (outline-offset negative)", focusRows.length > 0 && /^-\d/.test(decl(focusRows, "outline-offset") || ""), decl(focusRows, "outline-offset"));
t("upcoming cards have a visible focus ring", RULES.some(function (r) { return r.sel.some(function (s) { return /\.w3-up-card:focus-visible$/.test(s); }) && /outline:\s*2px solid/.test(r.body); }));

console.log("wave3-glass-test: " + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
