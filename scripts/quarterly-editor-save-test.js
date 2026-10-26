// Quarterly Editor บันทึกแล้วต้องไม่เขียนทับ allocation ที่ตั้งในหน้า /portfolio (lost update)
//   เคสจริง: เปิดแท็บ editor ค้างไว้ → ไปตั้ง "เติมเงินเข้าพอร์ตไตรมาสละ" ในหน้า /portfolio → กลับมาแก้ไตรมาสในแท็บเก่า
//   → editor PUT ข้อมูลทั้งก้อนที่โหลดไว้ตอนเปิดหน้า → ค่าที่เพิ่งตั้งหายเงียบ ๆ
// ดึงฟังก์ชันจริงจาก public/app.js มารันใน sandbox — ไม่ copy โค้ดมาเขียนใหม่ (แก้ app.js แล้วเทสต์ตามทันที)
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var SRC = fs.readFileSync(path.join(__dirname, "..", "public", "app.js"), "utf8");

var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + (extra != null ? "  → " + extra : "")); }
}
// ฟังก์ชันระดับบนสุดของ app.js จบด้วย "}" ที่ต้นบรรทัด
function extract(name) {
  var re = new RegExp("(^|\\n)((?:async )?function " + name + "\\()");
  var m = re.exec(SRC);
  if (!m) throw new Error("ไม่เจอฟังก์ชัน " + name + " ใน app.js");
  var start = m.index + m[1].length;
  var endRe = /\r?\n\}\r?\n/g;
  endRe.lastIndex = start;
  var e = endRe.exec(SRC);
  if (!e) throw new Error("หาจุดจบของ " + name + " ไม่เจอ");
  return SRC.slice(start, e.index) + "\n}\n";
}
var CODE;
try {
  CODE = ["portfolioHeaders", "readJsonResponse", "adoptServerAllocation", "persistRemoteData"].map(extract).join("\n");
} catch (e) {
  console.log("  ✗ ดึงฟังก์ชันจาก app.js ไม่ได้: " + e.message);
  console.log("\n1 checks · 0 passed · 1 failed");
  process.exit(1);
}

function resp(status, body) {
  return { ok: status >= 200 && status < 300, status: status, text: function () { return Promise.resolve(body === undefined ? "" : JSON.stringify(body)); } };
}
function run(opts) {
  var calls = [];
  var ctx = {
    state: { data: JSON.parse(JSON.stringify(opts.local)), hydrating: false, saving: !!opts.saving, storageMode: "supabase", lastUpdated: null },
    elements: { statusText: { textContent: "" } },
    renderSummary: function () {},
    sessionStorage: { getItem: function () { return "pw"; } },
    fetch: function (url, init) {
      var method = (init && init.method) || "GET";
      calls.push({ url: url, method: method, headers: init && init.headers, body: init && init.body ? JSON.parse(init.body) : null });
      if (method === "GET") return opts.get();
      return Promise.resolve(resp(200, { ok: true }));
    },
    Promise: Promise, JSON: JSON, Object: Object, Date: Date, Error: Error, console: console
  };
  vm.createContext(ctx);
  vm.runInContext(CODE, ctx, { filename: "app.js (extracted)" });
  return ctx.persistRemoteData().then(function () { return { calls: calls, state: ctx.state, status: ctx.elements.statusText.textContent }; });
}

var OLD_ALLOC = { version: 1, map: { "foreign-stock::US": { long: 100 } }, retirement: { annualContribution: null, targetReturnPct: 10 }, updatedAt: "2026-09-01T00:00:00.000Z" };
var NEW_ALLOC = { version: 1, map: { "foreign-stock::US": { long: 100 } }, retirement: { annualContribution: 1000000, targetReturnPct: 10 }, updatedAt: "2026-10-23T08:00:00.000Z" };
// แท็บ editor: โหลดไว้ตั้งแต่ก่อนตั้งเงินเติม แล้วผู้ใช้เพิ่มรายการใหม่ในไตรมาสนี้
var LOCAL = {
  currentQuarter: "2026-Q4",
  quarters: {
    "2026-Q3": { key: "2026-Q3", assets: [{ id: "a", type: "foreign-stock", name: "US", manualValue: 10420000, netFlow: 0 }] },
    "2026-Q4": { key: "2026-Q4", assets: [{ id: "a2", type: "foreign-stock", name: "US", manualValue: 10930000, netFlow: 0 }, { id: "b", type: "bitcoin", name: "Bitcoin", manualValue: 50000, netFlow: 0 }] }
  },
  allocation: OLD_ALLOC
};
var SERVER = JSON.parse(JSON.stringify(LOCAL));
delete SERVER.quarters["2026-Q4"].assets[1];
SERVER.quarters["2026-Q4"].assets = SERVER.quarters["2026-Q4"].assets.filter(Boolean);
SERVER.allocation = NEW_ALLOC;

console.log("== แท็บ editor เก่า + server มี allocation ใหม่กว่า ==");
run({ local: LOCAL, get: function () { return Promise.resolve(resp(200, { data: SERVER })); } }).then(function (r) {
  var put = r.calls.filter(function (c) { return c.method === "PUT"; })[0];
  t("อ่านจาก server ก่อนบันทึก (GET มาก่อน PUT)", r.calls.length === 2 && r.calls[0].method === "GET" && r.calls[1].method === "PUT",
    r.calls.map(function (c) { return c.method; }).join(","));
  t("GET ส่งรหัสผ่านไปด้วย (privacy lock)", !!r.calls[0].headers && r.calls[0].headers["x-portfolio-password"] === "pw");
  t("PUT ใช้ allocation ล่าสุดจาก server (เติมเงิน 1,000,000/ปี ไม่หาย)", !!put && JSON.stringify(put.body.data.allocation) === JSON.stringify(NEW_ALLOC),
    put && JSON.stringify(put.body.data.allocation));
  t("PUT ยังเป็นไตรมาสของ editor (รายการที่เพิ่งเพิ่มไม่หาย)", !!put && JSON.stringify(put.body.data.quarters) === JSON.stringify(LOCAL.quarters));
  t("state ในหน้า editor อัปเดต allocation เป็นของ server ด้วย", JSON.stringify(r.state.data.allocation) === JSON.stringify(NEW_ALLOC));
  t("บอกว่าบันทึกแล้ว", /บันทึกลง database แล้ว/.test(r.status), r.status);

  console.log("== อ่านจาก server ไม่ได้ → ยังบันทึกไตรมาสได้ตามเดิม ==");
  return run({ local: LOCAL, get: function () { return Promise.resolve(resp(500, { error: "boom" })); } });
}).then(function (r) {
  var put = r.calls.filter(function (c) { return c.method === "PUT"; })[0];
  t("GET 500 → ยัง PUT", !!put);
  t("…ด้วย allocation ที่มีในหน้า (ไม่ทิ้ง)", !!put && JSON.stringify(put.body.data.allocation) === JSON.stringify(OLD_ALLOC));
  t("…และบอกว่าบันทึกแล้ว", /บันทึกลง database แล้ว/.test(r.status), r.status);
  return run({ local: LOCAL, get: function () { return Promise.reject(new Error("offline")); } });
}).then(function (r) {
  t("GET throw (เน็ตหลุด) → ยัง PUT", r.calls.some(function (c) { return c.method === "PUT"; }));

  console.log("== server ไม่มี allocation → ใช้ของในหน้า ==");
  var S2 = JSON.parse(JSON.stringify(SERVER)); delete S2.allocation;
  return run({ local: LOCAL, get: function () { return Promise.resolve(resp(200, { data: S2 })); } });
}).then(function (r) {
  var put = r.calls.filter(function (c) { return c.method === "PUT"; })[0];
  t("server ไม่มี allocation → คง allocation ในหน้า", !!put && JSON.stringify(put.body.data.allocation) === JSON.stringify(OLD_ALLOC));
  return run({ local: LOCAL, saving: true, get: function () { return Promise.resolve(resp(200, { data: SERVER })); } });
}).then(function (r) {
  t("กำลังบันทึกอยู่ → ไม่ยิงซ้ำ (ไม่ GET/PUT)", r.calls.length === 0, r.calls.length);
  console.log("\n" + (pass + fail) + " checks · " + pass + " passed · " + fail + " failed");
  process.exit(fail ? 1 : 0);
}).catch(function (e) {
  console.log("  ✗ เทสต์ล้ม: " + (e && e.stack || e));
  process.exit(1);
});
