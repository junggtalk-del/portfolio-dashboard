# Glass cards ทั้งเว็บ — กลุ่ม 1 (Home · AI Portfolio Manager · Portfolio Position · Thesis) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** หน้า Home, AI Portfolio Manager, Portfolio Position และ Investment Thesis ใช้การ์ดแก้วจาก `public/glass-cards.css` แบบเดียวกับ /market-risk โดยสีการ์ดมาจากสถานะที่หน้าคำนวณอยู่แล้ว และแถบหัวที่ใช้ร่วมกันไม่ทำให้หน้าเลื่อนซ้ายขวา

**Architecture:** ไฟล์กลาง `glass-cards.css` เป็นแหล่งเดียวของหน้าตา (Task 1 เติมชิ้นที่หลายหน้าต้องใช้: ตารางบนแก้ว ปุ่ม/ช่องกรอกบนแก้ว) · แต่ละหน้าใส่คลาส `gc-card gc-<tone>` คู่คลาสเดิมในโค้ดที่วาดการ์ด และลบสไตล์การ์ดเก่าที่ถูกแทน · ไม่แตะข้อมูล การคำนวณ หรือข้อความ

**Tech Stack:** ES5 ล้วน · CSS · เทสต์ Node + `vm` (`scripts/*-test.js`) · ตรวจหน้าจริงใน Chrome ผ่าน CDP

**Spec:** `docs/superpowers/specs/2026-11-21-glass-cards-sitewide-design.md` · หน้าตาอ้างอิง = /market-risk ปัจจุบัน (`public/glass-cards.css` gc-1 + `public/market-risk.css` mr-3 + `public/market-risk-page.js` mr-6)

## Global Constraints

- สีการ์ด: สถานะที่หน้าคำนวณอยู่แล้ว → `gc-calm` (ดี) · `gc-normal` (ปกติ) · `gc-warning` (ระวัง) · `gc-danger` (แย่) · ไม่มีสถานะ → `gc-neutral` · **ห้ามประดิษฐ์สถานะใหม่** · ทุกงานเขียนตาราง "การ์ด → สถานะต้นทาง → tone" ในรายงาน
- ตัวเลข Inter 700 tabular-nums (คลาส `gc-num`) · **ห้ามฟอนต์ตัวเลขแบบจุด (Doto หรือ LED ใด ๆ)**
- โหมดสว่าง: การ์ดสีสด ตัวหนังสือขาว · พื้นหน้า/หัวข้อตามธีม
- คงทุกคลาส id data-hook aria และข้อความเดิม · ไม่แตะการดึงข้อมูล/การคำนวณ · escape ทุกค่าที่ใส่ใน innerHTML ด้วยฟังก์ชัน escape ของหน้า
- คลาสใหม่ใน `glass-cards.css` ขึ้นต้น `gc-` และใช้ได้ทุกหน้า (ไม่อ้างชื่อหน้า) · คลาสใหม่ในไฟล์ของหน้าใช้ prefix ของหน้านั้น
- ตัวหนังสือรองบนการ์ด ≥4.5:1 ทุก tone (วัดจริงบนจุดสว่างสุดของ gradient) · ไม่มีเลื่อนแนวนอนที่ 390-1440px
- Privacy: เงินถูกซ่อนตอนล็อกเหมือนเดิม · ห้ามเงินใน `title`/`aria-label`
- ES5 ในโค้ดใหม่ของ `public/*.js` · ข้อความไทย · ห้ามคำแนะนำซื้อขาย (ควรซื้อ/ควรขาย/น่าซื้อ/น่าขาย/น่าเข้า/แนะนำซื้อ/จุดเข้า/ตัดขาดทุน, Buy/Sell)
- เปลี่ยนไฟล์ไหน bump `?v=` ของไฟล์นั้นทุกหน้าที่โหลด (รูปแบบ `20261121-<prefix>-<n+1>`) + แก้ pin ในเทสต์ (`grep -rn "<ไฟล์>?v=" scripts/`) · `site-integrity-test` บังคับเวอร์ชันเดียวต่อไฟล์
- **ห้าม git commit/stage** จนผู้ใช้สั่ง "push git" · สคริปต์เขียนด้วย Write tool เท่านั้น
- Probe ใน Chrome: ดัก `/api/portfolio*` (รวม `?doc=journal` `?doc=pm`) และ `/api/portfolio-holdings` ด้วยข้อมูลสมมุติในหน่วยความจำ · non-GET อื่นใต้ `/api` → 403 · `/api/market-risk` `/api/ohlc` (ข้อมูลตลาด) ใช้ของจริงได้ · ซ่อนแค่ `#portfolio-auth-overlay` ห้ามปลด privacy · **ห้ามอ่าน/เขียนเอกสารพอร์ตหรือ journal จริง** · timeout ทุกขั้น · ปิด Chrome + ลบ profile ชั่วคราว · ภาพมืด/สว่างที่ 1440 + มือถือ 390 (device emulation) ลง scratchpad `C:/Users/mtl87429/AppData/Local/Temp/claude/c--Drive-Data-AI-Project-AI-Project-portfolio-dashboard/f4e56c25-9f1d-4447-bdd3-8034f986cfec/scratchpad` ชื่อ `gc-<page>-*.png`
- ทุกชุด `for f in scripts/*-test.js; do node "$f" >/dev/null 2>&1 || echo "FAIL $f"; done` → ไม่มี FAIL

## Review Focus

1. การ์ดที่ map สีผิดความหมาย (เช่น ขาดทุนแต่เขียว) หรือมีสีทั้งที่หน้าไม่มีสถานะ → ตารางการ map ในรายงาน + เทสต์ราย tone ในแต่ละงาน
2. ล็อก Privacy แล้วเงินโผล่ หรือเงินไปอยู่ใน title/aria-label หลังเปลี่ยน markup → เทสต์ล็อกในงาน Home/PM/Position
3. ตาราง/ฟอร์มบนการ์ดแก้วอ่านไม่ออกในโหมดสว่าง หรือ focus ring หาย → ภาพโหมดสว่าง + เทสต์ CSS มี `:focus-visible` สำหรับ `gc-` ที่กดได้
4. หน้าเลื่อนแนวนอนที่ 390–1024px → probe วัด `scrollWidth <= innerWidth` ทุกหน้าในกลุ่ม
5. วาดใหม่บางส่วน (render เฉพาะ section) แล้วการ์ดหลุดคลาสแก้ว → เทสต์ที่วาดผ่านเส้นทางวาดบางส่วนของแต่ละหน้า

---

### Task 1: ชิ้นส่วนกลาง + แถบหัวไม่ล้นจอ + เทสต์ทั้งเว็บ

**Files:**
- Modify: `public/glass-cards.css` — เพิ่ม `gc-table` (ตารางบนแก้ว: หัวตาราง เส้นคั่น แถว hover ตัวเลข tabular · เลื่อนในกล่องเมื่อกว้างเกิน), `gc-btn` / `gc-btn-ghost` (ปุ่มบนแก้ว + `:focus-visible`), `gc-field` (input/select บนแก้ว), `gc-section-h` (หัวข้อ section นอกการ์ด) · อัปเดตคอมเมนต์หัวไฟล์ · bump เป็น `?v=20261121-gc-2` ใน `public/market-risk.html`
- Modify: `public/mission-control.css` ~237 `.mc-header-right` — ไม่ทำให้หน้าเลื่อนแนวนอนที่ 390–1024px (wrap / ย่อ / ซ่อนป้ายรองตามความกว้าง — คงทุกปุ่มที่กดได้) · bump `mission-control.css?v=` ทุกหน้าที่โหลด
- Create: `scripts/glass-sitewide-test.js` — รายการ `PAGES` (เริ่มที่ `market-risk`) ต่อหน้า: HTML โหลด `glass-cards.css?v=` เวอร์ชันเดียวกับไฟล์ปัจจุบัน และโหลดก่อน CSS ของหน้า · ซอร์สของหน้ามี `gc-card` · `glass-cards.css` ไม่มี Doto/dot-matrix · คลาสทุกตัวใน glass-cards.css ขึ้นต้น `gc-` · ทุก selector ที่กดได้ (`gc-btn`, `gc-field`, `gc-info` ฯลฯ) มี `:focus-visible`
- Test: `scripts/glass-cards-test.js` (pin gc-2) · `scripts/nav-shell-test.js` (ถ้า pin mission-control.css)

**Interfaces:**
- Produces: คลาส `gc-table` `gc-btn` `gc-btn-ghost` `gc-field` `gc-section-h` (Task 2–5 ใช้) · `scripts/glass-sitewide-test.js` มีอาร์เรย์ `PAGES` ที่ Task 2–5 เพิ่มชื่อหน้า (`home`, `portfolio-manager`, `portfolio`, `thesis`)

- [ ] Step 1: เขียนเทสต์ `glass-sitewide-test.js` (กับ market-risk) + เทสต์ CSS ของชิ้นใหม่ → รันให้เห็นว่าล้ม
- [ ] Step 2: เพิ่มชิ้นใน glass-cards.css · แก้ `.mc-header-right` · bump เวอร์ชัน
- [ ] Step 3: probe Chrome ที่ /market-risk และ /portfolio-manager (ข้อมูลสมมุติ) ความกว้าง 390, 768, 1024: `document.documentElement.scrollWidth <= innerWidth` · ภาพ `gc-shell-*.png`
- [ ] Step 4: ทุกชุดเทสต์ผ่าน · ไม่ commit

---

### Task 2: Home (/home)

**Files:** `public/mission-control-v2.css` · `public/mission-control-page.js` (การ์ดทั้งหมดใน `#mcRoot`) · `public/home-action-page.js` + CSS `.ha-*` (กล่อง "ต้องทำอะไรวันนี้") · `public/home.html` (โหลด glass-cards.css ก่อน mission-control*.css + bump) · เทสต์ `scripts/home-action-test.js`, เทสต์ของ mission-control ที่มีอยู่, `scripts/glass-sitewide-test.js` (เพิ่ม `home`)

**Interfaces:** Consumes Task 1 (`gc-*` ชิ้นกลาง, `PAGES`)

- [ ] Step 1: ไล่ทุกการ์ดใน /home ทำตาราง "การ์ด → สถานะต้นทาง (ตัวแปร/ฟังก์ชันที่คำนวณอยู่แล้ว) → tone" · เขียนเทสต์ที่วาดหน้าใน vm แล้วตรวจว่าการ์ดที่มีสถานะได้ tone ตามตาราง (อย่างน้อยหนึ่งกรณีต่อ tone ที่หน้าเกิดได้) และการ์ดไม่มีสถานะได้ `gc-neutral` → รันให้ล้ม
- [ ] Step 2: ใส่คลาส + ปรับ CSS (ตัวเลข `gc-num` · ชิป/ปุ่ม `gc-btn` · ตาราง `gc-table`) · ลบสไตล์การ์ดเก่าที่ถูกแทน · bump
- [ ] Step 3: เทสต์ล็อก Privacy: ไม่มีตัวเลขเงินหลุด ไม่มีเงินใน title/aria-label (ใช้วิธีของเทสต์เดิม)
- [ ] Step 4: probe มืด/สว่าง 1440 + 390 · ไม่มี console error · ไม่เลื่อนแนวนอน · ทุกชุดผ่าน · ไม่ commit

---

### Task 3: AI Portfolio Manager (/portfolio-manager)

**Files:** `public/portfolio-manager.css` · `public/portfolio-manager-page.js` · `public/portfolio-manager.html` · เทสต์ `scripts/pm-view-test.js`, `scripts/pm-cash-test.js`, `scripts/pm-settings-sync-test.js` (ถ้าพึ่ง markup), `scripts/glass-sitewide-test.js` (เพิ่ม `portfolio-manager`)

**Interfaces:** Consumes Task 1

- [ ] Step 1: ตารางการ map — สถานะที่หน้ามีอยู่แล้ว เช่น Zone A–E, action (increase / maintain / wait / review), ธงเทคนิค, ความเสี่ยงของ risk rules, กำไร/ขาดทุนรายตัว → tone · ตาราง Current Portfolio ใช้ `gc-table` บนการ์ด `gc-neutral` เว้นแต่แถวมีสถานะของตัวเอง (ใช้สีที่ชิป/ตัวเลข ไม่ใช่ทั้งการ์ด) · เทสต์ใน vm ราย tone → รันให้ล้ม
- [ ] Step 2: ใส่คลาส + CSS · ฟอร์ม/ช่องกรอก (ช่องเงินสด, Tier) ใช้ `gc-field`/`gc-btn` และยังทำงานเหมือนเดิม · bump
- [ ] Step 3: เทสต์ล็อก Privacy (ช่องเงินสดและตาราง) · เทสต์เดิมทุกตัวผ่าน
- [ ] Step 4: probe มืด/สว่าง 1440 + 390 · ไม่ commit

---

### Task 4: Portfolio Position (/portfolio)

**Files:** `public/portfolio-position.css` · `public/portfolio-position-page.js` · การ์ด Asset allocation `public/allocation-card-page.js` (+ CSS ของการ์ดนี้) · ส่วน Asset Allocation `public/asset-allocation-page.js` + `public/asset-allocation.css` · `public/portfolio.html` · เทสต์ `scripts/allocation-card-test.js`, `scripts/portfolio-merged-test.js`, เทสต์ของ asset-allocation view, `scripts/glass-sitewide-test.js` (เพิ่ม `portfolio`)

**Interfaces:** Consumes Task 1

- [ ] Step 1: ตารางการ map — ผลตอบแทนจริงเทียบเป้า (ตามแผน/ตามหลัง), กำไร/ขาดทุน, ระดับเงินสดเทียบกรอบ ฯลฯ → tone · **สีของแท่งประเภทสินทรัพย์ในการ์ด Asset allocation คงเดิม** (สีมีความหมายเฉพาะ) · เทสต์ใน vm ราย tone → รันให้ล้ม
- [ ] Step 2: ใส่คลาส + CSS · ตัวเลขส่วนหัว `gc-num` · bump
- [ ] Step 3: เทสต์ล็อก Privacy (ยอดรวม แถบ การ์ด allocation) · เทสต์เดิมทุกตัวผ่าน
- [ ] Step 4: probe มืด/สว่าง 1440 + 390 · ไม่ commit

---

### Task 5: Investment Thesis (/thesis)

**Files:** `public/thesis.css` · `public/thesis-page.js` · `public/thesis-overview.js` · `public/thesis-compare.js` · `public/thesis.html` · เทสต์ `scripts/thesis-smoke-test.js` และเทสต์ view ของ thesis ที่มี, `scripts/glass-sitewide-test.js` (เพิ่ม `thesis`)

**Interfaces:** Consumes Task 1

- [ ] Step 1: ตารางการ map — สถานะ thesis (Very Strong / Strong → calm · Neutral → normal · Weak → warning · Broken → danger ตามป้ายที่ engine ให้), health ของ Intelligence (INTACT / WATCH / BROKEN ฯลฯ), ทิศของ whatChanged, ป้ายอายุข้อมูล (สด/เก่า) → tone · fundamentals 10 ช่องใช้สีที่ชิป/คะแนน ไม่ใช่ทั้งการ์ด · เทสต์ใน vm ราย tone → รันให้ล้ม
- [ ] Step 2: ใส่คลาส + CSS · กราฟประวัติ/forwardView: เส้นที่สีไม่มีความหมายเปลี่ยนเป็นขาวแบบ Macro · เส้นที่สีมีความหมาย (จริง vs คาด) คงความต่าง · bump
- [ ] Step 3: เทสต์เดิมทุกตัวผ่าน
- [ ] Step 4: probe มืด/สว่าง 1440 + 390 · ไม่ commit
