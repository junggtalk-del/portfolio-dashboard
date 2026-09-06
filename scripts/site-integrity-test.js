// Site integrity — ของที่ต้องจริงทุกหน้า ไม่ว่าใครจะแก้อะไรต่อไป
// node scripts/site-integrity-test.js
"use strict";
var fs = require("fs");
var PUB = process.cwd() + "/public";
var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; return; }
  fail++; console.error("  ✗ " + name + (extra != null ? " — " + extra : ""));
}
var htmls = fs.readdirSync(PUB).filter(function (f) { return /\.html$/.test(f); });

// 1) ทุกไฟล์ที่ HTML อ้าง ต้องมีจริง (กันเคส asset.html อ้าง /aatchlist.js ที่ถูกลบไปแล้ว)
htmls.forEach(function (h) {
  var src = fs.readFileSync(PUB + "/" + h, "utf8");
  var re = /(?:src|href)="\/([A-Za-z0-9._-]+\.(?:js|css))/g, m, missing = [];
  while ((m = re.exec(src)) !== null) if (!fs.existsSync(PUB + "/" + m[1])) missing.push(m[1]);
  t(h + ": ไฟล์ที่อ้างมีครบ", missing.length === 0, missing.join(","));
});

// 2) ทุกหน้าต้องมี viewport ที่ถูกต้อง (asset.html เคยเป็น "vieaport"/"aidth" จาก find-replace พลาด)
htmls.forEach(function (h) {
  var src = fs.readFileSync(PUB + "/" + h, "utf8");
  t(h + ": มี viewport ถูกต้อง", /name="viewport"[^>]*width=device-width/.test(src));
});

// 3) Google Fonts axis ต้องเป็น wght + display=swap (เคยเพี้ยนเป็น aght/saap)
htmls.forEach(function (h) {
  var src = fs.readFileSync(PUB + "/" + h, "utf8");
  if (src.indexOf("fonts.googleapis.com/css2") < 0) { pass++; return; }
  t(h + ": Google Fonts axis ถูกต้อง", /wght@/.test(src) && !/aght@/.test(src));
});

// 4) หน้าที่ใช้ ThesisEngine ต้องโหลด engine ที่ TE ต้องใช้ครบ
//    (ไม่งั้น mega=null → decision/verdict ของ ticker เดียวกันต่างกันข้ามหน้า)
var TE_DEPS = ["ai-rotation-engine.js", "adaptive-position-engine.js", "market-regime.js"];
htmls.forEach(function (h) {
  var src = fs.readFileSync(PUB + "/" + h, "utf8");
  if (src.indexOf("/thesis-engine.js") < 0) { pass++; return; }
  var miss = TE_DEPS.filter(function (f) { return src.indexOf("/" + f) < 0; });
  t(h + ": ใช้ ThesisEngine → โหลด MegaTrend/Rotation/Macro ครบ", miss.length === 0, "ขาด " + miss.join(","));
});

// 5) ไฟล์เดียวกันต้องถูกอ้างด้วยเวอร์ชันเดียวทั้งเว็บ (กัน cache คนละรุ่นข้ามหน้า)
var verMap = {};
htmls.forEach(function (h) {
  var src = fs.readFileSync(PUB + "/" + h, "utf8");
  var re = /(?:src|href)="\/([A-Za-z0-9._-]+\.(?:js|css))\?v=([^"]*)"/g, m;
  while ((m = re.exec(src)) !== null) {
    verMap[m[1]] = verMap[m[1]] || {};
    (verMap[m[1]][m[2]] = verMap[m[1]][m[2]] || []).push(h);
  }
});
Object.keys(verMap).forEach(function (f) {
  var vers = Object.keys(verMap[f]);
  t("/" + f + ": เวอร์ชันเดียวทั้งเว็บ", vers.length === 1,
    vers.map(function (v) { return v + "[" + verMap[f][v].join(",") + "]"; }).join(" · "));
});

console.log("");
console.log(pass + fail + " checks · " + pass + " passed · " + fail + " failed");
process.exit(fail ? 1 : 0);
