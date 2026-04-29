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
portfolio_dashboard.app_state
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

## Step 4: ตั้งค่า Vercel Environment Variables

ไปที่ Supabase:

```text
Project Settings -> API
```

copy:

```text
Project URL
service_role key
```

จากนั้นไปที่ Vercel:

```text
Project -> Settings -> Environment Variables
```

เพิ่มค่า:

```text
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
SUPABASE_SCHEMA=portfolio_dashboard
APP_PASSWORD=jung12345
```

`service_role key` ต้องอยู่ใน Vercel Environment Variables เท่านั้น ห้ามใส่ในไฟล์ frontend

## Step 5: ทดสอบในเครื่อง

เปิดเว็บ:

```powershell
cd "C:\Users\jung\OneDrive\Documents\New project"
npm start
```

เข้า:

```text
http://localhost:4173
```

ในเครื่อง local จะยังใช้ข้อมูลใน browser เป็นหลัก ส่วนบน Vercel จะใช้ password `jung12345` ผ่าน serverless function

## Step 6: Deploy ขึ้น live

### Netlify

ตั้งค่า:

```text
Publish directory: public
```

ไฟล์ `netlify.toml` ถูกเตรียมไว้แล้ว

### Vercel

สามารถ import repo เข้า Vercel ได้ โดยมี `vercel.json` เตรียมไว้แล้ว

## หมายเหตุ

ระบบนี้ไม่ใช้ Supabase email login แล้ว ผู้ใช้ต้องกรอก password `jung12345` ก่อนถึงจะเห็นหน้า Dashboard จากนั้น Vercel Function จะอ่าน/เขียนข้อมูลใน Supabase ให้

ถ้าต้องการเปลี่ยน password ให้แก้ค่า `APP_PASSWORD` ใน Vercel แล้ว redeploy
