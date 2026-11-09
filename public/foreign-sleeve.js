(function () {
  "use strict";

  // ============================================================
  // Foreign sleeve — หุ้นต่างประเทศยึดหน้า AI Portfolio Manager (โมดูลกลาง · pure)
  //
  // นิยาม (spec 2026-11-09-pm-foreign-sleeve-design.md):
  //   invested = Σ marketValue ของหุ้นต่างประเทศที่ถือ (isHolding + bucket foreign-stock ตามกติกาเดิมของหน้า PM)
  //   cash     = ช่องใหม่ในหน้า PM → เอกสารพอร์ต doc.foreignSleeve.cash (บาท ≥ 0 · 0 = กรอกแล้วว่าเป็นศูนย์)
  //   gross    = invested + cash
  //
  // โหมด (เหตุผลของ editor ตรวจตามลำดับนี้เสมอ):
  //   pm     = กรอก cash แล้ว และมี holdings โหลดอยู่ (array ไม่ว่าง) และไตรมาสปัจจุบันของเอกสาร = ไตรมาสล่าสุด
  //            และยังไม่จบตามปฏิทิน
  //   editor = อย่างอื่นทั้งหมด → พฤติกรรมเดิมทุกอย่าง
  //            no-cash → no-holdings (ห้ามแสดงหุ้นต่างประเทศ = cash ล้วนตอน holdings ยังไม่มา)
  //            → past-quarter (Editor เลือกดูไตรมาสเก่า: ห้ามเอาค่าวันนี้ไปทับประวัติ — Addendum ข้อ 4)
  //            → quarter-ended (ไตรมาสปัจจุบันของเอกสารเก่ากว่าไตรมาสตามปฏิทินของวันนี้ เช่น ยังเป็น 2026-Q3 ในเดือน พ.ย.
  //              = ไตรมาสที่ปิดแล้ว ห้ามรับค่าวันนี้ — Addendum ข้อ 5 · "วันนี้" = opts.now ไม่ส่ง = Date.now())
  //
  // applyToDoc / applyToSnapshot สร้าง "สำเนา" ที่แถว foreign-stock ของไตรมาสปัจจุบันถูกแทนด้วยแถวเดียว
  // ให้ผู้อ่านทุกหน้าใช้ (รวมผลตอบแทน/เป้าเกษียณ — Addendum ข้อ 2) — ห้ามแก้ต้นฉบับ และห้ามนำสำเนานี้ไป PUT กลับ server
  // แถวที่แทน = สำเนาแถวหุ้นต่างประเทศแรกของไตรมาสนั้น (คงชื่อ/id/ทุกฟิลด์) เพราะตัวคิดผลตอบแทน
  // (asset-allocation-engine.js assetKey = type::name) จับคู่รายการข้ามไตรมาสด้วยชื่อ — ชื่อใหม่ = "ขายของเก่า ซื้อของใหม่"
  // แล้วประมาณเงินเติมผิด · netFlow = ผลรวมเงินเติม/ถอนของแถวหุ้นต่างประเทศเดิมทุกแถว (Addendum ข้อ 3)
  // ไตรมาสก่อนหน้าคงเดิม → QoQ = ปัจจุบัน (PM) เทียบไตรมาสก่อน (Editor)
  //
  // ไม่มี DOM / fetch / storage · window.ForeignSleeve ใน browser + module.exports ให้เทสต์ Node
  // ============================================================

  var VERSION = "fs-4";
  var FOREIGN = "foreign-stock";
  // ชื่อแถวเมื่อไตรมาสนี้ไม่มีแถวหุ้นต่างประเทศใน Editor เลย และไตรมาสก่อนก็ไม่มีชื่อให้ต่อ (ดู newRowNameOf)
  // = ป้ายประเภทของ asset-allocation-engine.js (TYPE_LABELS) → ต่อกับแถวที่ไม่มีชื่อได้
  var DEFAULT_NAME = "หุ้นต่างประเทศ";

  // ตัวเลขแบบ fin ของหน้า PM: null / "" → null · สตริงตัวเลขแปลงได้ · NaN/Infinity → null
  function fin(v) {
    if (v == null || v === "") return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }
  // เงินเติม/ถอนของแถว Editor — กติกา fin ของ asset-allocation-engine.js (ผู้อ่านค่านี้):
  // number จำกัด หรือสตริงตัวเลขที่ไม่ว่าง · null / "" / NaN / Infinity / boolean / อื่น ๆ = ไม่ได้กรอก (null)
  function flowOf(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v === "string") {
      var s = v.replace(/^\s+|\s+$/g, "");
      if (s === "") return null;
      var n = Number(s);
      return isFinite(n) ? n : null;
    }
    return null;
  }
  function isObj(v) { return !!v && typeof v === "object"; }
  function copyOf(o) {
    var out = {};
    for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) out[k] = o[k];
    return out;
  }

  // ---------------- bucket ของ holding — กติกาเดิมของ portfolio-manager-page.js buildInputs ย้ายมาเป๊ะ ----------------
  // portfolioBucket ที่ตั้งเองชนะ · .BK = หุ้นไทย · มี "BTC" = bitcoin · RMF/SSF หรือกองทุนไทย = thai-fund · ที่เหลือ = หุ้นต่างประเทศ
  // (GOOG/GOOGL รวมเป็นแถวเดียวแค่ตอนแสดงในหน้า PM — ที่นี่นับมูลค่าทั้งสอง class)
  function canonicalOf(h) {
    return String(h.canonicalSymbol || h.ticker || "").trim().toUpperCase();
  }
  function bucketOf(h) {
    if (!isObj(h)) return "";
    if (h.portfolioBucket) return String(h.portfolioBucket);
    var raw = canonicalOf(h);
    // กองทุนไทย (RMF/SSF/กองทุนรวม) ที่ยังไม่ตั้ง bucket ต้องไม่หลุดเข้า foreign-stock (audit 2026-08 — เคส K-GTECHRMF)
    var isThaiFund = /RMF|SSF/i.test(raw) || /THAI_MUTUAL_FUND|MUTUAL/i.test(String(h.assetType || ""));
    if (raw.slice(-3) === ".BK") return "thai-stock";
    if (raw.indexOf("BTC") >= 0) return "bitcoin";
    if (isThaiFund) return "thai-fund";
    return FOREIGN;
  }

  // Σ มูลค่าหุ้นต่างประเทศที่ถือ (นับเฉพาะตัวเลขจำกัด ≥ 0)
  function investedOf(holdings) {
    if (!Array.isArray(holdings)) return 0;
    var sum = 0;
    for (var i = 0; i < holdings.length; i++) {
      var h = holdings[i];
      if (!isObj(h) || !h.isHolding || bucketOf(h) !== FOREIGN) continue;
      var mv = fin(h.marketValue);
      if (mv != null && mv >= 0) sum += mv;
    }
    return sum;
  }

  // ---------------- เอกสารพอร์ต ----------------
  // รับได้ทั้งคำตอบของ /api/portfolio ({ data: doc }) และ doc ตรง · { data: null } = เอกสารว่าง
  function isWrapper(ps) {
    return isObj(ps) && Object.prototype.hasOwnProperty.call(ps, "data");
  }
  function docOf(ps) {
    if (!isObj(ps)) return null;
    if (isWrapper(ps)) return isObj(ps.data) ? ps.data : null;
    return ps;
  }

  // เงินสดรอซื้อหุ้นต่างประเทศ: ต้องเป็น number จำกัด ≥ 0 เท่านั้น (สตริง / ติดลบ / ไม่มีคีย์ = ยังไม่กรอก → null)
  function cashOf(ps) {
    var doc = docOf(ps);
    var fsl = doc && isObj(doc.foreignSleeve) ? doc.foreignSleeve : null;
    var v = fsl ? fsl.cash : null;
    return (typeof v === "number" && isFinite(v) && v >= 0) ? v : null;
  }

  function updatedAtOf(ps) {
    var doc = docOf(ps);
    var fsl = doc && isObj(doc.foreignSleeve) ? doc.foreignSleeve : null;
    return fsl && typeof fsl.updatedAt === "string" && fsl.updatedAt ? fsl.updatedAt : null;
  }

  // ---------------- ไตรมาส ----------------
  // คีย์ "YYYY-Qn" เรียงตามเวลาเมื่อ sort แบบสตริง · ไม่มีไตรมาส / quarters ไม่ใช่ object → []
  function sortedKeys(doc) {
    return (doc && isObj(doc.quarters)) ? Object.keys(doc.quarters).sort() : [];
  }
  // คีย์ไตรมาสล่าสุดของเอกสาร (ไม่สนใจ currentQuarter) · ไม่มี → null
  function latestKeyOf(ps) {
    var keys = sortedKeys(docOf(ps));
    return keys.length ? keys[keys.length - 1] : null;
  }
  // คีย์ไตรมาสปัจจุบัน — กติกาเดียวกับ PortfolioPosition.deriveQuarterly / PMEngine.quarterlyBuckets
  // (currentQuarter ถ้ามีอยู่ใน quarters · ไม่งั้นคีย์ล่าสุด)
  function currentKeyOf(doc) {
    var keys = sortedKeys(doc);
    if (!keys.length) return null;
    return (doc.currentQuarter && doc.quarters[doc.currentQuarter]) ? doc.currentQuarter : keys[keys.length - 1];
  }
  // Editor เลือกดูไตรมาสที่เก่ากว่าคีย์ล่าสุด → ห้ามใช้ค่า PM (ค่าวันนี้ไม่ใช่ของไตรมาสนั้น)
  function isPastQuarter(doc) {
    var keys = sortedKeys(doc);
    return keys.length > 0 && currentKeyOf(doc) !== keys[keys.length - 1];
  }
  // ชื่อแถวหุ้นต่างประเทศ "ใหม่" ของไตรมาสปัจจุบัน (ไตรมาสนี้ยังไม่มีแถวหุ้นต่างประเทศ เช่นเพิ่งเพิ่มไตรมาสใหม่)
  //   = ชื่อแถวหุ้นต่างประเทศแรกของไตรมาสก่อนหน้า — ตัวคิดผลตอบแทนจับคู่ข้ามไตรมาสด้วย type+name (Addendum ข้อ 3)
  //   ไม่มีไตรมาสก่อน / ไม่มีแถวหุ้นต่างประเทศ / ชื่อว่าง → DEFAULT_NAME
  //   ที่เดียวที่ตัดสินชื่อนี้: applyToDoc (ผู้อ่านทุกหน้า + หน้า PM ตอนเขียน) และ Quarterly Editor (app.js) เรียกตัวนี้
  function newRowNameOf(ps) {
    var doc = docOf(ps);
    var keys = sortedKeys(doc);
    var i = keys.indexOf(currentKeyOf(doc));
    var prev = i > 0 ? doc.quarters[keys[i - 1]] : null;
    var list = isObj(prev) && Array.isArray(prev.assets) ? prev.assets : [];
    for (var j = 0; j < list.length; j++) {
      var a = list[j];
      if (isObj(a) && a.type === FOREIGN) return (typeof a.name === "string" && a.name) ? a.name : DEFAULT_NAME;
    }
    return DEFAULT_NAME;
  }

  // ---------------- ปฏิทิน (Addendum ข้อ 5) ----------------
  // "วันนี้": opts.now = ms (number) หรือ Date (ข้าม realm ได้ — ดูที่ getTime) · ไม่ส่ง / ไม่ใช่ตัวเลขจำกัด → Date.now()
  function nowMsOf(opts) {
    var n = isObj(opts) ? opts.now : null;
    if (isObj(n) && typeof n.getTime === "function") n = n.getTime();
    return (typeof n === "number" && isFinite(n)) ? n : Date.now();
  }
  // คีย์ไตรมาสตามปฏิทิน "YYYY-Qn" ด้วยเวลาท้องถิ่น — แบบเดียวกับ currentQuarterKey ของ Quarterly Editor (app.js)
  function calendarKeyOf(ms) {
    var d = new Date(ms);
    return d.getFullYear() + "-Q" + (Math.floor(d.getMonth() / 3) + 1);
  }
  // เทียบคีย์แบบ compareQuarter ของ Quarterly Editor: ปีก่อน แล้วไตรมาส (ตัวเลข) · คีย์ผิดรูป = NaN
  function compareQuarterKeys(a, b) {
    var pa = String(a).split("-Q"), pb = String(b).split("-Q");
    var ay = Number(pa[0]), aq = Number(pa[1]), by = Number(pb[0]), bq = Number(pb[1]);
    return ay === by ? aq - bq : ay - by;
  }
  // ไตรมาสปัจจุบันของเอกสารจบแล้วตามปฏิทิน (เก่ากว่าไตรมาสของวันนี้) · ไม่มีไตรมาส / คีย์ผิดรูป → ไม่นับว่าจบ
  function isQuarterEnded(doc, opts) {
    var key = currentKeyOf(doc);
    if (key == null) return false;
    return compareQuarterKeys(key, calendarKeyOf(nowMsOf(opts))) < 0;
  }

  // ---------------- sleeve + โหมด ----------------
  // opts.now (ไม่บังคับ): เวลาที่ใช้ตัดสิน quarter-ended — หน้าเว็บไม่ส่ง (= Date.now()) · เทสต์ส่งเพื่อให้ผลคงที่ทุกวัน
  function sleeveOf(ps, holdings, opts) {
    var cash = cashOf(ps);
    var updatedAt = updatedAtOf(ps);
    var doc = docOf(ps);
    // ลำดับเหตุผลคงที่ (เทสต์ปักไว้): no-cash → no-holdings → past-quarter → quarter-ended
    var reason = cash == null ? "no-cash"
      : (!(Array.isArray(holdings) && holdings.length > 0) ? "no-holdings"
        : (isPastQuarter(doc) ? "past-quarter"
          : (isQuarterEnded(doc, opts) ? "quarter-ended" : null)));
    if (reason) {
      return { source: "editor", reason: reason, invested: null, cash: null, gross: null, investedPct: null, updatedAt: updatedAt };
    }
    var invested = investedOf(holdings);
    var gross = invested + cash;
    return {
      source: "pm", reason: null,
      invested: invested, cash: cash, gross: gross,
      investedPct: gross > 0 ? invested / gross * 100 : 0,
      updatedAt: updatedAt
    };
  }

  // ---------------- แทนแถวหุ้นต่างประเทศ ----------------
  // แกนกลาง: คืน array ใหม่ (ไม่แก้ input) ที่แถว foreign-stock ทุกแถวถูกแทนด้วยแถวเดียว วางที่ตำแหน่งแถวแรก
  // (ไม่มีแถวเลย → ต่อท้าย ชื่อ opts.defaultName (สตริงไม่ว่าง) ไม่งั้น DEFAULT_NAME — applyToDoc ส่ง newRowNameOf มาให้)
  // · แถวอื่นคง reference เดิม ลำดับเดิม
  //   แถวที่แทน = สำเนาแถวหุ้นต่างประเทศแรก (ทุกฟิลด์ เช่น name / id) แล้วทับ
  //   manualValue = snapshotValue = gross · investedPercent · netFlow = Σ เงินเติม/ถอนของแถวเดิมทุกแถว
  //   (ไม่มีแถวไหนกรอกเลย = ไม่มีคีย์ netFlow) · fromPM: true เว้นแต่ opts.mark === false (ลบคีย์ทิ้งด้วย —
  //   Quarterly Editor / หน้า PM ใช้แบบนี้กับเอกสารที่จะถูกบันทึก แถวที่มี fromPM ห้ามไปถึง PUT)
  // sleeve ไม่ใช่โหมด pm / ตัวเลขไม่จำกัด → คืน assets ตัวเดิม (reference เดียวกัน)
  function applyToAssets(assets, sleeve, opts) {
    var s = sleeve;
    if (!isObj(s) || s.source !== "pm" || typeof s.gross !== "number" || !isFinite(s.gross) ||
      typeof s.invested !== "number" || !isFinite(s.invested)) return assets;
    var mark = !(isObj(opts) && opts.mark === false);
    var newName = (isObj(opts) && typeof opts.defaultName === "string" && opts.defaultName) ? opts.defaultName : DEFAULT_NAME;
    var list = Array.isArray(assets) ? assets : [];

    var first = null, flow = 0, hasFlow = false, i, a;
    for (i = 0; i < list.length; i++) {
      a = list[i];
      if (!isObj(a) || a.type !== FOREIGN) continue;
      if (!first) first = a;
      var f = flowOf(a.netFlow);
      if (f != null) { flow += f; hasFlow = true; }
    }
    var row = first ? copyOf(first) : { type: FOREIGN, name: newName };
    row.manualValue = s.gross;
    row.snapshotValue = s.gross;
    row.investedPercent = s.gross > 0 ? s.invested / s.gross * 100 : 0;
    if (hasFlow) row.netFlow = flow; else delete row.netFlow;
    if (mark) row.fromPM = true; else delete row.fromPM;

    var out = [], placed = false;
    for (i = 0; i < list.length; i++) {
      a = list[i];
      if (isObj(a) && a.type === FOREIGN) {
        if (!placed) { out.push(row); placed = true; }
        continue;
      }
      out.push(a);
    }
    if (!placed) out.push(row);
    return out;
  }

  // โหมด editor (รวม past-quarter / quarter-ended) → คืนตัวเดิม (reference เดียวกัน) · โหมด pm → สำเนารูปเดียวกับ input
  // ที่ไตรมาสปัจจุบัน (= ไตรมาสล่าสุด) ผ่าน applyToAssets · opts ส่งต่อให้ sleeveOf
  //   opts.mark === false → แถวที่แทนไม่มี fromPM (หน้า PM ใช้เขียนแถวลงเอกสารที่จะ PUT) · ไม่ส่ง = ใส่ fromPM (ผู้อ่าน)
  //   ไตรมาสนี้ยังไม่มีแถวหุ้นต่างประเทศ → แถวใหม่ชื่อตาม newRowNameOf (ชื่อเดียวกับที่ Quarterly Editor ตั้ง)
  function applyToDoc(ps, holdings, opts) {
    var s = sleeveOf(ps, holdings, opts);
    if (s.source !== "pm") return ps;
    var doc = docOf(ps);
    if (!doc || !isObj(doc.quarters)) return ps; // ไม่มีไตรมาสให้แทน → ไม่สร้างขึ้นเอง
    var key = currentKeyOf(doc);
    if (key == null) return ps;

    var q = doc.quarters[key];
    var nq = isObj(q) ? copyOf(q) : {};
    nq.assets = applyToAssets((isObj(q) && Array.isArray(q.assets)) ? q.assets : [], s,
      { mark: !(isObj(opts) && opts.mark === false), defaultName: newRowNameOf(doc) });
    var nquarters = copyOf(doc.quarters);
    nquarters[key] = nq;
    var ndoc = copyOf(doc);
    ndoc.quarters = nquarters;
    if (isWrapper(ps)) {
      var out = copyOf(ps);
      out.data = ndoc;
      return out;
    }
    return ndoc;
  }

  // snapshot ของ PortfolioDataSnapshot: holdings ไม่ส่ง (undefined) = snapshot.portfolioHoldings.data
  // โหมด editor → คืนตัวเดิม · pm → shallow copy ที่ portfolioStatus แปลงแล้ว · opts ส่งต่อให้ sleeveOf
  function applyToSnapshot(snapshot, holdings, opts) {
    if (!isObj(snapshot)) return snapshot;
    var list = typeof holdings === "undefined"
      ? (isObj(snapshot.portfolioHoldings) ? snapshot.portfolioHoldings.data : null)
      : holdings;
    var ps = snapshot.portfolioStatus;
    var nps = applyToDoc(ps, list, opts);
    if (nps === ps) return snapshot;
    var out = copyOf(snapshot);
    out.portfolioStatus = nps;
    return out;
  }

  var ForeignSleeve = {
    VERSION: VERSION,
    bucketOf: bucketOf,
    investedOf: investedOf,
    docOf: docOf,
    cashOf: cashOf,
    sleeveOf: sleeveOf,
    latestKeyOf: latestKeyOf,
    newRowNameOf: newRowNameOf,
    applyToAssets: applyToAssets,
    applyToDoc: applyToDoc,
    applyToSnapshot: applyToSnapshot
  };

  if (typeof window !== "undefined") window.ForeignSleeve = ForeignSleeve;
  if (typeof module !== "undefined" && module.exports) module.exports = ForeignSleeve;
})();
