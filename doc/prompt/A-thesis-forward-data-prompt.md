# Prompt A — ชั้นข้อมูล: เพิ่ม forwardView เข้า schema + skill

รัน prompt นี้ **ก่อน** Prompt B เสมอ วางทั้งบล็อกให้ Claude Code ได้เลย

---

## บริบท

โปรเจกต์นี้มี skill `/thesis-update` เป็นเจ้าของ data pipeline ของหน้า `/thesis`
ไฟล์ที่เกี่ยวข้อง: `public/thesis-data.js` (curated KB) · `schema.json` (ในโฟลเดอร์ skill) · `SKILL.md` (ในโฟลเดอร์ skill) · `scripts/thesis-smoke-test.js`

## งาน

เพิ่ม curated block ใหม่ชื่อ `forwardView` เข้า schema แล้วแก้ `SKILL.md` ให้ pipeline เติมข้อมูลนี้ได้
งานนี้คือ **ชั้นข้อมูลล้วน ๆ ห้ามแตะ UI** — การแสดงผลเป็นงานของ Prompt B

---

## กติกาบังคับ

- `forwardView` ต้องเป็น **top-level block ใหม่** ระดับเดียวกับ `fundamentals` / `competitive` / `revenueQuality` / `whatChanged`
- **ห้ามเพิ่มคีย์เข้า `fundamentals`** (ต้องคง 10 คีย์เดิม) และ **ห้ามเพิ่มคีย์เข้า `competitive.factors`** (ต้องคง 8 คีย์เดิม)
- `forwardView` ต้องเป็น **optional** — ticker ที่ยังไม่มีบล็อกนี้ต้องทำงานได้ปกติ smoke test เดิมต้องไม่พัง
- ค่าประมาณต้องนำหน้าด้วย `~` เสมอ · **ห้ามมโนตัวเลข** หาไม่เจอให้เว้นว่าง ไม่ใช่เดา
- ห้ามใช้คำ Buy/Sell/ควรซื้อ/ควรขาย ในทุก field
- ภาษาไทยธรรมชาติใน field ที่เป็นข้อความ (ตัวเลข/ticker/ชื่อ metric เป็นอังกฤษได้)
- **ห้าม commit** จนกว่าผู้ใช้สั่ง "put git"

---

## โครงสร้าง forwardView ที่ต้องเพิ่มเข้า schema.json

```
forwardView: {
  asOf: "YYYY-MM",              // ของบล็อกนี้โดยเฉพาะ — ไม่ใช่ asOf ของบริษัท
                                 // consensus เก่าเร็วกว่าข้อมูลโครงสร้าง จึงต้องแยกประทับ

  estimateHistory: [             // APPEND-ONLY — ดูกติกาด้านล่าง
    { asOf: "YYYY-MM", fy: "FY2026", eps: 22.1, revenue: 218 },
    { asOf: "YYYY-MM", fy: "FY2026", eps: 22.8, revenue: 224 }
  ],

  guidanceTrack: [               // ไตรมาสใหม่สุดอยู่บนสุด สูงสุด 12 แถว
    {
      quarter: "2026Q2",
      metric: "revenue",         // revenue | eps | opex | capex | margin
      guided: "~$47-50B",        // ข้อความ guidance ตามที่บริษัทประกาศ
      actual: "~$49.2B",
      result: "beat",            // beat | inline | miss | noGuidance
      magnitudePct: 1.4          // % ห่างจากจุดกึ่งกลางของช่วง guidance
                                 // inline = อยู่ในช่วง ±1% ของจุดกึ่งกลาง
    }
  ],

  consensus: [                   // ปีบัญชีข้างหน้าเท่านั้น
    { fy: "FY2026", revenue: 232, eps: 26.5, confidence: "high" },
    { fy: "FY2027", revenue: 261, eps: 30.1, confidence: "medium" }
  ],

  note: ""                       // ข้อสังเกตภาษาไทย 1-2 ประโยค เช่น สาเหตุที่ consensus
                                 // ถูกปรับ หรือ guidance เปลี่ยนวิธีให้
}
```

### กติกา APPEND-ONLY ของ estimateHistory (สำคัญที่สุด)

นี่เป็น pattern ใหม่ที่ขัดกับโหมด refresh เดิมของ skill — ต้องเขียนไว้ใน `SKILL.md` ให้ชัด:

- โหมด refresh **ต่อท้ายหนึ่งแถวต่อการรันหนึ่งครั้ง ห้ามแก้หรือลบแถวเดิมเด็ดขาด**
- ถ้า `asOf` ของแถวใหม่ซ้ำกับแถวล่าสุด ให้ **แทนที่แถวนั้นแถวเดียว** (กันการรันซ้ำในเดือนเดียวกัน)
- เมื่อ consensus เปลี่ยนปีอ้างอิง (เช่นเลื่อนจาก FY2026 ไป FY2027) ให้เริ่ม `fy` ใหม่ต่อท้าย โดยยังคงแถว `fy` เก่าไว้ทั้งหมด
- เก็บได้สูงสุด 16 แถว เกินแล้วตัดแถวเก่าสุดออก

เหตุผล: revision trend ต้องสะสมเองข้ามไตรมาส ถ้าเขียนทับข้อมูลจะหายทุกครั้งที่รัน

---

## แก้ SKILL.md — เพิ่มเข้าไปในขั้นตอนเดิม

### ขั้นตอน 2 (ค้นข้อมูล) เพิ่มรายการค้น

- consensus EPS และ revenue สำหรับปีบัญชีถัดไป 2 ปี พร้อมระดับความมั่นใจ
- **guidance ที่บริษัทให้ไว้ย้อนหลัง 12 ไตรมาส** และผลจริงของแต่ละไตรมาส — ค้นจาก earnings press release / IR page / earnings call transcript ของแต่ละไตรมาส
- ถ้าค้นได้ไม่ครบ 12 ไตรมาส ให้เก็บเท่าที่ยืนยันได้ **ห้ามเติมให้ครบด้วยการเดา**
- ไตรมาสที่บริษัทไม่ได้ให้ guidance สำหรับ metric นั้น ให้บันทึก `result: "noGuidance"` ไม่ใช่ข้ามแถว

### ขั้นตอน 3 (ร่าง config) เพิ่มกติกา

- `guidanceTrack` เรียงไตรมาสใหม่→เก่า ห้ามมีไตรมาสซ้ำในคู่ (quarter, metric) เดียวกัน
- `magnitudePct` คำนวณจากจุดกึ่งกลางของช่วง guidance ถ้า guidance เป็นค่าเดี่ยวใช้ค่านั้นตรง ๆ
- `result` ต้องสอดคล้องกับ `magnitudePct` เสมอ — `inline` เมื่ออยู่ในช่วง ±1%
- `consensus.confidence` ใช้ high เมื่อมีสำนักวิเคราะห์อ้างอิงตรงกันหลายแห่ง · medium เมื่ออ้างอิงแหล่งเดียว · low เมื่อเป็นการประมาณจาก guidance ของบริษัทเอง
- `forwardView.asOf` ต้องเท่ากับหรือใหม่กว่า `asOf` ของบริษัท

### ขั้นตอน 5 (validate) เพิ่มการตรวจ

- `forwardView.asOf` รูปแบบ `YYYY-MM` และ ≥ `asOf` ของบริษัท
- `estimateHistory` ≤ 16 แถว · `asOf` เรียงจากเก่าไปใหม่ · ไม่มี `asOf` ซ้ำ
- **ตรวจ append-only**: เทียบกับไฟล์ก่อนแก้ แถวเดิมทุกแถวต้องมีค่าเท่าเดิมทุก field ยกเว้นแถวที่ `asOf` ตรงกับเดือนปัจจุบัน
- `guidanceTrack` ≤ 12 แถว · ไม่มีคู่ (quarter, metric) ซ้ำ · ทุกแถวมี `result` ที่ถูกต้อง
- ทุกแถวที่ `result` ไม่ใช่ `noGuidance` ต้องมี `magnitudePct` เป็นตัวเลข
- `consensus[].fy` ต้องเป็นปีที่ใหม่กว่าปีบัญชีล่าสุดในข้อมูลจริง — ห้ามทับปีที่มีตัวเลข actual แล้ว

---

## Backfill

หลังแก้ schema + skill เสร็จ **อย่าเพิ่ง backfill เอง** ให้รายงานว่า ticker ไหนบ้างที่ยังไม่มี `forwardView` แล้วรอผู้ใช้สั่งว่าจะรัน `/thesis-update` ทีละตัวเมื่อไหร่

---

## Validate ก่อนส่งงาน

- `node --check public/thesis-data.js`
- `node scripts/thesis-smoke-test.js` ผ่านทั้งหมด — ticker ที่ไม่มี `forwardView` ต้องยังทำงานได้
- `node -e "..."` compute ผ่านสำหรับ ticker เดิมอย่างน้อย 1 ตัว
- `git diff` ต้องไม่มีไฟล์ใน `public/` นอกจาก `thesis-data.js` (และเฉพาะเมื่อมีการ backfill จริง)
- รายงานว่าแก้ `schema.json` และ `SKILL.md` ตรงไหนบ้าง

## ส่งงาน

สรุปให้ผู้ใช้: schema ที่เพิ่ม · กติกา append-only ที่เขียนเข้า skill · ticker ที่รอ backfill · ย้ำว่า **ยังไม่ commit**
