# หุ้นต่างประเทศยึดหน้า AI Portfolio Manager — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ตัวเลขปัจจุบันของหุ้นต่างประเทศทุกหน้ามาจากหน้า AI Portfolio Manager (Σ มูลค่าหุ้น + ช่อง cash ใหม่) แทนแถว foreign-stock ของ Quarterly Editor

**Architecture:** โมดูลกลางใหม่ `public/foreign-sleeve.js` (pure ES5, `window.ForeignSleeve`) คิด sleeve จาก holdings + `doc.foreignSleeve.cash` และสร้างสำเนาเอกสารพอร์ตที่แทนแถว foreign-stock ของไตรมาสปัจจุบันด้วยแถวสังเคราะห์ (ไม่แก้ต้นฉบับ) · ผู้อ่านตัวเลขปัจจุบันทุกตัวเรียก `applyToDoc`/`applyToSnapshot` ก่อนคำนวณ · ผลตอบแทน/เป้าเกษียณอ่านเอกสารดิบเหมือนเดิม · หน้า PM เพิ่มช่อง cash บันทึก GET→PUT ลง `foreignSleeve`

**Tech Stack:** static JS (ES5 ในไฟล์ engine/page ที่เป็น ES5 อยู่แล้ว), Node test scripts แบบ VM harness, headless Chrome probe

**Spec:** `docs/superpowers/specs/2026-11-09-pm-foreign-sleeve-design.md`

## Global Constraints

- ไฟล์ใหม่ + `portfolio-manager-page.js`, `portfolio-manager-engine.js`, `portfolio-position-page.js`, `adaptive-position-engine.js`, `allocation-card-*.js` = ES5 เคร่งครัด (ห้าม `=>`, `const`, `let`, template literal) · `mission-control-page.js`, `action-center-page.js`, `app.js` คงสไตล์เดิมของไฟล์ (modern JS ได้)
- ข้อความไทย · ห้าม "ควรซื้อ/ควรขาย/น่าซื้อ/น่าขาย/น่าเข้า/แนะนำซื้อ/จุดเข้า/ตัดขาดทุน" และ `\b(Buy|Sell)\b` · เงินเป็น ฿ text node · ห้าม ฿ ใน `title`/`aria-label`
- **ห้าม commit** จนผู้ใช้สั่ง "push git" · เขียนไฟล์ด้วย Write/Edit tools เท่านั้น (ไม่ใช้ heredoc / `node -e` ที่มี regex)
- เอกสารที่ถูกแปลงห้ามถูก PUT — ผู้เขียน `/api/portfolio` ทุกตัว (app.js · asset-allocation-page · allocation-card-page · PM ใหม่) GET สดก่อน PUT
- ไฟล์ที่โหลดจากหลายหน้าต้องมี `?v=` เดียวกันทุกหน้า (`scripts/site-integrity-test.js`) · bump `?v=` ของทุกไฟล์ที่แก้ ในทุกหน้าที่โหลดมัน
- ก่อนจบต้องผ่านทุกชุด `scripts/*-test.js` (44 + ชุดใหม่)
- Probe/ทดสอบห้ามอ่าน/เขียนข้อมูลจริงของผู้ใช้ — ดัก API ด้วยข้อมูลสมมุติ ซ่อนเฉพาะ `#portfolio-auth-overlay` ห้ามปลด Privacy Lock · HTTP request ห้ามใส่อีเมล/ชื่อผู้ใช้

## Review Focus

1. holdings ยังไม่โหลด (array ว่าง) แต่กรอก cash แล้ว → ต้องเป็นโหมด editor ไม่ใช่หุ้นต่างประเทศ = cash ล้วน — Task 1
2. เอกสารที่แปลงแล้วหลุดไปเป็น body ของ PUT ใด ๆ → แถว foreign-stock ใน Editor ถูกเขียนทับ — Task 2 (PM) + Task 3 (assert body ของ card/AA)
3. cash = 0 คือกรอกแล้ว (โหมด pm) ไม่ใช่ "ยังไม่กรอก" — Task 1
4. หน้าอื่นใน browser เดียวกันเห็น cash เก่าหลังบันทึก (snapshot ใน localStorage ค้าง) — Task 2 patch snapshot copy
5. GOOG + GOOGL / กองทุน RMF ที่ไม่ได้ตั้ง bucket → นับตามกติกาเดิมของ PM เป๊ะ — Task 1 parity test

---

### Task 1: โมดูลกลาง `foreign-sleeve.js` + PMEngine hook + โหลดสคริปต์ทุกหน้า

**Files:**
- Create: `public/foreign-sleeve.js`, `scripts/foreign-sleeve-test.js`
- Modify: `public/portfolio-manager-engine.js` (`quarterlyBuckets` ~205), `public/adaptive-position-engine.js` (~289), HTML ที่โหลด PM engine หรือ adaptive engine หรือ position/mission-control/action-center page: `portfolio-manager.html`, `portfolio.html`, `home.html`, `action-center.html`, `accumulation-center.html`, `asset.html`, `adaptive-position.html` (เพิ่ม `<script src="/foreign-sleeve.js?v=20261109-fs-1"></script>` ก่อนสคริปต์ engine/page ตัวแรกที่ใช้มัน — ถัดจาก `data-snapshot.js` / `portfolio-core.js`)

**Interfaces — Produces** (`window.ForeignSleeve` + `module.exports`):
- `VERSION = "fs-1"`
- `bucketOf(h) → string` — กติกาเดิมของ `portfolio-manager-page.js` `buildInputs` (บรรทัด ~125–134) ย้ายมาเป๊ะ: `portfolioBucket` ชนะ · `.BK` → `thai-stock` · มี `BTC` → `bitcoin` · RMF/SSF หรือ assetType THAI_MUTUAL_FUND/MUTUAL → `thai-fund` · อื่น → `foreign-stock` (canonical = upper-trim ของ `canonicalSymbol || ticker`)
- `investedOf(holdings) → number` — Σ marketValue (finite ≥ 0) ของ `h.isHolding && bucketOf(h) === "foreign-stock"`
- `docOf(ps) → doc|null` — รับ `{data: doc}` หรือ doc ตรง
- `cashOf(ps) → number|null` — `doc.foreignSleeve.cash` เป็นตัวเลขจำกัด ≥ 0 ไม่งั้น null
- `sleeveOf(ps, holdings) → { source: "pm"|"editor", reason: null|"no-cash"|"no-holdings", invested, cash, gross, investedPct, updatedAt }` — pm เมื่อ `cashOf != null` และ `Array.isArray(holdings) && holdings.length > 0` · editor: invested/cash/gross/investedPct = null · ไม่มี NaN/undefined
- `applyToDoc(ps, holdings) → ps'` — โหมด editor คืน **ตัวเดิม** (reference เดียวกัน) · โหมด pm คืนสำเนารูปเดียวกับ input (`{data}` หรือ doc ตรง) ที่ไตรมาสปัจจุบัน (`currentQuarter` ถ้ามีใน quarters ไม่งั้นคีย์ล่าสุดเมื่อ sort) มี assets = รายการเดิมที่ไม่ใช่ foreign-stock + แถวสังเคราะห์ `{ type: "foreign-stock", name: "หุ้นต่างประเทศ · AI Portfolio Manager", manualValue: gross, snapshotValue: gross, investedPercent: gross > 0 ? invested / gross * 100 : 0, fromPM: true }` · ห้าม mutate input (สำเนา quarters map + quarter ปัจจุบัน + assets array ใหม่) · ไตรมาสอื่นคง reference เดิมได้
- `applyToSnapshot(snapshot, holdings?) → snapshot'` — holdings ไม่ส่ง = `snapshot.portfolioHoldings.data` · โหมด editor คืนตัวเดิม · pm คืน shallow copy ที่ `portfolioStatus` = applyToDoc

- [ ] **Step 1: เทสต์ที่ยังไม่ผ่าน** `scripts/foreign-sleeve-test.js` (สไตล์ `t()`/`es5ok` แบบ `scripts/allocation-card-engine-test.js`) อย่างน้อย:
  - parity: ชุด holdings ผสม (NVDA, GOOG + GOOGL ทั้งคู่, PTT.BK, BTCUSD, K-GTECHRMF ไม่มี bucket, กองทุน assetType THAI_MUTUAL_FUND, QQQM ตั้ง bucket foreign-stock เอง, AAPL ตั้ง bucket thai-stock เอง, รายการ isHolding false) → `investedOf` = ผลรวมที่คิดมือ และ `bucketOf` ทุกตัวตรงกับกติกา
  - `cashOf`: `{data:{foreignSleeve:{cash:0}}}` → 0 · cash `"abc"`/-1/null/ไม่มีคีย์ → null
  - โหมด: cash 600000 + holdings ไม่ว่าง → pm (gross = invested + 600000) · cash 0 → pm · cash null → editor/no-cash · holdings `[]` → editor/no-holdings
  - `applyToDoc` pm: แถว foreign-stock เดิม 2 แถวถูกแทนด้วย 1 แถวสังเคราะห์ ค่าตรง · แถวอื่นคงเดิม · input ไม่ถูกแก้ (`JSON.stringify` ก่อน/หลังเท่ากัน) · รับได้ทั้ง `{data}` และ doc ตรง · ไตรมาสปัจจุบันไม่มีแถว foreign-stock เลย → เพิ่มแถวสังเคราะห์ · editor คืน reference เดิม
  - ผ่าน `PortfolioPosition.compute` จริง (require `public/portfolio-position-engine.js`): หลัง applyToDoc ส่วน foreign-stock ของ R = gross ของ PM และ `R.totals.total` เปลี่ยนตามส่วนต่าง · QoQ ยังเทียบไตรมาสก่อนจาก Editor
  - ไม่มี NaN/undefined/Infinity ใน output · ES5 · ไม่มีคำต้องห้าม
- [ ] **Step 2:** รัน ต้องล้ม (module not found)
- [ ] **Step 3:** สร้าง `public/foreign-sleeve.js` · แก้ `PMEngine.quarterlyBuckets(snapshot)`: ถ้า `typeof window !== "undefined" && window.ForeignSleeve` ให้ `snapshot = ForeignSleeve.applyToSnapshot(snapshot)` ก่อนรวม (Node ไม่มี window → พฤติกรรมเดิม) · แก้ `adaptive-position-engine.js` ให้ `ps` ผ่าน `ForeignSleeve.applyToDoc(ps, (snapshot.portfolioHoldings && snapshot.portfolioHoldings.data) || [])` เมื่อมี `window.ForeignSleeve` · เพิ่ม script tag ทุกหน้าที่ระบุ
- [ ] **Step 4:** `node scripts/foreign-sleeve-test.js` 0 failed · `node scripts/pm-smoke-test.js | tail -1` · `node scripts/adaptive-position-smoke-test.js | tail -1` · `node scripts/site-integrity-test.js | tail -1` · `node scripts/nav-shell-test.js | tail -1` ผ่านทั้งหมด

---

### Task 2: หน้า AI Portfolio Manager — ช่อง cash + บันทึก + ใช้ sleeve ของ PM · Editor คง `foreignSleeve`

**Files:**
- Modify: `public/portfolio-manager-page.js`, `public/portfolio-manager.css`, `public/portfolio-manager.html` (bump), `public/app.js` (`adoptServerAllocation`), `public/index.html` (bump app.js)
- Test: ไฟล์ทดสอบใหม่ `scripts/pm-cash-test.js` (VM harness รันหน้า PM จริง — ดูรูปแบบ `scripts/allocation-card-test.js`: fake fetch GET/PUT, localStorage, events, `click`/`setValue`) · `scripts/quarterly-editor-save-test.js` (+2 assertion) · `scripts/pm-view-test.js` ต้องยังผ่าน

**Interfaces:**
- Consumes: `ForeignSleeve.sleeveOf/applyToSnapshot/docOf/cashOf` (Task 1)
- Produces: เอกสาร `/api/portfolio` คีย์ `foreignSleeve = { cash: number (บาท ≥ 0), updatedAt: ISO }` · draft localStorage `pm_foreign_cash_draft_v1 = { cash, savedAt }` · event `portfolio-allocation-saved` detail `{ data: next }` หลังบันทึกสำเร็จ

- [ ] **Step 1: เทสต์ที่ยังไม่ผ่าน** `scripts/pm-cash-test.js`:
  - เอกสารไม่มี `foreignSleeve` → หน้า PM ใช้ gross จาก Editor แบบเดิม และแสดงข้อความ "ยังไม่ได้กรอกเงินสด — ตอนนี้ใช้ยอดหุ้นต่างประเทศจาก Quarterly Editor" + ช่องกรอก `data-pm-cash`
  - กรอก 600000 + กดบันทึก → GET 1 ครั้ง แล้ว PUT 1 ครั้ง · body คง `quarters`/`allocation`/`allocationPlan` ของ server ทุก byte (server เปลี่ยน quarters ระหว่างเปิดหน้า → PUT มีของใหม่) · `foreignSleeve.cash === 600000` + updatedAt · **แถว foreign-stock ใน body = ของ server ไม่ใช่แถวสังเคราะห์** (ไม่มี `fromPM`)
  - หลังบันทึก: เงินสดพร้อมวาง = 600000 · ฐาน % = Σ หุ้น + 600000 · ข้อความที่มา "หุ้นที่ถือ + เงินสดที่กรอกในหน้านี้" · ยิง `portfolio-allocation-saved` · snapshot ใน localStorage (`PortfolioDataSnapshot`) ได้ `foreignSleeve` ใหม่ด้วย
  - cash 0 บันทึกได้ (โหมด pm) · ค่าติดลบ/ไม่ใช่ตัวเลข → ข้อความ "เงินสดต้องเป็นตัวเลข ≥ 0" ไม่ PUT · server ว่าง (ไม่มีไตรมาส) → "ข้อมูลพอร์ตบน server ว่าง — ยกเลิกการบันทึกเพื่อกันข้อมูลหาย" ไม่ PUT · PUT ล้ม → ร่าง + "บันทึกไม่สำเร็จ" + ปุ่ม `data-pm-cash-retry` · retry สำเร็จล้างร่าง · เปิดหน้าใหม่มีร่าง → แสดงร่างแล้วส่งเองครั้งเดียว
  - Privacy ล็อก: ช่องว่าง + placeholder "ล็อกอยู่ — ใส่ค่าใหม่ได้" · บันทึกตอนว่าง = คงค่าเดิม (ไม่ PUT หรือ PUT ค่าเดิม — เลือกแบบไม่ PUT)
  - ไม่มี NaN/undefined · ไม่มี ฿ ใน title · ไม่มีคำต้องห้าม · ES5
  - `quarterly-editor-save-test.js`: เอกสารที่โหลดมี `foreignSleeve` → PUT ของ editor คงไว้ · server มี `foreignSleeve` ที่หน้า editor ไม่เคยมี → PUT ใช้ของ server
- [ ] **Step 2:** รัน ต้องล้ม
- [ ] **Step 3:** implement: หน้า PM ดึง `/api/portfolio` สดตอนเปิด (cache ในหน้า) ใช้แทน `snapshot.portfolioStatus` ถ้ามี · `buildInputs` ใช้ `sleeveOf` (pm: gross/cash/invested จาก PM · editor: สูตรเดิม) · ช่อง cash ในการ์ดสถิติ "ลงทุนแล้ว · เงินสดพร้อมวาง" (บันทึกเมื่อ Enter/ปุ่ม) · แถว "เงินสดใน sleeve" ในตารางแสดงค่าและคำอธิบายใหม่ · persist ลอกโครง `allocation-card-page.js` `persistPlan` · หลังสำเร็จ patch snapshot copy ผ่าน `PortfolioDataSnapshot.read/write` (คงฟิลด์อื่นทั้งหมด) · app.js `adoptServerAllocation` คัด `foreignSleeve` แบบเดียวกับ `allocation`
- [ ] **Step 4:** `node scripts/pm-cash-test.js` · `node scripts/pm-view-test.js | tail -1` · `node scripts/pm-smoke-test.js | tail -1` · `node scripts/pm-no-target-test.js | tail -1` · `node scripts/quarterly-editor-save-test.js | tail -1` · `node scripts/site-integrity-test.js | tail -1` ผ่าน

---

### Task 3: ผู้อ่านตัวเลขปัจจุบันที่เหลือ — Portfolio Position · Mission Control/Home · Action Center + ป้ายที่มา

**Files:**
- Modify: `public/portfolio-position-page.js` (`effectiveSnapshot` + ป้ายที่มาในส่วนหัว/แถบ — **`realGrowth` ต้องอ่านเอกสารดิบเหมือนเดิม**), `public/allocation-card-page.js` (บรรทัดท้ายบอกที่มาเมื่อ pm), `public/mission-control-page.js` (`quarterlyPortfolio`), `public/action-center-page.js` (`computeQuarterlyBuckets`), CSS ที่จำเป็น, bump `?v=` ของไฟล์ที่แก้ในทุกหน้า
- Test: `scripts/allocation-card-test.js` (+ กรณี pm), ชุดทดสอบที่มีของหน้าที่แตะ ต้องยังผ่าน

**Interfaces:**
- Consumes: `ForeignSleeve.applyToSnapshot/applyToDoc/sleeveOf` (Task 1) · `foreignSleeve` ในเอกสาร (Task 2)

- [ ] **Step 1: เทสต์ที่ยังไม่ผ่าน** ใน `scripts/allocation-card-test.js` (FIX + `foreignSleeve: { cash: 600000 }` + holdings ใน snapshot หุ้นต่างประเทศรวม 4,200,000 เช่น NVDA 2,000,000 · QQQM 2,200,000 + BTCUSD/PTT.BK ที่ต้องไม่ถูกนับ):
  - ส่วนหัว: ความมั่งคั่งรวม = 25,000,000 − 4,000,000 + 4,800,000 = ฿25,800,000 · มีป้าย "หุ้นต่างประเทศจาก AI Portfolio Manager"
  - การ์ด: แท่งหุ้นต่างประเทศ ลงทุนแล้ว ฿4.2 ล้าน (88%) รอซื้อ ฿0.6 ล้าน (13% → pairPct = 12%? คิดตามสูตรจริง) · ความมั่งคั่งรวม ฿25.8 ล้าน · บรรทัดท้ายบอกที่มา
  - บรรทัดการเติบโต/ผลตอบแทนในส่วนหัวยังมาจากเอกสารดิบ (ค่าเท่ากับก่อนเปลี่ยน — คิดจาก `AssetAllocation.compute` บนเอกสารดิบในเทสต์)
  - บันทึกกรอบเงินสดในการ์ด → body PUT มีแถว foreign-stock ของ server (ไม่มี `fromPM`) และคง `foreignSleeve`
  - holdings ว่าง → ส่วนหัว/การ์ดกลับเป็นตัวเลข Editor เดิม (25,000,000) ไม่มีป้ายที่มา
- [ ] **Step 2:** รัน ต้องล้ม
- [ ] **Step 3:** implement ทุกไฟล์ใน Files · Mission Control/Action Center ใช้ holdings จาก snapshot ของหน้านั้น (`snapshot.portfolioHoldings.data` / `holdingsFromSnapshot`) · ถ้าหน้ามีเทสต์อยู่แล้ว เพิ่ม assertion ขั้นต่ำ 1 ข้อว่าใช้ค่า PM ในโหมด pm
- [ ] **Step 4:** `node scripts/allocation-card-test.js` · `node scripts/portfolio-position-smoke-test.js | tail -1` · `node scripts/asset-allocation-view-test.js | tail -1` · `node scripts/site-integrity-test.js | tail -1` + ชุดของหน้าที่แตะ ผ่าน

---

### Task 4: ตรวจรวม — regression · mutation · Chrome จริง · memory

**Files:** scratchpad เท่านั้น + memory `pm-foreign-sleeve.md` + บรรทัดใน `MEMORY.md` + อัปเดต `portfolio-manager.md` / `allocation-card.md` สั้น ๆ

- [ ] **Step 1:** ทุกชุด `scripts/*-test.js` ไม่มี FAIL
- [ ] **Step 2: mutation** (สำเนาใน scratchpad) อย่างน้อย: bucketOf นับ RMF เป็นหุ้นนอก · cash 0 = editor · holdings ว่าง = pm · applyToDoc mutate input · ไม่ตัดแถว foreign-stock เดิม (นับซ้ำ) · PM PUT ไม่ GET ก่อน · PM PUT ส่งเอกสารที่แปลงแล้ว · ไม่ patch snapshot · realGrowth ใช้เอกสารแปลง · app.js ไม่ adopt foreignSleeve — ทุกตัวต้องทำให้เทสต์แดง
- [ ] **Step 3: Chrome 1440/390** probe ดัก `/api/portfolio` + `/api/portfolio-holdings` ด้วยข้อมูลสมมุติ (PUT เก็บในหน่วยความจำ · non-GET อื่นใต้ /api/ → 403): หน้า PM กรอก cash → PUT body ถูก · reload ค่ายังอยู่ · ไปหน้า /portfolio ส่วนหัว/การ์ดใช้ค่า PM · /home ยอดรวมใช้ค่า PM · ล็อกแล้วช่องว่าง · ไม่มี console error · screenshot แล้วดูด้วย Read
- [ ] **Step 4:** grep ES5/คำต้องห้าม/฿ ใน title · เขียน memory
