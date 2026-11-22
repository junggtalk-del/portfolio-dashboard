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

console.log("== แถบหัวไม่ล้นจอ (390–1440px) ==");
// แถบหัวเคยสูงตายตัว 72px และไม่ยอมขึ้นบรรทัดใหม่ — กลุ่มขวา (Regime · เวลา snapshot · ป้ายสด · จำนวน · Load · Retry · Home)
// กว้าง ~650px จึงดันหน้าให้เลื่อนซ้ายขวาที่จอ ≤1024px (วัดใน Chrome: 1024 → 1282px · 768 → 964px · 390 → 956px)
// และบีบของข้างในจนปุ่ม Load หักเป็น 3 บรรทัด ไอคอน Home แบนเหลือ 21px
var CSS_BODY = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
function rule(sel) {
  var m = new RegExp("(^|\\n)" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}").exec(CSS_BODY);
  return m ? m[2] : "";
}
var hdr = rule(".mc-header");
t("แถบหัวสูงอย่างน้อย 72px แต่สูงขึ้นได้ (ไม่ใช่ height ตายตัว)", /min-height:\s*var\(--mc-header-h\)/.test(hdr) && !/(^|[;{\s])height:/.test(hdr), hdr);
t("แถบหัวขึ้นบรรทัดใหม่ได้", /flex-wrap:\s*wrap/.test(hdr), hdr);
var hright = rule(".mc-header-right");
t("กลุ่มขวาขึ้นบรรทัดใหม่ได้ ชิดขวา และไม่กว้างเกินแถบ",
  /flex-wrap:\s*wrap/.test(hright) && /justify-content:\s*flex-end/.test(hright) && /min-width:\s*0/.test(hright) && /max-width:\s*100%/.test(hright), hright);
t("ของในกลุ่มขวาไม่ถูกบีบ (ปุ่มไม่หักบรรทัด ไอคอนไม่แบน)", /flex:\s*0 0 auto/.test(rule(".mc-header-right > *")));
var hsearch = rule(".mc-search");
t("ช่องค้นหาหดได้ และช่องพิมพ์ข้างในก็หดได้", /min-width:\s*0/.test(hsearch) && /min-width:\s*0/.test(rule(".mc-search input")), hsearch);
// ห้ามซ่อนปุ่ม/ลิงก์/ป้ายสถานะในแถบหัว — ทุกอันต้องกดได้/เห็นได้ทุกความกว้าง
var hiddenSel = [], hre = /([^{}]+)\{([^{}]*)\}/g, hm;
while ((hm = hre.exec(CSS_BODY)) !== null) {
  if (/display:\s*none/.test(hm[2])) hm[1].split(",").forEach(function (s) { hiddenSel.push(s.trim()); });
}
// ☰ / ⇤ เป็นคู่สลับตามความกว้าง: ซ่อนได้เฉพาะกฎฐานที่ "มาก่อน" บล็อกจอที่เปิดมันกลับ (ไม่งั้นซ่อนทุกจอ — บั๊กเดิมของ ☰)
var TOGGLES = /mc-menu-toggle|mc-rail-toggle/;
var hiddenControls = hiddenSel.filter(function (s) {
  if (/^\.mc-menu-toggle$|^\.mc-rail-toggle$/.test(s)) return false;   // กฎฐาน — ลำดับตรวจข้างล่าง
  // .mc-btn[hidden] (2026-11-22): ซ่อนเฉพาะตอนสคริปต์ใส่ attribute hidden เอง (Retry Failed ตอนไม่มีตัวล้มเหลว) ไม่ใช่ซ่อนตามความกว้างจอ
  //   — ไม่มีกฎนี้ display:inline-flex ของ .mc-btn ชนะ [hidden] ปุ่ม Retry จึงโผล่ทั้งที่ล้มเหลว 0
  if (/^\.mc-btn\[hidden\]$/.test(s)) return false;
  return TOGGLES.test(s) || /mc-header-right|mc-btn|mcx-regime-chip|appRegimeChip|appLoadDataButton|appRetryFailedButton|mcLoadLatest|mc-search|mc-pill|mc-snap(?!-counts)/.test(s) || /\.mc-icon-btn$/.test(s);
});
t("ไม่มีกฎไหนซ่อนปุ่ม ลิงก์ ช่องค้นหา ป้ายสถานะ หรือ ☰ / ⇤ ของแถบหัว (นอกจากกฎฐานของ ☰ / ⇤)", hiddenControls.length === 0, hiddenControls);
var iMenuBase = CSS_BODY.search(/(^|\n)\.mc-menu-toggle\s*\{\s*display:\s*none/), iMenuShow = CSS_BODY.search(/@media \(max-width:\s*860px\)\s*\{[^@]*?\.mc-menu-toggle\s*\{\s*display:\s*grid/);
t("☰ เห็นที่จอ ≤860px: กฎฐาน display:none มาก่อนบล็อก ≤860px ที่ให้ display:grid", iMenuBase >= 0 && iMenuShow > iMenuBase, [iMenuBase, iMenuShow]);
var iRailBase = CSS_BODY.search(/(^|\n)\.mc-rail-toggle\s*\{\s*display:\s*none/), iRailShow = CSS_BODY.search(/@media \(min-width:\s*861px\)\s*\{[^@]*?\.mc-rail-toggle\s*\{[^}]*display:\s*grid/);
t("⇤ เห็นที่จอ ≥861px: กฎฐาน display:none มาก่อนบล็อก ≥861px", iRailBase >= 0 && iRailShow > iRailBase, [iRailBase, iRailShow]);
t("ลิ้นชักเมนูปิดได้: แตะนอกเมนู หรือกด Escape (☰ ถูกเมนูที่เปิดบังอยู่)",
  /function wireDrawerClose\(/.test(NAV) && /classList\.remove\("is-open"\)/.test(NAV) && /"Escape"/.test(NAV) &&
  /wireRailToggle\(existingApp\);\s*wireDrawerClose\(\);/.test(NAV) && /wireRailToggle\(app\);\s*wireDrawerClose\(\);/.test(NAV));
// ป้ายจำนวน: ตอนว่าง ("38/38") ซ้ำกับป้ายสด → ซ่อนได้บนจอ ≤1180px · ตอนกำลังโหลด ("37/120 · NVDA") และเมื่อมีตัวล้มเหลว ต้องเห็นทุกจอ
t("ป้ายจำนวนซ่อนเฉพาะสถานะว่าง (data-state=idle) และเฉพาะจอ ≤1180px",
  /@media \(max-width:\s*1180px\)\s*\{[^@]*?\.mc-snap-counts\[data-state="idle"\]\s*\{\s*display:\s*none;?\s*\}/.test(CSS_BODY) &&
  !/\.mc-snap-counts(?!\[data-state="idle"\])[^{,]*\{[^}]*display:\s*none/.test(CSS_BODY));
t("app-navigation ตั้ง data-state: กำลังโหลด = loading · มีตัวล้มเหลว = failed · ไม่มี = idle",
  /function updateProgress[\s\S]{0,900}?counts\.setAttribute\("data-state", "loading"\)/.test(NAV) &&
  /function updateDataStatus[\s\S]{0,1400}?counts\.setAttribute\("data-state", failed \? "failed" : "idle"\)/.test(NAV));

console.log("== สไตล์ชีตที่เปลือกฉีด: ไม่โหลดซ้ำ และลงก่อน glass-cards.css ==");
// เคย dedupe ด้วย href เต็ม (รวม ?v=) → หน้าที่ลิงก์ mission-control.css เองได้สำเนาที่สองท้าย <head> ซึ่งทับ glass-cards.css
// และ CSS ของหน้า (เจอใน Chrome: PM โหลด mission-control.css 2 ครั้ง · mc-9 + mc-7)
function grabTopFn(src, name) {
  var m = new RegExp("\\n  function " + name + "\\(").exec(src);
  if (!m) return null;
  var end = src.indexOf("\n  }\n", m.index + 1);
  return end < 0 ? null : src.slice(m.index + 1, end + 4);
}
var ENSURE = grabTopFn(NAV, "ensureStylesheet");
function fakeHead(hrefs) {
  var vm = require("vm");
  var head = { kids: [] };
  function mk(href) { var a = { rel: "stylesheet", href: href, parentNode: head }; a.getAttribute = function (k) { return k === "href" ? this.href : k === "rel" ? this.rel : null; }; return a; }
  head.kids = hrefs.map(mk);
  head.appendChild = function (n) { n.parentNode = head; head.kids.push(n); return n; };
  head.insertBefore = function (n, ref) { n.parentNode = head; head.kids.splice(head.kids.indexOf(ref), 0, n); return n; };
  var doc = {
    head: head,
    createElement: function () { var n = mk(""); n.rel = ""; return n; },
    querySelectorAll: function (sel) {
      if (sel !== 'link[rel="stylesheet"]') throw new Error("unexpected selector " + sel);
      return head.kids.filter(function (k) { return k.rel === "stylesheet"; });
    }
  };
  var ctx = vm.createContext({ document: doc });
  vm.runInContext(ENSURE + "\nthis.ensureStylesheet = ensureStylesheet;", ctx);
  return { ensure: function (h) { try { ctx.ensureStylesheet(h); } catch (e) { head.kids.push({ href: "THREW: " + e.message }); } },
    list: function () { return head.kids.map(function (k) { return k.href; }); } };
}
t("พบ ensureStylesheet ใน app-navigation.js", !!ENSURE);
if (ENSURE) {
  var h1 = fakeHead(["/theme.css?v=1", "/mission-control.css?v=OLD", "/glass-cards.css?v=g", "/page.css?v=p"]);
  h1.ensure("/mission-control.css?v=NEW");
  t("ลิงก์ mission-control.css อยู่แล้ว (คนละ ?v=) → ไม่โหลดซ้ำ", h1.list().join() === "/theme.css?v=1,/mission-control.css?v=OLD,/glass-cards.css?v=g,/page.css?v=p", h1.list());
  h1.ensure("/mission-control-v2.css?v=X");
  t("mission-control.css ไม่นับเป็น mission-control-v2.css (เทียบ path เต็ม) · ตัวที่ขาดลงก่อน glass-cards.css",
    h1.list().join() === "/theme.css?v=1,/mission-control.css?v=OLD,/mission-control-v2.css?v=X,/glass-cards.css?v=g,/page.css?v=p", h1.list());
  var h2 = fakeHead(["/theme.css?v=1", "/mission-control-v2.css?v=X", "/glass-cards.css?v=g", "/market-risk.css?v=m"]);
  h2.ensure("/mission-control.css?v=NEW"); h2.ensure("/mission-control-v2.css?v=Y");
  t("mission-control-v2.css ไม่บัง mission-control.css · หลายตัวลงก่อน glass-cards.css ตามลำดับที่เรียก",
    h2.list().join() === "/theme.css?v=1,/mission-control-v2.css?v=X,/mission-control.css?v=NEW,/glass-cards.css?v=g,/market-risk.css?v=m", h2.list());
  var h3 = fakeHead(["/theme.css?v=1", "/backtest.css?v=b"]);
  h3.ensure("/mission-control.css?v=NEW"); h3.ensure("/mission-control.css?v=NEW");
  t("หน้าที่ไม่มี glass-cards.css: ต่อท้ายเหมือนเดิม และเรียกซ้ำก็ไม่ซ้ำ", h3.list().join() === "/theme.css?v=1,/backtest.css?v=b,/mission-control.css?v=NEW", h3.list());
}
// เวอร์ชันที่ฉีด = เวอร์ชันที่หน้าลิงก์เอง (กันหน้าที่ไม่มีลิงก์ได้ไฟล์รุ่นเก่า)
var injected = {}, ire = /ensureStylesheet\("\/([A-Za-z0-9._-]+\.css)\?v=([^"]+)"\)/g, im;
while ((im = ire.exec(NAV)) !== null) injected[im[1]] = im[2];
var pageVer = {};
htmls.forEach(function (f) {
  var s = fs.readFileSync(path.join(PUB, f), "utf8"), re = /href="\/(mission-control(?:-v2)?\.css)\?v=([^"]+)"/g, mm;
  while ((mm = re.exec(s)) !== null) (pageVer[mm[1]] = pageVer[mm[1]] || {})[mm[2]] = 1;
});
t("เปลือกฉีด mission-control.css / mission-control-v2.css เวอร์ชันเดียวกับที่หน้าลิงก์เอง",
  ["mission-control.css", "mission-control-v2.css"].every(function (f) { var v = Object.keys(pageVer[f] || {}); return v.length === 1 && injected[f] === v[0]; }),
  { injected: injected, pages: pageVer });
t("จอโทรศัพท์ (≤600px): แถบหัวที่ขึ้นหลายบรรทัดเลื่อนไปกับหน้า ไม่ค้างบังจอ",
  /@media \(max-width:\s*600px\)\s*\{[^@]*?\.mc-header\s*\{\s*position:\s*relative;?\s*\}/.test(CSS_BODY));

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
