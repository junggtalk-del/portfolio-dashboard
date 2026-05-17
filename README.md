# Investment Portfolio Dashboard

แดชบอร์ดสำหรับติดตามพอร์ตการลงทุน แยกข้อมูลรายไตรมาส และรองรับ Supabase สำหรับเปิดใช้งานหลายเครื่อง

## วิธีเปิดใช้งาน

```powershell
npm start
```

จากนั้นเปิดเว็บที่:

```text
http://localhost:4173
```

### Local run (ค่าเริ่มต้นจะใช้ Supabase)

ค่าเริ่มต้นของ local จะบังคับใช้ Supabase เพื่อให้ข้อมูลตรงกับ production:

- ต้องมีไฟล์ `.env` พร้อมค่า Supabase
- ถ้ายังไม่ตั้งค่า ระบบจะตอบ error ที่ `/api/portfolio` เพื่อไม่ให้เผลอใช้ข้อมูล local คนละชุด

### เปิด Local fallback (ใช้เฉพาะตอนทดสอบ)

ถ้าต้องการโหมด local ชั่วคราว ให้เปิด flag:

```env
ENABLE_LOCAL_FALLBACK=true
```

แล้วระบบจะบันทึกข้อมูลไว้ที่ `.local-data/portfolio.json`

## เปิดใช้ Supabase mode

ถ้าต้องการ sync ข้อมูลข้ามเครื่อง ให้สร้างไฟล์ `.env` จากตัวอย่าง `.env.example` แล้วใส่ค่าต่อไปนี้:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_SCHEMA` (ค่าเริ่มต้น `portfolio_dashboard`)
- `APP_PASSWORD`

เมื่อใส่ครบแล้ว restart server (`npm start`) ระบบจะใช้ Supabase ตามปกติ

## วิธีใช้

1. เลือกไตรมาส หรือเพิ่มไตรมาสใหม่จากปีและ Q ที่ต้องการ
2. เลือกประเภทสินทรัพย์
3. กรอกมูลค่าปัจจุบันเป็นบาท
4. กรอก % ที่ลงทุนจริง เพื่อแยกเงินสดแฝง
5. กดเพิ่มเข้าพอร์ต หรือแก้ไขรายการเดิม
6. กดบันทึกไตรมาสนี้เพื่อเก็บ snapshot

บน Vercel ข้อมูลจะ sync กับ Supabase ผ่าน password gate และ Vercel Function โดยใช้ schema `portfolio_dashboard`

## Deploy Live

ตอนนี้แอปรองรับ Supabase สำหรับเปิดใช้งานหลายเครื่องแล้ว ดูขั้นตอนใน:

```text
LIVE_DEPLOY.md
```
