"use strict";
// ============================================================
// HOME ACTION — เทสต์ชั้นเอนจินของ "กล่อง Action ประจำวัน" (pure · ไม่ออกเน็ต)
//   node scripts/home-action-engine-test.js
//
// สิ่งที่ล็อกไว้ (Task 1 · detectEvents):
//   1. สัญญาณ = เหตุการณ์ (แท่งที่เงื่อนไขพลิกจากไม่จริงเป็นจริง) ไม่ใช่สถานะ — ไล่ทีละแท่งย้อนหลัง LOOKBACK_BARS
//   2. กฎ 2 นับที่ "แท่งยืนยัน" (แท่งที่สองหลังข้าม SMA200) · ยืนได้ชนะเด้งเมื่อเกิดแท่งเดียวกัน · เด้งหนึ่งรอบมีครั้งเดียว
//   3. กฎ 3 หนึ่งรอบย่อมีสัญญาณครั้งเดียว · รอบใหม่ต้องฟื้นดีกว่า −10% ก่อน (hysteresis)
//   4. แท่งที่ยังไม่ปิดตลาดไม่ถูกนับ (กติกา closedBarCutoff ของ decision-journal-engine)
//   5. ไฟล์เอนจินเป็น ES5 ล้วน
// งานถัดไปต่อท้าย section ใหม่ "เหนือ" บรรทัดสรุปท้ายไฟล์ ห้ามเขียนทับ section เดิม
// ============================================================
var fs = require("fs");
var path = require("path");
var HA = require("../public/home-action-engine.js");
var E = require("../public/decision-journal-engine.js");

var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; return; }
  fail++;
  console.error("  ✗ " + name + (extra !== undefined ? "  → " + JSON.stringify(extra) : ""));
}

// ---- fixture helpers (คัดลอกจาก decision-journal-test / home-rules-test · ไม่ require ไฟล์เทสต์อื่น) ----
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
// แท่งเฉพาะวันทำการที่ "จบ" ที่ endYmd (นับถอยหลังแบบ home-rules-test)
function mkBarsEnd(endYmd, closes) {
  var dates = [], d = endYmd;
  while (dates.length < closes.length) { if (!isWeekend(d)) dates.unshift(d); d = E.ymdAdd(d, -1); }
  return closes.map(function (c, i) { return { date: dates[i], open: c, high: c, low: c, close: c, volume: 1000 }; });
}
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
// เวลาเทสต์ 2026-10-29T12:00 กรุงเทพ → หุ้นสหรัฐ (NVDA) ปิดถึง 2026-10-28
var NOW = "2026-10-29T12:00";

console.log("== constants ==");
t("constants match the interface", HA.VERSION === "ha-1" && HA.WINDOW_DAYS === 3 && HA.LOOKBACK_BARS === 45 && HA.DIP_RESET_PCT === -10 &&
  HA.SUMMARY_DAYS === 90 && HA.HORIZONS.join() === "7,30" && HA.SOURCE === "home-action" &&
  HA.RULE_LABEL[1] === "กฎ 1 EMA12/26" && HA.RULE_LABEL[2] === "กฎ 2 SMA200" && HA.RULE_LABEL[3] === "กฎ 3 ย่อ ≥20%");

console.log("== detectEvents ==");
function det(bars, sym) { return HA.detectEvents(bars, { symbol: sym || "NVDA", nowBangkok: NOW, D: E }); }
function last(bars) { return bars[bars.length - 1].date; }
// กฎ 2 ขาย: ราบ 100 ×260 แล้ว 90,90,90 → หลุดยืนยันบนแท่ง 90 ที่สอง
var b2s = mkBars("2025-10-01", rep(100, 260).concat([90, 90, 90]));
var r = det(b2s);
function ofRule(res, n) { return res.events.filter(function (e) { return e.rule === n; }); }
// หมายเหตุ: การร่วงจากราบทำให้ EMA12 ตัดลง EMA26 บนแท่งแรกด้วย (เหตุการณ์กฎ 1) — ทุก assertion จึงกรองตามกฎ
t("rule2 sell event on the 2nd bar below (confirmation bar), exactly one", ofRule(r, 2).length === 1 && ofRule(r, 2)[0].side === "sell" && ofRule(r, 2)[0].kind === "break" && ofRule(r, 2)[0].date === b2s[261].date && ofRule(r, 2)[0].close === 90 && ofRule(r, 2)[0].detail.crossDate === b2s[260].date, r.events);
t("the same drop also yields the rule1 cross-down on the first 90 bar", ofRule(r, 1).length === 1 && ofRule(r, 1)[0].side === "sell" && ofRule(r, 1)[0].date === b2s[260].date);
t("eventKey", HA.eventKey(ofRule(r, 2)[0]) === "NVDA|2|sell|" + b2s[261].date);
// กฎ 2 ซื้อ (ยืนได้): ราบ 100 ×260 · 90 ×3 · 110 ×3 → reclaim บนแท่ง 110 ที่สอง (แท่งเดียวกับที่ bounce เข้าเงื่อนไขด้วย → หนึ่งเหตุการณ์) · ไม่ซ้ำบนแท่งที่สาม
var b2b = mkBars("2025-10-01", rep(100, 260).concat([90, 90, 90, 110, 110, 110]));
var r2 = det(b2b);
t("rule2 buy once on the 2nd bar above (reclaim beats bounce on the same bar); the break event is also present", ofRule(r2, 2).filter(function (e) { return e.side === "buy"; }).length === 1 && ofRule(r2, 2).filter(function (e) { return e.side === "buy"; })[0].date === b2b[264].date && ofRule(r2, 2).filter(function (e) { return e.side === "buy"; })[0].kind === "reclaim" && ofRule(r2, 2).filter(function (e) { return e.kind === "break"; }).length === 1, r2.events);
// กฎ 2 เด้ง: 100 ×200 · 110 ×60 (SMA200 ≈ 103 · low 110 ห่าง > 3% ไม่นับแตะ) · แท่ง A low 104 close 109 (แตะ ≈ +0.9%) · แท่ง B close 110 (เด้ง) · 111 · 112
//   → bounce บนแท่ง B (ดัชนี 261) touchDate = A (260) · แท่งต่อไป met ยังจริงแต่ไม่สร้างซ้ำ
var closes = rep(100, 200).concat(rep(110, 60)).concat([109, 110, 111, 112]);
var lows = rep(100, 200).concat(rep(110, 60)).concat([104, 110, 111, 112]);
var b2t = mkBars("2025-10-01", closes, lows);
var r3 = det(b2t);
t("rule2 bounce event once, on the first bar touchBounce.met turns true", ofRule(r3, 2).length === 1 && ofRule(r3, 2)[0].kind === "bounce" && ofRule(r3, 2)[0].side === "buy" && ofRule(r3, 2)[0].date === b2t[261].date && ofRule(r3, 2)[0].detail.touchDate === b2t[260].date, r3.events);
// กฎ 1: ราบ 100 ×300 แล้วไต่ขึ้น 1/แท่ง 10 แท่ง → ตัดขึ้นบนแท่งที่ TI บอก (expectedCrossAgo แบบ decision-journal-test)
var up = []; for (var i = 1; i <= 10; i++) up.push(100 + i);
var b1 = mkBars("2025-09-01", rep(100, 300).concat(up));
var r1 = det(b1);
var cAgo = expectedCrossAgo(b1.map(function (b) { return b.close; }));
t("rule1 cross-up event dated by the independent EMA calc", r1.events.filter(function (e) { return e.rule === 1; }).length === 1 && r1.events.filter(function (e) { return e.rule === 1; })[0].date === b1[b1.length - 1 - cAgo].date && r1.events.filter(function (e) { return e.rule === 1; })[0].side === "buy" && r1.events.filter(function (e) { return e.rule === 1; })[0].kind === "cross-up");
// กฎ 3: 200 ×230 · 150 ×5 → dip บนแท่ง 150 แรก (−25%) · แท่งถัดไปไม่ซ้ำ
var b3 = mkBars("2025-10-01", rep(200, 230).concat(rep(150, 5)));
var r4 = det(b3);
var dips = r4.events.filter(function (e) { return e.rule === 3; });
t("rule3 dip event once on the first bar at or below −20%", dips.length === 1 && dips[0].date === b3[230].date && dips[0].side === "buy" && dips[0].kind === "dip" && dips[0].detail.high1y === 200 && Math.abs(dips[0].detail.dd1yPct + 25) < 1e-9, dips);
// กฎ 3 re-arm: 200 ×230 · 150 ×3 · 185 ×3 (−7.5% > −10 → re-arm) · 150 ×3 → 2 เหตุการณ์
var b3b = mkBars("2025-10-01", rep(200, 230).concat(rep(150, 3)).concat(rep(185, 3)).concat(rep(150, 3)));
t("rule3 fires again only after recovering above −10%", det(b3b).events.filter(function (e) { return e.rule === 3; }).length === 2);
// กฎ 3 ไม่ re-arm ที่ −15: 200 ×230 · 150 ×3 · 170 ×3 (−15%) · 150 ×3 → 1 เหตุการณ์
var b3c = mkBars("2025-10-01", rep(200, 230).concat(rep(150, 3)).concat(rep(170, 3)).concat(rep(150, 3)));
t("rule3 does not re-fire while drawdown stays below −10%", det(b3c).events.filter(function (e) { return e.rule === 3; }).length === 1);
// รอบย่อที่เริ่มก่อนช่วงไล่ (45 แท่ง): 200 ×200 · 150 ×60 → ไม่มีเหตุการณ์กฎ 3 ในช่วงไล่
var b3d = mkBars("2025-10-01", rep(200, 200).concat(rep(150, 60)));
t("an ongoing dip that began before the lookback yields no rule3 event", det(b3d).events.filter(function (e) { return e.rule === 3; }).length === 0);
// แท่งที่ยังไม่ปิด: NOW 2026-10-29T04:00 (US ปิดถึง 2026-10-27) · สร้างแท่งให้แท่งสุดท้ายคือ 2026-10-28 ด้วย mkBarsEnd(endYmd, closes) (นับวันทำการถอยหลังแบบ home-rules-test เดิม)
var b2sx = mkBarsEnd("2026-10-28", rep(100, 260).concat([90, 90, 90]));
var rx = HA.detectEvents(b2sx, { symbol: "NVDA", nowBangkok: "2026-10-29T04:00", D: E });
t("partial (unclosed) last bar is ignored: asOfBar is 2026-10-27 and no event is dated 2026-10-28", rx.asOfBar === "2026-10-27" && rx.events.length > 0 && rx.events.every(function (e) { return e.date <= "2026-10-27"; }), [rx.asOfBar, rx.events]);
// เสริม: ตัดลงบนแท่งปิดล่าสุด (2026-10-27) และมีแท่ง 2026-10-28 ที่ยังไม่ปิดต่อท้าย → กฎ 1 ต้องมีครั้งเดียวลงวัน 27
//   (ถ้า detectEvents ไม่ตัดแท่งที่ยังไม่ปิดเอง แท่ง 28 จะได้ผลกฎ as-of 27 ซ้ำ แล้วสร้างเหตุการณ์ซ้ำลงวัน 28)
var bxEdge = mkBarsEnd("2026-10-28", rep(100, 260).concat([90, 90]));
var rxEdge = HA.detectEvents(bxEdge, { symbol: "NVDA", nowBangkok: "2026-10-29T04:00", D: E });
t("a cross on the last closed bar is not duplicated onto the unclosed bar after it", ofRule(rxEdge, 1).length === 1 && ofRule(rxEdge, 1)[0].date === "2026-10-27" && rxEdge.events.every(function (e) { return e.date <= "2026-10-27"; }), rxEdge.events);
t("no bars → ok:false, events []", (function () { var z = det([]); return z.ok === false && z.events.length === 0 && z.asOfBar === null; })());
t("events sorted oldest→newest and symbol canonical", (function () { var z = det(b2b, " nvda "); return z.events.every(function (e, i) { return i === 0 || e.date >= z.events[i - 1].date; }) && z.events[0].symbol === "NVDA"; })());

console.log("== no NaN / undefined in results ==");
// ค่าที่ไม่รู้ต้องเป็น null — เดินทุกค่าในเหตุการณ์ของทุก fixture ข้างบน
function badValues(v, at, out) {
  if (v === undefined) { out.push(at + "=undefined"); return out; }
  if (typeof v === "number" && !isFinite(v)) { out.push(at + "=" + v); return out; }
  if (v && typeof v === "object") {
    for (var k in v) { if (Object.prototype.hasOwnProperty.call(v, k)) badValues(v[k], at + "." + k, out); }
  }
  return out;
}
t("every event field is a real value or null", (function () {
  var all = [r, r2, r3, r1, r4, det(b3b), det(b3c), det(b3d), rx, rxEdge];
  var probs = [];
  all.forEach(function (res, n) { res.events.forEach(function (e, j) { badValues(e, "res" + n + ".events[" + j + "]", probs); }); });
  return probs.length === 0 || (console.error(probs), false);
})());
t("latest is the as-of evaluateRules result (ok, asOfBar) for usable bars", r.ok === true && r.asOfBar === last(b2s) && r.latest !== null && r.latest.asOfBar === last(b2s) && r.latest.close === 90);

console.log("== ES5 hygiene ==");
// ฟังก์ชันเดียวกับ decision-journal-test (R2.7) — ตรวจไฟล์เอนจินใหม่หลังตัดคอมเมนต์
function stripComments(s) { return s.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, ""); }
var ES5_RULES = [
  ["arrow", /=>/], ["const", /\bconst\s/], ["let", /\blet\s/], ["template literal", /`/], ["class", /\bclass\s/], ["optional chaining", /\?\./],
  ["Array includes/fill/find", /\.(includes|fill|find)\(/],
  ["ES2015+ library", /Object\.(assign|entries|values)|\.repeat\(|\.startsWith\(|\.endsWith\(|\.padStart\(|\.padEnd\(|\.findIndex\(|Number\.is(Finite|NaN|Integer)|Array\.from/]
];
function es5Problems(code) {
  var out = [];
  ES5_RULES.forEach(function (rule) { var m = rule[1].exec(code); if (m) out.push(rule[0] + ": " + m[0]); });
  return out;
}
var haSrc = fs.readFileSync(path.join(__dirname, "..", "public", "home-action-engine.js"), "utf8");
t("home-action-engine.js passes the ES5 check", es5Problems(stripComments(haSrc)).length === 0, es5Problems(stripComments(haSrc)));

console.log("== window · reconcile · entry (Task 2) ==");
// สิ่งที่ล็อกไว้: id ของ entry คงที่ (tombstone ยังจับคู่ได้) · หน้าต่างเห็นถึงสิ้นวัน D+3 กรุงเทพ ·
//   reconcile แยก open / expired / ignored (ก่อน launchedAt) · tombstone = ไม่บันทึกซ้ำ · entry ผ่าน validator ของเซิร์ฟเวอร์ และไม่มี view/verdict
var ev = { symbol: "NVDA", rule: 2, side: "sell", date: "2026-10-27", close: 90, kind: "break", detail: { crossDate: "2026-10-26" } };
t("entryIdOf is deterministic", HA.entryIdOf(ev) === "ha_NVDA_2_sell_2026-10-27");
var v1 = HA.visibility(ev, "2026-10-29T12:00", E);
t("visible until end of D+3 · daysLeft counts to D+3", v1.visible === true && v1.lastDay === "2026-10-30" && v1.daysLeft === 1 && v1.expired === false);
t("on D+3 itself: last day (daysLeft 0)", (function () { var v = HA.visibility(ev, "2026-10-30T23:00", E); return v.visible && v.daysLeft === 0; })());
t("D+4 → expired", (function () { var v = HA.visibility(ev, "2026-10-31T00:10", E); return v.visible === false && v.expired === true; })());
var evOld = { symbol: "NVDA", rule: 1, side: "buy", date: "2026-10-20", close: 100, kind: "cross-up", detail: {} };
var evPre = { symbol: "NVDA", rule: 3, side: "buy", date: "2026-10-01", close: 80, kind: "dip", detail: {} };
var done = HA.makeEntry(ev, { response: "done", nowIso: "2026-10-28T03:00:00.000Z", respondedAt: "2026-10-28T03:00:00.000Z", execPrice: 91, positionValue: 50000, positionCurrency: "THB", amount: null, D: E });
t("makeEntry passes the server validator and has no view/verdict", E.itemProblems(done).length === 0 && done.id === "ha_NVDA_2_sell_2026-10-27" && done.source === "home-action" && done.view === undefined && done.verdict === undefined && done.action.kind === "sell" && done.rules.asOfBar === "2026-10-27" && done.rules.close === 90 && done.ha.response === "done" && done.ha.windowEnd === "2026-10-30" && done.date === "2026-10-27");
var rec = HA.reconcile([ev, evOld, evPre], [done], { nowBangkok: "2026-10-29T12:00", launchedAt: "2026-10-10", D: E });
t("reconcile: ticked event stays open (with its entry) while visible · old event is expired-unrecorded · pre-launch event ignored", rec.open.length === 1 && rec.open[0].entry === done && rec.expired.length === 1 && rec.expired[0] === evOld && rec.ignored === 1, rec);
var tomb = E.tombstone(JSON.parse(JSON.stringify(HA.makeEntry(evOld, { response: "unanswered", nowIso: "2026-10-24T00:00:00.000Z", respondedAt: null, execPrice: null, positionValue: null, positionCurrency: null, amount: null, D: E }))), "2026-10-25T00:00:00.000Z");
t("a tombstoned entry suppresses re-recording of that event", HA.reconcile([evOld], [tomb], { nowBangkok: "2026-10-29T12:00", launchedAt: null, D: E }).expired.length === 0);
t("unanswered entry shape: response unanswered · respondedAt null · still valid for the server", (function () { var u = HA.makeEntry(evOld, { response: "unanswered", nowIso: "2026-10-24T00:00:00.000Z", respondedAt: null, execPrice: null, positionValue: null, positionCurrency: null, amount: null, D: E }); return u.ha.response === "unanswered" && u.ha.respondedAt === null && E.itemProblems(u).length === 0; })());
t("kindThai covers all six kinds in Thai", ["cross-up", "cross-down", "break", "reclaim", "bounce", "dip"].every(function (k) { return /[ก-๙]/.test(HA.kindThai(k)); }));
t("isHomeAction", HA.isHomeAction(done) && !HA.isHomeAction({ source: "manual" }) && !HA.isHomeAction(null));

console.log("== summary · impact (Task 3) ==");
// สิ่งที่ล็อกไว้: นับเฉพาะ entry ของกล่อง Action ที่ไม่ลบ ในช่วง SUMMARY_DAYS วัน · ขายกลับเครื่องหมาย (ราคาลง = ผลบวก) ·
//   followed = ทำตาม · missed = ข้าม + ไม่ได้ตอบ (ตัวเลขอ่านว่า "ถ้าทำ") · ค่าเฉลี่ยนับเฉพาะแถวที่ scored ที่ช่วงที่เลือก ·
//   เงินคิดเฉพาะแถวที่มีฐาน คีย์ตามสกุล · ไม่มี outcome = no-data ไม่ใช่ NaN
function mk(id, date, side, response, base) { return { id: id, date: date, symbol: "NVDA", source: "home-action", deletedAt: null, action: { kind: side }, rules: { asOfBar: date, close: 100 }, ha: { key: id, rule: side === "sell" ? 2 : 3, side: side, kind: side === "sell" ? "break" : "dip", response: response, positionValue: side === "sell" ? base : null, positionCurrency: base != null ? "THB" : null, amount: side === "buy" ? base : null } }; }
function oc(p7, p30) { return { horizons: { "7": { status: p7 === null ? "pending" : "scored", pct: p7 }, "30": { status: p30 === null ? "pending" : "scored", pct: p30 } } }; }
var ents = [
  mk("a", "2026-10-20", "sell", "done", 100000),      // ขายแล้ว ราคาลง 10% → +10% · +฿10,000
  mk("b", "2026-10-21", "sell", "skipped", 50000),    // ไม่ขาย ราคาลง 4% → ถ้าทำ +4% · พลาด ฿2,000
  mk("c", "2026-10-22", "buy", "done", null),          // ซื้อแล้ว ไม่ใส่เงิน ราคาขึ้น 6% → +6% · ไม่มีฐานเงิน
  mk("d", "2026-10-25", "buy", "unanswered", null),    // ไม่ได้ตอบ · 7 วันยัง pending
  mk("e", "2026-07-01", "sell", "done", 1),            // เก่ากว่า 90 วัน → ไม่นับ
  { id: "m", date: "2026-10-23", symbol: "NVDA", source: "manual", action: { kind: "buy" } }   // ไม่ใช่ home-action
];
var ocs = { a: oc(-10, -12), b: oc(-4, 2), c: oc(6, null), d: oc(null, null), e: oc(1, 1), m: oc(9, 9) };
var S = HA.summary(ents, ocs, { nowBangkok: "2026-10-29T12:00", horizonDays: 7, D: E });
t("counts by response within 90 days", S.counts.done === 2 && S.counts.skipped === 1 && S.counts.unanswered === 1 && S.counts.pending === 1 && S.counts.total === 4, S.counts);
t("followed: avg of +10 and +6 = +8 · money THB 10000 (c has no base)", S.followed.n === 2 && Math.abs(S.followed.avgPct - 8) < 1e-9 && S.followed.money.THB === 10000, S.followed);
t("missed: skipped b scored +4 (would have avoided) · unanswered d pending not counted · money −2000 missed", S.missed.n === 1 && Math.abs(S.missed.avgPct - 4) < 1e-9 && S.missed.money.THB === 2000, S.missed);
t("byRule: rule2 avg (+10,+4)=+7 · rule3 +6", Math.abs(S.byRule["2"].avgPct - 7) < 1e-9 && S.byRule["2"].n === 2 && Math.abs(S.byRule["3"].avgPct - 6) < 1e-9 && S.byRule["1"].n === 0);
t("rows newest first · pct7/pct30/status present · impact sign flips for sell", S.rows[0].id === "d" && S.rows[S.rows.length - 1].id === "a" && S.rows.length === 4 && S.rows[3].impactPct === 10 && S.rows[3].pct7 === -10 && S.rows[3].status30 === "scored" && S.rows[3].pct30 === -12);
t("horizon 30 uses the 30-day numbers and leaves c pending", (function () { var s30 = HA.summary(ents, ocs, { nowBangkok: "2026-10-29T12:00", horizonDays: 30, D: E }); return s30.followed.n === 1 && Math.abs(s30.followed.avgPct - 12) < 1e-9 && s30.counts.pending === 2; })());
t("impactMoney: no base → nulls · sell base uses positionValue", HA.impactMoney(ents[2], 6).amount === null && HA.impactMoney(ents[0], -10).amount === 10000 && HA.impactMoney(ents[0], -10).currency === "THB");
t("missing outcome → row status no-data, never NaN", (function () { var s = HA.summary([mk("z", "2026-10-26", "sell", "done", 10)], {}, { nowBangkok: "2026-10-29T12:00", horizonDays: 7, D: E }); return s.rows[0].status7 === "no-data" && s.rows[0].pct7 === null && !/NaN/.test(JSON.stringify(s)); })());
// เสริม (เกินบรีฟ): เคสขอบที่คอมเมนต์ของเอนจินสัญญาไว้ · ผลทุกตัวเก็บใน sumsEdge ไปตรวจ NaN ท้าย section
var sumsEdge = [];
t("impactPct: buy keeps sign · sell flips · flat sell is +0 (not −0) · non-number pct or unknown side → null",
  HA.impactPct(ents[2], 6) === 6 && HA.impactPct(ents[0], -10) === 10 && 1 / HA.impactPct(ents[0], 0) === Infinity &&
  HA.impactPct(ents[0], null) === null && HA.impactPct(ents[0], NaN) === null && HA.impactPct({ ha: { side: "hold" } }, 5) === null && HA.impactPct(null, 5) === null);
t("impactMoney: buy base uses amount in THB · zero/negative base → nulls · unknown pct → nulls",
  (function () { var b = mk("bb", "2026-10-22", "buy", "done", 20000); var z = mk("zz", "2026-10-22", "sell", "done", 0);
    var m1 = HA.impactMoney(b, -5), m2 = HA.impactMoney(z, -5), m3 = HA.impactMoney(ents[0], null);
    return m1.amount === -1000 && m1.currency === "THB" && m2.amount === null && m2.currency === null && m3.amount === null && m3.currency === null; })());
var delE = mk("del", "2026-10-24", "sell", "done", 100); delE.deletedAt = "2026-10-25T00:00:00.000Z";
var usdE = mk("usd", "2026-10-26", "sell", "skipped", 2000); usdE.ha.positionCurrency = "USD";
var sEdge = HA.summary([delE, usdE, mk("a", "2026-10-20", "sell", "done", 100000)], { del: oc(-50, -50), usd: oc(-10, -10), a: oc(-10, -12) }, { nowBangkok: NOW, horizonDays: 7, D: E });
sumsEdge.push(sEdge);
t("deleted entries are excluded · money is keyed per currency (USD never added into THB)", sEdge.counts.total === 2 && sEdge.missed.money.USD === 200 && !Object.prototype.hasOwnProperty.call(sEdge.missed.money, "THB") && sEdge.followed.money.THB === 10000 && !Object.prototype.hasOwnProperty.call(sEdge.followed.money, "USD"), sEdge);
var sSince = HA.summary([mk("in", "2026-07-31", "sell", "done", 100), mk("out", "2026-07-30", "sell", "done", 100)], {}, { nowBangkok: NOW, horizonDays: 7, D: E });
sumsEdge.push(sSince);
t("since = today − SUMMARY_DAYS and is inclusive", S.since === "2026-07-31" && sSince.since === "2026-07-31" && sSince.rows.length === 1 && sSince.rows[0].id === "in", sSince);
var sH = HA.summary(ents, ocs, { nowBangkok: NOW, horizonDays: 90, D: E });
sumsEdge.push(sH);
t("horizon outside HORIZONS falls back to 7 days (result reports the horizon actually used)", sH.horizonDays === 7 && S.horizonDays === 7 && sH.followed.n === S.followed.n && Math.abs(sH.followed.avgPct - S.followed.avgPct) < 1e-9);
var sBad = HA.summary(ents, ocs, { nowBangkok: "2026-10-29T05:00:00.000Z", horizonDays: 7, D: E });
sumsEdge.push(sBad);
t("unparseable now → since null · no rows · zero counts · null averages · empty money (no guessing the window)", sBad.since === null && sBad.rows.length === 0 && sBad.counts.total === 0 && sBad.followed.n === 0 && sBad.followed.avgPct === null && JSON.stringify(sBad.missed.money) === "{}" && sBad.byRule["1"].avgPct === null && sBad.byRule["3"].n === 0, sBad);
var sOdd = HA.summary([mk("q", "2026-10-26", "buy", "done", 1000)], { q: { horizons: { "7": { status: "scored", pct: NaN }, "30": { status: "weird", pct: 5 } } } }, { nowBangkok: NOW, horizonDays: 7, D: E });
sumsEdge.push(sOdd);
t("a 'scored' horizon without a real pct, or an unknown status → no-data (never NaN)", sOdd.rows[0].status7 === "no-data" && sOdd.rows[0].pct7 === null && sOdd.rows[0].status30 === "no-data" && sOdd.rows[0].pct30 === null && sOdd.rows[0].impactPct === null && sOdd.rows[0].money.amount === null && sOdd.followed.n === 0 && sOdd.counts.pending === 1, sOdd.rows);
var sTie = HA.summary([mk("t2", "2026-10-26", "sell", "done", 1), mk("t1", "2026-10-26", "buy", "done", 1), mk("t0", "2026-10-20", "buy", "done", 1)], null, { nowBangkok: NOW, horizonDays: 30, D: E });
sumsEdge.push(sTie);
t("rows: same date sorted by id ascending · outcomesById null is tolerated", sTie.rows.map(function (x) { return x.id; }).join() === "t1,t2,t0" && sTie.counts.pending === 3);
t("row shape: exactly the Row interface fields, refClose from rules.close", Object.keys(S.rows[3]).sort().join() === ["id", "date", "symbol", "rule", "side", "kind", "response", "refClose", "execPrice", "pct7", "pct30", "status7", "status30", "impactPct", "money"].sort().join() &&
  S.rows[3].refClose === 100 && S.rows[3].execPrice === null && S.rows[3].rule === 2 && S.rows[3].side === "sell" && S.rows[3].kind === "break" && S.rows[3].response === "done" && S.rows[3].money.amount === 10000 && S.rows[3].money.currency === "THB", S.rows[3]);
t("no NaN / undefined / Infinity in any summary or impactMoney result produced above", (function () {
  // ผลสองตัวของบรีฟสร้างใน IIFE — เรียกซ้ำด้วยอินพุตเดิม (เอนจิน pure จึงได้ผลเดิม)
  var all = [S,
    HA.summary(ents, ocs, { nowBangkok: "2026-10-29T12:00", horizonDays: 30, D: E }),
    HA.summary([mk("z", "2026-10-26", "sell", "done", 10)], {}, { nowBangkok: "2026-10-29T12:00", horizonDays: 7, D: E }),
    HA.impactMoney(ents[2], 6), HA.impactMoney(ents[0], -10)
  ].concat(sumsEdge);
  var probs = [];
  all.forEach(function (s, n) {
    if (/NaN|undefined|Infinity/.test(JSON.stringify(s))) probs.push("result" + n + " JSON");
    badValues(s, "result" + n, probs);   // JSON.stringify กลืน undefined / แปลง NaN เป็น null — เดินค่าจริงซ้ำอีกชั้น
  });
  return probs.length === 0 || (console.error(probs), false);
})());
t("ES5 check covers the summary code (function present · file still ES5)", /function summary\(/.test(haSrc) && /function impactMoney\(/.test(haSrc) && es5Problems(stripComments(haSrc)).length === 0, es5Problems(stripComments(haSrc)));

console.log("== final review fixes (C1 · I1 · I3) ==");
// C1: สถานะ "พร้อมยิง" ของกฎ 3 ตอนเข้าช่วงไล่ = แท่งชี้ขาดล่าสุดก่อนช่วงไล่ (dipMet → อยู่ในรอบย่อ · dd ดีกว่า −10% → พร้อม)
//   แท่งแรกของช่วงไล่อยู่ระหว่าง −10% ถึง −20% ยังไม่ได้แปลว่ารอบย่อเริ่มแล้ว — ต้องย้อนดูก่อนหน้า
function r3Dates(res) { return res.events.filter(function (e) { return e.rule === 3; }).map(function (e) { return e.date; }); }
// เคส A: ราบ 200 · ไหลลงไปยืน −15% นาน 50 แท่ง (เกินช่วงไล่ 45) · แท่งสุดท้ายหลุด −20% ครั้งแรก (158 = −21%) → ต้องเป็นเหตุการณ์
var bA = mkBarsEnd("2026-10-28", rep(200, 230).concat(rep(170, 50)).concat([158]));
var rA = det(bA);
t("C1 case A: a first-ever −20% bar after a long −15% plateau (scan starts mid-plateau) is a rule3 dip event",
  r3Dates(rA).length === 1 && r3Dates(rA)[0] === "2026-10-28" && Math.abs(ofRule(rA, 3)[0].detail.dd1yPct + 21) < 1e-9, r3Dates(rA));
// เคส C: วันแรก (ปิดถึง 10-27) แท่งแรกของช่วงไล่ยังอยู่ −9% → เห็นสัญญาณ 10-27 · วันถัดไปมีแท่งเพิ่มหนึ่งแท่ง ช่วงไล่เลื่อนไปเริ่มบนที่ราบ −15%
//   → สัญญาณเดิม (ยังอยู่ในหน้าต่าง 3 วัน) ต้องยังถูกหาเจอ ไม่หายไปเฉย ๆ
var closesC1 = rep(200, 230).concat([182]).concat(rep(170, 43)).concat([158]);
var rC1 = HA.detectEvents(mkBarsEnd("2026-10-27", closesC1), { symbol: "NVDA", nowBangkok: "2026-10-28T12:00", D: E });
var rC2 = HA.detectEvents(mkBarsEnd("2026-10-28", closesC1.concat([157])), { symbol: "NVDA", nowBangkok: "2026-10-29T12:00", D: E });
t("C1 case C: the same rule3 event (2026-10-27) is detected on two consecutive days (it does not vanish inside its window)",
  r3Dates(rC1).join() === "2026-10-27" && r3Dates(rC2).join() === "2026-10-27" &&
  HA.eventKey(ofRule(rC1, 3)[0]) === HA.eventKey(ofRule(rC2, 3)[0]), [r3Dates(rC1), r3Dates(rC2)]);
t("C1: no NaN / undefined in the new fixtures' events", (function () {
  var probs = [];
  [rA, rC1, rC2].forEach(function (res, n) { res.events.forEach(function (e, j) { badValues(e, "c1res" + n + ".events[" + j + "]", probs); }); });
  return probs.length === 0 || (console.error(probs), false);
})());
// I1 · M2: "ไม่ได้ตอบ" ที่วัดผลแล้ว นับใน missed ไม่ใช่ followed (ขาย ราคาลง 8% → ถ้าทำ +8% · ฐาน 50000 → ฿4,000)
var sUn = HA.summary([mk("un", "2026-10-21", "sell", "unanswered", 50000)], { un: oc(-8, null) }, { nowBangkok: NOW, horizonDays: 7, D: E });
t("I1·M2: a scored unanswered row lands in missed (n 1 · +8% · ฿4,000), never in followed",
  sUn.missed.n === 1 && Math.abs(sUn.missed.avgPct - 8) < 1e-9 && sUn.missed.money.THB === 4000 &&
  sUn.followed.n === 0 && sUn.followed.avgPct === null && JSON.stringify(sUn.followed.money) === "{}" && sUn.counts.unanswered === 1, sUn);
// I1 · M5: tombstone ของเหตุการณ์ที่ยังอยู่ในหน้าต่าง → ไม่อยู่ใน open (ไม่ชุบคำตอบที่ลบแล้วกลับมาพร้อมปุ่มแก้) และไม่ expired
var tombVis = E.tombstone(JSON.parse(JSON.stringify(done)), "2026-10-28T05:00:00.000Z");
var recTomb = HA.reconcile([ev], [tombVis], { nowBangkok: "2026-10-29T12:00", launchedAt: null, D: E });
t("I1·M5: a tombstone of a still-visible event keeps it out of open (and out of expired)",
  HA.visibility(ev, "2026-10-29T12:00", E).visible === true && recTomb.open.length === 0 && recTomb.expired.length === 0, recTomb);
// I3: เงินรวมคิดเฉพาะแถวที่มีฐานเงิน — บอกจำนวนแถวที่มีฐานรายสกุล (moneyN) ให้หน้าเว็บบอกว่าเงินรวมมาจากกี่รายการ
//   S: followed 2 แถวที่วัดผลแล้ว (a ขายมีฐาน · c ซื้อไม่ใส่เงิน) → THB จาก 1 แถว · missed 1 แถว (b มีฐาน) → THB จาก 1 แถว
t("I3: followed/missed carry a with-base row count per currency (followed THB 1 of n 2 · missed THB 1 of n 1) · money stays a plain number",
  S.followed.moneyN && S.followed.moneyN.THB === 1 && S.followed.n === 2 && S.followed.money.THB === 10000 &&
  S.missed.moneyN && S.missed.moneyN.THB === 1 && S.missed.n === 1 && S.missed.money.THB === 2000, [S.followed, S.missed]);
t("I3: moneyN is keyed per currency like money (USD row counted under USD only) · empty when no row has a base",
  !!sEdge.missed.moneyN && !!sEdge.followed.moneyN &&
  sEdge.missed.moneyN.USD === 1 && !Object.prototype.hasOwnProperty.call(sEdge.missed.moneyN, "THB") && sEdge.followed.moneyN.THB === 1 &&
  JSON.stringify(sBad.followed.moneyN) === "{}" && JSON.stringify(sUn.followed.moneyN) === "{}", [sEdge.missed, sEdge.followed]);
t("ES5 check still clean after the fixes", es5Problems(stripComments(fs.readFileSync(path.join(__dirname, "..", "public", "home-action-engine.js"), "utf8"))).length === 0);

// ---- สรุป (ต้องอยู่ท้ายสุดเสมอ · section ใหม่ให้แทรกเหนือบรรทัดนี้) ----
console.log("");
console.log(pass + fail + " checks · " + pass + " passed · " + fail + " failed");
process.exit(fail ? 1 : 0);
