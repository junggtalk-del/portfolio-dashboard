# Journal: รายการรายตัวในการ์ด "ผลของการทำตามกฎ" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ใต้ตารางสรุปในการ์ด `djHaOut` ของ /decision-journal แสดงทีละรายการว่ากล่อง Home บอกอะไร · ผู้ใช้ตัดสินใจอย่างไร · ผลที่ 1 สัปดาห์ / 1 เดือน / 3 เดือน · ประโยคสรุป

**Architecture:** ขยาย `renderHaOutcome()` ใน `public/decision-journal-page.js` เท่านั้น — รายการมาจาก `rows` ของ `summary(…, { allTime: true })` ที่การ์ดเรียกอยู่แล้ว จับคู่ id กับ entry ใน `D.liveEntries(state.doc)` แล้วคิดผลแต่ละช่วงด้วย `HomeActionEngine.impactPct` / `impactMoney` กับ `state.outcomesById` (สูตรเดียวกับตารางสรุป) · ไม่แตะเอนจิน ไม่แตะข้อมูลที่เก็บ

**Tech Stack:** ES5 ล้วน · เทสต์ Node + `vm` (`scripts/decision-journal-view-test.js`) · ตรวจหน้าจริงใน Chrome ผ่าน CDP

**Spec:** `docs/superpowers/specs/2026-11-19-journal-home-action-outcomes-design.md` — หัวข้อ **Addendum A**

## Global Constraints

- ES5 เท่านั้นในไฟล์ `public/` · ข้อความบนจอภาษาไทย
- ห้ามคำแนะนำซื้อขาย: ควรซื้อ/ควรขาย/น่าซื้อ/น่าขาย/น่าเข้า/แนะนำซื้อ/จุดเข้า/ตัดขาดทุน, Buy/Sell
- เงินผ่าน `moneySigned(amount, currency, true)` (ล็อก = "XXX" ทุกสกุล) · ห้ามเงินใน `title`/`aria-label` · % ลงสีตามเครื่องหมายแม้ล็อก (ruling เดิมของการ์ด)
- สีในไฟล์ `decision-journal.css` ใช้ได้เฉพาะ `var(--dj-*)`/`var(--mc-*)` นอกบล็อก token · คลาสใหม่ขึ้นต้น `dj-` · ไม่มี gradient · ไม่มี font-family ใหม่ · ≤600px ไม่ล้นจอ
- เกณฑ์ทรงตัว = `D.FLAT_BAND_PCT + D.EPS_PCT` (±2%) — อ่านจากเอนจิน ห้ามพิมพ์เลข 2 ลงโค้ดคำนวณ
- นาฬิกาจริงอ่านที่เดียว (`nowBangkok()`) · ไม่ดึงราคาเพิ่ม · ไม่แก้ข้อมูลที่เก็บ · ไม่แตะ `public/home-action-engine.js`
- เวอร์ชันคง `decision-journal-page.js?v=20261119-dj-7` / `decision-journal.css?v=20261119-dj-7` (ยังไม่เคยขึ้นจริง)
- **ห้าม git commit/stage** จนผู้ใช้สั่ง "push git" · สคริปต์เขียนด้วย Write tool เท่านั้น
- ทุกชุด `for f in scripts/*-test.js; do node "$f" >/dev/null 2>&1 || echo "FAIL $f"; done` → ไม่มี FAIL

## Review Focus

1. รายการที่ดึงราคาสัญลักษณ์นั้นไม่สำเร็จและยังไม่มีผล — ต้องขึ้น `ดึงราคาไม่สำเร็จ — ยังไม่รู้ผล` ไม่มี NaN/undefined → เทสต์ใน Task 1
2. ผลพอดี ±2.0% — ต้องเป็นประโยค "ทรงตัว" ไม่ใช่ได้/เสีย → เทสต์ใน Task 1
3. มากกว่า 10 รายการ — ปุ่ม `ดูทั้งหมด (n)` / `ย่อ` สลับได้และคงอยู่หลังวาดใหม่บางส่วน · ≤10 ไม่มีปุ่ม → เทสต์ใน Task 1
4. ล็อก Privacy กับรายการ THB + USD — เงินในรายการเป็น XXX ทั้งหมด ไม่มีเงินใน attribute → เทสต์ใน Task 1
5. entry ที่ไม่รู้ฝั่ง (`ha.side` หาย) — ช่องเป็น `—` และประโยค `ไม่รู้ฝั่งของสัญญาณ — คิดผลไม่ได้` → เทสต์ใน Task 1

---

### Task 1: รายการรายตัวใต้ตารางสรุป

**Files:**
- Modify: `public/decision-journal-page.js` — `renderHaOutcome()` (~2579-2650) + helper ใหม่ข้าง ๆ · state ใหม่ `haoShowAll: false` ใน `var state = {` (~58) · `wire()` (~3386) ผูกปุ่ม
- Modify: `public/decision-journal.css` — คลาส `dj-hao-items` `dj-hao-item` `dj-hao-itable` `dj-hao-verdict` `dj-hao-more` (≤600px ไม่ล้น)
- Test: `scripts/decision-journal-view-test.js` — section ใหม่ `"home-action items in the outcome card (dj-7 items)"` ต่อจาก section การ์ดเดิม · ใช้ fixture `haoJournal()` / `haoOutcomes()` / `haoEntry()` / `HAO.*` ids ที่มีอยู่

**Interfaces:**
- Consumes: `haEngine()` (~2545) → `HomeActionEngine` · `HA.summary(…, { allTime: true, D })` ที่การ์ดเรียกอยู่ (ใช้ `rows` ของผลชุดใดชุดหนึ่ง — rows เหมือนกันทุกช่วง) · `HA.impactPct(entry, pct)` · `HA.impactMoney(entry, pct) → { amount, currency }` · `HA.RULE_LABEL[rule]` · `HA.kindThai(kind)` · `actionKindOf(e)` · `HA_RESPONSE_VIEW[resp].text` · `D.ACTIONS` + `thaiOf` · `fmtPct` · `fmtNum` · `horizonLabel` · `moneySigned` · `state.priceErrBySymbol` · `state.outcomesLoading`
- Produces (markup ที่เทสต์อ่าน):
  - `<ol class="dj-hao-items">` · ต่อรายการ `<li class="dj-hao-item" data-dj-hao-item="<entry id>">`
  - ช่องผล `data-dj-hao-icell="<entry id>:<7|30|90>"` · ประโยค `<p class="dj-hao-verdict" data-tone="up|down|flat|wait|bad">`
  - ปุ่ม `<button type="button" class="dj-btn dj-hao-more" data-dj-hao-more="1">` ข้อความ `ดูทั้งหมด (n)` หรือ `ย่อ` · คลิก = สลับ `state.haoShowAll` แล้ววาด `djHaOut` ใหม่
- ข้อความตายตัว (spec Addendum A):
  - หัวย่อย `รายตัว (ใหม่สุดก่อน)`
  - บรรทัด 1: `<e.date> · <สัญลักษณ์> · <RULE_LABEL[rule]> · ระบบบอก: <ซื้อ|ขาย> (<kindThai>)` — kindThai เป็น null → ไม่มีวงเล็บ
  - บรรทัด 2: `คุณ: <ทำแล้ว|ไม่ทำ|ไม่ได้ตอบ> (<thaiOf(D.ACTIONS, actionKindOf(e))>` + ` ที่ <fmtNum(execPrice, 2)>` เมื่อทำแล้วและมี execPrice + `)`
  - ป้ายแถวตารางเล็ก: `ได้/เสีย` (done) · `ถ้าทำจะได้` (skipped/unanswered) · ช่อง = `fmtPct(impact, 1)` ลงสีตามเครื่องหมาย · pending = `รอผล` · no-data/ไม่มี outcome = `—`
  - ประโยค (ช่วง = ยาวสุดที่ scored: 90 > 30 > 7 · `x` = |impact| 1 ตำแหน่ง · `<ช่วง>` = `horizonLabel`):
    - |impact| ≤ เกณฑ์ทรงตัว → `ราคาแทบไม่ขยับ (±<FLAT_BAND_PCT>%) ใน <ช่วง> — ทำหรือไม่ทำผลใกล้กัน` (tone flat)
    - done, > เกณฑ์ → `ทำแล้วได้ +x% ใน <ช่วง>` (up) · done, < −เกณฑ์ → `ทำแล้วเสีย −x% ใน <ช่วง>` (down)
    - skipped/unanswered, > เกณฑ์ → `<ไม่ทำ|ไม่ได้ตอบ>แล้วพลาด: ถ้าทำจะได้ +x% ใน <ช่วง>` (down) · < −เกณฑ์ → `<ไม่ทำ|ไม่ได้ตอบ>แล้วดี: ถ้าทำจะเสีย −x% ใน <ช่วง>` (up)
    - ต่อท้ายทุกประโยคที่มีผล: ` (ราคา<ขึ้น|ลง> y%)` จาก pct ดิบของช่วงนั้น (pct = 0 → ` (ราคาไม่ขยับ)`) และ ` · ≈ <moneySigned(amount, currency, true)>` เมื่อ `impactMoney` มีค่า
    - ไม่มีช่วงไหน scored และไม่มี outcome + มี `priceErrBySymbol[sym]` → `ดึงราคาไม่สำเร็จ — ยังไม่รู้ผล` (bad) · ไม่มี outcome + `outcomesLoading` → `กำลังดึงราคา…` (wait) · ไม่รู้ฝั่ง → `ไม่รู้ฝั่งของสัญญาณ — คิดผลไม่ได้` (bad) · อย่างอื่น → `ยังไม่ครบ 1 สัปดาห์ — รอผล` (wait)
  - แสดง 10 รายการแรก (ใหม่→เก่า ตามลำดับ `rows`) · มากกว่า 10 → ปุ่ม `ดูทั้งหมด (<จำนวนทั้งหมด>)` · `haoShowAll` = true → แสดงทั้งหมด + ปุ่ม `ย่อ`

- [ ] **Step 1: เขียนเทสต์ที่ล้ม** (section ใหม่ — ใช้ `haoJournal()` + `haoOutcomes()`; รายการเรียง BUY_UNANS (10-19) · BUY_NOBASE (10-16) · SELL_USD (10-15) · SELL_THB (10-14))

```js
// คาดจาก fixture เดิม (ขาย → ผลต่อพอร์ต = −pct):
//   SELL_THB done pct −4/−10/−12 → ช่อง +4.0% +10.0% +12.0% · "ทำแล้วได้ +12.0% ใน 3 เดือน (ราคาลง 12.0%) · ≈ +฿6,000"
//   SELL_USD skipped pct 5/2/รอ → −5.0% −2.0% รอผล · ช่วง 1 เดือน |−2| ≤ 2 → "ราคาแทบไม่ขยับ (±2%) ใน 1 เดือน — ทำหรือไม่ทำผลใกล้กัน (ราคาขึ้น 2.0%) · ≈ −$40.00"   (Review Focus 2)
//   BUY_NOBASE done pct 3/6/รอ → +3.0% +6.0% รอผล · "ทำแล้วได้ +6.0% ใน 1 เดือน (ราคาขึ้น 6.0%)" (ไม่มีเงิน)
//   BUY_UNANS unanswered pct −1/รอ/รอ → −1.0% รอผล รอผล · "ราคาแทบไม่ขยับ (±2%) ใน 1 สัปดาห์ — … (ราคาลง 1.0%) · ≈ −฿200"
t("items: 4 live entries newest first, deleted one absent", /* ids จาก data-dj-hao-item ตามลำดับ = [BUY_UNANS, BUY_NOBASE, SELL_USD, SELL_THB] */);
t("item line 1 + line 2 text per entry (rule label · ระบบบอก · คุณ: … (สิ่งที่ทำจริง))", /* เช่น SELL_USD: "2026-10-15 · NVDA · กฎ 1 EMA12/26 · ระบบบอก: ขาย (EMA12 ตัดลง EMA26)" และ "คุณ: ไม่ทำ (ถือต่อ)" */);
t("item cells = fmtPct(HA.impactPct(entry, pct), 1) per horizon · รอผล for pending", /* ทุก data-dj-hao-icell */);
t("per group and horizon, the mean of the items' impacts equals the summary table cell", /* คิดใน test ด้วย HA.impactPct แล้วเทียบข้อความช่อง data-dj-hao="followed:30" ฯลฯ */);
t("verdict sentences match the 4 expected strings above (tone up/flat/up/flat)", /* … */);
t("miss / good / loss wording: skipped sell pct −9 at 30 → 'ไม่ทำแล้วพลาด: ถ้าทำจะได้ +9.0% ใน 1 เดือน (ราคาลง 9.0%)' · skipped sell pct +8 → 'ไม่ทำแล้วดี: ถ้าทำจะเสีย −8.0% …' · done buy pct −5 → 'ทำแล้วเสีย −5.0% …' · unanswered uses 'ไม่ได้ตอบแล้ว…'", /* override outcomes ในเทสต์ */);
t("boundary: impact exactly +2.0 / −2.0 → flat sentence (Review Focus 2)", /* … */);
t("no outcome + price error for the symbol → 'ดึงราคาไม่สำเร็จ — ยังไม่รู้ผล', cells '—', no NaN/undefined (Review Focus 1)", /* ตั้ง state.priceErrBySymbol + ลบ outcome */);
t("ha.side missing → cells '—' and 'ไม่รู้ฝั่งของสัญญาณ — คิดผลไม่ได้' (Review Focus 5)", /* … */);
t("locked: every item amount is XXX (THB and USD), no money in title/aria-label, % still coloured (Review Focus 4)", /* privacyLocked = true */);
t(">10 items: shows 10 + 'ดูทั้งหมด (12)' · click → 12 items + 'ย่อ' · survives renderAroundForm · ≤10 → no button (Review Focus 3)", /* สร้าง 12 entry ด้วย haoEntry */);
t("CSS: dj-hao-item* classes exist, colours only via var(), ≤600px rules for the item table", /* อ่าน decision-journal.css */);
```

ทุกข้อเขียนเป็น assertion จริงตามคอมเมนต์ (ไม่มีข้อที่ assert อะไรไม่ได้)

- [ ] **Step 2: รันให้เห็นว่าล้ม**

Run: `node scripts/decision-journal-view-test.js`
Expected: FAIL ทุกข้อใน section ใหม่ (ยังไม่มี `dj-hao-items`)

- [ ] **Step 3: เพิ่มรายการรายตัวใน `renderHaOutcome()` + state/ปุ่ม + CSS** ตาม Interfaces — อัปเดตคอมเมนต์หัวฟังก์ชันให้บอกว่ามีรายการรายตัว

- [ ] **Step 4: รันให้ผ่าน + ทุกชุด**

Run: `node scripts/decision-journal-view-test.js && node scripts/site-integrity-test.js` แล้ว `for f in scripts/*-test.js; do node "$f" >/dev/null 2>&1 || echo "FAIL $f"; done`
Expected: ผ่านทั้งหมด · ไม่มี FAIL

- [ ] **Step 5: ตรวจหน้าจริงใน Chrome (1440 และ 390)** — probe CDP ใน scratchpad (`C:/Users/mtl87429/AppData/Local/Temp/claude/c--Drive-Data-AI-Project-AI-Project-portfolio-dashboard/f4e56c25-9f1d-4447-bdd3-8034f986cfec/scratchpad`, มี probe จากงานการ์ดเดิมให้ต่อยอด) · ดัก `/api/portfolio*` และ `/api/ohlc*` ด้วยข้อมูลสมมุติในหน่วยความจำ · non-GET อื่นใต้ `/api` → 403 · ซ่อนแค่ `#portfolio-auth-overlay` ห้ามปลด privacy · ห้ามถึงเอกสาร Journal จริง · ตรวจ: รายการขึ้นใต้ตาราง ตัวเลขตรงกับที่คิดใน Node · ปุ่มดูทั้งหมดทำงาน · 390px ไม่ล้น · ไม่มี console error (นอกจาก favicon) · ถ่ายภาพ

- [ ] **Step 6: ไม่ commit**
