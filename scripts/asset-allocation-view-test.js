// ============================================================
// Asset Allocation — เรนเดอร์หน้าจริงใน sandbox แล้วตรวจสิ่งที่ผู้ใช้จะเห็น
//
// กติกาที่ล็อกไว้:
//   1. ลำดับหัวข้อต้องเป็นแบบ "ตัดสินใจก่อน" — สรุป/การ์ด/ต้องทำเท่าไหร่ มาก่อน
//      ตารางดิบและวิธีคำนวณเสมอ
//   2. ทุกรายการเริ่มต้นเป็น "ยังไม่จัด" — ห้ามเดาให้
//   3. การบันทึกต้องไม่แตะ quarters แม้แต่ byte เดียว
//   4. บันทึกไม่สำเร็จต้องเก็บร่างไว้ในเครื่อง ไม่ใช่เงียบหาย
//   5. ห้ามมี NaN / undefined / Infinity / [object Object] / คำ Buy-Sell หลุดออกจอ
// ============================================================
"use strict";
var vm = require("vm"), fs = require("fs"), path = require("path");
var PUB = path.join(__dirname, "..", "public");

var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + (extra != null ? "  → " + extra : "")); }
}

function qKey(back) {
  var now = new Date();
  var idx = now.getFullYear() * 4 + Math.floor(now.getMonth() / 3) - back;
  return Math.floor(idx / 4) + "-Q" + ((idx % 4 + 4) % 4 + 1);
}
function row(type, name, value, netFlow) {
  var a = { id: type + name + value, type: type, name: name, manualValue: value, snapshotValue: value, investedPercent: type === "cash" ? 0 : 100 };
  if (netFlow !== undefined) a.netFlow = netFlow;
  return a;
}
// ชุดเดียวกับตัวอย่างที่ 2 ของ smoke test: มีข้อมูลเก่าไม่มี netFlow · รายการเพิ่งเข้าพอร์ต · Bitcoin ยังไม่จัด
var FIXTURE = { currentQuarter: qKey(0), quarters: {}, allocation: {
  version: 1,
  map: { "cash::เงินสด": "short", "rmf-jang::RMF-จัง": "mid", "thai-stock::หุ้นไทย": "mid" },
  ports: { short: { expectedReturnPct: 3 }, mid: { expectedReturnPct: 6 }, long: { expectedReturnPct: null } },
  monthlyExpense: 50000,
  retirement: { inflationPct: 3, workYears: 20, retireYears: 25, annualContribution: 240000, currentAge: 42 },
  updatedAt: "2026-09-01T00:00:00.000Z"
} };
FIXTURE.quarters[qKey(3)] = { key: qKey(3), assets: [row("cash", "เงินสด", 300000), row("rmf-jang", "RMF-จัง", 100000)] };
FIXTURE.quarters[qKey(2)] = { key: qKey(2), assets: [row("cash", "เงินสด", 300000), row("rmf-jang", "RMF-จัง", 100000)] };
FIXTURE.quarters[qKey(1)] = { key: qKey(1), assets: [row("cash", "เงินสด", 240000, -60000), row("rmf-jang", "RMF-จัง", 100000), row("thai-stock", "หุ้นไทย", 200000)] };
FIXTURE.quarters[qKey(0)] = { key: qKey(0), assets: [row("cash", "เงินสด", 250000, 0), row("rmf-jang", "RMF-จัง", 100000), row("thai-stock", "หุ้นไทย", 210000), row("bitcoin", "Bitcoin", 50000)] };
var QUARTERS_JSON = JSON.stringify(FIXTURE.quarters);

function mkEl(id) {
  return {
    id: id, innerHTML: "", value: "", style: {}, attrs: {}, hidden: false,
    appendChild: function () {}, setAttribute: function (k, v) { this.attrs[k] = v; },
    getAttribute: function (k) { return this.attrs[k] || null; },
    addEventListener: function () {}, removeEventListener: function () {},
    querySelector: function () { return null; }, querySelectorAll: function () { return []; },
    closest: function () { return null; }, focus: function () {},
    classList: { add: function () {}, remove: function () {}, contains: function () { return false; } }
  };
}

function boot(opts) {
  var o = opts || {};
  var els = {}, puts = [], gets = 0;
  var store = o.store || {};
  var doc = {
    readyState: "complete", createElement: mkEl, addEventListener: function () {},
    getElementById: function (id) { if (!els[id]) els[id] = mkEl(id); return els[id]; },
    querySelector: function () { return mkEl(); }, querySelectorAll: function () { return []; },
    body: mkEl("body"), documentElement: mkEl("html"), hidden: false
  };
  var win = {
    document: doc, location: { search: "", pathname: "/asset-allocation" },
    history: { pushState: function () {}, replaceState: function () {} },
    localStorage: {
      getItem: function (k) { return k in store ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; }
    },
    addEventListener: function () {}, removeEventListener: function () {}, dispatchEvent: function () {},
    fetch: function (url, init) {
      if (init && init.method === "PUT") {
        puts.push(JSON.parse(init.body));
        if (o.failPut) return Promise.resolve({ ok: false, status: 500, json: function () { return Promise.resolve({}); } });
        return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve({ ok: true }); } });
      }
      gets++;
      if (o.failGet) return Promise.resolve({ ok: false, status: 500, json: function () { return Promise.resolve({}); } });
      var copy = JSON.parse(JSON.stringify(FIXTURE));
      // จำลองว่ามีเครื่องอื่นบันทึก allocation แซงหลังจากหน้านี้โหลดไปแล้ว
      if (o.remoteBumpAfterGet && gets > o.remoteBumpAfterGet) copy.allocation.updatedAt = "2099-01-01T00:00:00.000Z";
      return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve({ data: copy }); } });
    },
    console: console, Math: Math, JSON: JSON, Date: Date, Number: Number, String: String,
    Object: Object, Array: Array, Boolean: Boolean, isFinite: isFinite, isNaN: isNaN,
    parseInt: parseInt, parseFloat: parseFloat, Promise: Promise, RegExp: RegExp, Error: Error,
    encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent,
    setTimeout: setTimeout, clearTimeout: clearTimeout, Intl: Intl
  };
  win.window = win; win.self = win; win.globalThis = win;
  var ctx = vm.createContext(win);
  ["asset-allocation-engine.js", "asset-allocation-page.js"].forEach(function (f) {
    try { vm.runInContext(fs.readFileSync(path.join(PUB, f), "utf8"), ctx, { filename: f }); }
    catch (e) { console.log("  โหลด " + f + " ไม่ได้: " + e.message); }
  });
  return {
    win: win, els: els, puts: puts, store: store,
    getsCount: function () { return gets; },
    html: function () { return els.aaRoot ? els.aaRoot.innerHTML : ""; }
  };
}
function flush(ms) { return new Promise(function (r) { setTimeout(r, ms == null ? 40 : ms); }); }

// ============================================================
(function main() {
  var A = boot();
  flush(60).then(function () {
    var h = A.html();
    console.log("\n[1] เรนเดอร์และลำดับหัวข้อ (ตัดสินใจก่อน)");
    t("เรนเดอร์ได้และมีเนื้อหา", h.length > 3000, h.length);
    t("หัวเรื่องเป็น ASSET ALLOCATION", h.indexOf("ASSET ALLOCATION") >= 0);
    t("มีคำโปรยตามสเปก", h.indexOf("แบ่งพอร์ตเป็น 3 ระยะ และติดตามผลตอบแทนจริงเทียบกับเป้าหมาย") >= 0);
    // ใช้ id="aaAssign" ไม่ใช่ "aaAssign" เฉย ๆ เพราะบน hero มีลิงก์ href="#aaAssign" อยู่ด้วย
    var order = ["aa-headline", "aa-cards", 'id="aaRetire"', "aa-fromhere", 'id="aaAssign"', "aa-settings", "aa-quality", "วิธีคำนวณ"];
    var pos = order.map(function (k) { return h.indexOf(k); });
    t("ทุกส่วนมีครบ", pos.every(function (p) { return p >= 0; }), JSON.stringify(order.filter(function (k, i) { return pos[i] < 0; })));
    t("ลำดับถูกต้อง: สรุป → การ์ด → เกษียณ → ต้องทำเท่าไหร่ → จัดพอร์ต → ตั้งค่า → คุณภาพข้อมูล → วิธีคำนวณ",
      pos.every(function (p, i) { return i === 0 || p > pos[i - 1]; }), JSON.stringify(pos));
    t("ตารางรายไตรมาสอยู่ใต้การ์ดสรุปเสมอ", h.indexOf("ดูรายไตรมาสของพอร์ต") > h.indexOf("aa-cards"));
    t("ตารางรายไตรมาสถูกพับไว้ใน <details>", /<details class="aa-details"><summary>ดูรายไตรมาส/.test(h));

    console.log("\n[2] ตอบ 5 คำถามได้ในหน้าจอแรก");
    t("Q1 เงินอยู่ไหน — มีการ์ดครบ 3 พอร์ต",
      (h.match(/class="aa-card" data-port=/g) || []).length === 3, (h.match(/class="aa-card" data-port=/g) || []).length);
    t("Q1 มีชื่อพอร์ตไทยครบ", h.indexOf("ระยะสั้น") >= 0 && h.indexOf("ระยะกลาง") >= 0 && h.indexOf("ระยะยาว") >= 0);
    t("Q2 เป้าหมาย — แสดง 3%/ปี และ 6%/ปี", h.indexOf("3.0%/ปี") >= 0 && h.indexOf("6.0%/ปี") >= 0);
    t("Q3 ผลตอบแทนจริง — แสดงเป็นค่าประมาณพร้อม ~", /~[+−-]?\d/.test(h));
    t("Q3 บอกว่ายังไม่ครบปี แทนที่จะมโนตัวเลขต่อปี", h.indexOf("ยังไม่ครบปี (3/4 ไตรมาส)") >= 0);
    t("Q4 สถานะ — มีชิปสถานะภาษาไทย", h.indexOf("ตามหลังเป้า") >= 0 && h.indexOf("นำเป้า") >= 0);
    // พอร์ตระยะยาวใน fixture ไม่มีสินทรัพย์เลย → ชิปต้องเป็น "ยังไม่มีข้อมูล" ไม่ใช่ "ยังไม่ตั้งเป้า"
    // (เคส "มีข้อมูลแต่ไม่ได้ตั้งเป้า" ถูกล็อกไว้ใน smoke test แล้ว)
    var longCard = h.slice(h.indexOf('data-port="long"'), h.indexOf('data-port="long"') + 900);
    t("Q4 พอร์ตที่ไม่มีสินทรัพย์เลยแสดง 'ยังไม่มีข้อมูล'", longCard.indexOf("ยังไม่มีข้อมูล") >= 0, longCard.slice(0, 80));
    t("Q4 และช่องเป้าหมายบอกว่ายังไม่ได้ตั้งเป้า", longCard.indexOf("ยังไม่ได้ตั้งเป้า") >= 0);
    t("Q4 ไม่แสดงตัวเลขผลตอบแทนหลอก ๆ ให้พอร์ตที่ไม่มีข้อมูล", longCard.indexOf("ยังไม่มีไตรมาสให้เทียบ") >= 0);
    t("Q5 ต้องทำเท่าไหร่ — มีหัวข้อและตัวเลขต่อปี", h.indexOf("จากนี้ต้องทำได้เท่าไหร่") >= 0 && /~[+−-]?[\d.]+%\/ปี/.test(h));
    t("Q5 อธิบายว่าเพื่ออะไร", h.indexOf("เพื่อกลับไปอยู่บนเส้นคาดหวังภายใน") >= 0);
    t("runway เด่นและถูกต้อง (250,000 ÷ 50,000 = 5.0 เดือน)", h.indexOf("RUNWAY") >= 0 && h.indexOf("~5.0 เดือน") >= 0);
    t("เตือนตามหลังต่อเนื่อง 3 ไตรมาส", h.indexOf("ตามหลังเส้นคาดหวังต่อเนื่อง 3 ไตรมาส") >= 0);
    t("ประโยคสรุปอยู่บนสุด ก่อนการ์ด", h.indexOf("aa-headline") < h.indexOf("aa-cards"));

    console.log("\n[2b] การ์ด “ฉันมีเงินพอแล้วหรือยัง”");
    t("มีหัวข้อและอยู่ถัดจากการ์ด 3 พอร์ต",
      h.indexOf("ฉันมีเงินพอแล้วหรือยัง") > h.indexOf("aa-cards") && h.indexOf('id="aaRetire"') < h.indexOf("aa-fromhere"));
    t("มีสถานะชัดเจน (สบาย / พอดีตัว / เสี่ยง)",
      /สบาย|พอดีตัว|เสี่ยง — เงินไม่พอ/.test(h));
    t("บอกเงินที่ต้องมี ณ วันเกษียณ", h.indexOf("ต้องมี ณ วันเกษียณ") >= 0);
    t("บอกเงินที่คาดว่าจะมี", h.indexOf("คาดว่าจะมี") >= 0);
    t("แบ่งเป็น 2 ช่วงเวลาชัดเจน", h.indexOf("ช่วงที่ 1") >= 0 && h.indexOf("ช่วงที่ 2") >= 0);
    t("ช่วงที่ 1 คือก่อนเกษียณ — ต้องทำอีกเท่าไหร่",
      h.indexOf("ก่อนเกษียณ — ต้องทำอีกเท่าไหร่ถึงจะเกษียณได้") >= 0);
    t("ช่วงที่ 2 คือหลังเกษียณ — ใช้เท่าไหร่ถึงอยู่ได้จนจบ",
      h.indexOf("หลังเกษียณ — ใช้เท่าไหร่พอร์ตถึงอยู่ได้จนจบ") >= 0);
    t("ช่วงที่ 1 มาก่อนช่วงที่ 2", h.indexOf("ช่วงที่ 1") < h.indexOf("ช่วงที่ 2"));
    t("ช่วงที่ 1 บอกช่วงเวลาที่เหลือ", /อีก \d+ ปี \(ถึงอายุ \d+\)/.test(h));
    t("ช่วงที่ 2 บอกช่วงอายุที่ครอบคลุม", /อายุ \d+ → \d+ · \d+ ปี/.test(h));
    t("ผลตอบแทนที่ใช้มาจากพอร์ตจริง ไม่ได้ตั้งลอย ๆ",
      h.indexOf("ถ่วงตามสัดส่วนพอร์ตจริง") >= 0);
    t("หัวข้อแยกผลตอบแทนคาดหวัง 2 ช่วงให้เห็น",
      /ผลตอบแทนคาดหวังก่อนเกษียณ [\d.]+%\/ปี · หลังเกษียณ [\d.]+%\/ปี/.test(h));
    t("ช่วงที่ 1 กำกับอัตราของช่วงนั้น", /ก่อนเกษียณ[\s\S]{0,400}?ผลตอบแทนคาดหวัง [\d.]+%\/ปี/.test(h));
    t("ช่วงที่ 2 กำกับอัตราของช่วงนั้น", /หลังเกษียณ — ใช้เท่าไหร่[\s\S]{0,400}?ผลตอบแทนคาดหวัง [\d.]+%\/ปี/.test(h));
    t("มีช่องกรอกผลตอบแทนคาดหวังหลังเกษียณ", h.indexOf('data-retire="postReturnPct"') >= 0);
    t("ไม่ตั้งค่าหลังเกษียณ → บอกว่าใช้เท่ากับก่อนเกษียณ", h.indexOf("(เท่ากับก่อนเกษียณ)") >= 0);
    t("มีกราฟเงินตามเวลา", h.indexOf("aa-retire-line") >= 0 && /viewBox="0 0 940 300"/.test(h));
    // ป้ายนี้จะพ่วงอายุด้วยเมื่อผู้ใช้ใส่อายุไว้ จึงต้องรับได้ทั้งสองแบบ
    t("กราฟมีเส้นแบ่งวันเกษียณ", />เกษียณ( \(อายุ \d+\))?<\/text>/.test(h));
    t("มีช่องกรอกครบ 6 อย่าง (รวมอายุ)",
      ['data-retire="currentAge"', "data-monthly-expense", 'data-retire="inflationPct"', 'data-retire="workYears"', 'data-retire="retireYears"', 'data-retire="annualContribution"']
        .every(function (k) { return h.indexOf(k) >= 0; }));
    t("ช่องกรอกแสดงค่าที่บันทึกไว้",
      /data-retire="inflationPct" value="3"/.test(h) && /data-retire="workYears" value="20"/.test(h) && /data-retire="retireYears" value="25"/.test(h));
    t("ตั้งค่าชี้ทางไปการ์ดเกษียณ ไม่มีช่องค่าใช้จ่ายซ้ำสองที่",
      (h.match(/data-monthly-expense/g) || []).length === 1 && h.indexOf('href="#aaRetire"') >= 0);
    t("บอกว่าเป็นค่าประมาณ", h.indexOf("ทุกตัวเลขเป็นค่าประมาณ") >= 0);

    console.log("\n[2c] อายุ และบล็อก “ช่องว่างที่ต้องปิด”");
    t("มีช่องกรอกอายุปัจจุบัน", /data-retire="currentAge" value="42"/.test(h));
    t("หัวข้อบอกอายุตอนนี้ · ตอนเกษียณ · ตอนจบแผน",
      h.indexOf("อายุตอนนี้ 42 ปี") >= 0 && h.indexOf("เกษียณตอนอายุ 62") >= 0 && h.indexOf("วางแผนถึงอายุ 87") >= 0);
    t("เส้นแบ่งในกราฟบอกอายุตอนเกษียณ", h.indexOf("เกษียณ (อายุ 62)") >= 0);
    t("tooltip ของกราฟเกษียณบอกอายุ", /data-tip="[^"]*อายุ \d+ ปี/.test(h));
    t("แกนเวลาของกราฟเกษียณเป็นอายุ ไม่ใช่ปี ค.ศ.",
      /<text class="aa-axis"[^>]*>4[2-9]<\/text>|<text class="aa-axis"[^>]*>(5|6|7|8)\d<\/text>/.test(h));
    var gapBlock = h.slice(h.indexOf('class="aa-phase'), h.indexOf('class="aa-retire-in"'));
    t("บล็อก 2 ช่วงเวลาอยู่เหนือช่องกรอก “ต้องใช้เงินเดือนละ”",
      h.indexOf('class="aa-phase') > 0 && h.indexOf('class="aa-phase') < h.indexOf("ต้องใช้เงินเดือนละ"), gapBlock.length);
    t("ช่วงที่ 1 บอกว่ายังขาดอีกเท่าไหร่", gapBlock.indexOf("ยังขาดอีก") >= 0 || gapBlock.indexOf("เกินเป้า") >= 0);
    t("ช่วงที่ 1 บอกว่าต้องทำผลตอบแทนกี่ % ต่อปี",
      /ทำผลตอบแทนให้ได้|ทำผลตอบแทนแค่ ~/.test(gapBlock) || gapBlock.indexOf("สูงเกินจริง") >= 0, gapBlock.slice(0, 220));
    t("ช่วงที่ 1 บอกทางเลือกที่สอง (เติมเงินเพิ่ม)",
      gapBlock.indexOf("เติมเข้าพอร์ตปีละ") >= 0 || gapBlock.indexOf("เงินพอเกษียณแล้ว") >= 0);
    t("ช่วงที่ 1 บอกทั้งสองทางเป็นทางเลือก ไม่ใช่ต้องทำทั้งคู่", gapBlock.indexOf("ปิดช่องว่างได้ 2 ทาง") >= 0 || gapBlock.indexOf("เงินพอเกษียณแล้ว") >= 0);
    t("ช่วงที่ 2 บอกว่าใช้ได้เดือนละเท่าไหร่แบบหมดพอดี", gapBlock.indexOf("ใช้จนหมดพอดี") >= 0);
    t("ช่วงที่ 2 บอกแบบไม่แตะต้นเงิน (อยู่ได้ตลอดไป)", gapBlock.indexOf("ไม่แตะต้นเงิน") >= 0);
    t("ช่วงที่ 2 บอกผลของการใช้ตามที่ตั้งไว้", gapBlock.indexOf("ถ้าใช้ตามที่ตั้งไว้") >= 0);
    t("ตัวเลขรายเดือนระบุว่าเป็นค่าเงินวันนี้", gapBlock.indexOf("ค่าเงินวันนี้") >= 0);
    t("มีหน่วย /เดือน กำกับ", gapBlock.indexOf("/เดือน") >= 0);
    t("หัวบล็อกอ้างอิงอายุตอนเกษียณ", gapBlock.indexOf("อายุ 62") >= 0, gapBlock.slice(0, 160));
    t("ตัวเลขในบล็อกเป็นบาทและเปอร์เซ็นต์ ไม่มีค่าเพี้ยน",
      /฿[\d,]+/.test(gapBlock) && gapBlock.indexOf("NaN") < 0 && gapBlock.indexOf("undefined") < 0);

    console.log("\n[3] จัดพอร์ต — ไม่เดาให้ และไม่ทำ mapping หาย");
    t("มีช่อง % ครบทั้ง 3 พอร์ตสำหรับ Bitcoin",
      ["short", "mid", "long"].every(function (p) {
        return h.indexOf('data-split="bitcoin::Bitcoin" data-port="' + p + '"') >= 0;
      }));
    t("ทุกสินทรัพย์มีแถวแบ่งสัดส่วน (4 ตัว)",
      (h.match(/class="aa-arow" data-asset=/g) || []).length === 4, (h.match(/class="aa-arow" data-asset=/g) || []).length);
    t("มีปุ่มลัด 'ตั้งทั้งก้อน'", h.indexOf("ตั้งทั้งก้อน…") >= 0 && h.indexOf('data-assign="bitcoin::Bitcoin"') >= 0);
    t("ช่อง % ของ RMF-จัง แสดง 100 ในพอร์ตกลาง",
      /data-split="rmf-jang::RMF-จัง" data-port="mid" value="100"/.test(h));
    t("ช่อง % ของ RMF-จัง ในพอร์ตสั้น/ยาว ว่าง",
      /data-split="rmf-jang::RMF-จัง" data-port="short" value=""/.test(h) &&
      /data-split="rmf-jang::RMF-จัง" data-port="long" value=""/.test(h));
    var unBlock = h.slice(h.indexOf('class="aa-unassigned'), h.indexOf('class="aa-atable"'));
    t("RMF-จัง ไม่อยู่ในรายการที่ยังจัดไม่ครบ (จัดไว้ 100% แล้ว)", unBlock.indexOf("RMF-จัง") < 0, unBlock.slice(0, 160));
    t("Bitcoin อยู่ในรายการที่ยังจัดไม่ครบ", unBlock.indexOf("Bitcoin") >= 0);
    t("บอกว่าเหลือกี่ % และเป็นเงินเท่าไหร่", unBlock.indexOf("เหลือ 100%") >= 0 && unBlock.indexOf("฿50,000") >= 0, unBlock.slice(0, 200));
    t("สรุปยอดที่ยังไม่จัด", h.indexOf("รวมส่วนที่ยังไม่จัด") >= 0);
    t("บอกชัดว่าระบบไม่เดาให้", h.indexOf("ระบบไม่เดาให้") >= 0);
    t("อธิบายว่าแบ่งได้หลายพอร์ต พร้อมตัวอย่าง", h.indexOf("Bitcoin ระยะกลาง 30% ระยะยาว 70%") >= 0);
    t("แถวที่จัดครบแสดง 'รวม 100%'", h.indexOf(">รวม 100%<") >= 0);

    console.log("\n[3b] บันทึกผลตอบแทนย้อนหลัง");
    t("มีหัวข้อบันทึกผลตอบแทน", h.indexOf('id="aaRecord"') >= 0 && h.indexOf("บันทึกผลตอบแทนย้อนหลัง") >= 0);
    var rec = h.slice(h.indexOf('id="aaRecord"'), h.indexOf('id="aaAssign"'));
    t("มีคอลัมน์ครบ 3 พอร์ต + ทั้งพอร์ต + มูลค่า",
      rec.indexOf("ระยะสั้น") >= 0 && rec.indexOf("ระยะกลาง") >= 0 && rec.indexOf("ระยะยาว") >= 0 &&
      rec.indexOf("<th>ทั้งพอร์ต</th>") >= 0 && rec.indexOf("มูลค่าที่จัดแล้ว") >= 0);
    // กันคำว่า "รวม" สองที่คนละฐาน: hero นับทั้งพอร์ต · ตารางนี้นับเฉพาะที่จัดแล้ว
    t("คอลัมน์มูลค่าไม่ใช้คำว่า “รวม” ลอย ๆ ซ้ำกับ hero", rec.indexOf("<th>มูลค่ารวม</th>") < 0);
    t("และบอกฐานไว้ใน tooltip", /มูลค่าที่จัดแล้ว/.test(rec) && /ไม่รวมรายการที่ยังไม่จัด/.test(rec));
    var bodyRows = (rec.match(/<tr><td>\d{4}-Q\d<\/td>/g) || []);
    t("มีแถวครบทุกไตรมาสที่คำนวณผลตอบแทนได้ (3 แถวจาก 4 ไตรมาส)", bodyRows.length === 3, bodyRows.length);
    t("แต่ละแถวมี 6 ช่อง (ไตรมาส + 3 พอร์ต + รวม + มูลค่า)",
      (rec.match(/<tr><td>\d{4}-Q\d<\/td>(<td[^>]*>.*?<\/td>){5}<\/tr>/g) || []).length === 3,
      (rec.match(/<tr><td>\d{4}-Q\d<\/td>(<td[^>]*>.*?<\/td>){5}<\/tr>/g) || []).length);
    t("มีสรุป 3 บรรทัด: สะสม · เฉลี่ยต่อปี · เป้าที่ตั้งไว้",
      rec.indexOf("สะสมทั้งช่วง") >= 0 && rec.indexOf("เฉลี่ยต่อปี") >= 0 && rec.indexOf("เป้าที่ตั้งไว้") >= 0);
    t("ตัวเลขผลตอบแทนมี ~ กำกับว่าเป็นค่าประมาณ", /~[+−-]?[\d.]+%/.test(rec));
    t("ไตรมาสที่ไม่มีข้อมูลเงินเติม/ถอน ถูกทำเครื่องหมาย *", rec.indexOf("aa-rec-flag") >= 0 && rec.indexOf("* ไตรมาสที่ไม่มีข้อมูล") >= 0);
    t("อธิบายว่า “ทั้งพอร์ต” ไม่ใช่การเฉลี่ย 3 ตัว", rec.indexOf("ไม่ใช่การเฉลี่ยผลตอบแทน 3 ตัว") >= 0);
    t("ช่องที่คำนวณไม่ได้แสดง — พร้อมเหตุผลใน title", /aa-rec-na" title="[^"]+">—</.test(rec) || rec.indexOf("aa-rec-na") < 0);
    t("มีมูลค่ารวมเป็นบาททุกแถว", (rec.match(/฿[\d,]+/g) || []).length >= 3);
    t("ตารางเลื่อนแนวนอนได้ในกล่องตัวเอง", rec.indexOf("aa-table-wrap") >= 0);

    console.log("\n[4] คุณภาพข้อมูล — ต้องไม่ซ่อน");
    t("บอกความครบของข้อมูลเงินเติม/ถอน", h.indexOf("2/3 ไตรมาสมีข้อมูลเงินเติม/ถอน") >= 0);
    t("บอกว่าไตรมาสไหนไม่มีข้อมูล", h.indexOf("0/3 ไตรมาสมีข้อมูลเงินเติม/ถอน") >= 0);
    t("แจ้งรายการที่ถูกประมาณเงินเริ่มต้น", h.indexOf("ประมาณเงินเริ่มต้นให้") >= 0 && h.indexOf("หุ้นไทย") >= 0);
    t("อธิบายว่า drawdown วัดจากดัชนี ไม่ใช่มูลค่าดิบ", h.indexOf("ไม่ใช่มูลค่าดิบ") >= 0);
    t("วิธีคำนวณอธิบาย Modified Dietz และน้ำหนักกลางงวด", h.indexOf("Modified Dietz") >= 0 && h.indexOf("กลางไตรมาส") >= 0);
    t("ระบุว่าต้องมี 4 ไตรมาสขึ้นไปจึงคิดต่อปี", h.indexOf("4 ไตรมาสขึ้นไป") >= 0);

    console.log("\n[5] หัวข้อ “ตอนนี้อยู่ตรงไหนเทียบกับที่คาดไว้” ต้องถูกเอาออกแล้ว");
    t("ไม่มีหัวข้อนั้นเหลืออยู่", h.indexOf("ตอนนี้อยู่ตรงไหนเทียบกับที่คาดไว้") < 0);
    t("ไม่มีกราฟดัชนีรายพอร์ต (viewBox 940x290)", !/viewBox="0 0 940 290"/.test(h));
    t("ไม่มีคำอธิบายเส้นแบบเดิม", h.indexOf("ผลตอบแทนจริง (หักเงินเติม/ถอน)") < 0);
    t("ไม่มีบล็อกพอร์ตรายตัวที่เคยมีกราฟ", h.indexOf("aa-port-block") < 0 && !/class="aa-port"/.test(h));
    // ข้อมูลรายไตรมาสยังต้องอยู่ แค่ย้ายไปอยู่ใต้ “คุณภาพข้อมูล” เพราะเป็นข้อมูลดิบ
    t("ตารางรายไตรมาสยังอยู่ (ย้ายไปใต้คุณภาพข้อมูล)", h.indexOf("ดูรายไตรมาสของพอร์ต") > h.indexOf("aa-quality"));
    t("ส่วนประกอบของพอร์ตพร้อมสัดส่วนไม่หายไป (ย้ายมาอยู่บนการ์ด)",
      h.indexOf("ประกอบด้วย:") >= 0 && h.indexOf("ประกอบด้วย:") < h.indexOf('id="aaRetire"'));

    console.log("\n[5b] ชี้เมาส์บนกราฟเกษียณแล้วต้องเห็นมูลค่า");
    var hits = h.match(/class="aa-hit"[^>]*data-tip="[^"]*"/g) || [];
    t("มีแถบรับเมาส์บนกราฟ", hits.length > 0, hits.length);
    t("ทุกกราฟมีกล่อง tooltip", (h.match(/class="aa-tip"/g) || []).length === (h.match(/class="aa-chart"/g) || []).length,
      (h.match(/class="aa-tip"/g) || []).length + " tip / " + (h.match(/class="aa-chart"/g) || []).length + " chart");
    t("มีแถบครบทุกปีของแผน (46 ปี)", hits.length >= 20 + 25 + 1, hits.length);
    var retireBlock = h.slice(h.indexOf('id="aaRetire"'), h.indexOf("aa-fromhere"));
    var legendCount = (retireBlock.match(/<span><i style="border-top-color/g) || []).length;
    var oneTip = (/data-tip="([^"]*ยังทำงาน[^"]*)"/.exec(retireBlock) || [])[1] || "";
    var tipLineCount = (oneTip.match(/ถ้าทำได้/g) || []).length;
    t("กราฟเกษียณ: tooltip บอกครบทุกเส้นที่วาด (" + tipLineCount + "/" + legendCount + ")",
      legendCount > 0 && tipLineCount === legendCount, oneTip.slice(0, 120));
    t("กราฟเกษียณ: tooltip บอกมูลค่าเป็นบาทของแต่ละเส้น", /ถ้าทำได้ตามเป้า &lt;b&gt;&amp;#3647;|ถ้าทำได้ตามเป้า &lt;b&gt;฿/.test(oneTip) || oneTip.indexOf("฿") >= 0, oneTip.slice(0, 120));
    t("กราฟเกษียณ: tooltip บอกปี พ.ศ. ด้วย", /data-tip="[^"]*พ\.ศ\. \d{4}/.test(h));
    t("กราฟเกษียณ: มีจุดครบทุกปี", (h.match(/class="aa-pt"/g) || []).length >= (20 + 25 + 1), (h.match(/class="aa-pt"/g) || []).length);
    t("เนื้อ tooltip ถูก escape ไว้ใน attribute (ไม่ทำ HTML พัง)", h.indexOf('data-tip="<b>') < 0 && /data-tip="&lt;b&gt;/.test(h));
    t("กราฟเกษียณชี้ปีที่เกษียณได้", /data-tip="[^"]*ปีที่เกษียณ/.test(h));

    console.log("\n[6] ไม่มีอะไรหลุดออกจอ");
    t("ไม่มี NaN", h.indexOf("NaN") < 0);
    t("ไม่มี undefined", h.indexOf("undefined") < 0);
    t("ไม่มี Infinity", h.indexOf("Infinity") < 0);
    t("ไม่มี [object", h.indexOf("[object") < 0);
    t("ไม่มีคำ Buy/Sell", !/\b(buy|sell)\b/i.test(h));
    // "คะแนน/จัดอันดับ" ปรากฏได้ที่เดียวคือประโยคปฏิเสธในหัวข้อวิธีคำนวณ
    // จึงตรวจนอกบล็อกนั้น + ตรวจรูปแบบคะแนนจริง (เช่น 72/100) ที่ต้องไม่มีเลย
    var beforeMethod = h.slice(0, h.indexOf("วิธีคำนวณ"));
    t("ไม่มีคำว่า score (อังกฤษ) ที่ไหนเลย", !/\bscore\b/i.test(h));
    t("ไม่มีคำว่าคะแนน/จัดอันดับ นอกประโยคปฏิเสธในวิธีคำนวณ",
      beforeMethod.indexOf("คะแนน") < 0 && beforeMethod.indexOf("จัดอันดับ") < 0);
    t("วิธีคำนวณประกาศชัดว่าไม่มีการให้คะแนนหรือจัดอันดับ", h.indexOf("ไม่มีการให้คะแนนหรือจัดอันดับพอร์ต") >= 0);
    t("ไม่มีรูปแบบคะแนนแบบ N/100", !/\b\d{1,3}\s*\/\s*100\b/.test(h));
    t("ไม่มีคำ Overweight/Underweight", !/\b(overweight|underweight)\b/i.test(h));
    t("จำนวนเงินใช้รูปแบบ ฿ (privacy.js ปิดบังได้)", /฿[\d,]/.test(h));
    t("ค่าติดลบใช้ ฿ นำหน้า ไม่ใช่รูปแบบ 'บาท' ที่ทำให้เครื่องหมายลบหาย", !/-[\d,]+ บาท/.test(h));

    console.log("\n[7] บันทึก — quarters ต้องไม่ขยับแม้แต่ byte");
    A.win.AssetAllocationPage.assign("bitcoin::Bitcoin", "long");
    A.win.AssetAllocationPage.persistNow();
    return flush(80).then(function () {
      t("ยิง PUT ออกไปแล้ว", A.puts.length >= 1, A.puts.length);
      var body = A.puts[0];
      t("PUT มี data.allocation", !!(body && body.data && body.data.allocation));
      t("mapping ที่เพิ่งเลือกถูกบันทึกเป็นสัดส่วน 100%",
        JSON.stringify(body.data.allocation.map["bitcoin::Bitcoin"]) === JSON.stringify({ long: 100 }), JSON.stringify(body.data.allocation.map));
      t("mapping เดิมยังอยู่ครบ (ไม่หาย) และถูกแปลงเป็นรูปแบบสัดส่วน",
        JSON.stringify(body.data.allocation.map["cash::เงินสด"]) === JSON.stringify({ short: 100 }) &&
        JSON.stringify(body.data.allocation.map["rmf-jang::RMF-จัง"]) === JSON.stringify({ mid: 100 }) &&
        JSON.stringify(body.data.allocation.map["thai-stock::หุ้นไทย"]) === JSON.stringify({ mid: 100 }));
      t("ตั้งค่าเดิมยังอยู่ (เป้าหมาย + ค่าใช้จ่ายต่อเดือน)",
        body.data.allocation.ports.short.expectedReturnPct === 3 && body.data.allocation.monthlyExpense === 50000);
      t("ประทับเวลา updatedAt ใหม่กว่าของเดิม", String(body.data.allocation.updatedAt) > "2026-09-01T00:00:00.000Z", body.data.allocation.updatedAt);
      t("quarters เหมือนเดิมทุก byte", JSON.stringify(body.data.quarters) === QUARTERS_JSON);
      t("currentQuarter ไม่ถูกแตะ", body.data.currentQuarter === FIXTURE.currentQuarter);
      t("ทุก PUT ที่ยิงออกไปมี quarters ครบ (validation ฝั่ง server จะไม่ปฏิเสธ)",
        A.puts.every(function (b) { return b.data && b.data.quarters && Object.keys(b.data.quarters).length === 4; }));
      t("อ่านก่อนเขียนเสมอ (GET มากกว่า PUT)", A.getsCount() > A.puts.length, A.getsCount() + " GET / " + A.puts.length + " PUT");
      t("ไม่เก็บร่างค้างไว้เมื่อบันทึกสำเร็จ", !A.store["asset_allocation_draft_v1"]);
      t("แถบสถานะบอกว่าบันทึกแล้ว", A.html().indexOf('data-save-state="saved"') >= 0);

      console.log("\n[8] บันทึกไม่สำเร็จ ต้องเก็บร่างไว้ ไม่ใช่เงียบหาย");
      var B = boot({ failPut: true });
      return flush(60).then(function () {
        B.win.AssetAllocationPage.assign("bitcoin::Bitcoin", "long");
        B.win.AssetAllocationPage.persistNow();
        return flush(80);
      }).then(function () {
        t("เก็บร่างลง localStorage", !!B.store["asset_allocation_draft_v1"], Object.keys(B.store).join(","));
        var d = JSON.parse(B.store["asset_allocation_draft_v1"] || "{}");
        t("ร่างมี mapping ที่ผู้ใช้เพิ่งเลือก", !!(d.allocation && d.allocation.map["bitcoin::Bitcoin"] && d.allocation.map["bitcoin::Bitcoin"].long === 100), JSON.stringify(d.allocation && d.allocation.map));
        var hb = B.html();
        t("บอกผู้ใช้ว่าบันทึกไม่สำเร็จ", hb.indexOf('data-save-state="failed"') >= 0);
        t("บอกว่าเก็บร่างไว้ในเครื่องแล้ว", hb.indexOf("เก็บร่างไว้ในเครื่องแล้ว") >= 0);
        t("มีปุ่มลองใหม่และปุ่มทิ้งร่าง", hb.indexOf("data-save-now") >= 0 && hb.indexOf("data-discard-draft") >= 0);

        console.log("\n[9] โหลดข้อมูลไม่ได้");
        var C = boot({ failGet: true });
        return flush(60).then(function () {
          var hc = C.html();
          t("บอกเหตุผล ไม่ใช่หน้าว่าง", hc.indexOf("โหลดข้อมูลพอร์ตไม่สำเร็จ") >= 0, hc.slice(0, 120));
          t("ไม่ยิง PUT ทับตอนโหลดไม่ได้", C.puts.length === 0);

          console.log("\n[9b] แบ่ง Bitcoin สั้น 0% กลาง 30% ยาว 70% แล้วบันทึก");
          var S = boot();
          return flush(60).then(function () {
            S.win.AssetAllocationPage.setSplit("bitcoin::Bitcoin", "mid", 30);
            S.win.AssetAllocationPage.setSplit("bitcoin::Bitcoin", "long", 70);
            S.win.AssetAllocationPage.setSplit("bitcoin::Bitcoin", "short", 0);
            S.win.AssetAllocationPage.persistNow();
            return flush(90);
          }).then(function () {
            var hs = S.html();
            t("บันทึกสัดส่วนถูกต้อง {mid:30, long:70} และไม่มี short",
              JSON.stringify(S.puts[0].data.allocation.map["bitcoin::Bitcoin"]) === JSON.stringify({ mid: 30, long: 70 }),
              JSON.stringify(S.puts[0] && S.puts[0].data.allocation.map["bitcoin::Bitcoin"]));
            t("ช่อง % บนหน้าจอสะท้อนค่าที่ตั้ง",
              /data-split="bitcoin::Bitcoin" data-port="mid" value="30"/.test(hs) &&
              /data-split="bitcoin::Bitcoin" data-port="long" value="70"/.test(hs));
            t("แถวนั้นแสดงว่ารวมครบ 100%", hs.indexOf(">รวม 100%<") >= 0);
            t("มูลค่าถูกแบ่งเข้าพอร์ตกลาง ฿15,000 (30% ของ 50,000)", hs.indexOf("฿15,000") >= 0);
            t("และเข้าพอร์ตยาว ฿35,000 (70%)", hs.indexOf("฿35,000") >= 0);
            t("พอร์ตยาวมีข้อมูลแล้ว ไม่ใช่ 'ยังไม่มีข้อมูล'",
              hs.slice(hs.indexOf('data-port="long"'), hs.indexOf('data-port="long"') + 900).indexOf("ยังไม่มีข้อมูล") < 0);
            t("แถบส่วนประกอบบอกสัดส่วนของแต่ละพอร์ต", hs.indexOf("ประกอบด้วย:") >= 0 && /Bitcoin 70% \(฿35,000\)/.test(hs));
            t("ไม่เหลือรายการที่จัดไม่ครบแล้ว", hs.indexOf("จัดครบทุกรายการแล้ว") >= 0);
            t("quarters ยังเหมือนเดิมทุก byte", JSON.stringify(S.puts[0].data.quarters) === QUARTERS_JSON);

            // ตั้งเกิน 100% ต้องฟ้อง และต้องไม่เอาเข้าพอร์ต
            S.win.AssetAllocationPage.setSplit("bitcoin::Bitcoin", "short", 80);
            return flush(30).then(function () {
              var hb = S.html();
              t("รวมเกิน 100% → เตือนบนหน้า", hb.indexOf("ตั้งสัดส่วนรวมเกิน 100%") >= 0);
              t("รวมเกิน 100% → แถวขึ้นสถานะผิด", hb.indexOf("เกิน 100% จึงยังไม่ถูกนำไปคำนวณ") >= 0);
              t("รวมเกิน 100% → ไม่มีพอร์ตไหนได้มูลค่าของ Bitcoin ไป", hb.indexOf("Bitcoin 70%") < 0);
            });
          }).then(function () {

          console.log("\n[10] มีเครื่องอื่นบันทึกแซง — ห้ามทับเงียบ ๆ");
          var D = boot({ remoteBumpAfterGet: 1 });
          return flush(60).then(function () {
            D.win.AssetAllocationPage.assign("bitcoin::Bitcoin", "long");
            D.win.AssetAllocationPage.persistNow();
            return flush(90);
          }).then(function () {
            t("ไม่ยิง PUT ทับฉบับที่ใหม่กว่า", D.puts.length === 0, D.puts.length + " PUT");
            var hd = D.html();
            t("บอกผู้ใช้ว่ามีการแก้ไขจากที่อื่นใหม่กว่า", hd.indexOf("มีการแก้ไขการจัดพอร์ตจากที่อื่นใหม่กว่าของคุณ") >= 0);
            t("เก็บร่างของผู้ใช้ไว้ ไม่ทิ้ง", !!D.store["asset_allocation_draft_v1"]);
            t("ให้เลือกได้ว่าจะใช้ฉบับไหน", hd.indexOf("data-take-remote") >= 0 && hd.indexOf("data-overwrite-remote") >= 0);
            // ผู้ใช้ยืนยันว่าจะเอาของตัวเองทับ → คราวนี้ต้องบันทึกจริง
            D.win.AssetAllocationPage.overwriteRemote();
            return flush(90).then(function () {
              t("กด 'เอาของฉันทับ' แล้วบันทึกได้จริง", D.puts.length === 1, D.puts.length + " PUT");
              t("และยังรักษา quarters ไว้ครบ", D.puts.length === 1 && JSON.stringify(D.puts[0].data.quarters) === QUARTERS_JSON);

              console.log("\n" + (pass + fail) + " checks · " + pass + " passed · " + fail + " failed");
              process.exit(fail ? 1 : 0);
            });
          });
          });
        });
      });
    });
  }).catch(function (e) {
    console.log("\nERROR: " + (e && e.stack || e));
    process.exit(1);
  });
})();
