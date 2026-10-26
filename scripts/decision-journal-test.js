"use strict";
// ============================================================
// DECISION JOURNAL — เทสต์ชั้นเอนจิน (pure · คิดมือ ไม่อ่านค่าจากเอนจิน)
//   node scripts/decision-journal-test.js
//
// สิ่งที่ล็อกไว้:
//   1. สัญลักษณ์ที่พิมพ์เพี้ยน (btc, " nvda ", brk b/) ต้องแปลงได้ผลเดิมเสมอ
//   2. แท่ง as-of ต้องเป็นแท่งที่ "ปิดตลาดแล้วจริง" ตามเวลากรุงเทพของแต่ละตลาด
//   3. เลขวันที่คิดแบบ UTC ไม่ขึ้นกับ timezone ของเครื่อง
//   4. ค่าที่ไม่รู้ต้องเป็น null ห้ามเป็น NaN/undefined/0
// งานถัดไปต่อท้าย section ใหม่ "เหนือ" บรรทัดสรุปท้ายไฟล์ ห้ามเขียนทับ section เดิม
// ============================================================
var fs = require("fs");
var path = require("path");
var E = require("../public/decision-journal-engine.js");

var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; return; }
  fail++;
  console.error("  ✗ " + name + (extra !== undefined ? "  → " + JSON.stringify(extra) : ""));
}
function tNear(name, actual, expected, eps) {
  var ok = actual != null && expected != null && isFinite(actual) && isFinite(expected) &&
    Math.abs(actual - expected) < (eps == null ? 1e-9 : eps);
  t(name, ok, { actual: actual, expected: expected });
}

// ---- fixture helpers (Task 3+) ----
// ตัวคำนวณ EMA/SMA กลางของเว็บ — ใช้ "เทียบ" ค่าที่เอนจินได้เท่านั้น ไม่ใช่เอนจิน
var TI = require("../public/technical-indicators.js");
function rep(v, n) { var a = []; for (var i = 0; i < n; i++) a.push(v); return a; }
function isWeekend(ymd) { var dow = new Date(ymd + "T00:00:00Z").getUTCDay(); return dow === 0 || dow === 6; }
// แท่งต่อเนื่องเฉพาะวันทำการ (จ–ศ) เริ่มที่ startYmd · open = high = close · low = lows[i] หรือ close
function mkBars(startYmd, closes, lows) {
  var out = [], d = startYmd;
  for (var i = 0; i < closes.length; i++) {
    while (isWeekend(d)) d = E.ymdAdd(d, 1);
    var low = (lows && lows[i] != null) ? lows[i] : closes[i];
    out.push({ date: d, open: closes[i], high: closes[i], low: low, close: closes[i], volume: 1000 });
    d = E.ymdAdd(d, 1);
  }
  return out;
}
function lastDate(bars) { return bars[bars.length - 1].date; }
// การตัดครั้งล่าสุดของ EMA12/26 จากตัวคำนวณกลาง ด้วย scan แบบเดียวกับ data-snapshot.js crossDays
// (ขึ้น = prev<= && now> · ลง = prev>= && now<) — เขียนแยกจากเอนจินเพื่อเป็นตัวเทียบ
function expectedCrossAgo(closes) {
  var a = TI.calculateEMA(closes, 12), b = TI.calculateEMA(closes, 26);
  for (var i = closes.length - 1; i > 0; i--) {
    if (a[i] == null || b[i] == null || a[i - 1] == null || b[i - 1] == null) continue;
    if (a[i - 1] <= b[i - 1] && a[i] > b[i]) return closes.length - 1 - i;
    if (a[i - 1] >= b[i - 1] && a[i] < b[i]) return closes.length - 1 - i;
  }
  return null;
}

console.log("== symbols ==");
t("canonical upper/trim", E.canonicalSymbol(" nvda ") === "NVDA");
t("BTC aliases → BTCUSD", ["btc", "BTC-USD", "btcusd"].every(function (s) { return E.canonicalSymbol(s) === "BTCUSD"; }));
t("provider BTCUSD → BTC-USD, others unchanged", E.providerSymbol("BTCUSD") === "BTC-USD" && E.providerSymbol("PTT.BK") === "PTT.BK");
t("strips junk but keeps . ^ -", E.canonicalSymbol("brk b/") === "BRKB" && E.canonicalSymbol("^set.bk") === "^SET.BK");
t("markets", E.marketOf("PTT.BK") === "TH" && E.marketOf("0700.HK") === "ASIA" && E.marketOf("7203.T") === "ASIA" && E.marketOf("BTCUSD") === "CRYPTO" && E.marketOf("ETH-USD") === "CRYPTO" && E.marketOf("NVDA") === "US");
t("currency", E.currencyOf("PTT.BK") === "THB" && E.currencyOf("NVDA") === "USD" && E.currencyOf("BTCUSD") === "USD");
console.log("== closed-bar cutoff (Bangkok wall clock) ==");
t("US 02:00 D+1 → bar D not closed", E.closedBarCutoff("US", "2026-10-25T02:00") === "2026-10-23");
t("US 06:00 D+1 → bar D closed", E.closedBarCutoff("US", "2026-10-25T06:00") === "2026-10-24");
t("TH 10:00 → today's bar not closed", E.closedBarCutoff("TH", "2026-10-25T10:00") === "2026-10-24");
t("TH 18:00 → today's bar closed", E.closedBarCutoff("TH", "2026-10-25T18:00") === "2026-10-25");
t("ASIA same as TH", E.closedBarCutoff("ASIA", "2026-10-25T16:59") === "2026-10-24");
t("CRYPTO 06:30 → yesterday not closed", E.closedBarCutoff("CRYPTO", "2026-10-25T06:30") === "2026-10-23");
t("CRYPTO 07:30 → yesterday closed", E.closedBarCutoff("CRYPTO", "2026-10-25T07:30") === "2026-10-24");
t("month boundary", E.closedBarCutoff("US", "2026-11-01T03:00") === "2026-10-30");
t("bad now → null", E.closedBarCutoff("US", "nope") === null && E.closedBarCutoff("US", null) === null);
console.log("== dates/ids ==");
t("ymdAdd", E.ymdAdd("2026-02-27", 3) === "2026-03-02" && E.ymdAdd("x", 1) === null);
t("daysBetween", E.daysBetween("2026-10-01", "2026-10-10") === 9);
t("newId prefix + unique", /^e_[a-z0-9]{8}$/.test(E.newId("e")) && E.newId("t") !== E.newId("t"));
// แก้ 2026-10-26 (7b-bands · ผู้ใช้ยืนยันแถบใหม่): TOUCH_BAND_PCT 2 → 3 · FLAT_BAND_PCT 1 → 2 (เพิ่มเช็ค FLAT_BAND_PCT ด้วย)
t("constants exported", E.RULES_VERSION === "dj-rules-1" && E.HORIZONS.join() === "7,30,90" && E.DIP_PCT === -20 && E.TOUCH_BAND_PCT === 3 && E.FLAT_BAND_PCT === 2 && E.MAX_STALE_DAYS === 7 && E.FEELINGS.length === 8);

// ============================================================
// Task 3 — แท่ง as-of และ evaluateRules (สเปก §3, §5.2, §5.3)
// ค่าคาดหวังคิดมือทั้งหมด · fixture = วันทำการต่อเนื่องจาก 2025-01-06 (วันจันทร์)
// ============================================================
console.log("== rules: as-of bars ==");
var flat = mkBars("2025-01-06", rep(100, 205));                      // 205 วันทำการ → แท่งสุดท้าย 2025-10-17 (ศุกร์)
var cut = E.asOfBars(flat.concat([{ date: "2026-10-25", close: 50, low: 50 }]), "2026-10-25", "2026-10-25T02:00", "NVDA");
t("US at 02:00: bar dated today excluded and flagged", cut.partialBarDropped === true && cut.bars[cut.bars.length - 1].date !== "2026-10-25", cut.asOfBar);
// แก้ 2026-10-26 (review-2): ชื่อเดิม "weekend record date → last weekday bar" แต่วันบันทึกห่างจากแท่งสุดท้าย ~1 ปี
//   (evaluateRules จะ blocked "stale") จึงไม่ได้ทดสอบกรณีวันหยุดสุดสัปดาห์จริง — กรณีจริงอยู่ที่ 7b9 (ศุกร์ 2025-10-17 → บันทึกอาทิตย์ 2025-10-19)
//   ที่นี่ล็อกแค่ว่า asOfBars เองไม่ตัดแท่งเพราะห่าง (การตัดสิน stale เป็นของ evaluateRules)
t("asOfBars ignores the gap: record date a year after the fixture → as-of is still its last bar (staleness is evaluateRules' job; weekend case: 7b9)", E.asOfBars(flat, "2026-10-25", "2026-10-26T12:00", "NVDA").asOfBar === flat[flat.length - 1].date);
t("asOfBars shape: sorted, staleDays, no partial when nothing dropped", (function () {
  var c = E.asOfBars(flat.slice().reverse(), "2025-10-20", "2025-10-21T12:00", "NVDA");   // ส่งกลับด้าน → ต้องเรียงใหม่
  return c.bars.length === 205 && c.bars[0].date === "2025-01-06" && c.asOfBar === "2025-10-17" && c.staleDays === 3 && c.partialBarDropped === false;
})());
t("asOfBars drops junk bars (bad date / non-finite / zero close)", (function () {
  var c = E.asOfBars([{ date: "2025-01-06", close: 100 }, { date: "nope", close: 100 }, { date: "2025-01-07", close: NaN }, { date: "2025-01-08", close: 0 }, { date: "2025-01-09", close: "101.5" }], "2025-01-10", "2025-01-12T12:00", "NVDA");
  return c.bars.length === 2 && c.bars[1].close === 101.5 && c.bars[1].low === 101.5;   // ไม่มี low → ใช้ close
})());
t("asOfBars with bad now → no bar is known-closed (empty, not a guess)", E.asOfBars(flat, "2025-10-20", "nope", "NVDA").bars.length === 0);
t("stale 9 days → blocked", E.evaluateRules(mkBars("2026-01-05", rep(100, 30)), { date: E.ymdAdd(lastDate(mkBars("2026-01-05", rep(100, 30))), 9), nowBangkok: "2026-12-01T12:00", symbol: "NVDA" }).blocked === "stale");
t("stale 9 days → ok false but facts still reported (page refuses to save)", (function () {
  var b = mkBars("2026-01-05", rep(100, 30));
  var r = E.evaluateRules(b, { date: E.ymdAdd(lastDate(b), 9), nowBangkok: "2026-12-01T12:00", symbol: "NVDA" });
  return r.ok === false && r.asOfBar === lastDate(b) && r.r1.state === "flat" && r.staleSource === false;
})());
t("stale 7 days → not blocked (boundary)", (function () {
  var b = mkBars("2026-01-05", rep(100, 30));
  var r = E.evaluateRules(b, { date: E.ymdAdd(lastDate(b), 7), nowBangkok: "2026-12-01T12:00", symbol: "NVDA" });
  return r.ok === true && r.blocked === null;
})());
t("zero bars → no-bars, all na, ok false", (function () { var r = E.evaluateRules([], { date: "2026-10-01", nowBangkok: "2026-10-25T12:00", symbol: "K-GTECHRMF" }); return r.blocked === "no-bars" && r.r1.state === "na" && r.r2.state === "na" && r.r3.dipMet === null && r.ok === false; })());
t("zero bars → every numeric field null, touchBounce null, conviction echoed", (function () {
  var r = E.evaluateRules(null, { date: "2026-10-01", nowBangkok: "2026-10-25T12:00", symbol: "K-GTECHRMF", conviction: true });
  return r.close === null && r.ema12 === null && r.sma200 === null && r.high1y === null && r.barsUsed === 0 && r.asOfBar === null &&
    r.r2.touchBounce.met === null && r.r3.conviction === true && r.r3.buy === null;
})());

console.log("== rule 1 EMA ==");
var NOW = "2027-01-01T12:00";
function evalFlat(bars, extra) { return E.evaluateRules(bars, Object.assign({ date: lastDate(bars), nowBangkok: NOW, symbol: "NVDA" }, extra || {})); }
var up = mkBars("2025-01-06", rep(100, 40).concat([101, 102, 103, 104, 105, 106, 107, 108]));
var r = evalFlat(up);
t("rising → bull, buy supported, sell not", r.r1.state === "bull" && r.r1.buy === true && r.r1.sell === false, r.r1);
// expected cross index from the shared calculator (prev<= && now>)
t("crossBarsAgo matches plain cross on shared EMA", r.r1.crossDir === "up" && r.r1.crossBarsAgo === expectedCrossAgo(up.map(function (b) { return b.close; })), { got: r.r1.crossBarsAgo, want: expectedCrossAgo(up.map(function (b) { return b.close; })) });
t("hand value: flat 40 then first up bar → cross 7 bars ago", r.r1.crossBarsAgo === 7);   // ตัดที่แท่ง index 40 · as-of index 47
tNear("ema12/ema26 as-of equal the shared calculator", r.ema12, TI.calculateEMA(up.map(function (b) { return b.close; }), 12)[47]);
tNear("ema26 as-of equal the shared calculator", r.ema26, TI.calculateEMA(up.map(function (b) { return b.close; }), 26)[47]);
var down = mkBars("2025-01-06", rep(100, 40).concat([99, 98, 97, 96, 95, 94, 93, 92]));
t("falling → bear, sell supported, cross down 7 bars ago", (function () { var x = evalFlat(down); return x.r1.state === "bear" && x.r1.sell === true && x.r1.buy === false && x.r1.crossDir === "down" && x.r1.crossBarsAgo === 7; })());
t("150 bars → r1 computed but r2 na (not 0)", (function () { var x = evalFlat(mkBars("2025-01-06", rep(100, 150))); return x.r1.state !== "na" && x.r2.state === "na" && x.r2.consecutive === null && x.sma200 === null; })());
t("flat EMAs → state flat, no cross, buy/sell false (not null)", (function () { var x = evalFlat(mkBars("2025-01-06", rep(100, 150))); return x.r1.state === "flat" && x.r1.crossDir === null && x.r1.crossBarsAgo === null && x.r1.buy === false && x.r1.sell === false; })());
t("25 bars → r1 na", evalFlat(mkBars("2026-01-05", rep(100, 25))).r1.state === "na");
t("25 bars → r1 fields null (never 0/false), ema null", (function () { var x = evalFlat(mkBars("2026-01-05", rep(100, 25))); return x.r1.crossBarsAgo === null && x.r1.buy === null && x.r1.sell === null && x.ema12 === null && x.ema26 === null; })());
t("26 bars → r1 computed (boundary)", evalFlat(mkBars("2026-01-05", rep(100, 26))).r1.state === "flat");

console.log("== rule 2 SMA200 ==");
var drop1 = mkBars("2025-01-06", rep(100, 204).concat([90]));
var drop2 = mkBars("2025-01-06", rep(100, 203).concat([90, 90]));
t("below 1 bar → not confirmed", (function () { var x = evalFlat(drop1); return x.r2.state === "below" && x.r2.consecutive === 1 && x.r2.breakConfirmed === false && x.r2.sell === false; })());
t("below 1 bar → cross down on the as-of bar (0 bars ago)", (function () { var x = evalFlat(drop1); return x.r2.crossDir === "down" && x.r2.crossBarsAgo === 0; })());
t("below 2 bars → confirmed sell", (function () { var x = evalFlat(drop2); return x.r2.consecutive === 2 && x.r2.breakConfirmed === true && x.r2.sell === true && x.r2.crossDir === "down" && x.r2.crossBarsAgo === 1; })());
tNear("sma200 hand value (198×100 + 2×90)/200", evalFlat(drop2).sma200, 99.9, 1e-9);
t("200 bars exactly → r2 computed, flat series sits at the line", (function () { var x = evalFlat(mkBars("2025-01-06", rep(100, 200))); return x.r2.state === "at" && x.r2.consecutive === 1 && x.r2.buy === false && x.r2.sell === false; })());
t("199 bars → r2 na", evalFlat(mkBars("2025-01-06", rep(100, 199))).r2.state === "na");
var reclaim = mkBars("2025-01-06", rep(100, 200).concat([95, 95, 95, 95, 95, 101, 101]));
t("reclaim held 2 bars, cross 1 bar ago → buy", (function () { var x = evalFlat(reclaim); return x.r2.state === "above" && x.r2.consecutive === 2 && x.r2.crossDir === "up" && x.r2.crossBarsAgo === 1 && x.r2.reclaimHeld === true && x.r2.buy === true; })());
t("reclaim 1 bar only → not held", (function () { var x = evalFlat(mkBars("2025-01-06", rep(100, 200).concat([95, 95, 95, 95, 95, 101]))); return x.r2.state === "above" && x.r2.consecutive === 1 && x.r2.reclaimHeld === false; })());
// แก้ 2026-10-26 (review-2): fixture เดิม 20 แท่ง @101 (low 101) อยู่ในแถบแตะเอง (touchDate 2025-11-06 · touchSma 100.095)
//   met เป็น false เพียงเพราะ as-of ปิดเท่ากับแท่งแตะ ไม่ใช่ "ไม่มีการแตะ" ตามชื่อ → เปลี่ยนเป็น close 104 / low 103.5
//   sma[200] = (199×100 + 104)/200 = 100.02 → ขอบบน 3% = 103.0206 < 103.5 · sma[219] = (180×100 + 20×104)/200 = 100.4 → ขอบบน 103.412 < 103.5
//   ทุกแท่งในหน้าต่าง (214..218) จึงไม่แตะ → touchDate null · ตัดขึ้นที่ index 200 (100 ≤ 100 แล้ว 104 > 100.02) → 19 แท่งก่อน as-of
var oldReclaim = mkBars("2025-01-06", rep(100, 200).concat(rep(104, 20)), rep(100, 200).concat(rep(103.5, 20)));
t("above for 20 bars, cross 19 bars ago → not reclaimHeld, no touch (lows 103.5 > SMA×1.03) → r2.buy false but state above", (function () { var x = evalFlat(oldReclaim); return x.r2.state === "above" && x.r2.crossBarsAgo === 19 && x.r2.reclaimHeld === false && x.r2.touchBounce.met === false && x.r2.touchBounce.touchDate === null && x.r2.buy === false && x.r2.sell === false; })(), evalFlat(oldReclaim).r2);
t("cross 9 bars ago still counts as reclaim (boundary RECLAIM_MAX_BARS_AGO)", (function () {
  var x = evalFlat(mkBars("2025-01-06", rep(100, 200).concat(rep(101, 10))));   // ตัดขึ้นที่ index 200 · as-of 209 → 9 แท่ง
  return x.r2.crossBarsAgo === 9 && x.r2.reclaimHeld === true;
})());
t("cross 10 bars ago → no longer a reclaim", evalFlat(mkBars("2025-01-06", rep(100, 200).concat(rep(101, 11)))).r2.reclaimHeld === false);
t("an at-bar breaks the streak", (function () {
  // 200 flat (at) → 101 (above) → แท่งที่ปิดเท่า SMA พอดีไม่มีในชุดจริงง่าย ๆ จึงทดสอบผ่าน _internal.trailingState
  var ts = E._internal.trailingState([1, 2, 2, 3, 3], [1, 1, 2, 2, 2]);   // states: at, above, at, above, above
  return ts.state === "above" && ts.consecutive === 2;
})());
// touch & bounce (§3): มีแท่ง t ใน asOf−5…asOf−1 ที่ sma200[t]×0.97 ≤ low[t] ≤ sma200[t]×1.03 และแท่ง as-of close > sma200 และ close > close[t]
// หมายเหตุ fixture: แท่งราบ 200 แท่งมี low = SMA พอดี จึง "แตะ" ตามนิยาม → ต้องคั่นด้วย 5 แท่งที่ low สูงกว่าแถบ 3%
// ก่อนถึงแท่งแตะ ไม่งั้นหน้าต่าง 5 แท่งจะเห็นแท่งราบเป็นการแตะ (ดูเทสต์ "flat bar sitting on its SMA" ด้านล่าง)
// แก้ 2026-10-26 (7b-bands · แถบแตะ ±2% → ±3%): แท่งคั่นเดิม @103 ตกอยู่ในแถบใหม่แล้ว (sma ≈ 100.05 → ขอบบน ≈ 103.05 ≥ 103)
//   จึงย้ายแท่งคั่นเป็น @104.5 (ขอบบนของแท่งคั่นสูงสุด 100.1125×1.03 = 103.116 < 104.5)
var base = rep(100, 200);
var tb = mkBars("2025-01-06", base.concat([104.5, 104.5, 104.5, 104.5, 104.5, 101, 104, 106]), base.concat([104.5, 104.5, 104.5, 104.5, 104.5, 100.5, 104, 106]));
// index 205: low 100.5 · sma = (194×100 + 5×104.5 + 101)/200 = 20023.5/200 = 100.1175 · แถบ [97.114, 103.121] → แตะ
//   index 206: low 104 vs sma (19300 + 522.5 + 101 + 104)/200 = 100.1375 → ขอบบน 103.14 < 104 → ไม่แตะ
//   as-of 207 close 106 > sma (19200 + 522.5 + 101 + 104 + 106)/200 = 100.1675 และ > 101
t("touch within 3% then higher close → met", (function () { var x = evalFlat(tb); return x.r2.touchBounce.met === true && x.r2.touchBounce.touchDate === tb[205].date && x.r2.buy === true; })(), evalFlat(tb).r2.touchBounce);
tNear("touch reports the touch bar's low", evalFlat(tb).r2.touchBounce.touchLow, 100.5);
tNear("touch reports sma200 on the touch bar (194×100 + 5×104.5 + 101)/200 = 100.1175", evalFlat(tb).r2.touchBounce.touchSma, 100.1175, 1e-9);
var noTouch = mkBars("2025-01-06", base.concat([104, 105, 106, 107, 108, 109]), base.concat([103.5, 104.5, 105.5, 106.5, 107.5, 108.5]));
// window 200..204: lows 103.5…107.5 vs ขอบบน 3%: sma[200] = (19900 + 104)/200 = 100.02 → 103.0206 · … · sma[204] = (19500 + 530)/200 = 100.15 → 103.1545 → ไม่แตะ
// แก้ 2026-10-26 (7b-bands): ชื่อเดิม "more than 2%" · fixture เดิมยังใช้ได้ (low 103.5 = 3.48% เหนือ sma 100.02 > 3%)
t("low more than 3% above SMA → not a touch", evalFlat(noTouch).r2.touchBounce.met === false, evalFlat(noTouch).r2.touchBounce);
t("no touch → touchDate/touchLow/touchSma null", (function () { var tbx = evalFlat(noTouch).r2.touchBounce; return tbx.touchDate === null && tbx.touchLow === null && tbx.touchSma === null; })());
var touchNoBounce = mkBars("2025-01-06", base.concat([101, 99, 99]), base.concat([100.5, 98, 98]));
// ตรวจซ้ำ 7b-bands: ไม่ขึ้นกับความกว้างแถบ — as-of ปิด 99 < sma[202] = (19700 + 101 + 99 + 99)/200 = 99.995 → (ค) ไม่ผ่าน
t("touched but as-of closes below SMA → not met", evalFlat(touchNoBounce).r2.touchBounce.met === false);
t("touch older than 5 bars → ignored", (function () { var b = mkBars("2025-01-06", base.concat([101, 104, 105, 106, 107, 108, 109]), base.concat([100.5, 103.5, 104.5, 105.5, 106.5, 107.5, 108.5])); return evalFlat(b).r2.touchBounce.met === false; })());
// index 200 แตะ (low 100.5 ≤ 100.005×1.03 = 103.005) · as-of 206 → หน้าต่าง 201..205 ไม่รวม
//   ตรวจซ้ำ 7b-bands: แท่ง 201 low 103.5 vs sma (19800 + 101 + 104)/200 = 100.025 → ขอบบน 103.026 < 103.5 · แท่งถัดไป low สูงกว่าขอบเสมอ → ไม่แตะ
t("touch exactly 5 bars ago (asOf−5) → still inside the window", (function () {
  var b = mkBars("2025-01-06", base.concat([101, 104, 105, 106, 107, 108]), base.concat([100.5, 103.5, 104.5, 105.5, 106.5, 107.5]));
  var x = evalFlat(b);   // as-of 205 → หน้าต่าง 200..204
  return x.r2.touchBounce.met === true && x.r2.touchBounce.touchDate === b[200].date;
})());
// ข้อเท็จจริงตามนิยาม §3 ที่ fixture ของแผนมองข้าม — ล็อกไว้ตรง ๆ จะได้ไม่เงียบ
t("flat bar sitting on its SMA (low = SMA ≤ band) is a touch by §3", (function () {
  var b = mkBars("2025-01-06", base.concat([104, 105, 106]), base.concat([103.5, 104.5, 105.5]));   // แท่ง 199: low 100 = sma 100
  var x = evalFlat(b);
  return x.r2.touchBounce.met === true && x.r2.touchBounce.touchDate === b[199].date && x.r2.touchBounce.touchLow === 100 && x.r2.touchBounce.touchSma === 100;
})());
// แก้ 2026-10-26 (7b-bands · แถบ ±3%): เดิม "low 1.98% above SMA is still inside the 2% band" (closes 101,102,103,…)
//   fixture เดิมยังผ่านแต่ด้วยเหตุผลอื่น — แท่ง 202 low 103 ≤ 100.03×1.03 = 103.0309 ก็เป็นการแตะไปด้วย จึงไม่ได้เช็คขอบ 3% อีกต่อไป
//   fixture ใหม่: closes 101, 103, 104.5, 105, 106, 107, 108 (low = close ยกเว้นแท่ง 200 low 100.5) · as-of 206 · หน้าต่าง 201..205
//   แท่ง 201: sma = (19800 + 101 + 103)/200 = 100.02 → ขอบบน 103.0206 ≥ low 103 (103/100.02 − 1 = 2.98%) → แตะ
//   แท่ง 202..205: sma 100.0425 / 100.0675 / 100.0975 / 100.1325 → ขอบบน 103.044 / 103.070 / 103.100 / 103.136 < lows 104.5 / 105 / 106 / 107
//   as-of 108 > sma (19300 + 734.5)/200 = 100.1725 และ > 103 · ไม่มีแท่งปิดใต้เส้นก่อน as-of → met · แตะแท่งเดียวคือ 201
t("low 2.98% above SMA is still inside the 3% band", (function () {
  var b = mkBars("2025-01-06", base.concat([101, 103, 104.5, 105, 106, 107, 108]), base.concat([100.5, 103, 104.5, 105, 106, 107, 108]));
  var x = evalFlat(b);
  return x.r2.touchBounce.met === true && x.r2.touchBounce.touchDate === b[201].date && x.r2.touchBounce.touchLow === 103 && Math.abs(x.r2.touchBounce.touchSma - 100.02) < 1e-9;
})());
t("several touches → the deepest (lowest low/SMA) is reported", (function () {
  var b = mkBars("2025-01-06", base.concat([101, 102, 103]), base.concat([100.5, 101.5, 102.5]));   // แตะที่ 199 (1.000), 200 (1.00495), 201 (1.01485)
  var x = evalFlat(b);
  return x.r2.touchBounce.met === true && x.r2.touchBounce.touchDate === b[199].date;
})());
// แก้ 2026-10-26 (7b-bands · แถบ ±3%): เดิม "inclusive at exactly 2%" (low 102 ใน / 102.01 นอก · แท่งคั่น @103 · as-of 105)
//   แท่งคั่น @103 อยู่ในแถบใหม่ (≤ 100×1.03) ทำให้ "outside" กลายเป็นแตะ → ย้ายขอบเป็น low 103 (= 100×1.03) ใน / 103.01 นอก
//   แท่งคั่น @104.5 (> 103) · as-of ปิด 106 > sma 100 และ > close 103 · หน้าต่าง = index 1..5 (แท่ง 0 อยู่นอกหน้าต่าง)
t("_internal.touchBounce: band is inclusive at exactly 3%", (function () {
  var sma = rep(100, 7);
  var mk = function (low, close) { return { date: "d", low: low, close: close }; };
  var inside = E._internal.touchBounce([mk(100, 100), mk(103, 103), mk(104.5, 104.5), mk(104.5, 104.5), mk(104.5, 104.5), mk(104.5, 104.5), mk(106, 106)], sma);
  var outside = E._internal.touchBounce([mk(100, 100), mk(103.01, 103.01), mk(104.5, 104.5), mk(104.5, 104.5), mk(104.5, 104.5), mk(104.5, 104.5), mk(106, 106)], sma);
  return inside.met === true && inside.touchLow === 103 && outside.met === false && outside.touchLow === null;
})());
t("_internal.lastCross: up / down / none", (function () {
  var up1 = E._internal.lastCross([1, 1, 2, 3], [1, 1, 1, 1]);     // prev 1<=1, now 2>1 → up, 1 bar ago
  var dn = E._internal.lastCross([2, 2, 1], [1, 1, 1]);            // prev 2>=1, now 1<1? no… 1<1 false → none
  var dn2 = E._internal.lastCross([2, 1, 0.5], [1, 1, 1]);         // prev 2>=1, now 1<1 false; i=2: prev 1>=1, now 0.5<1 → down, 0 ago
  var none = E._internal.lastCross([1, 1, 1], [1, 1, 1]);
  var gap = E._internal.lastCross([null, 1, 2], [null, null, 1]);  // ไม่มีคู่ที่ครบ → null
  return up1 && up1.dir === "up" && up1.barsAgo === 1 && dn === null && dn2 && dn2.dir === "down" && dn2.barsAgo === 0 && none === null && gap === null;
})());

console.log("== rule 3 dip ==");
var dipExact = mkBars("2025-01-06", rep(100, 100).concat([125]).concat(rep(100, 151)));   // 252 bars, high 125, last 100 → −20.0
t("−20.0 exactly → dipMet", (function () { var x = evalFlat(dipExact, { conviction: true }); return Math.abs(x.r3.dd1yPct - (-20)) < 1e-12 && x.r3.dipMet === true && x.r3.buy === true && x.high1y === 125; })(), evalFlat(dipExact, { conviction: true }).r3);
t("high1yDate is the bar that set the high", evalFlat(dipExact).high1yDate === dipExact[100].date);
t("conviction false → dipMet but not buy", evalFlat(dipExact, { conviction: false }).r3.buy === false);
t("conviction omitted → treated as false, echoed as boolean", (function () { var x = evalFlat(dipExact); return x.r3.conviction === false && x.r3.dipMet === true && x.r3.buy === false; })());
t("−19.92 → not dip (raw, unrounded)", evalFlat(mkBars("2025-01-06", rep(100, 100).concat([125]).concat(rep(100, 150)).concat([100.1]))).r3.dipMet === false);
tNear("−19.92 raw value", evalFlat(mkBars("2025-01-06", rep(100, 100).concat([125]).concat(rep(100, 150)).concat([100.1]))).r3.dd1yPct, -19.92, 1e-9);
t("high outside 252-bar window ignored", (function () { var b = mkBars("2025-01-06", [200].concat(rep(100, 252))); var x = evalFlat(b); return x.high1y === 100 && x.r3.high1yWindowBars === 252; })());
t("fewer than 252 bars → window is what we have, recorded", (function () { var x = evalFlat(mkBars("2025-01-06", rep(100, 30))); return x.high1yWindowBars === 30 && x.r3.high1yWindowBars === 30 && x.high1y === 100 && x.r3.dd1yPct === 0 && x.r3.dipMet === false; })());
t("4 bars → r3 na (null, not 0)", (function () { var x = evalFlat(mkBars("2025-01-06", rep(100, 4))); return x.r3.dd1yPct === null && x.r3.dipMet === null && x.r3.buy === null && x.high1y === null && x.high1yWindowBars === null; })());
t("cross-check: round1(dd1yPct) === ThesisEngine.drawdownPct(closes, 252)", (function () { var TE = require("../public/thesis-engine.js"); var c = dipExact.map(function (b) { return b.close; }); var x = evalFlat(dipExact); return Math.round(x.r3.dd1yPct * 10) / 10 === TE.drawdownPct(c, 252); })());
t("cross-check on a messy series too", (function () {
  var TE = require("../public/thesis-engine.js");
  var closes = []; for (var i = 0; i < 300; i++) closes.push(100 + ((i * 37) % 23) - ((i * 11) % 7) + (i % 5) * 0.37);
  var b = mkBars("2025-01-06", closes); var x = evalFlat(b);
  return Math.round(x.r3.dd1yPct * 10) / 10 === TE.drawdownPct(closes, 252);
})());
t("rules frozen fields present", (function () { var x = evalFlat(up); return x.version === "dj-rules-1" && x.source === "yahoo:/api/ohlc" && typeof x.barsUsed === "number" && E.isYmd(x.asOfBar) && x.partialBarDropped === false; })());
t("no NaN/undefined anywhere in a full rules object", (function () {
  var bad = [];
  function walk(v, p) {
    if (v === undefined || (typeof v === "number" && !isFinite(v))) { bad.push(p); return; }
    if (v && typeof v === "object") for (var k in v) if (Object.prototype.hasOwnProperty.call(v, k)) walk(v[k], p + "." + k);
  }
  walk(evalFlat(tb, { conviction: true }), "rules"); walk(evalFlat(mkBars("2025-01-06", rep(100, 10))), "short"); walk(E.evaluateRules([], { date: "2026-10-01", nowBangkok: "2026-10-25T12:00", symbol: "X" }), "empty");
  return bad.length === 0;
})());

// ============================================================
// Task 4 — verdictFor (สเปก §4) · ตารางครบทุกช่อง รวมเคสของผู้ใช้
//   buy  : supports = r1.buy r2.buy r3.buy · opposes = r1.sell r2.sell
//   sell : supports = r1.sell r2.sell      · opposes = r1.buy r2.buy  (กฎ 3 ไม่เกี่ยวกับการขาย)
//   hold/none/อื่น ๆ : n/a แต่ rulesSay ยังบันทึก · กฎ 1 และ 2 na ทั้งคู่ → unknown
// ============================================================
console.log("== verdict ==");
function R(r1b, r1s, r2b, r2s, r3b, na) { return { r1: { buy: r1b, sell: r1s, state: na ? "na" : (r1b ? "bull" : r1s ? "bear" : "flat") }, r2: { buy: r2b, sell: r2s, state: na ? "na" : "above" }, r3: { buy: r3b, dipMet: r3b } }; }
t("user case: sold on bad news while bull & above → against, opposes r1", (function () { var v = E.verdictFor("sell", R(true,false,false,false,false)); return v.compliance === "against" && v.opposes.join() === "r1" && v.supports.length === 0 && /กฎ 1/.test(v.why); })(), E.verdictFor("sell", R(true,false,false,false,false)));
t("sell after confirmed break → per-rule", E.verdictFor("sell", R(false,true,false,true,false)).compliance === "per-rule");
t("buy on dip with conviction, EMA bear → per-rule (supports r3) and opposes r1 listed", (function () { var v = E.verdictFor("buy", R(false,true,false,false,true)); return v.compliance === "per-rule" && v.supports.join() === "r3" && v.opposes.join() === "r1"; })());
t("buy with nothing supporting → against", E.verdictFor("buy", R(false,false,false,false,false)).compliance === "against");
t("hold → n/a but rulesSay filled", (function () { var v = E.verdictFor("hold", R(true,false,false,false,false)); return v.compliance === "n/a" && v.rulesSay === "buy"; })());
t("rulesSay mixed when both sides supported", E.verdictFor("none", R(true,false,false,true,false)).rulesSay === "mixed");
t("rulesSay none", E.verdictFor("none", R(false,false,false,false,false)).rulesSay === "none");
t("r1 and r2 both na → unknown", E.verdictFor("sell", R(null,null,null,null,false,true)).compliance === "unknown");
t("unknown action kind → n/a", E.verdictFor("wat", R(true,false,false,false,false)).compliance === "n/a");
// ---- เพิ่มจากแผน: ล็อกข้อความและขอบตาราง §4 ----
t("user case why is the §4 sentence verbatim", E.verdictFor("sell", R(true,false,false,false,false)).why === "กฎ 1: EMA12 ยังเหนือ EMA26 · กฎ 2: ยังไม่หลุด SMA200", E.verdictFor("sell", R(true,false,false,false,false)).why);
t("na rule reads ข้อมูลไม่พอ in why", /กฎ 2: ข้อมูลไม่พอ/.test(E.verdictFor("sell", R(null,null,null,null,false,true)).why));
t("sell never lists r3 (buy-only rule) in opposes", (function () { var v = E.verdictFor("sell", R(false,false,false,false,true)); return v.compliance === "against" && v.opposes.length === 0 && v.supports.length === 0 && v.rulesSay === "buy"; })());
t("buy while r1 bull and r2 confirmed break → per-rule, opposes r2, rulesSay mixed", (function () { var v = E.verdictFor("buy", R(true,false,false,true,false)); return v.compliance === "per-rule" && v.supports.join() === "r1" && v.opposes.join() === "r2" && v.rulesSay === "mixed"; })());
t("rulesSay sell when only sell-side rules fire (hold → n/a)", (function () { var v = E.verdictFor("hold", R(false,true,false,true,false)); return v.compliance === "n/a" && v.rulesSay === "sell"; })());
t("hold with na rules → n/a (action not judged) and rulesSay none", (function () { var v = E.verdictFor("hold", R(null,null,null,null,false,true)); return v.compliance === "n/a" && v.rulesSay === "none"; })());
t("only one of r1/r2 na → still judged, not unknown", (function () { var v = E.verdictFor("sell", { r1: { buy: true, sell: false, state: "bull" }, r2: { buy: null, sell: null, state: "na" }, r3: { buy: null } }); return v.compliance === "against" && v.opposes.join() === "r1" && /กฎ 2: ข้อมูลไม่พอ/.test(v.why); })());
t("null / missing rules → unknown, arrays empty, why still a string", (function () { var a = E.verdictFor("buy", null), b = E.verdictFor("sell", {}); return a.compliance === "unknown" && a.supports.length === 0 && a.opposes.length === 0 && a.rulesSay === "none" && typeof a.why === "string" && b.compliance === "unknown"; })());
t("why mentions กฎ 3 for buy, not for sell", /กฎ 3/.test(E.verdictFor("buy", R(false,false,false,false,true)).why) && !/กฎ 3/.test(E.verdictFor("sell", R(false,true,false,false,false)).why));
t("verdict on a real rules object (bull, 48 bars → r2 na) sell → against", (function () { var v = E.verdictFor("sell", evalFlat(up)); return v.compliance === "against" && v.opposes.join() === "r1" && v.supports.length === 0 && /กฎ 2: ข้อมูลไม่พอ/.test(v.why); })());
t("verdict on a real rules object (two closes 90 under SMA200, EMA bear) sell → per-rule r1,r2", (function () { var v = E.verdictFor("sell", evalFlat(drop2)); return v.compliance === "per-rule" && v.supports.join() === "r1,r2" && v.opposes.length === 0; })());
t("verdict on no-bars rules → unknown", E.verdictFor("buy", E.evaluateRules([], { date: "2026-10-01", nowBangkok: "2026-10-25T12:00", symbol: "K-GTECHRMF" })).compliance === "unknown");
t("no advisory wording / NaN / undefined in any verdict", (function () {
  var all = [E.verdictFor("buy", R(true,true,true,true,true)), E.verdictFor("sell", R(true,true,true,true,true)), E.verdictFor("buy", R(null,null,null,null,false,true)), E.verdictFor("none", evalFlat(tb, { conviction: true })), E.verdictFor("buy", evalFlat(dipExact, { conviction: true })), E.verdictFor("buy", evalFlat(drop1))];
  var s = JSON.stringify(all);
  return !/NaN|undefined|Infinity/.test(s) && !/ควรซื้อ|ควรขาย|น่าซื้อ|น่าขาย|แนะนำซื้อ|จุดเข้า|ตัดขาดทุน/.test(s) && !/\b(Buy|Sell)\b/.test(s);
})());

// ============================================================
// Task 5 — ผลจริงภายหลัง (สเปก §5.4) · actualAt / outcomes / reviewDue
//   ค่าคาดหวังคิดมือ: entry 2026-09-01 (NVDA = US) · now 2026-10-25 12:00 → cutoff 2026-10-24 · today 2026-10-25
//   +7 = 2026-09-08 · +30 = 2026-10-01 · +90 = 2026-11-30 (ก.ย. 30 วัน: 29 → ต.ค. 31 → 60 → พ.ย. 30 → 90)
// ============================================================
console.log("== outcomes ==");
function entry(o) { return Object.assign({ id: "e_1", date: "2026-09-01", symbol: "NVDA", view: { direction: "up", horizonDays: 7 }, action: { kind: "buy" }, rules: { asOfBar: "2026-08-31", close: 100 }, review: { reviewedAt: null } }, o); }
var B = [{ date: "2026-08-31", close: 100 }, { date: "2026-09-08", close: 103 }, { date: "2026-10-01", close: 95 }, { date: "2026-10-23", close: 97 }];
var o = E.outcomes(entry(), B, "2026-10-25T12:00");
t("+7 scored +3.0 on 2026-09-08", o.horizons["7"].status === "scored" && o.horizons["7"].date === "2026-09-08" && Math.abs(o.horizons["7"].pct - 3) < 1e-9, o.horizons["7"]);
t("+30 target 2026-10-01 → −5.0", o.horizons["30"].status === "scored" && Math.abs(o.horizons["30"].pct + 5) < 1e-9, o.horizons["30"]);
t("+90 target 2026-11-30 → pending", o.horizons["90"].status === "pending" && o.horizons["90"].target === "2026-11-30", o.horizons["90"]);
t("predicted up at +7 → right; dueDate 2026-09-08", o.predicted === "right" && o.dueDate === "2026-09-08", { predicted: o.predicted, dueDate: o.dueDate });
t("ref from fresh series, basis unchanged", o.refSource === "fresh" && o.refClose === 100 && o.priceBasisChanged === false);
t("sell with horizon 30 → good (price fell)", E.outcomes(entry({ view: { direction: "down", horizonDays: 30 }, action: { kind: "sell" } }), B, "2026-10-25T12:00").actionResult === "good");
t("flat band: +0.5% → flat for both", (function () { var x = E.outcomes(entry(), [{ date: "2026-08-31", close: 100 }, { date: "2026-09-08", close: 100.5 }], "2026-10-25T12:00"); return x.predicted === "flat" && x.actionResult === "flat"; })());
t("unsure → n/a; hold → n/a", (function () { var x = E.outcomes(entry({ view: { direction: "unsure", horizonDays: 7 }, action: { kind: "hold" } }), B, "2026-10-25T12:00"); return x.predicted === "n/a" && x.actionResult === "n/a"; })());
t("gap > 7 days → no-data", E.outcomes(entry(), [{ date: "2026-08-31", close: 100 }, { date: "2026-09-20", close: 110 }], "2026-10-25T12:00").horizons["7"].status === "no-data");
t("weekend target takes prior close within 7 days", (function () { var x = E.outcomes(entry({ date: "2026-09-04" }), [{ date: "2026-08-31", close: 100 }, { date: "2026-09-10", close: 104 }], "2026-10-25T12:00"); return x.horizons["7"].target === "2026-09-11" && x.horizons["7"].date === "2026-09-10"; })());
t("split-adjusted history → ref from fresh series and basis flag", (function () { var x = E.outcomes(entry(), [{ date: "2026-08-31", close: 10 }, { date: "2026-09-08", close: 9.5 }], "2026-10-25T12:00"); return x.refClose === 10 && x.priceBasisChanged === true && Math.abs(x.horizons["7"].pct + 5) < 1e-9; })());
t("as-of bar missing in fresh series → frozen close used", E.outcomes(entry(), [{ date: "2026-09-08", close: 103 }], "2026-10-25T12:00").refSource === "frozen");
// แผนเขียนว่า date === "2026-10-16" ("falls back within 7 days") แต่คิดมือ: cutoff US ตี 2 = 2026-10-23 → แท่ง 10-24 ยังไม่ปิด
// เป้า +7 = 2026-10-24 · แท่งล่าสุดที่ใช้ได้ = 2026-10-16 · ห่าง 24−16 = 8 วัน > MAX_GAP_DAYS 7 → actualAt คืน null → no-data
// ค่าที่ถูกคือ no-data และ date null (แท่งที่ยังไม่ปิดก็ยังไม่ถูกใช้เหมือนเดิม) — ส่วน "ถอยกลับภายใน 7 วัน" ล็อกในเทสต์ถัดไป
// แก้ 2026-10-26 (Task 7b-B ข้อ 2 · review-1 #2): เดิมคาด no-data · ตอนนี้ช่วงเป็น pending จนแท่งของวันเป้าหมายปิด
//   cutoff US ตี 2 ของ 10-25 = 10-23 < เป้า 10-24 → pending · date/close/pct ยัง null · แท่ง 10-24 ยังไม่ถูกใช้เหมือนเดิม
t("unclosed bar never used as actual (US at 02:00)", (function () { var x = E.outcomes(entry({ date: "2026-10-17" }), [{ date: "2026-10-16", close: 100 }, { date: "2026-10-24", close: 120 }], "2026-10-25T02:00"); return x.horizons["7"].status === "pending" && x.horizons["7"].date === null && x.horizons["7"].close === null && x.horizons["7"].pct === null && x.lastClosedBar === "2026-10-16"; })(), E.outcomes(entry({ date: "2026-10-17" }), [{ date: "2026-10-16", close: 100 }, { date: "2026-10-24", close: 120 }], "2026-10-25T02:00").horizons["7"]);
// เป้า 2026-10-24 ยังไม่ปิด → ถอยไป 2026-10-19 (ห่าง 5 วัน ≤ 7) · ถ้าเอนจินไม่กรอง cutoff จะได้ 10-24 ราคา 120
// แก้ 2026-10-26 (Task 7b-B ข้อ 2 · review-1 #2): เดิมคาด scored จากแท่ง 10-19 (คะแนนชั่วคราวที่ตัวเลขจะเปลี่ยนเมื่อแท่ง 10-24 ปิด)
//   ตอนนี้ cutoff 10-23 < เป้า 10-24 → pending ไม่ถอยไปใช้แท่งก่อนหน้า · lastClosedBar ยังเป็น 10-19
t("unclosed target bar → pending (no provisional score from an earlier bar)", (function () { var x = E.outcomes(entry({ date: "2026-10-17" }), [{ date: "2026-10-19", close: 100 }, { date: "2026-10-24", close: 120 }], "2026-10-25T02:00"); return x.horizons["7"].status === "pending" && x.horizons["7"].date === null && x.horizons["7"].close === null && x.horizons["7"].pct === null && x.predicted === "pending" && x.actionResult === "pending" && x.lastClosedBar === "2026-10-19"; })());
t("same bars at 06:00 → bar 2026-10-24 is closed and used", (function () { var x = E.outcomes(entry({ date: "2026-10-17" }), [{ date: "2026-10-19", close: 100 }, { date: "2026-10-24", close: 120 }], "2026-10-25T06:00"); return x.horizons["7"].date === "2026-10-24" && x.horizons["7"].close === 120 && x.lastClosedBar === "2026-10-24"; })());
t("reviewDue only after own horizon and when unreviewed", E.reviewDue(entry(), o) === true && E.reviewDue(entry({ view: { direction: "up", horizonDays: 90 } }), E.outcomes(entry({ view: { direction: "up", horizonDays: 90 } }), B, "2026-10-25T12:00")) === false && E.reviewDue(entry({ review: { reviewedAt: "2026-10-01T00:00:00Z" } }), o) === false);
t("no NaN/undefined in outcome", !/NaN|undefined|Infinity/.test(JSON.stringify(o)), o);
// ---- เพิ่มจากแผน: รูปร่าง · ขอบแถบ flat · actualAt ตรง ๆ · ข้อมูลเข้าเพี้ยน ----
t("outcome shape: three horizons, each with target/status/date/close/pct; lastClosedBar is the last usable closed bar", (function () {
  var keys = Object.keys(o.horizons).sort().join();
  var h30 = o.horizons["30"];
  return keys === "30,7,90" && h30.target === "2026-10-01" && h30.date === "2026-10-01" && h30.close === 95 && o.lastClosedBar === "2026-10-23";
})(), o);
t("pending horizon carries target but null date/close/pct", (function () { var h = o.horizons["90"]; return h.date === null && h.close === null && h.pct === null; })());
t("predicted/actionResult follow the OWN horizon (90 pending → pending, 30 scored → judged)", (function () {
  var p = E.outcomes(entry({ view: { direction: "up", horizonDays: 90 } }), B, "2026-10-25T12:00");
  var q = E.outcomes(entry({ view: { direction: "up", horizonDays: 30 } }), B, "2026-10-25T12:00");
  return p.predicted === "pending" && p.actionResult === "pending" && p.dueDate === "2026-11-30" && q.predicted === "wrong" && q.actionResult === "bad" && q.dueDate === "2026-10-01";
})());
t("own horizon no-data → predicted/actionResult no-data", (function () { var x = E.outcomes(entry(), [{ date: "2026-08-31", close: 100 }, { date: "2026-09-20", close: 110 }], "2026-10-25T12:00"); return x.predicted === "no-data" && x.actionResult === "no-data"; })());
// แก้ 2026-10-26 (7b-bands · แถบทรงตัว ±1% → ±2%): เดิม "exactly +1.0% is flat, +1.01% is right/good" (101 / 101.01)
//   ตอนนี้ (102 − 100)×100/100 = 2 พอดี → flat · (102.01 − 100)×100/100 = 2.010000000000005 > 2 → up ถูก · buy ดี
t("band edge: exactly +2.0% is flat, +2.01% is right/good", (function () {
  var a = E.outcomes(entry(), [{ date: "2026-08-31", close: 100 }, { date: "2026-09-08", close: 102 }], "2026-10-25T12:00");
  var b = E.outcomes(entry(), [{ date: "2026-08-31", close: 100 }, { date: "2026-09-08", close: 102.01 }], "2026-10-25T12:00");
  return a.horizons["7"].pct === 2 && a.predicted === "flat" && a.actionResult === "flat" && b.predicted === "right" && b.actionResult === "good";
})());
t("down view: price up → wrong; buy action: price down beyond band → bad", (function () {
  var x = E.outcomes(entry({ view: { direction: "down", horizonDays: 7 } }), B, "2026-10-25T12:00");                       // +3 → down wrong, buy good
  var y = E.outcomes(entry({ view: { direction: "up", horizonDays: 30 }, action: { kind: "buy" } }), B, "2026-10-25T12:00");   // −5 → up wrong, buy bad
  var z = E.outcomes(entry({ view: { direction: "up", horizonDays: 7 }, action: { kind: "sell" } }), B, "2026-10-25T12:00");   // +3 → sell bad
  return x.predicted === "wrong" && x.actionResult === "good" && y.predicted === "wrong" && y.actionResult === "bad" && z.actionResult === "bad";
})());
t("none action → n/a; unknown action kind → n/a", E.outcomes(entry({ action: { kind: "none" } }), B, "2026-10-25T12:00").actionResult === "n/a" && E.outcomes(entry({ action: { kind: "wat" } }), B, "2026-10-25T12:00").actionResult === "n/a");
t("basis tolerance: +0.5% exactly is unchanged, +0.51% is changed", (function () {
  var a = E.outcomes(entry(), [{ date: "2026-08-31", close: 100.5 }], "2026-10-25T12:00");
  var b = E.outcomes(entry(), [{ date: "2026-08-31", close: 100.51 }], "2026-10-25T12:00");
  return a.priceBasisChanged === false && b.priceBasisChanged === true && a.refSource === "fresh";
})());
t("pct is measured from the fresh ref, not the frozen close (split case: 9.5 vs 10 → −5, not −90.5)", Math.abs(E.outcomes(entry(), [{ date: "2026-08-31", close: 10 }, { date: "2026-09-08", close: 9.5 }], "2026-10-25T12:00").horizons["7"].pct + 5) < 1e-9);
t("no fresh bar and no frozen close → ref null, horizons no-data (never NaN)", (function () {
  var x = E.outcomes(entry({ rules: { asOfBar: "2026-08-31", close: null } }), [{ date: "2026-09-08", close: 103 }], "2026-10-25T12:00");
  return x.refClose === null && x.refSource === null && x.priceBasisChanged === false && x.horizons["7"].status === "no-data" && x.horizons["7"].pct === null && !/NaN|undefined|Infinity/.test(JSON.stringify(x));
})());
// แก้ 2026-10-26 (Task 7b-B ข้อ 2 · review-1 #2): เดิมคาดว่า 10:00 ให้คะแนนจากแท่ง 10-22 ไปก่อน
//   cutoff TH 10:00 ของ 10-23 = 10-22 < เป้า +7 = 10-23 → pending (date null) · 18:00 → cutoff 10-23 → scored จากแท่ง 10-23
t("TH symbol uses the TH cutoff (10:00 → today's bar not closed → pending; 18:00 → scored)", (function () {
  var x = E.outcomes(entry({ symbol: "PTT.BK", date: "2026-10-16" }), [{ date: "2026-10-22", close: 30 }, { date: "2026-10-23", close: 33 }], "2026-10-23T10:00");
  var y = E.outcomes(entry({ symbol: "PTT.BK", date: "2026-10-16" }), [{ date: "2026-10-22", close: 30 }, { date: "2026-10-23", close: 33 }], "2026-10-23T18:00");
  return x.horizons["7"].status === "pending" && x.horizons["7"].date === null && x.lastClosedBar === "2026-10-22" && y.horizons["7"].status === "scored" && y.horizons["7"].date === "2026-10-23";
})());
// แก้ 2026-10-26 (Task 7b-B ข้อ 2): เดิมคาด no-data ทุกช่วง · สัญญาใหม่ "pending ขณะ cutoff === null || target > cutoff"
//   now เพี้ยน → cutoff null → ไม่รู้ว่าแท่งเป้าหมายปิดหรือยัง → pending ทุกช่วง (ไม่ตัดสิน ไม่ถึงกำหนดทบทวน)
t("bad now → nothing is known-closed: pending everywhere, lastClosedBar null, not due, no throw", (function () {
  var x = E.outcomes(entry(), B, "nope");
  return x.horizons["7"].status === "pending" && x.horizons["30"].status === "pending" && x.horizons["90"].status === "pending" && x.horizons["7"].date === null && x.lastClosedBar === null && x.refSource === "frozen" && E.reviewDue(entry(), x) === false && !/NaN|undefined|Infinity/.test(JSON.stringify(x));
})());
t("junk bars ignored (bad date / NaN / zero close); duplicate date → later wins", (function () {
  var x = E.outcomes(entry(), [{ date: "2026-08-31", close: 100 }, { date: "nope", close: 1 }, { date: "2026-09-08", close: NaN }, { date: "2026-09-08", close: 0 }, { date: "2026-09-07", close: 102 }, { date: "2026-09-07", close: "104" }], "2026-10-25T12:00");
  return x.horizons["7"].date === "2026-09-07" && x.horizons["7"].close === 104 && Math.abs(x.horizons["7"].pct - 4) < 1e-9;
})());
t("null entry / null bars → safe nulls, no throw", (function () {
  var x = E.outcomes(null, null, "2026-10-25T12:00");
  return x.refClose === null && x.horizons["7"].target === null && x.horizons["7"].status === "no-data" && x.predicted === "n/a" && x.actionResult === "n/a" && x.dueDate === null && E.reviewDue(null, x) === false;
})());
t("actualAt: latest bar ≤ target, gap ≤ 7, default gap = MAX_GAP_DAYS", (function () {
  var a = E.actualAt(B, "2026-09-30");          // ล่าสุด ≤ 09-30 คือ 09-08 ห่าง 22 วัน → null
  var b = E.actualAt(B, "2026-09-10");          // 09-08 ห่าง 2 → ใช้ได้
  var c = E.actualAt(B, "2026-09-15");          // 09-08 ห่าง 7 → ขอบ ใช้ได้
  var d = E.actualAt(B, "2026-09-16");          // ห่าง 8 → null
  var e2 = E.actualAt(B, "2026-09-30", 30);     // ขยาย gap → ได้ 09-08
  return a === null && b && b.date === "2026-09-08" && b.close === 103 && c && c.date === "2026-09-08" && d === null && e2 && e2.date === "2026-09-08";
})());
t("actualAt: before first bar / bad target / junk → null", E.actualAt(B, "2026-08-01") === null && E.actualAt(B, "nope") === null && E.actualAt(null, "2026-09-08") === null && E.actualAt([{ date: "2026-09-08", close: -1 }], "2026-09-08") === null);
t("actualAt does not apply the closed-bar cutoff itself (outcomes does)", (function () { var a = E.actualAt([{ date: "2026-10-24", close: 120 }], "2026-10-24"); return a && a.date === "2026-10-24"; })());
t("reviewDue: no-data at own horizon counts as due; missing review object → unreviewed", (function () {
  var nd = E.outcomes(entry(), [{ date: "2026-08-31", close: 100 }, { date: "2026-09-20", close: 110 }], "2026-10-25T12:00");
  var e = entry(); delete e.review;
  return E.reviewDue(entry(), nd) === true && E.reviewDue(e, o) === true && E.reviewDue(entry({ review: { reviewedAt: "" } }), o) === true;
})());
t("reviewDue: horizon not in outcome → never due", E.reviewDue(entry({ view: { direction: "up", horizonDays: 14 } }), o) === false);

// ============================================================
// Task 6 — ไม้จริง FIFO และซื้อกลับ (สเปก §5.5 · §5.4 ย่อหน้าท้าย)
//   ค่าคาดหวังคิดมือ: ขาย 15@130 ค่าธรรมเนียม 10 จับล็อต 10@100 แล้วต่อด้วย 5@120
//     กำไร = (130−100)×10 + (130−120)×5 − 10 = 300 + 50 − 10 = 340 · ฐานทุนที่จับ = 1000 + 600 = 1600 → 21.25%
//     ล็อตเหลือ 5@120 · ราคาปิดล่าสุด 110 → ลอยตัว 110×5 − 600 = −50
//   ขายเกิน: ขาย 20@100 เหลือจับได้แค่ 5@120 → (100−120)×5 = −100 · จับได้ 5 · ติดป้ายเตือน
//   BTC เศษทศนิยม: (90000−80000)×0.0123 − ค่าธรรมเนียมขาย 3 − ค่าธรรมเนียมซื้อ 2×(0.0123/0.0123) = 10000×0.0123 − 5
//   ซื้อกลับ: ขาย 130 แล้วซื้อ 140 → +10 ต่อหน่วย · (140−130)×100/130 = 7.6923…%
// ============================================================
console.log("== trades ==");
function tr(o) { return Object.assign({ id: E.newId("t"), createdAt: "2026-01-01T00:00:00Z", deletedAt: null, fee: 0, currency: null }, o); }
var T = [tr({ id: "t1", date: "2026-01-05", symbol: "NVDA", side: "buy", qty: 10, price: 100 }), tr({ id: "t2", date: "2026-02-01", symbol: "NVDA", side: "buy", qty: 10, price: 120 }), tr({ id: "t3", date: "2026-03-01", symbol: "NVDA", side: "sell", qty: 15, price: 130, fee: 10 })];
var f = E.fifo(T, { NVDA: { close: 110, date: "2026-10-24", closed: true } });
t("FIFO matches 10@100 + 5@120: pnl 340", f.realized.length === 1 && f.realized[0].matchedQty === 15 && Math.abs(f.realized[0].pnl - 340) < 1e-9 && f.realized[0].currency === "USD", f.realized);
tNear("pnlPct = 340 / (1000+600)", f.realized[0].pnlPct, 340 / 1600 * 100, 1e-9);
t("open lot 5@120, floating −50", f.open.length === 1 && f.open[0].qty === 5 && f.open[0].avgCost === 120 && Math.abs(f.open[0].floating + 50) < 1e-9 && f.open[0].lastBarClosed === true, f.open);
t("totals per currency", Math.abs(f.totals.USD.realized - 340) < 1e-9 && Math.abs(f.totals.USD.floating + 50) < 1e-9 && !f.totals.THB, f.totals);
t("oversell flagged, pnl on matched only", (function () { var x = E.fifo(T.concat([tr({ id: "t4", date: "2026-04-01", symbol: "NVDA", side: "sell", qty: 20, price: 100 })]), {}); var r = x.realized[1]; return r.oversell === true && r.matchedQty === 5 && Math.abs(r.pnl - (-100)) < 1e-9 && x.warnings.length === 1 && /ขายมากกว่าที่บันทึกซื้อไว้/.test(x.warnings[0]); })());
t("fractional BTC qty and buy-side fee", (function () { var x = E.fifo([tr({ id: "b1", date: "2026-01-05", symbol: "BTCUSD", side: "buy", qty: 0.0123, price: 80000, fee: 2 }), tr({ id: "s1", date: "2026-02-05", symbol: "BTCUSD", side: "sell", qty: 0.0123, price: 90000, fee: 3 })], {}); return Math.abs(x.realized[0].pnl - (10000 * 0.0123 - 3 - 2)) < 1e-9; })());
t("THB by symbol, currency override respected", (function () { var x = E.fifo([tr({ id: "p1", date: "2026-01-05", symbol: "PTT.BK", side: "buy", qty: 100, price: 40 }), tr({ id: "u1", date: "2026-01-05", symbol: "AAPL", side: "buy", qty: 1, price: 1, currency: "THB" })], {}); return x.open[0].currency === "THB" && x.open[1].currency === "THB"; })());
t("deleted trades ignored; no last close → floating null", (function () { var x = E.fifo([tr({ id: "d1", date: "2026-01-05", symbol: "NVDA", side: "buy", qty: 1, price: 1, deletedAt: "2026-01-06T00:00:00Z" }), tr({ id: "k1", date: "2026-01-05", symbol: "AMD", side: "buy", qty: 1, price: 1 })], {}); return x.open.length === 1 && x.open[0].symbol === "AMD" && x.open[0].floating === null; })());
t("buy-back: sold 130 then bought 140 → +7.7%", (function () { var e = { action: { kind: "sell", tradeIds: ["t3", "t5"] }, symbol: "NVDA" }; var x = E.buyBack(e, T.concat([tr({ id: "t5", date: "2026-03-10", symbol: "NVDA", side: "buy", qty: 15, price: 140 })])); return x && x.diffPerUnit === 10 && Math.abs(x.diffPct - 7.6923076923) < 1e-6; })());
t("buy-back null when no later buy", E.buyBack({ action: { kind: "sell", tradeIds: ["t3"] }, symbol: "NVDA" }, T) === null);
t("no NaN in fifo output", !/NaN|undefined|Infinity/.test(JSON.stringify(f)), f);
// ---- เพิ่มจากแผน: รูปร่าง · ลำดับ · ค่าธรรมเนียม · เศษทศนิยม · สกุล · ข้อมูลเพี้ยน · ซื้อกลับขอบเคส ----
t("realized/open shape (ids, dates, raw qty, cost, lastClose/lastDate, floatingPct = −50/600)", (function () {
  var r = f.realized[0], p = f.open[0];
  return r.tradeId === "t3" && r.symbol === "NVDA" && r.date === "2026-03-01" && r.qty === 15 && r.oversell === false &&
    p.symbol === "NVDA" && p.cost === 600 && p.currency === "USD" && p.lastClose === 110 && p.lastDate === "2026-10-24" &&
    Math.abs(p.floatingPct - (-50 / 600 * 100)) < 1e-9;
})(), f);
t("fifo does not mutate its input", (function () { var before = JSON.stringify(T); E.fifo(T, { NVDA: { close: 1, date: "2026-10-24", closed: true } }); return JSON.stringify(T) === before; })());
// ซื้อ 10@100 ค่าธรรมเนียม 10 (1 ต่อหน่วย) · ขาย 4@110 ค่าธรรมเนียม 2 → 40 − 2 − 4 = 34 (8.5% ของ 400)
// ขาย 6@120 ค่าธรรมเนียม 3 → 120 − 3 − 6 = 111 (18.5% ของ 600) · รวม 145 · ไม่เหลือล็อต → ลอยตัวรวม 0
t("sell fee charged once in full; lot fee pro-rated across two sells; nothing left open", (function () {
  var x = E.fifo([tr({ id: "a", date: "2026-01-05", symbol: "NVDA", side: "buy", qty: 10, price: 100, fee: 10 }), tr({ id: "b", date: "2026-01-06", symbol: "NVDA", side: "sell", qty: 4, price: 110, fee: 2 }), tr({ id: "c", date: "2026-01-07", symbol: "NVDA", side: "sell", qty: 6, price: 120, fee: 3 })], {});
  return x.realized.length === 2 && Math.abs(x.realized[0].pnl - 34) < 1e-9 && Math.abs(x.realized[0].pnlPct - 8.5) < 1e-9 &&
    Math.abs(x.realized[1].pnl - 111) < 1e-9 && Math.abs(x.realized[1].pnlPct - 18.5) < 1e-9 &&
    x.open.length === 0 && Math.abs(x.totals.USD.realized - 145) < 1e-9 && x.totals.USD.floating === 0 && x.warnings.length === 0;
})());
// เลขทศนิยมลอย: 0.0157 − 0.0057 = 0.009999999999999998 → ขาย 0.01 เหลือ −1.7e-18 (ถ้าไม่มี QTY_EPS จะติด "ขายเกิน" ปลอม)
//               0.021 − 0.007 = 0.014000000000000002 → ขาย 0.014 เหลือ +1.7e-18 (ถ้าไม่มี QTY_EPS จะเหลือล็อตผี)
// (0.0123 − 0.01 − 0.0023 ได้ 0 พอดีโดยบังเอิญ จึงใช้ไม่ได้เป็นตัวจับ)
t("fractional: 0.0157 − 0.0057 − 0.01 closes the lot exactly (no phantom oversell)", (function () {
  var x = E.fifo([tr({ id: "b1", date: "2026-01-05", symbol: "BTCUSD", side: "buy", qty: 0.0157, price: 80000 }), tr({ id: "s1", date: "2026-01-06", symbol: "BTCUSD", side: "sell", qty: 0.0057, price: 90000 }), tr({ id: "s2", date: "2026-01-07", symbol: "BTCUSD", side: "sell", qty: 0.01, price: 90000 })], {});
  return x.realized.length === 2 && x.realized[1].oversell === false && x.realized[1].matchedQty === 0.01 && Math.abs(x.realized[1].pnl - 100) < 1e-9 &&
    x.open.length === 0 && x.warnings.length === 0 && Math.abs(x.totals.USD.realized - 157) < 1e-9;
})());
t("fractional: 0.021 − 0.007 − 0.014 leaves no phantom residual lot", (function () {
  var x = E.fifo([tr({ id: "b1", date: "2026-01-05", symbol: "BTCUSD", side: "buy", qty: 0.021, price: 80000 }), tr({ id: "s1", date: "2026-01-06", symbol: "BTCUSD", side: "sell", qty: 0.007, price: 90000 }), tr({ id: "s2", date: "2026-01-07", symbol: "BTCUSD", side: "sell", qty: 0.014, price: 90000 })], {});
  return x.realized.length === 2 && x.realized[1].oversell === false && x.realized[1].matchedQty === 0.014 && x.open.length === 0 &&
    x.warnings.length === 0 && Math.abs(x.totals.USD.realized - 210) < 1e-9 && x.totals.USD.floating === 0;
})());
// ล็อต A (สร้าง 10:00 ราคา 100) ถูกใส่มาก่อน B (สร้าง 09:00 ราคา 200) วันเดียวกัน → B ต้องถูกขายก่อน → กำไร 300−200 = 100
t("order is (date, createdAt), not input order; a sell listed first still finds its lot", (function () {
  var A = tr({ id: "A", date: "2026-01-05", createdAt: "2026-01-05T10:00:00Z", symbol: "NVDA", side: "buy", qty: 1, price: 100 });
  var Bq = tr({ id: "B", date: "2026-01-05", createdAt: "2026-01-05T09:00:00Z", symbol: "NVDA", side: "buy", qty: 1, price: 200 });
  var S = tr({ id: "S", date: "2026-01-06", symbol: "NVDA", side: "sell", qty: 1, price: 300 });
  var x = E.fifo([A, Bq, S], {}), y = E.fifo([S, A, Bq], {});
  return Math.abs(x.realized[0].pnl - 100) < 1e-9 && x.open[0].avgCost === 100 && Math.abs(y.realized[0].pnl - 100) < 1e-9 && y.warnings.length === 0;
})());
t("two symbols: realized chronological across symbols, open sorted by symbol, floating total unknown without prices", (function () {
  var x = E.fifo([tr({ id: "n1", date: "2026-01-05", symbol: "NVDA", side: "buy", qty: 10, price: 100 }), tr({ id: "m1", date: "2026-01-10", symbol: "AMD", side: "buy", qty: 10, price: 50 }), tr({ id: "n2", date: "2026-02-01", symbol: "NVDA", side: "sell", qty: 4, price: 130 }), tr({ id: "m2", date: "2026-01-20", symbol: "AMD", side: "sell", qty: 3, price: 60 })], {});
  return x.realized.length === 2 && x.realized[0].tradeId === "m2" && Math.abs(x.realized[0].pnl - 30) < 1e-9 && x.realized[1].tradeId === "n2" && Math.abs(x.realized[1].pnl - 120) < 1e-9 &&
    x.open.length === 2 && x.open[0].symbol === "AMD" && x.open[0].qty === 7 && x.open[1].symbol === "NVDA" && x.open[1].qty === 6 &&
    Math.abs(x.totals.USD.realized - 150) < 1e-9 && x.totals.USD.floating === null;
})());
t("floating total: null while any open position has no price, a number once all do", (function () {
  var L = [tr({ id: "n1", date: "2026-01-05", symbol: "NVDA", side: "buy", qty: 1, price: 100 }), tr({ id: "m1", date: "2026-01-05", symbol: "AMD", side: "buy", qty: 1, price: 50 })];
  var part = E.fifo(L, { NVDA: { close: 110, date: "2026-10-24", closed: true } });
  var full = E.fifo(L, { NVDA: { close: 110, date: "2026-10-24", closed: true }, AMD: { close: 55, date: "2026-10-24", closed: true } });
  return part.totals.USD.floating === null && Math.abs(full.totals.USD.floating - 15) < 1e-9;
})());
t("last bar not closed → lastBarClosed false but floating still computed; junk close → all last* null", (function () {
  var open1 = E.fifo(T, { NVDA: { close: 110, date: "2026-10-24", closed: false } }).open[0];
  var open2 = E.fifo(T, { NVDA: { close: NaN, date: "2026-10-24", closed: true } }).open[0];
  var open3 = E.fifo(T, { NVDA: { close: 0, date: "2026-10-24", closed: true } }).open[0];
  return open1.lastBarClosed === false && Math.abs(open1.floating + 50) < 1e-9 &&
    open2.lastClose === null && open2.lastDate === null && open2.lastBarClosed === null && open2.floating === null && open2.floatingPct === null &&
    open3.floating === null;
})());
// ไม่มีล็อตให้จับเลย: ส่วนที่จับได้ = 0 · pnlPct ไม่มีฐานทุน → null
// แก้ 2026-10-26 (Task 7b-B ข้อ 6 · สเปก §5.5 · review-1 #9): เดิมคาดกำไร = −ค่าธรรมเนียมขายเต็ม 7
//   ตอนนี้ค่าธรรมเนียมขายคิดตามสัดส่วนที่จับได้: 7 × 0/5 = 0 → กำไร 0 − 0 = 0 · ยอดรวมที่รับรู้ 0
t("sell with nothing to match: matchedQty 0, pnl = −sellFee × 0/qty = 0, pnlPct null, oversell warned", (function () {
  var x = E.fifo([tr({ id: "s0", date: "2026-01-05", symbol: "NVDA", side: "sell", qty: 5, price: 100, fee: 7 })], {});
  var r = x.realized[0];
  return r.matchedQty === 0 && r.oversell === true && Math.abs(r.pnl) < 1e-9 && r.pnlPct === null && x.open.length === 0 &&
    x.warnings.length === 1 && /NVDA/.test(x.warnings[0]) && /2026-01-05/.test(x.warnings[0]) && Math.abs(x.totals.USD.realized) < 1e-9 && x.totals.USD.floating === 0;
})(), E.fifo([tr({ id: "s0", date: "2026-01-05", symbol: "NVDA", side: "sell", qty: 5, price: 100, fee: 7 })], {}));
t("malformed trades (NaN qty / unknown side / no symbol / bad date) are skipped with a warning each; string qty from a form still counts", (function () {
  var x = E.fifo([
    tr({ id: "m1", date: "2026-01-05", symbol: "NVDA", side: "buy", qty: NaN, price: 100 }),
    tr({ id: "m2", date: "2026-01-05", symbol: "NVDA", side: "wat", qty: 1, price: 100 }),
    tr({ id: "m3", date: "2026-01-05", symbol: "", side: "buy", qty: 1, price: 100 }),
    tr({ id: "m4", date: "nope", symbol: "NVDA", side: "buy", qty: 1, price: 100 }),
    tr({ id: "g1", date: "2026-01-06", symbol: " nvda ", side: "buy", qty: 1, price: 100 }),
    tr({ id: "g2", date: "2026-01-07", symbol: "NVDA", side: "buy", qty: "2", price: "110" })
  ], {});
  return x.open.length === 1 && x.open[0].symbol === "NVDA" && x.open[0].qty === 3 && Math.abs(x.open[0].cost - 320) < 1e-9 &&
    x.warnings.length === 4 && x.realized.length === 0 && !/NaN|undefined|Infinity/.test(JSON.stringify(x));
})());
// แก้ 2026-10-26 (Task 7b-B ข้อ 6 · สเปก §5.5 · review-1 #4): เดิมไม้ขาย THB จับล็อต USD ได้ (กำไร 20 "THB" ข้ามสกุล)
//   และล็อตสองสกุลรวมกันเป็น 2 หน่วย · ตอนนี้หนึ่งสัญลักษณ์มีสกุลเดียว = สกุลของไม้แรกที่ใช้ได้ · ไม้สกุลอื่นไม่นำมาคิด + เตือน
//   x: ซื้อ 2 @100 USD → ขาย 1 THB ถูกข้าม → ไม่มีกำไรที่รับรู้ · ไม่มี totals.THB · ล็อต 2 USD ยังเปิดอยู่
//   y: ซื้อ AAPL THB ก่อน → ไม้ซื้อ USD วันถัดไปถูกข้าม → เปิด 1 หน่วย THB
t("currency: one currency per symbol (first valid trade); a trade in another currency is skipped with a warning", (function () {
  var x = E.fifo([tr({ id: "a", date: "2026-01-05", symbol: "NVDA", side: "buy", qty: 2, price: 100 }), tr({ id: "b", date: "2026-01-06", symbol: "NVDA", side: "sell", qty: 1, price: 120, currency: "THB" })], {});
  var y = E.fifo([tr({ id: "c", date: "2026-01-05", symbol: "AAPL", side: "buy", qty: 1, price: 10, currency: "THB" }), tr({ id: "d", date: "2026-01-06", symbol: "AAPL", side: "buy", qty: 1, price: 10 })], {});
  return x.realized.length === 0 && !x.totals.THB && x.open.length === 1 && x.open[0].currency === "USD" && x.open[0].qty === 2 &&
    x.warnings.length === 1 && x.warnings[0] === "NVDA: สกุลเงินไม่ตรงกับไม้ก่อนหน้า ไม่ได้นำมาคิด (ไม้ 2026-01-06)" &&
    y.open.length === 1 && y.open[0].currency === "THB" && y.open[0].qty === 1 && y.warnings.length === 1 && y.warnings[0] === "AAPL: สกุลเงินไม่ตรงกับไม้ก่อนหน้า ไม่ได้นำมาคิด (ไม้ 2026-01-06)";
})(), [E.fifo([tr({ id: "a", date: "2026-01-05", symbol: "NVDA", side: "buy", qty: 2, price: 100 }), tr({ id: "b", date: "2026-01-06", symbol: "NVDA", side: "sell", qty: 1, price: 120, currency: "THB" })], {})]);
t("fifo(null) / fifo([]) → empty shape, never throws", (function () {
  var a = E.fifo(null, null), b = E.fifo([], undefined);
  return a.realized.length === 0 && a.open.length === 0 && Object.keys(a.totals).length === 0 && a.warnings.length === 0 && b.realized.length === 0 && Object.keys(b.totals).length === 0;
})());
var T5 = T.concat([tr({ id: "t5", date: "2026-03-10", symbol: "NVDA", side: "buy", qty: 15, price: 140 })]);
t("buy-back shape: ids and prices echoed from the trades", (function () { var x = E.buyBack({ action: { kind: "sell", tradeIds: ["t3", "t5"] }, symbol: "NVDA" }, T5); return x.sellTradeId === "t3" && x.buyTradeId === "t5" && x.sellPrice === 130 && x.buyPrice === 140 && Object.keys(x).length === 6; })());
t("buy-back: picks the first later buy when several are linked", (function () { var x = E.buyBack({ action: { kind: "sell", tradeIds: ["t3", "t6", "t5"] }, symbol: "NVDA" }, T5.concat([tr({ id: "t6", date: "2026-03-20", symbol: "NVDA", side: "buy", qty: 1, price: 150 })])); return x.buyTradeId === "t5" && x.diffPerUnit === 10; })());
t("buy-back: null for non-sell entry / null entry / no tradeIds / unlinked buy", E.buyBack({ action: { kind: "buy", tradeIds: ["t3", "t5"] }, symbol: "NVDA" }, T5) === null && E.buyBack(null, T5) === null && E.buyBack({ action: { kind: "sell" }, symbol: "NVDA" }, T5) === null && E.buyBack({ action: { kind: "sell", tradeIds: ["t3"] }, symbol: "NVDA" }, T5) === null);
t("buy-back: a deleted later buy, an earlier buy, or a buy of another symbol does not count", (function () {
  var del = E.buyBack({ action: { kind: "sell", tradeIds: ["t3", "t5"] }, symbol: "NVDA" }, T.concat([tr({ id: "t5", date: "2026-03-10", symbol: "NVDA", side: "buy", qty: 15, price: 140, deletedAt: "2026-03-11T00:00:00Z" })]));
  var earlier = E.buyBack({ action: { kind: "sell", tradeIds: ["t2", "t3"] }, symbol: "NVDA" }, T);
  var other = E.buyBack({ action: { kind: "sell", tradeIds: ["t3", "x1"] }, symbol: "NVDA" }, T.concat([tr({ id: "x1", date: "2026-03-10", symbol: "AMD", side: "buy", qty: 1, price: 140 })]));
  var mismatch = E.buyBack({ action: { kind: "sell", tradeIds: ["t3", "t5"] }, symbol: "AMD" }, T5);
  return del === null && earlier === null && other === null && mismatch === null;
})());
t("buy-back: same day counts only when the buy was created later; identical stamps → null", (function () {
  var s = tr({ id: "s", date: "2026-03-01", createdAt: "2026-03-01T10:00:00Z", symbol: "NVDA", side: "sell", qty: 1, price: 100 });
  var later = tr({ id: "bl", date: "2026-03-01", createdAt: "2026-03-01T11:00:00Z", symbol: "NVDA", side: "buy", qty: 1, price: 110 });
  var same = tr({ id: "bs", date: "2026-03-01", createdAt: "2026-03-01T10:00:00Z", symbol: "NVDA", side: "buy", qty: 1, price: 110 });
  var a = E.buyBack({ action: { kind: "sell", tradeIds: ["s", "bl"] }, symbol: "NVDA" }, [later, s]);
  var b = E.buyBack({ action: { kind: "sell", tradeIds: ["s", "bs"] }, symbol: "NVDA" }, [s, same]);
  return a && a.buyTradeId === "bl" && Math.abs(a.diffPct - 10) < 1e-9 && b === null;
})());
t("buy-back: bought back cheaper → negative diff", (function () { var x = E.buyBack({ action: { kind: "sell", tradeIds: ["t3", "t7"] }, symbol: "NVDA" }, T.concat([tr({ id: "t7", date: "2026-03-10", symbol: "NVDA", side: "buy", qty: 1, price: 117 })])); return x.diffPerUnit === -13 && Math.abs(x.diffPct - (-10)) < 1e-9; })());
t("no NaN/undefined in any trades output", (function () {
  var all = [f, E.fifo(T.concat([tr({ id: "t4", date: "2026-04-01", symbol: "NVDA", side: "sell", qty: 20, price: 100 })]), {}), E.fifo(T, { NVDA: { close: NaN } }), E.fifo(null, null), E.buyBack({ action: { kind: "sell", tradeIds: ["t3", "t5"] }, symbol: "NVDA" }, T5)];
  return !/NaN|undefined|Infinity/.test(JSON.stringify(all));
})());

// ============================================================
// Task 7 — สถิติ (สเปก §5.6) · รวมเอกสาร (สเปก §5.1, §6) · สุขอนามัยของซอร์ส
//   สถิติคิดมือ (แถว a–e ตามแผน): against = a ขาย +5 → −5 · b ขาย +3 → −3 · c ซื้อ −2 → −2 → รวม −10 / 3
//     per-rule = d scored +4 · e pending → n 2 scored 1 → "ยังน้อยเกินสรุป" avg null
//     fear อยู่ใน a b c = 3 · regret อยู่ใน b = 1 · คาดผิด a b c = 3 · คาดถูก d = 1 · judged 4
//   รวมเอกสาร: e1 ฝั่ง Bd ใหม่กว่า (10-02 10:00 > 10-01 10:00) และเป็น tombstone → ต้องคงไว้ · e2 เพิ่ม · t1 คงไว้
//     entries เรียง date desc → e2 (10-02) ก่อน e1 (10-01) · updatedAt ของ doc = max = 2026-10-02T00:00:00Z
// ============================================================
console.log("== stats ==");
function en(id, comp, kind, feelings, out) { return { e: { id: id, verdict: { compliance: comp }, action: { kind: kind }, context: { feelings: feelings }, view: { horizonDays: 7 } }, o: out }; }
function sc(pct, res) { return { horizons: { "7": { status: "scored", pct: pct } }, actionResult: res, predicted: res === "good" ? "right" : res === "bad" ? "wrong" : "flat" }; }
var rows = [en("a", "against", "sell", ["fear"], sc(5, "bad")), en("b", "against", "sell", ["fear", "regret"], sc(3, "bad")), en("c", "against", "buy", ["fear"], sc(-2, "bad")), en("d", "per-rule", "buy", ["calm"], sc(4, "good")), en("e", "per-rule", "buy", ["calm"], { horizons: { "7": { status: "pending" } }, actionResult: "pending", predicted: "pending" })];
var S = E.stats(rows.map(function (r) { return r.e; }), rows.reduce(function (m, r) { m[r.e.id] = r.o; return m; }, {}));
t("against: n 3, scored 3, good 0, avg in action direction = (−5 −3 −2)/3", S.byCompliance.against.n === 3 && S.byCompliance.against.scoredN === 3 && S.byCompliance.against.goodN === 0 && Math.abs(S.byCompliance.against.avgPct + 10 / 3) < 1e-9 && S.byCompliance.against.enough === true);
t("per-rule: n 2 but scored 1 → not enough, avg null", S.byCompliance["per-rule"].n === 2 && S.byCompliance["per-rule"].scoredN === 1 && S.byCompliance["per-rule"].enough === false && S.byCompliance["per-rule"].avgPct === null);
t("feeling fear counted 3 times, regret once", S.byFeeling.fear.n === 3 && S.byFeeling.regret.n === 1 && S.byFeeling.regret.enough === false);
t("prediction totals", S.byPrediction.wrong === 3 && S.byPrediction.right === 1 && S.byPrediction.judged === 4 && S.byPrediction.enough === true);
// ---- เพิ่มจากแผน: ชุดใหญ่คิดมือ ----
//   f against ขาย −4 → +4 good · g per-rule hold (actionResult n/a แม้ scored) คาดถูก · h unknown ซื้อ +2 good ติ๊ก fear ซ้ำสองครั้ง
//   i n/a none ไม่มี outcome เลย ติ๊ก bored · j against ซื้อ no-data ติ๊ก calm · k against ซื้อ +0.5 flat ติ๊ก greed
//   against = a b c f j k → n 6 · scored a b c f k = 5 · good f = 1 · รวมทิศ −5 −3 −2 +4 +0.5 = −5.5 → avg −1.1
//   per-rule = d e g → n 3 · scored d = 1 (e pending · g hold ไม่ตัดสิน) → avg null
//   fear = a b c f h → n 5 · scored 5 · good f h = 2 · รวม −5 −3 −2 +4 +2 = −4 → avg −0.8
//   calm = d e g j → n 4 scored 1 · greed = k → n 1 scored 1 good 0 · bored = i → n 1 scored 0 · regret = b
//   คาดถูก d f g h = 4 · ผิด a b c = 3 · flat k = 1 · judged 8
var more = [
  en("f", "against", "sell", ["fear"], sc(-4, "good")),
  en("g", "per-rule", "hold", ["calm"], { horizons: { "7": { status: "scored", pct: 9 } }, actionResult: "n/a", predicted: "right" }),
  en("h", "unknown", "buy", ["fear", "fear"], sc(2, "good")),
  en("i", "n/a", "none", ["bored"], undefined),
  en("j", "against", "buy", ["calm"], { horizons: { "7": { status: "no-data", pct: null } }, actionResult: "no-data", predicted: "no-data" }),
  en("k", "against", "buy", ["greed"], sc(0.5, "flat"))
];
var all = rows.concat(more);
var S2 = E.stats(all.map(function (r) { return r.e; }), all.reduce(function (m, r) { m[r.e.id] = r.o; return m; }, {}));
t("big set: against n 6 scored 5 good 1 avg −1.1", S2.byCompliance.against.n === 6 && S2.byCompliance.against.scoredN === 5 && S2.byCompliance.against.goodN === 1 && Math.abs(S2.byCompliance.against.avgPct + 1.1) < 1e-9 && S2.byCompliance.against.enough === true, S2.byCompliance.against);
t("big set: per-rule n 3 scored 1 (hold with scored horizon is not an action result) → avg null", S2.byCompliance["per-rule"].n === 3 && S2.byCompliance["per-rule"].scoredN === 1 && S2.byCompliance["per-rule"].goodN === 1 && S2.byCompliance["per-rule"].avgPct === null && S2.byCompliance["per-rule"].enough === false, S2.byCompliance["per-rule"]);
t("big set: fear n 5 scored 5 good 2 avg −0.8; duplicate tick counts once", S2.byFeeling.fear.n === 5 && S2.byFeeling.fear.scoredN === 5 && S2.byFeeling.fear.goodN === 2 && Math.abs(S2.byFeeling.fear.avgPct + 0.8) < 1e-9 && S2.byFeeling.fear.enough === true, S2.byFeeling.fear);
t("big set: calm n 4 scored 1 · greed n 1 scored 1 good 0 · bored n 1 scored 0 · regret n 1", S2.byFeeling.calm.n === 4 && S2.byFeeling.calm.scoredN === 1 && S2.byFeeling.calm.avgPct === null && S2.byFeeling.greed.n === 1 && S2.byFeeling.greed.scoredN === 1 && S2.byFeeling.greed.goodN === 0 && S2.byFeeling.bored.n === 1 && S2.byFeeling.bored.scoredN === 0 && S2.byFeeling.regret.n === 1 && S2.byFeeling.regret.scoredN === 1, S2.byFeeling);
t("big set: prediction right 4 wrong 3 flat 1 judged 8", S2.byPrediction.right === 4 && S2.byPrediction.wrong === 3 && S2.byPrediction.flat === 1 && S2.byPrediction.judged === 8 && S2.byPrediction.enough === true, S2.byPrediction);
t("every known feeling has a bucket even when unused (n 0, avg null, not enough)", E.FEELINGS.every(function (fx) { var b = S2.byFeeling[fx.key]; return b && typeof b.n === "number" && b.avgPct !== undefined; }) && S2.byFeeling.fomo.n === 0 && S2.byFeeling.fomo.scoredN === 0 && S2.byFeeling.fomo.avgPct === null && S2.byFeeling.fomo.enough === false);
t("unknown/n/a compliance never enters byCompliance; only the two keys exist", Object.keys(S2.byCompliance).sort().join() === "against,per-rule");
// แก้ 2026-10-26 (Task 7b-B ข้อ 7 · สเปก §5.6 · review-1 #8): ทุกกลุ่มได้ rightN / wrongN / judgedN (คาดถูก) เพิ่มจาก goodN (ผลของ action)
//   เดิมล็อกรูปร่าง { n, scoredN, goodN, avgPct, enough } · byPrediction รูปร่างเดิม
// แก้ 2026-10-26 (review-2 · สเปก §5.6): เพิ่ม predEnough (ประตู n ของสัดส่วนคาดถูก = judgedN ≥ MIN_STAT_N) ทุกกลุ่ม
//   และ byPrediction.unjudged (ช่วงของตัวเอง scored แต่ไม่ได้คาดทิศ = "ไม่ตัดสิน") · เดิมไม่มีสองคีย์นี้
t("stat row shape is exactly { n, scoredN, goodN, avgPct, enough, rightN, wrongN, judgedN, predEnough }", Object.keys(S2.byCompliance.against).sort().join() === "avgPct,enough,goodN,judgedN,n,predEnough,rightN,scoredN,wrongN" && Object.keys(S2.byFeeling.fear).sort().join() === "avgPct,enough,goodN,judgedN,n,predEnough,rightN,scoredN,wrongN" && Object.keys(S2.byPrediction).sort().join() === "enough,flat,judged,right,unjudged,wrong");
t("scored means the OWN horizon: horizon 30 with only +7 scored → n counted, not scored", (function () {
  var l = { id: "l", verdict: { compliance: "against" }, action: { kind: "buy" }, context: { feelings: ["fear"] }, view: { horizonDays: 30 } };
  var x = E.stats([l], { l: sc(5, "good") });
  return x.byCompliance.against.n === 1 && x.byCompliance.against.scoredN === 0 && x.byFeeling.fear.n === 1 && x.byFeeling.fear.scoredN === 0;
})());
t("exactly MIN_STAT_N scored → enough; one fewer → not (boundary)", (function () {
  var three = [en("p", "against", "buy", [], sc(1, "good")), en("q", "against", "buy", [], sc(2, "good")), en("r", "against", "buy", [], sc(3, "good"))];
  var x3 = E.stats(three.map(function (r) { return r.e; }), three.reduce(function (m, r) { m[r.e.id] = r.o; return m; }, {}));
  var x2 = E.stats(three.slice(0, 2).map(function (r) { return r.e; }), three.reduce(function (m, r) { m[r.e.id] = r.o; return m; }, {}));
  return E.MIN_STAT_N === 3 && x3.byCompliance.against.enough === true && Math.abs(x3.byCompliance.against.avgPct - 2) < 1e-9 && x2.byCompliance.against.enough === false && x2.byCompliance.against.avgPct === null && x2.byCompliance.against.scoredN === 2;
})());
t("stats(null, null) / junk entries → zeros, both compliance keys, no throw", (function () {
  var x = E.stats(null, null), y = E.stats([null, 5, {}, { id: "z", context: { feelings: "fear" } }], { z: "nope" });
  return x.byCompliance.against.n === 0 && x.byCompliance["per-rule"].n === 0 && x.byCompliance.against.avgPct === null && x.byPrediction.judged === 0 && x.byPrediction.enough === false &&
    y.byCompliance.against.n === 0 && y.byFeeling.fear.n === 0 && y.byPrediction.judged === 0;
})());
t("no NaN/undefined in stats output", !/NaN|undefined|Infinity/.test(JSON.stringify([S, S2, E.stats(null, null)])));

console.log("== merge ==");
var A = { v: 1, updatedAt: "2026-10-01T00:00:00Z", entries: [{ id: "e1", updatedAt: "2026-10-01T10:00:00Z", date: "2026-10-01", createdAt: "2026-10-01T10:00:00Z", review: { lesson: "old" } }], trades: [{ id: "t1", updatedAt: "2026-10-01T10:00:00Z", date: "2026-10-01", createdAt: "x" }] };
var Bd = { v: 1, updatedAt: "2026-10-02T00:00:00Z", entries: [{ id: "e1", updatedAt: "2026-10-02T10:00:00Z", date: "2026-10-01", createdAt: "2026-10-01T10:00:00Z", deletedAt: "2026-10-02T10:00:00Z" }, { id: "e2", updatedAt: "2026-10-02T11:00:00Z", date: "2026-10-02", createdAt: "2026-10-02T11:00:00Z" }], trades: [] };
var M = E.mergeDocs(A, Bd);
t("union by id, newer wins, tombstone kept", M.entries.length === 2 && M.entries.filter(function (x) { return x.id === "e1"; })[0].deletedAt && M.trades.length === 1);
t("sorted entries date desc", M.entries[0].id === "e2");
t("updatedAt = max", M.updatedAt === "2026-10-02T00:00:00Z");
t("merge with null → copy", E.mergeDocs(null, A).entries.length === 1 && E.mergeDocs(A, null).trades.length === 1);
t("merge is idempotent", JSON.stringify(E.mergeDocs(M, M)) === JSON.stringify(M));
t("liveEntries hides tombstones", E.liveEntries(M).length === 1);
t("tombstone sets both stamps", (function () { var x = E.tombstone({ id: "z" }, "2026-10-03T00:00:00Z"); return x.deletedAt === "2026-10-03T00:00:00Z" && x.updatedAt === "2026-10-03T00:00:00Z"; })());
// ---- เพิ่มจากแผน: ขอบของกติกา "ใหม่กว่าชนะ" · ลำดับ · ของเสีย · ไม่แก้ input ----
t("emptyDoc shape { v: 1, updatedAt: null, entries: [], trades: [] } and a fresh object each call", (function () {
  var d = E.emptyDoc();
  return Object.keys(d).join() === "v,updatedAt,entries,trades" && d.v === 1 && d.updatedAt === null && d.entries.length === 0 && d.trades.length === 0 && E.emptyDoc() !== d && E.emptyDoc().entries !== d.entries;
})());
t("mergeDocs(null, null) equals emptyDoc; order of arguments does not change the union", JSON.stringify(E.mergeDocs(null, null)) === JSON.stringify(E.emptyDoc()) && JSON.stringify(E.mergeDocs(Bd, A)) === JSON.stringify(M));
t("inputs are not mutated and result arrays are new", (function () {
  var a0 = JSON.stringify(A), b0 = JSON.stringify(Bd);
  var x = E.mergeDocs(A, Bd);
  x.entries.push({ id: "junk", date: "2026-01-01", createdAt: "" });
  return JSON.stringify(A) === a0 && JSON.stringify(Bd) === b0 && x.entries !== A.entries && x.trades !== A.trades;
})());
t("ties on updatedAt → b wins (so mergeDocs(server, local) keeps what the user just did)", (function () {
  var x = { id: "e1", updatedAt: "2026-10-05T00:00:00Z", date: "2026-10-01", createdAt: "c", review: { lesson: "from-a" } };
  var y = { id: "e1", updatedAt: "2026-10-05T00:00:00Z", date: "2026-10-01", createdAt: "c", review: { lesson: "from-b" } };
  var ab = E.mergeDocs({ entries: [x] }, { entries: [y] }).entries[0], ba = E.mergeDocs({ entries: [y] }, { entries: [x] }).entries[0];
  return ab.review.lesson === "from-b" && ba.review.lesson === "from-a";
})());
t("spec §6: tombstone wins only when newer — a later edit on another device resurrects the item", (function () {
  var edited = { v: 1, updatedAt: "2026-10-03T00:00:00Z", entries: [{ id: "e1", updatedAt: "2026-10-03T10:00:00Z", date: "2026-10-01", createdAt: "2026-10-01T10:00:00Z", review: { lesson: "new" } }], trades: [] };
  var x = E.mergeDocs(edited, Bd).entries.filter(function (q) { return q.id === "e1"; })[0];
  var y = E.mergeDocs(Bd, edited).entries.filter(function (q) { return q.id === "e1"; })[0];
  return !x.deletedAt && x.review.lesson === "new" && !y.deletedAt && y.review.lesson === "new";
})());
t("missing updatedAt loses to any stamped copy, in either order", (function () {
  var bare = { id: "e1", date: "2026-10-01", createdAt: "c", review: { lesson: "bare" } };
  var stamped = { id: "e1", updatedAt: "2026-10-01T00:00:00Z", date: "2026-10-01", createdAt: "c", review: { lesson: "stamped" } };
  return E.mergeDocs({ entries: [bare] }, { entries: [stamped] }).entries[0].review.lesson === "stamped" && E.mergeDocs({ entries: [stamped] }, { entries: [bare] }).entries[0].review.lesson === "stamped";
})());
t("duplicate id inside one doc collapses to the newest", E.mergeDocs({ entries: [{ id: "d", updatedAt: "2026-10-02T00:00:00Z", date: "2026-10-01", review: { lesson: "newer" } }, { id: "d", updatedAt: "2026-10-01T00:00:00Z", date: "2026-10-01", review: { lesson: "older" } }] }, null).entries.length === 1 && E.mergeDocs({ entries: [{ id: "d", updatedAt: "2026-10-02T00:00:00Z", date: "2026-10-01", review: { lesson: "newer" } }, { id: "d", updatedAt: "2026-10-01T00:00:00Z", date: "2026-10-01", review: { lesson: "older" } }] }, null).entries[0].review.lesson === "newer");
t("items without a string id, and non-objects, are dropped (the server rejects them anyway)", (function () {
  var x = E.mergeDocs({ entries: [null, 5, "e", { date: "2026-10-01" }, { id: "", date: "2026-10-01" }, { id: "ok", date: "2026-10-01", createdAt: "c" }], trades: [{ id: 7 }, { id: "tk", date: "2026-10-01", createdAt: "c" }] }, null);
  return x.entries.length === 1 && x.entries[0].id === "ok" && x.trades.length === 1 && x.trades[0].id === "tk";
})());
t("entries: same date → createdAt desc; trades: date asc then createdAt asc", (function () {
  var x = E.mergeDocs({
    entries: [{ id: "a", date: "2026-10-01", createdAt: "2026-10-01T09:00:00Z" }, { id: "b", date: "2026-10-01", createdAt: "2026-10-01T11:00:00Z" }, { id: "c", date: "2026-09-30", createdAt: "2026-09-30T23:00:00Z" }],
    trades: [{ id: "t3", date: "2026-10-02", createdAt: "2026-10-02T01:00:00Z" }, { id: "t2", date: "2026-10-01", createdAt: "2026-10-01T11:00:00Z" }, { id: "t1", date: "2026-10-01", createdAt: "2026-10-01T09:00:00Z" }]
  }, null);
  return x.entries.map(function (q) { return q.id; }).join() === "b,a,c" && x.trades.map(function (q) { return q.id; }).join() === "t1,t2,t3";
})());
t("updatedAt: one side null → the other; max is taken from whichever side is newer", E.mergeDocs({ updatedAt: null }, A).updatedAt === "2026-10-01T00:00:00Z" && E.mergeDocs({ updatedAt: "2026-10-05T00:00:00Z", entries: [], trades: [] }, A).updatedAt === "2026-10-05T00:00:00Z" && E.mergeDocs(null, null).updatedAt === null);
t("v is always 1 regardless of inputs", E.mergeDocs({ v: 7 }, { v: "x" }).v === 1);
t("liveTrades hides tombstones; live lists return the same item objects; null doc → []", (function () {
  var doc = E.mergeDocs({ trades: [{ id: "t1", date: "2026-10-01", deletedAt: "2026-10-02T00:00:00Z" }, { id: "t2", date: "2026-10-01" }] }, null);
  var lt = E.liveTrades(doc), le = E.liveEntries(M);
  return lt.length === 1 && lt[0].id === "t2" && lt[0] === doc.trades.filter(function (q) { return q.id === "t2"; })[0] && le[0] === M.entries[0] && E.liveEntries(null).length === 0 && E.liveTrades({}).length === 0 && E.liveEntries({ entries: [null, 1] }).length === 0;
})());
t("touch returns the same object with updatedAt set and nothing else changed", (function () {
  var it = { id: "e9", review: { lesson: "x" } };
  var r = E.touch(it, "2026-10-04T00:00:00Z");
  return r === it && it.updatedAt === "2026-10-04T00:00:00Z" && !("deletedAt" in it) && it.review.lesson === "x";
})());
t("tombstone returns the same object; junk item or missing stamp → null and nothing mutated", (function () {
  var it = { id: "e9" };
  var r = E.tombstone(it, "2026-10-04T00:00:00Z");
  var bad = { id: "e8" };
  return r === it && it.deletedAt === "2026-10-04T00:00:00Z" && E.tombstone(null, "2026-10-04T00:00:00Z") === null && E.tombstone(bad, null) === null && E.tombstone(bad, "") === null && !("deletedAt" in bad) && !("updatedAt" in bad) && E.touch("str", "2026-10-04T00:00:00Z") === null && E.touch(bad, 5) === null && !("updatedAt" in bad);
})());
t("merged doc passes the server validator when inputs do", (function () {
  var V = require("../lib/journal-validation.js");
  var good = { v: 1, updatedAt: null, entries: [{ id: "e1", date: "2026-10-01", symbol: "NVDA" }], trades: [{ id: "t1", date: "2026-10-01", symbol: "NVDA" }] };
  return V.isValidJournalDoc(E.mergeDocs(good, Bd.entries.length ? { v: 1, entries: [{ id: "e2", date: "2026-10-02", symbol: "AMD" }], trades: [] } : null)) && V.isValidJournalDoc(E.emptyDoc());
})());
t("no NaN/undefined in merge output", !/NaN|undefined|Infinity/.test(JSON.stringify([M, E.mergeDocs(null, null), E.mergeDocs({ v: 7 }, { v: "x" })])));

console.log("== hygiene ==");
var src = fs.readFileSync(path.join(__dirname, "..", "public", "decision-journal-engine.js"), "utf8");
var code = src.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
t("ES5 only", !/=>/.test(code) && !/\bconst\s/.test(code) && !/\blet\s/.test(code) && code.indexOf("`") < 0);
t("no advisory wording", !/ควรซื้อ|ควรขาย|น่าซื้อ|น่าขาย|แนะนำซื้อ|จุดเข้า|ตัดขาดทุน/.test(src) && !/\b(Buy|Sell)\b/.test(code));
t("no Date.now / new Date() in computations (pure)", !/Date\.now\(|new Date\(\)/.test(code));
t("engine does not touch DOM/fetch/storage", !/document\.|fetch\(|localStorage/.test(code));
// ---- เพิ่มจากแผน: กติกา ES5 ข้ออื่นใน Global Constraints ----
t("no class / optional chaining / Array includes-fill-find", !/\bclass\s/.test(code) && code.indexOf("?.") < 0 && !/\.includes\(|\.fill\(|\.find\(/.test(code));
t("every documented export is a function", ["emptyDoc", "mergeDocs", "touch", "tombstone", "liveEntries", "liveTrades", "stats", "evaluateRules", "verdictFor", "outcomes", "reviewDue", "fifo", "buyBack", "actualAt", "asOfBars", "closedBarCutoff", "canonicalSymbol", "providerSymbol", "marketOf", "currencyOf", "newId"].every(function (k) { return typeof E[k] === "function"; }));

// ============================================================
// Task 7b-B — แก้ตามผลตรวจ Opus (review-1) · ค่าคาดหวังคิดมือทุกตัว (เลขอยู่ในคอมเมนต์)
// ============================================================
console.log("== 7b-B.1 touch & bounce (§3 ก ข ค) ==");
// (ข) 200 แท่ง @100 แล้วปิด 99, 99 (low 98.5) แล้ว as-of ปิด 101
//   sma[200] = (199×100 + 99)/200 = 99.995 · sma[201] = (198×100 + 99 + 99)/200 = 99.99 · sma[202] = (197×100 + 99 + 99 + 101)/200 = 99.995
//   ปิดใต้ SMA ติดต่อกันที่จบที่ asOf−1: แท่ง 201 (99 < 99.99) + แท่ง 200 (99 < 99.995) = 2 · แท่ง 199 ปิด 100 = sma 100 ("at") ตัดสตรีค
//   2 >= CONFIRM_BARS → หลุดยืนยันแล้ว → การกลับขึ้นต้องผ่าน "ยืนได้" ไม่ใช่ "เด้ง" แม้แท่ง 199/200/201 อยู่ในแถบ ±3%
//   (low 98.5 >= 99.99×0.97 = 96.9903 · ตรวจซ้ำ 7b-bands: ไม่ขึ้นกับความกว้างแถบ) และ as-of 101 > sma 99.995 และ > close ของแท่งเหล่านั้น
//   reclaimHeld: above ติดต่อกัน 1 แท่ง < 2 → false → r2.buy false
var tbBreak = mkBars("2025-01-06", base.concat([99, 99, 101]), base.concat([98.5, 98.5, 101]));
(function () {
  var s = TI.calculateSMA(tbBreak.map(function (b) { return b.close; }), 200);
  tNear("7b1 fixture: sma[200] = 99.995", s[200], 99.995, 1e-9);
  tNear("7b1 fixture: sma[201] = 99.99", s[201], 99.99, 1e-9);
  tNear("7b1 fixture: sma[202] = 99.995", s[202], 99.995, 1e-9);
})();
t("7b1: two closes under SMA200 right before as-of → not a bounce (met false, r2.buy false)", (function () { var x = evalFlat(tbBreak); return x.r2.touchBounce.met === false && x.r2.reclaimHeld === false && x.r2.buy === false && x.r2.state === "above"; })(), evalFlat(tbBreak).r2);
// แก้ 2026-10-26 (7b-bands · แถบ ±3%): แท่งคั่นเดิม @103 อยู่ในแถบใหม่ (sma ≈ 100.03…100.075 → ขอบบน ≈ 103.03…103.08 ≥ 103)
//   ทำให้แท่งคั่นเป็น "แตะ" ไปด้วย → ย้ายแท่งคั่นของ tbOne / tbCrash / tbBelow เป็น @104.5 (low 104.5) แล้วคิด sma ใหม่ทั้งหมด
// 200 @100 · 5 แท่งคั่น @104.5 · แท่งแตะปิด 99 low 98.5 · as-of ปิด 101
//   แท่งคั่น 200..204: sma <= (19500 + 522.5)/200 = 100.1125 → ขอบบน <= 100.1125×1.03 = 103.116 < low 104.5 → ไม่แตะ
//   sma[205] = (194×100 + 5×104.5 + 99)/200 = 20021.5/200 = 100.1075 → แถบ [97.104275, 103.110725] → low 98.5 อยู่ในแถบ
//   ปิดใต้ SMA ก่อน as-of: แท่ง 205 (99 < 100.1075) = 1 · แท่ง 204 ปิด 104.5 > sma → หยุด → 1 < 2 ผ่าน (ข)
//   sma[206] = (193×100 + 522.5 + 99 + 101)/200 = 20022.5/200 = 100.1125 · as-of 101 > 100.1125 และ > 99 → met
var tbOne = mkBars("2025-01-06", base.concat([104.5, 104.5, 104.5, 104.5, 104.5, 99, 101]), base.concat([104.5, 104.5, 104.5, 104.5, 104.5, 98.5, 101]));
t("7b1: one close under SMA inside the band, then as-of above SMA and above the touch close → met, r2.buy", (function () { var x = evalFlat(tbOne); return x.r2.touchBounce.met === true && x.r2.touchBounce.touchDate === tbOne[205].date && x.r2.touchBounce.touchLow === 98.5 && x.r2.buy === true; })(), evalFlat(tbOne).r2);
tNear("7b1: touchSma = 100.1075 (was 100.07 with @103 insulators)", evalFlat(tbOne).r2.touchBounce.touchSma, 100.1075, 1e-9);
// ทะลุลงลึก: แท่ง 205 ปิด 79 low 78 · sma[205] = (19400 + 522.5 + 79)/200 = 20001.5/200 = 100.0075 → ขอบล่าง 100.0075×0.97 = 97.007275 > 78 → ไม่แตะ
//   sma[206] = (19300 + 522.5 + 79 + 104)/200 = 20005.5/200 = 100.0275 · as-of 104 > 100.0275 และ > 79 — นิยามเดิม (ไม่มีขอบล่าง) จะนับว่าเด้ง
//   (เดิม @103: sma 99.97 · ขอบล่าง 2% = 97.9706 · ชื่อเดิม "low 78 < 97.97")
var tbCrash = mkBars("2025-01-06", base.concat([104.5, 104.5, 104.5, 104.5, 104.5, 79, 104]), base.concat([104.5, 104.5, 104.5, 104.5, 104.5, 78, 104]));
t("7b1: crash bar far below the band (low 78 < 97.007) is not a touch → met false, r2.buy false", (function () { var x = evalFlat(tbCrash); return x.r2.touchBounce.met === false && x.r2.touchBounce.touchDate === null && x.r2.buy === false; })(), evalFlat(tbCrash).r2);
// (ค) ครึ่งแรก: แท่งแตะปิด 99 low 99 (sma[205] = 100.1075 → ในแถบ) · as-of ปิด 100
//   sma[206] = (19300 + 522.5 + 99 + 100)/200 = 20021.5/200 = 100.1075 · 100 > 99 (ผ่าน "สูงกว่าแท่งแตะ") แต่ 100 < 100.1075 → ไม่ผ่าน "close > sma200"
//   สตรีคใต้เส้นก่อน as-of = 1 → (ข) ผ่าน · เงื่อนไขเดียวที่ทำให้ไม่นับคือ as-of ยังไม่ขึ้นเหนือ SMA200
var tbBelow = mkBars("2025-01-06", base.concat([104.5, 104.5, 104.5, 104.5, 104.5, 99, 100]), base.concat([104.5, 104.5, 104.5, 104.5, 104.5, 99, 100]));
t("7b1: as-of closes above the touch close but at/below SMA200 → met false (pins the first half of ค)", (function () { var x = evalFlat(tbBelow); return x.r2.touchBounce.met === false && x.r2.touchBounce.touchDate === tbBelow[205].date && x.r2.buy === false; })(), evalFlat(tbBelow).r2);
tNear("7b1 fixture: as-of sma = 100.1075 > close 100 (was 100.07)", evalFlat(tbBelow).sma200, 100.1075, 1e-9);
// แก้ 2026-10-26 (7b-bands): เดิม "inclusive at exactly −2% (low 98 vs sma 100), 97.99 is outside" และ TOUCH_BAND_PCT === 2
//   ตอนนี้ 100×0.97 = 97 → low 97 ในแถบ · 96.99 นอก · แท่งคั่น @104.5 (เดิม @103 ซึ่งอยู่ในแถบใหม่) · as-of 106
t("7b1: band lower edge is inclusive at exactly −3% (low 97 vs sma 100), 96.99 is outside", (function () {
  var sma = rep(100, 7);
  var mk = function (d, low, close) { return { date: d, low: low, close: close }; };
  var tail = [mk("c", 104.5, 104.5), mk("d", 104.5, 104.5), mk("e", 104.5, 104.5), mk("f", 104.5, 104.5), mk("g", 106, 106)];
  var inside = E._internal.touchBounce([mk("a", 104.5, 104.5), mk("b", 97, 99)].concat(tail), sma);    // 100×0.97 = 97 → ในแถบ · close 99 < sma แค่แท่งเดียว
  var outside = E._internal.touchBounce([mk("a", 104.5, 104.5), mk("b", 96.99, 99)].concat(tail), sma);
  return inside.met === true && inside.touchLow === 97 && inside.touchDate === "b" && outside.met === false && outside.touchDate === null && E.TOUCH_BAND_PCT === 3;
})());

console.log("== 7b-B.2 outcomes pending until the target bar has closed ==");
// US entry 2026-10-16 (ศุกร์) → +7 = 2026-10-23 (ศุกร์) · ref = แท่ง 10-15 ปิด 100
//   now 2026-10-24T04:59 → cutoff US = 10-24 − 2 วัน = 10-22 < 10-23 → pending (แท่ง 10-23 ยังไม่ปิดตามกติกา 05:00)
//   now 2026-10-24T05:00 → cutoff = 10-23 → scored ด้วยแท่ง 10-23: (110 − 100)×100/100 = +10 → up ถูก · buy ดี
var usE = entry({ date: "2026-10-16", rules: { asOfBar: "2026-10-15", close: 100 } });
var usB = [{ date: "2026-10-15", close: 100 }, { date: "2026-10-22", close: 104 }, { date: "2026-10-23", close: 110 }];
t("7b2: US +7 at 04:59 the next day → pending, nothing scored yet, not due", (function () { var x = E.outcomes(usE, usB, "2026-10-24T04:59"); var h = x.horizons["7"]; return h.target === "2026-10-23" && h.status === "pending" && h.date === null && h.close === null && h.pct === null && x.predicted === "pending" && x.actionResult === "pending" && x.lastClosedBar === "2026-10-22" && E.reviewDue(usE, x) === false; })(), E.outcomes(usE, usB, "2026-10-24T04:59").horizons["7"]);
t("7b2: US +7 at 05:00 → scored with the 2026-10-23 bar (+10 → right/good, due)", (function () { var x = E.outcomes(usE, usB, "2026-10-24T05:00"); var h = x.horizons["7"]; return h.status === "scored" && h.date === "2026-10-23" && h.close === 110 && Math.abs(h.pct - 10) < 1e-9 && x.predicted === "right" && x.actionResult === "good" && E.reviewDue(usE, x) === true; })(), E.outcomes(usE, usB, "2026-10-24T05:00").horizons["7"]);
// TH entry 2026-10-16 → +7 = 2026-10-23 · now 10-23T16:59 → cutoff TH = 10-22 → pending · 17:00 → cutoff 10-23 → scored
//   ref 10-15 ปิด 30 · แท่ง 10-23 ปิด 33 → (33 − 30)×100/30 = +10
var thE = entry({ symbol: "PTT.BK", date: "2026-10-16", rules: { asOfBar: "2026-10-15", close: 30 } });
var thB = [{ date: "2026-10-15", close: 30 }, { date: "2026-10-22", close: 31 }, { date: "2026-10-23", close: 33 }];
t("7b2: TH +7 at 16:59 on the target day → pending", (function () { var x = E.outcomes(thE, thB, "2026-10-23T16:59"); return x.horizons["7"].status === "pending" && x.horizons["7"].date === null && x.lastClosedBar === "2026-10-22"; })(), E.outcomes(thE, thB, "2026-10-23T16:59").horizons["7"]);
t("7b2: TH +7 at 17:00 on the target day → scored with that day's bar (+10)", (function () { var x = E.outcomes(thE, thB, "2026-10-23T17:00"); var h = x.horizons["7"]; return h.status === "scored" && h.date === "2026-10-23" && Math.abs(h.pct - 10) < 1e-9; })(), E.outcomes(thE, thB, "2026-10-23T17:00").horizons["7"]);
// เป้าวันเสาร์: entry 2026-09-05 (เสาร์) → +7 = 2026-09-12 (เสาร์) · ref = แท่งศุกร์ 09-04 ปิด 100 · แท่งศุกร์ 09-11 ปิด 95
//   now 2026-09-13T06:00 → cutoff US = 09-12 → เป้า 09-12 ไม่เกิน cutoff → scored · actualAt ถอยไปแท่งศุกร์ 09-11 (ห่าง 1 วัน) → −5
//   now 2026-09-13T04:59 → cutoff = 09-11 < 09-12 → ยัง pending (ทั้งที่แท่งศุกร์ปิดแล้ว — เป้าคือวันเสาร์ ตามสัญญา target > cutoff)
var satE = entry({ date: "2026-09-05", rules: { asOfBar: "2026-09-04", close: 100 } });
var satB = [{ date: "2026-09-04", close: 100 }, { date: "2026-09-11", close: 95 }];
t("7b2: Saturday target, US at 2026-09-13T06:00 → scored with the Friday 2026-09-11 close (−5)", (function () { var x = E.outcomes(satE, satB, "2026-09-13T06:00"); var h = x.horizons["7"]; return h.target === "2026-09-12" && h.status === "scored" && h.date === "2026-09-11" && h.close === 95 && Math.abs(h.pct + 5) < 1e-9; })(), E.outcomes(satE, satB, "2026-09-13T06:00").horizons["7"]);
t("7b2: Saturday target, US at 2026-09-13T04:59 → still pending (cutoff 09-11 < target 09-12)", E.outcomes(satE, satB, "2026-09-13T04:59").horizons["7"].status === "pending");
// no-data ต้องไม่มีเศษข้อมูล: ไม่มีแท่ง 08-31 ในชุดสด และ rules.close null → refClose null · แท่ง 09-08 หาเจอแต่คิด pct ไม่ได้
//   → status no-data และ date/close/pct เป็น null ทั้งหมด (เดิม date/close ของแท่งที่หาเจอค้างอยู่)
t("7b2: no-data horizon carries null date/close/pct even when a bar was found", (function () {
  var x = E.outcomes(entry({ rules: { asOfBar: "2026-08-31", close: null } }), [{ date: "2026-09-08", close: 103 }], "2026-10-25T12:00");
  var h = x.horizons["7"];
  return h.status === "no-data" && h.date === null && h.close === null && h.pct === null && h.target === "2026-09-08";
})(), E.outcomes(entry({ rules: { asOfBar: "2026-08-31", close: null } }), [{ date: "2026-09-08", close: 103 }], "2026-10-25T12:00").horizons["7"]);

console.log("== 7b-B.3 EPS_PCT at percentage thresholds ==");
// high 100.05 → close 80.04: (80.04 − 100.05)×100/100.05 = −20.01×100/100.05 = −20 ทางคณิตศาสตร์
//   แต่เลขทศนิยมลอยได้ −19.999999999999993 → ต้องนับว่า dip (จอแสดง −20.0%) · 6 แท่ง >= MIN_DIP_BARS 5
var dipFp = mkBars("2025-01-06", rep(100, 4).concat([100.05, 80.04]));
t("7b3: EPS_PCT exported as 1e-9", E.EPS_PCT === 1e-9);
t("7b3: 100.05 → 80.04 (fp −19.999999999999993) → dipMet true, buy with conviction", (function () { var x = evalFlat(dipFp, { conviction: true }); return x.high1y === 100.05 && x.r3.dd1yPct > -20 && x.r3.dd1yPct < -19.99999 && x.r3.dipMet === true && x.r3.buy === true; })(), evalFlat(dipFp, { conviction: true }).r3);
// แก้ 2026-10-26 (7b-bands · แถบทรงตัว ±1% → ±2%): เดิม 13 → 13.13 (fp 1.000000000000006) ซึ่งอยู่ที่ขอบแถบเก่า
//   ที่แถบ 2% คู่นั้นอยู่กลางแถบ (ผ่านโดยไม่ต้องพึ่ง EPS) จึงย้ายไปขอบใหม่ฝั่งลบ: 5.5 → 5.39
//   (5.39 − 5.5)×100/5.5 = −0.11×100/5.5 = −2 ทางคณิตศาสตร์ · fp ได้ −2.0000000000000058 (หาด้วยสคริปต์ค้นใน scratchpad)
//   ไม่มี EPS → |pct| > 2 → up ผิด · buy ไม่ดี · มี EPS → flat ทั้งคาดการณ์และผลของ action (ขอบฝั่งบวกอยู่ในเทสต์ 7b-bands ด้านล่าง)
t("7b3: 5.5 → 5.39 (fp −2.0000000000000058) → predicted flat, actionResult flat", (function () {
  var x = E.outcomes(entry({ rules: { asOfBar: "2026-08-31", close: 5.5 } }), [{ date: "2026-08-31", close: 5.5 }, { date: "2026-09-08", close: 5.39 }], "2026-10-25T12:00");
  return x.horizons["7"].status === "scored" && x.horizons["7"].pct < -2 && x.predicted === "flat" && x.actionResult === "flat";
})(), E.outcomes(entry({ rules: { asOfBar: "2026-08-31", close: 5.5 } }), [{ date: "2026-08-31", close: 5.5 }, { date: "2026-09-08", close: 5.39 }], "2026-10-25T12:00"));
// ฐานราคา: frozen 10 · ชุดสด 10.05 → |10.05/10 − 1|×100 = 0.5 ทางคณิตศาสตร์ · fp ได้ 0.5000000000000115 → ไม่นับว่าเปลี่ยน (เกณฑ์ > 0.5)
t("7b3: basis 10 → 10.05 (fp 0.5000000000000115) → priceBasisChanged false", E.outcomes(entry({ rules: { asOfBar: "2026-08-31", close: 10 } }), [{ date: "2026-08-31", close: 10.05 }], "2026-10-25T12:00").priceBasisChanged === false);
// แก้ 2026-10-26 (7b-bands): เดิม pct 1.000000000000006 → flat และ 1.01 → right/good (ขอบแถบ ±1%)
//   ตอนนี้ขอบอยู่ที่ ±2: 2.0000000000000058 (= 5.5 → 5.61) → flat ทั้งสอง · 2.01 → up ถูก · −2.01 → sell ดี
t("7b3: _internal judges use the same tolerance (pct 2.0000000000000058 → flat both; 2.01 → right/good)", E._internal.judgePrediction("up", 2.0000000000000058) === "flat" && E._internal.judgeAction("buy", 2.0000000000000058) === "flat" && E._internal.judgePrediction("down", -2.0000000000000058) === "flat" && E._internal.judgeAction("sell", -2.0000000000000058) === "flat" && E._internal.judgePrediction("up", 2.01) === "right" && E._internal.judgeAction("sell", -2.01) === "good");

console.log("== 7b-B.4 whitespace is not a number · low <= 0 means no low ==");
t("7b4: toNum of whitespace-only strings → null (not 0); padded digits still parse", E._internal.toNum(" ") === null && E._internal.toNum("\t") === null && E._internal.toNum("  \n ") === null && E._internal.toNum("") === null && E._internal.toNum(" 5 ") === 5 && E._internal.toNum("0") === 0);
// ซื้อ 1 ราคา " " (เดิมกลายเป็นราคา 0 → ขาย @100 ได้กำไร +100 เงียบ ๆ) · ตอนนี้ไม้ซื้อไม่ถูกต้อง → ข้าม + เตือน
//   ไม้ขาย 1 @100 จึงไม่มีล็อตให้จับ → matched 0 · กำไร 0 − ค่าธรรมเนียม 0 = 0 · ขายเกิน → เตือนอีกข้อ → รวม 2 คำเตือน
t("7b4: trade price \" \" → skipped with the invalid-trade warning (no phantom zero-cost lot)", (function () {
  var x = E.fifo([tr({ id: "w1", date: "2026-01-05", symbol: "NVDA", side: "buy", qty: 1, price: " " }), tr({ id: "w2", date: "2026-01-06", symbol: "NVDA", side: "sell", qty: 1, price: 100 })], {});
  return x.realized.length === 1 && x.realized[0].matchedQty === 0 && x.realized[0].oversell === true && x.realized[0].pnl === 0 && x.open.length === 0 &&
    x.warnings.length === 2 && x.warnings[0] === "NVDA: ข้อมูลไม้ไม่ครบหรือไม่ถูกต้อง ไม่ได้นำมาคิด" && /ขายมากกว่าที่บันทึกซื้อไว้/.test(x.warnings[1]);
})(), E.fifo([tr({ id: "w1", date: "2026-01-05", symbol: "NVDA", side: "buy", qty: 1, price: " " }), tr({ id: "w2", date: "2026-01-06", symbol: "NVDA", side: "sell", qty: 1, price: 100 })], {}));
t("7b4: bar low \" \" and 0 both normalize to low = close in asOfBars", (function () {
  var c = E.asOfBars([{ date: "2025-01-06", close: 100, low: " " }, { date: "2025-01-07", close: 101, low: 0 }, { date: "2025-01-08", close: 102, low: -3 }], "2025-01-08", "2025-01-09T12:00", "NVDA");
  return c.bars.length === 3 && c.bars[0].low === 100 && c.bars[1].low === 101 && c.bars[2].low === 102;
})());
// _internal.touchBounce ด้วย sma 100 ทุกแท่ง · แท่ง b ปิด 101 (ในแถบ [97, 103]) แต่ low เป็น " " หรือ 0
//   low = close 101 → แตะ · as-of ปิด 106 > 100 และ > 101 · ก่อน as-of ไม่มีแท่งปิดใต้เส้น → met, touchLow 101
//   ถ้า low " " / 0 ถูกอ่านเป็น 0 → 0 < 97 → ไม่แตะ → met false
// แก้ 2026-10-26 (7b-bands · แถบ ±3%): แท่งคั่นเดิม @103 (as-of 105) อยู่ในแถบใหม่และจะกลายเป็นการแตะสำรอง → ย้ายเป็น @104.5 · as-of 106
t("7b4: touch test treats low \" \" and low 0 as low = close", (function () {
  var sma = rep(100, 7);
  var mk = function (d, low, close) { return { date: d, low: low, close: close }; };
  var tail = [mk("c", 104.5, 104.5), mk("d", 104.5, 104.5), mk("e", 104.5, 104.5), mk("f", 104.5, 104.5), mk("g", 106, 106)];
  var sp = E._internal.touchBounce([mk("a", 104.5, 104.5), mk("b", " ", 101)].concat(tail), sma);
  var zero = E._internal.touchBounce([mk("a", 104.5, 104.5), mk("b", 0, 101)].concat(tail), sma);
  return sp.met === true && sp.touchLow === 101 && sp.touchDate === "b" && zero.met === true && zero.touchLow === 101 && zero.touchDate === "b";
})());

console.log("== 7b-B.6 FIFO: order, one currency per symbol, fees ==");
// ซื้อ NVDA 1 @3500 สกุล THB แล้วขาย 1 @110 (ไม่ระบุสกุล → USD) · เดิมได้กำไร "−3390 USD" เงียบ ๆ
//   ตอนนี้สกุลของ NVDA = THB (ไม้แรกที่ใช้ได้) → ไม้ขาย USD ถูกข้าม + เตือน · ไม่มีแถวกำไร · ไม่มี totals.USD · ล็อต THB ยังเปิด
t("7b6: THB buy + USD sell of NVDA → sell skipped with the currency warning, no realized row, totals.USD absent", (function () {
  var x = E.fifo([tr({ id: "c1", date: "2026-01-05", symbol: "NVDA", side: "buy", qty: 1, price: 3500, currency: "THB" }), tr({ id: "c2", date: "2026-01-06", symbol: "NVDA", side: "sell", qty: 1, price: 110 })], {});
  return x.realized.length === 0 && !Object.prototype.hasOwnProperty.call(x.totals, "USD") && x.totals.THB && x.totals.THB.realized === 0 &&
    x.open.length === 1 && x.open[0].qty === 1 && x.open[0].currency === "THB" && x.open[0].avgCost === 3500 &&
    x.warnings.length === 1 && x.warnings[0] === "NVDA: สกุลเงินไม่ตรงกับไม้ก่อนหน้า ไม่ได้นำมาคิด (ไม้ 2026-01-06)";
})(), E.fifo([tr({ id: "c1", date: "2026-01-05", symbol: "NVDA", side: "buy", qty: 1, price: 3500, currency: "THB" }), tr({ id: "c2", date: "2026-01-06", symbol: "NVDA", side: "sell", qty: 1, price: 110 })], {}));
t("7b6: the symbol's currency comes from the first trade in FIFO order, not input order", (function () {
  var x = E.fifo([tr({ id: "c2", date: "2026-01-06", symbol: "NVDA", side: "sell", qty: 1, price: 110 }), tr({ id: "c1", date: "2026-01-05", symbol: "NVDA", side: "buy", qty: 1, price: 3500, currency: "THB" })], {});
  return x.realized.length === 0 && x.open.length === 1 && x.open[0].currency === "THB" && x.warnings.length === 1 && /สกุลเงินไม่ตรงกับไม้ก่อนหน้า/.test(x.warnings[0]);
})());
// ค่าธรรมเนียมติดลบ = ไม้ไม่ถูกต้อง: ซื้อ 1 @100 แล้วขาย 1 @110 ค่าธรรมเนียม −50 (เดิมได้กำไร 10 + 50 = 60)
//   ตอนนี้ไม้ขายถูกข้าม + เตือน → ไม่มีกำไรที่รับรู้ · ล็อต 1 @100 ยังเปิด
//   ไม้ที่ไม่ถูกต้องไม่ใช่ "ไม้แรกที่ใช้ได้": ซื้อ THB ค่าธรรมเนียม −1 (ข้าม) แล้วซื้อ USD → สกุลของสัญลักษณ์ = USD ไม่มีคำเตือนสกุล
t("7b6: fee −50 → trade skipped with the invalid-trade warning", (function () {
  var x = E.fifo([tr({ id: "f1", date: "2026-01-05", symbol: "NVDA", side: "buy", qty: 1, price: 100 }), tr({ id: "f2", date: "2026-01-06", symbol: "NVDA", side: "sell", qty: 1, price: 110, fee: -50 })], {});
  var y = E.fifo([tr({ id: "f3", date: "2026-01-05", symbol: "AMD", side: "buy", qty: 1, price: 100, fee: -1, currency: "THB" }), tr({ id: "f4", date: "2026-01-06", symbol: "AMD", side: "buy", qty: 1, price: 100 })], {});
  return x.realized.length === 0 && x.open.length === 1 && x.open[0].qty === 1 && x.warnings.length === 1 && x.warnings[0] === "NVDA: ข้อมูลไม้ไม่ครบหรือไม่ถูกต้อง ไม่ได้นำมาคิด" &&
    y.open.length === 1 && y.open[0].currency === "USD" && y.warnings.length === 1 && y.warnings[0] === "AMD: ข้อมูลไม้ไม่ครบหรือไม่ถูกต้อง ไม่ได้นำมาคิด";
})());
// ถือ 5 @100 แล้วขาย 20 @110 ค่าธรรมเนียม 20 → จับได้ 5 · กำไร = (110 − 100)×5 − 20×5/20 = 50 − 5 = 45 · pnlPct = 45/500×100 = 9
t("7b6: oversell pro-rates the sell fee: hold 5 @100, sell 20 @110 fee 20 → matched 5, pnl 45, oversell", (function () {
  var x = E.fifo([tr({ id: "o1", date: "2026-01-05", symbol: "NVDA", side: "buy", qty: 5, price: 100 }), tr({ id: "o2", date: "2026-01-06", symbol: "NVDA", side: "sell", qty: 20, price: 110, fee: 20 })], {});
  var r = x.realized[0];
  return x.realized.length === 1 && r.matchedQty === 5 && Math.abs(r.pnl - 45) < 1e-9 && Math.abs(r.pnlPct - 9) < 1e-9 && r.oversell === true && x.open.length === 0 &&
    x.warnings.length === 1 && /ขายมากกว่าที่บันทึกซื้อไว้/.test(x.warnings[0]);
})(), E.fifo([tr({ id: "o1", date: "2026-01-05", symbol: "NVDA", side: "buy", qty: 5, price: 100 }), tr({ id: "o2", date: "2026-01-06", symbol: "NVDA", side: "sell", qty: 20, price: 110, fee: 20 })], {}).realized);
// วันเดียวกัน 2026-03-01: ขาย 10 @110 (กรอกก่อน 10:00) และซื้อ 10 @100 (กรอกทีหลัง 11:00)
//   ลำดับใหม่ (date, ซื้อก่อนขาย, createdAt) → ซื้อถูกไล่ก่อน → ขายจับครบ: (110 − 100)×10 = +100 · ไม่ขายเกิน · ไม่เหลือล็อต
//   (เดิมเรียงตาม createdAt → ขายเกินปลอม + ล็อตผี 10 @100)
t("7b6: same-day sell entered before its buy → buys first: realized +100, no oversell, no open lot", (function () {
  var x = E.fifo([tr({ id: "sd1", date: "2026-03-01", createdAt: "2026-03-01T10:00:00Z", symbol: "NVDA", side: "sell", qty: 10, price: 110 }), tr({ id: "sd2", date: "2026-03-01", createdAt: "2026-03-01T11:00:00Z", symbol: "NVDA", side: "buy", qty: 10, price: 100 })], {});
  return x.realized.length === 1 && Math.abs(x.realized[0].pnl - 100) < 1e-9 && x.realized[0].matchedQty === 10 && x.realized[0].oversell === false && x.open.length === 0 && x.warnings.length === 0;
})(), E.fifo([tr({ id: "sd1", date: "2026-03-01", createdAt: "2026-03-01T10:00:00Z", symbol: "NVDA", side: "sell", qty: 10, price: 110 }), tr({ id: "sd2", date: "2026-03-01", createdAt: "2026-03-01T11:00:00Z", symbol: "NVDA", side: "buy", qty: 10, price: 100 })], {}));
t("7b6: tradeOrder = (date, buy before sell, createdAt, input index)", (function () {
  var L = E._internal.liveTradeList([
    tr({ id: "s1", date: "2026-03-01", createdAt: "2026-03-01T01:00:00Z", symbol: "NVDA", side: "sell", qty: 1, price: 1 }),
    tr({ id: "b2", date: "2026-03-01", createdAt: "2026-03-01T09:00:00Z", symbol: "NVDA", side: "buy", qty: 1, price: 1 }),
    tr({ id: "b1", date: "2026-03-01", createdAt: "2026-03-01T08:00:00Z", symbol: "NVDA", side: "buy", qty: 1, price: 1 }),
    tr({ id: "x0", date: "2026-02-28", createdAt: "2026-03-05T00:00:00Z", symbol: "NVDA", side: "sell", qty: 1, price: 1 }),
    tr({ id: "bA", date: "2026-03-02", createdAt: "same", symbol: "NVDA", side: "buy", qty: 1, price: 1 }),
    tr({ id: "bB", date: "2026-03-02", createdAt: "same", symbol: "NVDA", side: "buy", qty: 1, price: 1 })
  ]).list;
  return L.map(function (q) { return q.id; }).join() === "x0,b1,b2,s1,bA,bB";
})());
// ซื้อกลับวันเดียวกัน: นับเป็น "ซื้อกลับ" เฉพาะเมื่อไม้ซื้อถูกกรอกทีหลังไม้ขาย (createdAt ใหม่กว่า) แม้ FIFO จะไล่ซื้อก่อนขายในวันเดียวกัน
//   ซื้อกรอก 09:00 ก่อนขาย 10:00 → ไม่ใช่ซื้อกลับ → null · ซื้อกรอก 11:00 → ซื้อกลับ (110 − 100)×100/100 = +10%
t("7b6: buyBack — same-date buy counts only when created after the sell", (function () {
  var s = tr({ id: "bs", date: "2026-03-01", createdAt: "2026-03-01T10:00:00Z", symbol: "NVDA", side: "sell", qty: 1, price: 100 });
  var early = tr({ id: "be", date: "2026-03-01", createdAt: "2026-03-01T09:00:00Z", symbol: "NVDA", side: "buy", qty: 1, price: 110 });
  var late = tr({ id: "bl", date: "2026-03-01", createdAt: "2026-03-01T11:00:00Z", symbol: "NVDA", side: "buy", qty: 1, price: 110 });
  var a = E.buyBack({ action: { kind: "sell", tradeIds: ["bs", "be"] }, symbol: "NVDA" }, [s, early]);
  var b = E.buyBack({ action: { kind: "sell", tradeIds: ["bs", "bl"] }, symbol: "NVDA" }, [s, late]);
  return a === null && b && b.buyTradeId === "bl" && Math.abs(b.diffPct - 10) < 1e-9;
})());
t("7b6: QTY_EPS comment cites the real float case 0.0157 − 0.0057 − 0.01 ≈ −1.7e-18", (function () {
  var line = fs.readFileSync(path.join(__dirname, "..", "public", "decision-journal-engine.js"), "utf8").split("\n").filter(function (l) { return /var QTY_EPS/.test(l); })[0] || "";
  return /0\.0157/.test(line) && /0\.0057/.test(line) && /1\.7e-18/.test(line) && Math.abs(0.0157 - 0.0057 - 0.01) < 1e-17 && 0.0157 - 0.0057 - 0.01 < 0;
})());

console.log("== 7b-B.7 stats: prediction accuracy per bucket · tombstones ignored ==");
// ชุด 5 แถวเดิม (a–e) · sc() ให้ predicted: bad → wrong · good → right · ช่วง 7 ของทุกแถว scored ยกเว้น e (pending)
//   against = a b c → คาดผิดทั้ง 3 → rightN 0 · wrongN 3 · judgedN 3
//   per-rule = d (right) e (pending ไม่นับ) → rightN 1 · wrongN 0 · judgedN 1
//   fear = a b c → wrongN 3 · judgedN 3 · calm = d e → rightN 1 · judgedN 1 · regret = b → wrongN 1 · judgedN 1
function pr(b) { return [b.rightN, b.wrongN, b.judgedN].join(","); }
t("7b7: against → rightN 0, wrongN 3, judgedN 3", pr(S.byCompliance.against) === "0,3,3", S.byCompliance.against);
t("7b7: per-rule → rightN 1, wrongN 0, judgedN 1", pr(S.byCompliance["per-rule"]) === "1,0,1", S.byCompliance["per-rule"]);
t("7b7: fear → rightN 0, wrongN 3, judgedN 3", pr(S.byFeeling.fear) === "0,3,3", S.byFeeling.fear);
t("7b7: calm → rightN 1, wrongN 0, judgedN 1", pr(S.byFeeling.calm) === "1,0,1", S.byFeeling.calm);
t("7b7: regret → rightN 0, wrongN 1, judgedN 1", pr(S.byFeeling.regret) === "0,1,1", S.byFeeling.regret);
t("7b7: unused feeling → 0,0,0", pr(S.byFeeling.fomo) === "0,0,0");
// สำเนา tombstone ของแถว d (ทั้ง id ใหม่ที่มี outcome ของตัวเอง และ id เดิม) ต้องไม่เปลี่ยนอะไรเลย
t("7b7: adding tombstoned copies of row d changes nothing", (function () {
  var d = rows[3];
  var delNew = Object.assign({}, d.e, { id: "d-del", deletedAt: "2026-10-20T00:00:00Z" });
  var delSame = Object.assign({}, d.e, { deletedAt: "2026-10-20T00:00:00Z" });
  var outs = rows.reduce(function (m, r) { m[r.e.id] = r.o; return m; }, {});
  outs["d-del"] = d.o;
  var Sx = E.stats(rows.map(function (r) { return r.e; }).concat([delNew, delSame]), outs);
  return JSON.stringify(Sx) === JSON.stringify(S);
})());
t("7b7: a tombstoned entry alone counts nowhere (n 0, byPrediction judged 0)", (function () {
  var x = E.stats([Object.assign({}, rows[0].e, { deletedAt: "2026-10-20T00:00:00Z" })], { a: rows[0].o });
  return x.byCompliance.against.n === 0 && x.byFeeling.fear.n === 0 && x.byPrediction.judged === 0;
})());
// ชุดใหญ่ (คิดมือจากตารางของ Task 7 ด้านบน): predicted ของ f = right (sc −4 good) · g = right · h = right (sc 2 good) · j = no-data · k = flat
//   against = a b c f j k → right f = 1 · wrong a b c = 3 · flat k → judged 1 + 3 + 1 = 5
//   per-rule = d e g → right d g = 2 · wrong 0 · judged 2 (e pending) — g เป็น hold: ผลของ action n/a แต่คาดการณ์ยังตัดสิน
//   fear = a b c f h → right f h = 2 · wrong 3 · judged 5
t("7b7: big set — against 1,3,5 · per-rule 2,0,2 · fear 2,3,5", pr(S2.byCompliance.against) === "1,3,5" && pr(S2.byCompliance["per-rule"]) === "2,0,2" && pr(S2.byFeeling.fear) === "2,3,5", [S2.byCompliance, S2.byFeeling.fear]);
t("7b7: predictions count only when the OWN horizon is scored (horizon 30, only +7 scored → judgedN 0)", (function () {
  var l = { id: "l", verdict: { compliance: "against" }, action: { kind: "buy" }, context: { feelings: ["fear"] }, view: { horizonDays: 30 } };
  var x = E.stats([l], { l: sc(5, "good") });
  return pr(x.byCompliance.against) === "0,0,0" && pr(x.byFeeling.fear) === "0,0,0" && x.byCompliance.against.n === 1;
})());

console.log("== 7b-B.8 client mirror of the server rules: itemProblems / MAX_DOC_BYTES / docBytes ==");
t("7b8: MAX_DOC_BYTES = 900000 and the new exports are functions", E.MAX_DOC_BYTES === 900000 && typeof E.itemProblems === "function" && typeof E.docBytes === "function");
// '{"a":"abc"}' = 11 อักขระ ASCII = 11 ไบต์
t("7b8: docBytes of an ASCII-only doc = 11 = Buffer.byteLength", E.docBytes({ a: "abc" }) === 11 && Buffer.byteLength(JSON.stringify({ a: "abc" }), "utf8") === 11);
// '{"t":"ก😀"}': ASCII { " t " : " " } = 8 ไบต์ · "ก" U+0E01 = 3 ไบต์ · "😀" U+1F600 (surrogate pair 2 หน่วย UTF-16) = 4 ไบต์ → 15
//   ขณะที่ .length = 8 + 1 + 2 = 11 (นับตัวอักษรจะต่ำกว่าความจริง)
t("7b8: docBytes counts Thai as 3 bytes and an emoji surrogate pair as 4 (= 15 = Buffer.byteLength)", (function () {
  var d = { t: "ก😀" };
  return E.docBytes(d) === 15 && Buffer.byteLength(JSON.stringify(d), "utf8") === 15 && JSON.stringify(d).length === 11;
})(), E.docBytes({ t: "ก😀" }));
t("7b8: docBytes equals Buffer.byteLength on a mixed doc (Thai, é, emoji, escapes, numbers)", (function () {
  var d = E.emptyDoc();
  d.entries.push({ id: "e_1", date: "2026-10-25", symbol: "PTT.BK", context: { event: "ข่าวร้าย \"ตลาดแดง\" é ü 😀😀 \n\t", feelings: ["fear"], note: "ขายแล้วลง ✓ ¥" }, review: { lesson: "" } });
  d.trades.push({ id: "t_1", date: "2026-10-25", symbol: "PTT.BK", qty: 0.0123, price: 33.5, note: "฿" });
  return E.docBytes(d) === Buffer.byteLength(JSON.stringify(d), "utf8");
})());
t("7b8: docBytes of something JSON cannot encode → 0", E.docBytes(undefined) === 0 && E.docBytes(function () {}) === 0);
// เมทริกซ์เดียวกับ 7b-A (journalItemProblems): ไม่ใช่ plain object → ["not-object"] แล้วหยุด · ที่เหลือเรียง id, date, symbol
t("7b8: itemProblems(null) → [not-object]", JSON.stringify(E.itemProblems(null)) === '["not-object"]');
t("7b8: itemProblems([]) → [not-object]", JSON.stringify(E.itemProblems([])) === '["not-object"]');
t("7b8: itemProblems({}) → [id, date, symbol]", JSON.stringify(E.itemProblems({})) === '["id","date","symbol"]', E.itemProblems({}));
t("7b8: itemProblems impossible date 2026-02-30 → [date]", JSON.stringify(E.itemProblems({ id: "e_1", date: "2026-02-30", symbol: "NVDA" })) === '["date"]');
t("7b8: itemProblems blank symbol → [symbol]", JSON.stringify(E.itemProblems({ id: "e_1", date: "2026-10-25", symbol: "  " })) === '["symbol"]');
t("7b8: itemProblems valid → []", JSON.stringify(E.itemProblems({ id: "e_1", date: "2026-10-25", symbol: "NVDA" })) === "[]");
t("7b8: itemProblems extra cases — string/number → not-object; numeric id → [id]; tombstoned valid item → []", JSON.stringify(E.itemProblems("e_1")) === '["not-object"]' && JSON.stringify(E.itemProblems(5)) === '["not-object"]' && JSON.stringify(E.itemProblems({ id: 7, date: "2026-10-25", symbol: "NVDA" })) === '["id"]' && JSON.stringify(E.itemProblems({ id: "e_1", date: "2026-10-25", symbol: "NVDA", deletedAt: "2026-10-26T00:00:00Z" })) === "[]" && JSON.stringify(E.itemProblems({ id: "", date: "2026-1-5", symbol: 5 })) === '["id","date","symbol"]');

console.log("== 7b-B.9 closed-bar cutoff at the exact minute ==");
// D = 2026-10-21 (พุธ) · TH/ASIA: แท่ง D ปิดเมื่อ now >= D 17:00 · US: แท่ง D ปิดเมื่อ now >= (D+1) 05:00 · CRYPTO: (D+1) 07:00
//   TH  2026-10-21T16:59 → 10-20 (D−1) · 17:00 → 10-21 (D)
//   US  2026-10-21T04:59 → 10-19 (D−2) · 05:00 → 10-20 (D−1)
//   CRYPTO 2026-10-21T06:59 → 10-19 (D−2) · 07:00 → 10-20 (D−1)
t("7b9: TH 16:59 → D−1", E.closedBarCutoff("TH", "2026-10-21T16:59") === "2026-10-20");
t("7b9: TH 17:00 → D", E.closedBarCutoff("TH", "2026-10-21T17:00") === "2026-10-21");
t("7b9: ASIA 17:00 → D (same table as TH)", E.closedBarCutoff("ASIA", "2026-10-21T17:00") === "2026-10-21");
t("7b9: US 04:59 → D−2", E.closedBarCutoff("US", "2026-10-21T04:59") === "2026-10-19");
t("7b9: US 05:00 → D−1", E.closedBarCutoff("US", "2026-10-21T05:00") === "2026-10-20");
t("7b9: CRYPTO 06:59 → D−2", E.closedBarCutoff("CRYPTO", "2026-10-21T06:59") === "2026-10-19");
t("7b9: CRYPTO 07:00 → D−1", E.closedBarCutoff("CRYPTO", "2026-10-21T07:00") === "2026-10-20");
t("7b9: seconds do not move the boundary (16:59:59 still D−1, 17:00:00 D)", E.closedBarCutoff("TH", "2026-10-21T16:59:59") === "2026-10-20" && E.closedBarCutoff("TH", "2026-10-21T17:00:00+07:00") === "2026-10-21");
// fixture "flat" จบศุกร์ 2025-10-17 · บันทึกวันอาทิตย์ 2025-10-19 · now จันทร์ 2025-10-20 12:00 (cutoff US = 10-19)
//   แท่งจันทร์ 2025-10-20 ที่มีในข้อมูลอยู่หลังวันบันทึก → ไม่ใช้ (ไม่ใช่ partial เพราะถูกกรองด้วยวันบันทึก)
//   as-of = ศุกร์ 10-17 · staleDays = 19 − 17 = 2 <= 7 → ok
t("7b9: weekend record date — fixture ends Friday 2025-10-17, record Sunday 2025-10-19 → as-of Friday, staleDays 2, ok", (function () {
  var withMonday = flat.concat([{ date: "2025-10-20", close: 50, low: 50 }]);
  var c = E.asOfBars(withMonday, "2025-10-19", "2025-10-20T12:00", "NVDA");
  var r = E.evaluateRules(withMonday, { date: "2025-10-19", nowBangkok: "2025-10-20T12:00", symbol: "NVDA" });
  return isWeekend("2025-10-19") && lastDate(flat) === "2025-10-17" && c.asOfBar === "2025-10-17" && c.staleDays === 2 && c.partialBarDropped === false && c.bars.length === 205 &&
    r.ok === true && r.blocked === null && r.asOfBar === "2025-10-17" && r.close === 100;
})());

console.log("== 7b-B.5 blocked: bad-input / future / stale / no-bars ==");
t("7b5: parseNow accepts YYYY-MM-DDTHH:mm, optional :ss, optional +07:00", (function () {
  var P = E._internal.parseNow;
  var a = P("2026-10-25T12:00"), b = P("2026-10-25T12:00:30"), c = P("2026-10-25T12:00+07:00"), d = P("2026-10-25T23:59:59+07:00");
  return a && a.ymd === "2026-10-25" && a.hour === 12 && a.minute === 0 && b && b.hour === 12 && c && c.ymd === "2026-10-25" && c.hour === 12 && d && d.hour === 23 && d.minute === 59;
})());
t("7b5: parseNow rejects Z, other offsets, a space for T, millis, bad clock values", ["2026-10-25T12:00Z", "2026-10-25T12:00:00Z", "2026-10-25T12:00:00.000Z", "2026-10-25T12:00+08:00", "2026-10-25T12:00-05:00", "2026-10-25T12:00+0700", "2026-10-25 12:00", "2026-10-25T24:00", "2026-10-25T12:60", "2026-10-25T12:00:60", "2026-02-30T12:00", "2026-10-25T12:00 ", ""].every(function (s) { return E._internal.parseNow(s) === null; }));
t("7b5: closedBarCutoff refuses a toISOString()-style now (would be read 7 hours off)", E.closedBarCutoff("US", "2026-10-25T06:00:00.000Z") === null && E.closedBarCutoff("US", "2026-10-25T06:00Z") === null && E.closedBarCutoff("US", "2026-10-25T06:00+07:00") === "2026-10-24");
t("7b5: isYmd rejects impossible calendar dates; leap day only in leap years", E.isYmd("2026-02-30") === false && E.isYmd("2026-02-29") === false && E.isYmd("2024-02-29") === true && E.isYmd("2026-13-01") === false && E.isYmd("2026-10-25") === true);
// fixture "flat" = 205 วันทำการ @100 จบ 2025-10-17 (ศุกร์)
function blockedOf(bars, date, now) { var r = E.evaluateRules(bars, { date: date, nowBangkok: now, symbol: "NVDA" }); return r; }
t("7b5: now with a space instead of T → bad-input, ok false (not no-bars) even though bars exist", (function () { var r = blockedOf(flat, "2025-10-17", "2027-06-01 12:00"); return r.blocked === "bad-input" && r.ok === false; })(), blockedOf(flat, "2025-10-17", "2027-06-01 12:00").blocked);
t("7b5: now ending Z or +08:00 → bad-input; +07:00 → ok", blockedOf(flat, "2025-10-17", "2025-10-20T12:00Z").blocked === "bad-input" && blockedOf(flat, "2025-10-17", "2025-10-20T12:00+08:00").blocked === "bad-input" && blockedOf(flat, "2025-10-17", "2025-10-20T12:00+07:00").ok === true);
t("7b5: entry date not a calendar-valid YYYY-MM-DD → bad-input (2026-02-30, 2025-1-6, null)", ["2026-02-30", "2025-1-6", null, ""].every(function (d) { var r = blockedOf(flat, d, "2027-01-01T12:00"); return r.blocked === "bad-input" && r.ok === false; }));
t("7b5: bad-input result keeps the safe empty shape (all na, no NaN/undefined)", (function () {
  var r = blockedOf(flat, "2026-02-30", "2027-01-01T12:00");
  return r.asOfBar === null && r.barsUsed === 0 && r.close === null && r.r1.state === "na" && r.r2.state === "na" && r.r3.dipMet === null && !/NaN|undefined|Infinity/.test(JSON.stringify(r));
})());
// อนาคต: วันที่บันทึก 2025-10-20 แต่ "วันนี้" กรุงเทพคือ 2025-10-19 → future · วันเดียวกับวันนี้ไม่ใช่อนาคต
//   2025-10-19 (อาทิตย์) เวลา 12:00 · แท่ง as-of = ศุกร์ 2025-10-17 · ห่าง 2 วัน <= 7 → ok
t("7b5: entry date after today (Bangkok) → future, ok false", (function () { var r = blockedOf(flat, "2025-10-20", "2025-10-19T12:00"); return r.blocked === "future" && r.ok === false; })(), blockedOf(flat, "2025-10-20", "2025-10-19T12:00").blocked);
t("7b5: entry date == today → not future (ok, as-of Friday 2025-10-17)", (function () { var r = blockedOf(flat, "2025-10-19", "2025-10-19T12:00"); return r.ok === true && r.blocked === null && r.asOfBar === "2025-10-17"; })());
t("7b5: zero bars + bad now → bad-input; zero bars + future → future; zero bars + valid request → no-bars", blockedOf([], "2026-10-01", "nope").blocked === "bad-input" && blockedOf([], "2026-10-26", "2026-10-25T12:00").blocked === "future" && blockedOf([], "2026-10-01", "2026-10-25T12:00").blocked === "no-bars");
// สเปก §9: as-of เก่ากว่าวันบันทึก 8 วัน → stale (> MAX_STALE_DAYS 7) · 7 วัน → ok (มีเทสต์เดิมแล้ว ล็อกคู่กันอีกครั้งที่นี่)
t("7b5: as-of 8 days before the record date → blocked stale; 7 days → ok", (function () {
  var b = mkBars("2026-01-05", rep(100, 30));
  var r8 = E.evaluateRules(b, { date: E.ymdAdd(lastDate(b), 8), nowBangkok: "2026-12-01T12:00", symbol: "NVDA" });
  var r7 = E.evaluateRules(b, { date: E.ymdAdd(lastDate(b), 7), nowBangkok: "2026-12-01T12:00", symbol: "NVDA" });
  return r8.blocked === "stale" && r8.ok === false && r7.ok === true && r7.blocked === null;
})());

// ============================================================
// Task 7b-bands — ผู้ใช้ยืนยันแถบใหม่ 2026-10-26
//   "ถ้าแตะ แล้วเด้ง หรือ เข้าไปใกล้ๆแล้วเด้ง ใช้ได้หมด 3% ได้เลย" → TOUCH_BAND_PCT = 3 (sma×0.97 ≤ low ≤ sma×1.03)
//   "ขยับ +-2% ถือว่า ทรงๆตัว" → FLAT_BAND_PCT = 2 (|pct| ≤ 2 = flat ทั้งคาดถูก/ผิด และผลของ action)
// ============================================================
console.log("== 7b-bands touch ±3% · flat ±2% ==");
t("bands: TOUCH_BAND_PCT 3, FLAT_BAND_PCT 2, EPS_PCT unchanged", E.TOUCH_BAND_PCT === 3 && E.FLAT_BAND_PCT === 2 && E.EPS_PCT === 1e-9);
// (1) เข้าใกล้จากด้านบน (ไม่ลงมาแตะเส้น): 200 @100 · 10 แท่ง @104.5 · แท่ง 210 ปิด 104 low 103 · as-of 211 ปิด 105
//   sma[210] = (189×100 + 10×104.5 + 104)/200 = 20049/200 = 100.245 → ขอบบน 3% = 103.25235 ≥ 103 → นับว่าแตะ
//     (103/100.245 − 1 = 2.75% เหนือเส้น · ขอบบน 2% เดิม = 102.2499 < 103 → แถบเก่าไม่นับ) · low 103 > sma → ไม่ได้แตะเส้นจริง
//   แท่งคั่นในหน้าต่าง 206..209: sma <= sma[209] = (190×100 + 1045)/200 = 100.225 → ขอบบน 103.23 < 104.5 → ไม่แตะ
//   as-of: sma[211] = (188×100 + 1045 + 104 + 105)/200 = 20054/200 = 100.27 · 105 > 100.27 และ > 104 · ไม่มีแท่งปิดใต้เส้น → met
//   ตัดขึ้นครั้งล่าสุดที่ index 200 → 11 แท่งก่อน as-of > 9 → reclaimHeld false → r2.buy มาจากแตะแล้วเด้งอย่างเดียว
var nearAbove = mkBars("2025-01-06", base.concat(rep(104.5, 10)).concat([104, 105]), base.concat(rep(104.5, 10)).concat([103, 105]));
t("7bb1: near from above (low 2.75% above SMA, never touches the line) then bounce → met, the only reason r2.buy is true", (function () {
  var x = evalFlat(nearAbove), tbx = x.r2.touchBounce;
  return tbx.met === true && tbx.touchDate === nearAbove[210].date && tbx.touchLow === 103 && Math.abs(tbx.touchSma - 100.245) < 1e-9 &&
    tbx.touchLow > tbx.touchSma && tbx.touchLow > tbx.touchSma * 1.02 && x.r2.reclaimHeld === false && x.r2.crossBarsAgo === 11 && x.r2.buy === true;
})(), evalFlat(nearAbove).r2);
// (2)(3) ลงใต้เส้นแล้วเด้ง ด้วยโครงเดียวกับ tbOne (แท่งคั่น @104.5 · แท่ง 205 ปิด 99 · as-of 206 ปิด 101)
//   sma[205] = 20021.5/200 = 100.1075 → ขอบล่าง 3% = 97.104275 (ขอบล่าง 2% เดิม = 98.10535)
//   low 97.2 → 97.2/100.1075 − 1 = −2.90% → ในแถบ → met (แถบเก่าไม่นับ)
//   low 96.6 → 96.6/100.1075 − 1 = −3.50% → นอกแถบ · แท่งคั่นก็ไม่แตะ → ไม่มีแท่งแตะเลย → met false, touchDate null
var dip29 = mkBars("2025-01-06", base.concat([104.5, 104.5, 104.5, 104.5, 104.5, 99, 101]), base.concat([104.5, 104.5, 104.5, 104.5, 104.5, 97.2, 101]));
var dip35 = mkBars("2025-01-06", base.concat([104.5, 104.5, 104.5, 104.5, 104.5, 99, 101]), base.concat([104.5, 104.5, 104.5, 104.5, 104.5, 96.6, 101]));
t("7bb2: dip 2.9% below SMA200 then bounce → met, r2.buy", (function () { var x = evalFlat(dip29); return x.r2.touchBounce.met === true && x.r2.touchBounce.touchDate === dip29[205].date && x.r2.touchBounce.touchLow === 97.2 && x.r2.reclaimHeld === false && x.r2.buy === true; })(), evalFlat(dip29).r2);
t("7bb3: dip 3.5% below SMA200 (insulated) → met false, no touch reported, r2.buy false", (function () { var x = evalFlat(dip35); return x.r2.touchBounce.met === false && x.r2.touchBounce.touchDate === null && x.r2.touchBounce.touchLow === null && x.r2.buy === false; })(), evalFlat(dip35).r2);
// (4) ขอบแถบรวมปลาย: sma 100.17 ทุกแท่ง (ไม่ใช่เลขกลม) · low = sma×1.03 = 103.1751 และ low = sma×0.97 = 97.1649 ต้องนับว่าแตะ
//   เอนจินคิด sma×(1 + 3/100) และ sma×(1 − 3/100) — 1 + 3/100 === 1.03 และ 1 − 3/100 === 0.97 ใน float (เช็คในเทสต์) จึงเท่ากันทุกบิต
//   เลยขอบไป 0.001 → ไม่แตะ · แท่งคั่น @104.5 (> 103.1751) · as-of ปิด 106 > 100.17 และ > close แท่งแตะ (103.2 / 99)
t("7bb4: _internal.touchBounce band edges are inclusive at sma×1.03 and sma×0.97 (sma 100.17); 0.001 beyond is outside", (function () {
  var s = 100.17, sma = rep(s, 7);
  var mk = function (d, low, close) { return { date: d, low: low, close: close }; };
  var tail = [mk("c", 104.5, 104.5), mk("d", 104.5, 104.5), mk("e", 104.5, 104.5), mk("f", 104.5, 104.5), mk("g", 106, 106)];
  var up = E._internal.touchBounce([mk("a", 104.5, 104.5), mk("b", s * 1.03, 103.2)].concat(tail), sma);
  var lo = E._internal.touchBounce([mk("a", 104.5, 104.5), mk("b", s * 0.97, 99)].concat(tail), sma);
  var upOut = E._internal.touchBounce([mk("a", 104.5, 104.5), mk("b", s * 1.03 + 0.001, 103.2)].concat(tail), sma);
  var loOut = E._internal.touchBounce([mk("a", 104.5, 104.5), mk("b", s * 0.97 - 0.001, 99)].concat(tail), sma);
  return 1 + 3 / 100 === 1.03 && 1 - 3 / 100 === 0.97 &&
    up.met === true && up.touchDate === "b" && up.touchLow === s * 1.03 && lo.met === true && lo.touchDate === "b" && lo.touchLow === s * 0.97 &&
    upOut.met === false && upOut.touchDate === null && loOut.met === false && loOut.touchDate === null;
})());
// (5) EPS ที่ขอบแถบ flat ใหม่: 5.5 → 5.61 = +2% พอดีทางทศนิยม แต่สูตรของเอนจิน (actual − ref)×100/ref ได้ 2.0000000000000058
//   (หาด้วยสคริปต์ค้นคู่ราคาทศนิยม 2 ตำแหน่งที่ actual = ref×1.02 ใน scratchpad · 100 → 102 ได้ 2 พอดีจึงใช้ไม่ได้)
//   ไม่มี EPS → 2.0000000000000058 > 2 → up ถูก · buy ดี · มี EPS → flat ทั้งสอง
t("7bb5: 5.5 → 5.61 (engine pct 2.0000000000000058, +2% in decimal) → predicted flat, actionResult flat", (function () {
  var x = E.outcomes(entry({ rules: { asOfBar: "2026-08-31", close: 5.5 } }), [{ date: "2026-08-31", close: 5.5 }, { date: "2026-09-08", close: 5.61 }], "2026-10-25T12:00");
  var p = x.horizons["7"].pct;
  return x.horizons["7"].status === "scored" && p > 2 && p === E._internal.pctChange(5.61, 5.5) && Math.abs(p - 2.0000000000000058) < 1e-15 && x.predicted === "flat" && x.actionResult === "flat";
})(), E.outcomes(entry({ rules: { asOfBar: "2026-08-31", close: 5.5 } }), [{ date: "2026-08-31", close: 5.5 }, { date: "2026-09-08", close: 5.61 }], "2026-10-25T12:00").horizons["7"]);
// (6) พ้นแถบ: 100 → 102.01 = (102.01 − 100)×100/100 = 2.010000000000005 > 2 → up ถูก · buy ดี
//            100 → 97.99 = −2.010000000000005 < −2 → down ถูก · sell ดี ("ขายแล้วลง")
t("7bb6: +2.01% → predicted right, actionResult good (up/buy); −2.01% → right/good (down/sell)", (function () {
  var a = E.outcomes(entry(), [{ date: "2026-08-31", close: 100 }, { date: "2026-09-08", close: 102.01 }], "2026-10-25T12:00");
  var b = E.outcomes(entry({ view: { direction: "down", horizonDays: 7 }, action: { kind: "sell" } }), [{ date: "2026-08-31", close: 100 }, { date: "2026-09-08", close: 97.99 }], "2026-10-25T12:00");
  return a.horizons["7"].pct > 2 && a.predicted === "right" && a.actionResult === "good" && b.horizons["7"].pct < -2 && b.predicted === "right" && b.actionResult === "good";
})());
// +1.5% (100 → 101.5 = 1.5 พอดี) เดิมพ้นแถบ 1% → up ถูก / buy ดี · ตอนนี้อยู่ในแถบ 2% → flat ทั้งสอง
//   −1.5% (100 → 98.5) ของ down/sell เดิม → ถูก / ดี · ตอนนี้ flat ทั้งสอง
t("7bb6: +1.5% (used to be right/good under ±1%) is now flat for up/buy; −1.5% flat for down/sell", (function () {
  var a = E.outcomes(entry(), [{ date: "2026-08-31", close: 100 }, { date: "2026-09-08", close: 101.5 }], "2026-10-25T12:00");
  var b = E.outcomes(entry({ view: { direction: "down", horizonDays: 7 }, action: { kind: "sell" } }), [{ date: "2026-08-31", close: 100 }, { date: "2026-09-08", close: 98.5 }], "2026-10-25T12:00");
  return a.horizons["7"].pct === 1.5 && a.predicted === "flat" && a.actionResult === "flat" && b.horizons["7"].pct === -1.5 && b.predicted === "flat" && b.actionResult === "flat";
})());
// คำอธิบายกฎ 2 ใน verdict.why อ่านตัวเลขแถบจากค่าคงที่: tbOne → แตะแล้วเด้ง (reclaimHeld false) → "แตะหรือเข้าใกล้ SMA200 (±3%) แล้วเด้ง"
t("7bb: rule-2 why reads แตะหรือเข้าใกล้ SMA200 (±3%) แล้วเด้ง (real rules object and a short one)", (function () {
  var v = E.verdictFor("buy", evalFlat(tbOne));
  var w = E.verdictFor("buy", { r1: { buy: false, sell: false, state: "flat" }, r2: { buy: true, sell: false, state: "above", reclaimHeld: false, touchBounce: { met: true } }, r3: { buy: false, dipMet: false } });
  return v.why.indexOf("กฎ 2: แตะหรือเข้าใกล้ SMA200 (±3%) แล้วเด้ง") >= 0 && v.supports.indexOf("r2") >= 0 && w.why.indexOf("กฎ 2: แตะหรือเข้าใกล้ SMA200 (±" + E.TOUCH_BAND_PCT + "%) แล้วเด้ง") >= 0 && w.compliance === "per-rule";
})(), E.verdictFor("buy", evalFlat(tbOne)).why);
// เทสต์แตะทุกตัวที่ใช้แท่งคั่น @104.5 (tb / tbOne / tbCrash / tbBelow / dip29 / dip35) ต้องมีแท่งคั่นพ้นแถบ 3% จริง
//   tbCrash / dip35 ล็อกไว้ข้างบนแล้วว่าไม่มีแท่งแตะในหน้าต่างเลย (touchDate null) · ที่นี่เช็คตรง ๆ บนแท่งคั่นล้วน (as-of 106)
t("7bb: insulating bars @104.5 never touch (sma ≤ 100.1125 → upper edge ≤ 103.116)", (function () {
  var closes = base.concat([104.5, 104.5, 104.5, 104.5, 104.5, 106]);
  var bars = mkBars("2025-01-06", closes);
  var x = E._internal.touchBounce(bars, TI.calculateSMA(closes, 200));   // as-of 205 · หน้าต่าง 200..204 = แท่งคั่นทั้งห้า
  return x.met === false && x.touchDate === null;
})());

// ============================================================
// Review-2 — ผลตรวจรอบสอง (2026-10-26) · ค่าคาดหวังคิดมือทุกตัว (เลขอยู่ในคอมเมนต์)
// ============================================================
console.log("== R2.1 outcomes wait until the feed has delivered the target bar ==");
// /api/ohlc ตั้งปลายช่วงข้อมูลที่ 00:00 UTC ของวันนี้ → แท่ง D มาถึงราว 07:00 กรุงเทพของ D+1
//   (หลักฐานใน cache ของเซิร์ฟเวอร์: .BK ที่ดึง 18:02–18:19 กรุงเทพ แท่งใหม่สุดคือ D−1 ทั้ง 7 ตัว)
// TH entry 2026-10-16 (ศุกร์) → +7 = 2026-10-23 (ศุกร์) · ref = แท่ง 10-15 ปิด 30
//   now 10-23T18:00 → cutoff TH = 10-23 (ตามตาราง แท่ง D ปิดแล้ว) แต่ชุดราคาจบที่ 10-22 ปิด 30.3
//     เดิม: actualAt ถอยไปแท่ง 10-22 (ห่าง 1 ≤ 7) → (30.3 − 30)×100/30 = 1.0000000000000024 → flat/flat และ "ถึงกำหนดทบทวน"
//     ใหม่: แท่งล่าสุด 10-22 < เป้า 10-23 และ cutoff − เป้า = 0 ≤ MAX_GAP_DAYS → pending · ไม่ถึงกำหนด
//   now 10-24T08:00 → ชุดราคามีแท่ง 10-23 ปิด 33 → (33 − 30)×100/30 = +10 → up ถูก · buy ดี · ถึงกำหนด
var lagTH = entry({ symbol: "PTT.BK", date: "2026-10-16", rules: { asOfBar: "2026-10-15", close: 30 } });
var lagTHeve = [{ date: "2026-10-15", close: 30 }, { date: "2026-10-22", close: 30.3 }];
var lagTHmorn = lagTHeve.concat([{ date: "2026-10-23", close: 33 }]);
t("R2.1: TH 18:00 on the target day while the feed still ends at D−1 → pending, nothing scored, not due", (function () {
  var x = E.outcomes(lagTH, lagTHeve, "2026-10-23T18:00"), h = x.horizons["7"];
  return h.status === "pending" && h.date === null && h.close === null && h.pct === null && x.predicted === "pending" && x.actionResult === "pending" && x.lastClosedBar === "2026-10-22" && E.reviewDue(lagTH, x) === false;
})(), E.outcomes(lagTH, lagTHeve, "2026-10-23T18:00").horizons["7"]);
t("R2.1: next morning (10-24T08:00) the feed has bar 10-23 → scored +10, right/good, due", (function () {
  var x = E.outcomes(lagTH, lagTHmorn, "2026-10-24T08:00"), h = x.horizons["7"];
  return h.status === "scored" && h.date === "2026-10-23" && h.close === 33 && Math.abs(h.pct - 10) < 1e-9 && x.predicted === "right" && x.actionResult === "good" && E.reviewDue(lagTH, x) === true;
})(), E.outcomes(lagTH, lagTHmorn, "2026-10-24T08:00").horizons["7"]);
// US sell entry 2026-10-16 → +7 = 10-23 · ref 10-15 ปิด 100
//   now 10-24T06:22 → cutoff US = 10-23 แต่ชุดราคาจบ 10-22 ปิด 97
//     เดิม: (97 − 100)×100/100 = −3 → down ถูก · sell ดี · พอ 07:30 แท่ง 10-23 ปิด 104 มาถึง → +4 → ผิด/ไม่ดี (ตัวเลขพลิก)
//     ใหม่: 06:22 → pending · 07:30 → scored (104 − 100) = +4 → wrong/bad
var lagUS = entry({ date: "2026-10-16", view: { direction: "down", horizonDays: 7 }, action: { kind: "sell" }, rules: { asOfBar: "2026-10-15", close: 100 } });
var lagUSearly = [{ date: "2026-10-15", close: 100 }, { date: "2026-10-22", close: 97 }];
var lagUSlate = lagUSearly.concat([{ date: "2026-10-23", close: 104 }]);
t("R2.1: US 06:22 (cutoff says D closed, feed ends at D−1) → pending, no −3% that later flips", (function () {
  var x = E.outcomes(lagUS, lagUSearly, "2026-10-24T06:22");
  return x.horizons["7"].status === "pending" && x.horizons["7"].pct === null && x.predicted === "pending" && x.actionResult === "pending" && E.reviewDue(lagUS, x) === false;
})(), E.outcomes(lagUS, lagUSearly, "2026-10-24T06:22").horizons["7"]);
t("R2.1: US 07:30 with bar 10-23 delivered → scored +4, wrong/bad", (function () {
  var x = E.outcomes(lagUS, lagUSlate, "2026-10-24T07:30"), h = x.horizons["7"];
  return h.status === "scored" && h.date === "2026-10-23" && Math.abs(h.pct - 4) < 1e-9 && x.predicted === "wrong" && x.actionResult === "bad";
})(), E.outcomes(lagUS, lagUSlate, "2026-10-24T07:30").horizons["7"]);
// ทางออกเมื่อแท่งเป้าหมายไม่มีวันมา (feed ขาด): cutoff เลยเป้าไปเกิน MAX_GAP_DAYS → ให้คะแนนด้วยสิ่งที่มี (actualAt ห่างได้ ≤ 7)
//   ชุดราคาจบ 10-22 · เป้า 10-23 · now 10-30T18:00 → cutoff 10-30 → 30 − 23 = 7 ≤ 7 → ยัง pending
//   now 10-31T18:00 → cutoff 10-31 → 31 − 23 = 8 > 7 → scored ด้วยแท่ง 10-22 (ห่าง 1) → 1.0000000000000024 → flat
t("R2.1: feed never delivers bar D — still pending when cutoff is exactly 7 days past the target (boundary)", E.outcomes(lagTH, lagTHeve, "2026-10-30T18:00").horizons["7"].status === "pending");
t("R2.1: feed never delivers bar D — 8 days past the target → scored with what exists (10-22, flat)", (function () {
  var x = E.outcomes(lagTH, lagTHeve, "2026-10-31T18:00"), h = x.horizons["7"];
  return h.status === "scored" && h.date === "2026-10-22" && Math.abs(h.pct - 1) < 1e-9 && x.predicted === "flat" && x.actionResult === "flat";
})(), E.outcomes(lagTH, lagTHeve, "2026-10-31T18:00").horizons["7"]);
// วันหยุดตลาดบนวันเป้า: แท่งจันทร์ 10-26 มาถึงแล้ว (แท่งล่าสุด ≥ เป้า) → ไม่ต้องรอ 7 วัน · actualAt ถอยไป 10-22 → flat
t("R2.1: holiday on the target day — a later bar (10-26) already arrived → scored at once with 10-22", (function () {
  var x = E.outcomes(lagTH, lagTHeve.concat([{ date: "2026-10-26", close: 40 }]), "2026-10-26T18:00"), h = x.horizons["7"];
  return h.status === "scored" && h.date === "2026-10-22" && h.close === 30.3;
})());
// เป้าวันเสาร์/อาทิตย์ของตลาดที่ไม่ใช่คริปโต: ไม่มีแท่งวันนั้นอยู่แล้ว → ได้ผลเมื่อแท่งศุกร์ก่อนหน้ามาถึง
//   US เป้าเสาร์ 09-12 · ชุดราคาจบพฤหัส 09-10 (แท่งศุกร์ 09-11 ยังไม่มา) · now 09-13T06:00 cutoff 09-12 → pending
//     (เดิม: scored ด้วยแท่งพฤหัส 09-10 ปิด 97 → −3)
//   US เป้าอาทิตย์: entry 2026-09-06 (อาทิตย์) → 09-13 · now 09-14T06:00 cutoff 09-13 · แท่งศุกร์ 09-11 ปิด 95 → scored −5
//   CRYPTO เป้าเสาร์ 09-12 · now 09-13T08:00 cutoff CRYPTO 09-12 · ชุดราคาจบศุกร์ 09-11 → pending (คริปโตมีแท่งวันเสาร์)
//     แท่งเสาร์ 09-12 ปิด 90 มาถึง → scored (90 − 100) = −10
t("R2.1: US Saturday target while Friday's bar has not arrived (feed ends Thursday) → pending", E.outcomes(satE, [{ date: "2026-09-04", close: 100 }, { date: "2026-09-10", close: 97 }], "2026-09-13T06:00").horizons["7"].status === "pending", E.outcomes(satE, [{ date: "2026-09-04", close: 100 }, { date: "2026-09-10", close: 97 }], "2026-09-13T06:00").horizons["7"]);
t("R2.1: US Sunday target with Friday's bar present → scored with Friday (−5)", (function () {
  var x = E.outcomes(entry({ date: "2026-09-06", rules: { asOfBar: "2026-09-04", close: 100 } }), satB, "2026-09-14T06:00"), h = x.horizons["7"];
  return h.target === "2026-09-13" && h.status === "scored" && h.date === "2026-09-11" && Math.abs(h.pct + 5) < 1e-9;
})());
t("R2.1: CRYPTO Saturday target with only Friday's bar → pending; Saturday bar arrives → scored −10", (function () {
  var c = entry({ symbol: "BTCUSD", date: "2026-09-05", rules: { asOfBar: "2026-09-04", close: 100 } });
  var a = E.outcomes(c, satB, "2026-09-13T08:00");
  var b = E.outcomes(c, satB.concat([{ date: "2026-09-12", close: 90 }]), "2026-09-13T08:00");
  return a.horizons["7"].status === "pending" && b.horizons["7"].status === "scored" && b.horizons["7"].date === "2026-09-12" && Math.abs(b.horizons["7"].pct + 10) < 1e-9;
})());

console.log("== R2.2 floating P&L never subtracts across currencies ==");
// BTCUSD ซื้อ 0.01 @ 2,000,000 THB (ซื้อผ่านกระดานไทย) · ราคาล่าสุดจาก feed = 60,000 (BTC-USD เป็น USD)
//   เดิม: 60,000×0.01 − 2,000,000×0.01 = 600 − 20,000 = −19,400 "THB" (−97%) ไม่มีคำเตือน → ตัวเลขผิดในแถบสรุป
//   ใหม่: สกุลราคา (USD) ≠ สกุลไม้ (THB) → floating null · floatingPct null · totals.THB.floating null · lastClose 60,000 ยังโชว์ · เตือน 1 ข้อ
// NVDA 10 @ 6,000 THB เทียบราคา 180 → เดิม 1,800 − 60,000 = −58,200 · ใหม่ null + เตือน
// PTT.BK ซื้อเป็น USD เทียบราคา 33 (THB) → null + เตือน
// lastCloses บอกสกุลเอง { currency: "THB", close: 2,100,000 } → ตรงกับไม้ → 2,100,000×0.01 − 20,000 = +1,000 (+5%)
t("R2.2: BTCUSD bought in THB vs a USD feed close → floating/floatingPct null, total null, lastClose kept, warned", (function () {
  var x = E.fifo([tr({ id: "bk1", date: "2026-01-05", symbol: "BTCUSD", side: "buy", qty: 0.01, price: 2000000, currency: "THB" })], { BTCUSD: { close: 60000, date: "2026-10-24", closed: true } });
  var p = x.open[0];
  return x.open.length === 1 && p.currency === "THB" && p.floating === null && p.floatingPct === null && p.lastClose === 60000 && p.priceCurrency === "USD" &&
    x.totals.THB.floating === null && x.totals.THB.realized === 0 && x.warnings.length === 1 && x.warnings[0] === "BTCUSD: ราคาล่าสุดเป็น USD แต่ไม้บันทึกเป็น THB จึงไม่คิดกำไรลอยตัว";
})(), E.fifo([tr({ id: "bk1", date: "2026-01-05", symbol: "BTCUSD", side: "buy", qty: 0.01, price: 2000000, currency: "THB" })], { BTCUSD: { close: 60000, date: "2026-10-24", closed: true } }));
t("R2.2: NVDA 10 @ 6,000 THB vs close 180 → null (not −58,200), warned; PTT.BK in USD vs THB close → null, warned", (function () {
  var x = E.fifo([tr({ id: "n1", date: "2026-01-05", symbol: "NVDA", side: "buy", qty: 10, price: 6000, currency: "THB" }), tr({ id: "p1", date: "2026-01-05", symbol: "PTT.BK", side: "buy", qty: 100, price: 1, currency: "USD" })], { NVDA: { close: 180, date: "2026-10-24", closed: true }, "PTT.BK": { close: 33, date: "2026-10-24", closed: true } });
  return x.open[0].symbol === "NVDA" && x.open[0].floating === null && x.open[1].symbol === "PTT.BK" && x.open[1].floating === null &&
    x.totals.THB.floating === null && x.totals.USD.floating === null && x.warnings.length === 2 &&
    x.warnings[0] === "NVDA: ราคาล่าสุดเป็น USD แต่ไม้บันทึกเป็น THB จึงไม่คิดกำไรลอยตัว" && x.warnings[1] === "PTT.BK: ราคาล่าสุดเป็น THB แต่ไม้บันทึกเป็น USD จึงไม่คิดกำไรลอยตัว";
})());
t("R2.2: a lastCloses entry that carries its own currency (THB) is compared against it → +1,000 (+5%), no warning", (function () {
  var x = E.fifo([tr({ id: "bk1", date: "2026-01-05", symbol: "BTCUSD", side: "buy", qty: 0.01, price: 2000000, currency: "THB" })], { BTCUSD: { close: 2100000, currency: "THB", date: "2026-10-24", closed: true } });
  var p = x.open[0];
  return Math.abs(p.floating - 1000) < 1e-6 && Math.abs(p.floatingPct - 5) < 1e-9 && p.priceCurrency === "THB" && Math.abs(x.totals.THB.floating - 1000) < 1e-6 && x.warnings.length === 0;
})());
t("R2.2: same currency (USD trade, USD feed) is unchanged: floating −50, priceCurrency USD, no warning", (function () { var p = f.open[0]; return Math.abs(p.floating + 50) < 1e-9 && p.priceCurrency === "USD" && f.warnings.length === 0; })());
t("R2.2: no price at all → no currency warning (nothing to compare)", E.fifo([tr({ id: "bk1", date: "2026-01-05", symbol: "BTCUSD", side: "buy", qty: 0.01, price: 2000000, currency: "THB" })], {}).warnings.length === 0);

console.log("== R2.3 buy-back pairs only trades in the same currency ==");
// ขาย NVDA 1 @110 (USD) แล้วผูกไม้ซื้อ 1 @3,700 THB วันหลัง → เดิม diffPerUnit 3,700 − 110 = 3,590 · diffPct = 3,590×100/110 = +3,263.6%
//   ใหม่: คนละสกุล → ไม่จับคู่ → null · ถ้ามีไม้ซื้อ USD ที่หลังกว่าอีกไม้ (@115) → จับคู่กับไม้นั้น: 115 − 110 = +5 · 5×100/110 = 4.5454…%
t("R2.3: USD sell linked to a later THB buy → null (no +3263% buy-back)", (function () {
  var s = tr({ id: "us", date: "2026-03-01", symbol: "NVDA", side: "sell", qty: 1, price: 110 });
  var b = tr({ id: "tb", date: "2026-03-05", symbol: "NVDA", side: "buy", qty: 1, price: 3700, currency: "THB" });
  return E.buyBack({ action: { kind: "sell", tradeIds: ["us", "tb"] }, symbol: "NVDA" }, [s, b]) === null;
})(), (function () { var s = tr({ id: "us", date: "2026-03-01", symbol: "NVDA", side: "sell", qty: 1, price: 110 }); var b = tr({ id: "tb", date: "2026-03-05", symbol: "NVDA", side: "buy", qty: 1, price: 3700, currency: "THB" }); return E.buyBack({ action: { kind: "sell", tradeIds: ["us", "tb"] }, symbol: "NVDA" }, [s, b]); })());
t("R2.3: a later same-currency buy is still found past a mismatched one (+5, 4.545%)", (function () {
  var s = tr({ id: "us", date: "2026-03-01", symbol: "NVDA", side: "sell", qty: 1, price: 110 });
  var b = tr({ id: "tb", date: "2026-03-05", symbol: "NVDA", side: "buy", qty: 1, price: 3700, currency: "THB" });
  var u = tr({ id: "ub", date: "2026-03-06", symbol: "NVDA", side: "buy", qty: 1, price: 115 });
  var x = E.buyBack({ action: { kind: "sell", tradeIds: ["us", "tb", "ub"] }, symbol: "NVDA" }, [s, b, u]);
  return x && x.buyTradeId === "ub" && x.diffPerUnit === 5 && Math.abs(x.diffPct - 500 / 110) < 1e-9;
})());

console.log("== R2.4 touch band compared in percent with EPS_PCT (spec §3) ==");
// sma 10.04 · low 10.3412 = +3% ทางทศนิยม · แต่ 10.04×1.03 = 10.341199999999999 < 10.3412 → ผลคูณดิบตัดทิ้ง
//   คิดเป็นเปอร์เซ็นต์: (10.3412 − 10.04)×100/10.04 = 3.0000000000000147 ≤ 3 + 1e-9 → แตะ
// sma 10.22 · low 9.9134 = −3% ทางทศนิยม · 10.22×0.97 = 9.913400000000001 > 9.9134 → ผลคูณดิบตัดทิ้ง
//   (9.9134 − 10.22)×100/10.22 = −3.000000000000013 ≥ −3 − 1e-9 → แตะ
// แท่งคั่น @10.6 (> 10.04×1.03 และ > 10.22×1.03 = 10.5266) · as-of ปิด 10.7 > sma และ > close แท่งแตะ (10.35 / 10.0)
t("R2.4: decimal-exact +3% low (sma 10.04, low 10.3412 → 3.0000000000000147%) is a touch", (function () {
  var mk = function (d, low, close) { return { date: d, low: low, close: close }; };
  var tail = [mk("c", 10.6, 10.6), mk("d", 10.6, 10.6), mk("e", 10.6, 10.6), mk("f", 10.6, 10.6), mk("g", 10.7, 10.7)];
  var x = E._internal.touchBounce([mk("a", 10.6, 10.6), mk("b", 10.3412, 10.35)].concat(tail), rep(10.04, 7));
  return 10.04 * 1.03 < 10.3412 && x.met === true && x.touchDate === "b" && x.touchLow === 10.3412;
})(), E._internal.touchBounce([{ date: "a", low: 10.6, close: 10.6 }, { date: "b", low: 10.3412, close: 10.35 }, { date: "c", low: 10.6, close: 10.6 }, { date: "d", low: 10.6, close: 10.6 }, { date: "e", low: 10.6, close: 10.6 }, { date: "f", low: 10.6, close: 10.6 }, { date: "g", low: 10.7, close: 10.7 }], rep(10.04, 7)));
t("R2.4: decimal-exact −3% low (sma 10.22, low 9.9134 → −3.000000000000013%) is a touch", (function () {
  var mk = function (d, low, close) { return { date: d, low: low, close: close }; };
  var tail = [mk("c", 10.6, 10.6), mk("d", 10.6, 10.6), mk("e", 10.6, 10.6), mk("f", 10.6, 10.6), mk("g", 10.7, 10.7)];
  var x = E._internal.touchBounce([mk("a", 10.6, 10.6), mk("b", 9.9134, 10.0)].concat(tail), rep(10.22, 7));
  return 10.22 * 0.97 > 9.9134 && x.met === true && x.touchDate === "b" && x.touchLow === 9.9134;
})());
t("R2.4: 3.001% is still outside (sma 100, low 103.001)", (function () {
  var mk = function (d, low, close) { return { date: d, low: low, close: close }; };
  var tail = [mk("c", 104.5, 104.5), mk("d", 104.5, 104.5), mk("e", 104.5, 104.5), mk("f", 104.5, 104.5), mk("g", 106, 106)];
  var x = E._internal.touchBounce([mk("a", 104.5, 104.5), mk("b", 103.001, 103.2)].concat(tail), rep(100, 7));
  return x.met === false && x.touchDate === null;
})());

console.log("== R2.5 tests that pin what earlier fixtures could not ==");
// (a) แตะหลายแท่ง แท่งลึกสุดไม่ใช่แท่งแรก: asOf−5 (index 1) low 102 = 1.02 · asOf−2 (index 4) low 99 = 0.99 → รายงาน index 4
//   sma 100 ทุกแท่ง · close ทั้งสองแท่ง (102.5 / 100.5) เหนือเส้น → ไม่มีสตรีคใต้เส้น · as-of 106 > ทั้งคู่ → ทั้งคู่ cleared
//   mutant "รายงานแท่งแรก" จะได้ index 1
t("R2.5a: deeper touch at asOf−2 after a shallower one at asOf−5 → the deeper (later) one is reported", (function () {
  var mk = function (d, low, close) { return { date: d, low: low, close: close }; };
  var x = E._internal.touchBounce([mk("d0", 104.5, 104.5), mk("d1", 102, 102.5), mk("d2", 104.5, 104.5), mk("d3", 104.5, 104.5), mk("d4", 99, 100.5), mk("d5", 104.5, 104.5), mk("d6", 106, 106)], rep(100, 7));
  return x.met === true && x.touchDate === "d4" && x.touchLow === 99;
})());
// (b) แท่งลึกสุด (index 2 low 97.5 = 0.975) ปิด 107 ≥ as-of 106 → ไม่ cleared · แท่งตื้น (index 4 low 101 = 1.01) ปิด 101.5 < 106 → cleared
//   met = true เพราะแท่งตื้น → ต้องรายงานแท่งที่ทำให้นับ (index 4) ไม่ใช่แท่งลึกสุด · mutant "รายงานแท่งลึกสุดเสมอ" จะได้ index 2
t("R2.5b: deepest touch not cleared + shallower cleared touch → met, and the cleared touch is the one reported", (function () {
  var mk = function (d, low, close) { return { date: d, low: low, close: close }; };
  var x = E._internal.touchBounce([mk("d0", 104.5, 104.5), mk("d1", 104.5, 104.5), mk("d2", 97.5, 107), mk("d3", 104.5, 104.5), mk("d4", 101, 101.5), mk("d5", 104.5, 104.5), mk("d6", 106, 106)], rep(100, 7));
  return x.met === true && x.touchDate === "d4" && x.touchLow === 101 && x.touchSma === 100;
})());
// (c) ขอบแถบทรงตัวแคบ ๆ: 100 → 102.001 = (102.001 − 100)×100/100 = 2.0010000000000048 > 2 → up ถูก · buy ดี
//   mutant แถบ 2 → 2.005 จะได้ flat
t("R2.5c: +2.001% → predicted right, actionResult good (pins the band within 0.001)", (function () {
  var x = E.outcomes(entry(), [{ date: "2026-08-31", close: 100 }, { date: "2026-09-08", close: 102.001 }], "2026-10-25T12:00");
  return x.horizons["7"].pct > 2.0009 && x.horizons["7"].pct < 2.0011 && x.predicted === "right" && x.actionResult === "good";
})());
// (d) กฎ 1 na อย่างเดียว กฎ 2 ใช้ได้ (ซื้อเข้ากฎ 2) → ตัดสินจากกฎ 2: per-rule · supports r2 · mutant "unknown เมื่อ r1 na" จะได้ unknown
t("R2.5d: r1 na alone with r2 buy → per-rule (not unknown), supports r2", (function () {
  var v = E.verdictFor("buy", { r1: { state: "na", buy: null, sell: null }, r2: { state: "above", buy: true, sell: false, reclaimHeld: true }, r3: { buy: false, dipMet: false } });
  return v.compliance === "per-rule" && v.supports.join() === "r2" && v.opposes.length === 0 && /กฎ 1: ข้อมูลไม่พอ/.test(v.why);
})());

console.log("== R2.7 ES5 hygiene covers ES2015+ library methods too ==");
// รายการใน Global Constraints + Object.assign/entries/values · String repeat/startsWith/endsWith/padStart/padEnd · findIndex · Number.is* · Array.from
//   endsWith ตรวจเฉพาะรูปเมธอด ".endsWith(" เพราะเอนจินมีฟังก์ชันของตัวเองชื่อ endsWith(s, suffix)
//   Task 8 ใช้ฟังก์ชันเดียวกันกับ decision-journal-page.js (ตรวจที่นี่ด้วยถ้าไฟล์มีแล้ว)
function stripComments(s) { return s.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, ""); }
var ES5_RULES = [
  ["arrow", /=>/], ["const", /\bconst\s/], ["let", /\blet\s/], ["template literal", /`/], ["class", /\bclass\s/], ["optional chaining", /\?\./],
  ["Array includes/fill/find", /\.(includes|fill|find)\(/],
  ["ES2015+ library", /Object\.(assign|entries|values)|\.repeat\(|\.startsWith\(|\.endsWith\(|\.padStart\(|\.padEnd\(|\.findIndex\(|Number\.is(Finite|NaN|Integer)|Array\.from/]
];
function es5Problems(code) {
  var out = [];
  ES5_RULES.forEach(function (r) { var m = r[1].exec(code); if (m) out.push(r[0] + ": " + m[0]); });
  return out;
}
t("R2.7: the ES5 check flags every listed ES2015+ method form", ["Object.assign({}, a)", "Object.entries(o)", "Object.values(o)", "s.repeat(2)", "s.startsWith(\"a\")", "s.endsWith(\"a\")", "s.padStart(2)", "s.padEnd(2)", "a.findIndex(f)", "Number.isFinite(x)", "Number.isNaN(x)", "Number.isInteger(x)", "Array.from(x)", "a.includes(1)", "a.find(f)", "x?.y", "var f = () => 1"].every(function (s) { return es5Problems(s).length > 0; }));
t("R2.7: the ES5 check does not flag ES5 code or the engine's own endsWith(s, suffix) helper", es5Problems("function endsWith(s, x) { return s; } if (endsWith(s, \".BK\")) {} var n = isFinite(x); s.replace(/a/g, \"\");").length === 0);
t("R2.7: engine passes the extended ES5 check", es5Problems(stripComments(src)).length === 0, es5Problems(stripComments(src)));
t("R2.7: page file (when it exists) passes the same ES5 check", (function () {
  var p = path.join(__dirname, "..", "public", "decision-journal-page.js");
  if (!fs.existsSync(p)) return true;
  return es5Problems(stripComments(fs.readFileSync(p, "utf8"))).length === 0;
})());

console.log("== R2.8 stats: prediction ratio has its own n gate · unjudged count ==");
// spec §5.6: n < 3 → ไม่แสดงสัดส่วน · "สัดส่วนคาดถูก" = rightN/judgedN จึงต้องมีประตูของตัวเอง predEnough = judgedN ≥ MIN_STAT_N
//   (ก) 4 รายการ hold ที่คาดการณ์ถูกตัดสินแล้ว: scoredN 0 (hold ไม่มีผลของ action) · judgedN 4 → enough false · predEnough true
//   (ข) 3 รายการซื้อ scored · คาดการณ์ตัดสินได้ 1 (right) · อีก 2 ไม่แน่ใจ (predicted n/a) → scoredN 3 enough true · judgedN 1 predEnough false
//       byPrediction: right 1 · unjudged 2 (ช่วงของตัวเอง scored แต่ไม่ได้คาดทิศ) · judged 1
//   (ค) ไม่แน่ใจ แต่ช่วงของตัวเองยัง pending → ไม่นับใน unjudged (ยังไม่ถึงเวลา)
function holdRow(id) { return en(id, "per-rule", "hold", ["calm"], { horizons: { "7": { status: "scored", pct: 5 } }, actionResult: "n/a", predicted: "right" }); }
function unsureRow(id, pct) { return en(id, "against", "buy", ["fear"], { horizons: { "7": { status: "scored", pct: pct } }, actionResult: pct > 2 ? "good" : "bad", predicted: "n/a" }); }
t("R2.8: four judged hold entries → judgedN 4, enough false (no action results), predEnough true", (function () {
  var L = [holdRow("h1"), holdRow("h2"), holdRow("h3"), holdRow("h4")];
  var x = E.stats(L.map(function (r) { return r.e; }), L.reduce(function (m, r) { m[r.e.id] = r.o; return m; }, {}));
  var b = x.byCompliance["per-rule"];
  return b.n === 4 && b.scoredN === 0 && b.judgedN === 4 && b.rightN === 4 && b.enough === false && b.predEnough === true && x.byFeeling.calm.predEnough === true;
})());
t("R2.8: scoredN 3 but judgedN 1 → enough true, predEnough false; byPrediction right 1, unjudged 2", (function () {
  var L = [en("u1", "against", "buy", ["fear"], sc(5, "good")), unsureRow("u2", 4), unsureRow("u3", -4),
    en("u4", "against", "buy", ["fear"], { horizons: { "7": { status: "pending" } }, actionResult: "pending", predicted: "n/a" })];
  var x = E.stats(L.map(function (r) { return r.e; }), L.reduce(function (m, r) { m[r.e.id] = r.o; return m; }, {}));
  var b = x.byCompliance.against;
  return b.n === 4 && b.scoredN === 3 && b.enough === true && b.judgedN === 1 && b.predEnough === false && x.byFeeling.fear.predEnough === false &&
    x.byPrediction.right === 1 && x.byPrediction.judged === 1 && x.byPrediction.unjudged === 2 && x.byPrediction.enough === false;
})());
// byPrediction นับเฉพาะเมื่อช่วงของตัวเอง scored (เหมือน rightN/judgedN ของแต่ละกลุ่ม) · เดิมนับ outcome.predicted ตรง ๆ
//   ช่วงของตัวเอง 30 แต่มีแค่ +7 scored พร้อม predicted "right" (outcome ปลอม) → byPrediction right 0 · judged 0 · unjudged 0
t("R2.8: byPrediction counts only own-horizon-scored predictions (horizon 30, only +7 scored → 0)", (function () {
  var l = { id: "l", verdict: { compliance: "against" }, action: { kind: "buy" }, context: { feelings: [] }, view: { horizonDays: 30 } };
  var x = E.stats([l], { l: sc(5, "good") });
  return x.byPrediction.right === 0 && x.byPrediction.judged === 0 && x.byPrediction.unjudged === 0 && x.byCompliance.against.judgedN === 0;
})());
t("R2.8: existing fixtures — unjudged 0 for both; against predEnough true (judged 3), per-rule false (judged 1)", S.byPrediction.unjudged === 0 && S2.byPrediction.unjudged === 0 && S.byCompliance.against.predEnough === true && S.byCompliance["per-rule"].predEnough === false);

console.log("== R2.9 tombstones are small and always server-valid ==");
// tombstone เดิมเก็บเนื้อหาทั้งก้อน → (1) ลบรายการเพื่อคืนพื้นที่ตอนชนเพดาน 900,000 ไบต์ไม่ได้ (doc ไม่เล็กลง)
//   (2) รายการเสีย (date 2026-02-30 / symbol ว่าง) ที่ลบแล้วยังทำให้เซิร์ฟเวอร์ปฏิเสธทั้ง doc ตลอดไป
// ตอนนี้ tombstone เหลือเฉพาะ id · date · symbol · createdAt · updatedAt · deletedAt
//   date ที่ใช้ไม่ได้ → วันที่จากตราประทับ (10 ตัวแรกของ nowIso) · ไม่ได้อีก → "1970-01-01" · symbol ว่าง/ไม่ใช่สตริง → "-"
// รายการใหญ่: event = "ก" × 50,000 = 150,000 ไบต์ → หลังลบ doc ต้องเล็กกว่า 400 ไบต์
t("R2.9: tombstone strips content to the merge/server keys and shrinks the doc", (function () {
  var bigEntry = { id: "e_big", createdAt: "2026-10-20T09:00:00Z", updatedAt: "2026-10-20T09:00:00Z", deletedAt: null, date: "2026-10-20", symbol: "NVDA",
    context: { event: new Array(50001).join("ก"), feelings: ["fear"], note: "x" }, view: { direction: "up", horizonDays: 7 }, action: { kind: "buy", tradeIds: ["t1"] }, rules: { close: 1 }, verdict: { compliance: "against" }, review: { lesson: "y" } };
  var doc = { v: 1, updatedAt: null, entries: [bigEntry], trades: [] };
  var before = E.docBytes(doc);
  var r = E.tombstone(bigEntry, "2026-10-26T03:00:00.000Z");
  return r === bigEntry && before > 150000 && E.docBytes(doc) < 400 && Object.keys(bigEntry).sort().join() === "createdAt,date,deletedAt,id,symbol,updatedAt" &&
    bigEntry.date === "2026-10-20" && bigEntry.symbol === "NVDA" && bigEntry.deletedAt === "2026-10-26T03:00:00.000Z" && bigEntry.updatedAt === "2026-10-26T03:00:00.000Z" && E.itemProblems(bigEntry).length === 0;
})());
t("R2.9: tombstoning a malformed item repairs date/symbol so itemProblems is empty", (function () {
  var bad = { id: "t_bad", date: "2026-02-30", symbol: "", side: "buy", qty: 1, price: 1 };
  var bad2 = { id: "e_bad", date: 20261020, symbol: "  " };
  var bad3 = { id: "e_bad3", date: "nope" };
  E.tombstone(bad, "2026-10-26T03:00:00.000Z");
  E.tombstone(bad2, "2026-10-27T01:00:00+07:00");
  E.tombstone(bad3, "later");
  return bad.date === "2026-10-26" && bad.symbol === "-" && !("qty" in bad) && E.itemProblems(bad).length === 0 &&
    bad2.date === "2026-10-27" && bad2.symbol === "-" && E.itemProblems(bad2).length === 0 &&
    bad3.date === "1970-01-01" && bad3.symbol === "-" && E.itemProblems(bad3).length === 0;
})());
t("R2.9: a newer stripped tombstone still wins the merge over the older full copy (both orders)", (function () {
  var full = { id: "e1", createdAt: "2026-10-01T10:00:00Z", updatedAt: "2026-10-01T10:00:00Z", date: "2026-10-01", symbol: "NVDA", review: { lesson: "old" } };
  var del = E.tombstone({ id: "e1", createdAt: "2026-10-01T10:00:00Z", updatedAt: "2026-10-01T10:00:00Z", date: "2026-10-01", symbol: "NVDA", review: { lesson: "old" } }, "2026-10-02T00:00:00Z");
  var a = E.mergeDocs({ entries: [full] }, { entries: [del] }).entries[0], b = E.mergeDocs({ entries: [del] }, { entries: [full] }).entries[0];
  return a.deletedAt === "2026-10-02T00:00:00Z" && b.deletedAt === "2026-10-02T00:00:00Z" && !("review" in a) && E.liveEntries({ entries: [a] }).length === 0;
})());

// ---- สรุป (ต้องอยู่ท้ายสุดเสมอ · section ใหม่ให้แทรกเหนือบรรทัดนี้) ----
console.log("");
console.log(pass + fail + " checks · " + pass + " passed · " + fail + " failed");
process.exit(fail ? 1 : 0);
