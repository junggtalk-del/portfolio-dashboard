# Journal: สิ่งที่ทำจริงจากกล่อง Action + สรุปผลทำ/ไม่ทำ 3 ช่วง — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** หน้า /decision-journal แสดงช่อง "ทำอะไร" ของรายการจากกล่อง Action ตามสิ่งที่ผู้ใช้ทำจริง และมีการ์ดสรุป "ทำแล้ว" เทียบ "ไม่ทำ / ไม่ได้ตอบ (ถ้าทำจะได้)" ที่ 1 สัปดาห์ / 1 เดือน / 3 เดือน

**Architecture:** ไม่แตะข้อมูลที่เก็บ — หน้า Journal คิด "สิ่งที่ทำจริง" ตอนแสดงผลผ่าน helper ตัวเดียว · การ์ดเรียก `HomeActionEngine.summary()` ตัวเดียวกับกล่อง Home (ขยายให้รับช่วง 90 วันและ `allTime`) กับ `state.outcomesById` ที่หน้าคิดอยู่แล้ว · หน้า Journal โหลด `home-action-engine.js` เพิ่ม

**Tech Stack:** ES5 ล้วน (ไม่มี build) · เทสต์ Node + `vm` sandbox (`scripts/*-test.js`) · ตรวจหน้าจริงใน Chrome ผ่าน CDP

**Spec:** `docs/superpowers/specs/2026-11-19-journal-home-action-outcomes-design.md`

## Global Constraints

- ES5 เท่านั้นในไฟล์ `public/` (เทสต์ `es5Problems` บังคับ) · ข้อความบนจอภาษาไทย
- ห้ามคำแนะนำซื้อขาย: ควรซื้อ/ควรขาย/น่าซื้อ/น่าขาย/น่าเข้า/แนะนำซื้อ/จุดเข้า/ตัดขาดทุน, Buy/Sell
- เงินบนหน้า Journal ผ่าน `moneySigned(amount, currency, true)` (ล็อกอยู่ = "XXX" ทุกสกุล) · ห้ามเงินใน `title`/`aria-label`
- สีในไฟล์ `decision-journal.css` ใช้ได้เฉพาะ `var(--dj-*)`/`var(--mc-*)` นอกบล็อก token · คลาสใหม่ขึ้นต้น `dj-` · ไม่มี gradient · ไม่มี font-family ใหม่
- ห้ามเปลี่ยน: ข้อมูลที่เก็บใน entry · สูตร id `ha_<SYM>_<rule>_<side>_<date>` · `HomeActionEngine.HORIZONS` (= `[7, 30]`) · `HomeActionEngine.VERSION` · ผลของ `summary()` เมื่อเรียกแบบเดิม (ไม่มี `allTime` · horizon 7/30) ต้องเท่าเดิมทุกไบต์
- นาฬิกาจริงของหน้า Journal อ่านที่เดียว (`nowBangkok()`) — ห้าม `new Date()`/`Date.now()` เพิ่ม
- เวอร์ชันใหม่: `home-action-engine.js?v=20261119-ha-2` (home.html + decision-journal.html) · `decision-journal-page.js?v=20261119-dj-7` · `decision-journal.css?v=20261119-dj-7` · อัปเดต pin ในเทสต์ทุกที่ (`grep -rn "<ไฟล์>?v=" scripts/`)
- **ห้าม git commit/stage** จนผู้ใช้สั่ง "push git" — ขั้น "Commit" ในแผนนี้ = ไม่ทำ (ผู้รีวิวได้แพ็กเกจจากสแนปช็อตไฟล์)
- เขียนสคริปต์ด้วย Write tool เท่านั้น (ห้าม heredoc / `node -e` ที่มี regex · backslash · backtick)
- ทุกชุด `for f in scripts/*-test.js; do node "$f" >/dev/null 2>&1 || echo "FAIL $f"; done` → ไม่มี FAIL

## Review Focus

1. รายการจากกล่องที่ `ha.side` หายหรือไม่ใช่ buy/sell (ข้อมูลเก่า/เสีย) — ช่อง "ทำอะไร" ต้องกลับไปใช้ `action.kind` ที่เก็บไว้ ไม่เดาฝั่ง → เทสต์ใน Task 2
2. รายการจากกล่องที่ถูกลบ (มี `deletedAt`) — ไม่นับในการ์ด · ไม่โผล่ในตัวกรอง → เทสต์ใน Task 3
3. ราคายังโหลดไม่เสร็จ / ดึงราคาบางสัญลักษณ์ไม่สำเร็จ — การ์ดบอก "รอผล"/"กำลังดึงราคา…" ไม่มี NaN/undefined และวาดใหม่เมื่อราคามาถึง → เทสต์ใน Task 3
4. ล็อก Privacy กับรายการขายที่ถือเป็น USD — ไม่มีตัวเลขเงินรั่วทั้งสกุลบาทและ USD → เทสต์ใน Task 3
5. กล่องบน Home ต้องได้ตัวเลขเท่าเดิมหลังแก้เอนจิน (ช่วง 7/30 ไม่มี `allTime`) → เทสต์ใน Task 1

---

### Task 1: `summary()` รับช่วง 90 วัน และโหมด `allTime`

**Files:**
- Modify: `public/home-action-engine.js:450-537` (คอมเมนต์หัวฟังก์ชัน + ตัวฟังก์ชัน `summary`)
- Modify: `public/home.html:81` (`?v=20261119-ha-2`)
- Test: `scripts/home-action-engine-test.js` (ต่อท้าย section สรุปผล — ใช้ `mk()` / `oc()` / `E` / `NOW` ที่มีอยู่)

**Interfaces:**
- Produces: `HomeActionEngine.summary(entries, outcomesById, opts)` โดย `opts = { nowBangkok, horizonDays, D?, allTime? }`
  - `horizonDays` ที่ยอมรับ = อยู่ใน `HORIZONS` หรืออยู่ใน `D.HORIZONS` (เอนจิน Journal = `[7, 30, 90]`) · อื่น ๆ → `HORIZONS[0]`
  - `allTime === true` → ไม่กรองด้วย `since` (ยังต้องมี `D` · ไม่ต้องใช้ `nowBangkok`) · ผลมี `since: null` และ `allTime: true`
  - ไม่ส่ง `allTime` → พฤติกรรมเดิมทุกอย่าง และผล**ไม่มีคีย์** `allTime`
  - rows ยังมีแค่ `pct7/pct30/status7/status30` (ไม่เพิ่ม 90) · `impactPct`/`money` ของแถว = ช่วงที่เลือก (รวม 90)

- [ ] **Step 1: เขียนเทสต์ที่ล้ม** (ต่อท้าย section สรุปผลใน `scripts/home-action-engine-test.js`)

```js
function oc3(p7, p30, p90) { var o = oc(p7, p30); o.horizons["90"] = { status: p90 === null ? "pending" : "scored", pct: p90 }; return o; }
var e90 = [mk("old", "2026-06-01", "sell", "done", 100000), mk("new", "2026-10-20", "buy", "skipped", 20000)];
var o90 = { old: oc3(-5, -8, -20), new: oc3(2, 4, null) };
var s90 = HA.summary(e90, o90, { nowBangkok: "2026-10-29T12:00", horizonDays: 90, D: E, allTime: true });
t("allTime + 90: counts the entry older than SUMMARY_DAYS · followed +20% (sell flips) · new still pending at 90",
  s90.horizonDays === 90 && s90.allTime === true && s90.since === null && s90.counts.total === 2 &&
  s90.followed.n === 1 && Math.abs(s90.followed.avgPct - 20) < 1e-9 && s90.followed.money.THB === 20000 &&
  s90.missed.n === 0 && s90.counts.pending === 1, s90);
t("90 without allTime keeps the 90-day signal window (old entry dropped)",
  (function () { var s = HA.summary(e90, o90, { nowBangkok: "2026-10-29T12:00", horizonDays: 90, D: E }); return s.horizonDays === 90 && s.counts.total === 1 && s.since === "2026-07-31" && !("allTime" in s); })());
t("allTime does not need a readable nowBangkok (it filters nothing by date)",
  (function () { var s = HA.summary(e90, o90, { nowBangkok: "not-a-date", horizonDays: 90, D: E, allTime: true }); return s.counts.total === 2 && s.followed.n === 1; })());
t("horizon not measured by D (60) → falls back to 7 · HORIZONS still [7, 30]",
  HA.summary(ents, ocs, { nowBangkok: "2026-10-29T12:00", horizonDays: 60, D: E }).horizonDays === 7 && JSON.stringify(HA.HORIZONS) === "[7,30]");
t("Home calls (7/30 without allTime) carry no allTime key — their numbers stay pinned by the unchanged tests above",
  (function () { var a = HA.summary(ents, ocs, { nowBangkok: "2026-10-29T12:00", horizonDays: 7, D: E }); var b = HA.summary(ents, ocs, { nowBangkok: "2026-10-29T12:00", horizonDays: 30, D: E });
    return !("allTime" in a) && !("allTime" in b); })());
t("allTime 7 over the base fixture equals the windowed summary plus entry e (older than 90 days)",
  (function () { var s = HA.summary(ents, ocs, { nowBangkok: "2026-10-29T12:00", horizonDays: 7, D: E, allTime: true }); return s.counts.total === 5 && s.followed.n === 3; })());
```

- [ ] **Step 2: รันให้เห็นว่าล้ม**

Run: `node scripts/home-action-engine-test.js`
Expected: FAIL ที่ข้อ "allTime + 90" และ "90 without allTime" (ตอนนี้ 90 ตกไปเป็น 7 และไม่มี `allTime`)

- [ ] **Step 3: แก้ `summary()` ใน `public/home-action-engine.js`** ตาม Interfaces ด้านบน — ตัดสิน `h` จาก `HORIZONS` ∪ `D.HORIZONS` (ถ้ามี D) · `allTime` ข้ามทั้งการอ่าน `now` และตัวกรอง `e.date < since` แต่ยังต้องมี `D` · ใส่คีย์ `allTime: true` ในผลเฉพาะตอนเปิดโหมด · อัปเดตคอมเมนต์หัวฟังก์ชันให้ตรง · bump `public/home.html` เป็น `home-action-engine.js?v=20261119-ha-2`

- [ ] **Step 4: รันให้ผ่าน + ตรวจว่ากล่อง Home ไม่เปลี่ยน**

Run: `node scripts/home-action-engine-test.js && node scripts/home-action-test.js && node scripts/site-integrity-test.js`
Expected: ผ่านทั้งหมด · เทสต์ summary เดิมใน home-action-engine-test ผ่านโดยไม่แก้ค่าคาดหวังสักตัว (นี่คือหลักฐานว่าผลของกล่อง Home เท่าเดิม) · home-action-test ไม่ต้องแก้ค่าใด ๆ นอกจาก pin เวอร์ชันถ้ามี

- [ ] **Step 5: ไม่ commit** (ดู Global Constraints)

---

### Task 2: ช่อง "ทำอะไร" = สิ่งที่ทำจริง (แสดงผลเท่านั้น)

**Files:**
- Modify: `public/decision-journal-page.js` — ใกล้ `isHomeAction` (~1616) เพิ่ม helper · จุดที่อ่าน `action.kind` เพื่อแสดง/กรอง: `searchText` (~1354) · `matchesFilters` (~1372) · บรรทัดผลการกระทำ (~1486) · `entryHeadHtml` (~1578) · `entryRowHtml` (~1678) · ป้ายบันทึกในส่วนไม้จริง (~2257, ~2345)
- Test: `scripts/decision-journal-view-test.js` (section ใหม่ต่อจาก "home-action entries on the journal (dj-6)" ใช้ `haJournal()` / `haEntryOf()` / `rowOfEntry()` ที่มีอยู่)

**Interfaces:**
- Produces: `actionKindOf(e) → "buy" | "sell" | "hold" | "none" | <action.kind เดิม>` (ภายในหน้า · ไม่ส่งออก)
  - ไม่ใช่ `source === "home-action"` → `obj(e.action).kind`
  - `ha.response === "done"` และ `ha.side` ∈ {buy, sell} → `ha.side`
  - `ha.response` ∈ {skipped, unanswered} และ `ha.side === "buy"` → `"none"` · `ha.side === "sell"` → `"hold"`
  - อย่างอื่น (ไม่รู้คำตอบ/ไม่รู้ฝั่ง) → `obj(e.action).kind`
- ทุกจุดในรายการ Files ใช้ `actionKindOf(e)` แทน `act.kind` (สี `ACT_HUE` · ข้อความ `thaiOf(D.ACTIONS, …)` · ตัวกรอง · คำค้น · เงื่อนไขบรรทัด "ผลของการ…")

- [ ] **Step 1: เขียนเทสต์ที่ล้ม** — section `"home-action entries show what was actually done (dj-7)"`; สร้าง entry ฝั่งซื้อด้วย `HA.makeEntry` (ev: `{ symbol: "NVDA", rule: 3, side: "buy", date: "2026-10-28", close: 90, kind: "dip", detail: {} }`, opts เหมือน `haEntryOf` แต่ `amount: 20000`) เป็นฟังก์ชัน `haBuyOf(response)` แล้ววาดแต่ละกรณี

```js
// คาด: ข้อความในป้าย .dj-act ของแถว = สิ่งที่ทำจริง · ข้อมูลที่ PUT กลับไม่เปลี่ยน action.kind
//   sell+done → "ขาย" · sell+skipped → "ถือต่อ" · sell+unanswered → "ถือต่อ"
//   buy+done → "ซื้อ" · buy+skipped → "ไม่ทำอะไร" · buy+unanswered → "ไม่ทำอะไร"
t("row action pill follows the answer for all 6 cases", /* วาดทีละกรณีด้วย JOURNAL = … แล้วอ่าน /class="dj-act"[^>]*>([^<]*)</ ใน haRow() */);
t("data-hue of the pill follows the shown action (hold → slate · none → amber)", /* … */);
t("manual entries are unchanged (e_fix1 still shows its stored action)", /* … */);
t("ha.side missing → falls back to the stored action.kind (Review Focus 1)", /* entry ที่ลบ ha.side ออก */);
t("filter ทำอะไร = hold shows the skipped sell and hides the done sell", /* changeAttr ตัวกรอง action แล้วนับแถว */);
t("search 'ถือต่อ' finds the skipped sell", /* ตั้ง state.filters.q แล้ววาด */);
t("expanded detail of a skipped sell has no 'ผลของการขาย' line", /* เปิดรายละเอียดแล้วตรวจไม่มี 'ผลของการขาย' */);
t("a later PUT from the page sends the home-action entry with action.kind still 'sell'", /* ทำให้เกิด PUT (เช่น ลบบันทึกอื่น) แล้วอ่าน lastPut() */);
```

ทุกข้อเขียน assertion จริงตามคอมเมนต์ (ใช้ helper ที่ไฟล์เทสต์มีอยู่ เช่น `rowOfEntry`, `changeAttr`, `clickAttr`, `flush`, `lastPut`) — ห้ามปล่อยเป็นข้อที่ assert อะไรไม่ได้

- [ ] **Step 2: รันให้เห็นว่าล้ม**

Run: `node scripts/decision-journal-view-test.js`
Expected: FAIL ที่ "row action pill follows the answer…" (ตอนนี้ sell+skipped ยังขึ้น "ขาย")

- [ ] **Step 3: เพิ่ม `actionKindOf(e)` และเปลี่ยนทุกจุดในรายการ Files ให้ใช้** — คงชิป "จากกล่อง Action · กฎ n · คำตอบ" เดิม · ไม่แตะค่าใน entry

- [ ] **Step 4: รันให้ผ่าน**

Run: `node scripts/decision-journal-view-test.js && node scripts/decision-journal-test.js`
Expected: ผ่านทั้งหมด

- [ ] **Step 5: ไม่ commit**

---

### Task 3: การ์ด "ผลของการทำตามกฎ (จากกล่อง Action)"

**Files:**
- Modify: `public/decision-journal.html` — โหลด `/home-action-engine.js?v=20261119-ha-2` ระหว่าง `decision-journal-engine.js` กับ `decision-journal-page.js` · `decision-journal-page.js?v=20261119-dj-7` · `decision-journal.css?v=20261119-dj-7`
- Modify: `public/decision-journal-page.js` — `renderHaOutcome()` (section id `djHaOut`) วางใน `.dj-col-log` ต่อจาก `renderStats()` (บรรทัดประกอบหน้า ~3242) และทุกเส้นทางวาดบางส่วนที่วาด `djStats` ใหม่หลังราคามาถึง ต้องวาด `djHaOut` ด้วย
- Modify: `public/decision-journal.css` — คลาส `dj-hao-*`
- Test: `scripts/decision-journal-view-test.js` (section ใหม่ + อัปเดต pin "body scripts exact order and versions" ~641)

**Interfaces:**
- Consumes: `window.HomeActionEngine.summary(entries, outcomesById, { nowBangkok, horizonDays, D, allTime: true })` จาก Task 1 · `D.liveEntries(state.doc)` · `state.outcomesById` · `nowBangkok()` · `moneySigned(…, true)` · `pnlCls` · `fmtPct` · `horizonLabel` · `block()`
- ข้อความตายตัว:
  - หัว: `ผลของการทำตามกฎ (จากกล่อง Action)` · บรรทัดรอง: `ทุกสัญญาณที่บันทึกไว้ · ผลต่อพอร์ตเฉลี่ยนับจากราคาปิดวันสัญญาณ`
  - แถว: `ทำแล้ว` · `ไม่ทำ / ไม่ได้ตอบ (ถ้าทำจะได้)` · คอลัมน์: `horizonLabel(7|30|90)` (= `1 สัปดาห์` `1 เดือน` `3 เดือน`)
  - ช่อง: `fmtPct(avgPct, 1)` ลงสีด้วย `pnlCls` + `n รายการ` · ช่องที่ n = 0 → `รอผล` · เงินรวมแยกสกุลในช่องนั้น (บรรทัดที่สอง · `moneySigned(…, true)`) เมื่อมี และ `จาก k รายการที่มีฐานเงิน` เมื่อ `moneyN[สกุล] < n`
  - ท้ายการ์ด: `รอผล m รายการ (ยังไม่ครบ 3 เดือน)` เมื่อ `counts.pending` ของช่วง 90 > 0 · คำอธิบาย: `ขาย = ราคาลงคือได้ · แถว "ไม่ทำ" อ่านว่าถ้าทำตามกฎจะได้เท่านี้`
  - ว่าง/ผิดพลาด: โหลดเอกสารไม่ได้ → ข้อความแบบเดียวกับ `renderStats` · ไม่มี `window.HomeActionEngine` → `โหลดตัวคำนวณสรุปไม่สำเร็จ` · ไม่มีรายการจากกล่อง → `ยังไม่มีรายการจากกล่อง Action — ตอบในกล่อง "ต้องทำอะไรวันนี้" บนหน้าแรกแล้วผลจะสรุปที่นี่` · `state.outcomesLoading` → บรรทัดรอง `กำลังดึงราคา… ตัวเลขอาจยังไม่ครบ`

- [ ] **Step 1: เขียนเทสต์ที่ล้ม** — section `"home-action outcome card (dj-7)"`: เอกสารที่มีบันทึกมือ 1 + รายการจากกล่อง 4 (sell+done ฐาน 50,000 THB · sell+skipped ฐาน 2,000 USD · buy+done ไม่มีฐาน · buy+unanswered) + รายการจากกล่องที่ถูกลบ 1 · ตั้ง `P._state.outcomesById` ให้มี horizons "7"/"30"/"90" แบบรู้ค่า แล้ววาด

```js
t("card renders with 2 rows × 3 columns and the fixed labels", /* หา data-dj-section/ id djHaOut · 'ทำแล้ว' · 'ไม่ทำ / ไม่ได้ตอบ (ถ้าทำจะได้)' · '1 สัปดาห์' '1 เดือน' '3 เดือน' */);
t("each cell equals HomeActionEngine.summary(allTime) for that horizon (avg % and n)", /* คำนวณคาดด้วย HA.summary(...) ในเทสต์ แล้วเทียบข้อความ fmtPct 1 ตำแหน่ง */);
t("7 and 30 equal the Home box's windowed summary when every entry is within 90 days", /* HA.summary ไม่มี allTime เทียบกับช่อง */);
t("a horizon with no scored rows shows 'รอผล' · footer counts pending at 3 months", /* … */);
t("deleted home-action entry is not counted (Review Focus 2)", /* n รวมไม่รวมตัวที่ลบ */);
t("partial money base says 'จาก k รายการที่มีฐานเงิน'", /* buy+done ไม่มีฐาน → followed moneyN.THB < n */);
t("USD money is shown separately from THB (never added together)", /* … */);
t("locked privacy: no ฿/USD amounts in the card ('XXX' instead) and no money in title/aria-label (Review Focus 4)", /* privacyLocked = true แล้ววาด */);
t("outcomes loading → 'กำลังดึงราคา…' and no NaN/undefined; card redraws when outcomes arrive (Review Focus 3)", /* state.outcomesLoading true → false + เรียกเส้นทางวาดหลังราคามา */);
t("no home-action entries → the empty-state sentence", /* … */);
t("HomeActionEngine missing → 'โหลดตัวคำนวณสรุปไม่สำเร็จ' and the rest of the page still renders", /* ลบ win.HomeActionEngine ชั่วคราว */);
t("CSS: dj-hao classes exist, colours only via var(), card scrolls or stacks at ≤600px", /* อ่าน decision-journal.css */);
```

พร้อมแก้ pin ใน "body scripts exact order and versions" ให้เป็นลำดับ: `technical-indicators` · `decision-journal-engine (dj-5)` · `home-action-engine (20261119-ha-2)` · `decision-journal-page (20261119-dj-7)` · `big-cache` · `app-navigation (nav-32)` และ pin CSS ถ้ามี

- [ ] **Step 2: รันให้เห็นว่าล้ม**

Run: `node scripts/decision-journal-view-test.js`
Expected: FAIL ที่ข้อการ์ดทั้งหมด

- [ ] **Step 3: สร้าง `renderHaOutcome()` + CSS + โหลดสคริปต์ + bump เวอร์ชัน** ตาม Interfaces · สถานะเดิมของหน้า (สถิติ · บันทึกทั้งหมด · ฟอร์ม) ต้องไม่ขยับ

- [ ] **Step 4: รันให้ผ่าน + ทุกชุด**

Run: `node scripts/decision-journal-view-test.js && node scripts/site-integrity-test.js` แล้ว `for f in scripts/*-test.js; do node "$f" >/dev/null 2>&1 || echo "FAIL $f"; done`
Expected: ผ่านทั้งหมด · ไม่มี FAIL

- [ ] **Step 5: ตรวจหน้าจริงใน Chrome (1440 และ 390)** — probe CDP ใน scratchpad: ดัก `/api/portfolio?doc=journal` ทั้ง GET/PUT ด้วยเอกสารสมมุติในหน่วยความจำ (ห้ามถึงเอกสาร Journal จริง) · `/api/ohlc` ตอบแท่งสมมุติให้ครบ 7/30/90 วัน · non-GET อื่นใต้ `/api` → 403 · ซ่อนแค่ `#portfolio-auth-overlay` ห้ามปลด privacy · timeout ทุกคำสั่ง · ตรวจ: การ์ดขึ้นต่อจากสถิติ ตัวเลขตรงกับที่คิดใน Node · แถวจากกล่องขึ้น "ถือต่อ"/"ไม่ทำอะไร" ตามคำตอบ · 390px ไม่ล้นจอ · ไม่มี console error · ถ่ายภาพไว้ใน scratchpad

- [ ] **Step 6: ไม่ commit**
