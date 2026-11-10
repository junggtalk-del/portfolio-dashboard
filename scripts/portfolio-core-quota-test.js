"use strict";
// ============================================================
// PortfolioCore.saveHoldings — localStorage เต็มต้องไม่กันการ PUT ไปเซิร์ฟเวอร์
//   node scripts/portfolio-core-quota-test.js
//
// เหตุ (2026-11-10): writeLocalHoldings เรียก localStorage.setItem โดยไม่มี try/catch → พื้นที่เต็ม
//   = saveHoldings throw ก่อน PUT → แก้ holdings ในหน้า PM (×/มูลค่า) ไม่ถึงเซิร์ฟเวอร์ และหน้า PM กลืน rejection
//   loadHoldings ก็ตกไปใช้สำเนาในเครื่อง ("local-cache") ทั้งที่ GET จากเซิร์ฟเวอร์สำเร็จ
// ล็อก: setItem throw ทุกครั้ง → saveHoldings ยัง PUT ครั้งเดียว (body = holdings ที่ dedupe แล้ว) และ resolve
//   · PUT ล้ม (HTTP 500) ยัง throw ข้อความจากเซิร์ฟเวอร์เหมือนเดิม · loadHoldings คืนของเซิร์ฟเวอร์ (mode server)
//   · อัปเดต snapshot ยังทำแบบ best-effort (ไม่ throw ต่อให้ snapshot เขียนไม่ได้)
// ============================================================
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var PUB = path.join(__dirname, "..", "public");
var pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; return; }
  fail++;
  console.error("  ✗ " + name + (extra !== undefined ? "  → " + JSON.stringify(extra) : ""));
}
function read(name) { return fs.readFileSync(path.join(PUB, name), "utf8"); }

function quotaError() {
  try { return new DOMException("Setting the value of 'portfolioHoldingsDraft' exceeded the quota.", "QuotaExceededError"); }
  catch (e) { var x = new Error("quota"); x.name = "QuotaExceededError"; return x; }
}
function mkStorage(throwAll) {
  var m = {};
  return {
    _m: m,
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null; },
    setItem: function (k, v) { if (throwAll) throw quotaError(); m[k] = String(v); },
    removeItem: function (k) { delete m[k]; },
    key: function () { return null; },
    length: 0
  };
}
function CustomEventShim(type, init) { this.type = type; this.detail = init && init.detail; }
function resp(status, body) {
  var text = JSON.stringify(body);
  return { ok: status >= 200 && status < 300, status: status, json: function () { return Promise.resolve(JSON.parse(text)); }, text: function () { return Promise.resolve(text); } };
}
// withSnapshot: โหลด big-cache.js + data-snapshot.js ตัวจริงด้วย (snapshot ที่เก็บไว้มีอยู่แล้ว → updateSnapshotHoldings เขียนทับ)
function boot(o) {
  var calls = [], events = [];
  var ls = mkStorage(o.throwAll);
  var win = {
    console: console, setTimeout: setTimeout, clearTimeout: clearTimeout, Promise: Promise, URL: URL, Map: Map, Set: Set,
    Response: typeof Response !== "undefined" ? Response : function () {}, CustomEvent: CustomEventShim,
    localStorage: ls, location: { origin: "http://localhost:4173" },
    addEventListener: function () {}, dispatchEvent: function (e) { events.push(e.type); return true; },
    fetch: function (url, opts) {
      calls.push({ url: String(url), method: (opts && opts.method) || "GET", body: opts && opts.body });
      if (/^\/api\/portfolio-holdings/.test(String(url))) {
        if ((opts && opts.method) === "PUT") return Promise.resolve(o.putStatus && o.putStatus !== 200 ? resp(o.putStatus, { error: "server says no" }) : resp(200, { ok: true }));
        return Promise.resolve(resp(200, { data: [{ canonicalSymbol: "AMD", isHolding: true, marketValue: 5 }], mode: "server" }));
      }
      return Promise.resolve(resp(404, {}));
    }
  };
  win.window = win; win.self = win;
  var ctx = vm.createContext(win);
  if (o.withSnapshot) {
    vm.runInContext(read("big-cache.js"), ctx, { filename: "big-cache.js" });
    vm.runInContext(read("data-snapshot.js"), ctx, { filename: "data-snapshot.js" });
    win.PortfolioDataSnapshot.read = (function (orig) { var s = { snapshotId: "snapshot-OLD", dataVersion: "2026-06-portfolio-dashboard-v1", loadedAt: new Date().toISOString(), portfolioHoldings: { data: [] } }; return function () { return orig() || s; }; })(win.PortfolioDataSnapshot.read);
  }
  vm.runInContext(read("portfolio-core.js"), ctx, { filename: "portfolio-core.js" });
  return { win: win, calls: calls, events: events, ls: ls, core: win.PortfolioCore };
}
var HOLD = [{ canonicalSymbol: "NVDA", isHolding: true, marketValue: 100 }, { canonicalSymbol: "nvda", isHolding: true, marketValue: 1 }, { canonicalSymbol: "GOOG", isHolding: false }];

(async function () {
  console.log("== localStorage เต็มทุกครั้ง · ไม่มี data-snapshot ==");
  var a = boot({ throwAll: true });
  var res = null, err = null;
  try { res = await a.core.saveHoldings(HOLD); } catch (e) { err = e; }
  var puts = a.calls.filter(function (c) { return c.method === "PUT"; });
  t("saveHoldings resolves (does not throw before the PUT)", !err && Array.isArray(res), err && (err.name + ": " + err.message));
  t("exactly one PUT /api/portfolio-holdings with the deduped holdings", puts.length === 1 && puts[0].url === "/api/portfolio-holdings" &&
    JSON.parse(puts[0].body).data.map(function (h) { return h.canonicalSymbol; }).join() === "NVDA,GOOG", puts.map(function (p) { return p.body && p.body.slice(0, 120); }));
  t("portfolio-holdings-updated still dispatched", a.events.indexOf("portfolio-holdings-updated") >= 0, a.events);
  var thrownWrite = null;
  try { a.core.writeLocalHoldings(HOLD); } catch (e) { thrownWrite = e; }
  t("writeLocalHoldings itself never throws", !thrownWrite, thrownWrite && thrownWrite.message);

  console.log("== PUT ล้ม → ยัง throw ข้อความจากเซิร์ฟเวอร์ (พฤติกรรมเดิม) ==");
  var b = boot({ throwAll: true, putStatus: 500 });
  var err2 = null;
  try { await b.core.saveHoldings(HOLD); } catch (e) { err2 = e; }
  t("server error still surfaces as a rejection with the server message", !!err2 && err2.message === "server says no", err2 && err2.message);

  console.log("== loadHoldings ตอนเต็ม → ของจากเซิร์ฟเวอร์ ==");
  var c = boot({ throwAll: true });
  var lh = await c.core.loadHoldings();
  t("loadHoldings returns the server holdings (mode server), not the local fallback", lh.mode === "server" && lh.holdings.length === 1 && lh.holdings[0].canonicalSymbol === "AMD", lh);

  console.log("== มี data-snapshot ตัวจริง (snapshot เขียนไม่ได้เพราะเต็ม) ==");
  var d = boot({ throwAll: true, withSnapshot: true });
  var err3 = null, res3 = null;
  try { res3 = await d.core.saveHoldings(HOLD); } catch (e) { err3 = e; }
  t("saveHoldings still PUTs and resolves when the snapshot write also fails", !err3 && Array.isArray(res3) &&
    d.calls.filter(function (x) { return x.method === "PUT"; }).length === 1, err3 && err3.message);
  t("…and the snapshot failure is surfaced (persist-failed event), not thrown", d.events.indexOf("portfolio-data-snapshot-persist-failed") >= 0, d.events);

  console.log("== ปกติ (ไม่เต็ม) ยังเก็บสำเนาในเครื่องเหมือนเดิม ==");
  var e5 = boot({ throwAll: false });
  await e5.core.saveHoldings(HOLD);
  var local = JSON.parse(e5.ls.getItem("portfolioHoldingsDraft") || "[]");
  t("normal storage: local copy written as before", local.length === 2 && local[0].canonicalSymbol === "NVDA");

  console.log("");
  console.log(pass + fail + " checks · " + pass + " passed · " + fail + " failed");
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.error("crashed: " + (e && e.stack || e)); process.exit(1); });
