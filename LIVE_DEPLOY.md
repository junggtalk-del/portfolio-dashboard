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
APP_PASSWORD=<YOUR_STRONG_APP_PASSWORD>
```

`service_role key` ต้องอยู่ใน Vercel Environment Variables เท่านั้น ห้ามใส่ในไฟล์ frontend

### Bitcoin Monitor — ข้อมูลฟรีทั้งหมด (ไม่ต้องใช้ API key)

หน้า **Bitcoin Monitor** (`/bitcoin-monitor`) ใช้ **แหล่งข้อมูลฟรีล้วน ๆ ไม่ต้องตั้ง API key ใด ๆ**:

- **Binance spot** → ราคา + EMA12/26 + SMA200 + RSI14 + Volume Ratio 5D (near real-time)
- **Binance Futures** → Funding Rate, Open Interest, Taker Buy/Sell, Long/Short Ratio
- **Coin Metrics Community** → MVRV Ratio + MVRV Z-Score + NUPL + **Realized Price Proxy** (รายวัน D-1/D-2)
- **Blockchain.com** → Hashrate, Difficulty, **Miner Revenue Multiple Proxy**
- **DefiLlama** → มูลค่า stablecoin รวม → **SSR Proxy**
- **Alternative.me** → ดัชนี Fear & Greed (sentiment)

ข้อมูล **STH/LTH/SOPR แบบ exact** ต้องใช้ผู้ให้บริการ on-chain แบบเสียเงิน — หน้านี้จึงใช้ **proxy จากข้อมูลฟรี** แทน (ป้ายกำกับ "proxy" ชัดเจนทุกการ์ด) ไม่มีการ์ดว่าง

ทุกการ์ดแสดง **แหล่งข้อมูล + ความสด (near real-time / D-0 / D-1 / D-2) + exact vs proxy** และคะแนน Buy Zone (Technical 35 · Cycle 30 · Holder/Sentiment 20 · Free Stress 15) คิดจาก % ข้อมูลที่เชื่อมต่อ (renormalised ไม่กดคะแนนเพราะข้อมูลขาด)

> **(ตัวเลือกขั้นสูง)** ถ้าตั้ง `GLASSNODE_API_KEY` / `CRYPTOQUANT_API_KEY` ฝั่งเซิร์ฟเวอร์ หน้าเพจจะใช้ค่า STH/LTH/SOPR exact แทน proxy โดยอัตโนมัติ — แต่ **ไม่จำเป็น** และไม่ใช่ค่าเริ่มต้น · key อ่านจาก `process.env` เท่านั้น ไม่เคยส่งกลับ frontend · serverless functions ยังอยู่ที่ 12/12 (provider ใหม่ทั้งหมดเป็น lib ไม่ใช่ฟังก์ชัน)

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

ในเครื่อง local จะยังใช้ข้อมูลใน browser เป็นหลัก ส่วนบน Vercel จะใช้ password `<YOUR_STRONG_APP_PASSWORD>` ผ่าน serverless function

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

ระบบนี้ไม่ใช้ Supabase email login แล้ว ผู้ใช้ต้องกรอก password `<YOUR_STRONG_APP_PASSWORD>` ก่อนถึงจะเห็นหน้า Dashboard จากนั้น Vercel Function จะอ่าน/เขียนข้อมูลใน Supabase ให้

ถ้าต้องการเปลี่ยน password ให้แก้ค่า `APP_PASSWORD` ใน Vercel แล้ว redeploy

## ⚠️ Security checklist (สำคัญ — ทำก่อนใช้งานจริง)

1. **ตั้ง `APP_PASSWORD` เป็นค่าสุ่มที่ยาวและเดายาก** (อย่างน้อย 16 ตัวอักษร) เก็บไว้เฉพาะใน Vercel Environment Variables และไฟล์ `.env` ในเครื่องเท่านั้น — ห้ามใส่ในโค้ด frontend หรือเอกสารใด ๆ
2. **`SUPABASE_SERVICE_ROLE_KEY` คือกุญแจสิทธิ์เต็มของฐานข้อมูล** — ถ้าเคยหลุด (เช่น เผลอ paste, commit, หรือแชร์) ให้ **rotate ทันที** ที่ Supabase → Settings → API → "Reset/Roll service_role key" แล้วอัปเดตค่าใหม่ทั้งใน Vercel และ `.env`
3. ทุก endpoint ที่อ่าน/เขียนข้อมูลส่วนตัว (`/api/portfolio`, `/api/ai-universe`, `/api/portfolio-holdings`) **ตรวจรหัสผ่านฝั่งเซิร์ฟเวอร์แล้ว** (ผ่าน `lib/auth.js`) — ไม่มีรหัส = 401
4. หน้าเว็บไม่ฝังรหัสผ่านอีกต่อไป — ผู้ใช้ต้องล็อกอินผ่าน overlay (`public/api-auth.js`) ซึ่งเก็บรหัสไว้ใน `sessionStorage` ของ session นั้นเท่านั้น
