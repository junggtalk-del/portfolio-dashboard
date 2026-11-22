# Glass cards ทั้งเว็บ — กลุ่ม 2–4 (14 หน้าที่เหลือ) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ทุกหน้าที่เหลือใช้การ์ดแก้วจาก `public/glass-cards.css` แบบเดียวกับ /market-risk และกลุ่ม 1 โดยสีการ์ดมาจากสถานะที่หน้าคำนวณอยู่แล้ว

**Architecture:** ทำต่อจากแผนกลุ่ม 1 (`docs/superpowers/plans/2026-11-21-glass-cards-batch1.md`) ซึ่งทำให้ `glass-cards.css` มีชิ้นกลางครบ (`gc-card` + 5 tone · `gc-num` · `gc-pill` · `gc-table` · `gc-btn` · `gc-field` · `gc-section-h` · zone bar · sparkline) และมี `scripts/glass-sitewide-test.js` ที่มีอาร์เรย์ `PAGES` · หนึ่งงานต่อหนึ่งหน้า: ใส่คลาส `gc-card gc-<tone>` คู่คลาสเดิมในโค้ดที่วาดการ์ด ลบสไตล์การ์ดเก่าที่ถูกแทน เพิ่มชื่อหน้าใน `PAGES`

**Tech Stack:** ES5 · CSS · Node + `vm` tests · Chrome CDP

**Spec:** `docs/superpowers/specs/2026-11-21-glass-cards-sitewide-design.md`

## Global Constraints

- สีการ์ด: สถานะที่หน้าคำนวณอยู่แล้ว → `gc-calm` (ดี) · `gc-normal` (ปกติ) · `gc-warning` (ระวัง) · `gc-danger` (แย่) · ไม่มีสถานะ → `gc-neutral` · **ห้ามประดิษฐ์สถานะใหม่** · ทุกงานเขียนตาราง "การ์ด → สถานะต้นทาง → tone" ในรายงาน
- ตัวเลข Inter 700 tabular-nums (`gc-num`) · **ห้ามฟอนต์ตัวเลขแบบจุด (Doto หรือ LED ใด ๆ)**
- โหมดสว่าง: การ์ดสีสด ตัวหนังสือขาว · พื้นหน้า/หัวข้อตามธีม
- คงทุกคลาส id data-hook aria และข้อความเดิม · ไม่แตะการดึงข้อมูล/การคำนวณ · escape ทุกค่าที่ใส่ใน innerHTML
- ใช้ชิ้นจาก `glass-cards.css` ก่อนเขียนใหม่ · ถ้าจำเป็นต้องเพิ่มชิ้นกลาง ให้เพิ่มใน `glass-cards.css` แบบใช้ได้ทุกหน้า (prefix `gc-`) แล้ว bump เวอร์ชันของไฟล์นั้นทุกหน้าที่โหลด · คลาสใหม่ในไฟล์ของหน้าใช้ prefix ของหน้า
- ไฟล์ที่หลายหน้าใช้ร่วม (เช่น `mission-control-v2.css` ใช้ทั้ง home · ai-cycle · wave3) — แก้ได้เฉพาะ selector ที่ไม่กระทบหน้าอื่นที่แปลงแล้ว และต้องดูภาพหน้าอื่นที่โหลดไฟล์เดียวกันซ้ำ
- สีของกราฟ/แท่งที่สีมีความหมายเฉพาะคงเดิม (วางบนการ์ดแก้ว) · เส้นที่สีไม่มีความหมายเปลี่ยนเป็นขาวแบบ Macro ได้
- ตัวหนังสือรองบนการ์ด ≥4.5:1 ทุก tone · ไม่มีเลื่อนแนวนอนที่ 390–1440px
- Privacy: เงินถูกซ่อนตอนล็อกเหมือนเดิม · ห้ามเงินใน `title`/`aria-label`
- ES5 ในโค้ดใหม่ของ `public/*.js` · ข้อความไทย · ห้ามคำแนะนำซื้อขาย (ควรซื้อ/ควรขาย/น่าซื้อ/น่าขาย/น่าเข้า/แนะนำซื้อ/จุดเข้า/ตัดขาดทุน, Buy/Sell)
- เปลี่ยนไฟล์ไหน bump `?v=` ของไฟล์นั้นทุกหน้าที่โหลด (`20261121-<prefix>-<n+1>` หรือวันที่ทำจริง) + แก้ pin ในเทสต์ · `site-integrity-test` บังคับเวอร์ชันเดียวต่อไฟล์
- **ห้าม git commit/stage** · สคริปต์เขียนด้วย Write tool เท่านั้น
- Probe Chrome: ดัก `/api/portfolio*` (รวม `?doc=journal` `?doc=pm`) และ `/api/portfolio-holdings` ด้วยข้อมูลสมมุติ · non-GET อื่นใต้ `/api` → 403 · API ข้อมูลตลาด (`/api/market-risk` `/api/ohlc` และ endpoint ตลาด/SET อื่นที่หน้าใช้) ใช้ของจริงได้ · ซ่อนแค่ `#portfolio-auth-overlay` ห้ามปลด privacy · **ห้ามอ่าน/เขียนเอกสารพอร์ตหรือ journal จริง** · timeout ทุกขั้น · ปิด Chrome + ลบ profile · ภาพมืด/สว่าง 1440 + มือถือ 390 ลง scratchpad `C:/Users/mtl87429/AppData/Local/Temp/claude/c--Drive-Data-AI-Project-AI-Project-portfolio-dashboard/f4e56c25-9f1d-4447-bdd3-8034f986cfec/scratchpad` ชื่อ `gc-<page>-*.png`
- ทุกชุด `for f in scripts/*-test.js; do node "$f" >/dev/null 2>&1 || echo "FAIL $f"; done` → ไม่มี FAIL

## Review Focus

1. สีการ์ดผิดความหมาย หรือมีสีทั้งที่ไม่มีสถานะ → ตารางการ map + เทสต์ราย tone ในทุกงาน
2. เงินโผล่ตอนล็อก Privacy / เงินใน title-aria หลังเปลี่ยน markup (หน้าที่แสดงเงิน: Quarterly Editor · Action Center · Accumulation · Asset 360 · Decision Journal · Thai DR Port) → เทสต์ล็อกในงานนั้น
3. ฟอร์ม/ตาราง/แผนภูมิบนแก้วอ่านไม่ออกในโหมดสว่าง หรือ focus ring หาย → ภาพโหมดสว่าง + `:focus-visible`
4. หน้าเลื่อนแนวนอนที่ 390–1024px → probe วัด `scrollWidth <= innerWidth`
5. วาดใหม่บางส่วนแล้วการ์ดหลุดคลาสแก้ว → เทสต์ผ่านเส้นทางวาดบางส่วนของหน้า (ถ้าหน้ามี)

## ขั้นมาตรฐานของทุกงาน (Task 1–14)

- [ ] Step 1: ไล่ทุกการ์ดของหน้า ทำตารางการ map · เขียนเทสต์ (vm ถ้าหน้ามีเทสต์ view อยู่แล้ว ไม่งั้นทดสอบฟังก์ชันวาดที่หน้าเปิดให้เรียก หรือเทสต์ซอร์ส/HTML) ว่าการ์ดที่มีสถานะได้ tone ตามตาราง และที่ไม่มีได้ `gc-neutral` + เพิ่มหน้าใน `PAGES` ของ `glass-sitewide-test.js` → รันให้ล้ม
- [ ] Step 2: ใส่คลาส + ปรับ CSS ของหน้า · ลบสไตล์การ์ดเก่าที่ถูกแทน · HTML โหลด `glass-cards.css` ก่อน CSS ของหน้า + bump
- [ ] Step 3: เทสต์เดิมของหน้าผ่านทั้งหมด (+ เทสต์ล็อก Privacy ถ้าหน้าแสดงเงิน)
- [ ] Step 4: probe มืด/สว่าง 1440 + 390 · ไม่มี console error (ยกเว้น favicon) · ไม่เลื่อนแนวนอน · ทุกชุดผ่าน · ไม่ commit

---

### Task 1: Quarterly Editor (`/` → `public/index.html`)
Files: `public/styles.css` · `public/app.js` · `public/index.html` · เทสต์ `editor-follows-pm-test.js` `pm-cash-test.js` `quarterly-editor-save-test.js` ที่เกี่ยว
หมายเหตุ: หน้านี้ไม่ได้โหลด `mission-control.css` และใช้ `styles.css` ของตัวเอง · ฟอร์มไตรมาส/ตารางสินทรัพย์ใช้ `gc-field` `gc-btn` `gc-table` · สถานะที่มี เช่น แถวล็อกจาก AI Portfolio Manager, ข้อความสถานะบันทึกสำเร็จ/ล้มเหลว, ไตรมาสจบแล้ว → ใช้สีที่ชิป/ข้อความ ไม่ใช่ทั้งการ์ด · การ์ดหลักเป็น `gc-neutral`

### Task 2: Action Center (`/action-center`)
Files: `public/action-center.css` · `public/action-center-page.js` · `public/action-center.html` · เทสต์ `foreign-sleeve-readers-test.js` และเทสต์ action-center ที่มี
หมายเหตุ: สัญญาณ/ระดับความสำคัญของแต่ละรายการ (3 โซน My Positions / Watchlist / Market) → tone ตามสถานะที่ engine ให้

### Task 3: Accumulation Center (`/accumulation-center`)
Files: `public/accumulation.css` · `public/accumulation-page.js` · `public/accumulation-center.html`
หมายเหตุ: คะแนนจังหวะสะสม/โซน → tone ตามเกณฑ์ที่หน้าใช้แบ่งระดับอยู่แล้ว

### Task 4: Asset 360 (`/asset`)
Files: `public/asset.css` · `public/asset-page.js` · `public/asset.html` · เทสต์ `asset-allocation-*` `portfolio-merged-test.js` ที่เกี่ยว
หมายเหตุ: สัญญาณเทคนิค/คะแนนของสินทรัพย์ → tone

### Task 5: Bitcoin Monitor (`/bitcoin-monitor`)
Files: `public/bitcoin-monitor.css` · `public/bitcoin-intelligence.css` · `public/bitcoin-monitor-page.js` · `public/bitcoin-intelligence-page.js` · `public/global-liquidity-page.js` · `public/bitcoin-monitor.html`
หมายเหตุ: โซน MVRV/NUPL, ระดับ regime ของ Bitcoin Intelligence, สภาพคล่อง → tone ตามโซนที่หน้ามี · สีเฉพาะของกราฟ on-chain คงความหมาย

### Task 6: Smart DCA (`/smart-dca`)
Files: `public/smart-dca.css` · `public/smart-dca-page.js` · `public/smart-dca.html` · เทสต์ `smart-dca-smoke-test.js`
หมายเหตุ: โซน MVRV ที่กำหนดตัวคูณ DCA → tone · ผล backtest เทียบ DCA ปกติ (ชนะ/แพ้) → tone ของการ์ดผล

### Task 7: AI Cycle Intelligence (`/ai-cycle`)
Files: `public/ai-cycle.css` · `public/ai-cycle-page.js` · `public/ai-cycle.html` (โหลด `mission-control-v2.css` ร่วมกับ home — ห้ามทำให้ home เปลี่ยน)
หมายเหตุ: เฟสวัฏจักร/ความสอดคล้องของพอร์ต → tone

### Task 8: Adaptive Position (`/adaptive-position`)
Files: `public/adaptive-position.css` · `public/adaptive-position-page.js` · `public/adaptive-position.html` · เทสต์ `adaptive-position-smoke-test.js`
หมายเหตุ: Mega Trend gate / ความมั่นใจของ position → tone

### Task 9: Wave 3 Setup (`/wave3`)
Files: `public/wave3.css` · `public/wave3-page.js` · `public/wave3.html` (โหลด `mission-control-v2.css` ร่วม) · เทสต์ `big-cache-consumers-test.js` ถ้าพึ่ง markup
หมายเหตุ: setup/trigger status ของแต่ละสินทรัพย์ → tone

### Task 10: Thai Catalyst Hunter (`/catalyst-hunter`)
Files: `public/catalyst-hunter.css` · `public/catalyst-page.js` · `public/catalyst-hunter.html` · เทสต์ `catalyst-test.js` `sma200-view-test.js` ที่เกี่ยว markup
หมายเหตุ: ระดับ catalyst/หลักฐาน → tone · ตารางรายชื่อหุ้นใหญ่ใช้ `gc-table` บนการ์ด `gc-neutral`

### Task 11: Thai DR Monitor (`/thai-dr-monitor`)
Files: `public/thai-dr-monitor.css` · `public/thai-dr-page.js` · `public/thai-dr-monitor.html` · เทสต์ `thai-dr-monitor-view-test.js`
หมายเหตุ: แท็บ Port แสดงเงิน → เทสต์ล็อก Privacy · ป้ายข้อมูลต้องตรวจ/ATH → สีที่ชิป

### Task 12: Market Scanner (`/scanner`)
Files: `public/scanner.css` · `public/scanner-page.js` · `public/scanner.html` (ยังไม่มีเทสต์ — เขียนเทสต์ซอร์ส/HTML ขั้นต่ำ)
หมายเหตุ: ผลสแกนแต่ละตัว (สัญญาณซื้อ EMA ตัดขึ้น + วอลุ่ม) → tone ตามความแรงที่หน้าคำนวณ

### Task 13: Backtest Lab (`/backtest`)
Files: `public/backtest.css` · `public/backtest-page.js` · `public/backtest.html` · เทสต์ `backtest-smoke-test.js`
หมายเหตุ: ผลกลยุทธ์ (กำไร/ขาดทุน, เทียบ buy & hold) → tone · ฟอร์มตั้งค่าใช้ `gc-field`

### Task 14: Decision Journal (`/decision-journal`) — ทำสุดท้าย
Files: `public/decision-journal.css` · `public/decision-journal-page.js` · `public/decision-journal.html` · เทสต์ `decision-journal-view-test.js`
หมายเหตุ: เดิมเป็นพาสเทลตามภาพผู้ใช้ (ต.ค.) — ผู้ใช้สั่ง "ทั้งเวบ" จึงเปลี่ยน · เทสต์เดิมที่บังคับ "ไม่มี gradient" และ "สีอยู่ใน token --dj-* เท่านั้น" ต้องปรับให้สอดคล้อง (สีการ์ดมาจาก glass-cards.css · สีของหน้ายังอยู่ใน token) โดยยังคงเจตนาเดิม: ไม่มีค่าสีกระจัดกระจายในไฟล์ของหน้า · การ์ดสถิติ/ไม้จริง/ผลของการทำตามกฎ: กำไร-ขาดทุน, ตามกฎ/แหกกฎ, ได้/พลาด → tone ที่ชิป/ตัวเลข · ฟอร์มบันทึกใหม่ใช้ `gc-field` · ชิปอารมณ์คงคลาส `dj-chip` · ห้ามคืน PAGE_META
