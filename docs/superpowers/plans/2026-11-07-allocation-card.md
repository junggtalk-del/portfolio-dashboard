# การ์ด Asset allocation บน /portfolio — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** การ์ดใหม่บนหน้า /portfolio แสดง 4 ก้อน (Bitcoin · หุ้นต่างประเทศ · กองทุน RMF · หุ้นไทย) เป็นแท่งล้านบาท แยกส่วนลงทุนแล้ว/ยังไม่ลงทุน (รอซื้อ) ตาม investedPercent ของ Quarterly Editor พร้อมช่องภาพรวม 2 ช่อง และแถบเงินสดเทียบกรอบ 1–3 ล้านที่ผู้ใช้ตั้งเอง — ตัวเลขทุกตัวเท่ากับส่วนหัวของหน้า ไม่มีคำแนะนำ

**Architecture:** เอนจินเล็ก pure `allocation-card-engine.js` รับผลของ `PortfolioPosition.compute` (ตัวเดียวกับที่ส่วนหัวใช้) + `allocationPlan` แล้วคืนโมเดลการ์ด · หน้า `allocation-card-page.js` mount ใน `#acRoot` (พี่น้องของ `#ppRoot`) ฟัง event ที่ `portfolio-position-page.js` ยิงหลัง render ทุกครั้ง (ส่ง R และเอกสารพอร์ตมาด้วย) จึงไม่คำนวณซ้ำและไม่ fetch ซ้ำ · กรอบเงินสดบันทึกลงเอกสาร `/api/portfolio` คีย์ใหม่ `allocationPlan` ด้วยวิธี GET → ใส่คีย์ → PUT ทั้งเอกสาร (แบบเดียวกับ asset-allocation-page) + ร่าง localStorage

**Tech Stack:** vanilla JS ES5 (IIFE + `window.*` + `module.exports`), CSS ใน portfolio-position.css, Node VM test harness, CDP probe

**Spec:** `docs/superpowers/specs/2026-11-07-allocation-card-design.md`

## Global Constraints

- ES5 เคร่งครัดในไฟล์ใต้ `public/` (ห้าม `=>`, `const`, `let`, template literal) · ข้อความไทย
- ห้าม "ควรซื้อ/ควรขาย/น่าซื้อ/น่าขาย/น่าเข้า/แนะนำซื้อ/จุดเข้า/ตัดขาดทุน" และ `\b(Buy|Sell)\b` ใน HTML ที่วาด ("รอซื้อ" และ "ซื้อ" ในข้อความทวนกติกาของผู้ใช้ใช้ได้) · ระบบไม่แนะนำ ไม่มีสถานะ "ควร…"
- เงินวาดเป็นข้อความ `฿…` ให้ privacy.js ซ่อน · ห้ามใส่เงินใน `title`/`aria-label`
- **ห้าม commit** — "Commit" step ทุกข้อแทนด้วยการรันเทสต์ ผู้ใช้สั่ง "push git" เอง · เขียนไฟล์ด้วย Write/Edit tools (ไม่ใช้ heredoc / `node -e` ที่มี regex)
- ค่าคงที่จากสเปก: 5 ก้อน = `bitcoin` · `foreign-stock` · `provident-fund` (แท่ง "กองทุนหุ้น" — แยกออกจากหุ้นนอกตามคำสั่งผู้ใช้หลัง implement; ตัวเลขในเทสต์ของ Task 1–2 ด้านล่างเป็นของรุ่น 4 ก้อน ไฟล์เทสต์จริงอัปเดตแล้ว) · `rmf-jang`+`rmf-tum` · `thai-stock` · เงินสด = `cash` · `custom` ไม่มีแท่งแต่นับในลงทุนจริง/ความมั่งคั่ง · รอซื้อ = ส่วนที่ยังไม่ลงทุนตาม `investedPercent` · กรอบเงินสดค่าเริ่มต้น 1,000,000 / 3,000,000 บาท · แถบเงินสดเทียบ `cash` เท่านั้น · เงินแสดงเป็นล้านบาท 1 ตำแหน่ง · % จำนวนเต็ม
- **ตัวเลขการ์ดต้องเท่ากับส่วนหัวของหน้า:** `invested === R.totals.investedSum` · `cashTotal === R.totals.cashSum` · `wealth === R.totals.total` (R = `PortfolioPosition.compute`)
- ไม่แตะ `asset-allocation-engine.js`/`asset-allocation-page.js` และบล็อก "สัดส่วนพอร์ตตอนนี้" เดิม · ไฟล์ที่โหลดจากหลายหน้าต้องมี `?v=` เดียวกัน (`scripts/site-integrity-test.js`) · ก่อนจบต้องรันทุกชุด `scripts/*-test.js` (42 ชุด)

## Review Focus

1. รายการที่มูลค่า 0 หรือ `investedPercent` ว่าง/ผิดชนิด (null, "", "abc") ต้องไม่ทำให้เกิด NaN — ก้อนว่างแสดง "—" ไม่ใช่ 0% ของ 0 — เทสต์ใน Task 1
2. ไม่มีไตรมาสใน Editor (`R.available === false`) → การ์ดบอก "ยังไม่มีข้อมูลใน Quarterly Editor" ไม่วาดแท่ง ไม่ throw — Task 2
3. ส่วนหัวของหน้า render ใหม่ (Load Latest Data / แก้ Editor อีกแท็บ) → การ์ดตามทันทีด้วยตัวเลขชุดเดียวกัน และการ์ดไม่หายเมื่อ `#ppRoot` ถูกเขียนทับ — Task 2
4. บันทึกกรอบเงินสดขณะอีกแท็บเพิ่งแก้ Editor → PUT ต้องมี quarters ของเซิร์ฟเวอร์ล่าสุด (ไม่ใช่สำเนาเก่าของหน้า) และเซิร์ฟเวอร์ตอบว่างต้องไม่ PUT ทับ — Task 3
5. Privacy Lock เปิดอยู่ → เงินทุกตัว (รวมค่าในช่องกรอกกรอบเงินสด) ไม่โผล่เป็นตัวเลข — Task 3

---

## File Structure

| ไฟล์ | หน้าที่ |
|---|---|
| Create `public/allocation-card-engine.js` | pure: `normalizePlan`, `compute(R, plan)` → โมเดลการ์ด · `window.AllocationCard` + `module.exports` |
| Create `public/allocation-card-page.js` | วาดการ์ดใน `#acRoot` จาก event ของหน้า position · ฟอร์มกรอบเงินสด · บันทึก GET→PUT + ร่าง · `window.AllocationCardPage` |
| Modify `public/portfolio-position-page.js` (`render` ~152–175, `window.PortfolioPositionPage` ~242) | หลัง render: เก็บ `lastResult`/`lastDoc` และยิง `portfolio-position-rendered` |
| Modify `public/portfolio.html` (บรรทัด ~22–35) | เพิ่ม `<div id="acRoot">` หลัง `#ppRoot` ก่อน `#aaRoot` · สคริปต์ engine+page หลัง portfolio-position-page.js · bump pp-13 |
| Modify `public/portfolio-position.css` | เพิ่ม `.ac-*` (+ breakpoint 600px) · bump `?v=20261107-pp-13` ใน portfolio.html |
| Create `scripts/allocation-card-engine-test.js`, `scripts/allocation-card-test.js` · Modify `scripts/quarterly-editor-save-test.js` (+1 assertion) | เทสต์ |

---

### Task 1: เอนจิน — `normalizePlan` + `compute(R, plan)`

**Files:**
- Create: `public/allocation-card-engine.js`
- Test: `scripts/allocation-card-engine-test.js`

**Interfaces:**
- Consumes: `R = PortfolioPosition.compute(snapshot)` (`public/portfolio-position-engine.js`): `R.available`, `R.quarterKey`, `R.totals { total, investedSum, cashSum, investedPct, cashPct, assetCount }`, `R.buckets[] { type, label, gross, invested, cash, investedPct }` (ค่าที่ปัดแล้วตาม engine เดิม)
- Produces:
  - `AllocationCard.VERSION = "ac-1"`, `DEFAULT_BAND = { min: 1000000, max: 3000000 }`, `CLASSES = [{ key: "bitcoin", label: "Bitcoin", types: ["bitcoin"] }, { key: "foreign", label: "หุ้นต่างประเทศ", types: ["foreign-stock", "provident-fund"] }, { key: "rmf", label: "กองทุน RMF", types: ["rmf-jang", "rmf-tum"] }, { key: "thai", label: "หุ้นไทย", types: ["thai-stock"] }]`
  - `normalizePlan(raw) → { cashBand: { min, max }, updatedAt: string|null }` — raw ว่าง/ผิดรูป → ค่าเริ่มต้น · min/max ต้องเป็นตัวเลขจำกัด ≥ 0 และ min ≤ max ไม่งั้นใช้ค่าเริ่มต้นทั้งคู่
  - `compute(R, plan) → { available: boolean, reason: string|null, quarterKey, wealth, invested, investedPct, cashEditor, waitSum, cashTotal, cashTotalPct, classes: [{ key, label, held, wait, total, heldPct, waitPct, wealthPct, empty: boolean }], others: { held, wait } (type custom), axis: { max, ticks: number[] }, cashBand: { min, max, now, status: "below"|"within"|"above"|null, scaleMax } }` — ทุกจำนวนเงินเป็นบาท ไม่ปัด (ปัดที่หน้า) · % เป็นตัวเลข 0–100 ไม่ปัด · ไม่มี NaN/undefined (ไม่รู้ = null) · `R.available === false` → `{ available: false, reason: R.reason }`
  - สูตร: `held` = Σ `bucket.invested` ของ types ในก้อน · `wait` = Σ `bucket.cash` ของ types นั้น (cash ของ bucket = ส่วนยังไม่ลงทุน) · `total = held + wait` · `heldPct = held/total×100`, `waitPct = wait/total×100` (total = 0 → `empty: true`, pct null) · `wealthPct = held/wealth×100` · `invested = R.totals.investedSum` · `cashTotal = R.totals.cashSum` · `wealth = R.totals.total` · `cashEditor` = gross ของ bucket type `cash` (0 ถ้าไม่มี) · `waitSum = cashTotal − cashEditor` · `axis.max` = ปัดขึ้นค่าสูงสุดของ `total` ทุกก้อนเป็น 1/2/2.5/5 × 10^k (ล้านบาท) · `axis.ticks` = 0, ¼, ½, ¾, max · `cashBand.now = cashEditor` · status: now < min → below · now > max → above · ไม่งั้น within · `scaleMax = max(band.max × 4/3, now × 1.1)`

- [ ] **Step 1: เขียนเทสต์ที่ยังไม่ผ่าน** `scripts/allocation-card-engine-test.js` — สร้าง R จากเอนจินจริง: `var PP = require("../public/portfolio-position-engine.js"); var R = PP.compute({ portfolioStatus: { data: FIX } , portfolioHoldings: { data: [] } }, {})` (ตรวจรูป snapshot ที่ `compute` ต้องการจากไฟล์เอนจิน/`scripts/portfolio-position-smoke-test.js` แล้วใช้ให้ตรง) · FIX = `{ currentQuarter: "2026-Q3", quarters: { "2026-Q3": { key: "2026-Q3", assets: [ A("bitcoin","Bitcoin",10000000,78), A("foreign-stock","US",4000000,90), A("provident-fund","PVD",1000000,100), A("rmf-jang","RMF-จัง",1500000,100), A("rmf-tum","RMF-ตุ๋ม",1400000,100), A("thai-stock","หุ้นไทย",4500000,88), A("cash","เงินสด",2100000,0), A("custom","อื่นๆ",500000,100) ] } } }` โดย `A(type,name,value,inv) = { type, name, manualValue: value, snapshotValue: value, investedPercent: inv }` (เลือก 88% ให้ผลรวมรอซื้อ 3.14 ล้าน หลีกเลี่ยงค่า x.x5 ที่ `toFixed(1)` ปัดไม่แน่นอน)

```js
var AC = require("../public/allocation-card-engine.js");
var M = AC.compute(R, AC.normalizePlan(null));
t("available with quarter key", M.available === true && M.quarterKey === "2026-Q3");
t("wealth / invested / cashTotal equal the hero totals (R.totals) exactly", M.wealth === R.totals.total && M.invested === R.totals.investedSum && M.cashTotal === R.totals.cashSum && M.wealth === 25000000);
t("invested 19.76M = sum of invested parts incl. provident + custom", Math.abs(M.invested - 19760000) < 1e-6);
t("cashEditor 2.1M · waitSum 3.14M · cashTotal 5.24M", M.cashEditor === 2100000 && Math.abs(M.waitSum - 3140000) < 1e-6 && Math.abs(M.cashTotal - 5240000) < 1e-6);
var C = {}; M.classes.forEach(function (c) { C[c.key] = c; });
t("Bitcoin held 7.8M (78% of class) · wait 2.2M (22%) · 31.2% of wealth", Math.abs(C.bitcoin.held - 7800000) < 1e-6 && Math.abs(C.bitcoin.wait - 2200000) < 1e-6 && Math.abs(C.bitcoin.heldPct - 78) < 1e-9 && Math.abs(C.bitcoin.waitPct - 22) < 1e-9 && Math.abs(C.bitcoin.wealthPct - 31.2) < 1e-9);
t("foreign class = foreign-stock + provident-fund: held 4.6M · wait 0.4M · total 5.0M · 92% / 8%", Math.abs(C.foreign.held - 4600000) < 1e-6 && Math.abs(C.foreign.wait - 400000) < 1e-6 && Math.abs(C.foreign.total - 5000000) < 1e-6 && Math.abs(C.foreign.heldPct - 92) < 1e-9);
t("RMF = jang + tum 2.9M · no wait → heldPct 100, waitPct 0", Math.abs(C.rmf.held - 2900000) < 1e-6 && C.rmf.wait === 0 && C.rmf.heldPct === 100 && C.rmf.waitPct === 0 && C.rmf.empty === false);
t("thai held 3.96M · wait 0.54M · 88/12 · 15.84% of wealth", Math.abs(C.thai.held - 3960000) < 1e-6 && Math.abs(C.thai.wait - 540000) < 1e-6 && Math.abs(C.thai.heldPct - 88) < 1e-9 && Math.abs(C.thai.waitPct - 12) < 1e-9 && Math.abs(C.thai.wealthPct - 15.84) < 1e-9);
t("others (custom) counted but no bar", M.others.held === 500000 && M.others.wait === 0 && M.classes.length === 4);
t("class order fixed: bitcoin, foreign, rmf, thai", M.classes.map(function (c) { return c.key; }).join() === "bitcoin,foreign,rmf,thai");
t("axis max 10M with 5 ticks", M.axis.max === 10000000 && M.axis.ticks.join() === "0,2500000,5000000,7500000,10000000");
t("cash band default 1–3M · now 2.1M within · scaleMax 4M", M.cashBand.min === 1000000 && M.cashBand.max === 3000000 && M.cashBand.now === 2100000 && M.cashBand.status === "within" && M.cashBand.scaleMax === 4000000);
t("band below / above", AC.compute(R, AC.normalizePlan({ cashBand: { min: 2500000, max: 3000000 } })).cashBand.status === "below" && AC.compute(R, AC.normalizePlan({ cashBand: { min: 500000, max: 1000000 } })).cashBand.status === "above");
t("scaleMax follows now when now > max×4/3", AC.compute(R, AC.normalizePlan({ cashBand: { min: 500000, max: 1000000 } })).cashBand.scaleMax === 2100000 * 1.1);
t("normalizePlan: bad shapes → defaults", JSON.stringify(AC.normalizePlan({ cashBand: { min: 5, max: 1 } }).cashBand) === JSON.stringify(AC.DEFAULT_BAND) && JSON.stringify(AC.normalizePlan({ cashBand: { min: "x", max: null } }).cashBand) === JSON.stringify(AC.DEFAULT_BAND) && AC.normalizePlan(undefined).updatedAt === null);
t("normalizePlan keeps a valid band and updatedAt", (function () { var p = AC.normalizePlan({ cashBand: { min: 0, max: 2000000 }, updatedAt: "2026-11-07T00:00:00.000Z" }); return p.cashBand.min === 0 && p.cashBand.max === 2000000 && p.updatedAt === "2026-11-07T00:00:00.000Z"; })());
// ขอบ: ไม่มีไตรมาส · ก้อนว่าง · investedPercent ผิดชนิด
t("R.available false → available false with reason", (function () { var m = AC.compute({ available: false, reason: "no-quarterly" }, AC.normalizePlan(null)); return m.available === false && m.reason === "no-quarterly"; })());
var R2 = PP.compute({ portfolioStatus: { data: { currentQuarter: "2026-Q3", quarters: { "2026-Q3": { key: "2026-Q3", assets: [A("cash","เงินสด",500000,0), A("thai-stock","หุ้นไทย",0,50), A("bitcoin","Bitcoin",1000000,"abc")] } } } }, portfolioHoldings: { data: [] } }, {});
var M2 = AC.compute(R2, AC.normalizePlan(null));
t("empty classes flagged, pct null, no NaN anywhere", M2.classes.filter(function (c) { return c.empty; }).length === 3 && M2.classes.filter(function (c) { return c.empty; }).every(function (c) { return c.heldPct === null && c.waitPct === null; }) && !/NaN|undefined|Infinity/.test(JSON.stringify(M2)));
t("bad investedPercent ('abc') is treated as 0 invested like the hero does (bitcoin all wait)", (function () { var b = M2.classes[0]; return b.key === "bitcoin" && b.held === 0 && b.wait === 1000000 && b.waitPct === 100; })());
t("ES5 + Thai labels + no advisory words in the engine", es5ok("allocation-card-engine.js") && /หุ้นต่างประเทศ/.test(src) && !/ควรซื้อ|ควรขาย|น่าซื้อ|น่าขาย/.test(src));
```

- [ ] **Step 2: รันเทสต์ ต้องล้ม** — Run: `node scripts/allocation-card-engine-test.js` · Expected: `Cannot find module '../public/allocation-card-engine.js'`
- [ ] **Step 3: สร้าง `public/allocation-card-engine.js`** ตาม Interfaces (header comment ไทยอธิบายสัญญา pure/ES5 แบบ portfolio-position-engine) · ค่าของก้อนอ่านจาก `R.buckets` เท่านั้น (ห้ามอ่าน quarters เอง) · ปัดขึ้นแกน: `niceCeil(x)` = ขั้น 1, 2, 2.5, 5 × 10^k ที่ ≥ x (x เป็นบาท; ถ้า max = 0 → 1,000,000)
- [ ] **Step 4: รันเทสต์ ต้องผ่าน** — Run: `node scripts/allocation-card-engine-test.js` · Expected: 0 failed · `node --check public/allocation-card-engine.js` · `node scripts/portfolio-position-smoke-test.js | tail -1` ยัง 0 failed

---

### Task 2: หน้า — การ์ดอ่านอย่างเดียว + hook จากหน้า position + HTML/CSS

**Files:**
- Create: `public/allocation-card-page.js`
- Modify: `public/portfolio-position-page.js` (`render` ~152–175: หลังเขียน `root.innerHTML` และในกรณี `!R.available` ให้บันทึก `last = { R: R, data: psCache ? psCache.data : null }` ลง `window.PortfolioPositionPage.last` แล้วยิง `window.dispatchEvent(new CustomEvent("portfolio-position-rendered", { detail: last }))` (guard ไม่มี CustomEvent) · export ใน `window.PortfolioPositionPage = { render, last: null }`) · `public/portfolio.html` (เพิ่ม `<div id="acRoot" class="ac-embedded"><div class="mc-empty"><strong>กำลังโหลด Asset allocation…</strong></div></div>` หลัง `</main>` ของ `#ppRoot` ก่อน `#aaRoot` · เพิ่ม `<script src="/allocation-card-engine.js?v=20261107-ac-1"></script>` และ `<script src="/allocation-card-page.js?v=20261107-ac-1"></script>` ถัดจาก portfolio-position-page.js · bump `portfolio-position.css?v=20261107-pp-13` และ `portfolio-position-page.js?v=20261107-pp-13`) · `public/portfolio-position.css` (บล็อก `.ac-*`)
- Test: `scripts/allocation-card-test.js` (harness แบบ `scripts/asset-allocation-view-test.js` `boot()`: VM sandbox, `mkEl`, fake fetch `/api/portfolio` GET → `{ data: FIX }` / PUT → `puts[]`, localStorage store, `dispatchEvent` ที่เรียก listener ที่ลงทะเบียนไว้จริง (ต้องทำให้ `win.addEventListener`/`dispatchEvent` ทำงานจริง เพราะการ์ดฟัง event จากหน้า position) · โหลดสคริปต์ตามลำดับที่ `portfolio.html` โหลดจริง เฉพาะ `portfolio-core.js`, `portfolio-position-engine.js`, `portfolio-position-page.js`, `allocation-card-engine.js`, `allocation-card-page.js` (อ่านรายชื่อจาก HTML) · `html()` = innerHTML ของ `acRoot`)

**Interfaces:**
- Consumes: event `portfolio-position-rendered` detail `{ R, data }` · `window.PortfolioPositionPage.last` · `AllocationCard.compute/normalizePlan/CLASSES`
- Produces: `window.AllocationCardPage = { render, _state }` · `state = { last: {R,data}|null, plan: normalizePlan(data.allocationPlan), form: null, saveState: "idle"|"saving"|"saved"|"error", saveError, draftNotice }` · DOM: `<section class="ac-card" data-ac-card>` · หัว `<h2 class="ac-title">Asset allocation</h2>` + `ความมั่งคั่งรวม ฿N ล้าน · <quarterKey>` + ปุ่ม `data-ac-settings` "ตั้งกรอบเงินสด" (Task 3 wire) · รอง "ตัวเลขทั้งหมดจาก Quarterly Editor (รอซื้อ = ส่วนที่ยังไม่ลงทุนของแต่ละรายการ) · ระบบไม่แนะนำให้โยก" · ช่อง `data-ac-kpi="invested"` ("ลงทุนในสินทรัพย์จริง" · `฿19.9 ล้าน` · "79% ของความมั่งคั่ง" · ถ้า `others.held > 0` บรรทัดย่อย "รวมอื่น ๆ ที่ไม่มีแท่ง ฿0.5 ล้าน") และ `data-ac-kpi="cash"` ("เงินสดทั้งหมด = เงินสด + ยังไม่ลงทุนในแต่ละก้อน" · `฿5.2 ล้าน` · "21% ของความมั่งคั่ง" · บรรทัดย่อย "เงินสด ฿2.1 ล้าน · รอซื้อ Bitcoin ฿2.2 ล้าน · หุ้นต่างประเทศ ฿0.4 ล้าน · หุ้นไทย ฿0.5 ล้าน = ฿3.1 ล้าน" เฉพาะก้อนที่ wait > 0 · **ไม่มีแถบสี**) · กราฟ `<div class="ac-chart" data-ac-chart>` แกน `data-ac-tick` ตาม `axis.ticks` (ป้ายล้านบาท) · แท่ง `<div class="ac-bar" data-ac-bar="<key>" style="height:<total/axis.max*100>%">` ภายใน `<div class="ac-seg ac-wait" style="height:<waitPct>%">รอซื้อ ฿2.2 ล้าน<small>22% ของ Bitcoin</small></div><div class="ac-seg ac-held" style="height:<heldPct>%">฿7.8 ล้าน<small>78% ของ Bitcoin</small></div>` (ก้อนว่าง → `ac-bar is-empty` ข้อความ "—") · ป้ายใต้แท่ง `<div class="ac-lbl"><b>Bitcoin</b>31% ของความมั่งคั่ง</div>` · แถบเงินสด `<div class="ac-cash" data-ac-cash="<status>">` ข้อความ "เงินสด ฿2.1 ล้าน (จาก Quarterly Editor) · ในกรอบ|ต่ำกว่ากรอบ|สูงกว่ากรอบ" + "กรอบที่ตั้งไว้ 1–3 ล้าน" + แถบ `data-ac-band` (ช่วงกรอบ `left:min/scaleMax`, `width:(max−min)/scaleMax`, จุด `data-ac-now` ที่ `now/scaleMax`) + ป้าย 0 / min ล้าน / max ล้าน · กล่องกติกา 2 ช่อง ข้อความตรงตามสเปกข้อ 4 (แทน `<ต่ำ>`/`<สูง>` ด้วยตัวเลขล้านของกรอบ) · บรรทัดท้ายตามสเปกข้อ 6
- รูปแบบตัวเลข: `fmtM(baht)` → `"฿" + (baht/1e6).toFixed(1) + " ล้าน"` · `fmtPct(x)` → `Math.round(x) + "%"` · ไม่มี `title`
- ไม่มีข้อมูล (`!last || !last.R.available`) → `<section class="ac-card"><p class="ac-empty">ยังไม่มีข้อมูลใน Quarterly Editor</p></section>` · ยังไม่ได้รับ event → ข้อความ "กำลังโหลด…"
- boot: ถ้า `window.PortfolioPositionPage && PortfolioPositionPage.last` มีอยู่แล้ว (หน้า position render ไปก่อน) ใช้เลย แล้วฟัง `portfolio-position-rendered` ต่อ · ฟัง `portfolio-allocation-saved` ด้วย (data ใหม่ → อ่าน `allocationPlan` ใหม่)

- [ ] **Step 1: เขียนเทสต์ที่ยังไม่ผ่าน** `scripts/allocation-card-test.js` (FIX เดียวกับ Task 1 + `allocationPlan: { cashBand: { min: 1000000, max: 3000000 }, updatedAt: "2026-11-01T00:00:00.000Z" }`)

```js
t("portfolio.html: acRoot sits between ppRoot and aaRoot · scripts engine→page after position-page · pp-13 and ac-1 versions", HTML.indexOf('id="acRoot"') > HTML.indexOf('id="ppRoot"') && HTML.indexOf('id="acRoot"') < HTML.indexOf('id="aaRoot"') && /allocation-card-engine\.js\?v=20261107-ac-1"[\s\S]*allocation-card-page\.js\?v=20261107-ac-1"/.test(HTML) && HTML.indexOf("portfolio-position-page.js") < HTML.indexOf("allocation-card-engine.js") && /portfolio-position\.css\?v=20261107-pp-13/.test(HTML) && /portfolio-position-page\.js\?v=20261107-pp-13/.test(HTML));
await flush(80);
t("position page exposes last {R,data} and dispatched portfolio-position-rendered", !!W.PortfolioPositionPage.last && W.PortfolioPositionPage.last.R.available === true && dispatched.some(function (e) { return e.type === "portfolio-position-rendered"; }));
t("card rendered from the same R: title + wealth equals the hero's ความมั่งคั่งรวม", /<h2 class="ac-title">Asset allocation<\/h2>/.test(html()) && /ความมั่งคั่งรวม ฿25\.0 ล้าน · 2026-Q3/.test(html()) && ppHtml().indexOf("25,000,000") >= 0);
t("kpi invested: ฿19.8 ล้าน · 79% · others line", /data-ac-kpi="invested"[\s\S]*?฿19\.8 ล้าน[\s\S]*?79% ของความมั่งคั่ง[\s\S]*?รวมอื่น ๆ ที่ไม่มีแท่ง ฿0\.5 ล้าน/.test(html()));
t("kpi cash: ฿5.2 ล้าน · 21% · breakdown only for classes with wait · no bar inside", /data-ac-kpi="cash"[\s\S]*?฿5\.2 ล้าน[\s\S]*?21% ของความมั่งคั่ง[\s\S]*?เงินสด ฿2\.1 ล้าน · รอซื้อ Bitcoin ฿2\.2 ล้าน · หุ้นต่างประเทศ ฿0\.4 ล้าน · หุ้นไทย ฿0\.5 ล้าน = ฿3\.1 ล้าน/.test(html()) && !/data-ac-kpi="cash"[\s\S]*?<i style/.test(kpi("cash")) && kpi("cash").indexOf("RMF") < 0);
t("4 bars in fixed order with heights from the numbers (bitcoin 100%, foreign 50%)", bars().join() === "bitcoin,foreign,rmf,thai" && /data-ac-bar="bitcoin" style="height:100%"/.test(html()) && /data-ac-bar="foreign" style="height:50%"/.test(html()));
t("bitcoin bar: held ฿7.8 ล้าน 78% ของ Bitcoin · wait ฿2.2 ล้าน 22% · label 31% ของความมั่งคั่ง", /data-ac-bar="bitcoin"[\s\S]*?ac-wait" style="height:22%">รอซื้อ ฿2\.2 ล้าน<small>22% ของ Bitcoin<\/small>[\s\S]*?ac-held" style="height:78%">฿7\.8 ล้าน<small>78% ของ Bitcoin<\/small>[\s\S]*?<b>Bitcoin<\/b>31% ของความมั่งคั่ง/.test(html()));
t("RMF bar has no wait segment and reads 100%", !/data-ac-bar="rmf"[\s\S]*?ac-wait/.test(barOf("rmf")) && /฿2\.9 ล้าน<small>100% ของ กองทุน RMF/.test(barOf("rmf")));
t("axis ticks 0 · 2.5 · 5 · 7.5 · 10 ล้าน", ticks().join() === "0,2.5,5,7.5,10");
t("cash band: within · 1–3 · now marker at 2.1/4 = 52.5%", /data-ac-cash="within"/.test(html()) && /เงินสด ฿2\.1 ล้าน \(จาก Quarterly Editor\) · ในกรอบ/.test(html()) && /กรอบที่ตั้งไว้ 1–3 ล้าน/.test(html()) && /data-ac-now" style="left:52\.5%"/.test(html()));
t("rule boxes quote the user's own rule with the band numbers, no advisory words", /bear ↑[^<]*กติกาของคุณ[^<]*1 ล้าน/.test(html()) && /bull ↓[^<]*กติกาของคุณ[^<]*3 ล้าน/.test(html()) && !ADVISORY_TH.test(html()) && !ADVISORY_EN.test(html()));
t("no NaN/undefined · no title attributes with money · footer explains % bases", !LEAK.test(html()) && !/title="[^"]*฿/.test(html()) && /ภายในแท่ง % = ของก้อนนั้นเอง ใต้แท่ง % = ของความมั่งคั่งรวม/.test(html()));
// หน้า position วาดใหม่ (เช่น Load Latest Data) → การ์ดตาม · acRoot ไม่ถูก ppRoot เขียนทับ
W.PortfolioPositionPage.render(); await flush(20);
t("re-render of the position page re-renders the card (same numbers) and acRoot is untouched by ppRoot writes", /฿25\.0 ล้าน/.test(html()) && els.ppRoot.innerHTML.indexOf("ac-card") < 0);
// ไม่มีไตรมาส
var E = boot({ fixture: { quarters: {} } }); await flush(80);
t("no quarterly data → card says ยังไม่มีข้อมูลใน Quarterly Editor, no bars, no throw", /ยังไม่มีข้อมูลใน Quarterly Editor/.test(E.html()) && !/data-ac-bar/.test(E.html()));
t("ES5 page + CSS .ac-card/.ac-bar/.ac-cash + 600px breakpoint", es5ok("allocation-card-page.js") && /\.ac-card\s*\{/.test(css) && /\.ac-bar\s*\{/.test(css) && /\.ac-cash\s*\{/.test(css) && /@media \(max-width: 600px\)[\s\S]*\.ac-/.test(css));
```

- [ ] **Step 2: รันเทสต์ ต้องล้ม** — Run: `node scripts/allocation-card-test.js` · Expected: ✗ ตั้งแต่ข้อ portfolio.html
- [ ] **Step 3: แก้ `portfolio-position-page.js` (hook + export) · `portfolio.html` · CSS · สร้าง `allocation-card-page.js`** ตาม Interfaces · กราฟใช้ CSS flex/absolute (ไม่ใช้ canvas) ความสูงเป็น % ของ `axis.max` · ปุ่ม `data-ac-settings` วาดไว้แต่ยังไม่ wire
- [ ] **Step 4: รันเทสต์ ต้องผ่าน** — Run: `node scripts/allocation-card-test.js` · Expected: 0 failed
- [ ] **Step 5: regression ที่เกี่ยว** — Run: `node scripts/portfolio-position-smoke-test.js | tail -1 && node scripts/asset-allocation-view-test.js | tail -1 && node scripts/site-integrity-test.js | tail -1 && node scripts/nav-shell-test.js | tail -1` · Expected: 0 failed ทุกชุด

---

### Task 3: หน้า — ตั้งกรอบเงินสด + บันทึก GET→PUT + ร่าง + Privacy

**Files:**
- Modify: `public/allocation-card-page.js`, `public/portfolio-position.css`
- Test: `scripts/allocation-card-test.js` (ต่อท้าย) · `scripts/quarterly-editor-save-test.js` (+1 assertion)

**Interfaces:**
- Produces:
  - คลิก `data-ac-settings` → `state.form = { min: <ล้าน>, max: <ล้าน> }` วาด `<form data-ac-form>` ช่อง `input[name=min]`, `input[name=max]` (type number step 0.1 หน่วยล้านบาท) + ปุ่ม `data-ac-save`, `data-ac-cancel` · พิมพ์แล้วแถบเงินสดเปลี่ยนทันที (preview: render จาก `state.form` โดยยังไม่บันทึก) · ตรวจ: ตัวเลขจำกัด ≥ 0 และ min ≤ max ไม่งั้นข้อความ "กรอบต้องเป็นตัวเลข ≥ 0 และค่าต่ำต้องไม่เกินค่าสูง" ไม่ PUT
  - บันทึก: `persistPlan(plan)` — GET `/api/portfolio` สด → ถ้า `!data || !data.quarters || !Object.keys(data.quarters).length` → ล้มเหลว "ข้อมูลพอร์ตบน server ว่าง — ยกเลิกการบันทึกเพื่อกันข้อมูลหาย" (ไม่ PUT) · `next = สำเนา data ทุกคีย์` · `next.allocationPlan = { cashBand: {min,max} (บาท), updatedAt: isoNow }` · PUT `{ data: next }` header `content-type: application/json` · สำเร็จ → `state.plan = next.allocationPlan`, `saveState "saved"`, ล้างร่าง, ยิง `portfolio-allocation-saved` detail `{ data: next }` (หน้า position ฟังอยู่แล้ว → adopt + render → การ์ดได้ event ใหม่) · ล้มเหลว (GET/PUT ไม่ ok / เน็ต) → เขียนร่าง `allocation_plan_draft_v1` = `{ plan, savedAt }`, `saveState "error"`, ข้อความไทย + ปุ่ม `data-ac-retry` · เปิดหน้าแล้วมีร่าง → ใช้ร่างแสดงก่อน (notice "ใช้ค่าที่ยังไม่ได้บันทึก") และลอง persist อัตโนมัติ 1 ครั้ง
  - Privacy: `privacyLocked()` = `window.PortfolioPrivacy && PortfolioPrivacy.isLocked()` · ล็อก → ช่อง min/max วาด `value=""` + placeholder "ล็อกอยู่ — ใส่ค่าใหม่ได้" และถ้าปล่อยว่างตอนบันทึก = คงค่าเดิม · ฟัง `document` event `portfolio-privacy-changed` → render
- เทสต์ app.js: ใน `scripts/quarterly-editor-save-test.js` เพิ่ม 1 ข้อ: เอกสารที่โหลดมามี `allocationPlan` → body ของ PUT ที่ editor ส่งยังมี `allocationPlan` เดิม (อ่าน harness ของไฟล์นั้นก่อน ถ้ามันไม่จำลองการโหลดเอกสาร ให้ assert จาก source ว่า `persistRemoteData` ส่ง `state.data` ทั้งก้อนและ `state.data = payload.data` ตอนโหลด — ระบุในรายงานว่าใช้วิธีไหน)

- [ ] **Step 1: เขียนเทสต์ที่ยังไม่ผ่าน** (ต่อท้าย · helper `click(attr,val)`/`setValue(name,v)` แบบ home-action-test: `querySelectorAll` ปลอมคืน node ต่อค่า attribute + `name`)

```js
t("settings opens the form prefilled in ล้าน (1 / 3)", click("data-ac-settings", "1") && /data-ac-form[\s\S]*name="min"[^>]*value="1"[\s\S]*name="max"[^>]*value="3"/.test(html()));
setValue("min", "1.5"); setValue("max", "2"); W.AllocationCardPage.render();
t("typing previews the band immediately (no PUT yet): 1.5–2 · now 2.1 above", /กรอบที่ตั้งไว้ 1\.5–2 ล้าน/.test(html()) && /data-ac-cash="above"/.test(html()) && puts.length === 0);
click("data-ac-save", "1"); await flush(60);
t("save: GET then PUT · body keeps quarters byte-identical · allocationPlan in baht with updatedAt · allocation untouched", puts.length === 1 && getsAfterSave() === 1 && JSON.stringify(puts[0].data.quarters) === JSON.stringify(FIX.quarters) && puts[0].data.allocationPlan.cashBand.min === 1500000 && puts[0].data.allocationPlan.cashBand.max === 2000000 && /^\d{4}-\d{2}-\d{2}T/.test(puts[0].data.allocationPlan.updatedAt) && JSON.stringify(puts[0].data.allocation) === JSON.stringify(FIX.allocation));
t("after save: dispatched portfolio-allocation-saved with the new doc · card shows 1.5–2 · form closed · no draft", dispatched.some(function (e) { return e.type === "portfolio-allocation-saved" && e.detail.data.allocationPlan.cashBand.max === 2000000; }) && /กรอบที่ตั้งไว้ 1\.5–2 ล้าน/.test(html()) && !/data-ac-form/.test(html()) && store["allocation_plan_draft_v1"] === undefined);
t("invalid band (min > max) refuses with the Thai message and no PUT", (function () { click("data-ac-settings", "1"); setValue("min", "4"); setValue("max", "2"); var n = puts.length; click("data-ac-save", "1"); return /กรอบต้องเป็นตัวเลข ≥ 0 และค่าต่ำต้องไม่เกินค่าสูง/.test(html()) && puts.length === n; })());
click("data-ac-cancel", "1");
// เซิร์ฟเวอร์เปลี่ยน quarters ระหว่างเปิดหน้า → PUT ต้องมีของใหม่
serverFixture.quarters["2026-Q3"].assets[0].manualValue = 11000000; click("data-ac-settings", "1"); setValue("min", "1"); setValue("max", "3"); click("data-ac-save", "1"); await flush(60);
t("PUT carries the server's latest quarters, not the page's copy", puts[puts.length - 1].data.quarters["2026-Q3"].assets[0].manualValue === 11000000);
// เซิร์ฟเวอร์ตอบว่าง → ไม่ PUT
serverEmpty = true; click("data-ac-settings", "1"); setValue("max", "2.5"); var n2 = puts.length; click("data-ac-save", "1"); await flush(60); serverEmpty = false;
t("empty server doc → refuses to PUT, says why", puts.length === n2 && /ข้อมูลพอร์ตบน server ว่าง/.test(html()));
// PUT ล้ม → ร่าง + retry
failPut = true; click("data-ac-settings", "1"); setValue("min", "0.5"); setValue("max", "2"); click("data-ac-save", "1"); await flush(60);
t("PUT failure → draft saved, error shown, retry button", JSON.parse(store["allocation_plan_draft_v1"]).plan.cashBand.min === 500000 && /data-ac-retry/.test(html()) && /บันทึกไม่สำเร็จ/.test(html()));
failPut = false; click("data-ac-retry", "1"); await flush(60);
t("retry PUTs the draft and clears it", puts[puts.length - 1].data.allocationPlan.cashBand.min === 500000 && store["allocation_plan_draft_v1"] === undefined);
// เปิดหน้าใหม่ขณะมีร่าง → ใช้ร่างก่อนและส่งเอง
var D2 = boot({ store: { allocation_plan_draft_v1: JSON.stringify({ plan: { cashBand: { min: 700000, max: 2000000 } }, savedAt: "2026-11-07T01:00:00.000Z" }) } }); await flush(100);
t("boot with a draft: persists it once (min 0.7M), shows the band 0.7–2 and clears the draft", D2.puts.length === 1 && D2.puts[0].data.allocationPlan.cashBand.min === 700000 && /กรอบที่ตั้งไว้ 0\.7–2 ล้าน/.test(D2.html()) && D2.store["allocation_plan_draft_v1"] === undefined, [D2.puts.length]);
// Privacy
W.PortfolioPrivacy = { isLocked: function () { return true; } }; W.AllocationCardPage.render(); click("data-ac-settings", "1");
t("locked: money masked by text form ฿ (privacy.js) and the inputs render empty with a placeholder", /name="min"[^>]*value=""[^>]*placeholder="ล็อกอยู่/.test(html()) && !/name="min"[^>]*value="[0-9]/.test(html()));
click("data-ac-save", "1"); await flush(60);
t("locked + blank inputs on save keeps the stored band (no change)", puts[puts.length - 1].data.allocationPlan.cashBand.min === 500000 && puts[puts.length - 1].data.allocationPlan.cashBand.max === 2000000);
delete W.PortfolioPrivacy;
```

- [ ] **Step 2: รันเทสต์ ต้องล้ม** — Run: `node scripts/allocation-card-test.js` · Expected: ✗ ที่ "settings opens the form"
- [ ] **Step 3: เพิ่มฟอร์ม/persist/ร่าง/privacy ใน `allocation-card-page.js`** ตาม Interfaces (wire ผ่าน `querySelectorAll` ของ root) + CSS ฟอร์ม · เพิ่ม assertion ใน `scripts/quarterly-editor-save-test.js`
- [ ] **Step 4: รันเทสต์ ต้องผ่าน** — Run: `node scripts/allocation-card-test.js && node scripts/quarterly-editor-save-test.js | tail -1` · Expected: 0 failed ทั้งคู่
- [ ] **Step 5: เซิร์ฟเวอร์รับคีย์ใหม่** — Run: `node -e "console.log(require('./lib/portfolio-validation').isValidPortfolioData({quarters:{a:{assets:[]}},allocationPlan:{cashBand:{min:1,max:3}}}))"` · Expected: `true`

---

### Task 4: ตรวจรวม — regression · mutation · Chrome จริง · memory

**Files:** scratchpad เท่านั้น (`mut-allocation-card.js`, `probe-allocation-card.js`) + memory `C:\Users\mtl87429\.claude\projects\c--Drive-Data-AI-Project-AI-Project-portfolio-dashboard\memory\allocation-card.md` + บรรทัดใน `MEMORY.md`

- [ ] **Step 1: regression ทั้งเว็บ** — Run: `for f in scripts/*-test.js; do node "$f" >/dev/null 2>&1 || echo "FAIL $f"; done; ls scripts/*-test.js | wc -l` · Expected: ไม่มี FAIL · 44 ชุด (42 + 2)
- [ ] **Step 2: mutation sweep** (ทำบนสำเนา public/ ใน scratchpad แบบ `mut-mirror`; ไฟล์จริงห้ามแตะ) อย่างน้อย: ก้อน foreign ไม่รวม provident-fund · wait ใช้ gross แทน cash · wealth คิดเอง (Σ bucket) แทน R.totals · band status กลับด้าน · scaleMax ไม่ตาม now · PUT ไม่ GET ก่อน · PUT ทับเมื่อเซิร์ฟเวอร์ว่าง · ร่างไม่ถูกเขียนเมื่อ PUT ล้ม · ล็อกแล้วช่องกรอกยังมีตัวเลข · ฟอร์ม min>max ยัง PUT · event `portfolio-position-rendered` ไม่ยิง — ทุกตัวต้องทำให้เทสต์ชุดใดชุดหนึ่งแดง
- [ ] **Step 3: Chrome 1440/390** — probe แบบ `probe-home-action.js`: ดัก `/api/portfolio` GET ด้วยเอกสารสมมุติ (ไตรมาสเดียวกับ FIX, มี `allocation` จริงโครงเดียวกับที่ `asset-allocation-page` ต้องการ) และ PUT → เก็บในหน่วยความจำ · ดัก `/api/portfolio-holdings`/`/api/portfolio-status` ถ้าหน้าเรียก · ซ่อน `#portfolio-auth-overlay` เท่านั้น · ตรวจ: ตัวเลขความมั่งคั่งรวมในการ์ด = ส่วนหัว · 4 แท่งสูงตามสัดส่วน · ตั้งกรอบ 1.5–2 → PUT body · reload → ค่าใหม่ยังอยู่ · ล็อก: ฿ เป็น XXX · ไม่มี console error · `#acRoot` ไม่ล้นจอ · screenshots `allocation-card-1440.png`, `allocation-card-390.png` (ดูด้วย Read)
- [ ] **Step 4: ES5/คำต้องห้าม** — `grep -nE "=>|\bconst |\blet |\x60" public/allocation-card-engine.js public/allocation-card-page.js` และ `grep -nE "ควรซื้อ|ควรขาย|น่าซื้อ|น่าขาย|น่าเข้า|แนะนำซื้อ|จุดเข้า|ตัดขาดทุน" …` → ว่าง
- [ ] **Step 5: memory** — `allocation-card.md` (project): รอซื้อ = investedPercent ของ Editor (ไม่มีช่องกรอก) · ตัวเลขผูกกับ `R.totals` ของหน้า position ผ่าน event `portfolio-position-rendered` · provident-fund อยู่ในแท่งหุ้นนอก · `allocationPlan.cashBand` ในเอกสารพอร์ต บันทึก GET→PUT · บทเรียนจาก probe/mutation · Why/How to apply · ลิงก์ `[[retirement-target-tracking]]` `[[privacy-lock]]` · เพิ่มบรรทัดใน `MEMORY.md`

---

## Self-review (ทำแล้ว)

- **ครอบสเปก:** 4 ก้อน + mapping (T1) · แท่ง/ป้าย % สองฐาน (T2) · ช่องภาพรวม 2 ช่อง ไม่มีแถบสี (T2) · แถบเงินสด + กติกา bear/bull + กรอบตั้งได้ (T2, T3) · ตัวเลขเท่าส่วนหัว (T1 เทสต์ R.totals, T2 เทียบ ppHtml) · persist + ร่าง + กันทับ (T3) · privacy (T3) · มือถือ (T2 CSS, T4 probe) · ไม่มีคำแนะนำ (T2) · versions (T2) · app.js คงคีย์ (T3)
- **ชื่อตรงกันทุก task:** `AllocationCard.compute/normalizePlan/CLASSES/DEFAULT_BAND` · event `portfolio-position-rendered` detail `{R,data}` · `PortfolioPositionPage.last` · attributes `data-ac-card/kpi/chart/tick/bar/cash/band/now/settings/form/save/cancel/retry` · draft key `allocation_plan_draft_v1` · doc key `allocationPlan.cashBand` · versions `20261107-ac-1`, `20261107-pp-13`
- **Review Focus → เทสต์:** 1 → T1 (M2 bad investedPercent, empty) · 2 → T2 (no quarterly) · 3 → T2 (re-render, acRoot untouched) · 4 → T3 (server quarters newer, empty server) · 5 → T3 (locked inputs)
- **สัดส่วน:** แผนสั้นกว่าสเปก 2 เท่า เนื้อหาหลักเป็น assertion ไม่มี body ของฟังก์ชัน
