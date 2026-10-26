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
  var els = {}, puts = [], gets = 0, dispatched = [];
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
    addEventListener: function () {}, removeEventListener: function () {},
    dispatchEvent: function (e) { dispatched.push(e); return true; },
    CustomEvent: function (type, init) { this.type = type; this.detail = init ? init.detail : undefined; },
    fetch: function (url, init) {
      if (init && init.method === "PUT") {
        puts.push(JSON.parse(init.body));
        if (o.failPut) return Promise.resolve({ ok: false, status: 500, json: function () { return Promise.resolve({}); } });
        return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve({ ok: true }); } });
      }
      gets++;
      if (o.failGet) return Promise.resolve({ ok: false, status: 500, json: function () { return Promise.resolve({}); } });
      var copy = JSON.parse(JSON.stringify(o.fixture || FIXTURE));
      if (o.noSetting) copy.allocation.retirement.annualContribution = null;
      if (o.target != null) copy.allocation.retirement.targetReturnPct = o.target;
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
    win: win, els: els, puts: puts, store: store, dispatched: dispatched,
    getsCount: function () { return gets; },
    html: function () { return els.aaRoot ? els.aaRoot.innerHTML : ""; }
  };
}
function flush(ms) { return new Promise(function (r) { setTimeout(r, ms == null ? 40 : ms); }); }

// ============================================================
(function main() {
  var A = boot();
  var B0 = boot({ noSetting: true });   // [4b] เทียบรายพอร์ตตอนไม่ตั้งเงินเติมไตรมาสละ
  // [4c] เป้าที่ทำให้ qKey(0) (ไม่ตั้งเงินเติม: +3.54%) "ตามเป้า": 15%/ปี → ไตรมาสละ 3.556% (สูงกว่านิดเดียว)
  // ตั้งให้ผลจริงต่ำกว่าเป้าเล็กน้อยโดยตั้งใจ — ถ้าสูงกว่า ตัวกันเงินชี้คนละทิศจะซ่อนเงินแทน แล้วเทสต์จับการแสดงเงินตอนตามเป้าไม่ได้
  var B1 = boot({ noSetting: true, target: 15 });
  // [4c] ปีที่ % กับเงินชี้คนละทิศ (ต่ำกว่าเป้าตามดัชนี แต่เงินเกินเส้นตามเป้า เพราะเติม 10M ในไตรมาสที่ดี)
  var B2 = boot({ fixture: { currentQuarter: "2026-Q3", quarters: {
    "2026-Q1": { key: "2026-Q1", assets: [row("foreign-stock", "US", 100000, 0)] },
    "2026-Q2": { key: "2026-Q2", assets: [row("foreign-stock", "US", 80000, 0)] },
    "2026-Q3": { key: "2026-Q3", assets: [row("foreign-stock", "US", 11400800, 10000000)] } },
    allocation: { version: 1, map: { "foreign-stock::US": { long: 100 } }, ports: {}, retirement: {}, updatedAt: "2026-09-01T00:00:00.000Z" } } });
  // ก่อนข้อมูลพอร์ตโหลดเสร็จ allocation ยังเป็นค่าเริ่มต้น — ห้ามส่งให้หน้า Position ไปคิด (จะได้ "ไม่มีเงินเติม" ผิด ๆ)
  var preAlloc = A.win.AssetAllocationPage && A.win.AssetAllocationPage.currentAllocation ? A.win.AssetAllocationPage.currentAllocation() : "missing";
  flush(60).then(function () {
    var h = A.html();
    t("ก่อนโหลดข้อมูลเสร็จ currentAllocation() = null (ให้หน้า Position ใช้ของตัวเอง)", preAlloc === null, preAlloc === null ? null : typeof preAlloc);
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
    t("Q4 สถานะ — มีชิปสถานะภาษาไทย (หักเงินเติมแล้ว พอร์ตสั้น/กลางตามหลังเป้าทั้งคู่)",
      (h.match(/<span class="aa-status is-behind">ตามหลังเป้า<\/span>/g) || []).length === 2,
      (h.match(/<span class="aa-status is-[a-z-]+">[^<]*<\/span>/g) || []).join(" "));
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
      ['data-retire="currentAge"', "data-monthly-expense", 'data-retire="inflationPct"', 'data-retire="workYears"', 'data-retire="retireYears"', 'data-retire="quarterlyContribution"']
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

    console.log("\n[3b] บันทึกผลตอบแทนย้อนหลัง — ทั้งพอร์ต (หลัก) + แยกรายพอร์ต (พับไว้)");
    t("มีหัวข้อบันทึกผลตอบแทน", h.indexOf('id="aaRecord"') >= 0 && h.indexOf("บันทึกผลตอบแทนย้อนหลัง") >= 0);
    var rec = h.slice(h.indexOf('id="aaRecord"'), h.indexOf('id="aaAssign"'));
    var cutAt = rec.indexOf("aa-rec-ports");
    var whole = cutAt >= 0 ? rec.slice(0, cutAt) : rec;          // ตารางทั้งพอร์ต + หมายเหตุ
    var ports = cutAt >= 0 ? rec.slice(cutAt) : "";              // ตารางรายพอร์ตที่พับไว้
    t("ตารางทั้งพอร์ตมาก่อน ตารางรายพอร์ตพับอยู่ใน <details>", cutAt > 0 && /<details class="aa-details aa-rec-ports"><summary>ดูแยกรายพอร์ต/.test(rec));
    t("หัวตารางทั้งพอร์ต: ต้นงวด · ปลายงวด · รวมเงินเติม · เงินเติม · ไม่รวมเงินเติม",
      /<th>ไตรมาส<\/th><th class="aa-rec-v">ต้นงวด<\/th><th class="aa-rec-v">ปลายงวด<\/th><th>รวมเงินเติม<\/th><th>เงินเติม<\/th><th>ไม่รวมเงินเติม<\/th>/.test(whole));
    // มือถือซ่อน .aa-rec-v ได้ก็ต่อเมื่อทุกแถวมี 6 ช่องเท่ากันและไม่มี colspan
    var wholeTbl = (whole.match(/<table class="aa-table aa-rec aa-rec-whole">[\s\S]*?<\/table>/) || [""])[0];
    var wholeTrs = wholeTbl.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) || [];
    t("ทุกแถวในตารางทั้งพอร์ตมี 6 ช่องเท่ากัน ไม่มี colspan", wholeTrs.length >= 6 && wholeTbl.indexOf("colspan") < 0 &&
      wholeTrs.every(function (tr) { return (tr.match(/<t[dh][ >]/g) || []).length === 6; }),
      wholeTrs.map(function (tr) { return (tr.match(/<t[dh][ >]/g) || []).length; }).join(","));
    t("…และต้นงวด/ปลายงวดติด class aa-rec-v ทุกแถว (ซ่อนบนมือถือ)", wholeTrs.every(function (tr) { return (tr.match(/class="aa-rec-v"/g) || []).length === 2; }));
    function qRow(seg, key, cells) {
      var m = (new RegExp("<tr><td>" + key + "(?:<span[^>]*>[^<]*<\\/span>)?<\\/td>((?:<td[^>]*>.*?<\\/td>){" + cells + "})<\\/tr>")).exec(seg);
      if (!m) return null;
      return (m[1].match(/<td[^>]*>.*?<\/td>/g) || []);
    }
    function txt(td) { return String(td || "").replace(/<[^>]+>/g, ""); }
    // fixture: เติมเงินปีละ 240,000 → ไตรมาสละ 60,000 · ทั้งพอร์ตคิดจากทุกรายการ (รวม Bitcoin ที่ยังไม่จัด)
    var r2 = qRow(whole, qKey(2), 5), r1 = qRow(whole, qKey(1), 5), r0 = qRow(whole, qKey(0), 5);
    t("ทุกแถวไตรมาสในตารางทั้งพอร์ตมี 6 ช่อง (3 แถวจาก 4 ไตรมาส)", !!r2 && !!r1 && !!r0 &&
      (whole.match(/<tr><td>\d{4}-Q\d(?:<span[^>]*>[^<]*<\/span>)?<\/td>/g) || []).length === 3);
    // คิดมือ: qKey(0) 540,000 → 610,000 เติม 60,000 → (610−540−60)/(540+30) = 1.75%
    t(qKey(0) + ": ต้นงวด ฿540,000 · ปลายงวด ฿610,000 (รวมรายการที่ยังไม่จัด)", !!r0 && txt(r0[0]) === "฿540,000" && txt(r0[1]) === "฿610,000", r0 && r0.slice(0, 2).map(txt).join(" | "));
    t(qKey(0) + ": รวมเงินเติม +13.0%", !!r0 && txt(r0[2]) === "+13.0%", r0 && txt(r0[2]));
    t(qKey(0) + ": เงินเติม +฿60,000 ตามที่ตั้งไตรมาสละ", !!r0 && /^\+฿60,000/.test(txt(r0[3])) && /title="ตามที่ตั้ง “เติมเงินเข้าพอร์ตไตรมาสละ” ฿60,000"/.test(r0[3]), r0 && r0[3]);
    t(qKey(0) + ": ไม่รวมเงินเติม +1.8% (คิดมือ 10,000 ÷ 570,000)", !!r0 && /^\+1\.8%/.test(txt(r0[4])), r0 && txt(r0[4]));
    t(qKey(2) + ": ไม่โต แต่หักเงินเติม 60,000 → −14.0%", !!r2 && txt(r2[2]) === "0.0%" && /^-14\.0%/.test(txt(r2[4])), r2 && [txt(r2[2]), txt(r2[4])].join(" | "));
    // qKey(1): กรอกเงินสด −60,000 ไว้รายการเดียว + หุ้นไทยเพิ่งเข้าพอร์ต (ไม่มี netFlow) → ใช้ยอดที่กรอก + ที่ระบบประมาณ ไม่ใช่ยอดไตรมาสละ
    t(qKey(1) + ": ใช้ยอดที่กรอก (บางรายการ) ไม่ใช่ 60,000 และติด *", !!r1 && /^\+฿140,000\*/.test(txt(r1[3])) && /กรอก netFlow ไว้บางรายการ/.test(r1[3]) && /ใช้แทนยอดไตรมาสละ ฿60,000/.test(r1[3]),
      r1 && r1[3]);
    t(qKey(1) + ": ไม่รวมเงินเติม 0.0% (540−400−140 = 0)", !!r1 && /^0\.0%/.test(txt(r1[4])), r1 && txt(r1[4]));
    t("ทุกแถวไตรมาสมีป้ายเทียบเป้าในช่องไม่รวมเงินเติม", [r0, r1, r2].every(function (r) { return !!r && /aa-rec-pill is-(ahead|on|behind)/.test(r[4]); }));
    t(qKey(0) + " +1.8% ต่ำกว่าเป้า 2.4% → ต่ำกว่าเป้า", !!r0 && /aa-rec-pill is-behind[^>]*>ต่ำกว่าเป้า/.test(r0[4]), r0 && r0[4]);
    // ส่วนต่างในป้ายลบจากตัวเลขที่แสดง: 1.8 − 2.4 = −0.6 (ค่าดิบ 1.754 − 2.411 = −0.657 จะปัดเป็น −0.7 ไม่ตรงกับที่ตาเห็น)
    t(qKey(0) + ": ป้ายบอกส่วนต่าง 'ต่ำกว่าเป้า -0.6%'", !!r0 && /aa-rec-pill is-behind[^>]*>ต่ำกว่าเป้า -0\.6%<\/span>/.test(r0[4]), r0 && r0[4]);
    // คิดมือ: ควรมี 540,000 + 60,000 + 2.411% × 570,000 = 613,744.80 → มีจริง 610,000 → ขาด 3,745
    t(qKey(0) + ": ขาดเป็นเงิน ฿3,745", !!r0 && /<span class="aa-rec-gap is-behind"[^>]*>ขาด ฿3,745<\/span>/.test(r0[4]), r0 && r0[4]);
    // qKey(2): ควรมี 400,000 + 60,000 + 2.411% × 430,000 = 470,368.89 → มีจริง 400,000 → ขาด 70,369 · ส่วนต่าง −14.0 − 2.4 = −16.4
    t(qKey(2) + ": 'ต่ำกว่าเป้า -16.4%' · ขาด ฿70,369", !!r2 && /ต่ำกว่าเป้า -16\.4%<\/span>/.test(r2[4]) && /ขาด ฿70,369<\/span>/.test(r2[4]), r2 && r2[4]);
    t("title ของเงินเกิน/ขาดไม่มี ฿ (Privacy Lock ไม่ซ่อน title)", !/class="aa-rec-gap[^"]*" title="[^"]*฿/.test(whole));
    t("ทุกแถวที่ต่ำกว่าเป้ามีทั้งส่วนต่างในป้ายและเงินที่ขาด", (whole.match(/>ต่ำกว่าเป้า -[\d.]+%<\/span><span class="aa-rec-gap is-behind"/g) || []).length === (whole.match(/aa-rec-pill is-behind/g) || []).length,
      (whole.match(/aa-rec-pill is-behind/g) || []).length);
    t("หมายเหตุอธิบายวิธีคิดเกิน/ขาด", /เกิน\/ขาดเป็นเงิน = มูลค่าปลายงวดจริง − มูลค่าที่ควรมีถ้าได้ตามเป้าพอดี/.test(whole));
    // แถวปี: fixture ใช้ไตรมาสสัมพัทธ์กับวันที่รัน จึงอาจตกปีเดียวหรือ 2 ปี — ตรวจตามปีที่มีจริง
    var yrs = whole.match(/<tr class="aa-rec-year"><td>\d{4} \(YTD\)(?:<span[^>]*>[^<]*<\/span>)?<\/td>(?:<td[^>]*>.*?<\/td>){5}<\/tr>/g) || [];
    var expYears = {};
    [qKey(2), qKey(1), qKey(0)].forEach(function (k) { expYears[k.slice(0, 4)] = 1; });
    t("มีแถวปี (YTD) ตามจำนวนปีที่มีไตรมาส · แถวละ 6 ช่อง", yrs.length === Object.keys(expYears).length &&
      (whole.match(/<tr class="aa-rec-year">/g) || []).length === yrs.length, yrs.length + " vs " + Object.keys(expYears).length);
    var yrFlow = 0;
    yrs.forEach(function (y) {
      var tds = y.match(/<td[^>]*>.*?<\/td>/g) || [];
      yrFlow += Number(txt(tds[4]).replace(/[^\d-]/g, "")) || 0;
    });
    t("เงินเติมในแถวปีรวมกัน = 60,000 + 140,000 + 60,000", yrFlow === 260000, yrFlow);
    t("ทุกแถวปีมีป้ายเทียบเป้า + เป้าของช่วงนั้น", yrs.length > 0 && yrs.every(function (y) { return /aa-rec-pill/.test(y) && /เป้า \+[\d.]+%/.test(y); }));
    t("แถวปีบอกว่ายังไม่ครบปี", /aa-rec-year"><td>\d{4} \(YTD\)<span class="aa-rec-sub">ยังไม่ครบปี \(\d\/4 ไตรมาส\)/.test(whole));
    t("สรุป: สะสมทั้งช่วง · เฉลี่ยต่อปี · เป้าเกษียณ 10%/ปี", /สะสมทั้งช่วง/.test(whole) && /เฉลี่ยต่อปี/.test(whole) && /เป้าเกษียณ 10%\/ปี/.test(whole));
    t("เป้าต่อไตรมาสเป็นค่าทบต้น 2.4% ไม่ใช่ 2.5%", /ต่อไตรมาส \+2\.4% \(ทบต้น ไม่ใช่ 10 ÷ 4\)/.test(whole) && !/ต่อไตรมาส[^<]*2\.5%/.test(whole));
    t("หมายเหตุบอกที่มาของเงินเติม (ตามที่ตั้งไตรมาสละ)", /เงินเติม = ตามที่ตั้ง “เติมเงินเข้าพอร์ตไตรมาสละ” ฿60,000/.test(whole));
    t("หมายเหตุอธิบาย * และสูตร", /\* กรอก netFlow ไว้ไม่ครบ/.test(whole) && /ไม่รวมเงินเติม = \(ปลายงวด − ต้นงวด − เงินเติม\)/.test(whole));
    t("ไม่มีร่องรอย ÷4 / ค่าประมาณ ≈ แบบเดิม", !/≈|aa-rec-est|ค่าประมาณจาก|เติมเงินปีละ ÷ 4/.test(rec));
    t("ไม่มี NaN/undefined ในส่วนบันทึก", !/NaN|undefined|Infinity/.test(rec));
    t("ตารางเลื่อนแนวนอนได้ในกล่องตัวเอง", whole.indexOf("aa-table-wrap") >= 0);
    // ---- ตารางรายพอร์ตเดิม (พับไว้) ----
    t("ตารางรายพอร์ตมี 3 พอร์ต + มูลค่าที่จัดแล้ว และไม่มีคอลัมน์ทั้งพอร์ตซ้ำ",
      ports.indexOf("ระยะสั้น") >= 0 && ports.indexOf("ระยะกลาง") >= 0 && ports.indexOf("ระยะยาว") >= 0 &&
      ports.indexOf("มูลค่าที่จัดแล้ว") >= 0 && ports.indexOf("<th>ทั้งพอร์ต</th>") < 0);
    t("…บอกฐานมูลค่าไว้ใน tooltip", /ไม่รวมรายการที่ยังไม่จัด/.test(ports));
    t("…แต่ละแถวมี 5 ช่อง (ไตรมาส + 3 พอร์ต + มูลค่า)",
      (ports.match(/<tr><td>\d{4}-Q\d<\/td>(<td[^>]*>.*?<\/td>){4}<\/tr>/g) || []).length === 3,
      (ports.match(/<tr><td>\d{4}-Q\d<\/td>(<td[^>]*>.*?<\/td>){4}<\/tr>/g) || []).length);
    // คิดมือ qKey(0): ต้นงวดทุกรายการ 540,000 (เงินสด 240k · RMF 100k · หุ้นไทย 200k) → สั้น 240/540 · กลาง 300/540 ของ 60,000
    t("…บอกว่าตัวเลขรายพอร์ตหักเงินเติมไตรมาสละแล้ว แบ่งตามสัดส่วนมูลค่าต้นงวด", /ตัวเลขรายพอร์ตหักเงินเติมไตรมาสละแล้ว โดยแบ่งตามสัดส่วนมูลค่าต้นงวดของแต่ละพอร์ต/.test(ports) && !/ไม่ได้หักในตารางนี้/.test(ports));
    t("…ยกตัวอย่างไตรมาสล่าสุด: ระยะสั้น ฿26,667 · ระยะกลาง ฿33,333", ports.indexOf("เช่น " + qKey(0) + ": ระยะสั้น ฿26,667 · ระยะกลาง ฿33,333 ·") >= 0,
      (/เช่น [^<]*/.exec(ports) || [""])[0].slice(0, 120));
    t("…บอกว่าเป็นสมมติฐาน และกรอก netFlow แล้วใช้ยอดที่กรอก", /จึงเป็นสมมติฐาน/.test(ports) && /ไตรมาสนั้นจะใช้ยอดที่กรอกแทน/.test(ports));
    var pRow0 = (new RegExp("<tr><td>" + qKey(0) + "<\\/td>((?:<td[^>]*>.*?<\\/td>){4})<\\/tr>").exec(ports) || [])[1] || "";
    t("…ชี้ที่ตัวเลขพอร์ตสั้นเห็นยอดที่หัก = ไตรมาสละ × สัดส่วน", /title="หักเงินเติม ฿26,667 = ไตรมาสละ ฿60,000 × 44\.4% \(สัดส่วนมูลค่าต้นงวดของพอร์ตนี้\)"/.test(pRow0), pRow0.slice(0, 220));
    // สั้น: (250,000 − 240,000 − 26,666.67) ÷ (240,000 + 13,333.33) = −6.6%
    t("…พอร์ตสั้น " + qKey(0) + " = −6.6% (หักแล้ว ไม่ใช่ +4.2%)", /^<td class="is-down"[^>]*>~-6\.6%<\/td>/.test(pRow0), pRow0.slice(0, 200));
    t("…สรุป สะสม · เฉลี่ยต่อปี · เป้าที่ตั้งไว้ และตัวเลขมี ~", /สะสมทั้งช่วง/.test(ports) && /เฉลี่ยต่อปี/.test(ports) && /เป้าที่ตั้งไว้/.test(ports) && /~[+−-]?[\d.]+%/.test(ports));
    t("…ไตรมาสที่ข้อมูลเงินเติม/ถอนไม่ครบ ถูกทำเครื่องหมาย *", ports.indexOf("aa-rec-flag") >= 0 && ports.indexOf("* ไตรมาสที่ไม่มีข้อมูล") >= 0);
    // ---- ช่องตั้งค่า ----
    t("ช่องเงินเติมเป็น “ไตรมาสละ” และแสดง 60000 (เก็บปีละ 240,000)",
      /เติมเงินเข้าพอร์ตไตรมาสละ \(บาท\)/.test(h) && /type="text" inputmode="numeric" autocomplete="off" data-retire="quarterlyContribution" value="60,000"/.test(h) && h.indexOf('data-retire="annualContribution"') < 0,
      (/data-retire="quarterlyContribution"[^>]*/.exec(h) || [])[0]);
    t("คำอธิบายช่องบอกว่าหักทุกไตรมาส และแผนเกษียณคิดปีละเท่าไหร่", /หักออกจากผลตอบแทนทุกไตรมาส · แผนเกษียณคิดปีละ ฿240,000/.test(h));
    t("แผนเกษียณบอกเติมไตรมาสละคู่กับปีละ", /เติมไตรมาสละ ฿60,000 \(ปีละ ฿240,000\)/.test(h));
    t("มีช่องตั้งเป้าพอร์ตเกษียณในส่วนตั้งค่า", /data-retire="targetReturnPct"/.test(h));
    // แก้เป้าแล้วต้องเห็นผลตรงที่แก้ — เดิมเปลี่ยนแค่ป้ายในตารางท้ายหน้า ผู้ใช้เลยคิดว่าเป้าไม่มีผล
    var tvHint = (/data-retire="targetReturnPct"[^>]*\/>\s*<div class="aa-field-h">([\s\S]*?)<\/div><\/div>/.exec(h) || [])[1] || "";
    t("ใต้ช่องเป้าแสดงผลจริงเทียบเป้า (ทำได้ · เป้า → สถานะ)", /aa-tv is-(ahead|on|behind)/.test(tvHint) && /ทำได้ [+−-]?[\d.]+%/.test(tvHint) && /เป้า \+[\d.]+% → <b>(เกินเป้า|ตามเป้า|ต่ำกว่าเป้า)<\/b>/.test(tvHint), tvHint);
    var tile0 = (/<div class="aa-stat aa-stat-target[\s\S]*?<\/div><\/div>/.exec(h) || [""])[0];
    t("หัวหน้ามีการ์ดผลตอบแทนจริงปีนี้เทียบเป้า", /ผลตอบแทนจริงปี \d{4}/.test(tile0) && /เป้า \+[\d.]+% · <b>/.test(tile0), tile0.slice(0, 200));
    t("แผนเกษียณเรียกผลตอบแทนที่ใช้ฉายภาพว่า 'ที่คาด' ไม่ใช่ 'เป้า' (กันสับสนกับเป้าที่ตั้ง)", h.indexOf("ถ้าทำได้ตามเป้า") < 0 && /ถ้าได้ผลตอบแทนตามที่คาด/.test(h));
    t("ช่องตั้งค่ามีคำอธิบายเต็มใน title", /class="aa-field" title="[^"]*คนละตัวกับผลตอบแทนคาดหวังของ 3 พอร์ต/.test(h));
    t("ค่าเริ่มต้นของช่องคือ 10", /data-retire="targetReturnPct"[^>]*value="10"/.test(h),
      (/data-retire="targetReturnPct"[^>]*/.exec(h) || [])[0]);
    // ---- หน้า Position อ่าน allocation จากที่นี่ ----
    var ca = A.win.AssetAllocationPage.currentAllocation && A.win.AssetAllocationPage.currentAllocation();
    t("currentAllocation() คืน allocation ที่โหลดแล้ว", !!ca && ca.retirement && ca.retirement.annualContribution === 240000);
    t("render แล้วส่ง event portfolio-allocation-changed", A.dispatched.some(function (e) { return e && e.type === "portfolio-allocation-changed"; }));
    var nChanged = A.dispatched.filter(function (e) { return e && e.type === "portfolio-allocation-changed"; }).length;
    A.win.AssetAllocationPage.render();
    t("render ซ้ำโดยที่ allocation ไม่เปลี่ยน → ไม่ส่งซ้ำ", A.dispatched.filter(function (e) { return e && e.type === "portfolio-allocation-changed"; }).length === nChanged);

    console.log("\n[4] คุณภาพข้อมูล — ต้องไม่ซ่อน");
    t("บอกความครบของข้อมูลเงินเติม/ถอน + จำนวนไตรมาสที่ใช้ยอดไตรมาสละ",
      h.indexOf("3/3 ไตรมาสมีข้อมูลเงินเติม/ถอน (2 ไตรมาสใช้เงินเติมไตรมาสละ แบ่งตามสัดส่วนมูลค่าต้นงวด)") >= 0 &&
      h.indexOf("2/3 ไตรมาสมีข้อมูลเงินเติม/ถอน (2 ไตรมาสใช้เงินเติมไตรมาสละ แบ่งตามสัดส่วนมูลค่าต้นงวด)") >= 0);
    // qKey(1) มีเงินสดกรอก −60,000 → ไตรมาสนั้นใช้ยอดที่กรอก · พอร์ตกลางไม่มี netFlow เลยในไตรมาสนั้น
    t("บอกว่าไตรมาสไหนไม่มีข้อมูล", h.indexOf("มีข้อมูลเงินเติม/ถอนครบเพียง 2 จาก 3 ไตรมาส") >= 0 && h.indexOf("ไม่มีข้อมูลเงินเติม/ถอนในไตรมาสนี้ — คิดเป็น 0") >= 0);
    t("หมายเหตุรายไตรมาสบอกว่าแบ่งยอดไตรมาสละ (สมมติฐาน)", h.indexOf("เงินเติมไตรมาสละแบ่งเข้าพอร์ตนี้ตามสัดส่วนมูลค่าต้นงวด (สมมติฐาน") >= 0);
    t("แจ้งรายการที่ถูกประมาณเงินเริ่มต้น", h.indexOf("ประมาณเงินเริ่มต้นให้") >= 0 && h.indexOf("หุ้นไทย") >= 0);
    t("อธิบายว่า drawdown วัดจากดัชนี ไม่ใช่มูลค่าดิบ", h.indexOf("ไม่ใช่มูลค่าดิบ") >= 0);
    t("วิธีคำนวณอธิบาย Modified Dietz และน้ำหนักกลางงวด", h.indexOf("Modified Dietz") >= 0 && h.indexOf("กลางไตรมาส") >= 0);
    t("ระบุว่าต้องมี 4 ไตรมาสขึ้นไปจึงคิดต่อปี", h.indexOf("4 ไตรมาสขึ้นไป") >= 0);

    console.log("\n[4b] ไม่ตั้งเงินเติมไตรมาสละ → รายพอร์ตไม่หัก (เทียบกับตอนตั้ง)");
    var h0 = B0.html();
    var ports0 = h0.slice(h0.indexOf("aa-rec-ports"), h0.indexOf('id="aaAssign"'));
    var p0Row = (new RegExp("<tr><td>" + qKey(0) + "<\\/td>((?:<td[^>]*>.*?<\\/td>){4})<\\/tr>").exec(ports0) || [])[1] || "";
    t("ไม่ตั้ง → พอร์ตสั้น " + qKey(0) + " = +4.2% (250k ÷ 240k − 1)", /^<td class="is-up"[^>]*>~\+4\.2%<\/td>/.test(p0Row), p0Row.slice(0, 160));
    t("ไม่ตั้ง → ชิปพอร์ตสั้น 'นำเป้า' (นับเงินเติมเป็นกำไร)", /<span class="aa-status is-ahead">นำเป้า<\/span>/.test(h0));
    t("ไม่ตั้ง → หมายเหตุบอกว่าหักเฉพาะ netFlow ที่กรอก", /ตัวเลขรายพอร์ตหักเฉพาะ netFlow ที่กรอกในแต่ละรายการ — ยังไม่ได้ตั้ง/.test(ports0));
    t("ไม่ตั้ง → หัวการ์ดไม่พูดถึงการแบ่งเงินเติม", h0.indexOf("เงินเติมไตรมาสละแบ่งตามสัดส่วนมูลค่าแต่ละพอร์ต") < 0);
    t("ตั้งแล้ว → หัวการ์ด/หัวข้อ 'จากนี้' บอกว่าแบ่งเงินเติมตามสัดส่วน", (h.match(/เงินเติมไตรมาสละแบ่งตามสัดส่วนมูลค่าแต่ละพอร์ต/g) || []).length === 2);
    function reqOf(html, port) {
      var seg = html.slice(html.indexOf("aa-fromhere"));
      var m = new RegExp(port + "<\\/div><div class=\"aa-fh-n\">~([+−-]?[\\d.]+)%").exec(seg);
      return m ? Number(m[1].replace("−", "-")) : null;
    }
    t("'จากนี้ต้องทำได้เท่าไหร่' ของพอร์ตสั้นสูงขึ้นเมื่อหักเงินเติม", reqOf(h, "ระยะสั้น") !== null && reqOf(h0, "ระยะสั้น") !== null && reqOf(h, "ระยะสั้น") > reqOf(h0, "ระยะสั้น"),
      [reqOf(h, "ระยะสั้น"), reqOf(h0, "ระยะสั้น")]);

    console.log("\n[4c] เกินเป้า / ตามเป้า บนตารางทั้งพอร์ต");
    var whole0 = h0.slice(h0.indexOf('id="aaRecord"'), h0.indexOf("aa-rec-ports"));
    var w0q0 = (new RegExp("<tr><td>" + qKey(0) + "<\\/td>((?:<td[^>]*>.*?<\\/td>){5})<\\/tr>").exec(whole0) || [])[1] || "";
    // ไม่ตั้งเงินเติม: Bitcoin เพิ่งโผล่ไม่มี netFlow → ระบบประมาณเงินเติม 50,000 → (610 − 540 − 50) ÷ (540 + 25) = +3.5%
    // ส่วนต่าง 3.5 − 2.4 = +1.1 · ควรมี 540,000 + 50,000 + 2.411% × 565,000 = 603,624.25 → มีจริง 610,000 → เกิน 6,376
    t("ไม่ตั้งเงินเติม " + qKey(0) + ": 'เกินเป้า +1.1%' · เกิน ฿6,376", /aa-rec-pill is-ahead[^>]*>เกินเป้า \+1\.1%<\/span><span class="aa-rec-gap is-ahead"[^>]*>เกิน ฿6,376<\/span>/.test(w0q0), w0q0.slice(-420));
    var h1 = B1.html();
    var whole1 = h1.slice(h1.indexOf('id="aaRecord"'), h1.indexOf("aa-rec-ports"));
    var w1q0 = (new RegExp("<tr><td>" + qKey(0) + "<\\/td>((?:<td[^>]*>.*?<\\/td>){5})<\\/tr>").exec(whole1) || [])[1] || "";
    t("ตามเป้า → ป้ายไม่มีตัวเลข และไม่มีเงินเกิน/ขาด", /aa-rec-pill is-on[^>]*>ตามเป้า<\/span><\/td>$/.test(w1q0) && w1q0.indexOf("aa-rec-gap") < 0, w1q0.slice(-300));

    var h2 = B2.html();
    var y2 = (/<tr class="aa-rec-year">[\s\S]*?<\/tr>/.exec(h2) || [""])[0];
    t("แถวปีที่ % ต่ำกว่าเป้าแต่เงินเกิน → แสดงป้ายต่ำกว่าเป้า ไม่แสดงเงินที่ขัดกับป้าย", /aa-rec-pill is-behind[^>]*>ต่ำกว่าเป้า -[\d.]+%/.test(y2) && y2.indexOf("aa-rec-gap") < 0, y2.slice(-400));
    t("…แถวไตรมาสในชุดเดียวกันยังแสดงเงินตามปกติ", (h2.match(/<span class="aa-rec-gap is-(ahead|behind)"/g) || []).length === 2, (h2.match(/aa-rec-gap/g) || []).length);

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
    var tipLineCount = (oneTip.match(/ถ้า(ทำได้|ได้ผลตอบแทน)/g) || []).length;
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
    A.win.AssetAllocationPage.setRetirement("targetReturnPct", "6");   // เป้าเกษียณ: ต้องผ่าน whitelist ถึงจะถูกบันทึก
    A.win.AssetAllocationPage.setRetirement("quarterlyContribution", "250000");   // กรอกไตรมาสละ → เก็บปีละ ×4
    A.win.AssetAllocationPage.assign("bitcoin::Bitcoin", "long");
    A.win.AssetAllocationPage.persistNow();
    return flush(80).then(function () {
      t("ยิง PUT ออกไปแล้ว", A.puts.length >= 1, A.puts.length);
      var body = A.puts[0];
      t("PUT มี data.allocation", !!(body && body.data && body.data.allocation));
      t("เป้าเกษียณที่พิมพ์ (6) ถูกบันทึกลง PUT จริง ไม่ถูก whitelist ทิ้งแล้วกลับเป็น 10",
        !!(body && body.data && body.data.allocation && body.data.allocation.retirement) && body.data.allocation.retirement.targetReturnPct === 6,
        body && body.data && body.data.allocation && body.data.allocation.retirement ? body.data.allocation.retirement.targetReturnPct : "(ไม่มี retirement)");
      var tile6 = (/<div class="aa-stat aa-stat-target[\s\S]*?<\/div><\/div>/.exec(A.html()) || [""])[0];
      var tgt6 = (/เป้า (\+[\d.]+%) · <b>/.exec(tile6) || [])[1], tgt10 = (/เป้า (\+[\d.]+%) · <b>/.exec(tile0) || [])[1];
      t("เปลี่ยนเป้า 10 → 6 แล้วการ์ดหัวหน้าเปลี่ยนเป้าตาม (ไม่ใช่ค่าเดิม)", !!tgt6 && !!tgt10 && tgt6 !== tgt10, tgt10 + " → " + tgt6);
      t("หลังบันทึก ช่องตั้งค่าแสดง 6", /data-retire="targetReturnPct"[^>]*value="6"/.test(A.html()),
        (/data-retire="targetReturnPct"[^>]*/.exec(A.html()) || [])[0]);
      t("เติมเงินไตรมาสละ 250,000 ถูกเก็บเป็นปีละ 1,000,000", body.data.allocation.retirement.annualContribution === 1000000,
        body.data.allocation.retirement.annualContribution);
      t("หลังบันทึก ช่องเงินเติมแสดง 250000 (ไม่ใช่ 1000000)", /data-retire="quarterlyContribution"[^>]*value="250,000"/.test(A.html()),
        (/data-retire="quarterlyContribution"[^>]*/.exec(A.html()) || [])[0]);
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
      // บันทึกสำเร็จต้องบอกส่วน Portfolio Position (หน้าเดียวกัน) ไม่งั้นหัวหน้ายังใช้ allocation เก่าจนรีโหลด
      var sv = A.dispatched.filter(function (e) { return e && e.type === "portfolio-allocation-saved"; });
      t("บันทึกสำเร็จ → ส่ง event portfolio-allocation-saved", sv.length >= 1, A.dispatched.map(function (e) { return e && e.type; }).join(",") || "(ไม่มี event)");
      var svd = sv.length ? (sv[sv.length - 1].detail && sv[sv.length - 1].detail.data) : null;
      t("event พกข้อมูลชุดที่เพิ่ง PUT (เป้า 6 + quarters เหมือนเดิมทุก byte)",
        !!svd && !!svd.allocation && !!svd.allocation.retirement && svd.allocation.retirement.targetReturnPct === 6 && JSON.stringify(svd.quarters) === QUARTERS_JSON);
      A.win.AssetAllocationPage.setRetirement("quarterlyContribution", "");
      t("ล้างช่องเงินเติม → null (ไม่ใช่ 0)", A.win.AssetAllocationPage.currentAllocation().retirement.annualContribution === null);
      A.win.AssetAllocationPage.setRetirement("quarterlyContribution", "abc");
      t("พิมพ์ตัวหนังสือ → null ไม่ใช่ NaN", A.win.AssetAllocationPage.currentAllocation().retirement.annualContribution === null);
      A.win.AssetAllocationPage.setRetirement("quarterlyContribution", "-5");
      t("ติดลบ → null", A.win.AssetAllocationPage.currentAllocation().retirement.annualContribution === null);
      A.win.AssetAllocationPage.setRetirement("quarterlyContribution", "250,000");
      t("พิมพ์ 250,000 (มีจุลภาค) → เก็บปีละ 1,000,000 ไม่ใช่ล้างค่า", A.win.AssetAllocationPage.currentAllocation().retirement.annualContribution === 1000000,
        A.win.AssetAllocationPage.currentAllocation().retirement.annualContribution);
      A.win.AssetAllocationPage.setRetirement("quarterlyContribution", " ฿300,000 ");
      t("พิมพ์ ฿300,000 → เก็บปีละ 1,200,000", A.win.AssetAllocationPage.currentAllocation().retirement.annualContribution === 1200000);

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
        t("บันทึกไม่สำเร็จ → ไม่ส่ง event (ข้อมูลยังไม่ถึง server)", B.dispatched.filter(function (e) { return e && e.type === "portfolio-allocation-saved"; }).length === 0);

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
