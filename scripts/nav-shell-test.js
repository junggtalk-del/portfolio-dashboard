// ============================================================
// เปลือกเมนู (Mission Control shell) — กติกาที่ต้องจริงทุกหน้า
//
// ที่ต้องมีเทสต์ชุดนี้: เว็บนี้เป็นหลายหน้า กดเมนูทีคือโหลดหน้าใหม่และสร้าง
// เปลือกใหม่ทั้งหมด ของที่ "จำสถานะ" จึงพังง่ายมาก และหน้า Home ใช้เปลือก
// ที่เขียนตายไว้เอง (ไม่ได้สร้างจาก app-navigation.js) จึงหลุดได้ทีละหน้า
// ============================================================
"use strict";
var fs = require("fs"), path = require("path");
var PUB = path.join(__dirname, "..", "public");
var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; return; }
  fail++; console.error("  ✗ " + name + (extra !== undefined ? "  → " + JSON.stringify(extra) : ""));
}

var NAV = fs.readFileSync(path.join(PUB, "app-navigation.js"), "utf8");
var CSS = fs.readFileSync(path.join(PUB, "mission-control.css"), "utf8");
var htmls = fs.readdirSync(PUB).filter(function (f) { return /\.html$/.test(f); });

console.log("== ปุ่มย่อเมนู ==");
t("buildHeader มีปุ่มย่อเมนู", /id="mcRailToggle"/.test(NAV));
t("ปุ่มมี title/aria ให้รู้ว่าทำอะไร",
  /id="mcRailToggle"[\s\S]{0,200}aria-label/.test(NAV));
t("ปุ่มย่อเมนูเป็นคนละตัวกับปุ่มลิ้นชักของจอแคบ",
  /id="mcMenuToggle"/.test(NAV) && NAV.indexOf("mcRailToggle") !== NAV.indexOf("mcMenuToggle"));

console.log("== จำสถานะข้ามหน้า ==");
t("มีคีย์เก็บสถานะใน localStorage", /RAIL_KEY\s*=\s*"[^"]+"/.test(NAV));
t("อ่านสถานะตอนสร้างเปลือก", /className\s*=\s*"mc-app"\s*\+\s*\(readRail\(\)/.test(NAV));
t("เขียนสถานะเมื่อกดปุ่ม", /writeRail\(on\)/.test(NAV));
t("อ่าน/เขียน localStorage หุ้มด้วย try (ปิด storage อยู่ต้องไม่พัง)",
  /function readRail\(\)\s*\{[\s\S]{0,160}try\s*\{/.test(NAV) &&
  /function writeRail\([\s\S]{0,160}try\s*\{/.test(NAV));

console.log("== หน้า Home ที่ใช้เปลือกเขียนตาย ==");
t("สาขาเปลือกเดิมก็ใส่คลาสย่อเมนูให้ด้วย",
  /existingApp\.classList\.add\("is-rail"\)/.test(NAV));
t("สาขาเปลือกเดิมก็ผูกปุ่มให้ด้วย", /wireRailToggle\(existingApp\)/.test(NAV));
var HOME = fs.readFileSync(path.join(PUB, "home.html"), "utf8");
t("home.html มีปุ่มย่อเมนูในเปลือกของตัวเอง", HOME.indexOf('id="mcRailToggle"') >= 0);
t("home.html ยังมีปุ่มลิ้นชักของเดิม", HOME.indexOf('id="mcMenuToggle"') >= 0);

console.log("== หน้าอื่นต้องไม่มีเปลือกเขียนตายที่ตกหล่น ==");
var hardcoded = htmls.filter(function (f) {
  var s = fs.readFileSync(path.join(PUB, f), "utf8");
  return s.indexOf('class="mc-app"') >= 0 || s.indexOf('id="mcSidebar"') >= 0;
});
t("มีแค่ home.html เท่านั้นที่เขียนเปลือกเอง (ที่เหลือสร้างจาก app-navigation.js)",
  hardcoded.length === 1 && hardcoded[0] === "home.html", hardcoded);

console.log("== ชื่อเมนูต้องซ่อนได้ ==");
t("ชื่อเมนูถูกหุ้มด้วย span ของตัวเอง", /<span class="mc-nav-label">/.test(NAV));
t("แต่ละเมนูมี title ไว้ชี้ดูตอนชื่อถูกซ่อน", /class="mc-nav-item[^"]*"\s+href="\$\{[^}]+\}"\s+title=/.test(NAV));

console.log("== CSS ==");
t("ปุ่มย่อเมนูซ่อนไว้เป็นค่าเริ่มต้น", /\.mc-rail-toggle\s*\{\s*display:\s*none/.test(CSS));
t("แสดงปุ่มเฉพาะจอกว้าง (>= 861px)",
  /@media \(min-width:\s*861px\)[\s\S]{0,200}\.mc-rail-toggle\s*\{[^}]*display:\s*grid/.test(CSS));
t("ย่อแล้วคอลัมน์เมนูแคบลงจริง", /\.mc-app\.is-rail\s*\{[^}]*grid-template-columns:\s*var\(--mc-rail-w/.test(CSS));
t("มีตัวแปรความกว้างตอนย่อ", /--mc-rail-w:\s*\d+px/.test(CSS));
t("ย่อแล้วซ่อนเฉพาะตัวหนังสือ ไม่ซ่อนทั้งเมนู",
  /\.mc-app\.is-rail\s+\.mc-nav-label[\s\S]{0,200}display:\s*none/.test(CSS) &&
  !/\.mc-app\.is-rail\s+\.mc-nav-item\s*\{[^}]*display:\s*none/.test(CSS));
t("กฎย่อเมนูอยู่ในบล็อกจอกว้างเท่านั้น (จอแคบยังเป็นลิ้นชัก)", (function () {
  var i = CSS.indexOf("@media (min-width: 861px)");
  var j = CSS.indexOf(".mc-app.is-rail");
  return i >= 0 && j > i;
})());
t("จอแคบยังใช้ลิ้นชักเหมือนเดิม", /@media \(max-width:\s*860px\)[\s\S]{0,400}\.mc-sidebar\.is-open/.test(CSS));

console.log("== เวอร์ชันไฟล์ ==");
var navVers = {}, cssVers = {};
htmls.forEach(function (f) {
  var s = fs.readFileSync(path.join(PUB, f), "utf8");
  var a = /app-navigation\.js\?v=([^"]+)/.exec(s); if (a) navVers[a[1]] = 1;
  var b = /mission-control\.css\?v=([^"]+)/.exec(s); if (b) cssVers[b[1]] = 1;
});
t("ทุกหน้าอ้าง app-navigation.js เวอร์ชันเดียว", Object.keys(navVers).length === 1, Object.keys(navVers));
t("ทุกหน้าอ้าง mission-control.css เวอร์ชันเดียว", Object.keys(cssVers).length === 1, Object.keys(cssVers));

console.log("");
console.log(pass + fail + " checks · " + pass + " passed · " + fail + " failed");
process.exit(fail ? 1 : 0);
