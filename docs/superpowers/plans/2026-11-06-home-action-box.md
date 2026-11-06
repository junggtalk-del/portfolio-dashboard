# กล่อง Action ประจำวันบน /home — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** แทนการ์ด "กฎ 3 ข้อบอกอะไรวันนี้" บน /home ด้วยกล่อง Action: การ์ดต่อหุ้นที่มีสัญญาณใหม่ใน 3 วัน แต่ละบรรทัดกฎติ๊ก ทำแล้ว/ไม่ทำ ได้ เก็บลง Decision Journal แล้วสรุปผล 7/30 วันและผลต่อพอร์ตเป็นบาท

**Architecture:** เอนจินใหม่ `home-action-engine.js` (pure ES5) ไล่ `DecisionJournal.evaluateRules` ทีละแท่งย้อนหลังเพื่อหา "เหตุการณ์" ของกฎ 1-2-3 แล้วเทียบกับ entry ในเอกสาร journal (id คงที่จากคีย์เหตุการณ์) ว่าตัวไหนต้องแสดง/ต้องบันทึกเป็น ไม่ได้ตอบ และสรุปผลจาก `DecisionJournal.outcomes` เดิม · หน้า `home-action-page.js` ทำ I/O (ราคา /api/ohlc, เอกสาร `/api/portfolio?doc=journal` GET-before-PUT + ร่าง localStorage) และวาดการ์ด · หน้า /decision-journal รู้จัก entry `source:"home-action"` (แสดงป้าย, ไม่นับในสถิติ, ลบได้)

**Tech Stack:** vanilla JS ES5 (IIFE + `window.*` + `module.exports`), Node VM test harness, CDP probe ใน Chrome headless, CSS token ของ mission-control-v2.css

**Spec:** `docs/superpowers/specs/2026-11-06-home-action-box-design.md`

## Global Constraints

- ES5 เคร่งครัดในทุกไฟล์ใต้ `public/` (ห้าม `=>`, `const`, `let`, template literal) — เทสต์ทุกชุดมี assertion นี้
- ข้อความไทยทั้งหมด · ห้าม "ควรซื้อ/ควรขาย/น่าซื้อ/น่าขาย/น่าเข้า/แนะนำซื้อ/จุดเข้า/ตัดขาดทุน" และ `\b(Buy|Sell)\b` ใน HTML ที่วาด · ป้าย "ซื้อ"/"ขาย" ใช้ได้ · ต้องมีข้อความ "ตามกฎที่คุณตั้งไว้ … ไม่ใช่คำแนะนำการลงทุน" ในกล่อง
- เงินบาทวาดเป็นข้อความ `฿1,234` ให้ privacy.js ซ่อนเอง · ห้ามใส่จำนวนเงินใน attribute `title`
- ไม่เปลี่ยนนิยามกฎใน `decision-journal-engine.js` (dj-rules-1) และไม่แก้ไฟล์นั้นเลยในงานนี้
- **ห้าม commit** — ทุก "Commit" step ในแผนนี้ถูกแทนด้วยการรันเทสต์ ผู้ใช้จะสั่ง "push git" เอง
- เขียนสคริปต์/ไฟล์ด้วย Write tool เท่านั้น (ห้าม heredoc, ห้าม `node -e` ที่มี regex/backslash/backtick)
- ค่าคงที่จากสเปก: หน้าต่าง 3 วันปฏิทิน (เห็นถึงสิ้นวัน D+3 เวลากรุงเทพ) · ไล่ย้อน ≥ 30 วันปฏิทิน (ใช้ 45 แท่ง) · กฎ 3 re-arm เมื่อ drawdown > −10% · สรุปสัญญาณ 90 วันหลังสุด · ช่วงวัดผล 7 (ค่าเริ่มต้น) / 30 วัน · `source: "home-action"`
- ทุกไฟล์ที่โหลดจากหลายหน้าต้องมี `?v=` เดียวกันทุกหน้า (`scripts/site-integrity-test.js`) · ก่อนจบต้องรันทุกชุด `for f in scripts/*-test.js` ผ่านทั้งหมด (ปัจจุบัน 41 ชุด)

## Review Focus

1. สัญลักษณ์ที่ดึงราคาไม่ได้ (เน็ตล่ม / 404) ต้องไม่สร้างเหตุการณ์ ไม่บันทึก "ไม่ได้ตอบ" และการ์ดบอกว่าดึงราคาไม่ได้ — เทสต์ใน Task 4
2. เปิดหน้าตอนแท่งสหรัฐยังไม่ปิด (เช่น 04:00 กรุงเทพ) → แท่งวันล่าสุดถูกตัดทิ้ง ไม่มีเหตุการณ์จากแท่งที่ยังไม่ปิด และ "เหลือ N วัน" คิดจากวันปัจจุบัน — เทสต์ใน Task 1 (visibility) และ Task 4 (`__DJ_NOW` 04:00)
3. โหลดเอกสาร journal ไม่ได้ (GET ล้ม) → ห้ามบันทึกอัตโนมัติ (กันซ้ำ) ปุ่มติ๊กปิดพร้อมข้อความ และไม่มีการเขียนทับเอกสารด้วยของว่าง — เทสต์ใน Task 5
4. หุ้นที่เคยมีรายการแต่ไม่อยู่ใน universe แล้ว (ขายออก / ปลดธงแดง) → สรุปยังวัดผลได้ (ดึงราคาให้สัญลักษณ์ในประวัติด้วย) — เทสต์ใน Task 6
5. แท่งเดียวที่กฎ 2 เข้าทั้ง reclaim และ bounce → เหตุการณ์ซื้อกฎ 2 ครั้งเดียว (คีย์เดียวกัน) · หุ้นเดียวกันกฎ 1+2 ขาย กฎ 3 ซื้อ → แสดงทั้งสาม — เทสต์ใน Task 1

---

## File Structure

| ไฟล์ | หน้าที่ |
|---|---|
| Create `public/home-action-engine.js` | pure: หาเหตุการณ์จากแท่ง · หน้าต่าง 3 วัน · reconcile กับ entry · สร้าง entry · สรุปผล/ผลต่อพอร์ต · `window.HomeActionEngine` + `module.exports` |
| Create `public/home-action-page.js` | I/O + วาด: universe (ย้ายจาก home-rules-page) · ราคา · เอกสาร journal · ติ๊ก · สรุป/ประวัติ · mount ใน `#mcRoot` · `window.HomeAction` |
| Delete `public/home-rules-page.js`, `scripts/home-rules-test.js` | ถูกแทนที่ทั้งหมด (โค้ด universe/ราคา/mount ย้ายไปไฟล์ใหม่) |
| Modify `public/mission-control-v2.css` (บล็อก `.hr-*` บรรทัด ~328–375) | แทนด้วยบล็อก `.ha-*` |
| Modify `public/home.html` (บรรทัด 78–79) · `public/ai-cycle.html`, `public/wave3.html` (css `?v=`) | สคริปต์ใหม่ + bump css |
| Modify `public/decision-journal-page.js` (`statsNow` ~1213 · `entryRowHtml` ~1608 · `entryCard` ~1637) · `public/decision-journal.html` | รู้จัก entry home-action |
| Create `scripts/home-action-engine-test.js`, `scripts/home-action-test.js` · Modify `scripts/decision-journal-view-test.js` | เทสต์ |

---

### Task 1: เอนจิน — หาเหตุการณ์จากแท่ง (`detectEvents`)

**Files:**
- Create: `public/home-action-engine.js`
- Test: `scripts/home-action-engine-test.js`

**Interfaces:**
- Consumes: `DecisionJournal` (`evaluateRules`, `closedBarCutoff`, `marketOf`, `canonicalSymbol`, `ymdAdd`, `daysBetween`, `DIP_PCT`, `_internal.toNum`) — รับผ่าน `opts.D` หรือ `window.DecisionJournal` / `require("./decision-journal-engine.js")`
- Produces:
  - `HomeActionEngine.VERSION = "ha-1"`, `WINDOW_DAYS = 3`, `LOOKBACK_BARS = 45`, `DIP_RESET_PCT = -10`, `SUMMARY_DAYS = 90`, `HORIZONS = [7, 30]`, `SOURCE = "home-action"`, `RULE_LABEL = { 1: "กฎ 1 EMA12/26", 2: "กฎ 2 SMA200", 3: "กฎ 3 ย่อ ≥20%" }`
  - `detectEvents(bars, opts: { symbol, nowBangkok, D? }) → { ok: boolean, asOfBar: ymd|null, latest: <ผล evaluateRules ของแท่ง as-of>|null, events: Event[] }`
  - `Event = { symbol, rule: 1|2|3, side: "buy"|"sell", date: ymd, close: number, kind: "cross-up"|"cross-down"|"break"|"reclaim"|"bounce"|"dip", detail: { crossDate?: ymd, touchDate?: ymd, high1y?: number, high1yDate?: ymd, dd1yPct?: number } }` เรียงตามวันที่เก่า→ใหม่
  - `eventKey(ev) → "SYMBOL|rule|side|date"`

- [ ] **Step 1: เขียนเทสต์ที่ยังไม่ผ่าน** ใน `scripts/home-action-engine-test.js` (harness แบบ `scripts/decision-journal-test.js`: `t()`, `mkBars(startYmd, closes, lows)`, `rep`, `TI = require("../public/technical-indicators.js")`, `NOW = "2026-10-29T12:00"`, สัญลักษณ์ `"NVDA"` ตลาด US → cutoff 2026-10-28)

```js
var HA = require("../public/home-action-engine.js");
var E = require("../public/decision-journal-engine.js");
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
t("no bars → ok:false, events []", (function () { var z = det([]); return z.ok === false && z.events.length === 0 && z.asOfBar === null; })());
t("events sorted oldest→newest and symbol canonical", (function () { var z = det(b2b, " nvda "); return z.events.every(function (e, i) { return i === 0 || e.date >= z.events[i - 1].date; }) && z.events[0].symbol === "NVDA"; })());
```

- [ ] **Step 2: รันเทสต์ ต้องล้ม**

Run: `node scripts/home-action-engine-test.js`
Expected: FAIL — `Cannot find module '../public/home-action-engine.js'`

- [ ] **Step 3: สร้าง `public/home-action-engine.js`** (IIFE, `"use strict"`, header comment ไทยอธิบายสัญญา pure/ES5 แบบ decision-journal-engine) ใส่ค่าคงที่ตาม Interfaces และ `detectEvents(bars, opts)`:
  - `D = opts.D || window.DecisionJournal || require("./decision-journal-engine.js")`
  - `sym = D.canonicalSymbol(opts.symbol)` · `cutoff = D.closedBarCutoff(D.marketOf(sym), opts.nowBangkok)` · เก็บเฉพาะแท่งที่ `date <= cutoff` เรียงวัน (ใช้ `D.asOfBars(bars, cutoff, nowBangkok, sym).bars` ได้เลย)
  - ไล่แท่ง `i` จาก `n - LOOKBACK_BARS` (หรือ 0) ถึง `n-1`: `res_i = D.evaluateRules(bars, { date: bars[i].date, nowBangkok, symbol: sym, conviction: false })` และ `res_prev` ของแท่งก่อนหน้า
    - กฎ 1: `res_i.r1.crossBarsAgo === 0` → event kind `cross-up`/`cross-down`, side buy/sell, `close = res_i.close`
    - กฎ 2 ขาย: `res_i.r2.breakConfirmed === true && res_prev.r2.breakConfirmed !== true` → `break`, `detail.crossDate = bars[i - res_i.r2.crossBarsAgo].date`
    - กฎ 2 ซื้อ: `(res_i.r2.reclaimHeld || res_i.r2.touchBounce.met) === true` และของ `res_prev` ไม่จริงทั้งคู่ → หนึ่ง event (`reclaim` ถ้า reclaimHeld ไม่งั้น `bounce`) · `detail.touchDate = res_i.r2.touchBounce.touchDate` เมื่อ bounce
    - กฎ 3: `armed` เริ่ม = `dd(first) > DIP_RESET_PCT` · ทุกแท่ง: ถ้า `armed && res_i.r3.dipMet === true` → event `dip` (detail high1y/high1yDate/dd1yPct) แล้ว `armed = false` · ถ้า `!armed && dd > DIP_RESET_PCT` → `armed = true` (dd = `res_i.r3.dd1yPct`; null = ข้าม)
  - `latest = res_{n-1}`; `ok = latest.ok`; `asOfBar = latest.asOfBar`

- [ ] **Step 4: รันเทสต์ ต้องผ่าน**

Run: `node scripts/home-action-engine-test.js`
Expected: ทุกข้อผ่าน (ไม่มี ✗)

- [ ] **Step 5: ตรวจ ES5 + regression ของเอนจินเดิม**

Run: `node --check public/home-action-engine.js && node scripts/decision-journal-test.js | tail -1`
Expected: `… 0 failed` และไฟล์ใหม่ไม่มี `=>|const |let |` ` (เพิ่ม assertion ES5 ท้ายเทสต์ใหม่แบบ `es5Problems` ของ decision-journal-test)

---

### Task 2: เอนจิน — หน้าต่าง 3 วัน · reconcile กับ journal · สร้าง entry

**Files:**
- Modify: `public/home-action-engine.js`
- Test: `scripts/home-action-engine-test.js` (ต่อท้าย)

**Interfaces:**
- Produces:
  - `entryIdOf(ev) → "ha_" + symbol + "_" + rule + "_" + side + "_" + date` (id ของ entry คงที่ → tombstone ยังจับคู่ได้)
  - `visibility(ev, nowBangkok, D?) → { lastDay: ymd (= date + WINDOW_DAYS), daysLeft: number (lastDay − today ≥ 0), visible: boolean (today <= lastDay), expired: boolean }`
  - `reconcile(events, entries, opts: { nowBangkok, launchedAt: ymd|null, D? }) → { open: [{ event, entry|null, vis }], expired: Event[] (ยังไม่มี entry และ expired และ date >= launchedAt), ignored: number }` · `entries` = ทุกรายการในเอกสารรวม tombstone (จับคู่ด้วย `id === entryIdOf(ev)`) · event ที่ `date < launchedAt` → ignored
  - `makeEntry(ev, opts: { response: "done"|"skipped"|"unanswered", nowIso, respondedAt: iso|null, execPrice: number|null, positionValue: number|null, positionCurrency: string|null, amount: number|null, D? }) → entry` ตามสเปกข้อ 4: `{ id, createdAt, updatedAt, deletedAt: null, date: ev.date, symbol, label: "", source: "home-action", ha: { key, rule, side, kind, response, respondedAt, execPrice, positionValue, positionCurrency, amount, windowEnd: lastDay, detail: ev.detail }, action: { kind: ev.side, plan: "", conviction: false, tradeIds: [] }, rules: { asOfBar: ev.date, close: ev.close, version: D.RULES_VERSION }, context: { event: <ไทย: "กล่อง Action · กฎ N · <kind ไทย>">, feelings: [], note: "" }, review: { reviewedAt: null, selfVerdict: null, lesson: "" } }` — **ไม่มี `view` ไม่มี `verdict`**
  - `isHomeAction(entry) → boolean` (`entry.source === "home-action"`)
  - `kindThai(kind) → "EMA12 ตัดขึ้น EMA26" | "EMA12 ตัดลง EMA26" | "หลุด SMA200 ยืนยัน" | "ยืนเหนือ SMA200 ได้" | "แตะ SMA200 แล้วเด้ง" | "ย่อถึง 20% จาก high 1 ปี"`

- [ ] **Step 1: เขียนเทสต์ที่ยังไม่ผ่าน** (ต่อท้ายไฟล์เทสต์)

```js
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
```

- [ ] **Step 2: รันเทสต์ ต้องล้ม** — Run: `node scripts/home-action-engine-test.js` · Expected: ✗ ที่ `entryIdOf`/`visibility`/`reconcile`/`makeEntry`

- [ ] **Step 3: เพิ่มฟังก์ชันใน `public/home-action-engine.js`** ตาม Interfaces · `visibility` ใช้ `D._internal.parseNow(nowBangkok).ymd` เป็น "วันนี้" · `reconcile` สร้าง map `id → entry` จาก `entries` ทั้งหมด (รวมที่มี `deletedAt`) แล้วไล่ events: ignored ถ้า `launchedAt && ev.date < launchedAt` · ถ้ามี entry (ลบหรือไม่ก็ตาม): ลบ → ข้าม · ไม่ลบและ visible → open พร้อม entry · ไม่ลบและ expired → ไม่แสดง · ถ้าไม่มี entry: visible → open (entry null) · expired → expired[]

- [ ] **Step 4: รันเทสต์ ต้องผ่าน** — Run: `node scripts/home-action-engine-test.js` · Expected: 0 failed

---

### Task 3: เอนจิน — สรุปผลและผลต่อพอร์ต (`summary`)

**Files:**
- Modify: `public/home-action-engine.js`
- Test: `scripts/home-action-engine-test.js` (ต่อท้าย)

**Interfaces:**
- Consumes: `outcomesById[id] = D.outcomes(entry, bars, nowBangkok)` (หน้าเป็นคนคิด) · `outcome.horizons["7"|"30"] = { status: "scored"|"pending"|"no-data", pct }`
- Produces:
  - `impactPct(entry, pct) → number` = `side === "sell" ? -pct : pct` (ขาย: ราคาลง = ผลบวก)
  - `impactMoney(entry, pct) → { amount: number|null, currency: string|null }` = ฐาน × impactPct/100 · ฐาน = `ha.amount` (ซื้อ) หรือ `ha.positionValue` (ขาย) · ไม่มีฐาน → `{ amount: null, currency: null }`
  - `summary(entries, outcomesById, opts: { nowBangkok, horizonDays: 7|30, D? }) → { horizonDays, since: ymd (today − SUMMARY_DAYS), counts: { done, skipped, unanswered, pending, total }, followed: { n, avgPct, money: { THB: number } }, missed: { n, avgPct, money: { THB: number } }, byRule: { "1": { n, avgPct }, "2": {…}, "3": {…} }, rows: Row[] }`
  - `Row = { id, date, symbol, rule, side, kind, response, refClose, execPrice, pct7, pct30, status7, status30, impactPct (ช่วงที่เลือก), money: { amount, currency } }` เรียงวันที่ใหม่→เก่า · นับเฉพาะ `isHomeAction` ไม่ลบ และ `date >= since` · ค่าเฉลี่ยนับเฉพาะแถวที่ `status === "scored"` ที่ช่วงที่เลือก · `followed` = response done · `missed` = skipped + unanswered (ตัวเลขคือ "ถ้าทำ") · `money` รวมเฉพาะแถวที่มีฐานและสกุลเดียวกัน (คีย์ตามสกุล)

- [ ] **Step 1: เขียนเทสต์ที่ยังไม่ผ่าน**

```js
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
```

- [ ] **Step 2: รันเทสต์ ต้องล้ม** — Run: `node scripts/home-action-engine-test.js` · Expected: ✗ ที่ `summary`

- [ ] **Step 3: เพิ่ม `impactPct` · `impactMoney` · `summary` ใน `public/home-action-engine.js`** · avgPct = null เมื่อ n = 0 · เงินปัดเฉพาะหน้า (เอนจินส่งค่าดิบ) · `since = D.ymdAdd(today, -SUMMARY_DAYS)`

- [ ] **Step 4: รันเทสต์ ต้องผ่าน** — Run: `node scripts/home-action-engine-test.js` · Expected: 0 failed · เพิ่ม assertion ท้ายไฟล์: ไม่มี `NaN|undefined|Infinity` ใน `JSON.stringify` ของทุกผลลัพธ์ที่เทสต์สร้าง และไฟล์เอนจินเป็น ES5

---

### Task 4: หน้า — กล่อง Action (อ่านอย่างเดียว) แทนการ์ดเดิม + CSS + home.html

**Files:**
- Create: `public/home-action-page.js` (ย้าย `nowBangkok`, `lsGet/lsSet`, `holdingsNow`, `canonical`, `bucketOf`, `buildUniverse`, `packBars/unpackBars/cache*`, `getJson`, `fetchBars` + `barsInflight`, `pool`, `mount`, `watchRoot` จาก `public/home-rules-page.js` มาทั้งก้อน — ค่าคงที่ `MOUNT_ID = "haRoot"`, `CACHE_KEY = "home_rules_ohlc_v1"` (คงเดิม ใช้ cache ร่วม), `DOC_URL = "/api/portfolio?doc=journal"`, `DRAFT_KEY = "decision_journal_draft_v1"`, `LAUNCH_KEY = "home_action_launched_v1"`)
- Delete: `public/home-rules-page.js`, `scripts/home-rules-test.js`
- Modify: `public/mission-control-v2.css` แทนบล็อก `.hr-*` ทั้งหมด (จาก comment `/* ---------------- home: กฎ 3 ข้อบอกอะไรวันนี้` ถึงปิด `@media (max-width: 600px) {…}` ของบล็อกนั้น) ด้วยบล็อก `.ha-*` · `public/home.html:78-79` → `<script src="/home-action-engine.js?v=20261106-ha-1"></script>` + `<script src="/home-action-page.js?v=20261106-ha-1"></script>` (หลัง decision-journal-engine ก่อน app-navigation) · bump `mission-control-v2.css?v=20261106-mcx-11` ใน `home.html`, `ai-cycle.html`, `wave3.html`
- Test: `scripts/home-action-test.js` (ใหม่ · harness คัดลอกโครงจาก `scripts/home-rules-test.js` ก่อนลบ: sandbox DOM, fake fetch, `win.__DJ_NOW`, อ่านสคริปต์จาก home.html — `WANT = ["technical-indicators.js", "decision-journal-engine.js", "home-action-engine.js", "home-action-page.js"]`)

**Interfaces:**
- Consumes: `HomeActionEngine.detectEvents/reconcile/visibility/kindThai/RULE_LABEL` · `DecisionJournal.liveEntries/mergeDocs/emptyDoc`
- Produces: `window.HomeAction = { refresh(force) → Promise, render(), _state, _buildUniverse, _html }` · `state = { doc: null|journalDoc, docState: "idle"|"loading"|"ok"|"error", docError, launchedAt: ymd|null, rows: [{ sym, source, status: "loading"|"ok"|"stale"|"error"|"no-bars", bars, det: <detectEvents result>|null, error }], items: [{ event, entry, vis }] (จาก reconcile รวมทุกตัว), loading, loadedAt, universeNote, horizonDays: 7 }` · DOM: การ์ด `<article class="ha-card" data-ha-sym="SYM">` · บรรทัดกฎ `<div class="ha-rule" data-ha-rule="N">` · ป้าย `<span class="ha-act is-buy|is-sell">ซื้อ|ขาย</span>` · ปุ่ม `data-ha-done="<entryId>"`, `data-ha-skip="<entryId>"` (Task 5 ใส่ handler) · กล่องว่าง `<div class="ha-empty">`
- การ์ด: เฉพาะสัญลักษณ์ที่มี item visible อย่างน้อย 1 · หัวการ์ด = สัญลักษณ์ + ราคาปิดล่าสุด (`det.latest.close`, `asOfBar`) + "ในพอร์ต/ติดตามเสมอ" + จำนวนที่หมดวันนี้ · 3 บรรทัดกฎเสมอ: มี item → ป้าย ซื้อ/ขาย + `kindThai` + "สัญญาณ D" (+ crossDate/touchDate) + "เหลือ N วัน"/"วันสุดท้าย" + ปุ่ม · ไม่มี → "ไม่มีสัญญาณใหม่" + สถานะสั้นจาก `det.latest` (กฎ 1: EMA เหนือ/ใต้ · กฎ 2: ปิดเหนือ/ใต้ SMA200 N วัน · กฎ 3: `fmtPct(dd1yPct)` ยังไม่ถึง/ถึง 20% แล้ว)
- ใต้การ์ด: บรรทัด "ไม่มีสัญญาณใหม่ใน 3 วัน: A · B · C" (สัญลักษณ์ที่ ok แต่ไม่มี item) และแถวสีแดงสำหรับสัญลักษณ์ที่ status error/no-bars ("ดึงราคาไม่สำเร็จ · …")
- หัวกล่อง: `<h2 id="haTitle">ต้องทำอะไรวันนี้</h2>` + จำนวนรายการ + "คิดเมื่อ …" + ปุ่ม `data-ha-refresh` · ข้อความกำกับ: "ตามกฎที่คุณตั้งไว้ (EMA12/26 · SMA200 · ย่อ ≥20%) ไม่ใช่คำแนะนำการลงทุน · แสดงเฉพาะสัญญาณใน 3 วันหลังสุด"
- โหลด: `boot()` → `render()` + `watchRoot()` + `refresh(false)` + listener `portfolio-holdings-updated` / `portfolio-data-snapshot` เหมือนเดิม · `refresh`: โหลดเอกสาร (`getJson(DOC_URL)` → `body.data` ผ่าน `D.mergeDocs(D.emptyDoc(), data)`; ล้ม → `docState "error"`) ขนานกับราคา universe (`pool` 4) → ต่อสัญลักษณ์ `HomeActionEngine.detectEvents(bars, { symbol, nowBangkok })` → `reconcile(allEvents, state.doc.entries, { nowBangkok, launchedAt })` → render · `launchedAt`: อ่าน `LAUNCH_KEY` จาก localStorage; ไม่มี → ใช้ `doc.haLaunchedAt` ถ้ามี; ไม่มีทั้งคู่ → ตั้ง = วันนี้ (`nowBangkok.slice(0,10)`) เก็บลง localStorage และ (Task 5) เขียนลงเอกสารเป็น `doc.haLaunchedAt`
- Task นี้ยังไม่ติ๊ก/ไม่บันทึก: ปุ่มวาดแล้วแต่ไม่มี handler · `expired` จาก reconcile เก็บไว้ใน `state.toRecord` (Task 5 ใช้)

- [ ] **Step 1: เขียนเทสต์ที่ยังไม่ผ่าน** `scripts/home-action-test.js` — fixture ราคา (NOW `"2026-10-29T12:00"`, US ปิดถึง 10-28, แท่งรายวันจันทร์–ศุกร์ ลงท้าย 2026-10-28): `NVDA` = ราบ 100 ×260 แล้ว 90,90 (หลุดยืนยันบนแท่ง 2026-10-28 → ขาย กฎ 2 สัญญาณวันนี้) · `GOOG` = 200 ×230 · 150 ×2 (dip บน 2026-10-27 → ซื้อ กฎ 3 · และ EMA ตัดลงในช่วง → ขาย กฎ 1) · `"BTC-USD"` = ราบ 50000 ×262 (ไม่มีเหตุการณ์) · `"ETH-USD"` = ราบ 2000 ×262 · `INTC` = 40 แท่ง (ข้อมูลไม่พอ) · fake fetch: `/api/ohlc` → bars · `/api/portfolio?doc=journal` GET → `{ data: journalDoc }` (ตัวแปร `journalDoc` เริ่ม = `E.emptyDoc()`) · PUT → เก็บ body ไว้ใน `puts[]` ตอบ `{ ok: true }` (Task 5 ใช้) · snapshot holdings แบบ home-rules-test (NVDA, GOOGL→GOOG, INTC)

```js
t("home.html loads indicators → journal engine → action engine → action page before app-navigation · old home-rules-page is gone", scripts.join() === WANT.join() && HOME.indexOf("home-rules-page.js") < 0);
t("css versions identical in home/ai-cycle/wave3 and bumped", cssVer(HOME) === cssVer(read("ai-cycle.html")) && cssVer(HOME) === cssVer(read("wave3.html")) && cssVer(HOME) !== "20261030-mcx-10");
await settle();
t("card mounted first in #mcRoot with the new heading and the not-advice line", mcRoot.children[0].id === "haRoot" && /<h2 id="haTitle"[^>]*>ต้องทำอะไรวันนี้<\/h2>/.test(html()) && /ไม่ใช่คำแนะนำการลงทุน/.test(html()) && /3 วันหลังสุด/.test(html()));
t("only symbols with a visible event get a card: NVDA · GOOG (not BTC/ETH/INTC)", cards().join() === "GOOG,NVDA" || cards().join() === "NVDA,GOOG", cards());
// หมายเหตุ fixture: การร่วงจากราบทำให้ EMA12 ตัดลง EMA26 บนแท่งแรกด้วย → NVDA มี 2 รายการขาย (กฎ 1 วันที่ 10-27 · กฎ 2 วันที่ 10-28) เหมือนเคส DDOG จริงของผู้ใช้
//   daysLeft = (D+3) − วันนี้: 10-27 → เหลือ 1 วัน · 10-28 → เหลือ 2 วัน
t("NVDA card: 3 rule lines · rule 1 = ขาย (EMA12 ตัดลง, สัญญาณ 2026-10-27, เหลือ 1 วัน) · rule 2 = ขาย (หลุด SMA200 ยืนยัน, สัญญาณ 2026-10-28, เหลือ 2 วัน) · rule 3 = no new signal (ยังไม่ถึง 20%)", countIn(cardOf("NVDA"), /data-ha-rule="/g) === 3 && /data-ha-rule="1"[\s\S]*?ha-act is-sell">ขาย<[\s\S]*?EMA12 ตัดลง EMA26[\s\S]*?สัญญาณ 2026-10-27[\s\S]*?เหลือ 1 วัน/.test(cardOf("NVDA")) && /data-ha-rule="2"[\s\S]*?ha-act is-sell">ขาย<[\s\S]*?หลุด SMA200 ยืนยัน[\s\S]*?สัญญาณ 2026-10-28[\s\S]*?เหลือ 2 วัน/.test(cardOf("NVDA")) && /data-ha-rule="3"[\s\S]*?ไม่มีสัญญาณใหม่[\s\S]*?ยังไม่ถึง 20%/.test(cardOf("NVDA")), textOf(cardOf("NVDA")));
t("GOOG card shows both the sell (กฎ 1) and the buy (กฎ 3) lines with buttons", /ha-act is-sell">ขาย</.test(cardOf("GOOG")) && /ha-act is-buy">ซื้อ</.test(cardOf("GOOG")) && /data-ha-done="ha_GOOG_3_buy_2026-10-27"/.test(cardOf("GOOG")) && /data-ha-skip="ha_GOOG_3_buy_2026-10-27"/.test(cardOf("GOOG")) && /data-ha-done="ha_GOOG_1_sell_2026-10-27"/.test(cardOf("GOOG")));
t("quiet line lists symbols without new signals (BTC · ETH · INTC) · INTC has no card", /ไม่มีสัญญาณใหม่ใน 3 วัน[^<]*BTCUSD[^<]*ETHUSD[^<]*INTC/.test(html()) && !/data-ha-sym="INTC"/.test(html()));
t("items state: 4 open items (NVDA r1+r2 · GOOG r1+r3), 0 expired", H._state.items.filter(function (x) { return x.vis.visible; }).length === 4 && H._state.toRecord.length === 0);
t("journal doc loaded via GET only (no PUT yet) · launchedAt set to today", fetchCalls.filter(function (u) { return /doc=journal/.test(u); }).length === 1 && puts.length === 0 && H._state.launchedAt === "2026-10-29");
failSym.NVDA = "reject";
await H.refresh(true); await settle();
t("price failure: NVDA has no card, an error row instead, nothing recorded", !/data-ha-sym="NVDA"/.test(html()) && /NVDA[^<]*ดึงราคาไม่สำเร็จ/.test(html()) && H._state.toRecord.length === 0);
failSym = {};
win.__DJ_NOW = "2026-10-29T04:00";   // US bar 10-28 not closed yet
await H.refresh(true); await settle();
t("before the US close the 10-28 bar is ignored: NVDA has no confirmed break item (rule-1 item of 10-27 remains)", !/data-ha-done="ha_NVDA_2_sell_2026-10-28"/.test(html()) && /data-ha-done="ha_NVDA_1_sell_2026-10-27"/.test(html()));
win.__DJ_NOW = NOW;
mcRoot.children = []; H.render();
t("re-mounts after mcRoot rebuild", mcRoot.children[0] && mcRoot.children[0].id === "haRoot");
t("no NaN/undefined · no advisory wording · ES5 page+engine · CSS .ha-card/.ha-rule/.ha-act.is-sell + 600px breakpoint", !LEAK.test(html()) && !ADVISORY_TH.test(html()) && !ADVISORY_EN.test(html()) && es5ok("home-action-page.js") && es5ok("home-action-engine.js") && /\.ha-card\s*\{/.test(css) && /\.ha-act\.is-sell/.test(css) && /@media \(max-width: 600px\)[\s\S]*\.ha-/.test(css));
```

- [ ] **Step 2: รันเทสต์ ต้องล้ม** — Run: `node scripts/home-action-test.js` · Expected: ✗ ตั้งแต่ข้อแรก (home.html ยังโหลดไฟล์เก่า)

- [ ] **Step 3: สร้าง `public/home-action-page.js`** ตาม Interfaces (ย้ายโค้ดจากไฟล์เก่าก่อน แล้วเขียน `refresh`/`html`/`cardHtml`/`ruleLineHtml`) · แก้ `home.html` (สคริปต์ + css) · bump css ใน ai-cycle/wave3 · แทนบล็อก `.hr-*` ใน `mission-control-v2.css` ด้วย `.ha-*` (การ์ด grid: หัว + 3 บรรทัด `grid-template-columns: 64px 84px 1fr auto` · ≤600px เป็น 1 คอลัมน์ ปุ่มสูง ≥44px) · ลบ `public/home-rules-page.js` และ `scripts/home-rules-test.js`

- [ ] **Step 4: รันเทสต์ ต้องผ่าน** — Run: `node scripts/home-action-test.js` · Expected: 0 failed

- [ ] **Step 5: ตรวจทั้งเว็บยังเขียว** — Run: `node scripts/site-integrity-test.js | tail -1 && node scripts/nav-shell-test.js | tail -1 && node scripts/privacy-smoke-test.js | tail -1` · Expected: ทุกชุด 0 failed (site-integrity ต้องเห็น css version เดียวกัน 3 หน้า)

---

### Task 5: หน้า — ติ๊ก ทำแล้ว/ไม่ทำ · บันทึกลง journal · ไม่ได้ตอบอัตโนมัติ · แก้

**Files:**
- Modify: `public/home-action-page.js`
- Test: `scripts/home-action-test.js` (ต่อท้าย)

**Interfaces:**
- Produces:
  - `putDoc(localDoc) → Promise<{ ok, note }>`: GET สด (`getJson(DOC_URL)`) → `merged = D.mergeDocs(fresh.data, localDoc)` → `fetch(DOC_URL, { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ data: merged }) })` · GET/PUT ล้ม → เขียนร่าง `DRAFT_KEY = "decision_journal_draft_v1"` รูป `{ doc: <เฉพาะ entries ที่ยังไม่ถึงเซิร์ฟเวอร์ รวมกับร่างเดิมด้วย mergeDocs>, savedAt }` (รูปเดียวกับ `readDraft` ของ decision-journal-page) และ `state.syncNote = "ยังไม่ถึงเซิร์ฟเวอร์ — เก็บไว้ในเครื่อง จะส่งใหม่เมื่อเปิดหน้า"` · ตอน `refresh` ถ้ามีร่าง → ส่งก่อน (merge กับ GET) แล้วล้างร่างเมื่อสำเร็จ · กันซ้อนด้วย `putChain`
  - ติ๊ก: คลิก `data-ha-done` → บรรทัดกฎกางฟอร์ม inline `<form data-ha-form="<id>">`: ราคาที่ทำ (`input[name=execPrice]` prefill `det.latest.close`) · ฝั่งซื้อมีช่อง เงินที่ซื้อ ฿ (`input[name=amount]` ว่างได้) · ปุ่ม `data-ha-confirm` / `data-ha-cancel` · ยืนยัน → `HomeActionEngine.makeEntry(ev, { response: "done", nowIso, respondedAt: nowIso, execPrice, positionValue: (ฝั่งขาย) marketValue ของ holding นั้นใน `holdingsNow()` หรือ null, positionCurrency: h.currency || "THB", amount })` → `state.doc = D.mergeDocs(state.doc, { v: 1, updatedAt: nowIso, entries: [entry], trades: [] })` → render ทันที → `putDoc`
  - คลิก `data-ha-skip` → บันทึก `response: "skipped"` ทันที (ไม่มีฟอร์ม) · บรรทัดที่ติ๊กแล้วแสดงป้าย "ทำแล้ว ✓ ที่ <execPrice>" / "ไม่ทำ" จาง + ปุ่ม `data-ha-edit="<id>"` → กางฟอร์มเดิมพร้อมค่าปัจจุบัน + ปุ่มสลับเป็นอีก response · บันทึกทับ id เดิม `updatedAt` ใหม่
  - ไม่ได้ตอบอัตโนมัติ: หลัง reconcile ถ้า `docState === "ok"` และ `toRecord.length` → สร้าง entry `response: "unanswered"` ทุกตัว (respondedAt null) merge ครั้งเดียว + `putDoc` ครั้งเดียว · `docState !== "ok"` → ไม่บันทึก ปุ่มติ๊กทุกปุ่ม `disabled` + ข้อความ "ยังโหลดบันทึกจากเซิร์ฟเวอร์ไม่ได้ จึงยังติ๊กไม่ได้ — <เหตุผล>" + ปุ่มลองใหม่
  - `launchedAt` เขียนลงเอกสารครั้งแรกเป็น `doc.haLaunchedAt` (ไปกับ PUT ถัดไป; `mergeDocs` ไม่รู้จักคีย์นี้ → หน้าใส่กลับเองหลัง merge: `merged.haLaunchedAt = merged.haLaunchedAt || state.launchedAt`)

- [ ] **Step 1: เขียนเทสต์ที่ยังไม่ผ่าน** (ต่อท้าย; helper `click(attr, val)` เรียก handler ที่ wire ไว้ · ฟอร์มจำลองด้วย `nodeOf` ตั้ง `value` แบบ thai-dr-monitor-view-test)

```js
// ติ๊ก ทำแล้ว NVDA กฎ 2 (ขาย) → ฟอร์มกาง prefill 90 → ยืนยัน → PUT 1 ครั้ง entry ถูกต้อง positionValue จาก holdings
t("clicking ทำแล้ว opens the inline form prefilled with the latest close", click("data-ha-done", "ha_NVDA_2_sell_2026-10-28") && /data-ha-form="ha_NVDA_2_sell_2026-10-28"[\s\S]*?name="execPrice"[^>]*value="90"/.test(html()) && !/name="amount"/.test(formOf("ha_NVDA_2_sell_2026-10-28")));
setValue("execPrice", "91.5"); click("data-ha-confirm", "ha_NVDA_2_sell_2026-10-28"); await settle();
var e1 = lastPutEntry("ha_NVDA_2_sell_2026-10-28");
t("done entry PUT once: GET-before-PUT, response done, execPrice 91.5, positionValue 100000 THB, no view/verdict, validator-clean", puts.length === 1 && e1 && e1.ha.response === "done" && e1.ha.execPrice === 91.5 && e1.ha.positionValue === 100000 && e1.ha.positionCurrency === "THB" && e1.view === undefined && E.itemProblems(e1).length === 0 && getCount("doc=journal") >= 2, e1);
t("line now shows ทำแล้ว ✓ ที่ 91.50 and an แก้ button, faded", /ทำแล้ว ✓[^<]*91\.50/.test(cardOf("NVDA")) && /data-ha-edit="ha_NVDA_2_sell_2026-10-28"/.test(cardOf("NVDA")) && /ha-rule is-answered/.test(cardOf("NVDA")));
t("buy line form has the optional amount field", click("data-ha-done", "ha_GOOG_3_buy_2026-10-27") && /name="amount"/.test(formOf("ha_GOOG_3_buy_2026-10-27")));
click("data-ha-cancel", "ha_GOOG_3_buy_2026-10-27");
click("data-ha-skip", "ha_GOOG_3_buy_2026-10-27"); await settle();
t("ไม่ทำ records immediately with response skipped", lastPutEntry("ha_GOOG_3_buy_2026-10-27").ha.response === "skipped" && /ไม่ทำ/.test(cardOf("GOOG")));
journalDoc = JSON.parse(puts[puts.length - 1]).data;   // เซิร์ฟเวอร์เก็บแล้ว
await H.refresh(true); await settle();
t("reload: ticked items stay (faded) and are not re-created · no extra PUT", puts.length === 2 && /ทำแล้ว ✓/.test(cardOf("NVDA")) && H._state.doc.entries.filter(function (e) { return e.id === "ha_NVDA_2_sell_2026-10-28"; }).length === 1);
// แก้: เปลี่ยน skipped → done
click("data-ha-edit", "ha_GOOG_3_buy_2026-10-27"); setValue("amount", "20000"); click("data-ha-confirm", "ha_GOOG_3_buy_2026-10-27"); await settle();
t("edit overwrites the same id (newer updatedAt) with response done and amount 20000", lastPutEntry("ha_GOOG_3_buy_2026-10-27").ha.response === "done" && lastPutEntry("ha_GOOG_3_buy_2026-10-27").ha.amount === 20000 && lastPutEntry("ha_GOOG_3_buy_2026-10-27").updatedAt > e1.updatedAt);
// หมดเวลา: เลื่อนเวลาไป 2026-11-02 → รายการที่ยังไม่ติ๊ก (NVDA กฎ 1 และ GOOG กฎ 1 ทั้งคู่วันที่ 10-27) หมดเวลา → unanswered ตัวละครั้ง · รอบถัดไปไม่ซ้ำ
journalDoc = JSON.parse(puts[puts.length - 1]).data; win.__DJ_NOW = "2026-11-02T12:00";
await H.refresh(true); await settle();
var un = H._state.doc.entries.filter(function (e) { return e.ha && e.ha.response === "unanswered"; });
t("the two expired unticked rule-1 sells are recorded as unanswered exactly once each (one PUT), and their lines are gone", un.length === 2 && un.every(function (e) { return e.ha.rule === 1 && e.ha.respondedAt === null; }) && !/data-ha-done="ha_GOOG_1/.test(html()) && !/data-ha-done="ha_NVDA_1/.test(html()) && puts.length === 4);
var nPut = puts.length; journalDoc = JSON.parse(puts[puts.length - 1]).data;
await H.refresh(true); await settle();
t("second load after expiry does not record again", puts.length === nPut);
// tombstone จาก /decision-journal → ไม่บันทึกซ้ำ
journalDoc.entries = journalDoc.entries.map(function (e) { return e.id === un[0].id ? E.tombstone(e, "2026-11-02T13:00:00.000Z") : e; });
await H.refresh(true); await settle();
t("a tombstoned unanswered entry is not re-created", puts.length === nPut && H._state.doc.entries.filter(function (e) { return e.id === un[0].id && !e.deletedAt; }).length === 0);
// GET เอกสารล้ม → ไม่บันทึกอัตโนมัติ ปุ่มปิด
docFail = true; win.__DJ_NOW = "2026-11-05T12:00"; journalDoc = E.emptyDoc();
await H.refresh(true); await settle();
t("journal GET failure: docState error, every tick button disabled with a reason, no PUT, nothing auto-recorded", H._state.docState === "error" && puts.length === nPut && /ยังโหลดบันทึกจากเซิร์ฟเวอร์ไม่ได้/.test(html()) && !/data-ha-done="[^"]+"(?![^>]*disabled)/.test(html()));
docFail = false;
// PUT ล้ม → ร่างใน localStorage รูปเดียวกับ journal page
win.__DJ_NOW = NOW; journalDoc = E.emptyDoc(); putFail = true;
await H.refresh(true); await settle();
click("data-ha-skip", "ha_NVDA_2_sell_2026-10-28"); await settle();
var draft = JSON.parse(store["decision_journal_draft_v1"] || "null");
t("PUT failure keeps the entry in the journal draft (same shape as /decision-journal) and says so", draft && draft.doc && draft.doc.entries.some(function (e) { return e.id === "ha_NVDA_2_sell_2026-10-28"; }) && typeof draft.savedAt === "string" && /ยังไม่ถึงเซิร์ฟเวอร์/.test(html()));
putFail = false; var before = puts.length;
await H.refresh(true); await settle();
t("next load flushes the draft (one PUT) and clears it", puts.length === before + 1 && store["decision_journal_draft_v1"] === undefined);
t("launchedAt written into the doc on first PUT", JSON.parse(puts[0]).data.haLaunchedAt === "2026-10-29");
```

- [ ] **Step 2: รันเทสต์ ต้องล้ม** — Run: `node scripts/home-action-test.js` · Expected: ✗ ที่ "clicking ทำแล้ว …"

- [ ] **Step 3: เพิ่ม handler/ฟอร์ม/`putDoc`/ร่าง/ไม่ได้ตอบอัตโนมัติ ใน `public/home-action-page.js`** ตาม Interfaces · wire ปุ่มใน `render()` ผ่าน `el.querySelectorAll("[data-ha-done]")` ฯลฯ (harness รองรับ `querySelectorAll` ของ attribute เดี่ยว — ปรับ `mkEl` ของเทสต์ให้คืน element ปลอมต่อค่า attribute แบบ `fakeNodes` ใน thai-dr-monitor-view-test)

- [ ] **Step 4: รันเทสต์ ต้องผ่าน** — Run: `node scripts/home-action-test.js` · Expected: 0 failed

- [ ] **Step 5: ยืนยันว่าเซิร์ฟเวอร์รับ entry รูปนี้จริง** — Run: `node -e "const V=require('./lib/journal-validation');const HA=require('./public/home-action-engine.js');const E=require('./public/decision-journal-engine.js');const e=HA.makeEntry({symbol:'NVDA',rule:2,side:'sell',date:'2026-10-28',close:90,kind:'break',detail:{}},{response:'done',nowIso:'2026-10-29T00:00:00.000Z',respondedAt:'2026-10-29T00:00:00.000Z',execPrice:91,positionValue:1,positionCurrency:'THB',amount:null,D:E});console.log(V.isValidJournalDoc({v:1,updatedAt:null,entries:[e],trades:[],haLaunchedAt:'2026-10-29'}))"` · Expected: `true`

---

### Task 6: หน้า — สรุปผลและประวัติใต้กล่อง

**Files:**
- Modify: `public/home-action-page.js`, `public/mission-control-v2.css`
- Test: `scripts/home-action-test.js` (ต่อท้าย)

**Interfaces:**
- Consumes: `HomeActionEngine.summary(entries, outcomesById, { nowBangkok, horizonDays })` · `DecisionJournal.outcomes(entry, bars, nowBangkok)`
- Produces: `state.outcomesById` (คิดใน `refresh` หลังได้ราคา: สัญลักษณ์ของ entry home-action ที่ไม่อยู่ใน universe → `fetchBars` เพิ่ม โดย `start = min(entry.date) − 7 วัน`) · `state.horizonDays` (7|30, ปุ่ม `data-ha-horizon="7|30"`) · DOM: `<details class="ha-summary" data-ha-summary>` (ปิดเริ่มต้น; เปิด/ปิดจำใน localStorage `home_action_summary_open_v1`) · 4 ช่อง `<div class="ha-kpi" data-ha-kpi="followed|missed|unanswered|byrule">` · ตาราง `<table class="ha-hist">` คอลัมน์ วันที่ · หุ้น · กฎ · action · ตอบ · ราคาสัญญาณ · 7 วัน · 30 วัน · ผลต่อพอร์ต · แถว `data-ha-hrow="<id>"` · ปุ่มแก้ในแถว `data-ha-edit` (ใช้ฟอร์มเดียวกับ Task 5 แต่กางใต้แถว)
- การแสดงเงิน: `fmtMoney(amount, currency)` → `"฿12,300"` เมื่อ THB (privacy.js ซ่อนเอง) · สกุลอื่น `"USD 123.45"` · ไม่มีฐาน → "ไม่มีฐานเงิน" · ผลลบของ followed = "เสีย" ผลลบของ missed = "เลี่ยงได้" (ป้ายไทยจากเครื่องหมาย) · แถว pending → `รอ (n/7)` เมื่อ n = `D.daysBetween(entry.date, today)`

- [ ] **Step 1: เขียนเทสต์ที่ยังไม่ผ่าน** (ต่อท้าย · `win.__DJ_NOW = NOW` · เตรียม `journalDoc` ที่มี entry home-action 3 ตัวย้อนหลัง (ids "a","b","c" · สร้างด้วย `HA.makeEntry` แล้วเขียนทับ `id`/`date`): `a` ขาย AMD done 2026-10-10 rules.close 50 positionValue 100000 THB · `b` ซื้อ GOOG skipped 2026-10-12 (rules.close 200 · ไม่มี amount) · `c` ขาย AMD unanswered 2026-10-14 rules.close 45 · AMD ไม่อยู่ใน universe: เพิ่ม `BARS.AMD` = ราบ 50 ถึง 2026-10-10 แล้ว 45 ตั้งแต่ 2026-10-13 ถึง 2026-10-28 → `a` ที่ 7 วัน (10-17) = 45 → −10% (ขาย = +10% · ฿10,000) · `c` ที่ 7 วัน (10-21) = 45 → 0% · `b` ที่ 7 วัน (10-19) GOOG 200 → 0%)

```js
t("summary collapsed by default with the 4 KPI tiles and a 7/30 toggle (7 active)", /<details class="ha-summary"(?! open)/.test(html()) && countIn(html(), /data-ha-kpi="/g) === 4 && /data-ha-horizon="7"[^>]*aria-pressed="true"/.test(html()));
t("outcomes computed for history symbols outside the universe (AMD fetched once)", fetchCalls.filter(function (u) { return /symbol=AMD/.test(u); }).length === 1 && H._state.outcomesById.a && H._state.outcomesById.a.horizons["7"].status === "scored" && H._state.outcomesById.c.horizons["7"].status === "scored");
t("followed tile: 1 ครั้ง · +10.0% · ฿10,000 (sell, price fell 10%)", /data-ha-kpi="followed"[\s\S]*?1 ครั้ง[\s\S]*?\+10\.0%[\s\S]*?฿10,000/.test(html()), textOf(kpi("followed")));
t("missed tile counts skipped+unanswered = 2 and shows ถ้าทำ", /data-ha-kpi="missed"[\s\S]*?2 ครั้ง[\s\S]*?ถ้าทำ/.test(html()));
t("history rows newest first with 7/30 columns · AMD row shows ไม่ได้ตอบ · GOOG buy with no base shows ไม่มีฐานเงิน", rowsOrder().join() === "c,b,a" && /data-ha-hrow="c"[\s\S]*?ไม่ได้ตอบ/.test(html()) && /data-ha-hrow="b"[\s\S]*?ไม่มีฐานเงิน/.test(html()));
click("data-ha-horizon", "30"); 
t("toggle to 30 days re-renders tiles from the 30-day horizon and marks pending rows รอ (n/30)", /data-ha-horizon="30"[^>]*aria-pressed="true"/.test(html()) && /รอ \(\d+\/30\)/.test(html()));
t("money is rendered with the ฿ prefix so privacy.js can mask it · no money in title attributes", /฿10,000/.test(html()) && !/title="[^"]*฿/.test(html()));
t("edit from the history row opens the same inline form", click("data-ha-edit", "a") && /data-ha-form="a"/.test(html()));
```

- [ ] **Step 2: รันเทสต์ ต้องล้ม** — Run: `node scripts/home-action-test.js` · Expected: ✗ ที่ "summary collapsed …"

- [ ] **Step 3: เพิ่มสรุป/ประวัติใน `public/home-action-page.js` + CSS `.ha-summary/.ha-kpi/.ha-hist`** (ตารางห่อ `overflow-x:auto` ที่ ≤600px)

- [ ] **Step 4: รันเทสต์ ต้องผ่าน** — Run: `node scripts/home-action-test.js` · Expected: 0 failed

---

### Task 7: /decision-journal รู้จัก entry จากกล่อง Action

**Files:**
- Modify: `public/decision-journal-page.js` (`statsNow` ~บรรทัด 1213 · `entryRowHtml` ~1608 · `entryCard` ~1637 · คิวทบทวน ~942 ไม่ต้องแก้ เพราะ `reviewDue` คืน false เมื่อไม่มี `view.horizonDays` — ยืนยันด้วยเทสต์) · `public/decision-journal.html` → `decision-journal-page.js?v=20261106-dj-6` · `public/decision-journal.css` (คลาส `.dj-ha-chip`) + bump `?v=` ของ css ตามรูปแบบเดิมของไฟล์นั้น
- Test: `scripts/decision-journal-view-test.js` (ต่อท้าย section ใหม่)

**Interfaces:**
- Consumes: `entry.source === "home-action"`, `entry.ha.{rule, side, response, execPrice}`
- Produces: `statsNow()` ส่งเฉพาะ entries ที่ `source !== "home-action"` เข้า `D.stats` · `entryRowHtml`: ถ้า home-action → แทนที่ pill ตามกฎ/แหกกฎ ด้วย `<span class="dj-ha-chip" data-hue="…">จากกล่อง Action · กฎ N · ทำแล้ว|ไม่ทำ|ไม่ได้ตอบ</span>` และบรรทัดย่อย "<entry.context.event> · ราคาสัญญาณ X · ทำจริงที่ Y" (หน้า journal **ไม่โหลด** home-action-engine.js จึงอ่านข้อความไทยที่ `makeEntry` ใส่ไว้ใน `context.event` แทนการเรียก `kindThai`) · `entryCard` body สำหรับ home-action: `rulesSayHtml` ข้าม (ไม่มี r1/r2/r3) · `thoughtHtml` ข้าม · คง `outcomeBlock` + `deleteControls` · ไม่มี `lessonBlock`

- [ ] **Step 1: เขียนเทสต์ที่ยังไม่ผ่าน** (section ใหม่ท้าย `scripts/decision-journal-view-test.js` — ใช้ harness/fixture ของไฟล์นั้น: ใส่ doc ที่มี entry home-action 1 ตัว (สร้างด้วย `require("../public/home-action-engine.js").makeEntry`) + entry ปกติ 1 ตัว)

```js
t("journal renders a home-action entry without throwing, with the source chip", !thrown && /dj-ha-chip[^>]*>จากกล่อง Action · กฎ 2 · ทำแล้ว</.test(html()));
t("home-action entries are excluded from stats (byCompliance counts only the manual entry)", statsSeen.n === 1);
t("home-action entries never enter the review queue", !/data-dj-review="ha_/.test(html()));
t("delete control exists for the home-action entry", /data-dj-delete="ha_NVDA_2_sell_2026-10-28"/.test(html()) || /data-dj-del[^=]*="ha_NVDA_2_sell_2026-10-28"/.test(html()));
t("decision-journal.html bumped and page is ES5", /decision-journal-page\.js\?v=20261106-dj-6/.test(DJ_HTML) && es5ok("decision-journal-page.js"));
```

- [ ] **Step 2: รันเทสต์ ต้องล้ม** — Run: `node scripts/decision-journal-view-test.js` · Expected: ✗ ที่ chip/stats

- [ ] **Step 3: แก้ `public/decision-journal-page.js` + css + html** ตาม Interfaces (ชื่อ attribute ของปุ่มลบให้ดูจาก `deleteControls` ของไฟล์จริงแล้วใช้ตรงกันในเทสต์)

- [ ] **Step 4: รันเทสต์ ต้องผ่าน** — Run: `node scripts/decision-journal-view-test.js && node scripts/decision-journal-test.js | tail -1` · Expected: 0 failed ทั้งคู่

---

### Task 8: ตรวจรวม — regression · mutation · Chrome จริง · memory

**Files:**
- Create (scratchpad เท่านั้น ไม่เข้า repo): `mut-home-action.js`, `probe-home-action.js`
- Modify: `C:\Users\mtl87429\.claude\projects\c--Drive-Data-AI-Project-AI-Project-portfolio-dashboard\memory\home-rules-card.md` → เขียนใหม่เป็น "home-action-box" (ชื่อไฟล์ใหม่ `home-action-box.md`, ลบไฟล์เก่า) + แก้บรรทัดใน `MEMORY.md`

- [ ] **Step 1: regression ทั้งเว็บ** — Run: `for f in scripts/*-test.js; do node "$f" >/dev/null 2>&1 || echo "FAIL $f"; done; ls scripts/*-test.js | wc -l` · Expected: ไม่มี FAIL · จำนวนชุด = 41 − 1 (home-rules-test ลบ) + 2 (home-action-engine-test, home-action-test) = 42

- [ ] **Step 2: mutation sweep** — เขียน `mut-home-action.js` (แบบ `mut-dr-port.js`) กลายพันธุ์ใน engine/page อย่างน้อย: ไม่กรอง `date < launchedAt` · นับ unanswered เป็น done · `impactPct` ไม่กลับเครื่องหมายฝั่งขาย · หน้าต่าง D+4 · ไม่เช็ก tombstone · bounce ไม่สร้าง event · GET ล้มแล้วยังบันทึก unanswered · ไม่กรอง home-action ออกจาก stats ของ journal · PUT ไม่ GET ก่อน — ทุกตัวต้องทำให้เทสต์ชุดใดชุดหนึ่งแดง · Run: `node <scratchpad>/mut-home-action.js` · Expected: "จับได้" ทุกตัว แล้วไฟล์คืนเดิม

- [ ] **Step 3: Chrome จริง 1440 และ 390 px** — `probe-home-action.js` (แบบ `probe-home-rules.js`): ดัก `/api/portfolio-holdings` ด้วย holdings สมมุติ และดัก `/api/portfolio?doc=journal` GET → เอกสารสมมุติในหน่วยความจำของ probe / PUT → เก็บลงตัวแปรเดียวกันแล้วตอบ ok (ไม่แตะเอกสารจริงของผู้ใช้) · ราคาจริงจาก /api/ohlc · ซ่อน `#portfolio-auth-overlay` เท่านั้น · ตรวจ: การ์ดเฉพาะตัวที่มีสัญญาณใน 3 วัน · คลิก ทำแล้ว → ยืนยัน → PUT body มี entry · reload → ไม่ซ้ำ · สรุปแสดง ฿ เป็น XXX ตอนล็อก · ไม่มี error ใน console · ไม่เลื่อนแนวนอนนอกจากแถบหัวเว็บส่วนกลาง (ของเดิม) · บันทึกภาพ `home-action-1440.png`, `home-action-390.png` แล้วเปิดดูภาพ · Run: `node <scratchpad>/probe-home-action.js 1440 && node <scratchpad>/probe-home-action.js 390` · Expected: `errors: []` และผลตามรายการ

- [ ] **Step 4: ES5 + คำต้องห้ามทั้งสองไฟล์ใหม่** — Run: `grep -nE "=>|\bconst |\blet |\x60" public/home-action-engine.js public/home-action-page.js; grep -nE "ควรซื้อ|ควรขาย|น่าซื้อ|น่าขาย|น่าเข้า|แนะนำซื้อ|จุดเข้า|ตัดขาดทุน" public/home-action-engine.js public/home-action-page.js` · Expected: ไม่มีผลลัพธ์

- [ ] **Step 5: memory** — เขียน `home-action-box.md` (type project): สิ่งที่ไม่เห็นจากโค้ด — id คงที่จากคีย์เหตุการณ์เพื่อให้ tombstone จับคู่ได้ · วันสัญญาณกฎ 2 = แท่งยืนยัน · re-arm −10% · launchedAt · ร่างใช้คีย์เดียวกับ journal · stats ของ journal กรอง home-action · บทเรียนจาก probe/mutation · อัปเดต `MEMORY.md` (แทนบรรทัด Home rules card) · ลบ `home-rules-card.md`

- [ ] **Step 6: รายงานผู้ใช้ (ไทย) — ไม่ commit** — สรุป: ไฟล์ที่เปลี่ยน, จำนวนเทสต์, ผล mutation, ภาพจาก Chrome, สิ่งที่เปิดหน้าแล้วจะเห็นวันแรก (ทุกสัญญาณเก่ากว่า 3 วันจะไม่โผล่และไม่ถูกบันทึกเพราะก่อน launchedAt) และเตือนว่าค่า "ไม่ได้ตอบ" จะเริ่มสะสมหลังวันนี้

---

## Self-review (ทำแล้วก่อนส่ง)

- **ครอบสเปก:** กฎ/เหตุการณ์/แท่งยืนยัน/bounce (Task 1) · หน้าต่าง 3 วัน + ไม่ได้ตอบ + launchedAt + tombstone (Task 2, 5) · ที่เก็บ journal + GET-before-PUT + ร่าง (Task 5) · วัดผล 7/30 + ฿ + privacy (Task 3, 6) · การ์ดแบบ B + ข้อความกำกับ + mount (Task 4) · /decision-journal (Task 7) · เทสต์ + Chrome + mutation + versions (Task 4, 8) · สิ่งที่สเปกเสนอว่า "เพิ่ม r3.dipSinceDate ในเอนจิน" แผนนี้เลือกไล่ทีละแท่งในเอนจินใหม่แทน (สเปกปล่อยให้ผู้สร้างตัดสิน) จึง **ไม่แตะ decision-journal-engine.js**
- **ชื่อ/ลายเซ็นตรงกันทุก task:** `detectEvents/eventKey/entryIdOf/visibility/reconcile/makeEntry/isHomeAction/kindThai/impactPct/impactMoney/summary` · attribute `data-ha-done/skip/edit/confirm/cancel/form/horizon/refresh/sym/rule/kpi/hrow/summary` · คีย์ localStorage `home_rules_ohlc_v1` (เดิม) · `decision_journal_draft_v1` · `home_action_launched_v1` · `home_action_summary_open_v1` · เวอร์ชัน `20261106-ha-1`, `20261106-mcx-11`, `20261106-dj-6`
- **Review Focus → เทสต์:** ข้อ 1 Task 4 ("price failure …") · ข้อ 2 Task 1 ("partial … bar") + Task 4 (04:00) · ข้อ 3 Task 5 ("journal GET failure") · ข้อ 4 Task 6 ("AMD fetched") · ข้อ 5 Task 1 (bounce/reclaim once, "rule2 buy … once") + Task 4 (GOOG both lines)
- **สัดส่วน:** แผนยาวกว่าสเปกราว 2 เท่า ส่วนใหญ่เป็น assertion ของเทสต์ที่ผูกค่าจากสเปก ไม่มี body ของฟังก์ชัน
