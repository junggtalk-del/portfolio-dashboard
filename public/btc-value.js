(function (root) {
  "use strict";
  // ============================================================
  // BtcValue — Bitcoin ใน Quarterly Editor กรอกเป็น "จำนวน BTC" แล้วมูลค่าบาทตามราคา
  // (spec docs/superpowers/specs/2026-11-25-btc-quantity-design.md · ผู้ใช้อนุมัติ 2026-11-25)
  //
  //   มูลค่าบาท = round2(btcQty × BTC-USD × USD/THB) → manualValue = snapshotValue ของแถว bitcoin
  //   ทุกหน้าอ่าน manualValue เดิมอยู่แล้ว → เขียนค่านี้กลับลงเอกสารไตรมาส = ทุกหน้าได้เลขเดียวกัน
  //   btcQty = ยอดรวม BTC ที่ผู้ใช้คาดว่าจะมี (ซื้อแล้ว + เงินรอซื้อที่ผู้ใช้แปลงเป็น BTC เอง) · % ลงทุนจริงกรอกเองเหมือนเดิม
  //
  //   ตามราคาเฉพาะ "ไตรมาสล่าสุดของเอกสารที่ยังไม่จบตามปฏิทิน" — ไตรมาสอื่นคือประวัติ ห้ามแตะ
  //   ไม่ใช้ราคาที่เก่ากว่าราคาที่แถวถูกประเมินไว้ (btcValuedAt) — อีกเครื่องอาจโหลดราคาใหม่กว่าแล้ว
  //   แถวเก็บราคาที่ใช้ไว้ด้วย: btcPriceUsd · usdThb · btcValuedAt
  //
  // ส่วนนี้ pure (ไม่มี DOM / fetch / storage) · window.BtcValue ใน browser + module.exports ให้เทสต์ Node
  // ES5 only.
  // ============================================================

  var VERSION = "btc-1";
  var BTC = "bitcoin";

  function isObj(v) { return !!v && typeof v === "object"; }
  function num(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v === "string" && v.replace(/^\s+|\s+$/g, "") !== "" && isFinite(Number(v))) return Number(v);
    return null;
  }
  function round2(v) { return Math.round(v * 100) / 100; }
  function copyOf(o) {
    var out = {};
    for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) out[k] = o[k];
    return out;
  }
  function timeOf(s) {
    if (typeof s !== "string" || !s) return null;
    var t = Date.parse(s);
    return isFinite(t) ? t : null;
  }
  // จำนวน BTC ที่ใช้ได้: number จำกัด ≥ 0 เท่านั้น (Editor บันทึกเป็น number เสมอ · สตริง/ติดลบ = ไม่มีจำนวน)
  function isQty(v) { return typeof v === "number" && isFinite(v) && v >= 0; }

  // ---------------- เอกสารพอร์ต: คำตอบ /api/portfolio ({ data: doc }) หรือ doc ตรง ----------------
  function isWrapper(ps) { return isObj(ps) && Object.prototype.hasOwnProperty.call(ps, "data"); }
  function docOf(ps) {
    if (!isObj(ps)) return null;
    if (isWrapper(ps)) return isObj(ps.data) ? ps.data : null;
    return ps;
  }

  // ---------------- ราคา BTC จาก snapshot ของ Load Latest Data ----------------
  // ปิดล่าสุดที่ > 0 ของซีรีส์ BTCUSD (คีย์ canonical ของ data-snapshot · รับ "BTC-USD" ด้วย) · ไม่มี → technicalSignals
  // at = เวลาที่ซีรีส์ถูกดึงจริง (lastUpdated) · ไม่มี → loadedAt · ไม่มีเวลาเลย = ตัดสินความสดไม่ได้ → null
  function lastClose(series) {
    var c = isObj(series) && Array.isArray(series.closes) ? series.closes : [];
    for (var i = c.length - 1; i >= 0; i--) {
      var v = num(c[i]);
      if (v != null && v > 0) return v;
    }
    return null;
  }
  function priceOf(snapshot) {
    if (!isObj(snapshot)) return null;
    var hist = isObj(snapshot.historicalData) ? snapshot.historicalData : {};
    var tech = isObj(snapshot.technicalSignals) ? snapshot.technicalSignals : {};
    var series = hist.BTCUSD || hist["BTC-USD"] || null;
    var usd = lastClose(series);
    var at = isObj(series) && timeOf(series.lastUpdated) != null ? series.lastUpdated : null;
    if (usd == null) {
      var sig = tech.BTCUSD || tech["BTC-USD"];
      var tv = isObj(sig) ? num(sig.latestClose) : null;
      usd = tv != null && tv > 0 ? tv : null;
      at = null;
    }
    if (usd == null) return null;
    if (!at) at = timeOf(snapshot.loadedAt) != null ? snapshot.loadedAt : null;
    if (!at) return null;
    return { usd: usd, at: at };
  }

  // ---------------- ไตรมาสที่ตามราคา ----------------
  function sortedKeys(doc) { return doc && isObj(doc.quarters) ? Object.keys(doc.quarters).sort() : []; }
  // คีย์ไตรมาสตามปฏิทินด้วยเวลาท้องถิ่น — แบบ currentQuarterKey ของ Quarterly Editor / ForeignSleeve
  function calendarKeyOf(ms) {
    var d = new Date(ms);
    return d.getFullYear() + "-Q" + (Math.floor(d.getMonth() / 3) + 1);
  }
  function compareQuarterKeys(a, b) {
    var pa = String(a).split("-Q"), pb = String(b).split("-Q");
    var ay = Number(pa[0]), aq = Number(pa[1]), by = Number(pb[0]), bq = Number(pb[1]);
    return ay === by ? aq - bq : ay - by;
  }
  function nowOf(v) {
    if (isObj(v) && typeof v.getTime === "function") v = v.getTime();
    return typeof v === "number" && isFinite(v) ? v : Date.now();
  }
  // คีย์ล่าสุดของเอกสาร ถ้ายังไม่จบตามปฏิทิน (ไตรมาสอนาคตที่สร้างไว้ก่อน = ตามราคา) · จบแล้ว / คีย์ผิดรูป / ไม่มี → null
  //   ไม่ใช้ currentQuarter (ไตรมาสที่ Editor เลือกดู) — การเลือกดูไตรมาสเก่าต้องไม่ทำให้ไตรมาสล่าสุดหยุดตามราคา
  function liveKeyOf(ps, nowMs) {
    var keys = sortedKeys(docOf(ps));
    if (!keys.length) return null;
    var key = keys[keys.length - 1];
    return compareQuarterKeys(key, calendarKeyOf(nowOf(nowMs))) >= 0 ? key : null;
  }

  // ---------------- มูลค่าของแถว ----------------
  // live = { usd, fx, at } (ราคาใน snapshot + USD/THB) · ใช้ราคาที่ใหม่กว่าระหว่าง live กับที่แถวเก็บไว้ (เท่ากัน = live)
  function validPrice(usd, fx, at) {
    var u = num(usd), f = num(fx);
    return u != null && u > 0 && f != null && f > 0 && timeOf(at) != null ? { usd: u, fx: f, at: at } : null;
  }
  function valueOfRow(row, live) {
    if (!isObj(row) || !isQty(row.btcQty)) return null;
    var stored = validPrice(row.btcPriceUsd, row.usdThb, row.btcValuedAt);
    var l = isObj(live) ? validPrice(live.usd, live.fx, live.at) : null;
    var p = l && (!stored || timeOf(l.at) >= timeOf(stored.at)) ? l : stored;
    if (!p) return null;
    return { value: round2(row.btcQty * p.usd * p.fx), usd: p.usd, fx: p.fx, at: p.at };
  }

  // ---------------- เอกสารทั้งก้อน ----------------
  // คืน { ps, changes } · ไม่มีอะไรเปลี่ยน → ps ตัวเดิม (reference เดียวกัน) · ไม่แก้ input
  //   แถวที่เปลี่ยน = สำเนาที่ตั้ง manualValue = snapshotValue = value + ราคาที่ใช้ · แถว/ไตรมาส/คีย์อื่นคง reference
  function applyToDoc(ps, live, opts) {
    var none = { ps: ps, changes: [] };
    var doc = docOf(ps);
    if (!doc || !isObj(doc.quarters)) return none;
    var key = liveKeyOf(doc, isObj(opts) ? opts.now : null);
    if (key == null) return none;
    var q = doc.quarters[key];
    var assets = isObj(q) && Array.isArray(q.assets) ? q.assets : null;
    if (!assets) return none;
    var out = [], changes = [];
    for (var i = 0; i < assets.length; i++) {
      var a = assets[i];
      var v = isObj(a) && a.type === BTC ? valueOfRow(a, live) : null;
      if (!v || (a.manualValue === v.value && a.snapshotValue === v.value && a.btcPriceUsd === v.usd && a.usdThb === v.fx && a.btcValuedAt === v.at)) {
        out.push(a);
        continue;
      }
      var row = copyOf(a);
      row.manualValue = v.value;
      row.snapshotValue = v.value;
      row.btcPriceUsd = v.usd;
      row.usdThb = v.fx;
      row.btcValuedAt = v.at;
      out.push(row);
      changes.push({ name: a.name || "Bitcoin", qty: a.btcQty, from: num(a.manualValue), to: v.value, at: v.at });
    }
    if (!changes.length) return none;
    var nq = copyOf(q);
    nq.assets = out;
    var nquarters = copyOf(doc.quarters);
    nquarters[key] = nq;
    var ndoc = copyOf(doc);
    ndoc.quarters = nquarters;
    if (isWrapper(ps)) {
      var w = copyOf(ps);
      w.data = ndoc;
      return { ps: w, changes: changes };
    }
    return { ps: ndoc, changes: changes };
  }

  // มูลค่าส่วนที่ลงทุนแล้วของ Bitcoin (ไตรมาสที่ตามราคา) = Σ manualValue × % ลงทุนจริง (clamp 0–100 แบบ Editor)
  //   ให้แถว BTC ในรายการหุ้น · ยังไม่มีแถวไหนกรอกจำนวน BTC (ยังไม่ใช้ฟีเจอร์) / ไม่มีแถว bitcoin / ไตรมาสจบแล้ว → null
  function heldValueOf(ps, opts) {
    var doc = docOf(ps);
    var key = liveKeyOf(doc, isObj(opts) ? opts.now : null);
    if (key == null) return null;
    var q = doc.quarters[key];
    var assets = isObj(q) && Array.isArray(q.assets) ? q.assets : [];
    var sum = 0, anyQty = false;
    for (var i = 0; i < assets.length; i++) {
      var a = assets[i];
      if (!isObj(a) || a.type !== BTC) continue;
      if (isQty(a.btcQty)) anyQty = true;
      var mv = num(a.manualValue) || 0;
      var inv = num(a.investedPercent);
      inv = inv == null ? 0 : Math.max(0, Math.min(100, inv));
      sum += mv * inv / 100;
    }
    return anyQty ? round2(sum) : null;
  }

  // ================================================================ I/O
  // USD/THB: ECB (frankfurter.dev · ฟรี · CORS) วันละครั้ง · ยิงไม่ได้ = อัตราที่แคชล่าสุด (วันไหนก็ได้) · ไม่มีเลย = null
  var FX_KEY = "btc_value_fx_v1";   // { day: "YYYY-MM-DD" (UTC), thb, date (วันที่ ECB) }
  var FX_URL = "https://api.frankfurter.dev/v1/latest?base=USD&symbols=THB";
  var EVENT = "btc-value-updated";

  function store() { try { return root.localStorage || null; } catch (e) { return null; } }
  function readJson(k) { try { var s = store(); return s ? JSON.parse(s.getItem(k) || "null") : null; } catch (e) { return null; } }
  function writeJson(k, v) { try { var s = store(); if (s) s.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function todayUtc() { return new Date().toISOString().slice(0, 10); }
  function lastFx() {
    var c = readJson(FX_KEY);
    var v = isObj(c) ? num(c.thb) : null;
    return v != null && v > 0 ? v : null;
  }
  var fxPending = null;
  function fx() {
    var c = readJson(FX_KEY);
    if (isObj(c) && c.day === todayUtc() && lastFx() != null) return Promise.resolve(lastFx());
    if (fxPending) return fxPending;
    if (typeof root.fetch !== "function") return Promise.resolve(lastFx());
    var p;
    try { p = root.fetch(FX_URL, { cache: "no-store" }); } catch (e) { p = Promise.reject(e); }
    fxPending = p.then(function (r) { return r && r.ok ? r.json() : null; })
      .then(function (j) {
        var v = isObj(j) && isObj(j.rates) ? num(j.rates.THB) : null;
        if (v != null && v > 0) { writeJson(FX_KEY, { day: todayUtc(), thb: v, date: j.date || null }); return v; }
        return lastFx();
      }, function () { return lastFx(); })
      .then(function (v) { fxPending = null; return v; });
    return fxPending;
  }

  function readSnapshot() {
    try { if (root.PortfolioDataSnapshot && typeof root.PortfolioDataSnapshot.read === "function") return root.PortfolioDataSnapshot.read(); } catch (e) {}
    return null;
  }
  // รายการหุ้นในเครื่อง (สำเนาของ PortfolioCore → ไม่มี = ฉบับใน snapshot)
  function localHoldings(snapshot) {
    var rows = null;
    try { if (root.PortfolioCore && typeof root.PortfolioCore.readLocalHoldings === "function") rows = root.PortfolioCore.readLocalHoldings(); } catch (e) {}
    if (!Array.isArray(rows) || !rows.length) rows = (isObj(snapshot) && isObj(snapshot.portfolioHoldings) && Array.isArray(snapshot.portfolioHoldings.data)) ? snapshot.portfolioHoldings.data : [];
    return rows;
  }
  function upper(s) { return String(s || "").replace(/^\s+|\s+$/g, "").toUpperCase(); }
  // แถว BTC ที่ถือ — กติกา bucket เดียวกับ ForeignSleeve.bucketOf: portfolioBucket ที่ตั้งเองชนะ · ไม่ตั้ง = มี "BTC" และไม่ใช่ .BK
  function isHeldBtc(h) {
    if (!isObj(h) || !h.isHolding) return false;
    if (h.portfolioBucket) return String(h.portfolioBucket) === BTC;
    var sym = upper(h.canonicalSymbol || h.ticker);
    return sym.slice(-3) !== ".BK" && sym.indexOf("BTC") >= 0;
  }
  // แถว BTC ในรายการหุ้นต้องเป็นเท่าไร: none (ไม่ใช้ฟีเจอร์ / ไม่มีแถว / ตรงแล้ว) · ambiguous (ถือหลายแถว) · update
  function holdingPlan(rows, held) {
    if (held == null) return { action: "none" };
    var btc = (rows || []).filter(isHeldBtc);
    if (!btc.length) return { action: "none" };
    if (btc.length > 1) return { action: "ambiguous" };
    if (num(btc[0].marketValue) === held) return { action: "none" };
    return { action: "update", symbol: upper(btc[0].canonicalSymbol || btc[0].ticker), to: held };
  }
  function nothingToDo(snapshot, live) {
    var ps = isObj(snapshot) ? snapshot.portfolioStatus : null;
    var res = applyToDoc(ps, live);
    if (res.changes.length) return false;
    return holdingPlan(localHoldings(snapshot), heldValueOf(ps)).action !== "update";
  }
  // สำเนาเอกสารใน snapshot = เอกสารที่ server มีตอนนี้ (คง wrapper / ทุกฟิลด์อื่นของ snapshot · loadedAt ไม่แตะ)
  //   → หน้าอื่นที่ฟัง "portfolio-data-snapshot" วาดใหม่ด้วยเลขเดียวกับ server
  function patchSnapshot(doc) {
    var api = root.PortfolioDataSnapshot;
    if (!api || typeof api.read !== "function" || typeof api.write !== "function") return;
    try {
      var snap = api.read();
      if (!isObj(snap)) return;
      var out = copyOf(snap);
      var ps = isObj(snap.portfolioStatus) ? copyOf(snap.portfolioStatus) : {};
      delete ps.error;
      ps.data = doc;
      out.portfolioStatus = ps;
      api.write(out);
    } catch (e) {}
  }
  function sameJson(a, b) { try { return JSON.stringify(a) === JSON.stringify(b); } catch (e) { return false; } }
  function assign(a, b) { var o = copyOf(a || {}), k; for (k in b) if (Object.prototype.hasOwnProperty.call(b, k)) o[k] = b[k]; return o; }

  var inflight = null, again = false, noCoreTries = 0, timer = null;
  // เขียนมูลค่า BTC ลงเอกสาร (+ แถว BTC ในรายการหุ้น) — เช็คในเครื่องก่อน ไม่มีอะไรต้องทำ = ไม่ยิง network
  //   GET→PUT ของเอกสารอยู่ใน PortfolioCore.withDocLock (ตัวเขียนอื่นในหน้าเดียวกันใช้ล็อกเดียวกัน) · ไม่มี core = ไม่เขียน
  function run() {
    if (inflight) { again = true; return inflight; }
    var core = root.PortfolioCore;
    if (!core || typeof core.withDocLock !== "function" || typeof root.fetch !== "function") {
      // portfolio-core.js ถูกฉีดคู่กับไฟล์นี้ในหน้าส่วนใหญ่ — รอสักครู่ (ไม่กี่ครั้ง)
      if (noCoreTries < 5) { noCoreTries += 1; soon(2000); }
      return Promise.resolve({ ran: false, reason: "no-core" });
    }
    var snapshot = readSnapshot();
    var price = priceOf(snapshot);
    if (!price) return Promise.resolve({ ran: false, reason: "no-price" });
    inflight = fx().then(function (thb) {
      if (!(thb > 0)) return { ran: false, reason: "no-fx" };
      var live = { usd: price.usd, fx: thb, at: price.at };
      if (nothingToDo(snapshot, live)) return { ran: false, reason: "nothing-due" };
      return core.withDocLock(function () {
        return root.fetch("/api/portfolio", { cache: "no-store" })
          .then(function (r) { if (!r || !r.ok) throw new Error("portfolio " + (r ? r.status : "?")); return r.json(); })
          .then(function (payload) {
            var doc = isObj(payload) ? (isObj(payload.data) ? payload.data : (isObj(payload.quarters) ? payload : null)) : null;
            // เอกสารว่าง / ไม่มีไตรมาส → PUT ทับ = ลบพอร์ตทั้งก้อน → ไม่ส่ง
            if (!doc || !isObj(doc.quarters) || !Object.keys(doc.quarters).length) throw new Error("empty-document");
            var res = applyToDoc(doc, live);
            if (!res.changes.length) {
              // server ตรงแล้ว (เช่นอีกเครื่องเขียนไปก่อน) — สำเนาในเครื่องเก่า → ซ่อมจาก server
              var local = isObj(snapshot) && isObj(snapshot.portfolioStatus) ? snapshot.portfolioStatus.data : null;
              if (!sameJson(local, doc)) patchSnapshot(doc);
              return { doc: doc, changes: [] };
            }
            return root.fetch("/api/portfolio", {
              method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ data: res.ps })
            }).then(function (r2) {
              if (!r2 || !r2.ok) throw new Error("save " + (r2 ? r2.status : "?"));
              patchSnapshot(res.ps);
              return { doc: res.ps, changes: res.changes };
            });
          });
      }).then(function (out) { return syncHolding(core, out); });
    }).then(function (res) { return finish(res); }, function (err) { return finish({ ran: false, reason: String(err && err.message || err) }); });
    return inflight;
  }
  // แถว BTC ในรายการหุ้น (แถวเดียวที่ถือ) = ส่วนที่ลงทุนแล้วของ Bitcoin · บันทึกทีละแถวผ่าน updateHolding (ล็อก holdings ของ core)
  //   รายการบน server ตอนบันทึกไม่ใช่ "แถวเดียว" แล้ว → ยกเลิก (mutate โยน → updateHolding ไม่ PUT)
  function syncHolding(core, out) {
    var held = heldValueOf(out.doc);
    var plan = holdingPlan(localHoldings(readSnapshot()), held);
    var done = function (holding) {
      if (out.changes.length || holding === "updated") {
        try { root.dispatchEvent(new root.CustomEvent(EVENT, { detail: { changes: out.changes, holding: holding } })); } catch (e) {}
      }
      return { ran: true, changes: out.changes, holding: holding };
    };
    if (plan.action !== "update" || typeof core.updateHolding !== "function") return done(plan.action);
    return core.updateHolding(function (list) {
      var idx = -1, count = 0;
      for (var i = 0; i < list.length; i++) if (isHeldBtc(list[i])) { count += 1; if (idx < 0) idx = i; }
      return count === 1 ? idx : -1;
    }, function (row) {
      if (!row) throw new Error("btc-holding-changed");
      return assign(row, { marketValue: held });
    }).then(function () { return done("updated"); }, function () { return done("failed"); });
  }
  function finish(res) {
    inflight = null;
    if (again) { again = false; soon(300); }
    return res;
  }
  function soon(ms) {
    if (typeof root.setTimeout !== "function") return;
    if (timer) root.clearTimeout(timer);
    timer = root.setTimeout(function () { timer = null; run(); }, ms);
  }
  // รันเองทุกหน้าที่โหลดไฟล์นี้: หลังเปิดหน้า และทุกครั้งที่ snapshot ถูกเขียน (Load Latest Data · การเขียนของตัวเองจบที่ nothing-due)
  if (typeof root.addEventListener === "function" && root.document) {
    root.addEventListener("portfolio-data-snapshot", function () { soon(1500); });
    soon(2500);
  }

  var BtcValue = {
    VERSION: VERSION,
    FX_KEY: FX_KEY,
    EVENT: EVENT,
    isQty: isQty,
    docOf: docOf,
    priceOf: priceOf,
    liveKeyOf: liveKeyOf,
    valueOfRow: valueOfRow,
    applyToDoc: applyToDoc,
    heldValueOf: heldValueOf,
    fx: fx,
    lastFx: lastFx,
    run: run
  };
  root.BtcValue = BtcValue;
  if (typeof module !== "undefined" && module.exports) module.exports = BtcValue;
})(typeof window !== "undefined" ? window : this);
