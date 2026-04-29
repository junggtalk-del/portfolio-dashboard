# Deploy Live With Supabase

โปรเจ็คนี้ใช้ Supabase เป็น database กลาง เพื่อให้เปิดเว็บได้หลายเครื่องหลัง login

## Step 1: เปิด Supabase Project

เข้า Supabase project ที่คุณต้องการใช้

## Step 2: รัน SQL เพื่อสร้าง schema แยก

ไปที่:

```text
SQL Editor -> New query
```

เปิดไฟล์นี้ในเครื่อง:

```powershell
notepad "C:\Users\jung\OneDrive\Documents\New project\supabase\schema.sql"
```

copy SQL ทั้งหมดไปวางใน Supabase SQL Editor แล้วกด `Run`

SQL นี้จะสร้าง schema แยกชื่อ:

```text
portfolio_dashboard
```

และสร้างตาราง:

```text
portfolio_dashboard.portfolio_quarters
portfolio_dashboard.portfolio_assets
```

พร้อม Row Level Security เพื่อให้แต่ละ user เห็นเฉพาะข้อมูลของตัวเอง

## Step 3: เปิด schema ให้ Supabase API ใช้ได้

ไปที่:

```text
Project Settings -> API
```

หา section:

```text
Exposed schemas
```

เพิ่ม schema นี้เข้าไป:

```text
portfolio_dashboard
```

ถ้ามี `public` อยู่แล้ว ให้คงไว้ได้ แล้วเพิ่ม `portfolio_dashboard` ต่อท้าย

## Step 4: ตั้งค่า Auth

ไปที่:

```text
Authentication -> Providers -> Email
```

เปิด Email provider

ถ้าต้องการให้ login ได้ทันทีง่ายๆ ในช่วงทดสอบ ให้ปิด email confirmation ชั่วคราวได้ที่:

```text
Authentication -> Providers -> Email -> Confirm email
```

ถ้าเปิด Confirm email ไว้ ผู้ใช้ต้องกดยืนยันอีเมลก่อน login

## Step 5: เอา Supabase URL และ anon key มาใส่ในเว็บ

ไปที่:

```text
Project Settings -> API
```

copy:

```text
Project URL
anon public key
```

จากนั้นเปิดไฟล์:

```powershell
notepad "C:\Users\jung\OneDrive\Documents\New project\public\config.js"
```

ใส่ค่าแบบนี้:

```js
window.PORTFOLIO_CONFIG = {
  SUPABASE_URL: "https://YOUR_PROJECT_REF.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_KEY",
  SUPABASE_SCHEMA: "portfolio_dashboard"
};
```

ห้ามใช้ `service_role key` ใน frontend

## Step 6: ทดสอบในเครื่อง

เปิดเว็บ:

```powershell
cd "C:\Users\jung\OneDrive\Documents\New project"
npm start
```

เข้า:

```text
http://localhost:4173
```

ลองสมัคร/เข้าสู่ระบบ แล้วเพิ่มข้อมูลพอร์ต

## Step 7: Deploy ขึ้น live

### Netlify

ตั้งค่า:

```text
Publish directory: public
```

ไฟล์ `netlify.toml` ถูกเตรียมไว้แล้ว

### Vercel

สามารถ import repo เข้า Vercel ได้ โดยมี `vercel.json` เตรียมไว้แล้ว

## หมายเหตุ

`SUPABASE_ANON_KEY` เป็น public key ที่ใช้ใน browser ได้ ความปลอดภัยหลักมาจาก Row Level Security ใน `supabase/schema.sql`
