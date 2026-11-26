# Bitcoin Monitor · On-chain Deep Dive สำหรับนักลงทุนระยะยาว — design

2026-11-26 · ผู้ใช้วางคำสั่งเต็ม (8 หัวข้อ) แล้วเลือก "แบบ ก." (ข้อมูลฟรี) + "ลงมือทำได้เลย ใช้ agent หลายตัวช่วยกันทำได้"

## ทำไม
ยกระดับ Deep Dive เดิมให้ช่วยนักลงทุนระยะยาวตัดสินใจ Accumulate / Hold / Reduce Exposure อย่างมีหลักการ —
เน้นต้นทุน (cost basis), พฤติกรรม LTH, มูลค่าตลาด, วัฏจักร · **ห้ามสร้างหน้าใหม่ · ห้ามทำของเดิมเสีย · ห้ามข้อมูลปลอม**

## ของเดิม (audit 2026-11-26)
- Deep Dive 7 การ์ด (MVRV-Z · Realized Price · NUPL · RUP · SOPR · SSR · LTH Supply) กราฟย้อนหลัง + กราฟใหญ่ซ้อนราคา + ป้ายที่มา/วันที่
- แหล่ง: BGeometrics (`public/btc-onchain-live.js`, ดึงจากเบราว์เซอร์, ~4 ปี, ช้า ~7 วัน, โควตา 10/ชม. 15/วัน ต่อ IP, ใช้ 8/วัน)
  · Coin Metrics community (MVRV/ราคา/มูลค่าตลาด ตั้งแต่ 2010, CORS เปิด) · Blockchain.com charts (รายได้นักขุด/ค่าธรรมเนียม, `cors=true`)
- Buy Zone Score (เทคนิค/วัฏจักร/ผู้ถือ/ความเครียด) · Valuation Zone (`cycleZoneOf`) · แท็บ Intelligence (cycle 6 ระยะจากราคา)

## สิ่งที่ผู้ใช้ต้องการ (ย่อจากคำสั่ง)
6 indicators: LTH Realized Price · MVRV Z-Score · LTH-SOPR · LTH Supply / Net Position Change · Realized / Active Investor Price · Puell Multiple
· ตอบ 5 คำถาม (เหนือ/ใต้ต้นทุน LTH · สะสม/ขาย · ขายกำไร/ขาดทุน · ถูก/แพง · ช่วงไหนของวัฏจักร)
· Investment Signal 0–100 + 5 สถานะ (Strong Accumulation · Accumulation · Neutral · Distribution Risk · Overheated / High Risk)
  + คะแนนรายตัว + เหตุผล + แนวโน้มจากช่วงก่อน — สะท้อน "ความน่าสะสม" ไม่ใช่ทำนายราคา · ไม่นับสัญญาณซ้ำจาก metric ที่สัมพันธ์กันสูง
· Historical: เทียบกับราคา · หลายรอบ · พฤติกรรมช่วงก้น/ยอด · ความแม่นยำย้อนหลัง · เลือกช่วงเวลา · point-in-time (ไม่มี look-ahead)
· UI ตาม design เดิม · Data integrity: แหล่งเดิมก่อน · ไม่มี mock · Last Updated + Source · Data Unavailable · ตรวจสูตร/หน่วย

## การตัดสินใจ
- **ข้อมูลฟรี (แบบ ก.)** — กลุ่ม LTH + Active Investor Price ย้อนได้ ~4 ปี (รอบเดียว) · หลายรอบได้เฉพาะ MVRV-Z/Realized (Coin Metrics) + Puell (Blockchain.com) — หน้าเว็บบอกชัด
- BGeometrics เพิ่ม `lth-realized-price` · `lth-sopr` · `true-market-mean` (= Active Investor Price) · Net Position Change คิดเองจาก supply (30 วันนับจากแถวที่ใช้จริง)
  - **แก้หลัง final review:** LTH Supply คงใช้ `supply-profit-lth` + `supply-loss-lth` ที่ตรวจกับของจริงแล้ว (ไม่ย้ายไป `long-term-hodler-supply-btc` ที่ยังไม่เคยเรียกจริง — การ์ดเดิมต้องไม่เปลี่ยน) → **11 ครั้ง/วัน** · ส่งไม่เกิน 10 ครั้งต่อรอบ (เพดานรายชั่วโมง) ครั้งที่ 11 ไปรอบถัดไปเอง ไม่ชน 429
- **Puell Multiple คิดเองจาก Blockchain.com** = (miners-revenue − transaction-fees-usd) ÷ ค่าเฉลี่ย 365 วัน — ไม่ใช้โควตา BGeometrics · ย้อนหลายรอบได้
- **MVRV-Z สำหรับคะแนน/backtest = คิดเองจาก Coin Metrics แบบ point-in-time** (ส่วนเบี่ยงเบนสะสมถึงวันนั้น) — การ์ดเดิมยังแสดงค่า exact ของ BGeometrics
- ข้อมูลใหม่ทุกตัวผ่าน **ช่วงค่าที่เป็นไปได้** (plausibility) — ค่าผิดรูป = Data Unavailable ไม่ใช่ตัวเลขผิด
- **คะแนน 3 กลุ่ม กันนับซ้ำ**: มูลค่าเทียบต้นทุน 40 (MVRV-Z pit · ราคา÷LTH RP · ราคา÷Active Investor — เฉลี่ยในกลุ่ม นับครั้งเดียว) · พฤติกรรม LTH 35 (LTH-SOPR 7 วัน · Net Position 30 วัน) · นักขุด 25 (Puell) · มีไม่ถึง 2 กลุ่ม = ข้อมูลไม่พอ
- สถานะ: ≥80 Strong Accumulation · ≥65 Accumulation · ≥45 Neutral · ≥30 Distribution Risk · <30 Overheated / High Risk
- **แยกจาก Buy Zone Score เดิม (ไม่แตะ)** — Buy Zone รวมจังหวะเทคนิค · Long-term Signal = on-chain ระยะยาวล้วน
- Backtest: "สัญญาณเต็ม 6 ตัว" (~4 ปี) + "สัญญาณแกน" (MVRV-Z pit + Puell, ตั้งแต่ ~2012) · เลื่อนวันตามความช้าข้อมูล (BGeometrics 7 · อื่น 1) · บอกว่าเกณฑ์เป็น in-sample และหน้าต่างผลตอบแทนซ้อนกัน
- จุดก้น/ยอด: คิดจากราคาในแต่ละรอบ halving (2012-11-28 · 2016-07-09 · 2020-05-11 · 2024-04-20) · รอบปัจจุบัน = ชั่วคราว
- "ช่วงไหนของวัฏจักร" ใช้ Valuation Zone + cycle ของ Intelligence ที่มีอยู่ — ไม่คิดซ้ำ

## Approaches
| | | ได้ | เสีย |
|---|---|---|---|
| **A (เลือก)** | โมดูลใหม่แยกไฟล์ (ข้อมูลหลายรอบ · เอนจินคะแนน · panel) + จุดต่อเล็ก ๆ ใน Deep Dive เดิม | ของเดิมไม่ถูกเขียนทับ · ทดสอบแยกได้ · ทำขนานได้ | ไฟล์เพิ่ม 3 ไฟล์ |
| B | เขียนทุกอย่างเพิ่มใน bitcoin-monitor-page.js | ไฟล์น้อย | ไฟล์ 1,500 บรรทัดโตอีกมาก · เสี่ยงทำของเดิมเสีย · ทำขนานไม่ได้ |
| C | ใช้ Glassnode (เสียเงิน) | LTH หลายรอบ | ผู้ใช้เลือกแบบ ก. แล้ว |

## ข้อจำกัด
- ไฟล์ใหม่ใน `public/` เป็น ES5 · ข้อความไทย · ไม่มีคำแนะนำซื้อ/ขาย (สถานะเป็น Accumulation/Distribution ตามที่ผู้ใช้กำหนด)
- **ห้ามยิง bitcoin-data.com ตอนพัฒนา/ทดสอบ** (โควตาเดียวกับ IP ผู้ใช้) — เทสต์ใช้ข้อมูลจำลองที่ระบุชัดว่าจำลอง; Chrome probe ดักทุก request ไป BGeometrics
- ไม่มี serverless function ใหม่ (ชนเพดาน 12) — ข้อมูลใหม่ดึงจากเบราว์เซอร์ตรง (CORS เปิดทั้งคู่)
- series เก็บ IndexedDB (BigCache) เท่านั้น ไม่ใช่ localStorage
- ไม่ commit จนผู้ใช้สั่ง push git
