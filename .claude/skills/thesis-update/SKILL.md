---
name: thesis-update
description: อัปเดต/เพิ่มข้อมูล curated ของบริษัทในหน้า Investment Thesis (/thesis) — ค้นงบไตรมาสล่าสุดจากเว็บ แล้วแก้ public/thesis-data.js + ทดสอบ + bump version. Use when the user says "/thesis-update TICKER", "อัปเดต thesis ของ X", "เพิ่มหุ้น X เข้า thesis" or after a company reports earnings.
---

# /thesis-update <TICKER>

อัปเดต (refresh) หรือเพิ่ม (add-new) ข้อมูล curated ของบริษัทหนึ่งตัวใน Investment Thesis knowledge base.

หลักการตายตัว:
- ข้อมูล curated = "structural judgment" ประทับ asOf — ห้ามมโนตัวเลขแม่นๆ ใช้ "~" กับค่าประมาณเสมอ
- runtime ของเว็บเป็น deterministic — งานนี้คือ data pipeline ผ่าน Claude เท่านั้น
- ห้ามใช้คำ Buy/Sell ในเนื้อหา · ภาษาไทยธรรมชาติ (ชื่อผลิตภัณฑ์/ticker เป็นอังกฤษได้)
- **ห้าม commit** — รอผู้ใช้สั่ง "put git"

## ขั้นตอน

### 1. โหมด
อ่าน `public/thesis-data.js` (require ผ่าน Node หรือ Grep หา ticker) —
- TICKER มีอยู่ → โหมด **refresh** (อัปเดตเฉพาะส่วนที่เปลี่ยน + whatChanged + asOf)
- ไม่มี → โหมด **add-new** (ร่าง config เต็มตาม `schema.json` ในโฟลเดอร์นี้)

### 2. ค้นข้อมูลงบล่าสุด (WebSearch + WebFetch)
ต้องยืนยันว่าเป็นงบภายใน ~3 เดือน (บริษัท US มักรายงาน ม.ค.-ก.พ. / เม.ย.-พ.ค. / ก.ค.-ส.ค. / ต.ค.-พ.ย.):
- ผลไตรมาสล่าสุด: revenue/EPS (แยก GAAP vs one-time), segment breakdown, margins
- **วันสิ้นงวดจริงของไตรมาส** (`history.quarters[].endDate` = `YYYY-MM-DD`) — ห้ามอนุมานจาก endYm เพราะหลายบริษัทไม่ได้จบสิ้นเดือนปฏิทิน (เช่น NVDA จบ 26 เม.ย. / 26 ก.ค.) · หาไม่เจอให้เว้นไว้ หน้าเว็บจะแสดง `~MM/YY` เอง
- **รายการพิเศษใน EPS** (`history.quarters[].epsNote`): ถ้าไตรมาสไหน EPS มี one-time item (กำไรจากเงินลงทุน / ด้อยค่า / ภาษีย้อนหลัง) ให้เขียนอธิบาย 1 บรรทัดพร้อมตัวเลขผลกระทบต่อหุ้น + ค่าที่ตัดรายการออกแล้ว — กันคนอ่านเทียบ EPS ข้ามไตรมาสผิด
- Guidance ที่เปลี่ยน, CapEx, backlog/AI metrics เฉพาะบริษัท
- ปฏิกิริยาราคา + valuation ปัจจุบัน (forward P/E, market cap)
- **วันประกาศงบครั้งถัดไป** (สำหรับ `nextEarnings` — ป้ายเตือนโหลดใหม่): ค้นจาก IR page / nasdaq earnings calendar / marketbeat — ถ้าบริษัทประกาศวันแน่แล้วใช้วันจริง ถ้ายังไม่ประกาศประมาณจาก cadence (งบก่อน + ~91 วัน)
- **forwardView** (ชั้นข้อมูลมองไปข้างหน้า):
  - consensus EPS และ revenue สำหรับ**ปีบัญชีถัดไป 2 ปี** พร้อมระดับความมั่นใจ (หลายสำนักวิเคราะห์ตรงกัน = high · อ้างอิงแหล่งเดียว = medium · ประมาณจาก guidance ของบริษัทเอง = low)
  - **ต้องระบุว่า consensus ที่พบเป็น GAAP หรือ non-GAAP และรวม SBC หรือไม่** (field `basis`) — หน้าเว็บใช้ตัดสินว่าต่อเส้นคาดเชื่อมกับข้อมูลจริงบนกราฟได้หรือไม่
  - **guidance ที่บริษัทให้ไว้ย้อนหลัง 12 ไตรมาส** และผลจริงของแต่ละไตรมาส — ค้นจาก earnings press release / IR page / earnings call transcript ของแต่ละไตรมาส
  - ถ้าค้นได้ไม่ครบ 12 ไตรมาส ให้เก็บเท่าที่ยืนยันได้ **ห้ามเติมให้ครบด้วยการเดา**
  - ไตรมาสที่บริษัทไม่ได้ให้ guidance สำหรับ metric นั้น ให้บันทึก `result: "noGuidance"` ไม่ใช่ข้ามแถว
- โหมด add-new: เพิ่มข้อมูลโครงสร้าง — business model, moat, AI strategy pillars, ความเสี่ยง

### 3. ร่าง/แก้ config ตาม schema.json (โฟลเดอร์นี้)
กติกาสำคัญ:
- `fundamentals`: 10 รายการ คีย์ตายตัวตามลำดับ: revenueGrowth, epsGrowth, fcf, margin, roic, cash, debt, dilution, capitalAllocation, valuation (valuation score = ความน่าสนใจของราคา — ถูก=สูง)
- `competitive.factors`: 8 คีย์ตายตัว: marketLeadership, techLeadership, executionSpeed, switchingCost, ecosystem, developerAdoption, customerLockin, moat
- `revenueQuality.segments`: 3-6 segment จริง sharePct รวม ~100 (±10)
- `whatChanged`: 4-6 รายการ ไตรมาสล่าสุด vs ไตรมาสก่อนหน้า (prev → now + direction)
- `layer`: หนึ่งใน model, cloud, gpu, networking, memory, foundry, equipment, power, utility, enterprise (ตาม AI Rotation Engine)
- `asOf`: "YYYY-MM" = เดือนปัจจุบัน
- `nextEarnings` (optional แต่ควรใส่เสมอ): วันประกาศงบครั้งถัดไป — `"YYYY-MM-DD"` ถ้าบริษัทประกาศวันแน่แล้ว (confirmed) · `"YYYY-MM"` ถ้ายังไม่ประกาศ (estimated เดือน — ระบบเติม `~` ให้เอง) · ความละเอียด = ระดับความมั่นใจ ตัวนี้ขับป้าย heads-up ก่อนงบ + เตือนโหลดใหม่หลังงบออก
- ทุก score (0-100) ต้อง defensible จากข้อความ why ข้างๆ · dilution trend ใช้ความหมาย "ทิศทางความเป็นมิตรต่อผู้ถือหุ้น" (แย่ลง=down)
- โหมด refresh: คงข้อความเดิมที่ยังจริง แก้เฉพาะ current/trend/score/why ที่งบใหม่เปลี่ยน + เขียน whatChanged ใหม่ทั้งชุด
- `forwardView` (**optional top-level block** ระดับเดียวกับ fundamentals — ticker ที่ยังไม่มีต้องทำงานได้ปกติ · **ห้ามเพิ่มคีย์เข้า fundamentals/competitive.factors แทน**): `{ asOf, estimateHistory, guidanceTrack, consensus, note }` ตาม schema.json
  - `forwardView.asOf` = เดือนที่อัปเดตบล็อกนี้ ต้อง**เท่ากับหรือใหม่กว่า** `asOf` ของบริษัท (consensus เก่าเร็วกว่าข้อมูลโครงสร้าง จึงแยกประทับ)
  - `guidanceTrack` เรียงไตรมาส**ใหม่→เก่า** สูงสุด 12 แถว ห้ามมีคู่ (quarter, metric) ซ้ำ
  - `magnitudePct` คำนวณจาก**จุดกึ่งกลางของช่วง guidance** — ถ้า guidance เป็นค่าเดี่ยวใช้ค่านั้นตรง ๆ · `result` ต้องสอดคล้องกับ `magnitudePct` เสมอ: `inline` = อยู่ในช่วง ±1% ของจุดกึ่งกลาง
  - `consensus` เฉพาะ**ปีบัญชีข้างหน้า**เท่านั้น (ห้ามทับปีที่มีตัวเลข actual แล้ว) · `confidence` ตามเกณฑ์ในขั้นตอน 2
  - `consensus[].basis` = `"GAAP"` | `"non-GAAP"` | `"unknown"` — **ถ้าแหล่งข้อมูลไม่ระบุฐาน ให้ใส่ `"unknown"` ห้ามเดา** (ไม่ใส่ field = ระบบถือเป็น unknown)
  - `note`: ข้อสังเกตภาษาไทย 1-2 ประโยค เช่น สาเหตุที่ consensus ถูกปรับ หรือ guidance เปลี่ยนวิธีให้

#### กติกา APPEND-ONLY ของ `estimateHistory` (สำคัญที่สุด — ขัดกับโหมด refresh ปกติ)

โหมด refresh ปกติเขียนทับ field ที่เปลี่ยน แต่ `estimateHistory` เป็น **revision trail สะสม ห้ามเขียนทับ**:
- ต่อท้าย**หนึ่งแถวต่อการรันหนึ่งครั้ง** — **ห้ามแก้หรือลบแถวเดิมเด็ดขาด**
- ถ้า `asOf` ของแถวใหม่**ซ้ำกับแถวล่าสุด** ให้**แทนที่แถวนั้นแถวเดียว** (กันการรันซ้ำในเดือนเดียวกัน)
- เมื่อ consensus เปลี่ยนปีอ้างอิง (เช่นเลื่อนจาก FY2026 ไป FY2027) ให้เริ่ม `fy` ใหม่ต่อท้าย โดย**ยังคงแถว `fy` เก่าไว้ทั้งหมด**
- เก็บได้สูงสุด **16 แถว** เกินแล้วตัดแถวเก่าสุดออก

เหตุผล: revision trend ต้องสะสมเองข้ามไตรมาส ถ้าเขียนทับข้อมูลจะหายทุกครั้งที่รัน

### 4. เขียนกลับ thesis-data.js (Node pattern — heredoc ผ่าน Bash, ใช้ path แบบ forward-slash)
```js
const fs = require("fs");
delete require.cache[require.resolve("./public/thesis-data.js")];
const DATA = require("./public/thesis-data.js");
DATA.companies["TICKER"] = { /* config ใหม่/แก้แล้ว */ };
const header = '(function () {\n  "use strict";\n  // ============================================================\n  // Investment Thesis — CURATED knowledge base. Structural judgment\n  // plane of the Thesis Engine (fundamentals / revenue quality / AI\n  // execution / moat / capital allocation / QoQ changes / risks).\n  // NOT live data — see per-company asOf stamps. Live overlays come\n  // from the running system at compute time.\n  // ============================================================\n  var ThesisData = ';
const footer = ';\n  if (typeof window !== "undefined") window.ThesisData = ThesisData;\n  if (typeof module !== "undefined" && module.exports) module.exports = ThesisData;\n})();\n';
fs.writeFileSync("public/thesis-data.js", header + JSON.stringify(DATA, null, 2) + footer, "utf8");
```
(แก้เฉพาะบาง field ก็ mutate object แล้ว rewrite ทั้งไฟล์แบบเดียวกัน — อย่าใช้ sed/regex กับ JSON)

### 5. Validate (ต้องผ่านทุกข้อ)
- `node --check public/thesis-data.js`
- `node scripts/thesis-smoke-test.js` ผ่านทั้งหมด
- `node -e "const TE=require('./public/thesis-engine');const D=require('./public/thesis-data');const o=TE.compute('TICKER',{},{data:D,mega:null,regime:null,R:null});if(!o.available)throw new Error(o.reason);console.log(o.thesis.score,o.thesis.status.label,o.asOf)"`
- segments sharePct รวม 100±12 · fundamentals ครบ 10 คีย์ · factors ครบ 8 คีย์
- `nextEarnings` (ถ้าใส่) รูปแบบถูก `YYYY-MM` หรือ `YYYY-MM-DD` และเป็นวันในอนาคต/ไตรมาสถัดไป (ใหม่กว่า asOf)
- `forwardView` (ถ้ามี):
  - `forwardView.asOf` รูปแบบ `YYYY-MM` และ ≥ `asOf` ของบริษัท
  - `estimateHistory` ≤ 16 แถว · `asOf` เรียงจากเก่าไปใหม่ · ไม่มี `asOf` ซ้ำ
  - **ตรวจ append-only**: เทียบกับไฟล์ก่อนแก้ — แถวเดิมทุกแถวต้องมีค่าเท่าเดิมทุก field ยกเว้นแถวที่ `asOf` ตรงกับเดือนปัจจุบัน
  - `guidanceTrack` ≤ 12 แถว · ไม่มีคู่ (quarter, metric) ซ้ำ · ทุกแถวมี `result` ∈ beat/inline/miss/noGuidance
  - ทุกแถวที่ `result` ไม่ใช่ `noGuidance` ต้องมี `magnitudePct` เป็นตัวเลข
  - `consensus[].fy` ต้องเป็นปีที่ใหม่กว่าปีบัญชีล่าสุดในข้อมูลจริง — ห้ามทับปีที่มีตัวเลข actual แล้ว
  - `consensus[].basis` (ถ้าใส่) ต้องเป็นหนึ่งใน `"GAAP"` / `"non-GAAP"` / `"unknown"` เท่านั้น

### 6. Bump + เปิดดู
- bump `thesis-data.js?v=` ใน `public/thesis.html` (รูปแบบ `YYYYMMDD-th-N` ถัดไป)
- เปิด http://localhost:4173/thesis ให้ผู้ใช้ตรวจ (ป้ายอายุข้อมูลของตัวนั้นควรเป็นสีเขียว)
- สรุปให้ผู้ใช้: อะไรเปลี่ยนบ้าง (thesis score เดิม→ใหม่, whatChanged หลัก) · ย้ำว่ายังไม่ commit
