# Bitcoin เป็นจำนวน BTC — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** แถว Bitcoin ใน Quarterly Editor กรอกเป็นจำนวน BTC แล้วมูลค่าบาท (จำนวน × BTC-USD × USD/THB) ถูกเขียนลงเอกสารไตรมาสให้ทุกหน้าใช้

**Architecture:** โมดูลกลาง `public/btc-value.js` (pure + I/O แบบ holding-revalue.js) คำนวณและเขียนแถว bitcoin ของไตรมาสที่ตามราคา หลัง Load Latest Data/เปิดหน้า · ทุกการ GET→PUT ของ `/api/portfolio` ในหน้าเดียวผ่าน `PortfolioCore.withDocLock` · Editor (`app.js`) คำนวณในหน่วยความจำด้วยฟังก์ชันเดียวกันก่อนวาด/บันทึก

**Tech Stack:** เบราว์เซอร์ JS (ไฟล์ใหม่ ES5) · Node vm tests ใน `scripts/*-test.js` · Chrome CDP probe (scratchpad)

**Spec:** `docs/superpowers/specs/2026-11-25-btc-quantity-design.md`

## Global Constraints

- ไฟล์ใหม่ใน `public/` เป็น ES5 (ไม่มี let/const/arrow/template) · ไฟล์เดิมเขียนตามสำนวนของไฟล์นั้น
- `portfolio-core.js` และ `api/portfolio-holdings.js` เป็น CRLF — แก้ด้วย Edit tool เท่านั้น
- ข้อความไทย · ไม่มีคำแนะนำซื้อ/ขาย · ไม่มี ฿ ใน title/aria-label
- server รับ PUT ทั้งเอกสาร → GET สดก่อน PUT ทุกครั้ง · เอกสารไม่มีไตรมาส = ไม่ PUT
- ทดสอบห้ามแตะเอกสารพอร์ตจริง (probe ตอบ `/api/portfolio*` ในหน่วยความจำเท่านั้น)
- ห้าม commit จนผู้ใช้สั่ง "push git"
- fixture มาตรฐาน: BTC $100,000 · USD/THB 34 · 0.5 BTC → ฿1,700,000.00 · ลงทุนจริง 60% → ส่วนที่ถือ ฿1,020,000.00

## Review Focus

1. เครื่องใหม่ไม่มี snapshot/ราคา BTC → ไม่เขียนอะไร · Editor ไม่ยอมบันทึกแถว bitcoin ใหม่ (ไม่ใช่บันทึกเป็น 0) และบอกให้กด Load Latest Data — Task 4
2. เครื่อง B ที่ snapshot เก่ากว่าต้องไม่ทับมูลค่าที่เครื่อง A ประเมินด้วยราคาใหม่กว่า (`btcValuedAt`) — Task 1
3. ข้ามไตรมาสตามปฏิทินแล้วยังไม่สร้างไตรมาสใหม่ → หยุดตามราคา ไม่เขียน — Task 1
4. หน้าเดียวมีตัวเขียนสองตัวพร้อมกัน (Editor บันทึกระหว่าง run · PM ซิงก์แถวหุ้นนอกระหว่าง run) → ไม่มีการทับหาย — Task 2, 3
5. ล็อก Privacy อยู่ → จำนวน BTC ไม่โผล่เป็นตัวเลขที่ไหนเลย (ตาราง/ฟอร์ม) — Task 4
6. run → เขียน snapshot → event → run อีกรอบต้องหยุด (ไม่ยิง network รอบสอง) — Task 2

---

### Task 1: แกนคำนวณ `public/btc-value.js` (pure)

**Files:** Create `public/btc-value.js` · Test `scripts/btc-value-test.js`

**Interfaces — Produces (window.BtcValue / module.exports):**
- `priceOf(snapshot) → { usd: number, at: string } | null` — `historicalData.BTCUSD` (หรือ `"BTC-USD"`) ปิดล่าสุดที่ > 0 · ไม่มี → `technicalSignals.BTCUSD.latestClose` · `at` = `historicalData.BTCUSD.lastUpdated` ไม่มี → `snapshot.loadedAt` ไม่มี → null ทั้งก้อน
- `liveKeyOf(ps, nowMs?) → string | null` — คีย์ไตรมาสล่าสุดของเอกสาร ถ้า `compareQuarterKeys(key, calendarKey(now)) >= 0` (กติกาเดียวกับ ForeignSleeve.isQuarterEnded แต่ใช้คีย์ล่าสุด)
- `valueOfRow(row, live) → { value, usd, fx, at } | null` — `live = { usd, fx, at } | null` · เลือกราคาที่ใหม่กว่าระหว่างที่เก็บในแถว (`btcPriceUsd`,`usdThb`,`btcValuedAt`) กับ live (`live.at >= row.btcValuedAt` → live) · `value = round2(btcQty × usd × fx)` · ไม่มี qty ที่ถูกต้อง/ไม่มีราคาเลย → null
- `applyToDoc(ps, live, opts) → { ps, changes: [{ name, qty, from, to, at }] }` — รับ wrapper `{data}` หรือ doc ตรง · แก้เฉพาะแถว `type === "bitcoin"` ที่มี `btcQty` (number จำกัด ≥ 0) ในไตรมาส `liveKeyOf` · ตั้ง `manualValue = snapshotValue = value`, `btcPriceUsd`, `usdThb`, `btcValuedAt` · ไม่เปลี่ยน → คืน ps ตัวเดิม (reference เดียวกัน) · ไม่แก้ input · `opts.now` ใช้แทน Date.now()
- `heldValueOf(ps, opts) → number | null` — Σ ของแถว bitcoin ในไตรมาสที่ตามราคา: `manualValue × investedPercent/100` (round2) · ไม่มีแถว bitcoin → null
- `isQty(v) → boolean`

- [ ] **Step 1: เขียนเทสต์ (ต้องแดง)** — `scripts/btc-value-test.js` (vm โหลดไฟล์จริง) อย่างน้อย:
  - `priceOf` = `{ usd: 100000, at: <lastUpdated> }` · ไม่มีซีรีส์ → ใช้ technicalSignals · ไม่มีทั้งคู่ → null · ราคา 0/ติดลบ/สตริงว่าง → ไม่นับ
  - `liveKeyOf`: เอกสาร Q3,Q4 · now = 2026-11-25 → "2026-Q4" · now = 2027-01-05 → null · ไตรมาสอนาคต 2027-Q1 ตอน พ.ย. → "2027-Q1"
  - `applyToDoc` 0.5 BTC → `manualValue === 1700000 && snapshotValue === 1700000 && btcPriceUsd === 100000 && usdThb === 34`
  - แถว bitcoin ไม่มี qty / แถวอื่น / ไตรมาสก่อน = reference เดิม · รันซ้ำด้วยราคาเดิม → `changes.length === 0` และ `ps` ตัวเดิม
  - Review Focus 2: แถว `btcValuedAt` 2026-11-25T10:00Z + live `at` 2026-11-24T10:00Z → ใช้ราคาที่เก็บในแถว (ไม่ทับด้วยราคาเก่า)
  - Review Focus 3: now = 2027-01-05 → ไม่มี changes
  - `heldValueOf` 0.5 BTC 60% → 1020000 · สองแถว bitcoin รวมกัน · ไม่มีแถว → null
  - ES5 check (ไม่มี `let `/`const `/`=>`/backtick)
- [ ] **Step 2:** `node scripts/btc-value-test.js` → FAIL (ไม่มีไฟล์)
- [ ] **Step 3:** เขียน `public/btc-value.js` ส่วน pure
- [ ] **Step 4:** เทสต์ผ่าน

### Task 2: ล็อกเอกสาร + ตัวเขียน `BtcValue.run()`

**Files:** Modify `public/portfolio-core.js` (ข้าง `withHoldingsLock`) · Modify `public/btc-value.js` · Test `scripts/btc-value-test.js`

**Interfaces — Produces:**
- `PortfolioCore.withDocLock(task) → Promise` — chain แยกจาก holdings · งานที่ล้มไม่ทำให้ล็อกค้าง
- `BtcValue.fx() → Promise<number|null>` — `https://api.frankfurter.dev/v1/latest?base=USD&symbols=THB` แคช `localStorage["btc_value_fx_v1"] = { day: "YYYY-MM-DD"(UTC), thb }` · วันเดียวกันไม่ยิงซ้ำ · ยิงไม่ได้ → ค่าที่แคช (วันไหนก็ได้) · ไม่มี → null
- `BtcValue.lastFx() → number | null` (sync จากแคช)
- `BtcValue.run() → Promise<{ ran, reason?, changes?, holding? }>`:
  1. ไม่มี PortfolioCore → ลองใหม่ (สูงสุด 5 ครั้ง ห่าง 2 วิ) · ไม่มีราคา → `{ran:false, reason:"no-price"}` · ไม่มี fx → `"no-fx"`
  2. due (ในเครื่อง ไม่ยิง network): `applyToDoc(snapshot.portfolioStatus, live)` มี changes หรือแถว BTC ใน `snapshot.portfolioHoldings.data` ไม่ตรง heldValue → ไม่ due = `"nothing-due"`
  3. ใน `withDocLock`: GET `/api/portfolio` → ไม่มีไตรมาส = หยุด · `applyToDoc` → มี changes → PUT `{ data: doc }` → สำเร็จ = `PortfolioDataSnapshot.write(สำเนา snapshot ที่ portfolioStatus.data = doc)` (คง wrapper/ฟิลด์อื่น)
  4. แถว holdings: แถวที่ `isHolding` และ bucket bitcoin (ForeignSleeve.bucketOf / มี "BTC") **แถวเดียว** และ `marketValue !== heldValue` → `PortfolioCore.updateHolding` ตั้ง `marketValue = heldValue` · หลายแถว → ไม่ทำ (`holding: "ambiguous"`)
  5. ยิง `"btc-value-updated"` เมื่อมีการเปลี่ยน · inflight/again แบบ holding-revalue · auto: `"portfolio-data-snapshot"` → 1.5 วิ · โหลดหน้า → 2.5 วิ

- [ ] **Step 1: เทสต์ (แดง)** ใน `scripts/btc-value-test.js`:
  - run(): GET → PUT ครั้งเดียว body แถว bitcoin = 1700000 · snapshot ถูกเขียนด้วย portfolioStatus ใหม่ (wrapper คง `mode`)
  - Review Focus 6: เรียก run() ซ้ำหลังเขียน snapshot → `reason === "nothing-due"` และ fetch ไม่ถูกเรียก
  - PUT ล้ม → ไม่เขียน snapshot · GET ได้เอกสารไม่มีไตรมาส → ไม่ PUT
  - Review Focus 4: ตัวเขียนอื่นถือ `withDocLock` อยู่ (PUT ค้าง) → run ยังไม่ GET จนตัวนั้นจบ แล้ว GET เห็นค่าของตัวนั้น (ไม่ทับ)
  - holdings: แถว BTCUSD ถือ 1 แถว marketValue 900000 → updateHolding ตั้ง 1020000 · สองแถว → ไม่ทำ · ไม่มีแถว → ไม่ทำ
  - fx: วันเดียวกันยิงครั้งเดียว · fetch ล้ม → ใช้แคชเก่า · ไม่มีอะไร → `no-fx` และไม่ PUT
  - core: `withDocLock` ทำทีละงาน · งานที่ล้มไม่ค้างล็อก
- [ ] **Step 2:** แดง · **Step 3:** เขียน · **Step 4:** เขียว

### Task 3: ตัวเขียนเอกสารอื่นใช้ล็อกเดียวกัน + โหลดโมดูลทุกหน้า

**Files:** `public/portfolio-manager-page.js` (`persistCash`, `runRowSync`) · `public/allocation-card-page.js` (บันทึก cashBand) · `public/asset-allocation-page.js` (บันทึก allocation) · `public/app-navigation.js` (mountShell: `portfolio-core.js?v=20261125-core-6`, `btc-value.js?v=20261125-btc-1`) · Test: `scripts/btc-value-test.js` (wiring) + เทสต์เดิมของแต่ละหน้า

**Interfaces — Consumes:** `PortfolioCore.withDocLock` (ไม่มี → ทำงานตรงแบบเดิม)

- [ ] **Step 1: เทสต์ (แดง)** — regex ว่า 3 ไฟล์ห่อ GET→PUT ด้วย `withDocLock` และ shell inject `btc-value.js` หลัง `portfolio-core.js` · behavioural: PM `runRowSync` กับ `BtcValue.run` บนหน้าเดียวกันสลับกันไม่ได้ (ใช้ portfolio-core จริง)
- [ ] **Step 2-4:** แดง → ห่อด้วย `var lock = (window.PortfolioCore && typeof window.PortfolioCore.withDocLock === "function") ? window.PortfolioCore.withDocLock : function (t) { return t(); };` → เทสต์เดิมทั้งหมดของ 3 หน้ายังผ่าน

### Task 4: Quarterly Editor กรอกจำนวน BTC

**Files:** `public/index.html` (ช่อง `#btcQtyInput` + `#btcQtyNote` ใน `<label class="btc-qty-field is-hidden">` ถัดจาก `.manual-value-field` · หัวฟอร์ม · `<script src="/btc-value.js?v=20261125-btc-1">` ก่อน app.js) · `public/app.js` · Test: `scripts/editor-btc-qty-test.js` (ดึงฟังก์ชันจริงจาก app.js แบบ quarterly-editor-save-test)

**Interfaces — Produces (app.js top-level):**
- `btcLive() → { usd, at, fx } | null` — `BtcValue.priceOf(PortfolioDataSnapshot.read())` + `BtcValue.lastFx()`
- `isBtcQtyMode(type) → boolean` — `type === "bitcoin"` และไตรมาสที่เปิด = `BtcValue.liveKeyOf(state.data)`
- `applyBtcValues() → boolean` — `state.data = BtcValue.applyToDoc(state.data, btcLive()).ps` · คืนว่าเปลี่ยนไหม (ไม่บันทึกเอง)
- `formatBtcQty(qty) → string` — `"0.5 BTC"` (สูงสุด 8 ทศนิยม ตัดศูนย์ท้าย) · ล็อก Privacy → `"XXX BTC"`

**พฤติกรรม:**
- `updateFormMode`: โหมดจำนวน → ซ่อน `.manual-value-field` โชว์ `.btc-qty-field` · ไตรมาสอื่น → แบบเดิม
- `readAssetFromForm` โหมดจำนวน: qty ต้องเป็นตัวเลข ≥ 0 (ว่าง = "กรุณากรอกจำนวน BTC") · `btcLive()` null และแถวไม่มีราคาเก็บไว้ → "ยังไม่มีราคา BTC — กด Load Latest Data แล้วบันทึกอีกครั้ง" (Review Focus 1) · ได้ `btcQty` + ฟิลด์ราคา + `manualValue = snapshotValue = value` จาก `BtcValue.valueOfRow`
- ช่องจำนวนใช้กติกา Privacy เดียวกับช่องเงิน (`moneyFieldText(asset, "btcQty")` · `formMoneyText` · `applyMoneyPrivacy`)
- โน้ตใต้ช่อง (อัปเดตตอนพิมพ์): `≈ ฿X · BTC $P × F บาท/USD · ราคา ณ <วันเวลาไทย>` (฿ ถูก privacy.js ซ่อนเอง)
- ตาราง: ใต้ชื่อแถวที่มี `btcQty` → `formatBtcQty` · ล็อก/ปลดล็อก → วาดแถวใหม่
- `applyBtcValues()` ก่อน: `persistRemoteData` PUT (ใช้ `typeof applyBtcValues === "function"` กัน sandbox เทสต์เดิม) · `saveSnapshot` · หลัง `loadRemoteData` · `copyFromPreviousQuarter` (คัดลอก `btcQty`/`btcPriceUsd`/`usdThb`/`btcValuedAt` ด้วย) · event `"portfolio-data-snapshot"` และ `BtcValue.fx()` เสร็จ → applyBtcValues + render (ไม่บันทึกเอง)
- `persistRemoteData`: ช่วง adopt+sync+PUT อยู่ใน `withDocLock` (lookup inline ใน function — sandbox เดิมไม่มี PortfolioCore = ทำงานตรง)

- [ ] **Step 1: เทสต์ (แดง)** `scripts/editor-btc-qty-test.js`:
  - โหมดจำนวน: bitcoin + ไตรมาสล่าสุดยังไม่จบ → true · ไตรมาสเก่า → false · type อื่น → false
  - `readAssetFromForm` 0.5 BTC → `btcQty 0.5, manualValue 1700000, snapshotValue 1700000, investedPercent 60`
  - ไม่มีราคา → คืน null + ข้อความ "ยังไม่มีราคา BTC" · qty ว่าง/ติดลบ → null + "กรุณากรอกจำนวน BTC"
  - Privacy: ล็อก + แก้แถวเดิม + ช่องว่าง → ใช้ qty เดิม · `formatBtcQty(0.5)` ล็อก → "XXX BTC" ปลด → "0.5 BTC"
  - `copyFromPreviousQuarter` คัดลอก `btcQty`
  - `persistRemoteData` คำนวณก่อน PUT (body แถว bitcoin = มูลค่าราคาใหม่) และอยู่ใน withDocLock เมื่อมี PortfolioCore
  - index.html: มี `#btcQtyInput` ใน `.btc-qty-field` · โหลด btc-value.js ก่อน app.js
- [ ] **Step 2-4:** แดง → เขียน → เขียว + เทสต์ Editor เดิม (`quarterly-editor-save-test`, `editor-follows-pm-test`, `quarterly-editor-glass-test`) ผ่าน

### Task 5: เวอร์ชัน + ตรวจทั้งระบบ

**Files:** HTML ที่อ้าง `app-navigation.js` (19 ไฟล์ → `20261125-nav-37`) · `index.html` (`app.js?v=20261125-app-16`) · `portfolio-manager.html` (`portfolio-manager-page.js?v=20261125-pm-36`, `portfolio-core.js` ถ้าโหลดตรง → core-6) · `portfolio.html` (`allocation-card-page.js?v=20261125-ac-4`, `asset-allocation-page.js?v=20261125-aa-15`) · เทสต์ที่ปักเวอร์ชัน: `decision-journal-view-test`, `editor-follows-pm-test`, `pm-cash-test`, `pm-glass-test`, `pm-settings-sync-test`, `quarterly-editor-glass-test`, `allocation-card-test`, `portfolio-glass-test`

- [ ] **Step 1:** bump ด้วยสคริปต์ (Write tool) ที่ fail เมื่อหา needle ไม่เจอ
- [ ] **Step 2:** `for f in scripts/*-test.js` ผ่านทั้งหมด (`site-integrity-test` = หนึ่งเวอร์ชันต่อไฟล์)
- [ ] **Step 3:** Chrome probe (`/` และ `/portfolio-manager` · `/api/portfolio*` ในหน่วยความจำ): กรอก 0.5 BTC → ตาราง ฿1,700,000 · Load Latest Data ราคาใหม่ → PUT ครั้งเดียว + หน้า PM/Position เห็นเลขใหม่ · ล็อกอยู่ไม่เห็นจำนวน · 390px ไม่มีสกรอลล์แนวนอน
- [ ] **Step 4:** mutation check ของจุดสำคัญ (ราคาเก่าทับ · ไตรมาสจบ · ล็อก · privacy · loop)
- [ ] **Step 5:** รีวิวทั้งชุดโดย reviewer ใหม่ (โมเดลสูงสุด) → แก้ → รายงานผู้ใช้ · ไม่ commit
