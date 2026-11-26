# Long-term Signal visuals — Implementation Plan

> For agentic workers: executed inline (superpowers:executing-plans) — the user said "จัดไป".

**Goal:** 5 คำถามเป็นหน้าปัด + ส่วนย้อนหลังเป็นภาพ ตาม spec
**Spec:** `docs/superpowers/specs/2026-11-26-btc-lt-visual-design.md`
**Tech:** ES5 · Node vm tests · Chrome probe (scratchpad/probe-lt-chrome.js)

## Global Constraints
ES5 ในไฟล์ public ใหม่/แก้ · ไม่มีคำแนะนำซื้อ/ขาย · ไม่มี ฿ ใน title/aria · ห้ามเรียก bitcoin-data.com · ห้าม commit จนผู้ใช้สั่ง push git

## Review Focus
1. คำตอบที่ไม่มีข้อมูล → ไม่มีเข็ม ไม่มีคำตัดสินปลอม · 2. สีหน้าปัด = สีการ์ด = tone เดิมทุกกรณี · 3. สถานะปัจจุบันไม่มีผล 365 วัน (n = 0) → ไม่วาด 100 ช่องจากศูนย์ · 4. มือถือ 390px · 5. ตารางเดิมยังอยู่ครบใน "ดูตารางเต็ม"

### Task 1 — engine: `answers()` returns `score`
- `public/btc-lt-signal.js` · test `scripts/btc-lt-signal-test.js`
- each answer `{ id, q, a, tone, evidence, score }` — score 0–100 (ปัด 1 ตำแหน่ง) or null · `toneOf(score) === tone` whenever score ≠ null · Q5 maps per spec

### Task 2 — panel: gauges + summary · accuracy picture + folded tables
- `public/btc-lt-panel.js` · `public/btc-lt-panel.css` · test `scripts/btc-lt-panel-test.js`
- questionsHtml: summary (`data-lt-qsum`) + cards with `data-lt-score`, SVG gauge (`.btc-lt-gauge`, needle `data-lt-needle` = position 0–1), verdict (`.btc-lt-q-v`), answer, `<details>` evidence
- histHtml: accuracy picture (`data-lt-acc-now`, 100 cells `data-lt-cell`, bars `data-lt-acc-bar="<state>"`), summary sentence from numbers, `<details data-lt-acc-full>` holding both old tables + footnote

### Task 3 — verify
- bump `btc-lt-signal.js` lts-3 · `btc-lt-panel.js` ltp-3 · `btc-lt-panel.css` ltp-2 · full suite · Chrome probe 1440/390 + dark/light · fresh review
