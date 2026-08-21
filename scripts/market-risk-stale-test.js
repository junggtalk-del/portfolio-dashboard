// Regression guard: เมื่อ provider ดึงข้อมูลสดไม่ได้แล้วตกไปใช้ cache ฝั่งเซิร์ฟเวอร์
// ผู้ใช้ต้อง "เห็น" ว่ามันไม่สด — ไม่ใช่เห็นเลขเก่าเป็นของสด
//
// ทำไมต้องมีเทสต์นี้: ครั้งแรกที่ใส่ instrumentation ตัวบรรทัด "ข้อมูล ณ" ไม่ขึ้นจอเลย
// (ส่ง array ของตัวเลขเข้า asOfLine แทน series object) แต่การเช็คว่า "API ส่ง field มาแล้ว"
// ผ่านหมด — เทสต์ที่ assert ผิดชั้นจึงไม่จับอะไรได้ เทสต์นี้ assert ที่ "ข้อความที่ถึงจอ"
//
// รัน: node scripts/market-risk-stale-test.js
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log("  PASS  " + name); }
  else { fail++; console.log("  FAIL  " + name + (detail != null ? " — " + detail : "")); }
}

// ---- ดึง asOfLine ตัวจริงจากหน้าเว็บมาทดสอบ (ไม่ copy โค้ด) ----
const pageSrc = fs.readFileSync(path.join(ROOT, "public", "market-risk-page.js"), "utf8");
const fnMatch = pageSrc.match(/function asOfLine\(series\)[\s\S]*?\n  }\n/);
if (!fnMatch) { console.error("หา asOfLine ใน market-risk-page.js ไม่เจอ — เปลี่ยนชื่อ/ย้ายไฟล์?"); process.exit(1); }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]); }
const asOfLine = eval("(" + fnMatch[0].replace(/^function asOfLine/, "function") + ")");
const textOf = (html) => String(html).replace(/<[^>]+>/g, "").trim();

const ymd = (ms) => new Date(ms).toISOString().slice(0, 10);
const DAY = 86400000, HOUR = 3600000;
const series = (dates, extra) => Object.assign({ closes: dates.map(() => 52), dates: dates }, extra || {});

console.log("== asOfLine: ต้องบอกวันข้อมูลเสมอ และเตือนเมื่อไม่สด ==");
{
  const live = asOfLine(series([ymd(Date.now())], { src: "LIVE_MARKET_DATA", fetchedAt: new Date(Date.now() - 2 * 60000).toISOString() }));
  check("ข้อมูลสด → บอกวัน + เวลาที่เซิร์ฟเวอร์ดึง ไม่มี ⚠", /ข้อมูล ณ/.test(live) && /เซิร์ฟเวอร์ดึงเมื่อ/.test(live) && !/⚠/.test(live), textOf(live));
}
{
  const cached = asOfLine(series([ymd(Date.now() - 6 * DAY)], {
    src: "SERVER_CACHED_DATA", srvError: "Yahoo request failed (429)", fetchedAt: new Date(Date.now() - 8 * HOUR).toISOString()
  }));
  const t = textOf(cached);
  check("เซิร์ฟเวอร์ตอบจาก cache → ⚠ + บอกว่าไม่สด + เหตุผล", /⚠/.test(cached) && /cache/.test(t) && /429/.test(t), t);
}
{
  const stale = asOfLine(series([ymd(Date.now() - 2 * DAY)], { staleFallback: true, fetchedAt: new Date(Date.now() - 36 * HOUR).toISOString() }));
  check("client ดึงใหม่ไม่สำเร็จ → ⚠ + บอกว่าใช้ค่าที่เก็บไว้", /⚠/.test(stale) && /ใช้ค่าที่เก็บไว้/.test(textOf(stale)), textOf(stale));
}
{
  // H2: live ตอบ 200 แต่ข้อมูลเก่า → sourceType ยัง LIVE จึงต้องพึ่งเกณฑ์อายุวันแทน
  const oldLive = asOfLine(series([ymd(Date.now() - 9 * DAY)], { src: "LIVE_MARKET_DATA", fetchedAt: new Date().toISOString() }));
  check("live แต่ข้อมูลเก่า >4 วัน → ยังต้อง ⚠ (กันเคส live ตอบไม่ครบ)", /⚠/.test(oldLive), textOf(oldLive));
}
{
  const snap = asOfLine(series([ymd(Date.now() - 1 * DAY)]));
  check("มาจาก snapshot (ไม่มี meta) → ยังบอกวันข้อมูลได้", /ข้อมูล ณ/.test(snap) && !/⚠/.test(snap), textOf(snap));
}

console.log("== fail-safe: input ที่เคยทำให้ฟีเจอร์เงียบหาย ==");
check("ส่ง array ของตัวเลข (บั๊กเดิม) → คืนค่าว่าง ไม่พัง", asOfLine([5.19, 5.25]) === "");
check("null / undefined → คืนค่าว่าง ไม่พัง", asOfLine(null) === "" && asOfLine(undefined) === "");
check("มี closes แต่ไม่มี dates → คืนค่าว่าง", asOfLine({ closes: [52] }) === "");
check("dates ว่าง → คืนค่าว่าง", asOfLine({ closes: [], dates: [] }) === "");
check("error string มี HTML → ถูก escape ไม่ยิง markup", !/<script>/.test(asOfLine(series([ymd(Date.now())], { src: "SERVER_CACHED_DATA", srvError: "<script>x</script>" }))));

console.log("== rateCard ต้องส่ง series ดิบ ไม่ใช่ผลของ yieldSeries ==");
{
  // yieldSeries คืน array ของตัวเลข — ถ้า rateCard ส่งตัวนั้น บรรทัดจะไม่ขึ้นจอ (บั๊กเดิม)
  check("rateCard เรียก asOfLine(def.get()) ไม่ใช่ asOfLine(c)", /asOfLine\(def\.get\(\)\)/.test(pageSrc) && !/asOfLine\(c\)/.test(pageSrc));
}

console.log("== /api/ohlc ต้องส่งต่อ fetchedAt/error ==");
{
  const apiSrc = fs.readFileSync(path.join(ROOT, "api", "ohlc.js"), "utf8");
  check("payload มี fetchedAt", /fetchedAt:\s*data\.fetchedAt/.test(apiSrc));
  check("payload มี error", /error:\s*data\.error/.test(apiSrc));
}

console.log("");
console.log(pass + fail + " checks · " + pass + " passed · " + fail + " failed");
process.exit(fail ? 1 : 0);
