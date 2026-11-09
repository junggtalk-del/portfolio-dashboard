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
  // โหมด:
  //   pm     = กรอก cash แล้ว และมี holdings โหลดอยู่ (array ไม่ว่าง)
  //   editor = อย่างอื่นทั้งหมด → พฤติกรรมเดิมทุกอย่าง (ห้ามแสดงหุ้นต่างประเทศ = cash ล้วนตอน holdings ยังไม่มา)
  //
  // applyToDoc / applyToSnapshot สร้าง "สำเนา" ที่แถว foreign-stock ของไตรมาสปัจจุบันถูกแทนด้วยแถวสังเคราะห์
  // ให้ผู้อ่านตัวเลขปัจจุบันทุกหน้าใช้ — ห้ามแก้ต้นฉบับ และห้ามนำสำเนานี้ไป PUT กลับ server
  // ไตรมาสก่อนหน้าคงเดิม → QoQ = ปัจจุบัน (PM) เทียบไตรมาสก่อน (Editor)
  //
  // ไม่มี DOM / fetch / storage · window.ForeignSleeve ใน browser + module.exports ให้เทสต์ Node
  // ============================================================

  var VERSION = "fs-1";
  var FOREIGN = "foreign-stock";
  var SYNTH_NAME = "หุ้นต่างประเทศ · AI Portfolio Manager";

  // ตัวเลขแบบ fin ของหน้า PM: null / "" → null · สตริงตัวเลขแปลงได้ · NaN/Infinity → null
  function fin(v) {
    if (v == null || v === "") return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
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

  // ---------------- sleeve + โหมด ----------------
  function sleeveOf(ps, holdings) {
    var cash = cashOf(ps);
    var updatedAt = updatedAtOf(ps);
    var reason = cash == null ? "no-cash" : ((Array.isArray(holdings) && holdings.length > 0) ? null : "no-holdings");
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

  // คีย์ไตรมาสปัจจุบัน — กติกาเดียวกับ PortfolioPosition.deriveQuarterly / PMEngine.quarterlyBuckets
  function currentKeyOf(doc) {
    var keys = Object.keys(doc.quarters).sort(); // "YYYY-Qn" เรียงตามเวลา
    if (!keys.length) return null;
    return (doc.currentQuarter && doc.quarters[doc.currentQuarter]) ? doc.currentQuarter : keys[keys.length - 1];
  }

  // โหมด editor → คืนตัวเดิม (reference เดียวกัน) · โหมด pm → สำเนารูปเดียวกับ input
  // ที่ไตรมาสปัจจุบันมีแถวสังเคราะห์แทนแถว foreign-stock ทุกแถว (วางที่ตำแหน่งแถวแรก · ไม่มีเลยต่อท้าย)
  function applyToDoc(ps, holdings) {
    var s = sleeveOf(ps, holdings);
    if (s.source !== "pm") return ps;
    var doc = docOf(ps);
    if (!doc || !isObj(doc.quarters)) return ps; // ไม่มีไตรมาสให้แทน → ไม่สร้างขึ้นเอง
    var key = currentKeyOf(doc);
    if (key == null) return ps;

    var synth = {
      type: FOREIGN,
      name: SYNTH_NAME,
      manualValue: s.gross,
      snapshotValue: s.gross,
      investedPercent: s.gross > 0 ? s.invested / s.gross * 100 : 0,
      fromPM: true
    };
    var q = doc.quarters[key];
    var oldAssets = (isObj(q) && Array.isArray(q.assets)) ? q.assets : [];
    var assets = [], placed = false;
    for (var i = 0; i < oldAssets.length; i++) {
      var a = oldAssets[i];
      if (isObj(a) && a.type === FOREIGN) {
        if (!placed) { assets.push(synth); placed = true; }
        continue;
      }
      assets.push(a);
    }
    if (!placed) assets.push(synth);

    var nq = isObj(q) ? copyOf(q) : {};
    nq.assets = assets;
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

  // snapshot ของ PortfolioDataSnapshot: holdings ไม่ส่ง = snapshot.portfolioHoldings.data
  // โหมด editor → คืนตัวเดิม · pm → shallow copy ที่ portfolioStatus แปลงแล้ว
  function applyToSnapshot(snapshot, holdings) {
    if (!isObj(snapshot)) return snapshot;
    var list = typeof holdings === "undefined"
      ? (isObj(snapshot.portfolioHoldings) ? snapshot.portfolioHoldings.data : null)
      : holdings;
    var ps = snapshot.portfolioStatus;
    var nps = applyToDoc(ps, list);
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
    applyToDoc: applyToDoc,
    applyToSnapshot: applyToSnapshot
  };

  if (typeof window !== "undefined") window.ForeignSleeve = ForeignSleeve;
  if (typeof module !== "undefined" && module.exports) module.exports = ForeignSleeve;
})();
