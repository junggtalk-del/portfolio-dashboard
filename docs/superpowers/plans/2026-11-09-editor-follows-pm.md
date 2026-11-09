# Quarterly Editor ตาม AI Portfolio Manager — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** แถวหุ้นต่างประเทศของไตรมาสปัจจุบันในหน้า Quarterly Editor และผลตอบแทน/เป้าเกษียณ ใช้ค่าจาก AI Portfolio Manager เหมือนหน้าอื่น

**Architecture:** แก้ `ForeignSleeve` ให้แถวที่แทนคงตัวตนของแถวเดิม (ชื่อ + เงินเติม) และใช้เฉพาะไตรมาสล่าสุด → เปิดให้ผลตอบแทน (position `realGrowth` + ส่วน Asset Allocation) อ่านเอกสารที่แปลงแล้ว → หน้า Editor (`app.js`) โหลด holdings แล้วซิงก์แถวหุ้นต่างประเทศของไตรมาสปัจจุบันใน state พร้อมล็อกช่องมูลค่า/%

**Tech Stack:** static JS · Node VM/extraction tests · headless Chrome probe

**Spec:** `docs/superpowers/specs/2026-11-09-pm-foreign-sleeve-design.md` (Addendum 2026-11-09 แทน §4 เดิม)

## Global Constraints

- ES5 เคร่งครัดใน `foreign-sleeve.js`, `portfolio-position-page.js`, `asset-allocation-page.js`, `asset-allocation-engine.js` · `app.js` คงสไตล์เดิม (modern JS)
- ข้อความไทย · ห้ามคำแนะนำซื้อขาย (ควรซื้อ/ควรขาย/น่าซื้อ/น่าขาย/น่าเข้า/แนะนำซื้อ/จุดเข้า/ตัดขาดทุน, `\b(Buy|Sell)\b`) · เงินเป็น ฿ text node · ห้าม ฿ ใน title/aria-label
- **ห้าม commit** จนผู้ใช้สั่ง "push git" · เขียนไฟล์ด้วย Write/Edit เท่านั้น
- แถวที่มี `fromPM` ห้ามไปถึง PUT ใด ๆ · Editor บันทึกแถวที่ซิงก์แล้วเป็นแถวปกติ (ไม่มี `fromPM`)
- bump `?v=` ของไฟล์ที่แก้ในทุกหน้าที่โหลด (site-integrity) · ทุกชุด `scripts/*-test.js` ผ่าน
- Probe/ทดสอบห้ามแตะข้อมูลจริง ห้ามปลด Privacy Lock ห้ามใส่ข้อมูลผู้ใช้ใน request

## Review Focus

1. ชื่อแถวเปลี่ยนตอนแทนค่า → ตัวคิดผลตอบแทนเห็นหุ้นนอก "หายแล้วเกิดใหม่" → ประมาณเงินเติมผิด — Task 1
2. Editor เลือกดูไตรมาสเก่า → ค่าวันนี้ไปทับประวัติ — Task 1 (module) + Task 2 (Editor)
3. Editor บันทึกเอกสารที่มี `fromPM` หรือบันทึกเองตอนเปิดหน้า — Task 2
4. holdings โหลดไม่ได้ในหน้า Editor → ต้องกลับเป็นกรอกเองปกติ ไม่ล็อกแถว — Task 2
5. เงินเติม/ถอนของแถวหุ้นนอกหายหลังแทนค่า → ผลตอบแทนเพี้ยน — Task 1

---

### Task 1: ForeignSleeve คงตัวตนแถว + ไตรมาสล่าสุดเท่านั้น · ผลตอบแทนอ่านเอกสารที่แปลงแล้ว

**Files:** `public/foreign-sleeve.js` · `public/portfolio-position-page.js` (`realGrowth` + เอาหมายเหตุ `GROW_SRC_TH` ออก) · `public/asset-allocation-page.js` (compute บนเอกสารแปลง · ป้าย) · bump ทุกหน้า · tests `scripts/foreign-sleeve-test.js`, `scripts/allocation-card-test.js`, `scripts/asset-allocation-view-test.js`

**Interfaces — Produces:**
- `applyToDoc`: แถวแทน = สำเนาแถว foreign-stock แรกของไตรมาสนั้น (คงทุกฟิลด์ เช่น `name`, `id`) แล้วทับ `manualValue = snapshotValue = gross`, `investedPercent`, `netFlow = Σ netFlow ที่เป็นตัวเลขของแถว foreign เดิมทั้งหมด` (ไม่มีเลย = ไม่ใส่คีย์), `fromPM: true` · ไม่มีแถวเดิม → `{ type: "foreign-stock", name: "หุ้นต่างประเทศ", ... }`
- ใหม่ `applyToAssets(assets, sleeve, opts) → assets'` (ไม่แก้ input) — แกนกลางที่ `applyToDoc` ใช้ · `opts.mark === false` = ไม่ใส่ `fromPM` (Task 2 ใช้)
- ใหม่ `latestKeyOf(ps)` · `sleeveOf` คืน editor/`reason: "past-quarter"` เมื่อไตรมาสปัจจุบันของเอกสารไม่ใช่คีย์ล่าสุด (sort) — `applyToDoc`/`applyToSnapshot` จึงคืนตัวเดิม
- position `realGrowth` และ `asset-allocation-page` ใช้เอกสารที่แปลงแล้ว (holdings แหล่งเดียวกับ `getHoldingsArray` ของหน้า position) · PUT ของ AA ยังมาจาก GET สดเหมือนเดิม · ป้าย AA = "มูลค่าพอร์ตรวม" (+ "หุ้นต่างประเทศจาก AI Portfolio Manager" เมื่อ pm)

- [ ] **Step 1: เทสต์ที่ยังไม่ผ่าน:** ชื่อ/ id ของแถวแทน = แถวเดิมแรก · netFlow รวม (แถว 2 แถว netFlow 100000 กับ -20000 → 80000 · ไม่มี netFlow → ไม่มีคีย์) · `mark:false` ไม่มี `fromPM` · currentQuarter ไม่ใช่คีย์ล่าสุด → editor/past-quarter (แทนเทสต์ E13 เดิมที่คาดให้แทนค่า — เปลี่ยนความคาดหมายตาม Addendum 4) · **ความต่อเนื่องของผลตอบแทน:** เอกสารที่ไตรมาสก่อนมี "หุ้นต่างประเทศ" 4,000,000 (แช่แล้ว) ไตรมาสนี้ผ่าน `applyToDoc` → `AssetAllocation.compute(...).record.whole` ไม่มีรายการ imputed/disappeared/newZero ของหุ้นนอก และ flow ของไตรมาสรวม netFlow ที่คงไว้ · allocation-card-test: บรรทัดการเติบโตในส่วนหัว = ค่าที่คิดจากเอกสารแปลง (ไม่ใช่ดิบแล้ว) และไม่มีหมายเหตุ "ผลตอบแทนคิดจาก Quarterly Editor" · AA view test: ป้ายใหม่
- [ ] **Step 2:** รัน ต้องล้ม
- [ ] **Step 3:** implement
- [ ] **Step 4:** `foreign-sleeve-test` · `allocation-card-test` · `asset-allocation-view-test` · `portfolio-position-smoke-test` · `foreign-sleeve-readers-test` · `pm-cash-test` · `site-integrity-test` · full sweep ผ่าน

---

### Task 2: Quarterly Editor ซิงก์แถวหุ้นต่างประเทศจาก PM + ล็อก

**Files:** `public/app.js` · `public/index.html` (โหลด `foreign-sleeve.js` ก่อน `app.js` · bump) · CSS ของ Editor ถ้าต้องใช้ · test ใหม่ `scripts/editor-follows-pm-test.js` (ดึงฟังก์ชันจริงจาก app.js แบบ `quarterly-editor-save-test.js`) + `scripts/quarterly-editor-save-test.js` ต้องยังผ่าน

**Interfaces:**
- Consumes: `ForeignSleeve.sleeveOf`, `applyToAssets(…, { mark: false })`, `latestKeyOf` (Task 1)
- Produces: `state.foreignFromPM` (bool) · ฟังก์ชันระดับบนสุด `syncForeignFromPM()` (ทดสอบได้) · holdings ของ Editor: GET `/api/portfolio-holdings` ด้วย `portfolioHeaders()` → ล้มเหลว = holdings จาก data snapshot (`PortfolioDataSnapshot.read().portfolioHoldings.data`) → ไม่มี = `[]` (โหมด editor)

- [ ] **Step 1: เทสต์ที่ยังไม่ผ่าน:** pm (cash ตั้งแล้ว + holdings) และไตรมาสปัจจุบัน = ล่าสุด → แถวหุ้นนอกแรกของไตรมาสปัจจุบันใน `state.data` ได้ `manualValue = gross`, `investedPercent`, คงชื่อ/id, netFlow รวม, แถวหุ้นนอกอื่นถูกรวม (หายจาก state) · ไม่มี `fromPM` · ไม่มีการ PUT ตอนซิงก์ · บันทึกครั้งถัดไป (`persistRemoteData`) ส่งค่าที่ซิงก์ · editor mode (ไม่มี cash / holdings ว่าง / ดูไตรมาสเก่า) → state ไม่เปลี่ยน · เพิ่มรายการ type foreign-stock ตอน pm → ไม่เพิ่ม + ข้อความ "หุ้นต่างประเทศดึงจาก AI Portfolio Manager — แก้มูลค่าที่หน้านั้น" · แก้แถวที่ซิงก์: มูลค่า/% ที่ส่งมาจากฟอร์มถูกแทนด้วยค่า PM (แก้ได้เฉพาะชื่อ + เงินเติม/ถอน) · ลบแถวที่ซิงก์ไม่ได้ · `saveSnapshot` แช่ค่าที่ซิงก์
- [ ] **Step 2:** รัน ต้องล้ม
- [ ] **Step 3:** implement: หลัง `loadRemoteData` (และเมื่อกลับมาที่แท็บ ถ้าไม่ได้แก้ฟอร์มอยู่) โหลด holdings → `syncForeignFromPM()` → render · UI: แถวที่ซิงก์มีป้าย "จาก AI Portfolio Manager" + ลิงก์ `/portfolio-manager` · ปุ่มลบปิด (title ไม่มีเงิน) · ฟอร์มแก้: ช่องมูลค่า/% disabled พร้อมคำอธิบาย · ข้อความสถานะเมื่อซิงก์ "หุ้นต่างประเทศอัปเดตจาก AI Portfolio Manager แล้ว — จะบันทึกพร้อมการแก้ครั้งถัดไป"
- [ ] **Step 4:** `editor-follows-pm-test` · `quarterly-editor-save-test` · `site-integrity-test` · full sweep ผ่าน

---

### Task 3: ตรวจรวม — Chrome จริง + memory

- [ ] probe (ต่อยอด scratchpad `probe-pmfs.js` · ดัก `/api/portfolio` `/api/portfolio-holdings` ด้วยข้อมูลสมมุติ · PUT เก็บในหน่วยความจำ · ไม่ปลดล็อก) ที่ 1440/390: หน้า Editor แสดงแถวหุ้นนอกค่า PM + ป้าย + ปุ่มลบปิด · การ์ดสรุป Editor = ค่าความมั่งคั่งเดียวกับ /portfolio · แก้ cash ในหน้า PM → เปิด Editor ใหม่เห็นค่าใหม่ · แก้รายการอื่นใน Editor → PUT มีแถวหุ้นนอกค่า PM ไม่มี `fromPM` · ผลตอบแทนบน /portfolio = ส่วน Asset Allocation · ไม่มี console error · screenshot + Read
- [ ] ทุกชุดเทสต์ · grep ES5/คำต้องห้าม/฿ ใน title · อัปเดต memory `pm-foreign-sleeve.md` (Addendum)
